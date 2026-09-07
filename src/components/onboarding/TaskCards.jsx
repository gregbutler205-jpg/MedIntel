// ── Ongoing task cards (ONBOARDING_SPEC v1.1 §7, §8) ─────────────────────────
// Dashboard surface for the deterministic task engine. Max 4 visible,
// priority-ordered, benefit stated before the ask, dismiss/snooze on every
// card, and NO completion percentage anywhere. T9 renders the §8 storage
// prompt with its exact copy.

import { useEffect, useState } from "react";
import { visibleTasks, dismissTask, snoozeTask } from "../../lib/taskEngine.js";
import { saveState } from "../../lib/onboardingState.js";

const card = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6 };
const ctaBtn = { minHeight: 36, padding: "7px 16px", background: "var(--btn-p-bg)", border: "1px solid var(--btn-p-bd)", borderRadius: 8, color: "var(--btn-p-fg)", fontFamily: "var(--font-sans)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" };
const quietBtn = { background: "none", border: "none", color: "var(--text-dim)", fontSize: 12, cursor: "pointer", fontFamily: "var(--font-sans)", padding: "4px 8px", minHeight: 30 };

export default function TaskCards({ onNav }) {
  const [tasks, setTasks] = useState(() => visibleTasks());
  const refresh = () => setTasks(visibleTasks());

  // §7: evaluated on app open and after record writes — mount, window focus,
  // and the app's data events all re-evaluate.
  useEffect(() => {
    const h = () => refresh();
    window.addEventListener("focus", h);
    window.addEventListener("mi-data-synced", h);
    window.addEventListener("insina-tasks-changed", h);
    return () => {
      window.removeEventListener("focus", h);
      window.removeEventListener("mi-data-synced", h);
      window.removeEventListener("insina-tasks-changed", h);
    };
  }, []);

  if (tasks.length === 0) return null;

  const go = (task) => {
    if (task.route === "onboarding:2") {
      // T6/T2-tier0: re-enter onboarding at Quick Start Basics via the resume rail.
      saveState({ phase: 2 });
      window.dispatchEvent(new Event("insina-reopen-onboarding"));
      return;
    }
    onNav?.(task.route);
  };

  return (
    <div className="ob-focus" style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
      <div style={{ fontSize: 12, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--text-label)", fontFamily: "var(--font-mono)" }}>
        Next steps
      </div>
      {tasks.map(t => t.storagePrompt ? (
        /* §8 storage prompt — exact copy */
        <div key={t.key} style={{ ...card, border: "1px solid rgba(79,142,247,.35)" }}>
          <div style={{ fontSize: 13.5, color: "var(--text-bright)", fontWeight: 700 }}>{t.benefit}</div>
          <div style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.65 }}>{t.reason}</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 4 }}>
            <button style={ctaBtn} onClick={() => go(t)}>{t.ctaLabel}</button>
            <button style={quietBtn} onClick={() => { snoozeTask(t.key); refresh(); }}>{t.laterLabel}</button>
          </div>
        </div>
      ) : (
        <div key={t.key} style={card}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{ flex: 1 }}>
              {/* benefit before ask (§7) */}
              <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{t.benefit}</div>
              <div style={{ fontSize: 13.5, color: "var(--text-bright)", fontWeight: 600, marginTop: 3 }}>{t.reason}</div>
            </div>
            <button aria-label="Dismiss this task" onClick={() => { dismissTask(t.key); refresh(); }}
              style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: 13, minWidth: 30, minHeight: 30 }}>✕</button>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button style={ctaBtn} onClick={() => go(t)}>{t.ctaLabel}</button>
            <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-dim)" }}>~{t.minutes} min</span>
            <button style={quietBtn} onClick={() => { snoozeTask(t.key); refresh(); }}>Snooze a week</button>
          </div>
        </div>
      ))}
    </div>
  );
}
