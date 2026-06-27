// ─────────────────────────────────────────────────────────────────────────────
// speech.js — Thin wrapper over the Web Speech API (SpeechRecognition). Available
// on Chrome (desktop/Android); NOT reliably on iOS Safari, where the on-screen
// keyboard's dictation mic covers text fields instead. Callers should hide voice
// affordances when speechSupported() is false.
// ─────────────────────────────────────────────────────────────────────────────

export function speechSupported() {
  return typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/** Create a one-shot recognizer. Returns null if unsupported. */
export function createRecognizer({ onResult, onError, onEnd } = {}) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const rec = new SR();
  rec.lang = "en-US";
  rec.interimResults = true;
  rec.continuous = false;
  rec.onresult = (e) => {
    let final = "", interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) final += t; else interim += t;
    }
    onResult?.({ final, interim });
  };
  rec.onerror = (e) => onError?.(e);
  rec.onend = () => onEnd?.();
  return rec;
}
