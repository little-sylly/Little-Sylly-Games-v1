# ETA? — Handoff for the Content Rebuild and Dispatch Board Mockups

**Written:** 10 October 2026, end of brainstorming round 1 (review, 21-section brief, maths).
**Purpose:** start a fresh session with everything needed to rebuild the content set and design the Dispatch Board, without re-deriving anything.
**Owner:** Sam (Little Sylly Games; non-coder; Brisbane, Australian English).

---

## 1. Attach these to the new session

| File | Why |
|---|---|
| `new-game-brief-eta-v3.md` | The source of truth for the game (21-section template). Read it first, fully |
| `eta-maths-round-1.md` | Scoring numbers and the reasoning behind them |
| `eta_sim.py` | Simulation script (only needed if the numbers are revisited) |
| **`words.json`** | The shared word bank. **Needed for the content rebuild.** Not in this session; Sam must attach it |
| The old ETA content (the 54 Routes and 24 Rides from the original brief, `new-game-brief-eta-5f0252e0.md`) | To pull across whatever still works |
| `new-game-brief-prompt.md` (template) | Only if the brief structure needs checking |

The previous session's files are not carried over, so everything above must be re-attached. The memory file `/areas/eta-game.md` holds the decisions in short form.

---

## 2. Where we are

- **Settled:** core loop, vocabulary, Sylly Mode (Backseat Drivers) structure, settings, scoring numbers (first pass), rank ladder.
- **Not started:** the **content set** (Routes, Rides, Briefing lines) and the **Dispatch Board mockups**.
- **Not yet done anywhere:** playtests. Every scoring number rests on *assumed* player behaviour (see §6).

### One-paragraph game summary
Couriers (3–8, own phones, same room) each get a secret **Ride** and estimate the time to cover a shared **Route** distance. Estimates (**Logged ETAs**) go on the **Dispatch Board**; the table argues (**Radio Defense**) and gives one **Stamp of Approval** for the best pitch (Standard) or applies secret **Course Corrections** to each other's ETAs (Sylly Mode). **Proof of Delivery** reveals the true ETA. Accuracy pays most (up to 40,000 km **Mileage**). Highest total on the **Odometer** after the **Shift** (3 / 5 / 7 Runs) is **Courier of the Month**. Ranks are per-Shift flair only.

---

## 3. Decisions that constrain the next work (all settled)

- **Ride speed is hidden** until Proof of Delivery. Players estimate from their Ride's name and the Briefing alone.
- **Briefing is shared** by everyone (hints for Unregistered Rides included; knowing someone else's Ride doesn't change your own estimate).
- **Unregistered Rides** (fantastical or pop-culture vehicles) exist in **Sylly Mode only** and pay flat Hazard Pay (4,000 km). Each needs a fair, slightly buried **Briefing hint** telling a sharp reader which speed to use. Examples already agreed: *"No time travelling during delivery hours"* (time machine uses normal speed), *"New and faster species of large eagles sighted along the route — be cautious"* (giant eagle), *"Wind speeds perfect for a gentle ride"* (flying carpet uses **cruising** speed, not its much higher maximum).
- **Rides can have more than one speed** (cruising and maximum). Briefing assumptions pick the benchmark: *"No speed limit"* selects a maximum, *"60 km/h limit"* caps it, *"Ultra tyres fitted to all vehicles"* removes rough-terrain slowdowns.
- **Off the Map** is a settings toggle for fantastical **Routes** (mythical, folklore, made-up places with a game-defined distance). OFF by default; **ON by default when Sylly Mode is on**. It affects Routes only, not Rides. A **"📡 GPS Signal Lost…"** banner opens the Briefing when one appears. Assumed share when ON: about 1 Route in 4 (tune in the content round).
- **Naming/IP policy (not legal advice):** real pop-culture names only where there is no IP concern; otherwise generic or folklore descriptions ("a time-travelling sports car", "a giant eagle", Atlantis, Wonderland, Oz, Olympus, Asgard). Folklore, myth and public-domain sources are the safe default. All names live in data and must be swappable without code changes. Any trademarked name needs a deliberate sign-off.
- **Gear Ratio is hidden** (5 ÷ Runs; never shown to players). **No hidden Range factor.**
- **Dispatch Range** setting: Local / Mixed / Cosmic filters which Route tiers appear (Cosmic is hardest and silliest).
- **GPS** setting: ON shows the Route's distance; OFF shows the headline only, so couriers must also estimate the distance.
- Vocabulary is fixed (see §9 of the brief). Retired terms (do not use): Stars, Driver of the Month, Fleet Legend, Underdog Bonus, Backup Support, Backup Bonus, Scout Score, Mods, Rig.
- Brief rules: **no code or technical terms** in the brief itself; **Australian English**; metric only (km, never miles).

