// ── Log — fast structured capture (Vitals, Symptoms) + Quick Log (natural lang). ─
// Structured tap-driven entry is the primary path (Insina is episodic, not a
// daily logger). Quick Log is the convenience shortcut, not the front door.
import { useState } from "react";
import { C, mono, sans, Card, SL, Btn, Empty, Pill } from "../companionUI.jsx";
import { rls, wls, uid, toISO, readings, latestWith, recentAverage } from "../../../lib/companionData.js";
import { askInsinaJSON, buildRecordSystem } from "../../../lib/companionAI.js";

const SUBTABS = [
  { key: "vitals",   label: "Vitals" },
  { key: "symptoms", label: "Symptoms" },
  { key: "quick",    label: "Quick Log" },
];

export default function Log({ queueSync, initialTab = "vitals" }) {
  const [sub, setSub] = useState(SUBTABS.some(s => s.key === initialTab) ? initialTab : "vitals");
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <div style={{ display: "flex", gap: 6, padding: "12px 16px 0" }}>
        {SUBTABS.map(s => (
          <button key={s.key} onClick={() => setSub(s.key)}
            style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `1px solid ${sub === s.key ? C.blue : C.b2}`, background: sub === s.key ? "rgba(79,142,247,.12)" : "transparent", color: sub === s.key ? C.blue : C.dim, fontSize: 12, fontFamily: mono, cursor: "pointer" }}>
            {s.label}
          </button>
        ))}
      </div>
      <div style={{ padding: 16 }}>
        {sub === "vitals"   && <Vitals queueSync={queueSync} />}
        {sub === "symptoms" && <Symptoms queueSync={queueSync} />}
        {sub === "quick"    && <QuickLog queueSync={queueSync} onDone={setSub} />}
      </div>
    </div>
  );
}

// ── Vitals ────────────────────────────────────────────────────────────────────
const VITAL_FIELDS = [
  { key: "bp_s",   label: "Systolic",  ph: "120", store: "bp_s" },
  { key: "bp_d",   label: "Diastolic", ph: "80",  store: "bp_d" },
  { key: "hr",     label: "Heart Rate", ph: "72", store: "hr" },
  { key: "o2",     label: "Oxygen %",   ph: "97", store: "o2" },
  { key: "weight", label: "Weight (lb)", ph: "192", store: "weight" },
  { key: "temp",   label: "Temp (°F)",  ph: "98.6", store: "temp" },
];
const BLANK_V = Object.fromEntries(VITAL_FIELDS.map(f => [f.key, ""]));

