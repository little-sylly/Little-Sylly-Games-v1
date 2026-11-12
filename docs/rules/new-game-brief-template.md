# New Game Brief — [GAME NAME]
**Document type:** Phase 1 — Design Brief (non-technical)
**Who fills this in:** Project owner + an AI (Claude, Gemini, ChatGPT), before any technical work. Works equally well filled in by hand.
**Output goes into:** `docs/new-game-brief-[name].md`
**What happens next:** **Stage 1b — World + Directions** (`new-game-process.md`): an Opus session turns §0 into three visual directions, you pick one, and §0d records what it changed in this brief. Only then hand it to Claude Code alongside `new-game-technical-template.md` and the rule files (`logic-engine.md`, `ui-style.md`, `definitions.md`, `docs/game-identities/*.md`, `CLAUDE.md`, `docs/code-map.md`). Claude Code reads this brief, fills in the technical template, and presents it for confirmation before writing a single line of game code (Stage 2).

<!--
CHANGELOG
Original template — rewritten after the Pecking Order (pko) brief. Added the "(if applicable)"
sections for rule-heavy games (Rule Relationships, Complex Interaction UI, Rule Reference, Sound
Design, End Screen Content).

15 Oct 2026 — **template and prompt merged into this one file.** The old "prompt" (paste into an AI
with a rough idea) and the old "template" (blank form) described the same document and had drifted
apart. This file is both: the AI instructions are the blocks marked "For the AI" and the fill-in forms
are §1–§24. To use it by hand, ignore the AI blocks. Everything from the two files was carried across:
- Sections 22–24 appended so §1–§21 numbering is unchanged: §22 Bots, §23 Hints & Tips,
  §24 Practice Tab (Tutorial).
- Status header, marker key and a Locked / Soft-locked / Open for build close.
- Minimum players is 2 (a game may fix exactly 2). "Bots / solo" is its own field; the registry
  minimum stays 2.
- Applicability is explicit: "N/A — why" is a complete answer. §4 renamed "Rule Interactions".
- §8 Sylly Mode has three statuses (Designed / Deferred / Omitted).
- §11 gains a colour table, accessibility check and art inventory. §12 is the original 7 questions
  plus 4 more (11 in all). §16 Sound Design and §20 Mood & References gain real guidance.
- **Rules are now tiered** (Hard / Strong default / Guidance) instead of one flat list of
  "non-negotiables". See "The rules of the suite".
- Games table updated through `fyfi`, `hsg` (shipped, SW v288) and `eta`.

10 Nov 2026 — **world first (the UI revamp, after the LI5 pilot).** New **§0 The World & the Intro**
(world, narrator, the match-start Intro's copy, round-intro mood beats, and §0d for the Stage 1b
direction pick) — numbered 0 so §1–§24 keep their numbers and a pre-revamp brief only *adds* a
section. §1's "thematic universe" now points at §0, and brand colour is provisional until §0d.
§9 vocabulary comes from the world and covers every string. §11 splits scene palette from brand
colour. §12 gains Q12 (how teams form). §13 lists the Intro. The rules section moves to the revamp's
frozen / default split. Provisional until GM (pilot 2): the shared scene kit, and a Line-up for
seats (only team Line-ups exist).
-->

---

## How to use this document

1. **Flesh the idea out first** — gameplay, then theme and vocabulary — in whatever form you like. Put your notes in "Idea notes" just below.
2. **Give this file to your AI along with the idea** ("fill in this brief for my idea") or fill it in yourself. The more developed the idea, the less the AI has to assume. If it is still rough, that is fine: the AI drafts with marked assumptions and lists what it needs from you at the end.
3. **Build the world (§0) before naming anything.** Every Little Sylly game is a **world**. Several games share familiar mechanics; the world is what makes each one feel like ours. The name, vocabulary, colours, Intro and end screen all come from §0, so do it first, even for a quick draft.
4. **Work through every section.** Write in plain English. Nothing needs to be technically correct — describe what you imagine and note what you're unsure about.
5. **Not every section applies to every game, and "Not applicable" is a normal answer.** Sections marked **(if applicable)** are for games that have the thing they describe. If the game doesn't, keep the heading and write one line — `N/A — [why]` — rather than inventing content. Fields inside a required section can be "none" too (for example, roles in §2: "none — every player has the same role").
6. **Revise.** Answer the Open Questions at the end, check every marked assumption, and refine until you're happy.
7. **Then Stage 1b.** A separate session designs three visual directions from §0. You pick one, and the brief is revised to match (§0d). The brand colour, the terms or the Intro copy may change at this point, and that's expected.

**Bringing over a brief written before November 2026?** Keep §1–§24 as they are. Add §0, then work through §0's re-check list. That list names every section the world tends to change. Pre-revamp briefs usually have their mechanics done and their world thin, so that's where to spend the time.

**Section tags**

| Tag | Meaning |
|---|---|
| **(REQUIRED)** | Always fill in. Short is fine for a simple game |
| **(if applicable)** | Fill in only if the game has the thing; otherwise one line `N/A — why` |

Always required: Status, §0 (§0d is filled at Stage 1b), §1, §2, §3, §5, §6, §7, §8, §9, §11, §12, §13, §17, §19, §21, §24 (plus §18 and §20, which can be short). Only if the game has the thing: §4, §10, §14, §15, §16, §22, §23.

Expect §22 (Bots), §23 (Hints & Tips) and §24 (Practice Tab) to be thin at first draft. They are planned now and filled in with real evidence after the first playable alpha.

---

## Idea notes (optional — paste whatever you have)

> **For the AI:** treat everything in this box as the source material. If a real board or party game is referenced, the owner describes the core mechanic in their own words, so don't assume you know the rules. Adapt the mechanic for mobile and say clearly what changes from the original.

**The idea in rough words** (fragments, references, vibes, bullet points):

**Gameplay notes** (what players do, how it ends):

**Theme and vocabulary notes** (names, words, mood already chosen):

