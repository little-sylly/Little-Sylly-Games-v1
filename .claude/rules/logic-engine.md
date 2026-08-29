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
| `js/lib/music.js` | `Music` | `init()`, `playFor(gameId)`, `setEnabled(b)`, `setVolume(v)`, `syncMute()`, `nowPlaying()`. Looping background tracks from `data/music/`, resolved per game with a lobby fallback. **Driven entirely from `showScreen()` — a plugin never calls it.** See § Background music. | engine (all 18 games) |
| `js/lib/canvas-draw.js` | `CanvasDraw` | `init(canvasEl, { onStrokeEnd })`, `clear()`, `lock()` → `{ w, h, s }` stroke data, `render(canvasEl, data, opts)`, `setTremor(wrapperEl, bool)`, `setBlur(canvasEl, ms)`. **Tremor applies to the wrapper `<div>` only — never the `<canvas>` (coordinate system must stay unaffected).** | GTH |

**Not `js/lib/` but the same shared-not-reinvented rule — `engine.js` globals used by 3+ games:**

| Function | API | Used by |
|----------|-----|---------|
| `bindCardHold(el, onHold, ms=500)` | Touch/mouse press-and-hold (500ms default), cancels on move/scroll. The mechanics behind ui-style.md's § Tap-Hold Reference pattern — a game's own `[abbr]BindCardHold(el, id)` is a one-line wrapper: `bindCardHold(el, () => [abbr]OpenHowTo('cards', id))`. | PKO (`pkoBindChainHold`), SHP (`shpBindCardHold`), FLW (`flwBindCardHold`) |
| `refHighlightRow(box, attr, id, pingClass, ms=1600)` | Scrolls a gallery row into view and rings it briefly (box-shadow transition, not `animation` — the global reduced-motion block already zeroes it). Called from the game's How-to gallery renderer when a tap-hold passes a `highlightId`. | PKO, SHP, FLW |

**Dice is deliberately NOT shared** — all dice logic lives in `js/games/dyb.js`
(`dybGenerateRoll`, `dybComputeRealCount`, `dybDieHTML`) coupled to DYB state.
Extract into a shared module only if a second dice game appears (YAGNI until then).

---

## Screen Routing
- `showScreen(id)` hides ALL `allScreens[]` entries, then shows target with CSS fadeIn
- **Rule:** Every new screen ID must be added to `allScreens[]` in `engine.js`
- Adding a screen without registering it leaves a ghost screen that never hides

---

## Audio Function Catalogue
All sound **effects** are synthesised via Web Audio API — no files, and that will not change. Background *music* is the single exception and lives in its own module — see § Background music below.

| Function | Semantic meaning | Notes |
|----------|-----------------|-------|
| `playSuccess()` | Correct / match | Bright ascending chime: C5→E5→G5, triangle wave |
| `playBoing()` | Wrong / taboo hit | Cartoon descending sweep 280→120 Hz, square wave |
| `playLaunch()` | Big CTAs | — |
| `playExit()` | Destructive confirm | — |
| `playPillClick()` | Settings pill toggle | — |
| `playDone()` | Close / confirm overlays | — |
| `playTick()` | Countdown tick | — |
| `playSliderTick(value)` | Volume slider feedback | Bypasses mute check |
| `playSyllyOn()` / `playSyllyOff()` | Sylly Mode toggle | — |
| `playWhoosh()` | Skip / swish | — |
| `playResume()` | Resume from pause | — |
| `playAlarm()` | Timer expiry | 3-pulse radar blip |
| `playSonarPing()` | DSD: Sonar Ping transmit (captain only) | Dual sine 880→440Hz + 1760Hz harmonic, lowpass filter, 1.2s decay |
| `playHullThud()` | DSD: Pressure Mine / Urchin / Jammer hit | White noise + resonant lowpass (80Hz Q8) + triangle sub 70Hz, 0.4s |
| `playAbyssThud()` | DSD: Nuclear Mine hit | `playHullThud()` + 35Hz sawtooth rumble through lowpass, 2.5s decay |
| `playStampede()` | PKO: Stampede confirmed — **and a Swarm** (the same gesture at smaller scale) | Sub-bass sawtooth swell 38→55Hz + noise through a rising lowpass 120→900Hz, ~1.2s |
| `playUnchallenged()` | PKO: winning an Encounter | Rising three-note sting G3–D4–G4, sawtooth through lowpass |
| `playPoacher()` | PKO: Poacher played | Dry highpassed click + two detuned square partials — deliberately out-of-ecosystem |
| `playClashWin()` | PKO: emptying your Hoard | Deepened, slower `playSuccess()` (C4–E4–G4) over a sine sub |

**Force of Nature adds NO new audio functions.** PKO's nine events announce themselves by **reusing** the catalogue above, mapped in one place — `PKO_EVENT_SOUND` in `js/games/pko.js`: `playPoacher` (Invasive Mimicry — out-of-ecosystem, like the Poacher itself), `playAbyssThud` (The Culling, Extinction Event), `playWhoosh` (The Great Reversal, Migration), `playSonarPing` (Alpha, Carrion), `playDone` (The Deluge, The Dry Season). Keeping the map beside the registry is deliberate: an event's identity (data) and its voice (audio) cannot drift apart, and a new event needs no new synthesised sound.

