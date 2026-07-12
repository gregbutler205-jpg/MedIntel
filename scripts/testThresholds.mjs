#!/usr/bin/env node
// ── A-01 / PG-09: threshold fixture tests ────────────────────────────────────
// Per INSINA_AI_PROMPTS.md §6: "the threshold library ships with a fixture
// table per analyte (input values in, expected flag level and bound out),
// run automatically before release. A library change without updated
// fixtures fails the check." Wired into prebuild (package.json) so
// `npm run build` runs this first.
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

// Minimal localStorage polyfill so tripwire.js (a browser module) runs under
// plain Node. Enables the unreviewed-content gate so fixtures exercise real
// evaluation logic, not the review gate itself (gate behavior has its own
// assertions below).
globalThis.localStorage = (() => {
  const store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
})();
localStorage.setItem("mi_allow_unreviewed_modules", "true");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { evaluateLab } = await import(pathToFileURL(path.join(__dirname, "../src/lib/tripwire.js")));
const { DEFAULT_LIBRARY } = await import(pathToFileURL(path.join(__dirname, "../src/config/tripwireDefaults.js")));

// [analyte name, value, expected level, expected bound] — null/null means "no flag expected".
const FIXTURES = [
  ["Potassium", 2.0, "urgent", "belowUrgentLow"],
  ["Potassium", 7.0, "urgent", "aboveUrgentHigh"],
  ["Potassium", 4.0, null, null],
  ["Potassium", 2.5, null, null], // boundary: exactly at threshold does not flag
  ["Potassium", 6.5, null, null], // boundary
  ["Sodium", 110, "urgent", "belowUrgentLow"],
  ["Sodium", 170, "urgent", "aboveUrgentHigh"],
  ["Sodium", 140, null, null],
  ["Glucose", 30, "urgent", "belowUrgentLow"],
  ["Glucose", 600, "urgent", "aboveUrgentHigh"],
  ["Glucose", 100, null, null],
  ["Hemoglobin", 5.0, "urgent", "belowUrgentLow"],
  ["Hemoglobin", 13.0, null, null],
  ["Platelets", 10, "urgent", "belowUrgentLow"],
  ["Platelets", 250, null, null],
  ["WBC", 0.5, "urgent", "belowUrgentLow"],
  ["WBC", 40, "urgent", "aboveUrgentHigh"],
  ["WBC", 7, null, null],
];

let pass = 0, fail = 0;
for (const [name, value, expectLevel, expectBound] of FIXTURES) {
  const flag = evaluateLab({ name, value, date: "2026-07-01" }, {});
  const label = `${name} = ${value}`;
  try {
    if (expectLevel === null) {
      assert.equal(flag, null, `${label}: expected no flag, got ${JSON.stringify(flag)}`);
    } else {
      assert.ok(flag, `${label}: expected a ${expectLevel}/${expectBound} flag, got null`);
      assert.equal(flag.level, expectLevel, `${label}: level mismatch (got ${flag.level})`);
      assert.equal(flag.bound, expectBound, `${label}: bound mismatch (got ${flag.bound})`);
      assert.ok(flag.guidance && flag.guidance.length > 0, `${label}: urgent flag missing guidance text`);
    }
    pass++;
  } catch (e) {
    fail++;
    console.error(`FAIL — ${e.message}`);
  }
}

// Every fixture-tested analyte must exist in the library — catches a
// fixture typo as reliably as a library regression.
const libraryIds = new Set(DEFAULT_LIBRARY.analytes.map(a => a.canonicalId));
const fixtureIds = new Set(FIXTURES.map(([name]) => name.toLowerCase()));
for (const id of fixtureIds) {
  if (!libraryIds.has(id)) { console.error(`FAIL — fixture references "${id}", not present in DEFAULT_LIBRARY`); fail++; }
}

// The review gate itself: with mi_allow_unreviewed_modules unset, an
// otherwise-urgent value must NOT flag (unreviewed content never reaches a
// pilot user by default).
localStorage.removeItem("mi_allow_unreviewed_modules");
const gated = evaluateLab({ name: "Potassium", value: 2.0, date: "2026-07-01" }, {});
try {
  assert.equal(gated, null, "unreviewed library must not flag when mi_allow_unreviewed_modules is unset");
  pass++;
} catch (e) {
  fail++;
  console.error(`FAIL — ${e.message}`);
}
localStorage.setItem("mi_allow_unreviewed_modules", "true");

console.log(`\n${pass} passed, ${fail} failed (threshold fixtures)`);
if (fail > 0) process.exit(1);
