# Pecking Order

**Game 17** · `activeGameId: pko` · plugin `js/games/pko.js`
**Emoji:** 🐘 · **Brand:** deep amber-brown `#854D0E` · **Players:** 3–6 · **Modes:** MDLM only
**Status:** gold master · verified against SW v209 on 23 August 2026

> **Change contract.** Each section is tagged **free** (reword freely — but it must stay true),
> **paired** (change the doc and the code together, or you open a gap between them), or **derived**
> (change the code first; editing the doc only changes whether it is correct). Full rule:
> `docs/superpowers/specs/2026-08-22-game-identity-docs-design.md` § 5.
>
> **Where the technical detail lives.** Screen and overlay IDs, state variables, key functions and
> MP packet tables are in `docs/code-map.md` — Grep the game's name or an element ID, never
> full-read it. This document deliberately does not duplicate them.

---

## T1 — The Pitch · *free*

Every card is a card everyone at the table already half-knows: a Bear beats a Leopard because a
Bear actually eats a Leopard, not because someone assigned it a bigger number. The game teaches
itself the moment you look at the board — you remember who eats whom, not a rank order. On top of
that sits a shedding race with real teeth: Stake one or more of the same animal, and whoever's turn
is next has to answer *every* card you put down or bow out. Miss one predator and you can Swarm
past it, or throw a Stampede that clears the whole board at once. It plays in the twenty-minute
range, needs nothing but phones and a room code, and it's the rare card game where "wait, does an
Eagle really have no predator?" turns into a genuine table argument mid-round.

---

## T2 — The Premise · *free*

You are holding a fistful of the animal kingdom, and the only way to get rid of it is to know it
cold. Someone opens with a card — a Mongoose, say — and now it's sitting on the board daring the
next player to name what actually eats a Mongoose. Get it right and the board is theirs to answer.
Get it wrong, or don't have the card, and you Retreat — not out, just out of this standoff, free to
jump back in the moment the board changes under someone else's play.

The whole game runs on one tension: **the safest card to hold is also the most useless one to
play.** An Eagle can't be beaten by anything except a Poacher or a matched Swarm — brilliant to sit
on, useless to lead with, because leading with it tells the table exactly what you're protecting.
Everyone is reading everyone else's Hoard by what they choose *not* to Stake, and the player who
empties their hand first — cleanly, before anyone saw it coming — is the one the table remembers.

What it produces is loud, opinionated disagreement about the food chain, the specific dread of a
Stampede building against a board you can't answer, and the satisfaction of an Eagle finally
meeting the one card in the deck that can touch it.

---

## T3 — How to Play · *free*

**Setup.** Every player is dealt a private **Hoard** from a shared **Pool** built fresh for the
Match. Nobody sees anyone else's Hoard; the table only sees how many cards each player is holding. A
Match runs across several **Clashes** (fresh deals), each running across several **Encounters**
(rounds within that deal).

**The loop.** An Encounter opens when a player **Stakes** — plays one or more cards of the same
species face up. Each card becomes a **Mark**, and it's now the next player's job to beat every Mark
on the board in a single all-or-nothing play:

- **Challenge** — play each Mark's natural predator, one card per Mark. Every Mark answered, or the
  Challenge doesn't go through at all.
- **Swarm** — no predator for a Mark? Play two cards of that Mark's *own* species instead. Each one
  becomes its own new Mark, so the board grows a card wider rather than being cleared.
- **Stampede** — when every Mark on the board is the same species, play one more copy of that
  species than there are Marks and the whole field is yours in one move.
- **Retreat** — sit this Encounter out. You're not eliminated — the instant the board changes again,
  every Retreat is forgiven and you're back in.

The Encounter ends the moment everyone but the player who last changed the board has Retreated. That
player is **Unchallenged**, wins the Encounter, and opens the next one.

**The wildcard.** A **Poacher** beats any single Mark outright — no chain relationship needed — but
it can't be Staked as an animal, can't Swarm, and can't pad a Stampede. Nothing beats a Poacher-Mark
except another Poacher.

**How a Clash ends.** The instant a player plays their very last card — by Stake, Challenge or
Stampede — that Clash is over immediately, for everyone, whatever else is happening on the board.

**How it ends.** Set by **Law of the Wild**, chosen before the Match starts:

