# Just Enough Cooks

**Game 4** · `activeGameId: jec` · plugin `js/games/jec.js`
**Emoji:** 🍳 · **Brand:** `amber-500` · **Players:** 3–6 in both modes · **Modes:** PTP · MDLM (recommended)
**Status:** gold master · verified against SW v211 on 27 August 2026

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
Kiss** — the full jackpot. Land it with a few of the table and it's a **Crowd-Pleaser**, worth half.
But if the whole kitchen wrote the same obvious thing, that's **Too Many Cooks** — everyone saw it
coming, so it's barely worth a token. And if you're the only one who thought of it, that's a **Table
for One** — nobody joined you, nothing scored.

Three decisions sit on top of that headcount, and they are what make a round a game rather than a
guess. You **back one of your three with a star** — your **Signature Dish**, worth double if it
lands in the golden range. You **Call the Crutch**: name the culinary cliché you reckon the *most*
Chefs will write, which you are forbidden from writing yourself. And the Order itself may arrive
bent out of shape by a **Special Instruction** — the same Pizza, now *…on a $5 budget*, or *…at 3am*
— which is the game's real lever: it flattens the obvious answer rather than punishing you for
reaching it.

The tension is entirely social: you have to guess not what's true about the dish, but what a *small*
number of your specific friends will also think of, without being the whole table's obvious first
idea. The game produces the recognisable, funny moment of two people locking eyes because they both
wrote "pineapple" on a pizza order, while everyone else stares at a screen full of near-misses.

---

## T3 — How to Play · *free*

