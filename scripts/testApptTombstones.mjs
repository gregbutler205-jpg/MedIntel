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

console.log(`\n${pass} passed, ${fail} failed (appt-tombstones)`);
process.exit(fail ? 1 : 0);
