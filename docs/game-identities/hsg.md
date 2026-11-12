# Hide and Shogun

**Game 22** · `activeGameId: hsg` · plugin `js/games/hsg.js` · rules `js/games/hsg-rules.js` (pure) · world kit `js/games/hsg-scene.js` · `css/hsg.css`
**Emoji:** 🏯 · **Brand:** Lantern gold `#B8862B` (custom `hsg-cta` / `pill-active-hsg`; text rung `#9C6A1E`) · **Players:** 2 · **Modes:** Pass-the-Phone · Multi-Device · Solo vs a bot
**Status:** built across SW v278–v288 (11–12 Nov 2026): rules and state S1–S2, the Castle S4, the Intro and Battle intro S5, both War Chronicles S6, multi-device S7, bots and Solo S8, reconnect and the moments S9, the Household S10, Practice S11, polish S12. Phase 45 gate (Protocol A) at SW v289 — open only on the live two-phone session.

> **Change contract.** Each section is tagged **free** (reword freely — but it must stay true),
> **paired** (change the doc and the code together, or you open a gap between them), or **derived**
> (change the code first; editing the doc only changes whether it is correct). Full rule:
> `docs/superpowers/specs/2026-08-22-game-identity-docs-design.md` § 5.
>
> **Where the technical detail lives.** Screen and overlay IDs, state variables, key functions and
> MP packet tables are in `docs/code-map.md` — Grep the game's name or an element ID, never
> full-read it. This document deliberately does not duplicate them. The brief (v5) and the tech spec
> stay in `docs/` until the phase-45 archive; what the spec decided and what the build changed lives in
> `docs/implementation-notes/hsg-implementation-notes.md`.

---

## T1 — The Pitch · *free*

*Find their Shogun before they find yours.* On the one night of the year the whole castle plays
hide-and-seek, two clans have hidden their entire households behind thirty paper doors — all mixed
together, so nobody knows who is behind which door, not even their own lord. Slide open a door, find a
fox, topple their Shogun. The fun is a hunt where every door is a gamble: it might hold your best
piece, their best piece, or a fox who sides with whoever finds her.

---

## T2 — The Premise · *free*

Two players are the clan lords. Thirty doors sit in a 5×6 lattice; behind them hide each clan's
household of thirteen — **Shogun, two Guards, two Monks, two Samurai, a Ninja, two Archers, three
Farmers** — plus four **foxes** who belong to neither side. On your **Command** you do exactly one
thing: **open** a door, **march** a piece a square, **strike**, or (Samurai only) **Charge**. The first
clan piece anyone finds decides who is **Crimson Sun** and who is **Indigo Moon** (**Raising the
Banners**). A Shogun behind a living **Guard** can be reached only by a fox. A Battle ends when a Shogun
is struck (**"Found you!"**), when **the last lantern** goes out (twelve quiet Commands in a row — most
pieces in the open wins), or when a lord is **Cornered**. Each Battle won earns an **Honour Seal**; the
first lord to 3 Seals takes the **Campaign**.

It is built on **Banqi** (Chinese Dark Chess): every piece starts face-down and your colour is set by
the first flip. What changed is the win (capture the Shogun, not a wipe-out), the Guard, seven pieces
with their own moves, the foxes and the Last Lantern. The rules are the suite's own to keep.

---

## T3 — How to Play · *free*

**Taking cushions.** The host sets the War Council on the menu (or, in Pass-the-Phone, both lords type
names and the phone lies flat between them). The Storyteller's Intro plays, the lords bow in, and the
first Battle begins.

**A Battle.** The Battle intro lights the lamps and shuts every door. In Battle 1 the Storyteller tosses
his fan to see who opens first; after that the first move alternates every Battle, replays included.
On your Command, **tap one of your pieces**: it lifts, and its legal squares light with shape-coded
marks (a dot to march, chevrons to Charge, brackets round a strike target, an arc for a Leap). Tap a lit
square to act, or drag the piece there. To **open a door** tap it (it lifts and shows an **Open?** chip,
and the Storyteller whispers *"Somebody's there…"*), then tap it again; tapping anywhere else cancels.
The message card always says whose Command it is and what just happened. Long-press any piece to jump
to its row in the Household.

