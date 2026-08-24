# Fruit Salad

**Game 14** · `activeGameId: frt` · plugin `js/games/frt.js`
**Emoji:** 🍌 · **Brand:** electric lemon `#FFE500`, dark ink · **Players:** 2–8 · **Modes:** MDLM only
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

You slide a face-down card to someone and say a fruit name. It might be true. On your turn, that's
the entire decision: pick a card, pick a target, pick a claim — and everyone at the table watches
their face while you say it. It's Cockroach Poker in fruit-bowl clothing, one of the fastest,
purest bluffing games there is, and it needs nothing but a straight face and eight or fewer
fruits-worth of nerve. A round is over in minutes, it scales from a tense head-to-head duel all
the way up to a full eight-player table, and the entire rulebook fits in the time it takes to deal.

---

## T2 — The Premise · *free*

Someone slides you a card, face-down, and tells you what it is. You have three choices: believe
them, call their bluff, or sneak a peek and pass the problem — plus whatever you now know — on to
somebody else. Nobody has to be honest. Nobody has to be believed. The only cost of being wrong is
the card landing face-up in your own Fruit Bowl, and the only way to lose is to let four of the same
fruit pile up there.

The tension is entirely in the gap between what someone says and what they're actually holding.
A confident declaration reads as truth right up until it doesn't. A hesitant one gets called on
reflex. And because the loser of every challenge serves next, the pressure never sits still — it
just moves to whoever collected the card.

What it produces at the table is a lot of exaggerated conviction over an obvious lie, the specific
satisfaction of calling a bluff correctly, and — because someone always eventually gets caught
holding four bananas — a fair amount of good-natured groaning.

---

## T3 — How to Play · *free*

**Setup.** Every player is dealt a private **Fruit Stash**. A session runs across several
**Fruit-Offs**, each a fresh deal; the first player to the most Fruit Tokens across all of them
wins.

**The loop.** On your turn, slide one card face-down to another player and **declare a fruit** —
true or a bald-faced lie. The receiver has three options:

- **Call True** — you believe the declaration.
- **Call False** — you think they're bluffing.
- **Peek & Pass** — secretly look at the real card, then slide it on to someone who hasn't handled
  it yet, with a fresh declaration of your own.

When someone finally calls, the card flips. Guess wrong, or get caught in a lie, and the card lands
face-up in **your** Fruit Bowl — whoever just collected it serves next.

**Fruit Looped.** Collect four of the same fruit in your Bowl (five in a two-player duel), or run
out of cards to serve, and you're **Fruit Looped** — out for the rest of this Fruit-Off.

**How a Fruit-Off ends.** It ends the moment only one player still has cards left to serve — the
round is over and tokens are awarded.

**Scoring.** Fruit Looped earns nothing that round; surviving with at least one Bowl card earns
+5 Fruit Tokens; surviving with an **empty** Bowl — a Pristine escape — earns +10. At the very end
of the session, whoever made the most correct True/False calls across every Fruit-Off earns a
bonus **Silver Lining** (+2), and can be crowned Fruit Master for it in the how-to copy.

---

## T4 — Theme & Flavour · *free*

**The world.** A kitchen-table fruit bowl taken completely at face value — every card is a real
fruit, every claim is about that fruit, and the entire drama is whether anyone believes you. It's
deliberately the lightest-weight theme in the suite: there's no fiction to track, just fruit and
faces.

**The voice** leans on food-adjacent wordplay throughout — *Fruit-Off*, *Fruit Looped*, *Fruit
Salad*, *Vegetables Instead?* on the quit prompt, *Orange You Glad It's Over?* on the gameover
screen. It's playful and a little corny on purpose; the pun density is part of the game's personality,
not incidental to it.

**Australian English throughout**, as everywhere in the suite — colour, not color; metric where
anything is measured at all.

**On theme:** bright, saturated fruit — the brand colour is a genuine electric lemon, not a muted
pastel, and the card art is meant to look like produce you'd actually reach for. Every fruit in
Sylly Mode gets a one-line "personality" that plays its real-world character for a joke (a smug
banana, a sour lemon, a dramatic grape).

