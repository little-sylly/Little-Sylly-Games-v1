# Group Therapy

**Game 9** · `activeGameId: gth` · plugin `js/games/gth.js`
**Emoji:** 🛋️ · **Brand:** muted sage `#B1BCA0` (custom CSS variable) · **Players:** 4–8 · **Modes:** MDLM only
**Status:** gold master · verified against SW v205 on 23 August 2026

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

Everyone in the room is drawing their own diagnosis at the same time, on their own phone, and none
of you know whose scribble is whose until the file is unsealed. You're not taking turns being funny
— you're all bad at drawing "Alarm Dread" simultaneously, then guessing which stranger's shaky
rectangle is "Fear of Small Talk." It's Pictionary with the turn order deleted and a waiting room
gag bolted to the front. Everyone draws, everyone diagnoses, nobody ever finds out who drew what
until the reveal does it for you.

---

## T2 — The Premise · *free*

You've checked yourself into group therapy, and the first thing they ask you to do is draw your
symptoms. Not describe them — draw them, badly, in thirty to sixty seconds, on a phone screen with
your thumb. Everyone in the group is doing the same thing at the same moment, each drawing their own
private list of issues nobody else can see.

Then the roles flip. You become the Shrink, and a queue of anonymous case files lands in front of
you — drawings pulled from everyone else in the group, never your own. You don't know who drew them.
You just have to work out what's wrong with the patient from the picture alone, against the clock,
one case after another until the timer runs out or the queue does.

What the game actually produces is two very different kinds of laughing: the frantic, thumb-cramping
kind while everyone draws at once and nobody can see anyone else's screen, and the delighted
detective kind when the Big Reveal finally puts a name and a face to every terrible little drawing.
Nobody is diagnosed with anything real. The worst outcome is that your rendering of "Imposter
Syndrome" gets guessed as "Fear of Public Speaking" and everyone agrees that's fair.

---

## T3 — How to Play · *free*

**Setup.** Every player joins on their own phone — there's no shared screen and no passing anything
around. Once the group is in the lobby, the session opens straight into the Patient Phase.

**Phase 1 — the Patient Phase.** Each player is privately assigned a handful of disorders (three to
five, depending on Reportable Symptoms) and draws each one in turn, alone on their own device,
against a countdown. Before each drawing you get the disorder's name, a plain-English definition and
a drawing tip — a suggested scene to actually put on the canvas. Everyone draws simultaneously; there
is no waiting for a turn. Once you've drawn your last disorder you sit in the Waiting Room until
everyone else finishes too.

**Phase 2 — the Shrink Phase.** Once every drawing is in, everyone becomes a Shrink. You're handed a
personal queue of anonymous drawings — never your own — and for each one you have to name the
disorder. Normally you pick from four Diagnostic Cards (one correct answer, three decoys drawn from
the same category); with Psychiatric Evaluation on, there are no cards at all and you have to type
your diagnosis, matched leniently against the disorder's name and its list of accepted aliases. Work
through as many cases as you can before the Diagnosis Window runs out — if you clear your queue
first, you wait for the rest of the group in a short holding screen instead.

**The Big Reveal.** Once every Shrink is done (or time is up), the host walks the whole group through
every drawing, one at a time: who drew it, what it actually was, and who diagnosed it correctly.
This is the payoff — the group finally gets to see the drawings and match faces to scribbles.

**How it ends.** After the last drawing is revealed, the Session Summary shows the full leaderboard.
Scoring rewards both sides of the game: patients earn points for being correctly diagnosed, Shrinks
earn points for diagnosing correctly, and there are bonuses for being the fastest correct guess on a
drawing and for correctly nailing one of the harder, more abstract disorders.

---

## T4 — Theme & Flavour · *free*

