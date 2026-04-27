import { useState, useEffect, useCallback } from "react";

const PROXY_URL = import.meta.env.VITE_PROXY_URL || "http://localhost:3001";
const PRINT_LOGO = import.meta.env.BASE_URL + "logo.png";

function printConsultationPrep(appt, analysis) {
  const date = new Date().toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" });
  const apptDate = appt.date ? new Date(appt.date + "T12:00:00").toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" }) : "—";
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  const esc = s => String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const bold = s => s.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  const renderText = rawText => {
    if (!rawText) return "";
    const text = rawText.replace(/[\u{1F300}-\u{1F9FF}]/gu,"").replace(/[\u{2600}-\u{27BF}]/gu,"").replace(/\u{FE0F}/gu,"").replace(/✦/g,"");
    return text.split("\n").map(line => {
      const t = line.trim();
      if (/^-{3,}$/.test(t)) return `<hr style="border:none;border-top:1px solid #ddd;margin:12px 0">`;
      if (t.startsWith("- ") || t.startsWith("• ")) return `<div style="display:flex;gap:8px;margin-bottom:5px;padding-left:8px"><span style="color:#2563eb;font-weight:700">&#9658;</span><span>${bold(t.replace(/^[-•]\s+/,""))}</span></div>`;
      const nm = t.match(/^(\d+)\.\s+(.+)/);
      if (nm) return `<div style="display:flex;gap:8px;margin-bottom:5px;padding-left:8px"><span style="font-weight:700;color:#2563eb;min-width:22px">${nm[1]}.</span><span>${bold(nm[2])}</span></div>`;
      const hm = t.match(/^\*\*([^*]+?)\*\*:?\s*$/);
      if (hm) return `<div style="font-weight:700;font-size:14px;margin-top:14px;margin-bottom:5px">${hm[1].replace(/:$/,"")}</div>`;
      if (t === "") return `<div style="height:7px"></div>`;
      return `<div style="margin-bottom:3px;line-height:1.7">${bold(esc(line))}</div>`;
    }).join("");
  };
  win.document.write(`<!DOCTYPE html><html><head>
    <title>Consultation Prep — Insina Health</title>
    <style>
      * { box-sizing:border-box; margin:0; padding:0; }
      body { font-family:Georgia,serif; max-width:760px; margin:48px auto; color:#1a1a1a; font-size:14px; line-height:1.65; padding:0 24px; }
      .logo { height:52px; margin-bottom:18px; }
      h1 { text-align:center; font-size:28px; font-weight:700; letter-spacing:-.5px; margin-bottom:8px; }
      .subtitle { text-align:center; font-size:13px; color:#555; margin-bottom:22px; }
      .rule { border:none; border-top:2px solid #2563eb; margin-bottom:24px; }
      .appt-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:22px; background:#f8f9fa; border:1px solid #ddd; border-radius:6px; padding:16px; }
      .appt-field label { font-size:10px; text-transform:uppercase; letter-spacing:.8px; color:#777; font-family:monospace; display:block; margin-bottom:3px; }
      .appt-field span { font-size:13px; color:#1a1a1a; font-weight:600; }
      .section-title { font-weight:700; font-size:16px; margin-bottom:12px; }
      .footer { margin-top:48px; border-top:1px solid #ddd; padding-top:12px; font-size:11px; color:#777; display:flex; justify-content:space-between; }
      @media print { body { margin:28px; } }
    </style>
  </head><body>
    <img src="${PRINT_LOGO}" class="logo" />
    <h1>Consultation Prep</h1>
    <div class="subtitle">Insina Health &mdash; AI Appointment Analysis</div>
    <hr class="rule" />
    <div class="appt-grid">
      <div class="appt-field"><label>Appointment</label><span>${esc(appt.title)}</span></div>
      <div class="appt-field"><label>Date</label><span>${apptDate}</span></div>
      <div class="appt-field"><label>Provider</label><span>${esc(appt.provider||"—")}</span></div>
      <div class="appt-field"><label>Specialty</label><span>${esc(appt.specialty||"—")}</span></div>
      ${appt.facility ? `<div class="appt-field" style="grid-column:1/-1"><label>Facility</label><span>${esc(appt.facility)}</span></div>` : ""}
      ${appt.prepInstructions ? `<div class="appt-field" style="grid-column:1/-1"><label>Prep Instructions</label><span>${esc(appt.prepInstructions)}</span></div>` : ""}
    </div>
    <div class="section-title">AI Preparation Analysis</div>
    ${renderText(analysis)}
    <div class="footer">
      <span>Insina Health &mdash; Personal Health Intelligence</span>
      <span>Generated ${date}</span>
    </div>
    <script>window.onload = function(){ window.print(); }<\/script>
  </body></html>`);
  win.document.close();
}

