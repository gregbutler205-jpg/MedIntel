import { useState, useEffect, useCallback } from "react";
import { getStore, setStore, mergeReadings, mergeMeds, mergeLabs, mergeRecords, addImportLog } from './store.js';
import LockScreen from './components/LockScreen.jsx';
import RIEWidget from './rie/ReviewQueuePanel.jsx';
import SearchPopup from './components/SearchPopup.jsx';
import { initGoogleAuth, signIn, signOut, getStoredUser, getAccessToken } from './lib/googleAuth.js';
import { getAutoLockMinutes } from './lib/autoLock.js';
import { fullSync, uploadToDrive, uploadWeeklyBackup, WEEKLY_INTERVAL_MS, collectLocalData } from './lib/driveSync.js';

const INTELLITRAX_LOGO = import.meta.env.BASE_URL + "logo-white.png";

// ── Tab component imports ─────────────────────────────────────────────────────
import TabProfile     from './components/tabs/Tab02.jsx';
import TabRecords     from './components/tabs/Tab03.jsx';
import TabMedications from './components/tabs/Tab04.jsx';
import TabLabs        from './components/tabs/Tab05.jsx';
import TabVitals      from './components/tabs/Tab06.jsx';
import TabSymptoms    from './components/tabs/Tab07.jsx';
import TabCareplan    from './components/tabs/Tab08.jsx';
import TabDocuments   from './components/tabs/Tab09.jsx';
import TabNotes       from './components/tabs/Tab10.jsx';
import TabAI          from './components/tabs/Tab11.jsx';
import TabImport       from './components/tabs/Tab12.jsx';
import TabBackup       from './components/tabs/Tab13.jsx';
import TabAppointments from './components/tabs/Tab14.jsx';
import TabConditions   from './components/tabs/Tab15.jsx';
import TabSurgeries    from './components/tabs/Tab16.jsx';

// ── Routing maps ─────────────────────────────────────────────────────────────
// These 4 tabs are full standalone apps (own sidebar + own topbar + height:100vh).
// App.jsx hands control entirely to them and passes onNavChange for inter-tab nav.
const STANDALONE_TABS = new Set(["medications", "labs", "vitals", "symptoms"]);

// Nav-id → component (non-dashboard tabs only)
const TAB_COMPONENTS = {
  profile:     TabProfile,
  records:     TabRecords,
  medications: TabMedications,
  labs:        TabLabs,
  vitals:      TabVitals,
  symptoms:    TabSymptoms,
  careplan:    TabCareplan,
  documents:   TabDocuments,
  notes:       TabNotes,
  ai:          TabAI,
  import:       TabImport,
  backup:       TabBackup,
  appointments: TabAppointments,
  conditions:   TabConditions,
  surgeries:    TabSurgeries,
};

// ── Featured labs helper ──────────────────────────────────────────────────────
const FEATURED_LAB_DEFS = [
  { label: "Alk Phos",   pattern: /alk.*phos|alkaline.*phos/i },
  { label: "ALT",        pattern: /\balt\b|alanine\s*(amino)?trans/i },
  { label: "AST",        pattern: /\bast\b|aspartate\s*(amino)?trans/i },
  { label: "Bilirubin",  pattern: /bilirubin/i },
  { label: "Glucose",    pattern: /\bglucose\b/i },
  { label: "Calcium",    pattern: /\bcalcium\b/i },
  { label: "Platelets",  pattern: /platelet/i },
  { label: "Creatinine", pattern: /\bcreatinine\b/i },
  { label: "eGFR",       pattern: /egfr|glom.*filt/i },
  { label: "Sodium",     pattern: /\bsodium\b/i },
  { label: "Magnesium",  pattern: /magnesium/i },
];

function generateAutoAlerts() {
  const dismissed = (() => { try { return new Set(JSON.parse(localStorage.getItem("mi_dismissed_alerts") || "[]")); } catch { return new Set(); } })();
  const alerts = [];
  try {
    // Flagged labs
    const labs = JSON.parse(localStorage.getItem("mi_labs") || "[]");
    const latest = {};
    labs.forEach(l => {
      const key = (l.name || "").toLowerCase().trim();
      if (!key) return;
      if (!latest[key] || new Date(l.date || 0) > new Date(latest[key].date || 0)) latest[key] = l;
    });
    Object.values(latest).filter(l => l.flag).forEach(l => {
      const text = `${l.name} flagged${l.value ? ` — value: ${l.value}${l.unit ? " " + l.unit : ""}` : ""}${l.refRange ? ` (ref: ${l.refRange})` : ""}`;
      const fp = `auto:warn:${text.substring(0, 60)}`;
      if (!dismissed.has(fp)) alerts.push({ type:"warn", text, time: l.date ? l.date.slice(5).replace("-","/") : "—", fp, source:"auto" });
    });
    // Flagged vitals
    const readings = JSON.parse(localStorage.getItem("mi_readings") || "[]");
    readings.filter(r => r.flag).slice(0,3).forEach(r => {
      const bpStr = (r.bp_s != null && r.bp_d != null) ? ` BP ${r.bp_s}/${r.bp_d}` : "";
      const text = `Flagged vital reading${bpStr}`;
      const fp = `auto:warn:${text.substring(0,60)}:${r.date||""}`;
      if (!dismissed.has(fp)) alerts.push({ type:"warn", text, time: r.date || "—", fp, source:"auto" });
    });
  } catch {}
  return alerts;
}

function getFeaturedLabs() {
  try {
    const all = JSON.parse(localStorage.getItem("mi_labs") || "[]");
    // Deduplicate: latest per test name
    const latest = {};
    all.forEach(l => {
      const key = (l.name || "").toLowerCase().trim();
      if (!key) return;
      if (!latest[key] || new Date(l.date || 0) > new Date(latest[key].date || 0)) latest[key] = l;
    });
    const deduped = Object.values(latest);
    // Match to featured tests
    return FEATURED_LAB_DEFS.map(def => {
      const match = deduped.find(l => def.pattern.test(l.name || ""));
      return { label: def.label, lab: match || null };
    });
  } catch { return FEATURED_LAB_DEFS.map(def => ({ label: def.label, lab: null })); }
}

// ── Assets & static data ──────────────────────────────────────────────────────
const SHIELD_LOGO = "data:image/jpeg;base64,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";

const NAV = [
  // ── Core ────────────────────────────────────────────────────────────────────
  { id: "dashboard",   icon: "⬡", label: "Dashboard" },
  { id: "profile",     icon: "◯", label: "Profile" },
  { id: "conditions",  icon: "◎", label: "Conditions" },
  { id: "surgeries",   icon: "✦", label: "Surgeries" },
  { id: "medications", icon: "⬡", label: "Medications" },
  { id: "labs",        icon: "◈", label: "Labs & Trends" },
  { id: "vitals",      icon: "♡", label: "Vitals" },
  { id: "symptoms",    icon: "◎", label: "Symptoms" },
  { id: "appointments",icon: "◻", label: "Appointments" },
  { id: "careplan",    icon: "◷", label: "Care Plan/Team" },
  // ── System ──────────────────────────────────────────────────────────────────
  { id: "records",     icon: "▤", label: "Records" },
  { id: "documents",   icon: "▣", label: "Documents" },
  { id: "notes",       icon: "◻", label: "Notes" },
  { id: "ai",          icon: "✦", label: "AI Analysis" },
  { id: "import",      icon: "↓", label: "Import Records" },
  { id: "backup",      icon: "◈", label: "Settings & Backup" },
];

