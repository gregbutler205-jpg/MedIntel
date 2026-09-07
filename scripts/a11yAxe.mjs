// ── WO_ACCESSIBLE_TOKENS_01 4.7 / 4.8: axe-core AA check + screenshots ─────────
// Runs axe-core (WCAG 2.x A/AA tags) against the BUILT app's main routes in a
// real Chrome, at 1280px and 390px, and saves full-page screenshots of each.
// The record under test is the fictional demo dataset (public/demo/index.html
// seeds it and hands off to /app/), so no real record and no passphrase are
// ever involved. Nothing here touches the network beyond localhost and the
// Google Fonts stylesheet the app itself loads.
//
//   node scripts/a11yAxe.mjs                       # dist/ -> a11y-report/after/
//   node scripts/a11yAxe.mjs --dist ../Code-before/dist --label before
//   node scripts/a11yAxe.mjs --baseline a11y-report/before --fail-on-new
//
// Options: --dist <dir> (default dist)  --out <dir> (default a11y-report)
//          --label <name> (default after)  --port <n> (default 4180)
//          --baseline <dir> (compare; report violations not present there)
//          --fail-on-new (exit 1 when new violations vs baseline)
//          --fail-on-any (exit 1 when any AA violation)
// Chrome: CHROME_PATH env, else the usual Windows/macOS/Linux install paths.
//
// DEC-049 enforcement note: the work order asks for this check to block the
// build. It is wired as an opt-in npm script (test:a11y) until Greg decides
// whether the deploy pipeline installs a browser and which baseline blocks;
// see the session report.

