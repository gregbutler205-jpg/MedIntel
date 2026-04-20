import { useState, useRef, useEffect, useCallback } from "react";
import AIModeOnboardingModal from "../AIModeOnboardingModal";
import { printConsent } from "../PrintableConsent";
import { CONSENT_VERSION } from "../../config/urgencyThresholds";

const INTELLITRAX_LOGO = import.meta.env.BASE_URL + "logo-white.png";
const PRINT_LOGO       = import.meta.env.BASE_URL + "logo.png";

const STORAGE_KEY    = "intellitrax_ai_messages";
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

  const conditions = safeRead("mi_conditions", []);
  const surgeries  = safeRead("mi_surgeries",  []);
  const careTeam   = safeRead("mi_care_team",  []);
  const meds       = safeRead("mi_meds_full",  []);

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
      return `[${date}]\n` + items.map(l =>
        `- ${l.name}: ${l.value}${l.unit ? " " + l.unit : ""}` +
        `${l.refRange ? ` (ref: ${l.refRange})` : ""}` +
        `${l.flag ? " ⚠ FLAGGED" : ""}` +
        `${l.notes ? ` — ${l.notes}` : ""}`
      ).join("\n");
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
  const refDocsSection = refDocs.length > 0
    ? `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━\nREFERENCE DOCUMENTS (uploaded by patient)\n━━━━━━━━━━━━━━━━━━━━━━━━━\nWhen information from these documents is relevant to a response, cite the document name.\n\n` +
      refDocs.map(d => `[Document: "${d.name}"]\n${d.text.slice(0, 8000)}${d.text.length > 8000 ? "\n…(truncated)" : ""}`).join("\n\n---\n\n")
    : "";

  // ── Mode-specific additions ─────────────────────────────────────────────────
  const modeInstructions = mode === "advanced"
    ? `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━\nADVANCED MODE INSTRUCTIONS\n━━━━━━━━━━━━━━━━━━━━━━━━━\n- Provide deeper analysis with thorough cross-referencing across all data categories\n- Identify subtle patterns and trends not immediately obvious from individual values\n- When appropriate, include differential considerations and nuanced clinical context\n- Flag any value that approaches critical thresholds, even if technically within range\n- Provide actionable guidance with specific questions to raise with each specialist`
    : `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━\nSTANDARD MODE INSTRUCTIONS\n━━━━━━━━━━━━━━━━━━━━━━━━━\n- Provide clear, well-organized responses focused on the most important insights\n- Flag any lab values that are critically abnormal and require urgent attention\n- Keep responses focused and actionable — prioritize what matters most\n- Always name the right doctor to contact for each concern`;

  return `You are an intelligent personal health assistant for Greg Butler. You have deep, comprehensive knowledge of his entire medical history. Your job is to help Greg understand his health holistically — cross-referencing all of his data to surface insights, flag concerns, and prepare him for medical conversations.

▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
PATIENT IDENTITY — ABSOLUTE FACTS (override any conflicting data below)
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
- Patient: Greg Butler
- Transplant type: Living Donor LIVER Transplant (LDLT) — Oct 1, 2024, UMC Transplant Center
- This is a LIVER transplant. NOT a kidney transplant. NOT LDKT. NOT renal transplant.
- Surgeon: Dr. Ari Cohen (historical — not ongoing primary care)
- Primary transplant follow-up physician: ${liverDoc}
- Immunosuppression (Tacrolimus, Mycophenolate, Prednisone) protects the LIVER GRAFT
- Creatinine/eGFR are secondary monitors due to tacrolimus nephrotoxicity — NOT indicators of kidney disease as primary diagnosis
- If any data section below appears to reference a kidney transplant, it is a DATA ENTRY ERROR — disregard it and apply LDLT context

CRITICAL RULES:
- NEVER ask about or suggest screening for a condition already listed in his diagnoses — treat all listed conditions as confirmed, existing diagnoses.
- ALWAYS cross-reference his medications and surgical history when explaining any abnormal lab value.
- Greg had a Living Donor Liver Transplant (LDLT) — NOT a kidney transplant. Never reference kidney transplant, LDKT, ESRD, or right iliac fossa in any response.
- For anything related to liver, bile ducts, hepatic enzymes (ALT, AST, Alk Phos, bilirubin, GGT), transplant graft health, tacrolimus management, or rejection risk: direct Greg to ${liverDoc}.
- Creatinine and eGFR are monitored as SECONDARY markers because tacrolimus is nephrotoxic — but the primary concern is liver graft health, not kidney disease.
- Dr. Ari Cohen was the liver transplant surgeon — he is largely out of the picture now that Greg is in maintenance phase. Do not list him as the ongoing primary contact for day-to-day care.
- For general health, glucose management, blood pressure, lipids: reference ${pcpDoc}.
- ALL lab results and vitals listed below come directly from Greg's records loaded into this app. You HAVE full access to ALL of them. Never claim you cannot see data that appears in the sections below.

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
- Cross-reference ALL data categories — never answer in a silo
- Be clear, direct, medically accurate, and use plain language
- Flag anything urgent prominently
- Reference specific lab values, dates, and trends when relevant
- Always name the specific doctor best suited to address each concern
- Never diagnose or prescribe — inform, analyze, and guide
- Cross-check any medication question against both his current med list AND the avoid list
- Treat this as a comprehensive clinical intelligence tool, not a general chatbot${modeInstructions}${refDocsSection}`;
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
  { label: "Prep for Hepatology appt", prompt: "Help me prepare for my upcoming hepatology appointment. Cross-reference my recent liver panel labs (Bilirubin, ALT, AST, Alk Phos), current medications including tacrolimus and mycophenolate, and any relevant clinical findings or trends." },
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

