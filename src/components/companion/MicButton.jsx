// ── MicButton — tap to dictate via Web Speech API. Renders nothing where the API
// is unavailable (e.g. iOS Safari), so callers can drop it in unconditionally;
// on those devices the keyboard's built-in dictation mic handles text fields.
import { useRef, useState } from "react";
import { C } from "./companionUI.jsx";
import { speechSupported, createRecognizer } from "../../lib/speech.js";

export default function MicButton({ onText, size = 18 }) {
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);
  if (!speechSupported()) return null;

  function toggle() {
    if (listening) { recRef.current?.stop(); return; }
    const rec = createRecognizer({
      onResult: ({ final }) => { if (final) onText?.(final); },
      onEnd: () => { setListening(false); recRef.current = null; },
      onError: () => { setListening(false); recRef.current = null; },
    });
    if (!rec) return;
    recRef.current = rec;
    setListening(true);
    try { rec.start(); } catch { setListening(false); }
  }

  return (
    <button onClick={toggle} title={listening ? "Listening… tap to stop" : "Dictate"}
      style={{
        flexShrink: 0, width: size + 18, height: size + 18, borderRadius: "50%",
        background: listening ? "rgba(239,68,68,.18)" : "rgba(79,142,247,.12)",
        border: `1px solid ${listening ? C.red : C.blue}55`,
        color: listening ? C.red : C.blue, fontSize: size, lineHeight: 1, cursor: "pointer",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        animation: listening ? "micPulse 1s ease-in-out infinite" : "none",
      }}>
      🎤
      <style>{`@keyframes micPulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </button>
  );
}
