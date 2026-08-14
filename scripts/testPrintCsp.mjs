// ── v1.49.1: print windows must be CSP-safe ──────────────────────────────────
// The popup a report opens in inherits the app's CSP (script-src 'self', no
// 'unsafe-inline'), so ANY inline <script> or inline handler in generated
// print HTML is silently blocked in production — the dead Emergency Card
// Print button. This suite pins the fix: generated pages carry no inline
// scripts/handlers, every popup site wires through the opener-side
// wirePrintWindow, and the helper itself provides button + auto-print +
// image-wait. (Dev never catches this class: vite strips the CSP meta in dev.)
// Run: npm run test:print-csp

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

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("PASS — " + m); } else { fail++; console.log("FAIL — " + m); } };

// ── 1. The emergency card's generated HTML is inline-script-free ─────────────
{
  localStorage.setItem("mi_profile_personal", JSON.stringify({ name: "Test Patient", dob: "1970-01-01", blood: "O+" }));
  localStorage.setItem("mi_readings", JSON.stringify([{ id: "w1", date: "2026-08-12", weight: "182" }]));
  const { buildEmergencyHtml } = await import("../src/lib/printEmergency.js");
  const html = buildEmergencyHtml();
  ok(!/<script\b/i.test(html), "emergency card HTML contains NO <script> (CSP would block it)");
  ok(!/\son[a-z]+\s*=/i.test(html), "emergency card HTML contains NO inline event handlers");
  ok(html.includes('class="printbtn"'), "emergency card still ships its visible Print button (wired by the opener)");
  ok(html.includes("182 lbs"), "emergency card carries the current Vitals weight");
}

// ── 2. No popup print generator ships inline print triggers ──────────────────
const POPUP_SITES = [
  ["App.jsx",                 SRC("App.jsx")],
  ["PrintableConsent.jsx",    SRC("components/PrintableConsent.jsx")],
  ["Tab02.jsx",               SRC("components/tabs/Tab02.jsx")],
  ["Tab04.jsx",               SRC("components/tabs/Tab04.jsx")],
  ["Tab05.jsx",               SRC("components/tabs/Tab05.jsx")],
  ["Tab11.jsx",               SRC("components/tabs/Tab11.jsx")],
  ["Tab14.jsx",               SRC("components/tabs/Tab14.jsx")],
  ["printEmergency.js",       SRC("lib/printEmergency.js")],
  ["printMedicationList.js",  SRC("lib/printMedicationList.js")],
];
for (const [name, path] of POPUP_SITES) {
  const src = readFileSync(path, "utf8");
  ok(!src.includes("window.onload = function(){ window.print"), `${name}: inline auto-print script removed`);
  ok(!src.includes('onclick="window.print'), `${name}: inline print onclick removed`);
}

// ── 3. Every popup site is wired through the opener ──────────────────────────
// Tab02's profile print keeps its pre-existing opener-side setTimeout(print)
// (already CSP-safe); every other site calls wirePrintWindow after close.
for (const [name, path] of POPUP_SITES) {
  if (name === "Tab02.jsx") continue;
  const src = readFileSync(path, "utf8");
  ok(src.includes("wirePrintWindow(win)"), `${name}: wirePrintWindow wired`);
}
{
  const tab02 = readFileSync(SRC("components/tabs/Tab02.jsx"), "utf8");
  ok(tab02.includes("setTimeout(() => { win.focus(); win.print(); }"), "Tab02 profile print keeps its opener-side trigger");
}

// ── 4. The helper itself ─────────────────────────────────────────────────────
{
  const helper = readFileSync(SRC("lib/printWindow.js"), "utf8");
  ok(helper.includes('querySelectorAll(".printbtn,[data-print]")'), "helper wires existing print buttons");
  ok(helper.includes("insina-printbtn"), "helper injects a Print / Save-as-PDF button when a page has none");
  ok(helper.includes("@media print{.insina-printbtn{display:none}}"), "injected button hides in the printed output");
  ok(helper.includes("every(img => img.complete)"), "auto-print waits for images (logo present in the PDF)");
  const helperCode = helper.split("\n").filter(l => !l.trim().startsWith("//") && !l.trim().startsWith("*")).join("\n");
  ok(!helperCode.includes("document.write"), "helper never writes markup with scripts — DOM APIs only (comments excluded)");
  const { wirePrintWindow } = await import("../src/lib/printWindow.js");
  ok(typeof wirePrintWindow === "function", "helper exports wirePrintWindow");
  wirePrintWindow(null); // must be a safe no-op for a blocked popup
  ok(true, "wirePrintWindow(null) is a safe no-op (popup blocked)");
}

console.log(`\n${pass} passed, ${fail} failed (print-csp)`);
assert.equal(fail, 0);
