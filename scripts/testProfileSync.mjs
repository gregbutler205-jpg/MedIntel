// ── DEC-047: profile edit/delete persistence through the Drive merge ─────────
// Greg: "when I delete or edit a field on the Health Profile ... it doesn't
// change the next time I open the app." Root cause: the merge's OBJECT rule
// was a shallow { ...local, ...drive } — Drive won every conflicting field and
// restored cleared ones. This suite runs a REAL vault through the REAL
// mergeIntoLocal (same harness as testPrepMarks) and pins the new rule:
// both-stamped → newer object wins wholesale; unstamped → legacy unchanged.
// Run: npm run test:profile-sync

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = (p) => join(__dirname, "..", "src", p);

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

const secureStorage = await import("../src/lib/secureStorage.js");
const { mergeIntoLocal } = await import("../src/lib/driveSync.js");

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("PASS — " + m); } else { fail++; console.log("FAIL — " + m); } };

// Write a value, flush, and capture the Drive-format ciphertext blob for it.
async function captureDriveCopy(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  await secureStorage.flushPendingWrites();
  return JSON.parse(secureStorage.getRawCiphertext(key));
}
async function setLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  await secureStorage.flushPendingWrites();
}
const readLocal = (key) => JSON.parse(localStorage.getItem(key));

localStorage.clear();
secureStorage.installInterception();
await secureStorage.setupVaultAndMigrate("test passphrase for profile sync 47");

const KEY = "mi_profile_personal";

// ── 1. The reported bug: a newer LOCAL edit survives the app-open merge ──────
{
  const stale = { name: "Greg B", phone: "601-555-0000", bloodType: "O+", updatedAt: 1000 };
  const driveStale = await captureDriveCopy(KEY, stale);

  // Patient edits the phone AND clears bloodType; the save stamps newer.
  await setLocal(KEY, { name: "Greg B", phone: "601-555-9999", updatedAt: 2000 });
  await mergeIntoLocal({ _exportedAt: "x", [KEY]: driveStale });
  const now = readLocal(KEY);
  ok(now.phone === "601-555-9999", "edited field survives the boot merge against a stale Drive copy");
  ok(!("bloodType" in now), "a CLEARED field stays cleared — the stale Drive copy cannot restore it");
  ok(now.updatedAt === 2000, "the newer object is kept wholesale (stamp intact)");
}

// ── 2. The other direction: a newer DRIVE edit lands here ────────────────────
{
  const newer = { name: "Greg B", phone: "601-555-7777", updatedAt: 5000 };
  const driveNewer = await captureDriveCopy(KEY, newer);

  await setLocal(KEY, { name: "Greg B", phone: "601-555-9999", organ: "Liver", updatedAt: 2000 });
  await mergeIntoLocal({ _exportedAt: "x", [KEY]: driveNewer });
  const now = readLocal(KEY);
  ok(now.phone === "601-555-7777", "a newer edit from the other device wins here");
  ok(!("organ" in now), "wholesale replacement: a field the newer copy dropped is dropped here too");
}

// ── 3. Unstamped objects keep the LEGACY shallow merge, byte-for-byte ────────
{
  const drivePlain = await captureDriveCopy(KEY, { name: "Drive Name", phone: "111", extra: "drive-only" });
  await setLocal(KEY, { name: "Local Name", city: "Hattiesburg" });
  await mergeIntoLocal({ _exportedAt: "x", [KEY]: drivePlain });
  const now = readLocal(KEY);
  ok(now.name === "Drive Name", "unstamped: Drive still wins conflicting scalars (legacy pinned)");
  ok(now.city === "Hattiesburg", "unstamped: local-only fields still survive (legacy union)");
  ok(now.extra === "drive-only", "unstamped: drive-only fields still arrive (legacy union)");
}

// ── 4. One-sided stamp falls back to the legacy merge ────────────────────────
{
  const driveStamped = await captureDriveCopy(KEY, { name: "Drive Name", updatedAt: 9000 });
  await setLocal(KEY, { name: "Local Name", city: "Hattiesburg" }); // no stamp locally
  await mergeIntoLocal({ _exportedAt: "x", [KEY]: driveStamped });
  const now = readLocal(KEY);
  ok(now.name === "Drive Name" && now.city === "Hattiesburg",
     "one-sided stamp: legacy shallow merge applies (opt-in requires BOTH stamped)");
}

