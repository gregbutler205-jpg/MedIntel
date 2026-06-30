// ── RIE · Medical Dictionary ─────────────────────────────────────────────────
// A controlled vocabulary that flags likely misspellings with a suggested
// correction. It NEVER auto-corrects — every suggestion is confirmed by the
// patient in the Review Queue. Seeded on first use from the patient's own record
// plus a curated base list of commonly misspelled medical terms.
//
// Phase 1: no external API. RxNorm/SNOMED validation is a Phase 2 enhancement.

const LEARNED_KEY = "mi_rie_dictionary_learned"; // synced via Drive (mi_ prefix)

// ── Curated base vocabulary ───────────────────────────────────────────────────
// Common patient-record misspellings → canonical form. Confirm-before-correct.
export const BASE_MISSPELLINGS = {
  trazedone: "Trazodone", trazadone: "Trazodone",
  tacrolimas: "Tacrolimus", tacrolymus: "Tacrolimus", tacrolimous: "Tacrolimus",
  mycophenalate: "Mycophenolate", mycophenolate_mofetil: "Mycophenolate Mofetil",
  prednisolone_: "Prednisone", prednison: "Prednisone",
  furosemyde: "Furosemide", lasex: "Lasix",
  amlodipne: "Amlodipine", metoprolol_: "Metoprolol", metaprolol: "Metoprolol",
  atorvastain: "Atorvastatin", atorvastatine: "Atorvastatin",
  pantoprozole: "Pantoprazole", pantaprazole: "Pantoprazole",
  alprazolm: "Alprazolam", colchecine: "Colchicine", colchicene: "Colchicine",
  magnesum: "Magnesium", ursodiol_: "Ursodiol", valganciclovr: "Valganciclovir",
  bactrum: "Bactrim", mounjarro: "Mounjaro", tirzepatide_: "Tirzepatide",
  sertaline: "Sertraline", zoloft_: "Zoloft", ondansetron_: "Ondansetron",
  // conditions / terms
  cirosis: "Cirrhosis", cirrosis: "Cirrhosis",
  cholangitis_: "Cholangitis", immunosupression: "Immunosuppression",
  neuropthy: "Neuropathy", hypertention: "Hypertension",
  diabetis: "Diabetes", arthritus: "Arthritis", arthrits: "Arthritis",
  // general clinical free-text
  vist: "Visit", patinet: "Patient", discusssed: "Discussed",
  surrgery: "Surgery", folowup: "Follow-up", severr: "Severe",
  recieved: "Received", reciept: "Receipt", apointment: "Appointment",
};

// Recognized medical abbreviations — never flagged as misspellings.
export const ABBREVIATIONS = new Set([
  "bid","tid","qid","qd","qhs","prn","po","iv","im","sq","sc","ac","pc","hs",
  "egfr","gfr","alt","ast","alp","alk","ggt","inr","ptt","cbc","bmp","cmp",
  "wbc","rbc","hgb","hct","mcv","plt","bun","tsh","hba1c","a1c","ldl","hdl",
  "bp","hr","spo2","o2","bmi","ekg","ecg","mri","ct","prn","cmv","ebv","hsv",
  "ldlt","fk506","prograf","cellcept","mg","ml","mcg","ng","dl","meq",
]);

// Brand ↔ generic pairs for duplicate-medication detection.
export const BRAND_GENERIC = {
  prograf: "tacrolimus", tacrolimus: "tacrolimus",
  cellcept: "mycophenolate", mycophenolate: "mycophenolate",
  lasix: "furosemide", furosemide: "furosemide",
  norvasc: "amlodipine", amlodipine: "amlodipine",
  lipitor: "atorvastatin", atorvastatin: "atorvastatin",
  protonix: "pantoprazole", pantoprazole: "pantoprazole",
  zoloft: "sertraline", sertraline: "sertraline",
  xanax: "alprazolam", alprazolam: "alprazolam",
  bactrim: "sulfamethoxazole-trimethoprim", "sulfamethoxazole-trimethoprim": "sulfamethoxazole-trimethoprim",
  mounjaro: "tirzepatide", tirzepatide: "tirzepatide",
  valcyte: "valganciclovir", valganciclovir: "valganciclovir",
  actigall: "ursodiol", ursodiol: "ursodiol",
  desyrel: "trazodone", trazodone: "trazodone",
  zofran: "ondansetron", ondansetron: "ondansetron",
};

// Lab name synonyms — same test under different names.
export const LAB_SYNONYMS = {
  "fk506 level": "tacrolimus", "tacrolimus level": "tacrolimus", "tacrolimus": "tacrolimus",
  "egfr": "egfr", "estimated gfr": "egfr", "glomerular filtration rate": "egfr",
  "alt": "alt", "sgpt": "alt", "ast": "ast", "sgot": "ast",
};

