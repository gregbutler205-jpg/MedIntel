import { useState, useEffect, useRef, useCallback } from "react";

const ANESTHESIA = ["General", "Regional", "Local", "Spinal", "Epidural", "Sedation", "None / N/A"];
const OUTCOMES   = ["Successful", "Successful with complications", "Incomplete", "Cancelled", "Unknown"];

const BLANK = {
  id: null, procedure: "", icd10: "", date: "", surgeon: "", facility: "",
  anesthesia: "General", outcome: "Successful", duration: "", notes: "",
};
function genId() { return Math.random().toString(36).slice(2); }
function load() {
  try { const r = localStorage.getItem("mi_surgeries"); return r ? JSON.parse(r) : []; }
  catch { return []; }
}
function saveSurgeries(list) {
  localStorage.setItem("mi_surgeries", JSON.stringify(list));
}
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
function outcomeColor(o) {
  if (o === "Successful") return "#10b981";
  if (o === "Successful with complications") return "#f59e0b";
  if (o === "Cancelled") return "#6b7a8d";
  return "#ef4444";
}

// ── ICD-10 Lookup (shared pattern) ─────────────────────────────────────────────
function Icd10Lookup({ value, onChange, inp }) {
  const [query, setQuery]     = useState(value || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]       = useState(false);
  const timerRef = useRef(null);
  const wrapRef  = useRef(null);

  useEffect(() => { setQuery(value || ""); }, [value]);
  useEffect(() => {
    function handler(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback((term) => {
    if (!term || term.length < 2) { setResults([]); setOpen(false); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res  = await fetch(`https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&terms=${encodeURIComponent(term)}&maxList=8`);
        const data = await res.json();
        const items = (data[3] || []).map(([code, name]) => ({ code, name }));
        setResults(items);
        setOpen(items.length > 0);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
  }, []);

  function handleInput(e) {
    const v = e.target.value;
    setQuery(v);
    onChange(v);
    search(v);
  }

  function pick(item) {
    const combined = `${item.code} — ${item.name}`;
    setQuery(combined);
    onChange(combined);
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} style={{ position:"relative" }}>
      <input style={inp} value={query} onChange={handleInput} onFocus={() => results.length > 0 && setOpen(true)} placeholder="Type code or procedure name to search…" />
      {loading && <div style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", fontSize:10, color:"#6a8090" }}>…</div>}
      {open && results.length > 0 && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, background:"#0b1220", border:"1px solid #1a2f4a", borderRadius:8, zIndex:400, maxHeight:240, overflowY:"auto", boxShadow:"0 8px 24px rgba(0,0,0,.5)" }}>
          {results.map(item => (
            <div key={item.code} onMouseDown={() => pick(item)}
              style={{ padding:"9px 14px", cursor:"pointer", borderBottom:"1px solid #0d1a28", display:"flex", gap:10, alignItems:"flex-start" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(79,142,247,.07)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <span style={{ fontSize:11, fontFamily:"'DM Mono',monospace", color:"#4f8ef7", flexShrink:0, minWidth:52 }}>{item.code}</span>
              <span style={{ fontSize:12, color:"#c4d8ee", lineHeight:1.4 }}>{item.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────────
function SurgeryModal({ surgery, onSave, onClose }) {
  const [form, setForm] = useState({ ...BLANK, ...surgery });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}>
      <div style={{ background:"#0b1220", border:"1px solid #1a2f4a", borderRadius:16, padding:28, width:540, maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:22, color:"#dde8f5", marginBottom:20 }}>
          {form.id ? "Edit Surgery / Procedure" : "Add Surgery / Procedure"}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
          {/* Procedure */}
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>Procedure Name *</label>
            <input style={inp} value={form.procedure} onChange={e => set("procedure", e.target.value)} placeholder="e.g. Kidney Transplant (Living Donor)" />
          </div>
          {/* ICD-10 */}
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>ICD-10 Code — type code or procedure/diagnosis to search</label>
            <Icd10Lookup value={form.icd10 || ""} onChange={v => set("icd10", v)} inp={inp} />
          </div>
          {/* Date */}
          <div>
            <label style={lbl}>Date of Procedure</label>
            <input style={inp} type="date" value={form.date} onChange={e => set("date", e.target.value)} />
          </div>
          {/* Duration */}
          <div>
            <label style={lbl}>Duration</label>
            <input style={inp} value={form.duration} onChange={e => set("duration", e.target.value)} placeholder="e.g. 4 hrs 30 min" />
          </div>
          {/* Surgeon */}
          <div>
            <label style={lbl}>Surgeon</label>
            <input style={inp} value={form.surgeon} onChange={e => set("surgeon", e.target.value)} placeholder="e.g. Dr. Jane Smith" />
          </div>
          {/* Facility */}
          <div>
            <label style={lbl}>Facility / Hospital</label>
            <input style={inp} value={form.facility} onChange={e => set("facility", e.target.value)} placeholder="e.g. Ochsner Medical Center" />
          </div>
          {/* Anesthesia */}
          <div>
            <label style={lbl}>Anesthesia Type</label>
            <select style={inp} value={form.anesthesia} onChange={e => set("anesthesia", e.target.value)}>
              {ANESTHESIA.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          {/* Outcome */}
          <div>
            <label style={lbl}>Outcome</label>
            <select style={inp} value={form.outcome} onChange={e => set("outcome", e.target.value)}>
              {OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          {/* Notes */}
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>Notes / Post-op Details</label>
            <textarea style={{ ...inp, height:80, resize:"vertical" }} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Recovery notes, complications, follow-up instructions, etc." />
          </div>
        </div>

        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          <button onClick={() => { if (!form.procedure) return; onSave({ ...form, id: form.id || genId() }); }} style={btnPrimary}>
            {form.id ? "Save Changes" : "Add Surgery"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function SurgeriesTab() {
  const [surgeries, setSurgeries] = useState(load);
  const [modal, setModal]         = useState(null);
  const [deleteId, setDeleteId]   = useState(null);

  function handleSave(s) {
    const updated = s.id && surgeries.some(x => x.id === s.id)
      ? surgeries.map(x => x.id === s.id ? s : x)
      : [...surgeries, s];
    // Keep sorted by date descending
    updated.sort((a, b) => new Date(b.date) - new Date(a.date));
    setSurgeries(updated);
    saveSurgeries(updated);
    setModal(null);
  }
  function handleDelete(id) {
    const updated = surgeries.filter(x => x.id !== id);
    setSurgeries(updated);
    saveSurgeries(updated);
    setDeleteId(null);
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", flex:1 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing:border-box; }
        @media print {
          body * { visibility:hidden; }
          #surgeries-print, #surgeries-print * { visibility:visible; }
          #surgeries-print { position:absolute; top:0; left:0; width:100%; }
          .no-print { display:none !important; }
        }
        .surg-card { background:#0b1220; border:1px solid #111e30; border-radius:12px; padding:18px 20px; margin-bottom:10px; transition:border-color .15s; }
        .surg-card:hover { border-color:#1a2f4a; }
      `}</style>

      <div id="surgeries-print" style={{ padding:"24px 28px", overflowY:"auto", flex:1 }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:22 }} className="no-print">
          <div>
            <h1 style={{ fontFamily:"'DM Serif Display',serif", fontSize:28, color:"#dde8f5", fontWeight:400, letterSpacing:"-0.5px" }}>Surgeries & Procedures</h1>
            <p style={{ fontSize:12, color:"#98afc4", marginTop:4, fontFamily:"'DM Mono',monospace" }}>
              {surgeries.length} procedure{surgeries.length !== 1 ? "s" : ""} on record · sorted most recent first
            </p>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => window.print()} style={btnGhost}>⎙ Print</button>
            <button onClick={() => setModal(BLANK)} style={btnPrimary}>+ Add Surgery</button>
          </div>
        </div>

        {/* Print header */}
        <div style={{ display:"none" }}>
          <h2 style={{ fontFamily:"'DM Serif Display',serif", fontSize:22, marginBottom:4 }}>Surgical History</h2>
          <p style={{ fontSize:11, color:"#666", marginBottom:20 }}>Printed {new Date().toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" })}</p>
        </div>

        {/* List */}
        {surgeries.length === 0 ? (
          <div style={{ textAlign:"center", padding:"60px 0", color:"#a0b4c8", fontFamily:"'DM Mono',monospace", fontSize:12 }}>
            No surgeries or procedures added yet — click Add Surgery to get started.
          </div>
        ) : (
          surgeries.map((s, i) => (
            <div key={s.id} className="surg-card">
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
                <div style={{ flex:1 }}>
                  {/* Top row */}
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                    <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#a0b4c8", background:"#07090f", border:"1px solid #111e30", borderRadius:20, padding:"2px 10px" }}>#{surgeries.length - i}</span>
                    <span style={{ fontSize:16, fontWeight:600, color:"#c4d8ee" }}>{s.procedure}</span>
                    <span style={{ fontSize:10, color:outcomeColor(s.outcome), fontFamily:"'DM Mono',monospace", background:"rgba(0,0,0,.3)", borderRadius:10, padding:"2px 8px" }}>
                      {s.outcome}
                    </span>
                  </div>
                  {/* Details row */}
                  <div style={{ display:"flex", flexWrap:"wrap", gap:18, fontSize:11, color:"#98afc4", fontFamily:"'DM Mono',monospace", marginBottom:s.notes?8:0 }}>
                    {s.date     && <span>📅 {fmtDate(s.date)}</span>}
                    {s.surgeon  && <span>👨‍⚕️ {s.surgeon}</span>}
                    {s.facility && <span>🏥 {s.facility}</span>}
                    {s.anesthesia && <span>💉 {s.anesthesia}</span>}
                    {s.duration && <span>⏱ {s.duration}</span>}
                  </div>
                  {s.notes && <div style={{ fontSize:12, color:"#7eb8d8", lineHeight:1.55 }}>{s.notes}</div>}
                </div>
                <div style={{ display:"flex", gap:8, flexShrink:0, marginLeft:16 }} className="no-print">
                  <button onClick={() => setModal(s)} style={{ ...btnGhost, padding:"5px 12px", fontSize:11 }}>Edit</button>
                  <button onClick={() => setDeleteId(s.id)} style={{ padding:"5px 12px", background:"transparent", border:"1px solid rgba(239,68,68,.3)", borderRadius:7, color:"#ef4444", fontSize:11, cursor:"pointer", fontFamily:"'DM Mono',monospace" }}>Delete</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {modal && <SurgeryModal surgery={modal} onSave={handleSave} onClose={() => setModal(null)} />}

      {deleteId && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}>
          <div style={{ background:"#0b1220", border:"1px solid #1a2f4a", borderRadius:14, padding:28, width:380 }}>
            <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:20, color:"#dde8f5", marginBottom:10 }}>Delete Surgery?</div>
            <div style={{ fontSize:13, color:"#98afc4", marginBottom:22 }}>This cannot be undone.</div>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button onClick={() => setDeleteId(null)} style={btnGhost}>Cancel</button>
              <button onClick={() => handleDelete(deleteId)} style={{ ...btnPrimary, background:"rgba(239,68,68,.15)", borderColor:"rgba(239,68,68,.35)", color:"#ef4444" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const lbl = { display:"block", fontSize:10, color:"#a0b4c8", fontFamily:"'DM Mono',monospace", letterSpacing:"1px", textTransform:"uppercase", marginBottom:5 };
const inp = { width:"100%", background:"#07090f", border:"1px solid #111e30", borderRadius:8, padding:"8px 10px", color:"#a8c4dc", fontFamily:"'DM Mono',monospace", fontSize:12, outline:"none" };
const btnPrimary = { padding:"8px 16px", background:"rgba(79,142,247,.15)", border:"1px solid rgba(79,142,247,.35)", borderRadius:8, color:"#4f8ef7", fontFamily:"'Sora',sans-serif", fontSize:12, cursor:"pointer" };
const btnGhost   = { padding:"8px 16px", background:"transparent", border:"1px solid #111e30", borderRadius:8, color:"#b0c4d8", fontFamily:"'Sora',sans-serif", fontSize:12, cursor:"pointer" };
