const CACHE_NAME = 'notifyme-cache-v2';
const urlsToCache = [
  '/',
  '/favicon.ico',
  '/manifest.json',
  '/styles/globals.css',
  // Add more static assets or pages as needed
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Stale-while-revalidate for GET requests
self.addEventListener('fetch', event => {
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        const fetchPromise = fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkResponse.clone());
            });
          }
          return networkResponse;
        }).catch(() => cachedResponse);
        return cachedResponse || fetchPromise;
      })
    );
  } else if (event.request.method === 'POST') {
    // For POST requests, try network, if fails, queue for background sync
    event.respondWith(
      fetch(event.request.clone()).catch(() => {
        return queuePostRequest(event.request);
      })
    );
  }
});

// Background sync for failed POST requests
const POST_QUEUE = 'notifyme-post-queue';

async function queuePostRequest(request) {
  const db = await openQueueDB();
  const tx = db.transaction(POST_QUEUE, 'readwrite');
  const store = tx.objectStore(POST_QUEUE);
  const body = await request.clone().text();
  await store.add({ url: request.url, body, headers: [...request.headers], timestamp: Date.now() });
  await tx.complete;
  self.registration.sync.register('sync-post-queue');
  return new Response(JSON.stringify({ success: false, queued: true }), { status: 503, headers: { 'Content-Type': 'application/json' } });
}

self.addEventListener('sync', event => {
  if (event.tag === 'sync-post-queue') {
    event.waitUntil(processPostQueue());
  }
});

async function processPostQueue() {
  const db = await openQueueDB();
  const tx = db.transaction(POST_QUEUE, 'readwrite');
  const store = tx.objectStore(POST_QUEUE);
  const all = await store.getAll();
  for (const req of all) {
    try {
      await fetch(req.url, {
        method: 'POST',
        headers: req.headers,
        body: req.body
      });
      await store.delete(req.id);
    } catch (e) {
      // Leave in queue for next sync
    }
  }
  await tx.complete;
}

function openQueueDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('notifyme-bg-sync', 1);
    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(POST_QUEUE)) {
        db.createObjectStore(POST_QUEUE, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = event => resolve(event.target.result);
    request.onerror = event => reject(event.target.error);
  });
} 

// Push Notifications Support
self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body || 'You have a new update from Notify Me.',
        icon: data.icon || '/icon512_rounded.png',
        badge: '/icon512_rounded.png',
        data: { url: data.url || '/' }
      };
      event.waitUntil(self.registration.showNotification(data.title || 'Notify Me Alert', options));
    } catch (e) {
      console.error('Push event payload could not be parsed', e);
      event.waitUntil(self.registration.showNotification('Notify Me Alert', { body: event.data.text() }));
    }
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      const url = event.notification.data.url || '/';
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

