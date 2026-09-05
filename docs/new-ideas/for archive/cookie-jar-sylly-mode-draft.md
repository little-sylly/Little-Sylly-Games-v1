# Cookie Jar — Sylly Mode Design (Final Draft)
**Name:** Dibber Dobber *(name flagged for review — see §10)*
**Status:** Mechanics settled and balance-tested via simulation, at the deck size in effect when that testing was run; terminology re-synced. **v3 (2 Aug 2026): deck shortened from 16 cards to ~10 + Treat (~11) — see §2 and the note below — plus the Open Book setting from the main brief's §7 threaded through the reveal rules (§6, §9). v2: terminology matched to `new-game-brief-cookie-jar.md` (Cookie Raid / Take / Play Innocent), Treat priority reversed, Treat deck-entry guaranteed, Crumb Debt added.**

**Why the deck shortened in v3.** This mode has no bust and no leaving, so a Raid always plays out its entire deck — at 16 cards, a Full Feast (5 Raids) was a fixed 80 decision points at a 15-second timer each, which breaks the main brief's "10–15 minute" time estimate (that estimate was computed for the base game, where a Raid self-terminates early on a bust or a last-player-leaving). Cutting to ~10+1 was chosen over shortening the timer or capping Raid count because it also concentrates the Favourite/Watcher mechanic — the actual hook of this mode — into fewer flips per Raid, and because more (shorter) Raids preserve more rolls of that per-Raid-reassigned mechanic than fewer (longer) ones would. **Every balance number in this document below was tested at the old 16-card size and needs a re-run at ~11 cards** — the *rules* are unaffected by deck size, but exact win-rates, wipeout probabilities, and the Play-Innocent-lean percentage all move with fewer flips per Raid to accumulate in.

**Soft-locked, not frozen.** The *mechanics* here are firm — they're the output of real simulation work and shouldn't be changed casually. But this document was written without codebase access, so anything about screens, dimensions, timings or implementation (§9 in particular) is a starting point for whoever has the project in front of them. Several v2/v3 changes are reasoned but unsimulated and are marked `[FLAGGED]` where they appear. See the brief §0.1 for the FIRM / SOFT / OPEN convention used across both documents.
**Theme:** "Who took the cookies from the cookie jar?" — accusation, denial, and pointing fingers.
**Companion to:** `new-game-brief-cookie-jar.md` §8, §19

---

## 0. Terminology Note (read first)

This document previously used **Operation**, **Reach In** and **Sneak Out**. Those are superseded:

| Old term | Now | Why |
|---|---|---|
| Operation | **Cookie Raid** (short form: **Raid**) | Single round term across both docs — "Operation" is retired everywhere |
| Reach In / Reach | **Take** | Matches the rhyme — "who *took* the cookies". Same word in both base game and Sylly Mode, same meaning in both |
| Sneak Out / Sneak | **Play Innocent** *(Sylly Mode only)* | **Critical:** in the base game **Sneak Out** means bank and leave the Raid. In Sylly Mode nobody ever leaves — the action is "stay put and look casual". Two different behaviours, so two different names. Do not use "Sneak" anywhere in Sylly Mode copy. |
| Dob | **Dob** (unchanged) | See §10 for the open naming question |

**Sylly Mode actions: Take / Play Innocent / Dob.**
**Base game actions: Take / Sneak Out.**

---

## 1. Summary

Every flip, all players simultaneously and secretly choose one of three actions before the card is revealed: **Take**, **Play Innocent**, or **Dob**. The card then resolves based on both the card type and which actions were chosen.

Take is the core, highest-ceiling path to winning — the actual "do I dare grab another one" fantasy the game is about. Play Innocent is the safe, steady fallback that never traps a player but shouldn't be how you win. Dob is the disruptive, situational spice — it denies Takers something and occasionally steals a Treat outright, but it isn't a personal jackpot engine.

**Nobody leaves a Raid in this mode.** All players are in for every flip, start to finish. There is no bust and no elimination. Cookies can't go below zero, and a player who bottoms out stays in play and can still win Crumb splits — nobody is ever benched and just watching. A Raid ends when that Raid's deck runs out. Multiple Raids are played per match, since each player's affinities reset every Raid and are part of the replay value.

---

## 2. Deck Construction

