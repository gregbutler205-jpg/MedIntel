// Service Worker registration. Lives in its own file (not inline in the HTML)
// so the Content-Security-Policy can stay `script-src 'self'` with no
// 'unsafe-inline' (S-03 / PG-05).
//
// Self-locating scope: the app builds to /app/ and the companion to /companion/,
// each copying this same file + sw.js into its own directory. We derive the
// scope from THIS script's own URL so one shared file registers the worker at
// the right per-surface scope (/app/ or /companion/) — never the origin root,
// which the landing owns. `document.currentScript` is captured at top-level
// execution (it is null inside the later load handler).
(function () {
  if (!('serviceWorker' in navigator)) return;
  var src = (document.currentScript && document.currentScript.src) || '';
  window.addEventListener('load', function () {
    var base = '/';
    try { if (src) base = new URL('.', src).pathname; } catch (e) { /* keep '/' */ }
    navigator.serviceWorker.register(base + 'sw.js', { scope: base })
      .catch(function (err) { console.warn('SW registration failed:', err); });
  });
})();
