# ETA? — Maths Round 1

**Status:** first calibrated set of scoring numbers for Standard Mode, Sylly Mode (Backseat Drivers), the hidden Gear Ratio and the rank ladder.
**Read this first:** every number below was tuned against a *simulated* table of couriers. How those simulated couriers estimate and behave is **assumed, not measured** (see §1). The structure is solid; the exact numbers should be treated as v1 tuning values that the first real playtests will refine. Re-run `eta_sim.py` after any change.

---

## 0. The settled numbers at a glance

| Piece | Setting |
|---|---|
| Accuracy Mileage ceiling | **40,000 km** per Run |
| Perfect zone | Within **±5%** of the true ETA scores the full 40,000 |
| Accuracy curve | Falls smoothly with how many "times out" you are; zero at **~18× off**. 2× off ≈ 27,100 · 3× ≈ 20,000 · 5× ≈ 12,000 · 10× ≈ 3,700 |
| Depot Tip (Standard) | Per Stamp received: **4,500 / 3,500 / 3,000 / 2,500 / 2,250 / 2,000** for 3 / 4 / 5 / 6 / 7 / 8 couriers |
| Sweep Bonus | One extra tip's worth, **only at 5+ couriers** (at 3–4 it would be routine, not special) |
| Gear Ratio (hidden) | **5 ÷ number of Runs**: Short ×1.667 · Standard ×1.0 · Long ×0.714. Applied before the tally is shown, so the receipt always adds up |
| Course Correction dial | **÷10 to ×10** per correction; corrections **multiply** |
| Navigation Assist | **80%** of the accuracy points the corrections added, shared by push size |
| Detour Penalty | **40%** of the accuracy points the corrections removed, shared by push size |
| Insurance Payout | **3,000 per ×10 of total push** received, capped at **4,000** per Run |
| Hazard Pay (Unregistered Ride) | **4,000** flat |
| Floor | A courier's Run total can't go below **0** (hit in about 1% of Sylly Runs) |
| Rank thresholds | **0 · 25,000 · 55,000 · 85,000 · 115,000 · 145,000 · 170,000 · 195,000** total km. Mileage keeps counting after the top rank |

---

## 1. How these were tested (and what I had to assume)

I simulated thousands of tables of 3–8 couriers across 3-, 5- and 7-Run Shifts, all three Dispatch Ranges, in both modes.

**The simulated couriers** come in three estimating skills: **sharp** (typically ~1.8× off), **average** (~3× off) and **loose** (~6× off), in a 25 / 50 / 25 mix, with occasional wild misses mixed in. Cosmic Routes make everyone less accurate and Local Routes more; Unregistered Rides are harder to estimate. **These spreads are my guesses.** The brief's own examples (a pogo stick at ~3× off, a rocket at ~8× off) are consistent with them, but nobody has measured real players on real Routes yet.

**Stamp behaviour:** couriers give Stamps based partly on charisma and partly on how plausible a pitch sounds. Tested from "pure charisma" to "mostly plausibility"; results barely moved.

**Course Correction behaviour:** couriers form a noisy private opinion of how wrong each other courier is, pick someone who looks very wrong (with some randomness), and correct by a fraction of what they think is needed. I tested a *measured* table (cautious, mixed targets: the planning case) and a *reckless* table (bold, everyone piling on the same bar: the stress case).

**What to measure first in playtests:** every Logged ETA against its true ETA (by Range), every Stamp, and every Course Correction with its target. That data replaces the three guesses above.

---

## 2. Accuracy Mileage (both modes)

**Formula:** let *d* = how many orders of magnitude the Logged ETA is from the truth, `|log10(Logged ÷ True)|` (so 2× off in either direction is the same, and ×10 is 1.0).
- If *d* is within the perfect zone (±5%, d ≤ 0.021): **40,000**.
- Otherwise: `40,000 × (1 − x)^1.5`, where `x = (d − 0.021) ÷ 1.229`, and zero once x reaches 1.

