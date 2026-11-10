# E.T.A. — Implementation Notes

Game 21 · `eta` · built SW v272 (10 Nov 2026) from `docs/new-game-tech-eta.md` (confirmed the same day).
Design decisions and bugs found while building. Engine-side entries live in
`shared-implementation-notes.md` (DD-69 the roll-call hooks, BUG-29 the lobby's literal 20, ML-10 the
mock DOM) — pointers only here.

---

## Design Decisions

### DD-01 — One clipboard screen for the whole reveal (spec §17 #2)
**What:** the Run Sheet, Talk Me Through It, the Corrections reveal and Proof of Delivery are one screen
(`screen-eta-sheet`) driven by `etaPhase` (`reveal → talk → (shove) → proof → done`), not four.
**Why:** the board is one continuous clipboard — the tape that unrolls is the tape that gets shoved and
then has a parcel dropped on it. Separate screens would re-mount the Run Sheet four times and lose that.
**How:** `etaPlaySheetPhase()` drives the board for the current phase; every phase has a settled end
state, so **Skip** and reduced motion are the same code path (the board's `settle()`, from the picked
board's own `DCLogic`): each timeline event has an instant form, `skip()` runs the rest instantly.

### DD-02 — Every private thing travels privately, both ways (the CLD_COMMIT pattern)
**What:** the Ride goes host → seat by `mpSendPrivate`; a Logged ETA, a Stamp and a Course Correction go
seat → host the same way (`etaSendHost`). The public channel carries only readiness bools until the
Run Sheet, and no truth or speed until `ETA_PROOF`.
**Why:** a public ACTION would publish an estimate (or a vote) to every rival before its reveal — and
estimates anchor each other. Stamps stay counts-only even at Proof (who stamped whom is never sent).
**Asserted:** `verify-eta-loopback.js` §§ 2–4, 7 scan every public envelope and every private queue.

### DD-03 — The truth lives on the host; the axis never leaks it
**What:** truths and Ride speeds are computed and held only by the host (`etaRunTruths`, `etaRunRides`).
The Run Sheet's log scale (`etaScaleFor`) is fed Logged (+ Revised) ETAs only until Proof, then re-fits
with a 400 ms tween to include the truths. Dot's Double-Take never reads a truth (a confirm box that
compared would let repeated tries probe the answer).
**Note:** the content file is static and public in the app — privacy is about packets and DOM, not about
`data/eta-data.json`. Clients don't need the data to play.

### DD-04 — The Intro: roll call + two engine hooks, and the scene box lifted
**What:** no Line-up (no teams) → the engine roll call, skinned with the new `data-intro-roll` /
`data-intro-ready-tag` hooks (*Sign the timesheet.* / *CLOCKED ON*). The scene (`EtaScene`) is one inline
SVG (the dock at dawn, the roller door, the shed, Dot) + Dot's clipboard panel, which carries the line
once the engine's narrator text goes sr-only. The engine's 16:10 scene box was too short for both, so
`css/eta.css` lifts it for this scene only (departure D-ETA-5). Engine detail: shared DD-69.

