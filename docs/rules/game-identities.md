# Game Identities — Little Sylly Games

## Shared Rules (All Games)
- **Sylly Mode** is always the **last setting** in every game's settings overlay — the "advanced rules signature"
- `isSylly` is derived at runtime (`difficulty === 3`) — never stored in data
- Every game has its own menu screen before setup (lobby → menu → setup flow)

---

## Game 1: Like I'm Five (LI5)
**Theme:** Describe without saying the forbidden words. Pass the phone.
**Key file:** `js/games/li5.js`
**State flow:** LOBBY → DSTW MENU → SETUP → GATEKEEPER → ACTIVE_PLAY → GAMEOVER

### Terminology
- Forbidden word list: **"No-No List"** (field name: `nono_list` — deliberate, not `taboo_list`)
- The describing player: "Describer"
- Skipping a word incurs a cost (configurable)

| Screen / element | Display text |
|-----------------|-------------|
| Settings overlay title | "Learning Plan 📝" — *not* "The Toy Box" (that's the deck-picker setting + sub-panel) |
| Deck picker card + sub-panel | "The Toy Box" / "Edit Toy Box ▸" (`deck-panel`) |
| Intermission screen (`screen-gatekeeper`) | "Ready up, [team]" + rotating hype line |
| Turn review overlay title | "Report Card" (also the difficulty card name — dual use) |
| Action buttons | "Yay!" / "Nay!" / "Skip!" ("Double Yay! ✨" / "Double Nay! 🙊" on Sylly words) |
| Pause overlay | "Time Out" |
| Gameover heading | "Class Dismissed!" |
| Match history overlay | "🏆/📊 [Team]'s Journey" |
| Monitor screen (MP client) | "Tattletale Sheet" |

### Settings
(Reality-synced June 2026 audit — display names + internals from `index.html` / `li5.js`.)

| Setting (display) | Options | Default | Internal variable | Internal values |
|------------------|---------|---------|------------------|-----------------|
| The Toy Box (word decks) | ON (all 16 decks) / OFF + "Edit Toy Box ▸" picker | ON | `settingPlayAllDecks` + `settingCategories` | bool + `Set` of category strings |
| Report Card (difficulty) | Gold Star ⭐ / Honour Roll 📚 | Honour Roll | `settingDifficulty` | `'easy'` (d1 only) / `'standard'` (d1+d2) |
| Tick Tock Clock (timer) | 30s / 60s / 90s | 60s | `settingTimer` | int |
| Roundy Rounds | 3 / 5 / 10 | 5 | `settingRounds` | int |
| Oopsie Daisy (penalty) | −1 Point / −N Secs | −1 Point | `settingPenaltyMode` | `'points'` / `'time'` — time penalty auto-scales with timer (30s→−5, 60s→−10, 90s→−20; `settingTimePenalty`) |
| Skip | Free / Penalised | Free | `settingSkipFree` | bool (`true` = free) |
| Pinky Swear Mode | OFF / ON | OFF | `settingCorrections` | bool — tap Report Card rows to flip outcomes |
| ✨ Sylly Mode (Extra Credit) | OFF / ON + Extra Credit Level slider | OFF / 30% | `settingSylly` + `settingSyllyPct` | bool + int 30–100 step 10 — % chance per card of a difficulty-3 word (×2 points and penalties; always shows 10 No-No words) |

### Team Setup
- **Screen 1 heading:** "Name your Playgroups!"
- **Default team names:** Crayon Crew / Glue Stick Gang
- **Screen 2:** None — LI5 does not track individual player names
- **Setup emoji:** 👥

### Overlay Types
| Overlay | Pattern | Notes |
|---------|---------|-------|
| `settings-overlay` | Data (slide-up) z-[80] | "Learning Plan 📝" — legacy ID, no `li5-` prefix (LI5 predates the prefix convention); legacy centred-h3 title (not the standard title-block structure) |
| `deck-panel` | Data (slide-up) z-[60] | "Toy Box" category picker — ⚠️ z-[60] sits BELOW the z-[80] settings overlay that opens it (audit [BUG], June 2026) |
| `quit-overlay` | Decision modal z-[80] | "Done explaining already? 🧒" |
| `skip-turn-overlay` | Decision modal z-[80] | "All tuckered out?" — end-turn confirm |
| `review-overlay` | Data (slide-up) z-[90] | "Report Card" — per-turn word review (Pinky Swear flips happen here) |
| `history-overlay` | Data (slide-up) z-[90] | Match history per team, opened from gameover team cards |
| `li5-how-to-overlay` | Data (slide-up) z-[90] | How to Play |
| `li5-help-tip-overlay` | Decision modal z-[90] | Contextual `[?]` tip overlay |
| `li5-play-again-overlay` | Decision modal z-[90] | "New Playgroup?" play-again confirmation |
| `pause-overlay` | Inline div (not fixed) | Swapped with `active-content` inside `screen-active-play` |

**Status:** Stable since Phase 7. Settings table + terminology reality-synced in the June 2026 studio audit.

### Multiplayer (Phase 22)
- **Mode:** 2-Device Teams — Host device = active describer team; Client device = `screen-li5-monitor` (Tattletale Sheet)
- **Shared screens:** `screen-li5-mode`, `screen-li5-lobby-host`, `screen-li5-lobby-join` (parameterised)
- **Game-specific screen:** `screen-li5-monitor` — shows current word + No-No List; CATCH! button sends ACTION
- **Key ACTION packets:** `LI5_CATCH` (Client → Host: alert, no auto score change; optional `word` field when a specific No-No word is tapped — host highlights it). 10s client-side cooldown after each CATCH.
- **Key SYNC packets:** `LI5_ROUND_START` (word + nonoList per new card + `isClientTurn` — Phase 27: when `true` the client team is describing, so the monitor shows a large word card and hides the No-No List/CATCH)

---

## Game 2: Great Minds
**Theme:** Telepathy / frequency / signal. Two players find a connecting word for a random pair.
**Key file:** `js/games/great-minds.js`
**Brand colour (reality, June 2026 audit):** split — ALL primary CTAs and accents use `violet-500/600` (lobby card, menu Play, lock-in, gates, deck-panel Done, near-sync/override/new-frequency confirms); `purple-*` is used for pills (`pill-active-purple`), toggles (`game-toggle-on-purple`), settings button tint, modal borders (`border-purple-300`), and the how-to step labels + close button. Unify or document — see fix plan.
**State flow:** LOBBY → GM MENU → GM SETUP → GM INPUT → GM PASS GATE → GM REVEAL GATE → GM REVEAL → GM RESULT (loop until victory) → GM CONCEDE (Secret Mode only: Sever Link path from round 11)

### Terminology
| Screen / element | Display text |
|-----------------|-------------|
| Pass gate heading | "Finding Wavelength 📡" |
| Reveal gate heading | "Frequencies Locked... 📡" |
| Reveal gate button | "Matching Wavelength 🚀" |
| Input subtext | "Establishing Link... Transmit Clue." |
| Win subtext | "You both thought of…" |
| Victory state | **"NEURAL LINK!"** |
| Override modal title | "Quantum Entanglement?" |
| Near-sync modal title | "Frequency Overlap" |
| Static block message | "⚡ Static Interference! Letter [X] is banned this round." |
| Memory Guard block | "Temporal Paradox!" |
| Session Terminal — new game | "Memory Purge ⚛️" |
| Session Terminal — continue | "Resume Current Evaluation 📖" |
| Round log label | "Psychic Echoes 📖" |
| Boost guide | "Boost Signal Guide ⚡" |
| Settings overlay title | "Frequency Configuration 📡" |
| Quit overlay | "Cut the signal?" / "Yeah, disconnect." / "Stay on frequency." |
| No-match round button | "Recalibrate 🔄" |
| Concede end state | "No Link Could Be Established" |

### Settings
(Reality-synced June 2026 audit — display names + overlay order from `index.html`. Sylly Mode's toggle IS Static Interference; the Mental Fog / Neural Storm pills are its sub-option.)

| Setting (display) | Options | Default | Internal variable | Internal values |
|------------------|---------|---------|------------------|-----------------|
| Frequency Tuner (customise words) | OFF / ON + Word 1/2 Decks pickers (`gm-deck-panel`) | OFF | `gmCustomWords` + `gmPoolA`/`gmPoolB` | bool + `Set`s of GM categories |
| Adjust Frequency Range | Stable / Unstable / Chaotic | Stable | `gmFrequencyRange` | `'stable'` / `'unstable'` / `'chaotic'` |
| Memory Guard | OFF / ON | OFF | `gmMemoryGuard` | bool |
| Resonance Tolerance | High Fidelity / Resonant | High Fidelity | `gmResonanceTolerance` | `'strict'` / `'normal'` |
| Infinite Resync | OFF / ON | OFF | `gmInfiniteResync` | bool |
| Signal Boost | OFF / ON | OFF | `gmSignalBoost` | bool |
| ✨ Sylly Mode (Static Interference) | OFF / ON + intensity pills Mental Fog / Neural Storm | OFF / Mental Fog | `gmStaticInterference` + `gmSyllyIntensity` | bool + `'sub-atomic'` (consonant ban) / `'supernova'` (vowel ban) |

### Special Mechanics
- **Cheap Move Guard:** blocks inputs that contain or are contained by either pair word
- **Starting Pair Guard:** contains check against `gmStartingPair[]`; locked after R1, immutable entire game
- **Last Round Guard:** exact match check against `gmPrevRoundWords` Set (previous pair + both clues)
- **Social Override:** "Actually... that counts 🤝" → "Quantum Entanglement?" confirmation modal
- **Signal Boost (from R5, turn-based):** Transmitter formula: `(gmRound - 5) % 2 === 0 ? P1 : P2`. Transmitter sees boost overlay + `?` opens Neural Library. Receiver sees context banner. "Raw Signal 📡" skips boost.
- **Neural Library:** Decision modal (z-[100]) — static guide teaching metadata clues vs synonyms (Grammar / Physical / Conceptual categories)
- **Psychic Echoes:** Table log — columns: # | Pair | P1 | P2 — shown on victory + result screens
- **Session Terminal:** Decision modal on new-game request when a game is in progress
- **Name Persistence:** `gmPlayerNames[2]` survives between games

### Overlay Types
| Overlay | Pattern | z-index |
|---------|---------|---------|
| `gm-settings-overlay` | Data (slide-up) | z-[80] |
| `gm-how-to-overlay` | Data (slide-up) | z-[90] |
| `gm-deck-panel` | Data (slide-up) | z-[100] |
| `gm-quit-overlay` | Decision modal | z-[80] |
| `gm-help-tip-overlay` | Decision modal | z-[90] |
| `gm-boost-overlay` | Decision modal | z-[95] |
| `gm-near-sync-overlay` | Decision modal | z-[95] |
| `gm-override-overlay` | Decision modal | z-[95] |
| `gm-new-frequency-overlay` (Session Terminal) | Decision modal | z-[95] |
| `gm-concede-overlay` (Secret Mode: Sever Link) | Decision modal | z-[95] |
| `gm-vocab-overlay` (Secret Mode terminal — shared via `smOpenVocabOverlay()`) | Data (slide-up, terminal-styled) | z-[95] |
| `gm-neural-library-overlay` | Decision modal | z-[100] |

### Multiplayer (Phase 22 + Phase 24–25)
- **Mode:** Individual Devices — both players on their own device simultaneously (no pass-gate or reveal-gate in Lobby Mode)
- **Shared screens:** `screen-gm-mode`, `screen-gm-lobby-host`, `screen-gm-lobby-join` (parameterised)
- **Game-specific screens:** none
- **Key change:** `gmStartInputPhase()` sets `gmActivePlayer = mpMyPlayerIdx` in Lobby Mode — both devices show input simultaneously. Firebase round-trip replaces the pass-gate + reveal-gate.
- **Key ACTION packets:** `GM_SUBMIT` (Client word → Host)
- **Key SYNC packets:** `GM_ROUND_START` (pair + banned letter), `GM_RESULT` (both words + match outcome + round log + `isOverride: bool` + `overridePhrase: string`)
- **Client guards (Phase 24):** `btn-gm-override` is a no-op for clients (host-only overlay). `btn-gm-next-round` is a no-op for clients (wait for `GM_ROUND_START` from host).
- **Social Override (Phase 24):** Host broadcasts `GM_RESULT` with `isMatch: true`, `isOverride: true`, `overridePhrase`. Client `gmMpDisplayResult()` handles `isOverride` — shows `wordA / wordB` instead of single match word.
- **Near-sync in Lobby Mode:** the Near-Sync overlay does NOT fire — `gmMpResolveRound()` is meant to treat near-sync as a mismatch, but currently calls neither handler (round unlogged, pair unchanged — audit [BUG], June 2026).
- **Play-again (Phase 25):** Host confirm → `mpReturnToLobby()` (returns to same-code lobby). Client confirm → `resetToLobby()`.

---

## Game 3: Secret Signals (SS)
**Theme:** Encryption / intercept / broadcast. Two teams — one encrypts keywords, the other intercepts.
**Key file:** `js/games/secret-signals.js`
**State flow:** Setup → Players → Who Encrypts First? → Vault Gate (first team) → Vault (first team) → [first team's encoding turn] → Vault Gate (second team, first time only) → Vault (second team) → [Round loop: Encrypt → Broadcast → Intercept → Decode Gate → Decode → Resolution, alternating teams] → Endgame Splash → [Phase 2 if Sylly Mode: Tiebreak? → Intel Intro → Intel Guess (×4) → Intel Summary] → Final Game Over

### Terminology
- **Vault:** Each team's private set of 4 keywords
- **The Transmitter / Encoder / Broadcaster:** The player sending the encrypted broadcast (rotates per round via `ssGetBroadcaster`)
- **Broadcast:** The encrypted clue transmitted to interceptors
- **Intercept:** Team B attempting to decode Team A's broadcast. **Round 1 is a no-score warm-up** — a correct intercept in round 1 (`ssRound === 0`) does not award a token (no clue history yet → pure luck); tokens only count from round 2. Misfires still count in round 1. (`ssResolve`: `interceptCorrect && ssRound > 0`.)
- **Intel Phase / Intelligence Reveal:** Sylly Mode Phase 2 — final guessing round
- **Intelligence Archive:** Per-team clue-history table shown on broadcast/intercept/decode screens
- **Clue Dossier 📖:** Slide-up overlay showing the encrypting team's own transmission history; also the per-keyword clue chips on the Intel guess screen
- **Mission Journal:** Full round-by-round log on the gameover screens (incl. Intel Dossier section after Phase 2)
- **Diplomatic Resolution:** Intel override modal — button label "Accept It 🤝", shown only after the third failed attempt
- **Scramble Bonus:** +1.0 intel pts for finding all 4 keywords
- **Settings overlay title:** "Operations Briefing 🔐" / "Configure before your first broadcast."
- **Quit overlay:** 🏳️ "Abort the mission?" / "Your intel will be lost." / "Yeah, pull out" / "Stay in the field"
- **Play-again overlay:** 🕵️ "New Mission?" / confirm "Start New Mission 📡" (single) — dynamic MP labels

### Settings
(Reality-synced June 2026 audit — display names + internals from `index.html` / `secret-signals.js`. The SS settings overlay uses the modern Settings Card Standard — white cards + left-aligned title block. *[Corrected June 2026: an earlier note claimed legacy bare-div/`<hr>` format; the markup is actually modern cards.]*)

| Setting (display) | Options | Default | Internal variable | Internal values |
|------------------|---------|---------|------------------|-----------------|
| Designate Vault Contents (Customise Vault) | OFF / ON + 16-category pill grid | OFF | `ssCustomiseVault` + `ssSelectedCategories` | bool + array of category strings (OFF = curated 10-cat pool `SS_CURATED_CATS`) |
| Encryption Protocol (difficulty) | Clear / Scrambled / Deep Space | Clear | `ssDifficultyLevel` | `1` / `2` / `3` (single tier — not cumulative) |
| Interceptions Required | 2 / 3 | 2 | `ssSettingInterceptsToWin` | int |
| Vault Rotations | OFF / ON | OFF | `ssRerollLimitSetting` | `0` (off) / `Infinity` (on = unlimited rerolls). MP: serialised as string `'Infinity'` (JSON-safe). |
| Broadcaster Timer | OFF / ON + 1 / 2 / 3 min | OFF (60s on first enable) | `ssTimerSetting` | `0` (off) / `60` / `120` / `180` seconds |
| ✨ Sylly Mode (Intel Phase) | OFF / ON | OFF | `ssIntelSyllyMode` | bool |

### Key State Variables (ss prefix)
- `ssSettingInterceptsToWin`, `ssDifficultyLevel`, `ssSelectedCategories`, `ssRerollLimitSetting`, `ssTimerSetting`
- `ssCustomiseVault` — false = curated; true = full picker
- `ssPlayerCount`, `ssPlayerNamesA/B` — broadcaster rotation
- `ssVaultA/B` — 4 word objects each; `ssRerollCounts[team][kwIdx]`
- `ssTokens`, `ssMisfires`, `ssRound`, `ssRoundHistory`
- `ssIntelSyllyMode`, `ssIntelScoreA/B`, `ssIntelFound`, `ssIntelHistory`
- `ssTimerInterval`, `ssAlarmInterval`, `ssTimerSecondsLeft`

### Fuzzy Matching (`ssFuzzyMatch`)
- Plural/singular aware + compound word aware (hyphen/space split, ≥3 char components)
- Solid compounds (no separator) do NOT auto-split — store as "Weight-Lifting" to enable matching

### Overlay Types
| Overlay | Pattern | z-index |
|---------|---------|---------|
| `ss-settings-overlay` | Data (slide-up) | z-[80] |
| `ss-how-to-overlay` | Data (slide-up) | z-[90] |
| `ss-dossier-overlay` | Data (slide-up) | z-[90] |
| `ss-quit-overlay` | Decision modal | z-[80] |
| `ss-override-overlay` | Decision modal | z-[90] |
| `ss-play-again-overlay` | Decision modal | z-[90] |
| `ss-help-tip-overlay` | Decision modal | z-[90] |
| `ss-inning-transition` | Custom full-screen splash (stone-900) | z-[95] |
| `ss-endgame-splash` | Custom full-screen splash (stone-900) — mission result + Phase 2 bridge | z-[95] |

Both splash elements are legacy custom patterns (neither data slide-up nor decision modal); both are hidden in `resetSyllySignals()`.

### Team Setup
- **Screen 1 heading:** "Establish Cover Identities"
- **Default team names:** Alpha Echo / Bravo Zulu
- **Screen 2 heading:** "Meet the Operatives"
- **Screen 2 subtitle:** "Names optional — helps with broadcaster rotation."
- **Player placeholder:** "Operative 1", "Operative 2", etc.
- **Setup emoji:** 👥

### Multiplayer (Phase 22)
- **Mode:** Hybrid — supports Individual Devices or 2-Device Teams (`supportedModes: ['ptp', 'tlm', 'mdlm']`, `recommendedMode: 'tlm'`; there is no `supportsHybrid` field — hybrid behaviour comes from supporting both TLM and MDLM)
- **Shared screens:** `screen-ss-mode`, `screen-ss-lobby-host`, `screen-ss-lobby-join` (parameterised)
- **Game-specific screens:** `screen-ss-standby` — passive board view (own-team vault keywords + clue archive via `ssRenderArchive`) shown to any device that is not the active broadcaster/guesser; heading/subtext set by `ssShowStandby(heading, subtext)`
- **Device→team routing (S11 RESOLVED, June 2026):** TLM and MDLM run ONE device-routed code path. `ssTeamDevices[team] = [playerIdx,…]` is built from `mpLobbyRoster.playerTeamIdx` (TLM falls back to `[[0],[1]]`). Per-device readyChecks (`ssMpVaultReady` length = `ssTotalDevices()`). Broadcaster of record = `ssBroadcasterIdx(team) = devices[ssRound % n]`; guesser of record = `ssGuesserIdx(team) = devices[(ssRound+1) % n]` (the next transmitter decodes — a team of 1 collapses to broadcaster === guesser, which is correct TLM behaviour). `ssMyTeam()` maps the device to its team. Non-active devices route to `screen-ss-standby`.
- **Security — couch model:** Both vaults are broadcast in `SYNC: SS_VAULT_DATA` (`vaultA` + `vaultB`); each device renders only its own team via `ssMyTeam()`. Same UX-based couch security as NAT (role data broadcast, each device shows only its own). Sufficient for a same-room game; full separation would need targeted per-device writes.
- **Intel Phase — host-authoritative (S12 RESOLVED, June 2026):** Sylly Mode Phase 2 is fully MP-aware. One snapshot packet `SS_INTEL_SYNC` carries the whole intel state and routes every device per phase (`tiebreak`/`intro`/`keyword`/`summary`/`gameover`). The phase is sequential — one team guesses one keyword at a time; within it only the **lowest-seat nominated device** (`ssTeamDevices[team][0]`) gets the input UI, everyone else sees the clue dossier (the board) and a "discuss!" note. The active guesser resolves locally (found / 3-fail / Diplomatic Resolution override) and commits one outcome on Continue/Next (`SS_INTEL_GUESS` ACTION from a client; host applies + advances + broadcasts the next snapshot). Phase transitions (Phase-2 splash, intro Begin, summary Next, tiebreak picker) are host-driven; clients show "⏳ Waiting for the host…". Clue histories ride in every `SS_INTEL_SYNC` (clients never run `ssArchiveClues` — it's host-only in `ssResolve`).
- **Key ACTION packets:** `SS_VAULT_READY`, `SS_ENCODE_TRANSMIT`, `SS_INTERCEPT_SUBMIT`, `SS_DECODE_SUBMIT`, `SS_INTEL_GUESS` (active intel guesser's committed keyword outcome → Host)
- **Key SYNC packets:** `SS_VAULT_DATA` (both vaults), `SS_ENCRYPT_TURN`, `SS_BROADCAST`, `SS_RESOLUTION`, `SS_ENDGAME`, `SS_INTEL_SYNC` (full intel state snapshot + phase router). *(`SS_START_INTERCEPT` and `SS_DECODE_GATE` were removed in the S9/S11 rework — the guess phase now routes via `SS_BROADCAST` → `ssRouteGuessPhase()`.)*

---

## Game 4: Just Enough Cooks (JEC)
**Theme:** Collaborative ingredient guessing — find the Sweet Spot by sharing a word with just enough other players, not too few and not too many.
**Key file:** `js/games/jec.js`
**State flow:** LOBBY → JEC MENU → ROSTER → [Round loop: ORDER → PREP (×N players) → SIFTING → TALLY] → WASHUP

### Terminology
| Term | Meaning |
|------|---------|
| Today's Order | The food word revealed at the start of each round |
| Today's Recipe | Sub-header label above the ingredient list on the sifting screen |
| The Sifting | Screen where ingredient frequency is revealed and Sous Chef merges applied |
| Chef's Kiss ✨ | Golden badge for exactly 2 Chefs — the Sweet Spot jackpot |
| Nice Match! 👌 | Golden badge for 3 to N−1 Chefs — half score |
| Too Many Cooks! 🍲 | Spoilt status — ALL N Chefs submitted the word (token reward, or Crowded Kitchen Tax if penalty on) |
| A Bit Pongy! 🤢 | Rotten status — unique ingredient nobody else submitted |
| Kitchen Nightmare! 🧪 | Poisoned status (KN mode only) — overrides all other status |
| Signature Dish | Ingredient 1 in KN mode — scores double if Golden |
| Poison Word | Word entered in KN mode to sabotage matching ingredients |
| Health Inspector's Report | Section on sifting screen listing all active poison words as chips |
| Sous Chef Oversight | Setting enabling manual word merges before scoring |
| Crowded Kitchen Tax | Spoilt penalty formula: −(count × 2) pts |
| The Tally | Per-round score reveal screen |
| Final Wash-up | End-of-game leaderboard screen |
| Chef's Cook Book 📖 | Per-round score log shown on the washup screen |
| New Shift | "Play again" — resets round state, preserves names + settings |
| The Pantry Cabinet 🍳 | Settings overlay label |

### Settings
(Reality-synced June 2026 audit — Phase 29 scoring redesign defaults. Player count is NOT in the settings overlay — it lives on the roster screen as "Number of Chefs" pills, 3/4/5/6, default 4, `jecPlayerCount`.)

| Setting (display) | Options | Default | Internal value |
|------------------|---------|---------|----------------|
| Dishes (rounds) | 3 / 5 / 10 | 3 | `jecRounds` int |
| Menu Complexity | Home Cook / Sous Chef / Head Chef | Sous Chef | `jecFoodDifficulty` `'easy'` / `'mixed'` / `'hard'` |
| The Sweet Spot | 10 / 20 / 30 pts | 30 pts | `jecGoldenScore` int |
| Rotten Penalty | Off / On | Off — when On, unique ingredients cost −5 pts | `jecRottenPenalty` bool |
| Spoilt Penalty | Off / On | Off — when On, Crowded Kitchen Tax: −(count × 2) pts | `jecSpoiltPenalty` bool |
| Sous Chef Oversight | Off / On | On | `jecSousChefOversight` bool |
| Specials Board | Off / On | Off | `jecSpecialsBoard` bool |
| ✨ Sylly Mode (Kitchen Nightmares) | Off / On | Off | `jecKitchenNightmares` bool |

### Special Mechanics

**Scoring (tiered positive — Phase 29 redesign; `jecCalcPoints(count, N)`):**
- count = 1 → Rotten: 0 pts (or −5 if Rotten Penalty on)
- count = 2 → Chef's Kiss: full `jecGoldenScore` jackpot
- count 3 to N−1 → Nice Match: `Math.round(jecGoldenScore * 0.5)`
- count = N → Too Many Cooks: `Math.round(jecGoldenScore * 0.15)` token reward (or −(count × 2) if Spoilt Penalty on)
- Opt-in penalties REPLACE the tier reward for that count (never stack)
- Poisoned: 0 pts (KN mode — overrides all, including penalties)
- Signature Dish: tier points × 2 (KN mode — always ingredient slot 0; only when not Poisoned)
- The pre-Phase-29 inverse-proportional formula (`goldenMax = floor(N*0.7)` etc.) is retired — see `jec-implementation-notes.md` Design Decisions

**Sous Chef Oversight:**
- Tap any two `.jec-sift-card` or `.jec-poison-chip` elements to trigger merge modal
- `jecApplyMerge(normA, normB)` auto-swaps so the ingredient (word in freq map) always wins; poison propagates to merged result
- Selection highlight: amber ring on sift cards, purple ring on poison chips
- Ghost merge guard: if neither norm is in freq map, returns early — no effect

**Kitchen Nightmares (Sylly Mode):**
- Ingredient 1 = Signature Dish (amber border on prep screen); double points if Golden
- Poison Word submitted in prep; normalised form added to `jecPoisonedNorms` Set before sifting
- Health Inspector chips: tappable for Sous Chef when oversight is on; chips have `data-norm` + `.jec-poison-chip` class
- Validation: blocks duplicate ingredients, blocks self-poison (poison word matching own ingredient)

**Naming collision note:** JEC uses `jecApplyExpansionOverrides()` — the generic name `applyExpansionOverrides()` is already defined globally by dstw.js and would be overwritten if reused.

### Overlay Types
| Overlay | Pattern |
|---------|---------|
| `jec-settings-overlay` | Data (slide-up) — "The Pantry Cabinet 🍳" |
| `jec-how-to-overlay` | Data (slide-up) |
| `jec-quit-overlay` | Decision modal — z-[80] |
| `jec-oversight-overlay` | Decision modal — merge confirm, z-[90] |
| `jec-new-shift-overlay` | Decision modal — "New Shift?", z-[80] (audit note: play-again confirms should be z-[90] per `logic-engine.md`) |
| `jec-help-tip-overlay` | Decision modal — contextual `[?]` tips, z-[90] |

### Multiplayer (Phase 22)
- **Mode:** Individual Devices — all chefs on their own device
- **Shared screens:** `screen-jec-mode`, `screen-jec-lobby-host`, `screen-jec-lobby-join` (parameterised)
- **Game-specific screens:** none
- **Key mechanic:** `jecMpReadyCheck[]` tracks prep submissions. Host runs sifting + Sous Chef oversight; all merges broadcast so all devices stay in sync. Host's own prep submission is processed directly (not via envelope) — self-sent envelopes are dropped by the dedup guard (Bug J1).
- **Client-gating (J3 + J4 RESOLVED, June 2026):** all three divergence paths are now host-gated. Sous Chef merge taps are suppressed on clients via `jecCanOversee()` + a client early-return in `jecHandleOversightTap()` (J3). The sifting "Taste Test" and tally "Next Course" CTAs early-return for clients and render a disabled "Waiting for the Head Chef…" state via `jecSetAdvanceCta()` (J4). The redundant `JEC_NEXT_ROUND` broadcast was dropped — the Host's `jecStartRound()` broadcasts `JEC_ORDER` which fully drives clients into the next round; its SYNC handler is now a defensive no-op (J4).
- **Key ACTION packets:** `JEC_PREP_SUBMIT` (each chef's ingredient + KN fields)
- **Key SYNC packets:** `JEC_ORDER`, `JEC_SIFTING`, `JEC_MERGE`, `JEC_TALLY`, `JEC_WASHUP` (`JEC_NEXT_ROUND` is deprecated — never broadcast; its handler is a defensive no-op)

---

## Game 5: You Get It? (YGI)
**Theme:** Social verification game — each player submits a number + metric for a shared situation. The group gives The Nod to whoever they relate to most.
**Tagline:** "Finally, someone said it."
**Key file:** `js/games/ygi.js`
**Data file:** `data/ygi-data.json`
**State flow:** LOBBY → YGI MENU → YGI SETUP → [Round loop: YGI PASS → YGI INPUT (×N players) → YGI REVEAL → YGI VOTE (×N) or THE CONSENSUS → YGI RESULTS] → YGI GAMEOVER

### Terminology
| Term | Meaning |
|------|---------|
| The Situation | The prompt/fill-in-the-blank statement read by the group |
| The Gap | Fill-in-the-blank placeholder shown as `________` on screen (stored as `[ ]` in data) |
| The Take | A player's combined Number + Metric response |
| The Lineup 🃏 | The reveal screen showing all Takes side-by-side |
| The Nod | The act of voting — giving a nod to the Take you relate to most |
| Your Call | Verdict Style — each player gives The Nod individually, pass-the-phone |
| The Consensus 🏟️ | Verdict Style — group gives The Nod together as one shared vote |
| The Verdict 🏆 | The vote ranking screen |
| The Record 📋 | Round-by-round history carousel on the gameover screen |
| The Ringer 🃏 | Sylly Mode ghost card — a pre-written Take injected anonymously into The Lineup |
| Lock In My Verdict | Vote submit button label (Your Call) |
| Lock In The Consensus | Vote submit button label (The Consensus) |

### Settings
| Setting | Options | Default | Internal value |
|---------|---------|---------|----------------|
| Players | 3–8 | 4 | `ygiPlayerCount` |
| Situations | 3 / 5 / 8 | 5 | `ygiRounds` |
| The Decider | Split Take / Solo Take | Split Take | `'close-enough'` / `'only-one'` |
| Full Tally | Off / On | Off — top 3 ranked only | `ygiFullTally` bool |
| Verdict Style | Your Call / The Consensus | The Consensus | `'secret-ballot'` / `'open-ballpark'` (default `'open-ballpark'` = The Consensus; MDLM forces `'secret-ballot'`) |
| ✨ Sylly Mode (The Ringer) | Off / On | Off | `ygiRinger` bool |

### Special Mechanics

**Variable brackets:**
- Situations using `[ ]` as placeholder render as `________` at display time.
- Pattern: `.replace('[ ]', '________')` applied at every display point — never in stored state.
- Display points: `ygiShowInput()`, `ygiShowReveal()`, `ygiShowVoteInput()`, `ygiShowOpenBallparkVote()`, `ygiShowResults()`, `ygiRenderRoundLog()`.

**Vertical centering (The Lineup):**
- `flex-1 overflow-y-auto flex flex-col` on outer wrapper + `my-auto` on inner content div.
- Centers when content fits the viewport; collapses to natural scroll when overflowing.
- `min-h-full justify-center` does NOT work inside overflow containers — always use `my-auto`.

**Scoring:**
- Rankings submitted per-voter (Your Call) or as one shared ranking (The Consensus).
- Each voter's ranking awards `VOTE_PTS = [3, 2, 1]` to the entries they place 1st / 2nd / 3rd (ranks beyond 3rd score nothing even in Full Tally).
- Round winner (highest vote pts among humans, must be > 0) gets a **+2 "Local Legend ✨"** bonus on top.
- **The Ringer (Sylly Mode):** if the ghost card receives more 1st-place votes than the best human, the Ringer "wins" and **every player loses 2 points** (`ygiScores[i] -= 2`). The Ringer never scores itself.
- Running totals shown on `#screen-ygi-results` with 🥇🥈🥉 medals for positions 1–3.

**Sudden Death (Solo Take tie-break):**
- Triggered only when `ygiDecider === 'only-one'` (Solo Take) and the final standings tie for first.
- Screens: `screen-ygi-sd-intro` → `screen-ygi-sd-input` (pass-the-phone per tied finalist) — drawn from `YGI_SUDDEN_DEATH_QS`.
- Highest number wins. **Host-driven in MDLM (RESOLVED June 2026, Group B; was Y4 [BUG]):** the host broadcasts the chosen question + finalists (`YGI_SUDDEN_DEATH`); each finalist submits on their own device (`YGI_SD_SUBMIT`, no pass-the-phone gate); the host resolves and broadcasts final standings (`YGI_GAMEOVER`). Non-finalists see "Sudden death in progress…"; answered finalists see a waiting standby. Single-device keeps the pass-the-phone flow.

**The Consensus voting:**
- Single ranking screen labelled "The Consensus 🏟️".
- On submit: `ygiVotes` filled with identical rankings for all N players → `ygiComputeAndShowResults()` runs unchanged.

**The Record (gameover carousel):**
- `ygiRoundLog[]` accumulates `{ round, prompt, entries[] }` objects after each round completes (in `ygiShowResults()`).
- `ygiRoundLogIdx` tracks displayed card; prev/next buttons navigate.
- `ygiRenderRoundLog()` renders current card into `#ygi-log-card`.

**Data format (`data/ygi-data.json`):**
```json
{
  "id": "ce-001",
  "text": "My browser is a cry for help once it contains more than [ ].",
  "ringers": [
    { "number": 404, "metric": "pages not found" },
    { "number": 88,  "metric": "gigabytes of RAM currently in use" }
  ]
}
```
- `id` format: existing entries use `ce-NNN` (legacy, do not rename); new entries use `ygi-NNN` starting at `ygi-001`
- `text` always contains `[ ]` as The Gap — rendered as `________` at display time.
- `ringers[]` — 5 pre-written `{ number, metric }` pairs. Sylly Mode (The Ringer) picks one randomly and injects it as a ghost card in The Lineup. Ignored when Sylly Mode is off.
- `metric` is player-entered at runtime (the "Fill the gap…" input) — NOT a top-level data field.

### Overlay Types
| Overlay | Pattern |
|---------|---------|
| `ygi-settings-overlay` | Data (slide-up) |
| `ygi-how-to-overlay` | Data (slide-up) |
| `ygi-quit-overlay` | Decision modal |
| `ygi-run-it-back-overlay` | Decision modal — "Run It Back?" confirm |

### Multiplayer (Phase 22)
- **Mode:** Individual Devices — each player on their own device
- **Shared screens:** `screen-ygi-mode`, `screen-ygi-lobby-host`, `screen-ygi-lobby-join` (parameterised)
- **Game-specific screens:** none
- **Mandatory override:** `ygiVerdictStyle` forced to `'secret-ballot'` in Lobby Mode (The Consensus requires a shared device — not viable with individual devices)
- **Key ACTION packets:** `YGI_TAKE_SUBMIT` (player's number + metric), `YGI_VOTE_SUBMIT` (player's vote ranking), `YGI_SD_SUBMIT` (a finalist's sudden-death number)
- **Key SYNC packets:** `YGI_ROUND_START` (prompt + round number), `YGI_LINEUP` (all takes + optional ringer), `YGI_VERDICT` (scores + standings), `YGI_SUDDEN_DEATH` (tie-break question + finalists), `YGI_GAMEOVER` (final standings; host-authoritative — also gates the results→gameover transition so clients no longer advance locally, resolving Y5)

---

## Game 6: Late to the Party (LTTP)
**Theme:** Social deduction — the Inner Circle knows a secret address; Friend of a Friend doesn't. Players message each other over 4 plans, narrowing locations and identities.
**Key file:** `js/games/lttp.js`
**State flow:** LOBBY → LTTP MENU → LTTP SETUP → BRIEFING → [Plan loop: CHAT → MESSAGE MODAL → SELECT PLAYER → MAP (auto-opens) → repeat until lap complete → PLAN UPDATE] → GUESS phase (Plan 4) → GAMEOVER

### Terminology
| Term | Meaning |
|------|---------|
| Friend of a Friend | The outsider (internal: `lttpStrayIdx`) — doesn't know the address; trying to blend in and figure it out |
| The Gang | Everyone who knows the address (all players except Friend of a Friend) |
| The Troublemaker | Gang member (internal: `lttpJokerIdx`) who plants a fake location to mislead (optional role, The Troublemaker mode ON) |
| Plan | One full lap of messaging (each player messages someone once); 4 plans per game |
| Locations | The grid of possible addresses shown on the map |
| Lap | One full round of turns (all players message once) |
| Contacts | The suspicion overlay — roster of other players with per-player folders |
| Folder | Per-player notes + status chip inside the Contacts overlay |
| Friendship Points | Score currency — Friend of a Friend +10 for correct pin, Troublemaker +20 for prank, The Gang +5 each for winning |

### Role-Specific Map Behaviour
- **Friend of a Friend:** Sees all locations; can annotate cells as Maybe (green) or Nope (red). (Map sub-text: "Tap cells to mark Maybe or Nope.")
- **The Gang:** Sees red highlights narrowing to the real address each plan (6→3→1)
- **The Troublemaker:** Sees gold cell (real address) + purple cell (decoy they're planting)

### Contacts System
The 🕵️ button opens the Contacts overlay — a dual-view panel (roster → folder) for tracking suspicions and notes on each other player.

**Status cycles (keyed to the ACTIVE player's role):**
- The Gang: None → ✅ Maybe → ❓ Sus → 🃏 Troublemaker → None
- The Troublemaker: None → ✅ Maybe → ❓ Sus → None
- Friend of a Friend (The Troublemaker mode ON): None → 🃏 Troublemaker → None
- Friend of a Friend (The Troublemaker mode OFF): status section hidden

**Status is reflected in the chat player list** — a colour chip appears next to each player's name so the active player can see their assessments at a glance without reopening Contacts.

### Rotating Folder Hints
Each role has a strategic frame for their observations, surfaced via rotating placeholder text in the notes textarea. The hint index increments globally each time any folder is opened (6 phrases per role, cycles via modulo):

| Role | Strategy Frame | Focus |
|------|---------------|-------|
| Friend of a Friend | Evidence Gathering | Map-to-message cross-referencing |
| The Troublemaker | Deception Tracking | Cover story self-consistency |
| The Gang | Identity Scrubbing | Sniffing out the Outsider |

**Friend of a Friend hints:** "What did they say? Does it match the map?" / "Any slips? Which locations kept coming up?" / "Who's been too specific? Too vague?" / "Did their answers change between conversations?" / "Who avoided certain locations entirely?" / "What did they claim to know — and how would they know it?"

**Troublemaker hints:** "What lie did you tell them? Keep it consistent." / "Did Friend of a Friend take the bait? Track what they believe." / "Stick to your story. What's your cover here?" / "What false trail have you been laying?" / "Did anyone seem suspicious of you? Adjust the story." / "Which details of your cover have you already committed to?"

**The Gang hints:** "Do they seem like they know the address?" / "Were they too specific or too vague?" / "Could they be the one who's late?" / "Did they seem nervous about certain locations?" / "Were they fishing for information rather than sharing it?" / "What have they said so far — does it add up?"

### Message Flow

Tapping a player name in the Contacts roster triggers one of two flows based on the **Small Talk Helper** setting:

**Small Talk Helper OFF (default):** Opens `lttp-confirm-overlay` directly with a free-text message input.

**Small Talk Helper ON:** Opens `lttp-smalltalk-overlay` (6 topic tabs; 5 have 4 prompt pills each, plus an "Other" free-form tab). Player selects a prompt → "Use this →" button enabled → tapping it closes the smalltalk overlay and opens `lttp-confirm-overlay` pre-filled with the selected prompt. "Other" tab opens confirm modal with empty input (typed reminder text is not transferred). Player can edit before sending.

**`lttp-confirm-overlay` (always the final step):**
- Header: "Message to [Player Name]"
- Textarea, placeholder: "Type your message...", maxlength 80
- Live character counter: "0 / 80" — turns `text-red-500` at ≤10 characters remaining
- Send button: disabled until input non-empty (pre-fill from guided mode counts)
- Cancel: closes overlay, no action

On Send: `lttpSelectPlayer(targetIdx, inputValue.trim())`

**History schema:** `{ asker, asked, plan, messageText: "string" }` — always the final typed message regardless of mode.

**Handover screen (chat mode):** Shows message in quotes + "Read this message aloud, then hand over the phone." instruction. Message block hidden during role-reveal handovers.

**`LTTP_SMALL_TALK` constant:** 5 categories — "📍 Getting There", "🕐 Timing", "👥 The Crowd", "🎉 The Vibe", "💬 Casual" — each with 4 prompt strings. Drives tab + pill UI in `lttp-smalltalk-overlay`.

*Note: `lttpPendingTag` is no longer present. The history schema uses `messageText` only.*

### Settings
| Setting | Options | Default | Internal value |
|---------|---------|---------|----------------|
| Party Destination (difficulty) | The Local Hang / The Secret Spot | The Local Hang | `lttpDifficulty` `'local'` / `'secret'` |
| Group Vote | OFF / ON | ON | `lttpGroupVote` bool |
| Small Talk Helper | OFF / ON | OFF | `lttpSmallTalk` bool |
| ✨ Sylly Mode (The Troublemaker) | OFF / ON | OFF | `lttpJokerMode` bool |

Player count (3–6, default 4, `lttpPlayerCount`) is set on the setup screen — not in the settings overlay.

### Screens
| Screen ID | Purpose |
|-----------|---------|
| `screen-lttp-briefing` | Plan start/transition — session summary (Tonight's Plans / Plans Updated), first active player named |

### Overlay Types
| Overlay | Pattern | Notes |
|---------|---------|-------|
| `lttp-suspicion-overlay` | Data (slide-up) z-[80] | Dual-view: roster → folder |
| `lttp-settings-overlay` | Data (slide-up) z-[80] | Settings |
| `lttp-how-to-overlay` | Data (slide-up) z-[90] | How to Play |
| `lttp-history-overlay` | Data (slide-up) z-[90] | Full chat history log |
| `lttp-smalltalk-overlay` | Data (slide-up) z-[80] | Small Talk Helper — topic tabs + prompt pills (+ "Other" free-form tab); shown before confirm when `lttpSmallTalk` ON |
| `lttp-confirm-overlay` | Decision modal z-[80] | Free-text message input — always the final step; pre-filled if guided prompt selected |
| `lttp-quit-overlay` | Decision modal z-[80] | Quit confirm |
| `lttp-new-plans-overlay` | Decision modal z-[90] | "Head Out Again?" play-again confirm (Phase 29 — L4); hidden in `engine.js` `resetToLobby()` (not `resetLateToTheParty()`) |
| `lttp-tip-overlay` | Decision modal z-[90] | Shared contextual tip overlay — `lttpShowTip(emoji, heading, lines[])`; ⚠️ not hidden by any reset path (audit [BUG], June 2026) |
| `lttp-help-tip-overlay` | Decision modal z-[90] | Legacy single-string tip (`lttpShowHelpTip`); ⚠️ not hidden by any reset path (audit [BUG], June 2026) |
| `lttp-guess-map-overlay` | Custom (full-width map panel) z-[95] | Guess phase — Friend of a Friend pins the address |

### Multiplayer (Phase 22)
- **Mode:** Individual Devices — each player on their own device
- **Shared screens:** `screen-lttp-mode`, `screen-lttp-lobby-host`, `screen-lttp-lobby-join` (parameterised)
- **Game-specific screens:** none
- **Message interrupt:** When any player sends a message, `mp-lttp-message-interrupt-overlay` (z-[105]) fires on ALL devices simultaneously
- **Passive device behaviour:** Map and Contacts navigation permitted; `.lttp-send-trigger` and `#btn-lttp-confirm-send` locked when device is not the active player
- **Map/Contacts state:** Local only — never synced. Each player maintains their own annotations.
- **Key ACTION packets:** `LTTP_MESSAGE_SEND` (Client → Host: message text + from/to indices), `LTTP_PIN_SUBMIT` (Stray's pinned grid index), `LTTP_VOTE_SUBMIT` (a non-Stray player's suspect vote)
- **Key SYNC packets:** `LTTP_GAME_START` (full world state), `LTTP_MESSAGE_INTERRUPT` (fromName/toName/messageText → all devices; informational only — no longer navigates), `LTTP_TURN_ADVANCE` (nextPlayerIdx + plan + history + lapAnswered), `LTTP_PLAN_UPDATE` (host's resolved narrowing: highlights/fadedCells/decoys/plan/activeIdx/lapAnswered/planLog), `LTTP_GUESS_PHASE` (enter Plan-4 per-device guess), `LTTP_GAMEOVER` (winner/reason/pin/votes/highlights)
- **Plan narrowing/advancement — host-authoritative (RESOLVED June 2026, Group B; was L5 [BUG]):** the host now owns lap completion. `lttpSelectPlayer` defers to the host for clients; `lttpHostProcessMessage()` → `lttpAdvanceAfterMessage()` narrows **once** on the host and broadcasts the resolved sets via `LTTP_PLAN_UPDATE`. No client runs `lttpNarrowHighlights()` (so the `shuffle()` can't diverge). The interrupt-dismiss no longer navigates — navigation is host-SYNC-driven (`LTTP_TURN_ADVANCE`/`LTTP_PLAN_UPDATE`/`LTTP_GUESS_PHASE`).
- **Guess phase + gameover — host-driven (RESOLVED June 2026, Group B; was L6 [BUG]):** `lttpStartGuessPhase()` broadcasts `LTTP_GUESS_PHASE`; with `lttpGroupVote` forced off in MDLM, every device guesses for its own player simultaneously (Stray pins → `LTTP_PIN_SUBMIT`; others vote → `LTTP_VOTE_SUBMIT`). The host aggregates via `lttpGuessReadyCheck[]`, resolves, and broadcasts `LTTP_GAMEOVER`. Non-active devices show a waiting standby.

---

## Game 7: Natural Selection
**Theme:** BBC/Attenborough wildlife documentary. One player (The Mole) doesn't know the specific animal — only its broad category. Everyone else gives clues; the group votes to expose the Mole.
**Key file:** `js/games/nat.js`
**Brand colour:** `lime-600` | **Active pill:** `pill-active-lime`
**State flow:**
```
LOBBY → NAT MENU → NAT SETUP
→ [Match loop:
    [Day loop: NAT HANDOVER → NAT OBSERVATION → (NAT DAILY REVIEW if Sylly)]
    → NAT SELECTION → NAT LAST STAND (if Mole caught) → NAT TALLY
  ]
→ NAT GAMEOVER
```

### Terminology
| Term | Meaning |
|------|---------|
| The Specimen | The animal drawn each match from `words.json` animals category |
| The Mole | The player who only knows The Grouping — trying to blend in |
| Lead Biologist | The player who sees the full animal name (`specimen.word`) |
| Field Researcher | All other players — each sees a different detail word from `nono_list[1–9]` |
| The Grouping | The Mole's information: `nono_list[0]` (the Broad Shield / Documentary Label) |
| Observation Day | One clue-submission pass (`natRoundsPerMatch` days per match) |
| The Handover | `screen-nat-handover` — pass-the-phone gate before each player's observation |
| The Observation | `screen-nat-observation` — one word clue input per player per day |
| The Daily Review | `screen-nat-daily-review` — Sylly Mode: all clues revealed before voting |
| The Selection | `screen-nat-selection` — group votes to identify The Mole |
| The Classification | The voting setting + the per-voter prompt header on the Independent vote screen ("[name]'s Classification"). The Mole's word-label on the observation screen is also "Classification" (`natGetWordLabel`) |
| Field Consensus | Display label for the `'consensus'` voting mode (all players vote together on one screen) |
| The Last Stand | `screen-nat-last-stand` — Mole's final specimen guess + Biologist verdict |
| The Field Notes | `screen-nat-tally` — per-match score reveal |
| The Final Report | `screen-nat-gameover` — expedition winner + match log |
| Credibility | Score currency |
| New Expedition | Play again (resets all state, preserves names + settings) |

### Settings
(Reality-synced June 2026 audit — display names, options, defaults, and overlay order from `index.html` / `nat.js`. Player count is NOT in the settings overlay — it lives on the setup screen as a 3/4/5/6 pill group, default 4, `natPlayerCount`.)

| Setting (display) | Options (display) | Default | Internal variable | Internal values |
|-------------------|-------------------|---------|-------------------|-----------------|
| Days per Habitat | 2 / 3 / 4 | 2 | `natRoundsPerMatch` | int (data-days) |
| Research Log | OFF / ON | OFF | `natCumulativeClues` | bool |
| Habitats | 3 / 4 / 5 | 3 | `natMatchesSetting` | int (data-habitats) |
| Field Difficulty | Common / Rare / Exotic | Rare | `natDifficulty` | `'d1'` / `'d1+d2'` / `'all'` |
| The Classification (voting mode) | Field Consensus / Independent | Field Consensus | `natVotingMode` | `'consensus'` / `'independent'` |
| Mole Escape Bonus | 10 / 15 / 20 | 10 | `natEscapePoints` | int (data-escape) |
| Scientific Integrity | Relaxed / Peer Review | Relaxed | `natScientificIntegrity` | `'relaxed'` / `'peer-review'` |
| ✨ Sylly Mode (Survival of the Fittest) | OFF / ON | OFF | `natSyllyMode` | bool |

**Audit note (June 2026):** the previous table listed "Field Difficulty: Shallow / Mixed / All" and setting names "Voting Mode" / "Escape Points" — none of these strings exist in the overlay. Reality: pill labels are **Common / Rare / Exotic** (default Rare = `'d1+d2'`), the vote card is titled **"The Classification"** with a **"Field Consensus"** pill, and the escape card is **"Mole Escape Bonus"**. In MDLM, `natVotingMode` is forced to `'independent'` in `natShowSetup()`.

### Special Mechanics

**Three-tier information model:**
- Lead Biologist → `specimen.word` (full animal name)
- Field Researchers (N−2 players) → each a DIFFERENT word from `specimen.nono_list[1–9]` (shuffled pool, one per Researcher). Word bank quality rule: each word must be distinctive and non-redundant — see Dual-Use Contract in `CLAUDE.md`
- The Mole → `specimen.nono_list[0]` (The Grouping / Broad Shield) — a Documentary Label, never a scientific class name

**Role assignment (`natAssignRoles`):**
```js
const order = shuffle([...Array(natPlayerCount).keys()]);
natMoleIdx = order[0]; natBiologistIdx = order[1];
const detailPool = shuffle(natSpecimen.nono_list.slice(1));
order.slice(2).forEach((pIdx, i) => { natAssignedWords[pIdx] = detailPool[i]; });
```
Observation turn order: Biologist first, then remaining players in shuffled order.

**Blocking rule:** Block (a) the animal name, (b) any word already submitted this round. No super-block on the full nono_list.

**Eviction tie-break:** Highest vote count → evicted. Tie → lowest current Credibility breaks it. Still tied → `natEvictedIdx = -1` (Mole wins by default). The `-1` path is handled in `natShowLastStand()` — when `natEvictedIdx === -1`, no player name is shown; instead a "No consensus reached — The Mole escapes." message is displayed and the Mole is not forced to guess.

**Voting Mode:**
- `consensus` — all players vote together on one shared screen; all non-mole players score if the Mole is caught
- `independent` — pass-the-phone per player; only players who individually voted for the Mole score

**Scientific Integrity (Peer Review mode):**
Players can dispute (`natDispute(playerIdx, dayIdx)`) any submitted clue on the selection screen. Status cycles: `normal → review → discredited`. Tracked in `natClueStatuses[playerIdx][dayIdx]`. Each discredited clue deducts −5 Credibility from the disputed player after voting resolves.

**Scoring (`natResolveRound`):**
| Outcome | Who scores | Credibility |
|---------|------------|-------------|
| Mole not caught | The Mole | +`natEscapePoints` |
| Mole caught, consensus mode | All non-mole players | +10 each |
| Mole caught, independent mode | Each player who voted for Mole | +10 each |
| Mole guesses specimen correctly | The Mole | +10 bonus (stacks with any above) |
| Each discredited clue (peer-review) | The discredited player | −5 per clue |

**Sylly Mode — Survival of the Fittest:**
No Lead Biologist role. All players (including the position normally assigned as Biologist) receive detail words from `nono_list[1–9]`. The Mole still receives `nono_list[0]`. Journal entries are hidden from the group until the NAT DAILY REVIEW screen appears at the end of each Observation Day. Scoring and eviction rules are unchanged.

### Overlay Types
| Overlay | Pattern | Notes |
|---------|---------|-------|
| `nat-settings-overlay` | Data (slide-up) z-[80] | "The Permit Office 🦁" |
| `nat-how-to-overlay` | Data (slide-up) z-[90] | How to Play |
| `nat-quit-overlay` | Decision modal z-[80] | "Abandon the expedition?" |
| `nat-new-expedition-overlay` | Decision modal z-[90] | "New Expedition?" play-again confirmation |

`screen-nat-daily-review` is a full screen (not an overlay) — shown in Sylly Mode between the last Observation Day and The Selection.

### Multiplayer (Phase 22)
- **Mode:** Individual Devices — each player on their own device
- **Shared screens:** `screen-nat-mode`, `screen-nat-lobby-host`, `screen-nat-lobby-join` (parameterised)
- **Game-specific screens:** none
- **Role security:** NAT role data is broadcast to all devices; each device renders only its own role (UX-based couch security — sufficient for a same-room couch game). For full separation, targeted Firebase writes per player would be required.
- **Handover screen:** Skipped in Lobby Mode; replaced by `SYNC: NAT_ACTIVE_PLAYER` which drives who can input and who sees a standby placeholder
- **Selection voting + Last Stand — host-authoritative (RESOLVED June 2026, Group B; was N2 [BUG]):** the full Selection → Last Stand → tally → gameover flow is now host-driven. MDLM is always Independent voting (consensus forced off), so only the independent path was built. `btn-nat-sel-start` and `btn-nat-tally-next` are host-only; each device submits **its own** vote (`NAT_VOTE`) which the host aggregates via `natMpVoteReadyCheck.every(Boolean)`; the host broadcasts the eviction (`NAT_LAST_STAND`); only the Mole's device guesses (`NAT_MOLE_GUESS` → `NAT_BIO_PHASE`) and only the Biologist's device rules (`NAT_BIO_VERDICT`; in Sylly the host adjudicates the group verdict). Peer-review disputes are host-authoritative (`NAT_DISPUTE`) so the −5 deductions stay consistent. Non-active devices show standby states.
- **Key ACTION packets:** `NAT_OBSERVATION` (clue word → Host), `NAT_DISPUTE` (peer-review dispute toggle → Host), `NAT_VOTE` (one device's Mole vote → Host), `NAT_MOLE_GUESS` (Mole's final guess → Host), `NAT_BIO_VERDICT` (Biologist's confirmed/disputed → Host)
- **Key SYNC packets:** `NAT_MATCH_START` (specimen + all role assignments), `NAT_ACTIVE_PLAYER` (current observer index), `NAT_DAY_END` (Sylly Mode daily review), `NAT_SELECTION` (all clue data + clue statuses for the reveal screen), `NAT_DISPUTE` (updated clue statuses), `NAT_VOTE_START` (open voting + peer-review-adjusted scores), `NAT_LAST_STAND` (eviction result), `NAT_BIO_PHASE` (Mole guess → verdict sub-phase), `NAT_TALLY` (per-match scores), `NAT_GAMEOVER` (final report)

---

## Game 8: Deep-Sea Deploy (DSD)
**Theme:** Codenames-style clue-giving + sequential deduction for two naval task forces.
**Key file:** `js/games/dsd.js`
**Brand colour:** `cyan-700` | **Active pill:** `pill-active-cyan`
**State flow:**
```
LOBBY → DSD MENU → DSD SETUP (team names) → DSD PLAYERS (player names + captain) → [WHO FIRST]
→ [Deployment loop:
    PASS GATE (Captain) → DSD CAPTAIN → PASS GATE (Crew) → DSD CREW → DSD EXECUTION
    → (DSD SABOTAGE if Sylly Mode + deploy ≥ 2)
  ]
→ DSD GAMEOVER
```

### Terminology
| Term | Meaning |
|------|---------|
| Sonar Ping | Captain's clue: one word + number 1–9 |
| The Sequence | Crew's ordered list of grid taps (max ping number + 1) |
| Deployment | Full round (both teams played once) |
| Valour | Score currency |
| Payload | Team-coloured grid cell (9 for first team, 8 for second) |
| Spiked Urchin | Hazard cell — costs 5 Valour |
| The Manifest | Captain screen label |
| The Console ⚓ | Settings overlay title |
| How to Play ⚓ | How-to overlay title (standard title block; renamed from "Operations Manual ⚓" Phase 28 — subtitle "How to run a successful deployment.") |
| New Operation | Play again (resets game state, keeps names + settings) |
| Silent Running | Sylly Mode name |
| Jammer | Sylly Mode sabotage tile |
| Magnetic Drift | Sylly Mode mechanic — unrevealed grid cells shuffle each deployment |

### Settings
(Reality-synced June 2026 audit — display names + overlay order from `index.html`. The three hazard "ends turn" controls live in a **single "Hazard Control" card** as a multi-select pill group, not three separate cards. An active pill = that hazard ends your turn on hit.)

| Setting (display) | Options (display) | Default | Internal variable | Internal values |
|-------------------|-------------------|---------|-------------------|-----------------|
| Sea State (difficulty) | Calm / Turbulent / Tempest | Turbulent | `dsdSeaState` | `'calm'` / `'turbulent'` / `'tempest'` |
| Strategic Planning | OFF / ON | OFF | `dsdStrategicPlanning` | bool |
| Hazard Control | Urchin / Mine / Payload (multi-select pills) | Mine + Payload active, Urchin off | `dsdHazardControl.{urchin,mine,enemy}` | bools — active pill = ends turn on hit. **"Payload" pill = `enemy`** |
| Danger Level | Pressure Mine / Nuclear Mine | Pressure Mine | `dsdDangerLevel` | `'pressure'` / `'nuclear'` |
| ✨ Sylly Mode (Silent Running) | OFF / ON | OFF | `dsdSyllyMode` | bool |

### Scoring
| Outcome | Who scores | Points | Turn End? |
|---------|-----------|--------|-----------|
| Friendly Payload | Active Team | +10 | No |
| Enemy Payload | Enemy Team | +10 | If `dsdHazardControl.enemy` |
| Spiked Urchin | Active Team | −5 | If `dsdHazardControl.urchin` |
| Pressure Mine | Active Team | −20 | If `dsdHazardControl.mine` |
| Nuclear Mine | Active Team | −1000 | GAME OVER (2.6s delay) |
| Jammer (Sylly) | Active Team | −5 | Yes (always) |

### Special Mechanics

**Grid composition:** **9/8/4/4** (first team / second team / urchins / mines = 25 cells). No bystander. First team is determined by `showWhoFirst()` result; they receive 9 payloads. Role stored as `0` (team0), `1` (team1), `'urchin'`, or `'mine'`.

**Deep Trench colour palette (Phase 20):**
| Role | Captain grid | Crew grid (muted, revealed) |
|------|-------------|-----------------------------|
| Friendly payload | `bg-cyan-700 text-white` | `bg-cyan-200 text-cyan-900` |
| Enemy payload | `bg-indigo-800 text-white` | `bg-indigo-200 text-indigo-900` |
| Urchin | `bg-slate-400 text-white` | `bg-slate-200 text-slate-700` |
| Mine (pressure) | `bg-red-600 text-white` | `bg-red-200 text-red-900` |
| Mine (nuclear) | `bg-red-900 text-white` | `bg-red-200 text-red-900` |
| Jammer (Sylly) | placing team's colour + `?` badge | — |

**Word curation filter** (applied at runtime in `dsdBuildGame()`): excludes `aussie_slang`, `pop_culture`, `people`, `brands` categories + any word containing a space (hyphenated entries are kept).

**Captain visibility:** Captain sees full Deep Trench colour-coded grid. Revealed cells shown with `opacity-40 line-through`. Colour legend strip below grid shows team names (active team bold). In Sylly Mode, opponent's Jammer shown as placing team's colour + `?` badge (not amber).

**Pass-gate pattern:** `dsdShowPassGate({heading, subtext, ctaLabel, onConfirm})` — shows `screen-dsd-pass-gate` before every Captain screen and before every Crew screen (after ping transmitted).

**Crew sequence:** Crew selects up to `dsdPingNumber + 1` tiles in order. Each tap adds a numbered badge. Confirm via `dsd-confirm-disarm` overlay before executing. Execution resolves tile-by-tile on a live grid with 400ms pre-reveal + 300ms post-resolve delay; outcome log builds per resolved tile.

**`showWhoFirst()` used for team order:** DSD is the first game to call this engine utility in production. First team receives 9 payloads.

**Magnetic Drift (`dsdApplyDrift()`):** From deployment 2 onwards (Sylly Mode), shuffles unrevealed grid cells' words and roles independently before each Captain screen. Revealed cells are never moved.

**Jammer:** Placed by the team that just finished their first turn (at end of deployment 1). Captain of the opposing team sees the placing team's colour + `?` badge. Triggering costs the active team 5 Valour + ends turn + clears the Jammer. `dsdJammer` = grid index (−1 = none); `dsdJammerTeam` = placing team index.

**Nuclear Mine:** `dsdValour[me] -= 1000` then `setTimeout(() => dsdShowGameover(), 2600)` — 2.6s delay allows `playAbyssThud()` to play out.

**Turn log:** `dsdTurnLog[]` accumulates per-turn records `{deployment, team, teamName, captainName, ping, pingNumber, outcomes[]}`. Rendered as a per-deployment history carousel on the gameover screen. `dsdTurnOutcomes[]` is populated by `dsdResolveHit()` and pushed to `dsdTurnLog` by `dsdAdvanceTurn()`.

**Win condition:** Highest Valour when all of either team's payloads are revealed. Arming all payloads ends the game but does NOT guarantee a win.

### Team Setup
- **Screen 1 heading:** "Name Your Task Forces"
- **Default team names:** SS Kraken / SS Leviathan
- **Screen 2 heading:** "Meet the Crew"
- **Screen 2 subtitle:** "Names optional — tap ⚓ to assign the Captain."
- **Player placeholder:** "Crew member 1", "Crew member 2", etc.
- **Setup emoji:** ⚓

### Overlay Types
| Overlay | Pattern | z-index | Notes |
|---------|---------|---------|-------|
| `dsd-settings-overlay` | Data (slide-up) | z-[80] | "The Console ⚓" |
| `dsd-how-to-overlay` | Data (slide-up) | z-[90] | "How to Play ⚓" (renamed from "Operations Manual ⚓" Phase 28) |
| `dsd-quit-overlay` | Decision modal | z-[80] | "Scuttle the Ship?" |
| `dsd-confirm-disarm` | Decision modal | z-[90] | "Confirm Sequence?" |
| `dsd-new-op-overlay` | Decision modal | z-[90] | "New Operation?" — play-again confirmation |

### Screens (Phase 21a + Phase 23)
| Screen ID | Purpose |
|-----------|---------|
| `screen-dsd-briefing` | Strategic Planning preview — 25 words as tappable tiles; tap any word to swap it (unlimited swaps); shown when `dsdStrategicPlanning` ON |
| `screen-dsd-spectator` | TLM non-active team watch view — read-only crew-view grid + running clue history; shown by `dsdShowSpectatorView()` when `mpLobbyStyle === 'team'` |

### Dynamic Legend (Phase 21a)
The captain screen legend dynamically shows outcome text based on current settings (updated by `dsdUpdateLegend()` on each captain screen open):
- Friendly payload: "+10 Valour"
- Enemy payload: "+10 to [enemy name]" + "(ends turn)" if `dsdHazardControl.enemy`
- Urchin: "−5 Valour" + "(ends turn)" or "(turn continues)" based on `dsdHazardControl.urchin`
- Mine (pressure): "−20 Valour (ends turn)"
- Mine (nuclear): "−1000 Valour ☠️ GAME OVER"
- Jammer (Sylly): "−5 Valour, ends turn"

### Multiplayer (Phase 22 + Phase 23)
- **Mode:** TLM (recommended) / MDLM / PTP — `recommendedMode: 'tlm'`, `supportedModes: ['ptp', 'tlm', 'mdlm']`
- **Shared screens:** `screen-mp-mode`, `screen-mp-lobby-host`, `screen-mp-lobby-join` (parameterised)
- **Game-specific screens:** `screen-dsd-spectator` (TLM non-active team view)
- **Captain screen routing (TLM):** Active team's Captain device shows full colour grid; non-active team shows `screen-dsd-spectator` via `dsdShowSpectatorView()`
- **Captain screen routing (MDLM):** Same but non-active team shows crew standby via `dsdShowCrewStandby()`
- **Execution flow:** Client Captain sends `ACTION: DSD_PING_TRANSMIT`; Host validates + broadcasts `SYNC: DSD_CREW_ACTIVE`; Client Crew submits `ACTION: DSD_SEQUENCE_SUBMIT`; Host resolves + broadcasts `SYNC: DSD_EXECUTION_RESULT`
- **Magnetic Drift (Sylly):** Applied by Host locally then reflected in `SYNC: DSD_EXECUTION_RESULT` grid state
- **Nuclear Mine bypasses `DSD_GAMEOVER` (audit [BUG], June 2026):** the Nuclear Mine branch of `dsdResolveHit()` ends the game via `setTimeout(dsdShowGameover, 2600)`, bypassing `dsdAdvanceTurn()` — the only place that broadcasts `SYNC: DSD_GAMEOVER`. So when a Nuclear Mine detonates in Lobby Mode (Danger Level is serialised, so clients can have it), the non-active spectator/standby device receives `DSD_EXECUTION_RESULT` but never `DSD_GAMEOVER`, and is stranded on the spectator/execution screen. (Normal victory via `dsdAdvanceTurn` → `dsdCheckVictory` broadcasts correctly.)
- **Key ACTION packets:** `DSD_PING_TRANSMIT` (Captain's clue word + number), `DSD_SEQUENCE_SUBMIT` (crew's ordered grid indices)
- **Key SYNC packets:** `DSD_CAPTAIN_ACTIVE` (turn state + grid for the next captain — TLM), `DSD_CREW_ACTIVE` (ping word + number for crew screen), `DSD_EXECUTION_RESULT` (tile outcomes + updated Valour + grid state), `DSD_GAMEOVER` (final scores)

---

## Game 9: Group Therapy (GTH)
**Theme:** Simultaneous drawing + guessing party game. Everyone draws their assigned psychological disorders, then races to diagnose each other's anonymous scribbles.
**Key file:** `js/games/gth.js`
**Brand colour:** `#B1BCA0` (Muted Sage) — custom CSS variable `--color-gth-sage` | **Active pill:** `pill-active-sage`
**Data file:** `data/gth-data.json`
**Infrastructure:** `js/lib/canvas-draw.js` — `window.CanvasDraw` global drawing module
**State flow:**
```
LOBBY (MDLM only) → GTH MENU → GTH PATIENT INTAKE (screen-gth-patient-intake) ← readyCheck gate
→ [Phase 1 — Patient Phase, simultaneous]:
    GTH DISORDER REVEAL (screen-gth-disorder-reveal) ← disorder + definition + tip, shown before each drawing
    GTH CANVAS (screen-gth-canvas) ← drawing + countdown, repeated per disorder (no gate between)
    GTH WAITING ROOM (screen-gth-waiting-room) ← waits for all players
→ GTH SHRINK INTRO (screen-gth-shrink-intro)
→ [Phase 2 — Shrink Phase, simultaneous]:
    GTH CASE (screen-gth-case) ← standard (Diagnostic Cards) or Deep Dive (text input)
    OR GTH CASE REPORT (screen-gth-case-report) ← queue exhausted before timer
→ GTH BIG REVEAL (screen-gth-big-reveal) ← host-controlled, one drawing at a time
→ GTH FINAL REPORT (screen-gth-final-report)
```

### Terminology
| Term | Meaning |
|------|---------|
| The Session | A full game (one cycle of Phase 1 + Phase 2 + Reveal) |
| Patient Phase | Phase 1 — each player draws their assigned disorders |
| Shrink Phase | Phase 2 — each player diagnoses anonymous drawings |
| The Disorder | The drawing prompt assigned to each patient |
| The Grouping | `nono_list[0]` — not used in GTH; GTH uses its own `gth-data.json` |
| Diagnostic Card | Multiple-choice answer card in standard mode |
| Deep Dive | Hard Mode — Shrinks type their diagnosis; no Diagnostic Cards |
| Case | One drawing in the Shrink Phase queue |
| The Queue | Each player's personalised set of drawings to diagnose |
| Waiting Room | `screen-gth-waiting-room` — passive screen while others finish drawing |
| Case Report | `screen-gth-case-report` — passive screen when queue exhausted before timer |
| The Big Reveal | `screen-gth-big-reveal` — host-controlled drawing-by-drawing reveal |
| New Session | Play again — resets all state, preserves names + settings |
| Walk Out | Quit during session |
| Inpatient Admission Form 📋 | Settings overlay title |
| How to Play 🛋️ | How-to overlay title (standard title block — renamed from "The Disclaimer 🛋️"; June 2026 audit) |

### Settings
| Setting | Options | Default | Internal value |
|---------|---------|---------|----------------|
| Reportable Symptoms (disorders per patient) | 3 / 4 / 5 | 3 | `gthDisordersPerPatient` int |
| Expression Window (drawing time) | 30s / 60s / No Limit | 60s | `gthDrawingTime` int — `0` = No Limit (no auto-submit, shows ∞) |
| Diagnosis Window | 60s / 90s / 120s | 90s | `gthDiagnosisWindow` int |
| Symptom Severity (difficulty mix) | Episodic / Recurrent / Refractory | Recurrent | `gthDifficultyMix` `'episodic'` / `'recurrent'` / `'refractory'` |
| Psychiatric Evaluation (Deep Dive) | OFF / ON | OFF | `gthDeepDive` bool |
| ✨ Sylly Mode (Stroke or Genius) | OFF / ON | OFF | `gthSyllyMode` bool |

### Special Mechanics

**Canvas drawing module (`CanvasDraw`):**
- Exposes `window.CanvasDraw` global: `init(el)`, `clear()`, `lock()`, `render(el, data, opts)`, `setTremor(wrapperEl, bool)`, `setBlur(el, durationMs)`
- Delta-encoded stroke format: `{ w, h, s: [[x0, y0, dx1, dy1, ...], ...] }` — deltas clamped to int8 (±127); strokes split on overflow
- Tremor applies translate to `<div id="gth-canvas-wrapper">` NEVER to `<canvas>` itself — canvas coordinate system must be unaffected

**Queue algorithm:** Each drawing assigned to exactly 2 player queues (never the artist's own). Gives `gthDisordersPerPatient × 2` drawings per queue.

**Scoring:**
| Outcome | Who scores | Points |
|---------|-----------|--------|
| Shrink diagnoses your drawing correctly | Patient (artist) | +2 |
| Correct Shrink diagnosis | Shrink | +2 |
| Speed bonus (fastest correct timestamp, one per drawing) | Shrink | +1 |
| Tier 3 disorder correctly diagnosed | Shrink | +1 bonus |

**Sylly Mode — Stroke or Genius:**
- Phase 1: `CanvasDraw.setTremor(wrapper, true)` — canvas wrapper jiggles ±5px during drawing
- Phase 2: `CanvasDraw.setBlur(renderCanvas, 3500)` — each case starts blurred, clears over 3.5s
- Tremor applied to wrapper div only; never to canvas element (coordinate correctness)

**Phase 2 timer sync:** `GTH_PHASE2_START` distributes queues only (no timestamp). Host shows the Shrink Phase intro gate; clients see a wait message. Host taps "Open the Case Files →" → broadcasts `GTH_PHASE2_BEGIN` with `endTimestamp`; all devices start the countdown from `Date.now()`. `GTH_PHASE2_END` SYNC from host is the authoritative timer-expiry trigger.

**Big Reveal:** Host taps "Next Case →" → broadcasts `GTH_REVEAL_NEXT` with `revealIdx`; all devices advance. "Finish" button on last item → `GTH_REVEAL_FINISH` → all navigate to Final Report.

### Overlay Types
| Overlay | Pattern | z-index | Notes |
|---------|---------|---------|-------|
| `gth-settings-overlay` | Data (slide-up) | z-[80] | "Inpatient Admission Form 📋" |
| `gth-how-to-overlay` | Data (slide-up) | z-[90] | "How to Play 🛋️" |
| `gth-quit-overlay` | Decision modal | z-[80] | "Walk Out?" |
| `gth-new-session-overlay` | Decision modal | z-[90] | "New Session?" — play-again confirmation |

### Screens
| Screen ID | Purpose |
|-----------|---------|
| `screen-gth-menu` | Main hub |
| `screen-gth-patient-intake` | Pre-Phase-1 readyCheck gate — each patient confirms ready |
| `screen-gth-disorder-reveal` | Shows the disorder name + definition + drawing tip before each canvas round |
| `screen-gth-canvas` | Phase 1 drawing screen — `CanvasDraw` + countdown |
| `screen-gth-waiting-room` | Passive screen while other patients finish drawing |
| `screen-gth-shrink-intro` | Phase 2 host gate — host taps "Open the Case Files →" |
| `screen-gth-case` | Phase 2 diagnosis — Diagnostic Cards or Deep Dive text input |
| `screen-gth-case-report` | Passive screen when queue exhausted before timer expiry |
| `screen-gth-big-reveal` | Host-controlled drawing-by-drawing reveal |
| `screen-gth-final-report` | Final scores |

### Data schema (`data/gth-data.json`)

| Field | Type | Purpose |
|-------|------|---------|
| `id` | string | `gth-NNN` — sequential, never reused |
| `name` | string | Canonical answer — shown at Big Reveal and in Diagnostic Cards |
| `display` | string | Patient-facing label on intake/reveal screen (usually = `name`) |
| `definition` | string | One-sentence plain-English explanation shown before drawing |
| `tip` | string | Drawable visual suggestion — one concrete scene in 30 seconds |
| `category` | string | Thematic grouping for decoy selection (`neurosis`, `condition`, `phobia`, etc.) |
| `difficulty` | number | `1` = everyday, `2` = classic phobia, `3` = complex condition. Tier 3 correct diagnosis gives a +1 Shrink bonus. |
| `cluster` | string | **Optional.** Tight subgroup label (e.g. `"sleep"`). When set, 2 of 4 decoy cards come from the same cluster. Add only when ≥3 members exist. |
| `aliases` | string[] | Deep Dive accepted answers — normalised lowercase; at least 3 per entry |

### Multiplayer (Phase 30 + Phase 31)
- **Mode:** MDLM only — `multiplayerOnly: true`, `supportedModes: ['mdlm']`, `recommendedMode: 'mdlm'`
- **Min players:** 4 | **Max players:** 8
- **rosterConfig:** `{ type: 'none' }` — no manual seat assignment; lobby fills automatically
- **Shared screens:** `screen-mp-mode`, `screen-mp-lobby-host`, `screen-mp-lobby-join` (parameterised)
- **No pass-gate screens** — same-room couch game; UX-based security
- **Post-lobby routing:** `onPassThePhone` calls `gthStartSession()` directly — no menu re-visit
- **Key ACTION packets:** `GTH_PATIENT_READY` (player ready on intake screen → host), `GTH_DRAWING_SUBMIT` (each player's drawings batch → host), `GTH_DIAGNOSES_SUBMIT` (each player's diagnoses batch → host; clients only — host stores directly)
- **Key SYNC packets:** `GTH_GAME_START` (disorder assignments + playerNames for all players), `GTH_PHASE1_START` (all patients ready — start drawing simultaneously), `GTH_PHASE2_START` (all queues — no timestamp), `GTH_PHASE2_BEGIN` (host gate opened — carries `endTimestamp`; all devices start timer + show first case), `GTH_PHASE2_END` (timer expired — host authoritative), `GTH_REVEAL_NEXT` (host advances reveal), `GTH_REVEAL_FINISH` (host ends reveal), `GTH_FINAL_SCORES` (scores + revealItems for all)
- **Host submission bypass:** Host stores own diagnoses directly into `gthAllDiagnoses` + `gthDiagnosesReady` without Firebase round-trip — avoids SYNC overwriting ACTION before `onValue` fires

---

## Game 10: The Bluff (DYB)
**Display name:** "The Bluff" (renamed from "Dicey Bluffs", June 2026). The rename leans into the geological double meaning of *bluff* — a high sea-cliff — so the language sweep is built on a climb/cliff metaphor: escalation is *climbing higher*, a challenge is doubting someone can hold their footing, losing is *the plunge*, and the winner reaches *The Summit*. **The internal `dyb` prefix and ALL code identifiers (variables, packet names, screen IDs, e.g. `dybAllegationHistory`, `DYB_ALLEGATION`, `screen-dyb-showdown`, `screen-dyb-spirit-board`) are unchanged** — the rename is view-layer strings only.
**Theme:** Liar's Dice — each player shakes a private hand of dice, then players take turns making escalating claims about the full table. Call someone's bluff or be caught lying.
**Tagline:** "Trust no one. Count every face."
**Key file:** `js/games/dyb.js`
**Brand colour:** `#1E4D8C` (ocean blue — all primary CTAs use `dyb-cta`; section/step labels use `dyb-label`) | **Active pill:** `pill-active-dyb` | **Toggle ON:** `game-toggle-on-dyb` (recoloured from stone-400 → #1E4D8C; `game-toggle-on-stone` now serves as the neutral lobby fallback only)
**State flow:**
```
LOBBY (MDLM only) → DYB MENU
→ DYB SEATING (host only — shows roster before game starts)
→ [Game loop:
    DYB SHAKE (each player rolls privately) → DYB TABLE (bids escalate, Call Bluff ends the round)
    → DYB SHOWDOWN (all hands revealed, animated tally, loser identified)
    → (eliminated players routed to DYB SPIRIT BOARD from next Shake onwards)
    → repeat until 1 player remains
  ]
→ DYB GAMEOVER
```

### Terminology
*Display terms below; code identifiers in `code font` are unchanged by the rename.*

| Term | Meaning |
|------|---------|
| Shake | One full round of rolling + bidding + The Overlook |
| The Claim | A bid — the active player's claim about how many of a face exist across all dice on the table. *Display term (was "The Allegation"). Code keeps `dybAllegationHistory`, `DYB_ALLEGATION`, the `dyb-allegation-*` element IDs.* |
| Call the Bluff | Challenge the previous Claim — triggers The Overlook. *Display term (was "Call Bluff!")* |
| Climb Higher | The escalate/raise button — bid a higher quantity (any face) or the same quantity with a higher face. *Display term (was "Raise the Stakes")* |
| The Overlook | `screen-dyb-showdown` — all hands revealed; real count vs claimed count determines the loser. *Display term (was "The Showdown"; eyebrow "Reaching the Edge")* |
| The Table | `screen-dyb-table` — main gameplay screen (no on-screen title); pip row, bid history, Claim controls |
| The Tempest | Sylly Mode name (UI: "The Tempest"; intensity slider still labelled "Chaos level"). Each die may become one of five special types — see Special Mechanics. *Display term (was "Devil's Luck")* |
| Slick Die | One of the five The Tempest die types: face is privately assigned by the owner, opaque to all others |
| Wild (1s) | Ones count as any face — behaviour depends on Wildcards Style setting |
| Classic Wildcards | 1s count toward any bid |
| Strict (No Wilds) | 1s are just 1s — no wild behaviour |
| Volatile Wilds | 1s are wild UNTIL someone bids 1s directly — then they stop being wild for the round |
| The Depths | `screen-dyb-spirit-board` — eliminated player's passive spectator screen (header "THE DEPTHS 🌊"). *Display term (was "The Spirit Board")* |
| The Summit | Gameover win state + `screen-dyb-gameover` heading ("The Summit 🎲") — the last player with dice reaches The Summit. *Display term (was "The Clean Out")* |
| New Game | Play again — overlay heading "Climb Again?" (confirm "Climb Again 🎲" single / dynamic MP labels) |
| Back Down? | Quit confirm overlay heading (🚪; confirm "Yeah, I'm out." / cancel "Keep bluffing!"). *Display term (was "Walk Away?")* |

### Settings
| Setting | Options | Default | Internal variable | Internal values |
|---------|---------|---------|------------------|-----------------|
| Wildcards Style | No Wilds / Classic / Volatile | Classic | `dybWildcardsStyle` | `'strict'` / `'classic'` / `'volatile'` |
| Starting Dice | 3 / 4 / 5 | 5 | `dybStartingHand` | int |
| ✨ Sylly Mode (The Tempest) | OFF / ON | OFF | `dybSyllyMode` | bool |
| Chaos level (sub-option) | slider 5–10 | 5 | `dybSyllyIntensity` | int — % chance per die *per special type* (cumulative across the 5 types; ≈ intensity×5 % of dice become special at intensity 5) |

### Scoring / Elimination
| Outcome | Effect |
|---------|--------|
| `real < claimed` (bidder's claim was too high) | Bidder loses 1 die |
| `real >= claimed` (challenger was wrong) | Challenger loses 1 die |
| Player reaches 0 dice | Eliminated — added to `dybEliminationOrder`; moved to Spirit Board |
| Last player standing | Winner |

**Note:** There is no points currency — players are eliminated by losing dice. Rank at end = reverse elimination order (last eliminated = 2nd place).

### Special Mechanics

**Wildcards — Volatile mode:**
`dybOnesStripped` starts `false` each Shake. If a player's allegation names face = 1, `dybOnesStripped = true` for the rest of the Shake. After that, 1s no longer count as wild — `dybComputeRealCount()` branches on this flag.

**The Tempest — five special die types (Sylly Mode):**
On each roll (`dybGenerateRoll`), every die has a cumulative chance to become one of five special types (`typeOrder = ['loaded','phantom','slick','cracked','snake']`, threshold `r < intensity/100 × (i+1)`). Counting is in `dybComputeRealCount()`:
- **Loaded** (amber, ring) — counts as **2** toward its face value.
- **Phantom** (grey italic "?") — face hidden from the owner; counts **normally** at its real rolled value. ⚠️ Currently the "?" persists even at the showdown reveal — see DYB Bug Index (the how-to promises a reveal).
- **Slick** (blue) — no fixed face; owner assigns any face via `dyb-slick-picker-overlay` (z-[100]) at the table screen. Counts only toward the assigned face. Face is private until `DYB_SHOWDOWN` broadcasts `allSlickFaces`.
- **Cracked** (line-through grey) — counts **0** always.
- **Snake (Snake Eyes)** (red) — counts as **−1** toward its face value.

Wild-1 behaviour (Classic/Volatile) applies to Loaded/Snake/standard via `matchesFace`; Slick uses its assigned face only; Cracked is always 0.

**Showdown animation (`dybRenderShowdownScreen`):**
All hands revealed immediately. Count animates from 0 → real at 400ms/tick with `playTick()`. On reaching real: `playBoing()`, verdict shown (bidder/challenger label + loser name), `onDone()` callback fires. If real ≤ 0: 600ms pause then reveal (no ticking needed).

**Opener rotation:**
After each Showdown, `dybCurrentOpenerIdx` = loser (if still active) or next active player (if eliminated). The opener must place the first bid of the next Shake.

### Overlay Types
| Overlay | Pattern | z-index | Notes |
|---------|---------|---------|-------|
| `dyb-settings-overlay` | Data (slide-up) | z-[80] | "Ground Rules 📋" (was "House Rules 📋") |
| `dyb-how-to-overlay` | Data (slide-up) | z-[90] | "How to Play 🎲" |
| `dyb-quit-overlay` | Decision modal | z-[80] | "Back Down?" — mid-game exit (was "Walk Away?") |
| `dyb-new-game-overlay` | Decision modal | z-[90] | "Climb Again?" — play-again confirm (was "Roll Again?") |
| `dyb-slick-picker-overlay` | Decision modal | z-[100] | Slick die face picker — tapped from table screen; MUST be cleared in `resetToLobby()` AND in quit-confirm handler |

### Screens
| Screen ID | Purpose |
|-----------|---------|
| `screen-dyb-menu` | Main hub |
| `screen-dyb-seating` | Host pre-game roster (MDLM only) |
| `screen-dyb-shake` | Per-player private roll screen |
| `screen-dyb-table` | Main bidding table — pip row, allegation controls, bid history |
| `screen-dyb-spirit-board` | Eliminated player spectator view |
| `screen-dyb-showdown` | Showdown reveal — animated count-up, verdict |
| `screen-dyb-gameover` | Winner, elimination order, play-again / exit |

### Multiplayer (Phase 31–32)
- **Mode:** MDLM only — `multiplayerOnly: true`, `supportedModes: ['mdlm']`, `recommendedMode: 'mdlm'`
- **Min players:** 3 | **Max players:** 8
- **rosterConfig:** `{ type: 'none' }` — automatic seat assignment; no manual Assign Spots UI
- **Shared screens:** `screen-mp-mode`, `screen-mp-lobby-host`, `screen-mp-lobby-join` (parameterised)
- **Post-lobby routing:** `onPassThePhone` (host) → `dybShowSeating()` directly; clients wait for `DYB_GAME_START`
- **Roll privacy:** Each device rolls and stores its own `dybMyRoll`. Rolls are NOT broadcast until Showdown — host collects them via `DYB_ROLL_SUBMIT` ACTION packets. `dybAllRolls` is host-only until `DYB_SHOWDOWN` SYNC.
- **Slick picker:** Local only — owner chooses their Slick die face on their own device. Face is broadcast only in `DYB_SHOWDOWN` via `allSlickFaces`.
- **Key ACTION packets:** `DYB_ROLL_SUBMIT` (player's dice + special types → host), `DYB_ALLEGATION` (bid face + qty → host), `DYB_CALL_BLUFF` (challenger → host)
- **Key SYNC packets:** `DYB_GAME_START` (playerNames, diceCount, syllyMode, syllyIntensity, seatNumbers), `DYB_SPIRIT_SHAKE` (allRolls + activePlayers → eliminated devices route to Spirit Board), `DYB_SHAKE_ACTIVE` (activePlayers + dice — start shake for active players), `DYB_ALLEGATION_SYNC` (bid + nextBidderIdx + history), `DYB_SHOWDOWN` (all hands revealed + loser + elimination + gameOver), `DYB_GAMEOVER` (winner + elimination order)

---

## Game 11: Bailed (BLD)
**Theme:** Social deduction + cooperative sabotage. Friends try to pull off 5 group plans; hidden Flakes try to derail them. Pass a majority vote on the group selection and complete mission cards — but Flakes will vote against and play bail cards.
**Key file:** `js/games/bld.js`
**Brand colour:** `yellow-500` | **Active pill:** `pill-active-yellow`
**State flow:**
```
LOBBY (MDLM only) → BLD MENU
→ BLD SETUP (PTP only — MDLM skips via onPassThePhone)
→ BLD SEATING (MDLM only — random seat numbers assigned)
→ [Role reveal loop: BLD PASS GATE → BLD ROLE REVEAL (×N players)]
→ [Plan loop (5 plans):
    NOMINATING (Planner selects group) → VOTING (all vote Sounds Good / No Way)
    → (re-nominate if rejected, up to 5 attempts — Flakes win if 5th rejected)
    → MISSION CARDS (selected group plays cards: In / Bail)
    → PLAN RESULT (success or bail)
    (Drama Mode: if 3+ successes, BIG FLAKE IDENTIFICATION → DRAMA GUESS before final plan)
  ]
→ BLD AFTERMATH
```

### Terminology
| Term | Meaning |
|------|---------|
| Friends | Cooperative players — want all 5 plans to succeed |
| Flakes | Hidden saboteurs — want plans to fail |
| Pot-Stirrer | (Drama Mode) one Flake who knows the other Flakes' identities |
| Big Flake | (Drama Mode) one Flake who, if the Friends would win, gets one guess at the Pot-Stirrer — a correct guess flips the result to a Flakes win |
| The Planner | The active player who nominates the group for the current plan |
| The Group | The nominated subset of players who play mission cards |
| Mission Card | Each selected player plays "In" or "Bail" — Flakes can bail |
| Bail | Sabotage card — a bail in the group fails the plan |
| Patience Meter | Tracks how many nomination attempts remain (5 max) |
| Bailed | The game name — also used as the plan-failure verb |
| Drama Mode | Sylly Mode — adds Pot-Stirrer + Big Flake roles and identification phase |
| The Itinerary | End-of-game plan history overlay (aftermath screen) |
| Second Chances | Play again — resets all state, preserves names + settings (overlay heading "Second Chances?"; aftermath button "Second Chances 💬") |
| Leave the Chat? | Quit confirm overlay heading (confirm "Let's Bail", cancel "Not yet!") |
| The Group Chat | Setup screen eyebrow label — NOT the settings overlay title (the settings overlay title is "Bailed 💬") |

### Settings
| Setting | Options | Default | Internal variable |
|---------|---------|---------|------------------|
| Players | 5 / 6 / 7 / 8 / 9 / 10 | 5 | `bldPlayerCount` int |
| ✨ Sylly Mode (Drama Mode) | OFF / ON | OFF | `bldDramaMode` bool |

### Role Distribution (`BLD_ROLE_TABLE`)
| Players | Friends | Flakes |
|---------|---------|--------|
| 5 | 3 | 2 |
| 6 | 4 | 2 |
| 7 | 4 | 3 |
| 8 | 5 | 3 |
| 9 | 6 | 3 |
| 10 | 6 | 4 |

### Group Sizes Per Plan (`BLD_GROUP_TABLE`)
Each row = [Plan1, Plan2, Plan3, Plan4, Plan5] group sizes for that player count.

| Players | P1 | P2 | P3 | P4 | P5 |
|---------|----|----|----|----|----|
| 5 | 2 | 3 | 2 | 3 | 3 |
| 6 | 2 | 3 | 4 | 3 | 4 |
| 7 | 2 | 3 | 3 | 4 | 4 |
| 8 | 3 | 4 | 4 | 5 | 5 |
| 9 | 3 | 4 | 4 | 5 | 5 |
| 10 | 3 | 4 | 4 | 5 | 5 |

**Note:** Plan 4 with 7+ players requires 2 Bails to fail (not 1).

### Plans (`BLD_PLANS`)
In narrative sequence: Booking Accommodation 🏠 → Who's Driving 🚗 → Food Pickup 🍕 → Alcohol Run 🍾 → The Big Party 🎉

### Scoring
**There is no points or Credibility currency — BLD is pure win/loss.** `bldGameResult` is set to `'friends'` or `'flakes'`; the aftermath shows the winning team + a full role reveal. No per-player score is tracked or displayed.
- **Friends win:** 3 plans succeed (`bldSuccessCount >= 3`) — UNLESS Drama Mode is on, in which case the Big Flake gets a guess first (see below).
- **Flakes win:** 3 plans fail (`bldFailCount >= 3`) OR the 5th nomination for a single plan is rejected (patience exhausted). The fail-count win takes priority over the Friends' success-count win.
- **Drama Mode — win-flip (not a bonus):** when the Friends reach 3 successes, the result does NOT lock yet. The Big Flake gets one guess at the Pot-Stirrer's identity. **Correct guess → `bldGameResult = 'flakes'` (Flakes steal the entire win); wrong guess → `'friends'` (Friends keep the win).**

### Special Mechanics

**Nomination flow:**
- Planner (rotates by seat number) selects a group → all players vote Sounds Good / No Way
- Majority decides; ties go to Friends
- 5th rejected nomination = Flakes win immediately (Patience Meter reaches 0)

**Mission cards:**
- Only selected group members play; others watch
- Friends must play "In"; Flakes can choose "In" or "Bail"
- 1 Bail fails the plan (except Plan 4 with 7+ players: 2 Bails required)
- Cards submitted secretly, revealed simultaneously

**Drama Mode (Sylly Mode):**
- Adds the Pot-Stirrer (a Friend who knows all Flake identities) and the Big Flake (one Flake)
- When the Friends would win (reach 3 successes), `bldCheckWinCondition()` returns `false` and `bldTriggerDramaLock()` runs the identification phase (`drama-lock` sub-phase on `screen-bld-main`) instead of ending the game
- The Big Flake picks from the non-Flake players (`bld-drama-guess-list` excludes Flakes). **Guessing the Pot-Stirrer correctly flips the win to the Flakes (`bldResolveDramaGuess`); a wrong guess keeps the Friends' win.** This replaces the immediate Friends win — it is not an additive bonus.
- The Pot-Stirrer's identity is never shown to Friends during the game (revealed only on the aftermath role list)
- If the Flakes reach 3 fails first, they win outright — the drama lock never triggers

**Seat numbers:**
- **MDLM:** the host arranges seat order on `screen-bld-seating` (default = join order; ↑/↓ reorder + a "Randomise Order" button), then confirms — `bldSeatNumbers[playerIdx]` is derived from the final order. Not assigned via the lobby Assign Spots UI (`rosterConfig.type: 'none'`).
- **PTP:** seat numbers are randomly shuffled in `bldAssignRoles()` (no seating screen)
- Planner rotation follows seat order (`bldSeatOrder` / `bldAdvancePlanner`), not join order
- Displayed in header and role reveal screen in MDLM

**Fellow Flakes indicator:**
- In MDLM, Flake devices show fellow Flakes' names in the header (`#bld-header-fellow-flakes`)
- Hidden for Friends; also hidden in single-device (PTP) mode

### Overlay Types
| Overlay | Pattern | z-index | Notes |
|---------|---------|---------|-------|
| `bld-settings-overlay` | Data (slide-up) | z-[80] | Title "Bailed 💬" (NOT "The Group Chat" — that is the setup-screen eyebrow). Single card: Drama Mode (Sylly) |
| `bld-how-to-overlay` | Data (slide-up) | z-[90] | "How to Play 📋" |
| `bld-quit-overlay` | Decision modal | z-[80] | "Leave the Chat?" — mid-game quit → game menu |
| `bld-second-chances-overlay` | Decision modal | z-[90] | Play-again confirm only ("Second Chances?", opened from `#btn-bld-go-again` with dynamic MP labels). There is NO separate `bld-new-night-overlay`. (The patience-exhausted Flake win has no confirm overlay — `bldHandleRejection` goes straight to the aftermath.) |
| `bld-pass-reveal-overlay` | Decision modal | z-[90] | PTP pass-the-phone gate before voting / mission card submit |
| `bld-role-help-overlay` | Decision modal | z-[90] | Role-specific rules reference (opened from role-reveal `[?]`) |
| `bld-plan-detail-overlay` | Data (slide-up) | z-[80] | "The Receipts" — per-plan history detail (in-game itinerary + aftermath tappable tiles) |
| `bld-tip-overlay` | Decision modal | z-[90] | Shared tip overlay — `bldShowTip(emoji, heading, lines[])` drives all contextual `[?]` buttons |

### Screens
| Screen ID | Purpose |
|-----------|---------|
| `screen-bld-menu` | Main menu |
| `screen-bld-setup` | Player name entry (PTP only — MDLM skips) |
| `screen-bld-seating` | Seat number assignment display (MDLM only) |
| `screen-bld-pass-gate` | Pass-the-phone gate before role reveal |
| `screen-bld-role-reveal` | Per-player role reveal — Friends, Flakes, Pot-Stirrer, Big Flake |
| `screen-bld-main` | Main gameplay — plan tiles, patience meter, phase content |
| `screen-bld-aftermath` | End-of-game itinerary + result reveal |

### Multiplayer (Phase 30–31)
- **Mode:** MDLM only — `multiplayerOnly: true`, `supportedModes: ['mdlm']`, `recommendedMode: 'mdlm'`
- **Max players:** 10 | **Min players:** 5
- **rosterConfig:** `{ type: 'none' }` — automatic seat assignment; no manual Assign Spots UI
- **Shared screens:** `screen-mp-mode`, `screen-mp-lobby-host`, `screen-mp-lobby-join` (parameterised)
- **Post-lobby routing:** `onPassThePhone` (host) → `bldShowSeatingSetup()` directly; clients wait for `BLD_GAME_START`
- **PTP routing:** `onPassThePhone` (single) → `bldShowSetup()` for manual name entry
- **Role security:** All role arrays broadcast in `BLD_GAME_START`; each device renders only its own slot (couch security — same pattern as NAT)
- **Key ACTION packets:** `BLD_VOTE_SUBMIT` (player's vote: "Sounds Good" / "No Way"), `BLD_MISSION_SUBMIT` (player's mission card: "In" / "Bail"), `BLD_NOMINATION_CONFIRMED` (Planner locks group → Host re-broadcasts as SYNC), `BLD_DRAMA_GUESS` (Big Flake's Friend guess)
- **Key SYNC packets:** `BLD_GAME_START` (playerCount, dramaMode, flakeIndices, bigFlakeIdx, potStirrerIdx, seatNumbers, playerNames), `BLD_NOMINATION_CONFIRMED` (group + currentPlanIdx), `BLD_VOTE_RESULT` (votes + outcome), `BLD_MISSION_START` (mission card phase begin), `BLD_MISSION_RESULT` (cards + bailCount + outcome), `BLD_NEXT_NOMINATION` (advance to next nomination), `BLD_DRAMA_IDENTIFICATION` (trigger Big Flake guess phase), `BLD_AFTERMATH` (final result + planHistory)`


---

## Game 12: Pass (PASS)
**Theme:** Climbing card game (Gan Deng Yan style). Players shed cards by playing combos one rank higher than the table. Bombs override rank; Jokers act as wild cards. Last to empty their hand pays the most chips.
**Tagline:** "Shed your hand, climb the table."
**Key file:** `js/games/pass.js`
**Brand colour:** `zinc-900` (#18181b) | **Active pill:** `pill-active-zinc`
**State flow:**
```
LOBBY (MDLM only) → PASS MENU
→ PASS SEATING (host only — shows seat order before deal)
→ [Match loop:
    PASS TABLE (bidding + playing + passing)
    → PASS ROUND WRAP (chip deltas, winner, Next Round for host)
    → repeat until match over
  ]
→ PASS GAMEOVER
```

### Terminology
| Term | Meaning |
|------|---------|
| Combo | A valid group of cards played together (Single, Pair, Triplet, Quad, Sequence, Double Sequence) |
| The Table | The current combo all players must beat — `passTableCombo` |
| Bomb | A Triplet, Quad, or Double Joker — overrides any non-Bomb combo |
| Sequence | M consecutive ranks (2s excluded; min length configurable) |
| Double Sequence | N pairs of consecutive ranks (N ≥ 2 pairs; 2s excluded) |
| The Abyss | Sylly Mode: face-up central pool; grows on every Pass |
| Standard Combo | Single or Pair — keeps a trick quiet; never detonates the Abyss (even on a winning play) |
| Detonation Combo | Triplet, Quad, Double Joker, Sequence, or Double Sequence — the only combos that detonate the Abyss when they win a trick or empty a hand. Classified by `passIsDetonationCombo(combo)` (set `PASS_DETONATION_TYPES`) |
| Detonation | Sylly Mode: when a trick is **won by a Detonation Combo**, the Abyss deals clockwise to everyone but the trick winner |
| Fracture | Sylly Mode: Abyss reaches 13 cards — everyone draws |
| New Deal | Play again — resets chip stacks, preserves names + settings |
| Walk Away | Quit during a match |
| The House Rules 🃏 | Settings overlay title |

### Settings
| Setting | Options | Default | Internal variable | Internal values |
|---------|---------|---------|------------------|-----------------|
| Starting Hand | 5 / 6 / 7 | 5 | `passHandSize` | int |
| Chip Stack | 50 / 100 / 150 | 100 | `passChipStack` | int |
| Match Length | 5 / 10 / Endless | 5 | `passMatchDuration` | `'5'` / `'10'` / `'endless'` |
| Bomb Rules | Standard / Heavy | Standard | `passBombStrictness` | `'standard'` / `'heavy'` |
| Minimum Sequence | 3 / 4 / 5 | 3 | `passMinSequenceLength` | int |
| Jokers | None / 2 / 4 | 2 | `passJokerCount` | int |
| Mid-Game Draw | OFF / ON | OFF | `passMidGameDraw` | bool |
| Sky Joker | OFF / ON | OFF | `passSkyJokerVariant` | bool |
| Open Climbing Mode | OFF / ON | OFF | `passOpenClimbing` | bool |
| ✨ Sylly Mode (The Abyss) | OFF / ON | OFF | `passSyllyMode` | bool |

### Scoring
| Outcome | Who scores | Chips |
|---------|-----------|-------|
| Round winner (emptied hand) | Winner | +sum of all penalties |
| Holding 13+ cards | Loser | −handLength × 3 |
| Never played a card | Loser | −handLength × 2 |
| Played at least once | Loser | −handLength × 1 |

### Special Mechanics

**Rank hierarchy:** 3 < 4 < 5 < 6 < 7 < 8 < 9 < 10 < J < Q < K < A < 2 < Joker (< Sky Joker)
- 2s are NOT part of sequences; they beat any non-2 single/pair of their type but still must be +1 relative to K/A pairs when climbing rank-to-rank
- Single Joker: only playable as your very last card on an open table (Sky Joker OFF); or freely as solo/combination (Sky Joker ON)
- Double Joker: absolute max Bomb — nothing beats it

**Climb rule:** Every valid play must be exactly one rank higher than `passTableCombo.rank` (except 2s and Jokers as described above; Bombs override this entirely). **Open Climbing Mode** (`passOpenClimbing`, default OFF) relaxes this to *any strictly-higher* rank of the same combo type — the same-type and sequence-length checks still apply; Bombs, 2s and Sky Joker are unaffected (resolved before the climb gate).

**Two-Natural-Card Anchor:** Sequences and Double Sequences with Jokers require at least 2 natural (non-Joker) cards. A combo of 1 natural + 3 Jokers is invalid.

**Full-circuit pass:** If all players pass without anyone playing, the table clears (`passTableCombo = null`); the last player to lead plays again on an open table.

**Seat order:** Join order = seat order. Host = seat 1. No shuffle. Deliberate design: no hidden roles, so join order is fair and predictable.

**Starting the match (round 1 only):** The holder of the single lowest card leads round 1 — the **3♦** (lowest rank; ties break by suit ♦<♣<♥<♠, so 3♦ is the absolute lowest). The leader's opening combo **must contain that card** (`passMandatoryCard`, set in `passFindLeader()`, broadcast in `PASS_GAME_START`, enforced in `passSubmitPlay` + the host `PASS_PLAY_SUBMIT` handler; auto-clears once `passHasPlayedCard` shows anyone has played). The suit ranking is for the starting-player tie-break ONLY — never in play comparison. Rounds 2+: the previous round's winner leads with anything (`passMandatoryCard = null`).

**Sylly Mode — The Abyss:** *(RESOLVED June 2026 — detonation gated on combo class: only a **Detonation Combo** detonates. See `pass-implementation-notes.md` BUG-01.)*
- Every Pass feeds one card from the draw deck face-up into `passAbyss[]`
- **Detonation is gated on the winning combo's class** via `passIsDetonationCombo()`. A **Standard Combo** (Single/Pair) that wins a trick or empties a hand never detonates — the pool stays quiet and persists. Three triggers:
  1. **Trick clears** (full-circle pass — everyone passes since the last play) **AND the winning combo is a Detonation Combo**: `passProcessPass()` detonates, exempting the trick winner (`passTableLeaderIdx`; the winning combo `passTableCombo` is captured before both are reset). Folded into the single `PASS_TURN_RESULT` (`tableCleared:true`) packet via a new `abyssDraft: {order, cards}` field — no separate packet, no pause (trick-clear is frequent). A trick won by a Standard Combo sends `PASS_TURN_RESULT` with no `abyssDraft`.
  2. **Round win** (`hand.length === 0`) **by a Detonation Combo**: `passProcessPlay()` detonates (winner exempt), distributing **before scoring**, then broadcasts `PASS_ABYSS_DRAFT` (`trigger:'round-win'`) with a 2 s reveal pause before `PASS_ROUND_END`. A Single/Pair finish ends the match peacefully — no draft.
  3. **Fracture** (Abyss reaches 13): `passHandleAbyssFracture()` → `PASS_ABYSS_DRAFT` (`trigger:'fracture'`); no one is exempt, combo class irrelevant.
- `passResolveAbyssDetonation(exemptIdx)` deals one card per non-exempt player clockwise (starting after `exemptIdx`); any surplus beyond one-per-player stays in `passAbyss`.
- Abyss reaches 13 → Fracture: all players draw one card clockwise; Abyss then continues from next pass
- Abyss cards are rendered in a horizontal scroll strip above the hand (inline — not an overlay; DYB BUG-05 ghost-interceptor lesson applied)

### Overlay Types
| Overlay | Pattern | z-index | Notes |
|---------|---------|---------|-------|
| `pass-settings-overlay` | Data (slide-up) | z-[80] | "The House Rules 🃏" |
| `pass-how-to-overlay` | Data (slide-up) | z-[90] | How to Play |
| `pass-quit-overlay` | Decision modal | z-[80] | "Walk Away?" |
| `pass-new-deal-overlay` | Decision modal | z-[90] | "New Deal?" — play-again confirmation |

### Multiplayer (Phase 32)
- **Mode:** MDLM only — `multiplayerOnly: true`, `supportedModes: ['mdlm']`, `recommendedMode: 'mdlm'`
- **Min players:** 3 | **Max players:** 6
- **rosterConfig:** `{ type: 'none' }` — automatic seat assignment (join order)
- **Shared screens:** `screen-mp-mode`, `screen-mp-lobby-host`, `screen-mp-lobby-join` (parameterised)
- **Roll privacy:** Each device holds its own hand (`passHands[mpMyPlayerIdx]`). Opponent hands are placeholder arrays of correct length — never sent to wrong devices.
- **Key ACTION packets:** `PASS_PLAY_SUBMIT` (card indices → host validates), `PASS_PASS_SUBMIT` (player passes → host processes), `PASS_PLAYER_LEFT` (client quit → host dissolves match)
- **Key SYNC packets:** `PASS_GAME_START` (hands + chips for new round — **re-broadcast at the start of every round**, not just round 1: the host's "Next Round" → `passStartRound()` always sends it), `PASS_TURN_RESULT` (table state after every play/pass; on a trick-clear in Sylly Mode it also carries `abyssDraft: {order, cards}` — the trick-clear detonation is folded into this packet, with each device adding its own drafted card to its hand), `PASS_ABYSS_DRAFT` (Sylly Mode round-win/fracture draft — `trigger` field carries `'round-win'` or `'fracture'`; trick-clear detonation rides on `PASS_TURN_RESULT.abyssDraft` instead), `PASS_ROUND_END` (chip deltas + winner; carries `matchOver`/`finalChips`/`roundsWon` → drives the gameover transition directly), `PASS_MATCH_DISSOLVED` (player left → all devices `resetToLobby()`)
- **Defined-but-unused SYNC handlers (audit [BUG], June 2026):** `PASS_NEXT_ROUND` and `PASS_GAMEOVER` have handler branches in `passHandleEnvelope` but are **never broadcast** by any code path. Rounds 2+ reuse `PASS_GAME_START`; gameover is reached via `PASS_ROUND_END` with `matchOver: true`. `PASS_NEXT_ROUND` was the intended per-round packet — its absence is the root cause of the `passRoundsWon` client-reset bug (see `pass-implementation-notes.md` BUG-02).
- **Mid-game quit dissolves the room (note, June 2026):** unlike GTH/DYB/BLD (which navigate to the game menu and leak the Firebase room), PASS's quit-confirm broadcasts `PASS_MATCH_DISSOLVED` (host) / sends `PASS_PLAYER_LEFT` (client) and calls `resetToLobby()`. One client leaving therefore dissolves the whole match for everyone — PASS does not tolerate a mid-match drop. This is the most correct teardown of the four MDLM games but deviates from the universal "✕ → game menu" rule (it goes straight to lobby). Candidate for a cross-game standardisation rule.

---

## Game 13: Net-Trace (NT)
**Theme:** Network engineering / cybersecurity. Each player hardens their own relay-leg node by placing firewall and honeypot components; a BFS simulation routes packets and reveals each player's Signal Error Rate (SER).
**Tagline:** "Harden your node. Route the signal."
**Key file:** `js/games/nt.js`
**Brand colour:** `emerald-600` | **Active pill:** `pill-active-emerald`
**State flow:**
```
LOBBY (MDLM only) → NT MENU
→ NT SETUP (node generation + preview — host deals)
→ [Cycle loop:
    [PTP: NT HANDSHAKE (pass-gate) → NT BUILD (hardening + countdown) → repeat per player]
    [MDLM standard: all players harden simultaneously → NT WAITING (standby)]
    [MDLM DNP: NT ALLOCATION (captain huddle) → all players harden simultaneously → NT WAITING]
    → NT PLAYBACK (BFS canvas animation + SER reveal)
    → NT RESULTS (per-cycle SER leaderboard)
  ]
→ NT GAMEOVER (final SER rankings across all cycles)
```

### Terminology
| Term | Meaning |
|------|---------|
| Relay-Leg Node | A player's section of the network topology — the segment they own and harden |
| Hardening | The act of placing firewall/honeypot components on a relay-leg node to reduce SER |
| SER | Signal Error Rate — latency as a percentage of the max (or cluster ceiling in DNP); lower = better |
| Firewall | Defensive component — reduces base latency on a path segment |
| Honeypot | Deceptive component — reduces latency on a path segment; different tradeoffs from firewall |
| BFS | Breadth-first search — the traversal algorithm that simulates packet routing across all nodes |
| The Cluster Ceiling | DNP scoring: Σ of per-leg max(teamA_latency, teamB_latency) across all matched legs |
| Player SER | Standard: `latency / maxLatency × 100`; DNP: `latency / clusterCeiling × 100` |
| Team SER | DNP: `Σ team_latencies / clusterCeiling × 100` |
| Hardening Window | The countdown timer for each player's build phase (`ntHardeningWin` seconds) |
| Huddle Timer | DNP allocation phase timer: `ntHardeningWin × teamSize` seconds |
| Shared Allocation Hub | DNP pre-hardening screen — team captain distributes a pool across all relay legs |
| Team Pool | DNP: combined firewall + honeypot budget shared across one team's legs |
| DNP | Devil's Network Protocol — Sylly Mode name; two teams compete on matched relay legs |
| New Trace | Play again — resets all state, preserves names + settings |
| Drop Connection? | Quit overlay heading |
| Network Config ⚙️ | Settings overlay title |

### Settings
| Setting (display) | Options | Default | Internal variable | Internal values |
|------------------|---------|---------|------------------|-----------------|
| Routing Cycles | 3 / 5 | 3 | `ntCycles` | int |
| Hardening Window | 45s / 60s / 90s / No Limit | 90s | `ntHardeningWin` | int — `0` = no limit (shows ∞, no auto-commit) |
| Component Density | Minimal / Standard / Heavy | Standard | `ntComponentDensity` | `'minimal'` / `'standard'` / `'heavy'` |
| ✨ Sylly Mode (Devil's Network Protocol) | OFF / ON | OFF | `ntSyllyMode` | bool |

Player count (`ntPlayerCount`, default 4) is set from the lobby roster in MDLM (lobby min 2, max 8) or on `screen-nt-setup` in PTP — not in the settings overlay. DNP/Sylly requires two teams (min 4).

### Special Mechanics

**Node generation:**
- `ntGenerateNode(opts)` builds a relay-leg node with `paths[]` (BFS edges) and `placeholders[]` (component slots)
- `opts.keepInventory = true` — DNP batch mode: first call sets the team's shared inventory; subsequent N-1 calls regenerate geometry only, preserving the same inventory object
- `ntTeamNodes[playerIdx]` stores each player's own node geometry for per-player BFS simulation

**BFS simulation:**
- `ntComputeTimeline_local()` traverses `ntNode` using `ntMyPlacements` — returns an ordered array of latency contributions
- `ntResolveCycleMdlm(allPlacements)` runs `ntComputeTimeline_local()` for every player by temporarily swapping `ntNode` and `ntMyPlacements` per player, then restoring the saved values

**DNP scoring — Cluster Ceiling:**
- For each matched leg n: `ceiling_n = max(teamA_leg_n.latency, teamB_leg_n.latency)`
- `clusterCeiling = Σ ceiling_n` across all matched legs
- `playerSER_n = player_latency / clusterCeiling × 100`
- `teamSER = Σ team_latencies / clusterCeiling × 100`
- Stored in `ntTeamCycleSERs[cycle][team]` for the gameover screen

**Shared Allocation Hub (DNP):**
- Shows before hardening begins each cycle
- Each team's captain (per `ntCaptainSlots[team]`) drives **their own** team's hub; the other team's captain drives theirs independently. Both `ntTeamIdx` and `ntCaptainSlots` are populated on host AND clients from `window.mpLobbyRoster` in NT's `onPassThePhone` (an empty client branch was the root cause of BUG-09: clients had no team/captain → empty hub, no second captain, stuck-on-lock)
- **Cluster bridge** at the top of the hub: a horizontal-scroll row of per-leg mazes (player name above each), drawn edge-to-edge by `ntBuildBridgeInto` → `ntDrawLegCanvas`. DNP node generation chains each leg's egress row to the next leg's ingress row (`ntGenerateNode(keepInventory, forcedIngressIdx)`), so neighbouring legs connect only through the green-ingress ▸ amber-egress channel; the rest of each shared edge is walled off in bad-sector grey. Tap the bridge to open the enlarged `nt-bridge-preview-overlay`. Shown to captains AND non-captains
- **Allocation = rebalance, not from-scratch:** every leg starts at its BASE inventory (sum = pool, transfer pool 0). Captains shift firewalls/honeypots between legs via [−]/[+]; doing nothing plays every leg at base (skippable — preserves flow). The transfer-pool counter is grouped in the captain-only "Rebalance Cluster" card with the controls
- Non-captain: bridge only (no allocation controls — removed as clutter; they can't see live updates anyway). "Lock Allocation" CTA commits (captain only)
- Huddle timer: `ntHardeningWin × teamSize` seconds; auto-locks on expiry via `ntCommitAllocation()`
- If captain locks before timer expires, `ntCheckBothTeamsLocked()` cancels the timer and broadcasts `NT_BUILD_BEGIN` immediately when both teams are locked
- Unallocated-pool warning: tapping Lock with remaining budget flashes `#nt-alloc-warning` via `nt-flash-warning` CSS animation; allocation still commits

**Host captain self-send guard:**
- The `engine-multiplayer.js` dedup guard drops envelopes where `originId === syllyDeviceUid`
- Host captain must update `ntTeamWorkingAllocs[myTeam]` directly and call `ntBroadcastAllocationSync()` — never send `NT_ALLOCATION_UPDATE` ACTION to itself

**Build timer — wall-clock anchor (GTH pattern):**
- Host computes `endTimestamp = Date.now() + (ntHardeningWin * 1000)` at gate-tap time
- `NT_BUILD_BEGIN` carries `endTimestamp`; all devices call `ntStartBuildTimer(endTimestamp)` from the received value — no drift possible

**Mid-game quit — PASS contract:**
- Host quit: `resetToLobby()` broadcasts `HOST_END_GAME`; all clients receive disconnect overlay
- Client quit: sends `NT_PLAYER_LEFT` ACTION → host broadcasts `NT_MATCH_DISSOLVED` → all devices `resetToLobby()`
- One client leaving dissolves the entire match

### Overlay Types
| Overlay | Pattern | z-index | Notes |
|---------|---------|---------|-------|
| `nt-settings-overlay` | Data (slide-up) | z-[80] | "Network Config ⚙️" |
| `nt-how-to-overlay` | Data (slide-up) | z-[90] | How to Play |
| `nt-quit-overlay` | Decision modal | z-[80] | "Drop Connection?" — mid-game quit |
| `nt-new-trace-overlay` | Decision modal | z-[90] | "New Trace?" — play-again confirmation |
| `nt-bridge-preview-overlay` | Custom (full-screen tap-to-close) | z-[95] | DNP only — enlarged cluster-bridge preview (all legs ingress ▸ egress); opened by tapping the inline bridge on the Shared Allocation Hub |

### Screens
| Screen ID | Purpose |
|-----------|---------|
| `screen-nt-menu` | Main hub |
| `screen-nt-setup` | Node generation preview — host deals and shows all players their relay-leg |
| `screen-nt-handshake` | Pass-the-phone gate before each player's hardening turn (PTP only) |
| `screen-nt-allocation` | DNP Shared Allocation Hub — captain distributes team pool across legs |
| `screen-nt-build` | Hardening screen — player places components on their relay-leg node |
| `screen-nt-waiting` | Passive standby — shown while other players are hardening (MDLM) |
| `screen-nt-playback` | Animated BFS traversal canvas + per-player latency/SER comparison panel |
| `screen-nt-results` | Per-cycle SER leaderboard |
| `screen-nt-gameover` | Final report — SER rankings across all cycles |

### Multiplayer (Phase 33)
- **Mode:** PTP + MDLM — `multiplayerOnly: false`, `supportedModes: ['ptp', 'mdlm']`, `recommendedMode: 'mdlm'`. PTP (single-device) is locked when DNP/Sylly Mode is on, via `getLockedModes()` (DNP requires teams). *(Reconciled to shipped code — Protocol C, June 2026; this subsection previously read "MDLM only / `['mdlm']` / min 3", which contradicted both the config and NT's own PTP state-flow + `screen-nt-handshake`.)*
- **Min players:** 2 (`getMinPlayers → 2`, Standard) / 4 for DNP (two teams) | **Max players:** 8 (`getMaxPlayers → 8`)
- **rosterConfig:** `type` is a **function** — `'teams'` (with `hasCaptain`) when DNP/Sylly is on, else `'none'` (automatic seat assignment, join order)
- **Shared screens:** `screen-mp-mode`, `screen-mp-lobby-host`, `screen-mp-lobby-join` (parameterised); PTP additionally uses the `screen-nt-handshake` pass-gate per player
- **Post-lobby routing:** `onPassThePhone` (host, MDLM) → `screen-nt-menu` (Play CTA then starts the session); (single/PTP) → `ntShowSetup()`; clients wait for `NT_GENERATE`
- **Hardening privacy:** Each device hardens its own node locally. Placements are not broadcast until `NT_PLACEMENT_SUBMIT` ACTION at end of hardening window.
- **DNP team assignment:** `ntTeamIdx[playerIdx]` and `ntCaptainSlots[team]` populated from `mpLobbyRoster` in `onPassThePhone`. Team captains are the `rosterConfig.captainSlots` values.
- **Mid-game quit dissolves the room:** same PASS contract — host `HOST_END_GAME` / client `NT_PLAYER_LEFT` → host `NT_MATCH_DISSOLVED` → all `resetToLobby()`
- **Key ACTION packets:** `NT_PLACEMENT_SUBMIT` (player's final placements → host), `NT_PLAYER_LEFT` (client quit → host dissolves), `NT_ALLOCATION_UPDATE` (client captain live adjustment → host), `NT_ALLOCATION_LOCK` (client captain commits allocation → host)
- **Key SYNC packets:** `NT_GENERATE` (all player nodes + initial inventory; DNP: includes `isDNP`, `allPlayerNodes`, `teamIdx`, `captainSlots`), `NT_HUDDLE_START` (DNP allocation phase — carries `allPlayerNodes`, `teamIdx`, `captainSlots`, `teamPools`, `cycle`), `NT_ALLOCATION_SYNC` (live captain adjustments — both teams' working state), `NT_BUILD_BEGIN` (both teams locked — carries `endTimestamp`; all devices start hardening simultaneously), `NT_PLAYBACK` (all timelines + latencies + SERs; DNP: includes `teamCycleSERs`), `NT_RESULTS` (per-cycle SER leaderboard), `NT_GAMEOVER` (final rankings), `NT_MATCH_DISSOLVED` (player left → all `resetToLobby()`)

---

## Game 14: Fruit Salad (FRT)
**Theme:** Cockroach Poker-style bluffing. Players pass a face-down fruit card to someone and declare a fruit name — the receiver must call True or False, or peek and pass it on. Each fruit has a personality in Sylly Mode.
**Tagline:** "This is definitely a banana. Trust me." 🍌
**Key file:** `js/games/frt.js`
**Brand colour:** Banana `#FFC700` (fill) + white ink on banana + leaf `#047857` (text-on-white) — three-token palette, same custom exception as GTH sage. | **Active pill:** `pill-active-frt` (custom CSS — no Tailwind class)
**State flow:**
```
LOBBY (MDLM only) → FRT MENU → [onPassThePhone: host deals]
→ [Session loop (frtRounds Fruit-Offs):
    FRT TABLE (serving → await-response → challenge-reveal, all within screen-frt-table)
    → [ROUND END: token award; next Fruit-Off or GAMEOVER]
  ]
→ FRT GAMEOVER
```

### Terminology
| Term | Meaning |
|------|---------|
| Fruit Salad | The overall game |
| Fruit-Off | One round (deck dealt fresh per Fruit-Off) |
| The Stash | A player's hidden hand of fruit cards |
| The Bowl | A player's face-up penalty pile (fruits they lost challenges with) |
| Fruit Loop | Elimination trigger — accumulating 4 of the same fruit in your Bowl (5 in the Pear-Off duel) |
| Serving | The act of passing a card face-down with a (possibly false) declaration |
| Peek & Pass | Option to secretly look at the card before passing it on to someone else |
| True / False | The challenge — True = you believe the declaration; False = you call bluff |
| Fruit Tokens | Score currency — cumulative across all Fruit-Offs in a session |
| Pristine | Surviving a Fruit-Off with 0 bowl cards — earns +10 tokens |
| Survived | Surviving with ≥1 bowl card — earns +5 tokens |
| Fruit Looped | Being eliminated (4th same-fruit; 5th in duel) — earns 0 tokens |
| The Silver Lining | Session bonus (+2 tokens) for the player(s) with the most correct True/False calls across the whole session (`frtBluffWins`) |
| Fruit Master | The "Silver Lining" badge displayed on the gameover screen |
| Fruity Personalities | Sylly Mode name — each fruit gains a rule-breaking ability |
| Think Before You Fruit | Turn timer setting name |
| Pear of Fruits | 2-player auto-duel variant (engaged when lobby = 2 players) |
| Pear-Off | Informal name for the duel (5-fruit elimination threshold; no Peek & Pass; Sylly mutually exclusive) |
| Fruit Selection 🍌 | Settings overlay title |
| Fruit Journal 📋 | Pass-off log overlay (one entry per resolved serving per Fruit-Off) |
| Orange You Glad It's Over? 🍊 | Gameover screen heading |
| More Fruit? | Play-again overlay heading |

### Fruit Personalities (Sylly Mode — Fruity Personalities)
| Fruit | Category | Personality |
|-------|----------|-------------|
| Smug Banana 🍌 | A | Wrong challenge on a Banana → challenger's penalty; server keeps initiative |
| Sour Lemon 🍋 | A | Lose with a Lemon → your challenger flips one random card from their own stash |
| Charming Peach 🍑 | A | A Peach lands in a Bowl → the challenger must flip one of their own Peaches (if held) |
| Dramatic Grape 🍇 | A | A Grape flips → whoever holds the most hidden Grapes flips one (ties: all of them) |
| Chill Watermelon 🍉 | B | A public counter shows how many Watermelons each player is hiding |
| Sus Pear 🍐 | C | Peek and find a Pear → pocket it and swap any card from your stash before passing on |
| Panicked Strawberry 🍓 | C | Serving a Strawberry has a 25% chance to panic — it auto-reveals into your own Bowl |
| Angry Apple 🍎 | C | An Apple flips → the loser must serve the winner next, and that target cannot Peek |

Category A = resolution-trigger (fires on a lost challenge); B = passive (always active); C = interaction (fires on serve/peek).

### Settings
(Reality-synced June 2026 — display names + internals from `index.html` / `frt.js`.)

| Setting (display) | Options | Default | Internal variable | Internal values |
|------------------|---------|---------|------------------|-----------------|
| Fruit Stock | Standard (8 each) / Swift (6 each) / Mega Salad (10 each) | Standard | `frtFruitStock` | `'standard'` / `'swift'` / `'mega'` |
| Fruit-Offs | 1 / 3 / 5 | 3 | `frtRounds` | int |
| Think Before You Fruit (timer) | Off / 15s / 30s / 60s | Off | `frtTurnTimer` | `0` / `15` / `30` / `60` |
| Pear-Off (1v1 duel) | OFF / ON | OFF | `frtPearOff` | bool — auto-engaged at 2 players; mutually exclusive with Sylly |
| ✨ Sylly Mode (Fruity Personalities) | OFF / ON | OFF | `frtSyllyMode` | bool — disabled at 2 players |

**Settings overlay title:** "Fruit Selection 🍌" · Subtitle: "Stock the salad before the first serve."

**No difficulty setting** — FRT uses a fixed `FRT_FRUITS` constant, not `words.json`. Exempt per the non-word-bank carve-out (`logic-engine.md` PWA Guardian checklist). Fruit Stock is the velocity dial.

### Scoring
| Outcome | Who | Fruit Tokens |
|---------|-----|-------------|
| Fruit Looped (eliminated) | Eliminated player(s) | 0 |
| Pristine (0 bowl cards) | Survivor with empty bowl | +10 |
| Survived (≥1 bowl card) | All other survivors | +5 |
| The Silver Lining (gameover bonus) | Player(s) with most correct True/False calls (`frtBluffWins`) | +2 (all tied for lead) |

### Overlay Types
| Overlay | Pattern | z-index | Notes |
|---------|---------|---------|-------|
| `frt-settings-overlay` | Data (slide-up) | z-[80] | "Fruit Selection 🍌" |
| `frt-how-to-overlay` | Data (slide-up) | z-[90] | How to Play |
| `frt-quit-overlay` | Decision modal | z-[80] | "Put the fruits down?" |
| `frt-new-game-overlay` | Decision modal | z-[90] | "More Fruit?" — play-again confirm |
| `frt-tip-overlay` | Decision modal | z-[90] | Shared contextual tips — `frtShowTip(emoji, heading, lines[])` |
| `frt-log-overlay` | Data (slide-up) | z-[90] | "Fruit Journal 📋" — per-serving pass-off log for the current Fruit-Off |

### Screens
| Screen ID | Purpose |
|-----------|---------|
| `screen-frt-menu` | Main hub |
| `screen-frt-deal` | Transient deal interstitial (static placeholder — polish deferred post-launch) |
| `screen-frt-table` | Main play — all serving/await/reveal/round-end sub-states; spectator standby for non-active devices |
| `screen-frt-gameover` | Final token totals + Silver Lining leaderboard |

**No `screen-frt-setup`** — names come from the lobby roster. **No pass-gate** — MDLM, each player on own device.

### Special Mechanics

**`frtRenderCard(fruitId, opts)` — asset-pack render seam:**
All card DOM goes through this single function. Game logic and packets deal only in `fruitId` (0–7 stable integers). `FRT_FRUITS[id].emoji` is the v1 "skin". A future image pack changes only this function's body — zero packet or logic churn.

**Pear-Off (2-player duel):**
`frtIsDuel()` = `frtPlayerCount === 2` — auto-engaged, no toggle. Differences: 5-card elimination threshold (not 4), no Peek & Pass (`frtLegalPeekTargets()` returns `[]` in duel), Sylly Mode is mutually exclusive.

**`frtLegalPeekTargets()`:**
Returns array of valid pass-to indices for Peek & Pass. Excludes self and any player already in `frtPassHandledBy` (avoids re-peeking an infinite loop). Returns `[]` in duel.

**Firebase empty-array guard — `frtNorm2D(raw, n)`:**
Firebase strips empty arrays and holes from 2D arrays. `frtNorm2D` rebuilds a length-n 2D array with `[]` for any missing entries. Applied to every received `stashes`/`bowls`. `FRT_DEAL` skips sending bowls entirely (reconstructed empty client-side). (Same trap as GTH/PASS.)

**Single-pass Sylly resolver:**
`frtSyllyResolve(fruit, loserIdx, callerIdx, callerCorrect)` dispatches on `fruit.cat` (A/B/C). Category-A abilities are isolated functions (`frtSyllyLemon`/`frtSyllyPeach`/`frtSyllyGrape`). The invariant: one primary flip fires its trigger once → forced secondary flips push to bowls but fire nothing → one `frtComputeEliminated()` call after. Cascades are structurally impossible.

**Turn timer (GTH wall-clock pattern):**
Host computes `endTimestamp` at each timed-phase entry and carries it in `FRT_DEAL`/`FRT_SERVED`/`FRT_CONTINUE`. All devices call `frtStartTurnTimer(endTimestamp)` from the received value — no drift. Host-only on expiry (`frtTimerExpire` → auto-serve truthful / auto-call TRUE).

### Colour exception note (mirrors GTH sage)
Banana `#FFC700` has no Tailwind utility class. Three custom CSS classes added to `css/styles.css`: `pill-active-frt` (bg `#FFC700`, text `white`), `game-toggle-on-frt` (bg `#FFC700`), `frt-range` (fill `#FFC700`). Primary CTA buttons and the how-to close button use inline `style="background:#FFC700"` + `text-white`. Text-on-white accent uses leaf `#047857` (Tailwind `text-emerald-700`). Settings button uses light-tint `bg-[#FFF4CC] hover:bg-[#FFE9A6] text-[#854d0e]`. Decision-modal border: `border border-[#FFE9A6]`.

### Multiplayer (Phase 34)
- **Mode:** MDLM only — `multiplayerOnly: true`, `supportedModes: ['mdlm']`, `recommendedMode: 'mdlm'`
- **Min players:** 2 | **Max players:** 8
- **rosterConfig:** `{ type: 'none' }` — automatic seat assignment (join order)
- **Shared screens:** `screen-mp-mode`, `screen-mp-lobby-host`, `screen-mp-lobby-join` (parameterised)
- **Post-lobby routing:** `onPassThePhone` (host) → `frtStartSession()` directly (deals + broadcasts `FRT_DEAL`); clients wait for `FRT_DEAL`
- **Card privacy (couch security):** `frtPassFruit` (true card ID) is host-owned and masked client-side. `FRT_SERVED` broadcasts fruit to all devices, but each device only renders what its role permits. True card identity rides in the public room node — same accepted model as NAT/SS/BLD. Sufficient for a same-room couch game.
- **Host-as-participant:** Host is also a player. Serve/call/peek-pass from the host device run `frtHostProcessServe`/`frtHostResolveChallenge`/`frtHostProcessPeekPass` directly — never via self-sent ACTION (dedup guard drops `originId === syllyDeviceUid`).
- **Mid-game quit dissolves the room:** same PASS/NT contract — host `HOST_END_GAME` / client `FRT_PLAYER_LEFT` → host `FRT_MATCH_DISSOLVED` → all `resetToLobby()`
- **Key ACTION packets:** `FRT_SERVE` (client server → host: card + declaration + target), `FRT_CALL` (client receiver → host: True/False verdict), `FRT_PEEK_PASS` (client peeking receiver → host: new target + declaration + optional Sus Pear swap), `FRT_PLAYER_LEFT` (client quit)
- **Key SYNC packets:** `FRT_DEAL` (host → all: stashes + activePlayer + roundNum + session state + turnEndTs; bowls reconstructed empty client-side), `FRT_SERVED` (card in flight: fruit/declaration/from/to/handledBy/stashes/turnEndTs), `FRT_REVEAL` (resolution: reveal object + bowls + stashes + bluffWins), `FRT_CONTINUE` (next server: activePlayer/stashes/bowls/appleLock/turnEndTs), `FRT_ROUND_END` (token award: eliminatedSet/scores/bowls/roundNum/gameOver/opener), `FRT_GAMEOVER` (final: scores + silver), `FRT_MATCH_DISSOLVED` (player left → all resetToLobby)`

---

## Game 15: Counting Sheep (SHP)
**Theme:** Sleepy bedtime / dream logic. An O'NO-99-style climbing/survival card game — keep the Herd at or below the fence (99); whoever can't is dragged into Deep Sleep and loses a Moon.
**Tagline:** "Stay awake. Pass the herd."
**Key file:** `js/games/shp.js`
**Brand colour:** Moonlit indigo (`indigo-600` primary / `indigo-700` hover — native Tailwind) | **Active pill:** `pill-active-indigo` | **Toggle ON:** `game-toggle-on-indigo` | **Range:** `shp-range`
**Data:** fixed `SHP_CARDS` (17 types incl. id 13 Fogged Dream phantom; ids 14/15/16 = Counting-Backwards −1/−2/−5) + `SHP_DECK_COUNTS` (73-card deck, ≈66% pasture) + `SHP_NIGHTMARES` (5, weighted) — no `words.json`; exempt from the word-difficulty setting (Hand Size is the velocity dial).
**State flow:**
```
LOBBY (MDLM only) → SHP MENU → [onPassThePhone: host deals]
→ [Night loop: SHP TABLE (your-turn / waiting / sleepwalker spectator / Nightmare Lottery / Deep-Sleep banner)
    → Deep Sleep (−1 Moon, redeal) repeats until one player remains]
→ SHP GAMEOVER (Daybreak)
```
Sylly Mode (Night Terrors) adds an oscillating **Climb ⇄ Plunge** mode *within* `screen-shp-table` — no new screen.

### Terminology
| Term | Meaning |
|------|---------|
| The Herd | Running count (target ≤ 99) |
| The Flock / Your Pen | Draw pile / a player's hand |
| Moons | Lives (−1 per Deep Sleep) |
| Deep Sleep | Crash (no legal line or busted gamble) → −1 Moon + full redeal |
| Sleepwalker | Eliminated player (0 Moons) — haunts the dream via the Nightmare Meter |
| Nightmare Meter / Lottery | Charges per Pasture card; fills → 3 face-down nightmares, flip one blind |
| The Plunge | Night Terrors inverted descent phase |
| Daybreak | Game over — last awake wins |
| Another Night? | Play again · **Tuck In?** quit · **Bedtime Routine 🌙** settings title |

### Card families (`SHP_CARDS`)
- **Pasture** (`add`): +1/+2/+5/+10 (doubled while Herd < 50 if Dream Acceleration; +`shpEcho` under Global Echo). *Charges the meter.*
- **Pillow:** Doze (skip), Toss & Turn (reverse), Counting Backwards −1/−2/−5/−10 (`subtract`, floored 0; faces show "−N", inspect modal names them "Counting Backwards −N"), Lullaby (set 20, 1-of).
- **Alarm:** Skip a Few (random +2..+12 gamble), Black Sheep (set 99), Wide Awake (next turn → leader), Heavy Eyelids (next player plays two).
- **Trap:** Big Bad Wolf — consumed on draw, shrinks the cap by 1 (restored on redeal).
- **Phantom (id 13):** Fogged Dream — conjured by the Fog nightmare; hidden random +2..+12, cursed render; dissolves on play/redeal.

### Settings
| Setting (display) | Options | Default | Internal variable | Values |
|-------------------|---------|---------|------------------|--------|
| Hand Size | 3 / 4 / 5 | 4 | `shpHandSize` | int |
| Moons | 3 / 5 / 7 | 3 | `shpMoons` | int |
| Dream Acceleration | OFF / ON | ON | `shpDreamAccel` | bool — doubles number cards under 50 |
| Sleepwalkers | OFF / ON | ON | `shpSleepwalkers` | bool — ghost / Nightmare-Meter system |
| ✨ Sylly Mode (Night Terrors) | OFF / ON | OFF | `shpSyllyMode` | bool — Climb ⇄ Plunge |

### Scoring / Win
No points — survival is the score. Deep Sleep costs a Moon; 0 Moons → Sleepwalker (appended to `shpElimOrder`). Last awake wins; standings = `[winner, ...elimOrder.reversed()]`.

### Special Mechanics
- **Legality:** no card keeping Herd ≤ `shpCeiling` (or no safe two-card combo under Heavy Eyelids) → auto Deep Sleep on turn entry. Random-adds are always tappable gambles.
- **Ghost system:** Pasture-triggered meter (only once a Sleepwalker exists) → next Sleepwalker (rotation) flips one of 3 weighted face-down nightmares; the table gates on the pick; the effect fires at the turn-gate. Five: Cold Feet (±1..4), Restless Leg (reverse/skip), **Fog** (rare cursed-card swap), Sleep Paralysis (forced two-card), Global Echo (+2 Pasture until next disruption).
- **Night Terrors (Plunge):** Herd ≥ 99 in Climb → Plunge with **overflow runway** (`shpCeiling = shpHerd`); arithmetic sign-flips. After a one-cycle grace the ceiling falls by a **round-based escalating drop** (`SHP_DROP_BASE` 2 + `SHP_DROP_STEP` 2 per full round of turns — locked per round so every player faces the same hazard; `shpCurrentDrop` synced for display). Bust → Deep Sleep + revert to Climb; Herd 0 → mercy exit (no Moon). Crimson re-skin + inverted faces; header reads "The Dream is Collapsing 🔻".

### Overlay Types
| Overlay | Pattern | z-index |
|---------|---------|---------|
| `shp-settings-overlay` | Data (slide-up) | z-[80] |
| `shp-how-to-overlay` | Data (slide-up) | z-[90] |
| `shp-quit-overlay` | Decision modal | z-[80] |
| `shp-new-night-overlay` | Decision modal | z-[90] |
| `shp-tip-overlay` | Decision modal | z-[90] |

### Screens
`screen-shp-menu` (hub) · `screen-shp-table` (all play sub-states; `h-screen` sticky-footer with the Pen) · `screen-shp-gameover` (Daybreak standings).

### Multiplayer (Phase 35)
- **Mode:** MDLM only — `multiplayerOnly: true`, `supportedModes: ['mdlm']`, `recommendedMode: 'mdlm'`. **Min 3 / Max 8.** `rosterConfig: { type: 'none' }` (join-order).
- **Shared screens:** `screen-mp-mode` / `-lobby-host` / `-lobby-join`. **Post-lobby:** `onPassThePhone` (host) → `shpStartSession()`; clients wait for `SHP_DEAL`.
- **Host-authoritative, host-as-participant:** host taps run `shpHostPlayCard`/`shpHostPlayTwoCard` directly; clients send `SHP_PLAY`; host resolves for `shpActivePlayer` (only the active device sends).
- **Card privacy (couch security):** all hands broadcast in `SHP_DEAL`/`SHP_TURN_RESULT`; each device renders only its own (NAT/FRT model). `shpNorm2D` guards received 2D hands.
- **Mid-game quit (PASS contract):** client quit → `SHP_PLAYER_LEFT` ACTION → host broadcasts `SHP_MATCH_DISSOLVED` → all `resetToLobby()`; host quit → `resetToLobby()` (broadcasts `HOST_END_GAME`). One leaver dissolves the match.
- **Key ACTION packets:** `SHP_PLAY`, `SHP_DISRUPT`, `SHP_PLAYER_LEFT`.
- **Key SYNC packets:** `SHP_DEAL`, `SHP_TURN_RESULT` (carries phase/ceiling/grace), `SHP_DEEP_SLEEP`, `SHP_GHOST_READY`, `SHP_DISRUPT_RESOLVED`, `SHP_GAMEOVER`, `SHP_MATCH_DISSOLVED`.

---

## Game 16: Flawless (FLW)
**Theme:** Competitive gem-trading bluffing game. Players pass face-down Showpieces and declare a gem identity — the receiver must decide whether to accept or challenge. Hidden hands, deceptive declarations, and the Diamond Ledger.
**Tagline:** "Every gem has a secret. So does every player." 💎
**Key file:** `js/games/flw.js`
**Brand colour:** `#E879A8` (rose-pink — custom; hover `#CF5A8D`) + `#C9A227` (Exhibition gold for step/section labels) | **Active pill:** `pill-active-flw` | **Toggle ON:** `game-toggle-on-flw`
**State flow:**
```
LOBBY (MDLM only) → FLW MENU → [onPassThePhone: host deals first Showing]
→ [Session loop (Showings until diamonds-to-win reached):
    FLW TABLE (serving → await-response → reveal → under-glass, all within screen-flw-table)
    → FLW SHOWING RESULT (Diamonds awarded, Ledger reset)
    → repeat or GAMEOVER
  ]
→ FLW GAMEOVER (The Vault)
```

### Terminology
| Term | Meaning |
|------|---------|
| Showpiece | A gem card in a player's private hand |
| The Stash | A player's hidden hand of Showpiece gem cards |
| The Appraisal | Receiving a Showpiece — accepting or challenging the declaration |
| The Declaration | The gem identity stated by the server (may be false) |
| Bluff | Declaring a gem identity that is not the true gem |
| Call the Bluff | Challenge the declaration — triggers The Reveal |
| Accept | Believe the declaration and add the gem to The Ledger tally |
| The Ledger | The per-Showing running tally of declared gem identities; winners of each gem category earn Diamonds |
| Diamond | Score currency; first to `flwDiamondsToWin` wins the session |
| Showing | One full round: all players pass until a player runs out of Showpieces or a win condition triggers |
| The Vault | Gameover screen — "The Vault" heading |
| Under Glass | The state when a player's most-recent play is being audited (Sylly Mode) |
| Start the Exhibition | Menu Play CTA label |
| The Exhibition Brief 💎 | Settings overlay title |
| Another Showing? | Play-again overlay heading |
| Pack up the Exhibition? | Quit overlay heading |

### The 10 Gems (`FLW_GEMS`)
| ID | Name | Emoji | Scope | Effect on play / reveal |
|----|------|-------|-------|------------------------|
| 0 | Diamond | 💎 | Declaration target | No effect — counts toward Ledger |
| 1 | Ruby | ❤️‍🔥 | Scope 1–7 | Server gains 1 Ledger point if bluff succeeds |
| 2 | Sapphire | 💙 | Scope 1–7 | Receiver draw +1 card from deck if they Accept |
| 3 | Emerald | 💚 | Scope 1–7 | Receiver offered choice to trade into server's remaining hand |
| 4 | Amethyst | 💜 | Scope 1–7 | Challenger loses 1 Ledger point if wrong call |
| 5 | Topaz | 💛 | Scope 1–7 | Server draws +1 from deck if correctly accepted |
| 6 | Obsidian | 🖤 | Scope 1–7 | Correct challenger does NOT gain Ledger point (silent effect) |
| 7 | Opal | 🤍 | Scope 1–7 | Declared gem changes to the previous Showpiece's declared ID; server picks True or False |
| 8 | Pearl | 🩵 | Special | Server may Peek at receiver's top card before declaring |
| 9 | Onyx | 🩶 | Special | All players pass 1 Showpiece simultaneously; no challenge possible |

### Settings
| Setting (display) | Options | Default | Internal variable | Internal values |
|------------------|---------|---------|------------------|-----------------|
| The Ledger | OFF / ON | ON | `flwLedger` | bool |
| Diamonds to Win | Auto / 3 / 5 / 7 | Auto | `flwDiamondsToWin` | `'auto'` (player-count-scaled) / `3` / `5` / `7` |
| Smoke & Mirrors | 1 / 3 / 5 | 1 | `flwSmokeMirrors` | int — gems burned face-down from deck per Showing |
| Appraisal Clock | Off / 30s / 60s | Off | `flwAppraisalClock` | `0` / `30` / `60` |
| ✨ Sylly Mode (The Counterfeit Run) | OFF / ON | OFF | `flwSyllyMode` | bool |

### Special Mechanics

**The Ledger (Diamond Scoring):**
- Tracks declared gem IDs across the Showing (not real IDs — uses claimed identity until audited)
- At Showing end: player with the most accepted declarations for each gem category earns 1 Diamond
- `flwLedger = false` disables the tracker display but scoring still applies

**Gem Effects:**
- **Emerald (3):** Server privately offers the receiver the Emerald via `FLW_EMERALD_OFFER` private packet; receiver gets `flw-emerald-overlay` to Accept or Block. If accepted, receiver swaps their top-Stash card for the Emerald (server loses 1 card, receiver gains 1).
- **Pearl (8):** When served, host sends `FLW_PEEK` private packet to the receiver showing the card's real ID. Receiver sees `flw-peek-overlay` (tap-and-hold reveals). Not a challenge trigger.
- **Onyx (9):** Simultaneous pass — host triggers a group rotation (each player passes their top-Stash card to the next player clockwise). No challenge is possible for this card. Host resolves and broadcasts `FLW_RESOLVE` with `onyx: true`.

**Asset-pack render seam:**
All gem card DOM is created by `flwRenderCard(gemId, opts)`. Game logic and packets use `gemId` (0–9). A future skin pack changes only this function.

**`flwNorm2D(raw, n)` (Firebase empty-array guard):**
Firebase strips trailing empty arrays from 2D structures. Same pattern as FRT/SHP/GTH — applied to every received `hands`/`stashes` 2D array.

### The Counterfeit Run (Sylly Mode)

**Per Showing:** 1 Counterfeit token + 2 Audit charges reset at each `FLW_SHOWING_START`.

**Counterfeit token (1 use):**
- Active player may forge a fake gem instead of serving a genuine one
- Counterfeit scope: gems 1–7 only (mimic any regular gem)
- The real card is NOT removed from the hand; a "counterfeit" ghost is passed with `realId` hidden
- The Ledger records the event under `claimedId` until audited, then scrubs to `realId`
- The `FLW_LEAK` private packet is NOT sent for Counterfeit plays (no Showpiece leak)
- `flwCfToken` tracks remaining uses; shown as a forge button when > 0

**Audit charges (2 per Showing):**
- Any player may audit another player's most-recent play (the `Under Glass` mechanic)
- Only the most-recent play of any target player is auditable (`flwTopPlay[targetIdx]`)
- `FLW_AUDIT` ACTION → host sets `flwUnderGlass = targetIdx` + deducts 1 charge + broadcasts `FLW_AUDIT_RESULT`
- On audit: host broadcasts `FLW_AUDIT_RESULT` with the real gem ID; if counterfeit, Ledger scrubbed + `claimedId → realId`
- `flwUnderGlass` is cleared at the start of each new turn (`flwBeginTurn()`) and broadcast in `FLW_TURN_START.underGlass`

**Single-Showpiece Leak:**
- Only the active server's own Showpiece can be Counterfeit-played (players cannot forge on behalf of others)
- If Sylly Mode: after each genuine serve, the server's remaining top-Stash card is leaked to one randomly chosen non-active player via `FLW_LEAK` private packet

### Overlay Types
| Overlay | Pattern | z-index | Notes |
|---------|---------|---------|-------|
| `flw-settings-overlay` | Data (slide-up) | z-[80] | "The Exhibition Brief 💎" |
| `flw-how-to-overlay` | Data (slide-up) | z-[90] | How to Play |
| `flw-target-overlay` | Decision modal | z-[90] | Choose pass target |
| `flw-scratch-overlay` | Decision modal | z-[90] | Gem identity declaration selector |
| `flw-peek-overlay` | Decision modal | z-[100] | Peek result (tap-and-hold) — Pearl gem effect |
| `flw-appraisal-overlay` | Decision modal | z-[90] | Appraisal Clock ≤5s warning |
| `flw-emerald-overlay` | Data (slide-up) | z-[100] | Emerald gem offer — Accept or Block |
| `flw-quit-overlay` | Decision modal | z-[80] | "Pack up the Exhibition?" |
| `flw-new-showing-overlay` | Decision modal | z-[90] | "Another Showing?" play-again confirm |
| `flw-cf-overlay` | Decision modal | z-[90] | "Forge a Gem" — Counterfeit Run picker (gems 1–7); Sylly Mode only |

### Screens
| Screen ID | Purpose |
|-----------|---------|
| `screen-flw-menu` | Main hub |
| `screen-flw-table` | Main play — all sub-states (serving / await / reveal / under-glass) |
| `screen-flw-showing-result` | Per-Showing Diamond summary + Ledger final tally |
| `screen-flw-gameover` | Final session scores + winner ("The Vault") |

**No `screen-flw-setup`** — names come from the lobby roster. No pass-gate — MDLM, each player on their own device.

### Multiplayer (Phase 36)
- **Mode:** MDLM only — `multiplayerOnly: true`, `supportedModes: ['mdlm']`, `recommendedMode: 'mdlm'`
- **Min players:** 3 | **Max players:** 4
- **rosterConfig:** `{ type: 'none' }` — automatic seat assignment (join order)
- **Shared screens:** `screen-mp-mode`, `screen-mp-lobby-host`, `screen-mp-lobby-join` (parameterised)
- **Post-lobby routing:** `onPassThePhone` (host) → `flwStartSession()` directly (deals + distributes via private channel); clients wait for `FLW_HAND` private packet
- **True Network Privacy — private channel:** `mpSendPrivate(targetUid, envelope)` writes to `rooms/{code}/private/{uid}`; `mpStartPrivateListener()` uses `onChildAdded` on each device's own private queue, ts-filtered + self-origin-filtered. The public `/events` channel NEVER carries hand data. This is the suite's first genuinely private multiplayer model (vs couch security / broadcast-and-render-own-only in NAT/FRT/BLD/SHP).
- **Host-as-participant:** host taps run `flwHostProcessServe` / `flwHostResolveChallenge` / `flwHostAudit` directly — never via self-sent ACTION (dedup guard drops `originId === syllyDeviceUid`).
- **Mid-game quit (PASS contract):** client quit → `FLW_PLAYER_LEFT` ACTION → host broadcasts `FLW_MATCH_DISSOLVED` → all `resetToLobby()`; host quit → `resetToLobby()` (broadcasts `HOST_END_GAME`). One leaver dissolves the match.
- **Key ACTION packets (public channel):** `FLW_PLAY` (client server → host: `fromIdx, toIdx, declaration, handIdx`), `FLW_AUDIT` (client auditor → host: `auditorIdx, targetIdx`), `FLW_EMERALD_RESOLVE` (client receiver → host: `{accept}`), `FLW_PLAYER_LEFT` (client quit)
- **Key SYNC packets (public channel):** `FLW_SHOWING_START` (full session config for new Showing), `FLW_TURN_START` (`fromIdx, toIdx, declaration, topClaims, underGlass, turnEndTs`), `FLW_RESOLVE` (challenge result + Ledger update), `FLW_AUDIT_RESULT` (audit outcome), `FLW_SHOWING_END` (Diamonds awarded + session scores), `FLW_GAMEOVER` (winner + final scores), `FLW_MATCH_DISSOLVED`
- **Key private-channel packets (per-device):** `FLW_HAND` (this device's Showpiece hand), `FLW_DRAW` (single drawn card), `FLW_PEEK` (Pearl peek result — true gem ID), `FLW_LEAK` (Sylly Showpiece leak — one opponent gem revealed), `FLW_EMERALD_OFFER` (Emerald trade offer to receiver)