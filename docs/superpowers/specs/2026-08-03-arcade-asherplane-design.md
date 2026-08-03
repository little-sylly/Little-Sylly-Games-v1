# Design — Arcade Mode & Asherplane

**Date:** 3 August 2026
**Status:** Approved design, ready for implementation
**Origin:** `docs/new-ideas/arcade-mode.md` (owner + Gemini design conversation)

---

## 1. What this is

A **mini arcade** living behind the existing Secret Mode backdoor, holding small
standalone canvas games. The first cabinet is **Asherplane** — a top-down vertical
shoot-'em-up built for two young kids passing an iPad back and forth.

## 2. What this is NOT — the exemption

Arcade cabinets are **not Sylly Games**. Asherplane is not game 19, and no future
cabinet will be. Explicitly out of scope, permanently:

- No `MP_GAME_CONFIGS` entry, no multiplayer of any kind
- No `game-identities.md` section
- No Sylly Mode, no settings overlay, no How to Play overlay
- No verification harness in `tools/`
- **Not** `docs/rules/new-game-checklist.md`, and not the three-stage
  `new-game-process.md`
- Not the Stack (`ui-style.md`), not the brand palette, not the Universal Menu
  Standard — a cabinet inherits the **terminal's** CRT green-on-black language,
  which is already a deliberate suite-wide exception

Cabinets are also **not packs**. Every existing terminal entry modifies a game that
already exists; `smLaunch()` requires both an expansion *and* a host game, loads a
word bank, and injects a breadcrumb banner into a game's menu screen. A cabinet has
none of those. It gets its own launch path **beside** `smLaunch()`, which is left
untouched.

Doc burden for the whole feature: this spec, one `docs/decision-log.md` line, and a
short pointer in `CLAUDE.md`.

## 3. Terminal integration

### 3.1 Category order

`ARCADE` becomes the **first** category — Secret Mode is broader than "packs that
change existing games", and the ordering should say so:

```
> SELECT CATEGORY:
  [1] ARCADE
  [2] WORD PACKS
  [3] GAME SKINS
  [4] ??? [CLASSIFIED]
```

Built in `smRenderExpansions()`, which already assembles `cats[]` dynamically. The
arcade entry is unconditional (it is engine knowledge, not pack data); the two pack
categories keep their existing `hasWords` / `hasSkins` guards.

### 3.2 Cabinet registry

```js
const SM_ARCADE = [
  { id: 'asherplane', label: 'ASHERPLANE', screen: 'screen-arcade-asherplane',
    start: () => apStart() },
];
```

Six lines. Adding cabinet #2 later is one array entry plus one file.

### 3.3 Launch path

`smSelectCategory('arcade')` → `smRenderArcade()` renders the cabinet list into
`sm-terminal-expansions` (same container and `SM_BTN_CLS` styling the word-pack list
uses, with the existing `smAppendBackButton`).

Tapping a cabinet **launches immediately** — no arm-then-LAUNCH step. This diverges
deliberately from the skin flow: skins arm first because there are active settings to
review before committing, and a cabinet has none.

`smLaunchArcade(id)` is a lean sibling of `smLaunch()`:

```
set isSecretMode = true
set smArcadeLastId = id
playSecretBeep launch arpeggio
showScreen(cabinet.screen)
cabinet.start()
```

No word bank, no `activeExpansionOverrides`, no `activeAssetPack`, no breadcrumb
banner injection.

## 4. Sticky unlock and the lobby tile

### 4.1 Behaviour

`smArcadeUnlocked` flips `true` the moment the Konami sequence completes in
`smHandleButton()` — the discovery beat. From then until the page is reloaded, a
`🕹️` button sits beside `#lobby-icon` on the lobby screen.

Tapping it opens the **arcade cabinet list**, not a cabinet directly. Two taps from
lobby to playing (tile → `[1] ASHERPLANE`), and it leaves room for cabinet #2 without
a rethink.

### 4.2 Why the tile bypasses the terminal boot

The tile calls `smOpenArcadeMenu()`, a lean sibling of `smOpenTerminal()`: it clears
the terminal panes, shows `screen-secret-terminal`, types a three-line arcade boot,
and renders the cabinet list.

Critically it does **not** `await smLoadPacks()`. Arcade cabinets need no pack data,
so the arcade opens successfully on a cold offline first run — the exact case where
the pack registry fetch fails and `smRunBootError()` would otherwise block entry.

### 4.3 Tile injection

The tile is created by JS as a sibling of `#lobby-icon`, wrapping both in a flex row.
`index.html`'s lobby markup is not edited: the tile only exists once unlocked, so
building it dynamically is both simpler and keeps the arcade self-contained.

### 4.4 The `resetSecretMode()` carve-out — load-bearing

`resetSecretMode()` currently clears *everything*, and is called from
`resetToLobby()`. Three values must now survive it:

- `smArcadeUnlocked`
- `smArcadeLastId`
- the Asherplane session leaderboard

Without the carve-out, every trip to the lobby re-locks the arcade and wipes the
scores — which is the entire problem the sticky unlock exists to solve. The carve-out
gets an explanatory comment, because it reads like an oversight to anyone tidying the
function later.

