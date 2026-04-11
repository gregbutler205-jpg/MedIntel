import INTELLITRAX_LOGO from "../../assets/logo.png";
import { useState, useEffect } from "react";

const NAV = [
  { id: "dashboard", icon: "⬡", label: "Dashboard" },
  { id: "profile", icon: "◯", label: "Profile" },
  { id: "records", icon: "▤", label: "Records" },
  { id: "medications", icon: "⬡", label: "Medications" },
  { id: "labs", icon: "◈", label: "Labs & Trends" },
  { id: "vitals", icon: "♡", label: "Vitals" },
  { id: "symptoms", icon: "◎", label: "Symptoms" },
  { id: "careplan", icon: "◷", label: "Care Plan" },
  { id: "documents", icon: "▣", label: "Documents" },
  { id: "notes", icon: "◻", label: "Notes" },
  { id: "ai", icon: "✦", label: "AI Analysis" },
  { id: "import", icon: "↓", label: "Import Records" },
  { id: "backup", icon: "◈", label: "Data & Backup" },
];


// Range bar — amber outside, green inside, badge showing current value
function RangeBar({ value, low, high, compact = false }) {
  if (value === null) return <div style={{ width: compact ? 90 : "100%", height: compact ? 28 : 44 }} />;
  // Display window: 20% padding on each side beyond low/high
  const span = high - low || 1;
  const pad = span * 0.45;
  const minD = low - pad, maxD = high + pad;
  const total = maxD - minD;
  const lowPct  = ((low  - minD) / total) * 100;
  const highPct = ((high - minD) / total) * 100;
  const valPct  = Math.min(98, Math.max(2, ((value - minD) / total) * 100));
  const inRange = value >= low && value <= high;
  const badgeColor = inRange ? "#10b981" : "#f59e0b";
  const h = compact ? 6 : 7;
  const badgeY = compact ? 0 : 0;

  return (
    <div style={{ width: compact ? 90 : "100%", position: "relative", paddingTop: compact ? 18 : 20, flexShrink: 0 }}>
      {/* Value badge */}
      <div style={{
        position: "absolute", top: badgeY, left: `${valPct}%`, transform: "translateX(-50%)",
        background: badgeColor, color: "#fff", fontSize: compact ? 8.5 : 9.5,
        fontWeight: 700, fontFamily: "'DM Mono',monospace",
        padding: compact ? "1px 5px" : "2px 6px", borderRadius: 20,
        whiteSpace: "nowrap", lineHeight: 1.4,
        boxShadow: `0 0 8px ${badgeColor}60`,
      }}>{value}</div>
      {/* Caret */}
      <div style={{
        position: "absolute", top: compact ? 14 : 16, left: `${valPct}%`, transform: "translateX(-50%)",
        width: 0, height: 0,
        borderLeft: "4px solid transparent", borderRight: "4px solid transparent",
        borderTop: `4px solid ${badgeColor}`,
      }} />
      {/* Track */}
      <div style={{ position: "relative", height: h, borderRadius: h, overflow: "hidden", background: "#f59e0b55" }}>
        {/* Green normal zone */}
        <div style={{
          position: "absolute", left: `${lowPct}%`, width: `${highPct - lowPct}%`,
          height: "100%", background: "#10b981",
        }} />
      </div>
      {/* Labels */}
      {!compact && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontSize: 8, color: "#98afc4", fontFamily: "'DM Mono',monospace" }}>{low}</span>
          <span style={{ fontSize: 8, color: "#98afc4", fontFamily: "'DM Mono',monospace" }}>{high}</span>
        </div>
      )}
    </div>
  );
}

