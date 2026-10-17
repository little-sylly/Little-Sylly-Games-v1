# New Game Brief — Flip You For It (grid cap game)

**Draft status:** fourth draft, updated after the first two playable alpha builds. Gameplay items are locked, and so are the name, emoji, abbreviation and colours. Everything else is soft-locked or left open for review, as listed in the closing section. New in this draft: hidden hands by default with an Open Hands setting (§3, §7), a bot opponent with three skill levels (§22), balance results from simulations and a first playtest (§19), and a reference section of hints and tips (§23). This brief is reviewed again before implementation.
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
- **Bots:** a computer opponent now exists in the alpha prototype, as the second player, with three skill levels: Easy, Medium and Hard (§22). When the game joins the suite it will plug into the lobby and the suite's existing bot system, with no gate screens needed.
- **Change from the original game:** the original is two people at a table or a player against the computer. Here each player normally has their own device, so a hidden hand is simply private to its device. In PTP the phone is passed, so hidden hands need gates.

## 3. The Core Loop

**One-sentence turn action:** on your turn, place one card from your hand onto an empty cell of the board.

**Flow of a bout (one game):**
1. **Set-up** (depends on mode, see §7):
   - **Draft:** a pool of 12 random sticker cards appears face up. A coin toss decides who chooses the package; players then take turns picking until each holds 5 cards. Two cards stay in the pool, unused. Hands are hidden by default; the Open Hands setting (§7) shows them. Taken cards leave the pile, so a careful player can work out what the other side holds. Hidden hands here is a memory test.
   - **Quick Match:** 5 random cards are dealt to each player. Hands are hidden by default (Open Hands shows them). A coin toss decides who places first.
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
- **Testing rules (alpha only, all off by default, not part of the locked rules):** two rules from the original Triple Triad can be switched on so we can measure what they do (§19, §23). **Plus:** add the placed edge to the touching edge for each neighbour; if two or more sums match, every enemy card in those pairs flips (walls never count). **Chain Match:** cards flipped by a Match-Up (or Plus) also check for a Match-Up (or Plus) themselves, on top of the usual higher-beats-lower chain. A third testing option widens the wall numbers from 7–9 to 1–9 (§7).
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
| Mode | Draft / Quick Match | Draft = shared pool, snake pick. Quick Match = random deal. |
| Hands | Hidden / Open | `[SOFT-LOCKED]` Default **Hidden** in both modes. Open shows both hands for the whole bout. Playtesting with open hands turned the game into a maths puzzle, so hidden is the default. Tie-Breaker hands are always open (§6). In Draft, hidden is a memory test (§3). |
| Opponent | Player / Bot | `[SOFT-LOCKED]` Player = another person (own device, or pass-the-phone). Bot = a computer opponent (§22). |
| Bot skill | Easy / Medium / Hard | Only shown when Opponent is Bot. Easy plays random legal moves, Medium grabs the most caps it can each turn, Hard searches ahead (§22). |
| Same Wall | ON / OFF | ON gives each wall a random number from 7 to 9, shown on the board edge. S matches any wall. |
| Match length | Best of 3 / Best of 5 | A match is a series of bouts. First to 2 or 3 bout wins. See §3 for the series rules. |
| Turn timer | ON / OFF | ON = 60 seconds per pick or placement. When it runs out, a random legal option is chosen automatically, every time. There are no forfeits yet. |
| Testing options (alpha only) | Wall numbers 7–9 / 1–9, Plus On/Off, Chain Match On/Off | Hidden in a "Testing options" panel, all default to the locked rules (7–9, Off, Off). Kept so the rules can be compared in play and in the Balance lab. They are not proposed for the shipped game (§19, §23). |

- `[ASSUMPTION: the template wants a difficulty-style setting first. Playing a person has no difficulty axis, so Mode leads. When the opponent is a bot, Bot skill is the first setting shown.]`
- **Defaults:** Quick Match, Hands Hidden, Same Wall ON (numbers 7–9), timer OFF, Best of 3, and Medium when playing the bot `[ASSUMPTION]`. Draft is positioned for more advanced players.
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
| Open / hidden hands | Open Hands / Hidden Hands |
| Computer opponent | Bot |
| Bot levels | Easy / Medium / Hard |
| Game record (alpha testing) | Game log |

