// ── Surface B: Lab Analysis (Tab 05) ─────────────────────────────────────────
// INSINA_AI_PROMPTS.md §7, Surface B. Two prompts: B1 Full Analysis, B2 Q&A.
import { assembleSystem } from "./core.js";

export const PROMPT_VERSION = "B-1.1"; // 1.1: QUESTION GENERATION / WHY YOU'RE ASKING rules (2026-07-21 work order)

const B1_DELTA = `TASK
Review the lab digest and recent results. For each finding worth the
patient's attention, use this structure:

**[Analyte], [date]: [value] [unit]**
- What it measures, in one sentence.
- Where it sits: against the reference range, the provider-set range if
  one exists (mention both when both exist), and the trend across the
  digest values, citing dates.
- Context from the record: medications, conditions, or recent changes
  plausibly related; cite them. Label general knowledge as such.
- Status: if a TRIPWIRE FLAG covers this value, state it and repeat its
  guidance verbatim. If the flag envelope status is current and no flag
  covers it: "no flag raised by your thresholds" or "worth discussing
  with your care team at the next opportunity." If envelope status is
  stale or unavailable: "flag status unknown: the app's threshold check
  has not run on this result," and direct concerns to the care team.
- Suggested question for your care team, where one is warranted, per
  the QUESTION GENERATION rules.

Order findings: flagged first, then abnormal, then notable trends within
normal range. Say plainly when results look stable and unremarkable:
do not manufacture concern. If any suggested questions were produced,
consolidate them under "Questions for your care team:" followed by the
WHY YOU'RE ASKING section. Close with the Bottom line.`;

const B2_DELTA = `TASK
Answer the patient's question about the selected result(s), grounded in
the digest history for those analytes. Keep it focused: answer what was
asked, note the trend with dates, apply the flag rules, and offer one
suggested question if action might be warranted — per the QUESTION
GENERATION rules, with its WHY YOU'RE ASKING item. Ask at most one
clarifying question, and only if the request is ambiguous; this is a
quick-answer surface.`;

/** B1: Full Analysis. dataSections carries labDigest, labsWindow, conditionsActive, medicationsActive, medicationsRecentChanges, customRanges, tripwireFlags, conditionModules, lastSync. */
export function buildSurfaceB1({ userId, age, sex, dataSections = "", sessionContext = "" }) {
  const system = assembleSystem({
    userId, age, sex,
    includeDisplayRules: true,
    includeRouting: true,
    includeQuestionRules: true,
    delta: B1_DELTA + (dataSections ? `\n\n${dataSections}` : "") + (sessionContext ? `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━\nSESSION CONTEXT (patient-supplied, not record data)\n━━━━━━━━━━━━━━━━━━━━━━━━━\n${sessionContext}` : ""),
  });
  return { system, promptVersion: PROMPT_VERSION };
}

/** B2: Lab Q&A. dataSections carries selectedLabs, labDigest for those analytes, conditionsActive, medicationsActive, customRanges, tripwireFlags. */
export function buildSurfaceB2({ userId, age, sex, dataSections = "" }) {
  const system = assembleSystem({
    userId, age, sex,
    includeDisplayRules: true,
    includeRouting: true,
    includeQuestionRules: true,
    delta: B2_DELTA + (dataSections ? `\n\n${dataSections}` : ""),
  });
  return { system, promptVersion: PROMPT_VERSION };
}
