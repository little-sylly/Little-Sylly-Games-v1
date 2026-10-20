# Arcade Brief A — COLD SHOT (Cold Shoulder's world)

> **How to use:** paste `arcade-cabinet-prompt.md` first, then this brief. This brief answers Step 1
> of the prompt, so go straight to Step 2. The prompt's rules win any conflict; this brief owns the
> design.

| | |
|---|---|
| Title (`CSH_TITLE`) | COLD SHOT |
| id / file / screen | `coldshot` · `js/arcade/coldshot.js` · `screen-arcade-coldshot` |
| Prefix | `csh` / `CSH_` |
| Terminal label | COLD SHOT |
| Ancestor | flick physics: pool, crokinole, Globulos solo |
| World | Cold Shoulder (`cld`, game 19) |
| Target run | 2–3 minutes, about 4–6 Floe-Offs for a decent player |

**Reserved by sibling briefs being built in parallel:** `trc riu wic fwk`. Don't take them.

---

## 1. Pitch

Pull back like a pool cue and shove the other penguins into the Drink before the floe melts out from
under you. Each Floe-Off is a little puzzle with two or three penguins. The run is how many Floe-Offs
you can win in a row.

## 2. Why it belongs in Cold Shoulder's world

It's Cold Shoulder's Practice Arena turned into a score-attack run. It uses the same pull-back cue,
the same ghost-penguin aim, the same "everyone slides at once" resolve, the same plugs and Bergs, and
the same slapstick. A player who learns it here already knows how to aim in the party game.

---

## 3. The world: borrow exactly this

**Palette.** This cabinet replaces the house CRT palette:

```js
const CSH_GLACIER = '#8ECAE6',  // Cold Shoulder brand
      CSH_ICE     = '#F4FAFD',  // floe surface
      CSH_ICE_SH  = '#CFE6F2',  // floe shadow / drifts / grooves
      CSH_DRINK   = '#2E5E7E',  // the water
      CSH_DRINK_D = '#1F4560',  // deeper water / wavelets
      CSH_INK     = '#1F2A36',  // outlines, text stroke
      CSH_CREAM   = '#FFF6E5',  // penguin belly
      CSH_BEAK    = '#F4A259',  // beak + feet
      CSH_BLUSH   = '#F7A8B8',
      CSH_WHITE   = '#FFFFFF';  // bark text fill
const CSH_YOU = '#E63946';                                   // your penguin
const CSH_RIVALS = ['#00B4D8', '#52B788', '#9B5DE5', '#FFB703'];
```

**Type.** Bold monospace like every cabinet, but in Cold Shoulder's bark style: chunky **white text
with a 4 px ink outline**, drawn over the scene. No green CRT text anywhere.

**Vocabulary.** These are naming rules, not suggestions:

| Use | Meaning | Never |
|---|---|---|
| **Floe-Off** | one level: a fresh floe | level, stage, round |
| **Slide** | one shot: aim, lock, everyone slides | turn, shot, round, Night, Raid |
| **the Drink** | the water, as a *state* ("into the Drink") | the sea |
| **Drowned** | a penguin that went in. It's still around, bobbing | dead, eliminated, out |
| **Plug / Plugged** | a Drowned penguin blocking the gap it went through | |
| **Knocked back** | a plug that got hit once and drifted off, so the gap is open again | |
| **Berg** | a chunk of the ice ring that bounces you back until it shatters | wall |
| **Standing** | still on the ice | alive |
| **Hungry** | every few Slides, shoves go further | |
| **The Thaw** | the floe shrinks after every Slide | |
| **Fish** | one per Floe-Off won | |

**Rival names**, used in this order: Sylvia, Sam, Shirley, Jeff, Chillbert, Waddles, Fishstick,
Flipper, Slushie. **Never "Snowball"**: that's the thing that gets thrown.

**Voice.** Dry, Australian and short. If a line couldn't be read aloud while a penguin is in the air,
it's too long.

**On theme:** cold blues, a bright horizon, comic weight. A plunge is a *splash*: a water-slap, a
ring and some bubbles, then the penguin bobs straight back up looking annoyed.
**Off theme:** any real jeopardy. No predators, no ice cracking as horror, no distress, no drowning
imagery.

---

## 4. How it plays

### The floe

A round floe centred at about (180, 330), radius `R0` from the tuning table. **Bergs** cover about 80%
of the rim, leaving **2–3 gaps** (wedge openings about 44° wide). The Drink fills everything else.
Your penguin and the rivals start at seeded positions spread evenly across the floe, at least
`2.5 × r` apart.

### One Slide

1. **Plans show** (from Floe-Off 2 on). Each *Hungry* rival shows a dotted arrow for the shove it will
   make this Slide, picked before you aim, just like Cold Shoulder's Practice drills. *Sleepy*
   rivals have a little "z z" and don't move.
2. **Aim.** Touch anywhere on the stage and pull back. The shot goes the opposite way, and pull length
   is power (`CSH_MAX_PULL = 140` logical px). While dragging, draw a **ghost penguin** at the first
   contact plus a short line for which way the hit penguin is pushed. That's one contact deep, never
   further, and always on: it's Cold Shoulder's Aim Assist. Your penguin plays the wind-up pose.
   Releasing **arms** the shot. Re-dragging replaces it.
