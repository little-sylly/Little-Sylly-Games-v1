# Like I'm Five

**Game 1** · `activeGameId: li5` · plugin `js/games/li5.js` (was `dstw.js` — legacy internal name "Don't Say Those Words" survives in a few unprefixed IDs, see T7c)
**Emoji:** 💬 · **Brand:** `pink-500` · **Players:** 2 teams · **Modes:** PTP (recommended) · TLM
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

Explain the word on screen to your team — simply, clearly, like you're talking to a five-year-old —
without saying any of the ten obvious words the game has specifically banned you from using. It's
charades for people who talk instead of gesture, and the fun is entirely in how creatively you can
dance around the word everyone's dying to just blurt out.

---

## T2 — The Premise · *free*

One player from the active team sees a target word and a **No-No List** of forbidden associated
words. They have to get their team to guess the target before the timer runs out, describing it any
way they like — except by saying the word itself, any part of it, or anything on the No-No List. Say
a No-No word and it costs points. Every correct guess scores; every round the two teams alternate who's
describing, race through as many words as they can, and whoever's ahead when the rounds run out wins.

It's the most classic, least mechanically-complicated game in the suite — no roles, no hidden
information beyond the describer's own screen, just a timer, a word, and the constant temptation to
cheat by saying the one word that would make it easy.

---

## T3 — How to Play · *free*

**Setup.** Name your two teams (or use the defaults) and set your Learning Plan — timer length,
rounds, difficulty, penalties — before the first turn.

**The loop.** Each turn, the describing team's player sees the target word and its No-No List. They
describe; their teammates guess out loud. Every correct guess is marked **Yay!** and moves to the
next word immediately; a slip onto the No-No List is marked **Nay!** and costs a point (or seconds,
depending on the Oopsie Daisy setting); a stuck word can be **Skip**ped. At the end of the turn, the
whole team reviews the **Report Card** — a log of every word from that turn — before passing to the
next team.

**How it ends.** After the set number of rounds, whichever team has the higher score wins — **Class
Dismissed!**

---

## T4 — Theme & Flavour · *free*

**The world.** A cheerful, slightly cheeky primary-school classroom framing laid over what is really
just a straightforward taboo-word party game — "Learning Plan," "Report Card," "Class Dismissed,"
"Adults make the rules!" all played for gentle comic effect rather than as a genuine kids'-education
skin.

**The voice** leans into kid-speak and playground energy: action buttons are "Yay!"/"Nay!"/"Skip!",
quitting is "Done explaining already? 🧒", the pass-the-phone screen is "Ready up, [team]" with a
rotating hype line, and Sylly Mode is reframed as literal "Extra Credit" — harder words worth double
points.