**Shortened in v3** — the cut size changed from 15 to ~10 cards; the two-step structure and the reasoning for cutting after the Treat is added are unchanged from v2.

Each Raid's deck is built in two steps:

1. Combine the full 15 Cookie cards + full 15 Caught! (Family) cards into one 30-card pool and **cut it randomly to ~10 cards.**
2. **Add that Raid's scheduled Treat** (per the fixed Raid 1–5 schedule in the brief §10) and shuffle. **~11-card deck.**

The Treat is added *after* the cut, so **the Raid's Treat is always in the deck.** *(Changed from v1, where the Treat went into the pool before the cut and therefore had a ~50% chance of never being dealt at all — across a 5-Raid match that meant roughly half the Treat cards, and half the Treat art, would never be seen.)*

**Why ~10 instead of 15 (v3):** this mode has no bust and no early leave, so every Raid plays its *entire* deck — a 15+1 deck at 5 Raids was a fixed 80 flips at a 15-second timer each, well past the main brief's "10–15 minute" target (which was computed for the base game's self-terminating Raids, not this mode's fixed-length ones). Cutting to ~10+1 brings a Full Feast down to a fixed ~55 flips, and concentrates the Favourite/Watcher reassignment — the mechanic that gives this mode its replay value — into fewer flips per Raid rather than diluting it. **This changes the deck's variance profile and invalidates the specific percentages in §8's "Dibber Dobber deck variance" note below, which were computed for a 15-card cut — re-run required before those numbers are cited again.**

**The Cookie/Family cut is a genuine random cut of the combined pool, not a proportional per-type split.** A Raid's resulting ~10 Cookie/Family cards can skew Cookie-heavy or Family-heavy purely by luck — some Raids will feel generous, others hostile. This is intentional: it shortens Raids (a function of deck size, not composition), and it means players can never count cards to calculate safe odds, since even the deck's *makeup* for that Raid is unknown until cards start flipping. **At a smaller cut size, this variance is proportionally larger than it was at 15 cards** — worth watching for in the simulation re-run, since a ~10-card cut has more room to land unusually Family-heavy than a 15-card one did.

---

## 3. Actions × Card Type Reference

