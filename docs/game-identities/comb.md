# Honeycomb Hills

**Game 20** · `activeGameId: comb` · plugin `js/games/comb.js`
**Emoji:** 🐝 · **Brand:** honey gold `#F0A500`, dark ink (label tone `#B87A00`) · **Players:** 3–4 · **Modes:** MDLM only
**Status:** gold master · verified against SW v225 on 10 September 2026

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

The big one. Nineteen hexes of meadow, five resources, and three or four beekeepers building combs
across the same ground. Every turn one die-cast decides what blooms — and it pays **everybody at
once**, so you are never not playing. You spend what the meadow gives you on walls, cells and domes,
you badger the table into trades you shouldn't get, and you win by being first to seven Hive Points.
It is the longest, most deliberate game in the box: about twenty-five minutes for a short summer,
closer to fifty for a full one. If the rest of the suite is a party, this is the afternoon.

---

## T2 — The Premise · *free*

You are a colony. Not a person with a colony — the colony. The meadow in front of you is nineteen
hexes of grove, rock, flower and clover, each of them capable of producing exactly one thing, each
of them marked with a number. At the head of every turn the Sun Compass is cast, a number comes up,
and every hex wearing that number blooms at once. Whoever has built next to it collects. That is the
engine, and it runs whether it is your turn or not, which is why nobody at this table ever gets to
look at their phone.

What you actually spend the game doing is arguing. The meadow will not give any one player
everything they need — it is built so it can't — so the only route to a Queen Dome is usually
through somebody else's spare Royal Jelly, and the only way to get it is the **Waggle Dance**: an
offer, out loud or in the app, on any terms you can talk them into. Every trade you make helps the
person you make it with. That is the tension, and it is the whole game. You will hand somebody the
Nectar that wins them the match and you will know you are doing it as you do it.

Underneath the negotiation there is a second, quieter contest over shape. Comb Walls chain across
the meadow, the longest unbroken chain is worth two points, and a rival dropping a single Drone Cell
in the middle of yours cuts it — no attack, no dice, just a small polite piece of building that
takes two points off you. A 7 brings the Wasp, and the Wasp shuts a hex down until somebody moves
it, usually onto whoever is winning. It is a friendly game with a lot of knives in it.

---

## T3 — How to Play · *free*

**Setup.** Three or four players, each on their own phone. The host picks the settings, the app
deals the **Meadow** — nineteen hexes, each with a resource and a **Bloom Marker** number — and the
opening goes round in a **snake**: player 1, 2, 3, then 3, 2, 1. On each of your two turns in the
snake you place one **Drone Cell** on a corner and one **Comb Wall** on an edge touching it. These
two placements are free and go anywhere legal. **Your second cell pays you immediately** — one of
each resource the hexes around it make. Then the season starts.

**The loop.** On your turn:

1. **The Scout Flight.** The Sun Compass is cast automatically — two dice, 2 to 12. There is no
   button; watching it is the beat.
2. **Everything blooms.** Every hex wearing that number produces, and **every player** with a piece
   on one of its corners collects: a **Drone Cell** takes 1, a **Queen Dome** takes 2. The hex the
   Wasp is sitting on produces nothing. You collect on other people's turns as well as your own,
   which is why you watch every roll.
3. **Build, trade, or both, in any order** — then End Turn.

**What you can spend on.**

| | Costs | You may own |
|---|---|---|
| **Comb Wall** | 1 Resin + 1 Wax | 15 |
| **Drone Cell** | 1 Resin + 1 Wax + 1 Pollen + 1 Nectar | 5 |
| **Queen Dome** | 2 Nectar + 3 Royal Jelly (upgrades a cell you already own) | 4 |
| **Instinct card** | 1 Pollen + 1 Nectar + 1 Royal Jelly | the deck runs to 25 |

**Two placement rules, and one of them is the rule everyone forgets.** Everything you build must
**touch your own network** — the exception being the two opening placements. And a new Drone Cell
must sit **at least two edges away from any other cell**, including your own. That is the **Distance
Rule**, and it is the single most-missed rule in the game.

**Trading — the Waggle Dance.** Two routes. Trade with a **player** on any terms at all: post what
you'll give and what you want, either at one named person or open to the whole table, and they
answer. Or trade with the **Meadow** at **4:1** — four of one resource for one of anything. Landing
a Drone Cell on a **Trade Blossom** at the rim makes the Meadow cheaper: **3:1** at a general
Blossom, **2:1** at one that matches a specific resource.

