# Phase 12 Architecture Snapshot — Little Sylly Games
**Phase:** Hard Branding + UI Consistency Pass | **Date:** April 2026 | **SW Version:** v60

This is the current gold master. Phase 11 snapshot archived at `docs/phase11-snapshot.md`.

---

## 1. File Structure

```
js/engine.js                — Global engine (audio, navigation, reset, normaliseWord, sound overlay)
js/games/li5.js             — LI5 plugin (Like I'm Five — all state, logic, listeners)
js/games/great-minds.js     — Great Minds plugin (all state, logic, listeners)
js/games/secret-signals.js  — Secret Signals plugin (all state, logic, listeners)
js/games/jec.js             — Just Enough Cooks plugin (all state, logic, listeners)
js/secret-mode.js           — Secret Mode: Konami gateway, Terminal, expansion proxy state
js/app.js                   — Bootstrapper (3 lines, no logic)
js/lib/tailwind-play.js     — Local Tailwind (offline)
css/styles.css              — Custom styles + overlay library classes
data/words.json             — ~358 words, 16 categories
data/secret_words.json      — Dota 2 expansion, 35 words, 5 categories
docs/code-map.md            — Surgical ID reference: all screens, overlays, buttons, functions per game
docs/phase12-snapshot.md    — This file (current gold master)
docs/phase11-snapshot.md    — Archived (Phase 11 architecture)
docs/phase10-snapshot.md    — Archived (Phase 10 architecture)
docs/phase7-snapshot.md     — Archived (Phase 7 architecture)
docs/expansion-guide.md     — Template + checklist for adding new expansion packs
docs/secret-mode-plan.md    — Secret Mode vision + implementation (complete)
```

**Load order in `index.html`:**
```html
<script src="js/engine.js"></script>
<script src="js/games/li5.js"></script>
<script src="js/games/great-minds.js"></script>
<script src="js/games/secret-signals.js"></script>
<script src="js/games/jec.js"></script>
<script src="js/secret-mode.js"></script>
<script src="js/app.js"></script>
```

All variables are global (no ES modules). Scripts load at bottom of `<body>` — all DOM elements are available at parse time. **CRITICAL:** Any `document.getElementById()` call at top-level must reference an element that appears in HTML *before* the `<script>` tags.

Asset paths use **relative paths** (no leading `/`). GH Pages deploys to a subdirectory — absolute paths 404 silently.

---

## 2. Engine Responsibilities (`js/engine.js`)

### Screen Routing
```js
const allScreens = [ /* all screen IDs across all games */ ];
function showScreen(id) { /* hides all, shows target with fadeIn */ }
```
**Rule:** Every new screen ID must be added to `allScreens[]`. Adding a screen without registering it leaves a ghost screen that never hides.

### Audio
Synthesised via Web Audio API. No audio files.
- `playSuccess()` — correct / match
- `playBoing()` — wrong / taboo
- `playLaunch()` — big CTAs
- `playExit()` — destructive confirms
- `playPillClick()` — settings toggles
- `playDone()` — close/confirm overlays
- `playTick()` — countdown
- `playSliderTick(value)` — volume slider feedback (bypasses mute)
- `playSyllyOn/Off()`, `playWhoosh()`, `playResume()`, `playAlarm()`

Global state: `isMuted` (localStorage), `masterVolume` (localStorage), `audioCtx`.

### Reset Functions
```js
resetToLobby()  // Cold boot: stops timer, hides all overlays, zeroes all games → lobby
resetToMenu()   // LI5 in-game exit: stops timer, hides LI5 overlays → screen-menu
```

### Shared Utility
```js
normaliseWord(w)  // lowercase + trim + plural strip (ies→y, es→e, s→∅)
shuffle(arr)      // Fisher-Yates, returns new array
formatTime(secs)  // m:ss string
```

---

## 3. Global UI Protocol (every screen)

- **Speaker** (`.btn-open-sound`): opens `#sound-overlay` (z-[110])
  - Full-screen menus: `absolute top-4 right-4` within a `relative` screen container
  - Gameplay flow screens: `flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0` header row; speaker + ✕ right-aligned
- **Exit** (✕): mid-game → quit confirm overlay → game menu (NOT lobby); post-game → `resetToLobby()`
- **Active play exception**: `#btn-mute` is instant tap-to-mute, no overlay
- **"← Back to the Box"** on game menu → `resetToLobby()` — the only path to lobby from within a game

