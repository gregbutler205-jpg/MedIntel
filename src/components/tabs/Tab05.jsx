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

const MONTHS = ["Mar'25","Apr'25","May'25","Jun'25","Jul'25","Aug'25","Sep'25","Oct'25","Nov'25","Dec'25","Jan'26","Feb'26","Mar'26"];

const PANELS = [
  {
    id: "liver", label: "Liver Panel", color: "#f59e0b",
    labs: [
      { id: "bili", name: "Bilirubin", unit: "mg/dL", low: 0.2, high: 1.2,
        values: [0.5,0.6,0.5,0.7,0.6,0.5,0.6,0.6,0.7,0.6,0.6,0.6,0.6], lastDate: "Mar 10",
        description: "Bilirubin is a yellow pigment produced when red blood cells break down. The liver processes it for excretion.",
        purpose: "Monitors liver health and bile processing — important on tacrolimus and mycophenolate, both of which can affect liver function.",
        cautions: "Levels above 1.2 mg/dL warrant investigation. Mild elevation is common with immunosuppressants. Severe elevation (>3.0) may indicate hepatotoxicity." },
      { id: "alkphos", name: "Alk Phos", unit: "U/L", low: 44, high: 147,
        values: [88,92,95,90,85,88,91,94,96,98,97,98,98], lastDate: "Mar 10",
        description: "Alkaline phosphatase is an enzyme found in the liver, bile ducts, and bone. Elevations often point to bile duct issues or bone turnover.",
        purpose: "Tracks liver and bile duct health. Particularly relevant in transplant patients for detecting bile duct complications.",
        cautions: "Values above 147 U/L should prompt investigation for cholestasis. Corticosteroids like prednisone can artificially elevate Alk Phos." },
      { id: "alt", name: "ALT", unit: "U/L", low: 7, high: 56,
        values: [22,24,23,25,21,20,22,23,24,23,22,23,24], lastDate: "Mar 10",
        description: "Alanine aminotransferase (ALT) is a liver-specific enzyme and the most sensitive marker for liver cell injury.",
        purpose: "Primary marker for hepatocellular damage — key for monitoring tacrolimus toxicity and viral hepatitis reactivation risk.",
        cautions: "Values >56 U/L are elevated. Levels 3x the upper limit (>168) may require dose adjustment of immunosuppressants." },
      { id: "ast", name: "AST", unit: "U/L", low: 10, high: 40,
        values: [18,20,19,21,18,17,19,20,21,20,19,20,21], lastDate: "Mar 10",
        description: "Aspartate aminotransferase (AST) is found in the liver, heart, and muscles. Less liver-specific than ALT but used in combination.",
        purpose: "Used alongside ALT to assess liver injury pattern. An AST:ALT ratio >2:1 can suggest alcohol-related liver disease.",
        cautions: "Elevated AST with normal ALT may indicate muscle injury rather than liver damage — relevant if experiencing muscle pain on statins." },
    ],
  },
  {
    id: "tacro", label: "Tacrolimus & Immunosuppressants", color: "#a78bfa",
    labs: [
      { id: "tacrolevel", name: "Tacrolimus Level", unit: "ng/mL", low: 5, high: 10,
        values: [7.2,6.8,7.1,6.5,7.8,8.1,7.4,7.0,6.8,6.9,6.2,6.5,6.2], lastDate: "Mar 10", flag: true,
        description: "Tacrolimus (FK506) trough level — the concentration in blood just before the next dose. This is a critical safety and efficacy marker for transplant patients.",
        purpose: "Ensures tacrolimus stays within the therapeutic window: high enough to prevent rejection, low enough to avoid toxicity (kidney damage, neurotoxicity, infection risk).",
        cautions: "Target range is typically 5–10 ng/mL for stable transplant patients. Below 5 = rejection risk. Above 10 = toxicity risk. Recent value of 6.2 is within range but trending downward — report to Dr. Cohen." },
      { id: "wbc_immuno", name: "WBC (Immune Monitor)", unit: "K/µL", low: 4.0, high: 11.0,
        values: [5.8,6.1,5.9,6.2,5.7,5.5,5.8,6.0,6.2,6.1,6.2,6.1,6.2], lastDate: "Mar 10",
        description: "White blood cell count monitored specifically in the context of your immunosuppressant regimen.",
        purpose: "Immunosuppressants (tacrolimus, mycophenolate) suppress the immune system. WBC monitors whether suppression is too aggressive.",
        cautions: "Values below 3.0 K/µL suggest over-suppression and high infection risk. Mycophenolate dose may need reduction." },
    ],
  },
  {
    id: "endo", label: "Endocrinology", color: "#10b981",
    labs: [
      { id: "glucose", name: "Glucose", unit: "mg/dL", low: 70, high: 100,
        values: [94,98,102,99,105,108,103,101,97,99,101,100,99], lastDate: "Mar 10", flag: true,
        description: "Blood glucose (fasting) measures the amount of sugar in the blood. A key marker for diabetes and metabolic health.",
        purpose: "Post-transplant diabetes mellitus (PTDM) is common due to tacrolimus and prednisone — both elevate blood sugar. Fasting glucose monitors for this risk.",
        cautions: "100–125 mg/dL = pre-diabetic range. Above 126 = diabetic range. Recent trend is borderline — discuss with Dr. Hand at next PCP visit." },
      { id: "a1c", name: "HbA1c", unit: "%", low: 4.0, high: 5.7,
        values: [5.4,null,5.5,null,5.6,null,5.7,null,5.6,5.7,null,5.8,null], lastDate: "Dec'25", flag: true,
        description: "Hemoglobin A1c reflects average blood sugar over the past 2–3 months — the gold-standard for long-term glucose control.",
        purpose: "Quarterly monitoring for post-transplant diabetes. Tacrolimus impairs insulin secretion; prednisone causes insulin resistance.",
        cautions: "5.7–6.4% = pre-diabetes. Above 6.5% = diabetes. Trend is creeping upward — worth discussing dietary adjustments." },
      { id: "calcium", name: "Calcium", unit: "mg/dL", low: 8.5, high: 10.5,
        values: [9.1,9.2,9.0,9.3,9.1,9.0,9.2,9.1,9.3,9.2,9.1,9.2,9.2], lastDate: "Mar 10",
        description: "Serum calcium is essential for bone health, nerve function, and cardiac rhythm.",
        purpose: "Transplant patients on long-term steroids are at risk for bone loss. Calcium supplementation is common — this monitors that it's working.",
        cautions: "Low calcium (<8.5) = hypocalcemia risk, muscle cramps, cardiac arrhythmia. High calcium (>10.5) can cause kidney stones." },
      { id: "phosphorus", name: "Phosphorus", unit: "mg/dL", low: 2.5, high: 4.5,
        values: [3.2,3.1,3.3,3.0,3.2,3.4,3.1,3.2,3.3,3.1,3.2,3.1,3.2], lastDate: "Mar 10",
        description: "Phosphorus works with calcium for bone health. The kidneys regulate phosphorus levels.",
        purpose: "Kidney function affects phosphorus balance. Tacrolimus nephrotoxicity can disrupt phosphorus regulation over time.",
        cautions: "Low phosphorus + low calcium can indicate secondary hyperparathyroidism — common in transplant patients." },
    ],
  },
  {
    id: "kidney", label: "Kidney Function", color: "#4f8ef7",
    labs: [
      { id: "creatinine", name: "Creatinine", unit: "mg/dL", low: 0.7, high: 1.3,
        values: [1.18,1.20,1.22,1.19,1.21,1.25,1.28,1.30,1.35,1.38,1.40,1.41,1.42], lastDate: "Mar 10", flag: true,
        description: "Creatinine is a waste product from muscle metabolism filtered by the kidneys. It is the primary marker for kidney function in transplant patients.",
        purpose: "Monitors for tacrolimus nephrotoxicity and transplant rejection. Rising creatinine is the earliest signal that the kidney is under stress.",
        cautions: "Values above 1.3 mg/dL are elevated for Greg. The current upward trend from 1.18 → 1.42 over 12 months is clinically significant and the reason for the upcoming nephrology appointment." },
      { id: "bun", name: "BUN", unit: "mg/dL", low: 7, high: 20,
        values: [14,15,14,16,15,17,16,17,18,17,18,18,19], lastDate: "Mar 10", flag: true,
        description: "Blood urea nitrogen (BUN) is another kidney waste product. Used with creatinine for a fuller picture of kidney function.",
        purpose: "A rising BUN alongside rising creatinine strengthens concern for kidney dysfunction. BUN can also rise with dehydration or high protein intake.",
        cautions: "BUN >20 with rising creatinine is concerning. BUN:Creatinine ratio >20:1 suggests pre-renal causes (dehydration). Current ratio ~13:1 is within normal range." },
      { id: "egfr", name: "eGFR", unit: "mL/min", low: 60, high: 120,
        values: [72,71,70,72,70,68,66,64,62,61,60,59,58], lastDate: "Mar 10", flag: true,
        description: "Estimated glomerular filtration rate reflects how well the kidneys are filtering blood. The most clinically meaningful kidney metric.",
        purpose: "eGFR below 60 indicates Stage 3 chronic kidney disease. Trending is more important than a single value.",
        cautions: "Current value of 58 mL/min is just below the Stage 3 threshold. The consistent downward trend is the primary concern for the nephrology appointment on March 15." },
      { id: "uricacid", name: "Uric Acid", unit: "mg/dL", low: 2.5, high: 7.0,
        values: [5.1,5.3,5.2,5.4,5.3,5.5,5.4,5.6,5.5,5.6,5.7,5.7,5.8], lastDate: "Mar 10",
        description: "Uric acid is a breakdown product of purines. Elevated levels can cause gout and may affect kidney function.",
        purpose: "Tacrolimus can raise uric acid levels. Diuretics like furosemide also contribute. Gout is significantly more common in transplant patients.",
        cautions: "Values above 7.0 mg/dL increase gout risk substantially. Current 5.8 is normal but trending upward — worth monitoring." },
    ],
  },
  {
    id: "cbc", label: "CBC", color: "#ef4444",
    labs: [
      { id: "wbc", name: "WBC", unit: "K/µL", low: 4.0, high: 11.0,
        values: [5.8,6.1,5.9,6.2,5.7,5.5,5.8,6.0,6.2,6.1,6.2,6.1,6.2], lastDate: "Mar 10",
        description: "White blood cells are the immune system's primary defenders against infection.",
        purpose: "Immunosuppressants suppress WBC production. Too low = infection risk. Too high = possible infection or rejection response.",
        cautions: "Below 3.0 K/µL triggers dose review. Above 11.0 can indicate active infection or rejection — requires urgent evaluation." },
      { id: "hgb", name: "Hemoglobin", unit: "g/dL", low: 13.5, high: 17.5,
        values: [13.2,13.5,13.4,13.6,13.5,13.4,13.6,13.7,13.8,13.8,13.8,13.7,13.8], lastDate: "Mar 10",
        description: "Hemoglobin carries oxygen in red blood cells. Low levels indicate anemia.",
        purpose: "Mycophenolate and other immunosuppressants can cause anemia. Kidney dysfunction also reduces erythropoietin production, worsening anemia.",
        cautions: "Below 13.5 g/dL in males is technically anemic. Current value of 13.8 is at the lower edge of normal — worth watching alongside kidney function." },
      { id: "hct", name: "Hematocrit", unit: "%", low: 41, high: 53,
        values: [39,40,40,41,40,40,41,41,41,41,42,41,41], lastDate: "Mar 10",
        description: "Hematocrit is the percentage of blood volume made up by red blood cells.",
        purpose: "Used alongside hemoglobin to assess anemia severity and blood oxygen-carrying capacity.",
        cautions: "Below 41% in males is low. Consistent low-normal hematocrit combined with kidney disease trend warrants monitoring for anemia of chronic kidney disease." },
      { id: "plt", name: "Platelets", unit: "K/µL", low: 150, high: 400,
        values: [198,205,201,210,204,198,202,206,208,205,207,206,207], lastDate: "Mar 10",
        description: "Platelets are small blood cells that help form clots to stop bleeding.",
        purpose: "Mycophenolate can cause thrombocytopenia (low platelets). Monitoring ensures clotting function remains intact.",
        cautions: "Below 150 K/µL = thrombocytopenia. Below 50 K/µL = serious bleeding risk. Current values are stable and normal." },
    ],
  },
  {
    id: "cmp", label: "CMP — Electrolytes", color: "#7eb8d8",
    labs: [
      { id: "sodium", name: "Sodium", unit: "mEq/L", low: 136, high: 145,
        values: [139,140,139,141,140,139,140,141,140,140,141,140,140], lastDate: "Mar 10",
        description: "Sodium is the primary electrolyte that regulates fluid balance and nerve function.",
        purpose: "Furosemide (diuretic) can lower sodium. Monitoring ensures fluid balance is maintained.",
        cautions: "Below 136 = hyponatremia (fatigue, confusion). Above 145 = hypernatremia (dehydration). Current values are consistently normal." },
      { id: "potassium", name: "Potassium", unit: "mEq/L", low: 3.5, high: 5.0,
        values: [4.1,4.2,4.0,4.3,4.1,4.0,4.2,4.1,4.3,4.2,4.1,4.2,4.2], lastDate: "Mar 10",
        description: "Potassium is critical for heart rhythm and muscle function.",
        purpose: "Tacrolimus can cause hyperkalemia (high potassium). Furosemide can cause hypokalemia. Both are cardiac risks.",
        cautions: "Below 3.5 = hypokalemia (muscle weakness, arrhythmia). Above 5.0 = hyperkalemia (serious cardiac risk on tacrolimus). Current values are stable." },
      { id: "co2", name: "CO2 (Bicarb)", unit: "mEq/L", low: 22, high: 29,
        values: [25,24,25,26,25,24,25,26,25,25,26,25,25], lastDate: "Mar 10",
        description: "CO2 (bicarbonate) reflects the body's acid-base balance.",
        purpose: "Kidney disease can cause metabolic acidosis (low bicarb). Tacrolimus nephrotoxicity may lower CO2 over time.",
        cautions: "Below 22 mEq/L = metabolic acidosis — can accelerate kidney disease progression and bone loss." },
      { id: "albumin", name: "Albumin", unit: "g/dL", low: 3.4, high: 5.4,
        values: [4.0,4.1,4.0,4.2,4.1,4.0,4.1,4.1,4.2,4.1,4.1,4.1,4.1], lastDate: "Mar 10",
        description: "Albumin is a protein made by the liver — the most abundant protein in blood.",
        purpose: "Low albumin indicates malnutrition, liver disease, or kidney loss. Also affects drug binding — low albumin can alter tacrolimus levels.",
        cautions: "Below 3.4 g/dL is clinically significant. Current values are stable and healthy." },
    ],
  },
];

