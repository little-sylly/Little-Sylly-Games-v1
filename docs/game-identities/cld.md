# Cold Shoulder

**Game 19** · `activeGameId: cld` · plugin `js/games/cld.js` · shared module `js/lib/physics.js`
**Emoji:** 🐧 · **Brand:** glacier blue `#8ECAE6`, white ink · **Players:** 3–8 (Peck Off forces 2) · **Modes:** MDLM only
**Status:** gold master · verified against SW v219 on 4 September 2026

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

You are a penguin on a crowded slab of ice, and so is everyone else. Every round, all of you drag
back from your own penguin like a slingshot, lock it in, and then — all at once, nobody having seen
anyone else's plan — the whole floe slides. You will hit penguins you never aimed at. Somebody goes
off the edge into the Drink; from then on they bob at the rim, throwing snowballs to nudge the
survivors' aim off. The floe empties, the last one still dry catches a Fish, and first to the Fish
target wins. It teaches itself in one Slide, runs about ten minutes, and produces the specific noise
a table makes when four people all shove the same person and it turns out to be the wrong person.

---

## T2 — The Premise · *free*

An ice floe, an ocean, and more penguins than the ice comfortably holds. Nobody is taking turns.
Every Slide, every penguin aims at once and commits blind, and the ice resolves it all together as
one shove — yours, theirs, the rebound off the penguin already in the water, all of it. You are not
reacting to a rival's move. You are **guessing** it, and being wrong is most of the fun.

Getting knocked in is not the end of you. A **Drowned** penguin rides the rim at a **Berth**, does
two jobs every Slide — it is a bumper the living can carom off, and it gets a **Snowball** to fling
at a survivor's aim — and can **Dive** one Berth left or right to chase the action. So the floe is
never quiet: it empties of standing penguins while the rim fills with spiteful ones, and the two
pressures pull against each other until one player is left.

What the game actually produces is a table of people over-committing to a shove, watching the ice
carry it somewhere they didn't intend, and howling. Nobody is ever really out. The worst thing that
happens in Cold Shoulder is you spend three Slides at a Berth throwing snowballs and calling it
strategy.

---

## T3 — How to Play · *free*

**Setup.** Everyone is one penguin on the same floe (two each in Peck Off). A **Match** runs until
someone reaches the **Fish to Win** target; each **Floe-Off** is one full contest on a fresh floe,
worth one Fish. A Floe-Off is a series of **Slides**.

**The loop.** Each Slide:

- **Aim.** Drag back from your own penguin — further back is a harder shove. Release to **arm** it.
  Re-drag as often as you like.
- **Lock it in.** Tap **Lock It In** to commit. A commit is final — there is no taking it back.
- **The Slide.** Once every player has locked in, all penguins slide at once and the ice resolves
  every collision together. You will strike penguins you did not aim at.
- **Repeat** until one player is the last with a penguin **Standing**.

**Going in the Drink.** A penguin whose centre crosses the edge is **Drowned** for the rest of that
Floe-Off. It surfaces at a **Berth** on the rim and from the *next* Slide on it plays from there:

- it is a **bumper** — a living penguin that hits it is shoved back *harder*, not saved;
- it gets one **Snowball** per Slide to lob at a standing penguin, stronger the closer the Berth;
- it may **Dive** one Berth left or right to a new spot, or stay put. A Dive into a full Berth
  simply doesn't happen — the aiming UI greys that direction out.

**Winning.** The last **player** with at least one penguin Standing takes the Floe-Off and **+1
Fish**. First to the Fish to Win target wins the Match and is the **Final Floe**. Shoving someone in
scores nothing — not off a rebound, not with a Snowball — so nobody can farm it.

**Washout.** If a Slide (or, under The Thaw, a melt step) leaves *no* penguin Standing, the Floe-Off
is voided: no Fish, everyone **Resurfaces**, and the same Floe-Off is replayed.

---

## T4 — Theme & Flavour · *free*

**The world.** A sheet of sea ice, a grey ocean, a low sun, and a crowd of penguins with strong
opinions about personal space. It is slapstick, not survival — the penguin that goes in the water
bobs straight back up at the rim looking annoyed, not doomed. The register is the cartoon
double-take: the shove lands, the ice carries it wrong, everyone reacts.

