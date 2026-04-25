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

Global audio state: `isMuted` (bool), `masterVolume` (0–1), `audioCtx` (Web Audio context).

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

**Current SW version:** v60

**Precached assets (relative paths — no leading `/`):**
```
./, index.html, css/styles.css,
js/engine.js, js/games/li5.js, js/games/great-minds.js,
js/games/secret-signals.js, js/games/jec.js, js/secret-mode.js, js/app.js,
js/lib/tailwind-play.js, data/words.json, data/secret_words.json, manifest.json
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
- [ ] Settings: game options first, ✨ Sylly Mode last; pill buttons for discrete choices
- [ ] Overlays: data overlay (slide-up) or decision modal — no third pattern
- [ ] Add precache entries to `sw.js` and bump SW version
- [ ] Add `applyExpansionOverrides()` read at the plugin's settings-apply point — reads `window.activeExpansionOverrides` if `isSecretMode` is true; see `js/secret-mode.js` for the established pattern (required from Secret Mode onwards; retrofit existing games during Secret Mode build)
- [ ] In Secret Mode, substitute `secretWords` (or the appropriate category subset) for `allWords` in the word pool. Default pattern: `if (isSecretMode && secretWords && secretWords.length) { const sub = secretWords.filter(w => w.category === 'food').map(w => w.word); pool = shuffle(sub.length ? sub : secretWords.map(w => w.word)); }` — apply in both `startGame()` and the pool-refill path in `startRound()`
- [ ] Settings and how-to overlays: add thematic title block as first child of `overlay-data-inner`; call `scrollTop = 0` on open (see `@ui-style.md` Settings Layout Standard)
- [ ] Quit overlay: game-voiced emoji + heading + subtext + themed confirm + neutral cancel (see `@ui-style.md` Quit Overlay Checklist)
- [ ] Exit routing: mid-game ✕ → quit overlay → game menu screen; post-game ✕ → `resetToLobby()`; never call `resetToLobby()` from quit confirm
- [ ] Vocab Lock (if game uses word validation in Secret Mode): use `window.activeExpansionData.vocab.has(normaliseWord(input))`; wire a "VIEW WORD LIST" button to `smOpenVocabOverlay()` (see `@ui-style.md` Vocab Lock Reuse Pattern)
- [ ] Add section header comment block to `index.html` (see existing `<!-- ════ GAME NAME ════ -->` pattern) and update `docs/code-map.md`
