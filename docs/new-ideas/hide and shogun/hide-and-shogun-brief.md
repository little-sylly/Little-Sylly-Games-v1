# New Game Brief — Hide and Shogun

**Status:** Draft v4 · 12 Oct 2026 · Two-player only · Board fixed at 5×6 for now (board size as a setting comes later) · Sylly Mode deliberately deferred · v4 folds in the owner's playtest findings (round 3): **Ronin** replace the Ashigaru and may strike the Geisha; the Kunoichi's Vault and the Gunner's range (2–3) are buffed; the Onmyoji ranks above the Samurai; Shogun's Shame (5) and the Long Night (12) are fixed rules; **Honour Seals and the Campaign (first to 3 / 5) are back**; no open questions remain.

> Scope of this draft: general mechanics and flavour only. Balance numbers (piece counts, the Long Night length, the Shogun's Shame clock) are starting points to be playtested, not final. v2 folded in the decisions from the first balance-simulation round, v3 the round-2 answers, v4 the round-3 playtest decisions (see §19, Open Questions and the handoff).

---

## 1. Identity

- **Title:** Hide and Shogun `[Decided: confirmed. A pun on hide-and-seek, because every piece starts hidden and the whole game is a hunt for the Shogun. Written with "and" rather than "&" to match the suite's other titles (Flip You For It, Just Enough Cooks, Pecking Order) and to keep it clean in file names and search; the stylised logo can still use an ampersand.]`
- **Abbreviation:** `hsg` — not in the taken list.
- **Core type:** Two-player hidden-piece grid skirmish. Two clans, a rank hierarchy of units, one Shogun to topple.
- **The fun moment in 10 words:** Gamble on hidden tiles, then topple the other clan's Shogun.
- **Inspired by Banqi (半棋, "Half Chess", also Chinese Dark Chess / Blind Chess):** a two-player board game where every piece starts face-down on the board. On your turn you either flip one piece to reveal it, or move one of your revealed pieces a single step. Which side you are is decided by the colour of the first piece flipped. Pieces capture by rank, with two famous twists: the lowliest soldier can capture the top general, and the cannon captures by jumping over exactly one piece.
- **What changes from Banqi:** smaller 5×6 board (30 tiles); eight piece types instead of seven, each with its own ability; the win is capturing the enemy Shogun, not wiping out the other side; the Shogun is shielded by his Daimyo; four of the tiles are **Geisha for hire** who belong to neither clan until somebody flips them; a stall clock (Shogun's Shame) and a closing clock (the Long Night) keep the Battle moving.
- **Overlap check:** Pecking Order (`pko`) also has "beats by relationship" rules, but it is a card game with chain adjacency — no overlap in play. Deep-Sea Deploy (`dsd`) is also two teams, but it is a word-deduction game. The in-progress Flip You For It is the closest neighbour (grid plus flipping), but it is a 3×3 card-flip game with no hidden tiles or rank hierarchy.

---

## 2. The Players

- **Strictly two players.** Each player leads one clan. Anyone else at the table can watch couch-style, or the players can pass the phone to take turns; the game has no team or spectator roles.
- **Player count:** exactly 2. `[Decided: no Commander or Retainer roles, no 3–8 player support. A four-player mode is an idea for a future Sylly Mode, parked for now.]`
- **Before the banners are raised** the two clans are called the **Vanguard** (commands first) and the **Rearguard**. **The Omen** is the coin toss that decides which player is the Vanguard: it only decides who goes first in Battle 1, nothing else; later Battles alternate. The banner colours — **Crimson Sun** and **Ivory Moon** — are decided later by the first coloured Unveil (see §3).
- **Device modes:** one device each (MDLM) or pass-to-play (PTP) on a single device. Not mixed within a Battle. `[Decided: both modes work for two players.]`
- **No secret hand to protect.** Every piece on the board is public once unveiled, and Shrouds are hidden from both players equally, so there is nothing to hide when passing the device.

---

## 3. The Core Loop

**One-sentence turn action:** On your Command, you take exactly one action — Unveil a Shroud, March a piece one square, Strike with a piece, or (Samurai only) Charge.

**Flow of a Battle:**
1. **Muster.** The two players take their seats and the War Council settings (the Campaign length, the Floating World) are confirmed.
2. **The Omen** (coin toss) decides which player is the Vanguard and commands first **in Battle 1**. It does nothing else; from Battle 2 the Vanguard alternates (§6).
3. **First Command is always an Unveil** (every tile is a Shroud, so nothing else is possible).
4. **Raising the Banners:** the first *coloured* piece (any piece except a Geisha) that anyone unveils decides the colours: the player who unveiled it takes that piece's colour, and the other player takes the other colour. Usually this happens on the opening Command. If the very first Unveil is a Geisha, she waits, hired by the player who flipped her, and takes that player's colour as soon as the banners are raised.
5. **Players alternate Commands.** Each Command is one of the actions below.
6. **The Battle ends** when a Shogun is toppled (see §5), when the Long Night closes it, or when a player is Surrounded. The winner earns an Honour Seal; the Campaign (§6) is a race for Seals, first to 3 by default.

**The actions:**

| Action | What it does |
|---|---|
| **Unveil** | Turn one Shroud face-up where it stands. You may unveil any Shroud, even one that turns out to belong to the enemy clan. Unveiling a Geisha hires her (see §4c). |
| **March** | Move one of your face-up pieces one square up, down, left or right into an empty square. |
| **Strike** | Capture an enemy face-up piece, following the rules in §4. The striking piece moves into the captured piece's square, except the Gunner, who fires without moving. |
| **Charge** | Samurai only: a March of exactly two squares in a straight line through an empty square into an empty square. A Charge cannot Strike. |

Face-down pieces cannot be struck, and nobody owns a Shroud until it is unveiled. A Command that is neither an Unveil nor a Strike is called **quiet**; the two stall clocks in §5 count quiet Commands.

---

## 4. Rule Relationships & Interaction Matrix

This section is the single source of truth. Every other section refers back to it.

### 4a. The roster (per clan, 13 pieces, plus 4 Geisha for hire; 30 tiles on the board)

| Piece | Rank | Count | March | Strike pattern |
|---|---|---|---|---|
| **Shogun** | 8 | 1 | 1 square orthogonally | Adjacent (orthogonal), by contact |
| **Daimyo** | 7 | 2 | 1 square orthogonally | Adjacent (orthogonal), by contact |
| **Onmyoji** | 6 | 2 | 1 square orthogonally | **Cast**: strike a piece on one of the four diagonal squares by moving into it; cannot strike orthogonally. Strikes anything the Gunner can (see 4b). |
| **Samurai** | 5 | 2 | 1 square orthogonally, or **Charge** 2 | Adjacent (orthogonal), by contact |
| **Kunoichi** | 4 | 1 | 1 square orthogonally | **Vault** only: jump over exactly one piece in a straight orthogonal line and strike the first piece beyond it at any distance; cannot strike an adjacent piece; lands on the struck piece's square. Any piece but a Guarded Shogun, rank ignored. A Vault is only ever a capture, never a way to move. |
| **Gunner** | 3 | 2 | 1 square orthogonally | **Volley**: fires without moving at a face-up enemy exactly 2 or 3 squares away in a straight orthogonal line, over whatever is between; ignores rank; cannot hit an adjacent piece |
| **Ronin** | 2 | 3 | 1 square orthogonally | Adjacent (orthogonal), by contact: Ronin, Gunner, Geisha, or an Exposed Shogun |
| **Geisha (for hire)** | — (off the ladder) | 4 in total, shared | 1 square orthogonally | Adjacent (orthogonal): the enemy Shogun only |

Clan total: 1 + 2 + 2 + 1 + 2 + 2 + 3 = 13 per clan, 26 for both, plus 4 Geisha = 30 tiles. In the settings (§7), a pair of Geisha can be swapped for a pair of Ronin: with 2 Geisha for hire each clan has 4 Ronin (14 per clan, 28 + 2 = 30).

The ladder runs Shogun, Daimyo, Onmyoji, Samurai, Kunoichi, Gunner, Ronin. (v4 moved the Onmyoji above the Samurai and replaced the Ashigaru with Ronin.)

### 4b. Who can strike whom

Attacker down the side, target across the top (both in rank order). Equal rank may strike equal rank unless stated. The Gunner, the Onmyoji and the Kunoichi ignore rank.

| Attacker ↓ / Target → | Shogun | Daimyo | Onmyoji | Samurai | Kunoichi | Gunner | Ronin | Geisha |
|---|---|---|---|---|---|---|---|---|
| **Shogun** | ✓* | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| **Daimyo** | ✓* | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| **Onmyoji** (Cast) | ✓* | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| **Samurai** | ✓* | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ | ✗ |
| **Kunoichi** (Vault) | ✓* | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Gunner** (Volley) | ✓* | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| **Ronin** | ✓* | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ |
| **Geisha** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

\* Only when that Shogun is **Exposed** (see 4c). Reading the Shogun column: the Geisha can always strike him; everyone else only once his Guard is gone. A Shogun can never strike a Geisha. The Onmyoji and Gunner rows are identical: both strike everything except a Geisha and a Guarded Shogun; they differ only in *how* (diagonal contact versus a shot from two or three squares). The Kunoichi row is the same plus the Geisha. Reading the Geisha column: only a Ronin or a Kunoichi can strike her.

`[ASSUMPTION: once a Shogun is Exposed, the Kunoichi may Vault onto him too. Confirmed in Open Questions round 1.]`

### 4c. Special states and rulings

1. **Guarded / Exposed.** A Shogun is **Guarded** while at least one Daimyo of his own clan is still on the board, **including face-down ones**. While Guarded, only a Geisha can capture him. When both of his clan's Daimyo have fallen, he is **Exposed** and any piece that can reach him by its own strike pattern may capture him, whatever its rank. (The Daimyo count is limited to exactly two per clan.) **The one exception is a Shogun who has been forced out of hiding** (Shogun's Shame, ruling 9): from that moment only a *face-up* Daimyo guards him.
2. **The Geisha for hire.** There are four Geisha shuffled among the Shrouds (two in the 2-Geisha setting); none belongs to either clan at the start.
   - **Hiring:** whoever unveils a Geisha hires her. She takes that player's colour and crest, and stands where she was unveiled.
   - **The cap:** a clan may not hold more than half of the Geisha. If the player who flips a Geisha already holds half the total, she joins the *opponent's* clan instead, wherever she stands. (With 4 Geisha: flip two and they are yours; flip a third and she goes to your opponent.)
   - **Banners:** `[Decided.]` a Geisha never decides the colours. If one is unveiled before the banners are raised, she waits and takes the colour of the player who flipped her (or the cap rule, if that applies).
   - **Strike:** a Geisha strikes only the enemy Shogun, even when he is Guarded. She can be struck only by a **Ronin** or a **Kunoichi**.
   - A Geisha that is still face-down when the Battle ends belongs to nobody.
3. **Strikes replace.** The striker moves into the captured piece's square. The Gunner stays where he is.
4. **Rank rule for contact strikes** (Shogun, Daimyo, Samurai, Ronin): may strike equal or lower rank only, subject to the table. The Ronin are the exception in the other direction: they are the lowest rank, but may strike a Geisha (a masterless soldier answers to no code), the Gunner (a swarm overwhelms a musket) and their own kind. The Onmyoji, Gunner and Kunoichi ignore rank.
5. **The Kunoichi** may strike any piece except a Guarded Shogun, whatever its rank, Geisha included (she ignores rank, like the Gunner and the Onmyoji; unlike them she also takes the Geisha). A Vault exists only when exactly one piece (the "screen", either clan, face-up or face-down) stands between her and the first piece beyond it, that piece is a face-up enemy she may strike, and she is not adjacent to it. Any number of empty squares before and after the screen is fine. If those conditions are not all met, there is simply no Vault in that direction.
6. **The Gunner** needs a face-up enemy exactly two **or three** squares away in a straight line. What stands in the middle squares (nothing, a friend, an enemy, a Shroud) does not matter. He cannot hit a Geisha or a Guarded Shogun. (Shrouds within his reach are fishing spots: an enemy piece that turns up there can be shot on the next Command.)
7. **The Samurai Charge** moves exactly two squares in a straight line; both squares must be empty; it cannot capture; no cooldown.
8. **The Onmyoji** marches like everyone else but strikes only diagonally, so she cannot strike an orthogonal neighbour, and orthogonal neighbours may strike her. Blocked orthogonal squares (Shrouds, other pieces) never stop a Cast. She may strike any diagonal enemy except a Geisha or a Guarded Shogun.
9. **Shogun's Shame (the Shogun is shamed out of hiding).** `[Renamed from the placeholder "Forced Fight".]` Each player keeps their own count of **their own Commands since they last made an Unveil or a capture**. When it reaches **5** *and that player's Shogun is still face-down*, he is shamed out of hiding:
   - He is turned face-up where he stands.
   - From then on, a face-down Daimyo no longer guards him. He is **Guarded only while at least one of his Daimyo is face-up**; if none is face-up he is **Exposed**.
   - Unveiling a Daimyo restores the Guard. If a Daimyo is already face-up when Shogun's Shame triggers, nothing changes: he stays Guarded as normal.
   - **It only ever applies to a face-down Shogun.** If a clan's Shogun has already been unveiled (by anyone, for any reason), Shogun's Shame never triggers for that clan: nothing is flipped and his Guard stays the normal kind (any Daimyo, face-down included). `[Decided: it is a stall clock for hiding, and a Shogun in the open is not hiding.]`
   - The count restarts at 0 after it triggers, and also whenever that player Unveils or makes a capture. Once a clan's Shogun is face-up the count no longer matters.
   - The shamed-out condition lasts for the rest of the Battle.
   - It is a fixed rule, not a setting `[Decided round 3: 5 own Commands]`. It remains a guardrail: real play is expected to rarely reach it.

### 4d. Checks (loops, dead ends, wildcards)

- **Closed loop (three-way):** Geisha → Shogun → Kunoichi → Geisha. The Geisha beats the Shogun, the Shogun beats the Kunoichi, the Kunoichi beats the Geisha. This is the heart of the game and is deliberate. The Ronin sit on the same loop from below: Ronin → Geisha → Shogun → Ronin.
- **Distance pairs (mutual strikes decided by range):** Gunner ⇄ Ronin, Gunner ⇄ Samurai, Gunner ⇄ Daimyo, Gunner ⇄ Kunoichi, Gunner ⇄ Onmyoji. Up close the contact piece wins; at exactly two or three squares the Gunner wins. Whoever strikes first wins the exchange. The Samurai Charge exists to cross the Gunner's kill zone. The Onmyoji has her own diagonal version: she can hit most pieces from a corner they cannot hit back.
- **Dead ends (beat almost nothing / beaten by almost nothing):**
  - The Geisha beats exactly one piece (the Shogun) and is beaten by exactly two (the Ronin and the Kunoichi). Balanced by being rare (2 per clan by default) and by being neutral until flipped.
  - A Guarded Shogun cannot be touched except by a Geisha. Balanced by the Daimyo being killable (a Shogun, Daimyo, Onmyoji, Kunoichi or Gunner can strike one), by Shogun's Shame, and by the Long Night (§5).
  - The Daimyo cannot be struck by a Samurai or a Ronin; the Onmyoji cannot be struck by a Samurai or a Ronin.
- **Cross-category links:** none (a single board).
- **Wildcards:** none beyond the Geisha. She cannot interact with the Guard rule (she ignores it) and cannot be targeted by the Gunner, the Onmyoji, the Samurai or anyone above the Ronin.
- **Sylly Mode:** not designed yet (§8), so nothing here is modified.

---

## 5. Winning

- **Topple the Shogun.** The first player to capture the enemy Shogun wins the Battle immediately and earns an Honour Seal (§6). `[Decided.]`
- **Shogun's Shame (stall clock, per player).** See §4c ruling 9. It does not end the Battle by itself; it drags a stalling player's still-hidden Shogun out into the open and strips the cover of a face-down Daimyo. It never applies to a Shogun who is already face-up. It is a fixed rule: **5** of a player's own Commands without an Unveil or a capture.
  - `[Decided: Shogun's Shame (5 own Commands, so 10 Commands in all if both sit still) and the Long Night (12 together) land at about the same moment. That is intended: both are guardrails against a stall-heavy meta, not something a proper match should meet. Human players are not expected to refuse to unveil or capture when given the chance. Both were settings until v3 and are fixed rules from v4.]`
- **The Long Night (closing clock, both players).** If **12** Commands in a row (6 each) pass with no Unveil and no capture by either player, the Long Night falls and the Battle ends there and then. **The player with more face-up pieces on the board wins. If both have the same number, the Battle ends in a Truce (a draw).** It is a fixed rule.
  - **Only face-up pieces count.** A Shroud counts for nobody, even though both players could work out how many pieces each clan has left; this rewards unveiling when you know you are ahead. A hired Geisha counts for her clan (she is always face-up); a Geisha who was never flipped counts for nobody. `[Decided.]`
  - Any Unveil or capture by either player resets the Long Night count to 0.
  - The piece-count tie-break is part of the game, not a setting. `[Decided.]`
- **Surrounded.** A player who has no legal Command on their turn (no Shroud to Unveil and no legal March, Strike or Charge) loses the Battle. This is the Chinese-chess rule ("no legal move loses"), not the chess stalemate draw.
- **A Truce is therefore the only draw**: equal face-up piece counts when the Long Night falls. A Truce earns no Seal and the Battle is replayed (§6).

---

## 6. Scoring

- **A single Battle** has no points: the player who topples the Shogun (or leads on face-up pieces when the Long Night falls, or whose opponent is Surrounded) wins it and earns **one Honour Seal**. `[Decided round 3: one Seal per Battle won; round 1's "no Campaign" is reversed.]`
- **The Campaign:** a Campaign is a race for Honour Seals. **First to 3 Seals wins the Campaign (default); the setting also offers first to 5, or a single Battle (first to 1).** The other games in the suite word series this way ("first to N") rather than "best of".
- **A Truce earns no Seal, and the Battle is replayed.** The replay keeps the same Vanguard as the drawn Battle, and the Battle number does not advance. `[Decided round 3.]`
- **Who commands first:** The Omen (the coin toss) decides the Vanguard of Battle 1 only. After that the Vanguard **alternates each Battle**. `[Decided round 3: one less decision.]`
- **Leaving the Field** forfeits the whole Campaign: the other player wins it (§12, question 7).
- **Zero and negative points:** none. Seals only ever go up.

---

## 7. Settings

Presented in "The War Council" (see §9). Difficulty-style settings first, Sylly Mode last.

1. **The Campaign** (how many Battles make a match): **First to 3 Seals (default)** / First to 5 Seals / Single Battle (first to 1). One Honour Seal per Battle won; a Truce earns none and the Battle is replayed (§6). `[Decided round 3: first-to-N wording, as in the suite's other games.]`
2. **The Floating World** (how many Geisha are for hire tonight): **Quiet Evening (2 Geisha)** / **Grand Banquet (4 Geisha, default)**. Each clan may hire at most half. With 2 Geisha each clan has 4 Ronin; with 4 Geisha each clan has 3 (§4a). `[Decided: "The Floating World" is the setting name (the old name for the pleasure-quarter culture that ukiyo-e prints came from, so it ties to the art direction in §20), with values Quiet Evening and Grand Banquet.]`
3. **✨ Sylly Mode:** None — will design later (see §8).

**Fixed rules, not settings** `[Decided round 3]`: Shogun's Shame (5 of your own Commands, §4c ruling 9) and the Long Night (12 quiet Commands, 6 each, §5). They were settings in v1 to v3; real play rarely reaches them, so they became stated rules that stay in as guardrails against a stall-heavy meta.

Board size (fixed at 5×6) is intentionally not a setting yet.

---

## 8. Sylly Mode

**None — will design later.** Levers that look promising for later, parked rather than designed: reveal-with-a-consequence Unveils; wild Shrouds that reshuffle; the Onmyoji's barrier idea; letting a Samurai strike a Daimyo (the Sengoku idea of the low overthrowing the high); a four-player mode.

---

## 9. Thematic Vocabulary

| Generic term | Hide and Shogun |
|---|---|
| Round | Battle |
| Turn | Command |
| Game over screen | The War Chronicle |
| Play again | Raise the Banners Again (a new Campaign) / Next Battle |
| Quit | Leave the Field? |
| Settings overlay title | The War Council 🏯 |
| Team | Clan (Crimson Sun / Ivory Moon) |
| Face-down tile | Shroud |
| Flip | Unveil |
| Move one square | March |
| Capture | Strike |
| Samurai two-square move | Charge |
| Kunoichi jump | Vault |
| Gunner shot | Volley |
| Onmyoji diagonal capture | Cast |
| Coin toss for first move | The Omen |
| Assigning clan colours | Raising the Banners |
| Shield on the Shogun | Guarded / Exposed |
| Stall clock (per player) | Shogun's Shame ("shamed out of hiding") |
| Shogun forced face-up | "The Shogun has appeared!" / "Advance on the enemy!" |
| Neutral Geisha being claimed | Hired |
| Geisha-count setting | The Floating World |
| Closing clock | The Long Night |
| Draw | Truce (no Seal; the Battle is replayed) |
| No legal move | Surrounded |
| Win | Toppling the Shogun ("Gekokujo!") |
| Series win marker | Honour Seal |
| Series of Battles | The Campaign (first to 3 / first to 5 Seals) |
| Lowest-rank soldier | Ronin |

---

## 10. Word Bank & Content

Not a word game, so no word bank. The game needs a small piece list (roster in §4a). Quantities are fixed on the 5×6 board (13 pieces per clan plus 4 Geisha for hire in the default setting) and do not scale with anything else.

**One example entry, fully described — the Gunner:**
- **Name:** Gunner (display subtitle: Teppo)
- **Rank pip:** 3
- **Count per clan:** 2
- **Category:** Ranged specialist
- **Display info:** musket silhouette; two pips; clan crest (sun or moon) on the banner
- **Special flags:** fires without moving; ignores rank; range 2 or 3; cannot hit an adjacent piece; cannot hit a Geisha or a Guarded Shogun
- **Rule Reference card text:** "Fires at the second or third square away in a straight line. Weak up close."

The relationships between pieces are in §4 and are not repeated here.

---

## 11. Custom Visual Assets

- **Eight piece illustrations**, each in two clan versions, plus a **neutral Geisha** look (shown for a moment on the board before she takes a clan's crest). Clans must be distinguishable by shape as well as colour: the Crimson Sun clan carries a sun-disc crest, the Ivory Moon clan a crescent-moon crest (important for colour-blind players and small tiles). Bold silhouettes, readable at roughly 60–70px.
- **The Shroud (face-down tile):** an ink-wash smoke swirl, identical for every tile and neutral between clans.
- **The board:** 5×6 grid on tatami or ink-paper texture, low contrast so pieces pop.
- **Highlight marks for a selected piece:** a dot for March, a crosshair ring for Strike or Volley, chevrons for Charge, a dashed arc for Vault, a diagonal sparkle for Cast. Shape-coded, not just colour-coded.
- **Guarded / Exposed marker** on each Shogun: a golden ring while Guarded, a cracked ring once Exposed.
- **Shame meter:** a small row of five pips beside each player's name that fills as their own quiet Commands pile up and empties when they Unveil or capture. It disappears once that player's Shogun is face-up, because it can no longer trigger. `[Assumption: visible but subtle while it can trigger.]`
- **"The Shogun has appeared!" moment:** a floating banner over the tile and a speech bubble: "Advance on the enemy!"
- **The Long Night track:** a row of twelve lanterns that go out one by one (counts quiet Commands by both players).
- **Honour Seals:** a red hanko-stamp seal per Battle won, shown as a tally of three or five slots beside each player's name, with a stamping moment when a Seal is earned. Hidden in a single-Battle Campaign.
- **Hire moment:** a crest stamps onto the Geisha when she is hired; a different stamp-and-flip if she joins the opponent.
- **Moment animations:** banners rising on the first coloured Unveil; a quick strike flash; the Shogun's banner snapping when he falls.
- **The War Chronicle** end screen: a scroll illustration.
- **Title art and app icon.**

---

## 12. Multiplayer Classification

`[Closed for now: the owner has set the seven standard questions aside; the plain-English answers below stand. Registry min/max players = 2 and 2.]`

1. **One device or many?** Either, for the whole Battle: one device each (MDLM) or pass-to-play (PTP) on one device. Not mixed within a Battle.
2. **Is there secret information between players?** No. The only hidden information is the Shrouds, hidden from both players equally.
3. **Does anything need to be temporarily hidden when passing a device?** No. Nothing to hide, so no hand-over screens.
4. **Read-only / spectator view?** No dedicated mode: spectators watch the shared screen couch-style.
5. **Turn order?** Strict alternation between the two players, starting with the Vanguard.
6. **Can players join late?** No (two players only).
7. **What if a player leaves?** The other player wins by forfeit.

---

## 13. Screens — Plain English List

1. **Title / lobby:** start a Battle (pass-to-play) or create / join with a room code (own devices).
2. **The Muster:** the two players take their seats.
3. **The War Council:** settings (The Campaign: first to 3 / first to 5 / single Battle; The Floating World; bot level in the alpha). Shogun's Shame and the Long Night are fixed rules, not settings.
4. **The Omen:** shows which player commands first in Battle 1. Later Battles show who commands first because the Vanguard alternates.
5. **The Battlefield:** the 5×6 board, with a banner showing whose Command it is, each player's Honour Seal tally, each player's Shame meter and the Long Night track. Tiles show the piece's illustration and its name.
6. **Raising the Banners:** a short moment after the first coloured Unveil showing which player got which colour.
7. **Piece Card (slide-up panel):** a piece's rank and abilities.
8. **How to Play (slide-up panel).**
9. **Rule Reference (slide-up panel):** the cheat sheet (§15).
10. **Small confirmation boxes:** "Unveil this Shroud?" and "Leave the Field?"
11. **Notice banners:** "The Shogun has appeared!" (Shogun's Shame), "Hired by Crimson Sun / Ivory Moon" (a Geisha), and "The Long Night falls" (the Battle is about to be counted).
12. **The War Chronicle:** the end screen, with the Seal tally, the Next Battle button (or Replay the Battle after a Truce) and, when a Campaign is won, the Campaign result.

---

## 14. Complex Interaction / UI Spec

A Command here is more than tap-to-choose because a piece may have several kinds of move, so it needs a spec.

**Screen sketch (plain text):**

```
 Crimson Sun · Your Command      Shame ●●○○○       Long Night ●●●●○○
 ┌─────┬─────┬─────┬─────┬─────┐
 │ ~~~ │ ~~~ │ ~~~ │ ~~~ │ ~~~ │ 1
 ├─────┼─────┼─────┼─────┼─────┤
 │ ~~~ │ ~~~ │ ~~~ │ ~~~ │ ~~~ │ 2
 ├─────┼─────┼─────┼─────┼─────┤
 │ ~~~ │ ~~~ │ Sam │ ~~~ │ ~~~ │ 3
 ├─────┼─────┼─────┼─────┼─────┤
 │ ~~~ │ ~~~ │  .  │ ~~~ │ ~~~ │ 4
 ├─────┼─────┼─────┼─────┼─────┤
 │ ~~~ │ ~~~ │ ~~~ │ ~~~ │ ~~~ │ 5
 ├─────┼─────┼─────┼─────┼─────┤
 │ ~~~ │ ~~~ │ ~~~ │ ~~~ │ ~~~ │ 6
 └─────┴─────┴─────┴─────┴─────┘
    A     B     C     D     E
 [ Piece Card ]  [ Rule Reference ]  [ How to Play ]
```
(`~~~` = Shroud, `.` = a highlighted legal square; the Shame pips shown are the active player's own.)

**Input methods (every way a player can act):**
1. **Tap-tap (primary):** tap one of your face-up pieces; its legal squares light up with shape-coded marks (dot, crosshair, chevrons, arc, sparkle); tap a lit square to act.
2. **Drag and drop:** drag your piece onto a lit square.
3. **Tap a Shroud to Unveil:** a small centred confirmation box appears: "Unveil this Shroud?" with Unveil and Cancel.
4. **Long-press any piece** to open its Piece Card (a scrollable slide-up panel).
5. **Gunner:** tap the Gunner, then tap a crosshair-marked enemy exactly two or three squares away in a straight line. He does not move.
6. **Kunoichi:** tap her, then tap a dashed-arc-marked target; the screen piece between is outlined during the preview. Squares with no valid Vault show no arc.
7. **Samurai:** tap him; Charge squares show chevrons two squares away alongside March dots.
8. **Onmyoji:** tap her; diagonal enemy squares show a sparkle, with a crosshair on anything she may strike.

No undo is offered once an action is confirmed. `[ASSUMPTION: Strikes and Marches act on the second tap with no confirmation box; only Unveil asks to confirm, because an Unveil is irreversible and a wrong Shroud is the commonest mis-tap.]`

Only two overlay shapes are used (slide-up panel and small centred confirmation box). Nothing needs frozen controls.

---

## 15. Rule Reference / In-Game Cheat Sheet

A scrollable slide-up panel, the same shape as How to Play.

```
THE LADDER  (solid line: higher strikes lower, up close)

   8  Shogun      ← only a Geisha can touch him while Guarded
        │
   7  Daimyo      ← the Guard: while one lives, the Shogun is Guarded
        │
   6  Onmyoji     ← Cast diagonally: hits anything but a Geisha / Guarded Shogun
        │
   5  Samurai     ← Charge 2 squares (no Strike)
        │
   4  Kunoichi    ← Vault over one piece: hits anything but a Guarded Shogun
        │
   3  Gunner      ← Volley: exactly 2 or 3 squares away
        │
   2  Ronin       ← lowest rank, but they hunt Geisha

   —  Geisha      ← off the ladder, for hire (max half each)

THE UPSETS  (dashed arrow: attacker ┄┄► victim)

   Geisha   ┄┄► Shogun   (even when Guarded)
   Ronin    ┄┄► Geisha, Gunner
   Kunoichi ┄┄► Geisha, and anything else from behind a screen
   Gunner   ┄┄► anything, from exactly 2 or 3 squares away
   Onmyoji  ┄┄► anything, diagonally, up close
   Anything ┄┄► an Exposed Shogun

THE CLOCKS
   Shogun's Shame: 5 of your own quiet Commands with your Shogun still hidden → he is shamed out into the open
   Long Night:     12 quiet Commands in a row → the Battle is counted: most face-up pieces wins

THE CAMPAIGN
   One Honour Seal per Battle won. First to 3 Seals (or 5) takes the Campaign. A Truce earns no Seal: replay the Battle.
   The Omen picks who commands first in Battle 1; the Vanguard alternates after that.
```

- **Arrow direction:** from the attacker to the victim.
- **Loops:** the three-way loop (Geisha → Shogun → Kunoichi → Geisha) is drawn as a small triangle of dashed arrows beside the ladder, so it is visually distinct from the solid ladder.
- A button at the bottom opens the full "who can strike whom" table from §4b.

---

## 16. Sound Design

- **Unveil:** a soft paper-slide with a shamisen pluck. A tiny taiko hit if it reveals a Shogun.
- **March:** a light wooden clack.
- **Strike:** a sword clash. Volley: a booming musket shot with an echo.
- **Vault:** a quick whoosh and a soft landing.
- **Cast:** a chime with a gentle gust.
- **Hired:** a shamisen sting and a coin clink.
- **Geisha's Strike:** a fan snap, then a single sharp sting.
- **The Shogun has appeared:** a conch-shell war horn.
- **Shogun falls:** a deep gong and the crack of a snapping banner.
- **The Long Night falls:** a low drum and a wind sound.
- **Background music:** sparse koto and shamisen, tongue-in-cheek and playful, never solemn.

---

## 17. End Screen Content Mockup

```
        THE WAR CHRONICLE

   Victory to the CRIMSON SUN CLAN
   "Gekokujo! The Geisha fells the Shogun."

   Fallen Shogun   Ivory Moon (at A3)
   Commands        6
   Losses          Ivory: 1 · Crimson: 1

   Honour Seals    Crimson Sun ◆◇◇   Ivory Moon ◇◇◇     (first to 3)

   [ Next Battle ]   [ Leave the Field ]
```

**If the Long Night closes the Battle:**

```
        THE WAR CHRONICLE

   The Long Night has fallen.
   Face-up pieces  Crimson Sun 9 · Ivory Moon 8
   Victory to the CRIMSON SUN CLAN, who held the field.

   Honour Seals    Crimson Sun ◆◆◇   Ivory Moon ◆◇◇     (first to 3)

   [ Next Battle ]   [ Leave the Field ]
```

**If the Long Night ends level (a Truce):** "A Truce. Both banners stand until dawn. No Seal is earned; the Battle will be replayed." The button reads **Replay the Battle**.

**When a player takes the third (or fifth) Seal:** the header reads "The Campaign is won" (or "Crimson Sun takes the Campaign"), the Seals show full, and the button becomes **Raise the Banners Again** (a new Campaign). In a single-Battle Campaign (first to 1) there is no Seal tally and the screen is as in the first mockup with "Raise the Banners Again".

---

## 18. How to Play — Teaching Points

One card per step, in this order:

1. **The Shrouds** — every tile starts face-down. Anyone can Unveil any Shroud.
2. **Your Command** — one action: Unveil, March or Strike.
3. **Raising the Banners** — the first coloured Unveil decides who is Crimson and who is Ivory.
4. **Ranks and Strikes** — higher rank strikes lower rank; the ladder.
5. **The Specialists** — Gunner (Volley, 2 or 3 squares), Kunoichi (Vault), Onmyoji (Cast), Samurai (Charge), Ronin (the lowest rank, but they hunt Geisha).
6. **The Guarded Shogun** — Daimyo shield the Shogun; when both fall he is Exposed.
7. **The Geisha for hire** — flip one and she is yours (but never more than half); she is the only piece that can reach a Guarded Shogun, and only a Ronin or a Kunoichi can stop her.
8. **Shogun's Shame** — keep your Shogun hidden and stall for 5 of your own Commands and he is shamed out into the open.
9. **The Long Night** — if nothing happens for 12 Commands in a row, the Battle ends and the bigger army (face-up pieces) wins.
10. **Winning** — topple the enemy Shogun, or lead on face-up pieces when the Long Night falls. That earns an Honour Seal.
11. **The Campaign** — win Battles to earn Seals; the first player to 3 Seals (or 5) takes the Campaign. A Truce earns nothing and the Battle is replayed; the Vanguard alternates each Battle.
12. **✨ Sylly Mode** — "Coming later. This game doesn't have one yet." `[Placeholder until §8 is designed.]`

---

## 19. Open Questions & Design Notes

**Design notes (balance findings and risks to playtest).** These come from a rules simulator played by simple heuristic bots (1,000 to 2,000 games per setting; differences under 3 points are noise). Human play will differ, especially for the Gunner, Onmyoji and Kunoichi. Full tables are in `balance-findings.md`.
- **Why round 3 happened (the owner's first playtest log, 6 Battles).** The Geisha made the winning strike in 4 of 6 Battles; 1 of 18 hired Geisha was ever killed; the Shogun made 31 of 102 strikes; the Gunner killed 4 and died 15 times; the Onmyoji killed 15 and died 18; Battles ran 47 to 90 Commands (about 100 to 160 seconds). Conclusions: the Geisha was nearly unkillable, the Gunner and Onmyoji were weak, and games were quick enough to carry a Campaign.
- **Ronin and the Geisha.** Letting the lowest rank strike the Geisha turns the weakest piece into a hunter. Bots (aggro against aggro, 2,000 Battles per row), 4 Geisha for hire, showing Battles ended by a toppled Shogun and the Geisha's share of those captures: nobody can hit a Geisha 83% / 79%; Kunoichi only (the old rule) 81% / 77%; Ronin only 75% / 73%; Ronin and Kunoichi together (the adopted rule) **73% / 71%**, with a Geisha dying about once per Battle (the Ronin do most of it). With 2 Geisha: 69% / 62% with no counter, **58% / 49%** with both. The Geisha still decides about two Battles in three at 4 Geisha, but she is now killable; the 4-Geisha dial stays the default and 2 is the calmer option.
- **Battle length and endings (v4 defaults, 4 Geisha):** about 72% of bot Battles end with a toppled Shogun, 25% on piece count at the Long Night, 2.6% in a Truce; median about 50 Commands. With 2 Geisha: 53% / 42% / 4.4%, median about 62. A Truce is rare, so the replay rule fires in about 1 Battle in 40 at the default.
- **Shogun's Shame at 5 and the Long Night at 12.** Shame triggers in about 5% of bot Battles (3% at the old 10-Command clock); switching it off moves about 4 points of endings from a toppled Shogun to the Long Night, so it works as a guardrail without ever being the main event. The Long Night now ends about a quarter of bot Battles on piece count (about 14% at 20). The "Short Night favours the turtle" finding (a staller beat a flip-heavy player 53% to 45% at 12; 51% to 48% at 20, under the v3 face-up count) says a quiet player keeps a small edge at 12, which is the thing to watch in human play.
- **Gunner range 2 or 3, Onmyoji above the Samurai, buffed Kunoichi.** Per Battle, both clans together (kills / deaths): Gunner 1.8 / 2.1 (was 1.0 / 2.2); Onmyoji 1.5 / 1.7 (was 1.4 / 1.8); Kunoichi 1.0 / 1.0; Ronin 1.8 / 2.6; Samurai 1.1 / 1.9. Gunners and Onmyoji still die a little more than they kill, which is fine for support pieces; the Gunner is the one that clearly improved.
- **Hired Geisha:** the clan that hires the first Geisha wins about half the time, so there is no measurable first-flip advantage with bots. The cap rule makes flipping the last Geisha a gift to the opponent, a human-psychology effect the bots cannot test.
- **Campaign.** First to 3 means 3 to 5 Battles, so a Campaign runs roughly 5 to 12 minutes at the observed pace. The Vanguard wins about half of bot Battles, so alternating it is a courtesy more than a correction.
- **Parked ideas:** a Gunner shield (Ronin screen) variant; a "Samurai may strike a Daimyo" toggle (no measurable effect); board size as a setting; the Onmyoji's barrier ability.
- **Opening is slow by nature.** The board starts completely full, so the opening is only Unveils until the first capture creates space.
- **Readability.** Eight piece types with distinct abilities, two clocks, a hire rule and a Campaign mean the Rule Reference button must be one tap away. In the alpha, tiles show the piece's full name under the kanji, because two-letter codes were hard to keep track of.
- **Cultural tone.** Keep the theme playful rather than caricature. "Geisha" as a piece is a pulp trope, not history; decided to keep it. The "outcast" social tiers considered earlier were deliberately left out.

No open questions remain; see the end of the document for what was resolved and what to watch in playtests.

---

## 20. Mood & References

- **Look:** Sengoku-era woodblock prints (ukiyo-e) and ink-wash painting, but cheeky and clean. Palette: crimson red, ivory white, charcoal ink, a touch of gold.
- **Tone:** playful, pun-friendly like the rest of the suite; the narrator is melodramatic about every Strike ("The Shogun has fallen. Gekokujo!").
- **References:** Banqi / Chinese Dark Chess for the core mechanic; Sengoku-era Japan for the cast; the Pecking Order brief for how deeply the rule relationships should be resolved.

---

## 21. Sample Round

### Sample A — a standard Battle (accelerated)

Players: **Mia** (Vanguard) and **Priya** (Rearguard). The Omen picks Mia to command first. This is an unusually short Battle (a typical one runs about 50 Commands); it uses a lucky shuffle to show the core loop end to end. Default settings: 4 Geisha for hire. (A Campaign is a run of Battles like this one; see §6 and C9.)

**The secret layout** (nobody sees this; I = Ivory, C = Crimson, G = a Geisha for hire; Sg Shogun, Dm Daimyo, Sm Samurai, Kn Kunoichi, On Onmyoji, Gn Gunner, Gs Geisha, Rn Ronin). Each clan has exactly 13 pieces: 1 Shogun, 2 Daimyo, 2 Samurai, 2 Onmyoji, 1 Kunoichi, 2 Gunners and 3 Ronin, plus 4 Geisha for hire.

|   | A | B | C | D | E |
|---|---|---|---|---|---|
| **1** | I-Dm | C-Gn | I-Rn | C-Sm | I-On |
| **2** | C-On | I-Kn | C-Dm | I-Gn | C-Rn |
| **3** | I-Sg | G-Gs | I-Sm | C-Rn | G-Gs |
| **4** | C-Sg | I-On | C-Kn | I-Dm | C-Gn |
| **5** | I-Gn | C-Sm | I-Rn | C-On | G-Gs |
| **6** | C-Dm | I-Rn | C-Rn | I-Sm | G-Gs |

**The Battle:**
1. **Command 1 — Mia (Vanguard):** Unveils **C3** → an Ivory Samurai. *Raising the Banners:* Mia is **Ivory Moon**, Priya is **Crimson Sun**.
2. **Command 2 — Priya (Rearguard):** Unveils **B3** → a **Geisha for hire**. Priya hires her: she becomes a Crimson Geisha, standing right next to Ivory's Samurai (the Samurai cannot strike a Geisha). Crimson now holds 1 of its 2 Geisha.
3. **Command 3 — Mia (Vanguard):** Unveils **D3** → a Crimson Ronin, now adjacent to Ivory's Samurai (free prey).
4. **Command 4 — Priya (Rearguard):** Unveils **A3** — a gamble on a hunch — and it is the **Ivory Shogun**, directly beside the Crimson Geisha. The Ivory Shogun cannot move (A2 and A4 are still Shrouds, B3 is occupied) and cannot strike a Geisha. Only a Kunoichi could stop her, and Ivory's is still under a Shroud.
5. **Command 5 — Mia (Vanguard):** Nothing saves the Shogun, so the Samurai Strikes D3, capturing the Crimson Ronin as a consolation.
6. **Command 6 — Priya (Rearguard):** The Geisha Strikes A3. The Ivory Shogun is **Guarded** (both Ivory Daimyo, at A1 and D4, are still alive under Shrouds, and shrouded Daimyo count), but a Geisha ignores the Guard. **The Ivory Shogun falls. Crimson Sun wins.**

**What the table never saw:** 26 of the 30 tiles were still Shrouds when it ended, and three Geisha (E3, E5 and E6) were still waiting to be hired. Ivory's Kunoichi was at B2, directly above the Geisha, so even if Mia had unveiled it she could not have Vaulted at an adjacent target.

### Sample B — hidden information (the Unveil gamble)

Demonstrated in Sample A: Command 2 (Priya unveils a Geisha for hire: whoever flips her hires her, so flipping first is a prize), Command 3 (Mia unveils a piece that benefits only the clan that owns it, a modest one), and Command 4 (Priya unveils an Ivory Shogun: it hands Ivory a powerful piece, but exposes Ivory's Shogun to a Geisha already standing next to it). The Unveil gamble is symmetrical: nobody knows what is under a Shroud, and an Unveil gives its piece to whichever clan owns it, not to the player who tapped (except a Geisha, who goes to the flipper).

### Sample C — mini-scenarios for the special pieces and rules

Each starts from a mid-battle position (all other squares empty unless stated).

**C1 — Charging past the Gunner's blind spot.** Ivory Samurai at C6; Crimson Gunner at C3; C4 and C5 empty. The Gunner hits squares exactly 2 or 3 away along a line (C1, C5, C6, A3, E3, and so on). The Samurai at C6 is exactly 3 away, so it is *in* range; the safe way across is to **Charge** C6 → C4 (through empty C5 into empty C4), which ends adjacent to the Gunner, who cannot hit adjacent targets. Unless the Gunner can flee, the Samurai Strikes C3 next Command (rank 5 beats rank 3).

**C2 — The Vault saves the Shogun.** Ivory Shogun at B1; Crimson Geisha at B2 (adjacent to the Shogun — a threat Ivory must answer now); Ivory Ronin at B4; Ivory Kunoichi at B6; B3 and B5 empty. **Ivory's Kunoichi Vaults** B6 over the Ronin at B4 (the one screen) and Strikes the Geisha at B2, landing there. The Shogun lives. (Had the Kunoichi stood next to the Geisha, she could not have struck: no screen, no Vault. Had the piece beyond the screen been face-down, there would simply have been no Vault.)

**C3 — The Guard falls.** Crimson Shogun at D1; Crimson's last Daimyo at B1; Ivory Gunner at B3; Ivory Ronin at D2 (adjacent to the Shogun); B2 empty. Ivory to move. First, can the Ronin take the Shogun? No — he is Guarded (the Daimyo at B1 lives). Instead, **the Gunner Volleys** from B3 at B1 (exactly 2 squares), capturing the last Daimyo. The Crimson Shogun is now **Exposed**: the adjacent Ronin threatens him next Command. Crimson's reply is forced: the Shogun must capture the Ronin (he outranks it) or flee. The hunt is on.

**C4 — Casting past a blocked corner.** Ivory Onmyoji at B4; Crimson Gunner at C3 (diagonal); B3 and C4 hold Shrouds (so she is boxed in orthogonally). **The Onmyoji Casts** diagonally to C3, capturing the Gunner. She could not have struck either of those orthogonal squares even if they held enemies. (Had a Crimson Daimyo stood on C3, she could have struck it too: the Onmyoji strikes everything except a Geisha and a Guarded Shogun.)

**C5 — The hire cap (4 Geisha).** Crimson has already hired two Geisha. Crimson unveils a third Geisha at E5. Crimson already holds half, so she is **hired by Ivory Moon** and stands at E5 for Ivory. If E5 is next to Crimson's Shogun, Ivory's new Geisha can strike him at once, even while he is Guarded. Flipping a third Geisha is a gift, so Crimson should leave the last ones to Ivory (or hope to hunt them down with a Ronin).

**C6 — Shamed out of hiding.** Ivory's Shogun and both Ivory Daimyo are still Shrouds; a Crimson Ronin is face-up at B3. Ivory has made 5 Commands in a row with no Unveil and no capture. On the fifth, the Ivory Shogun, face-down at B4, is **turned face-up**: *"The Shogun has appeared! Advance on the enemy!"* Both Daimyo are still face-down, so they no longer guard him: he is **Exposed**. The Crimson Ronin Strikes B4 and Crimson wins. Had Ivory unveiled a Daimyo earlier (face-up), the Shogun would still be Guarded. Had Ivory unveiled or captured at any point in those 5 Commands, the count would have restarted. Had the Ivory Shogun already been face-up, nothing would have happened at the fifth Command: Shogun's Shame never applies to a Shogun who is already in the open, and his Guard stays the normal kind (any Daimyo, face-down included).

**C8 — Ronin hunt the Geisha.** Ivory Ronin at C3; a Crimson Geisha hired at C2 (adjacent). The Geisha is one step from Ivory's Shogun, so Ivory cannot ignore her. **The Ronin Strikes C2**, capturing her, the one job a Ronin does that no Samurai can. (A Samurai or Daimyo standing at C3 could not have: only a Ronin or a Kunoichi can strike a Geisha.)

**C9 — Three Seals to win.** Mia and Priya play the default Campaign (first to 3). Mia wins Battle 1 and earns a Seal; Battle 2 ends in a Truce at the Long Night: no Seal, and Battle 2 is replayed with Priya still the Vanguard. Priya wins the replay (1–1), Mia wins Battle 3 (the Vanguard alternates: Mia) and Battle 4 (Priya Vanguard) for 3–1: Mia takes the Campaign. The Omen only decided the Vanguard of Battle 1.

**C7 — The Long Night.** Twelve Commands in a row (six each) pass with no Unveil and no capture. The Battle ends immediately. Crimson has 9 face-up pieces on the board and Ivory has 8 (Shrouds count for nobody), so Crimson wins on piece count and earns the Honour Seal. With 8 each the Battle would end in a Truce, however many Shrouds are still down: no Seal, and the Battle is replayed.

**Sylly Mode sample:** not applicable until §8 is designed.

---

## Open Questions

**None open.** Resolved in round 1: two-player only (2v2 clan roles removed), MDLM or PTP device modes, Kunoichi Vault details (a Vault is only a capture), face-down Daimyo guard the Shogun (except a Shogun shamed out of hiding), Long Night ends the Battle on piece count with a Truce only on equal counts, Surrounded loses, Gunner details, Charge has no cooldown, Geisha tone is fine, Geisha for hire default of 4. (Round 1 also said "no Campaign"; round 3 reversed that, see below.)

Resolved in round 2 (12 Oct 2026):

1. **Shogun's Shame on a face-up Shogun:** it never triggers. It only applies while the Shogun is still face-down. The name "Forced Fight" was a placeholder; it is now **Shogun's Shame** (the Shogun is shamed out of hiding for being too passive).
2. **Shogun's Shame and the Long Night landing at the same moment:** kept as is. Neither should land in a proper match; they are guardrails against a stall-heavy meta.
3. **Long Night count:** face-up pieces only.
4. **Geisha-count setting:** "The Floating World", with Quiet Evening (2) and Grand Banquet (4).
5. **Title:** Hide and Shogun.
6. **Geisha flipped before the banners are raised:** she waits; she belongs to the player who flipped her, and her colour is set once the banners are raised.
7. **Seven standard multiplayer questions:** closed for now; §12 stands as written.

Resolved in round 3 (12 Oct 2026, after the first playtests of the alpha):

1. **Ronin replace the Ashigaru** (the better-known name; masterless, so they answer to no moral code). The lowest rank, and they may strike a Geisha.
2. **Kunoichi buff:** the Vault may strike anything except a Guarded Shogun, whatever its rank. She keeps the Geisha capture (the owner's correction: she is a Geisha counter alongside the Ronin).
3. **Gunner range 2 or 3;** the **Onmyoji ranks above the Samurai** (so a Samurai can no longer strike her by contact).
4. **Shogun's Shame (5 of your own Commands) and the Long Night (12 quiet Commands, 6 each) are fixed rules,** no longer settings. The guardrails stay.
5. **Honour Seals and the Campaign are back:** one Seal per Battle won; the Campaign is **first to 3 Seals (default) or first to 5**, or a single Battle (first to 1).
6. **A Truce earns no Seal and the Battle is replayed.**
7. **The Vanguard alternates each Battle;** The Omen decides it for Battle 1 only.

**To watch in playtests (design questions for the data, not for the owner):**

- How often the Geisha makes the winning strike, and whether a Grand Banquet (4) feels like too much luck now that Ronin and Kunoichi can hunt her.
- Whether anyone ever sees Shogun's Shame in a human game (bots: about 5% of Battles at 5 Commands).
- Whether the Long Night at 12 rewards sitting still.
- Whether the Gunner (range 2–3), Onmyoji and the buffed Kunoichi feel worth the tile when a human plays them, and whether the Ronin feel worth a tile now they hunt Geisha.
- Whether first-to-3 feels right as the default, and whether a replayed Truce feels fair.
