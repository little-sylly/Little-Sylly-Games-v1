# Counting Sheep

**Game 15** · `activeGameId: shp` · plugin `js/games/shp.js`
**Emoji:** 🐑 · **Brand:** midnight `#3A3D52` · **Players:** 3–8 · **Modes:** MDLM only
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

The rule is one sentence — keep the count at or under 99, or you're out — and the tension is
entirely in never knowing what's about to land on the table. You're holding cards that push the
count up, cards that pull it back down, and a couple that do something stranger entirely, and you
have to decide, turn by turn, whether the safe play now sets someone else up to bury you later. It's
an O'NO-99 climber wearing a bedtime-story skin, which turns out to fit disturbingly well — every
round genuinely does end with someone nodding off. Games run ten to fifteen minutes, scale from a
tight three-player table to a full eight, and the format is forgiving: getting caught out doesn't
end your match, just your Night.

---

## T2 — The Premise · *free*

Everyone's trying not to fall asleep, so you're counting sheep — out loud, as a table, one card at a
time. The Herd climbs with every Pasture card played, and the fence sits at 99. Cross it and you're
out for the Night: not eliminated from the match, just gone from this particular count, dozing off
while the others play on from exactly where you left the Herd.

Most of the game is played in the gap between what a card *does* and what it costs you to play it.
A Pillow buys you time but leaves the count exactly where the next player wanted it. An Alarm shakes
the table up in your favour — or in nobody's. And somewhere in the Flock, two Big Bad Wolves are
waiting to be drawn, locking a hand slot shut for the rest of the Night the moment they turn up.
Nobody plans around the Wolf. It just happens to you.

What it produces at the table is a lot of groaning at a well-timed Skip a Few, the low-grade dread of
watching the Herd creep past 90 with a hand full of nothing useful, and the genuine, repeated joke of
a player actually nodding off at the exact moment they bust.

---

## T3 — How to Play · *free*

**Setup.** Every player is dealt a hand from a shared **Flock** — a fixed 80-card deck, about 64%
of it plain **Pasture** number cards. A session runs across several **Nights**; the first player to
reach the target number of **Moons** wins the match.

**The loop.** On your turn, play one card to move **the Herd** — the running count, capped at 99.
Number cards add sheep; play one that would push the Herd past 99 and it's illegal, so you have to
find a legal line every turn or you're out.

- **Pasture** cards add a fixed amount (+1/+2/+5/+10) — the routine plays that build the count.
- **Pillows** stall or shrink it — Doze (skip a turn), Toss & Turn (reverse), Counting Backwards
  (subtract), Lullaby (snap to 20), or Swap Dreams (trade your whole hand with a random living
  player).
