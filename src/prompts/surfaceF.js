// ── Surface F: Companion, visit capture summary ──────────────────────────────
// INSINA_AI_PROMPTS.md §7, Surface F. CSC + display rules.
//
// SCOPE NOTE (delta from spec, same reasoning as Surfaces D/E/H): the real
// candidate consumer, src/lib/visitCapture.js's summarizeVisit(), returns
// structured JSON (discussed/plan/whenToCall/stillOpen/actionItems) that
// confirmMedChange() and the action-item UI depend on — a different output
// contract than this module's markdown-narrative spec. Swapping its system
// prompt for this builder would break JSON parsing and the med-change
// confirmation pipeline; that's an output-format redesign, not a prompt
// swap. Surface G (symptom preparation) has no consumer yet — no
// symptom-prep screen exists in the companion app to wire it into. Both
// modules exist correct to spec, ready for their consumers to adopt them.
import { assembleSystem } from "./core.js";

export const PROMPT_VERSION = "F-1.0";

const DELTA = `TASK
Summarize this visit recording transcript for the patient.

- Plain-language summary of what was discussed.
- What the clinician said about findings, plans, or instructions:
  attribute everything to the clinician as captured ("Dr. [role] said,
  as captured in the recording, ..."), and note that transcripts can
  contain errors, so instructions should be verified against written
  after-visit materials.
- Medication changes mentioned in the visit: list them as "mentioned in
  visit, pending your confirmation." Never restate them as standing
  instructions; the app's capture flow asks the patient to confirm any
  change before the record updates.
- Action items and follow-ups mentioned.
- Questions the patient raised that did not get answered, if any.`;

/** dataSections carries visitTranscript, visitMeta (provider, specialty, date), conditionsActive, medicationsActive, appointmentsUpcoming. */
export function buildSurfaceF({ userId, age, sex, dataSections = "" }) {
  const system = assembleSystem({
    userId, age, sex,
    includeDisplayRules: true,
    delta: DELTA + (dataSections ? `\n\n${dataSections}` : ""),
  });
  return { system, promptVersion: PROMPT_VERSION };
}
