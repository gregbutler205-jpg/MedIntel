// ── MOD-IMMUNOSUPPRESSION v1.0 ────────────────────────────────────────────────
// INSINA_AI_PROMPTS.md §5.5, worked example, copied verbatim (content fields
// are data, not code — do not paraphrase). PENDING CLINICAL REVIEW: reviewed_by
// stays null until a clinical reviewer signs off (PG-11); conditionModules.js's
// loader excludes any module with reviewed_by === null from selection unless
// the local-only mi_allow_unreviewed_modules flag is set, so this module is
// inert for every pilot user until it is reviewed.
export default {
  id: "MOD-IMMUNOSUPPRESSION",
  version: "1.0",
  reviewed_by: null,
  review_date: null,
  applies_when: {
    conditions_any: [
      /organ\s+transplant/i,
      /status\s+post\s+transplant/i,
      /\btransplant/i,
      /prophylactic\s+immunotherapy/i,
      /long[- ]term\s+immunosuppressant/i,
      /immunosuppress/i,
      /at\s+risk\s+for\s+opportunistic\s+infection/i,
      /opportunistic\s+infection/i,
    ],
    med_classes_any: [
      // calcineurin inhibitors
      /tacrolimus|prograf|fk[- ]?506/i,
      /cyclosporine|cyclosporin|neoral|gengraf|sandimmune/i,
      // antimetabolites
      /mycophenolate|cellcept|myfortic/i,
      /azathioprine|imuran/i,
      // mTOR inhibitors
      /sirolimus|rapamune/i,
      /everolimus|zortress|afinitor/i,
      // long-term systemic corticosteroids (name or category)
      /prednisone|prednisolone|methylprednisolone/i,
      /corticosteroid/i,
    ],
  },
  content: {
    medication_cautions: `- NSAIDs (ibuprofen, naproxen, and similar) are commonly contraindicated for people on calcineurin inhibitors because of combined kidney stress; standard guidance is to confirm any pain reliever choice with the care team before use.
- Several antibiotic classes, commonly macrolides such as clarithromycin and erythromycin, and rifampin, are known to significantly raise or lower calcineurin and mTOR inhibitor levels. Standard guidance is that any new antibiotic prescription is confirmed with the prescribing team and the transplant or specialty team together.
- Azole antifungals commonly raise calcineurin and mTOR inhibitor levels; same confirmation guidance applies.
- St. John's Wort commonly lowers immunosuppressant levels and is generally advised against; supplement changes are worth raising with the care team.
- Live vaccines are generally avoided during immunosuppression; vaccination decisions are made with the care team.`,
    food_and_supplements: `- Grapefruit and pomelo commonly raise calcineurin and mTOR inhibitor levels and are generally advised against for people on those medications.
- Standard food-safety guidance for immunocompromised people includes avoiding raw or undercooked meat, seafood, and eggs, and unpasteurized dairy or juice.
- Herbal supplements interact unpredictably with immunosuppressants; standard guidance is to review any supplement with the care team first.`,
    monitoring_norms: `- Immunosuppressant blood levels are typically drawn as troughs, meaning timing relative to the last dose matters; care teams commonly give specific draw-time instructions.
- Many programs advise same-day contact with the care team for fever at or above 38.0 C (100.4 F) or other infection signs; the patient's own program may set its own threshold, which takes precedence.
- Long-term immunosuppression commonly carries elevated skin cancer risk; sun protection and periodic skin checks are commonly advised.`,
    procedure_flags: `- Standard guidance is that any proceduralist, including dentists, knows the patient's immunosuppression status before a procedure, and that antibiotic and pain-medication choices around procedures are confirmed with the specialty team.`,
  },
};