**Already decided** (things you don't want re-litigated):

---

## For the AI — how to produce the brief

You are helping design a new game for **Little Sylly Games**, a free suite of social party games that run in a mobile browser. Produce a complete first draft of this brief for the idea above.

- Keep the headings and field labels in the order given, and fill them in. The blockquote guidance under each heading is for you; delete it from the finished brief if you like. Keep any `N/A — why` lines.
- **Prefer a working draft with marked assumptions over blank sections.** Don't stall on a missing detail: decide, mark it, and list it in Open Questions at the end.
- Where the guidance says "plain English", write for a non-technical reader. No code, screen IDs, variable names or framework mentions outside the optional Stage 2 appendix.
- Tables are a convenience. Prose or lists are fine wherever they read better.

### Marker conventions — use these consistently

- `[ASSUMPTION: ...]` — a decision you made on the owner's behalf
- `[CLARIFICATION NEEDED: ...]` — a genuine design blocker you can't resolve without the owner
- `[PLACEHOLDER]` — provisional wording (names, vocabulary) to be checked before the pre-build review
- `[SOFT-LOCKED: ...]` — a working decision, reviewed again before implementation
- `[OPEN FOR BUILD: ...]` — to be tried out and decided while building
- `[MATHS]` / `[UNTESTED]` — a number or threshold that is a first guess and must be refitted from real play
- `[DEVIATION: ...]` — a strong-default rule (see below) that this game deliberately breaks, with the reason
- Evidence labels, used in §19, §22 and §23: `[SIM]` (from simulation), `[PLAYTEST]` (from real human play — say how many testers), `[ORIGINAL]` (a known strategy or fact from the original game, for reskins)

---

## About Little Sylly Games

Single-page mobile app, no user accounts, no saved progress — everything resets when the game ends. Two ways to play:

- **MDLM** — multi-device lobby. Each player is on their own device and joins with a room code (no sign-in).
- **PTP** — pass-the-phone. One shared device is passed around the table.

A game may support one or both. Some games are hybrids (for example, two teams each on one shared device, passing it around inside the team) — see §12.

**Existing games in the suite (including games in design)** — so you understand the genre and don't duplicate a concept:

| Abbreviation | Game name | Core type |
|---|---|---|
| `li5` | Like I'm Five | Describing words without forbidden terms |
| `gm` | Great Minds | Two players telepathically find a shared word |
| `ss` | Secret Signals | Team encryption/deduction |
| `jec` | Just Enough Cooks | Collaborative ingredient-guessing, hit the sweet spot |
| `ygi` | You Get It? | Social polling — who relates most? |
| `lttp` | Late to the Party | Social deduction — who's the outsider? |
| `nat` | Natural Selection | Role-based wildlife clue-giving, find the mole |
| `dsd` | Deep-Sea Deploy | Codenames-style sequential deduction for two teams |
| `gth` | Group Therapy | Simultaneous drawing + diagnosing psychological disorders |
| `dyb` | The Bluff | Liar's Dice — escalating bluffs about hidden dice (cliff/climb theme) |
| `bld` | Bailed | Hidden-role social deduction + cooperative sabotage |
| `pass` | Pass | Climbing card game — shed your hand to win |
| `nt` | Net-Trace | Network engineering — harden your relay-leg node, route the signal, minimise SER |
| `frt` | Fruit Salad | Cockroach Poker bluffing — pass a face-down fruit card with a (possibly false) declaration; call bluff or pass it on |
| `shp` | Counting Sheep | O'NO-99 climbing/survival — keep the Herd ≤ 99 or fall into Deep Sleep; Sylly Mode = Night Terrors (Climb ⇄ Plunge) |
| `flw` | Flawless | Gem-trading bluffing — pass a face-down Showpiece and declare its identity; the receiver challenges or accepts; Diamonds awarded via the Ledger; Sylly Mode = The Counterfeit Run |
| `pko` | Pecking Order | Adjacency-based predator-chain climbing card game — beat Marks with their specific immediate predator, not numeric rank; two parallel tracks (Land/Sea) with cross-links; Sylly Mode = Force of Nature |
| `cjar` | Cookie Jar | Simultaneous-choice push-your-luck — a card flips, everyone secretly Takes or Sneaks Out, a second sighting of the same family member busts the Raid; Sylly Mode = Dibber Dobber |
| `cld` | Cold Shoulder | Physics slingshot-shove — penguins on an ice floe aim blind and all slide at once; off the edge = Drowned (rides the rim, throws snowballs); last player Standing catches a Fish; suite's first physics game (`js/lib/physics.js`); Sylly Mode = The Thaw |
| `comb` | Honeycomb Hills | Hex-and-resource engine-builder on a 19-hex meadow — one 2d6 cast pays every player at once, spend on walls/cells/domes, negotiate the rest; MDLM-only, 3–4 players; the suite's longest game (25–50 min) and the **only one with no Sylly Mode** (seven settings carry the difficulty axis instead) |
| `eta` | ETA? | Estimation + persuasion (E.T.A. Couriers, narrator Dot) — each courier gets a secret Ride, logs an ETA for a shared Route on the Time Dial, defends it out loud (Talk Me Through It, Stamps of Approval), then Proof of Delivery scores accuracy on the ratio to the truth; MDLM-only, 3–8; the first new game built world-first (Stage 1b); Sylly Mode = Backseat Drivers (secret multiplying Course Corrections) |
| `fyfi` | Flip You For It | Two-player 3x3 collectible cap duel (Triple Triad-inspired) — place caps wearing the suite's game stickers, flip the opponent's by edge numbers, chain reactions; best-of-3/5 series; bot opponent (Easy/Medium/Hard); Sylly Mode skipped for now |
| `hsg` | Hide and Shogun | Two-player hidden-tile grid duel (Banqi–inspired), built SW v278–v288 — hide-and-seek in a castle of paper doors, narrated by the Storyteller (a rakugo teller). 5×6 lattice, 30 doors: each clan's 13 (Shogun, Guards, Monks, Samurai, Ninja, Archers, Farmers) plus 2 or 4 foxes that side with whoever finds them; the win is striking the Shogun (a living Guard shields him from all but a fox); Last Lantern clock (12 quiet Commands), Honour Seals, first to 1/3/5; PTP, MDLM and Solo vs bot (Easy/Medium/Hard); reconnect adopted; Practice (9 lessons) and the Household gallery; **no Sylly Mode** (COMB's form, deferred). Brand Lantern gold `#B8862B`. Game 22 |

**Abbreviations already taken:** `li5`, `gm`, `ss`, `jec`, `ygi`, `lttp`, `nat`, `dsd`, `gth`, `dyb`, `bld`, `pass`, `nt`, `frt`, `shp`, `flw`, `pko`, `cjar`, `cld`, `comb`, `fyfi`, `hsg`, `eta`

---

## The rules of the suite

Rules come in three strengths. A brief should respect all of them, but only the first tier is non-negotiable.

### Hard rules — a brief doesn't override these
If the idea genuinely needs one of these broken, don't break it quietly: raise it as a **BLOCKER** in Open Questions for the owner to decide.