- **Dominance** — a race. First to the target number of Clashes wins the Match outright.
- **Stragglers** — a fixed distance. Exactly the target number of Clashes are played, and every card
  still sitting in your Hoard when a Clash ends counts *against* you. Fewest cards left over the
  whole Match wins — the champion may not have won a single Clash.

Whoever comes out on top is crowned **Apex Predator**; last place is called out as **Bottom
Feeder** — both titles can be shared on a tie.

---

## T4 — Theme & Flavour · *free*

**The world.** Real ecology, played straight rather than cartoonish. Land and sea run as two mostly
separate chains that only cross at a couple of points — a Fish answers to a Mongoose as readily as
an Octopus does, and that surprise is deliberate. Nothing here is anthropomorphised; the drama comes
from the actual relationships, not from characters wearing them.

**The voice** sits closer to a nature documentary than a joke book — dry, matter-of-fact, occasionally
a little raw ("Extinction Event", "wiped out entirely", "Bottom Feeder"). It never dwells on the
predator/prey premise: a card is eaten, the game moves on. Force of Nature leans harder into that
register — "The Culling", "Extinction Event", "The Great Reversal" all read like genuine ecological
events, not jokes about them.

**Australian English throughout**, as everywhere in the suite — colour, not color; metric where
anything is measured at all.

**On theme:** the food chain itself, told accurately enough that a player can win an argument at the
table by being right about nature. Card art is naturalistic rather than stylised — the suite's first
core art pack, and the animals were always meant to look like animals, not mascots.

**Off theme:** cutesy anthropomorphism, slapstick violence, or softening the premise so far that
"who eats whom" stops meaning anything. A card being beaten is a fact about the ecosystem, not a gag.

---

## T5 — Terminology · *paired*

| Term | Meaning |
|------|---------|
| **Mark** | A card on the board that must be beaten to stay in the Encounter — always one card, never a stack. |
| **Stake** | The opening play of an Encounter — one or more cards of the same species, each its own Mark. |
| **Encounter** | One contested round within a Clash — ends when everyone but the board owner has Retreated. |
| **Challenge** | Answering every Mark on the board, one card (or a Swarm) per Mark, all-or-nothing. |
| **Swarm** | Answering a single Mark with two of that Mark's own species instead of its predator — each becomes its own Mark, board grows one wider. |
| **Stampede** | Answering a uniform board with one more copy than the board holds — clears the whole field, returns one Mark wider. |
| **Retreat** | Sitting out the current Encounter. Not elimination — a board change forgives every Retreat. |
| **Scavenge** | Optional setting — draw one card from the Reserve when you Retreat. |
| **Small Fry** | Optional setting — the Encounter opener must Stake their smallest-ranked animal. |
| **Clash** | One hand — plays out until a player empties their Hoard. |
| **Match** | The full session, run under either Dominance or Stragglers (see T3). |
| **Straggler** | A card still in your Hoard when a Clash ends, under Stragglers — one point against you. |
| **Hoard** | A player's private hand of dealt cards. |
| **Pool** | The full card set built at Match start, scaled by player count. |
| **Reserve** | Undealt cards remaining in the Pool after the deal. |
| **Watering Hole** | Where spent boards go — the discard pile, visible to everyone as a face-down count. |
| **The Trail** | The Match log — every Stake, Challenge, Swarm, Stampede, Retreat and Unchallenged, in order. |
| **Poacher** | The wildcard — beats any single Mark outright, cannot be Staked/Swarmed/Stampeded. Only another Poacher beats a Poacher-Mark. |
| **Appetite** | Setting controlling reach — Sated (direct prey only) or Ravenous (one tier further). |
| **Unchallenged** | An Encounter closing with no successful Challenge against the leader — they lead the next Encounter. |
| **The Conditions 🌿** | Settings overlay title. |
| **Answer the Marks** | Challenge builder overlay title. |
| **The Watering Hole 💧** | Discard/Trail overlay title. |
| **Abandon your territory?** | Quit overlay heading. |
| **The Hierarchy** | Gameover screen — final standings, Apex Predator to Bottom Feeder. Ties share the title. |
| **Enter the Wild** | Menu Play CTA / play-again confirm. |

### Force of Nature vocabulary (Sylly Mode)

