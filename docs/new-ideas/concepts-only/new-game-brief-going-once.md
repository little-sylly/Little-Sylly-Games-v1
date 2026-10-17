# New Game Brief — Going Once
**Document type:** Phase 1 — Design Brief
**Version:** v0.2 — reviewed, fleshed out, options added (was v0.1)
**Source inspiration:** Wits & Wagers (estimate + wager) fused with a Wavelength-style reveal dial — plus, new in v0.2, an optional *live auction* mode that actually lets you bid
**Status:** Parked pending MFS v1.4. Revisit §10 before technical spec.

> ⚠️ **MFS Revisit Required**
> Written before multiplayer implementation. Before converting to a technical spec, review §10 (Multiplayer) against completed MFS v1.4 — particularly the simultaneous private appraisal submission, the bid/chip phase, and (Sylly) the private Forger knowledge delivery.

> 🟦 **v0.2 reviewer's note (nothing here is locked):**
> Three substantive changes from v0.1, all flagged inline and open for debate:
> 1. **Dropped "closest without going over"** as the default — it fights the auction theme and is a teaching burden. Default is now simply *closest to the hammer price*. The over/under rule is retained as an optional "Reserve Price" twist for those who want it.
> 2. **Added a real bidding mode** ("The Live Floor") as a first-class option, not an out-of-scope footnote — escalating going-once-going-twice bids are the fun the title promises.
> 3. **Reworked the Forger** — the v0.1 scoring rewarded chaos the Forger didn't cause. New version makes the lie sharper and the payoff cleaner.
> Everything else from v0.1 is preserved.

---

## On the Title

**Recommended: "Going Once."** The auctioneer's call — implies the bidding tension and the comedic finality of "going once, going twice, SOLD."

Alternatives (still wide open):
- **"Sold!"** — punchy, the win-state as the title
- **"Hammer Price"** — the final-sale term, slightly insider
- **"The Lot"** — what's being auctioned, short and clean
- **"Reserve"** — the minimum-value term, intriguing but obscure
- **"Paddles Up"** *(new)* — if the Live Floor mode (§3a) becomes the default, this leans into active bidding
- **"Lowball"** / **"Highest Bidder"** *(new)* — if you keep an over/under hook, these signal it

This brief uses **Going Once**. Short ID: `gon`. Lock before technical spec.

---

## 1. Identity

| Field | Answer |
|-------|--------|
| **Full game name** | Going Once |
| **Short ID / abbreviation** | `gon` *(confirmed clear of: li5, gm, ss, jec, ygi, lttp, nat, dsd, gth, dyb, bld, pass, nt, frt)* |
| **One-sentence tagline** | *"You don't have to be right. You just have to bet right."* |
| **Thematic universe** | A chaotic auction house appraising increasingly questionable lots — a vintage lunchbox, a "signed" napkin, a haunted-looking lamp, a jar of buttons sold as "rare artefacts." Equal parts *Antiques Roadshow* and a slightly dodgy car-boot estate sale, run by an auctioneer with more patter than scruples. |
| **Emoji / icon** | 🔨 |
| **Brand colour** | `emerald-700` (auction-house green) or `red-900` (auction-house burgundy). Emerald is more distinct from the existing palette — lean that way. *(Note: Carats now uses an emerald — confirm these two read as distinct in the audit, or take the burgundy.)* |

---

## 2. The Players

| Field | Answer |
|-------|--------|
| **Player count range** | 3–10 (best 4–8) |
| **Teams or individuals?** | Individuals. Everyone competes for points across the auction. |
| **Are there different roles?** | Base game: no roles, everyone is an Appraiser. Sylly Mode adds one hidden role: The Forger. |
| **Hidden information?** | Base game: no — everyone shares the same information (the Lot + the question). The hidden element is everyone's private *appraisal* until reveal. Sylly Mode: The Forger secretly knows the true value. |
| **Minimum meaningful count** | 3 (need a spread of guesses to bet across). 4+ is better; the social read sharpens with more people. |

### Roles

| Role | Display name | What they know | What they do | Goal |
|------|-------------|---------------|--------------|------|
| Everyone (base) | **The Appraiser** | The Lot + the appraisal question | Privately appraise (guess a value), then bet on whose appraisal is closest to the truth | Win the most points across the auction |
| Sylly Mode only | **The Forger** | The Lot + the question + **the true value** | Submits a deliberately misleading appraisal and bets to cash in on the deception | Profit from the lie — see §7 for the reworked scoring |

