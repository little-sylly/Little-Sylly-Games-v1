# New Game Brief — COLD SHOULDER
**Document type:** Phase 1 — Design Brief (non-technical)
**Who fills this in:** Project owner + AI, before any technical work
**What happens next:** Hand to Claude Code alongside `new-game-technical-template.md` for the Stage 2 tech spec.

> **REVISION 3 — 2 Sep 2026.** Second owner review folded in. Changes from Revision 2: the brand
> is **settled** (`#8ECAE6` with white ink everywhere, §1); the 1v1 mode is named **Peck Off**;
> **a commit is now final** — re-opening a locked aim is out, reversing Revision 2's Decision 9;
> the Thaw's **minimum floe radius** is set at half a full-power Slide; Peck Off is **2-player
> only**; and **7–8 players stays in scope** as a deliberate chaotic flavour rather than a defect
> to design around. **No blockers remain** — the only open items are two tuning values. See the
> Decisions Log in §19.
>
> *Revision 2 had folded in: **Lunge → Slide** and **Squirt → Snowball**; the Drowned rim mechanic
> reworked to assigned-random placement with left/right diving; distance-scaled Snowball force; the
> Peck Off mode; the interactive power bar; Pass-the-Phone promoted from impossible to
> designed-but-deferred; `playSplash` approved; and the §16 music prompt.*

> **Origin note:** A reskin/distillation of *Globulos* (GlobZ, 2000 — later *Globulos Party* on
> DSiWare). The original was 20 minigames sharing one mechanic: aim a spherical creature, drag to
> set direction + power, then all players' moves resolve simultaneously on a physics board. **Cold
> Shoulder distils that to the "Sumo" / knock-off-the-edge variant**, reskinned as penguins barging
> each other off an ice floe. Slippery ice diegetically justifies the low-friction sliding that
> makes the mechanic feel good.
>
> **The simulation ships as a shared module** — the physics equivalent of `js/lib/cards.js` — so
> further modes can ride on it later. **v1 ships this game and The Thaw, nothing else** (§19).

---

## 1. Identity (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Full game name** | Cold Shoulder |
| **Short nickname / abbreviation** | `cld` — verified free against all 18 shipped abbreviations |
| **One-sentence tagline** | "Barge your mates into the drink — last penguin on the floe wins." |
| **Thematic universe** | A crowded Antarctic ice floe. Slapstick-cute penguin colony, gleeful schadenfreude, cosy-cold. Nature-documentary framing played for laughs, not awe |
| **Emoji / icon** | 🐧 |
| **Brand colour** | **Glacier Blue `#8ECAE6`** with **white** text on every surface — no `ctaTextClass` override, no per-surface exception. **Settled** (owner, 2 Sep 2026) |

### Contrast note — settled, with the tradeoff recorded

White on `#8ECAE6` measures **~1.79:1** (dark ink on the same fill measures ~8.6:1). The owner has confirmed it as visually acceptable, so **white everywhere is the decision** and Cold Shoulder ships with no ink exception — the simplest of the three options considered.

Recording the tradeoff rather than burying it, because it has one consequence worth knowing at build time: the pale fill leans on `.gel-btn`'s dark base gradient and label text-shadow to carry the text. **On the menu buttons that is present and the label reads fine. On any *flat* brand-fill surface it is not**, so where Cold Shoulder uses `#8ECAE6` outside a gel button — a gameover CTA, a decision-modal confirm — the label wants a text-shadow of its own to match. Cheap, and worth doing at build rather than discovering in sunlight.

