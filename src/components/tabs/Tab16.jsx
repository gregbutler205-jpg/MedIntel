import { useState, useEffect, useRef } from "react";
import { PrintLabel } from "../icons.jsx";
import CPT_COMMON from "../../data/cpt_common.json";
import { tombstoneRecord } from "../../lib/recordTombstones.js";

const ANESTHESIA = ["General", "Regional", "Local", "Spinal", "Epidural", "Sedation", "None / N/A"];
const OUTCOMES   = ["Successful", "Successful with complications", "Incomplete", "Cancelled", "Unknown"];

const BLANK = {
  id: null, procedure: "", cpt: "", icd10: "", date: "", surgeon: "", facility: "",
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
  // UI-24: always render the full date INCLUDING year, and tolerate legacy
  // non-ISO strings ("Apr 22, 2019") — the old ISO-only parse produced
  // "Invalid Date" for those. Unparseable values fall back to the raw string
  // rather than an invented date.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(iso + "T12:00:00") : new Date(iso);
  return isNaN(d) ? String(iso) : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
function outcomeColor(o) {
  if (o === "Successful") return "#10b981";
  if (o === "Successful with complications") return "#f59e0b";
  if (o === "Cancelled") return "#6b7a8d";
  return "#ef4444";
}

// ── CPT Lookup (WO-2) ─────────────────────────────────────────────────────────
// Surgeries are procedures, coded with CPT, not ICD-10. Local bundled subset
// (~150 common procedures, lay descriptions) — no network call; the previous
// NIH ICD-10 API lookup is removed. Debounced 250ms type-ahead matching BOTH
// code prefix and description substring; code-prefix matches rank first.
export const CPT_RE = /^\d{4}[0-9A-Z]$/;

function searchCpt(term) {
  const t = term.trim().toLowerCase();
  if (t.length < 2) return [];
  const codeHits = [];
  const descHits = [];
  for (const item of CPT_COMMON) {
    if (item.code.startsWith(t.toUpperCase()) || item.code.toLowerCase().startsWith(t)) codeHits.push(item);
    else if (item.desc.toLowerCase().includes(t)) descHits.push(item);
  }
  return [...codeHits, ...descHits].slice(0, 8);
}

function CptLookup({ value, onChange, onPick, inp }) {
  const [query, setQuery]     = useState(value || "");
  const [results, setResults] = useState([]);
  const [open, setOpen]       = useState(false);
  const timerRef = useRef(null);
  const wrapRef  = useRef(null);

  useEffect(() => { setQuery(value || ""); }, [value]);
  useEffect(() => {
    function handler(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleInput(e) {
    const v = e.target.value.toUpperCase(); // uppercase-normalize on entry
    setQuery(v);
    onChange(v);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const items = searchCpt(v);
      setResults(items);
      setOpen(items.length > 0);
    }, 250);
  }

  function pick(item) {
    setQuery(item.code);
    onPick(item); // fills both code and procedure name
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} style={{ position:"relative" }}>
      <input style={inp} value={query} onChange={handleInput} onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Type a code or procedure name to search…" maxLength={40} />
      {open && results.length > 0 && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, background:"#0b1220", border:"1px solid #1a2f4a", borderRadius:8, zIndex:400, maxHeight:240, overflowY:"auto", boxShadow:"0 8px 24px rgba(0,0,0,.5)" }}>
          {results.map(item => (
            <div key={item.code} onMouseDown={() => pick(item)}
              style={{ padding:"9px 14px", cursor:"pointer", borderBottom:"1px solid #0d1a28", display:"flex", gap:10, alignItems:"flex-start" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(79,142,247,.07)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <span style={{ fontSize:11, fontFamily:"'DM Mono',monospace", color:"#4f8ef7", flexShrink:0, minWidth:52 }}>{item.code}</span>
              <span style={{ fontSize:12, color:"#c4d8ee", lineHeight:1.4 }}>{item.desc}</span>
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
  const [cptError, setCptError] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}>
      <div style={{ background:"#0b1220", border:"1px solid #1a2f4a", borderRadius:16, padding:28, width:540, maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:22, color:"#dde8f5", marginBottom:20 }}>
          {form.id ? "Edit Procedure" : "Add Procedure"}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
          {/* Procedure */}
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>Procedure Name *</label>
            <input style={inp} value={form.procedure} onChange={e => set("procedure", e.target.value)} placeholder="e.g. Kidney Transplant (Living Donor)" />
          </div>
          {/* WO-2: CPT (procedures are CPT-coded; optional — uncoded allowed) */}
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>CPT Code</label>
            <CptLookup
              value={form.cpt || ""}
              onChange={v => { set("cpt", v); setCptError(""); }}
              onPick={item => { set("cpt", item.code); set("procedure", form.procedure || item.desc); setCptError(""); }}
              inp={inp}
            />
            {cptError && <div style={{ fontSize:11, color:"#ef4444", marginTop:5 }}>{cptError}</div>}
            {form.icd10 && !form.cpt && (
              <div style={{ fontSize:11, color:"#98afc4", marginTop:6, fontFamily:"'DM Mono',monospace" }}>
                Legacy ICD-10 on this entry: {form.icd10}
              </div>
            )}
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
          <button onClick={() => {
            if (!form.procedure) return;
            const cpt = (form.cpt || "").trim().toUpperCase();
            if (cpt && !CPT_RE.test(cpt)) { setCptError("CPT codes are 5 characters: four digits then a digit or letter (e.g. 47135). Leave blank to save uncoded."); return; }
            onSave({ ...form, cpt, id: form.id || genId() });
          }} style={btnPrimary}>
            {form.id ? "Save Changes" : "Add Procedure"}
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

  // Procedure-type entries from Medical Records belong here too (things done to
  // intervene/biopsy/treat) — shown read-only; owned and edited in Records.
  // Same merge the Health Profile and the printed report use.
  const recordProcedures = (() => {
    try {
      return JSON.parse(localStorage.getItem("mi_records") || "[]")
        .filter(r => r.type === "Procedure")
        .map(r => ({ id: `rec-${r.id}`, procedure: r.title || "Procedure", date: r.date || "", facility: r.facility || "", fromRecords: true }));
    } catch { return []; }
  })();
  const allProcedures = [...surgeries, ...recordProcedures];

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
    tombstoneRecord("mi_surgeries", surgeries.find(x => x.id === id));
    const updated = surgeries.filter(x => x.id !== id);
    setSurgeries(updated);
    saveSurgeries(updated);
    setDeleteId(null);
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", flex:1 }}>
      <style>{`
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
            <h1 style={{ fontFamily:"'DM Serif Display',serif", fontSize:28, color:"#dde8f5", fontWeight:400, letterSpacing:"-0.5px" }}>Procedures</h1>
            <p style={{ fontSize:12, color:"#98afc4", marginTop:4, fontFamily:"'DM Mono',monospace" }}>
              {allProcedures.length} procedure{allProcedures.length !== 1 ? "s" : ""} on record · sorted most recent first
            </p>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => window.print()} style={btnGhost}><PrintLabel /></button>
            <button onClick={() => setModal(BLANK)} style={btnPrimary}>+ Add Procedure</button>
          </div>
        </div>

        {/* Print header */}
        <div style={{ display:"none" }}>
          <h2 style={{ fontFamily:"'DM Serif Display',serif", fontSize:22, marginBottom:4 }}>Procedure History</h2>
          <p style={{ fontSize:11, color:"#666", marginBottom:20 }}>Printed {new Date().toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" })}</p>
        </div>

        {/* List */}
        {allProcedures.length === 0 ? (
          <div style={{ textAlign:"center", padding:"60px 0", color:"#a0b4c8", fontFamily:"'DM Mono',monospace", fontSize:12 }}>
            No procedures added yet — click Add Procedure to get started.
          </div>
        ) : (
          // UI-24: reverse-chronological at render time too — restored/legacy
          // data isn't guaranteed to arrive pre-sorted.
          [...allProcedures].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).map((s, i) => (
            <div key={s.id} className="surg-card">
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
                <div style={{ flex:1 }}>
                  {/* Top row */}
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                    <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#a0b4c8", background:"#07090f", border:"1px solid #111e30", borderRadius:20, padding:"2px 10px" }}>#{allProcedures.length - i}</span>
                    <span style={{ fontSize:16, fontWeight:600, color:"#c4d8ee" }}>{s.procedure}</span>
                    {s.outcome && (
                      <span style={{ fontSize:10, color:outcomeColor(s.outcome), fontFamily:"'DM Mono',monospace", background:"rgba(0,0,0,.3)", borderRadius:10, padding:"2px 8px" }}>
                        {s.outcome}
                      </span>
                    )}
                  </div>
                  {/* Details row */}
                  <div style={{ display:"flex", flexWrap:"wrap", gap:18, fontSize:11, color:"#98afc4", fontFamily:"'DM Mono',monospace", marginBottom:s.notes?8:0 }}>
                    {/* WO-2: CPT going forward; legacy entries keep their stored code labeled ICD-10 */}
                    {s.cpt      && <span style={{ color:"#7eb8d8" }}>CPT {s.cpt}</span>}
                    {!s.cpt && s.icd10 && <span>ICD-10 {s.icd10}</span>}
                    {s.date     && <span>📅 {fmtDate(s.date)}</span>}
                    {s.surgeon  && <span>👨‍⚕️ {s.surgeon}</span>}
                    {s.facility && <span>🏥 {s.facility}</span>}
                    {s.anesthesia && <span>💉 {s.anesthesia}</span>}
                    {s.duration && <span>⏱ {s.duration}</span>}
                  </div>
                  {s.notes && <div style={{ fontSize:12, color:"#7eb8d8", lineHeight:1.55 }}>{s.notes}</div>}
                </div>
                <div style={{ display:"flex", gap:8, flexShrink:0, marginLeft:16, alignItems:"center" }} className="no-print">
                  {s.fromRecords
                    ? <span style={{ fontSize:10, color:"#4a5c6a", fontFamily:"'DM Mono',monospace" }}>from Medical Records ↗</span>
                    : <>
                        <button onClick={() => setModal(s)} style={{ ...btnGhost, padding:"5px 12px", fontSize:11 }}>Edit</button>
                        <button onClick={() => setDeleteId(s.id)} style={{ padding:"5px 12px", background:"transparent", border:"1px solid rgba(239,68,68,.3)", borderRadius:7, color:"#ef4444", fontSize:11, cursor:"pointer", fontFamily:"'DM Mono',monospace" }}>Delete</button>
                      </>}
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
            <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:20, color:"#dde8f5", marginBottom:10 }}>Delete Procedure?</div>
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