const latestVal = (lab) => {
  for (let i = lab.values.length - 1; i >= 0; i--) {
    if (lab.values[i] !== null) return lab.values[i];
  }
  return null;
};

const statusOf = (lab) => {
  const v = latestVal(lab);
  if (v === null) return "ok";
  if (v < lab.low || v > lab.high) return "flag";
  return "ok";
};

const trendOf = (lab) => {
  const vals = lab.values.filter(v => v !== null);
  if (vals.length < 3) return "stable";
  const recent = vals.slice(-4);
  const delta = recent[recent.length - 1] - recent[0];
  const pct = Math.abs(delta) / (recent[0] || 1);
  if (pct < 0.025) return "stable";
  return delta > 0 ? "up" : "down";
};

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
          <span style={{ fontSize: 8, color: "#2d4d6a", fontFamily: "'DM Mono',monospace" }}>{low}</span>
          <span style={{ fontSize: 8, color: "#2d4d6a", fontFamily: "'DM Mono',monospace" }}>{high}</span>
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
        <text key={i} x={toX(i)} y={H - 4} textAnchor="middle" fontSize={7.5} fill="#1e3550" fontFamily="DM Mono">{m}</text>
      ))}
    </svg>
  );
}

const TREND_ARROW = { up: "↑", down: "↓", stable: "→" };
const goodDown = new Set(["egfr"]);
const goodUp = new Set(["egfr"]);

