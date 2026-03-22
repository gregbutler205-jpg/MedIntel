import INTELLITRAX_LOGO from "../../assets/logo.png";
import { useState, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { getPendingMeds, setPendingMeds } from "../../store.js";
// Use CDN worker — avoids Vite/GitHub Pages path resolution issues
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

// Extract all text from a PDF File object
async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(" ") + "\n";
  }
  return text;
}

// Call Claude API to parse health data from PDF text
async function parseWithClaude(text, apiKey) {
  const prompt = `You are a medical record parser. Extract structured health data from the following medical record text and return ONLY valid JSON with no markdown, no explanation.

Return this exact structure (omit arrays that have no data):
{
  "readings": [{"date":"Mar 10","ts":"2026-03-10","bp_s":131,"bp_d":71,"weight":184.2}],
  "meds": [{"name":"Tacrolimus 3 mg","refillDate":"Apr 5","status":"ok","flag":false}],
  "labs": [{"date":"2026-03-10","name":"Creatinine","value":1.2,"unit":"mg/dL","refRange":"0.6-1.2","flag":false}],
  "upcoming": [{"label":"Nephrology Follow-up","date":"Apr 15","urgency":"med","doctor":"Ari Cohen MD"}],
  "alerts": [{"type":"warn","text":"Creatinine elevated above range","time":"Mar 10"}],
  "source": "Ochsner Health",
  "totalRecords": 12
}

Rules:
- ts must be ISO date string YYYY-MM-DD
- date must be human-readable like "Mar 10" or "Mar 10, 2026"
- bp_s and bp_d are integers (systolic/diastolic)
- weight is a float in lbs
- med status is "ok", "refill", or "warn"
- flag is true if a value is outside normal range or clinically significant
- urgency is "high", "med", or "low"
- alert type is "warn", "info", or "ok"
- Only include data you find in the text — do not invent data
- For medications, extract refill dates only if explicitly stated; otherwise omit refillDate

Medical record text:
${text.slice(0, 12000)}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-opus-4-5",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message ?? `API error ${res.status}`);
  }
  const data = await res.json();
  let raw = data.content?.[0]?.text ?? "{}";
  // Strip markdown code fences if Claude wraps JSON in them
  raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  return JSON.parse(raw);
}

const SOURCES = [
  {
    id: "ochsner",
    name: "Ochsner Health",
    subtitle: "Jeff Hwy Transplant · Endocrinology · Orthopedics",
    system: "Epic MyChart",
    status: "connected",
    lastSync: "Mar 19, 2026 · 9:14 AM",
    recordCount: "2,847",
    color: "#4f8ef7",
  },
  {
    id: "hattiesburg",
    name: "Hattiesburg Clinic / FGH",
    subtitle: "Urology · Orthopedic Surgery · Lab & Pathology",
    system: "Epic MyChart",
    status: "connected",
    lastSync: "Mar 19, 2026 · 9:14 AM",
    recordCount: "104",
    color: "#a78bfa",
  },
  {
    id: "scrmc",
    name: "SCRMC Ellisville Clinic",
    subtitle: "Primary Care · Lab · Imaging",
    system: "Epic MyChart",
    status: "connected",
    lastSync: "Mar 19, 2026 · 9:14 AM",
    recordCount: "63",
    color: "#10b981",
  },
];

const IMPORT_LOG = [
  {
    id: 1,
    source: "Ochsner Health",
    type: "Full Sync",
    date: "Mar 19, 2026",
    time: "9:14 AM",
    records: 2847,
    status: "success",
    color: "#4f8ef7",
  },
  {
    id: 2,
    source: "Hattiesburg Clinic / FGH",
    type: "Full Sync",
    date: "Mar 19, 2026",
    time: "9:14 AM",
    records: 104,
    status: "success",
    color: "#a78bfa",
  },
  {
    id: 3,
    source: "SCRMC Ellisville Clinic",
    type: "Full Sync",
    date: "Mar 19, 2026",
    time: "9:14 AM",
    records: 63,
    status: "success",
    color: "#10b981",
  },
  {
    id: 4,
    source: "Manual Upload",
    type: "PDF Import",
    date: "Mar 19, 2026",
    time: "8:42 AM",
    records: 6,
    status: "success",
    color: "#f59e0b",
  },
  {
    id: 5,
    source: "Ochsner Health",
    type: "Incremental Sync",
    date: "Mar 12, 2026",
    time: "2:03 PM",
    records: 12,
    status: "success",
    color: "#4f8ef7",
  },
  {
    id: 6,
    source: "Pine Belt Dermatology",
    type: "Manual Entry",
    date: "Mar 10, 2026",
    time: "11:15 AM",
    records: 6,
    status: "success",
    color: "#f59e0b",
  },
];

const DATA_TYPES = [
  { label: "Labs & Results", icon: "◈", checked: true },
  { label: "Medications", icon: "⬡", checked: true },
  { label: "Encounters", icon: "▤", checked: true },
  { label: "Vitals", icon: "♡", checked: true },
  { label: "Imaging Reports", icon: "◻", checked: true },
  { label: "Immunizations", icon: "◎", checked: true },
  { label: "Care Plans", icon: "◷", checked: false },
  { label: "Clinical Notes", icon: "✦", checked: false },
];

// ── C-CDA XML parser (Epic export format) ────────────────────────────────────
function parseCCDA(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");
  const ns = "urn:hl7-org:v3";
  const q = (el, tag) => Array.from(el.getElementsByTagNameNS(ns, tag));

  const result = { readings: [], meds: [], labs: [], upcoming: [], alerts: [], source: "Epic C-CDA", totalRecords: 0 };

  // --- Medications ---
  q(doc, "substanceAdministration").forEach(sa => {
    try {
      const statusCode = sa.querySelector("[code]")?.getAttribute("code") ?? "";
      if (statusCode === "aborted" || statusCode === "cancelled") return;
      const nameEl = sa.getElementsByTagNameNS(ns, "name")[0];
      const name = nameEl?.textContent?.trim() ?? "";
      if (!name) return;
      const doseEl = sa.getElementsByTagNameNS(ns, "value")[0];
      const dose = doseEl ? `${doseEl.getAttribute("value") ?? ""} ${doseEl.getAttribute("unit") ?? ""}`.trim() : "";
      const freqEl = sa.getElementsByTagNameNS(ns, "period")[0];
      const freqVal = freqEl?.getAttribute("value");
      const freqUnit = freqEl?.getAttribute("unit");
      const frequency = freqVal && freqUnit ? `Every ${freqVal} ${freqUnit}` : "Once daily";
      const prescriberEl = sa.getElementsByTagNameNS(ns, "assignedPerson")[0];
      const prescriber = prescriberEl?.getElementsByTagNameNS(ns, "given")[0]?.textContent?.trim() ?? "";
      const familyName = prescriberEl?.getElementsByTagNameNS(ns, "family")[0]?.textContent?.trim() ?? "";
      result.meds.push({
        _pendingId: Math.random().toString(36).slice(2),
        name: name.split(" ").slice(0,2).join(" "),
        dose, frequency,
        prescriber: [prescriber, familyName].filter(Boolean).join(" ") || "Unknown",
        pharmacy: "", refillDate: "", renewalDate: "", status: "ok", flag: false, color: "#4f8ef7",
      });
      result.totalRecords++;
    } catch {}
  });

  // --- Labs / Results ---
  q(doc, "observation").forEach(obs => {
    try {
      const code = obs.getElementsByTagNameNS(ns, "code")[0];
      const name = code?.getAttribute("displayName") ?? code?.getAttribute("code") ?? "";
      if (!name) return;
      const valueEl = obs.getElementsByTagNameNS(ns, "value")[0];
      const value = valueEl?.getAttribute("value");
      const unit  = valueEl?.getAttribute("unit") ?? "";
      if (!value) return;
      const timeEl = obs.getElementsByTagNameNS(ns, "effectiveTime")[0];
      const rawDate = timeEl?.getAttribute("value") ?? timeEl?.querySelector("[value]")?.getAttribute("value") ?? "";
      const ts = rawDate ? `${rawDate.slice(0,4)}-${rawDate.slice(4,6)}-${rawDate.slice(6,8)}` : new Date().toISOString().split("T")[0];
      const dateLabel = ts ? new Date(ts + "T12:00:00").toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }) : "";
      const refEl = obs.getElementsByTagNameNS(ns, "referenceRange")[0];
      const refRange = refEl?.getElementsByTagNameNS(ns, "originalText")[0]?.textContent?.trim() ?? "";
      const interpretEl = obs.getElementsByTagNameNS(ns, "interpretationCode")[0];
      const flag = interpretEl ? ["H","HH","L","LL","A"].includes(interpretEl.getAttribute("code") ?? "") : false;
      result.labs.push({ date: dateLabel, ts, name: name.slice(0,60), value: parseFloat(value), unit, refRange, flag });
      result.totalRecords++;
    } catch {}
  });

  return result;
}

// ── Apple Health JSON import (from iOS Shortcut) ──────────────────────────────
function parseAppleHealthJSON(jsonText) {
  try {
    const data = JSON.parse(jsonText);
    const result = { readings: [], source: "Apple Health", totalRecords: 0 };
    const entries = Array.isArray(data) ? data : data.readings ?? data.vitals ?? [];
    entries.forEach(r => {
      const ts = r.ts ?? r.date ?? r.startDate?.split("T")[0] ?? "";
      if (!ts) return;
      const dateLabel = new Date(ts + "T12:00:00").toLocaleDateString("en-US", { month:"short", day:"numeric" });
      result.readings.push({
        date: dateLabel, ts,
        bp_s:  r.bp_s  ?? r.systolic   ?? undefined,
        bp_d:  r.bp_d  ?? r.diastolic  ?? undefined,
        hr:    r.hr    ?? r.heartRate   ?? undefined,
        o2:    r.o2    ?? r.oxygenSaturation ?? undefined,
        weight: r.weight ?? undefined,
      });
      result.totalRecords++;
    });
    return result;
  } catch {
    return null;
  }
}

export default function ImportTab({ onImport }) {
  const [syncing, setSyncing]       = useState(null);
  const [syncDone, setSyncDone]     = useState({});
  const [dragOver, setDragOver]     = useState(false);
  const [dataTypes, setDataTypes]   = useState(DATA_TYPES);
  const [uploadedFiles, setUploadedFiles] = useState([]);  // {file, name, size, status, parsed}
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview]       = useState(null);   // parsed data awaiting confirmation
  const [error, setError]           = useState(null);
  const [saved, setSaved]           = useState(false);
  const fileInputRef = useRef(null);

  const handleSync = (id) => {
    setSyncing(id);
    setTimeout(() => {
      setSyncing(null);
      setSyncDone((prev) => ({ ...prev, [id]: true }));
      setTimeout(() => setSyncDone((prev) => ({ ...prev, [id]: false })), 3000);
    }, 2200);
  };

  const handleSyncAll = () => {
    SOURCES.forEach((s, i) => {
      setTimeout(() => handleSync(s.id), i * 400);
    });
  };

  const toggleDataType = (i) => {
    setDataTypes((prev) =>
      prev.map((d, idx) => (idx === i ? { ...d, checked: !d.checked } : d))
    );
  };

  const addFiles = (files) => {
    const supported = Array.from(files).filter(f =>
      f.name.endsWith(".pdf") || f.name.endsWith(".xml") || f.name.endsWith(".json")
    );
    if (!supported.length) { setError("Supported formats: PDF, XML (Epic C-CDA), JSON (Apple Health)"); return; }
    setError(null);
    setUploadedFiles((prev) => [
      ...prev,
      ...supported.map((f) => ({ file: f, name: f.name, size: f.size, status: "queued" })),
    ]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const handleProcess = async () => {
    const apiKey = localStorage.getItem("mi_ak");
    setProcessing(true);
    setError(null);
    setPreview(null);

    const combined = { readings: [], meds: [], labs: [], upcoming: [], alerts: [], source: "PDF Import", totalRecords: 0 };

    for (let i = 0; i < uploadedFiles.length; i++) {
      const f = uploadedFiles[i];
      setUploadedFiles(prev => prev.map((u, idx) => idx === i ? { ...u, status: "reading…" } : u));
      try {
        const text = await f.file.text();
        let parsed = null;

        if (f.name.endsWith(".xml")) {
          // C-CDA — parse directly, no AI needed
          setUploadedFiles(prev => prev.map((u, idx) => idx === i ? { ...u, status: "parsing…" } : u));
          parsed = parseCCDA(text);
        } else if (f.name.endsWith(".json")) {
          // Apple Health JSON from Shortcut
          setUploadedFiles(prev => prev.map((u, idx) => idx === i ? { ...u, status: "parsing…" } : u));
          parsed = parseAppleHealthJSON(text);
        } else {
          // PDF — use Claude AI
          if (!apiKey) { setError("No API key found for PDF parsing. Add your Anthropic key in localStorage as 'mi_ak'."); break; }
          const pdfText = await extractPdfText(f.file);
          setUploadedFiles(prev => prev.map((u, idx) => idx === i ? { ...u, status: "parsing…" } : u));
          parsed = await parseWithClaude(pdfText, apiKey);
        }

        if (!parsed) { setUploadedFiles(prev => prev.map((u, idx) => idx === i ? { ...u, status: "error: unreadable" } : u)); continue; }

        setUploadedFiles(prev => prev.map((u, idx) => idx === i ? { ...u, status: "done ✓" } : u));
        if (parsed.readings)  combined.readings.push(...parsed.readings);
        if (parsed.meds)      combined.meds.push(...parsed.meds);
        if (parsed.labs)      combined.labs.push(...parsed.labs);
        if (parsed.upcoming)  combined.upcoming.push(...parsed.upcoming);
        if (parsed.alerts)    combined.alerts.push(...parsed.alerts);
        combined.source = parsed.source ?? combined.source;
        combined.totalRecords += parsed.totalRecords ?? 0;
      } catch (err) {
        setUploadedFiles(prev => prev.map((u, idx) => idx === i ? { ...u, status: `error: ${err.message}` } : u));
        setError(`Failed to parse ${f.name}: ${err.message}`);
      }
    }

    setProcessing(false);
    if (combined.readings.length || combined.meds.length || combined.labs.length) {
      setPreview(combined);
    }
  };

  const handleConfirm = () => {
    if (!preview || !onImport) return;

    // Separate meds — they go to pending approval queue
    if (preview.meds?.length) {
      const current = getPendingMeds();
      const updated = [...preview.meds, ...(current || [])];
      setPendingMeds(updated);
    }

    // Everything else goes directly to the dashboard
    onImport({ ...preview, meds: [] }); // meds handled separately via pending queue
    setSaved(true);
    setPreview(null);
    setUploadedFiles([]);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ height: 54, background: "#080c14", borderBottom: "1px solid #0d1a28", display: "flex", alignItems: "center", padding: "0 24px", gap: 12, flexShrink: 0 }}>
        
      </div>
      <div style={{ padding: "28px 28px", overflowY: "auto", flex: 1 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .imp-card { background:#0b1220; border:1px solid #111e30; border-radius:14px; transition:border-color .2s; animation:fadeUp .35s ease both; }
        .imp-card:hover { border-color:#1a2f4a; }
        .imp-btn { display:flex; align-items:center; gap:7px; padding:8px 16px; border-radius:8px; font-family:'Sora',sans-serif; font-size:12px; font-weight:500; cursor:pointer; transition:all .15s; border:1px solid; }
        .imp-btn-primary { background:rgba(79,142,247,.15); border-color:rgba(79,142,247,.35); color:#7eb8d8; }
        .imp-btn-primary:hover { background:rgba(79,142,247,.25); border-color:rgba(79,142,247,.6); color:#b8d4f0; }
        .imp-btn-ghost { background:transparent; border-color:#111e30; color:#b0c4d8; }
        .imp-btn-ghost:hover { border-color:#1a2f4a; color:#7eb8d8; }
        .imp-btn-success { background:rgba(16,185,129,.12); border-color:rgba(16,185,129,.3); color:#10b981; }
        .source-row { display:flex; align-items:center; gap:14px; padding:16px 18px; border-radius:10px; background:#080c14; border:1px solid #0d1a28; margin-bottom:8px; transition:border-color .15s; }
        .source-row:hover { border-color:#111e30; }
        .spin { animation: spin 0.8s linear infinite; display:inline-block; }
        .section-label { font-size:10px; letter-spacing:1.5px; text-transform:uppercase; color:#a0b4c8; font-family:'DM Mono',monospace; margin-bottom:12px; }
        .log-row { display:flex; align-items:center; gap:12px; padding:10px 14px; border-radius:8px; background:#080c14; border:1px solid #0d1a28; margin-bottom:6px; font-size:12px; transition:border-color .15s; }
        .log-row:hover { border-color:#111e30; }
        .checkbox { width:16px; height:16px; border-radius:4px; border:1px solid #1a2f4a; background:#080c14; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; transition:all .15s; }
        .checkbox.checked { background:rgba(79,142,247,.2); border-color:#4f8ef7; }
        .drop-zone { border:1px dashed #1a2f4a; border-radius:12px; padding:32px; text-align:center; background:#080c14; transition:all .2s; cursor:pointer; }
        .drop-zone.over { border-color:#4f8ef7; background:rgba(79,142,247,.05); }
        .status-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 26, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, color: "#dde8f5", fontWeight: 400, letterSpacing: "-0.5px" }}>
            Import Records
          </h1>
          <p style={{ fontSize: 12, color: "#98afc4", marginTop: 5, fontFamily: "'DM Mono',monospace" }}>
            3 sources connected · Last sync Mar 19, 2026
          </p>
        </div>
        <button className="imp-btn imp-btn-primary" onClick={handleSyncAll} style={{ marginTop: 4 }}>
          <span style={{ fontSize: 13 }}>↻</span> Sync All Sources
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
        {/* Left column */}
        <div>
          {/* Epic FHIR Sources */}
          <div className="imp-card" style={{ padding: "20px 20px 14px", marginBottom: 16, animationDelay: "0ms" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div className="section-label" style={{ marginBottom: 0 }}>Epic MyChart — FHIR R4</div>
              <div style={{ fontSize: 10, color: "#1e4030", fontFamily: "'DM Mono',monospace", display: "flex", alignItems: "center", gap: 6 }}>
                <div className="status-dot" style={{ background: "#10b981", boxShadow: "0 0 6px #10b981", animation: "pulse 2s infinite" }} />
                All systems connected
              </div>
            </div>

            {SOURCES.map((src) => (
              <div key={src.id} className="source-row">
                {/* Color bar */}
                <div style={{ width: 3, height: 36, borderRadius: 2, background: src.color, flexShrink: 0, boxShadow: `0 0 8px ${src.color}60` }} />

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#c4d8ee", marginBottom: 2 }}>{src.name}</div>
                  <div style={{ fontSize: 10, color: "#98afc4", fontFamily: "'DM Mono',monospace" }}>{src.subtitle}</div>
                </div>

                {/* Stats */}
                <div style={{ textAlign: "right", flexShrink: 0, marginRight: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: src.color }}>{src.recordCount}</div>
                  <div style={{ fontSize: 9, color: "#a0b4c8", fontFamily: "'DM Mono',monospace" }}>records</div>
                </div>

                {/* Last sync */}
                <div style={{ textAlign: "right", flexShrink: 0, marginRight: 14 }}>
                  <div style={{ fontSize: 10, color: "#98afc4", fontFamily: "'DM Mono',monospace" }}>Last sync</div>
                  <div style={{ fontSize: 10, color: "#b0c4d8", fontFamily: "'DM Mono',monospace" }}>{src.lastSync}</div>
                </div>

                {/* Sync button */}
                {syncDone[src.id] ? (
                  <button className="imp-btn imp-btn-success" style={{ minWidth: 80 }}>
                    <span>✓</span> Synced
                  </button>
                ) : (
                  <button
                    className="imp-btn imp-btn-primary"
                    style={{ minWidth: 80 }}
                    onClick={() => handleSync(src.id)}
                    disabled={!!syncing}
                  >
                    {syncing === src.id ? (
                      <><span className="spin">↻</span> Syncing</>
                    ) : (
                      <><span>↻</span> Sync</>
                    )}
                  </button>
                )}
              </div>
            ))}

            {/* Add source */}
            <div style={{ marginTop: 10, paddingTop: 12, borderTop: "1px solid #0d1a28", display: "flex", alignItems: "center", gap: 10 }}>
              <button className="imp-btn imp-btn-ghost" style={{ fontSize: 11 }}>
                + Connect New Source
              </button>
              <span style={{ fontSize: 10, color: "#a0b4c8", fontFamily: "'DM Mono',monospace" }}>
                Epic, Cerner, Athena, CommonWell supported
              </span>
            </div>
          </div>

          {/* Manual Upload */}
          <div className="imp-card" style={{ padding: "20px", marginBottom: 16, animationDelay: "80ms" }}>
            <div className="section-label">File Import — PDF (AI) · XML · JSON</div>

            {error && (
              <div style={{ marginBottom: 12, padding: "10px 14px", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 8, fontSize: 11, color: "#ef4444", fontFamily: "'DM Mono',monospace" }}>
                {error}
              </div>
            )}
            {saved && (
              <div style={{ marginBottom: 12, padding: "10px 14px", background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.25)", borderRadius: 8, fontSize: 11, color: "#10b981", fontFamily: "'DM Mono',monospace" }}>
                ✓ Data saved — dashboard updated
              </div>
            )}

            <input ref={fileInputRef} type="file" accept=".pdf,.xml,.json" multiple style={{ display:"none" }}
              onChange={e => addFiles(e.target.files)} />

            <div
              className={`drop-zone${dragOver ? " over" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <div style={{ fontSize: 24, marginBottom: 10, color: dragOver ? "#4f8ef7" : "#a0b4c8" }}>↓</div>
              <div style={{ fontSize: 13, color: dragOver ? "#7eb8d8" : "#b0c4d8", fontWeight: 500, marginBottom: 6 }}>
                Drop PDF files here or click to browse
              </div>
              <div style={{ fontSize: 10, color: "#a0b4c8", fontFamily: "'DM Mono',monospace" }}>
                PDF (AI) · XML — Epic C-CDA · JSON — Apple Health
              </div>
            </div>

            {uploadedFiles.length > 0 && (
              <div style={{ marginTop: 12 }}>
                {uploadedFiles.map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#080c14", borderRadius: 8, border: "1px solid #0d1a28", marginBottom: 6 }}>
                    <div style={{ fontSize: 11, color: "#7eb8d8", flex: 1 }}>{f.name}</div>
                    <div style={{ fontSize: 10, color: "#a0b4c8", fontFamily: "'DM Mono',monospace" }}>{(f.size / 1024).toFixed(1)} KB</div>
                    <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace",
                      color: f.status === "done ✓" ? "#10b981" : f.status.startsWith("error") ? "#ef4444" : "#f59e0b" }}>
                      {f.status}
                    </div>
                  </div>
                ))}
                <button
                  className="imp-btn imp-btn-primary"
                  style={{ marginTop: 8, width: "100%", justifyContent: "center" }}
                  onClick={handleProcess}
                  disabled={processing}
                >
                  {processing ? <><span className="spin">↻</span> Parsing…</> : <>✦ Process {uploadedFiles.length} File{uploadedFiles.length > 1 ? "s" : ""}</>}
                </button>
              </div>
            )}

            {/* Preview panel */}
            {preview && (
              <div style={{ marginTop: 16, padding: "14px", background: "#080c14", borderRadius: 10, border: "1px solid #1a2f4a" }}>
                <div style={{ fontSize: 11, color: "#7eb8d8", fontWeight: 600, marginBottom: 10 }}>
                  ✦ AI found the following data — confirm to save:
                </div>
                {preview.readings?.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", marginBottom: 4 }}>VITALS ({preview.readings.length})</div>
                    {preview.readings.map((r, i) => (
                      <div key={i} style={{ fontSize: 11, color: "#a8c4dc", padding: "3px 0", fontFamily: "'DM Mono',monospace" }}>
                        {r.date} — BP {r.bp_s}/{r.bp_d}{r.weight ? ` · Weight ${r.weight} lbs` : ""}
                      </div>
                    ))}
                  </div>
                )}
                {preview.labs?.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", marginBottom: 4 }}>LABS ({preview.labs.length})</div>
                    {preview.labs.slice(0, 6).map((l, i) => (
                      <div key={i} style={{ fontSize: 11, color: l.flag ? "#ef4444" : "#a8c4dc", padding: "3px 0", fontFamily: "'DM Mono',monospace" }}>
                        {l.name}: {l.value} {l.unit}{l.refRange ? ` (ref: ${l.refRange})` : ""}{l.flag ? " ▲" : ""}
                      </div>
                    ))}
                    {preview.labs.length > 6 && <div style={{ fontSize: 10, color: "#a0b4c8", fontFamily: "'DM Mono',monospace" }}>+{preview.labs.length - 6} more</div>}
                  </div>
                )}
                {preview.meds?.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", marginBottom: 4 }}>MEDICATIONS ({preview.meds.length})</div>
                    {preview.meds.slice(0, 4).map((m, i) => (
                      <div key={i} style={{ fontSize: 11, color: "#a8c4dc", padding: "3px 0", fontFamily: "'DM Mono',monospace" }}>{m.name}</div>
                    ))}
                    {preview.meds.length > 4 && <div style={{ fontSize: 10, color: "#a0b4c8", fontFamily: "'DM Mono',monospace" }}>+{preview.meds.length - 4} more</div>}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button className="imp-btn imp-btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={handleConfirm}>
                    ✓ Save to Dashboard
                  </button>
                  <button className="imp-btn imp-btn-ghost" style={{ justifyContent: "center" }} onClick={() => setPreview(null)}>
                    Discard
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Import Log */}
          <div className="imp-card" style={{ padding: "20px", animationDelay: "120ms" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div className="section-label" style={{ marginBottom: 0 }}>Import History</div>
              <button className="imp-btn imp-btn-ghost" style={{ fontSize: 10, padding: "5px 10px" }}>View All</button>
            </div>

            {/* Table header */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 80px 60px 60px", gap: 8, padding: "0 14px 8px", borderBottom: "1px solid #0d1a28", marginBottom: 6 }}>
              {["SOURCE", "TYPE", "DATE", "RECORDS", "STATUS"].map((h) => (
                <div key={h} style={{ fontSize: 9, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", letterSpacing: "1px" }}>{h}</div>
              ))}
            </div>

            {IMPORT_LOG.map((entry, i) => (
              <div key={entry.id} className="log-row" style={{ animationDelay: `${160 + i * 40}ms`, display: "grid", gridTemplateColumns: "1fr 110px 80px 60px 60px", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div className="status-dot" style={{ background: entry.color }} />
                  <span style={{ color: "#a8c4dc", fontWeight: 500, fontSize: 12 }}>{entry.source}</span>
                </div>
                <div style={{ color: "#b0c4d8", fontFamily: "'DM Mono',monospace", fontSize: 11 }}>{entry.type}</div>
                <div style={{ color: "#98afc4", fontFamily: "'DM Mono',monospace", fontSize: 11 }}>{entry.date}</div>
                <div style={{ color: "#7eb8d8", fontFamily: "'DM Mono',monospace", fontSize: 11 }}>{entry.records.toLocaleString()}</div>
                <div style={{ color: "#10b981", fontFamily: "'DM Mono',monospace", fontSize: 10 }}>✓ done</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div>
          {/* Data Types */}
          <div className="imp-card" style={{ padding: "18px", marginBottom: 14, animationDelay: "40ms" }}>
            <div className="section-label">Data Types to Import</div>
            {dataTypes.map((dt, i) => (
              <div
                key={i}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < dataTypes.length - 1 ? "1px solid #0d1a28" : "none", cursor: "pointer" }}
                onClick={() => toggleDataType(i)}
              >
                <div className={`checkbox${dt.checked ? " checked" : ""}`}>
                  {dt.checked && <span style={{ color: "#4f8ef7", fontSize: 10 }}>✓</span>}
                </div>
                <span style={{ fontSize: 11, color: "#98afc4", fontFamily: "'DM Mono',monospace", width: 14 }}>{dt.icon}</span>
                <span style={{ fontSize: 12, color: dt.checked ? "#a8c4dc" : "#b0c4d8", fontWeight: dt.checked ? 500 : 400 }}>{dt.label}</span>
              </div>
            ))}
          </div>

          {/* Summary stats */}
          <div className="imp-card" style={{ padding: "18px", marginBottom: 14, animationDelay: "60ms" }}>
            <div className="section-label">Record Summary</div>
            {[
              { label: "Total Records", value: "3,014", color: "#4f8ef7" },
              { label: "Lab Results", value: "2,996", color: "#a78bfa" },
              { label: "Encounters", value: "38", color: "#10b981" },
              { label: "Medications", value: "47", color: "#f59e0b" },
              { label: "Imaging Reports", value: "4", color: "#7eb8d8" },
              { label: "Immunizations", value: "7", color: "#10b981" },
            ].map((s) => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #0d1a28" }}>
                <span style={{ fontSize: 12, color: "#b0c4d8" }}>{s.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: s.color, fontFamily: "'DM Mono',monospace" }}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* Sync schedule */}
          <div className="imp-card" style={{ padding: "18px", animationDelay: "100ms" }}>
            <div className="section-label">Auto-Sync Schedule</div>
            {[
              { label: "Frequency", value: "On app open" },
              { label: "Epic FHIR", value: "Incremental" },
              { label: "Conflict handling", value: "Newest wins" },
              { label: "Notifications", value: "New labs only" },
            ].map((r) => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #0d1a28" }}>
                <span style={{ fontSize: 11, color: "#98afc4" }}>{r.label}</span>
                <span style={{ fontSize: 11, color: "#7eb8d8", fontFamily: "'DM Mono',monospace" }}>{r.value}</span>
              </div>
            ))}
            <button className="imp-btn imp-btn-ghost" style={{ marginTop: 12, width: "100%", justifyContent: "center", fontSize: 11 }}>
              Edit Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
      </div>
  );
}