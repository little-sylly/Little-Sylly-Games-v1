# Natural Selection

**Game 7** · `activeGameId: nat` · plugin `js/games/nat.js`
**Emoji:** 🦁 · **Brand:** `lime-600` · **Players:** 4–8 in Pass-the-Phone, 3–8 in Lobby Mode · **Modes:** PTP · MDLM (recommended)
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

Everyone else in the room knows exactly what animal they're describing. One person only knows the
broad category, and has to fake specific knowledge they don't have — in front of people who are
quietly comparing notes to work out who's faking it. It's a wildlife documentary that's turned into
an interrogation, and the tension comes from a single question every player is silently asking about
everyone else: *do they actually know what they're looking at, or are they just good at sounding
like they do?*

---

## T2 — The Premise · *free*

A new Specimen is drawn for every Habitat, and the group is split into three tiers of knowledge
without anyone announcing who's in which. The Lead Biologist sees the animal's full name. Every
Field Researcher gets one distinctive detail about it — no two researchers share the same clue. And
somewhere in the group sits The Mole, who's told nothing but the broad category — "Sea Creature,"
say — and has to improvise a convincing observation anyway.

Over a few Observation Days, everyone takes turns adding one word to the shared field notes — a
detail, an impression, anything that sounds like it comes from real knowledge of the animal. The
Mole is trying to sound like everyone else. Everyone else is trying to say something specific enough
to prove they know the animal, without being so specific that the group's collective picture
accidentally hands The Mole an easy tell.

Then the field notes are read back, and the group votes: who doesn't actually know what they're
looking at? If The Mole is caught, they get one last chance — name the actual Specimen from what
they've picked up secondhand — and if they can pull that off, they walk away with points anyway. The
game produces real, close-reading suspicion: people re-reading a vague word someone wrote three
minutes ago and deciding, out loud, whether it was cover or genuine hesitation.

---

## T3 — How to Play · *free*

**Setup.** Choose your Researcher count and enter names (or leave them blank for defaults). The
expedition runs across several Habitats — each one a fresh animal and a fresh set of secretly
assigned roles.

**The roles.** Every Habitat draws one Specimen and assigns three tiers of knowledge:

- **Lead Biologist** (one player) — sees the animal's full name.
- **Field Researchers** (everyone else, except The Mole) — each sees a different, distinctive
  detail about the animal. No two researchers see the same word.
- **The Mole** (one player) — only told the animal's broad category (its Grouping), never a
  scientific class name — just enough to fake it.

**The loop.** Over several Observation Days, players take turns — in a new random order each day —
adding exactly one word to the shared field notes describing the Specimen. You can't use the
animal's own name, and you can't repeat a word someone else has already used this Habitat. This
repeats for as many Days as the Habitat runs.

**The Selection.** Once every Day is complete, the full field notes are revealed to everyone at
once. Each player votes for who they believe is The Mole — either everyone votes together on one
shared screen (Field Consensus), or each player votes privately in turn (Independent). Whoever gets
the most votes is exposed. A tie is broken by lowest current Credibility; if it's still tied, no one
is exposed and The Mole escapes by default.

**The Last Stand.** If The Mole is caught, they get one final chance: name the actual Specimen,
using only what they picked up from the field notes. The Lead Biologist rules on whether the guess
is close enough to count.

**How it ends.** After the last Habitat, whoever has the most Credibility across the whole
expedition is named Lead Researcher.

---

## T4 — Theme & Flavour · *free*

**The world.** A wildlife documentary crew filming a new Specimen every Habitat — researchers taking
field notes, a Lead Biologist confirming identifications, one imposter trying to pass as a
colleague. The tone is BBC-nature-doco earnest, not sinister — it's playing "trained observers"
rather than "detectives."

**The voice** stays in that documentary register throughout: settings live in "The Permit Office,"
the vote is "The Classification," the final screen is the "Final Report" naming a "Lead Researcher
of the Expedition." Sylly Mode's name, "Survival of the Fittest," continues the same nature-doco
joke rather than breaking from it.

**On theme:** genuine curiosity about animals, the specific comedy of someone confidently describing
a detail they don't actually know, dry documentary narration energy.

**Off theme:** real accusation or interrogation framing, mockery of a player who gets caught, and
anything that treats The Mole's bluff as cheating rather than the entire point of the role.

Australian English throughout.

---

## T5 — Terminology · *paired*

