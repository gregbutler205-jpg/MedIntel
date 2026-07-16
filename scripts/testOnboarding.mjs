// ── Onboarding unit tests (ONBOARDING_SPEC v1.1) ─────────────────────────────
// Node harness, no framework — same convention as testThresholds.mjs.
// WP1 covers the state machine's pure helpers and the binding config
// invariants; WP3/WP4 extend this file with staleness, matrix gating,
// duplicate matching, and artifact trigger evaluation.

import assert from "node:assert/strict";

// Minimal browser polyfills so the modules import under Node.
// secureStorage.js captures Storage.prototype methods at module load, so the
// polyfill must be a real prototype-backed class, not a plain object.
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
globalThis.sessionStorage = new Storage();
globalThis.window = globalThis;
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.dispatchEvent = () => {};

const state = await import("file:///C:/Documents/Medical/IntelliTrax/Code/src/lib/onboardingState.js");
const cfg = await import("file:///C:/Documents/Medical/IntelliTrax/Code/src/config/onboardingConfig.js");

let pass = 0, fail = 0;
function check(name, fn) {
  try { fn(); pass++; console.log(`PASS — ${name}`); }
  catch (e) { fail++; console.log(`FAIL — ${name}: ${e.message}`); }
}

// ── §4.5 / §5.2 config invariants ────────────────────────────────────────────
check("§4.5 staleness thresholds are the spec constants", () => {
  assert.equal(cfg.STALE_WARN_MONTHS, 12);
  assert.equal(cfg.STALE_HISTORICAL_MONTHS, 24);
});

check("§5.2 matrix: medications/allergies/conditions are per-item, never bulk", () => {
  for (const cat of ["medication", "allergy", "condition"]) {
    assert.equal(cfg.CONFIRMATION_MATRIX[cat].perItem, true, `${cat} perItem`);
    assert.equal(cfg.CONFIRMATION_MATRIX[cat].bulk, false, `${cat} bulk`);
  }
});

check("§5.2 matrix: labs/vitals/procedures/immunizations/care_team allow bulk", () => {
  for (const cat of ["lab", "vital", "procedure", "immunization", "care_team"]) {
    assert.equal(cfg.CONFIRMATION_MATRIX[cat].bulk, true, `${cat} bulk`);
  }
});

check("§3.4 category review order starts high-consequence: meds, allergies, conditions", () => {
  assert.deepEqual(cfg.CATEGORY_REVIEW_ORDER.slice(0, 3), ["medication", "allergy", "condition"]);
});

// ── Phone / date helpers (§3.2) ──────────────────────────────────────────────
check("toE164US: 10-digit, formatted, and 1-prefixed inputs normalize; garbage → null", () => {
  assert.equal(state.toE164US("5558472931"), "+15558472931");
  assert.equal(state.toE164US("(555) 847-2931"), "+15558472931");
  assert.equal(state.toE164US("1 555 847 2931"), "+15558472931");
  assert.equal(state.toE164US("847-2931"), null);
  assert.equal(state.toE164US(""), null);
  assert.equal(state.toE164US(null), null);
});

check("maskUSPhone: progressive mask, caps at 10 digits", () => {
  assert.equal(state.maskUSPhone("555"), "555");
  assert.equal(state.maskUSPhone("5558"), "(555) 8");
  assert.equal(state.maskUSPhone("5558472931999"), "(555) 847-2931");
});

check("validateTransplantDate: future rejected; >50y warns but passes; recent clean", () => {
  const now = new Date("2026-07-15T12:00:00");
  assert.equal(state.validateTransplantDate("2027-01-01", now).ok, false);
  const old = state.validateTransplantDate("1970-01-01", now);
  assert.equal(old.ok, true);
  assert.ok(old.warn, "expected a 50-year warning");
  const recent = state.validateTransplantDate("2023-08-12", now);
  assert.equal(recent.ok, true);
  assert.equal(recent.warn, null);
  assert.equal(state.validateTransplantDate("", now).ok, true, "empty tx date is allowed (optional field)");
});

check("validateDob: required, real, not future", () => {
  const now = new Date("2026-07-15T12:00:00");
  assert.equal(state.validateDob("", now).ok, false);
  assert.equal(state.validateDob("2030-01-01", now).ok, false);
  assert.equal(state.validateDob("1973-09-14", now).ok, true);
});