| Off by | Mileage | | Off by | Mileage |
|---|---|---|---|---|
| ±5% | 40,000 | | 3× | 19,950 |
| 1.1× | 39,020 | | 5× | 12,010 |
| 1.25× | 36,360 | | 10× | 3,670 |
| 1.5× | 32,680 | | 15× | 590 |
| 2× | 27,150 | | 18× or more | 0 |

**Why this shape.** I tried six curves. This one (a) keeps ordinary misses worth something so loose couriers stay in the game: only ~10% of loose couriers' Runs score zero, ~3% of average ones; (b) separates skill clearly: sharp ≈ 80% of the ceiling, average ≈ 66%, loose ≈ 52%; (c) keeps a wide "close enough" band near the top that doesn't punish the rough speeds the game uses. A harsher cut-off at 10× made 17% of loose Runs zero, which is miserable.

**The ±5% perfect zone:** Ride speeds are rough by design, so a real "perfect" is meaningless. About 13% of average couriers' Runs land in it, which feels right for a "Bullseye" moment.

**Dispatch Range is not equally hard.** Average accuracy by Range: Local ≈ 71%, Mixed ≈ 66%, Cosmic ≈ 58%. **Decision: no hidden Range factor.** Rank thresholds stay fixed; the table chooses its own Range, and an easier Range simply climbs faster. Revisit only if playtests show a Range feels unfair.

---

## 3. Standard Mode: Depot Tips and the Sweep Bonus

**Run total = (Accuracy Mileage + Depot Tips) × Gear Ratio.** Every courier gives exactly one Stamp, so the tip pot per Run is fixed and an average courier receives exactly one Stamp's worth.

**How much should Stamps matter?** My target was that Stamps change who wins in roughly **one Shift in four**, enough to reward a great pitch, not enough to drown accuracy. With a flat tip the effect depends heavily on table size: at 3,000 per Stamp a 3-courier table flips the winner 17% of the time but an 8-courier table 36%. So the tip scales with table size:

| Couriers | Tip per Stamp | Winner changed by Stamps | Stamps as share of all Mileage |
|---|---|---|---|
| 3 | 4,500 | 16% | 15% |
| 4 | 3,500 | 21% | 12% |
| 5 | 3,000 | 25% | 10.5% |
| 6 | 2,500 | 25% | 9% |
| 7 | 2,250 | 26% | 8% |
| 8 | 2,000 | 26% | 7% |

How plausible-sounding pitches correlate with accuracy hardly mattered (±2 points), so the Best Pitch framing isn't at risk either way.

**Sweep Bonus.** Everyone else stamped you: this happens to 29% of couriers' Runs at 3 players, 9% at 4, 3% at 5, 1% at 6, and almost never at 8. Only 5+ is "rare", so the Sweep applies from 5 couriers up, worth one extra tip.

---

## 4. The hidden Gear Ratio

**Gear Ratio = 5 ÷ Runs in the Shift.** With it, the average Shift total is the same whatever the length (≈146,000 km for 3, 5 or 7 Runs), so one rank ladder serves every Shift length. It's applied to each tally line before display and rounded to the nearest 10 km, so the receipt always adds up.

Two side effects to know about:
- Short Shifts are a bit swingier (standard deviation of a Shift total: 3 Runs 41,000 · 5 Runs 35,000 · 7 Runs 32,000), which is fine for flair ranks.
- Promotions come at different speeds by length (§6).

---

## 5. Sylly Mode (Backseat Drivers)

### 5.1 How a Course Correction works

A correction is a multiplier on the target's ETA, from **÷10 to ×10**. Corrections from several couriers **multiply**, which is the same as adding their "×10-ness". Every credit and blame calculation below is therefore done on how far the ETA ends up from the truth. Display as percentages or "×" as you prefer; the dial should have marked stops at ÷10, ÷5, ÷3, ÷2, ÷1.5, ×1.5, ×2, ×3, ×5, ×10 plus free dragging.

### 5.2 Who gets credit, and who gets blamed

