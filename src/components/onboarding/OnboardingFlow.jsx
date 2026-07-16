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
import Phase3AddData from "./Phase3AddData.jsx";
import ManualEntry from "./ManualEntry.jsx";
import PrivacyFooter from "./PrivacyFooter.jsx";
import { loadState, saveState, resetStateKeepConsent, shouldShowResumeBanner, TOTAL_PHASES, GOALS } from "../../lib/onboardingState.js";

// §3.5 empty-variant copy: the goal artifact's minimum needs, one sentence.
const ARTIFACT_MINIMUM_SENTENCE = {
  emergency_packet: "Your Emergency Card needs your transplant basics, at least one medication, and your allergies reviewed.",
  organize_meds: "Your Medication Report needs at least one confirmed medication.",
  track_meds_labs: "Your Medication Report needs at least one confirmed medication.",
  patient_profile: "Your Patient Profile needs your basics, medications, allergies, and at least one condition.",
  appointment_prep: "Your Consultation Prep Brief needs your medications, allergies, and one upcoming appointment.",
};

export default function OnboardingFlow({ onExit }) {
  const [state, setState] = useState(() => loadState() || saveState({}));
  const [resumeOffer, setResumeOffer] = useState(() => shouldShowResumeBanner());
  const [entered, setEntered] = useState(!shouldShowResumeBanner());
  const [subview, setSubview] = useState(null);         // null | "manual" (inside Phase 3)
  const [manualSummary, setManualSummary] = useState(null);

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

            {state.phase === 3 && subview === "manual" && (
              <ManualEntry
                onDone={({ medCount, allergyCount }) => {
                  setSubview(null);
                  const parts = [];
                  if (medCount) parts.push(`${medCount} medication${medCount !== 1 ? "s" : ""}`);
                  if (allergyCount) parts.push(`${allergyCount} allerg${allergyCount !== 1 ? "ies" : "y"}`);
                  setManualSummary(parts.length ? `${parts.join(" and ")} added to your record.` : null);
                }}
                onCancel={() => setSubview(null)}
              />
            )}

            {state.phase === 3 && subview !== "manual" && (
              <Phase3AddData
                onContinue={() => advance({}, 4)}
                onManualEntry={() => setSubview("manual")}
                onSkipEverything={() => advance({}, 5)}
                manualSummary={manualSummary}
              />
            )}

            {state.phase === 4 && (
              /* WP3 landing zone: Review & Confirm (§3.4). */
              <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center", display: "flex", flexDirection: "column", gap: 16 }}>
                <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 24, fontWeight: 400, color: "var(--text-bright)" }}>
                  Review &amp; Confirm
                </h1>
                {Object.keys(state.staged_counts || {}).length > 0 && (
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8 }}>
                    Waiting for your review:{" "}
                    {Object.entries(state.staged_counts).map(([k, n]) => `${n} ${k.replace("_", " ")}`).join(" · ")}
                  </p>
                )}
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                  The review screens are being built (work package 3). Staged items are saved and
                  never appear in your record or reports until you confirm them.
                </p>
                <button onClick={() => advance({}, 5)}
                  style={{ alignSelf: "center", minHeight: "var(--touch-target)", padding: "10px 32px", background: "rgba(79,142,247,.18)", border: "1px solid rgba(79,142,247,.45)", borderRadius: 10, color: "var(--accent-soft)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                  Continue
                </button>
              </div>
            )}

            {state.phase >= 5 && (
              <Phase5Interim state={state} onManualEntry={() => { setState(saveState({ phase: 3 })); setSubview("manual"); }} onFinish={finish} />
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

// §3.5 Phase 5 — WP4 builds the real artifact screen; until then the
// "not enough data yet" empty variant is fully implemented (it's a §2 skip
// destination), and confirmed-data sessions get a clearly marked stub.
function Phase5Interim({ state, onManualEntry, onFinish }) {
  let hasMeds = false;
  try { hasMeds = JSON.parse(localStorage.getItem("mi_meds_full") || "[]").length > 0; } catch { /* locked */ }
  const goal = GOALS.find(g => g.id === state.goal) || GOALS[2];
  const btn = { alignSelf: "center", minHeight: "var(--touch-target)", padding: "10px 32px", background: "rgba(79,142,247,.18)", border: "1px solid rgba(79,142,247,.45)", borderRadius: 10, color: "var(--accent-soft)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" };
  const ghost = { alignSelf: "center", minHeight: "var(--touch-target)", padding: "10px 24px", background: "transparent", border: "1px solid var(--border-strong)", borderRadius: 10, color: "var(--text-secondary)", fontSize: 13, cursor: "pointer", fontFamily: "var(--font-sans)" };

  if (!hasMeds) {
    return (
      <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center", display: "flex", flexDirection: "column", gap: 16 }}>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 24, fontWeight: 400, color: "var(--text-bright)" }}>
          Not enough data yet for your {goal.artifact}
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
          {ARTIFACT_MINIMUM_SENTENCE[goal.id]}
        </p>
        <button onClick={onManualEntry} style={btn}>Enter medications directly</button>
        <button onClick={onFinish} style={ghost}>Go to my dashboard</button>
      </div>
    );
  }
  return (
    <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center", display: "flex", flexDirection: "column", gap: 16 }}>
      <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 24, fontWeight: 400, color: "var(--text-bright)" }}>
        Your First Result
      </h1>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
        The first-artifact engine arrives in work package 4 — your confirmed data is in your
        record now, and your {goal.artifact} will generate from it.
      </p>
      <button onClick={onFinish} style={btn}>Go to my dashboard</button>
    </div>
  );
}
