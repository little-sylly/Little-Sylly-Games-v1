# New Game Brief — Pass
**Document type:** Phase 1 — Design Brief (non-technical)

---

## 1. Identity (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Full game name** | Pass |
| **Short nickname / abbreviation** (3–4 letters, used in code) | pass |
| **One-sentence tagline** | Win big, or stare helplessly and pass. |
| **Thematic universe** | A tense, rapid-fire card match where you watch your best cards become completely useless. |
| **Emoji / icon** | 😵‍💫 |
| **Brand colour preference** | zinc-900 (near-black) |

---

## 2. The Players (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Player count range** | 3–6 players |
| **Teams or individuals?** | Everyone for themselves (Individuals) |
| **Are there different roles?** | No |
| **Is any information hidden from some players?** | Yes — each player's hand of cards is completely hidden from all other players. |
| **Minimum meaningful player count** | 3 players (strategic lockouts and passing loops require at least 3 to function properly). |

---

## 3. The Core Loop (REQUIRED)

**In one sentence — what does a player DO on their turn?**

A player must either play a valid card combo that is exactly one rank higher than the current cards on the table, drop a Bomb, play a Sequence, or tap "Pass" (even if they hold a playable card).

**What is the central tension or fun moment?**

The agonising moments where you hold incredibly high cards (like Aces or Kings) but are completely locked out and forced to pass because you don't possess the exact +1 rank card required to climb the chain.

**What type of game is this closest to?**

☐ Something else: A highly restrictive shedding / climbing card game.

**Walk through one complete round step by step:**

1. The game deck is shuffled and every player is dealt a secret starting hand (default: 5 cards).
2. The active player opens the match by playing a single card, a pair, a Sequence, or a double Sequence from their hand onto the table.
3. The next player clockwise must match the exact combo structure — same type AND same card count — but exactly one rank higher (e.g., if a pair of 5s was played, they must play a pair of 6s; a 3-card Sequence can only be beaten by another 3-card Sequence). Alternatively, they can play a Single 2 on singles, a Pair of 2s on pairs, drop a Bomb, or choose to Pass. **Note:** 2s cannot appear inside a Sequence or Double Sequence — K-A-2 is not a valid Sequence.

**Card ranking (low → high):** 3 · 4 · 5 · 6 · 7 · 8 · 9 · 10 · J · Q · K · A · 2

**Bomb escalation:** Once a Bomb is on the table, standard climbing rules stop. A player can only respond with a Bomb of the same tier at any higher rank, or a higher-tier Bomb at any rank. Tiers (lowest to highest): Triplet → Quad → Double Joker. Once a Double Joker Bomb is played, all remaining players must pass — it cannot be beaten.

4. This repeats sequentially clockwise around the table. All plays must be performed strictly on-turn.
5. If a player cannot or chooses not to play, they tap "Pass".
6. If everyone passes consecutively back to the player who laid the last valid combo, the table clears and that winning player gets to lead a brand-new combo type.
7. *(If Mid-Game Draw is ON)* Starting from the trick winner and going clockwise, every player draws one card from the talon. If the talon runs dry mid-draw, drawing stops immediately — some players may receive a card and others may not.
8. The instant a player sheds their final card, the round freezes — no further plays or passes occur. **Sylly Mode (The Abyss):** the engine immediately audits the winning combo type. If it was a Bomb or Sequence, The Abyss detonates (draft runs clockwise starting from the player after the winner, then scores). If it was a Single or Pair, any cards pooled in The Abyss are discarded silently with no draft before scoring.

**Is there anything players do simultaneously?**

No. Everything is strictly sequential — players must wait for their explicit turn.

**How does the phone physically move?**

Each person operates on their own device via the lobby multiplayer system, ensuring secret hands stay hidden.

---

## 4. Winning (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **How does a game end?** | Triggered by the chosen Match Duration setting: either after a fixed number of rounds, or when a player's chip count drops to 0 or below. |
| **How is the winner determined?** | The player with the highest remaining chip total at the end of the match wins. |
| **Are ties possible?** | Yes. Tied chip totals: the player who won the most individual rounds takes the victory. |
| **Roughly how long should a full game take?** | 5–10 minutes depending on match length settings. |

