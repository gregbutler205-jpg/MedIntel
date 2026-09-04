// ── Drive-restore recovery test (#50) ────────────────────────────────────────
// Proves the core of the Drive-gap fix: a backup carrying the vault ENVELOPE +
// the ciphertext blobs can rebuild a wiped/new device and decrypt, using either
// the passphrase or the recovery key. This is the exact crypto path
// restoreFromDrive() + a normal unlock take. Run: npm run test:vault-restore

import * as vault from "../src/lib/vault.js";

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("PASS — " + m); } else { fail++; console.log("FAIL — " + m); } };

const PASSPHRASE = "correct horse battery staple 42";
const RECORD = {
  mi_meds_full: JSON.stringify([{ name: "Tacrolimus", dose: "3 mg" }, { name: "Aspirin", dose: "81 mg" }]),
  mi_profile_personal: JSON.stringify({ name: "Jordan T. Rivera", dob: "1970-01-01" }),
  mi_labs: JSON.stringify([{ name: "Potassium", value: "4.6" }]),
};

// ── Original device: set up a vault and encrypt the record ────────────────────
const { envelope, dek, recoveryKeyDisplay } = await vault.setupVault(PASSPHRASE);
const backupBlobs = {};
for (const [k, v] of Object.entries(RECORD)) {
  backupBlobs[k] = await vault.encryptString(dek, v); // { iv, data }
}
ok(!!envelope && !!recoveryKeyDisplay, "setup produced an envelope and a recovery key");

// The "Drive backup" = the envelope + the ciphertext blobs. Nothing else.
const driveBackup = { _vaultEnvelope: envelope, ...Object.fromEntries(Object.entries(backupBlobs).map(([k, b]) => [k, { v: 1, ...b }])) };

// ── New/wiped device: only the backup exists. Rebuild + unlock via PASSPHRASE ─
{
  const restoredEnvelope = driveBackup._vaultEnvelope;
  const dek2 = await vault.unlockWithPassphrase(PASSPHRASE, restoredEnvelope);
  let allMatch = true;
  for (const [k, v] of Object.entries(RECORD)) {
    const blob = driveBackup[k];
    const plain = await vault.decryptString(dek2, { iv: blob.iv, data: blob.data });
    if (plain !== v) { allMatch = false; console.log("   mismatch on " + k); }
  }
  ok(allMatch, "passphrase on a fresh device rebuilds the DEK and decrypts every record key");
}

// ── New device: unlock via RECOVERY KEY instead ───────────────────────────────
{
  const dek3 = await vault.unlockWithRecoveryKey(recoveryKeyDisplay, driveBackup._vaultEnvelope);
  const blob = driveBackup.mi_meds_full;
  const plain = await vault.decryptString(dek3, { iv: blob.iv, data: blob.data });
  ok(plain === RECORD.mi_meds_full, "recovery key on a fresh device also rebuilds the DEK and decrypts");
}

// ── Wrong passphrase must fail (not silently return garbage) ──────────────────
{
  let threw = false;
  try { await vault.unlockWithPassphrase("wrong password", driveBackup._vaultEnvelope); }
  catch { threw = true; }
  ok(threw, "wrong passphrase is rejected (AES-GCM auth tag)");
}

// ── A backup WITHOUT the envelope is unrecoverable (documents the old gap) ─────
{
  const noEnvelope = { ...driveBackup }; delete noEnvelope._vaultEnvelope;
  ok(noEnvelope._vaultEnvelope === undefined && !!driveBackup.mi_meds_full,
    "a backup missing the envelope has data but no way to derive the key — the pre-fix state");
}

// ═══ v1.38.0 folder backup: shared restore core + file-restore guards ═════════
// These run against the REAL secureStorage/driveSync/folderBackup modules under
// a Storage polyfill (same convention as testOnboarding.mjs) — the polyfill must
// exist BEFORE the modules load, because secureStorage captures
// Storage.prototype methods at import time.

class Storage {
  constructor() { this._m = new Map(); }
  getItem(k) { return this._m.has(k) ? this._m.get(k) : null; }
  setItem(k, v) { this._m.set(k, String(v)); }
  removeItem(k) { this._m.delete(k); }
  clear() { this._m.clear(); }
  key(i) { return [...this._m.keys()][i] ?? null; }
  get length() { return this._m.size; }
}
globalThis.Storage = Storage;
globalThis.localStorage = new Storage();

const secureStorage = await import("../src/lib/secureStorage.js");
const { restoreFromBackupObject } = await import("../src/lib/driveSync.js");
const { isEncryptedBackupPayload, restoreEncryptedBackup } = await import("../src/lib/folderBackup.js");

// ── Format detection: encrypted backups vs the readable plaintext export ──────
{
  ok(isEncryptedBackupPayload(driveBackup), "detects a Drive/folder-format backup (envelope present) as encrypted");
  const envelopeless = Object.fromEntries(Object.entries(driveBackup).filter(([k]) => k !== "_vaultEnvelope"));
  ok(isEncryptedBackupPayload(envelopeless), "detects ciphertext-shaped mi_* blobs as encrypted even without an envelope");
  const plaintextExport = { exported: "2026-07-21", labs: [{ name: "Potassium", value: "4.6" }], mi_labs: [{ name: "Potassium", value: "4.6" }] };
  ok(!isEncryptedBackupPayload(plaintextExport), "a readable export (plain values) is NOT detected as encrypted — takes the plaintext import path");
}

