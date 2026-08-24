# Secret Signals

**Game 3** · `activeGameId: sylly-signals` (legacy internal id — displayed as Secret Signals) · plugin `js/games/secret-signals.js`
**Emoji:** 📡 · **Brand:** `teal-500` · **Players:** 2v2 or 3v3 (4 or 6 players) in every mode · **Modes:** PTP · TLM (recommended) · MDLM — the suite's only hybrid game
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

Your team has a vault of secret keywords. Every round, one of you has to describe a number code
using only clues — cryptic enough that the enemy team can't crack it, clear enough that your own
teammates still can. It's a live tightrope walk between two audiences who are listening to the exact
same words and trying to reach opposite conclusions.

---

## T2 — The Premise · *free*

Two teams each guard a **Vault** of four secret keywords, numbered 1–4. Every round, one team's
**Encoder** is handed a secret 3-digit code — say, 3-1-4 — and has to give one spoken clue per digit,
in order, describing that numbered keyword well enough for their own team to reconstruct the code
later, but vague enough that the enemy team listening in can't work it out first.

The enemy team gets first crack at the code — that's an **Intercept**. If they crack it, they score.
Only then does the encoding team try to decode their own transmission — get it wrong and that's a
**Misfire**, which also counts against them. Two misfires and the team is out. The tension runs both
directions at once: too obvious and the enemy intercepts; too cryptic and your own team misfires.

---

## T3 — How to Play · *free*

**Setup.** Name your two teams (or use the defaults), pick 2v2 or 3v3, and enter operative names —
optional, they're only used for broadcaster rotation. Each team then privately memorises its own
four-keyword Vault before play begins.

**The loop.** Each round, the active team's Encoder receives a secret code and gives one clue per
digit. The enemy team hears the clues and tries to **Intercept** the code first. Then the encoding
team gets its own turn to **Decode** what was just transmitted — using the same clues, from memory.
Every clue given (by either side, across the whole match) is logged in the **Intelligence Archive**,
visible on every later broadcast/intercept/decode screen, so later rounds get easier to read as the
history builds up. **Round 1 is a no-score warm-up** for interceptions — a correct intercept before
any clue history exists is pure luck, so it earns no token (misfires still count from round 1).

**How it ends.** First team to reach the Interceptions Required target (2 or 3, by setting) wins the
mission outright. A team that racks up two Misfires is also eliminated. If Sylly Mode is on, the
match doesn't end there — see T8.

---

## T4 — Theme & Flavour · *free*

**The world.** Cold-war-flavoured espionage — vaults, codebooks, transmissions, interceptors — played
completely straight in its language while the actual mechanic is a party word-clue game. The tone
takes itself just seriously enough to be funny: "Top Secret," "Abort the mission," "Diplomatic
Resolution," all delivered with a straight face over what is, underneath, two teams trying to
out-cryptic each other.

**The voice** never breaks character. Settings are an "Operations Briefing." Quitting is "Abort the
mission?" The end-of-game recap is the "Mission Debrief" and "Mission Journal." Sylly Mode's second
phase is styled as an "Urgent mission received" interrupt. Even the Rock Paper Scissors tiebreak gets
folded in as "Trial by Combat."

**On theme:** espionage jargon (vault, encoder, transmission, intercept, dossier, debrief), a sense of
two rival intelligence operations rather than two teams of friends, drama delivered deadpan.

**Off theme:** anything that breaks the spy-thriller frame with a joke that undercuts it, real
cryptography or code-breaking mechanics (the "encryption" is entirely clue-based, not mathematical).

Australian English throughout.

---

## T5 — Terminology · *paired*

