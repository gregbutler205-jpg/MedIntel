// ── Google Drive Sync — Data Module ─────────────────────────────────────────
// Stores all health data in the user's own Google Drive appDataFolder.
// This is a hidden folder only accessible by Insina Health — users can't see
// these files in their Drive UI, and Insina Health servers never touch them.
//
// P-02 point 7: Drive uploads ciphertext only. collectLocalData() (plaintext,
// via the transparent decrypt-on-read interception in secureStorage.js) stays
// exactly as it was — it also backs the LOCAL "download backup" file, which
// is intentionally left human-readable for the patient's own portability,
// same reasoning as Tab13's export feature. Drive-bound functions use
// collectLocalCiphertext() instead, and merge logic decrypts before merging
// and re-encrypts before writing back.
import * as secureStorage from "./secureStorage.js";

const BACKUP_FILENAME        = "insina-health-backup.json";
const WEEKLY_BACKUP_PREFIX   = "insina-health-weekly-";
const WEEKLY_BACKUP_MAX      = 4;         // rolling window
export const WEEKLY_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;   // 7 days

const DRIVE_API    = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";

// Keys excluded from backup (auth state, session flags, device-specific security)
const EXCLUDE_KEYS = new Set(["mi_google_user", "mi_unlocked", "mi_auth_hash"]);

// ── Local data helpers ────────────────────────────────────────────────────────

/** Snapshot all mi_* localStorage keys into a plain object. Plaintext — for the local, human-readable "download backup" file only. Never used for Drive. */
export function collectLocalData() {
  const data = { _exportedAt: new Date().toISOString() };
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith("mi_") || EXCLUDE_KEYS.has(key)) continue;
    try   { data[key] = JSON.parse(localStorage.getItem(key)); }
    catch { data[key] = localStorage.getItem(key); }
  }
  return data;
}

/** Snapshot all managed mi_* keys as raw ciphertext blobs. Used for every Drive
 * upload — P-02 point 7 — and by folderBackup.js (v1.38.0), so the folder-backup
 * file is byte-for-byte the same protection class as the Drive backup. */
export function collectLocalCiphertext() {
  const data = { _exportedAt: new Date().toISOString() };
  // Include the vault key-envelope so a wiped/new device can rebuild the vault
  // and unlock with the passphrase OR recovery key. The envelope only WRAPS the
  // random data-key (it's not the key itself and carries no plaintext), so it is
  // useless without those secrets — safe to keep in the user's own Drive. Stored
  // under a non-mi_ key so the merge path skips it; restoreFromDrive handles it.
  // (Without this, a Drive backup was NOT recoverable on a new device — the gap
  // exposed by the 2026-07-19 incident.)
  const envelope = secureStorage.getRawCiphertext(secureStorage.VAULT_KEY);
  if (envelope != null) {
    try { data._vaultEnvelope = JSON.parse(envelope); } catch { data._vaultEnvelope = envelope; }
  }
  for (const key of secureStorage.allManagedKeys()) {
    if (EXCLUDE_KEYS.has(key)) continue;
    const raw = secureStorage.getRawCiphertext(key);
    if (raw == null) continue;
    try { data[key] = JSON.parse(raw); } catch { /* not yet migrated to ciphertext — skip rather than upload plaintext */ }
  }
  return data;
}

/**
 * Restore core, payload level: rebuild a device from an encrypted backup object
 * (envelope + ciphertext blobs), WITHOUT the DEK. Writes everything raw via
 * importRawCiphertext; the caller then reloads and unlocks with the passphrase
 * or recovery key. Shared by restoreFromDrive() and the folder/file restore
 * (folderBackup.js) so there is exactly one restore path.
 * Returns { count, hasEnvelope } or null for an empty payload.
 */
export function restoreFromBackupObject(data) {
  if (!data) return null;

  // No envelope → the blobs can't be decrypted on this device (old backup from
  // before the fix). Restore NOTHING rather than strand orphaned ciphertext.
  const hasEnvelope = data._vaultEnvelope != null;
  if (!hasEnvelope) return { count: 0, hasEnvelope: false };

  const env = typeof data._vaultEnvelope === "string"
    ? data._vaultEnvelope : JSON.stringify(data._vaultEnvelope);
  secureStorage.importRawCiphertext(secureStorage.VAULT_KEY, env);

  let count = 0;
  for (const [key, blob] of Object.entries(data)) {
    if (!key.startsWith("mi_") || EXCLUDE_KEYS.has(key)) continue;
    const raw = typeof blob === "string" ? blob : JSON.stringify(blob);
    secureStorage.importRawCiphertext(key, raw);
    count++;
  }
  return { count, hasEnvelope };
}

