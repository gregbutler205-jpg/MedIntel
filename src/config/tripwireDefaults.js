// ── A-01 / PG-09: default tripwire threshold library ─────────────────────────
// INSINA_AI_PROMPTS.md §6: "the default library [is] limited to values with
// defensible universal critical bounds" and "sit[s] behind the same clinical
// review gate as modules." Per Greg's decision (2026-07-12, logged as
// DEC-026): v1 seeds ONLY genuinely diagnosis-agnostic panic values — the
// kind any hospital lab flags for any patient regardless of why they're
// there — and ships gated unreviewed, same mechanism as
// MOD-IMMUNOSUPPRESSION (reviewedBy null; src/lib/tripwire.js excludes it
// from urgent-tier evaluation unless mi_allow_unreviewed_modules is set
// locally). Everything transplant/tacrolimus-specific from the old
// urgencyThresholds.js (liver panel "rejection" framing, kidney panel
// "nephrotoxicity" framing, Tacrolimus itself, CMV PCR, LDL/HbA1c targets)
// is deliberately left out of v1 — that's condition-aware tier (b) from
// A-01's spec, deferred (see DECISIONS.md OPEN item).
//
// Bounds below reflect widely published clinical critical/panic values
// (the kind of severe derangement any hospital lab's standard critical-value
// callback list would flag), not this app's own clinical judgment — still
// gated pending Greg's own review before any pilot user relies on them.
export const DEFAULT_LIBRARY = {
  version: "1.0",
  reviewedBy: null,
  reviewDate: null,
  analytes: [
    {
      canonicalId: "potassium",
      name: "Potassium",
      unit: "mEq/L",
      urgentLow: 2.5,
      urgentHigh: 6.5,
      guidanceLow: "A potassium this low can cause dangerous heart rhythm problems. Contact your care team today, or seek emergency care now if you have chest pain, palpitations, or severe weakness.",
      guidanceHigh: "A potassium this high can cause dangerous heart rhythm problems. Contact your care team today, or seek emergency care now if you have chest pain, palpitations, or severe weakness.",
    },
    {
      canonicalId: "sodium",
      name: "Sodium",
      unit: "mEq/L",
      urgentLow: 120,
      urgentHigh: 160,
      guidanceLow: "A sodium this low can cause confusion, seizures, or loss of consciousness. Contact your care team today, or seek emergency care now if you have confusion, a severe headache, or a seizure.",
      guidanceHigh: "A sodium this high can cause confusion or seizures. Contact your care team today, or seek emergency care now if you have confusion or a seizure.",
    },
    {
      canonicalId: "glucose",
      name: "Glucose",
      unit: "mg/dL",
      urgentLow: 40,
      urgentHigh: 500,
      guidanceLow: "A blood sugar this low is a medical emergency. Treat it per your care team's instructions and seek emergency care now if you cannot safely raise it or you lose consciousness.",
      guidanceHigh: "A blood sugar this high can indicate a serious complication. Contact your care team today, or seek emergency care now if you have vomiting, difficulty breathing, or confusion.",
    },
    {
      canonicalId: "hemoglobin",
      name: "Hemoglobin",
      unit: "g/dL",
      urgentLow: 7,
      guidanceLow: "A hemoglobin this low often requires urgent evaluation. Contact your care team today, or seek emergency care now if you have chest pain, severe weakness, or fainting.",
    },
    {
      canonicalId: "platelets",
      name: "Platelets",
      unit: "K/uL",
      urgentLow: 20,
      guidanceLow: "A platelet count this low increases the risk of serious bleeding. Contact your care team today, or seek emergency care now if you have unusual bruising, bleeding that won't stop, or a severe headache.",
    },
    {
      canonicalId: "wbc",
      name: "WBC",
      unit: "K/uL",
      urgentLow: 1.0,
      urgentHigh: 30.0,
      guidanceLow: "A white blood cell count this low substantially increases infection risk. Contact your care team today, or seek emergency care now if you have a fever.",
      guidanceHigh: "A white blood cell count this high can indicate a serious underlying process. Contact your care team today.",
    },
  ],
};
