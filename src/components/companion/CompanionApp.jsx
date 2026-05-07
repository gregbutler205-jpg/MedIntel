// ─────────────────────────────────────────────────────────────────────────────
// CompanionApp.jsx — Mobile companion for Insina Health
// Access via:  insinahealth.com/?companion=1
// Reads/writes the same localStorage as the main app, synced via Google Drive.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, Component } from "react";
import { initGoogleAuth, signIn, getAccessToken, getStoredUser } from "../../lib/googleAuth.js";
import { fullSync, uploadToDrive } from "../../lib/driveSync.js";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:     "#07090f",
  card:   "#0b1220",
  b1:     "#1a2f4a",
  b2:     "#111e30",
  blue:   "#4f8ef7",
  green:  "#10b981",
  amber:  "#f59e0b",
  red:    "#ef4444",
  purple: "#a78bfa",
  p:      "#dde8f5",
  s:      "#7eb8d8",
  dim:    "#98afc4",
  ghost:  "#4a5c6a",
};

// ── Storage helpers ───────────────────────────────────────────────────────────
const rls  = (k, fb) => { try { const v = localStorage.getItem(k); return v !== null ? JSON.parse(v) : fb; } catch { return fb; } };
const wls  = (k, v)  => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const uid  = () => Math.random().toString(36).slice(2, 9);
const toISO = () => new Date().toISOString().slice(0, 10);

