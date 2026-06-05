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

### Settings
| Setting | Options |
|---------|---------|
| Timer | 30s / 60s / 90s |
| Rounds | 3 / 5 / 10 |
| No-No list size | 5 / 10 |
| Penalty type | Configurable |
| Skip cost | Configurable |
| Pinky Swear Mode | ON / OFF |
| Sylly Mode | ON / OFF |

### Team Setup
- **Screen 1 heading:** "Name your Playgroups!"
- **Default team names:** Crayon Crew / Glue Stick Gang
- **Screen 2:** None — LI5 does not track individual player names
- **Setup emoji:** 👥

### Overlay Types
| Overlay | Pattern | Notes |
|---------|---------|-------|
| `li5-play-again-overlay` | Decision modal z-[90] | "New Playgroup?" play-again confirmation |

**Status:** Stable since Phase 7. No changes in Phase 10.x.

### Multiplayer (Phase 22)
- **Mode:** 2-Device Teams — Host device = active describer team; Client device = `screen-li5-monitor` (Tattletale Sheet)
- **Shared screens:** `screen-li5-mode`, `screen-li5-lobby-host`, `screen-li5-lobby-join` (parameterised)
- **Game-specific screen:** `screen-li5-monitor` — shows current word + No-No List; CATCH! button sends ACTION
- **Key ACTION packets:** `LI5_CATCH` (Client → Host: alert, no auto score change)
- **Key SYNC packets:** `LI5_ROUND_START` (word + nonoList per new card)

---

## Game 2: Great Minds
**Theme:** Telepathy / frequency / signal. Two players find a connecting word for a random pair.
**Key file:** `js/games/great-minds.js`
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

### Settings
| Setting | Options | Default | Internal value |
|---------|---------|---------|----------------|
| Customise Words | OFF / ON | OFF | `gmCustomWords` bool |
| Memory Guard | OFF / ON | OFF | `gmMemoryGuard` bool |
| Resonance Tolerance | High Fidelity / Resonant | High Fidelity | `'strict'` / `'normal'` |
| Signal Boost | OFF / ON | OFF | `gmSignalBoost` bool |
| Infinite Resync | OFF / ON | OFF | `gmInfiniteResync` bool |
| Frequency Range | Stable / Unstable / Chaotic | Stable | `'stable'`/`'unstable'`/`'chaotic'` |
| Static Interference | OFF / ON | OFF | `gmStaticInterference` bool |
| Sylly Mode | Mental Fog / Neural Storm | Mental Fog | `'sub-atomic'` / `'supernova'` |

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
| Overlay | Pattern |
|---------|---------|
| `gm-settings-overlay` | Data (slide-up) |
| `gm-how-to-overlay` | Data (slide-up) |
| `gm-deck-panel` | Data (slide-up) |
| `gm-boost-overlay` | Decision modal |
| `gm-near-sync-overlay` | Decision modal |
| `gm-override-overlay` | Decision modal |
| `gm-new-frequency-overlay` (Session Terminal) | Decision modal |
| `gm-neural-library-overlay` | Decision modal |

### Multiplayer (Phase 22 + Phase 24–25)
- **Mode:** Individual Devices — both players on their own device simultaneously (no pass-gate or reveal-gate in Lobby Mode)
- **Shared screens:** `screen-gm-mode`, `screen-gm-lobby-host`, `screen-gm-lobby-join` (parameterised)
- **Game-specific screens:** none
- **Key change:** `gmStartInputPhase()` sets `gmActivePlayer = mpMyPlayerIdx` in Lobby Mode — both devices show input simultaneously. Firebase round-trip replaces the pass-gate + reveal-gate.
- **Key ACTION packets:** `GM_SUBMIT` (Client word → Host)
- **Key SYNC packets:** `GM_ROUND_START` (pair + banned letter), `GM_RESULT` (both words + match outcome + round log + `isOverride: bool` + `overridePhrase: string`)
- **Client guards (Phase 24):** `btn-gm-override` is a no-op for clients (host-only overlay). `btn-gm-next-round` is a no-op for clients (wait for `GM_ROUND_START` from host).
- **Social Override (Phase 24):** Host broadcasts `GM_RESULT` with `isMatch: true`, `isOverride: true`, `overridePhrase`. Client `gmMpDisplayResult()` handles `isOverride` — shows `wordA / wordB` instead of single match word.
- **Play-again (Phase 25):** Host confirm → `mpReturnToLobby()` (returns to same-code lobby). Client confirm → `resetToLobby()`.

---