**Suite alignment:** FRT and CJAR currently ship white on their lobby keycaps but **dark ink on their in-game CTAs** ([`css/styles.css:2105`](css/styles.css#L2105) is explicit that the white is "Lobby keycap only… without touching in-game CTAs"). Bringing them into line with this decision is **deferred** — it is a ~10-site change, not the two buttons it looks like, and it is logged in `docs/deferred-work.md` with the full site list. Cold Shoulder does not wait on it.

---

## 2. The Players (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Player count range** | **3–8** in the standard game. Sweet spot 4–6. **Plus a dedicated 2-player mode — Peck Off — where each player controls two penguins** (§7) |
| **Teams or individuals?** | Individuals — free-for-all. Peck Off is 1v1 |
| **Are there different roles?** | No asymmetric roles, but **two penguin states**: **Standing** (on the floe) and **Drowned** (in the water). Every penguin starts each Floe-Off Standing; Drowned penguins keep playing with a different, weaker control set |
| **Is any information hidden from some players?** | Yes — every player's committed aim (direction + power, or dive + Snowball for the Drowned) is hidden from everyone until all players commit and the Slide resolves. This blind simultaneous commit is the core tension |
| **Minimum meaningful player count** | **2**, via Peck Off. The standard free-for-all wants 3+ |

### The two states

No roles, but two **states** with different verbs. Both are active every Slide — **nobody ever sits out.**

| State | What you control | Can you score? |
|---|---|---|
| **Standing** | A full **Slide** — drag back from your penguin to set direction + power, release to arm, Lock It In to commit | Yes — surviving to the end of a Floe-Off catches the Fish |
| **Drowned** | A **Dive** (shuffle one Berth left or right along the rim, or stay) **and** a **Snowball** (a weak lob at a point on the floe) | No — out of contention for this Floe-Off. You play for chaos and revenge |

**Notes:** The only state carried between Floe-Offs is the Fish tally. Everyone **Resurfaces** onto the floe at the start of each Floe-Off regardless of how the last one ended.

---

## 3. The Core Loop (REQUIRED)

**In one sentence — what does a player DO on their turn?**
Drag back from their own penguin to set a slide direction and power, then commit — and all penguins slide at once.

**What is the central tension or fun moment?**
The blind simultaneous resolution. Everyone aims at the same time, nobody can see anyone else's plan, then the whole floe erupts into sliding, colliding penguins with at least one comedic plunge into the Drink. The "OHHH NO" / "I MEANT to do that" reaction is the game.

**What type of game is this closest to?**
☒ **Something else: physics / dexterity party game (aim-and-fling, simultaneous-commit).** The suite's first skill/physics game — every prior game is word, card or social.

**Walk through one complete round step by step, in plain English:**

A **Floe-Off** (one match) is a sequence of **Slides** until one player has the only penguin left Standing:

1. All penguins **Resurface** onto the floe, spread evenly. Each player sees the whole floe on their own phone with their own penguin ringed in their colour.
2. **Every player commits, simultaneously and blind.**
   - **Standing** penguins drag back to set direction + power, release to arm, and Lock It In.
   - **Drowned** penguins choose a **Dive** (left, right, or stay) and aim a **Snowball** at a point on the floe.
3. Once everyone has committed (a readiness check), the Host resolves the Slide as one authoritative simulation: Dives resolve first (a Drowned penguin submerges and surfaces at a new spot), then every Standing penguin's slide and every thrown Snowball launch together and play out on a shared clock — Snowballs are not instant, so a fast, close one can land and nudge a penguin out of a slower one's path before it arrives (§3, The Snowball) — and every collision, rebound and Ice Breaker hit resolves as the timeline unfolds.
4. Any penguin that slides off an open stretch of edge takes the plunge into the Drink. It is **Drowned** for the rest of this Floe-Off — but not out: from the next Slide on it plays from the rim.
5. If two or more players still have a penguin Standing, repeat from step 2.
6. When one player has the only penguin left Standing, they catch a **Fish** (one point). Everyone Resurfaces and the next Floe-Off begins.
7. First player to the target number of Fish wins.

**Is there anything players do simultaneously, or is everything sequential?**
Fully simultaneous — including the Drowned. **Every player taps something every single Slide.** There is no spectating and no dead time; a design requirement, not a nice-to-have.

**How does the phone physically move between players?**
In the standard game it doesn't — each player has their own device. A Pass-the-Phone variant is genuinely viable and is designed in §12, but is deferred past v1.

### The Drowned — the rim mechanic in full

The part that most distinguishes Cold Shoulder from the Globulos original, and the part most likely to go wrong if left vague.

**The rim is divided into Berths — one per player.** A Berth is an arc of the circumference, not a slot: several Drowned penguins can share one.

**Where you end up is assigned, not chosen.** When you go in, you surface at a **random position within whichever Berth you drowned at**. This is deliberate — a *chosen* position turns the rim into an optimisation puzzle played by people who are already out. A random one keeps them dangerous without letting them snipe.

**Your control is a Dive, not a placement.** Each Slide a Drowned penguin may **shuffle one Berth left, one Berth right, or stay**. Diving submerges you and surfaces you at a **new random position inside the target Berth**. So you steer your *neighbourhood*, never your exact spot. Two penguins can share a Berth but never the same position; if a target Berth has no free position you stay where you are — a Dive can fail, but a plunge, below, cannot.

**A plunge into a full Berth cannot fail — it shunts instead.** A Dive is a voluntary move and is allowed to fail; a Standing penguin going into the Drink is not voluntary, and the game must always have somewhere to put it. If the Berth a penguin plunges into has no free position, the game checks its two neighbours and shunts to **whichever has more free space**, surfacing there instead.

**The search expands outward if it has to — this is not a one-hop rule.** Under The Thaw, at a crowded 7–8 player table, it is entirely possible for a Berth *and both its immediate neighbours* to be full at once — Drowned players cluster by choice, and a narrow late-match rim makes clustering easy. When that happens the search keeps stepping outward, one Berth further in each direction per step, until it finds one with space. At every step, a tie between the two current candidates (including both full) is broken by the **direction the penguin was travelling at the moment it went in** — its exit velocity's sideways component picks which side to check first; a dead-straight exit defaults clockwise.

**The search is guaranteed to terminate, and it is guaranteed by a rule already in the brief rather than a new one.** §4's minimum-floe-radius invariant exists precisely to stop the rim ever packing solid with bumpers — which is the same statement as "total capacity across every Berth always exceeds the maximum number of penguins that can be Drowned at once" (at most N−1 of N players, since a Washout is a separate case). That invariant is what makes an outward search safe to write with no fallback for "nowhere left to put them": local clustering can force the search to travel several Berths, but the rim can never be full everywhere at once, so it always finds a home. This is the same reason The Thaw makes shunts *more common* as a match goes on — worth flagging for the tech spec as a scenario to specifically playtest, not just prove on paper.

**A Drowned penguin is a bumper, not a barrier.** On contact it **shoves a Standing penguin back onto the floe harder than it arrived** (physically: an immovable body with restitution greater than 1). It does not cushion and it does not save — being flung off a furious ex-player is usually worse than the edge you were heading for.

This is the most important rule in the section. A *cushioning* bumper would make the floe progressively **safer** as players drown, so Floe-Offs would drag exactly when they should be resolving. An energetic bumper does the opposite: the rim gets more dangerous as the match goes on, and matches accelerate toward their end.

**The rim cannot close, and now it cannot close by construction.** Because Drowned penguins are discrete bodies at points on the rim rather than arcs covering it, seven Drowned penguins on a full-size floe occupy roughly 20% of the circumference — the remaining 80% is open water and always was. Revision 1 needed an explicit "≥40% open" invariant; the assigned-position model makes it a consequence instead of a rule. **The one place it still needs enforcing is under The Thaw** (§8), where the rim shrinks while penguins do not.

### The Snowball

**A Snowball is a nudge, not a weapon.** A Drowned penguin scoops a handful of brash ice from the water's edge and lobs it at a point on the floe. **It is thrown at the same instant every other commit fires, but it is not instant itself — it travels, and takes real time to arrive.** Because the throw is aimed before anyone sees the Slide play out, the thrower can see where everyone is resting and pick a point — but cannot see which way that person is about to slide. **A Snowball spoils a trajectory; it never chooses a victim's fate.**

**Force and travel time both scale with distance — this is what makes the Dive worth doing.** A Snowball thrown close to its source hits at **2/5 of a full-power Slide** and arrives almost immediately; at maximum range it decays to **1/5** force and takes noticeably longer to land. Closer is stronger *and* faster, which is both physically sensible and the reason repositioning matters: shuffle toward the action and your nudges bite harder and land sooner.

**Snowballs resolve one at a time, in the order they actually land — never all at once, and never summed.** This is the single most important rule in the section, and it is a genuine physics decision rather than a UI detail: two Snowballs aimed at the same spot from different distances are **racing**, not stacking. Picture two Drowned players both throwing at Priya — one close and fast, one far and slow. The close one lands first, at its full force, exactly as if it were the only Snowball thrown. If that impact moves Priya even slightly, the second Snowball is now aimed at empty ice — **it can miss entirely**, having been rendered obsolete by the first hit rather than adding to it. There is no such thing as two Snowballs landing on the same penguin at full combined force; the only way a penguin takes two hits is if it is still near the first impact point when the second one arrives, which is exactly the kind of bad luck (or good aim) the timeline decides on its own.

This is what replaces the old idea of a force cap. **There is no aggregate cap, because there is nothing to aggregate** — impacts are independent events resolved against wherever the target actually is at that moment, not vectors summed and applied together. The only guarantee that survives is a per-throw one: **a single Snowball, at any range, is calibrated to never by itself push a *resting* penguin off the floe.** A penguin already skidding toward the edge from a collision, or one standing right at the rim, can absolutely still be tipped in by a nudge that arrives at the wrong moment — that is the timeline working as intended, not a broken guarantee. `[Snowball force values and the travel-speed constant are tuning values — see §19.]`

### Ice Breaker — the early-game guardrail (a setting, off by default)

The blind-commit chaos is the whole game, but a brand-new table's very first Slide can be a coin-flip elimination before anyone has learned to read the floe. **Ice Breaker** (§7) addresses this without touching the core loop: it seeds the floe with a small number of static ice chunks — **Bergs** — sitting between the true edge and the open ice.

**A Berg is a shock absorber, not a wall.** A Standing penguin that would otherwise plunge past a Berg's position **rebounds off it instead of going in**, and the Berg takes one hit. This is a **cushioning** bounce, not an energetic one — a deliberate contrast with the Drowned penguin's rebound (§3, above), and the contrast is the point: Bergs protect the early game, Drowned penguins punish the late game, and the shift from safety to danger over the course of a Floe-Off is the arc the whole rim mechanic is built around.

**A Berg has a hit capacity — the setting's OFF / 1 / 3 options — and shatters when it runs out.** At 0 remaining hits it disappears and that stretch of rim becomes a normal open edge for the rest of the Floe-Off. Once shattered, it does not return, even across Slides — only a Resurface reseeds fresh Bergs.

**Drowned penguins can Snowball a Berg on purpose.** A Snowball landing on a Berg damages it exactly like a penguin collision does — one hit, regardless of the Snowball's force at that range. This gives a Drowned player a genuine second use for their throw beyond harassing a rival: **clear a guardrail deliberately**, either to speed the match toward its end or to open a lane toward a rival they are tracking. Both are legitimate strategies and neither needs a new control — it is the same "aim a point on the floe" Snowball action, just aimed at a Berg instead of open ice.

**Bergs shrink inward with the rim under The Thaw**, exactly like Drowned penguins and Berths — never stranded, never pushed off the board, and no special-casing needed against the minimum-floe-radius rule.

**Placement, count and no art required.** One Berg per Berth is the working default, sitting inboard of the true edge so early elimination is guarded but not prevented. A Berg needs no illustrated asset — a procedurally-drawn ice chunk with a crack overlay that deepens as its hit count falls costs nothing and reads clearly, so it sits outside §11's numbered inventory rather than adding a tenth file. `[Berg count and exact placement radius are tuning values — see §19.]`

---

## 4. Rule Relationships & Interaction Matrix (if applicable)

No "beats / outranks" chain — this is a physics game. But it **does** have a body-interaction matrix, and that is exactly the class of thing this section exists to stop going subtly wrong. Every interaction in the game is one row here; every other section points back to this table.

| Element | Interacts with | What happens | Notes |
|---|---|---|---|
| **Standing penguin** | Standing penguin | Elastic collision, momentum transfers both ways | Equal mass, equal radius. The core interaction. In Peck Off this includes **your own two penguins** |
| **Standing penguin** | Open edge | Falls in → **Drowned** for the rest of the Floe-Off, surfacing at a random position in the Berth it left from — or, if that Berth is full, shunted to the neighbour with more space | The only elimination in the game. Shunt rule and tie-break in §3 |
| **Standing penguin** | Drowned penguin | **Energetic rebound** — flung back onto the floe faster than it arrived | Restitution > 1. The Drowned body does not move |
| **Standing penguin** | Berg | **Cushioned rebound** — bounces off, does not drown, the Berg loses one hit point | Restitution ≤ 1, deliberately the opposite of the Drowned-penguin row. Ice Breaker setting only |
| **Standing penguin** | Snowball | A timed impulse (**2/5 of a Slide at close range decaying to 1/5 at max**) landing at its own travel-time, not instantly | Resolved one throw at a time in landing order — never summed. See §3 |
| **Drowned penguin** | Anything | Never moves under physics, never scores, cannot re-enter the floe | Immovable for the whole Floe-Off. Moves only by its own Dive |
| **Drowned penguin** | Drowned penguin | Cannot occupy the same **position**; can share a **Berth**. A Dive into a full Berth fails and the penguin stays put | The only Drowned-on-Drowned rule |
| **Snowball** | Snowball | Never combine, amplify or cancel — each resolves independently against the target's position at its own arrival time | An earlier landing can move the target clear of a later one, which then simply misses |
| **Snowball** | Drowned penguin | Nothing | A Snowball cannot dislodge a Drowned penguin |
| **Snowball** | Berg | Damages it by one hit point, same as a penguin collision, regardless of range | A Drowned player's deliberate way to clear a guardrail rather than harass a rival |
| **Berg (0 hits remaining)** | — | Shatters — that stretch of rim becomes a normal open edge for the rest of the Floe-Off | Does not return until the next Resurface |

**Closed loops:** none — no bidirectional "beats" relationship exists.

**Cross-group links:** one, and it is the important one — **Drowned → Standing**, in two directions (rebound and Snowball). Nothing goes the other way: a Standing penguin can never affect a Drowned one. That asymmetry is deliberate — the Drowned are terrain and weather, not opponents.

**Dead ends:** the Drowned penguin is a dead end by design — it affects the game but nothing in the game affects it. Balanced by the fact that it cannot score.

**Wildcards:** none.

**Does anything change these relationships temporarily?** Yes — **The Thaw** (§8). The floe shrinks each Slide, moving the rim inward. Every row above is unchanged; what changes is geometry. Explicitly:
- **The number of Berths does not change.** It stays equal to the player count for the whole match. What shrinks is each Berth's **range** — the same number of Berths dividing a shorter circumference, so each one narrows.
- Drowned penguins **and any surviving Bergs move inward with the rim**, keeping their relative position. Never stranded in open water, never pushed off the board.
- **A minimum floe radius is required, and it is set relative to the game's own scale:** the floe stops shrinking at **half the distance a full-power Slide travels**. Below that, two things break at once — penguins keep their size while the rim shrinks, so the rim eventually packs solid with bumpers and the last survivors cannot be knocked off; and a full-power Slide would overshoot the entire floe in one go, making aim meaningless.

  Defining the floor **relative to slide distance rather than as an absolute number** is what makes it robust: a full-power Slide always crosses roughly the whole floe at minimum size, at every setting. It does mean the floor **moves with Ice Conditions** — Black Ice carries further, so it bottoms out at a larger floe than Powder does. That is correct rather than a quirk: slipperier ice needs more room to stay playable. `[The half-a-Slide figure is the owner's call and a sound invariant; the exact multiplier is still a tuning value.]`

  This is a hard requirement, not polish — and it doubles as a fine dramatic climax: a tiny disc ringed shoulder-to-shoulder with furious ex-players, where one full-power Slide crosses the whole world.
- No row's *behaviour* changes. The Thaw is a geometry rule, not a rules rule — which is precisely why it is safe as a Sylly Mode.

---

## 5. Winning (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **How does a game end?** | When a player reaches the target Fish count (a host setting — §7) |
| **How is the winner determined?** | First player to the target number of Fish |
| **Are ties possible, and if so how are they handled?** | A Floe-Off has exactly one winning **player** and awards exactly one Fish, so the game cannot end in a tie. The edge case is a **Washout**: if a single Slide leaves no player with a penguin Standing, the floe ends empty. No Fish is awarded, and after a dedicated beat — the descending sound, a "WASHOUT!" flash, a 1.5 s hold on the frozen result (§16) — everyone Resurfaces and that Floe-Off replays from scratch. Handling this explicitly is what stops a Floe-Off soft-locking. **In Peck Off** the same rule applies at the player level — if the last two penguins belong to different players and both go in on the same Slide, it is a Washout |
| **Roughly how long should a full game take?** | ~8–15 min. A Slide resolves in a few seconds; a Floe-Off is a handful of Slides; a game is a handful of Floe-Offs (default 3 Fish) |

**Peck Off win condition:** a player is out when **both** their penguins are Drowned. The Floe-Off goes to the last player with at least one penguin Standing — not the last penguin. A player down to one penguin is still fully in it.

---

## 6. Scoring (REQUIRED)

| What happened | Who gets points | Roughly how many | Notes |
|---|---|---|---|
| Last player with a penguin Standing | That player | **+1 Fish** | The only way to score |
| Knocked into the Drink | nobody | 0 | That penguin becomes Drowned and plays from the rim for the rest of the Floe-Off |
| Rebounding a rival off you into the Drink | nobody | 0 | Deliberately unrewarded — see below |
| Snowballing a rival into the Drink | nobody | 0 | Cannot happen anyway (§3), but stated for completeness |
| **Washout** — no player has a penguin left after a Slide | nobody | 0 | Floe-Off voided, Resurface, replay |

**Does scoring feel balanced?**
Self-balancing within a Floe-Off: as penguins drown the floe empties (more room for survivors) but the rim gets more dangerous (more bumpers), so the two effects pull against each other and neither snowballs. Across a game, blind simultaneous commit means even a strong aimer cannot fully control outcomes.

**A deliberate decision: Drowned players score nothing, ever.** It is tempting to reward a good rebound or a well-placed Snowball — the obvious "keep them invested" lever. Rejected for two reasons. First, attribution in a multi-body physics collision is genuinely ambiguous (if A snowballs B, who bounces off C into D, who falls — who gets it?), and any rule resolving that will feel arbitrary in the moment. Second and more importantly, an unrewarded Drowned player is a **chaos agent with nothing to lose**, which is funnier and less predictable than one optimising for points. Their motivation is revenge, and revenge doesn't need a scoreboard.

**Fish survive as the scoring currency** because the weak-nudge item is a Snowball, not a thrown fish (§19). Had it been a fish, the currency would have needed renaming to avoid two unrelated fish in one game.

**Any outcomes where nobody scores?** Yes — the Washout, above.

---

## 7. Settings (REQUIRED)

| Setting name | What does it change? | Options | Default |
|---|---|---|---|
| **Ice Conditions** | How slippery the floe is — how far penguins slide for a given pull. Grippier is more controllable and more forgiving | Powder (grippy) / Slush / Black Ice (very slippery) | Slush |
| **Floe Size** | Physical size of the playing area. Smaller means penguins crammed together, faster and more brutal | Roomy / Standard / Cramped | Standard |
| **Fish to Win** | Floe-Off wins needed to take the game | 1 / 3 / 5 | 3 |
| **Aim Assist** | Draws a predicted trajectory line while you aim, showing your first bounce | On / Off | On |
| **Ice Breaker** | Seeds the floe with static ice chunks (**Bergs**) near the edge that absorb early hits before they shatter | Off / 1 hit / 3 hits | 3 hits |
| **Peck Off** *(2 players only)* | 1v1 with **two penguins each** instead of one | On / Off | Off (auto-offered at 2 players) |
| **✨ The Thaw** *(Sylly Mode, last)* | See §8 | Off / On | Off |

**Dynamic value line (required).** Ice Conditions and Floe Size both encode a concrete value their pill labels deliberately don't carry, so both need the live descriptor line beneath the pill row per the Settings Layout Standard — e.g. "Slush — a full pull carries you about half the floe" and "Standard — 6 berths, comfortable for 6".

### Ice Breaker — the early-game guardrail setting

Full mechanics in §3. As a setting it is three states, not a toggle: **Off** (no Bergs, the purest and most chaotic table), **1 hit** (a single early save per guarded stretch of rim — enough to survive one bad first Slide), and **3 hits** (the default — a proper early buffer that a table of Drowned players can still choose to break down early if they want the game to accelerate). Composable with everything else in the table, including The Thaw and Peck Off.

**Why default to On (3 hits) rather than Off.** The brief already worries, twice over (§10, §19), that Cold Shoulder's whole personality has to live in chrome and animation because it has no content layer — losing on Slide 1 to a coin-flip, with nothing to point to as "why", is the worst possible first impression for a game that needs every other advantage it can get. Ice Breaker costs nothing to a table that ignores it (it just makes the first couple of Slides a bit more forgiving) and gives a real answer to a bad-luck new player asking "what just happened?"

### Peck Off — the 1v1 mode

**Two penguins each, both yours to aim every Slide.** This is the closest the game gets to real Globulos, where controlling several units is the source of the strategy: you can bank off your own penguin, use one as a blocker while the other attacks, or spend one to save the other. A duel with one penguin each is a bare exchange; a duel with two is a game.

- **Both penguins commit together.** One Lock It In sends both aims. A penguin may be given a zero-power "hold" so you can act with one and park the other.
- **A Drowned penguin of yours still plays** — it Dives and Snowballs from the rim while your other penguin is still on the ice. You are out only when both are down.
- **Availability: 2 players only — settled.** A "double squad" variant at 3–4 would work mechanically, but it multiplies bodies on the floe for no clear gain, and the mode exists specifically to make a *duel* worth playing. The card is hidden above 2 players rather than shown disabled.
- **Name:** **Peck Off** — cheeky, literally what birds do, and it sits beside FRT's **Pear-Off** in the settings-card tradition without borrowing its structure. (Decision 14 in §19 records the two rejected alternatives and why.)
- **Composability:** Peck Off and The Thaw compose fine and are **not** mutually exclusive. Noting this explicitly because FRT's Pear-Off *is* exclusive with its Sylly Mode, and the naming parallel invites the assumption.

**Are there any other settings that should be locked or hidden?**
- **Floe Size stays a free host choice**, but the option *pre-selected* scales with the lobby's player count (Roomy at 3–4, Standard at 5–6, Cramped at 7–8). A sensible pre-selection achieves what auto-scaling would without taking the choice away or creating a hidden setting the host cannot find.
- **Aim Assist is a plain setting and defaults On.** The fun is the blind *social* read, not mastering a power meter; hiding the trajectory makes the first ten minutes frustrating rather than tense. Turning it off is the "we're all good at this now" option.

---

## 8. Sylly Mode (if applicable)

| Field | Your answer |
|-------|-------------|
| **Thematic name** | **The Thaw** |
| **In one sentence — what changes?** | The floe is melting — it shrinks a little after every Slide, steadily shoving the survivors together until the ice runs out from under someone |
| **Does it add new screens or phases?** | No. Same loop, contracting geometry |
| **Does it change scoring?** | No — still last player Standing catches the Fish |
| **Does it change the win condition?** | No — same Fish target |

**Mechanically:** the number of Berths never changes (it stays equal to the player count); each Berth's *range* narrows as the circumference shrinks. Drowned penguins ride the rim inward, keeping their Berth. A **minimum floe radius — half the distance a full-power Slide travels** — stops the shrink before the rim packs solid or aim stops mattering. §4 has the full specification and explains why the floor is defined relative to slide distance rather than as a fixed number.

**Status — deliberately provisional.** The Thaw ships as v1's Sylly Mode because it is good and it is ready, but the intent is to **demote it to a normal on/off setting later** and find Cold Shoulder something more genuinely surprising for its Sylly slot. The Thaw is an intensity dial, and the suite's best Sylly Modes (Force of Nature, Wild Words) change what the game *is* rather than how fast it runs. Recorded in §19 as intent, not an open question — nothing blocks on it.

*Alternative name in reserve: "Meltdown."*

---

## 9. Thematic Vocabulary (REQUIRED)

| Generic term | What Cold Shoulder calls it |
|---|---|
| One match, fought to a single survivor | **Floe-Off** |
| One simultaneous-commit resolution within a match | **Slide** |
| Score / points | **Fish** |
| A penguin still on the ice | **Standing** |
| A penguin knocked into the water | **Drowned** |
| Falling off the edge / the water itself | **The Drink** ("taking the plunge into the Drink") |
| An arc of the rim where Drowned penguins bob | **Berth** |
| A Drowned penguin's move one Berth left or right | **Dive** |
| A Drowned penguin's weak lob of brash ice | **Snowball** |
| A static ice chunk guarding the early edge | **Berg** |
| The setting that adds Bergs | **Ice Breaker** |
| The playing field | **The Floe** |
| Everyone back on the ice for the next match | **Resurface** |
| Nobody survives the Slide — match voided | **Washout** |
| Game over screen | **The Final Floe** |
| Play again | **March On!** |
| Quit | **Waddle Off?** |
| Settings overlay title | **The Huddle 🐧** |
| 1v1 mode, two penguins each | **Peck Off** |
| How to Play subtitle | "Shove your mates off the ice. Last one dry wins." |

*"Refreeze" from Revision 1 is retired — **Resurface** covers the return to the ice and **March On!** covers play-again.*

---

## 10. Word Bank & Content (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Does this game use the existing word bank (`words.json`)?** | No — there are no words or prompts |
| **If yes — which categories?** | N/A |
| **If no — what kind of content does it need?** | Almost none. Two small authored string arrays, both flavour-only: **Floe-Off intro lines** (4–6 rotating lines for the intro interstitial, per the Round Intro Screen Standard) and **plunge barks** (6–8 short lines shown as a penguin goes in — "Into the Drink!", "See you at the bottom.") |
| **Does it need a completely new data file?** | **No.** Both arrays live as constants in `js/games/cld.js` (`CLD_INTRO_FLAVOUR`, `CLD_PLUNGE_BARKS`), exactly as `SHP_NIGHT_FLAVOUR` does. A JSON file would be overhead for ~14 strings |
| **Any words or topics that should be excluded?** | N/A |

**Example entry:** N/A — no content entries. **This is the suite's first game with no content layer at all**, which means its entire personality has to live in chrome, copy and animation. Flagged in §19 as a real risk, not a saving.

---

## 11. Custom Visual Assets (if applicable)

| Field | Your answer |
|-------|-------------|
| **Is there a repeated visual primitive?** | **Yes — the penguin.** Everything else is terrain (floe, water) or programmatic (aim line, snowball, splash, **Bergs** — see §3, never illustrated, only a procedural crack overlay) |
| **How many distinct faces/types does it have?** | **Not 8 — one.** One penguin, **tinted** per player at draw time, in **6 states** |
| **Should it be skinnable with custom art later?** | **Yes.** All penguin drawing goes through one seam — `cldRenderPenguin(state, colourIdx, opts)` — from day one |
| **Default look for v1** | **Emoji + procedural.** A 🐧 emoji on a colour-tinted disc, on a procedurally-drawn floe. **No art is required to ship v1** |

### The headline: v1 needs no artwork at all

The canvas renders the emoji directly (`ctx.fillText('🐧', …)`) on a coloured disc, and **the disc is the collision circle** — so the default look is not a placeholder that lies about the physics, it is a genuinely readable representation of it. Floe, water, aim line, snowball and splash are all procedural, in the idiom [`asherplane.js`](js/arcade/asherplane.js) already uses.

**The art track therefore runs in parallel with the build and never blocks it** — the opposite of PKO, where art sat on the critical path and arrived at 26 MB.

### Camera: top-down (a decision, not a default)

**Top-down**, for three concrete reasons rather than taste:
1. The sprite's footprint **is** the collision circle, so players can always see why they bounced. In a 3/4 view the art and the physics body disagree and every collision looks slightly wrong.
2. Rotation is free — one sprite covers all 360° of facing, instead of needing directional frames.
3. The beak points where the penguin faces, so **facing doubles as free aim feedback** with no extra UI.

### Asset inventory — the full list to prepare

Masters square PNG unless noted, converted at build time per `tools/convert-core-art.ps1`.

| # | Asset | Count | Master size | v1 default (ships without art) | Notes |
|---|---|---|---|---|---|
| 1 | Penguin — **idle** (top-down, resting) | 1 | 256×256 | 🐧 on tinted disc | Drawn **greyscale/white** for runtime tinting |
| 2 | Penguin — **lean** (winding up / aiming) | 1 | 256×256 | idle + programmatic tilt | Shown during your own aim drag |
| 3 | Penguin — **squash** (impact frame) | 1 | 256×256 | programmatic scale-squash | One frame is enough; the physics carries the motion |
| 4 | Penguin — **plunge** (going in, flippers up) | 1 | 256×256 | idle + rotate + fade | The comedy frame — worth the most art attention |
| 5 | Penguin — **bob** (Drowned, at a Berth) | 1 | 256×256 | idle at half alpha, bobbing | Half-submerged; must read as "in the water, not on it" |
| 6 | Penguin — **throw** (lobbing a Snowball) | 1 | 256×256 | bob + procedural arc | Flipper cocked back. Renamed from "squirt" in Revision 2 |
| 7 | Floe surface texture | 1 | 512×512 tileable | procedural white polygon + noise cracks | Tiles under a clipped floe shape, so it works at any size — including mid-Thaw |
| 8 | Water / Drink texture | 1 | 512×512 tileable | procedural gradient + ripples | Animated by scrolling the tile, not by frames |
| 9 | Fish token | 1 | 128×128 | 🐟 emoji | Scoreboard + the Fish-caught moment |

**Nine files, ~360 KB** at the suite's 40 KB ceiling — comfortably inside the PWA precache budget and roughly half PKO's 682 KB.

**The Snowball itself needs no asset** — a small white circle with a short motion trail is both cheaper and more readable at the size it appears than any drawn sprite would be. The **Dive** likewise: a ripple ring plus the `bob` sprite fading out and back in reads perfectly and costs nothing.

### Why one tinted penguin instead of eight

Eight coloured penguins × 6 states = **48 sprites ≈ 1.9 MB precached**, which per the PWA Guardian rule is the mistake PKO already made once. Drawing the penguin greyscale and tinting per player at draw time (pre-tinted offscreen canvases generated once at match start) yields all eight colours from **6 files**. Player colour is reinforced by the disc/ring under each penguin, which stays programmatic and is the primary "which one is me" signal at a glance.

**In Peck Off, both of a player's penguins share their colour** and are distinguished by a small numeral or a light/dark variant of the ring — not by a second hue, which would read as two more players.

**Ids stay fixed across skins.** The six states are the ids (`idle`, `lean`, `squash`, `plunge`, `bob`, `throw`); a skin swaps art, never the state set.

### One technical note for the tech spec

`js/lib/art.js` resolves ids to **URLs for DOM elements**. A canvas game needs those URLs **preloaded into `Image` objects before the first frame** and drawn with `ctx.drawImage`. That is a genuinely new seam — small, but it does not exist yet, and it must fall back to emoji **per-asset** rather than all-or-nothing.

**Compact display:** penguins never overlap in a way that hides them — they are rigid circles that collide rather than stack. No minimum-visible-portion constraint applies.

**Extra time budgeted for art?** Not needed for v1. The art pack is a parallel track with no deadline; the game is fully playable and shippable before any of it exists.

---

## 12. Multiplayer Classification (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Own device or shared device?** | **Each player has their own device** (MDLM) for v1. A Pass-the-Phone variant is viable and designed below, but deferred |
| **Information that must stay private to one player/device?** | **Yes — every player's committed aim**, until all players have committed and the Slide resolves. Standing: direction + power. Drowned: Dive choice + Snowball target |
| **Moments where players act simultaneously?** | **Every Slide.** All players — Standing and Drowned — aim and commit at the same time, then all watch the same resolution. This is the entire game |
| **Moments where one device should be locked while another is active?** | No turn-locking. Devices are open for aiming together, then **each locks on its own commit and stays locked** until the Slide resolves |
| **When it's not a player's turn, what do they see?** | There is no "not your turn". Between committing and resolution a player sees the floe with a quiet commit tally ("4 of 6 locked in"). **A commit is final — there is no taking it back** (§14) |
| **Any roles/phases that don't work with multiple devices?** | None |
| **Do any settings or events temporarily hide information that's normally visible?** | No blackout events. The only hidden information is the committed aim, revealed to everyone simultaneously at resolution. Nothing stays permanently hidden — the resolution is fully visible to all, including the Drowned |

### The privacy call: aims use the private channel, not the public one

**A committed aim must be sent with `mpSendPrivate` to the host, not broadcast on `/events`.** A real decision, not a formality. Every device in a room can read the room's public event feed, so a client that writes its aim as a normal ACTION has published it to every rival before resolution. In a game whose *entire* tension is blind commit, a player who inspects Firebase wins every Slide, and nothing on screen would reveal it.

This is precisely the case `mpSendPrivate` was built for in Phase 36 (FLW's hand distribution) — true network privacy rather than the couch-security broadcast-and-render-own model NAT/FRT/BLD/SHP use. Cold Shoulder is a stronger case than FLW, because here the private data is the *only* thing being submitted.

Consequences: `mpStartPrivateListener()` must be active, and the host must **not** echo aims in any SYNC — the resolved timeline is the reveal, and it carries motion, not intentions.

### Pass-the-Phone — viable, designed, deferred

Revision 1 called PTP structurally impossible. That was wrong: the game is turn-based at the commit level, so a shared device works with two kinds of gate.

- **A per-player gate before each commit** — the standard Pass-the-Phone Safety Gate ("Pass to Mia. Ready?"), then Mia aims and commits, then the screen blanks and gates to the next player. Each player's aim is hidden from the next by the gate, exactly as the private channel hides it over the network.
- **A final reveal gate** before resolution — "Everyone's locked in. Watch the Slide." — so the table gathers to watch together rather than the last committer seeing it alone.

**Deferred past v1, and worth being honest about why:** N gates per Slide is a lot of tapping, and a Floe-Off is several Slides. At **2–3 players it is genuinely fine** and would make Peck Off playable on one device, which is attractive. At 6+ it would be tedious. If it ships it should be **offered only below a player-count threshold**, not listed as a peer of MDLM. Adding it later means `supportedModes: ['mdlm', 'ptp']` plus the two gate screens — no change to the resolution model, which is why deferring it costs nothing.

### Resolution model — settled at architecture review

**Host-authoritative timeline playback.** The host runs the one true simulation and broadcasts sampled keyframes plus a discrete event list; clients **replay**, they never simulate. This makes desync structurally impossible rather than merely unlikely.

This is [NT's shipped pattern](js/games/nt.js#L169) (`ntPlaybackData = { timeline, latencyMs }`), reused rather than invented. The rejected alternative was lockstep determinism (each client re-simulating from shared inputs), which relies on cross-device floating-point agreement — when that fails, players see *different outcomes* with no way to detect it, the worst possible failure for a game whose payoff is everyone reacting to the same chaos. Full reasoning in §19.

The event list matters as much as the keyframes: collisions, plunges, rebounds, Dives and Snowball landings are carried as discrete timestamped events so every device fires the right sound on the right frame rather than inferring impacts from position deltas.

---

## 13. Screens — Plain English List (REQUIRED)

1. **Game menu** — the standard four buttons (Play CTA "Hit the Ice" → How to Play → Settings → ← Back to the Box)
2. **Mode / lobby screens** — engine-owned, shared with the other MDLM games. Room code, join, roster
3. **The Huddle** — settings overlay (Ice Conditions, Floe Size, Fish to Win, Aim Assist, Ice Breaker, Peck Off, The Thaw)
4. **Floe-Off intro** — short auto-advancing interstitial at the start of each Floe-Off ("Floe-Off 2 — Resurface!") with a rotating flavour line, per the Round Intro Screen Standard
5. **The Floe** — the canvas screen, where the game lives. Holds **three phases on one screen**, never three separate screens: *aiming* (drag to commit), *waiting* (committed and locked, watching the tally), *resolving* (the Slide plays back — and, on a Washout, holds on a "WASHOUT!" beat for 1.5 s before advancing, §16). One screen keeps the canvas alive and avoids re-initialising it three times a Slide
6. **Floe-Off result** — who survived, who went in, the Fish awarded. Short
7. **Between-Floe-Offs scoreboard** — running Fish tally, then Resurface into the next Floe-Off
8. **The Final Floe** — game over: winner, final tally, March On! / Waddle Off

*(Deferred: two Pass-the-Phone gate screens, per §12.)*

**Layout note:** screen 5 is a canvas stage and joins the documented legacy `h-screen` whitelist in `ui-style.md`, alongside `screen-gth-canvas` and for the same stated reason — the stage must not scroll while the player is dragging on it. **Every other screen above is a normal Stack screen**, with no exception requested or needed.

---

## 14. Complex Interaction / UI Spec (if applicable)

Drag-to-aim is the game, and "describe the button" is nowhere near enough.

**Plain-text sketch of The Floe (aiming phase):**

```
┌──────────────────────────────────────────┐
│ Floe-Off 2 · Slide 3      [?] [🔊] [✕]  │  header — flex-shrink-0
├──────────────────────────────────────────┤
│                                          │
│        ~~~~~ the Drink ~~~~~             │
│      ~~  ╭────────────────╮  ~~          │
│    ~~   ╱                  ╲   ~~        │
│   (D)  │      ●Theo         │  ~~        │  (D) = a Drowned penguin at a Berth
│   ~~   │                    │  (D)       │  ●   = a Standing penguin
│   ~~   │   ◎YOU             │  ~~        │  ◎   = your penguin, ringed in your colour
│    ~~   ╲   ↖               ╱  ~~        │  ↖   = your drag-back vector
│      ~~  ╰────╲───────────╯  ~~          │  ╲   = Aim Assist predicted path
│        ~~~~~~~~╲~~~~~~~~~~~              │
│                                          │
├──────────────────────────────────────────┤
│  ▓▓▓▓▓▓▓░░░ ⟨tap to lock power⟩   POWER  │  interactive — see below
│  4 of 6 locked in                        │  tally — never says WHO
│  [        LOCK IT IN         ]           │  primary CTA, disabled until aimed
└──────────────────────────────────────────┘
```

**Every distinct way a player can perform the action:**

- **Drag back and release from your own penguin** — the primary method. Touch down on your penguin, drag *away from* the direction you want to travel (slingshot convention, matching pool and Angry Birds intuition), and the vector length sets power up to a maximum. Release to **arm**, not to commit.
- **Tap "Lock It In"** to commit. The arm-then-commit split is deliberate: a fat-fingered drag on a phone must never be an irreversible commit in a game where a bad Slide loses you the Floe-Off.
- **Re-drag freely before committing, never after.** A new drag replaces the armed aim as many times as you like — but **Lock It In is final**. Once committed you are locked until the Slide resolves, and the only thing left to do is watch the tally fill. This is what makes the arm-then-commit split load-bearing rather than a nicety: it is the *only* safety net between a fat-fingered drag and a lost Floe-Off, so the commit button must never be the thing your thumb lands on by accident.
- **Drowned penguins** use a different two-part control on the same screen: tap **left / right / stay** to choose a Dive, then tap a point on the floe to aim the Snowball. Same arm-then-commit, same finality. **They cannot pick their exact position** — the Dive chooses a Berth and the game assigns a spot inside it (§3).
- **Peck Off:** you arm each of your two penguins in turn; Lock It In commits both. A penguin left un-armed defaults to a zero-power hold rather than blocking the commit.

**The power control — drag *and* bar, and the bar is interactive:**

- **The drag itself is the primary power cue**, pool/snooker style: the further back you pull, the longer the drawn vector and the more the penguin visibly winds up (the `lean` state). This is the feedback that matters, and it is always live.
- **The bar mirrors it** — filling as you drag — which both uses the dead space under the canvas and gives a numeric-feeling read that a vector alone doesn't.
- **The bar can also be tapped to lock a power level.** With power locked, dragging sets **direction only** and the locked power is used, so you can repeat an exact strength across Slides or set a precise gentle nudge that is hard to hit by drag alone. Tapping the locked bar again releases it back to drag-controlled. The lock state is visually unmistakable (filled and outlined vs. live and soft) — a player must never be unsure which mode they are in.
- Power lock persists across Slides within a Floe-Off, and resets on Resurface.

**Real-time validation feedback:**
- Power below a minimum threshold reads **"Too soft"** under the bar and the CTA stays disabled, so an accidental tap can never register as a committed zero-power Slide. (In Peck Off, a *deliberate* hold is a separate explicit action, not a too-soft drag.)
- With **Aim Assist On**, a dotted predicted path draws live as you drag, terminating at the **first** bounce — a rival, a Drowned penguin, a Berg, or the edge. It deliberately does not predict beyond that, and it never predicts a Snowball's flight either: showing either would solve the game.
- With Aim Assist Off, only the drag vector and power bar show.
- A Dive toward a Berth with no free position shows the direction as unavailable rather than failing silently at resolution.

**Auxiliary controls:**
- **Re-drag** is the reset — no separate reset button. Available right up until Lock It In, and not after.
- **Lock It In** — disabled until a valid aim is armed; after commit it becomes a non-interactive "Locked in — waiting on 2", and the canvas stops accepting drags.
- **Power lock toggle** — the bar itself.
- The header carries the standard `[?]` + 🔊 + ✕ group.

**Overlay shapes needed:** none new. How to Play and The Huddle are the standard slide-up panel; quit and March On! confirmations are the standard centred decision modal.

**Do the controls need to stay frozen while the player works in a busy central area?** **Yes — flagged explicitly as the exception it is.** The power bar, tally and CTA must stay fixed beneath a canvas the player is dragging on. This is the recognised rare exception to the suite's single-scrolling-Stack layout, and it applies to exactly one screen.

---

## 15. Rule Reference / In-Game Cheat Sheet (if applicable)

The rules fit in a player's head after one read — there is no relationship table to consult mid-game. But a handful of things are genuinely non-obvious the first time they bite.

| Field | Your answer |
|-------|-------------|
| **What reference material do players need mid-game?** | Short explanations, not a chart: **what a Drowned penguin does to you** (the energetic rebound — players *will* be surprised the first time they get launched off one); **what a Snowball can and can't do**, including that it isn't instant and two throws at the same target are a race, not a stack, so the second one can simply miss; **that a Dive picks a Berth, not a spot**; and, when Ice Breaker is on, **that a Berg only saves you a set number of times before it's gone for good** |
| **How do they access it?** | The standard header `[?]` on The Floe, which opens How to Play. No second surface |
| **Does opening it interrupt the game?** | Non-blocking overlay, but openable **only during the aiming phase**, never mid-resolution — a slide-up panel over a playing Slide would hide the one thing the player needs to watch. `[Flagged for the tech spec.]` |
| **Is it static or dynamic?** | Static copy. Nothing renders from data |
| **Does it need a per-skin version?** | No |

**No How-to gallery tab.** The gallery-tab standard exists for games with a deck or roster to browse. Cold Shoulder has one visual primitive in six *states*, which is not a reference set — a tab of six penguin poses would be a poster, not a reference. Steps → Winning and Scoring → ✨ Sylly Mode, and nothing else. **Tap-hold on a penguin is therefore deliberately left idle**, per the documented exception in the Tap-Hold Reference standard.

---

## 16. Sound Design (if applicable)

**One new synthesised function is approved — `playSplash`.** Everything else maps to the existing catalogue via a single `CLD_SOUND` map in `js/games/cld.js`, per the pattern PKO and CJAR established.

| Moment | Sound direction | Mapped to |
|---|---|---|
| Slide committed ("Lock It In") | Firm, satisfying commitment — the point of no return | `playLaunch` |
| Power lock toggled | Tiny mechanical click — a dial seating | `playPillClick` |
| Penguin-on-penguin collision | Cartoon impact. **Velocity-gated and throttled** — a ten-collision Slide must not fire ten overlapping sounds | `playBoing` |
| Rebound off a Drowned penguin | Harder, angrier than a normal collision — a shove, not a bump | `playBoing` at raised gain |
| Snowball lands | Soft dry whump — small and slightly pathetic, exactly the weak nudge it is | `playWhoosh` |
| Dive (submerge and surface) | Two short liquid blips bracketing the move | `playSonarPing`, quiet |
| **Penguin plunges into the Drink** | **The signature moment — a new sound.** A heavy wet swallow: a short bright water-slap transient on top of a low sub thump, decaying into a brief bubble tail. Comic weight, not horror — the sound the whole table waits for | **`playSplash` (NEW)** |
| Floe-Off won — Fish caught | Bright, cheerful, small — a treat, not a trophy | `playSuccess` |
| The Thaw cracks (floe shrinks) | Deep, ominous ice groan under the whole floe | `playAbyssThud` |
| **Washout** (nobody left) | **A dedicated beat, not a quick cut.** The descending `playBoing` plays, a full-canvas "WASHOUT!" bark flashes over the frozen final frame, and the game **holds for 1.5 s** before Resurfacing. The joke needs a beat to land — cutting straight to the next Floe-Off steps on its own punchline | `playBoing` descending |
| Game won — The Final Floe | The full celebration | `playClashWin` |

**`playSplash` is the one exception to the reuse rule, and it earns it:** the plunge is the game's entire payoff, it fires many times a match, and `playHullThud` — a hull impact — reads as *structural*, not *wet*. Two games running on pure reuse maps set a good precedent; this is the moment worth spending on. Build it as a water-slap transient (short filtered noise burst) over a sub sine thump, with a short bubbling tail.

**Throttling is a real requirement, not polish.** A Slide with six penguins can produce a dozen collisions in two seconds. Without a per-frame cap and a minimum-velocity gate, the resolution is noise. Specify the cap in the tech spec.

### Music generation prompt — `data/music/cld.mp3`

A track resolves per game via `Music.playFor('cld')`, so this is Cold Shoulder's own theme. Target: **60–120 s seamless loop, ~128 kbps, ≤1.5 MB.** Drop the file in and add one manifest line — no code change, no SW bump.

> **Prompt:** Playful instrumental loop for a cute Antarctic party game. Bouncy mid-tempo waddle
> around 104 BPM in a bright major key. Lead on pizzicato strings and marimba trading a simple
> mischievous four-bar motif, with warm low bassoon or tuba on the downbeats for a comic waddling
> gait. Sparkling glockenspiel and soft icy bell tones shimmering underneath for cold air. Light
> hand percussion — shakers, woodblock, soft kick — never a full drum kit. Cosy and comedic, like a
> nature documentary that knows it is being silly. **No vocals. No lyrics.** Seamless loop with no
> fade in or out, no big finish, no dramatic build — it must sit under gameplay indefinitely
> without demanding attention. Clean mix, light reverb, nothing muddy in the low end.

**Two things to avoid when generating**, both learned from how the track is used: anything with a **clear resolving cadence** will telegraph the loop point every 90 seconds, and anything with **rising tension** will fight the game's own pacing, which peaks unpredictably. Aim for pleasant circularity, not a journey.

---

## 17. End Screen Content Mockup (if applicable)

```
                    🐧

              THE FINAL FLOE

           Mia is the last one dry.

    ┌────────────────────────────────────┐
    │  🥇  Mia          🐟🐟🐟    3      │
    │  🥈  Theo         🐟🐟      2      │
    │  🥉  Priya        🐟        1      │
    │      Sam                     0      │
    └────────────────────────────────────┘

         Longest stand:  Theo — 6 Slides
         Most plunges:   Sam — 4 trips in

    [         March On!          ]
    [         Waddle Off         ]
```

**Notes:**
- **Fish are shown as icons up to 5, then as a numeral** — a row of eight 🐟 wrecks the column alignment, and 5 is the highest Fish-to-Win setting anyway.
- Medal slots follow the Gameover Podium Rank Icons standard: 🥇🥈🥉 in a **fixed-width leading slot present on every row**, blank past 3rd. A row with no medal still reserves the width, or the podium reads as misaligned.
- **The two stat lines are the flavour payoff** and cost almost nothing — both are trivially derivable from the Floe-Off history, and "most plunges" is the funnier because it is a booby prize.
- **Conditional display:** the stat lines are **hidden at Fish to Win = 1**, where a single Floe-Off makes them meaningless. The podium itself always shows.
- Both CTAs use the Decision Modal button sizing standard and match each other in size and weight per the type-scale rule; March On! takes the brand fill, Waddle Off is neutral stone.

---

## 18. How to Play — Teaching Points (if applicable)

Ordered — the last item becomes the Sylly Mode card:

1. **You are one penguin on a crowded floe. Everyone gets shoved off eventually; be the last one who isn't.**
2. **Drag back from your penguin to aim — like a slingshot.** Further back is harder. Release to arm, then Lock It In to commit. Drag as many times as you like before that — but once you lock in, that's your Slide.
3. **Everyone aims at the same time, and nobody sees anyone else's plan** until every player has locked in. *Easy to miss:* you are not reacting to a rival's move — you are guessing it.
4. **All penguins slide at once.** You will hit people you didn't aim at. That is the game working correctly, not a bug.
5. **Slide off the edge and you're in the Drink** — Drowned for the rest of this Floe-Off.
6. **Being Drowned doesn't bench you.** You bob at a Berth on the rim and do two things every Slide: you are a **bumper** that flings anyone who hits you back onto the ice, and you get a **Snowball** to nudge someone's aim off — stronger the closer you are, which is why you can **Dive** one Berth left or right to chase the action. *Easy to miss, and the most important line in the whole overlay:* a Drowned penguin **does not save** the person who hits them — it shoves them back **harder**, which is usually worse. *Also easy to miss:* a Dive picks a **Berth**, not a spot — where exactly you surface is up to the sea.
7. **Winning and Scoring** — last player with a penguin Standing catches a Fish. First to the Fish target wins. If nobody survives a Slide it's a **Washout**: no Fish, Resurface, run it again.
8. **✨ Sylly Mode — The Thaw.** The floe melts a little every Slide, shrinking until there's nowhere left to stand. The Drowned close in with the rim.

*(Peck Off gets a short extra card only when the mode is on: "You've got two penguins. Aim both, commit both. You're only out when both are in the Drink — and a Drowned penguin of yours still throws Snowballs while the other one skates.")*

*(Ice Breaker gets a short extra card only when it's on: "The floe starts guarded — chunks of ice near the edge will bounce you back instead of dumping you in, until they've taken enough hits and shatter. Handy early. Don't count on it forever.")*

---

## 19. Open Questions & Design Notes (REQUIRED)

### Decisions Log

| # | Decision | Why |
|---|---|---|
| **1** | **Shared physics module, but v1 ships this game and The Thaw only** | The simulation is written game-agnostic so other modes *can* ride on it, but nothing else is built or promised. Goal/football may later arrive as its own mode **or be reworked as a Sylly Mode** — deliberately left open |
| **2** | **Nobody spectates.** The Drowned stay active every Slide as rim bumpers with Snowballs | No other game in the box benches a player mid-round, and every recent design lesson pushed the other way |
| **3** | **Drowned bumpers are energetic (restitution > 1), not cushioning** | A cushioning rim makes the floe *safer* as players drown, so Floe-Offs drag exactly when they should resolve. An energetic rim inverts that and is better theme |
| **4** | **Host-authoritative timeline playback, not lockstep** | Clients replay, never simulate, so desync is structurally impossible. Reuses NT's shipped pattern |
| **5** | **Drowned position is assigned, not chosen** — random within a Berth, steered only by a left/right Dive | A chosen position turns the rim into an optimisation puzzle played by people already out. Random keeps them dangerous without letting them snipe, and the Dive gives a real decision without precision |
| **6** | **Snowball force scales with distance** — 2/5 of a Slide at close range decaying to 1/5 at max | Physically sensible, and it is what makes the Dive worth doing |
| **7** | **"Snowball", not "Squirt" or "Throw Fish"** | Squirting felt mechanically disconnected. A thrown fish would collide with **Fish** as the scoring currency and force a rename cascade. A snowball scooped from brash ice is diegetic, funny, and leaves the scoreboard alone |
| **8** | **Lunge → Slide, Refreeze → Resurface / March On!** | Penguins toboggan on their bellies; "Slide" is the verb the game is actually about |
| **9** | **A commit is final — no re-opening an aim once locked** | Reversed from Revision 2 on owner review. Locking in *means* locking in, and the finality is what gives the commit its weight; a take-back-able commit is just a draft. It also removes a genuinely nasty packet problem (a re-opened aim would have to invalidate the earlier private submission and let the readiness check run backwards from committed to uncommitted). The cost is that a player who commits early has only the tally to watch — acceptable at seconds-scale, and the arm-then-commit split absorbs the misfire risk |
| **10** | **`playSplash` approved as the game's one bespoke sound** | The plunge is the entire payoff and fires many times a match; `playHullThud` reads structural, not wet |
| **11** | **Peck Off — a 1v1 mode with two penguins each** | A one-penguin duel is a bare exchange. Two units each is where Globulos' actual strategy lives: bank off your own ally, block with one and attack with the other |
| **12** | **Pass-the-Phone is viable and designed, but deferred** | Revision 1 wrongly called it impossible. It works with a per-player gate plus a final reveal gate, and it is genuinely good at 2–3 players. Deferred because N gates per Slide is tedious at 6+ |
| **13** | **Glacier Blue `#8ECAE6` with white ink on every surface** | Owner confirmed the ~1.79:1 measurement as visually acceptable. Simplest of the three options: no `ctaTextClass` override, no two-ink rule. §1 records the one build-time consequence (flat brand surfaces want a text-shadow the gel buttons already supply) |
| **14** | **The mode is called "Peck Off"** | Owner offered Beak Off or Peck Off. **Beak Off** lands phonetically on "beat off", which is a worse accident than the "Flip Off" reading it was replacing. **Peck Off** reads as a minced *feck off*, is literally what birds do, and is the right amount of cheek for a settings card |
| **15** | **Peck Off is 2-player only** | Closes the "double squad at 3–4" question. It would work, but it multiplies bodies on the floe for no clear gain, and the mode exists specifically to make a *duel* worth playing |
| **16** | **Minimum floe radius = half the distance a full-power Slide travels** | Owner's figure, and a sound invariant because it is relative to the game's own scale rather than absolute — a full-power Slide always crosses roughly the whole floe at minimum size, at every Ice Conditions setting |
| **17** | **7–8 players stays in scope as its own chaotic flavour** | Not the recommended range (4–6) and the brief says so, but eight people in a room is a legitimate way to play a party game. The consequence to respect: **do not tune 8 players to feel like 6** — no widened floe quietly restoring precision, no dampened collisions |
| **18** | **Ice Breaker — a settings-gated early-game guardrail (Bergs), default On at 3 hits** | Owner call, added to answer the "coin-flip first Slide" risk directly rather than hoping The Thaw's escalation curve covers it. Deliberately the mechanical opposite of a Drowned bumper (cushioning vs energetic), which reinforces rather than muddies the safe-early/dangerous-late arc |
| **19** | **Snowballs resolve sequentially by actual travel time, never summed** | Owner correction, and a genuine physics fix rather than a tuning tweak. Two throws aimed at one target are a race, not addition — the first to land can move the target clear of the second, which then simply misses. Replaces the earlier aggregate-cap model outright; there is nothing left to cap because impacts are never combined |
| **20** | **A Standing penguin plunging into a full Berth shunts to the fuller-space neighbour, tie-broken by exit direction — and the search expands outward if both neighbours are also full** | Owner-identified gap, twice over. First pass: a Dive into a full Berth is allowed to fail (it's voluntary), but a plunge has nowhere else to go and must always resolve to *something*. Second pass, owner-caught: a single-hop shunt breaks exactly at a crowded 7–8 player table under The Thaw, where a Berth and both its neighbours can all be full at once. Fixed by letting the search step outward, proven to always terminate by the *existing* minimum-floe-radius invariant (§4) rather than a new rule — that invariant already guarantees the rim can never be full everywhere simultaneously |
| **21** | **Washout gets a dedicated 1.5 s beat — descending sound, a "WASHOUT!" flash, then Resurface** | Owner call. A comic non-event needs a moment to read as a joke rather than a glitch; cutting straight to the next Floe-Off would step on its own punchline |

### Recorded intent (not blocking)

- **The Thaw should eventually become a normal setting**, with a more surprising Sylly Mode replacing it. The Thaw is an intensity dial; the suite's best Sylly Modes change what the game *is*. Ships as-is for v1.

### Rejected: the external-stack approach

An outside technical review recommended PixiJS for rendering, Matter.js/Planck.js for physics, and Supabase or Cloudflare Workers for networking. All rejected, recorded so it isn't re-proposed:

- **PixiJS and Matter.js violate the no-external-libraries and no-build-step rules**, and both solve problems already solved here. Rendering: [`asherplane.js`](js/arcade/asherplane.js) is 975 lines of working vanilla canvas with a fixed logical coordinate space, a DPR-aware backing store, letterboxed fit and pointer→logical conversion. Physics: circles on a plane with friction and elastic collision is ~150–250 lines; Matter.js is ~80 KB of general rigid-body machinery for a problem needing none of it.
- **Supabase / Cloudflare Workers** would be a second backend alongside Firebase RTDB with its own auth model, offline story and failure surface — replacing something that already works and is already precached.
- **Lockstep determinism** is the substantive disagreement: it relies on cross-device floating-point agreement, and when that breaks players see different outcomes silently.

Two instincts from the review are kept: push simulation to the client (the host *is* a client), and watch the asset footprint (§11 sets a 9-file, ~360 KB ceiling).

### Unresolved design questions

**No blockers remain. Two tuning items are open, and both are answered by the balance instrument rather than by a decision:**

- **[TUNING] Snowball numbers.** 2/5 → 1/5 by distance-scaled force is the shape and it is right; the travel-speed constant (how fast a throw closes distance, which is what makes the race between two throws readable) and the impact radius are working guesses. Ship the shape, measure the numbers, adjust. The one thing that is *not* a tuning value is the per-throw invariant: a single Snowball, at any range, may never by itself move a *resting* penguin off the floe.
- **[TUNING] The minimum-floe-radius multiplier.** "Half a full-power Slide" (§4) is a sound invariant and the right shape; whether the multiplier is exactly 0.5 is for playtest.
- **[TUNING] Berg count and placement radius.** One per Berth, sitting inboard of the true edge, is the working default (§3); exact count and radius are for playtest.

*Closed on owner review, 2 Sep 2026:* the brand contrast question (§1 — `#8ECAE6` with white everywhere), the mode's name (**Peck Off**), whether Peck Off extends past 2 players (**no**), whether a commit can be re-opened (**no**), and whether the game holds up at 7–8 players (**yes — accepted as its own chaotic flavour rather than treated as a defect; see below**).

**On 7–8 players specifically.** The recommended range stays 4–6 and the brief does not pretend otherwise. But a full 8-penguin floe is *deliberately* kept in scope as its own thing: with everyone committing blind into an eight-body scramble, individual aim skill genuinely matters less and the Slide becomes something closer to a firework. That is a legitimate way to play a party game with eight people in the room, and it is a bad reason to cap the player count. The design consequence to respect is that **nothing should be tuned to make 8 players play like 6** — no widened floe that quietly restores precision, no dampened collisions. Let it be loud.

### Things that might be complicated to implement (flag for Claude Code)

- **The simulation module is genuinely new infrastructure** — `js/lib/physics.js`, pure simulation, **no DOM and no canvas**. That boundary makes the physics fully testable under Node, so a harness can assert determinism across seeds, rest detection, no tunnelling at maximum power, the Snowball distance-force curve, Dive placement legality (no two penguins sharing a position), the multi-hop Berth shunt and its tie-break — including a seeded case that forces several hops, not just the trivial one-neighbour case — and Washout detection. **Build and verify it before any UI exists** — if the sim is wrong, nothing above it can be right.
- **Snowballs are scheduled events, not instant deltas — this is a real shape for the sim's event queue, not a detail.** Each throw needs its own arrival time (derived from distance) and must be resolved against the target's actual simulated position *at that timestamp*, in landing order, never batched at Slide-start. Get the ordering wrong and two throws that should race instead both connect, silently reintroducing the stacking behaviour that was explicitly rejected (§3).
- **Bergs need state that survives across Slides within a Floe-Off but resets on Resurface** — a hit-count per Berg, most naturally carried in the same host-side state that already tracks Berths and Drowned positions, and included in the round-start SYNC payload's reset values (§below) exactly like any other accumulator.
- **Keep the canvas harness inside `cld.js` for now.** Copy `apResize()`'s pattern rather than extracting a shared renderer. Hard boundary on the sim; YAGNI on the renderer.
- **The canvas art seam does not exist yet** (§11) — `art.js` returns URLs for DOM; canvas needs preloaded `Image` objects and per-asset emoji fallback.
- **Firebase erases every empty value.** The timeline's sample arrays, the event list and the per-player commit array are all at risk — a Slide with no collisions broadcasts an empty event list, which arrives as `undefined`. The `|| []` rebuild idiom is mandatory on every collection field, and every accumulator must be reset **in the round-start SYNC payload**, not just locally.
- **A loopback harness is not optional.** Every `'single'`-mode harness is blind to both the packet layer and all render code, which is exactly where a host-authoritative timeline game will break. Build `tools/verify-cld-loopback.js` with a real wire and mock DOM.
- **A commit is final, which the readiness check must actually enforce.** Because there is no re-open path, the host can treat a player's private aim as immutable once received — but it must also *reject* a second submission from the same player in the same Slide rather than overwriting silently, or a duplicate packet from a flaky connection becomes an accidental take-back.
- **Timeline payload size** — roughly 6–10 KB per Slide (8 bodies × 20 Hz × 5 s cap × quantised x/y). The 5-second cap is what keeps it bounded and must be enforced in the sim, with any still-moving bodies forced to rest.
- **RAF is a timer.** Cancel the playback loop in the quit-confirm handler, in `resetToLobby()`, and on any early phase transition, per the Timer Lifecycle rule.
- **A balance instrument, not just a harness.** Following `simulate-cjar-dd.js`, a `tools/simulate-cld-balance.js` running thousands of headless Floe-Offs and reporting Slides-per-Floe-Off, plunges-per-Slide, the leader-punishment rate, **Snowball race-miss rate** (how often a second throw whiffs because an earlier one moved the target — the number that validates the whole sequential-resolution model actually reads as intended rather than as Snowballs randomly failing) and **Slides-to-first-Berg-shatter** is what turns the tuning guesses above into numbers. Asserts nothing, always exits 0.

### Things explicitly OUT OF SCOPE for v1

- Other physics modes (goal/football, nearest-target) — the module is *designed* to allow them, not built with them. Football may return as a mode or as a Sylly Mode.
- Pass-the-Phone (designed in §12, deferred).
- Peck Off at 3+ players.
- Shove-bonus scoring (§6 rejects it on the merits, not just scope).
- Cosmetics beyond player colour — hats, name tags.
- Illustrated art (§11 — a parallel track, never a blocker).

### General notes

- **Tonally this is the most "video game" thing in the suite** — skill and physics rather than words and conversation. A deliberate range expansion, flagged so it stays a chosen direction rather than a surprise.
- **The real risk is personality, not physics.** This is the box's first game with no content layer (§10). Every other game carries its voice in text a player reads. Cold Shoulder has to carry it entirely in chrome, copy and animation: the plunge barks, the intro flavour, the Huddle's subtitle, the music, and the comedy of the plunge frame. Under-invest there and it will be a competent physics toy in a box full of characterful games.

---

## 20. Mood & References (if applicable)

| Field | Your answer |
|-------|-------------|
| **Most similar to** | Globulos / Mucho Party (Sumo mode specifically); shuffleboard; pool; King-of-the-Hill; the knock-each-other-off energy of a *Fall Guys* final |
| **Tone** | Chaotic, slapstick, gleeful, cosy-cold; a good splash of schadenfreude |
| **Should NOT feel like** | A precise physics *simulator* or a serious sports game. Slapstick chaos, not a trick-shot puzzler — readability and laughs over fidelity. The Aim Assist default (On) is this principle expressed as a setting |
| **Example phrases / copy** | "Into the Drink!" · "Last penguin Standing." · "Brace for the Slide…" · "The floe is thawing…" · "You caught a Fish! 🐟" · "Shove your mates off the ice. Last one dry wins." |

---

## 21. Sample Round (REQUIRED)

### Round A — standard play, showing the Drowned mechanic

**Setup:** 4 players — Mia, Theo, Priya, Sam. Ice Conditions: Slush. Floe Size: Standard. Fish to Win: 3. Aim Assist: On. Ice Breaker: Off. The Thaw: Off. **4 Berths** on the rim. **Floe-Off #1.**

**Slide 1** — all four Standing, all commit blind:
- **Mia** drags toward Theo at medium power, trying to barge him toward the near edge.
- **Theo** taps a soft nudge toward the centre, playing safe.
- **Priya** aims hard at Sam, who is sitting near an edge.
- **Sam**, feeling exposed, aims for the centre to escape.

**Resolve:** everyone slides at once. Theo has already drifted centre, so Mia's barge whiffs and she coasts to a stop mid-floe. Priya's hard charge catches Sam *as* he is sliding centre; the combined momentum skews him sideways, he clips the edge and **takes the plunge** (`playSplash`). He surfaces at a random spot inside the Berth he went out through. Priya, having charged full power, overshoots toward the far edge and teeters but holds.

**After Slide 1:** Standing — Mia, Theo, Priya. **Drowned — Sam**, bobbing in Berth 3, which happens to be near where Priya is teetering.

**Slide 2** — three Standing, one Drowned, **all four commit**:
- **Sam (Drowned)** is already close to Priya, so he chooses **stay** rather than Dive, and lobs his **Snowball** at her. Close range means near-maximum force — about 2/5 of a Slide.
- Priya is precarious, so both **Mia** and **Theo** aim at her. **Priya** flings hard toward the centre to save herself.

**Resolve:** Sam's Snowball lands first, nudging Priya a few degrees off her escape line — not enough to move her from rest, but enough to spoil the angle. Her centre-dash *almost* works; Theo's hit clips her tail and spins her toward the far edge. She hits **Sam** and is **flung back hard** across the floe — she survives, but arrives at speed on the near side, out of control. Mia and Theo bump gently and both hold.

*This is the mechanic doing its job: Sam did not eliminate Priya, and did not save her either. He changed the shape of the Slide and made everything messier — from the water, with no stake in the outcome. His decision to* stay *rather than Dive is what made the Snowball bite.*

**Slide 3:**
- **Sam** now Dives **one Berth left**, chasing Priya's new position on the near side. He submerges and surfaces somewhere in Berth 2 — he does not get to pick where, and ends up slightly further from her than he'd hoped, so his Snowball this Slide is weaker.
- **Mia** and **Theo** both aim full power at Priya. **Priya** tries to slip sideways.

**Resolve:** two full-power hits and a mid-strength Snowball on a penguin already off-balance. Priya goes into the Drink and surfaces in Berth 1. **Drowned — Sam, Priya.**

**Slide 4:**
- **Sam** and **Priya** both Dive toward the remaining action. Sam ends up close to where Theo is resting; Priya, from her Berth, is considerably farther. **Both throw Snowballs at the same spot — Theo.**
- **Mia** and **Theo** aim full power straight at each other, blind.

**Resolve:** everyone commits and the Slide plays out on one shared clock — this is the Snowball race, concretely. Sam's throw is close, so it is fast: it lands first, right as Theo and Mia are closing on each other, and nudges his line a few degrees off. Priya's throw was aimed at the same spot but thrown from much farther out — by the time it finally arrives, Theo isn't there anymore. **It lands on empty ice and does nothing.** Sam's nudge is what actually decides the Slide: Theo's skewed line hands Mia the better angle, and Theo glances off her, ricochets toward Priya's Berth, gets **flung back across the floe** at speed, and cannot stop before going off the *opposite* edge. Mia is the last one Standing.

*Two Snowballs, one target, and only the first one that landed mattered. Priya's throw was never "added" to Sam's — it simply arrived too late to hit anything.*

**Result:** Mia wins Floe-Off #1 and catches **1 Fish.** Tally — Mia 1, Theo 0, Priya 0, Sam 0. Everyone **Resurfaces** and Floe-Off #2 begins.

*(Washout illustration: had Mia and Theo knocked each other in on the same Slide, the floe would have ended empty. The descending `playBoing` plays, "WASHOUT!" flashes across the frozen frame, the game holds for 1.5 s — then no Fish, Resurface, replay the Floe-Off.)*

---

### Round B — the same table, with The Thaw on

**Setup:** same four players, **The Thaw: On.** Floe-Off #2. Still **4 Berths** — the count never changes; the arcs just get narrower.

**Slide 1:** all four commit; nobody goes in — a scrappy Slide with two glancing collisions. **Then the floe cracks and shrinks** (`playAbyssThud`), a ring of ice calving off the rim. Everyone is measurably closer together, and each of the 4 Berths is now a narrower arc.

**Slide 2:** the tighter floe means Mia's medium-power barge — which whiffed at full size — now connects. **Theo goes in.** The floe shrinks again. Theo bobs in a Berth that, because the rim has moved inward, sits much closer to the action than Sam's did in Round A. His Snowballs will hit harder for free.

**Slide 3:** three penguins on a disc perhaps half its original size, with Theo throwing from close range. **Priya** overcommits, rebounds off Theo, crosses the whole shrunken floe in one bounce and goes off the far side. Two Drowned now, and the floe shrinks again.

**Slide 4:** Mia and Sam are alone on a small disc, ringed by Theo and Priya bobbing right at the shrunken rim. Theo throws at Sam, Priya throws at Mia — two different targets, so there is no race this time, just two throws landing almost instantly at close to their full 2/5 force. On a floe this size, that is a real shove rather than a nuisance. Sam, already tight to the edge, clips it and goes in. **Mia wins Floe-Off #2.**

*The Thaw's job is visible: Round A took four Slides at full size; Round B took four but the floe did the work, and the last two were frantic rather than careful. No rule changed — only geometry. Note also that the shrink has quietly buffed the Drowned, because proximity is what powers a Snowball.*

---

### Round C — Slide 2 of Round A, from Sam's point of view alone

The information boundary, concretely.

Sam has just gone into the Drink. On **his** device he sees:

- The full floe and every Standing penguin's **current resting position** — Mia mid-floe, Theo centre, Priya teetering. Positions are public; everyone sees the board.
- His own penguin bobbing at the spot **he was assigned** in Berth 3, and the two Berths he could Dive to. He can see which Berths are occupied and how full they are, but not where inside one he would surface if he moved.
- A tally reading **"1 of 4 locked in"** once he commits. **It never names who.**

He does **not** see, and cannot obtain:

- Which way Mia, Theo or Priya are aiming, or with how much power — not on screen, and **not in Firebase either**, because their aims go on the private channel to the host rather than the public event feed (§12).
- Whether anyone else is targeting Priya. His read that they will is a *guess* from her exposed position — exactly the social read the game is made of.
- Any way to change his mind once he taps Lock It In. His commit is final, so the read has to be made before he taps, not after.

So Sam's decision is made on public geometry plus inference, never on private data. He chooses **stay** rather than Dive **because** he is already close to Priya and proximity is what makes a Snowball bite — betting that someone will send her his way. He is right, and it pays off. He could not have known, and that is what makes it a bet.

---

### Round D — Peck Off, one Slide

**Setup:** 2 players — Mia and Theo, **Peck Off: On.** Four penguins on the floe: Mia-1, Mia-2, Theo-1, Theo-2. 2 Berths.

Mid-Floe-Off, **Theo-2 is already Drowned**; Theo is down to one penguin on the ice but is very much still in it.

- **Mia** arms both: **Mia-1** hard at Theo-1, and **Mia-2** as a gentle angled tap intended to *bank off Mia-1* and catch Theo-1 on the rebound. One Lock It In commits both.
- **Theo** arms **Theo-1** at full power straight into Mia-1 — hoping to blow through the pincer before it closes — and uses **Theo-2** from the rim to throw a Snowball at Mia-2, the one he can't reach any other way.

**Resolve:** Theo's Snowball lands on Mia-2 first and pushes it a few degrees off its banking line. Mia-1 and Theo-1 meet nearly head-on and both ricochet wide. Mia-2, now mistimed, sails past where the rebound should have been and drifts to a stop near the rim — awkward but alive. Nobody goes in.

*Two things this round shows that a one-penguin duel cannot: Mia planning a two-body combination in a single blind commit, and Theo's Drowned penguin doing real work — its Snowball is precisely what broke the combination. This is why Peck Off exists rather than a stripped-down free-for-all at 2 players.*

---

### Round E — Ice Breaker and the multi-hop Berth shunt

Two mechanics added in review, both deliberately invisible when they're working correctly.

**Setup:** 8 players. Ice Breaker: 3 hits. **The Thaw: On**, well into the match — the floe is small and every Berth's arc has narrowed. **8 Berths.** Six players are already Drowned, and they have clustered: everyone's been diving toward the same stretch of rim to stay near the shrinking action, so **Berths 3, 4 and 5 are all full**, while the far side of the rim sits nearly empty.

**The guardrail, earlier in this same Floe-Off:** On Slide 1, back when the floe was full-size, Theo took a hard hit while still near a Berg guarding the rim. Rather than plunging, he **rebounded off it** — a soft, cushioned bounce, nothing like the shove he'd get from a Drowned penguin — and the Berg took its first hit, a crack spreading across it. It would take two more hits before that stretch of rim went properly open. (One of those two, a few Slides later, came from a Drowned player's Snowball — not aimed at a rival at all, thrown deliberately to clear the guardrail and speed the match along.)

**The shunt, now:** Much later, with the Berg long since shattered and the floe well into The Thaw, Theo takes a second hit and goes into the Drink through the stretch of rim behind **Berth 4** — dead centre of the crowded cluster. Berth 4 is full. The game checks its neighbours: **Berth 3 is also full, and so is Berth 5.** The search steps out one more Berth each way — **Berth 2, still crowded from the same clustering, and Berth 6, which has room.** Theo surfaces there, three Berths from where he went in. Nobody at the table sees any of this happen; the timeline just shows him bob up on the emptier side of the rim, which, if anyone thinks about it at all, makes obvious sense — that's where the space was.

*Neither moment interrupts the Slide or asks anyone to make a decision — that is exactly the point of both. The Berg protected the table while it was fresh and vulnerable; the multi-hop shunt kept a heavily clustered, late-Thaw rim resolving cleanly without ever needing a special case for "everywhere nearby is full." It didn't need one because it can't happen — §4's minimum-floe-radius rule already guarantees the rim as a whole always has room, even when a stretch of it locally doesn't.*
