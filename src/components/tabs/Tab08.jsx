import INTELLITRAX_LOGO from "../../assets/logo.png";
import { useState } from "react";

const TABS = ["Timeline", "Goals", "Care Team", "Preventive", "Emergency", "Milestones", "Reference"];

const mono = "'DM Mono',monospace";
const serif = "'DM Serif Display',serif";
const sora = "'Sora',sans-serif";

const APPTS_INIT = [
  { id:1, title:"Nephrology Follow-Up",      doctor:"Dr. Ari Cohen",     facility:"UMC Transplant Center",  date:"Mar 15, 2026", time:"10:00 AM", type:"appointment", urgency:"high", prep:["Bring home BP log","Ask about creatinine 1.42 trend","Review Tacrolimus dose — trough 6.2 ng/mL"] },
  { id:2, title:"Transplant Labs",            doctor:"Quest Diagnostics", facility:"Quest Diagnostics",      date:"Mar 18, 2026", time:"9:00 AM",  type:"lab",         urgency:"med",  prep:["Fast after midnight — water okay","Take Tacrolimus at 7–8 PM night before labs only","Draw AFTER labs: Tacrolimus trough, CMP, CBC","Arrive early — trough must be pre-dose"] },
  { id:3, title:"Liver / Kidney Ultrasound", doctor:"Dr. Lisa Tran",     facility:"Baptist Medical Center", date:"Mar 25, 2026", time:"2:30 PM",  type:"imaging",     urgency:"med",  prep:["No eating 4 hrs before","Drink water — full bladder preferred"] },
  { id:4, title:"PT Session",                doctor:"Baptist Rehab",     facility:"Baptist Rehab Center",   date:"Apr 3, 2026",  time:"11:00 AM", type:"other",       urgency:"low",  prep:[] },
  { id:5, title:"Dermatology Screen",        doctor:"TBD",               facility:"TBD",                    date:"Apr 2026",     time:"TBD",      type:"appointment", urgency:"low",  prep:["Annual skin cancer screen","Check moles, crusty areas, pink spots","Immunosuppression significantly raises skin cancer risk"] },
  { id:6, title:"Primary Care Follow-Up",    doctor:"Dr. Jonathan Hand", facility:"Hand Family Medicine",   date:"May 2026",     time:"TBD",      type:"appointment", urgency:"low",  prep:["BP check post Amlodipine increase to 10mg","Review colonoscopy scheduling (due 2027)","Bone density test referral if not yet done"] },
];

const GOALS = [
  { id:1,  label:"Creatinine ≤ 1.40 mg/dL",    category:"Kidney",           color:"#4f8ef7", status:"watch",    note:"Currently 1.42 — slightly above target" },
  { id:2,  label:"Tacrolimus trough 5–8 ng/mL", category:"Immunosuppression",color:"#a78bfa", status:"on-track", note:"6.2 ng/mL — therapeutic" },
  { id:3,  label:"BP below 130/80",              category:"Cardiovascular",   color:"#ef4444", status:"watch",    note:"Variable — spike to 164/78 on Mar 3" },
  { id:4,  label:"eGFR ≥ 55 mL/min",            category:"Kidney",           color:"#4f8ef7", status:"on-track", note:"58 mL/min — within target" },
  { id:5,  label:"Hemoglobin ≥ 12 g/dL",        category:"CBC",              color:"#10b981", status:"on-track", note:"13.8 g/dL — good" },
  { id:6,  label:"No acute rejection episodes",  category:"Transplant",       color:"#f59e0b", status:"on-track", note:"Protocol biopsy Oct 2025 — no rejection" },
  { id:7,  label:"Annual dermatology screen",    category:"Preventive",       color:"#10b981", status:"due",      note:"Overdue — schedule for Apr 2026" },
  { id:8,  label:"Bone density test",            category:"Preventive",       color:"#10b981", status:"due",      note:"Due at 12-month post-transplant — not yet done" },
  { id:9,  label:"Colonoscopy screening",        category:"Preventive",       color:"#10b981", status:"on-track", note:"Due 2027 — on schedule" },
  { id:10, label:"Dental checkup (every 6 mo)",  category:"Preventive",       color:"#10b981", status:"watch",    note:"Every 6 months starting 6 months post-transplant" },
];

const TEAM = [
  { name:"Dr. Ari Cohen, MD",    role:"Nephrologist / Transplant", facility:"UMC Transplant Center",  phone:"(601) 555-0142", next:"Mar 15, 2026", color:"#4f8ef7" },
  { name:"Dr. Jonathan Hand, MD",role:"Primary Care Physician",    facility:"Hand Family Medicine",    phone:"(601) 555-0198", next:"May 2026",     color:"#10b981" },
  { name:"Dr. Lisa Tran",        role:"Radiologist",               facility:"Baptist Medical Center",  phone:"(601) 555-0231", next:"Mar 25, 2026", color:"#a78bfa" },
  { name:"Quest Diagnostics",    role:"Lab Services",              facility:"Quest Diagnostics",       phone:"(601) 555-0177", next:"Mar 18, 2026", color:"#f59e0b" },
  { name:"Baptist Rehab",        role:"Physical Therapy",          facility:"Baptist Rehab Center",    phone:"(601) 555-0155", next:"Apr 3, 2026",  color:"#10b981" },
];