| Term | Meaning |
|------|---------|
| **Vault** | Each team's private set of 4 numbered keywords. |
| **The Transmitter / Encoder / Broadcaster** | The player giving clues this round; rotates per round (`ssGetBroadcaster`). |
| **Broadcast** | The set of clues transmitted for the current code. |
| **Intercept** | The enemy team correctly decoding a broadcast before the encoding team does. Round 1 intercepts don't score (see T3). |
| **Misfire** | The encoding team failing to decode its own transmission. Two misfires eliminates a team. |
| **Intelligence Archive** | The running per-team clue-history table shown on broadcast/intercept/decode screens. |
| **Clue Dossier 📖** | The slide-up overlay (from the encrypt screen) showing the encoding team's own transmission history. |
| **Mission Journal** | The full round-by-round log shown on the final gameover screen (plus an Intel Dossier section if Phase 2 ran). |
| **Intel Phase / Intelligence Reveal** | Sylly Mode's Phase 2 — a final round where both teams try to guess each other's whole Vault. |
| **Diplomatic Resolution ("Accept It 🤝")** | Intel Phase override — lets both teams agree a close-but-not-exact guess counts, shown only after the third failed attempt. |
| **Scramble Bonus** | +1.0 Intel points for finding all 4 of the opponent's keywords. |
| **Operations Briefing 🔐** | The settings overlay's title. |

---

## T6 — Settings · *mixed — labels paired, values derived*

The settings overlay is titled **Operations Briefing 🔐** — *"Configure before your first broadcast."*

| Setting | Options | Default | What it does in play |
|---|---|---|---|
| **Designate Vault Contents** | OFF / ON + 16-category picker | OFF | OFF draws from a curated 10-category pool sized to avoid dead-end pairs (e.g. excludes `pop_culture`/`brands`). ON opens the full 16-category grid. |
| **Encryption Protocol** | Clear · Scrambled · Deep Space | Clear | Which single difficulty tier (not cumulative) the vault keywords are drawn from — concrete nouns through to abstract. |
| **Interceptions Required** | 2 · 3 | 2 | How many successful intercepts wins the mission outright. |
| **Vault Rotations** | OFF / ON | OFF | ON lets the Encoder reroll any vault keyword as many times as they like before transmitting. |
| **Broadcaster Timer** | OFF / ON + 1 / 2 / 3 min | OFF (60s when first enabled) | ON puts a countdown on clue-giving; an alarm sounds at zero and stops on Transmit. |
| **✨ Sylly Mode** | OFF / ON | OFF | Intel Phase. See T8. |

---

## T7 — The Player's Journey · *mixed — 7a derived, 7b paired, 7c free*

### T7a — The flow

| # | Screen | Beat | Type | Duration | Chrome |
|---|--------|------|------|----------|--------|
| 1 | `screen-ss-menu` | Menu | Menu | — | 🔊 |
| 2 | `screen-ss-setup` | Establish Cover Identities — team names | Setup | — | 🔊 ✕ |
| 3 | `screen-ss-players` | Meet the Operatives — team size + names | Setup | — | 🔊 ✕ |
| 4 | `screen-ss-vault-gate` | Pass-the-phone gate before a team's vault reveal (reused per team) | Gate | — | none (PTP safety gate) |
| 5 | `screen-ss-vault` | Vault reveal — memorise 4 keywords (reused per team) | Interactive | — | 🔊 ✕ |
| 6 | `screen-ss-encrypt` | Encoder gives clues for the secret code | Interactive | — | `[?]` 🔊 `?` ✕ (two help affordances — see T7c) |
| 6b | `screen-ss-standby` | TLM/MDLM only — non-active team waits, sees own board | Interactive | — | 🔊 ✕ |
| 7 | `screen-ss-broadcast` | Everyone sees the clues + Intelligence Archive | Interactive | — | 🔊 ✕ |
| 8 | `screen-ss-intercept` | Enemy team guesses the code | Interactive | — | `[?]` 🔊 ✕ |
| 9 | `screen-ss-decode-gate` | Pass gate before the encoding team decodes its own code | Gate | — | none (PTP safety gate) |
| 10 | `screen-ss-decode` | Encoding team decodes its own transmission | Interactive | — | 🔊 ✕ |
| 11 | `screen-ss-resolution` | Round result + scoreboard | Result | — | 🔊 ✕ |
| — | `ss-endgame-splash` | Full-screen mission result + Phase 2 bridge (custom overlay, not a screen) | Interstitial | auto/tap | none |
| 12 | `screen-ss-gameover` | Mission Debrief — final result + Mission Journal | Result | — | none |
| 13 | `screen-ss-tiebreak` | *(Sylly Mode only)* who goes first in Intel Phase | Interactive | — | 🔊 ✕ |
| 14 | `screen-ss-intel-intro` | *(Sylly Mode only)* Phase 2 team handoff (reused per team) | Interstitial | — | 🔊 ✕ |
| 15 | `screen-ss-intel-guess` | *(Sylly Mode only)* guessing one opponent keyword at a time | Interactive | — | 🔊 ✕ |
| 16 | `screen-ss-intel-summary` | *(Sylly Mode only)* per-team Intel tally (reused per team) | Result | — | 🔊 ✕ |

