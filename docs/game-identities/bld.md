# Bailed

**Game 11** · `activeGameId: bld` · plugin `js/games/bld.js`
**Emoji:** 💬 · **Brand:** dark red `#991b1b` (red-800) · **Players:** 5–10 · **Modes:** MDLM + PTP
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

Someone in the group chat is going to flake, and everyone else has to figure out who before it costs
them the night. Five plans need to happen — book the place, sort a driver, grab food, get the
drinks, actually show up to the party — and secretly, some of your friends want every single one to
fall through. It's Avalon/The Resistance dressed as the most relatable social friction there is: the
group chat that agrees on a plan and then somehow, mysteriously, doesn't follow through. No hidden
maps, no combat, no dice — just five rounds of "who do we trust to actually turn up," playable with
five to ten people and requiring nothing but a room full of friends and their phones.

---

## T2 — The Premise · *free*

You're in the group chat, plans are being made, and somewhere among your friends are people who
genuinely do not want tonight to happen. A Planner proposes who's handling each job — booking the
place, driving, food, alcohol, actually showing up — and everyone votes on whether that group
sounds right. Get it approved, and that group secretly decides whether they're actually in. Just
one bail, hidden among however many "I'm In"s, and the whole plan collapses with a bad excuse
attached.

The tension is entirely social. There's no dice roll deciding whether the food pickup goes well —
there's only whether the people you sent to get it wanted it to go well in the first place. Every
rejected nomination burns patience the group doesn't have unlimited amounts of; five rejections in a
row and the Flakes win without lifting a finger. Every failed plan comes with a phrase that sounds
exactly like something an actual friend would say to get out of something.

