# Pass

**Game 12** · `activeGameId: pass` · plugin `js/games/pass.js`
**Emoji:** 🃏 · **Brand:** zinc-900 · **Players:** 3–6 · **Modes:** MDLM only
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

Everyone starts with a hand and one job: get rid of it first. Play a combo one rank higher than
whatever's on the table, or pass and wait for your shot. It's a climbing game in the Gan Deng Yan /
Big Two family — no bidding, no trump suit to memorise, just a hand of cards and a table you're
racing to beat. The rules fit on one card; the tension is entirely in reading who's about to Bomb
you out of a comfortable lead. It plays fast, scales cleanly from three players to six, and rewards
the same instinct every version of this game family has always rewarded: know when to hold a card
back, and know when spending it now is worth more than saving it.

---

## T2 — The Premise · *free*

You're holding a hand nobody else can see, and the only way to win is to empty it before anyone
else empties theirs. Someone opens with a combo — a pair, say — and now it's your job to beat it
with a *higher* pair, or pass and hope someone else can. The table keeps climbing until everyone
runs out of answers and it clears, and whoever cleared it last gets to open again with a clean
slate.

The real game is in what you hold back. Playing your Triplets early clears your hand fast but tips
your hand — literally — about what you don't have left. Sitting on a Bomb too long risks never
getting the chance to use it. And because chips are lost by whoever's still holding cards when
someone else goes out, being one card behind at the wrong moment is expensive in a way that being
five cards behind early never is.

What it produces at the table is the particular tension of watching someone's hand shrink faster
than yours, the small triumph of a well-timed pass that forces a bad play out of someone else, and
the loud groan when a Double Joker shows up to overturn a table everyone thought was settled.

---

## T3 — How to Play · *free*

**Setup.** Every player is dealt a hand from a shared deck. Seat order follows join order — no
shuffle, no hidden roles, so it stays fair and predictable. A match runs across several rounds; the
first round's leader is whoever holds the **3♦**, the single lowest card in the deck.

**The loop.** On your turn, either:

- **Play a combo** — a Single, Pair, Triplet, Quad, Sequence, or Double Sequence, exactly one rank
  higher than whatever's currently on the table (or any type-matched higher combo, if **Open
  Climbing Mode** is on).
- **Pass** — sit this trick out and wait for it to come back around.

A **Bomb** — a Triplet, Quad, or Double Joker — overrides rank entirely and beats any non-Bomb
combo outright, whatever's currently on the table.

**Clearing the table.** If every other player passes in a full circuit, the table clears and
whoever played last leads again with a clean slate.

**How a round ends.** The moment a player plays their very last card, they win the round. Everyone
else pays chips based on how far behind they were: holding 13 or more cards costs 3× your card
count; never having played a single card costs 2×; having played at least once costs 1×. The
winner collects everyone else's penalties.

**How it ends.** The match runs for a set number of rounds (or endlessly, until someone hits zero
chips) — whoever has the most chips at the end wins.

---

## T4 — Theme & Flavour · *free*

**The world.** Pass has almost no fiction layered over it — it's a straight, confident card game,
and its personality comes entirely from its own vocabulary rather than a theme. "The Abyss" is the
one genuinely thematic flourish, reserved for Sylly Mode.

**The voice** is terse and functional — *Deal Me In*, *Walk Away?*, *New Deal?* — the language of a
real card table rather than a story. Where other games in the suite lean on a costume, Pass leans on
being unmistakably, confidently a card game.

**Australian English throughout**, as everywhere in the suite — colour, not color; metric where
anything is measured at all.

**On theme:** a genuine deck of cards, rendered through the suite's own `Cards` module rather than a
themed skin — Pass was the first game to introduce that shared rendering library, and its restraint
(no fruit, no gems, no animals standing in for suits) is deliberate.

**Off theme:** inventing lore, mascots, or narrative framing this game was never built to carry.
Pass's whole appeal is that it's exactly what it says on the box.

---

## T5 — Terminology · *paired*