Rows 4–11 loop, alternating encoding team, until a win condition or Sylly Mode's Phase 2 fires.
`screen-ss-vault-gate` and `screen-ss-vault` are single registered screens reused for both teams with
dynamic titles; the same is true of `screen-ss-decode-gate`, `screen-ss-intel-intro` and
`screen-ss-intel-summary`. Who Encrypts First is handled by the shared `showWhoFirst()` engine screen,
not a game-specific one.

**Overlays**

| Overlay | Opened from | What it is |
|---|---|---|
| `ss-settings-overlay` | Menu | Operations Briefing — the six settings |
| `ss-how-to-overlay` | Menu, encrypt screen `[?]` | How to Play — no tab bar |
| `ss-dossier-overlay` | Encrypt screen 📖 button | Clue Dossier — the encoding team's own transmission history |
| `ss-help-tip-overlay` | Contextual `?`/`[?]` buttons on encrypt/broadcast/intercept | Shared contextual tip overlay — three different tips depending on which button opened it |
| `ss-quit-overlay` | ✕ during active play | "Abort the mission?" mid-game quit confirm |
| `ss-play-again-overlay` | Gameover "Start New Mission" | "New Mission?" confirm — dynamic label in MP (Host: "Restart in Lobby"; Client: "Leave Session") |
| `ss-override-overlay` | Intel guess, after 3rd failed attempt | Diplomatic Resolution — both teams agree a close guess counts |
| `ss-inning-transition` | Between Intel Phase teams | Full-screen "Data Filed — Intel Secured" splash (custom pattern, not Data/Decision) |

### T7b — The words on screen

#### The menu

```copy
# screen-ss-menu
Secret
Signals
Send the signal. Secure the code.
Start Mission
How to Play
Settings
← Back to the Box
```

#### Team setup

```copy
# screen-ss-setup
Establish Cover Identities
Leave blank to use Alpha Echo & Bravo Zulu
Team A name
Team B name
Next — Meet the Operatives
```

#### Operatives

```copy
# screen-ss-players
Operatives
Meet the Operatives
Names optional — helps with broadcaster rotation.
Team size
2v2
3v3
Team A
Team B
Proceed to Vault →
```

#### Vault gate

```copy
# screen-ss-vault-gate
Top Secret
Team A only
Don't let the other team peek!
We're ready — show our vault
```

#### Vault

```copy
# screen-ss-vault
Secret Vault
Your Secret Vault
Team A
Memorise these — don't show the other team!
Got it! I've memorised my vault 👁️
```

#### Encrypt

```copy
# screen-ss-encrypt
Encrypt
Team A
Encrypt Transmission
Your Vault
Your Code
Give one clue for each number, in order
Transmit
```

#### Standby

```copy
# screen-ss-standby
Secret Signals
Interceptors Ready
Listen carefully — the broadcast is coming.
Your Board 🗒️
```

#### Broadcast

```copy
# screen-ss-broadcast
Transmission
Team A — Round 1
📡 Incoming Clues
Intelligence Archive
Interceptors, Ready?
```

#### Intercept

```copy
# screen-ss-intercept
Intercept
Team B
🕵️ Intercept the code
Intelligence Archive
Guess the code
Submit Intercept
```

#### Decode gate and decode

```copy
# screen-ss-decode-gate
Next up
Team A — Decode
Pass the phone to
Time to verify your transmission.
Ready to Decode
```

```copy
# screen-ss-decode
Decode
Team A
🔑 Decode your message
What was the code you sent?
Your Vault
Intelligence Archive
Your code
Confirm Code
```

#### Resolution

```copy
# screen-ss-resolution
The Code Was
Scoreboard
Continue
```

#### Endgame splash and gameover