- **Alarms** shake things up — Skip a Few (a random gamble between +2 and +12), the Black Sheep
  (snaps the Herd straight to 99), Wide Awake (bans the next player's Pillows for their turn),
  Heavy Eyelids (forces the next player to play two cards), or Rude Awakening (reseats the whole
  turn order).
- **The Big Bad Wolf** hides in the Flock. Draw one and it locks a hand slot for the rest of the
  Night — one fewer card to work with, no warning.

If you genuinely have no legal card, the table holds on you — you get a **Nod Off** button instead
of being auto-crashed, so the moment is always yours to accept, not something that just happens to
you off-screen.

**Dozing off.** Bust the count, or have no safe card at all, and you doze off — out for the rest of
this Night only. Your hand is discarded, but you're still in the match and back for the next deal.

**How a Night ends.** The last player still awake wins the Night and earns one **Moon**.

**How it ends.** First to the target number of Moons — set in Settings — wins the match at
**Daybreak**.

---

## T4 — Theme & Flavour · *free*

**The world.** A children's bedtime ritual taken completely literally — you are, mechanically,
counting sheep to stay awake, and losing means you actually fall asleep. It's a gentle, cosy frame
for a genuinely tense climbing game, and the gap between the two is most of the charm.

**The voice** stays soft and dreamy even under pressure — *Pillows*, *the Flock*, *Lullaby*, *Tuck
In?* — right up until Sylly Mode flips it into something closer to a fever dream: *Night Terrors*,
*the Plunge*, *Sleepwalker*, *the Nightmare Meter*. The base game never raises its voice; the Sylly
Mode is where the dream turns unsettling.

**Australian English throughout**, as everywhere in the suite — colour, not color; metric where
anything is measured at all.

**On theme:** soft indigo-and-midnight tones, plush and pillowy, with sheep and fence art that reads
as a picture-book illustration rather than a stock photo. The brand colour was deliberately
pixel-sampled from the card art itself rather than picked from a palette, landing on a custom
midnight `#3A3D52` in place of a generic Tailwind indigo.

**Off theme:** anything that reads as genuinely scary or violent, even in Sylly Mode — Night Terrors
is meant to feel eerie and dreamlike, not horror-framed. Dozing off is a soft, funny beat, never a
punishment.

---

## T5 — Terminology · *paired*

| Term | Meaning |
|------|---------|
| **The Herd** | The running count, capped at 99. |
| **The Flock / Your Pen** | The shared draw pile / a player's own hand. |
| **Moons** | Split meaning by mode, deliberately. Normal mode: match wins — first to the target Moons wins the match, one per Night won. Sylly Mode: lives — 0 Moons makes you a permanent Sleepwalker. |
| **Dozed Off** | Normal mode only — a crash takes you out of this Night only; still in the match, back for the next deal. |
| **Last One Awake** | The Night-End summary — the surviving player takes a Moon; every device confirms before the host continues. |
| **Nod Off** | The stuck player's own tap when they have no legal line — the table holds until they tap it, rather than auto-crashing them. |
| **Sleepwalker** | Sylly Mode only — a permanently eliminated player (0 Moons), who lingers and can still disrupt the dream through the Nightmare Meter. |
| **The Jolt** | Sylly Mode only — a crash that doesn't eliminate you discards and redraws your whole hand. |
| **Nightmare Meter / Lottery** | Sylly Mode only — charges as Pasture cards are played; once full, a Sleepwalker flips one of three face-down nightmares blind. |
| **The Plunge** | Night Terrors' inverted descent phase, once the Herd hits 99. |
| **Daybreak** | Game over — Sylly Mode: last player with Moons wins; normal mode: first to the target Moons. |
| **Another Night?** | Play-again heading. |
| **Tuck In?** | Quit overlay heading. |
| **Bedtime Routine 🌙** | Settings overlay title. |
| **Lights Out** | Menu Play CTA label. |
| **Dream Journal 📖** | The played-cards log overlay. |

### Card families (`SHP_CARDS`)

- **Pasture** (`add`) — +1/+2/+5/+10; doubled below Herd 50 under Dream Acceleration.
- **Pillows** — Doze (skip), Toss & Turn (reverse), Counting Backwards −1/−2/−5/−10, Lullaby (snap
  to 20, one-of), **Swap Dreams** (trade your whole Pen with a random living player).
- **Alarms** — Skip a Few (random +2..+12 gamble), Black Sheep (snap to 99), Wide Awake (bans the
  next player's Pillows for their turn), Heavy Eyelids (next player plays two), **Rude Awakening**
  (reseats the turn order for the rest of the Night).
- **Traps** — the Big Bad Wolf, consumed on draw, shrinks a hand's cap by one for the Night.
- **Fogged Dreams** — a cursed, hidden random +2..+12 card conjured by the Fog nightmare (Sylly
  Mode only); dissolves the moment it leaves a hand, never recycles.

---

## T6 — Settings · *mixed — labels paired, values derived*

The settings overlay is titled **Bedtime Routine 🌙** — *"Set the scene before lights out."*

| Setting | Options | Default | What it does in play |
|---|---|---|---|
| **Hand Size** | 3 / 4 / 5 | 4 | How many cards you hold — more cards, more options, and fewer forced crashes. |
| **Moons** | Normal: Catnap / Full Night / Hibernate — Sylly: 3 / 5 / 7 | Full Night / 3 | Normal mode: Moons needed to win the match. Sylly Mode: starting lives. One card, two pill rows — never both visible at once, swapped by whether Sylly Mode is on. |
| **Dream Acceleration** | OFF / ON | ON | Below 50, every Pasture card counts double — Skip a Few and the other specials aren't affected. |
| **✨ Sylly Mode** | ON / OFF | OFF | Night Terrors. See T8. |

**No word-difficulty tier.** Counting Sheep runs off a fixed 80-card deck, not a `words.json` bank
— Hand Size is the game's velocity dial instead.

---

## T7 — The Player's Journey · *mixed — 7a derived, 7b paired, 7c free*

### T7a — The flow

| # | Screen | Beat | Type | Duration | Chrome |
|---|--------|------|------|----------|--------|
| 1 | `screen-shp-menu` | Pick your poison | Menu | — | 🔊 |
| 2 | `screen-shp-night-intro` | "Night N Begins" — fresh Flock, fresh hands | Interstitial | 5 s | none |
| 3 | `screen-shp-table` | The Herd: play a card, watch the count, doze or survive | Interactive | — | `[?]` 🔊 ✕ |
| 4 | `screen-shp-gameover` | Daybreak — final standings | Result | — | 🔊 |

There is **no setup screen and no pass-gate** — names come from the lobby roster, and every player
is on their own phone. `screen-shp-table` is also where the Night-End summary ("Last One Awake")
and every mid-Night sub-state (waiting, stuck, sleepwalker spectating, the Nightmare Lottery, the
doze banner) render — a single busy screen rather than a separate result screen per Night, since a
Night is only ever a few turns long.

The Night Intro carries no chrome at all — auto-advancing and nothing to tap, the two conditions of
the interstitial exemption. 5 seconds is the ceiling this suite treats as safe, not a target.

**Overlays**

| Overlay | Opened from | What it is |
|---|---|---|
| `shp-settings-overlay` | Menu | Bedtime Routine — the four settings |
| `shp-how-to-overlay` | Menu, table `[?]` | How to Play — two tabs: The Rules, The Cards |
| `shp-play-log-overlay` | Table's Dream Journal tap | This Night's played cards, newest first |
| `shp-tip-overlay` | *(scaffolded, no live entry point — see T7c)* | Shared contextual tip shell |
| `shp-quit-overlay` | Table ✕ | Mid-Night quit confirm |
| `shp-new-night-overlay` | Gameover | Play-again confirm |

### T7b — The words on screen

#### The menu

```copy
# screen-shp-menu
Counting Sheep
Stay awake. Pass the herd.
Lights Out
How to Play
Settings
← Back to the Box
```

#### Night intro

Heading is built at runtime as *"Night N Begins"*. The flavour line is picked at random from a
five-line pool, host-picked and synced so every device shows the same line.

```copy
# screen-shp-night-intro
Everyone’s trying hard not to fall asleep, so you begin counting sheep. Don’t go over 99 or you might really just fall asleep.
The Flock is fresh and the Herd is at 0. Keep it there — or at least under 99.
Pillows plumped, alarms wound. First one to break 99 nods off for the night.
A new count begins. Play smart, watch the ceiling, and don’t be the one who drifts.
Fresh hands all round. Somewhere in the Flock, a Big Bad Wolf is waiting to lock a slot.
Night Terrors is active — hit 99 and the dream Plunges.
```

#### The table

```copy
# screen-shp-table — static labels
Night
```

Everything else on the table — the status label ("Night", or "THE PLUNGE 🔻 · Night N" once Night
Terrors flips), the doze banner, the last-effect banner, the sleepwalker/waiting messages, the Nod
Off button, the Nightmare Lottery hint, and the Night-End summary — is built at runtime from
per-event state. The core lines: *"You're out for the night — back next Night."*, *"You are a
Sleepwalker, haunting the dream…"*, *"You are out for the night…"*, *"Tap one to unleash it — blind.
💤"*, *"[Name] is the Last One Awake"*, and *"💤 THE PLUNGE BEGINS — the count inverts!"*.

#### Gameover (Daybreak)

```copy
# screen-shp-gameover
Daybreak
Another Night
Time to Sleep
```

#### Settings — Bedtime Routine

```copy
# shp-settings-overlay — title
Bedtime Routine 🌙
Set the scene before lights out.
```

```copy
# shp-settings-overlay — Hand Size
Hand Size
How many cards you hold. More cards, more options - and fewer forced crashes.
```

```copy
# shp-settings-overlay — Dream Acceleration and Sylly Mode
Dream Acceleration
Below 50, every Pasture card counts double — Skip a Few and other specials aren't affected.
✨ Sylly Mode
Night Terrors
Reach 99 and the dream inverts: the count plunges, every number flips its sign, and the ceiling falls each turn. Knocked-out players linger as Sleepwalkers and can nudge the dream through the Nightmare Meter. Last one awake survives.
Done
```

#### How to Play — The Rules

```copy
# shp-how-to-overlay — title and tabs
How to Play 🐑
Keep the herd below 99. Don't be the one who nods off.
The Rules
The Cards
```

```copy
# shp-how-to-overlay — steps
The Count
On your turn, play one card to change the Herd
Number cards add sheep - but if your play would push the count past 99
it's illegal.
Pillows & Alarms
Pillows stall or shrink the count (Doze, Counting Backwards, Lullaby, Swap Dreams). Alarms shake it up — Skip a Few, the Black Sheep (snaps to 99), Wide Awake, Heavy Eyelids and Rude Awakening. The Big Bad Wolf hides in the Flock — draw one and a card slot locks for the Night. Not sure what a card does? Press and hold it in your hand, or check The Cards tab above.
Dozing Off
Bust the count, or run out of safe cards, and you doze off - you're out for the night. Everyone else plays on from exactly where the Herd sits.
Winning and Scoring
Last one awake
```

```copy
# shp-how-to-overlay — Sylly Mode card
Night Terrors
One long Night - no redeals, and your Moons are lives
Crash and you lose one, then the Jolt wakes you with a fresh hand.
Reach 99 and the dream inverts - the Plunge
every number card flips its sign and the ceiling falls a little each turn
At zero Moons you don't just leave - you become a Sleepwalker
haunting the dream. Every Pasture card played charges the Nightmare Meter
when it fills, a Sleepwalker flips one of three face-down nightmares onto the living. 💤 Last one awake survives the night.
Got it
```

#### The Dream Journal

```copy
# shp-play-log-overlay
Dream Journal 📖
Cards played this Night, newest first.
Close
```

#### Quit and confirms

```copy
# shp-quit-overlay
Tuck In?
Give in to sleep now and you're out for the night.
Yeah, lights out.
Stay awake!
```

```copy
# shp-new-night-overlay
Another Night?
Fresh Flock, full Moons, everyone wakes up.
Count Again
Stay here
```

### T7c — Where the journey is thin

**◇ judgement, not spec.**

**`shp-tip-overlay` is a fully-built overlay with no live entry point.** The markup, IDs, and the
`shpShowTip(emoji, heading, lines)` renderer all exist, but nothing in `js/games/shp.js` or
`index.html` ever calls it — no inline `[?]` button opens it anywhere on the table. Every other game
with a shared contextual-tip overlay (Cookie Jar, Pecking Order's per-card tips) wires one from a
mechanic that genuinely needs an inline explanation; Counting Sheep instead solved that need through
the tap-hold-to-gallery pattern (long-press a card jumps to its row in The Cards tab), which may be
exactly why the tip overlay was never finished — but it currently sits in every screen inventory as
if it were live.

**Sylly Mode's vocabulary is genuinely richer than the base game's.** *Sleepwalker*, *the Jolt*, *the
Nightmare Meter*, *the Plunge* — four distinct named concepts with their own mechanics — against the
base game's comparatively plain *Pillows* / *Alarms* / *Dozed Off*. A player who never turns Night
Terrors on sees a noticeably flatter naming scheme than the one the settings card promises is waiting
for them.

**The Night-End summary shares a screen with everything else, with no beat of its own.** Unlike
Cookie Jar's Raid Summary or Pecking Order's Clash Result — both dedicated screens — "Last One
Awake" renders as one more state inside `screen-shp-table`'s single busy body. It works, but a player
scanning the suite's other repeating-round games would expect a cleaner break between "the Night just
ended" and "here's what happened."

---

## T8 — Sylly Mode · *free*

**Night Terrors.** The whole match becomes **one continuous Night** — no redeals, and your Moons
stop being match wins and become **lives**. Crash and you lose one; unless it was your last, the
crash triggers **the Jolt**, which discards and redraws your whole hand so you're never left stuck
on the same bad cards that just crashed you.

**The Plunge.** Push the Herd to 99 and the dream inverts. Every number card flips its meaning —
what used to add now subtracts, and vice versa — and the ceiling itself starts **falling a little
each turn**, squeezing the room to manoeuvre tighter and tighter. A Plunge bust costs a Moon and
reverts play to the normal Climb; if the Herd is instead driven all the way down to 0, that's a
mercy exit back to Climb with no Moon lost.

**Sleepwalkers.** Run out of Moons and you don't leave — you become a **Sleepwalker**, haunting the
dream rather than sitting out. Every Pasture card played by a living player charges the **Nightmare
Meter**; once it fills, a Sleepwalker gets to flip one of three face-down nightmares blind, unleashing
it on the table. The five: Cold Feet (a small Herd nudge either way), Restless Leg (reverse or skip),
**Fog** (a rare cursed-card swap — conjures a Fogged Dream), Sleep Paralysis (forces a two-card play),
and Global Echo (a temporary boost to every Pasture card until the next disruption).

**What changes in feel, not just rule.** The base game is a straightforward survival climb; Night
Terrors turns it into something closer to a fever dream that keeps reshaping itself under you, where
even the players who've already lost still get to mess with the ones still standing. It rewards
watching the whole table, not just your own hand — a Sleepwalker's Nightmare pick can undo careful
planning from three turns ago.

---

## T9 — Art & Assets · *derived*

**Counting Sheep ships with real artwork by default** — a core art pack, first added August 2026.

| What | Count | Where it renders |
|---|---|---|
| Sheep card faces | 19 card types (Pasture, Pillows, Alarms, Traps, plus the Fogged Dream phantom) | Hand, table, gallery, long-press inspect |
| Card back | 1 | Face-down cards |
| The pen (non-card) | 1 composed image (sheep + fence together) | The Herd band, replacing an earlier CSS composition of separate sheep/fence pieces that never quite lined up |

**Everything is precached.** The art is part of the app version, present on a cold offline install;
changing it needs a service-worker version bump. A CSS fallback still renders if art fails to load.

**The Fogged Dream's face art doesn't leak its value.** The card has core art like every other card,
but its actual resolved amount (a random 2–12) is rolled at play time, independent of what face is
shown — a static image can never spoil it, for its owner or anyone else.

**Where to see it without playing.** How to Play → **The Cards** shows the full deck, one row per
card grouped by family, with thumbnail, name, effect text and how many are in the Flock. It's built
through the same `shpRenderCard` seam the table uses, and every row is tappable-to-enlarge.
Long-pressing any real card in hand — or the greyed Big Bad Wolf slot — jumps straight to that
card's row here, scrolled into view and briefly ringed, instead of opening a separate inspect popup.
Opening this tab offline is the install check for a game with no shared device — illustrated cards
mean the art precached correctly, emoji mean it didn't.

Dimensions, file-size ceilings and the conversion process are **not** recorded here — they live in
`docs/art-authoring-guide.md`, the document to brief an artist from alongside T4.

---

## T10 — At the Table · *derived — except the PTP judgement*

**Modes.** Multi-device only. Every player uses their own phone; one person hosts and the rest join
with a room code. There is no pass-the-phone or shared-device option.

**Players.** 3 to 8 — the widest player range of any game in the suite.

**Devices.** One per player. Hands are broadcast to every device but each renders only its own
(couch security, not the private-channel model) — the game doesn't need genuine network-level
secrecy the way a bluffing game does, since nobody's incentive depends on Firebase itself staying
opaque.

**Shape-changing settings.** None. No setting alters player count or session structure.

**How it plays at each size**

| Players | What it feels like |
|---|---|
| **3** | Fast, sharp Nights — fewer players means the Herd climbs quickly and a single well-timed Alarm can decide the whole round. |
| **4–6** | The comfortable middle — enough players that the turn order genuinely matters, and the Big Bad Wolf's slot-lock starts to bite by mid-Night. |
| **7–8** | Long Nights with a lot of table cross-talk — Rude Awakening's reseat and Swap Dreams both hit harder the bigger the room, and a Sleepwalker crowd in Sylly Mode gets genuinely chaotic. |

**Could it be Pass-the-Phone?** — ◇ *judgement, not spec*

**Plausibly yes, more than most of the suite's later games.** Hands are already broadcast to every
device under couch security rather than kept genuinely private, so the privacy bar a PTP mode would
need to clear is lower here than for Flawless or Pecking Order — a shared phone wouldn't actually
weaken any guarantee the game currently makes over the network. The real cost would be a Pass-the-
Phone Safety Gate before every hand reveal and every private Nightmare pick, and building that for a
game that already supports up to 8 players is real work, not a config flag — but of the suite's
MDLM-only games, this is the one where the case is strongest.

---
