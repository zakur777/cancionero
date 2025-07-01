const CACHE_NAME = 'cancionero-v1';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './auth.css',
  './script.js',
  './auth.js',
  './manifest.json',
  './logosolo.png',
  './browserconfig.xml',
  // Fuentes de Google Fonts
  'https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&display=swap',
  // Font Awesome
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// Instalar el Service Worker
self.addEventListener('install', function(event) {
  console.log('Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Service Worker: Archivos en caché');
        return cache.addAll(urlsToCache);
      })
      .catch(function(error) {
        console.log('Service Worker: Error al cachear archivos', error);
      })
  );
});

// Activar el Service Worker
self.addEventListener('activate', function(event) {
  console.log('Service Worker: Activando...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Eliminando caché antigua', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interceptar peticiones de red
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Si el archivo está en caché, devolverlo
        if (response) {
          return response;
        }

        // Si no está en caché, intentar obtenerlo de la red
        return fetch(event.request).then(function(response) {
          // Verificar si la respuesta es válida
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clonar la respuesta
          var responseToCache = response.clone();

          // Agregar al caché
          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch(function() {
          // Si falla la red y no está en caché, mostrar página offline
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
      })
  );
});

// Manejar mensajes del cliente
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Sincronización en segundo plano
self.addEventListener('sync', function(event) {
  if (event.tag === 'background-sync') {
    console.log('Service Worker: Sincronización en segundo plano');
  }
});

// Notificaciones push (para futuras funcionalidades)
self.addEventListener('push', function(event) {
  if (event.data) {
    const notificationData = event.data.json();
    
    const options = {
      body: notificationData.body,
      icon: './logosolo.png',
      badge: './logosolo.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: notificationData.primaryKey
      }
    };

    event.waitUntil(
      self.registration.showNotification(notificationData.title, options)
    );
  }
}); 