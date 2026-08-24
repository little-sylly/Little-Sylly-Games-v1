# You Get It?

**Game 5** · `activeGameId: ygi` · plugin `js/games/ygi.js`
**Emoji:** 🃏 · **Brand:** `orange-500` · **Players:** 3–6 in both modes · **Modes:** PTP · MDLM (recommended)
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

Everyone gets the exact same fill-in-the-blank sentence, and everyone answers it completely
differently — and the group votes for whoever nailed it, not for whoever's the funniest, but for
whoever's answer made everyone go "oh my god, same." It's a party game built entirely around the
specific joy of being deeply, embarrassingly understood by your friends.

---

## T2 — The Premise · *free*

Every round is the same shape: a single situation gets read aloud — a flat, neutral sentence with a
blank in it — and everyone secretly fills that blank with their own number and their own detail.
Then all the answers get laid out together, anonymous, sorted from smallest to biggest, and the
whole group reads them out loud one after another.

Nobody knows whose answer is whose. The group just votes for the one they relate to most — the
answer that made someone go "oh no, that's actually me." It's not a joke contest, though the
funniest answers often win anyway, because being that specifically, embarrassingly accurate about
your own life *is* the joke.

If Sylly Mode is on, one of the answers in the lineup isn't even real — a pre-written ghost card
slipped in anonymously — and if the group ends up giving The Nod to the fake instead of a real
person, everyone pays for it. The game produces the very particular, warm kind of laughing that
comes from a room full of people realising they're all a little bit the same kind of mess.

---

## T3 — How to Play · *free*

**Setup.** Choose your player count and enter names.

**The loop.** Each round is one Situation — a fill-in-the-blank statement with a gap in it. Players
pass the phone around (or, in Lobby Mode, answer privately on their own device) and each secretly
submits their own **Take**: a Number and a short phrase (the Metric) that together fill the gap.

Once everyone's submitted, **The Lineup** reveals every Take at once — anonymous, sorted lowest to
highest — and the group reads them aloud together. Then comes **The Nod**: everyone votes for the
Take they relate to most (never their own). Voting can happen two ways, set in Settings: **The
Consensus**, where the whole group votes together on one shared screen, or **Your Call**, where each
player votes privately in turn.

**Scoring.** Each voter's top three picks award points — 3 for 1st, 2 for 2nd, 1 for 3rd — to
whoever they voted for. Whoever earns the most votes this round also gets a bonus for being the
round's **Local Legend**. Running totals carry across every Situation in the session.

**How it ends.** After the last Situation, whoever has the highest score wins. If **The Decider** is
set to Solo Take and the final scores are tied, a **Sudden Death** round breaks it — the tied
players answer one last question, highest number wins.

---

## T4 — Theme & Flavour · *free*

**The world.** No fictional framing at all — this is the group's own real life, laid bare one
fill-in-the-blank sentence at a time. The comedy comes from recognising yourself (or a friend) in a
brutally specific answer, not from any invented setting.

**The voice and content rules are set in full by `docs/ygi-content-guide.md`** — this section
summarises rather than duplicates it. In short: every prompt is a neutral "straight man" setup with
no punchline baked in (the ringer/player answer delivers the joke, never the prompt), written as a
"modular glue" sentence flexible enough to take a time, a percentage, a dollar figure, or a headcount
without breaking its grammar. **The test that guide sets is the right one for this whole game: read
every possible answer aloud as a complete sentence — if it doesn't parse, the prompt is wrong, not
the answer.**

**Australian English is load-bearing, not decorative** — the content guide names specific swaps
(boot not trunk, kerb not curb, Tim Tams and Zooper Doopers over generic brand references) because
the whole joke depends on feeling like a real conversation with real friends, not a translated one.

**On theme:** the "Intelligent Beginner" persona — smart enough to know the maths of a situation,
silly enough to do it anyway. Relatable everyday absurdity: procrastination, brutal self-aware
statistics, small financial regrets.

**Off theme:** jokes that only land for a niche in-group, punchlines written into the prompt itself,
anything unkind rather than self-deprecating.

---

## T5 — Terminology · *paired*

