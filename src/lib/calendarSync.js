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

/**
 * Given existing appointments and freshly fetched events, return only the
 * mapped appointments that are NOT already present, each enriched from the Care
 * Team. Match on the Google event id first, then fall back to date + title.
 */
export function diffNewAppointments(events, existing, careTeam = []) {
  const key = a => `${a.date}|${String(a.title || "").trim().toLowerCase()}`;
  const existingIds = new Set(existing.map(a => a.gcalId).filter(Boolean));
  const existingKeys = new Set(existing.map(key));
  return events
    .map(eventToAppointment)
    .filter(a => a.date) // skip anything without a usable date
    .filter(a => !(a.gcalId && existingIds.has(a.gcalId)) && !existingKeys.has(key(a)))
    .map(a => enrichWithCareTeam(a, careTeam));
}