---

## 3. The Core Loop

**In one sentence:** A questionable item appears with a question that has a real numerical answer, everyone privately appraises it, the guesses line up cheapest-to-priciest, and then everyone bets on whose appraisal is closest to the truth.

**The central tension:** You don't need to know the answer — you need to know *who* knows. The betting phase is the real game. Your own appraisal might be a wild stab, but if you can spot which friend actually knows their vintage cameras, you bet on them and win. Reading the table is the whole skill.

**Game type:** ☑ Trivia-adjacent estimation + wagering (the wagering is the heart)

**One complete round (a "Lot"), step by step:**

1. **The Lot is revealed.** An item + an appraisal question with a real numerical answer. *"A genuine 1983 Star Wars lunchbox — what does this fetch at auction?"* Everyone sees it. The auctioneer's patter sells it ("one careful owner, only slightly haunted").

2. **Appraise (private, simultaneous).** Everyone privately enters their valuation. Short timer to keep it snappy.

3. **The Line-Up.** All appraisals are revealed and auto-sorted cheapest → priciest along a horizontal scale, each a bettable slot tagged with its appraiser's name. Payout odds sit beneath each: middle (median) guesses pay least (safe), extreme guesses pay most (risky).

4. **Place your bids.** Each player has a set number of bid-chips (e.g. 2) to place on the appraisal(s) they trust. Bet on your own guess, someone else's, or split. You see all guesses *and who made them* before betting — that's the point.

5. **Going once… going twice… SOLD.** The auctioneer reveals the true value, which slides along the same scale as a marker (the Wavelength touch) so you watch it land *between* the guesses. **The closest appraisal wins the Lot** (see the scoring options below — this is where v0.2 changes the default).

6. **Payout.** Chips on the winning slot pay out at that slot's odds. Players bank winnings as points.

7. **Next Lot.** Play a fixed number of Lots (default 7). Most points wins — "Top Appraiser."

### 🟦 The winning rule — v0.2 changes the default (open for debate)

v0.1 used Wits & Wagers' **"closest without going over"** (overbids disqualified). I'd drop that as the default, for two reasons: it's *thematically backwards* (a real auction rewards the highest bid, not the most timid one), and §12 already worried about teaching it every single round. Three options, pick one:

- **Option A — Closest wins (recommended default).** The appraisal nearest the hammer price, over or under, takes the Lot. The Wavelength-style slide makes "closest" instantly legible — no greying-out, no rule to re-teach. Clean and fast.
- **Option B — Reserve Price (the over/under as an optional twist).** Keep v0.1's "closest without going over" but make it a *setting* ("Reserve Price: ON"), so groups who like the brinkmanship can have it and newcomers aren't tripped by it. Reframe it in-theme: bids over the reserve are "priced out."
- **Option C — Highest-bidder-wins (the truly auction-native version).** Lean all the way in: the winning appraisal is the **highest one at or below the hammer price** — i.e. the boldest bid that didn't overshoot. Mechanically this *is* "closest without going over," but framed positively ("you bid biggest and still got it under the hammer — sold to you!") instead of as a disqualification. Same maths, friendlier story.

My lean: **A** for the base game (least friction), with **B** available as a setting for groups who want the edge. C is worth a look if you want the auction theme to bite harder.

### 🟦 3a. New option — "The Live Floor" (real bidding mode)

v0.1 parked live bidding as "out of scope — a different game." I'd reconsider: *the title is an auctioneer's call*, and escalating public bids are the fun no other game in your box delivers. Worth at least prototyping as an alternate mode (or even the headline mode):

- The Lot appears. Instead of a one-shot private guess, the floor **opens for live bids**: players tap to raise the current bid (or call out and the host taps), the number climbing on a big central display.
- The auctioneer (the app) eggs it on — *"I have $200, do I hear 250? Going once…"* A countdown resets on each new bid.
- When bids stall, **SOLD** to the highest bidder at their price.
- The twist that makes it a *game* and not just an ego-measuring contest: the hammer price is then revealed, and you score on how your winning bid compares — **buy low and you've scored a bargain (big points); overpay and you've been fleeced (lose points).** Now bidding high is a real gamble: you want the Lot, but not at any price.

