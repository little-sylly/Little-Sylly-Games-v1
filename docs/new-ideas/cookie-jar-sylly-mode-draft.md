# Cookie Jar — Sylly Mode Design (Final Draft)
**Name:** Dibber Dobber
**Status:** Finalised — mechanics locked, balance-tested via simulation, terminology confirmed.
**Theme:** "Who took the cookie from the cookie jar?" — accusation, denial, and pointing fingers.
**Companion to:** `new-game-brief-cookie-jar.md` §8, §19

---

## 1. Summary

Every flip, all players simultaneously and secretly choose one of three actions before the card is revealed: **Reach In**, **Sneak Out**, or **Dob**. The card then resolves based on both the card type and which actions were chosen.

Reach is the core, highest-ceiling path to winning — the actual "do I dare take another one" fantasy the game is about. Sneak is the safe, steady fallback that never traps a player but shouldn't be how you win. Dob is the disruptive, situational spice — it denies Reachers something and occasionally steals a Treat outright, but it isn't a personal jackpot engine.

There's no bust and no elimination. Cookies can't go below zero, and a player who bottoms out stays in play and can still win Crumb splits — nobody is ever benched and just watching. An Operation ends when that Operation's deck runs out. Multiple Operations are played per match, since each player's affinities reset every Operation and are part of the replay value.

---

## 2. Deck Construction