---

## 5. Scoring (REQUIRED)

Every player starts a match with a baseline chip pool (configurable: 50 / 100 / 150, default 100). The game ends when a player reaches 0 or below. Players can end in negative chips.

### Round-end penalties

Penalties are based on number of remaining cards, with a multiplier determined by how many cards a player is holding relative to their starting hand (N).

| Game state at round end | Penalty Calculation | Standard Badge | Sylly Mode badge |
|------------------------|---------------------|----------------|------------------|
| **Round Winner** (Shed all cards) | Wins the round (+ Total chips lost by all opponents combined) | — | — |
| **Played cards, ending below Max Cap**<br>*(Even if final count ≥ starting hand due to drawing)* | **1×** chip per card remaining | "Clean Exit" | "Surviving the Wake" |
| **Held Hand / Caught Sleeping**<br>*(Played 0 cards the entire round)* | **2×** chips per card remaining | "Caught Sleeping" | "Dragged Under" |
| **Hit Max Capacity**<br>*(Exactly 13 cards left at round end)* | **3×** chips per card remaining | "Loaded Down" | "Total Despair" |

**Zero-play check:** A player who played no cards at all during the round is in the Caught Sleeping tier (2×), regardless of final hand size.

**Badge columns:** Standard badges apply in normal play. Sylly Mode (The Abyss) replaces them with the Abyss-themed equivalents.

**Abyss edge cases (Sylly Mode overflow):**
* **The Zero-Play Multiplier Rule:** If a player has not played a single card, no matter their hand size relative to the starting hand, they are penalized with the flat 2× multiplier. 
  * *Example:* Starting hand is 5. The player absorbs 2 cards via a draft but plays 0 cards. Final hand size is 7. Calculation: `7 cards × 2 = 14 chips lost`.
* **The Active-Play Overflow Rule:** If a player actively plays cards but finishes the round over their starting hand size due to card draws/absorption, they remain in the standard 1× baseline tier. 
  * *Example:* Starting hand is 5. The player plays cards but gets hit by an Abyss draft, finishing with 7 cards. Calculation: `7 cards × 1 = 7 chips lost`.
* **The Absolute Cap Isolation Rule:** If a player hits the hard limit of 13 cards and loses, they are penalized with a flat 3× multiplier. This rule overrides other multipliers and does not compound with the zero-play penalty.
  * *Example:* Player hits max capacity and finishes with 13 cards. Calculation: `13 cards × 3 = 39 chips lost` (Does not double-dip to 13 × 3 × 2).

### Match duration engine logic

- **5 Rounds / 10 Rounds:** Engine runs exactly that many matches. If any player's chip stack hits 0 or below before the round limit, the game triggers an immediate early stoppage and shows the final scoreboard.
- **Endless (Elimination):** Engine bypasses round counting. Loops indefinitely until a player is cleaned out at 0 or below chips, crowning the highest-chip player the winner.

---

## 6. Settings (REQUIRED)

| Setting name | What does it change? | Options | Default |
|-------------|---------------------|---------|---------|
| Starting Hand Size | Number of cards dealt to each player at the start of each match. | 5 / 6 / 7 cards | 5 cards |
| Chip Stack | Starting chip pool and elimination threshold (0 or below). | 50 / 100 / 150 | 100 |
| Match Duration | Controls how the game ends. "Endless" = elimination mode; round options = fixed match count with emergency stoppage at 0 chips. | 5 Rounds / 10 Rounds / Endless | 5 Rounds |
| Bomb Strictness | Whether Triplets (3-of-a-kind) count as Bombs, or only Four-of-a-kind. | Standard (Triplets count) / Heavy (Quads only) | Standard |
| Mid-Game Draw | When a trick clears, every player (starting from the trick winner, going clockwise) draws one card from the talon. Drawing stops if the talon runs dry mid-draw. | Off / On | Off |
| Minimum Sequence Length | Minimum consecutive cards needed to form a valid Sequence. | 3 / 4 / 5 cards | 3 cards |
| Jokers | Total wild cards mixed into the standard 52-card deck. | 0 / 2 / 4 | 2 |
| Sky Joker Variant | When on: a single Joker beats a Single 2 (becomes Rank 16); a Double Joker beats a Pair of 2s (ultimate bomb). | Off / On | Off |
| ✨ Sylly Mode (The Abyss) | Activates The Abyss — a central face-up pool that grows on every pass and detonates when someone plays a Bomb or Sequence. See §7 for full rules. | Off / On | Off |

