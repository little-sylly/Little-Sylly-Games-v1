# Expansion Pack Guide — Little Sylly Games Secret Mode
**Last updated:** June 2026 | **Architecture:** Cartridge system (runtime-loaded packs + global proxy push model)

> Adding a word expansion is now **2 actions: drop a folder, edit one registry line.**
> No `.js` edits, no `sw.js` edits, no SW version bump. The proxy architecture still
> handles all games automatically once the pack is loaded.

---

## How the System Works (read once, never again)

A **pack** is a self-contained folder in `data/packs/<id>/` holding one manifest, `pack.json`.
A single shared registry, `data/packs/registry.json`, lists which pack folders are live.

When the Konami terminal first opens, `smLoadPacks()` in `secret-mode.js`:
1. Fetches `data/packs/registry.json` (an array of pack ids).
2. Fetches each `data/packs/<id>/pack.json` and builds the runtime consts
   `SM_TERMINAL_CONFIG.expansions`, `SM_EXPANSION_OVERRIDES`, and `SM_PACK_WORDS`.
3. Appends the locked `??? [CLASSIFIED]` teaser sentinel (hardcoded — not a real pack).

At launch (`smLaunch()`), `secret-mode.js`:
1. Loads the chosen pack's word bank into the global `secretWords[]` — from the manifest's
   inline `words` array (default), or by fetching `wordFile` if the manifest uses that escape hatch.
2. Sets `isSecretMode = true` and `activeExpansion = '<id>'`.
3. Writes `window.activeExpansionOverrides = { ...forced settings... }`.

Each game plugin reads these at its own settings-apply point (unchanged by the cartridge refactor):
- **LI5:** `applyExpansionOverrides()` in `startGame()`; uses `secretWords` as word pool
- **SS:** overrides + `ssCustomiseVault = false` in `ssConfirmPlayers()`; uses `secretWords` in vault build
- **GM:** `gmApplyExpansionOverrides()` on Round 1; `gmGetWordPool()` returns `secretWords` from Round 2+; Vocabulary Lock + Too Easy guard active Round 2+
- **NAT/JEC:** read overrides at their own apply points

**No plugin file changes are needed for new expansions. No `secret-mode.js` edits either.**

### Why packs are runtime-cached, not precached
Everything under `data/packs/` is served by the SW with a split strategy (see `sw.js` fetch handler):
- **`.json` config (registry + manifests): network-first** — so a newly-added pack is discovered
  on the user's next *online* terminal open, with no version bump.
- **images (asset packs): cache-first** — instant and lean.

A pack added while the user is offline appears on their next online terminal open. The base app
install stays small; deleting a pack folder removes all its weight.

---

## Add a word pack (the only instructions you need)

### Step 1 — Create the folder + manifest
Make `data/packs/<id>/pack.json` (`<id>` must equal the folder name and the registry entry):

```json
{
  "id": "starwars",
  "label": "STAR WARS",
  "locked": false,
  "games": ["li5", "gm", "ss", "jec"],
  "settings": {
    "settingTimer": 60,
    "settingRounds": 5,
    "settingSylly": true,
    "settingSyllyPct": 40,
    "ssRerollLimitSetting": "Infinity"
  },
  "words": [
    { "id": "starwars-001", "word": "Lightsaber", "nono_list": ["jedi","sith","glow","sword","laser","duel","force","hilt","blade","kyber"], "category": "items", "difficulty": 1 }
  ]
}
```

Optional fields: `subCategories: [{ id, label }]` (e.g. Pokémon generations); `wordFile: "words.json"`
instead of inline `words` (escape hatch for very large banks — the loader reads whichever is present).

> **`Infinity` gotcha:** JSON has no `Infinity` literal. Store any infinite setting as the
> **string** `"Infinity"` — `smReviveSettings()` converts it back to the JS `Infinity` number at
> load. The only current case is `ssRerollLimitSetting` (unlimited rerolls).

