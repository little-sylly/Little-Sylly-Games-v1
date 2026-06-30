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
- `assets.kind` — the render-seam family: one of `frt` · `shp` · `flw` · `cards` · `dyb`.
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

| Game | `kind` | Id key → meaning | Card aspect |
|------|--------|------------------|-------------|
| Fruit Salad | `frt` | `0` Banana · `1` Lemon · `2` Peach · `3` Grape · `4` Watermelon · `5` Pear · `6` Strawberry · `7` Apple | ~4.5 : 6 |
| Counting Sheep | `shp` | `0` +1 · `1` +2 · `2` +5 · `3` +10 · `4` Doze · `5` Toss&Turn · `6` −10 · `7` Lullaby · `8` Skip-a-Few · `9` Black Sheep · `10` Wide Awake · `11` Heavy Eyelids · `12` Big Bad Wolf · `14` −1 · `15` −2 · `16` −5 (**id 13 Fogged Dream is NOT skinnable** — it stays hidden) | ~4 : 5.5 |
| Flawless | `flw` | gem id = carat value: `0` Obsidian · `1` Quartz · `2` Amethyst · `3` Opal · `4` Jade · `5` Topaz · `6` Emerald · `7` Sapphire · `8` Ruby · `9` Diamond | ~4.5 : 6.5 |
| PASS | `cards` | `rank` + suit-letter: rank ∈ `3 4 5 6 7 8 9 10 J Q K A 2`; suit ∈ `H D C S`. e.g. `AH`, `10S`, `KD`. Joker = `Joker` | ~3.5 : 5 |
| The Bluff | `dyb` | die face value `1`–`6` (**standard dice only** — special Tempest dice keep their pip styling so the type stays legible) | square |

> **Tip:** start partial. Skin a few ids, register, and check it in-game — the rest stay default
> until you add them. The bundled `neon-*` packs (one per game) are working SVG references you can
> copy and replace image-by-image.
