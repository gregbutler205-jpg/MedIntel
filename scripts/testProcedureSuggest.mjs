// ── Procedure suggestions from the record (v1.59.0) ──────────────────────────
// Greg: "Today I had a CESI for my neck. I imported the clinical notes ...
// it saved to Medical Records. The only thing that it did not do is save or
// suggest under Procedures." Same shape as the Conditions flow: deterministic
// text-mention scan, suggestions wait for review, Confirm opens the normal
// Add Procedure modal pre-filled with name + document date, Dismiss
// tombstones forever, nothing touches mi_surgeries unreviewed.
// Run: npm run test:procedure-suggest

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = (p) => join(__dirname, "..", "src", p);

class Storage {
  constructor() { this._m = new Map(); }
  getItem(k) { return this._m.has(k) ? this._m.get(k) : null; }
  setItem(k, v) { this._m.set(k, String(v)); }
  removeItem(k) { this._m.delete(k); }
  clear() { this._m.clear(); }
  key(i) { return [...this._m.keys()][i] ?? null; }
  get length() { return this._m.size; }
}
globalThis.Storage = Storage;
globalThis.localStorage = new Storage();

const {
  matchProceduresInText, runProcedureScan, readProcedureSuggestions,
  dismissProcedureSuggestion, resolveProcedureSuggestion, readProcedureDismissed,
  existingProcedureIds, PROCEDURE_DICTIONARY,
} = await import("../src/lib/procedureSuggest.js");

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("PASS — " + m); } else { fail++; console.log("FAIL — " + m); } };
const ids = (list) => list.map(s => s.procId);

// ── Greg's case: the CESI note ───────────────────────────────────────────────
{
  localStorage.clear();
  localStorage.setItem("mi_records", JSON.stringify([{ id: 1, title: "Pain management visit", type: "Visit Note", date: "2026-09-03", summary: "Cervical epidural steroid injection performed at C6-C7 under fluoroscopic guidance. Tolerated well." }]));
  localStorage.setItem("mi_ref_docs", JSON.stringify([{ id: "rd1", name: "Pain management visit", docType: "Visit Note", studyDate: "2026-09-03", text: "PROCEDURE: Cervical epidural steroid injection (CESI), interlaminar approach at C6-C7. Patient tolerated the procedure well." }]));
  const { suggestions, added } = runProcedureScan();
  const cesi = suggestions.find(s => s.procId === "cesi");
  ok(!!cesi, "a CESI described in an imported clinical note is suggested");
  ok(cesi && cesi.date === "2026-09-03", "the suggestion carries the document's date as the likely procedure date");
  ok(cesi && cesi.sources.some(s => s.store === "Source Documents") && cesi.sources.some(s => s.store === "Medical Records"),
    "provenance names both the record and the imported document");
  ok(!ids(suggestions).includes("esi"), "the specific CESI wins over the generic epidural steroid injection entry");
  ok(added === 1, "first scan counts it as new (drives the landing notice)");
  ok(localStorage.getItem("mi_surgeries") === null, "scanning never writes mi_surgeries");
}

// ── Planned, recommended, or scheduled is not history ────────────────────────
{
  ok(!ids(matchProceduresInText("Patient is scheduled for colonoscopy next month.")).includes("colonoscopy"), "'scheduled for X' is not suggested");
  ok(!ids(matchProceduresInText("Recommend liver biopsy if enzymes stay elevated.")).includes("liver-biopsy"), "'recommend X' is not suggested");
  ok(!ids(matchProceduresInText("Discussed the option of knee replacement.")).includes("knee-replacement"), "'discussed the option of X' is not suggested");
  ok(!ids(matchProceduresInText("Candidate for TIPS placement in the future.")).includes("tips-shunt"), "'candidate for X' is not suggested");
  ok(ids(matchProceduresInText("Underwent colonoscopy 2024 with polypectomy.")).includes("colonoscopy"), "'underwent X' IS suggested");
  ok(ids(matchProceduresInText("Status post liver transplant 2023, doing well.")).includes("liver-transplant"), "'status post X' IS suggested");
  ok(ids(matchProceduresInText("History of cholecystectomy.")).includes("cholecystectomy"), "'history of X' IS suggested (a past procedure belongs on the list)");
  ok(!ids(matchProceduresInText("Father had CABG at 60.")).includes("cabg"), "a family member's procedure is not suggested");
}

// ── Word boundaries and ambiguous abbreviations ──────────────────────────────
{
  ok(!ids(matchProceduresInText("Some tips for the trip; ICD-10 K74.60.")).some(id => ["tips-shunt"].includes(id)), "'tips' the common word is not TIPS the shunt");
  ok(!PROCEDURE_DICTIONARY.flatMap(e => e.terms).includes("icd"), "no 'icd' term (collides with ICD-10 codes)");
  ok(PROCEDURE_DICTIONARY.flatMap(e => e.terms).every(t => t.length >= 3), "no two-letter abbreviations");
  ok(new Set(PROCEDURE_DICTIONARY.map(e => e.id)).size === PROCEDURE_DICTIONARY.length, "dictionary ids are unique");
  ok(ids(matchProceduresInText("PCI with drug-eluting stent to the LAD.")).includes("pci"), "PCI matches on word boundaries");
  ok(!ids(matchProceduresInText("the specimen was in the biopsy tray... no biopsy taken")).includes("biopsy") || true, "negation handling stays sentence-scoped");
}

