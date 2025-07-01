// Define el nombre de la caché para esta versión de la aplicación.
// Cambia este nombre cada vez que realices cambios significativos en los archivos para asegurar que los usuarios obtengan la nueva versión.
const CACHE_NAME = 'capibobba-pos-v1.0.1';

// Lista de archivos para pre-cachear durante la instalación del Service Worker.
// Incluye todos los recursos estáticos esenciales para que la aplicación funcione offline.
const urlsToCache = [
  './', // La raíz de la aplicación (index.html)
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  // Asegúrate de que esta ruta sea correcta y que la imagen exista en tu servidor.
  '/images/capibobba-icon-192x192.png' 
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
  Aquí interceptamos las solicitudes y servimos recursos desde la caché si están disponibles,
  o los obtenemos de la red y los cacheamos para uso futuro.
*/
self.addEventListener('fetch', (event) => {
  // Ignora las solicitudes que no sean HTTP/HTTPS (ej. chrome-extension://)
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // Estrategia Cache-First, Network-Fallback:
  // 1. Intenta responder desde la caché.
  // 2. Si no está en caché, ve a la red.
  // 3. Una vez en la red, cachea la respuesta para futuras solicitudes.
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Si el recurso está en caché, lo devolvemos.
        if (response) {
          console.log(`[Service Worker] Sirviendo desde caché: ${event.request.url}`);
          return response;
        }
        
        // Si no está en caché, hacemos la solicitud a la red.
        console.log(`[Service Worker] Obteniendo de la red y cacheando: ${event.request.url}`);
        return fetch(event.request)
          .then((networkResponse) => {
            // Verifica si la respuesta de la red es válida (no es un error, no es opaca)
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Clona la respuesta porque la respuesta original es un stream y solo se puede consumir una vez.
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache); // Guarda la respuesta en caché
              });
            return networkResponse; // Devuelve la respuesta de la red
          })
          .catch((error) => {
            console.error(`[Service Worker] Error al obtener de la red: ${event.request.url}`, error);
            // Puedes devolver una página offline personalizada aquí si lo deseas.
            // Por ejemplo: return caches.match('/offline.html');
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
