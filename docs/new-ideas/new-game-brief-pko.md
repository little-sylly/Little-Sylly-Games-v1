# New Game Brief — Pecking Order
**Document type:** Phase 1 — Design Brief (non-technical)
**Abbreviation:** `pko`
**Status:** Draft v7 — Balance pass (31 July 2026). Eagle `2n → 1.5n` and Poacher `flat 3 → one per player` (paired counter-levers: Eagles in play drop 3.3 → 2.0 at n=4 while their only counter rises, taking the counter-to-Eagle ratio from 0.36 to 0.67). Hoard Size default **12**, options `10 / 12 / 15` (20 dropped). Pool totals recomputed: **110 / 146 / 183 / 219**. Stated Match length corrected 15–25 min → **25–35 min**. See §9 for the new dealt-ratio constant (~33%, down from ~40%).

*Draft v6 — Claude Code review pass (31 July 2026).* Rules holes closed: **one card per Mark slot** is now an invariant, per-slot **Swarm is cut** (Stampede is the sole same-species mechanic), **Poacher is solo-only** (cannot pad a Stake or satisfy a Stampede threshold), Eagle's dead-end accepted as designed with copies reduced to `2n`, first Leader of a Match confirmed random. **Force of Nature (§7) deferred to Phase 2** — v1 ships the core loop only. Challenge builder reduced to two tap-based input methods (no drag). §14 samples rewritten against the corrected rules.

*Draft v5 — Card reference system, chain diagram, How to Play, end screen, sound design, all fixes from Gemini review, final terminology/render-seam cleanup, default art upgraded to fully illustrated at v1 (see §9A, §16), Great Reversal edge-case flagged intended, Alpha-vs-Stampede conflict resolved.*

---

## 1. Identity

