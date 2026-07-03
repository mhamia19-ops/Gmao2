// GMAO Atelier — Service Worker v3
// (1) App-shell caching → opens offline
// (2) Web Push display → Android notification bar even when app is closed
// (3) notificationclick → focuses/opens the app
//
// Cache name bumped to v3 to force phones running the old cached HTML
// to pick up the latest version immediately.

const CACHE_NAME = 'gmao-shell-v12';
const SHELL_URL  = './index.html';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll([SHELL_URL, './']))
      .catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first for navigation; fall back to cached shell when offline
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(SHELL_URL, copy));
          return res;
        })
        .catch(() => caches.match(SHELL_URL))
    );
  }
});

// ── Web Push: show notification on Android status bar ────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: '🔔 GMAO Atelier', body: 'Nouvelle notification', tag: 'gmao-push' };
  if (event.data) {
    try { data = { ...data, ...event.data.json() }; }
    catch (e) { data.body = event.data.text(); }
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:      data.body,
      tag:       data.tag  || 'gmao-push',
      icon:      './icons/icon-192.png',
      badge:     './icons/icon-72.png',
      vibrate:   [100, 50, 100],
      renotify:  true,
      data:      { url: data.url || './' }
    })
  );
});

// ── Tap on notification → focus or open the app ──────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
