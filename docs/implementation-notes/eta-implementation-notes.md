# ETA? — Implementation Notes

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

### DD-07 — Provisional content, generated, one entry per line
**What:** `data/eta-data.json` is the October proof-of-concept set with its faults fixed (duplicate
100 km, Suez in the wrong tier, vertical Routes with no ramp), 44 Routes / 36 Rides (9 Unregistered, 9
Off the Map), flagged `"provisional": true`. Every Route deals a full 8-courier table across ≥ 3 tiers in
both modes (`verify-eta-content.js`). The content-rebuild session replaces it wholesale — no code change.

### DD-08 — Self-hosted scene fonts (owner, 10 Nov 2026)
Saira Stencil One, Courier Prime 400/700, Permanent Marker — Google Fonts latin subsets, ~88 KB total
under a 120 KB ceiling, precached (`fonts/eta-*.woff2`; OFL / Apache 2.0). Scene text only: **Fredoka
stays on every control** — see BUG-04 for how that nearly slipped.

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

- **The suite size is hard-coded in places** — the lobby's fit sentence (shared BUG-29) and four harness
  pins. The new-game checklist could name "grep for the literal suite size" as an item.
- **A game shipping before its sticker** needs one line, `LB_NO_STICKER` (`js/lobby/lobby.js`), or the
  Board/TV 404 on `data/stickers/[abbr].png` (`visual-lobby.js` goes red on the 404s). Worth a checklist
  item beside `GAME_BRAND_HEX`.
- **The lobby registries** a new game touches are now: `_shell.html` button, `GAME_BRAND_HEX`,
  `lobby-games.js` `GAMES` + boot line, `tv.js` `TV_ORDER`, `LB_NO_STICKER` (if no art), and
  `tools/data/games.raw.json` via `build-games.js`. The checklist names only the first two.
