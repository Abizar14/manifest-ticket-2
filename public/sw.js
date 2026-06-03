// AFVS service worker — minimal offline-ready shell.
// Strategy:
//   - precache the offline fallback page on install
//   - navigation requests: network-first, fall back to cached fallback
//   - static assets (same-origin GET, _next/static, images, fonts): cache-first
//   - everything else: network passthrough
//
// Bump CACHE_VERSION whenever this file or precached assets change.

const CACHE_VERSION = "afvs-v1";
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const PRECACHE = `${CACHE_VERSION}-precache`;
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = [OFFLINE_URL, "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(CACHE_VERSION))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // Navigation: network-first with offline fallback
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(async () => {
        const cache = await caches.open(PRECACHE);
        const cached = await cache.match(OFFLINE_URL);
        return cached || Response.error();
      }),
    );
    return;
  }

  // Static assets — cache-first
  if (
    sameOrigin &&
    (url.pathname.startsWith("/_next/static") ||
      url.pathname.startsWith("/icons/") ||
      url.pathname === "/manifest.webmanifest" ||
      /\.(?:css|js|woff2?|ttf|svg|png|jpg|jpeg|gif|ico)$/i.test(url.pathname))
  ) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, copy));
            return res;
          }),
      ),
    );
  }
});
