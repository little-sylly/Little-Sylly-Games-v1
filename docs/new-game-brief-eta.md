# New Game Brief — E.T.A.
**Document type:** Phase 1 — Design Brief (non-technical), **v4**: the v3 brief moved onto the November 2026 template (§0 world first) with Stage 1b complete.
**Supersedes:** `new-game-brief-eta-v3.md` (10 Oct 2026). Every mechanic, setting and scoring number from v3 is carried across unchanged unless §0d names it as changed.
**What happens next:** Stage 2 — Claude Code fills in `new-game-technical-template.md` from this brief, the picked board (`boards/depot-directions/`) and the Stage 2 appendix at the end, then presents the spec for confirmation. **No game code before the owner confirms the spec.**

## Status

| Field | Answer |
|---|---|
| **Draft number and date** | v4 — 10 November 2026 (Stage 1b session) |
| **Locked** | Name **E.T.A.** *(was ETA?)*, abbreviation `eta`, emoji 🛵. The world: **E.T.A. Couriers — "Every Thing, Anywhere."** (motto line "*Eventually.*"). Narrator **Dotty, Head of Dispatch**. Brand colour **hi-vis safety orange** (§1, §11). Direction **1 · Clipboard** (§0d). Rank ladder (§6). *Talk Me Through It* and *The Run Sheet* (§9) |
| **Stage 1b** | **Picked** — direction 1, Clipboard. Canvas: "ETA? Depot Directions" (https://claude.ai/artifact/XbRGjGcNHhoE9HkfPWhd8W); board files in `boards/depot-directions/` |
| **Soft-locked** | Scoring numbers (maths round 1, `[MATHS]`); Ride **mode badges** replacing emoji as the Ride marker (§10, §11); *Dotty's Double-Take* (§9); Practice form = Arena (§24); controls shade `#EA580C` pending the contrast check (§11) |
| **Still open** | The content set (Routes, Rides, Briefing lines) — **not rebuilt yet** (§10); Dotty's surname and look beyond the sketch; Time Dial details; stall countdown length; share of Off the Map Routes; Spin-out / Back on Course thresholds (`[UNTESTED]`) |
| **Supersedes an earlier version?** | Yes — v3 (October 2026, 21-section template). v3's mockup round (four reveal boards, 16 Oct) is kept as reference in `boards/reveal-mockups-round1/` |

**Terminology note:** the game is **E.T.A.** — the company's own name, full stops and all (renamed from *ETA?* after playtest round 1, 10 Nov 2026); "ETA" in running text means the estimate. The menu subtitle is the motto: *Every Thing, Anywhere. Eventually.*

The marker key is the template's: `[ASSUMPTION]`, `[CLARIFICATION NEEDED]`, `[PLACEHOLDER]`, `[SOFT-LOCKED]`, `[OPEN FOR BUILD]`, `[MATHS]` / `[UNTESTED]`, `[DEVIATION]`.

---

## 0. The World & the Intro

### 0a. The world

| Field | Answer |
|---|---|
| **The place and the moment** | The loading dock of **E.T.A. Couriers**, a small, overstretched suburban depot, at **6 am on a weekday**. The roller door is going up, the sky is still pink, Dotty is standing on a crate marked FRAGILE with her clipboard, and behind her the shed is full of odd vehicles under tarps — because **every van is already out**. E.T.A. has said yes to every job, including the Moon and Atlantis |
| **Who the players are in it** | **Couriers** on today's shift. Each is handed whatever is left in the back shed (a shopping trolley, a pogo stick, a horse someone dropped off, a rolled-up rug that might fly) and has to tell the customer how long the job will take |
| **The narrator** | **Dotty, Head of Dispatch** *(revised after playtest round 1, 10 Nov 2026 — was Dot, Depot Manager)*. Early forties, upper management rather than the dock floor: navy blazer, white blouse, pencil skirt, heels, a high ponytail with an orange scrunchie, light make-up, the E.T.A. lanyard — no hi-vis. Strict, energetic, tough love; expects the paperwork done properly and says so. Calls people by name, never "love". Short sentences, Aussie worksite English ("righto", "toolbox talk", "chop chop"). She runs the Intro, the job dockets, the Run Sheet and the sign-off |
| **Three mood words** | **Can-do · Paper-trail · Cheeky** |
| **The scene** | Drawn in code. **Intro:** dawn sky, corrugated roller door (E.T.A. logo) that rolls up, the shed behind (tarped shapes, one with hazard tape and "NO REGO", a trolley outline, a pogo stick leaning on the wall), Dotty on her crate. **Action screens:** Dotty's clipboard on a brown desk — a cream sheet with the E.T.A. letterhead, a JOB number box, a hi-vis band, typed fields, the Run Sheet, and a "From Dotty" note at the bottom. Fonts on the board: a stencil face for headings, a typewriter face for fields, a marker face for Dotty's handwriting (the suite's Fredoka stays on every control) |
| **The world's palette** (scene only) | Safety orange `#FF6A13` with a reflective silver stripe (`#D9DEE3`–`#F4F6F8`); clipboard cream `#FFFCF3`; desk/kraft brown `#7A5232`; ink `#22201B`; parcel card `#C99459`; stamp red `#C42A1E` (too fast); carbon blue `#1F4FA6` (too slow); dawn `#1B2A44` → `#E9895A` (Intro only) |
| **The signature moment** | **The hi-vis tape.** Every Logged ETA is drawn as a strip of hi-vis orange tape with a silver reflective stripe; when a bar lands, a **sheen** sweeps across the stripe. Then at Proof of Delivery a **parcel drops** onto the true ETA and squashes, and a **rubber stamp** slams the verdict into the margin |
| **What this world is NOT** | Not **Just Enough Cooks** (a kitchen shift — steel, orders, "New Shift"): ETA is paperwork and vehicles, not food, and its shift words are courier words (Run, Odometer). Not **Like I'm Five** (a teacher with chalk): Dotty is a boss, not a teacher; ink and stamps, never chalk. Not **Great Minds** (which dropped its radio language): no radio, airwaves or frequencies anywhere in ETA (hence *Talk Me Through It*). Not a racing game: vehicles never race; the bars are paperwork filling in (see §0d — the race-style boards were rejected) |

### 0b. The Intro

| Field | Answer |
|---|---|
| **Narrator lines** | 1. "Right, gather round. Toolbox talk." · 2. "Welcome to E.T.A. Every Thing, Anywhere. We say yes to every job." · 3. "Bit of a hiccup: the vans are all out. You're taking whatever's left in the shed." · 4. "Customer wants an ETA. Give 'em a good one." |
| **The brief — default** (Standard Mode) | 1. "You'll get a Ride. Nobody tells you its speed." · 2. "Log your ETA. Closest to the truth earns the most Mileage." · 3. "Then talk me through it. Best pitch gets my stamp." |
| **Brief variants** | **`sylly`** (Backseat Drivers on): 1. "You'll get a Ride — maybe one with no rego. Nobody tells you its speed." · 2. "Log your ETA. Closest to the truth earns the most Mileage." · 3. "Then grab someone's wheel: one secret Course Correction." · *No pass-the-phone variant: ETA is multi-device only (§2).* |
| **The Line-up** | **None** — no teams. The Intro shows a **roll call** instead |
| **Line-up prompt / no-team column** | Roll call heading: **"Sign the timesheet."** Each player's row gets a handwritten signature and a **CLOCKED ON** stamp when they tap Ready. No "no team" column |

The scene for the Intro is board `Intro.dc.html` (§0d). The engine owns the narrator text, brief and Ready controls; the scene is ETA's own (`[OPEN FOR BUILD]`: how much of the clipboard look the engine-owned panel can take — see the revamp lessons' candidate note on engine-owned screens).

### 0c. Mood beats

| Field | Answer |
|---|---|
| **The repeated beat** | **The job docket.** Each Run opens with a new docket sliding onto Dotty's clipboard: **JOB #00NN** (a running number), the Route headline (and distance unless GPS is off), the Dispatch Briefing lines being typed in, and an **URGENT** stamp slamming on. It moves on by itself into the private Ride screen. Off the Map Routes open with the **📡 GPS Signal Lost…** banner across the docket first |
| **Flavour lines** (host picks one) | "Righto, next job." · "Another one's come in. Don't ask how." · "Customer says it's urgent. They all say that." · "Paperwork's the easy bit, love." · "Back of the shed's looking thin. Good luck." · "Sign here, here and… here." |
| **Other moments** | **Run Sheet reveal:** a time-lapse counter types upward (min → hrs → days → years) while hi-vis tape strips unroll, each with the Ride's mode badge riding the end; landmark ticks turn orange as the clock passes them; each strip lands with a thunk and a sheen. **Talk Me Through It:** Dotty's note says "Talk me through it, then." **Proof of Delivery:** a big red **PROOF OF DELIVERY** rubber stamp slams the clipboard (it jolts), then per courier: a parcel drops on the truth, the gap is hatched (red dashed = too fast, blue solid = too slow), the verdict stamp slams into the margin, the Mileage chip writes in, Dotty's note gives the speed fact and a Reality Check line. **Bullseye:** gold star under the parcel, confetti, Dotty signs off ("Received in good order"). **Sylly:** correction chips fly in as **Dotty's red-pen amendments**; a Spin-out stamps **SPIN-OUT** in red, Back on Course stamps **BACK ON COURSE** in blue — both **at Proof of Delivery**, never before (§8). **Promotion:** the courier's new rank is stamped onto their timesheet line. **End of Shift:** the depot's **Courier of the Month** frame on the office wall |

### 0d. The direction

| Field | Answer |
|---|---|
| **Directions canvas** | "ETA? Depot Directions" — https://claude.ai/artifact/XbRGjGcNHhoE9HkfPWhd8W · files in `boards/depot-directions/` (open each `.dc.html` source for exact values) |
| **Picked** | **1 · Clipboard** (`Main.dc.html`), with the Intro board (`Intro.dc.html`) in the same world. Why: it grew out of round 1's board B (Waybill), which the owner picked; paperwork keeps ETA from reading as a racing game (boards A/D) or a sci-fi one (board C). **Owner's change on picking:** keep the **parcel drop** for the truth, and stop relying on emoji for Rides — each Ride's marker is a **mode badge** (Land / Sea / Air / Space; hazard-striped ring for Unregistered) |
| **What it changed in this brief** | **§1** brand colour → hi-vis safety orange; tagline line added; world line. **§9** *Dispatch Board* → **The Run Sheet**; *Radio Defense* → **Talk Me Through It** (clash with Great Minds' retired radio language); *Dispatcher's Double-Take* → **Dotty's Double-Take** `[SOFT-LOCKED]`; rank ladder rewritten (grounded); new terms Job docket, Timesheet, Mode badge. **§6** rank names and flavour lines. **§8** Spin-out / Back on Course banners move to Proof of Delivery. **§10** Rides gain a **mode** field; emoji become optional. **§11** rewritten (palette, primitive, art inventory). **§12** Q8–Q12 added. **§13** Intro, job docket and TV labels added. **§16–§18, §20** re-voiced. **§22–§24** added (template). Mechanics and numbers: **nothing changed** |

### Re-check against the world
- [x] §1 name, tagline, emoji still fit; brand colour set from the world (hi-vis)
- [x] §9 every term re-voiced or deliberately kept; retired terms listed
- [x] §11 scene drawn in code; art inventory lists it
- [x] §12 Q12 / §13: no teams; the Intro's roll call replaces any setup screen
- [x] §17 / §18 written in Dotty's voice

---

## 1. Identity

| Field | Answer |
|---|---|
| **Full game name** | **E.T.A.** — the courier company's name *(was ETA? until playtest round 1)* |
| **Short abbreviation** | `eta` (in the taken list as this game) |
| **One-sentence tagline** | "Skateboard to the Moon? Show your working." |
| **The world in one line** | The 6 am shift at E.T.A. Couriers — *Every Thing, Anywhere. Eventually.* — where the vans are all out and Dotty hands you whatever's left in the shed |
| **Emoji / icon** | 🛵 *(alt considered: 📦)* |
| **Brand colour** | **Hi-vis safety orange** — controls `#EA580C` (orange-600) with white ink; scene art `#FF6A13` with a silver reflective stripe. Locked by the owner (10 Nov 2026). Audit in §11 |
| **Core type** | Estimation + persuasion |
| **The fun moment in 10 words** | A pogo stick to Italy, defended with a straight face, then exposed. |
| **If based on a real game** | Inspired by the estimating of Wits & Wagers and the defending of Balderdash; the accuracy scoring, the Ride/Route pairing and Backseat Drivers are original |
| **Overlap check** | Nearest: You Get It? (social polling) and Just Enough Cooks (hit the sweet spot). Neither asks players to estimate a hidden true value and then argue for it; ETA's score is accuracy against a real number |
| **IP and naming check** | E.T.A. Couriers and Dotty are original. No real courier brand, livery or logo is imitated. Unregistered Rides and Off the Map Routes use generic or folklore names (a giant eagle, a flying carpet, Atlantis); any trademarked name needs a deliberate sign-off and lives in data |

---

## 2. The Players

| Field | Answer |
|---|---|
| **Player count** | **3–8** |
| **Teams or individuals?** | Individuals — everyone is a courier every Run |
| **Roles** | None. No judge, no host-only duties during play. Everyone estimates, pitches and takes part in the social phase every Run |
| **Hidden information** | Briefly: your **Ride** and your **Logged ETA** are private until the Run Sheet reveal; in Sylly Mode your **Course Correction** is also secret until it is revealed. Nothing is hidden long-term |
| **Minimum meaningful count** | 3 (a spread of Rides to compare). Sweet spot **4–6** |

**At 3 players:** each courier has only two possible Course Correction targets in Sylly Mode, so pile-ons are structurally limited. `[ASSUMPTION: Sylly Mode stays available at 3 players; watch this in simulation]`.

**Pass-the-phone is out of scope.** Private Rides, private entry and secret Course Corrections all need a personal screen, and the pitch phase assumes a same-room table.

---

## 3. The Core Loop

**In one sentence — what does a player DO?**
Simultaneously, each courier privately reads their assigned Ride and the shared Dispatch Briefing, estimates how long that Ride would take over the shared Route, and locks in a Logged ETA; then they defend it out loud, take part in the social phase (Standard: give a Stamp; Sylly: apply a Course Correction), and watch the true ETA land.

**Central tension / fun moment:** two beats. First **Talk Me Through It** — a table full of couriers justifying absurd numbers. Then **Proof of Delivery**, where a marker drops onto every bar and everyone finds out who was dreaming.

**Closest game type:** estimation + persuasion (cousins: Wits & Wagers for the estimating, Balderdash for the defending). The accuracy scoring is the new part; the social layer keeps it from becoming a maths quiz.

**One complete Run (Standard Mode):**

1. **Dispatch Briefing.** The Route is revealed to everyone — a headline plus its distance (*"The Length of Italy (~1,200 km)"*), followed by a short **Briefing** of assumptions that make the answer unambiguous (*"A brand-new, perfectly straight, empty corridor has opened end to end. No stops, no traffic."*). With **GPS OFF** the km figure is withheld and only the headline shows.
2. **Assignment.** Each courier privately sees their **Ride** — a different one each. The Ride's speed is **never shown**.
3. **Log your ETA.** Privately, each courier enters one number with a unit (minutes / hours / days / years). A small confirmation box repeats it in plain words (*"4,000 hours — about 167 days. Lock it in?"*) so slips like the wrong unit get caught. The game waits for every courier (ready check).
4. **The Run Sheet.** All Logged ETAs are revealed at once on a shared chart, fastest to slowest, each bar labelled with its Ride.
5. **Talk Me Through It and Stamps.** Couriers pitch their reasoning out loud, in any order, for as long as the table likes. Each courier must give one **Stamp of Approval** to another courier's pitch (never their own) — explicitly for the **Best Pitch**, funny or convincing, with no link to accuracy. A courier can change their Stamp until everyone has locked in one. The phase ends when everyone has stamped.
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
| 1 | Work-Experience Kid | Here for a fortnight. Has already lost a parcel. |
| 2 | Trolley Pusher | Moves the cages. Knows where the good trolley is. |
| 3 | Casual on Call | Turns up when the phone rings. Usually. |
| 4 | Route Regular | Knows every pothole by its first name. |
| 5 | Senior Courier | Gets first pick of the shed. Sometimes. |
| 6 | Leading Hand | Signs other people's paperwork. Loves it. |
| 7 | Shift Supervisor | Has a lanyard. Uses it. |
| 8 | Dotty's Favourite | Gold star on the Run Sheet. Don't tell the others. |

*(Ladder rewritten 10 Nov 2026 to be grounded in the depot; thresholds unchanged.)*

**Thresholds (total Mileage in the Shift):** 1 · 0 | 2 · 25,000 | 3 · 55,000 | 4 · 85,000 | 5 · 115,000 | 6 · 145,000 | 7 · 170,000 | 8 · 195,000. One ladder for every Shift Length and both modes (thanks to the hidden Gear Ratio).

**What that produces:** steps about one average Run apart, so most couriers are promoted after most Runs. Final ranks at a 5-Run Shift: roughly 0% / 1% / 5% / 14% / 27% / 27% / 21% / 6% for ranks 1 to 8. **Rank 8 is for very good play, not impossible:** it needs about 39,000 km a Run on average, and about 1 in 5 sharp couriers and 3 in 10 table winners reach it over a 5-Run Shift, but almost nobody before the final Run. **Mileage keeps accruing after the top rank**, so the Odometer still decides the winner; at Rank 8 the Odometer simply shows the total instead of "next rank in X km". A 5-courier table spans about three ranks. Promotion pace differs by Shift Length: Short Shifts jump about 1.5 ranks a Run, Long Shifts start slower (about 40% promoted after Run 1, about 65% afterwards), and Rank 8 comes up a little more often in Short Shifts than Long ones. `[MATHS: left as is until real playtests]`.

---

## 7. Settings

| Setting | What it changes | Options | Default |
|---|---|---|---|
| **Dispatch Range** *(difficulty — first)* | Which Route tiers come up: **Local** = human-scale, easy to reason about; **Mixed** = all tiers; **Cosmic** = astronomical, hardest and silliest | Local / Mixed / Cosmic | **Mixed** |
| **Shift Length** | Number of Runs before End of Shift | Short (3) / Standard (5) / Long (7) | **Standard** (also the default in Sylly Mode) |
| **GPS** | Whether the Route's distance figure is shown. OFF shows the headline only ("The Length of Italy"), so couriers must also estimate the distance; the Run Sheet then leaks distance information through everyone's ETAs, which is the point | ON / OFF | **ON** |
| **Off the Map** | Lets **fantastical Routes** into the draw: mythical, folklore and made-up places (Atlantis, the Emerald City, the Underworld) with a game-defined distance, alongside the real Routes. Does **not** change which Rides appear. When one comes up, the Briefing opens with a **📡 "GPS Signal Lost…"** banner | ON / OFF | **OFF**. Switches to **ON** when Sylly Mode is turned on, and can still be turned back off |
| **✨ Sylly Mode — Backseat Drivers** *(always last)* | See §8 | OFF / ON | **OFF** |

Player count (3–8) is set from the lobby roster, not in the settings overlay. *Off the Map* sits directly above Sylly Mode; turning Sylly on flips it to ON as a visible default, not a lock. `[ASSUMPTION: when ON, roughly 1 Route in 4 is a fantastical one. Tune in the content round]`. `[ASSUMPTION: the old Underdog Bonus setting is removed and the optional Spec Sheet idea is dropped, because speed is always hidden]`.

---

## 8. Sylly Mode

| Field | Answer |
|---|---|
| **Thematic name** | **Backseat Drivers** *(other candidates: Co-Pilot Chaos, Recalculating…)* |
| **In one sentence — what changes?** | Everyone becomes a backseat driver: after the Run Sheet is revealed, each courier grabs **one other courier's wheel** and applies a secret **Course Correction** (a percentage change to that courier's ETA), and fantastical **Unregistered Rides** join the pool. The *Off the Map* setting defaults to ON alongside it. |
| **New screens or phases?** | Yes. The Stamp phase is replaced by a **Course Correction phase**, and there is a **Corrections reveal** before Proof of Delivery where each bar visibly shoves to its **Revised ETA** with the spoken reasons |
| **Does it change scoring?** | Yes — a separate scoring system (see §6) |
| **Does it change the win condition?** | No — highest Mileage still wins |

### Sylly round flow
Briefing → private Ride → Logged ETA → **Run Sheet** → **Talk Me Through It** (talking, no Stamps) → **Course Corrections** (secret and simultaneous) → **Corrections reveal** (Revised ETAs) → **Proof of Delivery** → **Odometer tally**.

### Course Correction
- Each courier may correct **one** other courier (never themselves) by a chosen percentage, or choose **Hands off**.
- Corrections target whichever courier you think is **furthest off** — but you must also guess what everyone else will do, because corrections multiply. Three couriers each reasonably saying "she's way too low, double it" can turn a miss into a Spin-out.
- Reward scales with improvement, so a big correction on a big miss is a big prize *and* a big risk. A small correction on a small miss is safe and small.
- The corrector pays for overcorrection; the target is protected (Logged ETA only) and receives an **Insurance Payout** for being messed with.
- The input is a dial on a compressed scale (a ÷10 correction and a ×10 correction feel equally large), displayed as a percentage. Tapping a courier's bar on the Run Sheet selects them. See §14.

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

### Banner timing (changed in v4)
Spin-out and Back on Course are judged **against the truth**, so they can only appear at **Proof of Delivery**, after that target's parcel has landed. The Corrections reveal shows only the shoves (Logged ETA → Revised ETA) and the ghosts. Showing a banner earlier would leak the truth. In the clipboard world they are rubber stamps: **SPIN-OUT** (red) and **BACK ON COURSE** (blue).

**Unregistered Rides in the world:** they are the vehicles at the back of the shed with **no rego** — the hazard-striped ring on their mode badge says so.

---

## 9. Thematic Vocabulary

Every term is something Dotty would say on the dock or write on her clipboard.

| Generic term | ETA? calls it | Notes |
|---|---|---|
| Match / game | **Shift** | "Clocking on for a 5-Run Shift." |
| Round | **Run** | "Run 3 of 5." Each Run is one **job docket** |
| Round intro | **Job docket** | JOB #00NN + Route + Briefing + URGENT stamp (§0c) |
| Player | **Courier** | Never "Driver" |
| Score / points | **Mileage** (km) | |
| Score tracker | **The Odometer** | Rolling digits beside the rank |
| Rank | **Rank** (§6) | Per-Shift flair only |
| Rank-up | **Promotion** | Stamped onto the courier's timesheet line |
| Shift-length multiplier | **Gear Ratio** | **Hidden.** Never on screen or in How to Play |
| Distance prompt | **The Route** | |
| Assumptions | **Dispatch Briefing** | Printed on the job docket; includes the Unregistered hints |
| Distance-hiding toggle | **GPS** | |
| Assigned vehicle | **Your Ride** | |
| How a Ride travels | **Mode badge** | Land / Sea / Air / Space; hazard-striped ring = Unregistered `[SOFT-LOCKED]` |
| Fantasy vehicle | **Unregistered Ride** | "No rego — found in the back of the shed" |
| Fantastical Routes toggle | **Off the Map** | Banner: **📡 GPS Signal Lost…** |
| Bonus for an Unregistered Ride | **Hazard Pay** | |
| Your estimate | **Logged ETA** | |
| Unit chips | **The Time Dial** | |
| Entry confirmation box | **Dotty's Double-Take** | "400 years on a skateboard? Lock it in?" `[SOFT-LOCKED]` |
| The chart | **The Run Sheet** | Was *Dispatch Board* |
| Discussion phase | **Talk Me Through It** | Was *Radio Defense* |
| Vote | **Stamp of Approval** | Best Pitch |
| Vote payout | **Depot Tips** | |
| Unanimous vote bonus | **Sweep Bonus** | |
| Sylly action | **Course Correction** | Button **"Grab the Wheel"**; waiting state **"Recalculating…"** |
| Declining | **Hands off** | |
| Result after corrections | **Revised ETA** | |
| Helpful correction payout | **Navigation Assist** | |
| Harmful correction penalty | **Detour Penalty** | |
| Payout for being corrected | **Insurance Payout** | |
| Pile-on that makes it worse | **Spin-out** | Stamp, at Proof of Delivery |
| Pile-on that rescues it | **Back on Course** | Stamp, at Proof of Delivery |
| Truth reveal | **Proof of Delivery** | |
| Comedy line | **The Reality Check** | Spoken by Dotty in her note |
| Tally screen | **Odometer tally** | |
| Intro roll call | **The timesheet** | "Sign the timesheet." Ready = **CLOCKED ON** |
| Game over screen | **End of Shift 🏁** | |
| Winner | **Courier of the Month** | |
| Play again | **Next Shift?** | |
| Quit | **Clock Off?** | Confirm: **"Yeah, clock me off"** · cancel: **"Back to work"** (was *Clock Out?*) |
| Settings overlay title | **The Dispatch Desk 📋** | |
| Difficulty setting | **Dispatch Range** | |
| Sylly Mode | **✨ Backseat Drivers** | |

**Setting names and option labels**

| Setting | Name on screen | Option labels |
|---|---|---|
| Difficulty | Dispatch Range | Local / Mixed / Cosmic |
| Runs per game | Shift Length | Short (3) / Standard (5) / Long (7) |
| Distance shown | GPS | On / Off |
| Fantastical Routes | Off the Map | On / Off |
| Sylly Mode | ✨ Backseat Drivers | On / Off |

**Deliberately plain terms:** none beyond the suite's frozen shells.

**Retired terms (do not use):** Dispatch Board, Radio Defense, Dispatcher's Double-Take, Clock Out?, the old rank titles (Lost L-Plater, Pizza Peddler, Detour Daredevil, Speed-Bump Surfer, Waybill Warrior, Asphalt Astronaut, Cosmic Courier, Hyperdimensional Herald), Stars, Driver of the Month, Fleet Legend, Underdog Bonus, Backup Support, Backup Bonus, Scout Score, Mods, Rig, "airwaves", "radio".

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

**A Ride** has: a name, a **mode** (Land / Sea / Air / Space — drawn as its badge), an optional emoji (flavour only; many Rides have none), a **tier** (its speed band), one or more **speeds** (always a *cruising* speed; some also a *maximum*), a one-sentence **reveal line** shown at Proof of Delivery, and an Unregistered flag. Unregistered Rides also carry their **Briefing hint** (§8).

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

### Colours and accessibility

| Role | Name | Hex | Notes |
|---|---|---|---|
| Brand colour (controls) | Hi-vis orange | `#EA580C` | White ink 3.56:1 — passes for large/bold button text only. **Stage 2 check:** if any brand-filled control carries text under 18.66 px bold, darken to `#C2410C` (5.18:1). `[SOFT-LOCKED]` |
| Scene orange | Safety orange | `#FF6A13` | Tape, hi-vis bands, Dotty's vest — never under white text |
| Reflective stripe | Silver | `#D9DEE3` → `#F4F6F8` → `#AEB5BD` | The signature sheen |
| Paper / ink | Clipboard cream / ink | `#FFFCF3` / `#22201B` | |
| Desk | Kraft brown | `#7A5232` | |
| Too fast | Stamp red | `#C42A1E` | Dashed hatch + "TOO FAST" text (second cue) |
| Too slow | Carbon blue | `#1F4FA6` | Solid hatch + "TOO SLOW" text |
| Dead on | Ink + gold star | `#22201B` / `#C98A00` | |

**Brand-colour audit (done 10 Nov 2026):** hue ≈ 21°. Clear of You Get It? amber-500 (38°) and Honeycomb Hills honey (41°) by hue, of Pecking Order rust `#9A3412` (15°) by lightness (rust is far darker), and of Late to the Party red-500 (0°). Hi-vis yellow was rejected (sits on Fruit Salad's lemon and Natural Selection's lime; can't carry white ink) and hi-vis green (near Net-Trace emerald / Natural Selection lime; reads as "correct"). Stage 2 still runs the Naming Collision Check 4 (`pill-active-eta`).

- **Colour-blind check:** too fast / too slow differ in lightness and carry a second cue (dashed vs solid hatch, and the words). Mode badges differ by icon shape, not colour.
- **Accessibility:** verdicts are always written; reduced motion drops the time-lapse, drops and stamps to fades with the final state shown at once.
- **Colour tokens to add:** `eta` brand `#EA580C`; scene tokens above live in the game's own CSS, not the suite tokens.
- **Reference mockups:** `boards/depot-directions/` is the source of truth for the Run Sheet, Proof of Delivery and Intro. `boards/reveal-mockups-round1/Backseat.dc.html` is the reference for the **Sylly corrections mechanics only** (its neon look is retired; restyle into the clipboard world). Boards A and C in that folder are style references to avoid.

### The repeated visual primitive

| Field | Answer |
|---|---|
| **Repeated visual primitive?** | Yes — the **Ride mode badge** (on the Run Sheet, the Ride card and the tally) |
| **Distinct faces** | 4 modes (Land, Sea, Air, Space) × 2 frames (registered orange ring, Unregistered hazard ring) |
| **Skinnable later?** | Maybe — build it through one place keyed by mode id |
| **Default look for v1** | Code-drawn SVG icon (wheel / waves / paper plane / ringed planet) in a cream disc with an orange or hazard-striped ring. A Ride's emoji, where one exists, may appear on its private Ride card as flavour only |

### Art inventory

| Image | How many | Size on a phone | Shape | Default look |
|---|---|---|---|---|
| Intro scene (dock at dawn, roller door, shed, Dotty) | 1 | full screen | portrait | drawn in code (`Intro.dc.html`) |
| Clipboard board (letterhead, hi-vis band, fields, Run Sheet, note) | 1 | full screen | portrait | drawn in code (`Main.dc.html`) |
| Dotty | 1 figure, 3 states (idle, talking, pointing) | ~60×110 px | portrait | code-drawn shapes |
| Mode badges | 4 + Unregistered ring | 28 px | circle | inline SVG |
| Parcel (truth marker) | 1 | 26×22 px | box | CSS |
| Rubber stamps (verdicts, PROOF OF DELIVERY, URGENT, SPIN-OUT, BACK ON COURSE, CLOCKED ON, ranks) | ~12 strings | small to 300 px | rectangle | CSS border + stencil text; text drawn by the game |
| Courier of the Month frame | 1 | ~300 px | landscape | CSS |

Text the game draws itself: every name, time, verdict, Mileage and rank — never baked into art.

**Fonts** `[CLARIFICATION NEEDED — Stage 2]`: the boards use Google Fonts (Saira Stencil One, Courier Prime, Permanent Marker) for the mockup only. The suite has zero runtime third-party requests, so Stage 2 either proposes self-hosted subsets with a size ceiling (`cost-envelope.md`) or substitutes system stacks (stencil → heavy condensed system face; typewriter → `Courier New`; marker → Fredoka at an angle). Owner decides at spec confirmation.

---

## 12. Multiplayer Classification

| # | Question | Answer |
|---|---|---|
| 1 | **Own device or shared device?** | **Own device only.** Private Rides, private entry and secret Stamps/Corrections all need a personal screen. Pass-the-phone is out of scope. `[ASSUMPTION: a future TV / host-only mode could show the Run Sheet and Odometer tallies on a big screen while phones keep the private parts]` |
| 2 | **Is any information private to one device?** | Yes, briefly: your Ride card, your Logged ETA, your Stamp (Standard) or Course Correction (Sylly). Each is revealed at the right moment |
| 3 | **Do players ever act at the same time?** | Yes — ETA entry, Stamping and Course Correction are all simultaneous, each ending in a ready check |
| 4 | **Is one device ever locked while another is active?** | No per-player locking. The locking is per phase. A courier who locks in early simply waits; they may change their Stamp until everyone has locked |
| 5 | **Does anything not work with multiple devices?** | Nothing technical, but Talk Me Through It is spoken aloud, so players need to be in the same room (or on a voice call) |
| 6 | **Is there a read-only / spectator role?** | **No.** Nobody is eliminated or sits out; everyone plays every Run. No spectators in v1. If a courier leaves mid-Shift, the suite-wide behaviour applies: the game ends. `[ASSUMPTION: no reconnect support in v1]` |
| 7 | **Is information hidden temporarily?** | Yes, in layers. Rides and ETAs are hidden until the Board; Stamps and Corrections are hidden until everyone locks in; **a Ride's speed is hidden from everyone until Proof of Delivery** |
| 8 | What is different between PTP and MDLM? | N/A — MDLM only. Settings are host-only; others see them read-only |
| 9 | Someone leaves mid-game? Host leaves? | Suite rule: the Shift ends for everyone. No bot takes over |
| 10 | Rejoin / late join? | No reconnect in v1 (§19). No late join — Rides are dealt per Run for the seated couriers |
| 11 | Computer opponent? | No (§22) |
| 12 | How are teams formed? | No teams. The Intro shows a roll call ("Sign the timesheet"). Seat order doesn't matter |

**Stalled-player rule:** the Stamp phase (Standard) and the Course Correction phase (Sylly) end when everyone has locked in. If all but one courier have locked in, a short countdown (about 30 seconds) starts; a courier who hasn't acted by then is treated as having given no Stamp, or as **Hands off**. `[ASSUMPTION: 30 seconds; tune in playtests]`. There is no skip button — players tell each other to hurry up.

*(The question wording above is inferred from earlier briefs; Claude Code will map these to the technical template.)*

---

## 13. Screens — Plain English List

| # | Screen | Public / private |
|---|---|---|
| 1 | **Game menu** — Play button "**Clock On**" | public |
| 2 | **The Intro** — Dotty's toolbox talk, the brief, the timesheet roll call (§0b) | private (the brief can differ by mode) |
| 3 | **Job docket** (round intro) — JOB number, Route, distance unless GPS off, Briefing, URGENT; GPS Signal Lost banner for Off the Map | public |
| 4 | **Your Ride + Log ETA** — your Ride (name, mode badge, emoji if any, Unregistered frame), the Time Dial, number field, Log ETA | private |
| 5 | **Dotty's Double-Take** (small centred box) | private |
| 6 | **Waiting** — "Clocked on: 3 of 5" with timesheet ticks, never anyone's ETA | private |
| 7 | **The Run Sheet** — time-lapse reveal of every Logged ETA; stays up through Talk Me Through It | public |
| 8 | **Stamp screen** (Standard) — tap a courier's line to give your Stamp of Approval; change until all locked; stall countdown | private |
| 9 | **Course Correction** (Sylly) — tap a line, the Grab the Wheel slide-up panel with the dial, ghost of your own correction only, Hands off | private |
| 10 | **Corrections reveal** (Sylly) — Dotty's red-pen amendments shove each tape to its Revised ETA; ghosts stay at the Logged ETA | public |
| 11 | **Proof of Delivery** — big stamp, parcel drops, verdict stamps, speed facts and Reality Checks in Dotty's note; Spin-out / Back on Course stamps (Sylly) | public |
| 12 | **Odometer tally** — itemised receipt per courier, Promotion stamps, "next rank in X km"; tap to skip | public |
| 13 | **End of Shift** — Courier of the Month frame, standings, awards, Next Shift? / Clock Off? | public |
| — | Overlays: The Dispatch Desk 📋 (settings), How to Play (Rules / Practice / gallery), Rank & Scoring card, Clock Off? confirm, Next Shift? | — |

Every screen keeps the suite chrome (🔊 / ✕ / `[?]`). The action screens (3, 4, 7–12) follow the Clipboard board's layout `[DEVIATION: the Run Sheet uses the full clipboard as its stage rather than the default three-zone stack; header = letterhead + docket, stage = Run Sheet, controls = Dotty's note + action button]`.

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

### B. Dotty's Double-Take (small centred confirmation box)

On every submit, the box repeats the entry in plain words — *"4,000 hours — about 167 days. Lock it in?"* — with **Lock it in** and **Re-dial**. It never compares to the truth, so it cannot leak the answer. `[ASSUMPTION: no truth-based sanity flag, because repeated attempts could be used to probe the answer]`.

### C. Course Correction (Sylly Mode; slide-up panel)

```
 ┌─ The Run Sheet ──────────────────────┐
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

- **Register:** a radio-free depot at dawn — warm, scrappy, clockwork. Light ukulele or muted guitar over a ticking shaker; a forklift-reverse beep is **never** used (it reads as an alarm).
- **Tempo and energy:** steady, background-level, loops quietly under talk.
- **Must never:** sound like a timer, an alarm, a notification or a radio.
- **Lead instrument:** ukulele (suspected collision: none known; check the jukebox list at Stage 2).
- **Sylly Mode track?** No — Backseat Drivers changes the rules, not how the table feels.

| Moment | Sound direction (all synthesised) |
|---|---|
| Job docket | Paper slide, typewriter clatter, rubber-stamp thunk on URGENT |
| Log ETA | Stamp-and-click |
| Run Sheet strips unrolling | Tape-gun rip that rises in pitch through the time units; a soft thunk as each lands |
| Stamp of Approval | Rubber-stamp thunk |
| Course Correction locked | Biro click |
| Corrections reveal | Red-pen scribble + a squeak per shove |
| Proof of Delivery | Drumroll then a heavy stamp; parcel thud per courier; ding on a bullseye |
| Spin-out / Back on Course | Paper-crumple + crash / triumphant horn |
| Odometer | Rolling mechanical clicks slowing to a stop |
| Promotion | Short fanfare + stamp |
| End of Shift | Roller door coming down, closing-time bell |

---

## 17. End Screen Content Mockup

```
🏁  END OF SHIFT — 5 Runs clocked
"That's the lot. Sign off and go home." — Dotty

  ┌─ E.T.A. COURIER OF THE MONTH ───────────┐
  │   BORIS                                  │
  │   Shift Supervisor · 182,340 km          │
  └──────────────────────────────────────────┘

  THE ODOMETER
  1. Boris    182,340 km   Shift Supervisor
  2. Ada      171,905 km   Shift Supervisor
  3. Dev      120,610 km   Senior Courier
  4. Chloe     96,120 km   Route Regular

  DOT'S NOTES
  🎯 Sharpest Estimate  — Ada  (closest single Logged ETA: 1.01×)
  🎙️ Crowd Favourite    — Boris (most Stamps of Approval)        ← Standard only
  💥 Biggest Spin-out   — Dev  (Run 3, Chloe's pile-on)          ← Sylly only
  🧭 Best Rescue        — Chloe (biggest Navigation Assist)       ← Sylly only
  🛡️ Most Insured       — Chloe (largest Insurance Payouts)      ← Sylly only

        [ Next Shift? ]        [ Clock Off? ]
```

*(Ranks in the mockup follow §6's thresholds: 182,340 → Shift Supervisor; 120,610 → Senior Courier; 96,120 → Route Regular. The frame line shows the winner's rank.)* **Tie:** "Courier of the Month — shared: Ada & Boris." A 3-Run Shift shows the same layout.

---

## 18. How to Play — Teaching Points

1. **Clock on** — You're a courier at E.T.A. Each Run, Dotty hands out a job docket (the Route and its Briefing) and you're secretly given a Ride. Nobody tells you its speed.
2. **Log your ETA** — Estimate how long your Ride would take, pick a unit on the Time Dial, and lock it in. Dotty's Double-Take repeats it in plain words to catch slips.
3. **The Run Sheet** — Everyone's ETAs fill in on one sheet, quickest at the top of the scale. Each Ride's mode badge shows how it travels.
4. **Talk Me Through It** — Defend your number out loud. Then give one Stamp of Approval to the best pitch — funny or convincing, your call. *(Edge: you can't stamp yourself, and you can change your Stamp until everyone has locked in.)*
5. **Proof of Delivery** — A parcel drops on the true ETA for every Ride and its real speed is revealed. Closer means more Mileage. *(Edge: it's judged by how many times out you were, not by the gap — 2× off on a 5-minute trip scores the same as 2× off on 10 years.)*
6. **The Odometer** — Mileage spins up and you can be promoted. Ranks only last for this Shift.
7. **Winning and Scoring** — Accuracy pays the most; Stamps pay a little; the most Mileage at End of Shift is Courier of the Month.
8. **✨ Backseat Drivers** — Instead of Stamps, grab one other courier's wheel and make one secret Course Correction to their ETA. Fixing a big miss pays big, but corrections multiply, so a pile-on can overshoot into a Spin-out. Unregistered Rides (no rego!) join the shed and pay Hazard Pay. *(Edge: corrections never change the target's own accuracy score.)*

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
- The Run Sheet must stay readable when answers span minutes to millions of years, using a compressed scale with landmark ticks, not a literal proportional chart.
- All ETAs need one common internal unit for sorting and comparison; entry keeps the courier's chosen unit.
- Durations must be shown in friendly words ("about 12.5 days") including the very large ones.
- Ride assignment is curated per Run (tier window and fast/slow spread), not random.
- Each phase needs a stalled-player fallback.
- The Odometer tally and Corrections reveal need a tap-to-skip.

### Out of scope for v1
Pass-the-phone mode · free-text assumption capture · a persistent rank or profile · Re-dial · TV / host-only mode (noted as a future fit) · bots.

### Decisions added in v4 (10 Nov 2026, Stage 1b)
- **World:** E.T.A. Couriers — *Every Thing, Anywhere. Eventually.* The vans are all out, so couriers take whatever's left in the shed (why Rides are absurd). Narrator **Dotty, Head of Dispatch**; Intro is a toolbox talk. Alternatives considered: *Eastern Trading Association* (colonial echo, rejected), *Everyday Transport Association* (flat).
- **Direction 1 · Clipboard picked** over Docket Wall and Loading Dock; round-1 boards A/D read as racing, C as sci-fi.
- **Brand colour hi-vis safety orange** (`#EA580C` controls, `#FF6A13` scene); yellow and green rejected (§11).
- **Renames:** Run Sheet → The Run Sheet; Talk Me Through It → Talk Me Through It (Great Minds' retired radio language); Dotty's Double-Take → Dotty's Double-Take; Clock Off? → Clock Off?; rank ladder rewritten.
- **Mode badges** replace emoji as the Ride marker; the parcel drop stays as the truth marker.
- **Spin-out / Back on Course move to Proof of Delivery** (they need the truth).
- `[DEVIATION: Run Sheet uses the full clipboard as its stage — §13]`.

---

## 20. Mood & References

| Field | Answer |
|---|---|
| **Real-world games** | Wits & Wagers (estimating), Balderdash (defending), The Price Is Right (a hidden number) |
| **References** | A real courier's run sheet and proof-of-delivery docket (layout, stamps, signatures — not any brand's livery); hi-vis vests (the orange and silver stripe); an Aussie worksite toolbox talk (Dotty's voice); a corrugated roller door at dawn. **Must not copy:** any real courier company's name, logo, colours or uniform |
| **Tone** | Fast, loud, argumentative, warm — the comedy of scale, of conviction, and of getting caught, all signed for in triplicate |
| **Should NOT feel like** | A quiet maths quiz; a racing game; sci-fi mission control; a radio game |
| **Copy already written** | "Skateboard to the Moon? Show your working." · "Every Thing, Anywhere. *Eventually.*" · "Right, gather round. Toolbox talk." · "Talk me through it, then." · "Received in good order." · "Launch prep not included, love." · "You're dreaming, Boris." |

---

## 21. Sample Round

*Mileage figures are calculated from the maths round 1 numbers, with the hidden adjustments already applied.*

### Sample 1 — Standard Mode

**Setup:** 4 couriers — **Ada, Boris, Chloe, Dev**. Dispatch Range Mixed, GPS ON, Standard Shift, Run 1 of 5.

**Route:** *The Length of Italy (~1,200 km).* **Briefing:** *"A brand-new, perfectly straight, empty corridor has opened end to end. No stops, no traffic."*

**Rides (private):** Ada — Helicopter · Boris — Pogo stick · Chloe — Shopping trolley · Dev — Rocket.

1. **Logged ETAs:** Ada **5 hours** · Boris **4 days** · Chloe **21 days** (the Double-Take says "21 days — about 3 weeks. Lock it in?") · Dev **20 minutes**.
2. **Run Sheet** (fastest to slowest): Dev 20 min → Ada 5 h → Boris 4 d → Chloe 21 d.
3. **Talk Me Through It:** Dev: "Once we're airborne, it's twenty minutes flat." Boris: "Four days of non-stop bouncing, no bathroom breaks." Chloe: "One wonky wheel adds a full week." Ada: "A helicopter genuinely does about five hours."
4. **Stamps (Best Pitch):** Ada → Boris · Boris → Chloe · Chloe → Boris · Dev → Ada. Tally: Boris 2, Chloe 1, Ada 1, Dev 0. No Sweep Bonus (nobody got all three, and Sweep only exists at 5+ couriers anyway). At four couriers a Stamp is worth 3,500 km.
5. **Proof of Delivery** (true ETAs, speeds revealed):
   - Ada, Helicopter ~250 km/h: **4.8 hours.** Logged 5 h — 1.04× off. *"Dead on."*
   - Boris, Pogo stick ~4 km/h: **12.5 days.** Logged 4 d — about 3.1× too fast. *"You're dreaming."*
   - Chloe, Shopping trolley ~6 km/h: **8.3 days.** Logged 21 d — about 2.5× too slow.
   - Dev, Rocket ~28,000 km/h: **about 2.6 minutes.** Logged 20 min — nearly 8× too slow. *"Launch prep not included."*
6. **Odometer tally** (Standard = Accuracy + Depot Tips):

| Courier | Accuracy | Depot Tips | Run total | Rank |
|---|---|---|---|---|
| Ada | 40,000 | 3,500 | **43,500** | → Trolley Pusher *(Promotion)* |
| Boris | 19,270 | 7,000 | **26,270** | → Trolley Pusher *(Promotion)* |
| Chloe | 22,955 | 3,500 | **26,455** | → Trolley Pusher *(Promotion)* |
| Dev | 6,320 | 0 | **6,320** | Work-Experience Kid |

**Result:** Ada leads after Run 1. Boris won the table on pitch (two Stamps) but his accuracy trails Chloe's, so Chloe edges him by 185 km: exactly the trade-off the two layers exist to create.

### Sample 2 — Sylly Mode (Backseat Drivers)

**Setup:** same four couriers, Sylly Mode ON (Off the Map defaults ON, though this Route is real), Run 3 of 5.

**Route:** *Earth to the Moon (~384,400 km).* **Briefing:** *"A cleared corridor runs all the way. No time travelling during delivery hours. New and faster species of large eagles sighted along the route — be cautious. Wind speeds perfect for a gentle ride."*

**Rides (private):** Ada — **Flying carpet** *(Unregistered; cruising ~50 km/h)* · Boris — **Giant eagle** *(Unregistered; ~120 km/h)* · Chloe — **Time-travelling sports car** *(Unregistered; normal driving speed ~140 km/h)* · Dev — Passenger jet *(~900 km/h)*.

1. **Logged ETAs:** Ada **240 days** · Boris **120 days** · Chloe **40 days** · Dev **21 days**.
2. **Run Sheet + Talk Me Through It.** Chloe argues a car on a space highway just goes, "forty days, easy." No Stamps this time.
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
| **Run Sheet** | All three ETAs and Rides are revealed at once, to everyone, at the same time. Ada and Chloe now see Boris's jet; this is the first time Rides become public |
| **Stamps** | Ada stamps Boris; Boris stamps Ada. Chloe is still mid-argument. Once two of three have locked in, a roughly 30-second countdown appears on Chloe's phone; it runs out and she gives **no Stamp** this Run. Tally: Ada 1, Boris 1, Chloe 0 |
| **Proof of Delivery** | The speeds appear for the first time: skateboard ~58.7 h (~2.4 days) — Ada's 2 days is close; jet ~59 min — Boris's 1 hour is almost exact; horse ~29.3 h — Chloe's 30 hours is nearly perfect |

**What this proves:** private information (Rides, ETAs, Stamps) stays on its own phone until the right reveal, a unit slip is caught without any peek at the truth, and a stalled courier can't freeze the table.
*(In Sylly Mode the same pattern applies to Course Corrections: secret until every courier has locked in or chosen Hands off.)*

---

## 22. Bots

N/A — ETA's fun is the spoken Talk Me Through It phase, and a bot can't pitch. **Not yet**, rather than never: a bot that logs plausible ETAs could later help the Practice tab and solo testing. No bot seats in v1; if a courier leaves mid-Shift the suite rule applies (the game ends).

## 23. Hints & Tips

- **Beginner** `[ASSUMPTION]`: anchor on speeds you know — walking ≈ 5 km/h, cycling ≈ 20, a car ≈ 100, a jet ≈ 900. Divide distance by speed, then pick a unit. Read the Briefing twice: it tells you which speed counts (cruising vs maximum, speed limits, no time travel).
- **Advanced** `[ASSUMPTION]`: being 2× off still scores about two-thirds of the maximum, so a confident round number beats an over-precise one. In Backseat Drivers, correct about **half** of what you think is wrong `[SIM]` — the table will pile on too.
- **Surprising facts** `[SIM]`: Hands off never wins on average; a full fix usually breaks even or loses.
- **Candidate hints (not built):** a "speed you know" reference card on the Ride screen (safe — it never shows the truth).
- **For the Practice tab:** teach the divide-then-pick-a-unit habit, and that the Briefing changes the speed.

## 24. Practice Tab (Tutorial)

**Chosen form: Arena.**
- **Why:** the key action is a free estimate scored for real; fixing the *other* couriers' moves lets the player see a full Run Sheet and Proof of Delivery around their own free answer.
- **Key actions:** read the docket → read your Ride → log an ETA with the Time Dial → read the Run Sheet → see Proof of Delivery and the tally.
- **Content:** Route *The Length of Italy (~1,200 km)*, corridor Briefing. The player gets the **Helicopter**; three fixed couriers (Boris — pogo stick, 4 days; Chloe — shopping trolley, 21 days; Dev — rocket, 20 minutes, as in Sample 1). The player's ETA is free; Dotty's note explains each verdict. Talk Me Through It is shown as one scripted line per courier, and the Stamp step is a single tap on a suggested pitch.
- **Hidden information:** only the player's own Ride is hidden until the Run Sheet, exactly as in play; the truth appears only at Proof of Delivery.
- **Sylly Mode:** not covered in v1 (the How to Play card explains it).
- **Length / exit:** about 90 seconds; ✕ leaves at any point.
- **Doesn't teach:** Gear Ratio (hidden), rank thresholds (Rank & Scoring card), Off the Map.

---

## Open Questions & Locks

### Open Questions
1. **[BLOCKER for Stage 3, not Stage 2]** The **content set** (Routes, Rides with modes and speeds, Briefing lines, Unregistered hints, Off the Map Routes) has not been rebuilt. Stage 2 specifies the data format; the content itself is a separate task (old handoff §4, now plus the `mode` field). The game can't ship without it.
2. **[NON-BLOCKER]** Fonts: self-host three faces or substitute system stacks (§11).
3. **[NON-BLOCKER]** Controls shade `#EA580C` vs `#C2410C` after the contrast check (§11).
4. **[NON-BLOCKER]** Dotty's look beyond the sketch (hair, glasses, mug) and whether she appears on the action screens or only in the Intro (boards: Intro only, her voice in the note elsewhere).
5. **[NON-BLOCKER]** Time Dial details (seconds; ×1,000 / ×1M chips; compound entry).
6. **[NON-BLOCKER]** Stall countdown length (30 s assumed).
7. **[NON-BLOCKER]** Share of Off the Map Routes when on (≈1 in 4 assumed).
8. **[NON-BLOCKER]** Sylly checks: 3 couriers, Hands off attractiveness for loose couriers, stacking at 7–8.

### Locked
Name, abbreviation, emoji; world (E.T.A., Dotty, the dock); hi-vis orange brand; Clipboard direction; *The Run Sheet*; *Talk Me Through It*; rank ladder names; no hidden Range factor; hidden Gear Ratio; Briefing shared; Off the Map default rules; Ride speed hidden until Proof of Delivery.

### Soft-locked
All scoring numbers `[MATHS]`; mode badges; Dotty's Double-Take; Clock Off? wording; Arena practice; job-docket flavour lines.

### Open for build
How much of the clipboard skin the engine-owned Intro panel can take; exact animation timings (boards are the reference, reduced motion always honoured); the static tier on slow phones.

### To watch in playtests
Every Logged ETA against its truth by Dispatch Range; every Stamp; every Course Correction with its target; Run and Shift length; Spin-out / Back on Course frequency.

### Noted for later
TV / host-only mode (the Run Sheet and Proof of Delivery are public and suit a big screen); a bot for Practice; skins for mode badges.

---

## Appendix: Notes for Stage 2 (technical language allowed here)

### Files handed over (originally in `docs/new-ideas/eta/`; since the build, 10 Nov 2026, in `docs/new-ideas/eta/for archive/` for the owner to file away)
| File | Use |
|---|---|
| `new-game-brief-eta-v4.md` | This brief — the source of truth |
| `boards/depot-directions/Main.dc.html` | **Picked board** — Run Sheet + Proof of Delivery, Standard Mode, 5 couriers. Every value inline; the timeline and maths live in its `<script type="text/x-dc">` block |
| `boards/depot-directions/Intro.dc.html` | Intro scene — dock, roller door, Dotty, toolbox talk, brief, timesheet |
| `boards/depot-directions/DocketWall.dc.html`, `LoadingDock.dc.html` | Not picked — do not build from them |
| `boards/reveal-mockups-round1/Backseat.dc.html` | Sylly corrections reveal **mechanics** reference (flying correction chips, ghosts, skid trails, Spin-out logic, Navigation Assist / Detour / Insurance payouts with the maths-round credit scheme implemented in JS) |
| `boards/reveal-mockups-round1/*` (others) | Round-1 history only |
| `eta-maths-round-1.md`, `eta_sim.py` | Scoring formulas and simulation; `acc()` in the boards matches the maths doc |
| `eta-handoff-content-and-board.md` | The October handoff — §4 is the content-rebuild task (still open) |

The `.dc.html` files are design-canvas components, not suite code: read them for layout, values and timing; don't import them. They use `{{holes}}`, `<sc-if>`/`<sc-for>` and a `DCLogic` class — translate into the suite's partial + plugin pattern.

### Build plan (R2c — from the picked board)

**Screen map** (fate: all new):
| Screen (§13) | Board source | States | Motion (board timings at speed 1) |
|---|---|---|---|
| Intro scene | `Intro.dc.html` | door closed → up; Dotty idle / talking / pointing | door roll 1.2 s; Dotty sway + mouth while a line shows; `beat(i, text)` drives talking |
| Job docket | `Main.dc.html` header | docket in; Briefing typed; URGENT | type-on 0.5 s per field, URGENT stamp 0.7 s; GPS Signal Lost banner first if Off the Map |
| Ride + Log ETA | (not drawn — derive from clipboard style) | entry, Double-Take, waiting | stamp-and-click on lock |
| Run Sheet | `Main.dc.html` rows | per row: idle → driving → landed | time-lapse sweep ≈ 4.6 s on a log scale (1 min → 10 yr in the board; scale range picked per Run from the min/max of Logged ETAs and truths with landmark ticks 1 min · 1 hr · 1 day · 1 wk · 1 mo · 1 yr · 10 yr · 100 yr · 1,000 yr · 1M yr); each strip's width eases linearly so it lands when the counter passes its value; thunk + sheen on landing; tag pops |
| Stamp / Course Correction | (not drawn) | select line, panel, locked | slide-up panel per §14 |
| Corrections reveal (Sylly) | `Backseat.dc.html` mechanics, restyled | per correction: chip flies, tape shoves, ghost stays | chip arc 0.52 s, shove 0.46 s spring; chips are **red-pen amendments** on the clipboard |
| Proof of Delivery | `Main.dc.html` phases 4–6 | big stamp; per courier: parcel → gap → verdict stamp → km | big stamp 1.75 s with board jolt; per courier step 1.35 s: parcel 0.85 s, gap 0.45 s, stamp 1.2 s, km chip 0.45 s; bullseye star + confetti; Dotty's sign-off draws on |
| Spin-out / Back on Course (Sylly) | `Backseat.dc.html` | stamp after that target's parcel lands | stamp + shake (Spin-out) / hop (Back on Course) |
| Odometer tally | (not drawn) | receipt lines, Promotion stamp | tap-to-skip |
| End of Shift | (not drawn — §17) | frame, standings | roller door comes down at the end |

**Phase timeline on the Run Sheet board** (ms at speed 1): docket 80 · sweep 1,500–6,100 · all logged 6,450 · Proof stamp 9,050 · first parcel 10,850 · step 1,350 per courier · sign-off after the last. A tap-to-skip jumps to the settled state (the board's `settle()` shows how: apply every event up to a time, no timers).

**Data:** every Ride gains `mode: 'land'|'sea'|'air'|'space'` (+ the existing Unregistered flag drives the hazard ring); `emoji` becomes optional.

**Privacy (unchanged from v3):** the truth and every Ride speed stay on the host until Proof of Delivery; a ghost bar previews only the local courier's correction; Dotty's Double-Take never compares with the truth. The Run Sheet scale range must be computed from Logged ETAs only before Proof of Delivery (if it used the truths, the axis would leak them), then may widen to fit the truths at Proof of Delivery with a short re-scale tween `[OPEN FOR BUILD]`.

**Departures to log at build:** the Run Sheet's full-clipboard stage (three-zone default); custom fonts (pending decision); stamp and parcel motion beyond the Motion Standard's caps.
