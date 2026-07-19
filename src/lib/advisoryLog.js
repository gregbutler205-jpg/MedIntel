// ── DEC-PNN pending: tripwire advisory — event log (§6) ──────────────────────
// Every advisory that fires is appended here. No UI surfaces the log in pilot
// beyond the takeover event itself; it IS included in the Data & Backup export
// (Tab13) so a clinician/Greg can audit what fired. Vault-managed key (mi_*),
// so it is encrypted at rest like the rest of the record.

const KEY = "mi_advisory_events";

function readAll() {
  try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}
function writeAll(events) {
  try { localStorage.setItem(KEY, JSON.stringify(events)); } catch { /* locked/quota — non-fatal */ }
}

let _seq = 0;
function genId() { return `adv_${Date.now().toString(36)}_${(_seq++).toString(36)}`; }

/**
 * Append one advisory event. `hit` is the evaluateEntry() result; `templateVersion`
 * is ADVISORY_TEMPLATES_VERSION. Returns the event id (used later by markDismissed).
 */
export function logAdvisoryEvent(hit, templateVersion) {
  const events = readAll();
  const id = genId();
  events.push({
    id,
    ts: new Date().toISOString(),
    metric: hit.metric,
    value: hit.value,
    unit: hit.unit,
    tier: hit.tier,
    source: hit.source,
    resultDate: hit.resultDate || null,
    tableVersion: hit.tableVersion,
    templateVersion: templateVersion || null,
    dismissedAt: null,
  });
  writeAll(events);
  return id;
}

/** Record the dismissal instant for an event (the takeover's "I understand"). */
export function markAdvisoryDismissed(id) {
  if (!id) return;
  const events = readAll();
  const e = events.find(x => x.id === id);
  if (e && !e.dismissedAt) { e.dismissedAt = new Date().toISOString(); writeAll(events); }
}

/** All advisory events, for the Data & Backup export. */
export function getAdvisoryEvents() { return readAll(); }
