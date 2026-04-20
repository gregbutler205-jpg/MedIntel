import { useState } from "react";
import ConsentText, { printConsent } from "./PrintableConsent";
import { CONSENT_VERSION } from "../config/urgencyThresholds";

// ─────────────────────────────────────────────────────────────────────────────
// AIModeOnboardingModal
// First-run modal shown when insina_ai_mode is not set.
// Cannot be dismissed without making a choice.
// onConfirm(modeData) → called with the mode object ready to persist.
// ─────────────────────────────────────────────────────────────────────────────
export default function AIModeOnboardingModal({ onConfirm }) {
  const [selected, setSelected]       = useState("standard"); // "standard" | "advanced"
  const [consentChecked, setConsent]  = useState(false);
  const [showConsent, setShowConsent] = useState(false);

  const canConfirm = selected === "standard" || (selected === "advanced" && consentChecked);

  const handleConfirm = () => {
    if (!canConfirm) return;
    const now = new Date().toISOString();
    const modeData = {
      mode: selected,
      consentVersion: selected === "advanced" ? CONSENT_VERSION : null,
      consentDate: selected === "advanced" ? now : null,
      activatedDate: now,
    };
    onConfirm(modeData);
  };

  const handlePrintConsent = () => {
    printConsent({
      mode: "Advanced",
      consentDate: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      consentVersion: CONSENT_VERSION,
    });
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(7,9,15,.92)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 200,
      fontFamily: "'Sora', sans-serif",
    }}>
      <div style={{
        background: "#0b1220",
        border: "1px solid #1a2f4a",
        borderRadius: 16,
        padding: "32px 36px",
        width: 540,
        maxHeight: "90vh",
        overflowY: "auto",
        boxShadow: "0 24px 80px rgba(0,0,0,.7)",
        animation: "fadeUp .25s ease both",
      }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase",
            color: "#4f8ef7", fontFamily: "'DM Mono', monospace", marginBottom: 8,
          }}>AI Analysis Setup</div>
          <div style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 22, color: "#dde8f5", fontWeight: 400, lineHeight: 1.3,
          }}>Choose Your AI Mode</div>
          <div style={{ fontSize: 12, color: "#7eb8d8", marginTop: 8, lineHeight: 1.6 }}>
            Select how you would like the AI Analysis feature to work. You can change this
            at any time in Data &amp; Backup settings.
          </div>
        </div>

        {/* Mode Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>

          {/* Standard Mode */}
          <button
            onClick={() => setSelected("standard")}
            style={{
              textAlign: "left",
              padding: "16px 18px",
              background: selected === "standard" ? "rgba(16,185,129,.08)" : "#07090f",
              border: `1.5px solid ${selected === "standard" ? "#10b981" : "#1a2f4a"}`,
              borderRadius: 12,
              cursor: "pointer",
              transition: "all .15s",
              color: "#d4e2f0",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 16, height: 16, borderRadius: "50%",
                border: `2px solid ${selected === "standard" ? "#10b981" : "#1a2f4a"}`,
                background: selected === "standard" ? "#10b981" : "transparent",
                flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {selected === "standard" && (
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />
                )}
              </div>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#dde8f5" }}>Standard Mode</span>
              <span style={{
                fontSize: 9, fontFamily: "'DM Mono', monospace",
                background: "#10b98118", color: "#10b981",
                border: "1px solid #10b98130", borderRadius: 4, padding: "2px 7px",
                letterSpacing: "0.5px",
              }}>Recommended</span>
            </div>
            <div style={{ fontSize: 12, color: "#7eb8d8", lineHeight: 1.65, paddingLeft: 26 }}>
              Uses <strong style={{ color: "#c4d8ee" }}>Claude Sonnet</strong> for clear, well-reasoned health analysis.
              Flags critical lab values automatically. Ideal for day-to-day use.
              No additional consent required.
            </div>
          </button>

          {/* Advanced Mode */}
          <button
            onClick={() => setSelected("advanced")}
            style={{
              textAlign: "left",
              padding: "16px 18px",
              background: selected === "advanced" ? "rgba(79,142,247,.07)" : "#07090f",
              border: `1.5px solid ${selected === "advanced" ? "#4f8ef7" : "#1a2f4a"}`,
              borderRadius: 12,
              cursor: "pointer",
              transition: "all .15s",
              color: "#d4e2f0",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 16, height: 16, borderRadius: "50%",
                border: `2px solid ${selected === "advanced" ? "#4f8ef7" : "#1a2f4a"}`,
                background: selected === "advanced" ? "#4f8ef7" : "transparent",
                flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {selected === "advanced" && (
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />
                )}
              </div>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#dde8f5" }}>Advanced Mode</span>
              <span style={{
                fontSize: 9, fontFamily: "'DM Mono', monospace",
                background: "#4f8ef718", color: "#4f8ef7",
                border: "1px solid #4f8ef730", borderRadius: 4, padding: "2px 7px",
                letterSpacing: "0.5px",
              }}>Claude Opus</span>
            </div>
            <div style={{ fontSize: 12, color: "#7eb8d8", lineHeight: 1.65, paddingLeft: 26 }}>
              Uses <strong style={{ color: "#c4d8ee" }}>Claude Opus</strong> for deeper, more thorough analysis
              with richer cross-referencing of your health data. Requires informed consent.
              Your data is processed via Insina's zero-logging proxy.
            </div>
          </button>
        </div>

        {/* Consent section — only shown when Advanced is selected */}
        {selected === "advanced" && (
          <div style={{
            background: "#07090f",
            border: "1px solid #1a2f4a",
            borderRadius: 10,
            padding: "16px 18px",
            marginBottom: 20,
          }}>
            <div style={{
              fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase",
              color: "#a0b4c8", fontFamily: "'DM Mono', monospace", marginBottom: 10,
            }}>Informed Consent Required</div>

            {/* Toggle consent text */}
            <button
              onClick={() => setShowConsent(p => !p)}
              style={{
                background: "none", border: "none",
                color: "#4f8ef7", fontSize: 11,
                fontFamily: "'DM Mono', monospace",
                cursor: "pointer", padding: 0, marginBottom: 10,
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              {showConsent ? "▾" : "▸"} {showConsent ? "Hide" : "Read"} consent details
            </button>

            {showConsent && (
              <div style={{
                maxHeight: 220, overflowY: "auto",
                background: "#0b1220", border: "1px solid #111e30",
                borderRadius: 8, padding: "12px 14px", marginBottom: 12,
              }}>
                <ConsentText />
              </div>
            )}

            {/* Checkbox */}
            <label style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              cursor: "pointer", marginBottom: 12,
            }}>
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={e => setConsent(e.target.checked)}
                style={{ marginTop: 2, width: 14, height: 14, accentColor: "#4f8ef7", flexShrink: 0 }}
              />
              <span style={{ fontSize: 12, color: "#a8c4dc", lineHeight: 1.6 }}>
                I have read and understand the consent document. I agree that my health data
                may be processed by the Anthropic API to generate AI responses, and I understand
                this is informational only and not a substitute for medical advice.
              </span>
            </label>

            {/* Print consent link */}
            <button
              onClick={handlePrintConsent}
              style={{
                background: "none", border: "none",
                color: "#98afc4", fontSize: 10,
                fontFamily: "'DM Mono', monospace",
                cursor: "pointer", padding: 0,
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              ⎙ Print / save this consent document
            </button>
          </div>
        )}

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          disabled={!canConfirm}
          style={{
            width: "100%",
            padding: "12px 0",
            background: canConfirm
              ? (selected === "advanced" ? "rgba(79,142,247,.15)" : "rgba(16,185,129,.12)")
              : "rgba(255,255,255,.04)",
            border: `1px solid ${canConfirm
              ? (selected === "advanced" ? "rgba(79,142,247,.4)" : "rgba(16,185,129,.4)")
              : "#1a2f4a"}`,
            borderRadius: 10,
            color: canConfirm
              ? (selected === "advanced" ? "#4f8ef7" : "#10b981")
              : "#4a5c6a",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "'Sora', sans-serif",
            cursor: canConfirm ? "pointer" : "not-allowed",
            transition: "all .15s",
          }}
        >
          {selected === "standard"
            ? "Start with Standard Mode"
            : consentChecked
              ? "Enable Advanced Mode"
              : "Check consent box above to continue"}
        </button>

        <div style={{
          fontSize: 10, color: "#4a5c6a",
          fontFamily: "'DM Mono', monospace",
          textAlign: "center", marginTop: 12, lineHeight: 1.5,
        }}>
          This choice is saved locally. You can change modes anytime in Data &amp; Backup.
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}
