// ── Welcome + consent screen (ONBOARDING_SPEC v1.1 §3.0, §9.2, §9.3) ─────────
// Precedes Phase 1. The checkbox satisfies the AI-processing consent for the
// whole product; nothing may call /extract until it is granted. Copy in the
// §9 blocks is exact — deviations are build errors.

import { useState } from "react";
import PrivacyFooter, { MedicalDisclaimer } from "./PrivacyFooter.jsx";

// Light header carries the color shield mark (INSINA_UI_FORMAT_SPEC §2) —
// the white lockup would vanish on the light ground.
const LOGO = import.meta.env.BASE_URL + "shield_logo.png";

export default function WelcomeConsent({ onContinue }) {
  const [checked, setChecked] = useState(false);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center", display: "flex", flexDirection: "column", gap: 22 }}>
      <img src={LOGO} alt="Insina Health" style={{ height: 46, alignSelf: "center", width: "auto" }} />

      <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 30, fontWeight: 400, color: "var(--text-bright)", letterSpacing: "-0.5px", lineHeight: 1.3 }}>
        Get a useful result in 10–15 minutes. Build your record at your pace.
      </h1>

      <PrivacyFooter />
      <MedicalDisclaimer />

      {/* §9.2 AI-processing consent, above the checkbox — banner treatment */}
      <div style={{ background: "var(--banner-bg)", border: "1px solid var(--banner-bd)", borderRadius: 14, padding: "18px 20px", textAlign: "left" }}>
        <p style={{ fontSize: 12.5, lineHeight: 1.7, color: "var(--text-secondary)", marginBottom: 14 }}>
          Insina uses AI to read the documents and photos you add and to help you prepare for
          appointments. When you use these features, the relevant content is transmitted securely
          to our AI processing service and returned to your device. It is not used to train AI
          models and is not stored by Insina.
        </p>
        <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", minHeight: "var(--touch-target)" }}>
          <input
            type="checkbox"
            checked={checked}
            onChange={e => setChecked(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: "var(--accent)", flexShrink: 0 }}
          />
          <span style={{ fontSize: 14, color: "var(--text-primary)" }}>I understand how my data is handled.</span>
        </label>
      </div>

      <button
        onClick={() => { if (checked) onContinue(); }}
        disabled={!checked}
        style={{
          alignSelf: "center", minHeight: "var(--touch-target)", padding: "12px 44px",
          background: checked ? "var(--btn-p-bg)" : "var(--card)",
          border: `1px solid ${checked ? "var(--btn-p-bd)" : "var(--border-strong)"}`,
          borderRadius: 10, color: checked ? "var(--btn-p-fg)" : "var(--text-dim)",
          fontFamily: "var(--font-sans)", fontSize: 15, fontWeight: 600,
          cursor: checked ? "pointer" : "not-allowed",
        }}
      >
        Continue
      </button>
    </div>
  );
}
