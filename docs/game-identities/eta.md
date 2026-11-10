# ETA?

**Game 21** · `activeGameId: eta` · plugin `js/games/eta.js` · world kit `js/games/eta-scene.js` · `css/eta.css`
**Emoji:** 🛵 · **Brand:** hi-vis orange `#EA580C` (custom `eta-cta` / `pill-active-eta`) · **Players:** 3–8 · **Modes:** MDLM only
**Status:** built SW v272, 10 November 2026 — awaiting its first real multi-device session. The content set is **provisional** (T9).

> **Change contract.** Each section is tagged **free** (reword freely — but it must stay true),
> **paired** (change the doc and the code together, or you open a gap between them), or **derived**
> (change the code first; editing the doc only changes whether it is correct). Full rule:
> `docs/superpowers/specs/2026-08-22-game-identity-docs-design.md` § 5.
>
> **Where the technical detail lives.** Screen and overlay IDs, state variables, key functions and
> MP packet tables are in `docs/code-map.md` — Grep the game's name or an element ID, never
> full-read it. This document deliberately does not duplicate them. The design history is
> `docs/new-game-brief-eta.md` (brief v4) and `docs/new-game-tech-eta.md` (the confirmed spec).

---

## T1 — The Pitch · *free*

*Skateboard to the Moon? Show your working.* Every courier at E.T.A. is handed whatever's left in the
shed — a shopping trolley, a pogo stick, a helicopter — and nobody tells them how fast it goes. Each
logs an ETA for the same job, defends it out loud with a straight face, and then a parcel drops on
the truth. The fun is two beats: a table full of people justifying absurd numbers, then everyone
finding out who was dreaming.

---

## T2 — The Premise · *free*

