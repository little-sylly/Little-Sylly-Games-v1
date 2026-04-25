# Phase 11 Architecture Snapshot — Little Sylly Games
**Phase:** Soft Rebrand + Secret Mode + New Game JEC | **Date:** April 2026 | **SW Version:** v59

---

## 1. File Structure

```
js/engine.js                — Global engine (audio, navigation, reset, normaliseWord, sound overlay)
js/games/dstw.js            — DSTW plugin (all state, logic, listeners)
js/games/great-minds.js     — Great Minds plugin (all state, logic, listeners)
js/games/sylly-signals.js   — Sylly Signals plugin (all state, logic, listeners)
js/games/jec.js             — Just Enough Cooks plugin (all state, logic, listeners)
js/secret-mode.js           — Secret Mode: Konami gateway, Terminal, expansion proxy state
js/app.js                   — Bootstrapper (3 lines, no logic)
js/lib/tailwind-play.js     — Local Tailwind (offline)
css/styles.css              — Custom styles + overlay library classes
data/words.json             — ~358 words, 16 categories
data/secret_words.json      — Dota 2 expansion, 35 words, 5 categories
docs/phase11-snapshot.md    — This file (current gold master)
docs/phase10-snapshot.md    — Archived (Phase 10 architecture)
docs/phase7-snapshot.md     — Archived (Phase 7 architecture)
docs/expansion-guide.md     — Template + checklist for adding new expansion packs
```

**Load order in `index.html`:**
```html
<script src="js/engine.js"></script>
<script src="js/games/dstw.js"></script>
<script src="js/games/great-minds.js"></script>
<script src="js/games/sylly-signals.js"></script>
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
resetToMenu()   // DSTW in-game exit: stops timer, hides DSTW overlays → screen-menu
```

### Shared Utility
```js
normaliseWord(w)  // lowercase + trim + plural strip (ies→y, es→e, s→∅) — used by GM near-sync + JEC frequency map
shuffle(arr)      // Fisher-Yates, returns new array
formatTime(secs)  // m:ss string
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

### Terminology
| Screen/element | Text |
|---|---|
| Pass gate | "Finding Wavelength 📡" |
| Reveal gate button | "Matching Wavelength 🚀" |
| Win subtext | "You both thought of…" |
| Victory | "NEURAL LINK!" |
| Override modal | "Quantum Entanglement?" |
| Near-sync modal | "Frequency Overlap" |
| Static block | "Signal Interrupted!" |
| Memory Guard block | "Temporal Paradox!" |
| Session Terminal buttons | "Memory Purge ⚛️" / "Resume Current Evaluation 📖" |
| Log label | "Psychic Echoes 📖" |

### Overlay types
| Overlay | Pattern |
|---|---|
| `gm-settings-overlay` | Data (slide-up) |
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

## 8. Just Enough Cooks Gold Master (`js/games/jec.js`)

### Flow
LOBBY → JEC MENU → ROSTER → [Round loop: ORDER → PREP (×N players) → SIFTING → TALLY] → WASHUP

### Screen IDs
`screen-jec-menu`, `screen-jec-roster`, `screen-jec-order`, `screen-jec-prep`, `screen-jec-sifting`, `screen-jec-tally`, `screen-jec-washup`

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

Settings overlay label: **"The Pantry Cabinet"**

### Terminology
| Term | Meaning |
|------|---------|
| Today's Order | The food word revealed at the start of each round |
| Today's Recipe | Sub-header label above the ingredient list on the sifting screen |
| The Sifting | Screen where ingredient frequency is revealed and merges applied |
| Chef's Kiss ✨ | Golden status — ingredient shared by the Sweet Spot count |
| Too Many Cooks! | Spoilt status — too many players submitted the same word |
| A Bit Pongy! | Rotten status — unique ingredient nobody else submitted |
| Kitchen Nightmare! 🧪 | Poisoned status (KN mode) — overrides all other status |
| Signature Dish | Ingredient 1 in KN mode — scores double if Golden |
| Poison Word | A word submitted in KN mode to sabotage matching ingredients |
| Health Inspector's Report | Section on sifting screen listing all active poison words |
| Sous Chef Oversight | Setting enabling manual word merges before scoring |
| Crowded Kitchen Tax | Spoilt penalty formula: −(count × 2) pts per player |
| The Tally | Per-round score reveal screen |
| Final Wash-up | End-of-game leaderboard screen |
| Chef's Cook Book 📖 | Per-round log shown on the washup screen |
| New Shift | "Play again" from washup — resets round state, preserves names + settings |

### Scoring
- **Golden (Sweet Spot):** Inverse proportional — `Math.round(jecGoldenScore * (goldenMax - count + 2) / goldenMax)` where `goldenMax = Math.floor(N * 0.7)`. count=2 always = full `jecGoldenScore`.
- **Spoilt (Too Many Cooks):** `-(count × 2)` pts if Spoilt Penalty on. Threshold: count > `goldenMax`.
- **Rotten (Unique):** −10 pts flat if Rotten Penalty on.
- **Poisoned (KN mode):** 0 pts — overrides Golden/Spoilt/Rotten.
- **Signature Dish (KN mode):** Ingredient slot 0 always flagged. If Golden → score × 2.

Sifting sort order: **Chef's Kiss → Too Many Cooks → Kitchen Nightmare → A Bit Pongy**

### Sous Chef Oversight
- Tap any two words (`.jec-sift-card` ingredient cards OR `.jec-poison-chip` Health Inspector chips) to trigger merge modal
- `jecApplyMerge(normA, normB)` auto-swaps if normA not in freq map (ingredient always wins); poison propagates to merged result; `jecWordFrequency[normB]` deleted after merge
- Selection ring: `.jec-sift-card` → `ring-amber-400`; `.jec-poison-chip` → `ring-purple-500`
- `jecClearOversightHighlights()` clears both
- "Ghost merge" (both norms absent from freq map): `jecApplyMerge` early-returns harmlessly

### Kitchen Nightmares (Sylly Mode)
- Prep screen: ingredient 1 gets amber border + "🌟 Signature Dish" placeholder; poison input shown below the 3 ingredient fields
- Validation: blocks duplicate ingredients (same normalised form), blocks self-poison (poison word matches own ingredient)
- `jecBuildPoisonSet()` — normalises all players' poison words → `jecPoisonedNorms` Set
- Health Inspector chips: tappable for Sous Chef when oversight is on; `data-norm` attribute set

### Key State Variables
```
Settings:
  jecPlayerCount, jecRounds, jecGoldenScore
  jecRottenPenalty, jecSpoiltPenalty, jecSousChefOversight, jecKitchenNightmares