Session scores are in memory only. No `localStorage` — the project's rule stands, and
"scores last the afternoon, not forever" is the intended behaviour.

## 5. Asherplane

One file, `js/arcade/asherplane.js`, prefix `ap`. Deliberately not `js/games/` — the
exemption in §2 should be visible in the file tree. Loads after `secret-mode.js`,
before `app.js`. Target ~500 lines.

### 5.1 Canvas

Logical resolution **360 × 640**, letterboxed and centred, scaled by
`devicePixelRatio` so it stays sharp on a Retina iPad. `touch-action: none` on the
canvas to stop the page scrolling under a held thumb. All artwork procedural — no
images, no external assets, consistent with the project's zero-dependency rule.

### 5.2 States

```
attract → playing → nameEntry (top-5 scores only) → leaderboard → playing
```

`attract` shows the title and a large PLAY button. `leaderboard` shows the session
top 5 and a large PLAY AGAIN button.

### 5.3 Controls

Horizontal movement only, player fixed near the bottom.

- **Touch:** hold the left half of the canvas to move left, right half to move right.
  No buttons to miss.
- **Keyboard:** ←/→ or A/D.
- **Firing:** automatic, ~200 ms interval. Nothing to press.

### 5.4 Rules

- 2 lives
- Dart hits car → particle burst, car removed, +10
- Car hits player → −1 life, screenshake, 1.5 s invulnerable flash
- Difficulty ramps with score: spawn rate up, car speed up, both clamped
- 0 lives → game over. No timer, ever.

### 5.5 Leaderboard and name entry

In-memory top 5 for the session. On a qualifying score, a **tap-cycling three-letter
picker**: three big slots, tap a slot to cycle A–Z, confirm. No `<input>`, so iOS
never raises its keyboard over the canvas — the failure mode the original design
conversation specifically flagged.

### 5.6 Audio

One `AP_SOUND` map naming moments (`shoot`, `explode`, `hit`, `gameOver`,
`highScore`, `select`) onto the existing `playSecretBeep(freq)`. Same shape as
`CJAR_SOUND` and `PKO_EVENT_SOUND`. It inherits `isMuted` and `masterVolume` for
free, so no new synthesis and no game-specific audio control.

### 5.7 Chrome

Minimal retro row at the top of the screen: `🔊` (the standard `.btn-open-sound`
class, so the global sound overlay works unchanged) and `✕` (→ lobby). Score and
lives render inside the canvas, arcade-style.

## 6. Timer lifecycle — the seam that fails silently

`apRafHandle` is a timer under `logic-engine.md` § Timer Lifecycle. It must be
cancelled with `cancelAnimationFrame` in **all** of:

1. the `✕` handler
2. `resetToLobby()` — via a forward-referenced `resetArcade()`, mirroring how
   `resetSecretMode()` is called
3. every transition out of `playing` (game over, name entry)

Plus a `visibilitychange` pause: a child will put the iPad down mid-run, and an
uncancelled loop keeps ticking against a hidden screen.

## 7. Engine and PWA registration

- `screen-arcade-asherplane` added to `allScreens[]` in `engine.js` — an unregistered
  screen becomes a ghost that never hides
- `js/arcade/asherplane.js` added to `PRECACHE_URLS[]` in `sw.js`
- `CACHE_NAME` bumped `sylly-games-v162` → `sylly-games-v163`
- Zero binary assets, so nothing else to precache

## 8. Files touched

| File | Change |
|------|--------|
| `js/arcade/asherplane.js` | **new** — the whole game |
| `js/secret-mode.js` | `SM_ARCADE`, `smRenderArcade`, `smLaunchArcade`, `smOpenArcadeMenu`, arcade category in `smRenderExpansions`, unlock flag in `smHandleButton`, lobby tile injection, `resetSecretMode` carve-out |
| `js/engine.js` | one entry in `allScreens[]` |
| `index.html` | one `<section>` (canvas + chrome) and one `<script>` tag |
| `sw.js` | one `PRECACHE_URLS` entry, `CACHE_NAME` bump |
| `docs/decision-log.md` | one line |
| `CLAUDE.md` | short pointer |

**`index.html` edits use a Node script, not the Edit tool.** The UTF-8 mojibake
corruption risk on that file applies regardless of edit size.

## 9. Verification

Manual, on a real iPad — this is a canvas game for children, and there is nothing a
headless harness would meaningfully assert.

1. Konami code → terminal shows `[1] ARCADE` first
2. `[1] ARCADE` → `[1] ASHERPLANE` → game starts
3. Play: movement responds to both halves of the screen, auto-fire works, cars
   explode, score climbs
4. Take two hits → game over → name entry → leaderboard → PLAY AGAIN
5. `✕` → lobby → `🕹️` tile present → tap → cabinet list → play again, leaderboard
   still holds the earlier score
6. Second run beats the first → leaderboard orders correctly
7. Home-screen the app mid-run → return → loop resumed, not double-speed
8. Hard reload → tile gone, arcade locked again
9. Offline cold start → `🕹️` tile path still opens the cabinet list
