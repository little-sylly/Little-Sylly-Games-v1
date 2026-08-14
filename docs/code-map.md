# Code Map — Little Sylly Games
**Purpose:** Surgical reference for editing. Element IDs are the stable authority; the offset map below gives coarse line anchors purely to accelerate `Read`, never as a source of truth.
**Updated:** Phase 32 / June 2026 (studio audit Phase 2 — all 12 games verified against code)

---

## How to use this (token-lean — never full-read `index.html`)
`index.html` is ~515 KB / ~7900 lines — a full read nearly fills the context window. Always work in slices:
1. Find the game you're editing in the **Per-Game Offset Map** below, or copy a known element ID.
2. **Grep the ID** (`screen-[abbr]-*`, `[abbr]-*-overlay`) to get its live line number — this is the authority.
3. **`Read` with `offset`/`limit`** around that line (or around the offset-map anchor) — read only the slice you need.
4. Cross-reference the key functions list to find the right entry point in the JS file.

---

## Per-Game Offset Map (`index.html`)
**Coarse `Read` anchors only — APPROXIMATE, captured 29 Jun 2026.** Line numbers drift on every `index.html` edit; treat ±a few hundred lines as normal and **always Grep the actual ID to confirm** before editing. Each game's block runs roughly from its anchor to the next game's anchor.

| Section | ≈ Start line |
|---------|-------------|
| Like I'm Five (LI5) | ~125 |
| Great Minds (GM) | ~639 |
| Secret Signals (SS) | ~1209 |
| Just Enough Cooks (JEC) | ~2185 |
| You Get It? (YGI) | ~2642 |
| Late to the Party (LTTP) | ~3180 |
| Natural Selection (NAT) | ~3826 |
| Deep-Sea Deploy (DSD) | ~4389 |
| Multiplayer engine / lobby | ~4939 |
| Multiplayer global overlays | ~5163 |
| Bailed (BLD) | ~5288 |
| Group Therapy (GTH) | ~5841 |
| The Bluff (DYB) | ~6325 |
| Pass (PASS) | ~6758 |
| Net-Trace (NT) | ~7144 |
| Fruit Salad (FRT) | ~7604 |
| Counting Sheep (SHP) | ~7909 |
| Flawless (FLW) | ~8153 |
| Pecking Order (PKO) | ~8551 |
| Cookie Jar (CJAR) | ~9060 |

Each game's `<!-- ════ NAME ════ -->` section-header comment is itself a reliable Grep anchor if the line numbers have drifted.

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
| `#art-viewer-overlay` | Decision modal (image body) — z-[105] | `artMakeZoomable`-wired gallery tiles in CJAR / PKO / FRT / SHP / FLW / DYB. Children: `#art-viewer-img`, `#art-viewer-caption`, `#btn-art-viewer-close` |

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
| `#btn-frt` | Lobby → FRT menu screen |
| `#btn-shp` | Lobby → SHP menu screen |
| `#btn-flw` | Lobby → FLW menu screen |
| `#btn-pko` | Lobby → PKO menu screen |
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
| `openArtViewer(src, caption)` | Shows one image at viewport size in `#art-viewer-overlay`. **No-ops when `src` is falsy** — a game on its emoji fallback has nothing to enlarge |
| `closeArtViewer()` | Hides it; also called from `resetToLobby()` |
| `artMakeZoomable(el, src, caption)` | Adds `.art-zoomable` + a click handler to an already-rendered tile **only when `src` resolved**, and returns `el` for inline use. The one helper every gallery uses |
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
| `smLoadPacks()` | **(Cartridge, Phase A)** One-time: fetches `data/packs/registry.json` + each `<id>/pack.json`, builds `SM_TERMINAL_CONFIG.expansions` / `SM_EXPANSION_OVERRIDES` / `SM_PACK_WORDS`, appends the locked `classified` sentinel. `await`ed by `smOpenTerminal()` before the boot sequence renders the list |
| `smReviveSettings(settings)` | **(Cartridge, Phase A)** Converts the string `"Infinity"` → JS `Infinity` in a pack's settings (JSON has no Infinity literal) |
| `smRunBootError()` | **(Cartridge, Phase A)** Boot-sequence variant shown when `smLoadPacks()` fails (e.g. first-ever terminal open while offline) |
| `smOpenTerminal()` | **async** — resets UI, shows terminal, `await smLoadPacks()`, then runs boot sequence (or `smRunBootError()` on failure) |
| `smLaunch()` | Loads word bank from the manifest's inline `words` (or `wordFile` fallback), builds data, writes overrides, navigates |
| `smBuildExpansionData(words)` | Builds `window.activeExpansionData` vocab Set + category map |
| `smOpenVocabOverlay()` | Opens GM vocab reference overlay |
| `resetSecretMode()` | Full teardown; called by `resetToLobby()` |

### Key config objects (built at runtime by `smLoadPacks()` — Phase A)
| Name | Purpose |
|------|---------|
| `SM_GAMES` | **const** — game catalogue (id/label/screen); engine knowledge, not pack data |
| `SM_TERMINAL_CONFIG` | `let` — `{ expansions: [], games: SM_GAMES }`; `.expansions` populated from manifests at terminal open |
| `SM_EXPANSION_OVERRIDES` | `let {}` — per-pack forced settings pushed to plugins (Infinity-revived) |
| `SM_PACK_WORDS` | `let {}` — id → inline word array (or `null` if the pack uses `wordFile`) |
| `SM_PACK_ASSETS` | `let {}` — id → `assets` block (asset/skin packs only; `null` otherwise) **(Phase B)** |
| `smPacksLoaded` | `let bool` — one-time load guard |
| `SM_SETTINGS_DISPLAY` | **const** — per-game setting label/formatter map for terminal summary (stays hardcoded — engine knowledge, not pack data) |

### Asset (skin) packs — Phase B
Device-local cosmetic skins. Packets/logic carry ids only, so **no multiplayer sync**; a missing
id falls back to default art. `window.activeAssetPack` is set in `smLaunch()` (asset branch) and
cleared in `resetSecretMode()`.

| Function (in `secret-mode.js`) | Purpose |
|--------------------------------|---------|
| `assetFace(kind, id)` | Resolved image URL for `(kind, id)` from the active pack, or `null` (→ seam draws default). |
| `assetBack(kind)` | Resolved face-down image URL for the active pack, or `null`. |
| `assetSpecial(kind, type, id)` | Resolved image URL for a face that carries a *type* on top of its value (`id` is a face value or the reserved `'blank'`), same skin → core → null chain, per-key fallthrough. First user: DYB's Tempest dice. |
| `assetSpecialFrame(kind, type)` | Whether the engine still draws its own type chrome (border/tint/glow) around that art; `true` unless a tier opts out with `"frame": false`. |

**Render seams (the only place art is built — each calls `assetFace`/`assetBack`, which resolve
skin pack → core art → emoji fallback in `js/lib/art.js`; `assetExtra(kind,key)` covers non-card
game art. Core art packs live in `data/art/<kind>/` and ARE precached — see `docs/expansion-guide.md`
§ Core art packs):**

| Family | `kind` | Seam | File | Id key |
|--------|--------|------|------|--------|
| Fruit | `frt` | `frtRenderCard(fruitId, opts)` | `js/games/frt.js` | `fruitId` 0–7 |
| Sheep | `shp` | `shpRenderCard(cardId, opts)` | `js/games/shp.js` | `cardId` 0–16 (13 cursed = not skinned) |
| Gems | `flw` | `flwRenderCard(gemId, opts)` | `js/games/flw.js` | `gemId` 0–9 |
| Cards | `cards` | `Cards.buildEl/buildBackEl` | `js/lib/cards.js` | `rank`+suit-letter (`AH`,`10S`,`Joker`) via `cardAssetId()` |
| Dice | `dyb` | `dybDieHTML` + `dybDieBackHTML()` | `js/games/dyb.js` | face value 1–6; Tempest dice (loaded/phantom/slick/cracked/snake) additionally resolve via `assetSpecial`/`assetSpecialFrame`. `dybDieHTML` now returns one of three shapes: framed asset (`.dyb-die-framed` + inner `.dyb-die-art` span, engine chrome around pack art), edge-to-edge asset (`.dyb-die-asset`, standard faces or a type that opted out with `"frame": false`), or the original glyph/pip markup |
| Animals | `pko` | `pkoRenderCard(id, opts)` | `js/games/pko.js` | chain id string (`elephant`, `polar_bear`, `human`) |

**Core art shipped so far:** `pko` (`data/art/pko/` — 15 faces + back + a `chain` extra), `flw`
(`data/art/flw/` — 10 gem faces keyed `0`–`9` + back, 217 KB), `frt` (`data/art/frt/` — 8 fruit
faces keyed `0`–`7` + back, 220 KB), and `shp` (`data/art/shp/` — 16 faces keyed `0`–`12`/`14`–`16`
+ back, 640 KB; id `13` Fogged Dream has no `faces` entry and never will — `shpRenderCard` renders
it as a cursed placeholder before ever calling `assetFace`, since its value is hidden even from its
own owner). Every other family above still draws its emoji/CSS default. Converting a game needs
**no JS edit** — the seam already resolves all three tiers; rollout tracker in
`docs/expansion-guide.md` § Core art packs.

Per-game `faces` id cheat-sheet + authoring steps: `docs/expansion-guide.md` § Add an asset (skin) pack.
CSS: `.frt-card-asset`, `.shp-card-asset`, `.pass-card-asset`, `.dyb-die-asset` (cover/centre, transparent border).

**Nested terminal (Phase B):** top level is content **categories** — `smRenderExpansions()` shows
`WORD PACKS` / `GAME SKINS` / locked sentinel. `smSelectCategory()` → `smRenderWordPacks()`
(theme-first, → `smSelectExpansion`) or `smRenderSkinGames()` (game-first, → `smSelectSkinGroup`
→ `smRenderSkins` → `smSelectSkin`). `smReturnToCategories()` is the `[←] BACK` on each member list.
Helpers: `smLogLine`/`smLogSpacer`/`smShowList`/`smAppendBackButton`, consts `SM_BTN_CLS`/`SM_BTN_LOCKED_CLS`.

### Cartridge pack files (Phase A/B, June 2026)
| Path | Purpose |
|------|---------|
| `data/packs/registry.json` | The ONE list of live pack ids — edit this to add/remove a pack |
| `data/packs/<id>/pack.json` | Self-contained manifest: `{ id, label, locked, games, subCategories?, settings, words \| wordFile, assets }` |
| `data/packs/<id>/img/*` | Asset-pack images (skins). SVG or PNG. |
| — | Runtime-cached (not precached): network-first for `.json`, cache-first for images. No SW version bump to add a pack. See `docs/expansion-guide.md` + `docs/cartridge-system-plan.md` |

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
| `#screen-nat-habitat-intro` | **Habitat Intro** (`ui-style.md` § Round/Night Intro Screen) — auto-advances after **5 s** (`natHabitatIntroTimer`, `NAT_INTERSTITIAL_MS`) into the clue round. Rotating flavour from `NAT_HABITAT_FLAVOUR`, host-picked index synced via `flavourIdx` in `NAT_MATCH_START`. Shown by `natShowHabitatIntro(onDone)` — host/single passes `onDone` (a host decision, times its own advance); clients call it with no argument and just wait for the following `NAT_ACTIVE_PLAYER` SYNC |
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
| `natStartMatch()` | Draws specimen, assigns roles → `natShowHabitatIntro(natStartClueRound)`, not the clue round directly |
| `natShowHabitatIntro(onDone)` | The Habitat Intro auto-advance (`screen-nat-habitat-intro`). Called from both `natStartMatch()` (host/single) and the `NAT_MATCH_START` client applier so neither device skips it; self-clears `natHabitatIntroTimer` on every call |
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
| `dsdSyllyMode` | bool | `false` | Silent Running — enables Drift + Jammer |
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

## The Bluff (DYB)
*(display name "The Bluff" since June 2026 — renamed from "Dicey Bluffs"; the `dyb` prefix and all code identifiers below are unchanged.)*

**JS file:** `js/games/dyb.js`
**Data:** none — word bank not used; dice outcomes are numeric
**Brand colour:** `#1E4D8C` (ocean blue — custom; classes `dyb-cta`, `dyb-label`, `pill-active-dyb`, `game-toggle-on-dyb`)

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
| `dybSyllyMode` | bool | `false` | The Tempest — special dice (see flag below) |
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
| `dybSlickPickerDie` | int | `-1` | Die index currently in the Slick picker overlay |

> [RESOLVED — June 2026]: shipped Sylly Mode is now **"The Tempest"** (renamed from "Devil's Luck" in the thematic sweep) with five secret die types — `'loaded'` / `'phantom'` / `'slick'` / `'cracked'` / `'snake'` strings in `dyb.js`. `game-identities.md` § The Bluff documents all five. The internal die-type strings are unchanged by the rename.

### Key Functions
| Function | Purpose |
|----------|---------|
| `dybStartSession()` | Post-lobby entry — host routes to seating, clients wait for `DYB_GAME_START` |
| `dybShowSeating()` | Renders lobby roster + shows `screen-dyb-seating` (host only) |
| `dybStartGame()` | Assigns seats, builds dice arrays, broadcasts `DYB_GAME_START` |
| `dybInitShake()` | Rolls dice for active players; routes each player to `screen-dyb-shake` |
| `dybGenerateRoll()` | Rolls this device's dice; applies The Tempest special-type chance per die |
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
**Brand colour:** Dark red `#991b1b` (red-800, recoloured from yellow-500 2 Aug 2026) / active pill: `pill-active-bld`
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
| `screen-pass-intro` | **Round Intro** (`ui-style.md` § Round/Night Intro Screen) — auto-advances after **5 s** (`passRoundIntroTimer`, `PASS_INTERSTITIAL_MS`) into `screen-pass-table`. Rotating flavour from `PASS_ROUND_FLAVOUR`, host-picked index synced via `flavourIdx` in `PASS_GAME_START`. Both host/single and clients self-time their own advance — by this point the round's state is already fully resolved, so no host decision is pending (same shape as `screen-pko-event`, not `screen-pko-unchallenged`) |
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
| `passOpenClimbing` | bool | `false` | Open Climbing Mode — any strictly-higher same-type combo beats the table (relaxes exact +1) |
| `passMandatoryCard` | object\|null | `null` | Round-1 lowest card (e.g. 3♦) that the leader's opening combo must contain; null for rounds 2+ |
| `passPhase` | string | `'your-turn'` | `'your-turn'`/`'waiting'`/`'abyss-draft'`/`'round-over'` — `'round-over'` gates stray `PASS_TURN_RESULT` packets from re-showing the table |

