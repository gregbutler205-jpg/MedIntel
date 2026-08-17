// ── AI session shell tests — AI_SESSION_SPEC v0.3 (DEC-C-TBD, pre-merge) ────
// Covers the deterministic shell: session lifecycle, immutable segments,
// record-state hash (C15), staleness (C12), discard occurrence log (C10),
// vault round-trip, and the numeric validator engine (C3) against the spec's
// claim-typing worked examples. Run: npm run test:ai-session-shell

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
globalThis.sessionStorage = new Storage();
globalThis.window = globalThis;
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.dispatchEvent = () => {};

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("PASS — " + m); } else { fail++; console.log("FAIL — " + m); } };

const S = await import("../src/lib/aiSessions.js");
const V = await import("../src/lib/numericValidator.js");

// ── 1. Record-state hash (DEC-C-TBD-15) ──────────────────────────────────────
{
  localStorage.clear();
  const h0 = S.recordStateHash();
  ok(/^[0-9a-f]{8}$/.test(h0), `hash is 8 hex chars (got ${h0})`);
  ok(S.recordStateHash() === h0, "deterministic: same record → same hash");

  localStorage.setItem("mi_labs", JSON.stringify([{ name: "ALT", value: 30 }]));
  const h1 = S.recordStateHash();
  ok(h1 !== h0, "a reconciled-record mutation changes the hash");

  localStorage.setItem("mi_lab_archive", JSON.stringify([{ id: "x" }]));
  localStorage.setItem("mi_ai_sessions", JSON.stringify([{ id: "s" }]));
  localStorage.setItem("mi_ref_docs", JSON.stringify([{ id: "d" }]));
  ok(S.recordStateHash() === h1, "archive tier, session content, and ref docs are excluded from the hash");

  localStorage.setItem("mi_profile_personal", JSON.stringify({ name: "G" }));
  ok(S.recordStateHash() !== h1, "profile (AI identity source) is inside the hash");
}

// ── 2. Session lifecycle ─────────────────────────────────────────────────────
{
  localStorage.clear();
  const long = "Q".repeat(120);
  ok(S.sessionTitle(long).length <= 80 && S.sessionTitle(long).endsWith("…"), "title truncates at 80 with ellipsis");
  ok(S.sessionTitle("  what can I take  ") === "what can I take", "title trims whitespace");
  ok(S.sessionTitle("") === "New session", "empty opening question gets the fallback title");

  const s = S.newSession("My neck hurts. What can I take?");
  ok(s.state === "active" && s.segments.length === 1, "new session: active, one segment");
  ok(s.segments[0].stamp.recordHash === S.recordStateHash() && s.segments[0].stamp.corpusVersion === S.CORPUS_VERSION,
     "stamp captured at segment open: record hash + corpus version");

  S.appendTurn(s, { role: "user", text: "My neck hurts. What can I take?" });
  S.appendTurn(s, { role: "assistant", text: "…", mode: "standard" });
  ok(S.totalMessages(s) === 2 && s.segments.length === 1, "turns append within the current segment");

  S.closeOpenSegment(s);
  ok(!!s.segments[0].closedAt, "segment closes with a timestamp");
  S.appendTurn(s, { role: "user", text: "follow-up" });
  ok(s.segments.length === 2, "a turn after close opens a NEW segment — closed segments are immutable");
  ok(s.segments[1].stamp.ts !== undefined && s.segments[1].messages.length === 1, "new segment has its own freshly captured stamp");
}

// ── 3. Save tracking + append-only note contract ─────────────────────────────
{
  const s = S.newSession("test");
  S.appendTurn(s, { role: "user", text: "a" });
  S.appendTurn(s, { role: "assistant", text: "b" });
  ok(S.hasUnsavedTurns(s), "unsaved turns detected before save");

  S.closeOpenSegment(s);
  S.markSaved(s, "note1");
  ok(s.state === "saved" && s.noteId === "note1" && !S.hasUnsavedTurns(s), "markSaved: state, noteId, counters");
  ok(S.unsavedSegments(s).length === 0, "no unsaved segments right after save");

  S.appendTurn(s, { role: "user", text: "later" });
  ok(S.hasUnsavedTurns(s), "a reopen turn re-arms the unsaved warning");
  ok(S.unsavedSegments(s).length === 1 && S.unsavedSegments(s)[0].messages[0].text === "later",
     "unsavedSegments returns only the segments the note has not seen (append-only)");
}