const URGENCY_CFG = {
  high: { color: "#ef4444", bg: "rgba(239,68,68,.10)", border: "rgba(239,68,68,.25)", label: "High" },
  med:  { color: "#f59e0b", bg: "rgba(245,158,11,.10)", border: "rgba(245,158,11,.25)", label: "Med"  },
  low:  { color: "#10b981", bg: "rgba(16,185,129,.10)", border: "rgba(16,185,129,.25)", label: "Low"  },
};

const STATUS_CFG = {
  upcoming:  { color: "#4f8ef7", label: "Upcoming"  },
  completed: { color: "#10b981", label: "Completed" },
  cancelled: { color: "#6b7a8d", label: "Cancelled" },
};

const SPECIALTIES = [
  "Cardiology", "Dentistry", "Dermatology", "Endocrinology", "Gastroenterology",
  "Hepatology / Liver Transplant", "Lab / Imaging", "Neurology",
  "Ophthalmology", "Orthopedics", "Physical Therapy", "Primary Care",
  "Pulmonology", "Rheumatology", "Urology", "Other",
];

const BLANK = {
  id: null, title: "", provider: "", specialty: "", facility: "",
  date: "", time: "", phone: "", address: "", notes: "",
  prepInstructions: "", status: "upcoming", urgency: "med", reminder: true,
};

function genId() { return Math.random().toString(36).slice(2); }

function loadAppts() {
  try {
    const raw = localStorage.getItem("mi_appointments");
    return raw ? JSON.parse(raw) : seedAppts();
  } catch { return seedAppts(); }
}

function seedAppts() {
  const appts = [];
  localStorage.setItem("mi_appointments", JSON.stringify(appts));
  return appts;
}

function saveAppts(appts) {
  localStorage.setItem("mi_appointments", JSON.stringify(appts));
  // Also sync to mi_upcoming for Dashboard
  const upcoming = appts
    .filter(a => a.status === "upcoming")
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5)
    .map(a => ({
      label:   a.title,
      date:    new Date(a.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      urgency: a.urgency,
      doctor:  a.provider,
      facility: a.facility,
    }));
  localStorage.setItem("mi_upcoming", JSON.stringify(upcoming));
}

