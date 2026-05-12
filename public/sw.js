const CACHE_NAME = 'bteb-results-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/index.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Cache API results
  if (url.pathname.startsWith('/api/proxy/results')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return fetch(event.request)
          .then((response) => {
            if (response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          })
          .catch(() => {
            return cache.match(event.request);
          });
      })
    );
    return;
  }

  // Stale-while-revalidate for everything else
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // If it's a navigation request, serve index.html from cache
      if (event.request.mode === 'navigate') {
        return caches.match('/index.html') || fetch(event.request);
      }

      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Don't cache if not a successful response
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Fallback for failed fetches (like when offline)
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
