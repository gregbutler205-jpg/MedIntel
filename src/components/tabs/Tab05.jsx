import INTELLITRAX_LOGO from "../../assets/logo.png";
import { useState, useEffect } from "react";

const NAV = [
  // ── Core ───────────────────────────────────────────────────────────────────
  { id: "dashboard",   icon: "⬡", label: "Dashboard" },
  { id: "profile",     icon: "◯", label: "Profile" },
  { id: "conditions",  icon: "◎", label: "Conditions" },
  { id: "surgeries",   icon: "✦", label: "Surgeries" },
  { id: "medications", icon: "⬡", label: "Medications" },
  { id: "labs",        icon: "◈", label: "Labs & Trends" },
  { id: "vitals",      icon: "♡", label: "Vitals" },
  { id: "symptoms",    icon: "◎", label: "Symptoms" },
  { id: "appointments",icon: "◻", label: "Appointments" },
  { id: "careplan",    icon: "◷", label: "Care Plan" },
  // ── System ─────────────────────────────────────────────────────────────────
  { id: "records",     icon: "▤", label: "Records" },
  { id: "documents",   icon: "▣", label: "Documents" },
  { id: "notes",       icon: "◻", label: "Notes" },
  { id: "ai",          icon: "✦", label: "AI Analysis" },
  { id: "import",      icon: "↓", label: "Import Records" },
  { id: "backup",      icon: "◈", label: "Data & Backup" },
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

// Full trend chart — works with or without reference range
function TrendChart({ lab, color, monthLabels }) {
  const pts = lab.values.map((v, i) => ({ v, i })).filter(x => x.v !== null && !isNaN(x.v));
  if (pts.length < 2) return null;
  const allV = pts.map(x => x.v);
  const hasRef = lab.low !== null && lab.high !== null;
  const minV = (hasRef ? Math.min(...allV, lab.low) : Math.min(...allV)) * 0.93;
  const maxV = (hasRef ? Math.max(...allV, lab.high) : Math.max(...allV)) * 1.07;
  const rng = maxV - minV || 1;
  const W = 500, H = 160, PL = 44, PR = 12, PT = 14, PB = 32;
  const cW = W - PL - PR, cH = H - PT - PB;
  const n = pts.length;
  const toX = i => PL + (i / (n - 1)) * cW;
  const toY = v => PT + cH - ((v - minV) / rng) * cH;
  const refLY = hasRef ? toY(lab.low) : null;
  const refHY = hasRef ? toY(lab.high) : null;
  const polyPts = pts.map(({ v, i }) => `${toX(i)},${toY(v)}`).join(" ");
  const areaPts = `${toX(0)},${PT + cH} ${polyPts} ${toX(n - 1)},${PT + cH}`;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      {/* Reference band — only if ref range is available */}
      {hasRef && <>
        <rect x={PL} y={refHY} width={cW} height={refLY - refHY} fill="rgba(16,185,129,0.06)" />
        <line x1={PL} y1={refHY} x2={PL + cW} y2={refHY} stroke="#10b981" strokeWidth={0.8} strokeDasharray="4,3" opacity={0.5} />
        <line x1={PL} y1={refLY} x2={PL + cW} y2={refLY} stroke="#10b981" strokeWidth={0.8} strokeDasharray="4,3" opacity={0.5} />
        <text x={PL - 4} y={refHY + 3} textAnchor="end" fontSize={8} fill="#10b981" fontFamily="DM Mono" opacity={0.7}>{lab.high}</text>
        <text x={PL - 4} y={refLY + 3} textAnchor="end" fontSize={8} fill="#10b981" fontFamily="DM Mono" opacity={0.7}>{lab.low}</text>
      </>}
      {/* Area */}
      <polygon points={areaPts} fill={`${color}14`} />
      {/* Line */}
      <polyline points={polyPts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {/* Points */}
      {pts.map(({ v, i }) => {
        const bad = hasRef && (v < lab.low || v > lab.high);
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

// ── Built-in Lab Test Dictionary ─────────────────────────────────────────────
const LAB_DICTIONARY = [
  { patterns: [/\balt\b|alanine\s*aminotrans/i], name:"ALT (Alanine Aminotransferase)", description:"A liver enzyme released when liver cells are damaged. High levels may indicate hepatitis, liver injury, or fatty liver disease. In transplant patients, rising ALT can be an early sign of graft rejection.", normalRange:"7–56 U/L", whyMatters:"Key marker for liver graft health and hepatocyte injury." },
  { patterns: [/\bast\b|aspartate\s*aminotrans/i], name:"AST (Aspartate Aminotransferase)", description:"An enzyme found in the liver, heart, and muscles. Elevated levels often indicate liver damage but can also rise from muscle injury or heart problems. Monitored alongside ALT.", normalRange:"10–40 U/L", whyMatters:"Used with ALT to assess liver cell damage." },
  { patterns: [/alk.*phos|alkaline.*phos/i], name:"Alkaline Phosphatase (Alk Phos / ALP)", description:"An enzyme produced by the liver, bile ducts, and bones. Elevated levels can indicate bile duct obstruction, bone disease, or liver pathology. In liver transplant patients, persistently elevated ALP warrants investigation for biliary complications.", normalRange:"44–147 U/L", whyMatters:"Signals bile duct issues or graft complications in transplant patients." },
  { patterns: [/\bggt\b|gamma.*glutamyl/i], name:"GGT (Gamma-Glutamyl Transferase)", description:"A liver enzyme sensitive to alcohol use and bile duct disease. Often elevated alongside Alk Phos in biliary obstruction. Useful for confirming liver origin of elevated Alk Phos.", normalRange:"9–48 U/L", whyMatters:"Helps confirm whether elevated Alk Phos is liver-derived." },
  { patterns: [/bilirubin/i], name:"Bilirubin (Total)", description:"A yellow pigment produced from red blood cell breakdown, processed by the liver. Elevated levels cause jaundice. High bilirubin in transplant patients may indicate rejection, bile duct problems, or graft dysfunction.", normalRange:"0.2–1.2 mg/dL", whyMatters:"Critical marker for liver graft function and biliary health." },
  { patterns: [/direct.*bili|bilirubin.*direct/i], name:"Direct (Conjugated) Bilirubin", description:"The portion of bilirubin processed by the liver. Elevated direct bilirubin strongly suggests liver or bile duct disease.", normalRange:"0.0–0.3 mg/dL", whyMatters:"More specific for liver/biliary pathology than total bilirubin." },
  { patterns: [/\bcreatinine\b/i], name:"Creatinine", description:"A waste product filtered by the kidneys. Elevated creatinine indicates impaired kidney function. In transplant patients on tacrolimus, rising creatinine signals nephrotoxicity and requires prompt attention.", normalRange:"0.74–1.35 mg/dL (men)", whyMatters:"Tracks tacrolimus nephrotoxicity risk and overall kidney function." },
  { patterns: [/egfr|glomer.*filt/i], name:"eGFR (Estimated Glomerular Filtration Rate)", description:"Estimates how well the kidneys filter blood each minute. Values below 60 indicate reduced kidney function. Monitored closely in transplant patients taking calcineurin inhibitors like tacrolimus.", normalRange:"≥60 mL/min/1.73m²", whyMatters:"Primary measure of kidney function; tracks long-term tacrolimus nephrotoxicity." },
  { patterns: [/\bglucose\b/i], name:"Glucose (Blood Sugar)", description:"The primary energy source for cells. Chronically elevated glucose indicates diabetes or poor glycemic control. Post-transplant diabetes mellitus (PTDM) is common due to tacrolimus and steroids.", normalRange:"70–99 mg/dL (fasting)", whyMatters:"Tracks glucose control; PTDM affects up to 20% of liver transplant recipients." },
  { patterns: [/hba1c|hemoglobin\s*a1c|glycated/i], name:"HbA1c (Hemoglobin A1c)", description:"Reflects average blood sugar over the past 2–3 months. Used to monitor diabetes management long-term.", normalRange:"<5.7% (normal); 5.7–6.4% (pre-diabetes); ≥6.5% (diabetes)", whyMatters:"Best measure of long-term glycemic control in PTDM." },
  { patterns: [/\bsodium\b/i], name:"Sodium", description:"An electrolyte regulating fluid balance and nerve/muscle function. Abnormal levels can cause neurological symptoms ranging from confusion to seizures.", normalRange:"136–145 mEq/L", whyMatters:"Electrolyte imbalance affects nerve function; diuretics can lower sodium." },
  { patterns: [/\bpotassium\b/i], name:"Potassium", description:"An electrolyte essential for heart and muscle function. Tacrolimus can cause elevated potassium (hyperkalemia), which can trigger dangerous heart arrhythmias.", normalRange:"3.5–5.0 mEq/L", whyMatters:"Tacrolimus-related hyperkalemia is a known side effect requiring monitoring." },
  { patterns: [/\bcalcium\b/i], name:"Calcium (Total)", description:"Essential for bone health, nerve transmission, and muscle contraction. Long-term steroid use reduces calcium absorption and bone density.", normalRange:"8.6–10.2 mg/dL", whyMatters:"Corticosteroids impair calcium absorption; osteoporosis risk after transplant." },
  { patterns: [/magnesium/i], name:"Magnesium", description:"A mineral involved in hundreds of enzymatic reactions. Tacrolimus causes urinary magnesium wasting, making low magnesium (hypomagnesemia) common in transplant patients.", normalRange:"1.7–2.2 mg/dL", whyMatters:"Tacrolimus-induced hypomagnesemia is very common; may require supplementation." },
  { patterns: [/phosph/i], name:"Phosphorus", description:"A mineral important for bone formation and energy production. Abnormal levels are common after transplant.", normalRange:"2.5–4.5 mg/dL", whyMatters:"Monitored for bone health and metabolic complications." },
  { patterns: [/\buric\s*acid\b/i], name:"Uric Acid", description:"A waste product from purine metabolism. High levels cause gout, which is more frequent in transplant patients on calcineurin inhibitors.", normalRange:"3.4–7.0 mg/dL (men)", whyMatters:"Tacrolimus/cyclosporine increase uric acid levels; gout is a common complication." },
  { patterns: [/\bwbc\b|white\s*blood/i], name:"WBC (White Blood Cell Count)", description:"Counts infection-fighting cells. Immunosuppressive drugs lower WBC (leukopenia), increasing infection risk. Mycophenolate and valganciclovir are common causes.", normalRange:"4.5–11.0 ×10³/µL", whyMatters:"Immunosuppression can cause leukopenia; low WBC increases infection risk." },
  { patterns: [/\brbc\b|red\s*blood\s*cell.*count/i], name:"RBC (Red Blood Cell Count)", description:"Counts oxygen-carrying red blood cells. Low counts indicate anemia, common after transplant.", normalRange:"4.5–5.9 ×10⁶/µL (men)", whyMatters:"Anemia is common post-transplant; mycophenolate and valganciclovir are frequent causes." },
  { patterns: [/\bhgb\b|hemoglobin/i], name:"Hemoglobin", description:"The protein in red blood cells that carries oxygen. Low hemoglobin indicates anemia.", normalRange:"13.5–17.5 g/dL (men)", whyMatters:"Low hemoglobin causes fatigue and reduced exercise tolerance." },
  { patterns: [/\bhct\b|hematocrit/i], name:"Hematocrit", description:"The percentage of blood volume occupied by red blood cells. Low hematocrit indicates anemia.", normalRange:"41–53% (men)", whyMatters:"Tracks red blood cell volume; used alongside hemoglobin to assess anemia." },
  { patterns: [/\bplatelet/i], name:"Platelets", description:"Cell fragments essential for blood clotting. Low platelets (thrombocytopenia) increase bleeding risk. Mycophenolate and valganciclovir can suppress platelet production.", normalRange:"150–400 ×10³/µL", whyMatters:"Thrombocytopenia is a known side effect of transplant immunosuppression." },
  { patterns: [/\bneutro/i], name:"Neutrophils", description:"The most abundant white blood cells, critical for fighting bacterial and fungal infections. Low neutrophils (neutropenia) severely increase infection risk.", normalRange:"1.8–7.7 ×10³/µL", whyMatters:"Neutropenia from immunosuppression is a major infection risk factor." },
  { patterns: [/\blympho/i], name:"Lymphocytes", description:"Immune cells that fight viral infections and recognize foreign tissue. Transplant immunosuppression intentionally reduces lymphocyte activity to prevent rejection.", normalRange:"1.0–4.8 ×10³/µL", whyMatters:"Monitored to balance rejection prevention vs. infection susceptibility." },
  { patterns: [/\btacrolimus\b|fk506/i], name:"Tacrolimus Level (Trough)", description:"Measures tacrolimus concentration in blood before the next dose. Target range varies by transplant type and time post-transplant. Too low risks rejection; too high risks nephrotoxicity, neurotoxicity, and infection.", normalRange:"5–10 ng/mL (early); 4–8 ng/mL (maintenance)", whyMatters:"Critical for balancing rejection prevention against drug toxicity." },
  { patterns: [/cyclosporine|ciclosporin/i], name:"Cyclosporine Level", description:"A calcineurin inhibitor similar to tacrolimus. Measured as trough or 2-hour post-dose (C2). Narrow therapeutic window requires close monitoring.", normalRange:"100–400 ng/mL (varies by protocol)", whyMatters:"Therapeutic drug monitoring essential to prevent rejection or toxicity." },
  { patterns: [/\bbnp\b|nt.*probnp|brain.*natriuretic/i], name:"BNP / NT-proBNP", description:"Hormones released when the heart is under stress or the heart muscle is stretched. Elevated levels indicate heart failure or fluid overload.", normalRange:"<100 pg/mL (BNP); <125 pg/mL (NT-proBNP)", whyMatters:"Monitors cardiac status, especially relevant with fluid retention after transplant." },
  { patterns: [/prothrombin|pt\b|inr/i], name:"PT / INR (Prothrombin Time)", description:"Measures how long blood takes to clot. The INR standardizes this measurement. In liver disease, a high INR reflects reduced clotting factor production.", normalRange:"11–13.5 seconds (PT); 0.9–1.1 (INR)", whyMatters:"Reflects synthetic liver function; elevated INR indicates impaired liver function." },
  { patterns: [/\balbumin\b/i], name:"Albumin", description:"A protein made by the liver that maintains fluid balance and transports substances in the blood. Low albumin indicates poor liver function or malnutrition.", normalRange:"3.5–5.0 g/dL", whyMatters:"A key marker of liver synthetic function and nutritional status." },
  { patterns: [/total\s*protein/i], name:"Total Protein", description:"Measures the total amount of protein in the blood, including albumin and globulins. Used to assess nutritional status and liver function.", normalRange:"6.3–8.2 g/dL", whyMatters:"Low protein can indicate liver disease, malnutrition, or protein-losing conditions." },
  { patterns: [/\bglobulin/i], name:"Globulin", description:"A group of proteins including antibodies and carrier proteins. High globulin may indicate chronic inflammation or immune activation.", normalRange:"2.0–3.5 g/dL", whyMatters:"Elevated globulin can reflect chronic infection or immune dysregulation." },
  { patterns: [/\bcholesterol\b|total\s*chol/i], name:"Total Cholesterol", description:"Measures all cholesterol in the blood. High levels increase cardiovascular disease risk, already elevated in transplant patients on steroids and tacrolimus.", normalRange:"<200 mg/dL (desirable)", whyMatters:"Transplant patients have higher cardiovascular risk; statin therapy often required." },
  { patterns: [/\bldl\b/i], name:"LDL Cholesterol", description:"\"Bad\" cholesterol that builds up in artery walls. Minimizing LDL is a priority in transplant patients who have elevated cardiovascular risk.", normalRange:"<100 mg/dL (optimal)", whyMatters:"Primary target for cardiovascular risk reduction post-transplant." },
  { patterns: [/\bhdl\b/i], name:"HDL Cholesterol", description:"\"Good\" cholesterol that removes LDL from the bloodstream. Higher levels are protective against heart disease.", normalRange:">40 mg/dL (men); >50 mg/dL (women)", whyMatters:"Low HDL compounds cardiovascular risk; exercise can raise HDL." },
  { patterns: [/triglyceride/i], name:"Triglycerides", description:"Fats stored in blood. Elevated levels are associated with metabolic syndrome, which is common in post-transplant patients due to steroids and weight gain.", normalRange:"<150 mg/dL", whyMatters:"High triglycerides contribute to cardiovascular and pancreatic disease risk." },
  { patterns: [/\bldh\b|lactate.*dehydro/i], name:"LDH (Lactate Dehydrogenase)", description:"An enzyme released during tissue damage. Non-specific marker elevated in many conditions including liver injury, hemolysis, and infection.", normalRange:"135–225 U/L", whyMatters:"Can indicate liver injury or hemolysis, particularly relevant if bilirubin is elevated." },
  { patterns: [/\btsh\b|thyroid.*stimulating/i], name:"TSH (Thyroid-Stimulating Hormone)", description:"Regulates thyroid function. Low TSH suggests hyperthyroidism; high TSH indicates hypothyroidism. Thyroid disease is more common in patients on long-term immunosuppression.", normalRange:"0.4–4.0 mIU/L", whyMatters:"Thyroid dysfunction affects metabolism, energy, and cardiac health." },
  { patterns: [/\bhba1c\b|hemoglobin\s*a1c/i], name:"Hemoglobin A1c (HbA1c)", description:"Reflects average blood glucose over 2–3 months. Used to diagnose and monitor diabetes, including post-transplant diabetes mellitus (PTDM).", normalRange:"<5.7% (normal); ≥6.5% (diabetes)", whyMatters:"Best measure of long-term glucose control." },
  { patterns: [/\bcmv\b/i], name:"CMV (Cytomegalovirus)", description:"A common virus that can reactivate after transplant due to immunosuppression. CMV disease can cause fever, low blood counts, hepatitis, and graft damage.", normalRange:"Undetectable (< assay lower limit)", whyMatters:"CMV reactivation is a serious risk requiring prophylaxis and monitoring post-transplant." },
  { patterns: [/\bebv\b/i], name:"EBV (Epstein-Barr Virus)", description:"A herpesvirus that can reactivate under immunosuppression. High EBV viral loads are associated with post-transplant lymphoproliferative disorder (PTLD).", normalRange:"Undetectable", whyMatters:"EBV-associated PTLD is a rare but serious malignancy risk after transplant." },
  { patterns: [/ferritin/i], name:"Ferritin", description:"A protein that stores iron. Elevated ferritin indicates iron overload or inflammation (acute-phase reaction). Low ferritin indicates iron deficiency.", normalRange:"12–300 ng/mL (men)", whyMatters:"Tracks iron stores; elevated ferritin is common in liver disease and inflammation." },
  { patterns: [/\biron\b|serum\s*iron/i], name:"Iron (Serum)", description:"Measures iron in the blood, distinct from stored iron (ferritin). Low iron is common in chronic disease states.", normalRange:"65–175 µg/dL", whyMatters:"Low serum iron contributes to anemia; monitored alongside ferritin and TIBC." },
  { patterns: [/\btibc\b|total.*iron.*bind/i], name:"TIBC (Total Iron-Binding Capacity)", description:"Measures the blood's capacity to bind and transport iron. High TIBC with low iron indicates iron deficiency anemia.", normalRange:"250–370 µg/dL", whyMatters:"Used with serum iron and ferritin to fully characterize iron status." },
  { patterns: [/\bc\s*reactive|crp\b/i], name:"CRP (C-Reactive Protein)", description:"A protein produced by the liver in response to inflammation or infection. A sensitive marker of acute inflammation, infection, or injury.", normalRange:"<1.0 mg/L (low risk); 1–3 mg/L (average risk); >3 mg/L (high risk)", whyMatters:"Elevated CRP can signal infection, rejection, or systemic inflammation." },
  { patterns: [/esr|erythrocyte.*sed/i], name:"ESR (Erythrocyte Sedimentation Rate)", description:"Measures how quickly red blood cells settle in a tube. A non-specific marker of inflammation, infection, and autoimmune disease.", normalRange:"0–15 mm/hr (men); 0–20 mm/hr (women)", whyMatters:"Used alongside CRP to detect systemic inflammation." },
  { patterns: [/\bbnp\b/i], name:"BNP (B-type Natriuretic Peptide)", description:"Released by the heart ventricles when under stress. A key marker for heart failure and fluid overload.", normalRange:"<100 pg/mL", whyMatters:"Elevated BNP signals cardiac stress, important in patients with hypertension or fluid retention." },
];

function lookupLabDef(testName) {
  if (!testName) return null;
  for (const def of LAB_DICTIONARY) {
    if (def.patterns.some(p => p.test(testName))) return def;
  }
  return null;
}

// Parse reference range strings into {low, high}
// Handles: "0.7-1.3", "70 - 100", "3.4–5.1", "3.4 to 5.1",
//          "0.70 - 1.30 mg/dL", "< 10.0", ">= 60", "150 - 400 K/µL"
function parseRefRange(str) {
  if (!str) return { low: null, high: null };
  const s = String(str).trim();
  // Two-number range: "X - Y", "X–Y", "X to Y"
  const mRange = s.match(/(\d+\.?\d*)\s*(?:[-–—]|to)\s*(\d+\.?\d*)/i);
  if (mRange) return { low: parseFloat(mRange[1]), high: parseFloat(mRange[2]) };
  // Less-than upper bound only: "< X" or "<= X" or "Up to X"
  const mLt = s.match(/(?:<=?|up\s*to)\s*(\d+\.?\d*)/i);
  if (mLt) return { low: 0, high: parseFloat(mLt[1]) };
  // Greater-than lower bound only: "> X" or ">= X"
  const mGt = s.match(/>=?\s*(\d+\.?\d*)/i);
  if (mGt) return { low: parseFloat(mGt[1]), high: parseFloat(mGt[1]) * 2 };
  return { low: null, high: null };
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
  const [showFlagged, setShowFlagged]   = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [trendRange, setTrendRange]     = useState(12); // months
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

  const selectImportedLab = (lab) => { setSelectedImportedLab(lab); setShowDescription(false); };

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
      <aside style={{ width: 220, minWidth: 220, background: "#080c14", borderRight: "1px solid #0d1a28", display: "flex", flexDirection: "column", height: "100vh" }}>
        <div style={{ padding: "10px 20px", borderBottom: "1px solid #0d1a28", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src={INTELLITRAX_LOGO} alt="Insina Health" style={{ width: "100%", height: "auto", display: "block" }} />
        </div>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #0d1a28" }}>
          <div style={{ fontSize: 10, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", marginBottom: 4 }}>PATIENT</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#c4d8ee" }}>Greg Butler</div>
          <div style={{ fontSize: 11, color: "#98afc4", marginTop: 2 }}>Transplant · Immunosuppressed</div>
        </div>
        <nav style={{ flex: 1, overflowY: "auto", padding: "10px 0" }}>
          <div style={{ padding: "8px 16px 4px", fontSize: 9, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", letterSpacing: "1.5px", textTransform: "uppercase" }}>CORE</div>
          {NAV.slice(0, 10).map(({ id, icon, label }) => (
            <div key={id} className={`nav-item ${activeNav === id ? "active" : ""}`} onClick={() => handleNav(id)}>
              <span className="nav-icon">{icon}</span><span>{label}</span>
            </div>
          ))}
          <div style={{ padding: "12px 16px 4px", fontSize: 9, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", letterSpacing: "1.5px", textTransform: "uppercase" }}>SYSTEM</div>
          {NAV.slice(10).map(({ id, icon, label }) => (
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
          <div style={{ fontSize: 11, color: "#98afc4", fontFamily: "'DM Mono',monospace", background: "#0b1220", border: "1px solid #111e30", padding: "5px 12px", borderRadius: 6 }}>
            Last import: {(() => { try { const logs = JSON.parse(localStorage.getItem("mi_import_log") || "[]"); if (logs.length) { const d = new Date(logs[logs.length-1].ts); return d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); } } catch {} return "—"; })()}
          </div>
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
              <div style={{ background: showFlagged ? "rgba(239,68,68,.08)" : "#0b1220", border: showFlagged ? "1px solid rgba(239,68,68,.4)" : "1px solid #111e30", borderRadius: 10, padding: "12px 14px", cursor:"pointer", transition:"all .15s" }} onClick={() => setShowFlagged(f => !f)}>
                <div style={{ fontSize: 20, fontWeight: 700, color: flaggedCount > 0 ? "#ef4444" : "#a0b4c8", lineHeight: 1, marginBottom: 3 }}>{flaggedCount}</div>
                <div style={{ fontSize: 10, color: showFlagged ? "#ef4444" : "#7eb8d8", fontWeight: 600 }}>Flagged</div>
                <div style={{ fontSize: 9, color: "#98afc4", fontFamily: "'DM Mono',monospace" }}>{showFlagged ? "click to clear" : "click to filter"}</div>
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
                  const visible = dedupedLabs
                    .filter(l => importedCatFilter === "All" || (l.category || "Other") === importedCatFilter)
                    .filter(l => !showFlagged || l.flag);
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
                            {lab.refRange && (
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
              const allHistory = [...importedLabs]
                .filter(l => (l.name || "").toLowerCase() === (selectedImportedLab.name || "").toLowerCase())
                .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
              // Filter by selected trend range
              const cutoff = new Date();
              cutoff.setMonth(cutoff.getMonth() - trendRange);
              const history = allHistory.filter(h => !h.date || new Date(h.date + "T12:00:00") >= cutoff);
              const hasHistory = allHistory.length > 1;
              // chartData uses null for low/high when ref range unavailable — TrendChart handles it gracefully
              const chartData = history.length > 1 ? { values: history.map(h => parseFloat(h.value)), low, high } : null;
              const histLabels = history.map(h => {
                if (!h.date) return "—";
                const d = new Date(h.date + "T12:00:00");
                return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
              });
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
                    {lookupLabDef(selectedImportedLab.name) && (
                      <button onClick={() => setShowDescription(d => !d)} style={{ padding:"7px 14px", background: showDescription ? "rgba(79,142,247,.2)" : "rgba(79,142,247,.08)", border:"1px solid rgba(79,142,247,.35)", borderRadius:8, color:"#7eb8d8", fontSize:11, fontFamily:"'DM Mono',monospace", cursor:"pointer", whiteSpace:"nowrap" }}>
                        {showDescription ? "✕ Hide Description" : "📋 Test Description"}
                      </button>
                    )}
                  </div>
                  {showDescription && (() => {
                    const def = lookupLabDef(selectedImportedLab.name);
                    if (!def) return null;
                    return (
                      <div style={{ background:"rgba(79,142,247,.06)", border:"1px solid rgba(79,142,247,.2)", borderRadius:12, padding:"16px 18px", marginBottom:18 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:"#c4d8ee", marginBottom:8 }}>{def.name}</div>
                        <div style={{ fontSize:12, color:"#a8c4dc", lineHeight:1.7, marginBottom:10 }}>{def.description}</div>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                          <div style={{ background:"#080c14", borderRadius:8, padding:"10px 12px" }}>
                            <div style={{ fontSize:9, color:"#a0b4c8", fontFamily:"'DM Mono',monospace", letterSpacing:"1px", textTransform:"uppercase", marginBottom:4 }}>Normal Range</div>
                            <div style={{ fontSize:12, color:"#10b981", fontFamily:"'DM Mono',monospace" }}>{def.normalRange}</div>
                          </div>
                          <div style={{ background:"#080c14", borderRadius:8, padding:"10px 12px" }}>
                            <div style={{ fontSize:9, color:"#a0b4c8", fontFamily:"'DM Mono',monospace", letterSpacing:"1px", textTransform:"uppercase", marginBottom:4 }}>Why It Matters</div>
                            <div style={{ fontSize:12, color:"#7eb8d8", lineHeight:1.5 }}>{def.whyMatters}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

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

                  {/* Trend chart (only if >1 readings exist across all time) */}
                  {hasHistory && (
                    <div style={{ background: "#0b1220", border: "1px solid #111e30", borderRadius: 14, padding: "18px 16px 12px", marginBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <div className="section-label" style={{ marginBottom: 0 }}>Trend — {history.length} reading{history.length !== 1 ? "s" : ""}</div>
                        <div style={{ display: "flex", gap: 4 }}>
                          {[3, 6, 12].map(mo => (
                            <button key={mo} className="time-btn" onClick={() => setTrendRange(mo)}
                              style={{ padding: "3px 10px", fontSize: 10, background: trendRange === mo ? "#4f8ef7" : "#0f1e30", color: trendRange === mo ? "#fff" : "#7eb8d8", border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>
                              {mo}mo
                            </button>
                          ))}
                        </div>
                      </div>
                      {chartData ? (
                        <TrendChart lab={chartData} color={lineColor} monthLabels={histLabels} />
                      ) : (
                        <div style={{ fontSize: 11, color: "#6a8090", fontFamily: "'DM Mono',monospace", padding: "16px 0", textAlign: "center" }}>
                          No readings in the selected {trendRange}-month window. Try a wider range.
                        </div>
                      )}
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
                      <div className="section-label">All Readings ({allHistory.length})</div>
                      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(allHistory.length, 6)}, 1fr)`, gap: 6 }}>
                        {[...allHistory].reverse().map((h, i) => {
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
