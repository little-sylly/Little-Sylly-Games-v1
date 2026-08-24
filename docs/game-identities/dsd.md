# Deep-Sea Deploy

**Game 8** · `activeGameId: dsd` · plugin `js/games/dsd.js`
**Emoji:** ⚓ · **Brand:** `cyan-700` · **Players:** 4 or 6 (team games — 2v2 / 3v3) · **Modes:** PTP · TLM (recommended) · MDLM
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

One person can see the minefield. Everyone else can only see a word and a number. Codenames with
the safety rails cut off — no bystanders, every single tile does something, and the wrong guess in
the wrong mode ends the mission outright. The Captain has to be clever enough to point at nine
targets with one word without accidentally pointing at the mine sitting right next to them.

---

## T2 — The Premise · *free*

Two task forces, one grid of 25 unexplored words, and only the Captains can see what's actually
down there. Your Captain gives you a single word and a single number — that's the whole
transmission — and it's up to the Crew to work out which words on the grid the Captain means, tap
them in the order they're most confident about, and launch the sequence before second-guessing
ruins it.

There's no safe filler tile to fall back on. Every word on this grid is a friendly payload, an
enemy's, a hazard, or a mine — and depending on how the Console is configured, hitting the wrong
one doesn't just cost you points, it can end your turn on the spot or, if Nuclear Mine is armed,
end the whole operation. The tension isn't just "did the Crew read the clue right" — it's "did the
Captain accidentally give a clue that also points straight at the thing that kills the mission."

What the game produces is the particular, specific dread of watching your own Crew tap toward a
tile you know is a mine and being completely unable to stop them — and, when it works, the loud
relief of a Crew reading a one-word clue perfectly and clearing every payload in a single sequence.

---

## T3 — How to Play · *free*

**Setup.** Two task forces face off — name them, or use the defaults. Each side needs at least one
Captain, who alone sees the full picture; everyone else on that side is Crew.

**The grid.** A 5×5 board of 25 words is dealt face-down. Every word secretly belongs to one of
four roles: a **Friendly Payload** (9 for whichever team goes first, 8 for the second), an **Enemy
Payload**, a **Spiked Urchin**, or a **Mine**. There is no neutral, harmless tile — every word does
something when it's revealed.

**The loop.** On your team's turn, the Captain studies the colour-coded grid and gives the Crew a
**Sonar Ping** — exactly one word and one number. The word hints at where the targets are; the
number says how many the Captain thinks it covers. The Crew then taps words on the grid, in the
order they're most confident about, up to the Captain's number plus one guess, and confirms the
sequence to launch it. Each tile resolves as it's revealed:

- **Friendly Payload** — Valour to your team, and (depending on the Console's Hazard Control
  settings) the sequence keeps going.
- **Enemy Payload** — Valour to the other team.
- **Spiked Urchin** — a Valour penalty.
- **Mine** — a bigger Valour penalty, or, if Danger Level is set to Nuclear, the mission ends
  immediately.

Whether hitting an Enemy Payload, an Urchin, or a Mine also **ends your turn** is set per-hazard in
the Console — a highlighted hazard stops the sequence cold; an unhighlighted one costs Valour but
lets the Crew keep tapping.

**How it ends.** The moment one team reveals every one of their own Friendly Payloads, the mission
is over. The winner isn't automatically that team — it's whichever side finished with the **higher
Valour**, so a team that clears its board recklessly can still lose to a more careful opponent.

---

## T4 — Theme & Flavour · *free*

**The world.** A naval deployment briefing crossed with a minesweeper — task forces, sonar,
payloads, mission debriefs. The framing is competent and a little dry-witted rather than grim; it's
borrowing military procedure for flavour, not staging real danger.

**The voice** leans into naval and intelligence jargon throughout: the settings overlay is "The
Console," the grid is read from "The Manifest," a clue is a "Sonar Ping," the play-again prompt asks
for a "New Operation." It stays plausible-sounding rather than technical — nobody needs to know real
naval terminology to enjoy the joke.

**On theme:** competent operators under mild pressure, dry mission-report language, the specific
dread of a Captain who has to thread a clue between what they want found and what they need
avoided.

**Off theme:** real military stakes played straight, grim or violent framing, anything that treats
the "Nuclear Mine" instant-loss as more than a dramatic beat with a 2.6-second sound cue before the
scoreboard.

Australian English throughout.

---

## T5 — Terminology · *paired*