| Term | Meaning |
|------|---------|
| **The Specimen** | The animal drawn fresh each Habitat. |
| **The Mole** | The player who only knows the Grouping — trying to blend in. |
| **Lead Biologist** | The player who sees the Specimen's full name. |
| **Field Researcher** | Every other player — each sees a different detail word about the Specimen. |
| **The Grouping** | The Mole's only information — a broad Documentary Label (e.g. "Sea Creature"), never a scientific class name. |
| **Observation Day** | One clue-submission pass — a Habitat runs several. |
| **The Field Notes** | The shared, growing list of every word submitted this Habitat. |
| **The Daily Review** | Sylly Mode only — all of a day's clues are revealed together before the next day begins. |
| **The Selection** | The vote to identify The Mole. |
| **The Classification** | Both the settings name for the voting mode, and the per-voter prompt during an Independent vote. |
| **Field Consensus** | The voting mode where everyone votes together on one shared screen. |
| **The Last Stand** | The Mole's final chance — naming the actual Specimen — after being caught. |
| **Credibility** | The score currency. |
| **New Expedition** | Play again — resets the match, keeps names and settings. |

---

## T6 — Settings · *mixed — labels paired, values derived*

The settings overlay is titled **The Permit Office 🦁** — *"Configure the expedition before you head
out."*

| Setting | Options | Default | What it does in play |
|---|---|---|---|
| **Days per Habitat** | 2 · 3 · 4 | 2 | How many Observation Days run before The Selection. |
| **Research Log** | OFF / ON | OFF | Researchers get a new clue word each day and see every previous word stacked, rather than just today's. |
| **Habitats** | 3 · 4 · 5 | 3 | How many different animals (rounds) the whole expedition runs. |
| **Field Difficulty** | Common · Rare · Exotic | Rare | Controls how common or exotic the Specimens drawn can be. |
| **The Classification** | Field Consensus · Independent | Field Consensus | Whether the group votes together on one screen, or each player votes privately in turn. |
| **Mole Escape Bonus** | 10 · 15 · 20 | 10 | Credibility awarded to The Mole for surviving The Selection undetected. |
| **Scientific Integrity** | Relaxed · Peer Review | Relaxed | Peer Review lets any player flag a clue during The Selection — a majority flag marks it Discredited and costs its author Credibility. |
| **✨ Sylly Mode** | OFF / ON | OFF | Survival of the Fittest. See T8. |

---

## T7 — The Player's Journey · *mixed — 7a derived, 7b paired, 7c free*

### T7a — The flow

| # | Screen | Beat | Type | Duration | Chrome |
|---|--------|------|------|----------|--------|
| 1 | `screen-nat-menu` | Pick your poison | Menu | — | 🔊 |
| 2 | `screen-nat-setup` | Researcher count + names | Setup | — | 🔊 |
| 3 | `screen-nat-habitat-intro` | "Habitat N" — a fresh Specimen | Interstitial | ~5s | none |
| 4 | `screen-nat-handover` | "Pass to …" | Gate | — | `[?]` 🔊 ✕ |
| 5 | `screen-nat-observation` | Add one word to the field notes | Interactive | — | `[?]` 🔊 ✕ |
| 6 | `screen-nat-daily-review` | "Today's Observations" (Sylly Mode only) | Interactive | — | 🔊 ✕ |
| 7 | `screen-nat-selection` | "The Field Notes Are In" — read, vote | Interactive | — | 🔊 ✕ |
| 8 | `screen-nat-last-stand` | The Mole's final guess + verdict | Interactive | — | 🔊 ✕ |
| 9 | `screen-nat-tally` | Per-Habitat score reveal | Summary | — | 🔊 ✕ |
| 10 | `screen-nat-gameover` | Final Report | Result | — | 🔊 ✕ |

Rows 3–9 loop once per Habitat, and rows 4–5 loop once per player per Observation Day within that.
`screen-nat-handover` is skipped entirely in Lobby Mode — each device shows its own role directly,
driven by a synced active-player index rather than a physical pass.

**Overlays**

| Overlay | Opened from | What it is |
|---|---|---|
| `nat-settings-overlay` | Menu | The Permit Office — the eight settings |
| `nat-how-to-overlay` | Menu, handover/observation `[?]` | How to Play — no tab bar |
| `nat-quit-overlay` | Every in-expedition screen's ✕ | "Abandon the expedition?" mid-game quit confirm |
| `nat-new-expedition-overlay` | Gameover | "New Expedition?" play-again confirm |
| `nat-help-tip-overlay` | Observation's inline `?` | Contextual tip, shared shape with the how-to `[?]` |

### T7b — The words on screen

#### The menu

```copy
# screen-nat-menu
Natural
Selection
One of you doesn't know what they're looking at.
Begin Observation
How to Play
Settings
← Back to the Box
```

#### Setup

```copy
# screen-nat-setup
The Research Team
Researchers
How many are joining the expedition?
Head Out →
```

#### Habitat intro

```copy
# screen-nat-habitat-intro
Survival of the Fittest is active — nobody sees the full name this Habitat.
```

#### Handover

```copy
# screen-nat-handover
Don't peek — hand it over.
Open Field Notes
```

#### Observation

```copy
# screen-nat-observation
Your observation…
Say your clue aloud, then submit.
Add to Journal
```