**The voice.** Dry, Australian, and short. Plunge barks are one line each — *"Into the Drink!"*,
*"See you at the bottom."*, *"Off you pop."*, *"Splash."* — read aloud in the half-second the
penguin is airborne. Floe-Off intros are the same length — *"Shove first, apologise never."*,
*"The ice is fine. Probably."* The test is the suite's: if a line would not survive being read
aloud to a table mid-Slide, it is too long.

**Australian English throughout.** "the Drink" for the water, "apologise", "-our" endings. Metric
if a number ever needs a unit, which it does not.

**On theme:** cold blues and greys, a bright horizon, comic weight. The plunge is a *splash* — a
water-slap and a couple of bubbles — never a drowning. Drowned penguins at the rim read as
disgruntled hecklers, not corpses.

**Off theme:** anything with real jeopardy. Ice cracking as horror, penguins in genuine distress,
predators, a survival framing, a cold-and-bleak palette with no light in it. Getting shoved in is
the funniest thing that can happen to you, not the worst.

---

## T5 — Terminology · *paired*

| Term | Meaning |
|------|---------|
| **Floe-Off** | One full contest on a fresh floe, worth one Fish. A Match is a series of them. |
| **Slide** | One round within a Floe-Off: everyone aims, everyone commits blind, the whole floe resolves at once. |
| **Standing** | A penguin still on the ice. The win test is the last *player* with one Standing, not the last penguin. |
| **The Drink** | The water. To be "in the Drink" is to be Drowned. |
| **Drowned** | A penguin that went off the edge. Out of the standing contest for this Floe-Off, but not benched — it plays from the rim. |
| **Berth** | A slice of the rim a Drowned penguin bobs at. Berth count equals player count and never changes; each Berth holds two spots. |
| **Snowball** | The single throw a Drowned penguin gets each Slide, aimed at a standing penguin to nudge their Slide off line. Stronger from a closer Berth. Also takes one hit off a Berg. |
| **Dive** | A Drowned penguin's optional move one Berth left or right to a new spot. Allowed to fail into a full Berth — no shunt, it just stays. |
| **Resurface** | The reset of every penguin to Standing at the start of a Floe-Off (and after a Washout). |
| **Washout** | A Slide or melt step that leaves nobody Standing. No Fish, everyone Resurfaces, replay the Floe-Off. |
| **Fish** | The score. One per Floe-Off won; first to the Fish to Win target takes the Match. |
| **The Final Floe** | The gameover screen — the Match is decided. |
| **Berg** | A chunk of edge ice (Ice Breaker setting) that rebounds a would-be plunge instead of letting it through, until it takes enough hits and **shatters**. |
| **Peck Off** | The two-player duel setting: two penguins each, and the room is forced to exactly two players. |
| **The Thaw** | Sylly Mode — the floe shrinks a little after every Slide. See T8. |
| **The Huddle** | The settings overlay's title, not an in-play term. |

### Naming rules — constraints, not preferences · *suite-wide*

- **"the Drink", never "the sea" or "the water", for the state of being out.** The flavour pool uses
  "the water" descriptively ("back on the ice", "back to the water") but the *mechanic* is always
  the Drink.
- **"Slide" is this game's round word.** Counting Sheep owns "Night", Cookie Jar owns "Raid",
  Pecking Order owns "Encounter" — do not reach for any of those here.
- **"Drowned", not "eliminated" or "out".** A Drowned penguin is still playing.

---

## T6 — Settings · *mixed — labels paired, values derived*

The settings overlay is titled **The Huddle 🐧** — *"Set the ice, then get shoving."*