| Term | Meaning |
|------|---------|
| **Force of Nature** | The Sylly Mode itself — a random event reshapes the rules before each Encounter. |
| **Invasive Mimicry** | The fixed opener, once per Clash — Mimics join the Reserve, everyone draws extra. |
| **The Culling** | Each player discards their own fewest-held species. |
| **Extinction Event** | The globally rarest species is wiped from every Hoard at once. |
| **Migration** | Every Hoard moves one seat to the left. |
| **The Great Reversal** | The chain runs backwards — prey becomes predator for the Encounter. |
| **The Deluge / The Dry Season** | Track locks — only the sea, or only the land, may hunt this Encounter. |
| **Alpha** | The crowned Mark — nothing played against it is discarded, so the board compounds. |
| **Carrion** | The timed window after a win where the Challenger may take back Marks they just beat. |
| **Spoils** | The Marks a Challenge actually beat — what Carrion offers back. |
| **Mimic** | The copycat card — copies whatever it's played with, never plays alone, never copies a Poacher. |

### Naming rules — constraints, not preferences · *suite-wide*

- **"The Trail", not "The Log" or "The Crumb Trail".** Cookie Jar owns *Crumb Trail* for its own
  flip-by-flip log — the two must never be confused in copy that touches both games.

---

## T6 — Settings · *mixed — labels paired, values derived*

The settings overlay is titled **The Conditions 🌿** — *"Set the terms of the territory."*

| Setting | Options | Default | What it does in play |
|---|---|---|---|
| **Law of the Wild** | Dominance / Stragglers, plus a length of 3 / 5 / 7 Clashes | Dominance, 3 | Dominance races to the target Clash count; Stragglers plays exactly that many and counts what's left in your Hoard against you. |
| **Hoard Size** | 10 / 12 / 15 | 12 | How many cards each player is dealt at the start of every Clash. Bigger Hoards mean longer Clashes. |
| **Appetite** | Sated / Ravenous | Sated | How far down the chain a predator reaches. Ravenous also reaches one tier further, so fewer Encounters go Unchallenged. |
| **Poacher Cards** | None / Three / One Each | One Each | How many Human wildcards go into the Pool. |
| **Scavenge on Retreat** | OFF / ON | OFF | Draw a card from the Reserve when you Retreat — more options, but one more card to shed. |
| **Small Fry** | Off / Match Start / Every Clash | Match Start | Whoever opens must Stake their smallest-ranked animal (quantity still their choice). |
| **✨ Sylly Mode** | ON / OFF | OFF | Force of Nature. See T8. |

**Law of the Wild is deliberately one card, not two.** The Clash-count pill means "Clashes to win"
under Dominance and "Clashes to play" under Stragglers — meaningless read apart from the mode, which
is why the live value line underneath (*"First to 3 Clashes takes the Match"*) always spells out
which reading is in force.

**No word-difficulty tier.** Pecking Order runs off a fixed 15-entry chain, not a `words.json` bank
— Hoard Size is the game's velocity dial instead.

---

## T7 — The Player's Journey · *mixed — 7a derived, 7b paired, 7c free*

### T7a — The flow

| # | Screen | Beat | Type | Duration | Chrome |
|---|--------|------|------|----------|--------|
| 1 | `screen-pko-menu` | Pick your poison | Menu | — | 🔊 |
| 2 | `screen-pko-clash-intro` | "Clash N Begins" — fresh Pool, fresh Hoards | Interstitial | 5 s | none |
| 3 | `screen-pko-hoard` | Private deal reveal, readyCheck | Interactive | — | `[?]` 🔊 ✕ |
| 4 | `screen-pko-table` | The board: Stake, Challenge, Swarm, Stampede, Retreat | Interactive | — | `[?]` 🔊 ✕ |
| 5 | `screen-pko-event` | Force of Nature event announcement (Sylly Mode only) | Interstitial | 5 s | none |
| 6 | `screen-pko-unchallenged` | Encounter over — the leader's name | Interstitial | 5 s | none |
| 7 | `screen-pko-clash-result` | Who took the Clash, and the running standings | Interactive | — | 🔊 ✕ |
| 8 | `screen-pko-hierarchy` | The Hierarchy — final standings + Clash history | Result | — | 🔊 ✕ |

