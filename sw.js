// Little Sylly Games — Service Worker v104
// All assets are local — no external CDN URLs, no opaque response issues.

const CACHE_NAME = 'sylly-games-v104';

const PRECACHE_URLS = [
  './',
  'index.html',
  'css/styles.css',
  'js/engine.js',
  'js/games/li5.js',
  'js/games/great-minds.js',
  'js/games/secret-signals.js',
  'js/games/jec.js',
  'js/games/ygi.js',
  'js/games/lttp.js',
  'js/games/nat.js',
  'js/games/dsd.js',
  'js/games/bld.js',
  'js/games/gth.js',
  'js/games/dyb.js',
  'js/games/pass.js',
  'js/games/nt.js',
  'js/lib/cards.js',
  'data/ygi-data.json',
  'data/gth-data.json',
  'js/secret-mode.js',
  'js/app.js',
  'js/lib/tailwind-play.js',
  'js/lib/canvas-draw.js',
  'data/words.json',
  'data/secret_words.json',
  'data/secret2_words.json',
  'data/secret3_words.json',
  'manifest.json',
  'js/engine-multiplayer.js',
  'js/lib/firebase-app.js',
  'js/lib/firebase-database.js',
  'js/lib/firebase-auth.js',
  'js/lib/firebase-init.js'
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
