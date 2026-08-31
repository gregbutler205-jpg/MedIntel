// ── Condition suggestions from the record (v1.57.0) ──────────────────────────
// Greg: "For Conditions make Suggestions from Diagnostic Tests, Labs & Trends,
// Clinical Notes, and anywhere appropriate — like Calendar Sync."
//
// Deterministic TEXT-MENTION scan (founder decision 2026-08-30): a built-in
// dictionary of condition names + abbreviations is matched against text the
// patient already has in their record. No AI, no inference from lab VALUES —
// labs contribute only through the text of imported lab documents (a
// requisition that literally says "Dx: Essential hypertension"). The app
// organizes what's written; it never diagnoses.
//
// Calendar-sync-shaped lifecycle:
//   scan → suggestions (own store, NEVER mi_conditions — AI prompts, session
//   hashes, and prep matching read every mi_conditions row, so unconfirmed
//   suggestions must not live there) → patient Confirms (opens the normal Add
//   Condition modal; only Save writes mi_conditions) or Dismisses (tombstoned
//   so a rescan never re-suggests it).

const SUGGESTIONS_KEY = "mi_condition_suggestions";
const DISMISSED_KEY   = "mi_condition_dismissed";
const LAST_SCAN_KEY   = "mi_condsug_last_scan";
const DISMISSED_MAX   = 300;
const DOC_TEXT_CAP    = 30000; // chars scanned per source document

