# LI5 — UI revamp pilot (Stage 1) + the MDLM mode

**Status (9 Nov 2026):** R1 done · **R2 world brief signed off** (9 Nov, § 2.11) · **R2b signed off**
(9 Nov, § 3) · **R2c (§ 4) and the MDLM network spec (§ 5) signed off** (§ 5.13, all five as
recommended) · **S0 built** (the scene `beat` hook).

Programme spec: `2026-11-08-ui-revamp-design.md` §§ 10, 17.2 · tracker: `docs/ui-revamp-rollout.md`
§ 5 LI5 card · identity doc: `docs/game-identities/li5.md` · boards:
https://claude.ai/artifact/8YuBcu4fLveMY4XtF9RbJz (local `wip/revamp/mockups/li5/`, B = Chalkboard).

This one file holds the whole pilot, in gate order. It replaces the placeholder name
`YYYY-MM-DD-li5-mdlm-design.md` in the programme spec § 10.

---

## 1. R1 — Intake

| Item | State |
|---|---|
| Identity doc read whole | ✅ |
| Impl-notes Template Gaps | ✅ — the monitor pattern and `isClientTurn` flag are TLM-shaped; both are superseded in MDLM by per-seat roles (§ 2.8) but stay for TLM |
| Before set | ✅ `wip/revamp/li5/before/` (15 screens) |
| Owner pain points | ✅ none (9 Nov) |

**Found at intake (fixed in this pass, not separately):**
- **Two emoji for one game.** Identity doc says 💬; `MP_GAME_CONFIGS.li5.emoji` is 🧒. Pick one (§ 2.10).
- **Report Card means two things** — the per-turn review *and* the difficulty setting (T5 says so).
- **`CATCH! 🚨`** carries an emoji on an action label (frozen rule) — goes with the rename.
- **"Honour Roll"** is American; **"Playgroup"** is pre-school, not a classroom. Both drift from the world.
- **The active-play header carries five icons** competing with the clock (board note s0).

---

## 2. R2 — World brief · *for owner sign-off*

### 2.1 The world in one paragraph

**Show-and-tell at an Aussie primary school, 9 am.** A green chalkboard in a timber frame, a chalk tray,
a wall clock that's always a bit loud. One kid is called **up the front** with a secret word they can't
show — only tell. Their group is **bursting** to shout it out; the other group sits with arms folded,
waiting to **dob** them in the second a No-No word slips. The teacher never appears — she is the
handwriting on the board and the voice saying *settle down, please*. It is a party game wearing a school
uniform: classroom words used with a wink, never anything that reads as a real lesson.

### 2.2 Narrator

**Miss** — *the teacher.* What every Australian kid calls their teacher, so it is a role, not a named
mascot (owner decision: generic role narrator; recurring characters deferred). She is **never drawn**:
she exists as chalk writing appearing on the board and as the copy's voice — brisk, fond, unimpressed by
cheating. *(Template: `data-intro-narrator` "Miss", `data-intro-role` "Your teacher".)*

### 2.3 Scene concept

**The board is the stage on every screen.** Matte green slate (`#2f4a3c` family) in a timber frame, a
chalk tray carrying the buttons, warm cream wall around it — **scene palette**, not dark mode, and not
brand. Pink is the one coloured chalk (§ 2.9).

- **Intro:** the board starts blank; each narrator beat is **chalked on** (a left-to-right reveal of
  Fredoka with a chalk texture), with a small dust puff; between beats the **duster wipes** it. The
  Line-up is two chalk columns headed by the group names, with players as name cards stuck on.
- **Gameplay:** the word in chalk, the No-No List boxed in dashed chalk, the score as **tally marks**
  (groups of five), the clock on the wall above the board.
- **Static tier / reduced motion:** text simply appears, no wipe, no dust — same board.
- **Build:** CSS + SVG, one texture made in code (no new binary). No Three.js — the world is flat
  slate; 3D wouldn't earn it.

### 2.4 Mood words

**Chalky · Cheeky · Bursting.**

*Chalky* is the texture (every surface reads as slate, timber, chalk). *Cheeky* is the voice. *Bursting*
is the game's actual tension — a room full of people dying to blurt the obvious word — and the test
for motion: things should feel like they can barely be held in (a wiggle, a pop), never smooth and
corporate.

### 2.5 Intro copy

Narrator beats (tap or 5 s each):

```copy
# intro-li5
Miss
Your teacher
Morning, class. Settle down, please.
Today: explaining things so simply a five-year-old would get it.
One of you comes up the front with a secret word. Your group shouts out guesses.
Say anything on the No-No List and the other group will dob you in.
Into your groups, please.
```

Brief — **one variant per mode, not per role**: LI5's roles rotate every turn, so the Intro can't know
who will be up the front. The per-turn restatement is the round intro's job (§ 2.7).

| Variant | Bullets (≤3) |
|---|---|
| `default` (MDLM) | **Up the front:** explain the word. Never say it — or anything on the No-No List. · **Your group's up:** shout out guesses. You won't see the word. · **Their group's up:** you'll see the word and its No-No List. Hear one? Dob. |
| `ptp` | **Up the front:** hold the phone and explain. No No-No words. · **Your group:** shout guesses — no peeking at the screen. · **The other group:** listen hard. Hear a No-No word? Call it. |
| `tlm` | as `ptp`, last bullet: **The other group:** your phone shows the No-No List. Hear one? Dob. |

### 2.6 Line-up

