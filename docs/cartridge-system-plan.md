# Cartridge System — Expansion & Asset Packs Implementation Plan

**Status:** Approved direction (30 June 2026). Plan only — no code written yet.
**Author:** Claude Code
**Covers:** (Item 2) turn word expansions into true plug-and-play cartridges; (Item 3) add swappable asset packs (custom cards/dice/gems) on the same cartridge format.

---

## 0. The one idea

A **pack** is a self-contained folder you drop into `data/packs/`. One small manifest
describes everything about it — its name, which games it touches, its forced settings,
its words (for word games) and/or its art (for card/dice games). A single shared
**registry** lists which pack folders are live.

To swap a pack in or out you do **two things**: drop/remove the folder, and add/remove
one line in the registry. No JavaScript edits. No service-worker edits. No version bump.

Word packs and asset packs use the **same manifest format and the same registry** — an
asset pack is just a manifest whose interesting field is `assets` instead of `words`.
This is the "extend expansion to also carry a skin" recommendation, made literal.

```
data/packs/
├── registry.json              ← the ONE list of live packs  ["dota2","monsterhunter","neon-cards"]
├── dota2/
│   ├── pack.json              ← manifest: label, games, settings, words
├── monsterhunter/
│   └── pack.json
└── neon-cards/                ← an ASSET pack
    ├── pack.json              ← manifest: label, games, assets{}
    └── img/
        ├── apple.png
        ├── back.png
        └── …
```

---

## PART A — Pack Cartridge System (Item 2)

### A.1 What changes vs today

Today a pack is spread across three hand-edited places in `js/secret-mode.js`
(`SM_TERMINAL_CONFIG.expansions`, `SM_EXPANSION_OVERRIDES`) plus a loose word JSON.
After this change those two `const` objects are **built at runtime** from manifest
files, and adding a pack never touches `.js`.

`SM_SETTINGS_DISPLAY` (the per-**game** label/format map used for the terminal summary)
stays in `secret-mode.js` — it is engine knowledge about each game's settings, not
per-pack data, so it does not belong in a cartridge.

### A.2 Manifest schema — `data/packs/<id>/pack.json`

```jsonc
{
  "id": "dota2",                       // must equal the folder name and the registry entry
  "label": "DOTA 2",                   // shown in the terminal
  "locked": false,                     // true = visible but unselectable placeholder
  "games": ["li5", "gm", "ss", "jec"], // which games this pack is offered for
  "subCategories": [                   // optional; omit or [] if none
    { "id": "gen1", "label": "GEN 1" }
  ],
  "settings": {                        // == today's SM_EXPANSION_OVERRIDES[id] block, verbatim
    "teamNames": ["The Radiant", "The Dire"],
    "settingTimer": 60,
    "gmFrequencyRange": "chaotic"
    // …any plugin-var-named override; all optional
  },
  "words": [                           // inline word bank (word packs only)
    { "id": "dota2-001", "word": "Roshan", "nono_list": ["…"], "category": "creeps", "difficulty": 2 }
  ]
  // "assets": { … }                   // Part B — present only for asset packs
}
```

**Words: inline vs separate file.** Inline `words` keeps a pack to a single file = the
easiest possible swap. The only cost is that listing packs in the terminal fetches each
full manifest (a few KB–~50 KB each). Because the terminal is a deliberate, rare action,
this is fine. If a future word bank grows huge, the loader also accepts
`"wordFile": "words.json"` (path relative to the pack folder) as an alternative — the
loader reads whichever is present. **Default recommendation: inline `words`.**

### A.3 Registry — `data/packs/registry.json`

```json
["dota2", "monsterhunter", "pokemon"]
```

Just folder ids. The loader derives `data/packs/<id>/pack.json` from each. This is the
**only** line you edit to add or remove a pack. (The locked `??? [CLASSIFIED]` teaser is
not a real pack — the loader appends it as a hardcoded sentinel, so it always shows last.)

### A.4 Code changes (all in `js/secret-mode.js` + a tiny `sw.js` tweak)

**1. Replace the two hand-maintained consts with runtime state.**

```js
// was: const SM_TERMINAL_CONFIG = {...}; const SM_EXPANSION_OVERRIDES = {...};
let   SM_TERMINAL_CONFIG  = { expansions: [], games: SM_GAMES };  // SM_GAMES stays a const
let   SM_EXPANSION_OVERRIDES = {};
let   SM_PACK_WORDS = {};   // id -> inline word array (or null if wordFile is used)
let   smPacksLoaded = false;
```