**Cookie Jar adds NO new audio functions either** — same pattern, one map: `CJAR_SOUND` in `js/games/cjar.js` names a *moment* (`cookie`, `caughtFirst`, `busted`, `reveal`, `soloSneak`, `treatSpecial`/`treatSuper`, `raidLost`, `highAlert`, `dobBackfire`, `matchEnd`) and points it at an existing `play*()`. Two games now use this shape; treat it as the default for a new game rather than synthesising more tones.

Global audio state: `isMuted` (bool), `masterVolume` (0–1), `audioCtx` (Web Audio context),
`sfxEnabled` (bool, 28 Aug 2026 — System Sounds toggle, independent of `isMuted`; every `play*()`
guard is `if (isMuted || !sfxEnabled) return;` except `playSliderTick`, which deliberately bypasses
both so slider/mute-hold feedback is always audible).

**Mute All still outranks everything.** `sfxEnabled` and `Music`'s own `enabled` flag are each a
*channel* toggle; `isMuted` silences both regardless of their individual state — the effects and
music guards both check `isMuted` first. Tap-**hold** (500 ms) on any `.btn-open-sound` icon toggles
`isMuted` directly without opening `#sound-overlay` — wired via `bindCardHold` at the bottom of
`engine.js`'s boot block, with a per-button flag suppressing the click that follows a fired hold (a
normal tap still opens the overlay).

### Background music (`js/lib/music.js`, 28 Aug 2026)

**Effects stay synthesised — forever. Music is the one thing that is a file.** Everything above is
generated at runtime and no `play*()` will ever load an asset; `Music` is a separate layer with its
own state, its own level and its own caching contract.

| Call | Purpose |
|------|---------|
| `Music.init()` | Loads `data/music/manifest.json`, arms the first-gesture unlock. Called once from `engine.js`'s boot block |
| `Music.playFor(gameId)` | Resolves and crossfades to that game's track. **Already called for you** — see the seam below |
| `Music.setEnabled(b)` / `Music.isEnabled()` | The Music toggle in `#sound-overlay` |
| `Music.setVolume(v)` / `Music.getVolume()` | Music level, independent of `masterVolume` |
| `Music.syncMute()` | Called by `toggleMute()` — global mute outranks the music toggle |
| `Music.nowPlaying()` | `{ key, title, artist }` or `null`; for a future credits surface |

**One seam, all games — do NOT add music calls to a plugin.** `showScreen()` calls
`Music.playFor(activeGameId)` on every navigation. Every plugin already sets `activeGameId` before
navigating and `resetToLobby()` clears it before its own `showScreen`, so both directions are
covered. Resolving to the track already playing is a no-op, so moving between screens inside one
game never restarts it.

**Two-tier fallback:** `tracks[activeGameId]`, else `tracks[fallback]` (`'lobby'`). A game with no
track of its own plays the lobby theme rather than falling silent, and **a new game needs no music
work at all** — it inherits the fallback until someone writes it one.

**Adding a track:** drop `data/music/<activeGameId>.mp3` in and add one line to the manifest. That
is the whole procedure — no `sw.js` edit, no `CACHE_NAME` bump, no JS change. Ceiling **~1.5 MB
per track** (128 kbps, 60–120 s loop).

**Two things that are load-bearing and easy to undo:**
- **Tracks are decoded into an `AudioBufferSourceNode` with `loop = true`**, never played through
  `<audio loop>` — the latter inserts an audible gap at the wrap point on every engine.
- **Nothing can start before a user gesture.** Browsers refuse audio until then, so `init()` queues
  the lobby theme and starts it on the first `pointerdown`/`keydown`. A track requested while music
  is off is not started at all (a silent looping source still decodes and mixes — real battery cost
  on a phone).

Every failure path is silent by design: no manifest, no file, a corrupt file or offline-before-first-
fetch all mean "no music", never a thrown error on a game screen.

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

**JS file:** `js/engine-multiplayer.js` — loaded after `engine.js`, before `secret-mode.js`.
**Full reference:** `docs/multiplayer-ui-components.md` | `docs/code-map.md` (Multiplayer Module section)

### Globals

| Variable | Type | Default | Rule |
|----------|------|---------|------|
| `syllyMultiplayerMode` | string | `'single'` | `'single'` / `'host'` / `'client'` — every plugin branches on this |
| `syllySyncLocked` | bool | `false` | True while awaiting Firebase; blocks resubmission |
| `syllyDeviceUid` | string | `null` | Anonymous UID; set by `firebase-init.js` after `signInAnonymously`; memory-only (not localStorage) |
| `syllyFirebase` | object | `null` | Lazy-loaded — null on app boot; loaded when user taps "Host Lobby" or "Join Lobby" |
| `mpLobbyStyle` | string | `'individual'` | `'team'` (TLM — teams share a device) / `'individual'` (MDLM — each player own device); set at mode selection; broadcast in `GAME_START`; reset in `resetToLobby()` |
| `mpPlayersListener` | function\|null | `null` | `onValue` unsubscribe for `/players` node; active during host lobby only; cancelled in `mpStopListeners()` and before GAME_START in `mpConfirmRoster()` |
| `window.mpClientPlayerRef` | Firebase ref\|null | `null` | Reference to client's own `/players/{uid}` node; used for explicit removal on leave/cancel; set in `mpClientJoinRoom()`, cleared in `resetToLobby()` and cancel handler |
| `mpPrivateListener` | function\|null | `null` | `onChildAdded` unsubscribe for this device's own `/private/{uid}` queue node; started via `mpStartPrivateListener()` after room create/join; cleared in `mpStopListeners()` |