Each **Run**, Dot the Depot Manager hands out a **job docket**: a **Route** everyone shares ("The
length of Italy", about 1,200 km) and a **Dispatch Briefing** of assumptions that make the answer
unambiguous ("a perfectly straight, empty corridor — no stops, no traffic"). Each courier is privately
given a **Ride** and estimates how long it would take, as one number on the **Time Dial**. Every
**Logged ETA** then fills in at once on **The Run Sheet**; the table talks it through and hands out
**Stamps of Approval** for the best pitch; then **Proof of Delivery** reveals every Ride's true speed
and the true ETA. **Mileage** is earned mostly for accuracy — judged by how many *times* out you
were, never by the gap — plus a little for the Stamps. Most Mileage at **End of Shift** is **Courier of
the Month**.

It is an estimation game with a persuasion layer: Wits & Wagers' estimating, Balderdash's defending.
The accuracy scoring, the Ride / Route pairing and Backseat Drivers are the suite's own.

---

## T3 — How to Play · *free*

**Clocking on.** The host sets the Shift on the menu's Dispatch Desk, opens a room, and everyone
joins on their own phone. Dot's toolbox talk plays on the loading dock, then the timesheet roll call —
everyone taps *I'm ready* (their line is stamped CLOCKED ON) and the host starts.

**A Run.** The job docket slides in (JOB number, the Route, its distance unless GPS is off, the
Briefing, an URGENT stamp). Each phone then shows its own Ride and the Time Dial: type a number,
pick a unit, tap Log ETA, and **Dot's Double-Take** repeats it in plain words before you lock it in.
When everyone's in, the Run Sheet fills in as a time-lapse — hi-vis tape unrolling along a log scale,
quickest on the left. Talk it through out loud, then tap the courier whose pitch you liked best to
Stamp it (never your own; you can change it until everyone's in). The big PROOF OF DELIVERY stamp
lands, a parcel drops on every true ETA, the gap is hatched red (too fast) or blue (too slow), each
verdict is stamped in the margin and Dot's note gives the speed and a Reality Check. **See the
Odometer** opens the receipts; the host hands out the next job.

**How it ends.** After 3, 5 or 7 Runs, End of Shift names the Courier of the Month (a tie shares
it), the standings and Dot's Notes.

---

## T4 — Theme & Flavour · *free*

**The world.** E.T.A. Couriers — *Every Thing, Anywhere. Eventually.* — a small, overstretched
suburban depot at 6 am. The vans are all out, so couriers take whatever's left under the tarps in the
back shed. E.T.A. says yes to every job, including the Moon and Atlantis. The question mark in the
game's name is the company's in-joke.

**The narrator.** **Dot, Depot Manager** — hi-vis vest, clipboard, biro behind her ear, glasses on a
chain. Warm, harried, a lifer; never admits the depot is chaos. Short sentences, Aussie worksite
English ("righto", "toolbox talk", "love"). She runs the Intro, the dockets, the Run Sheet and the
sign-off.

**The look — direction 1 · Clipboard.** Dot's clipboard on a kraft-brown desk: a cream sheet, the
E.T.A. letterhead, a JOB box, a hi-vis orange band with a silver reflective stripe, typed fields, a
"From Dot" note in marker. The signature moment is the **hi-vis tape**: every Logged ETA is a strip of
it, and a sheen sweeps across the stripe as it lands. Then the **parcel drop** and the **rubber stamp**.
Three self-hosted faces carry the scene text (a stencil, a typewriter, a marker); Fredoka stays on
every control.

**Mood words:** can-do · paper-trail · cheeky.

**What it is NOT.** Not Just Enough Cooks (a kitchen shift — ETA's shift words are courier words).
Not Like I'm Five (Dot is a boss, not a teacher: ink and stamps, never chalk). Not Great Minds — no
radio, airwaves or frequencies anywhere (hence *Talk Me Through It*). Not a racing game: vehicles
never race; the bars are paperwork filling in.

Australian English, metric only — Mileage is in km, never miles.

---

## T5 — Terminology · *paired*

| Term | Meaning |
|------|---------|
| **Shift** | A match. *Clocking on for a 5-Run Shift.* |
| **Run** | One round — one job docket. |
| **Job docket** | The round intro: JOB #00NN, the Route, its distance, the Dispatch Briefing, an URGENT stamp. |
| **Courier** | A player. Never "driver". |
| **Route** | The shared distance prompt. |
| **Dispatch Briefing** | The shared assumptions on the docket — including any Unregistered Ride's hint. |
| **Ride** | Your secret vehicle for the Run. Its speed is never shown until Proof of Delivery. |
| **Mode badge** | A Ride's marker: Land, Sea, Air or Space; a hazard-striped ring means Unregistered. |
| **Time Dial** | The entry: a number plus a unit chip (min · hrs · days · wks · months · yrs; ×1,000 / ×1M for years). |
| **Logged ETA** | Your estimate. |
| **Dot's Double-Take** | The confirmation box that repeats your entry in plain words. Never compares with the truth. |
| **The Run Sheet** | The shared chart of every Logged ETA on a log scale. Was *Dispatch Board*. |
| **Talk Me Through It** | The out-loud pitch phase. Was *Radio Defense*. |
| **Stamp of Approval** | Your one vote for the best pitch. |
| **Depot Tips** | Mileage paid per Stamp received. |
| **Sweep Bonus** | One extra tip for being stamped by everyone else (5+ couriers). |
| **Proof of Delivery** | The truth reveal. |
| **Reality Check** | Dot's one-liner on each Ride's real speed. |
| **Mileage** / **The Odometer** | The score (km) / the running total. |
| **Promotion** | Climbing the eight-rank ladder (Work-Experience Kid → Dot's Favourite), this Shift only. |
| **End of Shift** / **Courier of the Month** | The gameover / the winner. |
| **The timesheet** | The Intro's roll call — *Sign the timesheet.*; ready = **CLOCKED ON**. |
| **The Dispatch Desk 📋** | The settings overlay. |
| **Backseat Drivers** | Sylly Mode (T8): **Course Correction**, **Hands off**, **Revised ETA**, **Navigation Assist**, **Detour Penalty**, **Insurance Payout**, **Spin-out**, **Back on Course**, **Unregistered Ride**, **Hazard Pay**. |
| **Clock Off?** / **Next Shift?** | Quit / play again. |

**Retired (never use):** Dispatch Board, Radio Defense, Dispatcher's Double-Take, Clock Out?, Stars,
Driver of the Month, Underdog Bonus, "radio", "airwaves". The **Gear Ratio** (5 ÷ Runs, so every
Shift Length shares one rank ladder) is real but hidden — it is never named on screen.

---

## T6 — Settings · *mixed — labels paired, values derived*

The settings overlay is titled **The Dispatch Desk 📋** — *"Set the shift before the roller door goes up."*

| Setting | Options | Default | What it does in play |
|---|---|---|---|
| **Dispatch Range** | Local · Mixed · Cosmic | Mixed | Which Route tiers come up: human-scale, all, or orbit and beyond. ETA's difficulty dial (exempt from the word-tier item — not a `words.json` game). |
| **Shift Length** | Short (3) · Standard (5) · Long (7) | Standard | Runs per Shift. |
| **GPS** | ON / OFF | ON | OFF hides the distance, so couriers estimate it too. |
| **Off the Map** | ON / OFF | OFF | Fantastical Routes (Atlantis, the Underworld) join the draw — about 1 in 4. Flips ON when Sylly Mode turns on, and can still be turned off. |
| **✨ Sylly Mode** | OFF / ON | OFF | Backseat Drivers. See T8. |

Settings are host-only: they're set on the menu before the room exists and travel by SETTINGS_SYNC.

---

## T7 — The Player's Journey · *mixed — 7a derived, 7b paired, 7c free*

### T7a — The flow

| # | Screen | Beat | Type | Duration | Chrome |
|---|--------|------|------|----------|--------|
| 1 | `screen-eta-menu` | Menu | Menu | — | 🔊 |
| 2 | `screen-game-intro` | *(engine)* Dot's toolbox talk on the dock at dawn → the brief → *Sign the timesheet.* | Intro | — | 🔊 ✕ |
| 3 | `screen-eta-standby` | A client waits for the first docket | Wait | — | 🔊 ✕ |
| 4 | `screen-eta-docket` | The job docket — typed in, URGENT stamp, GPS Signal Lost first for Off the Map | Interstitial | 4.2 s (+1.2 s) | none (rule 5) |
| 5 | `screen-eta-log` | **Private.** Your Ride, the Time Dial, Log ETA → Double-Take → *Clocked on: k of n* | Interactive | — | `[?]` 🔊 ✕ |
| 6 | `screen-eta-sheet` | The Run Sheet time-lapse → Talk Me Through It + Stamps (or Course Corrections) → (Corrections reveal) → Proof of Delivery → sign-off | Interactive | — | `[?]` 🔊 ✕ |
| 7 | `screen-eta-tally` | The Odometer — a receipt per courier, Promotion stamps; host: Next job | Result | — | `[?]` 🔊 ✕ |
| 8 | `screen-eta-gameover` | End of Shift — Courier of the Month, standings, Dot's Notes | Result | — | 🔊 ✕ |

Rows 4–7 loop for the Shift Length. Every animated beat has a **Skip** that settles it at once; reduced
motion shows every final state immediately.

**Overlays**

| Overlay | Opened from | What it is |
|---|---|---|
| `eta-settings-overlay` | Menu | The Dispatch Desk — five settings |
| `eta-how-to-overlay` | Menu, every `[?]` | How to Play — tabs **Rules · Practice · Ranks** |
| `eta-doubletake-overlay` | Log ETA | Dot's Double-Take — Lock it in / Re-dial |
| `eta-quit-overlay` | Any mid-Shift ✕ | Clock off early? (ends the Shift for everyone) |
| `eta-new-shift-overlay` | End of Shift | Next Shift? |

### T7b — The words on screen

#### The menu

```copy
# screen-eta-menu
ETA
Skateboard to the Moon? Show your working.
Clock On
How to Play
Settings
← Back to the Box
```

#### The Intro (engine screen, the game's copy)

```copy
# intro-eta
Dot
Depot Manager
Right, gather round. Toolbox talk.
Welcome to E.T.A. Every Thing, Anywhere. We say yes to every job.
Bit of a hiccup: the vans are all out. You're taking whatever's left in the shed.
Customer wants an ETA. Give 'em a good one.
You'll get a Ride. Nobody tells you its speed.
Log your ETA. Closest to the truth earns the most Mileage.
Then talk me through it. Best pitch gets my stamp.
You'll get a Ride — maybe one with no rego. Nobody tells you its speed.
Then grab someone's wheel: one secret Course Correction.
Sign the timesheet.
CLOCKED ON
```

#### Your Ride + Log ETA

```copy
# screen-eta-log
YOUR LOGGED ETA
For the really long ones:
Log ETA
Need a number, love.
That's longer than the universe. Try again.
Dot's finding you something in the shed…
```

```copy
# eta-doubletake-overlay
DOT'S DOUBLE-TAKE
Lock it in
Re-dial
```

#### The Run Sheet

```copy
# screen-eta-sheet
Skip
Talk me through it, then.
Best pitch gets my stamp.
Then grab someone's wheel.
Filling in the Run Sheet…
Hang on — a few amendments.
Lock it in
Hands off
See the Odometer
Waiting for Proof of Delivery…
```

#### The Odometer

```copy
# screen-eta-tally
THE ODOMETER
Next job
Waiting for Dot (the host) to hand out the next job…
Top of the ladder
```

#### End of Shift

```copy
# screen-eta-gameover
END OF SHIFT 🏁
E.T.A. COURIER OF THE MONTH
THE ODOMETER
DOT'S NOTES
Next Shift?
Clock Off
```

#### Settings — The Dispatch Desk

```copy
# eta-settings-overlay
The Dispatch Desk 📋
Set the shift before the roller door goes up.
Dispatch Range
Which jobs come in: everyday distances, a mix, or the solar system and beyond.
Shift Length
How many Runs before End of Shift.
GPS
Shows each Route's distance. Off, you estimate the distance as well.
Off the Map
✨ Sylly Mode
Backseat Drivers
```

#### How to Play

```copy
# eta-how-to-overlay
How to Play 🛵
Guess how long an odd vehicle takes, then argue for it.
Rules
Practice
Ranks
Clock on
Log your ETA
The Run Sheet
Talk Me Through It
Proof of Delivery
The Odometer
Winning and Scoring
Most Mileage is Courier of the Month
Backseat Drivers
```

#### Quit and play again

```copy
# eta-quit-overlay
Clock off early?
The Shift ends for everyone. Nobody else gets paid either.
Yeah, clock me off
Back to work
```

```copy
# eta-new-shift-overlay
Next Shift?
Fresh Odometers, same crew.
Restart in Lobby
Stay here
```

### T7c — Where the journey is thin

**◇ judgement, not spec.**

**The content is provisional.** The 44 Routes and 36 Rides are the October proof-of-concept set with
its known faults fixed (the duplicate 100 km, tier mistakes, vertical Routes without a ramp, a 5 km
twin). The content-rebuild session replaces `data/eta-data.json` wholesale against
`docs/eta-content-guide.md`; nothing in code changes.

**Every number is a first-pass value.** The scoring (maths round 1) was tuned on *simulated* couriers.
The first playtests should log every Logged ETA against its truth by Range, every Stamp and every
Course Correction — the Spin-out / Back on Course thresholds are explicitly `[UNTESTED]`.

**Talk Me Through It has no clock.** The phase ends when everyone has Stamped; a 30 s countdown
starts only once all but one are in. A table that never stamps never moves on — by design (no skip
button), but worth watching at the first session.

**No reconnect in v1.** A dropped phone gets the engine's 60 s grace and the host's call.

---

## T8 — Sylly Mode · *free*

**Backseat Drivers.** Everyone becomes a backseat driver. Instead of Stamps, each courier may grab
**one other courier's wheel** and make one secret **Course Correction** — a multiplier on their ETA
from ÷10 to ×10, on a compressed dial (÷10 and ×10 feel the same size) — or keep their **Hands off**.
Corrections **multiply**: three couriers each saying "double it" make ×8. After everyone's in, Dot's
red-pen amendments shove each tape to its **Revised ETA** (a ghost stays at the Logged one), then
Proof of Delivery.

**How it pays.** The target's own Accuracy always uses the Logged ETA — a pile-on can't wreck them,
and they collect an **Insurance Payout** (3,000 km per ×10 of push, capped at 4,000). If the ETA ended
up closer, the couriers who pushed the right way share **Navigation Assist** (80% of the accuracy
gained, by push size); a wrong-way push pays a **Detour Penalty**. If it ended up worse, everyone who
pushed that way shares a Detour Penalty (40% of the loss). A pile-on of two or more that loses 3,000+
stamps **SPIN-OUT**; corrections that gain 3,000+ and land within 1.25× stamp **BACK ON COURSE** —
both only at Proof of Delivery, because they need the truth. **Unregistered Rides** (no rego — a flying
carpet, a giant eagle, a witch's broomstick) join the shed and pay **Hazard Pay** (4,000 km); each
carries a fair hint in the shared Briefing. Off the Map defaults ON. A Run total can't go below zero.

---

## T9 — Art & Assets · *derived*

**Everything is drawn in code — no binaries beyond fonts.** The Intro scene (dawn sky, the E.T.A.
roller door, the shed, Dot on her FRAGILE crate) is one inline SVG plus HTML; the clipboard, the
hi-vis tape, the parcel, the stamps, the Courier of the Month frame and the confetti are CSS. The
four **mode badges** are inline SVG drawn through one render seam, `etaRenderBadge` (asset kind
`eta-badge`, id = the mode) — skinnable later with no logic change; no core art pack in v1.

**Fonts.** Saira Stencil One, Courier Prime (400 + 700) and Permanent Marker, latin subsets,
self-hosted in `fonts/eta-*.woff2` (~88 KB, precached; owner ceiling 120 KB; OFL / Apache 2.0). Scene
text only.

**Lobby sticker.** None yet — ETA is in `LB_NO_STICKER`, so the Board and TV draw its emoji disc
until `data/stickers/eta.png` lands. **Music:** no track yet; the lobby track plays.

**Content.** `data/eta-data.json` — Routes (headline, km, tier, Briefing, `useMax` / `limitKmh`,
`offMap`) and Rides (name, mode, tier, cruise / max km/h, reveal, quip, Unregistered + hint).
Precached. Schema, ground rules and the pairing check: `docs/eta-content-guide.md`;
`node tools/verify-eta-content.js`.

---

## T10 — At the Table · *derived — except the PTP judgement*

**Modes.** Multi-Device Lobby Mode only — structural, not a preference: a private Ride, a private
entry and a secret Stamp or Correction every Run all need a personal screen. Pass-the-Phone is out of
scope; a TV / host-screen mode would suit the public Run Sheet later.

**Players.** 3–8, constants in `MP_GAME_CONFIGS.eta`. Sweet spot 4–6. No teams; seat order means
nothing (everyone acts at once).

**Devices.** The host runs the Shift. Each phone receives only its own Ride, privately; Logged ETAs,
Stamps and Corrections travel to the host privately too, so nothing is public before its reveal. The
public channel carries readiness counts until the Run Sheet, and no truth or speed until Proof of
Delivery. The host hands out each next job. A courier who quits ends the Shift for everyone (the
Mid-Game Quit Contract). No reconnect, no bots, no late join.

**Shape-changing settings.** None — no setting alters the player range.
