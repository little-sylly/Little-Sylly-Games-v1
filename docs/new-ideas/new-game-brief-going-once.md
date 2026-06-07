# New Game Brief — Going Once
**Document type:** Phase 1 — Design Brief
**Version:** v0.1 — first draft for review
**Source inspiration:** Wits & Wagers (estimate + wager), with a Wavelength-style reveal dial
**Status:** Parked pending MFS v1.4. Revisit before technical spec.

> ⚠️ **MFS Revisit Required**
> Written before multiplayer implementation. Before converting to a technical spec, review §10 (Multiplayer) against completed MFS v1.4 — particularly the simultaneous private appraisal submission, the bid-chip placement phase, and (Sylly) the private Forger knowledge delivery.

---

## On the Title

**Recommended: "Going Once."** The auctioneer's call — implies the bidding tension and the comedic finality of "going once, going twice, SOLD."

Alternatives:
- **"Sold!"** — punchy, the win-state as the title
- **"Hammer Price"** — the auction term for final sale value, slightly insider
- **"The Lot"** — what's being auctioned, short and clean
- **"Reserve"** — the auction term for minimum value, intriguing but obscure

This brief uses **Going Once**. Short ID: `gon`. Lock before technical spec.

---

## 1. Identity

| Field | Answer |
|-------|--------|
| **Full game name** | Going Once |
| **Short ID / abbreviation** | `gon` |
| **One-sentence tagline** | *"You don't have to be right. You just have to bet right."* |
| **Thematic universe** | A chaotic auction house appraising increasingly questionable items — a vintage lunchbox, a "signed" napkin, a haunted-looking lamp. Equal parts Antiques Roadshow and a slightly dodgy estate sale. |
| **Emoji / icon** | 🔨 |
| **Brand colour** | `emerald-700` (auction-house green) or `red-900` (auction-house burgundy). Emerald is more distinct from your existing palette — lean that way. |

---

## 2. The Players

| Field | Answer |
|-------|--------|
| **Player count range** | 3–10 (best 4–8) |
| **Teams or individuals?** | Individuals. Everyone competes for points across the auction. |
| **Are there different roles?** | Base game: no roles, everyone is an Appraiser. Sylly Mode adds one hidden role: The Forger. |
| **Hidden information?** | Base game: no — everyone has the same information (the item + the question). The hidden element is everyone's private *guess* until reveal. Sylly Mode: The Forger secretly knows the true value. |
| **Minimum meaningful count** | 3 (need enough guesses to bet across). 4+ is better. |

### Roles

| Role | Display name | What they know | What they do | Goal |
|------|-------------|---------------|--------------|------|
| Everyone (base) | **The Appraiser** | The Lot + the appraisal question | Privately appraise (guess a value), then bet chips on whose appraisal is closest without going over | Win the most points across the auction |
| Sylly Mode only | **The Forger** (1 per round, rotates or random) | The Lot + the question + **the true value** | Submits a deliberately misleading appraisal to manipulate where the crowd bets | Score if the crowd bets on a wrong appraisal |

---

## 3. The Core Loop

**In one sentence:** An item appears with a question that has a real numerical answer, everyone privately guesses the value, the guesses line up cheapest-to-priciest, and then everyone bets on whose guess is closest to the truth without going over.

**The central tension:** You don't need to know the answer — you need to know *who* knows. The betting phase is the real game. Your own appraisal might be a wild stab, but if you can spot which friend actually knows their vintage cameras, you bet on them and win. And the "without going over" rule means the highest guesser is often disqualified — so betting on the boldest guess is risky.

**Game type:** ☑ Trivia-adjacent estimation + wagering (the wagering is the heart)

**One complete round (a "Lot"), step by step:**

1. **The Lot is revealed.** An item + an appraisal question with a real numerical answer. *"A genuine 1983 Star Wars lunchbox — what does this fetch at auction?"* Everyone sees it.

2. **Appraise (private, simultaneous).** Everyone privately enters their valuation — a number. Short timer to keep it snappy.

3. **The Line-Up.** All appraisals are revealed and auto-sorted cheapest → priciest along a horizontal scale. Each becomes a bettable slot. Duplicate/close guesses may stack. Payout odds are shown beneath each slot: the median (middle) guesses pay least (safe), the extreme guesses pay most (risky) — exactly Wits & Wagers' odds structure.