**Private channel (Phase 36 — True Network Privacy):**
`mpSendPrivate(targetUid, envelope)` — writes an envelope to `rooms/{code}/private/{targetUid}` in Firebase instead of the public `/events` channel. Used for hand distribution when card content must not be visible to other devices at the network level. First use: FLW (`FLW_HAND`, `FLW_DRAW`, `FLW_PEEK`, `FLW_LEAK`, `FLW_EMERALD_OFFER`). This is a stronger privacy model than the couch-security broadcast-and-render-own pattern (NAT/FRT/BLD/SHP) — appropriate when any game mechanic depends on opponents not knowing a player's hand even if they inspect Firebase.

**Private hands need a private REPAIR packet, not just a private deal.** Any state a game keeps privately per device (a hand, a rack, a secret tile set) has a host-side mirror, and **every** operation that mutates the mirror — deal, draw, **play**, discard, steal — needs its own private packet to that state's owner. The public SYNC cannot carry the repair: the whole point of the model is that the public channel carries *counts*, never contents. Two rules that make this reliable: (1) send the **whole** collection, not a delta, so a dropped packet self-corrects on the next mutation; (2) put the send inside the **single function where cards leave the collection**, never once per applier — a new applier added later then inherits it for free. Reference: `PKO_HAND_SYNC` in `js/games/pko.js`. Detail: `pko-impl-notes` ML-06.

`mpStartPrivateListener()` — attaches `onChildAdded` to `rooms/{code}/private/{syllyDeviceUid}`. Events are ts-filtered (ignores events before join time) and self-origin-filtered (drops own writes that also appear via indexing). Routes all received packets through `mpHandleEnvelope`. Called in both `mpHostCreateRoom()` and `mpClientJoinRoom()` immediately after `mpStartEventListener()`. **Rule:** any game using `mpSendPrivate` for any phase must call `mpStartPrivateListener()` in its `onPassThePhone` — the engine already calls it globally, but if a game adds private-channel phase handling after the fact, verify the listener is active.

**`window.` prefix rule — split declaration types:**
- `window.syllyMultiplayerMode`, `window.syllySyncLocked`, `window.syllyFirebase`, `window.syllyDeviceUid`, `window.mpLobbyStyle`, `window.mpClientPlayerRef`, `window.mpLobbyRoster`, `window.mpLobbyRosterTeamNames`, `window.mpLobbyRosterCaptainNames` — declared with `window.` explicitly at the top of `engine-multiplayer.js`. These ARE on `window` and must be accessed with the `window.` prefix. All game plugin files use `window.syllyMultiplayerMode` etc. — this is correct.
- `mpMyPlayerIdx`, `mpPlayerSlots`, `mpActiveGame`, `mpActiveGameConfig`, `mpActiveRoomCode`, `mpRoomRef`, `mpEventsListener`, `mpRoomListener`, `mpPlayersListener`, `mpPrivateListener`, `mpSyncLockTimer`, `mpJoinListenFrom` — declared with `let` at script top-level. These are NOT on `window`. Always access these directly — never `window.mpMyPlayerIdx`. That returns `undefined` silently. BLD Bug 8 was caused by this. Reference implementations for correct access: NAT.js, DSD.js.

### MP_GAME_CONFIGS Entry Schema

Every game registers one entry in `MP_GAME_CONFIGS` (`engine-multiplayer.js`). The
mode/lobby screens read these fields directly — **a missing display field renders the
literal string `undefined` on `screen-mp-mode`**, and a missing player-count getter
lets the lobby start a game outside its real bounds.

Required fields for every entry (grounded in the `li5` entry, `engine-multiplayer.js`):

| Field | Type | Purpose / failure mode |
|-------|------|------------------------|
| `gameName` | string | Title on the mode/lobby screens — missing → "undefined" |
| `emoji` | string | Icon on the mode/lobby screens |
| `brandBtnClass` | string | `bg-[brand] hover:bg-[brand-dark]` for the primary lobby CTA |
| `ptpLabel` / `lobbyCtaLabel` | string | CTA labels — missing → "undefined" on the button |
| `menuScreen` | string | Screen the game returns to from the lobby |
| `onPassThePhone` | function | Post-lobby entry — populates names + starts the game (host) / shows standby (client) |
| `recommendedMode` | string | `'ptp'` / `'tlm'` / `'mdlm'` |
| `supportedModes` | string[] | The modes offered on `screen-mp-mode`; an MDLM-only game lists `['mdlm']` |
| `multiplayerOnly` | bool | Informational only — enforcement comes from `supportedModes` (see § MDLM Patterns) |
| `ctaTextClass` | string (optional) | Overrides the `screen-mp-mode` CTA's text colour — defaults to `text-white` when omitted. Only needed when `brandBtnClass` is a light fill requiring dark ink — e.g. FRT's `#FFE500`, CJAR's `#D4A017`, both set `ctaTextClass: 'text-stone-800'`. |
| `rosterConfig` | object | `{ type, ... }` — use `type: 'none'` for automatic/random seating |
| `getMaxPlayers` | () => int | Upper bound enforced by the lobby |
| `getMinPlayers` | () => int | Lower bound — **mandatory for any game with a minimum above 2** (role-table games, e.g. BLD min 5). Omitting it let BLD start under-strength. Defaults to the engine minimum when absent. |