- **A mobile browser, nothing more.** No installs, accounts or sign-in, and no special hardware. Anything beyond taps, text, the screen and sound (camera, microphone, motion sensors) must be raised as a BLOCKER first. The only real-time feature is room codes
- **No saved progress.** No user accounts, no score history, no data carried between sessions. (Device preferences such as nickname, settings and chosen skin may be remembered; game state and history may not)
- **No trademarked names, characters, logos or art** in the title, pieces, vocabulary or content. Use generic or folklore/public-domain stand-ins (a "giant eagle", not a film's eagle). Content names live in data and must be swappable
- **Australian English throughout:** colour, flavour, organise, recognise, °C, km, kg. No American spellings
- **Every game has the suite's standard shells:** the game menu (Play, then How to Play, then Settings, then Back to the Box), a How to Play overlay (one card per step, then a card titled exactly "Winning and Scoring", then a "✨ Sylly Mode" card), and a **Practice tab** (§24). These shells and the buttons in them look the same across all games — same shapes, same sizes, the brand colour with white text, no emoji on action buttons. The world goes *inside* them (their words and content), not into reshaping them
- **Every match opens on the suite's Intro** (§0b): narrator lines, a short brief for your role, the Line-up for team games, then Ready. The suite builds that screen; a game brings its words and its scene
- **No new downloaded images or sound files without an agreed size limit.** Scenes are drawn in code (shapes, gradients, animated type, 3D where it earns it). Sound effects are always synthesised by the suite
- **Sylly Mode is always the last setting**, and its card in How to Play always exists (it says so honestly if the mode is Deferred or Omitted — see §8)

### Strong defaults — follow unless you have a reason; if you deviate, say why
Record a deviation as `[DEVIATION: what and why]` and list it in §19's decisions log. These are expected to bend occasionally.

- **Player count: the suite range is 2–8.** A game may fix a narrower range. Exactly 2 (a 1v1 duel) is common and fine — don't pad a duel to 3+ players. Treat 8 as a ceiling unless the brief justifies more
- **Device mode: one per gameplay phase.** A phase is either one shared device (PTP) or each player on their own (MDLM). Hybrids are allowed where they are explained in §12 — for example, a team sharing one device inside a multi-device game
- **Themed vocabulary.** Every generic on-screen term gets a game-voiced name (no bare "Round", "Score", "Game Over", "Settings", "Player"). A game may deliberately keep plain wording where that is part of its identity (Pass has no fiction; Like I'm Five doesn't use "Round" or "Score" at all) — list those as deliberate choices in §9
- **If elements beat, outrank, unlock or are immune to one another, tabulate it in §4** — not just prose. A prose description ("predators beat their prey") is ambiguous the moment there is a fork, a loop, a cross-category link or an exception, and every downstream section silently inherits whichever reading is guessed first
- **No duplicated core mechanic.** Check the suite list above. A game that overlaps an existing one is fine if the §1 overlap check says why it feels different
- **Settings:** gameplay settings first (difficulty-style when there is a difficulty axis), ✨ Sylly Mode last. A value that is only a guardrail and rarely reached in real play is a **fixed rule**, not a setting
- **The One Brand Rule:** controls (buttons, pills, toggles, the focus outline) use only the game's brand colour. **The scene and board art use whatever palette the world needs** (§0a, §11)
- **Two overlay shapes:** a popup is either a scrollable slide-up panel or a small centred confirmation box (three or fewer elements). Don't invent a third; flag a genuine need as an exception
- **Three-zone screens:** header row, central stage, controls area. This is a starting point, not a cage: if the chosen direction needs a different layout for the action screens, describe it and mark it `[DEVIATION]`. The speaker, ✕ and `[?]` buttons stay on every screen regardless
- **Screen-pattern and motion defaults** (round intros, team-setup screens, how long animations last) bend for the world the same way. Say what you want and mark it `[DEVIATION]`. Reduced motion is always honoured, and the game must run smoothly on a small, older phone (iPhone SE)
- **Non-technical language.** Plain English; no code, screen IDs, variable names, CSS or Firebase. Naming existing suite features or games is fine. Technical observations go in the optional Stage 2 appendix

### Guidance — use judgement
- **Abbreviation:** unique and lowercase, 2–5 characters (3–4 preferred; `gm` and `ss` already exist at 2). Check the taken list above
- **Vocabulary table:** cover the standard rows (Round, Score/points, Game over screen, Play again, Quit, Settings overlay title) and every game-specific term used in §3, §4 and §8; there is no minimum row count
- **Sample rounds:** one standard round is required; add one per Sylly Mode or hidden-information mechanic that needs proving
- **Bots:** worth planning if the game can have a computer opponent; a talk-heavy party game usually can't, and that is fine

---

## Status (REQUIRED)

> A short block at the top of every brief, so a reader can tell at a glance how settled it is.

| Field | Your answer |
|---|---|
| **Draft number and date** | |
| **Locked** (final: rules, name, emoji, abbreviation; the brand colour locks only after Stage 1b, §0d) | |
| **Stage 1b** (not yet / directions out / picked — link to the canvas) | |
| **Soft-locked** (working decisions, reviewed before implementation) | |
| **Still open** | |
| **Supersedes an earlier version?** | |

**Terminology note** (if the game is a reskin, or uses a different word from the original for its pieces): which word this brief uses, and why.

The marker key is under "For the AI" above; use those markers throughout.

---

## 0. The World & the Intro (REQUIRED — fill this first)

> **For the AI:** this is the section that makes the game *ours*. Mechanics are often familiar; a rich, specific world with matching visuals is what makes this game feel unlike the others in the suite. Make it **specific enough to draw**: "a primary-school classroom at 2:55 on a Friday" rather than "school". The name in §1, every term in §9, the end screen in §17 and the How to Play in §18 should all sound like they come from this place. If the owner's notes give a theme but no world, propose one and mark it `[ASSUMPTION]`. When the idea fits several worlds, offer two or three in a sentence each in §19 and pick one.

### 0a. The world

| Field | Your answer |
|---|---|
| **The place and the moment** (where and when, specific enough to draw) | |
| **Who the players are in it** ("the class", "couriers", "penguins on a floe") | |
| **The narrator** — a name and a role (who speaks at the Intro and the round intros), and how they talk | |
| **Three mood words** | |
| **The scene** — what the Intro and the action screens *show*. Drawn in code: shapes, chalk, paper, light, 3D where it earns it; no new image files unless agreed (§11) | |
| **The world's palette** — the scene art's colours. Separate from the brand colour, which is for buttons only | |
| **The signature moment** — the one visual or motion beat that belongs to this game and no other | |
| **What this world is NOT** — the nearest suite world it could slide into, and how it stays clear of it | |

### 0b. The Intro (the match start)

Every match opens on the same suite-built screen, in four beats:

1. **Narrator lines.** Each one shows for about 5 seconds, or until tapped. The host can skip them for everyone.
2. **The brief.** Up to 3 short lines on what *you* do.
3. **The Line-up.** Team games only: players pick a team, and the host can shuffle or auto-assign the rest.
4. **Ready.** The host can start as soon as the teams are valid, without waiting for everyone to tap Ready.

On a rematch the narrator lines are skipped. In pass-the-phone it is a single **Let's go** tap. The game provides only the words below and its scene.

| Field | Your answer |
|---|---|
| **Narrator lines** (2–5; one idea each, about 60 characters max — they say what's going on and who does what, in the narrator's voice) | |
| **The brief — default** (up to 3 lines; plain enough to act on, still in the world's voice) | |
| **Brief variants** (only where a role or mode sees something different: a secret role, pass-the-phone, a shared team phone. One set of up to 3 lines each) | |
| **The Line-up** — teams (each team's name, the minimum per team, whether teams must be even) **or** none (no teams; everyone is listed instead) | |
| **Line-up prompt** (the line over the team columns) and **what the "no team yet" column is called** | |

> If a team shares one phone (a "Team Lobby"), there's no Line-up — the phone *is* the team, and the Intro lists who's there instead.

**Worked example — Like I'm Five (the classroom):**

- **Narrator:** *Miss*, your teacher.
- **Lines:**
  - "Morning, class. Settle down, please."
  - "Today: explaining things so simply a five-year-old would get it."
  - "One of you comes up the front with a secret word. Your group shouts out guesses."
  - "Say anything on the No-No List and the other group will dob you in."
- **Brief (default):**
  - "Up the front: explain the word. Never say it — or anything on the No-No List."
  - "Your group's up: shout out guesses. You won't see the word."
  - "Their group's up: you'll see the word and its No-No List. Hear one? Dob."
- **Brief variants:** one for pass-the-phone, one for a shared team phone.
- **Line-up:** *Crayon Crew* and *Glue Stick Gang*, at least 2 each, uneven allowed. The prompt is "Into your groups, please." The no-team column is "Not in a group".

### 0c. Mood beats

| Field | Your answer |
|---|---|
| **The repeated beat** (round, night, raid, shift…): what the world does to open it. A short screen that moves on by itself, sets the scene and says again what to do | |
| **Flavour lines** for that beat (3–6, picked at random; in a multi-device game the host picks one so every phone shows the same) | |
| **Other moments the world should carry** — a reveal, a bust, a turn change, a near-miss. One line each on what it looks like | |

### 0d. The direction (filled at Stage 1b — leave blank in the first draft)

| Field | Your answer |
|---|---|
| **Directions canvas** (link) | |
| **Picked** (A / B / C, or a mix — one line on why) | |
| **What it changed in this brief** — brand colour, terms, Intro copy, screens, rules. Name each section edited. "Nothing" is a real answer | |

> Example — Like I'm Five picked *Chalkboard*, with the folded "passed note" for a buzz from another direction. That reopened the brand colour (pink had never been chosen with a world in mind) and re-voiced the game's terms to the classroom. Great Minds dropped its radio/frequency language for **thought bubbles**. The terms that survived were the ones that already meant "mind" (sync, wavelength).

### Re-check against the world (do this after §0, and again after §0d)

- [ ] **§1:** do the name, tagline and emoji still sound like the world? Is the brand colour still right? (It stays provisional until §0d.)
- [ ] **§9:** is every term in the world's voice, and every string: buttons, popups, empty states, How to Play, the end screen, the Intro? A term renamed in one place and left alone in another is the commonest miss.
- [ ] **§11:** does the art inventory include the scene, and is the scene drawn in code?
- [ ] **§12 Q12 and §13:** for a multi-device team game, the Intro's Line-up replaces the team-setup screens. Is that reflected?
- [ ] **§17 and §18:** are the end screen and How to Play written in the world's voice, not in generic game language?

---

## 1. Identity (REQUIRED)

> Propose an abbreviation and confirm it isn't in the taken list. If the idea is based on a real game, the last four rows matter: they stop the brief quietly copying the original, duplicating an existing suite game, or borrowing a trademark.

| Field | Your answer |
|-------|-------------|
| **Full game name** (and why it works) | |
| **Short abbreviation** (unique, 2–5 characters, used in code; check the taken list) | |
| **One-sentence tagline** (what appears under the game title) | |
| **The world in one line** (the full version is §0 — e.g. "a BBC wildlife documentary crew", "a primary-school classroom at home time") | |
| **Emoji / icon** (one emoji that represents the game) | |
| **Brand colour** (a colour word and a proposed hex value, e.g. "warm amber, #D98E04", chosen *from the world*. **Provisional until Stage 1b** (§0d); see §11 for the audit) | |
| **Core type** (see the game types in §3) | |
| **The fun moment in 10 words** (if you can't say it, the concept needs more time) | |
| **If based on a real game: what it is inspired by, and what changes from the original** | |
| **Overlap check:** the closest existing suite game, and why this one doesn't duplicate it | |
| **IP and naming check:** no trademarked names, art or characters; which generic stand-ins are used | |

---

## 2. The Players (REQUIRED)

> If you're adapting a real game, note how the role structure changes for a phone format. Some mechanics that work on a table need redesign for mobile.

| Field | Your answer |
|-------|-------------|
| **Player count** (min, max, sweet spot — the suite range is 2–8; exactly 2 is fine) | |
| **Minimum meaningful player count** (the smallest group where it's actually fun) | |
| **Device mode(s)** (MDLM, PTP, or both) | |
| **Teams or individuals?** (everyone for themselves, or split into teams) | |
| **Are there different roles?** (yes/no — or "none — every player has the same role". If yes, describe each below) | |
| **Is any information hidden from some players?** (yes/no — if yes, describe what and from whom) | |
| **Bots / solo** — can a computer opponent fill a seat (Yes / No / Later), and is the game playable solo against a bot? Give the reason if No | |

> Bot support doesn't change the player count: the registry minimum stays at the human-seat minimum (2 for a duel), and "playable solo against a bot" is recorded as its own flag. A talk-heavy party game with a spoken phase usually can't have bots, and that is fine. Plan bots in §22.

### Roles (if applicable)

For each role, in plain English: what do they know at the start, what do they do on their turn, what are they trying to achieve, and is there anything they must NOT say or do?

| Role name | What they know | What they do | Their goal | Any restrictions |
|-----------|---------------|--------------|------------|-----------------|
| | | | | |
| | | | | |
| | | | | |

**Notes / anything that doesn't fit the table:**

---

## 3. The Core Loop (REQUIRED)

> State the single-sentence turn action clearly — this is the test of whether the mechanic is resolved. If you can't state what a player DOES in one sentence, flag it with `[CLARIFICATION NEEDED]`. Don't let this section absorb the game's rule relationships — that's §4's job: §3 is the flow of a turn, §4 is what beats what. For a game played as a series, describe one round here and the series in §5.

**In one sentence — what does a player DO on their turn?**

**What is the central tension or fun moment?**
(The moment where players lean in, argue, laugh, or hold their breath)

**What type of game is this closest to?**
☐ Word association / description
☐ Deduction / bluffing / social deception
☐ Trivia / knowledge
☐ Climbing / shedding / adjacency-based card game
☐ Creative / lateral thinking
☐ Two-player duel or board/grid game
☐ Push-your-luck / engine-building
☐ Estimation / persuasion
☐ Real-time or physics
☐ Something else: _______________

**Walk through one complete round step by step, in plain English:**
(Number each step. Don't worry about screen names or technical terms — just describe what happens. If the legality of any step depends on how one element relates to another — beats, outranks, unlocks, is immune to — don't re-derive the relationship here. State the step, e.g. "play a card that beats the active one", and point to §4, where it is tabulated exactly once.)

1.
2.
3.
4.
(add more as needed)

**Is there anything players do simultaneously, or is everything sequential (one at a time)?**

**How does the phone physically move between players?**
(e.g. passed around the table, stays in the middle, each person has their own device)

---

## 4. Rule Interactions (if applicable)

> **Skip this (`N/A — no relationships between pieces or rules`) if no legal move depends on how one element relates to another.** Word games, trivia and most social deduction games can go straight to §5.
>
> **Fill it in completely if any legal move depends on a relationship** — a predator chain, a rock-paper-scissors cycle, a numeric hierarchy with exceptions, unlockable combinations, anything where "can X beat Y?" isn't a simple number comparison. Treat it as the most important section to get exhaustively right: a relationship described only in prose is the easiest thing in a brief to get subtly wrong, and every downstream section (Sylly Mode events, the sample round, the reference diagram, the art) ends up re-describing it slightly differently. Tabulate it once, here, and have every other section point back to it.

**List every element and its relationships:**

| Element | Beaten by / loses to | Beats / wins against | Notes (dead-end, wildcard, cross-group link, etc.) |
|---|---|---|---|
| | | | |
| | | | |

**Answer these explicitly — these are the spots that go wrong if left implicit:**
- **Closed loops:** are there any two elements that beat each other (a bidirectional pair)? List every one. A loop is not the same as a linear chain — say so if two elements form a closed pair rather than both feeding into a longer line.
- **Cross-group links:** if elements are organised into separate groups, tracks or categories, are there relationships that cross between them? List each cross-link individually, with direction (which beats which — not just "these two are connected").
- **Dead ends:** is there any element that beats nothing, or is beaten by nothing? State which, and how it is balanced (limited copies, no special power, etc.).
- **Wildcards:** do any elements bypass the table entirely (win or lose against everything, or copy another element)? State exactly what they can and can't interact with, including each other.
- **Special states** (e.g. Guarded / Exposed) and the **order of resolution** where several effects can fire from one action.
- **Does anything change these relationships temporarily** (a Sylly Mode event, a power-up, a rule twist)? Describe the change precisely enough that someone could redraw the whole table under the new rule without guessing, including what happens to dead ends, loops, cross-links and wildcards. Don't just say "the chain reverses" — confirm what reversal means for every special case.

**If you're describing this to an AI or artist for a diagram later:** a "single continuous line" instruction is only accurate if the relationship really is one long chain. The moment there's a fork (two elements both beaten by the same predator but not beating each other) or a loop, say so explicitly — "single line" language will otherwise get misread as a strict hierarchy every time.

---

## 5. Winning (REQUIRED)

> If a guardrail (a stall rule, a closing clock) is rarely reached in real play, make it a fixed rule here rather than a setting in §7.

| Field | Your answer |
|-------|-------------|
| **How does a round end, and how does a game end?** (after X rounds, at X points, when a specific event happens) | |
| **How is the winner determined?** | |
| **Are ties possible, and how are they handled?** | |
| **Series structure, if any** (first to N, who goes first each round, what a draw does — replay, or shared) | |
| **Length** — one round, and a full game. Mark `[ASSUMPTION]` until timed in play | |
| **Stall guardrails** — what happens if nobody can act, or everybody refuses to act (a no-legal-move rule, a closing clock) | |

---

## 6. Scoring (REQUIRED)

> Cover every outcome including zero and negative points. Be explicit about what happens when nobody scores a round. If no scoring system applies, say so and flag it as a design decision. Mark any first-pass number `[MATHS]` so it gets refitted after playtests, and say what behaviour the numbers assume.

| What happened | Who gets points | Roughly how many | Notes |
|--------------|----------------|-----------------|-------|
| | | | |
| | | | |
| | | | |

**Does scoring feel balanced?**
(In a full game, does every player have a fair shot, or is there a dominant strategy that needs addressing?)

**Any outcomes where nobody scores?**

---

## 7. Settings (REQUIRED)

> Gameplay settings first (difficulty-style when the game has a difficulty axis), ✨ Sylly Mode last. State which settings only appear in a given case (e.g. Bot skill only when the opponent is a bot). List fixed rules that are not settings separately, so it's clear they were considered.

| Setting name (plain English) | What does it change? | Options | Default | Notes |
|---|---|---|---|---|
| | | | | |
| | | | | |
| | | | | |

**Settings that should be locked or hidden in certain situations?**
(e.g. a setting that only makes sense for 4+ players, or one only relevant in a specific mode)

**Settings that scale automatically with player count rather than being user-facing?**
(e.g. total content pool size, deal size — describe the formula; see also §10)

**Fixed rules that are NOT settings:**
(Rules considered and deliberately not made adjustable, including guardrails rarely reached in real play.)

**Alpha-only testing options** (hidden in a panel, never shipped) — list separately and label them "not planned for the shipped game":

---

## 8. Sylly Mode (REQUIRED — status first)

> Sylly Mode is the suite's "wild" variant: it makes the game harder, weirder or more chaotic, and is always the last setting. It is the default, with three honest statuses. **State which one applies first:**
> - **Designed** — full design below.
> - **Deferred** — "None — will design later". The game ships without it for now; list any parked ideas without designing them.
> - **Omitted** — a deliberate reason. Honeycomb Hills (`comb`) has none because its seven settings already own the difficulty axis.
>
> Either way, the "✨ Sylly Mode" card in How to Play exists and says so honestly. Flip You For It and Hide and Shogun have deferred theirs.
>
> **Tone references** (existing thematic names): Wild Words (LI5) · Static Interference (GM) · Intel Phase (SS) · Fusion Cuisine (JEC) · The Ringer (YGI) · The Troublemaker (LTTP) · Survival of the Fittest (NAT) · Silent Running (DSD) · Stroke or Genius (GTH) · The Tempest (DYB) · Drama Mode (BLD) · The Abyss (PASS) · Devil's Network Protocol (NT) · Fruity Personalities (FRT) · Night Terrors (SHP) · The Counterfeit Run (FLW) · Force of Nature (PKO) · Dibber Dobber (CJAR) · The Thaw (CLD) · Backseat Drivers (ETA)

**Status:** ☐ Designed ☐ Deferred ☐ Omitted — reason:

If **Designed**:

| Field | Your answer |
|-------|-------------|
| **Thematic name** | |
| **In one sentence — what changes?** | |
| **Does it add new screens or phases?** (yes/no — describe if yes) | |
| **Does it change scoring?** (yes/no — describe if yes) | |
| **Does it change the win condition?** (yes/no — describe if yes) | |

**If Sylly Mode has several distinct events or variants rather than one change:** list each separately with its own one-line effect. For any event that touches the relationships in §4, don't re-derive the relationship — state only what changes and confirm the edge cases (dead ends, loops, wildcards) the same way §4 asks. For any event that hides information that's normally visible, answer the same questions as §12 question 7 — who sees what, and whether it is revealed later or stays redacted in any history or log screen. Describe the **Sylly round flow** if it differs from the standard round.

---

## 9. Thematic Vocabulary (REQUIRED)

> Replace generic game terms with game-voiced equivalents, **drawn from §0's world**: a term should sound like something the narrator would say. Every mechanic named in §3, §4 and §8 needs an entry, along with the Intro's team names and Line-up words. Mark provisional wording `[PLACEHOLDER]`; Stage 1b may re-voice terms, so list any changes under "Retired terms". Plain-English explanations go in the settings overlay; this table is for what appears on screen.
>
> **Every string, not just the table.** When a term changes, it changes in the buttons, popups, empty states, How to Play, the end screen and the Intro too. A renamed term that survives in one confirm button is the most common slip.

| Generic term | What this game calls it |
|---|---|
| Round | |
| Score / points | |
| Game over screen | |
| Play again | |
| Quit | |
| Settings overlay title | |
| [every other game-specific term used in §3, §4 and §8] | |

For reference, how three existing games voice the standard terms:

| Generic term | Like I'm Five | Just Enough Cooks | Group Therapy |
|---|---|---|---|
| Round | *(not used)* | Order | Session |
| Score / points | *(not used)* | Kitchen Points | Sessions |
| Game over screen | *(not used)* | Final Wash-up | The Final Report |
| Play again | *(not used)* | New Shift | New Session |
| Quit | *(not used)* | Leave the Kitchen? | Walk Out? |
| Settings overlay title | *(not used)* | The Pantry Cabinet 🧂 | Inpatient Admission Form 📋 |

**Setting names and option labels** (a second table, so the wording in §7 is settled too):

| Setting | Name on screen | Option labels |
|---|---|---|
| | | |

**Deliberately plain terms** (where the game keeps ordinary wording on purpose, and why):

**Retired terms** (if any names changed along the way — listed so old wording doesn't creep back):

**Quit specifically:** the suite's quit-confirm popup always needs a themed confirm button (e.g. "Yeah, pack up!") alongside a neutral cancel button (e.g. "Not yet!"). The table row above is the heading/prompt; if you already have the confirm/cancel copy in mind, note it here too.

---

## 10. Word Bank & Content (if applicable)

> If the game needs a custom data file rather than the shared word bank, describe one example entry fully — but don't repeat beats/loses-to relationships here if §4 exists. If the game has no content of its own at all, write `N/A — no content`. If it just uses the shared word bank, answer the first three rows and stop.

| Field | Your answer |
|-------|-------------|
| **Does this game use the existing word bank (`words.json`)?** | |
| **If yes — which categories?** (animals, food, places, objects, sports, nature, etc.) | |
| **If no — what kind of content does it need?** (describe the format and what each entry contains) | |
| **Does it need a completely new data file?** (yes/no) | |
| **Any words or topics that should be excluded?** | |

**If a new data file is needed — describe one example entry in plain English:**
(What does each card / prompt / entry contain? This example should cover everything except beats/loses-to relationships (that's §4): name, category, special flags, display info.)

**Does the quantity of any content scale with player count?**
(e.g. total pool size, copies of each item — give the formula and a small table across a few player counts so it's easy to sanity-check.)

| Player count | Total quantity | Notes |
|---|---|---|
| | | |

**Content generation rules** (tiers, balance checks, duplicates), and **content deliberately not built yet:**

---

## 11. Custom Visual Assets (REQUIRED — parts may be N/A)

### Colours and accessibility

> Check the brand colour against the existing games' colours: it must be clearly distinct. Only the brand colour is used for buttons, pills and toggles, always with white text on top. The **scene palette** (§0a) is separate: it can use any colours the world needs. Pick the brand colour *from* the world (a chalkboard world suggests chalkboard green, not whatever the first draft said), and expect Stage 1b to confirm or change it.

| Role | Name | Hex | Notes |
|---|---|---|---|
| Brand colour (provisional until §0d) | | | |
| Scene palette (2–4 colours from §0a) | | | |
| (gameplay colour 1…) | | | |

- **Colour-blind check:** does any gameplay colour pair stay readable for common colour blindness? What is the second cue (shape, crest, pattern)?
- **Accessibility:** don't rely on colour alone, minimum text sizes on a real phone, and any motion that can be skipped
- **Colour tokens** that would be added to the suite's design doc:
- **Reference mockups**, if any: which are style references only, and which parts must not be copied

### The repeated visual primitive

Does this game have a **visual primitive that players look at repeatedly** and might one day be re-skinned with custom art — cards, dice, gems, tiles, tokens, fruit, a board? If so, it ships **asset-pack ready**: all of that primitive's art goes through one place, keyed by a stable id, so a skin can be added later with no game-logic changes. If not (e.g. a pure word game), write "None" and skip to the art inventory.

| Field | Your answer |
|-------|-------------|
| **Is there a repeated visual primitive?** (yes/no — name it) | |
| **How many distinct faces/types does it have?** (e.g. 8 fruit, 54 cards, 6 die faces) | |
| **Should it be skinnable with custom art later?** (yes / no / maybe — even "maybe" means build it asset-pack ready) | |
| **Default look for v1** (emoji? CSS shapes? text? fully illustrated? — what ships before any skin) | |

> Skins are device-local and cosmetic — two players in the same match can use different looks, with no effect on the game. Where players pick a skin (the hidden expansion-pack terminal by default) is a Stage 2 decision; just note a preference in §19 if you have one.

**If planning multiple reskins:** ids stay fixed across all skins — a reskin changes the display layer only, never the relationships in §4. Note whether the same lobby can mix skins across players.

**If the default look is a large, fully-illustrated set** (not emoji/CSS placeholders): that is a bigger undertaking than most games have budgeted for at v1. Say whether the time is budgeted, and consider a companion art-style checklist document (style line, per-item prompt template, production checklist) rather than cramming art direction into this brief.

**If items are displayed compactly or overlapping** (e.g. a fanned hand of cards): describe the minimum visible portion of each item and what identifying detail must survive at that size — it constrains where the important part of each asset's composition sits.

### Art inventory

> So whoever draws it knows exactly what is needed.

| Image | How many | Size on a phone | Shape (portrait card, square, wide) | Default look or optional skin |
|---|---|---|---|---|
| The scene (Intro + action screens, §0a) | 1 | full screen | phone, portrait | drawn in code — say what it's made of |
| | | | | |

- **Where art is seen largest.** Tapping a card in How to Play opens its artwork full-screen, so brief for the biggest place a picture appears, not the smallest. Default art is kept small because it ships with every install; optional skins can be richer
- **Text the game draws itself.** List every number, label or frame printed on top of the art (scores, values, ranks, name plates). The art must not paint these in, or they print twice. One image can often serve many values (e.g. three tier pictures for fifteen cookie values)
- **Art that can be drawn by code instead of images** (dice, plain tokens, numbered markers) — say so, and don't commission pictures for them
- **Readability at the smallest size.** Pieces on a coloured board need a dark outline and a light top edge so every player colour shows on every tile. Tokens that must be told apart (resources, pieces) each need a different silhouette, not just a different colour
- **Tiled or board art:** if tiles must fit together, say what must be identical on all of them (viewing angle, depth, width) and how far decoration may overhang
- **Names stay separate from pictures.** A skin may change how a card looks, and optionally what it is called; the brief's names and ids are the permanent ones

---

## 12. Multiplayer Classification (REQUIRED)

> Every new game needs a pre-classification before technical work begins. Answer in plain English — no technical terms, no code references; Claude Code translates it into the technical mode. Pay particular attention to question 5 (what a waiting player sees, read-only or not) and question 7 (information that is temporarily hidden) — they are easy to skip and expensive to retrofit. Questions 1–7 are the standard set; 8–11 cover duels, bots and dropped players. A game that is PTP-only still answers questions 1, 2, 5, 7 and 11 and writes `N/A — PTP only` against the rest.

| # | Question | Your answer |
|---|---|---|
| 1 | In the ideal multi-device version, does each player have their own device, or do teams share one? (MDLM, PTP or both; individuals, teams or either. A team sharing a device may still pass it around inside the team.) | |
| 2 | Is there any information that must stay private to one player or one team's device? Name anything that must never reach a particular device. | |
| 3 | Are there moments where players act at the same time, and what does the game wait for before moving on (everyone submitted, one person confirmed)? | |
| 4 | Are there moments where one device should be locked while another is active? | |
| 5 | When it isn't a player's turn, what do they see, and can they interact with anything, or is it read-only? Include anyone who is only watching (spectator, TV view, host-only). | |
| 6 | Are there any roles or phases that simply don't work with multiple devices? | |
| 7 | Do any settings or events temporarily hide information that's normally visible (e.g. a chaos event that blacks out the shared state for everyone except the active player)? Say exactly who sees what during it, how it is hidden (gate screens in PTP, private screens in MDLM), and whether it is revealed afterwards or stays hidden in any history or log screen. | |
| 8 | What is different between PTP and MDLM? List settings only the host can change (everyone else sees them read-only), settings that can't work on separate devices and must be forced to one value, and screens that disappear in MDLM (e.g. pass-the-phone gates). | |
| 9 | What happens if someone leaves mid-game: whose turn is skipped, does the round restart, can a bot take over, and what if the game drops below its minimum players (a 1v1 game ends the moment one player leaves)? And what happens if the host leaves? (Default: the host's device runs the room, so the session ends for everyone.) | |
| 10 | Can someone who dropped come back, and can people join late? | |
| 11 | Can a computer opponent play, and how (see §22)? | |
| 12 | How are teams formed at the start? In the Intro's Line-up (players pick, the host adjusts: name the teams in §0b), dealt by the game (random seats or roles), or no teams at all? If seat *order* matters (who goes first, who sits next to whom), say so. A Line-up for seat order doesn't exist yet and would be designed with this game | |

---

## 13. Screens — Plain English List (REQUIRED)

> Number every screen and overlay, including any alpha-only testing screens (marked "not planned for the shipped game") and the Practice tab. Don't worry about screen IDs or technical names — describe each distinct view the player sees, in the order they meet it, one line each.
>
> Example: "A screen where the active player sees their secret role before handing the phone to the next player."

1. (Game menu — every game has this)
2. (Setup / player names — pass-the-phone only. In a multi-device game the lobby provides names and the Intro's Line-up provides teams, so say if this screen disappears there)
3. (The Intro — every game has this; the suite builds it from §0b)
4. (Round intro — if §0c has a repeated beat)
5.
6.
(add more as needed)

**If the game accumulates a history of turns or events that players might want to look back on:** does it need its own log/history screen, and if so does it respect the same information-hiding rules as live play (§12) rather than revealing everything after the fact?

**Two things you don't need to design from scratch:** the game menu has a fixed suite-wide structure — Play, then How to Play, then Settings, then Back to the Box, in that order, every game — so the only decision here is the Play button's game-voiced label. And every other screen starts from three stacked zones (a header row with title/round info, a central stage where the content lives, and a controls area with the primary action). Sketch in those zones by default. The action screens are where the world shows most, and Stage 1b's directions may reshape them. Note any screen you already picture differently.

**For each screen, one more word: could anyone in the room see it, or is it private?** (Public: the guessers' view of a board. Private: anything showing a secret word, hand or role.) A future TV mode will show the public screens on a shared screen.

---

## 14. Complex Interaction / UI Spec (if applicable)

> **Skip this (`N/A — every turn is tap-to-choose`) if every turn is a simple tap-to-choose action.** Fill it in if a turn involves building something from parts — assigning several items to several targets, dragging, multi-step confirmation, or any screen where "just describe the button" isn't enough for Claude Code to build the right interaction.

**Plain-text/ASCII sketch of the main interactive screen** (boxes and labels are enough):

```
(sketch here)
```

**Every distinct way a player can perform the action**, not just the intended primary one (e.g. tap a target then tap an item, vs tap an item and have it auto-assign, vs drag-and-drop). Describe each fully, and say whether they can be freely mixed within a single turn:

**Real-time validation feedback:** what tells a player their in-progress move is valid or invalid before they commit? On an invalid attempt, does it just not register, or is there a rejection animation/sound?

**Auxiliary controls:** reset, undo, confirm, or special-case buttons — what makes each one appear, hide, enable or disable?

**Confirmations:** which actions ask for confirmation, and why (usually the irreversible ones)?

**If this interaction needs a popup of its own** (a builder panel, a confirmation step): which of the two overlay shapes fits — a slide-up scrollable panel (anything with real content or input), or a small centred confirmation box (a short prompt with three or fewer elements)? Don't design a third.

**If the controls need to stay frozen in place while the player works a busy central area** (e.g. assigning many small pieces to slots, or a countdown running while a puzzle updates): say so explicitly. It is a recognised but deliberately rare exception to the suite's single-scrolling-screen layout, so flag it as an exception rather than the default.

---

## 15. Rule Reference / In-Game Cheat Sheet (if applicable)

> **Skip this (`N/A`) if the rules fit comfortably in a player's head after one read of How to Play.** Usually needed whenever §4 exists — players will want to check the relationship table mid-game.

| Field | Your answer |
|-------|-------------|
| **What reference material do players need mid-game?** (a relationship chart, a decoder, a scoring reference, etc.) | |
| **How do they access it?** (which tap or gesture, from how many places in the game) | |
| **Does opening it interrupt the game, or is it a non-blocking overlay?** | |
| **Is it a static image, or does it render from data?** | |
| **Does it need a per-skin version if §11 has custom visual assets?** | |

**If it's a diagram of relationships from §4:** sketch the layout in plain text. Be explicit about arrow direction (from the weaker element to what beats it, or the reverse?), how loops are shown differently from linear chains, and how cross-group links are distinguished from the main chain — these are the details that get lost if only described in prose.

**It is almost always the same scrollable slide-up overlay used for How to Play and Settings** — no new container needed, so don't design a bespoke one.

---

## 16. Sound Design (if applicable)

> Optional, and it never blocks a build: a game with no track of its own plays the suite's title theme. **Skip (`N/A — uses the suite's generic sounds and the title theme`)** if nothing here is specific to the game. Keep it short and plain.

- **Register in one line:** what does this game sound like (the music's mood, in the game's own theme)?
- **Tempo and energy:** slow, steady or busy; background-level or lively. Music plays under conversation for ten minutes or more, so it should loop quietly and never demand attention
- **What the music must never do:** the model is "no sonar pings" for a submarine game. Avoid anything that sounds like a game cue (alarms, countdown ticks, notification blips), and anything that fights the game's sound effects
- **A distinctive lead instrument** (optional): one named instrument as the game's fingerprint, chosen so the track is easy to tell apart from the others. Say what you suspect it will collide with
- **Does Sylly Mode change the mood enough to earn its own track?** Only say yes if it changes how the game *feels* to sit at (a lullaby becoming a fever dream), not if it just changes the rules or the words

**Sound-effect moments:** any moment with real emotional weight that needs a distinct cue (a big win, a failed attempt, a special power triggering, a chaos event landing), and whether an existing suite sound could do the job. Describe direction in feel, not files — e.g. "deep rumble building to a crescendo — dramatic".

| Moment | Sound direction |
|---|---|
| | |

---

## 17. End Screen Content Mockup (REQUIRED — short is fine)

> If the end screen is just "here's the winner", say so in a line and sketch it briefly. Fill it in fully when standings, breakdowns or thematic framing matter — especially once §9's vocabulary introduces named ranks or outcomes (a 1st-place title, a last-place title). Use illustrative numbers.

**Full text mockup of the main end screen, top to bottom** (title, winner announcement, standings layout, tie-handling copy, any history or breakdown table, button labels):

```
(mockup here)
```

**Variants** (write `none` for any that can't happen): a draw or tie · a series or campaign win · a win decided by a closing clock · a forfeit.

**Does a table or grid stay useful for very short games** (e.g. a 1-round match), or does it only add value in longer ones? Should it be conditionally shown?

---

## 18. How to Play — Teaching Points (REQUIRED — short is fine)

> Every game has a How to Play overlay with a fixed shape: one card per step, then a card titled exactly "Winning and Scoring", then a card titled "✨ Sylly Mode" with the thematic name (present for every game; if Sylly Mode is Deferred or Omitted the card says so honestly). Order the teaching points so that shape falls out naturally, and so they map onto the Practice tab in §24 (one teaching point per key action). The last concept you list naturally becomes the Sylly Mode card. This doesn't need full screen copy — just the ordered list of concepts a new player must absorb before they can play unaided.

**Ordered list — one line per concept, in the order they should be taught:**
1.
2.
3.
(add more as needed)

**For each concept with an easy-to-miss exception or edge case** (e.g. "only the *immediate* relationship counts, not the whole chain"), flag it here. These are the details that get lost between the brief and the tutorial copy if not called out.

---

## 19. Open Questions & Design Notes (REQUIRED — even if brief)

> It's better to flag uncertainty here than have Claude Code make assumptions mid-implementation. Keep measured findings and guesses visibly separate. Genuinely unresolved questions for the owner go in "Open Questions & Locks" at the end of the brief; this section is the record of how the design got here.

**Decisions log** — what was settled, and why. Include every `[DEVIATION: ...]` from the strong-default rules:
-

**Balance and tuning** — numbers measured versus assumed, each with an evidence label (`[SIM]`, `[PLAYTEST]`, `[ORIGINAL]`, `[MATHS]`, `[UNTESTED]`):
-

**Risks to playtest** — and **things that might be complicated to implement** (flag for Claude Code):
-

**Parked ideas** — good, but deliberately not for now:
-

**Things explicitly OUT OF SCOPE for v1:**
-

**Preferences and general notes** (e.g. a preference on how skins are chosen; anything that doesn't fit elsewhere):

---

## 20. Mood & References (REQUIRED — short is fine)

> The feeling the game should have, in a few words and a few references (films, shows, places, real objects). Concrete images beat adjectives: this section seeds the art and music prompts and helps Claude Code write UI copy and placeholder text that matches the game's tone.

| Field | Your answer |
|-------|-------------|
| **Real-world games this is most similar to** | |
| **References**, and what each is for (colour, tone, humour, pacing) — and what must **not** be copied from it | |
| **Tone** (e.g. tense, silly, competitive, cosy, strategic) | |
| **Should NOT feel like** | |
| **Any example phrases or copy you've already written?** | |

---

## 21. Sample Round (REQUIRED)

> The most important section, and the acceptance test of the whole brief: if you can't follow the sample round without confusion, the mechanics aren't resolved — fill the gaps in or flag them explicitly. Name specific players, assign roles, and walk a complete round from setup to result. **Check the arithmetic:** counts, totals and scores must add up and match §4 and §6.

**Setup:** [N] players. [Any relevant game state — e.g. current word, who has which role]

**[Player name] ([role if applicable]):** [what they do / see / say]
**[Player name]:** [what they do]
(continue for each player / phase)

**Result:** [what happened, who scored, what the state is at the end of the round]

**Further samples — add the ones that apply:**
- **Sylly Mode** (§8): at least one round showing an event in effect, not just the standard round
- **Hidden information** (§12): at least one round from a single player's limited point of view, so the information boundary is concrete rather than asserted
- **An edge case:** a tie, a stall guardrail, a forced state
- **Mini-scenarios** (rule-heavy games): one short scenario per special piece or rule
- **A bot turn** (if §22 applies): one sample showing what a bot does

---

## 22. Bots (if applicable)

> Plan the computer opponent here. At first draft this is an intent, not a record; after the alpha it becomes the record of what was built and tested. **If the game cannot or should not have a bot, write `N/A — [why]` and say whether that is permanent or just "not yet".**

- **Goal and scope:** why a bot (solo play, testing, filling a seat), and whether it fills the second seat only or any seat
- **Who and where:** which seat it takes, how it is named, how it is chosen in setup (an opponent setting), pauses so its moves can be followed, and that it needs no gate screens
- **Levels:** a table of Easy / Medium / Hard (or whatever applies) — plain-English behaviour and why each level exists. Easy is a random legal move; the top level plays as well as it can **with only the information a human could have**
- **What the bot may know:** its own hand, the board, public information, and what it must never read (a hidden hand). Call out any **information imbalance** between bot and human and decide whether to fix it
- **Other phases:** how it behaves outside the main turn (picking, bidding, bluffing, setup choices)
- **How the behaviour was chosen:** alternatives tried or considered, and why one won
- **Testing:** checks that it only plays legal moves and never cheats on hidden information; a strength ladder (who beats whom, how often) `[SIM]`; results against humans `[PLAYTEST]`
- **Sylly Mode and bots:** does the bot play Sylly Mode, and how
- **Dropped players:** can a bot take over a seat mid-game (see §12 question 9)
- **Known limits and open questions:** too strong to be fun, no personality, not yet connected to the suite's lobby and bot system, and so on

---

## 23. Hints & Tips (if applicable)

> A reference record of what is known about playing well, kept so it can feed How to Play (§18), the Practice tab (§24), in-game hints and the end screen. Nothing here changes the rules. Every line carries an evidence label. **Skip (`N/A — nothing known yet`)** at first draft if there is genuinely nothing.

- **Strategy tips for players**, split into beginner and advanced. For a reskin, start with the well-known strategies of the original `[ORIGINAL]`, in your own words. For a new game, start with the designer's reasoning `[ASSUMPTION]` and replace it with `[SIM]` and `[PLAYTEST]` evidence as it arrives. Say plainly when something is not settled
- **Facts about the rules that surprised us** (e.g. which rule fires more or less often than expected)
- **Candidate in-game hints** (not built): placement previews, danger warnings, turning-point recaps. For each, note whether it could leak hidden information
- **What the Practice tab should include**, so a tip that new players always miss gets taught

---

## 24. Practice Tab (Tutorial) (REQUIRED)

> Every game has a Practice tab alongside How to Play. Choose **one of the four standard forms** (the standard lives in `ui-style.md` § Practice tab and in the tracker's § 5) and say why. Pick a form even if the details are thin at first draft.

| Form | What it is | Reference games |
|---|---|---|
| **Scripted hand** | The default: a guided, scripted round with a fixed hand | The Bluff |
| **Arena** | The other players' moves are fixed and yours are free | Cold Shoulder (the first) |
| **Lessons** | A picker with one lesson per key action. A slideshow is the fallback if a lesson can't be made interactive | Honeycomb Hills, Late to the Party |
| **Autopilot** | Answers type themselves and replies are scripted, or the game uses lesson cards | Like I'm Five, Great Minds |

**Chosen form:** ☐ Scripted hand ☐ Arena ☐ Lessons ☐ Autopilot

For the chosen form, state:
- **Why this form** (a short judgement call; Scripted hand when in doubt)
- **The key actions** the tutorial must teach — they should match the teaching points in §18
- **The content of the form:** for Scripted hand, the scripted round step by step; for Arena, which opponent moves are fixed and what the player is free to do; for Lessons, the lesson list with one goal and one success check per lesson (and which lessons, if any, fall back to a slideshow); for Autopilot, what types itself and what the scripted replies are
- **How hidden information is handled** in the tutorial (what the player is shown, and why it is safe)
- **Sylly Mode coverage:** taught here, taught in its own lesson, or not covered
- **Length target and exit:** how long it takes, and whether the player can leave at any point
- **What it deliberately doesn't teach**, and where that is covered instead (e.g. the Rule Reference)

---

## Open Questions & Locks (REQUIRED)

### Open Questions
Every `[CLARIFICATION NEEDED]` item from the brief above, numbered and tagged:
1. [BLOCKER] ...
2. [NON-BLOCKER] ...

**BLOCKER** = the brief can't be completed, or the technical spec can't start, without an answer. Includes any hard rule the idea needs broken.
**NON-BLOCKER** = the brief works as-is with the stated assumption, but input is wanted before it's final.

### Locked
Decisions that are final (rules, name, emoji, abbreviation, colours).

### Soft-locked
Working decisions to review before implementation.

### Open for build
Things to be tried out and decided while building.

### To watch in playtests
Questions for the data, not for the owner.

### Noted for later
Ideas and features deliberately parked.

---

## Appendix: Notes for Stage 2 (optional)

> The **only** place technical language is allowed, and it is not part of the non-technical brief. Technical observations for the next stage, for example: rules written as pure deterministic functions so a bot or simulation can plug in; seeded content generation; which device carries authoritative state in MDLM; which messages must go to one device only so hidden information never reaches the wrong phone; whether each art set ships as the default look or as an optional skin; alpha-only tools like a game log or balance lab.

---

## What not to do

- No code, screen IDs, variable names, CSS or Firebase references outside the Stage 2 appendix
- No American spellings (this is Australian English: colour, organise, recognise)
- Don't skip §0 (the world) or fill it with a genre ("fantasy", "sci-fi"). A world is a specific place, a narrator and a mood
- Don't treat the first-draft brand colour as final; Stage 1b decides it
- Don't skip §9 (Vocabulary) — it's required even at draft stage
- Don't skip §24 (Practice Tab) — pick a form even if the details are thin
- Don't describe beats/outranks relationships only in prose if §4 applies — tabulate them exhaustively
- Don't invent technology beyond a mobile browser and room codes — raise it as a BLOCKER instead
- Don't duplicate an existing game's core mechanic without an overlap check that says why it feels different
- Don't pad a 1v1 game to 3+ players, and don't promise bot or solo play you haven't planned in §22
- Don't present a guess as a finding: first-pass numbers get `[MATHS]` or `[UNTESTED]`, strategy tips get an evidence label
- Don't use trademarked names, characters or art
- Don't quietly break a strong default — mark it `[DEVIATION: ...]`

---

## Tips for best results

- **Before filling this in,** answer first: *"What's the fun moment in 10 words?"* If you can't, the concept needs more time before briefing. Developing the gameplay, then the terminology, before you reach this template is the right order.
- **For "copy of X" inputs:** the AI will adapt the mechanic for mobile. Confirm the adaptation feels right — some games that work on a table (hidden boards, physical components) need genuine redesign, not just translation. For a reskin, also ask for the original's known strategies so §23 starts with something real.
- **Judge early which "(if applicable)" sections you need.** A simple word or social game can mark most of §4, §10, §14–16 and §22–23 as N/A (§24 is still required). A game with a real rule structure (anything with a "beats" or "outranks" relationship) will usually need §4 and §15 at minimum — that depth is what made the Pecking Order brief hold up through implementation without rework.
- **§4 is the section most likely to save you time later if you get it right, and cost you time if you don't.** If the idea has any hierarchy, chain or beats-relationship, insist on the table, the closed-loop check and the cross-link check before moving on.
- **§21 is the acceptance test.** If you can't follow the sample round without confusion, the mechanics aren't resolved. Ask the AI to work through the gaps before treating the draft as done, and check its arithmetic.
- **Scan the `[ASSUMPTION: ...]` markers** before moving on. They aren't mistakes — they're design decisions the AI made on your behalf. Make sure you agree with each one.
- **Treat the Open Questions list seriously.** Any BLOCKER left unanswered becomes a `[CLARIFICATION NEEDED]` in the technical spec and blocks implementation.
- **Come back to §22 and §23 after the first alpha.** Bots and hints are planned in the first draft but earn their detail from simulation and playtests (as in the Flip You For It brief). Update them with evidence labels rather than rewriting them.
- **The world earns its keep in the narrator's lines.** If §0b's lines could open any game in the suite, the world isn't specific enough yet. Go back to §0a.
- **What happens next:** once you're happy with the brief, run **Stage 1b** (`new-game-process.md`): a fresh Opus session reads this brief, produces three directions for the action screens, you pick, and §0d records what changed. Then hand it to Claude Code with `new-game-technical-template.md` and the rule files for Stage 2. Claude Code fills in the technical template and confirms everything before writing a single line of game code.