#### Daily Review

```copy
# screen-nat-daily-review
Today's Observations
Review together before continuing.
Day 2 →
```

#### The Selection

```copy
# screen-nat-selection
The Field Notes Are In
Cast your votes
Study the observations. Who doesn't belong?
Begin The Selection
0 of N votes assigned
Identify the Mole
```

#### The Last Stand

```copy
# screen-nat-last-stand
Final Identification
Final Identification.
Make your Final Identification — name the specimen.
The specimen is…
The Mole's final identification:
Their guess
The specimen
Is this close enough?
Submit Identification
Confirmed
Disputed ✕
```

#### Tally

```copy
# screen-nat-tally
Next Observation
```

#### Gameover

```copy
# screen-nat-gameover
Final Report
Lead Researcher of the Expedition
Expedition Log
New Expedition
← Back to the Box
```

#### Settings — The Permit Office

```copy
# nat-settings-overlay — title
The Permit Office 🦁
Configure the expedition before you head out.
```

```copy
# nat-settings-overlay — Days per Habitat and Research Log
Days per Habitat
How many observation cycles before the vote.
Research Log
Researchers get a new clue word each day and see all previous words stacked.
```

```copy
# nat-settings-overlay — Habitats and Field Difficulty
Habitats
How many different animals per expedition.
Field Difficulty
Controls how common or exotic the animals are.
Common
Rare
Exotic
```

```copy
# nat-settings-overlay — The Classification and Mole Escape Bonus
The Classification
How the group identifies the anomaly.
Field Consensus
Independent
Mole Escape Bonus
Credibility awarded to the Mole for surviving the round undetected.
```

```copy
# nat-settings-overlay — Scientific Integrity and Sylly Mode
Scientific Integrity
Relaxed: no penalties for vague observations. Peer Review: during Selection, flag any clue — a majority marks it Discredited and costs the author Credibility.
Relaxed
Peer Review
✨ Sylly Mode
Survival of the Fittest
Day 1 everyone shares the same broad clue. Day 2 and beyond, researchers reveal their specific detail while the Mole holds on.
Done
```

#### How to Play

```copy
# nat-how-to-overlay — title
How to Play 🦁
Natural Selection — a wildlife documentary goes wrong.
```

```copy
# nat-how-to-overlay — steps
Step 1
Roles are Assigned.
Each habitat draws a new Specimen. Roles are secretly assigned and revealed one at a time:
🔬 Lead Biologist (1)
— sees the full animal name.
📋 Field Researchers
— each sees a different detail word about the animal.
🕵️ The Mole (1)
— only knows the broad grouping (e.g. "Sea Creature"). Trying to blend in.
Step 2
The Observation.
Over several Observation Days, each player submits one word to describe the Specimen. Turn order is random each day. You can't use the animal's name, and you can't repeat a word already given this habitat.
Step 3
The Selection.
Once all days are done, the field notes are revealed. Each player votes for who they think is The Mole. Most votes = exposed.
Step 4
The Last Stand.
If The Mole is caught, they get one final chance — name the Specimen. The Lead Biologist decides if it counts. +10 Credibility either way for a correct guess.
Winning and Scoring
Credibility decides the winner.
Mole escapes →
+Escape Bonus
to The Mole.
Mole names Specimen correctly →
+10
to The Mole.
Mole caught →
+10
to each Field Researcher & Biologist.
Discredited clue (Peer Review) →
−5
to the author.
✨ Sylly Mode
Survival of the Fittest
No Lead Biologist. Every player gets a detail word — including the player normally in that role. All clues stay hidden until
The Daily Review
reveals them before voting.
Got it
```

#### Quit and play-again

```copy
# nat-quit-overlay
Abandon the expedition?
All observations and Credibility will be lost.
Yeah, pack up.
Keep watching.
```

```copy
# nat-new-expedition-overlay
New Expedition?
Pack up camp and start fresh with the same researchers.
Begin Expedition
Stay at Camp
```

### T7c — Where the journey is thin

**◇ judgement, not spec.**

**Pass-the-Phone can't reach the Lobby Mode floor.** `getMinPlayers()` for Natural Selection returns
3, but the Researcher-count pills on `screen-nat-setup` only offer 4 through 8 — there is no way to
start a 3-player expedition in Pass-the-Phone. Whether that's an intentional floor for the
single-device mode (three roles at three players leaves no spare Field Researcher, which may simply
play badly) or a pill row that never got updated to match the engine minimum isn't recorded
anywhere.

