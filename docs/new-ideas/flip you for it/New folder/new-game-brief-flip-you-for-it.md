# New Game Brief — Flip You For It (grid cap game)

**Draft status:** third draft. Gameplay items are locked, and so are the name, emoji, abbreviation and colours. Everything else is soft-locked or left open for review, as listed in the closing section. This brief is reviewed again before implementation.
**Marker key:** `[ASSUMPTION: ...]` = a decision made on your behalf. `[CLARIFICATION NEEDED: ...]` = needs your input. `[PLACEHOLDER]` = provisional wording to be checked before the pre-build review. `[SOFT-LOCKED: ...]` = a working decision, reviewed again before implementation. `[OPEN FOR BUILD: ...]` = to be tried out and decided while building.

**Terminology note:** this brief and the gameplay spec say "card" for the game piece. In the finished game the piece is a round collectible **cap** (a disc, like a pog or milk cap) wearing a game sticker. "POG" is a trademark, so it is not used in the game. The rules text keeps "card" so it stays aligned with the spec and the code until the vocabulary check (§9) settles the player-facing word.

**Bouts and matches:** a **bout** is one game on the board (set-up to result, including any Sudden Death rematches). A **match** is a series of bouts, best of 3 or best of 5 (§3, §7). The spec and some older wording use "match" for a single bout.

---

## 1. Identity

- **Title:** **Flip You For It.** It has a strong rhythm and quotes the playground coin-toss line ("I'll flip you for it"). It sets a casual, high-stakes tone and names the verb that drives the game, and the match opens with a coin toss.
- **Emoji:** 🥏 (flying disc). It reads as a disc or cap collectible. `[NOTE: emoji colours differ by platform, so don't rely on it matching the cobalt brand colour.]`
- **Abbreviation:** `fyfi` (confirmed).
- **Game number:** 21 in the suite.
- **Core type:** 2-player tactical collectible duel on a 3x3 grid. Place caps, flip your opponent's caps to your colour, finish with the most caps.
- **Fun moment in 10 words:** One placement flips half the board in a single chain reaction.
- **Inspiration:** the card mini-game from Final Fantasy VIII (Triple Triad). Adapted, not copied: the pieces are round caps in the style of 1990s pogs, wearing the suite's own game stickers, and the hands come from a draft or a hidden deal.
- **Unique to the suite:** the first head-to-head game built for two, on two phones or one phone passed between friends, and the suite's first collectible game where the caps are the other games.

## 2. The Players

- **Player count:** exactly 2. `[ASSUMPTION: this is below the suite's usual 3–8 range, but Great Minds already sets a 2-player precedent, and more 2-player games are wanted.]`
- **Sweet spot:** 2 (the only count).
- **Device:** by default each player uses their own device through the suite's multi-device lobby (MDLM). Pass-the-phone (PTP) is an option, with gate screens (see §12 and §13).
- **Roles:** both players are equal, but the two seats play differently:
  - **The first placer** plays 5 cards and makes the final move of the bout.
  - **The second placer** plays 4 cards and keeps 1 card in hand, which still counts toward their score.
- **Bots:** solo play against a computer opponent is wanted later. It will plug in as the second player, reusing the lobby and the suite's existing bot system, with no gate screens needed.
- **Change from the original game:** the original is two people at a table or a player against the computer. Here each player normally has their own device, so a hidden hand is simply private to its device. In PTP the phone is passed, so hidden hands need gates.

## 3. The Core Loop

**One-sentence turn action:** on your turn, place one card from your hand onto an empty cell of the board.

**Flow of a bout (one game):**
1. **Set-up** (depends on mode, see §7):
   - **Draft:** a pool of 12 random sticker cards appears face up. A coin toss decides who chooses the package; players then take turns picking until each holds 5 cards. Two cards stay in the pool, unused. Hands are open.
   - **Quick Match:** 5 random cards are dealt to each player. Hands are hidden. A coin toss decides who places first.
2. **Placement:** players alternate placing one card each turn until all 9 cells are full.
3. **Resolution:** every placement can flip cards, in this order:
   1. **Same:** if the placed card matches 2 or more touching edges, every matched enemy card flips.
   2. **Basic:** any touching enemy card with a lower touching edge flips.
   3. **Combo:** every card flipped by Same now acts as if just placed, flipping any adjacent enemy with a lower touching edge, and so on down the chain.
