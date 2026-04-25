# Phase 10.2 Architecture Snapshot — Little Sylly Games
**Date:** April 2026 | **SW Version:** v58

---

## 1. File Structure

```
js/engine.js                — Global engine (audio, navigation, reset, normaliseWord, sound overlay)
js/games/dstw.js            — DSTW plugin (all state, logic, listeners)
js/games/great-minds.js     — Great Minds plugin (all state, logic, listeners)
js/games/sylly-signals.js   — Sylly Signals plugin (all state, logic, listeners)
js/secret-mode.js           — Secret Mode: Konami gateway, Terminal, expansion proxy state
js/app.js                   — Bootstrapper (3 lines, no logic)
js/lib/tailwind-play.js     — Local Tailwind (offline)
css/styles.css              — Custom styles + overlay library classes
data/words.json             — ~358 words, 16 categories
data/secret_words.json      — Dota 2 expansion, 35 words, 5 categories
docs/phase10-snapshot.md    — This file (current gold master)
docs/phase7-snapshot.md     — Archived (Phase 7 architecture)
docs/expansion-guide.md     — Template + checklist for adding new expansion packs
```

**Load order in `index.html`:**
```html
<script src="js/engine.js"></script>
<script src="js/games/dstw.js"></script>
<script src="js/games/great-minds.js"></script>
<script src="js/games/sylly-signals.js"></script>
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
**Rule:** Every new screen ID must be added to `allScreens[]`.

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
- `playSyllyOn/Off()`, `playWhoosh()`, `playResume()`

Global state: `isMuted` (localStorage), `masterVolume` (localStorage), `audioCtx`.

### Reset Functions
```js
resetToLobby()  // Cold boot: stops timer, hides all overlays, zeroes all games → lobby
resetToMenu()   // DSTW in-game exit: stops timer, hides DSTW overlays → screen-menu
```

---

## 3. Global UI Protocol (every screen)

- **Speaker** (`.btn-open-sound`): opens `#sound-overlay` (z-[110])
- **Exit** (✕): pre-game → game menu; mid-game → quit confirm overlay; post-game → `resetToLobby()`
- **Active play exception**: `#btn-mute` is instant tap-to-mute, no overlay

---

## 4. Overlay Two-Pattern Library

Classes defined in `css/styles.css`. **Do not invent a third pattern.**

### Data overlay — settings, how-to, word lists, history (scrollable content)
```
backdrop: class="... overlay-data-backdrop"     → align-items:flex-end; justify-content:center
inner:    class="overlay-data-inner ... rounded-t-3xl settings-slide-up"
                                                 → height:80vh; overflow-y:auto
```

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

---

## 5. Great Minds Gold Master (`js/games/great-minds.js`)

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

### Hardcoded guards (always on)
- **Starting Pair Guard**: contains check against `gmStartingPair[]` — entire game
- **Last Round Guard**: exact match against `gmPrevRoundWords` Set — previous round

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

### Signal Boost (turn-based from R5)
- Transmitter formula: `(gmRound - 5) % 2 === 0 ? P1 : P2`
- Transmitter: sees boost overlay (`gm-boost-overlay`) with `?` button opening Neural Library
- Receiver: sees boost context banner (`gm-boost-context-banner`) on their input screen
- Abuse check: bidirectional `normBoost.includes(normClue) || normClue.includes(normBoost)`, 3-char floor
- "Raw Signal 📡" skips boost entirely

### Neural Library modal (`gm-neural-library-overlay`)
- Decision modal (z-[100]) — opens from `?` in boost overlay or `?` beside settings toggle
- Static content: Grammar / Physical / Conceptual categories + Elephant·Whale clinical example
- Teaches "metadata not synonyms" principle

### Key state variables
- `gmPlayerNames[2]`, `gmCurrentPair[2]`, `gmWordA`, `gmWordB`
- `gmRound`, `gmActivePlayer`, `gmCountdownTimer`
- `gmStartingPair[]` — locked at round 1, immutable, contains check entire game
- `gmPrevRoundWords` Set — previous round's pair + clues, exact match
- `gmSessionGuesses` Set — all clues this game (Memory Guard)
- `gmRoundLog[]` — `{ round, pair, guessA, guessB, traceA, traceB, isWin? }`
- `gmPendingLockIn`, `gmPendingBoostA`
- `gmFrequencyRange`, `gmStaticInterference`, `gmBannedLetter`, `gmLastBannedLetter`
- `gmMemoryGuard`, `gmResonanceTolerance`, `gmSignalBoost`, `gmInfiniteResync`
- `gmSyllyIntensity`, `gmCustomWords`, `gmPoolA`, `gmPoolB`