What it produces at the table is genuine, pointed accusation ("why did YOU vote against that
group?"), the specific betrayal of watching a trusted friend's name turn up on the wrong side at the
end, and a lot of very funny excuses for why the drinks never showed up.

---

## T3 — How to Play · *free*

**Setup.** Every player is secretly assigned to one of two teams — **Friends**, who want every plan
to succeed, or **Flakes**, who want them to fail without getting caught. Nobody but the Flakes
themselves know who the other Flakes are.

**The loop.** Five plans run in sequence — Booking Accommodation, Who's Driving, Food Pickup,
Alcohol Run, and The Big Party — each needing a different-sized group:

- **Nominate.** The Planner (rotating by seat order) picks who's in the group for this plan.
- **Vote.** Everyone votes **Sounds Good** or **No Way**. A majority approves the group; ties go to
  the Friends. A rejected group means the next player nominates again — up to five attempts. If the
  fifth nomination is rejected too, **the Flakes win outright**, no mission needed.
- **The mission.** Once a group is approved, every member privately submits a card: **I'm In**, or
  (Flakes only) **I Bailed**. Friends must always play I'm In. Even one bail fails the plan.

**How it ends.** Friends win the moment 3 plans succeed. Flakes win the moment 3 plans fail, or the
moment a group's fifth nomination is rejected — whichever comes first.

---

## T4 — Theme & Flavour · *free*

**The world.** A friend group's group chat, rendered completely literally — the setup screen's
eyebrow reads "The Group Chat", the settings overlay is titled "Bailed 💬", and every plan is a
mundane pre-party task everyone has actually lived through. There's no fantasy layer between the
mechanic and the theme; social deduction *is* the plot.

**The voice** is dry, familiar, and very Australian — the fail phrases are the game's real writing
showcase. A failed Booking Accommodation reads *"I thought someone else was handling the booking"*;
a failed Alcohol Run reads *"They were out of what we wanted, so I bailed"*; and by the final plan
the excuses get openly absurd — *"Okay so there was an elephant. At the bottle shop. I'm serious."*
A success gets its own dry one-liner too: *"A modern miracle. We actually went."*

**Australian English throughout**, as everywhere in the suite — colour, not color; metric where
anything is measured at all.

**On theme:** the specific, universal experience of a group chat that makes plans and then
quietly, individually, doesn't come through. Every excuse is written to sound exactly like something
a real friend would actually text.

**Off theme:** genuine malice, real consequence, or framing a Flake's bail as an actual betrayal
outside the game. The tone throughout is "we've all been this person," never villainy.

---

## T5 — Terminology · *paired*

| Term | Meaning |
|------|---------|
| **Friends** | The cooperative team — want all 5 plans to succeed. |
| **Flakes** | The hidden saboteurs — want plans to fail. |
| **Pot-Stirrer** | Drama Mode — a Friend who secretly knows every Flake's identity. |
| **Big Flake** | Drama Mode — one Flake who, if the Friends would win, gets one guess at the Pot-Stirrer to steal the win. |
| **The Planner** | The current player nominating a group. |
| **The Group** | The nominated subset of players who play mission cards. |
| **Mission Card** | Each group member's private submission — I'm In, or (Flakes only) I Bailed. |
| **Bail** | The sabotage card — one bail in the group fails the plan. |
| **Patience** | How many nomination attempts remain (5 max) before the Flakes win by exhaustion. |
| **Bailed** | The game's own name, and the plan-failure verb. |
| **Drama Mode** | Sylly Mode — adds the Pot-Stirrer and Big Flake roles. |
| **The Itinerary** | The plan-by-plan history, shown in-game and on the aftermath screen. |
| **The Receipts** | The per-plan history detail overlay — nomination votes, mission cards, the outcome. |
| **Second Chances** | Play-again heading — resets roles, keeps names and settings. |
| **Leave the Chat?** | Quit confirm heading. |
| **The Group Chat** | The setup screen's eyebrow label — not the settings overlay title. |

---

## T6 — Settings · *mixed — labels paired, values derived*

The settings overlay is titled **Bailed 💬** — *"Toggle Drama Mode on or off before play."* Bailed
runs the smallest settings surface in the suite: player count and Sylly Mode, nothing else.

| Setting | Options | Default | What it does in play |
|---|---|---|---|
| **Players** | 5 / 6 / 7 / 8 / 9 / 10 | 5 | How many are in the group — sets the Friend/Flake split and every plan's group size. |
| **✨ Sylly Mode** | OFF / ON | OFF | Drama Mode. See T8. |

**No word-difficulty tier.** Bailed has no word bank at all — it's a pure social deduction game with
no content pool to set a difficulty on.

---

## T7 — The Player's Journey · *mixed — 7a derived, 7b paired, 7c free*

### T7a — The flow

| # | Screen | Beat | Type | Duration | Chrome |
|---|--------|------|------|----------|--------|
| 1 | `screen-bld-menu` | Pick your poison | Menu | — | 🔊 |
| 2 | `screen-bld-setup` | PTP only — player count + names | Setup | — | 🔊 |
| 3 | `screen-bld-seating` | MDLM host only — confirm seat order before roles deal | Setup | — | 🔊 |
| 4 | `screen-bld-pass-gate` | PTP only — pass-the-phone gate before each role reveal | Gate | — | 🔊 |
| 5 | `screen-bld-role-reveal` | Friend, Flake, Pot-Stirrer, or Big Flake | Interactive | — | `[?]` 🔊 |
| 6 | `screen-bld-main` | Nominate, vote, submit missions, watch plans resolve — the entire loop | Interactive | — | `[?]` 🔊 ✕ |
| 7 | `screen-bld-aftermath` | Full role reveal + The Itinerary | Result | — | 🔊 ✕ |

`screen-bld-main` carries the entire play loop inside a single screen's sub-states (nominating,
voting, vote-pending, vote result, mission, mission-pending, plan result, and — Drama Mode only —
the drama-lock identification phase), rather than a screen per phase, since the whole loop repeats
five times a match and a screen change per phase would slow the read.

**One screen has no ✕ exit** — `screen-bld-seating` carries only the speaker icon. See T7c.

**Overlays**

| Overlay | Opened from | What it is |
|---|---|---|
| `bld-settings-overlay` | Menu | Bailed — player count and Drama Mode |
| `bld-how-to-overlay` | Menu, main `[?]` | How to Play |
| `bld-role-help-overlay` | Role reveal `[?]` | Role-specific rules reference |
| `bld-tip-overlay` | Five inline `[?]` buttons on the main screen | Shared contextual tips — Planner, Patience, Nominating, Vote, Mission |
| `bld-plan-detail-overlay` | Itinerary tiles, in-game and on aftermath | "The Receipts" — per-plan nomination/vote/mission history |
| `bld-pass-reveal-overlay` | PTP only, before voting/mission submission | Pass-the-phone gate |
| `bld-quit-overlay` | Main ✕ | Mid-game quit confirm |
| `bld-second-chances-overlay` | Aftermath | Play-again confirm |

