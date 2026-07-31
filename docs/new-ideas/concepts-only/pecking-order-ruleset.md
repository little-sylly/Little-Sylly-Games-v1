# Pecking Order
*(working title) — a two-track predator-chain card game*

## Elevator Pitch
Empty your hand by throwing out a Volley of cards and daring the table to Answer it. Every animal only loses to its real, specific predators — no numeric rank, no skipping up a ladder — so knowing the food chain *is* the skill. Two tracks, Land and Sea, share their smallest creatures but lock apart once you're past them, a pair of Giant-Killers let the weakest card in the game flip the strongest, and a Human wildcard answers to nobody.

## Players & Length
3–6 players. Dealt from a shared Pool sized to the table (not a fixed deck) — roughly 40% of the Pool gets dealt no matter how many are playing, so the game feels the same size relative to the table at 3p or 6p.

## Terminology

| Term | Meaning |
|---|---|
| Match | A full multi-round session, tracked on the Status Ladder |
| Round | One full Deal, played until someone empties their hand |
| Deal | The cards each player receives at the start of a Round (default 15, flat regardless of player count) |
| Pool | The full set of cards in use for the current player count |
| Reserve | Cards left undealt in the Pool after the Deal |
| Lead / Leader | The player opening a new Encounter |
| Volley | A play — one or more cards, grouped into Slots, thrown out together |
| Slot | One card, or a matched swarm of the same species, inside a Volley — each must be individually Beaten |
| Encounter | The full back-and-forth over one Volley, from the Lead until everyone else has Passed |
| Beat | Playing a valid predator (or a Swarm+1) against a specific Slot |
| Answer | A full response to a Volley — every Slot Beaten at once; no partial coverage |
| Pass | Declining to Answer; you sit out until the next Encounter |
| Hold | A Volley survives because everyone else Passed — the Leader wins the Encounter |
| Watering Hole | The discard pile, where spent Volleys go |
| Giant-Killer | Bee / Stingray — beats its own track's Apex solo, otherwise the weakest thing on the board |
| Domain | Informal label for the upper, track-locked part of each chain (Leopard→Bear→Elephant, Seal→Polar Bear→Orca) |
| Crossover | Informal label for the lower part of each chain where Land and Sea can interact |

*Domain and Crossover are teaching shorthand, not separate rules — the actual game only has one rule for who beats what, below.*

## The One Rule: Adjacency, Not Rank
Every animal is beaten only by its specific, listed predator(s) — never by "anything higher." A Leopard doesn't care how big Orca is; Orca isn't Leopard's predator, so it simply can't touch it. This is what the original physical cards were already encoding with a thought bubble of "immediate predators" on each card — we're just making it the actual rule instead of a numeric stand-in for it. It also means track-locking isn't a separate rule you have to remember — it falls out for free, since nothing on the Sea chain lists a Land predator (or vice versa) except the two Crossover cards below.