// ── Date helpers ──────────────────────────────────────────────────────────────
function daysUntil(iso) {
  if (!iso) return null;
  return Math.ceil((new Date(iso + "T00:00:00") - new Date().setHours(0, 0, 0, 0)) / 86400000);
}
function relDate(iso) {
  const d = daysUntil(iso);
  if (d == null) return "—";
  if (d < 0)  return "Past";
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d <= 6)  return `In ${d} days`;
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function fmtShort(iso) {
  if (!iso) return "—";
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

// ── Med adherence ─────────────────────────────────────────────────────────────
function loadTaken()     { return (rls("mi_med_adherence", []).find(a => a.date === toISO()) || {}).taken || []; }
function saveTaken(ids)  {
  const all = rls("mi_med_adherence", []).filter(a => a.date !== toISO());
  wls("mi_med_adherence", [{ date: toISO(), taken: ids }, ...all].slice(0, 90));
}

// ── Critical alerts ───────────────────────────────────────────────────────────
function getCritAlerts() {
  const out = [];
  try {
    const latest = {};
    rls("mi_labs", []).forEach(l => {
      const k = (l.name || "").toLowerCase();
      if (k && (!latest[k] || new Date(l.date || 0) > new Date(latest[k].date || 0))) latest[k] = l;
    });
    Object.values(latest).filter(l => l.flag).forEach(l =>
      out.push(`${l.name} flagged${l.value ? ` (${l.value}${l.unit ? " " + l.unit : ""})` : ""}`)
    );
  } catch {}
  try {
    rls("mi_readings", []).filter(r => r.flag).slice(0, 2).forEach(r =>
      out.push(`Flagged vital${r.bp_s && r.bp_d ? `: BP ${r.bp_s}/${r.bp_d}` : ""}`)
    );
  } catch {}
  return out;
}

// ── Drive upload helper (fire and forget) ─────────────────────────────────────
function driveUpload() {
  const tok = getAccessToken();
  if (tok) uploadToDrive(tok).catch(() => {});
}

// ── Notification helpers ──────────────────────────────────────────────────────
async function requestNotif() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  return (await Notification.requestPermission()) === "granted";
}
function scheduleNotif(timeStr) {
  if (Notification.permission !== "granted") return;
  const [h, m] = (timeStr || "08:00").split(":").map(Number);
  const fire = new Date(); fire.setHours(h, m, 0, 0);
  if (fire <= new Date()) fire.setDate(fire.getDate() + 1);
  setTimeout(() => {
    if (Notification.permission === "granted")
      new Notification("Insina Health — Medications", { body: "Time to take your medications!", icon: "/favicon.png" });
  }, fire - new Date());
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SL({ children, mb = 8 }) {
  return <div style={{ fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase", color: C.dim, fontFamily: "'DM Mono',monospace", marginBottom: mb }}>{children}</div>;
}
function Card({ children, style = {} }) {
  return <div style={{ background: C.card, border: `1px solid ${C.b2}`, borderRadius: 12, padding: "14px 16px", ...style }}>{children}</div>;
}
function BackBar({ title, nav }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: C.card, borderBottom: `1px solid ${C.b2}`, flexShrink: 0, position: "sticky", top: 0, zIndex: 10 }}>
      <button onClick={() => nav("home")} style={{ background: "none", border: "none", color: C.blue, fontSize: 20, cursor: "pointer", padding: "0 4px", lineHeight: 1 }}>←</button>
      <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 18, color: C.p, fontWeight: 400 }}>{title}</div>
    </div>
  );
}
function SOSStrip() {
  const primary = rls("mi_emergency_contacts", []).find(c => c.primary) || rls("mi_emergency_contacts", [])[0];
  if (!primary) return null;
  return (
    <div style={{ background: "#1a0505", borderBottom: "1px solid #3d1212", display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", flexShrink: 0 }}>
      <div style={{ fontSize: 9, color: C.red, fontFamily: "'DM Mono',monospace", letterSpacing: "1px", textTransform: "uppercase", flexShrink: 0 }}>SOS</div>
      <div style={{ flex: 1, fontSize: 12, color: "#f87171", fontWeight: 600 }}>{primary.name}{primary.relationship ? ` · ${primary.relationship}` : ""}</div>
      {primary.phone && (
        <a href={`tel:${primary.phone.replace(/\D/g, "")}`}
          style={{ background: C.red, color: "#fff", fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono',monospace", padding: "5px 14px", borderRadius: 20, textDecoration: "none", letterSpacing: "0.5px", flexShrink: 0 }}>
          📞 CALL
        </a>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DRIVE SYNC BAR
// ─────────────────────────────────────────────────────────────────────────────
function DriveSyncBar({ syncState, onSync, lastSynced }) {
  const stored = getStoredUser();
  if (!stored) return (
    <div style={{ background: "#0d1a28", borderBottom: `1px solid ${C.b1}`, padding: "8px 16px", display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 11, color: C.dim, flex: 1, fontFamily: "'DM Mono',monospace" }}>Connect Drive to sync with desktop app</span>
      <button onClick={onSync} style={{ background: "rgba(79,142,247,.15)", border: `1px solid rgba(79,142,247,.3)`, borderRadius: 8, padding: "5px 12px", color: C.blue, fontSize: 11, fontFamily: "'DM Mono',monospace", cursor: "pointer" }}>
        Sign in
      </button>
    </div>
  );
  return (
    <div style={{ background: "#0a1520", borderBottom: `1px solid ${C.b2}`, padding: "6px 16px", display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: syncState === "done" ? C.green : syncState === "syncing" ? C.amber : C.ghost, boxShadow: syncState === "done" ? `0 0 5px ${C.green}60` : "none", flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 10, color: C.ghost, fontFamily: "'DM Mono',monospace" }}>
        {syncState === "syncing" ? "Syncing with Drive…" : syncState === "done" && lastSynced ? `Synced ${lastSynced}` : syncState === "error" ? "Sync failed — tap to retry" : "Drive connected"}
      </span>
      <button onClick={onSync} disabled={syncState === "syncing"} style={{ background: "none", border: "none", color: C.blue, fontSize: 10, fontFamily: "'DM Mono',monospace", cursor: "pointer", opacity: syncState === "syncing" ? 0.4 : 1 }}>
        {syncState === "syncing" ? "…" : "↕ Sync"}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROR BOUNDARY
// ─────────────────────────────────────────────────────────────────────────────
class CompanionErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ background: "#07090f", minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'DM Mono',monospace" }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontSize: 14, color: "#ef4444", fontWeight: 700, marginBottom: 8 }}>Companion failed to load</div>
        <div style={{ fontSize: 11, color: "#7eb8d8", marginBottom: 20, textAlign: "center", lineHeight: 1.6 }}>
          {this.state.error?.message || "Unknown error"}
        </div>
        <button onClick={() => window.location.reload()} style={{ background: "rgba(79,142,247,.15)", border: "1px solid rgba(79,142,247,.3)", borderRadius: 8, padding: "10px 20px", color: "#4f8ef7", fontSize: 12, cursor: "pointer" }}>
          Reload
        </button>
      </div>
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT COMPANION APP
// ─────────────────────────────────────────────────────────────────────────────
function CompanionAppInner() {
  const [screen, setScreen]     = useState("home");
  const [online, setOnline]     = useState(navigator.onLine);
  const [syncState, setSyncState] = useState("idle");
  const [lastSynced, setLastSynced] = useState(() => {
    const ts = localStorage.getItem("mi_last_sync");
    return ts ? new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : null;
  });
  const [, forceUpdate] = useState(0);

  // Google auth init
  useEffect(() => {
    initGoogleAuth({
      onSignIn: async ({ accessToken }) => {
        setSyncState("syncing");
        try {
          const ts = await fullSync(accessToken);
          setLastSynced(new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }));
          setSyncState("done");
          forceUpdate(n => n + 1); // re-render with fresh data
        } catch { setSyncState("error"); }
      },
    });
  }, []);

  // Online/offline detection
  useEffect(() => {
    const up = () => setOnline(true);
    const dn = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", dn);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", dn); };
  }, []);

  // Re-sync when companion comes back to foreground
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible") {
        const tok = getAccessToken();
        if (tok) {
          setSyncState("syncing");
          fullSync(tok).then(ts => {
            setLastSynced(new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }));
            setSyncState("done");
            forceUpdate(n => n + 1);
          }).catch(() => setSyncState("error"));
        }
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  function handleSync() {
    const tok = getAccessToken();
    if (tok) {
      setSyncState("syncing");
      fullSync(tok).then(ts => {
        setLastSynced(new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }));
        setSyncState("done");
        forceUpdate(n => n + 1);
      }).catch(() => setSyncState("error"));
    } else {
      signIn(); // triggers onSignIn callback above
    }
  }

  const nav = (s) => setScreen(s);
  const critAlerts = getCritAlerts();

  return (
    <div style={{ background: C.bg, minHeight: "100dvh", maxWidth: 430, margin: "0 auto", display: "flex", flexDirection: "column", fontFamily: "'Sora',sans-serif", overflowX: "hidden" }}>

      {/* Offline badge */}
      {!online && (
        <div style={{ background: "#141f00", borderBottom: "1px solid #3a5a00", padding: "5px 16px", fontSize: 10, color: "#a3e635", fontFamily: "'DM Mono',monospace", textAlign: "center", flexShrink: 0 }}>
          📶 Offline — showing cached data
        </div>
      )}

      {/* Drive sync bar */}
      <DriveSyncBar syncState={syncState} onSync={handleSync} lastSynced={lastSynced} />

      {/* Critical alert */}
      {critAlerts.length > 0 && screen === "home" && (
        <div style={{ background: "#1c1200", borderBottom: `1px solid ${C.amber}40`, padding: "8px 16px", display: "flex", gap: 8, alignItems: "flex-start", flexShrink: 0 }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 10, color: C.amber, fontFamily: "'DM Mono',monospace", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 2 }}>Critical Alert</div>
            {critAlerts.slice(0, 2).map((a, i) => <div key={i} style={{ fontSize: 12, color: "#fcd34d", lineHeight: 1.5 }}>{a}</div>)}
          </div>
        </div>
      )}

      {/* Screens */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: screen === "home" ? "auto" : "hidden" }}>
        {screen === "home"         && <CompanionHome nav={nav} driveUpload={driveUpload} />}
        {screen === "appointments" && <CompanionAppointments nav={nav} />}
        {screen === "medications"  && <CompanionMedications nav={nav} driveUpload={driveUpload} />}
        {screen === "vitals"       && <CompanionVitals nav={nav} driveUpload={driveUpload} />}
        {screen === "ai"           && <CompanionAILite nav={nav} />}
        {screen === "symptoms"     && <CompanionSymptoms nav={nav} driveUpload={driveUpload} />}
        {screen === "labs"         && <CompanionLabs nav={nav} />}
        {screen === "conditions"   && <CompanionConditions nav={nav} />}
        {screen === "contacts"     && <CompanionContacts nav={nav} />}
      </div>
    </div>
  );
}

