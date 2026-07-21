// ── Surface H: Report generation ──────────────────────────────────────────────
// (Consultation Prep, ED Packet, Patient Profile, Medication Report)
// INSINA_AI_PROMPTS.md §7, Surface H.
//
// Structural rule, binding wherever these reports generate: the safety-critical
// tables (identity block handled app-side, conditions, medications, allergies,
// recent labs, care team) are rendered DETERMINISTICALLY from record data by
// template code. The model's role is annotation only — it never generates,
// reorders, or fills those tables.
//
// SCOPE NOTE (delta from spec, same reasoning as Surfaces D/E): Tab14's
// current Consultation Prep has the model generate the ENTIRE prep as free
// text from a single prompt — there is no deterministic template that renders
// the data tables with the model only annotating [ANNOTATE] fields. Rebuilding
// Consultation Prep (and building the ED Packet / Medication Report / Patient
// Profile equivalents) to match this template-plus-annotation architecture is
// a feature redesign, not a prompt swap — out of A-09's scope as written. This
// module implements the annotation-only prompt exactly as specified, ready for
// when the deterministic-template rendering exists to call it.
import { assembleSystem } from "./core.js";

export const PROMPT_VERSION = "H-1.1"; // 1.1: QUESTION GENERATION / WHY YOU'RE ASKING rules (2026-07-21 work order)

const DELTA = `TASK
Write the annotation fields for this {reportType}. For each item marked
[ANNOTATE], add a 1 to 2 sentence plain-language note on its clinical
relevance for a {providerSpecialty} encounter, using attributed guidance
(rule 3) and the CONDITION REFERENCE material where it applies. Do not
add, remove, or alter any data row. Do not introduce facts not present
in the rendered data. Flagged values keep their flag guidance verbatim.
Every report carries the data-freshness stamp {lastSync} and the
standing footer: "Compiled by the patient from their own records using
Insina Health. Informational; verify against source records."`;

/**
 * @param {object} payload
 * @param {string} payload.reportType - "Consultation Prep" | "ED Packet" | "Patient Profile" | "Medication Report"
 * @param {string} [payload.providerSpecialty] - required for Consultation Prep
 * @param {string} [payload.dataSections] - the deterministically-rendered report data, conditionModules, tripwireFlags, customRanges
 */
export function buildSurfaceH({ userId, age, sex, reportType, providerSpecialty = "", dataSections = "" }) {
  const filledDelta = DELTA
    .replaceAll("{reportType}", reportType || "report")
    .replaceAll("{providerSpecialty}", providerSpecialty || "the relevant specialty");
  const system = assembleSystem({
    userId, age, sex,
    includeRouting: true,
    includeQuestionRules: true, // any care-team questions in a report follow the shared rules
    delta: filledDelta + (dataSections ? `\n\n${dataSections}` : ""),
  });
  return { system, promptVersion: PROMPT_VERSION };
}
