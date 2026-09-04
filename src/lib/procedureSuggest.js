// ── Procedure suggestions from the record (v1.59.0) ──────────────────────────
// Greg (2026-09-03): a CESI clinical note imported cleanly to Medical Records
// but nothing reached Procedures. Same shape as the Conditions flow (v1.57.0):
// a deterministic text-mention scan over Diagnostics, Notes, Medical Records,
// Documents, and the full text of imported documents surfaces procedures
// that are described in the record but missing from the Procedures list.
// Suggestions wait in their own store; Confirm opens the normal Add Procedure
// modal pre-filled with the name and the source document's date; Dismiss
// tombstones forever. Nothing enters mi_surgeries unreviewed.
//
// Extra guard beyond the shared cues: a procedure that is merely planned,
// recommended, scheduled, or under discussion is NOT history and is not
// suggested. "Underwent", "status post", "s/p", and "history of" are.
import { matchDictionaryInText, collectRecordSources, safeArr } from "./recordMentions.js";

const SUGGESTIONS_KEY = "mi_procedure_suggestions";
const DISMISSED_KEY   = "mi_procedure_dismissed";
const LAST_SCAN_KEY   = "mi_procsug_last_scan";
const DISMISSED_MAX   = 300;

// ── Dictionary ────────────────────────────────────────────────────────────────
// Transplant-relevant plus common procedures. Abbreviations ≥3 chars and
// unambiguous (no "ICD": it collides with ICD-10 codes; no "TIPS": a common
// word). Display name = how it enters Procedures.
export const PROCEDURE_DICTIONARY = [
  { id: "cesi",              name: "Cervical epidural steroid injection (CESI)", terms: ["cervical epidural steroid injection", "cesi", "cervical esi", "cervical epidural injection"] },
  { id: "lesi",              name: "Lumbar epidural steroid injection (LESI)",   terms: ["lumbar epidural steroid injection", "lesi", "lumbar esi", "lumbar epidural injection"] },
  { id: "esi",               name: "Epidural steroid injection",                terms: ["epidural steroid injection", "epidural injection", "transforaminal injection", "interlaminar injection"] },
  { id: "facet-injection",   name: "Facet joint injection",                     terms: ["facet injection", "facet joint injection", "medial branch block"] },
  { id: "nerve-block",       name: "Nerve block",                               terms: ["nerve block", "nerve root block"] },
  { id: "rfa",               name: "Radiofrequency ablation",                   terms: ["radiofrequency ablation", "rf ablation", "rhizotomy"] },
  { id: "joint-injection",   name: "Joint injection",                           terms: ["joint injection", "cortisone injection", "steroid injection of the", "trigger point injection"] },
  { id: "liver-transplant",  name: "Liver transplant",                          terms: ["liver transplant", "liver transplantation", "orthotopic liver transplant", "hepatic transplant"] },
  { id: "kidney-transplant", name: "Kidney transplant",                         terms: ["kidney transplant", "renal transplant", "kidney transplantation"] },
  { id: "liver-biopsy",      name: "Liver biopsy",                              terms: ["liver biopsy", "hepatic biopsy"] },
  { id: "marrow-biopsy",     name: "Bone marrow biopsy",                        terms: ["bone marrow biopsy", "bone marrow aspiration"] },
  { id: "prostate-biopsy",   name: "Prostate biopsy",                           terms: ["prostate biopsy"] },
  { id: "skin-biopsy",       name: "Skin biopsy",                               terms: ["skin biopsy", "punch biopsy", "shave biopsy"] },
  { id: "biopsy",            name: "Biopsy",                                    terms: ["biopsy"] },
  { id: "colonoscopy",       name: "Colonoscopy",                               terms: ["colonoscopy"] },
  { id: "polypectomy",       name: "Polypectomy",                               terms: ["polypectomy"] },
  { id: "egd",               name: "Upper endoscopy (EGD)",                     terms: ["upper endoscopy", "esophagogastroduodenoscopy", "egd"] },
  { id: "ercp",              name: "ERCP",                                      terms: ["ercp", "endoscopic retrograde cholangiopancreatography"] },
  { id: "sphincterotomy",    name: "Biliary sphincterotomy",                    terms: ["sphincterotomy"] },
  { id: "biliary-stent",     name: "Biliary stent placement",                   terms: ["biliary stent", "bile duct stent"] },
  { id: "banding",           name: "Variceal band ligation",                    terms: ["variceal banding", "band ligation", "variceal ligation"] },
  { id: "paracentesis",      name: "Paracentesis",                              terms: ["paracentesis"] },
  { id: "thoracentesis",     name: "Thoracentesis",                             terms: ["thoracentesis"] },
  { id: "tips-shunt",        name: "TIPS (portosystemic shunt)",                terms: ["transjugular intrahepatic portosystemic shunt", "tips procedure", "tips placement"] },
  { id: "cholecystectomy",   name: "Cholecystectomy (gallbladder removal)",     terms: ["cholecystectomy", "gallbladder removal"] },
  { id: "appendectomy",      name: "Appendectomy",                              terms: ["appendectomy"] },
  { id: "hernia-repair",     name: "Hernia repair",                             terms: ["hernia repair", "herniorrhaphy", "hernioplasty"] },
  { id: "colectomy",         name: "Colectomy",                                 terms: ["colectomy", "hemicolectomy"] },
  { id: "bariatric",         name: "Bariatric surgery",                         terms: ["gastric bypass", "sleeve gastrectomy", "bariatric surgery"] },
  { id: "cardiac-cath",      name: "Cardiac catheterization",                   terms: ["cardiac catheterization", "cardiac cath", "heart catheterization", "coronary angiography", "coronary angiogram"] },
  { id: "pci",               name: "Coronary angioplasty / stent (PCI)",        terms: ["angioplasty", "coronary stent", "percutaneous coronary intervention", "pci"] },
  { id: "cabg",              name: "Coronary artery bypass (CABG)",             terms: ["coronary artery bypass", "cabg", "bypass surgery"] },
  { id: "pacemaker",         name: "Pacemaker implantation",                    terms: ["pacemaker"] },
  { id: "defibrillator",     name: "Implantable defibrillator",                 terms: ["implantable cardioverter", "defibrillator implant", "defibrillator placement"] },
  { id: "cardiac-ablation",  name: "Cardiac ablation",                          terms: ["cardiac ablation", "catheter ablation", "afib ablation", "pulmonary vein isolation"] },
  { id: "endarterectomy",    name: "Carotid endarterectomy",                    terms: ["carotid endarterectomy"] },
  { id: "knee-replacement",  name: "Knee replacement",                          terms: ["knee replacement", "total knee arthroplasty", "knee arthroplasty"] },
  { id: "hip-replacement",   name: "Hip replacement",                           terms: ["hip replacement", "total hip arthroplasty", "hip arthroplasty"] },
  { id: "rotator-cuff",      name: "Rotator cuff repair",                       terms: ["rotator cuff repair"] },
  { id: "carpal-tunnel",     name: "Carpal tunnel release",                     terms: ["carpal tunnel release"] },
  { id: "spinal-fusion",     name: "Spinal fusion",                             terms: ["spinal fusion", "cervical fusion", "lumbar fusion", "acdf"] },
  { id: "laminectomy",       name: "Laminectomy",                               terms: ["laminectomy"] },
  { id: "discectomy",        name: "Discectomy",                                terms: ["discectomy", "microdiscectomy"] },
  { id: "kyphoplasty",       name: "Kyphoplasty",                               terms: ["kyphoplasty", "vertebroplasty"] },
  { id: "cataract",          name: "Cataract surgery",                          terms: ["cataract surgery", "cataract extraction", "phacoemulsification"] },
  { id: "mohs",              name: "Mohs surgery",                              terms: ["mohs"] },
  { id: "skin-excision",     name: "Skin lesion excision",                      terms: ["excision of", "lesion excision", "wide local excision"] },
  { id: "tonsillectomy",     name: "Tonsillectomy",                             terms: ["tonsillectomy"] },
  { id: "hysterectomy",      name: "Hysterectomy",                              terms: ["hysterectomy"] },
  { id: "mastectomy",        name: "Mastectomy",                                terms: ["mastectomy", "lumpectomy"] },
  { id: "thyroidectomy",     name: "Thyroidectomy",                             terms: ["thyroidectomy"] },
  { id: "turp",              name: "Prostate resection (TURP)",                 terms: ["turp", "transurethral resection of the prostate"] },
  { id: "cystoscopy",        name: "Cystoscopy",                                terms: ["cystoscopy"] },
  { id: "lithotripsy",       name: "Lithotripsy",                               terms: ["lithotripsy"] },
  { id: "bronchoscopy",      name: "Bronchoscopy",                              terms: ["bronchoscopy"] },
  { id: "port",              name: "Port placement",                            terms: ["port placement", "port-a-cath", "portacath", "mediport"] },
  { id: "picc",              name: "PICC line placement",                       terms: ["picc line", "picc placement"] },
  { id: "av-fistula",        name: "Dialysis access (AV fistula)",              terms: ["av fistula", "arteriovenous fistula", "dialysis access"] },
  { id: "central-line",      name: "Central line placement",                   terms: ["central line", "central venous catheter"] },
  { id: "transfusion",       name: "Blood transfusion",                         terms: ["blood transfusion", "transfused"] },
  { id: "c-section",         name: "Cesarean section",                          terms: ["cesarean", "c-section"] },
];