**Setting names** `[PLACEHOLDER]`:

| Setting | Working name | Option labels |
|---|---|---|
| Mode | The Deal | Swap Pile / Quick Deal |
| Same Wall | Wall Match | On / Off |
| Match length | Best Of | 3 / 5 |
| Turn timer | Flip Clock | On / Off |
| Hands | Hands | Hidden / Open |
| Opponent | Opponent | Pass the phone / Play the bot |
| Bot skill | Bot skill | Easy / Medium / Hard |
| Wall numbers (testing) | Wall numbers | 7 to 9 / 1 to 9 |
| Plus (testing) | Plus | Off / On |
| Chain Match (testing) | Chain Match | Off / On |

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
4. **Is there hidden information?** Yes, by default in both modes: each player's hand is hidden from the other (the Open Hands setting shows both). In Draft the pile shows which caps have been taken, so the other hand can be worked out by a careful player; hidden there is a memory test, not true secrecy.
5. **How is information hidden temporarily?** In MDLM, a hand is only shown on its owner's device, so no gates are needed. In PTP with hidden hands, gate screens: before each turn, a gate says whose turn it is and only that player taps through to see their hand, and a handover prompt shows after a move. With Open Hands on, PTP only needs a light "hand the phone over" prompt.
6. **What if someone leaves mid-match?** For now the match ends and no result is saved.
7. **Can a computer opponent play?** Yes in the alpha, as the second player, at Easy, Medium or Hard (§22), with no gates. Joining the suite's lobby and existing bot system comes later.

## 13. Screens — Plain English List

`[SOFT-LOCKED: kept brief. Screens are locked in during the build.]`

1. **Lobby and setup:** mode, hands (hidden or open), Same Wall, turn timer, match length, opponent (person or bot, with Bot skill), then start (the lobby for MDLM, or straight to setup for PTP).
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
12. **Game log (alpha testing only):** every match played on this device, summarised by setup (Same, Wall and Combo rates, bout results) with a Copy button, so a tester can paste the full record into a chat to be analysed. Not planned for the shipped game.
13. **Balance lab (alpha testing only):** runs thousands of bot-versus-bot bouts with the same engine and reports win rates and how often Match-Up, Wall Match and Chain Reaction happen. Not planned for the shipped game.

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
7. **Draft vs Quick Match:** how hands are chosen or dealt, and what is hidden (hands are hidden by default; Open Hands shows them).
8. **Winning and Scoring** (fixed title): the held card counts. Ties go to Tie-Breaker Bout. A match is won by winning 2 bouts (best of 3) or 3 bouts (best of 5).
9. **✨ Sylly Mode** (fixed card): not yet available. The card says so honestly, as Honeycomb Hills does. `[ASSUMPTION]`

`[NOTE FOR TEMPLATE REVISION: a scripted, playable tutorial (a guided demo, not free play, showing Same and Same Wall and maybe Draft) is wanted for this game, and the suite is moving to tabbed tutorials. The brief template needs its own section for this. For now this list covers the teaching points only. Evidence-backed tips and a list of candidate in-game hints are recorded in §23.]`

## 19. Open Questions & Design Notes

- Balance of the first and second placer: measured in single-bout simulations (see "Measured so far" below). With competent bots the second placer is favoured. Whole-match simulations are still to do. Fallback if one side is favoured: the second picker chooses who places first. Not applied yet.
- Tuning to confirm by simulation: first-placer win rate, how often Same, Same Wall and Combo trigger, how often a pool is re-generated, the fair-deal tolerance, the key-number rule, the wall range.
- Sylly Mode ideas (trading, swapping) are skipped for now.
- Best of 3 and best of 5 change the balance picture: the first-placer advantage or disadvantage is spread over several bouts, and the seats swap each bout (§3). Simulate whole matches as well as single bouts. The length estimates in §3 need replacing with measured times.
- Win rate and tuning constants should live in one place so they can change without touching the rules.

