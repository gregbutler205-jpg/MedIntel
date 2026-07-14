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