**A lobby bound may read NOTHING that a post-lobby screen sets.** `getMaxPlayers`/`getMinPlayers`
are consulted at exactly two moments — `mpRenderHostPlayerList()` while the room fills, and the room
node's `maxPlayers` at create time — both of them *before* any of the game's own screens have been
shown. So a bound reading a game-local setup variable (`ssPlayerCount`, `jecPlayerCount`,
`ygiPlayerCount`, `lttpPlayerCount`, `dsdPlayersPerTeam`) resolves against that variable's
**declared default**, permanently: the Pass-the-Phone screen that moves it is skipped entirely in
Lobby Mode, and the game's own `onPassThePhone` overwrites it from the roster far too late to
matter. All five capped their rooms at 4 while their Pass-the-Phone setup offered 6, with nothing
anywhere explaining why a 5th join bounced. **Return the game's true range as constants.**

The one legitimate input beyond a constant is `window.mpLobbyStyle` (a TLM room is 2 devices where
an MDLM room is N). A **pre-lobby setting** — chosen in the settings overlay on the game menu, so
the host has already made the choice before creating the room — is also fine; FRT's `frtPearOff` is
the only instance. Anything set on a setup or roster screen is not.

**`rosterConfig.requiresBalancedTeams: true`** (optional) — for a team game whose two teams must be
the same size. SS and DSD both derive per-team size from **team A's length alone**
(`ssPlayerCount = ssPlayerNamesA.length`), so a 3v2 silently mis-sizes team B. The flag gates two
things: the host lobby CTA rejects an odd roster, and `mpRosterCheckConfirm` requires `|A| === |B|`
("everyone assigned" previously allowed 3v2 — and, before the min-players fix, 4v0). A game
carrying it must have **even** min and max, or a bound is unreachable.

Run this check when adding a game: every display field present (no "undefined" on the mode screen),
both player-count getters returning the game's real bounds, and those bounds reading nothing but
constants + `window.mpLobbyStyle`. **`node tools/verify-mp-configs.js` asserts all of it** — schema,
bounds sanity, bound purity, agreement with the Pass-the-Phone count pills in `index.html`, and the
quit contract, across all 18 games.

### Envelope Schema

All Firebase messages follow this shape:
```js
{ type: 'ACTION' | 'SYNC' | 'LOBBY', payload: { action: 'EVENT_NAME', ...data }, originId, timestamp }
```
- `ACTION` — Client → Host: player submits; Host processes, responds with SYNC
- `SYNC` — Host → All: resolved state; all devices apply and navigate
- `LOBBY` — session management: `SETTINGS_SYNC`, `GAME_START`, `HOST_END_GAME`, `LOBBY_RESET`

### Sync Lock

`mpLockSync()` — sets `window.syllySyncLocked = true` and adds the `mp-sync-locked` class to
`document.body`. Two layers of protection:
1. **Correctness (universal, class-independent):** while locked, `mpSendEnvelope()` drops every
   `type: 'ACTION'` envelope except the single one authorised by the `mpLockSync()` that opened
   the lock (`mpActionAuthorised`). A double-tap re-enters `mpLockSync()` — a **no-op while
   already locked**, so it does not re-authorise — and the duplicate ACTION is dropped at the
   send choke point. This is what prevents a double-tap from running the host's resolve twice
   (e.g. two `SS_DECODE_SUBMIT` → `ssResolve()` twice). It works whether or not the button
   carries `.btn-mp-action`.
2. **Visual (opt-in per button):** the CSS rule greys and disables all `.btn-mp-action` buttons
   while `mp-sync-locked` is on `document.body`. Apply `btn-mp-action` to every submittable MP
   button for the grey-out feedback — but it is no longer the correctness mechanism. (The four
   MDLM games carry it; the eight Phase-22 games do not yet — cosmetic gap only.)

An 8-second timeout auto-releases to prevent a permanent lock on dropped packets.

**Important:** the correctness layer only blocks ACTIONs sent *while the lock is held*. Fire-and-forget
ACTIONs that intentionally never call `mpLockSync()` (e.g. NAT votes/disputes/guesses, YGI
takes/votes, JEC prep, LTTP messages) see `syllySyncLocked === false` and pass through normally —
do **not** add a blanket "drop all ACTIONs while locked" guard, and do not lock those flows unless
single-submission is actually required.

`mpUnlockSync()` — clears `syllySyncLocked` + `mpActionAuthorised` and removes `mp-sync-locked`.
Called by every SYNC handler after applying state.

### Firebase Lazy-Load

`syllyFirebase` is `null` on app boot. Firebase scripts are loaded only when the user enters
Lobby Mode (taps Host or Join). This keeps the app fully functional offline without Firebase.
If the load times out (4 seconds), `mp-network-error-overlay` is shown.
The Firebase lib files are still listed in the `sw.js` precache — lazy-load refers to *when*
the scripts are injected, not whether they are cached.