// ── Wiped device: restoreFromBackupObject lands envelope + blobs raw ──────────
{
  localStorage.clear();
  const result = restoreFromBackupObject(driveBackup);
  ok(result.hasEnvelope && result.count === Object.keys(RECORD).length,
    `restoreFromBackupObject lands the envelope + all ${Object.keys(RECORD).length} blobs (count=${result.count})`);
  const storedEnv = localStorage.getItem("mi_vault");
  ok(!!storedEnv, "the vault envelope is written to mi_vault");
  const storedBlob = JSON.parse(localStorage.getItem("mi_meds_full"));
  ok(storedBlob?.v === 1 && !!storedBlob.iv && !!storedBlob.data,
    "blobs land as RAW ciphertext (never through the patched setItem — no double-encryption)");
  // The restored envelope must actually unlock: full crypto round-trip.
  const dekR = await vault.unlockWithPassphrase(PASSPHRASE, JSON.parse(storedEnv));
  const plain = await vault.decryptString(dekR, { iv: storedBlob.iv, data: storedBlob.data });
  ok(plain === RECORD.mi_meds_full, "restored envelope + blob decrypt with the original passphrase (end-to-end)");
}

// ── No-envelope payload: refuse rather than strand ciphertext ─────────────────
{
  localStorage.clear();
  const noEnvelope = Object.fromEntries(Object.entries(driveBackup).filter(([k]) => k !== "_vaultEnvelope"));
  const result = restoreFromBackupObject(noEnvelope);
  ok(result.count === 0 && result.hasEnvelope === false, "restoreFromBackupObject restores NOTHING from an envelope-less backup");
  ok(localStorage.getItem("mi_meds_full") === null, "no orphaned ciphertext written");
  let threw = null;
  try { restoreEncryptedBackup(noEnvelope); } catch (e) { threw = e; }
  ok(threw?.code === "no-envelope", "restoreEncryptedBackup refuses an envelope-less file with code no-envelope");
}

// ── Envelope-mismatch guard: a foreign vault's file must not brick this device ─
{
  localStorage.clear();
  const foreign = await vault.setupVault("a completely different passphrase");
  localStorage.setItem("mi_vault", JSON.stringify(foreign.envelope)); // this device's vault
  let threw = null;
  try { restoreEncryptedBackup(driveBackup); } catch (e) { threw = e; } // file from the ORIGINAL vault
  ok(threw?.code === "envelope-mismatch", "restoring a different vault's backup over a live vault is refused");
  ok(JSON.stringify(JSON.parse(localStorage.getItem("mi_vault"))) === JSON.stringify(foreign.envelope),
    "the device's own envelope is untouched after the refusal");
  ok(localStorage.getItem("mi_meds_full") === null, "no blobs from the foreign file were written");
}

// ── Matching-vault file restore: succeeds and re-arms the migration rails ─────
{
  localStorage.clear();
  localStorage.setItem("mi_vault", JSON.stringify(envelope)); // same vault as the file
  localStorage.setItem("mi_schema_version", "9");
  const result = restoreEncryptedBackup(driveBackup);
  ok(result.hasEnvelope && result.count === Object.keys(RECORD).length, "same-vault file restore lands every blob");
  ok(localStorage.getItem("mi_schema_version") === "1", "schema stamp reset to baseline so idempotent migrations re-run (A-08)");
}

// ── v1.57.1: per-device bookkeeping stamps never ride the Drive file ─────────
// Stale synced copies of these stamps kept tripping the "different vault key"
// warning (Greg 2026-09-01) and a synced daily-throttle stamp suppresses the
// OTHER device's auto-sync/auto-scan. Excluded on upload, restore, and merge.
{
  localStorage.clear();
  const { collectLocalData, restoreFromBackupObject } = await import("../src/lib/driveSync.js");
  const STAMPS = ["mi_last_sync", "mi_gcal_last_sync", "mi_last_folder_backup", "mi_condsug_last_scan", "mi_procsug_last_scan"];
  for (const k of STAMPS) localStorage.setItem(k, "2026-09-01");
  localStorage.setItem("mi_conditions", JSON.stringify([{ id: 1, name: "x" }]));
  const exported = collectLocalData();
  ok(STAMPS.every(k => !(k in exported)) && "mi_conditions" in exported,
    "device-local stamps are excluded from export; real stores still ride");
  localStorage.clear();
  restoreFromBackupObject({ _vaultEnvelope: "{}", mi_last_sync: "poison", mi_conditions: "[]" });
  ok(localStorage.getItem("mi_last_sync") === null,
    "a stamp stranded in an old Drive file is ignored on restore, not imported");
}

// ── v1.57.1: companion sign-in survives the locked redirect landing ──────────
// The phone's Google redirect relaunches the app LOCKED, so the sign-in
// profile write was dropped by the managed-key rule — every relaunch showed
// "Connect Drive / Sign in" and auto-sync never ran again. The unlock handler
// must re-persist the profile while the redirect's token is still alive.
{
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const { dirname, join } = await import("node:path");
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, "../src/components/companion/CompanionApp.jsx"), "utf8");
  const onUnlocked = src.slice(src.indexOf("<Lock onUnlocked={"), src.indexOf("Sign-in gate:"));
  ok(onUnlocked.includes("!getStoredUser()") && onUnlocked.includes('localStorage.setItem("mi_google_user"'),
    "unlock re-persists the Google profile dropped by the locked redirect landing");
  ok(onUnlocked.indexOf("setUnlocked(true)") < onUnlocked.indexOf('setItem("mi_google_user"'),
    "the re-persist happens AFTER the store can accept writes");
}

console.log(`\n${pass} passed, ${fail} failed (vault-restore)`);
process.exit(fail ? 1 : 0);
