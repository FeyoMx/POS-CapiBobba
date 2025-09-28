// Enhanced Service Worker with improved caching strategies
// Version incremented for performance improvements
const CACHE_NAME = 'capibobba-pos-v1.2.0';
const STATIC_CACHE = 'capibobba-static-v1.2.0';
const DYNAMIC_CACHE = 'capibobba-dynamic-v1.2.0';

// Lista de archivos para pre-cachear durante la instalación del Service Worker.
// Incluye todos los recursos estáticos esenciales para que la aplicación funcione offline.
const STATIC_ASSETS = [
  './', // La raíz de la aplicación (index.html)
  './index.html',
  './style.css',
  './script.js',
  './firebase-init.js',
  './manifest.json',
  './images/capibobba-icon-192x192.png',
  // Cache modular JS files
  './js/dom-elements.js',
  './js/data-management.js',
  './js/modals.js',
  './js/authentication.js',
  './js/transaction-logic.js',
  './js/ui-rendering.js',
  './js/reports.js',
  './js/whatsapp.js',
  './js/firestore-optimization.js'
];

// Network-first resources (always need fresh data)
const NETWORK_FIRST_PATTERNS = [
  /\/api\//,
  /firestore\.googleapis\.com/,
  /firebase\.googleapis\.com/,
  /identitytoolkit\.googleapis\.com/
];

// Cache timeout for network-first requests
const NETWORK_TIMEOUT = 3000;

/*
  Evento 'install': Se dispara cuando el Service Worker se instala por primera vez.
  Aquí es donde pre-cacheamos todos los activos estáticos de la aplicación.
*/
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Service Worker v1.2.0...');
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[Service Worker] Pre-caching static assets:', STATIC_ASSETS);
        return cache.addAll(STATIC_ASSETS);
      }),
      caches.open(DYNAMIC_CACHE) // Initialize dynamic cache
    ]).catch((error) => {
      console.error('[Service Worker] Failed to cache assets:', error);
    })
  );
  // Skip waiting to activate immediately
  self.skipWaiting();
});

/*
  Evento 'fetch': Se dispara cada vez que el navegador intenta cargar un recurso.
  Implementamos estrategias de caché optimizadas según el tipo de recurso.
*/
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Strategy selection based on request type
  if (isNetworkFirst(request)) {
    // Network First for dynamic data
    event.respondWith(handleNetworkFirst(request));
  } else if (isStaticAsset(request)) {
    // Cache First for static assets
    event.respondWith(handleCacheFirst(request));
  } else {
    // Stale While Revalidate for everything else
    event.respondWith(handleStaleWhileRevalidate(request));
  }
});

// Check if request should use Network First strategy
function isNetworkFirst(request) {
  const url = new URL(request.url);
  return NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(request.url)) ||
         url.hostname.includes('firestore.googleapis.com') ||
         url.hostname.includes('firebase.googleapis.com') ||
         url.hostname.includes('identitytoolkit.googleapis.com');
}

// Check if request is for static assets
function isStaticAsset(request) {
  return request.destination === 'style' ||
         request.destination === 'script' ||
         request.destination === 'image' ||
         request.destination === 'font' ||
         request.url.includes('.css') ||
         request.url.includes('.js') ||
         request.url.includes('.png') ||
         request.url.includes('.jpg') ||
         request.url.includes('.svg') ||
         request.url.includes('.woff');
}

// Network First strategy with cache fallback
async function handleNetworkFirst(request) {
  try {
    // Try network with timeout
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Network timeout')), NETWORK_TIMEOUT)
      )
    ]);

    // Cache successful responses for offline fallback
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Network failed, trying cache:', request.url);

    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Ultimate fallback for offline scenarios
    if (request.destination === 'document') {
      return caches.match('./index.html');
    }

    throw error;
  }
}

// Cache First strategy for static assets
async function handleCacheFirst(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Failed to fetch static asset:', request.url);
    throw error;
  }
}

// Stale While Revalidate strategy
async function handleStaleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);

  // Background fetch to update cache
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(error => {
    console.log('[Service Worker] Background fetch failed:', request.url);
  });

  // Return cached response immediately if available, otherwise wait for network
  return cachedResponse || fetchPromise;
}

/*
  Evento 'activate': Se dispara cuando el Service Worker se activa.
  Aquí es donde limpiamos las cachés antiguas para liberar espacio y evitar conflictos.
*/
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating Service Worker v1.2.0...');

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE &&
                cacheName !== DYNAMIC_CACHE &&
                cacheName !== CACHE_NAME) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Clean up old entries in dynamic cache (keep only recent 50 entries)
      cleanupDynamicCache()
    ])
  );

  // Take control of all open pages
  self.clients.claim();
});

// Cleanup function to prevent dynamic cache from growing too large
async function cleanupDynamicCache() {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    const keys = await cache.keys();

    if (keys.length > 50) {
      // Remove oldest entries (keeping newest 50)
      const keysToDelete = keys.slice(0, keys.length - 50);
      await Promise.all(keysToDelete.map(key => cache.delete(key)));
      console.log(`[Service Worker] Cleaned up ${keysToDelete.length} old cache entries`);
    }
  } catch (error) {
    console.error('[Service Worker] Cache cleanup failed:', error);
  }
}

// Background sync for offline actions (future enhancement)
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync triggered:', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle offline queue here in future
      console.log('[Service Worker] Background sync completed')
    );
  }
});

// Push notification handler (future enhancement)
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');

  const options = {
    body: event.data ? event.data.text() : 'Nueva actualización disponible',
    icon: './images/capibobba-icon-192x192.png',
    badge: './images/capibobba-icon-192x192.png',
    tag: 'capibobba-notification'
  };

  event.waitUntil(
    self.registration.showNotification('CapiBobba POS', options)
  );
});