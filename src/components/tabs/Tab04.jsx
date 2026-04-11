import INTELLITRAX_LOGO from "../../assets/logo.png";
import { useState, useEffect } from "react";
import { getMedsFull, setMedsFull, getPendingMeds, setPendingMeds } from "../../store.js";

const NAV = [
  { id: "dashboard", icon: "⬡", label: "Dashboard" },
  { id: "profile", icon: "◯", label: "Profile" },
  { id: "records", icon: "▤", label: "Records" },
  { id: "medications", icon: "⬡", label: "Medications" },
  { id: "labs", icon: "◈", label: "Labs & Trends" },
  { id: "vitals", icon: "♡", label: "Vitals" },
  { id: "symptoms", icon: "◎", label: "Symptoms" },
  { id: "careplan", icon: "◷", label: "Care Plan" },
  { id: "documents", icon: "▣", label: "Documents" },
  { id: "notes", icon: "◻", label: "Notes" },
  { id: "ai", icon: "✦", label: "AI Analysis" },
  { id: "import", icon: "↓", label: "Import Records" },
  { id: "backup", icon: "◈", label: "Data & Backup" },
];

// ── Refill date helpers ───────────────────────────────────────────────────────
function calcDaysLeft(refillDate) {
  if (!refillDate) return 0;
  let d;
  if (/^\d{4}-\d{2}-\d{2}$/.test(refillDate)) {
    d = new Date(refillDate + "T12:00:00");
  } else {
    const yr = new Date().getFullYear();
    d = new Date(`${refillDate}, ${yr}`);
    if (isNaN(d.getTime()) || d < new Date(Date.now() - 180 * 86400000)) {
      d = new Date(`${refillDate}, ${yr + 1}`);
    }
  }
  const days = Math.ceil((d - Date.now()) / 86400000);
  return Math.max(0, isNaN(days) ? 0 : days);
}

function toIsoDate(str) {
  if (!str) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const yr = new Date().getFullYear();
  const d = new Date(`${str}, ${yr}`);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  return "";
}

