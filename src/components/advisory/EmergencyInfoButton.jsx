// ── DEC-PNN pending: tripwire advisory — persistent Emergency Info button (§5) ─
// Always enabled, regardless of TRIPWIRE_ADVISORY_ENABLED. Opens the Emergency
// Info screen (911, directions to the nearest ED, call coordinator, Emergency
// Card) with no triggering value. Ships in two places per Greg: the shared
// sidebar and the topbar. `variant` picks the styling for each host.

import { openEmergencyInfo } from "../../lib/advisoryRuntime.js";

export default function EmergencyInfoButton({ variant = "sidebar" }) {
  if (variant === "topbar") {
    return (
      <button
        onClick={openEmergencyInfo}
        aria-label="Emergency Info"
        title="Emergency Info"
        style={{
          display: "inline-flex", alignItems: "center", gap: 7, minHeight: 34, padding: "6px 12px",
          background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.4)", borderRadius: 8,
          color: "var(--red)", fontFamily: "var(--font-sans)", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
        }}
      >
        <span aria-hidden="true">✚</span> Emergency
      </button>
    );
  }
  return (
    <button
      onClick={openEmergencyInfo}
      aria-label="Emergency Info"
      style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 40, padding: "9px 12px",
        background: "rgba(239,68,68,.10)", border: "1px solid rgba(239,68,68,.35)", borderRadius: 8,
        color: "var(--red)", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, cursor: "pointer",
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 15 }}>✚</span> Emergency Info
    </button>
  );
}