```copy
# ss-endgame-splash
Mission Status
Urgent mission received: Phase 2 incoming
See Results
```

```copy
# screen-ss-gameover
Mission Debrief
Mission Journal
Start New Mission
← Back to the Box
```

The splash's icon/status/title/subtitle and the gameover title/reason are all set dynamically
(`ssShowEndgameSplash`, `ssShowGameover`) — e.g. "📑 INTELLIGENCE SECURED" / "{team} intercepted" on
a win, "💥 TRANSMISSION LOST" / "{team} lost the signal" on an elimination by misfire.

#### Tiebreak (Sylly Mode Phase 2 entry)

```copy
# screen-ss-tiebreak
Intelligence Reveal
Signal Interference!
Leadership is contested.
Going second = you see the target score before guessing
Let Fate Decide — Go Random
Trial by Combat — Rock Paper Scissors
✂️ Play Rock Paper Scissors now.
Winner gets to choose who goes first.
Going second = you know the target score. Choose wisely.
Go First
Go Second
```

#### Intel Phase

```copy
# screen-ss-intel-intro
Phase 2: Intelligence Reveal
your turn
Use their clue history as your only evidence.
Target to Beat
Begin Intel Sweep
```

```copy
# screen-ss-intel-guess
Crack the keyword 🔍
Clue Dossier
Continue →
Accept It
```

```copy
# screen-ss-intel-summary
Intel Summary
Keywords found
✨ Scramble Bonus
Intel Points
Pass to Team B →
```

#### Settings — Operations Briefing

```copy
# ss-settings-overlay — title
Operations Briefing 🔐
Configure before your first broadcast.
```

```copy
# ss-settings-overlay — Designate Vault Contents
Designate Vault Contents
OFF uses the standard curated word pool. Turn on to pick specific categories.
Categories
Deselect All
⚠️ Fewer than 4 categories may cause repeated keywords.
```

```copy
# ss-settings-overlay — Encryption Protocol
Encryption Protocol
Clear
Scrambled
Deep Space
Controls how abstract the vault keywords are.
```

```copy
# ss-settings-overlay — Interceptions Required
Interceptions Required
First team to intercept this many codes wins.
```

```copy
# ss-settings-overlay — Vault Rotations
Vault Rotations
Let broadcasters reroll any vault keyword as many times as they like. Off by default.
```

```copy
# ss-settings-overlay — Broadcaster Timer
Broadcaster Timer
Countdown during clue-giving
1 min
2 min
3 min
Alarm sounds at 0 — stops on Transmit.
```

```copy
# ss-settings-overlay — Sylly Mode
✨ Sylly Mode
Intel Phase
Teams guess the opponent's vault after the game.
Done
```

#### How to Play

```copy
# ss-how-to-overlay — title
How to Play 📡
Encrypt your vault. Intercept theirs.
```

```copy
# ss-how-to-overlay — steps
Step 1
Each team memorises their vault.
Your team gets 4 secret keywords numbered 1–4. Only your team can see them — memorise them!
Step 2
Encrypt your broadcast.
Each round, your Encoder receives a secret code (e.g. 3-1-4). Give one clue per number — cryptic enough to fool the enemy, clear enough for your own team.
Step 3
Intercept or decode.
The enemy team tries to crack your code first — that's an 🕵️
Interception
. Then your own team decodes it. Get it wrong and it's a
Misfire
💥.
Winning and Scoring
Intercept to win. Don't misfire.
🕵️ Intercept — enemy cracked your code. They score.
💥 Misfire — your own team got it wrong. Two misfires and you lose.
First team to reach the interception target wins.
✨ Sylly Mode
Intel Phase
After the main game ends, both teams take turns guessing the other team's vault keywords in order. A second chance to steal the win.
Got it
```

#### Dossier, help tip, quit, play-again, Diplomatic Resolution

```copy
# ss-dossier-overlay
Clue Dossier 📖
Your team's transmission history.
```

```copy
# ss-help-tip-overlay
Got it ✓
```

Three tips share this one overlay: "Encrypt Your Transmission" (encrypt `[?]`), "Giving Clues"
(broadcast `[?]`), "Guessing the Code" (intercept `[?]`) — each fires `ssShowHelpTip(emoji, heading,
tip)` with different content.