---

## 7. Sylly Mode: The Abyss

| Field | Your answer |
|-------|-------------|
| **Thematic name** | The Abyss |
| **In one sentence — what changes?** | Every pass adds a card to a central face-up pool; only a Bomb or Sequence detonates it, forcing all non-winners to absorb the pool into their hands. |
| **Does it add new screens or phases?** | No new screens — The Abyss pool is a display element on the existing Card Table screen. |
| **Does it change scoring?** | Yes — adds the Abyss Penalty (triple loss for 13 cards) and the 13-card hard cap distribution rule. |
| **Does it change the win condition?** | No — first to empty their hand still wins the round. |

### Core mechanics

**The Pass-to-Abyss Loop:** When a player taps "Pass", the engine pulls 1 card from the face-down deck and flips it face-up into a central public pool called The Abyss. The passing player does not draw into their hand. Players can check the pile at anytime to see what's inside and the order.

**The Trick Rollover (The Shadow Grows):** If a trick clears with standard Singles or Pairs, cards in The Abyss do not clear — they roll over and grow with each successive pass cycle.

**The Detonation Trigger:** To clear The Abyss, a player must play a Bomb (Triplet or Quad, based on Bomb Strictness) or a Sequence (3+ consecutive cards) on their turn.

**The Resolution Phase ("THE ABYSS GAZES BACK..."):** When a trick clears following a Bomb or Sequence, the player who won that trick is exempt from the penalty. All remaining players execute a clockwise draft — pulling cards from The Abyss one by one into their playable hands until the pool is empty.

**The Multi-Deck Prism Shift:** To prevent card exhaustion in longer matches, the engine supports a two-deck maximum. Deck 1 uses a Charcoal Gray card back (The Descent). The instant Deck 1 runs dry, all subsequent deals shift visually to a Crimson Red card back (The Deepening), alerting players that a fresh wave of duplicates and key ranks has entered play.

### The Rule of 13 (containment walls)

**The Abyss Collapse Cap ("THE ABYSS FRACTURES..."):** The Abyss cannot exceed 13 cards. If The Abyss contains exactly 13 cards and another pass would push it over, the engine forces an immediate automatic distribution of the entire face-up pile clockwise (exempting the current trick leader).

**Hand Capacity Cap ("EDGE OF THE ABYSS..."):** A player's hand is hard-capped at 13 cards. Distribution stops at a player when they hit 13 cards and moves onto the next. Players can not have a hand greater than 13. If they play cards then they're eligible again for the distribution up until the 13 card cap. If they lose while holding 13 cards, the penalty is 13 cards x 3 chips. 

*Note: Internal event names for these triggers will be assigned in the Phase 2 technical spec.*

---

## 8. Thematic Vocabulary (REQUIRED)

| Generic term | What this game calls it |
|---|---|
| Round | Match |
| Score / points | Chips |
| Game over screen | Cleaned Out |
| Play again | Next Deal |
| Quit | Walk Away |
| Settings overlay title | House Rules |
| Consecutive-card combo | Sequence |
| Triplet/Quad play that overrides rank order | Bomb |
| Central face-up pool (Sylly Mode) | The Abyss |
| Player blocked from receiving penalty cards | Edge of the Abyss |
| Visual shift to second deck (Sylly Mode) | The Deepening |

**Key on-screen copy strings (Sylly Mode):**
- Detonation resolution banner: "THE ABYSS GAZES BACK..."
- 13-card pool overflow banner: "THE ABYSS FRACTURES..."
- Hand cap lockout banner: "EDGE OF THE ABYSS..."