### DD-05 — The Course Correction wheel lives in the Controls zone (spec §17 #3)
**What:** the brief drew a slide-up panel; the build puts the picker under the Run Sheet as a sibling
(`#eta-wheel`), with a ghost of *your own* correction drawn on the target's tape.
**Why:** ui-style § "A control used while reading the Stage belongs IN the Stack" — you correct by reading
the bars, so an overlay would cover the thing you are judging (COMB's build picker is the precedent).
Tapping a row scrolls the controls into view, because on a short phone they sit under the fold.

### DD-06 — Scoring is single-sourced and geared per line
**What:** one pure `etaScoreRun()` scores a Run for every seat — Standard tips + Sweep, or the full
Backseat Drivers credit (`etaSyllyCredit`, a line-for-line port of `eta_sim.py credit_pts`), Hazard Pay,
Insurance, the floor. Each receipt line is geared (5 ÷ Runs) and rounded to 10 km **on its own**, so the
receipt always adds up; a negative Sylly Run gets an explicit **Floor** line. Practice uses the same
function. `verify-eta-rules.js` asserts the brief's three sample rounds to ±10–40 km.

### DD-07 — Provisional content, generated, one entry per line *(superseded by DD-14, SW v275)*
**What:** `data/eta-data.json` is the October proof-of-concept set with its faults fixed (duplicate
100 km, Suez in the wrong tier, vertical Routes with no ramp), 44 Routes / 36 Rides (9 Unregistered, 9
Off the Map), flagged `"provisional": true`. Every Route deals a full 8-courier table across ≥ 3 tiers in
both modes (`verify-eta-content.js`). The content-rebuild session replaces it wholesale — no code change.

### DD-08 — Self-hosted scene fonts (owner, 10 Nov 2026)
Saira Stencil One, Courier Prime 400/700, Permanent Marker — Google Fonts latin subsets, ~88 KB total
under a 120 KB ceiling, precached (`fonts/eta-*.woff2`; OFL / Apache 2.0). Scene text only: **Fredoka
stays on every control** — see BUG-04 for how that nearly slipped.

### DD-09 — Playtest round 1: Dotty, and the game takes the company's name (owner, 10 Nov 2026, SW v273)
**What:** *Dot, Depot Manager* became **Dotty, Head of Dispatch** — early forties, upper management, strict
tough love (blazer, pencil skirt, ponytail, the E.T.A. lanyard; no hi-vis), and the game *ETA?* became
**E.T.A.**, with the motto as the menu subtitle. **Why:** the owner's first 3-phone session — Dot read as a
hands-on lifer; the boss should look and sound like one. **How:** a paired rename (template, every JS string,
`ETA_NOTE_FROM`, rank *Dotty's Favourite*, identity doc T4/T5 + copy blocks, brief §0, `MP_GAME_CONFIGS`,
`lobby-games.js`, `_shell.html`, `games.raw.json` via `build-games.js`), and a voice pass: every "love" in
code and content went (`Need a number. A real one.`). The menu title splits `E.T.A.` with brand-orange
stops (`aria-label` carries the whole name, so `verify-identity-docs` still finds it).

### DD-10 — Placings are derived, not sent (playtest round 1)
**What:** the reveal now stamps **1st / 2nd / 3rd** (gold / silver / bronze) by accuracy on the **Logged** ETA
— `etaPlacings(logged, truths)`, times-out (|log₁₀ ratio|), ties share (1, 1, 3), no ETA = 0.
**Why not a packet field:** every device already holds both inputs the moment `ETA_PROOF` lands (`etaLogged`
from `ETA_SHEET`, `truths` in the Proof), and a pure function of them cannot diverge — so the payload stays
as it was and nothing new crosses the wire before the Proof. In Backseat Drivers it deliberately ignores the
Revised ETA: placings judge *your* estimate, the corrections are paid separately. **Asserted:** rules (ties,
ratio-not-gap, nobody logged) and loopback (parity on every device; Sylly ranks Logged, never Revised — a
mutant that ranks Revised goes red).

### DD-11 — The reveal says it in words; the rows grow once (playtest round 1)
**What:** the owner's "the reveal doesn't land" — the truth was only ever a parcel and a passing note. Every
Proof row now carries **SAID** / **TRUE** in words under its track, the verdict stamp keeps ×N too fast /
slow, the sign-off names the closest (`etaClosest`), and **Your result** (`#eta-my-result`, Controls zone,
phase `done`) reads *You said 4 days. True ETA: 8.3 days. · 3RD · ×2.1 too fast · +20,000 km*.
**How:** the board adds `.is-proof` at the Proof's first event, so all rows grow 54 → 80 px **once**, under the
big stamp — never row by row, which would bounce the centred Stack on every parcel (ui-style § Transient
animations). Rows get their full result as an `aria-label` (the stamps are drawn, `aria-hidden`).

### DD-12 — The docket is a form, and the Briefing marks its own key words
**What:** ROUTE and DISTANCE are stacked fields with large values (19 / 17 px; was 12 px uppercase,
right-aligned, wrapping in 70% width); the Briefing is upright 13 px ink, and its **load-bearing words** are
written `**like this**` in `data/eta-data.json` and rendered bold on a highlighter stroke (`etaKitRich`).
**Why markup in content, not a keyword list:** what is load-bearing depends on the sentence ("held to 60 km/h",
"straight up"); the content author knows, a regex doesn't. `verify-eta-content.js` fails an unpaired marker or a
Route Briefing with none. The highlighter means *look here* everywhere — the Briefing's words and your own line
on the Run Sheet. The Stamp prompt uses it too: *best **pitch** — not the best guess … pays **+3,500 km***
(`etaStampTip`, geared like the receipt).

---

### DD-13 — Playtest round 2: tidier rows, Everywhere, Community Vote (owner, 10 Nov 2026, SW v274)

- **Rows.** The vehicle badge moved off the bar to sit under the courier's name (`.eta-row-ride`); the bar's end carries a small
  parcel (`.eta-endbox`, still animated by Ride mode) instead of a floating badge. At Proof the track and ticks inset 48 px
  (`.is-proof`) so the 1st–3rd medal sits in its own column **level with the bar**; SAID and TRUE share one line and the km sits under
  them (row 80 → 76 px). Measured at 375×667, 375×548 and 320×452: no overlap, no sideways scroll.
- **Range** is Local / Everywhere. `etaRangeHas` is now `range !== 'local' || tier === 'local'`, so a stale `mixed`/`cosmic` still plays as
  Everywhere; the astro-only draw is gone.
- **Community Vote** (`etaVote`, default ON, in SETTINGS_SYNC). Off: the Stamp bar and row taps are gone, `etaApplyStamp` refuses, and the
  host gets **Call Proof of Delivery** (`btn-eta-callproof`, direct `etaHostResolve()`, no packet). Clients learn the flag from
  `ETA_SHEET.vote`, so a late SETTINGS_SYNC can't split a Run. Superseded by Sylly Mode (dimmed, value kept, amber reason line).
  Loopback § 8b.
- **Sticker + music.** The owner's sticker came as a JPEG with a checkerboard **painted into the pixels** (fake transparency). `data/sticker-masters/eta.png` (git-ignored) was cut from it: non-grey/dark pixels = artwork, dilated 24 px for the white die-cut rim, everything else alpha 0; `tools/convert-stickers.js` then wrote the 512 px palette PNG (67 KB). Music went through `tools/encode-music.js` from `data/music/pending/` (192 → 128 kbps, 6.7 → 3.2 MB, cover extracted to 400 px) with one line each in the jukebox catalogue and `data/music/manifest.json`; the stickerbook manifest gained `eta`.
- **Content.** Unregistered `timecar` is now the **Flux-capacitor car** (a direct DeLorean nod without the brand name or film title).

### DD-14 — The content rebuild (owner sign-off 11 Nov 2026, SW v275)
**What:** `data/eta-data.json` replaced wholesale: 100 real Routes (50 Local / 35 worldwide / 15 space — the owner's mix,
raised from a first pass of 41), 30 Off the Map, 35 registered Rides + 14 Unregistered, 5 quips per verdict, 10 docket lines;
`provisional` cleared. Ids `italy`, `carpet`, `heli` kept — `verify-eta-rules.js` § 5 names them.
**Answer-key faults the old set carried:** "Everest, base camp to the summit" stored 8.8 km (that is sea level; base camp
is 3.5); Sydney–Melbourne, coast-to-coast USA and Britain stored *road* distances under a "perfectly straight corridor"
Briefing. **Engine-shaped content traps (now guide rules):** (1) `etaSpeedFor` uses a Ride's `max` on every `useMax`
Route, so the flying carpet's 500 km/h overrode its own *gentle ride* hint — an Unregistered Ride whose hint names a
gentler speed carries `max: null`; (2) `etaQuip` returns a Ride's quip for **dead-on** as well as fast/slow, so a quip must
comment on the Ride, never the guess ("Not at that pace" told a courier who nailed it they were slow).
**New Route shapes:** *sum Routes* state their unit in the Briefing ("Each card is **85.6 mm** long") so GPS-off is
still workable; *pop-culture Off the Map Routes* describe the place and never name the property. **Owner-signed nods:**
wardrobe → Narnia · chocolate factory → Willy Wonka · under the bed → Monsters, Inc. · pineapple → SpongeBob · ogre's
swamp → Shrek · wizard school → Harry Potter · dinosaur island → Jurassic Park · fire mountain → Lord of the Rings · 42
Wallaby Way → Finding Nemo · *To infinity and beyond* → Toy Story · *a galaxy far, far away* → Star Wars; the three
quoted lines (Wallaby Way, infinity, galaxy) were flagged as the riskiest and kept. Unregistered **Flux-capacitor car**
(Back to the Future) kept. Not legal advice was given or taken — a swap is one JSON line.
**Verified:** content 1,441 · rules 423 · loopback 190; 24 true ETAs spot-checked by hand (distance ÷ speed).

---

## Bug Index

**BUG-01 — "12.5 days" displayed as "13 days". [10 Nov 2026, build]**
**What happened:** the board's own `num()` rounds anything ≥ 10 to an integer, so the brief's
*12.5 days* (Sample 1's pogo stick) read *13 days*. **Root cause:** a mockup helper ported verbatim.
**Fix:** `etaNum` keeps one decimal under 100. **Lesson:** port a board's values, but check its helpers
against the brief's own strings — `verify-eta-rules.js` now asserts three of them.

**BUG-02 — Two real Routes at exactly 5 km. [10 Nov 2026, build]**
**What happened:** the fun run and the Grand Prix lap were both 5 km — the same class of fault as the
old set's duplicate 100 km. Found by the new `verify-eta-content.js` on its first run. **Fix:** the lap is
5.3 km (a typical circuit). **Lesson:** write the content check before trusting the content.

**BUG-03 — The Intro scene was clipped. [10 Nov 2026, visual-check]**
**What happened:** the engine's scene box is `aspect-ratio: 16/10, overflow: hidden`; the dock alone
filled it and Dot's clipboard — where the narrator line shows — was cut off. **Fix:** DD-04's scoped
override. **Lesson:** a scene that implements `beat()` owns the line's visibility; check it renders inside
the box, not just that it mounts.

**BUG-04 — Buttons on the paper wore the typewriter face; *Hands off* sat top-left. [10 Nov 2026, visual-check]**
**What happened:** `.eta-clip` sets the typewriter face and Tailwind's preflight makes buttons inherit it,
so *Lock it in* rendered in Courier. Separately, *Hands off* (stone-200, shown with `display:flex`) had no
flex centring — the checklist's known trap. **Fix:** `.eta-clip button { font-family: Fredoka }`, and
`flex items-center justify-center` on every script-revealed button without a centring class.
**Lesson:** when a world sets a font on a container, set the controls back explicitly in the same rule.

**BUG-05 — Tick labels hung off the paper and stacked. [10 Nov 2026, visual-check]**
**What happened:** at 320 px the last landmark (*100K YR*) overflowed the clip, and neighbouring labels
wrapped into each other (*1 HR* over *1 DAY*). **Fix:** labels never wrap, alternate between two rows (the
board's `ly` trick), end labels anchor inward, minimum spacing 10% of the track. Red-pen amendment chips
now ride the tape end instead of the track's right edge.

**BUG-06 — A harness check passing for the wrong reason. [10 Nov 2026, mutation run]**
**What happened:** "a second log from the same seat is dropped" ran after the last seat had logged — by
then the phase guard refused it anyway, so a mutant that deleted the per-seat guard survived. **Fix:** the
check now runs while the log phase is open. **Lesson:** a refusal test must be set up so that *only* the
guard under test can refuse.

**BUG-07 — "≈ 9 km" for Everest's 8.8 km. [10 Nov 2026, playtest round 1 visual-check]**
**What happened:** the docket printed every distance through `etaFmtInt`, so a sub-10 km Route lost its
decimal. **Root cause:** an integer formatter used for a value that is not always an integer. **Fix:**
`etaNum` (one decimal under 100). **Lesson:** BUG-01 again — check every formatter against the smallest real value.

**BUG-08 — The bigger docket pushed Log ETA below the fold at 375×667. [10 Nov 2026, visual-check]**
**What happened:** making the compact docket readable added ~45 px; Log ETA's bottom went 711 px on a 667 px
screen. **Fix:** compact-only sizes (14 px route, 12 px Briefing, 2–4 px paddings), ride card and dial padding
trimmed, badge 56 → 48 px, the section `py-5`: bottom now 667 at 375×667. 320×452 scrolls to it, as before.
A `max-height: 600px` rule also drops the full docket's flavour note (it's an interstitial — no time to
scroll); the extreme Sylly docket (Off the Map + three hints) still spills 51 px at 320×452 — deferred.
**Lesson:** a readability fix is a height change — re-measure the fold on the screen that *reuses* the component.

---

## Multiplayer Lessons

**ML-01 — The host applies its own payloads.** Every SYNC the host sends it also passes to the same
applier the clients run (`etaApplyRunStart(p)` after `etaSend(p)`), so host and client reach identical
state by identical code; the loopback asserts parity of totals, Revised ETAs and End of Shift on every
device. Host appliers that *mutate* (`etaApplyLog/Stamp/Correction`) take an explicit seat and skip
broadcasts in `'single'` mode, which is what lets `verify-eta-rules.js` play four whole Shifts in one
process.

**ML-02 — The Ride can beat its own Run.** `ETA_RUN_START` is public and `ETA_RIDE` private — two channels,
no ordering guarantee. A Ride for a Run not yet open is held in `etaPendingRide` and adopted when the Run
opens.

**ML-03 — The Proof can arrive mid-shove.** In Backseat Drivers the host sends `ETA_CORRECTIONS` and
`ETA_PROOF` back to back; a client still animating the shove stores the Proof and plays it when the shove
ends (`etaPhase === 'shove'` guard in `etaApplyProof`).

---

## Template Gaps

- **A rename is a registry sweep.** The name lives in seven places, one of them generated (`games.raw.json` ←
  `build-games.js` ← the identity doc's menu copy block) and one a hand list (`lobby-games.js` `pitch` /
  `howItGoes`). Grep the old name in `js/`, `src/`, `tools/data/`, `data/` and the identity doc, then rebuild.

- **The suite size is hard-coded in places** — the lobby's fit sentence (shared BUG-29) and four harness
  pins. The new-game checklist could name "grep for the literal suite size" as an item.
- **A game shipping before its sticker** needs one line, `LB_NO_STICKER` (`js/lobby/lobby.js`), or the
  Board/TV 404 on `data/stickers/[abbr].png` (`visual-lobby.js` goes red on the 404s). Worth a checklist
  item beside `GAME_BRAND_HEX`.
- **The lobby registries** a new game touches are now: `_shell.html` button, `GAME_BRAND_HEX`,
  `lobby-games.js` `GAMES` + boot line, `tv.js` `TV_ORDER`, `LB_NO_STICKER` (if no art), and
  `tools/data/games.raw.json` via `build-games.js`. The checklist names only the first two.
