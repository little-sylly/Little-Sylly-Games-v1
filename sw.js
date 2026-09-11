// Little Sylly Games — Service Worker v229
// All assets are local — no external CDN URLs, no opaque response issues.

const CACHE_NAME = 'sylly-games-v229';

const PRECACHE_URLS = [
  './',
  'index.html',
  'css/styles.css',
  'assets/logo.png',
  'fonts/fredoka-latin.woff2',
  'fonts/fredoka-latin-ext.woff2',
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
  'js/games/cjar.js',
  'js/games/cld.js',
  'js/games/comb.js',
  'js/lib/cards.js',
  'js/lib/art.js',
  'js/lib/music.js',
  'js/lib/physics.js',
  'js/lib/three.min.js',
  'js/lib/controller-body.js',
  'js/lib/controller-sticker-surface.js',
  'data/ygi-data.json',
  'data/gth-data.json',
  'data/pko-data.json',
  'data/cjar-data.json',
  'js/controller.js',
  'js/secret-mode.js',
  'js/arcade/asherplane.js',
  'js/app.js',
  'js/lib/tailwind-play.js',
  'js/lib/canvas-draw.js',
  'data/words.json',
  // Expansion/skin packs (data/packs/), background music (data/music/) and controller
  // stickers (data/stickers/) are NOT precached — they are runtime-cached on first use
  // so adding one needs no version bump. See the fetch handler below.
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
  'data/art/cjar/pack.json',
  'data/art/cjar/img/cookie-handful.jpg',
  'data/art/cjar/img/cookie-batch.jpg',
  'data/art/cjar/img/cookie-mountain.jpg',
  'data/art/cjar/img/family-mum.jpg',
  'data/art/cjar/img/family-dad.jpg',
  'data/art/cjar/img/family-big.jpg',
  'data/art/cjar/img/family-grandma.jpg',
  'data/art/cjar/img/family-pet.jpg',
  'data/art/cjar/img/treat-shortbread.jpg',
  'data/art/cjar/img/treat-redvelvet.jpg',
  'data/art/cjar/img/treat-macadamia.jpg',
  'data/art/cjar/img/treat-macarons.jpg',
  'data/art/cjar/img/treat-brownies.jpg',
  'data/art/cjar/img/back.jpg',
  'data/art/flw/pack.json',
  'data/art/flw/img/0.jpg',
  'data/art/flw/img/1.jpg',
  'data/art/flw/img/2.jpg',
  'data/art/flw/img/3.jpg',
  'data/art/flw/img/4.jpg',
  'data/art/flw/img/5.jpg',
  'data/art/flw/img/6.jpg',
  'data/art/flw/img/7.jpg',
  'data/art/flw/img/8.jpg',
  'data/art/flw/img/9.jpg',
  'data/art/flw/img/back.jpg',
  'data/art/frt/pack.json',
  'data/art/frt/img/0.jpg',
  'data/art/frt/img/1.jpg',
  'data/art/frt/img/2.jpg',
  'data/art/frt/img/3.jpg',
  'data/art/frt/img/4.jpg',
  'data/art/frt/img/5.jpg',
  'data/art/frt/img/6.jpg',
  'data/art/frt/img/7.jpg',
  'data/art/frt/img/back.jpg',
  'data/art/shp/pack.json',
  'data/art/shp/img/0.jpg',
  'data/art/shp/img/1.jpg',
  'data/art/shp/img/2.jpg',
  'data/art/shp/img/3.jpg',
  'data/art/shp/img/4.jpg',
  'data/art/shp/img/5.jpg',
  'data/art/shp/img/6.jpg',
  'data/art/shp/img/7.jpg',
  'data/art/shp/img/8.jpg',
  'data/art/shp/img/9.jpg',
  'data/art/shp/img/10.jpg',
  'data/art/shp/img/11.jpg',
  'data/art/shp/img/12.jpg',
  'data/art/shp/img/13.jpg',
  'data/art/shp/img/14.jpg',
  'data/art/shp/img/15.jpg',
  'data/art/shp/img/16.jpg',
  'data/art/shp/img/17.jpg',
  'data/art/shp/img/18.jpg',
  'data/art/shp/img/sheep.png',
  'data/art/shp/img/pen.png',
  'data/art/shp/img/back.jpg',
  // Honeycomb Hills (comb) — NINE core art packs, one per render seam/extra
  // `kind` (js/lib/art.js resolves one `kind` per manifest, and COMB is the
  // first game whose art spans more than one). comb.js joined the plugin list
  // above at v225, the phase-41 gate — that line is what actually ships game 20,
  // and an offline install is only complete with both halves present.
  'data/art/comb/hex/pack.json',
  'data/art/comb/hex/img/grove.png',
  'data/art/comb/hex/img/blossom.png',
  'data/art/comb/hex/img/clover.png',
  'data/art/comb/hex/img/rock.png',
  'data/art/comb/hex/img/nursery.png',
  'data/art/comb/hex/img/smoke.png',
  'data/art/comb/res/pack.json',
  'data/art/comb/res/img/resin.png',
  'data/art/comb/res/img/wax.png',
  'data/art/comb/res/img/pollen.png',
  'data/art/comb/res/img/nectar.png',
  'data/art/comb/res/img/jelly.png',
  'data/art/comb/instinct/pack.json',
  'data/art/comb/instinct/img/guard.jpg',
  'data/art/comb/instinct/img/golden.jpg',
  'data/art/comb/instinct/img/rush.jpg',
  'data/art/comb/instinct/img/bloom.jpg',
  'data/art/comb/instinct/img/pheromone.jpg',
  'data/art/comb/instinct/img/back.jpg',
  'data/art/comb/piece/pack.json',
  'data/art/comb/piece/img/wall-0.png',
  'data/art/comb/piece/img/wall-1.png',
  'data/art/comb/piece/img/wall-2.png',
  'data/art/comb/piece/img/wall-3.png',
  'data/art/comb/piece/img/cell-0.png',
  'data/art/comb/piece/img/cell-1.png',
  'data/art/comb/piece/img/cell-2.png',
  'data/art/comb/piece/img/cell-3.png',
  'data/art/comb/piece/img/dome-0.png',
  'data/art/comb/piece/img/dome-1.png',
  'data/art/comb/piece/img/dome-2.png',
  'data/art/comb/piece/img/dome-3.png',
  'data/art/comb/piece-hero/pack.json',
  'data/art/comb/piece-hero/img/wall-0.png',
  'data/art/comb/piece-hero/img/wall-1.png',
  'data/art/comb/piece-hero/img/wall-2.png',
  'data/art/comb/piece-hero/img/wall-3.png',
  'data/art/comb/piece-hero/img/cell-0.png',
  'data/art/comb/piece-hero/img/cell-1.png',
  'data/art/comb/piece-hero/img/cell-2.png',
  'data/art/comb/piece-hero/img/cell-3.png',
  'data/art/comb/piece-hero/img/dome-0.png',
  'data/art/comb/piece-hero/img/dome-1.png',
  'data/art/comb/piece-hero/img/dome-2.png',
  'data/art/comb/piece-hero/img/dome-3.png',
  'data/art/comb/blossom/pack.json',
  'data/art/comb/blossom/img/generic.png',
  'data/art/comb/blossom/img/resin.png',
  'data/art/comb/blossom/img/wax.png',
  'data/art/comb/blossom/img/pollen.png',
  'data/art/comb/blossom/img/nectar.png',
  'data/art/comb/blossom/img/jelly.png',
  'data/art/comb/wasp/pack.json',
  'data/art/comb/wasp/img/wasp.png',
  'data/art/comb/pog/pack.json',
  'data/art/comb/pog/img/blank.png',
  'data/art/comb/pog/img/hot.png',
  'data/art/comb/die/pack.json',
  'data/art/comb/die/img/die.png',
  'data/art/comb/die/img/die-numbered.png',
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

  // Music (data/music/) — runtime cache, no precache, no version bump. Same
  // contract as data/packs/ and for the same reason: a track ships by dropping
  // an mp3 in the folder and adding one manifest line. Precaching instead would
  // put every track in the install (~1.5 MB each) and make each new one a
  // version bump — an mp3 is much heavier than a skin image, so the split
  // matters more here than anywhere else.
  if (url.pathname.includes('/data/music/')) {
    if (url.pathname.endsWith('.json')) {
      // Manifest: network-first, so a newly-added track is discovered on the
      // next online load without a version bump; cache covers offline.
      event.respondWith(
        fetch(event.request).then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
          return res;
        }).catch(() => caches.match(event.request))
      );
    } else {
      // Audio: cache-first — a track is fetched once and then costs nothing,
      // which is what keeps repeat play off mobile data.
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

  // Stickers (data/stickers/) — runtime cache, no precache, no version bump.
  // Same contract as data/packs/ and data/music/: the owner adds stickers as
  // they are drawn, and a new one must not cost a service-worker release.
  // js/lib/controller-sticker-surface.js IS precached — that is app code, and
  // app code is part of the app version. The art is not.
  if (url.pathname.includes('/data/stickers/')) {
    if (url.pathname.endsWith('.json')) {
      // Manifest: network-first, so a newly-drawn sticker is discovered on the
      // next online load; the cache covers offline.
      event.respondWith(
        fetch(event.request).then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
          return res;
        }).catch(() => caches.match(event.request))
      );
    } else {
      // Art: cache-first — fetched once, then free.
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