`type: 'teams'` — **Crayon Crew** / **Glue Stick Gang** (kept — they're already the world's best
names), `minPerTeam: 2`, `balanced: false` (a 3-v-2 plays fine; the smaller group just describes more
often). Prompt: *"Into your groups, please."* Requires `rosterConfig.type: 'none'` — LI5 already is.
Seat order inside a group (the Line-up's order) is the order people come up the front.

### 2.7 Round intro — "wipe and write"

Replaces today's gatekeeper. Every turn: the **duster wipes** the board, then Miss chalks the turn:

> **Round 3 · Glue Stick Gang**
> **Jack, up the front.**

…and under it **one line for this device's role this turn**:

| Role | Line |
|---|---|
| Up the front | Explain it like they're five. Don't say the No-No words. |
| Guessing (same group) | Shout it out — Jack can't show you the word. |
| Tattletale (other group) | Listen for No-No words. Hear one? Dob. |

**It is a gate, not an interstitial**: the person up the front taps **Ready, Miss!** to start the clock;
everyone else sees *Waiting for Jack…*. Full chrome stays. In PTP it is the Pass-the-Phone safety gate
(*"Pass it to Glue Stick Gang — who's up the front?"*) with the same CTA. The rotating hype line survives
as Miss's aside.

**Gameover:** the school bell; **Class Dismissed!** chalked; each group's tally counted up into a
number; the winners get the match's one **gold star** stuck on their name. Play again: **Wipe the board?**

**During a turn** (from board B, refined at R2b): tap the wall clock for **Time Out**; a dob arrives on
the describer's screen as a **folded note passed in class** — one note for one dobber, stacked notes and
a wiggle as more dob the same word — naming the word and ringing it in the list; the describer answers
**I said it** (takes the Nay) or **I didn't** (waves it off).

### 2.8 The MDLM mode — scope set at R2

From programme spec § 10, unchanged: **4–12 players, two groups, min 2 per group, no bots.** PTP and TLM
keep working and get the same world.

| Seat this turn | Sees | TV |
|---|---|---|
| **Up the front** (rotates through the describing group in Line-up order) | Word, No-No List, clock, Yay / Nay / Skip, incoming notes | private |
| **Guessing** (rest of that group) | Clock, tallies, streak, a sticky note per **Yay'd** word, a blank *Buzzed −1* / *Skipped* slip otherwise. **Never the current word or list** | **public** |
| **Tattletales** (other group) | Word + No-No List; tap a word to dob it, or *They said the word itself*. Per-player cooldown | private |

Buzz is an **alert, not a penalty** — the describer decides (§ 2.7). Network shape and the questions
this raises are § 5's job; they're listed there so this brief can be judged on the world alone.

### 2.9 Brand colour — recommendation: **keep pink, as the pink chalk**

The world doesn't argue against pink — it gives pink a reason. On a green board pink is the
complementary colour: the one coloured stick of chalk Miss underlines with, the colour of the Yay
button on the tray, the dob note's ring. Board B already works this way.

**Chalkboard green, considered and rejected:** (1) the CTAs sit on or beside the board, so a green
brand fill would sink into it — brand has to contrast with the stage; (2) the shelf already has three
greens (NAT lime-600, NT emerald-600, GTH sage) and a fourth would blur them; (3) it touches every brand
surface (`per-game-classes.md`, CSS classes, both engine maps, `DESIGN.md`) for a worse result.

Shade stays **`pink-500`** — no class churn. (FLW's rose `#E879A8` sits near it; that's a pre-existing
shelf question, not one this world settles.)

### 2.10 Terminology review — paired copy (T5–T7b)

Lands in the identity doc together with the code (R8/R9 build), never before.

| Today | Proposed | Why |
|---|---|---|
| Describer (player-facing) | **Up the front** — *"Jack, up the front."* | What a teacher actually says; names the moment, not the job. "Describer" stays the internal term |
| Ready up, [team] / **My Turn!** | **Ready, Miss!** (CTA) | Ties the gate to the narrator; reads as a kid answering |
| Tattletale Sheet · **CATCH! 🚨** | **Tattletales** (role) · **Dob** (the action) | "Dob" is the Australian word for telling on someone; drops the emoji the action rule bans |
| Buzz alert (new) | **Psst — you said "Trunk"** · *3 tattletales say you said "Trunk"* · **I said it** / **I didn't** | Passed-note voice; plain answers a describer can hit mid-sentence |
| Report Card (difficulty setting) | **Reading Level** — **Kindy** / **Big School** | Ends the dual use; "big school" is how Aussie kids say starting primary. Value line: *Easy words only* / *Easy + tricky words*. Report Card keeps its turn-review meaning |
| Name your **Playgroups**! | **Into your groups!** | Playgroup is pre-school |
| New Playgroup? · *Your stars and word pile will be packed away.* | **Wipe the board?** · *Every tally and word gets rubbed out.* · **Wipe it!** | The duster is the world's reset |
| Quit: *Your stars will disappear!* | *The duster's coming for your tally!* | Points are tallies now; the one gold star is the winner's |
| Score: | tally marks + number | Readable past 10 in groups of five |
| Emoji 💬 / 🧒 | **🧒** everywhere | The title is about the five-year-old; 💬 fits nine other games |

**Kept as they are:** No-No List · Learning Plan 📝 · *Adults make the rules!* · The Toy Box · Tick
Tock Clock · Roundy Rounds · Oopsie Daisy · Skip · Pinky Swear Mode · Time Out · All tuckered out? ·
Report Card (turn review) · Extra Credit · Class Dismissed! · Play Time! · Yay! / Nay! / Skip! ·
Crayon Crew / Glue Stick Gang.

### 2.11 Owner decisions (9 Nov 2026) — **R2 signed off**

1. **World** §§ 2.1–2.7 — signed off as written.
2. **Narrator** — **Miss**.
3. **Brand colour** — **keep `pink-500`**, as the pink chalk. No class changes.
4. **Terminology** — all four § 2.10 sets taken: *Up the front + Ready, Miss!* · *Dob + passed-note
   copy* · *Reading Level: Kindy / Big School* · *duster copy + 🧒*.
5. **Copy benchmark (owner):** Australian English, but **don't overdo the slang — a word should be in a
   dictionary, not pure slang.** *Dob* passes; *fair cop* doesn't (→ **I said it / I didn't**), and
   *bums on seats* went with it (→ *Settle down, please*). Every R2b/R8/R9 string is held to this.
6. **Pain points** — still open; collect before R2c.

---

## 3. R2b — Directions refinement · **signed off 9 Nov** (row B′, with round-2 tweaks)

**Round 2 (owner, 9 Nov):** Yay moves **left** of Nay (the owner made the same swap on the canvas). The
word and No-No List become **one group centred** in the board's free height: 5 words in one centred
column at 22 px, Extra Credit's 10 in two columns at 17 px, with room between the category row and the
word. The **gold star** sits at the owner's hand-placed spot, beside *Report cards* and clear of the
score. **Pain points:** none. **Scene hook (§ 4):** option (a) agreed.

**Classmates' voices — the hype phrases, re-homed.** Today's two systems split by who is speaking:

| Today | Becomes | Where · when |
|---|---|---|
| `HYPE_POOLS` (situational: final round / scoreless / hot / trailing / tied / leading) | **Miss's aside**, re-voiced in her voice, same selection logic | The wipe-and-write board, one line |
| `HYPE_PHRASES` + `showPenaltyPhrase()` (pop on Yay / Nay) | **Classmates calling out**: a small speech bubble from a **corner of the board** | On Yay, on a run of 3+, on a taken Nay. One at a time, ~1.3 s (pop in from its side, hold, fade), never over the word, the list or the buttons. Corners only: the category row and the tally row |

Copy (≤3 words, no emoji, dictionary test): Yay *Gold star! · Clever clogs! · Top of the class! ·
A-plus! · Teacher's pet! · Smarty pants!* — a run *On a roll! · Show-off! · Unstoppable!* — Nay *Busted! ·
Ooooh! · Caught out!*. The bubbles are cosmetic and local: every phone picks its own line off the Yay/Nay
it already receives, so **no packet**. They show on every role's screen (the guessers' feed most of all).
Reduced motion: fade only, no travel. On the board as `R-Describer`'s **voices** tweak (on taps / pinned /
off).

Row **B′** on the canvas (local `wip/revamp/mockups/li5/R-*.dc.html`), every board interactive with
tweaks. Copy is the signed-off copy from § 2, held to the dictionary test.