| Term | Meaning |
|------|---------|
| **Sonar Ping** | The Captain's one-word, one-number clue. |
| **The Sequence** | The Crew's ordered list of grid taps, up to the Captain's number plus one. |
| **Deployment** | One full round — both teams have played their turn. |
| **Valour** | The score currency. |
| **Payload** | A team-coloured grid cell — 9 for the first team to move, 8 for the second. |
| **Spiked Urchin** | A hazard cell that costs Valour when hit. |
| **The Manifest** | The Captain's screen — where the full colour-coded grid lives. |
| **The Console** | The settings overlay. |
| **New Operation** | Play again — resets the mission, keeps team/crew names and settings. |
| **Silent Running** | The Sylly Mode. |
| **Jammer** | Silent Running's sabotage tile — planted by one team, ambushes the other's Captain view. |
| **Magnetic Drift** | Silent Running's mechanic — unrevealed grid cells reshuffle each deployment. |

---

## T6 — Settings · *mixed — labels paired, values derived*

The settings overlay is titled **The Console ⚓** — *"Mission parameters and hazard protocols."*

| Setting | Options | Default | What it does in play |
|---|---|---|---|
| **Sea State** | Calm · Turbulent · Tempest | Turbulent | Controls the difficulty of the words dealt onto the grid — Calm draws only the easiest tier, Tempest opens the hardest words too. |
| **Strategic Planning** | OFF / ON | OFF | Shows the full 25-word grid before deployment, with unlimited rerolls on any word you want swapped, before committing to play. |
| **Hazard Control** | Urchin · Mine · Payload (multi-select) | Mine + Payload active, Urchin off | Which hazards end your team's turn on hit. A highlighted hazard stops the sequence; the rest cost Valour but let the Crew keep tapping. |
| **Danger Level** | Pressure Mine · Nuclear Mine | Pressure Mine | Pressure Mine costs 20 Valour on hit. Nuclear Mine ends the whole operation instantly. |
| **✨ Sylly Mode** | OFF / ON | OFF | Silent Running. See T8. |

---

## T7 — The Player's Journey · *mixed — 7a derived, 7b paired, 7c free*

### T7a — The flow

| # | Screen | Beat | Type | Duration | Chrome |
|---|--------|------|------|----------|--------|
| 1 | `screen-dsd-menu` | Pick your poison | Menu | — | 🔊 |
| 2 | `screen-dsd-setup` | Name Your Task Forces | Setup | — | 🔊 ✕ |
| 3 | `screen-dsd-players` | Meet the Crew — team size + names + Captain | Setup | — | 🔊 ✕ |
| 4 | `screen-dsd-briefing` | Strategic Briefing — the whole grid, tap to swap (Strategic Planning only) | Interactive | — | 🔊 |
| 5 | `screen-dsd-pass-gate` | "Pass to …" | Gate | — | 🔊 |
| 6 | `screen-dsd-captain` | The Manifest — read the grid, transmit a Sonar Ping | Interactive | — | `[?]` 🔊 ✕ |
| 7 | `screen-dsd-crew` | Tap the sequence from the Ping | Interactive | — | `[?]` 🔊 ✕ |
| 8 | `screen-dsd-execution` | Launch Sequence — the tiles resolve one by one | Interactive | — | 🔊 ✕ |
| 9 | `screen-dsd-sabotage` | Plant a Jammer (Silent Running only) | Interactive | — | 🔊 ✕ |
| 10 | `screen-dsd-spectator` | Watching — the non-active TLM team's read-only view | Interactive | — | 🔊 |
| 11 | `screen-dsd-gameover` | Mission Debrief | Result | — | 🔊 ✕ |

Rows 5–9 loop once per team per deployment. `screen-dsd-pass-gate` fires before every Captain screen
and before every Crew screen in Pass-the-Phone/TLM — the Pass-the-Phone Safety Gate applies each
time private grid information is about to be shown to a new pair of hands.

**Overlays**

| Overlay | Opened from | What it is |
|---|---|---|
| `dsd-settings-overlay` | Menu | The Console — the five settings |
| `dsd-how-to-overlay` | Menu, captain/crew `[?]` | How to Play — no tab bar |
| `dsd-quit-overlay` | Every in-mission screen's ✕ | "Scuttle the Ship?" mid-game quit confirm |
| `dsd-confirm-disarm` | Crew's Execute Sequence | "Confirm Sequence?" — final check before launching |
| `dsd-new-op-overlay` | Gameover | "New Operation?" play-again confirm |
| `dsd-help-tip-overlay` | Captain's inline `?` (ping-word tip) | Contextual tip, shared shape with the how-to `[?]` |