**Universal exceptions**, on top of the specific chains: any Slot can be Beaten by **Swarm+1** (one more copy of the exact same species than what's in the Slot) or by **Human**.

## The Two Chains

**Land:** Mouse ← {Mongoose, Eagle} · Mongoose ← {Eagle, Leopard} · Leopard ← {Bear} · Eagle ← *nothing* (Swarm+1 or Human only) · Bear ← {Elephant} · Elephant ← {Bee} · Bee ← {Bear}

**Sea:** Fish ← {Mongoose*, Octopus, Eagle*} · Octopus ← {Seal} · Seal ← {Polar Bear} · Polar Bear ← {Orca} · Orca ← {Stingray} · Stingray ← {Orca}

*(Mongoose and Eagle are Land cards reaching across — the only Crossover in the game.)*

Eagle and Leopard are **siblings**, not sequential — both are direct predators of Mongoose, but Eagle does not beat Leopard, and Leopard does not beat Eagle.

Orca and Stingray are a **closed pair** — Orca is Stingray's only predator, and Stingray is Orca's only predator. This is deliberately simpler than the Land loop (Bee/Elephant/Bear) since there's no real third animal that credibly threatens a Stingray.

## The Wildcard — Human
Outside both chains entirely. Alone, wins any Slot, including an Apex. Can also stand in as a wild copy inside a swarm (2 real Elephants + 1 Human plays as three). Flat 3 copies in the Pool regardless of player count — Human actually gets *proportionally scarcer* as the table grows, since Deal size and every other tier's copy count scale up with player count and Human doesn't.

## Components — Pool Sizing

Copies scale with player count (n). Apex and Near-Apex scale conservatively since they're the scarce, contested resource; the bottom of each chain scales hardest since those cards get burned fast:

| Tier | Formula | n=3 | n=4 | n=5 | n=6 |
|---|---|---|---|---|---|
| Elephant, Orca (Apex) | 2n each | 6 | 8 | 10 | 12 |
| Bear | 3n | 9 | 12 | 15 | 18 |
| Polar Bear | 2n | 6 | 8 | 10 | 12 |
| Bee | 3n | 9 | 12 | 15 | 18 |
| Stingray | 2n | 6 | 8 | 10 | 12 |
| Eagle | 3n | 9 | 12 | 15 | 18 |
| Leopard, Seal, Octopus, Mongoose | 3n each | 9 | 12 | 15 | 18 |
| Mouse, Fish | 4n each | 12 | 16 | 20 | 24 |
| Human | flat | 3 | 3 | 3 | 3 |
| **Pool total** | | **114** | **151** | **188** | **225** |
| **Dealt (15/player)** | | 45 (39.5%) | 60 (39.7%) | 75 (39.9%) | 90 (40%) |

Stingray is deliberately capped below Bee (2n vs 3n) — Bear can absorb a bump alongside Bee because it's an independently-supplied card, but Orca is Stingray's *only* counter and stays apex-scarce on purpose, so flooding Stingray at the same rate would just recreate the "no real answer" problem at the bottom instead of the top.

## Setup & Match Structure
1. **Build the Pool** for the player count using the table above, shuffle, and Deal 15 cards to each player. The remainder is the Reserve and stays out of play for this Round (no drawing yet — a candidate for a future setting).
2. **First Lead of the Match:** whoever holds a Giant-Killer (Bee or Stingray) opens. Tied on count → whoever holds the most Giant-Killers total. Still tied → cut for it.
3. **An Encounter:** the Leader throws a Volley — any cards they choose, grouped into Slots. Going clockwise, each player must either Pass or fully Answer (Beat every Slot at once — no partial coverage).
4. Once everyone else has Passed since the last Volley, that player Holds the Encounter, the Volley goes to the Watering Hole, and they Lead the next Encounter — with a Volley made of a single species only.
5. **Round ends** when a player empties their hand.
6. **Status Ladder:** rank finishers Apex Predator (1st) down to Runt of the Litter (last). Before the next Deal, the Runt hands over their best card(s) and the Apex Predator returns their worst.
7. **Next Round's Leader:** the Apex Predator from the previous Round leads first — the earned privilege of being on top, on the theory that a real predator doesn't wait to be challenged.

## Design Notes
- Adjacency instead of rank is the load-bearing decision in this whole redesign — it's not just more realistic, it's what makes track-locking, Crossover, and the Giant-Killer specials all fall out of one rule instead of three.
- Cutting the Hitchhiker/Mimic mechanic held up under scrutiny: Human already does both of its jobs (stand-in for an Apex, filler for a swarm), so it wasn't pulling its own weight.
- The Pool/Deal split (big pool, ~40% dealt, no draw yet) deliberately introduces variance — a real Deal can land zero Humans, or leave 7 of 8 Orcas sitting in the Reserve. That's a feature for now; a draw-on-Pass rule is the natural next lever if games feel too static.
- Winner-leads-next does compound the Apex Predator's advantage on top of the card exchange — intentional for now, flagged as the one rule most likely to get revisited after a few playtests.

## Open Questions for Next Pass
- Tiebreak for first Lead (most Giant-Killers, then cut) hasn't been playtested — may need a simpler rule if it comes up often.
- Whether draw-on-Pass (or any Reserve-refill) gets added as a base rule or stays a setting.
- Winner-leads-next vs. loser-leads-next — worth testing both.
