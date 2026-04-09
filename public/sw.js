// IntelliTrax Service Worker
// Network-first with cache fallback — always fetches fresh on reload,
// falls back to cache when offline.

const CACHE = "intellitrax-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  // Only handle GET requests to our own origin
  if (event.request.method !== "GET") return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  // Skip browser extension requests
  if (event.request.url.includes("chrome-extension")) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache a clone of every successful response
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline: serve from cache
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // For navigation requests, serve the app shell
          if (event.request.mode === "navigate") {
            return caches.match("/MedIntel/") || caches.match("/MedIntel/index.html");
          }
        });
      })
  );
});
