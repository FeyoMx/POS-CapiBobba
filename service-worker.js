    // service-worker.js

    // Nombre de la caché
    const CACHE_NAME = 'capibobba-pos-v1';

    // Archivos a cachear (estáticos)
    const urlsToCache = [
        './', // La raíz de la aplicación
        './index.html',
        'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap',
        // Puedes añadir más recursos estáticos aquí si los tienes
        // Por ejemplo: './styles.css', './script.js', imágenes, etc.
        // Para los iconos de PWA, ya están referenciados en manifest.json con URLs de placeholder.
        // Si usas tus propios iconos, asegúrate de incluirlos aquí.
        'https://placehold.co/72x72/FF69B4/ffffff?text=CBPOS',
        'https://placehold.co/96x96/FF69B4/ffffff?text=CBPOS',
        'https://placehold.co/128x128/FF69B4/ffffff?text=CBPOS',
        'https://placehold.co/144x144/FF69B4/ffffff?text=CBPOS',
        'https://placehold.co/152x152/FF69B4/ffffff?text=CBPOS',
        'https://placehold.co/192x192/FF69B4/ffffff?text=CBPOS',
        'https://placehold.co/384x384/FF69B4/ffffff?text=CBPOS',
        'https://placehold.co/512x512/FF69B4/ffffff?text=CBPOS'
    ];

    // Evento 'install': se dispara cuando el Service Worker se instala por primera vez.
    // Aquí cacheamos los recursos estáticos de la aplicación.
    self.addEventListener('install', (event) => {
        event.waitUntil(
            caches.open(CACHE_NAME)
                .then((cache) => {
                    console.log('Service Worker: Cacheando archivos estáticos.');
                    return cache.addAll(urlsToCache);
                })
                .catch(error => {
                    console.error('Service Worker: Fallo al cachear en la instalación:', error);
                })
        );
    });

    // Evento 'activate': se dispara cuando el Service Worker se activa.
    // Aquí limpiamos cachés antiguas para asegurar que solo la versión actual esté en uso.
    self.addEventListener('activate', (event) => {
        event.waitUntil(
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('Service Worker: Eliminando caché antigua:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
        );
    });

    // Evento 'fetch': se dispara cada vez que la aplicación intenta hacer una solicitud de red.
    // Aquí implementamos una estrategia de caché (Cache First, luego Network).
    self.addEventListener('fetch', (event) => {
        // Para las solicitudes de Firebase (Firestore, Auth), siempre intentamos la red primero.
        // Esto es crucial porque los datos de Firebase son dinámicos y deben estar actualizados.
        if (event.request.url.includes('firestore.googleapis.com') ||
            event.request.url.includes('identitytoolkit.googleapis.com') ||
            event.request.url.includes('firebase')) {
            event.respondWith(fetch(event.request).catch(error => {
                console.error('Service Worker: Fallo de red para Firebase:', error);
                // Podrías devolver una respuesta de error o un fallback si es necesario para la UI
                return new Response(JSON.stringify({ error: 'Offline access not available for this data.' }), {
                    headers: { 'Content-Type': 'application/json' },
                    status: 503, // Service Unavailable
                    statusText: 'Offline'
                });
            }));
            return;
        }

        // Para otros recursos (estáticos, fuentes, etc.), intentamos la caché primero.
        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    // Si el recurso está en caché, lo devolvemos.
                    if (response) {
                        return response;
                    }
                    // Si no está en caché, intentamos obtenerlo de la red.
                    return fetch(event.request)
                        .then((networkResponse) => {
                            // Si la solicitud de red es exitosa, cacheamos la respuesta y la devolvemos.
                            // Solo cacheamos respuestas válidas (no errores o redirecciones opacas).
                            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                                return networkResponse;
                            }
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(event.request, responseToCache);
                                });
                            return networkResponse;
                        })
                        .catch((error) => {
                            console.error('Service Worker: Fallo en la solicitud de red:', event.request.url, error);
                            // Aquí podrías devolver una página offline de fallback si no se encuentra en caché y la red falla.
                            // Para este ejemplo, simplemente devolvemos una respuesta de error.
                            return new Response('<h1>Offline</h1><p>No se pudo cargar el recurso y no está disponible sin conexión.</p>', {
                                headers: { 'Content-Type': 'text/html' },
                                status: 503,
                                statusText: 'Offline'
                            });
                        });
                })
        );
    });
    ```