### T7b — The words on screen

#### The menu

```copy
# screen-dsd-menu
Deep-Sea
Deploy
Read the grid. Trust your Captain. Don't hit the mine.
Begin Deployment
How to Play
Settings
← Back to the Box
```

#### Team setup

```copy
# screen-dsd-setup
Name Your Task Forces
Leave blank to use SS Kraken & SS Leviathan
Team A name
Team B name
Next — Meet the Crew 👥
```

#### Players

```copy
# screen-dsd-players
Crew
Meet the Crew
Names optional — tap ⚓ to assign the Captain.
Team size
2v2
3v3
Set Sail →
```

#### Strategic briefing

```copy
# screen-dsd-briefing
Strategic Briefing ⚓
Review the field. Tap any word to swap it out.
Deploy ⚓
```

#### Pass gate

```copy
# screen-dsd-pass-gate
Pass to …
I'm Ready
```

#### The Manifest (Captain)

```copy
# screen-dsd-captain
The Manifest
show all
One word…
Transmit Ping
```

#### Sonar Crew

```copy
# screen-dsd-crew
Sonar Crew
Execute Sequence
```

#### Launch Sequence (execution)

```copy
# screen-dsd-execution
Launch Sequence
End Turn →
```

#### Sabotage (Silent Running)

```copy
# screen-dsd-sabotage
✨ Silent Running
Tap a word to plant your Jammer. The enemy Captain will see it as
triggering it costs them 5 Valour and ends their turn.
Plant Jammer
Skip
```

#### Spectator

```copy
# screen-dsd-spectator
Watching ⚓
Waiting for Sonar Ping…
Sonar Log
Waiting for first ping…
```

#### Mission Debrief

```copy
# screen-dsd-gameover
Mission Layout
New Operation
```

#### Confirm sequence

```copy
# dsd-confirm-disarm
Confirm Sequence?
Launch Sequence
← Back to Grid
```

#### Settings — The Console

```copy
# dsd-settings-overlay — title
The Console ⚓
Mission parameters and hazard protocols.
```

```copy
# dsd-settings-overlay — Sea State
Sea State
Controls the difficulty of grid words.
Calm
Turbulent
Tempest
```

```copy
# dsd-settings-overlay — Strategic Planning
Strategic Planning
Preview all words before deployment. Rerolls allowed.
```

```copy
# dsd-settings-overlay — Hazard Control and Danger Level
Hazard Control
Highlighted hazards end your turn on hit. Others cost Valour but keep the sequence going.
Urchin
Mine
Payload
Danger Level
Pressure Mine costs 20 Valour. Nuclear Mine ends the game instantly.
Pressure Mine
Nuclear Mine
```

```copy
# dsd-settings-overlay — Sylly Mode
✨ Sylly Mode
Silent Running
The grid drifts between deployments, and teams can plant a Jammer tile to sabotage the enemy.
Done
```

#### How to Play

```copy
# dsd-how-to-overlay — title
How to Play ⚓
How to run a successful deployment.
```

```copy
# dsd-how-to-overlay — steps
Step 1
The Grid.
A 5×5 grid of 25 words is dealt face-down. Words belong to one of four roles:
Friendly Payloads
(9 for the first team, 8 for the second),
Enemy Payloads
,
Spiked Urchins
, and
Mines
. Only the Captain can see the roles.
Step 2
The Captain gives a Sonar Ping.
The Captain sees the colour-coded grid and gives the Crew a Sonar Ping — one word + one number. The word hints at multiple targets. The number says how many payloads it covers.
Step 3
The Crew taps their sequence.
Using the Sonar Ping, the Crew taps grid words in the order they want to reveal them, then launches the sequence. You can guess up to the Captain's number + 1, or stop early.
Step 4
Hazard outcomes.
✅ Friendly Payload — +10 Valour, keep going.
⚠️ Enemy Payload — enemy gains +10 Valour.
🦔 Spiked Urchin — −5 Valour.
💣 Pressure Mine — −20 Valour.
💀 Nuclear Mine — −1000 Valour, game over.
Whether hazards end your turn is controlled in Settings.
Winning and Scoring
Highest Valour wins.
The game ends when a team arms all of their payloads. The team with the highest Valour wins — not necessarily the team that finished first.
✨ Sylly Mode
Silent Running
The grid drifts between deployments, scrambling unrevealed cells. Teams can also plant a Jammer tile to ambush the enemy's next sequence.
Got it
```

