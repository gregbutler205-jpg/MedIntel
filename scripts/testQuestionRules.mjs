// ── Question-generation rules tests (2026-07-21 work order Part 1, DEC-041) ──
// The model itself can't run in CI, so the deterministic regression here is at
// the prompt layer: every surface that produces care-team questions must carry
// the QUESTION GENERATION / WHY YOU'RE ASKING / NUMERIC LIMITS block verbatim,
// the omeprazole-case prohibited/permitted shapes must be present as guidance,
// and the CSC must be provably UNTOUCHED (the work order is prompt-layer only —
// aligning CSC rule 11's "Should we...?" example is a gated CSC bump, not made
// here). Also pins doc↔code parity so INSINA_AI_PROMPTS.md and core.js can't
// drift apart silently. Run: npm run test:question-rules

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { CSC_VERSION, buildCSC, QUESTION_RULES } from "../src/lib/../prompts/core.js";
import { buildSurfaceA, PROMPT_VERSION as VER_A } from "../src/prompts/surfaceA.js";
import { buildSurfaceB1, buildSurfaceB2, PROMPT_VERSION as VER_B } from "../src/prompts/surfaceB.js";
import { buildSurfaceC, PROMPT_VERSION as VER_C } from "../src/prompts/surfaceC.js";
import { buildSurfaceG, PROMPT_VERSION as VER_G } from "../src/prompts/surfaceG.js";
import { buildSurfaceH, PROMPT_VERSION as VER_H } from "../src/prompts/surfaceH.js";

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("PASS — " + m); } else { fail++; console.log("FAIL — " + m); } };

const ID = { userId: "user-0000", age: 58, sex: "M" };
const norm = s => s.replace(/\s+/g, " ");

const SYSTEMS = {
  A:  buildSurfaceA({ ...ID }).system,
  B1: buildSurfaceB1({ ...ID }).system,
  B2: buildSurfaceB2({ ...ID }).system,
  C:  buildSurfaceC({ ...ID }).system,
  G:  buildSurfaceG({ ...ID }).system,
  H:  buildSurfaceH({ ...ID, reportType: "Consultation Prep", providerSpecialty: "Hepatology" }).system,
};

// ── The shared block reaches every question-producing surface ────────────────
for (const [name, sys] of Object.entries(SYSTEMS)) {
  ok(sys.includes("QUESTION GENERATION"), `Surface ${name} carries the QUESTION GENERATION block`);
  ok(sys.includes("WHY YOU'RE ASKING"), `Surface ${name} carries the WHY YOU'RE ASKING block`);
  ok(sys.includes("NUMERIC LIMITS AND DOSING VALUES"), `Surface ${name} carries the NUMERIC LIMITS block`);
}

// ── Rule content: umbrella, prohibited/permitted shapes, exemptions ──────────
{
  const q = norm(QUESTION_RULES);
  ok(q.includes("One umbrella question per topic, not one per concern"), "umbrella-question rule present");
  ok(q.includes('"Should we recheck my [drug] level?"') && q.includes('"Do we need to adjust timing or dose?"') && q.includes('"Should we retest [lab]?"') && q.includes('"Can we switch to [drug]?"'),
    "all four prohibited shapes present (omeprazole-case regression)");
  ok(q.includes("Is there anything we need to do differently?"), "permitted umbrella shape present");
  ok(q.includes("Which of these am I supposed to be taking?") && q.includes("clarification, not direction"), "reconciliation exemption present");
  ok(q.includes('Title the question list exactly "Questions for your care team:"'), "exact question-list title mandated");
  ok(q.includes('titled exactly "Why you\'re asking:"'), "exact education-section title mandated");
  ok(q.includes("without mechanism") && q.includes("Omeprazole can raise your tacrolimus levels"), "education states facts without mechanism (omeprazole example)");
  ok(q.includes('"your doctor may want to recheck..." is prohibited'), "education never predicts physician actions");
  ok(q.includes("Ask your physician if you'd like more information"), "settled-education pointer sentence present");
  ok(q.includes("If your doctor's answer doesn't cover any of these, ask about that one directly"), "press-further closing line present");
}

// ── Tylenol-limit regression: record-cite-or-defer pattern ───────────────────
{
  const q = norm(QUESTION_RULES);
  ok(q.includes("cite it with its source and date") && q.includes("confirm it is still current"), "documented limit → cite with source/date + confirm-current");
  ok(q.includes("set individually by the patient's team") && q.includes("general label limits do not apply"), "no documented limit → individually-set + label-limits caveat");
  ok(q.includes("transplant pharmacist") && q.includes("offer to save the confirmed value once obtained"), "defer to physician/pharmacist + offer to save the confirmed value");
}

// ── CSC untouched (the work order is prompt-layer, NOT Clinical Safety Core) ─
{
  ok(CSC_VERSION === "1.1", `CSC_VERSION remains 1.1 (got ${CSC_VERSION})`);
  const csc = buildCSC(ID);
  ok(csc.includes('phrased like: Suggested question for your care team: "Should'),
    "CSC rule 11 text is UNCHANGED (its divergence is a flagged, gated future CSC bump)");
  ok(!csc.includes("QUESTION GENERATION"), "the new block lives outside the CSC, not inside it");
}

// ── Per-surface delta references + version bumps ─────────────────────────────
{
  ok(norm(SYSTEMS.A).includes("add suggested questions per the QUESTION GENERATION rules"), "Surface A reasoning step cites the rules (rule-11 reference replaced)");
  ok(norm(SYSTEMS.A).includes("use five sections") && norm(SYSTEMS.A).includes("Why you're asking"), "Surface A response structure includes the fifth section");
  ok(norm(SYSTEMS.B1).includes("consolidate them under \"Questions for your care team:\""), "B1 consolidates its per-finding questions under the shared title");
  ok(norm(SYSTEMS.C).includes("one umbrella question per topic"), "C replaced the fixed 2-3 count with one-per-topic");
  ok(norm(SYSTEMS.G).includes("one umbrella question per topic"), "G replaced the fixed 2-3 count with one-per-topic");
  for (const [name, ver] of [["A", VER_A], ["B", VER_B], ["C", VER_C], ["G", VER_G], ["H", VER_H]]) {
    ok(/-1\.1$|^.-1\.1/.test(ver) || ver.endsWith("1.1"), `PROMPT_VERSION bumped on ${name} (${ver})`);
  }
}

// ── Doc ↔ code parity: INSINA_AI_PROMPTS.md carries the same block ───────────
{
  const doc = readFileSync(new URL("../INSINA_AI_PROMPTS.md", import.meta.url), "utf-8");
  const keyLines = [
    "One umbrella question per topic, not one per concern.",
    'Title the question list exactly "Questions for your care team:".',
    "Never predict or suggest physician actions",
    "offer to save the confirmed value once obtained.",
  ];
  for (const line of keyLines) {
    ok(doc.includes(line) && QUESTION_RULES.includes(line), `doc and code both carry: "${line.slice(0, 48)}…"`);
  }
  ok(doc.includes("I've started omeprazole twice daily since my last visit"), "doc carries the omeprazole worked example");
}

console.log(`\n${pass} passed, ${fail} failed (question-rules)`);
process.exit(fail ? 1 : 0);
