# Net-Trace

**Game 13** · `activeGameId: nt` · plugin `js/games/nt.js`
**Emoji:** 💻 · **Brand:** emerald-500/600 · **Players:** 2–8 · **Modes:** PTP + MDLM
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

An automated breach is coming down the wire, and your only defence is the maze you build in front
of it. Drop Firewall Segments and Honeypots on your own grid, and a signal traces the longest legal
path it can find from one side to the other — the longer it takes, the better you scored. It's a
solitaire-maze puzzle wearing a network-engineering terminal, with the honest physics of a real
pathfinder underneath: corners cost real time, traps really slow things down, and the grid rewards
genuine spatial thinking, not luck. Every player builds and scores independently, so it plays solo
just as well as it plays as a room of people quietly frowning at their own screens, then all
watching each other's playback traces at once.

---

## T2 — The Premise · *free*

You are a systems admin with one job: keep a breach signal moving through your network for as long
as possible before it reaches the exit. You get a fixed window, a fixed budget of Firewall Segments
and Honeypots, and a grid with an Ingress and an Egress already cut into it. Everything else is
yours to arrange.

The signal isn't smart, exactly — it's honest. It always finds the longest surviving legal route
through whatever you've built, the same way water finds a way downhill. Your job is to make that
route as long and as twisted as you possibly can without accidentally sealing the exit shut, which
the game simply won't let you do. Then you watch it happen: a live trace crawls across your maze in
real time, slowing to a crawl through every Honeypot's radius, and the final number — your System
Efficiency Rating — is the whole verdict on how well you thought it through.

What it produces is the specific, quiet satisfaction of a maze that actually works when you watch it
run, the mild horror of realising your Egress was reachable in four moves the whole time, and — in a
room together — a round of "wait, how did you get 97%?" once everyone's traces are up side by side.

---

## T3 — How to Play · *free*

**Setup.** Every player is given their own private **Node** — a grid with a fixed Ingress and Egress
already placed — and a fixed inventory of Firewall Segments and Honeypots to spend. A match runs
across several **Vulnerability Simulations** (cycles); your final ranking is your rolling-average
**SER** across all of them.

**Hardening.** Within your time window, tap and hold to place components:

- **Tap an empty cell** — place a Firewall Segment (a solid wall).
- **Long-press an empty cell** — place a Honeypot (a slow trap).
- **Long-press a Firewall** — upgrade it to a Honeypot.
- **Tap a placed block** — remove it, refunding it to your inventory.

You cannot seal the Egress off completely — any placement that would do so is simply blocked before
it can be made.

**Playback.** Once every player has committed (or the timer runs out), a live trace crawls each
node's maze from Ingress to Egress, choosing the longest route that still legally reaches the exit.
Every corner it turns adds a little delay; every Honeypot it crosses slows it further while it's
inside the trap's radius. The total time taken is your latency for that cycle.

**Scoring.** The longest latency of the cycle scores 100.00% — the **System Efficiency Rating**.
Everyone else is scored relative to that leader. Your match rank is your average SER across every
Vulnerability Simulation played.

---

## T4 — Theme & Flavour · *free*

**The world.** A corporate network-security terminal, played completely straight — you are hardening
infrastructure against an automated breach, not fighting a villain. The register is dry, procedural,
and confident: `SYS_INIT`, `ROUTING: VALID`, `[ SYS_STAT ]`. Nothing about it winks at the player
except one deliberately buried joke.

**The voice** never breaks character. Screen headers read like real terminal output — the settings
overlay is titled `SYS.CONFIG ⚡` with the subtitle `root@amaze_inc:~# ./sys.config`; the boot log
that types out before every cycle reads like an actual system log, right down to the blank lines
between entries. The one exception: the boot sequence's node identifier decodes, in hex, to the word
*maze* — a private nod to what the game actually is, never surfaced to the player as text, and
deliberately trimmed off the playback screen on mobile so it never crowds out the real node number.

**Australian English throughout**, as everywhere in the suite — colour, not color; metric where
anything is measured at all.

**On theme:** emerald-on-slate terminal chrome, monospace type, a genuine file-explorer aesthetic on
the system log overlay (`// SYSTEM LOGS`, `root@amaze_inc:~# cat ./sys.log`). Native (system-placed)
components render in a visually distinct violet to read as permanent infrastructure, never as
something the player placed.

**Off theme:** anything cartoonish, any UI chrome that breaks the terminal illusion, or dialogue that
addresses the player directly outside the system-message register. Net-Trace is the suite's most
technically "serious" game, and its flavour is the restraint of never softening that.