// ── Dictionary ────────────────────────────────────────────────────────────────
// Curated: common chronic conditions + liver-transplant-relevant diagnoses.
// Terms are matched case-insensitively on word boundaries; longer phrases win
// overlaps. Abbreviations are kept ≥3 chars and unambiguous on purpose (no
// "MS"/"PE"-style two-letter traps). Display name = how it enters Conditions.
export const CONDITION_DICTIONARY = [
  { id: "hypertension",       name: "Hypertension",                    terms: ["hypertension", "high blood pressure", "htn"] },
  { id: "portal-htn",         name: "Portal hypertension",             terms: ["portal hypertension"] },
  { id: "diabetes-2",         name: "Type 2 diabetes",                 terms: ["type 2 diabetes", "type ii diabetes", "diabetes mellitus type 2", "t2dm", "dm2", "diabetes type 2"] },
  { id: "diabetes-1",         name: "Type 1 diabetes",                 terms: ["type 1 diabetes", "type i diabetes", "t1dm", "diabetes type 1"] },
  { id: "diabetes",           name: "Diabetes mellitus",               terms: ["diabetes mellitus", "diabetes", "diabetic"] },
  { id: "prediabetes",        name: "Prediabetes",                     terms: ["prediabetes", "pre-diabetes", "impaired fasting glucose"] },
  { id: "hyperlipidemia",     name: "Hyperlipidemia",                  terms: ["hyperlipidemia", "dyslipidemia", "high cholesterol", "hypercholesterolemia"] },
  { id: "cirrhosis",          name: "Cirrhosis",                       terms: ["cirrhosis", "cirrhotic"] },
  { id: "nash",               name: "NASH / MASH (fatty liver)",       terms: ["nash", "mash", "steatohepatitis", "fatty liver", "hepatic steatosis", "nafld", "masld"] },
  { id: "esld",               name: "End-stage liver disease",         terms: ["end-stage liver disease", "end stage liver disease", "esld"] },
  { id: "hep-b",              name: "Hepatitis B",                     terms: ["hepatitis b", "hep b", "hbv"] },
  { id: "hep-c",              name: "Hepatitis C",                     terms: ["hepatitis c", "hep c", "hcv"] },
  { id: "autoimmune-hep",     name: "Autoimmune hepatitis",            terms: ["autoimmune hepatitis"] },
  { id: "hepatitis",          name: "Hepatitis",                       terms: ["hepatitis"] },
  { id: "hcc",                name: "Hepatocellular carcinoma",        terms: ["hepatocellular carcinoma", "hcc", "liver cancer"] },
  { id: "ascites",            name: "Ascites",                         terms: ["ascites"] },
  { id: "varices",            name: "Esophageal varices",              terms: ["esophageal varices", "varices"] },
  { id: "encephalopathy",     name: "Hepatic encephalopathy",          terms: ["hepatic encephalopathy", "encephalopathy"] },
  { id: "ckd",                name: "Chronic kidney disease",          terms: ["chronic kidney disease", "ckd", "chronic renal insufficiency", "renal insufficiency"] },
  { id: "esrd",               name: "End-stage renal disease",        terms: ["end-stage renal disease", "end stage renal disease", "esrd", "kidney failure"] },
  { id: "aki",                name: "Acute kidney injury",             terms: ["acute kidney injury", "aki"] },
  { id: "cad",                name: "Coronary artery disease",         terms: ["coronary artery disease", "cad", "coronary disease"] },
  { id: "chf",                name: "Heart failure",                   terms: ["heart failure", "chf", "cardiomyopathy"] },
  { id: "afib",               name: "Atrial fibrillation",             terms: ["atrial fibrillation", "afib", "a-fib"] },
  { id: "mi",                 name: "Myocardial infarction (heart attack)", terms: ["myocardial infarction", "heart attack", "stemi", "nstemi"] },
  { id: "stroke",             name: "Stroke / TIA",                    terms: ["stroke", "cerebrovascular accident", "transient ischemic attack", "tia"] },
  { id: "pvd",                name: "Peripheral vascular disease",     terms: ["peripheral vascular disease", "peripheral artery disease", "pvd", "pad"] },
  { id: "dvt",                name: "Deep vein thrombosis",            terms: ["deep vein thrombosis", "dvt", "venous thromboembolism"] },
  { id: "copd",               name: "COPD",                            terms: ["copd", "chronic obstructive pulmonary disease", "emphysema", "chronic bronchitis"] },
  { id: "asthma",             name: "Asthma",                          terms: ["asthma", "asthmatic"] },
  { id: "osa",                name: "Obstructive sleep apnea",         terms: ["sleep apnea", "obstructive sleep apnea", "osa"] },
  { id: "gerd",               name: "GERD (acid reflux)",              terms: ["gerd", "gastroesophageal reflux", "acid reflux", "reflux disease"] },
  { id: "ibs",                name: "Irritable bowel syndrome",        terms: ["irritable bowel syndrome", "ibs"] },
  { id: "ibd",                name: "Inflammatory bowel disease",      terms: ["crohn's disease", "crohns disease", "ulcerative colitis", "inflammatory bowel disease"] },
  { id: "diverticulosis",     name: "Diverticulosis / diverticulitis", terms: ["diverticulosis", "diverticulitis"] },
  { id: "pancreatitis",       name: "Pancreatitis",                    terms: ["pancreatitis"] },
  { id: "gallstones",         name: "Gallstones",                      terms: ["cholelithiasis", "gallstones"] },
  { id: "hypothyroid",        name: "Hypothyroidism",                  terms: ["hypothyroidism", "hypothyroid", "hashimoto"] },
  { id: "hyperthyroid",       name: "Hyperthyroidism",                 terms: ["hyperthyroidism", "hyperthyroid", "graves disease", "graves' disease"] },
  { id: "osteoporosis",       name: "Osteoporosis",                    terms: ["osteoporosis"] },
  { id: "osteopenia",         name: "Osteopenia",                      terms: ["osteopenia"] },
  { id: "osteoarthritis",     name: "Osteoarthritis",                  terms: ["osteoarthritis", "degenerative joint disease"] },
  { id: "rheumatoid",         name: "Rheumatoid arthritis",            terms: ["rheumatoid arthritis"] },
  { id: "arthritis",          name: "Arthritis",                       terms: ["arthritis"] },
  { id: "gout",               name: "Gout",                            terms: ["gout", "gouty arthropathy", "hyperuricemia"] },
  { id: "anemia",             name: "Anemia",                          terms: ["anemia", "anemic"] },
  { id: "thrombocytopenia",   name: "Thrombocytopenia",                terms: ["thrombocytopenia", "low platelets", "low platelet count"] },
  { id: "neutropenia",        name: "Neutropenia",                     terms: ["neutropenia"] },
  { id: "bph",                name: "Enlarged prostate (BPH)",         terms: ["benign prostatic hyperplasia", "bph", "enlarged prostate", "prostatic hypertrophy"] },
  { id: "prostate-ca",        name: "Prostate cancer",                 terms: ["prostate cancer", "prostatic carcinoma", "prostate carcinoma"] },
  { id: "skin-ca",            name: "Skin cancer",                     terms: ["skin cancer", "basal cell carcinoma", "squamous cell carcinoma", "melanoma"] },
  { id: "colon-ca",           name: "Colon cancer",                    terms: ["colon cancer", "colorectal cancer"] },
  { id: "depression",         name: "Depression",                      terms: ["depression", "major depressive disorder", "depressive disorder"] },
  { id: "anxiety",            name: "Anxiety",                         terms: ["anxiety disorder", "generalized anxiety", "anxiety"] },
  { id: "insomnia",           name: "Insomnia",                        terms: ["insomnia"] },
  { id: "neuropathy",         name: "Neuropathy",                      terms: ["neuropathy", "peripheral neuropathy", "neuropathic pain"] },
  { id: "migraine",           name: "Migraine",                        terms: ["migraine"] },
  { id: "seizure",            name: "Seizure disorder",                terms: ["seizure disorder", "epilepsy", "seizures"] },
  { id: "obesity",            name: "Obesity",                         terms: ["obesity", "morbid obesity", "obese"] },
  { id: "malnutrition",       name: "Malnutrition",                    terms: ["malnutrition", "protein-calorie malnutrition"] },
  { id: "vitd-def",           name: "Vitamin D deficiency",            terms: ["vitamin d deficiency", "vitamin d insufficiency"] },
  { id: "iron-def",           name: "Iron deficiency",                 terms: ["iron deficiency"] },
  { id: "b12-def",            name: "Vitamin B12 deficiency",          terms: ["b12 deficiency", "vitamin b12 deficiency"] },
  { id: "hernia",             name: "Hernia",                          terms: ["ventral hernia", "inguinal hernia", "umbilical hernia", "hiatal hernia", "incisional hernia"] },
  { id: "cataracts",          name: "Cataracts",                       terms: ["cataract", "cataracts"] },
  { id: "glaucoma",           name: "Glaucoma",                        terms: ["glaucoma"] },
  { id: "hearing-loss",       name: "Hearing loss",                    terms: ["hearing loss"] },
  { id: "allergic-rhinitis",  name: "Allergic rhinitis",               terms: ["allergic rhinitis", "hay fever", "seasonal allergies"] },
  { id: "cmv",                name: "CMV infection",                   terms: ["cmv infection", "cytomegalovirus", "cmv viremia"] },
  { id: "ebv",                name: "EBV infection",                   terms: ["ebv infection", "epstein-barr", "ebv viremia"] },
  { id: "uti",                name: "Urinary tract infection",         terms: ["urinary tract infection", "uti"] },
  { id: "cdiff",              name: "C. diff infection",               terms: ["c. diff", "c diff", "clostridium difficile", "clostridioides difficile"] },
  { id: "rejection",          name: "Transplant rejection episode",    terms: ["acute rejection", "transplant rejection", "acute cellular rejection", "graft rejection"] },
  { id: "graft-dysfunction",  name: "Graft dysfunction",               terms: ["graft dysfunction", "graft failure"] },
  { id: "biliary-stricture",  name: "Biliary stricture",               terms: ["biliary stricture", "bile duct stricture", "anastomotic stricture"] },
  { id: "immunosuppression",  name: "Immunosuppressed status",         terms: ["immunosuppressed", "immunocompromised", "on immunosuppression"] },
];

