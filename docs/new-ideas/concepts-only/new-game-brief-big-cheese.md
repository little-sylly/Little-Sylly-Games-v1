# New Game Brief — Big Cheese
**Document type:** Phase 1 — Design Brief (non-technical)
**Who fills this in:** Project owner + AI, before any technical work
**What happens next:** Once complete, hand to Claude Code alongside `new-game-technical-template.md`. Claude Code reads this brief, reads the rule files, fills in the technical template, and presents it for confirmation before writing a single line of game code.

---

> **Status:** A faithful adaptation of **Big Two** (Choh Dai Di / Deuces / Da Lao Er) — the strategic climbing/shedding card game where the humble 2 outranks everything. **No reskin** — real playing cards, real poker hands; the only flourish is a light playful name and card-table vernacular. Positioned deliberately as the **heavyweight sibling to Pass**: same shed-your-hand DNA and shared card infrastructure, but meatier (five-card poker combos, suit ranking, penalty scoring). **No Sylly Mode in v1** — a candidate variant ("Bombs Away") is outlined in §7 for later. All structural calls baked in (§12 Decisions Log). Review-ready.

---

## 1. Identity (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Full game name** | **Big Cheese** *(a light, playful name — the lowly 2 is secretly the boss. Faithful alternates if you'd rather keep it plain: "Big Two" or "Deuces". The game underneath is unchanged either way.)* |
| **Short nickname / abbreviation** | `big` (works for Big Cheese or Big Two; alternate `b2`. Confirmed not in taken list: li5, gm, ss, jec, ygi, lttp, nat, dsd, gth, dyb, bld, pass, nt, frt) |
| **One-sentence tagline** | "Shed your hand first — and remember, the little 2 beats them all." |
| **Thematic universe** | None — it's a real deck of cards played straight. The only flavour is a wink at the pecking order: the game where the smallest card (the 2) is the **Big Cheese** that tops the King and Ace. Card-table vernacular does the thematic-vocab job without a costume (same approach as Hot Streak). |
| **Emoji / icon** | 🃏 *(or 🧀 if you go with "Big Cheese")* |
| **Brand colour preference** | Deep burgundy / wine red with gold accents (card-table luxe). *(Custom `pill-active-big` likely needed. Flag for the audit: confirm distinct from existing reds/greens.)* |