---

## 4. Overlay Two-Pattern Library

Classes defined in `css/styles.css`. **Do not invent a third pattern.**

### Data overlay — settings, how-to, word lists, history (scrollable content)
```
backdrop: class="... overlay-data-backdrop"     → align-items:flex-end; justify-content:center
inner:    class="overlay-data-inner ... rounded-t-3xl settings-slide-up"
                                                 → height:80vh; overflow-y:auto
```
**First child of `overlay-data-inner`:** always a thematic title block:
```html
<div class="px-5 pt-5 pb-4 border-b border-stone-200 flex-shrink-0">
  <h2 class="text-xl font-bold text-stone-800">Game Name 🎮</h2>
  <p class="text-xs text-stone-400 mt-1">One-line subtitle.</p>
</div>
```
**On open:** call `scrollTop = 0` so title is always first visible.

### Decision modal — confirmations, short prompts, ≤3 interactive elements
```
backdrop: class="... overlay-modal-backdrop"    → align-items:center; justify-content:center; px-6
inner:    class="overlay-modal-inner ..."       → border-radius:1.5rem; auto height; no animation
```

### Overlay Z-index stack
```
z-[80]   — quit overlays, settings overlays
z-[90]   — how-to overlays, history overlays, review overlays
z-[95]   — gm-boost-overlay, gm-near-sync-overlay, gm-override-overlay, gm-new-frequency-overlay
           ss-intel overlays
z-[100]  — gm-neural-library-overlay, deck panels
z-[110]  — #sound-overlay (global — always on top)
```

### Quit Overlay Checklist (every game)
Every quit overlay (Decision Modal) must have ALL of:
- Thematic emoji at top
- Game-voiced heading (not generic "Quit game?")
- Game-voiced subtext (what will be lost)
- Themed confirm button
- Neutral cancel button ("Keep going!" or "Not yet!")

---

## 5. Universal Menu Standard (All Games)

| Button        | LI5              | Great Minds    | Secret Signals | Just Enough Cooks |
|---------------|------------------|----------------|----------------|-------------------|
| Play CTA      | Let's Play!      | Let's Play!    | Let's Play!    | Let's Cook!       |
| How to Play   | How to Play      | How to Play    | How to Play    | How to Play       |
| Settings      | Settings         | Settings       | Settings       | Settings          |
| Back to lobby | ← Back to the Box | ← Back to the Box | ← Back to the Box | ← Back to the Box |

- Settings button label: always **"Settings"** — thematic flair lives inside the overlay as the title block
- "← Back to the Box" is the only path to lobby from within a game — identical across all games

---

## 6. Great Minds Gold Master (`js/games/great-minds.js`)

### Flow
Setup (names) → Pair Reveal → [Round loop: Input P1 → Pass Gate → Input P2 → Reveal Gate → Countdown → Result] → Victory screen

### Settings
| Setting | Values | Default |
|---------|--------|---------|
| Customise Words | OFF/ON (pool A + pool B category pickers) | OFF |
| Memory Guard | OFF/ON (blocks all previous session clues) | OFF |
| Resonance Tolerance | High Fidelity / Resonant | High Fidelity |
| Signal Boost | OFF/ON (turn-based context from round 5+) | OFF |
| Infinite Resync | OFF/ON (reroll on pair reveal screen) | OFF |
| Frequency Range | Stable / Unstable / Chaotic | Stable |
| Static Interference | OFF/ON (banned letter per round) | OFF |
| Sylly Mode | Mental Fog / Neural Storm | Mental Fog |

Internal values: Resonance `'strict'`/`'normal'`; Sylly `'sub-atomic'`/`'supernova'`

### Validation order in `gmLockIn()`
1. Empty check
2. Starting Pair Guard — contains check vs `gmStartingPair[]`, entire game
3. Last Round Guard — exact match vs `gmPrevRoundWords` Set, previous round
4. Cheap Move Guard — input CONTAINS a word from current pair
5. **Vocabulary Lock** *(Secret Mode Round 2+)* — `window.activeExpansionData.vocab.has(normaliseWord(input))`; reveals VIEW LIST button on failure
6. **Too Easy block** *(Secret Mode Round 2+)* — clue in nono_list of BOTH active pair words
7. Static Interference — input contains `gmBannedLetter`
8. Memory Guard — input in `gmSessionGuesses` (only if ON)
9. Signal Boost overlay trigger (transmitter only, if ON and round ≥ 5)
10. `gmProcessLockIn(input, '')`

