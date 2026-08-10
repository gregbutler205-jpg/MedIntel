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
import { readFileSync, writeFileSync, rmSync, cpSync, existsSync, renameSync } from "fs";

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

// The mobile companion → /companion/, so the phone UI is demoable too. Mirrors
// build.mjs, including its output-nesting workaround. Without this the demo
// origin had no companion at all and /companion/ was a 404; the companion also
// had to learn to honour demo mode (CompanionApp's vault + sign-in gates).
await build({
  configFile: false,
  root: ".",
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  base: "/companion/",
  build: { outDir: "dist-demo/companion", emptyOutDir: true, rollupOptions: { input: { companion: "companion/index.html" } } },
});
// Vite preserves the input's "companion/" prefix under the outDir, nesting the
// HTML one level too deep. Flatten it if so.
if (existsSync("dist-demo/companion/companion/index.html")) {
  renameSync("dist-demo/companion/companion/index.html", "dist-demo/companion/index.html");
  rmSync("dist-demo/companion/companion", { recursive: true, force: true });
}

// Nothing links to the companion — you reach it by typing the URL. On the demo
// origin that means a visitor can arrive at /companion/ having never run the
// seeder at /, so localStorage is empty, isDemoMode() is false, and the phone
// UI asks them to create a password. Inject a guard that bounces them through
// the seeder and back. Demo build only; the production companion never gets it.
// Deliberately checks mi_vault first: if a real record somehow exists on this
// origin we leave it strictly alone and let the normal lock screen run.
const COMPANION_SEED_GUARD = `<script>
(function(){
  try {
    if (localStorage.getItem("mi_vault") === null && localStorage.getItem("mi_is_demo") !== "1") {
      location.replace("/?next=companion");
    }
  } catch (e) {}
})();
</script>
`;
const companionHtmlPath = "dist-demo/companion/index.html";
const companionHtml = readFileSync(companionHtmlPath, "utf-8");
if (!companionHtml.includes("<head>")) {
  throw new Error("demo build: no <head> in the companion HTML — seed guard would not be injected");
}
writeFileSync(companionHtmlPath, companionHtml.replace("<head>", "<head>\n" + COMPANION_SEED_GUARD));

// Root of the demo origin = the demo seeder, which loads the fictional dataset
// then forwards to the app. Its guards are harmless here but retained.
//
// The seeder normally lives at /app/demo/ and redirects to "../" (→ /app/). Here
// it sits at the ORIGIN ROOT, where "../" resolves back to itself — an endless
// "Loading demo patient data…". Rewrite the hop to the app's absolute path.
const SEEDER_FROM = 'window.location.href = "../"';
const SEEDER_TO   = 'window.location.href = "/app/"';
// Same problem for the ?next=companion hop. Note "../companion/" does NOT
// contain the SEEDER_FROM literal (that one ends at the quote right after
// ../), so the two rewrites cannot collide in either order.
const SEEDER_COMPANION_FROM = 'window.location.href = "../companion/"';
const SEEDER_COMPANION_TO   = 'window.location.href = "/companion/"';
const seeder = readFileSync("public/demo/index.html", "utf-8");
if (!seeder.includes(SEEDER_FROM)) {
  throw new Error(`demo build: expected ${SEEDER_FROM} in public/demo/index.html — redirect rewrite would silently no-op`);
}
// A seeder with no dataset version can never detect a stale demo, so returning
// visitors would silently keep leftovers (tombstones, name maps) that shadow
// the fresh data. Fail the build rather than ship a demo that degrades.
if (!/const DEMO_DATASET_VERSION = "[^"]+"/.test(seeder)) {
  throw new Error("demo build: DEMO_DATASET_VERSION missing from public/demo/index.html — stale demos would never reset");
}
if (!seeder.includes(SEEDER_COMPANION_FROM)) {
  throw new Error(`demo build: expected ${SEEDER_COMPANION_FROM} in public/demo/index.html — the ?next=companion hop would land on a relative path that does not exist`);
}
writeFileSync(
  "dist-demo/index.html",
  seeder.replace(SEEDER_FROM, SEEDER_TO).replace(SEEDER_COMPANION_FROM, SEEDER_COMPANION_TO),
);

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
if (!existsSync("dist-demo/companion/index.html")) throw new Error("demo build: companion missing");
console.log(`Demo build complete → dist-demo/  (root = demo seeder, app at /app/, companion at /companion/)${DEMO_DOMAIN ? `  CNAME=${DEMO_DOMAIN}` : ""}`);
