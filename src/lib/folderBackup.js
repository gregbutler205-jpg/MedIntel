// ── Folder backup (File System Access API) — the no-Google backup channel ────
// v1.38.0: users who can't or won't use Google Drive pick a local folder once;
// Insina writes dated, ENCRYPTED backup files there (rolling 4, like the Drive
// weekly snapshots). Pointing the folder at a Dropbox / OneDrive / iCloud Drive
// synced directory gives them automatic cloud backup on their own provider with
// zero new OAuth integrations — the non-custodial story is unchanged.
//
// Payload parity is the load-bearing rule: the file content comes from
// driveSync.collectLocalCiphertext() — ciphertext blobs + the wrapped key
// envelope, byte-for-byte the same protection class as a Drive backup. NEVER
// write collectLocalData() (plaintext) here: the chosen folder may sync to a
// third-party cloud, and plaintext PHI there would silently undo P-02 point 7.
//
// Directory handles can persist ONLY in IndexedDB (they are structured-cloneable
// but not JSON-serializable), so this module keeps a tiny IDB store for the one
// handle — same pattern as visitCapture.js. Chromium-only surface: feature-
// detect with isFolderBackupSupported() and render nothing elsewhere.

import { collectLocalCiphertext, restoreFromBackupObject } from "./driveSync.js";
import * as secureStorage from "./secureStorage.js";

export const FOLDER_BACKUP_PREFIX = "insina-backup-";
const FOLDER_BACKUP_MAX = 4; // rolling window, mirrors WEEKLY_BACKUP_MAX

export function isFolderBackupSupported() {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

// ── Handle persistence (IndexedDB) ───────────────────────────────────────────
const DB = "insina-folder-backup", STORE = "handles", HANDLE_KEY = "backupDir";
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
    const out = fn(t.objectStore(STORE));
    // For a get() on a missing key, request.result is undefined — resolve THAT,
    // never the IDBRequest itself (a truthy request would masquerade as a saved
    // handle and flip the UI into its "configured" state on a fresh browser).
    t.oncomplete = () => resolve(out instanceof IDBRequest ? out.result : out);
    t.onerror = () => reject(t.error);
  });
}

export async function getSavedFolderHandle() {
  try { return (await tx("readonly", s => s.get(HANDLE_KEY))) || null; }
  catch { return null; }
}

/** Show the OS folder picker and remember the choice. Returns the folder name.
 * Throws AbortError if the user cancels the picker. */
export async function chooseBackupFolder() {
  const handle = await window.showDirectoryPicker({ mode: "readwrite" });
  await tx("readwrite", s => s.put(handle, HANDLE_KEY));
  return handle.name;
}

export async function clearBackupFolder() {
  try { await tx("readwrite", s => s.delete(HANDLE_KEY)); } catch { /* nothing saved */ }
}

/** UI status: { supported, configured, name?, permission? } — permission is
 * "granted" | "prompt" | "denied" (browser may reset it between sessions). */
export async function getFolderStatus() {
  if (!isFolderBackupSupported()) return { supported: false, configured: false };
  const handle = await getSavedFolderHandle();
  if (!handle) return { supported: true, configured: false };
  let permission = "prompt";
  try { permission = await handle.queryPermission({ mode: "readwrite" }); } catch { /* treat as prompt */ }
  return { supported: true, configured: true, name: handle.name, permission };
}

export class FolderBackupError extends Error {
  constructor(code, message) { super(message); this.name = "FolderBackupError"; this.code = code; }
}

/**
 * Write today's encrypted backup file into the chosen folder and prune to the
 * rolling window. Same-day runs overwrite the same dated file (idempotent).
 * interactive:true may show the browser's permission re-prompt (needs a user
 * gesture); interactive:false (the silent weekly attempt) never prompts.
 */
