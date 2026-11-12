# Logic & Engine Rules — Little Sylly Games

## Engine / Plugin Split
`engine.js` owns ALL game-agnostic primitives. Plugins own their own state. No cross-contamination.

**`engine.js` owns:**
- `allScreens[]` — every screen ID in the SPA
- `showScreen(id)` — hides all screens, shows target with fadeIn
- All `play*()` audio functions (Web Audio API, synthesised)
- `activeGameId` — set by each plugin on entry, cleared by `resetToLobby()`
- `resetToLobby()` — cold boot: stops timer, clears all overlays, zeroes all games' state → lobby
- `resetToMenu()` — DSTW in-game exit: stops timer, hides DSTW overlays → screen-menu
- Global sound overlay (`#sound-overlay`) — mute toggle + volume slider
- `openSoundOverlay()`, `toggleMute()` — syncs `#btn-mute`, `#global-mute-toggle`, all `.btn-open-sound` icons in one call
- `updateSliderTheme(gameId)` — maps `activeGameId` to the volume slider's `[abbr]-range` CSS class (fallback `stone-range`); called automatically inside `openSoundOverlay()` and with `null` in `resetToLobby()`
- `getMuteToggleOnClass(gameId)` — maps `activeGameId` to the mute toggle's `game-toggle-on-*` class (fallback `game-toggle-on-stone`); used by `toggleMute()`, `openSoundOverlay()`, and `resetToLobby()` so `#global-mute-toggle` shows the current game's brand colour when ON
- `isMuted`, `masterVolume` (both localStorage-backed)

**Each plugin owns:**
- All game-specific state variables
- All game-specific functions and event listeners
- Nothing from `engine.js` is duplicated inside a plugin

---

## Shared Library Modules

`js/lib/` holds reusable, game-agnostic UI engines exposed as `window` globals.
**Before building a card or drawing feature, reuse these — do not re-invent them.**