const PREVENTIVE = [
  { label:"Inactivated Influenza",        status:"current", note:"Annual — get every fall; dead virus only — safe",                          category:"Vaccine" },
  { label:"COVID-19 Booster",             status:"current", note:"Updated Fall 2025",                                                         category:"Vaccine" },
  { label:"Pneumococcal (PCV20)",         status:"current", note:"Series complete",                                                           category:"Vaccine" },
  { label:"Hepatitis B",                  status:"current", note:"Series complete",                                                           category:"Vaccine" },
  { label:"Tdap",                         status:"current", note:"Up to date",                                                                category:"Vaccine" },
  { label:"Shingrix (recombinant)",       status:"due",     note:"Safe post-transplant (non-live recombinant) — schedule with PCP",          category:"Vaccine" },
  { label:"Live flu vaccine (FluMist)",   status:"never",   note:"AVOID — live virus; contraindicated while immunosuppressed",               category:"Vaccine" },
  { label:"MMR (measles/mumps/rubella)",  status:"never",   note:"AVOID — live virus; contraindicated",                                      category:"Vaccine" },
  { label:"Varicella (chickenpox)",       status:"never",   note:"AVOID — live virus; contraindicated",                                      category:"Vaccine" },
  { label:"Yellow fever",                 status:"never",   note:"AVOID — live virus; contraindicated",                                      category:"Vaccine" },
  { label:"Dermatology Screen",           status:"due",     note:"Annual — overdue; immunosuppression raises skin cancer risk significantly", category:"Screening" },
  { label:"Colonoscopy",                  status:"on-track",note:"Due 2027; repeat every 1–10 yrs depending on history",                     category:"Screening" },
  { label:"Bone Density Test",            status:"due",     note:"Due at 12-month post-transplant — not yet scheduled; Prednisone affects bones", category:"Screening" },
  { label:"Dental Checkup",              status:"watch",   note:"Every 6 months starting 6 months post-transplant",                          category:"Screening" },
  { label:"Eye Exam",                     status:"watch",   note:"Annual — anti-rejection meds may raise eye risk; cataracts possible",      category:"Screening" },
  { label:"Blood Pressure Check",         status:"on-track",note:"Ongoing — checked at every transplant visit",                              category:"Screening" },
];

const MILESTONES = [
  { label:"Transplant Surgery",             date:"Oct 1, 2024",       done:true,  note:"LDKT right iliac fossa. Immediate graft function. 5-day admission. Discharge Cr: 1.18 mg/dL." },
  { label:"First Transplant Clinic Visit",  date:"Oct 7, 2024",       done:true,  note:"First business day post-discharge. Labs + nurse coordinator + pharmacist review." },
  { label:"Months 0–1: Labs 2–3×/week",    date:"Oct–Nov 2024",      done:true,  note:"Frequent labs during Tacrolimus dose adjustment phase. Clinic 1–2× per week." },
  { label:"Months 1–3: Labs Weekly",        date:"Nov–Dec 2024",      done:true,  note:"Labs every week. Clinic every 2–6 weeks. Highest rejection risk window." },
  { label:"Months 3–6: Labs Every 2–3 wk", date:"Jan–Apr 2025",      done:true,  note:"Labs every 2–3 weeks. Clinic every 1–2 months. Immunosuppression stabilizing." },
  { label:"Months 6–12: Labs Monthly",     date:"Apr–Oct 2025",      done:true,  note:"Labs every 4 weeks. Clinic every 2–3 months." },
  { label:"Protocol Biopsy (12 months)",    date:"Oct 14, 2025",      done:true,  note:"No acute rejection. Mild IF/TA Grade 1 (ci1 ct1). No CNI toxicity. Continue current regimen." },
  { label:"Bone Density Test",              date:"Due Oct 2025",      done:false, note:"Due at 12-month mark — not yet scheduled. Prednisone use affects bone density. Schedule ASAP." },
  { label:"Months 12–18: Labs Every 6 wk", date:"Oct 2025–Apr 2026", done:false, note:"Labs every 6 weeks. Clinic every 3–6 months." },
  { label:"Annual Dermatology Screen",      date:"Due Apr 2026",      done:false, note:"First annual skin cancer screening overdue. Immunosuppression significantly raises risk. Schedule ASAP." },
  { label:"Months 18–24: Labs Every 8 wk", date:"Apr–Oct 2026",      done:false, note:"Labs every 8 weeks. Clinic every 6–12 months." },
  { label:"Year 3+ Monitoring",            date:"Oct 2026+",         done:false, note:"Labs every 12 weeks. Annual transplant clinic visits. Lifelong anti-rejection medicine and monitoring." },
];