// Allergy → conflicting drug ingredients (for allergy-vs-active-med checks).
export const ALLERGY_CONFLICTS = {
  sulfa: ["sulfamethoxazole","bactrim","trimethoprim"],
  "sulfa drugs": ["sulfamethoxazole","bactrim","trimethoprim"],
  penicillin: ["penicillin","amoxicillin","ampicillin","augmentin"],
  aspirin: ["aspirin","asa"],
  nsaid: ["ibuprofen","naproxen","ketorolac","aspirin"],
  statin: ["atorvastatin","simvastatin","rosuvastatin","pravastatin"],
};

// ── String similarity ─────────────────────────────────────────────────────────
export function levenshtein(a, b) {
  a = a || ""; b = b || "";
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => i);
  for (let j = 1; j <= n; j++) {
    let prev = dp[0]; dp[0] = j;
    for (let i = 1; i <= m; i++) {
      const tmp = dp[i];
      dp[i] = Math.min(dp[i] + 1, dp[i - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[m];
}
export function similarity(a, b) {
  a = (a || "").toLowerCase().trim(); b = (b || "").toLowerCase().trim();
  if (!a && !b) return 1;
  const d = levenshtein(a, b);
  return 1 - d / Math.max(a.length, b.length);
}

const safe = (k) => { try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch { return []; } };

// ── Seed canonical vocabulary from the patient's own record ──────────────────
export function seedCanonical() {
  const domains = { medication: new Set(), condition: new Set(), lab: new Set(), provider: new Set(), facility: new Set() };
  safe("mi_meds_full").forEach(m => { if (m.name) domains.medication.add(m.name.trim()); if (m.brand) domains.medication.add(m.brand.trim()); });
  safe("mi_conditions").forEach(c => { if (c.name) domains.condition.add(c.name.trim()); });
  safe("mi_labs").forEach(l => { if (l.name) domains.lab.add(l.name.trim()); });
  safe("mi_care_team").forEach(p => { if (p.name) domains.provider.add(p.name.trim()); if (p.facility) domains.facility.add(p.facility.trim()); });
  safe("mi_appointments").forEach(a => { if (a.facility) domains.facility.add(a.facility.trim()); });
  safe("mi_surgeries").forEach(s => { if (s.facility) domains.facility.add(s.facility.trim()); });
  // learned corrections reinforce the canonical set
  try {
    const learned = JSON.parse(localStorage.getItem(LEARNED_KEY) || "{}");
    Object.values(learned).forEach(v => v?.canonical && domains.medication.add(v.canonical));
  } catch {}
  return {
    medication: [...domains.medication],
    condition: [...domains.condition],
    lab: [...domains.lab],
    provider: [...domains.provider],
    facility: [...domains.facility],
  };
}

const cleanTok = (t) => String(t || "").toLowerCase().replace(/[^a-z0-9-]/g, "");

/**
 * Suggest a correction for `term` within a domain.
 * Returns the canonical string if a confident near-match exists, else null.
 * Never returns the same value (exact matches produce no suggestion).
 */
export function suggest(term, canonicalList = []) {
  const raw = String(term || "").trim();
  if (!raw || raw.length < 3) return null;
  const tok = cleanTok(raw);
  if (ABBREVIATIONS.has(tok)) return null;

  // 1) explicit base-misspelling map
  if (BASE_MISSPELLINGS[tok] && BASE_MISSPELLINGS[tok].toLowerCase() !== raw.toLowerCase()) {
    return BASE_MISSPELLINGS[tok];
  }
  // 2) fuzzy against the canonical list (own record + learned)
  let best = null, bestSim = 0;
  for (const cand of canonicalList) {
    const sim = similarity(raw, cand);
    if (sim > bestSim) { bestSim = sim; best = cand; }
  }
  // exact (or case-only) match → no suggestion. Close-but-not-exact → suggest.
  if (best && bestSim >= 0.85 && best.toLowerCase().trim() !== raw.toLowerCase().trim()) {
    return best;
  }
  return null;
}

// Reinforce a confirmed correction as canonical.
export function reinforce(original, canonical) {
  try {
    const learned = JSON.parse(localStorage.getItem(LEARNED_KEY) || "{}");
    learned[cleanTok(original)] = { canonical, at: new Date().toISOString() };
    localStorage.setItem(LEARNED_KEY, JSON.stringify(learned));
  } catch {}
}

export function genericOf(name) {
  return BRAND_GENERIC[cleanTok(name)] || cleanTok(name);
}
export function labKeyOf(name) {
  const k = String(name || "").toLowerCase().trim();
  return LAB_SYNONYMS[k] || k;
}