Each Operation's deck is the full 15 Cookie cards + full 15 Caught! (Family) cards + that Operation's single scheduled Treat (per the base game's fixed Op1–5 schedule) — **31 cards combined into one pool**, cut randomly in half for that Operation.

**This is a genuine random cut of the combined pool, not a proportional per-type split.** An Operation's resulting ~15-16 cards can skew Cookie-heavy or Family-heavy purely by luck — some Operations will feel generous, others hostile. This is intentional: it shortens rounds (a function of deck size, not composition), and it means players can never count cards to calculate safe odds, since even the deck's *makeup* for that Operation is unknown until cards start flipping.

---

## 3. Actions × Card Type Reference

| | 🍪 Cookie | 🍰 Treat | 👪 Family Member |
|---|---|---|---|
| **Reach In** | Split the cookies with other Reachers (unless Dobbed, see below) | Wins outright if solo (see §5) | **Risk:** caught — lose cookies to Crumbs. Reduced/none if you're that family member's Favourite, doubled if it's your Watcher |
| **Sneak Out** | Split the Crumb pile — *unless a Dobber is present this flip, in which case Sneakers get nothing and Crumbs stay put* | Wins outright if solo (see §5) | Split the Crumb pile — *same Dobber-presence exception as Cookie* |
| **Dob** | Steals 2 cookies per Dobber (capped at the card's value), split among Dobbers — remainder goes to Reachers, not Crumbs. Backfires (Dobber loses 2) if nobody Reached | Wins outright if solo (see §5) | Always backfires — flat 2 cookie loss, no matter what anyone else did |

**Ties** on any claim split the reward evenly, remainder to Crumbs.

---

## 4. Cookie Cards — Full Resolution

1. If Reachers **and** Dobbers are both present:
   - Dobbers steal `min(2 × number of Dobbers, card value)`, split evenly among themselves (remainder → Crumbs)
   - Whatever's left of the card value goes to Reachers, split evenly (remainder → Crumbs) — this can be zero if enough Dobbers showed up to consume the whole card
2. If only Reachers present: split the card value evenly, remainder → Crumbs, as normal
3. If only Dobbers present (no Reachers): each Dobber loses 2 cookies (backfire), added to Crumbs
4. **If nobody Reached and nobody Dobbed (everyone Sneaked):** the full card value goes to Crumbs, unclaimed
5. **Sneakers get their share of the current Crumb pile — unless any Dobber is present this flip, in which case Sneakers get nothing, and the Crumb pile is left untouched for a future flip.** This step runs last, so on an all-Sneak flip (point 4), Sneakers immediately absorb that flip's own contribution — same instant-availability rule as everywhere else in this design, no delay.

Point 5 is the "scare-off" rule — Dob's presence disrupts Sneak on Cookie cards, not just Reach.

---

## 5. Treat Cards — Full Resolution

Never split. Priority order: **Sneak > Dob > Reach.**

- If exactly one player Sneaked this flip, they win the Treat outright (full 5 or 10 points)
- Else, if exactly one player Dobbed, they win it outright
- Else, if exactly one player Reached, they win it outright
- If nobody is uniquely "solo" in any category, the Treat stays unclaimed and re-contests on the next flip within the same Operation
- **If still unclaimed when the Operation ends, the Treat vanishes** — it does not carry forward to the next Operation

---

## 6. Family (Caught!) Cards — Full Resolution

Each player's outcome depends on their own action, plus the "scare-off" exception below:

- **Reach:** caught — lose cookies to Crumbs. Base loss for a neutral family member, **zero loss** if you're that family member's Favourite ("Not me!"), **doubled loss** if it's your Watcher ("Yes, you!")
- **Sneak:** split the Crumb pile — **unless any Dobber is present this flip**, in which case Sneakers get nothing this flip ("Then who?" — they slip away, but so does the loot)
- **Dob:** always backfires — flat loss, added to Crumbs (the accusation boomerangs back on the accuser)

**Numbers locked via simulation:** Reach loss = 0 / 2 / 4 (protected / neutral / doubled by affinity). Dob backfire = flat 2.

### Favourite / Watcher — framing

**You are the family member's Favourite or Watcher, not the other way around.** "You're Mum's favourite" is the hook — mummy's boy, daddy's girl, the sibling the pet always follows. It's the family member's disposition toward the player, not the player's own preference. Watcher doesn't need this flip — "Dad's onto you" already points the right direction either way.

### The song's beats, mapped onto existing outcomes (no new mechanics — flavour/reveal-animation only)

| Outcome | Reveal-moment line (example) | Log line (compact, example) |
|---|---|---|
| You're their **Favourite** (protected) | *"Turns out you're Mum's favourite — she looks the other way. Not me!"* | *"Ava reached for Mum — but Ava's her favourite. Safe!"* |
| Neutral family member | *"Big Sibling spots you mid-reach. Caught!"* | *"Ben reached for Big Sibling. Caught — lost 2!"* |
| It's your **Watcher** (doubled) | *"Dad's had his eye on you all day. Busted — and it costs you double!"* | *"Cal reached for Dad — Dad's his Watcher. Busted for double!"* |
| Sneak (successful or scared off — one shared line either way, per decision) | *"You slip away before anyone notices. Then who?"* | *"Dana snuck out with 3 crumbs."* |
| Dob backfire | *"You point the finger... but nobody's buying it."* | *"Ben tried to dob — but nobody was reaching. Backfired!"* |

**Nice-to-have for later polish, not locked:** per-family-member flavour on *why* a player is their Favourite, rather than one uniform line — e.g. Mum → "Mummy's little angel strikes again," Dad → "Daddy's best mate gets away with it," Big Sibling → "Their favourite sibling. Lucky you," Little Sibling → "They idolise you too much to snitch," Family Pet → "Even the dog's on your side." The uniform line works fine as the baseline if this doesn't get built.

---

## 7. Core Rules

- **Affinities:** each Operation, every player is secretly assigned one family member as their **Favourite** (that family member goes easy on them — the +affinity mechanic) and one as their **Watcher** (that family member's onto them — the −affinity mechanic). Reassigned at random each Operation, doesn't carry over.
- **Crumbs:** a single pool that persists and accumulates across the whole Operation — fed by caught Reachers' losses, Dob backfires, and unclaimed remainders. Available to Sneakers instantly, same flip — except when the scare-off rule applies (Dobber present on Cookie or Family cards).
- **No bust, no negative cookies:** nobody ever loses more than they have. A player at zero cookies keeps playing normally and can still win Crumb splits.
- **Round end:** when the Operation's (randomly halved) deck runs out.
- **Starting stash:** each player starts the Operation with a small hidden amount of cookies — **exact number still a placeholder, not locked** (tested at 5 throughout simulation).
- **Kitchen Rules setting is hidden/disabled entirely when this mode is active.** All 3 of its options (Standard Burn / On Guard / High Alert) govern what happens on a bust — this mode has no bust, so none of them have anything to act on.

---

## 8. Balance Testing — What Was Tried and Why the Current Version Won

This mode went through several structurally different versions before landing here. Recorded for context, not for re-litigating:

| Version tried | What happened | Why it was dropped |
|---|---|---|
| Dob steals 100% of Reachers' pot | Reach wiped to zero 73–96% of the time at 6–8p | Contradicted the "no bust, nobody's wiped" philosophy applied everywhere else |
| Dob steals a fixed % of the pot (65–75%) | Fixed Reach's wipe-rate, but needed a percentage — messy to teach | Dropped in favour of a flat-number system |
| Dob steals a flat total, split among Dobbers | Reach's wipe-rate improved, but Dob's own EV became negligible against big cards (flat numbers can't scale with card value 1–17) | Flat totals don't scale; either too weak (flat 1) or too easily capped (flat 2, still weak against big cards) |
| Dob steals a flat amount **per Dobber**, remainder to Crumbs | Fixed Dob's scaling problem, but sent large amounts to Crumbs whenever few Dobbers faced a big card — made Sneak dominant via a new pathway | The "remainder to Crumbs" step was the bug — Sneak vacuumed it up instantly |
| Dob steals flat 2 per Dobber, **remainder to Reachers** | Dob's EV now *grows* with player count (more Dobbers = bigger combined steal) instead of shrinking; Reach's wipe-rate stays reasonable (13–48% across 3–8p) | **This is the version locked in §4.** |
| Sneak always safe (original) tested over a **full Operation** with committed archetypal players | Sneak-leaning players ended Operations with 5–8x the cookies of Reach/Dob-leaning players — a compounding "constant parasitic drip" effect invisible in single-flip testing | Motivated the scare-off rule |
| Scare-off applied to Cookie cards only | Barely moved the full-Operation imbalance (32.99 → 32.67 average) | Family cards were the dominant Crumb-generation channel, not Cookie |
| **Scare-off applied to both Cookie and Family cards** | Flipped the hierarchy to Reach (12.80) > Sneak (9.18) > Dob (8.18) — tight spread, Reach on top as intended | **This is the version locked in §4/§6.** Note: reverses the earlier "Family cards have zero cross-player interaction" decision — a deliberate, acknowledged trade. |

**Known, accepted softness (not further chased):**
- The Family-card penalty gap widens at 7–8 players specifically (Sneak edges ahead of Dob there) under the pre-scare-off numbers — worth re-checking against the final scare-off version in real playtesting.
- Even fully adaptive, learning players (not locked into a fixed strategy) still lean toward Sneak somewhat more than an even split (~47–53% vs. an even 33% baseline) over a full Operation. This is a soft, real pull, not a dominant strategy — Dob and Reach are still chosen often. Treated as acceptable for a casual kids' game rather than something to eliminate outright.
- All balance testing used an artificially stabilised deck (7 Cookie + 7 Family + 1 Treat every Operation) to isolate rule-balance from deck-composition luck. The real game's deck (§2) is a genuine random half of the combined pool and can skew Cookie- or Family-heavy — this will introduce real Operation-to-Operation variance the testing didn't capture. Treated as a deliberate feature (unpredictability, no card-counting), not a flaw to fix.

---

## 9. Open Items

- Exact starting stash number (tested at 5, never formally locked)
- Whether the 7–8 player Family-card softness persists under the final scare-off ruleset specifically (tested separately, not yet re-verified together)
- Real playtesting to confirm the simulated balance holds up with actual kids at the table, not just modelled populations