`SM_GAMES` (today's `SM_TERMINAL_CONFIG.games` array — the li5/gm/ss/jec/nat menu map)
stays a hardcoded const; it is engine knowledge, not pack data.

**2. Add a one-time loader, called when the terminal first opens.**

```js
async function smLoadPacks() {
  if (smPacksLoaded) return;
  const ids = await (await fetch('data/packs/registry.json')).json();
  const manifests = await Promise.all(
    ids.map(id => fetch(`data/packs/${id}/pack.json`).then(r => r.json()))
  );
  SM_TERMINAL_CONFIG.expansions = manifests.map(m => ({
    id: m.id, label: m.label, locked: !!m.locked,
    games: m.games, subCategories: m.subCategories || [],
    wordFile: m.wordFile || null,
  }));
  SM_TERMINAL_CONFIG.expansions.push({ id: 'classified', label: '??? [CLASSIFIED]', locked: true });
  manifests.forEach(m => {
    SM_EXPANSION_OVERRIDES[m.id] = m.settings || {};
    SM_PACK_WORDS[m.id]          = m.words   || null;   // null => fetch wordFile at launch
  });
  smPacksLoaded = true;
}
```

Make `smOpenTerminal()` `await smLoadPacks()` before it renders the expansion list. If
the fetch fails, show a terminal error line (reuse the existing `[ LOAD FAILED ]` style).

**3. `smLaunch()` reads inline words instead of always fetching.**

```js
const inline = SM_PACK_WORDS[smSelectedExpansion];
if (inline) {
  secretWords = inline;
} else {
  const path = `data/packs/${smSelectedExpansion}/${expansion.wordFile}`;
  secretWords = await (await fetch(path)).json();
}
if (smSelectedSubCategory) secretWords = secretWords.filter(w => w.category === smSelectedSubCategory);
smBuildExpansionData(secretWords);
```

Everything downstream (`activeExpansionOverrides`, `smBuildExpansionData`, the per-plugin
`[abbr]ApplyExpansionOverrides()` read points) is **unchanged**. The push model and all
plugin code keep working exactly as they do now.

**4. `sw.js` — runtime-cache anything under `data/packs/` (no precache).**

```js
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.pathname.includes('/data/packs/')) {
    // Runtime cache-on-first-use: packs never bloat the precache and never need a version bump
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
        return res;
      }))
    );
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
```

Consequence: **adding a pack does not touch `sw.js` and does not need a SW version bump.**
A pack becomes available offline after it has been opened once while online — perfect for
a drop-in/drop-out test workflow, and it keeps the base app lean (the whole point of the
cartridge idea).

### A.5 Migration of the three existing packs

One-off conversion (a small Node script is safest — see Token Hygiene note: never bulk-edit
by hand):

1. Create `data/packs/registry.json` = `["dota2","monsterhunter","pokemon"]`.
2. For each: make `data/packs/<id>/pack.json` from today's `SM_TERMINAL_CONFIG.expansions`
   entry + `SM_EXPANSION_OVERRIDES[id]` block + the word file's contents inlined as `words`.
   - `dota2` words come from `data/secret_words.json`
   - `monsterhunter` from `data/secret2_words.json`
   - `pokemon` from `data/secret3_words.json` (keep its `subCategories: [{id:'gen1',…}]`)
3. Delete the inline `SM_TERMINAL_CONFIG.expansions` / `SM_EXPANSION_OVERRIDES` literals.
4. Remove the three `secret*_words.json` precache lines from `sw.js` (now runtime-cached).
   Leave the old word files in place until the migration is verified, then delete them.

---

## PART B — Asset Packs (Item 3)

### B.1 Core principle: device-local cosmetic, zero multiplayer impact

Game logic and every Firebase packet carry **ids only** (`cardId`, `fruitId`, `gemId`,
die face value) — never rendered art. An asset pack changes only how **your** device
draws those ids. So:

- No multiplayer sync is needed. Two players can run different skins (or none) in the same
  match and it still works. This is already the documented design intent of the render
  seams (see the `flwRenderCard` "asset-pack seam" comment).
- A missing/broken image silently falls back to today's emoji/CSS — nobody's game breaks.

### B.2 Render-seam inventory (the chokepoints art flows through)

| Family | Seam function | File | Id key |
|--------|---------------|------|--------|
| Playing cards (PASS) | `Cards.buildEl` / `Cards.buildBackEl` | `js/lib/cards.js` | `{rank,suit}` |
| Fruit (FRT) | `frtRenderCard(fruitId, opts)` | `js/games/frt.js:87` | `fruitId` |
| Sheep (SHP) | `shpRenderCard(cardId, opts)` | `js/games/shp.js:282` | `cardId` |
| Gems (FLW) | `flwRenderCard(gemId, opts)` | `js/games/flw.js:108` | `gemId` |
| Dice (DYB) | `dybDieHTML(val, type, …)` | `js/games/dyb.js:1384` | face `val` |

**B0 — seam audit (first task, gating).** Before writing the loader, grep each game to
confirm **nothing builds a card/die face outside its seam** (e.g. no stray
`class="frt-card"` element built inline). Any bypass must be routed through the seam first.
This is the only real risk in Item 3; the loader itself is trivial.

### B.3 `assets` block in the manifest

```jsonc
"assets": {
  "kind": "frt",              // which seam family: "cards" | "frt" | "shp" | "flw" | "dyb"
  "basePath": "img/",         // relative to the pack folder
  "faces": {                  // id -> image filename
    "apple": "apple.png",
    "banana": "banana.png"
  },
  "back": "back.png",         // optional face-down image (card games)
  "style": { "width": "4.5rem", "height": "6.5rem" }  // optional sizing overrides
}
```

A pack may carry `words` (word games) **and/or** `assets` (card/dice games). In practice a
given pack targets one family, but the format does not forbid both.

### B.4 Engine helper + per-seam guard

**One global + one helper** (in `secret-mode.js`, beside the expansion state):

```js
window.activeAssetPack = null;   // set when an asset pack is launched; null otherwise

// Returns a resolved image URL for (kind,id) or null if no active pack covers it.
function assetFace(kind, id) {
  const p = window.activeAssetPack;
  if (!p || !p.assets || p.assets.kind !== kind) return null;
  const file = p.assets.faces?.[id];
  return file ? `data/packs/${p.id}/${p.assets.basePath || ''}${file}` : null;
}
```

**Each seam gains a 3-line guard at the top** (FRT shown; identical shape for the others):

```js
function frtRenderCard(fruitId, opts = {}) {
  const url = assetFace('frt', fruitId);
  if (url && !opts.faceDown) {
    const el = document.createElement('div');
    el.className = 'frt-card frt-card-asset';
    el.dataset.fruit = fruitId;
    el.style.backgroundImage = `url("${url}")`;
    return el;
  }
  // …existing emoji/CSS body unchanged (the fallback) …
}
```

Add a tiny `.<family>-card-asset { background-size: cover; background-position: center; }`
rule per family in `css/styles.css`. That is the entire per-game code cost — **five small
edits, once.** After that, asset packs are pure data.

### B.5 Selecting an asset pack (the "hidden switch")

The card/dice games (PASS/DYB/FRT/SHP/FLW) are **not** in the Secret Terminal's game list
today. Recommended approach, matching "route through the expansion system":

- Add those games to `SM_GAMES` so the terminal can launch them.
- When the chosen pack has an `assets` block, `smLaunch()` sets
  `window.activeAssetPack = manifest` (in addition to / instead of the word overrides) and
  navigates to that game's menu — reusing 100% of the existing terminal plumbing.
- `resetToLobby()` / `resetSecretMode()` clears `window.activeAssetPack = null` so exiting a
  game removes the skin (clean swap-out).

This gives you a working selector with almost no new UI. (If you later want asset packs out
in the open rather than behind the Konami gate, the same `activeAssetPack` global can be set
from a normal Settings toggle — the seams don't care who sets it.)

### B.6 PWA / weight

Asset images live under `data/packs/` and therefore inherit **runtime caching** (Part A.4) —
they are **never** added to `PRECACHE_URLS`. The base install stays small; a skin caches
itself the first time you use it online; deleting the folder removes all its weight. This is
the lean/removable property you asked for.

---

## PART C — What YOU do to swap a pack (the only instructions you need)

### C.1 Add a WORD pack

1. Make a folder `data/packs/<id>/` (e.g. `data/packs/starwars/`).
2. Put one file in it, `pack.json`:
   ```json
   {
     "id": "starwars",
     "label": "STAR WARS",
     "locked": false,
     "games": ["li5", "gm", "ss", "jec"],
     "settings": { "settingTimer": 60, "settingRounds": 5, "settingSylly": true },
     "words": [
       { "id": "starwars-001", "word": "Lightsaber", "nono_list": ["jedi","sith","glow","sword","laser","duel","force","hilt","blade","kyber"], "category": "items", "difficulty": 1 }
     ]
   }
   ```
   (30+ words recommended; same schema as `data/words.json`.)
3. Add `"starwars"` to `data/packs/registry.json`.
4. Done. Open the Konami terminal → the pack is listed.

**Remove it:** delete the folder, remove `"starwars"` from the registry. Gone.

### C.2 Add an ASSET pack (custom cards/dice/gems)

1. Make a folder `data/packs/<id>/` with an `img/` subfolder of your art.
2. Put one `pack.json` in it:
   ```json
   {
     "id": "neon-fruit",
     "label": "NEON FRUIT",
     "locked": false,
     "games": ["frt"],
     "assets": {
       "kind": "frt",
       "basePath": "img/",
       "faces": { "apple": "apple.png", "banana": "banana.png", "cherry": "cherry.png" },
       "back": "back.png"
     }
   }
   ```
   - `kind` must be one of: `cards`, `frt`, `shp`, `flw`, `dyb`.
   - `faces` keys must match the game's ids (the cheat-sheet of ids per game ships with the
     implementation — e.g. FRT fruit ids, FLW gem ids, SHP card ids).
   - Any id you **don't** provide an image for falls back to the default emoji/CSS, so you can
     skin partially while testing.
3. Add `"neon-fruit"` to `data/packs/registry.json`.
4. Done. Launch that game (via terminal) and your art renders. Missing/typo'd files just fall
   back — nothing breaks.

**Remove it:** delete the folder, remove the registry line. The game reverts to defaults.

### C.3 Test workflow notes

- **No build step, no version bump, no `sw.js` edit** for any pack add/remove.
- While developing online, a hard refresh picks up registry/manifest changes. (Runtime cache
  is keyed per-URL; if you overwrite an image in place, bump its filename or clear the SW
  cache from DevTools to force a re-fetch.)
- Keep art reasonably sized (these load on phones). Suggested ≤ ~100 KB per image.

---

## PART D — Sequencing & docs

**Phase A (do first):** Cartridge refactor of the three existing word packs. Self-contained,
fully testable, no game-logic risk. Deliverables: `data/packs/` + loader rewrite in
`secret-mode.js` + `sw.js` runtime-cache handler + rewritten `docs/expansion-guide.md`
(replace the 5-step process with C.1).

**Phase B (after A is verified):** Asset packs. B0 seam audit → `assets` schema + `assetFace()`
+ five seam guards + five CSS rules → add card/dice games to `SM_GAMES` → `activeAssetPack`
teardown in `resetToLobby()`/`resetSecretMode()`. Ship one sample skin (e.g. `frt`) as the
reference pack.

**Doc updates on completion (Documentation Integrity Protocol):**
- `docs/expansion-guide.md` → becomes the C.1/C.2 swap guide.
- `docs/code-map.md` → register `smLoadPacks`, `assetFace`, `activeAssetPack`, the registry path.
- `logic-engine.md` → note runtime-caching of `data/packs/`; seam guard pattern; SW version bump.
- `definitions.md` → add `Pack`, `registry.json`, `activeAssetPack`, `assetFace` terms.
- `docs/decision-log.md` → one line: cartridge system adopted; packs runtime-cached not precached.

---

## PART E — Open decisions for you

1. **Inline words vs `wordFile`?** Recommend inline (single-file packs). `wordFile` stays
   supported as an escape hatch. → *default: inline.*
2. **Asset-pack selector behind the Konami terminal, or a visible Settings toggle?**
   Recommend terminal first (reuses everything); promote to a visible toggle later if you want
   skins to be a normal feature rather than an easter egg. → *default: terminal.*
3. **One pack = one family, or allow combined word+asset packs?** Format allows both; recommend
   keeping packs single-purpose for clarity. → *default: single-purpose, format stays permissive.*
