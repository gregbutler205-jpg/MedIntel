import INTELLITRAX_LOGO from "../../assets/logo.png";
import { useState } from "react";

const CATEGORIES = [
  { id: "all", label: "All Documents", icon: "▤", count: 24 },
  { id: "discharge", label: "Discharge Summaries", icon: "◈", count: 3 },
  { id: "labs", label: "Lab Reports", icon: "◎", count: 8 },
  { id: "imaging", label: "Imaging & Radiology", icon: "◻", count: 4 },
  { id: "operative", label: "Operative Reports", icon: "⬡", count: 2 },
  { id: "clinical", label: "Clinical Notes", icon: "✦", count: 5 },
  { id: "referrals", label: "Referrals & Auth", icon: "◷", count: 2 },
];

const DOCUMENTS = (() => { try { const r = localStorage.getItem("mi_documents"); return r ? JSON.parse(r) : []; } catch { return []; } })();

const SOURCE_FILTERS = ["All Sources", "Ochsner Health", "Hattiesburg Clinic / FGH", "SCRMC"];

export default function DocumentsTab() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDoc, setSelectedDoc] = useState(DOCUMENTS[0] || null);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("All Sources");

  const filtered = DOCUMENTS.filter((d) => {
    const matchCat = selectedCategory === "all" || d.category === selectedCategory;
    const matchSearch =
      search === "" ||
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())) ||
      d.provider.toLowerCase().includes(search.toLowerCase());
    const matchSource =
      sourceFilter === "All Sources" || d.source.startsWith(sourceFilter.split(" /")[0]);
    return matchCat && matchSearch && matchSource;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", fontFamily: "'Sora', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        .doc-cat { display:flex; align-items:center; gap:9px; padding:7px 12px; border-radius:8px; cursor:pointer; transition:all .15s; font-size:12px; color:#b0c4d8; user-select:none; }
        .doc-cat:hover { background:rgba(79,142,247,.05); color:#7eb8d8; }
        .doc-cat.active { background:rgba(79,142,247,.08); color:#4f8ef7; border-left: 2px solid #4f8ef7; }
        .doc-row { padding:12px 14px; border-radius:10px; border:1px solid #0d1a28; background:#080c14; cursor:pointer; transition:all .15s; margin-bottom:6px; animation:fadeUp .3s ease both; }
        .doc-row:hover { border-color:#111e30; background:#0a0f1c; }
        .doc-row.selected { border-color:#1a2f4a; background:#0b1220; }
        .tag { display:inline-block; padding:2px 7px; border-radius:10px; font-size:9px; font-family:'DM Mono',monospace; background:rgba(79,142,247,.1); color:#4f8ef7; border:1px solid rgba(79,142,247,.2); margin-right:4px; }
        .tag.urgent { background:rgba(239,68,68,.1); color:#ef4444; border-color:rgba(239,68,68,.2); }
        .doc-search { background:#080c14; border:1px solid #111e30; border-radius:8px; padding:8px 12px; color:#a8c4dc; font-family:'Sora',sans-serif; font-size:12px; width:100%; outline:none; transition:border-color .15s; }
        .doc-search:focus { border-color:#1a2f4a; }
        .doc-search::placeholder { color:#a0b4c8; }
        .section-label { font-size:10px; letter-spacing:1.5px; text-transform:uppercase; color:#a0b4c8; font-family:'DM Mono',monospace; margin-bottom:10px; }
        .preview-area { font-family:'DM Mono',monospace; font-size:11px; color:#b0c4d8; line-height:1.8; white-space:pre-wrap; background:#080c14; border:1px solid #0d1a28; border-radius:10px; padding:18px; overflow-y:auto; flex:1; }
        .filter-chip { padding:5px 12px; border-radius:20px; font-size:11px; font-family:'DM Mono',monospace; cursor:pointer; transition:all .15s; border:1px solid #111e30; background:transparent; color:#b0c4d8; }
        .filter-chip.active { border-color:rgba(79,142,247,.4); background:rgba(79,142,247,.08); color:#7eb8d8; }
        ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-thumb { background:#1a2840; border-radius:4px; }
        @media print { .no-print { display:none !important; } aside { display:none !important; } body { background:white !important; } }
      `}</style>

      {/* Topbar */}
      <div style={{ height: 54, background: "#080c14", borderBottom: "1px solid #0d1a28", display: "flex", alignItems: "center", padding: "0 24px", gap: 12, flexShrink: 0 }}>
        
        <div style={{ flex: 1 }} />
        <button onClick={() => window.print()} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", background:"rgba(79,142,247,.1)", border:"1px solid rgba(79,142,247,.3)", borderRadius:8, color:"#7eb8d8", fontSize:11, fontFamily:"'DM Mono',monospace", cursor:"pointer" }}>
          ⎙ Print
        </button>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

      {/* Category sidebar */}
      <div style={{ width: 210, minWidth: 210, background: "#080c14", borderRight: "1px solid #0d1a28", display: "flex", flexDirection: "column", padding: "20px 10px" }}>
        <div className="section-label" style={{ padding: "0 12px" }}>Categories</div>
        {CATEGORIES.map((cat) => (
          <div
            key={cat.id}
            className={`doc-cat${selectedCategory === cat.id ? " active" : ""}`}
            style={selectedCategory === cat.id ? { borderLeft: "2px solid #4f8ef7", paddingLeft: 10 } : { borderLeft: "2px solid transparent" }}
            onClick={() => setSelectedCategory(cat.id)}
          >
            <span style={{ fontSize: 12, width: 14, textAlign: "center", flexShrink: 0 }}>{cat.icon}</span>
            <span style={{ flex: 1 }}>{cat.label}</span>
            <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: selectedCategory === cat.id ? "#4f8ef7" : "#a0b4c8" }}>
              {cat.count}
            </span>
          </div>
        ))}

        <div style={{ marginTop: "auto", padding: "12px", borderTop: "1px solid #0d1a28" }}>
          <button style={{ width: "100%", padding: "9px", background: "rgba(79,142,247,.1)", border: "1px solid rgba(79,142,247,.25)", borderRadius: 8, color: "#7eb8d8", fontFamily: "'Sora',sans-serif", fontSize: 11, cursor: "pointer" }}>
            + Upload Document
          </button>
        </div>
      </div>

      {/* Document list */}
      <div style={{ width: 320, minWidth: 320, borderRight: "1px solid #0d1a28", display: "flex", flexDirection: "column", background: "#07090f" }}>
        {/* Search + filters */}
        <div style={{ padding: "16px 14px 12px", borderBottom: "1px solid #0d1a28" }}>
          <input
            className="doc-search"
            placeholder="Search documents, providers, tags…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
            {SOURCE_FILTERS.map((sf) => (
              <button
                key={sf}
                className={`filter-chip${sourceFilter === sf ? " active" : ""}`}
                onClick={() => setSourceFilter(sf)}
              >
                {sf === "All Sources" ? sf : sf.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 10px" }}>
          <div style={{ fontSize: 10, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", marginBottom: 10, paddingLeft: 4 }}>
            {filtered.length} document{filtered.length !== 1 ? "s" : ""}
          </div>
          {filtered.length === 0 && (
            <div style={{ padding: 20, textAlign: "center", color: "#a0b4c8", fontSize: 12, fontFamily: "'DM Mono',monospace" }}>
              No documents found
            </div>
          )}
          {filtered.map((doc, i) => (
            <div
              key={doc.id}
              className={`doc-row${selectedDoc?.id === doc.id ? " selected" : ""}`}
              style={{ animationDelay: `${i * 35}ms` }}
              onClick={() => setSelectedDoc(doc)}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#c4d8ee", lineHeight: 1.35, marginBottom: 3, paddingRight: 8 }}>
                    {doc.flagged && <span style={{ color: "#ef4444", marginRight: 5 }}>⚠</span>}
                    {doc.title}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: doc.sourceColor, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: "#98afc4", fontFamily: "'DM Mono',monospace" }}>{doc.source}</span>
                <span style={{ fontSize: 10, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", marginLeft: "auto" }}>{doc.date}</span>
              </div>
              <div>
                {doc.tags.slice(0, 3).map((t) => (
                  <span key={t} className={`tag${t === "urgent" || t === "lymph node" ? " urgent" : ""}`}>{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Document detail / preview */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {selectedDoc ? (
          <>
            {/* Detail header */}
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #0d1a28", background: "#07090f", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, color: "#dde8f5", fontWeight: 400, letterSpacing: "-0.3px", lineHeight: 1.3 }}>
                  {selectedDoc.flagged && <span style={{ color: "#ef4444", marginRight: 8 }}>⚠</span>}
                  {selectedDoc.title}
                </h2>
                <div style={{ display: "flex", gap: 8, flexShrink: 0, marginLeft: 16 }}>
                  <button style={{ padding: "6px 14px", background: "transparent", border: "1px solid #111e30", borderRadius: 7, color: "#b0c4d8", fontFamily: "'Sora',sans-serif", fontSize: 11, cursor: "pointer" }}>
                    ↓ Export
                  </button>
                  <button style={{ padding: "6px 14px", background: "rgba(79,142,247,.1)", border: "1px solid rgba(79,142,247,.25)", borderRadius: 7, color: "#7eb8d8", fontFamily: "'Sora',sans-serif", fontSize: 11, cursor: "pointer" }}>
                    ✦ Analyze
                  </button>
                </div>
              </div>

              {/* Meta row */}
              <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                {[
                  { label: "Source", value: selectedDoc.source, color: selectedDoc.sourceColor },
                  { label: "Provider", value: selectedDoc.provider },
                  { label: "Date", value: selectedDoc.date },
                  { label: "Type", value: selectedDoc.type },
                  { label: "Pages", value: selectedDoc.pages },
                ].map((m) => (
                  <div key={m.label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: 9, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", letterSpacing: "1px", textTransform: "uppercase" }}>{m.label}</span>
                    <span style={{ fontSize: 11, color: m.color || "#7eb8d8", fontFamily: "'DM Mono',monospace" }}>{m.value}</span>
                  </div>
                ))}
              </div>

              {/* Tags */}
              <div style={{ marginTop: 10 }}>
                {selectedDoc.tags.map((t) => (
                  <span key={t} className={`tag${t === "urgent" || t === "lymph node" ? " urgent" : ""}`}>{t}</span>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div style={{ flex: 1, overflow: "hidden", padding: "16px 24px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="section-label">Document Preview</div>
              <div className="preview-area">
                {selectedDoc.preview}
              </div>

              {selectedDoc.flagged && (
                <div style={{ padding: "10px 14px", background: "rgba(239,68,68,.07)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 8, display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <span style={{ color: "#ef4444", fontSize: 14 }}>⚠</span>
                  <span style={{ fontSize: 11, color: "#ef4444", fontFamily: "'DM Mono',monospace" }}>
                    This document contains flagged findings requiring follow-up. Review with your care team.
                  </span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#a0b4c8", fontFamily: "'DM Mono',monospace", fontSize: 12 }}>
            Select a document to preview
          </div>
        )}
      </div>
    </div>
      </div>
  );
}