// ─────────────────────────────────────────────────────────────────────────────
// notify.js — Three independently-switchable notification types. The app is fully
// usable if the patient declines all of them. These are local (Notification API +
// in-session scheduling); true background push needs a service-worker Push setup,
// a later phase. Kept respectful and infrequent.
// ─────────────────────────────────────────────────────────────────────────────

import { rls, wls, upcomingAppointments, daysUntil } from "./companionData.js";

const DEFAULTS = { meds: false, appts: false, alerts: false, medTime: "08:00" };

export function getNotifPrefs() { return { ...DEFAULTS, ...rls("mi_notif_prefs", {}) }; }
export function setNotifPrefs(p) { wls("mi_notif_prefs", { ...getNotifPrefs(), ...p }); }

export async function requestNotifPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  return (await Notification.requestPermission()) === "granted";
}

function fire(title, body) {
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    try { new Notification(title, { body, icon: "/favicon.png" }); } catch { /* ignore */ }
  }
}

// ── Medication reminder — schedule the next occurrence of medTime ─────────────
let medTimer = null;
export function scheduleMedReminder() {
  clearTimeout(medTimer);
  const prefs = getNotifPrefs();
  if (!prefs.meds || Notification?.permission !== "granted") return;
  const [h, m] = (prefs.medTime || "08:00").split(":").map(Number);
  const fireAt = new Date();
  fireAt.setHours(h, m, 0, 0);
  if (fireAt <= new Date()) fireAt.setDate(fireAt.getDate() + 1);
  medTimer = setTimeout(() => {
    fire("Insina Health — Medications", "Time to confirm your medications.");
    scheduleMedReminder(); // re-arm for the next day while the app stays open
  }, fireAt - new Date());
}

// ── On-open: appointment reminders + attention alerts (best-effort, once) ─────
export function runOpenNotifications(flags = []) {
  const prefs = getNotifPrefs();
  if (Notification?.permission !== "granted") return;
  if (prefs.appts) {
    const appt = upcomingAppointments()[0];
    const d = appt ? daysUntil(appt.date) : null;
    if (d != null && d >= 0 && d <= 1) fire("Insina Health — Upcoming visit", `${appt.title} ${d === 0 ? "today" : "tomorrow"}. Review your Pre-Visit Brief.`);
  }
  if (prefs.alerts && flags.length) {
    fire("Insina Health — Worth a glance", flags[0].title);
  }
}
