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
| The No-No List! | 5 words / 10 words 🔥 | 5 | `settingTabooCount` | int |
| Oopsie Daisy (penalty) | −1 Point / −N Secs | −1 Point | `settingPenaltyMode` | `'points'` / `'time'` — time penalty auto-scales with timer (30s→−5, 60s→−10, 90s→−20; `settingTimePenalty`) |
| Skip | Free / Penalised | Free | `settingSkipFree` | bool (`true` = free) |
| Pinky Swear Mode | OFF / ON | OFF | `settingCorrections` | bool — tap Report Card rows to flip outcomes |
| ✨ Sylly Mode (Wild Words) | OFF / ON + Wild Level slider | OFF / 30% | `settingSylly` + `settingSyllyPct` | bool + int 30–100 step 10 — % chance per card of a difficulty-3 word (×2 points and penalties) |

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
- **Intercept:** Team B attempting to decode Team A's broadcast
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
(Reality-synced June 2026 audit — display names + internals from `index.html` / `secret-signals.js`. Note: the SS settings overlay is legacy format — bare divs with `<hr>` separators and a centred title, predating the Settings Card Standard.)

| Setting (display) | Options | Default | Internal variable | Internal values |
|------------------|---------|---------|------------------|-----------------|
| Designate Vault Contents (Customise Vault) | OFF / ON + 16-category pill grid | OFF | `ssCustomiseVault` + `ssSelectedCategories` | bool + array of category strings (OFF = curated 10-cat pool `SS_CURATED_CATS`) |
| Encryption Protocol (difficulty) | Clear / Scrambled / Deep Space | Clear | `ssDifficultyLevel` | `1` / `2` / `3` (single tier — not cumulative) |
| Interceptions Required | 2 / 3 | 2 | `ssSettingInterceptsToWin` | int |
| Vault Rotations (reroll limit) | Once / Twice / Unlimited | Once | `ssRerollLimitSetting` | `1` / `2` / `Infinity` |
| ⏱ Broadcaster Timer | OFF / ON + 1 / 2 / 3 min | OFF (60s on first enable) | `ssTimerSetting` | `0` (off) / `60` / `120` / `180` seconds |
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
- **Game-specific screens:** none
- **Security:** Team A's vault never leaves the Host. Team B's vault is sent via `SYNC: SS_VAULT_DATA` — note this is a **broadcast SYNC envelope, not a targeted write** (audit correction, June 2026): with exactly 2 devices the only client is Team B so it behaves like a targeted write, but any additional client device would also receive it.
- **2-device assumption (audit [BUG], June 2026):** All SS lobby-mode guards use `mpMyPlayerIdx` as a *team* index (`ssMpVaultReady[mpMyPlayerIdx]`, `ssEncryptingTeam === mpMyPlayerIdx`, intercept/decode submit guards). SS multiplayer therefore only functions with exactly 2 devices (one per team) even though the MDLM roster permits up to `ssPlayerCount × 2` devices.
- **Intel Phase not multiplayer-aware (audit [BUG], June 2026):** Phase 2 has zero MP packets; after `SS_ENDGAME` each device runs the pass-the-phone Intel Phase locally. The client never receives Team A's vault, so Team B's intel turn crashes on the client device. Client-side vault rerolls are likewise local-only (no ACTION) and never reach the Host.
- **Key ACTION packets:** `SS_VAULT_READY`, `SS_ENCODE_TRANSMIT`, `SS_INTERCEPT_SUBMIT`, `SS_DECODE_SUBMIT`
- **Key SYNC packets:** `SS_VAULT_DATA`, `SS_ENCRYPT_TURN`, `SS_BROADCAST`, `SS_START_INTERCEPT`, `SS_DECODE_GATE`, `SS_RESOLUTION`, `SS_ENDGAME` (the client-encoder path also emits `SS_START_INTERCEPT` from the client device — a client-sent SYNC, tolerated because only the Host consumes it)

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
| The Pantry Cabinet | Settings overlay label |

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
| `jec-settings-overlay` | Data (slide-up) — "The Pantry Cabinet" |
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
- **Client-gating gaps (audit [BUG], June 2026):** the sifting "Taste Test", tally "Next Course", and Sous Chef merge taps are NOT host-gated — a client tapping them runs scoring/round-advance/merges locally and diverges until the next Host SYNC. `JEC_NEXT_ROUND` also makes clients pop their own local word pool (transient wrong word until `JEC_ORDER` lands).
- **Key ACTION packets:** `JEC_PREP_SUBMIT` (each chef's ingredient + KN fields)
- **Key SYNC packets:** `JEC_ORDER`, `JEC_SIFTING`, `JEC_MERGE`, `JEC_TALLY`, `JEC_NEXT_ROUND`, `JEC_WASHUP`

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
| Verdict Style | Your Call / The Consensus | Your Call | `'secret-ballot'` / `'open-ballpark'` |
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
- Aggregated vote scores determine final round ranking; position drives score.
- Running totals shown on `#screen-ygi-results` with 🥇🥈🥉 medals for positions 1–3.

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
- **Key ACTION packets:** `YGI_TAKE_SUBMIT` (player's number + metric), `YGI_VOTE_SUBMIT` (player's vote ranking)
- **Key SYNC packets:** `YGI_ROUND_START` (prompt + round number), `YGI_LINEUP` (all takes + optional ringer), `YGI_VERDICT` (scores + standings)

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
- **Friend of a Friend:** Sees all locations; can annotate cells as Safe (green) or Dead End (red)
- **The Gang:** Sees red highlights narrowing to the real address each plan (6→3→1)
- **The Troublemaker:** Sees gold cell (real address) + purple cell (decoy they're planting)

### Contacts System
The 🕵️ button opens the Contacts overlay — a dual-view panel (roster → folder) for tracking suspicions and notes on each other player.

**Status cycles (keyed to the ACTIVE player's role):**
- The Gang: None → ✅ Safe → ❓ Sus → 🃏 Troublemaker → None
- The Troublemaker: None → ✅ Safe → ❓ Sus → None
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
| `lttp-guess-map-overlay` | Custom (full-width map panel) z-[95] | Guess phase — Friend of a Friend pins the address |

### Multiplayer (Phase 22)
- **Mode:** Individual Devices — each player on their own device
- **Shared screens:** `screen-lttp-mode`, `screen-lttp-lobby-host`, `screen-lttp-lobby-join` (parameterised)
- **Game-specific screens:** none
- **Message interrupt:** When any player sends a message, `mp-lttp-message-interrupt-overlay` (z-[105]) fires on ALL devices simultaneously
- **Passive device behaviour:** Map and Contacts navigation permitted; `.lttp-send-trigger` and `#btn-lttp-confirm-send` locked when device is not the active player
- **Map/Contacts state:** Local only — never synced. Each player maintains their own annotations.
- **Key ACTION packets:** `LTTP_MESSAGE_SEND` (Client → Host: message text + from/to indices)
- **Key SYNC packets:** `LTTP_GAME_START` (full world state including strayIdx, jokerIdx, addressIdx, gridLocations), `LTTP_TURN_ADVANCE` (nextPlayerIdx), `LTTP_MESSAGE_INTERRUPT` (fromName, toName, messageText → all devices)

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
| The Last Stand | `screen-nat-last-stand` — Mole's final specimen guess + Biologist verdict |
| The Field Notes | `screen-nat-tally` — per-match score reveal |
| The Final Report | `screen-nat-gameover` — expedition winner + match log |
| Credibility | Score currency |
| New Expedition | Play again (resets all state, preserves names + settings) |

### Settings
| Setting | Options | Default | Internal value |
|---------|---------|---------|----------------|
| Habitats | 3 / 4 / 5 | 3 | `natMatchesSetting` int (data-habitats) |
| Days Per Habitat | 2 / 3 / 4 | 2 | `natRoundsPerMatch` int (data-days) |
| Research Log | OFF / ON | OFF | `natCumulativeClues` bool |
| Field Difficulty | Shallow / Mixed / All | Mixed | `'d1'` / `'d1+d2'` / `'all'` |
| Voting Mode | Consensus / Independent | Consensus | `'consensus'` / `'independent'` |
| Scientific Integrity | Relaxed / Peer Review | Relaxed | `'relaxed'` / `'peer-review'` |
| Escape Points | 10 / 15 / 20 | 10 | `natEscapePoints` int (data-escape) |
| ✨ Sylly Mode (Survival of the Fittest) | OFF / ON | OFF | `natSyllyMode` bool |

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
- **Key ACTION packets:** `NAT_OBSERVATION` (player's clue word → Host validates + advances turn)
- **Key SYNC packets:** `NAT_MATCH_START` (specimen + all role assignments), `NAT_ACTIVE_PLAYER` (current observer index), `NAT_DAY_END` (Sylly Mode daily review), `NAT_SELECTION` (all clue data for vote screen), `NAT_TALLY` (score results)

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
| Operations Manual ⚓ | How-to overlay title |
| New Operation | Play again (resets game state, keeps names + settings) |
| Mission Abyss | Sylly Mode name |
| Jammer | Sylly Mode sabotage tile |
| Magnetic Drift | Sylly Mode mechanic — unrevealed grid cells shuffle each deployment |

### Settings
| Setting | Options | Default | Internal value |
|---------|---------|---------|----------------|
| Sea State | Calm / Turbulent / Tempest | Turbulent | `'calm'` / `'turbulent'` / `'tempest'` |
| Strategic Planning | OFF / ON | OFF | `dsdStrategicPlanning` bool |
| Danger Level | Pressure Mine / Nuclear Mine | Pressure | `'pressure'` / `'nuclear'` |
| Urchin Ends Turn | OFF / ON | OFF | `dsdHazardControl.urchin` bool |
| Mine Ends Turn | OFF / ON | ON | `dsdHazardControl.mine` bool |
| Enemy Payload Ends Turn | OFF / ON | ON | `dsdHazardControl.enemy` bool |
| ✨ Sylly Mode (Mission Abyss) | OFF / ON | OFF | `dsdSyllyMode` bool |

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
| `dsd-how-to-overlay` | Data (slide-up) | z-[90] | "Operations Manual ⚓" |
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
- **Key ACTION packets:** `DSD_PING_TRANSMIT` (Captain's clue word + number), `DSD_SEQUENCE_SUBMIT` (crew's ordered grid indices)
- **Key SYNC packets:** `DSD_CREW_ACTIVE` (ping word + number for crew screen), `DSD_EXECUTION_RESULT` (tile outcomes + updated Valour + grid state), `DSD_GAMEOVER` (final scores)

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
| Intake Form 📋 | Settings overlay title |
| The Disclaimer 🛋️ | How-to overlay title |

### Settings
| Setting | Options | Default | Internal value |
|---------|---------|---------|----------------|
| Reportable Symptoms (disorders per patient) | 3 / 4 / 5 | 3 | `gthDisordersPerPatient` int |
| Expression Window (drawing time) | 20s / 30s / 45s | 30s | `gthDrawingTime` int |
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
| `gth-settings-overlay` | Data (slide-up) | z-[80] | "Intake Form 📋" |
| `gth-how-to-overlay` | Data (slide-up) | z-[90] | "The Disclaimer 🛋️" |
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

## Game 10: Dicey Bluffs (DYB)
**Theme:** Liar's Dice — each player shakes a private hand of dice, then players take turns making escalating claims about the full table. Call someone's bluff or be caught lying.
**Tagline:** "Trust no one. Count every face."
**Key file:** `js/games/dyb.js`
**Brand colour:** `stone-700` | **Active pill:** `pill-active-stone`
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
| Term | Meaning |
|------|---------|
| Shake | One full round of rolling + bidding + showdown |
| Allegation | A bid — the active player's claim about how many of a face exist across all dice on the table |
| Call Bluff! | Challenge the previous allegation — triggers a Showdown |
| Showdown | `screen-dyb-showdown` — all hands revealed; real count vs claimed count determines the loser |
| The Table | `screen-dyb-table` — main gameplay screen showing pip row, bid history, and allegation controls |
| Stealth Veil | The eye-icon toggle that hides/shows the player's own dice (prevents screen peeking) |
| Slick Die | Chaos Mode die: face is privately assigned by the owner, opaque to all others |
| Wild (1s) | Ones count as any face — behaviour depends on Wildcards Style setting |
| Classic Wildcards | 1s count toward any bid |
| Strict (No Wilds) | 1s are just 1s — no wild behaviour |
| Volatile Wilds | 1s are wild UNTIL someone bids 1s directly — then they stop being wild for the round |
| The Spirit Board | `screen-dyb-spirit-board` — eliminated player's passive spectator screen |
| New Game | Play again — resets all match state, preserves names + settings |
| Fold? | Quit confirm overlay heading |

### Settings
| Setting | Options | Default | Internal variable | Internal values |
|---------|---------|---------|------------------|-----------------|
| Wildcards Style | No Wilds / Classic / Volatile | Classic | `dybWildcardsStyle` | `'strict'` / `'classic'` / `'volatile'` |
| Starting Hand | 3 / 4 / 5 | 5 | `dybStartingHand` | int |
| ✨ Sylly Mode (Chaos Mode) | OFF / ON | OFF | `dybSyllyMode` | bool |
| Chaos Level (sub-option) | slider 5–10 | 5 | `dybSyllyIntensity` | int — % chance per die of becoming Slick |

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

**Slick dice (Chaos Mode):**
`dybSyllyIntensity` % chance per die of becoming Slick on roll. Slick dice have no fixed face — owner chooses any face via `dyb-slick-picker-overlay` (z-[100]) at the table screen. Face is private; only the owner knows. Eliminated at showdown reveal alongside real dice.

**Showdown animation (`dybRenderShowdownScreen`):**
All hands revealed immediately. Count animates from 0 → real at 400ms/tick with `playTick()`. On reaching real: `playBoing()`, verdict shown (bidder/challenger label + loser name), `onDone()` callback fires. If real ≤ 0: 600ms pause then reveal (no ticking needed).

**Opener rotation:**
After each Showdown, `dybCurrentOpenerIdx` = loser (if still active) or next active player (if eliminated). The opener must place the first bid of the next Shake.

### Overlay Types
| Overlay | Pattern | z-index | Notes |
|---------|---------|---------|-------|
| `dyb-settings-overlay` | Data (slide-up) | z-[80] | "The House Rules 🎲" |
| `dyb-how-to-overlay` | Data (slide-up) | z-[90] | How to Play |
| `dyb-quit-overlay` | Decision modal | z-[80] | "Fold?" — mid-game exit |
| `dyb-new-game-overlay` | Decision modal | z-[90] | "New Game?" — play-again confirm |
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
| Big Flake | (Drama Mode) one Flake who must identify a Friend or forfeit bonus |
| The Planner | The active player who nominates the group for the current plan |
| The Group | The nominated subset of players who play mission cards |
| Mission Card | Each selected player plays "In" or "Bail" — Flakes can bail |
| Bail | Sabotage card — a bail in the group fails the plan |
| Patience Meter | Tracks how many nomination attempts remain (5 max) |
| Bailed | The game name — also used as the plan-failure verb |
| Drama Mode | Sylly Mode — adds Pot-Stirrer + Big Flake roles and identification phase |
| The Itinerary | End-of-game plan history overlay (aftermath screen) |
| New Night Out | Play again — resets all state, preserves names + settings |
| Walk Out | Quit during game |
| The Group Chat | Settings overlay title |

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
- **Friends win:** 3+ plans succeed → each Friend earns a point
- **Flakes win:** 5th nomination rejected (patience exhausted) OR 3+ plans fail
- **Drama Mode — Big Flake bonus:** +1 to Big Flake if they correctly identify a Friend after 3 successes

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
- Adds Pot-Stirrer (knows all Flake identities) and Big Flake (one Flake who gets a bonus guess)
- After 3 plan successes, triggers identification phase before the final plan
- Big Flake must guess a Friend — correct = +1 Credibility; wrong = no bonus
- Pot-Stirrer's identity is never revealed to Friends during the game

**Seat numbers:**
- Assigned randomly at game start (1..N, shuffled) — not manually assigned
- Planner rotation follows seat order, not join order
- Displayed in header and role reveal screen in MDLM

**Fellow Flakes indicator:**
- In MDLM, Flake devices show fellow Flakes' names in the header (`#bld-header-fellow-flakes`)
- Hidden for Friends; also hidden in single-device (PTP) mode

### Overlay Types
| Overlay | Pattern | z-index | Notes |
|---------|---------|---------|-------|
| `bld-settings-overlay` | Data (slide-up) | z-[80] | "The Group Chat" |
| `bld-how-to-overlay` | Data (slide-up) | z-[90] | "How to Play 📋" |
| `bld-quit-overlay` | Decision modal | z-[80] | "Walk Out?" |
| `bld-second-chances-overlay` | Decision modal | z-[90] | Patience-exhausted Flake win confirm |
| `bld-pass-reveal-overlay` | Decision modal | z-[90] | Pass-the-phone handoff before role reveal |
| `bld-role-help-overlay` | Decision modal | z-[90] | Role-specific rules reference |
| `bld-plan-detail-overlay` | Decision modal | z-[90] | Per-plan history detail (aftermath tappable tiles) |
| `bld-tip-overlay` | Decision modal | z-[90] | Shared tip overlay — `bldShowTip(emoji, heading, lines[])` drives all contextual `[?]` buttons |
| `bld-new-night-overlay` | Decision modal | z-[90] | "New Night Out?" — play-again confirmation |

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
| Detonation | Sylly Mode: a Bomb or Sequence triggers the Abyss to deal clockwise |
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

**Climb rule:** Every valid play must be exactly one rank higher than `passTableCombo.rank` (except 2s and Jokers as described above; Bombs override this entirely).

**Two-Natural-Card Anchor:** Sequences and Double Sequences with Jokers require at least 2 natural (non-Joker) cards. A combo of 1 natural + 3 Jokers is invalid.

**Full-circuit pass:** If all players pass without anyone playing, the table clears (`passTableCombo = null`); the last player to lead plays again on an open table.

**Seat order:** Join order = seat order. Host = seat 1. No shuffle. Deliberate design: no hidden roles, so join order is fair and predictable.

**Sylly Mode — The Abyss:**
- Every Pass feeds one card from the draw deck face-up into `passAbyss[]`
- Bomb or Sequence played → detonation: Abyss cards deal clockwise to opponents (winner exempt); Abyss clears
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
- **Key SYNC packets:** `PASS_GAME_START` (hands + chips for new round), `PASS_TURN_RESULT` (table state after every play/pass), `PASS_ABYSS_DRAFT` (Sylly Mode detonation/fracture), `PASS_ROUND_END` (chip deltas + winner), `PASS_NEXT_ROUND` (new hands + chips + first player for the next round), `PASS_GAMEOVER` (final scores), `PASS_MATCH_DISSOLVED` (player left)