### Interceptor Pattern (per-plugin)

Every submittable action in a plugin branches on `syllyMultiplayerMode`:

```js
// In a plugin's submit handler:
if (window.syllyMultiplayerMode !== 'single') {
  if (window.syllyMultiplayerMode === 'client') {
    mpLockSync();
    mpSendEnvelope({ type: 'ACTION', payload: { action: 'GAME_EVENT', ...data } });
    return; // wait for HOST SYNC
  }
  // Host path: run logic locally, then broadcast
  mpSendEnvelope({ type: 'SYNC', payload: { action: 'GAME_EVENT', ...resolvedState } });
}
// Single-device path falls through
```

**Missing handler audit (before shipping):** For every phase in the game's state flow, ask "can a non-host device submit something here?" Every "yes" is a required ACTION handler in `[abbr]HandleEnvelope`. Missing handlers silently drop submissions — they do not error or warn. Run this audit during Stage 2 (tech spec), not during testing. **Cover phases reached AFTER the core MP loop** — voting, tie-breaks, sudden-death, intel/guess phases, endgame resolution. These are the ones repeatedly built pass-the-phone-only and never given packets (SS Intel Phase, YGI Sudden Death, LTTP guess/gameover, NAT voting/Last Stand — four games). A synced *reveal* screen does not make the interactive *resolution* on the same screen synced: check each button on the screen, not just the screen entry. *[Elevated from ss/ygi/lttp/nat-impl-notes — recurring across 4 games.]*

### MDLM Patterns

**Name population from lobby:** In MDLM, `mpPlayerSlots[i].nickname` is already populated when `onPassThePhone` fires for the game. The game's own name-entry setup screen is redundant — skip it by populating the name array directly from `mpPlayerSlots` and calling the game's start function. BLD is the reference implementation. **Field name:** the slot object is `{ uid, nickname }` (built at `engine-multiplayer.js` ~line 624) — read `.nickname`, never `.name` (`.name` returns `undefined` silently). The engine's own `onPassThePhone` populators already use `mpPlayerSlots.map(p => p.nickname)`. Detail: `pass-impl-notes`.

**A readiness gate that reads a per-seat array must be checked in the mode where that array is EMPTY.** `[].every()` is `true`. A gate written for a game with departed-seat tracking (`arr.every((a,i) => !a || readyCheck[i])`) is vacuously open in a mode with no such array — the host resolves on the first tap while later seats never chose. Both forms are wrong in the other mode, so branch: the mode with no departures uses plain `readyCheck.every(Boolean)`. Assert **per mode**, not once. Detail: `cjar-impl-notes` BUG-05.

**Prove the packet contract with a two-device loopback before the real multi-device session — and give it a WIRE and a real DOM.** Every headless harness in this project runs in `'single'` mode: that is what lets one process drive all N seats, and exactly what blinds it to the packets. Standing up a **second `vm` as a client** and routing the host's `mpSendEnvelope` into its `[abbr]HandleEnvelope` costs ~40 lines and catches absent payload fields, host/client divergence, stale-tag rejection, private-channel delivery and the mid-game-quit contract — this class of loopback has found defects that passed 200+ single-mode checks. **Two things it must have, or it will pass while the game is broken:**

- **A wire.** Piping `mpSendEnvelope` *directly* into the handler passes live JS references, so every empty collection survives a trip Firebase would not have let it make. Put a `fbWrite`/`fbRead` pair in between and assert the wire's own behaviour first.
- **A DOM of real mock elements.** `getElementById: () => null` — what the three `'single'`-mode harnesses use — short-circuits every `if (!el) return` guard, so **no render code executes at all**. A render throw inside a SYNC applier is invisible to every one of them, and it escapes through `mpHandleEnvelope` and strands the device.

Reference: `tools/verify-cjar-loopback.js` (87 checks; takes `CJAR_SRC=` so a broken copy can be driven through the same wire, proving the test fails before the fix makes it pass). Still **not** a substitute for the three-device session — no clock skew, no Firebase ordering, no dropped packets, nothing visual — but run it first. Detail: `cjar-impl-notes` ML-01/ML-03.

**Host readyCheck — process the host's own submission directly:** For any phase with a `[abbr]ReadyCheck[]` matrix where all players submit simultaneously, the host must mark its own slot in its local submit function — NOT by sending its own ACTION envelope. `engine-multiplayer.js` drops every envelope where `originId === syllyDeviceUid` (the dedup guard), so a host that submits via `mpSendEnvelope` never has its slot set and `.every(Boolean)` never fires (the round hangs). Pattern: when `syllyMultiplayerMode === 'host'`, set `[abbr]ReadyCheck[mpMyPlayerIdx] = true`, check `.every(Boolean)`, and broadcast the resolving SYNC directly. *[Elevated from jec-impl-notes J1, ygi-impl-notes Y1/Y2.]*

**Generalisation — the dedup guard drops ALL self-sent ACTIONs, not just readyCheck submissions:** the same `originId === syllyDeviceUid` guard means **any** phase where the host is also an active *submitting* participant must use the direct-update-then-broadcast pattern, never a self-sent ACTION. This extends beyond readyCheck matrices to live-adjustment phases (e.g. a host sending a live allocation update to itself). Rule: if the host can submit an ACTION in a phase, branch on `syllyMultiplayerMode === 'host'` and mutate host state + broadcast the resulting SYNC directly; reserve `mpSendEnvelope({type:'ACTION'})` for clients only. Detail: `nt-impl-notes` BUG-05 / TG-05.

