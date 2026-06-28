// ── Insurance & ID Cards — photograph, store, and share cards on the go. ───────
// Same mi_cards record as the web app, so cards added here sync both ways.
import { useState } from "react";
import { C, mono, sans, Card, BackBar, Btn, Empty } from "../companionUI.jsx";
import { getCards, setCards, blankCard, compressImage, shareImageDataUrl } from "../../../lib/cards.js";

export default function Cards({ onBack, queueSync }) {
  const [cards, setCardsState] = useState(() => getCards());
  const [editing, setEditing] = useState(null);   // card being added/edited
  const [viewing, setViewing] = useState(null);    // { card, side }

  function persist(updated) {
    try { setCards(updated); setCardsState(updated); queueSync?.(); return true; }
    catch { return false; }
  }
  function save(entry) {
    const updated = entry.id && cards.find(c => c.id === entry.id)
      ? cards.map(c => c.id === entry.id ? entry : c)
      : [...cards, entry];
    return persist(updated);
  }
  function remove(id) { persist(cards.filter(c => c.id !== id)); }

  if (viewing) return <Viewer card={viewing.card} side={viewing.side} onClose={() => setViewing(null)} />;
  if (editing) return <Editor card={editing} onSave={e => { if (save(e)) setEditing(null); }} onCancel={() => setEditing(null)} onError={() => {}} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, background: C.bg }}>
      <BackBar title="Insurance & ID Cards" onBack={onBack}
        right={<button onClick={() => setEditing({ ...blankCard() })} style={{ background: "rgba(79,142,247,.15)", border: `1px solid ${C.blue}4d`, borderRadius: 8, color: C.blue, fontSize: 12, fontFamily: mono, padding: "6px 12px", cursor: "pointer" }}>+ Add</button>} />
      <div style={{ overflowY: "auto", padding: 16 }}>
        {cards.length === 0
          ? <Empty>No cards yet.<br />Tap “+ Add” to photograph<br />an insurance or ID card.</Empty>
          : cards.map(c => (
            <Card key={c.id} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 14, color: C.p, fontWeight: 600 }}>{c.label}</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => setEditing(c)} style={iconBtn}>✎</button>
                  <button onClick={() => { if (confirm(`Delete "${c.label}"?`)) remove(c.id); }} style={{ ...iconBtn, color: C.red }}>✕</button>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {["front", "back"].map(side => (
                  <div key={side} style={{ flex: 1 }}>
                    <div style={{ fontSize: 9, color: C.ghost, fontFamily: mono, textTransform: "uppercase", marginBottom: 4 }}>{side}</div>
                    {c[side]
                      ? <img src={c[side]} alt={side} onClick={() => setViewing({ card: c, side })} style={{ width: "100%", borderRadius: 8, border: `1px solid ${C.b2}`, display: "block" }} />
                      : <div style={{ padding: "20px 0", textAlign: "center", border: `1px dashed ${C.b2}`, borderRadius: 8, color: C.ghost, fontSize: 10, fontFamily: mono }}>none</div>}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10 }}>
                <Btn onClick={() => setViewing({ card: c, side: c.front ? "front" : "back" })}>View &amp; Share</Btn>
              </div>
            </Card>
          ))}
        <div style={{ fontSize: 9, color: C.ghost, fontFamily: mono, textAlign: "center", padding: "8px 0 20px" }}>Syncs with the web app · stored in your record</div>
      </div>
    </div>
  );
}

const iconBtn = { background: "transparent", border: `1px solid ${C.b2}`, borderRadius: 7, color: C.dim, fontSize: 12, padding: "4px 9px", cursor: "pointer" };

