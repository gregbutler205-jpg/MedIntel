// ── AI Analysis (Lite) — quick, record-grounded answers on the go. ─────────────
// Runs through the SAME proxy as the web app (no client API key). Long, multi-
// step analysis sessions stay on the web.
import { useState, useRef, useEffect } from "react";
import { C, mono, sans } from "../companionUI.jsx";
import MicButton from "../MicButton.jsx";
import { askInsinaStream, buildRecordSystem } from "../../../lib/companionAI.js";

const PROMPTS = [
  "Summarize my current status",
  "Prep questions for my next appointment",
  "How is my tacrolimus trend?",
];

export default function AILite({ initialPrompt, onPromptConsumed }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef(null);
  const bottomRef = useRef(null);
  const sentInitialRef = useRef(false);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Auto-send a prompt handed off from another screen (e.g. "Ask Insina" on a symptom).
  useEffect(() => {
    if (initialPrompt && !sentInitialRef.current) {
      sentInitialRef.current = true;
      send(initialPrompt);
      onPromptConsumed?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);

  async function send(q) {
    const text = (q ?? input).trim();
    if (!text || streaming) return;
    setError("");
    const next = [...messages, { role: "user", text }];
    setMessages([...next, { role: "assistant", text: "", streaming: true }]);
    setInput(""); setStreaming(true);
    const ctrl = new AbortController(); abortRef.current = ctrl;
    try {
      await askInsinaStream({
        system: buildRecordSystem(),
        messages: next,
        signal: ctrl.signal,
        onDelta: (_chunk, accum) => setMessages(prev => { const c = [...prev]; c[c.length - 1] = { role: "assistant", text: accum, streaming: true }; return c; }),
      }).then(full => setMessages(prev => { const c = [...prev]; c[c.length - 1] = { role: "assistant", text: full }; return c; }));
    } catch (e) {
      if (e.name === "AbortError") setMessages(prev => { const c = [...prev]; c[c.length - 1] = { role: "assistant", text: c[c.length - 1].text || "_(stopped)_" }; return c; });
      else { setError(e.message); setMessages(prev => { const c = [...prev]; c[c.length - 1] = { role: "assistant", text: `Error: ${e.message}` }; return c; }); }
    } finally { setStreaming(false); abortRef.current = null; }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", paddingTop: 28 }}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>✦</div>
            <div style={{ fontSize: 13, color: C.s, marginBottom: 3 }}>Ask a quick health question</div>
            <div style={{ fontSize: 10, color: C.ghost, fontFamily: mono, marginBottom: 20 }}>Grounded in your record · informational only</div>
            {PROMPTS.map(q => (
              <button key={q} onClick={() => send(q)} style={{ display: "block", width: "100%", margin: "7px 0", textAlign: "left", background: C.card, border: `1px solid ${C.b2}`, borderRadius: 8, padding: "11px 13px", color: C.s, fontSize: 12, fontFamily: sans, cursor: "pointer" }}>{q}</button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 12, display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "85%", padding: "10px 13px", borderRadius: 12, background: m.role === "user" ? "rgba(79,142,247,.15)" : C.card, border: `1px solid ${m.role === "user" ? "rgba(79,142,247,.3)" : C.b2}`, fontSize: 12, color: C.p, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
              {m.text || (m.streaming ? <span style={{ color: C.ghost }}>✦ thinking…</span> : "")}
            </div>
          </div>
        ))}
        {error && <div style={{ fontSize: 11, color: C.red, fontFamily: mono, marginBottom: 8 }}>{error}</div>}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: "10px 16px 16px", borderTop: `1px solid ${C.b2}`, background: C.card, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <MicButton onText={t => setInput(prev => (prev ? prev + " " : "") + t)} />
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
            placeholder="Ask or dictate a question…"
            style={{ flex: 1, minWidth: 0, background: C.bg, border: `1px solid ${C.b1}`, borderRadius: 20, padding: "9px 14px", color: C.p, fontSize: 12, fontFamily: sans, outline: "none" }} />
          {streaming
            ? <button onClick={() => abortRef.current?.abort()} style={{ background: "rgba(239,68,68,.15)", border: `1px solid rgba(239,68,68,.3)`, borderRadius: 20, padding: "9px 14px", color: C.red, fontSize: 11, fontFamily: mono, cursor: "pointer" }}>Stop</button>
            : <button onClick={() => send()} disabled={!input.trim()} style={{ background: "rgba(79,142,247,.15)", border: `1px solid rgba(79,142,247,.3)`, borderRadius: 20, padding: "9px 16px", color: C.blue, fontSize: 11, fontFamily: mono, cursor: "pointer", opacity: input.trim() ? 1 : 0.4 }}>Send</button>}
        </div>
      </div>
    </div>
  );
}