### T7b — The words on screen

#### The menu

```copy
# screen-bld-menu
Bailed
Making plans is easy. Showing up is hard.
Make the Plans
How to Play
Settings
← Back to the Box
```

#### Setup (PTP)

```copy
# screen-bld-setup
The Group Chat
Who's in the Group Chat?
Enter everyone's name — roles will be assigned secretly.
Players
Deal the Roles →
```

#### Seating (MDLM host)

```copy
# screen-bld-seating
Set the Seating Order
Top = Seat 1. Planner rotates in seat order.
🔀 Randomise Order
Confirm Seating →
```

#### The pass gate

```copy
# screen-bld-pass-gate
Don't look until it's yours.
Tap to Reveal
```

#### Role reveal

```copy
# screen-bld-role-reveal
Got it — pass the phone
```

```copy
# screen-bld-role-reveal — role names and descriptions
The Pot-Stirrer
You're a Friend — but you know who all the Flakes are. Steer the group quietly. If anyone figures you out, it could cost everyone.
The Flake
You're a Flake. Make sure the plans fail — without getting caught.
You're a Flake. Make sure the plans fail — without getting caught. You're on your own.
You're the Big Flake — if the Friends win, you get one chance to name The Pot-Stirrer.
A Friend
You're a Friend. Vote honestly, pick the right group, and make sure the plans go ahead.
```

#### The main loop

```copy
# screen-bld-main — nominating
Lock in the Group →
```

```copy
# screen-bld-main — voting
The Group
Sounds Good
No Way
Tallying votes…
```

```copy
# screen-bld-main — mission
You're in the group
Submit your decision.
I'm In
I Bailed
Waiting for the group's decision…
Checking the receipts…
```

```copy
# screen-bld-main — plan result and drama lock
Next Plan →
The Flakes are plotting…
Who is The Pot-Stirrer?
They're a Friend who knew all along.
Make the Accusation →
```

Bail-count and result phrasing is built at runtime — *"[N] person/people bailed."* followed by a
plan-specific excuse (see T7c), or a plan-specific success line on a clean run.

#### Aftermath

```copy
# screen-bld-aftermath
The Itinerary
Who Was Who
Second Chances
← Back to the Box
Reveal Everyone →
```

The headline, drama-lock outcome card, and role list are all built at runtime from the match
result — *"The Big Flake nailed it. The Pot-Stirrer was [Name]. The Flakes steal the win."* or
*"The Pot-Stirrer was [Name]. The Friends keep their win."*

#### Settings

```copy
# bld-settings-overlay
Bailed 💬
Toggle Drama Mode on or off before play.
✨ Sylly Mode
Drama Mode
One Friend secretly knows all the Flakes — but can only hint, never name names. And if the Flakes figure out who they are, they win anyway.
Done
```

#### How to Play

```copy
# bld-how-to-overlay — title
How to Play 📋
A social deduction game of trust, betrayal, and terrible excuses.
```

```copy
# bld-how-to-overlay — steps
Everyone gets a secret role
Roles per player count
Picking the group
The mission cards
Five plans, pass the phone
Winning and Scoring
First to three wins
```

```copy
# bld-how-to-overlay — Sylly Mode card
Drama Mode
```

#### The Receipts

```copy
# bld-plan-detail-overlay
The Vote
```

#### Quit and confirms

```copy
# bld-quit-overlay
Leave the Chat?
The group will keep planning without you.
Let's Bail
Not yet!
```

```copy
# bld-second-chances-overlay
Second Chances?
Roles will be reshuffled. The group plans a new party.
Second Chances
Stay here
```

### T7c — Where the journey is thin

**◇ judgement, not spec.**

**The fail phrases are the best writing in the game, and only about a third of players will ever
read most of them.** Each of the five plans has its own pool of five-to-seven bail excuses — the
final plan's pool alone runs from mundane ("just really not feeling it") to gleefully absurd ("so
there was an elephant. At the bottle shop."). A Friends-only playthrough with no bails ever sees the
success lines instead, which are funny but far shorter — the game's funniest writing is gated behind
the outcome nobody's actually trying to produce.