There is **no setup screen and no pass-gate** — names come from the lobby roster, and every player
is on their own phone with a private Hoard, so there is nobody to hand a device to.

Every interstitial carries no chrome at all — auto-advancing and nothing to tap, the two conditions
of the interstitial exemption. 5 seconds is the ceiling this suite treats as safe, not a target.

**Overlays**

| Overlay | Opened from | What it is |
|---|---|---|
| `pko-settings-overlay` | Menu | The Conditions — the seven settings |
| `pko-challenge-overlay` | Table, when Challenging | Answer the Marks — the Challenge builder |
| `pko-how-to-overlay` | Menu, table `[?]`, hoard `[?]` | How to Play — three tabs: The Rules, Diagram, Animals |
| `pko-events-overlay` | Table header `[?]`, settings, how-to | Force of Nature — the full nine-event roster |
| `pko-trail-overlay` | Table's Watering Hole tap | The Watering Hole — Trail / Discards tabs |
| `pko-quit-overlay` | Hoard, table, clash-result ✕ | Mid-Clash quit confirm |
| `pko-stampede-overlay` | Table, when Stampeding | "Stampede?" confirm |
| `pko-carrion-overlay` | Table, after winning a Challenge in Force of Nature | Carrion — timed spoils window |
| `pko-new-match-overlay` | Hierarchy | Play-again confirm |

### T7b — The words on screen

#### The menu

```copy
# screen-pko-menu
Pecking Order
Know the food chain. Become the Apex.
Enter the Wild
How to Play
Settings
← Back to the Box
```

#### Clash intro

Heading is built at runtime as *"Clash N Begins"*. The flavour line is picked at random from a
four-line pool, host-picked and synced so every device shows the same line.

```copy
# screen-pko-clash-intro
Fresh Pool, fresh Hoards. Everyone starts even.
A new Clash means a new order of prey — read the board before you Stake.
Nobody remembers the last Clash here. Play what’s in front of you.
Fresh cards, same wild. Watch what the others Stake first.
Force of Nature is active — watch the board, not just your Hoard.
```

#### The deal (Hoard)

```copy
# screen-pko-hoard
Your Hoard
Only you can see these. Empty it first and the Clash is yours.
Dealt
I'm Ready
Waiting for the host to deal…
```

#### The table

```copy
# screen-pko-table — labels
Watering Hole
Active Marks
Your Hoard
[?] The Chain
The field is open.
```

```copy
# screen-pko-table — turn banner
Your lead — Small Fry: open with your smallest animal.
Your lead — Stake to open the Encounter.
Your move — answer every Mark, or Retreat.
The Deluge — only the sea may hunt
The Dry Season — only the land may hunt
```

```copy
# screen-pko-table — action buttons
Stake
Challenge
Stampede
Retreat
```

#### Force of Nature event interstitial

Name and blurb are per-event, drawn from `PKO_EVENTS` (see T8 for the full roster).

```copy
# screen-pko-event
Force of Nature
```

#### Unchallenged

```copy
# screen-pko-unchallenged
Unchallenged
Everyone else Retreated. They lead the next Encounter.
```

#### Clash result

```copy
# screen-pko-clash-result
Trail & Discards →
Waiting for the host to open the next Clash…
```

Body text is built at runtime — *"[Name] takes the Clash"* (or *"[Names] share the Clash"* on a
tie), *"They lead the next one."*, and under Stragglers an added line: *"Everyone else banks
whatever they were still holding."*

#### The Hierarchy (gameover)

```copy
# screen-pko-hierarchy
The Hierarchy 🐘
Enter the Wild
Leave the Wild
Clash History
```

Standings rows read *"[rank]. [Name]"*, with **— Apex Predator** appended to the top score and
**— Bottom Feeder** to the bottom, both only once a Clash has actually been played and the table
isn't all square.

#### Settings — The Conditions

```copy
# pko-settings-overlay — title
The Conditions 🌿
Set the terms of the territory.
```

```copy
# pko-settings-overlay — Law of the Wild
Law of the Wild
What it takes to end up on top, and how long the Match runs. Dominance is a race to win Clashes. Stragglers plays a set number instead and counts whatever you are still holding each time somebody empties — fewest at the end takes it.
Dominance
Stragglers
First to 3 Clashes takes the Match.
```