4. **Result:** count cards in each colour, plus 1 for the second placer's held card. Most points wins. A 5–5 tie goes to Sudden Death.
5. **The match:** a match is a series of bouts, **best of 3 or best of 5** (a setting). Winning a bout scores 1 match point. The first to 2 (best of 3) or 3 (best of 5) wins the match.

**Series rules** `[SOFT-LOCKED: working rules, reviewed before implementation]`:
- Every bout is a fresh set-up: a new pool or deal and, if Same Wall is ON, new wall numbers. In Draft, players draft again each bout.
- The coin toss happens once, at the start of the match. In each later bout the two seats swap, so whoever had the coin winner's choice last bout does not have it this bout.
- A shared draw (two tied Sudden Death rematches) gives neither player a match point, and an extra bout is played.
- The match score (for example "1–0") shows on the board and between bouts.

**Length** `[ASSUMPTION: rough guesses to confirm in playtests]`: one bout takes about 3–4 minutes in Quick Match (9 placements plus flip animations) and 5–7 minutes in Draft (10 picks first). So best of 3 is roughly 6–12 minutes in Quick Match and 10–20 in Draft, and best of 5 is roughly 9–20 in Quick Match and 15–35 in Draft. A best-of-5 Draft may be long for a party game, so Draft might need a shorter default or a note on the setup screen. `[OPEN FOR BUILD]`

## 4. Rule Relationships & Interaction Matrix

**Ranks:** each card edge is a rank from 1 to 9, or **S** (the top rank, worth 10).

**Basic comparison (a placed edge against the touching enemy edge):**

| Placed edge | Beats | Ties with (no flip) | Loses to (no flip) |
|---|---|---|---|
| 1–8 | all lower ranks | the same rank | all higher ranks |
| 9 | 1–8 | 9 | S |
| S | 1–9 | S | nothing |

**Same (two touching edges equal):**

| Touching pair | Counts as a match? |
|---|---|
| Same rank (e.g. 5 and 5) | Yes |
| S and S | Yes |
| S and 9 | No |
| Placed edge and a wall (Same Wall ON) | Yes if the edge equals that wall's number, **or the edge is S** |
| Placed edge and a wall (Same Wall OFF) | Never. Walls do nothing. |

**Special cases:**
- **Closed loops:** none. Ranks are a straight line, so nothing beats something that beats it.
- **Dead ends:** an **S edge** cannot be beaten by the basic comparison. It can only be captured when another S lands against it and triggers Same. This is balanced by the cap of at most two S edges per card and the pool rule that an S threat must have a possible answer.
- **Cross-category link:** the wall is the only cross-category element. It counts as a matched side for Same, is never flipped, and never triggers a basic flip.
- **Wildcards:** the "Wildcard" tier is just a low-power card tier. It has no special interactions.
- **Same threshold:** a wall match counts as one of the two matched sides needed, but at least one matched side must be an **enemy card**. Two wall matches alone, with no enemy card, flip nothing.
- **Combo chain:** only cards flipped by Same start a chain. Cards flipped by the basic rule do not. Chained flips use the basic comparison only and never re-trigger Same.
- **Sylly Mode:** none yet, so no modifications to restate.

## 5. Winning

- A bout ends when all 9 cells are full. The winner scores a match point (§3).
- Score = cards in your colour on the board, plus 1 point if you were the second placer and still hold your last card. The two scores always total 10.
- **6 or more points wins.**
- **5–5:** Sudden Death (§6).
- The second placer therefore wins with 5 of 9 board cards, while the first placer needs 6. The first placer's compensation is the last move.

## 6. Scoring

- Every card on the board in your colour is worth 1 point. The held card is worth 1 point.
- The lowest possible score is 0 for the first placer (no cards in their colour at the end) and 1 for the second placer.
- **Tie (5–5) → Sudden Death:**
  - The board is cleared. Each player's hand is the 5 cards in their colour (the second placer's held card included). Hands are now open to both players.
  - The roles swap: whoever placed second now places first.
  - Wall numbers (if Same Wall is ON) stay the same.
  - There are at most **2 rematches**. If the second rematch also ties, the bout ends as a **shared draw**.
- The match score exists only while the match is running. Nothing is saved after it.

## 7. Settings

| Setting | Options | Notes |
|---|---|---|
| Mode | Draft / Quick Match | Draft = shared pool, open hands. Quick Match = random hidden hands. |
| Same Wall | ON / OFF | ON gives each wall a random number from 7 to 9, shown on the board edge. S matches any wall. |
| Match length | Best of 3 / Best of 5 | A match is a series of bouts. First to 2 or 3 bout wins. See §3 for the series rules. |
| Turn timer | ON / OFF | ON = 60 seconds per pick or placement. When it runs out, a random legal option is chosen automatically, every time. There are no forfeits yet. |

