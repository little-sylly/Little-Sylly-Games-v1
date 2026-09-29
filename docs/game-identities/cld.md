# Cold Shoulder

**Game 19** · `activeGameId: cld` · plugin `js/games/cld.js` · shared module `js/lib/physics.js`
**Emoji:** 🐧 · **Brand:** glacier blue `#8ECAE6`, white ink · **Players:** 3–8 (Peck Off forces 2) · **Modes:** MDLM only
**Status:** gold master · verified against SW v219 on 4 September 2026 · Drowned model rewritten for SW v243 (28 September 2026) · pool-style cue + Practice Arena SW v244 (29 September 2026) · plugs in the Drink, a bigger floe + camera, Practice plans SW v245 (29 September 2026)

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

You are a penguin on a crowded slab of ice, and so is everyone else. Every round, all of you line
up a shot like a pool cue, lock it in, and then — all at once, nobody having seen
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

Getting knocked in is not the end of you. You go in through a gap in the ice ring, and a **Drowned**
penguin **plugs** the gap it went through — that is its **Berth**. The next penguin to hit it
bounces off, once, and knocks it back into the water; from there, every Slide, it either flings a
**Snowball** at a survivor's aim or **Dives** into any free gap and plugs that one instead. So the
floe is never quiet: it empties of standing penguins while the rim fills with spiteful ones, and the
two pressures pull against each other until one player is left.

What the game actually produces is a table of people over-committing to a shove, watching the ice
carry it somewhere they didn't intend, and howling. Nobody is ever really out. The worst thing that
happens in Cold Shoulder is you spend three Slides in the water throwing snowballs and calling it
strategy.

---

## T3 — How to Play · *free*

**Setup.** Everyone is one penguin on the same floe (two each in Peck Off). A **Match** runs until
someone reaches the **Fish to Win** target; each **Floe-Off** is one full contest on a fresh floe,
worth one Fish. A Floe-Off is a series of **Slides**.

**The loop.** Each Slide:

- **Aim.** Touch anywhere on the ice and pull back — your finger is the end of a pool cue, the shot goes the other way, and further back is a harder shove. Release to **arm** it. Re-aim as often as you like.
  Re-drag as often as you like.
- **Lock it in.** Tap **Lock It In** to commit. A commit is final — there is no taking it back.
- **The Slide.** Once every player has locked in, all penguins slide at once and the ice resolves
  every collision together. You will strike penguins you did not aim at.
- **Repeat** until one player is the last with a penguin **Standing**.
- **Hunger.** The longer a Floe-Off drags on, the **Hungrier** everyone gets: every few Slides, full
  power shoves further (reach grows fast — a stalemate cannot last). It starts fresh on every new
  floe, an Ice Bath included.

**Going in the Drink.** A penguin can only go in through a **gap** in the ice ring, and a penguin
whose centre crosses the edge is **Drowned** for the rest of that Floe-Off. It **plugs** the gap it
went through the instant it goes in — floating in the Drink right at the mouth of the gap, its back against the ice — mid-Slide, so a second penguin sliding at the same gap bounces
off the first one's bottom instead of following it in. That plug is its **Berth**:

- it is a **bumper** — a living penguin that hits it is shoved back *harder*, not saved — but only
  **once**: the penguin that hits it is rebounded, and the plug is **knocked back**, drifting further out,
  leaving the gap open;
- every Slide it may throw one **Snowball** at a standing penguin (stronger the closer it is);
- once **knocked back**, it chooses **Throw or Dive** each Slide — the Snowball, *or* a Dive into any
  free gap, which it plugs again. Dives land *before* the Slide, so a Dive can seal a gap before
  anyone slides at it; two Dives at one spot go to the closer penguin;
- if someone falls through the gap a knocked-back penguin is bobbing behind, it is **displaced** to
  the nearest free gap, plugged again. Every arrival plugs.

**Winning.** The last **player** with at least one penguin Standing takes the Floe-Off and **+1
Fish**. First to the Fish to Win target wins the Match and is the **Final Floe**. Shoving someone in
scores nothing — not off a rebound, not with a Snowball — so nobody can farm it.