Everything is judged on **where the ETA finally lands**, using the target's accuracy curve as the yardstick. The **swing** is the accuracy points the corrections added or removed compared with the Logged ETA.

- **The ETA ended up better (swing is positive).** Couriers who pushed toward the truth share **Navigation Assist = 80% of the swing**, split in proportion to push size. Anyone who pushed the *wrong* way pays a **Detour Penalty = 40% of the damage their own push would have done alone**.
- **The ETA ended up worse (swing is negative).** Everyone whose push went the way the ETA finally moved shares **Detour Penalty = 40% of the loss**, split by push size. Couriers who pushed against it neither gain nor lose.
- **The target's own accuracy score is never touched** by corrections; it always uses the Logged ETA.

This is the "share of the net result, by push size" scheme. Plain English on the receipt: *"Your correction moved her ETA closer, and you earned your share of the points it was worth."*

**Why not "as if you went last"?** I tested three ways to split credit:

| Scheme | Result |
|---|---|
| **"As if you went last"** (what would the result be without your push?) | Any pile-on makes every pusher look guilty for the *entire* overshoot. Correcting loses money at every boldness level, so Hands off is the dominant strategy and the phase dies |
| **Fair-share averaging across all orders** | Numerically almost identical to the chosen scheme, but gives everybody equal blame regardless of push size and is almost impossible to explain on a tally |
| **Share of the net swing, by push size (chosen)** | Explainable in one sentence, and produces the behaviour you want, as below |

**Why the penalty rate (40%) is lower than the reward rate (80%).** I expected sabotage to need a heavier penalty. But the target's score is protected, so a saboteur gains nothing by pushing the wrong way and always pays for it. A heavy penalty only scares honest couriers off. With reward and penalty equal, correcting had negative expected value for everyone, so no sensible courier would ever do it.

### 5.3 Does the phase behave as intended?

I tested how much a single average courier earns from corrections as they get bolder (0 = Hands off, 1 = trying to fully fix what they think is wrong), at 4 and 6 couriers, per Run:

| Boldness | 0 (Hands off) | 0.25 | 0.5 | 0.75 | 1.0 | 1.25 |
|---|---|---|---|---|---|---|
| 4 couriers | 0 | +2,600 | **+3,000** | +2,200 | +1,100 | +300 |
| 6 couriers | 0 | +2,000 | **+2,300** | +1,200 | +300 | −400 |

The best choice is a **moderate correction (about half of what you think is wrong)**, not Hands off and not a full fix. More couriers means a lower optimum. That's the dynamic you described: you can try to save a wildly wrong estimate, but everyone else is trying to save it too.

**Sharp couriers earn more from corrections than loose ones** (about +2,500 vs +1,100 per Run on average), because they have better opinions. Loose couriers are slightly better off staying Hands off unless a miss is obvious.

**How often pile-ons happen** (5 couriers): about one target per Run gets two or more corrections. On a *measured* table, roughly **4 Runs in 10** contain a **Spin-out** and **3 in 10** a **Back on Course**. On a *reckless* table nearly **every Run** has a Spin-out. Proposed banner triggers (untested): Spin-out when 2+ couriers piled on and the net loss is **3,000+ points**; Back on Course when the corrections gained **3,000+ points** and the final ETA is within 1.25× of the truth.

### 5.4 Insurance Payout (for being corrected)

**3,000 per ×10 of total push received, capped at 4,000 per Run.** It scales with how far the target was actually shoved, not how many people shoved.

Exploit checks (all pass):
- **Deliberately terrible ETA to farm Insurance:** at the cap, Insurance is at most 4,000 while a bad ETA costs 7,000 to 36,000 in accuracy.
- **Two friends colluding** (one logs 5× off, the other perfectly fixes it): the pair *loses* about 3,500 per Run. At every miss size from 1.5× to 10× the pair ends behind.
- **1% nudging back and forth:** pays 13 km. Corrections inside the perfect zone earn no Navigation Assist at all.
- **Spite pushes** (pushing against a helper): the spiteful courier pays for it, around 2,300 for a typical case.

### 5.5 Hazard Pay