// A procedure that is only planned, recommended, scheduled, or discussed is
// not history. These join the shared negation/family cues.
export const PLANNED_CUES = [
  "scheduled", "schedule", "scheduling", "recommend", "recommended", "recommends",
  "recommendation", "consider", "considering", "plan for", "planned", "planning",
  "candidate for", "referral for", "refer for", "referred for", "discussed", "discuss",
  "may need", "will need", "might need", "possible", "if needed", "to be scheduled",
  "pending", "prior authorization", "awaiting", "consult for", "option of", "options include",
];

export function matchProceduresInText(text) {
  return matchDictionaryInText(text, PROCEDURE_DICTIONARY, { extraCues: PLANNED_CUES })
    .map(h => ({ procId: h.id, name: h.name, snippet: h.snippet }));
}

// ── Exclusions ────────────────────────────────────────────────────────────────
/** Dictionary ids already represented in Procedures: mi_surgeries plus Medical Records typed "Procedure" (shown there read-only). */
export function existingProcedureIds() {
  const ids = new Set();
  const names = [
    ...safeArr("mi_surgeries").map(s => s.procedure || s.name || ""),
    ...safeArr("mi_records").filter(r => r.type === "Procedure").map(r => r.title || ""),
  ].map(n => String(n).toLowerCase()).filter(Boolean);
  for (const nm of names) {
    for (const entry of PROCEDURE_DICTIONARY) {
      if (entry.terms.some(t => nm.includes(t.toLowerCase())) || entry.name.toLowerCase() === nm) ids.add(entry.id);
    }
  }
  return ids;
}

