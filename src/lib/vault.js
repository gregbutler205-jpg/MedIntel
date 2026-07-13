// ── P-02 / PG-10: passphrase-derived encryption at rest — crypto core ────────
// Pure WebCrypto primitives. No localStorage access here — src/lib/secureStorage.js
// is the integration layer that uses these to intercept mi_* reads/writes.
//
// Design per APP_CHANGES_SPEC P-02:
// 1. Key derivation: PBKDF2-SHA256, 600,000+ iterations, 16-byte random salt.
// 2. Envelope: a random 256-bit DEK encrypts the record; a passphrase-derived
//    KEK wraps the DEK. Passphrase changes re-wrap the DEK, never re-encrypt data.
// 3. Cipher: AES-GCM, fresh random 12-byte IV per encryption, never reused.
// 4. Recovery key: random 256-bit value, generated at setup, shown once, wraps
//    the DEK as a second independent envelope. Required, not optional.

const PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const DEK_BITS = 256;

function toB64(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
function fromB64(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function generateSalt() {
  return crypto.getRandomValues(new Uint8Array(SALT_BYTES));
}

/** PBKDF2-SHA256 derive an AES-GCM KEK from a passphrase + salt. Not extractable. */
export async function deriveKEK(passphrase, salt, iterations = PBKDF2_ITERATIONS) {
  const baseKey = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: DEK_BITS },
    false, // not extractable — this key only ever wraps/unwraps, never leaves the CryptoKey object
    ["wrapKey", "unwrapKey"]
  );
}

/** Generate a random 256-bit AES-GCM data key (DEK). Extractable — it must be wrappable. */
export function generateDEK() {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: DEK_BITS }, true, ["encrypt", "decrypt"]);
}

/** Wrap (encrypt) the DEK with a KEK. Returns { iv, wrapped } both base64. */
export async function wrapDEK(dek, kek) {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const wrapped = await crypto.subtle.wrapKey("raw", dek, kek, { name: "AES-GCM", iv });
  return { iv: toB64(iv), wrapped: toB64(new Uint8Array(wrapped)) };
}

/** Unwrap (decrypt) a wrapped DEK blob back into a usable AES-GCM CryptoKey. */
export async function unwrapDEK({ iv, wrapped }, kek) {
  return crypto.subtle.unwrapKey(
    "raw", fromB64(wrapped), kek,
    { name: "AES-GCM", iv: fromB64(iv) },
    { name: "AES-GCM", length: DEK_BITS },
    true, ["encrypt", "decrypt"]
  );
}

/**
 * Recovery key: a random 256-bit value, high-entropy enough to serve directly
 * as a KEK (no PBKDF2 needed — unlike a passphrase, it's not human-chosen).
 * Returned both as raw bytes (for deriving the recovery KEK) and as a
 * display string (8 groups of 8 hex chars) for the one-time show/download.
 */
export function generateRecoveryKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return { bytes, display: formatRecoveryKeyForDisplay(bytes) };
}

export function formatRecoveryKeyForDisplay(bytes) {
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  return hex.match(/.{1,8}/g).join("-");
}

export function parseRecoveryKeyDisplay(display) {
  const hex = String(display || "").replace(/[^0-9A-Fa-f]/g, "");
  if (hex.length !== 64) return null;
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

/** Import raw recovery-key bytes as a non-extractable AES-GCM wrap/unwrap key. */
export function importRecoveryKEK(bytes) {
  return crypto.subtle.importKey("raw", bytes, { name: "AES-GCM", length: DEK_BITS }, false, ["wrapKey", "unwrapKey"]);
}

/** Encrypt a plaintext string with the DEK. Returns { iv, data } both base64. */
export async function encryptString(dek, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, dek, new TextEncoder().encode(plaintext));
  return { iv: toB64(iv), data: toB64(new Uint8Array(ciphertext)) };
}

/** Decrypt a { iv, data } blob back to the plaintext string. Throws on tamper/wrong key (AES-GCM auth tag). */
export async function decryptString(dek, { iv, data }) {
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(iv) }, dek, fromB64(data));
  return new TextDecoder().decode(plaintext);
}

/**
 * Build a fresh vault envelope: generates the DEK and recovery key, wraps the
 * DEK under both the passphrase-derived KEK and the recovery KEK. Returns the
 * envelope (safe to persist) and the recovery key's display string (show
 * once, never persisted — the caller is responsible for one-time display).
 */
export async function setupVault(passphrase) {
  const salt = generateSalt();
  const kek = await deriveKEK(passphrase, salt);
  const dek = await generateDEK();
  const passphraseWrap = await wrapDEK(dek, kek);

  const recovery = generateRecoveryKey();
  const recoveryKEK = await importRecoveryKEK(recovery.bytes);
  const recoveryWrap = await wrapDEK(dek, recoveryKEK);

  const envelope = {
    v: 1,
    salt: toB64(salt),
    iterations: PBKDF2_ITERATIONS,
    passphrase: passphraseWrap,
    recovery: recoveryWrap,
  };
  return { envelope, dek, recoveryKeyDisplay: recovery.display };
}

/** Unlock: derive the KEK from the passphrase + envelope salt, unwrap the DEK. Throws on wrong passphrase. */
export async function unlockWithPassphrase(passphrase, envelope) {
  const kek = await deriveKEK(passphrase, fromB64(envelope.salt), envelope.iterations);
  return unwrapDEK(envelope.passphrase, kek);
}

/** Unlock via the recovery key display string instead of the passphrase. */
export async function unlockWithRecoveryKey(recoveryKeyDisplay, envelope) {
  const bytes = parseRecoveryKeyDisplay(recoveryKeyDisplay);
  if (!bytes) throw new Error("Recovery key format not recognized.");
  const recoveryKEK = await importRecoveryKEK(bytes);
  return unwrapDEK(envelope.recovery, recoveryKEK);
}

/**
 * Change the passphrase: re-wrap the existing DEK under a new passphrase-
 * derived KEK. Does not touch the recovery envelope or re-encrypt any data —
 * point 2's "passphrase changes re-wrap the DEK without re-encrypting the
 * record." Caller must have already unlocked (has the live DEK) before calling.
 */
export async function rewrapWithNewPassphrase(dek, newPassphrase, envelope) {
  const salt = generateSalt();
  const kek = await deriveKEK(newPassphrase, salt);
  const passphraseWrap = await wrapDEK(dek, kek);
  return { ...envelope, salt: toB64(salt), iterations: PBKDF2_ITERATIONS, passphrase: passphraseWrap };
}
