# Just Enough Cooks

**Game 4** · `activeGameId: jec` · plugin `js/games/jec.js`
**Emoji:** 🍳 · **Brand:** `amber-500` · **Players:** 3–6 in both modes · **Modes:** PTP · MDLM (recommended)
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

Everyone's secretly writing a shopping list for the same dish, and the winning move is landing in
the exact middle of the group's taste — not too obvious, not too weird. Guess the same ingredient as
one other person and you've hit the jackpot. Guess it with everyone and you've spoiled the broth.
It's a wavelength game where the sweet spot isn't the centre of the group's thinking, it's a very
specific, very narrow slice of it.

---

## T2 — The Premise · *free*

A food word drops — "Pizza," "Nachos," whatever's Today's Order — and every Chef, one at a time,
privately writes down three ingredients they think belong in it. Nobody sees anyone else's list
until every Chef has cooked. Then the pot gets sifted: every ingredient laid out with a headcount of
how many Chefs wrote it.

The prize isn't for being popular. Land an ingredient with exactly one other Chef and it's a **Chef's
Kiss** — the full jackpot. Land it with half the table and it's still a **Nice Match**, worth half.
But if the whole kitchen wrote the same obvious thing, that's **Too Many Cooks** — everyone saw it
coming, so it's barely worth a token. And if you're the only one who thought of it, that's **A Bit
Pongy** — too weird, no match, nothing.

The tension is entirely social: you have to guess not what's true about the dish, but what a *small*
number of your specific friends will also think of, without being the whole table's obvious first
idea. The game produces the recognisable, funny moment of two people locking eyes because they both
wrote "pineapple" on a pizza order, while everyone else stares at a screen full of near-misses.

---

## T3 — How to Play · *free*

