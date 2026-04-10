import { useState, useEffect } from "react";
import LOGO_WHITE from "../../assets/logo-white.png";
import {
  getProfilePersonal, setProfilePersonal,
  getProfileInsurance, setProfileInsurance,
  getCareTeam, setCareTeam,
  getAllergies, setAllergies,
  getEmergencyContacts, setEmergencyContacts,
  getConditions, getSurgeries, getMedsFull, getLatestReading,
} from "../../store.js";

const T = {
  bg:"#07090f", sidebar:"#080c14", card:"#0b1220",
  border:"#0d1a28", borderHover:"#111e30", borderActive:"#1a2f4a",
  p:"#dde8f5", s:"#c4d8ee", m:"#7eb8d8",
  dim:"#b0c4d8", ghost:"#98afc4", faint:"#a0b4c8",
  blue:"#4f8ef7", purple:"#a78bfa", green:"#10b981",
  yellow:"#f59e0b", red:"#ef4444",
};

const inp = { width:"100%", background:"#07090f", border:"1px solid #1a2f4a", borderRadius:6, color:T.s, fontFamily:"'Sora',sans-serif", fontSize:12, padding:"6px 10px", outline:"none", boxSizing:"border-box" };
const lbl = { fontSize:9, fontFamily:"'DM Mono',monospace", color:T.faint, textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:4 };
const card = { background:T.card, border:`1px solid ${T.borderHover}`, borderRadius:14, padding:20 };

// ── Reusable card header ───────────────────────────────────────────────────────
function CardHeader({ title, editing, onEdit, onSave, onCancel, onAdd }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
      <span style={{ fontSize:10, letterSpacing:"1.5px", textTransform:"uppercase", color:T.faint, fontFamily:"'DM Mono',monospace" }}>{title}</span>
      <div style={{ display:"flex", gap:6 }}>
        {onAdd && !editing && (
          <button onClick={onAdd} style={{ background:"rgba(16,185,129,.08)", border:"1px solid rgba(16,185,129,.25)", borderRadius:7, color:T.green, fontFamily:"'Sora',sans-serif", fontSize:11, padding:"4px 11px", cursor:"pointer" }}>+ Add</button>
        )}
        {editing
          ? <>
              <button onClick={onCancel} style={{ background:"transparent", border:`1px solid ${T.borderHover}`, borderRadius:7, color:T.dim, fontFamily:"'Sora',sans-serif", fontSize:11, padding:"4px 11px", cursor:"pointer" }}>Cancel</button>
              <button onClick={onSave}   style={{ background:"rgba(79,142,247,.15)", border:"1px solid rgba(79,142,247,.4)", borderRadius:7, color:T.blue, fontFamily:"'Sora',sans-serif", fontSize:11, padding:"4px 11px", cursor:"pointer" }}>Save</button>
            </>
          : <button onClick={onEdit} style={{ background:"transparent", border:`1px solid ${T.borderActive}`, borderRadius:7, color:T.dim, fontFamily:"'Sora',sans-serif", fontSize:11, padding:"4px 11px", cursor:"pointer" }}>Edit</button>
        }
      </div>
    </div>
  );
}

// ── Simple field row ───────────────────────────────────────────────────────────
function FieldRow({ label, value, editing, field, vals, setVals }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"130px 1fr", gap:"4px 12px", padding:"7px 0", borderBottom:`1px solid ${T.border}`, alignItems:"start" }}>
      <span style={{ fontSize:10, fontFamily:"'DM Mono',monospace", color:T.ghost, textTransform:"uppercase", letterSpacing:".8px", paddingTop:2 }}>{label}</span>
      {editing
        ? <input value={vals[field] ?? value ?? ""} onChange={e => setVals(p => ({ ...p, [field]: e.target.value }))} style={inp} />
        : <span style={{ fontSize:13, color:T.s, lineHeight:1.45 }}>{value || <span style={{ color:T.ghost, fontStyle:"italic" }}>—</span>}</span>
      }
    </div>
  );
}