**Off theme:** anything that treats the bluffing as genuinely deceptive or unkind — a caught lie is
a laugh, not a callout. Nothing about Fruit Salad should ever feel tense in a bad way.

---

## T5 — Terminology · *paired*

| Term | Meaning |
|------|---------|
| **Fruit Salad** | The overall game. |
| **Fruit-Off** | One round — the deck is dealt fresh for each one. |
| **The Stash** | A player's hidden hand of fruit cards. |
| **The Bowl** | A player's face-up penalty pile — fruits they lost a challenge holding. |
| **Fruit Loop** | The elimination trigger — 4 of the same fruit in your Bowl (5 in the Pear-Off duel). |
| **Serving** | Passing a card face-down with a (possibly false) declaration. |
| **Peek & Pass** | Secretly looking at the card before passing it on to someone else with a new claim. |
| **True / False** | The challenge call — True believes the declaration, False calls bluff. |
| **Fruit Tokens** | Score currency, cumulative across every Fruit-Off in the session. |
| **Pristine** | Surviving a Fruit-Off with an empty Bowl — +10 tokens. |
| **Survived** | Surviving with at least one Bowl card — +5 tokens. |
| **Fruit Looped** | Being eliminated — 0 tokens that round. |
| **The Silver Lining** | The session-end bonus (+2 tokens) for the most correct True/False calls across the whole match. |
| **Fruity Personalities** | Sylly Mode's name — every fruit gains a rule-breaking ability. |
| **Think Before You Fruit** | The turn-timer setting's name. |
| **Pear of Fruits** | The 2-player duel variant, auto-engaged whenever the lobby is exactly two players. |
| **Pear-Off** | The duel's informal name — 5-fruit elimination threshold, no Peek & Pass, mutually exclusive with Sylly Mode. |
| **Fruit Selection 🍌** | Settings overlay title. |
| **Pass-Off Log 📋** | Per-serving log overlay for the current Fruit-Off. |
| **Orange You Glad It's Over?** | Gameover screen heading. |
| **More Fruit?** | Play-again overlay heading. |
| **Vegetables Instead?** | Quit overlay heading. |

### The eight fruits and their Sylly Mode personalities (Fruity Personalities)

| Fruit | Trigger | Personality |
|---|---|---|
| Smug Banana 🍌 | on-challenge | Lose a challenge against a Banana and you take the card as normal — but the server keeps the serve. |
| Sour Lemon 🍋 | on-challenge | Whenever a Lemon is revealed, the other party flips one random card from their own Stash. |
| Charming Peach 🍑 | on-challenge | A Peach lands in a Bowl → the challenger must flip one of their own Peaches, if holding one. |
| Dramatic Grape 🍇 | on-challenge | A Grape is flipped → whoever is hiding the most hidden Grapes flips one (ties: everyone tied). |
| Chill Watermelon 🍉 | passive | A public counter shows how many Watermelons each player is hiding — no secrets. |
| Sus Pear 🍐 | on-peek | Peek and find a Pear → pocket it and swap any Stash card to pass on instead, with a fresh claim. |
| Panicked Strawberry 🍓 | on-serve | A 1-in-4 chance a served Strawberry panics and auto-reveals into your own Bowl. |
| Angry Apple 🍎 | on-challenge | An Apple flips → the loser must serve the winner next, and that target cannot Peek. |

---

## T6 — Settings · *mixed — labels paired, values derived*

The settings overlay is titled **Fruit Selection 🍌** — *"Stock the salad before the first serve."*

