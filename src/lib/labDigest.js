// ── A-03 v1: lab digest builder ──────────────────────────────────────────────
// Per canonical analyte, a 12-month digest replacing both the full-history
// dump (Tab11, cost/attention degradation) and the latest-value-only summary
// (Tab05, trend-blind). Grouping is by normalized raw name (trim, lowercase)
// — A-04 (Phase 2) upgrades this to canonical IDs with alias merging across
// facilities.
//
// Exports data builders (buildLabDigestData/formatLabDigest for {labDigest},
// formatLabsWindow for {labsWindow}) so callers can reuse the raw analyte
// objects for on-screen rendering, not just the AI payload text.

function normalizeLabName(name) {
  return (name || "").toLowerCase().trim();
}

function parseNum(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function parseRefRange(str) {
  if (!str) return { low: null, high: null };
  const s = String(str).trim();
  let m = s.match(/(-?\d+\.?\d*)\s*(?:[-–—]|to)\s*(-?\d+\.?\d*)/i);
  if (m) return { low: parseFloat(m[1]), high: parseFloat(m[2]) };
  m = s.match(/(?:<=?|up\s*to)\s*(-?\d+\.?\d*)/i);
  if (m) return { low: null, high: parseFloat(m[1]) };
  m = s.match(/>=?\s*(-?\d+\.?\d*)/i);
  if (m) return { low: parseFloat(m[1]), high: null };
  return { low: null, high: null };
}

function effectiveRange(lab, customRanges) {
  const key = normalizeLabName(lab.name);
  const c = customRanges?.[key];
  if (c && c.low != null && c.high != null) return { low: +c.low, high: +c.high, source: "doctor" };
  return { ...parseRefRange(lab.refRange), source: "lab" };
}

// true = out of range, false = in range, null = no usable range/value (falls
// back to the import-time flag only when no range is available at all).
function isOutOfRange(lab, customRanges) {
  const { low, high } = effectiveRange(lab, customRanges);
  const val = parseNum(lab.value);
  if (val === null) return lab.flag ? true : null;
  if (low == null && high == null) return lab.flag ? true : null;
  if (low != null && val < low) return true;
  if (high != null && val > high) return true;
  return false;
}

const DAY_MS = 86400000;

/**
 * Build the per-analyte digest for labs drawn within `windowDays` (default
 * 365 — the 12-month default; pass 730 for the 24-month Advanced-mode
 * {labsExtended} digest). Returns an array of analyte digest objects, newest
 * draw first.
 */
export function buildLabDigestData(labs, customRanges = {}, { windowDays = 365 } = {}) {
  const cutoff = Date.now() - windowDays * DAY_MS;
  const groups = new Map();
  for (const lab of labs || []) {
    const key = normalizeLabName(lab.name);
    if (!key) continue;
    const t = lab.date ? new Date(lab.date).getTime() : NaN;
    if (Number.isNaN(t) || t < cutoff) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ ...lab, _t: t });
  }

  const analytes = [];
  for (const entries of groups.values()) {
    entries.sort((a, b) => b._t - a._t); // newest first
    const drawCount = entries.length;
    const last6 = entries.slice(0, 6);
    const numeric = entries.map(e => parseNum(e.value)).filter(v => v !== null);
    const windowMin = numeric.length ? Math.min(...numeric) : null;
    const windowMax = numeric.length ? Math.max(...numeric) : null;

    const newest = entries[0];
    const oldest = entries[entries.length - 1];
    const firstVal = parseNum(oldest.value);
    const lastVal = parseNum(newest.value);
    const direction = drawCount < 2 || firstVal === null || lastVal === null
      ? "insufficient data"
      : lastVal > firstVal ? "rising" : lastVal < firstVal ? "falling" : "flat";
    const latestDelta = drawCount >= 2 ? (() => {
      const a = parseNum(entries[0].value), b = parseNum(entries[1].value);
      return a !== null && b !== null ? a - b : null;
    })() : null;

    const custom = customRanges?.[normalizeLabName(newest.name)];

    analytes.push({
      name: newest.name, // most recent raw name, verbatim
      unit: newest.unit || "",
      last6: last6.map(e => ({ date: e.date || null, value: e.value, flagged: isOutOfRange(e, customRanges) })),
      windowMin, windowMax,
      trend: { first: firstVal, last: lastVal, direction, drawCount },
      latestDelta,
      refRange: newest.refRange || null,
      // "with its set date": mi_lab_custom_ranges doesn't currently record
      // when a range was set (Tab05's saveCustomRange only stores low/high).
      // Carried as-is — adding a set-date field is a schema change outside
      // this item's scope (new labDigest.js + payload builders).
      customRange: custom && custom.low != null && custom.high != null ? { low: custom.low, high: custom.high } : null,
      // A-01 (deterministic tripwire engine) isn't wired yet; every analyte
      // reports "unavailable" until it is. See core.js TRIPWIRE_UNAVAILABLE.
      tripwireStatus: "unavailable",
    });
  }

  analytes.sort((a, b) => {
    const ta = a.last6[0]?.date ? new Date(a.last6[0].date).getTime() : 0;
    const tb = b.last6[0]?.date ? new Date(b.last6[0].date).getTime() : 0;
    return tb - ta;
  });
  return analytes;
}

/** Format digest data into the compact per-analyte text block for {labDigest}. */
export function formatLabDigest(analytes) {
  if (!analytes.length) return "No lab results in the last 12 months.";
  return analytes.map(a => {
    const valuesStr = a.last6
      .map(v => `${v.date || "unknown date"}: ${v.value}${a.unit ? " " + a.unit : ""}${v.flagged === true ? " (flagged)" : ""}`)
      .join("; ");
    const rangeStr = a.customRange
      ? `doctor's range ${a.customRange.low}–${a.customRange.high}${a.refRange ? `, lab ref ${a.refRange}` : ""}`
      : (a.refRange ? `ref ${a.refRange}` : "no range on file");
    const trendStr = a.trend.drawCount > 1
      ? `${a.trend.direction} (first ${a.trend.first ?? "n/a"} → last ${a.trend.last ?? "n/a"}, ${a.trend.drawCount} draws in window)`
      : "single draw in window";
    const deltaStr = a.latestDelta != null ? `${a.latestDelta > 0 ? "+" : ""}${a.latestDelta.toFixed(2)}` : "n/a";
    return `${a.name}: ${valuesStr} | window ${a.windowMin ?? "n/a"}–${a.windowMax ?? "n/a"} | trend ${trendStr} | latest delta ${deltaStr} | ${rangeStr} | tripwire: ${a.tripwireStatus}`;
  }).join("\n");
}

/** {labsWindow}: full rows for the last `days` (default 60), most recent first. */
export function formatLabsWindow(labs, customRanges = {}, days = 60) {
  const cutoff = Date.now() - days * DAY_MS;
  const rows = (labs || [])
    .filter(l => {
      if (!normalizeLabName(l.name)) return false;
      const t = l.date ? new Date(l.date).getTime() : NaN;
      return !Number.isNaN(t) && t >= cutoff;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  if (!rows.length) return `No lab results in the last ${days} days.`;
  return rows.map(l => {
    const oor = isOutOfRange(l, customRanges);
    return `${l.date}: ${l.name} ${l.value}${l.unit ? " " + l.unit : ""}${l.refRange ? ` (ref ${l.refRange})` : ""}${oor === true ? " ⚠ FLAGGED" : ""}`;
  }).join("\n");
}
