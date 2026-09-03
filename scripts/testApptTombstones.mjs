// ── Appointment deletion tombstones (the "deleted three times" bug) ──────────
// Deleting a calendar-synced appointment must survive the next sync: the
// differ re-imported any deleted event because nothing remembered the
// deletion. These pin the tombstone contract: block by Google event id, block
// by date+title when the id churns (recurring events), never touch other
// dates or manual re-creations, and heal already-resurrected synced copies.
// Run: npm run test:appt-tombstones

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

const { diffNewAppointments, tombstoneAppt, isTombstoned, filterTombstoned, readDismissedAppts } =
  await import("../src/lib/calendarSync.js");

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("PASS — " + m); } else { fail++; console.log("FAIL — " + m); } };

const EV_AUG3 = { id: "gcal-aug3", summary: "Labs", start: { date: "2026-08-03" } };
const EV_SEP7 = { id: "gcal-sep7", summary: "Labs", start: { date: "2026-09-07" } };

// ── The bug as shipped: without a tombstone, a deleted event re-imports ──────
{
  localStorage.clear();
  const fresh = diffNewAppointments([EV_AUG3], []);
  ok(fresh.length === 1 && fresh[0].gcalId === "gcal-aug3",
    "baseline: an unseen event imports (and would re-import forever after deletion)");
}

// ── Tombstone by Google event id ─────────────────────────────────────────────
{
  localStorage.clear();
  tombstoneAppt({ gcalId: "gcal-aug3", date: "2026-08-03", title: "Labs" });
  const fresh = diffNewAppointments([EV_AUG3], []);
  ok(fresh.length === 0, "a deleted event is never re-imported (matched by gcalId)");
  ok(readDismissedAppts().length === 1, "the tombstone is persisted");
}

// ── Tombstone by date+title when the event id churns ─────────────────────────
{
  localStorage.clear();
  tombstoneAppt({ gcalId: "gcal-aug3-OLD-ID", date: "2026-08-03", title: "Labs" });
  const reissued = { id: "gcal-aug3-NEW-ID", summary: "Labs", start: { date: "2026-08-03" } };
  const fresh = diffNewAppointments([reissued], []);
  ok(fresh.length === 0, "a re-issued event id on the same date+title is still blocked");
}

// ── Other instances and other titles are untouched ───────────────────────────
{
  localStorage.clear();
  tombstoneAppt({ gcalId: "gcal-aug3", date: "2026-08-03", title: "Labs" });
  const fresh = diffNewAppointments([EV_SEP7], []);
  ok(fresh.length === 1, "the NEXT instance of a recurring event (different date) still imports");
  const other = diffNewAppointments([{ id: "x1", summary: "Dermatology", start: { date: "2026-08-03" } }], []);
  ok(other.length === 1, "a different appointment on the tombstoned date still imports");
}

// ── Case/whitespace robustness on the title fallback ─────────────────────────
{
  localStorage.clear();
  tombstoneAppt({ gcalId: null, date: "2026-08-03", title: "  LABS " });
  ok(isTombstoned({ gcalId: "anything", date: "2026-08-03", title: "labs" }), "title match is case/whitespace-insensitive");
}

// ── filterTombstoned heals resurrected SYNCED copies, spares manual ones ─────
{
  localStorage.clear();
  tombstoneAppt({ gcalId: "gcal-aug3", date: "2026-08-03", title: "Labs" });
  const stored = [
    { id: "a1", gcalId: "gcal-aug3", date: "2026-08-03", title: "Labs", status: "suggested" }, // resurrected synced copy
    { id: "a2", gcalId: null, date: "2026-08-03", title: "Labs", status: "upcoming" },          // user re-created manually
    { id: "a3", gcalId: "gcal-sep7", date: "2026-09-07", title: "Labs", status: "suggested" },  // unrelated synced
  ];
  const healed = filterTombstoned(stored);
  ok(healed.length === 2 && !healed.some(a => a.id === "a1"), "a resurrected synced copy is dropped at load");
  ok(healed.some(a => a.id === "a2"), "a manually re-created appointment on the same date/title is NEVER dropped");
  ok(healed.some(a => a.id === "a3"), "unrelated synced records are untouched");
}