// ── State machine (§2, §3.8) ─────────────────────────────────────────────────
check("saveState merges onto defaults and stamps last_seen", () => {
  localStorage.clear();
  const s = state.saveState({ phase: 2, goal: "emergency_packet" });
  assert.equal(s.phase, 2);
  assert.equal(s.goal, "emergency_packet");
  assert.ok(s.last_seen, "last_seen stamped");
  assert.equal(s.version, 1);
  const loaded = state.loadState();
  assert.equal(loaded.phase, 2);
});

check("§2 resume banner: phase<5 with last_seen shows; phase 5 or fresh does not", () => {
  localStorage.clear();
  assert.equal(state.shouldShowResumeBanner(state.loadState()), false, "no state → no banner");
  state.saveState({ phase: 3 });
  assert.equal(state.shouldShowResumeBanner(state.loadState()), true, "mid-flow → banner");
  state.saveState({ phase: 5 });
  assert.equal(state.shouldShowResumeBanner(state.loadState()), false, "complete → no banner");
});

check("§3.0 hard gate: extractionAllowed only after consent", () => {
  localStorage.clear();
  assert.equal(state.extractionAllowed(), false, "no state → blocked");
  state.saveState({ consents: { ai_processing: false, accepted_at: null } });
  assert.equal(state.extractionAllowed(), false, "declined → blocked");
  state.saveState({ consents: { ai_processing: true, accepted_at: new Date().toISOString() } });
  assert.equal(state.extractionAllowed(), true, "granted → allowed");
});

check("Start over keeps the product-wide consent, resets the rest", () => {
  localStorage.clear();
  state.saveState({ phase: 4, goal: "organize_meds", consents: { ai_processing: true, accepted_at: "2026-07-15T00:00:00Z" } });
  const fresh = state.resetStateKeepConsent();
  assert.equal(fresh.phase, 0);
  assert.equal(fresh.goal, null);
  assert.equal(fresh.consents.ai_processing, true, "consent survives Start over");
});

check("§3.1/§6: five goals, each mapped to an artifact; default goal is the emergency packet", () => {
  assert.equal(state.GOALS.length, 5);
  state.GOALS.forEach(g => assert.ok(g.artifact, `${g.id} has artifact`));
  assert.equal(state.DEFAULT_GOAL, "emergency_packet");
});

// ═══ WP2: extraction, staleness, staging, intake ═════════════════════════════

const staging = await import("file:///C:/Documents/Medical/IntelliTrax/Code/src/lib/onboardingStaging.js");
const fixture = await import("file:///C:/Documents/Medical/IntelliTrax/Code/src/lib/fixtureExtraction.js");
const extraction = await import("file:///C:/Documents/Medical/IntelliTrax/Code/src/lib/extraction.js");
const intake = await import("file:///C:/Documents/Medical/IntelliTrax/Code/src/lib/onboardingIntake.js");

const NOW = new Date("2026-07-15T12:00:00");

// ── §4.5 staleness (deterministic, threshold-driven) ─────────────────────────
check("§4.5: ≤12 months → no flag", () => {
  const s = staging.stalenessFor("2026-05-20", NOW);
  assert.equal(s.level, "fresh"); assert.equal(s.badge, null); assert.equal(s.defaultHistorical, false);
});
check("§4.5: 12–24 months → badge, individually acceptable, no status default", () => {
  const s = staging.stalenessFor("2025-01-15", NOW); // 18 months
  assert.equal(s.level, "warn");
  assert.equal(s.badge, "From a document dated Jan 2025 — confirm this is still current.");
  assert.equal(s.defaultHistorical, false);
});
check("§4.5: >24 months → badge + medication defaults to Historical", () => {
  const s = staging.stalenessFor("2024-04-22", NOW); // 26+ months
  assert.equal(s.level, "historical");
  assert.equal(s.badge, "From a document dated Apr 2024 — confirm this is still current.");
  assert.equal(s.defaultHistorical, true);
});
check("§4.5: null doc_date → conservative handling (badge + Historical default)", () => {
  const s = staging.stalenessFor(null, NOW);
  assert.equal(s.level, "historical"); assert.equal(s.defaultHistorical, true); assert.ok(s.badge);
});
check("§4.5: exact boundary — 12 months is not stale, 24 months is not historical", () => {
  assert.equal(staging.stalenessFor("2025-07-15", NOW).level, "fresh");      // exactly 12
  assert.equal(staging.stalenessFor("2024-07-15", NOW).level, "warn");       // exactly 24
  assert.equal(staging.stalenessFor("2024-07-14", NOW).level, "historical"); // 24 + a day
});

