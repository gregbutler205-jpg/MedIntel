// ── A-04 (minimal) / UI-3: lab test-name canonicalization ────────────────────
// Three facilities name the same analyte differently (Tacrolimus / FK506 /
// "Tacrolimus Whole Blood"; ALT / SGPT). Name-based grouping leaks duplicates
// into digests, trends, dedupe, and tripwire evaluation. This module is the
// ONE place that resolves a lab name to its canonical grouping id — it
// replaces three parallel alias tables that never fed actual grouping
// (tripwire.js's inline ALIASES, plausibilityBounds' LAB_ALIASES, and
// medDictionary's LAB_SYNONYMS).
//
// Two layers:
//   1. SEED_SYNONYMS — unambiguous clinical synonyms/abbreviations, applied
//      everywhere automatically. Seeded from the tables that already existed
//      in this codebase; the richer seeded library is Phase 2.
//   2. mi_lab_name_map — patient-CONFIRMED mappings from the Group Tests UI
//      ({ [normalized source name]: "Canonical Display Name" }). Mappings
//      apply forward to future imports and are fully reversible: source
//      records are NEVER rewritten (every original name is preserved on its
//      record), so removing a mapping restores the original presentation.

export const LAB_NAME_MAP_KEY = "mi_lab_name_map";

// Union of the pre-existing alias tables (tripwire.js, plausibilityBounds.js,
// medDictionary.js) — no new clinical judgment introduced here.
const SEED_SYNONYMS = {
  "fk506": "tacrolimus",
  "fk506 level": "tacrolimus",
  "tacrolimus level": "tacrolimus",
  "sgpt": "alt",
  "sgot": "ast",
  "estimated gfr": "egfr",
  "glomerular filtration rate": "egfr",
  "hgb": "hemoglobin",
  "hb": "hemoglobin",
  "plt": "platelets",
  "glu": "glucose",
};

export function normalizeLabKey(name) {
  return (name || "").toLowerCase().trim();
}

/**
 * Strip common suffix/noise words to find names likely referring to the same
 * test ("Tacrolimus Level (Trough)" → "tacrolimus"). Used only to PROPOSE
 * duplicate candidates the patient confirms — never applied silently.
 */
export function stripLabNoise(name) {
  return (name || "")
    .toLowerCase()
    .replace(/\b(level|lvl|trough|total|serum|whole\s*blood|blood|fasting|non[\-\s]?fasting|result|test|count|concentration|plasma|urine|random|am|pm|morning|panel|screen|assay)\b/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getLabNameMap() {
  try { const r = localStorage.getItem(LAB_NAME_MAP_KEY); return r ? JSON.parse(r) : {}; } catch { return {}; }
}

function writeLabNameMap(map) {
  localStorage.setItem(LAB_NAME_MAP_KEY, JSON.stringify(map));
  // Canonical matching changed — tripwire dedupe and digests must re-evaluate.
  window.dispatchEvent(new Event("mi-data-synced"));
}

/**
 * The canonical grouping id for a lab name: confirmed mapping first, then the
 * seed synonyms, else the normalized name itself.
 */
export function canonicalLabId(name) {
  const key = normalizeLabKey(name);
  if (!key) return "";
  const map = getLabNameMap();
  const mapped = map[key];
  const base = mapped ? normalizeLabKey(mapped) : key;
  return SEED_SYNONYMS[base] || base;
}

/** Display name for a lab name: its confirmed canonical display if mapped, else the name verbatim. */
export function displayLabName(name) {
  const map = getLabNameMap();
  return map[normalizeLabKey(name)] || name || "";
}

/**
 * Confirm a group: every source name maps to the chosen canonical display
 * name (identity entries included so the display lookup works for the
 * canonical spelling too). Applies forward; reversible via removeLabGroup.
 */
export function setLabMappings(sourceNames, canonicalDisplay) {
  if (!canonicalDisplay || !Array.isArray(sourceNames) || sourceNames.length === 0) return;
  const map = getLabNameMap();
  for (const n of sourceNames) {
    const key = normalizeLabKey(n);
    if (key) map[key] = canonicalDisplay;
  }
  writeLabNameMap(map);
}

/** Reverse a confirmed group: remove every mapping pointing at this canonical display name. */
export function removeLabGroup(canonicalDisplay) {
  const target = normalizeLabKey(canonicalDisplay);
  const map = getLabNameMap();
  let changed = false;
  for (const [k, v] of Object.entries(map)) {
    if (normalizeLabKey(v) === target) { delete map[k]; changed = true; }
  }
  if (changed) writeLabNameMap(map);
}

/** Confirmed groups for the Group Tests UI: [{ canonical, sources: [names...] }]. */
export function getConfirmedGroups() {
  const map = getLabNameMap();
  const byCanonical = {};
  for (const [source, canonical] of Object.entries(map)) {
    (byCanonical[canonical] = byCanonical[canonical] || []).push(source);
  }
  return Object.entries(byCanonical).map(([canonical, sources]) => ({ canonical, sources: sources.sort() }));
}
