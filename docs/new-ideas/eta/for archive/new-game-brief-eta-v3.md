# New Game Brief — ETA?
**Document type:** Phase 1 — Design Brief (non-technical), v3 on the 21-section template (maths round 1 and four decisions applied)
**Supersedes:** the original 14-section ETA brief (votes-only scoring, Underdog Bonus, Hazard Pay as Sylly Mode)
**What happens next:** Resolve the remaining Open Questions, rebuild the content set, run a first playtest to refit the player-behaviour guesses behind the numbers, then hand to Claude Code for Stage 2.

> **Status:** Core loop, vocabulary, Sylly Mode structure and round flow are settled. Scoring now carries **first-pass numbers from the maths round** (full working in *eta-maths-round-1*). They were tuned on simulated couriers whose estimating and meddling habits are assumed, not measured, so treat them as v1 values to refit after playtests. Content (Routes, Rides, Briefings) is deliberately **not** rebuilt here; the old 54-Route / 24-Ride set was a proof of concept and will be restarted from the shared word bank once this brief is stable (see §10).
>
> Marker key: `[ASSUMPTION: …]` = a call made on your behalf. `[CLARIFICATION NEEDED: …]` = needs your input. `[MATHS]` = still to be fitted from real play.

---

## 1. Identity

| Field | Answer |
|---|---|
| **Full game name** | **ETA?** (written "ETA" in running text) |
| **Abbreviation** | `eta` — confirmed not in the taken list (`li5`, `gm`, `ss`, `jec`, `ygi`, `lttp`, `nat`, `dsd`, `gth`, `dyb`, `bld`, `pass`, `nt`, `frt`, `shp`, `flw`, `pko`, `cjar`, `cld`, `comb`) |
| **Tagline** | "Skateboard to the Moon? Show your working." |
| **Thematic universe** | A chaotic **delivery depot**. Every player is a courier handed a wildly inappropriate vehicle and a famous distance, radioing in an estimated time of arrival. The depot (the whole table) argues about it, then the dispatcher drops the true result. Your standing is the reading on your **Odometer**. |
| **Emoji / icon** | 🛵 *(alt: ⏱️)* |
| **Brand colour** | Dispatch amber-orange (courier hi-vis) **or** GPS-navigation blue. `[CLARIFICATION NEEDED: colour audit — confirm the chosen colour is distinct from Hot Streak's ember and from Honeycomb Hills' amber/yellow; amber-orange is the riskier of the two]` |

**The core fun:** the comparison and the argument. A helicopter's "5 hours" next to a pogo stick's "4 days" on the same chart, the pogo-stick courier standing up to defend it — and then the truth landing on top of everyone's bar. The estimation gives the table something to be right or wrong about; the banter is why they're loud about it.

**The fun moment in 10 words:** A pogo stick to Italy, defended with a straight face, then exposed.

---

## 2. The Players

| Field | Answer |
|---|---|
| **Player count** | **3–8** |
| **Teams or individuals?** | Individuals — everyone is a courier every Run |
| **Roles** | None. No judge, no host-only duties during play. Everyone estimates, pitches and takes part in the social phase every Run |
| **Hidden information** | Briefly: your **Ride** and your **Logged ETA** are private until the Dispatch Board reveal; in Sylly Mode your **Course Correction** is also secret until it is revealed. Nothing is hidden long-term |
| **Minimum meaningful count** | 3 (a spread of Rides to compare). Sweet spot **4–6** |

**At 3 players:** each courier has only two possible Course Correction targets in Sylly Mode, so pile-ons are structurally limited. `[ASSUMPTION: Sylly Mode stays available at 3 players; watch this in simulation]`.

**Pass-the-phone is out of scope.** Private Rides, private entry and secret Course Corrections all need a personal screen, and the pitch phase assumes a same-room table.

---

## 3. The Core Loop

**In one sentence — what does a player DO?**
Simultaneously, each courier privately reads their assigned Ride and the shared Dispatch Briefing, estimates how long that Ride would take over the shared Route, and locks in a Logged ETA; then they defend it out loud, take part in the social phase (Standard: give a Stamp; Sylly: apply a Course Correction), and watch the true ETA land.

**Central tension / fun moment:** two beats. First the **Radio Defense** — a table full of couriers justifying absurd numbers. Then **Proof of Delivery**, where a marker drops onto every bar and everyone finds out who was dreaming.

**Closest game type:** estimation + persuasion (cousins: Wits & Wagers for the estimating, Balderdash for the defending). The accuracy scoring is the new part; the social layer keeps it from becoming a maths quiz.

**One complete Run (Standard Mode):**

1. **Dispatch Briefing.** The Route is revealed to everyone — a headline plus its distance (*"The Length of Italy (~1,200 km)"*), followed by a short **Briefing** of assumptions that make the answer unambiguous (*"A brand-new, perfectly straight, empty corridor has opened end to end. No stops, no traffic."*). With **GPS OFF** the km figure is withheld and only the headline shows.
2. **Assignment.** Each courier privately sees their **Ride** — a different one each. The Ride's speed is **never shown**.
3. **Log your ETA.** Privately, each courier enters one number with a unit (minutes / hours / days / years). A small confirmation box repeats it in plain words (*"4,000 hours — about 167 days. Lock it in?"*) so slips like the wrong unit get caught. The game waits for every courier (ready check).
4. **The Dispatch Board.** All Logged ETAs are revealed at once on a shared chart, fastest to slowest, each bar labelled with its Ride.
5. **Radio Defense and Stamps.** Couriers pitch their reasoning out loud, in any order, for as long as the table likes. Each courier must give one **Stamp of Approval** to another courier's pitch (never their own) — explicitly for the **Best Pitch**, funny or convincing, with no link to accuracy. A courier can change their Stamp until everyone has locked in one. The phase ends when everyone has stamped.
6. **Proof of Delivery.** The true ETA for each Ride lands as a marker on each bar, with the Ride's speed revealed for the first time and a **Reality Check** one-liner for comedy (*"Helicopter at 250 km/h: about 4.8 hours. Ada, dead on."*).
7. **The Odometer.** An itemised tally spins each courier's Odometer up; rank promotions fire as thresholds are crossed.
8. Next Run: new Route, new Rides. Highest Mileage at End of Shift wins.

**Simultaneous or sequential?** Entry and Stamping are simultaneous (ready checks). The pitch phase is conversational and unstructured.

**How does the phone move between players?** It doesn't — each courier has their own device (see §12).

---

## 4. Rule Relationships & Interaction Matrix

**Not applicable — ETA has no beats / outranks / unlocks relationships.** The nearest thing is how Course Corrections combine and who gets credit for the result; that is handled as scoring principles in §6 and as the Sylly mechanic in §8, not as a relationship table.

---

## 5. Winning

