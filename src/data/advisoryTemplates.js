// ── DEC-PNN pending: tripwire advisory — advisory templates (v1.0.0) ─────────
// The EXACT patient-facing advisory strings. These are deterministic and
// versioned. The AI never authors, edits, suppresses, or reorders this text
// (CSC rule 4 / the deterministic-advisory decision) — this module imports
// nothing from the AI/prompt/proxy layer, and testAdvisory.mjs asserts both the
// verbatim strings (snapshot) and the no-AI-import property.
//
// Placeholders: {metric} {value} {coordinator_name} {coordinator_phone} {date}.

export const ADVISORY_TEMPLATES_VERSION = "1.0.0";

// Verbatim per the work order. Snapshot-tested character-for-character — do not
// reword. A wording change is a versioned decision, not an edit.
export const TEMPLATES = {
  EMERGENCY_COORDINATOR:
    "Your {metric} reading of {value} is in the emergency range. Call 911 or go to the nearest Emergency Department now. Notify your transplant coordinator: {coordinator_name}, {coordinator_phone}. Show your Emergency Card to EMS or ED staff.",
  EMERGENCY_NO_COORDINATOR:
    "Your {metric} reading of {value} is in the emergency range. Call 911 or go to the nearest Emergency Department now. Show your Emergency Card to EMS or ED staff.",
  TODAY_COORDINATOR:
    "Your {metric} reading of {value} is outside the safe range. Contact your transplant coordinator today: {coordinator_name}, {coordinator_phone}. If you develop dizziness, fainting, chest pain, or shortness of breath, call 911.",
  TODAY_NO_COORDINATOR:
    "Your {metric} reading of {value} is outside the safe range. Contact your doctor or an urgent care clinic today. If you develop dizziness, fainting, chest pain, or shortness of breath, call 911.",
  STAGED_APPENDIX:
    "This value is from your imported document dated {date}. Verify it against the original report. If you have not already discussed this result with your care team, contact them now.",
  // No-coordinator variants show this secondary line after the buttons.
  CARE_TEAM_PROMPT:
    "Add your care team so future alerts include direct contacts.",
};

function fill(str, vars) {
  return str.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));
}

/**
 * Build the rendered advisory for a hit. Pure and deterministic.
 * @param {"EMERGENCY"|"TODAY"} tier
 * @param {string} metric   display name, e.g. "systolic blood pressure"
 * @param {string|number} value  the reading as shown, e.g. "85" or "85 mmHg"
 * @param {{name:string, phone?:string}|null} coordinator
 * @param {{date:string}|null} staged  present only for a staged value within the 14-day window
 * @returns {{ paragraphs: string[], secondaryLine: string|null }}
 */
export function buildAdvisory({ tier, metric, value, coordinator, staged = null }) {
  const hasCoord = !!(coordinator && coordinator.name);
  const key = `${tier}_${hasCoord ? "COORDINATOR" : "NO_COORDINATOR"}`;
  const vars = {
    metric,
    value,
    coordinator_name: coordinator?.name || "",
    coordinator_phone: coordinator?.phone || "",
    date: staged?.date || "",
  };
  const paragraphs = [fill(TEMPLATES[key], vars)];
  if (staged) paragraphs.push(fill(TEMPLATES.STAGED_APPENDIX, vars));
  return {
    paragraphs,
    secondaryLine: hasCoord ? null : TEMPLATES.CARE_TEAM_PROMPT,
  };
}
