// Full-cut entry button (DEC-P49): the sanctioned icon-only exception. An
// icon-only button holding the full mark, aria-label "Open AI Analysis", hit
// target at least 44px, hover ring per the dashboard mockup. Behaves like a
// launcher with full-record scope: sets scope, navigates, nothing else.
// Hidden entirely when the AI features flag is off (DEC-P51).
import AIMark from "./AIMark.jsx";
import { setAIScope } from "../../lib/aiScope.js";
import { AI_FEATURES_ENABLED } from "../../config/aiFeatures.js";

/**
 * @param {number}   iconSize   mark size in px (32 topbar renders the compact trace; 44 dashboard the standard)
 * @param {string}   source     scope source tag ('nav' | 'dashboard')
 * @param {function} onNavigate opens AI Analysis
 */
export default function AIEntryButton({ iconSize = 44, source = "nav", onNavigate, style = {} }) {
  if (!AI_FEATURES_ENABLED) return null;
  const hit = Math.max(44, iconSize);
  return (
    <button
      type="button"
      aria-label="Open AI Analysis"
      title="Open AI Analysis"
      onClick={(e) => {
        if (e && typeof e.stopPropagation === "function") e.stopPropagation();
        setAIScope({ source, items: [] });
        if (typeof onNavigate === "function") onNavigate();
      }}
      style={{ width: hit, height: hit, borderRadius: 12, border: "1px solid transparent", background: "transparent", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all .2s", padding: 0, ...style }}
      onMouseEnter={e => { e.currentTarget.style.background = "rgba(79,142,247,.1)"; e.currentTarget.style.borderColor = "rgba(79,142,247,.35)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = style.background || "transparent"; e.currentTarget.style.borderColor = style.borderColor || "transparent"; }}
    >
      <AIMark variant="full" size={iconSize} />
    </button>
  );
}