export default function CompanionApp() {
  return (
    <CompanionErrorBoundary>
      <CompanionAppInner />
    </CompanionErrorBoundary>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOME
// ─────────────────────────────────────────────────────────────────────────────
function CompanionHome({ nav, driveUpload }) {
  const [takenIds, setTakenIds] = useState(() => loadTaken());
  const [showReminder, setShowReminder] = useState(false);
  const [reminderTime, setReminderTime] = useState(() => localStorage.getItem("mi_companion_reminder") || "08:00");
  const [notifOk, setNotifOk] = useState(Notification?.permission === "granted");

  const profile  = rls("mi_profile_personal", {});
  const firstName = (profile.name || "").split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const meds    = rls("mi_meds_full", []).filter(m => m.status !== "inactive");
  const readings = rls("mi_readings", []).sort((a, b) => new Date(b.ts || b.date || 0) - new Date(a.ts || a.date || 0));
  const lastBP  = readings.find(r => r.bp_s != null && r.bp_d != null);
  const lastWt  = readings.find(r => r.weight != null);
  const lastSpo = readings.find(r => r.spo2 != null);

  const upcomingAppts = rls("mi_appointments", [])
    .filter(a => { const d = daysUntil(a.date); return d != null && d >= 0 && d <= 3 && a.status !== "completed"; })
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const refills = meds
    .filter(m => { const d = daysUntil(m.refillDate); return d != null && d >= 0 && d <= 7; })
    .sort((a, b) => daysUntil(a.refillDate) - daysUntil(b.refillDate));

  const nextLab = rls("mi_appointments", [])
    .filter(a => a.status !== "completed" && daysUntil(a.date) >= 0 && /lab|draw|blood/i.test(a.title || ""))
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

  function toggleMed(id) {
    const updated = takenIds.includes(id) ? takenIds.filter(x => x !== id) : [...takenIds, id];
    setTakenIds(updated); saveTaken(updated); driveUpload();
  }
  function markAll() {
    const all = meds.map(m => m.id || m.name);
    setTakenIds(all); saveTaken(all); driveUpload();
  }
  async function handleBell() {
    const ok = await requestNotif();
    setNotifOk(ok);
    if (ok) { scheduleNotif(reminderTime); setShowReminder(true); }
  }

  const QUICK = [
    { label: "Care",       icon: "📅", screen: "appointments" },
    { label: "Meds",       icon: "💊", screen: "medications"  },
    { label: "Vitals",     icon: "❤️", screen: "vitals"       },
    { label: "AI Lite",    icon: "✦",  screen: "ai"           },
    { label: "Symptoms",   icon: "🤒", screen: "symptoms"     },
    { label: "Labs",       icon: "🧪", screen: "labs"         },
    { label: "Conditions", icon: "📋", screen: "conditions"   },
    { label: "Contacts",   icon: "📞", screen: "contacts"     },
  ];

  return (
    <div style={{ paddingBottom: 32 }}>
      <SOSStrip />

      <div style={{ padding: "16px 16px 0" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: C.dim, fontFamily: "'DM Mono',monospace" }}>{greeting},</div>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 24, color: C.p, fontWeight: 400, lineHeight: 1.2 }}>{firstName}</div>
          </div>
          <div style={{ fontSize: 10, color: C.ghost, fontFamily: "'DM Mono',monospace", textAlign: "right", lineHeight: 1.7 }}>
            {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}<br />
            {new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </div>
        </div>

        {/* Quick launch */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 16 }}>
          {QUICK.map(q => (
            <button key={q.screen} onClick={() => nav(q.screen)}
              style={{ background: C.card, border: `1px solid ${C.b2}`, borderRadius: 10, padding: "12px 4px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "pointer" }}
              onTouchStart={e => e.currentTarget.style.borderColor = C.blue}
              onTouchEnd={e => e.currentTarget.style.borderColor = C.b2}
            >
              <span style={{ fontSize: 20, lineHeight: 1 }}>{q.icon}</span>
              <span style={{ fontSize: 9, color: C.dim, fontFamily: "'DM Mono',monospace" }}>{q.label}</span>
            </button>
          ))}
        </div>

        {/* Took my meds */}
        <Card style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
            <SL mb={0}>Took My Meds Today</SL>
            <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
              <button onClick={markAll} style={{ fontSize: 10, color: C.green, fontFamily: "'DM Mono',monospace", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Mark all ✓</button>
              <button onClick={handleBell} title="Set reminder" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 15, opacity: notifOk ? 1 : 0.5, lineHeight: 1 }}>🔔</button>
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ height: 3, background: C.b2, borderRadius: 2, marginBottom: 10, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${meds.length ? (takenIds.length / meds.length) * 100 : 0}%`, background: `linear-gradient(90deg,${C.green},${C.blue})`, borderRadius: 2, transition: "width .3s" }} />
          </div>
          {meds.length === 0
            ? <div style={{ fontSize: 12, color: C.ghost, fontFamily: "'DM Mono',monospace" }}>No active medications</div>
            : meds.slice(0, 5).map(m => {
                const id = m.id || m.name;
                const done = takenIds.includes(id);
                return (
                  <button key={id} onClick={() => toggleMed(id)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", background: "none", border: "none", cursor: "pointer", padding: "7px 0", borderBottom: `1px solid ${C.b2}` }}>
                    <div style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${done ? C.green : C.ghost}`, background: done ? C.green + "22" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {done && <span style={{ color: C.green, fontSize: 11, fontWeight: 700 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <div style={{ fontSize: 12, color: done ? C.dim : C.s, fontWeight: 600, textDecoration: done ? "line-through" : "none" }}>{m.name}</div>
                      {(m.dose || m.frequency) && <div style={{ fontSize: 10, color: C.ghost, fontFamily: "'DM Mono',monospace" }}>{[m.dose, m.frequency].filter(Boolean).join(" · ")}</div>}
                    </div>
                  </button>
                );
              })
          }
          {meds.length > 5 && (
            <button onClick={() => nav("medications")} style={{ fontSize: 11, color: C.blue, fontFamily: "'DM Mono',monospace", background: "none", border: "none", cursor: "pointer", padding: "8px 0 0", width: "100%" }}>
              +{meds.length - 5} more — view all
            </button>
          )}
          {showReminder && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.b2}`, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, color: C.dim, fontFamily: "'DM Mono',monospace" }}>Daily reminder:</span>
              <input type="time" value={reminderTime}
                onChange={e => { setReminderTime(e.target.value); localStorage.setItem("mi_companion_reminder", e.target.value); scheduleNotif(e.target.value); }}
                style={{ background: C.bg, border: `1px solid ${C.b1}`, borderRadius: 6, color: C.p, padding: "4px 8px", fontSize: 11, fontFamily: "'DM Mono',monospace" }}
              />
              <button onClick={() => setShowReminder(false)} style={{ fontSize: 11, color: C.ghost, background: "none", border: "none", cursor: "pointer" }}>✕</button>
            </div>
          )}
        </Card>

        {/* Upcoming ≤3 days */}
        <Card style={{ marginBottom: 12 }}>
          <SL>Upcoming Care — Next 3 Days</SL>
          {upcomingAppts.length === 0
            ? <div style={{ fontSize: 12, color: C.ghost, fontFamily: "'DM Mono',monospace" }}>No appointments in the next 3 days</div>
            : upcomingAppts.map(a => (
                <button key={a.id} onClick={() => nav("appointments")} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", background: "none", border: "none", cursor: "pointer", padding: "8px 0", borderBottom: `1px solid ${C.b2}`, textAlign: "left" }}>
                  <span style={{ fontSize: 18 }}>📅</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: C.p, fontWeight: 600 }}>{a.title}</div>
                    <div style={{ fontSize: 10, color: C.amber, fontFamily: "'DM Mono',monospace" }}>{relDate(a.date)}{a.provider ? ` · ${a.provider}` : ""}</div>
                  </div>
                  <span style={{ color: C.blue, fontSize: 14 }}>›</span>
                </button>
              ))
          }
        </Card>

        {/* Refills */}
        <Card style={{ marginBottom: 12 }}>
          <SL>Refills Due — Next 7 Days</SL>
          {refills.length === 0
            ? <div style={{ fontSize: 12, color: C.ghost, fontFamily: "'DM Mono',monospace" }}>No refills due soon</div>
            : refills.map(m => (
                <div key={m.id || m.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `1px solid ${C.b2}` }}>
                  <span style={{ fontSize: 16 }}>💊</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: C.s, fontWeight: 600 }}>{m.name}</div>
                    <div style={{ fontSize: 10, color: C.amber, fontFamily: "'DM Mono',monospace" }}>Refill {relDate(m.refillDate)}</div>
                  </div>
                </div>
              ))
          }
        </Card>

        {/* Vitals snapshot */}
        <Card style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
            <SL mb={0}>Vitals Snapshot</SL>
            <button onClick={() => nav("vitals")} style={{ marginLeft: "auto", fontSize: 11, color: C.blue, fontFamily: "'DM Mono',monospace", background: "none", border: "none", cursor: "pointer", padding: 0 }}>+ Log</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {[
              { label: "Blood Pressure", unit: "mmHg", val: lastBP ? `${lastBP.bp_s}/${lastBP.bp_d}` : "—", color: C.blue },
              { label: "Weight",         unit: "lbs",  val: lastWt  ? `${lastWt.weight}`              : "—", color: C.green },
              { label: "Oxygen Sat.",    unit: "SpO₂", val: lastSpo ? `${lastSpo.spo2}%`              : "—", color: C.purple },
            ].map(v => (
              <div key={v.label} style={{ background: C.bg, border: `1px solid ${C.b2}`, borderRadius: 8, padding: "10px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: v.color, letterSpacing: "-0.5px" }}>{v.val}</div>
                <div style={{ fontSize: 9, color: C.ghost, fontFamily: "'DM Mono',monospace", marginTop: 2 }}>{v.unit}</div>
                <div style={{ fontSize: 8, color: C.ghost, fontFamily: "'DM Mono',monospace", marginTop: 1, lineHeight: 1.3 }}>{v.label}</div>
              </div>
            ))}
          </div>
          {lastBP && <div style={{ fontSize: 9, color: C.ghost, fontFamily: "'DM Mono',monospace", marginTop: 6, textAlign: "center" }}>Last recorded: {fmtShort(lastBP.date)}</div>}
        </Card>

        {/* Next lab draw */}
        {nextLab && (
          <Card style={{ marginBottom: 12 }}>
            <SL>Next Lab Draw</SL>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 22 }}>🧪</span>
              <div>
                <div style={{ fontSize: 13, color: C.p, fontWeight: 600 }}>{nextLab.title}</div>
                <div style={{ fontSize: 11, color: C.amber, fontFamily: "'DM Mono',monospace" }}>{relDate(nextLab.date)} · {fmtShort(nextLab.date)}</div>
                {nextLab.facility && <div style={{ fontSize: 10, color: C.dim, fontFamily: "'DM Mono',monospace" }}>{nextLab.facility}</div>}
              </div>
            </div>
          </Card>
        )}

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APPOINTMENTS
// ─────────────────────────────────────────────────────────────────────────────
function CompanionAppointments({ nav }) {
  const appts = rls("mi_appointments", [])
    .filter(a => a.status !== "completed" && daysUntil(a.date) >= 0)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <BackBar title="Upcoming Care" nav={nav} />
      <div style={{ overflowY: "auto", padding: 16, flex: 1 }}>
        {appts.length === 0
          ? <div style={{ textAlign: "center", padding: "48px 0", color: C.ghost, fontFamily: "'DM Mono',monospace", fontSize: 12 }}>No upcoming appointments</div>
          : appts.map(a => {
              const d = daysUntil(a.date);
              const soon = d != null && d <= 3;
              return (
                <div key={a.id} style={{ background: C.card, border: `1px solid ${soon ? C.amber + "50" : C.b2}`, borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, color: C.p, fontWeight: 600, marginBottom: 2 }}>{a.title}</div>
                      <div style={{ fontSize: 11, color: soon ? C.amber : C.s, fontFamily: "'DM Mono',monospace" }}>
                        {relDate(a.date)}{a.time ? ` · ${a.time}` : ""}
                      </div>
                    </div>
                    {soon && <div style={{ fontSize: 9, background: C.amber + "22", color: C.amber, border: `1px solid ${C.amber}40`, borderRadius: 10, padding: "2px 8px", fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>SOON</div>}
                  </div>
                  {(a.provider || a.facility) && (
                    <div style={{ fontSize: 11, color: C.dim, fontFamily: "'DM Mono',monospace", marginBottom: a.address ? 8 : 0 }}>
                      {[a.provider, a.facility].filter(Boolean).join(" · ")}
                    </div>
                  )}
                  {a.address && (
                    <button
                      onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(a.address)}`, "_blank")}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", background: "rgba(79,142,247,.1)", border: `1px solid rgba(79,142,247,.25)`, borderRadius: 8, padding: "8px 0", color: C.blue, fontSize: 11, fontFamily: "'DM Mono',monospace", cursor: "pointer", marginTop: 8 }}>
                      📍 Get Directions in Maps
                    </button>
                  )}
                  {a.notes && <div style={{ fontSize: 11, color: C.ghost, marginTop: 8, lineHeight: 1.55 }}>{a.notes}</div>}
                </div>
              );
            })
        }
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MEDICATIONS
// ─────────────────────────────────────────────────────────────────────────────
function CompanionMedications({ nav, driveUpload }) {
  const [takenIds, setTakenIds] = useState(() => loadTaken());
  const meds   = rls("mi_meds_full", []);
  const active = meds.filter(m => m.status !== "inactive");
  const inactive = meds.filter(m => m.status === "inactive");

  function toggle(id) {
    const u = takenIds.includes(id) ? takenIds.filter(x => x !== id) : [...takenIds, id];
    setTakenIds(u); saveTaken(u); driveUpload();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <BackBar title="Medications" nav={nav} />
      <div style={{ overflowY: "auto", padding: 16, flex: 1 }}>
        <div style={{ fontSize: 11, color: C.dim, fontFamily: "'DM Mono',monospace", marginBottom: 6 }}>{takenIds.length} / {active.length} taken today</div>
        <div style={{ height: 4, background: C.b2, borderRadius: 2, marginBottom: 16, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${active.length ? (takenIds.length / active.length) * 100 : 0}%`, background: `linear-gradient(90deg,${C.green},${C.blue})`, borderRadius: 2, transition: "width .3s" }} />
        </div>
        <SL>Active Medications</SL>
        {active.map(m => {
          const id = m.id || m.name;
          const done = takenIds.includes(id);
          const refillSoon = daysUntil(m.refillDate) != null && daysUntil(m.refillDate) <= 7;
          return (
            <div key={id} style={{ background: C.card, border: `1px solid ${C.b2}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => toggle(id)} style={{ width: 22, height: 22, borderRadius: 6, border: `1.5px solid ${done ? C.green : C.ghost}`, background: done ? C.green + "22" : "transparent", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {done && <span style={{ color: C.green, fontSize: 13, fontWeight: 700 }}>✓</span>}
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: done ? C.dim : C.p, fontWeight: 600, textDecoration: done ? "line-through" : "none" }}>{m.name}</div>
                <div style={{ fontSize: 10, color: C.ghost, fontFamily: "'DM Mono',monospace", marginTop: 2 }}>{[m.dose, m.frequency].filter(Boolean).join(" · ")}</div>
                {refillSoon && <div style={{ fontSize: 10, color: C.amber, fontFamily: "'DM Mono',monospace", marginTop: 2 }}>⚠ Refill {relDate(m.refillDate)}</div>}
              </div>
            </div>
          );
        })}
        {inactive.length > 0 && (
          <>
            <div style={{ marginTop: 16, marginBottom: 8 }}><SL>Inactive</SL></div>
            {inactive.map(m => (
              <div key={m.id || m.name} style={{ background: "transparent", border: `1px solid ${C.b2}`, borderRadius: 10, padding: "10px 14px", marginBottom: 6, opacity: 0.5 }}>
                <div style={{ fontSize: 12, color: C.dim }}>{m.name}</div>
                <div style={{ fontSize: 10, color: C.ghost, fontFamily: "'DM Mono',monospace" }}>{[m.dose, m.frequency].filter(Boolean).join(" · ")}</div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VITALS
// ─────────────────────────────────────────────────────────────────────────────
const BLANK_V = { bp_s: "", bp_d: "", weight: "", spo2: "", hr: "", rr: "" };
function Stat({ label, val, color }) {
  return <div><div style={{ fontSize: 9, color: C.ghost, fontFamily: "'DM Mono',monospace" }}>{label}</div><div style={{ fontSize: 13, fontWeight: 700, color }}>{val}</div></div>;
}
function CompanionVitals({ nav, driveUpload }) {
  const [readings, setReadings] = useState(() => rls("mi_readings", []));
  const [form, setForm] = useState(BLANK_V);
  const [showForm, setShowForm] = useState(false);
  const [saved, setSaved] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }
  function handleSave() {
    const hasData = Object.values(form).some(v => v !== "");
    if (!hasData) return;
    const r = {
      id: uid(), ts: new Date().toISOString(), date: toISO(), flag: false, source: "companion",
      ...(form.bp_s && form.bp_d ? { bp_s: +form.bp_s, bp_d: +form.bp_d } : {}),
      ...(form.weight ? { weight: +form.weight } : {}),
      ...(form.spo2   ? { spo2:   +form.spo2   } : {}),
      ...(form.hr     ? { hr:     +form.hr     } : {}),
      ...(form.rr     ? { rr:     +form.rr     } : {}),
    };
    const updated = [r, ...readings];
    setReadings(updated); wls("mi_readings", updated);
    setForm(BLANK_V); setShowForm(false);
    setSaved(true); setTimeout(() => setSaved(false), 2500);
    driveUpload();
  }

  const sorted = [...readings].sort((a, b) => new Date(b.ts || b.date || 0) - new Date(a.ts || a.date || 0));

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <BackBar title="Vitals" nav={nav} />
      <div style={{ overflowY: "auto", padding: 16, flex: 1 }}>
        {saved && <div style={{ background: "#062010", border: `1px solid ${C.green}40`, borderRadius: 8, padding: "8px 14px", marginBottom: 12, fontSize: 11, color: C.green, fontFamily: "'DM Mono',monospace" }}>✓ Reading saved and synced to Drive</div>}
        {!showForm
          ? <button onClick={() => setShowForm(true)} style={{ width: "100%", padding: 12, background: "rgba(79,142,247,.1)", border: `1px solid rgba(79,142,247,.3)`, borderRadius: 10, color: C.blue, fontSize: 13, fontFamily: "'Sora',sans-serif", fontWeight: 600, cursor: "pointer", marginBottom: 16 }}>+ Log New Reading</button>
          : (
            <Card style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: C.p, fontWeight: 600 }}>New Reading</div>
                <button onClick={() => setShowForm(false)} style={{ marginLeft: "auto", background: "none", border: "none", color: C.ghost, cursor: "pointer", fontSize: 18 }}>✕</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                {[
                  { label: "Systolic BP", key: "bp_s", ph: "120" },
                  { label: "Diastolic BP", key: "bp_d", ph: "80" },
                  { label: "Weight (lbs)", key: "weight", ph: "198" },
                  { label: "SpO₂ (%)", key: "spo2", ph: "97" },
                  { label: "Heart Rate", key: "hr", ph: "72" },
                  { label: "Resp Rate", key: "rr", ph: "16" },
                ].map(f => (
                  <div key={f.key}>
                    <div style={{ fontSize: 9, color: C.dim, fontFamily: "'DM Mono',monospace", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 3 }}>{f.label}</div>
                    <input type="number" value={form[f.key]} placeholder={f.ph} onChange={e => set(f.key, e.target.value)}
                      style={{ width: "100%", background: C.bg, border: `1px solid ${C.b1}`, borderRadius: 6, padding: "8px 10px", color: C.p, fontSize: 13, fontFamily: "'DM Mono',monospace", outline: "none", boxSizing: "border-box" }} />
                  </div>
                ))}
              </div>
              <button onClick={handleSave} style={{ width: "100%", padding: 10, background: "rgba(16,185,129,.12)", border: `1px solid rgba(16,185,129,.3)`, borderRadius: 8, color: C.green, fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 600, cursor: "pointer" }}>Save Reading</button>
            </Card>
          )
        }
        <SL>Recent Readings</SL>
        {sorted.length === 0
          ? <div style={{ fontSize: 12, color: C.ghost, fontFamily: "'DM Mono',monospace", padding: "20px 0", textAlign: "center" }}>No readings recorded yet</div>
          : sorted.slice(0, 20).map(r => (
              <div key={r.id || r.ts} style={{ background: C.card, border: `1px solid ${r.flag ? C.amber + "40" : C.b2}`, borderRadius: 10, padding: "10px 14px", marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ fontSize: 10, color: C.ghost, fontFamily: "'DM Mono',monospace" }}>{r.date}</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {r.source === "companion" && <span style={{ fontSize: 9, color: C.blue, fontFamily: "'DM Mono',monospace" }}>📱 companion</span>}
                    {r.flag && <span style={{ fontSize: 9, color: C.amber, fontFamily: "'DM Mono',monospace" }}>⚠ flagged</span>}
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px" }}>
                  {r.bp_s  && r.bp_d && <Stat label="BP"   val={`${r.bp_s}/${r.bp_d}`} color={C.blue} />}
                  {r.weight != null  && <Stat label="Wt"   val={`${r.weight} lbs`}      color={C.green} />}
                  {r.spo2  != null   && <Stat label="SpO₂" val={`${r.spo2}%`}           color={C.purple} />}
                  {r.hr    != null   && <Stat label="HR"   val={`${r.hr} bpm`}          color={C.amber} />}
                  {r.rr    != null   && <Stat label="RR"   val={`${r.rr}/min`}          color={C.dim} />}
                </div>
              </div>
            ))
        }
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AI LITE
// ─────────────────────────────────────────────────────────────────────────────
function CompanionAILite({ nav }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const abortRef  = useRef(null);
  const bottomRef = useRef(null);

  const apiKey = localStorage.getItem("mi_ak") || "";

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function buildSystem() {
    const p = rls("mi_profile_personal", {});
    const conds = rls("mi_conditions", []).filter(c => c.status === "active").map(c => c.name).join(", ") || "None on file";
    const meds  = rls("mi_meds_full",  []).filter(m => m.status !== "inactive").map(m => `${m.name}${m.dose ? " " + m.dose : ""}`).join(", ") || "None on file";
    const vitals = rls("mi_readings", [])
      .sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0)).slice(0, 2)
      .map(r => [r.date, r.bp_s && r.bp_d ? `BP ${r.bp_s}/${r.bp_d}` : null, r.weight ? `${r.weight} lbs` : null, r.spo2 ? `SpO₂ ${r.spo2}%` : null].filter(Boolean).join(" · "))
      .join("; ") || "None recorded";
    return `You are a personal health assistant for ${p.name || "the patient"} on their mobile companion app. Be concise — short paragraphs, bullets only. This is informational only, never medical advice.

Active Conditions: ${conds}
Current Medications: ${meds}
Recent Vitals: ${vitals}

Always advise consulting their physician for clinical decisions. In emergencies, instruct to call 911 immediately.`;
  }

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    if (!apiKey) { setError("API key not set — add it in Settings & Backup on the desktop app."); return; }
    setError("");
    const newMsgs = [...messages, { role: "user", text }];
    setMessages(newMsgs); setInput(""); setStreaming(true);
    const apiMsgs = newMsgs.map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.text }));
    let accum = "";
    setMessages(prev => [...prev, { role: "assistant", text: "", streaming: true }]);
    try {
      const ctrl = new AbortController(); abortRef.current = ctrl;
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", signal: ctrl.signal,
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-haiku-4-5", max_tokens: 512, stream: true, system: buildSystem(), messages: apiMsgs }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `Error ${res.status}`); }
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const d = line.slice(6).trim(); if (d === "[DONE]") continue;
          try { const p = JSON.parse(d); if (p.type === "content_block_delta" && p.delta?.type === "text_delta") { accum += p.delta.text; setMessages(prev => { const c = [...prev]; c[c.length - 1] = { role: "assistant", text: accum, streaming: true }; return c; }); } } catch {}
        }
      }
      setMessages(prev => { const c = [...prev]; c[c.length - 1] = { role: "assistant", text: accum }; return c; });
    } catch (e) {
      if (e.name !== "AbortError") { setMessages(prev => { const c = [...prev]; c[c.length - 1] = { role: "assistant", text: `Error: ${e.message}` }; return c; }); setError(e.message); }
      else { setMessages(prev => { const c = [...prev]; c[c.length - 1] = { role: "assistant", text: accum || "_(stopped)_" }; return c; }); }
    } finally { setStreaming(false); abortRef.current = null; }
  }

  const PROMPTS = ["How are my vitals trending?", "Any drug interactions I should know about?", "What symptoms should I watch for today?"];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
      <BackBar title="AI Health Lite" nav={nav} />
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", paddingTop: 32 }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>✦</div>
            <div style={{ fontSize: 13, color: C.s, marginBottom: 4 }}>Ask a quick health question</div>
            <div style={{ fontSize: 10, color: C.ghost, fontFamily: "'DM Mono',monospace", marginBottom: 20 }}>Concise · mobile-optimised · informational only</div>
            {PROMPTS.map(q => (
              <button key={q} onClick={() => setInput(q)} style={{ display: "block", width: "100%", margin: "7px 0", textAlign: "left", background: C.card, border: `1px solid ${C.b2}`, borderRadius: 8, padding: "10px 12px", color: C.s, fontSize: 12, fontFamily: "'Sora',sans-serif", cursor: "pointer" }}>{q}</button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 12, display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "85%", padding: "10px 13px", borderRadius: 12, background: m.role === "user" ? "rgba(79,142,247,.15)" : C.card, border: `1px solid ${m.role === "user" ? "rgba(79,142,247,.3)" : C.b2}`, fontSize: 12, color: C.p, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
              {m.text || (m.streaming ? <span style={{ color: C.ghost }}>✦ thinking…</span> : "")}
            </div>
          </div>
        ))}
        {error && <div style={{ fontSize: 11, color: C.red, fontFamily: "'DM Mono',monospace", marginBottom: 8 }}>{error}</div>}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: "10px 16px 24px", borderTop: `1px solid ${C.b2}`, background: C.card }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
            placeholder="Ask a health question…"
            style={{ flex: 1, background: C.bg, border: `1px solid ${C.b1}`, borderRadius: 20, padding: "9px 14px", color: C.p, fontSize: 12, fontFamily: "'Sora',sans-serif", outline: "none" }}
          />
          {streaming
            ? <button onClick={() => abortRef.current?.abort()} style={{ background: "rgba(239,68,68,.15)", border: `1px solid rgba(239,68,68,.3)`, borderRadius: 20, padding: "9px 14px", color: C.red, fontSize: 11, fontFamily: "'DM Mono',monospace", cursor: "pointer" }}>Stop</button>
            : <button onClick={send} disabled={!input.trim()} style={{ background: "rgba(79,142,247,.15)", border: `1px solid rgba(79,142,247,.3)`, borderRadius: 20, padding: "9px 16px", color: C.blue, fontSize: 11, fontFamily: "'DM Mono',monospace", cursor: "pointer", opacity: input.trim() ? 1 : 0.4 }}>Send</button>
          }
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SYMPTOMS
// ─────────────────────────────────────────────────────────────────────────────
const SEV = ["mild", "moderate", "severe"];
const sevColor = s => s === "severe" ? C.red : s === "moderate" ? C.amber : C.green;
function CompanionSymptoms({ nav, driveUpload }) {
  const [entries, setEntries] = useState(() => rls("mi_symptoms", []));
  const [form, setForm] = useState({ name: "", severity: "moderate", notes: "", date: toISO() });
  const [showForm, setShowForm] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }
  function save() {
    if (!form.name.trim()) return;
    const updated = [{ id: uid(), ...form }, ...entries];
    setEntries(updated); wls("mi_symptoms", updated);
    setForm({ name: "", severity: "moderate", notes: "", date: toISO() }); setShowForm(false);
    driveUpload();
  }
  function remove(id) { const u = entries.filter(e => e.id !== id); setEntries(u); wls("mi_symptoms", u); driveUpload(); }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <BackBar title="Symptoms" nav={nav} />
      <div style={{ overflowY: "auto", padding: 16, flex: 1 }}>
        {!showForm
          ? <button onClick={() => setShowForm(true)} style={{ width: "100%", padding: 12, background: "rgba(79,142,247,.1)", border: `1px solid rgba(79,142,247,.3)`, borderRadius: 10, color: C.blue, fontSize: 13, fontFamily: "'Sora',sans-serif", fontWeight: 600, cursor: "pointer", marginBottom: 16 }}>+ Log Symptom</button>
          : (
            <Card style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: C.p, fontWeight: 600 }}>Log Symptom</div>
                <button onClick={() => setShowForm(false)} style={{ marginLeft: "auto", background: "none", border: "none", color: C.ghost, cursor: "pointer", fontSize: 18 }}>✕</button>
              </div>
              <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Symptom (e.g. Headache)"
                style={{ width: "100%", background: C.bg, border: `1px solid ${C.b1}`, borderRadius: 6, padding: "8px 10px", color: C.p, fontSize: 12, outline: "none", marginBottom: 10, boxSizing: "border-box" }} />
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                {SEV.map(s => (
                  <button key={s} onClick={() => set("severity", s)} style={{ flex: 1, padding: "7px 0", borderRadius: 6, border: `1.5px solid ${form.severity === s ? sevColor(s) : C.b2}`, background: form.severity === s ? sevColor(s) + "22" : "transparent", color: form.severity === s ? sevColor(s) : C.ghost, fontSize: 11, fontFamily: "'DM Mono',monospace", cursor: "pointer" }}>{s}</button>
                ))}
              </div>
              <input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Notes (optional)"
                style={{ width: "100%", background: C.bg, border: `1px solid ${C.b1}`, borderRadius: 6, padding: "8px 10px", color: C.p, fontSize: 12, outline: "none", marginBottom: 10, boxSizing: "border-box" }} />
              <button onClick={save} disabled={!form.name.trim()} style={{ width: "100%", padding: 10, background: "rgba(16,185,129,.12)", border: `1px solid rgba(16,185,129,.3)`, borderRadius: 8, color: C.green, fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 600, cursor: "pointer", opacity: form.name.trim() ? 1 : 0.5 }}>Save Symptom</button>
            </Card>
          )
        }
        <SL>Recent Symptoms</SL>
        {entries.length === 0
          ? <div style={{ fontSize: 12, color: C.ghost, fontFamily: "'DM Mono',monospace", padding: "20px 0", textAlign: "center" }}>No symptoms logged</div>
          : entries.slice(0, 30).map(e => (
              <div key={e.id} style={{ background: C.card, border: `1px solid ${C.b2}`, borderRadius: 10, padding: "10px 14px", marginBottom: 8, display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <div style={{ fontSize: 13, color: C.p, fontWeight: 600 }}>{e.name}</div>
                    <div style={{ fontSize: 9, background: sevColor(e.severity) + "22", color: sevColor(e.severity), border: `1px solid ${sevColor(e.severity)}40`, borderRadius: 10, padding: "1px 7px", fontFamily: "'DM Mono',monospace" }}>{e.severity}</div>
                  </div>
                  <div style={{ fontSize: 10, color: C.ghost, fontFamily: "'DM Mono',monospace" }}>{e.date}</div>
                  {e.notes && <div style={{ fontSize: 11, color: C.dim, marginTop: 3 }}>{e.notes}</div>}
                </div>
                <button onClick={() => remove(e.id)} style={{ background: "none", border: "none", color: C.ghost, cursor: "pointer", fontSize: 14, padding: "0 2px", alignSelf: "flex-start" }}>✕</button>
              </div>
            ))
        }
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LABS
// ─────────────────────────────────────────────────────────────────────────────
function CompanionLabs({ nav }) {
  const labs = rls("mi_labs", []);
  const latest = {};
  labs.forEach(l => {
    const k = (l.name || "").toLowerCase().trim();
    if (k && (!latest[k] || new Date(l.date || 0) > new Date(latest[k].date || 0))) latest[k] = l;
  });
  const deduped  = Object.values(latest).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  const flagged  = deduped.filter(l => l.flag);
  const normal   = deduped.filter(l => !l.flag);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <BackBar title="Lab Results" nav={nav} />
      <div style={{ overflowY: "auto", padding: 16, flex: 1 }}>
        {flagged.length > 0 && (
          <>
            <SL>Flagged</SL>
            {flagged.map(l => <LabRow key={l.name} l={l} />)}
            <div style={{ marginBottom: 16 }} />
          </>
        )}
        <SL>Most Recent Results</SL>
        {deduped.length === 0
          ? <div style={{ fontSize: 12, color: C.ghost, fontFamily: "'DM Mono',monospace", padding: "20px 0", textAlign: "center" }}>No lab results on file</div>
          : normal.map(l => <LabRow key={l.name} l={l} />)
        }
      </div>
    </div>
  );
}
function LabRow({ l }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${l.flag ? C.amber + "40" : C.b2}`, borderRadius: 10, padding: "10px 14px", marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: C.p, fontWeight: 600 }}>{l.name}</div>
          <div style={{ fontSize: 10, color: C.ghost, fontFamily: "'DM Mono',monospace", marginTop: 1 }}>
            Tested: {l.date ? String(l.date).slice(0, 10) : "—"}
            {l.refRange ? ` · Ref: ${l.refRange}` : ""}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: l.flag ? C.amber : C.green }}>{l.value || "—"}{l.unit ? ` ${l.unit}` : ""}</div>
          {l.flag && <div style={{ fontSize: 9, color: C.amber, fontFamily: "'DM Mono',monospace" }}>⚠ Flagged</div>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONDITIONS
// ─────────────────────────────────────────────────────────────────────────────
function CompanionConditions({ nav }) {
  const conditions = rls("mi_conditions", []);
  const active = conditions.filter(c => c.status === "active");
  const history = conditions.filter(c => c.status !== "active");

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <BackBar title="Conditions" nav={nav} />
      <div style={{ overflowY: "auto", padding: 16, flex: 1 }}>
        <SL>Active</SL>
        {active.length === 0
          ? <div style={{ fontSize: 12, color: C.ghost, fontFamily: "'DM Mono',monospace", padding: "12px 0" }}>No active conditions on file</div>
          : active.map((c, i) => (
              <div key={c.id || i} style={{ background: C.card, border: `1px solid ${C.b2}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.green, boxShadow: `0 0 6px ${C.green}60`, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: C.p, fontWeight: 600 }}>{c.name}</div>
                  {c.since && <div style={{ fontSize: 10, color: C.ghost, fontFamily: "'DM Mono',monospace" }}>Since {c.since}</div>}
                  {c.notes && <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{c.notes}</div>}
                </div>
              </div>
            ))
        }
        {history.length > 0 && (
          <>
            <div style={{ marginTop: 16, marginBottom: 8 }}><SL>History</SL></div>
            {history.map((c, i) => (
              <div key={c.id || i} style={{ background: "transparent", border: `1px solid ${C.b2}`, borderRadius: 10, padding: "10px 14px", marginBottom: 6, opacity: 0.55 }}>
                <div style={{ fontSize: 12, color: C.dim }}>{c.name}</div>
                {c.status && <div style={{ fontSize: 10, color: C.ghost, fontFamily: "'DM Mono',monospace", textTransform: "capitalize" }}>{c.status}</div>}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTACTS
// ─────────────────────────────────────────────────────────────────────────────
function CompanionContacts({ nav }) {
  const contacts = rls("mi_emergency_contacts", []);
  const primary  = contacts.find(c => c.primary);
  const others   = contacts.filter(c => !c.primary);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <BackBar title="Emergency Contacts" nav={nav} />
      <div style={{ overflowY: "auto", padding: 16, flex: 1 }}>
        {contacts.length === 0
          ? <div style={{ textAlign: "center", padding: "48px 16px", color: C.ghost, fontFamily: "'DM Mono',monospace", fontSize: 12, lineHeight: 1.8 }}>No emergency contacts saved.<br />Add them on the desktop app<br />under Profile.</div>
          : <>
              {primary && <><SL>Primary Contact</SL><ContactCard c={primary} primary /></>}
              {others.length > 0 && (
                <>
                  <div style={{ marginTop: 16, marginBottom: 8 }}><SL>Other Contacts</SL></div>
                  {others.map((c, i) => <ContactCard key={c.id || i} c={c} />)}
                </>
              )}
            </>
        }
      </div>
    </div>
  );
}
function ContactCard({ c, primary }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${primary ? C.red + "40" : C.b2}`, borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: primary ? "rgba(239,68,68,.15)" : "rgba(79,142,247,.12)", border: `1.5px solid ${primary ? C.red + "40" : "rgba(79,142,247,.25)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, color: C.p, fontWeight: 700 }}>
          {(c.name || "?")[0].toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ fontSize: 14, color: C.p, fontWeight: 600 }}>{c.name}</div>
            {primary && <div style={{ fontSize: 9, background: "rgba(239,68,68,.1)", color: C.red, border: `1px solid ${C.red}30`, borderRadius: 10, padding: "1px 7px", fontFamily: "'DM Mono',monospace" }}>Primary</div>}
          </div>
          {c.relationship && <div style={{ fontSize: 11, color: C.dim, fontFamily: "'DM Mono',monospace" }}>{c.relationship}</div>}
          {c.email && <div style={{ fontSize: 10, color: C.ghost, fontFamily: "'DM Mono',monospace", marginTop: 2 }}>{c.email}</div>}
        </div>
      </div>
      {c.phone && (
        <a href={`tel:${c.phone.replace(/\D/g, "")}`}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: primary ? "rgba(239,68,68,.12)" : "rgba(79,142,247,.1)", border: `1px solid ${primary ? "rgba(239,68,68,.3)" : "rgba(79,142,247,.3)"}`, borderRadius: 8, padding: "10px 0", color: primary ? C.red : C.blue, fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 600, textDecoration: "none" }}>
          📞 {c.phone}
        </a>
      )}
    </div>
  );
}