| Setting | Options | Default | What it does in play |
|---|---|---|---|
| **Fruit Stock** | Swift (6 each) / Standard (8 each) / Mega Salad (10 each) | Standard | Copies of each fruit in the deck. Fewer copies means a faster game; Mega Salad suits 5+ players. |
| **Fruit-Offs** | 1 / 3 / 5 | 3 | How many rounds before the overall winner. |
| **Think Before You Fruit** | Off / 15s / 30s / 60s | Off | A turn timer for snap decisions — off for relaxed bluffing. |
| **Pear-Off** | OFF / ON | OFF | Locks to 2 players, burns 10 cards before dealing, strips out Peek & Pass, and raises the Fruit Loop threshold to 5. Mutually exclusive with Sylly Mode. |
| **✨ Sylly Mode** | OFF / ON | OFF | Fruity Personalities. Requires 3+ players; mutually exclusive with Pear-Off. See T8. |

**Pear-Off and Sylly Mode are mutually exclusive**, both ways: turning one on greys and disables the
other, with a reason line explaining why. At exactly two players the game auto-engages Pear-Off
regardless of the toggle — there's no manual "duel mode" switch, the lobby's own player count decides
it.

**No word-difficulty tier.** Fruit Salad runs off a fixed 8-fruit deck, not a `words.json` bank —
Fruit Stock is the game's velocity dial instead.

---

## T7 — The Player's Journey · *mixed — 7a derived, 7b paired, 7c free*

### T7a — The flow

| # | Screen | Beat | Type | Duration | Chrome |
|---|--------|------|------|----------|--------|
| 1 | `screen-frt-menu` | Pick your poison | Menu | — | 🔊 |
| 2 | `screen-frt-deal` | "Tossing the Salad…" | Interstitial | brief, static | none |
| 3 | `screen-frt-table` | Serve, await, challenge-reveal, round-end — all one screen | Interactive | — | `[?]` 🔊 ✕ |
| 4 | `screen-frt-gameover` | Final Fruit Token totals + Silver Lining | Result | — | 🔊 |

There is **no setup screen and no pass-gate** — names come from the lobby roster, and every player
is on their own phone. `screen-frt-table` is where every sub-state lives: whose turn it is, the
challenge, the reveal, and the round-end summary all render inside the same Stack rather than as
separate screens, since Fruit Salad's turns move fast and a screen change per phase would slow the
read.

**The deal interstitial is a known thin spot, not a design choice** — see T7c.

**Overlays**

| Overlay | Opened from | What it is |
|---|---|---|
| `frt-settings-overlay` | Menu | Fruit Selection — the five settings |
| `frt-how-to-overlay` | Menu, table `[?]` | How to Play — two tabs: The Rules, The Fruit |
| `frt-personalities-overlay` | How to Play's Sylly card, settings' Sylly card | Fruity Personalities — the full eight-fruit ability roster |
| `frt-log-overlay` | Table's log icon | Pass-Off Log — who caught who, this Fruit-Off |
| `frt-tip-overlay` | *(shared contextual shell — see per-game reference)* | A generic shared tip overlay |
| `frt-quit-overlay` | Table ✕ | Mid-Fruit-Off quit confirm |
| `frt-new-game-overlay` | Gameover | Play-again confirm |

### T7b — The words on screen

#### The menu

```copy
# screen-frt-menu
Fruit Salad
"This is definitely a banana. Trust me."
Start Serving
How to Play
Settings
← Back to the Box
```

#### The deal

```copy
# screen-frt-deal
Tossing the Salad…
Dealing the stashes.
```

#### The table

```copy
# screen-frt-table — action labels
Serve →
Slide it →
Pass it on →
Peek & Pass
Back
```

```copy
# screen-frt-table — challenge and round-end
No pass-offs yet this Fruit-Off.
Waiting for host…
See Final Scores →
Next Fruit-Off →
```

The Call TRUE/FALSE buttons, the round header ("Fruit-Off N / M"), the Fruit Looped banner, and
every player-name/count label are built at runtime from live state — *"Call TRUE — it's a
[fruit]"*, *"Call FALSE — they're bluffing"*, and *"[Name(s)] got Fruit Looped! 🍌"* on elimination.

#### Gameover

```copy
# screen-frt-gameover
Orange You Glad It's Over?
More Fruit
← Back to the Box
```

