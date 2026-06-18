# Code Map — Little Sylly Games
**Purpose:** Surgical reference for editing. Uses element IDs (stable) not line numbers (shift).
**Updated:** Phase 32 / June 2026 (studio audit Phase 2 — all 12 games verified against code)

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
| `#btn-gth` | Lobby → GTH menu screen (`screen-gth-menu`) — game menu always comes first, even for multiplayer-only games |
| `#btn-dyb` | Lobby → DYB menu screen |
| `#btn-bld` | Lobby → BLD menu screen (`bldShowMenu()`) |
| `#btn-pass` | Lobby → PASS menu screen |
| `#btn-nt` | Lobby → NT menu screen |
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
| `openSoundOverlay()` | Opens `#sound-overlay`, syncs mute state; calls `updateSliderTheme(activeGameId)` automatically |
| `toggleMute()` | Flips `isMuted`, persists to localStorage, syncs `#btn-mute` / `#global-mute-toggle` / all `.btn-open-sound` icons |
| `updateSliderTheme(gameId)` | Maps `activeGameId` → `[abbr]-range` CSS class on `#global-sound-volume` (fallback `stone-range`) |
| `getMuteToggleOnClass(gameId)` | Maps `activeGameId` → `game-toggle-on-[colour]` class for `#global-mute-toggle` ON state (fallback `game-toggle-on-stone`) |
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
| `#settings-overlay` | Data (slide-up) | `#btn-settings` — legacy ID, no `li5-` prefix |
| `#li5-how-to-overlay` | Data (slide-up) | `#btn-how-to` |
| `#li5-help-tip-overlay` | Decision modal | Contextual `[?]` tips — `li5ShowHelpTip()` |
| `#quit-overlay` | Decision modal | ✕ during active play |
| `#skip-turn-overlay` | Decision modal | Skip button |
| `#review-overlay` | Data (slide-up) | Review edits button |
| `#history-overlay` | Data (slide-up) | Score history button |
| `#pause-overlay` | Inline (inside `#screen-active-play`) | Pause button |
| `#deck-panel` | Data (slide-up) | Word deck button |
| `#li5-play-again-overlay` | Decision modal | "New Playgroup?" play-again confirmation — `#btn-play-again` (legacy unprefixed ID) |

### Key buttons
| ID | Action |
|----|--------|
| `#btn-play` | Menu → setup |
| `#btn-settings` | Open `#settings-overlay` |
| `#btn-how-to` | Open `#li5-how-to-overlay` |
| `#btn-back-to-lobby` | `resetToLobby()` ("← Back to the Box" on LI5 menu) |
| `#btn-quit-confirm` | Confirm quit → `resetToMenu()` → `#screen-menu` |
| `#btn-quit-cancel` | Close `#quit-overlay` |
| `#btn-mute` | Instant mute toggle (active play only — no overlay) |

### Key functions
| Function | Purpose |
|----------|---------|
| `loadWords()` | Loads `data/words.json` into `allWords[]` (also used by JEC) |
| `handlePill(btn)` / `handleCategoryPill(btn)` | Settings pill toggles — write directly to setting vars |
| `applyExpansionOverrides()` | Secret Mode hook — reads `window.activeExpansionOverrides` (global name — LI5 owns it; other games namespace theirs) |
| `startGame()` | Resets match state, draws first word → `showGatekeeper()` |
| `showGatekeeper()` | Pass-the-phone gate → `#screen-gatekeeper` |
| `showActivePlay()` / `startTimer()` | Active describe screen + countdown |
| `applyAndAdvance(points)` | Scores current word, draws next (`drawNextWord()`) |
| `endTurn()` | Stops timer → round review (`showRoundReview()`) or `showGameOver()` |
| `li5ShowHelpTip(key)` | Contextual `[?]` tip overlay content injector |

---

## Great Minds (GM)

**JS file:** `js/games/great-minds.js`
**Brand colour:** `violet-500` on the lobby card button; `purple-500` everywhere in-game (`pill-active-purple`, `bg-purple-500` CTAs, `game-toggle-on-purple`). [AUDIT FLAG — June 2026: reconcile violet-vs-purple during Phase 3 GM audit; `game-identities.md` documents `purple-500`.]
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
| `startGreatMinds()` | Entry point — resets state, picks starter pair (`gmPickStarterPair()`), shows pair reveal |
| `gmStartInputPhase()` | Sets up the round's input flow; in Lobby Mode sets `gmActivePlayer = mpMyPlayerIdx` (both devices input simultaneously) |
| `gmLockIn()` / `gmProcessLockIn()` | Validates + processes player clue input |
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
| `#screen-ss-standby` | TLM only — non-encrypting team waits while other team encodes |
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
| `#btn-ss-how-to` | Open `#ss-how-to-overlay` (game menu only — not encrypt screen) |
| `#btn-ss-encrypt-tip` | Inline `[?]` on encrypt screen — `ssShowHelpTip()` |
| `#btn-ss-clue-tip` | Inline `[?]` on broadcast/clue screen — `ssShowHelpTip()` |
| `#btn-ss-intercept-tip` | Inline `[?]` on intercept screen — `ssShowHelpTip()` |
| `#btn-ss-standby-exit` | ✕ on standby screen → quit overlay |
| `#btn-ss-quit-confirm` | Confirm quit → `ssResetToMenu()` → `#screen-ss-menu` |

### Key functions
| Function | Purpose |
|----------|---------|
| `ssOpenSettings()` | Syncs UI state + opens `#ss-settings-overlay` |
| `ssResetToMenu()` | Stops timers, resets round state, preserves names+settings → `#screen-ss-menu` |
| `ssStartHalf()` / `ssNextHalf()` | Round loop — starts each team's encoding half, rotates encoder |
| `ssResolve()` | Resolves intercept + decode → `#screen-ss-resolution` |
| `ssFuzzyMatch(a, b)` | Plural/compound-aware word equivalence check |
| `ssStartIntelPhase()` | Sylly Mode Phase 2 entry (tiebreak → intel intro → guesses → summary) |
| *(Who Encrypts First)* | Handled by engine `showWhoFirst()` — see Engine section |

> [AUDIT FLAG — June 2026]: SS has **no** `ssApplyExpansionOverrides()` function (previously listed here in error). Whether SS deliberately skips the Secret Mode expansion hook is unverified — resolve during Phase 3 SS audit (Check G).

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
| `ygiStartSuddenDeath()` | Renders SD intro screen — tied finalist names + random question |
| `ygiShowSDPassGate()` / `ygiShowSDInput()` | SD pass gate + number entry per finalist; `ygiResolveSuddenDeath()` settles the tie |

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
| `#screen-lttp-smalltalk` | ⚠️ ORPHANED dead markup — a `<section>` never referenced by `lttp.js`, never registered in `allScreens[]`, never shown (leftover from the pre-Phase-21a Small Talk screen design). The live Small Talk UI is the `#lttp-smalltalk-overlay` overlay. [AUDIT FLAG — June 2026: candidate for removal; logged `[POLISH]` in fix plan.] |

