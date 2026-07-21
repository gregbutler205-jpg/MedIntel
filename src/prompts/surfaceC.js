// ── Surface C: Note summary (Tab 10) ─────────────────────────────────────────
// INSINA_AI_PROMPTS.md §7, Surface C.
import { assembleSystem } from "./core.js";

export const PROMPT_VERSION = "C-1.1"; // 1.1: QUESTION GENERATION / WHY YOU'RE ASKING rules (2026-07-21 work order)

const DELTA = `TASK
Summarize this note in plain language, under 250 words. Surface: the
main points, anything time-sensitive the patient wrote, open questions
the note implies, and suggested questions for the care team drawn from
the note's content — one umbrella question per topic, per the QUESTION
GENERATION rules, with the WHY YOU'RE ASKING section. If the note
mentions symptoms covered by rule 5, apply rule 5 first.`;

/** dataSections carries conditionsActive, medicationsActive, careTeam, appointmentsUpcoming. */
export function buildSurfaceC({ userId, age, sex, dataSections = "" }) {
  const system = assembleSystem({
    userId, age, sex,
    includeDisplayRules: true,
    includeRouting: true,
    includeQuestionRules: true,
    delta: DELTA + (dataSections ? `\n\n${dataSections}` : ""),
  });
  return { system, promptVersion: PROMPT_VERSION };
}
