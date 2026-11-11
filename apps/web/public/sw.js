// Offline support: pages network-first, built assets cache-first,
// everything else stale-while-revalidate. Bump VERSION to drop old caches.
const VERSION = "v7";
const CACHE = `iwm-${VERSION}`;
const GROUPS = ["todas", "personas", "casa", "mundo", "acciones", "describir", "clave"];
const LISTS = ["due", "marked", "favorites"];
const PAGES = ["/", "/palabras", "/repasar", ...GROUPS.map((g) => `/aprender/${g}`), ...LISTS.map((l) => `/repasar/${l}`)];
const STATIC = ["/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/icon-maskable-512.png", "/apple-touch-icon.png", "/favicon-32.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll([...PAGES, ...STATIC]);
      // Also cache the JS/CSS every page needs, so each screen works offline
      // even if it was never opened online.
      const assets = new Set();
      for (const page of PAGES) {
        const html = await (await cache.match(page)).text();
        for (const m of html.matchAll(/(\/assets\/[\w.-]+\.(?:js|css))/g)) assets.add(m[1]);
      }
      await cache.addAll([...assets]);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    return (await cache.match(request, { ignoreSearch: true })) || (await cache.match("/"));
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  const fresh = fetch(request)
    .then((res) => {
      if (res.ok || res.type === "opaque") cache.put(request, res.clone());
      return res;
    })
    .catch(() => hit);
  return hit || fresh;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (request.mode === "navigate") return event.respondWith(networkFirst(request));
  if (url.origin === self.location.origin && url.pathname.startsWith("/assets/"))
    return event.respondWith(cacheFirst(request));
  if (url.origin === self.location.origin || url.hostname.endsWith("fonts.googleapis.com") || url.hostname.endsWith("fonts.gstatic.com"))
    return event.respondWith(staleWhileRevalidate(request));
});
