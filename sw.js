// Little Sylly Games — Service Worker v60
// All assets are local — no external CDN URLs, no opaque response issues.

const CACHE_NAME = 'sylly-games-v60';

const PRECACHE_URLS = [
  './',
  'index.html',
  'css/styles.css',
  'js/engine.js',
  'js/games/li5.js',
  'js/games/great-minds.js',
  'js/games/secret-signals.js',
  'js/games/jec.js',
  'js/secret-mode.js',
  'js/app.js',
  'js/lib/tailwind-play.js',
  'data/words.json',
  'data/secret_words.json',
  'manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  // Purge all previous caches (game + font caches from earlier versions)
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Cache-first for all requests — all assets are local and same-origin
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
