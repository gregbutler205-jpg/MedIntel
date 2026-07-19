// ── DEC-PNN pending: tripwire advisory — feature flag (§7) ───────────────────
// Advisory FIRING (the EMERGENCY/TODAY takeover on an entered/extracted value)
// stays OFF until Greg signs off the DRAFT threshold numbers in
// src/config/tripwireDefaults.js + src/data/tripwireTable.js.
//
// This flag gates ONLY the automatic firing. The manual Emergency Info button
// (§5) and the advisory templates ship regardless of this flag.
export const TRIPWIRE_ADVISORY_ENABLED = false;
