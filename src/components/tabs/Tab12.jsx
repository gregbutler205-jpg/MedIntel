import INTELLITRAX_LOGO from "../../assets/logo.png";
import { useState } from "react";

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

export default function ImportTab() {
  const [syncing, setSyncing] = useState(null);
  const [syncDone, setSyncDone] = useState({});
  const [dragOver, setDragOver] = useState(false);
  const [dataTypes, setDataTypes] = useState(DATA_TYPES);
  const [uploadedFiles, setUploadedFiles] = useState([]);

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

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    setUploadedFiles((prev) => [
      ...prev,
      ...files.map((f) => ({ name: f.name, size: f.size, status: "queued" })),
    ]);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ height: 54, background: "#080c14", borderBottom: "1px solid #0d1a28", display: "flex", alignItems: "center", padding: "0 24px", gap: 12, flexShrink: 0 }}>
        <img src={INTELLITRAX_LOGO} alt="IntelliTrax" style={{ width: 185, height: 65, objectFit: "contain" }} />
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
        .imp-btn-ghost { background:transparent; border-color:#111e30; color:#3d5a7a; }
        .imp-btn-ghost:hover { border-color:#1a2f4a; color:#7eb8d8; }
        .imp-btn-success { background:rgba(16,185,129,.12); border-color:rgba(16,185,129,.3); color:#10b981; }
        .source-row { display:flex; align-items:center; gap:14px; padding:16px 18px; border-radius:10px; background:#080c14; border:1px solid #0d1a28; margin-bottom:8px; transition:border-color .15s; }
        .source-row:hover { border-color:#111e30; }
        .spin { animation: spin 0.8s linear infinite; display:inline-block; }
        .section-label { font-size:10px; letter-spacing:1.5px; text-transform:uppercase; color:#1e3550; font-family:'DM Mono',monospace; margin-bottom:12px; }
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
          <p style={{ fontSize: 12, color: "#2d4d6a", marginTop: 5, fontFamily: "'DM Mono',monospace" }}>
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
                  <div style={{ fontSize: 10, color: "#2d4d6a", fontFamily: "'DM Mono',monospace" }}>{src.subtitle}</div>
                </div>

                {/* Stats */}
                <div style={{ textAlign: "right", flexShrink: 0, marginRight: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: src.color }}>{src.recordCount}</div>
                  <div style={{ fontSize: 9, color: "#1e3550", fontFamily: "'DM Mono',monospace" }}>records</div>
                </div>

                {/* Last sync */}
                <div style={{ textAlign: "right", flexShrink: 0, marginRight: 14 }}>
                  <div style={{ fontSize: 10, color: "#2d4d6a", fontFamily: "'DM Mono',monospace" }}>Last sync</div>
                  <div style={{ fontSize: 10, color: "#3d5a7a", fontFamily: "'DM Mono',monospace" }}>{src.lastSync}</div>
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
              <span style={{ fontSize: 10, color: "#1e3550", fontFamily: "'DM Mono',monospace" }}>
                Epic, Cerner, Athena, CommonWell supported
              </span>
            </div>
          </div>

          {/* Manual Upload */}
          <div className="imp-card" style={{ padding: "20px", marginBottom: 16, animationDelay: "80ms" }}>
            <div className="section-label">Manual File Import</div>
            <div
              className={`drop-zone${dragOver ? " over" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <div style={{ fontSize: 24, marginBottom: 10, color: dragOver ? "#4f8ef7" : "#1e3550" }}>↓</div>
              <div style={{ fontSize: 13, color: dragOver ? "#7eb8d8" : "#3d5a7a", fontWeight: 500, marginBottom: 6 }}>
                Drop files here or click to browse
              </div>
              <div style={{ fontSize: 10, color: "#1e3550", fontFamily: "'DM Mono',monospace" }}>
                PDF · CSV · HL7 · CCD/CDA · FHIR JSON · XLSX
              </div>
            </div>

            {uploadedFiles.length > 0 && (
              <div style={{ marginTop: 12 }}>
                {uploadedFiles.map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#080c14", borderRadius: 8, border: "1px solid #0d1a28", marginBottom: 6 }}>
                    <div style={{ fontSize: 11, color: "#7eb8d8", flex: 1 }}>{f.name}</div>
                    <div style={{ fontSize: 10, color: "#1e3550", fontFamily: "'DM Mono',monospace" }}>
                      {(f.size / 1024).toFixed(1)} KB
                    </div>
                    <div style={{ fontSize: 10, color: "#f59e0b", fontFamily: "'DM Mono',monospace" }}>{f.status}</div>
                  </div>
                ))}
                <button className="imp-btn imp-btn-primary" style={{ marginTop: 8, width: "100%", justifyContent: "center" }}>
                  Process {uploadedFiles.length} File{uploadedFiles.length > 1 ? "s" : ""}
                </button>
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
                <div key={h} style={{ fontSize: 9, color: "#1e3550", fontFamily: "'DM Mono',monospace", letterSpacing: "1px" }}>{h}</div>
              ))}
            </div>

            {IMPORT_LOG.map((entry, i) => (
              <div key={entry.id} className="log-row" style={{ animationDelay: `${160 + i * 40}ms`, display: "grid", gridTemplateColumns: "1fr 110px 80px 60px 60px", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div className="status-dot" style={{ background: entry.color }} />
                  <span style={{ color: "#a8c4dc", fontWeight: 500, fontSize: 12 }}>{entry.source}</span>
                </div>
                <div style={{ color: "#3d5a7a", fontFamily: "'DM Mono',monospace", fontSize: 11 }}>{entry.type}</div>
                <div style={{ color: "#2d4d6a", fontFamily: "'DM Mono',monospace", fontSize: 11 }}>{entry.date}</div>
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
                <span style={{ fontSize: 11, color: "#2d4d6a", fontFamily: "'DM Mono',monospace", width: 14 }}>{dt.icon}</span>
                <span style={{ fontSize: 12, color: dt.checked ? "#a8c4dc" : "#3d5a7a", fontWeight: dt.checked ? 500 : 400 }}>{dt.label}</span>
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
                <span style={{ fontSize: 12, color: "#3d5a7a" }}>{s.label}</span>
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
                <span style={{ fontSize: 11, color: "#2d4d6a" }}>{r.label}</span>
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