| Board | Shows | Tweaks |
|---|---|---|
| `R-Intro` | Miss's four beats chalked on (stepped reveal + dust), the brief, the Line-up as two chalk columns + *Not in a group* | step · host |
| `R-RoundIntro` | Wipe and write: duster pass, *Round 3 of 5 · Glue Stick Gang*, *Jack, up the front.*, the per-role line, Miss's aside, tallies; **Ready, Miss!** only up the front / at the PTP gate | role (up the front · guessing · tattletale · pass the phone) |
| `R-Describer` | Board B plus: *Up the front* label; the wall clock **is** Time Out (word rubbed off, **Keep going** / *End my turn*); the dob as a **folded lined note** (crowd = stacked notes + wiggle) with **I said it** / **I didn't** | dob · card · clock (incl. time-out) · coach |
| `R-Table` | Tattletale: tap a No-No word to **dob**, *N dobbed* dots, 5 s cooldown dims the rest. Guessing: the big chalk **?**, *Shout it out!*, a streak line, sticky notes for Yay'd words, blank *Skipped* / *Dobbed −1* slips | role |
| `R-Gameover` | **Class Dismissed!** chalked, two groups with tallies + totals, the **gold star** slapped on the winner (both on a tie), *Report cards ›*, **One More Go?** → **Wipe the board?** | result · playAgain |

**Departures this implies** (logged at R13 if they survive the pick): the board fills the Stage edge to
edge with the Controls on the chalk tray (the Stack's spacing, not its shape); the dob note floats over
the Controls zone; the Time Out view replaces the ⏸/⏭ header icons.

## 4. R2c — Build plan · *for owner review (9 Nov)*

The boards (row B′, § 3) mapped onto real screens. **Legacy unprefixed IDs are kept** on every screen
that survives (`screen-gatekeeper`, `screen-active-play`, …) — renaming them touches `allScreens`,
`capture-screens.js`, `verify-tv-labels.js` and every harness for no player-visible gain (li5.md T7c
already calls them harmless). **New** screens and elements take the `li5-` prefix.

### 4.1 R3 — Screen inventory

| Screen / overlay | Board | Fate | What changes | TV |
|---|---|---|---|---|
| `screen-menu` | — | restyle (R8) | 🧒 replaces 💬; title treatment; frozen four-button shell | public |
| `screen-setup` (PTP only) | — | restyle | *Into your groups!* · chalk inputs. MDLM uses the Line-up, TLM the pre-lobby names | public |
| `screen-who-first` (engine) | — | keep — PTP only | MDLM/TLM: **Miss picks** the first group (random, host) — departure D4 | — |
| `screen-game-intro` (engine) | `R-Intro` | **adopt** (R4) | `intro` config + `<template id="intro-li5">` + `Li5Scene` with the new `beat` hook (§ 4.4) | private (engine) |
| `screen-gatekeeper` | `R-RoundIntro` | **rebuild in place** | Wipe and write: round line, *Jack, up the front.*, per-role line, Miss's aside, tallies; **Ready, Miss!** only up the front (MDLM) or on the shared phone (PTP / TLM's describing device). Full chrome | public |
| `screen-active-play` | `R-Describer` | **rebuild in place** | The describer's board: word + No-No List as one centred group (5 → 1 col 22 px; Extra Credit's 10 → 2 cols 17 px), the wall clock **is** Time Out, Yay \| Nay on the tray then Skip, tallies, dob notes, voices | private |
| `pause-overlay` (inline sub-state) | `R-Describer` clock tweak | **merge** into the describer board | Time Out view: word rubbed off, *Clock stopped at 0:42*, **Keep going** / *End my turn*. Id kept | — |
| `skip-turn-overlay` | — | **delete** | *End my turn* inside the Time Out view is the second tap; ⏭ goes from the header (departure D6). Drop from `resetToLobby()` teardown | — |
| `screen-li5-monitor` (`_mp.html`) | — | **delete** | Replaced by the two screens below; its wiring leaves `engine-multiplayer.js`, its id leaves `allScreens`, `capture-screens.js`, `verify-tv-labels.js` | — |
| **`screen-li5-tattle`** (new, `li5.html`) | `R-Table` tattletale | **new** | Word + No-No List as dob rows (48 px), *They said the word itself*, *N dobbed* dots, 5 s cooldown dims the rest, clock + tallies | private |
| **`screen-li5-guess`** (new, `li5.html`) | `R-Table` guessing | **new** | The big chalk **?**, *Shout it out!*, streak line, sticky note per Yay'd word, blank *Skipped* / *Dobbed −1* slips, clock + tallies. **Has no word slot in its markup** | **public** |
| `review-overlay` | — | restyle | Report Card on the board; role-aware controls (§ 5.6); emoji icons → chalk ticks/crosses | — |
| `screen-gameover` | `R-Gameover` | **rebuild in place** | Bell, *Class Dismissed!* chalked, tallies → totals, gold star slapped on the winner (both on a tie), *Report cards ›*, **One More Go?** | public |
| `history-overlay` | `R-Gameover` *Report cards ›* | restyle | Per-group match history on lined paper | — |
| `li5-play-again-overlay` | `R-Gameover` playAgain | restyle (copy) | **Wipe the board?** · *Every tally and word gets rubbed out.* · **Wipe it!** / **Not yet!** (MP labels stay *Restart in Lobby* / *Leave Session*) | — |
| `quit-overlay` | — | restyle (copy) | *The duster's coming for your tally!* | — |
| `settings-overlay` | — | content (R8) | *Reading Level* — **Kindy** / **Big School** + value line *Easy words only* / *Easy + tricky words*; no emoji on pills | — |
| `deck-panel` | — | keep | copy check only | — |
| `li5-how-to-overlay` | — | content (R9 + R10) | 🧒; tab bar **Rules \| Practice**; steps rewritten in the world's terms | — |
| `li5-help-tip-overlay` | — | keep | — | — |

**Retired elements:** `#hype-phrase`, `showHypePhrase()`, `showPenaltyPhrase()` (its `🙊` breaks the
action rule), the `streak-fire-*` classes, `btn-pause`, `btn-end-turn`, `isClientTurn`.

**TV public state (li5)** — the line R12 adds to `code-map.md`: *round, totalRounds, team, the
describer's name, clock (endTimestamp / paused), scores, streak, cardNo, the guess feed (Yay'd words +
blank slips), the Report Card once the turn has ended, the gameover tallies.*

### 4.2 Files

