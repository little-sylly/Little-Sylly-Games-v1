# Great Minds

**Game 2** · `activeGameId: great-minds` · plugin `js/games/great-minds.js`
**Emoji:** 🧠 · **Brand:** violet-500 CTAs / purple-* pills & accents (a known, documented split — see T7c) · **Players:** exactly 2 · **Modes:** PTP (recommended) · MDLM
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

Two minds, one word pair, zero talking. You're each staring at the same two words trying to guess
the single word your partner is *also* about to guess — no hints, no negotiation, just whatever
associative leap your brains happen to share. Miss, and the two words you each wrote become the new
pair for another go. It's telepathy as a party trick, and finding out how in-sync you really are with
someone.

---

## T2 — The Premise · *free*

Two players see the same pair of words — say, "Elephant" and "Whale." Each privately types one word
they think connects the two, without seeing what the other typed. Then both answers are revealed
together. Match, and that's a **Mind Meld** — the round (and by extension the whole session) is won.
Miss, and your two different answers *become* the new pair for the next round, so the game keeps
narrowing toward whatever the two of you actually have in common.

There's no scoring beyond round count — the entire game is a single race to sync up, and the number
of rounds it takes becomes the story of how alike (or how differently) two people think.

---

## T3 — How to Play · *free*

**Setup.** Enter both names (optional), then look at the starting word pair together before separating
to enter clues.

**The loop.** Each round: both players privately type one connecting word — no part of either
starting word is allowed. Once both are locked in, a short countdown reveals both words at once. If
they match exactly, that's a **Neural Link** and the game ends. If they don't, the two mismatched
words become the new pair, and the round count ticks up.

**Reading the room.** If Resonance Tolerance is set to Resonant, near-identical roots (e.g. "run" and
"running") trigger a **Frequency Overlap** prompt asking whether that close call should count as a
match. Either player can also invoke **Quantum Entanglement** — "Actually, that's a sync" — to
manually accept an unmatched pair by mutual agreement.

**How it ends.** The game ends the moment both players' words match. Fewer rounds is the better
result — it means the two of you converged faster.

---

## T4 — Theme & Flavour · *free*

**The world.** Sci-fi telepathy dressed as radio hardware — frequencies, wavelengths, signals,
neural links — mapped onto what is, underneath, a wavelength/word-association party game between two
people. The framing treats every round like an actual transmission between two minds trying to tune
to the same channel.

**The voice** never drops the frequency metaphor: settings are "Frequency Configuration," the pass
gate is "Finding Wavelength," quitting is "Cut the signal?", and Sylly Mode is styled as literal
"Static Interference" jamming the transmission. A match is a "Neural Link," the round log is "Psychic
Echoes."

**On theme:** signal/frequency/telepathy language throughout, the idea of two minds trying to
literally tune into each other, treating a lucky guess like a genuine psychic event.

**Off theme:** anything that breaks the sci-fi-radio conceit with a joke that undercuts it, real
telepathy claims played as more than a bit — this is knowingly silly pseudo-science, not mysticism
played straight.

Australian English throughout.

---

## T5 — Terminology · *paired*