**Measured so far (alpha 2).** Source: the Balance lab and simulation scripts (bots playing thousands of bouts on the real engine and pool generator), plus one tester's logged games. Unless stated, Quick Deal, hidden hands, Same Wall ON with numbers 7–9, opening round only. "Same", "Wall" and "Combo" mean a Match-Up, a Match-Up that needed a wall number, and a Chain Reaction.

*Seat balance.*
- Random (Easy) bots: the first placer wins about 53–54%. Medium and Hard bots: the first placer wins about 34–44% across runs (Hard against Hard: 41% hidden, 34% with open hands; samples of 100, so give or take 5 points). Competent play favours the second placer, as the earlier first-draft simulations also found (second placer about 57–62%).
- About half of Hard-versus-Hard opening rounds end 5–5 and go to a Tie-Breaker (46% hidden, 53% open). Against random bots it is about 30%. Seats swap every bout, so the edge should even out across a match (whole-match runs still to do).
- The pool generator throws away about 3 in 4 first attempts (it re-rolls until the key-number, S-cap and answer checks pass), and about 4 in 5 first Quick Deals fail the fair-deal check. Both are instant, so this is a tuning note, not a problem.

*How often Match-Up, Wall Match and Chain Reaction happen.*

| Bots (both sides) | Match-Up in a bout | Match-Ups per placement | Wall-dependent per placement | Chain Reaction in a bout |
|---|---|---|---|---|
| Easy | 30% | 3.8% | 1.8% | 12% |
| Medium | 72% | 12.6% | 9.1% | 62% |
| Hard, hidden hands | 53% | 7.6% | 4.4% | 32% |
| Hard, open hands | 45% | 5.8% | 4.4% | 23% |
| Hard, hidden, wall numbers 1–9 | 58% | 9.4% | 5.4% | 33% |
| Hard, hidden, Same Wall OFF | 25% | 3.1% | none | 12% |

- **Is Same Wall "useless"?** No. With it ON, about three quarters of the Match-Ups medium bots make involve a wall, and turning it OFF cuts Match-Ups in half (Medium: 72% of bouts down to 35%). Hard bots need the wall number to make a Match-Up in about 35% of their bouts.
- **Should the wall numbers go lower?** It would not change how often walls matter. An outer edge matches its wall about 15% of the time whatever the range (7–9: 15%, 4–9: 18%, 1–9: 16%, 1–5: 16%). That is because S matches any wall, and the generated edges are dense around 4–6 and 9. For comparison, two touching edges are equal about 12% of the time. A lower range only changes which edges are at risk. It is left at 7–9, with 1–9 kept as a testing option.
- **Why Chain Reaction feels rare:** by design it can only start from a Match-Up, so it can never be more common than Match-Up. It happens in about a third of bouts between strong bots. Strong bots also avoid setting up Match-Ups for the other side, which is why Hard sees fewer than Medium (53% against 72% of bouts).
- **Comparison with the original Triple Triad:** there, Same, Plus and Combo are optional rules. A combo re-checks Same and Plus for every flipped card, and Plus is the commoner trigger. We kept only Same and a simpler combo. Testing the original's extras on Medium bots: Chain Match alone changes little (Chain Reaction in 65% of bouts against 62%), Plus roughly lifts Match-Ups per placement from 12.6% to 20.7% and Chain Reaction to 82% of bouts, and both together reach 86%. So if Chain Reactions turn out too rare in human play, Plus is the lever. Plus was cut from the locked rules, so this is a decision for later.
- **Generator:** the key-number rule matters. Snapping 50% of edges to the two key numbers (current) gives 12.6% Match-Ups per placement for Medium bots. With no snapping it falls to 9.5%, with 80% snapping it rises to 18.4%. Taking both key numbers from 4–6 changes nothing (12.7%). Edge numbers in a pool: 4 and 5 are most common (about 17% and 16%), 9 is 12%, S is 5%, and 1 is only 3%.

