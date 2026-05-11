# Phase 13 Architecture Snapshot — Little Sylly Games
**Phase:** Game 5 (You Get It? Rebrand) | **Date:** April 2026 | **SW Version:** v73

This is the current gold master. Phase 12 snapshot at `docs/archive/phase12-snapshot.md`.

---

## 1. File Structure

```
js/engine.js                — Global engine (audio, navigation, reset, normaliseWord, sound overlay)
js/games/li5.js             — LI5 plugin (Like I'm Five — all state, logic, listeners)
js/games/great-minds.js     — Great Minds plugin (all state, logic, listeners)
js/games/secret-signals.js  — Secret Signals plugin (all state, logic, listeners)
js/games/jec.js             — Just Enough Cooks plugin (all state, logic, listeners)
js/games/ygi.js             — You Get It? plugin (all state, logic, listeners)
js/secret-mode.js           — Secret Mode: Konami gateway, Terminal, expansion proxy state
js/app.js                   — Bootstrapper (3 lines, no logic)
js/lib/tailwind-play.js     — Local Tailwind (offline)
css/styles.css              — Custom styles + overlay library classes
data/words.json             — ~433 words, 16 categories
data/secret_words.json      — Dota 2 expansion, 35 words, 5 categories
data/ygi-data.json          — You Get It? prompts, 55+ entries, {id, text, ringers[5]}
docs/code-map.md            — Surgical ID reference: all screens, overlays, buttons, functions per game
docs/phase13-snapshot.md    — This file (current gold master)
docs/phase12-snapshot.md    — Archived (Phase 12 — Hard Branding + UI Consistency Pass)
docs/expansion-guide.md     — Template + checklist for adding new expansion packs
docs/ygi-content-guide.md   — Content creation guide for You Get It? prompts + ringers
```

**Load order in `index.html`:**
```html
<script src="js/engine.js"></script>
<script src="js/games/li5.js"></script>
<script src="js/games/great-minds.js"></script>
<script src="js/games/secret-signals.js"></script>
<script src="js/games/jec.js"></script>
<script src="js/games/ygi.js"></script>
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
  - Gameplay flow screens: `flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0` header row; speaker + ✕ right-aligned in same `flex items-center gap-2` group
- **Exit** (✕): mid-game → quit confirm overlay → game menu (NOT lobby); post-game → `resetToLobby()`
- **Active play exception**: `#btn-mute` is instant tap-to-mute, no overlay
- **"← Back to the Box"** on game menu → `resetToLobby()` — the only path to lobby from within a game
- **No ✓ on button labels** — established Phase 13; Done buttons, confirm buttons, submit buttons use plain text only

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
z-[95]   — gm-boost-overlay, gm-near-sync-overlay, gm-override-overlay, gm-new-frequency-overlay; ss-intel overlays
z-[100]  — gm-neural-library-overlay, deck panels
z-[110]  — #sound-overlay (global — always on top)
```

### Quit Overlay Checklist (every game)
Every quit overlay (Decision Modal) must have ALL of:
- Thematic emoji at top
- Game-voiced heading (not generic "Quit game?")
- Game-voiced subtext (what will be lost)
- Themed confirm button (no ✓)
- Neutral cancel button ("Keep going!" or "Not yet!")

---

## 5. Universal Menu Standard (All Games)

| Button        | LI5                | Great Minds    | Secret Signals | Just Enough Cooks | You Get It?       |
|---------------|--------------------|----------------|----------------|-------------------|-------------------|
| Play CTA      | Let's Play!        | Let's Play!    | Let's Play!    | Let's Cook!       | Show Your Take 🃏 |
| How to Play   | How to Play        | How to Play    | How to Play    | How to Play       | How to Play       |
| Settings      | Settings           | Settings       | Settings       | Settings          | Settings          |
| Back to lobby | ← Back to the Box  | ← Back to the Box | ← Back to the Box | ← Back to the Box | ← Back to the Box |

- Settings button label: always **"Settings"** — thematic flair lives inside the overlay as the title block
- "← Back to the Box" is the only path to lobby from within a game — identical across all games

---

## 6. Vertical Centering Pattern (gameplay screens)

For screens with a fixed header row, fixed bottom button, and variable-length middle content:

```html
<section class="flex flex-col w-full max-w-sm mx-auto min-h-screen">
  <!-- Fixed header -->
  <div class="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">...</div>

  <!-- Centred middle — scrolls if overflow -->
  <div class="flex-1 overflow-y-auto flex flex-col">
    <div class="my-auto px-6 py-4 flex flex-col gap-4">
      <!-- content -->
    </div>
  </div>

  <!-- Fixed footer button -->
  <div class="px-6 pb-8 pt-2 flex-shrink-0">...</div>