### Overlays
| ID | Pattern | Opened by |
|----|---------|-----------|
| `#lttp-suspicion-overlay` | Data (slide-up) z-[80] | `lttpOpenPlayerFolder(idx)` — per-player folder (status + notes) |
| `#lttp-history-overlay` | Data (slide-up) z-[90] | `lttpOpenFullHistory()` |
| `#lttp-settings-overlay` | Data (slide-up) z-[80] | `#btn-lttp-menu-settings` |
| `#lttp-how-to-overlay` | Data (slide-up) z-[90] | `#btn-lttp-menu-how-to` |
| `#lttp-smalltalk-overlay` | Data (slide-up) z-[80] | `lttpOpenSmallTalkOverlay(targetIdx)` — topic tabs + prompt pills (Small Talk Helper ON) |
| `#lttp-confirm-overlay` | Decision modal z-[80] | `lttpOpenConfirmModal()` — free-text message input (Phase 21a) |
| `#lttp-quit-overlay` | Decision modal z-[80] | `.btn-lttp-quit-open` (any gameplay screen) |
| `#lttp-guess-map-overlay` | Custom full-width map panel z-[95] | Guess phase — Friend of a Friend pins the address (`lttpOpenGuessMapOverlay()`) |

### Message Flow state (Phase 21a — replaces Small Talk)
| Variable | Purpose |
|----------|---------|
| `lttpPendingTarget` | Player index currently being messaged |
| `lttpHistory` | `[{asker, asked, plan, messageText}]` — full chat log; `messageText` is the free-text message |

### Key chat elements (current two-pane layout: Map / Contacts tabs)
| ID | Purpose |
|----|---------|
| `#lttp-chat-plan-label` | "Plan N of 4" |
| `#lttp-chat-player-label` | "IT'S [NAME]'S TURN" |
| `#lttp-chat-role-label` / `#lttp-chat-role-objective` | Active player's role reminder strip |
| `#btn-lttp-tab-map` / `#btn-lttp-tab-contacts` | Pane tab buttons — `lttpSnapToPane()` |
| `#lttp-pane-map` | Map pane — contains `#lttp-map-grid` (4×4, role-aware) + `#lttp-map-instruction` |
| `#lttp-pane-contacts` | Contacts pane — `#lttp-contacts-list` (player rows with status chips, JS-rendered) |
| `#lttp-chatlog-preview` | Group Chatlog feed preview; `#btn-lttp-open-history` opens the full log |

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
| `lttpOpenSmallTalkOverlay(targetIdx)` | Small Talk Helper overlay — topic tabs + prompt pills (when `lttpSmallTalk` ON) |
| `lttpOpenConfirmModal(targetIdx)` | Opens `lttp-confirm-overlay` with free-text message input for `targetIdx` |
| `lttpSelectPlayer(targetIdx, messageText)` | Core lap logic — logs `{asker, asked, plan, messageText}` to history, checks lap complete, routes |
| `lttpNarrowHighlights()` | 6→3→1 narrowing + logs plan snapshot |
| `lttpShowBriefing()` | Plan start/transition summary screen |
| `lttpRenderMapPane()` | Role-aware 4×4 grid inside the chat screen's Map pane — The Gang: red, The Troublemaker: gold+purple, Friend of a Friend: annotatable |
| `lttpOpenGuessMapOverlay()` | Guess-phase full-width pin map (`#lttp-guess-map-overlay`) |
| `lttpOpenFullHistory()` | Full history log overlay |
| `lttpOpenPlayerFolder(idx)` | Opens suspicion (Contacts) overlay at a specific player's folder |
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
| `#sm-terminal-subcategories` | Expansion sub-category selector buttons (injected by JS) |
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
**Updated:** Phase 23 / June 2026 audit

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
| `screen-dsd-spectator` | TLM non-active team watch view — read-only crew grid + clue history (`dsdShowSpectatorView()`) |
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
| `dsdShowSetup()` / `dsdShowPlayers()` | Screen 1 (team names) / Screen 2 (player names + captain) |
| `dsdRenderPlayerInputs()` | Rebuilds player name inputs + captain selector buttons |
| `dsdValidatePlayers()` | Validates all fields then calls `dsdLaunchWhoFirst()` |
| `dsdLaunchWhoFirst()` | Calls engine `showWhoFirst()` with DSD config; `onResult` sets `dsdFirstTeam` |
| `dsdBuildGame()` | Async — awaits `loadWords()`, builds shuffled 25-cell grid by sea state tiers |
| `dsdShowBriefing()` | Strategic Planning screen — renders 25-word tappable tiles (all always interactive) |
| `dsdRerollWord(cellIdx)` | Swaps one grid word at `cellIdx` with next word from `dsdWordPool`; rebuilds pool (excluding on-board words) when exhausted — unlimited swaps |
| `dsdUpdateLegend()` | Populates legend value labels dynamically from `dsdDangerLevel` + `dsdHazardControl` |
| `dsdShowCaptain()` / `dsdShowCrew()` | Captain and Crew screen entry points (always via pass gate) |
| `dsdShowSpectatorView()` / `dsdShowCrewStandby()` | TLM spectator view / MDLM crew standby for the non-active team |
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

## Group Therapy (GTH)

**Game ID:** `gth`
**JS file:** `js/games/gth.js`
**Brand colour:** `#B1BCA0` (Muted Sage — CSS var `--color-gth-sage`) | **Active pill:** `pill-active-sage`
**Lobby button:** `#btn-gth`
**Data file:** `data/gth-data.json`
**Infrastructure:** `js/lib/canvas-draw.js` — `window.CanvasDraw` global
**Multiplayer-only:** MDLM, `rosterConfig: {type:'none'}`, min 4 / max 8 players
**Updated:** Phase 31 / June 2026 audit

### Screens
| Screen ID | Purpose |
|-----------|---------|
| `screen-gth-menu` | Main menu — Start Session, How to Play, Settings, ← Back to the Box |
| `screen-gth-patient-intake` | Pre-Phase-1 readyCheck gate — each patient confirms ready (`GTH_PATIENT_READY` ACTION) |
| `screen-gth-disorder-reveal` | Pre-draw disorder info; sub-states `'preview'` (first view) + `'between'` (between drawings) |
| `screen-gth-canvas` | Drawing screen — disorder name header, countdown timer, `<canvas id="gth-canvas">` inside `<div id="gth-canvas-wrapper">` |
| `screen-gth-waiting-room` | Passive — waits for all players to finish Phase 1 |
| `screen-gth-shrink-intro` | Phase 2 announcement; player taps to enter Shrink Phase |
| `screen-gth-case` | Case screen — renders drawing, Diagnostic Cards (standard) or text input (Deep Dive) |
| `screen-gth-case-report` | Queue exhausted before timer — passive waiting screen |
| `screen-gth-big-reveal` | Host-controlled drawing reveal — host taps Next/Finish; clients advance on SYNC |
| `screen-gth-final-report` | Leaderboard (Patient pts + Shrink pts = Total) + New Session |