// ── Fixture dataset conforms to the §4.1 contract and work-order spec ────────
check("fixture: five meds across two documents incl. the Apr 2024 note, one allergy, 27 labs", () => {
  const r = fixture.buildFixtureResult();
  assert.equal(r.documents.length, 2);
  const items = r.documents.flatMap(d => d.items);
  assert.equal(items.filter(i => i.category === "medication").length, 5);
  assert.equal(items.filter(i => i.category === "allergy").length, 1);
  assert.equal(items.filter(i => i.category === "lab").length, 27);
  assert.ok(r.documents.some(d => d.doc_date === "2024-04-22"), "Apr 2024 stale note present");
});
check("fixture: every item carries the §4.1 fields", () => {
  const r = fixture.buildFixtureResult();
  const CATS = ["medication", "allergy", "condition", "care_team", "lab", "procedure", "immunization", "vital"];
  r.documents.forEach(d => {
    assert.ok(typeof d.source_name === "string" && d.source_name);
    assert.ok("doc_date" in d && "doc_date_confidence" in d);
    d.items.forEach(i => {
      assert.ok(CATS.includes(i.category), `category ${i.category}`);
      assert.ok(i.fields && typeof i.fields === "object");
      assert.ok(typeof i.confidence === "number" && i.confidence >= 0 && i.confidence <= 1);
      assert.ok("source_page" in i && "source_region" in i);
    });
  });
});
check("fixture: confidence bands span High / Needs review / low for WP3 rendering", () => {
  const items = fixture.buildFixtureResult().documents.flatMap(d => d.items);
  assert.ok(items.some(i => i.confidence >= 0.85));
  assert.ok(items.some(i => i.confidence >= 0.5 && i.confidence < 0.85));
  assert.ok(items.some(i => i.confidence < 0.5));
});

// ── Staging store (§5.1) ─────────────────────────────────────────────────────
check("staging: fixture result stages with per-document staleness on meds/conditions", () => {
  localStorage.clear();
  state.saveState({ phase: 3 });
  const { itemCount } = staging.stageExtractionResult(fixture.buildFixtureResult(), [], NOW);
  assert.equal(itemCount, 38);
  const meds = staging.getItems({ category: "medication" });
  assert.equal(meds.length, 5);
  const staleMeds = meds.filter(m => m.staleness === "historical");
  assert.equal(staleMeds.length, 2, "the two Apr 2024 meds are historical");
  staleMeds.forEach(m => { assert.ok(m.staleness_badge.includes("Apr 2024")); assert.equal(m.default_historical, true); });
  const freshMeds = meds.filter(m => m.staleness === "fresh");
  assert.equal(freshMeds.length, 3);
  const labs = staging.getItems({ category: "lab" });
  assert.ok(labs.every(l => l.staleness === "fresh"), "staleness applies to meds/conditions only");
});
check("staging: staged_counts mirror into onboarding_state (§2 shape)", () => {
  const counts = state.loadState().staged_counts;
  assert.equal(counts.medications, 5);
  assert.equal(counts.labs, 27);
  assert.equal(counts.allergies, 1);
});
check("§5.1: reject is a soft delete, recoverable, purged after 30 days", () => {
  const med = staging.getItems({ category: "medication" })[0];
  staging.setItemStatus(med.id, "rejected", NOW);
  assert.equal(staging.getItems({ status: "rejected" }).length, 1, "retained after reject");
  const day29 = new Date(NOW.getTime() + 29 * 86400000);
  assert.equal(staging.purgeExpiredRejects(day29), 0, "still recoverable at day 29");
  const day31 = new Date(NOW.getTime() + 31 * 86400000);
  assert.equal(staging.purgeExpiredRejects(day31), 1, "purged after day 30");
});