// Phrases BEFORE a mention that mean the record is saying the patient does
// NOT (or may not) have it — or that someone else has it. A hit inside the
// look-back window kills the match. "History of X" is NOT here on purpose:
// a past condition belongs in the list (status can be set to Resolved).
const NEGATION_CUES = [
  "no evidence of", "no signs of", "no sign of", "negative for", "ruled out",
  "rule out", "rules out", "r/o", "without", "denies", "denied", "no", "not",
  "free of", "absence of", "resolved", "unlikely",
  "screening for", "screen for", "screened for", "risk of", "risk for",
  "at risk", "prevention", "prevent", "concern for possible",
  "family history of", "family hx of", "fh of", "mother", "father", "brother",
  "sister", "parent", "sibling",
];

const safeArr = (k) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : []; } catch { return []; } };

// ── Matching ──────────────────────────────────────────────────────────────────
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Look-back window: from the previous sentence boundary (max 70 chars). */
function negatedAt(text, idx) {
  let start = Math.max(0, idx - 70);
  const slice = text.slice(start, idx);
  const bound = Math.max(slice.lastIndexOf("."), slice.lastIndexOf(";"), slice.lastIndexOf("\n"), slice.lastIndexOf("•"));
  const window = slice.slice(bound + 1).toLowerCase();
  return NEGATION_CUES.some(cue => new RegExp(`(^|\\W)${escRe(cue)}(\\W|$)`).test(window));
}

