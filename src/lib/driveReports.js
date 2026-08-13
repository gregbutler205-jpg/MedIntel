// ── Drive report archive (v1.48.0) ──────────────────────────────────────────
// Original report files (PDFs the patient already handed the app for
// extraction/summarizing) are passed through to the patient's OWN Google
// Drive, into a standard folder structure the app creates once:
//
//   Insina Health Reports/
//     Imaging & Diagnostics · Lab Reports · Clinical Notes ·
//     Operative & Procedures · Hospital & Discharge · Referrals · Other
//
// The record keeps only a LINK (reportLink/driveLink) — never the file bytes.
// Scope constraint (drive.file, deliberate): the app can create folders and
// files and see the ones IT created, but cannot list files the patient drops
// into these folders via the Drive UI — that's why links can also be pasted
// by hand anywhere they're displayed.
//
// Uploads are strictly best-effort side effects: every caller treats a null
// return as "not archived" and saves the record regardless. No save path may
// ever block on Drive.

import { getAccessToken, ensureAccessToken } from "./googleAuth.js";
import { isDemoMode } from "./secureStorage.js";

export const REPORT_ROOT = "Insina Health Reports";
export const REPORT_AREAS = [
  "Imaging & Diagnostics",
  "Lab Reports",
  "Clinical Notes",
  "Operative & Procedures",
  "Hospital & Discharge",
  "Referrals",
  "Other",
];

const FOLDERS_KEY = "mi_drive_report_folders"; // { rootId, rootLink, areas: { [name]: { id, link } } }
const DRIVE_API    = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";

// ── Pure helpers (unit-tested in scripts/testDriveReports.mjs) ───────────────

/** mi_records `type` (Tab12 import) → archive area. */
export function areaForRecordType(type) {
  switch (type) {
    case "Lab Report": return "Lab Reports";
    case "Imaging":    return "Imaging & Diagnostics";
    case "Visit Note": return "Clinical Notes";
    case "Procedure":  return "Operative & Procedures";
    case "Hospital":   return "Hospital & Discharge";
    default:           return "Other";
  }
}

/** mi_documents `category` id (Tab09) → archive area. */
export function areaForDocCategory(category) {
  switch (category) {
    case "labs":      return "Lab Reports";
    case "imaging":   return "Imaging & Diagnostics";
    case "operative": return "Operative & Procedures";
    case "clinical":  return "Clinical Notes";
    case "referrals": return "Referrals";
    case "discharge": return "Hospital & Discharge";
    default:          return "Other";
  }
}

/** Only ever render https links a person pasted or Drive returned. */
export function sanitizeReportUrl(url) {
  const s = String(url || "").trim();
  return /^https:\/\//i.test(s) ? s : "";
}

/**
 * Archive filename: "YYYY-MM-DD — Title.pdf". Falls back to today when the
 * record has no date; keeps the original file's extension; strips path
 * separators so a hostile title can't nest.
 */
export function reportFileName(dateISO, title, originalName) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateISO || "") ? dateISO : new Date().toISOString().slice(0, 10);
  const extMatch = /\.[A-Za-z0-9]{1,8}$/.exec(originalName || "");
  const ext = extMatch ? extMatch[0] : ".pdf";
  const clean = String(title || "Report").replace(/[/\\]/g, "-").trim().slice(0, 120) || "Report";
  return `${date} — ${clean}${ext}`;
}

/** Cached folder state (ids + links), or null if never set up. */
export function getReportFolderState() {
  try { return JSON.parse(localStorage.getItem(FOLDERS_KEY) || "null"); } catch { return null; }
}

// ── Drive plumbing ───────────────────────────────────────────────────────────

async function driveList(token, q) {
  const url = `${DRIVE_API}?q=${encodeURIComponent(q)}&fields=${encodeURIComponent("files(id,name,webViewLink)")}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Drive list ${res.status}`);
  return (await res.json()).files || [];
}

async function createFolder(token, name, parentId) {
  const body = { name, mimeType: "application/vnd.google-apps.folder" };
  if (parentId) body.parents = [parentId];
  const res = await fetch(`${DRIVE_API}?fields=${encodeURIComponent("id,webViewLink")}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Drive folder create ${res.status}`);
  return await res.json();
}

async function findOrCreateFolder(token, name, parentId) {
  const parentClause = parentId ? ` and '${parentId}' in parents` : "";
  const q = `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parentClause}`;
  const found = await driveList(token, q);
  if (found[0]) return found[0];
  return await createFolder(token, name, parentId);
}

/**
 * Create (or re-find) the full folder structure and cache ids+links.
 * interactive=true may pop the Google sign-in (Settings button);
 * interactive=false uses a live token or gives up silently (background paths).
 * Returns the folder state, or null when unavailable (demo, no token, error).
 */
export async function ensureReportFolders({ interactive = false } = {}) {
  if (isDemoMode()) return null; // never touch a demo visitor's real Drive
  let token = getAccessToken();
  if (!token && interactive) {
    try { token = await ensureAccessToken(); } catch { return null; }
  }
  if (!token) return null;

  const root = await findOrCreateFolder(token, REPORT_ROOT, null);
  const areas = {};
  for (const name of REPORT_AREAS) {
    const f = await findOrCreateFolder(token, name, root.id);
    areas[name] = { id: f.id, link: f.webViewLink || "" };
  }
  const state = { rootId: root.id, rootLink: root.webViewLink || "", areas };
  localStorage.setItem(FOLDERS_KEY, JSON.stringify(state));
  return state;
}

async function uploadFileToFolder(token, file, name, folderId) {
  const meta = JSON.stringify({ name, parents: [folderId] });
  const form = new FormData();
  form.append("metadata", new Blob([meta], { type: "application/json" }));
  form.append("file", file);
  const res = await fetch(`${DRIVE_UPLOAD}?uploadType=multipart&fields=${encodeURIComponent("id,webViewLink,name")}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Drive upload ${res.status}`);
  return await res.json();
}

/**
 * Pass an original report file through to the archive. Returns
 * { fileId, url, name } on success, or null when archiving isn't possible
 * (demo mode, Drive not connected, or any Drive error). Never throws.
 */
export async function uploadReportToDrive(file, { area, dateISO, title } = {}) {
  try {
    if (isDemoMode() || !file) return null;
    const token = getAccessToken();
    if (!token) return null;

    let state = getReportFolderState();
    if (!state) state = await ensureReportFolders();
    if (!state) return null;

    const areaName = REPORT_AREAS.includes(area) ? area : "Other";
    const name = reportFileName(dateISO, title, file.name);

    try {
      const f = await uploadFileToFolder(token, file, name, state.areas[areaName].id);
      return { fileId: f.id, url: sanitizeReportUrl(f.webViewLink), name: f.name };
    } catch {
      // Stale cached folder ids (folder deleted / different account): rebuild once and retry.
      localStorage.removeItem(FOLDERS_KEY);
      const fresh = await ensureReportFolders();
      if (!fresh) return null;
      const f = await uploadFileToFolder(token, file, name, fresh.areas[areaName].id);
      return { fileId: f.id, url: sanitizeReportUrl(f.webViewLink), name: f.name };
    }
  } catch (e) {
    console.warn("[driveReports] archive skipped:", e?.message || e);
    return null;
  }
}