**Firebase erases every EMPTY value — so a payload's reset values are exactly the ones that never arrive.** Firebase RTDB stores no `null`, no `{}` and no `[]`: a key holding any of them is **deleted**, and the reader gets `undefined`. An array whose entries are all `null` vanishes whole; a half-dense one comes back as an **object keyed by index**, not an array. `false`, `0` and `''` are legitimate stored values and are never at risk — **only emptiness is erased**. This collides head-on with the accumulator rule below: doing that rule correctly means broadcasting `seen: {}`, `trail: []`, `choices: [null,…]`, `counterTreat: null` — and every one of those is erased in flight. **You need both halves: send the reset value explicitly AND rebuild it on receipt.** Never assign a raw `p.x` collection field. The suite's idiom is `p.x || []` (PKO, FLW, SHP); where seat-length or null-holes matter, use a normaliser that takes the count and a fill and reads `v[i]` — `cjarWireArr`/`cjarWireList`/`cjarWireObj` in `js/games/cjar.js` are the reference. Detail: `cjar-impl-notes` BUG-06.

**Accumulator arrays must be reset *in the SYNC payload*, not just locally:** any state that resets between rounds/sessions — log arrays, tally arrays, history lists, per-round matrices — must be included in the round-start SYNC payload **even when its value is `[]` or all-`false`**. The host resets it locally when it builds the new round; clients never do, so they carry the previous round's values forward until a payload field overwrites them. The symptom is a client showing a stale log or a readyCheck that fires instantly. Rule: when writing a round-start SYNC, list every accumulator the round touches and include each one at its reset value. Detail: `flw-impl-notes` BUG-01.

**Single-source card/board arithmetic:** when a game has any rule-mutating mode (a Sylly Mode that inverts scoring, reverses a chain, or changes what beats what), route **resolution, legality checking, and any simulation/preview** through one shared function rather than duplicating the comparison at each call site — a shared `[abbr]Beats(a, b)`-style predicate makes a mode's inversion a one-line change instead of an edit at every call site. Duplicated comparisons are where mode-mutations silently miss a path. Detail: `shp-impl-notes` Template Gaps.

**Roster type `'none'`:** For games with automatic or random seating, use `rosterConfig.type: 'none'`. The `'individual'` type requires every player (including the host) to be manually assigned in the Assign Spots lobby UI — any player left unassigned produces `reordered[-1]` (a non-standard array property), corrupting the slot array. If the game handles seat labels internally, `'none'` is always safer.

**Multiplayer-only game routing (`multiplayerOnly: true`):** The `multiplayerOnly` field in `MP_GAME_CONFIGS` is **informational only** — no engine code reads it to gate or enforce anything. The actual enforcement comes from `supportedModes` (a game with only `['mdlm']` has no single-device path in `mpShowModeScreen`) and the game's lobby button listener (which calls `mpShowModeScreen` directly, bypassing any single-device setup flow). The lobby-entry button on `screen-lobby` STILL routes to the game menu (`showScreen('screen-[abbr]-menu')`), not directly to `mpShowModeScreen()`. The game menu is always required — it holds Settings and How to Play before the host commits to a session.

The game menu's Play CTA has **dual context** and must branch on `syllyMultiplayerMode`:
```js
document.getElementById('btn-[abbr]-menu-play').addEventListener('click', () => {
  playLaunch();
  if (syllyMultiplayerMode !== 'single') {
    [abbr]StartSession(); // post-lobby: onPassThePhone fired, players ready
  } else {
    mpShowModeScreen('[abbr]'); // pre-lobby: create/join lobby first
  }
});
```
This branching is required because `onPassThePhone` calls the game's menu-show function after lobby setup, so the Play CTA appears in two contexts: once before the lobby exists, and once after it's fully configured. GTH is the reference implementation (Phase 31).

**Firebase callback crash safety:** A crash inside a Firebase `onValue` callback (inside `mpHandleEnvelope`) has a cascade failure mode: the SYNC that would advance all devices is never sent; Firebase may re-deliver buffered events against partially-reset state, triggering spurious double-resolutions. Treat every function called from `mpHandleEnvelope` as safety-critical. Grep to confirm every function called from it exists before shipping.

**Host-gate screens before timed phases:** Any screen that gates entry into a timed gameplay phase (e.g. diagnosis timer, drawing timer) must be host-only in MDLM. The host computes `endTimestamp` at the moment they click through the gate — not at queue-build time earlier in the flow. Clients show a "Waiting for the host…" message with no action button. Pattern: host click → `endTimestamp = Date.now() + window * 1000` → broadcast `SYNC: [ABBR]_PHASE_BEGIN { endTimestamp }` → all devices `startTimer(endTimestamp)` + navigate to gameplay screen. Reference implementation: `GTH_PHASE2_BEGIN` in `js/games/gth.js`.

### `resetToLobby()` Multiplayer Additions

