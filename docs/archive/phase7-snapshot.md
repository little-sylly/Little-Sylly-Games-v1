# Phase 7 Architecture Snapshot — Little Sylly Games
**Date:** April 2026 | **SW Version:** v40

---

## 1. File Structure

```
js/engine.js          — Global engine (audio, navigation, reset, sound overlay)
js/games/dstw.js      — DSTW plugin (all state, logic, listeners)
js/games/great-minds.js — Great Minds plugin (all state, logic, listeners)
js/app.js             — Bootstrapper (3 lines, no logic)
js/lib/tailwind-play.js — Local Tailwind (offline)
```

**Load order in `index.html`:**
```html
<script src="/js/engine.js"></script>
<script src="/js/games/dstw.js"></script>
<script src="/js/games/great-minds.js"></script>
<script src="/js/app.js"></script>
```

All variables are global. Plugins forward-reference engine globals (`showScreen`, `play*`, `resetToLobby`, `activeGameId`). This works because listeners register at parse time but fire at runtime.

---

## 2. Engine Responsibilities (`js/engine.js`)

### Screen Routing
```js
const allScreens = [
  'screen-lobby', 'screen-menu', 'screen-setup',
  'screen-gatekeeper', 'screen-active-play', 'screen-gameover',
  'screen-gm-menu', 'screen-gm-setup', 'screen-gm-input', 'screen-gm-pass-gate',
  'screen-gm-reveal-gate', 'screen-gm-reveal', 'screen-gm-result',
];

function showScreen(id) { /* hides all, shows target with fadeIn animation */ }
```
**Rule:** Every new screen ID must be added to `allScreens[]`.

### Audio
All synthesised via Web Audio API. Functions:
- `playSuccess()` — correct / match
- `playBoing()` — wrong / taboo
- `playLaunch()` — big CTAs
- `playExit()` — destructive confirms
- `playPillClick()` — settings toggles
- `playDone()` — close/confirm overlays
- `playTick()` — countdown
- `playSliderTick(value)` — volume slider feedback (bypasses mute)
- `playSyllyOn/Off()`, `playWhoosh()`, `playResume()`

Global state: `isMuted` (localStorage), `masterVolume` (localStorage), `audioCtx`.

### Global Sound Overlay
```html
<div id="sound-overlay">          <!-- z-[110] — above all overlays -->
  <button id="global-mute-toggle">
  <div id="global-volume-group">
    <input id="global-sound-volume">
  </div>
  <button id="btn-sound-overlay-done">
</div>
```
Triggered by `.btn-open-sound` buttons (class-based, not ID). `toggleMute()` syncs:
1. `#btn-mute` — active play header
2. `#global-mute-toggle` — overlay
3. All `.btn-open-sound` icons

**Active play exception:** `#btn-mute` is instant toggle, no overlay.

### Reset Functions
```js
resetToLobby()  // Cold boot: stops timer, hides all overlays, zeroes both games, → lobby
resetToMenu()   // DSTW in-game exit: stops timer, hides DSTW overlays, → screen-menu
```

---

## 3. Global UI Pattern (every screen)

```
┌─────────────────────────────────┐
│                         🔊  ✕  │  ← absolute top-4 right-4 (or inline header)
│                                 │
│         [screen content]        │
│                                 │
└─────────────────────────────────┘
```

- **Speaker** (`.btn-open-sound`): opens `#sound-overlay`
- **Exit** (✕): destination depends on context:
  - Pre-game setup → game's own menu screen
  - Mid-game → quit confirmation overlay
  - Post-game → `resetToLobby()`
- **Active play**: existing `#btn-mute` header button stays as instant toggle

Screens with absolute-positioned buttons use `relative` on their `<section>`/`<main>`.
Screens with inline header rows (GM setup, GM input, GM result) use a flex wrapper.

---

## 4. Settings Layout Standard

Every game settings overlay:
```
1. Game-specific options  (top)
   — Pill buttons for discrete choices (data-* + .pill / .pill-active-purple)
   — No sliders for multi-choice settings
2. ✨ Sylly Mode           (bottom — always last)
```

---

## 5. DSTW Plugin State (`js/games/dstw.js`)

Key state variables:
```js
teamScores[]       // [team1pts, team2pts]
teamNames[]        // [name1, name2]
currentTeam        // 0 or 1
roundLog[]         // [{team, word, outcome, scoreChange}]
matchLog[]         // full game history for review overlay
currentWordData    // active word object from allWords[]
timerHandle        // setInterval reference
regularIdx, syllyIdx  // word pool pointers
```

