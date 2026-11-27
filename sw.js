/* Noise Smuggler service worker: offline play. Bump VERSION on every release so old caches are removed.
   Caches are namespaced by app AND scope, and only caches with this app's own prefix are ever touched, so other
   Adeba Studio apps hosted on the same domain are never affected.
   Safety rules:
   - REQUIRED files must all download correctly or the install fails and the previous version keeps running untouched.
   - OPTIONAL files (icons, font) never block an install; the game falls back to system fonts if one is missing.
   - A failed request for a script, style or font gets a plain error, never index.html pretending to be that file.
   - Only complete 200 responses are cached (no partial or error responses). */
var PREFIX = 'adeba-noisesmuggler|' + self.registration.scope + '|';
var VERSION = PREFIX + 'v2.1.1';
var REQUIRED = ['./', 'index.html', 'style.css', 'core.js', 'gen.js', 'levels.js', 'master.js', 'monetization.js', 'game.js', 'manifest.webmanifest'];
var OPTIONAL = ['fonts/opensans-latin.woff', 'logo.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-64.png'];

function fetchFresh(url) {
  return fetch(new Request(url, { cache: 'reload' })).then(function (res) {
    if (!res || res.status !== 200) throw new Error('bad response for ' + url);
    return res;
  });
}

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return Promise.all(REQUIRED.map(function (u) { return fetchFresh(u).then(function (r) { return c.put(u, r); }); }))
      .then(function () { return Promise.all(OPTIONAL.map(function (u) { return fetchFresh(u).then(function (r) { return c.put(u, r); }).catch(function () {}); })); });
  }).then(function () { return self.skipWaiting(); }).catch(function (err) {
    return caches.delete(VERSION).then(function () { throw err; }); // leave nothing half-installed
  }));
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
  var isNav = e.request.mode === 'navigate';
  e.respondWith(caches.match(e.request, { ignoreSearch: true, cacheName: VERSION }).then(function (hit) {
    if (hit) return hit;
    return fetch(e.request).then(function (res) {
      if (res && res.status === 200 && res.type === 'basic') { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(e.request, copy); }); }
      return res;
    }).catch(function () {
      if (isNav) return caches.match('index.html', { cacheName: VERSION }).then(function (r) { return r || Response.error(); });
      return new Response('', { status: 503, statusText: 'Offline' });
    });
  }));
});