---

## 4. Task A — Rebuild the content set

### 4.1 What to produce
A dedicated ETA content set (Routes, Rides, Briefing lines) plus a **content guide document** for adding more. Start from `words.json`, pulling across whatever works from the old 54-Route / 24-Ride set. Deliver in a form Sam can review (a table or spreadsheet) and that a developer can load as data later; **do not write game code**.

### 4.2 What each part holds (from brief §10)
- **A Route:** headline players see · distance in km · tier (Local / Geographic / Astronomical, which Dispatch Range filters on) · short flavour line · the **assumptions** that apply (corridor type: ground, air, water or space; any speed limit) · optional **Off the Map** flag (fantastical Routes carry a stated, game-defined distance).
- **A Ride:** name and emoji · **tier** (speed band) · one or more **speeds** (always a cruising speed; some also a maximum) · one-sentence **reveal line** for Proof of Delivery · Unregistered flag. Unregistered Rides also carry their **Briefing hint**.
- **A Briefing line:** a reusable assumption sentence tied to a corridor type or speed choice.

### 4.3 Ground rules for the "truth" (every stored number is a graded answer)
1. Universal: constant speed, no stops, rest, fuel or traffic, unless a Briefing line says otherwise.
2. Every Route carries a **corridor assumption**, so impossible pairings (a snail to Mars) become answerable.
3. Every Ride has a **finite, positive speed**. No teleporting, no time travel (a time machine uses its ordinary driving speed and the Briefing says so).
4. **Vertical Routes** (Everest, the Mariana Trench) need an explicit Briefing line so a skateboard isn't expected to climb.
5. **The game's number is final.** The reveal line states what was assumed, so disputes end at the screen.
6. Distances must be **universally recognisable** (a marathon, Earth to the Moon). Drop over-specific Routes ("Route 66", "New York to Sydney"); keep general ones ("Width of Australia").

### 4.4 Pairing rules
- Rides sit in **speed tiers**. Working guess: Crawl & Foot · Pedal & Pootle · Road · Rail & Rotor · Sky & Beyond · plus the Unregistered group. Tier names and band edges are part of this job.
- A Ride may only be paired with a Route if the **true ETA lands inside an answerable window**: roughly a couple of minutes up to some thousands of years (bounds to tune). This stops a rocket across a swimming pool and a walker to the nearest star.
- Each Run draws Rides **for spread across fast and slow**, with no two near-identical vehicles in the same Run.
- Each **Route needs at least eight eligible Rides spanning at least three tiers** (8 couriers is the maximum table).
- A Route never repeats within a Shift; a courier doesn't get the same Ride twice in a Shift.