**The world.** A waiting room, a couch, and a group of patients who have all been asked to draw their
issues instead of talk about them. The framing is deadpan-clinical — admission forms, case files,
session notes — worn as a joke, never played straight. Nobody is actually in therapy; the game is
borrowing the furniture of a therapy session (the couch, the intake form, the diagnosis) to hang a
drawing-and-guessing game on.

**The voice** stays in that clinical-but-silly register throughout: the settings overlay is an
"Inpatient Admission Form," drawings become "case files," the reveal is when the "Case Files [are]
Unsealed." The disorders themselves range from mundane modern anxieties ("Alarm Dread," the fear of a
specific ringtone) through classic phobias to more abstract conditions — the humour comes from having
to draw something as slippery as a feeling in under a minute.

**On theme:** wry, deadpan institutional language layered over genuinely funny, relatable everyday
neuroses. The disorders should be things a player recognises in themselves or a friend — never
genuine mental illness played for real distress. Drawing tips nudge toward a scene, never spell out
the answer.

**Off theme:** real diagnostic language used earnestly, anything that reads as mocking an actual
mental health condition rather than a shared universal quirk, and an over-serious clinical tone that
forgets it's a party game about bad drawings.

Australian English throughout — colour, organise, no exceptions.

---

## T5 — Terminology · *paired*

| Term | Meaning |
|------|---------|
| **The Session** | A full game — one cycle of the Patient Phase, the Shrink Phase and the Big Reveal. |
| **Patient Phase** | Phase 1 — every player draws their assigned disorders. |
| **Shrink Phase** | Phase 2 — every player diagnoses a personal queue of anonymous drawings. |
| **The Disorder** | The drawing prompt assigned to a patient — a name, a definition and a drawing tip. |
| **Diagnostic Card** | One of four multiple-choice answer cards shown for a case in standard mode. |
| **Deep Dive** | The player-facing behaviour that Psychiatric Evaluation (a setting) turns on — Shrinks type their diagnosis instead of picking a card. |
| **Case** | One drawing in a Shrink's queue, shown with its Diagnostic Cards or the Deep Dive input. |
| **The Queue** | A player's personal, ordered set of anonymous drawings to diagnose. |
| **Waiting Room** | The passive screen shown after finishing all your drawings, while others are still drawing. |
| **Session Notes Filed** | The passive screen shown after clearing your queue, while others are still diagnosing. |
| **The Big Reveal / Case Files Unsealed** | The host-controlled, one-at-a-time reveal of every drawing after the Shrink Phase ends. |
| **Session Summary** | The final leaderboard screen. |
| **New Session** | Play again — clears drawings and diagnoses, keeps names and settings. |
| **Walk Out** | Quitting mid-session. |
| **Inpatient Admission Form** | The settings overlay's title. |

---

## T6 — Settings · *mixed — labels paired, values derived*

The settings overlay is titled **Inpatient Admission Form 📋** — *"Please complete all fields
accurately to ensure an efficient institutional visit."*

| Setting | Options | Default | What it does in play |
|---|---|---|---|
| **Reportable Symptoms** | 3 · 4 · 5 | 3 | How many disorders each patient must draw. |
| **Expression Window** | 30s · 60s · No Limit | 60s | Time to draw each disorder. No Limit removes the countdown and auto-submit entirely — you tap Done when you're finished. |
| **Diagnosis Window** | 60s · 90s · 120s | 90s | Total time the Shrink Phase runs for, roughly 4 / 6 / 8 cases depending on pace. |
| **Symptom Severity** | Episodic · Recurrent · Refractory | Recurrent | How abstract the disorder pool skews — Episodic draws only the easiest disorders, Refractory opens the full pool including the hardest, most abstract ones. |
| **Psychiatric Evaluation** | OFF / ON | OFF | Removes the Diagnostic Cards — Shrinks must type their diagnosis, matched leniently against the disorder's name and its aliases. |
| **✨ Sylly Mode** | OFF / ON | OFF | Stroke or Genius. See T8. |

---

## T7 — The Player's Journey · *mixed — 7a derived, 7b paired, 7c free*