function formatPhone(val) {
  const digits = (val || "").replace(/\D/g, "").slice(0, 10);
  if (!digits.length) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0,3)})-${digits.slice(3)}`;
  return `(${digits.slice(0,3)})-${digits.slice(3,6)}-${digits.slice(6)}`;
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" });
}
function daysUntil(iso) {
  if (!iso) return null;
  const diff = Math.ceil((new Date(iso + "T00:00:00") - new Date().setHours(0,0,0,0)) / 86400000);
  return diff;
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function ApptModal({ appt, onSave, onClose }) {
  const [form, setForm] = useState({ ...BLANK, ...appt });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const isNew = !form.id;

  // Load care team for auto-fill
  const careTeam = (() => {
    try { return JSON.parse(localStorage.getItem("mi_care_team") || "[]"); } catch { return []; }
  })();

  // When the provider field loses focus, try to auto-fill phone/address from care team
  const handleProviderBlur = () => {
    const query = form.provider.trim().toLowerCase();
    if (query.length < 3 || !careTeam.length) return;
    const match = careTeam.find(p => {
      const name = p.name.toLowerCase();
      return name.includes(query) || query.includes(name.replace(/^dr\.?\s*/i, "").trim().split(" ").slice(-1)[0]);
    });
    if (match) {
      setForm(f => ({
        ...f,
        phone:    f.phone    || formatPhone(match.phone    || ""),
        facility: f.facility || match.facility || "",
      }));
    }
  };

  const handleSave = () => {
    if (!form.title || !form.date) return;
    onSave({ ...form, id: form.id || genId() });
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"#0b1220", border:"1px solid #1a2f4a", borderRadius:16, width:"100%", maxWidth:620, maxHeight:"90vh", overflowY:"auto", padding:28 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:22 }}>
          <h2 style={{ fontFamily:"'DM Serif Display',serif", fontSize:22, color:"#dde8f5", fontWeight:400 }}>
            {isNew ? "New Appointment" : "Edit Appointment"}
          </h2>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#7eb8d8", fontSize:18, cursor:"pointer" }}>✕</button>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          {/* Title */}
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>Appointment Title *</label>
            <input style={inp} placeholder="e.g. Nephrology Follow-up" value={form.title} onChange={e=>set("title",e.target.value)} />
          </div>
          {/* Provider */}
          <div>
            <label style={lbl}>Provider / Doctor</label>
            <input style={inp} placeholder="e.g. Dr. Ari Cohen" value={form.provider} onChange={e=>set("provider",e.target.value)} onBlur={handleProviderBlur} />
          </div>
          {/* Specialty */}
          <div>
            <label style={lbl}>Specialty</label>
            <select style={inp} value={form.specialty} onChange={e=>set("specialty",e.target.value)}>
              <option value="">Select…</option>
              {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {/* Facility */}
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>Facility / Location</label>
            <input style={inp} placeholder="e.g. Ochsner Medical Center" value={form.facility} onChange={e=>set("facility",e.target.value)} />
          </div>
          {/* Address */}
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>Address</label>
            <input style={inp} placeholder="Street, City, State ZIP" value={form.address} onChange={e=>set("address",e.target.value)} />
          </div>
          {/* Date */}
          <div>
            <label style={lbl}>Date *</label>
            <input style={inp} type="date" value={form.date} onChange={e=>set("date",e.target.value)} />
          </div>
          {/* Time */}
          <div>
            <label style={lbl}>Time</label>
            <select style={inp} value={form.time} onChange={e=>set("time",e.target.value)}>
              <option value="">Select time…</option>
              {["7:00 AM","7:15 AM","7:30 AM","7:45 AM",
                "8:00 AM","8:15 AM","8:30 AM","8:45 AM",
                "9:00 AM","9:15 AM","9:30 AM","9:45 AM",
                "10:00 AM","10:15 AM","10:30 AM","10:45 AM",
                "11:00 AM","11:15 AM","11:30 AM","11:45 AM",
                "12:00 PM","12:15 PM","12:30 PM","12:45 PM",
                "1:00 PM","1:15 PM","1:30 PM","1:45 PM",
                "2:00 PM","2:15 PM","2:30 PM","2:45 PM",
                "3:00 PM","3:15 PM","3:30 PM","3:45 PM",
                "4:00 PM","4:15 PM","4:30 PM","4:45 PM",
                "5:00 PM","5:15 PM","5:30 PM","5:45 PM",
                "6:00 PM","6:15 PM","6:30 PM","6:45 PM",
                "7:00 PM","7:30 PM","8:00 PM",
              ].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {/* Phone */}
          <div>
            <label style={lbl}>Phone</label>
            <input style={inp} placeholder="(601) 555-0000" value={form.phone} onChange={e=>set("phone",formatPhone(e.target.value))} />
          </div>
          {/* Urgency */}
          <div>
            <label style={lbl}>Priority</label>
            <select style={inp} value={form.urgency} onChange={e=>set("urgency",e.target.value)}>
              <option value="high">High</option>
              <option value="med">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          {/* Status */}
          <div>
            <label style={lbl}>Status</label>
            <select style={inp} value={form.status} onChange={e=>set("status",e.target.value)}>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          {/* Prep */}
          <div>
            <label style={lbl}>Prep Instructions</label>
            <input style={inp} placeholder="e.g. Fast 8 hours" value={form.prepInstructions} onChange={e=>set("prepInstructions",e.target.value)} />
          </div>
          {/* Notes */}
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>Notes</label>
            <textarea style={{ ...inp, height:76, resize:"vertical" }} placeholder="Questions to ask, things to bring, etc." value={form.notes} onChange={e=>set("notes",e.target.value)} />
          </div>
        </div>

        <div style={{ display:"flex", gap:10, marginTop:20 }}>
          <button
            onClick={handleSave}
            disabled={!form.title || !form.date}
            style={{ flex:1, padding:"10px 0", background:"rgba(79,142,247,.18)", border:"1px solid rgba(79,142,247,.45)", borderRadius:9, color:"#7eb8d8", fontFamily:"'Sora',sans-serif", fontSize:13, fontWeight:600, cursor:"pointer" }}
          >
            {isNew ? "Add Appointment" : "Save Changes"}
          </button>
          <button onClick={onClose} style={{ padding:"10px 20px", background:"transparent", border:"1px solid #1a2f4a", borderRadius:9, color:"#b0c4d8", fontFamily:"'Sora',sans-serif", fontSize:13, cursor:"pointer" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

const lbl = { display:"block", fontSize:10, color:"#a0b4c8", fontFamily:"'DM Mono',monospace", letterSpacing:"0.8px", textTransform:"uppercase", marginBottom:5 };
const inp = { width:"100%", background:"#080c14", border:"1px solid #1a2f4a", borderRadius:8, padding:"9px 12px", color:"#c4d8ee", fontFamily:"'Sora',sans-serif", fontSize:12, outline:"none" };

// ── AI Analysis Panel for an Appointment ────────────────────────────────────
function ApptAIPanel({ appt }) {
  const [additionalQ, setAdditionalQ] = useState("");
  const [analysis, setAnalysis]       = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");

  const buildPrompt = useCallback(() => {
    let ctx = "";
    try {
      const conditions = JSON.parse(localStorage.getItem("mi_conditions") || "[]");
      const meds = JSON.parse(localStorage.getItem("mi_meds_full") || "[]");
      if (conditions.length) ctx += `\nActive Conditions: ${conditions.map(c=>c.name).join(", ")}`;
      if (meds.length) ctx += `\nCurrent Medications: ${meds.filter(m=>m.status!=="inactive").map(m=>`${m.name} ${m.dose||""}`).join(", ")}`;
    } catch {}
    const base = `Help me prepare for my upcoming ${appt.specialty || "medical"} appointment.
