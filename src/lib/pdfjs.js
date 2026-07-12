// ── Bundled pdf.js loader (S-04 / PG-03) ─────────────────────────────────────
// Replaces the former runtime CDN import of pdf.js 4.4.168 from cdnjs: CDN code
// executing in a health app's origin is a supply-chain exposure, breaks offline
// use, and had drifted against the pdfjs-dist copy already in package.json.
// The library is loaded lazily (Vite code-splits this dynamic import) so the
// main bundle stays lean; the worker ships as a bundled asset via Vite's ?url
// import. This is the only module that may load pdf.js — no CDN URLs anywhere.
let _pdfjsPromise = null;

export function loadPdfjs() {
  if (!_pdfjsPromise) {
    _pdfjsPromise = Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
    ]).then(([lib, workerUrl]) => {
      lib.GlobalWorkerOptions.workerSrc = workerUrl.default;
      return lib;
    });
  }
  return _pdfjsPromise;
}