**The pieces.** Higher strikes lower, up close: Shogun, Guard, Monk, Samurai, Ninja, Archer, Farmer.
The **Archer** hits exactly 2 or 3 squares away in a line; the **Ninja** Leaps over exactly one piece;
the **Monk** strikes diagonally only; the **Samurai** Charges two empty squares; the **Farmer** is
lowest but chases off foxes (and may strike an Archer). A **fox** strikes only the enemy Shogun — even a
Guarded one — and only a Farmer or the Ninja can strike her. The Archer and the Ninja can't hit an
adjacent piece. Every piece is on the Household tab.

**Guards and foxes.** A Shogun is **Guarded** while any Guard of his clan stands — even one still behind
a door — and **Unguarded** once both have fallen; his tile says which (a solid gold flag, or a dashed red
one). Open a fox's door and she sides with you, up to half the foxes; a third one goes to your opponent.

**How a Battle ends.** Strike the Shogun (a Farmer's win is *Gekokujo!*); or twelve quiet Commands pass
with no door opened and no strike — then the lord with more pieces **in the open** wins, and a level count
is a **Truce** (no Seal, replayed); or a lord with no legal Command is Cornered. **The War Chronicle**
shows the result, the Seals and **Next Battle**. First to 3 (or 1, or 5, per the War Council) takes the
Campaign, and **New Campaign** tosses the fan again.

---

## T4 — Theme & Flavour · *free*

**The world.** **The Paper Castle** — a shogun's castle at dusk, on the one night of the year when the
whole household plays hide-and-seek. A maze of paper sliding doors with a lamp glowing behind each,
somebody hiding behind every one. A war with a wink: a real war between two clans, played like a
children's game.

**The narrator.** **The Storyteller** — a rakugo teller hired for the night, kneeling on his cushion with
a folding fan. He plays every character himself: melodramatic about every strike, scandalised by every
fox, delighted by every upset. He punctuates the big moments with a snap of his fan. He has no name; his
role line, *A rakugo teller, hired for the night*, is the nod for players who know the art form.

**The look — Stage 1b pick: A's world with C's Castle.** A's lacquer room, gold-leaf frame, beam of
twelve hanging paper lanterns and cream message card; C's bright backlit doors, **sumi-ink shadow-puppet
pieces** wearing a **sash in the clan colour** with the piece's name on it and a small clan crest (sun
disc, crescent moon, or a paw for a fox), glowing move marks, and the shadow on the paper when a door is
tapped. Palette: paper cream `#F3EAD7`, sumi ink `#2B2620`, lamp amber `#F2B45A`, dark lacquer `#3A1F1A`,
gold leaf `#C9A14A`; the clans are Crimson Sun `#B3261E` and Indigo Moon `#2B3A67`. Honour Seals are
stamped in the colour and symbol of the clan they were won as.

**The signature moment.** **The door slide:** a door glides aside, a shadow flickers on the paper for a
beat, and the piece pops into the lamplight. Its mirror image is the payoff: when a Shogun falls, the
Storyteller snaps his fan and calls **"Found you!"**

**Mood words:** sneaky · lamplit · cheeky.

**What it is NOT.** Not The Masked Court — the foxes have ears and a tail, never masks. Not Counting
Sheep (night, sleep, midnight palette): this is a lamplit evening and the clock is the Last Lantern, not a
Night. Not Cookie Jar (sneaking round a family home). Not Flawless (an appraisal house). Not generic
"Japan theme" pastiche: no kanji wallpaper, no cherry blossom on everything, no solemn samurai-film
gongs. One specific, playful house of paper doors.

Australian English, metric only (it never comes up).

---

## T5 — Terminology · *paired*

| Term | Meaning |
|------|---------|
| **Battle** | One round. *Battle 2, again* after a Truce. |
| **Command** | One turn: exactly one Open, March, Strike or Charge. |
| **The Campaign** | The series — first to 1, 3 or 5 Seals. |
| **Honour Seal** | One point, a stamp in the winning clan's colour and symbol. |
| **The War Chronicle** | The end screen (each Battle's; the Campaign's last one is the gameover). |
| **Clan** | **Crimson Sun** (sun-disc crest) or **Indigo Moon** (crescent crest). |
| **Door** | A closed square. Anyone may **open** any door. |
| **In the open** | A piece whose door is open. The only pieces the Last Lantern counts. |
| **March** / **Strike** / **Charge** | Move a square / capture / the Samurai's two-square move (never a strike). |
| **Leap** / **Volley** | The Ninja's jump-strike over one piece / the Archer's shot at exactly 2 or 3 squares. |
| **Raising the Banners** | The first clan piece found decides the colours. |
| **Guarded / Unguarded** | The Shogun with / without a Guard left in the castle. |
| **The foxes** | Four neutral pieces. *A Pair* (2) or *A Skulk* (4). The fox **sides with** whoever finds her. |
| **The Last Lantern** | The closing clock: 12 quiet Commands in a row. Twelve paper lanterns on the beam. |
| **Truce** | A level count at the Last Lantern — no Seal, the Battle is replayed. |
| **Cornered** | No legal Command on your turn — you lose the Battle. |
| **Found you!** / **Gekokujo!** | A Shogun struck / a Farmer toppling the Shogun. |
| **The Household** | The How-to gallery tab: one row per piece, the ladder, the upsets, the loop. |
| **The War Council 🏯** | The settings overlay. |
| **The Storyteller** | The narrator. |
| **Leave the Field?** / **New Campaign?** | Quit / play again. |
| **BOWED IN** | The Intro's ready stamp. |