### 4.5 Known defects in the old set (fix in the rebuild)
- 100 km appears twice (the Kármán line and the edge of the atmosphere).
- Some entries sit in the wrong tier (Suez Canal as "human-scale"; a cruising aeroplane's altitude as "astronomical").
- Several Routes are really vertical distances and need Briefing assumptions.
- Pop-culture Rides and Routes need renaming under the IP policy above.

### 4.6 Content that must exist (minimum list to aim for)
- Enough Routes per Dispatch Range tier that a 7-Run Shift never repeats and each tier still has variety. Propose the count and let Sam adjust.
- A **Briefing line library** (corridor types, speed choices, vertical-route lines, Unregistered hints).
- An **Unregistered Ride** list with hints, plus **Off the Map** Routes (folklore and public-domain first).
- A **reveal line** and a short **Reality Check** line for every Ride/Route pairing type (these double as comedy copy: "You're dreaming.", "Launch prep not included.").

### 4.7 Checks before handing the content back
- Run every pairing through the answerable window; list any Route with fewer than eight eligible Rides.
- Sanity-check true ETAs by hand for a sample of pairings.
- Confirm no duplicates, tier mistakes or vertical Routes without assumptions.
- Flag every name that might raise an IP question.

---

## 5. Task B — Dispatch Board mockups

### 5.1 What the Board is
The shared chart that shows **everyone's Logged ETA** once all couriers have locked in (this is also the first time Rides become public). It must work through Radio Defense, Course Corrections (Sylly), the Corrections reveal and Proof of Delivery.

### 5.2 Requirements from the brief
- **Readable across a huge range:** answers can span minutes to millions of years. Use a **compressed scale with landmark ticks**, not a literal proportional chart (a log-style axis was the working idea).
- Durations shown in **friendly words** ("about 12.5 days"), including very large ones. All ETAs need one common internal unit for sorting.
- **Phones only, mobile-first**, 3–8 bars. Dispatch amber-orange or GPS-navigation blue brand colour (**colour audit pending** against Hot Streak's ember and Honeycomb Hills' amber).
- **Proof of Delivery:** a **truth marker drops onto every bar** (time-lapse reveal), with the Ride's speed fact and Reality Check line.
- **Sylly Mode:** bars **shove to their Revised ETAs** with the spoken reasons. Spin-out and Back on Course banners. Tapping a bar selects a courier for correction.
- **Course Correction panel** (slide-up): tap a bar, dial on a compressed scale (÷10 to ×10 with marked stops ÷10, ÷5, ÷3, ÷2, ÷1.5, ×1.5, ×2, ×3, ×5, ×10 and free drag), a **ghost bar previews only your own** correction (never anyone else's, never the truth), **Hands off** option, "Recalculating…" until everyone is ready.
- Never leak the truth before Proof of Delivery. The echo-confirm box (Dispatcher's Double-Take) repeats an entry in plain words and **never compares to the truth**.
- Overlay shapes available in the suite: a scrollable slide-up panel and a small centred confirmation box (three or fewer elements). No frozen-controls exception needed.
- A tap-to-skip on the Odometer tally and the Corrections reveal.

### 5.3 Mockups to produce (suggested)
1. Board during Radio Defense (4 and 8 bars; long labels).
2. The same Board with extreme spread (minutes to millions of years) showing the compressed scale and landmarks.
3. Course Correction panel open on a selected bar.
4. Corrections reveal (bars shove; Spin-out banner) and a Back on Course variant.
5. Proof of Delivery: truth marker landing, speed fact, Reality Check.
6. Odometer tally with Promotion fanfare and "next rank in X km" (and the Rank 8 state).
Show options where a choice is open (e.g. scale style, bar vs dot-on-a-line) so Sam can pick.

---

## 6. What to remember about the numbers

All scoring numbers were tuned on **simulated** couriers. The simulated skill levels (sharp ≈ 1.8× off, average ≈ 3×, loose ≈ 6×; 25 / 50 / 25 mix; Cosmic harder, Local easier) and Course Correction habits are **assumptions**. Content decisions (Route difficulty, tier edges, how weird Unregistered Rides get) will shift real player accuracy, so:

- Don't treat the numbers as final. Playtests must **log every Logged ETA against its true ETA (by Dispatch Range), every Stamp, and every Course Correction with its target**, then refit.
- Still **untested**: Spin-out and Back on Course banner thresholds (proposed 3,000 km swing).
- **Run-length** estimates are stopwatch guesses (Standard ≈ 2:50 a Run, Sylly ≈ 4:10 at 5 couriers; a 5-Run Sylly Shift ≈ 21 minutes, slightly over the 10–20 minute target).

---

## 7. Remaining open items (not part of A or B, parked)

- **Brand colour audit** (confirm the chosen colour is distinct from Hot Streak's ember and Honeycomb Hills' amber; amber-orange is the riskier option).
- **Time Dial details:** whether seconds appear, the multiplier chips for cosmic answers, the compound-entry flow.
- **Stall countdown** length (assumed 30 seconds).
- **Share of fantastical Routes** when Off the Map is ON (assumed about 1 in 4).
- **Sylly design checks:** Sylly at 3 players, whether Hands off is too attractive for loose couriers, stacking at 7–8 players.
- **Rank tuning** (Rank 8 at 195,000 km, about 1 in 5 sharp couriers per 5-Run Shift) until real playtests.
- Later stages: technical spec (Claude Code Stage 2), sound design, end-screen and how-to polish.

---

## 8. Suggested opening message for the new session

> I'm continuing work on **ETA?** (game 22 of Little Sylly Games). I've attached the handoff, the v3 brief, the maths doc, the shared `words.json` and the old brief's content. Please read the handoff and the brief first. Today I want to do **[Task A: rebuild the content set / Task B: Dispatch Board mockups]**. Start by telling me in a few lines what you've understood and what you need from me before building anything. Don't change any settled decision in §3 of the handoff without asking.
