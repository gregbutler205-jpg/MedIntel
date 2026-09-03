// Insina AI mark (DEC-P47): four-point sparkle with a heartbeat spike.
// Appears on model-generated content and its launchers only; deterministic
// outputs (tripwire, advisories, reminders, range flags) never carry it.
// Root element carries data-ai-mark so provenance tests can find every
// instance. Sources: WO_AI_LAUNCHER_01 Appendix A, transcribed verbatim.
import { useId } from "react";

const SIMPLE_PATH = "M100 6C125 50 123 88 192 100C123 112 125 150 100 194C75 150 77 112 8 100C77 88 75 50 100 6Z M84 108L86 107.7L87.9 107L89.6 105.7L90.9 104.1L92.1 100.9L97.1 139L97.6 141.1L98.8 143L100.3 144.5L102.3 145.5L104.4 146L106.6 145.8L108.6 145.1L110.4 143.9L111.8 142.2L112.7 140.2L122 108L134 108L136.1 107.7L138 106.9L139.7 105.7L140.9 104L141.7 102.1L142 100L141.7 97.9L140.9 96L139.7 94.3L138 93.1L136.1 92.3L134 92L116 92L114 92.3L112.1 93L110.4 94.3L109.1 95.9L107.9 99.1L102.9 61L102.4 58.9L101.2 57L99.7 55.5L97.7 54.5L95.6 54L93.4 54.2L91.4 54.9L89.6 56.1L88.2 57.8L87.3 59.8L78 92L66 92L63.9 92.3L62 93.1L60.3 94.3L59.1 96L58.3 97.9L58 100L58.3 102.1L59.1 104L60.3 105.7L62 106.9L63.9 107.7L66 108Z";
// Full-variant artwork refined 2026-09-03 after founder review of the richer
// lockup: arms pinched harder toward the center, deep-blue-to-cyan gradient
// running left to right, a second lighter star set low-right for depth, a
// brighter core, and a taller, sharper heartbeat. The simple silhouette above
// is unchanged (Appendix A verbatim); curvature differences vanish at 14px.
const STAR_PATH = "M100 4C111 58 142 89 196 100C142 111 111 142 100 196C89 142 58 111 4 100C58 89 89 58 100 4Z";
const TRACE_STANDARD = "M56 100H80L86 92L91 100H96L101 50L110 150L116 100H144";
const TRACE_COMPACT  = "M60 100H84L96 56L106 144L116 100H140";

/** Sizes below this render the compact trace: no glow filter, no P wave. */
export const COMPACT_BELOW = 40;

/**
 * @param {"full"|"simple"} variant  simple inherits currentColor (safe to inline
 *        anywhere); full is the gradient mark, permitted only in the AI Analysis
 *        header and AIEntryButton.
 * @param {number} size  px
 * @param {boolean} decorative  true when a text label accompanies the mark
 *        (aria-hidden); false renders it as a labelled image.
 */
export default function AIMark({ variant = "simple", size = 24, decorative = true }) {
  const rawId = useId();
  const uid = String(rawId).replace(/[^a-zA-Z0-9_-]/g, "");
  const a11y = decorative ? { "aria-hidden": "true" } : { role: "img", "aria-label": "Insina AI" };

  if (variant !== "full") {
    return (
      <svg data-ai-mark="simple" viewBox="0 0 200 200" width={size} height={size} fill="currentColor" {...a11y}>
        <path fillRule="evenodd" d={SIMPLE_PATH} />
      </svg>
    );
  }

  const compact = size < COMPACT_BELOW;
  const starId = `iai-${uid}-star`;
  const bodyId = `iai-${uid}-body`;
  const innerId = `iai-${uid}-inner`;
  const coreId = `iai-${uid}-core`;
  const glowId = `iai-${uid}-glow`;
  return (
    <svg data-ai-mark="full" viewBox="0 0 200 200" width={size} height={size} {...a11y}>
      <defs>
        <path id={starId} d={STAR_PATH} />
        <linearGradient id={bodyId} x1="0" y1="0.2" x2="1" y2="0.8">
          <stop offset="0" stopColor="#1640c8" />
          <stop offset="0.5" stopColor="#2a7ff0" />
          <stop offset="1" stopColor="#3fd3ff" />
        </linearGradient>
        <linearGradient id={innerId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8ff0ff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#2f9dff" stopOpacity="0.55" />
        </linearGradient>
        <radialGradient id={coreId} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="0.35" stopColor="#bff3ff" stopOpacity="0.8" />
          <stop offset="1" stopColor="#6fd4ff" stopOpacity="0" />
        </radialGradient>
        {!compact && (
          <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" />
          </filter>
        )}
      </defs>
      <use href={`#${starId}`} fill={`url(#${bodyId})`} />
      <use href={`#${starId}`} fill={`url(#${innerId})`} transform="translate(106 104) scale(0.74) translate(-100 -100)" />
      <use href={`#${starId}`} fill={`url(#${coreId})`} transform="translate(100 100) scale(0.5) translate(-100 -100)" />
      {compact ? (
        <path d={TRACE_COMPACT} fill="none" stroke="#ffffff" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={TRACE_STANDARD} stroke="#ffffff" strokeOpacity="0.45" strokeWidth="9" filter={`url(#${glowId})`} />
          <path d={TRACE_STANDARD} stroke="#ffffff" strokeWidth="4.5" />
        </g>
      )}
    </svg>
  );
}