function snippetAt(text, idx, len) {
  const from = Math.max(0, idx - 45);
  const to = Math.min(text.length, idx + len + 45);
  const s = text.slice(from, to).replace(/\s+/g, " ").trim();
  return `${from > 0 ? "…" : ""}${s}${to < text.length ? "…" : ""}`;
}

/**
 * All dictionary hits in one text. Longer terms win overlapping spans, so
 * "portal hypertension" doesn't also fire plain "hypertension" on the same
 * words. Returns [{condId, name, snippet}] — one hit per condition per text.
 */
export function matchConditionsInText(text) {
  if (!text) return [];
  const hay = String(text).slice(0, DOC_TEXT_CAP);
  const lower = hay.toLowerCase();
  const raw = [];
  for (const entry of CONDITION_DICTIONARY) {
    for (const term of entry.terms) {
      const re = new RegExp(`(^|[^a-z0-9])${escRe(term.toLowerCase())}($|[^a-z0-9])`, "g");
      let m;
      while ((m = re.exec(lower)) !== null) {
        const idx = m.index + m[1].length;
        raw.push({ condId: entry.id, name: entry.name, idx, len: term.length });
        re.lastIndex = idx + 1;
      }
    }
  }
  raw.sort((a, b) => b.len - a.len || a.idx - b.idx);
  const taken = [];
  const winners = [];
  for (const h of raw) {
    if (taken.some(t => h.idx < t.end && h.idx + h.len > t.start)) continue;
    taken.push({ start: h.idx, end: h.idx + h.len });
    if (negatedAt(hay, h.idx)) continue;
    winners.push(h);
  }
  const seen = new Set();
  const out = [];
  for (const h of winners.sort((a, b) => a.idx - b.idx)) {
    if (seen.has(h.condId)) continue;
    seen.add(h.condId);
    out.push({ condId: h.condId, name: h.name, snippet: snippetAt(hay, h.idx, h.len) });
  }
  return out;
}

// ── Sources ───────────────────────────────────────────────────────────────────
// Deliberately EXCLUDED from scan text: facility and provider names ("Diabetes
// Center of Mississippi" must not suggest diabetes), AI session transcripts
// (questions like "do I have diabetes?" would false-positive), and lab VALUES.
export function collectScanSources() {
  const out = [];
  for (const d of safeArr("mi_diagnostics")) {
    out.push({ store: "Diagnostics", refId: d.id, title: d.name || "Diagnostic study", date: d.date || "", text: [d.name, d.impression, d.relatedCondition].filter(Boolean).join(". ") });
  }
  for (const n of safeArr("mi_notes")) {
    const bodies = (n.sections || []).map(s => s.body || "").join("\n");
    out.push({ store: "My Notes", refId: n.id, title: n.title || "Note", date: n.date || "", text: [n.title, bodies].filter(Boolean).join("\n") });
  }
  for (const r of safeArr("mi_records")) {
    out.push({ store: "Medical Records", refId: r.id, title: r.title || "Record", date: r.date || "", text: [r.title, r.type, r.summary, r.notes].filter(Boolean).join(". ") });
  }
  for (const s of safeArr("mi_surgeries")) {
    out.push({ store: "Procedures", refId: s.id, title: s.procedure || s.name || "Procedure", date: s.date || "", text: [s.procedure || s.name, s.notes].filter(Boolean).join(". ") });
  }
  for (const doc of safeArr("mi_documents")) {
    out.push({ store: "Documents", refId: doc.id, title: doc.title || "Document", date: doc.date || "", text: [doc.title, doc.notes].filter(Boolean).join(". ") });
  }
  // Full text of imported source material — discharge summaries, lab PDFs,
  // clinic notes. This is how Labs & Trends contributes: the words on the lab
  // paperwork, never inference from the values.
  for (const rd of safeArr("mi_ref_docs")) {
    out.push({ store: "Source Documents", refId: rd.id, title: rd.name || "Source document", date: rd.studyDate || rd.addedDate || "", text: [rd.name, rd.text].filter(Boolean).join("\n") });
  }
  return out;
}

