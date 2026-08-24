# The Bluff

**Game 10** · `activeGameId: dyb` · plugin `js/games/dyb.js`
**Emoji:** 🎲 · **Brand:** ocean blue `#1E4D8C` · **Players:** 3–8 · **Modes:** MDLM only
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

Everyone shakes a private hand of dice, and then the table starts making claims about what's out
there — "at least four dice show a 3," someone says, and now you have to decide: do you believe
them, or is now the moment to call it? It's Liar's Dice, played completely straight, where the only
information you ever get is your own hand and the shrinking pile of confidence in everyone else's
claims. Every round escalates until somebody either can't or won't climb any higher and calls the
bluff — and then everyone's dice hit the table at once. No hidden powers, no theme layered over the
mechanic; just the purest possible test of nerve and arithmetic this suite has.

---

## T2 — The Premise · *free*

You shake your dice in private, and from that moment on you're the only person at the table who
knows what you're actually holding. Someone opens with a claim about the whole table — a face and a
quantity — and now every other player has one job: climb higher with a bolder claim of their own, or
call the bluff and force a reveal. The claim can never shrink, only grow, which means every round is
a one-way ratchet toward someone eventually being wrong.

The whole game is a bet on how confident someone else's confidence actually is. A player who climbs
fast and hard might genuinely be holding the dice to back it up — or might be counting on everyone
else flinching first. The moment someone calls, every hand on the table flips at once, and the gap
between the claim and the real count decides who loses a die.

What it produces is the specific tension of watching someone's face while they make a claim you
can't verify, the small triumph of a well-timed call, and the total table-wide reveal that turns
every private guess into a public verdict in one motion.

---

## T3 — How to Play · *free*

**Setup.** Every player starts with a private hand of dice — five each by default. A game runs
across several **Shakes**; a player is eliminated once they run out of dice, and the last player
standing reaches **The Summit**.

**The Shake.** Every player rolls their hand privately at the same time. Nobody sees anyone else's
dice — not even at this point.

**The Claim.** The Shake's opener makes a claim about the *entire table*: "at least X dice show face
Y exist across everyone's hands combined." That's **The Claim**, and it can never shrink from here.

**Climb or challenge.** On your turn, you must either:

- **Climb Higher** — make a bolder claim: a higher quantity of any face, or the same quantity of a
  higher face.
- **Call the Bluff** — refuse to climb, forcing **The Overlook**: every hand on the table is revealed
  at once, and the real count of the claimed face is tallied.

**The Overlook.** If the real count is *below* the claim, the claimant loses a die. If it's at or
above the claim, the challenger loses a die. Either way, the loser of that die opens the next Shake.

**How it ends.** Lose your last die and you're eliminated, watching the rest of the game from **The
Depths**. The last player still holding dice wins — they've reached **The Summit**.

---

## T4 — Theme & Flavour · *free*

**The world.** A mountain climb, mapped directly onto Liar's Dice's escalation structure — every bid
is a step higher, every challenge is a doubt about whether someone can actually hold their footing,
and losing is *the plunge*. The metaphor was chosen deliberately for the double meaning of the
game's own title: a bluff is both a lie and a sea-cliff.

**The voice** leans fully into the climbing register: *Climb Higher*, *The Overlook*, *The Ascent*
(the bid history), *The Depths* (elimination), *The Summit* (victory), *Back Down?* (quitting). There
is no other layer of fiction — the geography metaphor carries the entire theme by itself.

**Australian English throughout**, as everywhere in the suite — colour, not color; metric where
anything is measured at all.

**On theme:** ocean blue as the brand colour, dice that read as genuinely tactile objects rather than
decoration, and copy that never breaks from the climbing/cliff-edge framing even in small UI labels.

**Off theme:** anything that undercuts the tension with a joke, or complicates the theme with a
second metaphor layered on top. The Bluff's whole appeal is the purity of its mechanic; the flavour
exists to dress that mechanic, not to compete with it.

---

## T5 — Terminology · *paired*

*Display terms below — the internal `dyb` code prefix and every code identifier (variables, packet
names, screen IDs) predate the rename to "The Bluff" and are unaffected by it.*