| Setting | Options | Default | What it does in play |
|---|---|---|---|
| **Ice Conditions** | Powder · Slush · Black Ice | Slush | How slippery the floe is — really the shove-distance dial. Powder is grippy and forgiving; Black Ice carries a full pull most of the way across. Sits in the difficulty slot. |
| **Floe Size** | Roomy · Standard · Cramped | Standard | Starting radius of the floe. Smaller is faster and more brutal. Pre-selected by player count if the host never taps it (Roomy 3–4, Standard 5–6, Cramped 7–8); tapping any pill locks the choice. |
| **Fish to Win** | 1 · 3 · 5 | 3 | How many Floe-Offs it takes to win the Match. At 1 the two gameover stat lines are hidden. |
| **Aim Assist** | OFF / ON | ON | Draws a dotted line to where your first bounce lands while you aim. |
| **Ice Breaker** | Off · 1 hit · 3 hits | 3 hits | Puts **Bergs** near the edge that rebound a plunge until they take that many hits and shatter. |
| **Peck Off** | OFF / ON | OFF | A two-player duel, two penguins each. Turning it on forces the room to exactly two players. |
| **✨ Sylly Mode (The Thaw)** | OFF / ON | OFF | The floe melts and shrinks after every Slide. See T8. |

**Dynamic value lines.** Ice Conditions and Floe Size both carry a live descriptor line under the
pill row, because their thematic labels deliberately hide the concrete value. Ice reads e.g.
*"Slush — a full pull carries you about half the floe."*; Floe reads e.g. *"Standard — 6 Berths,
comfortable for 6."*, with the Berth count filled from the live player count once the lobby is
known. Both repaint from `cldSyncSettingsUI()` and from the pill click handler.

**Ice Conditions is the difficulty slot.** Cold Shoulder draws nothing from `words.json`, so the
usual word-difficulty setting does not apply (the documented non-word-bank exemption — PASS, DYB,
GTH). Ice Conditions is the velocity dial and sits first so the Phase-Gate audit does not flag the
absence.

**Peck Off is enforced by the room bounds, not by hiding.** In MDLM the host opens Settings *before*
creating the room, so there is no player count to hide the card against. Instead `getMinPlayers` and
`getMaxPlayers` both return `2` while Peck Off is on, and the lobby physically cannot fill past two.
This is the `frtPearOff` precedent — a pre-lobby settings toggle is the one legitimate non-constant
input to a player-count bound.

**Peck Off and The Thaw are composable, not exclusive.** The Fruit Salad naming parallel (Pear-Off
*is* exclusive with its Sylly Mode) invites the opposite assumption — it does not hold here. Both
run together with no gating.

---

## T7 — The Player's Journey · *mixed — 7a derived, 7b paired, 7c free*

### T7a — The flow

| # | Screen | Beat | Type | Duration | Chrome |
|---|--------|------|------|----------|--------|
| 1 | `screen-cld-menu` | Pick the ice | Menu | — | 🔊 |
| 2 | `screen-cld-floeoff-intro` | "Floe-Off N" — a fresh floe (also the client standby surface) | Interstitial | 5 s (host) / indefinite (client standby) | none |
| 3 | `screen-cld-floe` | The floe: aim, commit blind, watch it resolve | Interactive | — | `[?]` 🔊 ✕ |
| 4 | `screen-cld-result` | Who survived, who went in, the Fish | Interstitial | 2.5 s | none |
| 5 | `screen-cld-scoreboard` | The running Fish tally | Summary | — | `[?]` 🔊 ✕ |
| 6 | `screen-cld-gameover` | The Final Floe | Result | — | 🔊 ✕ |

There is **no setup screen and no pass-gate** — names come from the lobby roster, every player is
on their own phone, and no private information is ever revealed by handing a device over.

The two interstitials carry no chrome: they auto-advance *and* have nothing to tap, the two
conditions of the interstitial exemption. `screen-cld-floeoff-intro` doubles as the client's
standby surface (`cldIntroMode === 'standby'`, the Cookie Jar `cjarShowClientStandby` pattern) — in
that mode the 5-second auto-advance timer is **not** armed and the client waits for
`CLD_FLOEOFF_START` however long it takes.

**`screen-cld-floe` is the one screen that is not the Stack** — it keeps the legacy `h-screen`
sticky-footer, brief-sanctioned, same reason as `screen-gth-canvas`: the stage must not scroll while
a finger is dragging on it, and the power bar / tally / CTA stay frozen beneath it. Three phases
(`aiming → waiting → resolving`, plus the `washout` beat) live on this one screen via `cldPhase`.

**Overlays**

