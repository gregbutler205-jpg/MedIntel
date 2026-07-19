// ── Production build: landing at /, app at /app/, companion at /companion/ ────
// (DEC-PNN pending: landing at root / app path move / root SW kill-switch.)
//
// The app and companion share one source tree but need different base paths, so
// they can't come from a single Vite build (one global `base`). We run two
// builds into separate outDirs, then drop the static landing at the published
// root. vite.config.js still drives `npm run dev` (base '/', both entries).

import { build } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, rmSync, cpSync, existsSync, renameSync } from "fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));
const define = { __APP_VERSION__: JSON.stringify(pkg.version) };

async function buildTarget({ base, outDir, input }) {
  await build({
    configFile: false,           // fully explicit — don't merge the dev config
    root: ".",
    plugins: [react()],
    define,
    base,
    build: { outDir, emptyOutDir: true, rollupOptions: { input } },
  });
}

// Clean slate so nothing stale survives.
rmSync("dist", { recursive: true, force: true });

// 1) Full web app → /app/
await buildTarget({ base: "/app/", outDir: "dist/app", input: { main: "index.html" } });

// 2) Mobile companion → /companion/
await buildTarget({ base: "/companion/", outDir: "dist/companion", input: { companion: "companion/index.html" } });
// Vite preserves the input's "companion/" prefix under the outDir, nesting the
// HTML one level too deep. Flatten it if so.
if (existsSync("dist/companion/companion/index.html")) {
  renameSync("dist/companion/companion/index.html", "dist/companion/index.html");
  rmSync("dist/companion/companion", { recursive: true, force: true });
}

// 3) Static landing + kill-switch SW + assets → published root; CNAME at root.
cpSync("landing", "dist", { recursive: true });
if (existsSync("CNAME")) cpSync("CNAME", "dist/CNAME");

console.log("Build complete → dist/: landing (/), app (/app/), companion (/companion/)");
