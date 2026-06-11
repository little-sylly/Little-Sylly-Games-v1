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

## Screen Routing
- `showScreen(id)` hides ALL `allScreens[]` entries, then shows target with CSS fadeIn
- **Rule:** Every new screen ID must be added to `allScreens[]` in `engine.js`
- Adding a screen without registering it leaves a ghost screen that never hides

---

## Audio Function Catalogue
All audio is synthesised via Web Audio API — no audio files.

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

Global audio state: `isMuted` (bool), `masterVolume` (0–1), `audioCtx` (Web Audio context).

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

**`window.` prefix rule — split declaration types:**
- `window.syllyMultiplayerMode`, `window.syllySyncLocked`, `window.syllyFirebase`, `window.syllyDeviceUid`, `window.mpLobbyStyle`, `window.mpClientPlayerRef`, `window.mpLobbyRoster`, `window.mpLobbyRosterTeamNames`, `window.mpLobbyRosterCaptainNames` — declared with `window.` explicitly at the top of `engine-multiplayer.js`. These ARE on `window` and must be accessed with the `window.` prefix. All game plugin files use `window.syllyMultiplayerMode` etc. — this is correct.
- `mpMyPlayerIdx`, `mpPlayerSlots`, `mpActiveGame`, `mpActiveGameConfig`, `mpActiveRoomCode`, `mpRoomRef`, `mpEventsListener`, `mpRoomListener`, `mpPlayersListener`, `mpSyncLockTimer`, `mpJoinListenFrom` — declared with `let` at script top-level. These are NOT on `window`. Always access these directly — never `window.mpMyPlayerIdx`. That returns `undefined` silently. BLD Bug 8 was caused by this. Reference implementations for correct access: NAT.js, DSD.js.

### Envelope Schema

All Firebase messages follow this shape:
```js
{ type: 'ACTION' | 'SYNC' | 'LOBBY', payload: { action: 'EVENT_NAME', ...data }, originId, timestamp }
```
- `ACTION` — Client → Host: player submits; Host processes, responds with SYNC
- `SYNC` — Host → All: resolved state; all devices apply and navigate
- `LOBBY` — session management: `SETTINGS_SYNC`, `GAME_START`, `HOST_END_GAME`, `LOBBY_RESET`

### Sync Lock

`mpLockSync()` — adds `mp-sync-locked` class to `document.body`. CSS rule greys and disables all
`.btn-mp-action` buttons across every screen. An 8-second timeout auto-releases to prevent
permanent lock on dropped packets.

`mpUnlockSync()` — removes `mp-sync-locked`. Called by every SYNC handler after applying state.

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

**Missing handler audit (before shipping):** For every phase in the game's state flow, ask "can a non-host device submit something here?" Every "yes" is a required ACTION handler in `[abbr]HandleEnvelope`. Missing handlers silently drop submissions — they do not error or warn. Run this audit during Stage 2 (tech spec), not during testing.

### MDLM Patterns

**Name population from lobby:** In MDLM, `mpPlayerSlots[i].name` is already populated when `onPassThePhone` fires for the game. The game's own name-entry setup screen is redundant — skip it by populating the name array directly from `mpPlayerSlots` and calling the game's start function. BLD is the reference implementation.

**Roster type `'none'`:** For games with automatic or random seating, use `rosterConfig.type: 'none'`. The `'individual'` type requires every player (including the host) to be manually assigned in the Assign Spots lobby UI — any player left unassigned produces `reordered[-1]` (a non-standard array property), corrupting the slot array. If the game handles seat labels internally, `'none'` is always safer.

**Multiplayer-only game routing (`multiplayerOnly: true`):** The lobby-entry button on `screen-lobby` STILL routes to the game menu (`showScreen('screen-[abbr]-menu')`), not directly to `mpShowModeScreen()`. The game menu is always required — it holds Settings and How to Play before the host commits to a session.

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