---

## T5 — Terminology · *paired*

| Term | Meaning |
|------|---------|
| **Relay-Leg Node** | A player's own section of the network — the grid they harden. |
| **Hardening** | Placing Firewall/Honeypot components to reduce your SER. |
| **SER** | System/Signal Efficiency Rating — latency scored relative to the cycle's longest trace; lower latency scores lower. |
| **Firewall Segment** | Defensive component — a solid wall on a path segment. |
| **Honeypot** | Deceptive component — slows the trace while it's inside the trap's radius. |
| **Native Honeypot** | A Honeypot placed by the system itself before hardening begins — permanent, cannot be moved or removed. |
| **Bad Sector** | A fixed, unbuildable obstacle baked into the node's generation. |
| **Ingress / Egress** | Where the signal enters and must exit the node. |
| **Vulnerability Simulation** | One cycle of the match. |
| **Hardening Window** | The countdown for each player's build phase. |
| **Trace / Playback** | The animated run of the signal through a completed node. |
| **Cluster Ceiling** | Sylly Mode (DNP) scoring — see T8. |
| **Debug Mode** | Staging Environment — a hand-authored node in place of a rolled one; see T8-adjacent, mutually exclusive with Sylly Mode. |
| **Node Editor** | The Debug Mode authoring canvas. |
| **Sandbox Initialisation** | Debug Mode's one-time terminal-boot screen, setting the Node's width and height before the Editor opens. |
| **Attempt / Best Trace** | Debug Mode — one local run of the retry loop; only the best-scoring attempt is what's recorded. |
| **Reboot System?** | Play-again overlay heading. |
| **Drop Connection?** | Quit overlay heading. |
| **SYS.CONFIG ⚡** | Settings overlay title. |
| **Diagnostic Summary** | The per-cycle (and final match) results screen. |

---

## T6 — Settings · *mixed — labels paired, values derived*

The settings overlay is titled **SYS.CONFIG ⚡** — styled as a literal terminal prompt,
`root@amaze_inc:~# ./sys.config`.

| Setting | Options | Default | What it does in play |
|---|---|---|---|
| **Matrix Scale** | 16×16 / 18×18 / 20×20 | 18×18 | The size of each Node — bigger grids mean more room to maze, but smaller touch targets on a phone. |
| **Simulation Iterations** | 5 / 7 / 10 | 5 | How many Vulnerability Simulations make up a full match. |
| **Hardening Window** | 45s / 60s / 90s / No Limit | 90s | How long you get to build each Node before the layout locks. |
| **Native Honeypots** | 0 / 1 / 2 | 2 | The most Honeypots the system can bake into the Node itself, before you place your own. |
| **Debug Mode** | OFF / ON | OFF | Staging Environment — build the Node yourself instead of the system rolling one. Mutually exclusive with Sylly Mode. |
| **✨ Sylly Mode** | OFF / ON | OFF | Distributed Network Protocol. See T8. |

**Debug Mode and Sylly Mode are mutually exclusive**, in both directions, each with its own reason
line explaining why when the other is on. Debug Mode is the sanctioned exception to "Sylly Mode is
always last" in the settings overlay — it sits immediately above the Sylly card as its exclusivity
partner, mirrored in the same order in How to Play.

**No word-difficulty tier.** Net-Trace's puzzle is entirely spatial, not lexical — there's no
`words.json` bank to have a difficulty tier over.

---

## T7 — The Player's Journey · *mixed — 7a derived, 7b paired, 7c free*

### T7a — The flow

Net-Trace has the richest branching flow in the suite — PTP, standard MDLM, and DNP each route
differently through the same core screens.

| # | Screen | Beat | Type | Duration | Chrome |
|---|--------|------|------|----------|--------|
| 1 | `screen-nt-menu` | Pick your poison | Menu | — | 🔊 |
| 2 | `screen-nt-setup` | PTP only — "Provision Admins" | Setup | — | 🔊 ✕ |
| 3 | `screen-nt-debug-config` | Debug Mode only — "Sandbox Initialisation", once per session | Setup | — | 🔊 ✕ |
| 4 | `screen-nt-authoring` | Debug Mode only — the Node Editor | Interactive | — | `[?]` 🔊 ✕ |
| 5 | `screen-nt-gate` | Boot log + readiness — cycle start, each PTP handover, and the pre-playback gather | Gate | — | 🔊 ✕ |
| 6 | `screen-nt-allocation` | DNP only — the Shared Allocation Hub | Interactive | — | `[?]` 🔊 ✕ |
| 7 | `screen-nt-build` | The Hardening Field | Interactive | — | `[?]` 🔊 ✕ |
| 8 | `screen-nt-standby` | Passive wait while others harden (MDLM) | Interstitial | — | 🔊 |
| 9 | `screen-nt-playback` | The Signal Trace Playback Panel | Interactive | — | `[?]` 🔊 ✕ |
| 10 | `screen-nt-summary` | Diagnostic Summary — per-cycle or final | Result | — | 🔊 |