| Field | Answer |
|---|---|
| **How does a game end?** | At **End of Shift**, after a fixed number of Runs set by Shift Length (3 / 5 / 7) |
| **Winner** | Highest total **Mileage** on the Odometer — crowned **Courier of the Month** |
| **Ties?** | Scoring is continuous, so exact ties should essentially never happen. If one does, the tied couriers **share the title**. `[ASSUMPTION: the old sudden-death tie-break and most-votes tie-break are dropped]` |
| **Length** | About 10–20 minutes. Estimated Runs: Standard about 2:50 and Sylly about 4:10 at five couriers, so a 5-Run Shift is about 14 minutes Standard and 21 minutes Sylly. `[MATHS: stopwatch assumptions only; real banter time is the big unknown. Sylly Mode uses the same default Standard Shift (about 21 minutes at five couriers, slightly over the target; Short stays available)]` |
| **Ranks** | A flair ladder of eight titles shown on each courier's Odometer to indicate who is ahead. **Ranks are per-Shift only and never persist.** Higher rank effectively means higher score |

---

## 6. Scoring

The currency is **Mileage** (displayed in km, never miles — the whole game is metric). Standard Mode and Sylly Mode have **separate scoring systems**. Numbers are first-pass values from the maths round.

### Standard Mode

**Total Run Mileage = (Accuracy Mileage + Depot Tips) × Gear Ratio** *(the Gear Ratio is a hidden background adjustment; it is never shown to players. See below.)*

| What happened | Who | How much | Notes |
|---|---|---|---|
| **Accuracy Mileage** — Logged ETA compared to the true ETA | Every courier | The largest pool by far. **40,000 km** for anything within **5%** of the truth, tapering smoothly to **zero** at about **18× off** | Judged on the *ratio*, not the gap, so being 2× off on a 5-minute trip scores the same as being 2× off on a 10-year trip. Examples: 2× off ≈ 27,150 · 3× ≈ 19,950 · 5× ≈ 12,010 · 10× ≈ 3,670 |
| **Depot Tips** — each Stamp of Approval received | The stamped courier | A fixed amount per Stamp that **shrinks as the table grows**: **4,500 / 3,500 / 3,000 / 2,500 / 2,250 / 2,000** km for 3 / 4 / 5 / 6 / 7 / 8 couriers | Funny-but-wrong still gets paid. Every courier gives exactly one Stamp, so the pot per Run is fixed. Tuned so Stamps change who wins roughly **one Shift in four** |
| **Sweep Bonus** — every other courier stamped you | The stamped courier | One extra tip's worth, **only at 5 or more couriers** | At 3 or 4 couriers it would happen constantly, so it isn't offered |
| **Gear Ratio** *(hidden)* | Everyone | **5 ÷ the number of Runs**: Short ×1.667, Standard ×1.0, Long ×0.714 | A background calculation so a 3-, 5- or 7-Run Shift lands on the same Odometer scale and one rank ladder fits all. Applied to each receipt line before display, so the tally always adds up. Never named on screen |

**No negative points in Standard Mode.** A Run where nobody lands near the truth still pays whatever Depot Tips were stamped; a courier who is far off and unstamped earns **zero** for that Run.

**No hidden Range factor** (settled). Local, Mixed and Cosmic Routes score differently for an average courier (about 71%, 66% and 58% accuracy), but ranks stay fixed and the table chooses its own Dispatch Range.

### Sylly Mode (Backseat Drivers)

**Total Run Mileage = (Accuracy Mileage + Hazard Pay + Navigation Assist − Detour Penalty + Insurance Payout) × Gear Ratio**

| What happened | Who | How much | Notes |
|---|---|---|---|
| **Accuracy Mileage** | Every courier | Same pool as Standard | **Judged on the Logged ETA only.** The Revised ETA never touches the target's own accuracy score, so a pile-on cannot wreck the victim |
| **Hazard Pay** | A courier holding an **Unregistered Ride** | **4,000 km** flat, regardless of accuracy | Replaces the old Underdog Bonus. Unregistered Rides are harder to estimate (about 2,800 less accuracy on average), so Hazard Pay leaves holders about 1,700 ahead per Run: a small Sylly treat, not a winning strategy. Nothing is paid for merely "slow" ordinary Rides |
| **Navigation Assist** | A courier whose Course Correction moved the target's ETA closer to the truth | **80%** of the accuracy points the corrections added, shared by push size | Judged on the **final Revised ETA** (after everyone's corrections), not on your correction alone |
| **Detour Penalty** | A courier whose correction pushed the wrong way, or whose pile-on made the final worse than the Logged ETA | **40%** of the accuracy points lost, shared by push size | Hits the corrector only, never the target's accuracy score |
| **Insurance Payout** | The courier who was corrected | **3,000 km per ×10 of total push received**, capped at **4,000 km** per Run | Not flat — otherwise two friends could farm it with 1% nudges. The cap sits far below the cost of deliberately logging an awful ETA (7,000 to 36,000 km) |
| **Hands off** | A courier who chose not to correct anyone | Zero, no risk | Counts as ready so the phase can't stall |

**Credit and blame when several couriers correct the same target** *(settled in the maths round; one sentence on the receipt: "your correction moved her ETA closer, and you earned your share")*:
- Everything is judged on **where the ETA finally lands**, scored on the target's accuracy curve. The **swing** is the accuracy points the corrections added or removed compared with the Logged ETA.
- **The ETA ended up better:** couriers who pushed toward the truth share **Navigation Assist** (80% of the swing), split by push size. Anyone who pushed the **wrong way** pays a Detour Penalty (40% of the damage their own push would have done alone).
- **The ETA ended up worse (a Spin-out):** everyone whose push went the way the ETA finally moved shares the **Detour Penalty** (40% of the loss), split by push size. Couriers who pushed against it neither gain nor lose.
- **Back on Course:** the corrections gained a large swing and the final ETA lands close to the truth. `[UNTESTED: banner triggers left as proposed: Spin-out when 2 or more couriers piled on and the net loss is 3,000 km or more; Back on Course when the gain is 3,000 km or more and the final lands within 1.25× of the truth. Verify in playtests]`.
- **The target's own accuracy score is never touched.**
- *Why this scheme:* "as if you went last" makes any pile-on blame everyone for the whole overshoot, so Hands off wins every time and the phase dies. Splitting the net swing by push size is explainable in one line and rewards a **moderate** correction (about half of what you think is wrong). *Why Navigation Assist is bigger than the Detour Penalty:* the target is protected, so a saboteur gains nothing and always pays; a heavy penalty would only scare honest couriers off.

**Combining corrections:** corrections stack by **multiplying** (not adding), because adding percentages breaks (−60% twice would be −120%). Each *single* correction is capped at **÷10 to ×10**; there is **no cap on the combined total**. A courier's Run total can never drop below **zero** (the penalty floor, reached in about 1% of Sylly Runs).

**No Stamps or Depot Tips in Sylly Mode.** Course Correction replaces the Stamp phase so there is only one social action per Run. `[ASSUMPTION — revisit in playtests]`.

**Standard and Sylly are in balance.** At five couriers a Run averages about 29,300 km in Standard and 29,800 km in Sylly, with the same skill separation, so **one rank ladder serves both modes**. Sylly Runs are swingier, as intended.

**Does the Course Correction phase behave?** In simulation the best choice for an average courier is a **moderate** correction (about half of what they think is wrong, worth roughly +3,000 km a Run at four couriers). Hands off is safe and never best; a full fix breaks even or loses, and the best size shrinks as the table grows. Sharp couriers earn about twice what loose ones do from corrections. Roughly 4 Runs in 10 contain a Spin-out and 3 in 10 a Back on Course on a cautious table; a reckless table spins out nearly every Run. The ring, nudge-farming and spite exploits all lose money.