**`screen-bld-seating` carries only the speaker icon, no ✕.** A non-host client with nothing to do
but wait on this host-only screen has no way to leave on their own — the same shape as Pass's
untracked seating/round-wrap exits, a small recurring gap across the suite's host-gated screens.

**Drama Mode's Pot-Stirrer is genuinely hard to write flavour for**, because the entire mechanic
depends on nobody but the Flakes and the Pot-Stirrer themselves ever learning who it is during play
— the identity is deliberately withheld from the UI until the aftermath. This is correct design, not
a gap, but it does mean Drama Mode's richest character (a Friend secretly playing a double game) is
the one role the document can describe but the table itself never gets to watch unfold live.

---

## T8 — Sylly Mode · *free*

**Drama Mode.** Adds two secret roles on top of the base Friends/Flakes split:

- **The Pot-Stirrer** — a Friend who secretly knows every Flake's identity from the start. They can
  steer the group's nominations and voting with that knowledge, but they can never say who the
  Flakes are outright — only hint, never name names.
- **The Big Flake** — one specific Flake. If the Friends would otherwise win by reaching 3 successful
  plans, the game doesn't end yet: the Big Flake gets exactly one guess at the Pot-Stirrer's
  identity, choosing only from the players who aren't Flakes. Guess correctly, and **the Flakes steal
  the win outright**. Guess wrong, and the Friends keep it.

**What changes in feel, not just rule.** The base game's information is purely social — you're
reading people's votes and nominations. Drama Mode adds one player (the Pot-Stirrer) who is
genuinely playing a harder game than everyone else: quietly useful to the Friends without ever being
provably so, because being caught exposes nothing to the group but does hand the Flakes a second
chance at the very end. It turns the endgame from "Friends won" into "did the Flakes figure out who
was secretly steering against them" — a genuine last-second swing that the base game has no
equivalent for.

---

## T9 — Art & Assets · *derived*

**Bailed has no card, dice, or tile artwork of any kind.** Its entire visual surface is emoji and
text — role reveals use a single emoji per role (✅ Friend, 🚪 Flake, 🤫 Pot-Stirrer), plans are
represented by their own emoji (🏠 🚗 🍕 🍾 🎉), and nothing in the game is rendered through an
asset-pack seam. There is no core art pack, no skin pack, and no How to Play gallery tab — social
deduction games in this suite don't carry the kind of discrete "card" content a gallery would
enumerate, so `docs/art-authoring-guide.md` has nothing to brief for this game.

---

## T10 — At the Table · *derived — except the PTP judgement*

**Modes.** The suite's second-most flexible game on this axis — **both Pass-the-Phone and
multi-device are fully supported**. PTP uses `screen-bld-setup` for name entry and
`screen-bld-pass-gate` before every role reveal and every voting/mission submission; MDLM skips both,
pulling names straight from the lobby roster.

**Players.** 5 to 10 — among the widest ranges in the suite. Both the Friend/Flake split and every
plan's group size scale with player count off a fixed lookup table (`docs/code-map.md` owns the
exact numbers).

**Devices.** One per player in MDLM; a single shared device walking through the pass-gate in PTP —
each reveal is gated so nobody sees a role that isn't theirs.

**Shape-changing settings.** None beyond Players itself, which is really session configuration
rather than a mid-game-altering setting — it's fixed once the match starts.

**How it plays at each size**

| Players | What it feels like |
|---|---|
| **5** | The tightest ratio (3 Friends, 2 Flakes) — every vote matters enormously, and a single wrong nomination can be nearly fatal. |
| **6–8** | The comfortable middle — enough Friends that one bad read doesn't sink the match, and Plan 4's 7+-player two-bail requirement starts to matter. |
| **9–10** | The largest tables — 6 Friends and up to 4 Flakes, longer nomination cycles, and genuinely harder deduction with more suspects in play. |

**Could it be Pass-the-Phone?** — ◇ *judgement, not spec*

**It already is, and does it well.** Bailed is one of the small handful of games below the game-9
cliff that never went MDLM-only — its pass-gate discipline (a named gate before every private reveal,
never skippable) is the reference implementation the suite's own Pass-the-Phone Safety Gate rule
points to. There's no further question to answer here; both modes have run since launch.

---