// ── 4. Staleness + dividers (DEC-C-TBD-12) ───────────────────────────────────
{
  localStorage.clear();
  const s = S.newSession("stale?");
  ok(S.stalenessOf(s).stale === false, "fresh session is not stale");
  localStorage.setItem("mi_conditions", JSON.stringify([{ name: "new" }]));
  const st = S.stalenessOf(s);
  ok(st.stale && st.recordChanged && !st.corpusChanged, "record change → stale with recordChanged");

  S.closeOpenSegment(s);
  S.appendTurn(s, { role: "user", text: "cont" });
  const tr = S.segmentTransition(s.segments[0], s.segments[1]);
  ok(tr.divider && tr.recordChanged, "divider renders between segments whose record hashes differ");

  const s2 = S.newSession("no change");
  S.closeOpenSegment(s2);
  S.appendTurn(s2, { role: "user", text: "cont" });
  ok(S.segmentTransition(s2.segments[0], s2.segments[1]).divider === false,
     "no divider when nothing changed between segments");
}

// ── 5. Store, discard occurrence log (DEC-C-TBD-10) ──────────────────────────
{
  localStorage.clear();
  const s = S.newSession("to discard");
  S.appendTurn(s, { role: "user", text: "private content" });
  S.saveSession(s);
  ok(typeof S.getSession(s.id)?.updatedAt === "number", "saveSession stamps updatedAt (DEC-046 merge opt-in)");

  S.discardSession(s.id);
  ok(S.getSession(s.id) === null, "discard removes the session");
  const log = JSON.parse(localStorage.getItem("mi_ai_discard_log"));
  ok(log.length === 1 && Object.keys(log[0]).join(",") === "ts", "occurrence log: timestamp ONLY, no content fields");
  ok(!JSON.stringify(log).includes("private content"), "discarded content never reaches the log");
}

// ── 6. Read-time normalization ───────────────────────────────────────────────
{
  localStorage.clear();
  localStorage.setItem("mi_ai_sessions", JSON.stringify([
    { id: "ok1", state: "weird", segments: [{ messages: "junk" }, null] },
    { notAnId: true },
    "garbage",
  ]));
  const all = S.loadSessions();
  ok(all.length === 1, "entries without an id are dropped");
  ok(all[0].state === "active" && Array.isArray(all[0].segments[0].messages),
     "unknown state → active; junk segment fields → safe empties");
}

// ── 7. Vault round-trip (spec Sec 8: encryption gate inheritance) ────────────
{
  localStorage.clear();
  const secureStorage = await import("../src/lib/secureStorage.js");
  secureStorage.installInterception();
  await secureStorage.setupVaultAndMigrate("test passphrase for session shell");
  const s = S.newSession("encrypted?");
  S.appendTurn(s, { role: "user", text: "vault me" });
  S.saveSession(s);
  await secureStorage.flushPendingWrites();
  const raw = secureStorage.getRawCiphertext("mi_ai_sessions");
  ok(raw != null && !String(raw).includes("vault me"), "mi_ai_sessions is stored as ciphertext (vaulted)");
  ok(S.getSession(s.id)?.segments[0].messages[0].text === "vault me", "transparent decrypt-on-read round-trips");
}

// ── 8. Validator: claim-typing worked examples (spec Sec 4 table) ────────────
{
  const ceiling = [{ value: 2, unit: "g" }];
  let r = V.validateNumerics("Up to 2 g per day, and you can go up to 3 g.", ceiling);
  ok(!r.ok && r.violations.length === 1 && r.violations[0].value === 3,
     "permissive range above the cited ceiling blocks (2 g licensed, 3 g not)");

  r = V.validateNumerics("Cyclobenzaprine 5 mg at bedtime.", []);
  ok(!r.ok && r.violations[0].token.includes("5 mg"), "uncited dose blocks, offending token logged");

  r = V.validateNumerics("Apply a thin layer 2 to 3 times a day.", []);
  ok(!r.ok && r.violations.length === 2, "uncited frequency range blocks — both endpoints unmatched");

  r = V.validateNumerics("Tilt head side to side, hold 15 seconds.", []);
  ok(!r.ok, "uncited duration blocks");

  r = V.validateNumerics("Your daily ceiling is 2 g, per your center's handbook.", ceiling);
  ok(r.ok, "cited ceiling restated verbatim passes");
}