| Term | Meaning |
|------|---------|
| **Combo** | A valid group of cards played together — Single, Pair, Triplet, Quad, Sequence, or Double Sequence. |
| **The Table** | The current combo everyone must beat. |
| **Bomb** | A Triplet, Quad, or Double Joker — overrides rank and beats any non-Bomb combo. |
| **Sequence** | A run of consecutive ranks (2s excluded). |
| **Double Sequence** | Consecutive pairs of ranks (2s excluded). |
| **Standard Combo** | A Single or Pair — keeps a trick quiet, never detonates the Abyss even on a winning play. |
| **Detonation Combo** | A Triplet, Quad, Double Joker, Sequence, or Double Sequence — the only combos that detonate the Abyss. |
| **The Abyss** | Sylly Mode's face-up central pool — see T8. |
| **Detonation** | Sylly Mode — when a trick is won by a Detonation Combo, the Abyss deals clockwise to everyone but the winner. |
| **Fracture** | Sylly Mode — the Abyss reaching 13 cards; everyone draws. |
| **New Deal** | Play-again heading — resets chip stacks, keeps names and settings. |
| **Walk Away** | Quit-mid-match heading. |
| **The House Rules 🃏** | Settings overlay title. |

---

## T6 — Settings · *mixed — labels paired, values derived*

The settings overlay is titled **The House Rules 🃏** — *"Customise the deal before you sit down."*

| Setting | Options | Default | What it does in play |
|---|---|---|---|
| **Starting Hand** | 5 / 6 / 7 | 5 | Cards dealt to each player at the start of each round. |
| **Chip Stack** | 50 / 100 / 150 | 100 | Starting chips per player — lose chips when caught holding cards. |
| **Match Length** | 5 / 10 / Endless | 5 | How many rounds — Endless plays until someone hits zero chips. |
| **Bomb Rules** | Standard / Heavy | Standard | Standard: Triplets, Quads and Double Joker are all Bombs. Heavy: only Quads and Double Joker detonate. |
| **Minimum Sequence** | 3 / 4 / 5 | 3 | Fewest consecutive ranks allowed in a Sequence or Double Sequence. |
| **Jokers** | None / 2 / 4 | 2 | Jokers act as wild cards; Double Joker is the strongest Bomb. |
| **Mid-Game Draw** | OFF / ON | OFF | On a full-circuit pass, the trick winner deals one card from the deck to each player clockwise. |
| **Sky Joker** | OFF / ON | OFF | A solo Joker can lead or beat any single card, not just play as your very last card. |
| **Open Climbing Mode** | OFF / ON | OFF | Play any higher card of the same combo type, instead of exactly +1. |
| **✨ Sylly Mode** | OFF / ON | OFF | The Abyss. See T8. |

**No word-difficulty tier.** Pass uses a standard deck, not a `words.json` bank — there's no
equivalent difficulty tier to set.

---

## T7 — The Player's Journey · *mixed — 7a derived, 7b paired, 7c free*

### T7a — The flow

| # | Screen | Beat | Type | Duration | Chrome |
|---|--------|------|------|----------|--------|
| 1 | `screen-pass-menu` | Pick your poison | Menu | — | 🔊 |
| 2 | `screen-pass-seating` | Seat order confirm (host only) | Setup | — | 🔊 |
| 3 | `screen-pass-intro` | "Round N of M" — fresh deck, fresh hands | Interstitial | 5 s | none |
| 4 | `screen-pass-table` | Play, pass, watch the table climb | Interactive | — | `[?]` 🔊 ✕ |
| 5 | `screen-pass-round-wrap` | Who won, the chip deltas | Interactive | — | 🔊 |
| 6 | `screen-pass-gameover` | Final standings | Result | — | 🔊 |

`screen-pass-seating` is **host-only** — clients skip straight to waiting for the deal. There is
**no pass-gate** — MDLM, every player on their own device.

The Round Intro carries no chrome at all — auto-advancing and nothing to tap, the two conditions of
the interstitial exemption. 5 seconds is the ceiling this suite treats as safe, not a target.

**Two known thin spots — see T7c**: neither the seating screen nor the round-wrap screen carries a
✕ exit.

**Overlays**

