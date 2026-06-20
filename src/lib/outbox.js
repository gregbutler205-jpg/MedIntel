// ─────────────────────────────────────────────────────────────────────────────
// outbox.js — Offline-first write queue. Capture always works offline; anything
// that needs the network (Drive sync, visit-audio upload) is enqueued here and
// flushed when a connection returns. The patient is never blocked from capturing.
// ─────────────────────────────────────────────────────────────────────────────

import { rls, wls, uid } from "./companionData.js";
import { uploadToDrive } from "./driveSync.js";
import { getAudio, putAudioDriveId } from "./visitCapture.js";

const KEY = "mi_outbox";

export function getOutbox() { return rls(KEY, []); }
function save(jobs) { wls(KEY, jobs); }

/** Queue a job. type: "drive-sync" | "visit-audio". Dedupes drive-sync jobs. */
export function enqueue(type, payload = {}) {
  const jobs = getOutbox();
  if (type === "drive-sync" && jobs.some(j => j.type === "drive-sync")) return; // collapse — one sync covers all
  save([...jobs, { id: uid(), type, payload, ts: Date.now() }]);
}

const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";

/** Upload a visit's audio blob to Drive (drive.file scope) and record its file id. */
async function uploadVisitAudio(token, visitId) {
  const blob = await getAudio(visitId);
  if (!blob) return; // nothing stored (declined/skipped recording) — treat as done
  const meta = JSON.stringify({ name: `insina-visit-${visitId}.webm` });
  const form = new FormData();
  form.append("metadata", new Blob([meta], { type: "application/json" }));
  form.append("file", blob);
  const res = await fetch(`${DRIVE_UPLOAD}?uploadType=multipart&fields=id`, {
    method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form,
  });
  if (!res.ok) throw new Error(`Visit-audio upload ${res.status}`);
  const { id } = await res.json();
  await putAudioDriveId(visitId, id);
}

/**
 * Try to drain the queue. Requires a valid token (skips silently otherwise).
 * Jobs that throw stay queued for the next attempt.
 */
export async function flush(token) {
  if (!token || !navigator.onLine) return;
  let jobs = getOutbox();
  if (!jobs.length) return;
  const remaining = [];
  for (const job of jobs) {
    try {
      if (job.type === "drive-sync")  await uploadToDrive(token);
      else if (job.type === "visit-audio") await uploadVisitAudio(token, job.payload.visitId);
    } catch {
      remaining.push(job); // keep for retry
    }
  }
  save(remaining);
}