**Setup.** Choose your Chef count and enter names (optional — they're just for the score sheet).

**The loop.** Each Course starts with **Today's Order** — a food word the whole table reads
together, carrying a **Special Instruction** if that setting is on. Then Chefs take turns privately
(pass-the-phone, or simultaneously in Lobby Mode) writing three ingredients, tapping the ⭐ on the
one they're backing, and calling their Crutch.

Once every Chef has served, **The Sifting** runs in two halves:

1. **Sous Chef's Check** — the ingredients, alphabetical, with **no counts on screen**. The table
   merges anything that's the same word spelt two ways. Nobody can see what a merge is worth, which
   is the whole point of doing it here.
2. **The Tasting** — the counts revealed, quietest first, then **The Callouts** with the Crutch
   results.

- **Table for One 🍽️** — only one Chef wrote it. Nothing, by default.
- **Chef's Kiss ✨** — exactly 2 Chefs wrote it. The full jackpot.
- **Crowd-Pleaser 👌** — 3 up to (but not including) every Chef wrote it. Half the jackpot.
- **Too Many Cooks! 🍲** — literally every Chef wrote it. A small token reward.

A **Signature Dish** that lands on a Chef's Kiss or a Crowd-Pleaser scores double; one that misses
still scores what it was worth, so the only loss is the double. A Crutch that names the round's
most-picked ingredient — provided 3 or more Chefs actually wrote it — is **Called It! 📣**, worth
half a jackpot. Then **The Tally** shows the round's points with each Chef's bonuses broken out, and
the game moves to the next Order.

**How it ends.** After the last Course, whoever has the highest total wins the **Final Wash-up**.

---

## T4 — Theme & Flavour · *free*

**The world.** A busy kitchen putting together the same dish from several Chefs' private
imaginations at once — playful cooking-show language layered over what's really a pure wavelength
game. Nothing here is a real recipe or a real kitchen; it's flavour dressing for a guessing game.

**The voice** stays in the kitchen bit throughout: settings live in "The Pantry," the reveal screen
is "The Sifting," the blind merge is the "Sous Chef's Check," the Crutch results are "The Callouts,"
quitting is "Kitchen Closed?", and Sylly Mode asks two Orders to become one dish under "Fusion
Cuisine." The tone is upbeat and a little theatrical — a cooking-competition host's energy, never a
real culinary lecture.

**The Special Instructions are the clearest expression of the voice** — twenty of them, deliberately
answerable by anyone rather than by a cook: *…on a $5 budget*, *…using only what's at the petrol
station*, *…for a barbecue in 38° heat*, *…but it's entirely beige*. Each is a constraint a whole
table can reason from, which is exactly why they flatten the obvious answer without rewarding
culinary knowledge.

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
| **Today's Order** | The food word revealed at the start of each Course. Two of them in Fusion Cuisine. |
| **Course** | One round — the unit the Courses setting counts. |
| **Special Instruction** | The twist appended to Today's Order — *…at 3am*, *…on a $5 budget*. One per Order, drawn from a deck of twenty. |
| **The Sifting** | The screen where the pot is resolved — two sub-states, the Check then the Tasting. |
| **Sous Chef's Check** | The blind first half: merge duplicate spellings with **no counts on screen**. |
| **The Tasting** | The scored second half: counts, badges, then The Callouts. |
| **Chef's Kiss ✨** | Exactly 2 Chefs matched — the Sweet Spot jackpot. |
| **Crowd-Pleaser 👌** | 3 up to N−1 Chefs matched — half the jackpot. |
| **Too Many Cooks! 🍲** | Every Chef matched — a token reward (or the Crowded Kitchen Tax, if that penalty is on). |
| **Table for One 🍽️** | Nobody else matched — no reward by default (or a penalty, if that's on). |
| **The Golden range** | Chef's Kiss + Crowd-Pleaser together — the band a Signature Dish must land in to double. |
| **Signature Dish 🌟** | The ingredient a Chef backs with the ⭐ — double points if it lands Golden. |
| **The Crutch** | The culinary cliché a Chef predicts the most Chefs will write. Never one of their own three, and never entered into the pot. |
| **Called It! 📣** | A correct Crutch — the round's most-picked ingredient, shared by 3 or more Chefs. Pays half a jackpot. |
| **The Callouts** | The section of The Tasting revealing every Crutch result, after the ingredient list. |
| **Crowded Kitchen Tax** | The opt-in Too Many Cooks penalty. |
| **Table for One Penalty** | The opt-in unmatched-ingredient penalty. |
| **Fusion Cuisine** | Sylly Mode — two Orders at once, one mash-up, and a name vote. |
| **Name the Dish** | The Fusion-only ballot screen where the table votes on the best name. |
| **On the Menu! ⭐** | The winning Fusion name — pays half a jackpot. Ties all pay. |
| **The Tally** | The per-Course score-reveal screen, with each Chef's bonuses broken out. |
| **Final Wash-up** | The end-of-game leaderboard screen. |
| **Chef's Cook Book 📖** | The per-Course score log shown on the Wash-up screen. |
| **New Shift** | Play again — resets round state, keeps names and settings. |
| **The Pantry 🍳** | The settings overlay's title. |

**Retired 27 Aug 2026** (do not reintroduce): A Bit Pongy, Nice Match, Kitchen Nightmares, the Poison
Word, the Health Inspector's Report, Today's Recipe, Sous Chef Oversight, Menu Complexity, Dishes,
Rotten Penalty, Spoilt Penalty, The Pantry Cabinet.

---

## T6 — Settings · *mixed — labels paired, values derived*

The settings overlay is titled **The Pantry 🍳** — *"Prep before you cook."*

| Setting | Options | Default | What it does in play |
|---|---|---|---|
| **Courses** | 3 · 5 · 10 | 3 | How many Orders in one meal. |
| **The Menu** | Everyday · Restaurant · Fine Dining | Restaurant | Which food-word difficulty tiers the Order is drawn from. Everyday and Fine Dining are each a single tier; Restaurant mixes easy and medium. |
| **The Sweet Spot** | 10 · 20 · 30 pts | 30 pts | Points for a 2-Chef Chef's Kiss — **and the one number every bonus derives from**: Called It! and On the Menu! each pay half of it. |
| **Table for One Penalty** | Off · On | Off | When ON, an unmatched ingredient costs −5 pts instead of scoring nothing. |
| **Crowded Kitchen Tax** | Off · On | Off | When ON, a Too Many Cooks ingredient costs −2 pts per Chef who picked it — **including you** — instead of the token reward. |
| **Sous Chef Check** | OFF / ON | ON | Gates the blind merge sub-state. OFF skips it entirely and The Sifting opens straight onto The Tasting. |
| **Specials Board** | OFF / ON | OFF | Lets the table reroll Today's Order — **and its Special Instruction** — before prepping starts. Unlimited rerolls. Host-only in Lobby Mode. |
| **Special Instructions** | OFF / ON | OFF | Every Order comes with a twist, drawn from a deck of twenty that never repeats until exhausted. |
| **✨ Sylly Mode** | OFF / ON | OFF | Fusion Cuisine. See T8. |

**Nine settings, and none of them changes the session's shape** — no player count, no team
structure, no mode. Special Instructions and Fusion Cuisine **stack** by design; whether three
simultaneous constraints is one too many is flagged for playtest in `docs/deferred-work.md` rather
than pre-emptively made mutually exclusive.

---

## T7 — The Player's Journey · *mixed — 7a derived, 7b paired, 7c free*

### T7a — The flow

| # | Screen | Beat | Type | Duration | Chrome |
|---|--------|------|------|----------|--------|
| 1 | `screen-jec-menu` | Pick your poison | Menu | — | 🔊 |
| 2 | `screen-jec-roster` | Kitchen Roster — count + names | Setup | — | 🔊 ✕ |
| 3 | `screen-jec-order` | Today's Order reveal (+ its Special Instruction; two words in Fusion) | Interactive | — | 🔊 ✕ |
| 4 | `screen-jec-prep` | Prep — three ingredients, the ⭐, the Crutch (+ the Fusion name). Sub-states: entry, or a pass gate between Chefs | Interactive / Gate | — | `[?]` 🔊 ✕ |
| 5 | `screen-jec-sifting` | The Sifting — sub-state A **Sous Chef's Check** (blind merges), then sub-state B **The Tasting** (counts + The Callouts) | Interactive | — | `[?]` 🔊 ✕ |
| 6 | `screen-jec-name-vote` | **Fusion only** — Name the Dish: sub-state A the ballot, then sub-state B the result | Interactive | — | `[?]` 🔊 ✕ |
| 7 | `screen-jec-tally` | Per-Course score breakdown + each Chef's bonuses | Summary | — | 🔊 ✕ |
| 8 | `screen-jec-washup` | The Final Wash-up | Result | — | 🔊 ✕ |

Rows 3–7 loop once per Course; **row 6 appears only in Fusion Cuisine**. Both `screen-jec-prep`,
`screen-jec-sifting` and `screen-jec-name-vote` are single registered screens with two JS-toggled
sub-states each, not six separate screens. The Sifting's Check sub-state is skipped whole when Sous
Chef Check is OFF.

**Overlays**

| Overlay | Opened from | What it is |
|---|---|---|
| `jec-settings-overlay` | Menu | The Pantry — the nine settings |
| `jec-how-to-overlay` | Menu, and the header `[?]` on Prep, Sifting and Name the Dish | How to Play — no tab bar (see T9) |
| `jec-quit-overlay` | Every in-game screen's ✕ | "Kitchen Closed?" mid-game quit confirm |
| `jec-oversight-overlay` | Sous Chef's Check (tap two ingredients) | "Sous Chef's Check" merge confirm |
| `jec-new-shift-overlay` | Wash-up | "New Shift?" play-again confirm |
| `jec-help-tip-overlay` | The three inline `[?]` on Prep — Signature, Crutch, Fusion name | Shared contextual tip overlay, three bullets |

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

Heading is built at runtime as *"Course N of M"*. The Reroll button appears only with the Specials
Board on, and never on a client. The hint line differs between standard and Fusion.

```copy
# screen-jec-order
Today's Order:
Reroll Order
Everyone read this together — each Chef will take a turn.
One dish, two Orders. Prep for the mash-up — and give it a name.
Start Prepping! →
```

#### Prep

The Chef's name line is built at runtime as *"[Name]'s Prep 🧑‍🍳"*. The Crutch section is always
present; the Fusion name section appears in Sylly Mode only.

```copy
# screen-jec-prep — entry
Today's Order 🧾
Prep your Ingredients!
Tap the ⭐ on the one you're backing — your Signature Dish scores double if it lands.
Call the Crutch
The one everyone leans on…
Every kitchen has one. Call the culinary cliché everyone leans on.
Name the Dish
What are we calling this?
Best name gets voted On the Menu — and takes half a jackpot.
Serve it Up!
```

```copy
# screen-jec-prep — validation errors
Add all 3 ingredients before serving!
You've already prepped that! Try a different ingredient. 🤔
Tap the ⭐ on your Signature Dish first!
Call the Crutch before you serve!
That's one of your own — call something you didn't write. 📣
Give the dish a name before you serve!
Ingredients submitted — waiting for the other chefs…
```

```copy
# screen-jec-prep — pass gate
The broth is simmering…
Pass to
Don't let them peek — it's their turn now.
I've got the phone!
```

#### The Sifting

Stage label and round label are set at runtime. In Lobby Mode a client's advance button reads the
waiting line instead of its live label.

```copy
# screen-jec-sifting
The Sifting
Today's Order
Sous Chef's Check
The Tasting
Tap two ingredients that are the same thing to merge them.
Start the Tasting
The Callouts
The Tally
Waiting for the Head Chef…
```

```copy
# screen-jec-sifting — badges
Table for One 🍽️
Chef's Kiss ✨
Crowd-Pleaser 👌
Too Many Cooks! 🍲
```

#### Name the Dish — Fusion only

The ballot heading is *"[Name], pick the best name"* in Pass-the-Phone and *"Pick the best name"* in
Lobby Mode. The winner lines are built at runtime around the winning Chef's name.

```copy
# screen-jec-name-vote
Name the Dish
Pick the best name
Vote in — waiting for the other chefs…
No name made the menu.
Nobody voted. Back to the pans.
The Tally
```

#### The Tally

The feedback line is one of three, picked by the round's best score.

```copy
# screen-jec-tally
Head Chef Status: Absolutely Cookin'! 🔥
Five-star effort right there! ⭐
Maybe stick to toast next time. 🍞
Next Course
```

#### Final Wash-up

The subtitle is *"[Name] wins the kitchen! 🎉"*, or the dead-heat line below.

```copy
# screen-jec-washup
Final Wash-up
The Final Wash-up
A dead heat in the kitchen!
Chef's Cook Book 📖
New Shift
← Back to the Box
```

#### Sous Chef's Check merge

```copy
# jec-oversight-overlay
Sous Chef's Check
Are these the same ingredient?
Yep — merge 'em!
Different things
```

#### Settings — The Pantry

```copy
# jec-settings-overlay — title
The Pantry 🍳
Prep before you cook.
```

```copy
# jec-settings-overlay — Courses and The Menu
Courses
How many Orders in one meal.
The Menu
How advanced the food on the Order can get.
Everyday
Restaurant
Fine Dining
```

```copy
# jec-settings-overlay — The Menu value line
Everyday uses only the easiest food words.
Restaurant mixes easy and medium food words.
Fine Dining uses only the hardest food words.
```

```copy
# jec-settings-overlay — The Sweet Spot
The Sweet Spot
Points for a 2-Chef match — the jackpot. Also sets every bonus at half that.
```

```copy
# jec-settings-overlay — the two penalties
Table for One Penalty
Nobody joined you on that ingredient.
Table for One costs −5 pts.
Crowded Kitchen Tax
Too many cooks spoil the broth.
−2 pts per Chef who picked it, including you.
```

```copy
# jec-settings-overlay — Sous Chef Check, Specials Board, Special Instructions
Sous Chef Check
Before anything is scored, merge ingredients that are the same word spelt differently.
Specials Board
Let the table reroll the Order before prepping starts. Unlimited rerolls — use fair play.
Special Instructions
Every Order comes with a twist — a budget, an occasion, a bit of chaos.
```

```copy
# jec-settings-overlay — Sylly Mode
✨ Sylly Mode
Fusion Cuisine
Two Orders drop at once. Prep three ingredients for the imagined mash-up, name the thing, then vote on the best name.
Done
```

#### How to Play

Step bodies carry inline `<span>` emphasis; only the headings are recorded verbatim here, per the
suite convention.

```copy
# jec-how-to-overlay — title
How to Play 🍳
Think the same as just enough people — not too many, not too few.
```

```copy
# jec-how-to-overlay — step headings
Step 1
Everyone sees the same Order.
Step 2
Each Chef secretly picks 3 ingredients.
Step 3
Back one with a star.
Step 4
Call the Crutch.
Step 5
Sous Chef's Check, then The Tasting.
Winning and Scoring
Most points after the last course wins.
✨ Sylly Mode
Fusion Cuisine
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

```copy
# jec-help-tip-overlay
Got it ✓
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

**The scoring numbers were stated in three places and agreed in none of them.** **RESOLVED 27 Aug
2026 (SW v211)** — bug J2. The How to Play overlay said the unmatched penalty was −10 while the
settings overlay and the code both said −5, and the tax line omitted that the count *includes you*.
The lesson is in the arithmetic of surfaces, not in the number: a value stated in copy has as many
sites as the app has surfaces — here three, one of them `js/secret-mode.js`, which no amount of
reading `index.html` would have found. Grep for the **number**, never the sentence.

**The contextual tip overlay shipped with no way to open it.** **RESOLVED 27 Aug 2026 (SW v211).**
`jec-help-tip-overlay`, its injector and its `resetToLobby()` teardown entry all existed; no button
anywhere called them. It was dead UI from the day it landed, invisible to every harness tier —
rules harnesses run with `getElementById: () => null`, and nothing asserts that a built overlay is
reachable. Three inline `[?]` icons on Prep now open it.

---

## T8 — Sylly Mode · *free*

**Fusion Cuisine.** Two Orders drop at once — *Sushi + Pizza* — and the table has to imagine the one
dish that both of them became.

**What changes.** Prep is unchanged in shape but harder in substance: three ingredients for a dish
nobody has ever eaten, still hunting the same narrow band of agreement. On top of that, every Chef
**names** the mash-up in the same pass — one text field, filled before you serve.

**Name the Dish.** After The Tasting, a new screen puts every name on the table and each Chef votes
for one that isn't their own. The winner goes **On the Menu! ⭐** for half a jackpot. **Ties are not
broken** — every tied name takes the bonus, which is deliberate: a dead heat between two good names
is a better outcome than an arbitrary winner, and it removes any reason to play a name safe.

**Why this and not sabotage.** Fusion Cuisine replaced *Kitchen Nightmares*, whose Poison Word let a
Chef zero out someone else's ingredient. That mechanic attacked the wrong axis — it made the game
adversarial without making the central guess any more interesting, and a poisoned Chef simply lost
points with nothing to decide about it. Fusion instead makes the **prompt** harder, which is the
same lever Special Instructions pull in the base game: flatten the obvious answer rather than punish
the player who found it.

**What it doesn't touch.** The Sweet Spot tiers, the Signature double, The Crutch and the Course
structure are all unchanged. Fusion adds a second Order and a vote; it rewrites no scoring rule.

---

## T9 — Art & Assets · *derived*

**Just Enough Cooks has no artwork of its own.** Every visual element is emoji (🍳, 🧾, 🤫, 🧑‍🍳,
🏆, ⭐, 📖) or plain text on white/tinted cards. There is no card, tile, or token art to convert, and
**correctly no How-to gallery tab** — a gallery tab renders a game's deck through its own render
seam, and JEC has neither. The ingredient lists and score cards are the whole visual surface.

**The word bank.** Today's Order is drawn from the shared `data/words.json` `food` category,
filtered by The Menu's difficulty tier — Everyday draws only the easiest tier, Fine Dining opens the
hardest tier exclusively (not cumulative with the others, unlike most difficulty settings in the
suite), Restaurant mixes easy and medium. In Secret Mode the pool comes from the active pack's
`food` words instead.

**The Special Instructions deck** is twenty strings in `JEC_INSTRUCTIONS` (`js/games/jec.js`),
grouped as budget/constraint, occasion, standard and chaos. It is shuffled and popped, reshuffling
only when exhausted, so a game never repeats an Instruction until it has seen all twenty. Twenty
instructions × ~100 food words ≈ 2,000 distinct prompts.

---

## T10 — At the Table · *derived — except the PTP judgement*

**Modes.** Pass-the-Phone and Multi-Device Lobby Mode (recommended) are both supported. There is no
Team Lobby Mode — Just Enough Cooks has no teams, only individual Chefs.

**Players.** 3 to 6 in both modes — Pass-the-Phone and Lobby Mode alike (see T7c; Lobby Mode was
locked to exactly 4 until 23 Aug 2026).

**Devices.** Pass-the-Phone shares one device for the whole game, handed off at every pass gate
between Chefs. MDLM gives one device per Chef.

**Shape-changing settings.** None of the nine settings alter player count or session structure.

**How it plays at each size**

| Players | What it feels like |
|---|---|
| **3** | The floor, and **deliberately binary** — with three Chefs there is no Crowd-Pleaser band at all: 2 matching is the jackpot, 3 is the token, and nothing sits between them. Fast and swingy rather than subtle. An accepted lump, not a bug. |
| **4** | The first size with all four tiers reachable, and the tightest spread — one Chef either side of the Kiss. |
| **5–6** | More room in the Crowd-Pleaser band, and a wider gap between a genuine Chef's Kiss and the table-wide Too Many Cooks. |

**Two accepted lumps in the curve** — both deliberate, both recorded here so a future balance pass
doesn't "fix" them:

1. **3 players has no middle band.** `jecBadge` gives Crowd-Pleaser to `2 < count < N`, which is
   empty at N = 3. The alternative — special-casing three players — would make the tier table say
   something different at one player count, and the binary version is legitimately fun.
2. **The Crowd-Pleaser band is flat.** It pays half a jackpot whether 3 of 6 or 5 of 6 Chefs
   matched. Scaling it by headcount was rejected: the whole design points at the *narrow* Kiss, and
   a graded middle band would blur the one distinction the game is actually about.

**Could it be Pass-the-Phone?** — ◇ *judgement, not spec*

**It already is, and both modes suit the game about equally.** The core mechanic — private,
simultaneous-in-spirit ingredient guessing revealed all at once — works whether the device is shared
(with a pass gate enforcing privacy) or individual (with real device-level privacy). Neither mode
changes what the game is testing; the choice is purely about whether the group has one phone or
several.

---