| Term | Meaning |
|------|---------|
| **Neural Link** | The win state — both players' words matched. |
| **Mind Meld** | The moment of a successful match, used interchangeably with Neural Link. |
| **Psychic Echoes 📖** | The full round-by-round log (pair + both players' words) shown on the victory/result screens. |
| **Frequency Overlap** | The near-sync prompt — roots match but the exact words differ (only with Resonance Tolerance = Resonant). |
| **Quantum Entanglement?** | The manual Social Override confirmation — "Actually... that's a sync." |
| **Static Interference** | Sylly Mode's name — a random consonant is banned from that round's clues. |
| **Mental Fog / Neural Storm** | Static Interference's two intensity levels — consonant ban vs vowel ban. |
| **Signal Boost** | From round 5 onward, an optional 15-character context hint a player can attach before locking in. |
| **Boost Signal Guide ⚡ / Neural Library** | The reference modal teaching metadata clues vs synonym exploits, opened from the boost overlay's `?`. |
| **Frequency Configuration 📡** | The settings overlay's title. |
| **Session Terminal** | The end-of-game decision modal — "Memory Purge" (new game) vs "Resume Current Evaluation" (continue). |
| **Sever Link** | Secret Mode only, from round 11 — voluntarily concedes an unwinnable session. |
| **New Frequency** | Reroll the starting pair (Infinite Resync setting) or start a fresh session after a win. |

---

## T6 — Settings · *mixed — labels paired, values derived*

The settings overlay is titled **Frequency Configuration 📡** — *"Calibrate before you sync."*

| Setting | Options | Default | What it does in play |
|---|---|---|---|
| **Frequency Tuner** | OFF / ON + Word 1/Word 2 deck pickers | OFF | ON lets each side of the starting pair be drawn from a chosen subset of categories, independently for word 1 and word 2. |
| **Adjust Frequency Range** | Stable · Unstable · Chaotic | Stable | Which difficulty tier the word pair (and mismatch replacements) are drawn from. |
| **Memory Guard** | OFF / ON | OFF | ON blocks any word already guessed earlier in the session, not just the previous round's words (which are always blocked). |
| **Resonance Tolerance** | High Fidelity · Resonant | High Fidelity | Resonant enables the Frequency Overlap near-sync prompt for close-root, non-identical matches; High Fidelity requires an exact match. |
| **Infinite Resync** | OFF / ON | OFF | ON lets players reroll the starting word pair before the game begins. |
| **Signal Boost** | OFF / ON | OFF | ON allows, from round 5, an optional 15-character context hint before locking in a clue — logged in Psychic Echoes. |
| **✨ Sylly Mode** | OFF / ON + Mental Fog / Neural Storm | OFF / Mental Fog | Static Interference. See T8. |

---

## T7 — The Player's Journey · *mixed — 7a derived, 7b paired, 7c free*

### T7a — The flow

| # | Screen | Beat | Type | Duration | Chrome |
|---|--------|------|------|----------|--------|
| 1 | `screen-gm-menu` | Menu | Menu | — | 🔊 |
| 2 | `screen-gm-setup` (phase: names) | Name entry | Setup | — | 🔊 ✕ |
| 2b | `screen-gm-setup` (phase: pair) | Starting pair reveal — both look together | Setup | — | 🔊 ✕ |
| 3 | `screen-gm-pass-gate` | Pass-the-phone gate before a player's input turn | Gate | — | none (PTP safety gate) |
| 4 | `screen-gm-input` | Private clue entry (reused per player) | Interactive | — | `?` 🔊 ✕ |
| 5 | `screen-gm-reveal-gate` | Second pass gate — both watch the reveal together | Gate | — | none (PTP safety gate) |
| 6 | `screen-gm-reveal` | 3…2…1 countdown | Interstitial | ~3s | 🔊 ✕ |
| 7 | `screen-gm-result` (no-match state) | Mismatch result — new pair formed | Result | — | 🔊 ✕ |
| 7b | `screen-gm-result` (match state) | Neural Link! victory | Result | — | 🔊 ✕ |
| — | `screen-gm-concede` | *(Secret Mode only, round 11+)* Sever Link end state | Result | — | 🔊 ✕ |

`screen-gm-setup` and `screen-gm-result` are each a single registered screen with two JS-toggled
sub-states rather than separate screens. Rows 3–7 loop each round until a match (or a Secret Mode
concede). MDLM skips the pass-gate and reveal-gate entirely — `gmStartInputPhase()` sets
`gmActivePlayer = mpMyPlayerIdx` so both devices show `screen-gm-input` simultaneously, and the
Firebase round-trip stands in for the reveal-gate handoff.

**Overlays**

| Overlay | Opened from | What it is |
|---|---|---|
| `gm-settings-overlay` | Menu | Frequency Configuration — the seven settings |
| `gm-how-to-overlay` | Menu | How to Play — no tab bar |
| `gm-deck-panel` | Frequency Tuner pickers | Word 1 / Word 2 category deck picker (reused for both) |
| `gm-help-tip-overlay` | Contextual `?` on input screen, override tip | Shared contextual tip overlay |
| `gm-near-sync-overlay` | Result resolution, Resonance Tolerance = Resonant | "Frequency Overlap" — accept or reject a near-match |
| `gm-boost-overlay` | Input screen, from round 5 with Signal Boost on | Optional 15-char context before locking in |
| `gm-neural-library-overlay` | Boost overlay `?` | Metadata-vs-synonym reference guide |
| `gm-override-overlay` | Result screen "Actually... that's a sync" | "Quantum Entanglement?" manual match override |
| `gm-new-frequency-overlay` | Victory screen "New Frequency" | Session Terminal — new session vs resume |
| `gm-concede-overlay` | Sever Link button (Secret Mode, round 11+) | Confirm conceding the session |
| `gm-vocab-overlay` | Secret Mode vocab-lock failure | Terminal-styled word-list reference (shared `smOpenVocabOverlay()`) |
| `gm-quit-overlay` | ✕ during active play | "Cut the signal?" mid-game quit confirm |

### T7b — The words on screen

#### The menu

```copy
# screen-gm-menu
Great
Minds
Think alike. And say the same.
Begin Link
How to Play
Settings
← Back to the Box
```

#### Setup — names and pair reveal

```copy
# screen-gm-setup — names
Great Minds
Who's syncing today?
Mind 1
Mind 2
Begin Link
```

```copy
# screen-gm-setup — pair reveal
Round 1 — Connect these
Both players — look together, then take turns entering your clue.
New Frequency
Start!
```

#### Pass and reveal gates

```copy
# screen-gm-pass-gate
Finding Wavelength 📡
Pass the phone to
I've got it
```

```copy
# screen-gm-reveal-gate
Frequencies Locked... 📡
both watch together!
Matching Wavelength
```

```copy
# screen-gm-reveal
Revealing in…
```

#### Input

```copy
# screen-gm-input
Your turn
Static Interference
is banned this round
Boost Signal ⚡
Establishing Link... Transmit Clue.
Your clue…
📋 VIEW WORD LIST
Lock it in
Losing the connection — frequency mismatch intensifying 📡
Sever Link
```

#### Result — mismatch and match

```copy
# screen-gm-result — no match
New signal acquired ↑
Recalibrate
New Frequency
Actually... that's a sync
```

```copy
# screen-gm-result — match
NEURAL LINK!
Rounds to sync
Psychic Echoes 📖
New Frequency
```

#### Concede (Secret Mode)

```copy
# screen-gm-concede
No Link Could Be Established
Incompatible wavelengths — frequencies could not be aligned.
Rounds attempted:
Psychic Echoes 📖
New Frequency
← Back to Menu
```

#### Settings — Frequency Configuration

```copy
# gm-settings-overlay — title
Frequency Configuration 📡
Calibrate before you sync.
```

```copy
# gm-settings-overlay — Frequency Tuner
Frequency Tuner
Tune which category each word is drawn from.
Word 1 Decks — all 📂
Word 2 Decks — all 📂
```

```copy
# gm-settings-overlay — Adjust Frequency Range
Adjust Frequency Range
Standard words only.
Stable
Unstable
Chaotic
```

```copy
# gm-settings-overlay — Memory Guard
Memory Guard
Previous round's words are always blocked. No further restrictions.
```

```copy
# gm-settings-overlay — Resonance Tolerance
Resonance Tolerance
Exact match only. No partial credit.
High Fidelity
Resonant
```

```copy
# gm-settings-overlay — Infinite Resync
Infinite Resync
Reroll the starting word pair before the game begins.
```

```copy
# gm-settings-overlay — Signal Boost
Signal Boost
From round 5, optionally add 15 chars of context before locking in. Logged in Psychic Echoes.
```

```copy
# gm-settings-overlay — Sylly Mode
✨ Sylly Mode
Static Interference
Each round, a random consonant is banned for both players. No clue may contain it.
Mental Fog
Neural Storm
Done
```

#### Deck picker

```copy
# gm-deck-panel
Tap to include or exclude a category
Deselect All
Done
```

#### How to Play

```copy
# gm-how-to-overlay — title
How to Play 🧠
Find the same connecting word as your partner.
```

```copy
# gm-how-to-overlay — steps
Step 1
Two players. One word pair.
You're each shown the same pair of words. Your job: think of one word that connects them both — without talking to each other.
Step 2
Enter your word privately.
No peeking! Each player enters their word without showing the other. You also can't use any part of either starting word.
Step 3
Reveal and check for a match.
After the countdown, both answers are revealed. If they match — Mind Meld! 🧠 If not, your two words become the new starting pair. Keep going until you meld!
Winning and Scoring
Fewer rounds is more impressive.
The game ends when you achieve Neural Link — both words match. The fewer rounds it took, the stronger the connection. Lower rounds = bigger brains. 🧠
✨ Sylly Mode
Static Interference
Each round, a random consonant is banned — no clue may contain it. Set your intensity in Settings: Mental Fog for a sub-atomic challenge, or Neural Storm for full supernova mayhem.
Got it
```

#### Frequency Overlap, Quantum Entanglement, Signal Boost guide

```copy
# gm-near-sync-overlay
Frequency Overlap
These wavelengths are nearly identical. Do you accept this resonance?
Accept Sync
Reject — recalibrate
```

```copy
# gm-override-overlay
Quantum Entanglement?
Unorthodox frequency… but does it sync?
Confirm sync
Nah, recalibrate
```

```copy
# gm-boost-overlay
Boost Signal ⚡
Hint at category, relationship, or part of speech (15 chars max).
Static Interference! Context cannot match your clue.
Boost Signal
Raw Signal
```

```copy
# gm-neural-library-overlay
Boost Signal Guide ⚡
Provide Metadata, not Synonyms.
Describe the type of word your partner should look for.
Grammar
Physical
Conceptual
Got it 📡
```

#### Session Terminal, Sever Link, quit

```copy
# gm-new-frequency-overlay
Session Terminal
Memory Purge
Resume Current Evaluation
```

```copy
# gm-concede-overlay
Incompatible Wavelengths
We are losing the connection — frequency mismatch intensifying.
Sever
Re-establish Connection
```

```copy
# gm-quit-overlay
Cut the signal?
The link will be severed. All progress lost.
Yeah, disconnect.
Stay on frequency.
```

### T7c — Where the journey is thin

**◇ judgement, not spec.**

**Three of `gm-implementation-notes.md`'s "open" bugs are actually fixed — the notes just never
closed them out.** G4 (near-sync silently discarding the round in Lobby Mode) and G5 (host/client
showing different mismatch phrases) both read as open, but `gmMpResolveRound()` now explicitly calls
`gmHandleMismatch()` on the near-sync path — with an inline comment describing exactly the fix the
notes call for — and overrides the result heading with the broadcast `mismatchPhrase` afterward, so
host and clients render the same text. G6 (quit overlay using a copy-pasted `border-teal-300`
instead of `border-purple-300`) is also fixed — `gm-quit-overlay` in `index.html` now carries
`border-purple-300` like every other GM decision modal. Only **G3** (a reported but unreproduced
screen-refresh-on-the-other-device bug) still reads as genuinely open — no code change addresses it,
and the notes' own next-step (console tracing through `mpHandleEnvelope`) was apparently never run.
Worth a pass through `gm-implementation-notes.md` to close G4/G5/G6 and either action or drop G3,
independent of this identity doc.

**Mid-game quit didn't dissolve the Lobby Mode session for the other device.** **RESOLVED 23 Aug 2026 (SW v210).**
`btn-gm-quit-confirm` reset local round state and called `showScreen('screen-gm-menu')`
unconditionally, stranding the quitting device on its own local menu while the other device's
Firebase room and turn state carried on regardless. It now clears `gmCountdownTimer` as before, then
branches: any lobby session calls `mpNotifyPlayerLeft()` + `resetToLobby()`; the single-device path
is unchanged. Eight games were missing the quit contract in total (LI5, GM, SS, JEC, YGI, LTTP,
NAT, DSD); all eight now call the new engine helper `mpNotifyPlayerLeft()`, and
`node tools/verify-mp-configs.js` § 6 asserts it for all 18.

GM's player count is a fixed 2, so it never had the player-count-cap counterpart bug that SS, JEC,
YGI, LTTP and DSD did — `getMaxPlayers()` for `gm` was already a hardcoded `2` and is untouched.

**The violet-vs-purple brand split is real and already documented, not a new finding.** All primary
CTAs and accents use `violet-500/600`; pills, toggles, the settings tint and modal borders use
`purple-*`. `CLAUDE.md`'s Per-Game Quick Index and `docs/code-map.md` both flag it as an unresolved
"unify or document" item from the June 2026 audit — carried forward here rather than re-discovered.

---

## T8 — Sylly Mode · *free*

**Static Interference.** Every round, one random consonant is banned — neither player's clue may
contain it, adding a live constraint on top of the usual "find the connecting word" puzzle. Two
intensity levels are available: **Mental Fog** bans the letter only from consonants (a lighter
touch), **Neural Storm** extends the ban to vowels too, which is considerably harder to route around.

**What changes.** Nothing about scoring or the win condition changes — a match is still a Neural
Link regardless of how the banned letter affected either player's word choice. The letter re-rolls
each round, so the constraint keeps moving.

**What it doesn't touch.** The core reveal/match/mismatch loop, Psychic Echoes logging, and the
Frequency Overlap near-sync check all work identically with Static Interference on — it's a
constraint layered onto input, not a change to how rounds resolve.

---

## T9 — Art & Assets · *derived*

**Great Minds has no artwork of its own.** Every visual element is emoji (🧠, 📡, 🙈, 🤝, ⚛️, ⚡, 🎉,
📖) or plain text on white/tinted cards — there is no card, tile, or token art to convert, and no
How-to gallery tab.

**The word bank.** Word pairs are drawn from the shared `data/words.json`, using 10 of the suite's 16
categories (Great Minds excludes `vehicles`, `music`, `pop_culture`, `people`, `brands`,
`aussie_slang` — see `.claude/rules/definitions.md`), filtered by Adjust Frequency Range's difficulty
tier. The Frequency Tuner setting lets each side of the pair draw from an independently chosen subset
of those 10 categories via the shared deck-panel picker.

---

## T10 — At the Table · *derived — except the PTP judgement*

**Modes.** Pass-the-Phone (recommended) and Multi-Device Lobby Mode are both supported. There is no
Team Lobby Mode — Great Minds is a fixed 2-player game with no teams.

**Players.** Exactly 2, in both modes — `getMaxPlayers()` for `gm` in `engine-multiplayer.js` is a
hardcoded `2`, so there's no player-count-cap gap here the way there is in several other games (see
`docs/deferred-work.md`).

**Devices.** Pass-the-Phone shares one device, handed off at the pass-gate and reveal-gate around
every round. MDLM gives one device per player and skips both gates — the Firebase round-trip is the
handoff.

**Shape-changing settings.** None of the seven settings alter player count or session structure.

**How it plays at each size**

| Players | What it feels like |
|---|---|
| **2 (only size)** | The whole game — there's no larger or smaller configuration to compare against. |

**Could it be Pass-the-Phone?** — ◇ *judgement, not spec*

**It already is, and MDLM is arguably the better-suited mode for this specific game.** Great Minds'
entire mechanic depends on genuine, simultaneous, no-peeking privacy between exactly two people — a
constraint MDLM satisfies natively (each player's own device) and PTP has to simulate with two
successive gate screens. The pass-gate/reveal-gate machinery exists to make PTP work at all, not
because PTP is the more natural fit; it's there so players without two devices handy aren't locked
out.

---