| Overlay | Opened from | What it is |
|---|---|---|
| `cld-settings-overlay` | Menu | The Huddle — the seven settings |
| `cld-how-to-overlay` | Menu, floe `[?]`, scoreboard `[?]` | How to Play — **2 tabs**: *The Rules* (six steps + conditionals) and *The Floe* (a live practice sim + the six-pose cast) |
| `cld-quit-overlay` | Floe, scoreboard ✕ | Mid-game quit confirm |
| `cld-new-game-overlay` | Gameover | Play-again confirm |

There is **no tip overlay** — How to Play is the only reference surface (brief §15). Since SW v221
it has a second tab, **The Floe**: a canvas running the real physics with *Shove everyone* /
*Resurface* buttons (test the game without playing it), and **The Cast** — the six penguin poses
(Idle · Lean · Squash · Plunge · Bob · Throw), each drawn through the same seam the floe uses. The
floe `[?]` is *gated by `cldPhase`*: during `resolving` and `washout` it greys out rather than
opening a panel over the one thing the player needs to watch.

### T7b — The words on screen

#### The menu

```copy
# screen-cld-menu
Cold Shoulder
Barge your mates into the drink — last penguin on the floe wins.
Hit the Ice
How to Play
Settings
← Back to the Box
```

#### Floe-Off intro / client standby

Heading is built at runtime as *"Floe-Off N"*. The sub-line is a rotating flavour line
(`CLD_INTRO_FLAVOUR`, picked per Floe-Off). In standby the heading and sub are replaced.

```copy
# screen-cld-floeoff-intro — flavour pool (CLD_INTRO_FLAVOUR)
Brace for the Slide…
Everyone aims at once. Nobody sees a thing.
Find a gap. There isn’t one.
Shove first, apologise never.
The ice is fine. Probably.
Last one dry gets the Fish.
```

```copy
# screen-cld-floeoff-intro — client standby
Standing by…
Waiting for the host to push everyone onto the ice.
```

#### The floe

Header is built at runtime as *"Floe-Off N · Slide M"*.

```copy
# screen-cld-floe — controls
Dive
← Left
Stay
Right →
Tap to lock power
Power locked — tap to release
Too soft
Power
Lock It In
Sliding…
```

#### Floe-Off result

Heading and sub are built at runtime (*"{name} is the last one dry."* on a win). The Washout copy
and the plunge list are fixed.

```copy
# screen-cld-result
Washout!
That’s a Fish. 🐟
Nobody made it. No Fish — back on the ice.
```

#### Scoreboard

```copy
# screen-cld-scoreboard
The Standings
Next Floe-Off
Waiting for the host…
```

#### Gameover

```copy
# screen-cld-gameover
The Final Floe 🐧
Everyone back to the water.
March On!
Waddle Off
Longest stand
Most plunges
```

#### Plunge barks — float over the floe as a penguin goes in

```copy
# CLD_PLUNGE_BARKS
Into the Drink!
See you at the bottom.
That’ll be cold.
Straight in.
Off you pop.
Didn’t see that coming.
Well, that’s that.
Splash.
```

#### Settings — The Huddle

```copy
# cld-settings-overlay — title
The Huddle 🐧
Set the ice, then get shoving.
```

```copy
# cld-settings-overlay — Ice Conditions
Ice Conditions
How slippery the floe is. Grippier ice is easier to control and more forgiving.
Powder
Slush
Black Ice
Powder — grippy. A full pull carries you about a third of the floe.
Slush — a full pull carries you about half the floe.
Black Ice — slippery. A full pull carries you most of the way across.
```

```copy
# cld-settings-overlay — Floe Size, Fish to Win
Floe Size
How much room you've got. Smaller means crammed together, faster and more brutal.
Roomy
Standard
Cramped
Fish to Win
How many Floe-Offs it takes to win the whole thing.
```

```copy
# cld-settings-overlay — Aim Assist, Ice Breaker
Aim Assist
Draws a dotted line showing where your first bounce lands while you aim.
Ice Breaker
Puts chunks of ice near the edge that bounce you back instead of dumping you in — until they shatter.
1 hit
3 hits
```

```copy
# cld-settings-overlay — Peck Off, Sylly Mode
Peck Off
A two-player duel with two penguins each. Turning this on makes the room a 2-player game.
✨ Sylly Mode
The Thaw
The floe is melting. It shrinks a little after every Slide until there's nowhere left to stand. The Drowned close in with the rim.
Got it
```

