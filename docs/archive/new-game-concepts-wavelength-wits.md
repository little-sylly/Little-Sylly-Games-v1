# New Game Concepts — Wavelength × Wits & Wagers
## For: Little Sylly Games — future phase consideration
## Status: Early brainstorm — concepts for discussion, not briefs

Brief focused on **simplicity, short play, fun**. Each concept names which parent mechanic it leans on, the one-screen UX, and the Sylly twist. The appraiser theme is developed first and most deeply since it's the one you're drawn to — but I've pulled the underlying mechanic apart into a few directions so you can see the option space.

---

## What we're actually borrowing

**From Wavelength:** one person sees a hidden value; they give a clue; everyone else places a marker on a scale to find it. A touchscreen dial/slider is *better* than the physical cardboard dial — this mechanic was almost designed for a phone.

**From Wits & Wagers:** everyone estimates a number; the guesses get sorted; then the real game is *betting on whose guess is closest*. You can win without knowing anything — you just need to read who does. "Closest without going over" is the elegant scoring hook.

**The shared DNA:** both are about estimating a value and judging confidence — yours or someone else's. That's the seam an appraiser theme runs straight down.

---

---

# CONCEPT A — "GOING ONCE" *(the appraiser idea, developed)*
### What's it worth? Bid and find out.

**Leans on:** Wits & Wagers (estimate + bet), with a Wavelength-style reveal.

---

## The Pitch

An item appears — a vintage lunchbox, a "signed" celebrity napkin, a suspiciously ugly vase. Everyone privately appraises its real-world value. The guesses get lined up cheapest to priciest, and then the actual game begins: everyone places their bid-chips on whichever appraisal they think is closest to the true value — without going over. The auctioneer reveals the real price. Closest-without-going-over wins the lot.

You don't need to know what a 1962 lunchbox is worth. You need to know which of your friends *does* — or which is bluffing. That's the whole game, and it's quick.

**Why it works for Little Sylly:**
The appraiser/auction-house theme is warm, funny, and instantly legible. The vocabulary writes itself (lots, bids, the gavel, going once/twice/sold). It's the *most accessible* of all these concepts — write a number, place your chips, reveal. A round takes 90 seconds. It scales from 3 to 10. And the "is this real or am I being conned" energy of valuing weird items is genuinely funny.

---

## Identity (rough)

| Field | Value |
|-------|-------|
| Working name | **Going Once** *(alternatives: "Sold!", "The Lot", "Hammer Price", "Reserve")* |
| Short ID | `gon` |
| Tagline | *"You don't have to be right. You just have to bet right."* |
| Universe | A chaotic auction house appraising increasingly questionable items |
| Emoji | 🔨 |
| Brand colour | Deep auction-house green or burgundy — `emerald-700` or `red-900` |

---

## Core loop (one round)