**Retired (never use):** Geisha, Geisha for hire, Hired, The Floating World, Quiet Evening, Grand Banquet ·
Daimyo · Onmyoji, Cast · Kunoichi, Vault · Gunner, Teppo · Ronin, Ashigaru · Shroud, Unveil · Exposed ·
The Long Night · Surrounded · Shogun's Shame, Forced Fight · Vanguard, Rearguard · The Muster · The Omen ·
Ivory Moon · Raise the Banners Again. (The old names collide with other games: Vault with Flawless and
Secret Signals, Exposed with Flawless, Night with Counting Sheep.)

---

## T6 — Settings · *mixed — labels paired, values derived*

The settings overlay is titled **The War Council 🏯** — *"Set the terms before the doors slide shut."*

| Setting | Options | Default | What it does in play |
|---|---|---|---|
| **The Campaign** | Single Battle · First to 3 · First to 5 | First to 3 | How many Seals win. The Seal tally is hidden in a Single Battle; the Intro's third brief line follows it. |
| **The Foxes** | A Pair · A Skulk | A Skulk | Two foxes or four. With A Pair each clan has four Farmers instead of three. A live line under the pills says what is picked. |

There is **no ✨ Sylly Mode card** (COMB's form): the settings overlay shows only the two cards above, and
the How to Play card says *Not yet* (T8). **Fixed rules, not settings:** the Last Lantern (12 quiet
Commands), the fox share (at most half per clan), the first move alternating every Battle.

Settings are host-only: set on the menu before the room exists and travelling by SETTINGS_SYNC. **Bot
skill** (Easy · Medium · Hard) appears only on the engine's Solo screen, when the opponent is a bot.

---

## T7 — The Player's Journey · *mixed — 7a derived, 7b paired, 7c free*

### T7a — The flow

| # | Screen | Beat | Type | Duration | Chrome |
|---|--------|------|------|----------|--------|
| 1 | `screen-hsg-menu` | Menu | Menu | — | 🔊 |
| 2 | `screen-hsg-setup` | Pass-the-Phone only: the two lords' names | Setup | — | 🔊 ✕ |
| 3 | `screen-game-intro` | *(engine)* The Storyteller's four lines → the brief → *The lords take their cushions.* → BOWED IN | Intro | — | 🔊 ✕ |
| 4 | `screen-hsg-standby` | A client waits for the host's first Battle (also a rejoining phone's landing) | Wait | — | 🔊 ✕ |
| 5 | `screen-hsg-battle-intro` | Lamps light, doors shut, the fan toss (Battle 1) or *"X opens the first door."* | Interstitial | 4.5 s (Battle 1) / 3.5 s | none (rule 5) |
| 6 | `screen-hsg-castle` | The Castle — the board, both bars, the beam, the message card | Interactive | — | `[?]` 🔊 ✕ |
| 7 | `screen-hsg-chronicle` | The War Chronicle between Battles — result, Seal ledger, stats, Next Battle | Result | — | 🔊 ✕ |
| 8 | `screen-hsg-gameover` | The War Chronicle when the Campaign is won — New Campaign | Result | — | 🔊 ✕ |