| Overlay | Opened from | What it is |
|---|---|---|
| `pass-settings-overlay` | Menu | The House Rules — the ten settings |
| `pass-how-to-overlay` | Menu, table `[?]` | How to Play |
| `pass-history-overlay` | Table's log icon | The Table Log — trick-by-trick history this round |
| `pass-quit-overlay` | Table ✕ | Mid-round quit confirm |
| `pass-new-deal-overlay` | Gameover | Play-again confirm |

### T7b — The words on screen

#### The menu

```copy
# screen-pass-menu
Pass
Shed your hand, climb the table.
Deal Me In
How to Play
Settings
← Back to the Box
```

#### Seating

```copy
# screen-pass-seating
The Table 🃏
Seat order follows join order. Host deals first.
Deal the Cards
```

#### Round intro

Heading is built at runtime as *"Round N of M"*. The flavour line is picked at random from a
four-line pool, host-picked and synced so every device shows the same line.

```copy
# screen-pass-intro
Fresh deck, fresh hands. Nobody has an edge yet.
New deal — watch who leads and what they open with.
Everyone starts even. The climb begins now.
New hands all round. The table remembers nothing.
The Abyss is active — a Detonation Combo deals it straight to everyone else.
```

#### The table

```copy
# screen-pass-table — labels and controls
The Abyss
Pass
Play Selected
```

The turn-status line reads *"Your turn — select cards to play."* or *"Waiting for [Name]"* at
runtime.

#### Round wrap

```copy
# screen-pass-round-wrap
Waiting for the host...
Next Round →
```

#### Gameover

```copy
# screen-pass-gameover
New Deal?
```

#### Settings — The House Rules

```copy
# pass-settings-overlay — title
The House Rules 🃏
Customise the deal before you sit down.
```

```copy
# pass-settings-overlay — Starting Hand, Chip Stack, Match Length
Starting Hand
Cards dealt to each player at the start of each round.
Chip Stack
Starting chips per player. Lose chips when you're caught holding cards.
Match Length
Number of rounds. Endless keeps going until someone hits zero chips.
5 Rounds
10 Rounds
Endless
```

```copy
# pass-settings-overlay — Bomb Rules, Minimum Sequence, Jokers
Bomb Rules
Standard: Triplets, Quads, and Double Joker are all Bombs. Heavy: only Quads and Double Joker detonate.
Standard
Heavy
Minimum Sequence
Fewest consecutive ranks allowed in a straight or double straight.
Jokers
Jokers act as wild cards in combos. Double Joker = the strongest Bomb.
None
2 Jokers
4 Jokers
```

```copy
# pass-settings-overlay — Mid-Game Draw, Sky Joker, Open Climbing
Mid-Game Draw
When a full circuit passes without a play, the trick winner deals one card from the deck to each player clockwise.
Sky Joker
A solo Joker can lead or beat any single card — not just as your last card.
Open Climbing Mode
Play any higher card of the same combination type instead of advancing by exactly +1.
```

```copy
# pass-settings-overlay — Sylly Mode
✨ Sylly Mode
The Abyss
Every pass feeds a face-up central pool — The Abyss. Win a trick with a Detonation Combo (Triplet, Quad, Double Joker, Sequence or Double Sequence) and the Abyss detonates: its cards deal clockwise to everyone but the winner. Singles and Pairs stay quiet. Hit 13 cards and it fractures — everyone draws.
Done
```

#### How to Play

```copy
# pass-how-to-overlay — title
How to Play 🃏
A climbing card game — shed your hand faster than everyone else.
```

```copy
# pass-how-to-overlay — steps
Deal and sort
Lowest card leads first
Play a combo or pass
Clear the table
Empty your hand to win
Winning and Scoring
Chips decide the match
```

```copy
# pass-how-to-overlay — Sylly Mode card
The Abyss
```

#### The Table Log

```copy
# pass-history-overlay
The Table Log 📋
Trick-by-trick history this round.
```

#### Quit and confirms

```copy
# pass-quit-overlay
Walk Away?
The hand ends here. Chip totals are not saved.
Yeah, fold.
Keep playing
```

```copy
# pass-new-deal-overlay
New Deal?
Chip stacks reset. Names and settings are kept.
Stay here
```