const EMERGENCY = [
  {
    level:"911 NOW", color:"#ef4444",
    title:"Life-Threatening — Call 911 Immediately",
    items:["Loss of consciousness","Stopped breathing or severe difficulty breathing","Severe chest pain","Uncontrollable bleeding","Any other life-threatening emergency"],
  },
  {
    level:"CALL NOW", color:"#f59e0b",
    title:"Call Transplant Team Right Away",
    items:[
      "Temperature ≥ 100.4°F (38°C) — do not wait, even at night or weekends",
      "Pulse (heart rate) > 100 beats per minute",
      "BP: top number < 90 or > 200 — OR — bottom number < 50 or > 110",
      "Missed more than one dose of anti-rejection medicine",
      "Vomited medicine immediately after taking it",
      "Urine becomes dark (sign of possible rejection or liver problem)",
      "Stools become lighter in color (possible bile duct problem)",
      "Nausea/vomiting — unable to keep down fluids or medicines",
      "Diarrhea lasting more than 5 bowel movements",
      "General flu-like malaise, fatigue, aches — possible early rejection sign",
      "Sudden weight gain > 5 lbs in one day (kidney fluid retention)",
      "Urine output < 4 cups (1,000 mL) in a day",
      "New or worsening pain anywhere",
      "Incision: separation, swelling, redness, heat, red bleeding, new or unusual fluid",
      "Large cuts — especially from dirty objects or wounds not healing normally",
    ],
  },
  {
    level:"REJECTION SIGNS", color:"#a78bfa",
    title:"Signs That May Indicate Rejection",
    items:[
      "You may have NO symptoms in early rejection — labs are usually the first sign",
      "Dark urine or noticeably lighter stools",
      "Flu-like fatigue, aches, or general sense of not feeling well",
      "Tenderness or swelling over the transplant site",
      "Jaundice (yellow skin or eyes) — liver-specific sign",
      "Missing or skipping anti-rejection doses is the highest single risk factor for rejection",
      "Most likely in the first 3 months — but possible at any time",
      "Get labs on schedule — they detect rejection before symptoms appear",
    ],
  },
  {
    level:"NEVER TAKE", color:"#ef4444",
    title:"Medications & Substances to Avoid",
    items:[
      "NSAIDs (cause kidney damage in transplant patients): Ibuprofen (Advil/Motrin), Naproxen (Aleve), Aspirin >81mg, Excedrin, BC Powder, Goody Powder",
      "Tagamet / Cimetidine — interacts with anti-rejection medicine levels",
      "Any herbal or natural supplement without checking first — many interfere with Tacrolimus",
      "St. John's Wort — drops Tacrolimus levels by 50%+ → acute rejection risk",
      "Echinacea, Cat's Claw, Astragalus — immune stimulants; counteract immunosuppression",
      "Clarithromycin, Erythromycin — spike Tacrolimus dangerously (CYP3A4)",
      "Fluconazole, Voriconazole, Itraconazole — major CYP3A4 inhibitors",
      "Rifampin — strong CYP3A4 inducer; drops Tacrolimus → rejection risk",
      "Potassium supplements or salt substitutes — hyperkalemia risk with Lisinopril + CKD",
      "Alcohol — any type, including non-alcoholic beer (contains trace amounts)",
      "Grapefruit or pomegranate (any form) — alters Tacrolimus unpredictably",
    ],
  },
];