Rows 5–7 loop until a lord holds the Seals. The Castle's "ending beat" (the Found you! card, the
last-lantern count, the Cornered line) plays for 2.4 s on the board before the Chronicle. Every moment
(the door slide, the banners, the fox's stamp, the cracking Guard ring, the lanterns, the strike) has a
static reduced-motion form.

**Overlays**

| Overlay | Opened from | What it is |
|---|---|---|
| `hsg-settings-overlay` | Menu | The War Council — two settings |
| `hsg-how-to-overlay` | Menu, the Castle's `[?]`, a long-press on a piece | How to Play — tabs **The Rules · Practice · The Household** |
| `hsg-quit-overlay` | Any ✕ / Leave the Field | Leave the Field? (ends the Campaign for both; the leaver forfeits) |
| `hsg-new-campaign-overlay` | The gameover | New Campaign? |

### T7b — The words on screen

#### The menu

```copy
# screen-hsg-menu
Hide and
Shogun
Find their Shogun before they find yours.
Ready or Not
How to Play
Settings
← Back to the Box
```

#### Pass-the-Phone names

```copy
# screen-hsg-setup
Who's playing?
First lord
Second lord
Two lords can't share a name.
Leave blank to use Lord 1 and Lord 2. The phone lies flat between you — nothing flips.
Take your cushions
```

#### The Intro (engine screen, the game's copy)

```copy
# intro-hsg
The Storyteller
A rakugo teller, hired for the night
Ahem! Tonight, the whole castle plays hide-and-seek.
Two clans. Thirty doors. Someone behind every one.
Find their Shogun before they find yours.
And mind the foxes. They side with whoever finds them.
Your go: slide open a door, or move one of yours.
Tap a piece to see where it can go and what it can strike.
Strike their Shogun to win the Battle. First to 3 Seals.
Strike their Shogun to win. One Battle decides it.
Strike their Shogun to win the Battle. First to 5 Seals.
The lords take their cushions.
BOWED IN
```

#### Standby

```copy
# screen-hsg-standby
Cushions, please…
The Storyteller is setting out the cushions…
```

#### The Battle intro

```copy
# screen-hsg-battle-intro
Ahem! Who goes first? The fan decides…
A Truce! Everyone back behind the doors.
Everyone hide! Ready or not…
The doors are shut. Somebody is giggling behind one.
Thirty doors, two Shoguns, and far too many foxes.
Quietly now. Shoguns are terrible at hiding.
The lamps are lit. The hunt begins.
```

#### The Castle (message card and chips)

```copy
# screen-hsg-castle
Open?
“Somebody’s there…”
Tap the door again to slide it open. Tap anywhere else to cancel.
“A Guard falls!”
“Found you!”
“Gekokujo!”
“The last lantern is out.”
“A Truce!”
“Cornered!”
```

#### The War Chronicle

```copy
# screen-hsg-chronicle
The War Chronicle
Next Battle
Leave the Field
Replay the Battle
Found you!
Gekokujo!
The Last Lantern
A Truce!
Cornered!
No Seal this Battle.
A Truce! Both households stand. No Seal; the Battle will be replayed.
Nowhere left to hide.
Pieces struck
```

```copy
# screen-hsg-gameover
New Campaign
```

#### Settings — The War Council

```copy
# hsg-settings-overlay
The War Council 🏯
Set the terms before the doors slide shut.
The Campaign
How many Battles a lord must win to take the Campaign.
Single Battle
First to 3
First to 5
The Foxes
How many foxes hide behind the doors. Fewer foxes means more Farmers.
A Pair
A Skulk
Got it
```

#### How to Play

```copy
# hsg-how-to-overlay
How to Play 🏯
Two clans, thirty doors, a Shogun hiding behind one of them.
The Rules
Practice
The Household
Every piece hides behind a door
One Command a turn
Raising the Banners
The ladder
The specialists
The Guard
The foxes
The Last Lantern
Winning and Scoring
Seals take the Campaign
Easy to miss: the Archer and the Ninja can't hit an adjacent piece.
Easy to miss: your third fox goes to your opponent.
Easy to miss: closed doors don't count.
✨ Sylly Mode
Not yet
The Storyteller is still writing this one. Coming later.
Lower beats higher, five ways
```

#### Quit and play again

```copy
# hsg-quit-overlay
Leave the Field?
Slip away now and the whole Campaign goes to your opponent.
Yeah, slip away
Not yet!
```

```copy
# hsg-new-campaign-overlay
New Campaign?
Every Seal comes off and the fan is tossed again.
Toss the fan
Stay here
```

### T7c — Where the journey is thin

**◇ judgement, not spec.**

**The balance evidence is thin.** Nearly all of it comes from heuristic bots tuned against stand-in
measures: about 69 % of bot Battles end with a Shogun struck, 29 % at the Last Lantern, 2 % in a Truce;
the first mover wins 49–53 %. One six-Battle human playtest preceded the v5 rules. The first sessions
should log: does a fox win feel like a comeback or a random loss; does the Last Lantern ever feel unfair;
does anyone miss the Archer's and Ninja's can't-hit-adjacent rule.

**There is a lot to learn.** Seven pieces, five strike patterns, about eight exceptions. Tapping a piece
shows its legal moves, the Household and the nine Practice lessons carry the rest, but the first-time
learning curve is the biggest risk for a mixed-age table. Lesson 9 (the Last Lantern, with its lantern
beam) still overshoots the short-phone How-to sheet by about 16 px at 320×452.

**Fox luck, and a thin spectator seat.** The fox decides most Battles with A Skulk. A two-player duel
gives the rest of the room less to do; the Storyteller's moments are meant to carry it.

**The Forfeit variant is not built.** Leave the Field dissolves the session for both devices, so the brief's
*"Priya left the field. Hana takes the Campaign."* has no screen to show on.

---

## T8 — Sylly Mode · *free*

**None in v1.** The Storyteller is still writing it: the How to Play card reads **✨ Sylly Mode · Not yet**
and the settings overlay has no card at all (a dead toggle is worse than an honest sentence). Parked ideas,
none designed: doors with a consequence when opened; doors that reshuffle; a Monk barrier; a Samurai that
may strike a Guard; a four-player mode.

---

## T9 — Art & Assets · *derived*

**Everything is drawn in code — no binaries.** The Castle's board of paper doors, the lantern beam and
every piece are inline SVG and CSS. Every piece tile is drawn through **one render seam**,
`hsgRenderTile(cell, opts)` — a sumi-ink silhouette, a clan-colour sash with the printed name, a crest
disc and the rank — so the Castle, the Household and Practice never differ and a skin pack could replace
the pieces later with no logic change (asset kinds keyed by the stable piece id). The Intro's Storyteller
(kneeling, fan up, fan tossed, fan snap) is `hsg-scene.js`; the Storyteller's lamp-disc portrait on the
message card, the banners, the Seal stamps and the lanterns are CSS or inline SVG. The Battle intro mounts
its own scene instance. The scene text is Fredoka throughout — no new font.

**Lobby sticker and music (SW v291).** `data/stickers/hsg.png` is the lobby badge (a shoji door ajar, a shadow-puppet samurai peeking, fox ears behind). The jukebox track is *Paper-Door Tiptoe* (Sylly House Band, 6:32, koto and shamisen, own cover art), keyed `hsg` in `data/music/manifest.json` so it plays in-game and shows in the jukebox. Prompts that made them: `docs/content-prompts/hsg-sticker-music-prompts.md`.

**Sound.** All synthesised through `HSG_SOUND` over the engine's `play*()`; `playPaperSlide()` (a door
opening) and `playFanSnap()` (a strike, Found you!) were added for this game.

