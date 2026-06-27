// ─────────────────────────────────────────────────────────────────────────────
// visitCapture.js — Doctor Visit Capture model & persistence.
//
// Visit RECORDS live in mi_visits (localStorage → synced to Drive). Audio BLOBS
// are large, so they live in IndexedDB locally and upload to Drive separately
// (drive.file scope) via the outbox; the record only holds a reference.
//
// SCOPE NOTE: audio→text transcription is STUBBED behind transcribe() pending a
// provider decision (Claude can't transcribe audio). summarizeVisit() is REAL —
// it runs through the same proxy as the rest of Insina and works today from the
// manual-notes path (and from a transcript once transcription is wired in).
// ─────────────────────────────────────────────────────────────────────────────

import { rls, wls, uid, toISO, meds } from "./companionData.js";
import { askInsinaJSON, MODEL_LITE, MODEL_STRONG, buildRecordSystem } from "./companionAI.js";

// ── Visit records ─────────────────────────────────────────────────────────────
export function getVisits() {
  return rls("mi_visits", []).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}
export function getVisit(id) { return rls("mi_visits", []).find(v => v.id === id) || null; }
export function saveVisit(v) {
  const all = rls("mi_visits", []);
  const idx = all.findIndex(x => x.id === v.id);
  if (idx >= 0) all[idx] = v; else all.push(v);
  wls("mi_visits", all);
  return v;
}
export function newVisit(appt) {
  return {
    id: uid(),
    apptId: appt?.id || null,
    apptTitle: appt?.title || "Doctor visit",
    provider: appt?.provider || appt?.doctor || "",
    specialty: appt?.specialty || "",
    date: appt?.date ? String(appt.date).slice(0, 10) : toISO(),
    createdAt: new Date().toISOString(),
    consent: null,          // "agreed" | "declined" | "skipped"
    status: "new",          // new → recording → saved → summarized
    durationSec: 0,
    markers: [],            // seconds offsets of "important moment" taps
    notes: "",
    hasAudio: false,
    audioMime: "",
    audioDriveId: null,
    transcript: "",
    summary: null,          // { discussed, plan, whenToCall[], stillOpen[] }
    actionItems: [],        // [{ id, text, due, done, kind, med, confirmed }]
  };
}

// ── Audio blob store (IndexedDB) ──────────────────────────────────────────────
const DB = "insina-visit-audio", STORE = "audio";
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function tx(mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    const out = fn(store);
    t.oncomplete = () => resolve(out?.result ?? out);
    t.onerror = () => reject(t.error);
  });
}
export async function putAudio(visitId, blob) { return tx("readwrite", s => s.put({ blob, driveId: null }, visitId)); }
export async function getAudio(visitId) { const rec = await tx("readonly", s => s.get(visitId)); return rec?.blob || null; }

/**
 * Audio files are large and Drive isn't built to hold many. Once a visit has a
 * summary (its useful signal is extracted) and is older than `days`, drop the
 * local blob. Safe to call on app open.
 */
export async function cleanupOldAudio(days = 30) {
  const cutoff = Date.now() - days * 86400000;
  for (const v of getVisits()) {
    if (v.status === "summarized" && v.hasAudio && new Date(v.createdAt || 0).getTime() < cutoff) {
      try { await deleteAudio(v.id); saveVisit({ ...v, hasAudio: false }); } catch { /* ignore */ }
    }
  }
}
export async function putAudioDriveId(visitId, driveId) {
  const rec = await tx("readonly", s => s.get(visitId));
  if (rec) await tx("readwrite", s => s.put({ ...rec, driveId }, visitId));
}
export async function deleteAudio(visitId) { return tx("readwrite", s => s.delete(visitId)); }

// ── Transcription (STUB) ──────────────────────────────────────────────────────
// TODO: wire a real provider (e.g. Whisper via the proxy) — Claude can't do audio.
// Until then, declined/skipped visits use manual notes; recorded visits surface a
// clear placeholder so the rest of the flow (summary, action items) is testable.
export async function transcribe(/* visitId */) {
  return { transcript: "", stubbed: true };
}

