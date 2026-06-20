// ── Meds — the one genuinely daily screen. ────────────────────────────────────
// Two ideas drive it: (A) tracking has MODES the patient picks; (B) confirm the
// WHOLE group in one tap, and name a drug only when flagging an exception.
import { useState } from "react";
import { C, mono, Card, SL, Pill, Btn, Empty } from "../companionUI.jsx";
import {
  medGroups, refillsDue, relDate, medId,
  MED_MODES, getMedMode, setMedMode,
  todayConfirms, confirmGroup, unconfirmGroup,
  EXCEPTION_TYPES, todayExceptions, logException, removeException,
} from "../../../lib/companionData.js";

export default function Meds({ queueSync }) {
  const [mode, setMode] = useState(getMedMode());
  const [confirmed, setConfirmed] = useState(todayConfirms());
  const [exceptions, setExceptions] = useState(todayExceptions());
  const [showException, setShowException] = useState(false);

  const { groups, prn } = medGroups();
  const refills = refillsDue(7);
  const canConfirm = mode === "quick" || mode === "full";
  const canFlag    = mode === "quick" || mode === "full";

  function pickMode(m) { setMode(m); setMedMode(m); queueSync?.(); }
  function toggleGroup(key) {
    if (confirmed.includes(key)) { unconfirmGroup(key); setConfirmed(c => c.filter(k => k !== key)); }
    else { confirmGroup(key); setConfirmed(c => [...c, key]); }
    queueSync?.();
  }
  function saveException(entry) {
    const saved = logException(entry);
    setExceptions(e => [saved, ...e]);
    setShowException(false);
    queueSync?.();
  }
  function dropException(id) { removeException(id); setExceptions(e => e.filter(x => x.id !== id)); queueSync?.(); }

  return (
    <div style={{ padding: "16px 16px 28px" }}>

      {/* Mode switcher — easy to change at any time, never buried */}
      <SL>Tracking Mode</SL>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
        {MED_MODES.map(m => {
          const active = mode === m.key;
          return (
            <button key={m.key} onClick={() => pickMode(m.key)}
              style={{ textAlign: "left", background: active ? "rgba(79,142,247,.12)" : C.card, border: `1px solid ${active ? C.blue : C.b2}`, borderRadius: 8, padding: "8px 10px", cursor: "pointer" }}>
              <div style={{ fontSize: 12, color: active ? C.blue : C.s, fontWeight: 600 }}>{m.label}</div>
              <div style={{ fontSize: 9, color: C.ghost, fontFamily: mono, marginTop: 1, lineHeight: 1.3 }}>{m.blurb}</div>
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 9, color: C.ghost, fontFamily: mono, marginBottom: 16, lineHeight: 1.4 }}>
        Confirmation is a coarse, self-reported record by design — a list you’ll keep beats a precise one you’d abandon. Full history lives on the web app.
      </div>

      {/* Refills surfaced at the top */}
      {refills.length > 0 && (
        <Card style={{ marginBottom: 16, border: `1px solid ${C.amber}40` }}>
          <SL>Refills Due Soon</SL>
          {refills.map(m => (
            <div key={medId(m)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
              <span style={{ fontSize: 15 }}>💊</span>
              <div style={{ flex: 1, fontSize: 12, color: C.s, fontWeight: 600 }}>{m.name}</div>
              <span style={{ fontSize: 10, color: C.amber, fontFamily: mono }}>{relDate(m.refillDate)}</span>
            </div>
          ))}
        </Card>
      )}

      {/* Scheduled groups — whole-group one-tap confirm */}
      {groups.length === 0 ? <Empty>No active medications on file.</Empty> : groups.map(g => {
        const done = confirmed.includes(g.key);
        return (
          <Card key={g.key} style={{ marginBottom: 12, border: `1px solid ${done ? C.green + "55" : C.b2}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>{g.icon}</span>
              <div style={{ fontSize: 14, color: C.p, fontWeight: 600 }}>{g.label}</div>
              <Pill color={C.dim}>{g.meds.length} meds</Pill>
            </div>
            <GroupMeds meds={g.meds} />
            {canConfirm && (
              done
                ? <button onClick={() => toggleGroup(g.key)} style={{ width: "100%", marginTop: 10, padding: 10, background: "rgba(16,185,129,.12)", border: `1px solid ${C.green}55`, borderRadius: 8, color: C.green, fontSize: 12, fontFamily: mono, fontWeight: 600, cursor: "pointer" }}>
                    ✓ Confirmed — tap to undo
                  </button>
                : <Btn onClick={() => toggleGroup(g.key)} color={C.green} style={{ marginTop: 10 }}>Took my {g.label.toLowerCase()} meds</Btn>
            )}
            {mode === "reminders" && <div style={{ marginTop: 8, fontSize: 10, color: C.ghost, fontFamily: mono }}>🔔 Reminder only — nothing to log.</div>}
          </Card>
        );
      })}

      {/* PRN / as-needed — the variable path, worth capturing individually */}
      {prn.length > 0 && (
        <Card style={{ marginBottom: 12 }}>
          <SL>As Needed</SL>
          {prn.map(m => (
            <div key={medId(m)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `1px solid ${C.b2}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: C.s, fontWeight: 600 }}>{m.name}</div>
                <div style={{ fontSize: 10, color: C.ghost, fontFamily: mono }}>{[m.dose, m.frequency].filter(Boolean).join(" · ")}</div>
              </div>
              {canFlag && (
                <button onClick={() => saveException({ group: "prn", medId: medId(m), medName: m.name, type: "prn", note: "" })}
                  style={{ background: "rgba(79,142,247,.12)", border: `1px solid ${C.blue}40`, borderRadius: 8, padding: "5px 10px", color: C.blue, fontSize: 10, fontFamily: mono, cursor: "pointer" }}>
                  Took one
                </button>
              )}
            </div>
          ))}
        </Card>
      )}

      {/* Exception path — the ONLY place a single drug gets named */}
      {canFlag && !showException && (
        <button onClick={() => setShowException(true)} style={{ width: "100%", padding: 10, background: "none", border: `1px dashed ${C.b1}`, borderRadius: 8, color: C.dim, fontSize: 12, fontFamily: mono, cursor: "pointer", marginBottom: 12 }}>
          Something off? Flag a skipped / late / reaction
        </button>
      )}
      {showException && <ExceptionForm groups={groups} prn={prn} onSave={saveException} onCancel={() => setShowException(false)} />}

      {/* Today's flagged exceptions */}
      {exceptions.length > 0 && (
        <Card>
          <SL>Today’s Exceptions</SL>
          {exceptions.map(e => (
            <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${C.b2}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: C.p }}>{e.medName}</div>
                <div style={{ fontSize: 10, color: C.amber, fontFamily: mono }}>{EXCEPTION_TYPES.find(t => t.key === e.type)?.label || e.type}{e.note ? ` — ${e.note}` : ""}</div>
              </div>
              <button onClick={() => dropException(e.id)} style={{ background: "none", border: "none", color: C.ghost, cursor: "pointer", fontSize: 13 }}>✕</button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// Collapsible med list inside a group (morning can be large)
function GroupMeds({ meds }) {
  const [open, setOpen] = useState(false);
  const shown = open ? meds : meds.slice(0, 4);
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {shown.map(m => (
          <span key={medId(m)} style={{ fontSize: 11, color: C.dim, background: C.bg, border: `1px solid ${C.b2}`, borderRadius: 6, padding: "3px 8px" }}>
            {m.name}{m.dose ? ` ${m.dose}` : ""}
          </span>
        ))}
      </div>
      {meds.length > 4 && (
        <button onClick={() => setOpen(o => !o)} style={{ background: "none", border: "none", color: C.blue, fontSize: 10, fontFamily: mono, cursor: "pointer", padding: "6px 0 0" }}>
          {open ? "Show less" : `+${meds.length - 4} more`}
        </button>
      )}
    </div>
  );
}

// Exception capture: type → which med → optional note. Drug naming only here.
function ExceptionForm({ groups, prn, onSave, onCancel }) {
  const allMeds = [...groups.flatMap(g => g.meds), ...prn];
  const [type, setType] = useState("skipped");
  const [mid, setMid] = useState(allMeds[0] ? medId(allMeds[0]) : "");
  const [note, setNote] = useState("");
  const chosen = allMeds.find(m => medId(m) === mid);

  return (
    <Card style={{ marginBottom: 12, border: `1px solid ${C.amber}40` }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 13, color: C.p, fontWeight: 600 }}>Flag an exception</div>
        <button onClick={onCancel} style={{ marginLeft: "auto", background: "none", border: "none", color: C.ghost, cursor: "pointer", fontSize: 18 }}>✕</button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {EXCEPTION_TYPES.map(t => (
          <button key={t.key} onClick={() => setType(t.key)}
            style={{ padding: "6px 10px", borderRadius: 6, border: `1.5px solid ${type === t.key ? C.amber : C.b2}`, background: type === t.key ? C.amber + "22" : "transparent", color: type === t.key ? C.amber : C.dim, fontSize: 11, fontFamily: mono, cursor: "pointer" }}>
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 9, color: C.dim, fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Which medication</div>
      <select value={mid} onChange={e => setMid(e.target.value)}
        style={{ width: "100%", background: C.bg, border: `1px solid ${C.b1}`, borderRadius: 6, padding: "8px 10px", color: C.p, fontSize: 12, marginBottom: 10, boxSizing: "border-box" }}>
        {allMeds.map(m => <option key={medId(m)} value={medId(m)}>{m.name}{m.dose ? ` ${m.dose}` : ""}</option>)}
      </select>
      <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional)"
        style={{ width: "100%", background: C.bg, border: `1px solid ${C.b1}`, borderRadius: 6, padding: "8px 10px", color: C.p, fontSize: 12, marginBottom: 10, boxSizing: "border-box", outline: "none" }} />
      <Btn onClick={() => chosen && onSave({ group: "exception", medId: mid, medName: chosen.name, type, note })} color={C.amber} disabled={!chosen}>Save exception</Btn>
    </Card>
  );
}
