# New Game Brief — HONEYCOMB HILLS
**Document type:** Phase 1 — Design Brief (non-technical)
**Who fills this in:** Project owner + AI, before any technical work
**What happens next:** Owner answers the open questions in §19, brief is revised, then it goes to Stage 2 (`new-game-technical-template.md`).

> **REVISION 2 — 5 Sep 2026.** First owner review folded in. **Identity is settled** — Honeycomb
> Hills, `comb`, 🐝, bright honey gold. **17 of Revision 1's 21 questions are answered and closed.**
> The biggest structural change: **A vs B is no longer an either/or** — match length is now a
> *setting* (§7), which also became the frame for the Wasp, the Overflow and the Waggle Dance.
> Trading keeps a **Full Dance** mode because partner choice is strategically load-bearing;
> propose-and-first-accept is **vetoed**. **Four questions remain open** (Q6, Q19-b, Q20, Q22) and
> one new appendix answers the biggest of them.
>
> **New in this revision:** **Appendix A — Reconnect & Resume**, a grounded options analysis
> against the real engine (three findings that change the answer, including that stable identity
> across a refresh is *already free* and that host migration is blocked by one line of code).
> Also **Appendix B — the Sun Compass**, answering the three.js question.
>
> *Revision 1 (4 Sep 2026) was the first pass from the concept conversation in
> `docs/new-ideas/concepts-only/LSG-honeycomb hills-040926-042104.pdf`.*
>
> **Deliberately not covered, per owner instruction:**
> - **Art direction and UI layout** — owner is working on mockups. §11 and §14 cover only the
>   *architectural* consequences (what needs a render seam, what interaction methods exist), not
>   what anything looks like.
> - **Sylly Mode (§8)** — held off. Owner: *"game is big and complex enough without it."*

> **Origin note:** A bee-themed reskin of **Settlers of Catan** (Klaus Teuber, 1995 — base game
> only, no expansions). The conversation's own framing: hexagons are literally the architecture of
> a beehive, so the board *is* the theme rather than being painted onto it. The state flow is
> intended to stay **identical to the original** — this is a reskin plus one mechanical
> substitution (a single weighted die replacing 2d6), not a redesign.
>
> **Legal note, flagged not answered:** Catan's *rules* are not copyrightable, but its *name,
> trade dress, and the specific terms* "Settlers of Catan", "Catan", the robber, the hex art and
> the board layout are trademarked and heavily protected. A full reskin with original terminology,
> original art and an original name is the standard and defensible way to do this — which is
> exactly what this brief describes. **The one thing to avoid was the title**, and it has been
> avoided: *Settlers of the Hive* was on the shortlist and was the only candidate nodding directly
> at the trademark. **Honeycomb Hills** carries none of that exposure.

---

## ⚠️ Read this first — the scope finding

**This would be the largest game in the suite by a wide margin, and it is the first one that does
not obviously fit the suite's shape.** That is not a reason to drop it. It *is* a reason to make
the call consciously rather than discovering it in Stage 3 — which is what Revision 2 has now done.

Every other Little Sylly Game is a **10–20 minute party game with no persistent state between
rounds**. Base Catan is a **60–90 minute economic engine with a board that persists for the entire
match**. Concretely, this game needs things no game in the suite currently has:

