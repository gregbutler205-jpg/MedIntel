// ── DEC-046: prep-mark tests ─────────────────────────────────────────────────
// The mark → match → prompt → clear-on-complete pipeline, plus the Drive-merge
// edit-propagation rule the marks depend on. The suggestion/matching/prompt
// halves run against the real lib; the merge half runs a REAL vault through
// the REAL mergeIntoLocal, same harness as the tombstone suite.
// Run: npm run test:prep-marks

import assert from "node:assert/strict";

class Storage {
  constructor() { this._m = new Map(); }
  getItem(k) { return this._m.has(k) ? this._m.get(k) : null; }
  setItem(k, v) { this._m.set(k, String(v)); }
  removeItem(k) { this._m.delete(k); }
  clear() { this._m.clear(); }
  key(i) { return [...this._m.keys()][i] ?? null; }
  get length() { return this._m.size; }
}
globalThis.Storage = Storage;
globalThis.localStorage = new Storage();
globalThis.sessionStorage = new Storage();
globalThis.window = globalThis;
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.dispatchEvent = () => {};

const {
  suggestPrepTargets, targetFor, lastNameOf, getPrepTargets, setPrepTargets,
  targetMatchesAppointment, markedReportsForAppointment, buildMarkedReportsSection,
  clearPrepMarksForAppointment, MAX_PREP_REPORTS,
} = await import("../src/lib/prepMarks.js");
const secureStorage = await import("../src/lib/secureStorage.js");
const { mergeIntoLocal } = await import("../src/lib/driveSync.js");

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("PASS — " + m); } else { fail++; console.log("FAIL — " + m); } };

const CARE_TEAM = [
  { id: 1, name: "Dr. Sarah Chen, MD",    role: "Hepatology / Transplant Medicine", specialty: "Transplant Hepatology" },
  { id: 2, name: "Dr. James Park, MD",    role: "Nephrology",                        specialty: "Transplant Nephrology" },
  { id: 3, name: "Dr. Michael Torres, MD", role: "Primary Care Physician (PCP)",     specialty: "Internal Medicine / Primary Care" },
  { id: 4, name: "Dr. Kevin Marsh, MD",   role: "Orthopedic Surgery",                specialty: "Orthopedics" },
];

const mkNote = (id, title, body, date, prepTargets) => {
  const n = { id: String(id), title, date, aiGenerated: true, sections: [{ id: "s1", type: "text", header: "AI Analysis", body }] };
  if (prepTargets) n.prepTargets = prepTargets;
  return n;
};

// ── lastNameOf ───────────────────────────────────────────────────────────────
ok(lastNameOf("Dr. Sarah Chen, MD") === "chen", "lastNameOf strips title + credential (Dr. Sarah Chen, MD → chen)");
ok(lastNameOf("Michael Torres") === "torres", "lastNameOf works without a title");
ok(lastNameOf("") === "", "lastNameOf on empty is empty, never throws");

// ── suggestion: names ────────────────────────────────────────────────────────
{
  const s = suggestPrepTargets("Discuss the tacrolimus trend with Dr. Chen, and mention the eGFR drop to Dr. Park.", CARE_TEAM);
  const names = s.map(t => t.name);
  ok(names.includes("Dr. Sarah Chen, MD") && names.includes("Dr. James Park, MD"), `name mentions suggest the right members (got ${names.join("; ")})`);
  ok(!names.includes("Dr. Kevin Marsh, MD"), "an unmentioned member is NOT suggested");
}
// ── suggestion: specialties, including the -ology→-ologist stem ──────────────
{
  const s = suggestPrepTargets("Your hepatologist should review the ALP trend. Also raise the creatinine with nephrology.", CARE_TEAM);
  const names = s.map(t => t.name);
  ok(names.includes("Dr. Sarah Chen, MD"), "\"hepatologist\" suggests the hepatology member (y-stem match)");
  ok(names.includes("Dr. James Park, MD"), "\"nephrology\" suggests the nephrology member");
}
ok(suggestPrepTargets("Ask your primary care physician about the statin.", CARE_TEAM).some(t => t.id === undefined ? t.careTeamId === 3 : false) ||
   suggestPrepTargets("Ask your primary care physician about the statin.", CARE_TEAM).some(t => t.careTeamId === 3),
   "\"primary care\" phrase suggests the PCP");
{
  const s = suggestPrepTargets("Post-transplant medicine management continues.", CARE_TEAM);
  ok(!s.some(t => t.careTeamId === 4), "generic words (transplant, medicine) never suggest an unrelated member");
}
ok(suggestPrepTargets("", CARE_TEAM).length === 0, "empty text suggests nothing");
ok(suggestPrepTargets("anything", []).length === 0, "empty care team suggests nothing");

