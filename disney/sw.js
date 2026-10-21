/* Offline support for Twins Disney Trip 2026.
 *
 * Strategy: network-first with a short timeout, falling back to cache.
 *
 * This is deliberately NOT cache-first. The agenda holds Lightning Lane
 * windows and reservation times that can change the morning of — showing
 * someone a cached copy of yesterday's times would be worse than showing
 * nothing. So when there's a usable connection we always serve fresh, and the
 * cache exists purely for when there isn't: dead park wifi, or roaming turned
 * off somewhere over Georgia.
 *
 * Bump CACHE on every deploy.
 */

const CACHE = 'disney-2026-v2';
const TIMEOUT = 2500; // park wifi that half-answers is worse than no wifi

const SHELL = [
  './',
  'index.html',
  'css/app.css',
  'js/data.js',
  'js/app.js',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(
        SHELL.map((u) => c.add(new Request(u, { cache: 'reload' })))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Weather is live-only: never cached, never allowed to block anything.
  if (url.hostname.endsWith('open-meteo.com')) return;
  if (url.origin !== location.origin) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);

    let timer;
    const timeout = new Promise((r) => { timer = setTimeout(() => r(null), TIMEOUT); });

    const network = fetch(req).then((res) => {
      if (res && res.ok && res.type === 'basic') cache.put(req, res.clone()).catch(() => {});
      return res;
    }).catch(() => null);

    const fresh = await Promise.race([network, timeout]);
    clearTimeout(timer);
    if (fresh && fresh.ok) return fresh;

    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;

    // Slow but alive: wait it out rather than failing.
    const late = await network;
    if (late) return late;

    if (req.mode === 'navigate') {
      const shell = await cache.match('index.html');
      if (shell) return shell;
    }
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  })());
});
