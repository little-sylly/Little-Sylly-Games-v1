# Flip You For It — Gameplay Spec (v1 draft)

**Title:** Flip You For It (name settled; theme, colours and art are in the brief)
**Project:** Little Sylly Games gamebox mini-game
**Status:** Core gameplay decisions locked. Sylly Mode parked. Tuning constants to be set by simulation.
**Scope of this document:** digital gameplay only. No theme, art, or naming.

---

## 1. Overview

A 2-player tactical card game on a 3x3 grid, adapted from the capture mechanic of Triple Triad. Each card has four edge values (Top, Right, Bottom, Left). Placing a card next to an enemy card can flip it to your colour. Same, Same Wall and Combo add depth. Players either **draft** their hands from a shared random pool or are **dealt** a hidden hand (Quick Match).

Terminology: this spec says "card" for the game piece, and players see a round collectible cap (see the brief). It also says "match" for one game on the board, which the brief calls a **bout**. The brief adds a best-of-3 or best-of-5 series (a **match**) around it.

Suite constraints this must respect: mobile-first, vanilla JS with no external libraries, all visuals and audio generated programmatically. Two players, by default each on their own device through the suite's multi-device lobby (**MDLM**), with **pass-the-phone (PTP) and gate screens** as an option.

## 2. Settings

