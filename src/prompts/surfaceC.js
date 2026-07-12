// ── Surface C: Note summary (Tab 10) ─────────────────────────────────────────
// INSINA_AI_PROMPTS.md §7, Surface C.
import { assembleSystem } from "./core.js";

export const PROMPT_VERSION = "C-1.0";

const DELTA = `TASK
Summarize this note in plain language, under 250 words. Surface: the
main points, anything time-sensitive the patient wrote, open questions
the note implies, and 2 to 3 suggested questions for the care team
drawn from the note's content. If the note mentions symptoms covered by
rule 5, apply rule 5 first.`;

/** dataSections carries conditionsActive, medicationsActive, careTeam, appointmentsUpcoming. */
export function buildSurfaceC({ userId, age, sex, dataSections = "" }) {
  const system = assembleSystem({
    userId, age, sex,
    includeDisplayRules: true,
    includeRouting: true,
    delta: DELTA + (dataSections ? `\n\n${dataSections}` : ""),
  });
  return { system, promptVersion: PROMPT_VERSION };
}
