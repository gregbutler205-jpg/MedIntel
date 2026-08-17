// ── Monitored analyte list (WO_LAB_BATCH_CONFIRM_01 / DEC-P-TBD) ─────────────
// Analytes whose rows ALWAYS require individual acknowledgment during batch
// confirmation, regardless of range or confidence — the transplant monitoring
// list. Matched via canonicalLabId(), so facility aliases (FK506, "Tacrolimus
// Level", "Tacrolimus Whole Blood") resolve to the same entry.
//
// GOVERNANCE: extensions to this list go through the Clinical Safety Core
// review process — population-level clinical judgment, never conditioned on
// an individual patient's record. This constant is the single source of
// truth; do not hardcode monitored analytes anywhere else.
export const MONITORED_ANALYTES = ["tacrolimus"];