### Step 2 — Register it
Add the id to `data/packs/registry.json`:
```json
["dota2", "monsterhunter", "pokemon", "starwars"]
```

### Step 3 — Done
Open the Konami terminal → the pack is listed. **Remove it:** delete the folder and remove its
id from `registry.json`. No other edits.

> While developing online, hard-refresh to pick up registry/manifest changes (config is
> network-first; the SW serves the fresh copy). To force an image re-fetch after overwriting it
> in place, bump its filename or clear the SW cache from DevTools (images are cache-first).

---

## Word bank rules
| Rule | Detail |
|------|--------|
| Minimum size | **30+ entries** — GM Vocabulary Lock requires enough words for viable clues |
| nono_list | Exactly 10 items — words that immediately give away the target |
| difficulty | 1 = common term, 2 = moderately niche, 3 = very niche/abstract |
| category | Expansion-specific strings (e.g. `heroes`, `items`, `mechanics`) — **not** the standard 16 |
| id | Unique within the file; format `[theme]-[NNN]` (e.g. `starwars-001`) |
| Australian English | All copy, including nono_list items |

**GM Vocabulary Lock reminder:** players must use words from this bank as their clues in Round 2+.
Design the bank so there are **viable clue options** — don't make every word too niche to use.

---

## Checklist
```
[ ] data/packs/<id>/pack.json created (id == folder name; 30+ words; correct schema)
[ ] settings block uses plugin variable names; any Infinity stored as the string "Infinity"
[ ] <id> added to data/packs/registry.json
[ ] (optional) subCategories / wordFile set if needed
[ ] Verified in the terminal (online, then offline after one online open)
```
No `secret-mode.js`, `sw.js`, or SW-version changes. No `logic-engine.md` precache edit.

---

## Current packs
| ID | Label | Folder | Games | Status |
|----|-------|--------|-------|--------|
| `dota2` | DOTA 2 | `data/packs/dota2/` | li5, gm, ss, jec | ✅ Live (434 words) |
| `monsterhunter` | MONSTER HUNTER | `data/packs/monsterhunter/` | li5, nat | ✅ Live (50 words) |
| `pokemon` | POKÉMON | `data/packs/pokemon/` | li5, nat | ✅ Live (151 words, gen1 sub-cat) |
| `classified` | ??? [CLASSIFIED] | — | — | 🔒 Locked sentinel (loader-appended) |

---

## Override key reference
All keys are plugin variable names. Plugins apply them directly without mapping.

| Key | Plugin | Type | Notes |
|-----|--------|------|-------|
| `teamNames` | LI5 | `[string, string]` | Team name defaults |
| `settingTimer` | LI5 | number (30/60/90) | Seconds per turn |
| `settingRounds` | LI5 | number | Total rounds |
| `settingTabooCount` | LI5 | number (5/10) | No-No list size |
| `settingPenaltyMode` | LI5 | `'points'`/`'time'` | Penalty type |
| `settingSkipFree` | LI5 | bool | Free skips |
| `settingSylly` | LI5 | bool | Sylly Mode on/off |
| `settingSyllyPct` | LI5 | number (0–100) | Sylly word mix % |
| `gmFrequencyRange` | GM | `'stable'`/`'unstable'`/`'chaotic'` | Word difficulty |
| `gmMemoryGuard` | GM | bool | Block repeated clues |
| `gmResonanceTolerance` | GM | `'strict'`/`'normal'` | Near-sync sensitivity |
| `gmInfiniteResync` | GM | bool | Unlimited rerolls |
| `gmSignalBoost` | GM | bool | Boost overlay from R5 |
| `gmSyllyIntensity` | GM | `'sub-atomic'`/`'supernova'` | Sylly Mode intensity |
| `ssDifficultyLevel` | SS | number (1/2/3) | Word difficulty |
| `ssSettingInterceptsToWin` | SS | number | Win condition |
| `ssRerollLimitSetting` | SS | number / `"Infinity"` | Vault reroll budget (store Infinity as string) |
| `ssIntelSyllyMode` | SS | bool | Intel Phase (Sylly Mode) |
| `natMatchesSetting` | NAT | number | Habitats |
| `natRoundsPerMatch` | NAT | number | Days per habitat |
| `natDifficulty` | NAT | `'d1'`/`'d1+d2'`/`'all'` | Field difficulty |
| `natSyllyMode` | NAT | bool | Sylly Mode on/off |

