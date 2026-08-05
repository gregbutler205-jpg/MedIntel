// ── Generic record-tombstone tests (all sections; Care Team/Allergies bug) ───
// The Drive merge unions every array store with no concept of deletion, so a
// deleted record still in the Drive file resurrects on every sync. These pin
// the generalized fix end-to-end: the integration block runs a REAL vault
// (PBKDF2 + AES-GCM under Node) through the REAL mergeIntoLocal and proves
// (1) the shipped bug — without a tombstone the deleted record comes back —
// and (2) the fix — with one it stays dead, including when the tombstone
// arrives FROM the other device in the same sync. Run: npm run test:record-tombstones

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

const tomb = await import("../src/lib/recordTombstones.js");
const secureStorage = await import("../src/lib/secureStorage.js");
const { mergeIntoLocal } = await import("../src/lib/driveSync.js");

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("PASS — " + m); } else { fail++; console.log("FAIL — " + m); } };

// ── Unit: identity, dedupe, isolation, untombstone, cap ──────────────────────
{
  localStorage.clear();
  const rec = { id: "ct1", name: "Dr. A" };
  tomb.tombstoneRecord("mi_care_team", rec);
  tomb.tombstoneRecord("mi_care_team", rec); // repeat delete
  tomb.tombstoneRecord("mi_allergies", { id: "ct1", name: "same id, different store" });
  const list = tomb.readRecordTombstones();
  ok(list.length === 2, `repeat deletes dedupe; same id in different stores stays distinct (got ${list.length})`);
  ok(tomb.filterTombstonedRecords("mi_care_team", [rec, { id: "ct2" }]).length === 1, "filter kills the deleted record by id");
  ok(tomb.filterTombstonedRecords("mi_conditions", [rec]).length === 1, "tombstones are store-scoped — other stores untouched");
  ok(tomb.tombstonedStores().sort().join(",") === "mi_allergies,mi_care_team", "tombstonedStores drives the merge post-pass");

  tomb.untombstoneRecord("mi_care_team", rec);
  ok(tomb.filterTombstonedRecords("mi_care_team", [rec]).length === 1, "untombstone restores a deliberate same-id re-add (mi_ref_docs case)");

  const noId = { name: "Legacy entry", phone: "555" };
  tomb.tombstoneRecord("mi_symptoms", noId);
  ok(tomb.filterTombstonedRecords("mi_symptoms", [{ ...noId }]).length === 0, "id-less records match by the merge's own JSON identity");
  ok(tomb.filterTombstonedRecords("mi_symptoms", [{ ...noId, phone: "556" }]).length === 1, "a changed id-less record is a different identity — kept");

  localStorage.clear();
  for (let i = 0; i < 650; i++) tomb.tombstoneRecord("mi_labs", { id: `l${i}` });
  ok(tomb.readRecordTombstones().length === 600, "tombstone list capped at 600");
}

// ── Integration: REAL vault + REAL merge ─────────────────────────────────────
{
  localStorage.clear();
  secureStorage.installInterception();
  await secureStorage.setupVaultAndMigrate("test passphrase for tombstones 42");

  const A = { id: "a", name: "Dr. Keep" }, B = { id: "b", name: "Dr. Dupe" }, C = { id: "c", name: "Dr. Also" };

  // Device 1 state [A,B,C]; the Drive file holds the same (other device's upload).
  localStorage.setItem("mi_care_team", JSON.stringify([A, B, C]));
  await secureStorage.flushPendingWrites();
  const driveCareTeam = JSON.parse(secureStorage.getRawCiphertext("mi_care_team"));

  // The shipped bug, reproduced: delete B with NO tombstone → merge resurrects it.
  localStorage.setItem("mi_care_team", JSON.stringify([A, C]));
  await secureStorage.flushPendingWrites();
  await mergeIntoLocal({ _exportedAt: "x", mi_care_team: driveCareTeam });
  let now = JSON.parse(localStorage.getItem("mi_care_team"));
  ok(now.some(r => r.id === "b"), `baseline reproduces the bug: deleted record resurrects via the union (got ${now.map(r => r.id).join(",")})`);

  // The fix: delete B WITH a tombstone → merge cannot bring it back.
  tomb.tombstoneRecord("mi_care_team", B);
  localStorage.setItem("mi_care_team", JSON.stringify([A, C]));
  await secureStorage.flushPendingWrites();
  await mergeIntoLocal({ _exportedAt: "x", mi_care_team: driveCareTeam });
  now = JSON.parse(localStorage.getItem("mi_care_team"));
  ok(!now.some(r => r.id === "b") && now.length === 2, `tombstoned deletion survives the merge (got ${now.map(r => r.id).join(",")})`);

  // Propagation: the deletion happened on the OTHER device — its tombstone
  // arrives in the same sync and kills the local copy here.
  const X = { id: "x", name: "HTN dupe" }, Y = { id: "y", name: "Keep" };
  localStorage.setItem("mi_conditions", JSON.stringify([X, Y]));
  await secureStorage.flushPendingWrites();
  const remoteTombs = [{ id: `mi_conditions|x`, store: "mi_conditions", key: "x", deletedAt: "2026-08-03T00:00:00Z" }];
  localStorage.setItem("mi_record_tombstones", JSON.stringify(remoteTombs));
  await secureStorage.flushPendingWrites();
  const driveTombBlob = JSON.parse(secureStorage.getRawCiphertext("mi_record_tombstones"));
  localStorage.removeItem("mi_record_tombstones"); // this device knows nothing yet
  await mergeIntoLocal({ _exportedAt: "x", mi_record_tombstones: driveTombBlob });
  const conds = JSON.parse(localStorage.getItem("mi_conditions"));
  ok(!conds.some(r => r.id === "x") && conds.some(r => r.id === "y"),
    `a deletion made on the other device propagates and applies here in one sync (got ${conds.map(r => r.id).join(",")})`);
}

console.log(`\n${pass} passed, ${fail} failed (record-tombstones)`);
process.exit(fail ? 1 : 0);
