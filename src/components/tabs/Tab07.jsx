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

// Common symptoms relevant to transplant / immunosuppressed patients
const COMMON_SYMPTOMS = [
  { id: "fatigue", label: "Fatigue", category: "General" },
  { id: "headache", label: "Headache", category: "Neurological" },
  { id: "nausea", label: "Nausea", category: "GI" },
  { id: "swelling", label: "Swelling / Edema", category: "Cardiovascular" },
  { id: "shortness_breath", label: "Shortness of Breath", category: "Respiratory" },
  { id: "fever", label: "Fever / Chills", category: "Infection" },
  { id: "tremor", label: "Hand Tremor", category: "Neurological" },
  { id: "abdominal_pain", label: "Abdominal Pain", category: "GI" },
  { id: "decreased_urine", label: "Decreased Urine Output", category: "Kidney" },
  { id: "dark_urine", label: "Dark Urine", category: "Kidney" },
  { id: "joint_pain", label: "Joint Pain / Gout", category: "Musculoskeletal" },
  { id: "muscle_weakness", label: "Muscle Weakness", category: "Musculoskeletal" },
  { id: "dizziness", label: "Dizziness", category: "Neurological" },
  { id: "confusion", label: "Brain Fog / Confusion", category: "Neurological" },
  { id: "appetite_loss", label: "Loss of Appetite", category: "GI" },
  { id: "diarrhea", label: "Diarrhea", category: "GI" },
  { id: "skin_changes", label: "Skin Changes / Rash", category: "Dermatological" },
  { id: "cough", label: "Cough", category: "Respiratory" },
  { id: "palpitations", label: "Heart Palpitations", category: "Cardiovascular" },
  { id: "back_pain", label: "Back / Flank Pain", category: "Kidney" },
  { id: "insomnia", label: "Insomnia", category: "General" },
  { id: "weight_gain", label: "Rapid Weight Gain", category: "Cardiovascular" },
];

const BODY_LOCATIONS = [
  "Head", "Neck", "Chest", "Abdomen", "Back / Flank",
  "Arms", "Legs", "Feet / Ankles", "Whole Body", "None / General",
];

const SEVERITY_LABELS = {
  1: "Barely noticeable", 2: "Very mild", 3: "Mild",
  4: "Mild–moderate", 5: "Moderate",
  6: "Moderate–severe", 7: "Severe",
  8: "Very severe", 9: "Intense", 10: "Worst imaginable",
};

const severityColor = s =>
  s <= 3 ? "#10b981" : s <= 5 ? "#f59e0b" : s <= 7 ? "#f97316" : "#ef4444";

// Seed data
const SEED = [
  { id: 1, date: "Mar 10", ts: "2026-03-10T08:22:00", symptom: "Fatigue", custom: "", location: "Whole Body", severity: 5, note: "More tired than usual after waking. Improved by afternoon.", status: "active" },
  { id: 2, date: "Mar 10", ts: "2026-03-10T14:10:00", symptom: "Hand Tremor", custom: "", location: "Arms", severity: 4, note: "Slight tremor noticed while writing. Tacrolimus-related?", status: "active" },
  { id: 3, date: "Mar 7", ts: "2026-03-07T09:45:00", symptom: "Headache", custom: "", location: "Head", severity: 6, note: "Frontal headache. Drank extra water, resolved in 2 hours.", status: "resolved" },
  { id: 4, date: "Mar 5", ts: "2026-03-05T07:30:00", symptom: "Swelling / Edema", custom: "", location: "Feet / Ankles", severity: 5, note: "Noticeable puffiness in ankles in the morning. Better by evening.", status: "resolved" },
  { id: 5, date: "Mar 3", ts: "2026-03-03T18:00:00", symptom: "Nausea", custom: "", location: "Abdomen", severity: 7, note: "After evening meds. Lasted about 90 minutes.", status: "resolved" },
  { id: 6, date: "Feb 28", ts: "2026-02-28T11:20:00", symptom: "Fatigue", custom: "", location: "Whole Body", severity: 4, note: "", status: "resolved" },
  { id: 7, date: "Feb 22", ts: "2026-02-22T08:00:00", symptom: "Joint Pain / Gout", custom: "", location: "Feet / Ankles", severity: 6, note: "Right big toe tender, mild. Uric acid has been creeping up.", status: "resolved" },
  { id: 8, date: "Feb 18", ts: "2026-02-18T20:30:00", symptom: "Decreased Urine Output", custom: "", location: "None / General", severity: 6, note: "Noticed less output than usual. Hydrated aggressively — back to normal next morning.", status: "resolved" },
  { id: 9, date: "Feb 10", ts: "2026-02-10T09:10:00", symptom: "Dizziness", custom: "", location: "Head", severity: 5, note: "On standing. Resolved quickly. BP was 155/84 that morning.", status: "resolved" },
  { id: 10, date: "Jan 28", ts: "2026-01-28T14:00:00", symptom: "Brain Fog / Confusion", custom: "", location: "Head", severity: 4, note: "Difficulty concentrating for several hours mid-afternoon.", status: "resolved" },
];