| What it needs | Does the suite have it? |
|---|---|
| A persistent shared board surviving 60–80 turns | No. Every game resets state per round |
| 54 tappable intersections + 72 tappable edges on a phone | No. Nothing has more than ~25 targets (NT's grid) |
| Longest-path graph traversal (Largest Comb) recomputed after every wall | No. Genuinely non-trivial — algorithm settled at §19 Q18 |
| Free-form player-to-player trading across devices | No. Nothing in the suite has player-to-player negotiation |
| A 45-minute session that survives one player's browser refresh | **No — and the engine actively prevents it.** Full analysis: **Appendix A** |
| Per-device private hands that grow and shrink all match | Partly — FLW/PKO have private hands, but for one deal, not 80 turns |

**The honest sizing:** roughly 2–3× Cookie Jar (the largest build to date), and the two hardest
parts — trade negotiation and the board interaction — are both *new categories* of problem for this
codebase rather than bigger versions of solved ones.

### ✅ Resolved — it is both, as a setting

**Owner decision (5 Sep 2026): ship both, as the game's headline setting.** Short is the default;
full length is an option. This is a better answer than either half:

| Aspect | **Short Summer** *(default)* | **Full Season** |
|---|---|---|
| Target | **7 Hive Points** | **10 Hive Points** |
| Expected length | **~20–25 min** | **~45–60 min** |
| The Wasp | Blocks Only | Blocks and Steals |
| The Overflow | Off | On, at 7 |
| Everything else | Identical | Identical |

**The board does not change between them** — this is the finding that came out of doing the maths
(§10a). Length is controlled by the **point target and the two Wasp settings**, not by board size,
because shrinking the board turns out not to work for 4 players. One board, one renderer, one
tested set of hex ratios.

**What this buys:** the scope stays a single game rather than two, the suite gets a 25-minute party
game by default, and the 45-minute version is a pill-tap away for the group that wants it. The four
hard problems in the table above are unchanged — they have to be solved either way — but the
*exposure* to the worst of them (Q20, a long match with no reconnect) is cut roughly in half by the
default.

---

## 1. Identity (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Full game name** | **Honeycomb Hills** — ✅ **settled** (owner, 5 Sep 2026) |
| **Short nickname / abbreviation** | **`comb`** — ✅ **settled.** 4 letters, matches the `pass` / `cjar` shape, verified free against all 19 shipped prefixes and against `js/` (`grep "\bcomb[A-Z]"` → zero hits) |
| **One-sentence tagline** | *Draft:* "Build your comb, trade your nectar, and grow the strongest hive in the meadow." Not settled — low-stakes, can land at Stage 2 |
| **Thematic universe** | A sunlit summer meadow seen from just above the flowers. Bright, warm, kid-friendly nature — closer to a picture book than a documentary. Busy but never frantic; the tension is in the trading, not in threat. The conversation was explicit that this should read as **playful and accessible, not academic** — no beekeeping jargon on any surface a player has to read mid-turn. |
| **Emoji / icon** | **🐝** — ✅ **settled** (owner) |
| **Brand colour** | **Bright honey gold `#F0A500`** *(exact hex proposed)* — ✅ **direction settled** (owner). Deliberately *not* an exact match for CJAR's `#D4A017`; see the note below. Light fill, so it needs **dark ink** (`ctaTextClass: 'text-stone-800'`), matching the FRT and CJAR precedent |

### The colour decision, and what it commits us to

**Owner's call, and it's the right one:** the lobby is going to keep growing and the buttons sort by
colour, so a warm gold slotting in beside the other warm games produces a **gradient** rather than a
collision. The gold is locked.

Two consequences worth writing down:

- **`#F0A500` is chosen to sit clearly apart from CJAR's `#D4A017` right now** — brighter, more
  saturated, a touch more orange. It reads as a neighbour rather than a duplicate. Once CJAR moves
  to a chocolate brown (owner intends this) the gap widens further and `#F0A500` can stay put.
- **This is now a dependency, not just a preference.** Two suite-level moves are implied and should
  be logged so they don't get lost: **JEC off amber-500** and **CJAR to a chocolate tone**. Neither
  blocks Honeycomb Hills — but if both slip, the lobby ships with three warm-gold neighbours for a
  while. *Recommend logging both in `docs/deferred-work.md` when this brief is approved.* FRT's
  lemon `#FFE500` is distinct enough and needs no change.

**The other half of the colour problem is unchanged and is the more important one:** inside the
game, five resources must be told apart at a glance, every turn, for the whole match. That is
settled separately in §9 and does **not** get to be warm-toned just because the brand is.

---

## 2. The Players (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Player count range** | **3–4** — ✅ **settled** (owner). Base Catan's range, and a hard design property rather than a soft cap (19 hexes, 54 nodes; 5+ starves placement). **This is narrower than any game in the suite** — every shipped game does at least 3–6 — and that's accepted. **No 2-player variant** in scope |
| **Teams or individuals?** | Individuals — free-for-all. No teams. Catan's alliances are social and temporary, and they should stay that way (unenforced by the app). |
| **Are there different roles?** | **No.** Every player has identical capabilities and an identical goal. All asymmetry is emergent — where you placed, what you're holding, what the board gave you. |
| **Is any information hidden from some players?** | **Yes, and this is structural.** Two things are private per player: their **resource hand** (contents hidden; *count* is public) and their **Instinct cards** (unplayed ones fully hidden, including Golden Nectar victory cards which stay hidden until the winning turn). Everything else — the board, every wall and cell, every player's point total, whose turn it is — is fully public. |
| **Minimum meaningful player count** | **3.** Two-player Catan does not work without house rules — the trade market collapses to a single counterparty who has no reason to help you. A 2-player variant would need real design (a neutral third colony, or forced meadow-only trading), and is **out of scope** |

### Roles

**None — skip.** This is one of very few games in the suite with no role asymmetry whatsoever.

**Note on what replaces roles:** the thing that makes each player's experience distinct is their
**placement** and their **hand**, not a role card. That means the game has no pass-the-phone reveal
gates, no private role screens, and nothing for the § Pass-the-Phone Safety Gate to protect — but
it *does* mean each device permanently shows a different private hand, which is a stronger privacy
requirement, not a weaker one (§12).

---

## 3. The Core Loop (REQUIRED)

**In one sentence — what does a player DO on their turn?**
Send the scouts out to see which hexes bloom, trade what they got for what they need, then spend it
building outward across the comb.

**What is the central tension or fun moment?**
**The Waggle Dance** — the trade. Everything else in the game is arithmetic; the trade is the
moment where people talk to each other, lie a bit, and decide whether helping someone is worth what
it costs them. It is also the moment where the leader gets frozen out and knows it. *Every other
system in this game exists to make that conversation happen.* If a design decision makes trading
faster but less social, it is the wrong decision.

**The secondary beat — the Wasp.** Rolling a 7 stops production dead, forces everyone
over-stuffed to throw resources away, and lets the active player park a predator on the best hex
in the game. It is the game's only genuinely mean moment and it should land like one.

**What type of game is this closest to?**
☑ **Something else: territory / economic engine building.** The first in the suite. Nothing in the
existing 19 is in this family — the nearest neighbour is Net-Trace (a board that persists inside a
round), and it isn't close.

**Walk through one complete round step by step, in plain English:**

*A "round" here means one player's full turn. Turns pass clockwise and the match is many dozens of
them — this is unlike every other game in the suite, where a round is a shared beat everyone
experiences at once.*

1. **The turn opens.** The active player's device unlocks; everyone else's board is live but
   read-only (they can still look at their own hand, and they can still be offered a trade).
2. **Scout Flight.** The active player casts the die (§4a). It resolves to a number 2–12.
3. **The bloom.** Every hex marked with that number produces — but only for players who have a
   structure touching it, and only if the Wasp isn't sitting on it. A **Drone Cell** touching it
   yields 1 of that hex's resource; a **Queen Dome** yields 2. This happens for *all* players at
   once, not just the active one, which is why everyone watches the roll.
4. **…unless it was a 7 — then the Wasp instead.** No hex produces, ever, on a 7 — that part is
   always on. What follows it is **three separable consequences, each its own setting** (§4d and
   §7): the **Overflow** (everyone over the carry limit discards half), the **Wasp's move** (the
   active player parks it on any hex, shutting that hex off for everyone), and the **steal** (one
   random resource from a player touching the Wasp's new hex).
5. **The Waggle Dance.** The active player may trade. Two kinds, and they can be mixed freely:
   with **other players** on any terms both sides accept, and with **the meadow** at a fixed rate —
   4 of one resource for 1 of any other, improved to 3:1 or 2:1 if they hold a Drone Cell on the
   matching **Trade Blossom**.
6. **Build.** The active player spends resources in any order and any quantity they can afford:
   **Comb Wall** (extends the network along a hex edge), **Drone Cell** (an empty intersection at
   least two walls away from any other cell, and connected to their own network), **Queen Dome**
   (upgrades one of their own Drone Cells), or an **Instinct Card** drawn blind from the deck.
7. **Instinct.** At any point in their turn — before or after the roll — the active player may play
   **one** Instinct card, and only one. Never on the turn it was bought (Golden Nectar excepted,
   and those are never "played", only revealed at the win).
8. **Check for the win.** If the active player is now at the point target *on their own turn*, the
   match ends immediately. Otherwise the turn passes.

**Is there anything players do simultaneously, or is everything sequential?**
Mostly sequential — but there are **two simultaneous moments**, and both are the ones most likely to
be got wrong:
- **The 7 discard.** Every over-stuffed player chooses what to throw away *at the same time*, on
  their own device. The turn cannot continue until they all confirm.
- **Answering a trade offer.** When the active player broadcasts an offer, every other player sees
  it at once and can respond.

**How does the phone physically move between players?**
It doesn't. **Every player has their own device.** See §12 — this is the only viable mode and the
reasons are stronger here than for any game in the suite.

---

## 4. Rule Relationships & Interaction Matrix

There is no "beats / outranks" chain here — nothing in this game defeats anything else. But there
*are* placement and adjacency relationships that behave exactly like the relationships this section
exists to pin down, so they are tabulated here once and every later section points back.

### 4a. The Scout Flight die — **settled**

**The single most distinctive change from the original, and it is the owner's own.** Instead of two
six-sided dice, the game casts **one 36-sided sphere** — the conversation's reasoning being that
cubes don't occur in nature but spheres (dew drops, pollen balls, the sun) do, and that one rolling
object animates far more cleanly on a phone than two clattering cubes.

**The critical constraint, and it is non-negotiable:** the sphere's 36 faces must be **painted with
2d6 outcomes**, not numbered 1–36. Catan's entire economy is built on the bell curve — a 6 or 8 hex
is valuable *because* it comes up five times as often as a 2 or 12. A flat 2–12 random number
destroys the game silently: it would still play, and it would feel wrong for reasons nobody could
name.

**The exact face distribution — 36 faces, matching 2d6 precisely:**

| Result | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Faces** | 1 | 2 | 3 | 4 | 5 | **6** | 5 | 4 | 3 | 2 | 1 |
| **Odds** | 1/36 | 2/36 | 3/36 | 4/36 | 5/36 | **6/36** | 5/36 | 4/36 | 3/36 | 2/36 | 1/36 |

*(Total 36. The Wasp, at 7, is the single most likely outcome — one turn in six.)*

**How it resolves** (the conversation's own plain-English logic, unchanged): the active player taps
to cast → the game picks a face 1–36 → the lookup table translates it to a 2–12 result → the sphere
animates and lands showing that number → every matching hex blooms.

**Two things worth noting now rather than at Stage 2:** the roll outcome is decided *before* the
animation, so the animation is pure presentation and does not need real physics (`js/lib/physics.js`
exists but is not required here). And in multiplayer the **host** decides the number and every other
device animates to the same result — this is the standard pattern and it means the sphere can never
disagree across devices.

**✅ Settled: it is the Sun Compass** (owner) — a glowing golden orb cast into the sky each turn;
where it settles is the sun's angle, and that angle lights up the matching hexes. Real bees navigate
by the sun, so it is the mapping with the best in-world logic as well as the best look.

**How it's built: not three.js.** Full analysis in **Appendix B**, but the short version is that
external libraries are a project anti-pattern, three.js is ~600 KB uncompressed against a PWA that
precaches everything, and — the part that actually settles it — **there is nothing to simulate.**
The result is decided before the animation starts, so the Compass is a *presentation*, not a physics
object. CSS or 2D canvas both do it in well under a hundred lines. **Appendix B** has the three
options and the one constraint that matters more than the technique.

### 4b. Placement legality — the rules that actually constrain a turn

| Element | Where it goes | Legality rule | Notes |
|---|---|---|---|
| **Comb Wall** | On a hex **edge** | Must touch one of your own existing Walls, Drone Cells or Queen Domes. Cannot cross another player's Wall. | 15 per player. This is what "network" means everywhere below |
| **Drone Cell** | On a hex **intersection** (a corner where 2–3 hexes meet) | Must be empty, must be connected to your own network by a Wall, **and must obey the Distance Rule** | 5 per player. Worth 1 point |
| **Queen Dome** | On one of **your own** Drone Cells | Upgrade only — never placed on an empty intersection | 4 per player. Worth 2 points. Replaces the Drone Cell, which returns to your supply |
| **The Wasp** | On a hex **face** | Must move to a *different* hex than the one it's on | Starts in the Smoke Zone. Blocks all production on its hex, for everyone |

**The Distance Rule** — the one placement rule players get wrong, and the one worth teaching
explicitly: *a new Drone Cell must be at least two edges away from any other Drone Cell or Queen
Dome, including your own.* Never adjacent. This is what stops a player carpeting a good corner.

**The two exceptions to "connected to your network":** the two opening placements during setup are
free-placed anywhere legal, since no network exists yet.

### 4c. The one genuine interaction — Largest Comb can be broken

Almost nothing in this game interacts with another player's stuff. The exception: **placing a Drone
Cell on an intersection in the middle of an opponent's chain of Walls cuts that chain in two** for
the purposes of Largest Comb. This is the game's only piece of direct interference besides the Wasp,
it is deeply satisfying, and it is the reason Largest Comb needs a real graph traversal rather than
a running counter (§19 Q18 — Catan’s rules, unmodified).

### 4d. The Wasp, taken apart — answering "is the steal even tied to the robber?"

**Direct answer to the owner's question: the steal is tied to the Wasp's *placement*, not to the
roll of 7.** Original Catan's sequence on a 7 is: production stops → everyone over the limit
discards → the active player *moves* the robber → the active player steals from someone adjacent to
**the hex the robber just landed on**. A **Guard Bee** card does the last two steps with no 7 and no
discard at all. So the steal is a consequence of the move, and the move is a separate thing from
the 7.

That means there are **four consequences**, and three of them are genuinely independent dials:

| Consequence | Triggered by | Separable? | Setting |
|---|---|---|---|
| **Production stops** | The 7 itself | **No** — this *is* what a 7 is | Always on |
| **The Overflow** (discard half) | The 7 itself | **Yes** — nothing to do with the Wasp | `The Overflow` |
| **The Wasp moves and blocks a hex** | A 7, **or** a Guard Bee | **Yes** | `The Wasp` |
| **Steal one resource** | Follows the Wasp's move | **Only with the move** — you can have the move without the steal, never the steal without the move | `The Wasp` |

**So: two settings, not three.** `The Overflow` is fully independent. `The Wasp` is one setting with
ordered options, because the steal can't be separated from the move.

#### ⚠️ The trap — do not offer "Wasp: Off"

It looks like a free third option and it quietly guts a third of the game:

- **14 of the 25 Instinct cards are Guard Bees**, and a Guard Bee's *entire* function is to move the
  Wasp and steal. With no Wasp they are blank cards — **56% of the deck does nothing.**
- **Fiercest Guard (2 points)** is awarded for playing Guard Bees. It becomes unwinnable, so the
  achievement pool silently halves.
- Buying an Instinct card is a real strategic line; if most draws are duds, the whole card economy
  collapses and players stop buying, which removes Golden Nectar from circulation too.

**Recommendation: the gentlest option is `Blocks Only`, not off.** The Wasp still moves and still
denies a hex, so Guard Bees stay valuable (moving the Wasp off *your* best hex is worth a card) and
Fiercest Guard stays live. What's removed is the bit that actually stings — having a resource taken
out of your hand.

#### The settings that result

| Setting | Options | Effect on length | Default |
|---|---|---|---|
| **The Wasp** | **Blocks Only** · **Blocks and Steals** | Steals slow the game — they remove resources from circulation, so builds take longer | *Short Summer:* Blocks Only · *Full Season:* Blocks and Steals |
| **The Overflow** | **Off** · **7 Cells** · **9 Cells** | Off is faster **and** much less punishing — nobody loses a hand they were saving | *Short Summer:* Off · *Full Season:* 7 |

**These are the two real length dials**, and they work by changing how much friction the economy
has, not by changing the board. That's what made the "no smaller board" finding in §10a viable.

---

## 5. Winning (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **How does a game end?** | The instant a player reaches the point target — **7** in Short Summer, **10** in Full Season — **on their own turn**. Points can be gained on another player's turn (losing Largest Comb to them, for instance) but the win is only *checked* on your own turn — so you can be knocked off the target before you ever get to claim it. This is original Catan and it should be kept: it creates the "he's on 9, someone break his road" moment. |
| **How is the winner determined?** | First to the target. There is no second-place tiebreak — the game simply stops. |
| **Are ties possible?** | **No.** Structurally impossible, since only one player can be checked at a time and the match halts on the first success. |
| **Roughly how long should a full game take?** | **A setting — ✅ settled.** *Short Summer* (default): 7 points, Wasp on Blocks Only, no Overflow → **~20–25 min**. *Full Season*: 10 points, Blocks and Steals, Overflow at 7 → **~45–60 min**. Same board either way (§10a) |

### Where the points come from

| Source | Points | Notes |
|---|---|---|
| Each **Drone Cell** | 1 | Public, always visible |
| Each **Queen Dome** | 2 | Public. Replaces the Cell's 1 point, so the upgrade is +1 net |
| **Largest Comb** | 2 | Held by whoever has the longest unbroken chain of Walls, minimum 5. Transfers the moment someone beats it — and can be *lost* by having a chain cut (§4c) |
| **Fiercest Guard** | 2 | Held by whoever has played the most Guard Bees, minimum 3. Transfers on being beaten outright, never on a tie |
| Each **Golden Nectar** card | 1 | **Hidden until the winning turn.** This is what makes a player's visible total untrustworthy |

**The Golden Nectar rule is load-bearing and should not be softened:** a player who looks like
they're on 7 might be on 9. It is why the leader gets frozen out of trading and why the endgame has
any tension at all.

---

## 6. Scoring (REQUIRED)

Scoring here is not per-round tallying — it is a running total that only moves when the board
changes. Written as the events that move it:

| What happened | Who gets points | Roughly how many | Notes |
|---|---|---|---|
| Built a Drone Cell | The builder | +1 | Immediate and permanent |
| Upgraded to a Queen Dome | The builder | +1 net (2 replacing 1) | Immediate and permanent |
| Built a 5th+ Wall in one unbroken chain, longer than the current holder's | The builder | +2, and −2 from the previous holder | Can swing 4 points in one move |
| Had a Wall chain cut by an opponent's new Drone Cell | The cut player | −2, if the cut drops them below the current best | The only way to lose points to someone else's placement |
| Played a 3rd+ Guard Bee, more than the current holder | The player | +2, and −2 from the previous holder | Ties do not transfer it |
| Drew a Golden Nectar | The drawer | +1, hidden | Not shown to anyone until the match ends |
| Rolled a hex that produced | Nobody | 0 | Resources are not points |

**Does scoring feel balanced?**
**Full Season: yes** — this is 30 years of playtesting by a very large number of people, at 3–4
players on exactly this board.

**Short Summer: this is the one number most likely to need tuning, and it should be watched from the
first playtest.** At a 7-point target, the two achievements are **4 of 7 points — 57% of the win
condition**, against Catan's 40%. Keeping the board fixed (§10a) removed the *other* distortion
Revision 1 worried about, but not this one.

The concrete failure mode: **a player wins on 3 Drone Cells plus both achievements**, having barely
built anything. That's a legitimate Catan line at 10 points where it's hard to sustain; at 7 it's
short enough to be a reliable strategy, and it's off-theme for a game about growing a comb.

**Recommendation: ship Short Summer with 2-point achievements anyway, and treat this as the first
tuning dial.** Pre-emptively "fixing" it is guessing — the honest read is that it needs one real
playtest. Two fallbacks, in order of preference, if it does turn out dominant:

1. **Achievements drop to 1 point in Short Summer only** (making them 2 of 7 — 29%, slightly *under*
   Catan's weighting, which is the safer side to err on for a short game)
2. **Raise the minimums in Short Summer** — Largest Comb needs 6 walls instead of 5, Fiercest Guard
   needs 4 Guard Bees instead of 3

Fallback 1 is a one-line change; fallback 2 preserves the 2-point payoff but makes it harder to
reach. **Flagged here so whoever plays the first match knows what to look for.**

**Any outcomes where nobody scores?**
Most turns. A typical turn produces resources and builds nothing. That's correct and it's the engine
working — but it does mean the game needs its *small* moments (the bloom animation, the trade, the
Wasp) to carry the entertainment, because the scoreboard sits still for minutes at a time.

---

## 7. Settings (REQUIRED)

Seven settings, all with thematic names per the suite standard. **Sylly Mode is absent by design
(§8) — it would normally be last.**

Every setting that encodes a concrete value (a point target, a card count, a number of seconds)
carries that value on a **live line below the pills**, never in the pill label — the pills stay
thematic. That's the suite's Dynamic Value Line rule and it exists precisely for a settings screen
like this one, where four of the six options are numbers wearing costumes.

| # | Setting name | What it changes | Options *(pill labels)* | Default |
|---|---|---|---|---|
| 1 | **The Season** | Match length — the point target, and the two Wasp dials below preset with it | **Short Summer** · **Full Season** | Short Summer |
| 2 | **The Meadow** | Whether the board is randomised or uses a fixed, balanced arrangement | **Wild** · **Tended** | Wild |
| 3 | **The Wasp** | Whether the Wasp only blocks a hex, or also robs a player (§4d) | **Blocks Only** · **Blocks and Steals** | *Follows The Season* |
| 4 | **The Overflow** | The carry limit — how full your comb can get before a 7 spills half of it (§4d) | **Off** · **Snug** · **Roomy** | *Follows The Season* |
| 5 | **The Waggle Dance** | Whether trades are agreed out loud and just executed, or negotiated fully in-app (§14) | **Out Loud** · **Full Dance** | Out Loud |
| 6 | **Daylight** | Whether a turn has a time limit, so one long thinker can't stall the match | **All Day** · **Long Day** · **Short Day** | All Day |
| 7 | **The Meadow's Bounty** | Whether the resource supply can actually run dry | **Endless** · **Limited** | Endless |

**The value lines** (the live text under each pill row):

| Setting | Example value line |
|---|---|
| The Season | *"First to 7 Hive Points — about 25 minutes."* |
| The Meadow | *"Hexes and Bloom Markers shuffled fresh every match."* |
| The Wasp | *"The Wasp shuts a hex down, but takes nothing from your comb."* |
| The Overflow | *"Hold more than 7 and a 7 costs you half."* / *"…more than 9…"* / *"Hold as much as you like."* |
| The Waggle Dance | *"Sort the deal out loud, then tap it in."* |
| Daylight | *"90 seconds a turn."* / *"60 seconds a turn."* / *"No time limit."* |
| The Meadow's Bounty | *"The meadow never runs out."* / *"19 of each resource — the meadow can run dry."* |

### How The Season interacts with the Wasp settings — the one bit of wiring

**The Season is a preset, not a lock.** Choosing it sets **The Wasp** and **The Overflow** to that
season's values, but both stay fully adjustable afterwards — a host who wants a short game *with*
the full nasty Wasp can have one.

| The Season | Sets The Wasp to… | Sets The Overflow to… |
|---|---|---|
| **Short Summer** | Blocks Only | Off |
| **Full Season** | Blocks and Steals | Snug (7) |

This is the **superseded** pattern from the suite's settings rules, in its gentle form: touching one
setting repaints two others, and their stored values are not otherwise interfered with. **No card
needs dimming and no amber "unavailable" line is needed** — nothing here becomes unreachable, which
keeps this simpler than FRT's or NT's exclusivity handling.

> ⚠️ **Do not add a "Wasp: Off" option.** It looks free and it blanks 56% of the Instinct deck. Full
> reasoning in §4d — this is the single most likely well-meaning addition to quietly break the game.

**Are there any settings that should be locked or hidden in certain situations?**

- **All seven lock the moment the match starts.** The board is dealt from The Season and The Meadow
  at match start and cannot be re-dealt.
- Per the engine's lobby-bounds rule: **any setting that affects the player-count range must be
  chosen on the game menu before the room is created**, never on a setup screen. **None of these
  affect player count** — the range is a flat 3–4 regardless — so this game has no exposure to the
  bug that capped five other games' rooms at 4. Worth keeping it that way.

**Do any settings scale automatically with player count?**
**No.** The 19 hexes, 18 Bloom Markers and 25 Instinct cards are identical at 3 and 4 players — a
3-player match is simply roomier, and that is a real and pleasant difference rather than a defect.
This stays true now that the board is fixed across both Seasons (§10a).

---

## 8. Sylly Mode

**None — to be designed.** Held off deliberately at the owner's instruction for this revision.

**One note to carry forward, so the eventual design doesn't fight the rest of the game:** every
existing Sylly Mode in the suite modifies a *round*, and this game's rounds are single player turns
in a 60-turn match. A Sylly Mode that fires per turn would fire 60 times and stop being special; one
that fires once would be invisible. The likely shape is a **recurring meadow event** — something the
Scout Flight can turn up occasionally, changing the meadow for a turn or two. Left entirely open.

---

## 9. Thematic Vocabulary (REQUIRED)

Almost all of this was settled in the concept conversation and is written in as decided. The three
places it wasn't are marked and carried into §19.

### The core mapping — settled

| Standard term | Honeycomb Hills | Why |
|---|---|---|
| Lumber (Forest) | **Resin** (Sapling Grove) | Bees collect tree resin to make propolis — the hive's structural glue |
| Brick (Hills) | **Wax** (Sunlit Rock) | Bees secrete wax to build the actual comb |
| Wool (Pasture) | **Pollen** (Blossom Meadow) | Gathered from flowers; the protein that rears the brood |
| Grain (Fields) | **Nectar** (Clover Patch) | The hive's carbohydrate — its fuel |
| Ore (Mountains) | **Royal Jelly** (Nursery Cell) | The rare, precious secretion, used only to make queens — perfect for the resource that only builds the top-tier structure |
| Desert | **The Smoke Zone** | A beekeeper's smoker has hit this patch; nothing forages here |
| Road | **Comb Wall** ✅ | The wax wall between cells. Sits on an edge, exactly as a comb wall does — and it makes *Largest Comb* read naturally |
| Settlement | **Drone Cell** ✅ | A drone cell is a real, visibly larger cell in the comb — and it pairs into Queen Dome as a legible upgrade line (drone → queen) that *Hex Cell* couldn't give |
| City | **Queen Dome** ✅ | The enlarged queen cell — visibly the biggest thing on the comb, which is exactly what a city is |
| Development Card | **Instinct Card** ✅ | Bees run on genetic programming, not decisions |
| Knight | **Guard Bee** ✅ | Drives off the Wasp. Pairs with *Fiercest Guard* |
| Year of Plenty | **Spring Bloom** ✅ | Everything flowers at once — take any two resources |
| Monopoly | **Pheromone Dominance** ✅ | Call every bee carrying one resource home to your hive |
| Road Building | **Comb Rush** ✅ | Build two Comb Walls immediately. *Was "Swarm Expansion" — renamed, see the collision note below* |
| Victory Point card | **Golden Nectar** ✅ | A hidden prize tucked away in the comb |
| Longest Road | **Largest Comb** ✅ | The most continuous wall built by one colony |
| Largest Army | **Fiercest Guard** ✅ | *Was "Fiercest Swarm" — renamed, see the collision note below* |
| Rolling the dice | **Scout Flight** | Sending scouts out to see what's blooming today |
| Trading | **The Waggle Dance** | Literally how bees communicate resource locations. The best single mapping in the set |
| The Robber | **The Wasp** | A predator lands on a hex and shuts it down |
| Harbours / Ports | **Trade Blossoms** | Edge flowers that give a better exchange rate |
| Victory Points | **Hive Points** ✅ | *Was "Swarm Points" — renamed, see the collision note below* |

### ⚠️ Collision finding — "Swarm" is taken

**Ran the terminology check against all 19 shipped identity docs.** One hard conflict:

> **"Swarm" is already a defined move in Pecking Order** — *"answering a single Mark with two of
> that Mark's own species instead of its predator"* (`docs/game-identities/pko.md`, T5). It appears
> in PKO's terminology table, its How to Play, and its match log.

The conversation's mapping used "Swarm" **three times** — Swarm Points, Fiercest Swarm, and Swarm
Expansion. All three are renamed above (**Hive Points**, **Fiercest Guard**, **Comb Rush**). This is
exactly the class of thing the process's Naming Collision Check exists to catch, and catching it now
costs nothing where catching it in Stage 3 would mean a rename across a shipped How to Play.

**Two soft collisions, noted not blocked:** FLW has a setting called **Smoke & Mirrors** (vs our
*Smoke Zone* — different enough, different game, no shared surface), and CJAR has a House Rule
called **On Guard** (vs our *Guard Bee* — same). Neither needs action; both are recorded so a later
audit doesn't re-flag them.

**Everything else is clear.** Verified free across all 19 identity docs: *Hive, Comb, Nectar, Wasp,
Bloom, Pollen, Queen, Drone, Waggle, Forage, Jelly, Resin, Wax, Meadow, Blossom, Scout, Colony.*

### Suite-standard terms

| Generic term | What this game calls it |
|---|---|
| Round | **Turn** — and a full match is **The Season** |
| Score / points | **Hive Points** ✅ |
| Game over screen | **The Hive** ✅ (owner) |
| Play again | **New Season** |
| Quit | Heading: **"Abandon the hive?"** · Confirm: **"Yeah, buzz off."** · Cancel: **"Not yet!"** |
| Settings overlay title | **Honeycomb Hills 🐝** |
| The resource supply | **The Meadow** — where 4:1 trades go. *Note this word does double duty: it is also the name of setting #2 (§7). Same fiction, no ambiguity in practice, but worth knowing before someone "fixes" one of them* |
| The Instinct deck | **The Instinct Deck** |
| A hex's number token | **Bloom Marker** ✅ (owner) |
| Discarding on a 7 | **The Overflow** ✅ (owner) — your comb is too full and it spills |
| Match length setting | **The Season** — *Short Summer* / *Full Season* ✅ |
| Board layout setting | **The Meadow** — *Wild* / *Tended* ✅ |
| Trade mode setting | **The Waggle Dance** — *Out Loud* / *Full Dance* ✅ |
| Turn timer setting | **Daylight** — *All Day* / *Long Day* / *Short Day* ✅ |
| Supply limit setting | **The Meadow's Bounty** — *Endless* / *Limited* ✅ |
| Placement rejection message | *"Too close to the comb next door."* (Distance Rule) · *"Nothing of yours reaches here yet."* (connection) |

### ⚠️ The resource colour rule — settled, and it is a rule not a preference

The conversation's sharpest finding was that a bee theme risks five resources that are all yellow,
orange and brown, and that a player should never have to squint to tell Wax from Royal Jelly.
**Resources must be colour-coded for maximum separation, not for thematic accuracy.**

| Resource | Colour | Thematically accurate? |
|---|---|---|
| **Resin** | Deep green | Yes — sap and saplings |
| **Wax** | Golden yellow | Yes |
| **Pollen** | Hot pink / magenta | **No** — and deliberately so. The conversation proposed this and it is right |
| **Nectar** | Sky blue | **No** — nectar is clear-to-golden. Also deliberate |
| **Royal Jelly** | Pearl white / cream | Yes |

**Two consequences worth writing down now:**
- **Colour is never the only signal.** Green and yellow converge under the most common form of
  colour blindness, so every resource carries a **distinct icon shape** as well as a colour,
  everywhere it appears — hand, hex, cost line, trade offer. Not optional.
- **This is a colour *system*, not art direction.** The owner's mockups decide what the icons look
  like; this table decides which hue each resource owns, and that assignment needs to hold across
  the board tiles, the hand, the costs and any future skin.

---

## 10. Word Bank & Content (REQUIRED)

| Field | Your answer |
|---|---|
| **Does this game use `words.json`?** | **No.** No word content at all — the first fully wordless game in the suite alongside the physics and card games |
| **If no — what content does it need?** | Three small fixed data sets, all constants rather than authored content: the **hex distribution**, the **Bloom Marker distribution**, and the **Instinct deck** composition. All three below |
| **Does it need a new data file?** | **Probably not** — this is ~50 lines of constants, comfortably small enough to live in the plugin file the way `PKO_EVENT_SOUND` and `BLD_ROLE_TABLE` do. A `data/` file only earns its place if the board ever becomes authorable |
| **Any words or topics excluded?** | N/A |

### 10a. The board maths — why the board does *not* shrink for Short Summer

**Owner asked for the numbers behind a smaller board. Here they are, and they say don't do it.**

A hexagonal arrangement of hexes at radius *r* has **V = 6(r+1)²** intersections, and (by Euler)
**E = V + H − 1** edges:

| Board | Hexes | Intersections | Edges | vs standard |
|---|---|---|---|---|
| Radius 1 | **7** | **24** | **30** | 44% of the nodes |
| Radius 2 minus corners | **13** | **42** | **54** | 78% of the nodes |
| **Radius 2 — standard** | **19** | **54** | **72** | — |

*(Sanity check: the radius-2 row reproduces Catan's real 54 intersections and 72 edges exactly, so
the formulas are right.)*

**Finding 1 — 7 hexes cannot hold 4 players.** The Distance Rule means no two Drone Cells may be
adjacent, so the usable capacity of a board is roughly a third of its nodes. On 24 nodes that's
**~8–9 total structures across the whole table**. Four players place **8 in the opening snake draft
alone** — the board is full before the first turn. It works at 2–3 players; it is not viable at 4,
and 4 is in scope.

**Finding 2 — 13 hexes barely helps.** It saves only 22% of the intersections, which is nowhere near
enough to change the touch-target problem (§14), while costing a second hex distribution, a second
Bloom Marker distribution, a second "Tended" layout to design and balance, and a second set of
numbers nobody has playtested.

**Finding 3 — the board was never the length dial anyway.** What makes Catan long is the **point
target** and the **friction in the economy** (steals and discards removing resources from
circulation). Those are §7's settings #1, #3 and #4, and they're free — they need no new content and
no new balancing beyond the one flagged in §6.

**Conclusion: one board, 19 hexes, both Seasons.** This keeps Catan's tested hex ratios, the 6/8
adjacency rule, the 18-marker distribution and the piece limits all intact and unmodified — which
matters, because those numbers are load-bearing and 30 years playtested.

> **This also answers the owner's question about a "Tended" (beginner) arrangement for the short
> board — there is no short board, so only one fixed layout is needed.** Designing that single
> balanced arrangement is a Stage 2 deliverable: a specific hex-and-marker assignment, not a
> hand-wave. Catan's own beginner setup is a reasonable starting point to adapt.

**If a genuinely small board is ever wanted**, the 13-hex option is the only viable one and would
need: 3 Sapling Grove · 2 Blossom Meadow · 3 Clover Patch · 2 Sunlit Rock · 2 Nursery Cell · 1 Smoke
Zone, with 12 Bloom Markers dropping both 2 and 12 and one each of 3, 4, 10, 11 (leaving 3·4·5·5·6·6
·8·8·9·9·10·11). That tightens the curve, which makes production *more* reliable and the game
faster — appropriate for a short mode. **Recorded for completeness; not recommended, not in scope.**

### The hex distribution — 19 hexes, standard

| Hex | Yields | Count |
|---|---|---|
| Sapling Grove | Resin | 4 |
| Blossom Meadow | Pollen | 4 |
| Clover Patch | Nectar | 4 |
| Sunlit Rock | Wax | 3 |
| Nursery Cell | Royal Jelly | 3 |
| The Smoke Zone | — | 1 |
| | | **19** |

*Note the asymmetry is deliberate and load-bearing: Wax and Royal Jelly are scarcer (3 hexes each)
because Queen Domes cost 3 Royal Jelly, and scarcity is what makes the upgrade feel earned.*

### Bloom Markers — 18 markers for the 18 producing hexes

One each of **2** and **12**; two each of **3, 4, 5, 6, 8, 9, 10, 11**. No 7 — that's the Wasp.
The Smoke Zone gets no marker.

**The one placement constraint worth keeping:** in the shuffled layout, **6 and 8 should never sit
on adjacent hexes** (they're the two most frequent numbers and adjacent ones create a runaway
corner). Standard Catan enforces this and it matters.

### The Instinct Deck — 25 cards

| Card | Count | Effect |
|---|---|---|
| **Guard Bee** | 14 | Move the Wasp to a new hex and steal one resource from a player touching it. Counts toward Fiercest Guard |
| **Golden Nectar** | 5 | +1 Hive Point, hidden until the win |
| **Comb Rush** | 2 | Immediately build two Comb Walls free |
| **Spring Bloom** | 2 | Take any two resources from the Meadow |
| **Pheromone Dominance** | 2 | Name a resource; every other player hands you all of theirs |
| | **25** | |

**Does the quantity of content scale with player count?**
**No** — and that's a genuine design property. The 19 hexes, 18 markers and 25 Instinct cards are
identical at 3 and 4 players, and identical across both Seasons. A 3-player match is simply
roomier. Because the board never shrinks (§10a), the deck never needs a second composition.

### Trade Blossoms — 9 ports on the sea frame

Four generic (**3:1, any resource**) and five specific (**2:1**, one per resource type). Reachable
only by placing a Drone Cell on the matching coastal intersection.

---

## 11. Custom Visual Assets

**Art direction is out of scope for this revision — the owner is producing mockups.** This section
records only the *architectural* answer: what needs to go through a render seam, and how many.

| Field | Your answer |
|---|---|
| **Is there a repeated visual primitive?** | **Yes — four of them**, which is more than any game in the suite. See the table below |
| **How many distinct faces/types?** | 6 hex types · 5 resource types · 5 Instinct card types · 3 structure types × 4 player colours · 1 die object |
| **Should it be skinnable later?** | **Not a goal** (owner, Q21) — no reskins are planned, though alternate *bee* art styles may be considered. **The seams still ship in v1 regardless**, because they cost nothing to build now and are expensive to retrofit; that is the standing suite rule for any repeated visual primitive, not a bet on skins happening |
| **Default look for v1** | **Owner's mockups.** Not specified here |

### The four seams

| Primitive | Count | Seam | Why it needs one |
|---|---|---|---|
| **Hex tile** | 6 | `combRenderHex(kind, opts)` | The board's identity. A skin changes all six and the game becomes a different world |
| **Resource token** | 5 | `combRenderResource(kind, opts)` | Appears in the hand, on cost lines, in trade offers, in the discard picker — **four surfaces, so this is the one most likely to drift if built inline** |
| **Instinct card** | 5 | `combRenderInstinct(kind, opts)` + a face-down back | Face-down backs matter — most Instinct cards in play are hidden |
| **Structure** | 3 × 4 colours | `combRenderPiece(kind, playerIdx)` | Drawn on the board dozens of times per match, at small size, in four colours |

**The one hard requirement regardless of art:** every id is **stable and fixed across all skins**.
A skin changes what a Sapling Grove *looks like*; it never changes that the tile is a Sapling Grove
or that it yields Resin.

**Worth flagging for the mockups:** structures render **very small** — a Comb Wall is a line
segment on a hex edge, and there can be 60 of them on screen at once. The identifying detail that
must survive at that size is **whose it is** (the player colour), not what it is. Same for Drone
Cell vs Queen Dome: at board scale, the only thing that must read instantly is *which player* and
*which of the two*. Everything else is decoration.

---

## 12. Multiplayer Classification (REQUIRED)

| Field | Your answer |
|---|---|
| **Own device, or shared?** | **Own device — MDLM only.** Not a preference. Two independent reasons below |
| **Information that must stay private?** | **Yes — the resource hand and the unplayed Instinct cards.** Hand *count* is public (it's what makes a big hand a target); hand *contents* are not. Golden Nectar cards stay hidden until the winning turn |
| **Simultaneous moments?** | **Two.** The 7-discard (every over-stuffed player picks at once) and answering a trade offer (everyone can respond) |
| **Moments where one device is locked while another is active?** | **Most of the match.** Only the active player can roll, build, or open a trade. Everyone else's board is live but read-only — with the two exceptions above |
| **What do non-active players see?** | The full public board, live, updating as the active player builds. Their own hand. Every player's point total and hand *count*. They can look at anything; they can only *act* to answer a trade or discard on a 7 |
| **Roles/phases that don't work with multiple devices?** | None. The reverse is true — several phases don't work on a *single* device |
| **Settings that hide normally-visible info?** | None currently. Would need re-answering if a Sylly Mode adds one |

### Why pass-the-phone is off the table — two independent reasons

1. **The pass count.** A 4-player faithful match is 60–80 turns. Pass-the-phone means **60–80
   physical handovers**, each behind a "don't look" gate screen, because every player has a
   permanent private hand. The suite's worst existing case is a handful of passes per round. This is
   an order of magnitude beyond anything shipped.
2. **The simultaneous moments.** The 7-discard and trade responses have no sensible single-device
   expression — you'd have to serialise them into yet more passes, on the very beat where the game
   wants to be fast.

So: **`supportedModes: ['mdlm']`**, following the precedent of the existing multiplayer-only games.
The game menu still exists and still holds Settings and How to Play — that's suite standard and
doesn't change.

### The private-state shape

The hand is not a one-time deal — it grows and shrinks on **every turn of the match**, from
production, trades, builds, the Wasp's steal, Pheromone Dominance and the 7-discard. Per the
suite's private-hand rule, **every one of those mutations needs a private packet to that hand's
owner**, and the public channel must carry only *counts*, never contents. The established shape is
to send the **whole hand** rather than a delta (so a dropped packet self-corrects on the next
mutation) and to put the send in the single place cards leave the collection, so a mutation added
later inherits it for free.

**This is the highest-volume private-channel usage in the suite by a large margin.** Worth naming
as a Stage 2 risk rather than discovering it in testing. There are **seven** distinct mutation
paths — production, trade in, trade out, build, buy an Instinct card, the Wasp's steal, and the
Overflow — and the suite's rule is to put the private send inside the *single function where cards
leave the collection*, so that a path added later inherits it for free.

### Session survival — see Appendix A

A dropped device currently dissolves the session for everyone, and this game's matches are long
enough to make that matter. **Appendix A** is the full options analysis against the real engine.
Two things from it belong here rather than there:

- **Stable identity across a refresh already works.** `getAuth()` is called with no
  `setPersistence`, so the SDK default (`browserLocalPersistence`) applies and a refreshed device
  gets the same anonymous UID back. This is the piece that looked hardest and is already done.
- **Write `combSerialiseState()` during the build anyway** (Appendix A5). It is the largest single
  piece of any future reconnect, it is far cheaper to write while the state shape is being designed
  than to retrofit, and it earns its keep immediately — the loopback harness wants it, and so does
  the opening snake draft's late-join path.

---

## 13. Screens — Plain English List (REQUIRED)

Layout is out of scope (mockups). This is the *inventory* — what distinct views exist.

1. **Game menu** — Play, How to Play, Settings, Back to the Box. Suite standard
2. **Multiplayer lobby** — engine-owned, shared with every MDLM game
3. **Opening placement** — the snake draft. Each player, in order, places their first two Drone
   Cells and two Comb Walls. Everyone watches; only the current placer can act
4. **The Meadow (the board)** — *the main screen, and where 90% of the match happens.* The board,
   your hand, the current player, everyone's points, and whatever action you're allowed
5. **Scout Flight** — the die casting and landing. May be an animation layered over screen 4 rather
   than a screen of its own
6. **The Overflow** — the 7-discard picker. Appears only on the devices of players who are over the
   carry limit, only when a 7 is rolled
7. **The Wasp lands** — the active player choosing a hex, then choosing whom to steal from
8. **The Waggle Dance** — building and broadcasting a trade offer (active player), and answering one
   (everyone else)
9. **Build** — choosing what to build and where. Likely a mode layered over the board rather than a
   separate screen, since it needs the board visible
10. **The Instinct Deck** — your unplayed Instinct cards, and playing one
11. **How to Play** — suite standard overlay. Will need multiple tabs (§18)
12. **Settings** — suite standard overlay
13. **Match end** — who won, final standings, the Golden Nectar reveal (§17)
14. **The Season Log** — a plain chronological list of turns and what happened in each

**A history/log screen — ✅ yes (screen 14 above), and kept deliberately basic (owner).**

**Owner's framing, and it's the right call:** *"games too long for players to realistically comb
through the logs anyway — more a just-have for now, polish later if necessary."* So: **print the
turn information we already have, in order, and stop there.** No filtering, no per-player views, no
summarising. The data exists because the game must track it regardless; the screen is a cheap window
onto it, not a feature that needs designing.

**One rule it must not break, and it is not optional:** the log respects **exactly** the same
privacy boundaries as live play (§12). It may record *that* a trade happened and between whom; it
may **never** record the contents of anyone's hand, what the Wasp's steal actually took, or an
unrevealed Golden Nectar. **A log is the classic place hidden information leaks after the fact** —
writing an event to a log is not the same as broadcasting it, and it is easy to accidentally log the
*host's* full view rather than the viewer's. Flagged for Stage 2 as a specific thing to check.

A safe line format: *"Turn 14 — Priya rolled 8. Maya +1 Wax; Priya +1 Wax, +1 Pollen. Priya traded
with Theo. Priya built a Comb Wall."*

---

## 14. Complex Interaction / UI Spec

**Layout and visual design are out of scope — mockups pending.** This section covers only the
interaction *structure*, which is design rather than art.

### 14a. The turn action menu — ✅ settled (owner)

After the Scout Flight resolves, the active player gets a small set of actions rather than a free-
form board. **The board stays visible and dominant at all times; actions layer over it.**

| Action | What it opens |
|---|---|
| **Build** | Placement mode (§14b) — Comb Wall, Drone Cell, or Queen Dome |
| **Buy an Instinct Card** | Shows the cost, deducts, reveals the drawn card **to that player only** |
| **The Waggle Dance** | Trade mode (§14c) — *Out Loud* or *Full Dance* per §7 |
| **End Turn** | Passes to the next player |

All four remain available in any order and any number of times until End Turn, which is faithful to
Catan's "build phase" being free-form rather than a fixed sequence.

### 14b. Placement mode — ✅ settled (owner), two-step

**Step 1 — what.** The three build options appear with their costs. **Only the ones the player can
currently afford are highlighted**; the rest are visibly present but dimmed, so a player always sees
what exists and what they're short of. *(This makes §15's cheat sheet partly redundant during a
turn, which is a good thing.)*

**Step 2 — where.** Once an option is chosen, **only the legal targets for that specific option
light up, enlarged**:

| Chose… | What lights up |
|---|---|
| Comb Wall | Every legal edge — connected to your network, not already occupied |
| Drone Cell | Every legal intersection — empty, connected, and Distance-Rule-clear |
| Queen Dome | Only **your own** Drone Cells |

**This is the answer to the touch-target problem, and it's a better answer than shrinking the
board.** A 19-hex board has 54 intersections and 72 edges, which at phone scale puts adjacent
targets ~25px apart — at or below reliable tap size, and well under the suite's 44px standard. But
a player is never choosing among 72 edges; they're choosing among the handful that are legal *right
now*, typically 2–8. **Fewer targets means each one can be drawn large**, and the illegal ones
simply aren't tappable. It teaches the placement rules as a side effect, which §18 flags as the
hardest thing to learn.

**Plus pinch-zoom and pan** — ✅ confirmed by owner, and needed regardless for reading the board.

**Rejection feedback — ✅ owner confirmed a blocker plus a message.** An illegal target is not
tappable at all (it never lights up), so the common case is prevented rather than rejected. But the
Distance Rule specifically deserves an explicit explanation, because a player *will* aim at a
plausible-looking empty corner and find it dark: tapping a dimmed intersection surfaces the reason —
*"Too close to the comb next door."* or *"Nothing of yours reaches here yet."* (§9). Silent
non-response is the wrong behaviour here; the player needs to learn *why*.

### 14c. The Waggle Dance — ✅ settled (owner): two modes, both keep the social layer

**Propose-and-first-accept is vetoed** — owner's reasoning, and it's correct: *choosing your trade
partner is strategically load-bearing.* Handing the deal to whoever taps fastest replaces a
strategic decision with a reflex test, and it's precisely the wrong thing to optimise away in the
one mechanic §3 identifies as the whole point of the game.

#### Mode 1 — **Out Loud** (default)

The negotiation happens **in the room, out loud**, exactly as it does at a physical table. The app's
only job is to execute the deal the players have already agreed:

1. Active player opens the Waggle Dance and builds the agreed swap: *give [X] → get [Y]*, **targeted
   at the specific player they agreed with**
2. That player gets a small confirm prompt: accept or decline
3. Done — resources move

Two envelopes. No timers, no broadcast, no state machine beyond "one offer outstanding".

**This is the recommended default and it is not a compromise.** These are people sitting together;
the app doesn't need to carry a conversation they're already having, and every second it spends
mediating is a second taken from the conversation itself.

#### Mode 2 — **Full Dance** (option)

For groups who want the deal itself in the app — remote play, or a group that prefers formality.

1. Active player posts an offer: **give [X] → want [Y]**, targeted **All** or **one player**
2. Everyone targeted sees it and may **Accept** or **Decline**
3. **10-second auto-decline** on no response *(owner's suggestion — keeps pace and stops one
   distracted player stalling the table)*
4. Once responses are in, **the poster chooses** which accepter to deal with — *this is the step that
   preserves partner choice*
5. Resources move

**One open post at a time**, and **only the active player may post.** Both are faithful to Catan
(trades happen on your turn, with you) and both roughly halve the state machine.

#### What we can afford, and what we can't — the limitations answer

**Infrastructure is not the constraint.** A Full Dance round is ~5 envelopes (1 post + 3 responses +
1 selection). At ~2 trades a turn over 70 turns that's ~700 extra envelopes a match, a couple of
hundred bytes each — well under a megabyte of Firebase traffic per match across all devices. RTDB
latency of 100–300 ms is invisible against a human deciding whether to take a deal. **Firebase will
not notice this game.**

**The constraint is state-machine complexity**, and it is concentrated almost entirely in one
feature:

| Feature | Cost | Verdict |
|---|---|---|
| One open offer, accept/decline, poster selects | Two states, one timer | ✅ **v1** |
| Targeted (private) vs open (all) offers | One field on the packet | ✅ **v1** — cheap |
| 10s auto-decline | One timer, host-owned | ✅ **v1** |
| **Counter-offers** *("I'd do it for two")* | Turns one offer into **N live proposals**, each needing its own validity check, timeout and resolution order. Roughly triples the mode | ⏸️ **v1.1** |
| **"Want ads"** *(post what you want, others bid)* | Same thing from the other direction — a reverse auction. Same cost | ⏸️ **v1.1** |
| Non-active players initiating trades | Unbounded concurrency; needs offer queuing and turn-interruption rules | ❌ **Out** — also not Catan |

**Why omitting counter-offers costs almost nothing here:** *Out Loud never goes away.* A player who
declines can simply say *"I'd do it for two"* — out loud, to a person sitting next to them — and the
active player re-posts. The app has lost a feature; **the table has lost nothing.** That's the whole
argument, and it's why Full Dance can ship without the expensive half and still feel complete.

#### The non-obvious hard part — offer validity

Between posting an offer and executing it, the poster can **build something and spend the resources
they offered.** Two ways to handle it:

- **Escrow** — lock the offered resources at post time. Correct, but needs an unlock path for *every*
  abandonment route: timeout, cancel, turn end, disconnect, host change. Each one missed is a
  permanently locked resource, and it'll be found by a player, not by a harness.
- **Re-validate at execution** ✅ *recommended* — check affordability at the moment the deal is
  struck; if it no longer holds, the trade fails with *"That deal's gone stale."* One check, no
  cleanup paths, no leaks.

**Flagging this now because it's the kind of thing that looks like a detail and becomes a bug
report.** Re-validation is the simpler *and* the more robust choice.

**Where an overlay is needed:** the trade builder and the Overflow discard picker are both "real
content plus input" and want the slide-up panel. The Wasp's steal-from-whom, the trade
accept/decline and the Instinct card reveal are short prompts and want the small centred modal.
**No third pattern is needed anywhere in this game.**

---

## 15. Rule Reference / In-Game Cheat Sheet

**Needed — yes.** Not for a relationship chart (there isn't one) but for the **build costs**, which
players check constantly in physical Catan via a printed card at every seat.

**✅ Settled (owner) — a three-way split, and it maps exactly onto patterns the suite already has.**

| Surface | Where | What it holds |
|---|---|---|
| **1. How to Play `[?]`** | Header of the board screen, beside 🔊 and ✕ — the suite-standard position | The overlay, opening on The Rules tab |
| **2. The Comb tab** | A tab *inside* How to Play | **Resources and build costs** — every resource with its icon and colour, and the four build costs |
| **3. Inline `[?]`** | Beside the resource row on the board | Jumps **straight to The Comb tab**, pre-selected |

**Why this is the right shape:** the suite already has exactly this pattern — a How-to gallery tab
that a mid-play control can deep-link into, via `[abbr]OpenHowTo(tab, highlightId)`. PKO's `[?] The
Chain` does it, and SHP and FLW reach the same tab by tap-hold. So surface 3 is **one existing
function call**, not a new overlay, and there is exactly **one** place resource and cost information
lives.

> **The owner's second reason for putting costs in a How to Play tab is the good one:** it *also*
> serves as the art test surface. Per the suite's gallery rule, the tab must render through the real
> `combRenderResource` seam (§11) — never hand-built markup — which means it can't drift from the
> live game and it doubles as the offline install check. Hand-building it would silently lose both.

| Field | Answer |
|---|---|
| **What reference is needed mid-game?** | Build costs and resource identification, primarily. Secondarily what the five Instinct cards do |
| **How is it accessed?** | Two taps from anywhere (`[?]` → tab), or **one** from the resource row |
| **Does it interrupt play?** | No — standard slide-up overlay, dismissible, game state untouched |
| **Static or dynamic?** | **Dynamic.** In the How to Play tab it's a plain reference; **in placement mode (§14b) the affordability highlighting does the real work**, which is why the cheat sheet is a backstop rather than a crutch |
| **Per-skin version?** | Automatic — it renders through the §11 seams |

**Likely tab set:** **The Rules** · **The Comb** (resources + costs) · **The Instinct Deck**. Three
tabs, matching PKO's precedent exactly.

---

## 16. Sound Design

The suite's existing catalogue covers most of this; the mapping-a-moment-to-an-existing-sound
pattern (as used by PKO and CJAR) is the right shape here. Moments that carry real weight:

| Moment | Sound direction |
|---|---|
| **The Scout Flight cast** | A light rolling/whirring build as the sphere spins, resolving to a soft settle. Warm, not a casino rattle — this happens 60+ times a match and must never grate |
| **Hexes bloom** | A brief bright shimmer when *your* hexes produce. Must be distinguishable from someone else's production without looking up |
| **A 7 — the Wasp** | The one genuinely unpleasant sound in the game. A sharp angry buzz, dropping in pitch. Should make people groan out loud |
| **The Wasp lands on a hex** | A dull settling thud — something heavy arriving where it isn't wanted |
| **A trade accepted** | Bright, mutual, satisfying — two notes resolving together. The game's most social moment deserves its best sound |
| **Placing a Drone Cell** | A soft wax-press. Small, tactile, and satisfying enough to be worth chasing |
| **Upgrading to a Queen Dome** | The same gesture, deeper and fuller — clearly the bigger version of the Cell sound, not a different sound |
| **Taking Largest Comb / Fiercest Guard** | A rising sting, and it must be **audible on every device** — losing it to someone else is information you need |
| **Winning** | Warm and full. Not a fanfare — the hive is thriving, not conquering |

**Music:** inherits the lobby fallback until a track is written. A long match makes a dedicated
track more valuable here than in a 10-minute game — worth writing eventually, not a v1 blocker.

---

## 17. End Screen Content Mockup

Copy only — layout is with the mockups.

```
                        🐝
              THE HIVE IS THRIVING

              [Winner]'s colony has grown
              strong enough to split.

  ─────────────────────────────────────────
   🥇  [Winner]        10 pts
       4 Drone Cells · 2 Queen Domes
       Largest Comb ·  2 Golden Nectar (hidden!)

   🥈  [Player 2]       8 pts
       3 Drone Cells · 1 Queen Dome
       Fiercest Guard

   🥉  [Player 3]       6 pts
       4 Drone Cells

       [Player 4]       5 pts
       3 Drone Cells · 1 Golden Nectar
  ─────────────────────────────────────────

        Longest chain of walls:  [Player], 7
        Guard Bees deployed:     [Player], 4
        Scout Flights this Season:  [N]
        The Wasp landed:            [N] times

              [  New Season  ]
              [  Back to the Box  ]
```

**The one beat this screen must land: the Golden Nectar reveal.** Hidden points are the whole reason
the endgame has tension, and the moment they're revealed is the payoff. Every hidden card should
appear on this screen, marked as having been hidden, so the table gets the *"you were on nine?!"*
moment.

**Does it stay useful for short games?** Yes — even a fast match has a point breakdown worth
reading. The bottom stats block is optional flavour and could be dropped at small board sizes.

---

## 18. How to Play — Teaching Points

**This game needs more teaching than anything in the suite**, and How to Play has to carry it —
there is no shorter path. The suite's multi-tab overlay pattern applies; a likely split is **The
Rules · The Instinct Deck · Build Costs**.

Ordered, one concept per line:

1. **The goal** — first colony to [N] Hive Points, checked on your own turn.
2. **The board** — every hex makes one resource and carries a number. Corners are where you build
   cells; edges are where you build walls.
3. **The Scout Flight** — one cast per turn decides which hexes bloom, *for everyone at once*.
   Not just the active player. **Easy to miss: you collect on other people's turns too, which is
   why you watch every roll.**
4. **Producing** — a Drone Cell touching a blooming hex gives 1; a Queen Dome gives 2.
5. **Building, and what it costs** — the four purchases and their prices.
6. **The Distance Rule** — a new Drone Cell must be at least two edges from *any* other cell,
   including your own. **The single most-missed rule in the game.**
7. **Connection** — everything you build must touch your own network. **Except your two opening
   placements, which are free.**
8. **The Waggle Dance** — trade with players on any terms, or with the Meadow at 4:1. Trade
   Blossoms make the Meadow cheaper.
9. **The Wasp** — a 7 stops all production, over-stuffed players drop half, and the roller parks
   the Wasp somewhere painful and steals. **Easy to miss: the discard hits everyone over the limit,
   not just the roller's target.**
10. **Instinct cards** — one per turn, never on the turn you bought it. **Except Golden Nectar,
    which is never played at all — it just counts at the end.**
11. **Largest Comb and Fiercest Guard** — 2 points each, and they can be *taken off you*.
    **Easy to miss: someone placing a cell in the middle of your walls cuts your chain.**
12. **✨ Sylly Mode** — not yet designed (§8).

---

## 19. Open Questions & Design Notes (REQUIRED)

**Revision 2 status: 17 of Revision 1's 21 questions are closed.** What follows is the answered
register first (so the decisions are recorded and don't get re-litigated), then the four that are
still genuinely open.

### ✅ Answered and closed — Revision 2

| # | Question | Decision |
|---|---|---|
| **Q1** | Title | **Honeycomb Hills.** *Settlers of the Hive* dropped — it was the shortlist's only real trademark exposure |
| **Q2** | Abbreviation | **`comb`** |
| **Q3** | Brand colour | **Bright honey gold `#F0A500`**, dark ink. Lobby sorts by colour, so a warm gold makes a gradient rather than a clash (§1). Implies two follow-ups: JEC off amber-500, CJAR to chocolate |
| **Q4** | Faithful (A) or distilled (B)? | **Both — as `The Season` setting.** Short Summer (7 pts, ~25 min) default; Full Season (10 pts, ~50 min) optional |
| **Q5** | Point target | **7 / 10**, set by The Season. §6 flags the achievement-weighting risk at 7 |
| **Q7** | Player count | **3–4. No 2-player variant** |
| **Q8** | Trade model | **Two modes: Out Loud (default) and Full Dance.** Propose-and-first-accept **vetoed** — partner choice is strategic (§14c) |
| **Q9** | The die | **The Sun Compass.** Not three.js — see Appendix B |
| **Q10** | "Swarm" renames | **Confirmed:** Hive Points · Fiercest Guard · Comb Rush |
| **Q11** | Settlement name | **Drone Cell** — owner reversed to this; it pairs into Queen Dome as a real upgrade line |
| **Q12** | Road name | **Comb Wall** |
| **Q13** | Knight name | **Guard Bee**, pairing with Fiercest Guard |
| **Q14** | Turn clock | **`Daylight`** — All Day (default) · Long Day (90s) · Short Day (60s) |
| **Q15** | Supply limits | **A setting** — `The Meadow's Bounty`, Endless by default |
| **Q16** | "Pheromone Dominance" | **Kept** |
| **Q17** | Log / history | **Yes, both** — basic turn printout, privacy-bounded (§13) |
| **Q18** | Largest Comb edge cases | **Catan's rules verbatim** — longest single path through a branching network; a chain breaks where an opponent's Drone Cell sits; **ties never transfer**, the incumbent keeps it |
| **Q21** | Skins | **Not a goal.** Seams still ship (§11) — they cost nothing now and are expensive to retrofit. Alternate *bee* art styles may be considered later |

**One clarification on Q18, since it was answered "no need to fix what's broken":** Catan's rules
here aren't broken and there's no limitation on our end forcing a change — the only reason to touch
them would be if the traversal were too slow, and on a 72-edge graph it is not (a depth-first search
over that is microseconds). **So Catan's rules stand, unmodified, for the reason you'd want them
to.**

---

### 🔴 Still open

**Q6 — Confirm the board decision by eye.** *(Owner: "if we make the small board distinct enough
with visuals it could work — but need to confirm with eyes on this.")*

Revision 2's recommendation is **19 hexes for both Seasons** and no small board at all, on the
maths in §10a: a 7-hex board physically cannot seat 4 players once the Distance Rule is applied
(~8–9 total structures on the board, and 4 players place 8 in the opening draft alone), and a 13-hex
board saves only 22% of the intersections while costing a whole second set of content and balance.
**The touch problem is solved by placement mode instead** (§14b), which is a better fix because it
also teaches the rules.

**This still wants your eyes on a mockup**, because it's the one call in this revision made purely
on numbers. If a 19-hex board genuinely can't be read on a phone, the conclusion changes — but the
answer would then be a different *presentation* (bigger zoom floor, a rotated layout), not fewer
hexes.

**Q19-b — Does pinch-zoom fight the page?** The action-menu and placement-mode design (§14a/b) is
settled and good. The one unresolved piece: the suite has **never had a pan/zoom gesture surface**,
and the board screen will need to suppress page scrolling while a drag is in progress. There is
precedent to copy — `screen-cld-floe` is on the legacy `h-screen` whitelist for exactly this reason
(*"a page-scroll during a drag would hijack the aim"*), so the board screen almost certainly joins
that whitelist. **Confirmable at Stage 2 rather than now**, but it should not be discovered late.

**Q20 — Reconnect and resume.** ⭐ **See Appendix A** — full options analysis against the real
engine, with three findings that change the answer. Summary: **client reconnect is far more
achievable than expected** (stable identity is already free), **host migration is blocked by a
single line of code** but reopening it has consequences, and there is **one cheap thing to do during
this build** that makes the later work dramatically easier.

**Q22 (new) — Are the JEC and CJAR colour moves being committed to?** `#F0A500` works today, but if
CJAR stays honey-gold indefinitely the lobby carries two near-identical warm keycaps. Not blocking,
and not this game's job to fix — but worth logging in `docs/deferred-work.md` so it isn't lost.

---

### Things that will be complicated to implement — flagged for Stage 2

- **Largest Comb** — real graph traversal, recomputed after every wall *and* every opposing cell
  placement (§4c). The algorithm is settled (Q18); the recompute triggers are the easy thing to miss
- **The board interaction** — placement mode plus pan/zoom (§14b, Q19-b)
- **Trade across devices** — a new category of problem for this codebase; no existing pattern to
  copy. Offer *validity* is the sharp edge, not the packets (§14c)
- **Private hands over 60+ turns** — the highest-volume private-channel usage in the suite. Every
  hand mutation needs its own private repair packet, and there are seven distinct mutation paths
  (production, trade in, trade out, build, buy, steal, Overflow)
- **The board's persistent state** — every other game in the suite resets per round; this one holds
  a growing structure for a whole match, which changes what teardown has to do
- **Match length vs the quit contract** — Appendix A
- **The Season presetting two other settings** (§7) — small, but it's live wiring between settings
  cards and needs the repaint to happen in both the pill handler and `combSyncSettingsUI()`

### Explicitly out of scope for v1

- **Sylly Mode** (§8) — owner: *"game is big and complex enough without it"*
- **All Catan expansions** — Seafarers, Cities & Knights, the 5–6 player extension. Base game only
- **AI / bot players** — no game in the suite has one, and this is the wrong game to build the first
- **2-player variant** (Q7) — needs real house rules, not a toggle
- **A smaller board** (§10a) — the 13-hex numbers are recorded there if it's ever revisited
- **Counter-offers and want-ads in Full Dance** (§14c) — the expensive half of trading, and cheap to
  omit because Out Loud never goes away
- **Skins** — the *seams* ship in v1 (§11); actual alternate skins are not a goal (Q21)
- **Pass-the-phone mode** — ruled out on the reasoning in §12, not deferred
- **Reconnect / resume** — **see Appendix A**; the recommendation is that v1 ships without it but
  does one cheap piece of groundwork

### General notes

**On faithfulness.** The strongest thing about this concept is that the theme isn't painted on — the
board *is* a honeycomb, and the Waggle Dance *is* trading. Every mapping in §9 earns its place.

**On what makes it a Little Sylly Game.** Revision 1 worried that a faithful Catan clone wouldn't
feel like it came out of this box. **Making length a setting resolves that** — the default *is* a
25-minute party game, and the 45-minute version is opt-in for the group that wants it. That was the
best structural decision in this round.

---

## 20. Mood & References

| Field | Your answer |
|---|---|
| **Most similar real-world games** | Settlers of Catan (direct). Distantly: Sagrada, Azul — the same "watch your engine come together" satisfaction at a friendlier length |
| **Tone** | Warm, bright, busy. Competitive but not mean — the Wasp is the only nasty beat and it's played for groans, not damage. A sunny afternoon where everyone's slightly annoyed at whoever's winning |
| **Should NOT feel like** | A spreadsheet. A lecture. Anything requiring the word "apiarist". Also not *cute-to-the-point-of-childish* — the conversation named this the "Toddler App Trap": if it looks too silly, adults will read it as a luck game and stop taking the strategy seriously |
| **Example phrases already written** | "The Waggle Dance" · "Send the scouts out" · "The hive is thriving" · "Yeah, buzz off." · "Which hexes are blooming this turn?" |

---

## 21. Sample Round (REQUIRED)

**Setup:** 4 players — **Maya**, **Theo**, **Priya**, **Sam** — one device each, mid-match.
**The Season: Full Season** (target 10, Wasp on Blocks and Steals, Overflow at 7) — chosen for the
sample because it exercises every mechanic; Short Summer is the shipping default. Current
standings: Maya 5, Theo 4, Priya 6, Sam 3. Priya holds **Largest Comb** (a chain of 6). The Wasp is
sitting on a Clover Patch marked 9.

**It's Theo's turn.**

**Theo** taps **Send the Scouts**. The sphere spins and lands on **8**.

**The bloom.** Two hexes carry an 8 — a Sunlit Rock (Wax) and a Blossom Meadow (Pollen).
- **Maya** has a Drone Cell on the Sunlit Rock → **+1 Wax**
- **Theo** has a Queen Dome touching the Blossom Meadow → **+2 Pollen**
- **Priya** has a Drone Cell touching both → **+1 Wax, +1 Pollen**
- **Sam** has nothing on either → **nothing.** He says so, loudly.

**The Waggle Dance.** Theo has 3 Pollen and 2 Resin, and needs **1 Wax** to finish a Drone Cell.
He broadcasts: *"2 Pollen for 1 Wax — anyone."*
- **Sam** sees the offer and has spare Wax, but Theo building means Theo scores. He declines.
- **Maya** just picked up a Wax and needs Pollen badly. She accepts — **first to tap, so it's hers.**
- **Priya**, who also had Wax, gets the "too slow" state. Nothing is lost; she just doesn't get the
  trade.

**Build.** Theo now has 1 Resin, 1 Wax, 1 Pollen, 1 Nectar — exactly a **Drone Cell**. He enters
placement mode; the board dims and four legal intersections light up. He picks the one touching a
Clover Patch marked 6.

Except — the intersection he picks sits **in the middle of Priya's chain of walls.**

**Result.** Theo is at **5 points** (+1 for the Cell). And Priya's 6-wall chain is now cut into a
3 and a 2, dropping her below Maya's chain of 5 — **Largest Comb transfers to Maya**. Priya goes
**6 → 4**; Maya goes **5 → 7**. Priya, who was leading, is now third, and Theo didn't take a single
point off her directly.

Standings: **Maya 7 · Theo 5 · Priya 4 · Sam 3.** Turn passes to Priya, who has opinions.

---

### Sample round — the Wasp, and one player's limited view

**Same match, two turns later. This one is written from Sam's device only**, to make the
information boundary concrete.

**It's Priya's turn.** She casts. It lands on **7**.

**What Sam sees on his screen:**
- Production stops. Nothing blooms.
- **His own hand: 9 cards** — over the carry limit of 7. **The Overflow** slides up on his device
  and asks him to discard **4** (half of 9, rounded down). He picks 2 Resin and 2 Wax, mostly by
  which he can bear to lose. He taps confirm.
- He can see that **Maya is also discarding** — her hand count ticks down from 8 to 4 — but he
  **cannot see what she threw away.** Theo, on 5 cards, discards nothing.
- **Priya moves the Wasp** onto the Sunlit Rock marked 6 — the hex feeding Maya's Queen Dome. That
  Rock now produces nothing for anyone until the Wasp is moved again.
- **Priya steals from Maya.** Sam sees *"Priya took a resource from Maya"* and Maya's count drop by
  1. He **does not see what it was.** Neither does Maya's screen tell anyone else. Only Priya knows.
- Priya then plays an **Instinct card** — and it's the first card she's played all match, so Sam has
  no idea whether her other three are Guard Bees, Golden Nectar, or anything else. **Priya's visible
  score of 4 might be a real 6.** Sam has no way to know, and that uncertainty is the point.

**Result:** no points changed hands, Maya's best hex is switched off, Sam lost nearly half his hand,
and everyone at the table now has less information about Priya than they did five minutes ago.

---

---

## Appendix A — Reconnect & Resume (answering Q20)

**Written against the real engine, 5 Sep 2026.** Everything below was verified in
`js/engine-multiplayer.js` and `js/lib/firebase-init.js` rather than assumed — three of the findings
change the answer materially, and two of them are better news than expected.

### A1. What is actually true today

| # | Finding | Where | Consequence |
|---|---|---|---|
| **1** | **`getAuth(app)` is called with no `setPersistence`**, so the Firebase Web SDK's default applies: `browserLocalPersistence` (IndexedDB) | [`js/lib/firebase-init.js:27`](js/lib/firebase-init.js#L27) | ✅ **A refreshed device gets the SAME anonymous UID back.** Stable identity across a refresh is **already free** — no new localStorage exception, no device-id scheme, nothing to build |
| **2** | **`fb.onDisconnect(mpRoomRef).remove()`** — the host's own disconnect handler deletes the **entire room node**, server-side | [`engine-multiplayer.js:2516`](js/engine-multiplayer.js#L2516) | ❌ **Host migration is impossible today, and not for a code-complexity reason** — Firebase itself destroys the room the instant the host's socket drops. There is nothing left to migrate *to* |
| **3** | **Client slots are assigned by `Object.keys(players).length`** | [`engine-multiplayer.js:2612`](js/engine-multiplayer.js#L2612) | ❌ A rejoining player would be given a **different seat**, or collide with an occupied one. This is the concrete thing that must change for any reconnect |
| **4** | **No game state is stored in Firebase.** The room holds `hostUid`, `createdAt`, `game`, `maxPlayers`, `lifecycle`, `players`, plus the `/events` and `/private/{uid}` streams — nothing more. All state lives in each device's JS memory | `mpHostCreateRoom` | ❌ A rejoiner has nothing to read. Some form of state handoff must be built |
| **5** | **`mpJoinListenFrom = Date.now()`** — the event listener filters out everything written before the device joined | [`engine-multiplayer.js:2622`](js/engine-multiplayer.js#L2622) | A rejoiner does **not** replay history. See A4 for why that's fortunate |
| **6** | **`fb.onDisconnect(playerRef).remove()`** on the client side | [`engine-multiplayer.js:2619`](js/engine-multiplayer.js#L2619) | ✅ A dropped client already removes its own roster entry. The *detection* half is done — it's the *response* that's wrong |

**Reading these together:** the pieces that looked hardest (identity, drop detection) already exist.
The pieces that are missing are a **state snapshot**, **seating by UID**, and — critically — the
engine currently treats a drop and a deliberate quit as the same event.

### A2. The three requirements

Any reconnect at all needs all three of these true:

| Requirement | Client drop | Host drop |
|---|---|---|
| **(a) Stable identity across the refresh** | ✅ already true (Finding 1) | ✅ already true |
| **(b) The room still exists** | ✅ true — only `/players/{slot}` is removed | ❌ **false** — Firebase deletes the room (Finding 2) |
| **(c) The rejoiner can obtain current state** | ❌ must be built | ❌ must be built |

**This is the whole shape of the answer.** A client dropping is two-thirds solved already. A host
dropping is a different, much larger problem — and the asymmetry is why they should be treated as
two separate projects rather than one feature.

### A3. The options

#### Option 1 — Client Reconnect (host holds the state) ⭐ **recommended, post-v1**

The host already *is* the authority; nothing new needs to be invented, only surfaced.

**The flow:** client drops → host notices (its `/players` watcher fires) → host marks the seat
**Away** and, if it was their turn, **pauses** → every device shows *"Waiting for Theo…"* → Theo
returns, gets the same UID back, rejoins the room → host sends a `COMB_FULL_STATE` snapshot
**privately** to Theo's UID → Theo is back exactly where he was.

**What has to change:**

| # | Change | Size | Scope |
|---|---|---|---|
| 1 | Keep the `/players` watcher alive **mid-game** (today it is cancelled before `GAME_START` in `mpConfirmRoster`) | Small | Engine |
| 2 | **Seat by UID, not by roster length** — a returning UID reclaims its original slot | Small | Engine |
| 3 | **Distinguish a deliberate quit from a drop.** A quit button → today's dissolve behaviour, unchanged. A socket drop → pause and wait | Medium | Engine — **and it redefines the Mid-Game Quit Contract, which `tools/verify-mp-configs.js` §6 asserts across all 19 games** |
| 4 | A `combSerialiseState()` / `combApplyState()` pair | **Largest piece** | Per-game |
| 5 | An "Away / paused" state on the board screen | Small | Per-game |

**Feasibility: high.** No new infrastructure, no new localStorage exception, no change to the
privacy model, no new dependency.

**Covers:** phone locked, tab refreshed, app backgrounded and killed, brief network drop, battery
saver, accidental back-navigation. **That is the overwhelming majority of real-world drops.**

**Doesn't cover:** the host dropping.

**The catch worth naming:** change 3 is not a Honeycomb Hills change. It alters what the Mid-Game
Quit Contract *means* for every game in the suite, and that contract is machine-verified. That's an
argument for doing it as **deliberate engine work with its own spec**, not as a sub-task of a game
build.

#### Option 2 — Host Migration (post-v1, separate project)

**Blocked at the first step by Finding 2.** Removing `onDisconnect(mpRoomRef).remove()` is a
one-line change, but that line is load-bearing: without it, every abandoned room persists in the
database forever, so it needs a TTL or a cleanup story before it can go.

Assuming that's solved, the new host needs the full state. Two shapes:

| | **2a — Host mirrors everything to `/state`** | **2b — Split mirror** ⭐ |
|---|---|---|
| How | Host writes the complete game state to `rooms/{code}/state` each turn | **Public** state to `/state`; each client **re-asserts its own hand** to the new host on promotion |
| Privacy | ❌ **Puts every player's private hand in a node any room member can read.** Directly contradicts the private-channel model FLW and PKO were built on — in a game where hidden hands are the point | ✅ Preserved — private data never leaves its owner's device unencrypted |
| Trust | Host-authoritative throughout | Slightly weaker — a client could lie about its hand on promotion. **In practice acceptable:** the model already trusts clients not to read Firebase directly, and this is a party game among friends in one room |
| Verdict | Don't | The right shape if this is ever built |

**Plus:** deterministic host election (lowest connected slot index), reconciliation of packets
in flight when the host vanished, and a state serialiser for **every** game that adopts it.

**Feasibility: medium-low as part of this build. High complexity, high blast radius** — it changes
the room lifecycle for all 19 games. **This is suite infrastructure, and it should be paid for once
by the suite rather than by one game.**

#### Option 3 — Replay the event log instead of snapshotting ❌ **not viable**

Superficially attractive: the rejoiner reads `rooms/{code}/events` from the start and replays every
envelope, so **no serialiser is needed** — the appliers already exist. It fails on three independent
counts, and it's recorded here so nobody proposes it later:

1. **Private packets aren't in `/events`.** They're in `/private/{uid}`, which is exactly where hands
   live — so hands cannot be rebuilt by replay at all
2. **Appliers have side effects.** Replaying 60 turns would fire 60 turns' worth of sounds, animations
   and screen transitions
3. **The host's own mutations were never broadcast.** Per the dedup-guard rule, a host mutates its
   state directly and only broadcasts the *result* — so the event log is not a complete history of
   the match in the first place

#### Option 4 — Shorten matches ✅ **already done**

`Short Summer` as the default (§7) cuts typical exposure from ~50 minutes to ~25. It doesn't fix
anything, but it halves how much is at stake when it happens.

### A4. Recommendation

1. **v1 ships without reconnect**, with Short Summer as the default so exposure is ~25 minutes. This
   is the same risk every other MDLM game in the suite already carries, just for longer.
2. **Do the one cheap thing during the build** — see A5. It is the difference between Option 1 being
   a medium project and a large one.
3. **Option 1 is specced afterwards as an engine feature**, not a Honeycomb Hills feature, because
   changes 1–3 benefit all 19 games and one of them redefines a machine-verified contract.
4. **Option 2 (host migration) stays a separate later project**, gated on whether Option 1 turns out
   to be sufficient in practice. It probably will be: hosts drop far less often than clients, since
   the host is usually the person who organised the game and is paying attention.

### A5. ⭐ The cheap insurance — do this *during* the build

**Write `combSerialiseState()` / `combApplyState()` as part of v1, even though nothing calls them
for reconnect yet.**

It is change #4 above — the single largest piece of Option 1 — and it costs **a fraction as much
now** as later, because the state shape is being designed *right now*. Retrofitting a serialiser
means reverse-engineering which of ~40 variables are authoritative, which are derived, and which are
presentation-only, months after anyone remembers.

**And it pays for itself immediately, independent of reconnect:**

- **A loopback harness needs it.** The suite's rule is to prove the packet contract with a host↔client
  loopback over a Firebase-shaped wire before the real multi-device session. A full-state serialiser
  is what lets that harness assert host/client parity in one comparison instead of field by field
- **It is the natural shape of the "client joins late" path** the opening snake draft needs anyway
- **It makes the private-hand repair rule (§12) enforceable** — "send the whole collection, not a
  delta" is trivial when a serialiser for that collection already exists

**One design note that makes it work:** serialise **authoritative state only** — the board, the
structures, the hands, the deck position, the scores, the Wasp's location, whose turn it is. Never
derived values (Largest Comb's holder is *computed* from the walls, not stored) and never
presentation state. A serialiser that includes derived data is one that can be restored into a
self-contradictory position.

---

## Appendix B — The Sun Compass (answering Q9's implementation)

### B1. Not three.js — three reasons, one of which is decisive

| Reason | Detail |
|---|---|
| **Project rule** | *"Do NOT add external JS libraries"* is a stated anti-pattern. The only two in the project are vendored and load-bearing (Tailwind, Firebase). A third for one animation on one screen isn't a close call |
| **PWA weight** | three.js is ~600 KB uncompressed. This app precaches everything it ships; that single file would be larger than the entire rest of the JS, and it would land in every install |
| **⭐ There is nothing to simulate** | **The decisive one.** The roll's outcome is chosen *before* the animation starts (§4a) and the host broadcasts it so every device shows the same number. The Compass is a **presentation of a decided result**, not a physics object. A 3-D engine would be simulating an outcome it has already been told |

### B2. What to build instead

| Option | What it is | Size | When it's right |
|---|---|---|---|
| **CSS / DOM** ⭐ | A radial-gradient orb; `transform: rotate()` plus a slight blur, eased out; the number cross-fades in as it settles | ~40 lines CSS, ~20 JS | **The default.** Zero assets, zero deps, inherits the global `prefers-reduced-motion` block for free |
| **2D canvas** | Same thing with real control — a rotating specular highlight, a wobble on landing, motion blur | ~80–120 lines | If the CSS version reads flat. Precedent exists in `js/arcade/asherplane.js` and `js/games/cld.js` |
| **Sprite sheet** | Pre-rendered 3-D frames as one image strip, played back | Art + ~20 lines | Genuinely 3-D-looking with no library — but adds a precached binary, an SW version bump, and locks the look to one skin |

**Recommendation: start with CSS.** It is an afternoon, it costs nothing, and if it feels flat the
canvas version is a contained upgrade behind the same function.

### B3. ⚠️ The constraint that matters more than the technique

**This animation fires 60–80 times a match.**

At a cinematic 3 seconds each, that is **3–4 minutes of a 25-minute match spent watching a die**.
The most beautiful possible Sun Compass, played in full every turn, would actively damage the game.

- **Budget ~800 ms–1.2 s**, total, including the settle
- **Make it tappable-to-skip** — a player who has seen it fifty times should be able to cut to the
  result
- **Consider shortening it after the first few rolls** — the full flourish for the opening rolls of
  a match, an abbreviated version thereafter. Cheap to do, and it's the kind of thing that separates
  a good digital board game from a tiring one

**Get this right and the single-die substitution is a genuine improvement on two dice. Get it wrong
and it is the most-repeated annoyance in the game.**

---

**End of brief — Revision 2.**
