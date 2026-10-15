// Service Worker for Aggressive Image Preloading and Caching (PHOTOCLOUD Technique)
// This service worker preloads images before they're needed to prevent flashing

const CACHE_NAME = 'photo-app-images-v3';
const PRELOAD_CACHE = 'photo-app-preload-v3';
const STATIC_CACHE = 'photo-app-static-v3';
const MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB max cache size

// Install event - set up cache
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Activate immediately
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== PRELOAD_CACHE && name !== STATIC_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  return self.clients.claim(); // Take control of all pages immediately
});

// Fetch event - caching without delaying navigation.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  // Vite source and HMR modules are mutable, unlike production hashed assets.
  if (/^\/(?:src\/|node_modules\/|@vite\/|@id\/|@fs\/|@react-refresh(?:\?|$))/.test(url.pathname)) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request).catch(async () =>
        (await caches.match(event.request)) || new Response('Navigation failed', { status: 503 })
      )
    );
    return;
  }

  // Priority order: API > Images > Static assets
  // API responses may contain session data. Never cache or replay them offline.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Handle image requests
  if (
    url.pathname.match(/\.(jpg|jpeg|png|gif|webp|avif|svg)$/i) ||
    event.request.headers.get('accept')?.includes('image')
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        // If cached, return immediately (fastest)
        if (cachedResponse) {
          // Update cache in background (stale-while-revalidate)
          fetch(event.request)
            .then((response) => {
              if (response && response.status === 200 && response.type === 'basic') {
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, responseToCache);
                });
              }
            })
            .catch(() => {
              // Network fetch failed, but we have cache, so that's fine
            });
          
          return cachedResponse;
        }

        // Otherwise, fetch and cache (cache-first strategy)
        return fetch(event.request)
          .then((response) => {
            // Don't cache if not successful
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response (stream can only be read once)
            const responseToCache = response.clone();

            // Cache the image
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
              // Clean up old cache if needed
              cleanupCache(cache);
            });

            return response;
          })
          .catch(() => {
            // If fetch fails and no cache, return error
            return new Response('Image fetch failed', { 
              status: 404,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
    );
    return;
  }

  // Cache static assets (HTML, CSS, JS) with cache-first strategy
  if (url.pathname.match(/\.(html|css|js|json|woff|woff2|ttf|eot)$/i)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        });
      })
    );
    return;
  }
  
  // For all other requests, let browser handle normally (don't call respondWith)
});

// Cleanup old cache entries to prevent unlimited growth
async function cleanupCache(cache) {
  try {
    const keys = await cache.keys();
    if (keys.length > 200) {
      // If more than 200 images, remove oldest 50
      const toDelete = keys.slice(0, 50);
      await Promise.all(toDelete.map(key => cache.delete(key)));
    }
  } catch (error) {
    // Cache cleanup failed - silently continue
  }
}

// Message handler for preload requests from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PRELOAD_IMAGE') {
    const { url } = event.data;
    
    // Preload image in background
    fetch(url)
      .then((response) => {
        if (response.ok) {
          return caches.open(PRELOAD_CACHE).then((cache) => {
            return cache.put(url, response);
          });
        }
      })
      .then(() => {
        // Notify main thread that preload is complete
        event.ports[0]?.postMessage({ type: 'PRELOAD_COMPLETE', url });
      })
      .catch((error) => {
        // Preload failed - notify main thread
        event.ports[0]?.postMessage({ type: 'PRELOAD_FAILED', url });
      });
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