| Term | Meaning |
|------|---------|
| **Shake** | One full round of rolling, claiming, and The Overlook. |
| **The Claim** | The active player's claim about how many of a face exist across every hand at the table. |
| **Call the Bluff** | Challenge the previous Claim — triggers The Overlook. |
| **Climb Higher** | Escalate — bid a higher quantity of any face, or the same quantity of a higher face. |
| **The Overlook** | All hands revealed at once; real count vs. claimed count decides the loser. |
| **The Ascent** | The full bid history for the current Shake. |
| **The Tempest** | Sylly Mode — see T8. |
| **Slick Die** | One of the five Tempest die types — its face is privately assigned by its owner, opaque to everyone else. |
| **Classic Wildcards** | 1s count toward any bid. |
| **Strict (No Wilds)** | 1s are just 1s — no wild behaviour. |
| **Volatile Wilds** | 1s are wild until someone bids 1s directly — then they stop being wild for the rest of the Shake. |
| **Footholds** | An alternate lives system — see T6. |
| **The Depths** | The eliminated player's passive spectator screen. |
| **The Summit** | The win state — the last player with dice (or footholds) remaining. |
| **Climb Again?** | Play-again overlay heading. |
| **Back Down?** | Quit confirm overlay heading. |
| **Ground Rules 📋** | Settings overlay title. |

---

## T6 — Settings · *mixed — labels paired, values derived*

The settings overlay is titled **Ground Rules 📋** — *"Set the ground rules before the first
climb."*

| Setting | Options | Default | What it does in play |
|---|---|---|---|
| **Wildcards Style** | Strict Numbers / Classic Wilds / Volatile Wilds | Classic Wilds | How the 1-face behaves during active Claims. |
| **Starting Dice** | 3 / 4 / 5 | 5 | How many dice each player starts with. |
| **Footholds** | OFF / ON, with 3 / 5 / 10 sub-option | OFF, 5 | Lose a foothold instead of a die when you fall — dice stay fixed at the starting count all game; only footholds count down. |
| **✨ Sylly Mode** | OFF / ON | OFF | The Tempest. See T8. |

**Footholds decouples elimination from your hand size.** With it on, you always roll the same number
of dice every Shake regardless of how many losses you've taken — the pip row switches to a ◆ symbol
and the loss language switches to "loses a foothold" instead of "loses a die," but the win condition
is otherwise identical: run out (of footholds, this time) and you're eliminated.

**No word-difficulty tier.** The Bluff runs off plain dice, not a `words.json` bank — Starting Dice
is the game's velocity dial instead.

---

## T7 — The Player's Journey · *mixed — 7a derived, 7b paired, 7c free*

### T7a — The flow

| # | Screen | Beat | Type | Duration | Chrome |
|---|--------|------|------|----------|--------|
| 1 | `screen-dyb-menu` | Pick your poison | Menu | — | 🔊 |
| 2 | `screen-dyb-seating` | Host-only roster confirm before the deal | Setup | — | 🔊 ✕ |
| 3 | `screen-dyb-shake` | Tap the cup — "Shake #N", roll privately | Interactive | — | `[?]` 🔊 ✕ |
| 4 | `screen-dyb-table` | Claims escalate, Call the Bluff ends the Shake | Interactive | — | `[?]` 🔊 ✕ |
| 5 | `screen-dyb-spirit-board` | Eliminated players' passive spectator view — "THE DEPTHS 🌊" | Interstitial | — | 🔊 ✕ |
| 6 | `screen-dyb-showdown` | "THE OVERLOOK" — animated reveal and verdict | Interactive | — | 🔊 ✕ |
| 7 | `screen-dyb-gameover` | "The Summit 🎲" — final standings + Post-Climb Chronicle | Result | — | 🔊 ✕ |

There is **no Round Intro screen**, and this is deliberate rather than a gap — `screen-dyb-shake`
already opens every Shake with "Shake #N" and the opener named, and it's the actual tap-to-roll
interaction rather than a passive beat, so a separate interstitial in front of it would only delay
the player from reaching the thing that already announces the round.

**Overlays**