| Term | Meaning |
|------|---------|
| **The Situation** | The fill-in-the-blank statement read aloud each round. |
| **The Gap** | The blank in the Situation — shown as `________` on screen. |
| **The Take** | A player's combined Number + Metric response. |
| **The Lineup 🃏** | The reveal screen showing every Take side-by-side, anonymous. |
| **The Nod** | The act of voting — giving a nod to the Take you relate to most. |
| **Your Call** | A Verdict Style — each player gives The Nod privately, one at a time. |
| **The Consensus 🏟️** | A Verdict Style — the whole group gives The Nod together on one shared screen. |
| **The Verdict 🏆** | The vote-ranking screen. |
| **The Record 📋** | The round-by-round history carousel on the gameover screen. |
| **The Ringer 🃏** | Sylly Mode's ghost card — a pre-written Take injected anonymously into The Lineup. |

---

## T6 — Settings · *mixed — labels paired, values derived*

The settings overlay is titled **House Rules 💡** — *"Set it before you take it."*

| Setting | Options | Default | What it does in play |
|---|---|---|---|
| **Situations** | 3 · 5 · 8 | 5 | How many rounds the session runs. |
| **The Decider** | Split Take · Solo Take | Split Take | What happens if the final scores are tied — Solo Take triggers a Sudden Death; Split Take shares the win. |
| **Full Tally** | OFF / ON | OFF | Shows the complete vote ranking rather than just the top 3. |
| **Verdict Style** | The Consensus · Your Call | The Consensus | Whether the group votes together on one shared screen, or privately, one player at a time. Forced to Your Call in Lobby Mode, since The Consensus needs a shared device. |
| **✨ Sylly Mode** | OFF / ON | OFF | The Ringer. See T8. |

Player count (3–6, default 4) is set on the setup screen, not in this overlay.

---

## T7 — The Player's Journey · *mixed — 7a derived, 7b paired, 7c free*

### T7a — The flow

| # | Screen | Beat | Type | Duration | Chrome |
|---|--------|------|------|----------|--------|
| 1 | `screen-ygi-menu` | Pick your poison | Menu | — | 🔊 |
| 2 | `screen-ygi-setup` | Who's In? — count + names | Setup | — | 🔊 |
| 3 | `screen-ygi-pass` | "Pass to …" | Gate | — | 🔊 ✕ |
| 4 | `screen-ygi-prompt` | "New Situation Dropping..." | Interactive | — | 🔊 ✕ |
| 5 | `screen-ygi-input` | Submit your Take | Interactive | — | `[?]` 🔊 ✕ |
| 6 | `screen-ygi-reveal` | The Lineup | Interactive | — | 🔊 ✕ |
| 7 | `screen-ygi-vote` | The Verdict — give The Nod | Interactive | — | 🔊 ✕ |
| 8 | `screen-ygi-results` | The Tally | Summary | — | 🔊 ✕ |
| 9 | `screen-ygi-sd-intro` | Sudden Death! | Interactive | — | 🔊 ✕ |
| 10 | `screen-ygi-sd-input` | Your final answer | Interactive | — | 🔊 ✕ |
| 11 | `screen-ygi-gameover` | Final Standings | Result | — | 🔊 ✕ |

Rows 3–5 loop once per player per round; rows 4–8 loop once per round. Rows 9–10 only fire when The
Decider is Solo Take and the final scores are tied. `screen-ygi-pass` is skipped entirely in Lobby
Mode — each device answers on its own screen directly.

**Overlays**

| Overlay | Opened from | What it is |
|---|---|---|
| `ygi-settings-overlay` | Menu | House Rules — the four settings |
| `ygi-how-to-overlay` | Menu, input `[?]` | How to Play — no tab bar |
| `ygi-quit-overlay` | Every in-game screen's ✕ | "Not Feeling It?" mid-game quit confirm |
| `ygi-run-it-back-overlay` | Gameover | "Run It Back?" play-again confirm |
| `ygi-help-tip-overlay` | Input screen's inline `[?]` (on The Gap) | Contextual tip on writing a good Metric |

### T7b — The words on screen

#### The menu

```copy
# screen-ygi-menu
You Get
It?
Finally, someone said it.
Let's Get To It!
How to Play
Settings
← Back to the Box
```

#### Setup

```copy
# screen-ygi-setup
Who's In?
Friends
How many friends are in on it?
Everyone's In! →
```

#### Pass gate

```copy
# screen-ygi-pass
Pass the phone and don't peek!
I'm Ready
```

#### Prompt

```copy
# screen-ygi-prompt
New Situation Dropping...
Get Into It!
```

#### Input

```copy
# screen-ygi-input
The Number
0 – 1,000,000
The Gap
Fill the gap...
That's My Take
```

