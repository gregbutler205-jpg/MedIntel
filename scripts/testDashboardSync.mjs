// ── Dashboard / Vitals / companion must show the same vitals ─────────────────
// Greg's rule: "These three areas should always be the same."
//
// They were not. Tab06 (Vitals) re-reads on every "mi-data-synced" event; the
// dashboard only re-read when you navigated TO it. A reading logged on the
// companion and merged in by a Drive sync therefore appeared under Vitals while
// the dashboard kept showing the previous figure.
//
// These are STRUCTURAL checks against the source, not behavioural ones: the
// dashboard is React + DOM and this harness is plain Node with no renderer, so
// the live behaviour was verified in-browser instead (a reading injected +
// event dispatched while sitting on the dashboard: stale before, live after).
// What this suite protects is the wiring that makes that behaviour possible —
// enough to fail loudly if the listener or a store re-read is ever dropped.
// Run: npm run test:dashboard-sync

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const APP   = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf-8");
const TAB06 = readFileSync(new URL("../src/components/tabs/Tab06.jsx", import.meta.url), "utf-8");
const VITALS = readFileSync(new URL("../src/lib/vitals.js", import.meta.url), "utf-8");

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("PASS — " + m); } else { fail++; console.log("FAIL — " + m); } };

// ── The event contract ───────────────────────────────────────────────────────
ok(/window\.dispatchEvent\(new Event\("mi-data-synced"\)\)/.test(VITALS),
   "saveReading still announces itself with mi-data-synced");

// ── Both surfaces must listen ────────────────────────────────────────────────
ok(/addEventListener\("mi-data-synced"/.test(TAB06),
   "Vitals tab listens for mi-data-synced");
ok(/addEventListener\("mi-data-synced"/.test(APP),
   "dashboard listens for mi-data-synced — the gap that caused the bug");

// The listener must be registered unconditionally, not nested inside a
// dashboard-only branch: returning to the dashboard must never show a figure
// that went stale while another tab was open.
{
  const i = APP.indexOf('addEventListener("mi-data-synced"');
  // Scope to the listener's OWN useEffect — the effect immediately above it is
  // the nav-triggered refresh, which legitimately does guard on activeNav.
  const effectStart = APP.lastIndexOf("useEffect(", i);
  const ownEffect = APP.slice(effectStart, i);
  ok(!/activeNav/.test(ownEffect),
     "the dashboard's listener is not gated behind an activeNav check");
}

// ── One refresh path, covering everything the dashboard renders ──────────────
{
  const m = APP.match(/const refreshDashboardData = useCallback\(\(\) => \{[\s\S]*?\n  \}, \[\]\);/);
  ok(!!m, "refreshDashboardData exists as a single named refresh path");
  const body = m ? m[0] : "";
  for (const [setter, what] of [
    ["setReadings",         "vitals — the reported bug"],
    ["setMeds",             "medications"],
    ["setAlerts",           "alerts"],
    ["setUpcoming",         "appointments"],
    ["setActiveConditions", "active conditions (never re-read after mount before this)"],
  ]) {
    ok(body.includes(setter), `refreshDashboardData re-reads ${what}`);
  }
}

// ── Red is reserved for urgent ───────────────────────────────────────────────
// A flagged reading must still render red; the resting colour must not.
{
  const bpLine = APP.split("\n").find(l => l.includes('label:"Blood Pressure"')) || "";
  ok(!/color:"#ef4444"/.test(bpLine),
     "resting Blood Pressure is not alert-red (#ef4444)");
  ok(/color:"#ea580c"/.test(bpLine),
     "resting Blood Pressure is dark orange (#ea580c)");
  ok(/flag \? "#ef4444"/.test(APP),
     "a FLAGGED vital still renders red — red still means urgent");
}

console.log(`\n${pass} passed, ${fail} failed (dashboard-sync)`);
assert.equal(fail, 0);