#### How to Play

```copy
# cld-how-to-overlay — title
How to Play 🐧
Shove your mates off the ice. Last one dry wins.
```

```copy
# cld-how-to-overlay — step headings
You're one penguin on a crowded floe
Drag back to aim, like a slingshot
Everyone aims at the same time
All penguins slide at once
Off the edge and you're in the Drink
Being Drowned doesn't bench you
The floe starts guarded
You've got two penguins
Winning and Scoring
Last one dry catches a Fish
```

```copy
# cld-how-to-overlay — Sylly Mode card
✨ Sylly Mode
The Thaw
```

```copy
# cld-how-to-overlay — The Floe tab (SW v221)
The Rules
The Floe
Practice Floe
No commit, no scoring - just the real physics. Give everyone a random shove and watch the whole floe resolve at once.
Shove everyone
Resurface
The Cast
Every pose the penguin strikes on the ice, and the moment it means.
```

```copy
# The Cast — pose tiles (built from CLD_HOWTO_CAST in js/games/cld.js)
Idle
Lean
Squash
Plunge
Bob
Throw
```

#### Quit and play-again

```copy
# cld-quit-overlay
Waddle Off?
The Floe-Off ends for everyone and the Fish go back in the sea.
Yeah, waddle off.
Not yet!
```

```copy
# cld-new-game-overlay
March On?
Fresh ice, everyone back on, Fish tally back to nothing.
March On!
Stay here
Leave Session
```

### T7c — Where the journey is thin

**◇ judgement, not spec.**

**The scoreboard is the quiet screen.** The floe carries the aim, the blind commit, the resolve and
the plunges; the scoreboard that follows only restates a Fish tally the player has been tracking all
along. It is the beat most likely to read as a speed bump. A one-line flavour rotation here — the
way the Floe-Off intro has one — would cost nothing.

**The result screen is 2.5 seconds for the game's biggest payoff.** The plunge is the whole point of
Cold Shoulder and the result screen is where it is named and scored, and it is gone before a table
finishes reacting. Of the two interstitials this is the one a player most wants a beat on.

**The Thaw's shrink is subtle — but now readable.** It used to be invisible: playback opened on the
already-contracted floe, so the melt beat played into ice that had already shrunk (impl-notes
TG-13). Fixed SW v220 — the replay now starts on the pre-Thaw rim and visibly contracts on the
thaw beat. Still a small motion in a busy frame, but it lands now.

---

## T8 — Sylly Mode · *free*

**The Thaw.** The floe is melting. After every Slide resolves it shrinks by a fixed step, down to a
computed floor, and it keeps shrinking for the rest of the Floe-Off.

**What changes.** Only the geometry:

- The floe radius contracts one step per Slide, floored at `cldMinRadius()` — a value computed from
  Ice Conditions every time, never a literal, so Black Ice (which needs more room) bottoms out at a
  larger floe than Powder.
- **Drowned penguins and surviving Bergs ride the rim inward**, keeping their angle, so they are
  never stranded off the ice.
- **Standing penguins are not moved.** Any Standing penguin left outside the new radius plunges
  immediately, as its own `thaw-drop` beat in the aftermath. The ice visibly calves out from under
  you — and you can see the rim closing and choose to move in.
- Berth **count** is untouched; each Berth's arc just narrows as the circumference shrinks.
- The floe cracks audibly on each shrink (`playAbyssThud`).

**What it does to the match.** A melt step can end a Floe-Off on its own — by dropping all but one
penguin (that player wins) or by dropping everyone left (a Washout). It also makes rim shunts more
common as a Floe-Off goes on, which is why the Berth search is multi-hop rather than one-hop. No
rule's *behaviour* changes — The Thaw is a geometry rule, not a rules rule, which is exactly why it
composes cleanly with Peck Off and Ice Breaker.

**Recorded intent (not blocking).** The owner intends to demote The Thaw to a normal setting later
and give Cold Shoulder a Sylly Mode that changes what the game *is* rather than how fast it runs.
Ships as-is for v1.

---

## T9 — Art & Assets · *derived*