Appointment: ${appt.title}
Provider: ${appt.provider || "—"}${appt.specialty ? ` (${appt.specialty})` : ""}
Facility: ${appt.facility || "—"}
Date: ${fmtDate(appt.date)}${appt.prepInstructions ? `\nPrep Instructions: ${appt.prepInstructions}` : ""}${ctx}

Please provide:
1. What to discuss or ask during this appointment
2. What to bring or prepare
3. Any relevant concerns from my medical history to raise
4. Questions to ask about my current medications or conditions${additionalQ.trim() ? `\n\nAdditional questions: ${additionalQ}` : ""}`;
    return base;
  }, [appt, additionalQ]);

  const runAnalysis = async () => {
    setLoading(true); setError(""); setAnalysis("");
    try {
      const res = await fetch(`${PROXY_URL}/api/chat`, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({
          model:"claude-sonnet-4-6",
          max_tokens:1024,
          system:[{ type:"text", text:"You are a personal health assistant helping prepare a patient for a medical appointment. Be direct, specific, and clinically relevant. No emojis. Bold section headers on their own line. Use bullet points for lists. Use ----- as section dividers. Only ask a clarifying question if the answer genuinely cannot be given without it — this should be rare; provide the best guidance possible with available information.", cache_control:{ type:"ephemeral" } }],
          messages:[{ role:"user", content:buildPrompt() }],
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(()=>({}));
        const isServerSleep = res.status === 503 || String(e?.error||"").includes("503");
        throw new Error(isServerSleep ? "Server is waking up (takes ~30 sec) — wait and try again." : (e?.error || `Server error ${res.status}`));
      }
      const data = await res.json();
      setAnalysis(data.content?.[0]?.text || "No response");
    } catch(e) {
      const isNetworkErr = e.message?.includes("Failed to fetch") || e.message?.includes("503") || e.message?.includes("waking up");
      setError(isNetworkErr ? "Server is waking up (Render free tier). Wait ~30 seconds then try again." : e.message);
    }
    finally { setLoading(false); }
  };

  return (
    <div style={{ marginTop:16, background:"rgba(79,142,247,.04)", border:"1px solid rgba(79,142,247,.15)", borderRadius:12, padding:18 }}>
      <div style={{ fontSize:11, fontWeight:600, color:"#4f8ef7", fontFamily:"'DM Mono',monospace", letterSpacing:"1px", marginBottom:12, display:"flex", alignItems:"center", gap:6 }}>
        <span>✦</span> AI Appointment Prep
        {analysis && <button onClick={() => printConsultationPrep(appt, analysis)} style={{ marginLeft:"auto", padding:"3px 10px", background:"rgba(79,142,247,.1)", border:"1px solid rgba(79,142,247,.3)", borderRadius:6, color:"#7eb8d8", fontSize:10, cursor:"pointer", fontFamily:"'DM Mono',monospace" }}>⎙ Print</button>}
      </div>
      <div style={{ marginBottom:10 }}>
        <label style={{ fontSize:10, color:"#a0b4c8", fontFamily:"'DM Mono',monospace", letterSpacing:"0.8px", textTransform:"uppercase", display:"block", marginBottom:5 }}>Additional Questions / Context</label>
        <textarea
          value={additionalQ}
          onChange={e => setAdditionalQ(e.target.value)}
          placeholder="e.g. Ask about adjusting my Tacrolimus dose, or discuss recent lab trends…"
          rows={2}
          style={{ width:"100%", background:"#080c14", border:"1px solid #1a2f4a", borderRadius:8, padding:"9px 12px", color:"#c4d8ee", fontFamily:"'Sora',sans-serif", fontSize:12, outline:"none", resize:"vertical" }}
        />
      </div>
      <button
        onClick={runAnalysis}
        disabled={loading}
        style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", background:"rgba(79,142,247,.15)", border:"1px solid rgba(79,142,247,.35)", borderRadius:8, color:"#7eb8d8", fontSize:12, fontFamily:"'Sora',sans-serif", cursor:loading?"wait":"pointer", opacity:loading?0.7:1 }}
      >
        {loading ? "⏳ Analyzing…" : "✦ Generate Prep Analysis"}
      </button>
      {error && <div style={{ marginTop:10, fontSize:11, color:"#ef4444", fontFamily:"'DM Mono',monospace" }}>⚠ {error}</div>}
      {analysis && (
        <div style={{ marginTop:14, background:"#080c14", border:"1px solid #0d1a28", borderRadius:10, padding:"14px 16px", fontSize:12, color:"#a8c4dc", lineHeight:1.75, whiteSpace:"pre-wrap" }}>
          {analysis}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AppointmentsTab() {
  const [appts, setAppts]     = useState(() => loadAppts());
  const [modal, setModal]     = useState(null);   // null | BLANK | appt object
  const [filter, setFilter]   = useState("upcoming");
  const [expanded, setExpanded] = useState(null);
  const [showAI, setShowAI]   = useState(null);  // appt.id for which AI panel is open
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => { saveAppts(appts); }, [appts]);

  const handleSave = (appt) => {
    setAppts(prev => {
      const exists = prev.find(a => a.id === appt.id);
      return exists ? prev.map(a => a.id === appt.id ? appt : a) : [appt, ...prev];
    });
    setModal(null);
  };

  const handleDelete = (id) => {
    setAppts(prev => prev.filter(a => a.id !== id));
    setDeleteConfirm(null);
    if (expanded === id) setExpanded(null);
  };

  const filtered = appts
    .filter(a => filter === "all" || a.status === filter)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const upcomingCount   = appts.filter(a => a.status === "upcoming").length;
  const completedCount  = appts.filter(a => a.status === "completed").length;
  const nextAppt        = appts.filter(a => a.status === "upcoming").sort((a,b) => new Date(a.date)-new Date(b.date))[0];
  const nextDays        = nextAppt ? daysUntil(nextAppt.date) : null;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:"#07090f" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing:border-box; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        .apt-card { background:#0b1220; border:1px solid #111e30; border-radius:14px; transition:border-color .2s; animation:fadeUp .35s ease both; }
        .apt-card:hover { border-color:#1a2f4a; }
        .apt-row { display:flex; align-items:center; gap:14px; padding:16px 18px; border-radius:10px; background:#080c14; border:1px solid #0d1a28; margin-bottom:8px; cursor:pointer; transition:border-color .15s; }
        .apt-row:hover { border-color:#1a2f4a; }
        .apt-btn { display:flex; align-items:center; gap:6px; padding:7px 14px; border-radius:8px; font-family:'Sora',sans-serif; font-size:12px; font-weight:500; cursor:pointer; border:1px solid; transition:all .15s; }
        .filter-pill { padding:5px 14px; border-radius:20px; font-size:11px; font-family:'DM Mono',monospace; cursor:pointer; border:1px solid #1a2f4a; background:transparent; color:#98afc4; transition:all .15s; }
        .filter-pill.active { background:rgba(79,142,247,.15); border-color:rgba(79,142,247,.4); color:#7eb8d8; }
        input:focus, select:focus, textarea:focus { border-color:#2a4a7a !important; }
      `}</style>

      {/* Top bar */}
      <div style={{ height:54, background:"#080c14", borderBottom:"1px solid #0d1a28", display:"flex", alignItems:"center", padding:"0 24px", gap:12, flexShrink:0 }} />

      <div style={{ padding:"28px", overflowY:"auto", flex:1 }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24 }}>
          <div>
            <h1 style={{ fontFamily:"'DM Serif Display',serif", fontSize:28, color:"#dde8f5", fontWeight:400, letterSpacing:"-0.5px" }}>Appointments</h1>
            <p style={{ fontSize:12, color:"#98afc4", marginTop:5, fontFamily:"'DM Mono',monospace" }}>
              {upcomingCount} upcoming · {completedCount} completed
            </p>
          </div>
          <button
            className="apt-btn"
            style={{ background:"rgba(79,142,247,.15)", borderColor:"rgba(79,142,247,.35)", color:"#7eb8d8", marginTop:4 }}
            onClick={() => setModal({ ...BLANK })}
          >
            + New Appointment
          </button>
        </div>

        {/* Summary cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:24 }}>
          {/* Next appointment */}
          <div className="apt-card" style={{ padding:20 }}>
            <div style={{ fontSize:10, color:"#a0b4c8", fontFamily:"'DM Mono',monospace", letterSpacing:"1px", textTransform:"uppercase", marginBottom:10 }}>Next Appointment</div>
            {nextAppt ? (
              <>
                <div style={{ fontSize:18, fontWeight:700, color:"#dde8f5", marginBottom:4 }}>{nextAppt.title}</div>
                <div style={{ fontSize:12, color:"#7eb8d8", marginBottom:6 }}>{nextAppt.provider}</div>
                <div style={{ fontSize:11, color:"#98afc4", fontFamily:"'DM Mono',monospace" }}>{fmtDate(nextAppt.date)} · {nextAppt.time || "TBD"}</div>
                {nextDays !== null && (
                  <div style={{ marginTop:10, display:"inline-block", padding:"3px 10px", borderRadius:20, background: nextDays <= 3 ? "rgba(239,68,68,.12)" : "rgba(79,142,247,.12)", border:`1px solid ${nextDays<=3?"rgba(239,68,68,.3)":"rgba(79,142,247,.3)"}`, fontSize:10, color:nextDays<=3?"#ef4444":"#4f8ef7", fontFamily:"'DM Mono',monospace" }}>
                    {nextDays === 0 ? "Today" : nextDays === 1 ? "Tomorrow" : `In ${nextDays} days`}
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize:13, color:"#98afc4" }}>No upcoming appointments</div>
            )}
          </div>

          {/* This month */}
          <div className="apt-card" style={{ padding:20 }}>
            <div style={{ fontSize:10, color:"#a0b4c8", fontFamily:"'DM Mono',monospace", letterSpacing:"1px", textTransform:"uppercase", marginBottom:10 }}>This Month</div>
            {(() => {
              const now = new Date();
              const thisMonth = appts.filter(a => {
                const d = new Date(a.date + "T12:00:00");
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && a.status === "upcoming";
              }).sort((a, b) => new Date(a.date) - new Date(b.date));
              return thisMonth.length > 0 ? (
                <>
                  <div style={{ fontSize:32, fontWeight:700, color:"#4f8ef7", lineHeight:1, marginBottom:6 }}>{thisMonth.length}</div>
                  <div style={{ fontSize:11, color:"#7eb8d8" }}>appointment{thisMonth.length !== 1 ? "s" : ""} remaining</div>
                  {thisMonth.map((a,i) => (
                    <div key={i} style={{ marginTop:6, fontSize:11, color:"#98afc4", fontFamily:"'DM Mono',monospace" }}>
                      {new Date(a.date+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})} — {a.title}
                    </div>
                  ))}
                </>
              ) : (
                <div style={{ fontSize:13, color:"#98afc4" }}>No appointments this month</div>
              );
            })()}
          </div>

          {/* Prep needed */}
          <div className="apt-card" style={{ padding:20 }}>
            <div style={{ fontSize:10, color:"#a0b4c8", fontFamily:"'DM Mono',monospace", letterSpacing:"1px", textTransform:"uppercase", marginBottom:10 }}>Prep Required</div>
            {(() => {
              const prepNeeded = appts.filter(a => a.status === "upcoming" && a.prepInstructions);
              return prepNeeded.length > 0 ? (
                <>
                  <div style={{ fontSize:32, fontWeight:700, color:"#f59e0b", lineHeight:1, marginBottom:6 }}>{prepNeeded.length}</div>
                  <div style={{ fontSize:11, color:"#7eb8d8", marginBottom:8 }}>upcoming with prep</div>
                  {prepNeeded.slice(0,2).map((a,i) => (
                    <div key={i} style={{ marginTop:6, padding:"6px 10px", background:"rgba(245,158,11,.06)", border:"1px solid rgba(245,158,11,.15)", borderRadius:7 }}>
                      <div style={{ fontSize:11, color:"#f59e0b", marginBottom:2 }}>{a.title}</div>
                      <div style={{ fontSize:10, color:"#98afc4", fontFamily:"'DM Mono',monospace" }}>{a.prepInstructions}</div>
                    </div>
                  ))}
                </>
              ) : (
                <div style={{ fontSize:13, color:"#98afc4" }}>No prep instructions set</div>
              );
            })()}
          </div>
        </div>

        {/* Filter pills */}
        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          {[["upcoming","Upcoming"],["completed","Completed"],["cancelled","Cancelled"],["all","All"]].map(([val,lbl]) => (
            <button key={val} className={`filter-pill${filter===val?" active":""}`} onClick={() => setFilter(val)}>{lbl}</button>
          ))}
        </div>

        {/* Appointment list */}
        <div className="apt-card" style={{ padding:"20px" }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px 0", color:"#98afc4", fontSize:13 }}>
              No {filter !== "all" ? filter : ""} appointments
            </div>
          ) : filtered.map((appt, idx) => {
            const urgCfg  = URGENCY_CFG[appt.urgency] ?? URGENCY_CFG.med;
            const statCfg = STATUS_CFG[appt.status]  ?? STATUS_CFG.upcoming;
            const days    = daysUntil(appt.date);
            const isOpen  = expanded === appt.id;

            return (
              <div key={appt.id} style={{ animationDelay:`${idx*40}ms` }}>
                <div className="apt-row" onClick={() => setExpanded(isOpen ? null : appt.id)}>
                  {/* Urgency bar */}
                  <div style={{ width:3, height:44, borderRadius:2, background:urgCfg.color, flexShrink:0, boxShadow:`0 0 8px ${urgCfg.color}60` }} />

                  {/* Date block */}
                  <div style={{ flexShrink:0, width:48, textAlign:"center" }}>
                    <div style={{ fontSize:18, fontWeight:700, color:"#dde8f5", lineHeight:1 }}>
                      {appt.date ? new Date(appt.date+"T12:00:00").getDate() : "—"}
                    </div>
                    <div style={{ fontSize:9, color:"#a0b4c8", fontFamily:"'DM Mono',monospace", textTransform:"uppercase" }}>
                      {appt.date ? new Date(appt.date+"T12:00:00").toLocaleDateString("en-US",{month:"short"}) : ""}
                    </div>
                  </div>

                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"#c4d8ee", marginBottom:2 }}>{appt.title}</div>
                    <div style={{ fontSize:11, color:"#7eb8d8" }}>{appt.provider}{appt.specialty ? ` · ${appt.specialty}` : ""}</div>
                    {appt.facility && <div style={{ fontSize:10, color:"#98afc4", fontFamily:"'DM Mono',monospace", marginTop:2 }}>{appt.facility}</div>}
                  </div>

                  {/* Time */}
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <div style={{ fontSize:12, color:"#b0c4d8", fontFamily:"'DM Mono',monospace" }}>{appt.time || "—"}</div>
                    {days !== null && appt.status === "upcoming" && (
                      <div style={{ fontSize:10, color:days<=3?"#ef4444":days<=7?"#f59e0b":"#98afc4", fontFamily:"'DM Mono',monospace", marginTop:2 }}>
                        {days === 0 ? "Today" : days === 1 ? "Tomorrow" : days < 0 ? "Past" : `${days}d`}
                      </div>
                    )}
                  </div>

                  {/* Status badge */}
                  <div style={{ padding:"3px 10px", borderRadius:20, background:`${statCfg.color}18`, border:`1px solid ${statCfg.color}40`, fontSize:9, color:statCfg.color, fontFamily:"'DM Mono',monospace", flexShrink:0 }}>
                    {statCfg.label}
                  </div>

                  {/* Chevron */}
                  <div style={{ fontSize:11, color:"#a0b4c8", transition:"transform .2s", transform:isOpen?"rotate(180deg)":"rotate(0deg)", flexShrink:0 }}>▾</div>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div style={{ margin:"-4px 0 8px 0", padding:"16px 18px", background:"#07090f", border:"1px solid #0d1a28", borderTop:"none", borderRadius:"0 0 10px 10px", animation:"fadeUp .2s ease both" }}>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
                      {appt.address && <Detail label="Address"  value={appt.address} />}
                      {appt.phone   && <Detail label="Phone"    value={appt.phone}   />}
                      {appt.prepInstructions && <Detail label="Prep Instructions" value={appt.prepInstructions} />}
                      {appt.notes   && <Detail label="Notes"    value={appt.notes}   full />}
                    </div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                      <button className="apt-btn" style={{ background:"rgba(79,142,247,.12)", borderColor:"rgba(79,142,247,.3)", color:"#7eb8d8" }} onClick={e => { e.stopPropagation(); setModal(appt); }}>
                        ✎ Edit
                      </button>
                      <button className="apt-btn" style={{ background:"rgba(16,185,129,.10)", borderColor:"rgba(16,185,129,.25)", color:"#10b981" }}
                        onClick={e => { e.stopPropagation(); handleSave({ ...appt, status:"completed" }); }}>
                        ✓ Mark Complete
                      </button>
                      <button className="apt-btn"
                        style={{ background: showAI === appt.id ? "rgba(167,139,250,.15)" : "rgba(79,142,247,.08)", borderColor: showAI === appt.id ? "rgba(167,139,250,.4)" : "rgba(79,142,247,.2)", color: showAI === appt.id ? "#a78bfa" : "#7eb8d8" }}
                        onClick={e => { e.stopPropagation(); setShowAI(prev => prev === appt.id ? null : appt.id); }}>
                        ✦ {showAI === appt.id ? "Hide AI Prep" : "AI Prep Analysis"}
                      </button>
                      <button className="apt-btn" style={{ background:"rgba(239,68,68,.08)", borderColor:"rgba(239,68,68,.2)", color:"#ef4444", marginLeft:"auto" }}
                        onClick={e => { e.stopPropagation(); setDeleteConfirm(appt.id); }}>
                        ✕ Delete
                      </button>
                    </div>
                    {showAI === appt.id && <ApptAIPanel appt={appt} />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add/Edit modal */}
      {modal && <ApptModal appt={modal} onSave={handleSave} onClose={() => setModal(null)} />}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:"#0b1220", border:"1px solid #2a1a1a", borderRadius:14, padding:28, maxWidth:360, textAlign:"center" }}>
            <div style={{ fontSize:18, color:"#dde8f5", marginBottom:10 }}>Delete appointment?</div>
            <div style={{ fontSize:12, color:"#98afc4", marginBottom:22 }}>This cannot be undone.</div>
            <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
              <button className="apt-btn" style={{ background:"rgba(239,68,68,.12)", borderColor:"rgba(239,68,68,.3)", color:"#ef4444" }} onClick={() => handleDelete(deleteConfirm)}>Delete</button>
              <button className="apt-btn" style={{ background:"transparent", borderColor:"#1a2f4a", color:"#b0c4d8" }} onClick={() => setDeleteConfirm(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, full }) {
  return (
    <div style={full ? { gridColumn:"1/-1" } : {}}>
      <div style={{ fontSize:9, color:"#a0b4c8", fontFamily:"'DM Mono',monospace", letterSpacing:"1px", textTransform:"uppercase", marginBottom:3 }}>{label}</div>
      <div style={{ fontSize:12, color:"#b0c4d8" }}>{value}</div>
    </div>
  );
}
