// ── Google Calendar — read-only sync ─────────────────────────────────────────
// Pulls events from a chosen Google Calendar and maps them to Insina
// appointment objects. One-way only (Calendar → Insina); never writes to Google.

import { ensureAccessToken, CALENDAR_SCOPE } from "./googleAuth.js";
import { matchCareTeamMember, providerFromTitle } from "./careTeamMatch.js";

const CAL_API = "https://www.googleapis.com/calendar/v3";

// localStorage key holding the user's chosen medical calendar { id, summary }
export const GCAL_KEY = "mi_gcal_selected";

export function getSelectedCalendar() {
  try { return JSON.parse(localStorage.getItem(GCAL_KEY) || "null"); } catch { return null; }
}
export function setSelectedCalendar(cal) {
  if (cal) localStorage.setItem(GCAL_KEY, JSON.stringify({ id: cal.id, summary: cal.summary }));
  else localStorage.removeItem(GCAL_KEY);
}

async function calFetch(path) {
  const token = await ensureAccessToken(CALENDAR_SCOPE);
  const res = await fetch(`${CAL_API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401 || res.status === 403) {
    throw new Error("Insina doesn't have permission to read your Google Calendar yet. See the setup steps to enable Calendar access for the app.");
  }
  if (!res.ok) throw new Error(`Google Calendar request failed (${res.status}).`);
  return res.json();
}

/** List the user's calendars (the "tabs" in Google Calendar's sidebar). */
export async function listCalendars() {
  const data = await calFetch("/users/me/calendarList");
  return (data.items || []).map(c => ({
    id: c.id,
    summary: c.summary || c.id,
    primary: !!c.primary,
    color: c.backgroundColor || "#4f8ef7",
  }));
}

/** Fetch single-instance events from a calendar within a time window. */
export async function listEvents(calendarId, { monthsBack = 1, monthsAhead = 18 } = {}) {
  const timeMin = new Date(); timeMin.setMonth(timeMin.getMonth() - monthsBack);
  const timeMax = new Date(); timeMax.setMonth(timeMax.getMonth() + monthsAhead);
  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });
  const data = await calFetch(`/calendars/${encodeURIComponent(calendarId)}/events?${params}`);
  return data.items || [];
}

// ── Mapping helpers ──────────────────────────────────────────────────────────
function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmtTime(d) {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12; if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}
function stripHtml(s) {
  return String(s || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}

/** Convert a Google Calendar event into a partial Insina appointment. */
export function eventToAppointment(ev) {
  const start = ev.start || {};
  let date = "", time = "";
  if (start.dateTime) {
    const d = new Date(start.dateTime);
    date = isoDate(d);
    time = fmtTime(d);
  } else if (start.date) {
    date = start.date; // all-day event, already YYYY-MM-DD
  }
  return {
    title: ev.summary || "(untitled appointment)",
    provider: providerFromTitle(ev.summary), // text after the last " - "
    date,
    time,
    address: ev.location || "",
    notes: stripHtml(ev.description),
    gcalId: ev.id,
    status: "upcoming",
  };
}

/**
 * Fill an appointment's missing provider details from a matching Care Team
 * member. Only empty fields are filled — values already on the event are kept.
 */
export function enrichWithCareTeam(appt, careTeam) {
  const match = matchCareTeamMember(appt.provider, careTeam);
  if (!match) return appt;
  return {
    ...appt,
    provider:  appt.provider  || match.name      || "",
    specialty: appt.specialty || match.specialty || "",
    facility:  appt.facility  || match.facility  || "",
    address:   appt.address   || match.address   || "",
    phone:     appt.phone     || match.phone     || "",
  };
}

// ── Deleted-appointment tombstones ───────────────────────────────────────────
// Deleting (or dismissing) an appointment must also mean "and don't bring it
// back." TWO resurrection vectors exist, and both are covered here:
//   1. Calendar re-import: the daily pull re-creates a deleted event the next
//      day. Blocked in diffNewAppointments (by Google event id, and by
//      date+title since recurring events can re-issue ids).
//   2. The Drive merge: _mergeArrays unions local + Drive by record id, and
//      deletion isn't a concept it understands — a copy still living in the
//      Drive file (kept alive by the other device re-uploading) is quietly
//      union-ed back after every deletion. This is how an appointment that is
//      NOT even on the calendar anymore kept returning (Dr. Roy). Blocked by
//      tombstoning EVERY deletion (by record id — collision-proof) and
//      filtering at the merge layer (driveSync post-pass) + list load.
// The tombstone list is a managed mi_* key: encrypted at rest and carried in
// the Drive backup, so deletions PROPAGATE — the other device merges the
// tombstones in and drops its own copy on its next sync.
const DISMISSED_KEY = "mi_appt_dismissed";
const DISMISSED_MAX = 300; // plenty of history; keeps the key from growing forever

const dtKey = a => `${a.date}|${String(a.title || "").trim().toLowerCase()}`;

export function readDismissedAppts() {
  try { const r = localStorage.getItem(DISMISSED_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}

/** Record a deleted appointment (synced OR manual) so no sync can resurrect it. */
export function tombstoneAppt(appt) {
  if (!appt) return;
  const list = readDismissedAppts();
  const entry = {
    // Content-keyed id: _mergeArrays dedupes by `id`, so identical tombstones
    // from two devices collapse while DISTINCT tombstones sharing a date
    // survive the union (a bare {date,...} entry would collide on `date`).
    id: `${appt.gcalId || appt.id || "x"}|${appt.date || ""}|${String(appt.title || "").trim().toLowerCase()}`,
    apptId: appt.id || null,
    gcalId: appt.gcalId || null,
    date: appt.date || "",
    title: String(appt.title || "").trim().toLowerCase(),
    deletedAt: new Date().toISOString(),
  };
  if (!list.some(t => t.id === entry.id)) list.push(entry);
  try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(list.slice(-DISMISSED_MAX))); } catch { /* locked/quota */ }
}

/** Sync-import match: Google event id, or date+title (id churn on recurring events). */
export function isTombstoned(appt, dismissed = readDismissedAppts()) {
  if (!appt) return false;
  const k = dtKey(appt);
  return dismissed.some(d =>
    (d.gcalId && appt.gcalId && d.gcalId === appt.gcalId) ||
    (d.date && `${d.date}|${d.title}` === k)
  );
}

/**
 * Healer for lists loaded from storage or produced by the Drive merge: drop
 * records the user already deleted. Match rules by origin:
 *  - ANY record whose exact id was deleted (covers manual records resurrected
 *    by the merge union — the Drive copy carries the same id).
 *  - Calendar-origin records (gcalId) additionally by event id / date+title.
 * A manually RE-CREATED appointment gets a fresh id and no gcalId, so it never
 * matches a tombstone — re-creating something you once deleted always sticks.
 */
export function filterTombstoned(appts) {
  const dismissed = readDismissedAppts();
  if (!dismissed.length) return appts;
  return appts.filter(a => {
    if (a.id && dismissed.some(d => d.apptId && d.apptId === a.id)) return false;
    if (a.gcalId && isTombstoned(a, dismissed)) return false;
    return true;
  });
}

/**
 * Given existing appointments and freshly fetched events, return only the
 * mapped appointments that are NOT already present, each enriched from the Care
 * Team. Match on the Google event id first, then fall back to date + title —
 * and skip anything the user has deleted (tombstones above).
 */
export function diffNewAppointments(events, existing, careTeam = []) {
  const key = dtKey;
  const existingIds = new Set(existing.map(a => a.gcalId).filter(Boolean));
  const existingKeys = new Set(existing.map(key));
  const dismissed = readDismissedAppts();
  return events
    .map(eventToAppointment)
    .filter(a => a.date) // skip anything without a usable date
    .filter(a => !(a.gcalId && existingIds.has(a.gcalId)) && !existingKeys.has(key(a)))
    .filter(a => !isTombstoned(a, dismissed))
    .map(a => enrichWithCareTeam(a, careTeam));
}