4. **Place your bids.** Each player has a set number of bid-chips (e.g. 2). They place chips on the appraisal(s) they believe is closest to the true value *without going over*. You may bet on your own guess, someone else's, or split your chips. You can see everyone's guesses before betting — reading the room is the skill.

5. **Going once… going twice… SOLD.** The auctioneer reveals the true value. The winning slot = the appraisal closest to the true value without exceeding it. (If every guess went over, the lowest guess wins — the "least wrong.")

6. **Payout.** Chips on the winning slot pay out according to that slot's odds. Players bank their winnings as points.

7. **Next Lot.** Play a fixed number of Lots (e.g. 7). Most points at the end wins — "Top Appraiser."

**The "without going over" hook:** if your appraisal *exceeds* the true value, you can't win the lot — you've overbid. This creates lovely tension: the boldest, highest guess is risky by definition, and betting on it pays big but rarely lands.

**Simultaneously or sequential?**
- Appraisal (step 2): simultaneous and private — everyone guesses at once.
- Betting (step 4): can be simultaneous (everyone places chips at once) or a quick go-around. Simultaneous is cleaner in multiplayer.

**Phone handling:**
Multiplayer-first — each player appraises and bets privately on their own device. Pass-the-phone fallback: each player privately enters their appraisal (pass-gate between each), then the line-up is shown on a shared screen and players verbally call their bets, or pass to place chips.

---

## 4. Winning

| Field | Answer |
|-------|--------|
| **How does a game end?** | After a fixed number of Lots (default 7). |
| **How is the winner determined?** | Most points (banked chip winnings) across all Lots. |
| **Ties possible?** | Yes — a tiebreaker Lot (sudden-death single item, closest appraiser wins outright). |
| **Session length** | 12–20 minutes. Each Lot is ~90 seconds. |

---

## 5. Scoring