**Mid-game quit didn't dissolve the Lobby Mode session for the rest of the group.** **RESOLVED 23 Aug 2026 (SW v210).**
`natConfirmQuit()` cleared `natHabitatIntroTimer`, closed the overlay and called
`showScreen('screen-nat-menu')` unconditionally, stranding the quitting player on the local menu
while still occupying a Firebase room slot. NAT was **not** flagged for this during the identity-doc
pass — it surfaced only when the fix for the five games that *were* flagged went looking for every
instance, and NAT, LTTP and DSD all had the identical unconditional handler. That is the lesson
worth keeping: the identity pass found the bug class, but reading eight docs one at a time is not
the same as grepping the suite for the shape. Eight games were missing the quit contract in total (LI5, GM, SS, JEC, YGI, LTTP,
NAT, DSD); all eight now call the new engine helper `mpNotifyPlayerLeft()`, and
`node tools/verify-mp-configs.js` § 6 asserts it for all 18.

**The Daily Review screen (Sylly Mode only) has no `[?]`.** Every other Interactive screen in the
loop carries a help button; the one screen unique to Survival of the Fittest doesn't.

**The Suspicion Log only appears for one specific outcome.** The Tally screen's `nat-tally-suspicion`
block — showing who voted for whom — only renders when The Mole was caught but then guessed the
Specimen incorrectly. Every other outcome (Mole escapes, Mole caught and guesses correctly) tallies
silently, so the vote breakdown itself is only ever visible in the least flattering result for The
Mole. Whether that's deliberate ("only show the receipts when it actually mattered") or an
oversight isn't recorded.

---

## T8 — Sylly Mode · *free*

**Survival of the Fittest.** The name keeps the nature-documentary joke going — this is the mode
where nobody gets the easy, fully-informed Lead Biologist role, and everyone has to earn their
knowledge the hard way.

**What changes.** There is no Lead Biologist at all. Every player — including whoever would
normally have held that role — receives one of the detail words instead, the same way a Field
Researcher normally would. The Mole still receives only the Grouping. On Day 1, this means the whole
group (bar The Mole) is working from the same tier of partial knowledge rather than one player
holding the full picture.

The other change is when clues become visible. Rather than clues appearing in the shared field
notes as they're submitted, the whole day's words stay hidden from everyone until **The Daily
Review** — a dedicated screen shown at the end of each Observation Day, revealing that day's clues
together before the group moves on. This turns each day into its own small reveal beat rather than
one continuously accumulating log.

**What it doesn't touch.** Scoring, voting, and eviction rules are all unchanged — Survival of the
Fittest changes who knows what and when it's revealed, not how the match is won.

---

## T9 — Art & Assets · *derived*

**Natural Selection has no artwork of its own.** Every visual element is emoji (🦁, 📱, 🕵️, 🔬, 📋)
or plain text on white/tinted cards. There is no card, tile, or token art to convert, and no How-to
gallery tab — the game's whole surface is the field notes and the role cards, not an illustrated
deck.

**The Specimen bank.** Specimens are drawn from the shared `data/words.json` `animals` category.
Every animal entry's `nono_list[0]` is a Documentary Label (a Broad Shield like "Sea Creature"),
never a scientific class name — that field is dual-use with Like I'm Five and is governed by the
Dual-Use Contract in `CLAUDE.md`. `nono_list[1–9]` supplies the Field Researchers' distinctive
detail words. Field Difficulty controls which difficulty tiers are eligible: Common draws only
tier 1, Rare draws tiers 1–2, Exotic opens the full tier 1–3 pool.

---

## T10 — At the Table · *derived — except the PTP judgement*

**Modes.** Pass-the-Phone and Multi-Device Lobby Mode (recommended) are both supported. There is no
Team Lobby Mode — Natural Selection has no teams, only individual roles.

**Players.** 4 to 8 in Pass-the-Phone (see T7c on the PTP/MDLM floor mismatch); 3 to 8 in Lobby
Mode.

**Devices.** Pass-the-Phone shares one device for the whole expedition, handed off at every
handover gate. MDLM gives one device per player, with the handover screen skipped entirely — each
device shows its own role directly.

**Shape-changing settings.** None. No setting alters player count or role structure.

**How it plays at each size**

| Players | What it feels like |
|---|---|
| **3–4** | Thin margins — with only one or two Field Researchers besides the Lead Biologist, The Mole has fewer voices to blend into, and a single well-placed vote can expose them fast. |
| **5–6** | The comfortable middle — enough distinct detail words in circulation that The Mole has real cover, but still few enough that the group can hold the whole field notes in their heads. |
| **8** | The most crowded field notes and the longest Observation Days — The Mole has the most voices to hide among, but The Selection's vote-reading phase takes longer with more entries to weigh. |

**Could it be a Team Lobby Mode?** — ◇ *judgement, not spec*

**No, and this one's structural rather than a delivery choice.** Natural Selection's tension is
built entirely on individual, secret roles inside one group — there are no teams to split a shared
device between. Pass-the-Phone already serves the "everyone's in one room, one device" case; the
only real alternative is MDLM's private per-device roles, which the game already has.

---
