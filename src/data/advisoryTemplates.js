// ── Tripwire advisory — advisory templates (v1.1.0) ──────────────────────────
// The EXACT patient-facing advisory strings. These are deterministic and
// versioned. The AI never authors, edits, suppresses, or reorders this text
// (CSC rule 4 / the deterministic-advisory decision) — this module imports
// nothing from the AI/prompt/proxy layer, and testAdvisory.mjs asserts both the
// verbatim strings (snapshot) and the no-AI-import property.
//
// v1.1.0 (2026-07-21 external-review disposition, DEC-043; supersedes the
// v1.0.0 work-order strings — a versioned decision, not an edit):
//   1. "outside the safe range" / "in the emergency range" → "meets Insina
//      Health's same-day alert threshold" / "meets Insina Health's emergency
//      threshold" (the app states ITS threshold fired; it does not certify
//      everything inside a range as safe).
//   2. Per-metric symptom sentences replace the one generic four-symptom line.
//      Lab sentences mirror the symptom clauses already in
//      tripwireDefaults.js guidance strings; vital sentences are NEW DRAFTS —
//      every sentence is DRAFT / REVIEW-REQUIRED in CLINICAL_REVIEW_MATRIX.md.
//   3. The no-coordinator TODAY fallback routes to the transplant program /
//      ordering clinician, then the ED — not a generic urgent-care clinic.
//   4. Emergency transportation wording: don't drive yourself with danger
//      symptoms.
//   5. Context-rich alert: value carries its unit, staged values carry the
//      result date, and a meta line states source + verification status.
//   6. Verify-first for staged/imported values (STAGED_VERIFY): the patient
//      confirms the OCR'd number against the original document BEFORE the
//      standard EMERGENCY/TODAY workflow fires.
//
// Placeholders: {metric} {value} {date_clause} {date} {coordinator_name}
// {coordinator_phone} {symptom_sentence}.

export const ADVISORY_TEMPLATES_VERSION = "1.1.0";

// Snapshot-tested character-for-character — do not reword. A wording change is
// a versioned decision, not an edit. ALL COPY DRAFT / REVIEW-REQUIRED (DEC-039).
export const TEMPLATES = {
  EMERGENCY_COORDINATOR:
    "Your {metric} reading of {value}{date_clause} meets Insina Health's emergency threshold. Call 911 now, or have someone take you to the nearest Emergency Department — do not drive yourself if you feel faint, confused, short of breath, or weak, or have chest pain. Notify your transplant coordinator: {coordinator_name}, {coordinator_phone}. Show your Emergency Card to EMS or ED staff.",
  EMERGENCY_NO_COORDINATOR:
    "Your {metric} reading of {value}{date_clause} meets Insina Health's emergency threshold. Call 911 now, or have someone take you to the nearest Emergency Department — do not drive yourself if you feel faint, confused, short of breath, or weak, or have chest pain. Show your Emergency Card to EMS or ED staff.",
  TODAY_COORDINATOR:
    "Your {metric} reading of {value}{date_clause} meets Insina Health's same-day alert threshold. Contact your transplant coordinator today: {coordinator_name}, {coordinator_phone}. {symptom_sentence}",
  TODAY_NO_COORDINATOR:
    "Your {metric} reading of {value}{date_clause} meets Insina Health's same-day alert threshold. Contact your transplant program's main or after-hours line, or the clinician who ordered this test, today. If you cannot reach a clinician promptly, go to the nearest Emergency Department. {symptom_sentence}",
  // Verify-first (DEC-043 item 3): shown INSTEAD of the advisory until the
  // patient confirms the imported number against the original document.
  STAGED_VERIFY:
    "The imported value appears to be {metric} {value}, from your document dated {date}. Verify it against the original report now.",
  // Appended to the advisory a staged value reaches only AFTER verification.
  // Keeps the DEC-039 proactive-contact clause.
  STAGED_VERIFIED_APPENDIX:
    "You verified this value against your imported document dated {date}. If you have not already discussed this result with your care team, contact them now.",
  // No-coordinator variants show this secondary line after the buttons.
  CARE_TEAM_PROMPT:
    "Add your care team so future alerts include direct contacts.",
};

