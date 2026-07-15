// ── UI-14: shared semantic icons ─────────────────────────────────────────────
// One icon family, one icon per action, everywhere. Start with Print (the
// action that had the most inconsistent treatments — ⎙ glyph, 🖨 emoji, and a
// ✦ used for a print action). Inline SVG so it renders identically on desktop
// and the companion PWA, inherits currentColor, and needs no font glyph.

export function PrinterIcon({ size = 13, style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }} aria-hidden="true">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

/**
 * Printer icon + label as one inline-flex unit — drops into any existing
 * button as its children, guaranteeing icon/text alignment regardless of the
 * button's own layout. Label defaults to "Print" and is always visible
 * (UI-14: one consistent printer icon plus the visible word Print).
 */
export function PrintLabel({ children = "Print", size = 12 }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, verticalAlign: "middle" }}>
      <PrinterIcon size={size} />
      <span>{children}</span>
    </span>
  );
}

// ── UI-14: the rest of the routine-control icon family ───────────────────────
// Same stroke style as PrinterIcon and the A-14 Home button. All inherit
// currentColor; callers set color via a wrapping span or style.
const base = (size, style) => ({
  width: size, height: size, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round",
  style: { flexShrink: 0, ...style }, "aria-hidden": true,
});

export function FlaskIcon({ size = 20, style }) {
  return (
    <svg {...base(size, style)}>
      <path d="M9 3h6" /><path d="M10 3v6.34L5.5 17a2 2 0 0 0 1.78 3h9.44a2 2 0 0 0 1.78-3L14 9.34V3" />
      <path d="M7.5 14h9" />
    </svg>
  );
}
export function PillIcon({ size = 20, style }) {
  return (
    <svg {...base(size, style)}>
      <rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-45 12 12)" />
      <line x1="8.5" y1="15.5" x2="15.5" y2="8.5" />
    </svg>
  );
}
export function CalendarIcon({ size = 20, style }) {
  return (
    <svg {...base(size, style)}>
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
export function ThermometerIcon({ size = 20, style }) {
  return (
    <svg {...base(size, style)}>
      <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
    </svg>
  );
}
export function HeartIcon({ size = 20, style }) {
  return (
    <svg {...base(size, style)}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
export function DownloadIcon({ size = 20, style }) {
  return (
    <svg {...base(size, style)}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
export function RefreshIcon({ size = 20, style }) {
  return (
    <svg {...base(size, style)}>
      <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}
export function AlertTriangleIcon({ size = 20, style }) {
  return (
    <svg {...base(size, style)}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
export function ClockIcon({ size = 20, style }) {
  return (
    <svg {...base(size, style)}>
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
export function SaveIcon({ size = 16, style }) {
  return (
    <svg {...base(size, style)}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
    </svg>
  );
}
export function TrashIcon({ size = 13, style }) {
  return (
    <svg {...base(size, style)}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
export function PinIcon({ size = 13, style }) {
  return (
    <svg {...base(size, style)}>
      <path d="M12 17v5" /><path d="M9 10.76V7a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3.76a2 2 0 0 0 .59 1.42l1.7 1.7a1 1 0 0 1-.7 1.71H7.41a1 1 0 0 1-.7-1.7l1.7-1.71A2 2 0 0 0 9 10.76z" />
    </svg>
  );
}
