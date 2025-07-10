// Define el nombre de la caché para esta versión de la aplicación.
// Cambia este nombre cada vez que realices cambios significativos en los archivos para asegurar que los usuarios obtengan la nueva versión.
const CACHE_NAME = 'capibobba-pos-v1.1.0'; // Versión incrementada para la nueva estrategia

// Lista de archivos para pre-cachear durante la instalación del Service Worker.
// Incluye todos los recursos estáticos esenciales para que la aplicación funcione offline.
const urlsToCache = [
  './', // La raíz de la aplicación (index.html)
  './index.html',
  './style.css',
  './script.js',
  './firebase-init.js', // IMPORTANTE: Añadir para que la app funcione offline
  './manifest.json',
  './images/capibobba-icon-192x192.png' // Usar ruta relativa para mayor compatibilidad
];

/*
  Evento 'install': Se dispara cuando el Service Worker se instala por primera vez.
  Aquí es donde pre-cacheamos todos los activos estáticos de la aplicación.
*/
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Instalando Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Cacheando archivos esenciales:', urlsToCache);
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('[Service Worker] Fallo al cachear archivos:', error);
      })
  );
});

/*
  Evento 'fetch': Se dispara cada vez que el navegador intenta cargar un recurso.
  Implementamos una estrategia de caché híbrida para optimizar la velocidad y la actualización.
*/
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora las peticiones que no son GET y las llamadas a la API de Firebase.
  // Dejamos que el SDK de Firebase maneje su propia lógica de red y offline.
  if (request.method !== 'GET' || url.hostname.includes('firestore.googleapis.com') || url.hostname.includes('firebase.googleapis.com')) {
    return;
  }

  // Estrategia 1: Stale-While-Revalidate para el App Shell (HTML, CSS, JS).
  // Sirve desde la caché para velocidad, pero actualiza en segundo plano.
  if (request.destination === 'document' || request.destination === 'style' || request.destination === 'script') {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(request).then(cachedResponse => {
          const fetchPromise = fetch(request).then(networkResponse => {
            // Si la petición a la red es exitosa, actualizamos la caché.
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          });
          // Devolvemos la respuesta de la caché inmediatamente si existe,
          // si no, esperamos a que la red responda.
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Estrategia 2: Cache First para todos los demás recursos (imágenes, fuentes, etc.).
  // Si está en caché, se sirve desde ahí. Si no, se busca en la red y se cachea.
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then(networkResponse => {
        return caches.open(CACHE_NAME).then(cache => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }
        );
      });
    })
  );
});

/*
  Evento 'activate': Se dispara cuando el Service Worker se activa.
  Aquí es donde limpiamos las cachés antiguas para liberar espacio y evitar conflictos.
*/
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activando Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Elimina las cachés que no coincidan con el CACHE_NAME actual.
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Eliminando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Asegura que el Service Worker tome el control de todas las páginas abiertas.
  self.clients.claim();
});