// ── Extraction interface: consent hard gate + merge ──────────────────────────
await (async () => {
  localStorage.clear();
  state.saveState({ phase: 3, consents: { ai_processing: false, accepted_at: null } });
  let threw = null;
  try { await extraction.extractText({ sourceName: "x", pageTexts: ["hello"] }); } catch (e) { threw = e; }
  check("§3.0/§11.2: extraction throws ExtractionConsentError while consent is false", () => {
    assert.ok(threw, "should throw");
    assert.equal(threw.name, "ExtractionConsentError");
  });
  state.saveState({ consents: { ai_processing: true, accepted_at: NOW.toISOString() } });
  const r = await extraction.extractText({ sourceName: "x", pageTexts: ["hello"] });
  check("extraction: fixture mode returns the demo dataset once consent is granted", () => {
    assert.equal(r.documents.length, 2);
  });
})();
check("§4.2: page-batch merge collapses to one document, first non-null doc_date wins", () => {
  const merged = extraction.mergeExtractionResults([
    { documents: [{ source_name: "a.pdf", doc_date: null, doc_date_confidence: null, items: [{ category: "lab", fields: {}, confidence: 0.9, source_page: 1, source_region: null }] }] },
    { documents: [{ source_name: "a.pdf", doc_date: "2026-01-02", doc_date_confidence: 0.8, items: [{ category: "lab", fields: {}, confidence: 0.9, source_page: 16, source_region: null }] }] },
  ], "a.pdf");
  assert.equal(merged.documents.length, 1);
  assert.equal(merged.documents[0].doc_date, "2026-01-02");
  assert.equal(merged.documents[0].items.length, 2);
});

// ── Intake: validation, ZIP, page ranges (§3.3 / §4.2) ───────────────────────
check("§3.3: type + size + batch validation", () => {
  const mk = (name, mb) => ({ name, size: mb * 1024 * 1024 });
  const { accepted, rejected } = intake.validateFiles([
    mk("labs.pdf", 1), mk("photo.jpg", 2), mk("scan.heic", 3), mk("bundle.zip", 10),
    mk("notes.docx", 1), mk("huge.pdf", 51),
  ]);
  assert.equal(accepted.length, 4);
  assert.equal(rejected.length, 2);
  assert.ok(rejected.find(r => r.name === "notes.docx").reason.includes("Unsupported"));
  assert.ok(rejected.find(r => r.name === "huge.pdf").reason.includes("50 MB"));
});
check("§3.3: 21st file in a batch is rejected with the batch reason", () => {
  const files = Array.from({ length: 21 }, (_, i) => ({ name: `f${i}.pdf`, size: 1000 }));
  const { accepted, rejected } = intake.validateFiles(files);
  assert.equal(accepted.length, 20);
  assert.equal(rejected.length, 1);
  assert.ok(rejected[0].reason.includes("Batch limit"));
});
await (async () => {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  zip.file("results/labs-may.pdf", new Uint8Array([37, 80, 68, 70]));
  zip.file("results/summary.pdf", new Uint8Array([37, 80, 68, 70]));
  zip.file("readme.txt", "hello");
  zip.file("nested.zip", new Uint8Array([80, 75, 3, 4]));
  const blob = await zip.generateAsync({ type: "blob" });
  const { pdfs, skipped } = await intake.unpackZip(new File([blob], "bundle.zip"));
  check("§4.2: ZIP ingests contained PDFs only; txt and nested ZIP skipped with notes", () => {
    assert.equal(pdfs.length, 2);
    assert.deepEqual(pdfs.map(p => p.name).sort(), ["labs-may.pdf", "summary.pdf"]);
    assert.equal(skipped.length, 2);
    assert.ok(skipped.find(s => s.name === "nested.zip").reason.includes("nested"));
    assert.ok(skipped.find(s => s.name === "readme.txt").reason.includes("unsupported"));
  });
})();
check("§4.3: scanned-PDF detection threshold and page ranges", () => {
  assert.equal(intake.isScannedPdf(["", "x", ""]), true);
  assert.equal(intake.isScannedPdf([new Array(300).fill("a").join(""), new Array(400).fill("b").join("")]), false);
  assert.deepEqual(intake.parsePageRange("1-3, 7", 10), [1, 2, 3, 7]);
  assert.deepEqual(intake.parsePageRange("8-12", 10), [8, 9, 10]);
  assert.equal(intake.parsePageRange("abc", 10), null);
  assert.equal(intake.parsePageRange("5-2", 10), null);
});

// ═══ WP3: duplicates, conflicts, confirmed record writes ═════════════════════

