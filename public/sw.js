const CACHE_NAME = 'sales-management-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Installation
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - Network First Strategy pour les données dynamiques
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // API requests: network-first
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone la réponse
          const responseClone = response.clone();

          // Met en cache pour usage offline
          if (request.method === 'GET') {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }

          return response;
        })
        .catch(() => {
          // Si réseau échoue, retourne depuis le cache
          return caches.match(request);
        })
    );
  }
  // Static assets: cache-first
  else {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          return response || fetch(request);
        })
    );
  }
});

// Background Sync (si supporté)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-ventes') {
    event.waitUntil(syncVentes());
  }
});

async function syncVentes() {
  // La logique de sync sera gérée par offline_sync.js
  // Ici on notifie juste l'application
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'SYNC_REQUESTED',
      tag: 'sync-ventes'
    });
  });
}

// Notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'Nouvelle notification',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Sales Management', options)
  );
});