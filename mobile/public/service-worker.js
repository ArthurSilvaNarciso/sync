// Service Worker do Sync PWA
// Estratégias:
//   - shell (HTML, JS, CSS, fontes): cache-first com fallback network
//   - imagens (Unsplash, avatares): stale-while-revalidate
//   - tiles (OSM): cache-first até 7 dias
//   - API (/api/*): network-first com cache de 5min

const VERSION = 'sync-v3';
const SHELL = `sync-shell-${VERSION}`;
const IMAGES = `sync-images-${VERSION}`;
const TILES = `sync-tiles-${VERSION}`;
const API = `sync-api-${VERSION}`;

const SHELL_URLS = [
  '/',
  '/index.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL).then((cache) => cache.addAll(SHELL_URLS).catch(() => {})),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.endsWith(VERSION))
          .map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Apenas GET é cacheado
  if (req.method !== 'GET') return;

  // OpenStreetMap tiles → cache-first (longa duração)
  if (url.hostname.includes('tile.openstreetmap.org')) {
    event.respondWith(cacheFirst(req, TILES));
    return;
  }

  // Imagens externas (Unsplash, uploads do backend) → stale-while-revalidate
  if (
    /\.(png|jpe?g|gif|webp|svg)(\?|$)/.test(url.pathname) ||
    url.hostname.includes('unsplash.com') ||
    url.pathname.startsWith('/uploads/')
  ) {
    event.respondWith(staleWhileRevalidate(req, IMAGES));
    return;
  }

  // API calls → network-first (5min cache)
  if (url.pathname.startsWith('/api/') && !url.pathname.includes('/auth/')) {
    event.respondWith(networkFirst(req, API, 5 * 60 * 1000));
    return;
  }

  // Shell e assets do app → cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(req, SHELL));
    return;
  }
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return cached || new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const network = fetch(req)
    .then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || network;
}

async function networkFirst(req, cacheName, maxAgeMs) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok) {
      const cloned = res.clone();
      // Adiciona timestamp ao header pra TTL
      const headers = new Headers(cloned.headers);
      headers.set('sw-fetched-at', Date.now().toString());
      const body = await cloned.blob();
      cache.put(req, new Response(body, { status: res.status, headers }));
    }
    return res;
  } catch {
    const cached = await cache.match(req);
    if (cached) {
      const fetchedAt = parseInt(cached.headers.get('sw-fetched-at') || '0', 10);
      if (Date.now() - fetchedAt < maxAgeMs) return cached;
    }
    return cached || new Response('Offline', { status: 503 });
  }
}

// Push notifications via SW
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Sync';
  const options = {
    body: data.body || '',
    icon: '/favicon.png',
    badge: '/favicon.png',
    data: data.data || {},
    tag: data.tag || 'sync-notification',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const c of clients) {
        if (c.url.includes(url) && 'focus' in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