/**
 * Rebuild a wiped/new device from the Drive backup. Downloads, then delegates
 * to restoreFromBackupObject(). Returns { count, hasEnvelope } or null if no
 * Drive backup exists.
 */
export async function restoreFromDrive(token) {
  const driveData = await downloadFromDrive(token);
  if (!driveData) return null;
  return restoreFromBackupObject(driveData);
}

// ── Drive file helpers ────────────────────────────────────────────────────────

/** Find our backup file in appDataFolder. Returns metadata or null. */
async function findBackupFile(token) {
  const url =
    `${DRIVE_API}?spaces=appDataFolder` +
    `&q=name%3D'${BACKUP_FILENAME}'` +
    `&fields=files(id,modifiedTime,size)`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Drive list ${res.status}`);
  const json = await res.json();
  return json.files?.[0] ?? null;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Upload current localStorage snapshot to Drive.
 * Creates the file on first run; patches it on subsequent runs.
 * Returns the ISO timestamp of the sync.
 */
export async function uploadToDrive(token) {
  const content = JSON.stringify(collectLocalCiphertext(), null, 2);
  const blob    = new Blob([content], { type: "application/json" });

  const existing = await findBackupFile(token);

  if (existing) {
    const res = await fetch(
      `${DRIVE_UPLOAD}/${existing.id}?uploadType=media`,
      {
        method:  "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body:    blob,
      }
    );
    if (!res.ok) throw new Error(`Drive PATCH ${res.status}`);
  } else {
    const meta = JSON.stringify({ name: BACKUP_FILENAME, parents: ["appDataFolder"] });
    const form = new FormData();
    form.append("metadata", new Blob([meta], { type: "application/json" }));
    form.append("file", blob);
    const res = await fetch(
      `${DRIVE_UPLOAD}?uploadType=multipart&fields=id`,
      { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form }
    );
    if (!res.ok) throw new Error(`Drive POST ${res.status}`);
  }

  const ts = new Date().toISOString();
  localStorage.setItem("mi_last_sync", ts);
  return ts;
}

/**
 * Download the backup from Drive.
 * Returns the parsed JSON object, or null if no backup file exists yet.
 */
export async function downloadFromDrive(token) {
  const file = await findBackupFile(token);
  if (!file) return null;

  const res = await fetch(`${DRIVE_API}/${file.id}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Drive GET ${res.status}`);
  return await res.json();
}

/**
 * Restore Drive data into localStorage. Drive values arrive as ciphertext
 * blobs ({v,iv,data} — collectLocalCiphertext()'s output); each is decrypted
 * with the local (unlocked) DEK before merging — P-02's single-device-key
 * model assumes every device sharing this Drive backup unlocks with the same
 * passphrase/recovery key, so Drive ciphertext is always decryptable locally
 * once unlocked. The merged plaintext is re-encrypted on write via
 * secureStorage.setEncrypted(), never written as plaintext.
 * Strategy:
 *   - Key missing locally → write Drive value
 *   - Both are arrays → merge (local takes priority for same-key items)
 *   - Both are objects → shallow merge (Drive wins for conflicting scalar fields)
 *   - Primitive / unknown → keep local (active session data)
 * Returns the count of keys processed.
 */
export async function mergeIntoLocal(driveData) {
  if (!driveData) return 0;
  let count = 0;
  const failures = [];

  for (const [key, blob] of Object.entries(driveData)) {
    if (!key.startsWith("mi_") || EXCLUDE_KEYS.has(key) || key === "_exportedAt") continue;
    try {
      const driveRaw = await secureStorage.decryptRaw(JSON.stringify(blob));
      const value = JSON.parse(driveRaw);

      const localRaw = secureStorage.getRawCiphertext(key);
      const localPlain = localRaw != null ? await secureStorage.decryptRaw(localRaw) : null;

      if (localPlain == null) {
        await secureStorage.setEncrypted(key, JSON.stringify(value));
      } else {
        const local = JSON.parse(localPlain);
        if (Array.isArray(value) && Array.isArray(local)) {
          await secureStorage.setEncrypted(key, JSON.stringify(_mergeArrays(local, value)));
        } else if (value && typeof value === "object" && !Array.isArray(value)) {
          await secureStorage.setEncrypted(key, JSON.stringify({ ...local, ...value }));
        }
        // primitives: keep local
      }
      count++;
    } catch {
      // Keep local rather than overwrite with something unreadable — but COUNT
      // the failure. A blob from Drive that won't decrypt here almost always
      // means another device wrote it under a DIFFERENT vault key (AES-GCM auth
      // failure): sync would otherwise "succeed" forever while transferring
      // nothing — exactly the invisible "phone changes never reach the web"
      // failure. The diagnostic below makes it visible in Settings & Backup.
      failures.push(key);
      count++;
    }
  }

  // Sync diagnostic (metadata only: key NAMES and counts, never values).
  // Non-managed key on purpose — it must be readable even when a diverged key
  // makes everything else unreadable.
  try {
    localStorage.setItem("insina_sync_diag", JSON.stringify({
      ts: new Date().toISOString(),
      merged: count - failures.length,
      failed: failures.length,
      failedKeys: failures.slice(0, 20),
    }));
  } catch { /* non-fatal */ }

  return count;
}

/** Last merge diagnostic ({ts, merged, failed, failedKeys}) or null. */
export function readSyncDiag() {
  try { const r = localStorage.getItem("insina_sync_diag"); return r ? JSON.parse(r) : null; } catch { return null; }
}

/**
 * Short fingerprint of THIS device's vault key-envelope (SHA-256, first 8 hex).
 * Two devices can sync records to each other only when their fingerprints
 * match (same wrapped data-key). Shown in Settings & Backup and the companion
 * so a key divergence is a visible fact instead of a silent sync no-op.
 * Returns null when no vault exists.
 */
export async function getVaultFingerprint() {
  const raw = secureStorage.getRawCiphertext(secureStorage.VAULT_KEY);
  if (raw == null) return null;
  const bytes = new TextEncoder().encode(raw);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].slice(0, 4).map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Full bidirectional sync:
 *   1. Download Drive backup
 *   2. Merge into local localStorage
 *   3. Upload merged result back to Drive
 * Returns the ISO timestamp of the completed sync.
 */
export async function fullSync(token) {
  const driveData = await downloadFromDrive(token);
  await mergeIntoLocal(driveData);
  return await uploadToDrive(token);
}

// ── Weekly snapshot backups ───────────────────────────────────────────────────

/** List all weekly snapshot files in appDataFolder, sorted newest-first. */
async function listWeeklyFiles(token) {
  const q = encodeURIComponent(`name contains '${WEEKLY_BACKUP_PREFIX}' and trashed = false`);
  const url = `${DRIVE_API}?spaces=appDataFolder&q=${q}&fields=files(id,name,createdTime)&orderBy=createdTime desc`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Drive list weekly ${res.status}`);
  const json = await res.json();
  return json.files ?? [];
}