**On theme:** classroom vocabulary applied with a wink (report cards, gold stars, homework-adjacent
language), the simple joy of dumb obvious hints almost slipping out, playful stakes ("your stars will
disappear!").

**Off theme:** anything that reads as an actual teaching tool or genuinely instructive for children —
this is a party game for people who already know all the words, not a vocabulary-building app.

Australian English throughout.

---

## T5 — Terminology · *paired*

| Term | Meaning |
|------|---------|
| **No-No List** | The forbidden word list for the current target word (field name `nono_list` — deliberate, not `taboo_list`). |
| **Describer** | The active team's player who can see the word and is trying to get it guessed. |
| **The Toy Box** | The word-category deck picker setting. |
| **Report Card** | The per-turn word review overlay — also the name of the difficulty setting card (dual use). |
| **Extra Credit** | Sylly Mode's name — difficulty-3 words mixed into the deck, worth double points (and double penalty), always showing all 10 No-No words. |
| **Learning Plan 📝** | The settings overlay's title. |
| **Class Dismissed!** | The gameover heading. |
| **Tattletales** | In Lobby Mode, the group that isn't describing this turn — each player's phone shows the word + No-No List; tapping a word **dobs** the describer in (a note on the describer's board, answered *I said it* / *I didn't*). Replaced the TLM-only Tattletale Sheet monitor (LI5 pilot S1, 9 Nov 2026). |
| **Up the front** | In Lobby Mode, the one player describing this turn; the rest of their group is **guessing** and never sees the word. |
| **Pinky Swear Mode** | The setting that lets the reviewing team tap Report Card rows to flip a Yay!/Nay!/Skip! outcome after the fact. |

---

## T6 — Settings · *mixed — labels paired, values derived*

The settings overlay is titled **Learning Plan 📝** — *"Adults make the rules! ✋"*

| Setting | Options | Default | What it does in play |
|---|---|---|---|
| **The Toy Box** | ON (all 16 decks) / OFF + category picker | ON | OFF opens "Edit Toy Box ▸" to pick specific word categories; ON draws from every category. |
| **Report Card** | Gold Star ⭐ · Honour Roll 📚 | Honour Roll | Gold Star draws only the easiest word tier; Honour Roll adds the next tier up. |
| **Tick Tock Clock** | 30s · 60s · 90s | 60s | How long each team's turn lasts. |
| **Roundy Rounds** | 3 · 5 · 10 | 5 | Number of turns per team. |
| **Oopsie Daisy** | −1 Point · −N Secs | −1 Point | Whether a No-No slip costs a point or docks time from the turn clock (time penalty auto-scales with the timer length). |
| **Skip** | Free · Penalised | Free | Whether skipping a stuck word costs the same penalty as a No-No slip. |
| **Pinky Swear Mode** | OFF / ON | OFF | ON lets the team tap Report Card rows after a turn to flip a wrongly-marked outcome. |
| **✨ Sylly Mode** | OFF / ON + Extra Credit Level slider | OFF / 30% | Extra Credit. See T8. |

---

## T7 — The Player's Journey · *mixed — 7a derived, 7b paired, 7c free*

### T7a — The flow

| # | Screen | Beat | Type | Duration | Chrome |
|---|--------|------|------|----------|--------|
| 1 | `screen-menu` | Menu | Menu | — | 🔊 |
| 2 | `screen-setup` | Name your Playgroups! — team names | Setup | — | 🔊 ✕ |
| 3 | `screen-gatekeeper` | Ready up, [team] — pass-the-phone + mini scoreboard + hype line | Gate | — | 🔊 ✕ |
| 4 | `screen-active-play` | The describer's board — the wall clock (which is Time Out), the word + No-No List as one group, tallies, Yay | Nay on the chalk tray then Skip; a dob arrives as a folded note | Interactive | — | 🔊 `?` ✕ |
| — | `screen-li5-tattle` | *(Lobby Mode)* Tattletales — the other group's phones: word, No-No List, dob | Interactive | — | `[?]` 🔊 ✕ |
| — | `screen-li5-guess` | *(Lobby Mode)* Guessing — the describer's own group: clock, tallies, the Yay'd words, never the word | Interactive | — | `[?]` 🔊 ✕ |
| 5 | `screen-gameover` | Class Dismissed! — final scores | Result | — | 🔊 ✕ |

Rows 3–4 loop, alternating teams, until Roundy Rounds is reached. `screen-active-play` has a third,
non-registered sub-state — the inline `pause-overlay` swapped in for `active-content` — rather than a
separate screen. **Lobby Mode (MDLM and TLM, one path — LI5 pilot S1):** every device sees the gate;
then the person up the front gets `screen-active-play`, their group `screen-li5-guess`, the other group
`screen-li5-tattle`. In TLM a device is a group, so the describing device is up the front and the
other device tattles. The Report Card shows on every device; the describer and the host control it.
*(S1 ships these screens as plain markup — the chalkboard world dresses them in S3–S6.)*

**Overlays**

| Overlay | Opened from | What it is |
|---|---|---|
| `settings-overlay` | Menu | Learning Plan — the eight settings (legacy unprefixed ID) |
| `deck-panel` | Learning Plan "Edit Toy Box ▸" | The Toy Box category picker |
| `li5-how-to-overlay` | Menu, active-play header `?` | How to Play — no tab bar |
| `li5-help-tip-overlay` | Contextual `[?]` buttons | Shared contextual tip overlay |
| `quit-overlay` | ✕ during active play/gatekeeper | "Done explaining already?" mid-game quit confirm |
| `review-overlay` | After every turn | Report Card — per-word turn review, Pinky Swear flips happen here |
| `history-overlay` | Gameover team cards | Full per-team match history across every turn |
| `li5-play-again-overlay` | Gameover "One More Go?" | "New Playgroup?" play-again confirm |
| `pause-overlay` | The wall clock (tap it) | The Time Out view — an inline swap for `active-content`, not a `fixed` overlay: the word is rubbed off so nobody peeks, *Clock stopped at 0:42*, **Keep going** / *End my turn* on the tray (LI5 pilot S4) |

### T7b — The words on screen

#### The menu

```copy
# screen-menu
Like I'm
Five
Explain it simply. But no no-nos for me!
Play Time!
How to Play
Settings
← Back to the Box
```

#### Setup

```copy
# screen-setup
Name your Playgroups!
Leave blank to use Crayon Crew & Glue Stick Gang
Team 1
Team 2
Let's Go Already!
```

#### Gatekeeper

```copy
# screen-gatekeeper
Ready, Miss!
Miss:
Settle down, please.
Explain it like they're five. Don't say the No-No words.
Listen for No-No words. Hear one? Dob.
```

#### Active play

```copy
# screen-active-play
Up the front
The No-No List
Yay!
Nay!
Skip!
Time Out
Clock stopped at
Keep going
End my turn
I said it
I didn't
```

#### Tattletales and Guessing (Lobby Mode)

```copy
# screen-li5-tattle
Tattletales
They said the word itself
```

```copy
# screen-li5-guess
Guessing
```

#### Report Card and Match History

```copy
# review-overlay
Report Card
🔥 Hot streak!
Your Turn →
```

```copy
# history-overlay
Close
```

#### Game over

```copy
# screen-gameover
Class Dismissed!
Team 1
View History ›
One More Go?
```

#### Settings — Learning Plan

```copy
# settings-overlay — title
Learning Plan 📝
Adults make the rules! ✋
```

```copy
# settings-overlay — The Toy Box
The Toy Box
Play with all word categories, or pick and choose.
Edit Toy Box ▸
```

```copy
# settings-overlay — Report Card
Report Card
Control how tricky the words are.
Gold Star ⭐
Honour Roll 📚
```

```copy
# settings-overlay — Tick Tock Clock
Tick Tock Clock
How long each team has to describe words.
30s
60s
90s
```

```copy
# settings-overlay — Roundy Rounds
Roundy Rounds
Number of turns per team.
```

```copy
# settings-overlay — Oopsie Daisy
Oopsie Daisy
Penalty for saying a forbidden word.
−1 Point
−10 Secs
```

```copy
# settings-overlay — Skip
Skip
Whether skipping a word costs a penalty.
Free
Penalised
```

```copy
# settings-overlay — Pinky Swear Mode
Pinky Swear Mode
Tap words to flip outcome after the round.
```

```copy
# settings-overlay — Sylly Mode
✨ Sylly Mode
Extra Credit
Mixed in with the deck — correct answers score double, but also penalties! Extra Credit words always show the full No-No List.
Extra Credit Level
30% extra credit words
```

#### The Toy Box picker

```copy
# deck-panel
Toy Box
Tap to include or exclude a category
Deselect All
Don't be Sylly — we need at least one deck to play! 🃏
You sure? It'll be way more fun with more decks! 🎉
Done
```

#### How to Play

```copy
# li5-how-to-overlay — title
How to Play 💬
Describe the word without saying anything on the No-No List.
```

```copy
# li5-how-to-overlay — steps
Step 1
Divide into two teams.
One person describes the Word on screen while their team guesses. Get as many right as you can before the timer runs out!
Step 2
Don't say the No-No words.
You also can't say any part of the main word. Use your hands, sounds, or wild metaphors — just no cheating, yeah?
Winning and Scoring
Points on every outcome.
✅ Correct — your team got it, ripper!
❌ No-No! — busted! Points off.
⏩ Skip — too hard? Pass it on.
✨ Sylly words — tricky ones worth double points.
✨ Sylly Mode
Extra Credit
Extra Credit words are shuffled into the deck. Correct answers score double, but they carry penalties too — and show all 10 No-No words.
Got it
```

#### Quit and play-again

```copy
# quit-overlay
Done explaining already? 🧒
Your stars will disappear!
Yeah, pack up!
Keep going!
```

```copy
# li5-play-again-overlay
New Playgroup?
Your stars and word pile will be packed away.
Let's do it!
Not yet!
```

### T7c — Where the journey is thin

**◇ judgement, not spec.**

**Three of `li5-implementation-notes.md`'s "open" bugs are actually fixed — the notes just never
closed them out.** Same pattern found in Great Minds' notes this pass (see `gm.md` T7c). **L6**
(Toy Box deck panel rendering behind the settings overlay, `z-[60]` vs the opener's `z-[80]`) is
fixed — `deck-panel` in `index.html` is now `z-[100]`, matching the fix the notes call for. **L7**
(quit-cancel from the gatekeeper starting a phantom turn timer) is fixed — `hideQuitConfirm()` now
carries an explicit comment and guard checking `screen-active-play` is the visible screen before
calling `startTimer()`. **L8** (Pinky Swear flips desyncing the Report Card delta from the real
score) is fixed — `flipEntry()` now re-clamps every entry sequentially from `scoreBeforeTurn` after
a flip, exactly as the notes' suggested fix describes. None of these three still need action; the
Bug Index entries just need their "(open)" tags removed so a future reader doesn't re-investigate
resolved bugs.

**Mid-game quit didn't dissolve the Team Lobby Mode session for the other device.** **RESOLVED 23 Aug 2026 (SW v210).**
`btn-quit-confirm` used to call the shared engine `resetToMenu()` unconditionally — a plain engine
helper with no `syllyMultiplayerMode` branch and no MP teardown of any kind — leaving the Firebase
room and the other device stranded. It now branches: any lobby session calls `mpNotifyPlayerLeft()`
then `resetToLobby()`, and only the single-device path still runs `resetToMenu()`.

**LI5 is the find that widened the rule.** The contract in `logic-engine.md` was written *MDLM-only*,
which is precisely how a **TLM** game slipped past it — LI5 has no MDLM support, so the rule read as
someone else's problem. It is now titled § Mid-Game Quit Contract and covers every lobby session,
because the mode label never mattered: only that a Firebase room exists and another device is
waiting on it. Eight games were missing the quit contract in total (LI5, GM, SS, JEC, YGI, LTTP,
NAT, DSD); all eight now call the new engine helper `mpNotifyPlayerLeft()`, and
`node tools/verify-mp-configs.js` § 6 asserts it for all 18.

**A handful of IDs still carry the game's pre-rename legacy naming.** `js/games/li5.js` was
`dstw.js` ("Don't Say Those Words") before the game's public rename to Like I'm Five, and several
DOM ids never picked up the `li5-` prefix convention other games use throughout: `#screen-menu`,
`#screen-setup`, `#screen-gatekeeper`, `#screen-active-play`, `#screen-gameover`, `#settings-overlay`,
`#deck-panel`, `#quit-overlay`, `#review-overlay`, `#history-overlay`,
`#btn-play`, `#btn-settings`, `#btn-how-to`, `#btn-play-again`, among others. This is long-standing,
harmless, and already flagged in `docs/rules/definitions.md` ("LI5 state — no prefix, predates the
convention") — not a new finding, just the reason this doc's copy blocks reference bare ids like
`# screen-menu` rather than `# screen-li5-menu`.

---

## T8 — Sylly Mode · *free*

**Extra Credit.** Difficulty-3 words are shuffled into the regular deck at a configurable rate (the
Extra Credit Level slider, 30–100% in steps of 10). An Extra Credit word scores double on a correct
guess — and costs double on a No-No slip — and always displays the full 10-word No-No List instead of
the usual 5, since a harder word needs more forbidden words to keep it genuinely tricky.

**What it doesn't touch.** The core turn/timer/scoring loop, the Toy Box category pool, and Report
Card review are all unchanged — Extra Credit only affects which words can appear and how much they're
worth once they do.

---

## T9 — Art & Assets · *derived*

**Like I'm Five has no artwork of its own.** Every visual element is emoji (💬, 👥, 🏆, 👀, 🃏) or
plain text on white/tinted cards — there is no card, tile, or token art to convert, and no How-to
gallery tab.

**The word bank.** Words are drawn from the shared `data/words.json` across all 16 categories (The
Toy Box lets the table narrow this to a chosen subset), filtered by Report Card's difficulty tier —
Gold Star draws only difficulty 1, Honour Roll adds difficulty 2. `data/words.json`'s `nono_list[0]`
for the `animals` category doubles as the Broad Shield here (the describer's No-No List) and as The
Mole's Grouping in Natural Selection — the Dual-Use Contract in `.claude/rules/definitions.md` means
any edit to an animal entry's `nono_list[0]` affects both games at once.

---

## T10 — At the Table · *derived — except the PTP judgement*

**Modes.** Pass-the-Phone (recommended), Team Lobby Mode and — since the LI5 pilot S1 (9 Nov 2026) —
Multi-Device Lobby Mode. TLM and MDLM are one code path: the host runs the match and each device's
screen is its role this turn (*up the front* / *guessing* / *tattletales*). The Intro's Line-up forms
the two groups in MDLM; a Team Lobby has no Line-up (a device is a group).

**Players.** PTP: two groups on one phone. TLM: exactly 2 devices. MDLM: 4–12 players, two groups of
at least 2 each, unbalanced allowed (a 3-v-2 plays fine — the smaller group describes more often).
Bounds are constants plus `window.mpLobbyStyle` in `MP_GAME_CONFIGS.li5`.

**Devices.** Pass-the-Phone shares one device, handed off at the gatekeeper gate every turn. In Lobby
Mode the describer's phone shows the word and the Yay / Nay / Skip buttons; the other group's phones
show the word and No-No List to dob from; the describer's own group sees only the clock, the tallies
and the words already shouted correctly. The word reaches only the describer and the tattletales, by
the private channel. Reconnect is adopted: a dropped phone can rejoin mid-turn.

**Shape-changing settings.** None of the eight settings alter player count or session structure.

**How it plays at each size**

| Players | What it feels like |
|---|---|
| **2 teams (only shape)** | The whole game — Like I'm Five doesn't vary by headcount within a team; any number of people can huddle around either team's device. |

**Could it be Pass-the-Phone?** — ◇ *judgement, not spec*

**It already is, and PTP is arguably the more natural mode for this specific game.** The core tension
— a describer visibly holding the phone while teammates listen without seeing the screen — is exactly
what a shared device does for free. TLM's Tattletale Sheet is a genuine added feature (letting the
opposing team actively hunt for No-No slips instead of just half-listening), not a workaround for a
privacy problem PTP already has; MDLM (pilot S1) answers the shared-screen worry by giving the describer's group a screen of its
own that never holds the word — so PTP stays the recommended mode, and MDLM is the big-group one.

---
