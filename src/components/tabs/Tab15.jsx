import { useState, useEffect, useRef, useCallback } from "react";

const STATUS_CFG = {
  active:   { color: "#ef4444", bg: "rgba(239,68,68,.10)",   border: "rgba(239,68,68,.25)",   label: "Active"   },
  managed:  { color: "#f59e0b", bg: "rgba(245,158,11,.10)",  border: "rgba(245,158,11,.25)",  label: "Managed"  },
  resolved: { color: "#10b981", bg: "rgba(16,185,129,.10)",  border: "rgba(16,185,129,.25)",  label: "Resolved" },
};
const SEVERITY_CFG = {
  mild:     { color: "#10b981" },
  moderate: { color: "#f59e0b" },
  severe:   { color: "#ef4444" },
};
const BLANK = {
  id: null, name: "", icd10: "", diagnosedDate: "", provider: "",
  status: "active", severity: "moderate", notes: "",
};
function genId() { return Math.random().toString(36).slice(2); }
function load() {
  try { const r = localStorage.getItem("mi_conditions"); return r ? JSON.parse(r) : []; }
  catch { return []; }
}
function save(list) {
  localStorage.setItem("mi_conditions", JSON.stringify(list));
  // Sync summary for Dashboard + AI
  const summary = list.filter(c => c.status === "active").map(c => c.name);
  localStorage.setItem("mi_conditions_summary", JSON.stringify(summary));
}
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

