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
    // DEC-043 item 2: tie the event to its source reading and record what the
    // patient had (or hadn't) verified at fire time.
    readingId: hit.readingId ?? null,
    verification: hit.verification || (hit.source === "staged" ? "unverified-import" : "patient-entered"),
    tableVersion: hit.tableVersion,
    templateVersion: templateVersion || null,
    dismissedAt: null,
    // DEC-043 item 3: verify-first outcome for staged values.
    verifiedAt: null,
    rejectedAt: null,
    // DEC-043 item 6: optional, self-reported — never Insina-verified.
    careTeamContactedAt: null,
  });
  writeAll(events);
  return id;
}

/** Record the dismissal instant for an event (the takeover's "I understand").
 * Dismissal means ONLY that the warning was closed — never that the patient
 * contacted anyone or followed the recommendation. */
export function markAdvisoryDismissed(id) {
  if (!id) return;
  const events = readAll();
  const e = events.find(x => x.id === id);
  if (e && !e.dismissedAt) { e.dismissedAt = new Date().toISOString(); writeAll(events); }
}

/** Verify-first (staged values): the patient confirmed the imported value
 * against the original document, so the standard advisory then fired. */
export function markAdvisoryVerified(id) {
  if (!id) return;
  const events = readAll();
  const e = events.find(x => x.id === id);
  if (e && !e.verifiedAt) { e.verifiedAt = new Date().toISOString(); e.verification = "patient-verified"; writeAll(events); }
}

/** Verify-first (staged values): the patient said the imported value is wrong —
 * no advisory workflow fired; the value goes back to Import Review. */
export function markAdvisoryRejected(id) {
  if (!id) return;
  const events = readAll();
  const e = events.find(x => x.id === id);
  if (e && !e.rejectedAt) { e.rejectedAt = new Date().toISOString(); e.verification = "patient-rejected"; writeAll(events); }
}

/** Optional self-reported action: "Mark care team contacted — self-reported."
 * User-reported only; Insina never verifies contact happened. Separate from
 * dismissal by design (DEC-043 item 6). */
export function markCareTeamContacted(id) {
  if (!id) return;
  const events = readAll();
  const e = events.find(x => x.id === id);
  if (e && !e.careTeamContactedAt) { e.careTeamContactedAt = new Date().toISOString(); writeAll(events); }
}

/** All advisory events, for the Data & Backup export. */
export function getAdvisoryEvents() { return readAll(); }