import http from "node:http";
import { existsSync, readFileSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { join, extname, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import puppeteer from "puppeteer-core";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i === -1 ? dflt : args[i + 1]; };
const flag = (name) => args.includes(name);
const DIST = resolve(ROOT, opt("--dist", "dist"));
const OUT = resolve(ROOT, opt("--out", "a11y-report"), opt("--label", "after"));
const PORT = Number(opt("--port", "4180"));
const BASELINE = opt("--baseline", null);

const ROUTES = [
  { id: "dashboard",   nav: null,             title: "Dashboard" },
  { id: "medications", nav: "Medications",    title: "Medications" },
  { id: "labs",        nav: "Labs & Trends",  title: "Labs and trends" },
  { id: "vitals",      nav: "Vitals",         title: "Vitals" },
  { id: "profile",     nav: "Health Profile", title: "Profile" },
];
const VIEWPORTS = [{ width: 1280, height: 900 }, { width: 390, height: 844 }];
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2", ".txt": "text/plain" };

function serve(dir, port) {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let file = join(dir, p);
    try {
      if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
      if (!existsSync(file)) { res.writeHead(404); res.end("not found"); return; }
      res.writeHead(200, { "Content-Type": MIME[extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
      res.end(readFileSync(file));
    } catch (e) { res.writeHead(500); res.end(String(e)); }
  });
  return new Promise((ok) => server.listen(port, "127.0.0.1", () => ok(server)));
}

function findChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const candidates = [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    `${process.env.LOCALAPPDATA || ""}/Google/Chrome/Application/chrome.exe`,
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium-browser", "/usr/bin/chromium",
  ];
  return candidates.find(p => p && existsSync(p)) || null;
}

async function clickNav(page, label) {
  const ok = await page.evaluate((label) => {
    const items = [...document.querySelectorAll(".nav-item")];
    // Match the label span, not the whole row: before this work order the row's
    // text also carried a unicode glyph icon.
    const hit = items.find(el => [...el.querySelectorAll("span")].some(s => s.textContent.trim() === label));
    if (!hit) return false;
    hit.click();
    return true;
  }, label);
  if (!ok) throw new Error(`nav item not found: ${label}`);
  await new Promise(r => setTimeout(r, 700));
}

async function runAxe(page) {
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  return page.evaluate(async (tags) => {
    const r = await window.axe.run(document, { runOnly: { type: "tag", values: tags }, resultTypes: ["violations", "incomplete"] });
    const pick = (n) => {
      const d = (n.any && n.any[0] && n.any[0].data) || {};
      return { target: n.target.join(" "), text: (n.html || "").replace(/<[^>]+>/g, "").trim().slice(0, 40),
        fg: d.fgColor, bg: d.bgColor, ratio: d.contrastRatio, fontSize: d.fontSize, expected: d.expectedContrastRatio };
    };
    return {
      violations: r.violations.map(v => ({
        id: v.id, impact: v.impact, help: v.help, helpUrl: v.helpUrl, nodes: v.nodes.length,
        targets: v.nodes.slice(0, 3).map(n => n.target.join(" ")),
        detail: v.nodes.map(pick),
      })),
      // "incomplete" = axe could not decide (for color-contrast usually an
      // undeterminable background). Counted so the report shows what was NOT checked.
      incomplete: r.incomplete.map(v => ({ id: v.id, nodes: v.nodes.length })),
    };
  }, AXE_TAGS);
}

function keyOf(route, vp, v) { return `${route}@${vp}:${v.id}`; }

async function main() {
  if (!existsSync(join(DIST, "app", "index.html"))) { console.error(`No built app at ${DIST}/app/index.html. Run npm run build first.`); process.exit(2); }
  const chrome = findChrome();
  if (!chrome) { console.error("No Chrome/Edge found. Set CHROME_PATH."); process.exit(2); }
  mkdirSync(OUT, { recursive: true });
  const server = await serve(DIST, PORT);
  const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ["--no-sandbox", "--disable-gpu"] });
  const results = [];
  try {
    const page = await browser.newPage();
    // The app ships a strict CSP meta tag (script-src 'self'); the injected axe
    // script would be blocked without this. The bypass applies to this
    // automation tab only, never to the shipped page.
    await page.setBypassCSP(true);
    // Seed the fictional record through the demo page, which hands off to /app/.
    await page.goto(`http://127.0.0.1:${PORT}/app/demo/`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => location.pathname === "/app/" && document.querySelector(".nav-item"), { timeout: 30000 });
    await new Promise(r => setTimeout(r, 1200)); // fonts + dashboard data
    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1, isMobile: vp.width < 768, hasTouch: vp.width < 768 });
      for (const route of ROUTES) {
        await clickNav(page, "Dashboard");
        if (route.nav) await clickNav(page, route.nav);
        const shot = join(OUT, `${route.id}-${vp.width}.png`);
        await page.screenshot({ path: shot, fullPage: true });
        const { violations, incomplete } = await runAxe(page);
        results.push({ route: route.id, title: route.title, viewport: vp.width, violations, incomplete, screenshot: shot });
        const n = violations.reduce((a, v) => a + v.nodes, 0);
        const inc = incomplete.reduce((a, v) => a + v.nodes, 0);
        console.log(`${route.title.padEnd(16)} @${String(vp.width).padEnd(4)} ${violations.length} rule(s), ${n} node(s); ${inc} undecided`);
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  // Compare against a baseline run if given.
  let newViolations = [];
  if (BASELINE) {
    const basePath = resolve(ROOT, BASELINE, "axe-results.json");
    if (!existsSync(basePath)) { console.error(`baseline not found: ${basePath}`); process.exit(2); }
    const base = JSON.parse(readFileSync(basePath, "utf8"));
    const baseNodes = new Map();
    for (const r of base.results) for (const v of r.violations) baseNodes.set(keyOf(r.route, r.viewport, v), v.nodes);
    for (const r of results) for (const v of r.violations) {
      const k = keyOf(r.route, r.viewport, v);
      const before = baseNodes.get(k) ?? 0;
      if (v.nodes > before) newViolations.push({ route: r.route, viewport: r.viewport, id: v.id, impact: v.impact, help: v.help, nodesBefore: before, nodesAfter: v.nodes, targets: v.targets });
    }
  }

  const total = results.reduce((a, r) => a + r.violations.reduce((b, v) => b + v.nodes, 0), 0);
  const byRule = {};
  for (const r of results) for (const v of r.violations) byRule[v.id] = (byRule[v.id] || 0) + v.nodes;
  writeFileSync(join(OUT, "axe-results.json"), JSON.stringify({ generated: new Date().toISOString(), dist: DIST, tags: AXE_TAGS, results, newViolations }, null, 1));

  const md = [];
  md.push(`# axe-core AA results (${opt("--label", "after")})`, "", `Generated ${new Date().toISOString()} against \`${DIST}\`. Tags: ${AXE_TAGS.join(", ")}.`, "");
  md.push("| Route | Width | Rules failing | Nodes |", "|---|---|---|---|");
  for (const r of results) md.push(`| ${r.title} | ${r.viewport} | ${r.violations.length} | ${r.violations.reduce((a, v) => a + v.nodes, 0)} |`);
  md.push("", `Total failing nodes: ${total}`, "", "## By rule", "", "| Rule | Nodes (all routes and widths) |", "|---|---|");
  for (const [id, n] of Object.entries(byRule).sort((a, b) => b[1] - a[1])) md.push(`| ${id} | ${n} |`);
  md.push("", "## Details", "");
  for (const r of results) {
    md.push(`### ${r.title} at ${r.viewport}px`, "");
    if (!r.violations.length) { md.push("No AA violations.", ""); }
    for (const v of r.violations) {
      md.push(`- **${v.id}** (${v.impact}, ${v.nodes} node${v.nodes === 1 ? "" : "s"}): ${v.help}`);
      for (const d of v.detail) md.push(`    - \`${d.target}\` "${d.text}"${d.fg ? ` fg ${d.fg} on ${d.bg}, ${d.ratio}:1 (needs ${d.expected}), ${d.fontSize}` : ""}`);
    }
    const inc = r.incomplete.filter(i => i.nodes).map(i => `${i.id} (${i.nodes})`).join(", ");
    if (inc) md.push(`- undecided by axe, not counted: ${inc}`);
    md.push("");
  }
  if (BASELINE) {
    md.push("## New or grown violations versus baseline", "");
    if (!newViolations.length) md.push("None.", "");
    for (const v of newViolations) md.push(`- ${v.route}@${v.viewport} **${v.id}** (${v.impact}): ${v.nodesBefore} -> ${v.nodesAfter} nodes. e.g. \`${v.targets[0] || ""}\``);
  }
  writeFileSync(join(OUT, "summary.md"), md.join("\n"));
  console.log(`\nTotal failing nodes: ${total}. Report: ${join(OUT, "summary.md")}`);
  if (BASELINE) console.log(`New or grown violations vs baseline: ${newViolations.length}`);
  if (flag("--fail-on-new") && newViolations.length) process.exit(1);
  if (flag("--fail-on-any") && total) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(2); });