`screen-nt-gate` is deliberately one screen with several contexts rather than several screens: the
same terminal-boot chrome serves the cycle-start login, every PTP pass-the-phone handover, and (in a
no-boot-log variant) the post-build gather before playback — a single screen that changes its
heading, sub-text and button label rather than three near-identical screens.

**Overlays**

| Overlay | Opened from | What it is |
|---|---|---|
| `nt-settings-overlay` | Menu | SYS.CONFIG — the six settings |
| `nt-how-to-overlay` | Menu, build `[?]`, allocation `[?]`, playback `[?]`, authoring `[?]` | How to Play |
| `nt-logs-overlay` | Summary's "// SYSTEM LOGS" | Per-cycle SER comparison, or (Debug Mode) the attempt log |
| `nt-debug-retry-overlay` | Debug Mode, after each local trace | "Trace Complete" — Run Again / Finish Testing |
| `nt-bridge-preview-overlay` | Allocation Hub's inline bridge | DNP only — the full cluster bridge, enlarged |
| `nt-quit-overlay` | Most screens' ✕ | Mid-match quit confirm |
| `nt-reboot-overlay` | Summary | Play-again confirm |

### T7b — The words on screen

#### The menu

```copy
# screen-nt-menu
Net-Trace
Out-engineer the automated breach before your system data is extracted.
Initialise System
How to Play
Settings
← Back to the Box
```

#### PTP setup

```copy
# screen-nt-setup
Provision Admins
Leave blank to use default callsigns.
Admins
Launch ▶
```

#### The Gate — boot log

The seven fixed lines print on every cycle boot; heading, sub-text and the trailing context lines
(the simulation counter and a per-context login line) vary by which of the Gate's contexts is
showing.

```copy
# screen-nt-gate — the fixed boot log
BOOTING AMAZE INC. OS v1.2…
INITIALISING OS…
CONNECTING TO CLUSTER…
ROUTING VIA PENDER SECURITIES…
SECURING INGRESS…
```

```copy
# screen-nt-gate — static shell
System Access
Cycle Initialisation Gate
Confirm ready to begin Network Hardening.
Begin Hardening ▶
Waiting for the host…
```

The heading/sub/button are rewritten per context at runtime — *"Your turn first, [Name]. Tap when
ready."* or *"Hand the phone to [Name]."* on a PTP handover; *"Preparing your team's Allocation
Hub…"* heading into DNP; *"Cycle Diagnostic Gate"* / *"All N admins done. Gather around to watch the
playback."* / *"Launch Playback ▶"* for the post-build gather.

#### The Shared Allocation Hub (DNP)

```copy
# screen-nt-allocation
SYS_PARTITION // SHARED_ALLOCATION_HUB
Pre-Planning huddle — allocate the cluster's inventory.
Lock Allocations
```

The console directive box reads *"> ALERT: CLUSTER SURPLUS UNASSIGNED."* followed by one of
*"ARM A RESOURCE, TAP A LEG TO DEPLOY IT."*, *"ALLOCATION COMMITTED."*, or *"CAPTAIN IS DEPLOYING THE
SURPLUS."* depending on role and lock state.

#### The Hardening Field

```copy
# screen-nt-build
VULNERABILITY SIMULATION
Clear All
COMMIT RUNTIME ▶
ROUTING: VALID
```

The VM-window chrome shows a live `user:\admin-N` prompt, firewall/honeypot counters, a countdown
timer, and the node's `SYS_INIT // [easter egg] // NT-NODE-NN` identifier line (see T4).

#### Sandbox Initialisation (Debug Mode)

```copy
# screen-nt-debug-config — the boot log
OPENING SANDBOX SHELL…
NO CLUSTER CONNECTION REQUIRED…
SIMULATION ISOLATED…
AWAITING OPERATOR DIMENSIONS…
```

```copy
# screen-nt-debug-config — static shell
Sandbox Initialisation
Set the matrix dimensions before authoring.
Width
Height
Anywhere from 16 to 20 on each side. They don't have to match.
Deploy Sandbox
```

#### The Node Editor (Debug Mode)

