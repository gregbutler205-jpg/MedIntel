// ── DEC-PNN pending: tripwire advisory — browser runtime glue ────────────────
// Ties the PURE engine (advisoryEngine.js) to the record and the UI. Everything
// with side effects (localStorage reads, event log, DOM events, the feature-flag
// gate) lives here so the engine and templates stay pure and testable.
//
// Firing dispatches a window CustomEvent "insina-advisory"; a single
// <AdvisoryModal/> mounted at the app root renders it. Client-side only — no
// network, no AI.

import { TRIPWIRE_ADVISORY_ENABLED } from "../config/advisoryConfig.js";
import { evaluateEntry } from "./advisoryEngine.js";
import { ADVISORY_VITAL_FIELDS } from "../data/tripwireTable.js";
import { buildAdvisory, ADVISORY_TEMPLATES_VERSION } from "../data/advisoryTemplates.js";
import { logAdvisoryEvent } from "./advisoryLog.js";

/**
 * The transplant coordinator for the advisory's direct-contact line. There is no
 * discrete coordinator record — it's the mi_care_team member with the coordinator
 * role (how onboarding Phase2Basics writes it). Requires BOTH a name and a phone;
 * without a callable number the advisory falls back to its no-coordinator variant
 * (the whole point of the line is a number to call in an emergency).
 */
export function getCoordinator() {
  let team = [];
  try { team = JSON.parse(localStorage.getItem("mi_care_team") || "[]"); } catch { return null; }
  if (!Array.isArray(team)) return null;
  const isCoord = (m) => /coordinator/i.test(String(m.role || "")) || /coordinator/i.test(String(m.specialty || ""));
  const m = team.find(x => isCoord(x) && x.name && x.phone);
  return m ? { name: m.name, phone: m.phone } : null;
}

const SEVERITY = { EMERGENCY: 2, TODAY: 1 };

/** Dispatch the takeover for one hit (logs the event, builds the text, opens the modal). */
function fire(hit) {
  const coordinator = getCoordinator();
  const advisory = buildAdvisory({
    tier: hit.tier,
    metric: hit.displayName,
    value: hit.value,
    coordinator,
    staged: hit.source === "staged" && hit.resultDate ? { date: hit.resultDate } : null,
  });
  const eventId = logAdvisoryEvent(hit, ADVISORY_TEMPLATES_VERSION);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("insina-advisory", {
      detail: { mode: hit.tier === "EMERGENCY" ? "emergency" : "today", hit, advisory, coordinator, eventId },
    }));
  }
  return eventId;
}

/**
 * Evaluate one value and, if the flag is on and it warrants a takeover, fire it.
 * Returns the hit (even when no takeover — a staged value outside the 14-day
 * window returns takeover:false so the caller can render the "historical critical
 * value" badge). Returns null when the flag is off or nothing crosses.
 */
export function evaluateAndFire(metric, value, context = {}) {
  if (!TRIPWIRE_ADVISORY_ENABLED) return null;
  const hit = evaluateEntry(metric, value, context);
  if (!hit) return null;
  if (hit.takeover) fire(hit);
  return hit;
}

/**
 * Evaluate every advisory-relevant vital field in a saved reading. Fires ONE
 * takeover — the single most severe — rather than stacking modals for a reading
 * that crosses several bounds. Returns all hits (for any staged badging).
 */
export function evaluateReadingAndFire(reading, context = {}) {
  if (!TRIPWIRE_ADVISORY_ENABLED || !reading) return [];
  const hits = [];
  for (const field of ADVISORY_VITAL_FIELDS) {
    if (reading[field] == null || reading[field] === "") continue;
    const hit = evaluateEntry(field, reading[field], context);
    if (hit) hits.push(hit);
  }
  const takeovers = hits.filter(h => h.takeover).sort((a, b) => SEVERITY[b.tier] - SEVERITY[a.tier]);
  if (takeovers.length) fire(takeovers[0]);
  return hits;
}

/** Open the Emergency Info screen manually (§5) — no triggering value, ignores the flag. */
export function openEmergencyInfo() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("insina-advisory", {
    detail: { mode: "info", coordinator: getCoordinator() },
  }));
}