#### Quit and play-again

```copy
# dsd-quit-overlay
Scuttle the Ship?
Your deployment will be abandoned. All Valour will be lost.
Scuttle the Ship
Belay that!
```

```copy
# dsd-new-op-overlay
New Operation?
Deploy fresh payloads. Crew and settings are preserved.
Deploy Again
Back to Debrief
```

### T7c — Where the journey is thin

**◇ judgement, not spec.**

**MDLM's player-count cap was pinned to a value only the single-device screen ever changes.**
**RESOLVED 23 Aug 2026 (SW v210).** `getMaxPlayers()` for `dsd` resolved to
`window.mpLobbyStyle === 'team' ? 2 : dsdPlayersPerTeam * 2`. The TLM branch was correct; the MDLM
branch read `dsdPlayersPerTeam`, a game-local variable defaulting to `2` and only otherwise set by
the Team size pills on `screen-dsd-players` — a screen MDLM never shows — or, too late to matter, by
`dsdApplyLobbyRoster()` reading the roster back. **A Lobby Mode room could therefore only ever reach
4 devices (2v2), never the 3v3 Pass-the-Phone and TLM support.** DSD was never flagged for this
during the identity-doc pass; Just Enough Cooks' entry asked whether DSD's near-identical
`getMaxPlayers`/`dsdPlayersPerTeam` pattern was a further instance, and it was. The bounds are now
constants: TLM 2/2, MDLM min 4 / max 6. Five games shared this exact root cause (SS, JEC, YGI, LTTP, DSD). The fix was not
"read the roster's live size" but something simpler: a lobby bound is consulted **only** while the
room fills, so it must never read game-local setup state at all — it now returns the game's true
range as a constant. `node tools/verify-mp-configs.js` § 3 makes the old shape unrepresentable,
and § 4 asserts each game's lobby bounds against its own Pass-the-Phone count pills.

**Nothing checked team balance — closed in the same change.** `mpRosterCheckConfirm` validated only
that every player was *assigned*, so a host could confirm 3v2 (and, before the min-players fix, even
4v0). `dsdApplyLobbyRoster()` sets `dsdPlayersPerTeam = dsdPlayerNames[0].length` — **team A alone**
— so an uneven roster silently mis-sizes team B's crew. `rosterConfig.requiresBalancedTeams: true`
(DSD and SS) now gates both ends: the host lobby CTA rejects an odd roster with a reason line, and
the roster screen requires `|A| === |B|` before Start Game enables.

**Mid-game quit didn't dissolve the lobby session for the rest of the group.** **RESOLVED 23 Aug 2026 (SW v210).**
`btn-dsd-quit-confirm` called `dsdResetState()` + `dsdShowMenu()` unconditionally, leaving the room
and every other device waiting on a turn that would never come. It now branches to
`mpNotifyPlayerLeft()` + `resetToLobby()` in any lobby session — **TLM as well as MDLM**; DSD and
LI5 being TLM games is what widened the rule in `logic-engine.md` past MDLM. Eight games were missing the quit contract in total (LI5, GM, SS, JEC, YGI, LTTP,
NAT, DSD); all eight now call the new engine helper `mpNotifyPlayerLeft()`, and
`node tools/verify-mp-configs.js` § 6 asserts it for all 18.

**The Sabotage screen has no `[?]`.** Every other Interactive screen in the loop carries a help
button, but Sabotage — the one screen unique to Silent Running — doesn't, even though it's the
first time a player meets the Jammer mechanic and the only in-line explanation is the single
instruction line above the grid.

**The Spectator screen is the quietest chrome in the game.** It carries only 🔊 — no `[?]`, no ✕ —
which is defensible since it's read-only (there's nothing to confirm and nothing private to protect
by gating an exit), but it means a spectating player who wants a rules refresher mid-wait has no way
to reach one without waiting for their own team's turn to come around.

**The captain's inline `?` (ping-word tip) and the header `[?]` open different overlays** —
`dsd-help-tip-overlay` (a short, dynamically-set single tip) versus `dsd-how-to-overlay` (the full
step-by-step). Both are legitimate, but a player who's only ever tapped the inline `?` may not
realise the fuller how-to exists at all.

---

## T8 — Sylly Mode · *free*