---

## Add an asset (skin) pack — custom cards / dice / gems

> **Making the artwork itself?** Read **`docs/art-authoring-guide.md`** instead — it is the
> standalone, no-Claude-Code guide: exact pixel dimensions and aspect per game, the complete art
> inventory for all seven render seams, the `tools/make-skin-pack.ps1` converter (which resizes,
> compresses, writes `pack.json` and registers the pack for you), per-game gotchas, and
> troubleshooting. **The section below is the format reference**; that doc is the process.

Asset packs use the **same** folder/manifest/registry format as word packs — the manifest's
interesting field is `assets` instead of `words`. A skin is **device-local cosmetic**: it only
changes how *your* device draws the game's ids. There is **zero multiplayer sync** — two players
can run different skins (or none) in the same match. Any id you don't supply an image for falls
back to the default art, so partial skins are fine.

In the terminal a skin appears under **`GAME SKINS` → `<that game>` → `<your skin>`** (not at the
top level), so you can have several skins per game.

### Step 1 — Create the folder + art
Make `data/packs/<id>/` with an `img/` subfolder holding your images. Use **PNG** (photographic
art) or **SVG** (vector/text art — what the bundled `neon-*` samples use). Keep each image
**≤ ~100 KB** (these load on phones). Match the game's card aspect ratio (see the cheat-sheet
below) — images are drawn `background-size: cover`, so the wrong aspect just crops.

### Step 2 — Write `pack.json`
```json
{
  "id": "neon-fruit",
  "label": "NEON FRUIT",
  "locked": false,
  "games": ["frt"],
  "assets": {
    "kind": "frt",
    "basePath": "img/",
    "faces": { "0": "banana.png", "1": "lemon.png", "7": "apple.png" },
    "back": "back.png"
  }
}
```
- `games` — the single game this skin targets (one entry; skins are per-game).
- `assets.kind` — the render-seam family: one of `frt` · `shp` · `flw` · `pko` · `cjar` · `cards` · `dyb`.
- `assets.faces` — maps each **id** (see cheat-sheet) → image filename in `basePath`.
- `assets.back` — one face-down image (optional; used for hands/cup/face-down cards).

### Step 3 — Register it
Add the id to `data/packs/registry.json`:
```json
["dota2", "monsterhunter", "pokemon", "neon-fruit"]
```

### Step 4 — Done
Open the Konami terminal → `GAME SKINS` → your game → your skin → launch. Missing/typo'd files
just fall back to the default art — nothing breaks. **No `secret-mode.js`, no `sw.js`, no SW
version bump.** A skin caches itself the first time you use it online; deleting the folder removes
all its weight.

**Remove it:** delete the folder and its id from `registry.json`.

### `faces` id cheat-sheet (per game)

> Exact pixel dimensions, per-game gotchas and a `-List` command that prints any of these on
> demand: **`docs/art-authoring-guide.md`** § 5.