</section>
```

**Why `my-auto` not `justify-center`:** `justify-center` on an overflow container clips content at the top when it exceeds the viewport. `my-auto` distributes spare space as equal top/bottom margins and collapses to 0 when overflowing — so scroll just works.

---

## 7. Round Log Pattern (final/gameover screens)

Every game's gameover/final screen should include a per-round history log. **Order:** celebration/standings first (primary action, visible without scrolling), log below the fold (scroll to access).

| Game | Log name | Location |
|------|----------|----------|
| Great Minds | Psychic Echoes 📖 | Victory screen, then gameover |
| Just Enough Cooks | Chef's Cook Book 📖 | Washup screen |
| You Get It? | The Record 📋 | Gameover screen (carousel, below standings) |

---

## 8. Great Minds Gold Master (`js/games/great-minds.js`)

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
1. Empty check → 2. Starting Pair Guard → 3. Last Round Guard → 4. Cheap Move Guard → 5. Vocabulary Lock *(Secret Mode)* → 6. Too Easy block *(Secret Mode)* → 7. Static Interference → 8. Memory Guard → 9. Signal Boost overlay trigger → 10. `gmProcessLockIn()`

### Key state variables
- `gmPlayerNames[2]`, `gmCurrentPair[2]`, `gmWordA`, `gmWordB`
- `gmRound`, `gmActivePlayer`, `gmCountdownTimer`
- `gmStartingPair[]` — locked at round 1, immutable, contains check entire game
- `gmPrevRoundWords` Set — previous round's pair + clues, exact match
- `gmSessionGuesses` Set — all clues this game (Memory Guard)
- `gmRoundLog[]` — `{ round, pair, guessA, guessB, traceA, traceB, isWin? }`

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

## 9. Secret Signals Gold Master (`js/games/secret-signals.js`)

### Flow
Setup → Players → Vault Gate (×2) → Vault (×2) → Who Encrypts First? → [Round loop: Encrypt → Broadcast → Intercept → Decode Gate → Decode → Resolution] → Endgame Splash → [Phase 2 if Sylly Mode: Tiebreak? → Intel Intro → Intel Guess (×4 keywords) → Intel Summary] → Final Game Over

### Settings
- Intercepts to Win, Difficulty, Categories, Reroll Limit, Timer, Customise Vault, Sylly Mode
- Settings overlay title: "Signal Parameters 🔐"

### Exit routing
- Mid-game quit → `ssResetToMenu()` → `screen-ss-menu`
- Preserves: `ssPlayerNamesA/B`, `ssTeamNames`, `ssPlayerCount`, all `ssSetting*` vars

### Fuzzy matching (`ssFuzzyMatch`)
- Plural/singular aware + compound word aware (hyphen/space split, ≥3 char components)
- Solid compounds (no separator) do NOT auto-split — store as "Weight-Lifting" to enable matching

---

## 10. LI5 (`js/games/li5.js`)

**Settings overlay title:** "Like I'm Five ⭐"
**Settings:** Timer (30/60/90s), Rounds (3/5/10), No-No list size (5/10), Penalty type, Skip cost, Review edits, Sylly Mode

**Exit routing:** Mid-game quit → `resetToMenu()` → `screen-menu`

**Secret Mode addition:** When `isSecretMode` is active, the `btn-play` listener pre-fills team name inputs with "The Radiant" / "The Dire" and sets them `disabled`. `resetToLobby()` re-enables both inputs.

---

## 11. Just Enough Cooks Gold Master (`js/games/jec.js`)

### Flow
LOBBY → JEC MENU → ROSTER → [Round loop: ORDER → PREP (×N players) → SIFTING → TALLY] → WASHUP

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
- Preserves: `jecPlayerNames[]` + all settings; wipes all round state

### Key functions
- `jecStartRound()` — draws food word, routes to ORDER screen
- `jecBuildFrequency()` — normalises all inputs → `jecWordFrequency` + `jecDisplayWords`
- `jecApplyMerge(normA, normB)` — Sous Chef merge; ingredient always wins; poison propagates
- `jecCalcRoundScores()` — per-player scoring with merge-map resolution
- `jecShowWashup()` — ranks players, calls `jecRenderCookBook()`
- `jecApplyExpansionOverrides()` — Secret Mode hook (namespaced — avoids collision with dstw.js global)

---

## 12. You Get It? Gold Master (`js/games/ygi.js`)

### Flow
LOBBY → YGI MENU → YGI SETUP → [Round loop: YGI PROMPT → YGI PASS → YGI INPUT (×N players) → YGI REVEAL → YGI VOTE (×N, Your Call) or THE CONSENSUS → YGI RESULTS] → YGI GAMEOVER
- Vote loop branches on `ygiVerdictStyle`: **Your Call** = PASS GATE → VOTE per player; **The Consensus** = single shared VOTE screen
- If `ygiDecider === 'only-one'` and scores tied at end: SD INTRO → [SD PASS → SD INPUT per finalist] → GAMEOVER

### Screen IDs
`screen-ygi-menu`, `screen-ygi-setup`, `screen-ygi-pass`, `screen-ygi-prompt`, `screen-ygi-input`, `screen-ygi-reveal`, `screen-ygi-vote`, `screen-ygi-results`, `screen-ygi-gameover`, `screen-ygi-sd-intro`, `screen-ygi-sd-input`

### Pass gate reuse
`screen-ygi-pass` is reused for three phases — `ygiPassPhase` flag determines destination:
- `'input'` → `ygiShowInput()` — per-player estimation
- `'vote'` → `ygiShowVoteInput()` — Your Call per-voter
- `'sd'` → `ygiShowSDInput()` — Sudden Death per-finalist

### Settings
| Setting | Options | Default | Internal value |
|---------|---------|---------|----------------|
| Situations | 3 / 5 / 8 | 5 | `ygiRounds` |
| The Decider | Split Take / Solo Take | Split Take | `'close-enough'` / `'only-one'` |
| Full Tally | OFF / ON | OFF | `ygiFullTally` bool |
| Verdict Style | Your Call / The Consensus | Your Call | `'secret-ballot'` / `'open-ballpark'` |
| ✨ Sylly Mode (The Ringer) | OFF / ON | OFF | `ygiRinger` bool |

**Settings overlay title:** "House Rules 📐"

### Verdict Style mechanic
- **Your Call (default):** each player votes privately via pass-gate; `ygiVotes[]` accumulates per-player rankings; `ygiComputeAndShowResults()` fires after all players vote
- **The Consensus:** skip pass-gate; single shared vote screen ("The Consensus 🏟️"); on submit, `ygiVotes` filled with identical rankings for all players; `ygiComputeAndShowResults()` fires immediately

### Scoring
- `VOTE_PTS = [3, 2, 1]` — 1st/2nd/3rd picks in each voter's ranking receive these points
- **Winner bonus:** +2 pts to the entry with the highest raw vote score per round
- **Full Tally OFF (default):** each voter ranks top 3 only; **ON:** ranks all entries
- **Ringer (Sylly Mode):** ghost card injected at sorted position; if ghost wins → everyone −2 pts
- Running total displayed with 🥇🥈🥉 medals for positions 1–3

### Sudden Death
Triggered when `ygiDecider === 'only-one'` and multiple players share the top score. A random question from `YGI_SUDDEN_DEATH_QS[]` is displayed; tied players each enter a number (highest wins). `ygiSuddenDeathPlayers[]` holds finalist indices; `ygiSuddenDeathInputs[]` accumulates their entries.

### Data format (`data/ygi-data.json`)
```json
{
  "id": "ce-001",
  "text": "Prompt text — always contains [ ] as fill-the-blank placeholder",
  "ringers": [
    { "number": 47, "metric": "noun phrase that fills the blank naturally" }
  ]
}
```
- `id` format: `ce-NNN` (legacy prefix retained for data continuity)
- `[ ]` renders as `________` at display time via `.replace('[ ]', '________')`
- `ringers[]` — 5 pre-written `{ number, metric }` pairs; one picked randomly when Sylly Mode is on
- 55+ entries as of Phase 13

### Key state variables
- `ygiRounds`, `ygiDecider`, `ygiFullTally`, `ygiVerdictStyle`, `ygiRinger` — settings
- `ygiPlayerCount`, `ygiPlayerNames[]`, `ygiRound`, `ygiScores[]`
- `ygiRoundLog[]` — `{ round, prompt, entries[] }` — accumulated in `ygiShowResults()`, raw `[ ]` text stored
- `ygiRoundLogIdx` — current carousel position in The Record
- `ygiLineup[]` — `{ number, metric, playerIdx, isGhost }` sorted low→high (ghost injected at sorted position)
- `ygiVotes[]` — `{ voterIdx, rankings: [lineupIdx...] }`
- `ygiPassPhase` — `'input'` | `'vote'` | `'sd'`
- `ygiCurrentRinger` — `{ number, metric }` | null
- `ygiSuddenDeathPlayers[]`, `ygiSuddenDeathInputs[]`, `ygiSuddenDeathQ`

### Key functions
- `ygiLoadData()` — async; fetches `data/ygi-data.json` into `ygiAllPrompts[]` (once)
- `ygiStartGame()` — resets all state, loads data if needed, starts round 1
- `ygiShowReveal()` — builds sorted lineup, injects ghost, renders cards
- `ygiShowOpenBallparkVote()` — shared group vote (The Consensus — all entries, no exclusion)
- `ygiShowVoteInput()` — individual vote for `ygiCurrentVoterIdx` (excludes own entry)
- `ygiRenderVoteCards()` — renders tap-to-rank cards; shared by both vote modes
- `ygiComputeAndShowResults()` — tallies `ygiVotes`, applies winner bonus, updates `ygiScores`
- `ygiShowFinalStandings()` — renders gameover podium + triggers `ygiRenderRoundLog()`
- `ygiRenderRoundLog()` — renders current `ygiRoundLogIdx` carousel card (prompt + all entries)
- `ygiShowSuddenDeathIntro()` — renders SD intro with tied player names + random question
- `ygiShowSDInput()` — SD number entry for current finalist; advances until all done

### Exit routing
- Mid-game ✕ → `ygi-quit-overlay` → `screen-ygi-menu` (preserves names + settings)
- "Run It Back" on gameover → `ygi-run-it-back-overlay` → confirm restarts game; cancel dismisses
- Post-game ✕ and "← Back to the Box" → `resetToLobby()`

### Overlays
| Overlay | Pattern |
|---------|---------|
| `ygi-settings-overlay` | Data (slide-up) — "House Rules 📐" |
| `ygi-how-to-overlay` | Data (slide-up) |
| `ygi-quit-overlay` | Decision modal |
| `ygi-run-it-back-overlay` | Decision modal — "Run It Back?" confirm |

---

## 13. Secret Mode (`js/secret-mode.js`)

**Global state:**
- `isSecretMode` (bool), `activeExpansion` (string), `secretWords` (array)
- `window.activeExpansionOverrides` — settings pushed to plugins at launch
- `window.activeExpansionData` — `{ vocab: Set, byCategory: {}, misc: [] }` built by `smBuildExpansionData()`

**Key functions:**
- `smBuildExpansionData(words)` — builds vocab Set (normalised) + category/misc display data
- `smLaunch()` — async; fetches JSON, builds expansion data, writes overrides, navigates
- `smOpenVocabOverlay()` / `smRenderVocabTabs()` / `smRenderVocabList()` — vocab reference UI
- `resetSecretMode()` — full teardown; called by `resetToLobby()` via forward reference

---

## 14. PWA / Service Worker

**Current version:** v73 (`CACHE_NAME = 'sylly-games-v73'`)

**Precached assets:**
```
./, index.html, css/styles.css,
js/engine.js, js/games/li5.js, js/games/great-minds.js,
js/games/secret-signals.js, js/games/jec.js, js/games/ygi.js, js/secret-mode.js, js/app.js,
js/lib/tailwind-play.js, data/words.json, data/secret_words.json, data/ygi-data.json, manifest.json
```

**Rule:** Bump SW version on every deploy. Any change to a precached asset requires a version bump or the browser will serve stale content.

---

## 15. Checklist: Adding a New Game

- [ ] Create `js/games/[game-name].js`
- [ ] Add `<script>` tag to `index.html` (after `ygi.js`, before `secret-mode.js`)
- [ ] Add all screen IDs to `allScreens[]` in `engine.js`
- [ ] Add lobby button → game menu screen (not directly into setup)
- [ ] Add game menu: Play CTA, How to Play, Settings, ← Back to the Box
- [ ] Add settings: game options, ✨ Sylly Mode last
- [ ] Every button label: **no ✓** — plain text only for Done, submit, and confirm buttons
- [ ] Overlays: data overlay (slide-up, Pattern 1) or decision modal (Pattern 2) — no third pattern
- [ ] Each settings card: white `rounded-2xl p-4 shadow-sm`; pill buttons use `pill-active-[game-colour]`
- [ ] Gameover screen: celebration/standings visible without scroll; round log below the fold
- [ ] Gameplay screens with fixed header + footer: use `flex-1 overflow-y-auto flex flex-col` + `my-auto` on inner content div for vertical centering
- [ ] Add `applyExpansionOverrides()` read at settings-apply point for Secret Mode compatibility
- [ ] Add precache entries to `sw.js` and bump SW version
- [ ] Add section to `docs/code-map.md` and `.claude/rules/game-identities.md`
- [ ] Add game to Universal Menu Standard table in this snapshot (Section 5) and `.claude/rules/ui-style.md`
- [ ] Run a doc sweep before archiving the phase:
  - `docs/phase-N-snapshot.md` — update file structure, load order, game section, SW version, Universal Menu table
  - `docs/code-map.md` — all new screen/overlay/button/function IDs; update "Updated:" header
  - `CLAUDE.md` — Project Structure, load order, sw.js version, Current Focus
  - `.claude/rules/game-identities.md` — new game section with full settings table + overlay types
  - `.claude/rules/logic-engine.md` — SW version + precache list
  - `.claude/rules/ui-style.md` — Universal Menu Standard table
