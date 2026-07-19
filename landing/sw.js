// Root service-worker KILL-SWITCH (ships at /sw.js).
// The app used to live at the site root and registered /sw.js at scope "/".
// Now the root serves the static landing page and the app lives at /app/.
// Any previously-cached client re-fetches /sw.js on its next update check, gets
// this file, and this worker unregisters itself so the stale root worker stops
// controlling the origin. The /app/ and /companion/ workers are untouched.
//
// Do NOT delete caches here: Cache Storage is origin-wide, so a blind purge
// would also drop the companion's caches.
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    await self.registration.unregister();
    var clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(function (c) { c.navigate(c.url); });
  })());
});