// ── Manual records: the Drive-merge resurrection (the Dr. Roy bug) ───────────
// A manual appointment (no gcalId) deleted locally still lives in the Drive
// file via the other device's uploads; _mergeArrays unions it right back.
// The id-based tombstone kills exactly that copy — and ONLY that copy.
{
  localStorage.clear();
  const droy = { id: "droy1", gcalId: null, date: "2026-08-03", title: "Dr. Roy", status: "upcoming" };
  tombstoneAppt(droy); // what handleDelete now does for EVERY deletion
  const resurrected = [
    { id: "droy1", gcalId: null, date: "2026-08-03", title: "Dr. Roy", status: "upcoming" }, // same id, back from the Drive union
    { id: "other1", gcalId: null, date: "2026-08-03", title: "Dentist", status: "upcoming" },
  ];
  const healed = filterTombstoned(resurrected);
  ok(healed.length === 1 && healed[0].id === "other1", "a merge-resurrected MANUAL record is dropped by its exact id");

  const recreated = filterTombstoned([{ id: "droy-NEW", gcalId: null, date: "2026-08-03", title: "Dr. Roy", status: "upcoming" }]);
  ok(recreated.length === 1, "manually RE-CREATING the same appointment (fresh id) always sticks — never eaten by the old tombstone");
}

// ── Tombstone entries are merge-safe: content-keyed ids, no duplicates ───────
// mi_appt_dismissed itself rides the Drive merge, whose union dedupes by `id`.
// Entries therefore need ids that are EQUAL for the same deletion (collapse
// across devices) and DISTINCT for different deletions on the same date.
{
  localStorage.clear();
  tombstoneAppt({ id: "m1", gcalId: null, date: "2026-08-03", title: "Dr. Roy" });
  tombstoneAppt({ id: "m2", gcalId: null, date: "2026-08-03", title: "Dentist" });
  tombstoneAppt({ id: "m1", gcalId: null, date: "2026-08-03", title: "Dr. Roy" }); // repeat delete of the same record
  const list = readDismissedAppts();
  ok(list.length === 2, `distinct same-date deletions keep distinct entries; repeats dedupe (got ${list.length})`);
  ok(new Set(list.map(t => t.id)).size === 2 && list.every(t => t.id), "every tombstone carries a unique content-keyed id for the merge union");
}

// ── Cap: the tombstone list cannot grow unbounded ────────────────────────────
{
  localStorage.clear();
  for (let i = 0; i < 350; i++) tombstoneAppt({ gcalId: `g${i}`, date: "2026-01-01", title: `t${i}` });
  const list = readDismissedAppts();
  ok(list.length === 300, `tombstone list capped at 300 (got ${list.length})`);
  ok(list[list.length - 1].gcalId === "g349" && list[0].gcalId === "g50", "cap keeps the newest entries");
}

// ── v1.56.0: Appointments batch (founder-directed) ───────────────────────────
// Greg: Completed and All lists read newest-first; the attach picker pages all
// records ten at a time (newest first) with a Load More button; a provider can
// be added to the care team without leaving the in-progress appointment.
// Structural pins on Tab14 — anchored on code, not comments.
{
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const { dirname, join } = await import("node:path");
  const here = dirname(fileURLToPath(import.meta.url));
  const tab14 = readFileSync(join(here, "../src/components/tabs/Tab14.jsx"), "utf8");

  // Item 4 — list direction: completed/all flip to reverse-chronological.
  ok(tab14.includes(`filter === "completed" || filter === "all"`),
    "Completed and All lists are the newest-first branches");
  const sortIdx = tab14.indexOf("? new Date(b.date) - new Date(a.date)");
  ok(sortIdx > 0 && tab14.indexOf(": new Date(a.date) - new Date(b.date)", sortIdx) > sortIdx,
    "newest-first sorts b-a; upcoming keeps a-b chronological");

  // Item 2 — attach picker pagination: ten at a time, newest first, Load More.
  ok(tab14.includes("useState(10)") && tab14.includes("others.slice(0, othersShown)"),
    "attach picker renders the first ten of the full list");
  ok(tab14.includes("setOthersShown(n => n + 10)") || tab14.includes("othersShown + 10"),
    "Load More advances the window by ten");
  ok(tab14.includes("Load 10 more"), "the Load More button exists");

  // Item 3 — quick-add provider without leaving the appointment.
  ok(tab14.includes("const saveQuickAdd = ") && tab14.includes('localStorage.getItem("mi_care_team")'),
    "quick-add reads the care team fresh at save time (never a stale base)");
  const qaSave = tab14.slice(tab14.indexOf("const saveQuickAdd = "), tab14.indexOf("const handleProviderBlur"));
  ok(qaSave.includes('localStorage.setItem("mi_care_team"') && qaSave.includes("[...fresh, member]"),
    "quick-add appends the new member to a fresh read of mi_care_team");
  ok(qaSave.includes("provider:  name") || qaSave.includes("provider: name"),
    "saving drops the new member straight into the appointment's provider field");
  ok(qaSave.includes("setQuickAdd(null)"),
    "saving closes the overlay and returns to the in-progress appointment");
  ok(qaSave.includes('mi_care_team_selected'),
    "an explicit emergency-card selection list gains the new name (mirrors Care Team)");
  ok(tab14.includes("+ Add to Care Team"), "the affordance sits beside the provider field");

  // v1.56.1 — a sync that lands suggestions pops a notice (Greg missed the
  // inline banner; synced events wait in Suggested, not Upcoming).
  const addedBranch = tab14.slice(tab14.indexOf("if (added > 0) {"), tab14.indexOf("} else if (!auto) {"));
  ok(addedBranch.includes("setSyncNotice({ count: added"),
    "every sync that adds suggestions (manual and auto) raises the notice");
  ok(tab14.includes("syncNotice.count") && tab14.includes("setSyncNotice(null)"),
    "the notice renders the count and dismisses");
  const noticeJsx = tab14.slice(tab14.indexOf("{syncNotice && ("));
  ok(noticeJsx.includes(">Suggested</b>") && noticeJsx.includes(">Confirm</b>"),
    "the notice says where synced events landed and what to do next");
}