Settings (persist in memory, reset on page reload):
```js
settingTimer       // 30 | 60 | 90
settingRounds      // 3 | 5 | 10
settingTabooCount  // 5 | 10
settingPenaltyMode // 'points' | 'time'
settingSkipCost    // 'free' | 'penalised'
settingCorrections // true | false (review edits)
settingSylly       // true | false
settingSyllyPct    // 30–100
settingCategories  // Set of active categories
```

---

## 6. Great Minds Plugin State (`js/games/great-minds.js`)

```js
GM_CATEGORIES  // 10 curated categories (no pop_culture/brands/aussie_slang)

gmPlayerNames  // ['Player 1', 'Player 2'] — persists between games
gmCurrentPair  // [wordA, wordB] — starting pair, then player words cascade
gmWordA, gmWordB   // current round guesses
gmRound        // round counter
gmActivePlayer // 0 or 1
gmCountdownTimer   // setInterval reference (must clearInterval on exit)
gmRoundLog     // [{round, pair, guessA, guessB}] — mismatch history
```

Settings:
```js
gmSettingDifficulty  // 1 (off) | 2 (Wild) | 3 (Wilder)
gmSyllyMode          // false | true — toggles intensity visibility
gmCustomWords        // false | true — enables pool A/B selection
gmPoolA, gmPoolB     // Set of category strings (defaults to all GM_CATEGORIES)
gmEditingPool        // 'a' | 'b' — which pool the deck panel is editing
```

### Round Loop
```
gmShowPairReveal() ─► pair picked via gmPickStarterPair()
         │
         ▼
gmStartInputPhase() ─► gmShowPlayerInput() [player 0]
         │                     │
         │              gmLockIn() ─► screen-gm-pass-gate
         │                     │
         │              gmShowPlayerInput() [player 1]
         │                     │
         │              gmLockIn() ─► screen-gm-reveal-gate
         │                     │
         │              gmStartCountdown() ─► 3…2…1…
         │                     │
         ▼              gmShowResult()
   match? ────YES────► gmRenderVictory() → screen-gm-result (match)
         │
        NO
         │
         ▼
   gmCurrentPair = [gmWordA, gmWordB]  ← player words cascade
   screen-gm-result (no-match) → Next Round → gmStartInputPhase()
```

### Special Mechanics
- **Cheap Move Guard** (`gmIsCheapMove`): blocks inputs that contain or are contained by either pair word
- **Social Override** (`btn-gm-override`): "Fair dinkum?" overlay → `gmTriggerVictory()` with random override phrase
- **Journey Log** (`gmRenderVictory`): renders `gmRoundLog[]` as HTML on victory screen
- **Name Persistence**: `gmPlayerNames` never reset; pre-populates inputs (blank if still default)
- **Word pool fallback** (`gmBuildPool`): exact diff → diff 1 → full GM pool

---

## 7. Overlay Z-Index Stack

```
z-[50]   — #settings-overlay (DSTW settings)
z-[60]   — #deck-panel, #gm-deck-panel
z-[80]   — #quit-overlay, #skip-turn-overlay, #gm-settings-overlay, #gm-quit-overlay
z-[90]   — #review-overlay, #history-overlay, #how-to-overlay, #gm-how-to-overlay
           #gm-override-overlay
z-[100]  — #gm-deck-panel (deck selector)
z-[110]  — #sound-overlay (global — always on top)
```

---

## 8. Service Worker

`sw.js` — cache-first strategy, all assets local.
Bump `CACHE_NAME = 'sylly-games-vN'` on **every deploy**.
Current: **v40**

Precached assets:
```
/, /index.html, /css/styles.css,
/js/engine.js, /js/games/dstw.js, /js/games/great-minds.js, /js/app.js,
/js/lib/tailwind-play.js, /data/words.json, /manifest.json
```

---

## 9. Checklist for Adding a New Game

- [ ] Create `js/games/[game-name].js`
- [ ] Add `<script>` tag to `index.html` (after `engine.js`, before `app.js`)
- [ ] Add all screen IDs to `allScreens[]` in `engine.js`
- [ ] Add screen HTML to `index.html` with `.btn-open-sound` + ✕ on every screen
- [ ] Set `activeGameId = '[game-name]'` in lobby button listener
- [ ] Add game teardown to `resetToLobby()` in `engine.js`
- [ ] Wire lobby button → game menu screen (not directly into setup)
- [ ] Add game menu screen with: Let's Play!, How to Play, Settings, ← Back to the Box
- [ ] Settings: game-specific options first, ✨ Sylly Mode last
- [ ] Add precache entries to `sw.js` and bump SW version
