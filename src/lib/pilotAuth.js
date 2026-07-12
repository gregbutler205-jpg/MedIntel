// ── Pilot access token — client-side store (S-05 item 3 / PG-04) ────────────
// One token per invited pilot user, issued out-of-band (see proxy/DEPLOY.md).
// Stored the same way mi_ak is today — plain localStorage — until P-02 lands,
// at which point it moves inside the encrypted store like every other mi_*
// value. Absent/empty is the normal state for a non-pilot user (Greg, during
// founder testing): getAuthHeaders() simply attaches nothing, and the proxy's
// PILOT_AUTH_ENFORCED flag stays off until pilot tokens actually exist.

const KEY = "mi_pilot_token";

export function getPilotToken() {
  return localStorage.getItem(KEY) || "";
}

export function setPilotToken(token) {
  const trimmed = (token || "").trim();
  if (trimmed) localStorage.setItem(KEY, trimmed);
  else localStorage.removeItem(KEY);
}
