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

const CACHE = 'disney-2026-v5';
const TIMEOUT = 2500; // park wifi that half-answers is worse than no wifi

/* Only the small guidemaps are pre-cached: four of them cost about 510 KB,
   which is worth paying up front so the maps work in a dead spot in Pandora.
   The full-size ones are 1.9 MB together, so they're left to the runtime
   cache below — whichever parks you actually open get kept. */
const SHELL = [
  './',
  'index.html',
  'css/app.css',
  'js/data.js',
  'js/maps.js',
  'js/app.js',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/apple-touch-icon.png',
  'maps/ak-sm.webp',
  'maps/mk-sm.webp',
  'maps/hs-sm.webp',
  'maps/ep-sm.webp',
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

  /* Live data is live-only: never cached, never allowed to block anything.
     Weather comes from open-meteo, ride waits from themeparks.wiki. Both are
     covered by the cross-origin check below; they're named here so it's clear
     that passing them through is the intent and not an oversight. A cached
     wait time is a lie, and a stale one is worse than none. */
  if (url.hostname.endsWith('open-meteo.com')) return;
  if (url.hostname.endsWith('themeparks.wiki')) return;
  if (url.origin !== location.origin) return;

  /* The guidemap images never change under a given filename, so there's no
     point racing the network for them on every view — and a 680 KB download
     that times out at 2.5s would make the map feel broken. */
  if (/\/maps\/[^/]+\.webp$/.test(url.pathname)) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res && res.ok && res.type === 'basic') cache.put(req, res.clone()).catch(() => {});
      return res;
    })());
    return;
  }

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
