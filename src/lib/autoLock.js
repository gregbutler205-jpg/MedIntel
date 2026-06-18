// ── Inactivity auto-lock settings ────────────────────────────────────────────
// How long the app may sit idle before it returns to the lock screen.
// Stored as a number of minutes in localStorage; 0 means "off".

export const AUTOLOCK_KEY = "mi_autolock_minutes";
export const DEFAULT_AUTOLOCK_MIN = 30;

export const AUTOLOCK_OPTIONS = [
  { value: 0,  label: "Off" },
  { value: 5,  label: "5 minutes" },
  { value: 10, label: "10 minutes" },
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
];

export function getAutoLockMinutes() {
  const raw = localStorage.getItem(AUTOLOCK_KEY);
  if (raw === null) return DEFAULT_AUTOLOCK_MIN;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_AUTOLOCK_MIN;
}

export function setAutoLockMinutes(min) {
  localStorage.setItem(AUTOLOCK_KEY, String(min));
  // Let a running app re-arm its timer immediately without a reload.
  window.dispatchEvent(new Event("mi-autolock-changed"));
}
