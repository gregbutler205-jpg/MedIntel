// ── Google Identity Services — Auth Module ───────────────────────────────────
// Handles OAuth token acquisition and user-profile fetch.
// No client secret is used — this is the browser-side implicit token model.

const CLIENT_ID =
  "1097733210710-b1lmasjb68kcv8ptet4s4a6asgbbv7ui.apps.googleusercontent.com";

const SCOPES = [
  "https://www.googleapis.com/auth/drive.appdata",
  "https://www.googleapis.com/auth/drive.file",
  "openid",
  "email",
  "profile",
].join(" ");

let _tokenClient = null;
let _accessToken  = null;
let _tokenExpiry  = 0;
let _callbacks    = { onSignIn: null, onSignOut: null };

/**
 * Call once on app mount (after GIS script has loaded via index.html).
 * Safe to call before window.google is available — will poll until ready.
 */
export function initGoogleAuth({ onSignIn, onSignOut } = {}) {
  _callbacks = { onSignIn, onSignOut };

  const setup = () => {
    _tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope:     SCOPES,
      callback:  _handleToken,
    });
  };

  if (window.google?.accounts?.oauth2) {
    setup();
  } else {
    const id = setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        clearInterval(id);
        setup();
      }
    }, 100);
  }
}

async function _handleToken(response) {
  if (response.error) {
    console.error("[GoogleAuth] token error:", response.error);
    return;
  }

  _accessToken = response.access_token;
  _tokenExpiry = Date.now() + (response.expires_in - 60) * 1000; // 60 s grace

  // Fetch user profile
  let user = null;
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${_accessToken}` },
    });
    user = await res.json();
    localStorage.setItem(
      "mi_google_user",
      JSON.stringify({ name: user.name, email: user.email, picture: user.picture })
    );
  } catch (e) {
    console.warn("[GoogleAuth] userinfo fetch failed:", e);
  }

  _callbacks.onSignIn?.({ accessToken: _accessToken, user });
}

/**
 * Prompt the user to sign in / re-authenticate and obtain a Drive access token.
 * Shows a Google popup. On success, the onSignIn callback fires automatically.
 * NOTE: Use signInWithRedirect() on mobile — iOS Safari blocks popups.
 */
export function signIn() {
  if (!_tokenClient) {
    console.warn("[GoogleAuth] not initialized yet — try again in a moment");
    return;
  }
  _tokenClient.requestAccessToken({ prompt: "" });
}

/**
 * Mobile-safe sign-in: navigates to Google OAuth and redirects back to the
 * companion URL (?companion=1) with the access token in the URL hash.
 * After redirect back, call extractTokenFromHash() on mount to capture it.
 */
export function signInWithRedirect() {
  const redirectUri = `${window.location.origin}/?companion=1`;
  const params = new URLSearchParams({
    client_id:              CLIENT_ID,
    redirect_uri:           redirectUri,
    response_type:          "token",
    scope:                  SCOPES,
    include_granted_scopes: "true",
  });
  window.location.href =
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/**
 * Call once on companion mount. Checks the URL hash for a token that Google
 * placed there after a redirect-based sign-in. Returns the access token string
 * if found (and clears the hash from the URL), or null if not present.
 */
export function extractTokenFromHash() {
  if (!window.location.hash.includes("access_token")) return null;
  const p       = new URLSearchParams(window.location.hash.slice(1));
  const token   = p.get("access_token");
  const expiry  = parseInt(p.get("expires_in") || "3600", 10);
  if (!token) return null;
  _accessToken = token;
  _tokenExpiry = Date.now() + (expiry - 60) * 1000;
  // Remove the token hash from the visible URL so it isn't bookmarked / leaked
  history.replaceState(null, "",
    window.location.pathname + window.location.search);
  return token;
}

/**
 * Revoke the current token and clear stored user info.
 */
export function signOut() {
  if (_accessToken) {
    try { window.google?.accounts?.oauth2?.revoke(_accessToken); } catch {}
  }
  _accessToken = null;
  _tokenExpiry  = 0;
  localStorage.removeItem("mi_google_user");
  _callbacks.onSignOut?.();
}

/**
 * Returns the access token if still valid, or null if expired / not signed in.
 * Used by background upload jobs — they skip silently when null.
 */
export function getAccessToken() {
  return _accessToken && Date.now() < _tokenExpiry ? _accessToken : null;
}

/**
 * Returns the last-stored Google user profile object (persists across page reloads).
 * Shape: { name, email, picture }
 */
export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("mi_google_user") || "null");
  } catch {
    return null;
  }
}
