# Cold Shoulder (`cld`) — Implementation Notes

Game 19. Blind-commit physics party game on a shrinking ice floe, MDLM, host-authoritative
timeline playback. Sylly Mode = The Thaw.

Spec: `docs/new-game-tech-cold-shoulder.md` · Brief: `docs/new-ideas/new-game-brief-cold-shoulder.md`

**Status: Stage 4 of 6 complete** (spec §15 build order) — `js/lib/physics.js` +
`tools/verify-cld-physics.js` (121 checks), `js/games/cld.js`'s rules layer +
`tools/verify-cld-loop.js` (162 checks), `tools/simulate-cld-balance.js` (the balance
instrument; asserts nothing, always exits 0) and `tools/mutate-cld.js` (26 planted-drift
mutants, all caught). **All five `[Stage-3 tunable]` constants are resolved** — see DD-13.

**Stage 4 added the whole UI layer**: both `<script>` tags, six screens and four overlays in
`index.html`, the four brand CSS classes, `playSplash()`, the `engine.js` registrations
(`allScreens`, `resetToLobby`, both theme maps, `LOBBY_COLOUR_ORDER`), and ~1,000 lines of
canvas/render/UI code in `cld.js` below the `STAGE 4 OF 6` marker. Verified with the
`visual-check` skill across 15 screen states at 3/6/8 players — **zero page errors, no
horizontal scroll anywhere, and four real defects found and fixed** (BUG-07…BUG-10).

Still no MP (Stage 5: `MP_GAME_CONFIGS`, `mpSerialiseSettings`, the private `CLD_COMMIT`
channel, `verify-cld-loopback.js`) and no `sw.js` entry or `CACHE_NAME` bump (Stage 6).

---

## Design Decisions

**DD-01 — Velocity-first integration, chosen because it errs in the SAFE direction.** Coulomb
friction was already specced (§4A); what the spec left open is *where in the substep* the friction
is applied. The two orderings are not equivalent:

| Ordering | Distance travelled |
|---|---|
| `v -= a·dt` then `x += v·dt` (**shipped**) | `D · (N−1)/N` — under-shoots |
| `x += v·dt` then `v -= a·dt` (explicit Euler) | `D · (N+1)/N` — over-shoots |

…where `D = v₀²/(2a)` and `N = v₀/(a·dt)`. Every §4B invariant is *computed from the closed form* —
`cldMinRadius()`, the Snowball per-throw invariant, the Thaw floor. An implementation that travels
further than the closed form predicts eats the margin those invariants are sized against; one that
falls short leaves it intact. At `v_max = 150`, slush and `CLD_SIM_HZ = 120`, `N ≈ 208`, so the
shipped scheme lands within 0.5% of `D` — and always on the safe side of it. The harness asserts
both the ±1% match *and* the direction (`travelled <= D`), and an explicit-Euler mutant fails the
direction check in all three Ice Conditions while still passing the ±1%.

**DD-02 — `kind` on a body, not just `immovable` + `restitution`.** §4A's body schema is
`{ id, x, y, r, immovable, restitution }`. Shipped as written, every caller would have to repeat two
correlated facts on every body ("a Berg is immovable AND cushioned"), and a Berg that got one and
not the other would behave plausibly enough to survive review. Added an optional
`kind: 'penguin' | 'drowned' | 'berg'` that supplies both defaults, with `immovable` and
`restitution` still overridable per body. `params.bergRestitution` / `params.drownedRestitution`
(both in §4A) are what `kind` resolves against, so the spec's params keep their stated job.

**DD-03 — pair restitution is the PRODUCT, not max or min.** The rim mechanic's whole arc is that
one anchor amplifies and the other cushions, so the combination rule has to preserve both
directions. Penguin = 1.0, so `product` gives penguin↔drowned = 1.35 (energetic) and penguin↔berg =
0.55 (cushioned) — exactly the specced inversion. `max` would give 1.35 and 1.0: the Berg would stop
cushioning and the guardrail would silently become a wall. Asserted by measuring the bounce ratio
against `Physics.DEFAULTS`, so a retune of either coefficient keeps the test honest.

**DD-04 — a Snowball strikes the single NEAREST body it overlaps, never everything in range.**
§4D is explicit that a throw arriving at empty ice "misses entirely", which only means anything if
hit/miss is a crisp binary. A blast radius with falloff would blur exactly the boundary the race
mechanic is read off. Contact test is `dist(landing, body) <= ev.radius + body.r`, nearest wins.

**DD-05 — the hit that empties a Berg still cushions that rebound.** Brief §3: a Berg "absorbs a
would-be plunge into a cushioned rebound and loses one hit", and only *later* contacts pass through
to open edge. So the rebound is applied first and the shatter is emitted from inside the same
contact. The harness pins this from both sides: a Snowball clearing the Berg *before* the sliding
penguin arrives lets that penguin plunge; the same Snowball scheduled *after* leaves the penguin
rebounding off a Berg that shatters on that very contact.

**DD-06 — the sim keeps running while a scheduled event is still pending, even with everything at
rest.** Termination is `all bodies at rest AND the event queue is drained`. Dropping the second
clause would silently delete any Snowball whose flight outlasts the collisions — the common case
for a long throw across a quiet floe.

**DD-07 — `final[]` carries `vx`/`vy` alongside `exitVx`/`exitVy`.** `exitVx`/`exitVy` stay §4C's
plunge-only fields (the Berth shunt tie-break reads them). `vx`/`vy` are the resting velocity for
every body, which is what makes "the cap forces rest" and "an immovable body carries no velocity"
assertable at all. Additive to §4A's return shape; nothing reads the old fields differently.

**DD-08 — `Physics.rng(seed)` is exported.** Stage 2 needs a seeded pick for Berth slots (§4C) and
Berg placement. A second, independently-written xorshift in `cld.js` would be a second thing that
can drift from the determinism contract for no benefit. One generator, exported.

**DD-09 — `CLD_BERTH_SLOTS = 2`, forced from both directions, and it costs the shunt its depth.**
§4C leaves the number open and two stated constraints pin it:

| Constraint | Implies |
|---|---|
| "two Drowned penguins may share a Berth but never a position" (§4C) | slots ≥ 2 |
| Peck Off: 2 Berths, 4 penguins, and 3 can be Drowned while **both** players are still alive | rim capacity ≥ 3, so slots ≥ 2 |

