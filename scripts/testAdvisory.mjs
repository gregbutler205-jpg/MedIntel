// ── Tripwire advisory — §9 test suite (+ DEC-043 disposition coverage) ───────
// Deterministic checks for the evaluation engine + verbatim template snapshots +
// the no-AI-import property. v1.1.0 additions (2026-07-21 review disposition):
// band fall-through boundary battery, exact-critical-value pins, audit
// readingId/verification fields, verify-first staged flow, per-metric symptom
// sentences, and the custom-range/urgency separation guard.
// Run: npm run test:advisory
//
// Uses a FIXED clock so the 14-day staged-window cases never depend on the wall
// clock. Node has Date; the advisory modules are pure data/JS (no React/DOM), so
// they import cleanly here.

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { evaluateEntry } from "../src/lib/advisoryEngine.js";
import {
  buildAdvisory, buildStagedVerify, TEMPLATES, ADVISORY_TEMPLATES_VERSION,
  METRIC_SYMPTOM_SENTENCES, DEFAULT_SYMPTOM_SENTENCE,
} from "../src/data/advisoryTemplates.js";
import { TRIPWIRE_TABLE_VERSION } from "../src/data/tripwireTable.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..", "src");

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log("PASS — " + msg); } else { fail++; console.log("FAIL — " + msg); } }
function eq(a, b, msg) { ok(a === b, `${msg}${a === b ? "" : `  (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`}`); }

// Fixed reference clock for staged-window math.
const NOW = Date.parse("2026-07-19T12:00:00Z");
const daysAgo = (n) => new Date(NOW - n * 86400000).toISOString().slice(0, 10);

const COORD = { name: "Dana Reyes, RN", phone: "(555) 555-0142" };

// ── §9.1 BP 85/58 manual → EMERGENCY fires, template verbatim ─────────────────
{
  const sys = evaluateEntry("bp_s", 85, { source: "manual" });
  ok(sys && sys.tier === "EMERGENCY" && sys.takeover === true, "§9.1 systolic 85 manual → EMERGENCY takeover");
  const dia = evaluateEntry("bp_d", 58, { source: "manual" });
  eq(dia, null, "§9.1 diastolic 58 → no fire (normal)");
  const a = buildAdvisory({ tier: "EMERGENCY", metricId: "bp_s", metric: sys.displayName, value: sys.value, unit: sys.unit, coordinator: COORD, source: "manual", verification: sys.verification });
  eq(a.paragraphs[0],
    "Your systolic blood pressure reading of 85 mmHg meets Insina Health's emergency threshold. Call 911 now, or have someone take you to the nearest Emergency Department — do not drive yourself if you feel faint, confused, short of breath, or weak, or have chest pain. Notify your transplant coordinator: Dana Reyes, RN, (555) 555-0142. Show your Emergency Card to EMS or ED staff.",
    "§9.1 EMERGENCY+coordinator advisory renders verbatim (v1.1.0 wording, value carries unit)");
  eq(a.metaLine, "Source: entered manually · patient-entered", "§9.1 meta line states source + verification");
}

// ── §9.2 BP 98/62 manual → no fire ────────────────────────────────────────────
// Greg's ruling: §9 wins over §1 — systolic in the 90s does NOT fire. The
// systolic low-side TODAY band was removed (low side is EMERGENCY-only, <90).
// This documents the v1 absolutes-only gap: a low-for-them BP inside the normal
// band is not flagged (a baseline-relative rule is table v2).
{
  eq(evaluateEntry("bp_s", 98, { source: "manual" }), null, "§9.2 systolic 98 → no fire (low-side TODAY band removed per ruling)");
  eq(evaluateEntry("bp_d", 62, { source: "manual" }), null, "§9.2 diastolic 62 → no fire (normal)");
  eq(evaluateEntry("bp_s", 89, { source: "manual" })?.tier, "EMERGENCY", "§9.2 systolic 89 → EMERGENCY (low side is emergency-only)");
}

// ── §9.3 Potassium both-ends ──────────────────────────────────────────────────
{
  eq(evaluateEntry("potassium", 2.4, { source: "manual" })?.tier, "EMERGENCY", "§9.3 K 2.4 → EMERGENCY (low end)");
  eq(evaluateEntry("potassium", 6.8, { source: "manual" })?.tier, "EMERGENCY", "§9.3 K 6.8 → EMERGENCY (high end)");
  // TODAY middle bands
  eq(evaluateEntry("potassium", 2.7, { source: "manual" })?.tier, "TODAY", "§9.3 K 2.7 → TODAY");
  eq(evaluateEntry("potassium", 6.2, { source: "manual" })?.tier, "TODAY", "§9.3 K 6.2 → TODAY");
  eq(evaluateEntry("potassium", 4.0, { source: "manual" }), null, "§9.3 K 4.0 → no fire (normal)");
}

// ── §9.4 Staged K 6.8 dated 20 days ago → no takeover, badge ───────────────────
{
  const h = evaluateEntry("potassium", 6.8, { source: "staged", resultDate: daysAgo(20), now: NOW });
  ok(h && h.tier === "EMERGENCY", "§9.4 staged K 6.8 (20d) → still EMERGENCY tier");
  eq(h.withinWindow, false, "§9.4 staged 20d → outside 14-day window");
  eq(h.takeover, false, "§9.4 staged 20d → NO takeover (badge only)");
}

// ── §9.5 Staged K 6.8 dated 3 days ago → verify-first, then advisory ──────────
{
  const h = evaluateEntry("potassium", 6.8, { source: "staged", resultDate: daysAgo(3), readingId: "item_42", now: NOW });
  eq(h.takeover, true, "§9.5 staged 3d → takeover");
  eq(h.verification, "unverified-import", "§9.5 staged hit is unverified-import until the patient confirms");
  eq(h.readingId, "item_42", "§9.5 hit carries the staged item's id for the audit log");
  // DEC-043 item 3: verify-first prompt renders BEFORE the advisory workflow.
  eq(buildStagedVerify({ metric: h.displayName, value: h.value, unit: h.unit, date: h.resultDate }),
    `The imported value appears to be potassium 6.8 mEq/L, from your document dated ${daysAgo(3)}. Verify it against the original report now.`,
    "§9.5 verify-first prompt renders verbatim");
  // The POST-verification advisory: dated main sentence + verified appendix.
  const a = buildAdvisory({ tier: h.tier, metricId: h.metric, metric: h.displayName, value: h.value, unit: h.unit, coordinator: COORD, staged: { date: h.resultDate }, source: "staged", verification: "patient-verified" });
  eq(a.paragraphs.length, 2, "§9.5 staged advisory has the appended paragraph");
  ok(a.paragraphs[0].startsWith(`Your potassium reading of 6.8 mEq/L, dated ${daysAgo(3)}, meets Insina Health's emergency threshold.`),
    "§9.5 staged main sentence carries the result date (context-rich)");
  eq(a.paragraphs[1],
    `You verified this value against your imported document dated ${daysAgo(3)}. If you have not already discussed this result with your care team, contact them now.`,
    "§9.5 verified appendix renders verbatim (keeps the DEC-039 proactive-contact clause)");
  eq(a.metaLine, "Source: imported document · verified against the original", "§9.5 meta line reflects verification");
}

// ── §9.6 No coordinator → both tier fallbacks render, no blank contact ─────────
{
  const em = buildAdvisory({ tier: "EMERGENCY", metricId: "bp_s", metric: "systolic blood pressure", value: 85, unit: "mmHg", coordinator: null, source: "manual" });
  eq(em.paragraphs[0],
    "Your systolic blood pressure reading of 85 mmHg meets Insina Health's emergency threshold. Call 911 now, or have someone take you to the nearest Emergency Department — do not drive yourself if you feel faint, confused, short of breath, or weak, or have chest pain. Show your Emergency Card to EMS or ED staff.",
    "§9.6 EMERGENCY no-coordinator renders verbatim");
  eq(em.secondaryLine, "Add your care team so future alerts include direct contacts.", "§9.6 EMERGENCY no-coord shows care-team prompt");
  const td = buildAdvisory({ tier: "TODAY", metricId: "potassium", metric: "potassium", value: 6.2, unit: "mEq/L", coordinator: null, source: "manual" });
  eq(td.paragraphs[0],
    "Your potassium reading of 6.2 mEq/L meets Insina Health's same-day alert threshold. Contact your transplant program's main or after-hours line, or the clinician who ordered this test, today. If you cannot reach a clinician promptly, go to the nearest Emergency Department. If you develop chest pain, palpitations, or severe weakness, call 911.",
    "§9.6 TODAY no-coordinator renders verbatim (transplant-line fallback, per-metric symptoms)");
  ok(!/\{/.test(em.paragraphs[0]) && !/\{/.test(td.paragraphs[0]), "§9.6 no blank placeholder leaks through");
  ok(!/urgent care/i.test(td.paragraphs[0]), "§9.6 the generic urgent-care fallback is gone");
}

// ── §9.7 No model call; advisory modules import nothing from the AI layer ──────
{
  const files = [
    "lib/advisoryEngine.js",
    "lib/advisoryRuntime.js",
    "lib/advisoryLog.js",
    "data/advisoryTemplates.js",
    "data/tripwireTable.js",
    "config/tripwireDefaults.js",
  ];
  const banned = /from\s+["'][^"']*(prompts\/|aiClient|anthropic|companionAI|\/proxy|labDigest)/;
  let clean = true;
  for (const f of files) {
    const src = readFileSync(join(SRC, f), "utf8");
    if (banned.test(src)) { clean = false; console.log("   AI import found in " + f); }
    if (/fetch\(|XMLHttpRequest|import\(/.test(src)) { clean = false; console.log("   network/dynamic-import found in " + f); }
  }
  ok(clean, "§9.7 advisory pipeline has no AI import and no network call");

  // DEC-043 item 7: urgency classification is fully separate from the patient's
  // display ranges — the advisory pipeline never reads custom/provider ranges.
  const rangeRefs = /customRanges|mi_lab_custom_ranges|custom_ranges/;
  let separated = true;
  for (const f of files) {
    const src = readFileSync(join(SRC, f), "utf8");
    if (rangeRefs.test(src)) { separated = false; console.log("   custom-range reference found in " + f); }
  }
  ok(separated, "DEC-043.7 advisory pipeline never reads patient/provider display ranges (urgency stays table-only)");
}

// ── Template version + verbatim snapshot of every template constant ────────────
{
  eq(ADVISORY_TEMPLATES_VERSION, "1.1.0", "templates version is 1.1.0");
  eq(TRIPWIRE_TABLE_VERSION, "1.1.0-draft", "threshold table version is 1.1.0-draft");
  eq(TEMPLATES.EMERGENCY_COORDINATOR,
    "Your {metric} reading of {value}{date_clause} meets Insina Health's emergency threshold. Call 911 now, or have someone take you to the nearest Emergency Department — do not drive yourself if you feel faint, confused, short of breath, or weak, or have chest pain. Notify your transplant coordinator: {coordinator_name}, {coordinator_phone}. Show your Emergency Card to EMS or ED staff.",
    "snapshot: EMERGENCY_COORDINATOR");
  eq(TEMPLATES.EMERGENCY_NO_COORDINATOR,
    "Your {metric} reading of {value}{date_clause} meets Insina Health's emergency threshold. Call 911 now, or have someone take you to the nearest Emergency Department — do not drive yourself if you feel faint, confused, short of breath, or weak, or have chest pain. Show your Emergency Card to EMS or ED staff.",
    "snapshot: EMERGENCY_NO_COORDINATOR");
  eq(TEMPLATES.TODAY_COORDINATOR,
    "Your {metric} reading of {value}{date_clause} meets Insina Health's same-day alert threshold. Contact your transplant coordinator today: {coordinator_name}, {coordinator_phone}. {symptom_sentence}",
    "snapshot: TODAY_COORDINATOR");
  eq(TEMPLATES.TODAY_NO_COORDINATOR,
    "Your {metric} reading of {value}{date_clause} meets Insina Health's same-day alert threshold. Contact your transplant program's main or after-hours line, or the clinician who ordered this test, today. If you cannot reach a clinician promptly, go to the nearest Emergency Department. {symptom_sentence}",
    "snapshot: TODAY_NO_COORDINATOR");
  eq(TEMPLATES.STAGED_VERIFY,
    "The imported value appears to be {metric} {value}, from your document dated {date}. Verify it against the original report now.",
    "snapshot: STAGED_VERIFY");
  eq(TEMPLATES.STAGED_VERIFIED_APPENDIX,
    "You verified this value against your imported document dated {date}. If you have not already discussed this result with your care team, contact them now.",
    "snapshot: STAGED_VERIFIED_APPENDIX");
  eq(TEMPLATES.CARE_TEAM_PROMPT,
    "Add your care team so future alerts include direct contacts.",
    "snapshot: CARE_TEAM_PROMPT");
  // Per-metric symptom sentences: every advisory metric has one; none predict
  // physician actions; all end by routing to 911.
  const metricIds = ["bp_s", "bp_d", "hr", "o2", "temp", "potassium", "sodium", "glucose", "hemoglobin", "platelets"];
  ok(metricIds.every(id => typeof METRIC_SYMPTOM_SENTENCES[id] === "string" && METRIC_SYMPTOM_SENTENCES[id].endsWith("call 911.")),
    "snapshot: every metric has its own symptom sentence, each routing to 911");
  eq(DEFAULT_SYMPTOM_SENTENCE, "If you develop dizziness, fainting, chest pain, or shortness of breath, call 911.",
    "snapshot: default symptom sentence (fallback only)");
}

// ── Vitals boundary spot-checks (temp inclusive, SpO2, HR both-ends) ───────────
{
  eq(evaluateEntry("temp", 103.0, { source: "manual" })?.tier, "EMERGENCY", "temp 103.0 → EMERGENCY (inclusive)");
  eq(evaluateEntry("temp", 102.9, { source: "manual" })?.tier, "TODAY", "temp 102.9 → TODAY");
  eq(evaluateEntry("temp", 100.4, { source: "manual" })?.tier, "TODAY", "temp 100.4 → TODAY (inclusive low)");
  eq(evaluateEntry("temp", 100.3, { source: "manual" }), null, "temp 100.3 → no fire");
  eq(evaluateEntry("o2", 87, { source: "manual" })?.tier, "EMERGENCY", "SpO2 87 → EMERGENCY");
  eq(evaluateEntry("o2", 90, { source: "manual" })?.tier, "TODAY", "SpO2 90 → TODAY");
  eq(evaluateEntry("o2", 92, { source: "manual" }), null, "SpO2 92 → no fire");
  eq(evaluateEntry("hr", 39, { source: "manual" })?.tier, "EMERGENCY", "HR 39 → EMERGENCY");
  eq(evaluateEntry("hr", 200, { source: "manual" })?.tier, "EMERGENCY", "HR 200 → EMERGENCY");
  eq(evaluateEntry("hr", 130, { source: "manual" })?.tier, "TODAY", "HR 130 → TODAY");
  eq(evaluateEntry("bp_s", 200, { source: "manual" })?.tier, "TODAY", "systolic 200 → TODAY (inclusive), not EMERGENCY");
  eq(evaluateEntry("bp_s", 201, { source: "manual" })?.tier, "EMERGENCY", "systolic 201 → EMERGENCY");
}

// ── DEC-043 item 1: fall-through gaps CLOSED (fractional values now classify) ──
{
  eq(evaluateEntry("hemoglobin", 7.95, { source: "manual" })?.tier, "TODAY", "Hgb 7.95 → TODAY (was: nothing — the gap that flagged this fix)");
  eq(evaluateEntry("potassium", 2.95, { source: "manual" })?.tier, "TODAY", "K 2.95 → TODAY (gap closed)");
  eq(evaluateEntry("sodium", 129.5, { source: "manual" })?.tier, "TODAY", "Na 129.5 → TODAY (gap closed)");
  eq(evaluateEntry("glucose", 69.5, { source: "manual" })?.tier, "TODAY", "glucose 69.5 → TODAY (gap closed)");
  eq(evaluateEntry("platelets", 49.5, { source: "manual" })?.tier, "TODAY", "platelets 49.5 → TODAY (gap closed)");
  eq(evaluateEntry("o2", 91.5, { source: "manual" })?.tier, "TODAY", "SpO2 91.5 → TODAY (gap closed)");
  eq(evaluateEntry("hr", 49.5, { source: "manual" })?.tier, "TODAY", "HR 49.5 → TODAY (gap closed)");
  // Exclusive uppers: the first normal value stays silent.
  eq(evaluateEntry("hemoglobin", 8.0, { source: "manual" }), null, "Hgb 8.0 → no fire (band edge exclusive)");
  eq(evaluateEntry("potassium", 3.0, { source: "manual" }), null, "K 3.0 → no fire");
  eq(evaluateEntry("sodium", 130, { source: "manual" }), null, "Na 130 → no fire");
  eq(evaluateEntry("glucose", 70, { source: "manual" }), null, "glucose 70 → no fire");
  eq(evaluateEntry("platelets", 50, { source: "manual" }), null, "platelets 50 → no fire");
  eq(evaluateEntry("hr", 50, { source: "manual" }), null, "HR 50 → no fire");
}

// ── DEC-043 item 1: exact-critical-value pins (current convention: the exact
//    bound classifies TODAY; EMERGENCY is exclusive — a decision point recorded
//    in CLINICAL_REVIEW_MATRIX.md; these pins EXIST so any ruling change is a
//    deliberate, visible edit) ───────────────────────────────────────────────
{
  eq(evaluateEntry("potassium", 6.5, { source: "manual" })?.tier, "TODAY", "exact K 6.5 → TODAY (matrix decision point)");
  eq(evaluateEntry("potassium", 2.5, { source: "manual" })?.tier, "TODAY", "exact K 2.5 → TODAY");
  eq(evaluateEntry("sodium", 120, { source: "manual" })?.tier, "TODAY", "exact Na 120 → TODAY");
  eq(evaluateEntry("sodium", 160, { source: "manual" })?.tier, "TODAY", "exact Na 160 → TODAY");
  eq(evaluateEntry("glucose", 500, { source: "manual" })?.tier, "TODAY", "exact glucose 500 → TODAY");
  eq(evaluateEntry("hemoglobin", 7.0, { source: "manual" })?.tier, "TODAY", "exact Hgb 7.0 → TODAY");
  eq(evaluateEntry("platelets", 20, { source: "manual" })?.tier, "TODAY", "exact platelets 20 → TODAY");
}

// ── DEC-043 item 2: audit fields on the hit ───────────────────────────────────
{
  const manual = evaluateEntry("potassium", 6.8, { source: "manual", readingId: 1234 });
  eq(manual.readingId, 1234, "manual hit carries readingId");
  eq(manual.verification, "patient-entered", "manual hit verification = patient-entered");
  const noId = evaluateEntry("potassium", 6.8, { source: "manual" });
  eq(noId.readingId, null, "readingId defaults to null when the caller has none");
}

// ── Single-source guard: advisory EMERGENCY bounds == library urgent bounds ────
{
  const { DEFAULT_LIBRARY, ADVISORY_LAB_BANDS } = await import("../src/config/tripwireDefaults.js");
  let consistent = true;
  for (const [id, band] of Object.entries(ADVISORY_LAB_BANDS)) {
    const a = DEFAULT_LIBRARY.analytes.find((x) => x.canonicalId === id);
    if (!a) { consistent = false; continue; }
    if (a.urgentLow != null && band.emLow !== a.urgentLow) consistent = false;
    if (a.urgentHigh != null && band.emHigh !== a.urgentHigh) consistent = false;
  }
  ok(consistent, "single-source: every advisory EMERGENCY bound equals the library urgent bound (no drift)");
}

console.log(`\n${pass} passed, ${fail} failed (advisory)`);
process.exit(fail ? 1 : 0);