**4,000 flat.** In the simulation, holders of Unregistered Rides score about 2,800 *less* on accuracy than other couriers (they're harder to estimate). With 4,000 Hazard Pay they end about 1,700 *ahead* on Run total on average: a "small Sylly bonus", as intended.

### 5.6 The floor

A courier's Run total cannot go below 0. It's reached in about 1% of Sylly Runs, so it's a safety net, not a mechanic.

### 5.7 Parity with Standard Mode

Per courier per Run, at 5 couriers: **Standard ≈ 29,300 km, Sylly ≈ 29,800 km.** Over a 5-Run Shift: Standard ≈ 144,600, Sylly ≈ 149,000. Skill separation is the same in both modes, so **one rank ladder serves both**. Sylly Run totals have a standard deviation of about 12,300 (Standard's wasn't logged separately), and Sylly adds the Spin-out and Back on Course swings, which is the intended chaos.

---

## 6. Rank ladder

| Rank | Starts at (total km) | Share of couriers finishing a 5-Run Shift here (all table sizes pooled) |
|---|---|---|
| 1. Lost L-Plater | 0 | ~0% |
| 2. Pizza Peddler | 25,000 | ~1% |
| 3. Detour Daredevil | 55,000 | ~5% |
| 4. Speed-Bump Surfer | 85,000 | ~14% |
| 5. Waybill Warrior | 115,000 | ~27% |
| 6. Asphalt Astronaut | 145,000 | ~27% |
| 7. Cosmic Courier | 170,000 | ~21% |
| 8. Hyperdimensional Herald | 195,000 | ~6% |

- The steps are about one average Run apart (an average Run ≈ 29,000 km), so **most couriers are promoted after most Runs**, which is the point of the fanfare.
- Rank 8 needs roughly 39,000 km a Run on average: **very good play, not impossible.** Over a 5-Run Shift about **1 in 5 sharp couriers** and about **3 in 10 table winners** reach it (Standard Mode; Sylly is slightly easier for sharp couriers). Average couriers rarely do (about 3%), loose ones almost never. Almost nobody (under 0.1%) gets there before the final Run.
- **Mileage keeps accruing after the top rank**, so the Odometer, not the rank, still decides the winner; rank is only flair.
- Short Shifts reach Rank 8 more often (about 25% of sharp couriers over 3 Runs at this threshold) and Long Shifts less (about 15% over 7 Runs): the hidden Gear Ratio evens the average, not the swings. Left as is until real playtests.
- At a 5-courier table, the top courier averages Rank 7.1 and the table spans about 3 different ranks, so rank works as a "who's winning" indicator.
- **Promotion speed by Shift length** (because the hidden Gear Ratio only equalises the *final* total): in a Short Shift couriers jump about 1.5 ranks per Run (some skip ranks); in a Long Shift ranks climb more slowly early (only 40% promoted after Run 1, ~65% after later Runs). Both are fine.

---

## 7. Worked examples (the sample rounds, with real numbers)

### Sample 1, Standard, 4 couriers (tip 3,500, no Sweep), Gear 1.0

| Courier | Logged vs true | Accuracy | Stamps | Tips | Run total | Rank after Run 1 |
|---|---|---|---|---|---|---|
| Ada | 1.04× | 40,000 | 1 | 3,500 | **43,500** | Pizza Peddler |
| Boris | 3.1× too fast | 19,270 | 2 | 7,000 | **26,270** | Pizza Peddler |
| Chloe | 2.5× too slow | 22,955 | 1 | 3,500 | **26,455** | Pizza Peddler |
| Dev | 7.8× too slow | 6,320 | 0 | 0 | **6,320** | Lost L-Plater |

### Sample 2, Sylly, 4 couriers, Run 3 of 5

| Courier | Accuracy | Hazard | Nav. Assist | Detour | Insurance | **Run total** |
|---|---|---|---|---|---|---|
| Ada | 35,020 | 4,000 | 0 | −400 | +290 | **38,910** |
| Boris | 38,790 | 4,000 | 0 | −400 | 0 | **42,380** |
| Chloe | 20,760 | 4,000 | +3,700 | 0 | +3,000 | **31,460** |
| Dev | 37,550 | 0 | 0 | −530 | 0 | **37,020** |

- Chloe's Logged ETA (40 days) was already 2.9× too fast. The three corrections (×2, ×2, ×2.5 = ×10) took it to 3.5× too *slow*, so the swing was **−3,330**, a Spin-out. The Detour pool of 1,330 (40%) is split by push size: Ada 30%, Boris 30%, Dev 40%.
- Chloe's own correction (Ada ×1.25) moved Ada from 1.33× off to 1.07× off: a swing of +4,620, so Chloe earns **+3,700 Navigation Assist**.

**Why the Spin-out is so mild here:** the target was already badly off, so overshooting to a similar miss on the other side cost little. The penalty bites hardest when a *good* estimate gets piled on.

### Sample 2b, the same pile-on on a good estimate

Chloe logs **80 days** (only 1.4× too fast, worth 33,630 on accuracy). The same ×2, ×2, ×2.5 pushes take it to 800 days (7× too slow):
- Swing **−26,050**, so the Detour pool is **10,420**: Ada −3,140 · Boris −3,140 · Dev −4,150.
- Chloe keeps her accuracy score and collects the Insurance Payout (3,000).

That's the **"everyone fails" moment**: three couriers each paid about 3,000–4,000 to wreck a nearly right answer. If only Ada and Boris had corrected (×2 each), each would still lose about 2,500, because the correction wasn't needed at all.

---

## 8. Run and Shift length (estimate, not simulated)

Rough stopwatch assumptions: Briefing 15 s · entry 25 s · waiting 10 s · Board reveal 10 s · Radio Defense about 12 s per courier · Stamps 15 s · Proof of Delivery 20 s · tally 15 s. Sylly adds Course Corrections (30 s), the Corrections reveal (20 s) and about 30 s of extra banter.

| | 5 couriers | 8 couriers |
|---|---|---|
| Standard Run | ~2:50 | ~3:45 |
| Sylly Run | ~4:10 | ~5:05 |

| Shift length | Standard, 5 couriers | Sylly, 5 couriers |
|---|---|---|
| Short (3 Runs) | ~8.5 min | ~12.5 min |
| Standard (5) | ~14 min | ~21 min |
| Long (7) | ~20 min | ~29 min |

This fits the brief's 10–20 minute target for everything except Standard and Long Sylly Shifts. Real banter time is the big unknown. **Worth watching:** **Decision:** Sylly Mode uses the same default as Standard Mode, a Standard (5-Run) Shift, about 21 minutes with five couriers. Short stays available.

---

## 9. Calls I made, and what stays open

**Calls I made (override any):**
1. Navigation Assist 80% / Detour Penalty 40% of the accuracy swing (§5.2).
2. Credit by "share of the net swing, by push size", not "as if you went last" (§5.2).
3. Tip per Stamp scaling with table size, Sweep Bonus only from 5 couriers (§3).
4. Perfect zone ±5% and a zero point at ~18× (§2).
5. **No** hidden Range factor (your call).
6. Rank thresholds about one average Run apart, with the top two tightened to 170k / 195k so Rank 8 is reachable with very good play (§6).

**Still open (need real play):**
- The real spread of estimating error by Range.
- How real tables correct: how bold, how concentrated on one bar.
- Spin-out and Back on Course banner thresholds (§5.3).
- Real Radio Defense length (§8).
- Whether Hands off ends up too attractive for loose couriers.

---

## Appendix: how to re-run

`python3 eta_sim.py <curve | standard | sylly | kappa | exploit | ranks | all>` from the folder containing `eta_sim.py`. All tunable values (ceiling, curve, tip table, Navigation/Detour rates, Insurance, Hazard, rank thresholds, the three assumed skill levels) are named at the top of the file. A full run of every experiment takes about 35 seconds. `eta_sim_results.log` is the output used for this document.
