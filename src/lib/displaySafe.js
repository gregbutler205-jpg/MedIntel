// ── UI-2: display-safety helpers ─────────────────────────────────────────────
// One place that turns possibly-missing / malformed record values into
// patient-friendly display strings. These NEVER modify the underlying record —
// they only guard what reaches the screen. Raw programming values ("NaN",
// "Invalid Date", "undefined") must never render.

/** Finite number or null. Accepts numeric strings; rejects "", null, "Moderate"… */
export function safeNumber(v) {
  if (v === "" || v == null || typeof v === "boolean") return null;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Average of the FINITE numbers in `values`, to `digits` decimals — or null
 * when none are numeric. A list of ["Moderate", 5, null] averages the 5, not
 * NaN (companion symptom entries store text severities; the web app numbers).
 */
export function safeAverage(values, digits = 1) {
  const nums = (values || []).map(safeNumber).filter(n => n !== null);
  if (!nums.length) return null;
  return (nums.reduce((s, n) => s + n, 0) / nums.length).toFixed(digits);
}

/**
 * Date or null. Tolerates ISO strings, epoch numbers, Date instances, and
 * JSON-quoted strings ('"2026-07-08T…"' — how snapshot-restored scalar keys
 * arrive). Date-only strings parse at local noon to avoid UTC day-shift.
 */
export function parseDateSafe(v) {
  if (v == null || v === "") return null;
  if (v instanceof Date) return isNaN(v) ? null : v;
  if (typeof v === "number") { const d = new Date(v); return isNaN(d) ? null : d; }
  let s = String(v).trim();
  if (s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1); // JSON-quoted scalar
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) s += "T12:00:00";
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

/**
 * "today" / "yesterday" / "N days ago" — or `fallback` when the timestamp is
 * missing or unparseable (never "NaN days ago").
 */
export function daysAgoLabel(ts, fallback = "Not recorded") {
  const d = parseDateSafe(ts);
  if (!d) return fallback;
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (!Number.isFinite(days) || days < 0) return fallback;
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

/** Formatted date string or `fallback` — never "Invalid Date". */
export function dateLabel(v, fallback = "Not recorded", opts = { month: "short", day: "numeric", year: "numeric" }) {
  const d = parseDateSafe(v);
  return d ? d.toLocaleDateString("en-US", opts) : fallback;
}

/** Non-empty trimmed text or `fallback` — never "undefined"/"null" on screen. */
export function textOr(v, fallback = "Not recorded") {
  if (v == null) return fallback;
  const s = String(v).trim();
  return s && s !== "undefined" && s !== "null" ? s : fallback;
}

// ── v1.56.2: app-wide field formats (Greg 2026-08-30) ────────────────────────
// Every date FIELD renders mm/dd/yyyy and every phone field (xxx)xxx-xxxx.
// Styled long-form dates (cards, print headers) are deliberate design and stay.
// Storage is untouched — dates stay ISO yyyy-mm-dd on disk; these only shape
// what reaches the screen or paper.

/**
 * Date field display: mm/dd/yyyy. Unparseable non-empty input renders as
 * typed (never hidden); empty renders `fallback`.
 */
export function formatDateUS(v, fallback = "") {
  const d = parseDateSafe(v);
  if (d) {
    return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
  }
  const s = v == null ? "" : String(v).trim();
  return s || fallback;
}

/** Progressive phone formatter for typing: (xxx)xxx-xxxx as digits arrive. */
export function formatPhone(val) {
  const digits = (val || "").replace(/\D/g, "").slice(0, 10);
  if (!digits.length) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)})${digits.slice(3)}`;
  return `(${digits.slice(0, 3)})${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * Phone field display for stored values: a clean US number (10 digits, or 11
 * with a leading 1) renders (xxx)xxx-xxxx; anything else — extensions,
 * international, blank — renders as stored.
 */
export function displayPhone(val) {
  if (val == null) return "";
  const s = String(val).trim();
  let digits = s.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (digits.length !== 10) return s;
  return `(${digits.slice(0, 3)})${digits.slice(3, 6)}-${digits.slice(6)}`;
}
