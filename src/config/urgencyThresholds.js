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

// "2.0": Advanced mode moved from Claude Opus 4.6 to Claude Opus 5 — a
// material model change, so existing Advanced users are switched to Standard
// and asked to re-consent (the designed stale-consent path, not a silent swap).
export const CONSENT_VERSION = "2.0";