```copy
# pko-settings-overlay — Hoard Size and Appetite
Hoard Size
How many cards each player is dealt at the start of every Clash. Bigger Hoards mean longer Clashes.
Appetite
How far down the chain a predator will reach. Ravenous means a Leopard also takes Mice, not just Mongooses — fewer Encounters go Unchallenged, which suits smaller tables. Sated is the strict chain: you only ever eat your direct prey.
Sated
Ravenous
```

```copy
# pko-settings-overlay — Poacher Cards, Scavenge, Small Fry
Poacher Cards
How many Human wildcards go into the Pool. A Poacher wins any single Mark outright — and nothing else. One Each keeps pace with bigger tables.
None
Three
One Each
Scavenge on Retreat
Draw a card when you Retreat. More options for later — but this is a race to empty your Hoard, so it's one more card to shed.
Small Fry
The player who opens must Stake their smallest animal. How many is still their call. Bees, Eagles and Stingrays sit outside the size ladder, so they never count as your smallest.
Off
Match Start
Every Clash
```

```copy
# pko-settings-overlay — Sylly Mode
✨ Sylly Mode
Force of Nature
Before each Encounter, a random event reshapes the rules — the chain flips, a species is wiped out, or everyone swaps Hoards. Mimic cards join the deck. Not recommended for your first game.
Done
```

#### How to Play — The Rules

```copy
# pko-how-to-overlay — title and tabs
How to Play 🐘
Shed your whole hand by playing each animal's natural predator.
The Rules
Diagram
Animals
```

```copy
# pko-how-to-overlay — step headings and bodies
The food chain
Staking your claim
Open at the bottom
The Challenge
Swarm it instead
Stampede
Retreat and rejoin
Going Unchallenged
Answers to no one
Nothing eats an Eagle
Winning and Scoring
```

```copy
# pko-how-to-overlay — Answer the Marks builder subtitle
Answer the Marks
One card per Mark, or two of its own kind to Swarm it — all or nothing.
```

#### The Watering Hole

```copy
# pko-trail-overlay
The Watering Hole 💧
Where spent cards go — and everything that put them there.
Trail
Discards
Got it
```

#### Quit and confirms

```copy
# pko-quit-overlay
Abandon your territory?
This Clash ends here. Your Hoard, your Marks, and everything you've claimed go back to the wild.
Yeah, walk away.
Not yet!
```

```copy
# pko-stampede-overlay
Stampede?
The whole field goes to the Watering Hole and the board comes back one Mark wider.
Charge!
Hold back
```

```copy
# pko-carrion-overlay
Carrion — take the spoils?
Tap what you want back. Whatever you've picked when the clock runs out is yours; the rest goes to the Watering Hole.
Leave it all
```

```copy
# pko-new-match-overlay
New Match?
Scores reset and the Pool is rebuilt from scratch. Same players, same conditions.
Enter the Wild
Stay here
```

### T7c — Where the journey is thin

**◇ judgement, not spec.**

**Clash Result is doing the least work of the eight screens.** It restates a standings table the
Hoard-count strip already implied and adds one sentence about who leads next — the natural next
candidate for a per-Clash flavour line the way the Clash Intro has one.

**The Culling's blurb describes the wrong event.** `PKO_EVENTS`'s interstitial text for The Culling
reads *"The season takes the rarest species from every Hoard"* — that is Extinction Event's job (one
globally-rarest species, wiped everywhere at once). The Culling actually makes each player discard
their own individually fewest-held species, a per-player rather than a global effect. That
5-second interstitial is the only place a player sees this text before the Hoard visibly changes, so
a first-time Sylly player is briefly told the wrong rule for what just happened to their hand.

**Force of Nature has real texture and the base game has almost none.** Nine named events each get
their own emoji, blurb and detail card; the base game's only comparable colour is the Clash Intro's
four rotating lines. A player who never turns Sylly Mode on gets a flatter game than the one the
settings overlay describes it as a step up from.

---

## T8 — Sylly Mode · *free*

**Force of Nature.** Before every Encounter but the first of a Clash, a random event reshapes the
rules for that Encounter alone. The first Encounter of every Clash always opens with the same fixed
event, **Invasive Mimicry** — Mimic cards join the Reserve and everyone is dealt a handful of extra
cards, so the Clash starts larger and stranger than usual.

