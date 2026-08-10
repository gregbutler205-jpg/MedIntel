// ── Demo seeder tests (public/demo/index.html) ───────────────────────────────
// This file has wiped a live record once (2026-07-19), and it is the only place
// in the codebase that deletes storage keys in bulk. It is also plain inline
// HTML with no import graph, so nothing else can cover it.
//
// These tests execute the REAL <script> block out of the REAL html in a vm
// sandbox with a localStorage polyfill — not a copy of the logic, and not a
// grep. If the guard or the reset ever changes shape, this fails.
// Run: npm run test:demo-seeder

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const HTML = readFileSync(new URL("../public/demo/index.html", import.meta.url), "utf-8");

const scripts = [...HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
if (scripts.length !== 1) {
  throw new Error(`expected exactly 1 inline <script> in the seeder, found ${scripts.length}`);
}
const SEEDER_SRC = scripts[0];

class Storage {
  constructor(seed = {}) { this._m = new Map(Object.entries(seed).map(([k, v]) => [k, String(v)])); }
  getItem(k) { return this._m.has(k) ? this._m.get(k) : null; }
  setItem(k, v) { this._m.set(k, String(v)); }
  removeItem(k) { this._m.delete(k); }
  key(i) { return [...this._m.keys()][i] ?? null; }
  get length() { return this._m.size; }
  clear() { throw new Error("localStorage.clear() called — the seeder must never use it"); }
  snapshot() { return Object.fromEntries(this._m); }
}

/** Execute the seeder against a starting storage state. */
function runSeeder({ initial = {}, search = "" } = {}) {
  const localStorage = new Storage(initial);
  const el = () => ({ style: {}, set textContent(v) { this._t = v; }, get textContent() { return this._t; },
                      set innerHTML(v) { this._h = v; }, get innerHTML() { return this._h; } });
  const nodes = { ".spinner": el(), ".msg": el(), ".pin": el() };
  const location = { search, href: "https://demo.insinahealth.com/" + search };
  const timers = [];
  const sandbox = {
    localStorage,
    document: { querySelector: sel => nodes[sel] },
    location,
    window: { location },
    URLSearchParams,
    setTimeout: (fn) => { timers.push(fn); return 0; },
    console,
  };
  vm.createContext(sandbox);
  new vm.Script(SEEDER_SRC).runInContext(sandbox);
  timers.forEach(fn => fn()); // fire the redirect

  return {
    store: localStorage.snapshot(),
    get: k => localStorage.getItem(k),
    msg: nodes[".msg"].textContent,
    refusedMsg: nodes[".msg"].innerHTML,
    redirectedTo: location.href,
  };
}

const VERSION = (SEEDER_SRC.match(/const DEMO_DATASET_VERSION = "([^"]+)"/) || [])[1];
const VKEY = "mi_demo_dataset_version";

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("PASS — " + m); } else { fail++; console.log("FAIL — " + m); } };

// ── The version constant itself ──────────────────────────────────────────────
ok(typeof VERSION === "string" && VERSION.length > 0, `DEMO_DATASET_VERSION is set (got "${VERSION}")`);
ok(!/__APP_VERSION__|pkg\.version/.test(SEEDER_SRC),
   "dataset version is independent of the app version — releases must not force mid-demo resets");

// ── Fresh device ─────────────────────────────────────────────────────────────
{
  const r = runSeeder();
  ok(r.get("mi_is_demo") === "1", "fresh device: marked as a demo device");
  ok(r.get(VKEY) === VERSION, "fresh device: dataset version stamped");
  ok(JSON.parse(r.get("mi_labs")).length > 0, "fresh device: labs seeded");
  ok(r.redirectedTo === "../", "fresh device: redirects into the app");
}

// ── The four stores added in v1.46.1 must not silently vanish ────────────────
{
  const r = runSeeder();
  for (const [k, min] of [["mi_pharmacies", 1], ["mi_diagnostics", 1], ["mi_emergency_contacts", 1], ["mi_notes", 1]]) {
    ok(JSON.parse(r.get(k) || "[]").length >= min, `${k} seeded (regression guard for the empty-store bug)`);
  }
  const notes = JSON.parse(r.get("mi_notes"));
  ok(notes.some(n => n.aiGenerated === true), "the saved AI example note is seeded and labelled AI-generated");
}

// ── Refusal: a real vault is never touched ───────────────────────────────────
{
  const r = runSeeder({ initial: { mi_vault: "ENCRYPTED-REAL-VAULT", mi_labs: '[{"real":true}]' } });
  // Prove we reached the REFUSE branch rather than crashing — a thrown seeder
  // would also leave storage untouched and make every assertion below vacuous.
  ok(/already have a record/.test(r.refusedMsg || ""), "vault present: shows the refusal notice (not an error, not a crash)");
  ok(!/^Error loading demo/.test(r.msg || ""), "vault present: no exception was swallowed");
  ok(r.get("mi_vault") === "ENCRYPTED-REAL-VAULT", "vault present: vault is untouched");
  ok(r.get("mi_labs") === '[{"real":true}]', "vault present: real data is untouched");
  ok(r.get("mi_is_demo") === null, "vault present: device is NOT marked as a demo");
  ok(r.get(VKEY) === null, "vault present: no dataset version written");
  ok(r.redirectedTo !== "../", "vault present: no redirect into the demo");
}

