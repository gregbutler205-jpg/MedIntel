// ── Drive report archive tests (v1.48.0) ────────────────────────────────────
// Pure helpers (area mapping, url sanitization, filenames), the demo-mode and
// no-token no-op contracts, and structural checks that every save path is
// wired: pass-through calls present, updatedAt stamps present (DEC-046
// opt-in), external links carry rel="noopener noreferrer", and nothing sends
// the link fields to the AI.
//
// House harness: plain Node, Storage polyfill, no framework.

import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = (p) => join(__dirname, "..", "src", p);

// ── Storage polyfill (before importing app modules) ──────────────────────────
class Storage {
  constructor() { this.map = new Map(); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
  clear() { this.map.clear(); }
  key(i) { return [...this.map.keys()][i] ?? null; }
  get length() { return this.map.size; }
}
globalThis.Storage = Storage;
globalThis.localStorage = new Storage();
globalThis.window = globalThis;
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};

const {
  REPORT_ROOT, REPORT_AREAS,
  areaForRecordType, areaForDocCategory,
  sanitizeReportUrl, reportFileName,
  getReportFolderState, ensureReportFolders, uploadReportToDrive,
} = await import(pathToFileURL(SRC("lib/driveReports.js")).href);

let pass = 0, fail = 0;
function ok(cond, label) {
  if (cond) { pass++; }
  else { fail++; console.error(`  ✗ FAIL: ${label}`); }
}

// ── 1. Area mapping — records ────────────────────────────────────────────────
console.log("1. areaForRecordType");
ok(areaForRecordType("Lab Report") === "Lab Reports", "Lab Report → Lab Reports");
ok(areaForRecordType("Imaging") === "Imaging & Diagnostics", "Imaging → Imaging & Diagnostics");
ok(areaForRecordType("Visit Note") === "Clinical Notes", "Visit Note → Clinical Notes");
ok(areaForRecordType("Procedure") === "Operative & Procedures", "Procedure → Operative & Procedures");
ok(areaForRecordType("Hospital") === "Hospital & Discharge", "Hospital → Hospital & Discharge");
ok(areaForRecordType("Other") === "Other", "Other → Other");
ok(areaForRecordType("Something Novel") === "Other", "unknown → Other");
ok(areaForRecordType(undefined) === "Other", "undefined → Other");
for (const t of ["Lab Report", "Imaging", "Visit Note", "Procedure", "Hospital", "???"]) {
  ok(REPORT_AREAS.includes(areaForRecordType(t)), `mapped area for "${t}" exists in REPORT_AREAS`);
}

// ── 2. Area mapping — document categories ────────────────────────────────────
console.log("2. areaForDocCategory");
ok(areaForDocCategory("labs") === "Lab Reports", "labs → Lab Reports");
ok(areaForDocCategory("imaging") === "Imaging & Diagnostics", "imaging → Imaging & Diagnostics");
ok(areaForDocCategory("operative") === "Operative & Procedures", "operative → Operative & Procedures");
ok(areaForDocCategory("clinical") === "Clinical Notes", "clinical → Clinical Notes");
ok(areaForDocCategory("referrals") === "Referrals", "referrals → Referrals");
ok(areaForDocCategory("discharge") === "Hospital & Discharge", "discharge → Hospital & Discharge");
ok(areaForDocCategory("other") === "Other", "other → Other");
ok(areaForDocCategory("") === "Other", "empty → Other");
for (const c of ["labs", "imaging", "operative", "clinical", "referrals", "discharge", "x"]) {
  ok(REPORT_AREAS.includes(areaForDocCategory(c)), `mapped area for "${c}" exists in REPORT_AREAS`);
}