| Module | Global | API | Reference user |
|--------|--------|-----|----------------|
| `js/lib/cards.js` | `Cards` | `Cards.buildEl({ rank, suit, deckIdx })` → card-face DOM node; `Cards.buildBackEl(deckIdx)` → face-down node. Joker = `{ rank: 'Joker', suit: '', deckIdx }`. Layered by DOM order — no per-card z-index. | PASS |
| `js/lib/music.js` | `Music` | `init()`, `playFor(gameId)`, `setEnabled(b)`, `setVolume(v)`, `syncMute()`, `nowPlaying()`; the jukebox's `hold(track)`/`release()`/`heldKey()`/`deck()`/`scope()` (SW v233). Looping background tracks from `data/music/`, resolved per game with a lobby fallback. **Driven entirely from `showScreen()` — a plugin never calls it.** See § Background music. | engine (every game), the jukebox |
| `js/lib/physics.js` | `Physics` | `simulate({ world, bodies, impulses, events, params, seed })` → `{ samples, events, final, durationMs, capped }`; `rng(seed)` → a seeded xorshift32 stream. **Pure and total: no DOM, no canvas, no `window`, no `Date.now()`, no bare `Math.random()`** — same inputs give byte-identical output on any device, which is what lets it be verified under Node before a pixel exists. Owns motion only; it *reports* a plunge and never decides what one means. SW v243: `params.seatOnPlunge(x,y,vx,vy,anchors)` seats a plunging body as a one-hit anchor (the caller answers *where*; absent = today's plunge, byte-identical); any immovable with `hits` is breakable (`shatter` for a Berg, `knockback` otherwise). | CLD |
| `js/lib/canvas-draw.js` | `CanvasDraw` | `init(canvasEl, { onStrokeEnd })`, `clear()`, `lock()` → `{ w, h, s }` stroke data, `render(canvasEl, data, opts)`, `setTremor(wrapperEl, bool)`, `setBlur(canvasEl, ms)`. **Tremor applies to the wrapper `<div>` only — never the `<canvas>` (coordinate system must stay unaffected).** | GTH |
| `js/lib/controller-body.js` | `ControllerBody` | `{ buildBody, buildControls, buildEars, buildShoulder, smoothNormals }`. Pure geometry — takes `THREE` as an argument, touches no DOM. Ported once from the frozen prototype (`docs/controller-prototype/`, now in the owner's external archive); the prototype carried it duplicated inline and every fix had to be applied twice by hand. | the lobby's 3D controller / Workshop |
| `js/lib/controller-sticker-surface.js` | `StickerSurface` | `StickerSurface(U, ATLAS, opt)` → `{ plan, stamp, padPairs, toAtlas, fromAtlas, boxes, sheets, … }`. Surface-space sticker placement and rasterisation for the 3D controller. **Pure: takes `geo.userData` + the atlas size + an options object, touches no DOM and no THREE** — same contract as `physics.js`, and what lets it be verified under Node. Ported unchanged from the frozen prototype. **Its tuned numbers are NOT in it** — the keep-out discs and `maxDistort` live in `CTL_STICKER_OPT` at the call site, and a surface built with `{}` runs happily while painting inside the stick wells (see the caller-side-config lesson in `shared-implementation-notes.md`). | the Workshop's Stickers tab |
| `js/controller.js` | prefix `ctl` (not `window`-namespaced) | The lobby ornament, the Workshop customiser, and the Konami input surface. Colour state (`ctlReadDesign`/`ctlWriteDesign`, `sylly_controller`), palette (`ctlPalette()`, read live from `GAME_BRAND_HEX`), the renderer (`ctlEnsureBuilt`/`ctlMount`/`ctlApplyDesign`), the Konami adapter (`ctlKonamiCode`/`ctlKonamiPress`), and — SW v229 — the stickers (a tab until SW v234, now the always-visible sheet): the manifest load, the pure placement state machine (`ctlStickerReduce`, Idle/Armed/Selected + undo) and the two rasterisers (`ctlStampShell` for the shell, a flat one for the ears). SW v228–v229. Full inventory: `docs/code-map.md` § 3D Controller / Workshop. | the lobby, `screen-workshop` |
| `js/lounge/*` + `js/lobby/*` | `LouScene`, `LobbyRouter`, `lobby*` … | The lobby's four layouts (SW v231): the Lounge's 3D room (`lou` prefix), TV (`tv`), the Board (`bd`, SW v250), the shared helpers (`lb`), the pure router + door map, and `lobby-host.js` — every effect. **Not a game and not a library a game may call** — a plugin reaches the lobby only through `resetToLobby()`. Inventory: `docs/code-map.md` § Lobby layouts. | the lobby |

**Not `js/lib/` but the same shared-not-reinvented rule — `engine.js` globals used by 3+ games:**

| Function | API | Used by |
|----------|-----|---------|
| `bindCardHold(el, onHold, ms=500)` | Touch/mouse press-and-hold (500ms default), cancels on move/scroll. The mechanics behind ui-style.md's § Tap-Hold Reference pattern — a game's own `[abbr]BindCardHold(el, id)` is a one-line wrapper: `bindCardHold(el, () => [abbr]OpenHowTo('cards', id))`. | PKO (`pkoBindChainHold`), SHP (`shpBindCardHold`), FLW (`flwBindCardHold`) |
| `refHighlightRow(box, attr, id, pingClass, ms=1600)` | Scrolls a gallery row into view and rings it briefly (box-shadow transition, not `animation` — the global reduced-motion block already zeroes it). Called from the game's How-to gallery renderer when a tap-hold passes a `highlightId`. | PKO, SHP, FLW |

**Dice is deliberately NOT shared — yet.** The dice *looks* live in `js/games/dyb-dice.js` (SW v241):
a game-owned, **pure** layer — sets, the recipe, the HTML/CSS painter, the CSS-3D cube — that takes
everything as arguments and reads no `dyb*` game state. It is the unit that moves to `js/lib/` when a
second dice game or the dice selector arrives (YAGNI until then). Dice *rules* (`dybGenerateRoll`,
`dybCountEvents`, `dybLegalRaise`) stay in `js/games/dyb.js`. Cold Shoulder's art (`js/games/cld-art.js`, SW v246)
is the same shape: game-owned and pure, and it moves to `js/lib/` only when a second game draws penguins.

---

## Screen Routing
- `showScreen(id)` hides ALL `allScreens[]` entries, then shows target with CSS fadeIn
- **Rule:** Every new screen ID must be added to `allScreens[]` in `engine.js`
- Adding a screen without registering it leaves a ghost screen that never hides

## Lobby Router Seam (SW v231)
**`lobbyShow()` is the ONLY way back into the lobby.** The lobby has four layouts (the Lounge, TV,
the Board = `screen-shelves`, Original = `screen-lobby`) and the router remembers which one the player left from, so a
game returns there. **Nothing outside `js/lobby/` may `showScreen()` a layout's screen** — not
`'screen-lobby'`, not the new three. The four sites: `resetToLobby()` (every game's exits), both
`secret-mode.js` returns (`sm-terminal-back`, `sm-btn-exit`), and the controller's idle nudge
(`ctlOrnamentIsLive()`). The jukebox screen (SW v233) is not a layout but obeys the same rule: its ✕
dispatches `jukeboxClose` and the router brings the Lounge back. The Arcade room (SW v254) is the same shape
(`arcadeOpen`/`arcadeClose`; a cabinet's ✕ calls `arcExitCabinet()` and returns to the room, not the lobby). A game is launched from any layout by `lobbyLaunch(id)`, which clicks the
game's existing lobby button — **no plugin knows the layouts exist**. `tools/visual-lobby.js` is the
proof, and its mutation pass (revert any site → red) is what keeps it honest. Detail:
`shared-implementation-notes.md` DD-42.

---

## Audio Function Catalogue

> **Moved (4 Nov 2026) → `docs/rules/audio.md`** — read it when adding/choosing a sound, or touching background music. Includes the former `§ Background music` (`js/lib/music.js`) subsection that other docs cite.
> **Headline rule:** Effects are synthesised `play*()` in `engine.js` (never files) and a new game reuses existing ones via an `[ABBR]_SOUND` map; music is the one file type, driven only from `showScreen()` — a plugin never calls `Music`.

---

## Shared Screen Utility — Who Goes First

`showWhoFirst(config)` in `engine.js` — drives `#screen-who-first`. Use for any game with two teams where turn order is undecided at the start.

### Config object
| Key | Type | Description |
|-----|------|-------------|
| `emoji` | string | Thematic emoji (game-specific) |
| `eyebrow` | string | Small-caps label above heading |
| `heading` | string | Main question, game-voiced |
| `prompt` | string | Sub-heading |
| `teamA` | string | Display name for index 0 |
| `teamB` | string | Display name for index 1 |
| `confirmLabel` | string | CTA button label on the confirm sub-state (game-voiced, e.g. "Start Encrypting 📡") |
| `accentBtnClass` | string | Tailwind classes for primary button bg + hover (e.g. `'bg-teal-500 hover:bg-teal-600'`). Defaults to `'bg-stone-700 hover:bg-stone-800'` if omitted. |
| `accentTextClass` | string | Tailwind class for the confirm-label text colour (e.g. `'text-teal-600'`). Defaults to `'text-stone-700'` if omitted. |
| `onResult` | function | Called with `goesFirstIdx` (0 or 1) — the team that goes first |

### Engine state
| Variable | Purpose |
|----------|---------|
| `whoFirstConfig` | Config object for the current invocation |
| `whoFirstSelectedIdx` | Index of the selected team; −1 until set |
| `whoFirstPath` | `'random'` or `'rps'` — drives back-from-confirm routing |

### Rule
**All team games must use `showWhoFirst()`.** No plugin may implement its own "who goes first" screen.

---

## Pass-the-Phone Safety Gate

Any screen transition that reveals **private role information** to a new player (team change, role change, Captain reveal, Crew handoff) **MUST** be preceded by a named gate screen confirming the right person is holding the phone. No plugin may skip this gate.

### Standard implementation (`dsdShowPassGate` pattern)
```js
function [abbr]ShowPassGate({ heading, subtext, ctaLabel, onConfirm }) {
  document.getElementById('[abbr]-gate-heading').textContent = heading;
  document.getElementById('[abbr]-gate-subtext').textContent = subtext;
  const btn = document.getElementById('btn-[abbr]-gate-confirm');
  btn.textContent = ctaLabel;
  btn.onclick = () => { playLaunch(); onConfirm(); };
  showScreen('screen-[abbr]-pass-gate');
}
```

### Trigger points
- Any screen showing a Captain's grid or private role info → gate first
- Any screen showing a Crew's sequence interface → gate first after Captain's transmit
- Role-reveal screens (e.g. Great Minds pass-gate pattern) already compliant via existing `screen-gm-pass-gate`

### Rule
**Every role/team transition that shows private information must have a named gate.** The gate screen must name who the phone is being passed to and require an explicit "I'm ready" tap. No back button on the gate (it cannot be skipped mid-game).

---

## Multiplayer Sync Module

> **Moved (12 Nov 2026) → `docs/rules/multiplayer.md`** — read it before touching any MP send site or applier, `MP_GAME_CONFIGS`, a quit-confirm handler, `engine-multiplayer.js` or `engine-intro.js`. It holds every section that used to sit here: Globals (incl. the `window.` prefix rule), MP_GAME_CONFIGS Entry Schema, Envelope Schema, Sync Lock, Firebase Lazy-Load, Interceptor Pattern, MDLM Patterns, `resetToLobby()` Multiplayer Additions, Entry seam + the Intro, Play-Again Return Pattern, Bots, Mid-Game Quit Contract, Client Reconnect, localStorage Exception. A pointer to `logic-engine.md` § any of those now means that file.
>
> **Headline rules (always binding):**
> - Every plugin branches on `window.syllyMultiplayerMode` (`'single'` / `'host'` / `'client'`). The host is authoritative: a client sends `ACTION`, the host resolves and broadcasts `SYNC`.
> - The engine drops every envelope whose `originId` is this device. A host that also plays updates its own state directly and broadcasts — it never sends itself an ACTION.
> - Firebase erases empty values (`null`, `{}`, `[]`): send reset values explicitly **and** rebuild them on receipt (`p.x || []`).
> - `mpEnterGame(cfg)` is the only way into a game. A mid-game quit in any lobby session calls `mpNotifyPlayerLeft()` then `resetToLobby()`; play-again calls `mpReturnToLobby()`.
> - `mpMyPlayerIdx`, `mpPlayerSlots` and the other `let` globals are not on `window` — never write `window.mpMyPlayerIdx`.
> - Run `node tools/verify-mp-configs.js` after touching `MP_GAME_CONFIGS`; prove a packet contract with a two-device loopback before a live session.

---

## Play-Again Confirmation

**"Play again" actions that reset round state must go through a Decision Modal confirmation (z-[90]) before executing.** Direct-restart buttons with no confirmation are not permitted.

### Pattern
- The gameover "Play Again" / "New [Game]" button shows a Decision Modal (not executes reset directly)
- Modal: themed emoji + "New [Game]?" heading + one-line cost subtext + themed confirm + neutral cancel
- Confirm button: calls reset state + navigates to setup
- Cancel button: closes modal, returns to gameover screen

### Overlays
- Named `[abbr]-new-[game]-overlay`, z-[90]
- Added to `resetToLobby()` teardown in `engine.js`

Required for every game from day one. Reference: DSD's `dsd-new-op-overlay` (New Operation?).

---

## Animation Re-trigger Pattern
To replay a CSS animation on the same element (e.g., shake, flash):
```js
el.classList.remove('my-animation');
void el.offsetWidth;          // force reflow
el.classList.add('my-animation');
```
This is always required — skipping `void el.offsetWidth` silently no-ops.

---

## Timer Lifecycle

Any plugin that starts a `setInterval` / `setTimeout` countdown or turn timer must
store the handle in a named state variable and clear it on **every** exit from the
timed phase — not only on natural expiry.

**Clear the handle in all three places:**
1. The quit-confirm handler (mid-game ✕)
2. `resetToLobby()` teardown in `engine.js`
3. Any state transition that ends the timed phase early (skip, manual end-turn, advance)

**Why:** a handle left running fires its callback against the next screen's state —
e.g. quitting LI5 mid-turn once started a phantom turn timer that ticked into the
menu. Reference implementation: `li5.js` `timerHandle` guarded by
`if (timerHandle) { clearTimeout(timerHandle); timerHandle = null; }` before each
new turn and on teardown.

**`requestAnimationFrame` is a timer too.** A game using RAF as a continuous game
clock / physics loop (first instance: NT's `ntRafHandle`) has the identical
lifecycle requirement — cancel it in the quit-confirm handler, in `resetToLobby()`,
and on any early phase transition (build-phase exit, summary-screen entry). Only the
type differs: cancel with `cancelAnimationFrame(handle)`, not `clearInterval`. A live
RAF loop left running repaints/advances against the next screen's state. Reference:
`nt.js` `ntStopPlayback()` clears `ntRafHandle`.

**Non-game timers follow the same rule** — the 3D controller's `ctlRaf`, Secret Mode's
`smTypewriterTimers`, the lobby layouts' RAFs/timers (`tvDrop()`, `bdDrop()` — the Board's `bdTimers`/`bdRaf`/`bdFlights`, SW v250 —
`lobbyScene.stop()`, `jbxStop()`, the Arcade's one loop `arcRaf` and a playing cabinet's `arcAmbTimer` — `arcStop()`, SW v260/v261),
reconnect's handles (all cleared in `mpEndMatchLocal()`), the Intro's `mpIntroTimers` (`mpIntroStop()`) and the Bluff's two choreography bags
(`dybAnimTimers` / `dybPrTimers` — stopping one never touches the other). Per-handle clear sites:
`shared-implementation-notes.md` DD-54. A prop that idles schedules off the scene's frame time inside its
`tick`, not off a new timer.

---

## PWA Guardian
**Trigger:** Any new feature that fetches data, loads assets, or changes app state.

Before implementing, answer:
1. Will this work offline? If not, how do we cache it?
2. Does `sw.js` need updating to pre-cache new files?
3. Are we using any APIs that require network (and gracefully fail if unavailable)?
4. **What does this add to the install?** Size is a **target, not a gate** (owner, 12 Nov 2026). Before adding
   a binary asset, state its size next to its **render size and aspect** in the spec or commit, and keep
   precached (install-time) assets lean — images first. Runtime-cached content (music, packs, stickers)
   may run larger; trim it when that is cheap. The owner can approve anything over target. Why it
   matters: PKO's 26 MB of PNGs (`pko-impl-notes` TG-02, `cjar-impl-notes` TG-02b).

**SW versioning:** `CACHE_NAME = 'sylly-games-vN'` — bump N on **every deploy**. The install precaches
with `new Request(u, { cache: 'reload' })` — never plain `addAll(PRECACHE_URLS)`
(`shared-implementation-notes.md` BUG-25). Over LAN `http://` (no SW possible) serve with
`http-server -c-1`. **Current version: `CLAUDE.md` § Current Focus — the only place it is written.**

**Precached assets:** the authoritative list is `PRECACHE_URLS[]` in `sw.js` — read it there, never from
a copy. Adding a file to the app = add it to that array AND bump `CACHE_NAME`. The Firebase lib files
are precached but lazy-loaded (§ Firebase Lazy-Load).

**Which caching contract does an asset take? — the rule:**
- **Code is always precached** (every `js/`, `css/` file, vendored libs incl. Three.js).
- **Core art (`data/art/`) is precached**: manifest + every image in `PRECACHE_URLS` + a `CACHE_NAME`
  bump. A conversion is not done until `sw.js` carries all three — missing it means the art is absent
  on a cold offline install. Resolution is skin → core art → emoji (`js/lib/art.js`); no JS edit
  needed. Steps: `docs/expansion-guide.md` § Core art packs. DYB never needs one (procedural dice).
- **Content is runtime-cached, NOT precached**: `data/packs/`, `data/music/` (incl. `jukebox/`),
  `data/stickers/`, `data/lamp/`. JSON network-first, images/audio cache-first; adding one is a folder
  drop + a manifest line — no `sw.js` edit, no version bump. Every failure path is silent (no music /
  sticker / lamp photo, never an error on a game screen). Music: keep tracks lean (a target, not a cap).

Per-folder detail, sizes and the reasoning behind each split: `docs/cost-envelope.md` § 9.

---

## Checklist: Adding a New Game
**Moved — read `docs/rules/new-game-checklist.md` (on-demand) before writing a new game’s first line of code.**
Every item there is binding: engine registration, settings/overlay standards, MP handler audit, the render seam,
the verification harness, and the closure steps. Do not start a new game without it.