*First human playtest (one tester, 8 matches, 15 bouts, against Hard, hidden hands, Quick Deal, wall 7–9).* The tester lost all 15 bouts, and some of the lessons are in §23. Headline numbers: 3 Match-Ups in 68 of the tester's placements against 14 in 67 for the bot; 0 Chain Reactions against 9; and after 48% of the tester's moves the bot had a Match-Up reply available, against 27% the other way. The sample is one person against the strongest bot, so treat it as a pointer, not a measurement. Next playtest: the same tester against Medium.

- **Still to do:** simulate whole matches, run Hard-versus-Hard with more bouts (the figures above are samples of 100), run a playtest against Medium, and decide whether the information advantage in §22 needs fixing before Hard is used as the reference opponent.

## 20. Mood & References

A playground challenge: "I'll flip you for it." Cheerful, tactile, a little cheeky and competitive. Sticker art on collectible caps, played on a chalk hopscotch board on tarmac, all on the suite's warm stone page. Not corporate, not dark-mode neon gaming. References: Triple Triad (Final Fantasy VIII) for the rules, and 1990s pogs and milk caps for the pieces.

## 21. Sample Round

### Sample A: Draft, Open Hands, Same Wall OFF, timer OFF

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

Net-Trace and Counting Sheep stay in the pile. This sample uses the Open Hands setting, so both hands are open throughout.

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

## 22. Bots

`[NOTE FOR TEMPLATE REVISION: the brief template only mentions bots as a yes/no question (§12 Q7). A bot section was added here to record how the behaviour was chosen, what testing showed and what was adjusted. The template probably wants a section like this for any game with a bot.]`

### Goal

A computer opponent so one person can test or play alone. It has three levels so there is something to beat at every skill. The owner's request for the top level was "play optimally with the information it has", with an easy level that plays random moves.

### Who and where

- The bot is always the second player (tangerine). The human is the first player (cobalt) and is called "You"; the bot is called "Bot".
- Bot skill (Easy, Medium, Hard) is chosen on the setup screen when Opponent is set to Bot (§7). Nothing else changes: same rules, same timer rules, no gate screens.
- In Draft the bot also picks caps, and when the bot holds the coin toss choice it picks one of the two packages at random.
- A bot move shows after a short pause (about 0.65 to 1.15 seconds) so the move can be followed. Hard uses another 0.3–0.5 seconds of that thinking on its first moves.

### How each level behaves

| Level | Behaviour | Why it is there |
|---|---|---|
| Easy | A random legal move. A random cap when drafting. | A beatable baseline, and the zero point for measuring everything else. |
| Medium | Plays the move that leaves it with the most caps on the board right now. Ties broken at random. Never looks at what the opponent can do next. Drafts the cap with the highest total, with a little noise. | Takes every Match-Up and flip it can see, but walks into replies. A fair opponent for learning. |
| Hard | Searches the game ahead and plays the move with the best expected result. It cares about winning, drawing (5–5) or losing first, and the size of the margin only breaks ties. Drafts by total plus a bonus for its highest edge. | The best opponent we can build with the information it is allowed. |

**How Hard works (plain English).** It imagines every possible move and reply, as far ahead as it can afford, and assumes the other side always answers as well as possible. With open hands it knows the opponent's caps, so it can look at the real game. With hidden hands it does not, so it guesses several possible hands for the opponent, works out its best move for each guess, and plays the move that does best on average. For the last few moves of a bout, when little is left to guess, it solves the game exactly. On its early moves it typically looks four to five moves ahead. Each look-ahead stops at a node budget so a move never takes more than about half a second.

### What the bot may know

- Its own hand, the board, the wall numbers, and which caps were in the pool of 12 (so it can list the caps the opponent might hold). It never reads the opponent's hand when hands are hidden. A test confirms this: the bot's decision does not change when the opponent's real hand is swapped.
- With Open Hands on, the bot reads the opponent's hand, because the human can see it too.
- In the Draft and in Tie-Breakers the bot treats the opponent's hand as known, because it can be worked out from the pile and the board.
- **Known imbalance:** in Quick Deal the bot knows the whole pool of 12 caps, so it knows the opponent's hand is 5 of the 7 caps it cannot see. The human is not shown the pool, so cannot know this. That makes Hard slightly better informed than the person it plays. Decision for later (§19 "Still to do"): show the pool to the human, or let the bot guess from a wider set of caps.