- `[ASSUMPTION: the template wants a difficulty-style setting first. This game has no difficulty axis yet, so Mode leads. Bot difficulty will be the first setting when bots arrive.]`
- **Defaults:** Quick Match, Same Wall ON, timer OFF, Best of 3 `[ASSUMPTION]`. Draft is positioned for more advanced players.
- Setting names have placeholder thematic wording in §9.
- Sylly Mode would be the last setting, but it is skipped for now (§8).

## 8. Sylly Mode

**None. Skipped for now.** The game is not live, and the aim is to complete each game's package before starting new ideas, so a real Sylly Mode waits (a couple of other games in the suite are also still pending). Using Draft as a placeholder for trading or playing for keeps was considered and dropped as wasted effort. Ideas for later: card trading or swapping mid-match (the best-of-3 and best-of-5 series now makes this possible), and wild or mystery cards. Nothing is decided.

## 9. Thematic Vocabulary

Everything here is `[PLACEHOLDER]`. The terms are checked before the pre-build review. They should echo "flip" and the playground coin toss.

| Generic term | Working term |
|---|---|
| Match (the series) | The Match |
| Round / one game | Bout |
| Score / points | Caps Held |
| Match score | Bouts Won |
| Game over screen | Final Tally |
| Play again | Rematch |
| Quit | Leave the Playground? |
| Settings overlay title | House Rules |
| Draft | The Swap Pile |
| Pool | The Pile |
| Coin toss | The Toss |
| The coin winner's choice | Call It |
| Flip a card | Flip It |
| Same | Match-Up |
| Same Wall | Wall Match |
| Combo | Chain Reaction |
| Sudden Death | Tie-Breaker Bout |
| The S rank | Super (S) |
| Held card | Pocket Cap |
| Card tiers | Legend / Veteran / Specialist / Wildcard |
| Game piece | Cap (working term; the sticker is the art on it) |

**Setting names** `[PLACEHOLDER]`:

| Setting | Working name | Option labels |
|---|---|---|
| Mode | The Deal | Swap Pile / Quick Deal |
| Same Wall | Wall Match | On / Off |
| Match length | Best Of | 3 / 5 |
| Turn timer | Flip Clock | On / Off |

## 10. Word Bank & Content

**Cap art:** each card (cap) carries one of the suite's game stickers (20 games, 20 stickers so far). The sticker files are PNGs with the white outline built in. As the catalogue grows, the available card art grows with it. A match only needs 12.

| Games with stickers |
|---|
| Like I'm Five · Great Minds · Secret Signals · Just Enough Cooks · You Get It? · Late to the Party · Natural Selection · Deep-Sea Deploy · Group Therapy · The Bluff · Bailed · Pass · Net-Trace · Fruit Salad · Counting Sheep · Flawless · Pecking Order · Cookie Jar · Cold Shoulder · Honeycomb Hills |

This game's own sticker joins the pool (21 once it exists), and may be the one sticker always reserved as a Legend, depending on how good its artwork is.

**Rules for what a card is:**
- Each card (cap) shows a sticker as its art, four edge values at the compass points (Top, Right, Bottom, Left) and its tier.
- Stats are randomly generated for every bout, so a sticker is flavour only. It is never "the strong one."
- A pool never repeats a sticker.

**Tiers (the 12-card pool):**

| Tier | Point total (S = 10) | Cards in pool |
|---|---|---|
| Legend | 28–33 | 2 |
| Veteran | 22–27 | 4 |
| Specialist | 16–21 | 4 |
| Wildcard | 10–15 | 2 |

**Generation rules:**
- Each pool picks 2 key numbers, and at least 40% of all edges use them. Suggested: one from 7–9, so it lines up with wall numbers, and one from 4–6. `[ASSUMPTION: tuned later.]`
- No card has more than 2 S edges.
- **Answer check:** every Legend edge of 8 or higher must have at least one other card that can answer it, meaning an opposite-facing edge that is at least as high (an S edge needs another S). Pools that fail are re-generated.
- **Card shapes** (behind the scenes only, never shown to players): Corner Anchor, Spike, Wall, Balanced, Same Trap. Same Trap lives in the Specialist tier.
- **Fair deal (Quick Match):** the two hands' point totals must be within a small tolerance of each other. A slightly stronger side is fine, a large gap is not.