// ── Phone formatter ───────────────────────────────────────────────────────────
function formatPhone(val) {
  const digits = (val || "").replace(/\D/g, "").slice(0, 10);
  if (!digits.length) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0,3)})-${digits.slice(3)}`;
  return `(${digits.slice(0,3)})-${digits.slice(3,6)}-${digits.slice(6)}`;
}

// ── Care Team Modal ────────────────────────────────────────────────────────────
const BLANK_PROVIDER = { id:null, name:"", role:"", specialty:"", facility:"", phone:"", email:"", pcp:false };
function ProviderModal({ provider, onSave, onClose }) {
  const [form, setForm] = useState({ ...BLANK_PROVIDER, ...provider });
  const set = (k,v) => setForm(f => ({ ...f, [k]:v }));
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}>
      <div style={{ background:T.card, border:`1px solid ${T.borderActive}`, borderRadius:16, padding:28, width:480, maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:20, color:T.p, marginBottom:20 }}>{form.id ? "Edit Provider" : "Add Provider"}</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>Full Name *</label>
            <input style={inp} value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Dr. Jane Smith, MD" />
          </div>
          <div>
            <label style={lbl}>Role / Title</label>
            <input style={inp} value={form.role} onChange={e => set("role", e.target.value)} placeholder="e.g. Primary Care Physician" />
          </div>
          <div>
            <label style={lbl}>Specialty</label>
            <input style={inp} value={form.specialty} onChange={e => set("specialty", e.target.value)} placeholder="e.g. Nephrology" />
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>Facility / Practice</label>
            <input style={inp} value={form.facility} onChange={e => set("facility", e.target.value)} placeholder="e.g. Baptist Medical Center" />
          </div>
          <div>
            <label style={lbl}>Phone</label>
            <input style={inp} value={form.phone} onChange={e => set("phone", formatPhone(e.target.value))} placeholder="(601) 555-0000" />
          </div>
          <div>
            <label style={lbl}>Email / Portal</label>
            <input style={inp} value={form.email} onChange={e => set("email", e.target.value)} placeholder="optional" />
          </div>
          <div style={{ gridColumn:"1/-1", display:"flex", alignItems:"center", gap:8, marginTop:4 }}>
            <input type="checkbox" id="pcp-check" checked={form.pcp} onChange={e => set("pcp", e.target.checked)}
              style={{ width:14, height:14, cursor:"pointer" }} />
            <label htmlFor="pcp-check" style={{ fontSize:12, color:T.dim, cursor:"pointer" }}>Primary Care Provider (PCP)</label>
          </div>
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
          <button onClick={onClose} style={{ padding:"8px 18px", background:"transparent", border:`1px solid ${T.borderHover}`, borderRadius:8, color:T.dim, fontFamily:"'Sora',sans-serif", fontSize:12, cursor:"pointer" }}>Cancel</button>
          <button onClick={() => { if (!form.name.trim()) return; onSave({ ...form, id: form.id ?? Date.now() }); }}
            style={{ padding:"8px 18px", background:"rgba(79,142,247,.12)", border:"1px solid rgba(79,142,247,.35)", borderRadius:8, color:T.blue, fontFamily:"'Sora',sans-serif", fontSize:12, cursor:"pointer" }}>
            Save Provider
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Allergy Modal ──────────────────────────────────────────────────────────────
const BLANK_ALLERGY = { id:null, name:"", reaction:"", severity:"Moderate" };
const SEVERITIES = ["Mild","Moderate","Severe","Life-threatening"];
function AllergyModal({ allergy, onSave, onClose }) {
  const [form, setForm] = useState({ ...BLANK_ALLERGY, ...allergy });
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}>
      <div style={{ background:T.card, border:`1px solid ${T.borderActive}`, borderRadius:16, padding:28, width:420 }}>
        <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:20, color:T.p, marginBottom:20 }}>{form.id ? "Edit Allergy" : "Add Allergy"}</div>
        <div style={{ marginBottom:12 }}>
          <label style={lbl}>Allergen *</label>
          <input style={inp} value={form.name} onChange={e => setForm(f => ({...f, name:e.target.value}))} placeholder="e.g. Penicillin" />
        </div>
        <div style={{ marginBottom:12 }}>
          <label style={lbl}>Reaction</label>
          <input style={inp} value={form.reaction} onChange={e => setForm(f => ({...f, reaction:e.target.value}))} placeholder="e.g. Anaphylaxis" />
        </div>
        <div style={{ marginBottom:20 }}>
          <label style={lbl}>Severity</label>
          <select style={{ ...inp }} value={form.severity} onChange={e => setForm(f => ({...f, severity:e.target.value}))}>
            {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ padding:"8px 18px", background:"transparent", border:`1px solid ${T.borderHover}`, borderRadius:8, color:T.dim, fontFamily:"'Sora',sans-serif", fontSize:12, cursor:"pointer" }}>Cancel</button>
          <button onClick={() => { if (!form.name.trim()) return; onSave({ ...form, id: form.id ?? Date.now() }); }}
            style={{ padding:"8px 18px", background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.3)", borderRadius:8, color:T.red, fontFamily:"'Sora',sans-serif", fontSize:12, cursor:"pointer" }}>
            Save Allergy
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Emergency Contact Modal ────────────────────────────────────────────────────
const BLANK_EC = { id:null, name:"", relationship:"", phone:"", email:"", primary:false };
function ECModal({ contact, onSave, onClose }) {
  const [form, setForm] = useState({ ...BLANK_EC, ...contact });
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}>
      <div style={{ background:T.card, border:`1px solid ${T.borderActive}`, borderRadius:16, padding:28, width:420 }}>
        <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:20, color:T.p, marginBottom:20 }}>{form.id ? "Edit Contact" : "Add Emergency Contact"}</div>
        {[["Full Name","name","e.g. Sarah Butler"],["Relationship","relationship","e.g. Spouse"],["Phone","phone","(601) 555-0000"],["Email","email","optional"]].map(([label, key, ph]) => (
          <div key={key} style={{ marginBottom:12 }}>
            <label style={lbl}>{label}</label>
            <input style={inp} value={form[key]}
              onChange={e => setForm(f => ({...f, [key]: key === "phone" ? formatPhone(e.target.value) : e.target.value}))}
              placeholder={ph} />
          </div>
        ))}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20 }}>
          <input type="checkbox" id="primary-check" checked={form.primary} onChange={e => setForm(f => ({...f, primary:e.target.checked}))} style={{ width:14, height:14, cursor:"pointer" }} />
          <label htmlFor="primary-check" style={{ fontSize:12, color:T.dim, cursor:"pointer" }}>Primary emergency contact</label>
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ padding:"8px 18px", background:"transparent", border:`1px solid ${T.borderHover}`, borderRadius:8, color:T.dim, fontFamily:"'Sora',sans-serif", fontSize:12, cursor:"pointer" }}>Cancel</button>
          <button onClick={() => { if (!form.name.trim()) return; onSave({ ...form, id: form.id ?? Date.now() }); }}
            style={{ padding:"8px 18px", background:"rgba(16,185,129,.1)", border:"1px solid rgba(16,185,129,.3)", borderRadius:8, color:T.green, fontFamily:"'Sora',sans-serif", fontSize:12, cursor:"pointer" }}>
            Save Contact
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete confirm ─────────────────────────────────────────────────────────────
function DeleteConfirm({ label, onConfirm, onCancel }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300 }}>
      <div style={{ background:T.card, border:`1px solid ${T.borderActive}`, borderRadius:14, padding:28, width:360 }}>
        <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:20, color:T.p, marginBottom:10 }}>Delete?</div>
        <div style={{ fontSize:13, color:T.ghost, marginBottom:22 }}>Remove <strong style={{ color:T.s }}>{label}</strong>? This cannot be undone.</div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onCancel} style={{ padding:"8px 18px", background:"transparent", border:`1px solid ${T.borderHover}`, borderRadius:8, color:T.dim, fontFamily:"'Sora',sans-serif", fontSize:12, cursor:"pointer" }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding:"8px 18px", background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.3)", borderRadius:8, color:T.red, fontFamily:"'Sora',sans-serif", fontSize:12, cursor:"pointer" }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Severity color ─────────────────────────────────────────────────────────────
function severityColor(s) {
  if (s === "Severe" || s === "Life-threatening") return T.red;
  if (s === "Moderate") return T.yellow;
  return T.green;
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ProfileTab() {
  // Editable sections
  const [personal, setPersonal]   = useState(() => getProfilePersonal());
  const [insurance, setInsurance] = useState(() => getProfileInsurance());
  const [careTeam, setCareTeamState]       = useState(() => getCareTeam());
  const [allergies, setAllergiesState]     = useState(() => getAllergies());
  const [contacts, setContactsState]       = useState(() => getEmergencyContacts());

  // Read-only pulls from other sections
  const [conditions, setConditions] = useState([]);
  const [meds, setMeds]             = useState([]);
  const [surgeries, setSurgeries]   = useState([]);
  const [latestVitals, setLatestVitals] = useState(null);

  // Edit mode flags
  const [edPersonal, setEdPersonal]   = useState(false);
  const [edInsurance, setEdInsurance] = useState(false);
  const [tempPersonal, setTempPersonal]   = useState({});
  const [tempInsurance, setTempInsurance] = useState({});

  // Modals
  const [providerModal, setProviderModal]   = useState(null); // null | BLANK | existing
  const [allergyModal, setAllergyModal]     = useState(null);
  const [ecModal, setEcModal]               = useState(null);
  const [deleteTarget, setDeleteTarget]     = useState(null); // { type, id, label }

  useEffect(() => {
    setConditions(getConditions());
    setMeds(getMedsFull());
    setSurgeries(getSurgeries());
    setLatestVitals(getLatestReading());
  }, []);

  // ── Save helpers ──────────────────────────────────────────────────────────────
  function savePersonal() {
    const merged = { ...personal, ...tempPersonal };
    setPersonal(merged);
    setProfilePersonal(merged);
    setEdPersonal(false);
    setTempPersonal({});
  }
  function saveInsurance() {
    const merged = { ...insurance, ...tempInsurance };
    setInsurance(merged);
    setProfileInsurance(merged);
    setEdInsurance(false);
    setTempInsurance({});
  }

  // Care team
  function saveProvider(p) {
    const updated = p.id && careTeam.find(x => x.id === p.id)
      ? careTeam.map(x => x.id === p.id ? p : x)
      : [...careTeam, p];
    setCareTeamState(updated);
    setCareTeam(updated);
    setProviderModal(null);
  }
  function deleteProvider(id) {
    const updated = careTeam.filter(x => x.id !== id);
    setCareTeamState(updated);
    setCareTeam(updated);
    setDeleteTarget(null);
  }

  // Allergies
  function saveAllergy(a) {
    const updated = a.id && allergies.find(x => x.id === a.id)
      ? allergies.map(x => x.id === a.id ? a : x)
      : [...allergies, a];
    setAllergiesState(updated);
    setAllergies(updated);
    setAllergyModal(null);
  }
  function deleteAllergy(id) {
    const updated = allergies.filter(x => x.id !== id);
    setAllergiesState(updated);
    setAllergies(updated);
    setDeleteTarget(null);
  }

  // Emergency contacts
  function saveContact(c) {
    const updated = c.id && contacts.find(x => x.id === c.id)
      ? contacts.map(x => x.id === c.id ? c : x)
      : [...contacts, c];
    setContactsState(updated);
    setEmergencyContacts(updated);
    setEcModal(null);
  }
  function deleteContact(id) {
    const updated = contacts.filter(x => x.id !== id);
    setContactsState(updated);
    setEmergencyContacts(updated);
    setDeleteTarget(null);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.type === "provider") deleteProvider(deleteTarget.id);
    else if (deleteTarget.type === "allergy") deleteAllergy(deleteTarget.id);
    else if (deleteTarget.type === "contact") deleteContact(deleteTarget.id);
  }

  // All surgeries sorted newest first
  const allSurgeries = [...surgeries].sort((a, b) => new Date(b.date) - new Date(a.date));

  // Active meds
  const activeMeds = meds.filter(m => m.status !== "inactive");

  function handlePrint() {
    const el = document.getElementById("print-profile");
    if (!el) return;
    const html = el.innerHTML;
    const win = window.open("", "_blank", "width=900,height=700");
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>IntelliTrax — Patient Profile</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { background: #ffffff; color: #000000; font-family: Georgia, serif; font-size: 10pt; }
    body { padding: 32pt 40pt; }
    h1 { font-size: 18pt; color: #000; margin-bottom: 3pt; }
    h2 { font-size: 10.5pt; font-family: Arial, sans-serif; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: #000; border-bottom: 1.5pt solid #000; padding-bottom: 3pt; margin: 16pt 0 8pt; }
    .header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12pt; }
    .header-meta { font-size: 9pt; color: #444; font-family: Arial, sans-serif; margin-top: 4pt; }
    .brand { text-align: right; font-family: Arial, sans-serif; }
    .brand-name { font-size: 12pt; font-weight: 700; color: #000; letter-spacing: 1px; }
    .brand-sub { font-size: 8pt; color: #555; }
    .pr { display: flex; padding: 3.5pt 0; border-bottom: 0.5pt solid #ccc; font-size: 9.5pt; align-items: flex-start; }
    .pr-lbl { font-family: Arial, sans-serif; font-size: 8.5pt; color: #444; min-width: 120pt; flex-shrink: 0; padding-top: 1pt; }
    .pr-val { color: #000; flex: 1; line-height: 1.45; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 32pt; }
    .allergy-row { padding: 4pt 0; border-bottom: 0.5pt solid #ccc; font-size: 9.5pt; color: #000; }
    .allergy-row strong { color: #000; }
    .pr-meta { font-size: 8.5pt; color: #555; }
    .footer { margin-top: 24pt; font-size: 8pt; color: #777; font-family: Arial, sans-serif; text-align: center; border-top: 0.5pt solid #ccc; padding-top: 6pt; }
    @media print {
      body { padding: 0; }
      @page { margin: 18mm 20mm; }
    }
  </style>
</head>
<body>${html}</body>
</html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 400);
  }

  const P = personal;
  const I = insurance;

  const PERSONAL_FIELDS = [
    ["Full Name","name"],["Date of Birth","dob"],["Age","age"],["Sex","sex"],
    ["Blood Type","blood"],["Height","height"],["Weight","weight"],
    ["Phone","phone"],["Email","email"],["Address","address"],
  ];
  const INSURANCE_FIELDS = [
    ["Primary Insurer","ins1"],["Plan","plan1"],["Member ID","mid1"],["Group #","grp1"],
    ["Secondary Insurer","ins2"],["Member ID (2)","mid2"],["Copay (Specialist)","copay"],
    ["Deductible (YTD)","ded"],["Out-of-Pocket Max","oop"],
  ];

  return (
    <div style={{ display:"flex", height:"100vh", background:T.bg, color:"#d4e2f0", fontFamily:"'Sora',sans-serif", flexDirection:"column", overflow:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-thumb { background:#1a2840; border-radius:4px; }
        input:focus, select:focus { border-color:#4f8ef7 !important; }
        .icon-btn { background:transparent; border:1px solid #111e30; border-radius:6px; color:#b0c4d8; font-size:11px; padding:3px 8px; cursor:pointer; transition:all .15s; }
        .icon-btn:hover { border-color:#1a2f4a; color:#7eb8d8; }
        .icon-btn.danger:hover { border-color:rgba(239,68,68,.4); color:#ef4444; }

        @media screen { #print-profile { display: none; } }
      `}</style>

      {/* Topbar */}
      <div className="no-print" style={{ height:54, background:T.sidebar, borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", padding:"0 28px", gap:16, flexShrink:0 }}>
        <div style={{ flex:1 }} />
        <button
          onClick={handlePrint}
          style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", background:"rgba(79,142,247,.08)", border:"1px solid rgba(79,142,247,.25)", borderRadius:8, color:T.blue, fontSize:11, fontFamily:"'DM Mono',monospace", cursor:"pointer" }}
        >
          🖨 Print Profile
        </button>
        <div style={{ width:32, height:32, background:"linear-gradient(135deg,#4f8ef7,#a78bfa)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700 }}>
          {(P.name || "G").charAt(0).toUpperCase()}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:"auto", padding:28 }}>
        <div style={{ marginBottom:24 }}>
          <h1 style={{ fontFamily:"'DM Serif Display',serif", fontSize:28, color:T.p, fontWeight:400, letterSpacing:"-0.5px" }}>Patient Profile</h1>
          <p style={{ fontSize:12, color:T.ghost, marginTop:5, fontFamily:"'DM Mono',monospace" }}>
            {P.name || "—"} · Last updated {new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
          </p>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>

          {/* ── Personal & Demographics ── */}
          <div style={card}>
            <CardHeader
              title="Personal & Demographics"
              editing={edPersonal}
              onEdit={() => { setTempPersonal({}); setEdPersonal(true); }}
              onSave={savePersonal}
              onCancel={() => { setEdPersonal(false); setTempPersonal({}); }}
            />
            {PERSONAL_FIELDS.map(([label, field]) => (
              <FieldRow key={field} label={label} value={P[field]} editing={edPersonal} field={field} vals={tempPersonal} setVals={setTempPersonal} />
            ))}
          </div>

          {/* ── Insurance ── */}
          <div style={card}>
            <CardHeader
              title="Insurance / Coverage"
              editing={edInsurance}
              onEdit={() => { setTempInsurance({}); setEdInsurance(true); }}
              onSave={saveInsurance}
              onCancel={() => { setEdInsurance(false); setTempInsurance({}); }}
            />
            {INSURANCE_FIELDS.map(([label, field]) => (
              <FieldRow key={field} label={label} value={I[field]} editing={edInsurance} field={field} vals={tempInsurance} setVals={setTempInsurance} />
            ))}
          </div>

          {/* ── Care Team — full width ── */}
          <div style={{ ...card, gridColumn:"1/-1" }}>
            <CardHeader title="Care Team" onAdd={() => setProviderModal({ ...BLANK_PROVIDER })} />
            {careTeam.length === 0 && (
              <div style={{ textAlign:"center", padding:"30px 0", fontSize:12, color:T.ghost, fontFamily:"'DM Mono',monospace" }}>
                No providers added yet. Click + Add to add your care team.
              </div>
            )}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 32px" }}>
              {careTeam.map((doc, i) => {
                const initials = doc.name.split(" ").filter(w => /^[A-Z]/.test(w)).map(w => w[0]).join("").slice(0,2);
                return (
                  <div key={doc.id} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"10px 0", borderBottom: i < careTeam.length - 1 ? `1px solid ${T.border}` : "none" }}>
                    <div style={{ width:36, height:36, borderRadius:"50%", background: doc.pcp ? "linear-gradient(135deg,rgba(79,142,247,.3),rgba(167,139,250,.2))" : "linear-gradient(135deg,rgba(79,142,247,.12),rgba(167,139,250,.08))", border:`1px solid ${doc.pcp ? "rgba(79,142,247,.4)" : "rgba(79,142,247,.2)"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:600, color:T.blue, flexShrink:0 }}>
                      {initials || "?"}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                        <span style={{ fontSize:13, fontWeight:600, color:T.s }}>{doc.name}</span>
                        {doc.pcp && <span style={{ fontSize:9, background:"rgba(79,142,247,.12)", color:T.blue, border:"1px solid rgba(79,142,247,.25)", borderRadius:10, padding:"1px 7px", fontFamily:"'DM Mono',monospace" }}>PCP</span>}
                      </div>
                      <div style={{ fontSize:11, color:T.m, marginTop:2 }}>{doc.role}{doc.specialty ? ` · ${doc.specialty}` : ""}</div>
                      <div style={{ fontSize:10, color:T.ghost, fontFamily:"'DM Mono',monospace", marginTop:1 }}>{doc.facility}</div>
                      {doc.phone && <div style={{ fontSize:11, color:T.blue, fontFamily:"'DM Mono',monospace", marginTop:3 }}>{doc.phone}</div>}
                    </div>
                    <div style={{ display:"flex", gap:4, flexShrink:0 }}>
                      <button className="icon-btn" onClick={() => setProviderModal(doc)}>✎</button>
                      <button className="icon-btn danger" onClick={() => setDeleteTarget({ type:"provider", id:doc.id, label:doc.name })}>✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Conditions — pulled from Conditions tab ── */}
          <div style={card}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
              <span style={{ fontSize:10, letterSpacing:"1.5px", textTransform:"uppercase", color:T.faint, fontFamily:"'DM Mono',monospace" }}>Active Conditions</span>
              <span style={{ fontSize:10, color:T.ghost, fontFamily:"'DM Mono',monospace" }}>from Conditions tab ↗</span>
            </div>
            {conditions.filter(c => c.status !== "resolved").length === 0
              ? <div style={{ fontSize:12, color:T.ghost, fontFamily:"'DM Mono',monospace", padding:"16px 0", textAlign:"center" }}>No conditions recorded</div>
              : conditions.filter(c => c.status !== "resolved").map((c, i) => {
                  const color = c.status === "active" ? T.red : c.status === "managed" ? T.yellow : T.blue;
                  return (
                    <div key={c.id || i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${T.border}` }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ width:6, height:6, borderRadius:"50%", background:color, flexShrink:0 }} />
                        <div>
                          <div style={{ fontSize:12, color:T.s }}>{c.name}</div>
                          {c.icd10 && <div style={{ fontSize:10, color:T.ghost, fontFamily:"'DM Mono',monospace" }}>{c.icd10}</div>}
                        </div>
                      </div>
                      <span style={{ fontSize:9, padding:"2px 8px", borderRadius:10, fontFamily:"'DM Mono',monospace", background:`${color}18`, color, border:`1px solid ${color}35` }}>{c.status}</span>
                    </div>
                  );
                })
            }
          </div>

          {/* ── Allergies ── */}
          <div style={card}>
            <CardHeader title="Allergies" onAdd={() => setAllergyModal({ ...BLANK_ALLERGY })} />
            {allergies.length === 0
              ? <div style={{ fontSize:12, color:T.ghost, fontFamily:"'DM Mono',monospace", padding:"16px 0", textAlign:"center" }}>No allergies recorded</div>
              : <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {allergies.map(a => {
                    const c = severityColor(a.severity);
                    return (
                      <div key={a.id} style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(239,68,68,.07)", border:`1px solid ${c}30`, borderRadius:8, padding:"6px 10px", position:"relative" }}>
                        <div style={{ width:5, height:5, borderRadius:"50%", background:c, flexShrink:0 }} />
                        <div>
                          <div style={{ fontSize:12, fontWeight:600, color:"#f87171" }}>{a.name}</div>
                          <div style={{ fontSize:10, color:T.m, fontFamily:"'DM Mono',monospace" }}>{a.reaction} · {a.severity}</div>
                        </div>
                        <div style={{ display:"flex", gap:3, marginLeft:4 }}>
                          <button className="icon-btn" onClick={() => setAllergyModal(a)} style={{ fontSize:10, padding:"2px 6px" }}>✎</button>
                          <button className="icon-btn danger" onClick={() => setDeleteTarget({ type:"allergy", id:a.id, label:a.name })} style={{ fontSize:10, padding:"2px 6px" }}>✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
            }
          </div>

          {/* ── Active Medications — pulled from Medications tab ── */}
          <div style={card}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
              <span style={{ fontSize:10, letterSpacing:"1.5px", textTransform:"uppercase", color:T.faint, fontFamily:"'DM Mono',monospace" }}>Active Medications</span>
              <span style={{ fontSize:10, color:T.ghost, fontFamily:"'DM Mono',monospace" }}>from Medications tab ↗</span>
            </div>
            {activeMeds.length === 0
              ? <div style={{ fontSize:12, color:T.ghost, fontFamily:"'DM Mono',monospace", padding:"16px 0", textAlign:"center" }}>No medications recorded</div>
              : activeMeds.map((m, i) => (
                  <div key={m.id || i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"7px 0", borderBottom:`1px solid ${T.border}` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:6, height:6, borderRadius:"50%", background:m.color || T.blue, flexShrink:0 }} />
                      <div>
                        <span style={{ fontSize:12, color:T.s, fontWeight:500 }}>{m.name}</span>
                        {m.brand && <span style={{ fontSize:10, color:T.ghost, marginLeft:6, fontFamily:"'DM Mono',monospace" }}>{m.brand}</span>}
                      </div>
                    </div>
                    <span style={{ fontSize:11, color:T.ghost, fontFamily:"'DM Mono',monospace" }}>{m.dose} · {m.frequency}</span>
                  </div>
                ))
            }
          </div>

          {/* ── Emergency Contacts ── */}
          <div style={card}>
            <CardHeader title="Emergency Contacts" onAdd={() => setEcModal({ ...BLANK_EC })} />
            {contacts.length === 0
              ? <div style={{ fontSize:12, color:T.ghost, fontFamily:"'DM Mono',monospace", padding:"16px 0", textAlign:"center" }}>No emergency contacts added</div>
              : contacts.map((c, i) => (
                  <div key={c.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom: i < contacts.length - 1 ? `1px solid ${T.border}` : "none" }}>
                    <div style={{ width:36, height:36, borderRadius:"50%", background:"rgba(16,185,129,.1)", border:"1px solid rgba(16,185,129,.25)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:600, color:T.green, flexShrink:0 }}>
                      {c.name.split(" ").map(n => n[0]).join("").slice(0,2)}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ fontSize:13, fontWeight:600, color:T.s }}>{c.name}</span>
                        {c.primary && <span style={{ fontSize:9, background:"rgba(16,185,129,.1)", color:T.green, border:"1px solid rgba(16,185,129,.2)", borderRadius:10, padding:"1px 7px", fontFamily:"'DM Mono',monospace" }}>Primary</span>}
                      </div>
                      <div style={{ fontSize:11, color:T.ghost, marginTop:1 }}>{c.relationship}</div>
                      {c.phone && <div style={{ fontSize:11, color:T.blue, fontFamily:"'DM Mono',monospace", marginTop:2 }}>{c.phone}</div>}
                    </div>
                    <div style={{ display:"flex", gap:4 }}>
                      <button className="icon-btn" onClick={() => setEcModal(c)}>✎</button>
                      <button className="icon-btn danger" onClick={() => setDeleteTarget({ type:"contact", id:c.id, label:c.name })}>✕</button>
                    </div>
                  </div>
                ))
            }
          </div>

          {/* ── Recent Surgeries (last 12 months) ── */}
          <div style={{ ...card, gridColumn:"1/-1" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
              <span style={{ fontSize:10, letterSpacing:"1.5px", textTransform:"uppercase", color:T.faint, fontFamily:"'DM Mono',monospace" }}>Surgical &amp; Procedure History</span>
              <span style={{ fontSize:10, color:T.ghost, fontFamily:"'DM Mono',monospace" }}>from Surgeries tab ↗</span>
            </div>
            {allSurgeries.length === 0
              ? <div style={{ fontSize:12, color:T.ghost, fontFamily:"'DM Mono',monospace", padding:"16px 0", textAlign:"center" }}>No surgeries recorded</div>
              : <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 32px" }}>
                  {allSurgeries.map((s, i) => (
                    <div key={s.id || i} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"10px 0", borderBottom: i < allSurgeries.length - 1 ? `1px solid ${T.border}` : "none" }}>
                      <div style={{ width:8, height:8, borderRadius:"50%", background:T.blue, marginTop:4, flexShrink:0 }} />
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color:T.s }}>{s.procedure}</div>
                        <div style={{ fontSize:10, color:T.blue, fontFamily:"'DM Mono',monospace", marginTop:2 }}>
                          {s.date ? new Date(s.date + "T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "—"}
                          {s.facility ? ` · ${s.facility}` : ""}
                        </div>
                        {s.surgeon && <div style={{ fontSize:11, color:T.ghost, marginTop:1 }}>{s.surgeon}</div>}
                        {s.icd10 && <div style={{ fontSize:10, color:T.ghost, fontFamily:"'DM Mono',monospace" }}>ICD-10: {s.icd10}</div>}
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>

          {/* ── Latest Vitals ── */}
          {latestVitals && (
            <div style={{ ...card, gridColumn:"1/-1" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                <span style={{ fontSize:10, letterSpacing:"1.5px", textTransform:"uppercase", color:T.faint, fontFamily:"'DM Mono',monospace" }}>Latest Vitals</span>
                <span style={{ fontSize:10, color:T.ghost, fontFamily:"'DM Mono',monospace" }}>from Vitals tab ↗ · {latestVitals.ts ? new Date(latestVitals.ts).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "—"}</span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(140px,1fr))", gap:12 }}>
                {[
                  ["Blood Pressure", latestVitals.systolic && latestVitals.diastolic ? `${latestVitals.systolic}/${latestVitals.diastolic} mmHg` : null, T.red],
                  ["O₂ Saturation", latestVitals.o2 ? `${latestVitals.o2}%` : null, T.blue],
                  ["Weight", latestVitals.weight ? `${latestVitals.weight} lbs` : null, T.green],
                  ["Temperature", latestVitals.temp ? `${latestVitals.temp}°F` : null, T.yellow],
                  ["Blood Glucose", latestVitals.glucose ? `${latestVitals.glucose} mg/dL` : null, T.purple],
                  ["Heart Rate", latestVitals.pulse ? `${latestVitals.pulse} bpm` : null, T.red],
                ].filter(([,v]) => v).map(([label, value, color]) => (
                  <div key={label} style={{ background:"#080c14", border:`1px solid ${T.border}`, borderRadius:10, padding:"12px 14px" }}>
                    <div style={{ fontSize:10, color:T.ghost, fontFamily:"'DM Mono',monospace", marginBottom:4 }}>{label}</div>
                    <div style={{ fontSize:16, fontWeight:700, color }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Modals */}
      {providerModal && <ProviderModal provider={providerModal} onSave={saveProvider} onClose={() => setProviderModal(null)} />}
      {allergyModal  && <AllergyModal  allergy={allergyModal}  onSave={saveAllergy}  onClose={() => setAllergyModal(null)}  />}
      {ecModal       && <ECModal       contact={ecModal}       onSave={saveContact}  onClose={() => setEcModal(null)}       />}
      {deleteTarget  && <DeleteConfirm label={deleteTarget.label} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />}

      {/* ── Print layout (screen:hidden, print:visible) ── */}
      <div id="print-profile">
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
          <div>
            <h1 style={{ marginBottom:2 }}>{P.name || "Patient Name"}</h1>
            <div style={{ fontSize:"9pt", color:"#555", fontFamily:"Arial, sans-serif" }}>
              DOB: {P.dob || "—"} &nbsp;·&nbsp; Age: {P.age || "—"} &nbsp;·&nbsp; Sex: {P.sex || "—"} &nbsp;·&nbsp; Blood Type: {P.blood || "—"}
            </div>
          </div>
          <div style={{ textAlign:"right", fontSize:"8pt", color:"#444", fontFamily:"Arial, sans-serif" }}>
            <div style={{ background:"#07090f", borderRadius:6, padding:"4px 10px", display:"inline-block", marginBottom:4 }}>
              <img src={LOGO_WHITE} alt="IntelliTrax" style={{ height:30, objectFit:"contain", display:"block" }} />
            </div>
            <div>Personal Health Record</div>
            <div>Printed: {new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</div>
          </div>
        </div>

        {/* Demographics */}
        <h2>Demographics &amp; Contact</h2>
        <div className="grid2">
          {[["Height",P.height],["Weight",P.weight],["Phone",P.phone],["Email",P.email],["Address",P.address]].map(([l,v])=>v?(
            <div key={l} className="pr"><span className="pr-lbl">{l}</span><span className="pr-val">{v}</span></div>
          ):null)}
        </div>

        {/* Insurance */}
        {(I.ins1 || I.plan1 || I.ins2) && <>
          <h2>Insurance / Coverage</h2>
          <div className="grid2">
            {[["Primary Insurer",I.ins1],["Plan",I.plan1],["Member ID",I.mid1],["Group #",I.grp1],
              ["Secondary Insurer",I.ins2],["Member ID (2)",I.mid2],["Copay (Specialist)",I.copay],["Deductible YTD",I.ded],["Out-of-Pocket Max",I.oop]
            ].map(([l,v])=>v?(
              <div key={l} className="pr"><span className="pr-lbl">{l}</span><span className="pr-val">{v}</span></div>
            ):null)}
          </div>
        </>}

        {/* Emergency Contacts */}
        {contacts.length > 0 && <>
          <h2>Emergency Contacts</h2>
          {contacts.map((c,i)=>(
            <div key={i} className="pr">
              <span className="pr-lbl">{c.name}{c.primary?" (Primary)":""}</span>
              <span className="pr-val">{c.relationship} &nbsp;·&nbsp; {c.phone}{c.email?` · ${c.email}`:""}</span>
            </div>
          ))}
        </>}

        {/* Allergies */}
        {allergies.length > 0 && <>
          <h2>Allergies</h2>
          {allergies.map((a,i)=>(
            <div key={i} className="allergy-row">
              <strong>{a.name}</strong> — {a.reaction} <span style={{fontSize:"8pt",color:"#555"}}>({a.severity})</span>
            </div>
          ))}
        </>}

        {/* Active Conditions */}
        {conditions.filter(c=>c.status!=="resolved").length > 0 && <>
          <h2>Active Conditions / Diagnoses</h2>
          {conditions.filter(c=>c.status!=="resolved").map((c,i)=>(
            <div key={i} className="pr">
              <span className="pr-lbl">{c.diagnosedDate ? new Date(c.diagnosedDate+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "—"}</span>
              <span className="pr-val">{c.name} <span style={{fontSize:"8pt",color:"#666"}}>({c.status})</span></span>
            </div>
          ))}
        </>}

        {/* Current Medications */}
        {activeMeds.length > 0 && <>
          <h2>Current Medications</h2>
          <div className="grid2">
            {activeMeds.map((m,i)=>(
              <div key={i} className="pr">
                <span className="pr-lbl">{m.name}{m.brand?` (${m.brand})`:""}</span>
                <span className="pr-val">{m.dose} — {m.frequency}{m.prescriber?` · ${m.prescriber}`:""}</span>
              </div>
            ))}
          </div>
        </>}

        {/* Care Team */}
        {careTeam.length > 0 && <>
          <h2>Care Team</h2>
          <div className="grid2">
            {careTeam.map((d,i)=>(
              <div key={i} className="pr">
                <span className="pr-lbl">{d.name}{d.pcp?" (PCP)":""}</span>
                <span className="pr-val">{d.role}{d.facility?` · ${d.facility}`:""}{d.phone?` · ${d.phone}`:""}</span>
              </div>
            ))}
          </div>
        </>}

        {/* Surgical History */}
        {allSurgeries.length > 0 && <>
          <h2>Surgical &amp; Procedure History</h2>
          {allSurgeries.map((s,i)=>(
            <div key={i} className="pr" style={{alignItems:"flex-start", paddingTop:5, paddingBottom:5}}>
              <span className="pr-lbl" style={{paddingTop:1}}>
                {s.date ? new Date(s.date+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "—"}
              </span>
              <span className="pr-val">
                <strong>{s.procedure}</strong>
                {s.surgeon?<span style={{fontSize:"9pt"}}> · {s.surgeon}</span>:null}
                {s.facility?<span style={{fontSize:"9pt"}}> · {s.facility}</span>:null}
                {s.notes?<span style={{fontSize:"8.5pt",color:"#444",display:"block",marginTop:1}}>{s.notes}</span>:null}
              </span>
            </div>
          ))}
        </>}

        {/* Footer */}
        <div className="footer">
          This document was generated by IntelliTrax Personal Health Dashboard &nbsp;·&nbsp; For medical use only &nbsp;·&nbsp; {new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}
        </div>
      </div>

    </div>
  );
}
