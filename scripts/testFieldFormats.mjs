// ── App-wide field formats (v1.56.2, Greg 2026-08-30) ────────────────────────
// Every phone FIELD renders (xxx)xxx-xxxx and every date FIELD mm/dd/yyyy.
// Styled long-form dates (cards, print headers) are exempt by design decision.
// These pin the shared displaySafe helpers and that the old per-tab phone
// formatters are gone (one implementation, one format).
// Run: npm run test:field-formats

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = (p) => join(__dirname, "..", "src", p);

const { formatPhone, displayPhone, formatDateUS } = await import("../src/lib/displaySafe.js");

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("PASS — " + m); } else { fail++; console.log("FAIL — " + m); } };
const eq = (a, b, m) => ok(a === b, `${m} (got ${JSON.stringify(a)})`);

// ── formatPhone: progressive as-you-type, (xxx)xxx-xxxx ──────────────────────
eq(formatPhone(""), "", "empty stays empty");
eq(formatPhone("6"), "(6", "first digit opens the paren");
eq(formatPhone("601"), "(601", "area code complete, paren still open");
eq(formatPhone("6015"), "(601)5", "fourth digit closes the paren — no space, no dash");
eq(formatPhone("601555"), "(601)555", "prefix complete");
eq(formatPhone("6015550"), "(601)555-0", "seventh digit adds the dash");
eq(formatPhone("6015550000"), "(601)555-0000", "full number is (xxx)xxx-xxxx");
eq(formatPhone("60155500009999"), "(601)555-0000", "input caps at ten digits");
eq(formatPhone("(601) 555-0000"), "(601)555-0000", "re-typing an old spaced format normalizes");
eq(formatPhone("(601)-555-0000"), "(601)555-0000", "the old dashed-paren format normalizes");

// ── displayPhone: stored values, format-if-clean else as-stored ──────────────
eq(displayPhone("6015550000"), "(601)555-0000", "bare ten digits format");
eq(displayPhone("601-555-0000"), "(601)555-0000", "dashed ten digits format");
eq(displayPhone("(601) 555-0000"), "(601)555-0000", "legacy spaced format re-renders to the standard");
eq(displayPhone("16015550000"), "(601)555-0000", "eleven digits with leading 1 drop the 1");
eq(displayPhone("555-0142"), "555-0142", "a seven-digit number renders as stored");
eq(displayPhone("601-555-0000 x12"), "601-555-0000 x12", "an extension renders as stored");
eq(displayPhone(""), "", "empty stays empty");
eq(displayPhone(null), "", "null renders empty, never the string 'null'");

// ── formatDateUS: date fields render mm/dd/yyyy ──────────────────────────────
eq(formatDateUS("2026-08-30"), "08/30/2026", "ISO date renders mm/dd/yyyy");
eq(formatDateUS("2026-01-05"), "01/05/2026", "month and day zero-pad");
eq(formatDateUS("2026-08-30T14:22:00"), "08/30/2026", "ISO datetime renders its date");
eq(formatDateUS("Aug 30, 2026"), "08/30/2026", "legacy short-month strings convert");
eq(formatDateUS("8/30/2026"), "08/30/2026", "unpadded US dates pad");
eq(formatDateUS(new Date(2026, 7, 30)), "08/30/2026", "Date objects format");
eq(formatDateUS("mid-July"), "mid-July", "unparseable text renders as typed, never hidden");
eq(formatDateUS(""), "", "empty renders the default fallback");
eq(formatDateUS(null, "—"), "—", "null renders the given fallback");
eq(formatDateUS("2026-12-31"), "12/31/2026", "New Year's Eve doesn't day-shift across UTC");
eq(formatDateUS("2026-01-01"), "01/01/2026", "New Year's Day doesn't day-shift across UTC");

// ── One implementation: the per-tab phone formatters are gone ────────────────
{
  const tab02 = readFileSync(SRC("components/tabs/Tab02.jsx"), "utf8");
  const tab14 = readFileSync(SRC("components/tabs/Tab14.jsx"), "utf8");
  ok(!tab02.includes("function formatPhone") && !tab14.includes("function formatPhone"),
     "Tab02/Tab14 no longer carry local phone formatters");
  ok(tab02.includes('from "../../lib/displaySafe.js"') && tab14.includes('from "../../lib/displaySafe.js"'),
     "both import the shared helpers instead");
  ok(!tab02.includes('placeholder="(601) 555-0000"') && !tab14.includes('placeholder="(601) 555-0000"'),
     "placeholders show the (xxx)xxx-xxxx standard");
}

console.log(`\n${pass} passed, ${fail} failed (field-formats)`);
assert.equal(fail, 0);
