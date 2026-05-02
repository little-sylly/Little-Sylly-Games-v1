# Code Map — Little Sylly Games
**Purpose:** Surgical reference for editing. Uses element IDs (stable) not line numbers (shift).
**Updated:** Phase 13

---

## How to use this
1. Find the game you're editing below.
2. Copy the relevant ID and `Ctrl+F` it in `index.html` or the JS file.
3. Cross-reference the key functions list to find the right entry point.

---

## Global / Engine

**JS file:** `js/engine.js`

### Screens
| ID | Purpose |
|----|---------|
| `#screen-lobby` | Game selection — main title screen |

### Overlays
| ID | Pattern | Opened by |
|----|---------|-----------|
| `#sound-overlay` | Decision modal | `.btn-open-sound` (any screen) |

### Key buttons
| ID | Action |
|----|--------|
| `#btn-dstw` | Lobby → LI5 menu |
| `#btn-great-minds` | Lobby → GM menu |
| `#btn-sylly-signals` | Lobby → SS menu |
| `#btn-jec` | Lobby → JEC menu |
| `#lobby-icon` | Secret Mode tap counter (7 taps → controller screen) |
| `.btn-open-sound` | Opens `#sound-overlay` (on every screen) |
| `#global-mute-toggle` | Mute toggle inside sound overlay |

### Key functions
| Function | Purpose |
|----------|---------|
| `showScreen(id)` | Hide all screens, show target |
| `resetToLobby()` | Full cold boot → lobby; calls all game teardowns |
| `resetToMenu()` | LI5 only — stops timer, hides LI5 overlays → `#screen-menu` |
| `normaliseWord(w)` | Lowercase + trim + plural strip (used by GM, JEC) |
| `shuffle(arr)` | Fisher-Yates, returns new array |
| `openSoundOverlay()` | Opens `#sound-overlay`, syncs mute state |

---

## Like I'm Five (LI5)

**JS file:** `js/games/li5.js`
**Brand colour:** `pink-500`
**Lobby button:** `#btn-dstw`

