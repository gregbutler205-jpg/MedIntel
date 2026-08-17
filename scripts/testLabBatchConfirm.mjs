// ── Lab batch confirmation tests (WO_LAB_BATCH_CONFIRM_01 / DEC-P-TBD) ──────
// The real data layer end to end: flag computation, archive creation,
// read-time migration, corrections preserving originals, the confirm gate,
// provenance stamping, persistence, exclusion + later promotion, and the
// invariant that nothing reaches mi_labs without a referencing
// ConfirmationEvent. House harness: plain Node, Storage polyfill.
// Run: npm run test:lab-batch

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
globalThis.window = globalThis;
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.dispatchEvent = () => {};

const {
  parseRefRange, computeRowFlags, createArchiveDoc, readArchive, upsertArchiveDoc,
  applyCorrection, setRowIncluded, confirmGate, confirmDoc, persistConfirmation,
  readConfirmationEvents, reviewableArchiveDocs,
  LAB_ARCHIVE_KEY, CONFIRMATION_EVENTS_KEY,
} = await import("../src/lib/labBatchConfirm.js");
const { MONITORED_ANALYTES } = await import("../src/config/monitoredAnalytes.js");

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("PASS — " + m); } else { fail++; console.log("FAIL — " + m); } };

// ── 1. parseRefRange ─────────────────────────────────────────────────────────
ok(JSON.stringify(parseRefRange("0.7-1.3")) === '{"lo":0.7,"hi":1.3}', "a-b range parses");
ok(JSON.stringify(parseRefRange("0.7 – 1.3")) === '{"lo":0.7,"hi":1.3}', "en-dash range with spaces parses");
ok(JSON.stringify(parseRefRange("<5")) === '{"lo":null,"hi":5}', "<x parses as upper bound");
ok(JSON.stringify(parseRefRange("≤ 5")) === '{"lo":null,"hi":5}', "≤x parses as upper bound");
ok(JSON.stringify(parseRefRange(">10")) === '{"lo":10,"hi":null}', ">x parses as lower bound");
ok(parseRefRange("negative") === null, "unparseable text → null (no guessing)");
ok(parseRefRange("") === null, "empty → null");

// ── 2. computeRowFlags ───────────────────────────────────────────────────────
ok(computeRowFlags({ name: "Sodium", value: "140", refRange: "135-145" }).length === 0, "in-range row: no flags");
ok(computeRowFlags({ name: "Sodium", value: "150", refRange: "135-145" }).includes("out_of_range"), "above range flags");
ok(computeRowFlags({ name: "Sodium", value: "130", refRange: "135-145" }).includes("out_of_range"), "below range flags");
ok(!computeRowFlags({ name: "Sodium", value: "140", refRange: "135-145", flag: true }).includes("out_of_range"),
   "a parseable range is authoritative over the extraction's H/L marker");
ok(computeRowFlags({ name: "Sodium", value: "140", refRange: "see note", flag: true }).includes("out_of_range"),
   "unparseable range falls back to the extraction's marker");
ok(computeRowFlags({ name: "ALT", value: "30", refRange: "10-40", confidence: 0.5 }).includes("low_confidence"), "confidence below threshold flags");
ok(!computeRowFlags({ name: "ALT", value: "30", refRange: "10-40" }).includes("low_confidence"), "absent confidence = normal (WO scope-out)");
ok(computeRowFlags({ name: "Tacrolimus", value: "7.1", refRange: "5-15" }).includes("monitored_analyte"), "tacrolimus is monitored");
ok(computeRowFlags({ name: "FK506 Level", value: "7.1", refRange: "5-15" }).includes("monitored_analyte"), "FK506 alias resolves to monitored (canonicalLabId)");
ok(!computeRowFlags({ name: "Glucose", value: "90", refRange: "70-100" }).includes("monitored_analyte"), "non-monitored analyte is not flagged monitored");
ok(MONITORED_ANALYTES.length === 1 && MONITORED_ANALYTES[0] === "tacrolimus", "monitored list initial value is exactly [tacrolimus]");

// ── 3. createArchiveDoc ──────────────────────────────────────────────────────
const mkDoc = () => createArchiveDoc({
  title: "Quest Panel", fileName: "quest.pdf",
  rows: [
    { name: "Sodium", value: "140", unit: "mmol/L", refRange: "135-145", date: "2026-08-01", category: "Metabolic Panel" },
    { name: "Tacrolimus", value: "7.1", unit: "ng/mL", refRange: "5-15", date: "2026-08-01", category: "Immunosuppressant Level" },
    { name: "ALT", value: "62", unit: "U/L", refRange: "10-40", date: "2026-08-01", category: "Liver Function" },
    { name: "Smudged", value: "3", unit: "", refRange: "1-2", date: "2026-08-01", category: "Other", confidence: 0.4 },
  ],
});
{
  const d = mkDoc();
  ok(d.rows.length === 4 && d.rows.every(r => r.id && r.extractedAt), "rows get ids and extraction timestamps");
  ok(d.rows[0].state === "pending" && d.rows[1].state === "pending" && d.rows[2].state === "pending", "normal rows initialize pending");
  ok(d.rows[3].state === "excluded" && d.rows[3].flags.includes("low_confidence"), "low-confidence rows initialize EXCLUDED");
  ok(d.rows[1].flags.includes("monitored_analyte"), "monitored flag computed at creation");
  ok(d.rows[2].flags.includes("out_of_range"), "out-of-range flag computed at creation");
}

