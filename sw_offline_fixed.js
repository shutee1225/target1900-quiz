const CACHE_NAME = "target1900-offline-v5";

// Offline operation only requires the app shell here.
// Icons are cached separately so a missing/renamed icon cannot break installation.
const CORE_FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest"
];

const OPTIONAL_FILES = [
  "./icons/icon-192.png.new",
  "./icons/icon-512.png.new"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(CORE_FILES);
      await Promise.all(
        OPTIONAL_FILES.map((url) => cache.add(url).catch(() => undefined))
      );
      await self.skipWaiting();
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // For page navigation, try the network first, then open the cached app.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(async () =>
          (await caches.match("./index.html")) || (await caches.match("./"))
        )
    );
    return;
  }

  // Other static files use cache first and are saved after the first request.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});