const REFERENCE = [
  {
    title:"Safe OTC Medications",
    color:"#10b981",
    items:[
      "Pain: Tylenol / Acetaminophen Regular Strength (325mg) — MAX 2,000mg/day total",
      "Allergy: Benadryl (diphenhydramine), Claritin (loratadine), Zyrtec (cetirizine), Allegra max 60mg/day",
      "Cold/Cough: Mucinex, Mucinex DM, Robitussin, Robitussin DM, Vicks VapoRub",
      "Decongestant: Sudafed (pseudoephedrine) — max 1 week only; may elevate BP",
      "Constipation: Metamucil, Citrucel, Colace, MiraLax, Dulcolax, Senokot",
      "Diarrhea: Imodium (loperamide) — call if lasts >24 hrs; get stool sample first",
      "Gas: Gas-X (simethicone), Mylicon",
      "Heartburn: Pepcid AC, Zantac, Tums, Maalox, Mylanta, Axid AR — NOTE: take Maalox/Mylanta/Tums at least 2 hrs before or after Mycophenolate",
      "Skin rash: Hydrocortisone cream/ointment, Caladryl",
      "Skin burn/infection: Neosporin, Polysporin, Triple Antibiotic",
      "Fungal skin: Lotrimin AF, Micatin, Tinactin",
      "Sleep: Benadryl, Doxylamine",
      "Dizziness/motion sickness: Antivert (meclizine), Dramamine",
      "Eye dryness: Artificial tears, Murine",
      "Nasal dryness: Ocean Mist, saline spray",
    ],
  },
  {
    title:"Unsafe OTC — Call Before Using",
    color:"#ef4444",
    items:[
      "ALL NSAIDs — cause kidney damage in transplant patients:",
      "  • Ibuprofen (Advil, Motrin)",
      "  • Naproxen (Aleve)",
      "  • Aspirin > 81mg per day",
      "  • Excedrin (contains aspirin)",
      "  • BC Powder, Goody Powder (contain aspirin + NSAIDs)",
      "Tagamet / Cimetidine — affects anti-rejection medicine levels",
      "Any herbal or natural product — always verify first",
      "St. John's Wort — drops Tacrolimus 50%+ → rejection",
      "Echinacea, Cat's Claw, Astragalus — immune stimulants",
      "Potassium supplements or potassium-containing salt substitutes",
    ],
  },
  {
    title:"Food & Drink — Always Avoid",
    color:"#ef4444",
    items:[
      "Grapefruit (any form — juice, fruit, supplements) — alters Tacrolimus levels unpredictably",
      "Pomegranate (juice or fruit) — same CYP3A4 interaction as grapefruit",
      "Pomelo, Seville oranges, marmalade — same family as grapefruit",
      "Alcohol — any type; even non-alcoholic beer contains trace amounts; liver damage risk",
      "Raw or undercooked meat, poultry, fish, shellfish, eggs",
      "Unpasteurized milk, soft cheeses (brie, camembert, blue cheese)",
      "Unpasteurized juice or cider",
      "Raw sprouts (alfalfa, bean sprouts) — bacterial contamination risk",
      "Deli/luncheon meats unless heated to steaming",
      "Food that is spoiled, moldy, or past its use-by date",
    ],
  },
  {
    title:"Food — Eat with Caution",
    color:"#f59e0b",
    items:[
      "High-potassium foods (watch with Lisinopril + CKD): bananas, oranges, potatoes, tomatoes, spinach, avocado, prunes, nuts, bran, dried fruit, milk, chocolate",
      "High-phosphorus foods: dairy, nuts, cola drinks — CKD phosphorus management",
      "Salt / sodium — target < 2g/day for BP and fluid control",
      "High-sugar / high-carb foods — PTDM risk from Tacrolimus + Prednisone",
      "Buffets and salad bars — use caution with food handling practices",
      "Well water — prefer boiled or bottled for drinking; showering is fine",
    ],
  },
  {
    title:"Infection Prevention Rules",
    color:"#a78bfa",
    items:[
      "Hand washing is the most important habit — 20 seconds, every time, especially before eating",
      "Wear sunscreen SPF 30+ daily — anti-rejection meds significantly raise skin cancer risk",
      "Wear shoes always, especially outdoors — protect from cuts and soil contact",
      "Avoid construction sites, excavation, and dusty areas — aspergillus fungal risk (can be fatal)",
      "Avoid sick contacts; mask during respiratory illness seasons",
      "Wear gloves for gardening, yardwork, and pet cleanup",
      "Clean any cut immediately — soap + water + antibiotic ointment + keep covered",
      "Let someone else clean pet litter boxes, aquariums, birdcages — or wear gloves",
      "Avoid large crowds in enclosed spaces within first 6 months or after rejection treatment",
      "Avoid close contact with measles, chickenpox, or shingles cases",
      "Dental visits every 6 months — let dentist know you are a transplant patient each visit",
      "Any fever ≥ 100.4°F: call transplant team right away, even on weekends",
    ],
  },
  {
    title:"Anti-Rejection Medicine Rules",
    color:"#4f8ef7",
    items:[
      "Never miss a dose — even one missed dose raises rejection risk",
      "Never change doses on your own — only transplant team adjusts",
      "Take Tacrolimus AFTER labs are drawn on lab days — never before",
      "Take anti-rejection medicines at the same time each day, with food",
      "If you miss a dose: take it as soon as you remember (before 2pm that day)",
      "If near time for next dose: skip the missed dose — never double up",
      "If you miss a full day of medicine: call transplant team right away",
      "If you vomit medicine right after taking it: call transplant team right away",
      "Night before labs: take Tacrolimus between 7–8 PM, fast after midnight (water okay)",
      "Get labs at 8–9 AM on lab days — even if slip shows different time",
      "Always keep at least 7–10 days of supply; refill and renew early",
      "Alert transplant team before starting any new antibiotic or medicine from another doctor",
    ],
  },
];

function SL({ children, mb = 12, style = {} }) {
  return <div style={{ fontSize:9, letterSpacing:"1.5px", textTransform:"uppercase", color:"#a0b4c8", fontFamily:mono, marginBottom:mb, ...style }}>{children}</div>;
}

function TypeBadge({ type }) {
  const map = { appointment:["#4f8ef7","Appt"], lab:["#10b981","Lab"], imaging:["#a78bfa","Imaging"], other:["#b0c4d8","Other"] };
  const [c, l] = map[type] || ["#4f8ef7","Appt"];
  return <span style={{ fontSize:9, fontFamily:mono, background:`${c}18`, color:c, border:`1px solid ${c}28`, padding:"2px 7px", borderRadius:4, letterSpacing:"0.5px", textTransform:"uppercase", flexShrink:0 }}>{l}</span>;
}

const STATUS_META = {
  "on-track":{ color:"#10b981", label:"On Track" },
  "watch":   { color:"#f59e0b", label:"Watch" },
  "due":     { color:"#ef4444", label:"Due" },
  "never":   { color:"#ef4444", label:"Never" },
  "current": { color:"#10b981", label:"Current" },
};

