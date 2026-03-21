import { useState } from "react";

const T = {
  bg:"#07090f", sidebar:"#080c14", card:"#0b1220",
  border:"#0d1a28", borderHover:"#111e30", borderActive:"#1a2f4a",
  p:"#dde8f5", s:"#c4d8ee", m:"#7eb8d8",
  dim:"#3d5a7a", ghost:"#2d4d6a", faint:"#1e3550",
  blue:"#4f8ef7", purple:"#a78bfa", green:"#10b981",
  yellow:"#f59e0b", red:"#ef4444",
};

function CardHeader({ title, editing, onEdit, onSave, onCancel }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
      <span style={{ fontSize:10, letterSpacing:"1.5px", textTransform:"uppercase", color:T.faint, fontFamily:"'DM Mono',monospace" }}>{title}</span>
      {editing
        ? <div style={{ display:"flex", gap:6 }}>
            <button onClick={onCancel} style={{ background:"transparent", border:"1px solid #111e30", borderRadius:7, color:T.dim, fontFamily:"'Sora',sans-serif", fontSize:11, padding:"4px 11px", cursor:"pointer" }}>Cancel</button>
            <button onClick={onSave} style={{ background:"rgba(79,142,247,.15)", border:"1px solid rgba(79,142,247,.4)", borderRadius:7, color:T.blue, fontFamily:"'Sora',sans-serif", fontSize:11, padding:"4px 11px", cursor:"pointer" }}>Save</button>
          </div>
        : <button onClick={onEdit} style={{ background:"transparent", border:"1px solid #1a2f4a", borderRadius:7, color:T.dim, fontFamily:"'Sora',sans-serif", fontSize:11, padding:"4px 11px", cursor:"pointer" }}>Edit</button>
      }
    </div>
  );
}

function FieldRow({ label, value, editing, field, vals, setVals }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"130px 1fr", gap:"4px 12px", padding:"7px 0", borderBottom:"1px solid #0d1a28", alignItems:"start" }}>
      <span style={{ fontSize:10, fontFamily:"'DM Mono',monospace", color:T.ghost, textTransform:"uppercase", letterSpacing:".8px", paddingTop:2 }}>{label}</span>
      {editing
        ? <input
            value={vals[field] ?? value}
            onChange={e => setVals(p => ({ ...p, [field]: e.target.value }))}
            style={{ width:"100%", background:"#07090f", border:"1px solid #1a2f4a", borderRadius:6, color:T.s, fontFamily:"'Sora',sans-serif", fontSize:12, padding:"5px 8px", outline:"none" }}
          />
        : <span style={{ fontSize:13, color:T.s, lineHeight:1.45 }}>{value}</span>
      }
    </div>
  );
}