### Key state variables
- `gmPlayerNames[2]`, `gmCurrentPair[2]`, `gmWordA`, `gmWordB`
- `gmRound`, `gmActivePlayer`, `gmCountdownTimer`
- `gmStartingPair[]` — locked at round 1, immutable, contains check entire game
- `gmPrevRoundWords` Set — previous round's pair + clues, exact match
- `gmSessionGuesses` Set — all clues this game (Memory Guard)
- `gmRoundLog[]` — `{ round, pair, guessA, guessB, traceA, traceB, isWin? }`
- `gmFrequencyRange`, `gmStaticInterference`, `gmBannedLetter`, `gmLastBannedLetter`
- `gmMemoryGuard`, `gmResonanceTolerance`, `gmSignalBoost`, `gmInfiniteResync`
- `gmSyllyIntensity`, `gmCustomWords`, `gmPoolA`, `gmPoolB`

### Overlay types
| Overlay | Pattern |
|---|---|
| `gm-settings-overlay` | Data (slide-up) — title: "Frequency Configuration 📡" |
| `gm-how-to-overlay` | Data (slide-up) |
| `gm-deck-panel` | Data (slide-up) |
| `gm-vocab-overlay` *(Secret Mode)* | Data (slide-up, terminal style) |
| `gm-boost-overlay` | Decision modal |
| `gm-near-sync-overlay` | Decision modal |
| `gm-override-overlay` | Decision modal |
| `gm-new-frequency-overlay` (Session Terminal) | Decision modal |
| `gm-neural-library-overlay` | Decision modal |
| `gm-concede-overlay` *(Secret Mode)* | Decision modal |

---

## 7. Secret Signals Gold Master (`js/games/secret-signals.js`)

### Flow
Setup → Players → Vault Gate (×2) → Vault (×2) → Who Encrypts First? → [Round loop: Encrypt → Broadcast → Intercept → Decode Gate → Decode → Resolution] → Endgame Splash → [Phase 2 if Sylly Mode: Tiebreak? → Intel Intro → Intel Guess (×4 keywords) → Intel Summary] → Final Game Over

### Settings
- Intercepts to Win, Difficulty, Categories, Reroll Limit, Timer, Customise Vault, Sylly Mode
- Settings overlay title: "Signal Parameters 🔐"

### Exit routing
- Mid-game quit → `ssResetToMenu()` → `screen-ss-menu`
- `ssResetToMenu()` preserves: `ssPlayerNamesA/B`, `ssTeamNames`, `ssPlayerCount`, all `ssSetting*` vars
- `ssResetToMenu()` wipes: all round state, vault, token/misfire counts, intel state

### Key state variables
- `ssSettingInterceptsToWin`, `ssDifficultyLevel`, `ssSelectedCategories`, `ssRerollLimitSetting`, `ssTimerSetting`
- `ssCustomiseVault` — false = curated 10-cat pool; true = full 16-cat picker
- `ssPlayerCount`, `ssPlayerNamesA/B` — broadcaster rotation
- `ssVaultA/B` — 4 word objects each; `ssRerollCounts[team][kwIdx]`
- `ssTokens`, `ssMisfires`, `ssRound`, `ssRoundHistory`
- `ssIntelSyllyMode`, `ssIntelScoreA/B`, `ssIntelFound`, `ssIntelHistory`
- `ssTimerInterval`, `ssAlarmInterval`, `ssTimerSecondsLeft`
- `ssIntelAttempts[]`, `ssOverrideSelectedAttempt`

### Fuzzy matching (`ssFuzzyMatch`)
- Plural/singular aware + compound word aware (hyphen/space split, ≥3 char components)
- Solid compounds (no separator) do NOT auto-split — store as "Weight-Lifting" to enable matching

---

## 8. LI5 (`js/games/li5.js`)

**Settings overlay title:** "Like I'm Five ⭐"
**Settings:** Timer (30/60/90s), Rounds (3/5/10), No-No list size (5/10), Penalty type, Skip cost, Review edits, Sylly Mode

**Exit routing:** Mid-game quit → `resetToMenu()` → `screen-menu`

**Secret Mode addition:** When `isSecretMode` is active, the `btn-play` listener pre-fills team name inputs with "The Radiant" / "The Dire" and sets them `disabled`. `resetToLobby()` re-enables both inputs.

---

## 9. Just Enough Cooks Gold Master (`js/games/jec.js`)