**The eight drawn events**, any one of which can open a later Encounter: **The Culling** (each
player discards their own fewest-held species — structurally cannot empty a Hoard); **Extinction
Event** (the single rarest species across *every* Hoard is wiped out at once — the only event that
can empty a Hoard, and it can empty several); **Migration** (every Hoard passes one seat left,
nothing discarded); **The Great Reversal** (the chain runs backwards for the Encounter — the Eagle
becomes beatable, the Elephant becomes weakest, genuine intended chaos); **The Deluge / The Dry
Season** (only sea, or only land, may be played — a Poacher hunts in any weather, and an event
nobody could act under is simply never drawn); **Alpha** (one Mark on the opening Stake wears the
crown and is never discarded, so the board grows instead of shrinking); **Carrion** (win a Challenge
and get a short window to take some of the beaten Marks back instead of losing them to the Watering
Hole).

**The Mimic.** A copycat card that joins the deck once Invasive Mimicry has fired. It copies
whatever real card it's played alongside, so it can never be played alone, and it can never copy a
Poacher. The rule is one sentence — *a play containing a Mimic must also contain at least one real
card of the species being claimed* — so there's no separate "claim" step: what it's copying is
always obvious from what else you played it with.

**What changes in feel, not just rule.** The base game rewards knowing the chain cold; Force of
Nature rewards reading the *table* — what event just fired, who it hurt, whether the board is about
to flip on you. Pitched as the advanced mode: not recommended for a first game, since a new player
is still learning the chain the base rules already ask them to hold in their head.

---

## T9 — Art & Assets · *derived*

**Pecking Order ships with real artwork by default** — it was the suite's first game to launch with
a **core art pack** rather than emoji defaults, so no player has seen it any other way.

| What | Count | Where it renders |
|---|---|---|
| Animal card faces | 14 — the full chain (13 species plus the Poacher/Human) | Hoard fan, table Marks, Challenge builder, gallery |
| Mimic card face | 1 (Force of Nature only) | Same seams, once Invasive Mimicry has fired |
| Card back | 1 | Face-down cards, the Watering Hole pile |
| Chain diagram | 1 non-card image | The How to Play Diagram tab |

**Everything is precached.** The art is part of the app version, present on a cold offline install;
changing it needs a service-worker version bump.

**Where to see it without playing.** How to Play → **Animals** shows the full chain, one entry per
species with its predator listed; **Diagram** shows the same chain as a picture. Both are built from
the live chain data through the same renderer the table uses, so neither can drift, and both are
skinnable along with everything else. Opening either tab offline is the install check — illustrated
cards mean the art precached correctly, emoji mean it didn't.

Dimensions, file-size ceilings and the conversion process are **not** recorded here — they live in
`docs/art-authoring-guide.md`, the document to brief an artist from alongside T4.

---

## T10 — At the Table · *derived — except the PTP judgement*

**Modes.** Multi-device only. Every player uses their own phone; one person hosts and the rest join
with a room code. There is no pass-the-phone or shared-device option.

**Players.** 3 to 6.

**Devices.** One per player, no exceptions — every Hoard is private and dealt over the private
Firebase channel, which a shared screen cannot preserve.

**Shape-changing settings.** None. No setting alters player count or session structure — Law of the
Wild changes how long a Match runs and how it's scored, not its shape.

**How it plays at each size**

| Players | What it feels like |
|---|---|
| **3** | Fast, thin Encounters — with only two other players, a Mark you can't answer is much more likely to go Unchallenged in a single beat. |
| **4–5** | The intended game. Enough players that a board can genuinely spiral before someone answers it, and enough Hoards in play that Small Fry and Scavenge start to matter. |
| **6** | Longer Clashes, a Watering Hole that fills up fast, and more waiting per Encounter — six players must each pass on a board before it's your turn to try. |

**Could it be Pass-the-Phone?** — ◇ *judgement, not spec*

**No — the private Hoard is the whole game.** Every Encounter turns on what you're holding and
whether you'll admit it by Staking. A shared phone means every other player watches you look at your
own cards before you decide, which destroys the exact information asymmetry the game is built on.
This sits alongside Cookie Jar as a case where the multi-device requirement is load-bearing, not a
delivery choice that could be revisited later.

---
