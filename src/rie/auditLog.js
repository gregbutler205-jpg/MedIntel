// ── RIE · Audit Log ──────────────────────────────────────────────────────────
// Append-only record of every patient action on a finding (fix / ignore /
// dismiss / override). Stored under an mi_ key so it rides Google Drive sync.

const KEY = "mi_rie_audit";

export function appendAudit(entry) {
  try {
    const log = JSON.parse(localStorage.getItem(KEY) || "[]");
    log.unshift({ ...entry, at: new Date().toISOString() });
    localStorage.setItem(KEY, JSON.stringify(log.slice(0, 1000)));
  } catch {}
}

export function getAudit() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