// ── AI summary (REAL — runs through the proxy) ───────────────────────────────
const SUMMARY_SYSTEM = `You are summarizing a doctor's visit for the patient's own records. Read the source text (a visit transcript, or the patient's manual notes if no recording was made) and extract a structured summary. Scan specifically for: medication changes (started / stopped / dose changed), new diagnoses, tests/labs/imaging ordered, referrals, follow-ups needed, procedures discussed, and at-home instructions.

Return ONLY JSON with this exact shape:
{
  "discussed": "1-3 sentences on main topics and the doctor's assessment",
  "plan": ["short bullet", "..."],
  "whenToCall": ["any warning-sign instruction, e.g. 'Call if fever over 100.4'"],
  "stillOpen": ["questions the patient meant to ask that the text shows went unanswered"],
  "actionItems": [
    { "text": "what to do", "due": "ISO date or ''", "kind": "task" },
    { "text": "Start/stop/change <med>", "due": "", "kind": "med-change",
      "med": { "name": "drug", "action": "start|stop|change", "detail": "dose/frequency or reason" } }
  ]
}
Be faithful to the source — never invent clinical facts. If the source is thin, return shorter lists. Output JSON only, no prose.`;

/**
 * Produce the structured summary + action items for a visit from its transcript
 * (preferred) or manual notes. Returns the updated visit (also persisted).
 */
export async function summarizeVisit(visit) {
  const source = (visit.transcript || "").trim() || (visit.notes || "").trim();
  if (!source) {
    const updated = { ...visit, status: "summarized", summary: { discussed: "No recording or notes were captured for this visit.", plan: [], whenToCall: [], stillOpen: [] }, actionItems: [] };
    return saveVisit(updated);
  }
  // Long transcripts → stronger model; short notes → cheap model.
  const model = source.length > 4000 ? MODEL_STRONG : MODEL_LITE;
  const data = await askInsinaJSON({
    system: SUMMARY_SYSTEM,
    messages: [{ role: "user", content: `Source text from the visit:\n\n${source}\n\nPatient context: ${buildRecordSystem()}` }],
    model, max_tokens: 1500,
  });
  const actionItems = (data.actionItems || []).map(it => ({
    id: uid(), text: it.text || "", due: it.due || "", done: false,
    kind: it.kind === "med-change" ? "med-change" : "task",
    med: it.med || null, confirmed: false,
  }));
  const updated = {
    ...visit, status: "summarized",
    summary: {
      discussed: data.discussed || "",
      plan: data.plan || [],
      whenToCall: data.whenToCall || [],
      stillOpen: data.stillOpen || [],
    },
    actionItems,
  };
  return saveVisit(updated);
}

// ── Action items ──────────────────────────────────────────────────────────────
export function toggleActionItem(visitId, itemId) {
  const v = getVisit(visitId); if (!v) return null;
  v.actionItems = v.actionItems.map(it => it.id === itemId ? { ...it, done: !it.done } : it);
  return saveVisit(v);
}

/**
 * HARD RULE: the app never changes the medication list on its own. A detected
 * med change applies to mi_meds_full ONLY when the patient explicitly confirms it.
 */
export function confirmMedChange(visitId, itemId) {
  const v = getVisit(visitId); if (!v) return null;
  const item = v.actionItems.find(it => it.id === itemId);
  if (!item || item.kind !== "med-change" || !item.med) return v;

  const list = meds();
  const { name, action, detail } = item.med;
  const idx = list.findIndex(m => (m.name || "").toLowerCase() === (name || "").toLowerCase());
  if (action === "stop" && idx >= 0) {
    list[idx] = { ...list[idx], status: "inactive" };
  } else if (action === "change" && idx >= 0) {
    list[idx] = { ...list[idx], notes: [list[idx].notes, `Visit ${v.date}: ${detail}`].filter(Boolean).join(" · ") };
  } else if (action === "start" && idx < 0) {
    list.push({ id: Date.now(), name, dose: detail || "", frequency: "", schedule: "", category: "From visit", status: "ok", refillDate: "", prescriber: v.provider, notes: `Added from visit ${v.date}`, flag: false });
  }
  wls("mi_meds_full", list);
  v.actionItems = v.actionItems.map(it => it.id === itemId ? { ...it, confirmed: true, done: true } : it);
  return saveVisit(v);
}
