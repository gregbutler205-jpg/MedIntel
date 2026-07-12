// ── A-06 / PG-06: condition-module loader ────────────────────────────────────
// Deterministic selection over src/prompts/modules/ (INSINA_AI_PROMPTS.md §5).
// Replaces hardcoded, single-patient reference content with reviewable,
// versioned modules that only apply when the record actually warrants them.
import MOD_IMMUNOSUPPRESSION from "../prompts/modules/MOD-IMMUNOSUPPRESSION.js";

// Every authored module. Stubs listed in §5.6 (MOD-CKD, MOD-DIABETES, etc.)
// aren't authored yet — add them here once they exist.
const ALL_MODULES = [MOD_IMMUNOSUPPRESSION];

const ALLOW_UNREVIEWED_KEY = "mi_allow_unreviewed_modules";

function allowUnreviewed() {
  try { return localStorage.getItem(ALLOW_UNREVIEWED_KEY) === "true"; } catch { return false; }
}

function anyMatch(patterns, text) {
  return (patterns || []).some(p => p.test(text));
}

/**
 * Select modules whose applies_when matches conditionsActive or the classes
 * of medicationsActive (§5.3). Excludes any module with reviewed_by === null
 * unless mi_allow_unreviewed_modules is set locally — per spec, `reviewed_by`
 * must be non-null before a module reaches a pilot (non-founder) user; this
 * flag is how a founder previews unreviewed content on their own device
 * without it ever reaching anyone else. Capped at 4, most relevant first: a
 * match against a listed condition ranks above a medication-only match,
 * since a diagnosis is stronger evidence of applicability than a drug that
 * may have other uses.
 */
export function selectConditionModules(conditionsActive = [], medicationsActive = []) {
  const allowUnrev = allowUnreviewed();
  const condText = (conditionsActive || []).map(c => c?.name || "").join(" | ");

  return ALL_MODULES
    .filter(mod => allowUnrev || mod.reviewed_by != null)
    .map(mod => {
      const condHit = anyMatch(mod.applies_when.conditions_any, condText);
      const medHit = (medicationsActive || []).some(m =>
        anyMatch(mod.applies_when.med_classes_any, `${m?.name || ""} ${m?.category || ""}`)
      );
      return { mod, condHit, medHit };
    })
    .filter(({ condHit, medHit }) => condHit || medHit)
    .sort((a, b) => Number(b.condHit) - Number(a.condHit) || Number(b.medHit) - Number(a.medHit))
    .slice(0, 4)
    .map(({ mod }) => mod);
}

/** Format matched modules under the CONDITION REFERENCE header (§5.3 step 2). */
export function formatConditionModules(modules) {
  if (!modules || !modules.length) return "";
  const header = `CONDITION REFERENCE (ATTRIBUTED GUIDANCE)
The following is standard reference guidance selected because it matches
conditions or medications in this patient's record. Convey it only as
attributed guidance per rule 3, and only where the record supports its
relevance.`;
  const body = modules.map(mod => `Source: Insina module ${mod.id} v${mod.version}.
Medication cautions:
${mod.content.medication_cautions}
Food and supplements:
${mod.content.food_and_supplements}
Monitoring norms:
${mod.content.monitoring_norms}
Procedure flags:
${mod.content.procedure_flags}`).join("\n\n");
  return `${header}\n\n${body}`;
}