// ── 4. Read-time migration ───────────────────────────────────────────────────
{
  localStorage.setItem(LAB_ARCHIVE_KEY, JSON.stringify([
    { id: "old1", title: "Old", rows: [{ id: "r1", name: "ALT", value: "30" }, { id: "r2", name: "AST", value: "28", state: "bogus" }] },
  ]));
  const docs = readArchive();
  ok(docs[0].rows[0].state === "pending", "row missing state defaults to pending (acceptance: migration)");
  ok(docs[0].rows[1].state === "pending", "invalid state string defaults to pending");
  ok(Array.isArray(docs[0].rows[0].flags), "missing flags default to an empty array");
  localStorage.removeItem(LAB_ARCHIVE_KEY);
}

// ── 5. Corrections preserve originals ────────────────────────────────────────
{
  const d = mkDoc();
  const alt = d.rows[2];
  const once = applyCorrection(alt, { value: "26", unit: "U/L", date: "2026-08-02" });
  ok(once.value === "26" && once.date === "2026-08-02", "correction updates the working values");
  ok(once.correction.originalValue === "62" && once.correction.originalDate === "2026-08-01", "first correction captures the extracted originals");
  ok(!once.flags.includes("out_of_range"), "correcting into range clears the out-of-range flag");
  const twice = applyCorrection(once, { value: "999" });
  ok(twice.correction.originalValue === "62", "second edit NEVER overwrites the preserved originals");
  ok(twice.flags.includes("out_of_range"), "correcting out of range re-flags");
  const tac = applyCorrection(d.rows[1], { value: "8.0" });
  ok(tac.flags.includes("monitored_analyte"), "monitored flag survives correction");
}

// ── 6. Include/exclude transitions ───────────────────────────────────────────
{
  const d = mkDoc();
  const excluded = setRowIncluded(d.rows[0], false);
  ok(excluded.state === "excluded", "pending → excluded");
  ok(setRowIncluded(excluded, true).state === "pending", "excluded → pending");
  const promoted = { ...d.rows[0], state: "promoted" };
  ok(setRowIncluded(promoted, false).state === "promoted", "promoted rows are immune to the toggle");
}

// ── 7. Confirm gate ──────────────────────────────────────────────────────────
{
  const d = mkDoc(); // rows: sodium(clean), tacrolimus(monitored), alt(range), smudged(excluded low-conf)
  let g = confirmGate(d, new Set());
  ok(!g.canConfirm, "gate closed: included flagged rows unacknowledged (provably disabled)");
  ok(g.unacknowledged.length === 2, "both flagged included rows (monitored + out-of-range) need acknowledgment");
  ok(g.summary.promoteCount === 3 && g.summary.excludeCount === 1, "summary counts: 3 to promote, 1 excluded");

  g = confirmGate(d, new Set([d.rows[1].id]));
  ok(!g.canConfirm, "gate still closed with one of two acknowledgments");

  g = confirmGate(d, new Set([d.rows[1].id, d.rows[2].id]));
  ok(g.canConfirm, "gate opens once every included flagged row is acknowledged");

  // Excluding a flagged row removes its acknowledgment requirement.
  const d2 = { ...d, rows: d.rows.map(r => (r.id === d.rows[2].id ? setRowIncluded(r, false) : r)) };
  g = confirmGate(d2, new Set([d.rows[1].id]));
  ok(g.canConfirm, "an EXCLUDED flagged row requires no acknowledgment");

  const allPromoted = { ...d, rows: d.rows.map(r => ({ ...r, state: "promoted" })) };
  ok(!confirmGate(allPromoted, new Set()).canConfirm, "nothing reviewable → gate closed");
}