#### Settings — Fruit Selection

```copy
# frt-settings-overlay — title
Fruit Selection 🍌
Stock the salad before the first serve.
```

```copy
# frt-settings-overlay — Fruit Stock and Fruit-Offs
Fruit Stock
Copies of each fruit in the deck — Standard: 8, Swift: 6, Mega: 10 (best with 5+). Fewer copies = faster game.
Swift
Standard
Mega Salad
Fruit-Offs
How many rounds before the overall winner.
```

```copy
# frt-settings-overlay — Think Before You Fruit and Pear-Off
Think Before You Fruit
A turn timer for snap decisions. Off for relaxed bluffing.
Pear-Off
1v1 Duel Mode
Locks to 2 players. 10 cards are burned before dealing — each player gets 27. Peek & Pass is stripped out; every serve is a direct True or False. Fruit Loop threshold rises to 5 cards (from 4). Empty hand still loses.
Pear-Off is unavailable while Fruity Personalities is on.
```

```copy
# frt-settings-overlay — Sylly Mode
✨ Sylly Mode
Fruity Personalities
Every fruit variety gains a unique, rule-breaking quirk. Requires 3+ players.
Fruity Personalities is unavailable while Pear-Off is on.
Done
```

#### How to Play — The Rules

```copy
# frt-how-to-overlay — title and tabs
How to Play 🍌
Bluff your fruit. Don't get caught holding four.
The Rules
The Fruit
```

```copy
# frt-how-to-overlay — steps
The Serve
The Stare Down
Getting Caught
Fruit Looped
Winning and Scoring
Fruit Tokens across the Fruit-Offs
```

```copy
# frt-how-to-overlay — Winning and Scoring bullets
Fruit Looped
Survived the Salad
Pristine Clean Escape
The Silver Lining
```

```copy
# frt-how-to-overlay — Sylly Mode card
Fruity Personalities
Requires 3+ players.
```

#### Fruity Personalities gallery

```copy
# frt-personalities-overlay
Fruity Personalities 🍓
Every fruit's rule-breaking quirk in Sylly Mode.
Smug Banana
Sour Lemon
Charming Peach
Dramatic Grape
Chill Watermelon
Sus Pear
Panicked Strawberry
Angry Apple
on-challenge
passive
on-peek
on-serve
Got it
```

#### Pass-Off Log

```copy
# frt-log-overlay
Pass-Off Log 📋
Who caught who, this Fruit-Off.
Close
```

#### Quit and confirms

```copy
# frt-quit-overlay
Vegetables Instead?
Your salad will be tossed.
Yeah, I'm out.
Keep bluffing!
```

```copy
# frt-new-game-overlay
More Fruit?
Fresh decks, scores reset.
More Fruit
Stay here
```

### T7c — Where the journey is thin

**◇ judgement, not spec.**