### Overlays
| Overlay ID | Pattern | z-index | Purpose |
|------------|---------|---------|---------|
| `gth-settings-overlay` | Data (slide-up) | z-[80] | "Intake Form 📋" — session settings |
| `gth-how-to-overlay` | Data (slide-up) | z-[90] | "The Disclaimer 🛋️" — how to play |
| `gth-quit-overlay` | Decision modal | z-[80] | "Walk Out?" — mid-session exit confirm |
| `gth-new-session-overlay` | Decision modal | z-[90] | "New Session?" — play-again confirmation |

### Key State Variables
| Variable | Type | Default | Purpose |
|----------|------|---------|---------|
| `gthDisordersPerPatient` | int | `3` | Disorders drawn per player per session (`3`/`4`/`5`) — "Reportable Symptoms" |
| `gthDrawingTime` | int | `30` | Seconds per drawing (`20`/`30`/`45`) — "Expression Window" |
| `gthDiagnosisWindow` | int | `90` | Phase 2 total seconds (`60`/`90`/`120`) — "Diagnosis Window" |
| `gthDifficultyMix` | string | `'recurrent'` | Pool filter: `'episodic'`/`'recurrent'`/`'refractory'` — "Symptom Severity" |
| `gthDeepDive` | bool | `false` | Hard Mode — text input instead of Diagnostic Cards |
| `gthSyllyMode` | bool | `false` | Stroke or Genius — tremor (Phase 1) + blur (Phase 2) |
| `gthPlayerCount` | int | `0` | Total players (from lobby) |
| `gthPlayerNames` | string[] | `[]` | Player display names (from `mpPlayerSlots`) |
| `gthAssignedDisorders` | object[] | `[]` | This device's disorder assignments for Phase 1 |
| `gthLocalDrawings` | object[] | `[]` | `{disorderId, playerIdx, drawingData}` — this device's completed drawings |
| `gthRevealPool` | object[] | `[]` | All drawings (host-only accumulator; used for queue build + score resolution) |
| `gthPatientReady` | bool[] | `[]` | readyCheck — per-player intake-screen confirmation (gates Phase 1 start) |
| `gthPhase1Ready` | bool[] | `[]` | readyCheck — per-player Phase 1 completion |
| `gthQueue` | object[] | `[]` | This device's Phase 2 case queue |
| `gthLocalDiagnoses` | object[] | `[]` | `{disorderId, selectedId, timestamp}` — this device's diagnoses |
| `gthAllDiagnoses` | object | `{}` | Host-only — `{playerIdx: diagnoses[]}` accumulator |
| `gthDiagnosesReady` | bool[] | `[]` | readyCheck — per-player Phase 2 batch submission |
| `gthPhase2EndTimestamp` | int | `0` | Epoch ms — from `GTH_PHASE2_BEGIN` payload (set when host opens the gate) |
| `gthRevealItems` | object[] | `[]` | Built by host in `gthResolveScores()` — one item per drawing for Big Reveal |
| `gthScores` | object[] | `[]` | `{patientPts, shrinkPts, total}` per player index |
| `gthAllDisorders` | object[] | `[]` | Full disorder bank loaded from `gth-data.json` |

### Key Functions
| Function | Purpose |
|----------|---------|
| `gthLoadData()` | Fetches and parses `data/gth-data.json` into `gthAllDisorders` |
| `gthShowMenu()` | Routes to `screen-gth-menu` |
| `gthResetState()` | Clears all phase state; called on new session and `resetToLobby()` |
| `gthApplySettings()` | Reads pill/toggle DOM into state variables |
| `gthStartSession()` | Host: builds pool, assigns disorders, broadcasts `GTH_GAME_START`, shows patient intake |
| `gthShowPatientIntake()` | readyCheck gate before Phase 1 — sends `GTH_PATIENT_READY` on confirm |
| `gthStartPhase1Drawing()` | All patients ready (`GTH_PHASE1_START`) — begins the drawing loop |
| `gthShowDisorderReveal(idx)` | Shows `'preview'` or `'between'` sub-state on `screen-gth-disorder-reveal` |
| `gthShowCanvas(disorder)` | Inits `CanvasDraw`, starts countdown, applies tremor if Sylly Mode |
| `gthStartCountdown()` | setInterval countdown; tick on ≤5s; expiry → alarm + `gthFinishDrawing()` |
| `gthFinishDrawing()` | Clears timer, stops tremor, calls `CanvasDraw.lock()`, calls `gthSubmitDrawing()` |
| `gthSubmitDrawing(data)` | Stores locally; advances to next disorder or sends batch + shows waiting room |
| `gthShowWaitingRoom()` | Shows `screen-gth-waiting-room`; marks local player done (`gthUpdateWaitingProgress()` renders the tally) |
| `gthKickOffPhase2()` | Host-only: builds queues + broadcasts `GTH_PHASE2_START` when all Phase 1 batches are in |
| `gthBuildQueues()` | Host-only: assigns each drawing to exactly 2 non-artist queues; returns `queues[][]` |
| `gthPickDecoys(disorder, count)` | Returns `count` wrong-answer disorders for Diagnostic Cards (same tier/category fallback chain) |
| `gthShowShrinkIntro()` | Shows `screen-gth-shrink-intro` |
| `gthShowCase()` | Renders current case drawing; builds Diagnostic Cards or Deep Dive input; handles queue-exhausted |
| `gthSubmitDiagnosis(id)` | Records `{disorderId, selectedId, timestamp}`; advances queue |
| `gthShowCaseReport()` | Shows `screen-gth-case-report` (queue exhausted before timer) |
| `gthSubmitDiagnosisBatch()` | Idempotent — sends `GTH_DIAGNOSES_SUBMIT` ACTION once |
| `gthStartPhase2Timer(ts)` | Wall-clock countdown; host broadcasts `GTH_PHASE2_END` on expiry |
| `gthResolveScores()` | Host-only: patient pts, shrink pts, speed bonus, tier-3 bonus; broadcasts `GTH_FINAL_SCORES` |
| `gthShowBigReveal()` | Renders current `gthRevealItems[gthRevealIdx]`; host shows Next/Finish; clients see passive view |
| `gthShowFinalReport()` | Sorted leaderboard by total then shrinkPts; shows `screen-gth-final-report` |
| `gthHandleEnvelope(env)` | Routes all GTH ACTION/SYNC packets; called from `engine-multiplayer.js` |

---

## Dicey Bluffs (DYB)

**JS file:** `js/games/dyb.js`
**Data:** none — word bank not used; dice outcomes are numeric
**Brand colour:** `stone-700` / active pill: `pill-active-stone`