Individual scoring — this is a competitive points game (unlike Read the Room's team/co-op structure).

**Chips and payouts (Wits & Wagers model):**
- Each player gets a fixed number of bid-chips per Lot (e.g. 2).
- Each appraisal slot in the Line-Up has odds based on its position:
  - The two median (middle) slots: pay 2× (safe, likely)
  - The slots either side: pay 3×
  - The outermost (most extreme) slots: pay 4× or 5× (risky, unlikely but big)
- After the reveal, chips on the winning slot pay out at that slot's odds. All other chips are lost.
- Points = total payout banked across all 7 Lots.

**Bonus:** A player whose *own* appraisal wins the Lot earns a small flat bonus (e.g. +1) on top of any chips they bet on themselves — rewards actually knowing the answer, not just betting well.

**The odds tuning is the key design work** — too generous and betting is trivial; too punishing and it's frustrating. This needs prototyping. The Wits & Wagers payout board is a proven starting point.

---

## 6. Settings

| Setting | What it changes | Options | Default |
|---------|----------------|---------|---------|
| **Auction Length** | Number of Lots | 5 / 7 / 10 | 7 |
| **Category** | Filters the item pool by theme | Mixed / [category options TBD] | Mixed |
| ✨ **Sylly Mode — "The Forgery"** | Adds the hidden Forger role | OFF / ON | OFF |

Keep it light. Category filtering depends on how the content pool is organised (see §9).

---

## 7. Sylly Mode — "The Forgery"

| Field | Answer |
|-------|--------|
| **Thematic name** | The Forgery |
| **In one sentence** | One Appraiser each Lot secretly knows the true value — and is trying to trick everyone into betting wrong. |
| **What changes** | Each Lot, one player is secretly designated The Forger. Their device privately shows them the true value before they appraise. They submit a deliberately misleading appraisal (placed to lure bets away from the truth). They score points if the crowd's chips land on a *losing* slot. The other players don't know who the Forger is — or even which Lots have one active. |
| **New screens?** | No — the Forger's secret knowledge appears on their private appraisal screen. |
| **Changes scoring?** | Yes — The Forger earns points based on misdirecting the crowd (e.g. +1 per chip placed on a non-winning slot, capped). |
| **Changes win condition?** | No — Forger points fold into the same total. |

**The Forger is the natural multiplayer showcase** — the private "you alone know the answer" knowledge is delivered to one device via the MFS targeted-write pattern. It also adds a hidden-role social layer to what is otherwise a pure estimation game, giving it a second dimension of replay value.

**Open question:** does the Forger rotate predictably (each player gets a turn) or is it random each Lot (so some Lots have no Forger and players can't be sure)? Random-with-uncertainty is more paranoid and fun but harder to balance. Flag for technical spec.

---

## 8. Thematic Vocabulary

| Generic term | Going Once calls it |
|---|---|
| Round | **The Lot** |
| The item being valued | **The Lot** (item + question) |
| Your guess | **Your Appraisal** |
| The sorted guesses | **The Line-Up** |
| A bettable guess slot | **A Bid** |
| Your betting tokens | **Bid-Chips** (or **Paddles**) |
| Placing a bet | **"Place Your Bids"** |
| The reveal | **"Going once... SOLD!"** |
| The true value | **The Hammer Price** |
| Points / winnings | **Winnings** (or **Commission**) |
| Game over | **The Closing Gavel** |
| Winner | **Top Appraiser** |
| Play again | **"Next Auction"** |
| Quit | **"Leave the Floor?"** |
| Hidden role (Sylly) | **The Forger** |
| How to Play title | **"House Rules 🔨"** |
| Sylly Mode label | **✨ The Forgery** |

---

## 9. Word Bank & Content

| Field | Answer |
|-------|--------|
| **Uses `words.json`?** | No |
| **New data file needed?** | Yes — `data/gon-data.json` |
| **Entry schema** | `{ id, item, question, answer, unit, category, difficulty }` |
| **Example entry** | `{ item: "1983 Star Wars lunchbox", question: "Auction value?", answer: 240, unit: "$", category: "collectibles" }` |
| **Other examples** | `{ item: "The Eiffel Tower", question: "Height in metres?", answer: 330, unit: "m" }`, `{ item: "A blue whale's heart", question: "Weight in kg?", answer: 180, unit: "kg" }`, `{ item: "A first-edition Harry Potter", question: "Recent auction price?", answer: 471000, unit: "$" }` |
| **Content cost** | Medium-high. Each entry needs a real, verifiable, *surprising-but-googleable* answer. This is the main build cost — same investment as YGI. Needs a content guide (`docs/gon-content-guide.md`). |
| **Content risk** | Facts can be wrong or go stale (auction values change). Use stable facts where possible (heights, weights, distances) mixed with fun-but-fixable valuations. Flag any volatile values for periodic review. |

**Content design principle:** the best Lots have answers people *can* reason toward but rarely nail exactly — that's what makes the betting interesting. "How tall is the Eiffel Tower" (most people are roughly right) is less fun than "what did a first-edition Harry Potter sell for" (wild spread of guesses). Aim for the latter.

**Two content flavours worth considering:**
- **Real-world facts** (heights, weights, distances, populations) — stable, verifiable, never go stale
- **Auction valuations** (what weird stuff actually sold for) — funnier, more on-theme, but can date

A mix is ideal. The Category setting in §6 could let groups pick a flavour.

---

## 10. Multiplayer Classification

| Field | Answer |
|-------|--------|
| **Primary mode** | Multiplayer-first. Private simultaneous appraisal and private bid placement both work best with individual devices. |
| **Private information** | (1) Each player's appraisal, until the Line-Up reveal. (2) Sylly Mode: The Forger's knowledge of the true value. |
| **Simultaneous actions** | Yes — appraisal submission (all at once, private) and bid placement (all at once). Both use the readyCheck matrix. |
| **Locked devices** | Brief waiting states between phases (waiting for all appraisals, waiting for all bids). |
| **Pass-the-phone fallback** | Workable but clunky — each private appraisal needs a pass-gate, then the shared Line-Up is shown and bets are called verbally or via pass. The betting phase especially loses something without simultaneous private placement. This game is meaningfully better in multiplayer. |

> ⚠️ **MFS Revisit — §10:** The bid-chip placement is the interesting multiplayer phase — confirm whether all players place simultaneously (cleaner) or in turn order. Simultaneous private placement then simultaneous reveal is the strongest experience. Confirm Forger private-knowledge delivery against MFS v1.4 targeted-write pattern.

---

## 11. Screens — Plain English List

1. **Game menu** — title, tagline, House Rules (how to play), category/length settings, The Forgery toggle, Back to the Box
2. **Setup** — player names. Multiplayer: lobby.
3. **The Lot reveal** — the item + appraisal question, shown to everyone. (Sylly: The Forger's device also shows the true value here.)
4. **Appraisal entry** — each player privately enters their number. Waiting state until all submitted.
5. **The Auction Floor (main screen)** — the persistent board. Shows the Line-Up (sorted appraisals as bettable slots with odds), the player's remaining chips, and the bid-placement controls. After bidding: the "Going once... SOLD" reveal animates here, the hammer price lands on the scale, the winning slot highlights, payouts tally.
6. **Lot result** — winnings this Lot, running leaderboard
7. **The Closing Gavel** — game over: final leaderboard, Top Appraiser crowned

---

## 12. Design Notes

### The Auction Floor — the signature screen

The Line-Up is the heart of the UI. Design notes:

- A horizontal value scale, appraisals placed along it cheapest (left) → priciest (right)
- Each appraisal is a card/slot showing the value and the appraiser's name (or anonymous until reveal — decide which is more fun; showing names lets you bet on *people*, which is the point, so probably show them)
- Odds shown beneath each slot (2× / 3× / 4×)
- The player drags or taps their bid-chips onto slots
- **The reveal:** a Wavelength-style touch — the true hammer price slides in along the same scale as a marker, so you watch it land *between* the guesses. The slot it lands on (closest below it) lights up gold. Gavel sound. Chips on that slot animate into winnings.

The shared DNA with Read the Room's dial: both games end with a hidden true value sliding into view along a scale the players have been reasoning about. If both games ship, this could be a shared visual language across the box.

### The "without going over" rule — make it legible

New players will forget the over/under rule. The UI must make it obvious: when the hammer price reveals, any slot *above* it should visibly grey out ("over — disqualified") and only the closest slot *at or below* lights up. A quick visual teach every round.

### Anonymous vs named appraisals

Two options for the Line-Up: show whose guess is whose, or keep them anonymous until after betting.
- **Named:** lets you bet on people you trust to know the category — this is the core Wits & Wagers skill. Recommend this.
- **Anonymous:** purer estimation, less social. Less interesting for your box.
Recommend **named** — the social read is the whole appeal.

---

## 13. Out of Scope for v1

- Real-time auction bidding (escalating live bids) — this is a different game; keep it to the place-chips model
- Custom/host-written Lots
- Multiple Forgers per Lot
- Persistent currency/economy across multiple games in a session
- Image content for Lots (text descriptions only in v1 — images are a v2 enhancement and a content/licensing burden)

---

## 14. Mood & References

| Field | Answer |
|-------|--------|
| **Real-world games** | Wits & Wagers (direct source), with a Wavelength-style reveal |
| **Tone** | Playful, slightly theatrical (the auctioneer's patter), warm competitive. The absurd items keep it funny. |
| **Should NOT feel like** | A hard trivia quiz (you can win without knowing answers), or a maths/finance exercise |
| **Example phrases** | "What's it worth?" / "Place your bids." / "I'm betting on Mia, she KNOWS cameras." / "Going once... going twice... SOLD!" / "You went over, you're out." |

---

## 15. Sample Round

**Setup:** 5 players (Mia, Jake, Sophie, Tom, Priya). 2 bid-chips each. Base game (no Forgery).

**The Lot:** *"A genuine 1983 Star Wars lunchbox — what does it fetch at auction?"* (True hammer price: $240.)

**Appraisals (private, simultaneous):**
- Tom: $20
- Priya: $75
- Mia: $180
- Jake: $300
- Sophie: $1,000

**The Line-Up** (sorted, with odds): $20 (4×) · $75 (3×) · $180 (2×) · $300 (3×) · $1,000 (4×)

**Betting:** Everyone sees the spread.
- *"Sophie always overshoots, ignore the grand."* — Tom
- *"Mia knows collectibles, I'm on $180."* — Priya places both chips on $180
- Jake hedges: one chip on $180, one on $300
- Mia bets both on her own $180
- Sophie, doubting herself, bets on $180 too
- Tom puts both on $75

**Going once... going twice... SOLD. Hammer price: $240.**

The $300 and $1,000 slots grey out (over — disqualified). Closest *without going over* is **$180 (Mia's)**. It lights gold.

**Payout (2× odds on $180):** Priya (2 chips → 4), Mia (2 chips → 4, plus +1 own-appraisal bonus = 5), Jake (1 chip → 2), Sophie (2 chips → 4). Tom (bet on $75) wins nothing.

**Leaderboard updates. Next Lot.**

---

*What this round illustrates: Sophie's $1,000 and Jake's $300 were both disqualified for going over — boldness is punished by the over/under rule. The crowd correctly read that Mia knew collectibles and piled onto her guess. Tom backed the wrong horse. Nobody had to know the exact value of a vintage lunchbox — they had to know who at the table did. That's the game.*
