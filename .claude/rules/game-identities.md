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
| Review edits | ON / OFF |
| Sylly Mode | ON / OFF |

**Status:** Stable since Phase 7. No changes in Phase 10.x.

---

## Game 2: Great Minds
**Theme:** Telepathy / frequency / signal. Two players find a connecting word for a random pair.
**Key file:** `js/games/great-minds.js`
**State flow:** LOBBY → GM MENU → GM SETUP → GM INPUT → GM PASS GATE → GM REVEAL GATE → GM REVEAL → GM RESULT (loop until victory)

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
| Static block message | "Signal Interrupted!" |
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

---

## Game 3: Secret Signals (SS)
**Theme:** Encryption / intercept / broadcast. Two teams — one encrypts keywords, the other intercepts.
**Key file:** `js/games/secret-signals.js`
**State flow:** Setup → Players → Vault Gate (×2) → Vault (×2) → Who Encrypts First? → [Round: Encrypt → Broadcast → Intercept → Decode Gate → Decode → Resolution] → Endgame Splash → [Phase 2 if Sylly Mode: Tiebreak? → Intel Intro → Intel Guess (×4) → Intel Summary] → Final Game Over

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
| Setting | Options | Default |
|---------|---------|---------|
| Chefs (player count) | 3 / 4 / 5 / 6 | 4 |
| Rounds | 3 / 5 / 10 | 3 |
| The Sweet Spot | 10 / 20 / 30 pts | 20 pts |
| Rotten Penalty | Off / On | On — unique ingredients cost −10 pts |
| Spoilt Penalty | Off / On | On — Crowded Kitchen Tax: −(count × 2) pts |
| Sous Chef Oversight | Off / On | On |
| ✨ Sylly Mode (Kitchen Nightmares) | Off / On | Off |

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
