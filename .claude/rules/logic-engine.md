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

**Current SW version:** v80

**Precached assets (relative paths — no leading `/`):**
```
./, index.html, css/styles.css,
js/engine.js, js/games/li5.js, js/games/great-minds.js,
js/games/secret-signals.js, js/games/jec.js, js/games/ygi.js,
js/games/lttp.js, js/games/nat.js, js/games/dsd.js, js/secret-mode.js, js/app.js,
js/lib/tailwind-play.js, data/words.json, data/secret_words.json, data/secret2_words.json, data/secret3_words.json, data/ygi-data.json, manifest.json
```

---

## Checklist: Adding a New Game
- [ ] Create `js/games/[game-name].js`
- [ ] Add `<script>` tag to `index.html` (after `engine.js`, before `app.js`)
- [ ] Add all screen IDs to `allScreens[]` in `engine.js`
- [ ] Add all overlay HTML to `index.html` **before** the `<script>` tags
- [ ] Add `.btn-open-sound` + ✕ to every screen (see `@ui-style.md`)
- [ ] Set `activeGameId = '[game-name]'` in lobby button listener
- [ ] Add game teardown to `resetToLobby()` in `engine.js`
- [ ] Wire lobby button → game menu screen (not directly into setup)
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