/** Delete a Drive file by ID. */
async function deleteFile(token, fileId) {
  await fetch(`${DRIVE_API}/${fileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

/**
 * Create a new dated weekly snapshot in appDataFolder.
 * Prunes oldest files so only WEEKLY_BACKUP_MAX copies are kept.
 * Returns the ISO timestamp of the backup.
 */
export async function uploadWeeklyBackup(token) {
  const dateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const filename = `${WEEKLY_BACKUP_PREFIX}${dateStr}.json`;
  const content  = JSON.stringify({ ...collectLocalCiphertext(), _weeklyBackup: true }, null, 2);
  const blob     = new Blob([content], { type: "application/json" });

  // Upload new snapshot
  const meta = JSON.stringify({ name: filename, parents: ["appDataFolder"] });
  const form = new FormData();
  form.append("metadata", new Blob([meta], { type: "application/json" }));
  form.append("file", blob);
  const res = await fetch(
    `${DRIVE_UPLOAD}?uploadType=multipart&fields=id`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form }
  );
  if (!res.ok) throw new Error(`Drive weekly POST ${res.status}`);

  // Prune — keep newest WEEKLY_BACKUP_MAX, delete the rest
  const existing = await listWeeklyFiles(token);
  const toDelete = existing.slice(WEEKLY_BACKUP_MAX - 1); // already sorted newest-first; new one not yet in list
  await Promise.all(toDelete.map(f => deleteFile(token, f.id)));

  const ts = new Date().toISOString();
  localStorage.setItem("mi_last_weekly_backup", ts);
  return ts;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Merge two arrays, deduplicating by id → ts → date → stringified value. Local items win. */
function _mergeArrays(local, drive) {
  const seen = new Map();
  // Local first → local wins on duplicate key
  for (const item of [...local, ...drive]) {
    const key = item?.id ?? item?.ts ?? item?.date ?? JSON.stringify(item);
    if (!seen.has(key)) seen.set(key, item);
  }
  return Array.from(seen.values());
}