#### Reveal — The Lineup

```copy
# screen-ygi-reveal
The Lineup 🃏
Start the Verdict
```

#### Vote — The Verdict

```copy
# screen-ygi-vote
The Verdict 🏆
Lock In My Verdict
```

#### Results — The Tally

```copy
# screen-ygi-results
The Tally
👻 The Ringer Won! Everyone loses 2 points.
Running Total
Next Situation →
```

#### Gameover — Final Standings

```copy
# screen-ygi-gameover
Final Standings
Does everyone get it? Yeah, you get it.
⚡ Sudden Death
The Record
Run It Back
← Back to the Box
```

#### Sudden Death

```copy
# screen-ygi-sd-intro
Sudden Death!
One final question. Highest number wins.
The Question
Begin Sudden Death
```

```copy
# screen-ygi-sd-input
⚡ Sudden Death
Your Answer
0 – 1,000,000
Lock In My Answer
```

#### Settings — House Rules

```copy
# ygi-settings-overlay — title
House Rules 💡
Set it before you take it.
```

```copy
# ygi-settings-overlay — Situations and The Decider
Situations
How many situations per session.
The Decider
What happens if scores are tied at the end.
Split Take
Solo Take
```

```copy
# ygi-settings-overlay — Full Tally and Verdict Style
Full Tally
Show the full ranking — no one escapes judgement.
Verdict Style
How the group gives The Nod each round.
The Consensus
Your Call
```

```copy
# ygi-settings-overlay — Sylly Mode
✨ Sylly Mode
The Ringer
A mystery Ghost Card joins the Lineup. If it wins, everyone loses 2 points.
Done
```

#### How to Play

```copy
# ygi-how-to-overlay — title
How to Play 🃏
Fill in the blank. Vote for the take you relate to most.
```

```copy
# ygi-how-to-overlay — steps
Step 1
Read the Situation aloud.
Everyone reads The Situation together. It has a blank — that's The Gap you'll fill with your answer.
Step 2
Submit your Take.
Pass the phone around. Each player secretly picks a Number and writes something for The Gap. Your combined answer should slot right into the sentence.
Step 3
The Lineup is revealed.
All Takes appear at once 🃏, sorted lowest to highest. No names — just the answers. Read them out.
Step 4
Give the Nod.
Vote for the take you relate to most. You can't vote for your own.
Winning and Scoring
The Nod decides everything.
1st most votes = 3 pts, 2nd = 2 pts, 3rd = 1 pt. Most points across all Situations wins. The take everyone vibes with wins the round.
✨ Sylly Mode
The Ringer
A mystery Ghost Card joins The Lineup each round. If the group gives The Nod to the Ghost instead of a real player, everyone loses points.
Got it
```

#### Quit and play-again

```copy
# ygi-quit-overlay
Not Feeling It?
Your takes will vanish into the void.
Yeah, I'm out.
Keep guessing!
```

```copy
# ygi-run-it-back-overlay
Run It Back?
Start a fresh game with the same crew.
Yeah, let's go!
Back to Results
```

### T7c — Where the journey is thin

**◇ judgement, not spec.**

**MDLM's player-count bounds were pinned to a value only the single-device setup screen ever
changes.** **RESOLVED 23 Aug 2026 (SW v210).** `getMaxPlayers()` for `ygi` resolved to `ygiPlayerCount`, which only moves when
the Pass-the-Phone setup screen's count pills are tapped, or — far too late to matter — when
`ygiShowSetup()` overwrites it with the roster size *after* the lobby has filled. That screen is
skipped entirely in Lobby Mode, so `ygiPlayerCount` sat at its default of 4 throughout the
roster-filling phase: **a Lobby Mode room could only ever reach 4 players**, never the 5–6
Pass-the-Phone supports. `getMaxPlayers()` is now a constant `6` (min stays 3). Five games shared this exact root cause (SS, JEC, YGI, LTTP, DSD). The fix was not
"read the roster's live size" but something simpler: a lobby bound is consulted **only** while the
room fills, so it must never read game-local setup state at all — it now returns the game's true
range as a constant. `node tools/verify-mp-configs.js` § 3 makes the old shape unrepresentable,
and § 4 asserts each game's lobby bounds against its own Pass-the-Phone count pills.