---

## 9. Word Bank & Content (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Does this game use the existing word bank (words.json)?** | No |
| **If no — what kind of content does it need?** | A standard 52-card poker deck (suits + ranks), optionally expanded with Jokers. Card data is generated programmatically at runtime — no external data file needed. |
| **Does it need a completely new data file?** | No — deck is generated at runtime inside the plugin. |
| **Any content that should be excluded?** | N/A |

---

## 10. Multiplayer Classification (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Individual devices or shared device?** | Each player must use their own individual device. |
| **Is any information private to one player's device?** | Yes — each player's hand must remain completely hidden from all other devices. |
| **Are there moments of simultaneous action?** | No. All actions are strictly turn-based. |
| **Are there moments where one device should lock while another is active?** | Yes — non-active players cannot interact with their cards while the current player's turn is in progress. |
| **Any roles or phases that don't work with multiple devices?** | None identified. |

---

## 11. Screens — Plain English List (REQUIRED)

1. **Game menu** — title, tagline, Play / How to Play / Settings / Back to the Box.
2. **Lobby setup** — host configures House Rules and Sylly Mode; monitors connected player slots.
3. **Hand reveal** — each player privately views their dealt cards on their own device before play begins. *Note: This likely needs a pass-gate confirmation screen so each player can tap through before their hand appears.*
4. **The Card Table** — main game board: player's hidden hand, current table card stack, active Abyss pool (Sylly Mode), turn order indicator, and action prompts (play selected cards / pass / confirm).
5. **Pass transition** — brief visual confirmation of who just passed, with the "Staring..." escalation text (see §12).
6. **Match wrap-up** — card count penalties, badge text, chip adjustments per player for the completed round.
7. **Final leaderboard** — triggered when the round limit or chip elimination threshold is hit; announces the overall winner.

---

## 12. Open Questions & Design Notes (REQUIRED)

**Confirmed design decisions:**

- **Joker single-play rule:** Jokers cannot be played as single cards — they are locked out unless it is the player's absolute last card AND their turn to lead a new trick. No warning modal; the submit button is hard-blocked in all other scenarios.
- **Joker as wildcard:** Jokers substitute as wildcards in ALL combo types — Pairs, Triplets, Quads (Bomb class), Sequences, and Double Sequences. A Joker fills any positional gap in a consecutive run.
- **Double Joker Bomb is base game:** Two Jokers played together always form the highest-tier Bomb, regardless of the Sky Joker Variant setting. Sky Joker Variant ONLY enables a single Joker to be played as Rank 16 in regular climbing play (beats Single 2).
- **Double Sequence is base game:** Two or more pairs of consecutive ranks (e.g., 3-3-4-4 or 6-6-7-7-8-8-9-9) is a valid opening combo and can only be beaten by a Double Sequence of the same length, one rank higher. 2s cannot be included.
- **Bombs are base game:** Triplet and Quad plays (per Bomb Strictness setting) exist in standard play. The Abyss adds the pool mechanic on top.
- **Sequences are base game:** Consecutive-card plays exist in standard play. The Abyss's detonation trigger reuses this mechanic.
- **Scoring is count-based:** Penalties are chips × card count (not face value). Three tiers: 1× (played any card, below 13-card cap), 2× (played 0 cards the entire round), 3× (exactly 13 cards at round end).
- **Card ranking scale:** 3 < 4 < 5 < 6 < 7 < 8 < 9 < 10 < J < Q < K < A < 2 — 2 is always the highest rank.
- **Abyss overflow rules:** Active-play overflow (cards absorbed beyond starting hand) → 1× standard tier. Zero-play regardless of hand size → 2×. Max cap (exactly 13 cards) → 3×, does not compound with zero-play penalty.
- **Round leader:** Round 1 is led by the player holding the 3♠. Subsequent rounds are led by the previous round's winner.
- **Mid-Game Draw behaviour:** When ON, every player draws 1 card (clockwise from the trick winner). Not just the winner.