### Applies to (as of Phase 20)
- DSD: `dsd-new-op-overlay` (New Operation?)
- NAT: `nat-new-expedition-overlay` (New Expedition?)
- All future games: required from day one

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

## PWA Guardian
**Trigger:** Any new feature that fetches data, loads assets, or changes app state.

Before implementing, answer:
1. Will this work offline? If not, how do we cache it?
2. Does `sw.js` need updating to pre-cache new files?
3. Are we using any APIs that require network (and gracefully fail if unavailable)?

**SW versioning:** `CACHE_NAME = 'sylly-games-vN'` — bump N on **every deploy**.

**Current SW version:** v101

**Precached assets (relative paths — no leading `/`; matches `sw.js` `PRECACHE_URLS[]`):**
```
./, index.html, css/styles.css,
js/engine.js,
js/games/li5.js, js/games/great-minds.js, js/games/secret-signals.js,
js/games/jec.js, js/games/ygi.js, js/games/lttp.js, js/games/nat.js,
js/games/dsd.js, js/games/bld.js, js/games/gth.js, js/games/dyb.js, js/games/pass.js,
js/lib/cards.js,
data/ygi-data.json, data/gth-data.json,
js/secret-mode.js, js/app.js,
js/lib/tailwind-play.js, js/lib/canvas-draw.js,
data/words.json, data/secret_words.json, data/secret2_words.json, data/secret3_words.json,
manifest.json,
js/engine-multiplayer.js,
js/lib/firebase-app.js, js/lib/firebase-database.js, js/lib/firebase-auth.js, js/lib/firebase-init.js
```

Note: the four Firebase lib files ARE precached (so Lobby Mode works offline-first once installed) but are still lazy-loaded at runtime — they are not in the `index.html` `<script>` load order. See Firebase Lazy-Load below.

---

