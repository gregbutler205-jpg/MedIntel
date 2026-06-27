// ─────────────────────────────────────────────────────────────────────────────
// CompanionApp.jsx — Insina Health Mobile companion shell.
// Access via: insinahealth.com/?companion=1
// "Mobile captures. The web app organizes." Reads/writes the same mi_* record as
// the web app, synced via Google Drive. 5-tab bottom nav; Emergency Info and
// Doctor Visit Capture are reached from inside, not as their own tabs.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, Component } from "react";
import { initGoogleAuth, signInWithRedirect, extractTokenFromHash, getAccessToken, getStoredUser } from "../../lib/googleAuth.js";
import { fullSync } from "../../lib/driveSync.js";
import { enqueue, flush } from "../../lib/outbox.js";
import { cleanupOldAudio } from "../../lib/visitCapture.js";
import { scheduleMedReminders, runOpenNotifications } from "../../lib/notify.js";
import { computePatternFlags } from "../../lib/patternFlags.js";
import { C, mono, sans } from "./companionUI.jsx";

import SignIn     from "./screens/SignIn.jsx";
import Today      from "./screens/Today.jsx";
import Meds       from "./screens/Meds.jsx";
import Log        from "./screens/Log.jsx";
import Care       from "./screens/Care.jsx";
import AILite     from "./screens/AILite.jsx";
import Emergency  from "./screens/Emergency.jsx";
import Settings   from "./screens/Settings.jsx";
import MedList    from "./screens/MedList.jsx";
import Surgeries  from "./screens/Surgeries.jsx";
import VisitFlow  from "./screens/visit/VisitFlow.jsx";

const TABS = [
  { key: "today", label: "Today", icon: "🏠" },
  { key: "meds",  label: "Meds",  icon: "💊" },
  { key: "log",   label: "Log",   icon: "➕" },
  { key: "care",  label: "Care",  icon: "📅" },
  { key: "ai",    label: "AI",    icon: "✦"  },
];

function fmtTime(ts) {
  return ts ? new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : null;
}

// ── Error boundary ────────────────────────────────────────────────────────────
class CompanionErrorBoundary extends Component {
  constructor(p) { super(p); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ background: C.bg, minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: mono }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontSize: 14, color: C.red, fontWeight: 700, marginBottom: 8 }}>Companion failed to load</div>
        <div style={{ fontSize: 11, color: C.s, marginBottom: 20, textAlign: "center", lineHeight: 1.6 }}>{this.state.error?.message || "Unknown error"}</div>
        <button onClick={() => window.location.reload()} style={{ background: "rgba(79,142,247,.15)", border: "1px solid rgba(79,142,247,.3)", borderRadius: 8, padding: "10px 20px", color: C.blue, fontSize: 12, cursor: "pointer" }}>Reload</button>
      </div>
    );
  }
}