| File | Change |
|---|---|
| `js/games/li5-scene.js` **(new)** | `Li5Scene` — the Intro scene (`mount` / `stop` / `beat`) **plus** the pure board kit the gameplay screens share: `li5Chalk(el, text, opts)` (write-on), `li5Duster(el, opts)` (wipe), `li5Dust(el)`, `li5TallySvg(n)`, `li5SlateTexture()` (Canvas 2D once → data URL, cached). Pure in the `dyb-dice.js` sense — reads no `li5*` state. Load order: `canvas-draw.js` → **`li5-scene.js`** → `li5.js` |
| `css/li5.css` **(new)** | The board world (`.li5-board`, `.li5-chalk`, `.li5-tray`, `.li5-note`, `.li5-voice`, keyframes + the reduced-motion block). Linked from `_head.html`; follows `arcade.css` / `board.css` |
| `js/games/li5.js` | Pure scoring lifted out (§ 5.8); the MDLM host engine + `li5HandleEnvelope` (§ 5); the four rebuilt screens; Miss's asides + voices |
| `js/engine-multiplayer.js` | LI5 config (modes, bounds, `intro`, `reconnect`); the `mpActiveGame === 'li5'` block (~2314–2367) and the monitor wiring (~3921–3967) **deleted**, replaced by one `li5HandleEnvelope(env)` dispatch line |
| `js/engine-intro.js` + `_shell.html` | The `beat` hook, `data-intro-unassigned`, no Line-up in TLM (§ 4.4) |
| `src/screens/li5.html` | Rebuilt partial; `<template id="intro-li5">`; the two new sections |
| `src/screens/_mp.html` | `screen-li5-monitor` removed |
| `sw.js` | `li5-scene.js` + `li5.css` in `PRECACHE_URLS`; `CACHE_NAME` bump. **No binaries** |
| `engine.js` | `allScreens`: − monitor, + tattle, + guess; `resetToLobby()` teardown − `skip-turn-overlay`; **`MP_PROTOCOL_VERSION`** bumped to the shipping SW (LI5's packets change shape) |
| `CLAUDE.md` load order, `_scripts-*.html` | `li5-scene.js` |

### 4.3 States

**`screen-gatekeeper` — wipe and write.** One render function owns every element (Stack rule 4).

| State | Who | Headline | Role line | Control |
|---|---|---|---|---|
| up the front | MDLM describer | *Jack, up the front.* | *Explain it like they're five. Don't say the No-No words.* | **Ready, Miss!** |
| guessing | MDLM describer's group | *Jack, up the front.* | *Shout it out. Jack can't show you the word.* | *Waiting for Jack…* |
| tattletale | MDLM other group, TLM non-describing device | *Jack, up the front.* (TLM: *Glue Stick Gang is up.*) | *Listen for No-No words. Hear one? Dob.* | *Waiting for Jack…* (TLM: *Waiting for Glue Stick Gang…*) |
| pass the phone | PTP; TLM describing device | *Pass it to Glue Stick Gang.* | *Whoever's up the front takes the phone. Everyone else, eyes off the screen.* | **Ready, Miss!** |
| standby | MDLM client before the first `LI5_TURN` | *Settle down, please.* | — | — |

Copy is the R2b board's (signed off). Above every state: *Round 3 of 5 · Glue Stick Gang*; under it
*Miss: [aside]*; the tallies on the chalk tray.

**`screen-active-play` — the describer.** `play` (word + list + Yay \| Nay / Skip) · `waiting-word`
(clock running, word slot dusty — the first `LI5_WORD` hasn't landed; § 5.4) · `noted` (one dob note
over the Controls zone; **I said it** / **I didn't**) · `crowd` (2+ dobbers on one word: stacked notes +
wiggle, *3 tattletales say you said "Trunk"*) · `low` (≤ 10 s: clock pulses) · `timeout` (word rubbed
off, *Clock stopped at 0:42*, **Keep going** / *End my turn*) · `time-up` (*Time!* chalked, buttons
dimmed, the 1 s grace of § 5.5). Notes clear on every new card.

**`screen-li5-tattle`.** `listening` (every row live) · `cooling` (5 s after a dob: *Note passed to Jack.*,
*Dob again in 5 s*, rows dimmed but the tapped one shows *Dobbed!*) · `timeout` (rows rubbed off,
*Time Out*) · `time-up`.

**`screen-li5-guess`.** `listening` (the ? wiggles gently, feed grows) · `timeout` · `time-up`.

**`review-overlay` — Report Card.** `reviewing` (describer + host: rows flippable if Pinky Swear,
**Your Turn →**) · `watching` (everyone else: same rows, read-only, *Waiting for Jack…*).

**`screen-gameover`.** `win` (one gold star) · `tie` (a star on both) · `exhausted` (*You used every
word in the box!* — re-voices today's early-end line).

### 4.4 The scene `beat(i, text)` hook — engine spec

Agreed at R2b (option a). The scene contract becomes **`{ mount(el, opts), stop(), beat?(i, text) }`**
— `beat` optional, so every future scene without it is unaffected.

1. **Calls.** After `mount`, the engine calls `beat(i, text)` once per narrator line, `i = 0…n−1`,
   `text` the line. When the beats end — last line advanced, **Skip**, or an Intro that opens
   `skipped` (Play again, a late rejoin) — it calls **`beat(-1, '')` exactly once**: *the lesson's
   over, settle the board*. A returning Intro sees only `beat(-1, '')`.
2. **State, not an event.** `beat` means *show this line*, not *advance*: idempotent. The engine
   tracks the last value sent (`it.sceneBeat`) and never sends the same one twice; the call lives in
   `mpIntroRender()`, the one function every state change already flows through.
3. **Re-mount.** `mpIntroMountScene()` clears `it.sceneBeat`, so after a tab-away re-mount the next
   render re-sends the current state — the board is never left blank.
4. **Safety.** A throw in `beat` is `console.warn('[intro] scene.beat', e)` and swallowed (the
   observable-side-effect rule); the narrator still works.
5. **The narrator button stays** as the tap target and the accessible text. When the mounted scene has
   `beat`, the engine sets `data-scene-beats` on `#screen-game-intro`; shared CSS then makes
   `#game-intro-line` visually hidden (sr-only, still read) and keeps *Tap to keep going* + the count.
   `#game-intro-line` gains `aria-live="polite"` for everyone. A tap on the scene advances a beat too.
6. **Reduced motion** is the scene's job: `mount` already passes `opts.reducedMotion`; `beat` then
   writes instantly. The engine adds no timing.

**Two small engine additions the R-Intro board needs, same commit:**
- **`<p data-intro-unassigned>Not in a group</p>`** in the template (copy stays in the partial, so
  `verify-identity-docs.js` reads it); the engine falls back to *Unassigned*.
- **No Line-up in TLM.** In `mpIntroOpen`, `lineup` is also `null` when `window.mpLobbyStyle ===
  'team'`: in a Team Lobby a device **is** a team, and LI5's `minPerTeam: 2` could never be met by two
  devices. Generic — any future TLM adopter wants the same. No config-shape change, so
  `verify-mp-configs` § 9 is untouched.

**`Li5Scene`:** `mount` lays the slate + frame + tray and a *Lesson 1* tag; `beat(i, text)` →
duster wipe of the previous line (skipped on `i === 0`), then `li5Chalk` writes `text` with a dust
puff; `beat(-1)` wipes and chalks *Groups* (the board's Line-up tag). `stop` cancels its WAAPI
animations and empties `el`. No RAF, no timers outside WAAPI.

**Verification (`verify-game-intro.js`, new section; `mutate-game-intro.js` +3 mutants):**
a scene **without** `beat` runs the whole Intro unchanged · a recording scene sees `[0…n−1, −1]`
tapping through, `[0, −1]` on Skip after one beat, `[−1]` on a returning Intro, and a re-send after a
`visibilitychange` re-mount · a throwing `beat` warns and the Intro still reaches DONE · the narrator
line is still in the DOM when the scene has `beat` · `data-intro-unassigned` copy is used, the
fallback works · a TLM room with a `lineup` config gets a roll call. Mutants: never send `−1`; send on
every render; Line-up left on in TLM — each must go red.

**What the R-Intro board shows that this pass does *not* build** (departure D7): the brief as its own
step behind a **Next**, and the Line-up as chalk columns *on* the board. Both are engine-rendered and
shared by every adopter; styling them per game is option (b), already rejected. Revisit when GM (pilot
2) shows whether a `lineup` render hook earns its place in `scene-kit.js`.

### 4.5 Motion

All CSS keyframes / WAAPI on `transform`, `opacity` and `clip-path`; **no RAF loop anywhere in LI5**,
so the automatic static tier has nothing to throttle — reduced motion is the static tier.

| Beat | Motion | Time | Reduced motion |
|---|---|---|---|
| Chalk write (Intro line, round intro, gameover) | `clip-path: inset(0 100% 0 0 → 0)` in `steps()` (the chalk stutter), lines staggered | 0.5–0.8 s a line | appears |
| Dust puff | 4 dots: translateY −14 px + scale + fade | 450 ms | none |
| Duster wipe (between beats, every round intro, Time Out) | duster translateX −110 % → 110 %, old text fades under it | 450 ms (Time Out 300 ms) | instant swap |
| New word (Yay / Nay / Skip) | card exit 150 ms (kept), then chalk write | 300 ms | appears |
| Tally mark | SVG stroke-dashoffset draw | 200 ms | drawn |
| Dob note in | translateY 16 px + rotate −4° + scale .9 → rest | 260 ms | fade 120 ms |
| Crowd wiggle | rotate −3.5° ↔ 1.5° | 400 ms, once per new dobber | none |
| Voice bubble | pop in from its side, hold, fade | ~1.3 s | fade only |
| Clock ≤ 10 s | scale 1.08 pulse per tick | 1 s | none |
| Gold star slap | scale 1.8 rotate −30° → overshoot → rest | 450 ms | appears |

**Voices — wiring.** `li5Voice(kind)` with `kind ∈ yay | roll | nay`. **Local and packet-free**: each
device fires off the outcome it already receives — the describer on its own tap, everyone else on
`LI5_CARD.last` — keyed by `cardNo` so the describer's device never fires twice. *Roll* when the
streak reaches 3, and every 3 after. **One at a time:** a voice arriving while one is up is dropped,
never queued (a fast turn would build a backlog). Corners cycle tl → br → tr → bl; per-screen zones
sit on the category row and the tally row (describer), beside the **?** (guess), on the header row
(tattle) — never over the word, the list or a button. Pools are the R2b copy, in `LI5_VOICES`.

**Miss's aside — wiring.** `HYPE_POOLS` → **`LI5_MISS_ASIDES`**, same selection logic as
`getHypeMessage()` plus an `opening` pool for a group's first turn. **Host-picked and sent in
`LI5_TURN.aside`** (round-intro rule: flavour is host-picked and synced in MDLM); PTP picks locally.
Re-voiced, held to the dictionary test — **owner to approve with this plan**:

| Pool | Lines |
|---|---|
| opening | Use your words. · No pointing at things in the room. · Inside voices? Not today. |
| finalRound | Last turn before the bell. · Final turn. Best effort, please. · Nearly home time. |
| scoreless | Let's get a tally on the board. · Eyes open. Nobody's napping. · The first one's the hardest. |
| hot | Top of the class so far. · Look at all those tallies. · Very impressive. Don't get cocky. |
| trailing | Thinking caps on, please. · Plenty of time to catch up. · A bit behind. Big turn, please. |
| tied | Neck and neck. · All square. Sit up straight. · Dead even. Somebody break it. |
| leading | Out in front. Stay there, please. · Lovely work. Keep it up. · In the lead. No showing off. |

### 4.6 Departures this plan implies (logged at R13)

| # | Rule departed | What instead | Why |
|---|---|---|---|
| D1 | The Stack's shape | The board fills the Stage edge to edge; Controls sit on the chalk tray (the Stack's spacing kept) | The board is the world |
| D2 | Transient layering — notes float over the Controls zone | The dob note sits over the tray, not the Stage | The word and list must stay readable while answering |
| D3 | ⏸ / ⏭ header icons | The wall clock is Time Out; 🔊 (instant mute) / `[?]` / ✕ stay | Five icons fought the clock (R1 s0) |
| D4 | *All team games use `showWhoFirst()`* | MDLM / TLM: Miss picks the first group (host, random), announced on the first wipe-and-write. PTP keeps it | A host-only screen everyone waits on, for a coin toss |
| D5 | Host-gate rule (the host taps the gate) | The **describer** taps **Ready, Miss!**; the host still stamps `endTimestamp` on receipt | The person who must be ready is the one up the front |
| D6 | Decision Modal for ending a turn early | *End my turn* inside the Time Out view (already a deliberate second tap) | One fewer overlay mid-turn |
| D7 | R-Intro board fidelity | Brief + Line-up stay engine-rendered under the board | Engine screens aren't game-styled (option b rejected) |
| D8 | Motion Standard's 300 ms cap | Chalk write 0.5–0.8 s; duster 450 ms | The write-on *is* the world; loosened rule |

---

## 5. The MDLM network spec · *for owner review (9 Nov)*

### 5.1 Shape

**Host-authoritative.** The host holds the deck, the scores, the clock, the turn log and the dob tally.
Every client renders only what it is sent. **No bots** (a spoken game). Bounds read only constants and
`window.mpLobbyStyle`:

```js
supportedModes: ['ptp', 'tlm', 'mdlm'],   recommendedMode: 'ptp',   // unchanged — owner may revisit at R15
getMaxPlayers: () => window.mpLobbyStyle === 'team' ? 2 : 12,
getMinPlayers: () => window.mpLobbyStyle === 'team' ? 2 : 4,
rosterConfig:  { type: 'none', showTeamNamesInPreLobby: true, defaultTeamNames: [...], hasCaptain: false },  // unchanged
intro: { template: 'intro-li5', scene: () => Li5Scene,
         brief: () => window.syllyMultiplayerMode === 'single' ? 'ptp' : window.mpLobbyStyle === 'team' ? 'tlm' : 'default',
         lineup: { type: 'teams', teamNames: ['Crayon Crew', 'Glue Stick Gang'], minPerTeam: 2, balanced: false } },
reconnect: { sendState: idx => li5SendState(idx), pause: () => li5ReconnectPause(), resume: () => li5ReconnectResume() },
```

**TLM is MDLM with two seats** — recommended, and a change from R1's note that the monitor "stays for
TLM". Seat 0 (host) is group 0, seat 1 is group 1; a device's role each turn is its group's role, and
the describing device is always "up the front" (its group huddles round it, as in PTP). The asymmetric
monitor and `isClientTurn` go; Yay / Nay move from *the host's device, always* to *the describing
device* — the same rule as MDLM. One code path instead of two. **Owner to confirm.**

**Roles each turn** — `li5RoleOf(seat, turn)`, pure:
`up` (seat === `turn.upSeat`) · `guess` (same group, not up) · `tattle` (other group). Groups come from
`window.mpLobbyRoster.playerTeamIdx` (the Line-up writes it; TLM builds `[0, 1]` itself). Each group
keeps an up-pointer `li5UpPtr[g]`; its members in Line-up order take turns and wrap — so in a 3-v-2
the pair describe more often, as R2 accepted.

**Who knows the word.** Never on the wire to a guesser — the current word, its No-No List and its
Extra Credit flag travel only by `mpSendPrivate` to the describer and the tattletales. **The one
exception is structural:** the host device holds the deck, so when the host is guessing its *screen*
never shows the word but its memory has it. Without a server there is no way round it; it is stated
here so nobody "fixes" it into a false guarantee. `screen-li5-guess` has no word element at all, so
there is nothing a stale render could leave behind.

### 5.2 Packet table

All game packets carry `turnId` (a match-wide counter; `0` survives the wire). Appliers **drop any
packet whose `turnId` is older than the current one**; ACTIONs with a stale `turnId` / `cardNo` are
dropped by the host. **The host takes a submitter's seat from `originId`** (`li5SeatOf`, the
`combSeatOf` pattern), never the payload. The host applies its own taps directly — the dedup guard
drops self-sent ACTIONs.

**Host → all (public SYNC)**

| Packet | Payload | When | Applier |
|---|---|---|---|
| `LI5_MATCH` | `{ teamNames[2], playerTeamIdx[n], rules: { timer, rounds, penaltyMode, skipFree, timePenalty, corrections, sylly } }` | once, from `onPassThePhone` (host) | stores roster + rules; no screen change |
| `LI5_TURN` | `{ turnId, round, totalRounds, team, upSeat, scores[2], aside }` | each turn's wipe-and-write | **rebuilds every turn-scoped accumulator from nothing** (feed, notes, dobs, cooldown, review, voice dedupe), then shows `screen-gatekeeper` in this seat's role state |
| `LI5_CLOCK` | `{ turnId, endTimestamp, paused, remainingMs }` | turn start, Time Out, resume, a time penalty, reconnect resume | **clock only**. The first one of a turn also moves each seat to its role screen |
| `LI5_CARD` | `{ turnId, cardNo, last: { action, word, isSylly, points } \| absent, scores[2], streak }` | after every mark | feed + tallies + voice. `last.word` **only when `action === 'correct'`** |
| `LI5_TIME_UP` | `{ turnId }` | host clock hits 0 | *Time!* on every screen; buttons dim |
| `LI5_REVIEW` | `{ turnId, log[], scores[2], upSeat }` | turn end (after the grace), after each flip | Report Card on every device. The turn is over, so every word may show |
| `LI5_GAMEOVER` | `{ scores[2], matchLog[], wordsExhausted }` | last review closed, or deck empty | `screen-gameover` on **every** device (an `MP_END_SCREENS` member) |

**Host → one seat (private, `mpSendPrivate`)**

| Packet | To | Payload | Applier |
|---|---|---|---|
| `LI5_WORD` | describer + each tattletale | `{ turnId, cardNo, word, nonoList[], isSylly, category, next? }` — **`next` (the following card) in the describer's copy only** | show the card for the highest `cardNo` seen; the describer caches `next` |
| `LI5_DOBS` | describer + each tattletale | `{ turnId, cardNo, counts[] }` — distinct dobbers per No-No slot; the last slot is *the word itself* | describer: notes / crowd; tattle: *N dobbed* dots |
| `LI5_STATE` | a rejoining seat | role-stripped snapshot (§ 5.7) | standby → live, idempotent |

**Client → host (ACTION)** — every one fire-and-forget, idempotent by `turnId` + `cardNo`; **no
`mpLockSync`** (§ 5.4).

| Packet | From | Payload | Host does |
|---|---|---|---|
| `LI5_READY` | up | `{ turnId }` | drop unless seat = `upSeat` and the clock isn't running; draw card 0 + 1; send `LI5_WORD`s; stamp `endTimestamp = now + timer`; send `LI5_CLOCK` |
| `LI5_MARK` | up | `{ turnId, cardNo, action }` (`correct` \| `taboo` \| `skip`) | drop unless seat = `upSeat` and `cardNo` = current (or the last card inside the grace); score via `li5Score()` (§ 5.8); draw; `LI5_WORD`s → `LI5_CARD` (+ `LI5_CLOCK` on a time penalty) |
| `LI5_TIMEOUT` | up | `{ turnId, paused }` | freeze / restore the clock → `LI5_CLOCK` |
| `LI5_END_TURN` | up | `{ turnId }` | end the turn now; the card on screen doesn't count |
| `LI5_DOB` | tattle | `{ turnId, cardNo, slot }` | drop unless seat is in the other group, `cardNo` current, and the seat's 5 s cooldown is clear; add the seat to `slot`'s dobbers (a repeat counts once) → `LI5_DOBS` |
| `LI5_WAVE` | up | `{ turnId, cardNo, slot }` — **I didn't** | clear that slot → `LI5_DOBS`. (**I said it** is `LI5_MARK taboo`) |
| `LI5_FLIP` | up, or the host | `{ turnId, row }` | Pinky Swear only; `li5Score` re-clamp → `LI5_REVIEW` |
| `LI5_NEXT` | up, or the host | `{ turnId }` | close the review → next `LI5_TURN` or `LI5_GAMEOVER` |

**Generic, no LI5 handler:** `MP_PLAYER_LEFT` (quit), `MP_INTRO_*` (Intro), `MP_AWAY_STATE` /
`MP_REJOIN*` (reconnect).

Dob slots are **indices, never words** — a word as a Firebase key breaks on `.` `#` `$` `/` `[` `]`,
and an index can't be spoofed into a word the card doesn't have.

### 5.3 The brief's questions, answered

| Question | Answer |
|---|---|
| **Who opens the clock** | The describer's **Ready, Miss!** is `LI5_READY`; the host stamps `endTimestamp` on receipt and sends `LI5_CLOCK`. The host still owns the clock — departure D5 |
| **Time Out** | Describer only: `LI5_TIMEOUT`. The host stores `remainingMs` and broadcasts `paused`; on resume `endTimestamp = now + remainingMs`. Every screen rubs off its word (tattletales too) |
| **Resolved words to guessers** | `LI5_CARD.last.word` only for a Yay; Skip / Nay travel as blanks; the Report Card reveals all once the turn ends. The current word: never |
| **Report Card + Pinky Swear** | Everyone sees it. **The describer flips and taps *Your Turn →*; the host can too** (an override for a describer who wanders off). Everyone else reads *Waiting for Jack…* |
| **Dob cooldown** | **5 s per player, host-enforced**, mirrored locally for the dimming. A crowd = **distinct dobbers on one slot**; the same player twice counts once |
| **A drop up the front** | **Adopt `reconnect`** (§ 5.7). Note: the brief's "a drop ends the session after 20 s" is out of date — since SW v240 a non-adopter gets a 60 s grace and then the host is *asked*; nothing ends on its own. Skipping the dropped describer's turn was rejected: the engine's Away overlay already freezes every device, so the game can't act round it — the hook is the right tool, and LI5's state is small |
| **Firebase empties** | § 5.9 |

### 5.4 Ordering and latency

- **Cross-channel order is not guaranteed.** Public (`/events`) and private (`/private/{uid}`) are
  separate listeners. The describer may get `LI5_CLOCK` before its first `LI5_WORD`, a tattletale
  `LI5_CARD` before the new `LI5_WORD`. **Every applier tolerates either order:** cards render by the
  highest `cardNo` seen; the describer board has a `waiting-word` state.
- **The next word is instant.** `LI5_WORD.next` lets the describer's board advance on its own tap,
  optimistically; the host's packets confirm. A mark the host refuses only happens once a turn is over
  (stale `turnId`), and the turn-end packets repaint everything anyway.
- **No sync lock on marks.** `cardNo` is the idempotence key: a double tap marks one card once; a
  lock would also swallow a Time Out tapped in the same breath. Today's 300 ms debounce stays. Same
  family as NAT's votes (logic-engine.md § Sync Lock — fire-and-forget ACTIONs).
- **Clock skew.** Every device counts down from `endTimestamp` against its own clock (GTH's accepted
  model); **only the host ends a turn**. A client at 0:00 shows *Time!* and waits.

### 5.5 The turn, end to end

```
LI5_TURN ─► wipe and write on every device
   up taps Ready, Miss! ─► LI5_READY
host: draw 0+1, LI5_WORD×(1+tattles) ─► LI5_CLOCK(endTimestamp) ─► each seat to its role screen
   ┌─ up: LI5_MARK ─► host: li5Score, draw, LI5_WORD×k ─► LI5_CARD (─► LI5_CLOCK on −secs)
   ├─ tattle: LI5_DOB ─► host: cooldown, tally ─► LI5_DOBS
   ├─ up: LI5_WAVE ─► LI5_DOBS          up: I said it ─► LI5_MARK taboo
   └─ up: LI5_TIMEOUT ─► LI5_CLOCK(paused) … ─► LI5_CLOCK(resumed) | LI5_END_TURN
host clock 0 ─► LI5_TIME_UP ─► 1 s grace (a mark for the last card still counts) ─► LI5_REVIEW
   up/host: LI5_FLIP* ─► LI5_REVIEW …   LI5_NEXT ─► LI5_TURN | LI5_GAMEOVER
```

**`LI5_TIME_UP_GRACE_MS = 1000`.** A Yay tapped at 0:01 lands after 0:00 on a real network; the grace
lets it count, and *Time!* chalked on every board fills the second. Out of words mid-turn → the review,
then `LI5_GAMEOVER { wordsExhausted: true }` (today's behaviour).

**Settle, then send.** Each host step finishes every mutation (score, streak, draw, accumulator
resets) before the first send, and the private `LI5_WORD`s go before the public packet.

### 5.6 Missing-handler audit

Every control on every LI5 screen, by phase and role. **No control is left without a path.**

| Phase | Role | Control | Path |
|---|---|---|---|
| Intro | all | everything | engine (`MP_INTRO_*`, quit contract) |
| Round intro | up | **Ready, Miss!** | `LI5_READY` (host: direct) |
| Round intro | guess / tattle | — | none (chrome only) |
| Describing | up | Yay / Nay / Skip | `LI5_MARK` |
| Describing | up | wall clock | `LI5_TIMEOUT { paused: true }` |
| Describing | up | note: **I said it** / **I didn't** | `LI5_MARK taboo` / `LI5_WAVE` |
| Describing | tattle | a No-No row / *They said the word itself* | `LI5_DOB` |
| Describing | guess | — | none |
| Time Out | up | **Keep going** / *End my turn* | `LI5_TIMEOUT { paused: false }` / `LI5_END_TURN` |
| Time Out | others | — | none |
| Time's up | all | — | none |
| Report Card | up, host | a row (Pinky Swear) / **Your Turn →** | `LI5_FLIP` / `LI5_NEXT` |
| Report Card | others | — | none (read-only) |
| Gameover | all | *Report cards ›* | local (`matchLog` came in `LI5_GAMEOVER`) |
| Gameover | all | **One More Go?** → confirm | `mpReturnToLobby()` (host) / leave (client) — existing |
| Every in-match screen | all | ✕ → confirm | `mpNotifyPlayerLeft(); resetToLobby()` |
| Every screen | all | `[?]`, 🔊 | local |

**Found at audit — fixed in this pass:**
- **The TLM monitor's ✕ breaks the quit contract.** `btn-li5-monitor-exit` calls `resetToLobby()`
  without `mpNotifyPlayerLeft()`, so the host is never told. `verify-mp-configs` § 6 checks
  `btn-quit-confirm` and never saw it. Dies with the monitor; the new screens' ✕ go through
  `quit-overlay`.
- **A TLM client never reaches `screen-gameover`** — nothing is sent at match end, so the client sits
  on the monitor, `mpNoteScreen` never fires and the match never "ends" for reconnect. `LI5_GAMEOVER`
  fixes it.
- `SETTINGS_SYNC`'s `li5` list omits `settingSyllyPct` and `settingCorrections`. Harmless once
  `LI5_MATCH.rules` is the clients' source; add both anyway so a client's settings overlay tells the
  truth.

### 5.7 Reconnect (adopting the hook)

- **`pause()`** (first seat Away): if the clock is running, freeze it exactly as Time Out does (store
  `remainingMs`) — but send nothing; the Away overlay already covers every device.
- **`resume()`** (last seat back): `endTimestamp = now + remainingMs` → **`LI5_CLOCK`** — the
  clock-only packet, never `LI5_TURN`, whose applier wipes the board.
- **`sendState(idx)`** → private `LI5_STATE { phase, turn fields, clock, scores, feed[], review?,
  gameover?, word?, dobs? }`, **stripped by role**: `word` and `dobs` only if seat `idx` is `up` or
  `tattle` this turn, `next` only if `up`. Built by the same function that builds the live packets'
  role filter — one source for *who may know*.
- **Client `onPassThePhone`** shows the standby state and is safe to re-run; a rejoining client needs
  no data load (the host has the deck).
- **Pinned:** `'li5'` joins the adopter list in `verify-mp-configs.js` § 7. `screen-gameover` is
  already in `MP_END_SCREENS`.

### 5.8 Single-source scoring

`applyAndAdvance()` mixes DOM and arithmetic today, and `flipEntry()` re-derives the same rules. Lift
the arithmetic into **`li5Score(state, entry, rules)`** (pure: points, clamp at 0, Extra Credit ×2,
`−secs` vs `−1`, free vs penalised skip) and **`li5Reclamp(log, scoreBeforeTurn)`**. PTP, the MDLM
host and Pinky Swear all call them — the logic-engine.md single-source rule, so a rules change can't
miss a path. The loopback compares a PTP match and an MDLM match fed the same deck and marks.

### 5.9 Firebase empties

| Field | Empty when | Rebuild |
|---|---|---|
| `LI5_CARD.last` | card 0 | absent → `null` |
| `LI5_CARD.last.word` | Skip / Nay | absent → `null` |
| `LI5_WORD.next` | the deck's last card | absent → `null` |
| `LI5_REVIEW.log` | no words played | `li5WireList(p.log)` → `[]` |
| `LI5_GAMEOVER.matchLog[i].entries` | a turn with no words | `|| []` per entry |
| `LI5_STATE.feed`, `.review`, `.word`, `.dobs` | phase-dependent | each normalised |
| `scores`, `counts`, `playerTeamIdx` | never empty (zeros survive) | `li5WireArr(v, n, 0)` anyway — a half-dense array arrives as an object |

`li5WireArr` / `li5WireList` follow `cjarWireArr` — own copies, so the loopback runs without
`engine-intro.js`.

### 5.10 `tools/verify-li5-loopback.js`

The `verify-cjar-loopback.js` shape: one `vm` per device, a **wire** (`fbWrite` / `fbRead` that erases
`null` / `{}` / `[]` and turns half-dense arrays into objects — asserted first), the private channel
routed per uid, **real mock DOM elements** (a factory recording `textContent`, `innerHTML`, `style`,
`classList`), every device's `console.warn` counted as an error, a fake clock, and **`LI5_SRC=`** to
run a broken copy. Seeded deck.

| § | Proves |
|---|---|
| 0 | **PTP regression** — a whole single-device match: setup → wipe and write → describer → review → gameover |
| 1 | The wire erases what Firebase erases |
| 2 | Config: modes, bounds (4–12 MDLM / 2 TLM), `intro`, `reconnect` |
| 3 | Match start on 4 (2v2), 6 (3v3) and 5 (3v2): roster, names, roles, Miss picks a first group |
| 4 | **Privacy** — across a whole match, no public envelope and no envelope to a guesser seat contains the current word, any of its No-No List, or its Extra Credit flag (Yay'd words after resolution and the post-turn Report Card excepted); no guesser device's DOM text ever does; the host-as-guesser's `screen-li5-guess` never does |
| 5 | Ready gate: only `upSeat`'s `LI5_READY` starts the clock; only the host stamps it |
| 6 | Marks: scores match the PTP run fed the same deck + marks (§ 5.8); Extra Credit ×2; `−secs` moves `endTimestamp` everywhere; a stale or repeated `cardNo` applies once; a mark from anyone but `upSeat` is dropped |
| 7 | Dobs: 5 s cooldown host-enforced; distinct dobbers; same dobber counts once; describing-group dob dropped; stale card dropped; I said it = Nay; I didn't clears the slot; notes clear on a new card |
| 8 | Time Out: remaining time preserved; only the describer pauses; End my turn |
| 9 | Clock: only the host ends a turn; a mark inside the 1 s grace counts, after it doesn't |
| 10 | Review: flips by up + host only, re-clamp matches `li5Reclamp`; rotation in Line-up order, wraps, 3v2 |
| 11 | Gameover reaches `screen-gameover` on **every** device; the out-of-words path |
| 12 | Quit contract from every LI5 screen, every role |
| 13 | Reconnect: pause stops the host clock; resume sends `LI5_CLOCK` only; `sendState` to a guesser carries no word, to a tattletale word + dobs, to up `next` too; the applier is idempotent; the rejoiner is built **after** resume |
| 14 | TLM: two devices, roles alternate, the tattle device gets the word, the describing device marks |
| 15 | Zero `console.warn` on any device across every run |

**Broken copies that must go red** (`LI5_SRC=`): the word in `LI5_CARD` for a Skip · no `originId`
check on `LI5_MARK` · `p.log` read raw · no cooldown on `LI5_DOB`. Each is a one-line edit; the run
records which § catches it.

### 5.11 Verification, named up front

`verify-li5-loopback.js` (new) · `verify-game-intro.js` + `mutate-game-intro.js` (the hook) ·
`verify-mp-configs.js` (bounds, § 7 adopters) · `verify-mp-reconnect.js` · `verify-identity-docs.js`
· `verify-build-fresh.js` · `verify-tv-labels.js` · then `visual-check` at 320×452 → 375×548 → 375×667
plus a reduced-motion pass, and the R15 session on ≥ 3 phones.

### 5.12 Stage breakdown

Each stage ends green and is one commit. **Test first:** the stage's harness section is written
before its code.

| Stage | Scope | Done when | Model |
|---|---|---|---|
| **S0** | Engine: scene `beat` hook, `data-intro-unassigned`, no Line-up in TLM (§ 4.4) | the new `verify-game-intro` section + 3 mutants green; every existing intro check still green | Opus, high — engine contract |
| **S1** | Network: `li5Score` / `li5Reclamp`; the host turn engine; `li5HandleEnvelope`; config (modes, bounds, `intro` without scene, `reconnect`); delete the engine's LI5 block + monitor; **minimal** role screens (plain markup, no world) so the DOM mocks have targets | `verify-li5-loopback.js` §§ 0–15 green; the four broken copies red; `verify-mp-configs` + `verify-mp-reconnect` green | Opus, high — MP sync |
| **S2** | World kit: `li5-scene.js`, `css/li5.css`, slate texture; Intro adoption (template + scene); `sw.js`, load order, scripts partial, `CACHE_NAME` | Intro plays on the board at the three sizes; reduced motion static | Sonnet, medium |
| **S3** | Wipe and write (`screen-gatekeeper`) + Miss's asides | all five states at three sizes | Sonnet, medium |
| **S4** | Describer board: Time Out, notes + crowd, voices | every § 4.3 state | Sonnet, medium |
| **S5** | `screen-li5-tattle` + `screen-li5-guess` dressed | both, every state; loopback still green | Sonnet, medium |
| **S6** | Report Card, gameover, history, play again | — | Sonnet, medium |
| **S7** | R8 / R9: menu, Settings (*Reading Level*), How to Play; identity doc paired sections (T1–T7, T10) land with the code | `verify-identity-docs` green | Sonnet, medium |
| **S8** | R10 Practice (`practice-rollout.md` § 6.19) | — | Sonnet, medium |
| **S9** | R11 Impeccable · R12 TV labels · R13 departures · R14 harnesses + visual-check | all green | Sonnet, medium |
| — | **R15** owner hardware pass · **R16** closure (SW bump, `MP_PROTOCOL_VERSION`, docs) | owner | — |

Sessions: **A** = S0 + S1 (Opus) · **B** = S2–S4 · **C** = S5–S7 · **D** = S8–S9 (Sonnet).

### 5.13 Owner decisions this plan needs

1. **TLM folds into the MDLM path** (§ 5.1) — Yay / Nay move to the describing device. *Recommended.*
2. **Miss's aside copy** (§ 4.5) — approve or edit.
3. **Report Card control** — describer + host (§ 5.3). *Recommended.*
4. **Adopt `reconnect`** (§ 5.7). *Recommended.*
5. **Miss picks the first group** in MDLM / TLM (D4). *Recommended.*

**Owner answers (9 Nov 2026):** all five as recommended — TLM folds into the MDLM path; describer + host
control the Report Card; adopt `reconnect`; Miss picks the first group; **Miss's asides approved as
written** (§ 4.5).
