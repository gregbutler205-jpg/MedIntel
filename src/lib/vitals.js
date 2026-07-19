// ── UI-4 (merged into A-12): one shared vital schema/helper ──────────────────
// Replaces four independently-written vital-save paths (two in the desktop
// Vitals tab, two in the companion app) and four different "latest value"
// computations (Tab06, store.js, Dashboard.jsx, companionData.js) that
// disagreed with each other and, in Dashboard.jsx's case, crashed outright
// with 0 or 1 readings on file.
//
// Schema for one mi_readings entry:
//   { id, date (YYYY-MM-DD, the reading's own date — user-editable),
//     time (optional "HH:MM", the reading's own time),
//     enteredAt (ISO instant — when this record was actually saved, always
//       set by the app, never user-editable — "Entered At" per spec),
//     bp_s, bp_d, hr, resting_hr, o2, weight, temp, glucose, sleep,
//     flag, source }
//
// Merging is keyed by `id`, not by date — two legitimate readings on the
// same day never collide or silently overwrite each other. A field left
// blank on save is always null; nothing carries forward a prior value
// silently (data fidelity — same principle as CSC rule 7 and RIE
// flag-don't-fix: an unmeasured field reads as unmeasured, not as a stale
// copy of the last known value).

import { evaluateReadingAndFire } from "./advisoryRuntime.js";

export const VITAL_FIELDS = ["bp_s", "bp_d", "hr", "resting_hr", "o2", "weight", "temp", "glucose", "sleep"];

const READINGS_KEY = "mi_readings";

function safeRead(key, fallback) {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; } catch { return fallback; }
}

let _idCounter = 0;
function genId() {
  return `${Date.now().toString(36)}-${(_idCounter++).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * The default "flag this reading" rule, in one place — recompute after ANY
 * field change (e.g. applying a plausibility-suggestion correction), or a
 * corrected value keeps the stale flag its typo earned.
 */
export function defaultVitalFlag(reading) {
  return reading.bp_s != null && Number(reading.bp_s) >= 160;
}

/**
 * Build a canonical reading object. `fields` may include any of
 * VITAL_FIELDS plus `date`/`time`; blank/undefined vital fields become
 * null (never carried forward from a prior reading).
 */
export function mkReading({ date, time = "", source = "manual", flag: explicitFlag, ...fields } = {}) {
  const now = new Date();
  const reading = {
    id: genId(),
    // Default to the LOCAL calendar date — toISOString() alone is UTC and
    // rolls evening entries (after ~7 PM US) onto tomorrow's date.
    date: date || new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10),
    time: time || "",
    enteredAt: new Date().toISOString(),
    source,
  };
  for (const f of VITAL_FIELDS) {
    const raw = fields[f];
    reading[f] = raw === "" || raw == null ? null : Number(raw);
  }
  reading.flag = explicitFlag != null ? explicitFlag : defaultVitalFlag(reading);
  return reading;
}

export function getAllReadings() {
  return safeRead(READINGS_KEY, []);
}

/**
 * Best-effort sortable instant for a reading, tolerating legacy shapes
 * (date-only `ts` string, epoch-ms `ts` number, or no `ts` at all) so
 * pre-migration and post-migration entries still sort correctly together.
 */
function sortInstant(r) {
  if (r.date) {
    const iso = r.time ? `${r.date}T${r.time}:00` : `${r.date}T12:00:00`;
    const t = new Date(iso).getTime();
    if (Number.isFinite(t)) return t;
  }
  if (r.ts != null) {
    const t = new Date(r.ts).getTime();
    if (Number.isFinite(t)) return t;
  }
  if (r.enteredAt) {
    const t = new Date(r.enteredAt).getTime();
    if (Number.isFinite(t)) return t;
  }
  return 0;
}

export function sortReadingsByRecency(readings) {
  return [...readings].sort((a, b) => sortInstant(b) - sortInstant(a));
}

/**
 * Save one reading: merge into mi_readings keyed by `id` (falling back to
 * appending if the reading has no id — shouldn't happen via mkReading, but
 * defensive for any caller passing a raw object), sorted newest-first, and
 * dispatch mi-data-synced (A-01's tripwire hook, and any other listener).
 */
export function saveReading(reading) {
  const existing = getAllReadings();
  const map = new Map(existing.map(r => [r.id ?? Symbol(), r]));
  map.set(reading.id ?? genId(), reading);
  const merged = sortReadingsByRecency(Array.from(map.values()));
  localStorage.setItem(READINGS_KEY, JSON.stringify(merged));
  window.dispatchEvent(new Event("mi-data-synced"));
  // tripwire advisory §2: vitals-save hook (flag-gated; wrapped so the advisory
  // can never block the reading from being saved).
  try { evaluateReadingAndFire(reading, { source: "manual" }); } catch { /* non-fatal */ }
  return merged;
}

/**
 * The single most recent reading overall (may have some fields null if it
 * was a partial entry — use getLatestFieldValue for "what's my current X").
 */
export function getMostRecentReading() {
  const sorted = sortReadingsByRecency(getAllReadings());
  return sorted[0] ?? null;
}

/**
 * The most recent NON-NULL value for one field, searching across all
 * readings newest-first — necessary because a reading entry may only have
 * some fields populated (e.g. a weight-only log shouldn't hide an earlier
 * BP reading, or vice versa). Returns { value, date, time, reading } or null.
 */
export function getLatestFieldValue(field) {
  const sorted = sortReadingsByRecency(getAllReadings());
  for (const r of sorted) {
    if (r[field] != null) return { value: r[field], date: r.date ?? r.ts ?? null, time: r.time || "", reading: r };
  }
  return null;
}

/** Convenience: latest value for every field at once, e.g. for a dashboard summary. */
export function getLatestVitalsSummary() {
  const out = {};
  for (const f of VITAL_FIELDS) out[f] = getLatestFieldValue(f);
  return out;
}

/**
 * Every reading that has a non-null value for one field, newest first — the
 * per-field equivalent of the record-level history. Chart/status logic that
 * needs "latest" and "previous" for a specific vital (e.g. weight trend)
 * should use history[0]/history[1] here, not readings[0]/readings[1] on the
 * raw record list, since a record may be a partial entry missing this field.
 */
export function getFieldHistory(field) {
  return sortReadingsByRecency(getAllReadings()).filter(r => r[field] != null);
}

/**
 * A synthetic "current" reading-like object built by independently pulling
 * the most recent non-null value for every field — for callers (chart/status
 * components keyed by a single vital type) that expect one record shaped
 * {bp_s, bp_d, hr, ...} but should not have a partial entry in one field
 * hide an earlier real reading in another.
 */
export function getSyntheticLatestReading() {
  const out = {};
  for (const f of VITAL_FIELDS) {
    const v = getLatestFieldValue(f);
    out[f] = v ? v.value : null;
  }
  return out;
}
