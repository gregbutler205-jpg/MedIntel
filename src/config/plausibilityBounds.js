// ── A-12: plausibility guard — versioned bounds config ───────────────────────
// Two bands per measurement, mirroring the threshold-library structure (A-01):
// hard band = physiologically impossible, set beyond any recorded human
// value (a typo, not a real reading); soft band = implausible but possible
// (a real extreme value — exactly what the tripwire exists to catch, not
// this guard). No config entry means no check, same "no entry, no check"
// rule as the tripwire library. This is a DIFFERENT judgment than A-01's
// urgent-value thresholds: these bounds only need to answer "could a living
// human being have this value at all," not "is this concerning" — a much
// lower, less clinically-judgment-laden bar, so no review gate is needed
// here the way A-01's library is gated pending clinical review.

export const PLAUSIBILITY_VERSION = "1.0";

// ── Vitals ────────────────────────────────────────────────────────────────
// keyed by the exact field name used in mi_readings entries (src/lib/vitals.js)
export const VITAL_BOUNDS = {
  bp_s:       { label: "Systolic BP",  unit: "mmHg",   hardLow: 40,  hardHigh: 370, softLow: 70,  softHigh: 250 },
  bp_d:       { label: "Diastolic BP", unit: "mmHg",   hardLow: 20,  hardHigh: 250, softLow: 40,  softHigh: 150 },
  hr:         { label: "Heart Rate",   unit: "bpm",    hardLow: 20,  hardHigh: 300, softLow: 30,  softHigh: 220 },
  resting_hr: { label: "Resting HR",   unit: "bpm",    hardLow: 20,  hardHigh: 250, softLow: 30,  softHigh: 150 },
  o2:         { label: "O2 Saturation", unit: "%",     hardLow: 50,  hardHigh: 100, softLow: 70,  softHigh: 100 },
  weight:     { label: "Weight",       unit: "lbs",    hardLow: 15,  hardHigh: 1100, softLow: 60,  softHigh: 500 },
  temp:       { label: "Temperature",  unit: "°F",     hardLow: 85,  hardHigh: 112, softLow: 95,  softHigh: 106 },
  glucose:    { label: "Glucose",      unit: "mg/dL",  hardLow: 10,  hardHigh: 1200, softLow: 30,  softHigh: 600 },
  sleep:      { label: "Sleep",        unit: "hrs",    hardLow: 0,   hardHigh: 24,  softLow: 1,   softHigh: 16 },
};

// ── Labs ──────────────────────────────────────────────────────────────────
// Same six universal analytes A-01's default threshold library covers —
// deliberately not a general lab-plausibility system (that needs the A-04
// canonical-ID work); these are common, high-volume manual-entry analytes
// with genuinely unambiguous "no human has this value" bounds.
export const LAB_BOUNDS = {
  potassium:  { label: "Potassium",   unit: "mEq/L", hardLow: 1.0, hardHigh: 12,   softLow: 2.0, softHigh: 8 },
  sodium:     { label: "Sodium",      unit: "mEq/L", hardLow: 90,  hardHigh: 200,  softLow: 110, softHigh: 175 },
  glucose:    { label: "Glucose",     unit: "mg/dL", hardLow: 5,   hardHigh: 2000, softLow: 20,  softHigh: 800 },
  hemoglobin: { label: "Hemoglobin",  unit: "g/dL",  hardLow: 1,   hardHigh: 25,   softLow: 3,   softHigh: 20 },
  platelets:  { label: "Platelets",   unit: "K/uL",  hardLow: 0,   hardHigh: 2000, softLow: 5,   softHigh: 1000 },
  wbc:        { label: "WBC",         unit: "K/uL",  hardLow: 0,   hardHigh: 200,  softLow: 0.1, softHigh: 60 },
};

// A few unambiguous abbreviations, matching tripwire.js's alias set — full
// canonical-ID/alias matching across facilities is A-04.
export const LAB_ALIASES = { hgb: "hemoglobin", hb: "hemoglobin", plt: "platelets", glu: "glucose" };
