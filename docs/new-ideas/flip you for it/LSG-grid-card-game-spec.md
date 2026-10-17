# Flip You For It — Gameplay Spec (v2 draft)

**Title:** Flip You For It (name settled; theme, colours and art are in the brief)
**Project:** Little Sylly Games gamebox mini-game
**Status:** Core gameplay decisions locked. Sylly Mode parked. Tuning constants set from the alpha prototype's simulations and first playtest (section 12). v2 adds hidden hands as the default, the bot opponent, optional testing rules and the measured balance results.
**Scope of this document:** digital gameplay only. No theme, art, or naming. A working reference implementation of everything here exists as the alpha prototype (see the package README).

**What changed from v1:** (1) hands are hidden by default in both modes, with an Open Hands setting (sections 2, 5); (2) a bot opponent with three skill levels (sections 2, 10, 15); (3) three optional testing rules, all off by default (sections 7, 7.1); (4) generator values recorded as built (section 9); (5) defaults decided (section 2); (6) measured balance results (section 12); (7) a tester-only game log (section 16).

---

## 1. Overview

A 2-player tactical card game on a 3x3 grid, adapted from the capture mechanic of Triple Triad. Each card has four edge values (Top, Right, Bottom, Left). Placing a card next to an enemy card can flip it to your colour. Same, Same Wall and Combo add depth. Players either **draft** their hands from a shared random pool or are **dealt** a random hand (Quick Match). Hands are hidden by default in both modes.

Terminology: this spec says "card" for the game piece, and players see a round collectible cap (see the brief). It also says "match" for one game on the board, which the brief calls a **bout**. The brief adds a best-of-3 or best-of-5 series (a **match**) around it.

Suite constraints this must respect: mobile-first, vanilla JS with no external libraries, all visuals and audio generated programmatically. Two players, by default each on their own device through the suite's multi-device lobby (**MDLM**), with **pass-the-phone (PTP) and gate screens** as an option. A computer opponent can take the second seat.

## 2. Settings