No unresolved questions remain — brief is ready for Stage 2.

**The "Staring Helplessly" escalation matrix:**

On every pass, a stylised banner flashes over the player's card area. Tracks *consecutive* passes per player via a local counter:

| Condition | On-screen phrase | Presentation |
|-----------|-----------------|--------------|
| 1st consecutive pass | "Staring..." | Fades in gently at 40% opacity, disappears after 1 second |
| 2nd consecutive pass | "Staring... helplessly..." | Slightly larger font, italicised, subtle screen vibration |
| 3rd+ consecutive pass | "Accepting your fate..." | Dense dark crimson text, lingers on screen |

**Things that might be complicated to implement:**

- Complex Sequence validation — checking consecutive ranks for dynamic sizes (3, 4, or 5 cards), especially when evaluating Jokers as wild substitutes within the sequence.
- Strict turn-lock state management to prevent out-of-turn interactions across all devices.
- The Abyss multi-deck visual shift (dual card back colours mid-game).

**Things explicitly OUT OF SCOPE for v1:**

- Canvas particle effects for exploding cards when dropping a Bomb.
- AI single-player bot mode.

---

## 13. Mood & References (if applicable)

| Field | Your answer |
|-------|-------------|
| **Real-world games this is most similar to** | Gan Deng Yan, Big Two, Uno, Mahjong (structural limits) |
| **Tone** | Tense, tactical, lightning-fast, mildly competitive, psychological |
| **Should NOT feel like** | A slow-paced, casual, friendly co-op game |

---

## 14. Sample Round (Sylly Mode active)

**Setup:** 3 players (Alex, Blake, Charlie). Starting Hand: 5 cards. Mid-Game Draw: Off. Sylly Mode (The Abyss): On. Jokers: 2. The Abyss currently holds 3 face-up cards from a previous rollover: [4♦, 9♠, J♥].

**Hands:**
- Alex: [3♠, 6♣, 7♥, 7♦, 7♠] — holds a 3-card Triplet Bomb
- Blake: [4♣, 5♦, 8♣, K♠, K♦]
- Charlie: [5♠, 10♣, A♠, A♦, A♣] — holds a 3-card Triplet Bomb (Aces)

---

**Alex (Turn 1):** Opens by playing a single 3♠. Table: Combo = Single, Rank = 3. Turn passes to Blake.

**Blake (Turn 2):** Must play a 4. Holds 4♣ — plays it. Table: Rank = 4.

**Charlie (Turn 3):** Must play a 5. Holds 5♠ — plays it. Table: Rank = 5.

**Alex (Turn 4):** Must play a 6. Holds 6♣ — plays it. Table: Rank = 6.

**Blake (Turn 5):** Must play a 7. Holds no 7 — only an 8 and Kings. Taps Pass.

*"Staring..." flashes over Blake's cards at 40% opacity.*

Engine pulls 1 card from the deck and flips it face-up into The Abyss. Abyss grows to 4 cards: [4♦, 9♠, J♥, Q♣].

**Charlie (Turn 6):** Must play a 7. Holds none — drops his Triplet Bomb: [A♠, A♦, A♣].

**Alex (Turn 7):** Counters with his Deuce-Triplet [2♥, 2♦, 2♠] — 2s rank above Aces in this game (Big Two-style ranking). Alex clears his hand — hand size is now 0.

**Round freezes immediately.** No further turns occur — Blake and Charlie do not get to play or pass.

---

**The Resolution Phase:**

Alex is the victor with 0 cards and is fully exempt from penalty.

Engine audits the winning combo: Triplet = Bomb → detonation fires. "THE ABYSS GAZES BACK..." banner. The Abyss holds 4 cards [4♦, 9♠, J♥, Q♣] — the pool from the earlier rollover plus the card added at Turn 5 when Blake passed.

Draft runs clockwise from Blake: Blake draws 1, Charlie draws 1, Blake draws 1, Charlie draws 1. The Abyss empties.

Round ends. Blake and Charlie are penalised based on their final card counts per the scoring badge matrix in §5.
