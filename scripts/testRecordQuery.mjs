// ── Deterministic record-query tests (Search answers from the record, no AI) ─
// Greg's framing: Search is a search of what's already in Insina — "which
// doctor did my EGD", "when was my last cervical MRI", "what's my dosage of
// tacrolimus". These pin that those are answered locally, that the answers are
// pure retrieval (never invented), and that the old contiguous-substring
// matching bug stays fixed. Run: npm run test:record-query

import {
  extractTerms, detectIntent, matchesTerms, sortByDate, buildDirectAnswer,
} from "../src/lib/recordQuery.js";

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("PASS — " + m); } else { fail++; console.log("FAIL — " + m); } };

const res = (category, record, title, date) => ({ category, record, title, date: date || record.date || "" });

// ── Term extraction: question scaffolding out, content in ────────────────────
{
  ok(extractTerms("which doctor did my EGD").join(",") === "egd", `"which doctor did my EGD" → egd (got ${extractTerms("which doctor did my EGD").join(",")})`);
  ok(extractTerms("When was my last cervical MRI?").join(",") === "cervical,mri", `"when was my last cervical MRI?" → cervical,mri (got ${extractTerms("When was my last cervical MRI?").join(",")})`);
  ok(extractTerms("What's my dosage of tacrolimus").join(",") === "tacrolimus", `"what's my dosage of tacrolimus" → tacrolimus (got ${extractTerms("What's my dosage of tacrolimus").join(",")})`);
  ok(extractTerms("tacrolimus").join(",") === "tacrolimus", "a bare keyword still works");
  ok(extractTerms("what is my").length === 0, "a query of pure scaffolding yields no terms (no match-everything)");
}

// ── Intent detection ─────────────────────────────────────────────────────────
{
  ok(detectIntent("which doctor did my EGD").kind === "who", "who-intent from 'which doctor did'");
  ok(detectIntent("who performed my colonoscopy").kind === "who", "who-intent from 'who performed'");
  ok(detectIntent("when was my last cervical MRI?").kind === "when", "when-intent");
  ok(detectIntent("what's my dosage of tacrolimus").kind === "dose", "dose-intent from 'dosage'");
  ok(detectIntent("how much prednisone do I take").kind === "dose", "dose-intent from 'how much'");
  ok(detectIntent("what was my last potassium level").kind === "value", "value-intent from 'level'");
  ok(detectIntent("when was my last cervical MRI?").wantsLatest === true, "'last' asks for the most recent");
  ok(detectIntent("when was my first liver biopsy").wantsFirst === true, "'first' asks for the earliest");
  ok(detectIntent("tacrolimus").kind === "generic", "a bare keyword has no special intent");
}

// ── Matching: order-independent AND (the substring bug) ──────────────────────
{
  const terms = extractTerms("cervical MRI");
  ok(matchesTerms(["MRI Cervical Spine", "Dr. Alvarez"], terms),
    "terms match out of order — 'cervical MRI' finds 'MRI Cervical Spine' (old substring match could not)");
  ok(!matchesTerms(["MRI Lumbar Spine"], terms), "a record missing one term does not match");
  ok(!matchesTerms(["Cervical biopsy"], terms), "partial term overlap is not a match (AND, not OR)");
}

// ── Greg's three questions, end to end ───────────────────────────────────────
{
  const egd = res("surgeries", { procedure: "EGD (Upper Endoscopy)", surgeon: "Dr. Ana Whitfield", facility: "Ochsner", date: "2026-03-11" }, "EGD (Upper Endoscopy)");
  const a1 = buildDirectAnswer("which doctor did my EGD", [egd]);
  ok(a1 && a1.text.startsWith("Dr. Ana Whitfield"), `Q1 names the doctor from the record (got: ${a1 && a1.text})`);
  ok(a1 && a1.text.includes("March 11, 2026"), "Q1 includes the date it happened");
  ok(a1 && a1.result === egd, "Q1 links back to its source record");

  const mriOld = res("diagnostics", { name: "MRI Cervical Spine", readingProvider: "Dr. Lin", date: "2024-09-02" }, "MRI Cervical Spine");
  const mriNew = res("diagnostics", { name: "MRI Cervical Spine w/o contrast", readingProvider: "Dr. Osei", date: "2026-05-19" }, "MRI Cervical Spine w/o contrast");
  const a2 = buildDirectAnswer("when was my last cervical MRI?", [mriOld, mriNew]);
  ok(a2 && a2.text.startsWith("May 19, 2026"), `Q2 answers with the MOST RECENT date (got: ${a2 && a2.text})`);
  ok(a2 && a2.result === mriNew, "Q2 sources the newest study, not the first match in the list");
  const a2first = buildDirectAnswer("when was my first cervical MRI", [mriOld, mriNew]);
  ok(a2first && a2first.result === mriOld, "'first' flips to the earliest study");

  const tac = res("medications", { name: "Tacrolimus", dose: "3 mg", frequency: "twice daily", status: "active" }, "Tacrolimus");
  const a3 = buildDirectAnswer("what's my dosage of tacrolimus", [tac]);
  ok(a3 && a3.text === "Tacrolimus: 3 mg, twice daily", `Q3 gives dose + frequency (got: ${a3 && a3.text})`);

  const k = res("labs", { name: "Potassium", value: "4.6", unit: "mEq/L", date: "2026-07-30", flag: false }, "Potassium");
  const a4 = buildDirectAnswer("what was my last potassium level", [k]);
  ok(a4 && a4.text.includes("4.6 mEq/L") && a4.text.includes("July 30, 2026"), `lab value answers with value + unit + date (got: ${a4 && a4.text})`);
}

// ── Never fabricate: no field, no answer ─────────────────────────────────────
{
  const noDoc = res("surgeries", { procedure: "EGD", date: "2026-03-11" }, "EGD"); // no surgeon recorded
  ok(buildDirectAnswer("which doctor did my EGD", [noDoc]) === null,
    "no provider in the record → NO answer card (never invents a doctor)");
  const noDose = res("medications", { name: "Tacrolimus", status: "active" }, "Tacrolimus");
  ok(buildDirectAnswer("what's my dosage of tacrolimus", [noDose]) === null, "no dose recorded → no answer");
  ok(buildDirectAnswer("when was my last MRI", []) === null, "no matches at all → no answer");
  ok(buildDirectAnswer("tacrolimus", [res("medications", { name: "Tacrolimus", dose: "3 mg" }, "Tacrolimus")]) === null,
    "a bare keyword shows results only — no answer card asserted");

  const inactive = res("medications", { name: "Prednisone", dose: "5 mg", frequency: "daily", status: "inactive" }, "Prednisone");
  const aInactive = buildDirectAnswer("dosage of prednisone", [inactive]);
  ok(aInactive && aInactive.text.includes("marked inactive"),
    "a discontinued medication is answered WITH its status, never as if current");
}

// ── Sorting helper ───────────────────────────────────────────────────────────
{
  const a = res("labs", { date: "2025-01-01" }, "A"), b = res("labs", { date: "2026-01-01" }, "B"), u = res("labs", {}, "U");
  ok(sortByDate([a, b, u])[0] === b, "newest first by default");
  ok(sortByDate([a, b, u], true)[0] === a, "oldest first when asked");
  ok(sortByDate([a, b, u]).at(-1) === u, "undated entries sink to the bottom");
}

console.log(`\n${pass} passed, ${fail} failed (record-query)`);
process.exit(fail ? 1 : 0);