```copy
# ss-quit-overlay
Abort the mission?
Your intel will be lost.
Yeah, pull out
Stay in the field
```

```copy
# ss-play-again-overlay
New Mission?
This mission's intel will be archived.
Deploy
Back to Mission Review
```

```copy
# ss-override-overlay
Diplomatic Resolution
Tap the word you're arguing for
Both teams agree this guess is close enough.
Agreed — it counts!
No deal, try again
```

### T7c — Where the journey is thin

**◇ judgement, not spec.**

**MDLM's player-count cap was pinned to a value only the single-device screen ever changes.**
**RESOLVED 23 Aug 2026 (SW v210).** `getMaxPlayers()` for `ss` resolved to
`window.mpLobbyStyle === 'team' ? 2 : ssPlayerCount * 2`. The 2-device TLM branch was correct by
design; the MDLM branch read `ssPlayerCount`, a game-local variable defaulting to `2` and only
otherwise set by the Pass-the-Phone "Team size" pills on `screen-ss-players` — a screen MDLM never
shows — or, far too late to matter, inside `startSyllySignals()` itself
(`ssPlayerCount = ssPlayerNamesA.length`), which runs only *after* the roster has filled. **A Lobby
Mode room could therefore only ever reach 4 devices (2v2), never the 3v3 Pass-the-Phone and TLM
support.** The bounds are now constants: TLM 2/2, MDLM min 4 / max 6. Five games shared this exact root cause (SS, JEC, YGI, LTTP, DSD). The fix was not
"read the roster's live size" but something simpler: a lobby bound is consulted **only** while the
room fills, so it must never read game-local setup state at all — it now returns the game's true
range as a constant. `node tools/verify-mp-configs.js` § 3 makes the old shape unrepresentable,
and § 4 asserts each game's lobby bounds against its own Pass-the-Phone count pills.