**A 7 brings the Wasp.** Nothing blooms. Everyone holding more than the carry limit **spills half**
of it, rounded down — everyone, not just the roller's target. Then the roller moves the Wasp onto
any hex, shutting it down until somebody moves it again, and (on the harder setting) robs one random
resource from a player touching that hex.

**Instinct cards.** One a turn, never on the turn you bought it. Twenty-five cards, five kinds:
**Guard Bee** ×14 (move the Wasp and rob someone — this is the one that counts toward Fiercest
Guard), **Golden Nectar** ×5 (never played; a hidden point), **Comb Rush** ×2 (two free walls right
now), **Spring Bloom** ×2 (take any two resources), **Pheromone Dominance** ×2 (name a resource;
everyone hands you all of theirs).

**How it ends.** First colony to the **Hive Point** target — 7 on a Short Summer, 10 on a Full
Season — and **the win is only ever checked on your own turn**. Losing Largest Comb on somebody
else's turn can drop you below the line; gaining it there does not win you the match. Points come
from:

- **Drone Cell** — 1 each
- **Queen Dome** — 2 each
- **Largest Comb** — 2, to the longest unbroken chain of walls (minimum 5)
- **Fiercest Guard** — 2, to whoever has played the most Guard Bees (minimum 3)
- **Golden Nectar** — 1 each, hidden in your hand until somebody wins

**Both achievements can be taken off you, and neither ever transfers on a tie.** The holder keeps it
until somebody **strictly beats** them — including the case where two rivals both pass them at once,
where the incumbent still keeps it, because no single challenger beat them outright.

---

## T4 — Theme & Flavour · *free*

**The world.** A meadow in high summer, seen from just above it. Warm, sunlit, hand-painted — not
cartoon bees with faces, and not a nature documentary either. The register is a gardener's: the
ground is grove, rock, flower, clover and nursery, and the things you build on it are wax
architecture. Nothing in Honeycomb Hills is grim. The Wasp is the closest the game gets to a
villain and it is an inconvenience with a stinger, not a threat.

**The voice.** Practical and warm, with the confidence of someone who knows the meadow. It gives
instructions as observations — *"Park the Wasp somewhere painful."*, *"Send the scouts out."*,
*"Pick who the Wasp robs."* — and it does not oversell. The status line is one short sentence per
phase and never more. Where the copy has a joke in it, the joke is dry: the quit confirm is
*"Yeah, buzz off."*, the empty Instinct hand reads *"Nothing in the hive yet. Buy one on your
turn."*, and an empty Season Log says *"Nothing has happened yet. Give it a turn."*

**Things that are on-theme.** Bees, comb geometry, hexagons, honey and wax as materials, sunlight,
pollen, flowers by name (sunflowers, clover), smoke as the thing that calms a hive. Warm golds,
greens, a little terracotta.

**Things that are not.** Hives as factories or corporations. Bees as workers being managed. Anything
mechanical or industrial. Combat language — the meadow has no fights in it, only crowding.

