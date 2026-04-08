import { useState } from "react";

import { getRecords, setRecords } from "../../store.js";

const TYPE_COLORS = {
  "Visit Note": "#4f8ef7",
  "Lab Report": "#10b981",
  "Imaging":    "#a78bfa",
  "Procedure":  "#f59e0b",
  "Hospital":   "#ef4444",
};

const FILTERS = ["All", "Visit Note", "Lab Report", "Imaging", "Procedure", "Hospital"];

function Badge({ type }) {
  const c = TYPE_COLORS[type] || "#4f8ef7";
  return (
    <span style={{
      fontSize: 9, fontFamily: "'DM Mono',monospace",
      background: `${c}18`, color: c, border: `1px solid ${c}30`,
      padding: "2px 7px", borderRadius: 4, letterSpacing: "0.5px",
      textTransform: "uppercase", flexShrink: 0,
    }}>
      {type}
    </span>
  );
}

export default function Records() {
  const [records, setRecordsState] = useState(() => getRecords());
  const [filter, setFilter]     = useState("All");
  const [search, setSearch]     = useState("");
  const [selected, setSelected] = useState(() => getRecords()[0] ?? null);
  const [showAdd, setShowAdd]   = useState(false);
  const [addType, setAddType]   = useState(null);
  const [addForm, setAddForm]   = useState({ title: "", facility: "", provider: "", date: "" });
  const [deleteId, setDeleteId] = useState(null);

  const filtered = records.filter(r => {
    const matchType   = filter === "All" || r.type === filter;
    const matchSearch = !search
      || r.title.toLowerCase().includes(search.toLowerCase())
      || r.provider.toLowerCase().includes(search.toLowerCase())
      || r.facility.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#07090f", fontFamily: "'Sora',sans-serif", color: "#d4e2f0", overflow: "hidden", position: "relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #1a2840; border-radius: 4px; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .rec-row { padding: 13px 16px; border-bottom: 1px solid #0d1a28; cursor: pointer; transition: background .1s; border-left: 2px solid transparent; }
        .rec-row:hover { background: #0b1220; }
        .rec-row.active { background: #0d1525; border-left-color: #4f8ef7; }
        .filter-chip { padding: 5px 13px; border-radius: 20px; font-size: 11px; border: 1px solid #111e30; background: #0b1220; color: #b0c4d8; cursor: pointer; transition: all .15s; font-family: 'DM Mono',monospace; white-space: nowrap; }
        .filter-chip:hover { color: #7eb8d8; border-color: #1a2f4a; }
        .filter-chip.active { color: #4f8ef7; border-color: #4f8ef7; background: rgba(79,142,247,.08); }
        .type-chip { padding: 5px 13px; border-radius: 20px; font-size: 11px; border: 1px solid #111e30; background: #0b1220; color: #b0c4d8; cursor: pointer; transition: all .15s; font-family: 'DM Mono',monospace; white-space: nowrap; }
        .type-chip:hover { color: #7eb8d8; border-color: #1a2f4a; }
        .type-chip.active { color: #4f8ef7; border-color: #4f8ef7; background: rgba(79,142,247,.08); }
        .detail-line { display: flex; align-items: flex-start; gap: 8px; padding: 8px 0; border-bottom: 1px solid #0d1a28; font-size: 12px; }
        .detail-line:last-child { border-bottom: none; }
        .search-input { background: #0b1220; border: 1px solid #111e30; color: #c4d8ee; padding: 7px 12px 7px 32px; border-radius: 8px; font-family: 'Sora',sans-serif; font-size: 12px; outline: none; width: 220px; transition: border-color .15s; }
        .search-input::placeholder { color: #98afc4; }
        .search-input:focus { border-color: #1a2f4a; }
        .modal-input { width: 100%; background: #07090f; border: 1px solid #111e30; color: #c4d8ee; padding: 8px 12px; border-radius: 8px; font-family: 'Sora',sans-serif; font-size: 12px; outline: none; transition: border-color .15s; }
        .modal-input::placeholder { color: #a0b4c8; }
        .modal-input:focus { border-color: #1a2f4a; }
        .epic-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; background: rgba(79,142,247,.08); border: 1px solid rgba(79,142,247,.25); border-radius: 8px; color: #4f8ef7; font-size: 11px; font-family: 'DM Mono',monospace; cursor: pointer; transition: all .15s; text-decoration: none; }
        .epic-btn:hover { background: rgba(79,142,247,.15); border-color: rgba(79,142,247,.4); }
        .add-badge-btn { display: inline-flex; align-items: center; gap: 5px; padding: 4px 11px; background: rgba(79,142,247,.08); border: 1px solid rgba(79,142,247,.25); border-radius: 12px; color: #4f8ef7; font-size: 11px; font-family: 'DM Mono',monospace; cursor: pointer; transition: all .15s; letter-spacing: 0.3px; }
        .add-badge-btn:hover { background: rgba(79,142,247,.16); border-color: rgba(79,142,247,.45); }
      `}</style>

      {/* Topbar */}
      <div style={{ height: 54, background: "#080c14", borderBottom: "1px solid #0d1a28", display: "flex", alignItems: "center", padding: "0 24px", gap: 12, flexShrink: 0 }}>
        <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, color: "#dde8f5", fontWeight: 400, letterSpacing: "-0.3px" }}>
          Medical Records
        </div>
        <button className="add-badge-btn" onClick={() => setShowAdd(true)}>
          <span style={{ fontSize: 15, lineHeight: 1, marginTop: -1 }}>+</span>
          Add Record
        </button>
        <div style={{ flex: 1 }} />
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <span style={{ position: "absolute", left: 10, fontSize: 13, color: "#98afc4" }}>⌕</span>
          <input
            className="search-input"
            placeholder="Search records…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ fontSize: 10, color: "#98afc4", fontFamily: "'DM Mono',monospace", background: "#0b1220", border: "1px solid #111e30", padding: "5px 12px", borderRadius: 6 }}>
          {records.length} records · Epic FHIR
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ background: "#080c14", borderBottom: "1px solid #0d1a28", padding: "10px 24px", display: "flex", gap: 8, flexShrink: 0, overflowX: "auto", alignItems: "center" }}>
        {FILTERS.map(f => (
          <button key={f} className={`filter-chip${filter === f ? " active" : ""}`} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "#1e4030", fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", display: "inline-block", boxShadow: "0 0 6px #10b981" }} />
          Epic connected
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Record list */}
        <div style={{ width: 320, minWidth: 320, borderRight: "1px solid #0d1a28", overflowY: "auto" }}>
          {filtered.length === 0 && (
            <div style={{ padding: 32, textAlign: "center", fontSize: 12, color: "#98afc4", fontFamily: "'DM Mono',monospace" }}>
              No records found
            </div>
          )}
          {filtered.map(r => (
            <div
              key={r.id}
              className={`rec-row${selected?.id === r.id ? " active" : ""}`}
              onClick={() => setSelected(r)}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7, gap: 8 }}>
                <Badge type={r.type} />
                <span style={{ fontSize: 10, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>{r.date}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#c4d8ee", marginBottom: 3, lineHeight: 1.3 }}>{r.title}</div>
              <div style={{ fontSize: 11, color: "#98afc4", fontFamily: "'DM Mono',monospace" }}>{r.facility}</div>
            </div>
          ))}
        </div>

        {/* Detail panel */}
        {selected ? (
          <div key={selected.id} style={{ flex: 1, overflowY: "auto", padding: 28, animation: "fadeUp .25s ease both" }}>

            {/* Header */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <Badge type={selected.type} />
                <span style={{ fontSize: 10, color: "#b0c4d8", fontFamily: "'DM Mono',monospace" }}>{selected.date}</span>
              </div>
              <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 24, color: "#dde8f5", fontWeight: 400, letterSpacing: "-0.3px", marginBottom: 10 }}>
                {selected.title}
              </h2>
              <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontSize: 11, color: "#b0c4d8", fontFamily: "'DM Mono',monospace" }}>{selected.facility}</div>
                <div style={{ fontSize: 11, color: "#98afc4", fontFamily: "'DM Mono',monospace" }}>{selected.provider}</div>
                {selected.epicId && (
                  <a className="epic-btn" href={`https://mychart.example.com/record/${selected.epicId}`} target="_blank" rel="noreferrer">
                    <span style={{ fontSize: 10 }}>↗</span> Open in Epic
                  </a>
                )}
                <button
                  onClick={() => setDeleteId(selected.id)}
                  style={{ marginLeft: "auto", padding: "5px 12px", background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", borderRadius: 7, color: "#ef4444", fontSize: 11, fontFamily: "'DM Mono',monospace", cursor: "pointer" }}
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Summary */}
            <div style={{ background: "#0b1220", border: "1px solid #111e30", borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
              <div style={{ fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase", color: "#a0b4c8", fontFamily: "'DM Mono',monospace", marginBottom: 10 }}>
                Summary
              </div>
              <p style={{ fontSize: 13, color: "#a8c4dc", lineHeight: 1.65 }}>{selected.summary}</p>
            </div>

            {/* Key details */}
            {(selected.details ?? []).length > 0 && <div style={{ background: "#0b1220", border: "1px solid #111e30", borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
              <div style={{ fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase", color: "#a0b4c8", fontFamily: "'DM Mono',monospace", marginBottom: 10 }}>
                Key Details
              </div>
              {(selected.details ?? []).map((d, i) => {
                const isFlag = d.includes("(H)") || d.includes("(L)");
                return (
                  <div key={i} className="detail-line">
                    <span style={{ width: 4, height: 4, borderRadius: "50%", background: isFlag ? "#f59e0b" : "#a0b4c8", flexShrink: 0, marginTop: 5 }} />
                    <span style={{ color: isFlag ? "#f5c97a" : "#7eb8d8", fontFamily: "'DM Mono',monospace" }}>{d}</span>
                  </div>
                );
              })}
            </div>}

            {/* Tags */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(selected.tags ?? []).map(t => (
                <span key={t} style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", background: "#0b1220", border: "1px solid #111e30", color: "#98afc4", padding: "3px 9px", borderRadius: 4, letterSpacing: "0.5px" }}>
                  #{t}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#a0b4c8", fontSize: 12, fontFamily: "'DM Mono',monospace", gap: 8 }}>
            {records.length === 0
              ? <><div style={{ fontSize: 24, marginBottom: 8, opacity: 0.4 }}>▤</div><div>No records yet</div><div style={{ fontSize: 10, color: "#6a8090" }}>Import XML or PDF files on the Import Records tab</div></>
              : "Select a record to view details"
            }
          </div>
        )}
      </div>

      {/* Add Record modal */}
      {showAdd && (
        <div
          style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}
          onClick={() => { setShowAdd(false); setAddForm({ title: "", facility: "", provider: "", date: "" }); setAddType(null); }}
        >
          <div
            style={{ background: "#0b1220", border: "1px solid #1a2f4a", borderRadius: 16, padding: 28, width: 420, animation: "fadeUp .2s ease both" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, color: "#dde8f5", marginBottom: 20 }}>Add Record</div>

            {[
              { label: "Title",    key: "title",    placeholder: "e.g. Cardiology Follow-Up" },
              { label: "Facility", key: "facility", placeholder: "e.g. Baptist Medical Center" },
              { label: "Provider", key: "provider", placeholder: "e.g. Dr. Jane Smith, MD" },
              { label: "Date",     key: "date",     placeholder: "e.g. Apr 8, 2026" },
            ].map(({ label, key, placeholder }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 9, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
                <input
                  className="modal-input"
                  placeholder={placeholder}
                  value={addForm[key]}
                  onChange={e => setAddForm(f => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}

            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 9, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 8 }}>Record Type</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {FILTERS.filter(f => f !== "All").map(f => (
                  <button
                    key={f}
                    className={`type-chip${addType === f ? " active" : ""}`}
                    onClick={() => setAddType(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => { setShowAdd(false); setAddForm({ title: "", facility: "", provider: "", date: "" }); setAddType(null); }}
                style={{ padding: "8px 18px", background: "transparent", border: "1px solid #111e30", borderRadius: 8, color: "#b0c4d8", fontFamily: "'Sora',sans-serif", fontSize: 12, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!addForm.title.trim()) return;
                  const newRec = {
                    id: Date.now(),
                    title: addForm.title.trim(),
                    facility: addForm.facility.trim() || "Unknown",
                    provider: addForm.provider.trim() || "Unknown",
                    date: addForm.date.trim() || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                    type: addType || "Visit Note",
                    summary: "",
                    details: [],
                    tags: [],
                  };
                  const updated = [newRec, ...records];
                  setRecordsState(updated);
                  setRecords(updated);
                  setSelected(newRec);
                  setShowAdd(false);
                  setAddForm({ title: "", facility: "", provider: "", date: "" });
                  setAddType(null);
                }}
                style={{ padding: "8px 18px", background: "rgba(79,142,247,.12)", border: "1px solid rgba(79,142,247,.35)", borderRadius: 8, color: "#4f8ef7", fontFamily: "'Sora',sans-serif", fontSize: 12, cursor: "pointer" }}
              >
                Save Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId !== null && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#0b1220", border: "1px solid #1a2f4a", borderRadius: 14, padding: 28, width: 380 }}>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, color: "#dde8f5", marginBottom: 10 }}>Delete Record?</div>
            <div style={{ fontSize: 13, color: "#98afc4", marginBottom: 22 }}>This cannot be undone.</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setDeleteId(null)} style={{ padding: "8px 18px", background: "transparent", border: "1px solid #111e30", borderRadius: 8, color: "#b0c4d8", fontFamily: "'Sora',sans-serif", fontSize: 12, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => {
                const updated = records.filter(r => r.id !== deleteId);
                setRecordsState(updated);
                setRecords(updated);
                if (selected?.id === deleteId) setSelected(updated[0] ?? null);
                setDeleteId(null);
              }} style={{ padding: "8px 18px", background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", borderRadius: 8, color: "#ef4444", fontFamily: "'Sora',sans-serif", fontSize: 12, cursor: "pointer" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
