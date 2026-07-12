// ── Minimal identity helper for prompt builders ──────────────────────────────
// A-09's builders need {userId}/{age}/{sex} to construct the CSC at all, so
// this exists now rather than waiting on P-01. This is intentionally the
// smallest slice: generate-or-read a stable pseudonymous ID and compute age
// from DOB (never send DOB itself). The FULL identity-minimization pass —
// auditing every payload field against INSINA_AI_PROMPTS.md §2's complete
// allowlist, structurally excluding every prohibited field across every
// surface, and confirming "anonymous" appears nowhere — is P-01, next.

const USER_ID_KEY = "mi_user_id";

/** Random, stable, not derived from any personal field. Generated once. */
export function getUserId() {
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    id = "P-" + Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

/** Computed age from profile DOB. DOB itself is never returned or sent. */
export function getAge() {
  try {
    const p = JSON.parse(localStorage.getItem("mi_profile_personal") || "{}");
    if (!p.dob) return "age unknown";
    const dob = new Date(p.dob);
    if (isNaN(dob)) return "age unknown";
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return `${age}`;
  } catch { return "age unknown"; }
}

export function getSex() {
  try {
    const p = JSON.parse(localStorage.getItem("mi_profile_personal") || "{}");
    return p.sex || "sex unrecorded";
  } catch { return "sex unrecorded"; }
}

/** Convenience: the three CSC identity fields in one call. */
export function getIdentity() {
  return { userId: getUserId(), age: getAge(), sex: getSex() };
}