**Washout → the Ice Bath.** If a Slide (or, under The Thaw, a melt step) leaves *no* penguin
Standing, nobody scores yet. The ones who went in at that step go straight into the **Ice Bath** — a
small floe with no ice ring, sized to them — and play it out as sudden death; everyone Drowned before
it keeps playing from the rim. Same Floe-Off, same Fish: the last one Standing in the bath takes it.
A Washout in the bath starts another bath, which can only be the same size or smaller.

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
| **Berth** | A Drowned penguin **Plugged** in a gap of the ice ring — the gap it went through, or the one it Dived or was displaced to. |
| **Plugged** | The Drowned state that blocks its gap from the water: floating just past the edge, an immovable, energetic bumper that absorbs **one** contact. |
| **Knocked back** | The Drowned state after that contact: drifted out past its gap, no longer a bumper, the gap open again. |
| **Snowball** | The single throw a Drowned penguin gets each Slide, aimed at a standing penguin to nudge their Slide off line. Stronger the closer it lands to the thrower. Also takes one hit off a Berg; does nothing to a plug. |
| **Dive** | A Knocked-back penguin's move into any free gap, *instead of* throwing that Slide (Throw or Dive). Resolves before the Slide; contested spots go to the closer penguin. Arrives Plugged. |
| **Resurface** | The reset of every penguin to Standing at the start of a Floe-Off. Never used for surfacing at a Berth. |
| **Washout** | A Slide or melt step that leaves nobody Standing. No Fish yet — it starts an Ice Bath. |
| **Ice Bath** | The sudden-death floe a Washout starts: the penguins that went in at that step, on a small ringless floe; same Floe-Off, same Fish. |
| **Fish** | The score. One per Floe-Off won; first to the Fish to Win target takes the Match. |
| **The Final Floe** | The gameover screen — the Match is decided. |
| **Berg** | A chunk of the ice ring round the edge (Ice Breaker setting) that rebounds a would-be plunge instead of letting it through, until it takes enough hits and **shatters**. |
| **Peck Off** | The two-player duel setting: two penguins each, and the room is forced to exactly two players. |
| **Hungry** | Every few Slides of a Floe-Off the penguins get hungrier and full power shoves further; the floe floats **HUNGRY!** as it bites. Starts fresh on every new floe. |
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
| **Aim Assist** | OFF / ON | ON | Draws your aim to the first contact: a ghost penguin where yours would touch, and a short line for which way a penguin you hit is pushed. One contact deep, never further. |
| **Ice Breaker** | 1 hit · 2 hits · 3 hits | 2 hits | Rings the edge with **Bergs** (about 80% of it, with 2–3 random gaps a penguin can slip through) that rebound a plunge until they take that many hits and shatter. Under The Thaw the ring calves as it shrinks. No Off: without the ring a Floe-Off is over in a couple of Slides (SW v242). |
| **Peck Off** | OFF / ON | OFF | A two-player duel, two penguins each. Turning it on forces the room to exactly two players. |
| **✨ Sylly Mode (The Thaw)** | OFF / ON | OFF | The floe melts and shrinks after every Slide. See T8. |