```copy
# screen-nt-authoring
NODE EDITOR — STAGING
Bad Sector
Honeypot
Ingress
Egress
Firewall Resources
Honeypot Resources
Randomise Topology
Randomise Resources
Deploy Node
```

#### The Signal Trace Playback Panel

```copy
# screen-nt-playback
TRACING SIMULATION…
Cluster Bridge · Ingress ▸ Egress
Tap anywhere to close
Continue ▶
```

#### Diagnostic Summary

```copy
# screen-nt-summary
Diagnostic Summary
[ SYS_STAT ]
System Efficiency Rating
Next Cycle ▶
Reboot System
// SYSTEM LOGS
```

#### System Logs

```copy
# nt-logs-overlay
// SYSTEM LOGS
root@amaze_inc:~# cat ./sys.log
Close
```

#### Standby

```copy
# screen-nt-standby
⏳ Waiting for the host…
```

#### Settings — SYS.CONFIG

```copy
# nt-settings-overlay — title
SYS.CONFIG ⚡
root@amaze_inc:~# ./sys.config
```

```copy
# nt-settings-overlay — Matrix Scale and Simulation Iterations
Matrix Scale
The size of each Node. Bigger grids mean more room to maze — but smaller touch targets on a phone. 20×20 is best on a larger screen.
16×16
18×18
20×20
Simulation Iterations
How many Vulnerability Simulations make up a full match.
```

```copy
# nt-settings-overlay — Hardening Window and Native Honeypots
Hardening Window
How long you get to build each Node before the layout locks.
45s
60s
90s
No Limit
Native Honeypots
The most Honeypots the system can bake into the Node itself, before you place your own.
```

```copy
# nt-settings-overlay — Debug Mode and Sylly Mode
Debug Mode
Staging Environment
Build the Node yourself instead of letting the system roll one — draw the terrain, drop the Honeypots, place the ports and set the budget. Everyone then hardens it and can re-run the trace as many times as they like.
✨ Sylly Mode
Distributed Network Protocol
Form two corporate clusters, pool your resources, and chain your Nodes into one continuous relay. A Lead Systems Engineer allocates the team's inventory; everyone builds a leg of the pipeline.
Done
```

#### How to Play

```copy
# nt-how-to-overlay — title
How to Play 💻
Build a maze so the breach signal takes the longest possible path.
```

```copy
# nt-how-to-overlay — steps and legend
Harden the Node
Controls
Tap and long-press
Symbol Legend
Winning and Scoring
System Efficiency Rating
```

```copy
# nt-how-to-overlay — Debug Mode and Sylly Mode cards
Debug Mode
Staging Environment
✨ Sylly Mode
Distributed Network Protocol
```

#### Debug retry

```copy
# nt-debug-retry-overlay
Trace Complete
Run Again
Finish Testing
```

#### Quit and reboot

```copy
# nt-quit-overlay
Terminate Session?
Your current simulation data will be wiped.
Yeah, kill it
Keep tracing
```

```copy
# nt-reboot-overlay
Reboot System?
Wipes all SER history and reseeds the cluster.
Reboot
Stay here
```

### T7c — Where the journey is thin

**◇ judgement, not spec.**

**The easter egg is genuinely invisible to a player who isn't told about it.** The hex-decoded
"maze" string in the build screen's node identifier is a nice touch, but nothing in the game
surfaces it or hints it's there — a player would need to already suspect a hex string and decode it
by hand. It's a developer's joke more than a player's discovery, which is a fine thing to have, but
worth naming as exactly that rather than as a piece of content anyone is likely to find.

**Ten screens is the most of any game in the suite, and several exist purely to serve one mode.**
`screen-nt-setup` only ever appears in PTP; `screen-nt-debug-config` and `screen-nt-authoring` only
in Debug Mode; `screen-nt-allocation` only in DNP. No player ever sees more than about seven of the
ten in a single session, but the overall inventory reads as sprawling compared with any other game's
T7a table — a fair trade for how differently PTP, standard MDLM, and DNP actually need to play, but
worth naming as the reason this document's flow table is the longest in the suite.

**The Diagnostic Summary's caption line is Debug Mode-only** (`nt-summary-caption`) — it reads
*"STAGING — scored on your best of N attempts"*, reminding a player mid-summary that Debug Mode's
score is their best local run, not their most recent one. It never shows outside Debug Mode.

---

## T8 — Debug Mode & Sylly Mode · *free*

Net-Trace ships two advanced modes, mutually exclusive with each other, that change the game in
different directions.

