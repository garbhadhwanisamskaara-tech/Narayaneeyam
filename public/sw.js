/* Push messaging + minimal app-shell service worker.
   - Existing push/notification handling is preserved unchanged.
   - Added fetch handler for basic offline app-shell support. */

const SHELL_CACHE = "narayaneeyam-shell-v2";
const CACHE_PREFIX = "narayaneeyam-shell-";
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.png",
  "/icons/icon-192.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await cache.addAll(PRECACHE_URLS);
    })(),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      // Wipe every older app-shell cache so stale bundles are never served again.
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith(CACHE_PREFIX) && name !== SHELL_CACHE)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  ),
);

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Sriman Narayaneeyam";
  const options = {
    body: payload.body || "Time for today's chanting 🪔",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: "daily-reminder",
    data: { url: payload.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windowClients) {
        if (client.url === targetUrl && "focus" in client) return client.focus();
      }
      for (const client of windowClients) {
        if ("navigate" in client && "focus" in client) {
          await client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })(),
  );
});

/* Minimal fetch handler: network-first for navigations, cache-first for
   same-origin static assets, pass-through for everything else. */

// JS/CSS change with every deploy, so they must be network-first — a stale
// bundle stuck in cache is what made the TWA run old code (e.g. the garden
// bloom bug) long after the webapp was fixed.
const CODE_EXTENSIONS = /\.(?:js|css)$/i;
const STATIC_EXTENSIONS = /\.(?:png|jpg|jpeg|svg|gif|webp|json|ico|mp3|webm|wasm|woff|woff2|ttf|otf)$/i;

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests.
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(SHELL_CACHE);
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          const cached = await caches.match(request);
          if (cached) return cached;
          const fallback = await caches.match("/index.html");
          if (fallback) return fallback;
          throw error;
        }
      })(),
    );
    return;
  }

  if (STATIC_EXTENSIONS.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;

        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.status === 200) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      })(),
    );
    return;
  }

  // Everything else (API calls, etc.) goes directly to the network.
});