// ── Add / edit one card ───────────────────────────────────────────────────────
function Editor({ card, onSave, onCancel }) {
  const [form, setForm] = useState({ ...blankCard(), ...card });
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  async function pick(side, file) {
    if (!file) return;
    setBusy(side); setErr("");
    try { const dataUrl = await compressImage(file); setForm(f => ({ ...f, [side]: dataUrl })); }
    catch { setErr("Couldn’t read that image."); }
    finally { setBusy(""); }
  }

  const Uploader = ({ side }) => {
    const id = `cc-${side}`;
    return (
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 9, color: C.ghost, fontFamily: mono, textTransform: "uppercase", marginBottom: 4 }}>{side}</div>
        <input id={id} type="file" accept="image/*" capture="environment" style={{ display: "none" }}
          onChange={e => { pick(side, e.target.files?.[0]); e.target.value = ""; }} />
        {form[side]
          ? <div>
              <img src={form[side]} alt={side} style={{ width: "100%", borderRadius: 8, border: `1px solid ${C.b1}`, display: "block" }} />
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <button onClick={() => document.getElementById(id).click()} style={{ ...iconBtn, flex: 1 }}>Replace</button>
                <button onClick={() => setForm(f => ({ ...f, [side]: "" }))} style={{ ...iconBtn, flex: 1, color: C.red }}>Remove</button>
              </div>
            </div>
          : <button onClick={() => document.getElementById(id).click()} disabled={busy === side}
              style={{ width: "100%", padding: "24px 0", background: C.bg, border: `1px dashed ${C.b1}`, borderRadius: 8, color: busy === side ? C.ghost : C.s, fontSize: 12, fontFamily: sans, cursor: "pointer" }}>
              {busy === side ? "Processing…" : "📷 Photo"}
            </button>}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, background: C.bg }}>
      <BackBar title={card?.id ? "Edit Card" : "Add Card"} onBack={onCancel} />
      <div style={{ overflowY: "auto", padding: 16 }}>
        <Card>
          <div style={{ fontSize: 9, color: C.ghost, fontFamily: mono, textTransform: "uppercase", marginBottom: 5 }}>Card Name</div>
          <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Primary Insurance"
            style={{ width: "100%", background: C.bg, border: `1px solid ${C.b1}`, borderRadius: 8, padding: "10px 12px", color: C.p, fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 14 }} />
          <div style={{ display: "flex", gap: 10 }}>
            <Uploader side="front" />
            <Uploader side="back" />
          </div>
          {err && <div style={{ fontSize: 11, color: C.red, fontFamily: mono, marginTop: 10 }}>{err}</div>}
          <div style={{ marginTop: 16 }}>
            <Btn color={C.green} onClick={() => {
              if (!form.label.trim()) { setErr("Give the card a name."); return; }
              if (!form.front && !form.back) { setErr("Add at least one photo."); return; }
              onSave({ ...form, label: form.label.trim() });
            }}>Save Card</Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── Full-screen viewer + share ────────────────────────────────────────────────
function Viewer({ card, side, onClose }) {
  const [view, setView] = useState(side || (card.front ? "front" : "back"));
  const [note, setNote] = useState("");
  const img = view === "front" ? card.front : card.back;
  async function share() {
    const how = await shareImageDataUrl(img, `${card.label || "card"}-${view}.jpg`, `${card.label} (${view})`);
    if (how === "downloaded") setNote("Saved to your device.");
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, background: "#000" }}>
      <BackBar title={card.label} onBack={onClose} />
      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {img
          ? <img src={img} alt={view} style={{ width: "100%", borderRadius: 10, display: "block" }} />
          : <Empty>No {view} image</Empty>}
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          {card.front && card.back && (
            <Btn color={C.dim} onClick={() => setView(v => v === "front" ? "back" : "front")}>Show {view === "front" ? "Back" : "Front"}</Btn>
          )}
          {img && <Btn onClick={share}>⤴ Share / Send</Btn>}
        </div>
        {note && <div style={{ fontSize: 10, color: C.ghost, fontFamily: mono, textAlign: "center", marginTop: 10 }}>{note}</div>}
      </div>
    </div>
  );
}