**The settings overlay's two toggles (Full Tally, Sylly Mode) still use the legacy
`sylly-toggle-off` class** rather than the canonical `game-toggle-off` — cosmetically identical
(shared CSS rule) so invisible in play, but already flagged in `ygi-implementation-notes.md` as a
consistency polish item, not repeated here as a new finding.

**Mid-game quit didn't dissolve the Lobby Mode session for the rest of the group.** **RESOLVED 23 Aug 2026 (SW v210).**
`btn-ygi-quit-confirm`'s handler was unconditional — `showScreen('screen-ygi-menu')` with no
`syllyMultiplayerMode` branch — stranding the quitting player on the local menu while still
occupying a Firebase room slot, and leaving every other device waiting on a turn that would never
come. It now calls `mpNotifyPlayerLeft()` + `resetToLobby()` in any lobby session. Eight games were missing the quit contract in total (LI5, GM, SS, JEC, YGI, LTTP,
NAT, DSD); all eight now call the new engine helper `mpNotifyPlayerLeft()`, and
`node tools/verify-mp-configs.js` § 6 asserts it for all 18.

---

## T8 — Sylly Mode · *free*

**The Ringer.** The name says exactly what it is — a player who isn't actually a player, slipped
into The Lineup to see if anyone notices.

**What changes.** Each round, one of the five pre-written **ringers** attached to that Situation
(from `data/ygi-data.json`) is picked at random and injected anonymously into The Lineup alongside
the real players' Takes — indistinguishable in presentation from a genuine answer. If the group ends
up giving The Nod to the Ringer more than to any real player, the Ringer "wins" the round instead of
a human, and **every player loses 2 points** — a shared penalty for being collectively fooled by a
fake.

**What it doesn't touch.** The Ringer never scores itself (it can't win points, only cost them), and
the core Take/vote loop, scoring for real players, and the Local Legend bonus are all otherwise
unchanged.

---

## T9 — Art & Assets · *derived*

**You Get It? has no artwork of its own.** Every visual element is emoji (🃏, 💡, 📱, 🏆, 📋, ⚡, 👻)
or plain text on white/tinted cards. There is no card, tile, or token art to convert, and no How-to
gallery tab — the Situations and Takes are the entire visual surface, generated from text rather
than illustrated.

**The Situation bank.** `data/ygi-data.json` holds the fill-in-the-blank prompts, each with exactly
five pre-written `ringers` (a `{ number, metric }` pair each) used only when Sylly Mode is on. The
full authoring rules — the Modular Glue Rule, the Straight Man/Comedian split, the Ringer Taxonomy,
the Tense Test, and the Australian-flavour word list — live in `docs/ygi-content-guide.md`, the
document to brief new content against.

---

## T10 — At the Table · *derived — except the PTP judgement*

**Modes.** Pass-the-Phone and Multi-Device Lobby Mode (recommended) are both supported. There is no
Team Lobby Mode — You Get It? has no teams, only individual players.

**Players.** 3 to 6 in both modes — Pass-the-Phone and Lobby Mode alike (see T7c; Lobby Mode was
capped at 4 until 23 Aug 2026).

**Devices.** Pass-the-Phone shares one device for the whole session, handed off at every pass gate.
MDLM gives one device per player.

**Shape-changing settings.** None of the four settings alter player count or session structure —
Verdict Style changes *how* voting happens, not who's in the game, and is forced to Your Call in
Lobby Mode regardless of the chosen setting.

**How it plays at each size**

| Players | What it feels like |
|---|---|
| **3** | The floor — every player's Take is instantly guessable by process of elimination, so the "anonymous" reveal reads more like a formality than a real mystery. |
| **4** | The only size Lobby Mode currently offers, and the comfortable middle for Pass-the-Phone too — enough Takes in the Lineup for real anonymity, still short enough to read the whole thing aloud without losing the room. |
| **5–6** | Pass-the-Phone only. A fuller Lineup with more genuine surprise in who said what, but a longer read-aloud per round and more competition for votes. |

**Could it be Pass-the-Phone?** — ◇ *judgement, not spec*

**It already is, and it works well both ways — but Pass-the-Phone is arguably the truer format for
this specific game.** Reading The Lineup aloud together, as one shared physical object being passed
around, is close to the game's whole comedic engine: the room reacting out loud in real time to each
answer. MDLM's private devices still work (each player reads the same list on their own screen), but
it trades away a little of that "everyone gasping at once" moment for genuine input privacy — a
reasonable trade, not a strict improvement either way.

---