function Vitals({ queueSync }) {
  const [form, setForm] = useState(BLANK_V);
  const [saved, setSaved] = useState(false);
  const recent = readings();

  const prevBP = latestWith("bp_s");
  const avgSys = recentAverage("bp_s");

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }
  function save() {
    if (!Object.values(form).some(v => v !== "")) return;
    const r = { id: uid(), ts: Date.now(), date: toISO(), source: "companion", flag: false };
    VITAL_FIELDS.forEach(f => { if (form[f.key] !== "") r[f.store] = +form[f.key]; });
    wls("mi_readings", [r, ...rls("mi_readings", [])]);
    setForm(BLANK_V); setSaved(true); setTimeout(() => setSaved(false), 2500);
    queueSync?.();
  }

  return (
    <div>
      {saved && <Card style={{ marginBottom: 12, border: `1px solid ${C.green}40` }}><span style={{ fontSize: 11, color: C.green, fontFamily: mono }}>✓ Reading saved — will sync to Drive</span></Card>}

      {(prevBP || avgSys) && (
        <div style={{ fontSize: 10, color: C.ghost, fontFamily: mono, marginBottom: 10 }}>
          {prevBP && `Previous BP ${prevBP.bp_s}/${prevBP.bp_d}`}{prevBP && avgSys ? "  ·  " : ""}{avgSys && `recent avg systolic ${avgSys}`}
        </div>
      )}

      <Card style={{ marginBottom: 16 }}>
        <SL>New Reading</SL>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
          {VITAL_FIELDS.map(f => (
            <div key={f.key}>
              <div style={{ fontSize: 9, color: C.dim, fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>{f.label}</div>
              <input type="number" inputMode="decimal" value={form[f.key]} placeholder={f.ph} onChange={e => set(f.key, e.target.value)}
                style={{ width: "100%", background: C.bg, border: `1px solid ${C.b1}`, borderRadius: 6, padding: "9px 10px", color: C.p, fontSize: 14, fontFamily: mono, outline: "none", boxSizing: "border-box" }} />
            </div>
          ))}
        </div>
        <Btn onClick={save} color={C.green}>Save Reading</Btn>
      </Card>

      <SL>Recent Readings</SL>
      {recent.length === 0 ? <Empty>No readings recorded yet.</Empty> : recent.slice(0, 12).map(r => (
        <div key={r.id || r.ts} style={{ background: C.card, border: `1px solid ${C.b2}`, borderRadius: 10, padding: "10px 14px", marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 10, color: C.ghost, fontFamily: mono }}>{r.date}</span>
            {r.source === "companion" && <span style={{ fontSize: 9, color: C.blue, fontFamily: mono }}>📱 companion</span>}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px" }}>
            {r.bp_s && r.bp_d && <Stat label="BP" val={`${r.bp_s}/${r.bp_d}`} color={C.blue} />}
            {r.weight != null && <Stat label="Wt" val={`${r.weight} lb`} color={C.green} />}
            {r.spo2 != null && <Stat label="SpO₂" val={`${r.spo2}%`} color={C.purple} />}
            {r.hr != null && <Stat label="HR" val={`${r.hr}`} color={C.amber} />}
            {r.temp != null && <Stat label="Temp" val={`${r.temp}°`} color={C.dim} />}
          </div>
        </div>
      ))}
    </div>
  );
}
function Stat({ label, val, color }) {
  return <div><div style={{ fontSize: 9, color: C.ghost, fontFamily: mono }}>{label}</div><div style={{ fontSize: 13, fontWeight: 700, color }}>{val}</div></div>;
}

// ── Symptoms ──────────────────────────────────────────────────────────────────
const COMMON = ["Fatigue", "Headache", "Nausea", "Fever", "Swelling", "Rash", "Dizziness", "Shortness of breath", "Pain", "Cough", "Diarrhea", "Chills"];
const SEV = ["Mild", "Moderate", "Severe"];
const sevColor = s => s === "Severe" ? C.red : s === "Moderate" ? C.amber : C.green;

function Symptoms({ queueSync }) {
  const [entries, setEntries] = useState(() => rls("mi_symptoms", []));
  const [name, setName] = useState("");
  const [severity, setSeverity] = useState("Moderate");
  const [trigger, setTrigger] = useState("");
  const [note, setNote] = useState("");

  function save() {
    if (!name.trim()) return;
    const notes = [note.trim(), trigger.trim() ? `Possible trigger: ${trigger.trim()}` : ""].filter(Boolean).join(" · ");
    const entry = { id: uid(), name: name.trim(), severity, date: toISO(), notes, source: "companion" };
    const updated = [entry, ...entries];
    setEntries(updated); wls("mi_symptoms", updated);
    setName(""); setTrigger(""); setNote(""); setSeverity("Moderate");
    queueSync?.();
  }
  function remove(id) { const u = entries.filter(e => e.id !== id); setEntries(u); wls("mi_symptoms", u); queueSync?.(); }

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <SL>What are you feeling?</SL>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {COMMON.map(s => (
            <button key={s} onClick={() => setName(s)}
              style={{ padding: "6px 10px", borderRadius: 16, border: `1px solid ${name === s ? C.blue : C.b2}`, background: name === s ? "rgba(79,142,247,.12)" : "transparent", color: name === s ? C.blue : C.dim, fontSize: 11, cursor: "pointer" }}>
              {s}
            </button>
          ))}
        </div>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Or type a symptom"
          style={{ width: "100%", background: C.bg, border: `1px solid ${C.b1}`, borderRadius: 6, padding: "9px 10px", color: C.p, fontSize: 13, outline: "none", marginBottom: 10, boxSizing: "border-box" }} />
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {SEV.map(s => (
            <button key={s} onClick={() => setSeverity(s)}
              style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: `1.5px solid ${severity === s ? sevColor(s) : C.b2}`, background: severity === s ? sevColor(s) + "22" : "transparent", color: severity === s ? sevColor(s) : C.ghost, fontSize: 11, fontFamily: mono, cursor: "pointer" }}>
              {s}
            </button>
          ))}
        </div>
        <input value={trigger} onChange={e => setTrigger(e.target.value)} placeholder="Possible trigger (optional)"
          style={{ width: "100%", background: C.bg, border: `1px solid ${C.b1}`, borderRadius: 6, padding: "9px 10px", color: C.p, fontSize: 12, outline: "none", marginBottom: 8, boxSizing: "border-box" }} />
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional)"
          style={{ width: "100%", background: C.bg, border: `1px solid ${C.b1}`, borderRadius: 6, padding: "9px 10px", color: C.p, fontSize: 12, outline: "none", marginBottom: 10, boxSizing: "border-box" }} />
        <Btn onClick={save} color={C.green} disabled={!name.trim()}>Save Symptom</Btn>
      </Card>

      <SL>Recent Symptoms</SL>
      {entries.length === 0 ? <Empty>No symptoms logged.</Empty> : entries.slice(0, 20).map(e => (
        <div key={e.id} style={{ background: C.card, border: `1px solid ${C.b2}`, borderRadius: 10, padding: "10px 14px", marginBottom: 8, display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, color: C.p, fontWeight: 600 }}>{e.name}</span>
              <Pill color={sevColor(e.severity)}>{e.severity}</Pill>
            </div>
            <div style={{ fontSize: 10, color: C.ghost, fontFamily: mono, marginTop: 2 }}>{e.date}</div>
            {e.notes && <div style={{ fontSize: 11, color: C.dim, marginTop: 3 }}>{e.notes}</div>}
          </div>
          <button onClick={() => remove(e.id)} style={{ background: "none", border: "none", color: C.ghost, cursor: "pointer", fontSize: 14, alignSelf: "flex-start" }}>✕</button>
        </div>
      ))}
    </div>
  );
}

