// GlaciaNav Notes service worker.
//
// Scope is deliberately minimal: make the app installable and give a friendly
// offline page. It must NEVER serve stale app code — caching hashed Next.js
// build assets across deploys is what breaks the UI after an update. So we cache
// only the offline shell + icons, and everything else goes straight to the
// network. Bumping VERSION purges older caches and self-heals stale clients.
const VERSION = "gnn-v2";
const CACHE = `${VERSION}-shell`;
const SHELL = ["/offline.html", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        // Delete every cache that isn't the current version — including the old
        // gnn-v1-static that cached build chunks.
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Page navigations: always network-first; fall back to the offline page only
  // when the network is unreachable. Never cache the page itself.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("/offline.html").then((r) => r || Response.error())
      )
    );
    return;
  }

  // Icons are stable and safe to serve from cache (for offline installability).
  if (url.pathname.startsWith("/icons/")) {
    event.respondWith(caches.match(request).then((r) => r || fetch(request)));
    return;
  }

  // Everything else (build assets, RSC, API, audio) → straight to the network.
  // No caching, so a new deploy is picked up immediately.
});