3. **LOCK IT IN** (a big button at the bottom, ≥ 64 px tall, greyed until a shot is armed). All
   penguins slide at once: your shove and every rival's plan.
4. **Resolve.** Simulate until every speed drops below a small threshold, capped at 4 s.
5. **The Thaw.** The floe shrinks by `thawStep`, with an audible crack and a visible contraction from
   the old rim to the new one over 0.4 s. Any Standing penguin left outside the new rim plunges in
   its own beat ("thaw-drop") and plugs the nearest free gap. Bergs ride the rim inward.
6. **Check.**
   - All rivals Drowned and you Standing: **Floe-Off won** → "That's a Fish." → next Floe-Off.
   - You Drowned: **lose a Try**. The same Floe-Off restarts fresh (*Resurface*: everyone back on the
     ice at the starting positions).
   - Otherwise: next Slide.

### The rim

- **Gap:** a penguin whose centre crosses the rim inside a gap **plunges**: a short arc, a splash
  ring and a bark. It becomes **Plugged** in that gap, floating at the mouth with its back to the
  ice. **A plug is an immovable bumper.** The first penguin to touch it bounces back *harder*
  (restitution 1.3) with a **"Boing!"** bark, and the plug is then **Knocked back**: it drifts 30 px
  outwards and the gap is open again. Knocked-back penguins just bob about grumpily.
- **Berg:** a penguin crossing the rim at a Berg rebounds (restitution 0.8) and the Berg takes a hit,
  showing a visible crack. After `bergHits` hits it **shatters** into shards and becomes a new gap.

### Hungry

Every 3 Slides within a Floe-Off, max shove distance goes up ×1.15 (stacking) and **HUNGRY!** floats
over the floe, so a stalemate can't last. It resets on every new Floe-Off.

### Snowballs (Floe-Off 5 onwards)

Each Drowned rival (plugged or knocked back) throws one Snowball at you per Slide. It lands as a small
nudge (15% of a full shove, in a random-ish direction away from the thrower) *before* the slide. Show
it as a white arc that ends in a splat on the ice. It's comedy pressure, not punishment.

### Physics (write your own: the cabinet can't touch `js/lib/physics.js`)

- Penguin = circle, `r = 16`. All penguins have equal mass.
- **Fixed sub-steps** of 1/120 s inside the loop's dt, so it's deterministic and stable.
- **Friction:** constant deceleration. Pick `D` = how far a full-power shove travels (start at
  `1.0 × R0`, the "Slush" feel from Cold Shoulder). Then `v0 = power × sqrt(2 × a × D)` with
  `a = CSH_DECEL`. Choose `CSH_DECEL` so a full slide lasts about 1.2 s.
- **Penguin–penguin:** equal-mass impulse along the normal with restitution 0.92, plus positional
  correction so they never overlap. Squash pose for 80 ms on contact.
- **Rival AI** (picks its plan before you aim):
  - *Sleepy:* doesn't move.
  - *Hungry:* aims at you (70%) or tries to cut you towards the nearest open gap behind you (30%),
    at power 0.55–0.85. Never aims straight into a gap itself.

### Tries and Ice Bath

- **3 Tries**, shown as three small penguin heads in your colour, top right. At 0 the run is over.
- **Washout** (stretch goal): if you and the last rival go in on the same Slide, show "WASHOUT!" →
  "ICE BATH!". You both go to a tiny ringless floe for sudden death, and whoever is last Standing
  wins that Floe-Off. Without the stretch, a Washout simply costs a Try.

---

## 5. Tuning table (starting values)

| Floe-Off | Rivals | Behaviour | Gaps | `R0` | `thawStep` | `bergHits` |
|---|---|---|---|---|---|---|
| 1 | 1 | Sleepy | 3 | 150 | 6 | 2 |
| 2 | 2 | 1 Hungry, 1 Sleepy | 3 | 150 | 8 | 2 |
| 3 | 2 | 2 Hungry | 2 | 140 | 8 | 2 |
| 4 | 3 | 2 Hungry, 1 Sleepy | 2 | 140 | 10 | 2 |
| 5+ | 3 (4 from 7) | all Hungry, and Snowballs | 2 | 130 | 10 | 3 |

The floe never shrinks below radius 70. **Floe-Off 1 must be winnable in ≤ 3 Slides by someone who
has never played.**

---

## 6. Scoring

| Event | Points |
|---|---|
| Rival into the Drink | 100 |
| Floe-Off won (a Fish) | 300 |
| Floe left over | `(radius − 70) × 2` |
| **DOUBLE DIP!** (2+ rivals in on one Slide) | +200 |
| **BANK SHOT!** (a rival goes in after a Boing off a plug) | +150 |

The HUD shows points plus a little fish counter. The leaderboard ranks by points.

---

## 7. Screens and states

The prompt's state machine applies: `attract → playing → over → nameEntry → leaderboard`. Within
`playing`, these phases run on the game clock: `intro` (1.6 s) → `aiming` → `sliding` → `thaw` →
`won` (1.4 s) or `tryLost` (1.4 s).