Added to engine.js `resetToLobby()` after all game teardowns:
```js
// Host: notify clients before room deletion so the disconnect overlay appears immediately,
// then tear down the room (syllyTeardownRoom() closes lifecycle, removes the room node,
// and calls mpStopListeners() internally)
if (window.syllyFirebase && window.syllyMultiplayerMode === 'host') {
  try { mpSendEnvelope({ type: 'LOBBY', payload: { action: 'HOST_END_GAME' } }); } catch (_) {}
  syllyTeardownRoom();
}
// Client: explicitly remove own /players entry so the host's roster updates
if (window.syllyFirebase && window.syllyMultiplayerMode === 'client' && window.mpClientPlayerRef) {
  try { window.syllyFirebase.remove(window.mpClientPlayerRef); } catch (_) {}
  window.mpClientPlayerRef = null;
}
window.syllyMultiplayerMode      = 'single';
window.syllySyncLocked           = false;
window.mpLobbyStyle              = 'individual';
window.mpLobbyRoster             = null;
window.mpLobbyRosterTeamNames    = null;
window.mpLobbyRosterCaptainNames = null;
document.body.classList.remove('mp-sync-locked');
// hide all MP overlays
['mp-version-mismatch-overlay','mp-host-disconnected-overlay',
 'mp-lttp-message-interrupt-overlay','mp-network-error-overlay',
 'mp-host-prelobby-overlay'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
});
// Theming reset — slider back to neutral stone, mute toggle to neutral if ON
updateSliderTheme(null);
if (isMuted) document.getElementById('global-mute-toggle').className = getMuteToggleOnClass(null);
```

### Play-Again Return Pattern (`mpReturnToLobby`)

**Rule:** Every game's play-again confirm handler MUST call `mpReturnToLobby()` instead of navigating to setup or game menu when `syllyMultiplayerMode !== 'single'`.

```js
// Pattern: in every game's play-again confirm listener
if (window.syllyMultiplayerMode !== 'single') {
  mpReturnToLobby();
  return;
}
// single-device path unchanged
```

**Behaviour:**
- **Host:** broadcasts `LOBBY_RESET` envelope → all clients navigate to `screen-mp-lobby-join` in a "waiting" state (code pre-filled, CTA disabled) → host navigates to `screen-mp-lobby-host` with same room code → `mpStartPlayersWatcher()` re-subscribed
- **Client:** calls `resetToLobby()` directly (they leave the session)

**Confirm button label** on the play-again overlay should update dynamically when the overlay is opened:
- Host: `'Restart in Lobby 🔄'`
- Client: `'Leave Session'`
- Single: original thematic label (e.g. `'New Expedition 🦁'`)

### Mid-Game Quit Contract

**Applies to EVERY lobby session — MDLM *and* TLM.** This was written MDLM-only until 23 Aug 2026,
and that wording is exactly what let LI5 and DSD (both TLM) ship without it: neither reads as an
"MDLM game", so the rule looked like someone else's problem. The failure is identical in both. The
mode label never mattered — only that a Firebase room exists and another device is waiting on it.

**The contract:** one device leaving mid-game dissolves the session for everyone.
- **Host quits:** `resetToLobby()` broadcasts `HOST_END_GAME` (standard engine behaviour), tears
  down the Firebase room, and returns to the lobby. All clients get the disconnect overlay.
- **Client quits:** tell the host *before* tearing down locally. The host then calls
  `resetToLobby()`, which broadcasts `HOST_END_GAME` to everyone else.

**Why it cannot be skipped:** `resetToLobby()` alone only tears down the quitting device. The host
has no `/players` listener mid-game, so without the notification the leaver keeps its Firebase slot
and every other device waits on a turn that never comes. It is invisible in single-device play and
invisible to every `'single'`-mode harness — which is why eight games shipped without it.

**How to satisfy it — call the engine helper.** `mpNotifyPlayerLeft()` (`engine-multiplayer.js`)
sends the generic `MP_PLAYER_LEFT` ACTION when this device is a client, and is a no-op otherwise.
`mpHandleEnvelope` handles it generically **before any per-game routing**, so a game needs no
handler of its own. One line in the quit-confirm handler:

```js
document.getElementById('btn-[abbr]-quit-confirm').addEventListener('click', () => {
  playExit();
  document.getElementById('[abbr]-quit-overlay').style.display = 'none';
  if (window.syllyMultiplayerMode !== 'single') { mpNotifyPlayerLeft(); resetToLobby(); return; }
  [abbr]ResetToMenu();   // single-device path unchanged
});
```

**Never navigate to the game menu in a lobby session.** `showScreen('screen-[abbr]-menu')`,
`[abbr]ResetForNewGame()` and friends leave the room intact — that was the whole bug in all eight.
`resetToLobby()` is the only correct destination.

**The ten games that predate the helper** (PASS, GTH, DYB, BLD, NT, FRT, SHP, FLW, PKO, CJAR) each
ship an identical per-game `[ABBR]_PLAYER_LEFT` packet plus a handler that does nothing
game-specific. Those still work and are not being swept — but that ten-fold duplication is why the
generic path now exists. **New work uses `mpNotifyPlayerLeft()`**; don't add an eleventh per-game
packet.

**Enforced:** `node tools/verify-mp-configs.js` § 6 asserts all 18 games satisfy this one way or the
other. A new game that forgets it fails that check.

