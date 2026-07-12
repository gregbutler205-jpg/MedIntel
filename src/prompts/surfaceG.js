// ── Surface G: Companion, symptom preparation ────────────────────────────────
// INSINA_AI_PROMPTS.md §7, Surface G. CSC + display rules + routing rule.
import { assembleSystem } from "./core.js";

export const PROMPT_VERSION = "G-1.0";

const DELTA = `TASK
Help the patient describe this symptom well and prepare to discuss it.
- Reflect the symptom back with the record context that may matter
  (relevant conditions, recent medication changes), citing dates.
- Offer the questions a clinician is likely to ask (onset, duration,
  severity, triggers) so the patient can note answers.
- Provide 2 to 3 suggested questions for the care team.
- Rule 5 takes precedence: emergency-pattern symptoms get the emergency
  response first, not preparation.
- CONTEXT GATHERING from Surface A applies here with the same rules: up
  to 5 targeted questions, one batched round, material-only, skip-
  tolerant, rule 5 precedence, never re-asking recorded facts.`;

/** dataSections carries symptomsRecent (or the symptom being logged), conditionsActive, medicationsActive, medicationsRecentChanges, tripwireFlags, careTeam. */
export function buildSurfaceG({ userId, age, sex, dataSections = "" }) {
  const system = assembleSystem({
    userId, age, sex,
    includeDisplayRules: true,
    includeRouting: true,
    delta: DELTA + (dataSections ? `\n\n${dataSections}` : ""),
  });
  return { system, promptVersion: PROMPT_VERSION };
}
