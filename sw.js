const CACHE_NAME = 'wordwise-v19';
const RUNTIME_CACHE = 'wordwise-runtime-v19';

// App shell — everything needed to render the UI offline
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/api.js',
  '/auth.js',
  '/fsrs.js',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

// Cross-origin third-party dependencies the app loads from CDNs. These are
// required for the app to function (localforage) or render correctly (marked,
// DOMPurify, highlight.js, fonts). They are cached at runtime on first load so
// the PWA keeps working offline. We match by host so versioned paths still hit.
const RUNTIME_HOSTS = [
  'cdnjs.cloudflare.com',
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

// ── Install: cache the app shell ─────────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: clean up old caches ────────────────────────────────────────────
self.addEventListener('activate', (e) => {
  const keep = new Set([CACHE_NAME, RUNTIME_CACHE]);
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return; // never touch POST/PUT/DELETE

  const url = new URL(req.url);

  // Always go to network for API calls — never serve stale data
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(req).catch(() => new Response('', { status: 503 })));
    return;
  }

  // Cross-origin third-party deps: cache-first, populate on first success so
  // the app works offline after the first online visit.
  if (url.hostname !== self.location.hostname) {
    if (RUNTIME_HOSTS.includes(url.hostname)) {
      e.respondWith(
        caches.open(RUNTIME_CACHE).then((cache) =>
          cache.match(req).then((cached) => {
            const network = fetch(req)
              .then((res) => {
                if (res && res.ok) cache.put(req, res.clone());
                return res;
              })
              .catch(() => cached);
            return cached || network;
          })
        )
      );
    }
    // Other cross-origin requests: default browser handling.
    return;
  }

  // Same-origin app shell: stale-while-revalidate so updates roll out without
  // a manual CACHE_NAME bump, while staying instant and offline-capable.
  e.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    )
  );
});
