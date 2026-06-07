const CACHE_NAME = 'gmao-offline-v2'; // Changed name to force update
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install event
self.addEventListener('install', event => {
  self.skipWaiting(); // Force the new SW to activate immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// Activate event
self.addEventListener('activate', event => {
  event.waitUntil(clients.claim()); // Take control of all open tabs
});

// Fetch event
self.addEventListener('fetch', event => {
  // 🚨 CRUCIAL: Ignore cross-origin requests (like Supabase API calls)
  if (!event.request.url.startsWith(self.location.origin)) {
    return; // Let the browser handle API calls normally
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then(fetchResponse => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, fetchResponse.clone());
          return fetchResponse;
        });
      }).catch(() => {
        // Fallback for HTML navigation if offline
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
