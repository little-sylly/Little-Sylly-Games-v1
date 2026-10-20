# Arcade Brief E — FORTY WINKS (Counting Sheep's world)

> **How to use:** paste `arcade-cabinet-prompt.md` first, then this brief. This brief answers Step 1
> of the prompt, so go straight to Step 2. The prompt's rules win any conflict; this brief owns the
> design.

| | |
|---|---|
| Title (`FWK_TITLE`) | FORTY WINKS |
| id / file / screen | `fortywinks` · `js/arcade/fortywinks.js` · `screen-arcade-fortywinks` |
| Prefix | `fwk` / `FWK_` |
| Terminal label | FORTY WINKS |
| Ancestor | one-tap timing (the Chrome dino game, Flappy-style single input) |
| World | Counting Sheep (`shp`, game 15) |
| Target run | 1.5–3 minutes, 1–3 Nights |

**Reserved by sibling briefs being built in parallel:** `csh trc riu wic`. Don't take them.

---

## 1. Pitch

You're trying to stay awake, so you count sheep, one at a time, as they jump the fence. **Tap to
jump** the sheep at the fence. Time it right and the Herd ticks up. Time it wrong and the sheep bonks
the fence, and you yawn. Three yawns and you've nodded off. Every 99 sheep earns a Moon, and the next
Night comes in faster.

## 2. Why it belongs to Counting Sheep

Counting Sheep takes the bedtime ritual literally: the count is **the Herd**, the ceiling is **99**,
and losing means you **doze off**. FORTY WINKS keeps all of that, plus the Big Bad Wolf, the Black
Sheep (which snaps the Herd to 99), Alarms that wake you up, Moons, and **Dream Acceleration** (below
50, every sheep counts double, the exact rule from the card game).

---

## 3. The world: borrow exactly this

**Palette** (picture-book midnight: this replaces the house CRT green):

```js
const FWK_MIDNIGHT = '#3A3D52',  // Counting Sheep brand (sampled from its card art)
      FWK_SKY_DEEP = '#262838',  // top of the sky
      FWK_HILL     = '#4B4F6B',  // far hills
      FWK_HILL_NEAR= '#565B7A',  // near hill / ground
      FWK_MOON     = '#FFF4D6',  // moon, stars, text
      FWK_WOOL     = '#F5F2EA',  // sheep wool
      FWK_WOOL_SH  = '#D9D4E8',  // lavender wool shading
      FWK_FACE     = '#3A3D52',  // sheep faces / legs
      FWK_BLACKSHP = '#2E2E38',  // Black Sheep wool
      FWK_FENCE    = '#C9A27E',  // fence wood
      FWK_FENCE_SH = '#8C6A4F',
      FWK_WOLF     = '#6B7280',  // Big Bad Wolf
      FWK_EYES     = '#FDE68A',  // wolf eyes glint
      FWK_ALARM    = '#E63946',  // alarm clock
      FWK_LID      = '#1A1B26';  // closing eyelids
```

**Type.** Bold monospace in moon-cream with a soft glow. Nothing harsh.

**Vocabulary:**

| Term | In this cabinet |
|---|---|
| **The Herd** | the running count, shown big. 0–99 per Night |
| **Night** | one stretch to 99 |
| **Moon** | earned at 99. The Herd resets and the next Night starts |
| **Yawn** | a mistake. 3 yawns = dozed off |
| **Dozed Off** | run over |
| **Pasture** | the ordinary sheep |
| **Black Sheep** | snaps the Herd straight to 99 |
| **Big Bad Wolf** | don't jump it |
| **Alarm** | a pickup that wakes you up (removes a yawn) |
| **Dream Acceleration** | below 50, every sheep counts double |
| **Lights Out** | the Play button |

**Voice.** Soft, dreamy and cosy, even under pressure. **On theme:** a picture-book illustration,
plush and pillowy. **Off theme:** anything genuinely scary. Dozing off is a soft, funny beat, never a
punishment. The wolf is a cartoon sneak, not a threat.

---

## 4. How it plays

### The scene