**The one word the copy is careful with is "meadow".** It is doing two jobs: the physical board
(*"the Meadow"*, laid out Wild or Tended) and the bank you trade against (*"Trade With the
Meadow"*). Both are correct and the game leans on the elision deliberately — the meadow gives you
things and takes things back, and it is the same meadow.

---

## T5 — Terminology · *paired*

| Term | Meaning |
|------|---------|
| **The Meadow** | The 19-hex board — and, at the rim, the bank you trade against at 4:1 or better. Both senses are intended. |
| **Hive Points** | The score. First to 7 (Short Summer) or 10 (Full Season) wins. Never "victory points". |
| **The Season** | One match. Also the name of the length setting. |
| **Scout Flight** | One cast of the Sun Compass at the head of a turn — the 2d6 that decides what blooms. |
| **Sun Compass** | The die itself: the round, engraved thing that spins in and lands on a face. Not the turn-order dots. |
| **Bloom Marker** | The number on a hex. Eighteen of them, one each of 2 and 12, two each of 3–6 and 8–11. No 7. |
| **Bloom** / **blooms** | What a hex does when its number comes up. The game never says "produces" to a player. |
| **Comb Wall** | The edge piece. Chains of them compete for Largest Comb. |
| **Drone Cell** | The corner piece. Collects 1 from each adjacent blooming hex; worth 1 Hive Point. |
| **Queen Dome** | An upgraded Drone Cell. Collects 2; worth 2 Hive Points. |
| **The Distance Rule** | A new Drone Cell must sit at least two edges from any other cell, including your own. |
| **Largest Comb** | 2 points for the longest unbroken chain of your walls, minimum 5. Never transfers on a tie. |
| **Fiercest Guard** | 2 points for the most Guard Bees played, minimum 3. Never transfers on a tie. |
| **Unclaimed** | The displayed state of an achievement nobody has qualified for. Never a blank, never a dash. |
| **The Waggle Dance** | Trading. Both the action and the settings name for how trading is conducted. |
| **Trade Blossom** | A rim port. Reaching one with a Drone Cell improves your Meadow rate to 3:1, or 2:1 for its own resource. |
| **The Wasp** | The blocker. Sits on a hex and stops it blooming; moved by a 7 or a Guard Bee. |
| **The Smoke Zone** | The one hex that produces nothing, and where the Wasp starts. |
| **The Overflow** | The discard on a 7 — and the name of the carry-limit setting. |
| **Instinct card** | The bought card. Five kinds; one played per turn, never the turn it was bought. |
| **Guard Bee** · **Golden Nectar** · **Comb Rush** · **Spring Bloom** · **Pheromone Dominance** | The five Instinct kinds. |
| **Resin · Wax · Pollen · Nectar · Royal Jelly** | The five resources, always in that order. |
| **Sapling Grove · Sunlit Rock · Pollen Meadow · Sunflower Patch · Nursery Cell** | The five producing hex kinds, yielding those five resources in order. |
| **The Season Log** | The match history overlay. Only ever records what the whole table saw. |
| **The Hive is Thriving** | The gameover screen's title. |
| **Daylight** | The optional per-turn clock. |

### Naming rules — constraints, not preferences · *suite-wide*

- **"Hive Points", never "Swarm".** The original brief called the score a Swarm; **Pecking Order
  owns "Swarm"** as a defined move with its own copy and match-log lines. Renamed at brief Revision 1
  along with *Fiercest Guard* and *Comb Rush*, and the word appears nowhere in this game.
- **"Bloom", never "produce" or "harvest", in player-facing copy.** Internal function names may say
  produce; the screen never does.
- **"The Season" is this game's match word.** Cookie Jar owns "Raid", Counting Sheep owns "Night",
  Cold Shoulder owns "Floe-Off", Pecking Order owns "Encounter" — and **Pecking Order also owns "The
  Dry Season"** as a Force-of-Nature event. The distinctive word there is *Dry*; the bare phrase is
  safe, but do not shorten anything here toward it.
- **"Roomy" and "Endless" are knowingly shared.** Cold Shoulder has a `Floe Size` pill labelled
  Roomy and PASS has a `Match Length` pill labelled Endless. Both mean the same kind of thing in
  both games, so they were kept rather than renamed — but they are the two words in this game's
  settings a player can meet twice on the same kind of screen.

---

## T6 — Settings · *mixed — labels paired, values derived*

The settings overlay is titled **Honeycomb Hills 🐝** — *"How long the summer runs, and how mean the
meadow gets."* Seven cards, **and no Sylly Mode card** — see T8.

| # | Setting | Options | Default | What it does in play |
|---|---|---|---|---|
| 1 | **The Season** | Short Summer · Full Season | Short Summer | The target: 7 Hive Points or 10. Also **presets The Wasp and The Overflow** — see below. Sits in the difficulty slot. |
| 2 | **The Meadow** | Wild · Tended | Wild | Whether the hexes and Bloom Markers are shuffled fresh, or laid out to a fixed known-fair pattern. Tended is the first-game layout. |
| 3 | **The Wasp** | Blocks Only · Blocks and Steals | follows The Season | Whether landing the Wasp also robs one resource from a player touching that hex. |
| 4 | **The Overflow** | Off · Snug · Roomy | follows The Season | The carry limit a 7 punishes: none, over 7, or over 9. |
| 5 | **The Waggle Dance** | Out Loud · Full Dance | Out Loud | Out Loud is a table negotiation you then tap in. Full Dance posts the offer in-app, everyone answers, and the poster picks — with a 10-second deadline on answers. |
| 6 | **Daylight** | All Day · Long Day · Short Day | All Day | The per-turn clock: none, 90 seconds, or 60. Exists so one long thinker cannot stall the meadow. |
| 7 | **The Meadow's Bounty** | Endless · Limited | Endless | Whether the Meadow can run dry. Limited stocks 19 of each resource and the meadow is then a closed system. |

**Every card carries a dynamic value line** below its pill row, because six of the seven encode a
concrete number the thematic label hides. The Season reads *"First to 7 Hive Points — about 25
minutes."*; Daylight reads *"90 seconds a turn."*; Overflow reads *"Hold more than 7 and a 7 costs
you half."* Both the value line and the pills repaint from the comprehensive sync, not per-card.

**The Season presets two other settings — and this is a plain preset, not either of the named
exclusivity patterns.** Tapping Short Summer sets The Wasp to Blocks Only and The Overflow to Off;
tapping Full Season sets them to Blocks and Steals and Snug. Nothing dims, nothing becomes
unreachable, and **there is no amber reason line** — the two cards stay fully live, and tapping
either of them afterwards changes only itself and does not un-set The Season. The trap this design
walks around is a handler that mutates the two variables but repaints only its own card; the
repaint is comprehensive precisely so that failure mode is structurally impossible.

**There is deliberately no "Wasp: Off".** Fourteen of the twenty-five Instinct cards are Guard Bees
whose entire function is to move the Wasp, and Fiercest Guard would become unwinnable. Blocks Only
is the gentle option.

**The Season is the difficulty slot.** Honeycomb Hills draws nothing from `words.json`, so the usual
word-difficulty setting does not apply — the documented non-word-bank exemption (PASS, DYB, GTH,
CLD). The Season is the velocity dial and sits first, so the Phase-Gate audit does not read the
absence as a gap.

**All seven are host-owned and frozen at match start.** The board is dealt from The Season and The
Meadow and can never be re-dealt. Clients receive all seven before the room starts. **None of them
changes the player count** — the range is a flat 3–4 under every setting.

---

## T7 — The Player's Journey · *mixed — 7a derived, 7b paired, 7c free*

### T7a — The flow

| # | Screen | Beat | Type | Duration | Chrome |
|---|--------|------|------|----------|--------|
| 1 | `screen-comb-menu` | Pick the season | Menu | — | 🔊 |
| 2 | `screen-comb-standby` | Client waiting for the host to lay out the meadow | Interactive | — | 🔊 ✕ |
| 3 | `screen-comb-meadow` | **The board.** All seven phases | Interactive | — | 📜 `[?]` 🔊 ✕ |
| 4 | `screen-comb-gameover` | The Hive is Thriving — standings, the Golden Nectar reveal, stats | Result | — | 🔊 ✕ |

**Four screens and fifteen overlays. That ratio is the architecture of this game:** the board never
goes away, so everything else is a layer over it. There is **no setup screen and no pass-gate** —
names come from the lobby roster, everyone is on their own phone, and no private information is
ever revealed by handing a device over.

`screen-comb-standby` is **not** an interstitial: it does not auto-advance and the player may leave
from it, so it carries the full 🔊 + ✕ chrome.

**`screen-comb-meadow` is the one screen that is not the Stack** — it keeps the legacy `h-screen`
sticky-footer, on the documented whitelist, for the same reason as the drawing and aiming screens:
the board is permanently fit-to-view and must not scroll while it is being read and tapped, and the
hand row and action bar must stay frozen beneath it. **Seven phases live on this single screen** —
draft, roll, overflow, wasp-move, wasp-steal, actions, gameover-pending — and one render function
owns every element on it, setting all of them every time.

**The board is framed by two floating panels over its letterbox dead-space** (they add no layout
height, so the fit-to-view rule holds). Top-left: a **player panel**, one row per seat — a
turn-order **colour dot** (yours ringed) and what that seat took on the last Scout Flight, no names —
with the **active seat's row lit**, which is the game's turn-handover signal on a board that looks
identical on every phone. Top-centre: the **landed roll**, kept up until the next cast, over an
11-tick **probability ruler** (the 2d6 bell curve, 7 red fading to gold at 2/12 — this replaced the
invisible pog pip dots). Bottom: a **player-stats strip**, one mini-card per seat (name + visible
Hive Points, then small icons of the real pieces — cells, domes, walls, Instinct cards held) — a tap
opens the magnifier straight to its stats. After a roll, and while you are placing a build, the board
**dims to about 65%** so what just bloomed, or where you may legally build, stands out; legal build
targets glow in **your own colour**. Trade Blossoms you have reached, and the rim corners that would
reach an unreached one, carry a small **blinking beacon** in the blossom's colour — a bright point
that pulses like a lighthouse rather than a constant glow.

**Overlays**

| Overlay | Opened from | What it is |
|---|---|---|
| `comb-settings-overlay` | Menu | The seven settings |
| `comb-how-to-overlay` | Menu, board `[?]`, hand `[?]`, tap-hold | How to Play — **3 tabs**: *The Rules* · *The Comb* · *The Instinct Deck* |
| `comb-quit-overlay` | Board ✕, standby ✕ | Mid-game quit confirm |
| `comb-new-season-overlay` | Gameover | Play-again confirm |
| `comb-overflow-overlay` | A 7, on over-limit devices only | The mandatory discard |
| `comb-trade-overlay` | Waggle Dance | The offer builder plus the Meadow's rate rows |
| `comb-trade-offer-overlay` | An offer arriving | Deal / No thanks |
| `comb-steal-overlay` | The Wasp landing | Pick who it robs |
| `comb-instinct-overlay` | The Instinct button | Your own cards; play one |
| `comb-instinct-reveal-overlay` | Buying a card | The buyer's device only — what you drew |
| `comb-log-overlay` | 📜 | The Season Log |
| `comb-tip-overlay` | Any inline `[?]`, and any tap on a dimmed target | The shared contextual tip |
| `comb-pheromone-overlay` | Playing Pheromone Dominance | Name a resource |
| `comb-bloom-overlay` | Playing Spring Bloom | Take any two |
| `comb-map-overlay` | 🔍 on the board's corner, or a tap on the player-stats strip | A **three-zone detail view** — the player panel and an annotated probability ruler up top, the board in the middle (pinch, scroll-wheel and drag, locked to its zone so the panels never move), and a full per-player stats table below (points, cells, domes, walls, longest chain, Instinct held, Trade Blossoms reached). Still the **one overlay in the game that must lose a z-fight**, so the Overflow and an arriving trade land on top of it |

**The build picker is not a sixteenth overlay.** Choosing *what* to build is an inline surface in
the Controls zone, a sibling of the placement bar and the action bar, because what you can afford
and where it could legally go are read together — and a modal over the board while you decide what
to put on it is the one thing this game must not do. An option you cannot afford **dims but stays
tappable**: the reason is what teaches the rule.

### T7b — The words on screen

#### The menu

```copy
# screen-comb-menu
Honeycomb
Hills
Build your comb, trade your nectar, grow the strongest hive in the meadow.
Send the Scouts
How to Play
Settings
← Back to the Box
```

#### Client standby

```copy
# screen-comb-standby
Waiting for the hive…
The host is laying out the meadow. Sit tight.
```

#### The meadow — status line, one per phase

```copy
# screen-comb-meadow — combStatusLine()
Place a Drone Cell, then a Comb Wall beside it.
Send the scouts out.
A seven!
A seven. Half of what you are carrying goes back to the meadow.
A seven. Waiting on the others to spill.
Park the Wasp somewhere painful.
Pick who the Wasp robs.
Build, trade, or end your turn.
The hive is thriving.
```

The other-player forms interpolate the active player's name — *"[Name] is choosing an opening
spot."*, *"Waiting on [Name] to cast."*, *"[Name] is moving the Wasp."*, *"[Name] is robbing
someone."*, *"[Name] is building."* — and are recorded here as description rather than as copy,
because they are not contiguous strings.

#### The meadow — controls

```copy
# screen-comb-meadow — action bar, placement bar, hand row
Build
Buy Instinct
Waggle Dance
The Dance
End Turn
Cancel
Place
Never mind
```

`Waggle Dance` becomes `The Dance` while your own offer is open — that is the poster's route back to
the answer board. The Instinct button reads `Instinct N`, and the Daylight line reads
`Daylight · Ns`.

#### The meadow — placement hints

```copy
# screen-comb-meadow — combPlaceHint()
Tap a lit edge for your Comb Wall.
Tap a lit corner for your Drone Cell.
Tap one of your own cells to crown it.
Tap a hex to park the Wasp.
Wall here?
Cell here?
Crown this one?
Wasp here?
```

#### The build picker

```copy
# comb-build-picker — options and block reasons
Drone Cell
Queen Dome
Comb Wall
Your colony has no more to give.
Not enough in the comb for that yet.
Nowhere legal to put one right now.
```

#### The Hive — gameover

```copy
# screen-comb-gameover
The Hive is Thriving 🐝
brought the strongest hive home.
Hive Point
Golden Nectar
cast this season.
The Wasp landed
Largest Comb —
Fiercest Guard —
Unclaimed
New Season
Back to the Box
```

#### Settings

```copy
# comb-settings-overlay — title and card labels
Honeycomb Hills 🐝
How long the summer runs, and how mean the meadow gets.
The Season
How many Hive Points win the match — and how long the afternoon runs.
Short Summer
Full Season
The Meadow
Whether the hexes and Bloom Markers are shuffled fresh, or laid out to a known-fair pattern.
Wild
Tended
The Wasp
What happens when the Wasp lands on a hex — whether it also robs somebody.
Blocks Only
Blocks and Steals
The Overflow
How much you can carry before a 7 spills half of it.
Off
Snug
Roomy
The Waggle Dance
Whether you sort trades out loud at the table, or negotiate them in the app.
Out Loud
Full Dance
Daylight
Whether a turn has a time limit, so one long thinker cannot stall the meadow.
All Day
Long Day
Short Day
The Meadow's Bounty
Whether the meadow can actually run dry.
Endless
Limited
```

```copy
# comb-settings-overlay — dynamic value lines (COMB_VAL_TEXT)
First to 7 Hive Points — about 25 minutes.
First to 10 Hive Points — about 50 minutes.
Hexes and Bloom Markers shuffled fresh every match.
The same fair meadow every time — good for a first game.
The Wasp shuts a hex down, but takes nothing from your comb.
The Wasp shuts a hex down and takes one resource from someone touching it.
Hold as much as you like.
Hold more than 7 and a 7 costs you half.
Hold more than 9 and a 7 costs you half.
Sort the deal out loud, then tap it in.
Post an offer; everyone answers in the app. You pick who deals.
No time limit.
90 seconds a turn.
60 seconds a turn.
The meadow never runs out.
19 of each resource — the meadow can run dry.
```

#### How to Play — title and tabs

```copy
# comb-how-to-overlay
How to Play 🐝
Gather from the meadow, trade with the table, build the biggest comb.
The Rules
The Comb
The Instinct Deck
```

#### How to Play — The Rules

```copy
# comb-how-to-overlay — step headings
Grow the strongest hive
The meadow is nineteen hexes
The Scout Flight decides what blooms
Cells collect, Domes collect double
Four things to spend on
The Distance Rule
Everything must connect
The Waggle Dance
A 7 brings the Wasp
One Instinct card a turn
Largest Comb and Fiercest Guard
Winning and Scoring
Where the Hive Points come from
```

```copy
# comb-how-to-overlay — the Sylly Mode card (the honest line)
✨ Sylly Mode
Not this one
```

#### How to Play — The Comb

```copy
# comb-how-to-overlay — The Comb tab
The Sun Compass
Cast at the head of every turn. Thirty-six faces, numbered
The Hexes
Six kinds of ground, five of them producing. Tap and hold a hex on the board to jump back here.
The Resources
Five things the meadow makes. Each has its own shape as well as its own colour.
What It Costs
The four things you can buy, and the price of each.
The Structures
Three things you build. On the board they're small and plain — this is what they really look like.
```

```copy
# hex and resource display names (COMB_HEX_NAME, COMB_RES_NAME)
Sapling Grove
Pollen Meadow
Sunflower Patch
Sunlit Rock
Nursery Cell
The Smoke Zone
Resin
Wax
Pollen
Nectar
Royal Jelly
```

#### How to Play — The Instinct Deck

```copy
# comb-how-to-overlay — The Instinct Deck tab
Twenty-Five Cards
One a turn, never on the turn you bought it. Tap and hold a card in your hand to jump back here.
```

```copy
# COMB_INSTINCT_NAME / COMB_INSTINCT_TEXT
Guard Bee
Move the Wasp, and rob someone touching its new hex. Counts toward Fiercest Guard.
Golden Nectar
One hidden Hive Point. Never played — it just counts at the end.
Comb Rush
Build two Comb Walls, free, right now.
Spring Bloom
Take any two resources from the Meadow.
Pheromone Dominance
Name a resource. Every other player hands you all of theirs.
```

#### The Overflow

```copy
# comb-overflow-overlay
The Overflow 🐝
A seven. Half of what you are carrying goes back to the meadow.
Spill It
Waiting for the others to spill…
```

#### The Waggle Dance

```copy
# comb-trade-overlay
The Waggle Dance 🐝
You Give
You Want
Who With
Pick the player you agreed with — or open it to the whole table.
Trade With the Meadow
No negotiating, no waiting. Your rates improve with every Trade Blossom you have reached.
Post the Offer
Never mind
```

```copy
# comb-trade-offer-overlay
Deal
No thanks
```

#### The Wasp, and the two card overlays

```copy
# comb-steal-overlay
Rob somebody
The Wasp has landed. Pick who it takes from.
```

```copy
# comb-pheromone-overlay
Name your prize
Every other player hands you every one of these they are holding.
```

```copy
# comb-bloom-overlay
Spring Bloom
Take any two from the meadow. They can be the same one twice.
Take Them
```

#### Your Instincts, and the reveal

```copy
# comb-instinct-overlay
Your Instincts 🐝
One a turn, and never one you bought this turn.
Nothing in the hive yet. Buy one on your turn.
```

```copy
# comb-instinct-reveal-overlay
You Drew
```

#### The Season Log, the magnifier, and the tips

```copy
# comb-log-overlay
The Season Log 📜
Everything the whole table saw happen, in order.
Nothing has happened yet. Give it a turn.
```

```copy
# comb-map-overlay
Pinch or scroll to zoom · drag to pan · tap a lit target to place
```

```copy
# comb-tip-overlay — headings driven by combShowTip()
Not that
Not there
Not yet
No deal
```

#### Quit and play-again

```copy
# comb-quit-overlay
Abandon the hive?
The comb comes apart and the season ends — for everyone at the table.
Yeah, buzz off.
Not yet!
```

```copy
# comb-new-season-overlay
New Season?
A fresh meadow, a fresh comb. This one's done.
New Season
Restart in Lobby 🔄
Leave Session
Stay here
```

### T7c — Where the journey is thin

**◇ judgement, not spec.**

**There is no round intro screen, and that is deliberate.** Every other repeating-phase game in the
suite gets a short auto-advancing beat at the top of each repetition. Honeycomb Hills has 60–80 turns
in a Full Season, so a five-second card at the head of each one would add minutes of nothing. The
Scout Flight animation carries that weight instead. The one thing it could not do — **tell you it is
now your turn** — is now the job of the player panel's lit active-seat row (SW v226); the handover is
no longer signalled only by the header line and the action bar coming alive.

**The gameover screen is short for a fifty-minute match.** Standings, the Golden Nectar reveal, two
achievement lines and a Scout Flight count. The Golden Nectar reveal is the beat it must land and it
does — naming the hidden count beside each player is the whole point of hiding it — but a season this
long has more to say about itself than three stat lines. The Season Log is right there and is not
surfaced from the gameover screen at all.

**The Season Log is the most under-used surface in the game.** It is complete, it is
privacy-correct by construction, and it is reachable from exactly one small 📜 in the board header.
Nothing ever points a player at it, and in Out Loud trading — the default — it is the only record of
what was agreed.

**Client standby has no roster of who else has joined.** The container is there and empty. A player
waiting on a host who is still reading Settings sees one line of text and no evidence anything is
happening.

---

## T8 — Sylly Mode · *free*

**Honeycomb Hills has no Sylly Mode. It is the only game in the box without one, and it is a
decision rather than an omission.**

The How to Play overlay keeps the `✨ Sylly Mode` card in its usual last slot so a player scanning
for it gets an answer instead of a gap. The card reads **"Not this one"** and points at Settings and
at The Season. The settings overlay, correspondingly, has **no Sylly Mode card and no dead toggle** —
a switch that does nothing is worse than an honest sentence, and on this particular screen a dimmed
control already means something else.

**Why there isn't one.** Every other game's Sylly Mode is a rules mutation dropped into a short
session — a chain inverted, scoring flipped, a deck given teeth. This game already ships seven
settings, four of which change what the rules *are*: whether the Wasp steals, whether you can be
made to discard, whether the meadow can run dry, whether trades are negotiated in the app under a
deadline. A Full Season with Blocks and Steals, Snug and Limited is a materially different and
meaner game than the default, and it is reached through the same overlay by the same tap. Adding an
eighth switch labelled "advanced rules" on top of seven advanced rules would have been decoration.

**Recorded intent (not blocking).** If one is added later it should change what the game *is*, not
how hard it runs — the settings already own the difficulty axis. The two ideas raised during the
build and not taken were a meadow that reshuffles its Bloom Markers mid-season, and Golden Nectar
being public.

---

## T9 — Art & Assets · *derived*

**Honeycomb Hills ships on the owner's own artwork, precached as nine core art packs** — every one
of them under `data/art/comb/`. It is the first game in the suite whose art spans more than one
render kind, which is why the packs are nested under a single folder for location while each
declares its own kind.

| Pack | What it draws | Where it renders |
|---|---|---|
| `comb/hex` | The six hex kinds | The board, the magnifier, The Comb tab |
| `comb/res` | The five resources | The hand row, cost chips, trade rows, The Comb tab |
| `comb/instinct` | The five Instinct card faces, and a back | Your hand, the buy reveal, The Instinct Deck tab |
| `comb/piece` | Wall, cell and dome at board scale | The board, the magnifier |
| `comb/piece-hero` | The same three, large | The Comb tab's **Structures** card |
| `comb/blossom` | The nine Trade Blossoms | The board rim |
| `comb/wasp` | The Wasp | The board |
| `comb/pog` | Bloom Marker discs | The board |
| `comb/die` | The Sun Compass — two ids: a blank face that flies, and an engraved one | The Scout Flight animation; The Comb tab's Sun Compass card |

**Five render seams**, one per primitive — hex, resource, Instinct card, piece, and the die. Nothing
is built outside them, which is what lets the How-to galleries render through the live seams and
therefore never drift from the board, and what makes those galleries double as the **offline install
check**: a tile that has lost its artwork visibly stops offering to enlarge.

**Resource shape is a requirement, not decoration.** Each of the five carries a distinct silhouette —
Resin a shard, Wax a hexagon, Pollen a sphere, Nectar a droplet, Royal Jelly a dome — because colour
alone fails under deuteranopia, and the first art pass drew Resin and Nectar as the same droplet in
adjacent hues. Resin is angular precisely so it cannot be confused with Nectar whatever a future
palette does.

**Hex display names are separated from hex ids on purpose.** Two kinds were renamed during the art
review — *Blossom Meadow* to **Pollen Meadow**, *Clover Patch* to **Sunflower Patch** — and nothing
else moved, because packets, the topology and the harnesses all key off the id. A skin may change
what a hex looks like and what it is called; it can never change that a `clover` hex yields Nectar.

**Gallery tiles are tap-to-enlarge** through the shared art viewer, and tap-hold on a hex, a resource
chip or an Instinct card deep-links into the matching gallery row. The board pieces, Trade Blossoms,
Wasp and Bloom Marker discs are canvas-only — never in a gallery and never in the viewer.

**No skin pack exists yet**, and none is required: core art is the default tier and a skin would sit
above it with no code change.

---

## T10 — At the Table · *derived — except the PTP judgement*

**Modes.** Multi-device only (MDLM). One host, everyone else joins with a room code. There is no
single-device and no shared-device option, and this is **structural rather than a preference** — see
the PTP line below.

**Players.** 3 to 4. Flat under every setting.

**Devices.** One per player. Every player holds a permanent private hand of resources and a private
collection of Instinct cards, neither of which any other device is ever told the contents of — hand
*counts* travel publicly, hand *contents* never do. Two moments are genuinely simultaneous and have
no single-screen expression at all: the Overflow on a 7, where every over-limit player discards at
once, and answering a posted trade offer.

**Shape-changing settings.** None. All seven change how the season plays, not how many people are in
it or how the session is structured.

**How it plays at each size**

| Players | What it feels like |
|---|---|
| **3** | Open. There is room on the meadow, the Distance Rule rarely bites, and cutting somebody's chain is a choice rather than an accident. Trades are harder to land — with only two possible partners, anyone who does not need what you have simply ends the conversation. A Short Summer here is the quickest way into the game. |
| **4** | The intended game. The meadow is genuinely crowded: opening placements matter, the Distance Rule locks corners out, and there is nearly always someone who wants what you are holding. A Full Season at four is the game at its longest and best — and comfortably fifty minutes. |

**Session length is the real dial, not player count.** Short Summer at three is about twenty-five
minutes; Full Season at four is about fifty. The known balance caveat is at the short end: at a
7-point target the two achievements are 4 of 7, so a win on three Drone Cells plus both achievements
is reachable. It ships that way by decision, with the achievement points and both minimums held in
named per-Season constants so tuning is a one-line change.

**Could it be Pass-the-Phone?** — ◇ *judgement, not spec*

**No, and not merely because it wasn't built that way.** Two things block it, and only one is fixable.
A four-player Full Season is 60–80 turns and every one of them would be a handover behind a
"don't look" gate, because each player holds a permanent private hand — the pass-gate would fire more
often than any actual decision. That is the tedium argument, and a shorter season would soften it.
The second is harder: the Overflow and answering a trade offer are simultaneous by design, and a
single device can only serialise them into a turn order where the last player to act knows what
everyone else did. A PTP version would have to change those two rules, and they are load-bearing.
Team-on-one-device (TLM) is a better fit if a shared-device version is ever wanted — two colonies,
two phones, private hands intact.

---