### localStorage Exception

`sylly_nickname` is stored in `localStorage` via `mpGetNickname()` / `mpSaveNickname(v)`. This
is the **only** permitted localStorage use beyond `isMuted` and `masterVolume` — it is a user
preference (not game state) that survives across sessions.

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
`nt.js` `ntStopPlayback()` clears `ntRafHandle`. *[Elevated from nt-impl-notes TG-01.]*

---

## PWA Guardian
**Trigger:** Any new feature that fetches data, loads assets, or changes app state.

Before implementing, answer:
1. Will this work offline? If not, how do we cache it?
2. Does `sw.js` need updating to pre-cache new files?
3. Are we using any APIs that require network (and gracefully fail if unavailable)?
4. **What does this add to the install?** Any precached binary asset (art, audio) needs a
   per-file ceiling agreed *before* it is generated, not after. PKO's card art arrived as 17
   PNGs totalling **26 MB** — a precache that size makes the app effectively uninstallable on
   mobile data. Converted to 360 px JPEGs at a 40 KB/card ceiling it is 682 KB. Set the ceiling
   at spec time and state it in the tech spec. Detail: `pko-impl-notes` TG-02.

**SW versioning:** `CACHE_NAME = 'sylly-games-vN'` — bump N on **every deploy**.

**Current SW version:** see `CLAUDE.md` § Current Focus — **the live pointer, and the only place it is written.** This line used to carry a copy (it read v205 while the app shipped v209 for four bumps); a number duplicated in an auto-loaded rule file drifts silently, so it is deliberately not repeated here.

**A per-file art ceiling is only meaningful next to the element's RENDER size.** The suite's 40 KB/card figure was set for small cards — PKO's renders at `4.25rem`, so 360 px art is 5.3× its CSS width. CJAR's hero is `15rem` (240 CSS px) and its masters are **square** against a portrait card, so `cover` discards ~27% horizontally and the same 360 px is only ~1.1× effective. Measure the quality the cap forces at several widths rather than inheriting an earlier game's number, and check master **aspect** against card aspect — square masters waste a fixed fraction of every byte. Detail: `cjar-impl-notes` TG-02b.

**Precached assets:** the authoritative list is `PRECACHE_URLS[]` in `sw.js` — read it there, never from a copy.
Adding a file to the app means adding it to that array AND bumping `CACHE_NAME`.

Note: the four Firebase lib files ARE precached (so Lobby Mode works offline-first once installed) but are still lazy-loaded at runtime — they are not in the `index.html` `<script>` load order. See Firebase Lazy-Load below.

**Core art — precached (`data/art/`):** A game's *default* artwork lives in
`data/art/<kind>/` using the **same manifest format** as a skin pack, but with the opposite caching
contract: it **is** listed in `PRECACHE_URLS` (manifest + every image) and changing it **does** need
an SW version bump, because default art is part of the app version. It is never listed in
`data/packs/registry.json` and never appears in the Terminal. Resolution is three-tier in
`js/lib/art.js` — active skin → core art → emoji fallback — so `assetFace`/`assetBack` call sites
did not change. `assetExtra(kind, key)` covers non-card game art (reference diagrams). Games adopt
it one at a time — current rollout status, the 4 conversion steps and per-game gotchas are in
`docs/expansion-guide.md` § Core art packs (also see `CLAUDE.md` § Current Focus for the live
list), and `tools/convert-core-art.ps1` is the converter. Converting a game needs **no JS
edit** — its seam already calls `assetFace`/`assetBack`. **A conversion is not done until `sw.js`
carries the manifest AND every image in `PRECACHE_URLS` and `CACHE_NAME` is bumped** — that step is
the whole difference from a skin pack, and missing it means the art is simply absent on a cold
offline install.

**Music — runtime-cached, NOT precached (28 Aug 2026):** `data/music/` follows the same split as
`data/packs/` and for a sharper version of the same reason: **manifest network-first** (a new track
is discovered without a version bump), **audio cache-first** (fetched once, then free). An mp3 is an
order of magnitude heavier than a skin image, so precaching would put every track in the install and
make each new one a version bump. `js/lib/music.js` itself **is** precached — the code is part of the
app version; the tracks are not. Ceiling ~1.5 MB per track.

**Cartridge packs — runtime-cached, NOT precached (Phase A, June 2026):** Everything under
`data/packs/` (the `registry.json`, each `<id>/pack.json`, and any asset images) is deliberately
absent from `PRECACHE_URLS`. The `sw.js` fetch handler serves it with a split strategy:
**`.json` config is network-first** (so a newly-added pack is discovered on the next online terminal
open with no version bump), **images are cache-first** (instant + lean). This is what lets a word/
asset pack be added or removed by dropping a folder + editing `data/packs/registry.json` — no `sw.js`
edit, no SW version bump. The legacy `data/secret*_words.json` files were migrated into
`data/packs/<id>/pack.json` manifests (inline `words`) and deleted. See `docs/expansion-guide.md`.

---

## Checklist: Adding a New Game
**Moved — read `docs/rules/new-game-checklist.md` (on-demand) before writing a new game’s first line of code.**
Every item there is binding: engine registration, settings/overlay standards, MP handler audit, the render seam,
the verification harness, and the closure steps. Do not start a new game without it.