### Flow
LOBBY → JEC MENU → ROSTER → [Round loop: ORDER → PREP (×N players) → SIFTING → TALLY] → WASHUP

### Screen IDs
`screen-jec-menu`, `screen-jec-roster`, `screen-jec-order`, `screen-jec-prep`, `screen-jec-sifting`, `screen-jec-tally`, `screen-jec-washup`

### Settings overlay title
"The Pantry Cabinet 🍳" (overlay title — menu button is "Settings")

### Settings
| Setting | Options | Default |
|---------|---------|---------|
| Chefs (player count) | 3 / 4 / 5 / 6 | 4 |
| Rounds | 3 / 5 / 10 | 3 |
| The Sweet Spot | 10 / 20 / 30 pts | 20 pts |
| Rotten Penalty | Off / On | On |
| Spoilt Penalty | Off / On | On |
| Sous Chef Oversight | Off / On | On |
| ✨ Sylly Mode (Kitchen Nightmares) | Off / On | Off |

### Exit routing
- Mid-game quit → `jecResetForNewGame()` → `screen-jec-menu`
- Preserves: `jecPlayerNames[]` + all settings
- Wipes: all round state

### Secret Mode word pool
`jecApplyExpansionOverrides()` checks `isSecretMode && secretWords.length` — uses `food` category from expansion; falls back to all expansion words if no food category. Applied in `jecStartGame()` and in the `jecStartRound()` pool-refill path.

### Scoring
- **Golden (Sweet Spot):** `Math.round(jecGoldenScore * (goldenMax - count + 2) / goldenMax)` where `goldenMax = Math.floor(N * 0.7)`. count=2 = full score.
- **Spoilt (Too Many Cooks):** `-(count × 2)` pts if Spoilt Penalty on. Threshold: count > `goldenMax`.
- **Rotten (Unique):** −10 pts flat if Rotten Penalty on.
- **Poisoned (KN mode):** 0 pts — overrides Golden/Spoilt/Rotten.
- **Signature Dish (KN mode):** Ingredient slot 0 always flagged. If Golden → score × 2.

### Sous Chef Oversight
- Tap any two words (`.jec-sift-card` OR `.jec-poison-chip`) to trigger merge modal
- `jecApplyMerge(normA, normB)` — ingredient always wins; poison propagates; normB deleted from freq map
- Ghost merge (both norms absent from freq map): early-returns harmlessly

### Key Functions
- `jecStartRound()` — draws food word, routes to ORDER screen
- `jecSubmitIngredients()` — validates, stores inputs, advances to next player or SIFTING
- `jecBuildFrequency()` — normalises all inputs → `jecWordFrequency` + `jecDisplayWords`
- `jecBuildPoisonSet()` — KN only; normalises all poison words → `jecPoisonedNorms`
- `jecStartSifting()` — builds poison section chips, populates recipe label, calls `jecRenderSifting()`
- `jecRenderSifting()` — renders sorted ingredient cards with status badges; wires tap handlers
- `jecApplyMerge(normA, normB)` — merges freq counts, propagates poison, removes normB
- `jecCalcRoundScores()` — per-player scoring with merge-map resolution; appends to `jecRoundLog`
- `jecShowWashup()` — ranks players, calls `jecRenderCookBook()`
- `jecResetForNewGame()` — resets all game state, preserves names + settings → JEC MENU
- `jecApplyExpansionOverrides()` — Secret Mode settings hook (namespaced to avoid collision with dstw.js global)

### Overlays
| Overlay | Pattern |
|---------|---------|
| `jec-settings-overlay` | Data (slide-up) — "The Pantry Cabinet 🍳" |
| `jec-how-to-overlay` | Data (slide-up) |
| `jec-quit-overlay` | Decision modal |
| `jec-oversight-overlay` | Decision modal — merge confirm |
| `jec-new-shift-overlay` | Decision modal — "New Shift?" |

---

## 10. Secret Mode (`js/secret-mode.js`)

**Global state:**
- `isSecretMode` (bool), `activeExpansion` (string), `secretWords` (array)
- `window.activeExpansionOverrides` — settings pushed to plugins at launch
- `window.activeExpansionData` — `{ vocab: Set, byCategory: {}, misc: [] }` built by `smBuildExpansionData()`