**Example card:** Natural Selection sticker, Legend tier. Top 8 / Right 8 / Bottom 8 / Left 5 (total 29).

## 11. Custom Visual Assets

All visuals are drawn programmatically, apart from the existing sticker PNGs. The owner holds the Gemini mockups as the visual reference for the build (see "Reference mockups" below).

### Colours

| Role | Colour | Hex | Notes |
|---|---|---|---|
| Brand colour **and** Player 1 | Cobalt | `#2563eb` | Play button, active pills, ON toggles, title accent ("Flip You" in ink, "For It" in brand). Label text uses the darker rung `#1d4ed8`. White ink passes at about 5:1. Player 1's caps use the same colour, as Deep-Sea Deploy does. |
| Player 2 | Tangerine | `#f97316` | Gameplay colour only. Never used on buttons, pills or toggles (One Brand Rule). Darker label rung `#c2410c`. |
| Player 1 rim | Deep cobalt | `#1e3a8a` (dark shade `#172554`) | Tonal, same hue as the face. |
| Player 2 rim | Burnt orange | `#c2410c` (dark shade `#7c2d12`) | Tonal, same hue as the face. |
| S marker | Gold / amber | `#FBBF24` ring, `#b45309` letter | Small accent only. Not a brand colour. |
| Page, text | Stone | unchanged | Warm stone `#fafaf9` page, `#292524` ink, per DESIGN.md. |

**Why this pair:** red and blue made the game feel like tic-tac-toe or Connect 4. Two contrasting colours are enough as the ownership cue for now (owner decision), to revisit only if playtests show the two sides getting confused. Cobalt against tangerine is clearly different on the shelf, is the safest kind of pair for common colour blindness, and has a big lightness gap. Cobalt is a clear gap in the existing 20 brand colours, so no other game's colour needs to change. (An earlier plan to shift You Get It? and Honeycomb Hills to make room for a gold brand colour is dropped. Those two remain near-twins, `#f59e0b` and `#F0A500`, which is a separate tidy-up.)

### The cap

- A round disc, about 85 px across on a phone board, with real thickness and a soft shadow underneath.
- **Face:** the player's colour, with a lighter glow at the centre and a gentle fade toward the edge.
- **Rim:** a thin raised band (about 9–10% of the radius) in a darker shade of the same colour, drawn as four arcs with gaps at the compass points where the number plates sit. A soft highlight runs along the outer edge.
- **A flip** turns the cap over like a coin and lands in the new colour, face and rim together. `[ASSUMPTION: animation uses transform and opacity only.]`

### The numbers

- Four plates, one at each compass point (top, right, bottom, left), none at the diagonals.
- Each plate is a white circle seated in a ring made from the rim material, centred on the line where rim meets face, with a soft bevel, a dark groove and a small shadow, so it reads as built into the cap and not stuck on.
- Digits: bold, rounded, charcoal `#292524`, always upright, never rotated. Plates are roughly 17–24% of the cap's diameter, and digits should be at least about 12 px tall at the board size. Tune this on a real phone.
- **The S:** the plate stays white like the others, with a gold ring (`#FBBF24`) and a deep amber letter `#b45309`. A gold glyph on white fails on contrast (about 1.7:1), and a gold plate disappears against the orange cap.
- No letters anywhere on the cap except S.

### The sticker art

- The existing sticker PNG, white outline kept. No second borderless set is made.
- Scaled so its longest side is roughly 90–100% of the face diameter and clipped to the face, running **underneath** the number plates, like a pog with full-surface art.
- A slight random tilt of a few degrees per cap and a soft shadow, so it looks stuck on.
- A soft edge fade toward the rim colour (about 25–35%) so the plates clearly sit above the art. Where a sticker doesn't fill the face, the face glow shows around it.

### Rank effects

`[SOFT-LOCKED]` A thin outer edge band in the tier's material, around the tonal rim: Legend holographic foil with a soft glow, Veteran chrome, Specialist patterned, Wildcard plain. Richer overlaid effects are also welcome, for example a sparkling gold shimmer on Legend. `[OPEN FOR BUILD: mock up and choose during the build.]` Card shapes get no visual treatment.

### The board