### Screens
| Screen ID | Purpose |
|-----------|---------|
| `screen-dyb-menu` | Main hub — Play, How to Play, Settings, ← Back to the Box |
| `screen-dyb-seating` | MDLM host pre-game — shows lobby roster while host reviews player count |
| `screen-dyb-shake` | Each player shakes and rolls; shows their private die results |
| `screen-dyb-table` | Main round screen — full table view, bid history, allegation controls |
| `screen-dyb-spirit-board` | Eliminated player screen — passive spectator view after losing all dice |
| `screen-dyb-showdown` | Call Bluff! resolution — reveals all hands, animates count, shows verdict |
| `screen-dyb-gameover` | Final scores, winner reveal, play-again / exit |

### Overlays
| Overlay ID | Pattern | z-index | Purpose |
|------------|---------|---------|---------|
| `dyb-settings-overlay` | Data (slide-up) | z-[80] | "The House Rules 🎲" — game settings |
| `dyb-how-to-overlay` | Data (slide-up) | z-[90] | How to Play |
| `dyb-quit-overlay` | Decision modal | z-[80] | "Fold?" — mid-game exit confirm |
| `dyb-new-game-overlay` | Decision modal | z-[90] | "New Game?" — play-again confirmation |
| `dyb-slick-picker-overlay` | Decision modal | z-[100] | Slick die face picker — opened on tap of a Slick die on the table screen |

### Key State Variables
| Variable | Type | Default | Purpose |
|----------|------|---------|---------|
| `dybWildcardsStyle` | string | `'classic'` | Wildcards: `'strict'` / `'classic'` / `'volatile'` |
| `dybStartingHand` | int | `5` | Starting dice per player (`3`/`4`/`5`) |
| `dybSyllyMode` | bool | `false` | Devil's Luck — special dice (see flag below) |
| `dybSyllyIntensity` | int | `5` | % chance per die of becoming a special die (slider 5–10) |
| `dybPlayerCount` | int | `0` | Total players in session |
| `dybPlayerNames` | string[] | `[]` | Player display names |
| `dybSeatNumbers` | int[] | `[]` | Seat assignment per player |
| `dybDiceInHand` | int[] | `[]` | Dice count remaining per player |
| `dybMyRoll` | int[] | `[]` | This device's private roll (never broadcast until Showdown) |
| `dybSpecialTypes` / `dybSlickFaces` | arrays | `[]` | This device's special die types + chosen Slick faces |
| `dybAllRolls` / `dybAllSpecialTypes` / `dybAllSlickFaces` | arrays | `[]` | Host-only accumulators until `DYB_SHOWDOWN` |
| `dybActivePlayers` | int[] | `[]` | Indices of players still in the game |
| `dybEliminationOrder` | int[] | `[]` | Order players were eliminated (drives final ranking) |
| `dybCurrentOpenerIdx` | int | `0` | Player who must open the next Shake's bidding |
| `dybCurrentBidderIdx` | int | `0` | Index of next-to-bid player (advances after each bid) |
| `dybAllegationHistory` | object[] | `[]` | `{playerIdx, face, count}` — full bid history for the round |
| `dybChallengerIdx` | int | `-1` | Player who called bluff (`-1` = no challenge yet) |
| `dybOnesStripped` | bool | `false` | Volatile Wilds — set true once 1s are bid directly this Shake |
| `dybHandVisible` | bool | `true` | Stealth Veil eye-toggle state |
| `dybSlickPickerDie` | int | `-1` | Die index currently in the Slick picker overlay |

> [AUDIT FLAG — June 2026]: shipped Sylly Mode is **"Devil's Luck"** with multiple secret die types — `'loaded'` / `'phantom'` / `'slick'` / `'cracked'` strings exist in `dyb.js`, and the settings card copy says "loaded, phantom, cracked, slick, or a snake". `game-identities.md` still documents "Chaos Mode" with Slick dice only — reconcile during Phase 3 DYB audit.

### Key Functions
| Function | Purpose |
|----------|---------|
| `dybStartSession()` | Post-lobby entry — host routes to seating, clients wait for `DYB_GAME_START` |
| `dybShowSeating()` | Renders lobby roster + shows `screen-dyb-seating` (host only) |
| `dybStartGame()` | Assigns seats, builds dice arrays, broadcasts `DYB_GAME_START` |
| `dybInitShake()` | Rolls dice for active players; routes each player to `screen-dyb-shake` |
| `dybGenerateRoll()` | Rolls this device's dice; applies Devil's Luck special-type chance per die |
| `dybRenderTableScreen()` | Renders table view — pip row, bid history, allegation controls |
| `dybComputeRealCount(face)` | Counts matching dice across all hands; branches on wildcards style + `dybOnesStripped` |
| `dybOpenSlickPicker(dieIdx)` / `dybAssignSlickFace(face)` | Slick die face picker overlay (local only) |
| `dybShowSpiritBoard()` | Eliminated-player spectator screen |
| `dybProcessAllegation(face, count)` | Validates and records a bid; advances `dybCurrentBidderIdx`; broadcasts `DYB_ALLEGATION_SYNC` |
| `dybProcessCallBluff()` | Sets `dybChallengerIdx`; triggers `dybResolveShowdown()` on host |
| `dybResolveShowdown()` | Counts real dice, determines loser, updates `dybDiceInHand` and `dybActivePlayers`; broadcasts `DYB_SHOWDOWN` |
| `dybApplyShowdown(data)` | Applies showdown state; shows `screen-dyb-showdown`; calls `dybRenderShowdownScreen` with gameover callback |
| `dybRenderShowdownScreen(data, onDone)` | Animated tally: count-up at 400ms/tick with `playTick()`, then verdict reveal; calls `onDone()` when complete |
| `dybBroadcastShakeActive()` | Broadcasts `DYB_SPIRIT_SHAKE` (for eliminated) then `DYB_SHAKE_ACTIVE` (for active); sends `DYB_GAMEOVER` if 1 player remains |
| `dybAdvanceFromShowdown()` | Cleans bid state; resets for next shake |
| `dybShowGameover(payload)` | Renders final scores, winner, plan history; shows `screen-dyb-gameover` |
| `dybHandleEnvelope(env)` | Routes all DYB ACTION/SYNC packets; called from `engine-multiplayer.js` |

### Per-Game ACTION/SYNC Packet Types
| Packet | Type | Direction | Payload |
|--------|------|-----------|---------|
| `DYB_ROLL_SUBMIT` | ACTION | Client → Host | `{playerIdx}` — client confirms roll complete |
| `DYB_ALLEGATION` | ACTION | Client → Host | `{face, count, playerIdx}` |
| `DYB_CALL_BLUFF` | ACTION | Client → Host | `{playerIdx}` |
| `DYB_GAME_START` | SYNC | Host → All | `{playerNames, diceCount, syllyMode, syllyIntensity, seatNumbers}` |
| `DYB_SHAKE_ACTIVE` | SYNC | Host → All | `{activePlayers, dice}` — start of each round; active devices show table |
| `DYB_SPIRIT_SHAKE` | SYNC | Host → All | `{activePlayers}` — eliminated devices route to spirit board |
| `DYB_ALLEGATION_SYNC` | SYNC | Host → All | `{playerIdx, face, count, nextBidderIdx, history}` |
| `DYB_SHOWDOWN` | SYNC | Host → All | `{bidderIdx, challengerIdx, claimed, real, loserIdx, dice, activePlayers, gameOver}` |
| `DYB_NEXT_SHAKE` | SYNC | Host → All | `{activePlayers, dice}` — after showdown if game continues |
| `DYB_GAMEOVER` | SYNC | Host → All | `{winner, scores, planHistory}` |

