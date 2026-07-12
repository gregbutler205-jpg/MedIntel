// Companion mode (legacy ?companion=1 URLs): swap to the companion manifest so
// "Add to Home Screen" launches the companion instead of the full web app.
// iOS reads the linked manifest's start_url at add-to-home-screen time.
// Lives in its own file (not inline in the HTML) so the Content-Security-Policy
// can stay `script-src 'self'` with no 'unsafe-inline' (S-03 / PG-05).
(function () {
  if (location.search.indexOf('companion') === -1) return;
  var link = document.querySelector('link[rel="manifest"]');
  if (link) link.setAttribute('href', '/manifest-companion.json');
  var title = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (title) title.setAttribute('content', 'Insina');
  document.title = 'Insina Companion';
})();
