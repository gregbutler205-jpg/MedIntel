// ── Five-node progress rail (ONBOARDING_SPEC v1.1 §2, §8, C4) ────────────────
// The ONLY step numbering in onboarding: every screen shows "Step n of 5".
// Numbered nodes joined by a hairline that fills with the accent as phases
// complete; DM Mono labels beneath; current node ringed.

const PHASES = ["Goal", "Basics", "Add Data", "Review", "Result"];

export default function PhaseRail({ current }) {
  // current: 1..5 (the welcome/consent screen precedes Phase 1 and passes 1)
  return (
    <div aria-label={`Step ${current} of 5`} style={{ width: "100%", maxWidth: 560, margin: "0 auto 8px" }}>
      <div style={{ textAlign: "center", fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-mono)", letterSpacing: "1px", marginBottom: 14 }}>
        Step {current} of 5
      </div>
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        {PHASES.map((label, i) => {
          const n = i + 1;
          const done = n < current;
          const active = n === current;
          return (
            <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
              {/* hairline to the previous node */}
              {i > 0 && (
                <div aria-hidden="true" style={{ position: "absolute", top: 14, right: "50%", width: "100%", height: 1, background: done || active ? "var(--accent)" : "var(--border-strong)", zIndex: 0 }} />
              )}
              <div aria-hidden="true" style={{
                width: 28, height: 28, borderRadius: "50%", zIndex: 1,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontFamily: "var(--font-mono)",
                background: done ? "var(--accent)" : "var(--card)",
                color: done ? "#fff" : active ? "var(--accent)" : "var(--text-dim)",
                border: `1px solid ${done || active ? "var(--accent)" : "var(--border-strong)"}`,
                boxShadow: active ? "0 0 0 5px rgba(79,142,247,.15)" : "none",
              }}>
                {done ? "✓" : n}
              </div>
              <div style={{ marginTop: 8, fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: "0.5px", textTransform: "uppercase", color: active ? "var(--accent-soft)" : "var(--text-dim)", textAlign: "center", padding: "0 6px", whiteSpace: "nowrap" }}>
                {label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