---

## Bailed (BLD)

**JS file:** `js/games/bld.js`
**Data:** none — plans and roles are built-in constants (`BLD_PLANS`, `BLD_ROLE_TABLE`, `BLD_GROUP_TABLE`)
**Brand colour:** `yellow-500` / active pill: `pill-active-yellow`
**Lobby button:** `#btn-bld`
**Multiplayer-only:** MDLM, `rosterConfig: {type:'none'}`, min 5 / max 10 players (PTP fallback via `bldShowSetup()`)
**Status:** In active testing — cross-check `docs/implementation-notes/bld-implementation-notes.md` before logging new bugs

### Screens
| Screen ID | Purpose |
|-----------|---------|
| `screen-bld-menu` | Main menu — Make the Plans, How to Play, Settings, ← Back to the Box |
| `screen-bld-setup` | Player name entry (PTP only — MDLM skips via `onPassThePhone`) |
| `screen-bld-seating` | MDLM host pre-game — random seat numbers assigned + roster display |
| `screen-bld-pass-gate` | Pass-the-phone gate before each role reveal (PTP) |
| `screen-bld-role-reveal` | Per-player role reveal — Friend / Flake / Pot-Stirrer / Big Flake |
| `screen-bld-main` | Main gameplay — plan tiles, patience meter, phase content (nominating / voting / mission / result / drama, driven by `bldGamePhase`) |
| `screen-bld-aftermath` | End-of-game itinerary + result + role reveal |

### Overlays
| Overlay ID | Pattern | z-index | Purpose |
|------------|---------|---------|---------|
| `bld-settings-overlay` | Data (slide-up) | z-[80] | "The Group Chat" — players + Drama Mode |
| `bld-how-to-overlay` | Data (slide-up) | z-[90] | How to Play |
| `bld-quit-overlay` | Decision modal | z-[80] | "Walk Out?" — mid-game exit confirm |
| `bld-pass-reveal-overlay` | Decision modal | z-[90] | Pass-the-phone handoff before role reveal |
| `bld-role-help-overlay` | Decision modal | z-[90] | Role-specific rules reference |
| `bld-plan-detail-overlay` | Decision modal | z-[90] | Per-plan history detail (aftermath tappable tiles) |
| `bld-tip-overlay` | Decision modal | z-[90] | Shared tip overlay — `bldShowTip(emoji, heading, lines[])` drives all contextual `[?]` buttons |
| `bld-second-chances-overlay` | Decision modal | z-[90] | Dual purpose: patience-exhausted Flake-win confirm AND the play-again confirmation opened by `#btn-bld-go-again` (dynamic confirm label: "Restart in Lobby 🔄" host / "Leave Session" client / "Second Chances 💬" single) |

> [AUDIT FLAG — June 2026]: `game-identities.md` documents a `bld-new-night-overlay` ("New Night Out?") — **no such element exists in `index.html`**. Play-again reuses `bld-second-chances-overlay` (above). Reconcile during Phase 3 BLD audit.

### Key buttons
| ID | Action |
|----|--------|
| `#btn-bld-menu-play` | Menu Play CTA — dual context: post-lobby starts session, pre-lobby opens `mpShowModeScreen('bld')` |
| `#btn-bld-confirm-seating` / `#btn-bld-randomise-seating` | Host seating screen — confirm / reshuffle seat numbers |
| `#btn-bld-nominate-confirm` | Planner locks the nominated group |
| `#btn-bld-vote-in` / `#btn-bld-vote-not-them` | Vote: Sounds Good / No Way |
| `#btn-bld-mission-in` / `#btn-bld-mission-bailed` | Mission card: In / Bail |
| `#btn-bld-drama-guess-confirm` | Big Flake locks their Friend guess (Drama Mode) |
| `#btn-bld-go-again` | Aftermath play-again → opens `bld-second-chances-overlay` with dynamic label |
| `#btn-bld-aftermath-exit` | Post-game exit → `resetToLobby()` |

### Key State Variables
| Variable | Type | Default | Purpose |
|----------|------|---------|---------|
| `bldPlayerCount` | int | `5` | Total players (5–10) |
| `bldDramaMode` | bool | `false` | Sylly Mode — adds Pot-Stirrer + Big Flake |
| `bldPlayerNames` | string[] | `[]` | Player display names |
| `bldFlakeIndices` | int[] | `[]` | Indices of the Flakes |
| `bldPotStirrerIdx` / `bldBigFlakeIdx` | int | `-1` | Drama Mode role indices |
| `bldSeatNumbers` / `bldSeatOrder` | int[] | `[]` | Random seat assignment + planner rotation order |
| `bldPlanTrack` | (bool\|null)[5] | nulls | Per-plan outcome (null = not played) |
| `bldCurrentPlanIdx` | int | `0` | Active plan (0–4) |
| `bldCurrentNominationAttempt` | int | `0` | Patience Meter counter (5th rejection = Flakes win) |
| `bldCurrentPlannerIdx` | int | `0` | Active Planner (rotates by seat order) |
| `bldNominatedGroup` | int[] | `[]` | Currently nominated group |
| `bldVotes` / `bldVoteReady` | object / bool[] | `{}` / `[]` | Vote collection + readyCheck |
| `bldMissionCards` / `bldMissionReady` | object / bool[] | `{}` / `[]` | Mission card collection + readyCheck |
| `bldGamePhase` | string\|null | `null` | Main-screen phase: nominating / voting / mission / etc. |
| `bldMyPlayerIdx` / `bldMyRoleData` | int / object | `-1` / `null` | This device's slot + role info (MDLM) |
| `bldGameResult` / `bldDramaGuessResult` | object\|null | `null` | Final outcome + Big Flake guess outcome |
| `bldPlanHistory` | object[] | `[]` | Per-plan record for aftermath detail overlay |
| `bldPtpPhase` / `bldPtpQueue` | — | `null` / `[]` | Pass-the-phone sequencing (PTP mode) |