## Checklist: Adding a New Game
- [ ] Create `js/games/[game-name].js`
- [ ] Add `<script>` tag to `index.html` (after `engine.js`, before `app.js`)
- [ ] Add all screen IDs to `allScreens[]` in `engine.js`
- [ ] Add all overlay HTML to `index.html` **before** the `<script>` tags
- [ ] Add `.btn-open-sound` + ✕ to every screen (see `@ui-style.md`)
- [ ] Wire lobby button → game menu screen (not directly into setup) — exact pattern: `playLaunch(); activeGameId = '[abbr]'; showScreen('screen-[abbr]-menu');`. `playLaunch()` is mandatory — omitting it silently removes the entry sound. Do NOT call `updateSliderTheme()` here; `openSoundOverlay()` handles that automatically.
- [ ] Add game teardown to `resetToLobby()` in `engine.js`
- [ ] Add game menu: Let's Play!, How to Play, Settings, ← Back to the Box (see `@ui-style.md` Universal Menu Standard)
- [ ] Settings: game options first, ✨ Sylly Mode last; every setting in a white card (see `@ui-style.md` Settings Card Standard)
- [ ] Settings: include a **difficulty setting** (themed name, plain-English description) — controls word difficulty tier (d1 / d1+d2 / d3); position it early, before timer/rounds
- [ ] Overlays: data overlay (slide-up) or decision modal — no third pattern
- [ ] Add precache entries to `sw.js` and bump SW version
- [ ] Add `applyExpansionOverrides()` read at the plugin's settings-apply point — reads `window.activeExpansionOverrides` if `isSecretMode` is true; see `js/secret-mode.js` for the established pattern (required from Secret Mode onwards; retrofit existing games during Secret Mode build)
- [ ] In Secret Mode, substitute `secretWords` (or the appropriate category subset) for `allWords` in the word pool. Default pattern: `if (isSecretMode && secretWords && secretWords.length) { const sub = secretWords.filter(w => w.category === 'food').map(w => w.word); pool = shuffle(sub.length ? sub : secretWords.map(w => w.word)); }` — apply in both `startGame()` and the pool-refill path in `startRound()`
- [ ] Settings and how-to overlays: add thematic title block as first child of `overlay-data-inner`; call `scrollTop = 0` on open (see `@ui-style.md` Settings Layout Standard)
- [ ] Quit overlay: game-voiced emoji + heading + subtext + themed confirm + neutral cancel (see `@ui-style.md` Quit Overlay Checklist)
- [ ] Exit routing: mid-game ✕ → quit overlay → game menu screen; post-game ✕ → `resetToLobby()`; never call `resetToLobby()` from quit confirm
- [ ] Vocab Lock (if game uses word validation in Secret Mode): use `window.activeExpansionData.vocab.has(normaliseWord(input))`; wire a "VIEW WORD LIST" button to `smOpenVocabOverlay()` (see `@ui-style.md` Vocab Lock Reuse Pattern)
- [ ] Add section header comment block to `index.html` (see existing `<!-- ════ GAME NAME ════ -->` pattern) and update `docs/code-map.md`
- [ ] **Team games — setup screens:** Screen 1 = team names only (per-input labels + "Leave blank to use X & Y" hint + themed placeholders, no size pills); screen 2 = team size pills first then player inputs — see `@ui-style.md` § Team Setup Screen Standard
- [ ] **Multiplayer:** Add game entry to `MP_GAME_CONFIGS` in `engine-multiplayer.js`; add per-game interceptor branches (ACTION/SYNC) to `mpHandleEnvelope`; add per-game SETTINGS_SYNC serialiser entry to `mpSerialiseSettings`; add packet types to `docs/code-map.md` (Multiplayer Module → Per-Game ACTION/SYNC Packet Types table); add multiplayer subsection to `game-identities.md`
- [ ] **`[?]` how-to button:** Add `#btn-[abbr]-how-to` to every main gameplay screen header — always visible (no `hidden` class), wired to `[abbr]-how-to-overlay` (see `@ui-style.md` § Help icon `[?]`)
- [ ] **Decision modal borders:** All `overlay-modal-inner` divs include `border border-[brand]-300` from day one (see `@ui-style.md` § Two-Pattern Overlay Library)
- [ ] **Shared tip overlay (if applicable):** For games with 3+ contextual `[?]` tip points, implement a single `[abbr]-tip-overlay` (Decision Modal, z-[90]) + `[abbr]ShowTip(emoji, heading, lines[])` rather than per-tip overlays (see `@ui-style.md` § Contextual Tip Icons)
- [ ] **Screen layout pattern — decide per screen at spec time:** `h-screen overflow-hidden` = sticky-footer CTA screens only (the button must stay visible regardless of content). All other screens: `min-h-screen overflow-y-auto flex items-center justify-center` (NAT pattern) — content centres when short, scrolls when tall. Never guess during implementation. See `@ui-style.md` § Centered Content Layout (Default) and § Gameplay Screen Layout — Header / Body / Footer.
- [ ] **MDLM — missing handler audit:** Before shipping multiplayer, walk every screen phase and ask "can a non-host device submit something here?" Every "yes" is a required ACTION handler in `[abbr]HandleEnvelope`. Missing handlers silently drop submissions — they do not error. Log the full ACTION packet table in the tech spec §11 before implementation.
- [ ] **MDLM — name population:** `mpPlayerSlots[i].name` is already populated when `onPassThePhone` fires. Skip the game's own name-entry setup screen for MDLM; populate the name array from `mpPlayerSlots` and call the start function directly. BLD is the reference implementation.
- [ ] **Canvas drawing (if applicable):** If the game uses freehand drawing, reference `js/lib/canvas-draw.js` (`window.CanvasDraw` global). Call `CanvasDraw.init(canvasEl)` on screen show. Tremor/jiggle effects apply to the wrapper `<div>` — never to the `<canvas>` element itself (canvas coordinate system must be unaffected). GTH is the reference implementation.
