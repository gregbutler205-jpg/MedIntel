// ── Google Drive Sync — Data Module ─────────────────────────────────────────
// Stores all health data in the user's own Google Drive appDataFolder.
// This is a hidden folder only accessible by Insina Health — users can't see
// these files in their Drive UI, and Insina Health servers never touch them.

const BACKUP_FILENAME = "insina-health-backup.json";
const DRIVE_API    = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";

// Keys excluded from backup (auth state, session flags, device-specific security)
const EXCLUDE_KEYS = new Set(["mi_google_user", "mi_unlocked", "mi_auth_hash"]);

// ── Local data helpers ────────────────────────────────────────────────────────

/** Snapshot all mi_* localStorage keys into a plain object. */
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
  const content = JSON.stringify(collectLocalData(), null, 2);
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
 * Restore Drive data into localStorage.
 * Strategy:
 *   - Key missing locally → write Drive value
 *   - Both are arrays → merge (local takes priority for same-key items)
 *   - Both are objects → shallow merge (Drive wins for conflicting scalar fields)
 *   - Primitive / unknown → keep local (active session data)
 * Returns the count of keys processed.
 */
export function mergeIntoLocal(driveData) {
  if (!driveData) return 0;
  let count = 0;

  for (const [key, value] of Object.entries(driveData)) {
    if (!key.startsWith("mi_") || EXCLUDE_KEYS.has(key)) continue;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        localStorage.setItem(key, JSON.stringify(value));
      } else {
        const local = JSON.parse(raw);
        if (Array.isArray(value) && Array.isArray(local)) {
          localStorage.setItem(key, JSON.stringify(_mergeArrays(local, value)));
        } else if (value && typeof value === "object" && !Array.isArray(value)) {
          localStorage.setItem(key, JSON.stringify({ ...local, ...value }));
        }
        // primitives: keep local
      }
      count++;
    } catch {
      // Local value exists but couldn't be parsed — keep it as-is rather than
      // overwriting with a JSON.stringify'd copy that would corrupt raw strings
      // (e.g. hex hashes, plain-string values stored without JSON encoding).
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
  mergeIntoLocal(driveData);
  return await uploadToDrive(token);
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
