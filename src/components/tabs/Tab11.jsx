import { useState, useRef, useEffect, useCallback } from "react";
import AIModeOnboardingModal from "../AIModeOnboardingModal";
import { printConsent } from "../PrintableConsent";
import { CONSENT_VERSION } from "../../config/urgencyThresholds";

const INTELLITRAX_LOGO = import.meta.env.BASE_URL + "logo-white.png";
const PRINT_LOGO       = import.meta.env.BASE_URL + "logo.png";

const STORAGE_KEY    = "insina_ai_messages";
const AI_MODE_KEY    = "insina_ai_mode";
const AI_LOG_KEY     = "insina_ai_log";
const PROXY_URL      = import.meta.env.VITE_PROXY_URL || "http://localhost:3001";

// ─────────────────────────────────────────────────────────────────────────────
// Mode helpers
// ─────────────────────────────────────────────────────────────────────────────
function loadModeData() {
  try { return JSON.parse(localStorage.getItem(AI_MODE_KEY)); } catch { return null; }
}

function saveModeData(data) {
  try { localStorage.setItem(AI_MODE_KEY, JSON.stringify(data)); } catch {}
}

function appendAuditLog(entry) {
  try {
    const log = JSON.parse(localStorage.getItem(AI_LOG_KEY) || "[]");
    log.unshift({ ...entry, ts: new Date().toISOString() });
    // Keep last 200 entries
    localStorage.setItem(AI_LOG_KEY, JSON.stringify(log.slice(0, 200)));
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// System prompt builder
// ─────────────────────────────────────────────────────────────────────────────
function buildSystemPrompt(mode = "standard") {
  const safeRead = (key, fallback) => {
    try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; } catch { return fallback; }
  };

  // Anonymous User ID — generated once, persisted locally, never the patient's real name
  let userId = localStorage.getItem("mi_user_id");
  if (!userId) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars (0/O, 1/I)
    userId = "USR-" + Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    localStorage.setItem("mi_user_id", userId);
  }

  const conditions = safeRead("mi_conditions", []);
  const surgeries  = safeRead("mi_surgeries",  []);
  const careTeam   = safeRead("mi_care_team",  []);
  const meds       = safeRead("mi_meds_full",  []);
  const allergies  = safeRead("mi_allergies",  []);

  // ── Conditions ─────────────────────────────────────────────────────────────
  const condStr = conditions.length > 0
    ? conditions.map(c => `- ${c.name}${c.status ? ` (${c.status})` : ""}${c.severity ? ` — ${c.severity}` : ""}${c.notes ? `: ${c.notes}` : ""}`).join("\n")
    : `- Status post Living Donor Liver Transplant (LDLT), Oct 1, 2024 — primary ongoing diagnosis
- Hypertension — on Amlodipine + Metoprolol
- Diabetes Mellitus (Type 2 / PTDM — pre-existing, worsened by tacrolimus/prednisone)
- Hyperlipidemia — on Atorvastatin
- Immunosuppression-dependent state (lifelong, due to LDLT)
- CMV IgG positive; EBV IgG positive
- Tacrolimus-related nephrotoxicity risk — monitor creatinine/eGFR as secondary markers`;

  // ── Surgical history ────────────────────────────────────────────────────────
  const rawSurgStr = surgeries.length > 0
    ? surgeries.map(s => `- ${s.procedure}${s.date ? ` (${s.date})` : ""}${s.surgeon ? ` — ${s.surgeon}` : ""}${s.facility ? `, ${s.facility}` : ""}${s.notes ? `: ${s.notes}` : ""}`).join("\n")
    : `- Oct 1, 2024: Living Donor Liver Transplant (LDLT), UMC Transplant Center. Surgeon: Dr. Ari Cohen. Immediate graft function. Induction: Basiliximab + methylprednisolone.
- Oct 14, 2025: Protocol liver biopsy at 12-month mark — no acute rejection findings.
- Right hip replacement (on file in surgical history — relevant to bone-source ALP elevations)`;

  const surgStr = rawSurgStr
    .replace(/kidney\s+transplant/gi, "Liver Transplant (LDLT) ⚠corrected")
    .replace(/\bLDKT\b/g, "LDLT ⚠corrected")
    .replace(/renal\s+transplant/gi, "Liver Transplant (LDLT) ⚠corrected");

  // ── Medications ─────────────────────────────────────────────────────────────
  const medsStr = meds.filter(m => m.status !== "inactive").length > 0
    ? meds.filter(m => m.status !== "inactive").map(m =>
        `- ${m.name}${m.brand ? ` (${m.brand})` : ""} ${m.dose || ""} ${m.frequency || ""}${m.category ? ` [${m.category}]` : ""}`.trim()
      ).join("\n")
    : `Immunosuppression (must never be stopped without physician guidance):
- Tacrolimus (Prograf) 3mg BID — target trough 5–8 ng/mL; Apr 8 level: 5.1 ng/mL (low-therapeutic)
- Mycophenolate (CellCept) 500mg BID
- Prednisone 5mg QD

Cardiovascular / BP:
- Amlodipine 10mg QD
- Metoprolol 25mg BID
- Furosemide 40mg QD

Lipid / Metabolic:
- Atorvastatin 40mg QD

GI / Protective:
- Pantoprazole 40mg QD

Infection Prophylaxis:
- Trimethoprim-sulfamethoxazole (Bactrim) DS — 3x weekly
- Valganciclovir (Valcyte) 450mg QD

Supplements:
- Vitamin D3 2000 IU QD, Calcium Carbonate 500mg BID, Magnesium Oxide 400mg QD

Other:
- Aspirin 81mg QD`;

  // ── Care team ───────────────────────────────────────────────────────────────
  const hepato  = careTeam.find(d => /hepat/i.test(d.role || ""));
  const nephro  = careTeam.find(d => /nephr|transplant/i.test(d.role || ""));
  const pcp     = careTeam.find(d => /pcp|primary|family/i.test(d.role || ""));

  const careStr = careTeam.length > 0
    ? careTeam.map(d => `- ${d.name}${d.role ? `, ${d.role}` : ""}${d.specialty ? ` (${d.specialty})` : ""}${d.facility ? ` — ${d.facility}` : ""}${d.phone ? ` · ${d.phone}` : ""}`).join("\n")
    : `- Dr. Mariana Zapata — Hepatology Lead (liver, bile duct, hepatic function)
- Dr. Jonathan Hand, MD — PCP, Hand Family Medicine
- Dr. Ari Cohen, MD — Transplant Surgeon, UMC Transplant Center (historical)
- Quest Diagnostics — Lab draws`;

  const liverDoc = hepato?.name || nephro?.name || "Dr. Mariana Zapata";
  const pcpDoc   = pcp?.name    || "Dr. Jonathan Hand";

  // ── Labs ────────────────────────────────────────────────────────────────────
  const labs = safeRead("mi_labs", []);
  const customRanges = safeRead("mi_lab_custom_ranges", {});

  // Auto-detect which labs are condition-linked (for "ask your team" note)
  const CONDITION_LAB_MAP = [
    { condPat: /liver|hepat|cirr|fibrosis|psc|pbc|nash|transplant|biliary/i,
      labPat:  /alt|ast|alp|alk.*phos|bilirubin|ggt|albumin|inr|prothrombin|\bpt\b/i },
    { condPat: /transplant|immuno|rejection/i,
      labPat:  /tacrolimus|prograf|fk506|cyclosporin|creatinine|egfr|\bgfr\b|wbc|white.*blood/i },
    { condPat: /diabet|glucose|ptdm/i,
      labPat:  /glucose|hba1c|hemoglobin\s*a1c/i },
    { condPat: /kidney|renal|nephro/i,
      labPat:  /creatinine|egfr|bun|potassium|phosphorus/i },
    { condPat: /thyroid/i,
      labPat:  /tsh|t3\b|t4\b|thyroid/i },
  ];
  const conditionNames = conditions.map(c => c.name || "").join(" ");
  function isConditionLinked(labName) {
    return CONDITION_LAB_MAP.some(({ condPat, labPat }) =>
      condPat.test(conditionNames) && labPat.test(labName)
    );
  }

  let labStr;
  if (labs.length > 0) {
    const byDate = {};
    labs.forEach(l => {
      const d = l.date || "Unknown date";
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(l);
    });
    const sortedDates = Object.keys(byDate).sort((a, b) => {
      if (a === "Unknown date") return 1;
      if (b === "Unknown date") return -1;
      return new Date(b) - new Date(a);
    });
    labStr = sortedDates.map(date => {
      const items = byDate[date];
      return `[${date}]\n` + items.map(l => {
        const key = (l.name || "").toLowerCase().trim();
        const cr  = customRanges[key];
        let line  = `- ${l.name}: ${l.value}${l.unit ? " " + l.unit : ""}`;
        if (cr)        line += ` (lab ref: ${l.refRange || "n/a"} | patient's doctor range: ${cr.low}–${cr.high})`;
        else if (l.refRange) line += ` (ref: ${l.refRange})`;
        if (l.flag)    line += " ⚠ FLAGGED";
        if (l.notes)   line += ` — ${l.notes}`;
        // Add condition-link note for flagged labs without a custom range set
        if (l.flag && !cr && isConditionLinked(l.name)) {
          line += " [condition-linked: patient may have an individual target range — include a note to confirm their personal range with their care team]";
        }
        return line;
      }).join("\n");
    }).join("\n\n");
  } else {
    labStr = "No lab results loaded yet.";
  }

  // ── Vitals ─────────────────────────────────────────────────────────────────
  const readings = safeRead("mi_readings", []);
  let vitalsStr;
  if (readings.length > 0) {
    const sorted = [...readings].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    vitalsStr = sorted.slice(0, 30).map(r => {
      const parts = [];
      if (r.systolic && r.diastolic) parts.push(`BP ${r.systolic}/${r.diastolic}`);
      if (r.pulse)   parts.push(`HR ${r.pulse}`);
      if (r.spo2)    parts.push(`O2 ${r.spo2}%`);
      if (r.weight)  parts.push(`Weight ${r.weight} lbs`);
      if (r.glucose) parts.push(`Glucose ${r.glucose} mg/dL`);
      if (r.temp)    parts.push(`Temp ${r.temp}°F`);
      const line = parts.join(", ");
      return line ? `- ${r.date || "Unknown"}: ${line}${r.flag ? " ⚠ FLAGGED" : ""}` : null;
    }).filter(Boolean).join("\n") || "No vital readings recorded.";
  } else {
    vitalsStr = "No vital readings recorded.";
  }

  // ── Reference docs ──────────────────────────────────────────────────────────
  const refDocs = safeRead("mi_ref_docs", []);
  let refDocsSection = "";
  if (refDocs.length > 0) {
    // Group by docType (fall back to "Other" for legacy docs without the field)
    const groups = {};
    for (const d of refDocs) {
      const key = (d.docType || "Other").trim();
      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
    }
    // Sort each group by studyDate ascending (oldest first → newest last, mirrors how comparison reports read)
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => {
        const da = a.studyDate ? new Date(a.studyDate) : new Date(a.addedDate || 0);
        const db = b.studyDate ? new Date(b.studyDate) : new Date(b.addedDate || 0);
        return da - db;
      });
    }
    // Total budget across ALL reference docs so a large document library can't
    // push the request past the proxy body limit / model context window.
    let refBudget = 120000; // chars
    const docText = Object.entries(groups).map(([type, docs]) => {
      const isSequential = docs.length > 1;
      const groupHeader = isSequential
        ? `SEQUENTIAL STUDIES — ${type} (${docs.length} reports, oldest → newest — analyze for interval changes between studies)`
        : type !== "Other" ? `${type}` : null;
      const docEntries = docs.map(d => {
        const dateLine = d.studyDate ? ` | Study date: ${d.studyDate}` : "";
        const facilityLine = d.facility ? ` | Facility: ${d.facility}` : "";
        const full = d.text || "";
        if (refBudget <= 0) return `[Document: "${d.name}"${dateLine}${facilityLine}]\n…(omitted — reference-document context limit reached)`;
        const body = full.slice(0, Math.min(8000, refBudget));
        refBudget -= body.length;
        return `[Document: "${d.name}"${dateLine}${facilityLine}]\n${body}${full.length > body.length ? "\n…(truncated)" : ""}`;
      }).join("\n\n---\n\n");
      return groupHeader ? `${groupHeader}\n\n${docEntries}` : docEntries;
    }).join("\n\n═══════════════════════════\n\n");
    refDocsSection = `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━\nREFERENCE DOCUMENTS (uploaded by patient)\n━━━━━━━━━━━━━━━━━━━━━━━━━\nCite document names when referencing them. For sequential studies of the same type, identify and summarize interval changes between the earliest and most recent report.\n\n${docText}`;
  }

  // ── Clinical findings (auto-extracted from uploaded documents) ──────────────
  const clinicalFindings = safeRead("mi_clinical_findings", []);
  const findingsSection = clinicalFindings.length > 0
    ? `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━\nCLINICAL FINDINGS (extracted from patient documents)\n━━━━━━━━━━━━━━━━━━━━━━━━━\nThese findings were automatically extracted from the patient's uploaded medical documents. Treat them as confirmed clinical data points — cross-reference with labs, vitals, and medications as appropriate.\n\n` +
      clinicalFindings.map(f =>
        `- [${(f.category || "other").toUpperCase()}] ${f.finding}${f.permanent ? " (permanent)" : ""}${f.docName ? ` — source: ${f.docName}` : ""}`
      ).join("\n")
    : "";

  // ── Mode-specific additions ─────────────────────────────────────────────────
  const modeInstructions = mode === "advanced"
    ? `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━\nADVANCED MODE INSTRUCTIONS\n━━━━━━━━━━━━━━━━━━━━━━━━━\n- Provide deeper analysis with thorough cross-referencing across all data categories\n- Identify subtle patterns and trends not immediately obvious from individual values\n- Include differential considerations and nuanced clinical context where appropriate\n- Flag any value that approaches critical thresholds, even if technically within range\n- For each concern surfaced, identify which specialist is best suited to address it and frame it as a topic for the patient to raise with that doctor — never as a clinical recommendation from you`
    : `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━\nSTANDARD MODE INSTRUCTIONS\n━━━━━━━━━━━━━━━━━━━━━━━━━\n- Provide clear, well-organized responses focused on the most important insights\n- Flag any lab values or findings that are critically abnormal and warrant prompt attention\n- Keep responses focused and easy to understand — prioritize what matters most\n- For each concern, name the right doctor and frame it as a topic for the patient to raise, not a recommendation from you`;

  return `You are an intelligent personal health assistant for patient ${userId}. You have comprehensive knowledge of their entire medical history. Your job is to help this patient understand their health holistically — cross-referencing all of their data to surface insights, flag concerns, and prepare them for medical conversations. You are an informational tool only. You do not diagnose, you do not recommend tests or treatments, you do not add or change medications, and nothing you say should be construed as clinical advice. Your role is to explain, analyze, and help the patient have more informed conversations with their doctors.

▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
PATIENT IDENTITY
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
- Patient ID: ${userId}
- Primary follow-up physician: ${liverDoc}

CRITICAL RULES:
- NEVER ask about or suggest screening for a condition already listed in the diagnoses — treat all listed conditions as confirmed, existing diagnoses.
- ALWAYS cross-reference medications and surgical history when explaining any abnormal lab value.
- For anything related to transplant graft health, immunosuppression management, organ function, or rejection risk: direct the patient to ${liverDoc}.
- For general health, glucose management, blood pressure, lipids: reference ${pcpDoc}.
- ALL lab results and vitals listed below come directly from this patient's records loaded into this app. You HAVE full access to ALL of them. Never claim you cannot see data that appears in the sections below.
- CLARIFYING QUESTIONS: Only ask clarifying questions when the answer genuinely cannot be given without them — this should be rare. When you do ask, include them inline as part of your response (never as a standalone reply with no analysis), number them, and ask at most 3 at a time.
- CUSTOM LAB RANGES: Where a lab shows "patient's doctor range: X–Y", treat that as the primary reference range for this patient. Always mention both the standard lab range and the doctor's range when discussing that result.
- CONDITION-LINKED FLAGS: Where a lab is annotated "[condition-linked: patient may have an individual target range]", include an action item in your analysis reminding the patient to confirm their personal target range with their care team — phrase it as something to bring up at their next visit, not a clinical concern.

━━━━━━━━━━━━━━━━━━━━━━━━━
RESPONSE FORMATTING RULES (follow exactly — these control on-screen rendering)
━━━━━━━━━━━━━━━━━━━━━━━━━
- NO emojis of any kind anywhere in your response
- NO markdown table pipes (|) — instead use bolded label lines: **Label:** value
- NO ✦ symbol in response text
- Use **bold text** for ALL section headers — each header on its own line
- Use ----- (five dashes) on its own line as a divider between major sections
- Use bullet points starting with "- " for unordered lists
- Use numbered lists (1. 2. 3.) for questions to ask, steps, or ranked items
- Bold key values inline: e.g. "Your **Tacrolimus** is **3.2 ng/mL**"
- End most responses with a **Bottom Line** section summarizing key actions

━━━━━━━━━━━━━━━━━━━━━━━━━
DIAGNOSES & ACTIVE CONDITIONS
━━━━━━━━━━━━━━━━━━━━━━━━━
${condStr}

━━━━━━━━━━━━━━━━━━━━━━━━━
SURGICAL & PROCEDURE HISTORY
━━━━━━━━━━━━━━━━━━━━━━━━━
${surgStr}

━━━━━━━━━━━━━━━━━━━━━━━━━
CURRENT MEDICATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━
${medsStr}

━━━━━━━━━━━━━━━━━━━━━━━━━
ALLERGIES
━━━━━━━━━━━━━━━━━━━━━━━━━
${allergies.length > 0
  ? allergies.map(a => `- ${a.name}${a.reaction ? ` — Reaction: ${a.reaction}` : ""}${a.severity ? ` (${a.severity})` : ""}`).join("\n")
  : "- No known allergies on file"}
CRITICAL: Always cross-check any medication suggestion, new prescription, or antibiotic recommendation against this allergy list before including it in a response.

━━━━━━━━━━━━━━━━━━━━━━━━━
CARE TEAM
━━━━━━━━━━━━━━━━━━━━━━━━━
${careStr}

━━━━━━━━━━━━━━━━━━━━━━━━━
ALL LAB RESULTS (complete history from patient records)
━━━━━━━━━━━━━━━━━━━━━━━━━
${labStr}

━━━━━━━━━━━━━━━━━━━━━━━━━
VITALS HISTORY
━━━━━━━━━━━━━━━━━━━━━━━━━
${vitalsStr}

━━━━━━━━━━━━━━━━━━━━━━━━━
MEDICATIONS TO AVOID — CRITICAL LIST
━━━━━━━━━━━━━━━━━━━━━━━━━
NSAIDs (ABSOLUTELY AVOID):
- Ibuprofen, Naproxen, Ketorolac, Indomethacin, Celecoxib, Aspirin >81mg
- Reason: nephrotoxic in transplant patients — risk of acute kidney injury; also increases hepatotoxicity risk when combined with immunosuppressants
- Safe pain alternative: Acetaminophen (Tylenol) ≤2g/day

Antibiotics / antifungals that interact with Tacrolimus (CYP3A4/P-gp):
- Clarithromycin, Erythromycin — STRONG inhibitors, spike Tacrolimus dangerously
- Fluconazole, Voriconazole, Itraconazole — major CYP3A4 inhibitors
- Rifampin — strong inducer, drops Tacrolimus; rejection risk
- Always alert prescribers he is on Tacrolimus before any new antibiotic

Statins contraindicated with Tacrolimus:
- Simvastatin, Lovastatin — avoid; myopathy/rhabdomyolysis risk with CNIs
- Atorvastatin ≤40mg acceptable; pravastatin also safe

Herbal supplements (AVOID):
- St. John's Wort — drops Tacrolimus 50%+; acute rejection risk
- Echinacea, Cat's Claw, Astragalus — immune stimulants, counteract immunosuppression
- Licorice root — raises BP, interacts with prednisone

OTC cautions:
- Potassium supplements or salt substitutes — hyperkalemia risk (Lisinopril + CKD)
- Pseudoephedrine / decongestants — raises BP
- Antacids (Mg/Al) — separate from Tacrolimus by ≥2 hours

━━━━━━━━━━━━━━━━━━━━━━━━━
FOODS & DIETARY RESTRICTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━
AVOID completely:
- Grapefruit, pomelo, Seville oranges — CYP3A4 inhibitor; unpredictably raises Tacrolimus
- Raw/undercooked meat, fish, shellfish, eggs — infection risk
- Unpasteurized dairy, soft cheeses — Listeria risk
- Raw sprouts, deli meats (unless steaming hot), unpasteurized juices

Limit / monitor:
- High-potassium foods (bananas, avocado, spinach, potatoes) — hyperkalemia risk
- High-phosphorus foods (dairy, nuts, cola) — CKD management
- Sodium — target <2g/day for hypertension
- High-sugar foods — Diabetes Mellitus management; tacrolimus and prednisone worsen glucose control
- Alcohol — hepatotoxic, interacts with immunosuppressants

━━━━━━━━━━━━━━━━━━━━━━━━━
INFECTION & IMMUNOSUPPRESSION RISKS
━━━━━━━━━━━━━━━━━━━━━━━━━
- Avoid live vaccines (MMR, varicella, live flu, yellow fever)
- Safe: inactivated flu, COVID, pneumococcal, Tdap, Shingrix (recombinant)
- CMV: D-/R+ profile — monitor CMV PCR; Valganciclovir prophylaxis ongoing
- BK virus: monitor if creatinine rises unexpectedly
- Fever >38°C (100.4°F): same-day contact with transplant team
- Annual dermatology screening — elevated skin cancer risk on long-term immunosuppression

━━━━━━━━━━━━━━━━━━━━━━━━━
ASSISTANT GUIDELINES
━━━━━━━━━━━━━━━━━━━━━━━━━
- Be clear, direct, medically accurate, and use plain language
- Flag anything urgent prominently
- Always name the specific doctor best suited to address each concern
- NEVER diagnose, recommend tests or treatments, suggest medication changes, or give clinical advice of any kind. You inform and analyze — all clinical decisions belong to the patient's doctors.
- Frame any mention of tests, treatments, or next steps as: "Your doctor may consider..." or "Things to discuss with your doctor include..." or "Questions worth raising with [doctor name]:" — never as a direct recommendation from you.
- Cross-check any medication question against both the current med list AND the avoid list
- APPOINTMENT PREP: When preparing the patient for any upcoming medical appointment, always include as a final question to ask the doctor: "What reference materials, handbooks, or patient guides do you recommend for managing my condition long-term?"
- Treat this as a comprehensive clinical intelligence tool, not a general chatbot

━━━━━━━━━━━━━━━━━━━━━━━━━
CLINICAL REASONING PROTOCOL — apply this to every question
━━━━━━━━━━━━━━━━━━━━━━━━━
This is not a data lookup tool. Every response — whether the question is about a lab value, a symptom, a medication, a pattern in vitals, appointment preparation, or a general health concern — requires active clinical reasoning that connects the patient's data across all categories. Follow this sequence:

STEP 1 — ANCHOR THE FINDING
Identify exactly what is being analyzed: the specific lab value, symptom, vital sign, or concern. Note any trend (rising, falling, fluctuating) and cite the relevant dates and values from the patient's record.

STEP 2 — SCAN ALL PATIENT DATA FOR CONNECTIONS (do this before drawing on general knowledge)
Proactively search every data category below for anything that could causally or temporally explain the anchor finding. Do not wait for the patient to make these connections — surfacing them unprompted is the primary purpose of this tool.
- SURGICAL & PROCEDURE HISTORY: Was any procedure performed in the preceding 12 months? Calculate the elapsed time between the procedure date and the lab/symptom date. Any procedure — orthopedic, abdominal, dermatologic, cardiac, or other — can have downstream lab and physiological effects. Cite by name, date, and weeks elapsed.
- MEDICATIONS: Are any current medications known to cause or contribute to this finding? Were any medications added, changed, or stopped around the relevant timeframe? Check both the active medication list and the avoid/interaction list.
- ACTIVE CONDITIONS: Which diagnosed conditions are known causes or contributors to this finding? Cross-reference even conditions that seem unrelated at first glance.
- OTHER LABS & VITALS: Are there correlated changes in other lab values or vital signs around the same dates that support a specific explanation or narrow the differential?
- CLINICAL FINDINGS & UPLOADED DOCUMENTS: Do any extracted findings or uploaded records contain relevant context?

STEP 3 — EXPLAIN THE MECHANISM
For every connection identified in Step 2, briefly explain WHY it produces the finding. State the biological mechanism in plain language (e.g., "bone-building cells release ALP during healing after joint replacement"). A response that names a connection without explaining the mechanism is incomplete.

STEP 4 — APPLY GENERAL MEDICAL KNOWLEDGE
After exhausting patient-specific connections, draw on general medical knowledge to identify any remaining recognized causes not already addressed by the patient's data. Flag which general causes are made unlikely by the patient's specific data and which remain possible.

STEP 5 — QUESTIONS AND TOPICS FOR THE DOCTOR
Do not recommend tests, treatments, or clinical actions. Instead, identify what a doctor might consider given this picture and frame it as topics for the patient to raise. Use language such as:
- "Your doctor may want to look at..."
- "Things worth discussing with [doctor name] include..."
- "Questions to bring to your next appointment:"
If the situation appears urgent, say clearly: "This is worth contacting [doctor name] about promptly" — but do not instruct the patient to take any specific clinical action yourself.

STEP 6 — BOTTOM LINE
End with a concise plain-language summary of the most likely explanation and which doctor is best suited to address it. Close with a statement such as: "As always, bring these findings to your doctor before drawing any conclusions or making any changes" — or a natural equivalent. This closing reminder is not optional.${modeInstructions}${refDocsSection}${findingsSection}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF text extraction
// ─────────────────────────────────────────────────────────────────────────────
async function extractTextFromPdf(file) {
  const pdfjsLib = await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.mjs");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.mjs";
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(" ") + "\n";
  }
  return text.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Quick prompts
// ─────────────────────────────────────────────────────────────────────────────
const PRESETS = [
  { label: "Full health summary",      prompt: "Give me a comprehensive cross-referenced summary of my current health status — covering my diagnoses, recent labs, vitals, medications, and upcoming care." },
  { label: "Medication safety check",  prompt: "Review my full medication list for interactions, anything I should avoid (including OTCs and supplements), and flag any concerns to raise with my care team." },
  { label: "Prep for Hepatology appt", prompt: "Help me prepare for my upcoming hepatology appointment. Cross-reference my recent liver panel labs (Bilirubin, ALT, AST, Alk Phos), current medications including tacrolimus and mycophenolate, and any relevant clinical findings or trends. Include a prioritized list of questions to bring, and end with this question to ask the doctor: What reference materials, handbooks, or patient guides do you recommend for managing my condition long-term?" },
  { label: "Rejection risk check",     prompt: "Based on my current liver enzymes (ALT, AST, Alk Phos, Bilirubin), Tacrolimus level, and any biopsy findings, what are my current signs or risk factors for liver graft rejection or decline?" },
  { label: "Foods & things to avoid",  prompt: "Give me a complete rundown of foods, drinks, OTC medications, supplements, and activities I need to avoid or be cautious about given my transplant and current medications." },
  { label: "Infection risk review",    prompt: "What are my current infection risks given my immunosuppression level, CMV status, and recent labs? What symptoms should prompt me to call the transplant team immediately?" },
  { label: "BP pattern analysis",      prompt: "Analyze my blood pressure readings and cross-reference with my medication changes, kidney function, and lab trends. Are there concerning patterns?" },
  { label: "Lab trend deep dive",      prompt: "Walk me through all of my key lab trends — liver panel (ALT, AST, Alk Phos, Bilirubin), Tacrolimus level, CBC (including platelets), electrolytes, and creatinine/eGFR as secondary monitors — and flag anything moving in the wrong direction." },
];

function getContextCounts() {
  const sr = (k) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : []; } catch { return []; } };
  return [
    { label: `${sr("mi_labs").length} lab entries`,      color: "#10b981" },
    { label: `${sr("mi_meds_full").filter(m => m.status !== "inactive").length} medications`, color: "#f59e0b" },
    { label: `${sr("mi_readings").length} vital readings`, color: "#a78bfa" },
    { label: `${sr("mi_ref_docs").length} ref docs`,      color: "#4f8ef7" },
  ];
}

const CONTEXT_TAGS = [
  { label: "Labs",        color: "#10b981" },
  { label: "Vitals",      color: "#a78bfa" },
  { label: "Medications", color: "#f59e0b" },
  { label: "Records",     color: "#4f8ef7" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Print helpers
// ─────────────────────────────────────────────────────────────────────────────
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
    if (/^-{3,}$/.test(t))
      return `<hr style="border:none;border-top:1px solid #ddd;margin:14px 0">`;
    if (t.includes("|")) {
      if (/^\|?[\s\-|]+\|?$/.test(t)) return "";
      const cells = t.split("|").map(c => c.trim()).filter(Boolean);
      if (cells.length >= 2)
        return `<div style="display:flex;gap:16px;margin-bottom:6px;padding-left:8px">
          <span style="font-weight:700;min-width:160px;flex-shrink:0">${bold(cells[0])}</span>
          <span>${bold(cells.slice(1).join(" — "))}</span></div>`;
    }
    const hm = t.match(/^\*\*([^*]+?)\*\*:?\s*$/);
    if (hm)
      return `<div style="font-weight:700;font-size:15px;margin-top:16px;margin-bottom:6px">${hm[1].replace(/:$/, "")}</div>`;
    if (t.startsWith("- ") || t.startsWith("• ")) {
      const c = t.replace(/^[-•]\s+/, "");
      return `<div style="display:flex;gap:8px;margin-bottom:5px;padding-left:8px">
        <span style="color:#2563eb;flex-shrink:0;font-weight:700">&#9658;</span>
        <span>${bold(c)}</span></div>`;
    }
    const nm = t.match(/^(\d+)\.\s+(.+)/);
    if (nm)
      return `<div style="display:flex;gap:8px;margin-bottom:6px;padding-left:8px">
        <span style="font-weight:700;flex-shrink:0;min-width:22px;color:#2563eb">${nm[1]}.</span>
        <span>${bold(nm[2])}</span></div>`;
    if (t === "") return `<div style="height:8px"></div>`;
    return `<div style="margin-bottom:4px;line-height:1.75">${bold(line)}</div>`;
  }).join("");
}

const PRINT_STYLE = `
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:Georgia,serif; max-width:760px; margin:48px auto; color:#1a1a1a; font-size:14px; line-height:1.65; padding:0 24px; }
  .logo { height:52px; margin-bottom:18px; }
  h1 { text-align:center; font-size:28px; font-weight:700; letter-spacing:-.5px; margin-bottom:8px; }
  .subtitle { text-align:center; font-size:12px; color:#555; margin-bottom:22px; }
  .rule { border:none; border-top:2px solid #2563eb; margin-bottom:24px; }
  .mode-badge { display:inline-block; background:#f0f6ff; border:1px solid #2563eb; border-radius:4px; padding:2px 8px; font-size:9px; font-family:monospace; color:#2563eb; margin-bottom:18px; }
  .q-label { font-weight:700; font-size:13px; margin:18px 0 5px; color:#2563eb; }
  .q-text { margin-bottom:6px; font-size:14px; }
  .a-block { margin-bottom:8px; padding-bottom:14px; border-bottom:1px solid #eee; }
  .footer { margin-top:48px; border-top:1px solid #ddd; padding-top:12px; font-size:10px; color:#777; display:flex; justify-content:space-between; }
  @media print { body { margin:28px; } }
`;

// Open the printable HTML in a new window and trigger print. If the pop-up is
// blocked, download the HTML so it is never silently lost.
// Returns "printed", "downloaded", or "failed".
function openPrintable(html, filenameBase) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (win) {
    win.document.write(html);
    win.document.close();
    return "printed";
  }
  try {
    const blob = new Blob([html], { type: "text/html" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `${filenameBase}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return "downloaded";
  } catch {
    return "failed";
  }
}

const esc = s => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// AI-written summary of one conversation.
function buildSummaryHtml(summaryText, logoUrl, mode) {
  const date = new Date().toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" });
  const modeLabel = mode === "advanced" ? "Advanced Mode — Claude Opus" : "Standard Mode — Claude Sonnet";
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>AI Analysis Summary — Insina Health</title><style>${PRINT_STYLE}</style>
  </head><body>
    <img src="${logoUrl}" class="logo" alt="Insina Health" />
    <h1>AI Analysis Summary</h1>
    <div class="subtitle">Insina Health &mdash; Personal Health Intelligence</div>
    <hr class="rule" />
    <div class="mode-badge">${modeLabel}</div>
    ${summaryText ? answerToHTML(summaryText) : "<p style='color:#777;font-style:italic'>Summary could not be generated.</p>"}
    <div class="footer">
      <span>Insina Health &mdash; Informational only. This is not medical advice. Always consult your physician.</span>
      <span>Generated ${date}</span>
    </div>
    <script>window.onload = function(){ window.print(); }<\/script>
  </body></html>`;
}

// Verbatim transcript of one conversation (your questions + full AI replies).
function buildTranscriptHtml(convMessages, logoUrl, mode) {
  const date = new Date().toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" });
  const modeLabel = mode === "advanced" ? "Advanced Mode — Claude Opus" : "Standard Mode — Claude Sonnet";
  const bodyHtml = convMessages.map(m => m.role === "user"
    ? `<div class="q-label">You asked:</div><div class="q-text">${esc(m.text)}</div>`
    : `<div class="a-block">${answerToHTML(m.text)}</div>`
  ).join("");
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>AI Analysis Transcript — Insina Health</title><style>${PRINT_STYLE}</style>
  </head><body>
    <img src="${logoUrl}" class="logo" alt="Insina Health" />
    <h1>AI Analysis Transcript</h1>
    <div class="subtitle">Insina Health &mdash; Personal Health Intelligence</div>
    <hr class="rule" />
    <div class="mode-badge">${modeLabel}</div>
    ${bodyHtml}
    <div class="footer">
      <span>Insina Health &mdash; Informational only. This is not medical advice. Always consult your physician.</span>
      <span>Generated ${date}</span>
    </div>
    <script>window.onload = function(){ window.print(); }<\/script>
  </body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Markdown renderer
// ─────────────────────────────────────────────────────────────────────────────
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

  const lines = text.split("\n");
  return lines.map((line, i) => {
    const trimmed = line.trim();

    if (/^-{3,}$/.test(trimmed)) {
      return <hr key={i} style={{ border: "none", borderTop: "1px solid #1a2840", margin: "12px 0" }} />;
    }

    if (trimmed.includes("|")) {
      if (/^\|?[\s\-|]+\|?$/.test(trimmed)) return <div key={i} style={{ height: 2 }} />;
      const cells = trimmed.split("|").map(c => c.trim()).filter(Boolean);
      if (cells.length >= 2) {
        return (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 5, paddingLeft: 4 }}>
            <span dangerouslySetInnerHTML={{ __html: applyBold(cells[0]) }}
              style={{ fontWeight: 700, color: "#c4d8ee", minWidth: 140, flexShrink: 0 }} />
            <span dangerouslySetInnerHTML={{ __html: applyBold(cells.slice(1).join(" — ")) }}
              style={{ color: "#a8c4dc" }} />
          </div>
        );
      }
    }

    const headerMatch = trimmed.match(/^\*\*([^*]+?)\*\*:?\s*$/);
    if (headerMatch) {
      return (
        <div key={i} style={{ fontWeight: 700, color: "#c4d8ee", fontSize: 13, marginTop: 14, marginBottom: 4 }}>
          {headerMatch[1].replace(/:$/, "")}
        </div>
      );
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      const content = trimmed.replace(/^[-•]\s+/, "");
      return (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4, paddingLeft: 4 }}>
          <span style={{ color: "#4f8ef7", flexShrink: 0, marginTop: 4, fontSize: 9 }}>▸</span>
          <span dangerouslySetInnerHTML={{ __html: applyBold(content) }} style={{ lineHeight: 1.7 }} />
        </div>
      );
    }

    const numMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
    if (numMatch) {
      return (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 5, paddingLeft: 4 }}>
          <span style={{ color: "#4f8ef7", fontWeight: 700, flexShrink: 0, minWidth: 22,
            fontFamily: "'DM Mono',monospace", fontSize: 11 }}>{numMatch[1]}.</span>
          <span dangerouslySetInnerHTML={{ __html: applyBold(numMatch[2]) }} style={{ lineHeight: 1.7 }} />
        </div>
      );
    }

    if (trimmed === "") return <div key={i} style={{ height: 6 }} />;

    return (
      <div key={i} dangerouslySetInnerHTML={{ __html: applyBold(line) }}
        style={{ marginBottom: 3, lineHeight: 1.75 }} />
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Message component
// ─────────────────────────────────────────────────────────────────────────────
function Message({ role, text, streaming, mode }) {
  const isUser = role === "user";
  const isAdvanced = mode === "advanced";
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 20, flexDirection: isUser ? "row-reverse" : "row", alignItems: "flex-start" }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
        background: isUser ? "linear-gradient(135deg,#4f8ef7,#a78bfa)" : "rgba(79,142,247,.12)",
        border: isUser ? "none" : "1px solid rgba(79,142,247,.25)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: isUser ? 11 : 14, fontWeight: 700,
        color: isUser ? "#fff" : "#4f8ef7",
      }}>
        {isUser ? ((() => { try { const p = JSON.parse(localStorage.getItem("mi_profile_personal") || "{}"); return (p.name || "?")[0].toUpperCase(); } catch { return "?"; } })()) : "✦"}
      </div>
      <div style={{
        maxWidth: "74%",
        background: isUser ? "rgba(79,142,247,.09)" : "#0b1220",
        border: `1px solid ${isUser ? "rgba(79,142,247,.18)" : "#111e30"}`,
        borderRadius: isUser ? "12px 4px 12px 12px" : "4px 12px 12px 12px",
        padding: "12px 15px",
        fontSize: 12.5, color: "#a8c4dc", lineHeight: 1.75,
        fontFamily: "'Sora',sans-serif",
      }}>
        {isUser
          ? <span style={{ color: "#7eb8d8" }}>{text}</span>
          : <div>
              {/* Mode badge per response */}
              {!streaming && text && (
                <div style={{ marginBottom: 8 }}>
                  <span style={{
                    fontSize: 9, fontFamily: "'DM Mono',monospace",
                    background: isAdvanced ? "rgba(79,142,247,.12)" : "rgba(16,185,129,.10)",
                    color: isAdvanced ? "#4f8ef7" : "#10b981",
                    border: `1px solid ${isAdvanced ? "rgba(79,142,247,.25)" : "rgba(16,185,129,.25)"}`,
                    padding: "1px 7px", borderRadius: 3, letterSpacing: "0.4px",
                  }}>
                    {isAdvanced ? "Advanced · Opus" : "Standard · Sonnet"}
                  </span>
                </div>
              )}
              {renderMarkdown(text)}
              {streaming && <span style={{ display: "inline-block", width: 8, height: 14, background: "#4f8ef7", marginLeft: 2, animation: "cursorBlink 1s step-end infinite", verticalAlign: "text-bottom" }} />}
              {/* Footer disclaimer — all responses */}
              {!streaming && text && (
                <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid #111e30", fontSize: 10, color: "#4a5c6a", fontFamily: "'DM Mono',monospace", lineHeight: 1.5 }}>
                  {isAdvanced ? "Advanced · Opus" : "Standard · Sonnet"} — Informational only. This is not medical advice. Always consult your physician before making any health decisions.
                </div>
              )}
            </div>
        }
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 20 }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(79,142,247,.12)", border: "1px solid rgba(79,142,247,.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#4f8ef7", flexShrink: 0 }}>✦</div>
      <div style={{ background: "#0b1220", border: "1px solid #111e30", borderRadius: "4px 12px 12px 12px", padding: "14px 18px", display: "flex", gap: 5, alignItems: "center" }}>
        {[0, 150, 300].map(d => (
          <span key={d} style={{ width: 5, height: 5, borderRadius: "50%", background: "#b0c4d8", display: "inline-block", animation: `dotBlink 1.2s ease ${d}ms infinite` }} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function AIAnalysis({ onNavChange }) {
  const [messages, setMessages]       = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      // Migrate pre-v1.8 messages (no conversation id) into conversation 0.
      return raw.map(m => ({ ...m, conv: m.conv ?? 0 }));
    } catch { return []; }
  });
  // Which conversation new messages are added to. Starts at the last one loaded.
  const [currentConv, setCurrentConv] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      return raw.reduce((mx, m) => Math.max(mx, m.conv ?? 0), 0);
    } catch { return 0; }
  });
  const [summaryBusyConv, setSummaryBusyConv] = useState(null); // conv id being summarized
  const [input, setInput]             = useState("");
  const [streaming, setStreaming]     = useState(false);
  const [error, setError]             = useState("");
  const [refDocs, setRefDocs]         = useState(() => {
    try { return JSON.parse(localStorage.getItem("mi_ref_docs") || "[]"); } catch { return []; }
  });
  const [refUploading, setRefUploading] = useState(false);
  const [refError, setRefError]         = useState("");
  const refFileRef                    = useRef(null);
  const bottomRef                     = useRef(null);
  const abortRef                      = useRef(null);
  const textareaRef                   = useRef(null);
  const contextCounts                 = getContextCounts();
  const [summaryNote, setSummaryNote] = useState("");
  const [newConvConfirm, setNewConvConfirm]   = useState(false);

  // ── Mode state ─────────────────────────────────────────────────────────────
  const [modeData, setModeDataState]  = useState(() => loadModeData());
  const [showOnboarding, setShowOnboarding] = useState(() => !loadModeData());
  // Stale consent banner: advanced mode but consent version mismatch
  const [staleConsent, setStaleConsent] = useState(false);
  // Cold-start retry state (Render free tier sleeps after 15 min)
  const [coldStartRetry, setColdStartRetry] = useState(null); // text to retry

  const currentMode = modeData?.mode || "standard";

  // ── Consent version check on mount ────────────────────────────────────────
  useEffect(() => {
    const stored = loadModeData();
    if (stored?.mode === "advanced" && stored?.consentVersion !== CONSENT_VERSION) {
      // Stale consent: switch to standard, show banner
      const updated = { ...stored, mode: "standard", staleConsentDetected: true, staleSwitchDate: new Date().toISOString() };
      saveModeData(updated);
      setModeDataState(updated);
      setStaleConsent(true);
      appendAuditLog({ event: "stale_consent_auto_switch", from: "advanced", to: "standard", oldVersion: stored.consentVersion, newRequired: CONSENT_VERSION });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleModeConfirm = (data) => {
    saveModeData(data);
    setModeDataState(data);
    setShowOnboarding(false);
    appendAuditLog({ event: "mode_selected", mode: data.mode, consentVersion: data.consentVersion || null });
  };

  // Expose mode setter for Tab13 (dispatches custom event)
  useEffect(() => {
    const handler = (e) => {
      const { mode, consentDate, consentVersion } = e.detail || {};
      if (!mode) return;
      const now = new Date().toISOString();
      let updated;
      if (mode === "standard") {
        updated = { ...modeData, mode: "standard", switchedToStandardDate: now };
      } else if (mode === "advanced") {
        updated = { ...modeData, mode: "advanced", consentVersion, consentDate, activatedDate: now };
      }
      if (updated) {
        saveModeData(updated);
        setModeDataState(updated);
        appendAuditLog({ event: "mode_changed", mode, consentVersion: consentVersion || null });
      }
    };
    window.addEventListener("insina_mode_change", handler);
    return () => window.removeEventListener("insina_mode_change", handler);
  }, [modeData]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch {}
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  // Auto-send pending prompt from Dashboard AI buttons
  const pendingSentRef = useRef(false);
  useEffect(() => {
    if (pendingSentRef.current) return;
    const pending = localStorage.getItem("mi_ai_pending");
    if (pending) {
      localStorage.removeItem("mi_ai_pending");
      pendingSentRef.current = true;
      setTimeout(() => sendMessage(pending), 300);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessage = useCallback(async (text, messagesOverride = null) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    // Block if stale consent is active
    if (staleConsent) return;

    setColdStartRetry(null);
    setError("");
    const mode = loadModeData()?.mode || "standard";
    const model = mode === "advanced" ? "claude-opus-4-6" : "claude-sonnet-4-6";

    const conv = currentConv;
    const userMsg  = { role: "user", text: trimmed, conv };
    const baseMessages = messagesOverride !== null ? messagesOverride : messages;
    const newMsgs  = [...baseMessages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setStreaming(true);

    // Only send THIS conversation's history to the AI — each conversation has
    // its own independent context.
    const apiMessages = newMsgs
      .filter(m => (m.conv ?? 0) === conv)
      .map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.text }));

    let accum = "";
    const assistantIdx = newMsgs.length;

    setMessages(prev => [...prev, { role: "assistant", text: "", streaming: true, mode, conv }]);

    // Build system prompt with prompt caching blocks
    const systemPromptText = buildSystemPrompt(mode);
    const systemBlocks = [
      {
        type: "text",
        text: systemPromptText,
        cache_control: { type: "ephemeral" },
      },
    ];

    try {
      const controller = new AbortController();
      abortRef.current = controller;

      const res = await fetch(`${PROXY_URL}/api/chat`, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          max_tokens: mode === "advanced" ? 2048 : 1024,
          stream: true,
          system: systemBlocks,
          messages: apiMessages,
        }),
      });

      if (!res.ok) {
        if (res.status === 413) throw new Error("Your record context is too large to send in one request — this usually means several large uploaded reference documents. Remove some from AI context (Reference Docs panel) and try again.");
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Server error ${res.status}`);
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
              accum += parsed.delta.text;
              setMessages(prev => {
                const copy = [...prev];
                copy[assistantIdx] = { role: "assistant", text: accum, streaming: true, mode, conv };
                return copy;
              });
            }
          } catch {}
        }
      }

      setMessages(prev => {
        const copy = [...prev];
        copy[assistantIdx] = { role: "assistant", text: accum, mode, conv };
        return copy;
      });

      appendAuditLog({ event: "message_sent", mode, model, tokens: accum.length });

    } catch (e) {
      if (e.name === "AbortError") {
        setMessages(prev => {
          const copy = [...prev];
          copy[assistantIdx] = { role: "assistant", text: accum || "_(stopped)_", mode, conv };
          return copy;
        });
      } else {
        const isColdStart = e.name === "TypeError" || e.message?.includes("Failed to fetch") || e.message?.includes("503") || e.message?.includes("NetworkError");
        if (isColdStart) {
          setColdStartRetry(trimmed);
          setMessages(prev => {
            const copy = [...prev];
            copy[assistantIdx] = { role: "assistant", text: "**Server is waking up** (Render free tier sleeps after 15 minutes of inactivity).\n\nThis takes about 30–60 seconds. Click **Retry** when ready.", mode, conv };
            return copy;
          });
        } else {
          setMessages(prev => {
            const copy = [...prev];
            copy[assistantIdx] = { role: "assistant", text: `Error: ${e.message}`, mode, conv };
            return copy;
          });
          setError(e.message);
        }
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [messages, streaming, staleConsent, currentConv]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const saveConversationToNotes = (msgs) => {
    if (!msgs || msgs.length === 0) return;
    try {
      const notes = JSON.parse(localStorage.getItem("mi_notes") || "[]");
      const ts = new Date().toISOString();
      const title = `AI Analysis — ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
      const preview = msgs.find(m => m.role === "user")?.text?.slice(0, 120) || "AI conversation";
      const content = msgs.map(m => `${m.role === "user" ? "You" : "AI"}: ${m.text}`).join("\n\n---\n\n");
      const note = { id: Date.now().toString(), title, pinned: false, tag: "General", date: ts, preview, linked: [], sections: [{ heading: "", body: content }] };
      notes.unshift(note);
      localStorage.setItem("mi_notes", JSON.stringify(notes));
    } catch {}
  };

  // Start a new conversation segment without clearing the screen. Earlier
  // conversations stay visible above, each independently printable.
  const startNewConversation = () => {
    if (streaming) return;
    const currentHasMessages = messages.some(m => (m.conv ?? 0) === currentConv);
    if (!currentHasMessages) return; // nothing to close off yet
    const nextId = messages.reduce((mx, m) => Math.max(mx, m.conv ?? 0), 0) + 1;
    setCurrentConv(nextId);
    setError("");
  };

  // Wipe every conversation from the screen (saved to Notes first).
  const clearAll = () => {
    if (!newConvConfirm) { setNewConvConfirm(true); return; }
    if (streaming) abortRef.current?.abort();
    saveConversationToNotes(messages);
    setMessages([]);
    setCurrentConv(0);
    setError("");
    setStreaming(false);
    setNewConvConfirm(false);
  };

  // Reset textarea height after send
  useEffect(() => {
    if (!input && textareaRef.current) textareaRef.current.style.height = "auto";
  }, [input]);

  // Print one conversation verbatim — instant, no AI call.
  const printConversationTranscript = (convMessages) => {
    setSummaryNote("");
    const mode = convMessages.find(m => m.mode)?.mode || currentMode;
    const how = openPrintable(buildTranscriptHtml(convMessages, PRINT_LOGO, mode), "Insina Health — AI Analysis Transcript");
    if (how === "downloaded") {
      setSummaryNote("Your browser blocked the print pop-up, so the transcript was saved to your Downloads folder instead. Open it there to print — or allow pop-ups for this site.");
    } else if (how === "failed") {
      setSummaryNote("Couldn't open or save the transcript. Check that pop-ups and downloads are allowed for this site, then try again.");
    }
  };

  // Print an AI-written summary of one conversation — makes one AI call.
  const printConversationSummary = async (convId, convMessages) => {
    if (!convMessages.length || summaryBusyConv !== null || streaming) return;
    setSummaryBusyConv(convId);
    setSummaryNote("");
    const mode = loadModeData()?.mode || "standard";
    const model = mode === "advanced" ? "claude-opus-4-6" : "claude-sonnet-4-6";
    const summaryPrompt = `Based on the conversation above, write a structured summary the patient can bring to their next medical appointment. Use this exact format:

**Conversation Summary**
A brief paragraph (3–5 sentences) describing the overall topics and themes we discussed.

-----

**Your Questions**
List every question the patient asked in this conversation, verbatim, numbered.

-----

**Key Findings & Insights**
Bullet-point list of the most important health information, patterns, or concerns surfaced during this conversation.

-----

**Topics to Raise with Your Doctor**
Numbered list of specific talking points for the patient's next appointment, framed as patient-initiated conversation starters — not clinical recommendations.

-----

**Bottom Line**
One paragraph: what matters most from this conversation and which doctor to contact.

Keep the summary concise — it should fit on one to two printed pages.`;
    const apiMessages = [
      ...convMessages.map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.text })),
      { role: "user", content: summaryPrompt },
    ];
    try {
      const res = await fetch(`${PROXY_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          max_tokens: 1400,
          stream: false,
          system: [{ type: "text", text: buildSystemPrompt(mode), cache_control: { type: "ephemeral" } }],
          messages: apiMessages,
        }),
      });
      if (!res.ok) throw new Error("server");
      const data = await res.json();
      const text = data.content?.[0]?.text || "";
      if (!text) throw new Error("empty");
      const how = openPrintable(buildSummaryHtml(text, PRINT_LOGO, mode), "Insina Health — AI Analysis Summary");
      if (how === "downloaded") {
        setSummaryNote("Your browser blocked the print pop-up, so the summary was saved to your Downloads folder instead. Open it there to print — or allow pop-ups for this site and click Summary again.");
      } else if (how === "failed") {
        setSummaryNote("Couldn't open or save the summary. Check that pop-ups and downloads are allowed for this site, then try again.");
      }
    } catch {
      setSummaryNote("Couldn't generate the summary — the AI server may be waking up (about 30 seconds on the free tier). Wait a moment, then click Summary again.");
    } finally {
      setSummaryBusyConv(null);
    }
  };

  const handleRefDocUpload = async (e) => {
    const file = e.target.files?.[0];
    if (refFileRef.current) refFileRef.current.value = "";
    if (!file) return;
    setRefUploading(true);
    setRefError("");
    try {
      const text = await extractTextFromPdf(file);
      const doc = { id: Date.now().toString(), name: file.name.replace(/\.pdf$/i, ""), text, addedDate: new Date().toLocaleDateString() };
      const updated = [...refDocs, doc];
      setRefDocs(updated);
      localStorage.setItem("mi_ref_docs", JSON.stringify(updated));
    } catch (err) {
      setRefError("Failed to read PDF: " + (err.message || "Unknown error"));
    } finally {
      setRefUploading(false);
    }
  };

  const removeRefDoc = (id) => {
    const updated = refDocs.filter(d => d.id !== id);
    setRefDocs(updated);
    localStorage.setItem("mi_ref_docs", JSON.stringify(updated));
  };

  const analyzeDoc = (doc) => {
    const prompt =
`I have just uploaded a medical report titled "${doc.name}". Please analyze it and provide:

**Plain English Explanation** — Explain what this report is saying in clear, simple language a non-medical person can understand. When medical terms are necessary, explain what they mean.

**Key Findings** — Identify and explain the most important findings, both normal and abnormal. Cross-reference with my existing medical history, conditions, and medications where relevant.

**Questions to Ask My Doctor** — Provide 6-8 specific questions I should ask my doctor when they contact me about this report, based on the specific findings in this document.

Important: Do NOT make any diagnosis. Your role is to help me understand what this report says and prepare me for a productive conversation with my physician.`;
    sendMessage(prompt);
  };

  // ── Auto-analyze: fired when user arrives from Import Records ────────────────
  const autoAnalyzeRef = useRef(false);
  useEffect(() => {
    if (autoAnalyzeRef.current || streaming || showOnboarding) return;
    const pendingDocId = localStorage.getItem("mi_auto_analyze_doc");
    if (!pendingDocId) return;
    localStorage.removeItem("mi_auto_analyze_doc");
    autoAnalyzeRef.current = true;
    try {
      const docs = JSON.parse(localStorage.getItem("mi_ref_docs") || "[]");
      const doc = docs.find(d => d.id === pendingDocId);
      if (doc) {
        // Re-read refDocs state so the sidebar shows the new doc
        setRefDocs(docs);
        setTimeout(() => analyzeDoc(doc), 400);
      }
    } catch {}
  }, [streaming, showOnboarding]); // re-check once streaming/onboarding state settles

  const isAdvanced = currentMode === "advanced";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#07090f", fontFamily: "'Sora',sans-serif", color: "#d4e2f0", overflow: "hidden", position: "relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #1a2840; border-radius: 4px; }
        @keyframes fadeUp   { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        @keyframes dotBlink { 0%,100%{opacity:.3} 50%{opacity:1} }
        @keyframes cursorBlink { 0%,100%{opacity:1} 50%{opacity:0} }
        .preset-btn { width:100%; text-align:left; padding:9px 11px; background:#0b1220; border:1px solid #111e30; border-radius:8px; color:#b0c4d8; font-size:11.5px; font-family:'Sora',sans-serif; cursor:pointer; transition:all .15s; display:flex; align-items:center; gap:8px; }
        .preset-btn:hover { border-color:#1a2f4a; color:#7eb8d8; background:#0d1828; }
        .send-btn { padding:0 18px; height:40px; background:rgba(79,142,247,.12); border:1px solid rgba(79,142,247,.3); border-radius:8px; color:#4f8ef7; font-family:'Sora',sans-serif; font-size:12px; cursor:pointer; transition:all .15s; white-space:nowrap; flex-shrink:0; }
        .send-btn:hover { background:rgba(79,142,247,.2); border-color:rgba(79,142,247,.5); }
        .send-btn:disabled { opacity:.4; cursor:not-allowed; }
        .stop-btn { padding:0 18px; height:40px; background:rgba(239,68,68,.08); border:1px solid rgba(239,68,68,.25); border-radius:8px; color:#ef4444; font-family:'Sora',sans-serif; font-size:12px; cursor:pointer; transition:all .15s; flex-shrink:0; }
        .stop-btn:hover { background:rgba(239,68,68,.15); }
        .chat-input { flex:1; background:#0b1220; border:1px solid #111e30; color:#c4d8ee; padding:10px 14px; border-radius:8px; font-family:'Sora',sans-serif; font-size:12px; outline:none; resize:none; transition:border-color .15s; line-height:1.5; min-height:42px; max-height:180px; overflow-y:auto; }
        .chat-input::placeholder { color:#98afc4; }
        .chat-input:focus { border-color:#1a2f4a; }
        .icon-btn { background:transparent; border:1px solid #111e30; border-radius:8px; color:#b0c4d8; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all .15s; font-size:13px; flex-shrink:0; }
        .icon-btn:hover { border-color:#1a2f4a; color:#7eb8d8; }
        .new-conv-btn { display:inline-flex; align-items:center; gap:5px; padding:4px 11px; background:transparent; border:1px solid #111e30; border-radius:12px; color:#98afc4; font-size:11px; font-family:'DM Mono',monospace; cursor:pointer; transition:all .15s; }
        .new-conv-btn:hover { border-color:#1a2f4a; color:#b0c4d8; }
        .conv-head { display:flex; align-items:center; gap:10px; margin:0 0 14px; }
        .conv-head .line { flex:1; height:1px; background:#1a2840; }
        .conv-label { font-size:10px; color:#6a8090; font-family:'DM Mono',monospace; letterSpacing:.5px; max-width:280px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .conv-print-btn { display:inline-flex; align-items:center; gap:4px; padding:3px 9px; background:rgba(79,142,247,.08); border:1px solid rgba(79,142,247,.25); border-radius:6px; color:#7eb8d8; font-size:10px; font-family:'DM Mono',monospace; cursor:pointer; transition:all .15s; white-space:nowrap; }
        .conv-print-btn:hover { background:rgba(79,142,247,.16); border-color:rgba(79,142,247,.45); }
        .conv-print-btn:disabled { opacity:.5; cursor:default; }
        @media print { .no-print { display:none !important; } aside { display:none !important; } body { background:white !important; } }
      `}</style>

      {/* First-run onboarding modal */}
      {showOnboarding && <AIModeOnboardingModal onConfirm={handleModeConfirm} />}

      {/* Topbar */}
      <div style={{ height: 54, background: "#080c14", borderBottom: "1px solid #0d1a28", display: "flex", alignItems: "center", padding: "0 24px", gap: 12, flexShrink: 0 }}>
        {onNavChange && (
          <button
            onClick={() => onNavChange("dashboard")}
            title="Back to Dashboard"
            style={{ display:"flex", alignItems:"center", gap:4, background:"none", border:"none", cursor:"pointer", color:"#4a5c6a", fontSize:11, fontFamily:"'DM Mono',monospace", padding:"4px 6px", borderRadius:6, marginRight:4 }}
            onMouseEnter={e => { e.currentTarget.style.color = "#7eb8d8"; e.currentTarget.style.background = "rgba(255,255,255,.04)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#4a5c6a"; e.currentTarget.style.background = "none"; }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Dashboard
          </button>
        )}
        <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, color: "#dde8f5", fontWeight: 400, letterSpacing: "-0.3px" }}>AI Analysis</div>
        <span style={{ fontSize: 8, background: "#4f8ef7", color: "#fff", padding: "2px 6px", borderRadius: 8, fontFamily: "'DM Mono',monospace", letterSpacing: "0.5px" }}>AI</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {CONTEXT_TAGS.map(t => (
            <span key={t.label} style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", background: `${t.color}15`, color: t.color, border: `1px solid ${t.color}28`, padding: "2px 8px", borderRadius: 4, letterSpacing: "0.5px", textTransform: "uppercase" }}>{t.label}</span>
          ))}
        </div>
        <span style={{ fontSize: 10, color: "#4a5c6a", fontFamily: "'DM Mono',monospace" }}>
          Print buttons are on each conversation ↓
        </span>
      </div>

      {/* Mode indicator bar */}
      <div style={{
        height: 36, background: isAdvanced ? "rgba(79,142,247,.06)" : "rgba(16,185,129,.05)",
        borderBottom: `1px solid ${isAdvanced ? "rgba(79,142,247,.15)" : "rgba(16,185,129,.12)"}`,
        display: "flex", alignItems: "center", padding: "0 24px", gap: 12, flexShrink: 0,
      }}>
        <span style={{
          fontSize: 9, fontFamily: "'DM Mono',monospace",
          background: isAdvanced ? "rgba(79,142,247,.15)" : "rgba(16,185,129,.12)",
          color: isAdvanced ? "#4f8ef7" : "#10b981",
          border: `1px solid ${isAdvanced ? "rgba(79,142,247,.3)" : "rgba(16,185,129,.3)"}`,
          padding: "2px 9px", borderRadius: 4, letterSpacing: "0.5px", textTransform: "uppercase",
        }}>
          {isAdvanced ? "Advanced Mode" : "Standard Mode"}
        </span>
        <span style={{ fontSize: 10, color: "#4a5c6a", fontFamily: "'DM Mono',monospace" }}>
          {isAdvanced ? "Claude Opus · deeper analysis · consent given" : "Claude Sonnet · recommended for daily use"}
        </span>
        <div style={{ flex: 1 }} />
        <span style={{
          fontSize: 9, color: "#4a5c6a", fontFamily: "'DM Mono',monospace",
          background: "#07090f", border: "1px solid #111e30",
          padding: "2px 10px", borderRadius: 4,
        }}>
          {isAdvanced ? "claude-opus-4-6" : "claude-sonnet-4-6"}
        </span>
      </div>

      {/* Stale consent banner */}
      {staleConsent && (
        <div style={{
          background: "rgba(245,158,11,.08)", borderBottom: "1px solid rgba(245,158,11,.25)",
          padding: "10px 24px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
        }}>
          <span style={{ fontSize: 12, color: "#f59e0b" }}>⚠</span>
          <span style={{ fontSize: 11, color: "#c4a060", fontFamily: "'DM Mono',monospace", flex: 1 }}>
            Advanced Mode consent has been updated. You have been switched to Standard Mode.
            To re-enable Advanced Mode, go to <strong>Settings &amp; Backup → AI Analysis Mode</strong> and re-consent.
          </span>
          <button
            onClick={() => setStaleConsent(false)}
            style={{ background: "none", border: "none", color: "#c4a060", cursor: "pointer", fontSize: 14, padding: 0 }}
          >✕</button>
        </div>
      )}

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Sidebar */}
        <div style={{ width: 236, minWidth: 236, borderRight: "1px solid #0d1a28", display: "flex", flexDirection: "column", padding: "16px 12px", overflowY: "auto" }}>
          <div style={{ fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase", color: "#a0b4c8", fontFamily: "'DM Mono',monospace", marginBottom: 8 }}>Quick Prompts</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
            {PRESETS.map((p, i) => (
              <button key={i} className="preset-btn" onClick={() => setInput(p.prompt)} disabled={streaming}>
                <span style={{ color: "#4f8ef7", fontSize: 12, flexShrink: 0 }}>✦</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>

          <div style={{ borderTop: "1px solid #0d1a28", paddingTop: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase", color: "#a0b4c8", fontFamily: "'DM Mono',monospace", marginBottom: 10 }}>Context Loaded</div>
            {contextCounts.map(({ label, color }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: "#b0c4d8", fontFamily: "'DM Mono',monospace", marginBottom: 7 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, flexShrink: 0 }} />
                {label}
              </div>
            ))}
          </div>

          {/* Reference Documents */}
          <div style={{ borderTop: "1px solid #0d1a28", paddingTop: 14, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase", color: "#a0b4c8", fontFamily: "'DM Mono',monospace" }}>Reference Docs</div>
              <button
                onClick={() => refFileRef.current?.click()}
                disabled={refUploading}
                style={{ fontSize: 9, padding: "2px 8px", background: "rgba(167,139,250,.1)", border: "1px solid rgba(167,139,250,.3)", borderRadius: 6, color: "#a78bfa", fontFamily: "'DM Mono',monospace", cursor: "pointer" }}
              >{refUploading ? "…" : "+ PDF"}</button>
              <input ref={refFileRef} type="file" accept="application/pdf" onChange={handleRefDocUpload} style={{ display: "none" }} />
            </div>
            {refError && <div style={{ fontSize: 9, color: "#ef4444", fontFamily: "'DM Mono',monospace", marginBottom: 6 }}>{refError}</div>}
            {refDocs.length === 0
              ? <div style={{ fontSize: 10, color: "#6a8090", fontFamily: "'DM Mono',monospace", lineHeight: 1.5 }}>No reference docs.<br />Upload a PDF to include it in AI context.</div>
              : refDocs.map(d => (
                <div key={d.id} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 6, background: "#0b1220", border: "1px solid rgba(167,139,250,.15)", borderRadius: 7, padding: "6px 8px" }}>
                  <span style={{ fontSize: 10, color: "#a78bfa", flexShrink: 0, marginTop: 1 }}>▣</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: "#c4d8ee", fontFamily: "'DM Mono',monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.name}</div>
                    <div style={{ fontSize: 9, color: "#6a8090", fontFamily: "'DM Mono',monospace" }}>Added {d.addedDate}</div>
                    <button
                      onClick={() => analyzeDoc(d)}
                      disabled={streaming}
                      style={{ marginTop: 4, background: "none", border: "none", color: streaming ? "#3a4c5a" : "#a78bfa", fontSize: 9, fontFamily: "'DM Mono',monospace", cursor: streaming ? "not-allowed" : "pointer", padding: 0, letterSpacing: "0.3px" }}
                    >Analyze ▸</button>
                  </div>
                  <button onClick={() => removeRefDoc(d.id)} style={{ background: "transparent", border: "none", color: "#6a8090", cursor: "pointer", fontSize: 11, flexShrink: 0, padding: 0 }}>✕</button>
                </div>
              ))
            }
          </div>

          <div style={{ marginTop: "auto", paddingTop: 12, borderTop: "1px solid #0d1a28" }}>
            {newConvConfirm ? (
              <div>
                <div style={{ fontSize: 10, color: "#c4a060", fontFamily: "'DM Mono',monospace", marginBottom: 8, textAlign: "center", lineHeight: 1.5 }}>
                  Save all conversations to Notes and clear the screen?
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={clearAll} style={{ flex: 1, padding: "6px 0", background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", borderRadius: 7, color: "#ef4444", fontFamily: "'Sora',sans-serif", fontSize: 11, cursor: "pointer" }}>Yes, clear all</button>
                  <button onClick={() => setNewConvConfirm(false)} style={{ flex: 1, padding: "6px 0", background: "transparent", border: "1px solid #111e30", borderRadius: 7, color: "#b0c4d8", fontFamily: "'Sora',sans-serif", fontSize: 11, cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <button
                  className="new-conv-btn"
                  onClick={clearAll}
                  disabled={messages.length === 0}
                  style={{ width: "100%", justifyContent: "center", opacity: messages.length === 0 ? 0.4 : 1 }}
                >
                  🗑 Clear All
                </button>
                {messages.length > 0 && (
                  <div style={{ fontSize: 10, color: "#6a8090", fontFamily: "'DM Mono',monospace", textAlign: "center", marginTop: 7, lineHeight: 1.5 }}>
                    {messages.length} message{messages.length !== 1 ? "s" : ""} · saves to Notes on clear
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Chat */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
            {messages.length === 0 && (
              <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                <div style={{ fontSize: 32, color: "#1a2840" }}>✦</div>
                <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, color: "#98afc4", fontWeight: 400 }}>How can I help today?</div>
                <div style={{ fontSize: 12, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", textAlign: "center", maxWidth: 320, lineHeight: 1.6 }}>
                  Ask anything about your health data, labs, medications, or upcoming appointments.
                </div>
              </div>
            )}

            {(() => {
              // Group messages into conversations by their conv id (consecutive).
              const groups = [];
              messages.forEach((m, idx) => {
                const last = groups[groups.length - 1];
                if (last && last.conv === (m.conv ?? 0)) last.items.push({ m, idx });
                else groups.push({ conv: m.conv ?? 0, items: [{ m, idx }] });
              });
              return groups.map((g, gi) => {
                const convMsgs = g.items.map(x => x.m);
                const firstQ = convMsgs.find(m => m.role === "user")?.text || "Conversation";
                const label = firstQ.length > 42 ? firstQ.slice(0, 42) + "…" : firstQ;
                const busy = summaryBusyConv === g.conv;
                return (
                  <div key={g.conv} style={{ marginTop: gi === 0 ? 0 : 26 }}>
                    {/* Conversation header with its own print controls */}
                    <div className="conv-head no-print">
                      <span className="conv-label" title={firstQ}>{gi + 1}. {label}</span>
                      <div className="line" />
                      <button className="conv-print-btn" onClick={() => printConversationTranscript(convMsgs)} title="Print this conversation word-for-word">⎙ Transcript</button>
                      <button className="conv-print-btn" disabled={busy || streaming} onClick={() => printConversationSummary(g.conv, convMsgs)} title="Print an AI summary of this conversation">
                        {busy ? "⏳ …" : "✦ Summary"}
                      </button>
                    </div>
                    {g.items.map(({ m, idx }, j) => {
                      const prev = j > 0 ? g.items[j - 1].m : null;
                      const isNewTurn = m.role === "user" && prev?.role === "assistant";
                      return (
                        <div key={idx}>
                          {isNewTurn && (
                            <hr style={{ border:"none", borderTop:"1px solid #1a2840", margin:"8px 0 20px" }} />
                          )}
                          <Message
                            role={m.role} text={m.text}
                            streaming={m.streaming && idx === messages.length - 1}
                            mode={m.mode || currentMode}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              });
            })()}

            {streaming && messages[messages.length - 1]?.text === "" && <TypingIndicator />}

            {coldStartRetry && !streaming && (
              <div style={{ background:"rgba(245,158,11,.08)", border:"1px solid rgba(245,158,11,.25)", borderRadius:8, padding:"10px 14px", fontSize:11, color:"#c4a060", fontFamily:"'DM Mono',monospace", marginBottom:16, display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ flex:1 }}>⚠ Server cold start — the proxy is waking up (Render free tier). Wait ~30–60 seconds then click Retry.</span>
                <button onClick={() => {
                  const text = coldStartRetry;
                  setColdStartRetry(null);
                  sendMessage(text, messages.slice(0, -2));
                }} style={{ padding:"5px 14px", background:"rgba(245,158,11,.15)", border:"1px solid rgba(245,158,11,.35)", borderRadius:6, color:"#f59e0b", fontFamily:"'DM Mono',monospace", fontSize:11, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 }}>
                  ↺ Retry
                </button>
              </div>
            )}

            {error && (
              <div style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 8, padding: "10px 14px", fontSize: 11, color: "#ef4444", fontFamily: "'DM Mono',monospace", marginBottom: 16 }}>
                ⚠ {error}
              </div>
            )}

            {summaryNote && (
              <div style={{ background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.25)", borderRadius: 8, padding: "10px 14px", fontSize: 11, color: "#c4a060", fontFamily: "'DM Mono',monospace", marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 10, lineHeight: 1.55 }}>
                <span style={{ flex: 1 }}>⎙ {summaryNote}</span>
                <button onClick={() => setSummaryNote("")} style={{ background: "none", border: "none", color: "#c4a060", cursor: "pointer", fontSize: 13, padding: 0, flexShrink: 0 }}>✕</button>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ borderTop: "1px solid #0d1a28", padding: "14px 24px", background: "#07090f", flexShrink: 0 }}>
            {messages.some(m => (m.conv ?? 0) === currentConv) && (
              <div style={{ marginBottom: 10 }}>
                <button
                  className="new-conv-btn"
                  onClick={startNewConversation}
                  disabled={streaming}
                  title="Finish this topic and start a separate conversation below"
                >
                  ＋ New Conversation
                </button>
                <span style={{ marginLeft: 10, fontSize: 10, color: "#4a5c6a", fontFamily: "'DM Mono',monospace" }}>
                  starts a fresh topic — earlier ones stay above, each printable
                </span>
              </div>
            )}
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <textarea
                ref={textareaRef}
                className="chat-input"
                rows={1}
                placeholder={staleConsent ? "Re-consent to Advanced Mode required — switch to Standard in Settings & Backup" : "Ask anything about your health data…"}
                value={input}
                onChange={e => setInput(e.target.value)}
                onInput={e => {
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 180) + "px";
                }}
                onKeyDown={handleKeyDown}
                disabled={staleConsent}
              />
              {streaming
                ? <button className="stop-btn" onClick={() => abortRef.current?.abort()}>Stop ◼</button>
                : <button className="send-btn" onClick={() => sendMessage(input)} disabled={!input.trim() || staleConsent}>Send ↑</button>
              }
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", display: "flex", justifyContent: "space-between" }}>
              <span>Shift+Enter for new line · Enter to send</span>
              <span>{isAdvanced ? "Advanced Mode · Claude Opus" : "Standard Mode · Claude Sonnet"} · data stays local</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