function printAIResponse(question, answer, logoUrl, mode = "standard") {
  const date = new Date().toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" });
  const modeLabel = mode === "advanced" ? "Advanced Mode — Claude Opus" : "Standard Mode — Claude Sonnet";
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
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
      .mode-badge { display:inline-block; background:#f0f6ff; border:1px solid #2563eb; borderRadius:4px; padding:2px 8px; font-size:10px; font-family:monospace; color:#2563eb; margin-bottom:18px; }
      .footer  { margin-top: 48px; border-top: 1px solid #ddd; padding-top: 12px; font-size: 11px; color: #777; display: flex; justify-content: space-between; }
      @media print { body { margin: 28px; } button { display: none; } }
    </style>
  </head><body>
    <img src="${logoUrl}" class="logo" />
    <h1>AI Analysis</h1>
    <hr class="rule" />
    <div class="q-label">Question:</div>
    <div class="q-text">${question.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
    <div class="a-label">Analysis</div>
    <div class="mode-badge">${modeLabel}</div>
    ${answerToHTML(answer)}
    <div class="footer">
      <span>Insina Health &mdash; Personal Health Intelligence</span>
      <span>Generated ${date}</span>
    </div>
    <script>window.onload = function(){ window.print(); }<\/script>
  </body></html>`);
  win.document.close();
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
function Message({ role, text, streaming, questionText, logoUrl, mode }) {
  const isUser = role === "user";
  const canPrint = !isUser && !streaming && questionText && text;
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
        {isUser ? "G" : "✦"}
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
              {canPrint && (
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10, paddingTop: 8, borderTop: "1px solid #111e30" }}>
                  <button
                    onClick={() => printAIResponse(questionText, text, logoUrl, mode)}
                    style={{ background: "none", border: "none", color: "#4f8ef7", fontSize: 11, cursor: "pointer", fontFamily: "'DM Mono',monospace", opacity: 0.65, display: "flex", alignItems: "center", gap: 5, padding: 0 }}
                  >⎙ Print</button>
                </div>
              )}
              {/* Advanced Mode footer disclaimer */}
              {isAdvanced && !streaming && text && (
                <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid #111e30", fontSize: 10, color: "#4a5c6a", fontFamily: "'DM Mono',monospace", lineHeight: 1.5 }}>
                  Advanced Mode — AI analysis is informational only. Always consult your physician before making health decisions.
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
export default function AIAnalysis() {
  const [messages, setMessages]       = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
  });
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
  const contextCounts                 = getContextCounts();

  // ── Mode state ─────────────────────────────────────────────────────────────
  const [modeData, setModeDataState]  = useState(() => loadModeData());
  const [showOnboarding, setShowOnboarding] = useState(() => !loadModeData());
  // Stale consent banner: advanced mode but consent version mismatch
  const [staleConsent, setStaleConsent] = useState(false);

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

  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    // Block if stale consent is active
    if (staleConsent) return;

    setError("");
    const mode = loadModeData()?.mode || "standard";
    const model = mode === "advanced" ? "claude-opus-4-6" : "claude-sonnet-4-6";

    const userMsg  = { role: "user", text: trimmed };
    const newMsgs  = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setStreaming(true);

    const apiMessages = newMsgs.map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.text }));

    let accum = "";
    const assistantIdx = newMsgs.length;

    setMessages(prev => [...prev, { role: "assistant", text: "", streaming: true, mode }]);

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
                copy[assistantIdx] = { role: "assistant", text: accum, streaming: true, mode };
                return copy;
              });
            }
          } catch {}
        }
      }

      setMessages(prev => {
        const copy = [...prev];
        copy[assistantIdx] = { role: "assistant", text: accum, mode };
        return copy;
      });

      appendAuditLog({ event: "message_sent", mode, model, tokens: accum.length });

    } catch (e) {
      if (e.name === "AbortError") {
        setMessages(prev => {
          const copy = [...prev];
          copy[assistantIdx] = { role: "assistant", text: accum || "_(stopped)_", mode };
          return copy;
        });
      } else {
        setMessages(prev => {
          const copy = [...prev];
          copy[assistantIdx] = { role: "assistant", text: `Error: ${e.message}`, mode };
          return copy;
        });
        setError(e.message);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [messages, streaming, staleConsent]);

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

  const newConversation = () => {
    if (streaming) { abortRef.current?.abort(); }
    saveConversationToNotes(messages);
    setMessages([]);
    setError("");
    setStreaming(false);
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
        .chat-input { flex:1; background:#0b1220; border:1px solid #111e30; color:#c4d8ee; padding:10px 14px; border-radius:8px; font-family:'Sora',sans-serif; font-size:12px; outline:none; resize:none; transition:border-color .15s; line-height:1.5; }
        .chat-input::placeholder { color:#98afc4; }
        .chat-input:focus { border-color:#1a2f4a; }
        .icon-btn { background:transparent; border:1px solid #111e30; border-radius:8px; color:#b0c4d8; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all .15s; font-size:13px; flex-shrink:0; }
        .icon-btn:hover { border-color:#1a2f4a; color:#7eb8d8; }
        .new-conv-btn { display:inline-flex; align-items:center; gap:5px; padding:4px 11px; background:transparent; border:1px solid #111e30; border-radius:12px; color:#98afc4; font-size:11px; font-family:'DM Mono',monospace; cursor:pointer; transition:all .15s; }
        .new-conv-btn:hover { border-color:#1a2f4a; color:#b0c4d8; }
        @media print { .no-print { display:none !important; } aside { display:none !important; } body { background:white !important; } }
      `}</style>

      {/* First-run onboarding modal */}
      {showOnboarding && <AIModeOnboardingModal onConfirm={handleModeConfirm} />}

      {/* Topbar */}
      <div style={{ height: 54, background: "#080c14", borderBottom: "1px solid #0d1a28", display: "flex", alignItems: "center", padding: "0 24px", gap: 12, flexShrink: 0 }}>
        <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, color: "#dde8f5", fontWeight: 400, letterSpacing: "-0.3px" }}>AI Analysis</div>
        <span style={{ fontSize: 8, background: "#4f8ef7", color: "#fff", padding: "2px 6px", borderRadius: 8, fontFamily: "'DM Mono',monospace", letterSpacing: "0.5px" }}>AI</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {CONTEXT_TAGS.map(t => (
            <span key={t.label} style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", background: `${t.color}15`, color: t.color, border: `1px solid ${t.color}28`, padding: "2px 8px", borderRadius: 4, letterSpacing: "0.5px", textTransform: "uppercase" }}>{t.label}</span>
          ))}
        </div>
        <button onClick={() => window.print()} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", background:"rgba(79,142,247,.1)", border:"1px solid rgba(79,142,247,.3)", borderRadius:8, color:"#7eb8d8", fontSize:11, fontFamily:"'DM Mono',monospace", cursor:"pointer" }}>
          ⎙ Print
        </button>
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
            To re-enable Advanced Mode, go to <strong>Data &amp; Backup → AI Analysis Mode</strong> and re-consent.
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
                  </div>
                  <button onClick={() => removeRefDoc(d.id)} style={{ background: "transparent", border: "none", color: "#6a8090", cursor: "pointer", fontSize: 11, flexShrink: 0, padding: 0 }}>✕</button>
                </div>
              ))
            }
          </div>

          <div style={{ marginTop: "auto", paddingTop: 12, borderTop: "1px solid #0d1a28" }}>
            <button className="new-conv-btn" onClick={newConversation} style={{ width: "100%", justifyContent: "center" }}>
              ↺ Clear &amp; Save to Notes
            </button>
            {messages.length > 0 && (
              <div style={{ fontSize: 10, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", textAlign: "center", marginTop: 8 }}>
                {messages.length} message{messages.length !== 1 ? "s" : ""} · saves to Notes on clear
              </div>
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

            {messages.map((m, i) => {
              const prevIsAssistant = i > 0 && messages[i-1].role === "assistant";
              const isNewTurn = m.role === "user" && prevIsAssistant;
              const questionText = m.role === "assistant" && i > 0 && messages[i-1].role === "user"
                ? messages[i-1].text : null;
              return (
                <div key={i}>
                  {isNewTurn && (
                    <hr style={{ border:"none", borderTop:"1px solid #1a2840", margin:"8px 0 20px" }} />
                  )}
                  <Message
                    role={m.role} text={m.text}
                    streaming={m.streaming && i === messages.length - 1}
                    questionText={questionText}
                    logoUrl={PRINT_LOGO}
                    mode={m.mode || currentMode}
                  />
                </div>
              );
            })}

            {streaming && messages[messages.length - 1]?.text === "" && <TypingIndicator />}

            {error && (
              <div style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 8, padding: "10px 14px", fontSize: 11, color: "#ef4444", fontFamily: "'DM Mono',monospace", marginBottom: 16 }}>
                ⚠ {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ borderTop: "1px solid #0d1a28", padding: "14px 24px", background: "#07090f", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <textarea
                className="chat-input"
                rows={2}
                placeholder={staleConsent ? "Re-consent to Advanced Mode required — switch to Standard in Data & Backup" : "Ask anything about your health data…"}
                value={input}
                onChange={e => setInput(e.target.value)}
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