| Game | `kind` | Id key → meaning | Card aspect |
|------|--------|------------------|-------------|
| Fruit Salad | `frt` | `0` Banana · `1` Lemon · `2` Peach · `3` Grape · `4` Watermelon · `5` Pear · `6` Strawberry · `7` Apple | ~4.5 : 6 |
| Counting Sheep | `shp` | `0` +1 · `1` +2 · `2` +5 · `3` +10 · `4` Doze · `5` Toss&Turn · `6` −10 · `7` Lullaby · `8` Skip-a-Few · `9` Black Sheep · `10` Wide Awake · `11` Heavy Eyelids · `12` Big Bad Wolf · `14` −1 · `15` −2 · `16` −5 (**id 13 Fogged Dream is NOT skinnable** — it stays hidden) | ~4 : 5.5 |
| Flawless | `flw` | gem id = carat value: `0` Obsidian · `1` Quartz · `2` Amethyst · `3` Opal · `4` Jade · `5` Topaz · `6` Emerald · `7` Sapphire · `8` Ruby · `9` Diamond | ~4.5 : 6.5 |
| Pecking Order | `pko` | `mouse` · `mongoose` · `leopard` · `eagle` · `bear` · `elephant` · `bee` · `fish` · `octopus` · `seal` · `polar_bear` · `orca` · `stingray` · `human` (the Poacher) · `mimic` (Invasive Mimicry). Plus one **extra**, `chain` — the food-chain diagram, wide not card-shaped | ~4.25 : 5.75 |
| Cookie Jar | `cjar` | `cookie-handful` · `cookie-batch` · `cookie-mountain` (three TIERS covering all 15 values — the number is a text overlay, don't paint one) · `family-mum` · `family-dad` · `family-big` · `family-grandma` · `family-pet` · `treat-shortbread` · `treat-redvelvet` · `treat-macadamia` · `treat-macarons` · `treat-brownies` | ~15 : 20.6 |
| PASS | `cards` | `rank` + suit-letter: rank ∈ `3 4 5 6 7 8 9 10 J Q K A 2`; suit ∈ `H D C S`. e.g. `AH`, `10S`, `KD`. Joker = `Joker` | ~3.5 : 5 |
| The Bluff | `dyb` | die face value `1`–`6`, plus an optional `specials` block for the five Tempest die types — see below | square |

> **Tip:** start partial. Skin a few ids, register, and check it in-game — the rest stay default
> until you add them. The bundled `neon-*` packs (one per game) are working SVG references you can
> copy and replace image-by-image.

### Optional: `specials` — art for a face that carries a *type*

Some games modify a face without changing its value. The Bluff's Sylly Mode
(**The Tempest**) turns dice into one of five types — `loaded`, `phantom`, `slick`,
`cracked`, `snake` — and the type has to stay readable at a glance no matter what
art you supply. The optional `specials` block is how you skin those.

```json
"assets": {
  "kind": "dyb", "basePath": "img/",
  "faces": { "1": "1.svg", "…": "…", "6": "6.svg" },
  "back":  "back.svg",
  "specials": {
    "loaded":  { "1": "l1.svg", "…": "…", "6": "l6.svg" },
    "snake":   { "3": "s3.svg", "frame": false },
    "phantom": { "blank": "ghost.svg" },
    "cracked": { "blank": "broken.svg" }
  }
}
```

Three key shapes inside a type:

| Key | Meaning |
|-----|---------|
| `"1"`–`"6"` | That type showing that face value |
| `"blank"` | That type when it shows **no** face value — a concealed phantom, a cracked die |
| `"frame"` | Boolean, default `true` — see below |

**The frame is the type; the image is the face.** By default the engine still draws
its own coloured border, tint and glow *around* your art, so a Loaded die is
unmistakably loaded however you paint it. Anything you leave out falls back to the
plain face from `faces`, still framed — so a `specials`-less pack already looks
right, and a partial one degrades instead of breaking.

Set `"frame": false` on a type when your art already carries that identity itself
and the engine border would just double it up. Two things you should know before you
do: the opt-out is **ignored** for any face you didn't supply (otherwise a missing
face would quietly ship an unmarked die), and you are taking responsibility for
keeping that type distinguishable from the other four.

**`"blank"` never falls back to a face image.** If you supply phantom face art but no
`blank`, a concealed phantom draws the engine's `?` glyph — it will not fall back to
`faces`, because that would render the hidden value and leak it to the whole table.

**Not everything is skinnable.** An unassigned Slick keeps its engine `4*` glyph: the
digit is the live auto-rolled face the player needs in order to choose, not decoration.