### Key functions
- `gmBuildPool(categorySet)` — filters by difficulty ≤ maxDiff
- `gmPickStarterPair(exclude=[])` — Fisher-Yates shuffle
- `gmPickBannedLetter()` — picks random letter ≠ gmLastBannedLetter
- `gmLockIn()` — full validation + routing
- `gmProcessLockIn(input, boost)` — shared handler for both players
- `gmHandleMatch()` — logs win round with `isWin: true`, adds clues to gmSessionGuesses
- `gmHandleMismatch()` — logs round, updates gmPrevRoundWords, adds clues to gmSessionGuesses
- `gmShowResult()` — routes to victory / near-sync overlay / mismatch
- `gmShowPlayerInput()` — sets up input screen; resets VIEW LIST button; shows/hides concede wrap
- `gmRenderInputEchoes(containerId)` — compact table log; used on input + result screens
- `gmRenderPsychicEchoes(containerId)` — full table log; used on victory + concede screens
- `gmNavigateToConcede()` — populates + routes to `screen-gm-concede` (Secret Mode concede end screen)
- `gmRenderVictory()` / `gmTriggerVictory()`
- `gmStartInputPhase()` — increments round, locks starting pair R1, picks banned letter

### Terminology
| Screen/element | Text |
|---|---|
| Pass gate | "Finding Wavelength 📡" |
| Reveal gate heading | "Frequencies Locked... 📡" |
| Reveal gate button | "Matching Wavelength 🚀" |
| Input subtext | "Establishing Link... Transmit Clue." |
| Win subtext | "You both thought of…" |
| Victory | "NEURAL LINK!" |
| Override modal | "Quantum Entanglement?" |
| Near-sync modal | "Frequency Overlap" |
| Static block | "Signal Interrupted!" |
| Memory Guard block | "Temporal Paradox!" |
| Session Terminal buttons | "Memory Purge ⚛️" / "Resume Current Evaluation 📖" |
| Log label | "Psychic Echoes 📖" |
| Boost guide modal | "Boost Signal Guide ⚡" |

### Overlay types
| Overlay | Pattern |
|---|---|
| `gm-settings-overlay` | Data (slide-up) |
| `gm-how-to-overlay` | Data (slide-up) |
| `gm-deck-panel` | Data (slide-up) |
| `gm-vocab-overlay` *(Secret Mode)* | Data (slide-up, terminal style — black/green) |
| `gm-boost-overlay` | Decision modal |
| `gm-near-sync-overlay` | Decision modal |
| `gm-override-overlay` | Decision modal |
| `gm-new-frequency-overlay` (Session Terminal) | Decision modal |
| `gm-neural-library-overlay` | Decision modal |
| `gm-concede-overlay` *(Secret Mode)* | Decision modal |

### Secret Mode GM screens
| Screen | Description |
|---|---|
| `screen-gm-concede` | "No Link Could Be Established" end screen; pair words + round count + Psychic Echoes |

---

## 6. Sylly Signals Gold Master (`js/games/sylly-signals.js`)

### Flow
Setup → Players → Vault Gate (×2) → Vault (×2) → Who Encrypts First? → [Round loop: Encrypt → Broadcast → Intercept → Decode Gate → Decode → Resolution] → Endgame Splash → [Phase 2 if Sylly Mode: Tiebreak? → Intel Intro → Intel Guess (×4 keywords) → Intel Summary] → Final Game Over

### Settings
- Intercepts to Win, Difficulty, Categories, Reroll Limit, Timer, Customise Vault, Sylly Mode

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

## 7. DSTW (`js/games/dstw.js`)
**Settings:** Timer (30/60/90s), Rounds (3/5/10), No-No list size (5/10), Penalty type, Skip cost, Review edits, Sylly Mode

**Secret Mode addition:** When `isSecretMode` is active, the `btn-play` listener pre-fills team name inputs with "The Radiant" / "The Dire" and sets them `disabled`. `resetToLobby()` re-enables both inputs.

---

## 8. Secret Mode (`js/secret-mode.js`)

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

**Terminal UX:**
- Expansion list collapses after selection; game buttons render indented
- Settings summary panel injected before launch button on game selection
- Banner (`SYLLY-OS › [EXP] › [GAME]`) injected into target game menu on launch

---

## 9. Service Worker (`sw.js`)
Cache-first strategy, all assets local. Current: **v58**

Precached assets (relative paths):
```
./, index.html, css/styles.css,
js/engine.js, js/games/dstw.js, js/games/great-minds.js,
js/games/sylly-signals.js, js/secret-mode.js, js/app.js,
js/lib/tailwind-play.js, data/words.json, data/secret_words.json, manifest.json
```

Bump `CACHE_NAME = 'sylly-games-vN'` on **every deploy**.

---

## 10. Checklist for Adding a New Game

- [ ] Create `js/games/[game-name].js`
- [ ] Add `<script>` tag to `index.html` (after `engine.js`, before `app.js`)
- [ ] Add all screen IDs to `allScreens[]` in `engine.js`
- [ ] Add all overlay HTML to `index.html` **before** the `<script>` tags
- [ ] Add screen HTML with `.btn-open-sound` + ✕ on every screen
- [ ] Set `activeGameId = '[game-name]'` in lobby button listener
- [ ] Add game teardown to `resetToLobby()` in `engine.js`
- [ ] Wire lobby button → game menu screen (not directly into setup)
- [ ] Add game menu screen: Let's Play!, How to Play, Settings, ← Back to the Box
- [ ] Settings: game options first, ✨ Sylly Mode last; pill buttons for discrete choices
- [ ] Overlays: data overlay (slide-up) or decision modal — no third pattern
- [ ] Add precache entries to `sw.js` and bump SW version
