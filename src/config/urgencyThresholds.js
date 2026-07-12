// ─────────────────────────────────────────────────────────────────────────────
// Insina Health — AI consent versioning
// A-01/PG-09 retired this file's lab-threshold content: URGENCY_THRESHOLDS was
// hardcoded to one patient's transplant context and consumed by nothing (no
// code path evaluated it, so the LLM was the de facto urgency layer — the
// exact drift the deterministic-tripwire decision exists to prevent). The
// real, generalized threshold system is src/config/tripwireDefaults.js +
// src/lib/tripwire.js. CONSENT_VERSION lives here only for historical
// reasons — it is Advanced-mode AI consent versioning, unrelated to labs.
// ─────────────────────────────────────────────────────────────────────────────

export const CONSENT_VERSION = "1.0";