So 2 is the only value that satisfies both at the minimum, and at 2 the capacity invariant is
*stronger* than §4C claims: total capacity is `N × 2` against `N` penguins (4 against 4 in Peck
Off), so the rim has spare room even in a total Washout. §4C attributes termination to the minimum-
radius floor; it is actually a **counting** property, independent of radius. The floor's real job is
geometric — keeping the slots far enough apart to read as distinct positions.

**The cost, and it is worth stating plainly:** forcing a shunt to hop `h` needs `2h` Berths full,
i.e. `4h` Drowned penguins. At the 8-player ceiling only 8 penguins exist, so **the deepest hop any
legal game state can reach is 2** — and the randomised sweep across every player count, both Thaw
states and all three Ice Conditions bears that out (299 Slides, deepest observed hop: 1). The
`h ≥ 3` path is a contract, not a game state.

**Brief Round E is still reachable and still resolves exactly as described.** 8 players, Berths
3/4/5 full and Berth 2 holding one — seven Drowned — and the eighth plunging into Berth 4 resolves
to Berth 6, because 6 has more free room than 2. That is two hops, not three; the spec's "at least
three hops" appears to have counted Berths traversed. Both are asserted: Round E through the
reachable state, and `h = 3` against `cldAssignBerth` directly with a synthetic five-Berth block,
flagged in the harness as beyond legal density.