**Setup.** Choose your Chef count and enter names (optional — they're just for the score sheet).

**The loop.** Each round starts with **Today's Order** — a food word the whole table reads together.
Then Chefs take turns privately (pass-the-phone, or simultaneously in Lobby Mode) writing three
ingredients they think belong in that dish. Once every Chef has submitted, **The Sifting** reveals
every ingredient and how many Chefs wrote it:

- **Chef's Kiss ✨** — exactly 2 Chefs wrote it. The full jackpot.
- **Nice Match! 👌** — 3 up to (but not including) every Chef wrote it. Half the jackpot.
- **Too Many Cooks! 🍲** — literally every Chef wrote it. A small token reward.
- **A Bit Pongy! 🤢** — only one Chef wrote it. Nothing, by default.

If **Sous Chef Oversight** is on, the table can manually merge near-duplicate spellings ("Prosciutto"
and "Persciutto") before scoring locks in. Then **The Tally** shows the round's points, and the game
moves to the next Order.

**How it ends.** After the last Dish, whoever has the highest total across every round wins the
**Final Wash-up**.

---

## T4 — Theme & Flavour · *free*

**The world.** A busy kitchen putting together the same dish from several Chefs' private
imaginations at once — playful cooking-show language layered over what's really a pure wavelength
game. Nothing here is a real recipe or a real kitchen; it's flavour dressing for a guessing game.

**The voice** stays in the kitchen bit throughout: settings live in "The Pantry Cabinet," the reveal
screen is "The Sifting," quitting is "Kitchen Closed?", and Sylly Mode's Poison Word mechanic asks
you to "add a dash of Sabotage." The tone is upbeat and a little theatrical — a cooking-competition
host's energy, never a real culinary lecture.

**On theme:** playful food-show enthusiasm, ingredients as the currency of the joke, the specific
comedy of a table full of people all guessing "cheese" for completely different dishes.

**Off theme:** genuine cooking instruction or technique, anything that reads as a real recipe rather
than a prompt for free association, mean-spirited mockery of a "wrong" ingredient — every Chef's
guess is a legitimate read of the dish, some just land closer to the table's wavelength than others.

Australian English throughout.

---

## T5 — Terminology · *paired*

| Term | Meaning |
|------|---------|
| **Today's Order** | The food word revealed at the start of each round. |
| **Today's Recipe** | The sub-header label above the ingredient list on the sifting screen. |
| **The Sifting** | The screen where ingredient frequency is revealed and Sous Chef merges are applied. |
| **Chef's Kiss ✨** | The golden badge for exactly 2 Chefs matching — the Sweet Spot jackpot. |
| **Nice Match! 👌** | The golden badge for 3 up to N−1 Chefs matching — half the jackpot. |
| **Too Many Cooks! 🍲** | Every Chef matched — a token reward (or the Crowded Kitchen Tax, if that penalty is on). |
| **A Bit Pongy! 🤢** | Nobody else matched — no reward by default (or a penalty, if that's on). |
| **Kitchen Nightmare! 🧪** | Sylly Mode only — an ingredient hit by someone's Poison Word; overrides every other status. |
| **Signature Dish** | Sylly Mode only — a Chef's first ingredient, worth double points if it lands Golden. |
| **Poison Word** | Sylly Mode only — a word a Chef plants to sabotage anyone who matches it. |
| **Health Inspector's Report** | The section on the sifting screen listing every active Poison Word. |
| **Sous Chef Oversight** | The setting that lets the table manually merge near-duplicate spellings before scoring. |
| **Crowded Kitchen Tax** | The opt-in Too Many Cooks penalty. |
| **The Tally** | The per-round score-reveal screen. |
| **Final Wash-up** | The end-of-game leaderboard screen. |
| **Chef's Cook Book 📖** | The per-round score log shown on the Wash-up screen. |
| **New Shift** | Play again — resets round state, keeps names and settings. |
| **The Pantry Cabinet 🍳** | The settings overlay's title. |

---

## T6 — Settings · *mixed — labels paired, values derived*

The settings overlay is titled **The Pantry Cabinet 🍳** — *"Prep before you cook."*

| Setting | Options | Default | What it does in play |
|---|---|---|---|
| **Dishes** | 3 · 5 · 10 | 3 | How many food orders the whole game runs. |
| **Menu Complexity** | Home Cook · Sous Chef · Head Chef | Sous Chef | How advanced the food vocabulary drawn each round can get. |
| **The Sweet Spot** | 10 · 20 · 30 pts | 30 pts | Points for a 2-Chef Chef's Kiss. A 3+ match scores half; everyone matching scores a token. |
| **Rotten Penalty** | OFF / ON | OFF | When ON, an unmatched (A Bit Pongy) ingredient costs −5 pts instead of scoring nothing. |
| **Spoilt Penalty** | OFF / ON | OFF | When ON, a Too Many Cooks ingredient costs −2 pts per Chef who picked it (the Crowded Kitchen Tax) instead of the token reward. |
| **Sous Chef Oversight** | OFF / ON | ON | Lets the table manually merge near-duplicate ingredient spellings before scoring. |
| **Specials Board** | OFF / ON | OFF | Lets the table reroll Today's Order before prepping starts — unlimited rerolls. |
| **✨ Sylly Mode** | OFF / ON | OFF | Kitchen Nightmares. See T8. |

---

## T7 — The Player's Journey · *mixed — 7a derived, 7b paired, 7c free*

### T7a — The flow

| # | Screen | Beat | Type | Duration | Chrome |
|---|--------|------|------|----------|--------|
| 1 | `screen-jec-menu` | Pick your poison | Menu | — | 🔊 |
| 2 | `screen-jec-roster` | Kitchen Roster — count + names | Setup | — | 🔊 ✕ |
| 3 | `screen-jec-order` | Today's Order reveal | Interactive | — | 🔊 ✕ |
| 4 | `screen-jec-prep` | Prep your Ingredients (sub-state: entry, or a pass gate between Chefs) | Interactive / Gate | — | `[?]` 🔊 ✕ |
| 5 | `screen-jec-sifting` | The Sifting — frequency reveal, optional merges | Interactive | — | 🔊 ✕ |
| 6 | `screen-jec-tally` | Per-round score breakdown | Summary | — | 🔊 ✕ |
| 7 | `screen-jec-washup` | The Final Wash-up | Result | — | 🔊 ✕ |

Rows 3–6 loop once per Dish. `screen-jec-prep` is a single registered screen with two sub-states
toggled by JS (`#jec-prep-phase` for entry, `#jec-pass-gate` for the between-Chefs handoff) rather
than two separate screens.

**Overlays**

| Overlay | Opened from | What it is |
|---|---|---|
| `jec-settings-overlay` | Menu | The Pantry Cabinet — the eight settings |
| `jec-how-to-overlay` | Menu, prep `[?]` | How to Play — no tab bar |
| `jec-quit-overlay` | Every in-game screen's ✕ | "Kitchen Closed?" mid-game quit confirm |
| `jec-oversight-overlay` | Sifting screen (tap two ingredients) | "Sous Chef Oversight" merge confirm |
| `jec-new-shift-overlay` | Wash-up | "New Shift?" play-again confirm |
| `jec-help-tip-overlay` | Contextual `[?]` buttons | Shared contextual tip overlay |

### T7b — The words on screen

#### The menu

```copy
# screen-jec-menu
Just Enough
Cooks
Won't Spoil the Broth!
Let's Cook!
How to Play
Settings
← Back to the Box
```

#### Roster

```copy
# screen-jec-roster
Kitchen Roster
Who's cooking today?
Names optional — just here for the score sheet.
Number of Chefs
Let's Cook!
```

#### Order reveal

```copy
# screen-jec-order
Round 1 of 5
Today's Order:
Reroll Order
Everyone read this together — each Chef will take a turn.
Start Prepping! →
```

#### Prep

```copy
# screen-jec-prep — entry
Today's Order 🧾
Prep your Ingredients!
Kitchen Nightmares 🌶️ — Ingredient 1 is your Signature Dish
Ingredient 1
Ingredient 2
Ingredient 3
Add a dash of Sabotage — your Poison Word:
Add a dash of Sabotage…
This word will Spoil any matching ingredient in the pot.
Serve it Up!
```

```copy
# screen-jec-prep — pass gate
The broth is simmering…
Pass to
!
Don't let them peek — it's their turn now.
I've got the phone!
```

#### The Sifting

```copy
# screen-jec-sifting
The Sifting
Today's Order
🧪 Health Inspector's Report found the following ingredients poisoned:
Sous Chef Oversight: tap two similar words to merge.
The Taste Test!
```

#### The Tally

```copy
# screen-jec-tally
Next Course
```

#### Final Wash-up

```copy
# screen-jec-washup
Final Wash-up
The Final Wash-up
Chef's Cook Book 📖
New Shift
← Back to the Box
```

#### Sous Chef Oversight

```copy
# jec-oversight-overlay
Sous Chef Oversight
Are these the same ingredient?
Yep — merge 'em!
Different things
```

#### Settings — The Pantry Cabinet

```copy
# jec-settings-overlay — title
The Pantry Cabinet 🍳
Prep before you cook.
```

```copy
# jec-settings-overlay — Dishes and Menu Complexity
Dishes
Number of food orders per game.
Menu Complexity
How advanced the food vocabulary can get.
Home Cook
Sous Chef
Head Chef
```

```copy
# jec-settings-overlay — The Sweet Spot
The Sweet Spot
Points for a 2-Chef match (the jackpot). 3+ Chefs sharing a word scores half. Everyone matching scores a token.
```

```copy
# jec-settings-overlay — Rotten and Spoilt Penalty
Rotten Penalty
Nobody matched your ingredient. Rotten!!
Unique ingredients cost −5 pts.
Spoilt Penalty
Too many cooks spoil the broth.
Crowded Kitchen Tax — −2 pts per Chef who picked it.
```

```copy
# jec-settings-overlay — Sous Chef Oversight and Specials Board
Sous Chef Oversight
Before the tally, manually merge similar words (e.g. "Prosciutto" and "Persciutto").
Specials Board
Allow the group to reroll the food order before prepping starts. Unlimited rerolls — use fair play.
```

```copy
# jec-settings-overlay — Sylly Mode
✨ Sylly Mode
Kitchen Nightmares
Flag a Signature Dish for double points, and plant a Poison Word to spoil the competition.
Done
```

#### How to Play

```copy
# jec-how-to-overlay — title
How to Play 🍳
Think the same as just enough people — not too many, not too few.
```

```copy
# jec-how-to-overlay — steps
Step 1
Everyone sees the same food item.
A food item — like "Pizza" or "Nachos" — appears on screen. Everyone reads it, then each Chef takes a turn privately.
Step 2
Each Chef secretly picks 3 ingredients.
What would you put in this dish? Think carefully — you want to match others without being too obvious.
Step 3
Hit the Sweet Spot.
After all Chefs submit, ingredients are revealed. A Chef's Kiss ✨ hits the Sweet Spot — shared by just the right number of players. Too common is Too Many Cooks! Too rare is A Bit Pongy!
Winning and Scoring
Most Golden ingredients wins.
✨ Chef's Kiss — hit the Sweet Spot. Full points!
🤢 Too Many Cooks — too common. Points drop (penalty on: −2 per Chef who picked it).
🍂 A Bit Pongy — nobody else picked it (penalty on: −5 pts).
✨ Sylly Mode
Kitchen Nightmares
Your first ingredient becomes a Signature Dish — if it hits the Sweet Spot, it scores double. Also plant a Poison Word to spoil anyone who matches it.
Got it
```

#### Quit and play-again

```copy
# jec-quit-overlay
Kitchen Closed?
Your progress will be lost.
Yeah, close the kitchen.
Back to the stove!
```

```copy
# jec-new-shift-overlay
New Shift?
Scores will be wiped and a fresh game will begin.
Begin New Shift
Back to the Chopping Block
```

### T7c — Where the journey is thin

**◇ judgement, not spec.**

**MDLM's player-count bounds were pinned to a value only the single-device roster screen ever
changes.** **RESOLVED 23 Aug 2026 (SW v210).** `getMaxPlayers()` for `jec` resolved to `jecPlayerCount`, which only moves when
the Pass-the-Phone roster screen's count pills are tapped, or — far too late to matter — when
`jecInitRoster()` overwrites it with the roster size *after* the lobby has filled. That screen is
skipped entirely in Lobby Mode, so `jecPlayerCount` sat at its default of 4 throughout the
roster-filling phase: **a Lobby Mode room could only ever reach 4 players**, never the 5–6
Pass-the-Phone supports, with nothing anywhere explaining why a 5th join bounced. `getMaxPlayers()`
is now a constant `6` (min stays 3). Five games shared this exact root cause (SS, JEC, YGI, LTTP, DSD). The fix was not
"read the roster's live size" but something simpler: a lobby bound is consulted **only** while the
room fills, so it must never read game-local setup state at all — it now returns the game's true
range as a constant. `node tools/verify-mp-configs.js` § 3 makes the old shape unrepresentable,
and § 4 asserts each game's lobby bounds against its own Pass-the-Phone count pills.

**Mid-game quit didn't dissolve the Lobby Mode session for the rest of the group.** **RESOLVED 23 Aug 2026 (SW v210).** The
quit-confirm handler called `jecResetForNewGame()`, which ends unconditionally in
`showScreen('screen-jec-menu')` — stranding the quitting player on the local menu while still
occupying a Firebase room slot, and leaving every other device waiting on a turn that would never
come. It now branches to `mpNotifyPlayerLeft()` + `resetToLobby()` in any lobby session; the
single-device path still runs `jecResetForNewGame()`. Eight games were missing the quit contract in total (LI5, GM, SS, JEC, YGI, LTTP,
NAT, DSD); all eight now call the new engine helper `mpNotifyPlayerLeft()`, and
`node tools/verify-mp-configs.js` § 6 asserts it for all 18.

---

## T8 — Sylly Mode · *free*

**Kitchen Nightmares.** The name borrows the cooking-show cliché wholesale — this is the mode where
the kitchen turns competitive rather than purely cooperative.

**What changes.** Two mechanics layer onto the base game. First, every Chef's **first** ingredient
becomes their **Signature Dish** — if it lands in the Golden range (Chef's Kiss or Nice Match), it
scores double. Second, every Chef also submits a secret **Poison Word** alongside their three
ingredients — if any other Chef's ingredient matches it, that ingredient becomes **Kitchen
Nightmare!**, scoring zero regardless of how many Chefs matched it. Poisoned status overrides every
other status (Golden, Rotten, Spoilt) — a poisoned ingredient scores nothing no matter how well it
would otherwise have landed. Only the Signature Dish is exempt from being poisoned into irrelevance,
provided it isn't the ingredient that got poisoned.

**The Health Inspector's Report.** The Sifting screen gains a dedicated section listing every active
Poison Word as a chip, so the table can see exactly what's been sabotaged this round before scoring
locks in.

**What it doesn't touch.** The core Sifting mechanic, the Sweet Spot tiers, and the round/scoring
structure are otherwise unchanged — Kitchen Nightmares adds a sabotage layer on top rather than
replacing the underlying wavelength game.

---

## T9 — Art & Assets · *derived*

**Just Enough Cooks has no artwork of its own.** Every visual element is emoji (🍳, 🧾, 🤫, 🧑‍🍳,
🏆, 🧪, 📖) or plain text on white/tinted cards. There is no card, tile, or token art to convert,
and no How-to gallery tab — the ingredient lists and score cards are the whole visual surface.

**The word bank.** Today's Order is drawn from the shared `data/words.json` `food` category,
filtered by Menu Complexity's difficulty tier — Home Cook draws only the easiest tier, Head Chef
opens the hardest tier exclusively (not cumulative with the others, unlike most difficulty settings
in the suite).

---

## T10 — At the Table · *derived — except the PTP judgement*

**Modes.** Pass-the-Phone and Multi-Device Lobby Mode (recommended) are both supported. There is no
Team Lobby Mode — Just Enough Cooks has no teams, only individual Chefs.

**Players.** 3 to 6 in both modes — Pass-the-Phone and Lobby Mode alike (see T7c; Lobby Mode was
locked to exactly 4 until 23 Aug 2026).

**Devices.** Pass-the-Phone shares one device for the whole game, handed off at every pass gate
between Chefs. MDLM gives one device per Chef.

**Shape-changing settings.** None of the eight settings alter player count or session structure.

**How it plays at each size**

| Players | What it feels like |
|---|---|
| **3** | The floor — with only three Chefs, a Chef's Kiss (2 matching) and Too Many Cooks (all 3 matching) sit close together, so there's little room between "perfect" and "too obvious." |
| **4** | The only size Lobby Mode currently offers — a comfortable spread across all four tiers (Rotten, Kiss, Nice Match, Too Many Cooks all reachable). |
| **5–6** | Pass-the-Phone only. More room in the Nice Match band, and a wider gap between a genuine Chef's Kiss and the table-wide Too Many Cooks. |

**Could it be Pass-the-Phone?** — ◇ *judgement, not spec*

**It already is, and both modes suit the game about equally.** The core mechanic — private,
simultaneous-in-spirit ingredient guessing revealed all at once — works whether the device is shared
(with a pass gate enforcing privacy) or individual (with real device-level privacy). Neither mode
changes what the game is testing; the choice is purely about whether the group has one phone or
several.

---
