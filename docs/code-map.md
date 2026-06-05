# Code Map — Little Sylly Games
**Purpose:** Surgical reference for editing. Uses element IDs (stable) not line numbers (shift).
**Updated:** Phase 25 (multiplayer polish + host-only audit)

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
| `#screen-who-first` | Shared "Who Goes First?" — method picker → RPS declare → winner choice |

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
| `#btn-ygi` | Lobby → YGI menu |
| `#btn-lttp` | Lobby → LTTP menu |
| `#btn-nat` | Lobby → NAT menu |
| `#btn-dsd` | Lobby → DSD menu |
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
| `showWhoFirst(config)` | Drives `#screen-who-first`; calls `config.onResult(goesFirstIdx)` on completion |

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
| `#li5-play-again-overlay` | Decision modal | "New Playgroup?" play-again confirmation — `#btn-li5-play-again` |

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
| *(Who Encrypts First)* | Handled by engine `showWhoFirst()` — see Engine section |

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
| `#screen-lttp-menu` | Title card + "Find The Location!" CTA |
| `#screen-lttp-setup` | Player count + names |
| `#screen-lttp-briefing` | Plan start/transition — session summary (Tonight's Plans / Plans Updated), first active player named |
| `#screen-lttp-role-reveal` | Private role check — shown after pass-gate handover |
| `#screen-lttp-handover` | Pass gate between turns + plan-end transitions; shows message text in chat mode |
| `#screen-lttp-chat` | Main interrogation hub (active player's turn) |
| `#screen-lttp-guess` | Plan 4 vote + pin phase (pass-the-phone) |
| `#screen-lttp-group-guess` | Group Vote mode — shared guess reveal screen |
| `#screen-lttp-gameover` | Full reveal + Friendship Points tally |

### Overlays
| ID | Pattern | Opened by |
|----|---------|-----------|
| `#lttp-suspicion-overlay` | Data (slide-up) z-[80] | `lttpOpenSuspicionOverlay()` / `lttpOpenPlayerFolder()` |
| `#lttp-history-overlay` | Data (slide-up) z-[90] | `lttpOpenFullHistory()` |
| `#lttp-settings-overlay` | Data (slide-up) z-[80] | `#btn-lttp-menu-settings` |
| `#lttp-how-to-overlay` | Data (slide-up) z-[90] | `#btn-lttp-menu-how-to` |
| `#lttp-confirm-overlay` | Decision modal z-[80] | `lttpOpenConfirmModal()` — free-text message input (Phase 21a) |
| `#lttp-quit-overlay` | Decision modal z-[80] | `.btn-lttp-quit-open` (any gameplay screen) |

### Message Flow state (Phase 21a — replaces Small Talk)
| Variable | Purpose |
|----------|---------|
| `lttpPendingTarget` | Player index currently being messaged |
| `lttpHistory` | `[{asker, asked, plan, messageText}]` — full chat log; `messageText` is the free-text message |

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
| `#lttp-guess-grid` | 4×4 pin grid for Friend of a Friend |
| `#lttp-guess-vote-list` | Player vote buttons for The Gang |

### Key functions
| Function | Purpose |
|----------|---------|
| `lttpBuildGrid(allWords)` | Selects 16 places, sets address, seeds 6 highlights + fake targets |
| `lttpAssignRoles()` | Random Friend of a Friend + Troublemaker assignment |
| `lttpStartGame()` | Full state reset → fetch words → build → roles → role-reveal |
| `lttpShowRoleReveal(idx)` | Role-aware private reveal screen |
| `lttpShowHandover(toIdx, msg)` | Pass gate — `msg` non-null triggers plan-transition text; in chat mode shows message + "Read aloud" instruction |
| `lttpShowChat(playerIdx)` | Main turn screen — renders player list + history + notes |
| `lttpOpenConfirmModal(targetIdx)` | Opens `lttp-confirm-overlay` with free-text message input for `targetIdx` |
| `lttpSelectPlayer(targetIdx, messageText)` | Core lap logic — logs `{asker, asked, plan, messageText}` to history, checks lap complete, routes |
| `lttpNarrowHighlights()` | 6→3→1 narrowing + logs plan snapshot |
| `lttpOpenMapOverlay()` | Role-aware 4×4 grid — The Gang: red, The Troublemaker: gold+purple, Friend of a Friend: annotatable |
| `lttpOpenFullHistory()` | Full history log overlay |
| `lttpOpenPlayerFolder(idx)` | Opens suspicion overlay at a specific player's folder |
| `lttpStartGuessPhase()` | Begins Plan 4 vote/pin pass-the-phone sequence |
| `lttpShowGuess(playerIdx)` | Role-aware action — Friend of a Friend pins, The Gang votes |
| `lttpComputeAndShowGameover()` | Scores via priority cascade → gameover |
| `lttpRenderPlanLog()` | Plan log carousel driven by `lttpPlanLogIdx` |
| `resetLateToTheParty()` | Full teardown; called by `resetToLobby()` |

### Win condition priority (highest → lowest)
1. **Troublemaker Prank** — Friend of a Friend pins a fake target → The Troublemaker +20 wins
2. **Friend of a Friend Pin** — Friend of a Friend pins correct address → +10 wins
3. **Confusion Bonus** — more wrong votes than correct → Friend of a Friend auto-wins
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

## Natural Selection (NAT)

**JS file:** `js/games/nat.js`
**Brand colour:** `lime-600`
**Lobby button:** `#btn-nat`

### Screens
| ID | Purpose |
|----|---------|
| `#screen-nat-menu` | Game menu — "Begin Observation" CTA |
| `#screen-nat-setup` | Player count + name entry |
| `#screen-nat-handover` | Pass-the-phone gate (before each observation day + role reveal) |
| `#screen-nat-observation` | Journal entry — each player submits one clue word per day |
| `#screen-nat-daily-review` | **Sylly Mode only** — all clues revealed at end of day before voting |
| `#screen-nat-selection` | Eviction vote — players vote to identify The Mole |
| `#screen-nat-last-stand` | Mole's final specimen guess + Lead Biologist verdict |
| `#screen-nat-tally` | Per-match score reveal (Credibility totals) |
| `#screen-nat-gameover` | Final expedition report + round log |

### Overlays
| ID | Pattern | Opened by |
|----|---------|-----------|
| `#nat-settings-overlay` | Data (slide-up) z-[80] | `#btn-nat-menu-settings` / `natOpenSettings()` |
| `#nat-how-to-overlay` | Data (slide-up) z-[90] | `#btn-nat-menu-howto` / `natOpenHowTo()` |
| `#nat-quit-overlay` | Decision modal z-[80] | `.btn-nat-quit-open` (any gameplay screen) |
| `#nat-new-expedition-overlay` | Decision modal z-[90] | "New Expedition?" play-again confirmation |

### Key state variables
| Variable | Default | Options |
|----------|---------|---------|
| `natMatchesSetting` | `3` | `3 \| 4 \| 5` |
| `natRoundsPerMatch` | `2` | `2 \| 3 \| 4` |
| `natDifficulty` | `'d1+d2'` | `'d1' \| 'd1+d2' \| 'all'` |
| `natVotingMode` | `'consensus'` | `'consensus' \| 'independent'` |
| `natScientificIntegrity` | `'relaxed'` | `'relaxed' \| 'peer-review'` |
| `natEscapePoints` | `10` | `10 \| 15 \| 20` |
| `natSyllyMode` | `false` | bool |
| `natCumulativeClues` | `false` | bool — Research Log setting; Field Researchers see all previous assigned words stacked |
| `natBiologistIdx` | `-1` | player index |
| `natMoleIdx` | `-1` | player index |
| `natAssignedWords[]` | `[]` | detail word per player |
| `natClueStatuses[][]` | `[]` | `'normal' \| 'review' \| 'discredited'` per player per day |

### Key functions
| Function | Purpose |
|----------|---------|
| `natInit()` | Sets `activeGameId = 'nat'` → `#screen-nat-menu` |
| `natApplySettings()` | Reads pill state → updates all nat* settings vars |
| `natStartGame()` | Resets state, builds player roster → starts first match |
| `natStartMatch()` | Draws specimen, assigns roles → handover |
| `natAssignRoles()` | Shuffles players: index 0 = Mole, index 1 = Biologist, rest = Researchers |
| `natGetWordForPlayer(idx)` | Returns role-appropriate word: Biologist → `specimen.word`, Mole → `nono_list[0]`, Researcher → assigned detail word |
| `natShowHandover(idx)` | Pass gate — shows role-aware instruction before each player's turn |
| `natShowObservation()` | Journal entry screen for current player |
| `natSubmitObservation()` | Validates + stores clue; advances to next player or selection |
| `natShowDailyReview()` | **Sylly Mode** — reveals all day's clues before voting begins |
| `natShowSelection()` | Eviction vote screen (consensus or pass-the-phone per `natVotingMode`) |
| `natDispute(playerIdx, dayIdx)` | **Peer Review** — cycles clue status: normal → review → discredited |
| `natResolveEviction()` | Tallies votes, applies tie-break (lowest Credibility), sets `natEvictedIdx` |
| `natShowLastStand()` | Mole's final specimen identification guess |
| `natBiologistVerdict()` | Lead Biologist confirms or disputes Mole's guess → scoring |
| `natShowTally()` | Credibility score reveal for the completed match |
| `natNextMatch()` | Advances to next match or gameover |
| `natShowGameover()` | Final expedition report with round log |
| `natResetState()` | Full teardown; called by `resetToLobby()` |

---

## Deep-Sea Deploy (DSD)

**Game ID:** `dsd`
**JS file:** `js/games/dsd.js`
**Brand colour:** `cyan-700` | **Active pill:** `pill-active-cyan`
**Lobby button:** `#btn-dsd`
**Updated:** Phase 19

### Screens
| Screen ID | Purpose |
|-----------|---------|
| `screen-dsd-menu` | Main menu — Play CTA, How to Play, Settings, ← Back to the Box |
| `screen-dsd-setup` | Team names only (Phase 20 split) |
| `screen-dsd-players` | Player names + Captain designation (Phase 20 — new screen) |
| `screen-dsd-pass-gate` | Pass-the-phone gate — before every Captain screen and before every Crew screen |
| `screen-dsd-briefing` | Strategic Planning word preview — 25 tappable tiles; tap any word to swap it (unlimited swaps, pool rebuilds when exhausted); shown when `dsdStrategicPlanning` ON |
| `screen-dsd-captain` | Captain view — full-width colour-coded grid + dynamic legend + Sonar Ping input |
| `screen-dsd-crew` | Crew view — word-only grid, sequence builder |
| `screen-dsd-execution` | Sequential tile reveal with Valour scoreboard |
| `screen-dsd-sabotage` | Sylly Mode — Jammer placement by the placing team |
| `screen-dsd-gameover` | Winner display, Valour totals, deployment count |

### Overlays
| Overlay ID | Pattern | z-index | Purpose |
|------------|---------|---------|---------|
| `dsd-settings-overlay` | Data (slide-up) | z-[80] | "The Console ⚓" — settings cards incl. Strategic Planning |
| `dsd-how-to-overlay` | Data (slide-up) | z-[90] | "Operations Manual ⚓" — rule sections |
| `dsd-quit-overlay` | Decision modal | z-[80] | "Scuttle the Ship?" — mid-game exit confirm |
| `dsd-confirm-disarm` | Decision modal | z-[90] | "Confirm Sequence?" — crew sequence confirm |
| `dsd-new-op-overlay` | Decision modal | z-[90] | "New Operation?" play-again confirmation |

### Key State Variables
| Variable | Type | Default | Purpose |
|----------|------|---------|---------|
| `dsdSeaState` | string | `'turbulent'` | Word difficulty tier: `'calm'`/`'turbulent'`/`'tempest'` |
| `dsdHazardControl` | object | `{urchin:false, mine:true, enemy:true}` | Turn-end toggles per hazard type |
| `dsdDangerLevel` | string | `'pressure'` | Mine type: `'pressure'`/`'nuclear'` |
| `dsdSyllyMode` | bool | `false` | Mission Abyss — enables Drift + Jammer |
| `dsdStrategicPlanning` | bool | `false` | Shows word preview screen before first deployment; unlimited per-word swaps |
| `dsdTeamNames` | array[2] | `['Kraken','Leviathan']` | Custom team display names |
| `dsdPlayersPerTeam` | int | `2` | 2 or 3 players per team |
| `dsdPlayerNames` | array[2][] | `[[],[]]` | Per-team player name arrays |
| `dsdCaptainName` | array[2] | `['','']` | Designated captain name per team |
| `dsdValour` | array[2] | `[0,0]` | Running Valour (VP) per team |
| `dsdGrid` | array[25] | `[]` | `{word, role, revealed}` — roles: 0 (team0), 1 (team1), 'urchin', 'mine' |
| `dsdCurrentTeam` | int | `0` | Active team index (0 or 1) |
| `dsdFirstTeam` | int | `0` | Team with 9 payloads (from `showWhoFirst()`) |
| `dsdDeployment` | int | `1` | Current deployment (round) counter |
| `dsdPingClue` | string | `''` | Captain's current clue word |
| `dsdPingNumber` | int | `0` | Captain's current ping number |
| `dsdSequence` | array | `[]` | Ordered grid indices chosen by crew |
| `dsdJammers` | array[2] | `[-1,-1]` | Grid index jammed BY each team; -1 = none |
| `dsdWordPool` | array | `[]` | Full shuffled word pool from `dsdBuildGame()` — used for per-word swaps |
| `dsdWordPoolIdx` | int | `0` | Pointer to next unused word in `dsdWordPool` (starts at 25) |

### Key Functions
| Function | Purpose |
|----------|---------|
| `dsdShowMenu()` | Routes to `screen-dsd-menu`; sets `activeGameId = 'dsd'` |
| `dsdShowSetup()` / `dsdInitSetup()` | Renders team name inputs + player/captain inputs |
| `dsdRenderPlayerInputs()` | Rebuilds player name inputs + captain selector buttons |
| `dsdValidateSetup()` | Validates all fields then calls `dsdLaunchWhoFirst()` |
| `dsdLaunchWhoFirst()` | Calls engine `showWhoFirst()` with DSD config; `onResult` sets `dsdFirstTeam` |
| `dsdBuildGame()` | Async — awaits `loadWords()`, builds shuffled 25-cell grid by sea state tiers |
| `dsdShowBriefing()` | Strategic Planning screen — renders 25-word tappable tiles (all always interactive) |
| `dsdRerollWord(cellIdx)` | Swaps one grid word at `cellIdx` with next word from `dsdWordPool`; rebuilds pool (excluding on-board words) when exhausted — unlimited swaps |
| `dsdUpdateLegend()` | Populates legend value labels dynamically from `dsdDangerLevel` + `dsdHazardControl` |
| `dsdRenderCaptainGrid()` | Full-width colour-coded grid; Jammer shown as placing team's colour + `?` badge |
| `dsdTransmitPing()` | Validates word (single token, not in grid); sets `dsdPingClue/Number` |
| `dsdRenderCrewGrid()` | Word-only grid with numbered sequence badges; enforces max N+1 taps |
| `dsdOpenDisarmOverlay()` | Builds ordered word list in `#dsd-disarm-list`; shows confirm modal |
| `dsdShowExecution()` | Async sequential reveal loop — `dsdDelay(600)` pre + `dsdDelay(500)` post |
| `dsdResolveHit(gridIdx)` | Jammer check first, then role-based scoring; returns `true` if turn ends |
| `dsdAdvanceTurn()` | Switches team, increments deployment, routes to sabotage or captain |
| `dsdCheckVictory()` | All team-0 or team-1 cells revealed → `dsdShowGameover(); return true` |
| `dsdApplyDrift()` | Shuffles unrevealed cells' words + roles independently (Sylly Mode) |
| `dsdRenderSabotageGrid(placingTeam)` | Jammer placement grid; uses `grid.onclick` assignment to prevent stacking |
| `dsdOpenSettings()` | Syncs pill/toggle state, resets `scrollTop`, shows settings overlay |
| `dsdRenderGameover()` | Determines winner by Valour, renders final scores + deployment count |
| `dsdResetState()` | Zeroes all game/turn state; called by `resetToLobby()` |

---

## Overlay Patterns Quick Reference

| Pattern | Classes | Use for |
|---------|---------|---------|
| Data (slide-up) | `overlay-data-backdrop` / `overlay-data-inner settings-slide-up rounded-t-3xl` | Settings, how-to, word lists, history |
| Decision modal | `overlay-modal-backdrop` / `overlay-modal-inner` | Quit confirms, short prompts, ≤3 actions |

**First element inside every `overlay-data-inner`:** thematic title block — heading + optional subtitle, `border-b`, `flex-shrink-0`.

**`scrollTop = 0`** must be called on the `overlay-data-inner` element before setting `display: flex`.

---

## Multiplayer Module

**JS file:** `js/engine-multiplayer.js`
**Loaded after:** `engine.js` | **Loaded before:** `secret-mode.js`
**Full component reference:** `docs/multiplayer-ui-components.md`

### Multiplayer Globals
| Variable | Type | Default | Purpose |
|----------|------|---------|---------|
| `syllyMultiplayerMode` | string | `'single'` | `'single'` / `'host'` / `'client'` — global gate for all MP branches in plugins |
| `syllySyncLocked` | bool | `false` | true while awaiting Firebase response; blocks double-submit via `btn-mp-action` |
| `syllyDeviceUid` | string | `''` | Anonymous Firebase UID; assigned on first room action; memory-only |
| `syllyFirebase` | object | `null` | Lazy-loaded Firebase app instance; null until Lobby Mode entered |
| `mpMyPlayerIdx` | int | `0` | This device's slot index (0 = Host) |
| `mpPlayerSlots` | array | `[]` | `[{uid, nickname}]` — joined player list |
| `mpActiveGame` | string | `''` | Current game abbreviation (set when Lobby Mode starts) |
| `mpRoomCode` | string | `''` | Active 4-char room code |
| `mpJoinListenFrom` | int | `0` | Timestamp cutoff — events older than this are ignored by listener |
| `mpLobbyStyle` | string | `'individual'` | `'team'` (TLM) / `'individual'` (MDLM) — set at mode selection; broadcast in GAME_START; reset in `resetToLobby()` |
| `mpPlayersListener` | function\|null | `null` | `onValue` unsubscribe for `/players` node; active during host lobby only; cancelled in `mpStopListeners()` and before GAME_START in `mpConfirmRoster()` |
| `window.mpClientPlayerRef` | Firebase ref\|null | `null` | Reference to client's own `/players/{uid}` node; used for explicit removal on leave/cancel; set in `mpClientJoinRoom()`, cleared in `resetToLobby()` and cancel handler |

### Multiplayer Mode Classification
Three named modes (Phase 23). Each game has a `recommendedMode` and `supportedModes[]` in `MP_GAME_CONFIGS`:
| Mode key | Display name | Description |
|----------|-------------|-------------|
| `ptp` | Pass the Phone | Single device, take turns. No internet needed. |
| `tlm` | Team Lobby Mode | Each team shares one device. Host/Join with room code. |
| `mdlm` | Multi-device Lobby Mode | Each player uses their own phone. Host/Join with room code. |

Per-game: LI5 `ptp`★/`tlm` · GM `ptp`★/`mdlm` · SS `tlm`★/`mdlm`/`ptp` · JEC `mdlm`★/`ptp` · YGI `mdlm`★/`ptp` · LTTP `mdlm`★/`ptp` · NAT `mdlm`★/`ptp` · DSD `tlm`★/`mdlm`/`ptp` (★ = recommended)

### Multiplayer Screens
| Screen ID | Purpose |
|-----------|---------|
| `screen-mp-mode` | Mode selection — dynamically built by `mpShowModeScreen(abbr)` from `MP_GAME_CONFIGS.recommendedMode` + `supportedModes` |
| `screen-mp-lobby-host` | Host waiting room — room code, player dock (shared) |
| `screen-mp-lobby-join` | Client join flow — 4-char code input + nickname entry (shared) |
| `screen-li5-monitor` | LI5-specific opposing team view — Tattletale Sheet (word + No-No List + CATCH! button) |
| `screen-dsd-spectator` | DSD TLM non-active team view — read-only crew grid + clue history; shown by `dsdShowSpectatorView()` |

### Multiplayer Overlays
| Overlay ID | Pattern | z-index | Trigger |
|------------|---------|---------|---------|
| `mp-network-error-overlay` | Decision modal | z-[90] | Firebase load timeout on mode screen |
| `mp-version-mismatch-overlay` | Decision modal | z-[90] | Handshake: client SW version !== host SW version |
| `mp-host-disconnected-overlay` | Decision modal | z-[100] | Firebase `.onDisconnect()` sentinel fires on all client devices |
| `mp-lttp-message-interrupt-overlay` | Decision modal | z-[105] | `SYNC: LTTP_MESSAGE_INTERRUPT` — fires on ALL LTTP devices simultaneously |
| `mp-host-prelobby-overlay` | Decision modal | z-[90] | Host selects "Host Lobby" — nickname entry before room code generation |

### Key Functions
| Function | Purpose |
|----------|---------|
| `mpShowModeScreen(abbr)` | Parameterises + shows `screen-mp-mode` for the given game |
| `mpShowLobbyHost()` | Shows `screen-mp-lobby-host` after room creation |
| `mpShowLobbyJoin()` | Shows `screen-mp-lobby-join` |
| `mpSetModeSelection(mode)` | Updates mode card radio state + enables CTA |
| `mpLockSync()` | Activates sync lock — greys all `btn-mp-action` buttons; 8-second auto-release |
| `mpUnlockSync()` | Releases sync lock |
| `mpSendEnvelope(env)` | Async — writes `{type, payload, originId, timestamp}` envelope to Firebase |
| `mpHandleEnvelope(env)` | Routes incoming envelopes to game-specific ACTION/SYNC handlers |
| `mpSerialiseSettings(abbr)` | Serialises host's current game settings object for `SETTINGS_SYNC` packet |
| `mpRenderHostPlayerList()` | Renders joined player chips in host lobby dock |
| `mpHostCreateRoom()` | Async — creates Firebase room node, starts event listener |
| `mpClientJoinRoom()` | Async — validates room code, joins Firebase room |
| `mpStartEventListener()` | Attaches Firebase `onValue` listener (ignores events before join timestamp) |
| `mpStopListeners()` | Detaches all Firebase listeners |
| `mpGetNickname()` / `mpSaveNickname(v)` | `localStorage` helpers for `sylly_nickname` (permitted exception to no-localStorage rule) |
| `mpGenerateRoomCode()` | Returns a random 4-char uppercase alphanumeric room code |
| `mpUpdateJoinCta()` | Enables/disables join CTA based on code + nickname input state |
| `mpShakeNicknameInput(el)` | Shake animation helper for invalid nickname input |
| `mpStartPlayersWatcher()` | Subscribes `onValue` to `/rooms/{code}/players`; on count decrease rebuilds `mpPlayerSlots` from Firebase and re-renders host lobby; called after room creation and after each `mpReturnToLobby()` host call |
| `mpReturnToLobby()` | Universal play-again handler for Lobby Mode. Host: broadcasts `LOBBY_RESET` + returns to `screen-mp-lobby-host` with same room code + re-subscribes players watcher. Client: calls `resetToLobby()`. Every game's play-again confirm must call this instead of navigating to setup when `syllyMultiplayerMode !== 'single'`. |

### Envelope Schema
```js
{
  type:      'ACTION' | 'SYNC' | 'LOBBY',
  payload:   { action: 'GAME_EVENT_NAME', ...data },
  originId:  syllyDeviceUid,
  timestamp: Date.now()
}
```
- `ACTION` — Client → Host: submits player action; Host processes and responds with SYNC
- `SYNC` — Host → All: broadcasts resolved state; all devices apply and navigate
- `LOBBY` — Host → All: session management (`SETTINGS_SYNC`, `GAME_START`, `HOST_END_GAME`, `LOBBY_RESET`)

**LOBBY action types:**
| Action | Direction | Trigger | Effect on receiver |
|--------|-----------|---------|-------------------|
| `SETTINGS_SYNC` | Host → All | Host settings change in lobby | Client applies serialised settings |
| `GAME_START` | Host → All | Host confirms roster | All devices call `mpActiveGameConfig.onPassThePhone()` |
| `HOST_END_GAME` | Host → All | Host force-ends session | All clients call `resetToLobby()` |
| `LOBBY_RESET` | Host → All | Host confirms play-again | Client pre-fills code boxes, shows "Host is setting up another round — waiting to start…", disables join CTA, navigates to `screen-mp-lobby-join` |

### Per-Game ACTION/SYNC Packet Types
| Game | ACTION packets | SYNC packets |
|------|---------------|-------------|
| LI5 | `LI5_CATCH` | `LI5_ROUND_START` |
| GM | `GM_SUBMIT` | `GM_ROUND_START`, `GM_RESULT` (`isOverride: bool`, `overridePhrase: string` — present when host triggers Social Override) |
| JEC | `JEC_PREP_SUBMIT` | `JEC_ORDER`, `JEC_SIFTING`, `JEC_MERGE`, `JEC_TALLY`, `JEC_NEXT_ROUND`, `JEC_WASHUP` |
| YGI | `YGI_TAKE_SUBMIT`, `YGI_VOTE_SUBMIT` | `YGI_ROUND_START`, `YGI_LINEUP`, `YGI_VERDICT` |
| NAT | `NAT_OBSERVATION` | `NAT_MATCH_START`, `NAT_ACTIVE_PLAYER`, `NAT_DAY_END`, `NAT_SELECTION`, `NAT_TALLY` |
| DSD | `DSD_PING_TRANSMIT`, `DSD_SEQUENCE_SUBMIT` | `DSD_CREW_ACTIVE`, `DSD_EXECUTION_RESULT`, `DSD_GAMEOVER` |
| SS | `SS_VAULT_READY`, `SS_ENCODE_TRANSMIT`, `SS_INTERCEPT_SUBMIT`, `SS_DECODE_SUBMIT` | `SS_VAULT_DATA`, `SS_ENCRYPT_TURN`, `SS_BROADCAST`, `SS_START_INTERCEPT`, `SS_DECODE_GATE`, `SS_RESOLUTION`, `SS_ENDGAME` |
| LTTP | `LTTP_MESSAGE_SEND` | `LTTP_GAME_START`, `LTTP_TURN_ADVANCE`, `LTTP_MESSAGE_INTERRUPT` |