| Setting | Options | Default | Notes |
| --- | --- | --- | --- |
| Mode | Draft / Quick Match | Quick Match | Draft = shared pool, snake pick. Quick Match = random deal. |
| Hands | Hidden / Open | **Hidden** | Applies to both modes. Open shows both hands for the whole bout. Hidden is the default because open hands turn the game into a maths puzzle (alpha playtest). Tie-Breaker hands are always open (section 8). In Draft the pile shows which cards were taken, so hidden is a memory test, not true secrecy (section 5.1). |
| Same Wall | ON / OFF | ON | See section 7. |
| Match length | Best of 3 / Best of 5 | Best of 3 | A series of bouts (this spec's "matches"), called a match in the brief. Series rules are in the brief. |
| Turn timer | ON / OFF | OFF | When ON, 60 seconds per pick or placement. See section 11. |
| Opponent | Player / Bot | Player | Player = a person (own device, or PTP). Bot = a computer opponent in the second seat (section 15). |
| Bot skill | Easy / Medium / Hard | Medium | Only when Opponent is Bot. |
| *Testing options (prototype only)* | Wall numbers 7–9 or 1–9; Plus On/Off; Chain Match On/Off | 7–9, Off, Off | Not part of the shipped rules. Kept so rule variants can be compared (section 7.1). |

## 3. Cards

- Four edges: **Top, Right, Bottom, Left** (read clockwise from Top).
- Each edge is a rank from **1 to 9, or S**. S is the old "10": it beats 9, and only another S can match it via Same.
- For budgets and comparisons, S counts as 10.
- A card has: `id`, `stats {top,right,bottom,left}`, `tier`, `owner`.
- No card may have more than **two S edges**.

## 4. Board, Roles and Scoring

- 3x3 grid, 9 cells (indexed 0–8, row by row from the top left). Each player has 5 cards.
- **First placer:** plays 5 cards and makes the 9th (final, uncounterable) move.
- **Second placer:** plays 4 cards and keeps 1 unplayed card in hand.
- **Score** = cards in your colour on the board, plus 1 for the second placer's held card. Total is always 10.
- **Win:** 6 or more points. **Tie:** 5–5 triggers Sudden Death (section 8).
- Because the second placer's held card counts, the second placer wins with 5 of 9 board cards while the first placer needs 6. The first placer's compensation is the last move. This is the main balance lever (section 12): with competent play the second placer is favoured.

## 5. Match Setup

### 5.1 Draft mode

1. Generate a pool of **12 cards** (section 9) from a host-generated seed.
2. Coin toss. The winner chooses one fixed package:
   - **Package A:** picks first, places second (holds 1 card, wins with 5 of 9 board cards).
   - **Package B:** picks second, places first (last move, needs 6 of 9).
3. **Snake draft**, 10 picks. With A = first picker: A B B A A B B A A B. Each player ends with 5 cards. **2 cards stay undrafted.**
4. **Hands hidden (default):** each player sees the pile and their own picks. Taken cards leave the pile, so a careful player can work out the other hand, which makes this a memory test. **Hands open:** both hands are shown throughout.

### 5.2 Quick Match

1. Generate the same 12-card pool from the host seed.
2. Deal 5 cards to each player at random, leaving 2 out. Re-deal until the two hands' total point budgets differ by no more than the **fair-deal tolerance** (tunable constant, set to 4 points).
3. A slightly stacked side is acceptable. Large advantages are not.
4. Coin toss decides who places first.
5. **Hands hidden (default):** a player sees only their own hand. The pool of 12 is not shown to players. **Hands open:** both hands shown.

## 6. Placement and Resolution

Players alternate placing one card on any empty cell. When a card is placed, resolve in this order:

1. **Same check** (section 7 covers walls).
   - Look at each side of the placed card that touches an occupied cell, or a wall when Same Wall is ON.
   - A side **matches** if the two touching edges are equal. S matches S. When Same Wall is ON, S also matches any wall.
   - If **2 or more sides match** and at least one matched card is an enemy, **all matched enemy cards flip**. Friendly cards count as matches but never flip.
2. **Basic flips.** For each adjacent enemy card, if the placed card's touching edge is strictly higher, that card flips.
3. **Combo.** Every card flipped by **Same** (step 1) now acts as if newly placed for **basic comparison only**: any adjacent enemy card (relative to the new owner) with a lower touching edge flips, and each of those flipped cards continues the chain the same way.
   - Chained flips never re-trigger Same (unless the optional Chain Match rule is on, section 7.1).
   - Cards flipped by the basic rule in step 2 do **not** start a chain.
   - Each flip only moves a card toward the mover's colour, so the final result does not depend on chain processing order.

Events the engine reports for each placement (used by the animation, the game log and the balance tools): the list of flips with kind (`same`, `basic`, `combo`) and chain depth; whether Same fired; whether the wall number was **decisive** (Same fired, and fewer than 2 matched sides were cards, so the wall supplied the second match); wall sides matched; and counts per kind.

## 7. Same Wall (setting)

- **OFF:** walls are inert.
- **ON:** at the start of each bout each of the four walls independently receives a random value from **7–9**, shown on the board edge so players can plan around it.
- A placed card's edge facing a wall matches if it equals that wall's value, or if it is **S**.
- A wall counts as one matched side toward the "2 or more" requirement but is never flipped. A Same Wall flip still needs another matching neighbour and at least one enemy card to flip. Two wall matches with no enemy card flip nothing.

### 7.1 Optional testing rules (prototype only, all off by default)

These come from the original Triple Triad and exist so their effect can be measured. They are not part of the locked rules.

- **Wall numbers 1–9:** walls draw from 1–9 instead of 7–9. Measured to leave how often walls matter unchanged (section 12).
- **Plus:** for each neighbouring card, add the placed card's edge to the touching edge. If two or more neighbours give the same sum and at least one is an enemy, every enemy card in the matching pairs flips. Walls never count for Plus. Plus flips are treated like Same flips (they start combo chains).
- **Chain Match:** cards flipped by Same or Plus also run the Same (and Plus) check themselves, as if just placed, as well as the usual higher-beats-lower chain.

## 8. Sudden Death

- Triggered by a 5–5 result.
- The board is cleared. Each player's new hand is the 5 cards currently in their colour, including a held card for the second placer. Both hands are now known to both players, so they are always open.
- **Roles swap:** the previous second placer now places first.
- No re-draft. Wall values (if Same Wall is ON) carry over unchanged. Optional rules carry over.
- Maximum **2 rematches**. If the second rematch also ties, the match ends as a **shared draw**.

## 9. Card Pool Generator

Pool of 12, from a host-generated seed so every client builds the identical pool. Point budget = Top + Right + Bottom + Left, with S counted as 10.

| Tier (shown to players as the card's rank effect) | Budget | Count | Role |
| --- | --- | --- | --- |
| Legend | 28–33 | 2 | First-pick anchors |
| Veteran | 22–27 | 4 | Strong directional anchors |
| Specialist | 16–21 | 4 | Asymmetric cards and Same Traps |
| Wildcard | 10–15 | 2 | Low-budget connectors |

**Archetypes** are a behind-the-scenes generator convention only (never shown to players; ranks/tiers are the only visual distinction).

Implemented templates (edge weights are scaled to the card's budget, rotated and optionally mirrored):

- **Corner Anchor:** weights 3 / 1 / 1 / 3 (about 70% of the budget on two adjacent edges), e.g. 9 / 3 / 3 / 9.
- **Spike:** weights 1 / 1 / 3 / 1 (about half the budget on one edge), e.g. 3 / 4 / S / 3.
- **Wall / Shield:** weights 4 / 4 / 4 / 1 (three high edges, one exposed side), e.g. 8 / 8 / 8 / 2.
- **Balanced:** weights 1 / 1 / 1 / 1, with one point nudged between two edges, e.g. 6 / 6 / 6 / 5.
- **Same Trap:** repeated values. 35% of the time all four edges equal (when that fits the tier), otherwise two pairs (a, a, b, b) rotated, with a from 2–7 and a different from b. Specialist tier only.

| Tier | Archetype weights |
| --- | --- |
| Legend | Corner 35%, Shield 30%, Spike 20%, Balanced 15% |
| Veteran | Corner 30%, Shield 30%, Balanced 25%, Spike 15% |
| Specialist | Spike 35%, Same Trap 30%, Corner 20%, Balanced 15% |
| Wildcard | Balanced 50%, Spike 25%, Corner 25% |

**S edges:** after the template is built, the card's highest edge becomes S with probability Legend 50%, Veteran 20%, Specialist 30%, Wildcard 0%.

**Key-number snapping:** each edge that is not locked (S, or already snapped) snaps to the nearest of the pool's two key numbers with probability 50%. Then the card is nudged one point at a time (never touching locked edges) until its total is inside the tier budget. Cards that cannot be fitted are rebuilt.

**Guardrails (the generator validates and re-rolls any pool that fails):**

1. **Key numbers:** each pool picks 2 key numbers, one from 7–9 (so it lines up with wall values) and one from 4–6, and at least **40% of all edges** use them.
2. **S cap:** no card has more than 2 S edges.
3. **Counter-pick check:** for every Legend edge of value 8 or higher, at least one other card in the pool has an opposite-facing edge that is at least as high (an S edge needs another S).
4. **No repeated sticker** within a pool (12 stickers drawn from the 21 available).

Measured: about 3 in 4 first attempts are re-rolled (instant, no concern). The generator gives up after 3,000 attempts.

## 10. Players

- Strictly **2 players**. Default is MDLM (each player on their own device, so a hidden hand is simply private to its device). PTP is an option, with gate screens: with hidden hands, a gate before each turn names the player and only they tap through to see their hand; with Open Hands, a light "hand the phone over" prompt. In PTP the turn timer starts only after the gate is tapped.
- **Bot opponent** (prototype): the bot always takes the second seat (tangerine) and the human the first (cobalt). No gates are used. The rules engine is pure and deterministic (state in, state out), so a bot plugs in as just another move source. See section 15.

## 11. Turn Timer

- Setting: ON / OFF. When ON, **60 seconds** per draft pick and per placement.
- On expiry, the game **auto-selects a random legal option** (a random available card in the draft, or a random card and cell when placing). This repeats every time it expires. There are **no forfeits** yet. The timer does not run on the bot's turns.

## 12. Balance and Tuning Plan

- Placement roles are fixed by package choice (section 5.1). If simulation shows the first or second placer is clearly favoured, the fallback is "the player who picked second chooses who places first, after the draft." **Not applied yet.**
- Tuning constants live in one config object so they can change without touching rules code.

**Measured in the alpha prototype** (bots on the real engine and generator; Quick Deal, hidden hands, wall 7–9, opening round; full tables and method are in the brief section 19 and the balance data):

- **Seat balance:** first placer wins about 53–54% with random bots and about 34–44% with Medium or Hard bots. Competent play favours the second placer. Seats swap each bout, so a match should even out (whole-match runs still to do).
- **Ties:** about half of Hard-versus-Hard opening rounds end 5–5 (46% hidden, 53% open); about 30% with random bots.
- **Same / Same Wall / Combo:** Same appears in 30% (Easy), 72% (Medium) and 53% (Hard) of bouts. A Same that needs the wall number appears in about 35% of Hard bouts and about 60% of Medium bouts. Combo appears in 12%, 62% and 32%. Turning Same Wall OFF roughly halves Same.
- **Wall range:** an outer edge matches its wall about 15% of the time whatever the range, so 1–9 does not change how often walls matter. Left at 7–9.
- **Original Triple Triad extras:** Plus lifts Same per placement from 12.6% to 20.7% and Combo to 82% of Medium-bot bouts. Chain Match alone changes little. Plus is the lever if Combo proves too rare in human play.
- **Generator:** 50% key snapping gives 12.6% Same per placement for Medium bots; none gives 9.5%; 80% gives 18.4%.
- **Pool and deal:** about 3 in 4 pools and 4 in 5 first Quick Deals are re-rolled or re-dealt (instant).

**Still to do:** simulate whole matches; larger Hard-versus-Hard samples; playtest against Medium; decide the Quick Deal information question (section 15).

## 13. Parked / Open

- **Sylly Mode:** skipped for now (the game is not live and a couple of others in the suite are also pending). A real design comes later. Trading or swapping cards may play a role. Undecided.
- **Name:** settled (Flip You For It). Theme and visuals live in the brief. The thematic vocabulary is still to settle.
- **Defaults:** set in section 2 (soft-locked, reviewed before implementation).
- **Bots:** hard-bot strength, the Quick Deal information question and joining the suite's lobby and bot system (section 15).
- **Hints:** an optional placement preview for Same and wall matches (see the brief section 23).

## 14. Suggested Build Phases

Phases 1–4 exist in the alpha prototype and can be ported or rewritten against it.

1. **Engine:** card and board state, Same, Same Wall, Basic, Combo, Sudden Death, scoring, optional Plus and Chain Match. Unit tests for the resolution order. *(Done in the prototype; 16 tests.)*
2. **Simulation harness:** bots at three levels, gathering the balance numbers in section 12 including per-placement Same, wall-decisive and Combo rates. *(Done: the Balance lab and scripts.)*
3. **Generator:** tiers, archetypes, seed, validation, fair-deal logic. *(Done.)*
4. **UI:** draft screen, board with visible wall values, Quick Match deal, hidden and open hands, timer, bot opponent. *(Done as a single-device prototype; placeholder stickers.)*
5. **Integration:** gamebox menu, settings, multiplayer sync (host-authoritative), the suite's bot system, real sticker assets and the final cap and board art.

## 15. Bots

Interface (as built): `botMove(state, player, level, rng, ctx)` returns `{cardId, cell}`; `botPick(available, level, rng)` returns a card id for the draft. `level`: 0 Easy, 1 Medium, 2 Hard. `ctx` is `{open: true}` when the bot may read the opponent's hand, otherwise `{unseen: [cards the bot cannot see], samples, nodes}`.

- **Easy:** a random legal move; a random draft pick.
- **Medium:** the legal move that leaves it with the most cards on the board (it counts caps after its own move only), ties broken at random. Draft pick: highest card total, with noise.
- **Hard:** a game-tree search (minimax with alpha-beta pruning, a position table and iterative deepening, within a node budget; default 50,000). Values are win, draw (5–5) or loss first; the size of the margin only breaks ties; a drawn 5–5 is worth zero. With **open hands** it searches the real game. With **hidden hands** it samples possible opponent hands from the cards it cannot see (6 by default, or all of them when few remain), solves each, and plays the move with the best average. The last few placements are solved exactly. Draft pick: card total plus a bonus for its best edge, with noise.
- **What the bot knows:** its own hand, the board, the wall numbers and, in Quick Deal, which cards were in the pool of 12. The Draft and Tie-Breakers are treated as fully known (they can be deduced). It never reads the opponent's hand otherwise (tested). **Known imbalance:** the pool of 12 is not shown to the human, so Hard is slightly better informed than the person. Options: show the pool, or sample from a wider set. Undecided.
- **Pace:** a bot move shows after a short pause (about 0.65–1.15 s); Hard's search takes about 0.3–0.5 s of that on early moves.
- **Strength ladder** (Quick Deal, hidden hands, wall on): Medium beats Easy 82%; Hard beats Medium 93%; Hard beats Easy 99% (Hard samples of 150 bouts, give or take 4 points).
- **Coin toss in Draft:** when the bot holds the package choice it picks one of the two at random.

## 16. Game Log (prototype and playtest only)

The prototype records every match played on the device (last 40, in local storage) and exports them as one JSON text via a Copy button. Per bout: seed, key numbers, generator re-rolls, wall numbers, the 12 cards, draft picks, each round's hands. Per placement: seat, card, cell, thinking time (human), every flip as `[cell, kind, depth]`, whether Same fired and whether the wall was decisive, wall sides matched, combo count, the running board count, and for bot moves the search depth and number of sampled hands. A summary per setup (Same, Wall and Combo rates, bout results) is added at the top. Not planned for the shipped game.
