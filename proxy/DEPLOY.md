# Insina Proxy — Render Deployment

## What This Is
A Node.js/Express server that proxies AI requests from the Insina web app to the
Anthropic API. It handles authentication server-side so the Anthropic API key is
never exposed in the browser. The server code does not store or log request bodies
(P-03): Render's hosting infrastructure still retains standard HTTP access metadata
(IPs, timestamps, request paths) as part of normal operation, independent of anything
this code does — "zero-logging" overstates that. See PRIVACY_POLICY.md.

---

## One-Time Setup on Render

### 1. Push the proxy folder to GitHub

The proxy lives in `proxy/` within the IntelliTrax repo. It will be deployed as a
separate Render Web Service pointing at that subdirectory.

If you prefer, you can also create a separate GitHub repo just for the proxy and
copy the `proxy/` contents there.

### 2. Create a new Web Service on Render

1. Go to [render.com](https://render.com) and sign in.
2. Click **New → Web Service**.
3. Connect your GitHub repo.
4. Configure:
   - **Name:** `insina-proxy` (or any name)
   - **Region:** Oregon (US West) — or closest to your users
   - **Branch:** `main`
   - **Root Directory:** `proxy`  ← important
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free (0.1 CPU, 512MB RAM — sufficient for personal use)

### 3. Set the environment variable

In the Render dashboard for your service → **Environment** tab:

| Key                | Value              |
|--------------------|--------------------|
| `ANTHROPIC_API_KEY`| `sk-ant-api03-...` |

This is the only secret stored on the server. It never appears in logs.

### 4. Note your proxy URL

After deploy, Render gives you a URL like:

```
https://insina-proxy.onrender.com
```

### 5. Set the Vite env variable in the frontend

In the IntelliTrax repo root, create or edit `.env.production`:

```
VITE_PROXY_URL=https://insina-proxy.onrender.com
```

For local development, create `.env.local`:

```
VITE_PROXY_URL=http://localhost:3001
```

Add `.env.local` to `.gitignore` if not already there.

Then rebuild and redeploy the frontend (`npm run build` → GitHub Actions will handle it).

---

## Running Locally (optional)

```bash
cd proxy
npm install
ANTHROPIC_API_KEY=sk-ant-... npm run dev
```

The proxy will run at `http://localhost:3001`.

---

## Endpoints

| Method | Path        | Description                        |
|--------|-------------|------------------------------------|
| GET    | `/health`   | Returns `{ status: "ok" }`         |
| POST   | `/api/chat` | Proxies request to Anthropic API   |

---

## Rate Limits (S-05 / PG-04 — enforced)

- `/api/chat`: **60 requests per IP per hour**
- `/api/extract-pdf`: **20 requests per IP per hour** (Vision OCR — the expensive route)
- Returns HTTP 429 with a JSON error message when exceeded
- Backstop: a hard monthly spend cap set in the Anthropic console (HUMAN-managed)

---

## Pilot Access Tokens (S-05 item 3 / PG-04)

A second layer, independent of rate limiting: once enabled, every request to
`/api/chat` and `/api/extract-pdf` must carry a valid `Authorization: Bearer
<token>` header. The client already sends this header whenever a pilot token
is set in **Settings & Backup → Pilot access token** (stored locally, same
handling as the BYO API key today). **Enforcement defaults off** — the app
works exactly as it does now until you deliberately turn it on, so shipping
the client-side support does not require any Render change or lock anyone
out.

### Issuing tokens to invited pilot users

1. Generate one random token per person — anything unguessable works, e.g.:
   ```bash
   node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
   ```
2. In the Render dashboard → **Environment** tab, set:

   | Key                    | Value                                    |
   |-------------------------|-------------------------------------------|
   | `PILOT_TOKENS`          | comma-separated tokens, one per person, e.g. `a1b2c3...,d4e5f6...` |
   | `PILOT_AUTH_ENFORCED`   | `true` to turn enforcement on (unset or anything else = off) |

3. Give each person their own token out-of-band (text, email — not in the repo).
4. They paste it into **Settings & Backup → Pilot access token** on first use.

### Deploy order matters

The client must be deployed **before** you flip `PILOT_AUTH_ENFORCED` to
`true` — otherwise a pilot user's older, cached build won't yet know to send
the header and will get locked out. Sequence:

1. Ship the app build that includes pilot-token client support (this is
   already the case as of A-02/S-05 item 3 — no separate action needed going
   forward).
2. Issue tokens and set `PILOT_TOKENS` on Render.
3. Have each pilot user enter their token in Settings.
4. Only then set `PILOT_AUTH_ENFORCED=true` on Render and redeploy the proxy.

### Rotation / revoking a user

Remove their token from the `PILOT_TOKENS` value and redeploy the proxy —
their next request fails with 401 immediately. No other action needed; there
is no separate revocation list.

---

## Security Notes

- CORS is restricted to the GitHub Pages origin (`https://gregbutler205-jpg.github.io`)
  and localhost for dev. If your GitHub username differs, update `ALLOWED_ORIGINS`
  in `server.js` to match `https://<your-username>.github.io`.
- The server code never logs request bodies (which contain health data). Render's
  own infrastructure still retains standard HTTP access metadata (IPs, timestamps,
  paths) regardless — see the P-03 note above and PRIVACY_POLICY.md.
- The Anthropic API key lives only in Render's environment — never in the browser
  or in the repo.
- Render free tier spins down after 15 minutes of inactivity. The first request
  after spin-down may take 30–60 seconds. Subsequent requests are fast.

---

## Updating the Proxy

Push changes to `proxy/server.js` → Render auto-deploys from GitHub.