// ── 9. Validator: arithmetic restatement is unmatched by construction ────────
{
  const threeG = [{ value: 3, unit: "g" }];
  // "six" is a word, not a numeral — DEC-C-TBD-3 scopes detection to numerals,
  // so the block comes from the unlicensed 650 mg. (Word-number forms are a
  // known detection boundary, flagged in the session report.)
  let r = V.validateNumerics("That's six 650 mg tablets.", threeG);
  ok(!r.ok && r.violations.length === 1 && r.violations[0].token.includes("650 mg"),
     "tablet-count restatement blocks via its unlicensed mg component");

  r = V.validateNumerics("Your limit is 3000 mg.", threeG);
  ok(!r.ok, "unit conversion blocks — a 3 g claim does not license 3000 mg");

  r = V.validateNumerics("Take up to 1.5 g twice daily.", threeG);
  ok(!r.ok, "per-dose division blocks — 1.5 g is not the cited 3 g");
}

// ── 10. Validator: detection shapes and non-detections ───────────────────────
{
  ok(V.detectNumericTokens("2g").length === 1 && V.detectNumericTokens("2g")[0].unit === "g", "no-space form detected");
  ok(V.detectNumericTokens("2 MG")[0].unit === "mg", "case-insensitive unit match");
  ok(V.detectNumericTokens("100.4 °F")[0].value === 100.4 && V.detectNumericTokens("100.4 °F")[0].unit === "degF", "decimal + degree symbol");
  ok(V.detectNumericTokens("temperature of 100.4 degrees F")[0].unit === "degF", "spelled-out degrees F");
  ok(V.validateNumerics("Your tacrolimus was 7.1 ng/mL in February.", [{ value: "7.1", unit: "ng/mL" }]).ok,
     "record fact licenses its own value (string claim value accepted)");
  ok(V.detectNumericTokens("You have 3 conditions on file.").length === 0, "numeral without a listed unit is not detected");
  ok(V.detectNumericTokens("Check your tablets and ask about vitamin C and hepatitis C.").length === 0,
     "unit words without adjacent numerals are not detected (bare C/F are not surface forms)");
  ok(V.validateNumerics("", []).ok && V.validateNumerics(null, []).ok, "empty/null text passes vacuously");
  ok(!V.validateNumerics("take 2 g", [{ value: 2, unit: "furlongs" }]).ok, "a claim with an unlisted unit licenses nothing");
}

// ── 11. Structural: governance and non-wiring ────────────────────────────────
{
  const units = readFileSync(SRC("config/validatorUnits.js"), "utf8");
  ok(units.includes("PROVISIONAL"), "unit list is marked provisional for founder review");
  ok(units.includes("UNIT_LIST_VERSION"), "unit list is versioned");

  const validator = readFileSync(SRC("lib/numericValidator.js"), "utf8");
  ok(validator.includes('from "../config/validatorUnits.js"'), "validator imports units from the maintained data file");
  ok(!/\["mg",/.test(validator), "validator source carries no inline unit vocabulary");

  const tab11 = readFileSync(SRC("components/tabs/Tab11.jsx"), "utf8");
  ok(!tab11.includes("numericValidator"), "validator is NOT wired into live generation (engine-only branch)");

  const sessions = readFileSync(SRC("lib/aiSessions.js"), "utf8");
  ok(sessions.includes("DEC-C-TBD"), "session lib cites the placeholder DEC namespace");
  ok(sessions.includes("PROVISIONAL"), "session copy strings are marked provisional");

  const sync = readFileSync(SRC("lib/driveSync.js"), "utf8");
  const excludeBlock = sync.slice(sync.indexOf("EXCLUDE_KEYS"), sync.indexOf("collectLocalData"));
  ok(!excludeBlock.includes("mi_ai_sessions"), "sessions are patient data: NOT excluded from Drive backup");
}

console.log(`\n${pass} passed, ${fail} failed (ai-session-shell)`);
assert.equal(fail, 0);
