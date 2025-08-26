// sw.js
const CACHE_NAME = 'jstore-cache-v1';
const PRECACHE_URLS = [
  '/', '/index.html',
  '/images/logo.png',
  '/images/default-icon.png',
  '/images/icon-192.png',
  '/images/icon-512.png',
  '/apps.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS).catch(err => {
      console.warn('Precache failed', err);
    })).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => { if (k !== CACHE_NAME) return caches.delete(k); })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  // network-first for apps.json (remote + local)
  if (request.url.includes('/apps.json') || request.url.includes('fozogt-jpg.github.io/Js/apps/apps.json')) {
    event.respondWith(
      fetch(request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        return response;
      }).catch(() => caches.match(request).then(r => r || caches.match('/apps.json')))
    );
    return;
  }

  // navigation -> serve cached index.html (offline SPA)
  if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      caches.match('/index.html').then(cached => cached || fetch(request).catch(() => caches.match('/index.html')))
    );
    return;
  }

  // other resources: cache-first then network
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;
      return fetch(request).then(networkResp => {
        if (request.method === 'GET' && networkResp && networkResp.status === 200 && networkResp.type !== 'opaque') {
          const copy = networkResp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return networkResp;
      }).catch(() => {
        // no fallback
      });
    })
  );
});