let nextId = 11;

// Log panel
function LogPanel({ onClose, onSave }) {
  const [step, setStep] = useState(1); // 1 = pick symptom, 2 = details
  const [selected, setSelected] = useState(null);
  const [custom, setCustom] = useState("");
  const [location, setLocation] = useState("");
  const [severity, setSeverity] = useState(5);
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState("");

  const filtered = COMMON_SYMPTOMS.filter(s =>
    s.label.toLowerCase().includes(filter.toLowerCase())
  );

  const categories = [...new Set(filtered.map(s => s.category))];

  const canProceed = selected || custom.trim();

  const handleSave = () => {
    onSave({
      symptom: selected ? selected.label : custom.trim(),
      custom: selected ? "" : custom.trim(),
      location: location || "None / General",
      severity,
      note,
      status: "active",
    });
    onClose();
  };

  return (
    <div style={{ position: "absolute", top: 0, right: 0, width: 340, height: "100%", background: "#080c14", borderLeft: "1px solid #0d1a28", display: "flex", flexDirection: "column", zIndex: 20, animation: "slideInRight .22s ease both" }}>
      {/* Header */}
      <div style={{ padding: "18px 18px 14px", borderBottom: "1px solid #0d1a28", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 9, color: "#4f8ef7", fontFamily: "'DM Mono',monospace", letterSpacing: "1.5px", marginBottom: 4 }}>
            {step === 1 ? "STEP 1 OF 2" : "STEP 2 OF 2"}
          </div>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 18, color: "#dde8f5" }}>
            {step === 1 ? "Select Symptom" : selected ? selected.label : custom}
          </div>
        </div>
        <button onClick={onClose} style={{ background: "#0b1220", border: "1px solid #111e30", borderRadius: 6, color: "#3d5a7a", fontSize: 14, cursor: "pointer", padding: "4px 8px" }}>✕</button>
      </div>

      {/* Step 1 — symptom picker */}
      {step === 1 && (
        <>
          <div style={{ padding: "14px 18px 10px", flexShrink: 0 }}>
            <input
              placeholder="Search symptoms..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", background: "#0b1220", border: "1px solid #111e30", borderRadius: 8, color: "#c4d8ee", fontSize: 12, fontFamily: "'Sora',sans-serif", outline: "none" }}
            />
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "0 18px 14px" }}>
            {categories.map(cat => (
              <div key={cat} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 9, color: "#1e3550", fontFamily: "'DM Mono',monospace", letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: 7 }}>{cat}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {filtered.filter(s => s.category === cat).map(s => (
                    <button key={s.id} onClick={() => setSelected(selected?.id === s.id ? null : s)}
                      style={{ padding: "5px 11px", borderRadius: 20, border: `1px solid ${selected?.id === s.id ? "#4f8ef7" : "#111e30"}`, background: selected?.id === s.id ? "rgba(79,142,247,.15)" : "#0b1220", color: selected?.id === s.id ? "#7eb8d8" : "#3d5a7a", fontSize: 11, cursor: "pointer", fontFamily: "'Sora',sans-serif", transition: "all .12s" }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Custom */}
            <div style={{ marginTop: 4 }}>
              <div style={{ fontSize: 9, color: "#1e3550", fontFamily: "'DM Mono',monospace", letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: 7 }}>Or describe in your own words</div>
              <input
                placeholder="e.g. Tingling in left hand..."
                value={custom}
                onChange={e => { setCustom(e.target.value); if (e.target.value) setSelected(null); }}
                style={{ width: "100%", padding: "9px 12px", background: "#0b1220", border: `1px solid ${custom ? "#4f8ef7" : "#111e30"}`, borderRadius: 8, color: "#c4d8ee", fontSize: 12, fontFamily: "'Sora',sans-serif", outline: "none" }}
              />
            </div>
          </div>
          <div style={{ padding: "14px 18px", borderTop: "1px solid #0d1a28", flexShrink: 0 }}>
            <button onClick={() => canProceed && setStep(2)}
              style={{ width: "100%", padding: "11px", background: canProceed ? "#4f8ef7" : "#0f1e30", border: "none", borderRadius: 9, color: canProceed ? "#fff" : "#2d4d6a", fontSize: 13, fontFamily: "'Sora',sans-serif", fontWeight: 600, cursor: canProceed ? "pointer" : "default", transition: "all .15s" }}>
              Next →
            </button>
          </div>
        </>
      )}

      {/* Step 2 — details */}
      {step === 2 && (
        <>
          <div style={{ flex: 1, overflowY: "auto", padding: "18px" }}>

            {/* Severity slider */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 9, color: "#1e3550", fontFamily: "'DM Mono',monospace", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 10 }}>Severity</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: severityColor(severity), lineHeight: 1 }}>{severity}</span>
                <span style={{ fontSize: 12, color: severityColor(severity), fontWeight: 600 }}>{SEVERITY_LABELS[severity]}</span>
              </div>
              {/* Custom slider track */}
              <div style={{ position: "relative", marginBottom: 8 }}>
                <input type="range" min={1} max={10} value={severity} onChange={e => setSeverity(+e.target.value)}
                  style={{ width: "100%", accentColor: severityColor(severity), cursor: "pointer" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8.5, color: "#1e3550", fontFamily: "'DM Mono',monospace" }}>
                <span>1 — Minimal</span><span>10 — Severe</span>
              </div>
              {/* Color bar */}
              <div style={{ height: 4, borderRadius: 4, marginTop: 10, background: "linear-gradient(to right, #10b981, #f59e0b, #f97316, #ef4444)", position: "relative" }}>
                <div style={{ position: "absolute", top: -3, left: `${((severity - 1) / 9) * 100}%`, transform: "translateX(-50%)", width: 10, height: 10, borderRadius: "50%", background: severityColor(severity), border: "2px solid #080c14", boxShadow: `0 0 8px ${severityColor(severity)}` }} />
              </div>
            </div>

            {/* Body location */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 9, color: "#1e3550", fontFamily: "'DM Mono',monospace", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 10 }}>Body Location</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {BODY_LOCATIONS.map(loc => (
                  <button key={loc} onClick={() => setLocation(location === loc ? "" : loc)}
                    style={{ padding: "5px 11px", borderRadius: 20, border: `1px solid ${location === loc ? "#4f8ef7" : "#111e30"}`, background: location === loc ? "rgba(79,142,247,.15)" : "#0b1220", color: location === loc ? "#7eb8d8" : "#3d5a7a", fontSize: 11, cursor: "pointer", fontFamily: "'Sora',sans-serif", transition: "all .12s" }}>
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, color: "#1e3550", fontFamily: "'DM Mono',monospace", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>Notes <span style={{ color: "#142030" }}>· optional</span></div>
              <textarea
                placeholder="Any context — when it started, what makes it better or worse..."
                value={note} onChange={e => setNote(e.target.value)} rows={4}
                style={{ width: "100%", padding: "9px 12px", background: "#0b1220", border: "1px solid #111e30", borderRadius: 8, color: "#c4d8ee", fontSize: 12, fontFamily: "'Sora',sans-serif", outline: "none", resize: "none", lineHeight: 1.6 }}
              />
            </div>
          </div>

          <div style={{ padding: "14px 18px", borderTop: "1px solid #0d1a28", display: "flex", gap: 8, flexShrink: 0 }}>
            <button onClick={() => setStep(1)}
              style={{ padding: "11px 14px", background: "#0b1220", border: "1px solid #111e30", borderRadius: 9, color: "#3d5a7a", fontSize: 13, fontFamily: "'Sora',sans-serif", cursor: "pointer" }}>
              ← Back
            </button>
            <button onClick={handleSave}
              style={{ flex: 1, padding: "11px", background: "#10b981", border: "none", borderRadius: 9, color: "#fff", fontSize: 13, fontFamily: "'Sora',sans-serif", fontWeight: 600, cursor: "pointer" }}>
              Save Symptom
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Severity bar (mini)
function SeverityBar({ value }) {
  const pct = ((value - 1) / 9) * 100;
  const color = severityColor(value);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: "#0d1a28", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 14, textAlign: "right" }}>{value}</span>
    </div>
  );
}