// Per-metric danger-symptom sentences (DEC-043 item: replace the generic
// four-symptom line). Keyed by metric id (tripwireTable.js). Lab sentences
// mirror the guidance clauses in tripwireDefaults.js DEFAULT_LIBRARY; vital
// sentences are NEW DRAFTS pending the same clinical sign-off as the
// thresholds themselves — listed row-by-row in CLINICAL_REVIEW_MATRIX.md.
export const DEFAULT_SYMPTOM_SENTENCE =
  "If you develop dizziness, fainting, chest pain, or shortness of breath, call 911.";
export const METRIC_SYMPTOM_SENTENCES = {
  bp_s:       "If you develop weakness or numbness on one side, trouble speaking, vision changes, a severe headache, chest pain, or shortness of breath, call 911.",
  bp_d:       "If you develop weakness or numbness on one side, trouble speaking, vision changes, a severe headache, chest pain, or shortness of breath, call 911.",
  hr:         "If you develop chest pain, fainting, severe dizziness, or shortness of breath, call 911.",
  o2:         "If you develop severe shortness of breath, blue lips or face, confusion, or chest pain, call 911.",
  temp:       "If you develop confusion, a seizure, a stiff neck, difficulty breathing, or cannot be woken, call 911.",
  potassium:  "If you develop chest pain, palpitations, or severe weakness, call 911.",
  sodium:     "If you develop confusion, a severe headache, or a seizure, call 911.",
  glucose:    "If you develop confusion, vomiting, rapid or deep breathing, or a seizure, or you cannot keep fluids down, call 911.",
  hemoglobin: "If you develop chest pain, severe weakness, fainting, or active bleeding, call 911.",
  platelets:  "If you develop bleeding that won't stop, blood in your vomit or stool, or a sudden severe headache, call 911.",
};

function fill(str, vars) {
  return str.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));
}

/** "6.7 mEq/L" — the context-rich value string (unit optional). */
function valueWithUnit(value, unit) {
  return unit ? `${value} ${unit}` : String(value);
}

/**
 * Build the rendered advisory for a hit. Pure and deterministic.
 * @param {object} p
 * @param {"EMERGENCY"|"TODAY"} p.tier
 * @param {string} p.metricId  metric id (tripwireTable key) — selects the symptom sentence
 * @param {string} p.metric    display name, e.g. "systolic blood pressure"
 * @param {string|number} p.value
 * @param {string} [p.unit]
 * @param {{name:string, phone?:string}|null} p.coordinator
 * @param {{date:string}|null} [p.staged]  present for a staged value (in-window); the
 *   advisory this builds is the POST-VERIFICATION one (verify-first happens before it)
 * @param {"manual"|"staged"} [p.source="manual"]
 * @param {string} [p.verification]  audit-grade status for the meta line
 * @returns {{ paragraphs: string[], secondaryLine: string|null, metaLine: string }}
 */
export function buildAdvisory({ tier, metricId, metric, value, unit = "", coordinator, staged = null, source = "manual", verification = "" }) {
  const hasCoord = !!(coordinator && coordinator.name);
  const key = `${tier}_${hasCoord ? "COORDINATOR" : "NO_COORDINATOR"}`;
  const vars = {
    metric,
    value: valueWithUnit(value, unit),
    date_clause: staged?.date ? `, dated ${staged.date},` : "",
    date: staged?.date || "",
    coordinator_name: coordinator?.name || "",
    coordinator_phone: coordinator?.phone || "",
    symptom_sentence: METRIC_SYMPTOM_SENTENCES[metricId] || DEFAULT_SYMPTOM_SENTENCE,
  };
  const paragraphs = [fill(TEMPLATES[key], vars)];
  if (staged) paragraphs.push(fill(TEMPLATES.STAGED_VERIFIED_APPENDIX, vars));
  const sourceLabel = source === "staged" ? "imported document" : "entered manually";
  const verificationLabel =
    verification === "patient-verified" ? "verified against the original" :
    verification === "unverified-import" ? "not yet verified" :
    "patient-entered";
  return {
    paragraphs,
    secondaryLine: hasCoord ? null : TEMPLATES.CARE_TEAM_PROMPT,
    metaLine: `Source: ${sourceLabel} · ${verificationLabel}`,
  };
}

/**
 * Build the verify-first prompt for a staged value (DEC-043 item 3). Shown
 * INSTEAD of the advisory; only a patient confirmation lets the standard
 * EMERGENCY/TODAY workflow fire.
 */
export function buildStagedVerify({ metric, value, unit = "", date }) {
  return fill(TEMPLATES.STAGED_VERIFY, { metric, value: valueWithUnit(value, unit), date: date || "" });
}
