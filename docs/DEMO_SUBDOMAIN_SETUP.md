# Demo subdomain — full isolation (#49)

**Goal:** run the demo on its own origin (`demo.insinahealth.com`) so it *physically
cannot* touch a real user's storage. Browser localStorage is per-origin, so a demo
on a separate subdomain has a completely separate store from the real app at
`insinahealth.com` — the strongest possible isolation, and it makes the demo's
`clear()`/load behavior harmless no matter what.

> Interim state (already live): as of v1.27.1 + v1.28.0 the same-origin demo is
> already safe — it never calls `localStorage.clear()`, refuses to run when a real
> record is present, and can't pollute a real vault. The subdomain is defense in
> depth + a clean separation, not an emergency.

## What Greg does (DNS + hosting — one-time)

1. **Create a second static host for the demo.** Easiest options:
   - A **second GitHub repo** (e.g. `MedIntel-demo`) with GitHub Pages enabled and
     a `CNAME` file containing `demo.insinahealth.com`; or
   - A **Netlify/Cloudflare Pages site** pointed at `demo.insinahealth.com`.
2. **DNS:** add a `CNAME` record `demo` → your Pages host
   (`gregbutler205-jpg.github.io`, or the Netlify target). Wait for it to resolve
   and for the host to issue TLS.
3. **Deploy the same site build to it.** The demo host serves the *exact same*
   `dist/` this repo produces (`npm run build`) — no separate app build needed.
   The isolation comes from the origin, not the code. Its `CNAME` must say
   `demo.insinahealth.com` (not `insinahealth.com`).

That's it — `https://demo.insinahealth.com/app/demo/` now loads the demo in a store
that is completely separate from real user data.

## What Claude does (the one-line flip — after the subdomain resolves)

Point the landing's "Open Demo" buttons at the demo origin instead of same-origin.
In `landing/index.html`, the `.js-demo` click handler currently does:

```js
window.location.href = '/app/demo/';               // same origin (interim)
```

Change it to:

```js
window.location.href = 'https://demo.insinahealth.com/app/demo/';  // isolated origin
```

(Optionally gate behind a small `DEMO_ORIGIN` constant so it's a single edit.)
Nothing else changes — the demo launchers, guards, and markers all still apply on
the demo origin.

## Verify after cutover
1. `https://demo.insinahealth.com/app/demo/` → loads the Alex-Rivera demo.
2. On a browser with a **real** record at `insinahealth.com`, click "Open Demo" on
   the landing → it navigates to `demo.insinahealth.com`; your real record at
   `insinahealth.com` is untouched (different origin, different storage).
3. Real app OAuth/Drive at `insinahealth.com` is unaffected (the demo origin is
   separate; the demo doesn't sign into Drive).

**Ping Claude once the subdomain resolves and I'll flip the landing links + verify.**
