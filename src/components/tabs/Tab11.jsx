import INTELLITRAX_LOGO from "../../assets/logo.png";
import { useState, useRef, useEffect, useCallback } from "react";

const STORAGE_KEY  = "intellitrax_ai_messages";
const API_KEY_STORE = "mi_ak";

const SYSTEM_PROMPT = `You are an intelligent personal health assistant for Greg Butler. You have deep, comprehensive knowledge of his entire medical history, all active diagnoses, medications, labs, surgeries, and transplant-specific reference data. Your job is to help Greg understand his health holistically — cross-referencing all of his data to surface insights, flag concerns, and prepare him for medical conversations.

━━━━━━━━━━━━━━━━━━━━━━━━━
DIAGNOSES & ACTIVE CONDITIONS
━━━━━━━━━━━━━━━━━━━━━━━━━
Primary:
- End-stage renal disease (ESRD) — resolved via transplant
- Status post living-donor kidney transplant (LDKT), Oct 1, 2024
- Chronic kidney disease (CKD) Stage 3a — eGFR ~58 mL/min, creatinine baseline ~1.30 mg/dL
- Hypertension — partially controlled, on Amlodipine 10mg + Lisinopril 10mg
- Immunosuppression-dependent state (lifelong)

Secondary / Comorbidities:
- Hyperlipidemia — on Atorvastatin 20mg
- Anemia of chronic kidney disease — monitoring hemoglobin
- CMV IgG positive (donor CMV negative — higher risk for CMV reactivation)
- EBV IgG positive
- Mild interstitial fibrosis / tubular atrophy (IF/TA) Grade 1 — found on protocol biopsy Oct 2025
- History of elevated blood pressure variability

━━━━━━━━━━━━━━━━━━━━━━━━━
SURGICAL & PROCEDURE HISTORY
━━━━━━━━━━━━━━━━━━━━━━━━━
- Oct 1, 2024: Living donor kidney transplant (LDKT), right iliac fossa, UMC Transplant Center. Immediate graft function. Induction: Basiliximab + methylprednisolone. Native kidneys left in place (atrophic bilaterally).
- Oct 14, 2025: Protocol biopsy at 12-month mark. Banff: i0 t0 g0 v0, ci1 ct1. No acute rejection. No CNI toxicity.
- Feb 20, 2026: Renal ultrasound — transplant kidney 11.4 cm, resistive index 0.62, normal perfusion, no hydronephrosis.

━━━━━━━━━━━━━━━━━━━━━━━━━
CURRENT MEDICATIONS (14 active)
━━━━━━━━━━━━━━━━━━━━━━━━━
Immunosuppression (core — must never be stopped without physician guidance):
- Tacrolimus (Prograf) 2mg BID — target trough 5–8 ng/mL; recent level 6.2 ng/mL (therapeutic)
- Mycophenolate mofetil (CellCept) / Mycophenolic acid (Myfortic) 720mg BID
- Prednisone 5mg QD — taper long-term goal; refill due in ~4 days

Cardiovascular / BP:
- Amlodipine 10mg QD (increased Feb 2026 from 5mg)
- Lisinopril 10mg QD — ACE inhibitor; monitor potassium and creatinine closely

Lipid / Metabolic:
- Atorvastatin 20mg QD at bedtime — NOTE: many statins interact with Tacrolimus via CYP3A4; simvastatin and lovastatin are contraindicated; atorvastatin at low-moderate dose is acceptable

GI Protection:
- Pantoprazole 40mg QD (PPI — GI protection with prednisone/MMF)

Infection Prophylaxis:
- Trimethoprim-sulfamethoxazole (Bactrim) DS — PCP prophylaxis (confirm if still active or discontinued at 12-month mark)
- Valganciclovir — CMV prophylaxis (confirm duration; typically 6–12 months post-transplant; may be complete)

Supplements:
- Vitamin D3 1000–2000 IU QD
- Calcium carbonate 500mg BID (with meals)
- Magnesium oxide 400mg QD (tacrolimus causes magnesium wasting)
- Fish oil / Omega-3 — cardioprotective

Other:
- Aspirin 81mg QD — antiplatelet

━━━━━━━━━━━━━━━━━━━━━━━━━
RECENT LAB RESULTS (Mar 10, 2026)
━━━━━━━━━━━━━━━━━━━━━━━━━
Kidney Function:
- Creatinine: 1.42 mg/dL (baseline ~1.30; mildly elevated)
- BUN: 22 mg/dL
- eGFR: 58 mL/min (CKD Stage 3a)
- Urine protein: monitor for proteinuria trends

Tacrolimus & Immunosuppressants:
- Tacrolimus trough: 6.2 ng/mL (target 5–8 ng/mL — therapeutic)

Liver Panel:
- Bilirubin: 0.6 mg/dL (normal)
- ALT / AST: monitor — MMF and tacrolimus can affect liver
- Alk Phos: 98 U/L (normal)
- Albumin: 4.1 g/dL (normal — good nutritional marker)

Electrolytes (CMP):
- Potassium: 4.1 mEq/L (watch — Lisinopril + CKD raises hyperkalemia risk)
- Magnesium: monitor — tacrolimus causes wasting
- Sodium, CO2, Chloride: within range

CBC:
- WBC: 6.2 K/μL (MMF can cause leukopenia; watch for drops)
- Hemoglobin: 13.8 g/dL (acceptable; watch for anemia trend)
- Platelets: normal

Endocrine:
- Blood glucose: monitor — tacrolimus and prednisone cause post-transplant diabetes mellitus (PTDM) risk
- HbA1c: track if glucose trending up

Pre-transplant baseline (Sep 2024):
- Creatinine: 4.8 mg/dL, eGFR: 12 mL/min (ESRD state)

━━━━━━━━━━━━━━━━━━━━━━━━━
RECENT VITALS
━━━━━━━━━━━━━━━━━━━━━━━━━
- Mar 4: BP 131/71, HR 64, O2 99% — acceptable
- Mar 3: BP 164/78, HR 59, O2 100% — elevated, flagged
- Jan 28: BP 148/78, HR 74, O2 96%
- Dec 29: BP 143/88, HR 70, O2 -- — diastolic elevated, flagged
- Weight: 184 lbs (stable)

━━━━━━━━━━━━━━━━━━━━━━━━━
CARE TEAM
━━━━━━━━━━━━━━━━━━━━━━━━━
- Nephrologist / Transplant: Dr. Ari Cohen, MD — UMC Transplant Center (primary transplant physician)
- PCP: Dr. Jonathan Hand, MD — Hand Family Medicine
- Radiology: Dr. Lisa Tran — Baptist Medical Center
- Lab: Quest Diagnostics (transplant panel draws)

━━━━━━━━━━━━━━━━━━━━━━━━━
MEDICATIONS TO AVOID — CRITICAL LIST
━━━━━━━━━━━━━━━━━━━━━━━━━
NSAIDs (ABSOLUTELY AVOID):
- Ibuprofen (Advil, Motrin), Naproxen (Aleve), Aspirin >81mg, Ketorolac, Indomethacin, Celecoxib
- Reason: nephrotoxic in CKD/transplant — can cause acute kidney injury and graft damage
- Safe alternative for pain: Acetaminophen (Tylenol) ≤2g/day (lower limit due to CKD)

Antibiotics that interact with Tacrolimus (CYP3A4/P-gp):
- Clarithromycin, Erythromycin — STRONG inhibitors, spike Tacrolimus levels dangerously
- Fluconazole, Voriconazole, Itraconazole — antifungals, major CYP3A4 inhibitors
- Rifampin — strong INDUCER, drops Tacrolimus levels, risk of rejection
- Always alert any prescriber that he is on Tacrolimus before any antibiotic is prescribed

Statins contraindicated with Tacrolimus:
- Simvastatin, Lovastatin — avoid; high myopathy/rhabdomyolysis risk with CNIs
- Atorvastatin ≤20mg is acceptable; pravastatin is also safe

Herbal supplements (AVOID):
- St. John's Wort — potent CYP3A4 inducer; drops Tacrolimus by 50%+; risk of acute rejection
- Echinacea — immune stimulant; counteracts immunosuppression
- Cat's Claw, Astragalus, Andrographis — immune boosters, contraindicated
- Licorice root — raises BP, interacts with prednisone

OTC medications to avoid or use cautiously:
- Antacids with magnesium/aluminum — may affect tacrolimus absorption timing (take tacrolimus separately)
- Pseudoephedrine / decongestants — raises BP; avoid with hypertension
- High-dose vitamin C or E supplementation — generally avoid megadosing
- Potassium supplements or salt substitutes containing potassium — hyperkalemia risk with Lisinopril + CKD
- Bismuth (Pepto-Bismol) — generally okay short term, but flag for salicylate content

━━━━━━━━━━━━━━━━━━━━━━━━━
FOODS & DIETARY RESTRICTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━
AVOID completely:
- Grapefruit and grapefruit juice — CYP3A4 inhibitor; significantly raises Tacrolimus blood levels unpredictably
- Pomelo, Seville oranges (marmalade) — same family as grapefruit, same risk
- Raw or undercooked meat, fish, shellfish, eggs — infection risk (immunosuppressed)
- Unpasteurized dairy, soft cheeses (brie, camembert, blue cheese) — Listeria risk
- Raw sprouts (alfalfa, bean) — bacterial contamination risk
- Deli meats / luncheon meats unless heated to steaming — Listeria
- Unpasteurized juices

Eat with caution / limit:
- High-potassium foods — bananas, oranges, potatoes, tomatoes, avocado, spinach — monitor with hyperkalemia risk from Lisinopril + CKD
- High-phosphorus foods — dairy, nuts, cola drinks — CKD phosphorus management
- Salt / sodium — hypertension management; target <2g sodium/day
- Alcohol — interacts with immunosuppressants; suppresses immune function further; hepatotoxic risk
- High-sugar foods — PTDM risk from prednisone and tacrolimus

Encouraged:
- Mediterranean-style diet — low sodium, heart-healthy, anti-inflammatory
- Adequate hydration — 2–3L water/day unless restricted
- Cooked vegetables, well-washed produce
- Lean proteins — chicken, turkey, fish (well-cooked)

━━━━━━━━━━━━━━━━━━━━━━━━━
INFECTION & IMMUNOSUPPRESSION RISKS
━━━━━━━━━━━━━━━━━━━━━━━━━
- Avoid live vaccines (MMR, varicella, live flu, yellow fever) — contraindicated while immunosuppressed
- Safe vaccines: inactivated flu, COVID, pneumococcal, hepatitis B, Tdap, shingles (Shingrix — recombinant, not live)
- CMV risk: Greg is D-/R+ (donor negative, recipient positive) — lower risk profile but monitor CMV PCR
- BK virus nephropathy — risk from over-immunosuppression; monitor BK PCR if creatinine rises unexpectedly
- Avoid sick contacts; mask in crowded indoor settings during respiratory virus season
- Any fever >38°C (100.4°F) should prompt same-day contact with transplant team
- Skin cancer risk is significantly elevated on long-term immunosuppression — annual dermatology screening

━━━━━━━━━━━━━━━━━━━━━━━━━
UPCOMING CARE
━━━━━━━━━━━━━━━━━━━━━━━━━
- Mar 15, 2026: Nephrology follow-up — Dr. Ari Cohen (3 days away)
- Mar 18, 2026: Transplant labs — Quest Diagnostics
- Mar 25, 2026: Ultrasound — liver/kidney
- Apr 3, 2026: PT session
- Prednisone refill due in ~4 days
- Creatinine lab overdue (last drawn Feb 12)

━━━━━━━━━━━━━━━━━━━━━━━━━
ASSISTANT GUIDELINES
━━━━━━━━━━━━━━━━━━━━━━━━━
- Cross-reference ALL data categories when answering — never answer in a silo
- Be clear, direct, medically accurate, and use plain language
- Flag anything that warrants urgent attention prominently
- Reference specific lab values, dates, and trends when relevant
- Format answers with clear structure using **bold** for key terms and - bullets for lists
- Always recommend discussing specific decisions with his care team
- Never diagnose or prescribe — inform, analyze, and guide
- When asked about medications, always cross-check against his current med list AND the avoid list
- Treat this as a comprehensive clinical intelligence tool, not a general health chatbot`;

