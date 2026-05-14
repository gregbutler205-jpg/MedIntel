import { useState, useEffect, useMemo } from "react";

const INTELLITRAX_LOGO = import.meta.env.BASE_URL + "logo-white.png";
const PRINT_LOGO = import.meta.env.BASE_URL + "logo.png";

const PROXY_URL = import.meta.env.VITE_PROXY_URL || "http://localhost:3001";
const CANONICAL_MAP_KEY = "mi_lab_canonical";

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
  { id: "careplan",    icon: "◷", label: "Care Plan/Team" },
  // ── System ─────────────────────────────────────────────────────────────────
  { id: "records",     icon: "▤", label: "Records" },
  { id: "documents",   icon: "▣", label: "Documents" },
  { id: "notes",       icon: "◻", label: "Notes" },
  { id: "ai",          icon: "✦", label: "AI Analysis" },
  { id: "import",      icon: "↓", label: "Import Records" },
  { id: "backup",      icon: "◈", label: "Settings & Backup" },
];


// Range bar — amber outside, green inside, badge + caret at value position.
// When customLow/customHigh are provided, the bar shows BOTH the lab's
// printed range (dim green) and the doctor's custom range (solid green),
// with labels for each set anchored to their zone boundaries.
function RangeBar({ value, low, high, customLow = null, customHigh = null, compact = false }) {
  if (value === null) return <div style={{ width: compact ? 90 : "100%", height: compact ? 28 : 52 }} />;
  const hasCustom = customLow !== null && customHigh !== null;

  // Display window spans the outermost edges of whichever ranges exist
  const allLow  = [low, hasCustom ? customLow  : null].filter(v => v !== null);
  const allHigh = [high, hasCustom ? customHigh : null].filter(v => v !== null);
  const winLow  = allLow.length  ? Math.min(...allLow)  : value * 0.7;
  const winHigh = allHigh.length ? Math.max(...allHigh) : value * 1.3;
  const span = winHigh - winLow || 1;
  const pad  = span * 0.45;
  const minD = winLow - pad, maxD = winHigh + pad;
  const total = maxD - minD;

  const pct = v => ((v - minD) / total) * 100;
  const labLowPct  = low  !== null ? pct(low)  : null;
  const labHighPct = high !== null ? pct(high) : null;
  const custLowPct  = hasCustom ? pct(customLow)  : null;
  const custHighPct = hasCustom ? pct(customHigh) : null;
  const valPct = Math.min(98, Math.max(2, pct(value)));

  // In-range: prefer custom range when set
  const inCustom = hasCustom && value >= customLow && value <= customHigh;
  const inLab    = low !== null && high !== null && value >= low && value <= high;
  const inRange  = hasCustom ? inCustom : inLab;
  const badgeColor = inRange ? "#10b981" : "#f59e0b";
  const h = compact ? 6 : 11;

  return (
    <div style={{ width: compact ? 90 : "100%", position: "relative", paddingTop: compact ? 18 : 22, flexShrink: 0 }}>
      {/* Value badge */}
      <div style={{
        position: "absolute", top: 0, left: `${valPct}%`, transform: "translateX(-50%)",
        background: badgeColor, color: "#fff", fontSize: compact ? 8.5 : 9.5,
        fontWeight: 700, fontFamily: "'DM Mono',monospace",
        padding: compact ? "1px 5px" : "2px 7px", borderRadius: 20,
        whiteSpace: "nowrap", lineHeight: 1.4,
        boxShadow: `0 0 8px ${badgeColor}60`,
      }}>{value}</div>
      {/* Caret */}
      <div style={{
        position: "absolute", top: compact ? 14 : 17, left: `${valPct}%`, transform: "translateX(-50%)",
        width: 0, height: 0,
        borderLeft: "4px solid transparent", borderRight: "4px solid transparent",
        borderTop: `4px solid ${badgeColor}`,
      }} />
      {/* Track */}
      <div style={{ position: "relative", height: h, borderRadius: 3, overflow: "hidden", background: "#f59e0b" }}>
        {/* Lab printed range — dim green when custom exists, solid when no custom */}
        {labLowPct !== null && (
          <div style={{
            position: "absolute", left: `${labLowPct}%`, width: `${labHighPct - labLowPct}%`,
            height: "100%", background: hasCustom ? "rgba(16,185,129,0.32)" : "#10b981",
          }} />
        )}
        {/* Doctor's custom range — solid bright green on top */}
        {hasCustom && (
          <div style={{
            position: "absolute", left: `${custLowPct}%`, width: `${custHighPct - custLowPct}%`,
            height: "100%", background: "#10b981",
          }} />
        )}
      </div>
      {/* Labels */}
      {!compact && (
        <div style={{ position: "relative", marginTop: 3 }}>
          {/* Custom range labels — bright green, primary */}
          {hasCustom && (
            <div style={{ position: "relative", height: 14 }}>
              <span style={{ position: "absolute", left: `${custLowPct}%`, transform: "translateX(-50%)", fontSize: 8, color: "#10b981", fontFamily: "'DM Mono',monospace", whiteSpace: "nowrap" }}>{customLow}</span>
              <span style={{ position: "absolute", left: `${custHighPct}%`, transform: "translateX(-50%)", fontSize: 8, color: "#10b981", fontFamily: "'DM Mono',monospace", whiteSpace: "nowrap" }}>{customHigh}</span>
            </div>
          )}
          {/* Lab range labels — dim when custom present, normal when sole range */}
          {labLowPct !== null && (
            <div style={{ position: "relative", height: 13 }}>
              <span style={{ position: "absolute", left: `${labLowPct}%`, transform: "translateX(-50%)", fontSize: hasCustom ? 7.5 : 8, color: hasCustom ? "#4a5c6a" : "#98afc4", fontFamily: "'DM Mono',monospace", whiteSpace: "nowrap" }}>{low}</span>
              <span style={{ position: "absolute", left: `${labHighPct}%`, transform: "translateX(-50%)", fontSize: hasCustom ? 7.5 : 8, color: hasCustom ? "#4a5c6a" : "#98afc4", fontFamily: "'DM Mono',monospace", whiteSpace: "nowrap" }}>{high}</span>
            </div>
          )}
          {/* Legend when both ranges shown */}
          {hasCustom && labLowPct !== null && (
            <div style={{ display: "flex", gap: 10, marginTop: 3 }}>
              <span style={{ fontSize: 7.5, color: "#10b981", fontFamily: "'DM Mono',monospace" }}>▬ Your range</span>
              <span style={{ fontSize: 7.5, color: "#4a5c6a", fontFamily: "'DM Mono',monospace" }}>▬ Lab range</span>
            </div>
          )}
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
  { patterns: [/egfr|\bgfr\b|glomer.*filt/i], name:"eGFR / GFR (Estimated Glomerular Filtration Rate)", description:"Estimates how well the kidneys filter blood each minute. Values below 60 indicate reduced kidney function. Monitored closely in transplant patients taking calcineurin inhibitors like tacrolimus.", normalRange:"≥60 mL/min/1.73m²", whyMatters:"Primary measure of kidney function; tracks long-term tacrolimus nephrotoxicity." },
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
  { patterns: [/\bneutro|\bsegs\b/i], name:"Neutrophils / Segs", description:"The most abundant white blood cells, critical for fighting bacterial and fungal infections. Segmented neutrophils (Segs or SEGS%) are the mature form, counted as a percentage of white blood cells in the differential. Low neutrophils (neutropenia) severely increase infection risk.", normalRange:"1.8–7.7 ×10³/µL (Absolute); 50–70% (Differential)", whyMatters:"Neutropenia from immunosuppression is a major infection risk factor; SEGS% tracks mature neutrophil activity." },
  { patterns: [/\blympho|\blymph\b/i], name:"Lymphocytes / Lymph %", description:"Immune cells that fight viral infections and recognize foreign tissue. Transplant immunosuppression intentionally reduces lymphocyte activity to prevent rejection. Lymph % is the differential percentage of lymphocytes in the white blood cell count.", normalRange:"1.0–4.8 ×10³/µL (Absolute); 20–40% (Differential)", whyMatters:"Monitored to balance rejection prevention vs. infection susceptibility; very low lymphocytes signal heavy immunosuppression." },
  { patterns: [/\btacrolimus\b|fk506/i], name:"Tacrolimus Level (Trough)", description:"Measures tacrolimus concentration in blood before the next dose. Target range varies by transplant type and time post-transplant. Too low risks rejection; too high risks nephrotoxicity, neurotoxicity, and infection.", normalRange:"5–10 ng/mL (early); 4–8 ng/mL (maintenance)", whyMatters:"Critical for balancing rejection prevention against drug toxicity." },
  { patterns: [/cyclosporine|ciclosporin/i], name:"Cyclosporine Level", description:"A calcineurin inhibitor similar to tacrolimus. Measured as trough or 2-hour post-dose (C2). Narrow therapeutic window requires close monitoring.", normalRange:"100–400 ng/mL (varies by protocol)", whyMatters:"Therapeutic drug monitoring essential to prevent rejection or toxicity." },
  { patterns: [/\bbnp\b|nt.*probnp|brain.*natriuretic/i], name:"BNP / NT-proBNP", description:"Hormones released when the heart is under stress or the heart muscle is stretched. Elevated levels indicate heart failure or fluid overload.", normalRange:"<100 pg/mL (BNP); <125 pg/mL (NT-proBNP)", whyMatters:"Monitors cardiac status, especially relevant with fluid retention after transplant." },
  { patterns: [/prothrombin|pt\b|inr/i], name:"PT / INR (Prothrombin Time)", description:"Measures how long blood takes to clot. The INR standardizes this measurement. In liver disease, a high INR reflects reduced clotting factor production.", normalRange:"11–13.5 seconds (PT); 0.9–1.1 (INR)", whyMatters:"Reflects synthetic liver function; elevated INR indicates impaired liver function." },
  { patterns: [/\balbumin\b/i], name:"Albumin", description:"A protein made by the liver that maintains fluid balance and transports substances in the blood. Low albumin indicates poor liver function or malnutrition.", normalRange:"3.5–5.0 g/dL", whyMatters:"A key marker of liver synthetic function and nutritional status." },
  { patterns: [/total\s*protein|protein\s*total/i], name:"Total Protein", description:"Measures the total amount of protein in the blood, including albumin and globulins. Used to assess nutritional status and liver function.", normalRange:"6.3–8.2 g/dL", whyMatters:"Low protein can indicate liver disease, malnutrition, or protein-losing conditions." },
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
  // ── CBC Indices ─────────────────────────────────────────────────────────────
  { patterns: [/\bmcv\b/i], name:"MCV (Mean Corpuscular Volume)", description:"The average size of red blood cells. A low MCV (microcytic) suggests iron deficiency or thalassemia. A high MCV (macrocytic) suggests vitamin B12 or folate deficiency. Mycophenolate can cause macrocytosis (enlarged red blood cells), making MCV a useful monitoring tool in transplant patients.", normalRange:"80–100 fL", whyMatters:"Helps classify anemia type; mycophenolate-related macrocytosis (high MCV) is common in transplant patients." },
  { patterns: [/\bmch\b(?!c)/i], name:"MCH (Mean Corpuscular Hemoglobin)", description:"The average amount of hemoglobin inside each red blood cell. Low MCH (hypochromic cells) usually accompanies iron deficiency anemia. High MCH may indicate vitamin B12 or folate deficiency, which can occur with certain medications including mycophenolate.", normalRange:"27–33 pg", whyMatters:"Low MCH suggests iron deficiency; high MCH may indicate B12/folate deficiency common in patients on immunosuppressants." },
  { patterns: [/\bmchc\b/i], name:"MCHC (Mean Corpuscular Hemoglobin Concentration)", description:"The average concentration of hemoglobin packed into each red blood cell. Low MCHC occurs in iron deficiency or thalassemia. High MCHC may suggest hereditary spherocytosis. Used alongside MCV and MCH to characterize the type of anemia present.", normalRange:"32–36 g/dL", whyMatters:"Used alongside MCV and MCH to identify the specific type and likely cause of anemia post-transplant." },
  { patterns: [/\brdw[- ]*sd\b/i], name:"RDW-SD (Red Cell Distribution Width — Standard Deviation)", description:"Measures the actual width of the red blood cell size distribution in femtoliters — a more absolute measure than the percentage-based RDW-CV. Elevated values indicate anisocytosis (variation in red blood cell size). Used alongside RDW-CV to fully characterize red blood cell size variation and anemia type.", normalRange:"39–46 fL", whyMatters:"Provides additional detail on red blood cell size variation; helps characterize anemia type alongside RDW-CV." },
  { patterns: [/\brdw\b/i], name:"RDW (Red Cell Distribution Width)", description:"Measures the variation in size of red blood cells as a percentage (RDW-CV). A high RDW (anisocytosis) indicates that red blood cells vary widely in size, occurring in iron deficiency, B12/folate deficiency, and mixed anemias. Chronic disease and nutritional deficiencies common after transplant can elevate RDW.", normalRange:"11.5–14.5%", whyMatters:"An elevated RDW suggests mixed or nutritional anemia — common post-transplant; often rises before MCV changes are visible." },
  // ── White Blood Cell Differential ───────────────────────────────────────────
  { patterns: [/\bmonocyte/i], name:"Monocytes", description:"White blood cells that engulf and destroy pathogens and dead cells, playing a key role in immune surveillance. Elevated monocytes (monocytosis) may indicate chronic infection, inflammatory disease, or recovery from acute illness. Low counts are seen with severe immunosuppression. Reported as absolute count, percentage, or relative value.", normalRange:"0.2–0.8 ×10³/µL (Absolute); 2–8% (Differential)", whyMatters:"Monocyte counts reflect immune activity; significant changes may signal infection or altered immune status post-transplant." },
  { patterns: [/\beosino/i], name:"Eosinophils", description:"White blood cells involved in allergic reactions and fighting parasites. Mild elevations are common with allergies or asthma. After transplant, elevated eosinophils can indicate drug hypersensitivity reactions, atypical infections, or in rare cases, eosinophilic rejection. Very low counts are typical during acute steroid therapy.", normalRange:"0.05–0.5 ×10³/µL (Absolute); 1–4% (Differential)", whyMatters:"Elevated eosinophils post-transplant may signal drug hypersensitivity or atypical infection worth investigating." },
  { patterns: [/\bbasophil/i], name:"Basophils", description:"The rarest type of white blood cell, involved in allergic responses and inflammation. Basophils typically make up less than 1% of white blood cells. Low counts are common and rarely clinically significant. Very high counts (basophilia) may indicate allergic reactions, inflammatory conditions, or rarely blood disorders.", normalRange:"0–0.1 ×10³/µL (Absolute); 0–1% (Differential)", whyMatters:"Monitored as part of the CBC differential; significant elevations may indicate allergic or inflammatory conditions." },
  // ── Metabolic / Chemistry ────────────────────────────────────────────────────
  { patterns: [/\bbun\b|blood\s*urea\s*nitrogen|urea\s*nitrogen/i], name:"BUN (Blood Urea Nitrogen)", description:"A waste product from protein metabolism, filtered by the kidneys. Elevated BUN indicates impaired kidney function, dehydration, or high protein intake. In transplant patients on tacrolimus, rising BUN alongside creatinine suggests nephrotoxicity. The BUN-to-creatinine ratio helps distinguish kidney disease from dehydration.", normalRange:"7–20 mg/dL", whyMatters:"Monitors kidney filtration function alongside creatinine; tacrolimus nephrotoxicity is a key concern post-transplant." },
  { patterns: [/\bco2\b|carbon\s*dioxide|bicarbonate/i], name:"CO2 (Carbon Dioxide / Bicarbonate)", description:"Reported as bicarbonate on a basic metabolic panel, CO2 reflects the body's acid-base balance. Low CO2 indicates metabolic acidosis, which can occur in kidney disease, diabetic ketoacidosis, or renal tubular acidosis — a known complication of tacrolimus. High CO2 suggests metabolic alkalosis from vomiting or diuretic use.", normalRange:"22–29 mEq/L", whyMatters:"Monitors acid-base status; declining CO2 in transplant patients may indicate worsening kidney function or tacrolimus-related renal tubular acidosis." },
  { patterns: [/anion\s*gap/i], name:"Anion Gap", description:"The difference between measured positively and negatively charged ions in the blood. An elevated anion gap indicates that the body is producing or retaining excess acids (metabolic acidosis), occurring in sepsis, acute kidney injury, diabetic ketoacidosis, or toxic ingestions. In transplant patients, infections and kidney impairment are the most common causes.", normalRange:"3–11 mEq/L", whyMatters:"An elevated anion gap in transplant patients may signal acute kidney injury, sepsis, or metabolic complications requiring urgent evaluation." },
  { patterns: [/\ba[\s/]?g\s*ratio|albumin.*globulin.*ratio/i], name:"A/G Ratio (Albumin/Globulin Ratio)", description:"The ratio of albumin to globulin proteins in the blood. A low A/G ratio (below 1.1) may indicate liver disease reducing albumin production, kidney disease causing protein loss, or immune activation increasing globulins. A high ratio may suggest hypogammaglobulinemia. In transplant patients, this ratio helps assess both liver synthetic function and immune status.", normalRange:"1.1–2.5", whyMatters:"Abnormal A/G ratio signals liver dysfunction or immune dysregulation — both critical to monitor after transplant." },
  { patterns: [/osmolality/i], name:"Osmolality (Calculated / Serum)", description:"Measures the concentration of dissolved particles in the blood, reflecting hydration status and kidney concentrating ability. Elevated serum osmolality indicates dehydration or high sodium/glucose. A large difference between calculated and measured osmolality (osmol gap) can signal toxic alcohol ingestion or severe metabolic disturbance. Relevant in transplant patients with fluid management challenges.", normalRange:"275–295 mOsm/kg H₂O", whyMatters:"Monitors hydration status and fluid balance; helps detect dehydration and certain metabolic disturbances post-transplant." },
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

function answerToHTML(rawText) {
  if (!rawText) return "";
  const text = rawText
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, "")
    .replace(/[\u{2600}-\u{27BF}]/gu, "")
    .replace(/\u{FE0F}/gu, "")
    .replace(/✦/g, "");
  const bold = (s) => s.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  return text.split("\n").map(line => {
    const t = line.trim();
    if (/^-{3,}$/.test(t)) return `<hr style="border:none;border-top:1px solid #ddd;margin:14px 0">`;
    if (t.includes("|")) {
      if (/^\|?[\s\-|]+\|?$/.test(t)) return "";
      const cells = t.split("|").map(c => c.trim()).filter(Boolean);
      if (cells.length >= 2)
        return `<div style="display:flex;gap:16px;margin-bottom:6px;padding-left:8px">
          <span style="font-weight:700;min-width:160px;flex-shrink:0">${bold(cells[0])}</span>
          <span>${bold(cells.slice(1).join(" — "))}</span></div>`;
    }
    const hm = t.match(/^\*\*([^*]+?)\*\*:?\s*$/);
    if (hm) return `<div style="font-weight:700;font-size:15px;margin-top:16px;margin-bottom:6px">${hm[1].replace(/:$/, "")}</div>`;
    if (t.startsWith("- ") || t.startsWith("• ")) {
      const c = t.replace(/^[-•]\s+/, "");
      return `<div style="display:flex;gap:8px;margin-bottom:5px;padding-left:8px">
        <span style="color:#2563eb;flex-shrink:0;font-weight:700">&#9658;</span>
        <span>${bold(c)}</span></div>`;
    }
    const nm = t.match(/^(\d+)\.\s+(.+)/);
    if (nm) return `<div style="display:flex;gap:8px;margin-bottom:6px;padding-left:8px">
      <span style="font-weight:700;flex-shrink:0;min-width:22px;color:#2563eb">${nm[1]}.</span>
      <span>${bold(nm[2])}</span></div>`;
    if (t === "") return `<div style="height:8px"></div>`;
    return `<div style="margin-bottom:4px;line-height:1.75">${bold(line)}</div>`;
  }).join("");
}

function printAIResponse(question, answer, logoUrl) {
  const date = new Date().toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" });
  const win = window.open("", "_blank", "width=900,height=700");
  win.document.write(`<!DOCTYPE html><html><head>
    <title>AI Analysis — Insina Health</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Georgia, serif; max-width: 760px; margin: 48px auto; color: #1a1a1a; font-size: 14px; line-height: 1.65; padding: 0 24px; }
      .logo { height: 56px; margin-bottom: 20px; }
      h1 { text-align: center; font-size: 30px; font-weight: 700; letter-spacing: -.5px; margin-bottom: 10px; }
      .rule { border: none; border-top: 2px solid #2563eb; margin-bottom: 26px; }
      .q-label { font-weight: 700; font-size: 13px; margin-bottom: 5px; }
      .q-text  { margin-bottom: 22px; font-size: 14px; }
      .a-label { font-weight: 700; font-size: 16px; margin-bottom: 14px; }
      .footer  { margin-top: 48px; border-top: 1px solid #ddd; padding-top: 12px; font-size: 11px; color: #777; display: flex; justify-content: space-between; }
      @media print { body { margin: 28px; } }
    </style>
  </head><body>
    <img src="${logoUrl}" class="logo" />
    <h1>AI Analysis</h1>
    <hr class="rule" />
    <div class="q-label">Question:</div>
    <div class="q-text">${question.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
    <div class="a-label">Analysis</div>
    ${answerToHTML(answer)}
    <div class="footer">
      <span>Insina Health &mdash; Personal Health Intelligence</span>
      <span>Generated ${date}</span>
    </div>
    <script>window.onload = function(){ window.print(); }<\/script>
  </body></html>`);
  win.document.close();
}

function printLabReport(labs, logoUrl) {
  // Most recent entry per test name
  const latest = {};
  labs.forEach(l => {
    const key = (l.name || "").toLowerCase().trim();
    if (!key) return;
    if (!latest[key] || new Date(l.date || 0) > new Date(latest[key].date || 0)) latest[key] = l;
  });
  const tests = Object.values(latest);

  const LAB_CAT_ORDER = getLabCatOrder();
  const grouped = {};
  tests.forEach(t => {
    const cat = t.category || "Other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(t);
  });
  Object.values(grouped).forEach(arr => arr.sort((a, b) => (a.name||"").localeCompare(b.name||"")));
  const orderedCats = [...LAB_CAT_ORDER, ...Object.keys(grouped).filter(c => !LAB_CAT_ORDER.includes(c))];

  const date = new Date().toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" });

  const tableRows = orderedCats.filter(c => grouped[c]?.length).map(cat => {
    const rows = grouped[cat].map(t => {
      const status = t.flag ? '<span style="color:#d97706;font-weight:700">⚠ Flagged</span>' : '<span style="color:#059669">✓ Normal</span>';
      return `<tr>
        <td>${(t.name||"").replace(/</g,"&lt;")}</td>
        <td style="text-align:center;font-weight:600">${t.value||"—"}</td>
        <td style="text-align:center">${t.unit||"—"}</td>
        <td style="text-align:center">${t.refRange||"—"}</td>
        <td style="text-align:center">${t.date||"—"}</td>
        <td style="text-align:center">${status}</td>
      </tr>`;
    }).join("");
    return `<tr><td colspan="6" class="cat-hdr">${cat}</td></tr>${rows}`;
  }).join("");

  const win = window.open("", "_blank", "width=1000,height=750");
  win.document.write(`<!DOCTYPE html><html><head>
    <title>Lab Report — Insina Health</title>
    <style>
      * { box-sizing:border-box; margin:0; padding:0; }
      body { font-family:Arial,sans-serif; max-width:900px; margin:40px auto; color:#1a1a1a; font-size:13px; line-height:1.5; padding:0 24px; }
      .logo { height:50px; margin-bottom:18px; }
      h1 { font-size:26px; font-weight:700; letter-spacing:-.4px; margin-bottom:4px; }
      .subtitle { font-size:12px; color:#555; margin-bottom:20px; }
      hr { border:none; border-top:2px solid #2563eb; margin-bottom:22px; }
      table { width:100%; border-collapse:collapse; font-size:12px; }
      th { background:#1e40af; color:#fff; padding:8px 10px; text-align:left; font-size:11px; letter-spacing:.5px; text-transform:uppercase; }
      td { padding:7px 10px; border-bottom:1px solid #e5e7eb; }
      tr:nth-child(even) td { background:#f8faff; }
      .cat-hdr { background:#dbeafe; color:#1e3a8a; font-weight:700; font-size:11px; letter-spacing:1px; text-transform:uppercase; padding:8px 10px; }
      .footer { margin-top:36px; border-top:1px solid #ddd; padding-top:10px; font-size:10px; color:#777; display:flex; justify-content:space-between; }
      @media print { body { margin:18px; } }
    </style>
  </head><body>
    <img src="${logoUrl}" class="logo" />
    <h1>Lab Results Report</h1>
    <div class="subtitle">Most recent value per test &nbsp;·&nbsp; Generated ${date}</div>
    <hr />
    <table>
      <thead><tr>
        <th>Test Name</th><th style="text-align:center">Value</th><th style="text-align:center">Unit</th>
        <th style="text-align:center">Ref Range</th><th style="text-align:center">Date</th><th style="text-align:center">Status</th>
      </tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
    <div class="footer">
      <span>Insina Health &mdash; Personal Health Intelligence</span>
      <span>Printed ${date} &nbsp;·&nbsp; ${tests.length} tests</span>
    </div>
    <script>window.onload = function(){ window.print(); }<\/script>
  </body></html>`);
  win.document.close();
}

// Shared AI response renderer — strips emojis, renders bold/bullets/dividers cleanly
function renderMarkdown(rawText) {
  if (!rawText) return null;
  const text = rawText
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, "")
    .replace(/[\u{2600}-\u{27BF}]/gu, "")
    .replace(/\u{FE0F}/gu, "")
    .replace(/✦/g, "");
  const applyBold = (str) =>
    str.replace(/\*\*(.*?)\*\*/g, (_, m) =>
      `<strong style="color:#c4d8ee;font-weight:700">${m}</strong>`
    );
  return text.split("\n").map((line, i) => {
    const trimmed = line.trim();
    if (/^-{3,}$/.test(trimmed))
      return <hr key={i} style={{ border:"none", borderTop:"1px solid #1a2840", margin:"12px 0" }} />;
    if (trimmed.includes("|")) {
      if (/^\|?[\s\-|]+\|?$/.test(trimmed)) return <div key={i} style={{ height:2 }} />;
      const cells = trimmed.split("|").map(c => c.trim()).filter(Boolean);
      if (cells.length >= 2) return (
        <div key={i} style={{ display:"flex", gap:10, marginBottom:5, paddingLeft:4 }}>
          <span dangerouslySetInnerHTML={{ __html: applyBold(cells[0]) }}
            style={{ fontWeight:700, color:"#c4d8ee", minWidth:140, flexShrink:0 }} />
          <span dangerouslySetInnerHTML={{ __html: applyBold(cells.slice(1).join(" — ")) }}
            style={{ color:"#a8c4dc" }} />
        </div>
      );
    }
    const headerMatch = trimmed.match(/^\*\*([^*]+?)\*\*:?\s*$/);
    if (headerMatch) return (
      <div key={i} style={{ fontWeight:700, color:"#c4d8ee", fontSize:13, marginTop:14, marginBottom:4 }}>
        {headerMatch[1].replace(/:$/, "")}
      </div>
    );
    if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      const content = trimmed.replace(/^[-•]\s+/, "");
      return (
        <div key={i} style={{ display:"flex", gap:8, marginBottom:4, paddingLeft:4 }}>
          <span style={{ color:"#4f8ef7", flexShrink:0, marginTop:4, fontSize:9 }}>▸</span>
          <span dangerouslySetInnerHTML={{ __html: applyBold(content) }} style={{ lineHeight:1.7 }} />
        </div>
      );
    }
    const numMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
    if (numMatch) return (
      <div key={i} style={{ display:"flex", gap:8, marginBottom:5, paddingLeft:4 }}>
        <span style={{ color:"#4f8ef7", fontWeight:700, flexShrink:0, minWidth:22,
          fontFamily:"'DM Mono',monospace", fontSize:11 }}>{numMatch[1]}.</span>
        <span dangerouslySetInnerHTML={{ __html: applyBold(numMatch[2]) }} style={{ lineHeight:1.7 }} />
      </div>
    );
    if (trimmed === "") return <div key={i} style={{ height:6 }} />;
    return <div key={i} dangerouslySetInnerHTML={{ __html: applyBold(line) }}
      style={{ marginBottom:3, lineHeight:1.75 }} />;
  });
}

// ── Duplicate detection ──────────────────────────────────────────────────────
// Strips common lab name suffixes/noise to find names that refer to the same test
function normalizeName(name) {
  return (name || "")
    .toLowerCase()
    .replace(/\b(level|lvl|trough|total|serum|whole\s*blood|blood|fasting|non[\-\s]?fasting|result|test|count|concentration|plasma|urine|random|am|pm|morning|panel|screen|assay)\b/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ALL_LAB_CATEGORIES = ["CBC / Hematology","Chemistry","Electrolytes","Endocrine","Immunosuppression","Infection / Serology","Lipid Panel","Liver Panel","Urinalysis","Other"];

function getLabCatOrder() {
  try { return JSON.parse(localStorage.getItem("mi_lab_category_order") || "null") || ALL_LAB_CATEGORIES; }
  catch { return ALL_LAB_CATEGORIES; }
}

function detectDuplicates(labs) {
  const groups = {};
  labs.forEach(l => {
    const norm = normalizeName(l.name);
    if (!norm) return;
    if (!groups[norm]) groups[norm] = new Set();
    groups[norm].add(l.name);
  });
  return Object.entries(groups)
    .filter(([, names]) => names.size >= 2)
    .map(([norm, names]) => {
      const nameArr = [...names];
      return {
        norm,
        names: nameArr,
        variants: nameArr.map(name => ({
          name,
          count: labs.filter(l => l.name === name).length,
          dateRange: (() => {
            const dates = labs.filter(l => l.name === name && l.date).map(l => l.date).sort();
            if (!dates.length) return null;
            return dates.length === 1 ? dates[0] : `${dates[0]} – ${dates[dates.length - 1]}`;
          })(),
        })).sort((a, b) => b.count - a.count), // most common first
      };
    });
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
  const [aiQuestion, setAiQuestion]     = useState("");
  const [aiQA, setAiQA]                 = useState([]);
  const [aiQALoading, setAiQALoading]   = useState(false);
  const [showAddLab, setShowAddLab]     = useState(false);
  const [newLab, setNewLab]             = useState({ name:"", value:"", unit:"", refRange:"", category:"Chemistry", date:"", notes:"" });
  const [showDupModal, setShowDupModal] = useState(false);
  const [dupGroups, setDupGroups]       = useState([]);
  // { [norm]: { canonical: string, skip: bool } }
  const [dupDecisions, setDupDecisions] = useState({});

  const [labCatOrder, setLabCatOrder] = useState(getLabCatOrder);
  useEffect(() => {
    const refresh = () => setLabCatOrder(getLabCatOrder());
    window.addEventListener("mi_lab_cat_order_changed", refresh);
    return () => window.removeEventListener("mi_lab_cat_order_changed", refresh);
  }, []);

  // ── Custom reference ranges ────────────────────────────────────────────────
  const [customRanges, setCustomRanges] = useState(() => {
    try { return JSON.parse(localStorage.getItem("mi_lab_custom_ranges") || "{}"); } catch { return {}; }
  });
  const [editingCustomRange, setEditingCustomRange] = useState(null); // lab name being edited
  const [customRangeForm, setCustomRangeForm] = useState({ low: "", high: "" });

  function saveCustomRange(labName, low, high) {
    const key = (labName || "").toLowerCase().trim();
    const lo = parseFloat(low), hi = parseFloat(high);
    if (!key || isNaN(lo) || isNaN(hi) || lo >= hi) return;
    const updated = { ...customRanges, [key]: { low: lo, high: hi } };
    setCustomRanges(updated);
    localStorage.setItem("mi_lab_custom_ranges", JSON.stringify(updated));
    setEditingCustomRange(null);
  }

  function removeCustomRange(labName) {
    const key = (labName || "").toLowerCase().trim();
    const updated = { ...customRanges };
    delete updated[key];
    setCustomRanges(updated);
    localStorage.setItem("mi_lab_custom_ranges", JSON.stringify(updated));
  }

  function handleAddLab() {
    if (!newLab.name.trim() || !newLab.value.trim()) return;
    // Auto-detect flag from ref range
    let flag = false;
    if (newLab.refRange) {
      const mRange = newLab.refRange.match(/(\d+\.?\d*)\s*[-–]\s*(\d+\.?\d*)/);
      if (mRange) {
        const v = parseFloat(newLab.value);
        if (!isNaN(v) && (v < parseFloat(mRange[1]) || v > parseFloat(mRange[2]))) flag = true;
      }
    }
    const entry = {
      name: newLab.name.trim(),
      value: newLab.value.trim(),
      unit: newLab.unit.trim(),
      refRange: newLab.refRange.trim(),
      category: newLab.category,
      date: newLab.date || new Date().toISOString().split("T")[0],
      facility: "Manual Entry",
      notes: newLab.notes.trim(),
      flag,
    };
    const updated = [entry, ...importedLabs];
    setImportedLabs(updated);
    try { localStorage.setItem("mi_labs", JSON.stringify(updated)); } catch {}
    setNewLab({ name:"", value:"", unit:"", refRange:"", category:"Chemistry", date:"", notes:"" });
    setShowAddLab(false);
    setSelectedImportedLab(entry);
  }

  // Recompute duplicate groups whenever labs change
  const duplicateGroups = useMemo(() => detectDuplicates(importedLabs), [importedLabs]);

  function openDupModal() {
    const groups = detectDuplicates(importedLabs);
    // Default canonical = variant with most entries (already sorted that way)
    const decisions = {};
    groups.forEach(g => {
      decisions[g.norm] = { canonical: g.variants[0].name, skip: false };
    });
    setDupGroups(groups);
    setDupDecisions(decisions);
    setShowDupModal(true);
  }

  function applyMerges() {
    let updated = [...importedLabs];
    dupGroups.forEach(g => {
      const dec = dupDecisions[g.norm];
      if (!dec || dec.skip) return;
      updated = updated.map(lab =>
        g.names.includes(lab.name) && lab.name !== dec.canonical
          ? { ...lab, name: dec.canonical }
          : lab
      );
      // Persist canonical map so other components can use it
      try {
        const map = JSON.parse(localStorage.getItem(CANONICAL_MAP_KEY) || "{}");
        g.names.forEach(n => { map[n.toLowerCase()] = dec.canonical; });
        localStorage.setItem(CANONICAL_MAP_KEY, JSON.stringify(map));
      } catch {}
    });
    setImportedLabs(updated);
    try { localStorage.setItem("mi_labs", JSON.stringify(updated)); } catch {}
    setSelectedImportedLab(null);
    setShowDupModal(false);
  }

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

      // Patient name from profile
      const patientName = (() => { try { const p = JSON.parse(localStorage.getItem("mi_profile_personal") || "{}"); return p.name || "the patient"; } catch { return "the patient"; } })();

      // Build lab summary from most recent imported results (deduplicated by name — latest per test)
      const dedupForAI = {};
      [...importedLabs].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).forEach(l => {
        const key = (l.name || "").toLowerCase().trim();
        if (key && !dedupForAI[key]) dedupForAI[key] = l;
      });
      const labSummary = Object.values(dedupForAI).slice(0, 60).map(l =>
        `${l.name}: ${l.value} ${l.unit}${l.refRange ? ` (ref ${l.refRange})` : ""}${l.flag ? " — OUT OF RANGE" : ""}${l.category ? ` [${l.category}]` : ""}${l.date ? ` on ${l.date}` : ""}${l.facility ? ` at ${l.facility}` : ""}`
      ).join("\n");

      const systemPrompt = `You are an intelligent health assistant analyzing lab results for ${patientName}. Cross-reference their profile when explaining findings. Never ask about conditions already listed — treat them as known facts.

PATIENT: ${patientName}

ACTIVE CONDITIONS:
${condStr}

SURGICAL HISTORY:
${surgStr}

ACTIVE MEDICATIONS:
${medsStr}

CARE TEAM:
${careStr}
Note: For liver/hepatic findings, reference ${liverDoc}.

RESPONSE FORMAT: No emojis. No pipe tables. Bold section headers on their own line. Use ----- as section dividers. Bullet points for lists.

CLARIFYING QUESTIONS: Only ask a clarifying question if the answer genuinely cannot be given without it. This should be rare. In almost all cases, provide the best analysis possible with the information already available.`;

      const res = await fetch(`${PROXY_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1800,
          system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
          messages: [{
            role: "user",
            content: `Analyze the following lab results in the context of ${patientName}'s profile. Cross-reference medications and surgical history with any abnormal findings. For each concern, name the specific doctor from the care team best suited to address it.

LAB RESULTS (most recent per test):
${labSummary || "No imported labs available yet."}

Format your response with:
1) Key Concerns (out-of-range values with clinical context)
2) Values to Watch (borderline or notable)
3) Questions for Care Team (directed to the right doctor by name)

Be direct and clinically specific.`,
          }],
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || `Server error ${res.status}`);
      }
      const data = await res.json();
      setAiAnalysis(data.content[0].text.trim());
    } catch (e) {
      const isNetworkErr = e.message?.includes("Failed to fetch") || e.message?.includes("503") || e.message?.includes("waking");
      setAiError(isNetworkErr
        ? "Server is waking up (Render free tier sleeps after 15 min inactivity). Wait ~30 seconds then click Full Analysis again."
        : e.message || "Analysis failed.");
    } finally {
      setAiAnalyzing(false);
    }
  };

  const askLabQuestion = async () => {
    const q = aiQuestion.trim();
    if (!q || aiQALoading) return;
    setAiQALoading(true);
    setAiQuestion("");
    setAiQA(prev => [...prev, { q, a: null }]);
    try {
      const safeRead = (key) => { try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; } };
      const conditions = safeRead("mi_conditions");
      const meds = safeRead("mi_meds_full");
      const qaPatientName = (() => { try { const p = JSON.parse(localStorage.getItem("mi_profile_personal") || "{}"); return p.name || "the patient"; } catch { return "the patient"; } })();
      const condStr = conditions.map(c => `- ${c.name}${c.status ? ` (${c.status})` : ""}`).join("\n") || "None recorded";
      const medsStr = meds.filter(m => m.status !== "inactive").map(m => `- ${m.name} ${m.dose || ""} ${m.frequency || ""}`.trim()).join("\n") || "None recorded";
      const byDate = {};
      importedLabs.forEach(l => { const d = l.date || "Unknown"; if (!byDate[d]) byDate[d] = []; byDate[d].push(l); });
      const sortedDates = Object.keys(byDate).sort((a, b) => new Date(b) - new Date(a));
      const labsStr = sortedDates.map(date =>
        `[${date}]\n` + byDate[date].map(l =>
          `- ${l.name}: ${l.value}${l.unit ? " " + l.unit : ""}${l.refRange ? ` (ref: ${l.refRange})` : ""}${l.flag ? " ⚠ FLAGGED" : ""}`
        ).join("\n")
      ).join("\n\n");
      const qaSystem = `You are a personal health assistant for ${qaPatientName}. Answer questions about their lab results using the data provided. Be concise and clinically specific. Never ask about conditions already listed. No emojis. Bold section headers on their own line. Use ----- as dividers. Bullet points for lists. Only ask a clarifying question if the answer genuinely cannot be given without it — this should be rare; provide the best answer possible with available information.

CONDITIONS:
${condStr}

MEDICATIONS:
${medsStr}

ALL LAB RESULTS:
${labsStr}`;

      const res = await fetch(`${PROXY_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          system: [{ type: "text", text: qaSystem, cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: q }],
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || `Server error ${res.status}`);
      }
      const data = await res.json();
      const answer = data.content[0].text.trim();
      setAiQA(prev => { const copy = [...prev]; copy[copy.length - 1] = { q, a: answer }; return copy; });
    } catch (e) {
      const isNetworkErr = e.message?.includes("Failed to fetch") || e.message?.includes("503") || e.message?.includes("waking");
      const errMsg = isNetworkErr
        ? "Server is waking up (Render free tier). Wait ~30 seconds and try again."
        : `Error: ${e.message}`;
      setAiQA(prev => { const copy = [...prev]; copy[copy.length - 1] = { q, a: errMsg }; return copy; });
    } finally {
      setAiQALoading(false);
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
          <div style={{ fontSize: 13, fontWeight: 600, color: "#c4d8ee" }}>
            {(() => { try { const p = JSON.parse(localStorage.getItem("mi_profile_personal") || "{}"); return p.name || ""; } catch { return ""; } })()}
          </div>
          {(() => { try { const c = JSON.parse(localStorage.getItem("mi_conditions") || "[]"); const a = c.filter(x => x.status === "active"); return a.length > 0 ? <div style={{ fontSize: 11, color: "#98afc4", marginTop: 2 }}>{a[0].name}</div> : null; } catch { return null; } })()}
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
            <button
              onClick={() => onNavChange("dashboard")}
              title="Back to Dashboard"
              style={{ display:"flex", alignItems:"center", gap:4, background:"none", border:"none", cursor:"pointer", color:"#4a5c6a", fontSize:11, fontFamily:"'DM Mono',monospace", padding:"4px 6px", borderRadius:6, marginRight:2 }}
              onMouseEnter={e => { e.currentTarget.style.color = "#7eb8d8"; e.currentTarget.style.background = "rgba(255,255,255,.04)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#4a5c6a"; e.currentTarget.style.background = "none"; }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              Dashboard
            </button>
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
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:4 }}>
              <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 22, color: "#dde8f5", fontWeight: 400, letterSpacing: "-0.4px" }}>Labs & Trends</h1>
              {dedupedLabs.length > 0 && (
                <button onClick={() => printLabReport(importedLabs, PRINT_LOGO)}
                  style={{ marginTop:4, padding:"4px 10px", background:"rgba(79,142,247,.08)", border:"1px solid rgba(79,142,247,.25)", borderRadius:6, color:"#7eb8d8", fontSize:10, fontFamily:"'DM Mono',monospace", cursor:"pointer", display:"flex", alignItems:"center", gap:5, flexShrink:0 }}>
                  ⎙ Print Report
                </button>
              )}
            </div>
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

            {/* Duplicate detection badge */}
            {duplicateGroups.length > 0 && (
              <button onClick={openDupModal} style={{ width:"100%", marginBottom:10, padding:"8px 12px", background:"rgba(245,158,11,.07)", border:"1px solid rgba(245,158,11,.3)", borderRadius:8, color:"#f59e0b", fontSize:11, fontFamily:"'Sora',sans-serif", cursor:"pointer", display:"flex", alignItems:"center", gap:7, fontWeight:600 }}>
                <span style={{ fontSize:13 }}>⚡</span>
                <span style={{ flex:1, textAlign:"left" }}>{duplicateGroups.length} duplicate group{duplicateGroups.length > 1 ? "s" : ""} detected</span>
                <span style={{ fontSize:10, opacity:0.65 }}>Review →</span>
              </button>
            )}

            {/* Add Lab button */}
            <button
              onClick={() => setShowAddLab(o => !o)}
              style={{ width:"100%", marginBottom:14, padding:"8px 12px", background: showAddLab ? "rgba(16,185,129,.12)" : "rgba(79,142,247,.08)", border:`1px solid ${showAddLab ? "rgba(16,185,129,.35)" : "rgba(79,142,247,.25)"}`, borderRadius:8, color: showAddLab ? "#10b981" : "#7eb8d8", fontSize:11, fontFamily:"'Sora',sans-serif", cursor:"pointer", display:"flex", alignItems:"center", gap:6, fontWeight:600 }}
            >
              <span style={{ fontSize:14 }}>{showAddLab ? "✕" : "+"}</span>
              {showAddLab ? "Cancel" : "Add Lab Result"}
            </button>

            {/* Inline Add Lab form */}
            {showAddLab && (
              <div style={{ background:"#0b1220", border:"1px solid #1a2f4a", borderRadius:10, padding:"14px", marginBottom:14, animation:"fadeUp .2s ease both" }}>
                <div style={{ fontSize:9, color:"#4f8ef7", fontFamily:"'DM Mono',monospace", letterSpacing:"1.5px", marginBottom:12 }}>NEW LAB RESULT</div>
                {[
                  { label:"Test Name *", key:"name", placeholder:"e.g. Creatinine", type:"text" },
                  { label:"Result Value *", key:"value", placeholder:"e.g. 1.2", type:"text" },
                  { label:"Unit", key:"unit", placeholder:"e.g. mg/dL", type:"text" },
                  { label:"Reference Range", key:"refRange", placeholder:"e.g. 0.74-1.35", type:"text" },
                  { label:"Date", key:"date", placeholder:"", type:"date" },
                ].map(f => (
                  <div key={f.key} style={{ marginBottom:9 }}>
                    <div style={{ fontSize:8.5, color:"#a0b4c8", fontFamily:"'DM Mono',monospace", letterSpacing:"1px", textTransform:"uppercase", marginBottom:4 }}>{f.label}</div>
                    <input
                      type={f.type}
                      placeholder={f.placeholder}
                      value={newLab[f.key]}
                      onChange={e => setNewLab(p => ({ ...p, [f.key]: e.target.value }))}
                      style={{ width:"100%", padding:"7px 10px", background:"#080c14", border:"1px solid #1a2f4a", borderRadius:6, color:"#c4d8ee", fontSize:11, fontFamily:"'DM Mono',monospace", outline:"none" }}
                    />
                  </div>
                ))}
                <div style={{ marginBottom:9 }}>
                  <div style={{ fontSize:8.5, color:"#a0b4c8", fontFamily:"'DM Mono',monospace", letterSpacing:"1px", textTransform:"uppercase", marginBottom:4 }}>Category</div>
                  <select
                    value={newLab.category}
                    onChange={e => setNewLab(p => ({ ...p, category: e.target.value }))}
                    style={{ width:"100%", padding:"7px 10px", background:"#080c14", border:"1px solid #1a2f4a", borderRadius:6, color:"#c4d8ee", fontSize:11, fontFamily:"'DM Mono',monospace", outline:"none" }}
                  >
                    {LAB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:8.5, color:"#a0b4c8", fontFamily:"'DM Mono',monospace", letterSpacing:"1px", textTransform:"uppercase", marginBottom:4 }}>Notes</div>
                  <input
                    type="text"
                    placeholder="Optional notes"
                    value={newLab.notes}
                    onChange={e => setNewLab(p => ({ ...p, notes: e.target.value }))}
                    style={{ width:"100%", padding:"7px 10px", background:"#080c14", border:"1px solid #1a2f4a", borderRadius:6, color:"#c4d8ee", fontSize:11, fontFamily:"'DM Mono',monospace", outline:"none" }}
                  />
                </div>
                <button
                  onClick={handleAddLab}
                  disabled={!newLab.name.trim() || !newLab.value.trim()}
                  style={{ width:"100%", padding:"8px", background: newLab.name.trim() && newLab.value.trim() ? "#10b981" : "#0f1e30", border:"none", borderRadius:7, color: newLab.name.trim() && newLab.value.trim() ? "#fff" : "#6a8090", fontSize:12, fontFamily:"'Sora',sans-serif", fontWeight:600, cursor: newLab.name.trim() && newLab.value.trim() ? "pointer" : "not-allowed" }}
                >
                  Save Lab Result
                </button>
              </div>
            )}

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
                  const rawCats = Array.from(new Set(dedupedLabs.map(l => l.category || "Other")));
                  const cats = ["All", ...labCatOrder.filter(c => rawCats.includes(c)), ...rawCats.filter(c => !labCatOrder.includes(c)).sort()];
                  const visible = dedupedLabs
                    .filter(l => importedCatFilter === "All" || (l.category || "Other") === importedCatFilter)
                    .filter(l => !showFlagged || l.flag);

                  // Build flat items list: section headers when "All", flat when filtered
                  const listItems = [];
                  if (importedCatFilter === "All") {
                    const grouped = {};
                    visible.forEach(lab => {
                      const cat = lab.category || "Other";
                      if (!grouped[cat]) grouped[cat] = [];
                      grouped[cat].push(lab);
                    });
                    Object.values(grouped).forEach(arr => arr.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
                    const orderedCats = [...labCatOrder, ...Object.keys(grouped).filter(c => !labCatOrder.includes(c))];
                    orderedCats.filter(c => grouped[c]?.length).forEach(cat => {
                      listItems.push({ type: "header", cat });
                      grouped[cat].forEach(lab => listItems.push({ type: "lab", lab }));
                    });
                  } else {
                    [...visible].sort((a, b) => (a.name || "").localeCompare(b.name || "")).forEach(lab => listItems.push({ type: "lab", lab }));
                  }

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
                      {listItems.map((item, i) => {
                        if (item.type === "header") {
                          return (
                            <div key={`hdr-${item.cat}`} style={{ fontSize: 9, fontWeight: 700, color: "#4f8ef7", fontFamily: "'DM Mono',monospace", letterSpacing: "1.5px", textTransform: "uppercase", marginTop: i === 0 ? 2 : 14, marginBottom: 6, paddingBottom: 4, borderBottom: "1px solid #0d1a28" }}>
                              {item.cat}
                            </div>
                          );
                        }
                        const { lab } = item;
                        const isSelected = selectedImportedLab && (selectedImportedLab.name || "").toLowerCase() === (lab.name || "").toLowerCase();
                        // Count how many readings exist for this test
                        const histCount = importedLabs.filter(l => (l.name || "").toLowerCase() === (lab.name || "").toLowerCase()).length;
                        return (
                          <div key={`${lab.name}-${i}`} className={`lab-row ${isSelected ? "sel" : ""}`}
                            onClick={() => selectImportedLab(lab)}
                            style={{ animationDelay: `${i * 18}ms`, flexDirection: "column", gap: 3, cursor: "pointer" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 6, height: 6, borderRadius: "50%", background: lab.flag ? "#f59e0b" : "#10b981", flexShrink: 0 }} />
                              <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: "#c4d8ee", textAlign: "left" }}>{lab.name}</div>
                                <div style={{ fontSize: 9, color: "#98afc4", fontFamily: "'DM Mono',monospace", textAlign: "left" }}>
                                  {lab.date || "—"}{histCount > 1 ? ` · ${histCount} readings` : ""}
                                </div>
                              </div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: lab.flag ? "#f59e0b" : "#10b981", flexShrink: 0, textAlign: "right" }}>
                                {lab.value} <span style={{ fontSize: 9, color: "#98afc4", fontWeight: 400 }}>{lab.unit}</span>
                              </div>
                            </div>
                            {lab.refRange && (
                              <div style={{ fontSize: 8, color: "#6a8090", fontFamily: "'DM Mono',monospace", paddingLeft: 14, textAlign: "left" }}>ref: {lab.refRange}</div>
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
              const labKey = (selectedImportedLab.name || "").toLowerCase().trim();
              const customRange = customRanges[labKey] || null;
              const customLow  = customRange?.low  ?? null;
              const customHigh = customRange?.high ?? null;
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
                        Lab range: {selectedImportedLab.refRange} {selectedImportedLab.unit}
                        {customRange && <span style={{ color: "#10b981", marginLeft: 12 }}>· Your range: {customRange.low}–{customRange.high}</span>}
                      </div>
                    )}
                    {low !== null && high !== null && !isNaN(val) && (
                      <RangeBar value={val} low={low} high={high} customLow={customLow} customHigh={customHigh} />
                    )}

                    {/* ── Custom Range Editor ── */}
                    <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid #111e30" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: customRange && editingCustomRange !== labKey ? 8 : 0 }}>
                        <span style={{ fontSize: 10, color: "#7eb8d8", fontFamily: "'DM Mono',monospace", fontWeight: 600, letterSpacing: "0.5px" }}>YOUR DOCTOR'S RANGE</span>
                        <div style={{ display: "flex", gap: 6 }}>
                          {customRange && editingCustomRange !== labKey && <>
                            <button onClick={() => { setCustomRangeForm({ low: String(customRange.low), high: String(customRange.high) }); setEditingCustomRange(labKey); }}
                              style={{ fontSize: 9, color: "#7eb8d8", background: "rgba(79,142,247,.08)", border: "1px solid rgba(79,142,247,.25)", borderRadius: 5, padding: "2px 9px", cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>✎ Edit</button>
                            <button onClick={() => removeCustomRange(selectedImportedLab.name)}
                              style={{ fontSize: 9, color: "#ef4444", background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 5, padding: "2px 9px", cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>✕ Remove</button>
                          </>}
                          {!customRange && editingCustomRange !== labKey && (
                            <button onClick={() => { setCustomRangeForm({ low: "", high: "" }); setEditingCustomRange(labKey); }}
                              style={{ fontSize: 9, color: "#10b981", background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.25)", borderRadius: 5, padding: "2px 9px", cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>+ Set Range</button>
                          )}
                        </div>
                      </div>
                      {/* Display current custom range */}
                      {customRange && editingCustomRange !== labKey && (
                        <div style={{ fontSize: 12, color: "#10b981", fontFamily: "'DM Mono',monospace" }}>
                          {customRange.low} – {customRange.high} {selectedImportedLab.unit}
                        </div>
                      )}
                      {/* Inline edit form */}
                      {editingCustomRange === labKey && (
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                          {[["LOW", "low"], ["HIGH", "high"]].map(([label, field]) => (
                            <div key={field}>
                              <label style={{ fontSize: 9, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", display: "block", marginBottom: 3 }}>{label}</label>
                              <input type="number" step="any" value={customRangeForm[field]}
                                onChange={e => setCustomRangeForm(p => ({ ...p, [field]: e.target.value }))}
                                style={{ width: 72, padding: "6px 8px", background: "#080c14", border: "1px solid #1a2f4a", borderRadius: 6, color: "#c4d8ee", fontSize: 12, fontFamily: "'DM Mono',monospace", outline: "none" }} />
                            </div>
                          ))}
                          <button onClick={() => saveCustomRange(selectedImportedLab.name, customRangeForm.low, customRangeForm.high)}
                            style={{ padding: "6px 14px", background: "#10b981", border: "none", borderRadius: 7, color: "#fff", fontSize: 11, fontFamily: "'DM Mono',monospace", cursor: "pointer", fontWeight: 600 }}>Save</button>
                          <button onClick={() => setEditingCustomRange(null)}
                            style={{ padding: "6px 10px", background: "transparent", border: "1px solid #1a2f4a", borderRadius: 7, color: "#7eb8d8", fontSize: 11, cursor: "pointer" }}>✕</button>
                        </div>
                      )}
                    </div>
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
              {/* Header row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, color: "#4f8ef7" }}>✦</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#7eb8d8", letterSpacing: "0.5px" }}>AI Lab Analysis</span>
                  {importedLabs.length > 0 && <span style={{ fontSize: 9, background: "rgba(16,185,129,.12)", color: "#10b981", border: "1px solid rgba(16,185,129,.25)", padding: "1px 6px", borderRadius: 8, fontFamily: "'DM Mono',monospace" }}>{importedLabs.length} imported</span>}
                </div>
                <button
                  onClick={analyzeAllLabs}
                  disabled={aiAnalyzing || aiQALoading}
                  style={{ padding: "7px 16px", background: aiAnalyzing ? "#0f1e30" : "rgba(79,142,247,.18)", border: "1px solid rgba(79,142,247,.4)", borderRadius: 8, color: "#7eb8d8", fontSize: 12, fontFamily: "'Sora',sans-serif", fontWeight: 600, cursor: aiAnalyzing ? "default" : "pointer", display: "flex", alignItems: "center", gap: 6 }}
                >
                  {aiAnalyzing ? <><span style={{ fontSize: 12 }}>⟳</span> Analyzing…</> : <><span style={{ fontSize: 12, color: "#4f8ef7" }}>✦</span> Full Analysis</>}
                </button>
              </div>

              {/* Question input */}
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <input
                  value={aiQuestion}
                  onChange={e => setAiQuestion(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && askLabQuestion()}
                  placeholder="Ask a question about your labs… (Enter to send)"
                  disabled={aiQALoading || aiAnalyzing}
                  style={{ flex: 1, background: "#0b1220", border: "1px solid #1a2f4a", color: "#c4d8ee", padding: "8px 12px", borderRadius: 8, fontFamily: "'Sora',sans-serif", fontSize: 12, outline: "none" }}
                />
                <button
                  onClick={askLabQuestion}
                  disabled={!aiQuestion.trim() || aiQALoading || aiAnalyzing}
                  style={{ padding: "8px 16px", background: "rgba(79,142,247,.18)", border: "1px solid rgba(79,142,247,.4)", borderRadius: 8, color: "#4f8ef7", fontSize: 12, fontFamily: "'Sora',sans-serif", cursor: "pointer", whiteSpace: "nowrap" }}
                >Ask ↑</button>
              </div>

              {aiError && <div style={{ fontSize: 11, color: "#ef4444", fontFamily: "'DM Mono',monospace", marginBottom: 10 }}>{aiError}</div>}

              {/* Q&A thread */}
              {aiQA.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: aiAnalysis ? 16 : 0 }}>
                  {aiQA.map((item, i) => (
                    <div key={i}>
                      {i > 0 && <hr style={{ border:"none", borderTop:"1px solid #1a2840", margin:"8px 0 14px" }} />}
                      <div style={{ fontSize: 12, color: "#7eb8d8", fontWeight: 600, marginBottom: 8 }}>Q: {item.q}</div>
                      <div style={{ fontSize: 12, color: "#a8c4dc", background: "#0b1220", borderRadius: 8, padding: "10px 14px", border: "1px solid #111e30" }}>
                        {item.a === null
                          ? <span style={{ color: "#6a8090", fontFamily: "'DM Mono',monospace" }}>⟳ Thinking…</span>
                          : <>
                              {renderMarkdown(item.a)}
                              <div style={{ display:"flex", justifyContent:"flex-end", marginTop:8, paddingTop:6, borderTop:"1px solid #111e30" }}>
                                <button onClick={() => printAIResponse(item.q, item.a, PRINT_LOGO)}
                                  style={{ background:"none", border:"none", color:"#4f8ef7", fontSize:11, cursor:"pointer", fontFamily:"'DM Mono',monospace", opacity:0.65, display:"flex", alignItems:"center", gap:5, padding:0 }}>
                                  ⎙ Print
                                </button>
                              </div>
                            </>
                        }
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Full analysis result */}
              {aiAnalysis && (
                <div style={{ fontSize: 12, color: "#a8c4dc", borderTop: aiQA.length > 0 ? "1px solid #111e30" : "none", paddingTop: aiQA.length > 0 ? 14 : 0 }}>
                  {renderMarkdown(aiAnalysis)}
                  <div style={{ display:"flex", justifyContent:"flex-end", marginTop:10, paddingTop:8, borderTop:"1px solid #111e30" }}>
                    <button onClick={() => printAIResponse("Full Lab Analysis", aiAnalysis, PRINT_LOGO)}
                      style={{ background:"none", border:"none", color:"#4f8ef7", fontSize:11, cursor:"pointer", fontFamily:"'DM Mono',monospace", opacity:0.65, display:"flex", alignItems:"center", gap:5, padding:0 }}>
                      ⎙ Print
                    </button>
                  </div>
                </div>
              )}
              {!aiAnalysis && !aiAnalyzing && aiQA.length === 0 && !aiError && (
                <div style={{ fontSize: 11, color: "#6a8090", fontFamily: "'DM Mono',monospace" }}>
                  {importedLabs.length > 0
                    ? "Ask a question above or click Full Analysis for a complete review."
                    : "Import lab results using the Import Records tab, then ask questions here."}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── Duplicate Lab Names Modal ── */}
      {showDupModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.78)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ background:"#080c14", border:"1px solid #1a2f4a", borderRadius:16, width:"100%", maxWidth:580, maxHeight:"82vh", display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:"0 24px 60px rgba(0,0,0,.7)" }}>

            {/* Modal header */}
            <div style={{ padding:"18px 22px 14px", borderBottom:"1px solid #0d1a28", display:"flex", alignItems:"flex-start", gap:12, flexShrink:0 }}>
              <span style={{ fontSize:18, color:"#f59e0b", marginTop:1 }}>⚡</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700, color:"#c4d8ee", marginBottom:3 }}>Duplicate Lab Names Detected</div>
                <div style={{ fontSize:10, color:"#a0b4c8", fontFamily:"'DM Mono',monospace", lineHeight:1.55 }}>
                  {dupGroups.length} group{dupGroups.length > 1 ? "s" : ""} of tests appear to be the same test under different names.<br />
                  Select which name to use as the canonical (official) name, then click Apply.
                </div>
              </div>
              <button onClick={() => setShowDupModal(false)} style={{ background:"none", border:"none", color:"#a0b4c8", fontSize:18, cursor:"pointer", padding:0, lineHeight:1, flexShrink:0, marginTop:1 }}>✕</button>
            </div>

            {/* Groups list */}
            <div style={{ overflowY:"auto", padding:"16px 22px", flex:1 }}>
              {dupGroups.map((g, gi) => {
                const dec = dupDecisions[g.norm] || { canonical: g.variants[0]?.name, skip: false };
                const totalEntries = g.variants.reduce((s, v) => s + v.count, 0);
                return (
                  <div key={g.norm} style={{ background:"#0b1220", border:"1px solid #111e30", borderRadius:10, padding:"14px 16px", marginBottom:12 }}>
                    {/* Group heading */}
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                      <span style={{ fontSize:9, fontFamily:"'DM Mono',monospace", background:"rgba(245,158,11,.12)", color:"#f59e0b", border:"1px solid rgba(245,158,11,.28)", padding:"1px 7px", borderRadius:4, letterSpacing:"0.5px" }}>
                        GROUP {gi + 1}
                      </span>
                      <span style={{ fontSize:10, color:"#6a8090", fontFamily:"'DM Mono',monospace" }}>
                        {g.names.length} variants · {totalEntries} total entries
                      </span>
                    </div>

                    {/* Variant rows — click to set canonical */}
                    {g.variants.map(v => {
                      const isSelected = dec.canonical === v.name && !dec.skip;
                      return (
                        <div key={v.name}
                          onClick={() => !dec.skip && setDupDecisions(d => ({ ...d, [g.norm]: { ...d[g.norm], canonical: v.name } }))}
                          style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 11px", marginBottom:6, borderRadius:8,
                            background: isSelected ? "rgba(79,142,247,.09)" : "rgba(255,255,255,.015)",
                            border:`1px solid ${isSelected ? "rgba(79,142,247,.4)" : "#1a2840"}`,
                            cursor: dec.skip ? "default" : "pointer",
                            opacity: dec.skip ? 0.4 : 1,
                            transition:"all .12s",
                          }}>
                          {/* Radio circle */}
                          <div style={{ width:15, height:15, borderRadius:"50%", border:`2px solid ${isSelected ? "#4f8ef7" : "#3a4a5a"}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                            {isSelected && <div style={{ width:7, height:7, borderRadius:"50%", background:"#4f8ef7" }} />}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:12, color:"#c4d8ee", fontWeight:600 }}>{v.name}</div>
                            <div style={{ fontSize:9, color:"#6a8090", fontFamily:"'DM Mono',monospace" }}>
                              {v.count} entr{v.count === 1 ? "y" : "ies"}{v.dateRange ? ` · ${v.dateRange}` : ""}
                            </div>
                          </div>
                          {isSelected && (
                            <span style={{ fontSize:8, background:"rgba(79,142,247,.15)", color:"#4f8ef7", border:"1px solid rgba(79,142,247,.3)", padding:"1px 7px", borderRadius:3, fontFamily:"'DM Mono',monospace", flexShrink:0 }}>
                              CANONICAL
                            </span>
                          )}
                          {gi === 0 && v === g.variants[0] && !isSelected && !dec.skip && (
                            <span style={{ fontSize:8, color:"#6a8090", fontFamily:"'DM Mono',monospace", flexShrink:0 }}>most common</span>
                          )}
                        </div>
                      );
                    })}

                    {/* Skip toggle */}
                    <button
                      onClick={() => setDupDecisions(d => ({ ...d, [g.norm]: { ...d[g.norm], skip: !dec.skip } }))}
                      style={{ marginTop:6, padding:"4px 11px", background: dec.skip ? "rgba(167,139,250,.12)" : "transparent", border:`1px solid ${dec.skip ? "rgba(167,139,250,.35)" : "#1a2840"}`, borderRadius:6, color: dec.skip ? "#a78bfa" : "#6a8090", fontSize:10, fontFamily:"'DM Mono',monospace", cursor:"pointer", transition:"all .12s" }}>
                      {dec.skip ? "✓ Keeping separate" : "Keep separate (skip)"}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Modal footer */}
            <div style={{ padding:"14px 22px", borderTop:"1px solid #0d1a28", display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
              <div style={{ flex:1, fontSize:10, color:"#6a8090", fontFamily:"'DM Mono',monospace" }}>
                {(() => {
                  const merging = dupGroups.filter(g => !dupDecisions[g.norm]?.skip).length;
                  return merging > 0
                    ? `${merging} group${merging !== 1 ? "s" : ""} will be merged`
                    : "No groups selected for merge";
                })()}
              </div>
              <button onClick={() => setShowDupModal(false)} style={{ padding:"8px 16px", background:"transparent", border:"1px solid #1a2840", borderRadius:8, color:"#a0b4c8", fontSize:12, fontFamily:"'Sora',sans-serif", cursor:"pointer" }}>
                Cancel
              </button>
              <button
                onClick={applyMerges}
                disabled={dupGroups.every(g => dupDecisions[g.norm]?.skip)}
                style={{ padding:"8px 20px", background: dupGroups.every(g => dupDecisions[g.norm]?.skip) ? "#0f1e30" : "rgba(16,185,129,.14)", border:`1px solid ${dupGroups.every(g => dupDecisions[g.norm]?.skip) ? "#1a2840" : "rgba(16,185,129,.4)"}`, borderRadius:8, color: dupGroups.every(g => dupDecisions[g.norm]?.skip) ? "#4a5c6a" : "#10b981", fontSize:12, fontFamily:"'Sora',sans-serif", fontWeight:600, cursor: dupGroups.every(g => dupDecisions[g.norm]?.skip) ? "not-allowed" : "pointer" }}>
                Apply Merges
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