`data/packs/deep-ocean-dice/` is a complete working example — it uses per-type faces,
the frame opt-out, both `blank` keys, and one deliberately omitted type.
`data/packs/sea-cliff-dice/` is deliberately faces-only, so you can see the fallback.

Verify any change to this seam with `node tools/verify-dyb-dice.js`.

---

## Core art packs — a game's *default* artwork (`data/art/`)

A game's own default art uses the **same manifest format** as a skin pack, so there is one art
pipeline, not two. It lives in a separate tree because it has the opposite caching contract:

| | Skin pack | Core art pack |
|---|---|---|
| Folder | `data/packs/<id>/` | `data/art/<kind>/` |
| Registry | `data/packs/registry.json` | `data/art/registry.json` |
| Appears in the Terminal | Yes, under `GAME SKINS` | **Never** |
| Caching | Runtime (network-first JSON, cache-first images) | **Precached in `sw.js`** |
| Adding/changing it needs an SW bump | No | **Yes** — default art is part of the app version |
| Loaded | Lazily, when the Terminal opens | Eagerly at boot (`artLoadCore()` in `js/lib/art.js`) |

**Resolution order** — one seam, three tiers (`js/lib/art.js`):

```
assetFace('pko', 'elephant')
  → active skin pack covers that id?  → skin image
  → core art pack covers that id?     → default artwork
  → null                              → the seam draws its emoji/CSS face
```

So a skin still overrides the default per-id, a partial skin falls back to the *real* art rather
than to emoji, and a game with no core art behaves exactly as it did before this tier existed.

### Add or change a game's core art

1. **Convert the art.** Target **≤ 40 KB per card** and roughly the card's aspect ratio. There is
   no `cwebp`/ImageMagick/`sharp` on the build machine and the project forbids npm, so the
   established route is a PowerShell + `System.Drawing` script that downscales and walks JPEG
   quality down until each file fits (PKO's run: 896×1200 PNGs → 360 px-wide JPEGs, 26 MB → 682 KB).
   JPEG is fine for full-bleed art with no transparency; use PNG/SVG if you need alpha.
2. **Create `data/art/<kind>/pack.json`** — same `assets` block as a skin, plus `"core": true`:
   ```json
   {
     "id": "pko", "label": "PECKING ORDER — CORE ART", "core": true, "games": ["pko"],
     "assets": {
       "kind": "pko", "basePath": "img/",
       "faces": { "elephant": "elephant.jpg", "polar_bear": "polar_bear.jpg" },
       "back": "back.jpg",
       "extras": { "chain": "chain.jpg" }
     }
   }
   ```
   `extras` is core art's one addition to the format: **non-card game art** (reference diagrams,
   board furniture), read via `assetExtra(kind, key)`. Skins may override an extra but rarely do.
3. **Register it** — add the id to `data/art/registry.json`.
4. **Precache it** — add the manifest *and every image* to `PRECACHE_URLS` in `sw.js`, then bump
   `CACHE_NAME`. This is the step that differs most from a skin pack: miss it and the art simply
   won't be there on a cold offline install.

