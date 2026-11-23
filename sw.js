const CACHE = 'dumbel-v12';
const CORE_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

// 1. Install: Cache files individually so one missing icon doesn't break the whole worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => {
      return Promise.allSettled(
        CORE_FILES.map(url => 
          cache.add(url).catch(err => console.warn('Skipped caching missing file:', url))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate: Delete all old caches (like dumbel-v11) immediately
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch: Network-first for HTML (prevents stale exercise lists), Cache-first for assets
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // For HTML navigation requests, try network first so updates show up immediately
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match(event.request).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  // For icons, manifest, etc., serve from cache first, fallback to network
  event.respondWith(
    caches.match(event.request).then(hit => {
      return hit || fetch(event.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return res;
      });
    })
  );
});