function trendColor(labId, trend) {
  const flipped = goodDown.has(labId); // for eGFR, down is bad
  if (trend === "stable") return "#7eb8d8";
  if (trend === "up") return flipped ? "#ef4444" : "#f59e0b";
  return flipped ? "#f59e0b" : "#4f8ef7";
}

export default function App() {
  const [activeNav, setActiveNav] = useState("labs");
  const [selectedLab, setSelectedLab] = useState(PANELS[0].labs[0]);
  const [selectedPanelColor, setSelectedPanelColor] = useState(PANELS[0].color);
  const [aiOpen, setAiOpen] = useState(false);
  const [timeRange, setTimeRange] = useState(12);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const fmt = d => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const fmtDate = d => d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const allLabs = PANELS.flatMap(p => p.labs);
  const flagged = allLabs.filter(l => statusOf(l) !== "ok").length;

  const selectLab = (lab, color) => { setSelectedLab(lab); setSelectedPanelColor(color); setAiOpen(false); };

  const chartMonths = MONTHS.slice(MONTHS.length - timeRange);
  const chartLab = selectedLab ? { ...selectedLab, values: selectedLab.values.slice(MONTHS.length - timeRange) } : null;

  return (
    <div style={{ display: "flex", height: "100vh", background: "#07090f", color: "#d4e2f0", fontFamily: "'Sora', sans-serif", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #1a2840; border-radius: 4px; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        @keyframes slideInRight { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:none; } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }
        .nav-item { display:flex; align-items:center; gap:10px; padding:8px 16px; cursor:pointer; font-size:12.5px; color:#3d5a7a; border-left:2px solid transparent; transition:all .15s; user-select:none; }
        .nav-item:hover { color:#7eb8d8; background:rgba(79,142,247,.04); }
        .nav-item.active { color:#4f8ef7; background:rgba(79,142,247,.08); border-left-color:#4f8ef7; }
        .nav-icon { font-size:13px; width:16px; text-align:center; flex-shrink:0; }
        .live-dot { width:6px; height:6px; border-radius:50%; background:#10b981; animation:pulse 2s infinite; flex-shrink:0; }
        .section-label { font-size:10px; letter-spacing:1.5px; text-transform:uppercase; color:#1e3550; font-family:'DM Mono',monospace; margin-bottom:10px; }
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
          <div style={{ fontSize: 10, color: "#1e3550", fontFamily: "'DM Mono',monospace", marginBottom: 4 }}>PATIENT</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#c4d8ee" }}>Greg Butler</div>
          <div style={{ fontSize: 11, color: "#2d4d6a", marginTop: 2 }}>Transplant · Immunosuppressed</div>
        </div>
        <nav style={{ flex: 1, overflowY: "auto", padding: "10px 0" }}>
          <div style={{ padding: "8px 16px 4px", fontSize: 9, color: "#142030", fontFamily: "'DM Mono',monospace", letterSpacing: "1.5px", textTransform: "uppercase" }}>CORE</div>
          {NAV.slice(0, 8).map(({ id, icon, label }) => (
            <div key={id} className={`nav-item ${activeNav === id ? "active" : ""}`} onClick={() => setActiveNav(id)}>
              <span className="nav-icon">{icon}</span><span>{label}</span>
            </div>
          ))}
          <div style={{ padding: "12px 16px 4px", fontSize: 9, color: "#142030", fontFamily: "'DM Mono',monospace", letterSpacing: "1.5px", textTransform: "uppercase" }}>SYSTEM</div>
          {NAV.slice(8).map(({ id, icon, label }) => (
            <div key={id} className={`nav-item ${activeNav === id ? "active" : ""}`} onClick={() => setActiveNav(id)}>
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
            <span style={{ fontSize: 11, color: "#2d4d6a", fontFamily: "'DM Mono',monospace" }}>{fmtDate(time)} · {fmt(time)}</span>
          </div>
          <div style={{ fontSize: 11, color: "#2d4d6a", fontFamily: "'DM Mono',monospace", background: "#0b1220", border: "1px solid #111e30", padding: "5px 12px", borderRadius: 6 }}>Last import: Mar 12, 2026</div>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#4f8ef7,#a78bfa)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#fff" }}>G</div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>

          {/* Left column — lab list */}
          <div style={{ width: 292, minWidth: 292, borderRight: "1px solid #0d1a28", overflowY: "auto", padding: "20px 14px 20px 16px" }}>
            <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 22, color: "#dde8f5", fontWeight: 400, letterSpacing: "-0.4px", marginBottom: 4 }}>Labs & Trends</h1>
            <p style={{ fontSize: 11, color: "#2d4d6a", fontFamily: "'DM Mono',monospace", marginBottom: 16 }}>{allLabs.length} markers · {flagged} flagged · Mar 10 draw</p>

            {/* Summary chips */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
              <div style={{ background: "#0b1220", border: "1px solid #111e30", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#ef4444", lineHeight: 1, marginBottom: 3 }}>{flagged}</div>
                <div style={{ fontSize: 10, color: "#7eb8d8", fontWeight: 600 }}>Flagged</div>
                <div style={{ fontSize: 9, color: "#2d4d6a", fontFamily: "'DM Mono',monospace" }}>out of range</div>
              </div>
              <div style={{ background: "#0b1220", border: "1px solid #111e30", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#10b981", lineHeight: 1, marginBottom: 3 }}>{allLabs.length - flagged}</div>
                <div style={{ fontSize: 10, color: "#7eb8d8", fontWeight: 600 }}>Normal</div>
                <div style={{ fontSize: 9, color: "#2d4d6a", fontFamily: "'DM Mono',monospace" }}>within range</div>
              </div>
            </div>

            {/* Panels */}
            {PANELS.map(panel => (
              <div key={panel.id} style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: panel.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 9.5, fontWeight: 600, color: panel.color, letterSpacing: "0.8px", textTransform: "uppercase", fontFamily: "'DM Mono',monospace" }}>{panel.label}</span>
                </div>
                {panel.labs.map((lab, i) => {
                  const val = latestVal(lab);
                  const status = statusOf(lab);
                  const trend = trendOf(lab);
                  const tc = trendColor(lab.id, trend);
                  return (
                    <div key={lab.id} className={`lab-row ${selectedLab?.id === lab.id ? "sel" : ""}`} style={{ animationDelay: `${i * 35}ms`, flexDirection: "column", alignItems: "stretch", gap: 4 }} onClick={() => selectLab(lab, panel.color)}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: status === "ok" ? "#10b981" : "#ef4444", flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#c4d8ee" }}>{lab.name}</div>
                          <div style={{ fontSize: 9, color: "#2d4d6a", fontFamily: "'DM Mono',monospace", marginTop: 1 }}>{lab.unit} · {lab.lastDate}</div>
                        </div>
                        <div style={{ fontSize: 11, color: tc, fontWeight: 700, flexShrink: 0 }}>{TREND_ARROW[trend]}</div>
                      </div>
                      <RangeBar value={val} low={lab.low} high={lab.high} compact />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Center — chart + detail */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 24px", transition: "all .25s", minWidth: 0 }}>
            {selectedLab && chartLab && (
              <div style={{ animation: "fadeUp .3s ease both" }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                      <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 24, color: "#dde8f5", fontWeight: 400, letterSpacing: "-0.4px" }}>{selectedLab.name}</h2>
                      {statusOf(selectedLab) !== "ok" && (
                        <span style={{ fontSize: 9, background: "rgba(239,68,68,.15)", color: "#ef4444", padding: "3px 8px", borderRadius: 5, fontFamily: "'DM Mono',monospace", fontWeight: 600 }}>OUT OF RANGE</span>
                      )}
                      {selectedLab.flag && (
                        <span style={{ fontSize: 9, background: "rgba(245,158,11,.12)", color: "#f59e0b", padding: "3px 8px", borderRadius: 5, fontFamily: "'DM Mono',monospace", fontWeight: 600 }}>FLAGGED</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "#2d4d6a", fontFamily: "'DM Mono',monospace" }}>
                      Range: {selectedLab.low}–{selectedLab.high} {selectedLab.unit} · Last drawn {selectedLab.lastDate}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      {[3, 6, 12].map(m => (
                        <button key={m} className={`time-btn ${timeRange === m ? "on" : ""}`} onClick={() => setTimeRange(m)}>{m}mo</button>
                      ))}
                    </div>
                    <button
                      onClick={() => setAiOpen(!aiOpen)}
                      style={{ padding: "6px 14px", background: aiOpen ? "#4f8ef7" : "#0f1e30", border: `1px solid ${aiOpen ? "#4f8ef7" : "#1a3050"}`, borderRadius: 7, color: aiOpen ? "#fff" : "#7eb8d8", fontSize: 11, fontFamily: "'Sora',sans-serif", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <span style={{ color: aiOpen ? "#fff" : "#4f8ef7", fontSize: 13 }}>✦</span> What is this?
                    </button>
                  </div>
                </div>

                {/* Metric strip */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 10, marginBottom: 18 }}>
                  <div style={{ background: "#0b1220", border: "1px solid #111e30", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 9, color: "#1e3550", fontFamily: "'DM Mono',monospace", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Latest Value</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: statusOf(selectedLab) === "ok" ? "#dde8f5" : "#ef4444" }}>{latestVal(selectedLab)} {selectedLab.unit}</div>
                  </div>
                  <div style={{ background: "#0b1220", border: "1px solid #111e30", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 9, color: "#1e3550", fontFamily: "'DM Mono',monospace", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Trend</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: trendColor(selectedLab.id, trendOf(selectedLab)) }}>{TREND_ARROW[trendOf(selectedLab)]} {trendOf(selectedLab)}</div>
                  </div>
                  <div style={{ background: "#0b1220", border: "1px solid #111e30", borderRadius: 10, padding: "12px 18px 10px" }}>
                    <div style={{ fontSize: 9, color: "#1e3550", fontFamily: "'DM Mono',monospace", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 2 }}>Position in Range</div>
                    <RangeBar value={latestVal(selectedLab)} low={selectedLab.low} high={selectedLab.high} />
                  </div>
                </div>

                {/* Chart */}
                <div style={{ background: "#0b1220", border: "1px solid #111e30", borderRadius: 14, padding: "18px 16px 12px", marginBottom: 16 }}>
                  <div className="section-label">{timeRange}-Month Trend</div>
                  <TrendChart lab={chartLab} color={statusOf(selectedLab) === "ok" ? selectedPanelColor : "#ef4444"} monthLabels={chartMonths} />
                  <div style={{ display: "flex", gap: 16, marginTop: 10, paddingTop: 10, borderTop: "1px solid #0d1a28" }}>
                    {[
                      { dot: null, line: "#10b981", label: "Reference range" },
                      { dot: "#ef4444", label: "Out of range" },
                      { dot: selectedPanelColor, label: "In range" },
                    ].map(({ dot, line, label }) => (
                      <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, color: "#1e3550", fontFamily: "'DM Mono',monospace" }}>
                        {dot ? <div style={{ width: 7, height: 7, borderRadius: "50%", background: dot }} /> : <div style={{ width: 14, height: 1, borderTop: "1px dashed #10b981" }} />}
                        {label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* History grid */}
                <div style={{ background: "#0b1220", border: "1px solid #111e30", borderRadius: 14, padding: "16px 18px" }}>
                  <div className="section-label">Result History</div>
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${timeRange}, 1fr)`, gap: 4 }}>
                    {chartMonths.map((m, i) => {
                      const val = chartLab.values[i];
                      const bad = val !== null && (val < selectedLab.low || val > selectedLab.high);
                      return (
                        <div key={m} style={{ textAlign: "center", padding: "7px 3px", background: "#080c14", borderRadius: 6, border: bad ? "1px solid rgba(239,68,68,.3)" : "1px solid #0d1a28" }}>
                          <div style={{ fontSize: 7.5, color: "#1e3550", fontFamily: "'DM Mono',monospace", marginBottom: 4 }}>{m}</div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: val == null ? "#1e3550" : bad ? "#ef4444" : "#a8c4dc" }}>{val ?? "—"}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* AI Side Panel */}
          {aiOpen && selectedLab && (
            <div className="ai-panel">
              <div style={{ padding: "18px 16px", borderBottom: "1px solid #0d1a28", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 9, color: "#4f8ef7", fontFamily: "'DM Mono',monospace", letterSpacing: "1.5px", marginBottom: 4 }}>✦ AI REFERENCE</div>
                  <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 17, color: "#dde8f5" }}>{selectedLab.name}</div>
                </div>
                <button onClick={() => setAiOpen(false)} style={{ background: "#0b1220", border: "1px solid #111e30", borderRadius: 6, color: "#3d5a7a", fontSize: 14, cursor: "pointer", padding: "4px 8px", lineHeight: 1 }}>✕</button>
              </div>
              <div style={{ padding: "16px", overflowY: "auto", flex: 1 }}>
                {[
                  { label: "What is it?", content: selectedLab.description },
                  { label: "Why it's monitored for Greg", content: selectedLab.purpose },
                  { label: "Cautions & thresholds", content: selectedLab.cautions },
                ].map(({ label, content }) => (
                  <div key={label} style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 9, color: "#4f8ef7", fontFamily: "'DM Mono',monospace", letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: 7 }}>{label}</div>
                    <div style={{ fontSize: 11.5, color: "#a8c4dc", lineHeight: 1.75 }}>{content}</div>
                  </div>
                ))}

                {/* Value in context bar */}
                <div style={{ background: "#0b1220", border: "1px solid #111e30", borderRadius: 10, padding: "14px", marginBottom: 16 }}>
                  <div style={{ fontSize: 9, color: "#1e3550", fontFamily: "'DM Mono',monospace", letterSpacing: "1px", marginBottom: 8 }}>GREG'S CURRENT VALUE</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 22, fontWeight: 700, color: statusOf(selectedLab) === "ok" ? "#dde8f5" : "#ef4444" }}>{latestVal(selectedLab)}</span>
                    <span style={{ fontSize: 11, color: "#2d4d6a", fontFamily: "'DM Mono',monospace" }}>{selectedLab.unit}</span>
                  </div>
                  <div style={{ height: 5, background: "#0d1a28", borderRadius: 3, overflow: "hidden", marginBottom: 5 }}>
                    <div style={{
                      height: "100%",
                      width: `${Math.min(100, Math.max(2, ((latestVal(selectedLab) - selectedLab.low) / (selectedLab.high - selectedLab.low)) * 100))}%`,
                      background: statusOf(selectedLab) === "ok" ? "#10b981" : "#ef4444",
                      borderRadius: 3,
                    }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8.5, color: "#1e3550", fontFamily: "'DM Mono',monospace" }}>
                    <span>Low {selectedLab.low}</span><span>High {selectedLab.high}</span>
                  </div>
                </div>

                {/* AI follow-up questions */}
                <div className="section-label">Ask a follow-up</div>
                {[
                  `What does a ${trendOf(selectedLab)} trend in ${selectedLab.name} mean for me?`,
                  `How does my ${selectedLab.name} interact with tacrolimus?`,
                  `What can I do to improve my ${selectedLab.name}?`,
                ].map(q => (
                  <button key={q} className="ai-q-btn">
                    <span style={{ color: "#4f8ef7", fontSize: 12, flexShrink: 0 }}>✦</span>
                    <span>{q}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
