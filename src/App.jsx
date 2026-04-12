import { useState, useEffect, useCallback } from "react";
import INTELLITRAX_LOGO from './assets/logo.png';
import { getStore, setStore, mergeReadings, mergeMeds, mergeLabs, mergeRecords, addImportLog } from './store.js';
import LockScreen from './components/LockScreen.jsx';

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
  { id: "dashboard",   icon: "⬡", label: "Dashboard" },
  { id: "profile",     icon: "◯", label: "Profile" },
  { id: "records",     icon: "▤", label: "Records" },
  { id: "conditions",  icon: "◎", label: "Conditions" },
  { id: "surgeries",   icon: "✦", label: "Surgeries" },
  { id: "medications", icon: "⬡", label: "Medications" },
  { id: "labs",        icon: "◈", label: "Labs & Trends" },
  { id: "vitals",      icon: "♡", label: "Vitals" },
  { id: "symptoms",    icon: "◎", label: "Symptoms" },
  { id: "careplan",      icon: "◷", label: "Care Plan" },
  { id: "appointments", icon: "◻", label: "Appointments" },
  { id: "documents",    icon: "▣", label: "Documents" },
  { id: "notes",       icon: "◻", label: "Notes" },
  { id: "ai",          icon: "✦", label: "AI Analysis" },
  { id: "import",      icon: "↓", label: "Import Records" },
  { id: "backup",      icon: "◈", label: "Data & Backup" },
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
function computeStatus(meds, readings) {
  if (meds.some(m => m.status === "warn")) return "attention";
  const cutoff = new Date(Date.now() - 14 * 86400000);
  const recentFlags = readings.filter(r => r.flag && new Date(r.ts) >= cutoff).length;
  if (recentFlags >= 2) return "attention";
  if (recentFlags === 1 || meds.some(m => m.status === "refill")) return "watch";
  return "stable";
}
function getWeekRefills(meds) {
  const now = new Date();
  const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7)); mon.setHours(0,0,0,0);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23,59,59,999);
  return meds.filter(m => { const d = parseRefillDate(m.refillDate); return d >= mon && d <= sun; });
}

