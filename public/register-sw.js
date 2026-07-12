// Service Worker registration. Lives in its own file (not inline in the HTML)
// so the Content-Security-Policy can stay `script-src 'self'` with no
// 'unsafe-inline' (S-03 / PG-05).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .catch(function (err) { console.warn('SW registration failed:', err); });
  });
}