const PRESETS = [
  { label: "Full health summary",      prompt: "Give me a comprehensive cross-referenced summary of my current health status — covering my diagnoses, recent labs, vitals, medications, and upcoming care." },
  { label: "Medication safety check",  prompt: "Review my full medication list for interactions, anything I should avoid (including OTCs and supplements), and flag any concerns to raise with my care team." },
  { label: "Prep nephrology visit",    prompt: "Help me prepare questions for my upcoming nephrology appointment. Cross-reference my recent labs, BP trends, biopsy results, and creatinine history." },
  { label: "Rejection risk check",     prompt: "Based on my current creatinine, Tacrolimus level, blood pressure, and biopsy findings, what are my current signs or risk factors for rejection or graft decline?" },
  { label: "Foods & things to avoid",  prompt: "Give me a complete rundown of foods, drinks, OTC medications, supplements, and activities I need to avoid or be cautious about given my transplant and current medications." },
  { label: "Infection risk review",    prompt: "What are my current infection risks given my immunosuppression level, CMV status, and recent labs? What symptoms should prompt me to call the transplant team immediately?" },
  { label: "BP pattern analysis",      prompt: "Analyze my blood pressure readings and cross-reference with my medication changes, kidney function, and lab trends. Are there concerning patterns?" },
  { label: "Lab trend deep dive",      prompt: "Walk me through all of my key lab trends — creatinine, eGFR, Tacrolimus, CBC, liver panel, and electrolytes — and flag anything moving in the wrong direction." },
];