### Rank ladder (flair only)

Ranks are earned by total Mileage in the current Shift. A promotion fanfare plays as a courier crosses a threshold, and the Odometer shows "next rank in X km".

| # | Rank | Flavour line |
|---|---|---|
| 1 | Lost L-Plater | Still trying hard not to reverse into trees. Expect delays. |
| 2 | Pizza Peddler | Knows the local shortcut. 1 in 10 pizzas never arrive. |
| 3 | Detour Daredevil | Shortcuts galore. Treats footpaths as valid overtaking lanes. |
| 4 | Speed-Bump Surfer | Achieves airborne status at least three times per shift. |
| 5 | Waybill Warrior | Evades tolls and customs. Expired licence, no permits, delivery for hire. |
| 6 | Asphalt Astronaut | Bypasses city traffic jams by launching directly into orbit. |
| 7 | Cosmic Courier | Delivers hot takeaway across solar systems without dropping a single chip. |
| 8 | Hyperdimensional Herald | Arrives ten minutes before you even place the order. |

**Thresholds (total Mileage in the Shift):** 1 · 0 | 2 · 25,000 | 3 · 55,000 | 4 · 85,000 | 5 · 115,000 | 6 · 145,000 | 7 · 170,000 | 8 · 195,000. One ladder for every Shift Length and both modes (thanks to the hidden Gear Ratio).

**What that produces:** steps about one average Run apart, so most couriers are promoted after most Runs. Final ranks at a 5-Run Shift: roughly 0% / 1% / 5% / 14% / 27% / 27% / 21% / 6% for ranks 1 to 8. **Rank 8 is for very good play, not impossible:** it needs about 39,000 km a Run on average, and about 1 in 5 sharp couriers and 3 in 10 table winners reach it over a 5-Run Shift, but almost nobody before the final Run. **Mileage keeps accruing after the top rank**, so the Odometer still decides the winner; at Rank 8 the Odometer simply shows the total instead of "next rank in X km". A 5-courier table spans about three ranks. Promotion pace differs by Shift Length: Short Shifts jump about 1.5 ranks a Run, Long Shifts start slower (about 40% promoted after Run 1, about 65% afterwards), and Rank 8 comes up a little more often in Short Shifts than Long ones. `[MATHS: left as is until real playtests]`.

---

## 7. Settings

| Setting | What it changes | Options | Default |
|---|---|---|---|
| **Dispatch Range** *(difficulty — first)* | Which Route tiers come up: **Local** = human-scale, easy to reason about; **Mixed** = all tiers; **Cosmic** = astronomical, hardest and silliest | Local / Mixed / Cosmic | **Mixed** |
| **Shift Length** | Number of Runs before End of Shift | Short (3) / Standard (5) / Long (7) | **Standard** (also the default in Sylly Mode) |
| **GPS** | Whether the Route's distance figure is shown. OFF shows the headline only ("The Length of Italy"), so couriers must also estimate the distance; the Dispatch Board then leaks distance information through everyone's ETAs, which is the point | ON / OFF | **ON** |
| **Off the Map** | Lets **fantastical Routes** into the draw: mythical, folklore and made-up places (Atlantis, the Emerald City, the Underworld) with a game-defined distance, alongside the real Routes. Does **not** change which Rides appear. When one comes up, the Briefing opens with a **📡 "GPS Signal Lost…"** banner | ON / OFF | **OFF**. Switches to **ON** when Sylly Mode is turned on, and can still be turned back off |
| **✨ Sylly Mode — Backseat Drivers** *(always last)* | See §8 | OFF / ON | **OFF** |

Player count (3–8) is set from the lobby roster, not in the settings overlay. *Off the Map* sits directly above Sylly Mode; turning Sylly on flips it to ON as a visible default, not a lock. `[ASSUMPTION: when ON, roughly 1 Route in 4 is a fantastical one. Tune in the content round]`. `[ASSUMPTION: the old Underdog Bonus setting is removed and the optional Spec Sheet idea is dropped, because speed is always hidden]`.

---

## 8. Sylly Mode

| Field | Answer |
|---|---|
| **Thematic name** | **Backseat Drivers** *(other candidates: Co-Pilot Chaos, Recalculating…)* |
| **In one sentence — what changes?** | Everyone becomes a backseat driver: after the Dispatch Board is revealed, each courier grabs **one other courier's wheel** and applies a secret **Course Correction** (a percentage change to that courier's ETA), and fantastical **Unregistered Rides** join the pool. The *Off the Map* setting defaults to ON alongside it. |
| **New screens or phases?** | Yes. The Stamp phase is replaced by a **Course Correction phase**, and there is a **Corrections reveal** before Proof of Delivery where each bar visibly shoves to its **Revised ETA** with the spoken reasons |
| **Does it change scoring?** | Yes — a separate scoring system (see §6) |
| **Does it change the win condition?** | No — highest Mileage still wins |

### Sylly round flow
Briefing → private Ride → Logged ETA → **Dispatch Board** → **Radio Defense** (talking, no Stamps) → **Course Corrections** (secret and simultaneous) → **Corrections reveal** (Revised ETAs) → **Proof of Delivery** → **Odometer tally**.

### Course Correction
- Each courier may correct **one** other courier (never themselves) by a chosen percentage, or choose **Hands off**.
- Corrections target whichever courier you think is **furthest off** — but you must also guess what everyone else will do, because corrections multiply. Three couriers each reasonably saying "she's way too low, double it" can turn a miss into a Spin-out.
- Reward scales with improvement, so a big correction on a big miss is a big prize *and* a big risk. A small correction on a small miss is safe and small.
- The corrector pays for overcorrection; the target is protected (Logged ETA only) and receives an **Insurance Payout** for being messed with.
- The input is a dial on a compressed scale (a ÷10 correction and a ×10 correction feel equally large), displayed as a percentage. Tapping a courier's bar on the Dispatch Board selects them. See §14.