export function readProcedureDismissed() { return safeArr(DISMISSED_KEY); }

export function dismissProcedureSuggestion(sug) {
  const list = readProcedureDismissed().filter(t => t.procId !== sug.procId);
  list.push({ procId: sug.procId, name: sug.name, ts: Date.now() });
  try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(list.slice(-DISMISSED_MAX))); } catch {}
  const remaining = readProcedureSuggestions().filter(s => s.procId !== sug.procId);
  writeProcedureSuggestions(remaining);
  return remaining;
}

/** Confirm housekeeping: drop the suggestion once the procedure is saved. */
export function resolveProcedureSuggestion(procId) {
  const remaining = readProcedureSuggestions().filter(s => s.procId !== procId);
  writeProcedureSuggestions(remaining);
  return remaining;
}

// ── Store + scan ──────────────────────────────────────────────────────────────
export function readProcedureSuggestions() { return safeArr(SUGGESTIONS_KEY); }
export function writeProcedureSuggestions(list) { try { localStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(list)); } catch {} }

export function lastProcedureScanDay() { try { return localStorage.getItem(LAST_SCAN_KEY) || ""; } catch { return ""; } }
export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Full scan. Rebuilds the suggestion list from the current record (so a
 * suggestion never outlives its evidence), minus existing procedures and
 * dismissals. The Procedures store itself is not a source. Each suggestion
 * carries the date of the document that mentions it (the likely procedure
 * date; editable before saving) and its provenance.
 * Returns { suggestions, added } for the landing notice.
 */
export function runProcedureScan() {
  const before = new Set(readProcedureSuggestions().map(s => s.procId));
  const existing = existingProcedureIds();
  const dismissed = new Set(readProcedureDismissed().map(t => t.procId));
  const byProc = new Map();
  for (const src of collectRecordSources()) {
    if (src.store === "Procedures") continue;
    for (const hit of matchProceduresInText(src.text)) {
      if (existing.has(hit.procId) || dismissed.has(hit.procId)) continue;
      if (!byProc.has(hit.procId)) byProc.set(hit.procId, { procId: hit.procId, name: hit.name, date: "", sources: [] });
      const bucket = byProc.get(hit.procId);
      if (bucket.sources.length < 8 && !bucket.sources.some(s => s.store === src.store && s.refId === src.refId)) {
        bucket.sources.push({ store: src.store, refId: src.refId, title: src.title, date: src.date, snippet: hit.snippet });
      }
    }
  }
  const suggestions = [...byProc.values()].map(s => {
    const dated = s.sources.map(x => x.date).filter(Boolean).sort();
    return { ...s, date: dated.length ? dated[dated.length - 1] : "" };
  }).sort((a, b) => (b.date || "").localeCompare(a.date || "") || a.name.localeCompare(b.name));
  writeProcedureSuggestions(suggestions);
  try { localStorage.setItem(LAST_SCAN_KEY, todayISO()); } catch {}
  const added = suggestions.filter(s => !before.has(s.procId)).length;
  return { suggestions, added };
}