### Key Functions
| Function | Purpose |
|----------|---------|
| `bldShowMenu()` | Routes to `screen-bld-menu` |
| `bldShowSetup()` | PTP name entry screen |
| `bldShowSeatingSetup()` / `bldRenderSeatingList()` | MDLM host seating — random seat numbers (`onPassThePhone` host path) |
| `bldStartGame()` / `bldStartGameMdlm()` | Assigns roles (`bldAssignRoles()`), broadcasts `BLD_GAME_START`, starts role reveals |
| `bldShowRoleReveal(idx)` | Role-aware reveal — shows fellow Flakes to Flake devices |
| `bldStartNominating()` / `bldRenderNominating()` | Planner group selection phase |
| `bldRecordVote(idx, vote)` / `bldResolveVote()` | Vote collection (readyCheck) + majority resolution |
| `bldRecordMissionCard(idx, card)` / `bldResolveMission()` | Mission card collection + bail-count resolution (`bldBailsRequired()` — Plan 4 with 7+ players needs 2 Bails) |
| `bldShowPlanResult()` / `bldAdvanceAfterPlanResult()` | Plan outcome + advance to next plan / drama lock / aftermath |
| `bldHandleRejection()` | Failed nomination — decrements patience, advances Planner; 5th rejection → Flakes win |
| `bldTriggerDramaLock()` / `bldSubmitDramaGuess()` / `bldResolveDramaGuess()` | Drama Mode Big Flake identification phase |
| `bldCheckWinCondition()` | 3+ successes = Friends win; 3+ fails or patience exhausted = Flakes win |
| `bldShowAftermath()` / `bldRevealRoles()` / `bldOpenPlanDetail(idx)` | End-of-game itinerary, role reveal, per-plan detail |
| `bldShowTip(emoji, heading, lines)` | Shared contextual tip overlay injector |
| `bldRenderPatienceMeter()` / `bldRenderItinerary()` / `bldRenderMainHeader()` | Main-screen UI renderers |
| `bldResetState()` | Full teardown; called by `resetToLobby()` |
| `bldHandleEnvelope(env)` | Routes all BLD ACTION/SYNC packets; called from `engine-multiplayer.js` |

### Per-Game ACTION/SYNC Packet Types
| Packet | Type | Direction | Payload |
|--------|------|-----------|---------|
| `BLD_VOTE_SUBMIT` | ACTION | Client → Host | `{playerIdx, vote}` |
| `BLD_MISSION_SUBMIT` | ACTION | Client → Host | `{playerIdx, card}` |
| `BLD_NOMINATION_CONFIRMED` | ACTION + SYNC | Client Planner → Host → All | `{nominatedGroup, currentPlanIdx, nominationAttempt}` — host re-broadcasts as SYNC |
| `BLD_DRAMA_GUESS` | ACTION | Client Big Flake → Host | `{guessIdx}` |
| `BLD_GAME_START` | SYNC | Host → All | `{playerNames, playerCount, dramaMode, flakeIndices, bigFlakeIdx, potStirrerIdx, firstPlannerIdx, seatNumbers}` |
| `BLD_VOTE_RESULT` | SYNC | Host → All | votes + outcome |
| `BLD_MISSION_START` | SYNC | Host → All | mission card phase begin |
| `BLD_MISSION_RESULT` | SYNC | Host → All | cards + bail count + outcome |
| `BLD_NEXT_NOMINATION` | SYNC | Host → All | advance to next nomination |
| `BLD_DRAMA_IDENTIFICATION` | SYNC | Host → All | trigger Big Flake guess phase |
| `BLD_AFTERMATH` | SYNC | Host → All | final result + plan history |

---

## Pass (PASS)

