// Network-first with cache fallback: always fresh when online, fully usable offline.
const CACHE = 'savings-monitor-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/tokens.css',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './js/app.js',
  './js/router.js',
  './js/dom.js',
  './js/icons.js',
  './js/format.js',
  './js/prefs.js',
  './js/db.js',
  './js/ui/components.js',
  './js/ui/sheet.js',
  './js/ui/toast.js',
  './js/ui/form.js',
  './js/pages/home.js',
  './js/pages/savings.js',
  './js/pages/account.js',
  './js/pages/expenses.js',
  './js/pages/taxi.js',
  './js/pages/targets.js',
  './js/pages/settings.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request).then((hit) => hit || caches.match('./index.html'))),
  );
});