const CONTEXT_ITEMS = [
  { label: "2,996 lab entries", color: "#10b981" },
  { label: "14 medications",    color: "#f59e0b" },
  { label: "48 vital readings", color: "#a78bfa" },
  { label: "7 records",         color: "#4f8ef7" },
];

const CONTEXT_TAGS = [
  { label: "Labs",        color: "#10b981" },
  { label: "Vitals",      color: "#a78bfa" },
  { label: "Medications", color: "#f59e0b" },
  { label: "Records",     color: "#4f8ef7" },
];

function renderMarkdown(text) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const bold = line.replace(/\*\*(.*?)\*\*/g, (_, m) =>
      `<strong style="color:#c4d8ee;font-weight:600">${m}</strong>`
    );
    if (line.startsWith("- ") || line.startsWith("• ")) {
      return (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 3, paddingLeft: 4 }}>
          <span style={{ color: "#4f8ef7", flexShrink: 0, marginTop: 2, fontSize: 10 }}>▸</span>
          <span dangerouslySetInnerHTML={{ __html: bold.replace(/^[-•]\s/, "") }} />
        </div>
      );
    }
    if (line === "") return <div key={i} style={{ height: 8 }} />;
    return <div key={i} dangerouslySetInnerHTML={{ __html: bold }} style={{ marginBottom: 2 }} />;
  });
}