// Detail side panel
function DetailPanel({ entry, onClose, onResolve }) {
  return (
    <div style={{ position: "absolute", top: 0, right: 0, width: 320, height: "100%", background: "#080c14", borderLeft: "1px solid #0d1a28", display: "flex", flexDirection: "column", zIndex: 10, animation: "slideInRight .2s ease both" }}>
      <div style={{ padding: "18px 18px 14px", borderBottom: "1px solid #0d1a28", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 9, color: entry.status === "active" ? "#ef4444" : "#10b981", fontFamily: "'DM Mono',monospace", letterSpacing: "1.5px", marginBottom: 5, fontWeight: 600 }}>
            {entry.status === "active" ? "● ACTIVE" : "✓ RESOLVED"}
          </div>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 19, color: "#dde8f5", lineHeight: 1.2 }}>{entry.symptom}</div>
          <div style={{ fontSize: 10, color: "#2d4d6a", fontFamily: "'DM Mono',monospace", marginTop: 5 }}>{entry.date} · {entry.location}</div>
        </div>
        <button onClick={onClose} style={{ background: "#0b1220", border: "1px solid #111e30", borderRadius: 6, color: "#3d5a7a", fontSize: 14, cursor: "pointer", padding: "4px 8px", flexShrink: 0 }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "18px" }}>
        {/* Severity */}
        <div style={{ background: "#0b1220", border: "1px solid #111e30", borderRadius: 12, padding: "16px", marginBottom: 14 }}>
          <div style={{ fontSize: 9, color: "#1e3550", fontFamily: "'DM Mono',monospace", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 10 }}>Severity</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 36, fontWeight: 700, color: severityColor(entry.severity), lineHeight: 1 }}>{entry.severity}</span>
            <span style={{ fontSize: 13, color: severityColor(entry.severity), fontWeight: 600 }}>{SEVERITY_LABELS[entry.severity]}</span>
          </div>
          <div style={{ height: 6, borderRadius: 4, background: "linear-gradient(to right,#10b981,#f59e0b,#f97316,#ef4444)", position: "relative" }}>
            <div style={{ position: "absolute", top: -4, left: `${((entry.severity - 1) / 9) * 100}%`, transform: "translateX(-50%)", width: 14, height: 14, borderRadius: "50%", background: severityColor(entry.severity), border: "2px solid #080c14" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "#142030", fontFamily: "'DM Mono',monospace", marginTop: 6 }}>
            <span>1</span><span>5</span><span>10</span>
          </div>
        </div>

        {/* Notes */}
        {entry.note && (
          <div style={{ background: "#0b1220", border: "1px solid #111e30", borderRadius: 12, padding: "14px", marginBottom: 14 }}>
            <div style={{ fontSize: 9, color: "#1e3550", fontFamily: "'DM Mono',monospace", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>Notes</div>
            <div style={{ fontSize: 12, color: "#a8c4dc", lineHeight: 1.7 }}>{entry.note}</div>
          </div>
        )}

        {/* AI context hint */}
        <div style={{ background: "linear-gradient(135deg,rgba(79,142,247,.08),rgba(167,139,250,.06))", border: "1px solid rgba(79,142,247,.2)", borderRadius: 12, padding: "14px" }}>
          <div style={{ fontSize: 9, color: "#4f8ef7", fontFamily: "'DM Mono',monospace", letterSpacing: "1.2px", marginBottom: 8 }}>✦ AI CONTEXT</div>
          <div style={{ fontSize: 11, color: "#7eb8d8", lineHeight: 1.7, marginBottom: 12 }}>
            {entry.symptom === "Hand Tremor" && "Tacrolimus-induced tremor is common — worth noting if severity increases or correlates with trough levels."}
            {entry.symptom === "Fatigue" && "Fatigue in transplant patients can reflect anemia, tacrolimus levels, poor sleep, or early rejection. Correlates with your recent Hemoglobin and eGFR trends."}
            {entry.symptom === "Swelling / Edema" && "Ankle edema may reflect fluid retention — relevant alongside furosemide dosing and your BP readings."}
            {entry.symptom === "Nausea" && "Nausea is a common mycophenolate and tacrolimus side effect — timing relative to medication doses is useful context."}
            {entry.symptom === "Joint Pain / Gout" && "Uric acid is 5.8 and trending up. Tacrolimus and furosemide both raise uric acid risk. Worth flagging to Dr. Cohen."}
            {entry.symptom === "Decreased Urine Output" && "Decreased output alongside rising creatinine (now 1.42) and falling eGFR (58) is a key concern for the nephrology appointment."}
            {entry.symptom === "Dizziness" && "Orthostatic dizziness correlates with your Mar 3 BP reading of 164/88. May indicate medication timing or volume status."}
            {entry.symptom === "Brain Fog / Confusion" && "Tacrolimus neurotoxicity can present as brain fog. Worth noting if severity increases or correlates with high trough levels."}
            {entry.symptom === "Headache" && "Hypertension is a common cause of headache in transplant patients — correlates with BP readings above 140."}
            {!["Hand Tremor","Fatigue","Swelling / Edema","Nausea","Joint Pain / Gout","Decreased Urine Output","Dizziness","Brain Fog / Confusion","Headache"].includes(entry.symptom) && "This symptom has been logged. The AI Analysis tab can cross-reference it against your labs, vitals, and medications for deeper insights."}
          </div>
          <button style={{ width: "100%", padding: "8px", background: "transparent", border: "1px solid rgba(79,142,247,.3)", borderRadius: 8, color: "#4f8ef7", fontSize: 11, fontFamily: "'Sora',sans-serif", cursor: "pointer", fontWeight: 600 }}>
            ✦ Analyze in AI tab →
          </button>
        </div>
      </div>

      {entry.status === "active" && (
        <div style={{ padding: "14px 18px", borderTop: "1px solid #0d1a28", flexShrink: 0 }}>
          <button onClick={() => onResolve(entry.id)}
            style={{ width: "100%", padding: "10px", background: "#0b1220", border: "1px solid #10b981", borderRadius: 9, color: "#10b981", fontSize: 12, fontFamily: "'Sora',sans-serif", fontWeight: 600, cursor: "pointer" }}>
            ✓ Mark as Resolved
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [activeNav, setActiveNav] = useState("symptoms");
  const [entries, setEntries] = useState(SEED);
  const [showLog, setShowLog] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [filter, setFilter] = useState("all"); // all | active | resolved
  const [time, setTime] = useState(new Date());

  useEffect(() => { const t = setInterval(() => setTime(new Date()), 60000); return () => clearInterval(t); }, []);
  const fmt = d => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const fmtDate = d => d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const handleSave = (data) => {
    const entry = { id: nextId++, date: "Mar 18", ts: `2026-03-18T${new Date().toTimeString().slice(0,8)}`, ...data };
    setEntries(e => [entry, ...e]);
    setSelectedEntry(entry);
  };

  const handleResolve = (id) => {
    setEntries(e => e.map(x => x.id === id ? { ...x, status: "resolved" } : x));
    setSelectedEntry(prev => prev?.id === id ? { ...prev, status: "resolved" } : prev);
  };

  const displayed = entries.filter(e => filter === "all" ? true : e.status === filter);
  const active = entries.filter(e => e.status === "active");
  const avgSeverity = entries.length ? (entries.reduce((s, e) => s + e.severity, 0) / entries.length).toFixed(1) : "—";
  const maxSeverity = entries.length ? Math.max(...entries.map(e => e.severity)) : 0;

  // Group by date
  const grouped = displayed.reduce((acc, entry) => {
    if (!acc[entry.date]) acc[entry.date] = [];
    acc[entry.date].push(entry);
    return acc;
  }, {});

  return (
    <div style={{ display: "flex", height: "100vh", background: "#07090f", color: "#d4e2f0", fontFamily: "'Sora',sans-serif", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:#1a2840;border-radius:4px}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes slideInRight{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        .nav-item{display:flex;align-items:center;gap:10px;padding:8px 16px;cursor:pointer;font-size:12.5px;color:#3d5a7a;border-left:2px solid transparent;transition:all .15s;user-select:none}
        .nav-item:hover{color:#7eb8d8;background:rgba(79,142,247,.04)}
        .nav-item.active{color:#4f8ef7;background:rgba(79,142,247,.08);border-left-color:#4f8ef7}
        .nav-icon{font-size:13px;width:16px;text-align:center;flex-shrink:0}
        .live-dot{width:6px;height:6px;border-radius:50%;background:#10b981;animation:pulse 2s infinite;flex-shrink:0}
        .section-label{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#1e3550;font-family:'DM Mono',monospace;margin-bottom:10px}
        .entry-row{background:#0b1220;border:1px solid #111e30;border-radius:11px;padding:14px 16px;cursor:pointer;transition:all .15s;animation:fadeUp .3s ease both;margin-bottom:7px}
        .entry-row:hover{border-color:#1a2f4a}
        .entry-row.sel{border-color:#4f8ef7;background:rgba(79,142,247,.06)}
        .filter-btn{padding:5px 13px;border-radius:20px;border:1px solid #111e30;background:transparent;color:#3d5a7a;font-size:11px;font-family:'Sora',sans-serif;cursor:pointer;transition:all .12s}
        .filter-btn:hover{color:#7eb8d8;border-color:#1a2f4a}
        .filter-btn.on{background:rgba(79,142,247,.12);border-color:#4f8ef7;color:#7eb8d8}
      `}</style>

      {/* Sidebar */}
      <aside style={{ width:210, minWidth:210, background:"#080c14", borderRight:"1px solid #0d1a28", display:"flex", flexDirection:"column", height:"100vh" }}>
        <div style={{ padding: "20px 14px", borderBottom: "1px solid #0d1a28", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src={INTELLITRAX_LOGO} alt="IntelliTrax" style={{ width: 185, height: 65, objectFit: "contain" }} />
        </div>
        <div style={{ padding:"14px 18px", borderBottom:"1px solid #0d1a28" }}>
          <div style={{ fontSize:10, color:"#1e3550", fontFamily:"'DM Mono',monospace", marginBottom:4 }}>PATIENT</div>
          <div style={{ fontSize:13, fontWeight:600, color:"#c4d8ee" }}>Greg Butler</div>
          <div style={{ fontSize:11, color:"#2d4d6a", marginTop:2 }}>Transplant · Immunosuppressed</div>
        </div>
        <nav style={{ flex:1, overflowY:"auto", padding:"10px 0" }}>
          <div style={{ padding:"8px 16px 4px", fontSize:9, color:"#142030", fontFamily:"'DM Mono',monospace", letterSpacing:"1.5px", textTransform:"uppercase" }}>CORE</div>
          {NAV.slice(0,8).map(({id,icon,label}) => (
            <div key={id} className={`nav-item ${activeNav===id?"active":""}`} onClick={()=>setActiveNav(id)}>
              <span className="nav-icon">{icon}</span><span>{label}</span>
            </div>
          ))}
          <div style={{ padding:"12px 16px 4px", fontSize:9, color:"#142030", fontFamily:"'DM Mono',monospace", letterSpacing:"1.5px", textTransform:"uppercase" }}>SYSTEM</div>
          {NAV.slice(8).map(({id,icon,label}) => (
            <div key={id} className={`nav-item ${activeNav===id?"active":""}`} onClick={()=>setActiveNav(id)}>
              <span className="nav-icon">{icon}</span><span>{label}</span>
              {id==="ai"&&<span style={{marginLeft:"auto",fontSize:8,background:"#4f8ef7",color:"#fff",padding:"1px 5px",borderRadius:8,fontFamily:"'DM Mono',monospace"}}>AI</span>}
            </div>
          ))}
        </nav>
        <div style={{ padding:"12px 16px", borderTop:"1px solid #0d1a28" }}>
          <div style={{ display:"flex", alignItems:"center", gap:7, fontSize:10, color:"#1e4030", fontFamily:"'DM Mono',monospace" }}>
            <div className="live-dot"/>All systems nominal
          </div>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* Topbar */}
        <div style={{ height:54, background:"#080c14", borderBottom:"1px solid #0d1a28", display:"flex", alignItems:"center", padding:"0 28px", gap:16, flexShrink:0 }}>
          <div style={{ flex:1, display:"flex", alignItems:"center", gap:8 }}>
            <div className="live-dot"/>
            <span style={{ fontSize:11, color:"#2d4d6a", fontFamily:"'DM Mono',monospace" }}>{fmtDate(time)} · {fmt(time)}</span>
          </div>
          <button onClick={()=>{ setShowLog(true); setSelectedEntry(null); }}
            style={{ padding:"9px 20px", background:"#4f8ef7", border:"none", borderRadius:8, color:"#fff", fontSize:13, fontFamily:"'Sora',sans-serif", fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:8, boxShadow:"0 0 18px rgba(79,142,247,.35)" }}>
            <span style={{ fontSize:17, lineHeight:1 }}>+</span> Log Symptom
          </button>
          <div style={{ width:32, height:32, background:"linear-gradient(135deg,#4f8ef7,#a78bfa)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, cursor:"pointer", color:"#fff" }}>G</div>
        </div>

        {/* Content */}
        <div style={{ flex:1, display:"flex", overflow:"hidden", position:"relative" }}>
          <div style={{ flex:1, overflowY:"auto", padding:"24px 28px" }}>

            {/* Page header */}
            <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:20 }}>
              <div>
                <h1 style={{ fontFamily:"'DM Serif Display',serif", fontSize:26, color:"#dde8f5", fontWeight:400, letterSpacing:"-0.5px", marginBottom:4 }}>Symptoms</h1>
                <p style={{ fontSize:11, color:"#2d4d6a", fontFamily:"'DM Mono',monospace" }}>{entries.length} logged · {active.length} active</p>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                {[["all","All"],["active","Active"],["resolved","Resolved"]].map(([v,l]) => (
                  <button key={v} className={`filter-btn ${filter===v?"on":""}`} onClick={()=>setFilter(v)}>{l}</button>
                ))}
              </div>
            </div>

            {/* Stat chips */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:24 }}>
              {[
                { label:"Active", value: active.length, color: active.length > 0 ? "#ef4444" : "#10b981" },
                { label:"Total Logged", value: entries.length, color:"#4f8ef7" },
                { label:"Avg Severity", value: avgSeverity, color: avgSeverity >= 6 ? "#ef4444" : avgSeverity >= 4 ? "#f59e0b" : "#10b981" },
                { label:"Peak Severity", value: maxSeverity || "—", color: severityColor(maxSeverity || 5) },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background:"#0b1220", border:"1px solid #111e30", borderRadius:12, padding:"14px 16px", animation:"fadeUp .3s ease both" }}>
                  <div style={{ fontSize:9, color:"#1e3550", fontFamily:"'DM Mono',monospace", letterSpacing:"1px", textTransform:"uppercase", marginBottom:6 }}>{label}</div>
                  <div style={{ fontSize:24, fontWeight:700, color, lineHeight:1 }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Log CTA */}
            <div
              onClick={()=>{ setShowLog(true); setSelectedEntry(null); }}
              style={{ background:"linear-gradient(135deg,rgba(79,142,247,.1),rgba(167,139,250,.07))", border:"1px dashed rgba(79,142,247,.4)", borderRadius:14, padding:"18px 22px", marginBottom:24, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between", transition:"all .15s", animation:"fadeUp .35s ease both" }}
              onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(79,142,247,.7)"}
              onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(79,142,247,.4)"}
            >
              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                <div style={{ width:38, height:38, borderRadius:"50%", background:"rgba(79,142,247,.18)", border:"1px solid rgba(79,142,247,.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, color:"#4f8ef7", lineHeight:1, flexShrink:0 }}>+</div>
                <div>
                  <div style={{ fontSize:14, fontWeight:600, color:"#7eb8d8", marginBottom:3 }}>Log a new symptom</div>
                  <div style={{ fontSize:11, color:"#2d4d6a", fontFamily:"'DM Mono',monospace" }}>Quick-select or describe in your own words · takes 30 seconds</div>
                </div>
              </div>
              <div style={{ fontSize:18, color:"#4f8ef7", opacity:0.6 }}>→</div>
            </div>

            {/* Timeline */}
            {Object.entries(grouped).map(([date, dayEntries]) => (
              <div key={date} style={{ marginBottom:22 }}>
                {/* Date header with timeline dot */}
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:"#1a2840", flexShrink:0 }}/>
                  <div style={{ fontSize:10, color:"#2d4d6a", fontFamily:"'DM Mono',monospace", letterSpacing:"0.5px", fontWeight:600 }}>{date}</div>
                  <div style={{ flex:1, height:1, background:"#0d1a28" }}/>
                </div>

                {dayEntries.map((entry, i) => {
                  const isSelected = selectedEntry?.id === entry.id;
                  return (
                    <div
                      key={entry.id}
                      className={`entry-row ${isSelected ? "sel" : ""}`}
                      style={{ animationDelay:`${i * 40}ms`, marginLeft:18, borderLeft:`3px solid ${severityColor(entry.severity)}` }}
                      onClick={() => { setSelectedEntry(isSelected ? null : entry); setShowLog(false); }}
                    >
                      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:10 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                            <span style={{ fontSize:14, fontWeight:600, color:"#c4d8ee" }}>{entry.symptom}</span>
                            <span style={{ fontSize:9, background: entry.status==="active" ? "rgba(239,68,68,.12)" : "rgba(16,185,129,.1)", color: entry.status==="active" ? "#ef4444" : "#10b981", padding:"2px 7px", borderRadius:20, fontFamily:"'DM Mono',monospace", fontWeight:600 }}>
                              {entry.status === "active" ? "ACTIVE" : "RESOLVED"}
                            </span>
                          </div>
                          <div style={{ fontSize:10, color:"#2d4d6a", fontFamily:"'DM Mono',monospace" }}>
                            {entry.location}
                          </div>
                        </div>
                      </div>
                      <SeverityBar value={entry.severity} />
                      {entry.note && (
                        <div style={{ fontSize:11, color:"#3d5a7a", marginTop:9, lineHeight:1.55, borderTop:"1px solid #0d1a28", paddingTop:9 }}>
                          {entry.note}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {displayed.length === 0 && (
              <div style={{ textAlign:"center", padding:"60px 0", color:"#1e3550", fontFamily:"'DM Mono',monospace", fontSize:12 }}>
                No symptoms logged yet.
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selectedEntry && !showLog && (
            <DetailPanel entry={selectedEntry} onClose={() => setSelectedEntry(null)} onResolve={handleResolve} />
          )}

          {/* Log panel */}
          {showLog && (
            <LogPanel onClose={() => setShowLog(false)} onSave={handleSave} />
          )}
        </div>
      </div>
    </div>
  );
}