// ── Sync status bar (also the sign-in entry point) ────────────────────────────
function SyncBar({ syncState, lastSynced, onSync }) {
  const signedIn = !!getStoredUser();
  if (!signedIn) return (
    <div style={{ background: "#0d1a28", borderBottom: `1px solid ${C.b1}`, padding: "8px 16px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
      <span style={{ fontSize: 11, color: C.dim, flex: 1, fontFamily: mono }}>Connect Drive to sync with the web app</span>
      <button onClick={onSync} style={{ background: "rgba(79,142,247,.15)", border: `1px solid rgba(79,142,247,.3)`, borderRadius: 8, padding: "5px 12px", color: C.blue, fontSize: 11, fontFamily: mono, cursor: "pointer" }}>Sign in</button>
    </div>
  );
  return (
    <div style={{ background: "#0a1520", borderBottom: `1px solid ${C.b2}`, padding: "6px 16px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: syncState === "done" ? C.green : syncState === "syncing" ? C.amber : C.ghost, boxShadow: syncState === "done" ? `0 0 5px ${C.green}60` : "none", flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 10, color: C.ghost, fontFamily: mono }}>
        {syncState === "syncing" ? "Syncing with Drive…" : syncState === "done" && lastSynced ? `Synced ${lastSynced}` : syncState === "error" ? "Sync failed — tap to retry" : "Drive connected"}
      </span>
      <button onClick={onSync} disabled={syncState === "syncing"} style={{ background: "none", border: "none", color: C.blue, fontSize: 10, fontFamily: mono, cursor: "pointer", opacity: syncState === "syncing" ? 0.4 : 1 }}>
        {syncState === "syncing" ? "…" : "↕ Sync"}
      </button>
    </div>
  );
}

// ── Bottom tab bar ─────────────────────────────────────────────────────────────
function BottomNav({ tab, onTab }) {
  return (
    <nav style={{ display: "flex", borderTop: `1px solid ${C.b2}`, background: C.card, flexShrink: 0, paddingBottom: "env(safe-area-inset-bottom)" }}>
      {TABS.map(t => {
        const active = tab === t.key;
        return (
          <button key={t.key} onClick={() => onTab(t.key)}
            style={{ flex: 1, background: "none", border: "none", cursor: "pointer", padding: "9px 0 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 18, lineHeight: 1, opacity: active ? 1 : 0.55, filter: active ? "none" : "grayscale(0.4)" }}>{t.icon}</span>
            <span style={{ fontSize: 9, fontFamily: mono, letterSpacing: "0.5px", color: active ? C.blue : C.ghost }}>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ── Root ────────────────────────────────────────────────────────────────────
function CompanionInner() {
  const [tab, setTab] = useState("today");
  const [logTab, setLogTab] = useState("vitals");    // which Log sub-screen to open
  const [overlay, setOverlay] = useState(null);      // { name: "emergency" } | { name: "visit", appt, visitId }
  const [online, setOnline] = useState(navigator.onLine);
  const [syncState, setSyncState] = useState("idle");
  const [lastSynced, setLastSynced] = useState(() => fmtTime(localStorage.getItem("mi_last_sync")));
  const [user, setUser] = useState(() => getStoredUser());
  const [skippedSignIn, setSkippedSignIn] = useState(false);

  const runSync = useCallback((token) => {
    setSyncState("syncing");
    return fullSync(token)
      .then(ts => { setLastSynced(fmtTime(ts)); setSyncState("done"); return flush(token); })
      .catch(() => setSyncState("error"));
  }, []);

  // Google auth init (popup path, desktop) + redirect-return token capture (mobile)
  useEffect(() => {
    initGoogleAuth({ onSignIn: ({ accessToken }) => { setUser(getStoredUser()); runSync(accessToken); } });
    const token = extractTokenFromHash();
    if (token) {
      fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(u => {
          const profile = { name: u.name, email: u.email, picture: u.picture };
          localStorage.setItem("mi_google_user", JSON.stringify(profile));
          setUser(profile);
        })
        .catch(() => {});
      runSync(token);
    }
    // Housekeeping + best-effort local notifications on open
    cleanupOldAudio().catch(() => {});
    scheduleMedReminders();
    try { runOpenNotifications(computePatternFlags()); } catch { /* ignore */ }
  }, [runSync]);

  // Online/offline + re-sync and flush when returning to foreground / connection
  useEffect(() => {
    const up = () => { setOnline(true); const t = getAccessToken(); if (t) runSync(t); };
    const dn = () => setOnline(false);
    const vis = () => { if (document.visibilityState === "visible") { const t = getAccessToken(); if (t) runSync(t); } };
    window.addEventListener("online", up);
    window.addEventListener("offline", dn);
    document.addEventListener("visibilitychange", vis);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", dn); document.removeEventListener("visibilitychange", vis); };
  }, [runSync]);

  // Passed to capture screens: write-through already happened locally; queue a
  // Drive sync and try to flush now (no-op offline — it drains later).
  const queueSync = useCallback(() => {
    enqueue("drive-sync");
    const t = getAccessToken();
    if (t) runSync(t);
  }, [runSync]);

  const handleSync = useCallback(() => {
    const t = getAccessToken();
    if (t) runSync(t); else signInWithRedirect();
  }, [runSync]);

  const goTab        = (k) => { setOverlay(null); setTab(k); };
  const openLog      = (sub = "vitals") => { setOverlay(null); setLogTab(sub); setTab("log"); };
  const openEmergency = () => setOverlay({ name: "emergency" });
  const openSettings  = () => setOverlay({ name: "settings" });
  const startVisit    = (appt) => setOverlay({ name: "visit", appt, visitId: null });
  const openVisit     = (visitId) => setOverlay({ name: "visit", appt: null, visitId });
  const openMedList   = () => setOverlay({ name: "medlist" });
  const openSurgeries = () => setOverlay({ name: "surgeries" });

  // Back: close an overlay (returns to the tab it was opened from), else a
  // non-Today tab returns to Today (an installed PWA has no browser back button).
  const back = () => { if (overlay) setOverlay(null); else if (tab !== "today") setTab("today"); };

  // Sign-in gate: a full screen before the app handles Google connection. Optional —
  // "Continue without signing in" lets offline capture proceed.
  if (!user && !skippedSignIn) {
    return (
      <div style={{ background: C.bg, height: "100dvh", maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", fontFamily: sans, overflow: "hidden" }}>
        <SignIn onSignIn={signInWithRedirect} onSkip={() => setSkippedSignIn(true)} />
      </div>
    );
  }

  return (
    <div style={{
      background: C.bg, height: "100dvh", width: "100%", maxWidth: 480, margin: "0 auto",
      display: "flex", flexDirection: "column", fontFamily: sans, overflow: "hidden", boxSizing: "border-box",
      paddingTop: "env(safe-area-inset-top)",
      paddingLeft: "env(safe-area-inset-left)", paddingRight: "env(safe-area-inset-right)",
    }}>
      {!online && (
        <div style={{ background: "#141f00", borderBottom: "1px solid #3a5a00", padding: "5px 16px", fontSize: 10, color: "#a3e635", fontFamily: mono, textAlign: "center", flexShrink: 0 }}>
          📶 Offline — you can still capture; it’ll sync when you’re back online
        </div>
      )}
      <SyncBar syncState={syncState} lastSynced={lastSynced} onSync={handleSync} />

      {/* Slim back bar on non-Today tabs (overlays render their own header back). */}
      {!overlay && tab !== "today" && (
        <button onClick={back} style={{ display: "flex", alignItems: "center", gap: 6, background: C.card, border: "none", borderBottom: `1px solid ${C.b2}`, color: C.blue, fontSize: 12, fontFamily: mono, padding: "8px 16px", cursor: "pointer", flexShrink: 0, textAlign: "left" }}>
          ← Back
        </button>
      )}

      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch", display: "flex", flexDirection: "column", minWidth: 0 }}>
        {overlay?.name === "emergency"  && <Emergency onBack={back} />}
        {overlay?.name === "settings"   && <Settings onBack={back} />}
        {overlay?.name === "medlist"    && <MedList onBack={back} />}
        {overlay?.name === "surgeries"  && <Surgeries onBack={back} />}
        {overlay?.name === "visit" && <VisitFlow appt={overlay.appt} visitId={overlay.visitId} onClose={back} queueSync={queueSync} />}
        {!overlay && tab === "today" && <Today goTab={goTab} openLog={openLog} openEmergency={openEmergency} openSettings={openSettings} openSurgeries={openSurgeries} startVisit={startVisit} lastSynced={lastSynced} />}
        {!overlay && tab === "meds"  && <Meds queueSync={queueSync} openMedList={openMedList} />}
        {!overlay && tab === "log"   && <Log queueSync={queueSync} initialTab={logTab} />}
        {!overlay && tab === "care"  && <Care startVisit={startVisit} openVisit={openVisit} />}
        {!overlay && tab === "ai"    && <AILite />}
      </div>

      {!overlay && <BottomNav tab={tab} onTab={goTab} />}
    </div>
  );
}

export default function CompanionApp() {
  return <CompanionErrorBoundary><CompanionInner /></CompanionErrorBoundary>;
}
