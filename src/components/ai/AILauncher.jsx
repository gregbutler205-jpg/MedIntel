// Contextual AI launcher (DEC-P49, DEC-P50). A button styled like the
// dashboard's ai-btn: the simple mark at 14 plus a visible text label. Never
// icon-only. On tap it writes the scope to the in-memory store and navigates
// to AI Analysis. Nothing else: no fetch, no proxy call, nothing leaves the
// device. The one exception to "never runs" is the dashboard question
// launcher (DEC-P50 as amended 2026-09-02): its labeled tap IS the explicit
// run, carried as `question` for AI Analysis to send on arrival.
// Hidden entirely when the AI features flag is off (DEC-P51).
import AIMark from "./AIMark.jsx";
import { setAIScope } from "../../lib/aiScope.js";
import { AI_FEATURES_ENABLED } from "../../config/aiFeatures.js";

const BASE = {
  padding: 12, background: "linear-gradient(135deg, rgba(79,142,247,.15), rgba(167,139,250,.1))",
  border: "1px solid rgba(79,142,247,.3)", borderRadius: 10, color: "#7eb8d8",
  fontFamily: "'Sora',sans-serif", fontSize: 12, cursor: "pointer", transition: "all .2s",
  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
};
const HOVER = { background: "linear-gradient(135deg, rgba(79,142,247,.25), rgba(167,139,250,.18))", borderColor: "rgba(79,142,247,.5)", color: "#b8d4f0" };

/**
 * @param {string}   label      visible text; also the aria-label (required)
 * @param {object}   scope      AIScope (see lib/aiScope.js)
 * @param {string=}  question   dashboard question launchers only
 * @param {function} onNavigate opens AI Analysis (the caller's nav handler)
 */
export default function AILauncher({ label, scope, question, onNavigate, disabled = false, style = {}, className = "" }) {
  if (!AI_FEATURES_ENABLED) return null;
  if (!label) return null; // never icon-only
  const launch = (e) => {
    if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    if (disabled) return;
    setAIScope({ ...(scope || { source: "nav", items: [] }), question });
    if (typeof onNavigate === "function") onNavigate();
  };
  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      disabled={disabled}
      onClick={launch}
      style={{ ...BASE, ...style, opacity: disabled ? 0.5 : (style.opacity ?? 1) }}
      onMouseEnter={e => { if (disabled) return; Object.assign(e.currentTarget.style, HOVER); }}
      onMouseLeave={e => {
        e.currentTarget.style.background = style.background || BASE.background;
        e.currentTarget.style.borderColor = style.borderColor || "rgba(79,142,247,.3)";
        e.currentTarget.style.color = style.color || BASE.color;
      }}
    >
      <span style={{ color: "#4f8ef7", display: "inline-flex" }}><AIMark variant="simple" size={14} /></span>
      <span>{label}</span>
    </button>
  );
}