- **Chalk hopscotch on tarmac.** A rounded (24 px) dark-grey tarmac panel with a faint asphalt grain sits on the stone page inside the single column. The 3x3 grid is drawn on it in white chalk with slightly wobbly lines. Empty cells are just chalk squares.
- **Wall numbers:** one thick, bright chalk numeral per side (four in total), shown only when Same Wall is ON. Numerals only, no letters.
- **Caps stay crisp.** Chalk dust is for the lines and wall numbers only, never on the caps.
- Chalk is generated in code (a wobble displacement plus a grain mask), with no image files.
- Felt and a wooden tray were mocked up and passed over. Chalk is the one that is literally the playground behind the name.
- **Two surface options, to be tried during the build:** (A) **dark cement**, a dark-grey tarmac panel with white chalk, as in the mockups; (B) **light pavement**, a pale warm-grey pavement panel with charcoal chalk, which sits more calmly on the stone page. `[OPEN FOR BUILD: DESIGN.md keeps gameplay surfaces flat and calm and rejects dark-mode gaming looks, so option A needs a quick check against that.]`

### Other assets

- **Coin toss:** a large two-sided coin, one side cobalt and the other tangerine, caught mid-flip. No gold is needed.
- **Gate screens (PTP only):** new, drawn to match.
- **Inspect view:** tapping and holding a cap shows it large, with the game's name.

### Reference mockups (kept by the owner)

Gemini sheets covering the rank effects, the three board frames, the numbering styles and the latest cap with real stickers. They are style references only. Several include extra interface that must **not** be copied (header, round counter, settings card, letters on the walls), and their blue and red player colours are superseded. A live code prototype of the cap and board was tried, but the plate integration and art size were still not right, so the latest Gemini cap sheet is the target for the build.

### DESIGN.md additions

```
colors:
  fyfi-cobalt: "#2563eb"
  fyfi-tangerine: "#f97316"
```

## 12. Multiplayer Classification

These answers are the brief's own.

1. **How do people play together?** By default each player is on their own device through the suite's multi-device lobby (MDLM). Option: pass-the-phone (PTP), two people on one phone with gate screens.
2. **Is anyone watching only?** Not yet. A spectator or TV view (public information only: the board, plus open hands in Draft) and a host-only mode are not implemented in the suite, so they are noted for review later.
3. **Who acts at the same time?** Nobody. Turns alternate.
4. **Is there hidden information?** Yes, in Quick Match: each player's hand is hidden from the other. In Draft, nothing is hidden.
5. **How is information hidden temporarily?** In MDLM, a hand is only shown on its owner's device, so no gates are needed. In PTP, gate screens: before each Quick Match turn, a gate says whose turn it is and only that player taps through to see their hand, and a handover prompt shows after a move.
6. **What if someone leaves mid-match?** For now the match ends and no result is saved.
7. **Can a computer opponent play?** Not at launch. Later, as the second player, reusing the lobby and the existing bot system, with no gates.

## 13. Screens — Plain English List

`[SOFT-LOCKED: kept brief. Screens are locked in during the build.]`

1. **Lobby and setup:** mode, Same Wall, turn timer, match length, then start (the lobby for MDLM, or straight to setup for PTP).
2. **Coin toss:** a large two-sided coin, cobalt on one side and tangerine on the other, flips and the winner is shown.
3. **Package choice (Draft only):** the winner picks "choose first, place second" or "choose second, place first."
4. **The Pile (Draft):** the 12 cards, with the current picker highlighted.
5. **Gate (PTP only):** names the next player and waits for their tap. The turn timer starts after the tap.
6. **The board:** 3x3 grid, your hand, scores, match score, wall numbers (if ON), the timer (if ON).
7. **Inspect:** the slide-up large card view.
8. **Between bouts:** the bout result, the match score and a button for the next bout.
9. **Tie-Breaker intro:** shows both new hands and who places first.
10. **Final Tally:** the match result.
11. **How to Play** and **House Rules** (settings) overlays, plus the scripted tutorial (§18).

## 14. Complex Interaction / UI Spec

**Placing a card** is more than one tap, so every input is listed:

```
+----------------------------+
|  Scores  Match 1-0  Timer  |
|  [wall numbers on edges]   |
|        +---+---+---+       |
|        | 1 | 2 | 3 |       |
|        +---+---+---+       |
|        | 4 | 5 | 6 |       |
|        +---+---+---+       |
|        | 7 | 8 | 9 |       |
|        +---+---+---+       |
|  [card][card][card][card]  |
+----------------------------+
```