### How the behaviour was chosen

1. **First alpha:** Easy random; Medium greedy; and a third level called "Sharp" that shortlisted six moves by greedy score, then looked one reply ahead against one or two guessed opponent hands. It was built as a quick way to get a tougher opponent for balance testing.
2. **After the first playtest the request was for a bot that plays as well as it can with the information it has.** Sharp was replaced by Hard, a deeper search that can solve the game exactly when little is hidden. The reasons for a search and not a rules-of-thumb bot: the board is tiny (nine cells, at most five caps each), so a search can look far ahead; there are no random events during a bout, so a search can trust its own predictions; and a bot that is described as optimal needs a reason to believe it is.
3. **For hidden hands** the standard answer for a card game is to guess several hands and solve each. It cannot bluff or be deliberately unpredictable, and it can be misled if the opponent plays a hand that is unlikely, but it is a strong baseline.
4. The labels changed from Easy / Medium / Sharp to Easy / Medium / Hard so the ladder reads at a glance.

### What testing showed

**Checks that the bots are doing what we say**
- With open hands, Hard's chosen move was compared with a brute-force solver built on the main rules engine, in 24 test positions with five moves left, spread over the four rule variants (plain, Plus, Chain Match, both): every time Hard's move was as good as the best available.
- With hidden hands, a test confirms Hard never reads the opponent's real hand: it plays the same move when the opponent's hand is swapped for a different one.
- Hard's search runs on a separate, faster copy of the rules. The brute-force comparison above is what ties it back to the main rules engine.
- Every bot level only ever produces legal moves (tested over 60 full bouts).

**Strength ladder (bots playing Quick Deal, hidden hands, wall ON; share of bouts won; Hard samples are 150 bouts, so give or take 4 points)**

| Matchup | First named wins | Second named wins | Shared draws |
|---|---|---|---|
| Medium against Easy | 82% | 18% | 1% |
| Hard against Medium | 93% | 7% | 0% |
| Hard against Easy | 99% | 1% | 0% |

**Hard against a person (first playtest, one tester, hidden hands):** the tester lost all 15 bouts. Replaying the games move by move through the engine showed that the early moves were fine and the games were lost in the middle of the bout. The details, and what they suggest for hints, are in §23.

**What bots do to the game's numbers:** see §19. The short version: stronger bots avoid setting up Match-Ups for each other, so they see fewer than Medium, and about half of Hard-versus-Hard opening rounds tie 5–5.

### Adjustments made so far

- Sharp replaced by Hard; labels renamed Easy / Medium / Hard.
- The first version of Hard took about 3.2 seconds to pick its opening move with open hands and 1.6 seconds with hidden hands. The search was rewritten to use compact arrays and a table of positions it has already scored, and the budget was set to 50,000 nodes. It now takes about 0.5 and 0.3 seconds.
- The Hard bot's budget in the Balance lab is lower (8,000 nodes, 3 guessed hands) so thousands of bouts can run, so lab numbers for Hard are slightly weaker play than the one the player meets.
- Tie-Breaker rounds and the Draft are treated as known information for the bot.
- Nothing was done to weaken Hard or to change the rules in response to the playtest: the 0–15 result was recorded and kept as evidence.

### Known limits and open questions

- **Hard may be too strong to be fun for most people.** In the first playtest it won every bout. The next step is a playtest against Medium. If Medium is still too hard, a middle level (for example Hard with fewer look-ahead moves, or Hard that sometimes plays its second-best move) is easy to add.
- **Information imbalance in Quick Deal** (see above).
- **"Optimal" is approximate.** On its first one or two moves Hard sees only about four to five moves ahead and averages over six guessed hands, so it is not a perfect solver there.
- **Drafting is rule-of-thumb only.** The bot picks by card total with a bonus for its best edge; it does not search the draft. It also ignores what the human has already taken.
- The bot is always the second player and has no personality, no taunts and no varied style.
- Bots are not yet connected to the suite's lobby or its bot system (§12).

