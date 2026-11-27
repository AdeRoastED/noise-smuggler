/* Noise Smuggler service worker: offline play. Bump VERSION on every release so old caches are removed.
   Caches are namespaced by app AND scope, and only caches with this app's own prefix are ever touched, so other
   Adeba Studio apps hosted on the same domain are never affected. */
var PREFIX = 'adeba-noisesmuggler|' + self.registration.scope + '|';
var VERSION = PREFIX + 'v1.7.0';
var FILES = ['./', 'index.html', 'style.css', 'core.js', 'gen.js', 'levels.js', 'monetization.js', 'game.js',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-64.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf(PREFIX) === 0 && k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // never touch third-party requests
  e.respondWith(caches.match(e.request, { ignoreSearch: true, cacheName: VERSION }).then(function (hit) {
    return hit || fetch(e.request).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(e.request, copy); }); }
      return res;
    }).catch(function () { return caches.match('index.html', { cacheName: VERSION }); });
  }));
});