export default function ProfileTab() {
  const [ed, setEd] = useState({});
  const [vals, setVals] = useState({});
  const [showAllDoctors, setShowAllDoctors] = useState(false);
  const startEdit = k => setEd(p => ({ ...p, [k]: true }));
  const cancel = k => setEd(p => ({ ...p, [k]: false }));
  const save = k => setEd(p => ({ ...p, [k]: false }));

  const card = { background:T.card, border:`1px solid ${T.borderHover}`, borderRadius:14, padding:20 };

  return (
    <div style={{ display:"flex", height:"100vh", background:T.bg, color:"#d4e2f0", fontFamily:"'Sora',sans-serif", flexDirection:"column", overflow:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-thumb { background:#1a2840; border-radius:4px; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        input:focus { border-color:#4f8ef7 !important; }
      `}</style>

      {/* Topbar */}
      <div style={{ height:54, background:T.sidebar, borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", padding:"0 28px", gap:16, flexShrink:0 }}>

        <div style={{ flex:1 }} />
        <div style={{ width:32, height:32, background:"linear-gradient(135deg,#4f8ef7,#a78bfa)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700 }}>G</div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex:1, overflowY:"auto", padding:"28px" }}>
        <div style={{ marginBottom:24 }}>
          <h1 style={{ fontFamily:"'DM Serif Display',serif", fontSize:28, color:T.p, fontWeight:400, letterSpacing:"-0.5px" }}>Patient Profile</h1>
          <p style={{ fontSize:12, color:T.ghost, marginTop:5, fontFamily:"'DM Mono',monospace" }}>Greg Butler · Transplant · Immunosuppressed · Last updated Mar 12, 2026</p>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>

          {/* Personal & Demographics */}
          <div style={card}>
            <CardHeader title="Personal & Demographics" editing={ed.personal} onEdit={() => startEdit("personal")} onSave={() => save("personal")} onCancel={() => cancel("personal")} />
            {[
              ["Full Name","Greg Butler","name"],["Date of Birth","July 14, 1983","dob"],
              ["Age","42","age"],["Sex","Male","sex"],["Blood Type","A+","blood"],
              ["Height","5′ 11″","height"],["Weight","184 lbs","weight"],
              ["Phone","(601) 555-0142","phone"],["Email","greg@example.com","email"],
              ["Address","Laurel, MS 39440","address"],
            ].map(([label, value, field]) => (
              <FieldRow key={field} label={label} value={value} editing={ed.personal} field={`per_${field}`} vals={vals} setVals={setVals} />
            ))}
          </div>

          {/* Insurance */}
          <div style={card}>
            <CardHeader title="Insurance / Coverage" editing={ed.ins} onEdit={() => startEdit("ins")} onSave={() => save("ins")} onCancel={() => cancel("ins")} />
            {[
              ["Primary Insurer","BlueCross BlueShield MS","ins1"],["Plan","PPO Gold","plan1"],
              ["Member ID","XBM-4471-9830","mid1"],["Group #","GRP-002214","grp1"],
              ["Secondary Insurer","Medicare Part B","ins2"],["Member ID","1EG4-TE5-MK72","mid2"],
              ["Copay (Specialist)","$45","copay"],["Deductible (YTD)","$640 / $1,500","ded"],
              ["Out-of-Pocket Max","$4,000","oop"],
            ].map(([label, value, field]) => (
              <FieldRow key={field} label={label} value={value} editing={ed.ins} field={`ins_${field}`} vals={vals} setVals={setVals} />
            ))}
          </div>

          {/* Care Team — full width */}
          <div style={{ ...card, gridColumn:"1/-1" }}>
            <CardHeader title="Care Team" editing={ed.team} onEdit={() => startEdit("team")} onSave={() => save("team")} onCancel={() => cancel("team")} />
            {(() => {
              const allDoctors = [
                { init:"JH", name:"Dr. Jonathan Hand, MD", role:"Primary Care Physician", phone:"(601) 555-0190", org:"Hand Family Medicine", pcp:true },
                { init:"AC", name:"Dr. Ari Cohen, MD", role:"Nephrologist", phone:"(601) 555-0218", org:"Mississippi Kidney Center" },
                { init:"SR", name:"Dr. Susan Reyes, MD", role:"Transplant Surgeon", phone:"(601) 555-0355", org:"UMMC Transplant Program" },
                { init:"TW", name:"Dr. Thomas Walsh, PharmD", role:"Clinical Pharmacist", phone:"(601) 555-0404", org:"CVS Specialty Pharmacy" },
                { init:"LM", name:"Dr. Lisa Monroe, MD", role:"Endocrinologist", phone:"(601) 555-0277", org:"Mississippi Endocrine Associates" },
                { init:"BN", name:"Dr. Brian Norris, MD", role:"Cardiologist", phone:"(601) 555-0311", org:"Heart & Vascular Clinic" },
                { init:"RP", name:"Dr. Rachel Park, MD", role:"Ophthalmologist", phone:"(601) 555-0388", org:"Vision Associates of MS" },
                { init:"DM", name:"Dr. David Mills, MD", role:"Dermatologist", phone:"(601) 555-0422", org:"Dermatology & Skin Care" },
                { init:"KF", name:"Dr. Karen Foster, DPM", role:"Podiatrist", phone:"(601) 555-0455", org:"Foot & Ankle Specialists" },
              ];
              const visible = showAllDoctors ? allDoctors : allDoctors.slice(0, 6);
              const hidden = allDoctors.length - 6;
              return (
                <>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 32px" }}>
                    {visible.map((doc, i) => {
                      const isLast = i === visible.length - 1;
                      const isSecondLast = i === visible.length - 2;
                      const evenCount = visible.length % 2 === 0;
                      const noBorder = isLast || (evenCount && isSecondLast);
                      return (
                        <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"10px 0", borderBottom: noBorder ? "none" : "1px solid #0d1a28" }}>
                          <div style={{ width:36, height:36, borderRadius:"50%", background: doc.pcp ? "linear-gradient(135deg,rgba(79,142,247,.3),rgba(167,139,250,.2))" : "linear-gradient(135deg,rgba(79,142,247,.12),rgba(167,139,250,.08))", border:`1px solid ${doc.pcp ? "rgba(79,142,247,.4)" : "rgba(79,142,247,.2)"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:600, color:T.blue, flexShrink:0 }}>
                            {doc.init}
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                              <span style={{ fontSize:13, fontWeight:600, color:T.s }}>{doc.name}</span>
                              {doc.pcp && <span style={{ fontSize:9, background:"rgba(79,142,247,.12)", color:T.blue, border:"1px solid rgba(79,142,247,.25)", borderRadius:10, padding:"1px 7px", fontFamily:"'DM Mono',monospace" }}>PCP</span>}
                            </div>
                            <div style={{ fontSize:11, color:T.m, marginTop:2 }}>{doc.role}</div>
                            <div style={{ fontSize:10, color:T.ghost, fontFamily:"'DM Mono',monospace", marginTop:1 }}>{doc.org}</div>
                            <div style={{ fontSize:11, color:T.blue, fontFamily:"'DM Mono',monospace", marginTop:3 }}>{doc.phone}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {!showAllDoctors && hidden > 0 && (
                    <div
                      onClick={() => setShowAllDoctors(true)}
                      style={{ marginTop:12, paddingTop:12, borderTop:"1px solid #0d1a28", fontSize:12, color:T.blue, fontFamily:"'DM Mono',monospace", cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}
                    >
                      <span>Show {hidden} more provider{hidden !== 1 ? "s" : ""}</span>
                      <span style={{ fontSize:10 }}>↓</span>
                    </div>
                  )}
                  {showAllDoctors && (
                    <div
                      onClick={() => setShowAllDoctors(false)}
                      style={{ marginTop:12, paddingTop:12, borderTop:"1px solid #0d1a28", fontSize:12, color:T.dim, fontFamily:"'DM Mono',monospace", cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}
                    >
                      <span>Show fewer</span>
                      <span style={{ fontSize:10 }}>↑</span>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Medical Conditions */}
          <div style={card}>
            <CardHeader title="Medical Conditions / Diagnoses" editing={ed.cond} onEdit={() => startEdit("cond")} onSave={() => save("cond")} onCancel={() => cancel("cond")} />
            {[
              { name:"Kidney Transplant (Left)", since:"2019", status:"active", color:T.red },
              { name:"Chronic Kidney Disease — Stage 3b", since:"2017", status:"active", color:T.red },
              { name:"Hypertension", since:"2015", status:"managed", color:T.yellow },
              { name:"Type 2 Diabetes", since:"2020", status:"managed", color:T.yellow },
              { name:"Hyperlipidemia", since:"2018", status:"managed", color:T.yellow },
              { name:"Anemia (mild)", since:"2021", status:"monitoring", color:T.blue },
            ].map((c, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid #0d1a28" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:6, height:6, borderRadius:"50%", background:c.color, boxShadow:`0 0 6px ${c.color}80`, flexShrink:0 }} />
                  <span style={{ fontSize:12, color:T.s }}>{c.name}</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                  <span style={{ fontSize:10, color:T.ghost, fontFamily:"'DM Mono',monospace" }}>since {c.since}</span>
                  <span style={{ display:"inline-block", padding:"1px 8px", borderRadius:10, fontSize:9, fontFamily:"'DM Mono',monospace", background:`${c.color}18`, color:c.color, border:`1px solid ${c.color}35` }}>{c.status}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Allergies */}
          <div style={card}>
            <CardHeader title="Allergies" editing={ed.allergy} onEdit={() => startEdit("allergy")} onSave={() => save("allergy")} onCancel={() => cancel("allergy")} />
            <div>
              {[
                { name:"Penicillin", reaction:"Anaphylaxis", severity:"Severe", color:T.red },
                { name:"Sulfa Drugs", reaction:"Rash / Hives", severity:"Moderate", color:T.yellow },
                { name:"NSAIDs (Ibuprofen)", reaction:"Reduced kidney function", severity:"Moderate", color:T.yellow },
                { name:"Latex", reaction:"Contact dermatitis", severity:"Mild", color:T.green },
                { name:"Shellfish", reaction:"Hives, lip swelling", severity:"Moderate", color:T.yellow },
              ].map((a, i) => (
                <div key={i} style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(239,68,68,.07)", border:"1px solid rgba(239,68,68,.18)", borderRadius:8, padding:"6px 10px", margin:"4px 4px 4px 0" }}>
                  <div style={{ width:5, height:5, borderRadius:"50%", background:a.color, flexShrink:0 }} />
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color:"#f87171", lineHeight:1.2 }}>{a.name}</div>
                    <div style={{ fontSize:10, color:T.m, fontFamily:"'DM Mono',monospace" }}>{a.reaction} · {a.severity}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Emergency Contacts */}
          <div style={card}>
            <CardHeader title="Emergency Contacts" editing={ed.ec} onEdit={() => startEdit("ec")} onSave={() => save("ec")} onCancel={() => cancel("ec")} />
            {[
              { name:"Sarah Butler", rel:"Spouse", phone:"(601) 555-0187", primary:true },
              { name:"Robert Butler", rel:"Brother", phone:"(601) 555-0243" },
            ].map((c, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom: i===0 ? "1px solid #0d1a28" : "none" }}>
                <div style={{ width:36, height:36, borderRadius:"50%", background:"rgba(16,185,129,.1)", border:"1px solid rgba(16,185,129,.25)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:600, color:T.green, flexShrink:0 }}>
                  {c.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:13, fontWeight:600, color:T.s }}>{c.name}</span>
                    {c.primary && <span style={{ fontSize:9, background:"rgba(16,185,129,.1)", color:T.green, border:"1px solid rgba(16,185,129,.2)", borderRadius:10, padding:"1px 7px", fontFamily:"'DM Mono',monospace" }}>Primary</span>}
                  </div>
                  <div style={{ fontSize:11, color:T.ghost, marginTop:1 }}>{c.rel}</div>
                  <div style={{ fontSize:11, color:T.blue, fontFamily:"'DM Mono',monospace", marginTop:2 }}>{c.phone}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Surgical History — full width */}
          <div style={{ ...card, gridColumn:"1/-1" }}>
            <CardHeader title="Surgical & Procedure History" editing={ed.surg} onEdit={() => startEdit("surg")} onSave={() => save("surg")} onCancel={() => cancel("surg")} />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 32px" }}>
              {[
                { proc:"Living Donor Kidney Transplant", date:"Mar 8, 2019", facility:"UMMC Jackson", surgeon:"Dr. Susan Reyes", notes:"Left iliac fossa placement. Donor: sibling." },
                { proc:"Native Kidney Biopsy", date:"Nov 2, 2017", facility:"UMMC Jackson", surgeon:"Dr. Ari Cohen", notes:"Confirmed FSGS. Initiated immunosuppression protocol." },
                { proc:"AV Fistula Creation (L arm)", date:"Jan 15, 2018", facility:"Mississippi Kidney Center", surgeon:"Dr. R. Patel", notes:"Pre-transplant dialysis access. No longer active." },
                { proc:"Laparoscopic Cholecystectomy", date:"Aug 20, 2014", facility:"Forrest General Hospital", surgeon:"Dr. M. Williams", notes:"Uncomplicated. Gallstone disease." },
                { proc:"Appendectomy", date:"Jun 6, 2001", facility:"South Central Hospital", surgeon:"Unknown", notes:"Emergency. Perforated appendix." },
              ].map((s, i) => (
                <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"10px 0", borderBottom: i < 4 ? "1px solid #0d1a28" : "none" }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:T.blue, boxShadow:`0 0 6px ${T.blue}60`, marginTop:4, flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:T.s }}>{s.proc}</div>
                    <div style={{ fontSize:10, color:T.blue, fontFamily:"'DM Mono',monospace", marginTop:2 }}>{s.date} · {s.facility}</div>
                    <div style={{ fontSize:11, color:T.ghost, marginTop:1 }}>{s.surgeon}</div>
                    <div style={{ fontSize:11, color:T.dim, marginTop:3, lineHeight:1.4, fontStyle:"italic" }}>{s.notes}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
