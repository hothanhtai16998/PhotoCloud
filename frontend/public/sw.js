// Service Worker for Aggressive Image Preloading and Caching (Unsplash Technique)
// This service worker preloads images before they're needed to prevent flashing

const CACHE_NAME = 'photo-app-images-v2';
const PRELOAD_CACHE = 'photo-app-preload-v2';
const MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB max cache size

// Install event - set up cache
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  self.skipWaiting(); // Activate immediately
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== PRELOAD_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  return self.clients.claim(); // Take control of all pages immediately
});

// Fetch event - aggressive caching strategy for images
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only handle image requests
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
  }
  
  // For non-image requests, use network-first strategy
  // (don't intercept, let browser handle normally)
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
    console.error('[SW] Cache cleanup failed:', error);
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
        console.error('[SW] Preload failed:', error);
        event.ports[0]?.postMessage({ type: 'PRELOAD_FAILED', url });
      });
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

