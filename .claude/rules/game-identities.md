# Game Identities — Little Sylly Games

## Shared Rules (All Games)
- **Sylly Mode** is always the **last setting** in every game's settings overlay — the "advanced rules signature"
- `isSylly` is derived at runtime (`difficulty === 3`) — never stored in data
- Every game has its own menu screen before setup (lobby → menu → setup flow)

---

## Game 1: Don't Say Those Words (DSTW)
**Theme:** Describe without saying the forbidden words. Pass the phone.
**Key file:** `js/games/dstw.js`
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

## Game 3: Sylly Signals
**Theme:** Encryption / intercept / broadcast. Two teams — one encrypts keywords, the other intercepts.
**Key file:** `js/games/sylly-signals.js`
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
