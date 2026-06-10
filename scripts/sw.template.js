/** Wygenerowany przy buildzie — CACHE z APP_VERSION (20.5Z.2A). Szablon: scripts/sw.template.js */
const CACHE = "__SW_CACHE_NAME__";
const PRECACHE = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.webmanifest",
  "/favicon-16.png",
  "/favicon-32.png",
  "/apple-touch-icon.png",
  "/icons/icon-192.webp",
  "/icons/icon-512.webp",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // 20.5Z.2A — version.json: network-only (bez cache SW i bez fallback do index.html)
  if (url.pathname === "/version.json") {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok && url.pathname.startsWith("/assets/")) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(event.request, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(event.request).then((r) => {
          if (r) return r;
          if (event.request.mode === "navigate") {
            return caches.match("/offline.html").then((offline) => offline || caches.match("/index.html"));
          }
          return caches.match("/index.html");
        })
      )
  );
});
