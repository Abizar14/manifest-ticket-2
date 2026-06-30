 // AFVS service worker — minimal offline-ready shell.
// Strategy:
//   - precache the offline fallback page on install
//   - navigation requests: network-first, fall back to cached fallback
//   - static assets (same-origin GET, _next/static, images, fonts): cache-first
//   - everything else: network passthrough
//
// Bump CACHE_VERSION whenever this file or precached assets change.

const CACHE_VERSION = "afvs-v2";
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const PRECACHE = `${CACHE_VERSION}-precache`;
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = [OFFLINE_URL, "/manifest.webmanifest"];
const RUNTIME_MAX_ENTRIES = 80; // P-14: batasi ukuran runtime cache (FIFO)

// P-14: pangkas entri terlama bila runtime cache melebihi batas, supaya tidak
// membengkak di disk klien (mis. aset gambar).
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  for (let i = 0; i < keys.length - maxEntries; i++) {
    await cache.delete(keys[i]);
  }
}

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

  // Build assets ber-hash (/_next/static) — cache-first AMAN: URL berubah saat
  // konten berubah, jadi tidak akan basi.
  if (sameOrigin && url.pathname.startsWith("/_next/static")) {
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
    return;
  }

  // Aset publik path-STABIL (icons, gambar termasuk .webp/.avif, font, manifest)
  // — stale-while-revalidate: sajikan cache cepat, lalu perbarui di latar
  // belakang supaya tidak basi saat file diganti (mis. gambar baru di P-01).
  if (
    sameOrigin &&
    (url.pathname.startsWith("/icons/") ||
      url.pathname === "/manifest.webmanifest" ||
      /\.(?:css|js|woff2?|ttf|svg|png|jpg|jpeg|gif|ico|webp|avif)$/i.test(
        url.pathname,
      ))
  ) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res && res.ok) {
              cache.put(req, res.clone());
              trimCache(RUNTIME_CACHE, RUNTIME_MAX_ENTRIES);
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});
