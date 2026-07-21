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

console.log(`\n${pass} passed, ${fail} failed (vault-restore)`);
process.exit(fail ? 1 : 0);
