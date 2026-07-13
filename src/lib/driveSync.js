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

/** Snapshot all managed mi_* keys as raw ciphertext blobs. Used for every Drive upload — P-02 point 7. */
function collectLocalCiphertext() {
  const data = { _exportedAt: new Date().toISOString() };
  for (const key of secureStorage.allManagedKeys()) {
    if (EXCLUDE_KEYS.has(key)) continue;
    const raw = secureStorage.getRawCiphertext(key);
    if (raw == null) continue;
    try { data[key] = JSON.parse(raw); } catch { /* not yet migrated to ciphertext — skip rather than upload plaintext */ }
  }
  return data;
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
      // Local value exists but couldn't be parsed — keep it as-is rather than
      // overwriting with a copy that would corrupt an unparseable local value.
      count++;
    }
  }
  return count;
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