### T7a — The flow

| # | Screen | Beat | Type | Duration | Chrome |
|---|--------|------|------|----------|--------|
| 1 | `screen-gth-menu` | Pick your poison | Menu | — | 🔊 |
| 2 | `screen-gth-patient-intake` | "Please illustrate your current symptoms" | Gate | — | 🔊 ✕ |
| 3 | `screen-gth-disorder-reveal` | The disorder, its definition, a drawing tip | Interactive | — | `[?]` 🔊 ✕ |
| 4 | `screen-gth-canvas` | Draw it, against the clock | Interactive | — | 🔊 (no `[?]`/✕ — see T7c) |
| 5 | `screen-gth-waiting-room` | Everyone else is still drawing | Interstitial-like | — | none |
| 6 | `screen-gth-shrink-intro` | "The Shrink Phase" — host opens the case files | Gate | — | 🔊 ✕ |
| 7 | `screen-gth-case` | An anonymous drawing, diagnose it | Interactive | — | `[?]` 🔊 ✕ |
| 8 | `screen-gth-case-report` | "Session Notes Filed" — waiting on the rest of the group | Interstitial-like | — | 🔊 ✕ |
| 9 | `screen-gth-big-reveal` | "Case Files Unsealed" — one drawing at a time | Interactive | — | 🔊 ✕ |
| 10 | `screen-gth-final-report` | The leaderboard | Result | — | ✕ |

`screen-gth-disorder-reveal` and `screen-gth-canvas` repeat once per assigned disorder (rows 3–4
loop). `screen-gth-waiting-room` and `screen-gth-case-report` are not auto-advancing interstitials in
the strict rule-5 sense — they wait on other players rather than a timer — but read as the same kind
of held beat and carry the same near-empty chrome.

**Overlays**

| Overlay | Opened from | What it is |
|---|---|---|
| `gth-settings-overlay` | Menu | Inpatient Admission Form — the six settings |
| `gth-how-to-overlay` | Menu, disorder-reveal `[?]`, case `[?]` | How to Play — no tab bar |
| `gth-quit-overlay` | Every in-session screen's ✕ | "Walk Out?" mid-session quit confirm |
| `gth-new-session-overlay` | Final Report | "New Session?" play-again confirm |

### T7b — The words on screen

#### The menu

```copy
# screen-gth-menu
Group Therapy
We've all got issues. Now draw them.
Start the Session
How to Play
Settings
← Back to the Box
```

#### Patient intake

```copy
# screen-gth-patient-intake
Welcome to Group Therapy
Thanks for checking yourself in. Our shrinks will be with you shortly. In the meantime, please illustrate your current symptoms.
Your Symptoms
Auto-starting in
s — tap when ready
I'm Ready to Draw →
```

#### Disorder reveal

```copy
# screen-gth-disorder-reveal — preview sub-state
Drawing Tip 🎨
Ready to Draw →
```

```copy
# screen-gth-disorder-reveal — between sub-state
Draw Next →
```

#### Canvas

```copy
# screen-gth-canvas
Clear
Undo
Done
```

#### Waiting room

```copy
# screen-gth-waiting-room
Waiting Room
Everyone's finishing up their drawings.
The Shrink Phase begins when everyone's done.
```

#### Shrink intro

```copy
# screen-gth-shrink-intro
The Shrink Phase
Diagnose each anonymous drawing before the time runs out.
How it works
You'll see anonymous drawings one at a time. Pick the correct disorder from the options — or type it if Deep Dive is on. You won't see your own drawings.
Time limit
Open the Case Files →
Auto-starting in
s — tap when ready
Waiting for the host to open the files…
```

#### Case (Shrink Phase)

```copy
# screen-gth-case — Deep Dive
Your Diagnosis
Type your diagnosis…
Submit Diagnosis →
Unrecognised — try again
```

#### Case report

