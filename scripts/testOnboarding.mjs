// ── Onboarding unit tests (ONBOARDING_SPEC v1.1) ─────────────────────────────
// Node harness, no framework — same convention as testThresholds.mjs.
// WP1 covers the state machine's pure helpers and the binding config
// invariants; WP3/WP4 extend this file with staleness, matrix gating,
// duplicate matching, and artifact trigger evaluation.

import assert from "node:assert/strict";

// Minimal browser polyfills so the modules import under Node.
// secureStorage.js captures Storage.prototype methods at module load, so the
// polyfill must be a real prototype-backed class, not a plain object.
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

const state = await import("file:///C:/Documents/Medical/IntelliTrax/Code/src/lib/onboardingState.js");
const cfg = await import("file:///C:/Documents/Medical/IntelliTrax/Code/src/config/onboardingConfig.js");

let pass = 0, fail = 0;
function check(name, fn) {
  try { fn(); pass++; console.log(`PASS — ${name}`); }
  catch (e) { fail++; console.log(`FAIL — ${name}: ${e.message}`); }
}

// ── §4.5 / §5.2 config invariants ────────────────────────────────────────────
check("§4.5 staleness thresholds are the spec constants", () => {
  assert.equal(cfg.STALE_WARN_MONTHS, 12);
  assert.equal(cfg.STALE_HISTORICAL_MONTHS, 24);
});

check("§5.2 matrix: medications/allergies/conditions are per-item, never bulk", () => {
  for (const cat of ["medication", "allergy", "condition"]) {
    assert.equal(cfg.CONFIRMATION_MATRIX[cat].perItem, true, `${cat} perItem`);
    assert.equal(cfg.CONFIRMATION_MATRIX[cat].bulk, false, `${cat} bulk`);
  }
});

check("§5.2 matrix: labs/vitals/procedures/immunizations/care_team allow bulk", () => {
  for (const cat of ["lab", "vital", "procedure", "immunization", "care_team"]) {
    assert.equal(cfg.CONFIRMATION_MATRIX[cat].bulk, true, `${cat} bulk`);
  }
});

check("§3.4 category review order starts high-consequence: meds, allergies, conditions", () => {
  assert.deepEqual(cfg.CATEGORY_REVIEW_ORDER.slice(0, 3), ["medication", "allergy", "condition"]);
});

// ── Phone / date helpers (§3.2) ──────────────────────────────────────────────
check("toE164US: 10-digit, formatted, and 1-prefixed inputs normalize; garbage → null", () => {
  assert.equal(state.toE164US("5558472931"), "+15558472931");
  assert.equal(state.toE164US("(555) 847-2931"), "+15558472931");
  assert.equal(state.toE164US("1 555 847 2931"), "+15558472931");
  assert.equal(state.toE164US("847-2931"), null);
  assert.equal(state.toE164US(""), null);
  assert.equal(state.toE164US(null), null);
});

check("maskUSPhone: progressive mask, caps at 10 digits", () => {
  assert.equal(state.maskUSPhone("555"), "555");
  assert.equal(state.maskUSPhone("5558"), "(555) 8");
  assert.equal(state.maskUSPhone("5558472931999"), "(555) 847-2931");
});

check("validateTransplantDate: future rejected; >50y warns but passes; recent clean", () => {
  const now = new Date("2026-07-15T12:00:00");
  assert.equal(state.validateTransplantDate("2027-01-01", now).ok, false);
  const old = state.validateTransplantDate("1970-01-01", now);
  assert.equal(old.ok, true);
  assert.ok(old.warn, "expected a 50-year warning");
  const recent = state.validateTransplantDate("2023-08-12", now);
  assert.equal(recent.ok, true);
  assert.equal(recent.warn, null);
  assert.equal(state.validateTransplantDate("", now).ok, true, "empty tx date is allowed (optional field)");
});

check("validateDob: required, real, not future", () => {
  const now = new Date("2026-07-15T12:00:00");
  assert.equal(state.validateDob("", now).ok, false);
  assert.equal(state.validateDob("2030-01-01", now).ok, false);
  assert.equal(state.validateDob("1973-09-14", now).ok, true);
});

// ── State machine (§2, §3.8) ─────────────────────────────────────────────────
check("saveState merges onto defaults and stamps last_seen", () => {
  localStorage.clear();
  const s = state.saveState({ phase: 2, goal: "emergency_packet" });
  assert.equal(s.phase, 2);
  assert.equal(s.goal, "emergency_packet");
  assert.ok(s.last_seen, "last_seen stamped");
  assert.equal(s.version, 1);
  const loaded = state.loadState();
  assert.equal(loaded.phase, 2);
});

check("§2 resume banner: phase<5 with last_seen shows; phase 5 or fresh does not", () => {
  localStorage.clear();
  assert.equal(state.shouldShowResumeBanner(state.loadState()), false, "no state → no banner");
  state.saveState({ phase: 3 });
  assert.equal(state.shouldShowResumeBanner(state.loadState()), true, "mid-flow → banner");
  state.saveState({ phase: 5 });
  assert.equal(state.shouldShowResumeBanner(state.loadState()), false, "complete → no banner");
});

check("§3.0 hard gate: extractionAllowed only after consent", () => {
  localStorage.clear();
  assert.equal(state.extractionAllowed(), false, "no state → blocked");
  state.saveState({ consents: { ai_processing: false, accepted_at: null } });
  assert.equal(state.extractionAllowed(), false, "declined → blocked");
  state.saveState({ consents: { ai_processing: true, accepted_at: new Date().toISOString() } });
  assert.equal(state.extractionAllowed(), true, "granted → allowed");
});

check("Start over keeps the product-wide consent, resets the rest", () => {
  localStorage.clear();
  state.saveState({ phase: 4, goal: "organize_meds", consents: { ai_processing: true, accepted_at: "2026-07-15T00:00:00Z" } });
  const fresh = state.resetStateKeepConsent();
  assert.equal(fresh.phase, 0);
  assert.equal(fresh.goal, null);
  assert.equal(fresh.consents.ai_processing, true, "consent survives Start over");
});

check("§3.1/§6: five goals, each mapped to an artifact; default goal is the emergency packet", () => {
  assert.equal(state.GOALS.length, 5);
  state.GOALS.forEach(g => assert.ok(g.artifact, `${g.id} has artifact`));
  assert.equal(state.DEFAULT_GOAL, "emergency_packet");
});

console.log(`\n${pass} passed, ${fail} failed (onboarding)`);
if (fail > 0) process.exit(1);