### T7c — Where the journey is thin

**◇ judgement, not spec.**

**Two screens have no exit.** `screen-pass-seating` and `screen-pass-round-wrap` carry only the
speaker icon — no ✕, no quit trigger. A non-host client stuck on "Waiting for the host…" at either
of those points has no way to leave the session on their own. Every other screen in the game follows
the suite's speaker-plus-✕ rule; these two are a known, tracked gap.

**Pass has no dedicated card-family reference.** Unlike Pecking Order's Animals tab, Counting
Sheep's Cards tab, or Flawless's Gems tab, Pass has no How to Play gallery tab enumerating combo
types or Bomb rules visually — the rules are explained in prose only. This is arguably correct for a
game using a standard 52-card deck (there's no custom card set to catalogue), but it does mean Pass
is the one card-rendering game in the suite with no reference surface of its own.

**The Abyss is the game's one thematic flourish, and it's confined entirely to Sylly Mode.** The
base game's vocabulary — Combo, Bomb, Sequence — is functional rather than voiced; "The Abyss" is
the only piece of Pass that sounds like it belongs to a specific game rather than card-game
terminology in general.

---

## T8 — Sylly Mode · *free*

**The Abyss.** A face-up central pool that grows every time someone passes — one card feeds into it
per pass. It sits quietly on the table, visible to everyone, until one of three things happens:

- **Detonation** — a trick is won by a **Detonation Combo** (Triplet, Quad, Double Joker, Sequence,
  or Double Sequence). The Abyss deals its cards out clockwise to everyone *except* the trick
  winner. A **Standard Combo** (Single or Pair) winning the same trick leaves the pool untouched —
  even if it empties the winner's hand and ends the round outright.
- **Fracture** — the Abyss reaches 13 cards. Everyone draws one, no exemptions, whatever combo class
  triggered it.

**What changes in feel, not just rule.** The base game rewards emptying your hand efficiently; The
Abyss adds a second, growing threat that punishes big, decisive plays — winning a trick with a Bomb
feels great right up until the moment it detonates a pool of cards onto everyone else's hands, which
can just as easily be a gift to your opponents as a triumph for you. It rewards reading not just the
table, but how full the pool has gotten and who's about to be exempt from its next blast.

---

## T9 — Art & Assets · *derived*

**Pass renders a genuine deck of cards, not a themed asset set.** It's the first game in the suite
to use the shared `Cards` module (`js/lib/cards.js`) — `Cards.buildEl({ rank, suit, deckIdx })` for a
face and `Cards.buildBackEl(deckIdx)` for a back — rather than a per-game render seam. There is no
core art pack and no skin pack for Pass: a standard deck of cards doesn't need reskinning the way a
fruit or a gem does, and no How to Play gallery tab exists because there's no discrete custom card
set to enumerate (see T7c).

---

## T10 — At the Table · *derived — except the PTP judgement*

**Modes.** Multi-device only. Every player uses their own phone; one person hosts and the rest join
with a room code. There is no pass-the-phone or shared-device option.

**Players.** 3 to 6.

**Devices.** One per player, no exceptions — every hand is private, held only on its owner's own
device.

**Shape-changing settings.** None. No setting alters player count or session structure.

**How it plays at each size**

| Players | What it feels like |
|---|---|
| **3** | Fast and sharp — with fewer hands in play, reading who's close to emptying out is much easier, and a single Bomb can decide a round outright. |
| **4–5** | The comfortable middle — enough players that a full-circuit pass genuinely means something, and enough hands in play that a Sequence stays a real threat rather than an obvious tell. |
| **6** | The most crowded table — longer rounds, more chances for the Abyss to grow large before it detonates, and more players left holding cards when someone finally goes out. |

**Could it be Pass-the-Phone?** — ◇ *judgement, not spec*

**No — structurally the same reason as most of the suite's card games.** Every player's hand has to
stay hidden from everyone else at the table simultaneously, and a shared phone means whoever's
turn it isn't is watching the active player choose their cards. Pass has no bluffing mechanic that
would make a shared reveal interesting the way Flawless's does — it would simply break the game's
core information asymmetry with nothing gained in exchange.

---