- **Attract:** the title drawn big in bark style over a floe with three idle penguins breathing and an
  occasional Boing. Play button: **HIT THE ICE**. Small line under it: *Pull back to aim. Last one
  dry gets the Fish.*
- **HUD:** top left *FLOE-OFF 3 · SLIDE 2*, top centre the points, top right the Tries. The bottom
  bar has a power meter (fills while dragging) and **LOCK IT IN**.
- **Coach lines (Floe-Off 1 of the first run only),** in a soft banner above the button:
  *Touch anywhere and pull back — the shot goes the other way.* → once armed: *Lock It In to slide.*

---

## 8. Art: draw it, don't load it

Aim for "recognisably the same penguin as Cold Shoulder", not pixel parity. **If the chat can see the
repo**, it may lift drawing code from `js/games/cld-art.js` into `csh`-prefixed copies, with no
runtime dependency on `CldArt`. Otherwise draw it fresh:

- **Penguin:** a chubby upright ellipse in the player colour with a darker wash pooled at the edges
  (a radial gradient) and a 2 px ink outline. Cream belly oval, pale face mask, dot eyes, orange beak
  triangle and feet, blush. A soft shadow on the ice and an owner ring underneath.
- **Poses:** idle (gentle breathing), **wind-up** (leans back while you aim), **belly-slide**
  (horizontal while moving fast), **squash** (contact), **plunge** (arc and splash), **bob/plug**
  (head and back at the gap, grumpy face), **knocked back** (smaller, drifting, dizzy), **win**
  (flippers up).
- **Faces:** happy, focus (aiming), shock (hit), grumpy (Drowned), dizzy (knocked back).
- **Floe:** a white slab with a bevelled blue-shadow rim, a few carved cracks, and a groove left by
  every belly-slide. Paint the floe to an offscreen canvas and redraw it only when it changes.
- **Bergs:** chunky ice cubes round the rim, cracking once per hit, then shattering into shards.
- **The Drink:** moving wavelets and a foam collar round the floe.
- **Particles:** snow spray when a slide stops, splash rings, shards. Cap at about 200.

---

## 9. Sound map (`CSH_SOUND`)

| Moment | Beeps |
|---|---|
| `select` | 660 |
| `highScore` | 1046 |
| `aimStep` (each 20% of power while dragging) | 440 → 880 rising |
| `lock` | 587 |
| `slide` | 220 |
| `bump` | 330 |
| `boing` | 784, then 988 at +70 ms |
| `bergCrack` / `bergShatter` | 196 / 147, 110 |
| `plunge` | 523, then 262 at +90 ms |
| `thaw` | 98 |
| `hungry` | 880, 880 |
| `fish` (jingle) | 523, 659, 784, 1046 |
| `tryLost` | 392, 330, 262 |

---

## 10. Copy deck

```
COLD SHOT
Shove first, apologise never.
HIT THE ICE
Pull back to aim. Last one dry gets the Fish.

FLOE-OFF N                       ← then one of:
Brace for the Slide…
Find a gap. There isn't one.
Shove first, apologise never.
The ice is fine. Probably.
Last one dry gets the Fish.

LOCK IT IN · Sliding… · Too soft
Plunge barks: Into the Drink! · See you at the bottom. · That'll be cold. · Straight in.
              Off you pop. · Didn't see that coming. · Well, that's that. · Splash.
Boing! · HUNGRY! · DOUBLE DIP! · BANK SHOT! · WASHOUT! · ICE BATH!
That's a Fish.                   ← Floe-Off won
Back on the ice.                 ← Try lost, Resurface
EVERYONE BACK TO THE WATER.      ← run over
LAST ONE DRY! ENTER YOUR INITIALS
THE STANDINGS                    ← leaderboard heading
MARCH ON  /  WADDLE OFF          ← again / menu
```

---

## 11. Build order

1. Floe, one penguin, pull-back aim, slide with friction. Playable in the bench as a sandbox.
2. Penguin collisions, one Sleepy rival, gaps and plunges, winning and losing a Floe-Off.
3. Bergs, plugs (one Boing, then knocked back), The Thaw with visible contraction.
4. The run: Tries, the tuning table, scoring, barks.
5. Art pass (poses, faces, floe, water, particles) and sound.
6. Hungry rivals with telegraphed plans, the Hungry ramp, Snowballs from Floe-Off 5.
7. The leaderboard in Cold Shoulder's skin, then a full play-test of every state as the prompt
   requires.

Stretch: Ice Bath on a Washout.

## 12. Done when

- Floe-Off 1 is cleared in 3 Slides or fewer by a first-time kid.
- You can aim with one thumb from anywhere on the stage, and the page never scrolls during a drag.
- Every rival's plan is readable *before* you aim, and the slides are resolved simultaneously, not in
  turns.
- A plug Boings exactly once, then its gap is open.
- A typical run of 4–6 Floe-Offs lasts 2–3 minutes.
- The words "dead", "eliminated", "the sea" and "lives" never appear.