export async function backupToFolder({ interactive = false } = {}) {
  const handle = await getSavedFolderHandle();
  if (!handle) throw new FolderBackupError("no-folder", "No backup folder has been chosen yet.");

  let perm = "prompt";
  try { perm = await handle.queryPermission({ mode: "readwrite" }); } catch { /* treat as prompt */ }
  if (perm !== "granted") {
    if (!interactive) throw new FolderBackupError("permission", "Folder permission not currently granted.");
    perm = await handle.requestPermission({ mode: "readwrite" });
    if (perm !== "granted") throw new FolderBackupError("permission", "Folder permission was declined.");
  }

  const dateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const payload = { ...collectLocalCiphertext(), _folderBackup: true };
  const fileHandle = await handle.getFileHandle(`${FOLDER_BACKUP_PREFIX}${dateStr}.json`, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(payload, null, 2));
  await writable.close();

  // Prune — keep the newest FOLDER_BACKUP_MAX dated files (names sort by date).
  const names = [];
  for await (const [name] of handle.entries()) {
    if (name.startsWith(FOLDER_BACKUP_PREFIX) && name.endsWith(".json")) names.push(name);
  }
  names.sort().reverse();
  for (const name of names.slice(FOLDER_BACKUP_MAX)) {
    try { await handle.removeEntry(name); } catch { /* best-effort prune */ }
  }

  const ts = new Date().toISOString();
  // Managed key: silently ignored while locked (same as mi_last_weekly_backup).
  // Harmless — the dated filename makes a repeat run the same day idempotent.
  localStorage.setItem("mi_last_folder_backup", ts);
  return ts;
}

/** Silent boot-time attempt (App weekly check). True only if a backup was
 * actually written — false covers unsupported / unconfigured / permission
 * lapsed / write failure, so the caller can fall back to the reminder banner. */
export async function attemptAutoFolderBackup() {
  try {
    if (!isFolderBackupSupported()) return false;
    await backupToFolder({ interactive: false });
    return true;
  } catch {
    return false;
  }
}

// ── Encrypted backup-file restore (LockScreen + Tab13 import both route here) ─

function looksLikeCiphertext(v) {
  if (v == null) return false;
  let o = v;
  if (typeof v === "string") { try { o = JSON.parse(v); } catch { return false; } }
  return !!o && typeof o === "object" && o.v === 1 && typeof o.iv === "string" && typeof o.data === "string";
}

/** True when a parsed backup file is the ENCRYPTED format (Drive/folder backup:
 * envelope and/or ciphertext-shaped mi_* blobs) as opposed to the readable
 * plaintext export, which takes Tab13's plaintext import path instead. */
export function isEncryptedBackupPayload(data) {
  if (!data || typeof data !== "object") return false;
  if (data._vaultEnvelope != null) return true;
  return Object.entries(data).some(([k, v]) => k.startsWith("mi_") && looksLikeCiphertext(v));
}

/**
 * Restore an encrypted backup object via the raw-import path (never through the
 * patched setItem — while unlocked that would treat ciphertext as plaintext and
 * DOUBLE-encrypt it, corrupting every restored key). Guards:
 *  - no envelope → refuse (blobs would be stranded undecryptable);
 *  - a DIFFERENT local vault exists → refuse (overwriting the envelope would
 *    lock the user out of the data they can currently open, and the file's
 *    blobs wouldn't decrypt under the local DEK anyway).
 * On success resets the schema stamp so the A-08 migrations re-run over the
 * restored (possibly older-schema) data after the next unlock. Caller reloads.
 */
export function restoreEncryptedBackup(data) {
  if (!isEncryptedBackupPayload(data)) {
    throw new FolderBackupError("not-encrypted", "Not an encrypted Insina backup file.");
  }
  if (data._vaultEnvelope == null) {
    throw new FolderBackupError("no-envelope", "This backup has no key envelope and cannot be restored on its own.");
  }
  const localEnv = secureStorage.getRawCiphertext(secureStorage.VAULT_KEY);
  if (localEnv != null) {
    const fileEnv = typeof data._vaultEnvelope === "string" ? data._vaultEnvelope : JSON.stringify(data._vaultEnvelope);
    const norm = s => { try { return JSON.stringify(JSON.parse(s)); } catch { return s; } };
    if (norm(localEnv) !== norm(fileEnv)) {
      throw new FolderBackupError("envelope-mismatch", "This backup belongs to a different vault (different password/recovery key) than the one on this device.");
    }
  }
  const result = restoreFromBackupObject(data);
  // Restored data may predate the current schema; the stamp gate would skip the
  // (idempotent) migrations otherwise — same reasoning as Tab13's plaintext path.
  localStorage.setItem("mi_schema_version", "1");
  return result;
}
