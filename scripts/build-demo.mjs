// ── #49: demo-site build (separate origin) ───────────────────────────────────
// Produces dist-demo/ for deployment to a DEDICATED origin, e.g.
// demo.insinahealth.com. Because it is a different origin, its localStorage is
// physically separate from the real app at insinahealth.com — the demo can
// never see, overwrite, or clear a real record. This is the structural fix
// behind the 2026-07-19 incident (the in-repo guards in v1.27.1/v1.28.0 remain
// as defence in depth).
//
// Layout mirrors the main site so nothing else has to change:
//   dist-demo/            index.html  ← demo seeder (public/demo), auto-loads the dataset
//   dist-demo/app/        the full web app (base /app/)
//
// Deploy dist-demo/ to the demo host. See docs/DEMO_SUBDOMAIN_SETUP.md.
// Run: npm run build:demo

import { build } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, writeFileSync, rmSync, cpSync, existsSync } from "fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));
const DEMO_DOMAIN = process.env.INSINA_DEMO_DOMAIN || ""; // optional CNAME for GitHub Pages

rmSync("dist-demo", { recursive: true, force: true });

// The app itself, identical to production but rooted on the demo origin.
await build({
  configFile: false,
  root: ".",
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  base: "/app/",
  build: { outDir: "dist-demo/app", emptyOutDir: true, rollupOptions: { input: { main: "index.html" } } },
});

// Root of the demo origin = the demo seeder, which loads the fictional dataset
// then forwards to the app. Its guards are harmless here but retained.
//
// The seeder normally lives at /app/demo/ and redirects to "../" (→ /app/). Here
// it sits at the ORIGIN ROOT, where "../" resolves back to itself — an endless
// "Loading demo patient data…". Rewrite the hop to the app's absolute path.
const SEEDER_FROM = 'window.location.href = "../"';
const SEEDER_TO   = 'window.location.href = "/app/"';
const seeder = readFileSync("public/demo/index.html", "utf-8");
if (!seeder.includes(SEEDER_FROM)) {
  throw new Error(`demo build: expected ${SEEDER_FROM} in public/demo/index.html — redirect rewrite would silently no-op`);
}
writeFileSync("dist-demo/index.html", seeder.replace(SEEDER_FROM, SEEDER_TO));

// public/CNAME rides along in the app build and names the PRODUCTION domain.
// Pages only honours the repo-root CNAME, but drop it so the demo origin never
// carries a file claiming insinahealth.com.
rmSync("dist-demo/app/CNAME", { force: true });

// Optional custom-domain file (GitHub Pages). Skipped for hosts that don't use it.
if (DEMO_DOMAIN) writeFileSync("dist-demo/CNAME", DEMO_DOMAIN + "\n");

// Branch-based GitHub Pages runs Jekyll by default, which silently drops some
// asset paths. Ship .nojekyll from the build so a deploy can never forget it.
writeFileSync("dist-demo/.nojekyll", "");

// NOTE: this directory is deleted and recreated on every build — never keep a
// git clone (or anything else you care about) inside it. Deploy by copying
// dist-demo/ into a checkout of the demo repo held elsewhere.

if (!existsSync("dist-demo/index.html")) throw new Error("demo build: root seeder missing");
console.log(`Demo build complete → dist-demo/  (root = demo seeder, app at /app/)${DEMO_DOMAIN ? `  CNAME=${DEMO_DOMAIN}` : ""}`);