| Overlay | Opened from | What it is |
|---|---|---|
| `dyb-settings-overlay` | Menu | Ground Rules — the four settings |
| `dyb-how-to-overlay` | Menu, shake `[?]`, table `[?]` | How to Play — two tabs: The Rules, The Dice |
| `dyb-ascent-overlay` | Table's "The Ascent" strip | The full bid history for the current Shake |
| `dyb-slick-picker-overlay` | Table, when holding a Slick die (Sylly Mode) | Assign the Slick die's face |
| `dyb-tip-overlay` | Shake/table's inline `[?]` buttons | Shared contextual tips |
| `dyb-quit-overlay` | Most screens' ✕ | Mid-game quit confirm |
| `dyb-new-game-overlay` | Gameover | Play-again confirm |

### T7b — The words on screen

#### The menu

```copy
# screen-dyb-menu
The Bluff
Trust no one, count every face.
Let's Play!
How to Play
Settings
← Back to the Box
```

#### Seating

```copy
# screen-dyb-seating
The Bluff
Take Your Position
Positions for this climb.
Deal the Dice
Waiting for host to deal the seats…
```

#### The Shake

```copy
# screen-dyb-shake
Tap to shake 'em up
Ready!
Waiting for others…
```

#### The table

```copy
# screen-dyb-table
The Claim
No claim yet.
The Ascent
Your Hand
Call the Bluff
Climb Higher
```

#### The Overlook (showdown)

```copy
# screen-dyb-showdown
Reaching the Edge
THE OVERLOOK
Next Shake →
Waiting for host…
```

#### The Depths (spirit board)

```copy
# screen-dyb-spirit-board
THE DEPTHS 🌊
No claim yet.
You can see everyone's dice. Those still climbing cannot.
```

#### The Summit (gameover)

```copy
# screen-dyb-gameover
The Summit 🎲
Post-Climb Chronicle
Climb Again?
```

#### The Slick picker

```copy
# dyb-slick-picker-overlay
Assign this die's face
Cancel
```

#### The Ascent overlay

```copy
# dyb-ascent-overlay
The Ascent
Full bid history this Shake
```

#### Settings — Ground Rules

```copy
# dyb-settings-overlay — title
Ground Rules 📋
Set the ground rules before the first climb.
```

```copy
# dyb-settings-overlay — Wildcards Style and Starting Dice
Wildcards Style
How the 1-face behaves during active Claims.
Strict Numbers
Classic Wilds
Volatile Wilds
1s count toward any face. Can't be directly alleged.
Starting Dice
How many dice each player starts with.
3 Dice
4 Dice
5 Dice
```

```copy
# dyb-settings-overlay — Footholds
Footholds
Lose a foothold instead of a die when you fall. Dice stay fixed — only footholds count down.
```

```copy
# dyb-settings-overlay — Sylly Mode
✨ Sylly Mode
The Tempest
Each die has a chance to be secretly modified — loaded, phantom, cracked, slick, or a snake.
Chaos level
Done
```

#### How to Play

```copy
# dyb-how-to-overlay — title and tabs
How to Play 🎲
A bluffing game where every claim must be worth believing.
The Rules
The Dice
```

```copy
# dyb-how-to-overlay — steps
The Shake
The Claim
Climb or Challenge
Winning and Scoring
Last Die Standing
```

```copy
# dyb-how-to-overlay — Sylly Mode card
The Tempest
```

#### Quit and confirms

```copy
# dyb-quit-overlay
Back Down?
Your dice go with you. The climb carries on without you.
Yeah, I'm out.
Keep bluffing!
```

```copy
# dyb-new-game-overlay
Climb Again?
New positions, fresh dice, same room code.
Climb Again
Stay here
```

### T7c — Where the journey is thin

**◇ judgement, not spec.**