// ── 3. URL sanitization ──────────────────────────────────────────────────────
console.log("3. sanitizeReportUrl");
ok(sanitizeReportUrl("https://drive.google.com/file/d/abc/view") === "https://drive.google.com/file/d/abc/view", "https passes through");
ok(sanitizeReportUrl("  https://x.example/a  ") === "https://x.example/a", "trims whitespace");
ok(sanitizeReportUrl("HTTPS://x.example/a") === "HTTPS://x.example/a", "case-insensitive scheme accepted");
ok(sanitizeReportUrl("http://x.example/a") === "", "http rejected");
ok(sanitizeReportUrl("javascript:alert(1)") === "", "javascript: rejected");
ok(sanitizeReportUrl("data:text/html,hi") === "", "data: rejected");
ok(sanitizeReportUrl(" javascript:alert(1)//https://") === "", "prefixed javascript rejected");
ok(sanitizeReportUrl("") === "", "empty → empty");
ok(sanitizeReportUrl(null) === "", "null → empty");
ok(sanitizeReportUrl(undefined) === "", "undefined → empty");
ok(sanitizeReportUrl(42) === "", "non-string → empty");

// ── 4. Archive filenames ─────────────────────────────────────────────────────
console.log("4. reportFileName");
ok(reportFileName("2026-05-08", "MRI Liver", "scan.pdf") === "2026-05-08 — MRI Liver.pdf", "date + title + ext");
ok(reportFileName("2026-05-08", "Chest X-ray", "IMG_100.JPG") === "2026-05-08 — Chest X-ray.JPG", "original extension preserved");
ok(reportFileName("2026-05-08", "Report", "noextension") === "2026-05-08 — Report.pdf", "missing extension defaults to .pdf");
{
  const today = new Date().toISOString().slice(0, 10);
  ok(reportFileName("", "T", "a.pdf").startsWith(today), "empty date → today");
  ok(reportFileName("May 8, 2026", "T", "a.pdf").startsWith(today), "non-ISO date → today");
}
ok(!reportFileName("2026-05-08", "a/b\\c", "x.pdf").includes("/"), "slashes stripped from title");
ok(!reportFileName("2026-05-08", "a/b\\c", "x.pdf").includes("\\"), "backslashes stripped from title");
ok(reportFileName("2026-05-08", "", "x.pdf") === "2026-05-08 — Report.pdf", "empty title → Report");
ok(reportFileName("2026-05-08", "T".repeat(300), "x.pdf").length < 140, "long title truncated");

// ── 5. Folder state ──────────────────────────────────────────────────────────
console.log("5. getReportFolderState");
localStorage.removeItem("mi_drive_report_folders");
ok(getReportFolderState() === null, "unset → null");
localStorage.setItem("mi_drive_report_folders", JSON.stringify({ rootId: "r1", rootLink: "https://d/x", areas: { "Lab Reports": { id: "a1", link: "https://d/l" } } }));
ok(getReportFolderState()?.rootId === "r1", "parses stored state");
localStorage.setItem("mi_drive_report_folders", "{corrupt");
ok(getReportFolderState() === null, "corrupt JSON → null");
localStorage.removeItem("mi_drive_report_folders");

// ── 6. Demo mode and no-token are hard no-ops ────────────────────────────────
console.log("6. no-op contracts");
// Demo: mi_is_demo=1 and no vault → isDemoMode() true → both entry points bail.
localStorage.setItem("mi_is_demo", "1");
ok((await ensureReportFolders({ interactive: true })) === null, "DEMO: ensureReportFolders → null (never touches a visitor's Drive)");
ok((await uploadReportToDrive({ name: "x.pdf" }, { area: "Lab Reports" })) === null, "DEMO: uploadReportToDrive → null");
localStorage.removeItem("mi_is_demo");
// Real mode, but Node has no Google token → silent null, never a throw.
ok((await ensureReportFolders()) === null, "no token: ensureReportFolders → null");
ok((await uploadReportToDrive({ name: "x.pdf" }, { area: "Lab Reports" })) === null, "no token: uploadReportToDrive → null");
ok((await uploadReportToDrive(null, { area: "Lab Reports" })) === null, "no file → null");