- **Tap a card, then tap a cell** (primary).
- **Drag a card onto a cell.**
- **Tap a cell, then tap a card.** Works the same either way round.
- **Confirmation:** a placement is confirmed by a second tap on the same cell. `[ASSUMPTION: this stops accidental placements on a small screen.]`
- **Drafting:** tap a card in the pile to pick it. A small centred confirmation box (3 or fewer elements) appears.
- **Inspect:** tap and hold any card. The scrollable slide-up panel shows it large.

## 15. Rule Reference / In-Game Cheat Sheet

A scrollable overlay, the same shape as How to Play, reachable from the board:
- Rank order: 1 < 2 < … < 9 < S.
- Flip rules, in the order they resolve: Same, Basic, Combo.
- What matches for Same (equal numbers, S with S, wall numbers, S with any wall).
- A small example picture of a Combo chain, with arrows showing which card flips which.
- Scoring, including the held card.
- Sudden Death.

## 16. Sound Design

Suggested cues, all short and tactile: card placed, card flipped, a rising pitch for each card in a Combo chain, a bright chime for Same, a tick in the last 10 seconds of the timer, coin flip, win, draw. Music: light, playful, loopable.

## 17. End Screen Content Mockup

```
        FINAL TALLY
   [winner] wins the match 2 – 1
   Bout scores: 7–3 · 4–6 · 6–4
   (board snapshot: final state of the last bout)
   (short turn-by-turn recap, optional)
   Biggest Chain Reaction: 3 caps
   Caps flipped: [n]
   [ Rematch ]  [ House Rules ]  [ Leave ]
```

`[SOFT-LOCKED]` The log is the end state plus, at most, a short turn-by-turn recap. A full turn-by-turn log is low priority. A shared draw shows both names and "Caps split."

## 18. How to Play — Teaching Points

Order of the overlay's cards (one per step), then the two fixed cards:
1. **The goal:** finish with more cards than your opponent.
2. **Reading a card:** four numbers, one per edge. Higher beats lower. S is the top rank.
3. **Placing:** pick a card and a cell. Touching enemy cards with a lower number flip to your colour.
4. **Match-Up (Same):** if two or more edges match, every matched enemy card flips.
5. **Wall Match:** (only when Same Wall is ON) walls have numbers too. S matches any wall.
6. **Chain Reaction (Combo):** cards flipped by a Match-Up can flip more cards.
7. **Draft vs Quick Match:** how hands are chosen or dealt, and what is hidden.
8. **Winning and Scoring** (fixed title): the held card counts. Ties go to Tie-Breaker Bout. A match is won by winning 2 bouts (best of 3) or 3 bouts (best of 5).
9. **✨ Sylly Mode** (fixed card): not yet available. The card says so honestly, as Honeycomb Hills does. `[ASSUMPTION]`

`[NOTE FOR TEMPLATE REVISION: a scripted, playable tutorial (a guided demo, not free play, showing Same and Same Wall and maybe Draft) is wanted for this game, and the suite is moving to tabbed tutorials. The brief template needs its own section for this. For now this list covers the teaching points only.]`

## 19. Open Questions & Design Notes

- Balance of the first and second placer is unproven. Plan: build the engine, then run thousands of simulated matches to measure it. Fallback if one side is favoured: the second picker chooses who places first.
- Tuning to confirm by simulation: first-placer win rate, how often Same, Same Wall and Combo trigger, how often a pool is re-generated, the fair-deal tolerance, the key-number rule, the wall range.
- Sylly Mode ideas (trading, swapping) are skipped for now.
- Best of 3 and best of 5 change the balance picture: the first-placer advantage or disadvantage is spread over several bouts, and the seats swap each bout (§3). Simulate whole matches as well as single bouts. The length estimates in §3 need replacing with measured times.
- Win rate and tuning constants should live in one place so they can change without touching the rules.

## 20. Mood & References

A playground challenge: "I'll flip you for it." Cheerful, tactile, a little cheeky and competitive. Sticker art on collectible caps, played on a chalk hopscotch board on tarmac, all on the suite's warm stone page. Not corporate, not dark-mode neon gaming. References: Triple Triad (Final Fantasy VIII) for the rules, and 1990s pogs and milk caps for the pieces.

## 21. Sample Round

### Sample A: Draft, Same Wall OFF, timer OFF

**Players:** Priya and Jack. Coin toss: Priya wins and chooses Package A (picks first, places second). Jack is Package B (picks second, places first).