// ── v1.58.2: Directions goes to the appointment's location, not a search list ─
// Greg (companion): "it just searches for the name and then gives a listing of
// the locations for me to choose. I want it to give directions to the actual
// location in the appointment."
{
  const { directionsUrl, appointmentDestination } = await import("../src/lib/mapsLink.js");
  const { readFileSync } = await import("node:fs");
  const team = [
    { id: 1, name: "Dr. Akhtar", specialty: "Hepatology", facility: "Ochsner Medical Center", address: "1514 Jefferson Hwy, Jefferson, LA 70121" },
    { id: 2, name: "Dr. Webb", specialty: "Family Medicine", facility: "Hattiesburg Clinic", address: "415 S 28th Ave, Hattiesburg, MS 39401" },
  ];
  const withAddress = { title: "Follow-up", provider: "Dr. Akhtar", facility: "Ochsner Medical Center", address: "1514 Jefferson Hwy, Jefferson, LA 70121" };
  const u = directionsUrl(withAddress, team);
  ok(u.startsWith("https://www.google.com/maps/dir/?api=1&destination="), "a directions link, never a search link");
  ok(!/maps\/search|maps\.google\.com\/\?q=/.test(u), "no search-list URL shapes remain");
  ok(decodeURIComponent(u).includes("Ochsner Medical Center, 1514 Jefferson Hwy"), "the appointment's own address is the destination, facility prefixed");
  ok(appointmentDestination({ facility: "Ochsner", address: "Ochsner, 1514 Jefferson Hwy" }) === "Ochsner, 1514 Jefferson Hwy",
    "a facility already inside the address is not doubled");
  ok(appointmentDestination({ provider: "Dr. Akhtar", facility: "Ochsner Medical Center" }, team) === "Ochsner Medical Center, 1514 Jefferson Hwy, Jefferson, LA 70121",
    "no address on the appointment: the matching care-team member's address routes it (by provider)");
  ok(appointmentDestination({ title: "Labs", facility: "Hattiesburg Clinic" }, team).includes("415 S 28th Ave"),
    "no provider match: the care-team member at that facility supplies the address");
  ok(appointmentDestination({ facility: "Some Imaging Center" }, team) === "Some Imaging Center",
    "nothing on file but a facility name: directions to the name (best effort)");
  ok(directionsUrl({ title: "Unknown" }, team) === null, "no destination at all: no link (companion hides the button)");
  const care = readFileSync(new URL("../src/components/companion/screens/Care.jsx", import.meta.url), "utf8");
  ok(care.includes("directionsUrl(a, careTeam())") && !care.includes("maps.google.com/?q="), "companion Care screen uses the directions builder");
  const tab14 = readFileSync(new URL("../src/components/tabs/Tab14.jsx", import.meta.url), "utf8");
  ok(tab14.includes("return directionsUrl(appt, team)") && !tab14.includes("maps/search/?api=1"), "web Appointments uses the same builder");
}

console.log(`\n${pass} passed, ${fail} failed (appt-tombstones)`);
process.exit(fail ? 1 : 0);
