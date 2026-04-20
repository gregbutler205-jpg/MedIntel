// ─────────────────────────────────────────────────────────────────────────────
// Insina Health — Critical Lab Urgency Thresholds
// Used by Standard Mode AI to flag values that need immediate attention.
// All thresholds reflect post-transplant (LDLT) clinical context.
// ─────────────────────────────────────────────────────────────────────────────

export const CONSENT_VERSION = "1.0";

// Each entry: { name, low?, high?, unit, urgentLow?, urgentHigh?, note }
// low/high = outer normal bounds (flag as abnormal)
// urgentLow/urgentHigh = critical thresholds (flag as urgent / call team)
export const URGENCY_THRESHOLDS = [

  // ── Liver Panel ────────────────────────────────────────────────────────────
  {
    name: "ALT",
    high: 56,
    urgentHigh: 200,
    unit: "U/L",
    note: "Elevated ALT may indicate hepatocellular injury or rejection.",
  },
  {
    name: "AST",
    high: 40,
    urgentHigh: 200,
    unit: "U/L",
    note: "Elevated AST with elevated ALT raises concern for graft dysfunction.",
  },
  {
    name: "Alkaline Phosphatase",
    high: 120,
    urgentHigh: 400,
    unit: "U/L",
    note: "Elevated ALP may reflect biliary obstruction or bone disease (hip replacement history).",
  },
  {
    name: "Bilirubin",
    high: 1.2,
    urgentHigh: 3.0,
    unit: "mg/dL",
    note: "Rising bilirubin post-LDLT is a key rejection or obstruction signal.",
  },
  {
    name: "GGT",
    high: 60,
    urgentHigh: 300,
    unit: "U/L",
    note: "Elevated GGT may indicate biliary or hepatic stress.",
  },

  // ── Tacrolimus (Immunosuppression) ─────────────────────────────────────────
  {
    name: "Tacrolimus",
    low: 5,
    high: 8,
    urgentLow: 3,
    urgentHigh: 15,
    unit: "ng/mL",
    note: "Trough below 3 risks rejection; above 15 risks nephrotoxicity and neurotoxicity.",
  },

  // ── Kidney Function (secondary monitors — tacrolimus nephrotoxicity) ────────
  {
    name: "Creatinine",
    high: 1.3,
    urgentHigh: 2.5,
    unit: "mg/dL",
    note: "Rising creatinine in LDLT patient is likely tacrolimus nephrotoxicity — notify team.",
  },
  {
    name: "eGFR",
    low: 60,
    urgentLow: 30,
    unit: "mL/min/1.73m²",
    note: "Declining eGFR in post-transplant context warrants tacrolimus dose review.",
  },
  {
    name: "BUN",
    high: 20,
    urgentHigh: 50,
    unit: "mg/dL",
    note: "Elevated BUN with elevated creatinine suggests worsening renal function.",
  },

  // ── Complete Blood Count ────────────────────────────────────────────────────
  {
    name: "WBC",
    low: 4.0,
    high: 11.0,
    urgentLow: 2.0,
    urgentHigh: 20.0,
    unit: "K/uL",
    note: "Low WBC on immunosuppression increases infection risk; high WBC may signal infection.",
  },
  {
    name: "Hemoglobin",
    low: 12.0,
    urgentLow: 8.0,
    unit: "g/dL",
    note: "Anemia in post-transplant patients is multifactorial — notify if acutely dropping.",
  },
  {
    name: "Platelets",
    low: 150,
    urgentLow: 50,
    unit: "K/uL",
    note: "Thrombocytopenia may indicate portal hypertension or bone marrow suppression.",
  },

  // ── Electrolytes ────────────────────────────────────────────────────────────
  {
    name: "Potassium",
    low: 3.5,
    high: 5.0,
    urgentLow: 3.0,
    urgentHigh: 6.0,
    unit: "mEq/L",
    note: "Hyperkalemia risk is elevated on tacrolimus and furosemide combination.",
  },
  {
    name: "Sodium",
    low: 136,
    high: 145,
    urgentLow: 125,
    urgentHigh: 155,
    unit: "mEq/L",
    note: "Hyponatremia or hypernatremia both warrant immediate evaluation.",
  },
  {
    name: "Magnesium",
    low: 1.7,
    urgentLow: 1.2,
    unit: "mg/dL",
    note: "Tacrolimus causes magnesium wasting; hypomagnesemia is common post-transplant.",
  },
  {
    name: "Phosphorus",
    low: 2.5,
    urgentLow: 1.5,
    unit: "mg/dL",
    note: "Post-transplant hypophosphatemia is common early; supplementation may be needed.",
  },

  // ── Glucose & Metabolic ────────────────────────────────────────────────────
  {
    name: "Glucose",
    low: 70,
    high: 140,
    urgentLow: 50,
    urgentHigh: 300,
    unit: "mg/dL",
    note: "PTDM worsened by tacrolimus/prednisone — hyperglycemia is common and must be managed.",
  },
  {
    name: "HbA1c",
    high: 7.0,
    urgentHigh: 9.0,
    unit: "%",
    note: "Target HbA1c <7% for PTDM; >9% indicates poor glycemic control.",
  },

  // ── Lipids ──────────────────────────────────────────────────────────────────
  {
    name: "LDL",
    high: 100,
    urgentHigh: 190,
    unit: "mg/dL",
    note: "Target LDL <100 mg/dL post-transplant; statins limited by CNI interactions.",
  },
  {
    name: "Triglycerides",
    high: 150,
    urgentHigh: 500,
    unit: "mg/dL",
    note: "Hypertriglyceridemia is common on immunosuppression; >500 risks pancreatitis.",
  },

  // ── Infection Surveillance ─────────────────────────────────────────────────
  {
    name: "CMV PCR",
    high: 0,
    urgentHigh: 1000,
    unit: "IU/mL",
    note: "Any detectable CMV PCR in first year post-transplant should prompt team notification.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helper: given a lab name and numeric value, return urgency level
// Returns: "urgent" | "abnormal" | "normal" | null (if lab not in thresholds)
// ─────────────────────────────────────────────────────────────────────────────
export function getUrgencyLevel(labName, numericValue) {
  const threshold = URGENCY_THRESHOLDS.find(
    t => t.name.toLowerCase() === labName.toLowerCase()
  );
  if (!threshold || numericValue == null || isNaN(numericValue)) return null;

  const v = Number(numericValue);

  if (
    (threshold.urgentLow  != null && v < threshold.urgentLow) ||
    (threshold.urgentHigh != null && v > threshold.urgentHigh)
  ) return "urgent";

  if (
    (threshold.low  != null && v < threshold.low) ||
    (threshold.high != null && v > threshold.high)
  ) return "abnormal";

  return "normal";
}