// ── Dashboard stat cards (receive live data as props) ─────────────────────────
function StatusCard({ meds, readings }) {
  const statusKey = computeStatus(meds, readings);
  const cfg = {
    stable:    { color:"#10b981", bg:"rgba(16,185,129,.10)", border:"rgba(16,185,129,.25)", label:"Stable" },
    watch:     { color:"#f59e0b", bg:"rgba(245,158,11,.10)", border:"rgba(245,158,11,.25)", label:"Watch" },
    attention: { color:"#ef4444", bg:"rgba(239,68,68,.10)",  border:"rgba(239,68,68,.25)",  label:"Needs Attention" },
  }[statusKey];
  const updated = new Date().toLocaleDateString("en-US", { month:"short", day:"numeric" });
  return (
    <div className="stat-card">
      <div style={{ width:28, height:3, background:cfg.color, borderRadius:2, marginBottom:14, boxShadow:`0 0 10px ${cfg.color}60` }} />
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
        <div style={{ fontSize:24, fontWeight:700, color:cfg.color, letterSpacing:"-0.5px", lineHeight:1 }}>{cfg.label}</div>
        <div style={{ background:cfg.bg, border:`1px solid ${cfg.border}`, borderRadius:20, padding:"2px 8px", fontSize:9, color:cfg.color, fontFamily:"'DM Mono',monospace" }}>AI</div>
      </div>
      <div style={{ fontSize:11, fontWeight:600, color:"#7eb8d8", marginBottom:3 }}>Status</div>
      <div style={{ fontSize:10, color:"#98afc4", fontFamily:"'DM Mono',monospace" }}>Updated {updated}</div>
    </div>
  );
}
function RefillsCard({ meds }) {
  const [open, setOpen] = useState(false);
  const refills = getWeekRefills(meds);
  const now = new Date();
  const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  const fmt = d => d.toLocaleDateString("en-US", { month:"short", day:"numeric" });
  return (
    <div className="stat-card" style={{ cursor:"pointer" }} onClick={() => setOpen(o => !o)}>
      <div style={{ width:28, height:3, background:"#f59e0b", borderRadius:2, marginBottom:14, boxShadow:"0 0 10px #f59e0b60" }} />
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:26, fontWeight:700, color:"#dde8f5", letterSpacing:"-1px", lineHeight:1, marginBottom:5 }}>{refills.length}</div>
          <div style={{ fontSize:11, fontWeight:600, color:"#7eb8d8", marginBottom:3 }}>Refills This Week</div>
          <div style={{ fontSize:10, color:"#98afc4", fontFamily:"'DM Mono',monospace" }}>{fmt(mon)} – {fmt(sun)}</div>
        </div>
        <div style={{ fontSize:14, color:"#f59e0b", marginTop:2, transition:"transform .2s", transform:open?"rotate(180deg)":"rotate(0deg)" }}>▾</div>
      </div>
      {open && (
        <div style={{ marginTop:12, paddingTop:10, borderTop:"1px solid #0d1a28" }}>
          {refills.length === 0
            ? <div style={{ fontSize:11, color:"#98afc4", fontFamily:"'DM Mono',monospace" }}>No refills due this week</div>
            : refills.map((r, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", borderBottom:i<refills.length-1?"1px solid #0d1a28":"none" }}>
                <div style={{ width:5, height:5, borderRadius:"50%", background:"#f59e0b", flexShrink:0 }} />
                <div style={{ flex:1, fontSize:11, color:"#c4d8ee" }}>{r.name}</div>
                <div style={{ fontSize:10, color:"#98afc4", fontFamily:"'DM Mono',monospace" }}>{r.refillDate}</div>
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
      <div style={{ fontSize:26, fontWeight:700, color:"#dde8f5", letterSpacing:"-1px", lineHeight:1, marginBottom:5 }}>{r.bp_s ?? "--"}/{r.bp_d ?? "--"}</div>
      <div style={{ fontSize:11, fontWeight:600, color:"#7eb8d8", marginBottom:3 }}>Blood Pressure</div>
      <div style={{ fontSize:10, color:"#98afc4", fontFamily:"'DM Mono',monospace" }}>Recorded {r.date ?? "--"}</div>
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
      <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:5 }}>
        <div style={{ fontSize:26, fontWeight:700, color:"#dde8f5", letterSpacing:"-1px", lineHeight:1 }}>{cur != null ? `${cur} lbs` : "--"}</div>
        {diff != null && <div style={{ fontSize:16, color:tcolor, fontWeight:700 }}>{arrow}</div>}
      </div>
      <div style={{ fontSize:11, fontWeight:600, color:"#7eb8d8", marginBottom:3 }}>Weight</div>
      <div style={{ fontSize:10, color:"#98afc4", fontFamily:"'DM Mono',monospace" }}>
        Recorded {readings[0]?.date ?? "--"}{tlabel ? <> · <span style={{ color:tcolor }}>{tlabel}</span></> : null}
      </div>
    </div>
  );
}

// ── Shared sidebar component (used for non-standalone tabs) ───────────────────
function AppSidebar({ activeNav, setActiveNav, open, onClose }) {
  return (
    <>
      {/* Backdrop — closes sidebar when tapped outside */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: "fixed", inset: 0, zIndex: 40,
            background: "rgba(0,0,0,.55)",
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
          }}
        />
      )}

      {/* Drawer */}
      <aside style={{
        position: "fixed", top: 0, left: 0, zIndex: 50,
        width: 220, height: "100vh",
        background: "#080c14",
        borderRight: "1px solid #0d1a28",
        display: "flex", flexDirection: "column",
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition: "transform .25s cubic-bezier(.4,0,.2,1)",
        willChange: "transform",
      }}>
        {/* Logo + close button */}
        <div style={{ padding: "16px 14px", borderBottom: "1px solid #0d1a28", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <img src={INTELLITRAX_LOGO} alt="IntelliTrax" style={{ width: 150, height: 52, objectFit: "contain" }} />
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "1px solid #1a2f4a", borderRadius: 7, color: "#6a8090", fontSize: 16, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
          >
            ✕
          </button>
        </div>

        {/* Patient info */}
        <div style={{ padding: "12px 18px", borderBottom: "1px solid #0d1a28" }}>
          <div style={{ fontSize: 10, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", marginBottom: 4 }}>PATIENT</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#c4d8ee" }}>
            {(() => { try { const p = JSON.parse(localStorage.getItem("mi_profile_personal") || "{}"); return p.name || "Greg Butler"; } catch { return "Greg Butler"; } })()}
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "10px 0" }}>
          <div style={{ padding: "8px 16px 4px", fontSize: 9, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", letterSpacing: "1.5px", textTransform: "uppercase" }}>CORE</div>
          {NAV.slice(0, 8).map(({ id, icon, label }) => (
            <div key={id} className={`nav-item ${activeNav === id ? "active" : ""}`} onClick={() => { setActiveNav(id); onClose(); }}>
              <span className="nav-icon">{icon}</span>
              <span>{label}</span>
            </div>
          ))}
          <div style={{ padding: "12px 16px 4px", fontSize: 9, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", letterSpacing: "1.5px", textTransform: "uppercase" }}>SYSTEM</div>
          {NAV.slice(8).map(({ id, icon, label }) => (
            <div key={id} className={`nav-item ${activeNav === id ? "active" : ""}`} onClick={() => { setActiveNav(id); onClose(); }}>
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
    </>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem("mi_unlocked") === "1"
  );

  if (!unlocked) {
    return <LockScreen onUnlock={() => setUnlocked(true)} />;
  }

  return <AppShell />;
}

function AppShell() {
  const [activeNav, setActiveNav]     = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [time, setTime]           = useState(new Date());
  const [readings, setReadings]   = useState(() => {
    const stored = getStore('readings');
    if (stored.length > 0) return stored;
    // Seed initial readings so dashboard shows data on first load
    const SEED = [
      { date:"Mar 10", ts:"2026-03-10", bp_s:131, bp_d:71, hr:64, weight:184.2, flag:false },
      { date:"Mar 7",  ts:"2026-03-07", bp_s:138, bp_d:74, hr:67, weight:184.8, flag:false },
      { date:"Mar 5",  ts:"2026-03-05", bp_s:143, bp_d:79, hr:71, weight:185.1, flag:false },
    ];
    setStore('readings', SEED);
    return SEED;
  });
  const [meds, setMeds]           = useState(() => {
    const stored = getStore('meds_full');
    if (stored.length > 0) return stored;
    // Seed default meds so Refills card shows data on first load
    const SEED = [
      { id:1, name:"Tacrolimus",     brand:"Prograf",   dose:"3 mg",   frequency:"Twice daily", category:"Immunosuppressant", refillDate:"Apr 28", status:"ok",  color:"#a78bfa" },
      { id:2, name:"Mycophenolate",  brand:"CellCept",  dose:"500 mg", frequency:"Twice daily", category:"Immunosuppressant", refillDate:"May 2",  status:"ok",  color:"#a78bfa" },
      { id:3, name:"Prednisone",     brand:"Deltasone", dose:"5 mg",   frequency:"Once daily",  category:"Corticosteroid",    refillDate:"Apr 16", status:"warn",color:"#f59e0b" },
      { id:4, name:"Amlodipine",     brand:"Norvasc",   dose:"10 mg",  frequency:"Once daily",  category:"Blood Pressure",    refillDate:"May 10", status:"ok",  color:"#4f8ef7" },
      { id:5, name:"Atorvastatin",   brand:"Lipitor",   dose:"20 mg",  frequency:"Once daily",  category:"Cholesterol",       refillDate:"May 20", status:"ok",  color:"#10b981" },
    ];
    setStore('meds_full', SEED);
    return SEED;
  });
  const [alerts, setAlerts]       = useState(() => getStore('alerts'));
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

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // Refresh dashboard data from localStorage each time the user navigates to the dashboard
  useEffect(() => {
    if (activeNav !== "dashboard") return;
    setReadings(getStore('readings'));
    setMeds(getStore('meds_full'));
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

      {/* ── Group A: standalone apps (medications, labs, vitals, symptoms) ── */}
      {/* These components have their own sidebar + topbar + height:100vh.     */}
      {/* We hand full-page control to them and pass navigation callback.       */}
      {isStandalone && <ActiveTabComponent onNavChange={setActiveNav} />}

      {/* ── Sidebar drawer (all non-standalone tabs) ── */}
      {!isStandalone && (
        <AppSidebar
          activeNav={activeNav}
          setActiveNav={setActiveNav}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      {/* ── All other tabs: full-width main area ── */}
      {!isStandalone && (
        <>

          {/* AI Analysis: has own topbar + height:100vh — give it the full remaining area */}
          {activeNav === "ai" && (
            <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
              {/* Hamburger overlay for AI tab */}
              <button
                onClick={() => setSidebarOpen(true)}
                style={{ position:"absolute", top:10, left:12, zIndex:10, background:"rgba(8,12,20,.85)", border:"1px solid #1a2f4a", borderRadius:8, color:"#b0c4d8", width:36, height:36, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4, cursor:"pointer", padding:0 }}
                aria-label="Open menu"
              >
                <span style={{ width:16, height:2, background:"#b0c4d8", borderRadius:1, display:"block" }} />
                <span style={{ width:16, height:2, background:"#b0c4d8", borderRadius:1, display:"block" }} />
                <span style={{ width:16, height:2, background:"#b0c4d8", borderRadius:1, display:"block" }} />
              </button>
              <ActiveTabComponent />
            </div>
          )}

          {/* Dashboard + Group B (profile, records, careplan, documents, notes, import, backup) */}
          {activeNav !== "ai" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

              {/* Topbar */}
              <div style={{ height: 54, background: "#080c14", borderBottom: "1px solid #0d1a28", display: "flex", alignItems: "center", padding: "0 16px", gap: 12, flexShrink: 0 }}>
                {/* Hamburger */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  style={{ background: "transparent", border: "1px solid #1a2f4a", borderRadius: 8, color: "#b0c4d8", width: 36, height: 36, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, cursor: "pointer", flexShrink: 0, padding: 0 }}
                  aria-label="Open menu"
                >
                  <span style={{ width: 16, height: 2, background: "#b0c4d8", borderRadius: 1, display: "block" }} />
                  <span style={{ width: 16, height: 2, background: "#b0c4d8", borderRadius: 1, display: "block" }} />
                  <span style={{ width: 16, height: 2, background: "#b0c4d8", borderRadius: 1, display: "block" }} />
                </button>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                  <div className="live-dot" />
                  <span style={{ fontSize: 11, color: "#98afc4", fontFamily: "'DM Mono',monospace" }}>{fmtDate(time)} · {fmt(time)}</span>
                </div>
                <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#4f8ef7,#a78bfa)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>G</div>
              </div>

              {/* Content */}
              <div style={{ flex: 1, overflowY: "auto", padding: activeNav === "dashboard" ? "28px" : "0" }}>

                {/* Non-dashboard Group B tabs */}
                {ActiveTabComponent && activeNav === "import"
                  ? <ActiveTabComponent onImport={handleImport} />
                  : ActiveTabComponent && <ActiveTabComponent />
                }

                {/* Dashboard home */}
                {!ActiveTabComponent && (
                  <>
                    <div style={{ marginBottom: 26 }}>
                      <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, color: "#dde8f5", fontWeight: 400, letterSpacing: "-0.5px" }}>Good afternoon, Greg.</h1>
                      <p style={{ fontSize: 12, color: "#98afc4", marginTop: 5, fontFamily: "'DM Mono',monospace" }}>3 upcoming events · 2 alerts need attention</p>
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

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
                      <StatusCard meds={meds} readings={readings} />
                      <RefillsCard meds={meds} />
                      <BPCard readings={readings} />
                      <WeightCard readings={readings} />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 300px", gap: 14, marginBottom: 24 }}>
                      <div>
                        <div className="section-label">Upcoming Care</div>
                        {upcoming.map(({ label, date, urgency, doctor }, i) => (
                          <div className="upcoming-row" key={label} style={{ animationDelay: `${200 + i * 60}ms` }}>
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
                        {alerts.map(({ type, text, time: t }, i) => (
                          <div className="alert-row" key={i} style={{ animationDelay: `${260 + i * 60}ms`, borderLeft: `3px solid ${type === "warn" ? "#f59e0b" : type === "ok" ? "#10b981" : "#4f8ef7"}` }}>
                            <div className="badge-dot" style={{ background: type === "warn" ? "#f59e0b" : type === "ok" ? "#10b981" : "#4f8ef7", boxShadow: `0 0 6px ${type === "warn" ? "#f59e0b" : type === "ok" ? "#10b981" : "#4f8ef7"}60` }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, color: "#a8c4dc", lineHeight: 1.45 }}>{text}</div>
                            </div>
                            <div style={{ fontSize: 10, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>{t}</div>
                          </div>
                        ))}
                      </div>

                      <div>
                        <div className="section-label">AI Analysis</div>
                        <div style={{ background: "#0b1220", border: "1px solid #111e30", borderRadius: 14, padding: 16 }}>
                          <div style={{ fontSize: 11, color: "#98afc4", marginBottom: 12, lineHeight: 1.5, fontFamily: "'DM Mono',monospace" }}>Cross-references all your data automatically.</div>
                          {["Analyze my current health status", "Review my medications for interactions", "Prep for Hepatology appt"].map((q, i) => (
                            <button key={i} className="ai-btn" onClick={() => setActiveNav("ai")} style={{ marginBottom: 8, animationDelay: `${320 + i * 50}ms`, justifyContent: "flex-start", textAlign: "left" }}>
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
    </div>
  );
}
