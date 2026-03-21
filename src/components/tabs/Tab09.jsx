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

const DOCUMENTS = [
  {
    id: 1,
    title: "Discharge Summary — Liver Transplant",
    category: "discharge",
    date: "Dec 28, 2024",
    source: "Ochsner Health",
    sourceColor: "#4f8ef7",
    provider: "Transplant Surgery Team",
    type: "Discharge Summary",
    pages: 14,
    tags: ["transplant", "post-op", "critical"],
    preview: `DISCHARGE SUMMARY\n\nPatient: Gregory D Butler  DOB: 10/30/1964\nAdmission: 12/17/2024  Discharge: 12/28/2024\n\nPRIMARY DIAGNOSIS:\nOrthotopic liver transplant — alcoholic cirrhosis with primary biliary cholangitis\n\nHOSPITAL COURSE:\nPatient underwent successful orthotopic liver transplant on 12/17/2024. Post-operative course complicated by acute kidney injury (resolved), steroid-induced hyperglycemia managed with insulin, mechanical ventilation (extubated 12/27/2024), and Clostridioides difficile infection treated with vancomycin.\n\nDISCHARGE MEDICATIONS:\nTacrolimus 1 mg q12h, Mycophenolate 1000 mg BID, Prednisone taper, Bactrim prophylaxis, Valganciclovir 450 mg daily, Furosemide 80 mg BID...\n\nFOLLOW-UP:\nTransplant clinic within 1 week. Labs twice weekly.`,
    flagged: true,
  },
  {
    id: 2,
    title: "Discharge Summary — Fluid Overload Readmission",
    category: "discharge",
    date: "Jan 5, 2025",
    source: "Ochsner Health",
    sourceColor: "#4f8ef7",
    provider: "Patricia Weems, MD",
    type: "Discharge Summary",
    pages: 6,
    tags: ["edema", "readmission"],
    preview: `DISCHARGE SUMMARY\n\nPatient: Gregory D Butler  DOB: 10/30/1964\nAdmission: 01/01/2025  Discharge: 01/05/2025\n\nPRIMARY DIAGNOSIS:\nGeneralized edema due to fluid overload — post liver transplant\n\nHOSPITAL COURSE:\nReadmitted for generalized edema and scrotal swelling in the setting of ongoing C. diff infection and post-transplant hypoalbuminemia. Furosemide 80 mg BID initiated with good response. C. diff treatment continued with vancomycin.\n\nDISCHARGE CONDITION: Stable`,
    flagged: false,
  },
  {
    id: 3,
    title: "Discharge Summary — Gouty Tophus Resection",
    category: "discharge",
    date: "Apr 29, 2020",
    source: "Hattiesburg Clinic / FGH",
    sourceColor: "#a78bfa",
    provider: "Constantine Charoglu, MD",
    type: "Discharge Summary",
    pages: 3,
    tags: ["gout", "surgery"],
    preview: `DISCHARGE SUMMARY\n\nPatient: Gregory D Butler  DOB: 10/30/1964\nProcedure: Resection right index finger gouty tophus\nDate: 04/28/2020  Discharge: 04/29/2020\n\nPATHOLOGY (S20-2265):\nTissue right index finger, resection: Polarized crystalline deposits with granulomatous inflammation consistent with gouty tophus.\n\nDISCHARGE CONDITION: Good`,
    flagged: false,
  },
  {
    id: 4,
    title: "CT Abdomen/Pelvis w/IV Contrast",
    category: "imaging",
    date: "Feb 23, 2025",
    source: "SCRMC",
    sourceColor: "#10b981",
    provider: "Vistasp Daruwalla, MD",
    type: "Radiology Report",
    pages: 2,
    tags: ["CT", "lymph node", "urgent"],
    preview: `RADIOLOGY REPORT\n\nExam: CT Abdomen and Pelvis with IV Contrast\nDate: 02/23/2025\nComparison: 05/31/2024\n\nFINDINGS:\nPatient has known history of hepatic transplant. Surgical clips around the transplanted right hepatic lobe noted.\n\n⚠ SIGNIFICANT FINDING: 2.8 x 3 x 2.5 cm porta hepatic node with central hypodensity. Small adjacent 7 mm nodule noted.\n\nSpleen mildly enlarged at 15 x 6 cm. Multiple varices with splenorenal shunt. No ascites. Right lateral abdominal wall hernia (fat-containing). Bibasilar atelectasis. L4-5 laminectomy changes.\n\nIMPRESSION:\n1. Enlarged necrotic lymph node 3 cm porta hepatic region ⚠\n2. Splenomegaly with varices\n3. Right abdominal wall hernia`,
    flagged: true,
  },
  {
    id: 5,
    title: "Left Hip X-Ray (2–3 Views)",
    category: "imaging",
    date: "Mar 12, 2025",
    source: "SCRMC",
    sourceColor: "#10b981",
    provider: "D. Frederick Vial, MD",
    type: "Radiology Report",
    pages: 1,
    tags: ["X-ray", "hip", "DJD"],
    preview: `RADIOLOGY REPORT\n\nExam: XR Hip 2-3 Views Left\nDate: 03/12/2025\nOrdering: Baley Smith, NP\n\nFINDINGS:\nDegenerative changes present left hip joint. No fracture or dislocation. No focal bone lesion. Ossicle noted adjacent to acetabular roof. L4-5 laminectomy changes noted.\n\nIMPRESSION: DJD\n\n***** Final *****\nSigned: Vial, D Frederick MD`,
    flagged: false,
  },
  {
    id: 6,
    title: "Surgical Pathology — Gouty Tophus",
    category: "operative",
    date: "Apr 30, 2020",
    source: "Hattiesburg Clinic / FGH",
    sourceColor: "#a78bfa",
    provider: "Timothy L. Cole, MD",
    type: "Pathology Report",
    pages: 2,
    tags: ["pathology", "gout"],
    preview: `SURGICAL PATHOLOGY REPORT\nCase: S20-2265\n\nSpecimen: Finger, Right — Right index finger gouty tofi\nCollected: 04/28/2020\n\nGROSS DESCRIPTION:\nReceived in alcohol labeled "Butler, right index finger gouty tofi" is a 1.2 x 0.8 x 0.5 cm orange-tan rubbery tissue.\n\nFINAL DIAGNOSIS:\nTissue right index finger, resection: Polarized crystalline deposits with granulomatous inflammation consistent with gouty tophus.\n\nSigned: Timothy L. Cole, MD  04/30/2020`,
    flagged: false,
  },
  {
    id: 7,
    title: "Endocrinology Progress Note — Hypercalcemia",
    category: "clinical",
    date: "Jan 6, 2025",
    source: "Ochsner Health",
    sourceColor: "#4f8ef7",
    provider: "Pavel Itersky, DO",
    type: "Progress Note",
    pages: 4,
    tags: ["endocrinology", "hypercalcemia", "hyperparathyroidism"],
    preview: `PROGRESS NOTE — Endocrinology\nDate: 01/06/2025\nProvider: Pavel Itersky, DO\n\nCC: Hypercalcemia follow-up post liver transplant\n\nHISTORY:\nPMH includes Alcohol-Associated Cirrhosis and PBC s/p liver transplant 12/17/2024. Notable for elevated calcium since 08/2024 (Corrected Ca 13.7, PTH 113.7, Vit D 11).\n\nASSESSMENT & PLAN:\n• Hypercalcemia: Corrected Ca now 10.4. Recheck PTH, Ca, Vit D with next labs.\n• Vitamin D insufficiency: Continue 50,000 units weekly.\n• Steroid-induced hyperglycemia: Taper prednisone 10→5→0 mg. Continue 3U novolog + SSI.\n\nSigned: Pavel Itersky DO, Brandy Panunti MD`,
    flagged: false,
  },
  {
    id: 8,
    title: "Urology Progress Note — Erectile Dysfunction",
    category: "clinical",
    date: "Dec 29, 2020",
    source: "Hattiesburg Clinic / FGH",
    sourceColor: "#a78bfa",
    provider: "Sean Douglas, MD",
    type: "Progress Note",
    pages: 3,
    tags: ["urology", "follow-up"],
    preview: `PROGRESS NOTE — Urology\nDate: 12/29/2020\nProvider: Sean Douglas, MD\n\nCC: Erectile dysfunction follow-up\n\nVITALS: BP 150/84  HR 82  Wt 235 lb\n\nASSESSMENT:\n56 y.o. male with erectile dysfunction, doing well on triple combo therapy. Continues PEP injections PRN.\n\nPLAN:\nContinue triple combo oral + PEP injections as needed. Cannot be combined within 72 hours. Discussed priapism risk.\n\nSigned: Sean P. Douglas, MD`,
    flagged: false,
  },
  {
    id: 9,
    title: "Lab Report — CBC/CMP/Tacrolimus",
    category: "labs",
    date: "Feb 24, 2026",
    source: "SCRMC / LabCorp",
    sourceColor: "#10b981",
    provider: "Hannah Ramsey, DO",
    type: "Lab Report",
    pages: 5,
    tags: ["CBC", "CMP", "tacrolimus", "most recent"],
    preview: `LAB REPORT\nDate: 02/24/2026\nOrdering: Dr. Hannah Ramsey, DO\nPerformed: SCC Ellisville Clinic Lab / LabCorp\n\nTACROLIMUS: 5.8 ng/mL ✓ (range 5.0–20.0)\n\nCBC WITH DIFFERENTIAL:\nWBC 6.8 ✓ | Hgb 15.4 ✓ | Hct 44.6 ✓\nPlatelets 119 (L) ⚠ | Lymphocytes 19% (L) ⚠\nMonocytes 10% (H) ⚠ | RDW 14.5 (H)\n\nCOMPREHENSIVE METABOLIC PANEL:\nNa 138 ✓ | K 4.2 ✓ | Cr 0.74 ✓ | eGFR 103.1 ✓\nAlbumin 4.3 ✓ | Total Bili 0.7 ✓ | ALP 84 ✓\nGlucose 96 ✓ | Anion Gap 4 (L) ⚠\n\nURINALYSIS: Normal`,
    flagged: false,
  },
  {
    id: 10,
    title: "Lab Report — Pre-Transplant Hepatic Panel",
    category: "labs",
    date: "Dec 13, 2024",
    source: "SCRMC / External Lab",
    sourceColor: "#10b981",
    provider: "Donnie Scoggin, FNP",
    type: "Lab Report",
    pages: 3,
    tags: ["hepatic", "pre-transplant", "coagulopathy"],
    preview: `LAB REPORT — Pre-Transplant\nDate: 12/13/2024\nOrdering: Donnie Scoggin, FNP\n\nHEPATIC FUNCTION PANEL:\nTotal Bili 6.6 (H) ⚠ | Direct Bili 2.5 (H) ⚠\nALP 172 (H) ⚠ | Albumin 2.8 (L) ⚠\n\nCOAGULATION:\nPT 21.9 (H) ⚠ | INR 1.8 ⚠ | aPTT 43.5 (H) ⚠\n\nBASIC METABOLIC:\nNa 134 (L) ⚠ | Ca 8.4 (L) ⚠\nCr 0.8 | eGFR 101`,
    flagged: false,
  },
  {
    id: 11,
    title: "Referral — Transplant Hepatology",
    category: "referrals",
    date: "Jul 12, 2024",
    source: "Ochsner Health",
    sourceColor: "#4f8ef7",
    provider: "Mariana Zapata, MD",
    type: "Referral",
    pages: 1,
    tags: ["transplant", "referral"],
    preview: `REFERRAL / AUTHORIZATION\n\nPatient: Gregory D Butler\nDate: 07/12/2024\nReferring to: Transplant Hepatology — Mariana Zapata, MD\n\nINDICATION:\nAlcoholic cirrhosis with primary biliary cholangitis. Transplant evaluation initiated.\n\nReferral ID: 34911900\nVisits Requested: 1  Visits Authorized: 1`,
    flagged: false,
  },
  {
    id: 12,
    title: "Lab Report — Lipid Panel / PSA",
    category: "labs",
    date: "Feb 19, 2025",
    source: "SCRMC / External Lab",
    sourceColor: "#10b981",
    provider: "Donnie Scoggin, FNP",
    type: "Lab Report",
    pages: 2,
    tags: ["lipids", "PSA", "preventive"],
    preview: `LAB REPORT\nDate: 02/19/2025\n\nLIPID PANEL:\nTotal Cholesterol 174 ✓ | LDL 97 ✓\nHDL 54 ✓ | Triglycerides 117 ✓\n\nPSA: 0.5 ng/mL ✓ (range 0–4.0)`,
    flagged: false,
  },
];

