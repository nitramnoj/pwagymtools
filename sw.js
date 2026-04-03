
const CACHE_NAME = 'gymtools-pwa-rebuild-v1';
const ASSETS = [
  '/gymtools_pwa_rebuild/',
  '/gymtools_pwa_rebuild/index.html',
  '/gymtools_pwa_rebuild/menu.html',
  '/gymtools_pwa_rebuild/split.html',
  '/gymtools_pwa_rebuild/tools.json',
  '/gymtools_pwa_rebuild/combos.json',
  '/gymtools_pwa_rebuild/manifest.json',
  '/gymtools_pwa_rebuild/shared.css',
  '/gymtools_pwa_rebuild/shared.js',
  '/gymtools_pwa_rebuild/gymtimer/index.html',
  '/gymtools_pwa_rebuild/resttimer/index.html',
  '/gymtools_pwa_rebuild/resttimer/styles.css',
  '/gymtools_pwa_rebuild/resttimer/script.js',
  '/gymtools_pwa_rebuild/HIIT/index.html',
  '/gymtools_pwa_rebuild/HIIT/exercises.txt'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(key => key !== CACHE_NAME ? caches.delete(key) : Promise.resolve())))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => {});
        return response;
      }).catch(() => caches.match('/gymtools_pwa_rebuild/index.html'));
    })
  );
});