**The deal interstitial is a static placeholder, by the game's own admission.** `screen-frt-deal`
shows "Tossing the Salad…" for a brief beat with no animation and no rotating flavour line — every
later game with an equivalent moment (Cookie Jar's Raid Intro, Counting Sheep's Night Intro,
Pecking Order's Clash Intro) got a proper Round/Night Intro treatment with a flavour pool; Fruit
Salad's was built first and never revisited. It's the most literal "deferred" item in the suite's
own implementation notes — logged there as post-launch polish and still open.

**Fruity Personalities has a dedicated gallery; the base game has none.** The eight fruits each get
a full write-up the moment Sylly Mode is even mentioned, but a player who never turns it on never
sees anything comparable — no base-game fruit gets its own card beyond a name in the deck.

**The Pass-Off Log is functional but terse.** It's a flat list of "who caught who" with no per-serve
flavour or colour — useful as a reference, but the plainest of the suite's equivalent match-log
overlays (compare Cookie Jar's Crumb Trail or Pecking Order's Watering Hole, both of which carry
richer per-entry framing).

---

## T8 — Sylly Mode · *free*

**Fruity Personalities.** Every one of the eight fruits gains its own rule-breaking quirk, active
the moment a challenge, peek, or serve involves it. They fall into three shapes:

- **On-challenge** abilities fire the moment a fruit is revealed as the loser of a challenge — the
  Smug Banana lets the server keep serving even after losing; the Sour Lemon forces the winner to
  flip one of their own cards too; the Charming Peach and Dramatic Grape both force a second,
  related flip.
- **Passive** abilities are always active — the Chill Watermelon keeps a public running count of
  who's hiding how many, visible to the whole table at all times.
- **On-peek / on-serve** abilities trigger off a specific action rather than a challenge outcome —
  the Sus Pear lets a peeking player swap the card for something else from their own Stash; the
  Panicked Strawberry has a genuine one-in-four chance of outing itself the instant it's served, no
  challenge required.

**Requires 3+ players.** Fruity Personalities is switched off entirely at two players — the duel
variant (Pear-Off) is mutually exclusive with it, since several personalities (the Angry Apple's
forced-serve especially) assume more than one possible target exists.

**What changes in feel, not just rule.** The base game is a read on one person's face; Fruity
Personalities turns every single card into its own small rules exception, so remembering which
fruit does what becomes part of the bluff itself — declaring "Apple" carries real consequences
beyond the challenge, and players start declaring around what a fruit's ability would do to them if
believed, not just whether the lie will hold.

---

## T9 — Art & Assets · *derived*

**Fruit Salad ships with real artwork by default** — a core art pack promoted from the
`fruity-fruits` skin pack, the third game in the suite to make that jump.

| What | Count | Where it renders |
|---|---|---|
| Fruit card faces | 8 — the full deck | Stash, table, gallery, challenge reveal |
| Card back | 1 | Face-down cards |

**Everything is precached.** The art is part of the app version, present on a cold offline install;
changing it needs a service-worker version bump.

**Where to see it without playing.** How to Play → **The Fruit** shows the full 8-fruit deck plus
the face-down back, built through the same `frtRenderCard` seam the table uses, and every tile is
tappable-to-enlarge. Opening this tab offline is the install check for a game with no shared device
— illustrated fruit means the art precached correctly, emoji mean it didn't.

Dimensions, file-size ceilings and the conversion process are **not** recorded here — they live in
`docs/art-authoring-guide.md`, the document to brief an artist from alongside T4.

---

## T10 — At the Table · *derived — except the PTP judgement*

**Modes.** Multi-device only. Every player uses their own phone; one person hosts and the rest join
with a room code. There is no pass-the-phone or shared-device option.

**Players.** 2 to 8 — the widest range in the suite alongside Counting Sheep, and the only game with
a genuine 2-player mode.

**Devices.** One per player. True card identity is broadcast to every device and each renders only
what its role permits — couch security, not the private-channel model — accepted for a game where
the bluff is verbal, not cryptographic.

**Shape-changing settings.** Pear-Off, indirectly — it's not a manual toggle so much as an automatic
consequence of the lobby settling at exactly two players, but it genuinely changes the session's
rules (elimination threshold, no Peek & Pass) the moment that happens.

**How it plays at each size**

| Players | What it feels like |
|---|---|
| **2 (Pear-Off)** | A tight, direct duel — every serve is a straight True-or-False read with nowhere to hide a bluff behind a third party. |
| **3–5** | The intended game — enough players that Peek & Pass genuinely matters, and enough table cross-talk to make a bluff land or fail in front of an audience. |
| **6–8** | Long chains of Peek & Pass become possible, and Fruity Personalities' table-wide effects (Dramatic Grape, Chill Watermelon) get noticeably louder. |

**Could it be Pass-the-Phone?** — ◇ *judgement, not spec*

**No, for the same structural reason as most of the suite's later MDLM games.** A served card's
declaration has to be readable by the receiver alone, and Peek & Pass depends on genuinely secret
information moving between two specific players without a third seeing it. A shared phone would
mean every pass is watched by the whole table, which defeats the entire bluff.

---