// Full trend chart
function TrendChart({ lab, color, monthLabels }) {
  const pts = lab.values.map((v, i) => ({ v, i })).filter(x => x.v !== null);
  if (pts.length < 2) return null;
  const allV = pts.map(x => x.v);
  const minV = Math.min(...allV, lab.low) * 0.93;
  const maxV = Math.max(...allV, lab.high) * 1.07;
  const rng = maxV - minV || 1;
  const W = 500, H = 160, PL = 44, PR = 12, PT = 14, PB = 32;
  const cW = W - PL - PR, cH = H - PT - PB;
  const n = lab.values.length;
  const toX = i => PL + (i / (n - 1)) * cW;
  const toY = v => PT + cH - ((v - minV) / rng) * cH;
  const refLY = toY(lab.low), refHY = toY(lab.high);
  const polyPts = pts.map(({ v, i }) => `${toX(i)},${toY(v)}`).join(" ");
  const areaPts = `${toX(pts[0].i)},${PT + cH} ${polyPts} ${toX(pts[pts.length - 1].i)},${PT + cH}`;
  const yTicks = [minV, lab.low, lab.high, maxV].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      {/* Reference band */}
      <rect x={PL} y={refHY} width={cW} height={refLY - refHY} fill="rgba(16,185,129,0.06)" />
      <line x1={PL} y1={refHY} x2={PL + cW} y2={refHY} stroke="#10b981" strokeWidth={0.8} strokeDasharray="4,3" opacity={0.5} />
      <line x1={PL} y1={refLY} x2={PL + cW} y2={refLY} stroke="#10b981" strokeWidth={0.8} strokeDasharray="4,3" opacity={0.5} />
      {/* Range labels */}
      <text x={PL - 4} y={refHY + 3} textAnchor="end" fontSize={8} fill="#10b981" fontFamily="DM Mono" opacity={0.7}>{lab.high}</text>
      <text x={PL - 4} y={refLY + 3} textAnchor="end" fontSize={8} fill="#10b981" fontFamily="DM Mono" opacity={0.7}>{lab.low}</text>
      {/* Y grid lines */}
      {yTicks.map(v => (
        <line key={v} x1={PL} y1={toY(v)} x2={PL + cW} y2={toY(v)} stroke="#0d1a28" strokeWidth={0.5} />
      ))}
      {/* Area */}
      <polygon points={areaPts} fill={`${color}14`} />
      {/* Line */}
      <polyline points={polyPts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {/* Points */}
      {pts.map(({ v, i }) => {
        const bad = v < lab.low || v > lab.high;
        return (
          <g key={i}>
            <circle cx={toX(i)} cy={toY(v)} r={4} fill={bad ? "#ef4444" : color} />
            {bad && <circle cx={toX(i)} cy={toY(v)} r={7} fill="none" stroke="#ef4444" strokeWidth={1} opacity={0.4} />}
          </g>
        );
      })}
      {/* X labels */}
      {monthLabels.map((m, i) => (
        <text key={i} x={toX(i)} y={H - 4} textAnchor="middle" fontSize={7.5} fill="#a0b4c8" fontFamily="DM Mono">{m}</text>
      ))}
    </svg>
  );
}

// Parse "0.7-1.3" or "70 - 100" or "3.4–5.1" into {low, high}
function parseRefRange(str) {
  if (!str) return { low: null, high: null };
  const m = str.match(/(\d+\.?\d*)\s*[-–to]+\s*(\d+\.?\d*)/i);
  return m ? { low: parseFloat(m[1]), high: parseFloat(m[2]) } : { low: null, high: null };
}