**Content.** None — no word bank, no data file. The piece list is fixed in `hsg-rules.js`.

---

## T10 — At the Table · *derived — except the PTP judgement*

**Modes.** Pass-the-Phone (one phone flat between two lords — nothing is secret, so there are no
hand-over gates), Multi-Device Lobby Mode (one phone each) and **Solo against a bot**. The recommended mode
is Multi-Device.

**Players.** Exactly 2 — constants in `MP_GAME_CONFIGS.hsg` (min 2, max 2). No teams, no Line-up; the Intro
shows the roll call of the two lords. Seat order matters only for who goes first: the fan toss in Battle 1,
then alternating.

**Devices.** The host's phone holds the secret seating chart (the layout of the closed doors) — **it is
never sent**. Every device, the host's own included, draws from a public copy that shows opened pieces
only; a closed door in it is just `#`. Nothing is private to one player: what lies behind a door is hidden
from **both** equally. The waiting player's board is read-only; they see the whole board and may open
How to Play. A bot takes the second seat only and decides from the same masked view a human has.

**Leaving.** A lord quitting forfeits the Campaign and the session ends for both (the Mid-Game Quit
Contract); the host leaving ends it for both. A bot does not take over a quitter's seat. **Reconnect is
adopted** — a dropped phone can rejoin mid-Campaign from any phase — and there are no late joins (two
seats).

**Shape-changing settings.** None — no setting alters the player range.

**Pass-the-Phone judgement ◇.** Pass-the-Phone is a good fit, because the board is fully public; the
Castle is a fixed-height, non-scrolling board so a flat phone is easy for both to reach, but 54 px tiles on
a 320 px phone are small for two sets of thumbs.