```copy
# screen-gth-case-report
Session Notes Filed
You finished your queue. Waiting for the rest of the group.
How it works
Anonymous drawings are assigned to everyone — you won't see your own. Pick the correct disorder from four options, or type it in Deep Dive mode.
Time remaining
The Big Reveal starts when everyone's done.
```

#### Big Reveal

```copy
# screen-gth-big-reveal
Case Files Unsealed 📂
The Disorder
Artist
Correct Diagnoses
Next Case →
See Final Results →
```

#### Final Report

```copy
# screen-gth-final-report
Session Summary 📋
How Sessions Work
🎨 Patient: +2 per correct Shrink diagnosis
🧠 Shrink correct: +2
⚡ Fastest correct: +1 bonus
🔬 Tier 3 disorder: +1 bonus
New Session
```

#### Settings — Inpatient Admission Form

```copy
# gth-settings-overlay — title
Inpatient Admission Form 📋
Please complete all fields accurately to ensure an efficient institutional visit.
```

```copy
# gth-settings-overlay — Reportable Symptoms and Expression Window
Reportable Symptoms
Number of disorders each patient must convey.
Expression Window
Time available to convey each disorder.
No Limit
```

```copy
# gth-settings-overlay — Diagnosis Window
Diagnosis Window
Total time for diagnosing patient disorders.
Fast — ~4 cases
Balanced — ~6 cases
Relaxed — ~8 cases
```

```copy
# gth-settings-overlay — Symptom Severity
Symptom Severity
Abstract visual complexity of the disorders in the pool.
Episodic
Recurrent
Refractory
```

```copy
# gth-settings-overlay — Psychiatric Evaluation and Sylly Mode
Psychiatric Evaluation
Removes Diagnostic Cards — Shrinks must type their diagnosis. Leniency accounted for.
✨ Sylly Mode
Stroke or Genius
Activates a low-frequency motor tremor on the artist's canvas while forcing Shrinks to decipher case files through a decaying cognitive blur.
Done
```

#### How to Play

```copy
# gth-how-to-overlay — title
How to Play 🛋️
A drawing game about your issues.
```

```copy
# gth-how-to-overlay — steps
Step 1
Everyone draws their disorders
Each player is secretly assigned a few Disorders and has to draw them — simultaneously, on their own device. A tip is shown before each drawing to help.
Step 2
Everyone becomes a Shrink
The
Shrink Phase
opens a queue of anonymous drawings. For each one, pick the correct disorder from the
Diagnostic Cards
. You never see your own drawings.
Step 3
The Big Reveal
After time runs out, all drawings are revealed one at a time — with who drew them and who guessed correctly.
Winning and Scoring
Two ways to earn Sessions
Patient +2 — each time a Shrink correctly diagnoses your drawing.
Shrink +2 — for each correct diagnosis you submit.
Speed +1 — the fastest correct diagnosis per drawing.
Tier 3 +1 — bonus for correctly diagnosing a Complex Condition.
✨ Sylly Mode
Stroke or Genius
The canvas trembles while you draw. Drawings blur into focus during the Shrink Phase — a 3.5 second reveal that tests your eye.
Got it
```

#### Quit and play-again

```copy
# gth-quit-overlay
Walk Out?
Your session will be lost. The waiting room will be very disappointed.
Yeah, I'm out.
Keep going!
```

```copy
# gth-new-session-overlay
New Session?
All drawings and diagnoses will be cleared. Names and settings stay.
Start New Session
```

### T7c — Where the journey is thin

**◇ judgement, not spec.**

**The Canvas screen has no `[?]` and no ✕.** Every other Interactive screen in the flow carries both,
but a mid-drawing quit needs to route through Clear/Undo/Done rather than a header button, and there
is no obvious moment to fit a help lookup into a 30–60 second drawing window. It's a defensible
exception rather than an oversight, but it is the one Interactive screen in this game's flow that
breaks the header pattern, and it is worth naming rather than leaving silent.