// ── Helper functions (accept data as params so they work with live state) ─────
function parseRefillDate(str) {
  if (!str) return new Date(0);
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return new Date(str + "T12:00:00");
  const yr = new Date().getFullYear();
  const d = new Date(`${str}, ${yr}`);
  if (isNaN(d.getTime())) return new Date(0);
  // if date is more than 6 months in the past, assume next year
  if (d < new Date(Date.now() - 180 * 86400000)) d.setFullYear(yr + 1);
  return d;
}

function get7DayRefills(meds) {
  const now = new Date(); now.setHours(0,0,0,0);
  const end = new Date(now); end.setDate(now.getDate() + 7); end.setHours(23,59,59,999);
  return meds.filter(m => { const d = parseRefillDate(m.refillDate); return d >= now && d <= end; });
}

// ── Dashboard stat cards (receive live data as props) ─────────────────────────
function DataFreshnessCard() {
  function lastUpdated(key, dateFn) {
    try {
      const items = JSON.parse(localStorage.getItem(key) || "[]");
      if (!items.length) return null;
      const dates = items.map(dateFn).filter(Boolean).map(raw => {
        // Numeric timestamp (e.g. id: Date.now()) — already local-time-safe
        if (typeof raw === "number") return new Date(raw);
        // ISO date string "YYYY-MM-DD" — parse as local noon to avoid UTC-offset day-shift
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return new Date(raw + "T12:00:00");
        return new Date(raw);
      }).filter(d => !isNaN(d));
      if (!dates.length) return null;
      const latest = new Date(Math.max(...dates));
      return latest.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch { return null; }
  }

  const rows = [
    { label: "Labs",         date: lastUpdated("mi_labs",         l => l.date) },
    { label: "Meds",         date: lastUpdated("mi_meds_full",    m => m.id ? Number(m.id) : null) },
    { label: "Vitals",       date: lastUpdated("mi_readings",     r => r.date || (r.ts ? Number(r.ts) : null)) },
    { label: "Appointments", date: lastUpdated("mi_appointments", a => a.date) },
    { label: "Conditions",   date: lastUpdated("mi_conditions",   c => c.since || c.diagnosedDate) },
    { label: "Documents",    date: lastUpdated("mi_ref_docs",     d => d.studyDate || d.addedDate || d.addedAt) },
  ];

  return (
    <div className="stat-card">
      <div style={{ width:28, height:3, background:"#4f8ef7", borderRadius:2, marginBottom:14, boxShadow:"0 0 10px #4f8ef760" }} />
      <div style={{ fontSize:12, fontWeight:600, color:"#7eb8d8", marginBottom:12 }}>Last Updated</div>
      <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
        {rows.map(({ label, date }) => (
          <div key={label} style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:11, color:"#7eb8d8", fontFamily:"'DM Mono',monospace" }}>{label}</span>
            <span style={{ fontSize:11, color: date ? "#c4d8ee" : "#4a5c6a", fontFamily:"'DM Mono',monospace" }}>
              {date ?? "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
function RefillsCard({ meds }) {
  const [open, setOpen] = useState(false);
  const refills = get7DayRefills(meds);
  const now = new Date();
  const end = new Date(now); end.setDate(now.getDate() + 7);
  const fmt = d => d.toLocaleDateString("en-US", { month:"short", day:"numeric" });
  return (
    <div className="stat-card" style={{ cursor:"pointer" }} onClick={() => setOpen(o => !o)}>
      <div style={{ width:28, height:3, background:"#f59e0b", borderRadius:2, marginBottom:14, boxShadow:"0 0 10px #f59e0b60" }} />
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:12, fontWeight:600, color:"#7eb8d8", marginBottom:6 }}>Refills ≤7 Days</div>
          <div style={{ fontSize:26, fontWeight:700, color:"#dde8f5", letterSpacing:"-1px", lineHeight:1, marginBottom:6 }}>{refills.length}</div>
          <div style={{ fontSize:10, color:"#98afc4", fontFamily:"'DM Mono',monospace" }}>{fmt(now)} – {fmt(end)}</div>
        </div>
        <div style={{ fontSize:14, color:"#f59e0b", marginTop:2, transition:"transform .2s", transform:open?"rotate(180deg)":"rotate(0deg)" }}>▾</div>
      </div>
      {open && (
        <div style={{ marginTop:12, paddingTop:10, borderTop:"1px solid #0d1a28" }}>
          {refills.length === 0
            ? <div style={{ fontSize:11, color:"#98afc4", fontFamily:"'DM Mono',monospace" }}>No refills due in the next 7 days</div>
            : refills.map((r, i) => (
              <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"5px 0", borderBottom:i<refills.length-1?"1px solid #0d1a28":"none" }}>
                <div style={{ width:5, height:5, borderRadius:"50%", background:"#f59e0b", flexShrink:0, marginTop:3 }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11, color:"#c4d8ee" }}>{r.name}</div>
                  {r.rxNumber && <div style={{ fontSize:9, color:"#4a6070", fontFamily:"'DM Mono',monospace", marginTop:1 }}>Rx# {r.rxNumber}</div>}
                </div>
                <div style={{ fontSize:10, color:"#98afc4", fontFamily:"'DM Mono',monospace", flexShrink:0 }}>{r.refillDate}</div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}
function BPCard({ readings }) {
  const r = readings[0] ?? {};
  return (
    <div className="stat-card">
      <div style={{ width:28, height:3, background:"#4f8ef7", borderRadius:2, marginBottom:14, boxShadow:"0 0 10px #4f8ef760" }} />
      <div style={{ fontSize:12, fontWeight:600, color:"#7eb8d8", marginBottom:6 }}>Blood Pressure</div>
      <div style={{ fontSize:26, fontWeight:700, color:"#dde8f5", letterSpacing:"-1px", lineHeight:1, marginBottom:6 }}>{r.bp_s ?? "--"}/{r.bp_d ?? "--"}</div>
      <div style={{ fontSize:10, color:"#98afc4", fontFamily:"'DM Mono',monospace" }}>Recorded {r.date ?? "--"}</div>
    </div>
  );
}
function getHeightInchesApp() {
  try {
    const p = JSON.parse(localStorage.getItem("mi_profile_personal") || "{}");
    const h = (p.height || "").trim();
    if (!h) return null;
    const m1 = h.match(/(\d+)\s*['′ft]+\s*(\d+)/i);
    if (m1) return parseInt(m1[1]) * 12 + parseInt(m1[2]);
    const m2 = h.match(/^(\d+\.?\d*)\s*(in|")?$/i);
    if (m2) { const n = parseFloat(m2[1]); if (n > 48 && n < 110) return n; }
    const m3 = h.match(/(\d+\.?\d*)\s*cm/i);
    if (m3) return parseFloat(m3[1]) / 2.54;
    return null;
  } catch { return null; }
}
function calcBMIApp(weightLbs) {
  const h = getHeightInchesApp();
  if (!h || !weightLbs) return null;
  return +((weightLbs / (h * h)) * 703).toFixed(1);
}

function BMICard({ readings }) {
  const weight = readings.find(r => r.weight != null)?.weight;
  const bmi = calcBMIApp(weight);
  const { label, color } = bmi == null
    ? { label: weight ? "Set height in Profile" : "No weight data", color: "#98afc4" }
    : bmi < 18.5 ? { label: "Underweight", color: "#4f8ef7" }
    : bmi < 25   ? { label: "Normal",      color: "#10b981" }
    : bmi < 30   ? { label: "Overweight",  color: "#f59e0b" }
    :              { label: "Obese",        color: "#ef4444" };
  return (
    <div className="stat-card">
      <div style={{ width:28, height:3, background:"#10b981", borderRadius:2, marginBottom:14, boxShadow:"0 0 10px #10b98160" }} />
      <div style={{ fontSize:12, fontWeight:600, color:"#7eb8d8", marginBottom:6 }}>BMI</div>
      <div style={{ fontSize:26, fontWeight:700, color:"#dde8f5", letterSpacing:"-1px", lineHeight:1, marginBottom:6 }}>{bmi != null ? bmi : "--"}</div>
      <div style={{ fontSize:11, color, fontWeight:600, marginBottom:3 }}>{label}</div>
      <div style={{ fontSize:10, color:"#98afc4", fontFamily:"'DM Mono',monospace" }}>
        {weight != null ? `From ${weight} lbs · auto-calculated` : "Log weight in Vitals"}
      </div>
    </div>
  );
}

function WeightCard({ readings }) {
  const cur  = readings[0]?.weight;
  const prev = readings[1]?.weight;
  const diff = (cur != null && prev != null) ? Math.round((cur - prev) * 10) / 10 : null;
  const trend  = diff == null ? "flat" : diff < 0 ? "down" : diff > 0 ? "up" : "flat";
  const arrow  = { up:"↑", down:"↓", flat:"→" }[trend];
  const tcolor = { up:"#ef4444", down:"#10b981", flat:"#7eb8d8" }[trend];
  const tlabel = diff == null ? "" : diff === 0 ? "no change" : `${diff > 0 ? "+" : ""}${diff} lbs`;
  return (
    <div className="stat-card">
      <div style={{ width:28, height:3, background:"#a78bfa", borderRadius:2, marginBottom:14, boxShadow:"0 0 10px #a78bfa60" }} />
      <div style={{ fontSize:12, fontWeight:600, color:"#7eb8d8", marginBottom:6 }}>Weight</div>
      <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:6 }}>
        <div style={{ fontSize:26, fontWeight:700, color:"#dde8f5", letterSpacing:"-1px", lineHeight:1 }}>{cur != null ? `${cur} lbs` : "--"}</div>
        {diff != null && <div style={{ fontSize:16, color:tcolor, fontWeight:700 }}>{arrow}</div>}
      </div>
      <div style={{ fontSize:10, color:"#98afc4", fontFamily:"'DM Mono',monospace" }}>
        Recorded {readings[0]?.date ?? "--"}{tlabel ? <> · <span style={{ color:tcolor }}>{tlabel}</span></> : null}
      </div>
    </div>
  );
}

// ── Shared sidebar component (used for non-standalone tabs) ───────────────────
function AppSidebar({ activeNav, setActiveNav }) {
  return (
    <aside style={{
      width: 220, minWidth: 220, height: "100vh",
      background: "#080c14",
      borderRight: "1px solid #0d1a28",
      display: "flex", flexDirection: "column",
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: "10px 20px", borderBottom: "1px solid #0d1a28", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <img src={INTELLITRAX_LOGO} alt="Insina Health" style={{ width: "100%", height: "auto", display: "block" }} />
      </div>

      {/* Patient info */}
      <div style={{ padding: "12px 18px", borderBottom: "1px solid #0d1a28" }}>
        <div style={{ fontSize: 10, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", marginBottom: 4 }}>PATIENT</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#c4d8ee" }}>
          {(() => { try { const p = JSON.parse(localStorage.getItem("mi_profile_personal") || "{}"); return p.name || ""; } catch { return ""; } })()}
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "10px 0" }}>
        <div style={{ padding: "8px 16px 4px", fontSize: 9, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", letterSpacing: "1.5px", textTransform: "uppercase" }}>CORE</div>
        {NAV.slice(0, 10).map(({ id, icon, label }) => (
          <div key={id} className={`nav-item ${activeNav === id ? "active" : ""}`} onClick={() => setActiveNav(id)}>
            <span className="nav-icon">{icon}</span>
            <span>{label}</span>
          </div>
        ))}
        <div style={{ padding: "12px 16px 4px", fontSize: 9, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", letterSpacing: "1.5px", textTransform: "uppercase" }}>SYSTEM</div>
        {NAV.slice(10).map(({ id, icon, label }) => (
          <div key={id} className={`nav-item ${activeNav === id ? "active" : ""}`} onClick={() => setActiveNav(id)}>
            <span className="nav-icon">{icon}</span>
            <span>{label}</span>
            {id === "ai" && <span style={{ marginLeft: "auto", fontSize: 8, background: "#4f8ef7", color: "#fff", padding: "1px 5px", borderRadius: 8, fontFamily: "'DM Mono',monospace" }}>AI</span>}
          </div>
        ))}
      </nav>

      <div style={{ padding: "12px 16px", borderTop: "1px solid #0d1a28" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 10, color: "#1e4030", fontFamily: "'DM Mono',monospace" }}>
          <div className="live-dot" />
          All systems nominal
        </div>
      </div>
    </aside>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem("mi_unlocked") === "1"
  );
  const [autoLockVersion, setAutoLockVersion] = useState(0);

  const lock = useCallback(() => {
    sessionStorage.removeItem("mi_unlocked");
    setUnlocked(false);
  }, []);

  // Re-arm the timer when the auto-lock setting changes mid-session.
  useEffect(() => {
    const h = () => setAutoLockVersion(v => v + 1);
    window.addEventListener("mi-autolock-changed", h);
    return () => window.removeEventListener("mi-autolock-changed", h);
  }, []);

  // Inactivity auto-lock: after the configured idle time, return to the lock
  // screen. AppShell unmounts when locked, so no data remains on screen.
  useEffect(() => {
    if (!unlocked) return;
    const minutes = getAutoLockMinutes();
    if (!minutes) return; // 0 = disabled
    const ms = minutes * 60 * 1000;
    let timer;
    const reset = () => { clearTimeout(timer); timer = setTimeout(lock, ms); };
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [unlocked, lock, autoLockVersion]);

  if (!unlocked) {
    return <LockScreen onUnlock={() => setUnlocked(true)} />;
  }

  return <AppShell />;
}

function AppShell() {
  const [activeNav, setActiveNav]     = useState("dashboard");
  const [time, setTime]           = useState(new Date());
  const [readings, setReadings]   = useState(() => getStore('readings'));
  const [meds, setMeds]           = useState(() => getStore('meds_full'));
  const [alerts, setAlerts]       = useState(() => {
    const stored = getStore('alerts').map((a, i) => ({ ...a, fp: `stored:${i}:${(a.text||"").substring(0,40)}`, source:"stored" }));
    const auto = generateAutoAlerts();
    return [...auto, ...stored].slice(0, 10);
  });
  const [upcoming, setUpcoming]   = useState(() => {
    // Prefer appointments store (Tab14); fall back to legacy mi_upcoming / defaults
    try {
      const raw = localStorage.getItem("mi_appointments");
      if (raw) {
        const appts = JSON.parse(raw);
        return appts
          .filter(a => a.status === "upcoming")
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .slice(0, 5)
          .map(a => ({
            label:   a.title,
            date:    new Date(a.date + "T12:00:00").toLocaleDateString("en-US", { month:"short", day:"numeric" }),
            urgency: a.urgency,
            doctor:  a.provider,
          }));
      }
    } catch {}
    return getStore('upcoming');
  });
  const [lastImport, setLastImport] = useState(() => getStore('lastImport'));
  const [activeConditions, setActiveConditions] = useState(() => {
    try {
      const raw = localStorage.getItem("mi_conditions");
      if (raw) return JSON.parse(raw).filter(c => c.status === "active");
    } catch {}
    return [];
  });
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [quickReading, setQuickReading] = useState({ bp_s:"", bp_d:"", weight:"", date:"" });
  const [showSearch, setShowSearch] = useState(false);

  // ── Google Drive auth & sync state ──────────────────────────────────────────
  const [googleUser, setGoogleUser] = useState(() => getStoredUser());
  const [syncStatus, setSyncStatus] = useState("idle"); // "idle" | "syncing" | "done" | "error"
  const [lastSyncTs, setLastSyncTs] = useState(() => localStorage.getItem("mi_last_sync"));
  const [lastWeeklyBackup, setLastWeeklyBackup] = useState(() => localStorage.getItem("mi_last_weekly_backup"));
  const [showBackupBanner, setShowBackupBanner] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // Refresh dashboard data from localStorage each time the user navigates to the dashboard
  useEffect(() => {
    if (activeNav !== "dashboard") return;
    setReadings(getStore('readings'));
    setMeds(getStore('meds_full'));
    // Refresh auto-alerts from flagged labs + vitals
    const auto = generateAutoAlerts();
    const stored = getStore('alerts').map((a, i) => ({ ...a, fp: `stored:${i}:${(a.text||"").substring(0,40)}`, source:"stored" }));
    setAlerts([...auto, ...stored].slice(0, 10));
    try {
      const raw = localStorage.getItem("mi_appointments");
      if (raw) {
        const appts = JSON.parse(raw);
        const next = appts
          .filter(a => a.status === "upcoming")
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .slice(0, 5)
          .map(a => ({
            label:   a.title,
            date:    new Date(a.date + "T12:00:00").toLocaleDateString("en-US", { month:"short", day:"numeric" }),
            urgency: a.urgency,
            doctor:  a.provider,
          }));
        if (next.length > 0) setUpcoming(next);
      }
    } catch {}
  }, [activeNav]);

  // Download + merge from Drive, then refresh dashboard data from localStorage.
  const refreshFromDrive = useCallback(async (token) => {
    setSyncStatus("syncing");
    try {
      const ts = await fullSync(token);
      setLastSyncTs(ts);
      setSyncStatus("done");
      setReadings(getStore('readings'));
      setMeds(getStore('meds_full'));
      // Let open tabs (e.g. Vitals) re-read the freshly-merged data.
      window.dispatchEvent(new Event("mi-data-synced"));
    } catch (e) {
      console.error("[DriveSync]", e);
      setSyncStatus("error");
    }
  }, []);

  // ── Google auth init + auto-pull on open ────────────────────────────────────
  useEffect(() => {
    initGoogleAuth({
      onSignIn: ({ accessToken, user }) => {
        if (user) setGoogleUser(user);
        refreshFromDrive(accessToken);
      },
      onSignOut: () => {
        setGoogleUser(null);
        setSyncStatus("idle");
        setLastSyncTs(null);
      },
    });
    // If Drive was connected before, silently re-acquire a token on load so we
    // pull anything logged elsewhere (e.g. the phone companion) without waiting
    // for a manual Sync click.
    if (getStoredUser()) signIn();
  }, [refreshFromDrive]);

  // Pull again whenever the user returns to the app (e.g. after logging on the
  // phone, then switching back to the desktop tab).
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const token = getAccessToken();
      if (token) refreshFromDrive(token);
      else if (getStoredUser()) signIn(); // expired — silently re-auth, onSignIn re-syncs
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [refreshFromDrive]);

  // ── Global search keyboard shortcut (Cmd+K / Ctrl+K) ──────────────────────
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(s => !s);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // ── Periodic background upload every 10 minutes while token is live ─────────
  useEffect(() => {
    if (!googleUser) return;
    const id = setInterval(async () => {
      const token = getAccessToken();
      if (!token) return; // Token expired — wait for user to re-auth via Sync button
      try {
        const ts = await uploadToDrive(token);
        setLastSyncTs(ts);
      } catch (e) {
        console.warn("[DriveSync] background upload failed:", e);
      }
    }, 10 * 60 * 1000); // 10 minutes
    return () => clearInterval(id);
  }, [googleUser]);

  // ── Weekly backup check on mount ─────────────────────────────────────────────
  useEffect(() => {
    const last  = localStorage.getItem("mi_last_weekly_backup");
    const overdue = !last || (Date.now() - new Date(last).getTime()) > WEEKLY_INTERVAL_MS;
    if (!overdue) return;

    const token = getAccessToken();
    if (googleUser && token) {
      // Drive connected — auto-backup silently
      uploadWeeklyBackup(token)
        .then(ts => setLastWeeklyBackup(ts))
        .catch(e => console.warn("[WeeklyBackup] auto-backup failed:", e));
    } else if (!googleUser) {
      // No Drive — show reminder banner
      setShowBackupBanner(true);
    }
  }, []); // intentionally once on mount

  // Called by ImportTab when the user confirms parsed data
  const handleImport = useCallback((parsed) => {
    if (parsed.readings?.length) {
      const merged = mergeReadings(parsed.readings);
      setReadings(merged);
    }
    if (parsed.meds?.length) {
      const merged = mergeMeds(parsed.meds);
      setMeds(merged);
    }
    if (parsed.labs?.length) mergeLabs(parsed.labs);
    if (parsed.alerts?.length) {
      const merged = [...parsed.alerts, ...getStore('alerts')];
      setStore('alerts', merged);
      setAlerts(merged);
    }
    if (parsed.upcoming?.length) {
      const merged = [...parsed.upcoming, ...getStore('upcoming')];
      setStore('upcoming', merged);
      setUpcoming(merged);
    }
    if (parsed.records?.length) {
      mergeRecords(parsed.records);
    }
    const ts = new Date().toISOString();
    addImportLog({ ts, source: parsed.source ?? "Import", records: parsed.totalRecords ?? 0 });
    setLastImport(ts);
  }, []);

  const handleQuickSave = () => {
    const today = new Date();
    const ts = today.toISOString().split('T')[0];
    const dateLabel = today.toLocaleDateString("en-US", { month:"short", day:"numeric" });
    // Carry forward the most recent non-null value for each field from any prior reading
    const priorBpS   = readings.find(r => r.bp_s   != null)?.bp_s;
    const priorBpD   = readings.find(r => r.bp_d   != null)?.bp_d;
    const priorWeight = readings.find(r => r.weight != null)?.weight;
    const bp_s   = quickReading.bp_s   ? parseInt(quickReading.bp_s)     : priorBpS;
    const bp_d   = quickReading.bp_d   ? parseInt(quickReading.bp_d)     : priorBpD;
    const weight = quickReading.weight ? parseFloat(quickReading.weight) : priorWeight;
    const reading = {
      date: quickReading.date || dateLabel,
      ts,
      bp_s,
      bp_d,
      weight,
      flag: bp_s >= 160,
    };
    const merged = mergeReadings([reading]);
    setReadings(merged);
    setShowQuickEntry(false);
    setQuickReading({ bp_s:"", bp_d:"", weight:"", date:"" });
  };

  const handleDismissAlert = useCallback((fp, source) => {
    if (source === "stored") {
      // Remove from mi_alerts by index encoded in fp ("stored:<idx>:<text>")
      const idx = parseInt((fp.split(":")[1]) || "-1");
      if (idx >= 0) {
        const stored = getStore('alerts');
        setStore('alerts', stored.filter((_, i) => i !== idx));
      }
    } else {
      // Auto alert — add fingerprint to dismissed list so it won't re-appear
      const dismissed = (() => { try { return JSON.parse(localStorage.getItem("mi_dismissed_alerts") || "[]"); } catch { return []; } })();
      if (!dismissed.includes(fp)) {
        dismissed.push(fp);
        localStorage.setItem("mi_dismissed_alerts", JSON.stringify(dismissed));
      }
    }
    setAlerts(prev => prev.filter(a => a.fp !== fp));
  }, []);

  const fmt     = (d) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const fmtDate = (d) => d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const isStandalone     = STANDALONE_TABS.has(activeNav);
  const ActiveTabComponent = TAB_COMPONENTS[activeNav] ?? null;

  return (
    <div style={{ display: "flex", height: "100vh", background: "#07090f", color: "#d4e2f0", fontFamily: "'Sora', sans-serif", overflow: "hidden", position: "relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #1a2840; border-radius: 4px; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }
        .nav-item { display:flex; align-items:center; gap:10px; padding:8px 16px; cursor:pointer; font-size:12.5px; color:#b0c4d8; border-left:2px solid transparent; transition:all .15s; user-select:none; }
        .nav-item:hover { color:#7eb8d8; background:rgba(79,142,247,.04); }
        .nav-item.active { color:#4f8ef7; background:rgba(79,142,247,.08); border-left-color:#4f8ef7; }
        .nav-icon { font-size:13px; width:16px; text-align:center; flex-shrink:0; }
        .stat-card { background:#0b1220; border:1px solid #111e30; border-radius:14px; padding:20px; position:relative; overflow:hidden; transition:border-color .2s; animation: fadeUp .4s ease both; }
        .stat-card:hover { border-color:#1a2f4a; }
        .stat-card::after { content:''; position:absolute; inset:0; background:linear-gradient(135deg, rgba(255,255,255,.015) 0%, transparent 60%); pointer-events:none; }
        .alert-row { display:flex; align-items:flex-start; gap:10px; padding:11px 14px; border-radius:10px; background:#0b1220; border:1px solid #111e30; margin-bottom:8px; animation:fadeUp .4s ease both; }
        .upcoming-row { display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:10px; background:#0b1220; border:1px solid #111e30; margin-bottom:8px; cursor:pointer; transition:border-color .15s; animation:fadeUp .4s ease both; }
        .upcoming-row:hover { border-color:#1a2f4a; }
        .vital-row { display:grid; grid-template-columns:80px 100px 50px 60px; gap:0; padding:10px 0; border-bottom:1px solid #0d1a28; align-items:center; font-size:12px; }
        .vital-row:last-child { border-bottom:none; }
        .section-label { font-size:10px; letter-spacing:1.5px; text-transform:uppercase; color:#a0b4c8; font-family:'DM Mono', monospace; margin-bottom:12px; }
        .badge-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; margin-top:5px; }
        .ai-btn { width:100%; padding:12px; background:linear-gradient(135deg, rgba(79,142,247,.15), rgba(167,139,250,.1)); border:1px solid rgba(79,142,247,.3); border-radius:10px; color:#7eb8d8; font-family:'Sora',sans-serif; font-size:12px; cursor:pointer; transition:all .2s; display:flex; align-items:center; justify-content:center; gap:8px; }
        .ai-btn:hover { background:linear-gradient(135deg, rgba(79,142,247,.25), rgba(167,139,250,.18)); border-color:rgba(79,142,247,.5); color:#b8d4f0; }
        .live-dot { width:6px; height:6px; border-radius:50%; background:#10b981; box-shadow:0 0 8px #10b981; animation:pulse 2s infinite; flex-shrink:0; }
      `}</style>

      {/* Record Integrity Engine — floating Review Queue, present on every tab */}
      <RIEWidget onNavChange={setActiveNav} />

      {/* ── Group A: standalone apps (medications, labs, vitals, symptoms) ── */}
      {/* These components have their own sidebar + topbar + height:100vh.     */}
      {/* We hand full-page control to them and pass navigation callback.       */}
      {isStandalone && <ActiveTabComponent onNavChange={setActiveNav} />}

      {/* ── Sidebar (all non-standalone tabs) — always visible ── */}
      {!isStandalone && (
        <AppSidebar
          activeNav={activeNav}
          setActiveNav={setActiveNav}
        />
      )}

      {/* ── All other tabs: full-width main area ── */}
      {!isStandalone && (
        <>

          {/* AI Analysis: has own topbar + height:100vh — give it the full remaining area */}
          {activeNav === "ai" && (
            <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
              <ActiveTabComponent onNavChange={setActiveNav} />
            </div>
          )}

          {/* Dashboard + Group B (profile, records, careplan, documents, notes, import, backup) */}
          {activeNav !== "ai" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

              {/* Topbar */}
              <div style={{ height: 54, background: "#080c14", borderBottom: "1px solid #0d1a28", display: "flex", alignItems: "center", padding: "0 16px", gap: 12, flexShrink: 0 }}>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                  {activeNav !== "dashboard" && (
                    <button
                      onClick={() => setActiveNav("dashboard")}
                      title="Back to Dashboard"
                      style={{ display:"flex", alignItems:"center", gap:4, background:"none", border:"none", cursor:"pointer", color:"#4a5c6a", fontSize:11, fontFamily:"'DM Mono',monospace", padding:"4px 6px", borderRadius:6, marginRight:2 }}
                      onMouseEnter={e => { e.currentTarget.style.color = "#7eb8d8"; e.currentTarget.style.background = "rgba(255,255,255,.04)"; }}
                      onMouseLeave={e => { e.currentTarget.style.color = "#4a5c6a"; e.currentTarget.style.background = "none"; }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                      Dashboard
                    </button>
                  )}
                  <div className="live-dot" />
                  <span style={{ fontSize: 11, color: "#98afc4", fontFamily: "'DM Mono',monospace" }}>{fmtDate(time)} · {fmt(time)}</span>
                  <button
                    onClick={() => setShowSearch(true)}
                    title="Search health data"
                    style={{ display:"flex", alignItems:"center", justifyContent:"center", background:"none", border:"none", cursor:"pointer", padding:"4px 6px", borderRadius:6, color:"#4a5c6a", marginLeft:4 }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,.05)"; e.currentTarget.style.color = "#7eb8d8"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#4a5c6a"; }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                  </button>
                </div>
                {/* ── Google Drive sync ── */}
                {googleUser ? (
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontSize:9, fontFamily:"'DM Mono',monospace", color: syncStatus==="syncing"?"#f59e0b" : syncStatus==="error"?"#ef4444" : lastSyncTs?"#10b981":"#4a5c6a" }}>
                      {syncStatus==="syncing" ? "Syncing…" : syncStatus==="error" ? "Sync error" : lastSyncTs ? `↑ ${new Date(lastSyncTs).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}` : ""}
                    </span>
                    <button onClick={signIn} title="Sync with Google Drive" style={{ padding:"3px 8px", background:"rgba(16,185,129,.08)", border:"1px solid rgba(16,185,129,.2)", borderRadius:6, color:"#10b981", fontSize:9, fontFamily:"'DM Mono',monospace", cursor:"pointer" }}>↑↓</button>
                    {googleUser.picture
                      ? <img src={googleUser.picture} alt="" title={`${googleUser.name}\n${googleUser.email}\n\nClick to disconnect`} style={{ width:28, height:28, borderRadius:"50%", border:"1px solid #1a2f4a", cursor:"pointer" }} onClick={signOut} />
                      : <div style={{ width:28, height:28, borderRadius:"50%", background:"linear-gradient(135deg,#4f8ef7,#a78bfa)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, cursor:"pointer" }} onClick={signOut}>{(googleUser.name||"G")[0].toUpperCase()}</div>
                    }
                  </div>
                ) : (
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <button onClick={signIn} style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px", background:"rgba(255,255,255,.04)", border:"1px solid #1a2f4a", borderRadius:20, color:"#98afc4", fontSize:10, fontFamily:"'DM Mono',monospace", cursor:"pointer" }}>
                      <svg width="11" height="11" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                      Backup
                    </button>
                    <div style={{ width:28, height:28, background:"linear-gradient(135deg,#4f8ef7,#a78bfa)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700 }}>
                      {(() => { try { const p = JSON.parse(localStorage.getItem("mi_profile_personal") || "{}"); return (p.name || "?")[0].toUpperCase(); } catch { return "?"; } })()}
                    </div>
                  </div>
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, overflowY: "auto", padding: activeNav === "dashboard" ? "28px" : "0" }}>

                {/* Non-dashboard Group B tabs */}
                {ActiveTabComponent && activeNav === "import"
                  ? <ActiveTabComponent onImport={handleImport} onNavChange={setActiveNav} />
                  : ActiveTabComponent && activeNav === "backup"
                  ? <ActiveTabComponent onNavChange={setActiveNav} googleUser={googleUser} syncStatus={syncStatus} lastSyncTs={lastSyncTs} onSync={signIn} onSignOut={signOut} />
                  : ActiveTabComponent && <ActiveTabComponent onNavChange={setActiveNav} />
                }

                {/* Dashboard home */}
                {!ActiveTabComponent && (
                  <>
                    {/* Weekly backup reminder — shown only when Drive not connected and backup is overdue */}
                    {showBackupBanner && (
                      <div style={{ display:"flex", alignItems:"center", gap:12, background:"rgba(79,142,247,.07)", border:"1px solid rgba(79,142,247,.22)", borderRadius:12, padding:"11px 16px", marginBottom:18, flexWrap:"wrap" }}>
                        <span style={{ fontSize:16 }}>💾</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:600, color:"#dde8f5" }}>Weekly backup overdue</div>
                          <div style={{ fontSize:11, color:"#98afc4", fontFamily:"'DM Mono',monospace", marginTop:2 }}>
                            {lastWeeklyBackup
                              ? `Last backed up ${Math.floor((Date.now() - new Date(lastWeeklyBackup).getTime()) / 86400000)} days ago.`
                              : "Your data has never been backed up."}
                            {" "}Connect Google Drive in Settings for automatic weekly backups.
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const data = collectLocalData();
                            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                            const a = document.createElement("a");
                            a.href = URL.createObjectURL(blob);
                            a.download = `insina-health-weekly-${new Date().toISOString().split("T")[0]}.json`;
                            document.body.appendChild(a); a.click(); document.body.removeChild(a);
                            const ts = new Date().toISOString();
                            localStorage.setItem("mi_last_weekly_backup", ts);
                            setLastWeeklyBackup(ts);
                            setShowBackupBanner(false);
                          }}
                          style={{ padding:"7px 14px", background:"rgba(79,142,247,.15)", border:"1px solid rgba(79,142,247,.35)", borderRadius:8, color:"#7eb8d8", fontSize:11, fontFamily:"'DM Mono',monospace", cursor:"pointer", fontWeight:600, whiteSpace:"nowrap" }}
                        >
                          Download backup
                        </button>
                        <button
                          onClick={() => setShowBackupBanner(false)}
                          style={{ background:"transparent", border:"none", color:"#4a5c6a", fontSize:18, cursor:"pointer", padding:"0 4px", lineHeight:1 }}
                          title="Dismiss"
                        >×</button>
                      </div>
                    )}

                    <div style={{ marginBottom: 26 }}>
                      <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, color: "#dde8f5", fontWeight: 400, letterSpacing: "-0.5px" }}>
                        {(time.getHours() < 12 ? "Good morning" : time.getHours() < 17 ? "Good afternoon" : "Good evening")}
                        {(() => { try { const p = JSON.parse(localStorage.getItem("mi_profile_personal") || "{}"); const first = (p.name || "").split(" ")[0]; return first ? `, ${first}.` : "."; } catch { return "."; } })()}
                      </h1>
                      <p style={{ fontSize: 12, color: "#98afc4", marginTop: 5, fontFamily: "'DM Mono',monospace" }}>{upcoming.length} upcoming event{upcoming.length !== 1 ? "s" : ""} · {alerts.length} alert{alerts.length !== 1 ? "s" : ""} need{alerts.length === 1 ? "s" : ""} attention</p>
                    </div>

                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                      <div /> {/* spacer */}
                      <button onClick={() => setShowQuickEntry(o => !o)} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", background:"rgba(79,142,247,.1)", border:"1px solid rgba(79,142,247,.25)", borderRadius:8, color:"#7eb8d8", fontSize:11, fontFamily:"'DM Mono',monospace", cursor:"pointer" }}>
                        + Log Vitals
                      </button>
                    </div>

                    {showQuickEntry && (
                      <div style={{ marginBottom:16, padding:"16px", background:"#0b1220", border:"1px solid #1a2f4a", borderRadius:12, display:"grid", gridTemplateColumns:"repeat(4,1fr) auto auto", gap:10, alignItems:"flex-end" }}>
                        {[
                          { label:"DATE", key:"date", placeholder:"Mar 21" },
                          { label:"BP SYSTOLIC", key:"bp_s", placeholder:"131" },
                          { label:"BP DIASTOLIC", key:"bp_d", placeholder:"71" },
                          { label:"WEIGHT (lbs)", key:"weight", placeholder:"184.2" },
                        ].map(f => (
                          <div key={f.key}>
                            <label style={{ fontSize:9, color:"#a0b4c8", fontFamily:"'DM Mono',monospace", display:"block", marginBottom:4 }}>{f.label}</label>
                            <input
                              style={{ background:"#080c14", border:"1px solid #1a2f4a", borderRadius:6, padding:"7px 10px", fontSize:12, color:"#c4d8ee", fontFamily:"'Sora',sans-serif", width:"100%", outline:"none" }}
                              placeholder={f.placeholder}
                              value={quickReading[f.key]}
                              onChange={e => setQuickReading(prev => ({ ...prev, [f.key]: e.target.value }))}
                            />
                          </div>
                        ))}
                        <button onClick={handleQuickSave} style={{ padding:"7px 14px", background:"rgba(79,142,247,.15)", border:"1px solid rgba(79,142,247,.4)", borderRadius:8, color:"#7eb8d8", fontSize:12, cursor:"pointer", whiteSpace:"nowrap" }}>Save</button>
                        <button onClick={() => setShowQuickEntry(false)} style={{ padding:"7px 10px", background:"transparent", border:"1px solid #111e30", borderRadius:8, color:"#b0c4d8", fontSize:12, cursor:"pointer" }}>✕</button>
                      </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
                      <DataFreshnessCard />
                      <RefillsCard meds={meds} />
                      <BPCard readings={readings} />
                      <WeightCard readings={readings} />
                      <BMICard readings={readings} />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 300px", gap: 14, marginBottom: 24 }}>
                      <div>
                        <div className="section-label">Upcoming Care</div>
                        {upcoming.map(({ label, date, urgency, doctor }, i) => (
                          <div className="upcoming-row" key={label} style={{ animationDelay: `${200 + i * 60}ms` }} onClick={() => setActiveNav("appointments")}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: urgency === "high" ? "#ef4444" : urgency === "med" ? "#f59e0b" : "#10b981", flexShrink: 0, boxShadow: `0 0 8px ${urgency === "high" ? "#ef4444" : urgency === "med" ? "#f59e0b" : "#10b981"}80` }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: "#c4d8ee", marginBottom: 2 }}>{label}</div>
                              <div style={{ fontSize: 10, color: "#98afc4", fontFamily: "'DM Mono',monospace" }}>{doctor}</div>
                            </div>
                            <div style={{ fontSize: 11, color: urgency === "high" ? "#ef4444" : "#7eb8d8", fontWeight: 600, fontFamily: "'DM Mono',monospace" }}>{date}</div>
                          </div>
                        ))}
                      </div>

                      <div>
                        <div className="section-label">Active Alerts</div>
                        {alerts.length === 0 && (
                          <div style={{ fontSize: 11, color: "#4a5c6a", fontFamily: "'DM Mono',monospace", padding: "10px 0" }}>No active alerts</div>
                        )}
                        {alerts.map(({ type, text, time: t, fp, source }, i) => (
                          <div className="alert-row" key={fp || i} style={{ animationDelay: `${260 + i * 60}ms`, borderLeft: `3px solid ${type === "warn" ? "#f59e0b" : type === "ok" ? "#10b981" : "#4f8ef7"}` }}>
                            <div className="badge-dot" style={{ background: type === "warn" ? "#f59e0b" : type === "ok" ? "#10b981" : "#4f8ef7", boxShadow: `0 0 6px ${type === "warn" ? "#f59e0b" : type === "ok" ? "#10b981" : "#4f8ef7"}60` }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, color: "#a8c4dc", lineHeight: 1.45 }}>{text}</div>
                            </div>
                            <div style={{ fontSize: 10, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>{t}</div>
                            {fp && (
                              <button
                                onClick={() => handleDismissAlert(fp, source)}
                                style={{ marginLeft: 8, background: "none", border: "none", color: "#6a8090", fontSize: 14, lineHeight: 1, padding: "0 4px", cursor: "pointer", flexShrink: 0, opacity: 0.75 }}
                                title="Dismiss alert"
                                onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                                onMouseLeave={e => e.currentTarget.style.opacity = "0.75"}
                              >✕</button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div>
                        <div className="section-label">AI Analysis</div>
                        <div style={{ background: "#0b1220", border: "1px solid #111e30", borderRadius: 14, padding: 16 }}>
                          <div style={{ fontSize: 11, color: "#98afc4", marginBottom: 12, lineHeight: 1.5, fontFamily: "'DM Mono',monospace" }}>Cross-references all your data automatically.</div>
                          {["Analyze my current health status", "Review my medications for interactions", "Prep for Hepatology appt"].map((q, i) => (
                            <button key={i} className="ai-btn" onClick={() => { localStorage.setItem("mi_ai_pending", q); setActiveNav("ai"); }} style={{ marginBottom: 8, animationDelay: `${320 + i * 50}ms`, justifyContent: "flex-start", textAlign: "left" }}>
                              <span style={{ color: "#4f8ef7", fontSize: 14 }}>✦</span>
                              <span>{q}</span>
                            </button>
                          ))}
                          <button className="ai-btn" onClick={() => setActiveNav("ai")} style={{ marginTop: 4, borderStyle: "dashed" }}>
                            <span>Custom query...</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* ── Care Team / Doctor Cards ── */}
                    {(() => {
                      let team = [];
                      let selectedNames = null;
                      try { const t = JSON.parse(localStorage.getItem("mi_care_team") || "[]"); if (Array.isArray(t)) team = t; } catch {}
                      try {
                        const raw = localStorage.getItem("mi_care_team_selected");
                        if (raw) selectedNames = new Set(JSON.parse(raw));
                      } catch {}
                      // Filter to selected doctors only; fall back to all if no selection saved
                      const visible = selectedNames
                        ? team.filter(d => selectedNames.has(d.name))
                        : team;
                      if (visible.length === 0) return null;
                      return (
                        <div style={{ background:"#0b1220", border:"1px solid #111e30", borderRadius:14, padding:"16px 20px", marginBottom:14 }}>
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                            <div className="section-label" style={{ marginBottom:0 }}>Care Team</div>
                            <div style={{ fontSize:10, color:"#4f8ef7", fontFamily:"'DM Mono',monospace", cursor:"pointer" }} onClick={() => setActiveNav("careplan")}>Manage →</div>
                          </div>
                          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:10 }}>
                            {visible.slice(0,10).map((d, i) => {
                              const initials = (d.name || "").split(" ").filter(w => /^[A-Z]/.test(w)).slice(0,2).map(w=>w[0]).join("") || "?";
                              const accentColor = d.color || "#4f8ef7";
                              return (
                                <div key={i} style={{ background:"#080c14", border:"1px solid #0d1a28", borderRadius:10, padding:"12px 14px", display:"flex", alignItems:"flex-start", gap:10 }}>
                                  {/* Avatar */}
                                  <div style={{ width:36, height:36, borderRadius:"50%", background: d.pcp ? "linear-gradient(135deg,rgba(79,142,247,.3),rgba(167,139,250,.2))" : `${accentColor}18`, border:`1px solid ${d.pcp ? "rgba(79,142,247,.4)" : accentColor + "28"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:600, color: accentColor, flexShrink:0 }}>
                                    {initials}
                                  </div>
                                  {/* Info */}
                                  <div style={{ flex:1, minWidth:0 }}>
                                    <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", marginBottom:2 }}>
                                      <span style={{ fontSize:13, fontWeight:600, color:"#c4d8ee" }}>{d.name || "—"}</span>
                                      {d.pcp && <span style={{ fontSize:9, background:"rgba(79,142,247,.12)", color:"#4f8ef7", border:"1px solid rgba(79,142,247,.25)", borderRadius:10, padding:"1px 7px", fontFamily:"'DM Mono',monospace" }}>PCP</span>}
                                    </div>
                                    {(d.role || d.specialty) && <div style={{ fontSize:10, color:"#7eb8d8", fontFamily:"'DM Mono',monospace", marginBottom:1 }}>{d.role}{d.specialty ? ` · ${d.specialty}` : ""}</div>}
                                    {d.facility && <div style={{ fontSize:10, color:"#98afc4", fontFamily:"'DM Mono',monospace", marginBottom:1 }}>{d.facility}</div>}
                                    {d.phone && <div style={{ fontSize:11, color:"#4f8ef7", fontFamily:"'DM Mono',monospace" }}>{d.phone}</div>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Active Conditions */}
                    {activeConditions.length > 0 && (
                      <div style={{ background:"#0b1220", border:"1px solid #111e30", borderRadius:14, padding:"16px 20px", marginBottom:14 }}>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                          <div className="section-label" style={{ marginBottom:0 }}>Active Conditions</div>
                          <div style={{ fontSize:10, color:"#4f8ef7", fontFamily:"'DM Mono',monospace", cursor:"pointer" }} onClick={() => setActiveNav("conditions")}>Manage →</div>
                        </div>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                          {activeConditions.map(c => (
                            <div key={c.id} style={{ background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.2)", borderRadius:20, padding:"4px 12px", fontSize:11, color:"#ef4444", fontFamily:"'DM Mono',monospace" }}>
                              {c.name}{c.icd10 ? ` · ${c.icd10}` : ""}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── Featured Lab Results ── */}
                    {(() => {
                      const featuredLabs = getFeaturedLabs();
                      const hasAny = featuredLabs.some(f => f.lab);
                      if (!hasAny) return null;
                      return (
                        <div style={{ background: "#0b1220", border: "1px solid #111e30", borderRadius: 14, padding: "18px 20px", marginBottom: 14 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                            <div className="section-label" style={{ marginBottom: 0 }}>Recent Lab Results</div>
                            <div style={{ fontSize: 10, color: "#4f8ef7", fontFamily: "'DM Mono',monospace", cursor: "pointer" }} onClick={() => setActiveNav("labs")}>View all →</div>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8 }}>
                            {featuredLabs.map(({ label, lab }) => {
                              if (!lab) return (
                                <div key={label} style={{ background: "#080c14", border: "1px solid #0d1a28", borderRadius: 8, padding: "10px 12px", opacity: 0.45 }}>
                                  <div style={{ fontSize: 9, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", marginBottom: 4 }}>{label}</div>
                                  <div style={{ fontSize: 13, color: "#6a8090" }}>—</div>
                                </div>
                              );
                              const val = parseFloat(lab.value);
                              const isFlag = lab.flag;
                              const color = isFlag ? "#f59e0b" : "#10b981";
                              return (
                                <div key={label} style={{ background: "#080c14", border: `1px solid ${isFlag ? "rgba(245,158,11,.25)" : "#0d1a28"}`, borderRadius: 8, padding: "10px 12px" }}>
                                  <div style={{ fontSize: 9, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", marginBottom: 4 }}>{label}</div>
                                  <div style={{ fontSize: 15, fontWeight: 700, color, lineHeight: 1 }}>{lab.value}</div>
                                  <div style={{ fontSize: 8, color: "#6a8090", fontFamily: "'DM Mono',monospace", marginTop: 2 }}>{lab.unit || ""}{lab.date ? ` · ${lab.date.slice(5).replace("-","/")}` : ""}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    <div style={{ background: "#0b1220", border: "1px solid #111e30", borderRadius: 14, padding: "18px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                        <div className="section-label" style={{ marginBottom: 0 }}>Recent Vitals</div>
                        <div style={{ fontSize: 10, color: "#4f8ef7", fontFamily: "'DM Mono',monospace", cursor: "pointer" }} onClick={() => setActiveNav("vitals")}>View all →</div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "80px 100px 50px 60px", gap: 0, padding: "0 0 8px", borderBottom: "1px solid #0d1a28", marginBottom: 4 }}>
                        {["DATE", "BP", "HR", "O2"].map(h => (
                          <div key={h} style={{ fontSize: 9, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", letterSpacing: "1px" }}>{h}</div>
                        ))}
                      </div>
                      {readings.slice(0, 4).map(r => ({ date:r.date, bp: (r.bp_s != null && r.bp_d != null) ? `${r.bp_s}/${r.bp_d}` : "--", hr:r.hr??"--", o2:r.o2??"--", flag:!!r.flag })).map(({ date, bp, hr, o2, flag }) => (
                        <div className="vital-row" key={date}>
                          <div style={{ color: "#98afc4", fontFamily: "'DM Mono',monospace" }}>{date}</div>
                          <div style={{ fontWeight: 600, color: flag ? "#ef4444" : "#c4d8ee", display: "flex", alignItems: "center", gap: 5 }}>
                            {bp} {flag && <span style={{ fontSize: 9, color: "#ef4444" }}>▲</span>}
                          </div>
                          <div style={{ color: "#7eb8d8" }}>{hr}</div>
                          <div style={{ color: "#10b981" }}>{o2}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Global Search Popup (fixed overlay — works over standalone tabs too) ── */}
      {showSearch && (
        <SearchPopup
          onClose={() => setShowSearch(false)}
          onNavChange={(nav) => { setActiveNav(nav); setShowSearch(false); }}
        />
      )}
    </div>
  );
}
