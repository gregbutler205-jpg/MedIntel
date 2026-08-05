import { useState } from "react";
import { PrintLabel } from "../icons.jsx";
import { getDiagnostics, setDiagnostics as persistDiagnostics, getConditions } from "../../store.js";
import { tombstoneRecord } from "../../lib/recordTombstones.js";

// ── Diagnostics tab ────────────────────────────────────────────────────────────
// Observational studies: imaging (MRI/CT/X-ray/US), EKG, EMG, EEG, echo, PFTs,
// sleep studies, … The dividing line with the Procedures tab is intent:
// Procedures is anything done to intervene, biopsy, or treat; Diagnostics is
// anything recorded to observe. Store: mi_diagnostics (migration v3 folded the
// old mi_imaging entries in here).

const BLANK = {
  id: null, name: "", date: "", orderedBy: "", readingProvider: "",
  impression: "", relatedCondition: "", facility: "",
};
function genId() { return Math.random().toString(36).slice(2); }
function fmtDate(iso) {
  if (!iso) return "—";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(iso + "T12:00:00") : new Date(iso);
  return isNaN(d) ? String(iso) : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

// ── Modal ──────────────────────────────────────────────────────────────────────
function StudyModal({ study, conditions, onSave, onClose }) {
  const [form, setForm] = useState({ ...BLANK, ...study });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}>
      <div style={{ background:"#0b1220", border:"1px solid #1a2f4a", borderRadius:16, padding:28, width:540, maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:22, color:"#dde8f5", marginBottom:20 }}>
          {form.id ? "Edit Diagnostic Study" : "Add Diagnostic Study"}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>Study Name *</label>
            <input style={inp} value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. MRI — Liver, EKG, EMG — Left Leg, Echocardiogram" />
          </div>
          <div>
            <label style={lbl}>Date of Study</label>
            <input style={inp} type="date" value={form.date} onChange={e => set("date", e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Facility</label>
            <input style={inp} value={form.facility} onChange={e => set("facility", e.target.value)} placeholder="e.g. Ochsner Medical Center" />
          </div>
          <div>
            <label style={lbl}>Ordered By</label>
            <input style={inp} value={form.orderedBy} onChange={e => set("orderedBy", e.target.value)} placeholder="e.g. Dr. Jane Smith" />
          </div>
          <div>
            <label style={lbl}>Reading Provider</label>
            <input style={inp} value={form.readingProvider} onChange={e => set("readingProvider", e.target.value)} placeholder="e.g. Dr. Alan Reed (Radiology)" />
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>Related Condition</label>
            <select style={inp} value={form.relatedCondition} onChange={e => set("relatedCondition", e.target.value)}>
              <option value="">— None / not linked —</option>
              {conditions.map(c => <option key={c} value={c}>{c}</option>)}
              {/* keep a stored value selectable even if the condition was later renamed/removed */}
              {form.relatedCondition && !conditions.includes(form.relatedCondition) && (
                <option value={form.relatedCondition}>{form.relatedCondition}</option>
              )}
            </select>
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>Impression / Findings</label>
            <textarea style={{ ...inp, height:90, resize:"vertical" }} value={form.impression} onChange={e => set("impression", e.target.value)} placeholder="Reading provider's impression — e.g. No acute findings. Stable post-transplant appearance." />
          </div>
        </div>

        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          <button onClick={() => {
            if (!form.name.trim()) return;
            onSave({ ...form, name: form.name.trim(), id: form.id || genId() });
          }} style={btnPrimary}>
            {form.id ? "Save Changes" : "Add Study"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function DiagnosticsTab() {
  const [studies, setStudies]   = useState(() => getDiagnostics());
  const [modal, setModal]       = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const conditionNames = getConditions().map(c => c.name).filter(Boolean);

  // Imaging-type entries from Medical Records also belong here (observational
  // by definition) — shown read-only; they're owned and edited in Records.
  // Same merge the Health Profile and the printed report use.
  const recordStudies = (() => {
    try {
      return JSON.parse(localStorage.getItem("mi_records") || "[]")
        .filter(r => r.type === "Imaging")
        .map(r => ({ id: `rec-${r.id}`, name: r.title || "Imaging study", date: r.date || "", facility: r.facility || "", fromRecords: true }));
    } catch { return []; }
  })();

  function save(list) {
    setStudies(list);
    persistDiagnostics(list);
  }
  function handleSave(s) {
    const updated = s.id && studies.some(x => x.id === s.id)
      ? studies.map(x => x.id === s.id ? s : x)
      : [...studies, s];
    updated.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    save(updated);
    setModal(null);
  }
  function handleDelete(id) {
    tombstoneRecord("mi_diagnostics", studies.find(x => x.id === id));
    save(studies.filter(x => x.id !== id));
    setDeleteId(null);
  }

  const sorted = [...studies, ...recordStudies].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  const total = sorted.length;

  return (
    <div style={{ display:"flex", flexDirection:"column", flex:1 }}>
      <style>{`
        * { box-sizing:border-box; }
        @media print {
          body * { visibility:hidden; }
          #diagnostics-print, #diagnostics-print * { visibility:visible; }
          #diagnostics-print { position:absolute; top:0; left:0; width:100%; }
          .no-print { display:none !important; }
        }
        .diag-card { background:#0b1220; border:1px solid #111e30; border-radius:12px; padding:18px 20px; margin-bottom:10px; transition:border-color .15s; }
        .diag-card:hover { border-color:#1a2f4a; }
      `}</style>

      <div id="diagnostics-print" style={{ padding:"24px 28px", overflowY:"auto", flex:1 }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:22 }} className="no-print">
          <div>
            <h1 style={{ fontFamily:"'DM Serif Display',serif", fontSize:28, color:"#dde8f5", fontWeight:400, letterSpacing:"-0.5px" }}>Diagnostics</h1>
            <p style={{ fontSize:12, color:"#98afc4", marginTop:4, fontFamily:"'DM Mono',monospace" }}>
              {total} stud{total !== 1 ? "ies" : "y"} on record · imaging, EKG, EMG, and other observational studies
            </p>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => window.print()} style={btnGhost}><PrintLabel /></button>
            <button onClick={() => setModal(BLANK)} style={btnPrimary}>+ Add Study</button>
          </div>
        </div>

        {/* Print header */}
        <div style={{ display:"none" }}>
          <h2 style={{ fontFamily:"'DM Serif Display',serif", fontSize:22, marginBottom:4 }}>Diagnostics</h2>
          <p style={{ fontSize:11, color:"#666", marginBottom:20 }}>Printed {new Date().toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" })}</p>
        </div>

        {/* List */}
        {sorted.length === 0 ? (
          <div style={{ textAlign:"center", padding:"60px 0", color:"#a0b4c8", fontFamily:"'DM Mono',monospace", fontSize:12 }}>
            No diagnostic studies yet — click Add Study to record imaging, EKGs, EMGs, and other observational studies.
          </div>
        ) : (
          sorted.map(s => (
            <div key={s.id} className="diag-card">
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8, flexWrap:"wrap" }}>
                    <span style={{ fontSize:16, fontWeight:600, color:"#c4d8ee" }}>{s.name}</span>
                    {s.relatedCondition && (
                      <span style={{ fontSize:10, color:"#a78bfa", fontFamily:"'DM Mono',monospace", background:"rgba(167,139,250,.1)", border:"1px solid rgba(167,139,250,.3)", borderRadius:10, padding:"2px 8px" }}>
                        {s.relatedCondition}
                      </span>
                    )}
                  </div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:18, fontSize:11, color:"#98afc4", fontFamily:"'DM Mono',monospace", marginBottom:s.impression?8:0 }}>
                    {s.date            && <span>📅 {fmtDate(s.date)}</span>}
                    {s.orderedBy       && <span>Ordered by {s.orderedBy}</span>}
                    {s.readingProvider && <span>Read by {s.readingProvider}</span>}
                    {s.facility        && <span>🏥 {s.facility}</span>}
                  </div>
                  {s.impression && <div style={{ fontSize:12, color:"#7eb8d8", lineHeight:1.55 }}>{s.impression}</div>}
                  {s.migratedFromImaging && !s.impression && (
                    <div style={{ fontSize:10, color:"#4a5c6a", fontFamily:"'DM Mono',monospace", marginTop:4 }}>
                      Migrated from Imaging History — add ordered-by, reading provider, and impression when known.
                    </div>
                  )}
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

      {modal && <StudyModal study={modal} conditions={conditionNames} onSave={handleSave} onClose={() => setModal(null)} />}

      {deleteId && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}>
          <div style={{ background:"#0b1220", border:"1px solid #1a2f4a", borderRadius:14, padding:28, width:380 }}>
            <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:20, color:"#dde8f5", marginBottom:10 }}>Delete Study?</div>
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
