// ── Onboarding flow shell (ONBOARDING_SPEC v1.1 §2, §3.0–§3.2, §3.8) ─────────
// Renders after unlock on new installs (App.jsx gate). One linear five-phase
// rail; welcome/consent precedes Phase 1. State persists per §2 and resumes
// with the banner. Phases 3–5 land in WP2–WP4; this shell carries a clearly
// marked WP2 stub so the flow is reviewable end-to-end today.

import { useState } from "react";
import PhaseRail from "./PhaseRail.jsx";
import WelcomeConsent from "./WelcomeConsent.jsx";
import Phase1Goal from "./Phase1Goal.jsx";
import Phase2Basics from "./Phase2Basics.jsx";
import PrivacyFooter from "./PrivacyFooter.jsx";
import { loadState, saveState, resetStateKeepConsent, shouldShowResumeBanner, TOTAL_PHASES } from "../../lib/onboardingState.js";

export default function OnboardingFlow({ onExit }) {
  const [state, setState] = useState(() => loadState() || saveState({}));
  const [resumeOffer, setResumeOffer] = useState(() => shouldShowResumeBanner());
  const [entered, setEntered] = useState(!shouldShowResumeBanner());

  const advance = (patch, nextPhase) => {
    const completed = [...new Set([...(state.completed_steps || []), state.phase])].filter(n => n > 0);
    setState(saveState({ ...patch, phase: nextPhase, completed_steps: completed }));
  };

  const finish = () => {
    saveState({ phase: TOTAL_PHASES });
    onExit();
  };

  // Rail position: welcome (phase 0) previews step 1; phases map 1:1 after.
  const railStep = Math.max(1, Math.min(state.phase === 0 ? 1 : state.phase, TOTAL_PHASES));

  return (
    <div className="ob-root" style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <style>{`
        .ob-enter { animation: obFade .35s ease; }
        @media (prefers-reduced-motion: reduce) { .ob-enter { animation: none; } }
        @keyframes obFade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .ob-root button:focus-visible, .ob-root input:focus-visible, .ob-root select:focus-visible {
          outline: 2px solid var(--accent); outline-offset: 2px;
        }
      `}</style>

      {/* §2 resume banner */}
      {resumeOffer && (
        <div role="status" style={{ background: "var(--card)", borderBottom: "1px solid var(--border)", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "var(--text-primary)" }}>
            Pick up where you left off — Step {railStep} of 5
          </span>
          <button
            onClick={() => { setResumeOffer(false); setEntered(true); }}
            style={{ minHeight: 36, padding: "7px 18px", background: "rgba(79,142,247,.18)", border: "1px solid rgba(79,142,247,.45)", borderRadius: 8, color: "var(--accent-soft)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}
          >
            Continue
          </button>
          <button
            onClick={() => { setState(resetStateKeepConsent()); setResumeOffer(false); setEntered(true); }}
            style={{ minHeight: 36, padding: "7px 14px", background: "transparent", border: "1px solid var(--border-strong)", borderRadius: 8, color: "var(--text-secondary)", fontSize: 13, cursor: "pointer", fontFamily: "var(--font-sans)" }}
          >
            Start over
          </button>
        </div>
      )}

      <div style={{ flex: 1, padding: "36px 20px 24px", overflowY: "auto" }}>
        {entered && (
          <div className="ob-enter" key={state.phase} style={{ display: "flex", flexDirection: "column", gap: 30 }}>
            {state.phase > 0 && <PhaseRail current={railStep} />}

            {state.phase === 0 && (
              <WelcomeConsent
                onContinue={() => advance({ consents: { ai_processing: true, accepted_at: new Date().toISOString() } }, 1)}
              />
            )}

            {state.phase === 1 && (
              <Phase1Goal
                initialGoal={state.goal}
                onContinue={goal => advance({ goal }, 2)}
                onSkip={defaultGoal => advance({ goal: defaultGoal }, 2)}
              />
            )}

            {state.phase === 2 && (
              <Phase2Basics
                initialTier0={state.tier0}
                onContinue={tier0 => advance({ tier0 }, 3)}
                onSkip={() => advance({}, 3)} /* Tier 0 becomes §7 tasks (T6) */
              />
            )}

            {state.phase >= 3 && (
              /* WP2–WP4 landing zone: Add Data (§3.3), Review (§3.4), Result (§3.5). */
              <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center", display: "flex", flexDirection: "column", gap: 16 }}>
                <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 24, fontWeight: 400, color: "var(--text-bright)" }}>
                  Add Your Information
                </h1>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                  This step is being built (work package 2). Your progress so far is saved —
                  you can continue to your dashboard and pick onboarding back up later.
                </p>
                <button
                  onClick={finish}
                  style={{ alignSelf: "center", minHeight: "var(--touch-target)", padding: "10px 32px", background: "rgba(79,142,247,.18)", border: "1px solid rgba(79,142,247,.45)", borderRadius: 10, color: "var(--accent-soft)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}
                >
                  Go to my dashboard
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <footer style={{ padding: "16px 20px 22px", borderTop: "1px solid var(--divider)", textAlign: "center" }}>
        <PrivacyFooter />
      </footer>
    </div>
  );
}