// ── 5. Insurance store rides the same rule ───────────────────────────────────
{
  const IKEY = "mi_profile_insurance";
  const driveStale = await captureDriveCopy(IKEY, { carrier: "Old Carrier", memberId: "A1", updatedAt: 100 });
  await setLocal(IKEY, { carrier: "New Carrier", updatedAt: 200 });
  await mergeIntoLocal({ _exportedAt: "x", [IKEY]: driveStale });
  const now = readLocal(IKEY);
  ok(now.carrier === "New Carrier" && !("memberId" in now),
     "insurance object: newer local edit + cleared field both stick");
}

// ── 6. Array stores are untouched by the object rule (regression guard) ──────
{
  const AKEY = "mi_care_team";
  const driveArr = await captureDriveCopy(AKEY, [
    { id: 1, name: "Dr. A (drive edit)", updatedAt: 500 },
    { id: 2, name: "Dr. B" },
  ]);
  await setLocal(AKEY, [{ id: 1, name: "Dr. A (local edit)", updatedAt: 900 }]);
  await mergeIntoLocal({ _exportedAt: "x", [AKEY]: driveArr });
  const now = readLocal(AKEY);
  const a = now.find(x => x.id === 1), b = now.find(x => x.id === 2);
  ok(a?.name === "Dr. A (local edit)", "array: newer stamped item edit still wins (DEC-046 unchanged)");
  ok(!!b, "array: union still brings the other device's records");
}

// ── 7. Structural: every profile save path stamps ────────────────────────────
{
  const store = readFileSync(SRC("store.js"), "utf8");
  ok(/setProfilePersonal\(v\) \{ setStore\('profile_personal', \{ \.\.\.v, updatedAt: Date\.now\(\) \}\); \}/.test(store),
     "setProfilePersonal stamps at the setter");
  ok(/setProfileInsurance\(v\) \{ setStore\('profile_insurance', \{ \.\.\.v, updatedAt: Date\.now\(\) \}\); \}/.test(store),
     "setProfileInsurance stamps at the setter");

  const tab02 = readFileSync(SRC("components/tabs/Tab02.jsx"), "utf8");
  const stamps = (tab02.match(/updatedAt: Date\.now\(\)/g) || []).length;
  ok(stamps >= 5, `Tab02 stamps all five per-item saves (found ${stamps})`);

  const phase2 = readFileSync(SRC("components/onboarding/Phase2Basics.jsx"), "utf8");
  ok(phase2.includes("p.updatedAt = Date.now()"), "onboarding Tier-0 write keeps the stamp intact");

  const sync = readFileSync(SRC("lib/driveSync.js"), "utf8");
  ok(sync.includes("du > lu ? value : local"), "merge object branch: newer wholesale when both stamped");
  ok(sync.includes("{ ...local, ...value }"), "merge object branch: legacy shallow merge retained for unstamped");
}

// ── 8. Weight auto-fill from Vitals (v1.49.0) ────────────────────────────────
{
  const { latestWeightReading } = await import("../src/store.js");

  localStorage.setItem("mi_readings", JSON.stringify([
    { id: "r1", date: "2026-08-13", systolic: 128, diastolic: 82 },            // newest, BP-only
    { id: "r2", date: "2026-08-10", weight: "182.4" },                          // newest WITH weight
    { id: "r3", date: "2026-08-01", weight: 185 },
    { id: "r4", date: "2026-08-12", weight: "not-a-number" },                   // junk ignored
  ]));
  await secureStorage.flushPendingWrites();
  const w = latestWeightReading();
  ok(w?.id === "r2", "picks the newest reading that HAS a weight (skips newer BP-only + junk)");
  ok(parseFloat(w.weight) === 182.4, "returns the reading with its weight value");

  localStorage.setItem("mi_readings", JSON.stringify([{ id: "r1", date: "2026-08-13", systolic: 128 }]));
  await secureStorage.flushPendingWrites();
  ok(latestWeightReading() === null, "no logged weights → null (profile field is the fallback)");

  localStorage.setItem("mi_readings", JSON.stringify([]));
  await secureStorage.flushPendingWrites();
  ok(latestWeightReading() === null, "empty readings → null, never throws");

  const tab02 = readFileSync(SRC("components/tabs/Tab02.jsx"), "utf8");
  ok(tab02.includes("latestWeightReading"), "Health Profile uses the vitals weight helper");
  ok(tab02.includes("log a new weight on the Vitals tab"), "edit mode explains where weight now comes from");
  const emergency = readFileSync(SRC("lib/printEmergency.js"), "utf8");
  ok(emergency.includes("latestWeightReading"), "emergency packet prints the CURRENT weight from Vitals");
}

console.log(`\n${pass} passed, ${fail} failed (profile-sync)`);
assert.equal(fail, 0);