**Silent Running.** The name is a real submarine stealth tactic — going quiet to avoid detection —
mapped onto a mode about hidden sabotage and a grid that won't sit still.

**What changes.** Two mechanics layer onto the base game:

- **Magnetic Drift** — from the second deployment onward, every unrevealed cell's word and role
  reshuffle before each Captain screen. Already-revealed cells never move. A Captain who
  memorised the board on deployment one can't coast on that memory for deployment two.
- **The Jammer** — after each team finishes its first turn, they secretly plant a Jammer tile
  somewhere on the grid. The opposing Captain sees it only as a `?` — not as any hazard colour —
  so it's indistinguishable from a normal tile until their Crew triggers it. Triggering a Jammer
  costs the active team 5 Valour, ends their turn, and clears the Jammer for the rest of that
  deployment.

**What it doesn't touch.** Scoring, hazard behaviour, and the base game's win condition are all
unchanged — Silent Running adds uncertainty and sabotage on top of the existing structure rather
than replacing any of its rules.

---

## T9 — Art & Assets · *derived*

**Deep-Sea Deploy has no artwork of its own.** Every visual element is a colour-coded grid cell
(Tailwind background classes per role — see the Deep Trench palette below) plus emoji (⚓, 🦔, 💣,
💀, 🏆, 📱). There is no card, tile, or token art to convert, and no How-to gallery tab — the grid
itself, not an illustrated deck, is the whole visual surface.

**The Deep Trench colour palette** — the Captain's full-information view versus the muted,
already-revealed view Crew and spectators see:

| Role | Captain grid | Revealed (muted) |
|---|---|---|
| Friendly payload | cyan-700 fill, white text | cyan-200 fill, cyan-900 text |
| Enemy payload | indigo-800 fill, white text | indigo-200 fill, indigo-900 text |
| Urchin | slate-400 fill, white text | slate-200 fill, slate-700 text |
| Mine (pressure) | red-600 fill, white text | red-200 fill, red-900 text |
| Mine (nuclear) | red-900 fill, white text | red-200 fill, red-900 text |
| Jammer (Silent Running) | the placing team's own colour + a `?` badge | — |

**The word bank.** Grid words are drawn from the shared `data/words.json` pool, filtered at
deployment time to exclude `aussie_slang`, `pop_culture`, `people` and `brands` (any word containing
a space is also excluded; hyphenated entries are kept). Sea State controls which difficulty tiers
are eligible — Calm draws only tier 1, Turbulent draws tiers 1–2, Tempest opens the full tier 1–3
pool.

---

## T10 — At the Table · *derived — except the PTP judgement*

**Modes.** Pass-the-Phone, Team Lobby Mode (recommended) and Multi-Device Lobby Mode are all
supported.

**Players.** Two even teams — 2v2 (4 players) or 3v3 (6 players), set by the Team size pills on the
Players screen in Pass-the-Phone/TLM, and by the roster in MDLM (which enforces the two teams being
the same size — see T7c). In Pass-the-Phone, the same shared device carries both teams through the
pass-gate in turn.

**Devices.** Pass-the-Phone shares one device for the whole match, handed off at every pass-gate.
TLM gives one device per **team** (both Captain and Crew share it, since only the active Captain's
private view matters at any moment). MDLM gives one device per **player**, with the non-active
team routed to the read-only Spectator screen.

**Shape-changing settings.** None of the five settings alter player count or team structure — Team
size is chosen independently on the Players screen.

**How it plays at each size**

| Players | What it feels like |
|---|---|
| **2v2** | Tighter Crew coordination — with only one other Crew member (or none) to cross-check a read, a Captain's Sonar Ping has to be unambiguous or the sequence goes wrong fast. |
| **3v3** | More voices arguing over the same grid before a sequence is confirmed — slower per turn, but a wrong read is more likely to get caught before it's locked in. |

**Could it be Pass-the-Phone?** — ◇ *judgement, not spec*

**It already is, and it's a reasonable way to play — but it's the mode where the game's central
trick is weakest.** The whole point of a Captain/Crew split is that the Captain knows something the
Crew doesn't; on a single shared device, that separation exists only because everyone agrees to
look away during the other side's screen, not because the device enforces it. TLM and MDLM make the
information split real rather than social, and TLM's the recommended default for exactly that
reason — PTP survives as a genuine option, not a compromise, but it's the one mode a
suspicious player could quietly defeat just by not looking away.

---