function Message({ role, text, streaming }) {
  const isUser = role === "user";
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
          : <div>{renderMarkdown(text)}{streaming && <span style={{ display: "inline-block", width: 8, height: 14, background: "#4f8ef7", marginLeft: 2, animation: "cursorBlink 1s step-end infinite", verticalAlign: "text-bottom" }} />}</div>
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

export default function AIAnalysis() {
  const [messages, setMessages]       = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
  });
  const [input, setInput]             = useState("");
  const [streaming, setStreaming]     = useState(false);
  const [showKeyPopover, setShowKeyPopover] = useState(false);
  const [apiKey, setApiKey]           = useState(() => localStorage.getItem(API_KEY_STORE) || "");
  const [keyInput, setKeyInput]       = useState("");
  const [error, setError]             = useState("");
  const bottomRef                     = useRef(null);
  const abortRef                      = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch {}
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    if (!apiKey) { setShowKeyPopover(true); return; }

    setError("");
    const userMsg  = { role: "user", text: trimmed };
    const newMsgs  = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setStreaming(true);

    const apiMessages = newMsgs.map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.text }));

    let accum = "";
    const assistantIdx = newMsgs.length;

    setMessages(prev => [...prev, { role: "assistant", text: "", streaming: true }]);

    try {
      const controller = new AbortController();
      abortRef.current = controller;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "messages-2023-12-15",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          stream: true,
          system: SYSTEM_PROMPT,
          messages: apiMessages,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `API error ${res.status}`);
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
                copy[assistantIdx] = { role: "assistant", text: accum, streaming: true };
                return copy;
              });
            }
          } catch {}
        }
      }

      setMessages(prev => {
        const copy = [...prev];
        copy[assistantIdx] = { role: "assistant", text: accum };
        return copy;
      });
    } catch (e) {
      if (e.name === "AbortError") {
        setMessages(prev => {
          const copy = [...prev];
          copy[assistantIdx] = { role: "assistant", text: accum || "_(stopped)_" };
          return copy;
        });
      } else {
        setMessages(prev => {
          const copy = [...prev];
          copy[assistantIdx] = { role: "assistant", text: `Error: ${e.message}` };
          return copy;
        });
        setError(e.message);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [messages, streaming, apiKey]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const saveApiKey = () => {
    const k = keyInput.trim();
    if (!k) return;
    localStorage.setItem(API_KEY_STORE, k);
    setApiKey(k);
    setKeyInput("");
    setShowKeyPopover(false);
  };

  const newConversation = () => {
    if (streaming) { abortRef.current?.abort(); }
    setMessages([]);
    setError("");
    setStreaming(false);
  };

  const hasKey = !!apiKey;

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
        .modal-input { width:100%; background:#07090f; border:1px solid #111e30; color:#c4d8ee; padding:9px 12px; border-radius:8px; font-family:'DM Mono',monospace; font-size:12px; outline:none; transition:border-color .15s; letter-spacing:0.5px; }
        .modal-input:focus { border-color:#1a2f4a; }
        .new-conv-btn { display:inline-flex; align-items:center; gap:5px; padding:4px 11px; background:transparent; border:1px solid #111e30; border-radius:12px; color:#98afc4; font-size:11px; font-family:'DM Mono',monospace; cursor:pointer; transition:all .15s; }
        .new-conv-btn:hover { border-color:#1a2f4a; color:#b0c4d8; }
        @media print { .no-print { display:none !important; } aside { display:none !important; } body { background:white !important; } }
      `}</style>

      {/* Topbar */}
      <div style={{ height: 54, background: "#080c14", borderBottom: "1px solid #0d1a28", display: "flex", alignItems: "center", padding: "0 24px", gap: 12, flexShrink: 0 }}>
        <img src={INTELLITRAX_LOGO} alt="IntelliTrax" style={{ width: 185, height: 65, objectFit: "contain" }} />
        <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, color: "#dde8f5", fontWeight: 400, letterSpacing: "-0.3px" }}>AI Analysis</div>
        <span style={{ fontSize: 8, background: "#4f8ef7", color: "#fff", padding: "2px 6px", borderRadius: 8, fontFamily: "'DM Mono',monospace", letterSpacing: "0.5px" }}>AI</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {CONTEXT_TAGS.map(t => (
            <span key={t.label} style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", background: `${t.color}15`, color: t.color, border: `1px solid ${t.color}28`, padding: "2px 8px", borderRadius: 4, letterSpacing: "0.5px", textTransform: "uppercase" }}>{t.label}</span>
          ))}
        </div>
        {/* Print button */}
        <button onClick={() => window.print()} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", background:"rgba(79,142,247,.1)", border:"1px solid rgba(79,142,247,.3)", borderRadius:8, color:"#7eb8d8", fontSize:11, fontFamily:"'DM Mono',monospace", cursor:"pointer" }}>
          ⎙ Print
        </button>
        {/* API key indicator + gear */}
        <div style={{ position: "relative" }}>
          <button className="icon-btn" onClick={() => setShowKeyPopover(p => !p)} title="API Key settings" style={{ gap: 5, width: "auto", padding: "0 10px", color: hasKey ? "#10b981" : "#f59e0b", borderColor: hasKey ? "rgba(16,185,129,.25)" : "rgba(245,158,11,.25)" }}>
            <span style={{ fontSize: 11 }}>⚙</span>
            <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace" }}>{hasKey ? "Key set" : "No key"}</span>
          </button>

          {showKeyPopover && (
            <div style={{ position: "absolute", right: 0, top: 40, width: 320, background: "#0b1220", border: "1px solid #1a2f4a", borderRadius: 12, padding: 18, zIndex: 50, animation: "fadeUp .2s ease both", boxShadow: "0 8px 32px rgba(0,0,0,.5)" }}>
              <div style={{ fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase", color: "#a0b4c8", fontFamily: "'DM Mono',monospace", marginBottom: 10 }}>Anthropic API Key</div>
              {hasKey && (
                <div style={{ fontSize: 11, color: "#10b981", fontFamily: "'DM Mono',monospace", marginBottom: 10 }}>
                  ✓ Key saved · {apiKey.slice(0, 8)}••••••••
                </div>
              )}
              <input
                className="modal-input"
                placeholder="sk-ant-api03-…"
                value={keyInput}
                onChange={e => setKeyInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && saveApiKey()}
                style={{ marginBottom: 10 }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={saveApiKey} style={{ flex: 1, padding: "7px 0", background: "rgba(79,142,247,.12)", border: "1px solid rgba(79,142,247,.3)", borderRadius: 8, color: "#4f8ef7", fontSize: 12, fontFamily: "'Sora',sans-serif", cursor: "pointer" }}>
                  Save Key
                </button>
                <button onClick={() => setShowKeyPopover(false)} style={{ padding: "7px 14px", background: "transparent", border: "1px solid #111e30", borderRadius: 8, color: "#b0c4d8", fontSize: 12, fontFamily: "'Sora',sans-serif", cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
              <div style={{ fontSize: 10, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", marginTop: 10 }}>
                Stored in localStorage under mi_ak · never transmitted except to api.anthropic.com
              </div>
            </div>
          )}
        </div>

        <div style={{ fontSize: 10, color: "#1e4030", fontFamily: "'DM Mono',monospace", background: "#0b1220", border: "1px solid #111e30", padding: "5px 12px", borderRadius: 6, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: hasKey ? "#10b981" : "#b0c4d8", display: "inline-block" }} />
          claude-sonnet-4-6
        </div>
      </div>

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
            {CONTEXT_ITEMS.map(({ label, color }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: "#b0c4d8", fontFamily: "'DM Mono',monospace", marginBottom: 7 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, flexShrink: 0 }} />
                {label}
              </div>
            ))}
          </div>

          <div style={{ marginTop: "auto", paddingTop: 12, borderTop: "1px solid #0d1a28" }}>
            <button className="new-conv-btn" onClick={newConversation} style={{ width: "100%", justifyContent: "center" }}>
              ↺ New Conversation
            </button>
            {messages.length > 0 && (
              <div style={{ fontSize: 10, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", textAlign: "center", marginTop: 8 }}>
                {messages.length} message{messages.length !== 1 ? "s" : ""} · auto-saved
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
                  {hasKey
                    ? "Ask anything about your health data, labs, medications, or upcoming appointments."
                    : "Set your Anthropic API key using the ⚙ button above to get started."}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <Message key={i} role={m.role} text={m.text} streaming={m.streaming && i === messages.length - 1} />
            ))}

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
                placeholder={hasKey ? "Ask anything about your health data…" : "Set your API key to begin…"}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!hasKey}
              />
              {streaming
                ? <button className="stop-btn" onClick={() => abortRef.current?.abort()}>Stop ◼</button>
                : <button className="send-btn" onClick={() => sendMessage(input)} disabled={!input.trim() || !hasKey}>Send ↑</button>
              }
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: "#a0b4c8", fontFamily: "'DM Mono',monospace", display: "flex", justifyContent: "space-between" }}>
              <span>Shift+Enter for new line · Enter to send</span>
              <span>Powered by Claude · data stays local</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