**DD-10 — Dives resolve BEFORE the Slide, and need no aftermath beat.** A Dive repositions a rim
bumper, so it has to be in place for the Slide it was committed alongside — otherwise a player
commits a Dive to intercept a rival and the rival passes through where the bumper is about to be.
It therefore emits no `aftermath` beat: the moved body is already in the sim's frame 0, and the
timeline carries it for free. The timeline does gain a `dives[]` field (`{ penguinId, dir, moved }`,
additive to §11's packet, same shape of addition as DD-07) purely so `moved: false` — the
allowed-to-fail case — is visible to the UI and to the harness.

**DD-11 — the Washout guard around scoring was deleted, not written.** The obvious shape is
`if (!washout && cldPlayersAlive() <= 1) cldResolveFloeOff()`. But `cldResolveFloeOff()` already
refuses to award unless **exactly one** owner survives, and a Washout means zero — so the `!washout`
half is indistinguishable from its own absence. That is BUG-01's dead-latch shape exactly, and a
mutant deleting it passed the whole harness. Shipped instead as one authority:

```js
const washout     = cldCheckWashout();
const outcome     = cldResolveFloeOff();      // no-op unless exactly one owner is left
const floeOffOver = washout || outcome.winnerIdx >= 0;
```

with the scorer's own no-op behaviour asserted directly at 2+ alive, at exactly 1, and at 0.

**DD-12 — a Drowned penguin's Berth position is protected by immovability, not by a guard.** Same
lesson, second application. Slide resolution writes resting positions back from `final[]`, and the
tempting guard is `if (!p.drowned && !f.plunged)`. An immovable body comes back at *exactly* its
input position, so that guard can never fire either — and the mutant proving it was the one that
found BUG-03 below. What ships is the plain write plus a harness invariant that says the real
thing: after every Slide, in every configuration, every Drowned penguin still sits on its own Berth
slot's geometry and carries no velocity. A **bumper, not a body in play**.

**DD-13 — the five tunables, resolved: two moved, three confirmed where they stood.**
`tools/simulate-cld-balance.js` at 300 Floe-Offs per config (86,316 Slides across 3–8 players ×
three Ice Conditions × both Thaw states), plus a § G sweep that re-runs the tool against patched
copies of `cld.js` — the only honest way to compare a `const`.

| Constant | Was | Now | The number behind it |
|---|---|---|---|
| `CLD_V_MAX` | 150 | **150** | Slide playback mean 1587 ms, p90 2150, p99 2650, 0.0% reaching the 5 s cap. `v_max` cancels out of `D = v²/2a`, so it is a pure duration dial |
| `CLD_SNOWBALL_SPEED` | 260 | **600** | see below |
| `CLD_SNOWBALL_R` | 4 | **8** | see below |
| `CLD_THAW_STEP` | 8 | **8** | 12/16/24 push the Washout rate to 15%/17%/23%; 4 and 6 never bite. At 8: 0.17 thaw-drops per Slide, and a Floe-Off halves from 9.92 to 4.21 Slides |
| `CLD_BERG_COUNT` | 3 | **3** | 0.31 rebounds/Slide against 0.37 plunges — a Berg already saves nearly as many as the edge takes. 4 moves the share of Floe-Offs seeing a shatter 30.0% → 33.9%, inside the bot model's noise |
| `CLD_MIN_RADIUS_MULT` | 0.5 | **0.5** | brief §19's third open value. The floor is reached in 11.3% of Thaw Floe-Offs — a safety rail, as §4B intends |

**The two Snowball constants are one dial, not two, and the Stage-2 shape was broken.** At r 4 /
speed 260, **89.6% of thrown balls found open ice** and only 6% of throws were ever *contested*,
so §4D's race — the near ball landing first and making the far one miss — was invisible behind
Snowballs that simply never connected. §4D names both failure modes explicitly ("too low and the
mechanic is invisible; too high and it reads as Snowballs randomly failing") and 260/4 was the
second one.

The cause is structural, not a bad number: **every Slide impulse lands at `t = 0`**, so a ball
thrown at where someone *is* is thrown at where they are about to stop being. At 260 u/s a ball
arrives ~24% into the Slide, by which time a decelerating target has covered most of its travel
(constant decel puts a body 56% of the way along at a third of its time). No radius rescues that:
for a naive throw to land, the ball must arrive inside the first ~6% of the Slide, which needs a
speed near 1400 — and at 1400 the race dies too (9.1% race-miss, 96% strikes).

At **r 8 / speed 600**: 65.9% of balls strike, 33.3% find open ice, and **34.1% of 54,766 contested
throws lose the race**. Bystander hits stay at 0.8%. The counterfactual grid says a naive throw
still lands only ~31% of the time against a moving target and a half-led one ~86%, so *leading*
stays the skill the mechanic is for — and a target that never left its spot is hit **98.0%** of the
time, which is a teachable rule worth putting in front of players: hold still and you get hit.
Neither constant touches `force` (a fraction of `v_max`, §4D), so the per-throw invariant is
untouched and `verify-cld-physics.js` still asserts it directly.

**DD-14 — the instrument runs three targeting policies, because one "realistic" bot would have
been a guess dressed as a measurement.** Cold Shoulder's tension is a social read under blind
simultaneous commit; a bot has none of that, so no single policy's absolute number means anything.
What *is* meaningful is the spread between stated policies, and § E reports it: with **neutral**
targeting the Fish leader takes the next Floe-Off 22.1% of the time against a 20% baseline (leading
confers no mechanical advantage — a control that validates the harness, since nothing carries over
between Floe-Offs); with **vindictive** targeting it collapses to 3.1%.

That splits §6's claim in half, and the halves have different answers. §6 says *"blind simultaneous
commit stops a strong aimer running away with it."* It does not, on its own: one sharp aimer
(σ 0.05 rad) against four loose ones (σ 0.32) takes **68.3%** of matches against a 20% baseline.
What stops the runaway is **the table choosing to aim at the leader** — the same sharp aimer takes
43.3% against a vindictive table, and a Fish leader of any skill takes 3.1%. The mechanism is
social, not mechanical, and the blind commit's real job is making the gang-up *possible without
negotiation* rather than doing the work itself. Worth restating in §6 before Stage 6 closes.

**DD-15 — findings the instrument surfaced that are NOT tunables, and were deliberately not
"fixed".** Each is a real reading; none is on the brief's tuning list, and changing a specced
value on a bot model's say-so is exactly the false precision the instrument should not be used for.
Carry them into Stage 4 playtest instead:

- **Ice Conditions swings Floe-Off length 3.2×** — 13.62 Slides at Powder, 6.06 at Slush, 4.29 at
  Black Ice, and Powder's p90 runs past 25 Slides with 0.5% of Floe-Offs stalling outright at the
  instrument's 60-Slide cap. That is what `CLD_ICE_MULT.powder = 0.70` means — a full-power Slide
  crosses 91 units on a floe up to 300 across, so players often cannot reach each other at all.
  Defensible as "grippy ice is safe ice", but Powder at low player counts is a long sit.
- **Washouts run 10.1% overall and 14.6% under the Thaw**, worst at low player counts on Black Ice.
  §8 treats the Washout as a joke beat with a 1500 ms hold; at one in seven it will wear.
- **Snowballs shorten Floe-Offs even when they miss** — turning throws off entirely takes 5 players
  at Slush from 7.7 Slides to 13.2. They are a pacing mechanism as much as a weapon.
- **DD-09's hop-depth analysis is now confirmed empirically.** Stage 2 argued from counting that
  legal play can reach at most a 2-hop shunt; 86,316 Slides reached exactly 2 and never 3.

### DD-10 — Stage 5 packet table: three SYNCs, not five (deviation from spec §11)

§11's table lists five host packets. The build ships **three** — `CLD_FLOEOFF_START`,
`CLD_SLIDE_TALLY`, `CLD_SLIDE_RESOLVE` — and folds `CLD_FLOEOFF_END` and `CLD_GAME_OVER` into the
resolve.

**Why:** neither dropped packet has a moment of its own. The Fish award (`cldResolveFloeOff`) and
the match-over decision both happen **inside** `cldResolveSlide()`, in the same call that produces
the timeline. Sending them separately would mean a second and third packet describing an outcome the
first one already determined — and §11 already argues this exact case for `aftermath[]`: *"keeping
the Slide, the surfacings, the Thaw step and any thaw-drops in one packet means the whole post-Slide
sequence has a single authoritative order and no cross-packet race."* The Fish and the podium are
the tail of that same sequence. `CLD_SLIDE_RESOLVE` carries `floeOffOver`, `winnerIdx`, `matchOver`,
`fish[]` and `stats[]`, and every device then walks its own `cldEndPlayback → cldShowResult →
cldShowScoreboard | cldShowGameover` off that one packet.

**Two smaller substitutions in the same packet:**
- **`final[]` → `penguins[]` + `bergs[]`.** §11 lists `physics.js`'s raw `final[]`. The client never
  simulates, so what it actually needs is the resolved *game* state — who Drowned, which Berth and
  slot they took, which Bergs survived the shatter filter — which `final[]` does not carry. Sending
  both would be the same information twice at two different layers.
- **`dives[]` is deliberately NOT broadcast.** It stays on the host's local timeline for debugging.
  A Dive's `dir` comes straight out of `cldCommits`, and it is a committed *intention* — the fact
  that its effect is visible in sample frame 0 is not a reason to also publish the choice. The rule
  is "the timeline carries motion, never intentions", and the loopback asserts it by scanning every
  payload for a forbidden key at any depth rather than by trusting this paragraph.

### DD-11 — the single-device auto-fill was kept, scoped to `'single'`, not deleted

The Stage-4 scaffold in `cldCommit()` fills absent seats with a zero-power hold so one device can
watch a Slide end to end; §15 says Stage 5 deletes it. It is now guarded on
`window.syllyMultiplayerMode === 'single'` instead.

**Why keep it:** the deletion and the guard are equally safe in a lobby session — a client returns
before reaching it, and a host is never `'single'` — but the guard leaves the game drivable on one
device, which is what `visual-check` and any future console-driven inspection need. Cold Shoulder is
MDLM-only, so the menu's Play CTA routes to `mpShowModeScreen('cld')` and nothing in normal play
ever reaches this branch. **Why it is not dead-latch shape (BUG-01/BUG-05):** a dead latch is code
whose *presence and absence are indistinguishable*. This one is distinguishable — remove the
`'single'` guard and the host resolves a Slide before its clients have committed. The loopback's
"the gate is still shut with one seat outstanding" check is what pins that down.

---

### DD-12 — "The Floe": a live practice sim in a How-to tab (SW v221)

How to Play gained a second tab, **The Floe** — a `<canvas>` running the real
`window.Physics.simulate()` (5 penguins, fixed slush, `CLD_HOWTO_RADIUS 130`) with *Shove
everyone* / *Resurface* buttons, plus **The Cast**, a 3×2 grid of the six `cldPose` states drawn
through `cldRenderPenguin`. Two goals: let the game be exercised without a lobby, and show the
mechanics in motion.

**Deviation, made knowingly.** `ui-style.md`'s How-to-gallery rules exclude "any *live* running
state a static tab can't represent" from the tab bar. The practice sim is exactly that. The owner
chose the single combined tab over a separate menu screen; it is recorded as a sanctioned
exception in `ui-style.md` § How-to Overlay Standard rather than quietly bent.

**What made it cheap and safe — everything it needs already existed.** The seam
(`cldRenderPenguin`) and the sim (`Physics.simulate`) are the game's own; the tab just calls them.
Nothing new to verify at the rules/packet layer, and the harnesses confirmed it (`verify-cld-loop`
122+163, `mutate-cld` 26/26, `verify-cld-loopback` 168, `verify-mp-configs` 19, `verify-identity-docs`
all still green after the change).

**The one discipline that matters: it is a state island.** All `cldHowto*`-prefixed — its own
canvas, its own penguin array, its own playback clock. It never reads or writes `cldPenguins` /
`cldTimeline` / `cldFloeRadius` / `cldCommits`, never branches on `syllyMultiplayerMode`, sends no
packets. `cldHowtoDrawFloe` re-implements ~25 lines of water/floe backdrop rather than calling
`cldDraw` (which is bound to game-state globals) — a small duplication that buys total isolation.
Its RAF is a timer per § Timer Lifecycle: `cldHowtoStop()` is called on tab-switch-away, on both
close buttons, and in `cldResetState()`, and `cldSetHowtoTab('rules')` from `cldOpenHowTo()` stops
it on every plain open. `visual-check` confirmed the RAF is null after a switch to Rules and after
close. **Lesson:** a "reference playground" is affordable when the game's seam and sim are already
pure and callable — the cost is entirely in the isolation bookkeeping, not the feature.

---

## Bug Index

**BUG-01 — the Berg hit latch was dead code, found by mutation testing, removed.** The first draft
guarded the Berg hit with a `prevContacts` / `hitCharged` pair of Sets so a contact spanning several
substeps could not be charged once per substep. Every harness check passed. Then a planted-drift run
(`CLD_PHYS_SRC=` with the latch deleted) **also** passed — the mutant was indistinguishable.

*Root cause:* the latch sat *below* the `if (vrel >= 0) continue;` approach gate, and that gate
already provides once-per-contact semantics. After the impulse against an immovable anchor the pair
is separating by construction (`v_out = −e·v_in`, so `vrel` becomes `+e·|v_in| ≥ 0`, and exactly `0`
at `e = 0`), so a persisting overlap re-enters the branch zero more times. Same for the second
`contactIters` pass within one substep. The latch could not fire.

*Lesson:* **a guard no test can distinguish from its own absence is either untested or unreachable,
and mutation testing is what tells you which.** The fix was not to invent a scenario contrived
enough to reach the dead branch — it was to delete ~6 lines of state, write down *why* the approach
gate is the real mechanism, and assert the invariant that actually holds: rebounds off a Berg and
hits taken are one-to-one. That is now checked in both directions (a long resting contact costs
exactly one hit; a Snowball driving the penguin back in for a second rebound costs exactly two), and
a mutant that charges before the approach gate fails 5 checks.

**BUG-02 — the impulse guard on immovable bodies was masked by the integration guard.** A mutant
that let immovable bodies accept impulses passed the whole harness: the integration loop skips
`invM === 0` bodies, so a Drowned penguin handed a 400 u/s impulse still never moved and the
position assertions held. It is not harmless, though — a phantom velocity on an anchor skews every
`vrel` computed against it, and the entire restitution asymmetry is read off `vrel`. Added an
assertion that immovable bodies report zero velocity in `final[]`, not merely an unchanged position.
*Lesson:* when two guards protect the same observable, assert the one nearer the cause.

**BUG-03 — `Physics.rng` returned the same first draw for every small seed, so a "seeded pick"
was a fixed one.** `cldPickFreeSlot` seeds a stream and immediately takes one draw. Across seeds
1–40 that draw was **always below 0.0025**, so `Math.floor(rand() * CLD_BERTH_SLOTS)` was always
slot 0 — every Berth filled bottom-up, deterministically, from any small seed.

*Root cause:* raw xorshift32 has almost no avalanche on a 32-bit state. The generator is fine after
a few steps and Stage 1's checks (reproducible from its seed · inside [0,1) · a different seed gives
a different stream, tested at 12345/12346) all passed — none of them looks at the *distribution* of
the first draw across seeds, which is the only property this caller depends on.

*Fix:* four warm-up steps inside `rng()` before the closure is returned. Chi-square of the first
draw over 100k seeds in 10 bins: 0.0 on 9 df, against 100k/40-seed collapse before. Kept in
`physics.js` rather than worked around in `cld.js` — DD-08 exported one generator precisely so
there is one place to fix this.

*Lesson:* **a seeded RNG's contract is the property its caller actually reads.** "Different seeds
differ" is not "the first draw is uniform", and a caller that seeds-then-draws-once only ever sees
the second. Found by a harness check asserting both slots come up across 40 seeds — a check written
because "seeded" was in the spec, not because anything looked wrong.

**BUG-04 — the shunt's clockwise default compared a float to exact zero, so two identical exits went
opposite ways.** §4C: "a dead-straight or zero-velocity exit defaults CLOCKWISE". The sideways
component is `-vx·sin θ + vy·cos θ`; for a purely radial exit that is the difference of two products
equal in real arithmetic and *not* in IEEE, so it lands a few ulps either side of zero with an
arbitrary sign. `if (t === 0)` never fired, and the tie-break resolved by float noise.

*Fix:* a tolerance relative to speed — `if (!(Math.abs(t) > speed * 1e-9)) return +1;`. Written with
the negation so a NaN speed also falls to the documented default rather than off the end.

*Lesson:* **a spec clause that says "dead-straight" is a tolerance, never an equality.** A true
zero-velocity exit (every thaw-drop) would have passed the exact test — the case that breaks it is
the one the spec mentions in the same breath and that no thaw-drop ever produces.

**BUG-05 — Drowned penguins entered the sim correctly, and nothing said so.** Found by mutation,
not by failure: a mutant building every penguin as `kind: 'penguin'` (movable) passed all 152 checks
of the day. A movable Drowned penguin gets shoved off its Berth, and if the shove carries it past
the rim it "plunges" a second time — a state no rule in the game has a meaning for, and one that is
invisible because the second plunge is skipped by `if (p.drowned) return` and the position write is
skipped by `if (!f.plunged)`. The two skips cancel and the rim looks legal.

*Fix:* not to the code — to the harness. One focused case (fire a full-power Slide straight into a
Drowned penguin: it must not budge, must carry zero velocity out, must not plunge) plus the same
invariant swept over all 299 Slides of the randomised sweep.

*Lesson:* the same one as BUG-01, from the other side. **Two guards that cancel are as invisible as
one guard that cannot fire**, and mutation is what tells you the difference. This is now the third
defect in this build that 100+ passing checks could not see and a single mutant could.

**BUG-06 — three defects in the balance instrument itself, two of which made it report confident
nonsense.** An instrument that asserts nothing cannot fail loudly, so every one of these was a
green run with wrong numbers in it. Recorded because the *shapes* recur:

1. **A circular measurement.** The first § D reported "perfect lead hit rate: 100.0%" across every
   speed and radius. It was defined as *the target's position at the ball's arrival time*, then
   scored by asking whether the target was at that position at that time — a tautology, printed as
   a result. Replaced with a **dwell window**: how many ms of arrival-time error that same point
   tolerates, which is what a player is actually estimating. The tell was a number that did not
   move when its inputs did.
2. **A metric measuring the opposite of its label.** "Target barely moved (<20 units)" used *net*
   displacement over the Slide, so a penguin shoved hard into a Berg and rebounded home counted as
   parked — while being nowhere near that spot when a ball arrived. It read 15.5%; measured against
   *peak* drift, the real figure is 98.0%. Net displacement is almost never the right definition of
   "didn't move" in a physics context.
3. **A regex the shell ate.** `§ G`'s constant sweep built `new RegExp('(const ' + name +
   '\\s*=\\s*)...')`, and the heredoc that wrote the file collapsed `\\s` to `s` — so the pattern
   became `const X s*=s*`, matched nothing, and printed `ERROR no such const` on every row while the
   tool still exited 0. Patterns in this repo's tooling now use `[ ]*` rather than `\\s*` where a
   space class will do. Cross-reference: `feedback_indexhtml_encoding` — same class of shell-
   mangling, different file.

**Lesson:** the three `verify-*` harnesses fail loudly and get mutation-tested; the instrument does
neither by design. So a number it prints is only as good as an independent reason to expect it.
Every metric in it now either has a stated oracle (§ A recomputes §4B's table from the constants,
§ D states §4D's force curve independently) or is a *comparison between rows*, where a systematic
error cancels.

**BUG-07 — a top-level `window.addEventListener` broke every headless harness at parse time.**
The resize listener was written at file scope, copying the `asherplane.js` shape. That file is
only ever loaded by a browser; `cld.js` is loaded by three harnesses into a bare `vm` sandbox
that stubs `document` but not `window.addEventListener`, so all 121 physics checks and all 162
loop checks died on the *first line executed*, before a single assertion ran. **Root cause:**
copying a pattern from a file with a different loadability contract. **Lesson:** the rule this
file's own header states — nothing at parse time but constant declarations and the
`DOMContentLoaded` binding — has to be applied to *listeners* too, not just to calls that
obviously touch the DOM. The listener now lives inside `DOMContentLoaded`, whose callback simply
never fires in the sandbox. That is the property that makes it safe, and it is worth preferring
to a `typeof` guard for exactly that reason.

**BUG-08 — the canvas letterboxed a 360×360 square into a tall stage, leaving ~250 px of dead
page above and below the water.** Straight `apResize()` reuse: asherplane's logical space is
360×640, which nearly matches a phone, so fitting a square into a 616 px-tall stage looked fine
in code and wrong on screen — the dark water rectangle's hard edge against `stone-50` read as a
rendering fault. **Fix:** the canvas now fills the stage; `CLD_VIEW_FIT` (330 logical units)
is fitted to the *short* axis and the long axis simply shows more water. The physics world is
still exactly 360×360 centred at (180,180) — no coordinate or determinism change. **Lesson:**
a borrowed resize routine carries the *aspect ratio* of the game it came from as a hidden
assumption. `cldToLogical` had to learn the same offset, or every aim would be wrong by half the
letterbox band.

**BUG-09 — the player tint, which is the entire identity signal, was buried under the belly.**
The first procedural draw gave the belly nearly the whole silhouette (−0.54r…+0.74r), so at the
game's true ~24 px a penguin rendered as a *cream* disc with a thin coloured rim and six seats
were indistinguishable at a glance. Found immediately by looking at a screenshot; invisible to
every harness, and not something the shape's own code suggests. **Fix:** belly shrunk to a
front-of-chest shape, ring carries the full tint rather than a lightened wash, and "me" gets a
white outer ring. **Lesson:** in a game where colour *is* the seat, check the colour survives at
the size it ships at — the spec's own art decision (§10) rests on a 24 px judgement, and so must
every drawing choice under it.

**BUG-10 — an armed aim was never drawn, so arm-then-commit had no visible armed state.**
`cldDrawAim` read `cldArmedAimFor(cldDragPenguin)`, and `cldDragPenguin` is `null` the moment the
finger lifts. The vector therefore vanished at exactly the point the player is meant to look at
it and decide whether to commit — and the split between arming and committing is the *only*
safety net between a fat-fingered drag and a lost Floe-Off (brief §14). The same bug hid the
second aim in Peck Off, where both penguins can be armed at once. **Fix:** draw every aim I own,
plus the live drag, with the live one weighted heavier. **Lesson:** a state that exists only to
be *reviewed* is worthless if it is not rendered; when a design names a state ("armed"), check
there is a pixel that says so.

**BUG-11 (drawing, caught at chrome scale) — flippers reached wider than the body itself.**
They extended to ±1.15r laterally against a body half-width of 0.86r, so they broke the
silhouette instead of extending it: two lumps reading as ears. Completely invisible at the
in-game 24 px, obvious the moment the *same seam* drew the result screen at r=32. **Lesson,
and the cost of the one-seam decision:** using one render function for gameplay and chrome is
right (§10 — there is no second code path to diverge), but it means a shape tuned at 24 px gets
enlarged 3× somewhere else in the game. Check the seam at both scales, not just the one the
art decision was argued at.

---

## Multiplayer Lessons

**ML-01 — A client's local count proxy must be written BEFORE the send, not after.** `cldCommit()`
originally sent the private `CLD_COMMIT`, then set `cldCommits[cldMyIdx()] = true` for immediate
tally feedback. In the app that works, because `mpSendPrivate` is async and the host's answering
`CLD_SLIDE_TALLY` cannot arrive before the next statement. In the loopback harness the wire is
synchronous, so the host's authoritative tally (`locked: 2`) landed *inside* the send call and the
line after it then overwrote the array with a third entry — the committing client read "3 of 3
locked in" while the other read "2 of 3". **Root cause:** two writers to one variable, ordered only
by the network. **Lesson:** where a device keeps a local optimistic copy of state the host also
owns, write the optimistic value *first* and let the authoritative reply be the last word. Then the
ordering is correct under both timings, and the synchronous harness is testing the same code the
async app runs rather than a lucky interleaving.

**ML-02 — The host replays its own broadcast PAYLOAD, not its own timeline — and that is what
makes the payload provably complete.** Spec §16 Q5 asks the host to replay its broadcast samples.
The literal reading (feed `cldResolveSlide`'s return value into `cldBeginPlayback`, and separately
build a packet for clients) still leaves two objects that can drift. The shipped shape is
`cldHostResolveSlide()` → `cldTimelinePayload(tl)` → `mpSendEnvelope` **and**
`cldBeginPlayback(cldTimelineFromPayload(payload))`: host and client run the *same two functions*
over the *same object*. A field left out of the payload now breaks the host — the device someone is
holding — rather than only the devices nobody is watching. `cldApplyPost()` closes the loop: the
resolved rim is applied from the payload on every device, and on the host that assignment is a
no-op by value, which is exactly the property being asserted.

**ML-03 — The tally is a count, and the way to *prove* it is to scan the payloads, not the
source.** The obvious check — grep `cld.js` for `cldCommits` inside an `mpSendEnvelope` call —
fails on the correct implementation, because `cldBroadcastTally` legitimately reads `cldCommits` to
derive `locked`. The check that means something is behavioural: record every payload the host puts
on the wire across the whole session, then walk each one recursively for a forbidden key
(`commit`, `aims`, `dive`, `snowball`, `power`, `dx`, `dy`) at any depth. That check is
implementation-independent, survives refactors, and caught the deliberate `tally-names-players`
mutant. **Generalise:** a privacy invariant is a property of the traffic. Assert it on the traffic.

**ML-04 — Two clients, not one, or "broadcast" and "reply to the sender" are indistinguishable.**
A two-device loopback cannot tell those apart: every packet the host sends reaches the only client
there is. `CLD_SLIDE_TALLY` and `CLD_SLIDE_RESOLVE` both have to reach the seat that did *not* just
submit, and that is only observable with a third device in the room. Cost: about fifteen lines.

**ML-05 — The Washout replay had to be host-gated even though every device runs the same timer.**
`cldEndPlayback`'s Washout branch arms a `setTimeout` on every device, and it originally called
`cldStartFloeOffLocal()` unconditionally. On a client that seeds its *own* penguins and Bergs from
its *own* `Date.now()`, diverging until the host's `CLD_FLOEOFF_START` overwrites it — self-
correcting, and therefore the kind of divergence that never shows up in testing but is visible for
a second on a real device. The client now parks on standby and waits. **Generalise:** any local
timer whose callback *authors* state, rather than merely displaying it, needs the same host gate as
the button that would have authored it.

**ML-06 — The host’s "ignore a SYNC I authored" guard was dead-latch shaped until the harness
doctored a packet.** `cldHandleEnvelope` returns early on `syllyMultiplayerMode === 'host'` before
the SYNC switch. In a real room the engine’s `originId === syllyDeviceUid` filter already stops
delivery, so a mutation that deletes the guard passed every check — presence and absence were
indistinguishable, exactly the shape BUG-01 cost a mutation run to find. The obvious fix (replay the
host’s own `cldFloeOffStartPayload()` at it) is *also* vacuous: it rebuilds identical state, so it
passes whether the guard exists or not. What distinguishes it is a **doctored** packet — the real
payload with `floeOffNo: 99, radius: 42` — plus the paired check that the same doctored packet DOES
move a client. **Generalise:** to prove a guard, you need an input the guarded path would visibly
act on. If replaying real traffic cannot tell the two apart, the test is measuring nothing, and the
next question is whether the guard should exist at all. Here it should: it is what stops a replayed
or mis-routed packet rebuilding the authoritative floe out from under the simulation that produced it.

**ML-07 — The Washout replay needed its own loopback scenario, and a Slide could not reach it
reliably.** Twelve mutants were driven through the harness; `washout-not-host-gated` (deleting the
client gate added in ML-05) was the only one that survived the first pass, because nothing in the
run ever reached a Washout. Forcing one with a Slide means depending on a collision outcome — the
last Standing penguin has to clear a rim of Drowned bumpers and any Bergs. Forcing one through **The
Thaw** is pure geometry: drown everyone but one seat, park that seat one unit inside the rim, and
the next shrink takes it in. Deterministic, and it exercises the path a Slide-only scenario cannot —
`cldCheckWashout()` firing *after* the Thaw step (§12). **Generalise:** when a scenario is hard to
reach through the mechanic you first think of, look for a second mechanic that reaches the same
state by construction.

---

## Template Gaps

**TG-01 — CLOSED (Stage 2). The Ice Conditions constants moved into `cld.js`, and the harness now
reads them from there.** `CLD_V_MAX`, `CLD_R_STD`, `CLD_SNOWBALL_R`, `CLD_SNOWBALL_SPEED`,
`CLD_MIN_RADIUS_MULT`, `CLD_ICE_MULT`, `CLD_FLOE_SIZE` and the five derived helpers now live in
`js/games/cld.js`; `tools/verify-cld-physics.js` evaluates that file in the same vm context and
pulls them back through a bridge script (`cld.js` declares them with `const`, so nothing lands on
the sandbox object by itself), and accepts `CLD_SRC=` alongside `CLD_PHYS_SRC=`. The loop harness
asserts the move mechanically: the physics harness must mention `CLD_SRC` and must declare no
literal `CLD_V_MAX`/`CLD_ICE_MULT` of its own, so a future copy-paste back into it fails a check.

The three flagged Stage-1 proposals (`CLD_SNOWBALL_R = 4`, `CLD_SNOWBALL_SPEED = 260`,
`CLD_V_MAX = 150`) are still proposals, and Stage 2 adds two more for the balance instrument to
move: **`CLD_THAW_STEP = 8`** (units shed per Slide — 8 gives a Standard floe ~8 Slides before it
floors) and **`CLD_BERG_COUNT = 3`**. All five carry a `[Stage-3 tunable]` marker in the source.

**TG-02 — a verification harness earns a planted-drift pass, not just a green run.** [Stage 2: the
runner is now `tools/mutate-cld.js`, 23 mutants across both files, all caught — see TG-05.] Both bugs above
were invisible to 119 passing checks and visible immediately to a mutation run. The `[ABBR]_SRC=`
env override that `verify-cjar-loopback.js` introduced for the loopbacks is just as valuable on a
pure-logic harness: ten mutants (batched Snowballs, explicit Euler, viscous damping, flattened
restitution, a shattered Berg left in the sim, unquantised samples, a splash-radius Snowball, the cap
not forcing rest, and the two above) are what turned "the checks pass" into "the checks discriminate".
Worth writing into `logic-engine.md` § MDLM Patterns alongside the existing loopback guidance if a
second harness adopts it.

**TG-03 — PARTLY CLOSED (Stage 4).** `physics.js` now has its `<script>` tag and its
`logic-engine.md` § Shared Library Modules row. The `sw.js` precache line and the `CACHE_NAME`
bump remain deferred to Stage 6, which is correct: precaching is the last step, and bumping now
would ship a version for a game that cannot yet be reached from the lobby without Stage 5's
`MP_GAME_CONFIGS` entry.

**TG-04 — a harness check whose expected value comes from the code under test proves nothing, and it
is easy to write one by accident.** Three of Stage 2's first-draft checks did it:
`close(inp.events[0].force, cldSnowballForce(40, …))` compared the game's force helper against
itself; the Dive check compared the timeline's frame 0 against the penguin's *post-resolve* position,
and both went stale together under a mutant. The tell is that the expected side of the assertion
calls into `cld.js` at all. Replaced with independent oracles — §4D's own numbers (40% of `v_max`
point-blank, 20% at max range, linear between, and **invariant under Ice Conditions**, which is what
catches a force accidentally scaled by slide distance), and the Berth slot's own geometry via
`cldSlotAngle`. Worth a line in `logic-engine.md` if a second harness hits it.

**TG-05 — mutation testing is now this build's primary defect-finding tool, and it should be a
first-class artefact rather than an ad-hoc script.** Five of this build's defects (BUG-01 through
BUG-05) were invisible to a green harness and obvious to a mutant; two of them are *harness* defects
that no amount of adding checks would have surfaced. The Stage-2 runner carries 23 mutants across
both files (`CLD_SRC=` / `CLD_PHYS_SRC=`) and all 23 are caught. It currently lives in the session
scratchpad, which means it is re-derived every time. So it did **not** stay there: it ships as
**`tools/mutate-cld.js`** (`node tools/mutate-cld.js`, exits 1 if any mutant survives, writes its
throwaway copies to an OS temp dir). A green harness is a claim; this is the only thing that checks
the claim, and it is worth the one extra file. **Re-run it after touching `cld.js`,
`physics.js` or `verify-cld-loop.js`, and add a mutant whenever a new rule lands** — a rule nothing
can distinguish from its own absence is not verified. Its `CLAUDE.md` harness-table row goes in
with the rest of Stage 6's documentation closure.

Note the failure signature to expect: a mutant that reports **`CAUGHT (threw)`** rather than a
failed-check count has crashed the harness instead of failing a check. That still counts as caught,
but it means the assertion covering that rule is a side effect of something else running, not a
check aimed at it — `shunt-one-hop-only` and `shunt-ignores-free-count` both do this (they reach
the loud-failure branch), and that is correct here: the loud failure *is* the specced behaviour.

**TG-06 — changing a constant means re-proving every check that mentioned it.** Stage 3 moved
`CLD_SNOWBALL_SPEED` 260 → 600 and `verify-cld-loop.js` held `cldSnowballArrivalMs(260) === 1000`
— a check that pinned the *literal shipped value*, so the only way to keep it green was to edit the
expected number, which is the same as deleting it. Restated to pin the **unit** instead:
`cldSnowballArrivalMs(CLD_SNOWBALL_SPEED) === 1000` — "one second's worth of distance takes one
second" — true at 260, at 600, and at whatever a playtest picks next. Two new mutants
(`snowball-arrival-halved`, `snowball-arrival-is-instant`) prove the restatement still bites; per
TG-04 a restated check that has not been re-mutated is indistinguishable from a removed one.

**TG-07 — the mutation run found a gap the constant change opened.** With
`snowball-radius-dropped-from-the-event` (`radius: CLD_SNOWBALL_R` → `radius: 0`) all 160 checks
passed: the ball became a *point*, shrinking the contact test from 19 units to the penguin's own
11, and nothing anywhere said the event carries a radius at all. §4D calls it "a contact test, not
a blast" — a test of zero size is not one. Closed with one check in `cldBuildSlideInputs`'s block
(check 161). **The general rule:** a mutation suite is only current as of the last time the code
changed shape. Re-run `tools/mutate-cld.js` after any constant resolution, not just after a logic
edit — the mutants that matter are the ones the change just made possible.

**TG-08 — a whole-file source grep stops meaning what it says the moment the file grows a second
layer.** `verify-cld-loop.js` asserted "resolution never draws an unseeded random number" as
`src.includes('Math.random')` over the entire plugin. That was exact while `cld.js` was rules-only,
and became wrong the instant Stage 4 added a UI layer that legitimately picks an intro flavour line
and a plunge bark. The property still held — both Slide seeds are `Date.now()`-derived and travel
into `Physics.rng` — but the check could no longer distinguish "resolution is seeded" from "the
file mentions Math.random". Narrowed to the rules layer, with a companion assertion that the split
actually found the boundary (a split that silently matches nothing would make the check vacuously
pass — the same dead-latch shape as BUG-01/BUG-05). **Generalise:** any harness check implemented
as a grep over a whole file has an implicit assumption about what that file contains. When a file
gains a layer, re-read its greps before trusting the green. **Also:** split on a landmark that
survives the transformation — the first attempt split on the `STAGE 4 OF 6` banner, which is a `//`
comment and had already been stripped by the check's own comment-removal step.

**TG-09 — `visual-check` found four defects that 309 green assertions could not, and three of them
were about *meaning*, not pixels.** The harness tier proved the rules; the browser tier proved the
game was legible. BUG-08 (dead bands), BUG-09 (seats indistinguishable), BUG-10 (armed state
invisible) and BUG-11 (flippers) are all invisible to `getElementById: () => null`, and BUG-09/
BUG-10 would not have been caught by a `getBoundingClientRect` measurement either — they needed an
eye on a screenshot. **The measurement half still earned its place:** it is what confirmed the
`h-screen` exception actually holds (section height == viewport, no page scroll) at 3, 6 and 8
players, that the power bar's wrapper padding really clears 44 px, and that the podium's medal slot
reserves width on medal-less rows (all six name lefts at 66 px). **Lesson for the next canvas game:**
budget a screenshot pass *inside* the build stage, not after it — three of these four would have
shipped to a real-device session otherwise, and one of them (BUG-10) reads as a rules bug when you
hit it.

**TG-10 — A loopback harness that reads a packet field unguarded turns a finding into a crash, and
the checks after it are never reported.** Six deliberately-broken copies of `cld.js` were driven
through `CLD_SRC=` to prove the new harness fails before the code makes it pass. Two of them
(`public-commit`, `raw-events`) ended the process with a `TypeError` on a line like
`privateSends[0].to` or `H_TL.post` — the *correct* check had already failed one line earlier, but
the run stopped there and the remaining ~100 assertions were never printed. That reads as a broken
harness rather than as the finding it is. Two fixes, both worth copying into the next loopback:
(1) guard every read of a packet or timeline that a broken build might never produce
(`privateSends[0] || { … }`, `H.timeline || NO_TL`); (2) install a top-level
`process.on('uncaughtException')` that prints the stack as a **failed check** and exits 1, so a
crash anywhere is a failed run with its recorded failures intact. Both are cheap and only matter
when something is already wrong — which is the only time a harness is being read.

**TG-11 — Wrap playback pumping in try/catch, for the same reason a mock DOM has real elements.**
`logic-engine.md` § MDLM Patterns already says a loopback needs real mock elements, because
`getElementById: () => null` means no render code executes and a render throw inside a SYNC applier
is invisible. The corollary: once render code *does* execute, a throw has to be **recorded** rather
than propagated. `playback()` drives `cldAdvancePlayback` in a loop through `vm.runInContext`, and
an applier throw there escaped straight past the "nothing threw on any device" checks that exist to
catch exactly it. Wrapped, and pushed onto `dev.__errors` — the `raw-events` mutant went from a
crash to 16 reported failures.

**TG-12 — `cldPhase` is not reset when a Floe-Off ends, and a harness assertion that reads it
across screens will read stale.** `cldEndPlayback` → `cldShowResult` leaves `cldPhase` at
`'resolving'`; nothing clears it until the next `cldShowFloe()`, which sets it to `'aiming'` before
it is next read. Harmless in the app — `cldPhase` only means anything while `screen-cld-floe` is up,
and every entry point to that screen goes through `cldShowFloe()`. It is recorded because a loopback
assertion originally used `phase !== 'resolving'` to prove a client cannot resolve a Slide, and that
check read the previous Floe-Off's leftover value. It now asserts the properties that actually
matter — the Slide counter did not move, no timeline was built, nothing was broadcast. **Generalise:**
assert on the state a function *writes*, not on a mode flag that happens to be adjacent to it.

**TG-13 — Under The Thaw, playback shows the contracted floe from the Slide's first frame. Deferred,
not a Stage 5 regression.** `cldThawStep` mutates `cldFloeRadius` inside `cldResolveSlide`, so by the
time playback begins the radius is already post-Thaw — on the host in Stage 4, and now identically on
every device, since the packet carries the post-Thaw `radius` and both sides build their timeline
through `cldTimelineFromPayload`. Host/client parity is therefore exact and this is **not** a
multiplayer defect. But the Thaw's own beat (`{ type: 'thaw', newRadius, fromRadius }`) plays into a
floe that already shrank, so the shrink is inaudible visually — the one moment the Sylly Mode exists
to sell. The fix is small (`radiusAtStart` on the timeline, set at `cldBeginPlayback`; set
`cldFloeRadius = b.newRadius` on the thaw beat) but it is a **Stage 4 presentation change**, and
changing playback behaviour inside the multiplayer stage would put an unrequested visual edit behind
a packet-layer green. Flagged for the owner: worth doing before the real-device session, since The
Thaw is unreadable without it.

**RESOLVED — SW v220 (4 Sep 2026).** Done as spelled out, one nuance: no `radiusAtStart` field was
needed on the timeline. `cldBeginPlayback` is a shared code path (host, client and single all reach
it through `cldTimelineFromPayload`), and the pre-Thaw radius is already on the wire inside the
`thaw` aftermath beat's `fromRadius`. So the whole fix is two lines in shared functions:
`cldBeginPlayback` does `const cldFirstThaw = (tl.aftermath || []).find(b => b.type === 'thaw'); if
(cldFirstThaw …) cldFloeRadius = cldFirstThaw.fromRadius;`, and the `thaw` case in
`cldPlayAftermath` gains `cldFloeRadius = b.newRadius;` before its `cldSfx('thaw')`. Beat order
inside `cldThawStep` (`[thaw, (thaw-drop, surface)*]`) means the radius is already contracted before
any thaw-drop plunge plays, so those still land against the small floe. `cldEndPlayback` →
`cldApplyPost` still sets the authoritative final radius, so the end state is unchanged. No packet,
sim or rules change; `verify-cld-loop` 122+163, `mutate-cld` 26/26, `verify-cld-loopback` 168 all
still green (loopback §11 already asserted the post-Thaw radius crosses the wire — that contract is
untouched). Real-device readability of the shrink itself is part of the still-open phase 40 gate.
**Lesson:** when a "timeline needs a new field" fix is proposed, check whether the value is already
reachable from a beat the packet carries — here `fromRadius` was, and adding a field would have meant
touching both timeline builders instead of one shared entry point.