### Key Functions
| Function | Purpose |
|----------|---------|
| `passStartSession()` | Post-lobby entry — host routes to seating, clients wait for `PASS_GAME_START` |
| `passShowSeating()` | Renders roster and shows `screen-pass-seating` (host only) |
| `passStartGame()` | Deals hands, sets chip stacks, broadcasts `PASS_GAME_START` |
| `passStartRound()` | Rebuilds deck, deals, determines leader, broadcasts `PASS_GAME_START` → `passShowRoundIntro()`, not the table directly |
| `passShowRoundIntro()` | The Round Intro auto-advance (`screen-pass-intro`) → `passShowTable()` after `PASS_INTERSTITIAL_MS`. Called by both `passStartRound()` (host/single) and the `PASS_GAME_START` client applier; self-clears `passRoundIntroTimer` on every call |
| `passFindLeader()` | Round-1 leader = holder of the single lowest card (3♦; ties by suit ♦<♣<♥<♠); sets `passMandatoryCard` (opening combo must contain it). Suit order used here ONLY — never in play comparison. |
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
| `PASS_GAME_START` | SYNC | Host → All | `{playerNames, seatNumbers, hands, chips, handSize, roundNum, firstPlayer, mandatoryCard}` |
| `PASS_TURN_RESULT` | SYNC | Host → All | `{playerIdx, action_type, tableCombo, nextPlayerIdx, abyss, passStreak, tableCleared, handCounts}` |
| `PASS_ABYSS_DRAFT` | SYNC | Host → All | `{trigger, draftOrder, draftCards, newHands}` — trigger: `'detonation'`\|`'round-win'`\|`'fracture'` |
| `PASS_ROUND_END` | SYNC | Host → All | `{winnerIdx, chipDeltas, newChips, badges, finalHandCounts, matchOver}` |
| `PASS_NEXT_ROUND` | SYNC | Host → All | `{roundNum, hands, chips, firstPlayer}` |
| `PASS_GAMEOVER` | SYNC | Host → All | `{winnerIdx, finalChips, roundsWon}` |
| `PASS_MATCH_DISSOLVED` | SYNC | Host → All | `{leaverIdx}` |

---

## Net-Trace (NT)

**JS file:** `js/games/nt.js`
**Data:** `data/words.json` — uses only the `objects` category (standard + wild tiers); in Secret Mode the word pool comes from the active pack's manifest (`data/packs/<id>/pack.json`, inline `words`) via `secretWords`
**Brand colour:** `emerald-600` / active pill: `pill-active-emerald`

### Screens
| Screen ID | Purpose |
|-----------|---------|
| `screen-nt-menu` | Main hub — Trace the Route!, How to Play, Settings, ← Back to the Box |
| `screen-nt-setup` | "Provision Admins" — PTP operator count + callsigns |
| `screen-nt-gate` | Cycle readiness gate — carries the cycle-start boot terminal (`#nt-gate-boot-log`, typed line by line), each PTP handover, and the post-build gather beat |
| `screen-nt-allocation` | DNP (Sylly Mode) Shared Allocation Hub — captain assigns firewall/honeypot across legs; non-captain sees read-only |
| `screen-nt-build` | Hardening screen — player places firewall/honeypot components on their own relay-leg node |
| `screen-nt-standby` | Passive standby — shown while other players are hardening |
| `screen-nt-playback` | Animated BFS traversal — canvas shows packet routing with latency result |
| `screen-nt-summary` | Diagnostic Summary — per-cycle SER leaderboard, or the final match report on the last cycle |

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
| `ntShowGateBoot()` | Shows `screen-nt-gate` and types out the cycle-start boot log (`NT_BOOT_LINES`); reveals the ready-check block on completion |
| `ntGateBootThen(fn)` | Runs `fn` now if the boot log already finished, else queues it for the log's completion callback — lets host/client each reach their own gate config without racing the boot |
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
| `ntShowSummary(mode)` | Shows `screen-nt-summary` with per-cycle SER leaderboard, or the final match report when `mode === 'match'` |
| `ntHandleEnvelope(env)` | Routes all NT ACTION/SYNC packets; called from `engine-multiplayer.js` |
| `ntResetState()` | Full state teardown (called from `resetToLobby()` in `engine.js`) |

---

## Fruit Salad (FRT)

**JS file:** `js/games/frt.js`
**Data:** Fixed `FRT_FRUITS` constant (8 fruits, no `words.json`) — exempt from word-difficulty setting per non-word-bank carve-out
**Brand colour:** Electric lemon `#FFE500` (fill, recoloured from banana `#FFC700` 2 Aug 2026) / dark ink (stone-800) / leaf accent `#047857` (text-on-white, e.g. how-to step labels) | **Active pill:** `pill-active-frt` (custom CSS — no Tailwind class)

### Screens
| Screen ID | Purpose |
|-----------|---------|
| `screen-frt-menu` | Main hub — Start Serving!, How to Play, Settings, ← Back to the Box |
| `screen-frt-deal` | Transient deal interstitial (polish placeholder — gameplay currently routes straight to table) |
| `screen-frt-table` | Main gameplay table — all phases (serving compose, await/challenge, reveal, round-end) controlled by `frtTablePhase` |
| `screen-frt-gameover` | Final results — Fruit Tokens + Silver Lining leaderboard |

### Overlays
| Overlay ID | Pattern | z-index | Purpose |
|------------|---------|---------|---------|
| `frt-settings-overlay` | Data (slide-up) | z-[80] | "Fruit Stock 🍉" — game settings |
| `frt-how-to-overlay` | Data (slide-up) | z-[90] | How to Play |
| `frt-quit-overlay` | Decision modal | z-[80] | "Put the fruits down?" — mid-game exit confirm |
| `frt-new-game-overlay` | Decision modal | z-[90] | "New Fruit-Off?" — play-again confirmation |
| `frt-tip-overlay` | Decision modal | z-[90] | Shared contextual tips — `frtShowTip(emoji, heading, lines[])` |
| `frt-log-overlay` | Data (slide-up) | z-[90] | "Fruit Journal 📋" — pass-off log for current Fruit-Off |

### Key State Variables
| Variable | Type | Default | Purpose |
|----------|------|---------|---------|
| `frtFruitStock` | string | `'standard'` | Deck size: `'standard'`(64) \| `'swift'`(48) \| `'mega'`(80) |
| `frtRounds` | int | `3` | Number of Fruit-Offs per session: 1 \| 3 \| 5 |
| `frtTurnTimer` | int | `0` | Think Before You Fruit timer (s): 0(off) \| 15 \| 30 \| 60 |
| `frtPearOff` | bool | `false` | Pear-Off 1v1 duel mode (locks lobby to 2; mutually exclusive with Sylly) |
| `frtSyllyMode` | bool | `false` | Fruity Personalities — 8 Sylly abilities active |
| `frtPlayerCount` | int | `0` | From lobby roster |
| `frtPlayerNames` | string[] | `[]` | From lobby roster (`mpPlayerSlots[i].nickname`) |
| `frtScores` | int[] | `[]` | Fruit Tokens per player (session total) |
| `frtBluffWins` | int[] | `[]` | Correct True/False resolutions per player (Silver Lining tally) |
| `frtRoundNum` | int | `0` | Current Fruit-Off number (1-indexed) |
| `frtRoundLog` | object[] | `[]` | Pass-off log for current Fruit-Off: `{from, to, fruit, outcome}` |
| `frtStashes` | int[][] | `[]` | `frtStashes[p]` = hidden hand (fruit IDs) |
| `frtBowls` | int[][] | `[]` | `frtBowls[p]` = face-up penalty pile (fruit IDs) |
| `frtActivePlayer` | int | `0` | Index of current server |
| `frtAppleLockTarget` | int | `-1` | Angry Apple forced next-serve target (-1 = none) |
| `frtPassFruit` | int | `-1` | TRUE fruit ID in flight (masked client-side — couch security) |
| `frtPassDeclaration` | int | `-1` | Claimed fruit ID |
| `frtPassFromIdx` | int | `-1` | Current server index |
| `frtPassToIdx` | int | `-1` | Current receiver index |
| `frtPassHandledBy` | int[] | `[]` | Players who handled this card this serve (Peek legality) |
| `frtTablePhase` | string | `'serving'` | `'serving'` \| `'await'` \| `'reveal'` |
| `frtPeeked` | bool | `false` | Receiver peeked the in-flight card (local device only) |
| `frtPeekComposing` | bool | `false` | Receiver is choosing a new target/declaration to pass on |
| `frtTurnTimerHandle` | int\|null | `null` | `setInterval` handle for turn countdown (Timer Lifecycle) |
| `frtTurnEndTs` | int\|null | `null` | Wall-clock expiry for turn timer (GTH pattern) |

