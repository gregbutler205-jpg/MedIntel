// ── Duplicate and conflict handling (ONBOARDING_SPEC v1.1 §5.3) ──────────────
// Deterministic, no AI. Normalization first: drug names resolve to the
// bundled list's ingredient level; conditions lowercase/trim through a small
// synonym map. Match rule: same ingredient + same strength → duplicate
// candidate; same ingredient + different strength or frequency → conflict
// candidate. Labs: same test + same collected_date + same value auto-collapse
// silently; same test/date with a different value surfaces as a conflict.

import DRUGS from "../data/drugList.js";

const norm = s => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();

/** Resolve any drug name or brand to the bundled list's ingredient name. */
export function normalizeDrugName(name) {
  const n = norm(name);
  if (!n) return n;
  for (const d of DRUGS) {
    if (norm(d.name) === n) return d.name;
    const brands = d.brand.split("/").map(b => norm(b.replace(/\(.*?\)/g, "")));
    if (brands.some(b => b && (b === n || n === b))) return d.name;
  }
  // partial: "tacrolimus 1 mg" or brand-with-suffix still resolves
  for (const d of DRUGS) {
    if (n.startsWith(norm(d.name))) return d.name;
    const brands = d.brand.split("/").map(b => norm(b.replace(/\(.*?\)/g, "")));
    if (brands.some(b => b && n.startsWith(b))) return d.name;
  }
  return n;
}

export const CONDITION_SYNONYMS = {
  "htn": "hypertension",
  "high blood pressure": "hypertension",
  "dm": "diabetes mellitus",
  "dm2": "type 2 diabetes",
  "t2dm": "type 2 diabetes",
  "diabetes type 2": "type 2 diabetes",
  "ptdm": "post-transplant diabetes mellitus",
  "hld": "hyperlipidemia",
  "high cholesterol": "hyperlipidemia",
  "ckd": "chronic kidney disease",
  "gerd": "gastroesophageal reflux disease",
  "afib": "atrial fibrillation",
  "a-fib": "atrial fibrillation",
  "copd": "chronic obstructive pulmonary disease",
  "cad": "coronary artery disease",
  "chf": "congestive heart failure",
  "psc": "primary sclerosing cholangitis",
  "nash": "nonalcoholic steatohepatitis",
  "esld": "end-stage liver disease",
  "uti": "urinary tract infection",
  "osa": "obstructive sleep apnea",
};

export function normalizeConditionName(name) {
  const n = norm(name);
  return CONDITION_SYNONYMS[n] || n;
}

const normStrength = s => norm(s).replace(/\s/g, "");
const normFreq = f => {
  const n = norm(f);
  const map = {
    "qd": "qd", "once daily": "qd", "daily": "qd", "every day": "qd",
    "bid": "bid", "twice daily": "bid",
    "tid": "tid", "three times daily": "tid",
    "qid": "qid", "four times daily": "qid",
    "prn": "prn", "as needed": "prn",
    "weekly": "weekly", "once weekly": "weekly",
  };
  return map[n] || n;
};

/**
 * §5.3 medication match against an existing entry (record med or another
 * staged med). Both sides accept {name, strength, frequency} shapes.
 * @returns {"duplicate"|"conflict"|null}
 */
export function medMatch(staged, existing) {
  const a = normalizeDrugName(staged.name);
  const b = normalizeDrugName(existing.name);
  if (!a || a !== b) return null;
  const sameStrength = normStrength(staged.strength || staged.dose) === normStrength(existing.strength || existing.dose);
  const sameFreq = normFreq(staged.frequency) === normFreq(existing.frequency);
  if (sameStrength && sameFreq) return "duplicate";
  return "conflict";
}

export function conditionMatch(staged, existing) {
  return normalizeConditionName(staged.name) === normalizeConditionName(existing.name) ? "duplicate" : null;
}

/**
 * Find the first duplicate/conflict candidate for a staged item.
 * @param {object} item - staged item {category, fields}
 * @param {object[]} recordEntries - existing record entries for the category
 *   (meds: mi_meds_full shape; conditions: mi_conditions shape)
 * @param {object[]} otherStaged - other staged items in the same category
 * @returns {{type: "duplicate"|"conflict", source: "record"|"staged", against: object} | null}
 */
export function findMatchCandidate(item, recordEntries = [], otherStaged = []) {
  if (item.category === "medication") {
    for (const e of recordEntries) {
      const t = medMatch(item.fields, e);
      if (t) return { type: t, source: "record", against: e };
    }
    for (const s of otherStaged) {
      if (s.id === item.id) continue;
      const t = medMatch(item.fields, s.fields);
      if (t) return { type: t, source: "staged", against: s };
    }
    return null;
  }
  if (item.category === "condition") {
    for (const e of recordEntries) {
      if (conditionMatch(item.fields, e)) return { type: "duplicate", source: "record", against: e };
    }
    for (const s of otherStaged) {
      if (s.id === item.id) continue;
      if (conditionMatch(item.fields, s.fields)) return { type: "duplicate", source: "staged", against: s };
    }
    return null;
  }
  return null;
}

const labKey = f => `${norm(f.test)}|${f.collected_date || ""}`;

/**
 * §5.3 labs: exact duplicates (test+date+value) collapse silently — against
 * the existing record and within the staged set; near-duplicates (same
 * test+date, different value) are conflicts.
 * @returns {{collapse: string[], conflicts: Map<string, object>}} item ids to
 *   auto-collapse, and staged-item id → the entry it conflicts with.
 */
export function analyzeLabs(stagedLabs, existingLabs = []) {
  const collapse = [];
  const conflicts = new Map();
  const existingByKey = new Map();
  existingLabs.forEach(l => existingByKey.set(`${norm(l.name)}|${l.date || ""}`, l));
  const seenStaged = new Map();
  for (const item of stagedLabs) {
    const key = labKey(item.fields);
    const value = norm(item.fields.value);
    const existing = existingByKey.get(key);
    if (existing) {
      if (norm(existing.value) === value) { collapse.push(item.id); continue; }
      conflicts.set(item.id, { source: "record", against: existing });
      continue;
    }
    const prior = seenStaged.get(key);
    if (prior) {
      if (norm(prior.fields.value) === value) { collapse.push(item.id); continue; }
      conflicts.set(item.id, { source: "staged", against: prior });
      continue;
    }
    seenStaged.set(key, item);
  }
  return { collapse, conflicts };
}