const dup = await import("file:///C:/Documents/Medical/IntelliTrax/Code/src/lib/onboardingDuplicates.js");
const confirm = await import("file:///C:/Documents/Medical/IntelliTrax/Code/src/lib/onboardingConfirm.js");

// ── §5.3 normalization ────────────────────────────────────────────────────────
check("§5.3: drug names resolve to ingredient level (brand, case, suffixes)", () => {
  assert.equal(dup.normalizeDrugName("Prograf"), "tacrolimus");
  assert.equal(dup.normalizeDrugName("TACROLIMUS"), "tacrolimus");
  assert.equal(dup.normalizeDrugName("tacrolimus 1 mg"), "tacrolimus");
  assert.equal(dup.normalizeDrugName("CellCept"), "mycophenolate mofetil");
  assert.equal(dup.normalizeDrugName("Bactrim"), "sulfamethoxazole-trimethoprim");
});
check("§5.3: condition synonyms — HTN → hypertension", () => {
  assert.equal(dup.normalizeConditionName("HTN"), "hypertension");
  assert.equal(dup.normalizeConditionName("  Hypertension "), "hypertension");
  assert.equal(dup.normalizeConditionName("PSC"), "primary sclerosing cholangitis");
});

// ── §5.3 match rule ───────────────────────────────────────────────────────────
check("§5.3: same ingredient + strength + frequency → duplicate (brand vs generic, label vs code)", () => {
  assert.equal(dup.medMatch(
    { name: "Prograf", strength: "1 mg", frequency: "BID" },
    { name: "Tacrolimus", dose: "1 mg", frequency: "Twice daily" }
  ), "duplicate");
});
check("§5.3: same ingredient, different strength or frequency → conflict", () => {
  assert.equal(dup.medMatch(
    { name: "tacrolimus", strength: "5 mg", frequency: "BID" },
    { name: "Tacrolimus", dose: "1 mg", frequency: "BID" }
  ), "conflict");
  assert.equal(dup.medMatch(
    { name: "tacrolimus", strength: "1 mg", frequency: "QD" },
    { name: "Tacrolimus", dose: "1 mg", frequency: "BID" }
  ), "conflict");
});
check("§5.3: different ingredients never match", () => {
  assert.equal(dup.medMatch(
    { name: "prednisone", strength: "5 mg", frequency: "QD" },
    { name: "tacrolimus", dose: "5 mg", frequency: "QD" }
  ), null);
});

// ── §5.3 labs ─────────────────────────────────────────────────────────────────
check("§5.3: exact duplicate labs auto-collapse; near-duplicates surface as conflicts", () => {
  const staged = [
    { id: "a", fields: { test: "ALT", value: "28", collected_date: "2026-05-18" } },
    { id: "b", fields: { test: "AST", value: "99", collected_date: "2026-05-18" } },
    { id: "c", fields: { test: "WBC", value: "5.8", collected_date: "2026-05-18" } },
    { id: "d", fields: { test: "WBC", value: "5.8", collected_date: "2026-05-18" } }, // staged-vs-staged exact dup
  ];
  const existing = [
    { name: "ALT", value: "28", date: "2026-05-18" },   // exact dup vs record
    { name: "AST", value: "24", date: "2026-05-18" },   // same test/date, different value
  ];
  const { collapse, conflicts } = dup.analyzeLabs(staged, existing);
  assert.deepEqual(collapse.sort(), ["a", "d"]);
  assert.ok(conflicts.has("b"), "AST value mismatch is a conflict");
  assert.ok(!conflicts.has("c"));
});