### Unregistered Rides and Hazard Pay
- Sylly Mode adds **Unregistered Rides** — fantastical or pop-culture vehicles — to the pool. Holding one pays a flat **Hazard Pay** bonus (4,000 km) regardless of accuracy.
- **Fairness rule:** every Unregistered Ride must have a short, fair, slightly buried **hint in the Dispatch Briefing** that tells a sharp reader which speed to use. **The Briefing is shared by everyone** (settled): a table may guess "somebody has an eagle", and that costs nobody anything, because knowing someone else's Ride doesn't change your own estimate. Examples:
  - Time machine → *"No time travelling during delivery hours."* (use the vehicle's normal speed)
  - Giant eagle → *"New and faster species of large eagles sighted along the route — be cautious."* (faster than known eagles, but not absurd)
  - Flying carpet → *"Wind speeds perfect for a gentle ride."* (the carpet's **cruising** speed, not its maximum)
- Rides can therefore carry **more than one speed** (for example cruising and maximum), and the Briefing's assumptions decide which one is the benchmark. `[ASSUMPTION: ordinary Rides can use this too — "no speed limit" selects a maximum sustainable speed, "60 km/h limit" caps it]`.
- **Naming policy (settled in principle, not legal advice):** Unregistered Rides and fantastical Routes use **real pop-culture names only where there is no IP concern**; otherwise a **generic or folklore description** carries the joke ("a time-travelling sports car", "a giant eagle", "a flying carpet", a dragon, a broomstick). Folklore, myth and public-domain sources (Atlantis, Wonderland, Oz, Olympus, Asgard) are the safe default for Routes. Every name lives in the content data and is **swappable without a code change**. `[ASSUMPTION: a wink-free generic name is the launch default; any trademarked name needs a deliberate sign-off before it ships]`.
- **Off the Map and Unregistered Rides are separate switches.** Off the Map affects Routes only; Unregistered Rides come with Sylly Mode only.

*Why this Sylly:* the standard game is solitary estimation plus a pitch contest; Backseat Drivers turns the table's talk into a mechanical weapon and adds a second-order game — judging *other people's* answers and predicting each other's meddling.

---

## 9. Thematic Vocabulary

| Generic term | ETA? calls it | Notes |
|---|---|---|
| Match / game | **Shift** | "Clocking in for a 5-Run Shift." |
| Round | **Run** | "Run 3 of 5." |
| Player | **Courier** | Used everywhere; "Driver" is not used (a helicopter or a snail isn't driven) |
| Score / points | **Mileage** (km) | The primary currency |
| Score tracker | **The Odometer** | Rolling digits that spin up after every Run |
| Rank | **Rank** (title ladder in §6) | Per-Shift flair only |
| Rank-up moment | **Promotion** | Fanfare when a threshold is crossed |
| Score multiplier by length | **Gear Ratio** | **Hidden background calculation. Never shown to players** (not on the tally, not in the how-to). Appears only in the technical spec |
| Distance prompt | **The Route** | |
| Assumptions / scene-setting | **Dispatch Briefing** | Includes the hints for Unregistered Rides |
| Distance-hiding toggle | **GPS** | ON/OFF |
| Assigned vehicle | **Your Ride** | |
| Fantasy / pop-culture vehicle | **Unregistered Ride** | |
| Fantastical Routes toggle | **Off the Map** | ON/OFF; defaults ON in Sylly Mode. **"GPS Signal Lost…"** is the on-screen banner when a fantastical Route appears (kept off the setting name because it sits next to the GPS toggle and would read as a harder GPS OFF). Other names considered: Into the Unknown, Here Be Dragons, Beyond the Atlas |
| Bonus for an Unregistered Ride | **Hazard Pay** | Flat; Sylly Mode only |
| Your estimate | **Logged ETA** | |
| Unit chips | **The Time Dial** | Minutes / hours / days / years |
| Entry confirmation box | **Dispatcher's Double-Take** | "400 years on a skateboard? Lock it in?" |
| Chart reveal | **The Dispatch Board** | |
| Discussion phase | **Radio Defense** | Pitching over the airwaves |
| Like / vote | **Stamp of Approval** | Mandatory; explicitly **Best Pitch** |
| Score bonus from votes | **Depot Tips** | Standard only |
| Unanimous vote bonus | **Sweep Bonus** | |
| Sylly action | **Course Correction** | Button label: **"Grab the Wheel"**; locked state: "Recalculating…" |
| Declining to act | **Hands off** | |
| Result after corrections | **Revised ETA** | |
| Payout for a helpful correction | **Navigation Assist** | |
| Penalty for a harmful correction | **Detour Penalty** | |
| Payout for being corrected | **Insurance Payout** | |
| Pile-on that makes things worse | **Spin-out** | Banner |
| Pile-on that rescues an estimate | **Back on Course** | Banner |
| The true result reveal | **Proof of Delivery** | Where Ride speed is first revealed |
| Comedy line within the reveal | **The Reality Check** | |
| Tally screen | **Odometer tally** | Itemised receipt |
| Game over screen | **End of Shift 🏁** | |
| Winner | **Courier of the Month** | |
| Play again | **Next Shift?** | |
| Quit | **Clock Out?** | |
| Settings overlay title | **The Dispatch Desk 📋** | |
| Difficulty setting | **Dispatch Range** | Local / Mixed / Cosmic |
| Sylly Mode | **✨ Backseat Drivers** | |

**Retired terms:** Stars, Driver of the Month, Fleet Legend, Underdog Bonus, Backup Support, Backup Bonus, Scout Score, Mods, Rig.

---

## 10. Word Bank & Content

| Field | Answer |
|---|---|
| **Uses the shared word bank?** | Only as a **starting point**: the existing vehicle names can seed the Ride list, but ETA needs its own content set with speeds, tiers and assumptions the shared bank doesn't carry |
| **New content needed** | A dedicated ETA content set with three parts: **Routes**, **Rides**, and **Briefing lines**, plus a content guide document for adding more |
| **Content status** | **Deliberately not rebuilt in this brief.** The old 54-Route / 24-Ride set was a proof of concept. Once this brief is stable, the shared word bank is attached and the content is restarted from there, pulling across whatever works from the old set |
| **Exclusions** | Distances must be universally recognisable (a marathon, Earth to the Moon) — never local or obscure. Drop over-specific Routes ("Route 66", "New York to Sydney"); keep general ones ("Width of Australia") |

### What each content part holds (plain English)

**A Route** has: a headline players see, a distance in km, a tier (Local / Geographic / Astronomical, which the Dispatch Range setting filters on), a short flavour line, the **assumptions** that apply (what kind of corridor — ground, air, water or space — and any speed limit), and an optional **Off the Map** flag (fantastical Routes, which appear only when that setting is ON; each carries a stated, game-defined distance).

**A Ride** has: a name and emoji, a **tier** (its speed band), one or more **speeds** (always a *cruising* speed; some also a *maximum*), a one-sentence **reveal line** shown at Proof of Delivery, and an Unregistered flag. Unregistered Rides also carry their **Briefing hint** (§8).

**A Briefing line** is a reusable assumption sentence tied to a corridor type or a speed choice (*"No speed limit"* selects a maximum; *"60 km/h limit"* caps it; *"Ultra tyres fitted to all vehicles"* removes rough-terrain slowdowns).

**Example Route (plain English):** *"The Length of Italy" — about 1,200 km, Geographic tier. Briefing: "A brand-new, perfectly straight, empty corridor has opened end to end. No stops, no traffic."*

**Example Ride:** *Helicopter — tier Rail & Rotor, cruising speed about 250 km/h. Reveal line: "A medium helicopter cruises at around 250 km/h."*

**Example Unregistered Ride:** *Flying carpet — cruising about 50 km/h, maximum much higher. Hint in Briefing: "Wind speeds perfect for a gentle ride" (the benchmark uses cruising speed). Reveal line explains which speed was used.*

### Ground rules for the "truth"

Accuracy scoring makes every stored distance and speed a graded answer, so these rules sit in the how-to and the Briefing:
1. **Universal rule:** constant speed, no stops, no rest, no fuel, no traffic, unless a Briefing line says otherwise.
2. **Every Route carries a corridor assumption**, so impossible pairings (a snail to Mars) become answerable.
3. **Every Ride has a finite, positive speed.** No teleporting, no time travel — a time machine uses its ordinary driving speed and the Briefing says so.
4. **Vertical Routes** (Everest, the Mariana Trench) need an explicit Briefing line so a skateboard isn't expected to climb.
5. **The game's number is final.** The Reality Check line states what was assumed, so disputes end at the screen.

### Pairing: tiers and the answerable window

- Rides are grouped into **speed tiers**. `[ASSUMPTION: roughly Crawl & Foot · Pedal & Pootle · Road · Rail & Rotor · Sky & Beyond · plus the Unregistered group. Tier names and band edges are a content-round job]`
- A Ride may only be paired with a Route if the **true ETA lands inside an answerable window** — roughly a couple of minutes up to some thousands of years. `[ASSUMPTION: bounds to be tuned.]` This stops a rocket across a swimming pool (milliseconds) and a walker to the nearest star (hundreds of millions of years). The Dispatch Range setting then filters which Routes are even eligible.
- From the eligible Rides for a Route, each Run is drawn for **spread across fast and slow**, with no two near-identical vehicles in the same Run.

| Players | Rides needed per Run | Routes per Shift (Short / Standard / Long) |
|---|---|---|
| 3 | 3 | 3 / 5 / 7 |
| 5 | 5 | 3 / 5 / 7 |
| 8 | 8 | 3 / 5 / 7 |

`[ASSUMPTION: a Route never repeats within a Shift; a courier doesn't get the same Ride twice in a Shift. Each Route needs at least eight eligible Rides spanning at least three tiers — a content-round check]`.

### Known defects in the old set (to fix in the rebuild)
- 100 km appears twice (the Kármán line and the edge of the atmosphere).
- Some entries sit in the wrong tier (the Suez Canal in "human-scale"; a cruising aeroplane's altitude in "astronomical").
- Several Routes are really vertical distances and need Briefing assumptions.
- Pop-culture Rides and Routes: follow the naming policy in §8 (generic or folklore by default, real names only with no IP concern, all swappable in data).

---

## 11. Custom Visual Assets

All visuals are generated by the game itself (suite convention); no photographs or imported artwork.

| Asset | What it is |
|---|---|
| **Dispatch Board** | The signature visual. A horizontal bar chart on a compressed time scale with labelled landmark ticks (1 minute, 1 hour, 1 day, 1 week, 1 year, 1 century), so equal distances mean equal error. Bars grow in a time-lapse that sweeps through the units so huge scales feel intuitive. Each bar carries the courier's name and Ride emoji |
| **Truth marker** | The "finish line" that drops onto each bar at Proof of Delivery; the payoff shot |
| **Revised bars** | In Sylly Mode, a ghost of the Logged ETA stays behind while the bar shoves to the Revised ETA |
| **The Odometer** | Rolling digit counter that spins up per Run, with a rank badge beside it |
| **Eight rank badges** | One per title in §6 |
| **Ride emoji / icons** | One per Ride; Unregistered Rides get a hazard-stripe frame |
| **Course Correction dial** | A compressed-scale dial (÷10 … ×10) with percentage readout and "Grab the Wheel" button |
| **Banners** | Spin-out, Back on Course, Promotion |
| **Briefing card** | The Route headline plus its assumption lines |

`[ASSUMPTION: Dispatch Board animation and reveal timing to be explored through mockups after this brief is stable]`.

---

## 12. Multiplayer Classification

| # | Question | Answer |
|---|---|---|
| 1 | **Own device or shared device?** | **Own device only.** Private Rides, private entry and secret Stamps/Corrections all need a personal screen. Pass-the-phone is out of scope. `[ASSUMPTION: a future TV / host-only mode could show the Dispatch Board and Odometer tallies on a big screen while phones keep the private parts]` |
| 2 | **Is any information private to one device?** | Yes, briefly: your Ride card, your Logged ETA, your Stamp (Standard) or Course Correction (Sylly). Each is revealed at the right moment |
| 3 | **Do players ever act at the same time?** | Yes — ETA entry, Stamping and Course Correction are all simultaneous, each ending in a ready check |
| 4 | **Is one device ever locked while another is active?** | No per-player locking. The locking is per phase. A courier who locks in early simply waits; they may change their Stamp until everyone has locked |
| 5 | **Does anything not work with multiple devices?** | Nothing technical, but the Radio Defense is spoken aloud, so players need to be in the same room (or on a voice call) |
| 6 | **Is there a read-only / spectator role?** | **No.** Nobody is eliminated or sits out; everyone plays every Run. No spectators in v1. If a courier leaves mid-Shift, the suite-wide behaviour applies: the game ends. `[ASSUMPTION: no reconnect support in v1]` |
| 7 | **Is information hidden temporarily?** | Yes, in layers. Rides and ETAs are hidden until the Board; Stamps and Corrections are hidden until everyone locks in; **a Ride's speed is hidden from everyone until Proof of Delivery** |

**Stalled-player rule:** the Stamp phase (Standard) and the Course Correction phase (Sylly) end when everyone has locked in. If all but one courier have locked in, a short countdown (about 30 seconds) starts; a courier who hasn't acted by then is treated as having given no Stamp, or as **Hands off**. `[ASSUMPTION: 30 seconds; tune in playtests]`. There is no skip button — players tell each other to hurry up.

*(The question wording above is inferred from earlier briefs; Claude Code will map these to the technical template.)*

---

## 13. Screens — Plain English List

1. **Game menu** — hub, Play, settings, how-to.
2. **Lobby / setup** — courier names (3–8), settings summary.
3. **Dispatch Briefing** — Route headline, distance (unless GPS OFF), assumption lines.
4. **Your Ride + Log ETA** — private. Your Ride, the Time Dial, number field, Log ETA; **Dispatcher's Double-Take** confirmation box; waiting state.
5. **The Dispatch Board** — all Logged ETAs; Radio Defense happens here, off-device.
6. **Stamp screen** (Standard) — pick one other courier's pitch; can change until all locked; stall countdown.
7. **Course Correction screen** (Sylly) — tap a bar, open the dial panel, set it or choose Hands off.
8. **Corrections reveal** (Sylly) — bars shove to Revised ETAs with spoken reasons; Spin-out / Back on Course banners.
9. **Proof of Delivery** — truth markers drop, speed facts and Reality Check lines.
10. **Odometer tally** — itemised receipt per courier (every line already adjusted, so it adds up), Promotion fanfare.
11. **End of Shift** — final standings, Courier of the Month, awards, Next Shift? / Clock Out?

*Standard overlays:* The Dispatch Desk 📋 (settings), How to Play, Rank & Scoring cheat sheet, Clock Out? (quit), Next Shift? (play again).

---

## 14. Complex Interaction / UI Spec

Three interactions are more than tap-to-choose. All popups use one of the two existing overlay shapes: a scrollable slide-up panel, or a small centred confirmation box (three or fewer elements). **No frozen-controls exception is needed.**

### A. Log ETA entry

```
 RUN 2 of 5 · The Length of Italy (~1,200 km)
 Your Ride:  🚁 Helicopter

        ┌──────────────────┐
        │        5         │   ← one number field (decimals allowed)
        └──────────────────┘
   [ min ]  [ hours ✓ ]  [ days ]  [ years ]
   + add minutes          ×1,000  ×1M   ← only for very large answers

              [ LOG ETA ]
```

**Input methods:** type with the keypad; tap a unit chip; tap "+ add" to enter a second unit (for example 2 hours **and** 30 minutes); tap a multiplier chip for cosmic-scale answers. `[ASSUMPTION: one number plus a unit chip is the default for speed; the compound entry is optional. Precision beyond a few percent adds nothing because the true speeds are rough]`.

### B. Dispatcher's Double-Take (small centred confirmation box)

On every submit, the box repeats the entry in plain words — *"4,000 hours — about 167 days. Lock it in?"* — with **Lock it in** and **Re-dial**. It never compares to the truth, so it cannot leak the answer. `[ASSUMPTION: no truth-based sanity flag, because repeated attempts could be used to probe the answer]`.

### C. Course Correction (Sylly Mode; slide-up panel)

```
 ┌─ The Dispatch Board ──────────────────────┐
 │ 🚁 Ada       ▓▓▓▓▓▓▓▓▓▓░░░░  8 months     │
 │ 🦅 Boris     ▓▓▓▓▓▓▓▓░░░░░░  4 months     │
 │ 🚗 Chloe     ▓▓▓▓▓░░░░░░░░░  40 days  ← tap
 │ ✈️ Dev       ▓▓▓░░░░░░░░░░░  3 weeks      │
 └────────────────────────────────────────────┘
 ┌─ Grab Chloe's wheel ──────────────────────┐
 │  ÷10  ÷5  ÷2 ╎ ×2  ×5  ×10                 │
 │        ◀────●────▶       (compressed dial) │
 │  Your correction: +150%   (40 → 100 days)  │
 │   [ Hands off ]        [ Lock it in ]      │
 └────────────────────────────────────────────┘
```

**Input methods:** tap a courier's bar to select them (never your own); drag the dial; tap a marked stop on the dial; use small step buttons for fine control. A ghost bar previews *only your own* correction on the Board — never anyone else's, and never the truth. Locking in shows "Recalculating…" until everyone is ready.

---

## 15. Rule Reference / In-Game Cheat Sheet

§4 doesn't apply, but a mid-game reference is still worth having: a **Rank & Scoring** card in the same scrollable overlay shape as How to Play, containing:
- The eight-rank ladder with thresholds for the current Shift Length.
- A one-paragraph recap of how Mileage is earned (Standard or Sylly, whichever is active).
- In Sylly Mode: how corrections combine (they multiply), what a Spin-out and Back on Course are, and the Hands off option.

---

## 16. Sound Design

All sounds are synthesised in-game.

| Moment | Sound |
|---|---|
| Briefing reveal | Radio crackle, dispatcher "ding" |
| Log ETA | Small stamp-and-click |
| Dispatch Board bars growing | Rising ticks that climb through the time units |
| Stamp given / locked | Rubber-stamp thunk |
| Course Correction locked | Steering-wheel creak |
| Corrections reveal (bars shoving) | Tyre squeal per correction |
| Spin-out | Skid and crash cymbal |
| Back on Course | Triumphant horn |
| Proof of Delivery marker drop | Drumroll then a bell |
| Odometer spin-up | Fast mechanical rolling clicks, slowing to a stop |
| Promotion | Short fanfare |
| End of Shift | Depot closing-time bell |

---

## 17. End Screen Content Mockup

*(All numbers illustrative.)*

```
🏁  END OF SHIFT — 5 Runs clocked

🏆  COURIER OF THE MONTH
    BORIS — Waybill Warrior

  THE ODOMETER
  1. Boris    🛵  182,340 km   Waybill Warrior
  2. Ada      🛵  171,905 km   Waybill Warrior
  3. Dev      🛵  120,610 km   Detour Daredevil
  4. Chloe    🛵   96,120 km   Detour Daredevil

  AWARDS
  🎯 Sharpest Estimate  — Ada  (closest single Logged ETA: 1.01×)
  💥 Biggest Spin-out   — Dev  (Run 3, Chloe's pile-on)           ← Sylly only
  🧭 Best Rescue        — Chloe (Run 3, biggest Navigation Assist) ← Sylly only
  🎙️ Crowd Favourite    — Boris (most Stamps of Approval)          ← Standard only
  🛡️ Most Insured       — Chloe (largest Insurance Payouts)        ← Sylly only

        [ Next Shift? ]        [ Clock Out? ]
```

Standings are by total Mileage; a shared title is shown as a tie. Awards appear only for the mode played.

---

## 18. How to Play — Teaching Points

One card per step, then "Winning and Scoring", then "✨ Backseat Drivers".

1. **Clock in** — You're a courier. Each Run, a famous distance (the Route) and a Briefing of assumptions appear, and you're secretly handed a Ride. Nobody tells you its speed.
2. **Log your ETA** — Estimate how long your Ride would take, pick a unit, and lock it in. The game repeats your answer in plain words to catch slips.
3. **The Dispatch Board** — Everyone's ETAs appear on one chart. Bars close to each other are probably thinking the same thing; bars far apart are about to start an argument.
4. **Radio Defense** — Defend your number out loud. Then give one Stamp of Approval to the best pitch — funny or convincing, your call.
5. **Proof of Delivery** — The true ETA lands on every bar and each Ride's real speed is revealed. Closer to the truth means more Mileage.
6. **The Odometer** — Your Mileage spins up and your rank can climb. Ranks only last for this Shift.
7. **Winning and Scoring** — Accuracy pays the most; Stamps pay a little; the most Mileage at End of Shift is Courier of the Month.
8. **✨ Backseat Drivers** — Instead of Stamps, you grab one other courier's wheel and apply a secret percentage correction to their ETA. Fixing a big miss pays big, but corrections multiply, so a pile-on can overshoot into a Spin-out. Unregistered Rides join the pool and pay Hazard Pay.

---

## 19. Open Questions & Design Notes

### Decisions Log (settled in discussion)
- **Scoring is accuracy-based** (the Logged ETA's closeness to the truth), with a social layer on top; the old votes-only model is gone.
- **Mileage / Odometer / eight alliterative ranks**; ranks are per-Shift only.
- **Ride speed is hidden** and revealed at Proof of Delivery.
- **Stamp = Best Pitch**, explicit even though it can't be enforced; mandatory, no self-stamp, soft fallback for stallers, no skip button.
- **Echo-confirm** instead of a truth-based sanity check.
- **Underdog removed;** Hazard Pay for Unregistered Rides in Sylly Mode only.
- **Sylly Mode is built in full** (Course Correction + Unregistered Rides + Briefing hints), worked on piece by piece.
- **Course Correction** replaces Backup Support: pick any courier, no bonus for the pick, multiplicative stacking, reward scales with improvement and is judged on the final result; consolation for the corrected courier.
- **Briefing hints are shared** by all couriers.
- **Off the Map** setting (fantastical Routes): OFF by default, ON by default in Sylly Mode.
- **Pop-culture names:** real names only if no IP concern, otherwise generic or folklore; swappable in data.
- **Gear Ratio is hidden**, a background calculation never shown.
- **Rank 8 should be reachable with very good play** (tightened to 170k / 195k); Mileage keeps counting after the top rank. **No hidden Range factor.** **Sylly defaults to a Standard Shift.** Spin-out / Back on Course thresholds left as proposed and marked untested.
- **Maths round 1 applied:** accuracy curve, tips, Sweep, hidden Gear Ratio, Course Correction credit and blame, Insurance, Hazard Pay, rank thresholds (see *eta-maths-round-1*).
- **Re-dial idea dropped.** Shift Length is 3 / 5 / 7 Runs. **Content is restarted after this brief.**

### Design flags for the technical spec (plain English)
- The Dispatch Board must stay readable when answers span minutes to millions of years, using a compressed scale with landmark ticks, not a literal proportional chart.
- All ETAs need one common internal unit for sorting and comparison; entry keeps the courier's chosen unit.
- Durations must be shown in friendly words ("about 12.5 days") including the very large ones.
- Ride assignment is curated per Run (tier window and fast/slow spread), not random.
- Each phase needs a stalled-player fallback.
- The Odometer tally and Corrections reveal need a tap-to-skip.

### Out of scope for v1
Pass-the-phone mode · free-text assumption capture · a persistent rank or profile · Re-dial · TV / host-only mode (noted as a future fit) · bots.

---

## 20. Mood & References

| Field | Answer |
|---|---|
| **Closest games** | Wits & Wagers (estimating); Balderdash (defending the indefensible); The Price Is Right (accuracy against a hidden number) |
| **Tone** | Fast, loud, argumentative, warm. The comedy of scale plus the comedy of conviction — then the comedy of getting caught |
| **Should NOT feel like** | A quiet maths quiz or a typing exercise. If the table goes silent to calculate, the game has failed — the Stamp and Course Correction layers exist to keep it loud |
| **Copy already written** | "Skateboard to the Moon? Show your working." · "Helicopter at 250 km/h: about 4.8 hours. Ada, dead on." · "A pogo stick at 4 km/h, bouncing non-stop, would take about 12.5 days. You lot are dreaming." · "Recalculating…" · Spin-out · Back on Course · Courier of the Month |

---

## 21. Sample Round

*Mileage figures are calculated from the maths round 1 numbers, with the hidden adjustments already applied.*

### Sample 1 — Standard Mode

**Setup:** 4 couriers — **Ada, Boris, Chloe, Dev**. Dispatch Range Mixed, GPS ON, Standard Shift, Run 1 of 5.

**Route:** *The Length of Italy (~1,200 km).* **Briefing:** *"A brand-new, perfectly straight, empty corridor has opened end to end. No stops, no traffic."*

**Rides (private):** Ada — Helicopter · Boris — Pogo stick · Chloe — Shopping trolley · Dev — Rocket.

1. **Logged ETAs:** Ada **5 hours** · Boris **4 days** · Chloe **21 days** (the Double-Take says "21 days — about 3 weeks. Lock it in?") · Dev **20 minutes**.
2. **Dispatch Board** (fastest to slowest): Dev 20 min → Ada 5 h → Boris 4 d → Chloe 21 d.
3. **Radio Defense:** Dev: "Once we're airborne, it's twenty minutes flat." Boris: "Four days of non-stop bouncing, no bathroom breaks." Chloe: "One wonky wheel adds a full week." Ada: "A helicopter genuinely does about five hours."
4. **Stamps (Best Pitch):** Ada → Boris · Boris → Chloe · Chloe → Boris · Dev → Ada. Tally: Boris 2, Chloe 1, Ada 1, Dev 0. No Sweep Bonus (nobody got all three, and Sweep only exists at 5+ couriers anyway). At four couriers a Stamp is worth 3,500 km.
5. **Proof of Delivery** (true ETAs, speeds revealed):
   - Ada, Helicopter ~250 km/h: **4.8 hours.** Logged 5 h — 1.04× off. *"Dead on."*
   - Boris, Pogo stick ~4 km/h: **12.5 days.** Logged 4 d — about 3.1× too fast. *"You're dreaming."*
   - Chloe, Shopping trolley ~6 km/h: **8.3 days.** Logged 21 d — about 2.5× too slow.
   - Dev, Rocket ~28,000 km/h: **about 2.6 minutes.** Logged 20 min — nearly 8× too slow. *"Launch prep not included."*
6. **Odometer tally** (Standard = Accuracy + Depot Tips):

| Courier | Accuracy | Depot Tips | Run total | Rank |
|---|---|---|---|---|
| Ada | 40,000 | 3,500 | **43,500** | → Pizza Peddler *(Promotion)* |
| Boris | 19,270 | 7,000 | **26,270** | → Pizza Peddler *(Promotion)* |
| Chloe | 22,955 | 3,500 | **26,455** | → Pizza Peddler *(Promotion)* |
| Dev | 6,320 | 0 | **6,320** | Lost L-Plater |

**Result:** Ada leads after Run 1. Boris won the table on pitch (two Stamps) but his accuracy trails Chloe's, so Chloe edges him by 185 km: exactly the trade-off the two layers exist to create.

### Sample 2 — Sylly Mode (Backseat Drivers)

**Setup:** same four couriers, Sylly Mode ON (Off the Map defaults ON, though this Route is real), Run 3 of 5.

**Route:** *Earth to the Moon (~384,400 km).* **Briefing:** *"A cleared corridor runs all the way. No time travelling during delivery hours. New and faster species of large eagles sighted along the route — be cautious. Wind speeds perfect for a gentle ride."*

**Rides (private):** Ada — **Flying carpet** *(Unregistered; cruising ~50 km/h)* · Boris — **Giant eagle** *(Unregistered; ~120 km/h)* · Chloe — **Time-travelling sports car** *(Unregistered; normal driving speed ~140 km/h)* · Dev — Passenger jet *(~900 km/h)*.

1. **Logged ETAs:** Ada **240 days** · Boris **120 days** · Chloe **40 days** · Dev **21 days**.
2. **Dispatch Board + Radio Defense.** Chloe argues a car on a space highway just goes, "forty days, easy." No Stamps this time.
3. **Course Corrections** (secret, simultaneous):
   - Ada → Chloe **×2** — "that car isn't doing forty days."
   - Boris → Chloe **×2**.
   - Dev → Chloe **×2.5**.
   - Chloe → Ada **×1.25** — "the carpet's a bit slow."
   - Boris and Dev receive nothing.
4. **Corrections reveal.** Chloe's bar shoves from 40 days to **400 days** (2 × 2 × 2.5 = ×10). Ada's bar eases from 240 to **300 days**.
5. **Proof of Delivery** (true ETAs from the stated assumptions):
   - Ada, carpet cruising at ~50 km/h (max is far higher but the Briefing said "gentle"): **~320 days.** Logged 240 d: ~1.3× under. Revised 300 d: **~1.07× under — better.**
   - Boris, eagle ~120 km/h: **~133 days.** Logged 120 d: ~0.9× — very close.
   - Chloe, sports car at its ordinary ~140 km/h (not time-travel speed): **~114 days.** Logged 40 d: ~2.9× too fast. Revised 400 d: **~3.5× too slow — worse.** **SPIN-OUT.**
   - Dev, jet ~900 km/h: **~17.8 days.** Logged 21 d: ~1.2× — close.

   *Notice:* Ada's and Boris's two ×2 corrections alone would have put Chloe at **160 days** (only ~1.4× over — **Back on Course**). Dev's third correction tipped the pile-on into a Spin-out.
6. **Odometer tally** (Sylly = Accuracy + Hazard Pay + Navigation Assist − Detour Penalty + Insurance Payout):

| Courier | Accuracy (Logged ETA only) | Hazard Pay | Navigation Assist | Detour Penalty | Insurance Payout | Run total |
|---|---|---|---|---|---|---|
| Ada | 35,020 | 4,000 | — | −400 | +290 | **38,910** |
| Boris | 38,790 | 4,000 | — | −400 | — | **42,380** |
| Chloe | 20,760 | 4,000 | +3,700 | — | +3,000 | **31,460** |
| Dev | 37,550 | — | — | −530 | — | **37,020** |

   - **Chloe's own correction paid.** Ada's ETA moved from 1.33× off to 1.07× off, a swing of +4,620 accuracy points, and Chloe earns 80% of it: **+3,700 Navigation Assist.** Ada, the beneficiary, pays nothing extra and collects a small Insurance Payout (×1.25 of push).
   - **The Spin-out is mild here.** The three ×2, ×2, ×2.5 corrections took Chloe from 2.9× too fast to 3.5× too slow, a net swing of only −3,330, so the Detour Penalty pool is **1,330** (40%), split by push size: Ada 30%, Boris 30%, Dev 40% (a ×2.5 pushed harder than a ×2). It is mild because Chloe was already badly off, so overshooting to a similar miss on the other side costs little. Chloe kept her accuracy score untouched and collected the maximum Insurance Payout (3,000).

**Sample 2b — the same pile-on on a good estimate.** If Chloe had logged **80 days** (only 1.4× too fast, worth 33,630 on accuracy), the same ×10 pile-on lands on 800 days (7× too slow). The swing is **−26,050**, so the Detour pool is **10,420**: Ada −3,140 · Boris −3,140 · Dev −4,150. Three couriers each pay about 3,000 to 4,000 km to wreck a nearly right answer. That is the "everyone failed together" moment. If only Ada and Boris had corrected (×2 each), each would still lose about 2,500 km.

**Result:** Boris leads the Run after sitting out the chaos; Chloe recovers from the worst miss. Everyone had a reasonable idea individually; collectively they nudged it the wrong way.

### Sample 3 — Hidden information, entry slips, and a stalled player

**Setup:** 3 couriers — **Ada, Boris, Chloe**. Standard Mode, Run 2 of 5.
**Route:** *Sydney to Melbourne (~880 km).* **Briefing:** *"A dedicated, perfectly straight corridor is open end to end."*
**Rides:** Ada — Skateboard (~15 km/h) · Boris — Passenger jet (~900 km/h) · Chloe — Horse (~30 km/h).

| Moment | What each courier can see |
|---|---|
| **Assignment** | Everyone sees the Route and Briefing. **Each phone shows only its own Ride** — Ada's phone shows the skateboard, and she can't see Boris's or Chloe's. Nobody sees any speeds |
| **Entry** | Ada enters 2 days; Boris enters 1 hour. Chloe means 30 **hours** but taps "days" and types 30. The Double-Take says *"30 days — about a month. Lock it in?"* Chloe spots the slip, taps Re-dial, picks hours, and locks in 30 hours. Nobody else sees any of this |
| **Waiting** | Phones show a ready state with the count of couriers locked in — never anyone's ETA |
| **Dispatch Board** | All three ETAs and Rides are revealed at once, to everyone, at the same time. Ada and Chloe now see Boris's jet; this is the first time Rides become public |
| **Stamps** | Ada stamps Boris; Boris stamps Ada. Chloe is still mid-argument. Once two of three have locked in, a roughly 30-second countdown appears on Chloe's phone; it runs out and she gives **no Stamp** this Run. Tally: Ada 1, Boris 1, Chloe 0 |
| **Proof of Delivery** | The speeds appear for the first time: skateboard ~58.7 h (~2.4 days) — Ada's 2 days is close; jet ~59 min — Boris's 1 hour is almost exact; horse ~29.3 h — Chloe's 30 hours is nearly perfect |

**What this proves:** private information (Rides, ETAs, Stamps) stays on its own phone until the right reveal, a unit slip is caught without any peek at the truth, and a stalled courier can't freeze the table.
*(In Sylly Mode the same pattern applies to Course Corrections: secret until every courier has locked in or chosen Hands off.)*

---

## Open Questions

1. **[RESOLVED — numbers in, to be refitted]** **The maths round.** First-pass numbers are in §6. Everything rests on **assumed** player behaviour (how far off real couriers land, how bold real tables correct); playtests must log every Logged ETA against its truth by Dispatch Range, every Stamp, and every Course Correction with its target, so the numbers can be refitted.
2. **[NON-BLOCKER]** **Content rebuild.** Restart Routes, Rides and Briefing lines from the shared word bank; define ride tiers, the answerable-window bounds, speed nodes, the Briefing line library and the **Off the Map** Route list (folklore and public-domain first); fix the known defects in §10.
3. **[NON-BLOCKER]** **Dispatch Board mockups** — the compressed scale, time-lapse reveal, truth marker drop and shoving bars.
4. **[RESOLVED]** **Briefing hint placement** — shared Briefing for all couriers.
5. **[RESOLVED]** **Fantastical Routes** — a normal setting, **Off the Map**, OFF by default and ON by default in Sylly Mode. Name settled as **Off the Map**, with a **"GPS Signal Lost…"** banner on fantastical Routes. *Still open:* the share of fantastical Routes when ON (assumed about 1 in 4; a content-round tune).
6. **[RESOLVED in principle]** **Pop-culture names** — real names only if there is no IP concern, otherwise generic or folklore, swappable in data. *Still open:* a per-name sign-off before any trademarked name ships.
7. **[RESOLVED]** **Gear Ratio** — hidden background calculation (5 ÷ Runs), never shown.
8. **[RESOLVED]** **Hidden Range factor** — not added.
9. **[NON-BLOCKER]** **Sylly design checks** — no Stamps in Sylly Mode; Sylly at 3 players; whether Hands off becomes too attractive for loose couriers; stacking behaviour at 7–8 players; the Spin-out and Back on Course banner thresholds (**untested**; proposed 3,000 km swing, left as is for now).
10. **[NON-BLOCKER]** **Time Dial details** — whether seconds appear, the multiplier chips for cosmic answers, and the compound-entry flow.
11. **[NON-BLOCKER]** **Stall countdown length** (assumed 30 seconds).
12. **[NON-BLOCKER]** **Run and Shift length** — validate the stopwatch estimates in real play. Sylly defaults to a Standard Shift (about 21 minutes); the Long Sylly Shift (about 29 minutes) is the one to watch.
13. **[NON-BLOCKER]** **Brand colour audit** against Hot Streak's ember and Honeycomb Hills' amber.
