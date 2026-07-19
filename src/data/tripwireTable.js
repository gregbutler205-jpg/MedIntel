// ── DEC-PNN pending: tripwire advisory — threshold table (v1.0.0-draft) ──────
// The deterministic table the emergency/urgent advisory evaluates against. This
// is the ONLY thing that classifies EMERGENCY vs TODAY (same principle as the
// A-01 tripwire engine and CSC rule 4: deterministic, never the model).
//
// Structure: a registry keyed by metric id. Each metric carries a display name,
// unit, `source` origin ("vital" | "lab"), `appliesTo` (which entry paths it
// evaluates), and an ordered list of bands. Each band is { tier, test } where
// test(value) is a pure predicate. Evaluation checks EMERGENCY bands first, then
// TODAY — highest severity wins (see src/lib/advisoryEngine.js).
//
// LAB metrics derive their bands from ADVISORY_LAB_BANDS in
// src/config/tripwireDefaults.js, whose EMERGENCY bounds are the same critical
// values as that file's urgent tier — labs stay single-source. VITAL metrics are
// literal here (they are not lab analytes). ALL rows are DRAFT / REVIEW-REQUIRED
// and firing is gated behind TRIPWIRE_ADVISORY_ENABLED (default false).
//
// EXCLUDED FROM v1 (documented, not seeded):
//   · immunosuppressant drug levels (tacrolimus, etc.) — parked per existing DEC
//     (condition-aware tier, not a diagnosis-agnostic panic value).
//   · creatinine and weight-delta rules — baseline-relative, not absolute; table v2.
// v1 is absolutes-only: it flags a value against fixed bounds, never against the
// patient's own trend. A mildly-low-for-them reading inside the normal band does
// not fire (see testAdvisory.mjs, the BP 98/62 case).

import { ADVISORY_LAB_BANDS, DEFAULT_LIBRARY } from "../config/tripwireDefaults.js";

export const TRIPWIRE_TABLE_VERSION = "1.0.0-draft";

export const EMERGENCY = "EMERGENCY";
export const TODAY = "TODAY";

// ── Pure band predicates ─────────────────────────────────────────────────────
const lt  = (x) => (v) => v < x;
const gt  = (x) => (v) => v > x;
const gte = (x) => (v) => v >= x;
const inclIncl = (a, b) => (v) => v >= a && v <= b; // [a, b]
const inclExcl = (a, b) => (v) => v >= a && v < b;  // [a, b)

// ── VITAL metrics (mi_readings field ids) ────────────────────────────────────
// Both-ends where the spec defines both. Glucose is a lab metric (below) even
// though mi_readings also carries a glucose field — one metric id, one row set.
const VITAL_METRICS = {
  bp_s: {
    displayName: "systolic blood pressure", unit: "mmHg", source: "vital", appliesTo: ["manual", "staged"],
    // Greg's ruling (§9 wins over §1): no low-side TODAY band — a systolic in the
    // 90s does not fire. Low side is EMERGENCY-only (<90); the §1 "90-99 TODAY"
    // row was the error. High side keeps both tiers.
    bands: [
      { tier: EMERGENCY, test: lt(90) },
      { tier: EMERGENCY, test: gt(200) },
      { tier: TODAY, test: inclIncl(180, 200) },
    ],
  },
  bp_d: {
    displayName: "diastolic blood pressure", unit: "mmHg", source: "vital", appliesTo: ["manual", "staged"],
    bands: [
      { tier: EMERGENCY, test: gt(120) },
      { tier: TODAY, test: lt(50) },
    ],
  },
  hr: {
    displayName: "heart rate", unit: "bpm", source: "vital", appliesTo: ["manual", "staged"],
    bands: [
      { tier: EMERGENCY, test: lt(40) },
      { tier: EMERGENCY, test: gt(140) },
      { tier: TODAY, test: inclIncl(40, 49) },
      { tier: TODAY, test: inclIncl(120, 140) },
    ],
  },
  o2: {
    displayName: "oxygen saturation", unit: "%", source: "vital", appliesTo: ["manual", "staged"],
    bands: [
      { tier: EMERGENCY, test: lt(88) },
      { tier: TODAY, test: inclIncl(88, 91) },
    ],
  },
  temp: {
    displayName: "temperature", unit: "°F", source: "vital", appliesTo: ["manual", "staged"],
    bands: [
      { tier: EMERGENCY, test: gte(103.0) },
      { tier: TODAY, test: inclExcl(100.4, 103.0) },
    ],
  },
};

// ── LAB metrics (canonicalId) — bands derived from the single source ──────────
function labDisplayName(canonicalId) {
  const a = DEFAULT_LIBRARY.analytes.find((x) => x.canonicalId === canonicalId);
  return (a?.name || canonicalId).toLowerCase();
}
function labUnit(canonicalId) {
  const a = DEFAULT_LIBRARY.analytes.find((x) => x.canonicalId === canonicalId);
  return a?.unit || "";
}
function bandsFromLab({ emLow, tLowMax, tHiMin, emHigh }) {
  const bands = [];
  if (emLow != null) bands.push({ tier: EMERGENCY, test: lt(emLow) });
  if (emHigh != null) bands.push({ tier: EMERGENCY, test: gt(emHigh) });
  if (emLow != null && tLowMax != null) bands.push({ tier: TODAY, test: inclIncl(emLow, tLowMax) });
  if (tHiMin != null && emHigh != null) bands.push({ tier: TODAY, test: inclIncl(tHiMin, emHigh) });
  return bands;
}

const LAB_METRICS = Object.fromEntries(
  Object.entries(ADVISORY_LAB_BANDS).map(([canonicalId, band]) => [
    canonicalId,
    {
      displayName: labDisplayName(canonicalId),
      unit: labUnit(canonicalId),
      source: "lab",
      appliesTo: ["manual", "staged"],
      bands: bandsFromLab(band),
    },
  ])
);

/** The full metric registry: vitals + labs, keyed by metric id. */
export const TRIPWIRE_METRICS = { ...VITAL_METRICS, ...LAB_METRICS };

/** The mi_readings vital fields the advisory evaluates (skip weight/sleep/resting_hr). */
export const ADVISORY_VITAL_FIELDS = Object.keys(VITAL_METRICS);