// ── Confirmed writes (§5.1: the only write path) ──────────────────────────────
check("confirm: medication write carries §4.5 Historical default + source stamp; staged → confirmed", () => {
  localStorage.clear();
  state.saveState({ phase: 4 });
  staging.stageExtractionResult(fixture.buildFixtureResult(), [], NOW);
  const staleMed = staging.getItems({ category: "medication" }).find(m => m.default_historical);
  const entry = confirm.confirmItemToRecord(staleMed);
  assert.equal(entry.status, "inactive", "historical default");
  assert.equal(entry.source, "Imported from document");
  const meds = JSON.parse(localStorage.getItem("mi_meds_full"));
  assert.equal(meds.length, 1);
  assert.equal(staging.getItems({ status: "confirmed" }).length, 1);
});
check("confirm: fresh medication defaults Active; editor override wins", () => {
  const freshMed = staging.getItems({ category: "medication", status: "staged" }).find(m => !m.default_historical);
  const entry = confirm.confirmItemToRecord(freshMed, { statusOverride: "active" });
  assert.equal(entry.status, "active");
});
check("confirm: lab maps to the app's mi_labs shape (name/value/refRange/date)", () => {
  const lab = staging.getItems({ category: "lab", status: "staged" })[0];
  const entry = confirm.confirmItemToRecord(lab);
  assert.ok(entry.name && "value" in entry && "date" in entry);
  assert.ok(entry.refRange.includes("-"));
  assert.equal(JSON.parse(localStorage.getItem("mi_labs")).length, 1);
});
check("§5.3 resolutions: keep-both flags BOTH entries for review", () => {
  const med = staging.getItems({ category: "medication", status: "staged" })[0];
  const existing = JSON.parse(localStorage.getItem("mi_meds_full"))[0];
  confirm.resolveKeepBoth(med, existing);
  const meds = JSON.parse(localStorage.getItem("mi_meds_full"));
  const flagged = meds.filter(m => m.reviewFlag === "kept-both-duplicate");
  assert.equal(flagged.length, 2);
});
check("§5.3 resolutions: merge applies only the picked staged fields onto the existing entry", () => {
  const med = staging.getItems({ category: "medication", status: "staged" })[0];
  const existing = JSON.parse(localStorage.getItem("mi_meds_full"))[0];
  const beforeName = existing.name;
  confirm.resolveMerge(med, existing, { frequency: "staged", name: "current" });
  const after = JSON.parse(localStorage.getItem("mi_meds_full")).find(m => m.id === existing.id);
  assert.equal(after.name, beforeName, "unpicked field unchanged");
  assert.ok(after.frequency, "picked field applied");
});
check("§5.3 resolutions: keep-current soft-rejects the staged item (recoverable)", () => {
  const med = staging.getItems({ category: "medication", status: "staged" })[0];
  if (med) {
    confirm.resolveKeepCurrent(med);
    assert.equal(staging.getStagedStore().items.find(i => i.id === med.id).status, "rejected");
  }
});

// ═══ WP4: first-artifact engine (§6) ═════════════════════════════════════════

const engine = await import("file:///C:/Documents/Medical/IntelliTrax/Code/src/lib/artifactEngine.js");

function seedBasics() {
  localStorage.clear();
  localStorage.setItem("mi_profile_personal", JSON.stringify({ name: "Test Patient", dob: "1970-03-03" }));
  state.saveState({ phase: 4, goal: "emergency_packet", tier0: { organ: "Liver", tx_date: "2023-08-12" } });
}

check("§6 emergency packet: minimum = Tier 0 + ≥1 med + allergies reviewed; name/DOB precede everything (§3.2)", () => {
  localStorage.clear();
  state.saveState({ phase: 4, goal: "emergency_packet" });
  let e = engine.evaluateGoalMinimum("emergency_packet");
  assert.deepEqual(e.missing.map(m => m.key), ["name_dob", "tier0", "medication", "allergies"]);
  seedBasics();
  localStorage.setItem("mi_meds_full", JSON.stringify([{ id: 1, name: "Tacrolimus", status: "active" }]));
  e = engine.evaluateGoalMinimum("emergency_packet");
  assert.deepEqual(e.missing.map(m => m.key), ["allergies"], "only allergies left");
  assert.equal(e.artifact, "Emergency Card");
});

check("§6: NKDA is a positive assertion — it satisfies 'allergies reviewed'; a real allergy revokes it", () => {
  assert.equal(engine.evaluateGoalMinimum("emergency_packet").satisfied, false);
  engine.assertNoKnownAllergies(new Date("2026-07-16T12:00:00"));
  assert.equal(engine.hasNkdaAssertion(), true);
  assert.equal(engine.evaluateGoalMinimum("emergency_packet").satisfied, true);
  engine.clearNkdaAssertion();
  assert.equal(engine.evaluateGoalMinimum("emergency_packet").satisfied, false);
});

check("§6/C5: evaluateAndFire fires exactly once, stamps artifact_generated", () => {
  engine.assertNoKnownAllergies(); // this call itself satisfies + fires
  const s1 = state.loadState();
  assert.equal(s1.artifact_generated.artifact, "Emergency Card");
  const second = engine.evaluateAndFire();
  assert.equal(second.fired, false, "never fires twice");
});