| | 🍪 Cookie | 🍰 Treat | 👪 Family Member |
|---|---|---|---|
| **Take** | Split the cookies with other Takers (unless Dobbed, see below) | **1st priority** — wins outright if you're the only Taker (see §5) | **Risk:** caught — lose cookies to Crumbs. Reduced/none if you're that family member's Favourite, doubled if it's your Watcher |
| **Play Innocent** | Split the Crumb pile — *unless a Dobber is present this flip, in which case Innocents get nothing and Crumbs stay put* | **3rd priority** — wins outright only if you're the only Innocent *and* nobody won it above (see §5) | Split the Crumb pile — *same Dobber-presence exception as Cookie* |
| **Dob** | Steals 2 cookies per Dobber (capped at the card's value), split among Dobbers — remainder goes to Takers, not Crumbs. Backfires (Dobber loses 2) if nobody Took | **2nd priority** — wins outright if you're the only Dobber *and* no lone Taker won it (see §5) | Always backfires — flat 2 cookie loss, no matter what anyone else did |

**Ties** on any claim split the reward evenly, remainder to Crumbs.

---

## 4. Cookie Cards — Full Resolution

1. If Takers **and** Dobbers are both present:
   - Dobbers steal `min(2 × number of Dobbers, card value)`, split evenly among themselves (remainder → Crumbs)
   - Whatever's left of the card value goes to Takers, split evenly (remainder → Crumbs) — this can be zero if enough Dobbers showed up to consume the whole card
2. If only Takers present: split the card value evenly, remainder → Crumbs, as normal
3. **If only Dobbers present (no Takers):** each Dobber loses 2 cookies (backfire), added to Crumbs — **and the card's full cookie value is unclaimed and goes to Crumbs as well** *(this branch was previously silent on what happened to the card value)*
4. **If nobody Took and nobody Dobbed (everyone Played Innocent):** the full card value goes to Crumbs, unclaimed
5. **Innocents get their share of the current Crumb pile — unless any Dobber is present this flip, in which case Innocents get nothing, and the Crumb pile is left untouched for a future flip.** This step runs last, so on an all-Innocent flip (point 4), Innocents immediately absorb that flip's own contribution — same instant-availability rule as everywhere else in this design, no delay.

Point 5 is the "scare-off" rule — Dob's presence disrupts Play Innocent on Cookie cards, not just Take.

**All uneven splits, everywhere in this mode, send the remainder to Crumbs** — Taker splits, Dobber splits, and Innocent Crumb splits alike. There is no other destination for an unsplittable remainder.

---

## 5. Treat Cards — Full Resolution

Never split. Priority order: **Take > Dob > Play Innocent.**

*(Reversed from v1, which ran Sneak > Dob > Reach. Rationale in §8.)*

- If exactly one player Took this flip, they win the Treat outright (full 5 or 10 points)
- Else, if exactly one player Dobbed, they win it outright
- Else, if exactly one player Played Innocent, they win it outright
- **"Solo" is evaluated in priority order, not independently.** A player is only a candidate if they are the sole chooser of their action *and* no higher-priority action had a sole chooser. Two players can both be "the only one who chose X" for different X — the higher-priority one wins, the other gets nothing. *(This was ambiguous in v1's table wording, where every row read "wins outright if solo".)*
- If nobody is uniquely solo in any category, the Treat stays unclaimed and re-contests on the next flip within the same Raid
- **If still unclaimed when the Raid ends, the Treat vanishes** — it does not carry forward to the next Raid

**Flavour note:** Take winning the Treat is the literal reading of the rhyme — you reached in and grabbed the good stuff. Dob winning it second reads as the family rewarding the honest child ("good boy — here, have this"). Playing Innocent gets you the Treat only when nobody else was uniquely brave or uniquely loud.

---

## 6. Family (Caught!) Cards — Full Resolution

Each player's outcome depends on their own action, plus the "scare-off" exception below:

- **Take:** caught — lose cookies to Crumbs. Base loss for a neutral family member, **zero loss** if you're that family member's Favourite ("Not me!"), **doubled loss** if it's your Watcher ("Yes, you!")
- **Play Innocent:** split the Crumb pile — **unless any Dobber is present this flip**, in which case Innocents get nothing this flip ("Then who?" — they slip away, but so does the loot)
- **Dob:** always backfires — flat loss, added to Crumbs (the accusation boomerangs back on the accuser)

**Numbers locked via simulation:** Take loss = 0 / 2 / 4 (protected / neutral / doubled by affinity). Dob backfire = flat 2.

### Crumb Debt — the zero-cookie Dob fix *(new in v2)*

**Problem:** cookies can't go negative, so a player sitting on 0 pays nothing for a backfired Dob. Dob at 0 has no downside branch at all — steal 2 whenever anyone Takes, lose nothing when they don't. The correct play at 0 is therefore to Dob every single flip, which is degenerate and griefy for everyone else at the table.

**Fix:** if a player owes cookies (a backfired Dob, or a caught Take) and can't pay in full, the shortfall becomes **Crumb Debt** — cookies owed to the Crumb pile. Any cookies that player subsequently gains go straight to Crumbs until the debt is cleared.

- Their displayed cookie count never goes below 0 — no negative numbers on screen
- They are never benched; they keep choosing an action every flip
- A permanent Dobber at 0 now nets nothing: each steal pays down the debt each backfire creates
- **Debt is capped at 6** so it can't spiral out of reach for a young player — **[SOFT] the number 6 is a guess, not a tested value**
- Debt clears at the end of the Raid — it does not carry into the next Raid
- Display: a small "owes 2 🍪" chip next to that player's count

`[FLAGGED: this is a proposed fix, not simulation-tested. Needs a re-run against the locked ruleset before it's called final — specifically whether the cap of 6 and the per-Raid clear are the right numbers.]`

### Favourite / Watcher — framing and visibility

**You are the family member's Favourite or Watcher, not the other way around.** "You're Mum's favourite" is the hook — mummy's boy, daddy's girl, the sibling the pet always follows. It's the family member's disposition toward the player, not the player's own preference. Watcher doesn't need this flip — "Dad's onto you" already points the right direction either way.

**Visibility — resolved:** each player **can see their own** Favourite and Watcher for the current Raid, permanently, on their own device. They are hidden from every other player. This is strategic information, not a surprise mechanic — knowing "Dad's my Watcher this Raid" is exactly what should make a Take feel dangerous when the Dad slot is lit on the warning strip.

- Persistent on-screen, own device only: two labelled text lines (no bespoke icons needed) — e.g. `⭐ Favourite: Mum` / `👁 Watcher: Dad`
- Reassigned at random at the start of every Raid
- A player's affinity becomes public *only* at the moment it resolves — the reveal line "Ava took from the jar, but she's Mum's favourite. Safe!" tells the table. This is intentional; it's the payoff moment.

### The song's beats, mapped onto existing outcomes (no new mechanics — flavour/reveal-animation only)

| Outcome | Reveal-moment line (example) | Log line (compact, example) |
|---|---|---|
| You're their **Favourite** (protected) | *"Turns out you're Mum's favourite — she looks the other way. Not me!"* | *"Ava took from the jar — but she's Mum's favourite. Safe!"* |
| Neutral family member | *"Big Sibling spots you mid-grab. Caught!"* | *"Ben took from the jar. Big Sibling caught him — lost 2!"* |
| It's your **Watcher** (doubled) | *"Dad's had his eye on you all day. Busted — and it costs you double!"* | *"Cal took from the jar — Dad's his Watcher. Busted for double!"* |
| Play Innocent (successful or scared off — one shared line either way, per decision) | *"You didn't touch a thing. Who, me? Then who?"* | *"Dana played innocent — picked up 3 crumbs."* |
| Dob backfire | *"You point the finger... but nobody's buying it."* | *"Ben tried to dob — but nobody was taking. Backfired!"* |
| Dob backfire into debt | *"You point the finger... and now you owe the crumb jar."* | *"Ben's dob backfired — owes 2 to the crumbs."* |

**Nice-to-have for later polish, not locked:** per-family-member flavour on *why* a player is their Favourite, rather than one uniform line — e.g. Mum → "Mummy's little angel strikes again," Dad → "Daddy's best mate gets away with it," Big Sibling → "Their favourite sibling. Lucky you," Little Sibling → "They idolise you too much to snitch," Family Pet → "Even the dog's on your side." The uniform line works fine as the baseline if this doesn't get built.

---

## 7. Core Rules

- **Affinities:** each Raid, every player is secretly assigned one family member as their **Favourite** (that family member goes easy on them — the +affinity mechanic) and one as their **Watcher** (that family member's onto them — the −affinity mechanic). Visible to that player only, hidden from everyone else. Reassigned at random each Raid, doesn't carry over.
- **Crumbs:** a single pool that persists and accumulates across the whole Raid — fed by caught Takers' losses, Dob backfires, Crumb Debt repayments, and unclaimed remainders. Available to Innocents instantly, same flip — except when the scare-off rule applies (Dobber present on Cookie or Family cards). Crumbs do not carry between Raids.
- **No bust, no negative cookies, no leaving:** nobody ever loses more than they have, and nobody exits a Raid early. A player at zero cookies keeps playing normally and can still win Crumb splits.
- **Raid end:** when the Raid's ~11-card deck runs out (shortened from 16 in v3 — see §2).
- **Starting stash: 5 cookies, granted ONCE at the start of the match.** *(Clarified in v2 — this is not a per-Raid top-up. Cookies carry across Raids as a single running total; a 5-Raid match grants 5 cookies total, not 25. A per-Raid grant would hand out 25 free cookies over a Full Feast and badly dilute the skill signal.)* Flagged for tuning after playtesting if players feel insufficiently pressured early.
- **Settings hidden while this mode is active:**
  - **Kitchen Rules** — all 3 options (Standard Burn / On Guard / High Alert) govern what happens on a bust. This mode has no bust, so none of them have anything to act on.
  - **Snack Friendly** — all 3 options exist to prevent an early bust ending a Raid before anyone banks anything. Same reasoning: no bust to prevent, and a Family card on flip 1 costs at most 4 cookies out of a starting 5. *(New in v2 — this was previously unaddressed while Kitchen Rules was already hidden.)*
  - **Match Length** stays visible and functional.

---

## 8. Balance Testing — What Was Tried and Why the Current Version Won

This mode went through several structurally different versions before landing here. Recorded for context, not for re-litigating:

| Version tried | What happened | Why it was dropped |
|---|---|---|
| Dob steals 100% of Takers' pot | Take wiped to zero 73–96% of the time at 6–8p | Contradicted the "no bust, nobody's wiped" philosophy applied everywhere else |
| Dob steals a fixed % of the pot (65–75%) | Fixed Take's wipe-rate, but needed a percentage — messy to teach | Dropped in favour of a flat-number system |
| Dob steals a flat total, split among Dobbers | Take's wipe-rate improved, but Dob's own EV became negligible against big cards (flat numbers can't scale with card value 1–17) | Flat totals don't scale; either too weak (flat 1) or too easily capped (flat 2, still weak against big cards) |
| Dob steals a flat amount **per Dobber**, remainder to Crumbs | Fixed Dob's scaling problem, but sent large amounts to Crumbs whenever few Dobbers faced a big card — made Play Innocent dominant via a new pathway | The "remainder to Crumbs" step was the bug — Innocents vacuumed it up instantly |
| Dob steals flat 2 per Dobber, **remainder to Takers** | Dob's EV now *grows* with player count (more Dobbers = bigger combined steal) instead of shrinking; Take's wipe-rate stays reasonable (13–48% across 3–8p) | **This is the version locked in §4.** |
| Play Innocent always safe (original) tested over a **full Raid** with committed archetypal players | Innocent-leaning players ended Raids with 5–8x the cookies of Take/Dob-leaning players — a compounding "constant parasitic drip" effect invisible in single-flip testing | Motivated the scare-off rule |
| Scare-off applied to Cookie cards only | Barely moved the full-Raid imbalance (32.99 → 32.67 average) | Family cards were the dominant Crumb-generation channel, not Cookie |
| **Scare-off applied to both Cookie and Family cards** | Flipped the hierarchy to Take (12.80) > Play Innocent (9.18) > Dob (8.18) — tight spread, Take on top as intended | **This is the version locked in §4/§6.** Note: reverses the earlier "Family cards have zero cross-player interaction" decision — a deliberate, acknowledged trade. |

### Treat priority reversal — reasoning *(v2, not yet simulated)*

v1 ran **Sneak > Dob > Reach**, inherited from the base game where Sneaking Out means physically carrying the Treat out of the kitchen. That justification doesn't exist in this mode, because nobody leaves. Three reasons to flip it to **Take > Dob > Play Innocent**:

1. **It pulls the same direction as the stated design intent.** Take is meant to be the highest-ceiling path. Giving the safest action first claim on the single biggest prize in the Raid works against that.
2. **It counteracts the known Play Innocent lean.** Fully adaptive players still choose the safe action ~47–53% of the time against a 33% baseline (see below). Handing that action the Treat reinforces the pull.
3. **Solo-ness probability already balances it.** The most-chosen action is the *least* likely to have exactly one chooser, so a solo Take is rare — the Treat becomes a genuine jackpot for a risky play rather than a routine payout.

`[FLAGGED: not simulation-tested. Take's EV rises by 5–10 points on the flips where it lands, which should widen an already-intended lead rather than break anything — but it needs a confirming run before it's called final.]`

**Known, accepted softness (not further chased):**
- The Family-card penalty gap widens at 7–8 players specifically (Play Innocent edges ahead of Dob there) under the pre-scare-off numbers — worth re-checking against the final scare-off version in real playtesting.
- Even fully adaptive, learning players (not locked into a fixed strategy) still lean toward Play Innocent somewhat more than an even split (~47–53% vs. an even 33% baseline) over a full Raid. This is a soft, real pull, not a dominant strategy — Dob and Take are still chosen often. Treated as acceptable for a casual kids' game rather than something to eliminate outright.
- All balance testing used an artificially stabilised deck (7 Cookie + 7 Family + 1 Treat every Raid) to isolate rule-balance from deck-composition luck. The real game's deck (§2) is a genuine random half of the combined Cookie/Family pool and can skew Cookie- or Family-heavy — this will introduce real Raid-to-Raid variance the testing didn't capture. Treated as a deliberate feature (unpredictability, no card-counting), not a flaw to fix.

---

## 9. UI Notes Specific to This Mode

**[SOFT — this whole section.]** Full UI spec lives in the brief §14, which carries the same caveat. What's durable here is the *list of things this mode needs the UI to express*; how they're built is for the technical spec.

Sylly-Mode-specific requirements:

- **Three action buttons** instead of two: Take / Play Innocent / Dob. Same suite button component, one per row — no bespoke art needed for Dob.
- **Affinity display:** two persistent text lines on the player's own device (Favourite / Watcher). Text only, no icon assets required. **Never gated by Open Book (new in v3)** — this is a different kind of information from a running score (assigned once per Raid, strategic for the owning player specifically), so it stays private to that player regardless of the Open Book setting. Delivered via `mpSendPrivate` — one send per player at Raid-start, with no repair packet needed since the value never mutates mid-Raid (see the main brief §12 for why this is the one place that channel is used at all in this game).
- **Crumb pile "locked" state:** when a Dobber is present, the Crumb pile is visible but unclaimable this flip. Needs a distinct visual state (dimmed + a short label) or players will read the scare-off rule as a bug.
- **Crumb Debt chip:** small "owes N 🍪" indicator next to an affected player's count. Reset to zero for every player inside each Raid-start SYNC payload, not just in the host's local state — an accumulator a client isn't sent a reset for carries the previous Raid's values forward.
- **No bust screen, no BUSTED! animation** in this mode — the Raid always ends by the deck running out.
- **Reveal must show per-player deltas — gated by the new Open Book setting (v3), not unconditionally.** With Open Book On (default), every player's exact delta is shown — a single flip can contain a steal, a split and a scare-off simultaneously, and names-in-zones alone doesn't communicate that. With Open Book Off, only the viewing player's own delta is exact; every other player's outcome is shown as a qualitative flavour line (see §6's reveal-line examples — e.g. "Ben tried to dob — but nobody was taking. Backfired!"), which still teaches the rule without exposing the number.
- **Decision timer, host-authoritative, auto-resolving to Play Innocent** (the safe action) on timeout. **[SOFT] 15 seconds as a starting value.** There is no server in this project's architecture — the host computes and broadcasts an `endTimestamp` at flip-start (matching GTH's `GTH_PHASE2_BEGIN` pattern) and is the only device that resolves the timeout; clients display the countdown but never self-resolve. **This collides with the engine's global 8-second sync-lock auto-release** (`mpLockSync()`), which is shorter than the 15-second decision window — the Waiting-state UI must be driven by this mode's own ready-check flag, not by the shared `mp-sync-locked` CSS class, or a fast player's buttons will visually unlock mid-flip while the table is still waiting on someone slower.

---

## 10. Open Items

- **Mode and action naming — "Dibber Dobber" / "Dob".** Australian/British slang; won't parse for US or international players on first read. *Recommendation: keep it.* "Point" collides with *points* (the Treat scoring currency), the reveal copy already carries the meaning without a glossary, and a Sylly Mode is the right place for regional charm. If a global-legibility swap is ever wanted, **"Tattle" / mode "Tattletale"** is the clean one-for-one replacement — a single find-replace in both docs.
- **New in v3 — the deck-size cut itself (16 → ~11 cards, §2) needs a full simulation re-run before this document's balance numbers can be trusted again.** Every percentage below this line, and the "12 Family / 3 Cookie" variance figures in the main brief §19, were computed at the old 15-card cut and are now stale.
- Crumb Debt: cap value (currently 6) and per-Raid clear — proposed, needs simulation (at the new deck size)
- Treat priority reversal (Take > Dob > Play Innocent) — reasoned, needs simulation (at the new deck size)
- Whether the 7–8 player Family-card softness persists under the final scare-off ruleset specifically (tested separately, not yet re-verified together, and not yet re-verified at the new deck size either)
- Real playtesting to confirm the simulated balance holds up with actual kids at the table, not just modelled populations — now more valuable than ever, since a shorter Raid changes how much a session-opening bad Favourite/Watcher draw can be recovered from within one Raid
- **Open Book interaction (new in v3):** with Open Book Off, the qualitative-only reveal lines in §6 are this mode's sole way of teaching the scare-off rule to a new player — worth a specific playtest check that the flavour-line wording alone (without seeing numbers) actually communicates what happened, rather than assuming it does because it reads clearly on paper.