// ── set / get round-trip + updatedAt stamp ───────────────────────────────────
{
  localStorage.clear();
  localStorage.setItem("mi_notes", JSON.stringify([mkNote("n1", "AI Analysis", "body", "2026-08-11")]));
  const t = [targetFor(CARE_TEAM[0])];
  const saved = setPrepTargets("n1", t);
  ok(saved.prepTargets.length === 1 && typeof saved.updatedAt === "number",
     "setPrepTargets stores targets AND stamps numeric updatedAt (the merge opt-in)");
  const back = JSON.parse(localStorage.getItem("mi_notes"))[0];
  ok(getPrepTargets(back).length === 1 && back.prepTargets[0].name === "Dr. Sarah Chen, MD", "targets survive the storage round-trip");
  const cleared = setPrepTargets("n1", []);
  ok(!("prepTargets" in cleared), "setting [] removes the field entirely (no empty-array residue)");
  ok(setPrepTargets("missing", [targetFor(CARE_TEAM[0])]) === null, "unknown note id → null, storage untouched");
}

// ── appointment matching ─────────────────────────────────────────────────────
{
  const target = targetFor(CARE_TEAM[0]); // Dr. Sarah Chen
  ok(targetMatchesAppointment(target, { provider: "Dr. Sarah Chen, MD", specialty: "" }, CARE_TEAM),
     "provider resolved via the shared care-team matcher → match");
  ok(targetMatchesAppointment(target, { provider: "Sarah Chen", specialty: "" }, CARE_TEAM),
     "provider without title still matches (scored matcher, not string equality)");
  ok(targetMatchesAppointment(target, { provider: "", specialty: "Transplant Hepatology" }, CARE_TEAM),
     "no provider → specialty fallback matches");
  ok(!targetMatchesAppointment(target, { provider: "Dr. James Park, MD", specialty: "Nephrology" }, CARE_TEAM),
     "a different doctor's appointment does NOT match");
  ok(!targetMatchesAppointment(target, { provider: "", specialty: "" }, CARE_TEAM),
     "no provider and no specialty → no match (never a wildcard)");
}

// ── marked reports for an appointment: filter, order, cap ────────────────────
{
  const chen = [targetFor(CARE_TEAM[0])], park = [targetFor(CARE_TEAM[1])];
  const notes = [
    mkNote("a", "Symptom review",  "x", "2026-08-01", chen),
    mkNote("b", "Lab review",      "x", "2026-08-05", chen),
    mkNote("c", "Session report",  "x", "2026-08-09", chen),
    mkNote("d", "Older analysis",  "x", "2026-07-01", chen),
    mkNote("e", "Kidney analysis", "x", "2026-08-08", park),
    mkNote("f", "Unmarked",        "x", "2026-08-10"),
  ];
  const appt = { provider: "Dr. Sarah Chen, MD", specialty: "Hepatology" };
  const { reports, droppedCount } = markedReportsForAppointment(appt, { notes, careTeam: CARE_TEAM });
  ok(reports.length === MAX_PREP_REPORTS, `capped at ${MAX_PREP_REPORTS} reports`);
  ok(reports[0].id === "c" && reports[1].id === "b" && reports[2].id === "a", `newest first (got ${reports.map(r => r.id).join(",")})`);
  ok(droppedCount === 1, "the older-than-cap mark is COUNTED as dropped, not silently gone");
  ok(!reports.some(r => r.id === "e"), "another doctor's marked report is excluded");
  ok(!reports.some(r => r.id === "f"), "unmarked notes are excluded");
}

// ── the prompt section ───────────────────────────────────────────────────────
{
  ok(buildMarkedReportsSection([]) === "", "no marked reports → EMPTY string — prep prompt byte-identical to pre-DEC-046");
  const long = "Bottom line: tacrolimus trending down. ".repeat(200);
  const section = buildMarkedReportsSection([mkNote("n9", "AI Analysis — Symptom review", long, "2026-08-11")]);
  ok(section.includes("[DOCUMENT id=n9") && section.includes("[END DOCUMENT]"), "reports ride in S-07 document blocks, delimited");
  ok(section.includes("[TRUNCATED]"), "over-length report is visibly truncated, never silently cut");
  ok(section.includes("MARKED FOR THIS VISIT"), "section is labeled as patient-marked");
  ok(/Carry .*forward/i.test(section), "instruction says to carry findings forward, not re-derive");
}