function fmtRefillDate(str) {
  if (!str) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return new Date(str + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  return str;
}

const MEDS_SEED = [
  {
    id: 1,
    name: "Tacrolimus",
    brand: "Prograf",
    dose: "3 mg",
    frequency: "Twice daily",
    schedule: "8:00 AM · 8:00 PM",
    category: "Immunosuppressant",
    refillDate: "Mar 28",
    daysLeft: 16,
    lastTaken: "Today 8:14 AM",
    status: "ok",
    flag: true,
    flagNote: "Trough level borderline — recheck at next labs",
    prescriber: "Dr. Ari Cohen",
    pharmacy: "CVS #5777",
    color: "#a78bfa",
  },
  {
    id: 2,
    name: "Mycophenolate",
    brand: "CellCept",
    dose: "500 mg",
    frequency: "Twice daily",
    schedule: "8:00 AM · 8:00 PM",
    category: "Immunosuppressant",
    refillDate: "Apr 2",
    daysLeft: 21,
    lastTaken: "Today 8:14 AM",
    status: "ok",
    flag: false,
    prescriber: "Dr. Ari Cohen",
    pharmacy: "CVS #5777",
    color: "#a78bfa",
  },
  {
    id: 3,
    name: "Prednisone",
    brand: "Deltasone",
    dose: "5 mg",
    frequency: "Once daily",
    schedule: "8:00 AM",
    category: "Corticosteroid",
    refillDate: "Mar 16",
    daysLeft: 4,
    lastTaken: "Today 8:14 AM",
    status: "refill",
    flag: true,
    flagNote: "Refill due in 4 days — contact pharmacy",
    prescriber: "Dr. Ari Cohen",
    pharmacy: "CVS #5777",
    color: "#f59e0b",
  },
  {
    id: 4,
    name: "Amlodipine",
    brand: "Norvasc",
    dose: "10 mg",
    frequency: "Once daily",
    schedule: "8:00 AM",
    category: "Blood Pressure",
    refillDate: "Apr 10",
    daysLeft: 29,
    lastTaken: "Today 8:14 AM",
    status: "ok",
    flag: false,
    prescriber: "Dr. Jonathan Hand",
    pharmacy: "CVS #5777",
    color: "#4f8ef7",
  },
  {
    id: 5,
    name: "Metoprolol",
    brand: "Lopressor",
    dose: "25 mg",
    frequency: "Twice daily",
    schedule: "8:00 AM · 8:00 PM",
    category: "Blood Pressure",
    refillDate: "Apr 5",
    daysLeft: 24,
    lastTaken: "Today 8:14 AM",
    status: "ok",
    flag: false,
    prescriber: "Dr. Jonathan Hand",
    pharmacy: "CVS #5777",
    color: "#4f8ef7",
  },
  {
    id: 6,
    name: "Furosemide",
    brand: "Lasix",
    dose: "40 mg",
    frequency: "Once daily",
    schedule: "8:00 AM",
    category: "Diuretic",
    refillDate: "Mar 22",
    daysLeft: 10,
    lastTaken: "Today 8:14 AM",
    status: "ok",
    flag: false,
    prescriber: "Dr. Ari Cohen",
    pharmacy: "CVS #5777",
    color: "#10b981",
  },
  {
    id: 7,
    name: "Pantoprazole",
    brand: "Protonix",
    dose: "40 mg",
    frequency: "Once daily",
    schedule: "Before breakfast",
    category: "GI / Protective",
    refillDate: "Apr 12",
    daysLeft: 31,
    lastTaken: "Today 7:52 AM",
    status: "ok",
    flag: false,
    prescriber: "Dr. Jonathan Hand",
    pharmacy: "CVS #5777",
    color: "#10b981",
  },
  {
    id: 8,
    name: "Trimethoprim-SMX",
    brand: "Bactrim DS",
    dose: "800/160 mg",
    frequency: "3x weekly",
    schedule: "Mon · Wed · Fri",
    category: "Antibiotic / Prophylaxis",
    refillDate: "May 1",
    daysLeft: 50,
    lastTaken: "Mar 10",
    status: "ok",
    flag: false,
    prescriber: "Dr. Ari Cohen",
    pharmacy: "CVS #5777",
    color: "#10b981",
  },
  {
    id: 9,
    name: "Valganciclovir",
    brand: "Valcyte",
    dose: "450 mg",
    frequency: "Once daily",
    schedule: "8:00 AM",
    category: "Antiviral / Prophylaxis",
    refillDate: "Apr 8",
    daysLeft: 27,
    lastTaken: "Today 8:14 AM",
    status: "ok",
    flag: true,
    flagNote: "Interaction risk with mycophenolate — monitor CBC",
    prescriber: "Dr. Ari Cohen",
    pharmacy: "CVS #5777",
    color: "#ef4444",
  },
  {
    id: 10,
    name: "Atorvastatin",
    brand: "Lipitor",
    dose: "40 mg",
    frequency: "Once daily",
    schedule: "8:00 PM",
    category: "Cholesterol",
    refillDate: "Apr 15",
    daysLeft: 34,
    lastTaken: "Yesterday 8:02 PM",
    status: "ok",
    flag: false,
    prescriber: "Dr. Jonathan Hand",
    pharmacy: "CVS #5777",
    color: "#4f8ef7",
  },
  {
    id: 11,
    name: "Calcium Carbonate",
    brand: "Tums / OTC",
    dose: "500 mg",
    frequency: "Twice daily",
    schedule: "With meals",
    category: "Supplement",
    refillDate: "May 20",
    daysLeft: 69,
    lastTaken: "Today 8:14 AM",
    status: "ok",
    flag: false,
    prescriber: "Dr. Ari Cohen",
    pharmacy: "OTC",
    color: "#7eb8d8",
  },
  {
    id: 12,
    name: "Vitamin D3",
    brand: "OTC",
    dose: "2000 IU",
    frequency: "Once daily",
    schedule: "8:00 AM",
    category: "Supplement",
    refillDate: "May 20",
    daysLeft: 69,
    lastTaken: "Today 8:14 AM",
    status: "ok",
    flag: false,
    prescriber: "Dr. Ari Cohen",
    pharmacy: "OTC",
    color: "#7eb8d8",
  },
  {
    id: 13,
    name: "Magnesium Oxide",
    brand: "Mag-Ox",
    dose: "400 mg",
    frequency: "Once daily",
    schedule: "8:00 PM",
    category: "Supplement",
    refillDate: "Apr 20",
    daysLeft: 39,
    lastTaken: "Yesterday 8:02 PM",
    status: "ok",
    flag: false,
    prescriber: "Dr. Ari Cohen",
    pharmacy: "CVS #5777",
    color: "#7eb8d8",
  },
  {
    id: 14,
    name: "Aspirin",
    brand: "Bayer / OTC",
    dose: "81 mg",
    frequency: "Once daily",
    schedule: "8:00 AM",
    category: "Antiplatelet",
    refillDate: "Jun 1",
    daysLeft: 81,
    lastTaken: "Today 8:14 AM",
    status: "ok",
    flag: false,
    prescriber: "Dr. Jonathan Hand",
    pharmacy: "OTC",
    color: "#ef4444",
  },
];

const INTERACTIONS = [
  {
    sev: "warn",
    drugs: ["Tacrolimus", "Valganciclovir"],
    note: "Both are nephrotoxic — monitor creatinine closely",
  },
  {
    sev: "warn",
    drugs: ["Valganciclovir", "Mycophenolate"],
    note: "Additive bone marrow suppression — monitor CBC",
  },
  {
    sev: "info",
    drugs: ["Furosemide", "Magnesium Oxide"],
    note: "Furosemide may increase Mg loss — supplementing appropriately",
  },
];

const CATEGORIES = ["All", "Immunosuppressant", "Blood Pressure", "Corticosteroid", "GI / Protective", "Antibiotic / Prophylaxis", "Antiviral / Prophylaxis", "Diuretic", "Cholesterol", "Supplement", "Antiplatelet", "Pain", "Mental Health", "Diabetes", "Other"];

export default function App({ onNavChange }) {
  const [activeNav, setActiveNav] = useState("medications");
  const handleNav = (id) => { if (id !== "medications") { onNavChange?.(id); } else { setActiveNav(id); } };
  const [meds, setMeds] = useState(() => getMedsFull());
  const [selectedMed, setSelectedMed] = useState(() => getMedsFull()[0]);
  const [editingMed, setEditingMed] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [filterCat, setFilterCat] = useState("All");
  const [search, setSearch] = useState("");
  const [showFlagged, setShowFlagged] = useState(false);
  const [time, setTime] = useState(new Date());
  const [pendingMeds, setPendingMedsState] = useState(() => getPendingMeds());
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const fmt = (d) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const fmtDate = (d) => d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const filtered = meds.filter((m) => {
    const catOk = filterCat === "All" || m.category === filterCat;
    const searchOk = m.name.toLowerCase().includes(search.toLowerCase()) || (m.brand || "").toLowerCase().includes(search.toLowerCase());
    const flagOk = !showFlagged || m.flag;
    return catOk && searchOk && flagOk;
  });

  const flaggedCount = meds.filter((m) => m.flag).length;
  const refillSoon = meds.filter((m) => calcDaysLeft(m.refillDate) <= 10).length;
  const nextRefill = meds.length > 0 ? meds.reduce((min, m) => (calcDaysLeft(m.refillDate) < calcDaysLeft(min.refillDate) ? m : min), meds[0]) : null;

  const statusColor = (s) => ({ ok: "#10b981", refill: "#f59e0b", warn: "#ef4444" }[s] || "#4f8ef7");

  const handleSaveMed = (updated) => {
    const newMeds = updated.id
      ? meds.map(m => m.id === updated.id ? updated : m)
      : [...meds, { ...updated, id: Date.now() }];
    setMeds(newMeds);
    setMedsFull(newMeds);
    setSelectedMed(updated.id ? updated : newMeds[newMeds.length - 1]);
    setEditingMed(null);
    setShowAddForm(false);
  };

  const handleDeleteMed = (id) => {
    const newMeds = meds.filter(m => m.id !== id);
    setMeds(newMeds);
    setMedsFull(newMeds);
    setSelectedMed(null);
    setEditingMed(null);
    setDeleteConfirm(false);
  };

  const handleApprovePending = (med) => {
    const newMed = { ...med, id: Date.now(), status: "ok", flag: false };
    const newMeds = [...meds, newMed];
    setMeds(newMeds);
    setMedsFull(newMeds);
    const remaining = pendingMeds.filter(m => m._pendingId !== med._pendingId);
    setPendingMedsState(remaining);
    setPendingMeds(remaining);
  };

  const handleRejectPending = (med) => {
    const remaining = pendingMeds.filter(m => m._pendingId !== med._pendingId);
    setPendingMedsState(remaining);
    setPendingMeds(remaining);
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#07090f", color: "#d4e2f0", fontFamily: "'Sora', sans-serif", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #1a2840; border-radius: 4px; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }
        .nav-item { display:flex; align-items:center; gap:10px; padding:8px 16px; cursor:pointer; font-size:12.5px; color:#b0c4d8; border-left:2px solid transparent; transition:all .15s; user-select:none; }
        .nav-item:hover { color:#7eb8d8; background:rgba(79,142,247,.04); }
        .nav-item.active { color:#4f8ef7; background:rgba(79,142,247,.08); border-left-color:#4f8ef7; }
        .nav-icon { font-size:13px; width:16px; text-align:center; flex-shrink:0; }
        .live-dot { width:6px; height:6px; border-radius:50%; background:#10b981; box-shadow:0 0 8px #10b981; animation:pulse 2s infinite; flex-shrink:0; }
        .section-label { font-size:10px; letter-spacing:1.5px; text-transform:uppercase; color:#a0b4c8; font-family:'DM Mono', monospace; margin-bottom:12px; }
        .stat-card { background:#0b1220; border:1px solid #111e30; border-radius:14px; padding:18px 20px; animation:fadeUp .35s ease both; transition:border-color .2s; }
        .stat-card:hover { border-color:#1a2f4a; }
        .med-row { display:flex; align-items:center; gap:12px; padding:11px 14px; border-radius:10px; background:#0b1220; border:1px solid #111e30; margin-bottom:6px; cursor:pointer; transition:all .15s; animation:fadeUp .35s ease both; }
        .med-row:hover { border-color:#1a2f4a; }
        .med-row.selected { border-color:#4f8ef7; background:rgba(79,142,247,.06); }
        .filter-pill { padding:5px 12px; border-radius:20px; border:1px solid #111e30; font-size:11px; font-family:'DM Mono',monospace; cursor:pointer; background:#0b1220; color:#b0c4d8; transition:all .15s; white-space:nowrap; }
        .filter-pill:hover { color:#7eb8d8; border-color:#1a2f4a; }
        .filter-pill.active { background:rgba(79,142,247,.1); border-color:#4f8ef7; color:#4f8ef7; }
        .search-input { background:#0b1220; border:1px solid #111e30; border-radius:8px; padding:8px 12px; font-size:12px; font-family:'Sora',sans-serif; color:#c4d8ee; outline:none; width:100%; transition:border-color .15s; }
        .search-input:focus { border-color:#4f8ef7; }
        .search-input::placeholder { color:#98afc4; }
        .toggle-btn { padding:5px 12px; border-radius:20px; border:1px solid #111e30; font-size:11px; font-family:'DM Mono',monospace; cursor:pointer; background:#0b1220; color:#b0c4d8; transition:all .15s; }
        .toggle-btn.on { background:rgba(239,68,68,.1); border-color:#ef4444; color:#ef4444; }
        .detail-row { display:flex; justify-content:space-between; align-items:flex-start; padding:10px 0; border-bottom:1px solid #0d1a28; }
        .detail-row:last-child { border-bottom:none; }
        .interaction-row { padding:10px 14px; border-radius:8px; background:#0b1220; border:1px solid #111e30; margin-bottom:6px; animation:fadeUp .35s ease both; }
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .med-row { border: 1px solid #ccc !important; color: black !important; }
        }
      `}</style>

      {/* Sidebar */}
      <aside style={{ width: 210, minWidth: 210, background: "#080c14", borderRight: "1px solid #0d1a28", display: "flex", flexDirection: "column", height: "100vh" }}>
        <div style={{ padding: "20px 14px", borderBottom: "1px solid #0d1a28", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src={INTELLITRAX_LOGO} alt="IntelliTrax" style={{ width: 185, height: 65, objectFit: "contain" }} />
        </div>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #0d1a28" }}>
          <div style={{ fontSize: 10, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", marginBottom: 4 }}>PATIENT</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#c4d8ee" }}>Greg Butler</div>
          <div style={{ fontSize: 11, color: "#98afc4", marginTop: 2 }}>Transplant · Immunosuppressed</div>
        </div>
        <nav style={{ flex: 1, overflowY: "auto", padding: "10px 0" }}>
          <div style={{ padding: "8px 16px 4px", fontSize: 9, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", letterSpacing: "1.5px", textTransform: "uppercase" }}>CORE</div>
          {NAV.slice(0, 8).map(({ id, icon, label }) => (
            <div key={id} className={`nav-item ${activeNav === id ? "active" : ""}`} onClick={() => handleNav(id)}>
              <span className="nav-icon">{icon}</span>
              <span>{label}</span>
            </div>
          ))}
          <div style={{ padding: "12px 16px 4px", fontSize: 9, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", letterSpacing: "1.5px", textTransform: "uppercase" }}>SYSTEM</div>
          {NAV.slice(8).map(({ id, icon, label }) => (
            <div key={id} className={`nav-item ${activeNav === id ? "active" : ""}`} onClick={() => handleNav(id)}>
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

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Topbar */}
        <div style={{ height: 54, background: "#080c14", borderBottom: "1px solid #0d1a28", display: "flex", alignItems: "center", padding: "0 28px", gap: 16, flexShrink: 0 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
            <div className="live-dot" />
            <span style={{ fontSize: 11, color: "#98afc4", fontFamily: "'DM Mono',monospace" }}>{fmtDate(time)} · {fmt(time)}</span>
          </div>
          <div style={{ fontSize: 11, color: "#98afc4", fontFamily: "'DM Mono',monospace", background: "#0b1220", border: "1px solid #111e30", padding: "5px 12px", borderRadius: 6 }}>
            Last import: Mar 12, 2026
          </div>
          <button onClick={() => window.print()} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", background:"rgba(79,142,247,.1)", border:"1px solid rgba(79,142,247,.3)", borderRadius:8, color:"#7eb8d8", fontSize:11, fontFamily:"'DM Mono',monospace", cursor:"pointer" }}>
            ⎙ Print
          </button>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#4f8ef7,#a78bfa)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>G</div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 28px 28px" }}>

          {/* Header */}
          <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div>
              <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, color: "#dde8f5", fontWeight: 400, letterSpacing: "-0.5px" }}>Medications</h1>
              <p style={{ fontSize: 12, color: "#98afc4", marginTop: 5, fontFamily: "'DM Mono',monospace" }}>14 active · {flaggedCount} flagged · {refillSoon} refill{refillSoon !== 1 ? "s" : ""} due soon</p>
            </div>
            <button style={{ padding: "8px 16px", background: "rgba(79,142,247,.1)", border: "1px solid rgba(79,142,247,.3)", borderRadius: 8, color: "#7eb8d8", fontSize: 12, fontFamily: "'Sora',sans-serif", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "#4f8ef7" }}>✦</span> AI Interaction Check
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 22 }}>
            {[
              { label: "Active Medications", value: String(meds.length), sub: "across categories", color: "#4f8ef7" },
              { label: "Flagged for Review", value: String(flaggedCount), sub: "requires attention", color: "#ef4444" },
              { label: "Refills Due Soon", value: String(refillSoon), sub: "within 10 days", color: "#f59e0b" },
              { label: "Next Refill", value: nextRefill ? nextRefill.name.split(" ")[0] : "—", sub: nextRefill ? `Due ${fmtRefillDate(nextRefill.refillDate)} · ${calcDaysLeft(nextRefill.refillDate)}d` : "No meds added yet", color: "#f59e0b" },
            ].map(({ label, value, sub, color }, i) => (
              <div className="stat-card" key={label} style={{ animationDelay: `${i * 55}ms` }}>
                <div style={{ width: 28, height: 3, background: color, borderRadius: 2, marginBottom: 14, boxShadow: `0 0 10px ${color}60` }} />
                <div style={{ fontSize: 24, fontWeight: 700, color: "#dde8f5", letterSpacing: "-0.5px", lineHeight: 1, marginBottom: 5 }}>{value}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#7eb8d8", marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 10, color: "#98afc4", fontFamily: "'DM Mono',monospace" }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Main layout */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>

            {/* Left — list */}
            <div>
              {/* Controls */}
              <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  className="search-input"
                  placeholder="Search medications..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: 200 }}
                />
                <button className={`toggle-btn ${showFlagged ? "on" : ""}`} onClick={() => setShowFlagged(!showFlagged)}>
                  {showFlagged ? "▲ Flagged only" : "▲ Show flagged"}
                </button>
                <button onClick={() => { setShowAddForm(true); setEditingMed({ id:null, name:"", brand:"", dose:"", frequency:"Once daily", schedule:"", category:"Immunosuppressant", refillDate:"", renewalDate:"", prescriber:"", pharmacy:"", status:"ok", flag:false, color:"#4f8ef7" }); }} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", background:"rgba(16,185,129,.1)", border:"1px solid rgba(16,185,129,.3)", borderRadius:8, color:"#10b981", fontSize:11, fontFamily:"'DM Mono',monospace", cursor:"pointer", whiteSpace:"nowrap" }}>
                  + Add Med
                </button>
              </div>

              {/* Category filters */}
              <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
                {["All", "Immunosuppressant", "Blood Pressure", "GI / Protective", "Supplement", "Prophylaxis"].map((cat) => {
                  const match = cat === "Prophylaxis"
                    ? filterCat.includes("Prophylaxis")
                    : filterCat === cat;
                  return (
                    <button
                      key={cat}
                      className={`filter-pill ${match ? "active" : ""}`}
                      onClick={() => setFilterCat(cat === "Prophylaxis" ? "Antibiotic / Prophylaxis" : cat)}
                    >{cat}</button>
                  );
                })}
              </div>

              {/* Pending meds section */}
              {pendingMeds.length > 0 && (
                <div style={{ marginBottom:16, padding:"14px", background:"rgba(245,158,11,.05)", border:"1px solid rgba(245,158,11,.2)", borderRadius:10 }}>
                  <div style={{ fontSize:10, color:"#f59e0b", fontFamily:"'DM Mono',monospace", letterSpacing:"1.5px", marginBottom:10 }}>IMPORTED — PENDING APPROVAL ({pendingMeds.length})</div>
                  {pendingMeds.map((m, i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"9px 12px", background:"#080c14", borderRadius:8, border:"1px solid #1a2f4a", marginBottom:6 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:"#c4d8ee" }}>{m.name} {m.dose}</div>
                        <div style={{ fontSize:10, color:"#98afc4", fontFamily:"'DM Mono',monospace" }}>{m.frequency} · {m.prescriber}</div>
                      </div>
                      <button onClick={() => handleApprovePending(m)} style={{ padding:"5px 12px", background:"rgba(16,185,129,.12)", border:"1px solid rgba(16,185,129,.3)", borderRadius:6, color:"#10b981", fontSize:11, fontFamily:"'DM Mono',monospace", cursor:"pointer" }}>✓ Add</button>
                      <button onClick={() => handleRejectPending(m)} style={{ padding:"5px 12px", background:"transparent", border:"1px solid #1a2f4a", borderRadius:6, color:"#b0c4d8", fontSize:11, fontFamily:"'DM Mono',monospace", cursor:"pointer" }}>✗ Skip</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Medication rows */}
              <div>
                {filtered.length === 0 && (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "#98afc4", fontSize: 12, fontFamily: "'DM Mono',monospace" }}>No medications match filters</div>
                )}
                {filtered.map((med, i) => (
                  <div
                    key={med.id}
                    className={`med-row ${selectedMed?.id === med.id ? "selected" : ""}`}
                    style={{ animationDelay: `${i * 40}ms` }}
                    onClick={() => setSelectedMed(med)}
                  >
                    {/* Category dot */}
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: med.color, flexShrink: 0, boxShadow: `0 0 8px ${med.color}80` }} />

                    {/* Name + meta */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#c4d8ee" }}>{med.name}</span>
                        <span style={{ fontSize: 10, color: "#98afc4", fontFamily: "'DM Mono',monospace" }}>{med.brand}</span>
                        {med.flag && (
                          <span style={{ fontSize: 9, background: "rgba(239,68,68,.15)", color: "#ef4444", padding: "1px 6px", borderRadius: 8, fontFamily: "'DM Mono',monospace", marginLeft: 2 }}>REVIEW</span>
                        )}
                        {calcDaysLeft(med.refillDate) <= 7 && (
                          <span style={{ fontSize: 9, background: "rgba(245,158,11,.15)", color: "#f59e0b", padding: "1px 6px", borderRadius: 8, fontFamily: "'DM Mono',monospace" }}>REFILL THIS WEEK</span>
                        )}
                        {med.renewalDate && calcDaysLeft(med.renewalDate) <= 30 && (
                          <span style={{ fontSize: 9, background: "rgba(239,68,68,.12)", color: "#f87171", padding: "1px 6px", borderRadius: 8, fontFamily: "'DM Mono',monospace" }}>RENEWAL DUE</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "#98afc4", fontFamily: "'DM Mono',monospace" }}>{med.dose} · {med.frequency} · {med.schedule}</div>
                    </div>

                    {/* Refill badge */}
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      {(() => { const dl = calcDaysLeft(med.refillDate); return (
                        <div style={{ fontSize: 11, color: dl <= 10 ? "#f59e0b" : "#98afc4", fontFamily: "'DM Mono',monospace", fontWeight: dl <= 10 ? 600 : 400 }}>
                          {dl <= 10 ? `⚠ ${dl}d` : `${dl}d`}
                        </div>
                      ); })()}
                      <div style={{ fontSize: 10, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", marginTop: 2 }}>{fmtRefillDate(med.refillDate)}</div>
                    </div>

                    {/* Status dot */}
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor(med.status), boxShadow: `0 0 6px ${statusColor(med.status)}80`, flexShrink: 0 }} />
                  </div>
                ))}
              </div>

              {/* Interactions panel */}
              <div style={{ marginTop: 24 }}>
                <div className="section-label">Known Interactions</div>
                {INTERACTIONS.map((ix, i) => (
                  <div className="interaction-row" key={i} style={{ borderLeft: `3px solid ${ix.sev === "warn" ? "#f59e0b" : "#4f8ef7"}`, animationDelay: `${i * 50}ms` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      {ix.drugs.map((d, j) => (
                        <span key={d}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "#a8c4dc" }}>{d}</span>
                          {j < ix.drugs.length - 1 && <span style={{ fontSize: 10, color: "#a0b4c8", margin: "0 4px" }}>+</span>}
                        </span>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: "#98afc4", fontFamily: "'DM Mono',monospace" }}>{ix.note}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — detail panel */}
            {(selectedMed || editingMed) && (
              <div style={{ animation: "fadeUp .3s ease both" }}>

                {/* ── EDIT MODE ── */}
                {editingMed ? (
                  <div style={{ background: "#0b1220", border: "1px solid #4f8ef7", borderRadius: 14, padding: "20px", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid #0d1a28" }}>
                      <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 18, color: "#dde8f5" }}>Edit — {editingMed.name}</div>
                      <button onClick={() => { setEditingMed(null); setDeleteConfirm(false); }}
                        style={{ background: "#0b1220", border: "1px solid #111e30", borderRadius: 6, color: "#b0c4d8", fontSize: 13, cursor: "pointer", padding: "4px 8px" }}>✕</button>
                    </div>

                    {[
                      { label: "Medication Name", key: "name" },
                      { label: "Brand Name", key: "brand" },
                      { label: "Dose", key: "dose" },
                      { label: "Frequency", key: "frequency" },
                      { label: "Schedule", key: "schedule" },
                      { label: "Prescriber", key: "prescriber" },
                      { label: "Pharmacy", key: "pharmacy" },
                    ].map(({ label, key }) => (
                      <div key={key} style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 9, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 5 }}>{label}</div>
                        <input
                          type="text"
                          value={editingMed[key] ?? ""}
                          onChange={e => setEditingMed(prev => ({ ...prev, [key]: e.target.value }))}
                          style={{ width: "100%", padding: "8px 11px", background: "#080c14", border: "1px solid #1a2f4a", borderRadius: 7, color: "#c4d8ee", fontSize: 12, fontFamily: "'DM Mono',monospace", outline: "none" }}
                        />
                      </div>
                    ))}

                    {/* Refill Date — date picker, days calculated automatically */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 9, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 5 }}>Refill Date</div>
                      <input
                        type="date"
                        value={editingMed.refillDate ?? ""}
                        onChange={e => setEditingMed(prev => ({ ...prev, refillDate: e.target.value }))}
                        style={{ width: "100%", padding: "8px 11px", background: "#080c14", border: "1px solid #1a2f4a", borderRadius: 7, color: "#c4d8ee", fontSize: 12, fontFamily: "'DM Mono',monospace", outline: "none" }}
                      />
                      {editingMed.refillDate && (
                        <div style={{ fontSize: 10, color: "#98afc4", fontFamily: "'DM Mono',monospace", marginTop: 4 }}>
                          {calcDaysLeft(editingMed.refillDate)} days from today
                        </div>
                      )}
                    </div>

                    {/* Category */}
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ fontSize: 9, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 5 }}>Category</div>
                      <select value={editingMed.category}
                        onChange={e => setEditingMed(prev => ({ ...prev, category: e.target.value }))}
                        style={{ width: "100%", padding: "8px 11px", background: "#080c14", border: "1px solid #1a2f4a", borderRadius: 7, color: "#c4d8ee", fontSize: 12, fontFamily: "'DM Mono',monospace", outline: "none" }}>
                        {CATEGORIES.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    {/* Renewal Date */}
                    <div style={{ marginBottom: 18 }}>
                      <label style={{ fontSize:10, color:"#b0c4d8", fontFamily:"'DM Mono',monospace", display:"block", marginBottom:4 }}>RENEWAL DATE (manual)</label>
                      <input className="search-input" value={editingMed?.renewalDate ?? ""} onChange={e => setEditingMed(prev => ({ ...prev, renewalDate: e.target.value }))} placeholder="e.g. Jun 15" />
                    </div>

                    {/* Save / Cancel */}
                    <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                      <button onClick={() => handleSaveMed(editingMed)}
                        style={{ flex: 1, padding: "10px", background: "#10b981", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontFamily: "'Sora',sans-serif", fontWeight: 600, cursor: "pointer" }}>
                        Save Changes
                      </button>
                      <button onClick={() => { setEditingMed(null); setDeleteConfirm(false); }}
                        style={{ padding: "10px 14px", background: "#0b1220", border: "1px solid #111e30", borderRadius: 8, color: "#b0c4d8", fontSize: 12, fontFamily: "'Sora',sans-serif", cursor: "pointer" }}>
                        Cancel
                      </button>
                    </div>

                    {/* Delete */}
                    {!deleteConfirm ? (
                      <button onClick={() => setDeleteConfirm(true)}
                        style={{ width: "100%", padding: "9px", background: "transparent", border: "1px solid rgba(239,68,68,.3)", borderRadius: 8, color: "#ef4444", fontSize: 12, fontFamily: "'Sora',sans-serif", cursor: "pointer", opacity: 0.7 }}>
                        Delete Medication
                      </button>
                    ) : (
                      <div style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.3)", borderRadius: 10, padding: "14px" }}>
                        <div style={{ fontSize: 12, color: "#c4d8ee", marginBottom: 12, lineHeight: 1.5 }}>
                          Remove <strong>{editingMed.name}</strong> from your medication list? This cannot be undone.
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => handleDeleteMed(editingMed.id)}
                            style={{ flex: 1, padding: "9px", background: "#ef4444", border: "none", borderRadius: 7, color: "#fff", fontSize: 12, fontFamily: "'Sora',sans-serif", fontWeight: 600, cursor: "pointer" }}>
                            Yes, Delete
                          </button>
                          <button onClick={() => setDeleteConfirm(false)}
                            style={{ flex: 1, padding: "9px", background: "#0b1220", border: "1px solid #111e30", borderRadius: 7, color: "#7eb8d8", fontSize: 12, fontFamily: "'Sora',sans-serif", cursor: "pointer" }}>
                            Keep It
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                ) : (
                  /* ── VIEW MODE ── */
                  <>
                <div style={{ background: "#0b1220", border: "1px solid #111e30", borderRadius: 14, padding: "20px", marginBottom: 12 }}>

                  {/* Drug header */}
                  <div style={{ marginBottom: 18, paddingBottom: 16, borderBottom: "1px solid #0d1a28" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
                      <div>
                        <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, color: "#dde8f5", letterSpacing: "-0.3px" }}>{selectedMed.name}</div>
                        <div style={{ fontSize: 11, color: "#98afc4", fontFamily: "'DM Mono',monospace", marginTop: 3 }}>{selectedMed.brand} · {selectedMed.category}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button onClick={() => { setEditingMed({ ...selectedMed, refillDate: toIsoDate(selectedMed.refillDate) || selectedMed.refillDate }); setDeleteConfirm(false); }}
                          style={{ padding: "5px 12px", background: "#0f1e30", border: "1px solid #1a3050", borderRadius: 6, color: "#7eb8d8", fontSize: 11, fontFamily: "'Sora',sans-serif", cursor: "pointer", fontWeight: 600 }}>
                          Edit
                        </button>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: selectedMed.color, boxShadow: `0 0 10px ${selectedMed.color}80` }} />
                      </div>
                    </div>

                    {selectedMed.flag && (
                      <div style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 8, padding: "9px 12px", marginTop: 10 }}>
                        <div style={{ fontSize: 9, color: "#ef4444", fontFamily: "'DM Mono',monospace", letterSpacing: "1px", marginBottom: 4 }}>FLAGGED FOR REVIEW</div>
                        <div style={{ fontSize: 11, color: "#c4d8ee", lineHeight: 1.5 }}>{selectedMed.flagNote}</div>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="section-label">Dosage Details</div>
                  {[
                    ["Dose", selectedMed.dose],
                    ["Frequency", selectedMed.frequency],
                    ["Schedule", selectedMed.schedule],
                    ["Last Taken", selectedMed.lastTaken],
                  ].map(([k, v]) => (
                    <div className="detail-row" key={k}>
                      <span style={{ fontSize: 11, color: "#98afc4", fontFamily: "'DM Mono',monospace" }}>{k}</span>
                      <span style={{ fontSize: 12, color: "#a8c4dc", fontWeight: 500, textAlign: "right", maxWidth: "60%" }}>{v}</span>
                    </div>
                  ))}

                  <div className="section-label" style={{ marginTop: 18 }}>Refill & Pharmacy</div>
                  {[
                    ["Pharmacy", selectedMed.pharmacy],
                    ["Prescriber", selectedMed.prescriber],
                    ["Refill Date", fmtRefillDate(selectedMed.refillDate)],
                    ["Days Remaining", `${calcDaysLeft(selectedMed.refillDate)} days`],
                  ].map(([k, v]) => {
                    const dl = calcDaysLeft(selectedMed.refillDate);
                    return (
                    <div className="detail-row" key={k}>
                      <span style={{ fontSize: 11, color: "#98afc4", fontFamily: "'DM Mono',monospace" }}>{k}</span>
                      <span style={{ fontSize: 12, color: dl <= 10 && k === "Days Remaining" ? "#f59e0b" : "#a8c4dc", fontWeight: dl <= 10 && k === "Days Remaining" ? 600 : 500, textAlign: "right" }}>{v}</span>
                    </div>
                    );
                  })}
                  {selectedMed.renewalDate && (() => {
                    const rd = calcDaysLeft(selectedMed.renewalDate);
                    return (
                      <div className="detail-row">
                        <span style={{ fontSize: 11, color: "#98afc4", fontFamily: "'DM Mono',monospace" }}>Renewal Date</span>
                        <span style={{ fontSize: 12, color: rd <= 30 ? "#f87171" : "#a8c4dc", fontWeight: rd <= 30 ? 600 : 500, textAlign: "right" }}>
                          {selectedMed.renewalDate}
                          {rd <= 30 && <span style={{ fontSize: 9, background: "rgba(239,68,68,.15)", color: "#f87171", padding: "1px 6px", borderRadius: 8, marginLeft: 6 }}>DUE IN {rd}d</span>}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Refill progress */}
                  <div style={{ marginTop: 16 }}>
                    {(() => { const dl = calcDaysLeft(selectedMed.refillDate); const pct = Math.min(100, Math.round(dl / 90 * 100)); return (<>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 10, color: "#a0b4c8", fontFamily: "'DM Mono',monospace" }}>SUPPLY REMAINING</span>
                      <span style={{ fontSize: 10, color: dl <= 10 ? "#f59e0b" : "#98afc4", fontFamily: "'DM Mono',monospace" }}>{pct}%</span>
                    </div>
                    <div style={{ height: 4, background: "#0d1a28", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: dl <= 10 ? "#f59e0b" : selectedMed.color,
                        borderRadius: 4,
                        boxShadow: `0 0 8px ${dl <= 10 ? "#f59e0b" : selectedMed.color}60`,
                        transition: "width .4s ease"
                      }} />
                    </div>
                    </>); })()}
                  </div>
                </div>

                {/* AI quick actions */}
                <div style={{ background: "#0b1220", border: "1px solid #111e30", borderRadius: 14, padding: "16px 18px" }}>
                  <div className="section-label">AI Quick Actions</div>
                  {[
                    `Explain ${selectedMed.name} and its purpose`,
                    `Check interactions with my other meds`,
                    `What should I monitor on ${selectedMed.name}?`,
                  ].map((q, i) => (
                    <button key={i} style={{
                      width: "100%", marginBottom: 7, padding: "10px 12px", background: "linear-gradient(135deg, rgba(79,142,247,.1), rgba(167,139,250,.07))",
                      border: "1px solid rgba(79,142,247,.25)", borderRadius: 9, color: "#7eb8d8", fontFamily: "'Sora',sans-serif",
                      fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, textAlign: "left"
                    }}>
                      <span style={{ color: "#4f8ef7", fontSize: 13, flexShrink: 0 }}>✦</span>
                      <span>{q}</span>
                    </button>
                  ))}
                </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