**JS file:** `js/games/pass.js`
**Lib:** `js/lib/cards.js` — `window.Cards` global (`Cards.buildEl(card)`, `Cards.buildBackEl(deckIdx)`)
**Data:** none — no word bank; uses a standard 52-card deck + Jokers built at runtime
**Brand colour:** `zinc-900` (#18181b) / active pill: `pill-active-zinc`

### Screens
| Screen ID | Purpose |
|-----------|---------|
| `screen-pass-menu` | Main hub — Deal Me In, How to Play, Settings, ← Back to the Box |
| `screen-pass-seating` | MDLM host pre-game — shows seat order (join order) before host deals |
| `screen-pass-table` | Main gameplay — opponents strip, table combo, hand, Pass/Play controls |
| `screen-pass-round-wrap` | Round result — chip deltas, winner, Next Round (host only) |
| `screen-pass-gameover` | Match result — final rankings by chip total |

### Overlays
| Overlay ID | Pattern | z-index | Purpose |
|------------|---------|---------|---------|
| `pass-settings-overlay` | Data (slide-up) | z-[80] | "The House Rules 🃏" — game settings |
| `pass-how-to-overlay` | Data (slide-up) | z-[90] | How to Play |
| `pass-quit-overlay` | Decision modal | z-[80] | "Walk Away?" — mid-game exit confirm |
| `pass-new-deal-overlay` | Decision modal | z-[90] | "New Deal?" — play-again confirmation |

### Key State Variables
| Variable | Type | Default | Purpose |
|----------|------|---------|---------|
| `passPlayerCount` | int | `0` | Total players |
| `passPlayerNames` | string[] | `[]` | Player display names (join order = seat order) |
| `passHands` | card[][] | `[]` | Per-player hand arrays |
| `passChips` | int[] | `[]` | Current chip totals |
| `passTableCombo` | object\|null | `null` | Current table combo `{type, rank, count}`; null = open table |
| `passCurrentPlayerIdx` | int | `0` | Active player index |
| `passAbyss` | card[] | `[]` | Sylly Mode: face-up central pool |
| `passMatchRound` | int | `0` | Current round number |
| `passSyllyMode` | bool | `false` | The Abyss |

### Key Functions
| Function | Purpose |
|----------|---------|
| `passStartSession()` | Post-lobby entry — host routes to seating, clients wait for `PASS_GAME_START` |
| `passShowSeating()` | Renders roster and shows `screen-pass-seating` (host only) |
| `passStartGame()` | Deals hands, sets chip stacks, broadcasts `PASS_GAME_START` |
| `passStartRound()` | Rebuilds deck, deals, determines leader, broadcasts `PASS_GAME_START` |
| `passShowTable()` | Renders full table state; sets passPhase for active/waiting |
| `passDetectCombo(cards)` | Returns `{type, rank, count}` or `null` |
| `passIsValidPlay(combo, hand)` | Returns `{valid, msg}` — all climb + bomb + Joker rules |
| `passSubmitPlay()` | Validates selection, sends ACTION or processes locally |
| `passSubmitPass()` | Sends pass ACTION or processes locally |
| `passProcessPlay(playerIdx, cardIndices, combo)` | Host: removes cards, updates state, broadcasts `PASS_TURN_RESULT` |
| `passProcessPass(playerIdx)` | Host: increments pass streak, handles Abyss, broadcasts `PASS_TURN_RESULT` |
| `passResolveRound(winnerIdx)` | Calculates chip deltas (×3/×2/×1 penalty tiers), broadcasts `PASS_ROUND_END` |
| `passResolveAbyssDetonation(exemptIdx)` | Distributes Abyss cards clockwise; returns `{order, cards}` |
| `passShowRoundWrap()` / `passCheckMatchOver()` | Round result screen + match-end check (`PASS_NEXT_ROUND` / `PASS_GAMEOVER`) |
| `passHandleEnvelope(env)` | Routes all PASS ACTION/SYNC packets; called from `engine-multiplayer.js` |

### Per-Game ACTION/SYNC Packet Types
| Packet | Type | Direction | Payload |
|--------|------|-----------|---------|
| `PASS_PLAY_SUBMIT` | ACTION | Client → Host | `{playerIdx, cardIndices[]}` |
| `PASS_PASS_SUBMIT` | ACTION | Client → Host | `{playerIdx}` |
| `PASS_PLAYER_LEFT` | ACTION | Client → Host | `{playerIdx}` — dissolves match |
| `PASS_GAME_START` | SYNC | Host → All | `{playerNames, seatNumbers, hands, chips, handSize, roundNum, firstPlayer}` |
| `PASS_TURN_RESULT` | SYNC | Host → All | `{playerIdx, action_type, tableCombo, nextPlayerIdx, abyss, passStreak, tableCleared, handCounts}` |
| `PASS_ABYSS_DRAFT` | SYNC | Host → All | `{trigger, draftOrder, draftCards, newHands}` — trigger: `'detonation'`\|`'round-win'`\|`'fracture'` |
| `PASS_ROUND_END` | SYNC | Host → All | `{winnerIdx, chipDeltas, newChips, badges, finalHandCounts, matchOver}` |
| `PASS_NEXT_ROUND` | SYNC | Host → All | `{roundNum, hands, chips, firstPlayer}` |
| `PASS_GAMEOVER` | SYNC | Host → All | `{winnerIdx, finalChips, roundsWon}` |
| `PASS_MATCH_DISSOLVED` | SYNC | Host → All | `{leaverIdx}` |

---

## Net-Trace (NT)

**JS file:** `js/games/nt.js`
**Data:** `data/words.json` — uses only the `objects` category (standard + wild tiers); secondary fallback `data/secret_words.json` / `secret2_words.json` / `secret3_words.json` in Secret Mode
**Brand colour:** `emerald-600` / active pill: `pill-active-emerald`

### Screens
| Screen ID | Purpose |
|-----------|---------|
| `screen-nt-menu` | Main hub — Trace the Route!, How to Play, Settings, ← Back to the Box |
| `screen-nt-setup` | Node generation + network preview — host deals; all players see their assigned node |
| `screen-nt-handshake` | Pass-the-phone gate before each player's hardening turn |
| `screen-nt-allocation` | DNP (Sylly Mode) Shared Allocation Hub — captain assigns firewall/honeypot across legs; non-captain sees read-only |
| `screen-nt-build` | Hardening screen — player places firewall/honeypot components on their own relay-leg node |
| `screen-nt-waiting` | Passive standby — shown while other players are hardening |
| `screen-nt-playback` | Animated BFS traversal — canvas shows packet routing with latency result |
| `screen-nt-results` | Per-cycle SER leaderboard + cycle summary |
| `screen-nt-gameover` | Final report — SER rankings across all cycles |

### Overlays
| Overlay ID | Pattern | z-index | Purpose |
|------------|---------|---------|---------|
| `nt-settings-overlay` | Data (slide-up) | z-[80] | "Network Config ⚙️" — game settings |
| `nt-how-to-overlay` | Data (slide-up) | z-[90] | How to Play |
| `nt-quit-overlay` | Decision modal | z-[80] | "Drop Connection?" — mid-game exit confirm |
| `nt-new-trace-overlay` | Decision modal | z-[90] | "New Trace?" — play-again confirmation |

### Key State Variables
| Variable | Type | Default | Purpose |
|----------|------|---------|---------|
| `ntPlayerCount` | int | `4` | Total players (PTP: user-set; MDLM: from lobby) |
| `ntPlayerNames` | string[] | `[]` | Player display names |
| `ntCycles` | int | `3` | Number of routing cycles per session (setting) |
| `ntCycle` | int | `0` | Current cycle index |
| `ntHardeningWin` | int | `60` | Hardening window in seconds (setting) |
| `ntNode` | object | `null` | Current player's relay-leg node geometry `{word, paths, placeholders[]}` |
| `ntMyPlacements` | object[] | `[]` | Current player's placed components `[{type, pathIdx, segIdx}]` |
| `ntInventory` | object | `{firewall:0, honeypot:0}` | Current player's available components |
| `ntAllPlacements` | object[][] | `[]` | Host-only: all players' placements (MDLM) |
| `ntAllPlayerNodes` | object[] | `[]` | All players' node geometries (MDLM) |
| `ntBuildTimer` | int\|null | `null` | `setInterval` handle for hardening countdown |
| `ntHuddleTimer` | int\|null | `null` | `setInterval` handle for DNP huddle countdown |
| `ntSyllyMode` | bool | `false` | DNP (Devil's Network Protocol) |
| `ntTeamIdx` | int[] | `[]` | MDLM DNP: team index per player slot |
| `ntCaptainSlots` | int[] | `[]` | MDLM DNP: global player index of each team's captain `[team0Cap, team1Cap]` |
| `ntTeamNodes` | object[] | `[]` | MDLM DNP: each player's own relay-leg node (indexed by player slot) |
| `ntTeamAllocLocked` | bool[] | `[false,false]` | Host-only DNP: which team's captain has locked their allocation |
| `ntTeamWorkingAllocs` | object[][] | `[[],[]]` | Host-only DNP: live `[team][legIdx] = {firewall,honeypot}` during huddle |
| `ntAllPlayerAllocations` | object[] | `[]` | Host-only DNP: final per-player inventory `[playerIdx] = {firewall,honeypot}` |
| `ntHuddlePhase` | string | `'open'` | `'open'` / `'locked'` — captain's allocation lock state |
| `ntAllocations` | object[] | `[]` | Current player's per-leg allocation view (own team's legs) |
| `ntAllocationPool` | object | `{firewall:0,honeypot:0}` | Team pool total available for distribution |
| `ntCycleSERs` | number[] | `[]` | SER per player per cycle (standard) |
| `ntTeamCycleSERs` | number[][] | `[]` | SER per team per cycle (DNP) `[cycle][team]` |

### Key Functions
| Function | Purpose |
|----------|---------|
| `ntStartSession()` | Post-lobby entry — host generates node + routes; MDLM starts GAME_START flow |
| `ntGenerateNode(opts)` | Generates relay-leg node geometry — `opts.keepInventory=true` reuses inventory for DNP N-node batch |
| `ntShowHandshake()` | Shows `screen-nt-handshake` — pass-the-phone gate |
| `ntShowAllocationScreen(captainMode)` | Renders + shows `screen-nt-allocation` (captain interactive / non-captain read-only) |
| `ntRenderAllocationScreen(captainMode)` | Injects pool banner + per-leg rows with [−]/[+] adjusters |
| `ntAdjustAllocation(legIdx, type, dir)` | Validates pool bounds; host updates `ntTeamWorkingAllocs` direct; client sends `NT_ALLOCATION_UPDATE` |
| `ntStartHuddleTimer(durationSecs)` | Countdown with `playTick()` at ≤10s; auto-calls `ntCommitAllocation()` on expiry |
| `ntStopHuddleTimer()` | Clears `ntHuddleTimer` handle |
| `ntCommitAllocation()` | Locks captain's allocation — host applies directly + checks both teams; client sends `NT_ALLOCATION_LOCK` |
| `ntApplyAllocationLock(teamIdx, allocations)` | Migrates working allocs → `ntAllPlayerAllocations`; calls `ntBroadcastAllocationSync()` |
| `ntBroadcastAllocationSync()` | Broadcasts `NT_ALLOCATION_SYNC` with both teams' locked state + working allocations |
| `ntCheckBothTeamsLocked()` | Host: when both teams locked, stops huddle timer, broadcasts `NT_BUILD_BEGIN` with `endTimestamp` |
| `ntShowBuild()` | Shows `screen-nt-build` — hardening phase |
| `ntStartBuildTimer(endTimestamp)` | Wall-clock–anchored countdown (GTH pattern); auto-submits on expiry |
| `ntComputeTimeline_local()` | BFS traversal on current `ntNode` with `ntMyPlacements` → returns latency timeline |
| `ntResolveCycleMdlm(allPlacements)` | Host: computes timelines for all players (swapping `ntNode` + `ntMyPlacements` per player for DNP); derives SERs using cluster ceiling formula for DNP |
| `ntShowPlayback()` | Shows `screen-nt-playback` + starts canvas BFS animation |
| `ntShowResults()` | Shows `screen-nt-results` with per-cycle SER leaderboard |
| `ntHandleEnvelope(env)` | Routes all NT ACTION/SYNC packets; called from `engine-multiplayer.js` |
| `ntResetState()` | Full state teardown (called from `resetToLobby()` in `engine.js`) |

### Per-Game ACTION/SYNC Packet Types
| Packet | Type | Direction | Payload |
|--------|------|-----------|---------|
| `NT_PLACEMENT_SUBMIT` | ACTION | Client → Host | `{playerIdx, placements[]}` |
| `NT_PLAYER_LEFT` | ACTION | Client → Host | `{playerIdx}` — dissolves match |
| `NT_ALLOCATION_UPDATE` | ACTION | Client captain → Host | `{playerIdx, legIdx, type, dir}` — live adjustment during huddle |
| `NT_ALLOCATION_LOCK` | ACTION | Client captain → Host | `{playerIdx, allocations[]}` — commits captain's allocation |
| `NT_GENERATE` | SYNC | Host → All | `{playerNames, nodeWord, paths, placeholders, inventory, isDNP, allPlayerNodes?, teamIdx?, captainSlots?}` |
| `NT_HUDDLE_START` | SYNC | Host → All | `{allPlayerNodes, teamIdx, captainSlots, teamPools, cycle}` — DNP allocation phase begins |
| `NT_ALLOCATION_SYNC` | SYNC | Host → All | `{teamData: [{locked, allocations[]}]}` — live sync during huddle |
| `NT_BUILD_BEGIN` | SYNC | Host → All | `{endTimestamp, cycle, assignedInventory}` — both teams locked; start hardening |
| `NT_PLAYBACK` | SYNC | Host → All | `{timelines[], latencies[], sers[], teamCycleSERs?, cycle}` |
| `NT_RESULTS` | SYNC | Host → All | `{cycleSERs[], playerNames, cycle, totalCycles}` |
| `NT_GAMEOVER` | SYNC | Host → All | `{finalSERs[], playerNames, cycleSERs[][]}` |
| `NT_MATCH_DISSOLVED` | SYNC | Host → All | `{leaverIdx}` |

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
| `syllyDeviceUid` | string | `null` | Anonymous Firebase UID; set by `firebase-init.js` after `signInAnonymously`; memory-only |
| `syllyFirebase` | object | `null` | Lazy-loaded Firebase app instance; null until Lobby Mode entered |
| `mpMyPlayerIdx` | int | `0` | This device's slot index (0 = Host) |
| `mpPlayerSlots` | array | `[]` | `[{uid, nickname}]` — joined player list |
| `mpActiveGame` | string | `''` | Current game abbreviation (set when Lobby Mode starts) |
| `mpActiveRoomCode` | string | `''` | Active 4-char room code (`let`-declared — never `window.mpActiveRoomCode`) |
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

Per-game: LI5 `ptp`★/`tlm` · GM `ptp`★/`mdlm` · SS `tlm`★/`mdlm`/`ptp` · JEC `mdlm`★/`ptp` · YGI `mdlm`★/`ptp` · LTTP `mdlm`★/`ptp` · NAT `mdlm`★/`ptp` · DSD `tlm`★/`mdlm`/`ptp` · GTH `mdlm`★ (MP-only, 4–8) · DYB `mdlm`★ (MP-only, 3–8) · BLD `mdlm`★ (MP-only, 4–10 per `getMinPlayers` — note `game-identities.md` says min 5) · PASS `mdlm`★ (MP-only, 3–6) · NT `mdlm`★ (MP-only, 3–8) (★ = recommended)

### Multiplayer Screens
| Screen ID | Purpose |
|-----------|---------|
| `screen-mp-mode` | Mode selection — dynamically built by `mpShowModeScreen(abbr)` from `MP_GAME_CONFIGS.recommendedMode` + `supportedModes` |
| `screen-mp-lobby-host` | Host waiting room — room code, player dock (shared) |
| `screen-mp-lobby-join` | Client join flow — 4-char code input + nickname entry (shared) |
| `screen-mp-roster` | Assign Spots — manual slot assignment for `rosterConfig.type: 'individual'` / `'teams'` games |
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
| GTH | `GTH_PATIENT_READY`, `GTH_DRAWING_SUBMIT`, `GTH_DIAGNOSES_SUBMIT` | `GTH_GAME_START`, `GTH_PHASE1_START` (all patients ready — start drawing), `GTH_PHASE2_START` (all queues — no timestamp), `GTH_PHASE2_BEGIN` (host gate opened — carries `endTimestamp`; all devices start timer + show first case), `GTH_PHASE2_END` (timer expired — host authoritative), `GTH_REVEAL_NEXT`, `GTH_REVEAL_FINISH`, `GTH_FINAL_SCORES` |
| DYB | *(see Dicey Bluffs section packet table)* | *(see Dicey Bluffs section packet table)* |
| BLD | *(see Bailed section packet table)* | *(see Bailed section packet table)* |
| PASS | *(see Pass section packet table)* | *(see Pass section packet table)* |
| NT | *(see Net-Trace section packet table)* | *(see Net-Trace section packet table)* |
