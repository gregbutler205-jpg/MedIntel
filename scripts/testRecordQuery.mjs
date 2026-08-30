// ── Deterministic record-query tests (Search answers from the record, no AI) ─
// Greg's framing: Search is a search of what's already in Insina — "which
// doctor did my EGD", "when was my last cervical MRI", "what's my dosage of
// tacrolimus". These pin that those are answered locally, that the answers are
// pure retrieval (never invented), and that the old contiguous-substring
// matching bug stays fixed. Run: npm run test:record-query

import {
  extractTerms, detectIntent, matchesTerms, sortByDate, buildDirectAnswer, detectCategoryHint,
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

// ── Pharmacy contact lookups (section words, not record contents) ────────────
// Nothing inside a pharmacy entry literally contains the word "pharmacy", so a
// pure term match finds nothing. The section word acts as a hint instead.
{
  ok(detectCategoryHint("what's my pharmacy phone number") === "pharmacies", "'pharmacy' names a section");
  ok(detectCategoryHint("when was my last MRI") === null, "no section word → no hint");
  ok(extractTerms("what's my pharmacy phone number").length === 0, "contact scaffolding + section word leave no content terms");
  ok(detectIntent("what's my pharmacy phone number").kind === "contact",
    "contact intent wins over the value branch (which would grab 'number')");
  ok(detectIntent("what was my last potassium level").kind === "value", "clinical value lookups are unaffected");

  const primary = { category: "pharmacies", record: { name: "CVS #5777", phone: "(601)-555-0142", address: "1200 Hardy St", primary: true }, title: "CVS #5777", date: "" };
  const mail = { category: "pharmacies", record: { name: "Optum Rx", phone: "(800)-555-0199", type: "Mail-order" }, title: "Optum Rx", date: "" };
  const a = buildDirectAnswer("what's my pharmacy phone number", [mail, primary]);
  ok(a && a.text.startsWith("CVS #5777"), `the PRIMARY pharmacy answers, not list order (got: ${a && a.text})`);
  ok(a && a.sourceLabel === "Your primary pharmacy", "labelled as the primary pharmacy");
  ok(a && a.text.includes("(601)-555-0142"), "phone comes from the record");

  const noPhone = { category: "pharmacies", record: { name: "Corner Drug" }, title: "Corner Drug", date: "" };
  ok(buildDirectAnswer("pharmacy phone number", [noPhone]) === null, "no phone or address recorded → no answer card");
}

// ── Sorting helper ───────────────────────────────────────────────────────────
{
  const a = res("labs", { date: "2025-01-01" }, "A"), b = res("labs", { date: "2026-01-01" }, "B"), u = res("labs", {}, "U");
  ok(sortByDate([a, b, u])[0] === b, "newest first by default");
  ok(sortByDate([a, b, u], true)[0] === a, "oldest first when asked");
  ok(sortByDate([a, b, u]).at(-1) === u, "undated entries sink to the bottom");
}

// ── snippet: the deleted-helper crash (v1.49.5) ──────────────────────────────
// Greg: "as soon as I type a letter it goes to a blank screen." SearchPopup's
// snippetOf called snippet(), whose definition the v1.45.0 rewrite deleted —
// ReferenceError on the first keystroke matching a ref doc or AI message.
{
  const { snippet } = await import("../src/lib/recordQuery.js");
  const text = "Tacrolimus trough was 7.1 this morning; the coordinator said the level looks stable.";
  ok(snippet(text, "coordinator").includes("coordinator"), "excerpt contains the matched term");
  ok(snippet(text, "t", 10).startsWith("Tacrolimus"), "single-letter query (the crash trigger) returns an excerpt, not a throw");
  const long = "x".repeat(300);
  ok(snippet(long, "zzz") === "x".repeat(200) + "…", "no match → truncated head with ellipsis");
  ok(snippet(long, "zzz", 100).length === 201, "no-match truncation respects the radius");
  ok(snippet("", "term") === "" && snippet(null, "term") === "", "empty/null text → empty string, never throws");
  const mid = "a".repeat(150) + "NEEDLE" + "b".repeat(150);
  const out = snippet(mid, "needle", 20);
  ok(out.startsWith("…") && out.endsWith("…") && out.includes("NEEDLE"), "mid-text match is windowed with leading and trailing ellipses");

  // Structural: SearchPopup must IMPORT every recordQuery helper it calls —
  // a local definition deleted in a rewrite is exactly how this crash shipped.
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const { dirname, join } = await import("node:path");
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, "..", "src", "components", "SearchPopup.jsx"), "utf8");
  const importLine = src.match(/import \{([^}]+)\} from "\.\.\/lib\/recordQuery\.js"/)?.[1] || "";
  const imported = importLine.split(",").map(s => s.trim());
  for (const fn of ["extractTerms", "matchesTerms", "buildDirectAnswer", "sortByDate", "detectCategoryHint", "snippet"]) {
    ok(imported.includes(fn), `SearchPopup imports ${fn} from recordQuery`);
  }
}

// ── v1.54.2: canonical-alias search (Greg: "PSA" found nothing) ──────────────
// Extraction names the same analyte differently per report; the canonical id
// rides the search haystack so the abbreviation finds the formal name.
{
  const { canonicalLabId } = await import("../src/lib/labCanonical.js");
  globalThis.localStorage = { getItem: () => null, setItem: () => {} }; // name-map empty
  ok(canonicalLabId("Prostate Specific Antigen") === "psa", "formal name → canonical psa");
  ok(canonicalLabId("PSA, Total") === "psa" && canonicalLabId("Total PSA") === "psa", "total-PSA variants → canonical psa");
  ok(canonicalLabId("PSA, Free") !== "psa" && canonicalLabId("Free PSA") !== "psa",
     "free PSA is a DIFFERENT test — never aliased to total");
  ok(canonicalLabId("FK506") === "tacrolimus", "existing aliases unchanged");
  ok(matchesTerms(["Prostate Specific Antigen", canonicalLabId("Prostate Specific Antigen")], extractTerms("PSA")),
     "searching 'PSA' matches a row named 'Prostate Specific Antigen' via the canonical haystack");

  const { readFileSync } = await import("node:fs");
  const sp = readFileSync(new URL("../src/components/SearchPopup.jsx", import.meta.url), "utf8");
  ok(sp.includes("canonicalLabId(l.name)"), "SearchPopup includes the canonical id in the labs haystack");
}

console.log(`\n${pass} passed, ${fail} failed (record-query)`);
process.exit(fail ? 1 : 0);
