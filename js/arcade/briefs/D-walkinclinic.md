# Arcade Brief D — WALK-IN CLINIC (Group Therapy's world)

> **How to use:** paste `arcade-cabinet-prompt.md` first, then this brief. This brief answers Step 1
> of the prompt, so go straight to Step 2. The prompt's rules win any conflict; this brief owns the
> design.

| | |
|---|---|
| Title (`WIC_TITLE`) | WALK-IN CLINIC |
| id / file / screen | `walkin` · `js/arcade/walkin.js` · `screen-arcade-walkin` |
| Prefix | `wic` / `WIC_` |
| Terminal label | WALK-IN CLINIC |
| Ancestor | Whack-a-Mole |
| World | Group Therapy (`gth`, game 9) |
| Target run | exactly 60 s (one Session), plus intro and summary |

**Reserved by sibling briefs being built in parallel:** `csh trc riu fwk`. Don't take them.

---

## 1. Pitch

A circle of chairs, a very busy shrink, and worries popping up faster than you can see them. Tap each
worry to **diagnose** it before it ducks away. Leave the Happy Thoughts alone, because you can't
diagnose happiness. The Session lasts sixty seconds: see as many patients as you can.

**The kid twist:** you aren't whacking anything. A diagnosed worry *relaxes*: it smiles, lets out a
sigh-puff and floats off. Every tap helps someone.

## 2. Why it belongs to Group Therapy

Group Therapy is everyday worries drawn badly and then diagnosed against the clock. WALK-IN CLINIC is
the Shrink Phase as a reflex game. It uses the same deadpan clinical voice, the same "everything
looks thumb-drawn" scribble art, the same Symptom Severity tiers and the same fastest-diagnosis
bonus.

---

## 3. The world: borrow exactly this

**Palette** (an intake form: this replaces the house CRT green):

```js
const WIC_PAPER = '#F5F1E6',  // intake-form cream, the background
      WIC_RULE  = '#E3DCC8',  // faint form lines
      WIC_SAGE  = '#B1BCA0',  // Group Therapy brand
      WIC_SAGE_D= '#7F8C6E',  // darker sage for fills / chairs
      WIC_INK   = '#2F3A2F',  // scribble ink, text
      WIC_STAMP = '#C8553D',  // "DX" diagnosis stamp
      WIC_SUN   = '#FFD166',  // Happy Thoughts
      WIC_BLUSH = '#F2B5A7';
```

**Type.** Bold monospace for the HUD, styled like typed fields on a form. In-scene labels can be a
slightly wobbly hand-lettered look, drawn by jittering the baseline of monospace text.

**Vocabulary** (from Group Therapy):

| Term | In this cabinet |
|---|---|
| **The Session** | one 60-second run |
| **Diagnose** | tap a worry |
| **Case Files** | the leaderboard |
| **Session Summary** | the results beat |
| **Episodic / Recurrent / Refractory** | worry tiers: 1, 2 and 3 taps (the game's Symptom Severity names) |
| **Walk Out / New Session** | menu / play again |
| **Inpatient Admission Form** | the attract screen's framing (the game's settings-overlay title) |

**Voice.** Deadpan-clinical, worn as a joke: admission forms, case files, session notes, never played
straight.

**On theme:** relatable, everyday, silly worries that a kid recognises in themselves or a parent.
**Off theme:** **anything that names or resembles a real mental-health condition**, real diagnostic
language used earnestly, and anything mocking or distressing.

---

## 4. How it plays

### The room

- **Eight chairs in a ring** (radius about 120, centred at (180, 350)) round a little rug, with **the
  couch** 🛋 in the middle as a ninth spot. The chairs are scribbled, seen slightly from above, with
  their backs facing outwards.
- A worry **pops up from behind a chair** (rising about 34 px with a little bounce), **lingers**, then
  ducks back down.
- **Hit circles are generous:** at least 64 px across, centred on the worry, not on the chair.

### Worries (tiers follow Group Therapy's Symptom Severity)

