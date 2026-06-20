// ── Doctor Visit Capture — five-stage flow orchestrator. ───────────────────────
// Pre-Visit Brief → Consent (cannot be skipped) → During → (processing) → Summary
// + Action Items. Capture works offline; transcription/summary defer to network.
import { useState } from "react";
import { C, mono, serif, Card, SL, Btn, LEVEL_COLOR } from "../../companionUI.jsx";
import { safetyFlags, flaggedLabs, relDate, fmtShort, conditions } from "../../../../lib/companionData.js";
import { newVisit, getVisit, saveVisit } from "../../../../lib/visitCapture.js";
import { enqueue } from "../../../../lib/outbox.js";
import DuringVisit from "./DuringVisit.jsx";
import VisitSummary from "./VisitSummary.jsx";

export default function VisitFlow({ appt, visitId, onClose, queueSync }) {
  const [visit, setVisit] = useState(() => (visitId ? getVisit(visitId) : newVisit(appt)));
  const [stage, setStage] = useState(visitId ? "summary" : "prebrief");

  if (!visit) { return <div style={{ padding: 24, color: C.dim, fontFamily: mono }}>Visit not found. <button onClick={onClose} style={{ color: C.blue, background: "none", border: "none", cursor: "pointer" }}>Back</button></div>; }

  function chooseConsent(consent) {
    const v = { ...visit, consent, status: "recording" };
    setVisit(v); saveVisit(v); setStage("during");
  }
  function handleStop(data) {
    const v = { ...visit, ...data, status: "saved" };
    setVisit(v); saveVisit(v);
    if (v.hasAudio) enqueue("visit-audio", { visitId: v.id });
    queueSync?.();
    setStage("summary");
  }

  const head = (title) => (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: C.card, borderBottom: `1px solid ${C.b2}`, position: "sticky", top: 0, zIndex: 10 }}>
      <button onClick={onClose} style={{ background: "none", border: "none", color: C.blue, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
      <div style={{ fontFamily: serif, fontSize: 18, color: C.p, flex: 1 }}>{title}</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {stage === "prebrief" && <>{head("Pre-Visit Brief")}<PreVisitBrief visit={visit} onStart={() => setStage("consent")} /></>}
      {stage === "consent"  && <>{head("Consent")}<Consent onChoose={chooseConsent} onBack={() => setStage("prebrief")} /></>}
      {stage === "during"   && <>{head("Recording Visit")}<DuringVisit visit={visit} onStop={handleStop} /></>}
      {stage === "summary"  && <>{head(visit.apptTitle)}<VisitSummary visit={visit} onClose={onClose} /></>}
    </div>
  );
}

// ── Stage 1: Pre-Visit Brief (read-only, from the record) ─────────────────────
function PreVisitBrief({ visit, onStart }) {
  const flags = safetyFlags();
  const labs = flaggedLabs();
  // "What's changed" — recent active conditions + flagged labs as review items
  const recentConditions = conditions().filter(c => c.status === "active" && c.since && new Date(c.since) > new Date(Date.now() - 365 * 86400000));
  // Suggested questions, grounded in the record (web app refines these further)
  const questions = [
    ...labs.slice(0, 3).map(l => `Ask about your ${l.name} (${l.value}${l.unit ? " " + l.unit : ""}).`),
    "Any interactions among my current medications I should watch?",
    "What should change before my next visit?",
  ].slice(0, 5);

  return (
    <div style={{ overflowY: "auto", padding: 16 }}>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 15, color: C.p, fontWeight: 600 }}>{visit.apptTitle}</div>
        <div style={{ fontSize: 11, color: C.s, fontFamily: mono, marginTop: 3 }}>
          {visit.provider || "—"}{visit.date ? ` · ${relDate(visit.date)} · ${fmtShort(visit.date)}` : ""}
        </div>
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <SL>Safety Flags This Doctor Should Know</SL>
        {flags.length === 0 ? <div style={{ fontSize: 12, color: C.ghost, fontFamily: mono }}>None on file.</div> : flags.map((f, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "5px 0" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: LEVEL_COLOR[f.level], marginTop: 5, flexShrink: 0 }} />
            <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.45 }}>{f.text}</div>
          </div>
        ))}
      </Card>

      {recentConditions.length > 0 && (
        <Card style={{ marginBottom: 12 }}>
          <SL>What’s Changed Recently</SL>
          {recentConditions.map((c, i) => (
            <div key={i} style={{ fontSize: 12, color: C.dim, padding: "4px 0" }}>New: {c.name}{c.since ? ` (since ${c.since})` : ""}</div>
          ))}
        </Card>
      )}

      <Card style={{ marginBottom: 16 }}>
        <SL>Questions to Ask</SL>
        {questions.map((q, i) => (
          <div key={i} style={{ display: "flex", gap: 8, padding: "5px 0", fontSize: 12, color: C.dim }}>
            <span style={{ color: C.blue, fontFamily: mono }}>{i + 1}.</span><span style={{ lineHeight: 1.45 }}>{q}</span>
          </div>
        ))}
      </Card>

      <Btn onClick={onStart}>Start Visit Capture →</Btn>
    </div>
  );
}

// ── Stage 2: Consent (cannot be skipped) ──────────────────────────────────────
function Consent({ onChoose, onBack }) {
  return (
    <div style={{ overflowY: "auto", padding: 16 }}>
      <div style={{ background: "#1c1200", border: `1px solid ${C.amber}40`, borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: C.amber, fontFamily: mono, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>⚠ Always ask first</div>
        <div style={{ fontSize: 12, color: "#fcd34d", lineHeight: 1.55 }}>
          Recording laws vary by state — your care spans <b>Mississippi</b> and <b>Louisiana</b>, which have different consent rules. Ask the doctor’s permission before recording.
        </div>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <SL>A script you can read aloud</SL>
        <div style={{ fontSize: 13, color: C.p, lineHeight: 1.65, fontStyle: "italic" }}>
          “Would it be okay if I record our conversation? It’s just for my own personal health records so I can remember everything we discuss.”
        </div>
      </Card>

      <SL>What did the doctor say?</SL>
      <Btn onClick={() => onChoose("agreed")} color={C.green} style={{ marginBottom: 8 }}>✓ Doctor agreed — record audio</Btn>
      <Btn onClick={() => onChoose("declined")} color={C.amber} style={{ marginBottom: 8 }}>Doctor declined — manual notes only</Btn>
      <Btn onClick={() => onChoose("skipped")} color={C.dim} style={{ marginBottom: 16 }}>Skip recording — manual notes only</Btn>

      <button onClick={onBack} style={{ width: "100%", background: "none", border: "none", color: C.ghost, fontSize: 11, fontFamily: mono, cursor: "pointer" }}>← Back to brief</button>
    </div>
  );
}