**The Pile (12 cards).** Edges are Top / Right / Bottom / Left.

| Sticker | Tier | Edges | Total |
|---|---|---|---|
| Natural Selection | Legend | 8 / 8 / 8 / 5 | 29 |
| Pecking Order | Legend | S / 8 / 5 / 8 | 31 |
| Late to the Party | Veteran | 8 / 8 / 8 / 2 | 26 |
| Bailed | Veteran | 8 / 3 / 3 / 8 | 22 |
| Fruit Salad | Veteran | 6 / 6 / 6 / 5 | 23 |
| Cookie Jar | Veteran | 3 / 8 / 8 / 3 | 22 |
| Flawless | Specialist | 3 / 4 / S / 3 | 20 |
| The Bluff | Specialist | 5 / 5 / 5 / 5 | 20 |
| Deep-Sea Deploy | Specialist | 8 / 8 / 2 / 2 | 20 |
| Great Minds | Specialist | S / 2 / 3 / 5 | 20 |
| Net-Trace | Wildcard | 5 / 3 / 2 / 4 | 14 |
| Counting Sheep | Wildcard | 3 / 4 / 5 / 2 | 14 |

Check against the rules: tiers are 2 / 4 / 4 / 2, and every total is inside its tier's range. The key numbers are 8 and 5, used by 24 of 48 edges (50%). No card has more than one S. The answer check passes: Natural Selection's Top 8 is answered by Late to the Party's Bottom 8, Pecking Order's Top S by Flawless's Bottom S, and so on.

**Draft (snake: Priya, Jack, Jack, Priya, Priya, Jack, Jack, Priya, Priya, Jack):**
1. Priya: Pecking Order
2. Jack: Natural Selection
3. Jack: Late to the Party
4. Priya: Cookie Jar
5. Priya: Great Minds
6. Jack: Flawless
7. Jack: The Bluff
8. Priya: Bailed
9. Priya: Fruit Salad
10. Jack: Deep-Sea Deploy

Net-Trace and Counting Sheep stay in the pile. Both hands are open throughout.

**Board.** Cells are numbered 1–9, reading left to right, top to bottom:

```
1 2 3
4 5 6
7 8 9
```

**The nine moves (Jack places first):**