**Key functions:**
- `smBuildExpansionData(words)` — builds vocab Set (normalised) + category/misc display data
- `smLaunch()` — async; fetches JSON, builds expansion data, writes overrides, navigates
- `smOpenVocabOverlay()` / `smRenderVocabTabs()` / `smRenderVocabList()` — vocab reference UI
- `resetSecretMode()` — full teardown; called by `resetToLobby()` via forward reference

**Configuration:**
- `SM_TERMINAL_CONFIG` — expansion + game definitions (add new expansions here only)
- `SM_EXPANSION_OVERRIDES` — per-expansion forced settings (keyed by expansion id)
- `SM_SETTINGS_DISPLAY` — per-game display labels + formatters for terminal settings summary

**NES controller (Konami screen):**
- Wider layout: `max-w-sm`
- Select + Start: `flex-row gap-2` (both enabled, IDs: `sm-btn-select`, `sm-btn-start`)
- B + A: `flex-row gap-2` (IDs: `sm-btn-b`, `sm-btn-a`)
- Konami sequence: ↑↑↓↓←→←→🅱️🅰️START (SELECT not in sequence — but button is now enabled for UX completeness)

**Vocab Lock reuse pattern:**
- Vocabulary check: `window.activeExpansionData.vocab.has(normaliseWord(input))`
- Open vocab overlay: `smOpenVocabOverlay()`
- Any future game can wire a "VIEW WORD LIST" button to `smOpenVocabOverlay()` with zero changes to `secret-mode.js`

**Terminal UX:**
- Expansion list collapses after selection; game buttons render indented below `└─ SELECT GAME:`
- Settings summary panel injected before launch button on game selection
- Banner (`SYLLY-OS › [EXP] › [GAME]`) injected into target game menu on launch

---

## 11. Service Worker (`sw.js`)
Cache-first strategy, all assets local. Current: **v60**

Precached assets (relative paths):
```
./, index.html, css/styles.css,
js/engine.js, js/games/li5.js, js/games/great-minds.js,
js/games/secret-signals.js, js/games/jec.js, js/secret-mode.js, js/app.js,
js/lib/tailwind-play.js, data/words.json, data/secret_words.json, manifest.json
```

Bump `CACHE_NAME = 'sylly-games-vN'` on **every deploy**.

---

## 12. Checklist for Adding a New Game

- [ ] Create `js/games/[game-name].js`
- [ ] Add `<script>` tag to `index.html` (after `engine.js`, before `app.js`)
- [ ] Add all screen IDs to `allScreens[]` in `engine.js`
- [ ] Add all overlay HTML to `index.html` **before** the `<script>` tags
- [ ] Add section header comment block to `index.html` + entry to `docs/code-map.md`
- [ ] Add screen HTML with `.btn-open-sound` + ✕ on every screen
- [ ] Set `activeGameId = '[game-name]'` in lobby button listener
- [ ] Add game teardown to `resetToLobby()` in `engine.js`
- [ ] Wire lobby button → game menu screen (not directly into setup)
- [ ] Add game menu screen: Let's Play!, How to Play, Settings, ← Back to the Box
- [ ] Settings button label: always "Settings" (thematic flair is the overlay title block)
- [ ] Settings + how-to overlays: thematic title block as first child of `overlay-data-inner`; `scrollTop = 0` on open
- [ ] Quit overlay: game-voiced emoji + heading + subtext + themed confirm + neutral cancel
- [ ] Exit routing: mid-game ✕ → quit overlay → game menu; post-game ✕ → `resetToLobby()`
- [ ] Settings: game options first, ✨ Sylly Mode last; pill buttons for discrete choices
- [ ] Overlays: data overlay (slide-up) or decision modal — no third pattern
- [ ] Add precache entries to `sw.js` and bump SW version
- [ ] Add `[prefix]ApplyExpansionOverrides()` at the plugin's settings-apply point — reads `window.activeExpansionOverrides` if `isSecretMode`; use game-specific prefix to avoid collision
- [ ] In Secret Mode, substitute `secretWords` (or appropriate category subset) for `allWords` in the word pool — apply in both `startGame()` and the pool-refill path in `startRound()`
- [ ] If game uses word validation in Secret Mode: wire vocab lock (`window.activeExpansionData.vocab.has(normaliseWord(input))`) + "VIEW WORD LIST" button → `smOpenVocabOverlay()`
- [ ] Add entry to `SM_TERMINAL_CONFIG.games[]` in `secret-mode.js`
- [ ] Add game to `SM_SETTINGS_DISPLAY` in `secret-mode.js`