| Field | Answer |
|-------|--------|
| **Full game name** | Pecking Order |
| **Short nickname / abbreviation** | `pko` |
| **One-sentence tagline** | Know the food chain. Become the Apex. |
| **Thematic universe** | The wild — predator/prey hierarchy, territorial dominance, the drama of survival. Raw nature, not a scientist's lab. No documentary framing — just the brutality of the food chain itself. |
| **Emoji / icon** | 🐘 |
| **Brand colour preference** | `yellow-800` (deep amber-brown — earthy, savanna, distinct from NAT's lime and all other suite colours) |

---

## 2. The Players

| Field | Answer |
|-------|--------|
| **Player count range** | 3–6 |
| **Teams or individuals?** | Individuals — every player for themselves |
| **Are there different roles?** | No — all players have the same role |
| **Is any information hidden from some players?** | Yes — each player's Hoard is private. Active Marks are public. |
| **Minimum meaningful player count** | 3 — works at 3 but the Retreat/rejoin tension is richer at 4+ |

No distinct roles. All players are predators competing for dominance within the same ecosystem.

---

## 3. The Core Loop

**In one sentence — what does a player DO on their turn?**
Either Stake a set of Marks to open an Encounter, respond to the current Marks by playing a Challenge that beats every Mark, or Retreat and wait for a better moment.

> **THE INVARIANT — one card per Mark slot, always.**
> A Mark is exactly one card. It is never a stack. Every Challenge answers each Mark with exactly one card, and a Stampede that replaces the board produces N+1 *separate* single-card Marks. There is no multi-card slot anywhere in the game, at any point, under any event. Every UI, packet, and validation rule can rely on this.

**What is the central tension or fun moment?**
The moment someone goes Unchallenged — a Challenge that nobody at the table can answer. The secondary tension: knowing which animal beats which — the food chain is the skill, not the card count.

**What type of game is this closest to?**
Climbing / shedding card game (same family as Big Two / Dou Dizhu / Pass), but with an adjacency-based predator chain instead of numeric rank, and per-Mark response instead of shape-matching.

**Walk through one complete Encounter step by step:**

1. *(Phase 2 — Force of Nature only.)* Before each Encounter, if Force of Nature (Sylly Mode) is ON, a **Force of Nature event screen** is shown to all players. The event applies immediately and remains displayed throughout the Encounter.
2. The active Leader **Stakes** — plays one or more cards of a **single species**, each card becoming its own Mark. Staking Fish ×3 creates three separate Fish Marks. A Poacher cannot be Staked as a wild copy of a species (see The Poacher below).
3. Going clockwise, each player must either **Challenge** or **Retreat**.
   - A **Challenge** must beat every active Mark, using exactly one card per Mark. A card beats a Mark if it is one of that Mark's listed predators (adjacency — §9), or if it is a **Poacher**, which wins any single Mark outright.
   - Alternatively, when **every active Mark is the same species**, a player may **Stampede** — see below. A Stampede is a board-level play and does not use the Challenge builder.
   - A **Retreat** means sitting out this turn — the player is NOT locked out and may re-enter later in the same Encounter.
4. A successful Challenge replaces the active Marks — previous Marks go to the Watering Hole. The board is now the Challenger's cards, still one card per Mark.
5. Once every other player has Retreated since the last Challenge, that player goes **Unchallenged** — wins the Encounter, all Marks go to the Watering Hole, they become the next Leader.
6. A **Clash** ends when any player empties their Hoard — that player scores 1 point.

**Stampede — the only same-species mechanic:**
- **Condition:** every active Mark is the same species. (Always true immediately after a Stake, since a Stake is single-species. After that it's true only when a Challenger happened to answer with all one species.)
- **The play:** N+1 copies of that same species, where N is the number of active Marks.
- **The result:** all active Marks go to the Watering Hole and the board becomes **N+1 separate single-card Marks** of the Stampede species. The board grows by exactly one Mark per Stampede.
- **Poachers do not count** toward the N+1 threshold. Only real copies of the species do. *(Phase 2: Mimics do count.)*
- Triggered via the Stampede button, which only appears when the condition is met and the player holds enough copies. Bypasses the Challenge builder entirely.
- Mixed-species Marks can only be answered card-for-card by adjacency or Poacher — no Stampede available.

**Worked example.** Marks are 🐟 | 🐟 | 🐟. A Stampede needs Fish ×4, and produces 🐟 | 🐟 | 🐟 | 🐟 — four Marks, each one card. The next player must now beat four Marks card-for-card, or Stampede again with Fish ×5.

**The Poacher — solo only.** A Poacher wins any one Mark outright, no predator relationship required. That is *all* it does. It cannot be Staked as a wild copy of a species, and it cannot help satisfy a Stampede threshold. There are only 3 in the default Pool; it is a scalpel, not a filler.

**The dead ends are real.** Eagle has no predator. On a mixed board, an Eagle Mark can only be answered by a Poacher — nothing else in the game touches it. This is intended: Eagle is the premium card, and the Stampede route (Eagle ×N+1 against an all-Eagle board) is the only way to answer it without burning a Poacher.

Because an Eagle anywhere in a Challenge makes the *entire* board answerable only by a player holding a Poacher **and** valid predators for every other Mark simultaneously, an Eagle is close to a guaranteed Unchallenged — and going Unchallenged is what lets you lead and dump your bottom-tier cards. That made Eagle the most decisive card in the game by a distance. Two paired levers fix it (v7 balance pass):

- **Eagle `1.5n`** (5 / 6 / 8 / 9 copies) — down from `2n`, and originally `3n`
- **Poacher default `one per player`** — up from a flat 3, so the only counter scales with the table

At n=4 this takes Eagles in play from 3.3 to **2.0** and the counter-to-Eagle ratio from 0.36 to **0.67**. Eagle stays the card everyone wants; it stops being the card that decides a third of all Encounters.

**Is there anything simultaneous?**
No — strictly sequential, clockwise turn order.

**How does the phone move?**
Each player uses their own device (MDLM). Non-active players are in read-only mode.

---

## 4. Winning

| Field | Answer |
|-------|--------|
| **How does a Clash end?** | Any player empties their Hoard — scores 1 point |
| **How does a Match end?** | First to reach the target Clash wins (default: 3) |
| **Are ties possible?** | Yes — if two or more players simultaneously reach the target score (e.g. both at 2 pts and both score from an Extinction Event trigger) they all win together |
| **Roughly how long?** | **25–35 minutes** for a 3-Clash Match at 4 players (~8 Encounters per Clash, 8–13 min per Clash). Scales up with player count and with the Clashes to Win / Hoard Size settings — 5 Clashes is ~45 min. *(Corrected in v7: the original 15–25 estimate did not survive the arithmetic. Force of Nature, when it ships, adds 5–10 min.)* |

---

## 5. Scoring

| What happened | Who scores | How many | Notes |
|--------------|------------|----------|-------|
| Player empties their Hoard first | That player | 1 point | Ends the Clash immediately |
| Extinction Event wipes a player's Hoard to zero | All players whose Hoard hit zero | 1 point each | Multiple players can score on the same Clash |
| All other outcomes | Nobody | 0 | |

**Ties at Match level:** if two or more players simultaneously reach the target score, they all win — no tiebreak, no playoff.

**Extinction Event Clash-opener tiebreak:** if multiple players scored on the same Extinction Event trigger, the next Clash opener is resolved by most total Match points, then random.

---

## 6. Settings

| Setting name | What does it change? | Options | Default |
|---|---|---|---|
| Clashes to Win | Target Clash wins to end the Match | 3 / 5 / 7 | 3 |
| Hoard Size | Cards dealt per player at start of each Clash | **10 / 12 / 15** | **12** |
| Poacher Cards | Human wildcard copies in the Pool | None / Three / **One Each** | **One Each** |
| Scavenge on Retreat | Draw 1 card from Reserve when Retreating | OFF / ON | OFF |
| ✨ Force of Nature *(Phase 2)* | Sylly Mode — random events before each Encounter | OFF / ON | OFF |

**Notes:**
- Pool sizing scales with player count automatically — not user-facing
- **Poacher Cards** pill labels are **None / Three / One Each** — never the internal `0 / 3 / 1n`. "One Each" scales the Eagle counter with table size and is the v7 default
- **Hoard Size 20 was dropped in v7.** At 20 cards with Clashes to Win 7, a Match ran past two hours. The remaining range (10 / 12 / 15) spans roughly 20 / 27 / 35 minutes at 3 Clashes and 4 players
- **Scavenge on Retreat is a trade, not a freebie.** Drawing a card gives you options for later Encounters, but this is a race to *empty* your Hoard — every card you scavenge is one more you must shed to win. Turn it on for a longer, more tactical game; leave it off for a sprint. *(The setting description in the UI must make this explicit — the name reads like a pure reward and it isn't.)*
- Scavenge on Retreat has no effect if the Reserve is empty
- Force of Nature not recommended for first-time players

---

## 7. Sylly Mode — Force of Nature ✨

> ⚠️ **PHASE 2 — NOT IN v1.**
> This entire section is deferred. v1 ships the core climbing loop only; Force of Nature, all 10 events, the Mimic card, and the FoN event screen come as a second phase once the base game has been playtested. The rationale: ten rule-mutating events (three of which rewrite the beat graph, redistribute every Hoard, or wipe a species mid-Clash) are a multiplier on a foundation whose balance — Eagle scarcity, Mouse/Fish dead weight, the Stampede economy — is still unproven.
>
> The section is left intact as the Phase 2 design record. **Known issues to resolve before it is spec'd** (raised in the v6 review, deliberately not fixed here):
> - **Carrion can un-win a Clash** — if a hand-emptying Challenge is followed by keeping beaten Marks, the Hoard is no longer empty. Needs an explicit ordering (win-check before Carrion, or Carrion unavailable on a hand-emptying Challenge).
> - **The Deluge / The Dry Season skip can loop** — if the redrawn event is also unplayable, it skips again. Needs an exclusion on the just-failed event and a cap on consecutive skips.
> - **Extinction Event awards a point for being wiped out**, and can hand the Match to a player who played no cards that Clash — while The Culling explicitly *cannot* win a Clash. That inconsistency wants a decision.
> - **Dark Forest is the most expensive event here for the smallest real effect** — it needs Marks routed off the public channel, an existence-only public signal, hidden Mark counts, and permanently per-player-redacted Trail views, yet every player sees the full Marks the moment it's their turn. Worth re-justifying or replacing with something cheaper. Note also that the host device holds all state regardless, so the concealment is UI-level for one player no matter what is built.
> - **Hoard Size contradiction** — §7's Invasive Mimicry says "+5 after their initial deal (default Hoard = 20)", which assumed the old 15-card default. As of v7 the default is **12**, so the FoN opening Hoard would be **17**, not 20. Decide when FoN is spec'd whether the +5 is still the right boost against a 12-card base.
> - **Mimic is the sole copy-count wild** now that Poacher is solo-only. Confirm the asymmetry is deliberate.
> - **Alpha is compatible with the v6 invariant** ✅ — the Alpha and the card that beat it both remain as separate single-card Marks, so "one card per Mark" still holds.

**Thematic name:** Force of Nature

**In one sentence:** At the start of every Encounter, a random event from the wild reshapes the rules — flood the field, cull the weak, or plunge the table into darkness.

**How it works:**
- Every Encounter begins with a Force of Nature event screen shown to all players — all must confirm before play begins
- The current event label is displayed persistently on the main play screen throughout the Encounter
- The first Encounter of every Clash always triggers **Invasive Mimicry** (fixed opener)
- All subsequent Encounters draw randomly from the 9 random events pool, all weighted equally
- Events apply before the Leader Stakes and last for that Encounter only unless otherwise noted

---

### Fixed Opener — Invasive Mimicry

Triggers at the start of Encounter 1 of every Clash in Force of Nature mode.

- **Mimic** cards (2n copies, n = player count) are added to the Reserve before the Clash begins
- Each player draws **+5 cards** from the Reserve after their initial deal (default Hoard = 20)
- Hoards are not refilled between Encounters — the +5 is a one-time boost per Clash
- **Mimic rules:**
  - Cannot be played alone as a Stake or Challenge
  - Acts as a wild copy of any species — can pad a single-species Stake or count toward a Stampede threshold (the Poacher can do neither)
  - **Cannot copy a Poacher (Human)** — Mimics only copy animal species
  - If a player holds only Mimics, they may Stake them but Mimics sit below all animals — beaten by everything including Mouse and Fish
  - Mimics exist only in Force of Nature Clashes — not part of the standard Pool

---

### The 9 Random Events

**1. The Culling**
Each player discards from their Hoard the species they hold the fewest copies of.
- Trail log: turn-order entries — "A discarded 🐘🐘, B discarded 🦅" etc., starting with the Leader
- If a player holds only one species, nothing is discarded — The Culling cannot trigger a Clash win
- If two or more species are tied for fewest, the player chooses which to discard
- Discarded cards go to the Watering Hole

**2. The Great Reversal**
The entire predator chain flips for this Encounter only.
- Every animal now beats what it was previously beaten by, and vice versa
- Stampede still applies normally; Poachers and Mimics are unaffected
- Chain returns to normal at the start of the next Encounter
- **Intended, not a bug:** this also flips dead-end and apex species. Eagle (normally unbeatable except by a Poacher or an all-Eagle Stampede) becomes beatable by Mouse and Mongoose and beats nothing. Elephant and Orca (normally apex, beaten only by their Giant-Killer) become the weakest cards on the table. This is deliberate chaos-event behaviour — do not "fix" it as an inconsistency during implementation.

**3. The Deluge**
Only Sea track cards may be played this Encounter.
- Land cards cannot be used as Marks or in Challenges; Poachers and Mimics are unaffected
- If the Leader has no valid Sea cards (or Poachers/Mimics), the opening Stake passes clockwise to the next player who can play
- If no players have valid cards, the Encounter is skipped entirely — a new event fires and leadership reverts to the original Leader from the start of the skipped Encounter

**4. The Dry Season**
Only Land track cards may be played this Encounter.
- Same skip rules as The Deluge — if no players can play, Encounter skips, new event fires, leadership reverts

**5. Extinction Event** *(once per Clash maximum)*
The species with the fewest total copies remaining across all players' Hoards combined is wiped — discarded from every Hoard simultaneously.
- Trail log: turn-order entries — "A discarded 🐘🐘, B discarded 🦅" etc., starting with the Leader
- If two or more species are tied for fewest, all tied species are wiped
- If any player's Hoard hits zero, they score 1 point (multiple players can score simultaneously)
- Extinction Event is removed from the random draw pool after firing — cannot trigger again in the same Clash
- Discarded cards go to the Watering Hole

**6. Migration**
Every player passes their entire Hoard to the player on their left before the Encounter opens.
- Trail log: single entry — "All players migrated Hoards (left)" — no per-player breakdown needed
- The pass happens before the Leader Stakes — the Leader may receive an entirely different Hoard

**7. Dark Forest**
Marks are hidden in the Dark.
- The active player (whose turn it is) sees the current Marks in full on their device
- The player who played the current Marks can also see them until those Marks are beaten
- All other players: card identities, Mark count, and actions (Stake/Challenge/Retreat) are hidden — they cannot tell if another player Challenged or Retreated, or how many Marks are on the table
- The Unchallenged resolution is revealed to all players — since everyone must Retreat for the Encounter to end, all see the winning Marks
- No post-Encounter reveal — redaction is permanent in each player's Trail log
- **Trail log — per-player redacted view:**
  Each player's Trail shows their own actions in full with `[saw: ...]` annotations. Everything else is redacted. Example from Ava's perspective:
```
Enc 4  🌑 Dark Forest
  Cal    ______
  Dana   ______
  Ava    Challenges: 🐘🐘  [saw: 🐝🐝]
  Ben    ______
  Cal    ______
  Dana   ______
  Ava    Retreats         [saw: 🐘🐘🐘]
  Ben    ______
  Cal    Unchallenged: 🐘🐘🐘
```

**8. Alpha**
One random Mark is designated the Alpha at the start of the Encounter — visibly announced and flagged on screen (crown + glow indicator).
- When the Alpha Mark is beaten, it does NOT go to the Watering Hole — it stays as a plain Mark
- **The Challenger's card also stays** — it does not go to the Watering Hole either; it remains on the table as a new plain Mark alongside the survived Alpha
- This is the compounding mechanic: every time the Alpha is beaten, one more card joins the active Marks (the survived Alpha + the card that beat it both stay)
- Alpha status is immediately removed from the beaten card
- Alpha status is then visibly reassigned to a new random Mark from the current active set (including both just-survived cards) — reassignment is announced on all screens
- The Alpha card retains no memory of its status — it is a plain Mark until randomly selected again
- If Marks reach a state where no player can beat all of them, the Encounter resolves as Unchallenged for the last successful Challenger
- **Alpha vs Stampede ruling:** a Stampede replaces the entire board wholesale and sends all current Marks to the Watering Hole — including the Alpha Mark. The Alpha's "survives one beat" protection does not apply against a Stampede; Alpha status is wiped from the Encounter along with the rest of the board. (A Stampede is only possible when all active Marks are the same species, so this only matters when the Alpha happens to be sitting among a homogeneous set.)

**9. Carrion**
After a successful Challenge (all Marks beaten), the Challenger may keep any or all beaten Marks in their Hoard instead of sending them to the Watering Hole.
- Optional and per-card — player chooses which to keep and which to discard normally
- Strategic use: scavenging Giant-Killers (Bee, Stingray), Eagles, or bulk low-tier cards for future Stampedes
- Keeping cards grows the Hoard — this can delay emptying it and delay the Clash win condition

---

### Force of Nature — Additional Vocabulary

| Term | Meaning |
|---|---|
| Invasive Mimicry | Name of the fixed opener event — Mimic cards enter the ecosystem and each player draws +5 |
| Mimic | FoN wild card — stands in as a copy of any species; cannot be played alone; cannot copy Poachers |
| Alpha | The designated Mark that survives being beaten (alongside the card that beat it) before losing its status |

---

## 8. Thematic Vocabulary

| Generic term | Pecking Order calls it |
|---|---|
| Round | Clash |
| Score / points | Shown as point count ("2 pts") |
| Game over screen | The Hierarchy |
| Play again | New Clash |
| Quit | Abandon Territory? |
| Settings overlay title | The Conditions 🌿 |
| Sylly Mode name | Force of Nature |
| Hand (cards held) | Hoard |
| Opening play | Stake |
| Response play | Challenge |
| One trick / exchange | Encounter |
| Card slot to answer (always exactly one card) | Mark |
| Board-clear beat — N+1 of the Marks' own species, when every Mark is that species | Stampede |
| Pass | Retreat |
| Win the Encounter | Unchallenged |
| Discard pile | Watering Hole |
| Undealt pool | The Reserve |
| Draw on Retreat (setting) | Scavenge |
| Human wildcard | Poacher |
| FoN wild card | Mimic |
| FoN fixed opener event | Invasive Mimicry |
| Giant-Killer flip ability | Ambush |
| Upper locked zone of each chain | Domain |
| Lower shared zone | Common Ground |
| Match log | The Trail |
| Finish position ladder | The Hierarchy |
| 1st place | Apex Predator |
| Last place | The Bottom Feeder |
| Alpha event's designated Mark | Alpha |
| FoN event — keep beaten Marks | Carrion |

---

## 9. Word Bank & Content

This game does not use `words.json`. It uses a fixed deterministic card set stored in `data/pko-data.json`.

**The card set:**

Land chain: Mouse, Mongoose, Leopard, Eagle, Bear, Elephant, Bee
Sea chain: Fish, Octopus, Seal, Polar Bear, Orca, Stingray
Wildcard: Human (Poacher)
Force of Nature only: Mimic

### The Chain — the complete, authoritative `beaten_by` table

This is the whole rules engine. Read as "**X** is beaten by **Y**" — nothing else in the game beats X except a Poacher, or a Stampede when the whole board is X.

| Card | id | Track | Beaten by | Beats (derived) |
|---|---|---|---|---|
| Mouse | `mouse` | Land | Mongoose, Eagle | *(nothing)* |
| Mongoose | `mongoose` | Land | Eagle, Leopard | Mouse, Fish |
| Leopard | `leopard` | Land | Bear | Mongoose |
| Eagle | `eagle` | Land | *(nothing)* | Mouse, Mongoose, Fish |
| Bear | `bear` | Land | Elephant | Leopard, Bee |
| Elephant | `elephant` | Land | Bee | Bear |
| Bee | `bee` | Land | Bear | Elephant |
| Fish | `fish` | Sea | Mongoose, Octopus, Eagle | *(nothing)* |
| Octopus | `octopus` | Sea | Seal | Fish |
| Seal | `seal` | Sea | Polar Bear | Octopus |
| Polar Bear | `polar_bear` | Sea | Orca | Seal |
| Orca | `orca` | Sea | Stingray | Polar Bear, Stingray |
| Stingray | `stingray` | Sea | Orca | Orca |
| Poacher | `human` | Wild | *(nothing)* | *(any one Mark, outright)* |
| Mimic *(Phase 2)* | `mimic` | Wild | everything | *(nothing — wild copy only)* |

**The four things that are not obvious and must not be "tidied" during implementation:**

1. **Eagle has no predator.** It is a dead-end branch, not an apex — it sits at the Mongoose level and simply has nothing above it. On a mixed board only a Poacher answers it. Intended (see §3).
2. **Eagle and Leopard are siblings, not sequential.** Both are direct predators of Mongoose. Eagle does *not* beat Leopard, and Leopard does *not* beat Eagle.
3. **Orca and Stingray are a closed pair.** Orca is Stingray's only predator and Stingray is Orca's only predator. Deliberately simpler than the Land loop (Bee → Elephant → Bear → Bee); there is no credible third threat to a Stingray.
4. **Mongoose and Eagle are the only cross-track reach in the game.** Both beat Fish. Nothing else crosses. Track-locking is therefore not a separate rule — it falls out of the table for free, since no Sea card lists a Land predator and no Land card above Mongoose lists a Sea one.

**Data file structure — one entry per animal:**
```json
{
  "id": "elephant",
  "name": "Elephant",
  "emoji": "🐘",
  "track": "land",
  "beaten_by": ["bee"],
  "special": "giant-killer-target",
  "copy_formula": "2n",
  "force_of_nature_only": false
}
```

**`beaten_by` is the single source of truth.** The `beats` column above is shown for readability only and is **not** stored in the data file — it is derived at load by inverting `beaten_by`. Storing both guarantees they drift apart.

**Copy formulas (n = player count):**

| Animal | Formula | Notes |
|---|---|---|
| Elephant, Orca | 2n each | Apex |
| Bear | 3n | Bee's loop counter |
| Polar Bear | 2n | |
| Bee | 3n | Giant-Killer — Land |
| Stingray | 2n | Giant-Killer — Sea |
| Eagle | **1.5n** *(rounded up: 5 / 6 / 8 / 9)* | Dead-end branch — **3n → 2n in v6, → 1.5n in v7.** Eagle answers only to a Poacher on a mixed board, which made it the most decisive card in the game; it is now scarcer than the apexes. Paired with the Poacher increase below |
| Leopard, Seal, Octopus, Mongoose | 3n each | |
| Mouse, Fish | 4n each | Bottom tier — these beat nothing and can only leave a Hoard via a Stake or a Stampede |
| Human (Poacher) | 0 / flat 3 / **n** | Controlled by the Poacher Cards setting. **Default is `n` (One Each) as of v7** — the Eagle counter now scales with the table |
| Mimic *(Phase 2)* | 2n | Force of Nature Clashes only |

**Pool totals (with the default `n` Poachers, excluding Mimics):**

| n | Pool | Dealt (12×n) | Reserve | Dealt ratio |
|---|---|---|---|---|
| 3 | 110 | 36 | 74 | 32.7% |
| 4 | 146 | 48 | 98 | 32.9% |
| 5 | 183 | 60 | 123 | 32.8% |
| 6 | 219 | 72 | 147 | 32.9% |

**On the dealt ratio.** The original design targeted ~40% of the Pool dealt so the game "feels the same size relative to the table" at 3p or 6p. What actually matters there is that the ratio is **constant across player counts** — and it still is, at 32.7–32.9%. The *level* dropped from ~40% to ~33% as a side effect of Hoard Size 15 → 12. More of the Pool now sits unused in the Reserve, which makes each Clash slightly swingier: a given Clash might see very few Orcas, or no Poacher at all. That is an accepted consequence of the length fix, not an oversight.

**What the v7 levers actually did, at n=4:**

| | v6 (Eagle 2n, 3 Poachers, Hoard 15) | v7 (Eagle 1.5n, n Poachers, Hoard 12) |
|---|---|---|
| Eagles in play per Clash | 3.3 | **2.0** |
| Poachers in play per Clash | 1.2 | **1.3** |
| P(a hand holds an Eagle) | 57% | **40%** |
| Counter-to-Eagle ratio | 0.36 | **0.67** |

Note that "One Each" barely moves at n=4 (3 → 4 Poachers) — it does its real work at n=5 (3 → 5) and n=6 (3 → 6), which is exactly where the extra Eagles also live. The two levers scale together.

**Bottom-tier sanity check (n=4):** Mouse-killers (Mongoose 12 + Eagle 6 = 5.9 in play) still slightly outnumber Mice (5.3 in play), so a Mouse Stake stays answerable rather than becoming a free Unchallenged. Mouse + Fish remain ~21.7% of a hand — dead weight that can only be shed by leading — and a player still leads roughly twice per Clash, which is just enough to clear it.

---

## 9A. Custom Visual Assets

| Field | Answer |
|-------|--------|
| **Repeated visual primitive** | Animal card |
| **Distinct faces** | 15 (13 animals + Poacher + Mimic) |
| **Skinnable?** | Yes — see Theme Reskins below |
| **Default look for v1** | Full illustrated art for all 15 card faces (NanoBanana-generated, one consistent style — see Art Style Checklist companion doc). Track indicator (🌿 / 🌊) as a corner pip over the art. Poacher: dark/charcoal treatment. Mimic: patterned/shifting treatment. Alpha state: crown + glow overlay. Card back: illustrated, matching the default style. |

All card DOM routed through a single `pkoRenderCard(id, opts)` seam from day one. Face-down variant required (`pkoRenderCardBack()`). Alpha state passed as `opts.alpha = true`.

**Default art is a core asset, not a skin pack.** The illustrated default set ships as part of the base install — bundled under the game's own asset folder, added to `PRECACHE_URLS`, normal SW version bump — the same pipeline as every other game's core files. `pkoRenderCard()` renders this art directly as its normal output; there is no emoji fallback at launch. This is distinct from the Theme Reskins below, which use the cartridge/asset-pack system (`data/packs/`) precisely because those are optional, swappable, and removable — deliberately left out of `PRECACHE_URLS` and runtime-cached instead. Default art being illustrated doesn't change that split: it's still the seam's built-in default, not a pack.

### Theme Reskins

Pecking Order supports theme reskin packs — alternative names, emojis, and artwork mapped 1-to-1 onto the fixed card ids. The chain structure (beaten_by / beats) is identical across all skins — a reskin changes the costume, not the skeleton.

**Card ids are fixed across all reskins.** `elephant` always maps to the Land Apex slot; `bee` always maps to the Land Giant-Killer; etc. A reskin is a display layer only — the game logic never changes.

**Planned reskin themes (post-v1):**
- **Aussie Fauna** — e.g. Fish → Barramundi, Mouse → Sugar Glider, Bear → Wombat, Elephant → Kangaroo, Bee → Platypus (venomous bill as the Ambush), etc. Ecological accuracy secondary to recognisability and fun.
- **Monsters** — e.g. Fish → Piranha, Octopus → Kraken, Orca → Megalodon, Elephant → Mammoth, Bee → Giant Hornet, etc.
- **Photoreal** — considered for the default style and set aside as a possible future cartridge skin instead (see Art Style Checklist companion doc) — it reads as a heavier/pricier register than the rest of the suite has used so far, so it's a better fit as an optional swap-in than the v1 default.

**Mixed-skin multiplayer:** players in the same lobby can each select a different skin — one player on Aussie Fauna, another on Monsters, the rest on Default — and play together seamlessly, since all skins share the same card ids and chain logic. This follows the same pattern as the existing secret mode in the suite.

**Implementation note for Claude Code:** the render seam (`pkoRenderCard(id, opts)`) must accept a `skin` parameter from day one. v1 ships with Default skin only; additional skins are loaded as data packs with no game-logic changes required.

---

## 10. Multiplayer Classification

| Field | Answer |
|-------|--------|
| **Multiplayer version** | Each player on their own device (MDLM) — Hoards are private |
| **Private information** | Each player's Hoard. Active Marks are public. Trail is public except during Dark Forest (per-player redacted). |
| **Simultaneous actions?** | No — strictly sequential |
| **Device locking?** | Yes — non-active players in read-only mode |
| **PTP mode?** | Deferred — not v1 |

---

## 11. Screens — Plain English List

1. **Game menu** — title, Play CTA, How to Play, Settings, Back to the Box
2. **Player setup** — player count selector, name inputs
3. **Multiplayer mode screen** — shared template (Host / Join)
4. **Lobby host screen** — shared template, room code display
5. **Lobby join screen** — shared template, room code entry
6. **Hoard screen** — private per-player at start of each Clash; shows dealt cards. *(Phase 2: in Force of Nature, shows Mimics if drawn during Invasive Mimicry.)* Confirm ready.
7. **Force of Nature event screen** *(Phase 2 — not in v1)* — shown to all players before each Encounter when FoN is ON. Event name, one-line description, confirm button. All players must confirm before play begins. **Review note:** an all-players full-screen confirm before every Encounter is heavy — roughly 5 Encounters a Clash × up to 6 players. Consider a ~2-second auto-advancing banner instead, with the event label persisting on the play screen as §7 already specifies.
8. **Main play screen** — primary game view. Active Marks (centre), Hoard fan (bottom, private), player turn indicator, FoN event label if active, action buttons (active player only: Stake / Challenge / Stampede / Retreat), Trail access, chain diagram button ([?] near Hoard). Read-only for non-active players. In Dark Forest, inactive players see no Mark content, no actions, no Mark count — only that an Encounter is in progress.
9. **Challenge builder** — where the active player assigns cards to Marks before confirming. See §15 for full UI description.
10. **Unchallenged screen** — brief interstitial showing Encounter winner and winning Marks. Auto-advances. In Dark Forest, this is the one moment of full public reveal.
11. **Clash result screen** — Clash winner(s), points scored, Match standings. Next Clash / End Match option.
12. **The Hierarchy screen** — game over. Final standings with shared rank positions for tied players. Apex Predator named (1st). The Bottom Feeder named (last). Clash-by-Clash score grid (players as columns, Clashes as rows). New Clash / Leave options.
13. **The Trail overlay** — accessible from main play screen. Clashes shown as left/right navigable cards. Within each Clash card, Encounters listed top-to-bottom (collapsed by default, expandable per Encounter to show each Challenge turn-by-turn). In Dark Forest Encounters, each player sees their own per-player redacted view with `[saw: ...]` annotations. Most recent Clash shown first.
14. **Chain diagram overlay** (`pko-chain-overlay`) — opened by tapping [?] near Hoard on the main play screen, by tap-hold on any card anywhere in the game, or by inline [?] links in the How to Play screen. Shows both tracks and all predator relationships as a static visual diagram. One diagram per skin pack (art asset). See §16 for layout spec and Gemini mockup prompt.

---

## 12. Open Questions & Design Notes

**Unresolved design questions:**
- 🔴 **What is a Poacher once it's on the board?** A Poacher played in a Challenge wins its Mark and then *becomes* a Mark. Its `beaten_by` list is empty, so as written it is an unbeatable Mark that only another Poacher can answer — which usually ends the Encounter on the spot. Three readings, all defensible, none decided:
  **(a)** it stays as an unbeatable Mark (thematic — "answers to no one" — and with ~1 Poacher in play per Clash it's a dramatic once-a-game moment, not a dominant strategy);
  **(b)** it goes straight to the Watering Hole and the slot it won is removed from the board, shrinking the Mark count by one;
  **(c)** it stays as a Mark but is beatable by anything.
  *Surfaced while replaying the §14 samples against the v6 rules — this must be answered before the tech spec's validation rules can be written.*
- Challenge builder: screen vs overlay — UX decision at Stage 2
- Skin selector UI: where does the player choose their skin — lobby, player setup, or settings? Not designed yet.
- Skin data pack format: not designed yet — post-v1

**Implementation flags for Claude Code:**
- Adjacency chain logic — ID lookup per Mark, not numeric comparison. `beaten_by` is the stored truth; `beats` is derived at load
- **One card per Mark, always** — there is no stacked-slot state to model, render, or serialise. A Mark is a card id, not an array
- Stampede validation — detect homogeneous Marks in real time; show/hide Stampede button accordingly
- Stampede button: appears only when all active Marks are the same species AND the player holds N+1 real copies of that species in Hoard. Tapping highlights the exact cards needed, then requires confirmation before executing
- **Poachers never count toward the Stampede threshold.** A Poacher's only function is winning one Mark outright. It cannot be Staked as a species, cannot pad a Stampede
- Stampede is a **board-level replacement** — it bypasses the Challenge builder entirely and produces N+1 separate single-card Marks
- Dark Forest Firebase state — inactive players must not receive Mark card identity or count data; existence-only signal required
- Dark Forest Trail log — per-player redacted views; only Unchallenged line is universal
- Alpha reassignment — visible announcement on all clients after each beat; `opts.alpha = true` on the card render
- Alpha vs Stampede — a Stampede wipes Alpha status along with the rest of the board (see §7 event 8 ruling); do not attempt to carry Alpha survival through a Stampede
- When an Alpha slot splits, the Challenger's card is always placed immediately to the left of the surviving Alpha Mark.
- Extinction Event simultaneous win — multi-device resolution
- Migration atomicity — full Hoard swap must be simultaneous across all clients
- Force of Nature event pool management — Extinction Event removal mid-Clash, fixed opener logic, skip logic for The Deluge/Dry Season
- Culling/Extinction Event Trail entries — turn-order per-player discard lines starting with the Leader
- Chain diagram overlay (`pko-chain-overlay`) — single overlay opened from three entry points: [?] near Hoard, tap-hold on any card, inline [?] in How to Play; static image per skin
- Card tap (single) → full-face expand only; card tap-hold → chain diagram overlay; these must be distinct gestures
- Card corner component: track pip (data-driven) + emoji/corner-art identifier; accepts `skin` parameter from day one
- Chain diagram nodes use the static per-skin diagram image (§16) — no dynamic rendering function required.


**Out of scope for v1:**
- **Force of Nature entirely (§7)** — the whole Sylly Mode, all 10 events, the Mimic card, and the FoN event screen ship as **Phase 2**. v1 is the core climbing loop only, so the base balance (Eagle scarcity, Mouse/Fish dead weight, the Stampede economy) gets playtested before ten rule-mutating events are layered on an unvalidated foundation
- PTP (pass-the-phone) mode
- Aussie Fauna and Monster skin packs (render seam ships; packs ship later)
- Force of Nature event probability weighting (equal when it ships)
- Status Ladder card-exchange mechanic (dropped)
- ~~Per-slot Swarm~~ and the Mob concept (**Mob stays cut** — not deferred, removed). **Swarm was RESTORED after playtest round 2, July 2026** — see tech spec §7 and §17 D10. The v6 cut was driven by `pko_log1.md` blocker #1 ("a slot holds Mongoose ×2 — does one Leopard beat it, or two?"), an ambiguity that only exists if a slot can hold depth. In the restored form a Swarm's two cards immediately become **one Mark each**, so a slot still holds exactly one card and the question cannot be asked. Mob — cards answering one Mark and *staying* stacked — is the idea that actually created the depth-parity problem, and remains cut.

**Playtest watch items (v7 balance pass — measure these, don't assume them):**
- **Eagle at 1.5n.** Is it still the card that decides an Encounter, or did two levers overshoot? Count how many Encounters end because of an unanswerable Eagle.
- **Match length.** The 25–35 min estimate is a model, not a measurement. Time an actual 3-Clash Match at 4 players.
- **n=3 vs n=6 pacing.** These will play very differently. At n=3 only two opponents must Retreat for Unchallenged, so Encounters resolve fast, Stakes dominate, and the game is swingy. At n=6 more players can answer, Encounters run long, and leadership rotates more. The constant dealt ratio holds card *variety* steady across table sizes but does nothing for *pacing* — the brief already notes 3 works but 4+ is richer; expect 6 to feel slow.
- **Bottom-tier lockout.** A player holding mostly Mouse/Fish who never wins an Encounter cannot shed ~22% of their hand and will Retreat repeatedly. Watch for anyone sitting out most of a Clash.

**General notes:**
- Pool rebuilt fresh each Clash
- Hoard Size setting overrides the 12-card default deal; does not change the Pool formula (so changing it changes the dealt-to-Pool ratio — see §9)
- Poacher Cards setting overrides the default Human count in the Pool
- *(Phase 2)* In Force of Nature, Mimics added to Reserve before every Clash (Invasive Mimicry fires every Clash as the opener)
- **Leadership:** the first Clash of a Match opens with a **randomly chosen player**. Every subsequent Clash is opened by the previous Clash's winner. *(The "whoever holds a Giant-Killer opens" rule from the early ruleset doc is **dropped** — it required inspecting private Hoards before play and was never carried into this brief.)* *(Phase 2: Extinction Event tied winners resolved by most Match points, then random.)*

---

## 13. Mood & References

| Field | Answer |
|-------|--------|
| **Similar games** | Big Two, Dou Dizhu, Tien Len, Pass (existing LSG game) — adjacency beats instead of numeric rank |
| **Tone** | Tense, strategic, occasionally dramatic. Raw nature — predator/prey drama. Force of Nature adds chaos without losing the theme. |
| **Should NOT feel like** | A children's animal matching game. Not like Natural Selection — NAT owns the biologist/field-notes register; this owns the raw predator/prey drama. |
| **Copy already written** | "Know the food chain. Become the Apex." / "Unchallenged." / "The Hierarchy is decided." / "The Poacher answers to no one." / "A Force of Nature intervened." / "The Alpha holds its ground." / "Darkness falls on the Watering Hole." |

---

## 14. Sample Round

### Standard Mode

**Setup:** 4 players — Ava, Ben, Cal, Dana. 3 Clashes to win. Hoard Size 12. Dealt from the 146-card Pool (98 in Reserve). First Clash leader chosen at random — Ava opens.

**Clash 1, Encounter 1 — adjacency, the Eagle wall, and rejoining after a Retreat:**

**Ava** Stakes: 🐟 | 🐟 | 🐟 *(three Fish — a Stake is one species, and each card is its own Mark)*

**Ben** Challenges: 🦦 | 🦦 | 🐙
*(Mongoose beats Fish, twice. Octopus beats Fish. Mongoose is one of only two cards in the game that reaches across tracks. Valid.)*

**Cal** Retreats — nothing answers a Mongoose except Eagle or Leopard, and he holds neither.

**Dana** Challenges: 🐆 | 🦅 | 🦭
*(Leopard beats Mongoose. Eagle beats Mongoose. Seal beats Octopus. Valid.)*

**Ava** Retreats — she holds a Bear for the Leopard and a Polar Bear for the Seal, but **nothing in the game beats an Eagle**. Only a Poacher would have done it, and hers is gone.

**Ben** Retreats. **Cal** Retreats *(he sat out the last exchange but is free to rejoin — he simply still can't answer)*.

**Dana goes Unchallenged.** 🐆 | 🦅 | 🦭 → Watering Hole. Dana leads Encounter 2.

---

**Clash 1, Encounter 2 — a Stampede, and what it does to the board:**

**Dana** Stakes: 🐟 | 🐟 *(two Fish Marks)*

**Ava** Stampedes: 🐟🐟🐟
*(Every Mark is the same species, so a Stampede is open. Two Marks means she needs three Fish. Dana's two Fish go to the Watering Hole and the board becomes **three separate Fish Marks** — the board grows by exactly one.)*
Active Marks: 🐟 | 🐟 | 🐟
*(Ava could instead have answered card-for-card with two Mongoose. The Stampede costs her one more card but sheds three at once — and in a game about emptying your Hoard, that's the point.)*

**Ben** Challenges: 🦦 | 🦦 | 🐙
*(Three Marks, three cards, one each. Valid.)*

**Cal** Retreats.

**Dana** Challenges: 🐆 | 🐆 | 🦭
*(Leopard beats Mongoose, twice. Seal beats Octopus. Valid.)*

**Ava** Retreats. **Ben** Retreats. **Cal** Retreats.

**Dana goes Unchallenged.** 🐆 | 🐆 | 🦭 → Watering Hole.

*(Encounters 3–5 continue. Ava empties her Hoard at Encounter 5.)*

**Clash 1 Result:** Ava — 1 pt. Standings: Ava 1 / Ben 0 / Cal 0 / Dana 0.
New Pool built. New Hoards dealt. **Ava won Clash 1, so Ava opens Clash 2.**

---

**The Trail — Clash 1 collapsed:**
```
Clash 1  —  Ava (1 pt)
  Enc 5  —  Ava Unchallenged   [empties Hoard]
  Enc 4  —  Ben Unchallenged   🐟 | 🐟 | 🐟 | 🐟 | 🐟
  Enc 3  —  Ava Unchallenged   🐘 | 🐘 | 🐘
  Enc 2  —  Dana Unchallenged  🐆 | 🐆 | 🦭
  Enc 1  —  Dana Unchallenged  🐆 | 🦅 | 🦭
```

**The Trail — Encounter 1 expanded:**
```
Enc 1
  Ava staked       🐟 | 🐟 | 🐟
  Ben challenged   🦦 | 🦦 | 🐙
  Cal retreated
  Dana challenged  🐆 | 🦅 | 🦭
  Ava retreated
  Ben retreated
  Cal retreated
  Dana unchallenged 🐆 | 🦅 | 🦭
```

**The Trail — Encounter 2 expanded:**
```
Enc 2
  Dana staked      🐟 | 🐟
  Ava stampeded    🐟🐟🐟          →  🐟 | 🐟 | 🐟
  Ben challenged   🦦 | 🦦 | 🐙
  Cal retreated
  Dana challenged  🐆 | 🐆 | 🦭
  Ava retreated
  Ben retreated
  Cal retreated
  Dana unchallenged 🐆 | 🐆 | 🦭
```

---

### Force of Nature — Sample Encounters

> ⚠️ **PHASE 2 — not in v1.** These samples describe Force of Nature, which is deferred (see §7 and §12 Out of scope). They are retained as the design record for the Phase 2 brief. They have been brought in line with the v6 core rules (one card per Mark, Stampede as the sole same-species mechanic) but have **not** been re-stress-tested — do that when Force of Nature is spec'd.

**Clash 2, Force of Nature ON.**

**Invasive Mimicry fires** — 8 Mimics added to Reserve (n=4). Each player draws +5. All hold 20 cards.

**Encounter 1 — Invasive Mimicry:**
Cal Stakes: 🐟🐟🐟🃏 *(Fish ×3 + one Mimic standing in as a fourth Fish — four separate Fish Marks)*
*(A Stampede needs Fish ×5. Alternatively answer card-for-card with Octopus/Mongoose/Eagle per Mark. Table scrambles.)*

---

**Encounter 2 — Alpha fires:**
Dana Stakes: 🦦🦦🦦 *(Mongoose ×3 — single species required for opening Stake)*
Alpha randomly assigned to the middle 🦦 — crown + glow on all screens.
Active Marks: 🦦 | 🦦[α] | 🦦

**Ava** Challenges: 🐆 | 🐆 | 🐆
*(Leopard beats Mongoose → discarded. Leopard beats [Mongoose/Alpha] → Mongoose stays, Leopard stays, Alpha removed. Leopard beats Mongoose → discarded.)*
Active Marks: 🐆 | 🐆 | 🦦 | 🐆 *(4 Marks — Alpha reassigns, say to rightmost 🐆)*
Active Marks: 🐆 | 🐆 | 🦦 | 🐆[α] 

**Ben** Challenges: 🐻 | 🐻 | 🐆| 🐻
*(Bear beats Leopard → discarded. Bear beats Leopard → discarded. Leopard beats Mongoose → discarded. Bear beats [Leopard/Alpha] → Bear stays, Leopard stays, Alpha removed.)*
Active Marks: 🐻 | 🐻 | 🐆 | 🐻 | 🐆 *(Alpha reassigned, table now 5 Marks)*
Active Marks: 🐻 | 🐻 | 🐆 | 🐻 [α] | 🐆

*(Cal and Dana: nothing beats this spread cleanly. Ava: no answer for 5 Marks. All Retreat.)*

**Ben goes Unchallenged.** 🐻 | 🐻 | 🐆 | 🐻 | 🐆 → Watering Hole.

**Trail — Encounter 2 (Alpha):**
```
Enc 2  🔱 Alpha
  Dana staked      🦦 | 🦦[α] | 🦦
  Ava  challenged  🐆 | 🐆 | 🐆   Active Marks  🐆 | 🐆 | 🦦 | 🐆[α]
  Ben  challenged  🐻 | 🐻 | 🐆| 🐻   Active Marks  🐻 | 🐻 | 🐆 | 🐻 [α] | 🐆
  Cal  retreated
  Dana retreated
  Ava  retreated
  Ben  unchallenged  🐻 | 🐻 | 🐆 | 🐻 [α] | 🐆
```

---

**Encounter 4 — Dark Forest fires:**
*(All players see the event screen. All confirm. Marks go dark.)*

**Cal** Stakes (hidden to all except Cal) — others see nothing.

**Dana** — it's her turn. She sees the Marks Cal played. She Challenges.
*(Ben and Ava see nothing — they don't know Dana Challenged or Retreated.)*

**Ava** — her turn. She sees the current Marks (Dana's Challenge). She Challenges: 🐘🐘
*(She saw 🐝🐝 when it was her turn.)*

*(Ben — his turn. He sees the Marks Ava played — 🐘🐘. He Retreats.)*

*(Cal — his turn. He sees 🐘🐘 still active. He Challenges — adds a card, now 🐘🐘🐘.)*

*(Dana — Retreats. Ava — she sees 🐘🐘🐘. Retreats. Ben — Retreats.)*

**Cal goes Unchallenged.** 🐘🐘🐘 revealed to all.

**Trail — Encounter 4 (Dark Forest), from Ava's view:**
```
Enc 4  🌑 Dark Forest
  Cal    ______
  Dana   ______
  Ava    Challenges: 🐘🐘      [saw: 🐝🐝]
  Ben    ______
  Cal    ______
  Dana   ______
  Ava    Retreats              [saw: 🐘🐘🐘]
  Ben    ______
  Cal    Unchallenged: 🐘🐘🐘
```

---

**Encounter 5 — The Culling fires:**
```
Enc 5  ✂️ The Culling
  Ava  discarded 🐘🐘
  Ben  discarded 🦅
  Cal  discarded 🐝
  Dana discarded 🐋🐋
```
*(Turn order from Leader — Ava won Encounter 4 so she leads and discards first.)*

---

## 15. Challenge Builder & Hoard UI

This section describes the visual interface for the active player's turn — how they view their Hoard and build a Challenge. This is non-technical guidance for Claude Code's UX implementation.

### Hoard Display

The Hoard is displayed as a horizontal fan of overlapping cards along the bottom of the screen, poker-style.

- **Overlap:** ~60–70% overlap so only the corner indicator of each card is visible except for the rightmost card
- **Corner indicator:** emoji + abbreviated species name (or emoji only if space is tight), mirroring poker card corner pips
- **Auto-sort:** cards auto-arrange by track (Land left, Sea right, Poacher/Mimic rightmost) then within each track by chain position (lowest to highest). Eagles and Bees always cluster at the top of Land; Stingrays sit clearly separate from Sea.
- **Scroll:** horizontal scroll if Hoard exceeds screen width (common in Force of Nature with 20-card Hoards)
- **As cards are assigned:** they lift out of the Hoard fan into the play area above. The fan reflows automatically. Only unassigned cards remain in the fan.

**Gesture map — three gestures, no overlap:**

| Gesture | Action |
|---|---|
| **Single tap** on a Hoard card | Assigns it (Method B) — or, if a Mark slot is selected, assigns it there (Method A) |
| **Single tap** on a card already in the Challenge area | Returns it to the Hoard and reopens that slot |
| **Tap-hold** on any card, anywhere | Opens the chain diagram overlay (§16) |

*(v5 had single-tap doing double duty as "expand to full face" **and** "assign", and tap-hold doing double duty as "chain diagram" **and** "start a drag". Both collisions are resolved above: assignment is the tap, reference is the hold, and drag is cut. To read a card properly, players use the chain diagram or the full-size render in the Marks/Challenge rows — cards are only ever sliver-sized in the fan itself.)*

### Challenge Builder Layout

```text
┌─────────────────────────────────┐
│  ACTIVE MARKS (what you answer) │
│  [🦦] [🐙] [🐙]                 │
│                                 │
│  [ STAMPEDE 🐟×4 ]              │  ← only when every Mark is one species
│                                 │
│  YOUR CHALLENGE                 │
│  [🐆] [🦭] [🦭]                 │  ← exactly one card per slot, always
│   ✓     ✓     ✓                 │
│                    [CONFIRM →]  │
│                                 │
│  ══ YOUR HOARD ══               │
│  🐆🐆 🦅 🐻 🐘 🐝🐝 🦭🦭        │
│              [← RESET]          │
└─────────────────────────────────┘
```

- **Marks row:** top — shows current active Marks, each in a clearly labelled slot, each exactly one card
- **Stampede button:** between Marks and Challenge area — appears only when all active Marks are the same species AND the player holds N+1 **real** copies of that species (Poachers do not count). Hidden otherwise.
- **Challenge area:** directly below Marks — one slot per Mark, mirroring the Marks row above. Assignment is visually paired: each Challenge slot sits directly beneath the Mark it answers.
- **One card per slot, always.** A slot is either empty or filled. There is no stacking, no count badge, no variable slot depth to render.
- **Pseudo-confirm:** a green glow/sound fires per slot when that slot's assignment is valid
- **Confirm button:** activates only when every slot is filled with a valid card
- **Reset button:** returns all assigned cards to Hoard at once

### Two Input Methods — Both Work Simultaneously

**Method A — Mark-first:**
Tap a Mark slot to select it (highlights). Then tap a card in the Hoard fan to assign it to that slot. Pseudo-confirm fires when valid. Tap a card in the Challenge area to return it to the Hoard.

**Method B — Card-first (auto left-to-right):**
Without selecting a Mark, tap cards directly from the Hoard. Each card auto-assigns to the leftmost empty slot **it can legally beat** — if the leftmost empty slot isn't beatable by that card but a later one is, it fills the leftmost slot it *can* answer. A card that beats no empty slot registers the tap with a brief shake and doesn't assign. Tapping an assigned card in the Challenge area returns it to the Hoard and reopens that slot.

Both methods mix freely within a single Challenge. Pseudo-confirm, reset, and confirm behaviour is identical regardless of input method.

*(Drag-to-slot was considered and cut — see the gesture map above. It needed a new pointer-drag layer, a scroll-vs-drag disambiguation inside the horizontally scrolling fan, and it collided with tap-hold for the chain diagram. Two tap-based methods cover the same ground.)*

### Stampede Button Interaction

Tapping the Stampede button shows a brief confirmation: "Stampede with [species] ×N?" with the cards highlighted in the Hoard. Confirming lifts those cards out of the Hoard, sends the current Marks to the Watering Hole, and the board becomes N+1 separate single-card Marks of that species. No slot assignment needed — Stampede bypasses the Challenge builder entirely.

The Stampede button is hidden when active Marks are mixed species. Mixed Marks must be answered card-for-card via the normal Challenge builder.

### Alpha Indicator

When the Alpha event is active, the designated Alpha card in the Marks row displays a crown + glow overlay via `opts.alpha = true` in `pkoRenderCard()`. When Alpha status reassigns, the animation plays on all clients simultaneously — old crown fades, new crown appears on the newly designated Mark.


---

## 16. Card Reference System & Chain Diagram

### Overview

Because cards are small in the Hoard fan and the adjacency chain is the core skill, players need an always-available food chain reference. Three access points lead to one shared overlay:

1. **Tap-hold any card** anywhere in the game (Hoard, active Marks, Challenge area) → opens chain diagram overlay
2. **[?] button near the Hoard** on the main play screen → opens chain diagram overlay
3. **Inline [?] links** within How to Play steps 1–3 → opens chain diagram overlay

Single tap on a card (not hold) → briefly expands the card to full-face art only. No chain info on a simple tap — that gesture is for viewing the card art.

### Card Face Anatomy

Full card face (visible on tap-expand or in the Challenge builder):
- **Main body:** animal art (emoji in default skin, full illustration in custom skins)
- **Top strip:** predator indicator — small icons of what beats this card (1–2 animals maximum). Shows only immediate predators (`beaten_by` array). Label: "Beaten by:"
- **Corner indicator (fan view):** track pip (🌿 Land / 🌊 Sea / ⚡ Wild) + emoji identifier (default skin) or corner crop art (custom skins)
- **Card name:** bottom of card

Special card treatments:
- **Poacher:** dark/charcoal background. Top strip reads "Answers to no one." No predator icons.
- **Mimic:** patterned/shifting background. Top strip reads "Copies any species." FoN-only visual treatment.
- **Alpha state:** crown + glow overlay applied on top of any card via `opts.alpha = true` — does not change the card face itself

### Chain Diagram Overlay (`pko-chain-overlay`)

A static visual showing the complete predator chain for both tracks. Displayed as a data overlay (Pattern 1 per ui-style.md). Scrollable if needed on small screens.

**Layout — Two parallel columns:**

```
        🧑 POACHER
      answers to no one
             |
    ┌────────┴────────┐
  🌿 LAND           🌊 SEA
  
  🐝 Bee            🐟 Fish ←──────────────┐
     ↑↑ Ambush           ↑ (Mongoose, Eagle reach across)
  🐘 Elephant        🐙 Octopus
     ↑                    ↑
  🐻 Bear            🦭 Seal
     ↑                    ↑
  🐆 Leopard         🐻‍❄️ Polar Bear
     ↑   ↑                ↑
  🦦 Mongoose  🦅 Eagle   🐋 Orca
     ↑ (also → Fish)  ↑ (also → Fish, Mouse)     ↑ ↑ Ambush
  🐭 Mouse         🐟 Stingray
```

Arrows point FROM prey TO predator (upward). Bee and Stingray shown with curved Ambush arrows looping back up to Elephant and Orca respectively. Eagle's dead-end branch shown as a side branch off Mongoose level. Cross-track dashed arrows from Mongoose and Eagle to Fish. Poacher floats above both columns.

**Per-skin asset:** each skin pack supplies one chain diagram image. Default skin diagram uses emoji nodes. Custom skins supply illustrated diagram matching their art style.

### Gemini Mockup Prompt

*(For use when creating visual mockups of the chain diagram)*

> "Create a mobile food chain diagram for a card game called Pecking Order. Two vertical columns side by side: Land (left) and Sea (right). Each column shows animals as small rounded card nodes stacked vertically, prey at bottom, apex at top. Land column bottom-to-top: Mouse → Mongoose → {Eagle branch dead-end | Leopard} → Bear → Elephant. Sea column bottom-to-top: Fish → Octopus → Seal → Polar Bear → Orca. Arrows point upward from prey to predator. Eagle appears as a short side branch off the Mongoose level — it has no predator above it. Dashed horizontal arrows show cross-track connections: Mongoose points to Fish (dashed), Eagle points to Fish (dashed). Bee (Land) and Stingray (Sea) are shown at the very bottom of each column with curved looping arrows pointing up to Elephant and Orca respectively, labelled 'Ambush.' A dark charcoal rounded node labelled 'Poacher 🧑 — answers to no one' floats centred above both columns with a separator line. Earthy amber-brown colour scheme. Mobile portrait format, clean and minimal, high contrast, readable at small size on a phone screen."

### Asset Checklist — Per Skin Pack

For each of the 15 card types (Mouse, Mongoose, Leopard, Eagle, Bear, Elephant, Bee, Fish, Octopus, Seal, Polar Bear, Orca, Stingray, Human/Poacher, Mimic):

| Asset | Description |
|---|---|
| Full card face illustration | Main body art, portrait orientation |
| Corner crop | Square tight crop (animal face/detail) — used as corner identifier in fan view |
| Thumbnail | Medium size — used as node in chain diagram |

Game-level assets (per skin, unless marked universal):

| Asset | Description |
|---|---|
| Card back | One design per skin — neutral, no animal info |
| Chain diagram | Full static diagram image (both tracks, all relationships) |
| Alpha overlay | Crown + glow — can be universal across skins or per-skin variant |
| Track pip icons | 🌿 Land / 🌊 Sea / ⚡ Wild — can be universal |
| Force of Nature event banners | One banner per event (10 total: 9 random + 1 fixed opener) — illustrated event scenes or text cards |

**Total per skin pack:** 15 × 3 card assets = 45 card assets + ~8 game-level assets = **~53 assets per skin pack**

**Default skin ships fully illustrated at v1** — all ~53 assets (15 × 3 card assets + game-level assets including chain diagram, Alpha overlay, track pips, and Force of Nature event banners) generated via NanoBanana before launch, per the Art Style Checklist companion doc. This is a departure from the emoji-first/art-later pattern used by earlier games in the suite — justified here by the extra time budgeted for this game. Reskins (Aussie Fauna, Monsters) remain post-v1 and can still be dropped in one asset at a time as completed, since those go through the cartridge pack system and fall back to default art for any missing id.

---

## 17. How to Play

Follows the existing LSG How to Play pattern — step cards in a scrollable data overlay, accessible from the game menu. Inline [?] links on relevant steps open the chain diagram overlay.

```
HOW TO PLAY  🐘
Know the food chain. Become the Apex.
```

**STEP 1 — The Food Chain [?]**
Every animal has a natural predator. Play a predator to beat a Mark — but only its *immediate* predator counts. Eagles don't answer to Elephants. Know the chain. [?] opens the chain diagram.

**STEP 2 — Staking Your Claim [?]**
Open each Encounter by Staking — place one or more cards of the *same species* as Marks in the field. The next player must beat every Mark or Retreat.

**STEP 3 — The Challenge [?]**
Beat every active Mark, one card per Mark. Each card must be a natural predator of the Mark it answers. Miss even one Mark and you can't Challenge at all — it's all or nothing.

**STEP 4 — Stampede**
When every active Mark is the same species, you can Stampede — play one more copy of that species than there are Marks, and the whole field is yours. The Stampede button appears automatically when you have enough. Your Stampede leaves the board one Mark wider than you found it.

**STEP 5 — Retreat & Rejoin**
Can't beat everything? Retreat — but you're not out. You can rejoin and Challenge again later in the same Encounter when the Marks change.

**STEP 6 — Going Unchallenged**
When everyone else Retreats, you go Unchallenged and win the Encounter. You lead the next one.

**STEP 7 — Emptying Your Hoard**
First player to play their last card wins the Clash and scores 1 point. First to the target (default: 3) wins the Match.

---

**THE POACHER 🧑**
The Human wildcard. Wins any single Mark outright — no predator relationship required. That's the whole of it: a Poacher can't stand in as an animal, and it can't help you Stampede. There are only three in the Pool. The Poacher answers to no one.

---

**THE EAGLE 🦅**
Nothing eats an Eagle. If there's an Eagle among the Marks, a Poacher is your only answer — unless the whole field is Eagles, and you can Stampede it.

---

**WINNING AND SCORING**
- 1 point per Clash won
- First to the target Clash wins ends the Match
- If two players hit the target simultaneously, both win

---

**✨ FORCE OF NATURE** *(Phase 2 — this card is not built in v1)*
A random event reshapes the rules at the start of every Encounter. From Migration (pass your entire Hoard left) to Dark Forest (Marks hidden until it's your turn) to Extinction Event (entire species wiped from all Hoards). Every Clash opens with Invasive Mimicry — Mimic cards enter the ecosystem and everyone draws five extra cards.

**GOT IT** *(button)*

---

## 18. End of Match Screen — The Hierarchy

The Hierarchy screen shows after the Match ends (first player or players reach target Clash wins).

**Content:**
```
THE HIERARCHY
[Match complete — X Clashes played]

🥇 APEX PREDATOR
[Name] — [X pts]

2nd  [Name] — [X pts]
2nd  [Name] — [X pts]   ← shared rank if tied
4th  💀 THE BOTTOM FEEDER
[Name] — [X pts]

CLASH HISTORY
       [Ava] [Ben] [Cal] [Dana]
Clash 1   1    0    0    0
Clash 2   0    1    0    0
Clash 3   1    0    0    0
TOTAL     2    1    0    0

[Enter the Wild]   [Abandon Territory?]
```

- Tied players share the same rank number — no tiebreak within a rank
- Clash history grid is always shown — provides readable match narrative even in short games
- Bottom Feeder label appears only on the last-place player(s)
- Play again CTA: "Enter the Wild" — starts a new Match with the same players and settings
- Quit CTA: "Abandon Territory?" — returns to game menu

---

## 19. Sound Design

Sound moments for Claude Code. Tone: natural, raw, impactful — not cute or game-show. Earthy thumps, animal sounds, ambient wild textures.

> ⚠️ **Hard constraint — the suite has no audio files.** Every sound in Little Sylly Games is synthesised at runtime through the Web Audio API (`CLAUDE.md` § Tech Stack; `logic-engine.md` § Audio Function Catalogue). Nothing here can be a sample. That makes several directions below **unbuildable as written** — an animal call, an apex roar, night insects, herd thunder, and a scavenge crunch are all sample-based sounds with no synth equivalent that wouldn't read as a cheap imitation.
>
> What *does* synthesise convincingly, and has precedent in the codebase (see `playHullThud`, `playAbyssThud`, `playSonarPing` in DSD): low rumbles, sub-bass booms, resonant thuds, filtered noise sweeps, sharp buzzes and stings, metallic rings, whooshes, and denial buzzes.
>
> The **Buildable** column below marks each moment. Moments marked ⚠️ need either a re-brief toward an abstract texture or a decision to cut. This is one of the open items for Stage 2 §16 — the owner picks which moments matter rather than having them silently dropped.

| Moment | Sound direction | Buildable |
|---|---|---|
| Card dealt to Hoard | Soft card rustle / shuffle | ✅ filtered noise burst |
| Card assigned to slot (valid) | Soft placement thud | ✅ |
| Pseudo-confirm (slot valid) | Short positive chime — subtle | ✅ |
| Invalid card tap (shake) | Low thud / denied buzz | ✅ |
| Stampede confirmed | Deep rumble building to a herd thunder — dramatic | ⚠️ rumble ✅, "herd thunder" needs re-brief — suggest layered sub-bass swell + noise |
| Unchallenged | Short triumphant animal call — apex feel | ⚠️ no synth animal call — suggest a rising three-note brass-ish sting |
| Giant-Killer Ambush played | Sharp sting/buzz — sudden and surprising | ✅ |
| Poacher played | Out-of-ecosystem — footstep or mechanical click, deliberately jarring | ✅ mechanical click reads well |
| Retreat | Soft receding footsteps | ⚠️ suggest a short descending filtered whoosh instead |
| Clash win (empty Hoard) | Apex predator roar — full and satisfying | ⚠️ no synth roar — suggest the existing `playSuccess` family, deepened |
| New Clash deal | Full card shuffle rustle | ✅ noise burst, longer |
| *(Phase 2)* Alpha designation | Low dramatic chord — something powerful awakens | ✅ |
| *(Phase 2)* Alpha survives a beat | Heavy impact thud — hit but unmoved | ✅ |
| *(Phase 2)* Alpha status reassigns | Crown landing sound — quick metallic ring | ✅ |
| *(Phase 2)* Force of Nature event reveal | Dramatic nature sting — wind rush / thunder crack | ✅ noise sweep + sub boom |
| *(Phase 2)* Extinction Event | Deep resonant boom — something ended forever | ✅ |
| *(Phase 2)* Dark Forest activates | Audio shift — ambient dims, night insects emerge | ⚠️ no ambient bed in the engine; suggest a single low filtered drone |
| *(Phase 2)* Migration fires | Whoosh of movement — herd on the move | ✅ |
| *(Phase 2)* Carrion kept | Soft scavenge sound — low crunch | ⚠️ suggest a short granular noise tick |