**Raising the cap exposed an older hole, closed in the same change: nothing checked team balance.**
`mpRosterCheckConfirm` validated only that every player was *assigned*, so a host could confirm 3v2
— and, before the min-players fix, even 4v0. Secret Signals derives its per-team size from **team A
alone**, so an uneven roster silently mis-sizes team B. `rosterConfig.requiresBalancedTeams: true`
(SS and DSD, the suite's two balanced-team games) now gates both ends: the host lobby CTA rejects an
odd roster with a reason line, and the roster screen requires `|A| === |B|` before Start Game
enables, showing "Both teams need the same number of players" in `#mp-roster-hint`.

**Mid-game quit didn't dissolve the lobby session for the rest of the group.** **RESOLVED 23 Aug 2026 (SW v210).**
`btn-ss-quit-confirm` called `ssResetToMenu()` unconditionally, stranding the quitting device on its
own local menu while the room and every other device waited for a turn that would never come. It now
branches: any lobby session — **TLM as well as MDLM**, and SS is the suite's only game that supports
both — calls `mpNotifyPlayerLeft()` + `resetToLobby()`. Eight games were missing the quit contract in total (LI5, GM, SS, JEC, YGI, LTTP,
NAT, DSD); all eight now call the new engine helper `mpNotifyPlayerLeft()`, and
`node tools/verify-mp-configs.js` § 6 asserts it for all 18.

**Two different `[?]` affordances live on the same encrypt-screen header, and only one of them is a
"real" How to Play.** `btn-ss-how-to-game` (styled `[?]`) opens the full How to Play overlay; a second,
adjacent button `btn-ss-encrypt-tip` (styled a bare `?`) opens a single contextual tip via
`ssShowHelpTip`. `ss-implementation-notes.md` (S16, June 2026) records "no header `[?]` → How to Play
on gameplay screens" as an open gap — that appears to have been silently resolved since, at least on
this one screen; the broadcast and intercept screens still have only their contextual `[?]`, no
game-wide How to Play access. Worth a note in `ss-implementation-notes.md` next time it's touched, so
the gap doesn't read as still-open when it partially isn't.

**The contextual tip overlay's close button doesn't match `ui-style.md`'s Contextual Tip Icon
pattern.** `btn-ss-help-tip-close` is `min-h-12 … text-base` ("Got it ✓"); the documented pattern is
`min-h-11 … text-sm` ("Got it", no checkmark). Cosmetic only — both clear the 44px touch minimum — but
it's the one instance in the suite that doesn't match the shared template exactly.

---

## T8 — Sylly Mode · *free*

**Intel Phase.** When the main mission ends — by interception target or by a team running up two
Misfires — Sylly Mode doesn't end the game there. Instead it opens a second phase where each team gets
one last shot at victory: guessing the *other* team's entire Vault, one keyword at a time, using
nothing but that team's accumulated clue history as evidence.

**How it plays.** Whoever needs the tiebreak resolved first (in case the main mission ended in a way
that leaves it ambiguous who acts first) settles it by random draw or Rock Paper Scissors — with the
twist that going second is an advantage, since the second team gets to see the first team's Intel
score as a target to beat. Each team then works through all 4 of the opponent's keywords, one at a
time: three attempts per keyword, with **Diplomatic Resolution** available after the third miss as
a last-word negotiation between the teams over whether a near-guess should count. Finding all 4
keywords also earns a **Scramble Bonus**.

**What it doesn't touch.** The core encrypt/intercept/decode loop, the Interceptions Required target
and the Misfire elimination rule are all unchanged — Intel Phase is a bolt-on second act, not a
replacement for how the main mission is scored.

---

## T9 — Art & Assets · *derived*

**Secret Signals has no artwork of its own.** Every visual element is emoji (📡, 🤫, 🔐, 🕵️, 🔑, 📖,
🏆) or plain text on white/tinted cards — there is no card, tile, or token art to convert, and no
How-to gallery tab.

**The word bank.** Vault keywords are drawn from the shared `data/words.json`, filtered to a single
difficulty tier matching Encryption Protocol (not a cumulative range, unlike most difficulty settings
in the suite) — either the curated 10-category pool or, with Designate Vault Contents on, whichever of
the 16 categories the table selects.

---

## T10 — At the Table · *derived — except the PTP judgement*

**Modes.** The only hybrid game in the suite — Pass-the-Phone, Team Lobby Mode (2 devices, one per
team, the recommended online mode) and Multi-Device Lobby Mode (one device per operative, currently
capped at 4 — see T7c) are all supported from the same device-routed code path
(`ssTeamDevices[team] = [playerIdx,…]`).

**Players.** 2v2 or 3v3 in every mode — Pass-the-Phone, TLM and MDLM alike. Multi-Device Lobby Mode
takes 4 or 6 devices; the roster screen requires the two teams to be the same size, so an odd count
can't start (see T7c).

**Devices.** Pass-the-Phone shares one device, handed off at every Vault Gate and Decode Gate. TLM
gives one device per team (the non-active team sees the Standby screen). MDLM gives one device per
operative, with only the lowest-seat device on each team acting as encoder/decoder/Intel guesser at a
time — everyone else sees the Standby board or the Intel dossier and discusses out loud.

**Shape-changing settings.** None of the six settings alter player count or session structure —
Designate Vault Contents changes which words are drawn, not how many teams or players there are.

**How it plays at each size**

| Players | What it feels like |
|---|---|
| **2v2** | The baseline — one Encoder per team every round, clean rotation, the mode Lobby Mode currently offers. |
| **3v3** | Pass-the-Phone/TLM only. Broadcaster rotates through three operatives per team, so the same person encodes less often — more voices in the clue-giving, and (per T7a's guesser-rotation rule) the *next* transmitter is always the one decoding, which for a team of 1 collapses back to broadcaster === guesser (correct TLM behaviour). |

**Could it be Pass-the-Phone?** — ◇ *judgement, not spec*

**It already is, and it's the game most suited to being all three modes at once.** The couch-security
model — both vaults broadcast, each device renders only its own team via `ssMyTeam()` — means the
privacy boundary that matters (team vs opposing team) survives equally well whether the device is
shared within a team (PTP/TLM) or individual (MDLM). Unlike most games in the suite, Secret Signals
was built to be genuinely hybrid rather than PTP-with-an-MP-mode-bolted-on, which is why it's the one
game offering all three lobby styles from a single code path.

---