---

## 23. Hints & Tips (reference)

A record of what the simulations and the first playtest taught us, kept so it can feed How to Play (§18), the scripted tutorial, in-game hints and the end screen later. Nothing here changes the rules. Evidence is labelled: **[SIM]** is from thousands of bot bouts; **[PLAYTEST]** is from one tester's 15 logged bouts against Hard (hidden hands, wall 7–9), so is a pointer only.

### Player-facing strategy tips (candidates)

1. **The bout is decided in the middle.** [PLAYTEST] Every opening placement kept the game level. In 13 of 15 bouts there was one move that turned a drawable or winning position into a lost one, and in 11 of those 13 it was one of moves 3 to 6 of the bout. The engine marked 17 of the tester's 60 placements as clearly costly, and 16 of those were moves 4 to 6.
2. **Check the gaps before you place.** [PLAYTEST] After 48% of the tester's moves the bot had a Match-Up reply available (about two caps on average), against 27% the other way. The danger is an empty cell touching two of your caps, or one cap and a wall, where a single number could face both.
3. **Look for your own Match-Ups every turn, walls included.** [PLAYTEST] The tester had a Match-Up available on 16 turns and played one on three of them. On five of those turns it would have flipped more caps than the move played, and four of the five depended on a wall number. The bot used a wall-dependent Match-Up six times, the tester three.
4. **Walls need only one match.** [SIM] A wall counts as one of the two matched sides, and S matches any wall. A cap on an edge cell needs one touching cap to match. Hard bots need the wall in about 35% of bouts.
5. **Chain Reactions only follow a Match-Up.** [PLAYTEST] The bot made 9 Chain Reactions in 67 moves, the tester none. Getting a chain means making the Match-Up first.
6. **Expect a tight finish.** [SIM] About half of Hard-versus-Hard opening rounds end 5–5, so one slip decides a bout. The second placer needs 5 of the 9 board caps (the pocket cap is the sixth point); the first placer needs 6 but plays last.
7. **Your pocket cap is a choice.** The second placer keeps the cap they do not place, so the last cap in hand counts for a point; choose which one to keep with that in mind.
8. **Strong caps first or last?** Not settled. [PLAYTEST] The bot opened with stronger caps (average total 24 against the tester's 19), but the engine rated every opening as level, so it is not an error either way.
9. **Corners or edges?** Not settled. [PLAYTEST] The tester put about 60% of caps in corners; the bot put about 63% on edge cells and about 28% in corners. This is a pattern worth testing, not a rule.

### Facts about the rules that surprised us

- **Match-Up is the engine of the game** [SIM]: wall numbers on, bots see a Match-Up in 30–72% of bouts depending on skill, wall off cuts that roughly in half.
- **Stronger bots see fewer Match-Ups** [SIM]: Hard 53% of bouts against Medium 72%, because it avoids exposing them.
- **Plus is the lever for more Chain Reactions** [SIM]: Plus lifts Chain Reaction from 62% to 82% of Medium-bot bouts; Chain Match alone barely changes it (§19).
- **Edge numbers** [SIM]: 4 and 5 are the commonest edges (about 17% and 16%), 9 is 12%, S is 5%, 1 is 3%. Two touching edges match about 12% of the time; an edge matches its wall about 15% of the time.

### Candidate in-game hints (not built)

- **Placement preview:** when a cap and a cell are selected, highlight the Match-Ups (including wall matches) and show which caps would flip. Possibly a setting for newer players, off for experts. Addresses the missed wall Match-Ups above.
- **Danger glow:** after placing, outline empty cells where an opponent cap could make a Match-Up. Would need care in hidden-hand play, because it must not reveal what the opponent holds.
- **Wall highlight:** glow a wall number when the selected cap has an edge on that side equal to it (or an S).
- **Turning-point recap:** on the end screen (§17), mark the move with the biggest swing and show what the best alternative would have been. The engine can already produce this (it is what the playtest analysis used).
- **Tutorial scene:** the scripted tutorial (§18) should include a Match-Up that depends on a wall number, because it is the commonest missed play.

---

## Open Questions & Soft Locks

Nothing below is hard-locked unless it says so. This brief is reviewed again before implementation.

**Locked:** the gameplay rules (see the spec), the name Flip You For It, the 🥏 emoji, the abbreviation `fyfi`, and the colours (cobalt for the brand and Player 1, tangerine for Player 2).

**Soft-locked (working decisions to review before implementation)**
- The series rules and the Best of 3 default (§3, §7).
- Hands hidden by default with an Open Hands setting (§3, §7), and the three bot levels (§22).
- The testing options (wall numbers 1–9, Plus, Chain Match) staying out of the shipped rules unless play-testing says otherwise (§19).
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
- Whether the Hard bot should know the 12-card pool in Quick Deal when the human does not (§22), and how strong Hard should be. Playtest against Medium first.
- Whether to add a placement preview for Match-Ups and wall matches as a hint (§23).

**Noted for later**
- A spectator or TV view and a host-only mode (not in the suite yet).
- A scripted tutorial, and a separate section for it in the brief template.
- Sylly Mode (skipped for now).
- Balance and tuning by simulation, including whole matches (§19).
- Bots inside the multi-device lobby and the suite's existing bot system.
- Using the engine to show a turning-point recap on the end screen (§17, §23).

---

## Technical Notes for Stage 2 (extra notes, not part of the non-technical brief)

- **Suite constraints:** vanilla JS with no external libraries, mobile-first, all visuals and audio generated programmatically.
- **Device model:** the default is the suite's multi-device lobby, so the engine must be host-authoritative about state and hand visibility, with a seeded pool so every client builds the identical pool. Pass-the-phone is the option and adds the gate screens. The match state (series score, seat swaps) lives outside the bout engine, so the bout engine stays pure.
- **Engine design:** write the rules as pure, deterministic functions (state in, state out), so a bot can plug in as a move source and a simulation harness can run thousands of matches.
- **Generator:** seeded, so a pool can be re-created exactly. Validation re-rolls pools that fail the key-number, S-cap and answer checks. Tunables (fair-deal tolerance, key-number rule, wall range, tier budgets) live in one config object.
- **Sticker assets:** reuse the existing sticker PNGs as they are (white outline built in). The cap body, rim, number plates, rank effects, chalk board and wall numbers are drawn programmatically (SVG or canvas, with gradients and filters, no extra image files). Each sticker is scaled to fit the face, clipped to it, slightly tilted, and drawn under the number plates.
- **Combo resolution:** because flips only ever move a card toward the mover's colour, the final result does not depend on the order the chain is processed.
- **Timer:** starts after the gate tap in PTP, and when the turn begins in MDLM. On expiry, pick a random legal option and repeat on every expiry.
- **Balance harness:** measure first-placer win rate, trigger frequency of Same, Same Wall and Combo, and generator re-roll rate before locking constants. Built in the alpha (the Balance lab) and extended with per-placement rates, bot skill, hidden or open bot information, wall range and the optional Plus and Chain Match rules.
- **Bot engine:** three levels behind one move function. Hard is an alpha-beta search with a transposition table and iterative deepening on compact arrays, checked against a brute-force solver built on the main rules engine in the tests. With hidden hands it solves several sampled opponent hands and averages (§22). A single Hard move takes about 0.3–0.5 seconds at the default budget of 50,000 search nodes.
- **Optional rules:** Plus and Chain Match are flags carried in the game state, off by default, so they cost nothing when unused and are covered by the same tests.
- **Game log:** the alpha keeps the last 40 matches in local storage and exports them as one JSON text. Per bout: seed, key numbers, wall numbers, the 12 caps, draft picks, hands. Per placement: seat, cap, cell, thinking time, every flip with its kind (Match-Up, plain, chain) and depth, Same and wall flags, running score, and for bot moves the search depth and number of sampled hands. A summary table per setup is included at the top. Copying is by clipboard button with a select-all text box as the fallback, because file downloads are not available inside the artifact page.
