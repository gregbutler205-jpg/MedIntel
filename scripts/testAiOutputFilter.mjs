// ── AI-09 output-filter tests (AUDIT_SEC_02 F-03) ───────────────────────────
// The filter has two failure modes that BOTH matter: missing a real prohibited
// directive (under-blocking) AND censoring the safe caution sentences the CSC
// explicitly wants the model to produce (over-blocking). This suite pins both
// directions — the safe-sentence cases are as load-bearing as the violation
// cases, because a filter that eats "don't stop your meds without asking your
// doctor" is worse than no filter. Run: npm run test:ai-filter

import assert from "node:assert/strict";
import { scanForProhibitedDirectives } from "../src/lib/aiOutputFilter.js";

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("PASS — " + m); } else { fail++; console.log("FAIL — " + m); } };

const flags = t => scanForProhibitedDirectives(t).flagged;

// ── MUST flag: second-person / first-person dose+action directives ───────────
ok(flags("You should increase your tacrolimus to 5 mg twice daily."), "flags 'you should increase your ... dose'");
ok(flags("I recommend you stop taking the prednisone."), "flags 'I recommend you stop taking ...'");
ok(flags("Increase your dose to 4 mg starting tomorrow."), "flags bare imperative 'Increase your dose ...'");
ok(flags("Stop taking your aspirin immediately."), "flags imperative 'Stop taking your ...'");
ok(flags("You need to double your mycophenolate."), "flags 'you need to double ...'");
ok(flags("Your potassium is high. You should reduce your dose."), "flags a directive even when it follows a benign sentence");

// ── MUST NOT flag: the safe caution / guardrail sentences the CSC wants ──────
ok(!flags("Don't stop taking your medication without talking to your doctor first."), "does NOT flag the 'don't stop without asking' caution");
ok(!flags("Never change your dose on your own — check with your care team."), "does NOT flag 'never change your dose on your own'");
ok(!flags("You should not adjust your medication without your coordinator's guidance."), "does NOT flag 'you should not adjust ...'");
ok(!flags("Only increase your dose if your doctor tells you to."), "does NOT flag the conditional 'only ... if your doctor'");
ok(!flags("Ask your care team whether your tacrolimus dose should change."), "does NOT flag a neutral 'ask your care team whether' sentence");

// ── MUST NOT flag: ordinary informational / record-echo text ─────────────────
ok(!flags("Your tacrolimus level was 4.8 ng/mL on April 28, within your target range."), "does NOT flag a plain lab statement");
ok(!flags("These questions may help you prepare for your hepatology visit."), "does NOT flag appointment-prep framing");
ok(!flags("Your care team increased your prednisone at your last visit."), "does NOT flag a past-tense record echo (a fact, not an instruction)");
ok(!flags(""), "empty input is not flagged");

// ── Redaction behavior: the violating sentence is replaced, the rest survives ─
{
  const input = "Your creatinine is stable. You should increase your dose to 5 mg. Keep hydrating.";
  const { flagged, redactedText, matches } = scanForProhibitedDirectives(input);
  ok(flagged && matches.length === 1, "one match on a 3-sentence input with a single violation");
  ok(redactedText.includes("Your creatinine is stable") && redactedText.includes("Keep hydrating"), "the non-violating sentences are preserved");
  ok(!redactedText.includes("increase your dose to 5 mg"), "the violating directive text is removed");
  ok(redactedText.includes("Insina Health removed a line"), "a visible redaction note replaces the removed sentence");
}

// Purity: no throw on odd inputs
ok(scanForProhibitedDirectives(null).redactedText === "", "null input yields empty string, no throw");
ok(scanForProhibitedDirectives(undefined).flagged === false, "undefined input is not flagged, no throw");

console.log(`\n${pass} passed, ${fail} failed (ai-output-filter)`);
process.exit(fail ? 1 : 0);
