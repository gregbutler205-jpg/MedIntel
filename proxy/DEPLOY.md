# Insina Proxy — Render Deployment

## What This Is
A zero-logging Node.js/Express server that proxies AI requests from the Insina web app
to the Anthropic API. It handles authentication server-side so the Anthropic API key
is never exposed in the browser.

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

## Rate Limits

- **20 requests per IP per hour**
- Returns HTTP 429 with JSON error message when exceeded

---

## Security Notes

- CORS is restricted to the GitHub Pages origin (`https://gregb555.github.io`)
  and localhost for dev. Edit `ALLOWED_ORIGINS` in `server.js` if your Pages
  URL differs.
- Zero-logging: request bodies (which contain health data) are never logged.
- The Anthropic API key lives only in Render's environment — never in the browser
  or in the repo.
- Render free tier spins down after 15 minutes of inactivity. The first request
  after spin-down may take 30–60 seconds. Subsequent requests are fast.

---

## Updating the Proxy

Push changes to `proxy/server.js` → Render auto-deploys from GitHub.