1. **A Lot is revealed.** An item + a question with a real numerical answer: *"A genuine 1980s Star Wars lunchbox — what does this sell for at auction?"* All players see it.
2. **Appraise.** Everyone privately types their valuation (a number). Short timer.
3. **The line-up.** All appraisals are revealed and auto-sorted cheapest → priciest along a single scale. Duplicate guesses stack.
4. **Place your bids.** Each player has 2 bid-chips. They place them on the appraisal(s) they think is closest to the true value *without going over*. You can bet on your own, or someone else's, or split. (You see everyone's guesses before betting — the social read is the game.)
5. **Going once… SOLD.** The auctioneer reveals the true value. The winning appraisal = closest without going over. Chips on it pay out (with bigger payouts for the riskier, more extreme guesses, exactly like Wits & Wagers' odds structure).
6. Next Lot. First to a target score, or most points after N lots, wins.

**The "without going over" hook:** if your appraisal exceeds the true value, you're disqualified for that lot — overbidding at auction. This adds a lovely tension: the highest guesser is often wrong by definition.

---

## One-screen UX

Single persistent "auction floor" screen:
- **The Lot** (top): item name + the appraisal question
- **The Line-Up** (middle): a horizontal scale, guesses populate left (cheap) to right (expensive) as chips, with payout odds beneath each (centre/median pays least, edges pay most)
- **Action area** (bottom): appraise input → then bid-chip placement → then the reveal animation (gavel + "SOLD")

---

## Sylly Mode — "The Forgery"

One Lot per game is a **fake**. The Sylly twist: one player each round is secretly **The Forger** — they saw the true value before appraising and are trying to manipulate where the crowd bets by placing a deliberately misleading guess. They score if the crowd bets wrong. A hidden-role layer on top of the estimation game — light, optional, adds a Wavelength-style "one person knows" secret.

*(This is also the natural multiplayer hook — The Forger's secret knowledge is delivered privately to one device.)*

---

## Content

Needs a data file: `data/gon-data.json`. Each entry: `{ id, item, question, answer, unit }`. E.g. `{ item: "Star Wars lunchbox (1983)", question: "Auction value?", answer: 240, unit: "$" }`. Highly reusable format. Content is the main build cost — needs a good pool of funny, surprising, googleable-but-not-obvious items. This is the YGI content-guide pattern again.

---

---

# CONCEPT B — "READ THE ROOM"
### The purest Wavelength port.

**Leans on:** Wavelength (one knows, others dial), almost directly.

---

## The Pitch

One player — the Mind — secretly sees a target zone on a spectrum between two opposites (*Overrated ←→ Underrated*, *Comfort Food ←→ Fancy Meal*, *Childhood Ruined ←→ Childhood Made*). They give a one-word or one-phrase clue. Everyone else turns a dial to where they think the target is. Closer = more points. That's it. Sixty seconds a round.

**Why it works for Little Sylly:**
The dial *is* a touchscreen-native mechanic — arguably better on a phone than in the original box. The spectrum-card content is pure writing, no licensing, infinitely expandable, and the "Sandwich ←→ Not a Sandwich" style of absurd spectrum is exactly the Sylly tone. Dead simple, very fast, very funny.

The risk: it's the *closest* to a straight clone, so the design work is almost entirely in the theming and the spectrum-card writing rather than mechanics.

---

## Identity (rough)

| Field | Value |
|-------|-------|
| Working name | **Read the Room** *(alts: "On the Same Page", "Mind Meld" — wait, that's taken by Great Minds; "Vibe Check", "Same Page")* |
| Short ID | `rtr` |
| Tagline | *"One clue. One dial. Are we on the same page?"* |
| Universe | Pure social/abstract — no heavy theme, lean and clean |
| Emoji | 🎯 |
| Brand colour | `indigo-500` |

---

## Core loop (one round)

1. **The Mind** (rotating role) privately sees the spectrum card (two opposite concepts) and a hidden target zone on the dial.
2. They give **one clue** that points to where the target sits between the two extremes.
3. Their team turns the dial to guess. (Optionally: the *other* team then bets left-or-right of that guess, à la Wavelength's opposing-team mechanic.)
4. Reveal the target. Score by proximity.
5. Rotate the Mind. First team to target score wins.

---

## One-screen UX

The dial is the whole screen. A beautiful arc/gauge with the two concepts at each end. The Mind's view shows the hidden target highlighted; everyone else's view is blank until they place the dial. Reveal animates the hidden zone sliding into view.

---

## Sylly Mode — "Static"

The clue must be a *single word* (normal mode allows a short phrase), AND a random "interference" modifier is added — the Mind must give their clue in a constraint: only a movie title, only a food, only an emotion. Ramps the difficulty and the laughs.

---

## Content

`data/rtr-data.json`: `{ id, leftConcept, rightConcept, difficulty }`. The most reusable, lowest-effort-per-entry content of all three concepts — just opposing word pairs. Could ship with hundreds easily.

---

---

# CONCEPT C — "THE PANEL"
### Appraisers who don't agree.

**Leans on:** both, with a twist toward judgment/opinion rather than facts.

---

## The Pitch

A hybrid that solves Wits & Wagers' one weakness (it needs factual trivia answers) by making the "true value" a matter of *crowd opinion* rather than fact. An item or scenario appears. Instead of a factual price, the answer is *what the group itself collectively thinks* — and you're betting on predicting the group consensus.

Example: *"How essential is a dishwasher? Rate 0–100."* Everyone secretly rates it. The "true answer" is the group average. You score by guessing where the group average lands — reading the room, not reading a fact sheet.

**Why it works for Little Sylly:**
No content-accuracy burden — there are no "correct" answers to research and verify, which makes the content file trivial to write and impossible to get factually wrong. It's about knowing your friends. The appraiser framing still works (you're appraising *taste*, not facts). But it's the most abstract of the three and the hardest to make instantly graspable.

---

## Identity (rough)

| Field | Value |
|-------|-------|
| Working name | **The Panel** *(alts: "Hot Take", "Consensus", "The Average Friend")* |
| Short ID | `pnl` |
| Tagline | *"The right answer is whatever we all think."* |
| Universe | A panel of judges/critics rating everything |
| Emoji | 📊 |
| Brand colour | `amber-600` |

---

## Core loop (one round)

1. A prompt appears: *"Rate how overrated brunch is, 0–100."*
2. Everyone secretly rates it on a slider.
3. The group average is calculated (the hidden "true value").
4. Players bet on / guess where the average landed.
5. Closest to the group average scores.

---

## Sylly Mode — "The Contrarian"

One player secretly must aim to drag the average *away* from consensus and scores if the final average lands in a wild zone. A hidden-role saboteur of the vibe.

---

## Content

Trivially simple: `data/pnl-data.json` = `{ id, prompt }`. No answers needed. Lowest content cost of all. But the mechanic needs careful tuning so guessing the average is actually fun and not just maths.

---

---

# Comparison

| | Going Once 🔨 | Read the Room 🎯 | The Panel 📊 |
|---|---|---|---|
| **Parent mechanic** | Wits & Wagers | Wavelength | Both / opinion hybrid |
| **Simplicity** | Medium | Highest | Medium |
| **Round length** | ~90 sec | ~60 sec | ~75 sec |
| **Content build cost** | High (factual items + answers) | Low (word pairs) | Lowest (prompts only) |
| **Content risk** | Facts can be wrong/outdated | None | None |
| **Theme strength** | Strongest (auction house) | Weakest (abstract) | Medium |
| **Touchscreen fit** | Good | Best (dial) | Good (slider) |
| **Hidden-role Sylly hook** | The Forger | Static (constraint) | The Contrarian |
| **Your stated interest** | ★ the appraiser idea | | partial appraiser fit |

---

# My honest read

**Going Once** is the one to chase if you want the appraiser theme — it's the richest, funniest framing and the auction vocabulary is a gift. The catch is content: you need a well-curated pool of items with real, surprising, verifiable values, and you'll want to keep it fresh. That's the same content investment YGI required, so you have a proven pattern for it.

**Read the Room** is the one to chase if you want *simplicity and speed above all*. The dial is the best touchscreen-native mechanic of the three, content is cheap and endless, and it's the fastest to ship. The downside is it's the closest to a direct clone, so its identity has to come entirely from the theme and the spectrum-card wit.

**The Panel** is the clever one — it removes the factual-accuracy burden entirely by making the group its own answer key. Lowest content cost, no game-night arguments about whether the answer card is wrong. But it's the most abstract and would need the most careful prototyping to confirm it's actually *fun* and not just an averaging exercise.

**If simplicity-first is the real priority:** Read the Room. **If the appraiser theme is the real priority:** Going Once — and I'd fold in the touchscreen dial from Read the Room for the reveal, so the appraisal scale *is* a dial you watch the true value land on. That combination — Wits & Wagers betting + a Wavelength reveal dial, wrapped in an auction house — is the strongest single game in this whole set.

Want me to take any one of these to a full Phase 1 brief?