**Cold Shoulder ships with no art files at all.** The penguin — in play at ~24 px, and everywhere
in the chrome (menu, How to Play, result, gameover) — is drawn entirely in procedural canvas code:
a bézier-silhouette body with a clipped shading gradient, tinted per player with inline colour
maths, posed from a `pose(state, t)` table. There are no PNGs, no core art pack, no skin pack in
v1.

This was decided at spec review (2 September 2026) after a working proof was rendered and compared
against the brief's own mockup *at true in-game scale*. At 24 px a painted sprite's shading and line
work do not survive; the procedural draw reached ~85% of the mockup's quality in-engine for zero
bytes, and the brief's planned nine-file core art pack (~360 KB) was dropped in favour of it. The
owner confirmed the result is the permanent look, not a placeholder.

| Render seam | What it draws |
|---|---|
| `cldRenderPenguin(ctx, state, colourIdx, x, y, r, opts)` | **The one primitive.** Draws to a canvas context and returns nothing — a canvas game has no DOM node to return. Every penguin pixel, in play and in chrome, goes through it. |
| the floe, rim, Berth ticks, Bergs, snowballs, aim line | Plain canvas primitives in `cld.js` — not a shared or skinnable seam. |

**Skin readiness is stubbed but unused.** `cldSkinArt` exists in the seam so a future raster skin
could be slotted in, but it is an empty object for the whole of v1 and there is no `cldPreloadArt()`
call. `cld` is not in `data/art/registry.json` and never appears in the Terminal.

**First canvas render seam in the suite.** The *rule* the seam serves — every pixel of the primitive
produced in exactly one place — is unchanged and binding; only the "returns a DOM node" shape of the
checklist's seam contract does not apply. Recorded as a deviation in the tech spec §17.

**How to Play's "The Floe" tab (SW v221)** doubles as the pose reference — **The Cast**, all six
`pose(state, t)` states drawn through `cldRenderPenguin` — alongside a live practice sim of the
real physics. It is not a *card* gallery (there are no cards) and the tiles are procedural, so they
are not tap-to-enlarge and do not double as an offline-install check. Tap-hold on a penguin in
play is still deliberately idle — a penguin is not a card (the documented Tap-Hold Reference
exception).

---

## T10 — At the Table · *derived — except the PTP judgement*

**Modes.** Multi-device only (MDLM). Every player uses their own phone; one hosts, the rest join
with a room code. No pass-the-phone or shared-device option in v1.

**Players.** 3 to 8. Peck Off forces exactly 2.

**Devices.** One per player — the whole game is built on everyone aiming secretly and committing
simultaneously, which a shared screen cannot do. The committed aim is routed to the host over the
**private channel** (`mpSendPrivate`), never the public feed, because a rival who could read another
player's aim off Firebase would win every Slide silently.

**Shape-changing settings.** **Peck Off** — it forces the room to exactly two players. Nothing else
alters the player count or session structure (Fish to Win changes how *long* a Match runs, not its
shape).

**How it plays at each size**

| Players | What it feels like |
|---|---|
| **2 (Peck Off)** | A duel with two penguins each. Tighter and more deliberate — you are managing a pair, and you are only out when *both* of yours are in the Drink. Balance work was lighter here than at the mid sizes. |
| **3** | Thin. Few enough penguins that a single well-read shove decides a Slide, and the rim fills slowly. Least-tested of the free-for-all sizes. |
| **5–6** | The intended game. Enough penguins that the resolve is genuinely chaotic and you reliably hit someone you did not aim at, and enough Drowned at the rim for Snowballs to matter. |
| **8** | The rim is crowded and the shunt works hard — Berths cluster full and a plunge can bounce several Berths out. More waiting per Slide, since all eight must lock in before anything moves. Nothing is tuned toward the mid sizes' precision (brief Decision 17). |

**Could it be Pass-the-Phone?** — ◇ *judgement, not spec*

**Designed in the brief and deferred, not ruled out.** The blind simultaneous commit is the
mechanic, and a single phone passed around would serialise that into a turn order where the last
player to aim knows what everyone else did. A PTP version would need the two gate screens the brief
describes and **no change to the resolution model** — the host-authoritative timeline already works
for a single device. It is a delivery option for later, not a gap in v1.

---
