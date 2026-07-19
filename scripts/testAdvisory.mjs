// ── DEC-PNN pending: tripwire advisory — §9 test suite ───────────────────────
// Deterministic checks for the evaluation engine + verbatim template snapshots +
// the no-AI-import property. Run: npm run test:advisory
//
// Uses a FIXED clock so the 14-day staged-window cases never depend on the wall
// clock. Node has Date; the advisory modules are pure data/JS (no React/DOM), so
// they import cleanly here.

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { evaluateEntry } from "../src/lib/advisoryEngine.js";
import { buildAdvisory, TEMPLATES, ADVISORY_TEMPLATES_VERSION } from "../src/data/advisoryTemplates.js";

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
  const a = buildAdvisory({ tier: "EMERGENCY", metric: sys.displayName, value: sys.value, coordinator: COORD });
  eq(a.paragraphs[0],
    "Your systolic blood pressure reading of 85 is in the emergency range. Call 911 or go to the nearest Emergency Department now. Notify your transplant coordinator: Dana Reyes, RN, (555) 555-0142. Show your Emergency Card to EMS or ED staff.",
    "§9.1 EMERGENCY+coordinator advisory renders verbatim");
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

// ── §9.5 Staged K 6.8 dated 3 days ago → takeover with staged variant text ─────
{
  const h = evaluateEntry("potassium", 6.8, { source: "staged", resultDate: daysAgo(3), now: NOW });
  eq(h.takeover, true, "§9.5 staged 3d → takeover");
  const a = buildAdvisory({ tier: h.tier, metric: h.displayName, value: h.value, coordinator: COORD, staged: { date: h.resultDate } });
  eq(a.paragraphs.length, 2, "§9.5 staged advisory has the appended paragraph");
  eq(a.paragraphs[1],
    `This value is from your imported document dated ${daysAgo(3)}. Verify it against the original report. If you have not already discussed this result with your care team, contact them now.`,
    "§9.5 staged appendix renders verbatim");
}

// ── §9.6 No coordinator → both tier fallbacks render, no blank contact ─────────
{
  const em = buildAdvisory({ tier: "EMERGENCY", metric: "systolic blood pressure", value: 85, coordinator: null });
  eq(em.paragraphs[0],
    "Your systolic blood pressure reading of 85 is in the emergency range. Call 911 or go to the nearest Emergency Department now. Show your Emergency Card to EMS or ED staff.",
    "§9.6 EMERGENCY no-coordinator renders verbatim");
  eq(em.secondaryLine, "Add your care team so future alerts include direct contacts.", "§9.6 EMERGENCY no-coord shows care-team prompt");
  const td = buildAdvisory({ tier: "TODAY", metric: "potassium", value: 6.2, coordinator: null });
  eq(td.paragraphs[0],
    "Your potassium reading of 6.2 is outside the safe range. Contact your doctor or an urgent care clinic today. If you develop dizziness, fainting, chest pain, or shortness of breath, call 911.",
    "§9.6 TODAY no-coordinator renders verbatim");
  ok(!/\{|coordinator/i.test(em.paragraphs[0]) && !/\{|coordinator/i.test(td.paragraphs[0]), "§9.6 no blank/placeholder contact leaks through");
}

// ── §9.7 No model call; advisory modules import nothing from the AI layer ──────
{
  const files = [
    "lib/advisoryEngine.js",
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
}

// ── Template version + verbatim snapshot of every template constant ────────────
{
  eq(ADVISORY_TEMPLATES_VERSION, "1.0.0", "templates version is 1.0.0");
  eq(TEMPLATES.EMERGENCY_COORDINATOR,
    "Your {metric} reading of {value} is in the emergency range. Call 911 or go to the nearest Emergency Department now. Notify your transplant coordinator: {coordinator_name}, {coordinator_phone}. Show your Emergency Card to EMS or ED staff.",
    "snapshot: EMERGENCY_COORDINATOR");
  eq(TEMPLATES.EMERGENCY_NO_COORDINATOR,
    "Your {metric} reading of {value} is in the emergency range. Call 911 or go to the nearest Emergency Department now. Show your Emergency Card to EMS or ED staff.",
    "snapshot: EMERGENCY_NO_COORDINATOR");
  eq(TEMPLATES.TODAY_COORDINATOR,
    "Your {metric} reading of {value} is outside the safe range. Contact your transplant coordinator today: {coordinator_name}, {coordinator_phone}. If you develop dizziness, fainting, chest pain, or shortness of breath, call 911.",
    "snapshot: TODAY_COORDINATOR");
  eq(TEMPLATES.TODAY_NO_COORDINATOR,
    "Your {metric} reading of {value} is outside the safe range. Contact your doctor or an urgent care clinic today. If you develop dizziness, fainting, chest pain, or shortness of breath, call 911.",
    "snapshot: TODAY_NO_COORDINATOR");
  eq(TEMPLATES.STAGED_APPENDIX,
    "This value is from your imported document dated {date}. Verify it against the original report. If you have not already discussed this result with your care team, contact them now.",
    "snapshot: STAGED_APPENDIX");
  eq(TEMPLATES.CARE_TEAM_PROMPT,
    "Add your care team so future alerts include direct contacts.",
    "snapshot: CARE_TEAM_PROMPT");
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