check("§6: medication-report goals need only one confirmed med; track goal queues the labs-import task", () => {
  localStorage.clear();
  localStorage.setItem("mi_profile_personal", JSON.stringify({ name: "T", dob: "1970-01-01" }));
  state.saveState({ phase: 4, goal: "track_meds_labs" });
  assert.equal(engine.evaluateGoalMinimum("track_meds_labs").satisfied, false);
  localStorage.setItem("mi_meds_full", JSON.stringify([{ id: 1, name: "Prednisone", status: "active" }]));
  const r = engine.evaluateAndFire();
  assert.equal(r.fired, true);
  const s = state.loadState();
  assert.equal(s.artifact_generated.artifact, "Medication Report");
  assert.equal(s.labs_import_task_queued, true, "§6: labs-import task queued for the track goal");
});

check("§6 patient profile: conditions requirement accepts the explicit 'no active conditions' assertion", () => {
  localStorage.clear();
  localStorage.setItem("mi_profile_personal", JSON.stringify({ name: "T", dob: "1970-01-01" }));
  localStorage.setItem("mi_meds_full", JSON.stringify([{ id: 1, name: "X" }]));
  localStorage.setItem("mi_allergies", JSON.stringify([{ id: 1, name: "Penicillin" }]));
  state.saveState({ phase: 4, goal: "patient_profile", tier0: { organ: "Liver", tx_date: "2023-01-01" } });
  assert.deepEqual(engine.evaluateGoalMinimum("patient_profile").missing.map(m => m.key), ["condition"]);
  engine.assertNoActiveConditions();
  assert.equal(engine.evaluateGoalMinimum("patient_profile").satisfied, true);
});

check("§6 appointment prep: needs an UPCOMING appointment with date+provider+specialty; the insert satisfies it", () => {
  localStorage.clear();
  localStorage.setItem("mi_profile_personal", JSON.stringify({ name: "T", dob: "1970-01-01" }));
  localStorage.setItem("mi_meds_full", JSON.stringify([{ id: 1, name: "X" }]));
  localStorage.setItem("mi_allergies", JSON.stringify([{ id: 1, name: "Y" }]));
  state.saveState({ phase: 4, goal: "appointment_prep" });
  // a past appointment does not count
  localStorage.setItem("mi_appointments", JSON.stringify([{ id: 1, status: "upcoming", date: "2020-01-01", provider: "Dr. A", specialty: "Hepatology" }]));
  assert.deepEqual(engine.evaluateGoalMinimum("appointment_prep").missing.map(m => m.key), ["appointment"]);
  const r = engine.addUpcomingAppointment({ provider: "Dr. Chen", specialty: "Transplant Hepatology", date: "2026-09-01" });
  assert.equal(r.fired, true);
  assert.equal(state.loadState().artifact_generated.artifact, "Consultation Prep Brief");
  const appt = JSON.parse(localStorage.getItem("mi_appointments"))[0];
  assert.equal(appt.source, "Entered manually");
});

check("§6/C5: a queue confirmation triggers the artifact the moment the minimum is met", () => {
  seedBasics();
  state.saveState({ goal: "organize_meds" });
  staging.stageExtractionResult(fixture.buildFixtureResult(), [], NOW);
  const med = staging.getItems({ category: "medication" }).find(m => !m.default_historical);
  confirm.confirmItemToRecord(med); // §6 hook inside the confirm path
  assert.equal(state.loadState().artifact_generated?.artifact, "Medication Report", "fired from the confirm path with labs still unreviewed (C5)");
});

check("confirm path: a confirmed allergy revokes an earlier NKDA assertion", () => {
  seedBasics();
  engine.assertNoKnownAllergies();
  assert.equal(engine.hasNkdaAssertion(), true);
  staging.stageExtractionResult(fixture.buildFixtureResult(), [], NOW);
  const allergy = staging.getItems({ category: "allergy" })[0];
  confirm.confirmItemToRecord(allergy);
  assert.equal(engine.hasNkdaAssertion(), false, "NKDA cleared by a real allergy");
});

console.log(`\n${pass} passed, ${fail} failed (onboarding)`);
if (fail > 0) process.exit(1);