function Timeline() {
  const [appts, setAppts] = useState(APPTS_INIT);
  const [done, setDone] = useState({});
  const [editingPrep, setEditingPrep] = useState(null);
  const [editVal, setEditVal] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newAppt, setNewAppt] = useState({ title:"", doctor:"", facility:"", date:"", time:"", type:"appointment", urgency:"low" });

  const toggleDone = (id) => setDone(d => ({ ...d, [id]: !d[id] }));
  const startEditPrep = (apptId, idx, val) => { setEditingPrep(`${apptId}-${idx}`); setEditVal(val); };
  const savePrep = (apptId, idx) => {
    setAppts(prev => prev.map(a => a.id !== apptId ? a : { ...a, prep: a.prep.map((p,i) => i === idx ? editVal : p) }));
    setEditingPrep(null);
  };
  const addPrepLine = (apptId) => setAppts(prev => prev.map(a => a.id !== apptId ? a : { ...a, prep: [...a.prep, ""] }));
  const removePrep = (apptId, idx) => setAppts(prev => prev.map(a => a.id !== apptId ? a : { ...a, prep: a.prep.filter((_,i) => i !== idx) }));
  const addAppt = () => {
    if (!newAppt.title) return;
    setAppts(prev => [...prev, { ...newAppt, id: Date.now(), prep:[] }]);
    setNewAppt({ title:"", doctor:"", facility:"", date:"", time:"", type:"appointment", urgency:"low" });
    setShowAdd(false);
  };

  return (
    <div style={{ padding:"24px 28px", overflowY:"auto", height:"100%", position:"relative" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
        <SL mb={0}>Upcoming Appointments & Events</SL>
        <button className="add-badge-btn" onClick={() => setShowAdd(true)}>+ Add Event</button>
      </div>
      {appts.map((a, i) => {
        const c = { appointment:"#4f8ef7", lab:"#10b981", imaging:"#a78bfa", other:"#b0c4d8" }[a.type];
        const isDone = !!done[a.id];
        return (
          <div key={a.id} style={{ display:"flex", gap:14, marginBottom:14 }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", width:20, flexShrink:0 }}>
              <div onClick={() => toggleDone(a.id)} style={{ width:14, height:14, borderRadius:"50%", border:`2px solid ${isDone ? "#10b981" : c}`, background: isDone ? "#10b981" : "transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, color:"#fff", transition:"all .15s", flexShrink:0 }}>
                {isDone ? "✓" : ""}
              </div>
              {i < appts.length - 1 && <div style={{ flex:1, width:1, background:"#0d1a28", marginTop:4 }} />}
            </div>
            <div style={{ flex:1, background:"#0b1220", border:"1px solid #111e30", borderRadius:12, padding:"13px 16px", opacity: isDone ? 0.45 : 1, transition:"opacity .2s" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:7, gap:8 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <TypeBadge type={a.type} />
                  {a.urgency === "high" && <span style={{ width:6, height:6, borderRadius:"50%", background:"#ef4444", boxShadow:"0 0 6px #ef4444", display:"inline-block" }} />}
                </div>
                <span style={{ fontSize:10, color: a.urgency === "high" ? "#ef4444" : "#98afc4", fontFamily:mono, fontWeight: a.urgency === "high" ? 600 : 400 }}>{a.date}{a.time && a.time !== "TBD" ? ` · ${a.time}` : ""}</span>
              </div>
              <div style={{ fontSize:13, fontWeight:600, color:"#c4d8ee", marginBottom:3 }}>{a.title}</div>
              <div style={{ fontSize:11, color:"#98afc4", fontFamily:mono, marginBottom: a.prep.length ? 10 : 0 }}>{a.doctor}{a.facility ? ` · ${a.facility}` : ""}</div>
              {a.prep.length > 0 && (
                <div style={{ borderTop:"1px solid #0d1a28", paddingTop:8 }}>
                  <SL mb={6}>Prep Notes</SL>
                  {a.prep.map((p, j) => (
                    <div key={j} style={{ display:"flex", gap:6, alignItems:"center", marginBottom:4 }}>
                      <span style={{ color:"#a0b4c8", fontSize:10, flexShrink:0 }}>▸</span>
                      {editingPrep === `${a.id}-${j}` ? (
                        <input value={editVal} onChange={e => setEditVal(e.target.value)} onBlur={() => savePrep(a.id, j)} onKeyDown={e => e.key === "Enter" && savePrep(a.id, j)} autoFocus style={{ flex:1, background:"#07090f", border:"1px solid #1a2f4a", color:"#c4d8ee", borderRadius:6, padding:"3px 8px", fontFamily:mono, fontSize:11, outline:"none" }} />
                      ) : (
                        <span onClick={() => startEditPrep(a.id, j, p)} style={{ flex:1, fontSize:11, color:"#b0c4d8", fontFamily:mono, cursor:"text" }}>{p || <span style={{ color:"#a0b4c8" }}>Click to edit…</span>}</span>
                      )}
                      <span onClick={() => removePrep(a.id, j)} style={{ fontSize:10, color:"#a0b4c8", cursor:"pointer", paddingLeft:4 }}>✕</span>
                    </div>
                  ))}
                  <button onClick={() => addPrepLine(a.id)} style={{ marginTop:4, fontSize:10, color:"#a0b4c8", fontFamily:mono, background:"transparent", border:"none", cursor:"pointer", padding:0 }}>+ add note</button>
                </div>
              )}
              {a.prep.length === 0 && (
                <button onClick={() => addPrepLine(a.id)} style={{ fontSize:10, color:"#a0b4c8", fontFamily:mono, background:"transparent", border:"none", cursor:"pointer", padding:0, marginTop:4 }}>+ add prep note</button>
              )}
            </div>
          </div>
        );
      })}

      {showAdd && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50 }} onClick={() => setShowAdd(false)}>
          <div style={{ background:"#0b1220", border:"1px solid #1a2f4a", borderRadius:16, padding:26, width:400 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily:serif, fontSize:19, color:"#dde8f5", marginBottom:18 }}>Add Event</div>
            {[["Title","title","e.g. Cardiology Visit"],["Doctor","doctor","e.g. Dr. Smith"],["Facility","facility","e.g. Baptist Medical"],["Date","date","e.g. Apr 10, 2026"],["Time","time","e.g. 9:00 AM"]].map(([label,key,ph]) => (
              <div key={key} style={{ marginBottom:12 }}>
                <SL mb={5}>{label}</SL>
                <input className="modal-input" placeholder={ph} value={newAppt[key]} onChange={e => setNewAppt(n => ({...n,[key]:e.target.value}))} />
              </div>
            ))}
            <div style={{ marginBottom:14 }}>
              <SL mb={6}>Type</SL>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {["appointment","lab","imaging","other"].map(t => (
                  <button key={t} className={`filter-chip${newAppt.type===t?" active":""}`} onClick={() => setNewAppt(n => ({...n,type:t}))}>{t}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom:18 }}>
              <SL mb={6}>Urgency</SL>
              <div style={{ display:"flex", gap:6 }}>
                {["low","med","high"].map(u => (
                  <button key={u} className={`filter-chip${newAppt.urgency===u?" active":""}`} onClick={() => setNewAppt(n => ({...n,urgency:u}))}>{u}</button>
                ))}
              </div>
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button onClick={() => setShowAdd(false)} style={{ padding:"7px 16px", background:"transparent", border:"1px solid #111e30", borderRadius:8, color:"#b0c4d8", fontFamily:sora, fontSize:12, cursor:"pointer" }}>Cancel</button>
              <button onClick={addAppt} style={{ padding:"7px 16px", background:"rgba(79,142,247,.12)", border:"1px solid rgba(79,142,247,.35)", borderRadius:8, color:"#4f8ef7", fontFamily:sora, fontSize:12, cursor:"pointer" }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Goals() {
  return (
    <div style={{ padding:"24px 28px", overflowY:"auto", height:"100%" }}>
      <SL>Health Goals & Targets</SL>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        {GOALS.map(g => {
          const sm = STATUS_META[g.status] || STATUS_META["watch"];
          return (
            <div key={g.id} style={{ background:"#0b1220", border:"1px solid #111e30", borderRadius:12, padding:"14px 16px" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ fontSize:9, fontFamily:mono, color:g.color, background:`${g.color}15`, border:`1px solid ${g.color}28`, padding:"2px 7px", borderRadius:4, textTransform:"uppercase", letterSpacing:"0.5px" }}>{g.category}</span>
                <span style={{ fontSize:9, fontFamily:mono, color:sm.color, display:"flex", alignItems:"center", gap:4 }}>
                  <span style={{ width:5, height:5, borderRadius:"50%", background:sm.color, display:"inline-block" }} />{sm.label}
                </span>
              </div>
              <div style={{ fontSize:13, fontWeight:600, color:"#c4d8ee", marginBottom:5, lineHeight:1.3 }}>{g.label}</div>
              <div style={{ fontSize:11, color:"#98afc4", fontFamily:mono, lineHeight:1.5 }}>{g.note}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CareTeam() {
  return (
    <div style={{ padding:"24px 28px", overflowY:"auto", height:"100%" }}>
      <SL>Care Team</SL>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {TEAM.map(t => (
          <div key={t.name} style={{ background:"#0b1220", border:"1px solid #111e30", borderRadius:12, padding:"14px 18px", display:"flex", alignItems:"center", gap:16 }}>
            <div style={{ width:40, height:40, borderRadius:"50%", background:`${t.color}18`, border:`1px solid ${t.color}28`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:t.color, flexShrink:0 }}>
              {t.name.split(" ").filter(w => w.match(/^[A-Z]/)).slice(0,2).map(w=>w[0]).join("")}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:600, color:"#c4d8ee", marginBottom:2 }}>{t.name}</div>
              <div style={{ fontSize:11, color:"#b0c4d8" }}>{t.role}</div>
              <div style={{ fontSize:10, color:"#98afc4", fontFamily:mono, marginTop:2 }}>{t.facility}</div>
            </div>
            <div style={{ textAlign:"right", flexShrink:0 }}>
              <div style={{ fontSize:11, color:"#98afc4", fontFamily:mono, marginBottom:4 }}>{t.phone}</div>
              <div style={{ fontSize:10, color:"#a0b4c8", fontFamily:mono }}>Next: {t.next}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Preventive() {
  const vaccines = PREVENTIVE.filter(p => p.category === "Vaccine");
  const screenings = PREVENTIVE.filter(p => p.category === "Screening");
  const renderItem = (p) => {
    const sm = STATUS_META[p.status] || STATUS_META["watch"];
    return (
      <div key={p.label} style={{ background:"#0b1220", border:"1px solid #111e30", borderRadius:10, padding:"12px 14px", marginBottom:8, display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:600, color: p.status === "never" ? "#ef4444" : "#c4d8ee", marginBottom:4 }}>{p.label}</div>
          <div style={{ fontSize:11, color:"#98afc4", fontFamily:mono, lineHeight:1.5 }}>{p.note}</div>
        </div>
        <span style={{ fontSize:9, fontFamily:mono, color:sm.color, background:`${sm.color}15`, border:`1px solid ${sm.color}28`, padding:"2px 8px", borderRadius:4, textTransform:"uppercase", letterSpacing:"0.5px", flexShrink:0, marginTop:2 }}>{sm.label}</span>
      </div>
    );
  };
  return (
    <div style={{ padding:"24px 28px", overflowY:"auto", height:"100%" }}>
      <SL>Vaccines</SL>
      {vaccines.map(renderItem)}
      <SL style={{ marginTop:20 }}>Screenings & Check-ups</SL>
      {screenings.map(renderItem)}
    </div>
  );
}

function Emergency() {
  return (
    <div style={{ padding:"24px 28px", overflowY:"auto", height:"100%" }}>
      <SL>Emergency Protocols — Sourced from Transplant Booklet</SL>
      {EMERGENCY.map(sec => (
        <div key={sec.level} style={{ background:"#0b1220", border:`1px solid ${sec.color}28`, borderLeft:`3px solid ${sec.color}`, borderRadius:12, padding:"16px 18px", marginBottom:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
            <span style={{ fontSize:9, fontFamily:mono, background:`${sec.color}18`, color:sec.color, border:`1px solid ${sec.color}30`, padding:"3px 9px", borderRadius:4, letterSpacing:"1px", textTransform:"uppercase", fontWeight:600 }}>{sec.level}</span>
            <span style={{ fontSize:13, fontWeight:600, color:"#c4d8ee" }}>{sec.title}</span>
          </div>
          {sec.items.map((item, i) => (
            <div key={i} style={{ display:"flex", gap:8, fontSize:12, color:"#7eb8d8", fontFamily:mono, marginBottom:5, alignItems:"flex-start", lineHeight:1.55 }}>
              <span style={{ color:sec.color, flexShrink:0, marginTop:1 }}>▸</span>{item}
            </div>
          ))}
        </div>
      ))}
      <div style={{ background:"#0b1220", border:"1px solid #111e30", borderRadius:10, padding:"14px 16px" }}>
        <SL mb={8}>After-Hours Contact Protocol</SL>
        <div style={{ fontSize:12, color:"#7eb8d8", fontFamily:mono, lineHeight:1.8 }}>
          <div>Business hours (Mon–Fri 8am–5pm): Call transplant team directly</div>
          <div>After hours / weekends / holidays: Call transplant on-call nurse service</div>
          <div style={{ marginTop:6, color:"#ef4444" }}>Life-threatening emergency: Call 911 immediately</div>
        </div>
      </div>
    </div>
  );
}

function Milestones() {
  return (
    <div style={{ padding:"24px 28px", overflowY:"auto", height:"100%" }}>
      <SL>Post-Transplant Milestones</SL>
      {MILESTONES.map((m, i) => (
        <div key={m.label} style={{ display:"flex", gap:14, marginBottom:14 }}>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", width:20, flexShrink:0 }}>
            <div style={{ width:14, height:14, borderRadius:"50%", border:`2px solid ${m.done ? "#10b981" : "#98afc4"}`, background: m.done ? "#10b981" : "transparent", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, color:"#fff", flexShrink:0 }}>
              {m.done ? "✓" : ""}
            </div>
            {i < MILESTONES.length - 1 && <div style={{ flex:1, width:1, background:"#0d1a28", marginTop:4 }} />}
          </div>
          <div style={{ flex:1, background:"#0b1220", border:"1px solid #111e30", borderRadius:12, padding:"12px 16px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:5, gap:8 }}>
              <div style={{ fontSize:13, fontWeight:600, color: m.done ? "#b0c4d8" : "#c4d8ee" }}>{m.label}</div>
              <span style={{ fontSize:10, color: m.done ? "#a0b4c8" : "#f59e0b", fontFamily:mono, flexShrink:0 }}>{m.date}</span>
            </div>
            <div style={{ fontSize:11, color:"#98afc4", fontFamily:mono, lineHeight:1.5 }}>{m.note}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Reference() {
  const [open, setOpen] = useState(null);
  return (
    <div style={{ padding:"24px 28px", overflowY:"auto", height:"100%" }}>
      <SL>Illness & Safety Reference — From Transplant Booklet</SL>
      {REFERENCE.map(sec => (
        <div key={sec.title} style={{ marginBottom:10 }}>
          <div onClick={() => setOpen(o => o === sec.title ? null : sec.title)} style={{ background:"#0b1220", border:`1px solid ${open === sec.title ? sec.color + "40" : "#111e30"}`, borderLeft:`3px solid ${sec.color}`, borderRadius: open === sec.title ? "12px 12px 0 0" : 12, padding:"12px 16px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ fontSize:13, fontWeight:600, color:"#c4d8ee" }}>{sec.title}</div>
            <span style={{ fontSize:11, color:"#b0c4d8" }}>{open === sec.title ? "▲" : "▼"}</span>
          </div>
          {open === sec.title && (
            <div style={{ background:"#0b1220", border:`1px solid ${sec.color}28`, borderLeft:`3px solid ${sec.color}`, borderTop:"none", borderRadius:"0 0 12px 12px", padding:"12px 16px 14px" }}>
              {sec.items.map((item, i) => (
                <div key={i} style={{ display:"flex", gap:8, fontSize:11.5, color: item.startsWith("  •") ? "#98afc4" : "#7eb8d8", fontFamily:mono, marginBottom:5, alignItems:"flex-start", lineHeight:1.6 }}>
                  {!item.startsWith("  •") && <span style={{ color:sec.color, flexShrink:0, marginTop:1 }}>▸</span>}
                  {item.startsWith("  •") && <span style={{ width:16, flexShrink:0 }} />}
                  <span>{item.replace(/^  •\s*/,"")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function CarePlan() {
  const [tab, setTab] = useState("Timeline");
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", background:"#07090f", fontFamily:sora, color:"#d4e2f0", overflow:"hidden", position:"relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:#1a2840;border-radius:4px;}
        .tab-btn{padding:5px 13px;border-radius:20px;font-size:11px;border:1px solid transparent;background:transparent;color:#b0c4d8;cursor:pointer;transition:all .15s;font-family:'DM Mono',monospace;white-space:nowrap;}
        .tab-btn:hover{color:#7eb8d8;}
        .tab-btn.active{color:#4f8ef7;border-color:#4f8ef7;background:rgba(79,142,247,.08);}
        .filter-chip{padding:5px 13px;border-radius:20px;font-size:11px;border:1px solid #111e30;background:#0b1220;color:#b0c4d8;cursor:pointer;transition:all .15s;font-family:'DM Mono',monospace;white-space:nowrap;}
        .filter-chip:hover{color:#7eb8d8;border-color:#1a2f4a;}
        .filter-chip.active{color:#4f8ef7;border-color:#4f8ef7;background:rgba(79,142,247,.08);}
        .add-badge-btn{display:inline-flex;align-items:center;gap:5px;padding:4px 11px;background:rgba(79,142,247,.08);border:1px solid rgba(79,142,247,.25);border-radius:12px;color:#4f8ef7;font-size:11px;font-family:'DM Mono',monospace;cursor:pointer;transition:all .15s;}
        .add-badge-btn:hover{background:rgba(79,142,247,.16);border-color:rgba(79,142,247,.45);}
        .modal-input{width:100%;background:#07090f;border:1px solid #111e30;color:#c4d8ee;padding:8px 12px;border-radius:8px;font-family:'Sora',sans-serif;font-size:12px;outline:none;transition:border-color .15s;}
        .modal-input::placeholder{color:#a0b4c8;}
        .modal-input:focus{border-color:#1a2f4a;}
      `}</style>

      <div style={{ height:54, background:"#080c14", borderBottom:"1px solid #0d1a28", display:"flex", alignItems:"center", padding:"0 24px", gap:12, flexShrink:0 }}>
        <img src={INTELLITRAX_LOGO} alt="IntelliTrax" style={{ width: 185, height: 65, objectFit: "contain" }} />
        <div style={{ fontFamily:serif, fontSize:20, color:"#dde8f5", fontWeight:400, letterSpacing:"-0.3px" }}>Care Plan</div>
        <div style={{ flex:1 }} />
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {TABS.map(t => <button key={t} className={`tab-btn${tab===t?" active":""}`} onClick={() => setTab(t)}>{t}</button>)}
        </div>
        <div style={{ fontSize:10, color:"#98afc4", fontFamily:mono, background:"#0b1220", border:"1px solid #111e30", padding:"5px 12px", borderRadius:6, flexShrink:0 }}>
          {APPTS_INIT.length} events · {GOALS.length} goals
        </div>
      </div>

      <div style={{ flex:1, overflow:"hidden" }}>
        {tab === "Timeline"   && <Timeline />}
        {tab === "Goals"      && <Goals />}
        {tab === "Care Team"  && <CareTeam />}
        {tab === "Preventive" && <Preventive />}
        {tab === "Emergency"  && <Emergency />}
        {tab === "Milestones" && <Milestones />}
        {tab === "Reference"  && <Reference />}
      </div>
    </div>
  );
}