**`gth-case-report-progress` is a reserved, empty container.** The Case Report screen ships a div for
per-player progress dots that nothing ever populates — a player waiting there sees only static text,
no sense of how close the group is to finishing. Logged as open work, not fixed here.

**The Waiting Room and Case Report screens carry no rotating flavour.** Both are held-beats a player
can sit in for a while depending on how slow the rest of the table is, and both show one fixed line
each time, every session. Neither has adopted the suite's Round/Night Intro flavour-rotation pattern.

---

## T8 — Sylly Mode · *free*

**Stroke or Genius.** The name puns on "stroke of genius" — every stroke you draw is a small gamble,
and every stroke someone else drew is a small mystery you have to squint through.

**What changes.** Both halves of the game get harder in a way that's aimed at your hands and eyes
rather than your memory. While drawing, the canvas itself gets a low-frequency tremor — it jiggles
under your finger, starting subtle and ramping up as your time runs low, so the last few seconds of
any drawing are a fight against your own canvas. While diagnosing, every drawing in the Shrink Phase
opens **blurred** and clears into focus over roughly three and a half seconds — so the first
half-second read of a case is a guess, and the rest of the resolve is spent confirming or correcting
it as the picture sharpens.

**What it doesn't touch.** No settings are hidden or superseded by Stroke or Genius — it layers on
top of the base game rather than replacing any of its rules. Scoring, queues and timers all work
exactly as normal.

---

## T9 — Art & Assets · *derived*

**Group Therapy has no artwork of its own** — every visual in the game is either an emoji (🛋️, 🎨,
🧠, 📋, 📂, ⏳) or the player's own live drawing, rendered through `js/lib/canvas-draw.js`'s delta-
encoded stroke format. There is no card, tile or token art to convert, and no How-to gallery tab —
the drawings *are* the content, and they're generated fresh by the players every session rather than
shipped with the app.

**The disorder bank.** `data/gth-data.json` holds 100 disorders across three categories — neurosis
(36), phobia (35) and condition (29) — spread across three difficulty tiers (25 / 42 / 33 at
difficulty 1/2/3). Each entry carries a `name`, a plain-English `definition`, a `tip` (the concrete
scene suggested before drawing), a `category` (used to pick same-category Diagnostic Card decoys),
and an `aliases` list (the accepted answers in Deep Dive mode). A handful of entries share a
`cluster` tag (e.g. `"sleep"`) so their decoys can be drawn from a tight thematic subgroup rather than
the whole category.

---

## T10 — At the Table · *derived — except the PTP judgement*

**Modes.** Multi-device only. Every player uses their own phone; one person hosts and the rest join
with a room code. There is no pass-the-phone or shared-device option.

**Players.** 4 to 8.

**Devices.** One per player, no exceptions — the whole game depends on everyone drawing and diagnosing
privately and simultaneously.

**Shape-changing settings.** None. No setting alters the player count or the session structure.

**How it plays at each size**

| Players | What it feels like |
|---|---|
| **4** | The floor — enough for the queue algorithm's exactly-2-appearances-per-drawing rule to feel fair, but a small enough group that the Waiting Room and Case Report holds are short. |
| **5–6** | The comfortable middle — enough drawings in circulation that the Big Reveal has real variety without dragging. |
| **8** | The most drawings in flight and the longest Big Reveal, but also the longest waits for the slowest artist or Shrink in the group before either phase can advance. |

**Could it be Pass-the-Phone?** — ◇ *judgement, not spec*

**No.** The entire game is built on private, simultaneous drawing and private, simultaneous
diagnosis — the moment either becomes serial, the surprise of the Big Reveal (not knowing whose
drawing you're looking at) and the privacy of the Patient Phase (nobody watching you draw badly) both
collapse. This sits in the same category as Cookie Jar: the multi-device requirement isn't a delivery
choice, it's load-bearing to what makes the game work.

---