**The Tempest's five die types are deliberately absent from the How to Play gallery** — a genuine
design choice, not an oversight. A special die's identity is carried by the engine frame plus its
live per-die state (an unassigned Slick shows the auto-rolled face you're about to reassign), which a
static gallery tile would misrepresent. It means the gallery tab (The Dice) only ever shows the six
plain faces and the cup back, so a player relying on it alone to learn the Tempest has to fall back
on the prose description in How to Play and Settings instead.

**Phantom dice were promised a reveal the game doesn't currently deliver.** The How to Play copy for
Sylly Mode says Phantom dice "hide their face until The Overlook" — but the "?" glyph currently
persists through the showdown reveal rather than resolving to the real rolled value, a known gap
flagged in the game's own bug index. A player reading the how-to card and then watching a Phantom
die stay hidden at the moment it's supposed to reveal is being told something the UI doesn't yet do.

**Footholds is a real, shipped setting that never made it into this document until this pass.** It
sat in `docs/rules/game-identities.md`'s Settings table as though it didn't exist — added to the game
well after that section was last touched, and never backfilled. Worth flagging as the exact failure
mode the identity-doc migration exists to catch: a setting shipped and playable, invisible to anyone
reading the old reference.

---

## T8 — Sylly Mode · *free*

**The Tempest.** Every die, on every roll, has a small cumulative chance of becoming one of five
special types instead of a plain die:

- **Loaded** — counts as **double** toward its face value.
- **Phantom** — its face is hidden from its own owner, and counts at its real rolled value regardless
  (see T7c for the reveal gap).
- **Slick** — has no fixed face at all; its owner privately assigns it any face they choose, and it
  counts only toward that chosen face. The assignment stays private until The Overlook.
- **Cracked** — always counts as **zero**, whatever it actually rolled.
- **Snake (Snake Eyes)** — counts as **−1** toward its face value, actively working against whatever
  claim it's counted in.

**Chaos level** sets how likely any single die is to become special — a slider from 5% to 10% per
die, per type, so at the top of the range roughly half a hand can be running special rules at once.

**What changes in feel, not just rule.** The base game is pure arithmetic on hidden but honest dice;
The Tempest makes the dice themselves untrustworthy even to their own owner. A Slick die means your
own hand has a genuine strategic choice buried in it, not just a number to report; a Phantom means
you're bluffing about a face you can't even see yourself. It rewards a different kind of confidence —
not just "am I reading the table right," but "do I actually know what I'm holding."

---

## T9 — Art & Assets · *derived*

**The Bluff has no core art pack** — its dice render through CSS pips (`dybDieHTML`), and while the
render seam is asset-pack-ready (`js/lib/art.js` resolution is wired), no default artwork has shipped
for it yet. The How to Play → **The Dice** gallery tab already renders the six plain faces and the
cup back through the live `dybDieHTML`/`dybDieBackHTML` seam, ready for the day core art arrives —
the gallery itself needs no changes when that happens.

**The five Tempest special-die types are skinnable in principle** via an asset manifest's optional
`specials` block, with a `"frame": false` opt-out per type — but, as T7c notes, they're deliberately
excluded from the static gallery regardless of whether art exists for them, because their identity
depends on live per-die state a static tile can't represent.

---

## T10 — At the Table · *derived — except the PTP judgement*

**Modes.** Multi-device only. Every player uses their own phone; one person hosts and the rest join
with a room code. There is no pass-the-phone or shared-device option.

**Players.** 3 to 8.

**Devices.** One per player, no exceptions — every hand is private and never broadcast until The
Overlook, when the host collects all rolls and reveals them together.

**Shape-changing settings.** None. No setting alters player count or session structure — Footholds
changes what runs out when you lose, not how many people are playing.

**How it plays at each size**

| Players | What it feels like |
|---|---|
| **3** | Sharp and fast — fewer hands means the real count is easier to estimate, and a call lands or misses quickly. |
| **4–6** | The comfortable middle — enough dice in play that a bold claim is genuinely hard to verify by feel alone. |
| **7–8** | The largest tables — claims routinely climb high before anyone calls, and The Depths fills up with spectators who can see everything the climbers can't. |

**Could it be Pass-the-Phone?** — ◇ *judgement, not spec*

**No — the same structural reason as the suite's other hidden-hand games.** Every roll has to stay
private until The Overlook, and a shared device means whoever's turn it isn't is watching the active
player roll and claim. Liar's Dice has no equivalent of a bluffing "tell" that a shared reveal could
make interesting the way a face-to-face game relies on — digitally, the hidden roll is the entire
mechanic, and PTP would either force it to be shown or force players to look away, neither of which
serves the game.

---