export default function App({ onNavChange }) {
  const [activeNav, setActiveNav] = useState("labs");
  const handleNav = (id) => { if (id !== "labs") { onNavChange?.(id); } else { setActiveNav(id); } };
  const [selectedImportedLab, setSelectedImportedLab] = useState(null);
  const [time, setTime] = useState(new Date());
  const [importedLabs, setImportedLabs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("mi_labs") || "[]"); } catch { return []; }
  });
  const [importedCatFilter, setImportedCatFilter] = useState("All");
  const [aiAnalysis, setAiAnalysis]     = useState("");
  const [aiAnalyzing, setAiAnalyzing]   = useState(false);
  const [aiError, setAiError]           = useState("");

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // Refresh imported labs when component mounts
  useEffect(() => {
    try {
      const stored = localStorage.getItem("mi_labs");
      if (stored) setImportedLabs(JSON.parse(stored));
    } catch {}
  }, []);

  const fmt = d => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const fmtDate = d => d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  // Deduplicated: latest entry per test name
  const dedupedLabs = (() => {
    const latest = {};
    importedLabs.forEach(lab => {
      const key = (lab.name || "").toLowerCase().trim();
      if (!key) return;
      if (!latest[key] || new Date(lab.date || 0) > new Date(latest[key].date || 0)) {
        latest[key] = lab;
      }
    });
    return Object.values(latest);
  })();
  const flaggedCount = dedupedLabs.filter(l => l.flag).length;
  const normalCount  = dedupedLabs.length - flaggedCount;

  const selectImportedLab = (lab) => { setSelectedImportedLab(lab); };

  const analyzeAllLabs = async () => {
    const apiKey = localStorage.getItem("mi_ak");
    if (!apiKey) { setAiError("API key required — go to Data & Backup to add it."); return; }
    setAiAnalyzing(true); setAiAnalysis(""); setAiError("");
    try {
      // Pull full medical context from localStorage
      const safeRead = (key) => { try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; } };
      const conditions = safeRead("mi_conditions");
      const surgeries  = safeRead("mi_surgeries");
      const careTeam   = safeRead("mi_care_team");
      const meds       = safeRead("mi_meds_full");

      const condStr = conditions.length > 0
        ? conditions.map(c => `- ${c.name}${c.status ? ` (${c.status})` : ""}${c.severity ? `, ${c.severity}` : ""}`).join("\n")
        : "None recorded";

      const surgStr = surgeries.length > 0
        ? surgeries.map(s => `- ${s.procedure}${s.date ? ` (${s.date})` : ""}${s.surgeon ? ` — ${s.surgeon}` : ""}`).join("\n")
        : "None recorded";

      const medsStr = meds.length > 0
        ? meds.filter(m => m.status !== "inactive").map(m => `- ${m.name}${m.dose ? ` ${m.dose}` : ""}${m.frequency ? `, ${m.frequency}` : ""}${m.category ? ` [${m.category}]` : ""}`).join("\n")
        : "None recorded";

      // Build care team string, highlighting liver/hepatology contact
      const careStr = careTeam.length > 0
        ? careTeam.map(d => `- ${d.name}${d.role ? `, ${d.role}` : ""}${d.facility ? ` — ${d.facility}` : ""}`).join("\n")
        : "- Dr. Mariana Zapata, Hepatology Lead\n- Dr. Jonathan Hand, PCP";

      // Find hepatology lead for specific reference in prompt
      const hepatoDoc = careTeam.find(d => /hepat/i.test(d.role) || /hepat/i.test(d.name)) || { name: "Dr. Mariana Zapata" };
      const liverDoc = hepatoDoc.name;

      // Build lab summary from most recent imported results (deduplicated by name — latest per test)
      const dedupForAI = {};
      [...importedLabs].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).forEach(l => {
        const key = (l.name || "").toLowerCase().trim();
        if (key && !dedupForAI[key]) dedupForAI[key] = l;
      });
      const labSummary = Object.values(dedupForAI).slice(0, 60).map(l =>
        `${l.name}: ${l.value} ${l.unit}${l.refRange ? ` (ref ${l.refRange})` : ""}${l.flag ? " — OUT OF RANGE" : ""}${l.category ? ` [${l.category}]` : ""}${l.date ? ` on ${l.date}` : ""}${l.facility ? ` at ${l.facility}` : ""}`
      ).join("\n");

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-opus-4-5",
          max_tokens: 1800,
          messages: [{
            role: "user",
            content: `You are an intelligent health assistant analyzing lab results for Greg Butler. You have his full medical profile below — cross-reference it when explaining findings. Do NOT ask about conditions, diagnoses, or medications that are already listed — treat them as known facts.

━━━ PATIENT MEDICAL PROFILE ━━━

ACTIVE CONDITIONS:
${condStr}

SURGICAL HISTORY:
${surgStr}

ACTIVE MEDICATIONS:
${medsStr}

CARE TEAM:
${careStr}
Note: For any findings related to the liver, bile ducts, or hepatic function, reference ${liverDoc} as the appropriate contact.

━━━ LAB RESULTS (most recent per test) ━━━
${labSummary || "No imported labs available yet. Please import lab results using the Import Records tab."}

━━━ INSTRUCTIONS ━━━
Analyze the labs above in the context of Greg's profile. Cross-reference medications and surgical history with any abnormal findings. For each concern, name the specific doctor from the care team best suited to address it.

Format your response with:
1) Key Concerns (out-of-range values — explain in context of his conditions/meds/history)
2) Values to Watch (borderline or notable)
3) Questions for Care Team (specific, directed to the right doctor by name)

Keep it under 500 words. Be direct and clinically specific.`,
          }],
        }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setAiAnalysis(data.content[0].text.trim());
    } catch (e) {
      setAiError(e.message || "Analysis failed.");
    } finally {
      setAiAnalyzing(false);
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#07090f", color: "#d4e2f0", fontFamily: "'Sora', sans-serif", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #1a2840; border-radius: 4px; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        @keyframes slideInRight { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:none; } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }
        .nav-item { display:flex; align-items:center; gap:10px; padding:8px 16px; cursor:pointer; font-size:12.5px; color:#b0c4d8; border-left:2px solid transparent; transition:all .15s; user-select:none; }
        .nav-item:hover { color:#7eb8d8; background:rgba(79,142,247,.04); }
        .nav-item.active { color:#4f8ef7; background:rgba(79,142,247,.08); border-left-color:#4f8ef7; }
        .nav-icon { font-size:13px; width:16px; text-align:center; flex-shrink:0; }
        .live-dot { width:6px; height:6px; border-radius:50%; background:#10b981; animation:pulse 2s infinite; flex-shrink:0; }
        .section-label { font-size:10px; letter-spacing:1.5px; text-transform:uppercase; color:#a0b4c8; font-family:'DM Mono',monospace; margin-bottom:10px; }
        .lab-row { display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:9px; background:#0b1220; border:1px solid #111e30; margin-bottom:5px; cursor:pointer; transition:all .12s; animation:fadeUp .3s ease both; }
        .lab-row:hover { border-color:#1a2f4a; }
        .lab-row.sel { border-color:#4f8ef7; background:rgba(79,142,247,.07); }
        .time-btn { padding:4px 10px; border-radius:6px; border:none; font-size:10px; font-family:'DM Mono',monospace; cursor:pointer; background:#0f1e30; color:#7eb8d8; font-weight:500; }
        .time-btn:hover { background:#162840; }
        .time-btn.on { background:#4f8ef7; color:#fff; }
        .ai-panel { position:absolute; top:0; right:0; width:300px; height:100%; background:#080c14; border-left:1px solid #0d1a28; display:flex; flex-direction:column; animation:slideInRight .22s ease both; z-index:10; }
        .drow { display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #0d1a28; }
        .drow:last-child { border-bottom:none; }
        .ai-q-btn { width:100%; padding:9px 12px; background:#0f1e30; border:1px solid #1a3050; border-radius:8px; color:#7eb8d8; font-family:'Sora',sans-serif; font-size:11px; cursor:pointer; display:flex; align-items:center; gap:7px; text-align:left; font-weight:500; margin-bottom:7px; }
        .ai-q-btn:hover { background:#162840; color:#a8c4dc; }
      `}</style>

      {/* ── Sidebar ── */}
      <aside style={{ width: 210, minWidth: 210, background: "#080c14", borderRight: "1px solid #0d1a28", display: "flex", flexDirection: "column", height: "100vh" }}>
        <div style={{ padding: "20px 14px", borderBottom: "1px solid #0d1a28", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src={INTELLITRAX_LOGO} alt="IntelliTrax" style={{ width: 185, height: 65, objectFit: "contain" }} />
        </div>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #0d1a28" }}>
          <div style={{ fontSize: 10, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", marginBottom: 4 }}>PATIENT</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#c4d8ee" }}>Greg Butler</div>
          <div style={{ fontSize: 11, color: "#98afc4", marginTop: 2 }}>Transplant · Immunosuppressed</div>
        </div>
        <nav style={{ flex: 1, overflowY: "auto", padding: "10px 0" }}>
          <div style={{ padding: "8px 16px 4px", fontSize: 9, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", letterSpacing: "1.5px", textTransform: "uppercase" }}>CORE</div>
          {NAV.slice(0, 8).map(({ id, icon, label }) => (
            <div key={id} className={`nav-item ${activeNav === id ? "active" : ""}`} onClick={() => handleNav(id)}>
              <span className="nav-icon">{icon}</span><span>{label}</span>
            </div>
          ))}
          <div style={{ padding: "12px 16px 4px", fontSize: 9, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", letterSpacing: "1.5px", textTransform: "uppercase" }}>SYSTEM</div>
          {NAV.slice(8).map(({ id, icon, label }) => (
            <div key={id} className={`nav-item ${activeNav === id ? "active" : ""}`} onClick={() => handleNav(id)}>
              <span className="nav-icon">{icon}</span><span>{label}</span>
              {id === "ai" && <span style={{ marginLeft: "auto", fontSize: 8, background: "#4f8ef7", color: "#fff", padding: "1px 5px", borderRadius: 8, fontFamily: "'DM Mono',monospace" }}>AI</span>}
            </div>
          ))}
        </nav>
        <div style={{ padding: "12px 16px", borderTop: "1px solid #0d1a28" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 10, color: "#1e4030", fontFamily: "'DM Mono',monospace" }}>
            <div className="live-dot" />All systems nominal
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Topbar */}
        <div style={{ height: 54, background: "#080c14", borderBottom: "1px solid #0d1a28", display: "flex", alignItems: "center", padding: "0 28px", gap: 16, flexShrink: 0 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
            <div className="live-dot" />
            <span style={{ fontSize: 11, color: "#98afc4", fontFamily: "'DM Mono',monospace" }}>{fmtDate(time)} · {fmt(time)}</span>
          </div>
          <div style={{ fontSize: 11, color: "#98afc4", fontFamily: "'DM Mono',monospace", background: "#0b1220", border: "1px solid #111e30", padding: "5px 12px", borderRadius: 6 }}>Last import: Mar 12, 2026</div>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#4f8ef7,#a78bfa)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#fff" }}>G</div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>

          {/* Left column — lab list */}
          <div style={{ width: 292, minWidth: 292, borderRight: "1px solid #0d1a28", overflowY: "auto", padding: "20px 14px 20px 16px" }}>
            <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 22, color: "#dde8f5", fontWeight: 400, letterSpacing: "-0.4px", marginBottom: 4 }}>Labs & Trends</h1>
            <p style={{ fontSize: 11, color: "#98afc4", fontFamily: "'DM Mono',monospace", marginBottom: 16 }}>
              {dedupedLabs.length > 0 ? `${dedupedLabs.length} tests · ${flaggedCount} flagged` : "No imported labs yet"}
            </p>

            {/* Summary chips */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
              <div style={{ background: "#0b1220", border: "1px solid #111e30", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: flaggedCount > 0 ? "#ef4444" : "#a0b4c8", lineHeight: 1, marginBottom: 3 }}>{flaggedCount}</div>
                <div style={{ fontSize: 10, color: "#7eb8d8", fontWeight: 600 }}>Flagged</div>
                <div style={{ fontSize: 9, color: "#98afc4", fontFamily: "'DM Mono',monospace" }}>out of range</div>
              </div>
              <div style={{ background: "#0b1220", border: "1px solid #111e30", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#10b981", lineHeight: 1, marginBottom: 3 }}>{normalCount}</div>
                <div style={{ fontSize: 10, color: "#7eb8d8", fontWeight: 600 }}>Normal</div>
                <div style={{ fontSize: 9, color: "#98afc4", fontFamily: "'DM Mono',monospace" }}>within range</div>
              </div>
            </div>

            {/* ── Imported Labs (deduplicated — latest per test name) ── */}
            {importedLabs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 12px", color: "#6a8090", fontSize: 11, fontFamily: "'DM Mono',monospace", lineHeight: 1.7 }}>
                No lab results imported yet.<br />
                Use Import Records to upload a PDF lab report.
              </div>
            ) : (
              <>
                {/* Category filter */}
                {(() => {
                  const cats = ["All", ...Array.from(new Set(dedupedLabs.map(l => l.category || "Other"))).sort()];
                  const visible = importedCatFilter === "All"
                    ? dedupedLabs
                    : dedupedLabs.filter(l => (l.category || "Other") === importedCatFilter);
                  const sorted = [...visible].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
                  return (
                    <>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
                        {cats.map(c => (
                          <button key={c} onClick={() => setImportedCatFilter(c)}
                            style={{ padding: "2px 8px", borderRadius: 5, border: "none", cursor: "pointer", fontSize: 9, fontFamily: "'DM Mono',monospace",
                              background: importedCatFilter === c ? "#4f8ef7" : "#0f1e30",
                              color: importedCatFilter === c ? "#fff" : "#7eb8d8" }}>
                            {c}
                          </button>
                        ))}
                      </div>
                      {sorted.map((lab, i) => {
                        const { low, high } = parseRefRange(lab.refRange);
                        const val = parseFloat(lab.value);
                        const isSelected = selectedImportedLab && (selectedImportedLab.name || "").toLowerCase() === (lab.name || "").toLowerCase();
                        // Count how many readings exist for this test
                        const histCount = importedLabs.filter(l => (l.name || "").toLowerCase() === (lab.name || "").toLowerCase()).length;
                        return (
                          <div key={i} className={`lab-row ${isSelected ? "sel" : ""}`}
                            onClick={() => selectImportedLab(lab)}
                            style={{ animationDelay: `${i * 18}ms`, flexDirection: "column", gap: 3, cursor: "pointer" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 6, height: 6, borderRadius: "50%", background: lab.flag ? "#f59e0b" : "#10b981", flexShrink: 0 }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: "#c4d8ee" }}>{lab.name}</div>
                                <div style={{ fontSize: 9, color: "#98afc4", fontFamily: "'DM Mono',monospace" }}>
                                  {lab.date || "—"}{histCount > 1 ? ` · ${histCount} readings` : ""}
                                </div>
                              </div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: lab.flag ? "#f59e0b" : "#10b981", flexShrink: 0 }}>
                                {lab.value} <span style={{ fontSize: 9, color: "#98afc4", fontWeight: 400 }}>{lab.unit}</span>
                              </div>
                            </div>
                            {low !== null && high !== null && !isNaN(val) && (
                              <RangeBar value={val} low={low} high={high} compact />
                            )}
                            {lab.refRange && (low === null || high === null) && (
                              <div style={{ fontSize: 8, color: "#6a8090", fontFamily: "'DM Mono',monospace", paddingLeft: 14 }}>ref: {lab.refRange}</div>
                            )}
                          </div>
                        );
                      })}
                    </>
                  );
                })()}
              </>
            )}
          </div>

          {/* Center — chart + detail */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 24px", transition: "all .25s", minWidth: 0 }}>

            {/* ── Imported lab selected view ── */}
            {selectedImportedLab && (() => {
              const { low, high } = parseRefRange(selectedImportedLab.refRange);
              const val = parseFloat(selectedImportedLab.value);
              const inRange = low !== null && high !== null && !isNaN(val) ? (val >= low && val <= high) : null;
              // All historical readings for this test, sorted oldest → newest
              const history = [...importedLabs]
                .filter(l => (l.name || "").toLowerCase() === (selectedImportedLab.name || "").toLowerCase())
                .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
              const hasHistory = history.length > 1;
              const chartData = hasHistory ? { values: history.map(h => parseFloat(h.value)), low: low ?? 0, high: high ?? 100 } : null;
              const histLabels = hasHistory ? history.map(h => h.date || "—") : [];
              const lineColor = inRange === false ? "#ef4444" : "#4f8ef7";
              return (
                <div style={{ animation: "fadeUp .3s ease both" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                        <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 24, color: "#dde8f5", fontWeight: 400 }}>{selectedImportedLab.name}</h2>
                        {selectedImportedLab.flag && <span style={{ fontSize: 9, background: "rgba(239,68,68,.15)", color: "#ef4444", padding: "3px 8px", borderRadius: 5, fontFamily: "'DM Mono',monospace", fontWeight: 600 }}>OUT OF RANGE</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "#98afc4", fontFamily: "'DM Mono',monospace" }}>
                        {selectedImportedLab.category}{selectedImportedLab.refRange ? ` · Normal range: ${selectedImportedLab.refRange} ${selectedImportedLab.unit}` : ""}
                        {selectedImportedLab.date ? ` · ${selectedImportedLab.date}` : ""}
                        {selectedImportedLab.facility ? ` · ${selectedImportedLab.facility}` : ""}
                      </div>
                    </div>
                  </div>

                  {/* Value + Range bar */}
                  <div style={{ background: "#0b1220", border: "1px solid #111e30", borderRadius: 14, padding: "20px 24px", marginBottom: 18 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
                      <span style={{ fontSize: 36, fontWeight: 700, color: inRange === false ? "#ef4444" : inRange === true ? "#10b981" : "#dde8f5", letterSpacing: "-1px" }}>{selectedImportedLab.value}</span>
                      <span style={{ fontSize: 16, color: "#7eb8d8" }}>{selectedImportedLab.unit}</span>
                      {inRange === true && <span style={{ fontSize: 11, color: "#10b981", fontFamily: "'DM Mono',monospace" }}>✓ Within normal range</span>}
                      {inRange === false && <span style={{ fontSize: 11, color: "#ef4444", fontFamily: "'DM Mono',monospace" }}>⚠ Outside normal range</span>}
                    </div>
                    {selectedImportedLab.refRange && (
                      <div style={{ fontSize: 11, color: "#98afc4", fontFamily: "'DM Mono',monospace", marginBottom: 16 }}>
                        Normal range: {selectedImportedLab.refRange} {selectedImportedLab.unit}
                      </div>
                    )}
                    {low !== null && high !== null && !isNaN(val) && (
                      <RangeBar value={val} low={low} high={high} />
                    )}
                  </div>

                  {/* Details grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
                    {[
                      ["Category", selectedImportedLab.category || "—"],
                      ["Date", selectedImportedLab.date || "—"],
                      ["Facility", selectedImportedLab.facility || "—"],
                      ["Reference Range", selectedImportedLab.refRange ? `${selectedImportedLab.refRange} ${selectedImportedLab.unit}` : "—"],
                    ].map(([k, v]) => (
                      <div key={k} style={{ background: "#0b1220", border: "1px solid #111e30", borderRadius: 10, padding: "12px 14px" }}>
                        <div style={{ fontSize: 9, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 5 }}>{k}</div>
                        <div style={{ fontSize: 13, color: "#c4d8ee", fontWeight: 500 }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  {selectedImportedLab.notes && (
                    <div style={{ background: "#0b1220", border: "1px solid #111e30", borderRadius: 10, padding: "14px 16px", marginBottom: 18 }}>
                      <div style={{ fontSize: 9, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Notes</div>
                      <div style={{ fontSize: 12, color: "#a8c4dc", lineHeight: 1.6 }}>{selectedImportedLab.notes}</div>
                    </div>
                  )}

                  {/* Trend chart (only if >1 readings) */}
                  {hasHistory && chartData && low !== null && high !== null && (
                    <div style={{ background: "#0b1220", border: "1px solid #111e30", borderRadius: 14, padding: "18px 16px 12px", marginBottom: 16 }}>
                      <div className="section-label">{history.length}-Reading Trend</div>
                      <TrendChart lab={chartData} color={lineColor} monthLabels={histLabels} />
                      <div style={{ display: "flex", gap: 16, marginTop: 10, paddingTop: 10, borderTop: "1px solid #0d1a28" }}>
                        {[
                          { dot: null, label: "Reference range" },
                          { dot: "#ef4444", label: "Out of range" },
                          { dot: lineColor, label: "In range" },
                        ].map(({ dot, label }) => (
                          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, color: "#a0b4c8", fontFamily: "'DM Mono',monospace" }}>
                            {dot ? <div style={{ width: 7, height: 7, borderRadius: "50%", background: dot }} /> : <div style={{ width: 14, height: 1, borderTop: "1px dashed #10b981" }} />}
                            {label}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Result History table */}
                  {hasHistory && (
                    <div style={{ background: "#0b1220", border: "1px solid #111e30", borderRadius: 14, padding: "16px 18px" }}>
                      <div className="section-label">All Readings ({history.length})</div>
                      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(history.length, 6)}, 1fr)`, gap: 6 }}>
                        {[...history].reverse().map((h, i) => {
                          const hv = parseFloat(h.value);
                          const bad = low !== null && high !== null && !isNaN(hv) && (hv < low || hv > high);
                          return (
                            <div key={i} style={{ textAlign: "center", padding: "8px 4px", background: "#080c14", borderRadius: 6, border: bad ? "1px solid rgba(239,68,68,.3)" : "1px solid #0d1a28" }}>
                              <div style={{ fontSize: 8, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", marginBottom: 4 }}>{h.date || "—"}</div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: bad ? "#ef4444" : "#a8c4dc" }}>{h.value}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── AI Lab Analysis panel ── */}
            <div style={{ marginTop: 20, background: "linear-gradient(135deg, rgba(79,142,247,.07), rgba(167,139,250,.05))", border: "1px solid rgba(79,142,247,.2)", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: aiAnalysis || aiAnalyzing ? 14 : 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, color: "#4f8ef7" }}>✦</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#7eb8d8", letterSpacing: "0.5px" }}>AI Lab Analysis</span>
                  {importedLabs.length > 0 && <span style={{ fontSize: 9, background: "rgba(16,185,129,.12)", color: "#10b981", border: "1px solid rgba(16,185,129,.25)", padding: "1px 6px", borderRadius: 8, fontFamily: "'DM Mono',monospace" }}>{importedLabs.length} imported</span>}
                </div>
                <button
                  onClick={analyzeAllLabs}
                  disabled={aiAnalyzing}
                  style={{ padding: "7px 16px", background: aiAnalyzing ? "#0f1e30" : "rgba(79,142,247,.18)", border: "1px solid rgba(79,142,247,.4)", borderRadius: 8, color: "#7eb8d8", fontSize: 12, fontFamily: "'Sora',sans-serif", fontWeight: 600, cursor: aiAnalyzing ? "default" : "pointer", display: "flex", alignItems: "center", gap: 6 }}
                >
                  {aiAnalyzing ? <><span style={{ fontSize: 12 }}>⟳</span> Analyzing…</> : <><span style={{ fontSize: 12, color: "#4f8ef7" }}>✦</span> Analyze My Labs</>}
                </button>
              </div>
              {aiError && <div style={{ fontSize: 11, color: "#ef4444", fontFamily: "'DM Mono',monospace" }}>{aiError}</div>}
              {aiAnalysis && (
                <div style={{ fontSize: 12, color: "#a8c4dc", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                  {aiAnalysis}
                </div>
              )}
              {!aiAnalysis && !aiAnalyzing && !aiError && (
                <div style={{ fontSize: 11, color: "#6a8090", fontFamily: "'DM Mono',monospace" }}>
                  {importedLabs.length > 0
                    ? "Click to get an AI analysis of your imported lab results."
                    : "Import lab results using the Import Records tab, then click Analyze My Labs."}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