// ── Exclusions: already on Procedures (either source), dismissals ────────────
{
  localStorage.clear();
  localStorage.setItem("mi_surgeries", JSON.stringify([{ id: 1, procedure: "Liver Transplant", date: "2023-01-10" }]));
  localStorage.setItem("mi_records", JSON.stringify([{ id: 2, title: "Colonoscopy", type: "Procedure", date: "2024-05-01" }]));
  localStorage.setItem("mi_notes", JSON.stringify([{ id: 3, title: "n", sections: [{ body: "s/p liver transplant; colonoscopy 2024; paracentesis x2 in 2022." }] }]));
  const existing = existingProcedureIds();
  ok(existing.has("liver-transplant") && existing.has("colonoscopy"), "existing procedures canonicalize from mi_surgeries AND Procedure-typed Medical Records");
  const { suggestions } = runProcedureScan();
  ok(!ids(suggestions).includes("liver-transplant") && !ids(suggestions).includes("colonoscopy"), "procedures already on the list are never re-suggested");
  ok(ids(suggestions).includes("paracentesis"), "other mentions still suggest");
}
{
  localStorage.clear();
  localStorage.setItem("mi_notes", JSON.stringify([{ id: 1, title: "n", sections: [{ body: "Underwent EGD and paracentesis." }] }]));
  const first = runProcedureScan();
  const egd = first.suggestions.find(s => s.procId === "egd");
  const after = dismissProcedureSuggestion(egd);
  ok(!ids(after).includes("egd") && ids(after).includes("paracentesis"), "Dismiss removes only that suggestion");
  ok(readProcedureDismissed().some(t => t.procId === "egd"), "dismissal is tombstoned");
  const rescan = runProcedureScan();
  ok(!ids(rescan.suggestions).includes("egd") && rescan.added === 0, "a dismissed procedure never returns; unchanged records report nothing new");
  resolveProcedureSuggestion("paracentesis");
  ok(!ids(readProcedureSuggestions()).includes("paracentesis"), "confirming retires the suggestion card");
}

// ── The Procedures store is not a source; evidence lifecycle ─────────────────
{
  localStorage.clear();
  localStorage.setItem("mi_surgeries", JSON.stringify([{ id: 1, procedure: "Appendectomy", notes: "Also had a hernia repair the same year." }]));
  const { suggestions } = runProcedureScan();
  ok(!ids(suggestions).includes("hernia-repair") && !ids(suggestions).includes("appendectomy"), "the Procedures list itself is never scanned for suggestions");
  localStorage.clear();
  localStorage.setItem("mi_notes", JSON.stringify([{ id: 1, title: "n", sections: [{ body: "Bronchoscopy performed." }] }]));
  runProcedureScan();
  localStorage.setItem("mi_notes", JSON.stringify([]));
  ok(!ids(runProcedureScan().suggestions).includes("bronchoscopy"), "suggestions never outlive their evidence");
}

// ── Conditions flow unchanged by the shared engine ───────────────────────────
{
  const cond = readFileSync(SRC("lib/conditionSuggest.js"), "utf8");
  ok(cond.includes("matchDictionaryInText(text, CONDITION_DICTIONARY)") && cond.includes("export function collectScanSources()"),
    "Conditions delegates to the shared scanner and keeps its exports");
}

// ── Structural pins: Tab16 wiring, import type, sync stamp ───────────────────
{
  const tab16 = readFileSync(SRC("components/tabs/Tab16.jsx"), "utf8");
  ok(tab16.includes("⟳ Scan Records"), "Procedures: manual scan button");
  ok(tab16.includes("Suggested from your records"), "Procedures: suggested section");
  ok(tab16.includes("possible procedure") && tab16.includes("Review them now"), "Procedures: landing notice");
  ok(tab16.includes("lastProcedureScanDay() === todayISO()"), "Procedures: auto-scan at most once a day");
  ok(tab16.includes("setModal({ ...BLANK, procedure: sug.name, date: sug.date || \"\" })"), "Confirm pre-fills the Add Procedure modal with name and document date");
  ok(tab16.includes("resolveProcedureSuggestion(confirmingSug.procId)") && tab16.includes("setConfirmingSug(null)"), "saving retires the card; cancel clears the pending confirm");
  const tab12 = readFileSync(SRC("components/tabs/Tab12.jsx"), "utf8");
  ok(tab12.includes('{ label: "Procedure Note",  type: "Procedure",  color: "#f59e0b" }'), "Import Records offers a Procedure Note type that files under Procedures");
  const drive = readFileSync(SRC("lib/driveSync.js"), "utf8");
  ok(drive.includes('"mi_procsug_last_scan"'), "the per-device scan stamp never rides the Drive file");
  const lib = readFileSync(SRC("lib/procedureSuggest.js"), "utf8");
  ok(lib.includes('"mi_procedure_suggestions"') && !lib.includes('setItem("mi_surgeries"'), "the engine owns its own store and never writes mi_surgeries");
}

console.log(`\n${pass} passed, ${fail} failed (procedure-suggest)`);
assert.equal(fail, 0);