### Screens
| ID | Purpose |
|----|---------|
| `#screen-menu` | Game menu (Let's Play!, How to Play, Settings, Back to the Box) |
| `#screen-setup` | Team name entry |
| `#screen-gatekeeper` | Pass-the-phone gate |
| `#screen-active-play` | Active timer + describe screen |
| `#screen-gameover` | Score summary |

### Overlays
| ID | Pattern | Opened by |
|----|---------|-----------|
| `#settings-overlay` | Data (slide-up) | `#btn-settings` |
| `#how-to-overlay` | Data (slide-up) | `#btn-how-to` |
| `#quit-overlay` | Decision modal | ✕ during active play |
| `#skip-turn-overlay` | Decision modal | Skip button |
| `#review-overlay` | Data (slide-up) | Review edits button |
| `#history-overlay` | Data (slide-up) | Score history button |
| `#pause-overlay` | Inline (inside `#screen-active-play`) | Pause button |
| `#deck-panel` | Data (slide-up) | Word deck button |

### Key buttons
| ID | Action |
|----|--------|
| `#btn-play` | Menu → setup |
| `#btn-settings` | Open `#settings-overlay` |
| `#btn-how-to` | Open `#how-to-overlay` |
| `#btn-back-to-box` | `resetToLobby()` |
| `#btn-quit-confirm` | Confirm quit → `resetToMenu()` → `#screen-menu` |
| `#btn-quit-cancel` | Close `#quit-overlay` |
| `#btn-mute` | Instant mute toggle (active play only — no overlay) |

### Key functions
| Function | Purpose |
|----------|---------|
| `loadWords()` | Loads `data/words.json` into `allWords[]` (also used by JEC) |
| `applySettings()` | Reads pill state → sets game settings |
| `applyExpansionOverrides()` | Secret Mode hook — reads `window.activeExpansionOverrides` |
| `startGatekeeper()` | Routes to `#screen-gatekeeper` |
| `startRound()` | Draws word, starts timer, shows `#screen-active-play` |
| `endRound()` | Stops timer, tallies scores, routes to `#screen-gameover` |

---

## Great Minds (GM)

**JS file:** `js/games/great-minds.js`
**Brand colour:** `violet-500`
**Lobby button:** `#btn-great-minds`

### Screens
| ID | Purpose |
|----|---------|
| `#screen-gm-menu` | Game menu |
| `#screen-gm-setup` | Player name entry |
| `#screen-gm-input` | Player clue input (alternates P1/P2) |
| `#screen-gm-pass-gate` | Pass-the-phone gate |
| `#screen-gm-reveal-gate` | Second pass gate before reveal |
| `#screen-gm-reveal` | Show both clues + countdown |
| `#screen-gm-result` | Round result |
| `#screen-gm-concede` | End screen for Sever Link (Secret Mode) |

### Overlays
| ID | Pattern | Opened by |
|----|---------|-----------|
| `#gm-settings-overlay` | Data (slide-up) | `#btn-gm-menu-settings` |
| `#gm-how-to-overlay` | Data (slide-up) | `#btn-gm-menu-how-to` |
| `#gm-deck-panel` | Data (slide-up) | Deck button on input screen |
| `#gm-vocab-overlay` | Data (slide-up, terminal style) | `#gm-vocab-list-btn` (Secret Mode) |
| `#gm-boost-overlay` | Decision modal | Signal Boost trigger (R5+) |
| `#gm-near-sync-overlay` | Decision modal | Near-sync detection |
| `#gm-override-overlay` | Decision modal | "Actually, that counts" |
| `#gm-new-frequency-overlay` | Decision modal | Session Terminal (new game request) |
| `#gm-neural-library-overlay` | Decision modal | `?` inside boost overlay |
| `#gm-concede-overlay` | Decision modal | Sever Link (Secret Mode, R11+) |
| `#gm-quit-overlay` | Decision modal | ✕ during active play |

### Key buttons
| ID | Action |
|----|--------|
| `#btn-gm-menu-back` | `resetToLobby()` |
| `#btn-gm-menu-settings` | Open `#gm-settings-overlay` |
| `#btn-gm-menu-how-to` | Open `#gm-how-to-overlay` |
| `#btn-gm-quit-confirm` | Confirm quit → `showScreen('screen-gm-menu')` |
| `#gm-vocab-list-btn` | Open `#gm-vocab-overlay` (hidden until Vocab Lock triggers) |
| `#btn-gm-sever-link` | Open `#gm-concede-overlay` (Secret Mode R11+) |

### Key functions
| Function | Purpose |
|----------|---------|
| `gmBuildPool()` | Builds word pair pool from selected categories |
| `gmNewRound()` | Draws pair, sets up input screen |
| `gmLockIn()` | Validates + processes player clue input |
| `gmHandleMatch()` | Win detection + Neural Link sequence |
| `gmApplyExpansionOverrides()` | Secret Mode hook |
| `smOpenVocabOverlay()` | *(in secret-mode.js)* Opens vocab reference overlay |

---

## Secret Signals (SS)

**JS file:** `js/games/secret-signals.js`
**Brand colour:** `teal-500`
**Lobby button:** `#btn-sylly-signals`

### Screens
| ID | Purpose |
|----|---------|
| `#screen-ss-menu` | Game menu |
| `#screen-ss-setup` | Game settings confirmation |
| `#screen-ss-players` | Player name entry |
| `#screen-ss-vault-gate` | Pass-the-phone gate before vault reveal |
| `#screen-ss-vault` | Team keyword vault display |
| `#screen-ss-first-team` | Who encrypts first? |
| `#screen-ss-encrypt` | Encoder picks keyword to encrypt |
| `#screen-ss-broadcast` | Broadcast screen (timer + clue display) |
| `#screen-ss-intercept` | Intercepting team guesses |
| `#screen-ss-decode-gate` | Pass gate before decode |
| `#screen-ss-decode` | Decoding team enters answer |
| `#screen-ss-resolution` | Round result |
| `#screen-ss-gameover` | Match over splash |
| `#screen-ss-tiebreak` | Tiebreak prompt |
| `#screen-ss-intel-intro` | Sylly Mode Phase 2 intro |
| `#screen-ss-intel-guess` | Intel Phase guessing |
| `#screen-ss-intel-summary` | Intel Phase summary |

### Overlays
| ID | Pattern | Opened by |
|----|---------|-----------|
| `#ss-settings-overlay` | Data (slide-up) | `#btn-ss-settings` |
| `#ss-how-to-overlay` | Data (slide-up) | `#btn-ss-how-to` |
| `#ss-quit-overlay` | Decision modal | ✕ during active play |
| `#ss-play-again-overlay` | Decision modal | Play again prompt |
| `#ss-override-overlay` | Decision modal | Score override |

### Key buttons
| ID | Action |
|----|--------|
| `#btn-ss-back` | `resetToLobby()` (on SS menu) |
| `#btn-ss-settings` | Open `#ss-settings-overlay` |
| `#btn-ss-how-to` | Open `#ss-how-to-overlay` |
| `#btn-ss-quit-confirm` | Confirm quit → `ssResetToMenu()` → `#screen-ss-menu` |

### Key functions
| Function | Purpose |
|----------|---------|
| `ssOpenSettings()` | Syncs UI state + opens `#ss-settings-overlay` |
| `ssResetToMenu()` | Stops timers, resets round state, preserves names+settings → `#screen-ss-menu` |
| `ssNextRound()` | Advances round, rotates encoder |
| `ssFuzzyMatch(a, b)` | Plural/compound-aware word equivalence check |
| `ssApplyExpansionOverrides()` | Secret Mode hook |

---

## Just Enough Cooks (JEC)

**JS file:** `js/games/jec.js`
**Brand colour:** `amber-500`
**Lobby button:** `#btn-jec`

### Screens
| ID | Purpose |
|----|---------|
| `#screen-jec-menu` | Game menu |
| `#screen-jec-roster` | Player name entry |
| `#screen-jec-order` | Today's Order reveal |
| `#screen-jec-prep` | Ingredient input (per player, pass-the-phone) |
| `#screen-jec-sifting` | Ingredient frequency reveal + Sous Chef Oversight |
| `#screen-jec-tally` | Per-round score reveal |
| `#screen-jec-washup` | Final leaderboard |

### Overlays
| ID | Pattern | Opened by |
|----|---------|-----------|
| `#jec-settings-overlay` | Data (slide-up) | `#btn-jec-menu-settings` |
| `#jec-how-to-overlay` | Data (slide-up) | `#btn-jec-menu-how-to` |
| `#jec-quit-overlay` | Decision modal | ✕ during active play |
| `#jec-oversight-overlay` | Decision modal | Second sifting card tap |
| `#jec-new-shift-overlay` | Decision modal | New Shift button on washup |

### Key buttons
| ID | Action |
|----|--------|
| `#btn-jec-menu-back` | `resetToLobby()` (on JEC menu) |
| `#btn-jec-menu-settings` | Open `#jec-settings-overlay` |
| `#btn-jec-menu-how-to` | Open `#jec-how-to-overlay` |
| `#btn-jec-quit-confirm` | Confirm quit → `jecResetForNewGame()` → `#screen-jec-menu` |

### Key functions
| Function | Purpose |
|----------|---------|
| `jecStartRound()` | Draws food word → `#screen-jec-order` |
| `jecStartPlayerPrep()` | Sets up `#screen-jec-prep` for current player |
| `jecSubmitIngredients()` | Validates + stores, advances to next player or sifting |
| `jecBuildFrequency()` | Normalises all inputs → `jecWordFrequency` map |
| `jecStartSifting()` | Builds sifting screen + Health Inspector chips |
| `jecApplyMerge(normA, normB)` | Sous Chef Oversight merge |
| `jecCalcRoundScores()` | Scoring with merge-map resolution |
| `jecResetForNewGame()` | Reset round state, preserve names+settings → `#screen-jec-menu` |
| `jecApplyExpansionOverrides()` | Secret Mode hook (namespaced — avoids collision with LI5's global) |

---

## You Get It? (YGI)

**JS file:** `js/games/ygi.js`
**Brand colour:** `orange-500`
**Lobby button:** `#btn-ygi`
**Data file:** `data/ygi-data.json`

### Screens
| ID | Purpose |
|----|---------|
| `#screen-ygi-menu` | Game menu |
| `#screen-ygi-setup` | Player name entry |
| `#screen-ygi-pass` | Pass-the-phone gate (host/next player hand-off) — reused for input/vote/SD via `ygiPassPhase` |
| `#screen-ygi-prompt` | Group view of The Situation (shown to room before input loop) |
| `#screen-ygi-input` | The Situation input — number + metric per player |
| `#screen-ygi-reveal` | The Lineup — all Takes revealed |
| `#screen-ygi-vote` | Vote ranking screen (Your Call per player; The Consensus shared) |
| `#screen-ygi-results` | Per-round results with running totals + medals |
| `#screen-ygi-gameover` | Final standings + The Record carousel |
| `#screen-ygi-sd-intro` | Sudden Death intro — tied finalist names + random question |
| `#screen-ygi-sd-input` | Sudden Death number entry per finalist (pass-the-phone) |

### Overlays
| ID | Pattern | Opened by |
|----|---------|-----------|
| `#ygi-settings-overlay` | Data (slide-up) | `#btn-ygi-menu-settings` |
| `#ygi-how-to-overlay` | Data (slide-up) | `#btn-ygi-menu-how-to` |
| `#ygi-quit-overlay` | Decision modal | ✕ during active play |
| `#ygi-run-it-back-overlay` | Decision modal | "Run It Back" button on gameover screen |

### Key buttons
| ID | Action |
|----|--------|
| `#btn-ygi-menu-back` | `resetToLobby()` (on YGI menu) |
| `#btn-ygi-menu-settings` | Open `#ygi-settings-overlay` |
| `#btn-ygi-menu-how-to` | Open `#ygi-how-to-overlay` |
| `#btn-ygi-quit-confirm` | Confirm quit → `showScreen('screen-ygi-menu')` |
| `#btn-ygi-reveal-next` | → vote pass gate (Your Call) or `ygiShowOpenBallparkVote()` |
| `#btn-ygi-vote-submit` | Submit rankings → next voter or `ygiComputeAndShowResults()` |
| `#btn-ygi-log-prev` | The Record: previous round card |
| `#btn-ygi-log-next` | The Record: next round card |
| `#btn-ygi-run-confirm` | Confirm "Run It Back" → restarts game with same players + settings |
| `#btn-ygi-run-cancel` | Dismiss `#ygi-run-it-back-overlay` without restarting |

### Key functions
| Function | Purpose |
|----------|---------|
| `ygiLoadData()` | Async — fetches `data/ygi-data.json`, populates `ygiAllPrompts[]` (once) |
| `ygiStartGame()` | Resets all state, shows setup screen |
| `ygiShowInput()` | Input screen for current player |
| `ygiShowReveal()` | Builds and shows The Lineup |
| `ygiShowVotePassGate()` | Pass-phone gate before Your Call voting |
| `ygiShowVoteInput()` | Vote ranking screen per player (Your Call) |
| `ygiShowOpenBallparkVote()` | Shared group vote (The Consensus) — single submit fills all voters |
| `ygiComputeAndShowResults()` | Tallies votes, computes scores, shows results |
| `ygiShowResults()` | Round results with running totals + 🥇🥈🥉 medals |
| `ygiShowFinalStandings()` | Final podium + seeds The Record, calls `ygiRenderRoundLog()` |
| `ygiRenderRoundLog()` | Renders current Record card (driven by `ygiRoundLogIdx`) |
| `ygiShowSuddenDeathIntro()` | Renders SD intro screen — tied finalist names + random question |
| `ygiShowSDInput()` | SD number entry for current finalist; advances until all done |

---

## Late To The Party (LTTP)

**JS file:** `js/games/lttp.js`
**Brand colour:** `red-500`
**Lobby button:** `#btn-lttp`

### Screens
| ID | Purpose |
|----|---------|
| `#screen-lttp-menu` | Title card + Get the Address! CTA |
| `#screen-lttp-setup` | Player count + names |
| `#screen-lttp-role-reveal` | Private role check — shown after pass-gate handover |
| `#screen-lttp-handover` | Pass gate between turns + plan-end transitions |
| `#screen-lttp-chat` | Main interrogation hub (active player's turn) |
| `#screen-lttp-guess` | Plan 4 vote + pin phase (pass-the-phone) |
| `#screen-lttp-gameover` | Full reveal + Friendship Points tally |

### Overlays
| ID | Pattern | Opened by |
|----|---------|-----------|
| `#lttp-map-overlay` | Data (slide-up) z-[95] | `lttpOpenMapOverlay()` via `#btn-lttp-chat-map` or `#btn-lttp-guess-map` |
| `#lttp-suspicion-overlay` | Decision modal z-[80] | `lttpOpenSuspicionOverlay()` via `#btn-lttp-chat-suspicion` |
| `#lttp-settings-overlay` | Data (slide-up) z-[80] | `#btn-lttp-menu-settings` |
| `#lttp-how-to-overlay` | Data (slide-up) z-[90] | `#btn-lttp-menu-how-to` |
| `#lttp-quit-overlay` | Decision modal z-[80] | `.btn-lttp-quit-open` (any gameplay screen) |

### Key chat elements
| ID | Purpose |
|----|---------|
| `#lttp-chat-plan-label` | "Plan N of 4" |
| `#lttp-chat-player-label` | "IT'S [NAME]'S TURN" |
| `#lttp-chat-player-list` | JS-rendered player buttons (greyed = already answered) |
| `#lttp-chat-history` | Group Chatlog feed (most recent 6) |
| `#lttp-chat-notes` | Private per-player scratchpad textarea |
| `#lttp-map-grid` | 4×4 grid cells (role-aware, JS-rendered) |
| `#lttp-suspicion-list` | Suspicion tracker rows (JS-rendered) |

### Key guess-phase elements
| ID | Purpose |
|----|---------|
| `#lttp-guess-pass-gate` | Pass-gate div (shown between voters) |
| `#lttp-guess-action` | Action div (shown when active player acts) |
| `#lttp-guess-grid` | 4×4 pin grid for The Stray |
| `#lttp-guess-vote-list` | Player vote buttons for non-Stray |

### Key functions
| Function | Purpose |
|----------|---------|
| `lttpBuildGrid(allWords)` | Selects 16 places, sets address, seeds 6 highlights + fake targets |
| `lttpAssignRoles()` | Random Stray + Joker assignment |
| `lttpStartGame()` | Full state reset → fetch words → build → roles → role-reveal |
| `lttpShowRoleReveal(idx)` | Role-aware private reveal screen |
| `lttpShowHandover(toIdx, msg)` | Pass gate — `msg` non-null triggers plan-transition text |
| `lttpShowChat(playerIdx)` | Main turn screen — renders player list + history + notes |
| `lttpSelectPlayer(targetIdx)` | Core lap logic — logs history, checks lap complete, routes |
| `lttpNarrowHighlights()` | 6→3→1 narrowing + logs plan snapshot |
| `lttpOpenMapOverlay()` | Role-aware 4×4 grid — IC red, Joker gold+orange, Stray annotatable |
| `lttpOpenSuspicionOverlay()` | Suspicion tracker modal |
| `lttpStartGuessPhase()` | Begins Plan 4 vote/pin pass-the-phone sequence |
| `lttpShowGuess(playerIdx)` | Role-aware action — Stray pins, IC votes |
| `lttpComputeAndShowGameover()` | Scores via priority cascade → gameover |
| `lttpRenderPlanLog()` | Plan log carousel driven by `lttpPlanLogIdx` |
| `resetLateToTheParty()` | Full teardown; called by `resetToLobby()` |

### Win condition priority (highest → lowest)
1. **Joker Prank** — Stray pins a fake target → Joker +20 wins
2. **Stray Pin** — Stray pins correct address → Stray +10 wins
3. **Confusion Bonus** — more wrong votes than correct → Stray auto-wins
4. **IC wins** — Stray missed, no confusion → IC +5 each

---

## Secret Mode

**JS file:** `js/secret-mode.js`

### Screens
| ID | Purpose |
|----|---------|
| `#screen-secret-controller` | Konami Code input (NES controller UI) |
| `#screen-secret-terminal` | Sylly-OS Terminal — expansion + game selector |

### Overlays
| ID | Pattern | Opened by |
|----|---------|-----------|
| `#gm-vocab-overlay` | Data (slide-up, terminal style) | `smOpenVocabOverlay()` |

### Key terminal elements
| ID | Purpose |
|----|---------|
| `#sm-terminal-log` | Typewriter output area |
| `#sm-terminal-expansions` | Expansion selector buttons (injected by JS) |
| `#sm-terminal-games` | Game selector buttons (injected by JS) |
| `#sm-terminal-settings` | Active settings summary (injected by JS) |
| `#sm-terminal-launch-wrap` | Launch button container |
| `#sm-terminal-launch` | `[ LAUNCH SEQUENCE ]` button |
| `#sm-terminal-back` | ← BACK (returns to lobby) |

### Key controller elements
| ID | Purpose |
|----|---------|
| `#sm-btn-up/down/left/right` | D-pad buttons |
| `#sm-btn-select` | SELECT button |
| `#sm-btn-start` | START button |
| `#sm-btn-b` | B button |
| `#sm-btn-a` | A button |

### Key functions
| Function | Purpose |
|----------|---------|
| `smLaunch()` | Fetches expansion JSON, builds data, writes overrides, navigates |
| `smBuildExpansionData(words)` | Builds `window.activeExpansionData` vocab Set + category map |
| `smOpenVocabOverlay()` | Opens GM vocab reference overlay |
| `resetSecretMode()` | Full teardown; called by `resetToLobby()` |

### Key config objects
| Name | Purpose |
|------|---------|
| `SM_TERMINAL_CONFIG` | Expansion list + game list (add new expansions/games here) |
| `SM_EXPANSION_OVERRIDES` | Per-expansion forced settings pushed to plugins |
| `SM_SETTINGS_DISPLAY` | Per-game setting label/formatter map for terminal summary |

---

## Expansion Override Pattern (all games)

Each plugin reads `window.activeExpansionOverrides` at its settings-apply point when `isSecretMode` is true. This is the **push model** — Terminal writes, plugins read. Engine never touches plugin state.

**Default word pool in Secret Mode:** Each plugin should check `if (isSecretMode && secretWords.length)` and use `secretWords` (or a category-filtered subset) instead of `allWords`. If no specific `SM_EXPANSION_OVERRIDES` entry exists for a game, this is the minimum expected behaviour.

**Vocab Lock reuse:** Any game can check `window.activeExpansionData.vocab.has(normaliseWord(input))` and call `smOpenVocabOverlay()` to expose the word list. Wire a hidden button (revealed on failure) per `#gm-vocab-list-btn` pattern.

---

## Overlay Patterns Quick Reference

| Pattern | Classes | Use for |
|---------|---------|---------|
| Data (slide-up) | `overlay-data-backdrop` / `overlay-data-inner settings-slide-up rounded-t-3xl` | Settings, how-to, word lists, history |
| Decision modal | `overlay-modal-backdrop` / `overlay-modal-inner` | Quit confirms, short prompts, ≤3 actions |

**First element inside every `overlay-data-inner`:** thematic title block — heading + optional subtitle, `border-b`, `flex-shrink-0`.

**`scrollTop = 0`** must be called on the `overlay-data-inner` element before setting `display: flex`.
