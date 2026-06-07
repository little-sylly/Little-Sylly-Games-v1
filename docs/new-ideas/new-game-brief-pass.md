# New Game Brief — Pass
**Document type:** Phase 1 — Design Brief
**Version:** v0.1 — first draft for review
**Source game:** Paodekuai / Pao De Kuai (跑得快) — "Run Fast", a Chinese climbing/shedding game. Known to the owner's group as "Pass".
**Status:** Parked pending MFS v1.4. This game is multiplayer-dependent — see §10.

> ⚠️ **This is a different kind of game for the box.** Every existing Little Sylly game is a turn-based party/word/deduction game with discrete phases. Pass is a **real-time competitive card game with a genuine playing-card engine**. It has no word bank, no hidden roles, no clue-giving, no settings-heavy overlays. It introduces a card model, a combination-detection engine, and rapid turn cycling. The architectural implications are flagged throughout — read §12 carefully before any technical spec.

> ⚠️ **MFS Revisit Required.** Pass is fundamentally a multiplayer game — each player holds a private hand. It cannot be played pass-the-phone in any reasonable way (you'd be passing the phone dozens of times per round and hiding hands constantly). It should be built multiplayer-first and may not have a meaningful single-device mode at all. See §10.

---

## On the Title

**Recommended: "Pass."** It's what the owner's group calls it, it's the game's most frequent verbal action, and it's short and clean. The only risk is that "Pass" is a generic word — but within the box it's distinctive precisely because no other game uses it.

Alternatives if "Pass" feels too plain:
- **"Run Fast"** — the literal translation, action-forward
- **"Shed"** — the card-game family name (shedding games), short
- **"Empty Hands"** — the win condition as a title
- **"Last Card"** — evokes the climax of every round

This brief uses **Pass**. Short ID: `pas`. Lock before technical spec.

---

## 1. Identity

| Field | Answer |
|-------|--------|
| **Full game name** | Pass |
| **Short ID / abbreviation** | `pas` |
| **One-sentence tagline** | *"Empty your hand. Or get stuck holding the worst cards."* |
| **Thematic universe** | This is a pure card game — the "theme" is the cards themselves. The Little Sylly spin is in presentation, not fiction: a clean, tactile, satisfying digital card table with the box's warm aesthetic. No characters, no story. The elegance IS the theme. |
| **Emoji / icon** | 🃏 |
| **Brand colour** | A card-table felt tone — `green-700` or `emerald-800`. Distinct from existing games and thematically obvious. |

---

## 2. The Players

| Field | Answer |
|-------|--------|
| **Player count range** | 3–4 (the standard Paodekuai count). 3 is the classic; 4 is a common variant. |
| **Teams or individuals?** | Individuals — every player for themselves. |
| **Roles?** | No roles. All players are equal. The only asymmetry is who holds which cards. |
| **Hidden information?** | Yes — every player's hand is private. This is the entire structural basis of the game. |
| **Minimum meaningful count** | 3. Below that it isn't this game. |

### Deck composition (single deck, no jokers)

- **3 players:** A common variant removes some cards so the deal is even, OR deals unevenly (one player gets more). The cleanest digital approach: 3 players × 17 cards = 51, remove one card (often a black 3 or the lowest card) so 51 are dealt and the holder of a designated card leads. *Confirm the exact deal with the owner — house rules vary. Owner's group's specific deal is the source of truth.*
- **4 players:** Standard 13 cards each, full 52-card deck dealt evenly.

### Card ranking (low → high)

`3 4 5 6 7 8 9 10 J Q K A 2`

The **2 is the highest single card** (not the Ace). Suits do not affect rank in most Paodekuai (a pair of 5s is a pair of 5s regardless of suit) — though some house rules use suit as a tiebreaker for the lead. *Confirm suit handling with owner.*

---

## 3. The Core Loop

**In one sentence:** Be the first to get rid of all your cards by playing higher combinations than the previous player, or passing when you can't.

**The central tension:** Every turn is a decision — beat the current play and stay in control, or pass and conserve your strong cards for later. Hold your bombs too long and you get stuck with them; play them too early and you waste their power. The race to empty your hand is constant pressure.

**Game type:** ☑ Real-time competitive card game (climbing/shedding family)

**One complete round, step by step:**

1. **Deal.** Each player receives their hand (private to them). Cards are auto-sorted by rank in their hand view.

2. **The lead.** The player holding the designated lead card (commonly the 3 of a particular suit, or the lowest card) plays first. They may lead any single card or any valid combination (see §5 for the combination grammar).

3. **Going around.** Play proceeds in order. On your turn you must either:
   - **Beat** the current play with a higher combination *of the same type and same number of cards* (a pair beats a pair, a 5-card straight beats a 5-card straight), OR
   - **Pass** (you play nothing this turn).
   - Two exceptions: a **Bomb** (four of a kind) beats any non-bomb combination regardless of type, and a higher bomb beats a lower bomb.

4. **Passing and resetting.** When all other players pass in succession, the player who made the last (highest) play wins the "trick" — the table clears, and that player leads again with anything they like.

5. **Emptying your hand.** The moment a player plays their last card, they're out and finish in that place (1st, 2nd...). Play continues among the remaining players to determine the rest of the standings.

6. **Round ends** when only one player is left holding cards — they come last.

7. **Scoring.** Players score based on finishing position and/or cards remaining in losers' hands (see §6). Play a fixed number of rounds, or to a target score.

**Real-time, not phased:** Unlike every other game in the box, this has no discrete "everyone submits then reveal" structure. Turns cycle rapidly, one player at a time, and the active player changes constantly. This is the core technical challenge (see §12).

**Phone handling:** Multiplayer only, realistically. Each player holds their private hand on their own device and plays in real-time turn order. See §10.

---

## 4. Winning

| Field | Answer |
|-------|--------|
| **How does a round end?** | When all but one player has emptied their hand. |
| **How does a game end?** | After a fixed number of rounds (e.g. 5 or 10), or when a player reaches a target score. |
| **How is the winner determined?** | Lowest score (if scoring by cards-left penalties) or highest score (if scoring by finishing position) — see §6. Pick one model. |
| **Ties possible?** | Possible but rare with cumulative scoring; a final-round tiebreak can resolve it. |
| **Session length** | Each round is fast — 3–6 minutes. A full game of several rounds: 15–30 minutes. |

---

## 5. Card Combinations (the combination grammar)

This is the rules engine. Each combination type can only be beaten by a higher combination of the **same type and size**, except bombs.

| Combination | Definition | Beaten by |
|-------------|-----------|-----------|
| **Single** | One card | A higher single |
| **Pair** | Two cards of the same rank | A higher pair |
| **Triple** | Three cards of the same rank | A higher triple |
| **Straight** | 5+ consecutive cards by rank (mixed suits OK). 2 cannot be used in a straight. | A higher straight of the *same length* |
| **Double straight (consecutive pairs)** | 3+ consecutive pairs, e.g. 7-7-8-8-9-9. 2 excluded. | A higher consecutive-pair run of the same length |
| **Triple + attachment** (variant) | A triple plus a single or a pair (e.g. three 8s + a 5). Often called "airplane" when chained. | A higher equivalent of the same shape |
| **Bomb (four of a kind)** | Four cards of the same rank | A higher bomb only. **Beats every non-bomb combination.** |

**Notes:**
- The exact combination set varies by house rules. The owner's group's accepted combinations are the source of truth — **confirm the full list before the technical spec.** The table above is the common Paodekuai core.
- "Same length" matters for straights: a 5-card straight cannot be beaten by a 6-card straight — only by a higher 5-card straight.
- Whether triple-with-attachment and airplane combos are included is a house-rules decision. Recommend starting with the core six (single, pair, triple, straight, double-straight, bomb) and adding attachments only if the owner's group uses them.

---

## 6. Scoring

Two viable models — pick one (confirm with owner):

**Model A — Cards-left penalty (most common):**
- The winner (first to empty) scores 0 penalty.
- Each remaining player scores penalty points equal to the number of cards left in their hand when the round ends.
- Optional multiplier: holding 10+ cards (never played a single card) can double the penalty — the classic Paodekuai "stuck" punishment.
- Lowest cumulative penalty after N rounds wins.

**Model B — Finishing position points:**
- 1st place: +3, 2nd: +1, 3rd: 0, last: −1 (adjust for player count).
- Highest cumulative score wins.

**Recommendation:** Model A (cards-left penalty). It's the traditional scoring, it creates the "don't get stuck" tension that defines the game, and the running penalty total is easy to display. The "doubled if you never played" rule is a great bit of flavour worth keeping.

---

## 7. Settings

Minimal — this is a rules-fixed card game.

| Setting | What it changes | Options | Default |
|---------|----------------|---------|---------|
| **Players** | Table size | 3 / 4 | (set at lobby) |
| **Rounds** | Game length | 5 / 10 / First to score | 5 |
| **Combinations** | Which combos are legal | Core / Core + Airplanes | Core |

No Sylly Mode at launch — see §8.

---

## 8. Sylly Mode

**Recommendation: no Sylly Mode for v1.** Pass is a tight, traditional card game — its appeal is its clean ruleset, and bolting on a gimmick risks breaking the careful balance of a centuries-refined game.

That said, three *viable* options if you want one later (all parked for post-launch):

- **"Wildcard"** — at the start of each round, one rank is randomly declared wild (any card of that rank can substitute into any combination). Adds chaos without breaking the core loop. The most promising option.
- **"Sudden Death"** — the last card you play must be a single (you can't go out on a bomb or combination). Forces tense endgame planning. A small rule tweak, low implementation cost.
- **"Robin Hood"** — before each round, the previous round's winner passes their two highest cards to the previous round's loser, who passes back their two lowest. A catch-up mechanic (this is actually a traditional rule in some climbing games like Tichu/President — "the scum and president card swap"). Keeps games competitive. Genuinely good, worth considering even for v1.

**The Robin Hood / card-swap option is the strongest** and is a real traditional mechanic in this game family — flag it for discussion, but default to no Sylly Mode for the first build.

---

## 9. Thematic Vocabulary

Light touch — this is a card game, so most terms are standard card terminology. A few Little Sylly flourishes:

| Generic term | Pass calls it |
|---|---|
| Your cards | **Your Hand** |
| The current play to beat | **On the Table** |
| Play no cards | **"Pass"** |
| Play cards | **"Play"** / **"Throw"** |
| Win a trick (everyone passed) | **"Table's Yours"** |
| Empty your hand | **"Out!"** |
| Last player holding cards | **"Stuck"** (the loser) |
| Four of a kind | **Bomb 💣** |
| Round | **Hand** (one deal) |
| Game over | **Final Tally** |
| Winner | **(simple — "Winner" or player name)** |
| Play again | **"Deal Again"** |
| Quit | **"Leave the Table?"** |
| How to Play title | **"How to Play 🃏"** |

Keep the voice clean and confident — this game's elegance is its theme. Over-theming would cheapen it.

---

## 10. Multiplayer Classification

| Field | Answer |
|-------|--------|
| **Primary mode** | **Multiplayer only (individual devices).** Each player holds a private hand and plays in real-time turn order. |
| **Private information** | Every player's entire hand. This is the whole game. |
| **Simultaneous actions?** | No — but turns cycle *rapidly*, one active player at a time, with the active player changing every few seconds. This is different from the readyCheck "everyone submits then reveal" pattern used elsewhere. It's a fast-rotating single-active-player model. |
| **Locked devices?** | Non-active players' devices show the table state and their own hand but cannot play until it's their turn. The active player's device enables play controls. |
| **Pass-the-phone fallback?** | **Not viable.** A round has dozens of turns; passing and hiding the phone each time would be unbearable. Recommend **no single-device mode** for v1. If a fallback is ever wanted, it would be a "hot-seat" mode with a privacy gate per turn — but this is a poor experience and should not be a launch goal. |

> ⚠️ **MFS Revisit — §10 is critical for this game.** Pass needs:
> - Real-time turn passing (the active player baton moves around the table continuously)
> - Live table-state sync (every device sees the current play and whose turn it is, updated instantly)
> - A turn-timeout mechanism (if a player disconnects or stalls, the game must auto-pass or handle it gracefully)
> - This is a more demanding sync model than the turn-based, phase-gated games. **Confirm the MFS v1.4 architecture can support rapid real-time turn cycling before committing to this game.** It may need sync patterns beyond what the party games require.

---

## 11. Screens — Plain English List

This game is essentially one screen — the card table — plus setup and results.

1. **Game menu** — title, How to Play, settings (rounds, combinations), Back to the Box
2. **Setup / lobby** — players join (multiplayer lobby). Table size confirmed.
3. **The Table (main screen)** — the persistent play area. Shows: the current play "on the table", whose turn it is, each opponent's card count (face-down backs), and your own hand (face-up, sorted). Your action controls (select cards → Play / Pass) appear when it's your turn and are disabled otherwise. This screen is the entire game.
4. **Hand result** — when a hand (round) ends: finishing order, penalty points, running tally
5. **Final Tally** — game over: final standings, winner

---

## 12. Design Notes — Technical Reality Check

**This is the most technically distinct game proposed for the box.** It needs things no existing game has:

### A. A card model and combination engine
- A representation of a 52-card deck, dealing, and per-player hands
- A **combination detector**: given a set of selected cards, determine what valid combination (if any) they form, and its rank
- A **combination comparator**: given the current play and a proposed play, determine if the proposed play legally beats it (same type, same size, higher rank — or a bomb)
- Hand sorting and grouping for the player's view
- This is real game-logic engineering — the most complex pure-logic component in the box. It's well-defined (the rules are stable and known) but it is not trivial. Budget for it.

### B. Real-time turn cycling
- The "active player" baton moves continuously. This is not the phase-gated, everyone-submits model of the party games.
- Needs instant sync of: current play on the table, whose turn it is, each player's remaining card count, pass/play events.
- Needs disconnect/timeout handling — if a player drops mid-turn, the game must not freeze.

### C. The card table UI
- Selectable cards in hand (tap to select/deselect, visual lift)
- Clear display of "on the table" vs your hand
- Opponent hand-counts (face-down)
- Smooth play/throw animations — card games live or die on tactile feel
- This is a new UI paradigm for the box (no existing game renders playing cards)

### D. No word bank — but a card asset question
- No `words.json` or content file needed.
- **Decision needed:** are playing cards rendered as SVG/CSS (drawn programmatically, scalable, no image files, fits the offline/no-CDN constraint) or as image assets? **Recommend SVG/CSS-drawn cards** — consistent with the box's synthesised-everything philosophy (synth audio, no image files), scalable, and offline-friendly. This is itself a small build project (a reusable card-rendering component) but pays off if more card games follow.

### Strategic note
If Pass is built, the **card model, combination engine, and card-rendering component become reusable infrastructure** for future card games (Big Two, Dou Dizhu, President, etc.). That makes Pass a strategic first card game — the investment seeds a whole category. Worth considering the engine as a shared `js/lib/cards.js` rather than buried in the plugin, so future card games can reuse it. Flag this for the technical spec — it affects architecture.

---

## 13. Out of Scope for v1

- Single-device / pass-the-phone mode (not viable for this game)
- Sylly Mode (parked — see §8)
- Airplane / complex attachment combinations (start with core six, add later if wanted)
- Partnership variants (Shuangkou-style 2v2 teams)
- Animated avatars, chat, emotes
- Persistent ranking/economy across sessions
- Other card games sharing the engine (but build the engine to allow them — see §12)

---

## 14. Mood & References

| Field | Answer |
|-------|--------|
| **Real-world games** | Paodekuai / Run Fast (direct source); same family as Dou Dizhu (Fight the Landlord), Big Two, President/Scum, Tichu |
| **Tone** | Clean, quick, competitive, tactile. The satisfaction of a well-timed bomb and the agony of getting stuck. Not silly — sharp. |
| **Should NOT feel like** | A clunky digital port. Card games are unforgiving about feel — if the cards don't feel good to play, the game fails regardless of correct rules. |
| **Example phrases** | "Pass." / "Beat that." / "Bomb!" / "Table's yours." / "Out!" / "Who's stuck?" |

---

## 15. Sample Round (3 players)

**Setup:** 3 players — Mia, Jake, Sophie. Hands dealt. Mia holds the lead card (lowest 3) and leads.

**The lead.** Mia plays a pair of 5s. *On the table: pair of 5s.*

- **Jake:** plays a pair of 9s. (Beats it — higher pair.) *On the table: pair of 9s.*
- **Sophie:** pass (no higher pair she wants to spend).
- **Mia:** plays a pair of Kings. *On the table: pair of Ks.*
- **Jake:** pass.
- **Sophie:** pass.
- Everyone passed after Mia → **table's hers.** Cards clear. Mia leads again.

**Mia** leads a single 7. *On the table: 7.*
- Jake: plays a 10. Sophie: plays a 2 (highest single). Mia: pass. Jake: pass. → **Sophie wins the trick**, leads next.

**Sophie** leads a 5-card straight (4-5-6-7-8).
- Mia: pass. Jake: plays 6-7-8-9-10 (higher 5-straight). Sophie: pass. Mia: pass. → **Jake's table.**

**Jake**, down to 4 cards, plays a **Bomb** (four Jacks). Nobody can beat it. → Jake's table again, and he's dumped four cards. Jake plays his last single. **"Out!"** — Jake finishes 1st.

Play continues between Mia and Sophie for 2nd and 3rd. Sophie empties next (2nd). Mia is left holding 3 cards → **Stuck**, 3rd place, +3 penalty.

---

*What this round illustrates: the constant beat-or-pass decision, conserving strong cards (Sophie's 2, Jake's bomb) for the right moment, the relief of winning a trick and leading fresh, and the sting of being the one left holding cards. No theme needed — the card play is the whole experience.*