| Setting | Options | Notes |
| --- | --- | --- |
| Mode | Draft / Quick Match | Draft = open hands. Quick Match = hidden hands. No separate visibility toggle. |
| Same Wall | ON / OFF | See section 7. |
| Match length | Best of 3 / Best of 5 | A series of bouts (this spec's "matches"), called a match in the brief. Series rules are in the brief. |
| Turn timer | ON / OFF | When ON, 60 seconds per pick or placement. See section 11. |

Default values for each setting are still to be decided.

## 3. Cards

- Four edges: **Top, Right, Bottom, Left** (read clockwise from Top).
- Each edge is a rank from **1 to 9, or S**. S is the old "10": it beats 9, and only another S can match it via Same.
- For budgets and comparisons, S counts as 10.
- A card has: `id`, `stats {top,right,bottom,left}`, `tier`, `owner`.
- No card may have more than **two S edges**.

## 4. Board, Roles and Scoring

- 3x3 grid, 9 cells. Each player has 5 cards.
- **First placer:** plays 5 cards and makes the 9th (final, uncounterable) move.
- **Second placer:** plays 4 cards and keeps 1 unplayed card in hand.
- **Score** = cards in your colour on the board, plus 1 for the second placer's held card. Total is always 10.
- **Win:** 6 or more points. **Tie:** 5–5 triggers Sudden Death (section 8).
- Because the second placer's held card counts, the second placer wins with 5 of 9 board cards while the first placer needs 6. The first placer's compensation is the last move. This is the main balance lever (section 12).

## 5. Match Setup

### 5.1 Draft mode (hands open)

1. Generate a pool of **12 cards** (section 9) from a host-generated seed.
2. Coin toss. The winner chooses one fixed package:
   - **Package A:** picks first, places second (holds 1 card, wins with 5 of 9 board cards).
   - **Package B:** picks second, places first (last move, needs 6 of 9).
3. **Snake draft**, 10 picks. With A = first picker: A B B A A B B A A B. Each player ends with 5 cards. **2 cards stay undrafted.**
4. Both hands are visible to both players throughout.

### 5.2 Quick Match (hands hidden)

1. Generate the same 12-card pool from the host seed.
2. Deal 5 cards to each player at random, discarding 2. Re-deal until the two hands' total point budgets differ by no more than the **fair-deal tolerance** (tunable constant, initial guess: 4 points).
3. A slightly stacked side is acceptable. Large advantages are not.
4. Coin toss decides who places first.
5. Hands are hidden from the opponent.

## 6. Placement and Resolution

Players alternate placing one card on any empty cell. When a card is placed, resolve in this order:

1. **Same check** (section 7 covers walls).
   - Look at each side of the placed card that touches an occupied cell, or a wall when Same Wall is ON.
   - A side **matches** if the two touching edges are equal. S matches S. When Same Wall is ON, S also matches any wall.
   - If **2 or more sides match** and at least one matched card is an enemy, **all matched enemy cards flip**.
2. **Basic flips.** For each adjacent enemy card, if the placed card's touching edge is strictly higher, that card flips.
3. **Combo.** Every card flipped by **Same** (step 1) now acts as if newly placed for **basic comparison only**: any adjacent enemy card (relative to the new owner) with a lower touching edge flips, and each of those flipped cards continues the chain the same way.
   - Chained flips never re-trigger Same.
   - Cards flipped by the basic rule in step 2 do **not** start a chain.
   - Each flip only moves a card toward the mover's colour, so the final result does not depend on chain processing order.

## 7. Same Wall (setting)

- **OFF:** walls are inert.
- **ON:** at match start each of the four walls independently receives a random value from **7–9**, shown on the board edge so players can plan around it.
- A placed card's edge facing a wall matches if it equals that wall's value, or if it is **S**.
- A wall counts as one matched side toward the "2 or more" requirement but is never flipped. A Same Wall flip still needs another matching neighbour and at least one enemy card to flip.

## 8. Sudden Death

- Triggered by a 5–5 result.
- The board is cleared. Each player's new hand is the 5 cards currently in their colour, including a held card for the second placer. Both hands are now known to both players.
- **Roles swap:** the previous second placer now places first.
- No re-draft. Wall values (if Same Wall is ON) carry over unchanged.
- Maximum **2 rematches**. If the second rematch also ties, the match ends as a **shared draw**.

## 9. Card Pool Generator

Pool of 12, from a host-generated seed so every client builds the identical pool. Point budget = Top + Right + Bottom + Left, with S counted as 10.

| Tier (shown to players as the card's rank effect) | Budget | Count | Role |
| --- | --- | --- | --- |
| Legend | 28–33 | 2 | First-pick anchors |
| Veteran | 22–27 | 4 | Strong directional anchors |
| Specialist | 16–21 | 4 | Asymmetric cards and Same Traps |
| Wildcard | 10–15 | 2 | Low-budget connectors |

**Archetypes** are a behind-the-scenes generator convention only (never shown to players; ranks/tiers are the only visual distinction). Suggested tier mapping, to confirm in implementation:

- **Corner Anchor:** about 70% of the budget on two adjacent edges, e.g. 9 / 3 / 3 / 9.
- **Spike:** about 50% of the budget on one edge, e.g. 3 / 4 / S / 3 (Top / Right / Bottom / Left).
- **Wall / Shield:** three high edges, one exposed side, e.g. 8 / 8 / 8 / 2.
- **Balanced:** an even spread, e.g. 6 / 6 / 6 / 6.
- **Same Trap:** repeated middle values, e.g. 5 / 5 / 5 / 5 or 7 / 7 / 2 / 2. Lives in the **Specialist** tier.

**Guardrails (the generator validates and re-rolls any pool that fails):**

1. **Key numbers:** each pool picks 2 key numbers, and at least **40% of all edges** use them. Suggested starting rule: one key number from 7–9 (so it lines up with wall values) and one from 4–6. To be tuned.
2. **S cap:** no card has more than 2 S edges.
3. **Counter-pick check:** for every Legend edge of value 8 or higher, at least one other card in the pool has an opposite-facing edge that is at least as high (an S edge needs another S). Watch the re-roll rate and relax if too many pools fail.

## 10. Players

- Strictly **2 players** for now. Default is MDLM (each player on their own device, so a hidden hand is simply private to its device). PTP is an option, with gate screens (a handover gate before each turn in Quick Match, where hands are hidden; a light handover prompt in Draft). In PTP the turn timer starts only after the gate is tapped.
- A **vs-bot option** is wanted later. Keep the rules engine as pure, deterministic functions (state in, state out) so a bot can plug in as just another move source.

## 11. Turn Timer

- Setting: ON / OFF. When ON, **60 seconds** per draft pick and per placement.
- On expiry, the game **auto-selects a random legal option** (a random available card in the draft, or a random card and cell when placing). This repeats every time it expires. There are **no forfeits** yet.

## 12. Balance and Tuning Plan

- Placement roles are fixed by package choice (section 5.1). If simulation shows the first or second placer is clearly favoured, the fallback is "the player who picked second chooses who places first, after the draft."
- Build the engine first, then run a few thousand simulated matches with the generator to measure:
  - first-placer win rate (target: close to 50%)
  - how often Same, Same Wall and Combo actually trigger
  - generator re-roll rate
  - fair-deal tolerance
  - key-number rule and wall range
- Tuning constants live in one config object so they can change without touching rules code.

## 13. Parked / Open

- **Sylly Mode:** skipped for now (the game is not live and a couple of others in the suite are also pending). A real design comes later. Trading or swapping cards may play a role. Undecided.
- **Name:** settled (Flip You For It). Theme and visuals live in the brief. The thematic vocabulary is still to settle.
- **Defaults** for the three settings.

## 14. Suggested Build Phases

1. **Engine:** card and board state, Same, Same Wall, Basic, Combo, Sudden Death, scoring. Include unit tests for the resolution order.
2. **Simulation harness:** random and simple-heuristic bots, to gather the balance numbers in section 12.
3. **Generator:** tiers, archetypes, seed, validation, fair-deal logic.
4. **UI:** draft screen, board with visible wall values, Quick Match deal, timer.
5. **Integration:** gamebox menu, settings, multiplayer sync (host-authoritative).