**Debug Mode — Staging Environment.** Instead of the system rolling a node, one analyst hand-authors
one in the **Node Editor**: drawing Bad Sectors, dropping Native Honeypots, placing the Ingress and
Egress ports, and setting everyone's Firewall/Honeypot budget. Once deployed, every player can
re-run their own trace against it **as many times as they like** — only the best-scoring attempt is
what actually gets recorded. This turns Net-Trace from a one-shot puzzle into a genuine testing loop:
build a theory about the maze, run it, see the real number, adjust, run again. **Sandbox
Initialisation** is a one-time terminal-boot screen at the start of a Debug session, setting the
node's width and height (16–20 each, independently — the only place in the game a node can be a true
rectangle rather than a square) before the Editor opens.

**✨ Sylly Mode — Distributed Network Protocol (DNP).** Two teams — corporate "clusters" — each chain
their players' Nodes into one continuous relay, leg after leg, Egress feeding the next player's
Ingress. Before hardening begins, each team's captain (the **Lead Systems Engineer**) runs a **Shared
Allocation Hub**: a team-wide surplus of Firewall Segments and Honeypots, on top of everyone's
untouchable individual base, gets deposited across the team's own legs however the captain judges
best. Scoring shifts from an individual SER to a **Cluster Ceiling** — the sum, across every matched
leg, of whichever team took longer on that leg — so a team's score is genuinely a team effort, not
an average of individual ones. The signal's speed and slowed state carry across every Bridge between
legs, so a Honeypot on leg 3 can still be paying off when the signal reaches leg 5.

**What changes in feel, not just rule.** The base game is a solitaire optimisation problem played
next to other people; DNP turns it into a genuine team negotiation before a single tile is placed —
where the surplus goes is a real strategic conversation, and a captain who spends it all on one leg
is making a visible bet the whole team lives with. Debug Mode goes the opposite direction, turning
the game from "you get one shot" into "prove your solution is actually good" — the two modes pull
Net-Trace toward opposite ends of the same puzzle.

---

## T9 — Art & Assets · *derived*

**Net-Trace has no card, dice or tile artwork** — its entire visual surface is a canvas-rendered
maze grid, drawn programmatically in emerald-on-slate terminal colours rather than through any
asset-pack render seam. There is no core art pack, no skin pack, and no How-to gallery tab, because
there is no discrete "card" for a gallery to enumerate — the maze itself, generated fresh every
cycle, is the only visual content the game has.

The Firewall/Honeypot/Native Honeypot/Bad Sector distinctions are communicated entirely through
colour and canvas glyphs (documented in How to Play's Symbol Legend), not imagery, so there is
nothing here for `docs/art-authoring-guide.md` to brief — Net-Trace sits outside that document's
scope entirely.

---

## T10 — At the Table · *derived — except the PTP judgement*

**Modes.** The suite's most flexible game on this axis — **both Pass-the-Phone and multi-device are
fully supported**, one of only a handful of games below the game-9 cliff where every later game
went MDLM-only. PTP is automatically locked out the moment DNP/Sylly Mode is switched on, since DNP
structurally requires two teams.

**Players.** 2 to 8 in standard/PTP; DNP requires a minimum of 4 (two teams of two).

**Devices.** One per player in MDLM; a single shared device walking through `screen-nt-gate`'s
pass-the-phone handover in PTP. Hardening happens locally on whichever device is live and isn't
broadcast until it's submitted — so even in PTP, no other player sees your maze while you're
building it.

**Shape-changing settings.** Sylly Mode, structurally — turning on DNP changes the whole session from
independent solo puzzles to a team relay with a shared allocation phase, the single biggest
structural shift any setting produces anywhere in the suite.

**How it plays at each size**

| Players | What it feels like |
|---|---|
| **1–2 (PTP)** | A pure, quiet puzzle loop — hand the phone back and forth, compare traces at the end. |
| **3–5 (MDLM)** | The comparison panel starts to matter — watching several traces stack up against each other is most of the fun once there's a real field. |
| **6–8, or DNP** | Either a big leaderboard spread across a full room, or (DNP) two genuine teams coordinating a shared budget before anyone places a tile. |

**Could it be Pass-the-Phone?** — ◇ *judgement, not spec*

**It already is, and does it well — this line is really about DNP's boundary, not the base game's.**
Standard Net-Trace has run PTP since launch, using the Gate screen's pass-the-phone handover exactly
as intended. DNP is the one shape that genuinely can't follow it there: a Shared Allocation Hub run
by a captain who has to see the whole team's live surplus, and legs that chain together across
different players' devices, both assume simultaneous multi-device presence in a way no amount of
phone-passing can reproduce. So the honest answer is split by mode, not uniform across the game.

---
