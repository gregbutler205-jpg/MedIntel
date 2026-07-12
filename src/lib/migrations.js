// ── Schema versioning & migration rails (A-08) ───────────────────────────────
// Every mi_* store change from here forward is an ordered, idempotent migration
// gated by mi_schema_version, run once at boot before first render. Twenty-plus
// prior releases evolved the stores with no recorded version; this file is the
// starting rail going forward, not a retroactive migration of undocumented
// history — migration v1 below is a no-op version stamp for exactly that reason.
//
// P-02 (vault encryption) and A-07 (binary blob move, Phase 2) are the first
// real migrations to land on these rails.

import { appendAudit } from "../rie/auditLog.js";

const VERSION_KEY     = "mi_schema_version";
const INTERRUPTED_KEY = "mi_migration_interrupted";

function getVersion() {
  const raw = localStorage.getItem(VERSION_KEY);
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}
function setVersion(v) { localStorage.setItem(VERSION_KEY, String(v)); }

/**
 * Download a full JSON export of the current mi_* record. This is the
 * export-backup-first step ahead of a major migration (CHANGELOG's own MAJOR
 * definition: breaking changes to how data is stored). It is a fire-and-forget
 * browser download, not a blocking confirmation — an individual major
 * migration (e.g. P-02's vault encryption) builds its own interactive
 * confirm/backup UI on top of this hook when the migration itself warrants
 * blocking the user for consent; this function guarantees a safety-net file
 * exists on disk regardless.
 */
function autoExportBackup(reason) {
  try {
    const snapshot = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("mi_")) snapshot[key] = localStorage.getItem(key);
    }
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `insina-backup-pre-migration-${reason}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (e) {
    console.warn("[migrations] auto-export backup failed:", e);
  }
}

/**
 * Ordered migration list. Each entry:
 *   version     — target schema version this migration produces
 *   major       — true if this is a breaking change to how data is stored;
 *                 triggers the export-backup step first
 *   description — human-readable; written to the RIE audit log
 *   run()       — performs the migration; must be safe to no-op if the data
 *                 already looks migrated (defends against a retried/partial run)
 */
const MIGRATIONS = [
  {
    version: 1,
    major: false,
    description: "Baseline: stamp existing installs with schema version 1. No data changed — establishes the starting point for every future migration.",
    run() { /* no-op: version stamp only */ },
  },
  // Future migrations (P-02 vault encryption, A-07 blob-store move, etc.)
  // append here, in order, each bumping `version` by 1.
];

/**
 * Run every migration between the currently stored version and the latest
 * defined migration, in order. Safe to call on every boot: already-applied
 * migrations are skipped by version check, and each run() must itself be
 * re-entrant-safe in case a prior attempt was interrupted mid-migration.
 */
export function runMigrations() {
  let current = getVersion();
  const pending = MIGRATIONS.filter(m => m.version > current).sort((a, b) => a.version - b.version);
  if (pending.length === 0) return { ran: 0, version: current };

  for (const m of pending) {
    if (m.major) {
      localStorage.setItem(INTERRUPTED_KEY, String(m.version));
      autoExportBackup(`v${m.version}`);
    }
    try {
      m.run();
      setVersion(m.version);
      current = m.version;
      appendAudit({ action: "migration", version: m.version, major: m.major, description: m.description });
      if (m.major) localStorage.removeItem(INTERRUPTED_KEY);
    } catch (e) {
      // Leave INTERRUPTED_KEY set (major) / version un-bumped (either case) so
      // the next boot retries this migration instead of silently skipping it.
      console.error(`[migrations] migration v${m.version} failed:`, e);
      appendAudit({ action: "migration_failed", version: m.version, major: m.major, description: m.description, error: String(e?.message || e) });
      break; // stop; never apply later migrations out of order over a failure
    }
  }
  return { ran: pending.length, version: current };
}

/** True if a prior boot started a major migration that never completed. */
export function hasInterruptedMigration() {
  return localStorage.getItem(INTERRUPTED_KEY) !== null;
}

export function currentSchemaVersion() { return getVersion(); }