// ── ICD-10 Lookup ──────────────────────────────────────────────────────────────
function Icd10Lookup({ value, onChange, inp }) {
  const [query, setQuery]       = useState(value || "");
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [open, setOpen]         = useState(false);
  const timerRef = useRef(null);
  const wrapRef  = useRef(null);

  // Sync if parent clears the value
  useEffect(() => { setQuery(value || ""); }, [value]);

  // Close dropdown when clicking outside
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
        const url = `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&terms=${encodeURIComponent(term)}&maxList=8`;
        const res  = await fetch(url);
        const data = await res.json();
        // data = [total, [codes], null, [[code, name], ...]]
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
    onChange(v);       // keep raw text in sync
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
      <input
        style={inp}
        value={query}
        onChange={handleInput}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Type code or diagnosis name to search…"
      />
      {loading && (
        <div style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", fontSize:10, color:"#6a8090" }}>…</div>
      )}
      {open && results.length > 0 && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, background:"#0b1220", border:"1px solid #1a2f4a", borderRadius:8, zIndex:400, maxHeight:240, overflowY:"auto", boxShadow:"0 8px 24px rgba(0,0,0,.5)" }}>
          {results.map(item => (
            <div
              key={item.code}
              onMouseDown={() => pick(item)}
              style={{ padding:"9px 14px", cursor:"pointer", borderBottom:"1px solid #0d1a28", display:"flex", gap:10, alignItems:"flex-start" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(79,142,247,.07)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
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
function ConditionModal({ condition, onSave, onClose }) {
  const [form, setForm] = useState({ ...BLANK, ...condition });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}>
      <div style={{ background:"#0b1220", border:"1px solid #1a2f4a", borderRadius:16, padding:28, width:520, maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:22, color:"#dde8f5", marginBottom:20 }}>
          {form.id ? "Edit Condition" : "Add Condition"}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
          {/* Name */}
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>Condition Name *</label>
            <input style={inp} value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Chronic Kidney Disease Stage 3" />
          </div>
          {/* ICD-10 */}
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>ICD-10 Code — type code or diagnosis name to search</label>
            <Icd10Lookup value={form.icd10} onChange={v => set("icd10", v)} inp={inp} />
          </div>
          {/* Diagnosed */}
          <div>
            <label style={lbl}>Date Diagnosed</label>
            <input style={inp} type="date" value={form.diagnosedDate} onChange={e => set("diagnosedDate", e.target.value)} />
          </div>
          {/* Provider */}
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>Diagnosing Provider</label>
            <input style={inp} value={form.provider} onChange={e => set("provider", e.target.value)} placeholder="e.g. Dr. Ari Cohen" />
          </div>
          {/* Status */}
          <div>
            <label style={lbl}>Status</label>
            <select style={inp} value={form.status} onChange={e => set("status", e.target.value)}>
              <option value="active">Active</option>
              <option value="managed">Managed</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          {/* Severity */}
          <div>
            <label style={lbl}>Severity</label>
            <select style={inp} value={form.severity} onChange={e => set("severity", e.target.value)}>
              <option value="mild">Mild</option>
              <option value="moderate">Moderate</option>
              <option value="severe">Severe</option>
            </select>
          </div>
          {/* Notes */}
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>Notes</label>
            <textarea style={{ ...inp, height:80, resize:"vertical" }} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Additional details, treatment context, etc." />
          </div>
        </div>

        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          <button onClick={() => { if (!form.name) return; onSave({ ...form, id: form.id || genId() }); }} style={btnPrimary}>
            {form.id ? "Save Changes" : "Add Condition"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ConditionsTab() {
  const [conditions, setConditions] = useState(load);
  const [filter, setFilter]         = useState("all");
  const [modal, setModal]           = useState(null);   // null | condition obj
  const [deleteId, setDeleteId]     = useState(null);

  function handleSave(c) {
    const updated = c.id && conditions.some(x => x.id === c.id)
      ? conditions.map(x => x.id === c.id ? c : x)
      : [...conditions, c];
    setConditions(updated);
    save(updated);
    setModal(null);
  }
  function handleDelete(id) {
    const updated = conditions.filter(x => x.id !== id);
    setConditions(updated);
    save(updated);
    setDeleteId(null);
  }

  const SEVERITY_ORDER = { severe: 0, moderate: 1, mild: 2 };
  const STATUS_ORDER   = { active: 0, managed: 1, resolved: 2 };
  const sortConditions = (list) => [...list].sort((a, b) => {
    const statusDiff = (STATUS_ORDER[a.status] ?? 1) - (STATUS_ORDER[b.status] ?? 1);
    if (statusDiff !== 0) return statusDiff;
    return (SEVERITY_ORDER[a.severity] ?? 1) - (SEVERITY_ORDER[b.severity] ?? 1);
  });
  const filtered = sortConditions(filter === "all" ? conditions : conditions.filter(c => c.status === filter));
  const activeCt  = conditions.filter(c => c.status === "active").length;
  const managedCt = conditions.filter(c => c.status === "managed").length;
  const resolvedCt= conditions.filter(c => c.status === "resolved").length;

  return (
    <div style={{ display:"flex", flexDirection:"column", flex:1 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing:border-box; }
        @media print {
          body * { visibility:hidden; }
          #conditions-print, #conditions-print * { visibility:visible; }
          #conditions-print { position:absolute; top:0; left:0; width:100%; }
          .no-print { display:none !important; }
        }
        .cond-card { background:#0b1220; border:1px solid #111e30; border-radius:12px; padding:16px 18px; margin-bottom:10px; transition:border-color .15s; }
        .cond-card:hover { border-color:#1a2f4a; }
        .filter-btn { padding:6px 14px; border-radius:20px; border:1px solid #111e30; background:transparent; color:#b0c4d8; font-family:'DM Mono',monospace; font-size:11px; cursor:pointer; transition:all .15s; }
        .filter-btn.active { background:rgba(79,142,247,.15); border-color:rgba(79,142,247,.4); color:#4f8ef7; }
      `}</style>

      <div id="conditions-print" style={{ padding:"24px 28px", overflowY:"auto", flex:1 }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:22 }} className="no-print">
          <div>
            <h1 style={{ fontFamily:"'DM Serif Display',serif", fontSize:28, color:"#dde8f5", fontWeight:400, letterSpacing:"-0.5px" }}>Conditions</h1>
            <p style={{ fontSize:12, color:"#98afc4", marginTop:4, fontFamily:"'DM Mono',monospace" }}>
              {activeCt} active · {managedCt} managed · {resolvedCt} resolved
            </p>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => window.print()} style={btnGhost}>⎙ Print</button>
            <button onClick={() => setModal(BLANK)} style={btnPrimary}>+ Add Condition</button>
          </div>
        </div>

        {/* Print header (only visible when printing) */}
        <div style={{ display:"none" }} className="print-only">
          <h2 style={{ fontFamily:"'DM Serif Display',serif", fontSize:22, marginBottom:4 }}>Medical Conditions</h2>
          <p style={{ fontSize:11, color:"#666", marginBottom:20 }}>Printed {new Date().toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" })}</p>
        </div>

        {/* Summary stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:22 }}>
          {[
            { label:"Active",   count:activeCt,   ...STATUS_CFG.active   },
            { label:"Managed",  count:managedCt,  ...STATUS_CFG.managed  },
            { label:"Resolved", count:resolvedCt, ...STATUS_CFG.resolved },
          ].map(s => (
            <div key={s.label} style={{ background:"#0b1220", border:"1px solid #111e30", borderRadius:10, padding:"14px 16px" }}>
              <div style={{ fontSize:22, fontWeight:700, color:s.color, letterSpacing:"-0.5px" }}>{s.count}</div>
              <div style={{ fontSize:11, color:"#98afc4", fontFamily:"'DM Mono',monospace", marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display:"flex", gap:8, marginBottom:18 }} className="no-print">
          {["all","active","managed","resolved"].map(f => (
            <button key={f} className={`filter-btn${filter===f?" active":""}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:"48px 0", color:"#a0b4c8", fontFamily:"'DM Mono',monospace", fontSize:12 }}>
            {conditions.length === 0 ? "No conditions added yet — click Add Condition to get started." : `No ${filter} conditions.`}
          </div>
        ) : (
          filtered.map(c => {
            const s = STATUS_CFG[c.status] ?? STATUS_CFG.active;
            const sev = SEVERITY_CFG[c.severity] ?? SEVERITY_CFG.moderate;
            return (
              <div key={c.id} className="cond-card">
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                      <span style={{ fontSize:15, fontWeight:600, color:"#c4d8ee" }}>{c.name}</span>
                      {c.icd10 && <span style={{ fontSize:10, color:"#a0b4c8", fontFamily:"'DM Mono',monospace", background:"#07090f", border:"1px solid #111e30", borderRadius:4, padding:"1px 6px" }}>{c.icd10}</span>}
                      <span style={{ fontSize:10, background:s.bg, border:`1px solid ${s.border}`, borderRadius:12, padding:"2px 8px", color:s.color, fontFamily:"'DM Mono',monospace" }}>{s.label}</span>
                      <span style={{ fontSize:10, color:sev.color, fontFamily:"'DM Mono',monospace" }}>▪ {c.severity.charAt(0).toUpperCase()+c.severity.slice(1)}</span>
                    </div>
                    <div style={{ display:"flex", gap:20, fontSize:11, color:"#98afc4", fontFamily:"'DM Mono',monospace", marginBottom:c.notes?8:0 }}>
                      {c.diagnosedDate && <span>Dx: {fmtDate(c.diagnosedDate)}</span>}
                      {c.provider && <span>Provider: {c.provider}</span>}
                    </div>
                    {c.notes && <div style={{ fontSize:12, color:"#7eb8d8", marginTop:4, lineHeight:1.55 }}>{c.notes}</div>}
                  </div>
                  <div style={{ display:"flex", gap:8, flexShrink:0, marginLeft:16 }} className="no-print">
                    <button onClick={() => setModal(c)} style={{ ...btnGhost, padding:"5px 12px", fontSize:11 }}>Edit</button>
                    <button onClick={() => setDeleteId(c.id)} style={{ padding:"5px 12px", background:"transparent", border:"1px solid rgba(239,68,68,.3)", borderRadius:7, color:"#ef4444", fontSize:11, cursor:"pointer", fontFamily:"'DM Mono',monospace" }}>Delete</button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add/Edit modal */}
      {modal && <ConditionModal condition={modal} onSave={handleSave} onClose={() => setModal(null)} />}

      {/* Delete confirm */}
      {deleteId && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}>
          <div style={{ background:"#0b1220", border:"1px solid #1a2f4a", borderRadius:14, padding:28, width:380 }}>
            <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:20, color:"#dde8f5", marginBottom:10 }}>Delete Condition?</div>
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

// ── Shared styles ──────────────────────────────────────────────────────────────
const lbl = { display:"block", fontSize:10, color:"#a0b4c8", fontFamily:"'DM Mono',monospace", letterSpacing:"1px", textTransform:"uppercase", marginBottom:5 };
const inp = { width:"100%", background:"#07090f", border:"1px solid #111e30", borderRadius:8, padding:"8px 10px", color:"#a8c4dc", fontFamily:"'DM Mono',monospace", fontSize:12, outline:"none" };
const btnPrimary = { padding:"8px 16px", background:"rgba(79,142,247,.15)", border:"1px solid rgba(79,142,247,.35)", borderRadius:8, color:"#4f8ef7", fontFamily:"'Sora',sans-serif", fontSize:12, cursor:"pointer" };
const btnGhost   = { padding:"8px 16px", background:"transparent", border:"1px solid #111e30", borderRadius:8, color:"#b0c4d8", fontFamily:"'Sora',sans-serif", fontSize:12, cursor:"pointer" };