## Game 3: Secret Signals (SS)
**Theme:** Encryption / intercept / broadcast. Two teams — one encrypts keywords, the other intercepts.
**Key file:** `js/games/secret-signals.js`
**State flow:** Setup → Players → Who Encrypts First? → Vault Gate (first team) → Vault (first team) → [first team's encoding turn] → Vault Gate (second team, first time only) → Vault (second team) → [Round loop: Encrypt → Broadcast → Intercept → Decode Gate → Decode → Resolution, alternating teams] → Endgame Splash → [Phase 2 if Sylly Mode: Tiebreak? → Intel Intro → Intel Guess (×4) → Intel Summary] → Final Game Over

### Terminology
- **Vault:** Each team's private set of 4 keywords
- **The Transmitter / Encoder:** The player sending the encrypted broadcast
- **Broadcast:** The encrypted clue transmitted to interceptors
- **Intercept:** Team B attempting to decode Team A's broadcast
- **Intel Phase:** Sylly Mode Phase 2 — final guessing round

### Settings
| Setting | Notes |
|---------|-------|
| Intercepts to Win | Configurable target score |
| Difficulty | Standard / Wild / Wilder |
| Categories | Multi-select from curated list |
| Reroll Limit | Per keyword reroll budget |
| Timer | Countdown for broadcast phase |
| Customise Vault | OFF = curated 10-cat pool; ON = full 16-cat picker |
| Sylly Mode | Activates Intel Phase |

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

### Team Setup
- **Screen 1 heading:** "Establish Cover Identities"
- **Default team names:** Alpha Echo / Bravo Zulu
- **Screen 2 heading:** "Meet the Operatives"
- **Screen 2 subtitle:** "Names optional — helps with broadcaster rotation."
- **Player placeholder:** "Operative 1", "Operative 2", etc.
- **Setup emoji:** 👥

### Multiplayer (Phase 22)
- **Mode:** Hybrid — supports Individual Devices or 2-Device Teams (Zone 2 pill in host lobby, `supportsHybrid: true`)
- **Shared screens:** `screen-ss-mode`, `screen-ss-lobby-host`, `screen-ss-lobby-join` (parameterised)
- **Game-specific screens:** none
- **Security:** Team B's vault is sent ONLY to the Client device via `SYNC: SS_VAULT_DATA` (targeted write). Team A's vault never leaves the Host.
- **Key ACTION packets:** `SS_VAULT_READY`, `SS_ENCODE_TRANSMIT`, `SS_INTERCEPT_SUBMIT`, `SS_DECODE_SUBMIT`
- **Key SYNC packets:** `SS_VAULT_DATA`, `SS_ENCRYPT_TURN`, `SS_BROADCAST`, `SS_START_INTERCEPT`, `SS_DECODE_GATE`, `SS_RESOLUTION`, `SS_ENDGAME`

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
| Chef's Kiss ✨ | Golden status — ingredient hit the Sweet Spot count |
| Too Many Cooks! | Spoilt status — word submitted by too many players |
| A Bit Pongy! | Rotten status — unique ingredient nobody else submitted |
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
| Setting | Options | Default | Internal value |
|---------|---------|---------|----------------|
| Chefs (player count) | 3 / 4 / 5 / 6 | 4 | `jecPlayerCount` int |
| Rounds | 3 / 5 / 10 | 3 | `jecRounds` int |
| Menu Complexity | Home Cook / Sous Chef / Head Chef | Sous Chef | `jecFoodDifficulty` `'easy'` / `'mixed'` / `'hard'` |
| The Sweet Spot | 10 / 20 / 30 pts | 20 pts | `jecGoldenScore` int |
| Rotten Penalty | Off / On | On — unique ingredients cost −10 pts | `jecRottenPenalty` bool |
| Spoilt Penalty | Off / On | On — Crowded Kitchen Tax: −(count × 2) pts | `jecSpoiltPenalty` bool |
| Sous Chef Oversight | Off / On | On | `jecSousChefOversight` bool |
| Specials Board | Off / On | Off | `jecSpecialsBoard` bool |
| ✨ Sylly Mode (Kitchen Nightmares) | Off / On | Off | `jecKitchenNightmares` bool |

### Special Mechanics

**Scoring (inverse proportional):**
- `goldenMax = Math.floor(N * 0.7)` — max count that stays Golden
- Golden: `Math.round(jecGoldenScore * (goldenMax - count + 2) / goldenMax)` — count=2 always = full score
- Spoilt: `-(count × 2)` if penalty on (scales with how crowded the kitchen was)
- Rotten: `-10` flat if penalty on
- Poisoned: 0 pts (KN mode — overrides all)
- Signature Dish: Golden score × 2 (KN mode — always ingredient slot 0)

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
| `jec-quit-overlay` | Decision modal |
| `jec-oversight-overlay` | Decision modal — merge confirm |
| `jec-new-shift-overlay` | Decision modal — "New Shift?" |

### Multiplayer (Phase 22)
- **Mode:** Individual Devices — all chefs on their own device
- **Shared screens:** `screen-jec-mode`, `screen-jec-lobby-host`, `screen-jec-lobby-join` (parameterised)
- **Game-specific screens:** none
- **Key mechanic:** `jecMpReadyCheck[]` tracks prep submissions. Host runs sifting + Sous Chef oversight; all merges broadcast so all devices stay in sync.
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
| The Troublemaker | Gang member (internal: `lttpJokerIdx`) who plants a fake location to mislead (optional role, Joker Mode ON) |
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
- Friend of a Friend (Joker Mode ON): None → 🃏 Troublemaker → None
- Friend of a Friend (Joker Mode OFF): status section hidden

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
| Players | 3–6 | 4 | `lttpPlayerCount` |
| Difficulty | Local / Secret | Local | `'local'` / `'secret'` |
| Joker Mode | OFF / ON | OFF | `lttpJokerMode` bool |
| Group Vote | OFF / ON | ON | `lttpGroupVote` bool |
| Small Talk Helper | OFF / ON | OFF | `lttpSmallTalk` bool |

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
