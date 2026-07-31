// Little Sylly Games — Service Worker v149
// All assets are local — no external CDN URLs, no opaque response issues.

const CACHE_NAME = 'sylly-games-v149';

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
  'js/games/frt.js',
  'js/games/shp.js',
  'js/games/flw.js',
  'js/games/pko.js',
  'js/lib/cards.js',
  'js/lib/art.js',
  'data/ygi-data.json',
  'data/gth-data.json',
  'data/pko-data.json',
  'js/secret-mode.js',
  'js/app.js',
  'js/lib/tailwind-play.js',
  'js/lib/canvas-draw.js',
  'data/words.json',
  // Expansion/skin packs (data/packs/) are NOT precached — they are runtime-cached
  // on first use so adding a pack needs no version bump. See the fetch handler below.
  //
  // CORE ART (data/art/) IS precached — it is a game's default artwork, so it must be
  // present on a cold offline install. Same manifest format as a skin pack, opposite
  // caching contract: changing core art IS an app change and DOES need a version bump.
  // Resolution order (js/lib/art.js): skin pack → core art → emoji fallback.
  'data/art/registry.json',
  'data/art/pko/pack.json',
  'data/art/pko/img/mouse.jpg',
  'data/art/pko/img/mongoose.jpg',
  'data/art/pko/img/leopard.jpg',
  'data/art/pko/img/eagle.jpg',
  'data/art/pko/img/bear.jpg',
  'data/art/pko/img/elephant.jpg',
  'data/art/pko/img/bee.jpg',
  'data/art/pko/img/fish.jpg',
  'data/art/pko/img/octopus.jpg',
  'data/art/pko/img/seal.jpg',
  'data/art/pko/img/polar_bear.jpg',
  'data/art/pko/img/orca.jpg',
  'data/art/pko/img/stingray.jpg',
  'data/art/pko/img/human.jpg',
  'data/art/pko/img/mimic.jpg',
  'data/art/pko/img/back.jpg',
  'data/art/pko/img/chain.jpg',
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
  const url = new URL(event.request.url);

  // Expansion/asset packs (data/packs/) — runtime cache, no precache, no version bump.
  if (url.pathname.includes('/data/packs/')) {
    if (url.pathname.endsWith('.json')) {
      // Config (registry + manifests): network-first so new/updated packs are
      // discovered without a version bump; fall back to cache when offline.
      event.respondWith(
        fetch(event.request).then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
          return res;
        }).catch(() => caches.match(event.request))
      );
    } else {
      // Media (skin images): cache-first — instant + lean.
      event.respondWith(
        caches.match(event.request).then(cached => cached || fetch(event.request).then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
          return res;
        }))
      );
    }
    return;
  }

  // Everything else: cache-first — all assets are local and same-origin.
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