// ── clear on visit completion ────────────────────────────────────────────────
{
  localStorage.clear();
  localStorage.setItem("mi_care_team", JSON.stringify(CARE_TEAM));
  const both = [targetFor(CARE_TEAM[0]), targetFor(CARE_TEAM[1])];
  localStorage.setItem("mi_notes", JSON.stringify([
    mkNote("m1", "For Chen+Park", "x", "2026-08-10", both),
    mkNote("m2", "For Chen only", "x", "2026-08-10", [targetFor(CARE_TEAM[0])]),
    mkNote("m3", "Unmarked",      "x", "2026-08-10"),
  ]));
  const changed = clearPrepMarksForAppointment({ provider: "Dr. Sarah Chen, MD", specialty: "" });
  ok(changed === 2, `completing Chen's visit changes exactly the notes marked for her (got ${changed})`);
  const after = JSON.parse(localStorage.getItem("mi_notes"));
  const m1 = after.find(n => n.id === "m1"), m2 = after.find(n => n.id === "m2");
  ok(m1.prepTargets.length === 1 && m1.prepTargets[0].name === "Dr. James Park, MD",
     "a note marked for two doctors keeps the OTHER doctor's mark");
  ok(!("prepTargets" in m2) && typeof m2.updatedAt === "number",
     "a note marked only for her is fully unmarked, with updatedAt stamped for sync");
  ok(clearPrepMarksForAppointment({ provider: "Dr. Sarah Chen, MD", specialty: "" }) === 0,
     "clearing again is a no-op (idempotent)");
}

// ── Drive merge: the edit-propagation rule marks depend on ───────────────────
{
  localStorage.clear();
  secureStorage.installInterception();
  await secureStorage.setupVaultAndMigrate("test passphrase for prep marks 46");

  const base = mkNote("p1", "AI Analysis", "x", "2026-08-10");

  // Other device marked the note (newer updatedAt) and uploaded to Drive.
  const marked = { ...base, prepTargets: [targetFor(CARE_TEAM[0])], updatedAt: 2000 };
  localStorage.setItem("mi_notes", JSON.stringify([marked]));
  await secureStorage.flushPendingWrites();
  const driveMarked = JSON.parse(secureStorage.getRawCiphertext("mi_notes"));

  // This device still has the unmarked copy with an OLDER stamp.
  localStorage.setItem("mi_notes", JSON.stringify([{ ...base, updatedAt: 1000 }]));
  await secureStorage.flushPendingWrites();
  await mergeIntoLocal({ _exportedAt: "x", mi_notes: driveMarked });
  let now = JSON.parse(localStorage.getItem("mi_notes"));
  ok(now[0].prepTargets?.length === 1, "a mark made on the OTHER device survives the merge (newer edit wins)");

  // Reverse: local is the newer edit → local wins over a stale Drive copy.
  localStorage.setItem("mi_notes", JSON.stringify([{ ...base, updatedAt: 3000 }]));
  await secureStorage.flushPendingWrites();
  await mergeIntoLocal({ _exportedAt: "x", mi_notes: driveMarked });
  now = JSON.parse(localStorage.getItem("mi_notes"));
  ok(!now[0].prepTargets, "a NEWER local edit is not overwritten by a stale Drive copy");

  // No stamps on either side → pre-existing local-first behavior, unchanged.
  // Fabricate: write drive-side copy, capture ciphertext, restore local.
  const plainLocal = mkNote("p2", "Local title", "x", "2026-08-10");
  const plainDrive = mkNote("p2", "Drive title", "x", "2026-08-10");
  localStorage.setItem("mi_notes", JSON.stringify([plainDrive]));
  await secureStorage.flushPendingWrites();
  const drivePlain = JSON.parse(secureStorage.getRawCiphertext("mi_notes"));
  localStorage.setItem("mi_notes", JSON.stringify([plainLocal]));
  await secureStorage.flushPendingWrites();
  await mergeIntoLocal({ _exportedAt: "x", mi_notes: drivePlain });
  now = JSON.parse(localStorage.getItem("mi_notes"));
  ok(now[0].title === "Local title", "records WITHOUT stamps keep local-first-wins — no behavior change for anything else");
}

console.log(`\n${pass} passed, ${fail} failed (prep-marks)`);
assert.equal(fail, 0);