**The manifest owns the id → filename mapping**, so art filenames never have to match the game's
internal ids (PKO's `poacher.png` serves the chain id `human`). Never hardcode an art path or a
filename lookup table in a plugin — that's what the manifest is for.

#### Step 5 — verify it: the offline install check

The check that step 4 actually worked. **Single device, no lobby, no second phone** — it answers a
pure service-worker question and has nothing to do with Firebase or multiplayer.

> DevTools → Application → **unregister the SW** → hard reload → tick **Offline** → open the game →
> **How to Play → the card-gallery tab**. Illustrated cards = precached. Emoji = it did not.

**Illustrated cards mean the manifest and every image made it into `PRECACHE_URLS`. Emoji means the
third fallback tier fired** (`assetFace` → skin → core art → emoji) — the art is missing, and step 4
is incomplete. You never start a match.

**This only works if the game has a gallery reachable outside a running match.** CJAR is the
reference: before its How-to gallery existed (DD-09) its art rendered *only inside a live Raid*, so
on an MDLM-only game the check needed four phones and a room to answer a service-worker question.
See `ui-style.md` § How-to Overlay Standard → optional tab bar for the gallery pattern.

**As of 10 Aug 2026 every game with core art has one** — CJAR, PKO, FRT, SHP and FLW — so this
check is a single-device job everywhere it applies. DYB has a gallery too, ready for the day it gets
art. **PASS is the only render seam still without one** (54 faces); it also has no core art, so
nothing is currently unverifiable.

**A tile that shows art but won't enlarge on tap is the same failure signal.** The gallery only
offers the zoom affordance for art it actually resolved (`ui-style.md` § Pattern 2a), so a dead tap
means the image is missing even if something is drawn in its place.

Firebase is lazy-loaded and irrelevant here: the app stays fully functional offline right up to
tapping Host/Join, which shows `mp-network-error-overlay`. **That overlay appearing offline is
correct behaviour, not a failure of this check.**

### Rollout tracker — which games have core art

Deliberately game-by-game. **Nothing in a game's code changes when it converts** — every seam
below already calls `assetFace`/`assetBack`, so a conversion is art + manifest + registry +
precache, with no JS edit at all. Use the `faces` id cheat-sheet above for that game's id keys.

| Game | `kind` | Seam | Core art | Notes for whoever converts it |
|------|--------|------|----------|-------------------------------|
| Pecking Order | `pko` | `pkoRenderCard` | ✅ `data/art/pko/` | Reference implementation — 15 faces + back + a `chain` extra |
| Fruit Salad | `frt` | `frtRenderCard` | ✅ `data/art/frt/` | 8 fruit faces + back, id = `0`–`7`. Promoted from the `fruity-fruits` skin (Aug 2026) — 337×450 masters were already near card aspect and small, so the converter held the width: 1.0 MB PNG → **220 KB JPEG**, all at q88 except `back.jpg` (q72, busier art) |
| Counting Sheep | `shp` | `shpRenderCard` | ✅ `data/art/shp/` | 16 faces (ids `0`–`12`, `14`–`16`) + back. Promoted from the `plush-sheeps` skin (Aug 2026) — 400×550 masters held at source width, all 17 files under 40 KB, 640 KB total. **id 13 (Fogged Dream) stays permanently unskinned by design** — `shpRenderCard` hardcodes its cursed placeholder before ever calling `assetFace`, because its value is hidden from every player including its own owner; the manifest's `faces` block simply has no `"13"` key, same as the source skin already didn't |
| Flawless | `flw` | `flwRenderCard` | ✅ `data/art/flw/` | 10 gems, id = carat value `0`–`9`. Promoted from the `prismatic-gems` skin (Aug 2026) — 338×488 masters were already the exact card aspect, so the converter held the width and only re-encoded: 1.1 MB PNG → **217 KB JPEG**, all 11 at q88 |
| PASS | `cards` | `Cards.buildEl` | ⬜ CSS default | 54 faces (`AH`…`Joker`) — by far the biggest precache; budget before generating |
| The Bluff | `dyb` | `dybDieHTML` | ⬜ pip default | Die faces `1`–`6` only. **Needs alpha** if the die isn't a full square — JPEG won't do; use PNG |

Steps for each: run `tools/convert-core-art.ps1` (edit its CONFIG block) → write
`data/art/<kind>/pack.json` → add the id to `data/art/registry.json` → add the manifest **and every
image** to `PRECACHE_URLS` in `sw.js` and bump `CACHE_NAME` → tick the row above.

**Two things to decide before generating art for a game, not after:** the per-file ceiling (PASS's
54 cards at 40 KB is 2.2 MB of install on its own) and whether that primitive needs transparency
(JPEG has none — see the script header).

**Decision record:** `docs/decision-log.md` → *2026-07-31 — Default game art becomes a precached
"core art" pack*. Architecture lives in `js/lib/art.js`; the PKO build notes are in
`docs/implementation-notes/pko-implementation-notes.md` DD-05.