// ── Quick Log / Talk to Insina (secondary, low-friction path) ──────────────────
// Patient says it in plain language; AI proposes a structured draft; patient
// confirms before anything is filed. AI proposes; the patient disposes.
function QuickLog({ queueSync, onDone }) {
  const [text, setText] = useState("");
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function interpret() {
    const t = text.trim();
    if (!t) return;
    setBusy(true); setError(""); setDraft(null);
    try {
      const data = await askInsinaJSON({
        system: `You convert a patient's plain-language health note into ONE structured entry. Decide the kind and return ONLY JSON:
{"kind":"vital|symptom|medication","summary":"one short human sentence of what will be filed",
 "vital":{"bp_s":num,"bp_d":num,"hr":num,"o2":num,"weight":num,"temp":num},
 "symptom":{"name":"","severity":"Mild|Moderate|Severe","notes":""},
 "medication":{"name":"","type":"skipped|late|reaction|prn","note":""}}
Include only the sub-object matching kind; omit unknown numeric fields. ${buildRecordSystem()}`,
        messages: [{ role: "user", content: t }],
      });
      setDraft(data);
    } catch (e) { setError(e.message || "Couldn’t interpret that — try the Vitals or Symptoms tab."); }
    finally { setBusy(false); }
  }

  function confirm() {
    if (!draft) return;
    if (draft.kind === "vital" && draft.vital) {
      const r = { id: uid(), ts: Date.now(), date: toISO(), source: "companion", flag: false };
      ["bp_s", "bp_d", "hr", "o2", "weight", "temp"].forEach(k => { if (draft.vital[k] != null) r[k] = +draft.vital[k]; });
      wls("mi_readings", [r, ...rls("mi_readings", [])]);
    } else if (draft.kind === "symptom" && draft.symptom) {
      const s = { id: uid(), name: draft.symptom.name || "Symptom", severity: draft.symptom.severity || "Moderate", date: toISO(), notes: draft.symptom.notes || "", source: "companion" };
      wls("mi_symptoms", [s, ...rls("mi_symptoms", [])]);
    } else if (draft.kind === "medication" && draft.medication) {
      const m = draft.medication;
      const e = { id: uid(), date: toISO(), ts: new Date().toISOString(), group: "quicklog", medId: m.name, medName: m.name || "Medication", type: m.type || "skipped", note: m.note || "" };
      wls("mi_med_exceptions", [e, ...rls("mi_med_exceptions", [])]);
    }
    setDraft(null); setText(""); queueSync?.();
    onDone?.(draft.kind === "symptom" ? "symptoms" : "vitals");
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.6, marginBottom: 12 }}>
        Say what happened in plain language — e.g. <span style={{ color: C.s }}>“skipped my evening dose, felt nauseous”</span> or <span style={{ color: C.s }}>“BP was 138 over 84 this morning.”</span> Insina drafts an entry; you confirm before it’s filed.
      </div>
      <textarea value={text} onChange={e => setText(e.target.value)} rows={3} placeholder="Tell Insina what happened…"
        style={{ width: "100%", background: C.bg, border: `1px solid ${C.b1}`, borderRadius: 10, padding: "10px 12px", color: C.p, fontSize: 13, fontFamily: sans, outline: "none", boxSizing: "border-box", resize: "vertical", marginBottom: 10 }} />
      <Btn onClick={interpret} disabled={busy || !text.trim()}>{busy ? "Interpreting…" : "Interpret"}</Btn>
      {error && <div style={{ fontSize: 11, color: C.red, fontFamily: mono, marginTop: 10 }}>{error}</div>}

      {draft && (
        <Card style={{ marginTop: 14, border: `1px solid ${C.blue}40` }}>
          <SL>Insina suggests filing</SL>
          <div style={{ fontSize: 13, color: C.p, marginBottom: 4 }}>{draft.summary || `${draft.kind} entry`}</div>
          <Pill color={C.blue}>{draft.kind}</Pill>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Btn onClick={confirm} color={C.green}>Confirm & file</Btn>
            <Btn onClick={() => setDraft(null)} color={C.ghost}>Discard</Btn>
          </div>
        </Card>
      )}
    </div>
  );
}