| # | Player | Card, cell | What happens |
|---|---|---|---|
| 1 | Jack | The Bluff → 4 | Empty board. Nothing flips. |
| 2 | Priya | Cookie Jar → 7 | Its Top 3 against The Bluff's Bottom 5: loses. No flips. |
| 3 | Jack | Flawless → 2 | No neighbours. Nothing flips. |
| 4 | Priya | Bailed → 9 | No neighbours. Nothing flips. |
| 5 | Jack | Deep-Sea Deploy → 1 | Touches only his own cards (Flawless, The Bluff). Nothing flips. |
| 6 | Priya | Great Minds → 5 | **Same:** her Top S matches Flawless's Bottom S, and her Left 5 matches The Bluff's Right 5. Two matches, both enemy: **both flip**. **Combo:** The Bluff (now Priya's) has Top 5 against Deep-Sea Deploy's Bottom 2: **Deep-Sea Deploy flips.** Flawless (Left 3) against Deep-Sea Deploy (Right 8) doesn't flip. The chain ends. Priya now holds 6 board cards, Jack 0. |
| 7 | Jack | Natural Selection → 6 | Same: Bottom 8 matches Bailed's Top 8, but that is only one match, so no Same. Basic: Left 5 against Great Minds's Right 2: **Great Minds flips to Jack.** Bottom 8 against 8 is a tie. Basic flips never start a chain. |
| 8 | Priya | Pecking Order → 3 | Bottom 5 against Natural Selection's Top 8: loses. No flips. She keeps Fruit Salad in hand. |
| 9 | Jack | Late to the Party → 8 | Right 8 matches Bailed's Left 8, only one match, so no Same. No basic flips. Final move. |

**Result:**
- Priya's board cards: Deep-Sea Deploy (1), Flawless (2), Pecking Order (3), The Bluff (4), Cookie Jar (7), Bailed (9) = 6.
- Jack's board cards: Great Minds (5), Natural Selection (6), Late to the Party (8) = 3.
- Priya holds Fruit Salad: +1.
- **Final: Priya 7, Jack 3. Priya wins.**

### Sample B: Quick Match with gates, Same Wall ON

**Players:** Mia and Ben. Coin toss: Mia places first. Both hands are hidden.

**Gate sequence for the first two turns:**
1. The gate screen says "Pass to Mia." Ben looks away. Mia taps "I'm Mia." Her hand and the empty board appear.
2. Mia places a card. A handover screen appears.
3. The gate screen says "Pass to Ben." Ben taps "I'm Ben" and sees his own hand and the board. Mia's remaining hand stays hidden.

**Walls this bout:** Top 8, Right 7, Bottom 9, Left 8, shown on the board edges.

**A Wall Match:** Natural Selection (Ben's) sits at cell 5, centre, with Top 8. Mia places Late to the Party (Top 8 / Right 8 / Bottom 8 / Left 2) at cell 2 (top middle).
- Its Top 8 matches the Top wall (8): **one match.**
- Its Bottom 8 matches Natural Selection's Top 8: **second match, and an enemy card.**
- **Natural Selection flips.** Under the basic rule alone it would not, because 8 against 8 is a tie. Wall Match made the difference.

If she'd played Great Minds (Top S) at cell 2 instead, its Top S would match the Top wall whatever the wall's number.

### Sample C: Sudden Death

At the end of a bout Ben (first placer) has 5 board cards and Mia (second placer) has 4 plus her held card: 5–5.
- The board is cleared. Ben's hand is his 5 board cards. Mia's hand is her 4 board cards plus her held card. Both hands are now open.
- Mia, previously the second placer, places first. The wall numbers stay.
- If that rematch ties again, the roles swap again (Ben first) and play once more.
- If the second rematch also ties, the bout ends as a shared draw.

---

## Open Questions & Soft Locks

Nothing below is hard-locked unless it says so. This brief is reviewed again before implementation.

**Locked:** the gameplay rules (see the spec), the name Flip You For It, the 🥏 emoji, the abbreviation `fyfi`, and the colours (cobalt for the brand and Player 1, tangerine for Player 2).

**Soft-locked (working decisions to review before implementation)**
- The series rules and the Best of 3 default (§3, §7).
- MDLM as the default with PTP as the option (§12).
- Draft played in every bout, which makes Draft best-of-5 long. Length estimates are rough (§3).
- Placeholder vocabulary and setting names (§9), to check before the pre-build review.
- The tier effects as a thin outer edge band (§11).
- The screens list (§13) and the end screen (§17).

**Open for build**
- Dark cement against light pavement for the board, and the sparkling gold overlay for tiers.
- Polish of the cap (plate integration, art size, number size on a real phone) from the latest cap mockup.
- Mockups for the hand tray, The Pile, the inspect view, the gate screens and Final Tally.
- A second ownership cue beyond colour, only if playtests show a need.

**Noted for later**
- A spectator or TV view and a host-only mode (not in the suite yet).
- A scripted tutorial, and a separate section for it in the brief template.
- Sylly Mode (skipped for now).
- Balance and tuning by simulation, including whole matches (§19).

---

## Technical Notes for Stage 2 (extra notes, not part of the non-technical brief)

- **Suite constraints:** vanilla JS with no external libraries, mobile-first, all visuals and audio generated programmatically.
- **Device model:** the default is the suite's multi-device lobby, so the engine must be host-authoritative about state and hand visibility, with a seeded pool so every client builds the identical pool. Pass-the-phone is the option and adds the gate screens. The match state (series score, seat swaps) lives outside the bout engine, so the bout engine stays pure.
- **Engine design:** write the rules as pure, deterministic functions (state in, state out), so a bot can plug in as a move source and a simulation harness can run thousands of matches.
- **Generator:** seeded, so a pool can be re-created exactly. Validation re-rolls pools that fail the key-number, S-cap and answer checks. Tunables (fair-deal tolerance, key-number rule, wall range, tier budgets) live in one config object.
- **Sticker assets:** reuse the existing sticker PNGs as they are (white outline built in). The cap body, rim, number plates, rank effects, chalk board and wall numbers are drawn programmatically (SVG or canvas, with gradients and filters, no extra image files). Each sticker is scaled to fit the face, clipped to it, slightly tilted, and drawn under the number plates.
- **Combo resolution:** because flips only ever move a card toward the mover's colour, the final result does not depend on the order the chain is processed.
- **Timer:** starts after the gate tap in PTP, and when the turn begins in MDLM. On expiry, pick a random legal option and repeat on every expiry.
- **Balance harness:** measure first-placer win rate, trigger frequency of Same, Same Wall and Combo, and generator re-roll rate before locking constants.