// ── Refusal: real health data with no demo marker ────────────────────────────
{
  const r = runSeeder({ initial: { mi_meds_full: '[{"name":"real med"}]' } });
  ok(r.get("mi_meds_full") === '[{"name":"real med"}]', "unmarked real data: untouched");
  ok(r.get("mi_is_demo") === null, "unmarked real data: refuses to seed");
}

// ── Same version: plain overwrite, leftovers survive (documents the behaviour)
{
  const r = runSeeder({ initial: {
    mi_is_demo: "1", mi_labs: "[]", [VKEY]: VERSION,
    mi_record_tombstones: '[{"store":"mi_appointments","id":"a1"}]',
  }});
  ok(JSON.parse(r.get("mi_labs")).length > 0, "same version: DEMO keys still rewritten");
  ok(r.get("mi_record_tombstones") !== null, "same version: no purge — leftovers survive");
  ok(r.msg === undefined, "same version: no 'Refreshing' message");
}

// ── Stale version: full reset clears what a plain overwrite cannot ───────────
{
  const r = runSeeder({ initial: {
    mi_is_demo: "1", [VKEY]: "2020-01-01.0",
    mi_record_tombstones: '[{"store":"mi_appointments","id":"a1"}]',
    mi_appt_tombstones: '["x"]',
    mi_lab_name_map: '{"FK506":"Tacrolimus"}',
    mi_dismissed_alerts: '["alert-1"]',
    insina_ai_messages: '[{"role":"user","text":"leftover chat"}]',
    unrelated_key: "belongs to something else",
  }});
  ok(r.get("mi_record_tombstones") === null, "stale: record tombstones purged — deleted demo records come back");
  ok(r.get("mi_appt_tombstones") === null, "stale: appointment tombstones purged");
  ok(r.get("mi_lab_name_map") === null, "stale: lab groupings purged");
  ok(r.get("mi_dismissed_alerts") === null, "stale: dismissed alerts purged");
  ok(r.get("insina_ai_messages") === null, "stale: insina_* AI chat family purged");
  ok(r.get("unrelated_key") === "belongs to something else", "stale: non-prefixed keys are NOT touched");
  ok(r.get(VKEY) === VERSION, "stale: version updated so the next visit is a plain overwrite");
  ok(JSON.parse(r.get("mi_labs")).length > 0, "stale: fresh dataset written after the purge");
  ok(r.msg === "Refreshing demo data…", "stale: tells the visitor it is refreshing");
}

// ── A device that predates versioning is treated as stale ────────────────────
{
  const r = runSeeder({ initial: { mi_is_demo: "1", mi_record_tombstones: '["old"]' } });
  ok(r.get("mi_record_tombstones") === null, "no version key at all (pre-versioning demo) → treated as stale and reset");
  ok(r.get(VKEY) === VERSION, "pre-versioning device gets stamped");
}

// ── ?reset=1 forces a reset even when the version matches ────────────────────
{
  const r = runSeeder({
    search: "?reset=1",
    initial: { mi_is_demo: "1", [VKEY]: VERSION, mi_record_tombstones: '["stuck"]' },
  });
  ok(r.get("mi_record_tombstones") === null, "?reset=1 purges even on a current version (demo-day escape hatch)");
}

// ── ?reset=1 must NOT become a way to wipe a real record ─────────────────────
{
  const r = runSeeder({ search: "?reset=1", initial: { mi_vault: "REAL", mi_labs: '[{"real":true}]' } });
  ok(r.get("mi_vault") === "REAL", "?reset=1 with a vault present: still refuses, vault intact");
  ok(r.get("mi_labs") === '[{"real":true}]', "?reset=1 with a vault present: real data intact");
}

// ── ?next=companion hand-off ─────────────────────────────────────────────────
// Nothing links to the companion, so a visitor can land on /companion/ with an
// empty record. The demo build injects a guard there that bounces to the seeder
// with ?next=companion; the seeder must send them back rather than to the app.
{
  const r = runSeeder({ search: "?next=companion" });
  ok(r.redirectedTo === "../companion/", `?next=companion returns to the phone UI (got ${r.redirectedTo})`);
  ok(JSON.parse(r.get("mi_labs") || "[]").length > 0, "?next=companion still seeds the full dataset");
  ok(r.get("mi_is_demo") === "1", "?next=companion still marks the device as a demo");
}
{
  const r = runSeeder({ search: "?next=somethingelse" });
  ok(r.redirectedTo === "../", "an unknown ?next value falls back to the app, never an open redirect");
}
{
  const r = runSeeder({ search: "?next=companion", initial: { mi_vault: "REAL", mi_labs: '[{"real":true}]' } });
  ok(r.get("mi_vault") === "REAL", "?next=companion with a vault present: still refuses");
  ok(r.redirectedTo !== "../companion/", "?next=companion with a vault present: no hand-off");
}

// ── Structural invariants ────────────────────────────────────────────────────
ok(!/localStorage\.clear\(\)/.test(SEEDER_SRC), "the seeder never calls localStorage.clear()");
ok(SEEDER_SRC.indexOf("setItem(DEMO_VERSION_KEY, DEMO_DATASET_VERSION)") > SEEDER_SRC.indexOf("Object.entries(DEMO)"),
   "version is stamped AFTER the dataset — a throw mid-seed leaves it stale so the next visit retries");

console.log(`\n${pass} passed, ${fail} failed (demo-seeder)`);
assert.equal(fail, 0);