const SOURCE_FILTERS = ["All Sources", "Ochsner Health", "Hattiesburg Clinic / FGH", "SCRMC"];

export default function DocumentsTab() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDoc, setSelectedDoc] = useState(DOCUMENTS[0]);
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
        .doc-cat { display:flex; align-items:center; gap:9px; padding:7px 12px; border-radius:8px; cursor:pointer; transition:all .15s; font-size:12px; color:#3d5a7a; user-select:none; }
        .doc-cat:hover { background:rgba(79,142,247,.05); color:#7eb8d8; }
        .doc-cat.active { background:rgba(79,142,247,.08); color:#4f8ef7; border-left: 2px solid #4f8ef7; }
        .doc-row { padding:12px 14px; border-radius:10px; border:1px solid #0d1a28; background:#080c14; cursor:pointer; transition:all .15s; margin-bottom:6px; animation:fadeUp .3s ease both; }
        .doc-row:hover { border-color:#111e30; background:#0a0f1c; }
        .doc-row.selected { border-color:#1a2f4a; background:#0b1220; }
        .tag { display:inline-block; padding:2px 7px; border-radius:10px; font-size:9px; font-family:'DM Mono',monospace; background:rgba(79,142,247,.1); color:#4f8ef7; border:1px solid rgba(79,142,247,.2); margin-right:4px; }
        .tag.urgent { background:rgba(239,68,68,.1); color:#ef4444; border-color:rgba(239,68,68,.2); }
        .doc-search { background:#080c14; border:1px solid #111e30; border-radius:8px; padding:8px 12px; color:#a8c4dc; font-family:'Sora',sans-serif; font-size:12px; width:100%; outline:none; transition:border-color .15s; }
        .doc-search:focus { border-color:#1a2f4a; }
        .doc-search::placeholder { color:#1e3550; }
        .section-label { font-size:10px; letter-spacing:1.5px; text-transform:uppercase; color:#1e3550; font-family:'DM Mono',monospace; margin-bottom:10px; }
        .preview-area { font-family:'DM Mono',monospace; font-size:11px; color:#3d5a7a; line-height:1.8; white-space:pre-wrap; background:#080c14; border:1px solid #0d1a28; border-radius:10px; padding:18px; overflow-y:auto; flex:1; }
        .filter-chip { padding:5px 12px; border-radius:20px; font-size:11px; font-family:'DM Mono',monospace; cursor:pointer; transition:all .15s; border:1px solid #111e30; background:transparent; color:#3d5a7a; }
        .filter-chip.active { border-color:rgba(79,142,247,.4); background:rgba(79,142,247,.08); color:#7eb8d8; }
        ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-thumb { background:#1a2840; border-radius:4px; }
        @media print { .no-print { display:none !important; } aside { display:none !important; } body { background:white !important; } }
      `}</style>

      {/* Topbar */}
      <div style={{ height: 54, background: "#080c14", borderBottom: "1px solid #0d1a28", display: "flex", alignItems: "center", padding: "0 24px", gap: 12, flexShrink: 0 }}>
        <img src={INTELLITRAX_LOGO} alt="IntelliTrax" style={{ width: 185, height: 65, objectFit: "contain" }} />
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
            <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: selectedCategory === cat.id ? "#4f8ef7" : "#1e3550" }}>
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
          <div style={{ fontSize: 10, color: "#1e3550", fontFamily: "'DM Mono',monospace", marginBottom: 10, paddingLeft: 4 }}>
            {filtered.length} document{filtered.length !== 1 ? "s" : ""}
          </div>
          {filtered.length === 0 && (
            <div style={{ padding: 20, textAlign: "center", color: "#1e3550", fontSize: 12, fontFamily: "'DM Mono',monospace" }}>
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
                <span style={{ fontSize: 10, color: "#2d4d6a", fontFamily: "'DM Mono',monospace" }}>{doc.source}</span>
                <span style={{ fontSize: 10, color: "#1e3550", fontFamily: "'DM Mono',monospace", marginLeft: "auto" }}>{doc.date}</span>
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
                  <button style={{ padding: "6px 14px", background: "transparent", border: "1px solid #111e30", borderRadius: 7, color: "#3d5a7a", fontFamily: "'Sora',sans-serif", fontSize: 11, cursor: "pointer" }}>
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
                    <span style={{ fontSize: 9, color: "#1e3550", fontFamily: "'DM Mono',monospace", letterSpacing: "1px", textTransform: "uppercase" }}>{m.label}</span>
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
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#1e3550", fontFamily: "'DM Mono',monospace", fontSize: 12 }}>
            Select a document to preview
          </div>
        )}
      </div>
    </div>
      </div>
  );
}