// ── Password input with show/hide toggle (WO-5) ──────────────────────────────
// Used on the sign-in (lock) screen and the change-password form. The toggle
// is a real button: keyboard focusable, Enter/Space toggles, aria-label and
// aria-pressed track state. Visibility never persists and defaults to hidden.

import { useState } from "react";

const EYE = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const EYE_OFF = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export default function PasswordInput({ style, ...inputProps }) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: "relative", width: "100%" }}>
      <input
        {...inputProps}
        type={visible ? "text" : "password"}
        style={{ ...style, width: "100%", paddingRight: 40, boxSizing: "border-box" }}
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        style={{
          position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
          width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
          background: "none", border: "none", cursor: "pointer", padding: 0,
          color: "#8fabc7", borderRadius: 6,
        }}
        onMouseEnter={e => { e.currentTarget.style.color = "#7eb8d8"; }}
        onMouseLeave={e => { e.currentTarget.style.color = "#8fabc7"; }}
      >
        {visible ? EYE_OFF : EYE}
      </button>
    </div>
  );
}