A moonlit pasture seen side-on. A **wooden fence** stands at `x = 230`, about 46 px tall, on the
ground line at about y = 470. Sheep trot in from the left towards the fence and, once over, carry on
off to the right. The big **Herd** number hangs in the sky. The moon climbs the sky as the Herd
approaches 99.

**Eyelids:** dark arcs closing in from the top and bottom of the screen. This is the lives display:
0 yawns = open, 1 = 18% closed, 2 = 32% closed and drowsy, 3 = they meet → **Dozed Off**.

### The one input

**Tap anywhere: the front sheep jumps.** The front sheep is the nearest one to the fence that hasn't
jumped yet. One tap, one jump. Space bar or click works too.

- **Jump:** a fixed parabola about 110 px long and 70 px high, landing well past the fence.
- **Clear window:** takeoff `x` between `fenceX − 95` and `fenceX − 30`. Inside it, the sheep sails
  over: **+count**, a little "baa" and sparkle.
- **Too early or too late:** the sheep **bonks** the fence with a comic boing and stars, plus a
  **Yawn**. It sits for a second, shakes its head, then trots back off-screen left. (It's not counted
  and doesn't come back.)
- **Never tapped:** a Pasture sheep that reaches the fence just bonks. That's a Yawn too.
- **Mashing:** tapping with no sheep in the window still jumps the front sheep early, so it bonks.
  Mashing doesn't pay.

### What trots in

| Kind | Chance | Count | Notes |
|---|---|---|---|
| **Pasture sheep** | 68% | +1 | the regular |
| **Woolly sheep** | 15% | +2 | rounder, fluffier |
| **Big Fluffy** | 6% | +5 | slower trot, so its window comes later |
| **Black Sheep** | 1 per Night at most, from 30+ | **→ 99** | fast. Jump it and the Herd snaps to 99: **instant Moon** |
| **Big Bad Wolf** | 0% in Night 1, 8% from Night 2 | — | **don't jump it.** Untapped, it skulks to the fence, peers over, and slinks away. Jumped: *Wolf in the pen!* and a Yawn |

The wolf has to be **readable at a glance:** grey, pointy ears, a bushy tail, glinting yellow eyes, a
slightly crouched sneak-walk. It wears a scrap of wool on its head as a bad disguise. It's funny, not
scary.

**Dream Acceleration:** while the Herd is **below 50, every count doubles** (+1 counts as +2, and so
on). Show a small "×2" moon-glow next to the Herd. The first half of a Night flies by and the second
half is the tense bit, just like the card game.

### The Alarm (pickup)

When you have at least one Yawn, every ~18 s an **alarm clock** bobs in the air just above the fence.
Jump a sheep *through* it and it rings: **WIDE AWAKE!**, one Yawn removed, and the eyelids open a
notch.

### Nights

At **99 or more** the Night ends:

1. The Herd pops, a **Moon** is earned and flies to the Moons row (top right).
2. **NIGHT N BEGINS** interstitial (1.6 s) with a flavour line.
3. The Herd resets to 0. The pace goes up.

---

## 5. Tuning table (starting values)

| Night | Trot speed (px/s) | Gap between sheep | Wolves | Notes |
|---|---|---|---|---|
| 1 | 80 | 1.1–1.9 s | none | learn the rhythm |
| 2 | 94 | 0.95–1.7 s | 8% | the wolf arrives |
| 3 | 108 | 0.85–1.5 s | 10% | occasional close pairs |
| 4+ | +14 per Night (cap 170) | ×0.9 per Night (min 0.5 s) | 12% | pairs and triples |

Close pairs are two sheep 0.45 s apart: two quick taps, a nice skill moment. **Night 1 should take
about 60–75 s and be very hard to fail.**

---

## 6. Scoring

**Score = total sheep counted across the whole run** (the sum of every count actually added,
including Dream Acceleration doubling and the Black Sheep's jump to 99). Show it as `SHEEP 214` under
the Moons row. The leaderboard ranks by sheep counted, with the Moons shown beside each entry.

---

## 7. Screens and states

The prompt's state machine applies. Within `playing`: `nightIntro` (1.6 s) → `counting` → `moon`
(1.2 s) → `nightIntro`…, and `dozing` (eyelids close fully, Zzz floats up, 1.8 s) → `over`.

- **Attract:** the scene at rest. Sheep jump the fence on their own in a lazy loop, the moon glows,
  the title **FORTY WINKS** sits in the sky, and the button is **LIGHTS OUT**.
- **First run only:** a soft hint above the fence, *Tap when a sheep reaches the fence.* It fades
  after 3 clears.

---

## 8. Art: draw it, don't load it

Counting Sheep's own art is PNG card art, and a cabinet can't use it. Redraw the same picture-book
feeling in code:

- **Sheep:** a cloud of 6–8 overlapping wool circles (wool colour, lavender shading underneath), a
  dark oval face with two little ears and dot eyes, four stick legs with a trot cycle. Blink
  occasionally. During a jump the legs tuck up and the face looks determined. On a bonk: squash,
  stars, dizzy eyes.
- **Variants:** Woolly is rounder, Big Fluffy is 1.4× size with extra puffs, the Black Sheep has dark
  wool with a moon-cream face and a confident smirk.
- **Fence:** two posts and three rails, with a little wood grain and a soft moon highlight.
- **Sky:** a vertical gradient from deep sky to midnight, twinkling stars, two layers of rolling hills
  with gentle parallax drift, the moon rising with the Herd.
- **Eyelids:** smooth dark arcs with a soft inner edge, easing in over 300 ms per Yawn.
- **Particles:** sparkles on a clear, little Zzz letters drifting up when you're drowsy.

---

## 9. Sound map (`FWK_SOUND`): soft and lullaby-ish

| Moment | Beeps |
|---|---|
| `select` | 660 |
| `highScore` | 1046 |
| `jump` | 784, then 988 at +50 ms |
| `clear` ("baa") | 392, then 349 at +70 ms |
| `bonk` | 147 |
| `yawn` | 392, 330, 262, 196 (slow, 120 ms apart) |
| `wolf` | 110, 110 |
| `alarm` (WIDE AWAKE) | 1318, 1175 alternating ×4 |
| `blackSheep` | 523, 784, 1046 |
| `moon` (lullaby jingle) | 523, 659, 784, 659, 523 |
| `dozed` | 262, 220, 196, 165, 131 (very slow) |

---

## 10. Copy deck

```
FORTY WINKS
Stay awake. Count the herd.
LIGHTS OUT
Tap when a sheep reaches the fence.

NIGHT N BEGINS                        ← then one of:
The Flock is fresh and the Herd is at 0.
Pillows plumped, alarms wound.
A new count begins. Watch the fence, and don't drift.
Somewhere out there, a Big Bad Wolf is waiting.

Bonk. · Oof. · Baa-d timing. · Not quite.   ← bonk barks
×2 DREAM ACCELERATION                       ← small, beside the Herd while below 50
BLACK SHEEP! STRAIGHT TO 99
WOLF IN THE PEN!
WIDE AWAKE!
A MOON! 🌙                                  ← draw the moon; don't rely on an emoji glyph in canvas
DOZED OFF                                   ← run over
Zzz…
LAST ONE AWAKE                              ← name entry header
BEST NIGHTS                                 ← leaderboard heading
COUNT AGAIN  /  TIME TO SLEEP               ← again / menu
```

---

## 11. Build order

1. Scene (sky, hills, fence, ground), one sheep type trotting, tap to jump, the clear window, bonks,
   the Herd counter. Playable in the bench.
2. Yawns and eyelids, Dozed Off, Nights and Moons, Dream Acceleration, the tuning ramp.
3. Woolly, Big Fluffy, the Black Sheep, the Big Bad Wolf, the Alarm pickup.
4. Art pass (wool, trot cycle, wolf, moon rising, parallax, particles) and sound.
5. Attract loop, the leaderboard skin, then a full play-test of every state as the prompt requires.

## 12. Done when

- Night 1 is relaxing: a kid clears it on the first go and wants Night 2.
- The wolf is unmistakable at full Night 4 speed.
- A bonk is clearly *early* or *late*, so the player can tell which way to adjust.
- Dozing off feels sleepy and funny, never like being punished.
- The Herd never shows more than 99. Anything over rolls straight into the Moon.