**How it folds into the gamebox:** the suite has **Pass** as the *light* climbing card game and **Counting Sheep** as a custom-deck card game. Big Cheese is the **strategic heavyweight** of that "card games corner": it uses a standard 52-card deck (so it reuses Pass's card model and renderer almost entirely) and the same turn-based, individual-device multiplayer profile — but adds genuine depth through poker-hand combinations and a penalty-scoring meta. If Pass is built first, this is a much cheaper build on shared foundations.

---

## 2. The Players (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Player count range** | **3–4** *(hard ceiling 4 — a 52-card deck deals 13 each to exactly four. 3 players use a deal tweak; see §12. 2-player is thin and out of scope for v1.)* |
| **Teams or individuals?** | Individuals — everyone for themselves. |
| **Are there different roles?** | No roles. Symmetric — everyone's a card player. |
| **Is any information hidden from some players?** | Yes — your 13-card hand is private (like every card game). Everyone can see how many cards each opponent has left and what's currently on the table. |
| **Minimum meaningful player count** | 3. Sweet spot **4** (the game is built for four). |

### Roles (if applicable)
None — no hidden roles, no asymmetry. The only "state" is whose turn it is and who currently controls the table (has **the Floor**).

---

## 3. The Core Loop (REQUIRED)

**In one sentence — what does a player DO on their turn?**
Play a single card, a pair, a triple, or a five-card poker hand that beats the last play on the table — or pass.

**What is the central tension or fun moment?**
Hand management and timing. Do you break up your pair of Kings to win this single-card lap, or hold them? When do you unleash your straight flush? You're sitting on both 2s (the Big Cheese — unbeatable singles) but you keep losing control before you can dump them — and if you're caught holding them at the end, they're dead weight. The deep decisions about *when* to seize control and *what* to break up are what make this harder than Pass.

**What type of game is this closest to?**
☑ Something else: **climbing / shedding card game** (the strategic end — cousins: President, Tien Len; the heavyweight sibling of the suite's Pass).

**The card ranking (the heart of it):**
Singles rank **3 < 4 < 5 < 6 < 7 < 8 < 9 < 10 < J < Q < K < A < 2** — the 2 is the highest card. Ties between equal ranks break by suit: **♦ < ♣ < ♥ < ♠**.

**Valid plays (you can only beat a play with the same type and card-count):**
- **Single** card
- **Pair** (two of a rank)
- **Triple** (three of a rank)
- **Five-card poker hands**, ranked low to high: **Straight < Flush < Full House < Four-of-a-Kind (+1) < Straight Flush.** A five-card hand only beats another five-card hand, by this ranking.

**Walk through one complete Deal, step by step:**

1. Shuffle a standard 52-card deck; deal 13 to each player.
2. Whoever holds the **3♦** leads the first play and must include it.
3. Going clockwise, each player either beats the current play (same type, higher rank) or **passes**. Passing only sits you out until the table resets.
4. When everyone else passes in a row, the last player to play **takes the Floor** and leads a fresh play of any type.
5. The first player to shed **all 13 cards** wins the Deal.
6. Everyone else scores **Deadweight** — penalty points for the cards left in their hand (§5).
7. Over a set number of Deals, the lowest total Deadweight wins.

**Simultaneous or sequential?**
Strictly sequential — clean turn order, one play or pass at a time. No simultaneous input anywhere.

**How does the phone move between players?**
Each player has their own device — the private 13-card hand makes pass-the-phone awkward (same as Pass). Individual devices recommended (see §10).

---

## 4. Winning (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **How does a game end?** | After a set number of **Deals** (the length setting). |
| **How is the winner determined?** | Lowest total **Deadweight** across all Deals wins — crowned the **Big Cheese**. |
| **Are ties possible?** | An end-game Deadweight tie is broken by who won (shed out of) the most Deals; if still tied, a single sudden-death Deal. |
| **Roughly how long should a full game take?** | ~3–6 minutes per Deal; ~15–25 minutes for a full game. |

---

## 5. Scoring (REQUIRED)

The winner of a Deal scores **0**. Everyone else scores **Deadweight** — penalty points for cards stuck in hand. **Lowest cumulative Deadweight wins the game.**

| What happened | Who scores | How much | Notes |
|--------------|-----------|----------|-------|
| Shed all cards first | The Deal winner | **0** | — |
| Cards left in hand | Each other player | **1 point per card** | The base penalty |
| Left holding **10–12 cards** | That player | **×2 multiplier** | The "you barely played" penalty |
| Left holding all **13 cards** (never played) | That player | **×3 multiplier** | The full humiliation |
| *(Cutthroat stakes only)* each **2** left in hand | That player | **+ extra penalty** | Punishes hoarding the Big Cheese |

**Does scoring feel balanced?**
The penalty multipliers are what make this *harder* and tenser than a simple shedding game — getting caught with a fat hand is catastrophic, so you can't just sit on big cards. It's a 30-year-refined folk scoring system; faithful reproduction, not redesign.

**Any outcomes where nobody scores?**
Every Deal produces exactly one winner (0) and penalties for the rest — no dead Deals.

---

## 6. Settings (REQUIRED)

| Setting name | What does it change? | Options | Default |
|--------------|---------------------|---------|---------|
| **Stakes** *(the difficulty/harshness dial — sits first)* | How punishing the Deadweight penalties are. Friendly = 1/card flat, no multipliers. Standard = multipliers on. Cutthroat = multipliers + each 2 left counts extra. | Friendly / Standard / Cutthroat | **Standard** |
| **Deals** | How many Deals before the game ends. | Short / Standard / Long | **Standard** |
| **✨ Sylly Mode** | None in v1 — reserved (candidate variant outlined in §7). | OFF | OFF |

**Player count** (3–4) is set from the lobby roster, not the settings overlay.

---

## 7. Sylly Mode (if applicable)

**None for v1.** Per the brief, here's a **candidate variant outlined for later** (review only — not in scope yet):

| Field | Candidate |
|-------|-----------|
| **Thematic name** | **Bombs Away 💣** |
| **In one sentence — what changes?** | Four-of-a-Kinds and Straight Flushes become **bombs** that can be dropped to beat *any* play regardless of card-count — blowing up a single, a pair, or anything else to seize the Floor. |
| **Does it add screens/phases?** | No — it just relaxes the "must match card-count" rule for those two hands. |
| **Does it change scoring?** | No. |
| **Does it change the win condition?** | No. |

*Why it's the right candidate:* it's a real, well-known Big Two house rule (borrowed from Tien Len / President "bombs"), it adds explosive swing without changing the structure, and it extends the existing combo system rather than bolting on a new mechanic. **Alternatives noted for the future:** *Deuces Wild* (the 2s become wild cards) or adding **Jokers** as top wilds — both more chaotic, parked alongside Bombs Away. Final pick deferred until the core is confirmed in play.

---

## 8. Thematic Vocabulary (REQUIRED)

| Generic term | What Big Cheese calls it |
|---|---|
| Round (one deal until someone sheds) | **Deal** |
| Score / points | **Deadweight** (penalty for cards left) |
| Control of the table | **The Floor** (the player who leads a fresh play "has the Floor") |
| The highest card (the 2) | **The Big Cheese** |
| Game over screen | **Settling Up 🧾** (lowest Deadweight wins) |
| Overall winner | **The Big Cheese** |
| Play again | **Shuffle Up?** |
| Quit | **Fold?** |
| Settings overlay title | **House Rules 🃏** |
| Declining your turn | **Pass** |

*(Five-card hands keep their real poker names — Straight, Flush, Full House, Four of a Kind, Straight Flush — no reskin needed; they're already universally understood.)*

---

## 9. Word Bank & Content (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Does this game use `words.json`?** | No. |
| **If no — what content does it need?** | **None.** A standard 52-card deck (reusing Pass's card model and renderer) plus the combination-validation and hand-ranking logic, which live in code. No data file. |
| **Does it need a completely new data file?** | No. |
| **Any words/topics to exclude?** | N/A. |

**The "content" is the rules logic:** a comparator that knows a Flush beats a Straight, that a pair of 2s is the top pair, that ♠ beats ♥ on equal ranks, and a validator that recognises legal singles/pairs/triples/five-card hands. This is meatier than Pass's logic — the main build effort here, in place of a content file.

---

## 10. Multiplayer Classification (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Own device or shared device?** | **Individual devices** — each player's 13-card hand is private. |
| **Any information private to one device?** | Yes — your hand. (Card counts and the current play are public.) |
| **Are there moments players act simultaneously?** | No — strictly turn-based. |
| **Is one device locked while another is active?** | Yes — only the active player can play or pass; others wait (and can pre-plan their hand). |
| **Anything that doesn't work with multiple devices?** | Pass-the-phone is awkward (persistent private hands), so MDLM is recommended; pass-the-phone is out of scope for v1. |

**Profile:** the same individual-device, turn-based card-game profile as **Pass** — and it should reuse that infrastructure (card model, renderer, turn engine, hand-sorting). The only genuinely new technical work is the **combination validator and hand-ranking comparator**. No simultaneous input, no targeted writes beyond each player's own private hand.

---

## 11. Screens — Plain English List (REQUIRED)

1. **Game menu** — hub, Play, settings, how-to.
2. **Lobby / setup** — player names (3–4).
3. **The Table (main)** — your hand (13 cards, sorted, selectable), the current play on the Floor, whose turn it is, every opponent's remaining card count, and the Pass control.
4. **Play / select** — selecting cards to form a play, with live validation ("not a legal hand" / "doesn't beat the Floor"), then Play or Pass.
5. **Deal end** — someone shed out; reveal remaining hands and the Deadweight tally for that Deal.
6. **Settling Up (game over)** — cumulative Deadweight standings after the final Deal, the Big Cheese crowned, Shuffle Up? / exit.

*Standard overlays:* settings (House Rules 🃏), how-to, quit (Fold?), play-again (Shuffle Up?).

---

## 12. Open Questions & Design Notes (REQUIRED)

### Decisions Log — calls made for your review (override any on review)
- **Faithful Big Two:** full combo set (singles, pairs, triples, and the five five-card poker hands), no reskin.
- **Card ranking:** 3 lowest → 2 highest; suit tie-break **♦ < ♣ < ♥ < ♠**.
- **Five-card ranking:** Straight < Flush < Full House < Four-of-a-Kind < Straight Flush.
- **Match-the-count rule:** a play only beats the same type/size (no bombs cutting across sizes in the base game — that's the parked "Bombs Away" Sylly).
- **First lead:** the 3♦ holder leads Deal one and must include the 3♦.
- **Scoring:** 1 point per card left + multipliers (×2 at 10–12 cards, ×3 at all 13); Cutthroat adds an extra penalty per 2 held. Lowest cumulative Deadweight wins.
- **Length:** a set number of Deals (Stakes/Deals settings), default Standard.
- **Players:** 4 ideal, 3 supported with a deal tweak, 2 out of scope.
- **Multiplayer:** individual devices only; reuses Pass's card infrastructure.
- **Sylly:** none in v1; Bombs Away outlined for later.

### Still genuinely open
- **3-player rule** — deal 17 each and remove the lowest card, or deal 16 each with cards set aside? Confirm the cleaner option. *(NON-BLOCKER.)*
- **Standalone triples** — some regions don't allow a triple as its own play (only inside a full house). Confirm triples are legal singles-of-three in our version. *(NON-BLOCKER.)*
- **Suit-rank convention** — ♦ < ♣ < ♥ < ♠ is the common standard, but regional variants differ. Confirm. *(NON-BLOCKER.)*
- **Straight vs Flush ordering** — standard Big Two ranks Flush above Straight; confirm (a few house rules swap them). *(NON-BLOCKER.)*
- **Tuning** — exact multiplier thresholds/values, the Cutthroat 2-penalty size, and the default Deal count. *(NON-BLOCKER.)*
- **Name** — Big Cheese vs Big Two vs Deuces (and the matching emoji/abbreviation). *(NON-BLOCKER.)*

### Flag for Claude Code (technical)
- **Combination validator + ranking comparator** — the core build: recognise legal plays, and correctly compare same-type plays (including the five-card hierarchy and suit tie-breaks). This is the meat that makes it harder than Pass.
- **Hand-selection UI on mobile** — selecting up to five cards to form a hand needs a clean tap-to-select interaction with live legality feedback; reuse/extend Pass's card renderer.
- **Auto-sort / hint** — consider sorting the hand and optionally highlighting legal plays (an accessibility nicety; could be a Stakes-linked aid).

### Out of scope for v1
- 2-player Big Two.
- Bombs-cutting (it's the parked Sylly).
- Partnership / team variant.
- Pass-the-phone mode.

**General note:** the whole reason to build this over another light shedding game is the **strategic depth** — protect it. Keep the combo rules faithful, make the penalty multipliers bite, and let good hand management pay off.

---

## 13. Mood & References (if applicable)

| Field | Your answer |
|-------|-------------|
| **Real-world games this is most similar to** | Big Two / Choh Dai Di / Deuces (direct adaptation); President and Tien Len (cousins); the heavyweight sibling of the suite's own Pass. |
| **Tone** | Sharp, competitive, satisfying. A real card-table feel — the warmth is in the rivalry and the big plays, not a costume. |
| **Should NOT feel like** | A baby version of Pass, or a luck-only game. The depth is the point: combos, control, and the dread of a fat hand at the buzzer. |
| **Example phrases / copy already written** | "Shed your hand first — and remember, the little 2 beats them all." · the Big Cheese · the Floor · Deadweight · Settling Up · House Rules · Shuffle Up? |

---

## 14. Sample Round (REQUIRED)

**Setup:** 4 players — **Ada, Boris, Chloe, Dev**. Stakes Standard. Each dealt 13. **Ada holds the 3♦**, so she leads and must include it.

1. **Ada** leads the **3♦** (single). **Boris** plays **7♣**. **Chloe** plays **10♥**. **Dev** plays the **2♠** — the Big Cheese, an unbeatable single. Ada, Boris, Chloe all **pass**. Dev **takes the Floor**.
2. **Dev** leads a **pair of 5s**. **Ada** beats it with a **pair of 9s**; **Boris** a **pair of Jacks**; **Chloe** passes; **Dev** plays a **pair of Kings**. Ada and Boris pass — **Dev keeps the Floor** and is thinning his hand fast.
3. **Dev** leads a **five-card hand: a Straight (5-6-7-8-9)**. **Chloe** drops a **Flush** (beats a straight). **Dev** answers with a **Full House** (beats a flush). Ada, Boris, Chloe pass — **Dev takes the Floor** again, now down to **3 cards**.
4. **Dev** leads a **single 4**; **Boris** plays a **Q**; Chloe and Ada pass; Dev plays his **other 2** (Big Cheese). All pass — Dev leads his **final pair** and **sheds out**. **Dev wins the Deal (0 Deadweight).**

**Deadweight tally for the Deal:**
- **Dev:** 0 (winner)
- **Chloe:** 4 cards left → **4**
- **Ada:** 6 cards left → **6**
- **Boris:** **11 cards left → ×2 multiplier → 22** (he hoarded high cards waiting for a moment that never came — the cautionary tale)

**Result:** after Deal 1, the running Deadweight is Dev 0, Chloe 4, Ada 6, Boris 22. Dev leads; Boris is buried. Lowest total after the final Deal is crowned the **Big Cheese**. The lesson on display: control of the Floor is everything, and getting caught with a fat hand — especially unplayed 2s — is ruinous.

---

## Open Questions

1. **[NON-BLOCKER]** 3-player deal rule — 17-each-minus-lowest vs 16-each-with-cards-aside.
2. **[NON-BLOCKER]** Confirm standalone triples are legal, and the suit-rank (♦<♣<♥<♠) and Straight-vs-Flush conventions.
3. **[NON-BLOCKER]** Tuning — penalty multiplier thresholds/values, the Cutthroat 2-penalty, and the default Deal count.
4. **[NON-BLOCKER]** Name — Big Cheese vs Big Two vs Deuces (with matching emoji and abbreviation).

*No BLOCKERs. The core loop, full combo and ranking rules, penalty scoring, settings, and multiplayer profile are all resolved and recorded in the §12 Decisions Log. Sylly is intentionally deferred with the Bombs Away variant outlined. The remaining items are rule-convention confirmations and tuning — all carryable into the technical spec.*
