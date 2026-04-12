import { useState, useEffect, useRef } from "react";
import { getStore, setStore, mergeRecords } from "../../store.js";

// ── PDF Lab Extractor ──────────────────────────────────────────────────────────
async function extractTextFromPdf(file) {
  const pdfjsLib = await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.mjs");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.mjs";
  const arrayBuffer = await file.arrayBuffer();
  const pdf  = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(" ") + "\n";
  }
  return text;
}

async function parseLabsWithClaude(pdfText, apiKey) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-opus-4-5",
      max_tokens: 4096,
      messages: [{
        role: "user",
        content: `Extract all lab results from this lab report text. Return ONLY a JSON array of objects with these exact fields:
- name (string, required): test name e.g. "Creatinine"
- value (string, required): numeric result e.g. "1.2"
- unit (string): unit e.g. "mg/dL"
- refRange (string): reference range e.g. "0.7-1.3"
- date (string): collection date in YYYY-MM-DD format if found, otherwise ""
- facility (string): lab facility name if found, otherwise ""
- category (string): one of: Metabolic Panel, CBC, Kidney Function, Liver Function, Immunosuppressant Level, Lipid Panel, Thyroid, Urinalysis, Cardiac, Vitamin / Mineral, Hormone, Other
- flag (boolean): true if result is marked H, L, High, Low, or outside reference range
- notes (string): any relevant note about this specific test, otherwise ""

Return ONLY the JSON array, no markdown, no explanation.

LAB REPORT TEXT:
${pdfText.slice(0, 12000)}`
      }],
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error: ${response.status} — ${err}`);
  }
  const data = await response.json();
  let raw = data.content[0].text.trim();
  raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  return JSON.parse(raw);
}

const CATEGORIES = [
  "Metabolic Panel", "CBC", "Kidney Function", "Liver Function",
  "Immunosuppressant Level", "Lipid Panel", "Thyroid", "Urinalysis",
  "Cardiac", "Vitamin / Mineral", "Hormone", "Other",
];

const EMPTY_FORM = {
  name: "", value: "", unit: "", refRange: "",
  date: "", facility: "", category: "Other", flag: false, notes: "",
};

function getLabs() {
  return getStore("labs") ?? [];
}
function saveLabs(labs) {
  setStore("labs", labs);
}

export default function ImportTab() {
  const [labs, setLabs]       = useState(getLabs);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [editId, setEditId]   = useState(null);
  const [search, setSearch]   = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [toast, setToast]     = useState("");
  const [deleteId, setDeleteId] = useState(null);

  // PDF upload state
  const [pdfStatus, setPdfStatus]   = useState("idle"); // idle | extracting | parsing | done | error
  const [pdfError, setPdfError]     = useState("");
  const [pdfPreview, setPdfPreview] = useState([]); // extracted labs pending save
  const [pdfFileName, setPdfFileName] = useState("");
  const fileInputRef = useRef(null);

  // Reload from storage on mount (handles Clear Data reload)
  useEffect(() => { setLabs(getLabs()); }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2800);
  }

  function handleChange(k, v) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.value.toString().trim() || !form.date) {
      showToast("Test name, value, and date are required.");
      return;
    }
    let updated;
    if (editId !== null) {
      updated = labs.map(l => l.id === editId ? { ...form, id: editId } : l);
      showToast("Lab result updated");
    } else {
      const newEntry = { ...form, id: Date.now(), value: parseFloat(form.value) || form.value };
      updated = [newEntry, ...labs];
      showToast("Lab result saved");
    }
    updated.sort((a, b) => new Date(b.date) - new Date(a.date));
    saveLabs(updated);
    setLabs(updated);
    setForm(EMPTY_FORM);
    setEditId(null);
  }

  function handleEdit(lab) {
    setForm({ ...lab });
    setEditId(lab.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleDelete(id) {
    const updated = labs.filter(l => l.id !== id);
    saveLabs(updated);
    setLabs(updated);
    setDeleteId(null);
    showToast("Lab result deleted");
  }

  function handleCancel() {
    setForm(EMPTY_FORM);
    setEditId(null);
  }

  function handlePrint() {
    window.print();
  }

  async function handlePdfUpload(e) {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    if (file) setPdfFileName(file.name || "Lab Report.pdf");
    if (!file || file.type !== "application/pdf") {
      showToast("Please select a PDF file.");
      return;
    }
    const apiKey = localStorage.getItem("mi_ak");
    if (!apiKey) {
      showToast("API key required. Go to Data & Backup to add your key.");
      return;
    }
    setPdfStatus("extracting");
    setPdfError("");
    setPdfPreview([]);
    try {
      const text = await extractTextFromPdf(file);
      setPdfStatus("parsing");
      const extracted = await parseLabsWithClaude(text, apiKey);
      if (!Array.isArray(extracted) || extracted.length === 0) throw new Error("No lab results found in PDF.");
      setPdfPreview(extracted.map((l, i) => ({ ...l, _previewId: i, id: Date.now() + i })));
      setPdfStatus("done");
      showToast(`Found ${extracted.length} lab result${extracted.length !== 1 ? "s" : ""} — review and confirm below.`);
    } catch (err) {
      setPdfStatus("error");
      setPdfError(err.message || "Failed to extract labs from PDF.");
    }
  }

  function confirmPdfLabs() {
    const newLabs = pdfPreview.map(({ _previewId, ...l }) => l);
    const updated = [...newLabs, ...labs].sort((a, b) => new Date(b.date) - new Date(a.date));
    saveLabs(updated);
    setLabs(updated);

    // Save a reference record to Records tab so it shows in Medical Records
    const labDate = newLabs[0]?.date || new Date().toISOString().split("T")[0];
    const facility = newLabs[0]?.facility || "";
    mergeRecords([{
      id: Date.now(),
      title: pdfFileName ? pdfFileName.replace(/\.pdf$/i, "") : "Lab Report",
      type: "Lab Report",
      date: labDate,
      facility,
      provider: facility,
      summary: `${newLabs.length} lab result${newLabs.length !== 1 ? "s" : ""} imported from PDF. Tests: ${newLabs.slice(0,5).map(l=>l.name).join(", ")}${newLabs.length > 5 ? "…" : "."}`,
    }]);

    setPdfPreview([]);
    setPdfStatus("idle");
    showToast(`${newLabs.length} lab result${newLabs.length !== 1 ? "s" : ""} saved to Labs & Records.`);
  }

  function discardPdfLabs() {
    setPdfPreview([]);
    setPdfStatus("idle");
    setPdfError("");
  }

  const [latestOnly, setLatestOnly] = useState(true);

  const categories = ["All", ...CATEGORIES];
  const baseFiltered = labs.filter(l => {
    const matchCat = catFilter === "All" || l.category === catFilter;
    const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  // Deduplicate to latest per test name when latestOnly is on
  const filtered = latestOnly ? (() => {
    const latest = {};
    baseFiltered.forEach(l => {
      const key = (l.name || "").toLowerCase().trim();
      if (!key) return;
      if (!latest[key] || new Date(l.date || 0) > new Date(latest[key].date || 0)) {
        latest[key] = l;
      }
    });
    return Object.values(latest).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  })() : baseFiltered;

  const inp = (label, key, props = {}) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 10, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", letterSpacing: "1px", textTransform: "uppercase" }}>{label}</label>
      <input
        value={form[key] ?? ""}
        onChange={e => handleChange(key, e.target.value)}
        style={{ background: "#07090f", border: "1px solid #1a2f4a", borderRadius: 8, padding: "8px 12px", color: "#c4d8ee", fontFamily: "'Sora',sans-serif", fontSize: 12, outline: "none", width: "100%" }}
        {...props}
      />
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#07090f", color: "#d4e2f0", fontFamily: "'Sora',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.4} }
        .lab-card { background:#0b1220; border:1px solid #111e30; border-radius:12px; padding:14px 16px; margin-bottom:8px; transition:border-color .15s; animation:fadeUp .3s ease both; }
        .lab-card:hover { border-color:#1a2f4a; }
        .imp-btn { display:inline-flex; align-items:center; gap:6px; padding:8px 16px; border-radius:8px; font-family:'Sora',sans-serif; font-size:12px; font-weight:500; cursor:pointer; transition:all .15s; border:1px solid; }
        .btn-primary { background:rgba(79,142,247,.15); border-color:rgba(79,142,247,.35); color:#7eb8d8; }
        .btn-primary:hover { background:rgba(79,142,247,.25); border-color:rgba(79,142,247,.6); color:#b8d4f0; }
        .btn-ghost  { background:transparent; border-color:#111e30; color:#b0c4d8; }
        .btn-ghost:hover { border-color:#1a2f4a; color:#c4d8ee; }
        .btn-danger { background:rgba(239,68,68,.1); border-color:rgba(239,68,68,.3); color:#ef4444; }
        .btn-danger:hover { background:rgba(239,68,68,.2); }
        .btn-success { background:rgba(16,185,129,.12); border-color:rgba(16,185,129,.3); color:#10b981; }
        select.dark-sel { background:#07090f; border:1px solid #1a2f4a; border-radius:8px; padding:8px 12px; color:#c4d8ee; font-family:'Sora',sans-serif; font-size:12px; outline:none; width:100%; }
        .flag-toggle { display:flex; align-items:center; gap:8px; cursor:pointer; user-select:none; }
        .section-label { font-size:10px; letter-spacing:1.5px; text-transform:uppercase; color:#a0b4c8; font-family:'DM Mono',monospace; margin-bottom:12px; }
        @media print {
          body * { visibility:hidden; }
          #lab-print-area, #lab-print-area * { visibility:visible; }
          #lab-print-area { position:absolute; inset:0; padding:32px; }
        }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", bottom:24, right:24, background:"#0b1220", border:"1px solid #10b981", borderRadius:10, padding:"12px 18px", fontSize:12, color:"#10b981", fontFamily:"'DM Mono',monospace", zIndex:200 }}>
          ✓ {toast}
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId !== null && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.65)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
          <div style={{ background:"#0b1220", border:"1px solid #1a2f4a", borderRadius:14, padding:28, width:400 }}>
            <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:20, color:"#dde8f5", marginBottom:10 }}>Delete Lab Result?</div>
            <div style={{ fontSize:13, color:"#98afc4", marginBottom:22 }}>This cannot be undone.</div>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button className="imp-btn btn-ghost" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="imp-btn btn-danger" onClick={() => handleDelete(deleteId)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ flex:1, overflowY:"auto", padding:"28px 28px" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:26 }}>
          <div>
            <h1 style={{ fontFamily:"'DM Serif Display',serif", fontSize:28, color:"#dde8f5", fontWeight:400, letterSpacing:"-0.5px" }}>
              {editId !== null ? "Edit Lab Result" : "Lab Results"}
            </h1>
            <p style={{ fontSize:12, color:"#98afc4", marginTop:5, fontFamily:"'DM Mono',monospace" }}>
              {labs.length} result{labs.length !== 1 ? "s" : ""} recorded
            </p>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"flex-start", marginTop:4 }}>
            <button className="imp-btn btn-ghost" onClick={handlePrint}>🖨 Print</button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={pdfStatus === "extracting" || pdfStatus === "parsing"}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", background:"rgba(167,139,250,.1)", border:"1px solid rgba(167,139,250,.3)", borderRadius:8, color:"#a78bfa", fontSize:12, fontFamily:"'DM Mono',monospace", cursor:"pointer", whiteSpace:"nowrap" }}
            >
              {pdfStatus === "extracting" ? "⏳ Reading PDF…" : pdfStatus === "parsing" ? "✦ Extracting…" : "⬆ Upload PDF"}
            </button>
            <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handlePdfUpload} style={{ display:"none" }} />
          </div>
        </div>

        {/* PDF error */}
        {pdfStatus === "error" && (
          <div style={{ background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.25)", borderRadius:10, padding:"12px 16px", marginBottom:20, fontSize:12, color:"#f87171", fontFamily:"'DM Mono',monospace" }}>
            ⚠ {pdfError} <button onClick={discardPdfLabs} style={{ marginLeft:12, background:"transparent", border:"none", color:"#f87171", cursor:"pointer", textDecoration:"underline", fontSize:11 }}>Dismiss</button>
          </div>
        )}

        {/* PDF preview — labs to confirm */}
        {pdfPreview.length > 0 && (
          <div style={{ background:"rgba(167,139,250,.05)", border:"1px solid rgba(167,139,250,.2)", borderRadius:12, padding:20, marginBottom:24 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
              <div style={{ fontSize:13, color:"#a78bfa", fontFamily:"'DM Mono',monospace", fontWeight:600 }}>
                ✦ {pdfPreview.length} lab result{pdfPreview.length !== 1 ? "s" : ""} extracted — review then confirm
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={discardPdfLabs} style={{ padding:"6px 14px", background:"transparent", border:"1px solid #1a2f4a", borderRadius:7, color:"#b0c4d8", fontSize:11, fontFamily:"'DM Mono',monospace", cursor:"pointer" }}>Discard</button>
                <button onClick={confirmPdfLabs} style={{ padding:"6px 14px", background:"rgba(16,185,129,.12)", border:"1px solid rgba(16,185,129,.3)", borderRadius:7, color:"#10b981", fontSize:11, fontFamily:"'DM Mono',monospace", cursor:"pointer" }}>✓ Save All</button>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))", gap:10 }}>
              {pdfPreview.map((l, i) => (
                <div key={l._previewId} style={{ background:"#0b1220", border:`1px solid ${l.flag ? "rgba(239,68,68,.3)" : "#111e30"}`, borderRadius:10, padding:"12px 14px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                    <span style={{ fontSize:13, fontWeight:600, color:"#c4d8ee" }}>{l.name}</span>
                    {l.flag && <span style={{ fontSize:9, background:"rgba(239,68,68,.15)", color:"#ef4444", padding:"1px 7px", borderRadius:8, fontFamily:"'DM Mono',monospace" }}>OUT OF RANGE</span>}
                  </div>
                  <div style={{ fontSize:14, fontWeight:700, color: l.flag ? "#f59e0b" : "#10b981" }}>{l.value} <span style={{ fontSize:11, color:"#98afc4", fontWeight:400 }}>{l.unit}</span></div>
                  <div style={{ fontSize:10, color:"#98afc4", fontFamily:"'DM Mono',monospace", marginTop:3 }}>
                    {l.refRange && <span>ref: {l.refRange} · </span>}
                    {l.category}
                  </div>
                  <button onClick={() => setPdfPreview(prev => prev.filter(x => x._previewId !== l._previewId))}
                    style={{ marginTop:8, background:"transparent", border:"1px solid #111e30", borderRadius:5, color:"#6a8090", fontSize:10, padding:"2px 8px", cursor:"pointer", fontFamily:"'DM Mono',monospace" }}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"380px 1fr", gap:20 }}>

          {/* ── Entry Form ── */}
          <div style={{ background:"#0b1220", border:"1px solid #111e30", borderRadius:14, padding:20, height:"fit-content" }}>
            <div className="section-label">{editId !== null ? "Editing Result" : "Add Lab Result"}</div>

            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {inp("Test Name", "name", { placeholder: "e.g. Creatinine" })}

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {inp("Value", "value", { placeholder: "e.g. 1.2", type:"text" })}
                {inp("Unit", "unit", { placeholder: "e.g. mg/dL" })}
              </div>

              {inp("Reference Range", "refRange", { placeholder: "e.g. 0.6–1.2" })}

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {inp("Date", "date", { type:"date" })}
                {inp("Facility / Lab", "facility", { placeholder: "e.g. Quest" })}
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                <label style={{ fontSize:10, color:"#a0b4c8", fontFamily:"'DM Mono',monospace", letterSpacing:"1px", textTransform:"uppercase" }}>Category</label>
                <select
                  className="dark-sel"
                  value={form.category}
                  onChange={e => handleChange("category", e.target.value)}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {inp("Notes", "notes", { placeholder: "Optional notes..." })}

              <label className="flag-toggle">
                <div style={{ width:16, height:16, borderRadius:4, border:`1px solid ${form.flag ? "#ef4444" : "#1a2f4a"}`, background: form.flag ? "rgba(239,68,68,.2)" : "#07090f", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s" }}
                  onClick={() => handleChange("flag", !form.flag)}>
                  {form.flag && <span style={{ color:"#ef4444", fontSize:10 }}>✓</span>}
                </div>
                <span style={{ fontSize:12, color: form.flag ? "#ef4444" : "#98afc4" }}>Flag as out of range</span>
              </label>

              <div style={{ display:"flex", gap:8, marginTop:4 }}>
                <button className="imp-btn btn-primary" style={{ flex:1, justifyContent:"center" }} onClick={handleSubmit}>
                  {editId !== null ? "✓ Save Changes" : "+ Add Result"}
                </button>
                {editId !== null && (
                  <button className="imp-btn btn-ghost" onClick={handleCancel}>Cancel</button>
                )}
              </div>
            </div>
          </div>

          {/* ── Lab List ── */}
          <div id="lab-print-area">
            {/* Filters */}
            <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tests…"
                style={{ background:"#0b1220", border:"1px solid #111e30", borderRadius:8, padding:"7px 12px", color:"#c4d8ee", fontFamily:"'Sora',sans-serif", fontSize:12, outline:"none", flex:1, minWidth:140 }}
              />
              <select className="dark-sel" style={{ width:"auto", minWidth:160 }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button
                onClick={() => setLatestOnly(o => !o)}
                style={{ padding:"7px 14px", background: latestOnly ? "rgba(16,185,129,.15)" : "#0b1220", border: latestOnly ? "1px solid rgba(16,185,129,.4)" : "1px solid #111e30", borderRadius:8, color: latestOnly ? "#10b981" : "#7eb8d8", fontSize:11, fontFamily:"'DM Mono',monospace", cursor:"pointer", whiteSpace:"nowrap" }}>
                {latestOnly ? "✓ Latest Only" : "All History"}
              </button>
            </div>

            {filtered.length === 0 && (
              <div style={{ background:"#0b1220", border:"1px solid #111e30", borderRadius:14, padding:32, textAlign:"center" }}>
                <div style={{ fontSize:24, marginBottom:10, color:"#1a2f4a" }}>◈</div>
                <div style={{ fontSize:14, color:"#a0b4c8", marginBottom:6 }}>No lab results yet</div>
                <div style={{ fontSize:11, color:"#98afc4", fontFamily:"'DM Mono',monospace" }}>Use the form to add your first result</div>
              </div>
            )}

            {filtered.map((lab, i) => (
              <div key={lab.id} className="lab-card" style={{ animationDelay:`${i*40}ms` }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                      {lab.flag && <span style={{ fontSize:9, background:"rgba(239,68,68,.15)", border:"1px solid rgba(239,68,68,.3)", color:"#ef4444", borderRadius:4, padding:"1px 6px", fontFamily:"'DM Mono',monospace" }}>OUT OF RANGE</span>}
                      <span style={{ fontSize:10, color:"#a0b4c8", fontFamily:"'DM Mono',monospace" }}>{lab.category}</span>
                    </div>
                    <div style={{ fontSize:14, fontWeight:600, color:"#dde8f5", marginBottom:2 }}>{lab.name}</div>
                    <div style={{ display:"flex", alignItems:"baseline", gap:6, marginBottom:6 }}>
                      <span style={{ fontSize:22, fontWeight:700, color: lab.flag ? "#ef4444" : "#4f8ef7", letterSpacing:"-0.5px" }}>{lab.value}</span>
                      <span style={{ fontSize:12, color:"#7eb8d8" }}>{lab.unit}</span>
                      {lab.refRange && <span style={{ fontSize:10, color:"#98afc4", fontFamily:"'DM Mono',monospace" }}>ref: {lab.refRange}</span>}
                    </div>
                    <div style={{ fontSize:10, color:"#98afc4", fontFamily:"'DM Mono',monospace", display:"flex", gap:12 }}>
                      <span>{lab.date ? new Date(lab.date + "T12:00:00").toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }) : "—"}</span>
                      {lab.facility && <span>· {lab.facility}</span>}
                    </div>
                    {lab.notes && <div style={{ fontSize:11, color:"#7eb8d8", marginTop:5, fontStyle:"italic" }}>{lab.notes}</div>}
                  </div>
                  <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                    <button className="imp-btn btn-ghost" style={{ padding:"5px 10px", fontSize:11 }} onClick={() => handleEdit(lab)}>Edit</button>
                    <button className="imp-btn btn-danger" style={{ padding:"5px 10px", fontSize:11 }} onClick={() => setDeleteId(lab.id)}>✕</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