This turns the read from "who knows the answer" into "how much is this *actually* worth, and is that idiot across the table about to overpay?" — a different, punchier, very social game. It does need more multiplayer plumbing (real-time bid contention) — flag for MFS. **Recommendation:** spec the place-chips model as v1 (simpler, proven), and hold The Live Floor as a strong v1.5/Sylly candidate — but don't bury it as "out of scope," because it might be the better game.

**Simultaneously or sequential?**
- Appraisal (step 2): simultaneous, private.
- Betting (step 4): simultaneous private placement, then simultaneous reveal — cleanest in multiplayer.
- The Live Floor (3a): real-time contested — the genuinely new technical wrinkle.

**Phone handling:** Multiplayer-first — appraise and bet privately on your own device. Pass-the-phone fallback works for the place-chips model (pass-gate each appraisal, shared Line-Up, verbal/pass bets) but is clunky; The Live Floor would need shared-screen-plus-buzzers.

---

## 4. Winning

| Field | Answer |
|-------|--------|
| **How does a game end?** | After a fixed number of Lots (default 7). |
| **How is the winner determined?** | Most points (banked winnings) across all Lots. |
| **Ties possible?** | Yes — a sudden-death tiebreaker Lot: single item, closest appraiser wins outright (no betting). |
| **Session length** | 12–20 minutes. Each Lot is ~90 seconds (place-chips); The Live Floor runs a touch longer and rowdier. |

---

## 5. Scoring

Individual scoring — a competitive points game.

**Chips and payouts (Wits & Wagers model):**
- Each player gets a fixed number of bid-chips per Lot (e.g. 2).
- Each slot's odds scale by position: median slots pay 2× (safe), the next ring 3×, the extreme outer slots 4–5× (risky).
- After the reveal, chips on the winning slot pay at its odds; all other chips are lost.
- Points = total banked across all Lots.

**Own-appraisal bonus:** a player whose own appraisal wins the Lot earns a small flat bonus (e.g. +1) on top of chips bet on themselves — rewards actually knowing, not just betting well.

**🟦 New — the "Mug's Bet" anti-runaway tweak (optional, worth considering):** estimation games can snowball (the person who knows cameras *and* reads the room runs away with it). A gentle catch-up: the outermost long-shot slots, if they hit, pay a little extra to whoever backed them — so a trailing player who nails a brave call can leap back in. Keeps the last Lots tense. Flag as tuning.

**The odds tuning is the key design work** — too generous and betting is trivial, too punishing and it frustrates. Needs prototyping; the Wits & Wagers payout board is a proven starting point.

---

## 6. Settings