// ── 7. Structural wiring (source scans) ──────────────────────────────────────
console.log("7. structural wiring");
const tab09 = readFileSync(SRC("components/tabs/Tab09.jsx"), "utf8");
const tab12 = readFileSync(SRC("components/tabs/Tab12.jsx"), "utf8");
const tab13 = readFileSync(SRC("components/tabs/Tab13.jsx"), "utf8");
const tab17 = readFileSync(SRC("components/tabs/Tab17.jsx"), "utf8");
const tab03 = readFileSync(SRC("components/tabs/Tab03.jsx"), "utf8");
const tab02 = readFileSync(SRC("components/tabs/Tab02.jsx"), "utf8");
const lib   = readFileSync(SRC("lib/driveReports.js"), "utf8");

// 7a. DEC-046 stamps: edits must opt in to newer-edit-wins or links are lost in sync.
{
  const updateDocBody = tab09.slice(tab09.indexOf("function updateDoc"), tab09.indexOf("function updateDoc") + 400);
  ok(updateDocBody.includes("updatedAt: Date.now()"), "Tab09 updateDoc stamps updatedAt");
  const saveBody = tab17.slice(tab17.indexOf("function handleSave"), tab17.indexOf("function handleSave") + 400);
  ok(saveBody.includes("updatedAt: Date.now()"), "Tab17 handleSave stamps updatedAt");
  ok(tab03.includes("reportLink: clean, updatedAt: Date.now()"), "Tab03 link edit stamps updatedAt");
}

// 7b. Every Tab12 save path archives the original.
ok((tab12.match(/archiveOriginal\(/g) || []).length >= 5, "Tab12: archiveOriginal defined + called from all record paths");
// DEC-P-TBD (lab batch confirmation): batch lab PDFs no longer upload at
// extract time — each document's original archives at CONFIRM time through
// handleLabReviewDone's archiveOriginal call (counted above), keyed by the
// session file map so batch and single files take the same path.
ok(tab12.includes("archiveOriginal(labRecord, labFilesRef.current.get(doc.id)"), "Tab12: confirmed lab documents archive their original via the session file map");
// 7c. Tab09 upload passes the original through.
ok(tab09.includes("uploadReportToDrive(file, { area: areaForDocCategory(doc.category)"), "Tab09: upload pass-through wired");
// 7d. Settings row exists and is demo-gated.
{
  const row = tab13.slice(tab13.indexOf("function ReportArchiveRow"), tab13.indexOf("function ReportArchiveRow") + 700);
  ok(row.includes("if (isDemoMode()) return null"), "Tab13 ReportArchiveRow hidden in demo mode");
  ok(tab13.includes("<ReportArchiveRow"), "Tab13 ReportArchiveRow rendered");
}
// 7e. The lib itself: demo-gated at both entry points, visible Drive only.
ok((lib.match(/isDemoMode\(\)/g) || []).length >= 2, "lib: both entry points check demo mode");
ok(!lib.includes("appDataFolder"), "lib: report files go to the visible Drive, never appDataFolder");
ok(lib.includes("drive.file"), "lib: documents the drive.file scope constraint");

// 7f. Every rendered link is sanitized and carries noopener.
for (const [name, src] of [["Tab17", tab17], ["Tab03", tab03], ["Tab02", tab02], ["Tab09", tab09]]) {
  const anchors = src.split("<a ").slice(1).filter(a => a.includes("reportLink") || a.includes("driveLink"));
  ok(anchors.length > 0, `${name}: renders a report link`);
  for (const a of anchors) {
    ok(a.slice(0, 300).includes('rel="noopener noreferrer"'), `${name}: report link has rel=noopener`);
    ok(a.slice(0, 300).includes("sanitizeReportUrl("), `${name}: report link href sanitized`);
  }
}

// 7g. AI payloads stay clean: the context builders map selective fields.
{
  const tab14 = readFileSync(SRC("components/tabs/Tab14.jsx"), "utf8");
  ok(!tab14.includes("reportLink"), "Tab14 prompt context never references reportLink");
  ok(!tab14.includes("driveLink"), "Tab14 prompt context never references driveLink");
}

// ── Result ───────────────────────────────────────────────────────────────────
console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
console.log("ALL PASS");