### Key Functions
| Function | Purpose |
|----------|---------|
| `frtStartSession()` | Post-lobby entry — host deals first Fruit-Off via `frtStartRoundHost(0)` |
| `frtStartRoundHost(openerIdx)` | Host: deals hands, sets active player, arms timer, broadcasts `FRT_DEAL`, shows table |
| `frtBuildDeck()` | Returns shuffled deck of 8×copies fruit IDs based on `frtFruitStock` |
| `frtDealRound()` | Resets stashes/bowls, deals 6 cards per player from deck |
| `frtShowTable()` | Shows `screen-frt-table`; calls `frtRenderTableBody()` |
| `frtRenderTableBody()` | Branches on `frtTablePhase` → `frtRenderServing` / `frtRenderAwait` / `frtRenderReveal` |
| `frtRenderOpponents()` | Renders opponent stash counts + bowl cards in the table header area |
| `frtRenderServing()` | Compose UI — stash card picker → target picker → declaration picker → submit |
| `frtSubmitServe()` | Host: `frtHostProcessServe`; Client: ACTION `FRT_SERVE` |
| `frtHostProcessServe(fromIdx, toIdx, declaration, stashIdx)` | Remove card from server stash; Strawberry panic check (25%); `frtBroadcastServed()` |
| `frtBroadcastServed()` | SYNC `FRT_SERVED` (fruit/declaration/from/to/handledBy/stashes/turnEndTs) |
| `frtRenderAwait()` | Receiver UI — True/False buttons OR "Pass it on →" if `frtPeeked && canPeek` |
| `frtLegalPeekTargets()` | Returns valid Peek pass targets (excludes self + `frtPassHandledBy`; returns `[]` in duel) |
| `frtCall(verdict)` | Host: `frtHostResolveChallenge`; Client: ACTION `FRT_CALL` |
| `frtSubmitPeekPass()` | Host: `frtHostProcessPeekPass`; Client: ACTION `FRT_PEEK_PASS` |
| `frtHostProcessPeekPass(fromIdx, toIdx, declaration, swapStashIdx)` | Swap stash cards (Sus Pear), re-route card to new target, `frtBroadcastServed()` |
| `frtHostResolveChallenge(callerIdx, verdict)` | Determine correct result, run `frtSyllyResolve`, set `frtRevealData`, `frtBroadcastReveal()` |
| `frtComputeEliminated()` | Returns Set of player indices whose bowls ≥ `frtElimThreshold()` |
| `frtSyllyResolve(fruit, loserIdx, callerIdx, callerCorrect)` | Dispatches Sylly ability by fruit category (A/B/C); isolated function per ability |
| `frtBroadcastReveal()` | SYNC `FRT_REVEAL` |
| `frtScheduleAfterReveal()` | Host-only: 2.6s timeout then `frtAfterRevealHost()` |
| `frtAfterRevealHost()` | Check eliminated → `frtHostRoundEnd` or `frtBroadcastContinue` |
| `frtBroadcastContinue()` | SYNC `FRT_CONTINUE` (activePlayer/stashes/bowls/appleLock/turnEndTs) |
| `frtHostRoundEnd(eliminatedSet)` | Award Fruit Tokens, compute Silver Lining, SYNC `FRT_ROUND_END`; auto-advance to next round or gameover |
| `frtRenderReveal()` | Reveal screen UI (card flip, True/False verdict, loser info) |
| `frtRenderRoundEnd(eliminatedSet)` | Round-end summary state in `screen-frt-table` |
| `frtRenderGameover(silver)` | Gameover screen — Fruit Token totals + Silver Lining leaderboard |
| `frtRenderSpectator()` | Non-active player standby (during other's serve/await phases) |
| `frtRenderCard(fruitId, opts)` | **Asset-pack render seam** — all card DOM goes through here; `opts.faceDown` for back-of-card |
| `frtNorm2D(raw, n)` | Rebuilds a length-n 2D array with `[]` for Firebase-stripped empty arrays |
| `frtHandleEnvelope(env)` | Routes all FRT ACTION/SYNC packets; called from `engine-multiplayer.js` |
| `frtResetState()` | Full state teardown (called from `resetToLobby()` in `engine.js`) |

### Per-Game ACTION/SYNC Packet Types
| Packet | Type | Direction | Payload |
|--------|------|-----------|---------|
| `FRT_SERVE` | ACTION | Client → Host | `{fromIdx, toIdx, declaration, stashIdx}` |
| `FRT_CALL` | ACTION | Client → Host | `{callerIdx, verdict}` |
| `FRT_PEEK_PASS` | ACTION | Client → Host | `{fromIdx, toIdx, declaration, swapStashIdx}` |
| `FRT_PLAYER_LEFT` | ACTION | Client → Host | `{}` — dissolves match |
| `FRT_DEAL` | SYNC | Host → All | `{stashes, activePlayer, roundNum, playerCount, playerNames, syllyMode, fruitStock, scores, bluffWins, turnEndTs}` (bowls reconstructed empty client-side) |
| `FRT_SERVED` | SYNC | Host → All | `{fruit, declaration, fromIdx, toIdx, handledBy, stashes, turnEndTs}` |
| `FRT_REVEAL` | SYNC | Host → All | `{reveal, bowls, stashes, bluffWins}` |
| `FRT_CONTINUE` | SYNC | Host → All | `{activePlayer, stashes, bowls, appleLock, turnEndTs}` |
| `FRT_ROUND_END` | SYNC | Host → All | `{eliminatedSet, scores, bowls, roundNum, gameOver, opener}` |
| `FRT_GAMEOVER` | SYNC | Host → All | `{scores, silver}` |
| `FRT_MATCH_DISSOLVED` | SYNC | Host → All | `{}` |

### Counting Sheep (SHP) ACTION/SYNC Packet Types
| Packet | Type | Direction | Payload |
|--------|------|-----------|---------|
| `SHP_PLAY` | ACTION | Client → Host | `{handIdx}` single, or `{idxA, idxB}` for a Heavy-Eyelids two-card play |
| `SHP_DISRUPT` | ACTION | Client (spend-holder) → Host | `{choice}` — index 0–2 of the blind Nightmare Lottery pick |
| `SHP_STUCK_ACK` | ACTION | Client (stuck player) → Host | The held player's "Nod Off" tap — host resolves via `shpHostCrash` |
| `SHP_PLAYER_LEFT` | ACTION | Client → Host | PASS-contract mid-game quit — host dissolves the match |
| `SHP_DEAL` | SYNC | Host → All | `{hands, handCaps, wolfActive, herd, direction, activePlayer, moons, eliminated, elimOrder, dozed, dozeOrder, moonsToWin, playerCount, playerNames, meter, echo, nightNum, seatOrder, flavourIdx}` — game start + every new Night |
| `SHP_TURN_RESULT` | SYNC | Host → All | `{herd, direction, nextActive, forcedCards, played, rolled, byIdx, busted, hands, handCaps, wolfActive, meter, phase, ceiling, grace, drop, playHistory, seatOrder, lastEffect}` |
| `SHP_STUCK` | SYNC | Host → All | `{stuckIdx}` — new active player has no legal line; table HOLDS on a "Nod Off" button instead of auto-crashing |
| `SHP_DOZE` | SYNC | Host → All | `{crasher, reason, landedOn, mode: 'normal'\|'sylly', herd, dozed, dozeOrder, moons, eliminated, elimOrder, hands, handCaps, wolfActive, nextActive, phase, ceiling, grace, drop}` — every crash, normal (doze) or Sylly (Moon loss/Jolt); broadcasts even on the crash that ends the Night/match (`SHP_NIGHT_END`/`SHP_GAMEOVER` follow as their own packet) |
| `SHP_NIGHT_END` | SYNC | Host → All | `{winner, order, over, moons, nightNum, acksNeeded}` — normal mode only; ack-gated "Last One Awake" summary, host-continue → `SHP_DEAL` |
| `SHP_GHOST_READY` | SYNC | Host → All | `{holderIdx, optionIds}` — Nightmare Lottery opens for the spend-holder |
| `SHP_DISRUPT_RESOLVED` | SYNC | Host → All | `{nightmareId, targetIdx, text, herd, direction, nextActive, forcedCards, hands, handCaps, wolfActive, echo, meter, phase, ceiling}` |
| `SHP_GAMEOVER` | SYNC | Host → All | `{winner, standings}` — Daybreak (Sylly mode only; normal mode ends via `SHP_NIGHT_END`'s `over` flag) |
| `SHP_MATCH_DISSOLVED` | SYNC | Host → All | `{}` — a player left → all `resetToLobby()` (PASS contract) |

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

## Counting Sheep (SHP)

**JS file:** `js/games/shp.js`
**Data:** Fixed `SHP_CARDS` (17 card types incl. id 13 Fogged Dream phantom; ids 14/15/16 = Counting-Backwards −1/−2/−5) + `SHP_DECK_COUNTS` (73-card deck, ≈66% pasture) + `SHP_NIGHTMARES` (5, weighted) — no `words.json`; exempt from word-difficulty per non-word-bank carve-out (Hand Size is the velocity dial)
**Brand colour:** Moonlit indigo (`indigo-600`/`indigo-700`, native Tailwind) | **Active pill:** `pill-active-indigo` | **Toggle ON:** `game-toggle-on-indigo` | **Range:** `shp-range`
**MDLM-only**, host-authoritative, host-as-participant. **Sylly Mode = Night Terrors** (oscillating Climb ⇄ Plunge).

### Screens
| Screen ID | Purpose |
|-----------|---------|
| `screen-shp-menu` | Main hub — Lights Out, How to Play, Settings, ← Back to the Box |
| `screen-shp-table` | All play sub-states (your-turn / waiting / stuck "Nod Off" hold / sleepwalker spectator / Nightmare Lottery / doze banner / Night-End summary / Plunge re-skin) — `h-screen` sticky-footer |
| `screen-shp-night-intro` | Auto-advancing "Night N Begins" beat before each new deal — `ui-style.md` § Round/Night Intro Screen |
| `screen-shp-gameover` | Daybreak — reverse-elimination standings |

### Overlays
| Overlay ID | Pattern | z-index | Purpose |
|------------|---------|---------|---------|
| `shp-settings-overlay` | Data (slide-up) | z-[80] | "Bedtime Routine 🌙" |
| `shp-how-to-overlay` | Data (slide-up) | z-[90] | How to Play |
| `shp-quit-overlay` | Decision modal | z-[80] | "Tuck In?" — mid-game exit |
| `shp-new-night-overlay` | Decision modal | z-[90] | "Another Night?" — play-again |
| `shp-tip-overlay` | Decision modal | z-[90] | Shared contextual tips — `shpShowTip(emoji, heading, lines[])` |

### Key State Variables
| Variable | Type | Default | Purpose |
|----------|------|---------|---------|
| `shpHandSize` | int | `4` | Pen cap (3/4/5) |
| `shpMoons` | int | `3` | Starting lives (3/5/7) — Sylly mode only |
| `shpMoonsToWin` | int | `2` | Normal mode only — Moons needed to win the match |
| `shpDreamAccel` | bool | `true` | Number cards double while Herd < 50 |
| `shpSyllyMode` | bool | `false` | Night Terrors (Climb ⇄ Plunge) + Sleepwalkers ghost/Nightmare-Meter system |
| `shpSeatOrder` | array | `[]` | Seating RING — permutation of player indices; turn order walks this, not raw indices (Rude Awakening reseats it). Identity each Night; synced in every turn-changing packet |
| `shpLastEffect` | obj\|null | `null` | `{ text }` — outcome note for the current play (Swap Dreams partner / new seating order). Distinct from `shpLastDisrupt`, which `shpBroadcastTurn` deliberately clears |
| `shpNightIntroTimer` | handle\|null | `null` | setTimeout for the auto-advancing `screen-shp-night-intro`; cleared in `shpResetState()` |
| `shpNightFlavourIdx` | int | `0` | Host-picked index into `SHP_NIGHT_FLAVOUR`; rides in `SHP_DEAL` so all devices show the same line |
| `shpStuckIdx` | int | `-1` | Player with no legal line who must tap "Nod Off" (−1 = nobody). Host-declared, synced via `SHP_STUCK` — the table HOLDS on this instead of auto-running the Deep Sleep. Read with an explicit undefined/null check, never `\|\| -1` (seat 0 is falsy) |
| `shpHerd` | int | `0` | Running count |
| `shpCeiling` | int | `99` | Bust boundary — Climb 99; Plunge descends from overflow total. NEVER a literal in checks |
| `shpDirection` | int | `1` | 1 forward / −1 reversed |
| `shpMoonsHeld`/`shpEliminated`/`shpElimOrder` | arrays | `[]` | Moons per player (wins in normal mode, lives in Sylly), Sleepwalker flags (Sylly-only permanent-out), permanent-out order |
| `shpDozed`/`shpDozeOrder` | arrays | `[]` | Normal mode only — out of the current Night but still in the match; in-Night knockout order (reversed = Night-end finish order). Mode-disjoint from `shpEliminated` by construction — reset every deal |
| `shpStuckIdx` | int | `-1` | Active player with no legal line who must tap "Nod Off" (`-1` = nobody). Host-declared, synced via `SHP_STUCK`; the table HOLDS on this instead of auto-crashing — read with an explicit check, never `\|\| -1` (seat 0 is falsy) |
| `shpDozeNotice` | obj\|null | `null` | `{idx, reason, landedOn}` — table banner for the most recent doze/Moon-loss; cleared by the next play |
| `shpNightEndInfo` | obj\|null | `null` | `{winner, order, over}` — normal mode only, Night-end "Last One Awake" summary |
| `shpHands`/`shpHandCap`/`shpWolfActive` | arrays | `[]` | 2D hand ids, per-player cap, Wolf-shut flag |
| `shpFlock`/`shpDiscard` | int[] | `[]` | Draw pile / discard |
| `shpForcedCards` | int | `1` | 2 for Heavy Eyelids / Sleep Paralysis |
| `shpMeter`/`shpMeterFill` | int | `0`/`3` | Nightmare Meter charge / threshold |
| `shpGhostTurnIdx`/`shpSpendHolder`/`shpGhostOptions`/`shpGhostPending` | mixed | — | Lottery rotation, holder, 3 offered ids, gate flag |
| `shpEcho` | int | `0` | Global Echo modifier (+2 Pasture until next disruption) |
| `shpPhase`/`shpPlungeGrace`/`shpPlungeFlash` | mixed | `'climb'`/`0`/`false` | Night Terrors phase state |
| `shpPlungeDescentTurns`/`shpCurrentDrop` | int | `0`/`0` | Round-based ceiling descent: −2 base, +2 per full round (`SHP_DROP_BASE`/`SHP_DROP_STEP`). `shpCurrentDrop` rides in SYNC for display |
| `shpAnimSheep`/`shpAnimDir` | int/str | `0`/`'in'` | Sheep-flight parade count + direction (`'in'` grow / `'out'` counting-backwards) |
| `shpPlayerCount`/`shpPlayerNames` | int/[] | from lobby | Roster |

### Key Functions
| Function | Purpose |
|----------|---------|
| `shpStartSession()` | Host-only entry — init lives/elim, random opener → `shpDealNight` |
| `shpDealNight(openerIdx)` | Fresh 73-card deck, deal to living, broadcast `SHP_DEAL` |
| `shpStartSheepAnim(played, rolled)` | Sheep-flight parade: net Herd delta → arc-in/out count+dir (Climb-only; host + client) |
| `shpBuildFlock()` / `shpDrawUp(p)` | Deck build / draw to cap (Wolf trap shrinks cap, `continue` not break) |
| `shpRenderCard(id, opts)` | Asset-pack render seam (face / faceDown / wolf / inverted / cursed id 13) |
| `shpHerdAfterCard(herd, id, rolled)` | Single-source herd math — sign-flips arithmetic in the Plunge |
| `shpIsPlayable` / `shpLegalCards` / `shpHasLegalLine` | Phase-aware legality (Climb-sylly adds always legal; over-ceiling → reducers only) |
| `shpHostPlayCard` / `shpHostPlayTwoCard` | Resolve, draw, `shpPostResolve`, advance, `shpPlungeTick`, broadcast |
| `shpPostResolve(p)` | Plunge entry (overflow runway) / bust / mercy backstop |
| `shpAfterAdvance()` | Host: incoming player has no legal line → set `shpStuckIdx` + broadcast `SHP_STUCK` and HOLD (does NOT run the crash itself) |
| `shpConfirmStuck()` | The held player's "Nod Off" tap — host resolves directly via `shpHostCrash`, client sends `SHP_STUCK_ACK` |
| `shpHostCrash(crasherIdx, reason, landedOn)` | Every crash (bust / bad pair / stuck) lands here; routes to `shpHostDoze` (normal) or `shpHostMoonLoss` (Sylly) |
| `shpHostDoze(crasherIdx, reason, landedOn)` | Normal mode — crasher is out of THIS Night only (no redeal); hand discarded, `SHP_DOZE` broadcast; `shpHostNightEnd()` when one awake player remains |
| `shpHostMoonLoss(crasherIdx, reason, landedOn)` | Sylly mode — Moon lost; 0 Moons → permanent Sleepwalker elimination, else `shpJolt`; `shpHostGameover()` when one awake player remains |
| `shpJolt(i)` | Sylly's per-crash recovery — discards + redraws the crasher's whole hand, restores Wolf-shrunk cap, since Sylly no longer redeals |
| `shpHostNightEnd()` | Normal mode only — awards the surviving player a Moon, builds finishing order from `shpDozeOrder`, ack-gates `SHP_NIGHT_END`, checks `shpMoonsToWin` |
| `shpHostContinue()` / `shpHostGameover(finalNightOrder)` | Host-continue after Night-end ack-gate → next `shpDealNight`; Sylly match-end → standings |
| `shpAwake(i)` / `shpAwakeCount()` | `!shpEliminated[i] && !shpDozed[i]` — the single "still playing this Night" predicate; count of same |
| `shpRenderNightEnd()` | "Last One Awake" summary screen — live `N/shpMoonsToWin` standings, Finishing Order block; owns its own status bar (`Night N · Complete`) so it doesn't inherit the table's last-written header |
| `shpDozeNoticeText(n)` | Builds the doze/Moon-loss banner's four shapes (normal busted/stuck, Sylly Jolt, Sylly Sleepwalker) in one place |
| `shpRenderTableFooter()` | Footer-only repaint, split out of `shpRenderTable` so the 1s tap gate can re-enable taps without rebuilding the body (which restarts the sheep parade) |
| `shpChargeMeter` / `shpHostOpenLottery` / `shpPickNightmare` / `shpHostResolveDisrupt` / `shpApplyNightmare` | Ghost system: charge → Lottery → blind pick → resolve at turn-gate |
| `shpEnterPlunge` / `shpExitPlunge` / `shpPlungeTick` / `shpCheckMercy` | Night Terrors phase machine |
| `shpHandleEnvelope(env)` | MDLM ACTION/SYNC router |
| `shpResetState()` | Full teardown (from `resetToLobby()`) |

---

## Flawless (FLW)

**JS file:** `js/games/flw.js` — a faithful digital Love Letter (21-card Chancellor edition),
re-skinned as The Master Jeweller's Exhibition. **This section was previously badly stale** — it
documented an entirely different unshipped design (a pass-and-declare "server/receiver" bluffing
loop with `flwSubmitServe`/`flwPassFruit`/`declaration`). Rewritten from the real code 15 Aug 2026
(gem-seam plan Task 13); see `docs/decision-log.md`.
**Data:** Locked `FLW_DECK` constant (10 gems, gemId 0–9 doubles as carat value, 21 cards total —
no `words.json`); exempt from word-difficulty per non-word-bank carve-out.
**Brand colour — two pinks, used both ways round (15 Aug 2026, SETTLED):** `#F9A8D4` (light — the
Pink Diamond's pale facets) + `#A02050` (dark ink — carat text). **Primary surfaces**
(CTA/pills/toggle-ON, and the lobby's own `#btn-flw` tile) are `#F9A8D4` fill + WHITE text —
confirmed live by the owner against the lobby tile as the reference combo (measured contrast is
low, ~1.8:1, but this was twice confirmed, not an oversight). **Every secondary/utility button
flips it** — `#A02050` fill + WHITE text (simplified from light-pink text, round 5): Settings, Audit, and the readyCheck button
all match (the latter two were briefly left on the old pre-flip light tint before this pass).
`MP_GAME_CONFIGS.flw` no longer needs a `ctaTextClass` override — its default (white) already
matches. Plus `#C9A227` (Exhibition gold, card frame + labels); `#F472B6` survives only as the CTA
hover shade and `.flw-step-label`'s text-on-white colour. | **Active pill:** `pill-active-flw` |
**Toggle ON:** `game-toggle-on-flw` | **Range:** `flw-range`.
**MDLM-only**, host-authoritative, host-as-participant, **True Network Privacy** (private
`/private/{uid}` channel — the suite's first game built this way). **Sylly Mode = The Counterfeit
Run.**
**Lobby button:** `#btn-flw`

### Screens
| Screen ID | Purpose |
|-----------|---------|
| `screen-flw-menu` | Main hub — Enter the Exhibition, How to Play, Settings, ← Back to the Box |
| `screen-flw-table` | The Stack — header (one line: "The Showroom - Exhibition N", `#flw-header-title`), rival strip, Vault (one row: label — remaining — cut), Appraiser's Ledger (its two columns AND its title row both centred), Showroom Journal, hand row, action button |
| `screen-flw-showing-result` | Per-Showing reveal (final Showpieces), Diamond tally, that Showing's Journal — gated by a readyCheck (§ below) before the host's Next Showing unlocks |
| `screen-flw-gameover` | Best in Show — final reveal + podium (first to `flwTargetTokens()` Cut Diamonds wins) |

### Overlays
| Overlay ID | Pattern | z-index | Purpose |
|------------|---------|---------|---------|
| `flw-settings-overlay` | Data (slide-up) | z-[80] | "The Display Case 💎" — Appraiser's Ledger view, Diamonds to Win, Smoke & Mirrors, Appraisal Clock, Sylly Mode |
| `flw-how-to-overlay` | Data (slide-up), tabs: Rules \| Gems | z-[102] | How to Play. Raised above the Deep Vault/Loupe overlays (both z-[100]) 15 Aug 2026 — their tap-hold was opening this BEHIND them |
| `flw-quit-overlay` | Decision modal | z-[80] | "Pack Up Your Case?" — mid-game exit confirm |
| `flw-new-showing-overlay` | Decision modal | z-[90] | "Another Showing?" — play-again confirmation |
| `flw-target-overlay` | Decision modal | z-[90] | Choose a target for Sapphire/Topaz/Opal/Amethyst — lists every alive Collector, greys out the ineligible ones (Under Glass) rather than omitting them |
| `flw-scratch-overlay` | Decision modal | z-[90] | The Scratch Test (Clear Quartz) — target auto-selects when only one rival is left; guess is a 2-row gem-card grid, greyed for any gem the Ledger shows fully discarded |
| `flw-peek-overlay` | Decision modal | z-[100] | The Loupe — press-and-hold reveal of a peeked/leaked Showpiece |
| `flw-appraisal-overlay` | Decision modal | z-[90] | The Private Appraisal (Black Opal) outcome |
| `flw-emerald-overlay` | Data (slide-up) | z-[100] | The Deep Vault (Green Emerald) — keep 1 of 3; leftmost pre-selected, a description panel under the cards updates live with the selected gem's effect |
| `flw-cf-overlay` | Decision modal | z-[90] | "Forge a Gem" — The Counterfeit Run: claim any effect 1–7 (Sylly Mode) |

### Key buttons
| ID | Action |
|----|--------|
| `#btn-flw-menu-play` | Menu Play CTA — dual context: post-lobby starts session, pre-lobby opens `mpShowModeScreen('flw')` |
| `#btn-flw-action` | Primary action on the table screen (context-driven — Place, Discard (no effect), Forge, Waiting…) |
| `#btn-flw-audit` | Audit a rival's most recent claimed play (Sylly Mode only; shown when a charge remains and an auditable claim exists) |
| `#btn-flw-next-showing` | Host/single only — advances to the next Showing; disabled in MDLM until every other player has tapped `#btn-flw-result-ready` |
| `#btn-flw-result-ready` | Non-host only, on the Showing-result screen — "I've Seen It ✓"; confirms readiness before the host can advance (added 15 Aug 2026) |
| `#btn-flw-gameover-exit` | Post-game exit → `resetToLobby()` |

### Key State Variables
| Variable | Type | Default | Purpose |
|----------|------|---------|---------|
| `flwLedgerMode` | string | `'tally'` | `'tally'` / `'discards'` / `'off'` — Appraiser's Ledger view (setting) |
| `flwTokenMode` / `flwCustomTarget` | string / int | `'auto'` / `5` | Diamonds-to-win: `flwTargetTokens()` derives 7 (3p) / 5 (4p) when auto, else `flwCustomTarget` (3/5/7) |
| `flwBurnSetting` | int | `1` | Smoke & Mirrors — gems burned to `flwLockedLot` per Showing: 1/3/5 |
| `flwTurnTimer` | int | `0` | Appraisal Clock (s): 0(off) / 30 / 60 |
| `flwSyllyMode` | bool | `false` | The Counterfeit Run |
| `flwPlayerCount` / `flwPlayerNames` | int / string[] | `0` / `[]` | From lobby roster (`mpPlayerSlots[i].nickname`) |
| `flwTokens` | int[] | `[]` | Cut Diamonds per player (session-persistent) |
| `flwShowingNum` | int | `0` | Current Showing number (1-indexed) — shown as "Exhibition N" |
| `flwDeck` / `flwLockedLot` | int[] | `[]` | The Vault (index 0 = next draw) / the burned, hidden Locked Lot |
| `flwHands` | int[] | `[]` | Host-only: every player's Showpiece. Clients hold only their own via `flwMyHand` |
| `flwExposed` / `flwUnderGlass` | bool[] | `[]` | Out-this-Showing / immune-until-own-next-turn, per player |
| `flwDiscards` | int[][] | `[]` | Per-player discard piles (ledger tally + tie-break sum) |
| `flwDiscardFeed` | `{g,p}[]` | `[]` | Chronological cross-player discard order — feeds the discard-strip Ledger view |
| `flwTopPlay` | object[] | `[]` | Host-only: `{claimedId, realId, counterfeit, audited}` per player's most-recent auditable play |
| `flwTopClaims` | int[] | `[]` | Public mirror of `flwTopPlay`'s claimed ids (synced — clients can't see `flwTopPlay` itself) |
| `flwCounterfeitHeld` / `flwAuditCharges` | bool[] / int[] | `[]` | Sylly: still holds the 1 Counterfeit token / Audit Charges remaining (starts 2) |
| `flwMyHand` / `flwMyDrawn` | int\|null | `null` | This device's own Showpiece / this turn's drawn gem (private `FLW_HAND`/`FLW_DRAW`) |
| `flwLedgerCounts` | int[10] | `[]` | Public per-gem discard tally (Appraiser's Ledger tally view) |
| `flwResultReadyCheck` | bool[] | `[]` | Per-player confirmation they've seen the Showing result — gates the host's Next Showing in MDLM (added 15 Aug 2026) |
| `flwSelSlot` | string\|null | `null` | `'hand'` \| `'drawn'` — which of your two gems you're about to place |
| `flwActivePlayer` | int | `0` | Index of the current active player (seat-0 opener every Showing) |

### Key Functions
| Function | Purpose |
|----------|---------|
| `flwStartSession()` | Post-lobby entry — resets Tokens, deals the first Showing |
| `flwDealShowing()` | Builds the Vault, deals one Showpiece each, broadcasts `FLW_SHOWING_START`, distributes private hands |
| `flwBeginTurn()` | Draws the active player's 2nd gem (or triggers Vault Lock), broadcasts `FLW_TURN_START` |
| `flwRenderCard(gemId, opts)` | **Asset-pack render seam** — every gem's DOM goes through here (`opts.empty` for the fixed off-turn placeholder, `opts.faceDown` for a back) |
| `flwRenderTable()` | Repaints the table screen — header, rival strip, Vault, Ledger, Journal, hand row, action/audit buttons |
| `flwApplyEffect(active, gemId, targetIdx, guessId, changed)` | Resolves one gem's effect; returns the Journal line — states the CLAIMED gem, so a forgery's lie reads true |
| `flwHostResolvePlay(active, gemId, targetIdx, guessId)` / `flwHostResolveCounterfeit(active, p)` | Host-side genuine / forged play resolution |
| `flwHostAudit(auditor, targetIdx)` | Sylly: authenticate a rival's claimed play; exposes on a forgery, leaks the auditor's hand on a wrongful audit |
| `flwHostStartEmerald(active, retainedOverride)` / `flwHostResolveEmerald(active, keepId, returnOrder)` | Deep Vault two-step — offer 3, keep 1, return 2 to the Vault's bottom |
| `flwOpenTarget(gemId, legal)` | Target picker for Sapphire/Topaz/Opal/Amethyst — lists every alive Collector, greys the ineligible |
| `flwEndShowing(reason)` / `flwApplyShowingEnd(d)` | Scores the Showing (`'laststanding'` / `'vaultlock'`), resets `flwResultReadyCheck`, routes to result or gameover |
| `flwRenderResultReady()` | Renders the readyCheck gate on the Showing-result screen — host's disabled Next Showing + wait count, or the non-host's ready button |
| `flwHandleEnvelope(env)` | Routes all FLW ACTION/SYNC + private packets; called from `engine-multiplayer.js` |
| `flwResetState()` | Full state teardown (called from `resetToLobby()` in `engine.js`) |

### Per-Game ACTION/SYNC/Private Packet Types
| Packet | Type | Channel | Direction | Payload |
|--------|------|---------|-----------|---------|
| `FLW_PLAY` | ACTION | public | Client → Host | `{gemId, targetIdx, guessId}` or `{counterfeit, claimedId, keepSlot, targetIdx, guessId}` |
| `FLW_AUDIT` | ACTION | public | Client → Host | `{targetIdx}` |
| `FLW_EMERALD_RESOLVE` | ACTION | public | Client → Host | `{keepId, returnOrder}` |
| `FLW_RESULT_READY` | ACTION | public | Client → Host | `{}` — added 15 Aug 2026 |
| `FLW_PLAYER_LEFT` | ACTION | public | Client → Host | `{}` — dissolves match (PASS contract) |
| `FLW_HAND` | PRIVATE | `/private/{uid}` | Host → device | `{gemId}` — this device's Showpiece |
| `FLW_DRAW` | PRIVATE | `/private/{uid}` | Host → active device | `{gemId}` — this turn's drawn gem |
| `FLW_PEEK` | PRIVATE | `/private/{uid}` | Host → looker | `{targetIdx, gemId}` — Amethyst (Loupe) result |
| `FLW_LEAK` | PRIVATE | `/private/{uid}` | Host → accused | `{fromIdx, gemId}` — Sylly: a wrongful audit leaks the auditor's hand |
| `FLW_EMERALD_OFFER` | PRIVATE | `/private/{uid}` | Host → active device | `{cards}` — the 3-card Deep Vault offer |
| `FLW_SHOWING_START` | SYNC | public | Host → All | `{playerNames, playerCount, activePlayer, vaultCount, exposed, underGlass, tokens, ledger, target, showingNum, sylly, auditCharges, topClaims, log, discardFeed}` |
| `FLW_TURN_START` | SYNC | public | Host → All | `{activePlayer, vaultCount, underGlass, turnEndTs, topClaims}` |
| `FLW_RESOLVE` | SYNC | public | Host → All | `{exposed, underGlass, discardCounts, ledger, log, vaultCount, actor, topClaims, discardFeed}` |
| `FLW_AUDIT_RESULT` | SYNC | public | Host → All | `{auditor, targetIdx, caught, exposed, ledger, log, auditCharges, vaultCount, topClaims}` |
| `FLW_SHOWING_END` | SYNC | public | Host → All | `{reason, winners, reveal, tokens, obsidianBonus, resultText, exposed, log, ledger, target, gameOver, gameWinner, discardFeed, resultReady}` |
| `FLW_RESULT_READY_SYNC` | SYNC | public | Host → All | `{resultReady}` — added 15 Aug 2026 |
| `FLW_MATCH_DISSOLVED` | SYNC | public | Host → All | `{}` |

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

Per-game: LI5 `ptp`★/`tlm` · GM `ptp`★/`mdlm` · SS `tlm`★/`mdlm`/`ptp` · JEC `mdlm`★/`ptp` · YGI `mdlm`★/`ptp` · LTTP `mdlm`★/`ptp` · NAT `mdlm`★/`ptp` · DSD `tlm`★/`mdlm`/`ptp` · GTH `mdlm`★ (MP-only, 4–8) · DYB `mdlm`★ (MP-only, 3–8) · BLD `mdlm`★ (MP-only, 4–10 per `getMinPlayers` — note `game-identities.md` says min 5) · PASS `mdlm`★ (MP-only, 3–6) · NT `mdlm`★/`ptp` (2–8; DNP requires min 4) · FRT `mdlm`★ (MP-only, 2–8) · SHP `mdlm`★ (MP-only, 3–8) · FLW `mdlm`★ (MP-only, 3–4) (★ = recommended)

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
| `mpSendEnvelope(env)` | Async — writes `{type, payload, originId, timestamp}` envelope to Firebase public `/events` channel |
| `mpSendPrivate(targetUid, envelope)` | Async — writes envelope to `rooms/{code}/private/{targetUid}` (True Network Privacy — used for FLW private hand distribution) |
| `mpStartPrivateListener()` | Attaches `onChildAdded` to `rooms/{code}/private/{syllyDeviceUid}`; ts-filtered + self-origin-filtered; routes to `mpHandleEnvelope`. Called after room create/join. Cleared in `mpStopListeners()` via `mpPrivateListener` handle |
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
| DYB | *(see The Bluff section packet table)* | *(see The Bluff section packet table)* |
| BLD | *(see Bailed section packet table)* | *(see Bailed section packet table)* |
| PASS | *(see Pass section packet table)* | *(see Pass section packet table)* |
| NT | *(see Net-Trace section packet table)* | *(see Net-Trace section packet table)* |
| FRT | *(see Fruit Salad section packet table)* | *(see Fruit Salad section packet table)* |
| SHP | *(see Counting Sheep section packet table)* | *(see Counting Sheep section packet table)* |
| FLW | `FLW_PLAY`, `FLW_AUDIT`, `FLW_EMERALD_RESOLVE`, `FLW_PLAYER_LEFT` (public); private channel: `FLW_HAND`, `FLW_DRAW`, `FLW_PEEK`, `FLW_LEAK`, `FLW_EMERALD_OFFER` | `FLW_SHOWING_START`, `FLW_TURN_START`, `FLW_RESOLVE`, `FLW_AUDIT_RESULT`, `FLW_SHOWING_END`, `FLW_GAMEOVER`, `FLW_MATCH_DISSOLVED` |

---

## Pecking Order (PKO)

**JS file:** `js/games/pko.js`
**Data:** `data/pko-data.json` — 15 entries (13 animals + Poacher + **Mimic**). `beaten_by` is the strict (Sated) chain; `reach_beaten_by` carries the six **Ravenous** two-tier edges and is never merged into it. Both forward maps (`pkoBeatsMap` / `pkoBeatsWideMap`) are derived at load, never stored. The Mimic is `force_of_nature_only` and `track: 'wild'` — it never enters a standard Pool and never becomes a Mark. Exempt from word-difficulty per the non-word-bank carve-out (Hoard Size is the velocity dial).
**Brand colour:** `#854D0E` (savanna amber-brown — custom; hover `#6B3E0B`) | **Active pill:** `pill-active-pko` | **Toggle ON:** `game-toggle-on-pko` | **Range:** `pko-range` | **CTA/label:** `pko-cta` / `pko-label`
**MDLM-only**, 3–6 players, host-authoritative, host-as-participant, private Hoards over the `/private/{uid}` channel. **Sylly Mode = Force of Nature — SHIPPED (SW v149).** Nine events: the fixed opener `invasive-mimicry` plus eight drawn per Encounter (`culling`, `great-reversal`, `deluge`, `dry-season`, `extinction`, `migration`, `alpha`, `carrion`).
**Lobby button:** `#btn-pko` | **Spec:** `docs/new-game-tech-pecking-order.md`, Force of Nature: `docs/new-game-tech-pecking-order-fon.md`
**Verification:** three headless harnesses — `tools/verify-pko-chain.js` (68 checks, data layer), `tools/verify-pko-loop.js` (132, turn loop), `tools/verify-pko-events.js` (143, Force of Nature). Re-run all three after any change to the chain, the appliers, the balance numbers or the event rules.

### Screens
| Screen ID | Purpose |
|-----------|---------|
| `screen-pko-menu` | Main hub — Enter the Wild, How to Play, Settings, ← Back to the Box |
| `screen-pko-clash-intro` | **Clash Intro** (`ui-style.md` § Round/Night Intro Screen) — auto-advances after **5 s** (`pkoClashIntroTimer`, `PKO_INTERSTITIAL_MS`) into `screen-pko-hoard`. Rotating flavour line from `PKO_CLASH_FLAVOUR`, host-picked index synced via `flavourIdx` in `PKO_CLASH_BEGIN`. Interstitial exception, no `[?]`/🔊/✕. Shown by `pkoShowClashIntro()`, called from both `pkoStartClash()` (host) and the `PKO_CLASH_BEGIN` client applier |
| `screen-pko-hoard` | Private deal reveal at the start of each Clash; "I'm Ready" readyCheck |
| `screen-pko-table` | Main play — Active Marks, player strip, own Hoard fan, Stake/Challenge/Stampede/Retreat. Header is `#pko-table-clash` (`Clash X · Encounter Y`) + `#pko-table-event` (`· emoji Name`, the live Force of Nature event) + `#btn-pko-events` — all three written by `pkoRenderTable()`; the event span and the `[?]` are hidden outside Force of Nature |
| `screen-pko-event` | **Force of Nature** event interstitial — emoji, name, blurb; auto-advances after **5 s** (`pkoEventTimer`, `PKO_INTERSTITIAL_MS`). Takes the **interstitial exception** (`ui-style.md` Global UI Protocol item 5): no `[?]`/🔊/✕ chrome. Unlike `screen-pko-unchallenged`, **both** sides schedule their own advance — after it the table renders from already-synced state, so no host decision is pending |
| `screen-pko-unchallenged` | Encounter-winner interstitial — auto-advances after **5 s** (`pkoUnchallengedTimer`, same `PKO_INTERSTITIAL_MS`). **Host only** schedules the advance (it *starts* the next Encounter, which is a host decision) |
| `screen-pko-clash-result` | Clash winner + Match standings; "Next Clash" is host-gated |
| `screen-pko-hierarchy` | Game over — ranked standings (Apex Predator / Bottom Feeder) + Clash history grid |

### Overlays
| Overlay ID | Pattern | z-index | Purpose |
|------------|---------|---------|---------|
| `pko-settings-overlay` | Data (slide-up) | z-[80] | "The Conditions 🌿" — game settings |
| `pko-challenge-overlay` | Data (slide-up) | z-[80] | Challenge builder — Marks row → slot row → Hoard fan (spec §17 D1: an overlay, **not** a screen) |
| `pko-how-to-overlay` | Data (slide-up) | z-[90] | How to Play — **three tabs: The Rules \| Diagram \| Animals**. The Diagram is `assetExtra('pko','chain')`; Animals is the per-card `beaten_by` list. Absorbed the former `pko-chain-overlay` (D39, Aug 2026) — tap-holding a card still opens straight onto **Animals**, scrolled to that card |
| `pko-trail-overlay` | Data (slide-up) | z-[90] | **The Watering Hole** — **two tabs: Trail (default) \| Discards**. Opened by tapping the pile (`#btn-pko-hole`); the standalone "The Trail →" link is retired. Id kept for the `resetToLobby()` teardown list |
| `pko-events-overlay` | Data (slide-up) | z-[95] | **Force of Nature 🌿** — the nine-event roster. Body (`#pko-events-body`) is **rendered from `PKO_EVENTS`** by `pkoRenderEvents()`, so it cannot drift from the registry; rules copy comes from `PKO_EVENT_DETAIL` (keyed by event id, beside the registry). The live event is ringed with `.pko-event-live` and tagged "now"; Invasive Mimicry is tagged "every Clash". **z-[95] because it opens from inside the how-to (z-[90])** — the FRT `frt-personalities-overlay` precedent. Three entry points, all `.btn-pko-events-open`: `#btn-pko-events` (table header), `#btn-pko-events-settings`, `#btn-pko-events-howto` |
| `pko-quit-overlay` | Decision modal | z-[80] | "Abandon your territory?" — mid-game exit confirm |
| `pko-stampede-overlay` | Decision modal | z-[90] | "Stampede with [species] ×N?" confirm |
| `pko-new-match-overlay` | Decision modal | z-[90] | "New Match?" — play-again confirmation |
| `pko-carrion-overlay` | Decision modal | z-[90] | **Force of Nature — Carrion.** Timed spoils window (`PKO_CARRION_WINDOW_MS`, 5 s). The Challenger taps beaten Marks to keep; everyone else sees a waiting line. Countdown bar is a pure `transform` transition (`.pko-carrion-track` / `.pko-carrion-bar`), no timer of its own. Border `border-[#E4CFA3]` matching `pko-quit-overlay` |

### Key buttons
| ID | Action |
|----|--------|
| `#btn-pko-menu-play` | Menu Play CTA — dual context: post-lobby `pkoStartSession()`, pre-lobby `mpShowModeScreen('pko')` |
| `#btn-pko-hoard-ready` | readyCheck submit on the deal screen |
| `#btn-pko-stake` / `#btn-pko-challenge` / `#btn-pko-stampede` / `#btn-pko-retreat` | The four table actions (active player only) |
| `#btn-pko-chain` / `#btn-pko-challenge-chain` / `#btn-pko-howto-see-chain` | The entry points onto the Diagram/Animals tabs of `pko-how-to-overlay` |
| `#btn-pko-hole` | The Watering Hole pile in the Marks row → `pko-trail-overlay` (Trail tab) |
| `#btn-pko-chain-tab-diagram` / `#btn-pko-chain-tab-animals` | Chain overlay tabs |
| `#btn-pko-hole-tab-trail` / `#btn-pko-hole-tab-discards` | Watering Hole overlay tabs |
| `#btn-pko-challenge-confirm` / `#btn-pko-challenge-back` / `#btn-pko-challenge-reset` | Builder controls — Challenge (primary, label doubles as the `N of M answered` progress readout) / ← Back (closes + clears the draft) / small inline ↺ Reset beside "Your Challenge" |
| `#btn-pko-how-to` (hoard) / `#btn-pko-table-how-to` (table) | Header `[?]` → How to Play. Distinct IDs — a duplicate would leave one permanently unwired |
| `#btn-pko-hierarchy-exit` / `#btn-pko-go-leave` | Post-game exit → `resetToLobby()` |

### Key State Variables
| Variable | Type | Default | Purpose |
|----------|------|---------|---------|
| `pkoScoring` | string | `'dominance'` | **Law of the Wild** — `'dominance'` (first to `pkoClashTarget` Clashes) / `'stragglers'` (play `pkoClashTarget` Clashes; fewest leftover cards takes the Match) |
| `pkoClashTarget` | int | `3` | 3 / 5 / 7 — Clashes to **win** under Dominance, Clashes to **play** under Stragglers. One number, two meanings, which is why the settings card carries the `#pko-val-law` live value line |
| `pkoHoardSize` | int | `12` | Cards dealt per player: 10 / 12 / 15 |
| `pkoPoacherSetting` | string | `'perPlayer'` | Poacher Cards: `'none'` / `'flat3'` / `'perPlayer'` |
| `pkoScavenge` | bool | `false` | Draw 1 from the Reserve on Retreat |
| `pkoStartSmall` | string | `'match'` | **Small Fry** — the opening Stake must be the player's smallest animal: `'off'` / `'match'` (first Encounter of the Match) / `'clash'` (first Encounter of every Clash) |
| `pkoSyllyMode` | bool | `false` | **Force of Nature** — the Sylly Mode gate. Read in `pkoStartClash` (Invasive Mimicry on the deal) and `pkoStartEncounter` (`pkoDrawEvent` from Encounter 2 on) |
| `pkoScores` / `pkoClashHistory` | int[] / int[][] | `[]` | One history row per Clash plus its running column total, in **both** modes — Dominance banks a `1` for the emptied Hoard, Stragglers banks every other player's remaining card count. A parallel straggler array was rejected: it would need its own reset, payload field and applier — three more places for the halves to drift |
| `pkoHoards` | string[][] | `[]` | **Host only** — every player's Hoard |
| `pkoMyHoard` | string[] | `[]` | **This device only** — own cards. Written by the private `PKO_HAND` (deal), `PKO_DRAW` (Scavenge) and `PKO_HAND_SYNC` (repair after this device played — BUG-02) packets |
| `pkoHoardCounts` | int[] | `[]` | Public mirror of Hoard sizes (counts, never contents) |
| `pkoReserve` | string[] | `[]` | **Host only** — undealt Pool; Scavenge draws from it |
| `pkoWateringHole` | `{enc,cards[]}[]` | `[]` | The discard pile as **batch records** — one per spent board, so it stays grouped by the play that spent it (total via `pkoHoleCount()`). Host-authored but **mirrored to every device** (broadcast in `PKO_BOARD` / `PKO_UNCHALLENGED` / `PKO_ENCOUNTER_BEGIN` / `PKO_CLASH_BEGIN`). Public by design: every card in it was face-up on the board first |
| `pkoMarks` | string[] | `[]` | The board — **always one card id per Mark, never nested** |
| `pkoMarkOwnerIdx` / `pkoTurnIdx` / `pkoLeaderIdx` | int | `-1` / `0` / `0` | Board owner, whose turn, who opened the Encounter |
| `pkoRetreatedSince` | bool[] | `[]` | Resets on **every** board change — the Encounter's termination condition |
| `pkoDraft` | int[][] | `[]` | Challenge builder — one **array of fan positions** per Mark (not card ids — Hoards hold duplicates; see impl-notes DD-16). `[]` = unanswered, 1 = a predator answer, 2 = a **Swarm**; never longer. Confirm needs every slot to satisfy `pkoAnswers()`; positions map to ids at the wire |
| `pkoStakeSel` vs `pkoDraft` | — | — | **Two selection models, never interchangeable.** `pkoStakeSel` is a flat position list for a Stake (one species only, §7); `pkoDraft` is per-Mark and freely mixed for a Challenge. Running the Challenge through `pkoStakeSel` imported the Stake's single-species refusal — impl-notes BUG-05 |
| `pkoAppetite` | string | `'sated'` | `'sated'` / `'ravenous'` — how far down the chain a predator reaches. **Load-bearing in MP**: the host re-validates with `pkoBeats()`, so it must travel in SETTINGS_SYNC |
| `pkoSelectedSlot` | int | `-1` | Challenge builder Method A — the armed Mark slot; `-1` = none armed (taps then use Method B) |
| `pkoBeatenByMap` / `pkoBeatsMap` | object | `{}` | Strict (Sated) chain: from the data file / **derived by inversion at load** |
| `pkoBeatenByWide` / `pkoBeatsWideMap` | object | `{}` | Ravenous chain: `beaten_by ∪ reach_beaten_by` / derived. Built at load alongside the strict pair — `pkoAppetite` only *chooses*, so changing the setting never reloads |
| `pkoUnchallengedTimer` | int\|null | `null` | Interstitial auto-advance — cleared in quit-confirm, `resetToLobby()`, and early transitions |
| `pkoEvent` | string\|null | `null` | The active Force of Nature event id for this Encounter, or `null`. **Never compared to a string at a call site** — every branch reads `pkoEventFlag(key)` |
| `pkoEventsFired` | string[] | `[]` | Event ids fired this Clash. **ACCUMULATOR — resets in-payload** (`PKO_CLASH_BEGIN` carries `[]`). Drives Extinction's once-per-Clash `canFire()` |
| `pkoAlphaIdx` | int | `-1` | Index into `pkoMarks` of the **Alpha** Mark; `-1` = none. Assigned on the opening Stake (D29), reassigned over the new board after each Challenge, cleared by Stampede and Encounter end. Travels on `PKO_BOARD` |
| `pkoCarrionSel` | int[] | `[]` | **This device only** — Mark indices the Challenger has tapped to keep in the Carrion window |
| `pkoCarrionPending` | object\|null | `null` | **Host only** — `{ playerIdx, spoils[] }` while a Carrion window is open. Doubles as the race guard: `pkoResolveCarrion` drops any second resolution (ML-05) |
| `pkoEventTimer` / `pkoCarrionTimer` | int\|null | `null` | Force of Nature timer handles — both cleared in **three** places: quit-confirm, `pkoResetState()`, and `PKO_ENCOUNTER_BEGIN` / `pkoResolveCarrion` |

### Key Functions
| Function | Purpose |
|----------|---------|
| `pkoLoadChain()` | Loads `data/pko-data.json`; derives **both** forward maps by inverting `beaten_by` and `beaten_by ∪ reach_beaten_by`; `await artReady` so the first render already has core art. Async + idempotent; called from the `#btn-pko` lobby-entry handler so the chain overlay works before a Match exists |
| `PKO_PREY_RANK` (const) | The size ladder for Small Fry — land and sea as parallel rungs (mouse/fish 1 … elephant/orca 5). **Not derived from `beaten_by`**: the chain has cycles, so it has no well-defined depth. Bee / Eagle / Stingray / Poacher are deliberately unranked |
| `pkoSmallFryActive()` / `pkoOpenerSpecies(hoard)` | Is this board state a Small-Fry-constrained opener; and which species may open given a Hoard (`null` = unconstrained, including when the Hoard holds no ranked card at all, which prevents a deadlock). Takes the hoard as an argument so the host can re-validate a client's Stake against its own mirror |
| `pkoBeats(markId, cardId)` | **The single-source chain predicate** — builder highlighting, confirm gating, host re-validation, Stampede availability all route through it. Reads the active predator set via `pkoPredators()`. No track check (track-locking is emergent) |
| `pkoPredators(markId)` | The active predator Set for the current `pkoAppetite`. Also backs the chain overlay, so the reference can never disagree with combat |
| `pkoAnswers(markId, cards)` | **The single-source per-slot predicate.** 1 card → the chain; 2 → a **Swarm** (two of the Mark's own species, never a Poacher, never 3+). The only version that crosses the wire |
| `pkoSlotAccepts(markId, cards)` | Builder-only: may this group *sit* here while still being built? Accepts a lone card that matches its Mark as half a Swarm. Never used for submission |
| `pkoCycleAnswerGroup(grp)` | The TABLE fan's answer path — the Challenge counterpart of `pkoCycleStakeGroup`. Builds `pkoDraft` via the builder's own `pkoAutoFillSlot`, so mixed answers work by construction (BUG-05). Tap cycle wraps like the Stake's: once every copy of a species is committed, one more tap releases the whole group |
| `pkoDraftComplete()` | Does `pkoDraft` legally answer every Mark? Drives the Challenge button's dual behaviour — commit when true, open the builder when false |
| `pkoDiscardBoard()` / `pkoHoleCount()` | Pushes the spent board to the Watering Hole as ONE batch record / totals the pile. Every discard site funnels through the first so the shape cannot drift |
| `pkoChallengeHint(text)` / `pkoRejectionReason(markId, cardId)` | The builder's named-refusal line (BUG-04). Reasons derive from `pkoPredators()`, so help cannot drift from `pkoBeats` |
| `pkoBuildPool(n)` | Builds the Pool — totals **110 / 146 / 183 / 219** at n=3/4/5/6 on defaults; Eagle is `Math.ceil(1.5 * n)` |
| `pkoRenderCard(id, opts)` | **Asset-pack render seam** — all animal-card DOM goes through here. `opts: { faceDown, size: 'sm', selected, dimmed }` (`alpha` is Phase 2). Resolves skin → core art → emoji via `assetFace('pko', id)` / `assetBack('pko')`; sets `dataset.cardId` so handlers read ids, never indices |
| `pkoStartSession()` / `pkoStartClash()` / `pkoStartEncounter()` | Match / Clash / Encounter lifecycle (host-authoritative). `pkoStartSession()` is async — it awaits `pkoLoadChain()` before dealing. `pkoStartClash()` ends in `pkoShowClashIntro()`, not the deal screen directly |
| `pkoShowClashIntro()` | The Clash Intro auto-advance (`screen-pko-clash-intro`) → `pkoShowHoard()` after `PKO_INTERSTITIAL_MS`. Called by both `pkoStartClash()` (host) and the `PKO_CLASH_BEGIN` client applier so neither device skips it; self-clears `pkoClashIntroTimer` on every call (rapid-redeal guard) |
| `pkoSendPrivateHands()` | Host → each device its OWN Hoard via `mpSendPrivate`; the host keeps its own locally (contents never touch `/events`) |
| `pkoShowClientStandby()` | Client's post-lobby home — `screen-pko-hoard` in its empty "waiting for the deal" state (no separate standby screen) |
| `pkoMyIdx()` / `pkoSortHoard()` / `pkoRenderFan(el, opts)` | This device's seat; chain-order sort; the ONE fan renderer shared by the deal screen and the table |
| `pkoGroupHoard(sorted)` | Collapses a sorted Hoard into runs of one species → `[{ id, positions[] }]`. Positions index the **sorted** list — the coordinate `pkoStakeSel` and `pkoDraft` speak |
| `pkoLayoutFan(el)` | **The overlap layout.** Applies a negative `margin-left` per card — heavy stride within a species (~0.20×W), light between (~0.64×W) — shrinking both toward a floor so a 15-card hand fits the column instead of scrolling. Reads card width from the **DOM**, not the CSS constant; sets an explicit `z-index` per card (a dimmed card's `opacity` makes its own stacking context). Re-runs on the next frame if measured while hidden |
| `pkoRenderHoardScreen()` / `pkoRenderPlayerStrip()` | Deal-screen render (fan, count, ready state, waiting line); table player strip — names + counts + Retreated flags, never contents |
| `pkoCanStampede()` | Derived: all Marks one species, not a Poacher, and you hold ≥ `pkoMarks.length + 1` real copies |
| `pkoAfterBoardChange(playerIdx)` | The shared tail of Stake / Challenge / Stampede — Clash-end check first (§6), then reset `pkoRetreatedSince`, restart the window clockwise, broadcast, re-render |
| `pkoHoldsAll(hoard, cards)` / `pkoRemoveFromHoard()` / `pkoCardName(id)` | Host-side board helpers; `pkoHoldsAll` counts duplicates, so a client cannot claim cards it doesn't hold |
| `pkoAdvanceTurn()` / `pkoCheckEncounterEnd()` / `pkoEndEncounter()` | Clockwise skip of the board owner and anyone Retreated since the last board change; the termination test; the Unchallenged resolution. **`pkoEndEncounter()` clears `pkoMarks` synchronously** — not on the interstitial's 2.5 s timer — so a late in-flight Retreat cannot resolve the Encounter twice (BUG-01) |
| `pkoCycleStakeGroup(grp)` / `pkoShakeFan(pos, containerId)` / `pkoBindChainHold(el, id)` | **The species group is the tap target** (overlap leaves ~7px of a single card): a tap cycles the staked count 0 → 1 → … → N → 0, selecting the group's *last* positions so the lift stays on top. Refuses Poacher, a mixed species, and a Small-Fry-barred species. `pkoShakeFan` queries `[data-pos]` — grouping means a fan position is no longer its DOM index |
| `pkoOpenChallenge()` / `pkoRenderChallenge()` | Opens the builder (arms a fresh `pkoDraft`, one empty array per Mark); renders Marks row → slot row → Hoard fan and gates Confirm, whose label reads `N of M answered` until every slot satisfies `pkoAnswers()`. A half-built Swarm renders `.pko-slot-partial` with a prompt |
| `pkoTapSlot(i)` / `pkoTapFanCard(pos)` | Slot tap arms/disarms it — tapping a **filled** slot returns its card to the fan and stays armed (the only un-assign path, DD-17). Fan tap routes to Method A when a slot is armed, Method B when not |
| `pkoAssignToSlot(slotIdx, pos)` / `pkoAutoFillSlot(pos, containerId)` | **Method A** (Mark-first — the armed slot or nothing; stays armed while a Swarm is half-built) / **Method B** (card-first — completes a started Swarm *first*, else the leftmost empty Mark the card answers, else starts a Swarm). Both gate on `pkoSlotAccepts()`; both shake + `playBoing()` + a named reason on refusal |
| `pkoSubmitChallenge()` / `pkoSendChallenge(assignments)` | Reads `pkoDraft` → **the single validated exit**. `assignments` is one id array PER SLOT — `[['bear'],['mouse','mouse']]`. The table and the builder share one draft, so there is no second route to bypass a check |
| `pkoResetChallenge()` / `pkoDismissChallenge()` | Reset returns every card to the fan; **Dismiss** closes the overlay *and* clears the draft, called from every SYNC that replaces the board so a stale draft can never be Confirmed against gone Marks |
| `pkoRenderStampede()` | Populates the Stampede confirm modal — heading names species + count, preview shows the N+1 Marks it will leave |
| `pkoSummariseCards(ids)` | Trail text helper — groups duplicates (`"Bear ×2, Poacher"`) so a six-wide board reads in one line |
| `pkoApplyExpansionOverrides()` | Documented **no-op** — PKO has no word pool (fixed chain); skins arrive through `assetFace()` inside the render seam. Kept plugin-prefixed so it can never clobber LI5's bare `applyExpansionOverrides()` |
| `pkoBuildStandings()` | Shared ranking block for the Clash result and the Hierarchy — ties share a rank; names Apex Predator / Bottom Feeder. Sort direction and both titles' "nothing has happened yet" guard flip with `pkoScoring`: under Stragglers `0` is the *best* score, so the guard is `pkoClashHistory.length`, never the number itself |
| `pkoRenderChain(highlightId)` / `pkoRenderTrail()` | The chain reference (reads `beaten_by` directly — it *is* the rules); the public match log grouped by Encounter |
| `pkoOpenHowTo(tab, id)` / `pkoSetHowToTab(tab, id)` / `pkoOpenChain(id)` / `pkoRenderChainDiagram()` | The three How-to tabs. Every entry point routes through `pkoOpenHowTo` so the pill state can never disagree with the visible body; `pkoOpenChain` is a thin wrapper picking **Diagram** from a button and **Animals** (scrolled to the card) from a tap-hold. The diagram is `assetExtra('pko','chain')` — the first call site for that seam |
| `pkoRenderWateringHole()` / `pkoOpenHole()` / `pkoSetHoleTab(tab)` / `pkoRenderDiscards()` | The discard pile in the Marks row (face-down top card + count, dashed placeholder when empty) and its two-tab overlay; Discards groups spent cards with ×N counts |
| `pkoSubmit*()` / `pkoApply*()` | Client sends ACTION; **host mutates directly then broadcasts SYNC** — the host is a full player and self-sent ACTIONs are dropped by the dedup guard |
| `pkoCheckEncounterEnd()` | Every player other than the board owner has Retreated since the last board change |
| `pkoResolveClash(winnerIdxs)` | Push one `pkoClashHistory` row, add it into `pkoScores`, decide Clash-end vs Match-end. Row contents **and** end condition branch on `pkoScoring`: Dominance is a race (`score >= target`, joint winners share the Match); Stragglers is a fixed distance (`pkoClashNum >= target`) whose champion may have won no Clash at all. Straggler counts are read from `pkoHoards` — the host's authority — never `pkoHoardCounts`, the public mirror |
| `pkoNextOpener(winnerIdxs)` | Which of several joint winners opens the next Clash: the strongest of them via `pkoBestScore`, then random. With one winner it is that winner (shipped behaviour) |
| `pkoStragglersMode()` / `pkoBestScore(list)` | The single-source scoring predicate and its "which score is winning" helper. Every ranking, tiebreak and title asks these rather than reaching for `Math.max` — a mode read the wrong way round does not throw, it just crowns the wrong player |
| `pkoClashLabel()` / `pkoScoreText(n)` | "Clash 2" vs "Clash 2 of 3" (Dominance has no fixed length, so a total would be a lie); "3 Clashes" vs "3 Stragglers" |
| `pkoApplyScoringMode(p)` | Client half of the `scoring` + `clashTarget` fields carried by `PKO_CLASH_BEGIN` / `PKO_CLASH_END` / `PKO_MATCH_END`. Re-asserts the host's rules on every scoring packet, so a client that moved a pill on the game menu self-heals before it ever renders a score |
| `pkoSyncSettingsUI()` / `pkoRenderLawValue()` / `pkoSyncToggle(id, on)` | Repaint every pill, toggle and the `#pko-val-law` value line from state; called by `pkoOpenSettings()`. Before this, PKO's pills were HTML defaults nothing ever re-synced, so a client holding the host's `SETTINGS_SYNC` rules in memory still showed its own defaults on screen |
| `pkoDiscardBoard(exceptIdx)` / `pkoDiscardCards(cards)` | The board → one Watering Hole batch record, sparing `exceptIdx` (the **Alpha**; default `-1` spares nothing). `pkoDiscardCards` discards an explicit list — used by Carrion, where the board has already been replaced by the time the leftovers are known |
| `pkoAfterBoardChange(playerIdx, spoils)` / `pkoResumeAfterBoardChange(playerIdx)` | Every successful board change funnels here. Order is load-bearing: the **empty-Hoard check runs first**, which is what stops Carrion un-winning a Clash (§7.5) — do not reorder. `spoils` is passed **only by a Challenge**; a Stake beats nothing and a Stampede is a rout. The tail is split out so the Carrion window can defer it |
| `pkoSyncHand(playerIdx)` / `pkoSyncAllHands()` | The private hand-repair packet. Means **"this Hoard changed"**, not "a card was played" — The Culling, Extinction and Migration all mutate Hoards with no card played, and a repair keyed to a play would miss all three (logic-engine ML-06, BUG-02's class) |
| `pkoHandleEnvelope(env)` | Routes all PKO ACTION/SYNC + private packets; called from `engine-multiplayer.js` |
| `pkoResetState()` | Full state teardown (called from `resetToLobby()` in `engine.js`) |

#### Force of Nature (Sylly Mode)
| Function | Purpose |
|----------|---------|
| `PKO_EVENTS` (const) | The nine events as **plain data** — `{ id, name, emoji, blurb, canFire, onFire, track, reversal, alpha, carrion }`. A **mutating** event owns an `onFire()` returning `int[]` of seats it emptied; a **passive** event sets a flag an existing predicate reads, so no new branch appears at any call site |
| `pkoEventFlag(key)` | The active event's value for one key, else `null`. **Every** Force of Nature branch reads through here — an effect is never tested by comparing `pkoEvent` to a string, so adding an event never edits a seam |
| `pkoDrawEvent()` | Draws the Encounter's event. **A gate, never a redraw**: an event `canFire()` rejects is simply absent from the pool — no skip, no re-roll, no loop, no cap to tune (D34). `pkoEvent = null` is a legal outcome |
| `pkoShowEvent(eventId, then)` | The interstitial. `PKO_EVENT_SOUND` maps each event to an existing audio function — no new synthesised sounds. Dwells `PKO_INTERSTITIAL_MS` (5 s), the same constant `pkoShowUnchallenged` uses |
| `pkoOpenEvents()` / `pkoRenderEvents()` | The Force of Nature roster overlay. Rebuilt on every open from `PKO_EVENTS` + `PKO_EVENT_DETAIL` — **adding a tenth event needs no markup and no doc edit**, only a registry entry, a detail string and a sound (the events harness asserts all three side tables cover the registry exactly) |
| `pkoCanActUnderTrack(hoard, track)` / `pkoTrackOk(id)` / `pkoTrackReason()` | The **track lock** (Deluge / Dry Season). `pkoCanActUnderTrack` has two consumers that must never disagree — `canFire()` and the Leader pass. `pkoTrackOk` is folded into `pkoAnswers` so every Challenge path inherits it, and applied to **resolved** ids so a Mimic inherits its claim's track. `pkoTrackReason` names the rule rather than showing a dead button (BUG-04) |
| `pkoResolveGroup(cards)` | **The ONLY place a Mimic is interpreted.** → `{ok:false}` or `{ok, claim, resolved}`. One rule: a play containing a Mimic must also contain a real card of the claimed species, which makes the claim inferable (no claim UI) and mirrors the Poacher exactly — Poacher solo-**only**, Mimic **never** solo (D32). ⚠️ Callers need **both** arrays: raw for `pkoHoldsAll`/`pkoRemoveFromHoard`, `resolved` for `pkoMarks`. A Poacher claim is rejected **only when a Mimic is present** — an unconditional rejection outlaws the plain Poacher play (Spec Correction C1) |
| `pkoStampedeSpend(hoard, species, count)` | Which **raw** cards a Stampede spends: real copies first, then Mimics; `null` when the Hoard can't pay. At least one real copy required |
| `pkoFireCulling()` | Each player discards their fewest-held species; ties break by `PKO_PREY_RANK` then chain order. Returns `[]` — **structurally cannot empty a Hoard** (holding one species discards nothing) so it never scores (D27) |
| `pkoFireExtinction()` | Global census across **all** Hoards; wipes **every** tied-minimum species. The only event that can empty a Hoard — and it can empty several at once, which is why `pkoResolveClash` takes an array |
| `pkoFireMigration()` | Every Hoard moves one seat clockwise. Conserves every card, discards nothing, empties nobody |
| `pkoApplyInvasiveMimicry()` | The fixed opener. Fires in **`pkoStartClash`, not `pkoStartEncounter`** — it mutates the *deal*. Order: base deal is Mimic-free → 2n Mimics into the Reserve → everyone draws `round(pkoHoardSize / 4)` (10→13 / 12→15 / 15→19, D25). Must run **after** the accumulator resets (it sets `pkoEvent` and writes the Trail) and **before** `pkoHoardCounts` / `pkoSendPrivateHands()` |
| `pkoOpenCarrion()` / `pkoResolveCarrion()` / `pkoSubmitCarrion()` / `pkoShowCarrion()` | The Carrion window. It **resolves** the selection, never cancels it: on expiry whatever is selected is kept, so selecting nothing — including doing nothing — is exactly the shipped non-Carrion behaviour (D31). Host timer is the backstop; whichever lands first resolves and the second is dropped |

### Per-Game ACTION/SYNC/Private Packet Types
| Packet | Type | Channel | Notes |
|--------|------|---------|-------|
| `PKO_HOARD_READY`, `PKO_STAKE`, `PKO_CHALLENGE`, `PKO_STAMPEDE`, `PKO_RETREAT`, `PKO_PLAYER_LEFT` | ACTION | public | Client → host only. Host re-validates every one against its own board |
| `PKO_CARRION` | ACTION | public | Client → host: the Challenger's `keep[]` (indices into the spoils). Host resolves; a duplicate arriving after the timer already fired is dropped by the `pkoCarrionPending` race guard |
| `PKO_CLASH_BEGIN`, `PKO_ENCOUNTER_BEGIN`, `PKO_BOARD`, `PKO_UNCHALLENGED`, `PKO_CLASH_END`, `PKO_MATCH_END` | SYNC | public | `PKO_CLASH_BEGIN` must carry every accumulator at its reset value. **Force of Nature additions:** `PKO_CLASH_BEGIN` / `PKO_ENCOUNTER_BEGIN` carry `event`, `eventsFired` (at `[]` on reset) and `alphaIdx`; `PKO_BOARD` carries `alphaIdx`; `PKO_CLASH_END` / `PKO_MATCH_END` carry `winnerIdxs[]` (was a single `winnerIdx`) |
| `PKO_CARRION_OPEN` | SYNC | public | Host → all: opens the Carrion overlay on the **Challenger's** device and a waiting line elsewhere. Required because the Challenger may be a client and the host is the only device that knows the window opened — without it the overlay appears only when the host happens to be the Challenger, which is BUG-02's shape (spec gap **C5**). No client-side timer: the host owns the clock and closes the window with `PKO_BOARD` |
| `PKO_READY_STATE` | SYNC | public | Not in the spec's original list — added during implementation. Broadcasts the `pkoHoardReady` matrix after each confirmation so every device's "Waiting on …" line is live, rather than only revealing progress when the Encounter finally begins |
| `PKO_HAND`, `PKO_DRAW` | SYNC | **private** (`mpSendPrivate`) | Dealt Hoard / Scavenge draw — one player only |
| `PKO_HAND_SYNC` | SYNC | **private** (`mpSendPrivate`) | The acting player's **whole** authoritative Hoard, sent from `pkoRemoveFromHoard()` whenever the actor is not this device. Fixes BUG-02: `PKO_BOARD` carries counts, never contents, so without this a client's fan froze at the deal. A full replacement (not a delta) so a dropped packet self-corrects. **Must not call `mpUnlockSync()`** — the paired `PKO_BOARD` owns the unlock |

### Verification tools (run from the repo root; both exit non-zero on failure)

| Tool | Covers |
|------|--------|
| `node tools/verify-pko-chain.js` | **Data layer** — 68 checks: the four chain invariants (under **both** Appetites), the six Ravenous edges, the Poacher wildcard, absence of a track check, Pool totals 110/146/183/219, Eagle `Math.ceil`, and the **Mimic** (shape + never in a standard Pool) |
| `node tools/verify-pko-loop.js` | **Turn loop** — 132 checks: Stake / Challenge / Stampede / Retreat, slot-order legality, the Poacher-as-Mark, the response-window reset, Encounter end + the late-ACTION guard, Clash end on all three play types, Match end, every host rejection path, **Small Fry** (all three modes + the unranked-only and cross-track edge cases), **joint-winner Clash resolution**, and a **card-conservation census** (`Σ hoards + marks + reserve + wateringHole` invariant across every applier) |
| `node tools/verify-pko-events.js` | **Force of Nature** — 143 checks: the registry's shape, the draw gate (an ineligible event is never selected), Extinction's once-per-Clash gate, the Great Reversal as an involution composing with Appetite, the track locks through `pkoAnswers`, the Leader pass, all three mutating events, the **Mimic** (raw-vs-resolved removal, Swarm/Stake/Stampede padding, Small Fry ignoring it), Invasive Mimicry's deal, **Alpha** (board growth, Swarm growing it by 2, Stampede clearing it) and **Carrion** (spoils, partial keep, race guard, never on a hand-emptying Challenge, never from a Stake or Stampede) |

**Known blind spot:** the loop **and events** tools both run in `'single'` mode, where `pkoMyHoard` is an *alias* of `pkoHoards[0]`, so per-device mirror bugs are invisible to them by construction — BUG-02 passed 75 green checks. They verify the **rules engine**, not per-device view sync; that still needs three devices. This is why the three `pkoSyncAllHands()` senders and the Mimic's raw-vs-resolved removal cannot be proven here — the protection is the *shape* of the call, not a test. See impl-notes TG-07.

All three evaluate the real `js/games/pko.js` in a Node `vm` sandbox — they re-implement no rules and so cannot drift from shipped code. **Re-run all three after any change to the appliers, the chain, the balance numbers or the event rules.** They work because the host appliers take an explicit `playerIdx` and skip every broadcast in `'single'` mode, letting one process play all N seats; preserve that property. Note the `vm` gotcha: `let` **and `const`** create lexical bindings, not properties on the context object, so state and consts (`PKO_EVENTS`) are reachable only through each tool's appended bridge — only `function` declarations land on the sandbox directly.

---

## Cookie Jar (CJAR)

**JS file:** `js/games/cjar.js` (1777 lines) **Data:** `data/cjar-data.json` — 15 cookie values (3 tier bands), 5 family archetypes (4 warn + 4 bust lines each), 5 treats, both treat schedules (Quick Snack 3 / Full Feast 5). **Content guide:** `docs/cjar-content-guide.md`.
**Brand colour:** `#D4A017` honey-gold (custom, hover `#B8860B`) — **dark ink** `#292524` (stone-800), never white (2.38:1 fails the 3:1 floor) | **Active pill:** `pill-active-cjar` | **Toggle ON:** `game-toggle-on-cjar` | **Range:** `cjar-range` | **CTA/label:** `cjar-cta` (carries its own `color:#292524`) / `cjar-label` (`#7A5C0A`)
**MDLM-only**, 3–8 players (`getMinPlayers` dropped 4→3, DD-08), host-authoritative, host-as-participant. Base mode is **Incan Gold 1:1** — reveal → resolve → choose about the *next, unseen* card (Delta 3: a card's effect resolves before the decision window, not after). **Sylly Mode = Dibber Dobber** — three actions (Take / Play Innocent / Dob), no bust, nobody leaves, choices commit **blind** and the card reveals at resolve (Delta 7) so both modes share one mental model.
**Lobby button:** `#btn-cjar` | **Spec:** `docs/new-game-tech-cookie-jar.md` | **Plan:** `docs/superpowers/plans/2026-08-02-cookie-jar.md`
**Verification:** four headless harnesses plus a simulator — `tools/verify-cjar-deck.js` (76, data layer), `tools/verify-cjar-loop.js` (102, base game + match), `tools/verify-cjar-dd.js` (47, Dibber Dobber), `tools/verify-cjar-loopback.js` (177, host↔client over a Firebase-shaped wire with a real-element DOM — see § Verification tools below), `tools/simulate-cjar-dd.js` (balance instrument, asserts nothing, always exits 0). Re-run all five after any change to the appliers, the deck, the ledger, the packets, or the reveal choreography.

### Screens
| Screen ID | Purpose |
|-----------|---------|
| `screen-cjar-menu` | Main hub — Raid the Jar!, How to Play, Settings, ← Back to the Box |
| `screen-cjar-raid-intro` | Raid-N intro interstitial — **5 s auto-advance** (`CJAR_INTERSTITIAL_MS`), takes the Global UI Protocol interstitial exception |
| `screen-cjar-table` | Main play — the THREE-COLUMN stage (up for grabs / the card you're betting on / the jar, DD-18/23/24 — action-stage rework, Aug 2026), all three column headings now sitting at the TOP of their column reading "up for grabs" / "Next from Jar" / "Left in Jar" (DD-26, stage-polish round), warning strip, tappable full-width history (each trail thumb opens `cjar-card-view-overlay`, DD-27), a 5-column standings header + rows (Rank/Player/Stashed/Status/At Risk, DD-28) sitting between the stage and the buttons, decision controls (Reach In Again / Sneak Out, or Reach In / Play Innocent / Dob, DD-21) fixed at the floor |
| `screen-cjar-busted` | BUSTED! interstitial — family + line, **5 s auto-advance**, same exemption. The bust card now runs the same 3200 ms flip beat as every other card **before** this screen appears (action-stage rework — previously the most dramatic card in the game was the one card you never saw flip) |
| `screen-cjar-raid-summary` | Per-Raid bank recap before the next Raid intro |
| `screen-cjar-gameover` | Match end — ranks, Top Cookie Thief, Red-Handed (never both on an all-square match, BUG-03) |

### Overlays
| Overlay ID | Pattern | z-index | Purpose |
|------------|---------|---------|---------|
| `cjar-settings-overlay` | Data (slide-up) | z-[80] | Snack Friendly / House Rules / Match Length / Decision Time (Blitz·Standard·No Rush, DD-10) / Open Book / ✨ Sylly Mode |
| `cjar-how-to-overlay` | Data (slide-up) | z-[90] | How to Play — **two tabs: The Rules (default) \| The Cards**. The Cards body (`cjar-cards-body`) is the card gallery (DD-09/DD-14), built from `CJAR_DATA` on every switch into the tab, every tile through `cjarRenderCard`. First gallery in the suite; makes the offline install check single-device on an MDLM-only game. 14 tiles = the 14 shipped art files (harness-asserted). Each tab body is its own scroll region with its own close button |
| `cjar-trail-overlay` | Data (slide-up) | z-[90] | The Crumb Trail — this Raid's flip-by-flip log (never "Cookie Trail" — PKO owns *The Trail*) |
| `cjar-tip-overlay` | Decision modal | z-[90] | Contextual `[?]` tip — e.g. the family-card mechanic (`btn-cjar-family-tip`) |
| `cjar-quit-overlay` | Decision modal | z-[80] | Mid-game exit confirm |
| `cjar-new-raid-overlay` | Decision modal | z-[90] | "New Raid?" / play-again confirmation |
| `cjar-card-view-overlay` | Decision modal | z-[90] | New, DD-27 (stage-polish round). Full-illustration popup opened by tapping a trail thumb in `#cjar-trail-strip`; renders `cjarRenderCard(card, {size:'hero'})` into `cjar-card-view-body` plus the card's name into `cjar-card-view-name`, closed by `btn-cjar-card-view-close`. Registered in `resetToLobby()`'s CJAR teardown array |

### Key buttons
| ID | Action |
|----|--------|
| `#btn-cjar-menu-play` | Menu Play CTA — dual context: post-lobby `cjarStartMatch()` (BUG-07 fix; cjar no longer bounces through the menu), pre-lobby `mpShowModeScreen('cjar')` |
| `#btn-cjar-howto-tab-rules` / `#btn-cjar-howto-tab-cards` | How to Play tab bar (`data-cjar-howto-tab`). **The offline install check's entry point** is How to Play → The Cards tab — round 2 removed the menu's own "See the Cards" button (a redundant fifth button on a screen the Universal Menu Standard fixes at four) |
| `#btn-cjar-trail-open` | The "what's come out ›" label under the history strip → Crumb Trail overlay. The strip itself carries **no** click handler — it is a scroll container |
| `#btn-cjar-openbook-toggle` | Settings — Open Book on/off |
| `#btn-cjar-sylly-toggle` | Settings — Dibber Dobber on/off |
| `#btn-cjar-next-raid` | Raid summary → next Raid intro (host-gated in MDLM) |
| `#btn-cjar-family-tip` | Inline `[?]` → `cjar-tip-overlay` |
| `#btn-cjar-go-exit` / `#btn-cjar-go-leave` / `#btn-cjar-go-new` | Gameover exits and play-again |

### Key State Variables
| Variable | Type | Default | Purpose |
|----------|------|---------|---------|
| `cjarSnackFriendly` | string | `'safe'` | `'off'` / `'safe'` / `'warmup'` — `cjarFloatCookies` guarantee for the deal |
| `cjarHouseRules` | string | `'burn'` | `'burn'` / `'on-guard'` / `'high-alert'` — family-copy mutation on a bust |
| `cjarMatchLength` | int | `5` | `3` (Quick Snack) / `5` (Full Feast) Raids |
| `cjarDecisionTime` | string | `'standard'` | `'blitz'` (10 s) / `'standard'` (20 s) / `'norush'` (no clock — DD-10). `cjarDecisionMs()` returns `null` for No Rush; never falls back to a number |
| `cjarOpenBook` | bool | `true` | Show every player's Cookie Stash live |
| `cjarSyllyMode` | bool | `false` | Dibber Dobber gate |
| `cjarStashes` / `cjarTreatsWon` / `cjarRaidHistory` | int[] / int[] / int[][] | `[]` | Match score, Treat tie-break count, per-Raid bank history |
| `cjarFamilyCopies` | object | `{}` | `{ mum:3, ... }` — mutated live by House Rules across the match |
| `cjarDeck` / `cjarSeen` / `cjarCrumbs` / `cjarActive` | array/object/int/bool[] | — | Live Raid deck (index 0 = next), per-family sighting this Raid, the Crumb pool, base-game-only active-seat flags |
| `cjarCounterTreat` / `cjarTrail` / `cjarHighAlertId` | object\|null / array / string\|null | `null` / `[]` / `null` | Unclaimed Treat on the counter; this Raid's Crumb Trail entries; the family High Alert escalated to 4 copies (Delta 6 excludes the busting family from this pick) |
| `cjarFavourite` / `cjarWatcher` / `cjarCrumbDebt` | string[] / string[] / int[] | `[]` | Dibber Dobber only — host-side full affinity arrays and capped debt ledger (`CJAR_DD_DEBT_CAP` = 6) |
| `cjarCard` / `cjarFlipSeq` / `cjarChoices` / `cjarReadyCheck` / `cjarEndTimestamp` | — | — | Current flip state; `cjarFlipSeq` is the idempotency tag that drops a stale `CJAR_CHOICE` (the PKO BUG-01 class); `cjarEndTimestamp` is the absolute ms every device counts down against |
| `cjarWindowMs` | int\|null | `null` | This flip's decision-window length, from the host — travels **per flip** on `CJAR_FLIP_START`; `null` (erased by Firebase, BUG-06) is itself the No Rush signal |
| `cjarTablePhase` | string | `'deciding'` | `'deciding'` / `'waiting'` / `'revealing'` / `'spectating'` — drives `cjarRenderControls`/`cjarRenderRevealRows`. The reveal choreography does **not** add a fifth phase value — it runs as `cjarFlipAnim` layered on top of `'revealing'` (see below), not a `'flipping'` phase as the design spec first proposed |
| `cjarFlipAnim` | bool | `false` | True while the reveal choreography owns the stage — gates the hero face-up (`cjarRenderStage`) and holds the action buttons invisible-but-present via `.cjar-controls-idle` (`cjarRenderControls`) rather than removing them, so the container never resizes mid-match (the SHP sheep-parade class of bug) |
| `cjarAnimHandle` / `cjarPayoutHandle` | int\|null | `null` | The choreography's own two timers — `cjarAnimHandle` is the whole-beat clock (`CJAR_FLIP_ANIM_MS`), `cjarPayoutHandle` fires the payout beat (1800 ms, up from 900 ms — DD-25, stage-polish round) inside it. Both cleared by `cjarCancelFlipAnim()` |
| `cjarMyFavourite` / `cjarMyWatcher` | string\|null | `null` | This device only — delivered via `mpSendPrivate` (`CJAR_AFFINITY`) |
| `cjarTimerHandle` / `cjarRevealHandle` / `cjarHostTimeoutHandle` / `cjarInterstitialHandle` | int\|null | `null` | The four decision/interstitial timer handles — all cleared in quit-confirm, `resetToLobby()`, and every early phase transition (Timer Lifecycle rule). `cjarAnimHandle`/`cjarPayoutHandle` above follow the same rule and are cleared alongside them |
| `CJAR_REVEAL_MS` | const | `1200` | Outcome dwell only (who sneaked out, the deltas) — dropped from 3000 ms; the 1800 ms this freed pays for most of `CJAR_FLIP_ANIM_MS` below (action-stage rework, Aug 2026) |
| `CJAR_FLIP_ANIM_MS` | const | `3200` | The BLOCKING portion of the reveal choreography: flip 600 ms / hold 1200 ms / payout 1400 ms (DD-25, stage-polish round — was 2100 total incl. settle). The settle beat (~1000 ms — old card to trail, new card rises) is deliberately NOT in this constant: it is pure housekeeping motion with no information in it, so it plays as a CSS-only cosmetic tail that overlaps the decision window rather than blocking it. `cjarEndTimestamp` includes only the blocking `CJAR_FLIP_ANIM_MS`, so Blitz's 10 s decision window is still a true 10 s, not 10 s minus the animation |

### Key Functions
| Function | Purpose |
|----------|---------|
| `cjarWireArr(v, n, fill)` / `cjarWireList(v)` / `cjarWireObj(v)` | **The BUG-06 fix.** Every SYNC applier rebuilds its collection fields through these instead of assigning a raw payload — Firebase erases `null`/`{}`/`[]` in flight, so a reset value never arrives as sent. `cjarWireArr` takes the seat count and a fill and reads `v[i]`, repairing the erased-array, null-hole and came-back-as-object cases in one pass |
| `cjarAllIn()` | The readyCheck gate — branches per mode (BUG-05): base game reads `cjarActive.every((a,i) => !a || cjarReadyCheck[i])`; Sylly reads plain `cjarReadyCheck.every(Boolean)` because `cjarActive` is deliberately empty and `[].every()` is vacuously `true` |
| `cjarBuildDeck()` / `cjarFloatCookies(deck, n)` | Deck builder (15 family + 15 cookie + 1 Treat, or the 11-card Sylly cut) and the float — floats a cookie to the front without ever prepending. Base game: Snack Friendly (`n` = 0/1/2 by setting). Sylly (DD-17): unconditional `n = 1`, applied AFTER the branch's own final shuffle (earlier would be undone by it) — guarantees flip 1 is never Caught! without revealing anything before the blind choice (Delta 7 untouched) |
| `cjarSplit(total, headCount)` | The ONE place a remainder reaches Crumbs — every split in the game funnels through here |
| `cjarApplyCardEffect()` | **Base game only** (guarded before the pop, Delta 3) — resolves a revealed card's effect BEFORE the decision window opens; a bust skips the window entirely |
| `cjarOpenBlindWindow()` / `cjarRevealSyllyCard()` | Dibber Dobber's inverted order (Delta 7) — open the window blind (`cjarCard = null`), then reveal-and-log after choices are in |
| `cjarResolveFlip(choices)` / `cjarResolveFlipDD(lines)` | Base-game and Dibber Dobber resolvers — byte-identical ledger logic in DD across Delta 7; only *when* `cjarCard`/`cjarChoices` populate moved |
| `cjarResolveBust(familyId)` | House Rules burn/on-guard/high-alert; excludes the busting family from the escalation pool (Delta 6/DD-04) |
| `cjarDDGain(i, amt)` / `cjarDDPay(i, amt)` | The Dibber Dobber ledger primitives — `held = Σ cjarStashes + cjarCrumbs`; Crumb Debt is a side-ledger that redirects value, never holds any (DD-05) |
| `cjarAssignAffinities()` | Sylly — Favourite/Watcher never the same family member per seat |
| `cjarRanks()` / `cjarRedHanded()` / `cjarRankLabel(n)` | Standings — `cjarRedHanded()` returns `[]` on an all-square match (`max(ranks) === min(ranks)`, BUG-03) rather than reporting every seat |
| `cjarRenderCard(card, opts)` | **Asset-pack render seam** — all cjar card DOM goes through here. Resolves skin → core art → emoji via `assetFace('cjar', key)` / `assetBack('cjar')` |
| `cjarRenderStage()` | **Rebuilt for the action-stage rework (Aug 2026), headings repositioned in the stage-polish round (DD-26).** Still a CSS `grid-cols-3`, but the columns' jobs inverted. **Col 1 `#cjar-grabs-card`** ("Up for Grabs", DD-23, denser padding/gaps + enlarged Crumbs value/caption per DD-26a) — Crumbs promoted to the top count, the Treat slot below it (art, or `.cjar-placeholder-dashed` at the exact footprint), a static one-line caption. **Col 2 `#cjar-table-hero`** (DD-18) — the card you're **betting on**, face-down (`cjarRenderCard(null,{faceDown:true})`) except while `cjarFlipAnim` is true and `cjarCard` is set, when it renders face-up; its `#cjar-stage-label-now` heading now sits ABOVE the card (DD-26, was below) and swaps `'Next from Jar'` (was `'next out of the jar'`) / `'just revealed'` off the same `faceUp` flag. **Col 3 `#cjar-deck-badge`** (DD-24, demoted from "the bet") — an offset `.cjar-deck-stack` of three card backs plus the live count, not a single card; its heading now reads `'Left in Jar'` (was `'the jar'`) and sits ABOVE the badge, which vertically centres in the column (`justify-center`, was `justify-between` pinning it to the top with dead space below — DD-26) |
| `cjarRenderControls()` | Builds Reach In Again / Sneak Out (base) or Reach In / Play Innocent / Dob (Sylly, DD-21) into `#cjar-controls`. During the choreography (`cjarFlipAnim`) the buttons are built but held invisible via `.cjar-controls-idle` on the container rather than omitted — an empty-then-full container would resize the Stack mid-animation |
| `cjarBeginFlipAnim(startsClock)` / `cjarCancelFlipAnim()` | The reveal choreography's driver. `cjarBeginFlipAnim` sets `cjarFlipAnim = true`, arms `cjarPayoutHandle` (1800 ms, up from 900 ms — DD-25 — the type-dependent payout beat, incl. `cjarFlyTokens`) and `cjarAnimHandle` (`CJAR_FLIP_ANIM_MS`, now 3200 ms — the BLOCKING flip/hold/payout dwell only; the settle beat plays as an unawaited CSS-only tail after this handover), and starts the decision clock only when `startsClock` is true (false for a bust, which has no decision to time). `cjarCancelFlipAnim` clears both timers — called before every new animation starts and from `resetToLobby()`. **Progression is `setTimeout`-driven, never `animationend`** — the three `'single'`-mode harnesses stub `getElementById` to `null`, so no CSS animation ever starts in them; a DOM-gated loop would deadlock all three |
| `cjarFlyTokens(count, direction)` | The payout beat's token burst — `count` cookie tokens (`.cjar-token`) fly `'down'` (toward the score table) or `'left'` (toward the Crumb pile). No per-player flight paths (DD-20 — rejected as fragile under scroll and invisible to every harness); direction carries the destination, count carries the split. DD-25 (stage-polish round) adds a 500 ms pre-move hold (`animationDelay = 500 + k*45`) before the burst starts moving, and roughly doubles the CSS flight duration (380ms → 760ms) |
| `cjarRenderTrailStrip()` | The full-width history strip. Renders `cards.slice(0,-1)` whenever a card is face-up so nothing is drawn twice (DD-11); when nothing has flipped yet it renders a single `.cjar-placeholder-dashed` thumb rather than dead space (DD-12). **Each thumb is individually tappable (DD-27, stage-polish round)** — `el.onclick = () => cjarOpenCardView(card)`, a plain property (not `addEventListener`) so it's directly callable from a headless harness. The container itself still carries no handler — a container-wide one fights the swipe-to-scroll gesture; a discrete per-card target doesn't, because the browser's own tap-vs-drag heuristic already resolves the conflict on an `overflow-x:auto` container |
| `cjarOpenCardView(card)` | New, DD-27 (stage-polish round). Renders `cjarRenderCard(card, {size:'hero'})` into `#cjar-card-view-body` and the card's display name into `#cjar-card-view-name`, then opens `#cjar-card-view-overlay`. Reuses `cjar-card-hero` (15rem×20.6rem) — the pre-DD-18 hero footprint, otherwise unused since column 2 shrank |
| `cjarRenderRevealRows()` | Persistent standings (DD-11) — renders every phase, not only `'revealing'`, so Open Book is visible while deciding. Sits directly above the action buttons. **Standings mode now renders a 5-column grid via `.cjar-reveal-grid` — Rank / Player / Stashed / Status / At Risk (DD-28, stage-polish round)** — matched by a sibling `#cjar-reveal-header` row (hidden during `'revealing'`, which uses a different outcome-line format). `.cjar-pill-stashed` (`cjarStashes[i]`, always shown), a `.cjar-status-in`/`.cjar-status-out` "Still In"/"Snuck Out" badge (replaces the old inline 🚪 emoji), and `.cjar-pill-risk` (`cjarRaidTotals[i]`) — Status and At Risk are **base game only**; Dibber Dobber's rows leave both grid cells empty (the track stays, the content doesn't, so column widths still match). The delta on a change flashes on the Stashed pill in place instead of replacing the row during `'revealing'` |
| `cjarRenderPrivateStrip()` | **Sylly-only now (DD-12).** Cookie Stash and This Raid were removed — `cjarRenderRevealRows` already shows both for the viewer's own seat at every Open Book setting (`cjarStashVisible()` is unconditionally true for `idx === mpMyPlayerIdx`). What remains is Favourite/Watcher/Owes; the strip hides itself (`display:none`) entirely in the base game |
| `cjarRenderWarningStrip()` | Two real states, not three (TG-06) — `cjarSeen[id]` is only 0 or 1; the amber "seen once, danger pending" rung exists for Sylly (which forces `danger` false) and is unreachable in the base game |
| `cjarStartTimer(endTimestamp, windowMs)` | Countdown bar — `transform: scaleX(n)` with an explicit `transform-origin: left` (see `css/styles.css`) |
| `cjarOpenCards()` | Renders the card gallery from `CJAR_DATA` (DD-09) |
| `cjarHandleEnvelope(env)` | Routes all CJAR ACTION/SYNC + private packets; called from `engine-multiplayer.js` |
| `cjarResetState()` | Full state teardown (called from `resetToLobby()` in `engine.js`) |

### Per-Game ACTION/SYNC/Private Packet Types
| Packet | Type | Channel | Notes |
|--------|------|---------|-------|
| `CJAR_CHOICE` | ACTION | public | Client → host: Take/Sneak or the three DD actions. Host re-validates `cjarFlipSeq`; a stale tag is dropped (the PKO BUG-01 class) |
| `CJAR_PLAYER_LEFT` | ACTION | public | Client → host mid-game quit — host calls `resetToLobby()`, dissolving the match for everyone (the PASS/GTH/DYB/BLD contract) |
| `CJAR_MATCH_START`, `CJAR_RAID_START`, `CJAR_FLIP_START`, `CJAR_FLIP_RESOLVE`, `CJAR_RAID_END`, `CJAR_MATCH_END` | SYNC | public | Every accumulator resets **in the payload** (`cjarChoices`, `cjarReadyCheck`, `cjarCrumbDebt`, `cjarSeen`, `cjarTrail`, `cjarHighAlertId`, `cjarCounterTreat`) — and every client applier rebuilds them via `cjarWireArr`/`cjarWireList`/`cjarWireObj` rather than assigning the raw field (BUG-06). `CJAR_FLIP_START` carries `windowMs` (per-flip, `null` = No Rush) and, in Sylly, omits `card` (the window is blind). `CJAR_FLIP_RESOLVE` carries `card` so a Sylly client's hero can flip from face-down to face-up at reveal |
| `CJAR_AFFINITY` | SYNC | **private** (`mpSendPrivate`) | Dibber Dobber — this seat's own Favourite/Wataffinity pair, never broadcast publicly |

### Verification tools
| Tool | Covers |
|------|--------|
| `node tools/verify-cjar-deck.js` | **Data layer** — 76 checks: constants, `data/cjar-data.json` schema, the Snack Friendly float, treat schedules at both match lengths, `cjarRenderCard`'s art-key seam, and the core-art manifest |
| `node tools/verify-cjar-loop.js` | **Base game + match** — 102 checks: `cjarSplit`, sneak/bust resolution, House Rules (incl. the Delta 6 escalation-pool exclusion), `cjarAllIn()` in both modes (incl. the vacuous-`[].every()` regression, BUG-05), deck exhaustion, a full 3-Raid match, tie-break/Red-Handed edge cases (BUG-03), `cjarFlipAnim`'s timer-driven `true`→`false` transition (never DOM-event-driven — `cjarTablePhase` is already `'deciding'` while it runs) and `cjarEndTimestamp` including `CJAR_FLIP_ANIM_MS` |
| `node tools/verify-cjar-dd.js` | **Dibber Dobber** — 47 checks: all three card types × every action combination, the scare-off, Treat priority (Take > Dob > Innocent), Crumb Debt, affinities, the Stashed-pill-alone render (no At Risk pill) |
| `node tools/verify-cjar-loopback.js` | **The standard fifth MP tool (ML-01/ML-03)** — 177 checks (147 at the Aug 7 action-stage rework, +30 from the 8 Aug 2026 stage-polish round — DD-25's timing comments, DD-26's `Next from Jar`/`Left in Jar` label swap, DD-27's trail-thumb popup, DD-28's header row + Still In/Snuck Out status, DD-30's fixed medal slot + raid-history highlight): a real `fbWrite`/`fbRead` pair reproducing Firebase's erasure (not live JS references) plus a DOM of **real mock elements** so render code actually executes — the only harness that would have caught BUG-06, and the only one with a real shuffle (the other three stub identity, TG-03), so the only one that can prove DD-17's flip-1 float landed. Both modes end to end, 4- and 3-player, all three Decision Times, host↔client state agreement after every resolve, the blind window, the private affinity channel, the How-to tab switch + 14 gallery tiles, the empty-trail placeholder, `CJAR_PLAYER_LEFT`, the face-down hero during `'deciding'`, the label swap, both score pills in both modes, the bust card getting its own flip beat before `screen-cjar-busted`, and the Up for Grabs card with/without a Treat. Takes `CJAR_SRC=` so a deliberately-broken copy can be driven through the same wire |
| `node tools/simulate-cjar-dd.js` | **Balance instrument** (spec §17 D-11 mitigation) — asserts nothing, always exits 0; prints win-rate spread, action lean, debt-at-cap %, Treats-claimed % at 5 and 8 players. Baseline: Innocent-leaning wins ~52–53% at both sizes (DD-06, flagged, not retuned) |

The other three harnesses run in `'single'` mode with `getElementById: () => null`, which is exactly what lets one process drive all N seats — and exactly what blinds them to the packet layer and every line of render code (TG-07, ML-03). `verify-cjar-loopback.js` closes both gaps; reach for it on anything MP- or render-shaped.

**New CSS classes (`css/styles.css`), stage-polish round:** `.cjar-reveal-grid` (the standings header/row shared 5-column template, `1.8rem 1fr 4.6rem 4.6rem 4.2rem`, DD-28), `.cjar-status-in` / `.cjar-status-out` (the Still In / Snuck Out status badge, DD-28), `.cjar-medal-slot` (the gameover podium's fixed-width `1.4rem` leading slot, medal or blank, DD-30).
