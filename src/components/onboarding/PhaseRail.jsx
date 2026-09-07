// ── Onboarding progress (INSINA_UI_FORMAT_SPEC v1.0 §8; ONBOARDING_SPEC C4) ──
// The DM Mono "STEP N OF 5" eyebrow with a slim progress bar replaces the
// earlier five-node rail (Greg's light-system direction; supersedes the
// ONBOARDING_SPEC §8 signature-element wording — logged as a DEC). Still the
// ONLY step numbering in onboarding: every screen shows "Step n of 5".

const TOTAL = 5;

export default function PhaseRail({ current }) {
  return (
    <div aria-label={`Step ${current} of 5`} style={{ width: "100%", maxWidth: 470, margin: "0 auto 8px", textAlign: "center" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "2px", color: "var(--accent-blue)" }}>
        STEP {current} OF {TOTAL}
      </div>
      <div aria-hidden="true" style={{ height: 3, background: "var(--accent-tint)", borderRadius: 999, marginTop: 10, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${(current / TOTAL) * 100}%`, background: "var(--accent)", borderRadius: 999, transition: "width .4s ease" }} />
      </div>
    </div>
  );
}
