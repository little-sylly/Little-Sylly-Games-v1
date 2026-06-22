# New Game Brief — ETA?
**Document type:** Phase 1 — Design Brief (non-technical)
**Who fills this in:** Project owner + AI, before any technical work
**What happens next:** Once complete, hand to Claude Code alongside `new-game-technical-template.md`. Claude Code reads this brief, reads the rule files, fills in the technical template, and presents it for confirmation before writing a single line of game code.

---

> **Status:** The **original** game of the batch — built on estimation + social voting (cousins: Wits & Wagers, and the suite's own judge-and-vote games). The three hard problems are now resolved: the **distance prompts** (curated, universally-recognised landmarks in scale tiers), the **scoring** (votes score; a benchmark "Reality Check" is comedy-only), and the **input friction** (Verbal Defense — the phone takes only a number, players pitch their reasoning out loud). All structural calls are made and baked in (see the §12 Decisions Log). Open items are a designed-but-unconfirmed **Sylly Mode**, the **content build** (the distance set), and playtest tuning. Review-ready.

---

## 1. Identity (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Full game name** | **ETA?** |
| **Short nickname / abbreviation** | `eta` (confirmed not in taken list: li5, gm, ss, jec, ygi, lttp, nat, dsd, gth, dyb, bld, pass, nt, frt) |
| **One-sentence tagline** | "Skateboard to the Moon? Show your working." |
| **Thematic universe** | A chaotic **delivery dispatch office**. Every player is a courier assigned a wildly inappropriate vehicle, radioing in an estimated time of arrival over some famous distance. The depot (the whole table) decides whose ETA they actually believe. Rideshare-rating energy — your reputation is measured in Stars. |
| **Emoji / icon** | 🛵 *(alt: ⏱️)* |
| **Brand colour preference** | Dispatch amber-orange (courier hi-vis) **or** a GPS-navigation blue. *(Custom `pill-active-eta` likely needed. Flag for the audit: confirm distinct from Hot Streak's ember and any existing blue.)* |

**The core fun:** the comparison and the justification. A helicopter ETA of "5 hours" sitting next to a pogo stick's "4 days" on the same chart — and then the pogo-stick driver *standing up to defend it*. The arguing over assumptions ("a rocket needs launch prep", "the trolley has one wonky wheel") is the whole game.

---

## 2. The Players (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Player count range** | **3–8** |
| **Teams or individuals?** | Individuals — everyone is a courier every Run. |
| **Are there different roles?** | No fixed roles, no judge — **everyone drives, everyone votes** every Run. Keeps all players active the whole time. |
| **Is any information hidden from some players?** | Yes, briefly: your assigned **Ride** (vehicle) and your typed **ETA** are private until the simultaneous reveal, and your **vote** is a secret ballot. Nothing is hidden long-term. |
| **Minimum meaningful player count** | 3 (you need a spread of vehicles to compare and votes to spend). Sweet spot **4–6**. |

### Roles (if applicable)
No asymmetric roles. Every player privately receives a vehicle, privately submits an ETA, defends it out loud, and casts one secret vote. The only constraint: **you can't vote for yourself.**

---

## 3. The Core Loop (REQUIRED)

**In one sentence — what does a player DO on their turn?**
There are no individual turns — simultaneously, each player privately reads their assigned vehicle, estimates how long *it* would take to cover the shared distance, submits a single number, then defends that estimate out loud before everyone votes on whose ETA they most believe.

**What is the central tension or fun moment?**
The **Verbal Defense**. The chart reveals everyone's ETA at once, sorted fastest to slowest, and each driver has to stand up and pitch their ridiculous reasoning to the room. The phone handles the maths, the chart, and the ballot — the *players* supply the comedy. Then the **Reality Check** footer tells everyone how wrong they all were.

**What type of game is this closest to?**
☑ Creative / lateral thinking (estimation + persuasion + social voting)

**Walk through one complete Run, step by step:**

1. **The Route** is revealed to everyone — a famous distance, e.g. *"The Length of Italy (~1,200 km)."*
2. **Assignment:** each player privately sees their **Ride** for this Run — a different vehicle each (Pogo Stick, Helicopter, Shopping Trolley, Rocket…).
3. **Submission:** each player privately picks a time unit (Minutes / Hours / Days / Years) and types one number, then submits. The game waits for all drivers (a ready check).
4. **The Dispatch Board:** all screens reveal a horizontal bar chart plotting every driver's ETA, fastest to slowest, each labelled with its vehicle.
5. **Pitch & Vote:** going round the room, each driver verbally defends their ETA out loud. Then everyone casts one secret ballot for the most convincing / best-argued ETA (not their own).
6. **The Reality Check:** the game reveals each vehicle's rough true ETA as a comedy footer — *"A pogo stick at 4 km/h, bouncing non-stop, would take about 12.5 days. You lot are dreaming."* — scoring nothing. **Stars** are then awarded from the votes.
7. Next Run: a new Route, new Rides, repeat. Most Stars at End of Shift wins.

**Simultaneous or sequential?**
Estimation is **simultaneous** (everyone submits privately, ready check resolves the reveal). The verbal pitch goes round the room. Voting is **simultaneous** (secret ballot, ready check).

**How does the phone move between players?**
Each player has their own device (individual devices — see §10). The private vehicle assignment, private number entry, and secret ballot all want a personal screen. **Verbal Defense means almost zero typing** — the phone is just for the number and the vote; the reasoning is spoken, so this is a same-room couch game by design.

---

## 4. Winning (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **How does a game end?** | At **End of Shift** — after a set number of Runs (the Shift Length setting). |
| **How is the winner determined?** | Most **Stars** wins — crowned **Driver of the Month**. |
| **Are ties possible?** | Yes — broken by who collected the most votes in a single Run across the game; if still tied, a one-Run sudden-death tie-break. |
| **Roughly how long should a full game take?** | ~10–20 minutes (≈1–2 minutes per Run, plus banter). |

---

## 5. Scoring (REQUIRED)

The currency is **Stars ⭐** (your courier rating). Scoring is **Option C** — votes are the only scorer; the benchmark is comedy.

| What happened | Who gets it | How many | Notes |
|--------------|------------|----------|-------|
| Your ETA receives a vote | The voted driver | **+2 Stars per vote** | The core scorer |
| **Underdog Bonus** — you were given a genuinely slow/absurd Ride and still earned at least one vote | That driver | **+1 bonus Star** | Rewards selling a hard vehicle (the pogo-stick hero) |
| The Reality Check benchmark | Nobody | **0** | Pure comedy footer — creative assumptions are never "wrong" |

**Does scoring feel balanced?**
Votes-only keeps creative assumptions from ever being "wrong answers" — the *justification* is the game, not accuracy. The Underdog Bonus stops fast/obvious vehicles (rocket, jet) from dominating and rewards the player dealt a shopping trolley who argues brilliantly. The benchmark satisfies the "but what's the real answer?" itch without punishing imagination.

**Any outcomes where nobody scores?**
A Run where the votes split evenly still pays the voted drivers; only a driver who receives zero votes scores nothing that Run.

---

## 6. Settings (REQUIRED)

| Setting name | What does it change? | Options | Default |
|--------------|---------------------|---------|---------|
| **Dispatch Range** *(the difficulty/complexity dial — sits first)* | Which distance tiers come up. Local = Tier 1 human-scale (easy to reason about); Mixed = all tiers; Cosmic = Tier 3 astronomical (hardest, silliest). | Local / Mixed / Cosmic | **Mixed** |
| **Shift Length** | How many Runs before End of Shift. | Short / Standard / Long | **Standard** |
| **Underdog Bonus** | Whether a slow/absurd Ride that still earns votes gets the +1 bonus Star. | Off / On | **On** |
| **✨ Sylly Mode (Hazard Pay)** | See §7. | OFF / ON | OFF |

**Player count** (3–8) is set on the setup screen / from the lobby roster, not in the settings overlay.

---

## 7. Sylly Mode (if applicable)

| Field | Your answer |
|-------|-------------|
| **Thematic name** | **Hazard Pay ⚠️** |
| **In one sentence — what changes?** | Each driver secretly draws a **Road Condition** they must factor into their ETA and work into their pitch — *Flat Tyre* (much slower), *Tailwind* (faster), *Carrying a Piano* (awkward), *Police Chase* (recklessly fast), *Scenic Route* (sightseeing detours). |
| **Does it add new screens or phases?** | No new phase — one extra private card on the assignment screen (your Ride **plus** your hazard). |
| **Does it change scoring?** | No — still votes-only, plus the existing Underdog Bonus. |
| **Does it change the win condition?** | No. |

*Why this Sylly:* it extends the estimate-and-defend core exactly — a hidden constraint that supercharges the verbal pitch ("I'd be there in an hour, but I'm carrying a piano, so…") without changing the structure. **Alternative considered (parked):** *"Wrong Number"* — the vote inverts to reward the *least* believable, most deranged ETA. Fun, but it fights the game's "sell your reasoning" instinct, so Hazard Pay is the recommended pick.

---

## 8. Thematic Vocabulary (REQUIRED)

| Generic term | What ETA? calls it |
|---|---|
| Round | **Run** (one delivery run: a Route, Rides, pitches, a vote) |
| Score / points | **Stars ⭐** (your courier rating) |
| The distance prompt | **The Route** |
| Your assigned vehicle | **Your Ride** |
| Your estimate | **Your ETA** |
| The chart reveal | **The Dispatch Board** |
| The benchmark fun-fact | **The Reality Check** |
| Game over screen | **End of Shift 🏁** |
| Winner | **Driver of the Month** |
| Play again | **Next Shift?** |
| Quit | **Clock Out?** |
| Settings overlay title | **The Dispatch Desk 📋** |

---

## 9. Word Bank & Content (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Does this game use `words.json`?** | Partly — vehicle **names** can draw on the existing `vehicles` category, but ETA? needs an **assumed speed** per vehicle for the Reality Check, which `words.json` doesn't carry. |
| **If no — what content does it need?** | A new data file, **`data/eta-data.json`**, holding two sets: (a) **Routes** — `{ id, reference, km, tier }`, ~40–60 famous distances across three tiers; (b) a curated **Rides** list — `{ name, kmh }` — so the benchmark ETA (`km ÷ kmh`) and the Underdog Bonus (slow-vehicle test) can be computed. |
| **Does it need a completely new data file?** | Yes — `data/eta-data.json` (plus a `docs/eta-content-guide.md`, modelled on the ygi guide). |
| **Any words/topics to exclude?** | Distances must be **universally recognisable** (a marathon, Earth-to-the-Moon) — never local/obscure ("Chapel Hill to Indro"). That legibility is the whole design principle. |

**Example Route entry (plain English):** *"The Length of Italy" — reference shown to players as the headline, with ~1,200 km stored for the benchmark maths, tagged Tier 2 (Geographic).*

**Example Ride entry:** *Pogo Stick — assumed continuous speed ~4 km/h. Used only for the comedy Reality Check and the Underdog test; never to score the vote.*

### The Route set — full starter list (54 Routes)

These are the actual content entries, organised by the three Dispatch Range tiers. The **reference** is the headline shown to players; the **km** is stored for the Reality Check maths; **tier** drives the Dispatch Range setting. All distances are approximate by design (the benchmark is comedy, not a scorer). This is the real content shape — expandable forever, but already enough to ship.

**Tier 1 — Human-scale (18) — relatable, everyday, you can picture it**

| Reference | km |
|---|---|
| The length of an Olympic swimming pool | 0.05 |
| The height of the Eiffel Tower | 0.33 |
| One lap of a standard running track | 0.4 |
| The height of the Burj Khalifa | 0.83 |
| The length of a football pitch | 0.1 |
| One lap of the Monaco F1 circuit | 3.3 |
| The length of the Golden Gate Bridge | 2.7 |
| A 5 km parkrun | 5 |
| The depth of the deepest mine on Earth | 4 |
| The height of Mount Everest, base to peak | 8.8 |
| The depth of the Mariana Trench | 10.9 |
| Across the Grand Canyon (rim to rim) | 29 |
| The English Channel swim | 34 |
| A full marathon | 42.2 |
| The length of the Channel Tunnel | 50 |
| The length of the Panama Canal | 82 |
| The length of the Suez Canal | 193 |
| Up to the edge of space (the Kármán line) | 100 |

**Tier 2 — Geographic (20) — big, but graspable**

| Reference | km |
|---|---|
| London to Paris | 340 |
| The altitude of the International Space Station | 400 |
| Sydney to Melbourne | 880 |
| The length of Italy, top to toe | 1,200 |
| Land's End to John o'Groats (the length of Britain) | 1,400 |
| Width of Australia (Perth to Brisbane) | 3,600 |
| Route 66 (Chicago to LA) | 3,940 |
| Coast to coast across America | 4,500 |
| The length of the Amazon River | 6,400 |
| The Nile, source to sea | 6,650 |
| The Trans-Siberian Railway | 9,289 |
| The Great Wall of China, end to end | 21,000 |
| Once around the Earth (the equator) | 40,075 |
| New York to Sydney | 16,000 |
| The length of the Pan-American Highway | 30,000 |
| Cairo to Cape Town | 7,200 |
| Lisbon to Vladivostok (across Eurasia) | 13,000 |
| The total length of the London Underground track | 400 |
| The combined length of the Great Barrier Reef | 2,300 |
| The coastline of Great Britain | 12,400 |

**Tier 3 — Astronomical & absurd (16) — the comedy tier**

| Reference | km |
|---|---|
| Up to a cruising aeroplane (~11 km altitude) | 11 |
| Earth to the edge of the atmosphere | 100 |
| Geostationary orbit (where the big satellites live) | 35,786 |
| Earth to the Moon | 384,400 |
| The diameter of the Sun | 1,390,000 |
| Earth to Venus at closest approach | 41,000,000 |
| Earth to Mars at closest approach | 54,600,000 |
| Earth to the Sun | 149,600,000 |
| Earth to Jupiter at closest approach | 588,000,000 |
| Earth to Saturn at closest approach | 1,200,000,000 |
| Earth to Pluto (average) | 5,900,000,000 |
| One full lap around Saturn's rings | 1,170,000 |
| Earth to Voyager 1 (the furthest human-made object) | 24,000,000,000 |
| Across our solar system (to the heliopause) | 18,000,000,000 |
| Earth to Proxima Centauri (the nearest star) | 40,000,000,000,000 |
| One light-year | 9,460,000,000,000 |

That's **54 Routes** (18 / 20 / 16). Comfortably inside the 40–60 target, with obvious room to grow (more city pairs, rivers, landmarks, planets).

### The Rides set — curated vehicles with assumed speeds (24)

Each Ride carries an **assumed continuous speed** purely for the Reality Check and the Underdog test — never to score the vote. Speeds are deliberately rough-and-cheeky. The spread (from a snail to a spacecraft) is what makes the comparison funny, so assignment should pull a varied mix each Run.

| Ride | ~km/h | Underdog? |
|---|---|---|
| Garden snail | 0.05 | ✓ |
| Walking | 5 | ✓ |
| Pogo stick | 4 | ✓ |
| Shopping trolley | 6 | ✓ |
| Space hopper | 7 | ✓ |
| Skateboard | 15 | ✓ |
| Jogging | 10 | ✓ |
| Bicycle | 25 | ✓ |
| Horse (sustained) | 30 | ✓ |
| Ride-on lawnmower | 12 | ✓ |
| Mobility scooter | 12 | ✓ |
| Canoe | 8 | ✓ |
| Hot air balloon | 30 | ✓ |
| Tuk-tuk | 45 | — |
| Milk float | 25 | ✓ |
| Family car | 100 | — |
| Speedboat | 70 | — |
| Helicopter | 250 | — |
| High-speed train | 300 | — |
| Passenger jet | 900 | — |
| Fighter jet | 2,400 | — |
| Rocket | 28,000 | — |
| Spacecraft (deep-space probe) | 60,000 | — |
| Lightning bolt (because someone will argue it) | 440,000 | — |

The "Underdog?" flag is illustrative — in practice it's derived from a speed threshold (the §12 tuning value), not stored per Ride. ~24 Rides is plenty: with 8 players needing distinct vehicles per Run, this gives a deep, varied pool.

---

## 10. Multiplayer Classification (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Own device or shared device?** | **Individual devices** — private vehicle assignment, private number entry, and a secret ballot all want a personal screen. |
| **Any information private to one device?** | Yes (briefly): your Ride, your typed ETA, and your vote — each revealed/tallied at the right moment. |
| **Are there moments players act simultaneously?** | Yes — estimation is simultaneous (ready check), and voting is simultaneous (ready check). |
| **Is one device locked while another is active?** | No per-player locking — the locking is per-phase (estimate phase, then the shared Dispatch Board, then the vote phase). The verbal pitch happens off-device. |
| **Anything that doesn't work with multiple devices?** | Pass-the-phone is awkward here (private vehicle + secret ballot need pass-gates), and Verbal Defense already assumes a same-room table. **Individual devices recommended as the only mode for v1.** |

**Profile:** simultaneous-input with a `readyCheck` matrix for both the estimate and the vote phases, host-authoritative resolution — the same structural pattern as the suite's other simultaneous party games. No targeted writes needed (the only "private" data is each player's own assignment, which their own device renders).

---

## 11. Screens — Plain English List (REQUIRED)

1. **Game menu** — hub, Play, settings, how-to.
2. **Lobby / setup** — player names (3–8).
3. **The Route reveal** — the shared distance headline (*"The Length of Italy (~1,200 km)"*).
4. **Your Ride + ETA entry** — private: your vehicle (plus a hazard in Sylly Mode), a unit picker (Minutes / Hours / Days / Years), a number field, submit. Shows a "waiting for drivers" ready state.
5. **The Dispatch Board** — the horizontal bar chart, all ETAs fastest-to-slowest, vehicles labelled. (Verbal pitches happen here, off-device.)
6. **Pitch & Vote** — the secret ballot: pick the most convincing driver (self disabled). Ready check.
7. **The Reality Check + Stars** — per-driver benchmark comedy footer, then Stars awarded from votes.
8. **End of Shift (game over)** — final Star standings, Driver of the Month, Next Shift? / exit.

*Standard overlays:* settings (The Dispatch Desk 📋), how-to, quit (Clock Out?), play-again (Next Shift?).

---

## 12. Open Questions & Design Notes (REQUIRED)

### Decisions Log — calls made for your review (override any on review)
- **Input model:** Verbal Defense — the phone captures only a number + unit; reasoning is spoken. No free-text capture (keeps rounds snappy; banter is the asset).
- **Scoring:** Option C — **+2 Stars per vote**, votes-only; the benchmark Reality Check scores nothing.
- **Underdog Bonus:** ON by default — a slow/absurd Ride that still earns a vote gets +1 Star.
- **No judge role:** everyone drives and everyone votes every Run; no self-voting.
- **Vote format:** single secret pick (not a ranking) — simpler and faster.
- **Different Rides each Run:** every player gets a distinct vehicle, deliberately spread across fast/slow for comedy and to make the Underdog Bonus meaningful.
- **Content:** new `data/eta-data.json` with Routes (`id, reference, km, tier`) **and** a curated Rides list with assumed speeds (`name, kmh`); plus a `docs/eta-content-guide.md`.
- **Multiplayer:** individual devices only for v1 (pass-the-phone out of scope).
- **Difficulty dial:** Dispatch Range (Local / Mixed / Cosmic), default Mixed.

### Still genuinely open
- **Sylly Mode** — *Hazard Pay* is designed and recommended, but unconfirmed; confirm or swap for the parked *Wrong Number* idea. *(NON-BLOCKER.)*
- **Playtest tuning** — Stars-per-vote value, Underdog Bonus size + the speed threshold that defines "slow", and Shift Length round counts. *(NON-BLOCKER.)*
- **Content volume** — a starter set of **54 Routes and 24 Rides (with speeds) is now drafted in §9** and ready to drop into `data/eta-data.json`. Remaining work is review/curation (trim, swap, regionalise to taste) and growing it over time, plus the content guide. *(NON-BLOCKER — the well is already proven.)*

### Flag for Claude Code (technical)
- **Chart axis scale** — ETAs span minutes to years (a helicopter at 5 hours beside a pogo stick at months). The Dispatch Board almost certainly needs a **log scale** or smart bucketing so both tiny and enormous ETAs stay legible on one axis. This is the trickiest piece of the build.
- **Unit normalisation** — all ETAs must convert to a common internal unit (e.g. seconds) for sorting and charting; the entry keeps the player's chosen display unit.
- **Duration formatter** — the Reality Check needs `km ÷ kmh` formatted into human-readable durations ("about 12.5 days", "~4.8 hours").
- **Ride assignment** — curate per-Run for a fast/slow spread rather than pure random; ensure no two players get near-identical vehicles in a Run.
- **Input validation** — positive numbers only, sane upper caps, graceful handling of empty/zero entries.

### Out of scope for v1
- Pass-the-phone mode.
- Free-text assumption capture (deliberately replaced by Verbal Defense).
- Benchmark-based scoring (the benchmark is comedy only).

**General note:** the game lives or dies on the *spread* and the *banter*. Protect both — keep entry near-instant, make the Dispatch Board's visual gag (a rocket next to a trolley) land, and let the Reality Check be funny, not a scold.

---

## 13. Mood & References (if applicable)

| Field | Your answer |
|-------|-------------|
| **Real-world games this is most similar to** | Wits & Wagers (estimation), plus the suite's own guess-and-judge games. The "defend your absurd answer out loud" energy of Balderdash. |
| **Tone** | Fast, loud, argumentative, warm. The comedy of scale (a pogo stick to the Moon) plus the comedy of conviction (defending it with a straight face). |
| **Should NOT feel like** | A maths quiz or a slow typing exercise. There's no "correct" answer to chase and no essays to write — it's a number, a pitch, and a vote. |
| **Example phrases / copy already written** | "Skateboard to the Moon? Show your working." · "A pogo stick at 4 km/h, bouncing non-stop, would take about 12.5 days. You lot are dreaming." · Stars · the Route · your Ride · the Dispatch Board · the Reality Check · End of Shift · Driver of the Month. |

---

## 14. Sample Round (REQUIRED)

**Setup:** 4 players — **Ada, Boris, Chloe, Dev**. Dispatch Range Mixed, Underdog Bonus ON. **The Route:** *"The Length of Italy (~1,200 km)."*

**Rides (each private until reveal):** Ada — Helicopter · Boris — Pogo Stick · Chloe — Shopping Trolley · Dev — Rocket.

1. Each driver privately submits an ETA:
   - **Ada (Helicopter):** 5 hours
   - **Boris (Pogo Stick):** 4 days
   - **Chloe (Shopping Trolley):** 3 weeks
   - **Dev (Rocket):** 20 minutes
2. **The Dispatch Board** reveals all four, fastest to slowest: Dev (20 min) → Ada (5 h) → Boris (4 days) → Chloe (3 weeks).
3. **Pitch & Vote (verbal):** Dev insists the rocket does it in 20 minutes flat "once we're airborne." Boris passionately defends 4 days of non-stop bouncing — *"no bathroom breaks."* Chloe leans into the trolley's one wonky wheel adding a clear week. Ada calmly points out a helicopter genuinely would take about five hours.
4. **Secret ballots (no self-votes):** Boris's pogo-stick pitch is the table favourite → 2 votes (Ada, Dev). Ada's grounded helicopter → 1 vote (Chloe). Chloe → 1 vote (Boris). Dev → 0.
5. **Stars:** +2 per vote → Boris +4, Ada +2, Chloe +2, Dev 0. **Underdog Bonus:** Boris sold a genuinely slow Ride (pogo stick) and got votes → **+1**. Boris earns **5 Stars** this Run.
6. **The Reality Check:** *"Pogo stick at 4 km/h: ~12.5 days — Boris, you're dreaming."* / *"Helicopter at 250 km/h: ~4.8 hours — Ada nailed it."* (scores nothing).

**Result:** Boris leads with **5 Stars** after Run 1. New Route, new Rides, on to Run 2.

---

## Open Questions

1. **[NON-BLOCKER]** Confirm **Hazard Pay** as the Sylly Mode (designed and recommended), or swap for the parked *Wrong Number* inversion.
2. **[NON-BLOCKER]** Content review — a 54-Route + 24-Ride starter set is drafted in §9; needs your curation pass (trim/swap/regionalise) and a content guide before it's final.
3. **[NON-BLOCKER]** Playtest tuning — Stars-per-vote, Underdog Bonus size + the "slow vehicle" speed threshold, and Shift Length counts.

*No BLOCKERs. The core loop, input model, scoring, voting, content structure, settings, and multiplayer profile are all resolved and recorded in the §12 Decisions Log. The remaining work is the content build and confirming the Sylly pick — neither blocks the technical spec.*
