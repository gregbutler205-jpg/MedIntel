// ── DEC-PNN pending: tripwire advisory — evaluation engine ───────────────────
// Pure, synchronous, deterministic. Given one entered/extracted value, decide
// whether it crosses an EMERGENCY or TODAY threshold and whether that should
// raise a takeover. Highest severity wins. This is the ONLY classifier — the AI
// is never on this path.
//
// CLIENT-SIDE ONLY. No network calls. This module imports ONLY the threshold
// table (data). It must never import from the AI/prompt/proxy layer;
// testAdvisory.mjs asserts that import property.

import { TRIPWIRE_METRICS, TRIPWIRE_TABLE_VERSION, EMERGENCY, TODAY } from "../data/tripwireTable.js";

const STAGED_WINDOW_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

/** True when a staged value's specimen/result date is recent enough to still act on. */
function stagedWithinWindow(resultDate, now) {
  if (!resultDate) return false; // undated import: can't confirm it's current → badge only, no takeover
  const t = new Date(resultDate).getTime();
  if (isNaN(t)) return false;
  return now - t <= STAGED_WINDOW_DAYS * DAY_MS;
}

/**
 * Evaluate one value against the table.
 * @param {string} metric  metric id (mi_readings field id, or a lab canonicalId)
 * @param {number|string} value
 * @param {object} [context]
 * @param {"manual"|"staged"} [context.source="manual"]
 * @param {string|null} [context.resultDate=null]  ISO/date of the specimen or reading (staged only)
 * @param {string|number|null} [context.readingId=null]  id of the source reading/lab/staged item, for the audit log
 * @param {number} [context.now=Date.now()]  injectable clock for tests
 * @returns {object|null} a hit, or null if nothing crosses / metric unknown / value unparseable
 *
 * Hit shape:
 *   { metric, displayName, unit, value, tier, source, resultDate, readingId,
 *     verification, withinWindow, takeover, tableVersion }
 * - verification: "patient-entered" for manual values (the patient typed and,
 *   for extreme vitals, A-12 confirmed it); "unverified-import" for staged
 *   OCR/extracted values until the patient verifies them against the original
 *   (the verify-first flow, DEC-043 item 3).
 * - withinWindow: true for manual (presumed current); for staged, the 14-day rule.
 * - takeover: whether a full-screen/modal takeover should fire now. Manual always;
 *   staged only within the window. A staged hit outside the window still returns
 *   (takeover:false) so the caller can render the "historical critical value" badge.
 */
export function evaluateEntry(metric, value, context = {}) {
  const { source = "manual", resultDate = null, readingId = null } = context;
  const now = typeof context.now === "number" ? context.now : Date.now();

  const def = TRIPWIRE_METRICS[metric];
  if (!def) return null;
  if (Array.isArray(def.appliesTo) && !def.appliesTo.includes(source)) return null;

  const v = typeof value === "number" ? value : parseFloat(value);
  if (v == null || isNaN(v)) return null;

  // Highest severity wins: any EMERGENCY band beats any TODAY band.
  let tier = null;
  for (const band of def.bands) {
    if (band.test(v)) {
      if (band.tier === EMERGENCY) { tier = EMERGENCY; break; }
      if (band.tier === TODAY) tier = tier || TODAY;
    }
  }
  if (!tier) return null;

  const withinWindow = source === "manual" ? true : stagedWithinWindow(resultDate, now);

  return {
    metric,
    displayName: def.displayName,
    unit: def.unit,
    value: v,
    tier,
    source,
    resultDate: source === "staged" ? resultDate : null,
    readingId,
    verification: source === "staged" ? "unverified-import" : "patient-entered",
    withinWindow,
    takeover: withinWindow, // manual → true; staged → only inside the 14-day window
    tableVersion: TRIPWIRE_TABLE_VERSION,
  };
}

export { EMERGENCY, TODAY };
