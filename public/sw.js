const CACHE_NAME = 'trem-bao-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Activate event - clean up old caches
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
    })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { body: event.data ? event.data.text() : 'Nova notificação do Trem Bão!' };
  }

  const options = {
    body: payload.body || 'Nova notificação do Trem Bão!',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: payload.data || {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: payload.actions || [
      {
        action: 'explore',
        title: 'Ver Pedido',
        icon: '/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Fechar',
        icon: '/icon-192x192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Trem Bão Delivery', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[sw.js] Notification click received.');
  
  event.notification.close();

  if (event.action === 'accept') {
    // Handle offer acceptance
    const offerId = event.notification.data?.offer_id;
    if (offerId) {
      // Open the app and navigate to accept offer
      event.waitUntil(
        self.clients.openWindow(`${self.registration.scope}?acceptOffer=${offerId}`)
      );
    }
  } else if (event.action === 'reject') {
    // Handle offer rejection - just close notification
    console.log('[sw.js] Offer rejected via notification');
  } else if (event.action === 'explore') {
    // Open the app to the orders page
    event.waitUntil(
      self.clients.openWindow('/orders')
    );
  } else if (event.action === 'close') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        // Check if there is already a tab/window open with the target URL
        for (let i = 0; i < clients.length; i++) {
          const client = clients[i];
          // If so, just focus it.
          if (client.url.startsWith(self.registration.scope) && 'focus' in client) {
            return client.focus();
          }
        }
        // If not, then open the target URL in a new window/tab.
        if (self.clients.openWindow) {
          return self.clients.openWindow(self.registration.scope);
        }
      })
    );
  }
});

// Background sync event
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  // Sync offline orders or other data
  return fetch('/api/sync', {
    method: 'POST',
    body: JSON.stringify({
      timestamp: Date.now()
    }),
    headers: {
      'Content-Type': 'application/json'
    }
  });
}