**Dynamic value lines.** Ice Conditions and Floe Size both carry a live descriptor line under the
pill row, because their thematic labels deliberately hide the concrete value. Ice reads e.g.
*"Slush — a full pull carries you about half the floe."*; Floe reads e.g. *"Standard — comfortable
for 6."* (it carried a Berth count until SW v243, when Berths stopped being rim slices). Both
repaint from `cldSyncSettingsUI()` and from the pill click handler.

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
| `cld-how-to-overlay` | Menu, floe `[?]`, scoreboard `[?]` | How to Play — **3 tabs**: *The Rules*, *Practice* (the Arena: three drills — Sylvia and Sam each follow the drill's plan every Slide, played as a real Floe-Off to one player left) and *The Cast* (the six poses) |
| `cld-quit-overlay` | Floe, scoreboard ✕ | Mid-game quit confirm |
| `cld-new-game-overlay` | Gameover | Play-again confirm |

There is **no tip overlay** — How to Play is the only reference surface (brief §15). Since SW v245
its **Practice** tab is the Arena: You, Sylvia and Sam on a fresh floe. Sylvia and Sam each follow the
drill's plan every Slide — their next shoves drawn before you move — and a round is a real Floe-Off, Ice
Bath and all, played to one player left. It runs on the real rules, is drawn by the floe's own renderer,
and has a coach that reacts to what happens, counting Slides. **The Cast** shows the six penguin poses (Idle · Lean · Squash · Plunge · Bob ·
Throw), each drawn through the same seam the floe uses. The
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

Header is built at runtime as *"Floe-Off N · Slide M"* (*"Floe-Off N · Ice Bath · Slide M"* in a bath).
The Throw · Dive pills show only to a player with a Drowned penguin; for a Peck Off player who still
has one Standing, *Throw* reads *Aim*. On a Washout the tally line reads *"Nobody made it. Into the
Ice Bath with {names}."*, the floe floats **WASHOUT!**, then **ICE BATH!** as the bath starts.
Every few Slides the floe floats **HUNGRY!** (with a 🐟❗ bubble over every Standing penguin) — Hunger,
SW v245. Each Hunger level also shows on the penguins' faces (SW v246): a frown now and then, then all
the time, then a huff and a stamp, then angry, then fire in the eyes, then a glow in the player's colour
that grows until the Floe-Off ends. A Drowned penguin keeps its own face.

```copy
# screen-cld-floe — controls
Throw
Dive
You can Dive once you’re knocked back.
Every gap is taken — nowhere to Dive.
Tap to lock power
Power locked — tap to release
Too soft
Power
Lock It In
Sliding…
```

#### Floe-Off result

Heading and sub are built at runtime (*"{name} is the last one dry."* on a win). The plunge list is
fixed. Since SW v243 a Washout never reaches this screen — it starts an Ice Bath on the floe — so the
Washout lines here are a fallback only.

```copy
# screen-cld-result
Washout!
That’s a Fish. 🐟
Nobody made it. Into the Ice Bath with
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

#### Barks over the floe (SW v246)

A bounce off a plug barks **Boing!**. The barks are chunky white outlined text, drawn over the water.

```copy
# screen-cld-floe — barks
Boing!
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
Draws your aim to the first thing you'd hit — a ghost where you touch, and which way they'd go.
Ice Breaker
Puts chunks of ice near the edge that bounce you back instead of dumping you in — until they shatter.
1 hit
2 hits
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
Pull back to aim, like a pool cue
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
# cld-how-to-overlay — tabs (SW v244)
The Rules
Practice
The Cast
Every pose the penguin strikes on the ice, and the moment it means.
```

```copy
# cld-how-to-overlay — Practice (the Arena, SW v245)
Head-on
Crossfire
Edge
Tap to lock power
Power locked — tap to release
Too soft
Lock It In
Sliding…
Start over
Practice again
Got it
```

```copy
# CLD_PR_COACH — the Practice coach (js/games/cld.js)
Sylvia and Sam are coming straight for you — every Slide, full power. Dodge them, or meet them.
Sylvia and Sam only want each other, and you’re in the middle. Get out of the way — or use it.
They’ll try to cut you into the nearest gap. Keep ice between you and the water.
Touch anywhere and pull back — the shot goes the other way.
The dots show your first hit. Tap Power to lock it, then Lock It In.
Same plan every Slide. Read it, and counter it.
You’re in the Drink, plugging the gap you went through. The next penguin to hit you bounces off harder. Tap the ice to aim a Snowball.
Knocked back — now it’s Throw or Dive. Dive into a free gap to plug it again.
{Name}’s in the Drink — a plug now. Hit it and you bounce back harder.
Everyone went in at once — into the Ice Bath. Last one dry still wins.
Last one dry — that’s a Fish.
{Name}’s the last one dry. Practice again, or try another drill.
Nobody’s budging. Call it a draw.
Hungry! From here on every shove goes further — pull back a little less.
```

```copy
# The Cast — pose tiles (built from CLD_HOWTO_CAST in js/games/cld.js)
Idle
Wind-up
Belly-slide
Squash
Plunge
Plug
Knocked back
Throw
Win
```

```copy
# The Cast — faces (built from CLD_HOWTO_FACES in js/games/cld.js)
Faces
Happy
Focus
Strain
Shock
Grumpy
Dizzy
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
  never stranded off the ice. Plugs are fixed: a chunk squeezed into a plug calves, and of two plugs
  a shrink pushes together, the later-seated one is knocked back.
- **Standing penguins are not moved.** Any Standing penguin left outside the new radius plunges
  immediately, as its own `thaw-drop` beat in the aftermath, and plugs the free gap nearest it. The ice visibly calves out from under
  you — and you can see the rim closing and choose to move in.
- The floe cracks audibly on each shrink (`playAbyssThud`).

**What it does to the match.** A melt step can end a Floe-Off on its own — by dropping all but one
penguin (that player wins) or by dropping everyone left (a Washout, which starts an Ice Bath of the
penguins the melt took). As the ring tightens there are fewer free gaps to plug and to Dive into. No
rule's *behaviour* changes — The Thaw is a geometry rule, not a rules rule, which is exactly why it
composes cleanly with Peck Off and Ice Breaker.

**Recorded intent (not blocking).** The owner intends to demote The Thaw to a normal setting later
and give Cold Shoulder a Sylly Mode that changes what the game *is* rather than how fast it runs.
Ships as-is for v1.

---

## T9 — Art & Assets · *derived*

**Cold Shoulder ships with no art files at all — zero bytes of art, no core art pack, no skin pack.**
Everything is drawn at runtime by a game-owned, pure art module, `js/games/cld-art.js` (SW v246,
`window.CldArt`, ~62 KB, precached, loaded before `cld.js`). Like DYB's dice (`dyb-dice.js`, SW v241)
it draws what it is given and reads no game state; every drawing entry point is a no-op without a DOM,
so the rules harnesses load it freely. CLD needs no core art pack, for the same reason DYB's dice don't.

**The look is the sticker's: inked watercolour.** Chubby upright penguins — a tinted wash pooled at the
edges, paper grain, an ink outline, a cream belly, a pale face mask, blush, an orange beak and feet — in
each player's colour, standing on their footprint (the collision circle) with a soft shadow and an owner
ring. A snow-slab floe (lit mounds, wind drifts, carved cracks, a bevelled rim) that keeps the story of
the Floe-Off — every belly-slide cuts a groove, every open-ice Snowball leaves a splat, and a Thaw
repaints the surface with its marks kept. Ice-cube chunks that crack per hit. A moving Drink (wavelets,
glints, a foam collar, far-off floes). Particles: snow spray, puffs and stars, splashes and rings, shards.

| | |
|---|---|
| **Nine poses** | idle, aim (the wind-up), slide (a belly-slide, seen from behind), squash, plunge, bob (a plug), back (Knocked back), throw, win |
| **Six faces** | happy, focus, strain, shock, grumpy, dizzy |
| **The Hunger ladder** | a mood over the face, one rung per Hunger level: a frown now and then → all the time → a huff and a stamp → angry → fire in the eyes → a glow in the player's colour that grows. A Drowned penguin keeps its own face |

| Render seam | What it draws |
|---|---|
| `cldRenderPenguin(ctx, pose, colourIdx, x, y, r, opts)` → `CldArt.penguin` | **The one penguin primitive.** Draws to a canvas context and returns nothing — a canvas game has no DOM node to return. Every penguin pixel, in play and in chrome (the tally heads, the scoreboard and result avatars, the podium, the menu and intro art, the Cast), goes through it. |
| `cldDraw(view, m)` over `CldArt` | The scene, fed only by the render model: the Drink, the floe, the chunks, Snowballs in flight, particles, and every aim and target mark in its owner's colour. Not a skinnable seam. |

**Budgets:** the floe surface is painted once per floe into an offscreen canvas ≤ 1,200 px square; the
particle cap is 420 per view; every canvas caps DPR at 2. Reduced motion is honoured in JS: the camera
cuts, the water and foam freeze, nothing travels, idle breathing stops.

**Skin readiness is stubbed but unused.** `cldSkinArt` stays an empty object in the seam, so a future
raster skin could still override a pose without a seam rewrite. `cld` is not in `data/art/registry.json`
and never appears in the Terminal.

**First canvas render seam in the suite.** The *rule* the seam serves — every pixel of the primitive
produced in exactly one place — is unchanged and binding; only the "returns a DOM node" shape of the
checklist's seam contract does not apply. Recorded as a deviation in the tech spec §17.

**How to Play's The Cast** shows the nine poses and six faces drawn through `cldRenderPenguin`.
**Practice** draws the Arena through the floe's own renderer (`cldDraw` fed `cldArenaModel()`), so nothing
in it is a hand-built copy. Both are procedural, so neither is tap-to-enlarge nor an offline-install check.
Tap-hold on a penguin in play is still deliberately idle — a penguin is not a card (the documented
Tap-Hold Reference exception).

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
| **8** | The rim is crowded — gaps plug fast, knock-backs are frequent, and Dives compete for the few free gaps. More waiting per Slide, since all eight must lock in before anything moves. Nothing is tuned toward the mid sizes' precision (brief Decision 17). |

**Could it be Pass-the-Phone?** — ◇ *judgement, not spec*

**Designed in the brief and deferred, not ruled out.** The blind simultaneous commit is the
mechanic, and a single phone passed around would serialise that into a turn order where the last
player to aim knows what everyone else did. A PTP version would need the two gate screens the brief
describes and **no change to the resolution model** — the host-authoritative timeline already works
for a single device. It is a delivery option for later, not a gap in v1.

---