| Setting | What it changes | Options | Default |
|---------|----------------|---------|---------|
| **Auction Length** | Number of Lots | 5 / 7 / 10 | 7 |
| **The Catalogue** *(renamed from "Category")* | Filters the Lot pool by flavour (see §9) | Mixed / Real-World Facts / Priceless Junk / [more TBD] | Mixed |
| **Reserve Price** *(new — the over/under toggle)* | If ON, an appraisal that exceeds the hammer price is "priced out"; closest *at or below* wins (v0.1's rule, now opt-in) | OFF / ON | OFF |
| ✨ **Sylly Mode — "The Forgery"** | Adds the hidden Forger role | OFF / ON | OFF |

*(If The Live Floor (§3a) graduates to a shipped mode, it'd sit here as a mode toggle — "House Style: Sealed Bids / Live Floor".)*

Keep the difficulty-flavoured dial first per house convention — **The Catalogue** doubles as that (a "Real-World Facts" catalogue is gentler and more guessable; "Priceless Junk" valuations are wilder and harder).

---

## 7. Sylly Mode — "The Forgery"

| Field | Answer |
|-------|--------|
| **Thematic name** | The Forgery |
| **In one sentence** | One Appraiser each Lot secretly knows the true value — and is trying to trick everyone into betting wrong. |
| **What changes** | Each Lot, one player is secretly The Forger. Their device privately shows the true value before they appraise. They submit a deliberately misleading appraisal and bet to cash in. Nobody knows who the Forger is — or, ideally, even *whether* a Lot has one. |
| **New screens?** | No — the secret value appears on the Forger's private appraisal screen. |
| **Changes scoring?** | Yes — reworked in v0.2 (below). |
| **Changes win condition?** | No — Forger points fold into the same total. |

### 🟦 v0.2 — the Forger rework (the v0.1 version was soft and a bit broken)

v0.1 scored the Forger **+1 per chip on any losing slot**. The problem: that rewards the Forger for chaos *they didn't create* — people misbet on their own all the time — and it's hard to feel like *your* lie did anything. Two sharper options:

- **Option A — The Honeypot (recommended).** The Forger scores only for chips placed **on the Forger's own (deliberately wrong) appraisal**. Now the lie has to actually *work* — they must price their fake appraisal in a believable, tempting spot (near the median, looking like a confident local-expert guess) to lure bets onto it. Skill-based deception, clean attribution, and it makes the Forger sweat over *where* to plant the fake. Big payoff if they sucker the room; nothing if everyone ignores them.
- **Option B — The Short.** The Forger secretly bets *against* the room: before the reveal they privately pick which appraisal they think the crowd will wrongly pile onto, and score if the crowd's biggest stack loses. More poker-like, less about their own fake guess.

A-with-uncertainty (some Lots have no Forger, so a suspiciously confident guess might just be… correct) is the most paranoid and fun. Flag balance for prototyping.

**The Forger is the natural multiplayer showcase** — the private "you alone know the answer" delivery is the MFS targeted-write pattern in miniature.

**Open question retained:** Forger rotates predictably (everyone gets a turn) vs random-per-Lot (some Lots have none). Random-with-uncertainty is more paranoid and fun but harder to balance.

### 🟦 Other Sylly flavours worth banking for later (not v1)
- **"The Ring" / Bidding Ring** *(pairs beautifully with the Live Floor)* — two secret colluders are trying to keep prices *down* and split the bargain, against everyone else.
- **"Buyer's Curse"** — every few Lots, the *winner* is secretly cursed and loses points instead — so a too-obvious frontrunner becomes a target.
- **"Mystery Lot"** — the item is hidden (just a silhouette and a cryptic clue) until after appraisals are locked. Pure nerve.

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
| Hidden role (Sylly) | **The Forger** |
| The Lot pool / category (new) | **The Catalogue** |
| Live bidding mode (new, if shipped) | **The Live Floor** |
| How to Play title | **"House Rules 🔨"** |
| Sylly Mode label | **✨ The Forgery** |

---

## 9. Word Bank & Content

| Field | Answer |
|-------|--------|
| **Uses `words.json`?** | No |
| **New data file needed?** | Yes — `data/gon-data.json` |
| **Entry schema** | `{ id, item, question, answer, unit, category, difficulty }` |
| **Content cost** | Medium-high. Each entry needs a real, verifiable, *surprising-but-googleable* answer. The main build cost — same investment as YGI. Needs `docs/gon-content-guide.md`. |
| **Content risk** | Facts can go stale (auction values, populations). Prefer stable facts (heights, weights, distances) mixed with fun-but-fixable valuations. Flag volatile values for periodic review. |

**Content design principle:** the best Lots have answers people *can* reason toward but rarely nail — that's what makes betting interesting. "How tall is the Eiffel Tower" (most are roughly right) is duller than "what did a first-edition Harry Potter sell for" (wild spread). Aim for the wild spread.

### 🟦 v0.2 — a proper starter Catalogue (so the content shape is visible)

Organised into the two flavours the Catalogue setting can filter on. These are illustrative — verify and expand before the content guide is final.

**"Priceless Junk" — auction valuations (funnier, on-theme, may date):**

| Item | Question | ≈ Answer |
|---|---|---|
| A 1983 Star Wars lunchbox | Auction value? | $240 |
| A first-edition *Harry Potter and the Philosopher's Stone* | Recent auction price? | $471,000 |
| A single 1952 Mickey Mantle baseball card | Record sale? | $12.6 million |
| A jar of Queen Victoria's era buttons | Typical lot value? | $60 |
| An original 1977 Apple-1 computer | Auction price? | $375,000 |
| A "moon dust" sample bag (flown on Apollo 11) | Auction price? | $1.8 million |
| Banksy's *Girl with Balloon* (the shredded one) | Price after it shredded? | $25.4 million |
| A wheel of 1.5-tonne aged Italian cheese | Wholesale value? | $80,000 |
| A celebrity's half-eaten breakfast (real eBay lot) | Winning bid? | $28 |
| A genuine Stradivarius violin | Auction record? | $15.9 million |
| A piece of "ghost-proof" chain mail (rubbish lot) | Realistic value? | $5 |
| The world's most expensive postage stamp (British Guiana 1c) | Sale price? | $8.3 million |

**"Real-World Facts" — stable, verifiable, gentler (never go stale):**

| Item | Question | ≈ Answer |
|---|---|---|
| The Eiffel Tower | Height in metres? | 330 |
| A blue whale's heart | Weight in kg? | 180 |
| The Great Pyramid of Giza | Original height in metres? | 147 |
| A standard London bus | Length in metres? | 11 |
| The Mariana Trench | Depth in metres? | 10,935 |
| An adult giraffe | Height in metres? | 5.5 |
| The Sydney Harbour Bridge | Mass of steel, in tonnes? | 52,800 |
| A bowling ball (max legal) | Weight in kg? | 7.26 |
| The distance Usain Bolt's 100m record | Time in seconds? | 9.58 |
| The average cumulus cloud | Weight in tonnes? | 500 |
| A grand piano | Number of strings? | 230 |
| The Moon | Distance from Earth, in km? | 384,400 |

That's ~24 across two flavours — enough to show the well is deep and to start prototyping. A shippable pool wants ~60–80; the structure is proven and easy to grow.

**The Catalogue setting** lets groups pick a flavour (gentle facts vs wild valuations) or Mixed — doubling as the difficulty dial.

---

## 10. Multiplayer Classification

| Field | Answer |
|-------|--------|
| **Primary mode** | Multiplayer-first. Private simultaneous appraisal and private bid placement both want individual devices. |
| **Private information** | (1) Each player's appraisal until the Line-Up. (2) Sylly: the Forger's true-value knowledge. |
| **Simultaneous actions** | Yes — appraisal submission and bid placement, both via the readyCheck matrix. |
| **Locked devices** | Brief waiting states between phases. |
| **Pass-the-phone fallback** | Workable for place-chips (pass-gate each appraisal, shared Line-Up, verbal/pass bets), clunky. Meaningfully better in multiplayer. |
| **🟦 The Live Floor (if pursued)** | Genuinely new: real-time contested bidding needs fast bid-lock arbitration (who tapped "raise" first), a shared climbing display, and a resettable countdown. The most demanding piece — spec carefully against MFS or hold for v1.5. |

> ⚠️ **MFS Revisit — §10:** Confirm simultaneous private bid placement then simultaneous reveal (the strongest experience). Confirm Forger private-knowledge delivery against the MFS v1.4 targeted-write pattern. If The Live Floor is in scope, the real-time bid contention is a new MFS requirement — assess separately.

---

## 11. Screens — Plain English List

1. **Game menu** — title, tagline, House Rules, Catalogue/length settings, Reserve Price toggle, The Forgery toggle, Back to the Box
2. **Setup** — player names; multiplayer lobby
3. **The Lot reveal** — item + appraisal question, shown to all (Sylly: Forger's device also shows the true value)
4. **Appraisal entry** — private number entry, waiting state until all in
5. **The Auction Floor (main screen)** — the persistent board: the Line-Up (sorted slots + odds + names), your chips, bid controls. The "Going once… SOLD" reveal animates here; the hammer price slides in; the winning slot lights gold; payouts tally.
6. **Lot result** — winnings this Lot, running leaderboard
7. **The Closing Gavel** — game over: final leaderboard, Top Appraiser crowned
8. **🟦 The Live Floor (if shipped)** — the big central climbing-bid display, raise buttons, the countdown, the SOLD slam, then the bargain/fleeced reveal

---

## 12. Design Notes

### The Auction Floor — the signature screen
- Horizontal value scale, appraisals cheapest (left) → priciest (right)
- Each slot shows value + appraiser name (named, not anonymous — see below)
- Odds beneath each slot
- Tap/drag bid-chips onto slots
- **The reveal:** the true hammer price slides in along the same scale as a marker (Wavelength touch) — you watch it land *between* guesses; the winning slot lights gold; gavel sound; chips animate into winnings.

Shared DNA with Read the Room's dial: both end with a hidden true value sliding into view along a scale. If both ship, this is a shared visual language across the box — worth designing the component once.

### 🟦 On legibility (revised for v0.2)
v0.1 spent a whole note on teaching "without going over" every round. **If you adopt the recommended "closest wins" default, that whole problem evaporates** — "the guess nearest the marker wins" needs no teaching; the slide shows it. This is the strongest practical argument for dropping the over/under default. (If you keep Reserve Price as a setting, *that* mode reinstates the grey-out teach — fine, since it's opt-in.)

### Named vs anonymous appraisals
Recommend **named** — betting on people you trust to know a category is the core Wits & Wagers skill and the social heart of the game. Anonymous is purer estimation but less interesting for this box.

### Auctioneer voice
The patter is free flavour and worth investing in — short, punchy auctioneer lines on the Lot reveal and the SOLD ("Sold! To the appraiser in the metaphorical hat") give the game its theatrical warmth. A small line pool per phase, mixed at random, goes a long way.

---

## 13. Out of Scope for v1

- ~~Real-time auction bidding~~ → **promoted in v0.2** to a considered option (§3a, "The Live Floor"); spec place-chips first, but it's no longer dismissed
- Custom/host-written Lots
- Multiple Forgers per Lot
- Persistent currency/economy across a session
- Image content for Lots (text descriptions only in v1 — images are a v2 content/licensing burden)

---

## 14. Mood & References

| Field | Answer |
|-------|--------|
| **Real-world games** | Wits & Wagers (direct source), with a Wavelength-style reveal; a dash of *Cash Cab*/auction-house theatre |
| **Tone** | Playful, theatrical (the auctioneer's patter), warm-competitive. The absurd Lots keep it funny. |
| **Should NOT feel like** | A hard trivia quiz (you can win without knowing answers), or a maths/finance exercise |
| **Example phrases** | "What's it worth?" / "Place your bids." / "I'm betting on Mia, she KNOWS cameras." / "Going once… going twice… SOLD!" / "Sold, to the fool in the corner — you wildly overpaid." |

---

## 15. Sample Round

**Setup:** 5 players (Mia, Jake, Sophie, Tom, Priya). 2 bid-chips each. Base game, **"closest wins"** default (no Reserve, no Forgery).

**The Lot:** *"A genuine 1983 Star Wars lunchbox — what does it fetch at auction?"* (True hammer price: $240.)

**Appraisals (private, simultaneous):**
- Tom: $20 · Priya: $75 · Mia: $180 · Jake: $300 · Sophie: $1,000

**The Line-Up** (sorted, with odds): $20 (4×) · $75 (3×) · $180 (2×) · $300 (2×) · $1,000 (4×)

**Betting:** Everyone sees the spread *and the names*.
- *"Sophie always overshoots, ignore the grand."* — Tom
- *"Mia knows collectibles, I'm on her."* — Priya, both chips on $180
- Jake hedges: one on $180, one on $300
- Mia backs her own $180 (both chips)
- Sophie, doubting herself, also bets $180
- Tom backs $75 (both chips)

**Going once… going twice… SOLD. Hammer price: $240.**

The marker slides in and lands between $180 and $300 — **closest is $300 (Jake's), at 60 away, vs $180 (Mia's) at 60 away.** A tie on distance! *(See note.)* Say the true price is $240 — $300 is 60 over, $180 is 60 under: dead heat. To avoid this, content should pick answers that don't sit exactly between two likely guesses; and the tie-break rule (below) resolves it cleanly.

*Cleaner replay with hammer price $250:* closest is **$300 (Jake), 50 away** vs $180 (Mia, 70 away). **$300 lights gold.**

**Payout (2× on $300):** Jake (1 chip → 2, +1 own-appraisal bonus = 3). Everyone who piled onto $180 (Priya, Mia, Sophie, and Jake's other chip) wins nothing. Tom (on $75) wins nothing.

**The lesson:** the crowd over-trusted Mia's "expertise" and bunched on $180, while Jake's bolder $300 quietly sat closest. Reading the room is the skill — but the room can be wrong together, and that's the funniest outcome of all. **Leaderboard updates. Next Lot.**

> 🟦 **Tie-break note (new):** when two slots are equidistant from the hammer price, default to the **higher** bid winning (the auction-native call — the bigger offer takes it). Cheap to implement, thematically right, and removes the awkward dead-heat. Flag for spec.

---

*v0.2 summary of what changed and why: the over/under rule was demoted to an optional "Reserve Price" because "closest wins" is friendlier and needs no re-teaching; live bidding ("The Live Floor") was promoted from out-of-scope to a real option because it's the fun the title promises; the Forger was rebuilt around luring bets onto its own fake (clean attribution, real skill); a 24-item starter Catalogue and auctioneer-voice notes were added for flavour; and a higher-bid-wins tie-break was introduced. Nothing is locked — push back on any of it.*