// ── Exclusions ────────────────────────────────────────────────────────────────
/** Dictionary ids already represented in mi_conditions (any status). */
export function existingConditionIds() {
  const ids = new Set();
  for (const c of safeArr("mi_conditions")) {
    const nm = (c.name || "").toLowerCase();
    if (!nm) continue;
    for (const entry of CONDITION_DICTIONARY) {
      if (entry.terms.some(t => nm.includes(t.toLowerCase())) || entry.name.toLowerCase() === nm) ids.add(entry.id);
    }
  }
  return ids;
}

export function readDismissed() { return safeArr(DISMISSED_KEY); }

export function dismissSuggestion(sug) {
  const list = readDismissed().filter(t => t.condId !== sug.condId);
  list.push({ condId: sug.condId, name: sug.name, ts: Date.now() });
  try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(list.slice(-DISMISSED_MAX))); } catch {}
  const remaining = readSuggestions().filter(s => s.condId !== sug.condId);
  writeSuggestions(remaining);
  return remaining;
}

/** Confirm housekeeping: drop the suggestion once the condition is saved. */
export function resolveSuggestion(condId) {
  const remaining = readSuggestions().filter(s => s.condId !== condId);
  writeSuggestions(remaining);
  return remaining;
}

// ── Store + scan ──────────────────────────────────────────────────────────────
export function readSuggestions() { return safeArr(SUGGESTIONS_KEY); }
export function writeSuggestions(list) { try { localStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(list)); } catch {} }

export function lastScanDay() { try { return localStorage.getItem(LAST_SCAN_KEY) || ""; } catch { return ""; } }
export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Full scan. Rebuilds the suggestion list from the current record (so
 * suggestions never outlive their evidence), minus existing conditions and
 * dismissals. Returns { suggestions, added } — added counts condition ids
 * that were not suggested before this scan (drives the landing notice).
 */
export function runConditionScan() {
  const before = new Set(readSuggestions().map(s => s.condId));
  const existing = existingConditionIds();
  const dismissed = new Set(readDismissed().map(t => t.condId));
  const byCond = new Map();
  for (const src of collectScanSources()) {
    for (const hit of matchConditionsInText(src.text)) {
      if (existing.has(hit.condId) || dismissed.has(hit.condId)) continue;
      if (!byCond.has(hit.condId)) byCond.set(hit.condId, { condId: hit.condId, name: hit.name, sources: [] });
      const bucket = byCond.get(hit.condId);
      if (bucket.sources.length < 8 && !bucket.sources.some(s => s.store === src.store && s.refId === src.refId)) {
        bucket.sources.push({ store: src.store, refId: src.refId, title: src.title, date: src.date, snippet: hit.snippet });
      }
    }
  }
  const suggestions = [...byCond.values()].sort((a, b) => b.sources.length - a.sources.length || a.name.localeCompare(b.name));
  writeSuggestions(suggestions);
  try { localStorage.setItem(LAST_SCAN_KEY, todayISO()); } catch {}
  const added = suggestions.filter(s => !before.has(s.condId)).length;
  return { suggestions, added };
}
