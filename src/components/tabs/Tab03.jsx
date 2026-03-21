import { useState } from "react";

const RECORDS = [
  {
    id: 1, type: "Visit Note", title: "Nephrology Follow-Up",
    date: "Mar 12, 2026", facility: "UMC Transplant Center",
    provider: "Dr. Ari Cohen, MD", tags: ["nephrology", "transplant"],
    epicId: "ENC-20260312-001",
    summary: "Stable creatinine at 1.42. Tacrolimus level therapeutic at 6.2 ng/mL. Continue current immunosuppression. Follow up in 3 months or sooner if creatinine rises.",
    details: ["BP 131/71 — stable", "Tacrolimus 6.2 ng/mL — therapeutic", "Creatinine 1.42 mg/dL — near baseline", "eGFR 58 mL/min — CKD Stage 3a", "Continue Tacrolimus 2mg BID, Mycophenolate 720mg BID", "Hydration counseling provided", "Next visit: June 2026"],
  },
  {
    id: 2, type: "Lab Report", title: "Transplant Labs Panel",
    date: "Mar 10, 2026", facility: "Quest Diagnostics",
    provider: "Order: Dr. Ari Cohen", tags: ["labs", "transplant"],
    epicId: "LAB-20260310-447",
    summary: "Full transplant panel drawn. Tacrolimus, metabolic panel, CBC all within acceptable range. Mild creatinine elevation noted over baseline.",
    details: ["Creatinine 1.42 mg/dL (H)", "BUN 22 mg/dL", "eGFR 58 mL/min", "Tacrolimus 6.2 ng/mL", "WBC 6.2 K/μL", "Hemoglobin 13.8 g/dL", "Potassium 4.1 mEq/L"],
  },
  {
    id: 3, type: "Imaging", title: "Renal Ultrasound",
    date: "Feb 20, 2026", facility: "Baptist Medical Center",
    provider: "Dr. Lisa Tran, Radiology", tags: ["imaging", "kidney"],
    epicId: "IMG-20260220-089",
    summary: "No hydronephrosis. Transplant kidney in RIF appears well-perfused with normal resistive indices. No perinephric fluid collection.",
    details: ["Transplant kidney: 11.4 cm", "Cortical echogenicity: normal", "Resistive index: 0.62", "No hydronephrosis", "No perinephric collection", "Native kidneys: atrophic bilaterally"],
  },
  {
    id: 4, type: "Visit Note", title: "Primary Care Annual",
    date: "Feb 5, 2026", facility: "Hand Family Medicine",
    provider: "Dr. Jonathan Hand, MD", tags: ["primary care"],
    epicId: null,
    summary: "Annual wellness visit. BP trending slightly elevated — adjusted amlodipine from 5mg to 10mg. Skin check clear. Continue current regimen.",
    details: ["BP 148/82 — trending up", "Amlodipine increased to 10mg QD", "Weight 184 lbs — stable", "Skin cancer screening: clear", "Colonoscopy due 2027", "Flu/COVID boosters current"],
  },
  {
    id: 5, type: "Procedure", title: "Kidney Biopsy",
    date: "Oct 14, 2025", facility: "UMC Transplant Center",
    provider: "Dr. Ari Cohen, MD", tags: ["procedure", "biopsy"],
    epicId: "PROC-20251014-022",
    summary: "Protocol biopsy at 12-month post-transplant. No acute rejection. Mild interstitial fibrosis/tubular atrophy (Grade 1). No calcineurin inhibitor toxicity identified.",
    details: ["Indication: Protocol biopsy (12 mo)", "Banff score: i0 t0 g0 v0", "ci1 ct1 — mild IF/TA", "No acute rejection", "No CNI toxicity", "Recommendation: Continue current regimen"],
  },
  {
    id: 6, type: "Hospital", title: "Kidney Transplant Admission",
    date: "Oct 1, 2024", facility: "UMC Transplant Center",
    provider: "Transplant Surgery Team", tags: ["hospital", "transplant", "surgery"],
    epicId: "ADM-20241001-001",
    summary: "Living donor kidney transplant. Right iliac fossa placement. Immediate graft function. 5-day admission, discharged on standard immunosuppression protocol.",
    details: ["Admit: Oct 1 2024 · Discharge: Oct 6 2024", "Procedure: LDKT right iliac fossa", "Donor: Living related", "DGF: No — immediate graft function", "Induction: Basiliximab + methylprednisolone", "Discharge Cr: 1.18 mg/dL", "Immunosuppression initiated: Tac + MMF + Pred"],
  },
  {
    id: 7, type: "Lab Report", title: "Pre-Op Bloodwork",
    date: "Sep 28, 2024", facility: "UMC Lab",
    provider: "Pre-surgical order", tags: ["labs", "pre-op"],
    epicId: "LAB-20240928-201",
    summary: "Pre-transplant type & screen, metabolic panel, coagulation studies, CMV/EBV titers all within acceptable surgical parameters.",
    details: ["Blood type: O+", "Crossmatch: Negative", "CMV IgG: Positive (donor negative)", "EBV IgG: Positive", "PT/INR: 1.0", "Creatinine: 4.8 mg/dL (pre-transplant)", "eGFR: 12 mL/min"],
  },
];

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
  const [filter, setFilter]     = useState("All");
  const [search, setSearch]     = useState("");
  const [selected, setSelected] = useState(RECORDS[0]);
  const [showAdd, setShowAdd]   = useState(false);
  const [addType, setAddType]   = useState(null);

  const filtered = RECORDS.filter(r => {
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
        .filter-chip { padding: 5px 13px; border-radius: 20px; font-size: 11px; border: 1px solid #111e30; background: #0b1220; color: #3d5a7a; cursor: pointer; transition: all .15s; font-family: 'DM Mono',monospace; white-space: nowrap; }
        .filter-chip:hover { color: #7eb8d8; border-color: #1a2f4a; }
        .filter-chip.active { color: #4f8ef7; border-color: #4f8ef7; background: rgba(79,142,247,.08); }
        .type-chip { padding: 5px 13px; border-radius: 20px; font-size: 11px; border: 1px solid #111e30; background: #0b1220; color: #3d5a7a; cursor: pointer; transition: all .15s; font-family: 'DM Mono',monospace; white-space: nowrap; }
        .type-chip:hover { color: #7eb8d8; border-color: #1a2f4a; }
        .type-chip.active { color: #4f8ef7; border-color: #4f8ef7; background: rgba(79,142,247,.08); }
        .detail-line { display: flex; align-items: flex-start; gap: 8px; padding: 8px 0; border-bottom: 1px solid #0d1a28; font-size: 12px; }
        .detail-line:last-child { border-bottom: none; }
        .search-input { background: #0b1220; border: 1px solid #111e30; color: #c4d8ee; padding: 7px 12px 7px 32px; border-radius: 8px; font-family: 'Sora',sans-serif; font-size: 12px; outline: none; width: 220px; transition: border-color .15s; }
        .search-input::placeholder { color: #2d4d6a; }
        .search-input:focus { border-color: #1a2f4a; }
        .modal-input { width: 100%; background: #07090f; border: 1px solid #111e30; color: #c4d8ee; padding: 8px 12px; border-radius: 8px; font-family: 'Sora',sans-serif; font-size: 12px; outline: none; transition: border-color .15s; }
        .modal-input::placeholder { color: #1e3550; }
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
          <span style={{ position: "absolute", left: 10, fontSize: 13, color: "#2d4d6a" }}>⌕</span>
          <input
            className="search-input"
            placeholder="Search records…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ fontSize: 10, color: "#2d4d6a", fontFamily: "'DM Mono',monospace", background: "#0b1220", border: "1px solid #111e30", padding: "5px 12px", borderRadius: 6 }}>
          {RECORDS.length} records · Epic FHIR
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
            <div style={{ padding: 32, textAlign: "center", fontSize: 12, color: "#2d4d6a", fontFamily: "'DM Mono',monospace" }}>
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
                <span style={{ fontSize: 10, color: "#1e3550", fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>{r.date}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#c4d8ee", marginBottom: 3, lineHeight: 1.3 }}>{r.title}</div>
              <div style={{ fontSize: 11, color: "#2d4d6a", fontFamily: "'DM Mono',monospace" }}>{r.facility}</div>
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
                <span style={{ fontSize: 10, color: "#3d5a7a", fontFamily: "'DM Mono',monospace" }}>{selected.date}</span>
              </div>
              <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 24, color: "#dde8f5", fontWeight: 400, letterSpacing: "-0.3px", marginBottom: 10 }}>
                {selected.title}
              </h2>
              <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontSize: 11, color: "#3d5a7a", fontFamily: "'DM Mono',monospace" }}>{selected.facility}</div>
                <div style={{ fontSize: 11, color: "#2d4d6a", fontFamily: "'DM Mono',monospace" }}>{selected.provider}</div>
                {selected.epicId && (
                  <a className="epic-btn" href={`https://mychart.example.com/record/${selected.epicId}`} target="_blank" rel="noreferrer">
                    <span style={{ fontSize: 10 }}>↗</span> Open in Epic
                  </a>
                )}
              </div>
            </div>

            {/* Summary */}
            <div style={{ background: "#0b1220", border: "1px solid #111e30", borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
              <div style={{ fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase", color: "#1e3550", fontFamily: "'DM Mono',monospace", marginBottom: 10 }}>
                Summary
              </div>
              <p style={{ fontSize: 13, color: "#a8c4dc", lineHeight: 1.65 }}>{selected.summary}</p>
            </div>

            {/* Key details */}
            <div style={{ background: "#0b1220", border: "1px solid #111e30", borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
              <div style={{ fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase", color: "#1e3550", fontFamily: "'DM Mono',monospace", marginBottom: 10 }}>
                Key Details
              </div>
              {selected.details.map((d, i) => {
                const isFlag = d.includes("(H)") || d.includes("(L)");
                return (
                  <div key={i} className="detail-line">
                    <span style={{ width: 4, height: 4, borderRadius: "50%", background: isFlag ? "#f59e0b" : "#1e3550", flexShrink: 0, marginTop: 5 }} />
                    <span style={{ color: isFlag ? "#f5c97a" : "#7eb8d8", fontFamily: "'DM Mono',monospace" }}>{d}</span>
                  </div>
                );
              })}
            </div>

            {/* Tags */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {selected.tags.map(t => (
                <span key={t} style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", background: "#0b1220", border: "1px solid #111e30", color: "#2d4d6a", padding: "3px 9px", borderRadius: 4, letterSpacing: "0.5px" }}>
                  #{t}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#1e3550", fontSize: 12, fontFamily: "'DM Mono',monospace" }}>
            Select a record
          </div>
        )}
      </div>

      {/* Add Record modal */}
      {showAdd && (
        <div
          style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}
          onClick={() => setShowAdd(false)}
        >
          <div
            style={{ background: "#0b1220", border: "1px solid #1a2f4a", borderRadius: 16, padding: 28, width: 420, animation: "fadeUp .2s ease both" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, color: "#dde8f5", marginBottom: 20 }}>Add Record</div>

            {[
              { label: "Title",    placeholder: "e.g. Cardiology Follow-Up" },
              { label: "Facility", placeholder: "e.g. Baptist Medical Center" },
              { label: "Provider", placeholder: "e.g. Dr. Jane Smith, MD" },
              { label: "Date",     placeholder: "e.g. Mar 19, 2026" },
            ].map(({ label, placeholder }) => (
              <div key={label} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 9, color: "#1e3550", fontFamily: "'DM Mono',monospace", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
                <input className="modal-input" placeholder={placeholder} />
              </div>
            ))}

            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 9, color: "#1e3550", fontFamily: "'DM Mono',monospace", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 8 }}>Record Type</div>
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
                onClick={() => setShowAdd(false)}
                style={{ padding: "8px 18px", background: "transparent", border: "1px solid #111e30", borderRadius: 8, color: "#3d5a7a", fontFamily: "'Sora',sans-serif", fontSize: 12, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={() => setShowAdd(false)}
                style={{ padding: "8px 18px", background: "rgba(79,142,247,.12)", border: "1px solid rgba(79,142,247,.35)", borderRadius: 8, color: "#4f8ef7", fontFamily: "'Sora',sans-serif", fontSize: 12, cursor: "pointer" }}
              >
                Save Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