Game loop:
  jecPlayerNames[], jecRound, jecScores[], jecCurrentWord, jecWordPool[]
  jecInputs[][], jecSignatures[], jecPoisons[]
  jecWordFrequency{}, jecDisplayWords{}, jecMergeMap{}
  jecRoundLog[], jecCurrentPlayerIdx
  jecOversightSelected, jecOversightPendingA, jecOversightPendingB
  jecPoisonedNorms (Set)
```

### Key Functions
- `jecStartRound()` — draws food word, routes to ORDER screen
- `jecStartPlayerPrep()` — sets up PREP screen for current player
- `jecSubmitIngredients()` — validates, stores inputs, advances to next player or SIFTING
- `jecBuildFrequency()` — normalises all inputs → `jecWordFrequency` + `jecDisplayWords`
- `jecBuildPoisonSet()` — KN only; normalises all poison words → `jecPoisonedNorms`
- `jecStartSifting()` — builds poison section chips, populates recipe label, calls `jecRenderSifting()`
- `jecRenderSifting()` — renders sorted ingredient cards with status badges; wires tap handlers
- `jecHandleOversightTap(norm)` — selection state machine; shows merge modal on second tap
- `jecClearOversightHighlights()` — removes ring from all cards and chips
- `jecApplyMerge(normA, normB)` — merges freq counts, updates displayWords, propagates poison, removes normB
- `getIngredientStatus(count, N)` — returns `'Golden'` / `'Spoilt'` / `'Rotten'`
- `jecCalcGoldenPoints(count, N)` — inverse proportional score
- `jecCalcRoundScores()` — per-player scoring with merge-map resolution; appends to `jecRoundLog`
- `jecRenderTally(roundScores)` — per-player round score display
- `jecShowWashup()` — ranks players, calls `jecRenderCookBook()`
- `jecRenderCookBook()` — per-round log cards sorted by score desc
- `jecResetForNewGame()` — resets all game state, preserves names + settings → JEC MENU
- `jecApplyExpansionOverrides()` — Secret Mode settings hook (namespaced to avoid collision with dstw.js global)

### Overlays
| Overlay | Pattern |
|---------|---------|
| `jec-settings-overlay` | Data (slide-up) — "The Pantry Cabinet" |
| `jec-how-to-overlay` | Data (slide-up) |
| `jec-quit-overlay` | Decision modal |
| `jec-oversight-overlay` | Decision modal — merge confirm |
| `jec-new-shift-overlay` | Decision modal — "New Shift?" |

---

## 9. Secret Mode (`js/secret-mode.js`)

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

## 10. Service Worker (`sw.js`)
Cache-first strategy, all assets local. Current: **v59**

Precached assets (relative paths):
```
./, index.html, css/styles.css,
js/engine.js, js/games/dstw.js, js/games/great-minds.js,
js/games/sylly-signals.js, js/games/jec.js, js/secret-mode.js, js/app.js,
js/lib/tailwind-play.js, data/words.json, data/secret_words.json, manifest.json
```

Bump `CACHE_NAME = 'sylly-games-vN'` on **every deploy**.

---

## 11. Checklist for Adding a New Game

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
- [ ] Add `[prefix]ApplyExpansionOverrides()` at the plugin's settings-apply point — reads `window.activeExpansionOverrides` if `isSecretMode`; use game-specific prefix to avoid collision with other plugins' globals
- [ ] Add entry to `SM_TERMINAL_CONFIG.games[]` in `secret-mode.js`
- [ ] Add game to `SM_SETTINGS_DISPLAY` in `secret-mode.js`

---

## 12. Next: Stage 4 — File Rename Pass
**Trigger:** Stable deploy of Phase 11 confirmed.
**Constraint:** One atomic commit — all references change together.

| Old filename | New filename |
|---|---|
| `js/games/dstw.js` | `js/games/li5.js` |
| `js/games/sylly-signals.js` | `js/games/secret-signals.js` |

Files to update in the same commit: `index.html`, `sw.js` (bump version), `CLAUDE.md`, `.claude/rules/logic-engine.md`, `.claude/rules/game-identities.md`, `docs/phase11-snapshot.md`, `docs/next-3-stage-plan.md`.