| Tier | Taps | Look | Behaviour |
|---|---|---|---|
| **Episodic** | 1 | small scribble blob holding its worry-doodle | pops up, lingers, ducks |
| **Recurrent** | 2 | same, with a little "↻" on its head | after the 1st tap it ducks and **pops up again in a different chair** (*it's back*) |
| **Refractory** | 3 | bigger, wobblier, shows 3 pips | **couch only**. Each tap removes a pip and it lingers longer |

**Happy Thought:** a sunny yellow scribble with a big smile and a little heart. **Don't tap it.**
Tapping one costs 50 points and breaks your streak, with *"That's just a nice thought."* It floats
away offended. Untapped, it ducks away happily.

**Missed worry:** it ducks away with a small "…" bubble. **No penalty**, apart from breaking your
streak. The clock is the only pressure.

### The 60-second Session

| Time | Spawn interval | Linger | Happy chance | New tiers |
|---|---|---|---|---|
| 0–15 s | 1.0 s | 1.6 s | 15% | Episodic only |
| 15–30 s | 0.8 s | 1.4 s | 18% | + Recurrent |
| 30–50 s | 0.6 s | 1.2 s | 22% | + Refractory (couch, max 1 at a time) |
| 50–60 s **LAST CALL** | 0.45 s | 0.95 s | 25% | everything |

**LAST CALL** is a nod to Group Therapy's Sylly Mode, *Stroke or Genius*. In the final 10 s, each new
worry **pops up blurred and sharpens over 0.6 s** (draw 3 offset copies at low alpha and converge
them). Mild, readable and funny. Banner: *LAST CALL*.

No more than 3 worries are up at once (4 during LAST CALL), and never two in the same chair.

---

## 5. Scoring

| Event | Points |
|---|---|
| Episodic diagnosed | 100 |
| Recurrent fully diagnosed | 100 + 150 |
| Refractory fully diagnosed | 400 |
| **FASTEST CORRECT** (diagnosed within 0.35 s of popping) | +50 (like Group Therapy's ⚡ speed bonus) |
| **BREAKTHROUGH** streak multiplier | ×2 at 5 in a row, ×3 at 10 |
| Tapping a Happy Thought | −50, streak broken |

The HUD is a clipboard strip across the top: `PATIENTS SEEN 12` · `0:42` · `SCORE 2,350`. The streak
multiplier shows as a stamp in the corner when active. The leaderboard ranks by score.

---

## 6. The worry list (curated and kid-safe)

Each worry has a **doodle** (what it holds or wears) and a **label**. The label only appears in the
diagnosis stamp (`DX: ALARM DREAD`), so a kid who can't read fast loses nothing.

| Label | Doodle |
|---|---|
| Alarm Dread | ringing alarm clock |
| Fear of Small Talk | two tiny speech bubbles |
| Odd Sock Syndrome | two mismatched socks |
| Reply-All Panic | envelope with three arrows |
| Last Slice Guilt | one pizza slice |
| Lift Silence | closed lift doors |
| Wobbly Tooth Worry | a tooth with motion lines |
| Lost Remote Distress | TV remote with a "?" |
| Spider Suspicion | a small cartoon spider |
| Dark Hallway Dread | a door ajar, black inside |
| Cold Bathwater Shock | a bath with a shiver line |
| Unread Message Dread | phone with a red badge |

The first two come straight from Group Therapy. **If the chat can see `data/gth-data.json`,** it may
add a few more from the difficulty-1 entries, but only ones that pass the kid-safe test above.

---

## 7. Art: draw it, don't load it, and make it look thumb-drawn

Group Therapy has no artwork: its whole look is *players' shaky phone drawings*. Match that:

- **Scribble stroke:** draw every shape as a polyline whose points get a small seeded jitter
  (±1.5 px), with round caps and a 3 px ink line. Re-seed the jitter **6 times a second** for a
  classic hand-drawn "line boil". This is the signature, so put it on everything: chairs, worries,
  the rug, the clipboard.
- **A worry:** a lumpy blob body (sage wash for Episodic, darker sage for Recurrent, bigger with a
  wobble for Refractory), two dot eyes with **worried eyebrows**, and its doodle held up or balanced
  on its head.
- **Diagnosed:** a red **DX** stamp thunks onto it with a tiny shake. The eyebrows relax, it smiles,
  and a sigh-puff carries it upwards and away.
- **Happy Thought:** a sun scribble with rays, a smile, blush and a heart.
- **The room:** a cream paper background with faint form lines. A sage rug scribble in the middle,
  the couch in the centre, eight chairs round it.

---

## 8. Sound map (`WIC_SOUND`)

| Moment | Beeps |
|---|---|
| `select` | 660 |
| `highScore` | 1046 |
| `pop` | 392 (soft) |
| `diagnose` | 784, then 988 at +60 ms (the stamp) |
| `partial` (a Recurrent or Refractory tap that isn't the last) | 659 |
| `fastest` | 1175 |
| `breakthrough` | 784, 988, 1175 |
| `happyOops` | 330, 262 |
| `lastCall` | 880 ×3 |
| `timeUp` (jingle) | 659, 523, 440, 523 (a gentle "session's over" chime) |

---

## 9. Copy deck

```
WALK-IN CLINIC
We've all got issues. Now tap them.
START THE SESSION
Tap the worries. Leave the happy thoughts alone.

INPATIENT ADMISSION FORM          ← small header on the attract screen
The shrink will see you now.      ← 3-2-1 intro

DX: <LABEL>                       ← diagnosis stamp
It's back.                        ← Recurrent re-pop
FASTEST CORRECT +50
BREAKTHROUGH ×2 / ×3
That's just a nice thought.       ← tapped a Happy Thought
LAST CALL

We're out of time for today.      ← Session over
SESSION SUMMARY 📋                 ← results beat: Patients Seen · Best streak · Fastest diagnoses
                                    (draw the clipboard; don't rely on an emoji glyph in canvas)
SIGN THE INTAKE FORM              ← name entry
CASE FILES                        ← leaderboard heading
NEW SESSION  /  WALK OUT          ← again / menu
```

---

## 10. Build order

1. The ring of chairs, the spawner, pop/linger/duck, tap to diagnose, the 60 s timer. Plain circles
   first, playable in the bench.
2. Tiers (Recurrent re-pop, Refractory on the couch), Happy Thoughts, streaks, FASTEST CORRECT, the
   pacing table, LAST CALL blur.
3. The scribble renderer with line-boil, then worries, doodles, stamps and relax/float-off.
4. The clipboard HUD, attract, Session Summary, sound.
5. The leaderboard skin, then a full play-test of every state as the prompt requires.

## 11. Done when

- A kid gets the idea in the first 5 seconds with no text.
- Diagnosing feels *kind*: every worry visibly cheers up.
- No label is ever a real condition.
- The line-boil reads as hand-drawn, not glitchy, and never makes a tap miss. Hit-test against the
  un-jittered shape.
- The game never feels unfair at LAST CALL: blurred worries are still tappable the moment they
  appear.