// ── 8. confirmDoc: events, provenance, promoted shape ────────────────────────
{
  const d = mkDoc();
  let threw = false;
  try { confirmDoc(d, new Set()); } catch { threw = true; }
  ok(threw, "confirmDoc throws while the gate is closed (last line of defense)");

  const acks = new Set([d.rows[1].id, d.rows[2].id]);
  const corrected = { ...d, rows: d.rows.map(r => (r.id === d.rows[2].id ? applyCorrection(r, { value: "26" }) : r)) };
  const { doc: confirmed, event, promotedLabRows } = confirmDoc(corrected, new Set([d.rows[1].id]));
  // (ALT corrected into range no longer needs acknowledgment — one ack suffices)
  ok(event.docId === corrected.id && event.promotedRowIds.length === 3 && event.excludedRowIds.length === 1,
     "ConfirmationEvent records promoted and excluded row ids");
  const promotedRows = confirmed.rows.filter(r => r.state === "promoted");
  ok(promotedRows.length === 3 && promotedRows.every(r =>
      r.provenance && r.provenance.docId === corrected.id && r.provenance.confirmationEventId === event.id &&
      r.provenance.extractedAt && r.provenance.page === null),
     "every promoted row carries provenance {docId, page, extractedAt, confirmationEventId}");
  ok(confirmed.rows.find(r => r.name === "Smudged").state === "excluded", "excluded row stays excluded through confirm");
  const altOut = promotedLabRows.find(r => r.name === "ALT");
  ok(altOut.value === 26 && altOut.flag === false, "promotion uses the CORRECTED value; in-range → unflagged");
  const archiveAlt = confirmed.rows.find(r => r.name === "ALT");
  ok(archiveAlt.correction.originalValue === "62", "archive row retains the original extracted value after promotion");
  ok(promotedLabRows.every(r => r.confirmationEventId === event.id && r.archiveRowId), "reconciled rows carry traceability fields");
}

// ── 9. Persistence + the core invariant ──────────────────────────────────────
{
  localStorage.clear();
  const d = upsertArchiveDoc(mkDoc());
  ok(typeof d.updatedAt === "number", "archive docs stamp updatedAt (DEC-046 sync opt-in)");

  const acks = new Set(d.rows.filter(r => r.state === "pending" && r.flags.length).map(r => r.id));
  const result = confirmDoc(d, acks);
  persistConfirmation(result);

  const labs = JSON.parse(localStorage.getItem("mi_labs"));
  const events = readConfirmationEvents();
  ok(labs.length === 3, "promoted rows landed in the reconciled record (mi_labs)");
  ok(events.length === 1 && events[0].id === result.event.id, "ConfirmationEvent persisted");
  ok(labs.every(l => l.confirmationEventId && events.some(e => e.id === l.confirmationEventId)),
     "INVARIANT: every reconciled row references a persisted ConfirmationEvent");

  // Excluded row persists and is promotable later through the same flow.
  let docs = readArchive();
  ok(reviewableArchiveDocs().length === 1, "doc with an excluded row remains reviewable (exclusion is not deletion)");
  const again = { ...docs[0], rows: docs[0].rows.map(r => (r.state === "excluded" ? setRowIncluded(r, true) : r)) };
  const g2 = confirmGate(again, new Set(again.rows.filter(r => r.state === "pending" && r.flags.length).map(r => r.id)));
  ok(g2.canConfirm && g2.summary.promoteCount === 1, "previously excluded row re-enters and can be promoted");
  persistConfirmation(confirmDoc(again, new Set(again.rows.filter(r => r.state === "pending" && r.flags.length).map(r => r.id))));
  ok(JSON.parse(localStorage.getItem("mi_labs")).length === 4, "later promotion adds the row");
  ok(readConfirmationEvents().length === 2, "second confirmation writes its own event");
  ok(reviewableArchiveDocs().length === 0, "fully promoted doc leaves the review queue");
}

// ── 10. Structural: Tab12 flows + untouched surfaces ─────────────────────────
{
  const tab12 = readFileSync(SRC("components/tabs/Tab12.jsx"), "utf8");
  ok(!tab12.includes("Auto-save in batch mode"), "batch auto-save is gone — batches go through review");
  ok(tab12.includes("upsertArchiveDoc(createArchiveDoc("), "extraction output lands in the archive tier");
  ok(tab12.includes("<LabBatchReview"), "review overlay rendered");
  ok(tab12.includes("reviewableArchiveDocs()"), "re-entry card lists documents awaiting review");
  ok(tab12.includes('source: "staged"'), "tripwire staged evaluation preserved");

  const review = readFileSync(SRC("components/LabBatchReview.jsx"), "utf8");
  ok(review.includes("disabled={!gate.canConfirm}"), "confirm control is disabled by the gate, not by styling alone");
  ok(review.includes("upsertArchiveDoc(workingDoc)"), "cancel persists working state (exclusion is not deletion)");

  // Medications and allergies flows: no coupling to this feature.
  for (const f of ["components/tabs/Tab04.jsx", "components/tabs/Tab02.jsx"]) {
    const src = readFileSync(SRC(f), "utf8");
    ok(!src.includes("labBatchConfirm"), `${f} does not import the batch-confirmation layer`);
  }
  const monitored = readFileSync(SRC("config/monitoredAnalytes.js"), "utf8");
  ok(monitored.includes("Clinical Safety Core"), "monitored list carries its CSC governance comment");
}

console.log(`\n${pass} passed, ${fail} failed (lab-batch-confirm)`);
assert.equal(fail, 0);
