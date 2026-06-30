// ── RIE · Review Queue state ─────────────────────────────────────────────────
// Permanent dismissals persist + sync (mi_ key). "Ignore this time" is in-memory
// for the current session only and re-surfaces on the next full scan.

import { appendAudit } from "./auditLog.js";

const DISMISS_KEY = "mi_rie_dismissed"; // { [signature]: { at, original, message } }  — synced
const sessionIgnored = new Set();

export function getDismissed() {
  try { return JSON.parse(localStorage.getItem(DISMISS_KEY) || "{}"); } catch { return {}; }
}
export function isDismissed(sig) { return !!getDismissed()[sig]; }
export function isIgnoredThisSession(sig) { return sessionIgnored.has(sig); }

export function dismissPermanently(finding) {
  const d = getDismissed();
  d[finding.id] = { at: new Date().toISOString(), original: finding.original, message: finding.message };
  localStorage.setItem(DISMISS_KEY, JSON.stringify(d));
  appendAudit({ action: "dismiss", finding: finding.id, module: finding.module, original: finding.original });
  window.dispatchEvent(new Event("mi_rie_changed"));
}

export function ignoreThisSession(finding) {
  sessionIgnored.add(finding.id);
  appendAudit({ action: "ignore", finding: finding.id, module: finding.module, original: finding.original });
  window.dispatchEvent(new Event("mi_rie_changed"));
}

export function undismiss(sig) {
  const d = getDismissed();
  delete d[sig];
  localStorage.setItem(DISMISS_KEY, JSON.stringify(d));
  window.dispatchEvent(new Event("mi_rie_changed"));
}
