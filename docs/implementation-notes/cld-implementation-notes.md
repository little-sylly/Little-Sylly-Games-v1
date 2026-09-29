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
*Superseded by DD-17 (SW v243): rim-slice Berths, the two-slot Berth, the shunt and this capacity
invariant are all gone. Kept as history.*
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

### DD-16 — the Berg ring: ~80% of the rim, random slip gaps, Ice Breaker 1/2/3 (SW v242)

**Why.** The first live 3-player session (28 Sep 2026) found Floe-Offs over too fast. The
instrument agreed: three r=12 Bergs guarded ~10% of the rim, and a 3-player Floe-Off lasted a
median **3** Slides on Slush with the Thaw and **2** on Black Ice.

**What changed (owner calls in bold).**
- **The ring covers ~80% of its circumference** (`CLD_RING_COVER`), Bergs now r=16. The count is
  derived from the floe's own circumference, never fixed, so Cramped gets fewer chunks than Roomy
  and nothing overlaps (Standard ≈ 17).
- **Gaps are random, not uniform.** 2–3 **slip gaps** of 1.6–2.4 penguin diameters (some easy, some a
  squeeze) at random places; the rest of the spare arc is split into hairline cracks by random
  weights. A small ring that can't fit its slip gaps at full width scales them back to the minimum,
  then drops a chunk — never a slip gap, never an overlap.
- **Ice Breaker is 1 / 2 / 3 hits, default 2.** Off is gone from the UI: with no ring a Floe-Off is
  too short. `cldIceBreaker = 0` still means "no ring" internally, for harness isolation.
- **The Thaw calves the ring** (`cldProjectBergsToRim`): after projecting inward, any Berg that
  would overlap the last one kept breaks off (the more-damaged of the pair goes). Without this a
  shrinking ring piled up on itself.

**Measured** (`simulate-cld-balance.js 60`, 3 players, mean Slides/Floe-Off): Slush+Thaw 3.8 → 5.8,
Slush 7.9 → 13.7, Black Ice 2.3 → 7.7, Black Ice+Thaw 1.6 → 5.2. Overall 8.08 → 13.04. **Watch:**
Powder with no Thaw now runs 26–40 Slides with the neutral bots, and 2.3% of Floe-Offs hit the
instrument's 60-Slide cap. Bots do not aim at each other, so a real table will run shorter, but
Powder is the first place to look if a playtest drags. Thaw Washouts rose 14% → 16%.

**Not changed yet (owner's design round):** where the Drowned sit relative to the ring. They still
take the fixed Berths on the rim, so they overlap chunks visually. The owner's Drowned-plug-the-gap
model and a Washout sudden-death floe are the next design pass. *(Done — DD-17, SW v243.)*

### DD-17 — the Drowned plug the gaps; Throw or Dive; a Washout is an Ice Bath (SW v243)

**Why.** With an 80% ring (DD-16) the fixed rim-slice Berths no longer matched the picture: the
Drowned sat on top of chunks, and the slices had nothing to do with where anyone could fall. Spec:
`docs/superpowers/specs/2026-09-28-cld-drowned-plugs-design.md`.

**What changed (owner calls in bold).**
- **A penguin goes in only through a gap and plugs it instantly, mid-Slide** — the first one's bottom
  blocks the second. `js/lib/physics.js` gains one generic option, `params.seatOnPlunge(x, y, vx,
  vy, anchors)`: the caller answers *where*, the sim makes the body a one-hit immovable there
  (`seat` event). Absent → byte-identical to v242. Any immovable with numeric `hits` is breakable
  (`damageAnchor`): a Berg `shatter`s, anything else `knockback`s.
- **A plug absorbs one contact, then is Knocked back** (bobbing `CLD_BACK_OFFSET` outside the rim,
  not a body). **Displacement is automatic; every arrival is Plugged.**
- **Throw or Dive, only while Knocked back, resolved before the Slide**; **contested spots go to the
  closer penguin** (short arc on the ring), ties to seat order. A commit carrying both keeps the Dive.
- **Washout → the Ice Bath:** the penguins Standing going into the washing-out step (the Slide, or
  the Thaw's melt) on a ringless floe `max(1.25 × cldMinRadius(), size × √(n/total))`; the rest
  re-seated Plugged on its rim; same Floe-Off, same Fish. `CLD_FLOEOFF_START.bath`.
- Spec-level calls (for owner review): plugs seat on the **chunks' own circle** (`cldBergInset()`)
  and **centre** in any gap under 3 diameters — the seal harness proves a centred plug holds the widest
  slip gap against a full-power shove at every offset; a Snowball on a plug does nothing; plugs beat
  chunks when the Thaw squeezes them (the later-seated of two colliding plugs is knocked back).
- One geometric primitive, `cldSeatSpotFrom(anchors, angle)`, answers every arrival path (plunge,
  displacement, Dive, Thaw-drop). Wire: `dive: null | {penguinId, angle}`, penguins carry
  `plug/angle/seq`, the timeline carries `bodyIds` (samples are positional by it — a Knocked-back
  penguin is not a body) and `bathIds`. `MP_PROTOCOL_VERSION` → `'v243'`.

**Measured** (`simulate-cld-balance.js 60`, CLD_SEED default, mean Slides/Floe-Off — a Floe-Off now
runs through its baths): 3p Slush+Thaw 5.8 → **6.2**, 3p Slush 13.7 → **17.0**, 3p Black Ice 7.7 →
**9.8**, 5p Slush 14.8 → **15.4**. Plugs 0.34/Slide, knock-backs 0.18/Slide. Ice Baths in 20.3% of
Floe-Offs (Thaw off 7.3%, Thaw on 33.2%); a bath lasts **1.1 Slides** against 8.7 before the first
one, so `CLD_BATH_FLOOR_MULT` stays **1.25** (the rule was: raise it only if a bath outlasts the
Floe-Off that produced it). **Watch:** Powder with no Thaw is longer again — 3p 34.8 mean, p90 at the
60-Slide cap (15 stalls across 2,160 Floe-Offs). Same caveat as DD-16: the bots do not aim at each
other, so a real table runs shorter. Powder is still the first place to look if a playtest drags.

**Found while building it** (all fixed before shipping): BUG-13 (displacement inside the timeline
walk), BUG-14 (the canvas spilling over the Drowned row), the free-seat drawing that never drew a
slip gap's centred seat, and a client's Washout timer that could park it on standby after the bath
packet had already arrived (the `CLD_FLOEOFF_START` applier now clears it when `bath` is set).

### DD-18 — the pool-style cue, and a Practice Arena on the real rules (SW v244)

**Why.** The first live 3-player session (28 Sep 2026) called the drag **clunky**: a grab radius of
~20 px at 320 wide, a pull of ~113 CSS px for full power that varied by phone, and the feedback line
drawn behind the penguin — under the thumb. Spec: `docs/superpowers/specs/2026-09-28-cld-cue-arena-design.md`;
plan: `docs/superpowers/plans/2026-09-28-cld-cue-arena.md`.

**What changed (owner calls in bold).**
- **Cue from anywhere** — the finger is the butt of the cue, the shot goes away from it
  (`dir = unit(P − F)`); power is the pull since touch-down in **CSS px** (`CLD_CUE_PULL_PX` 96, so
  full power is the same thumb travel on every phone); inside `CLD_CUE_DEAD` (2 × `CLD_PENGUIN_R`) the
  aim holds. All pure in `cldCueAim`; `cldReleaseAim` decides what a release arms for both surfaces.
  `CLD_CUE_TAP_PX` (4) was added at planning: with the bar locked, power no longer comes from the
  pull, so without it a plain tap would re-aim at the locked power. **The wire is unchanged** — an
  armed aim is still `{ penguinId, dx, dy, power }`.
- **Ghost + fixed-length stub** (`cldAimGuide`) — one contact deep, direction only.
- The renderer is **model-fed**: `cldDraw(view, m)` reads only `cldFloeModel()` / `cldArenaModel()`,
  so the Arena is drawn by the floe's own renderer. DD-12's hand-built `cldHowtoDrawFloe` copy retired.
- The replay is **split**: `cldStepPlayback(dtMs, hooks)` returns `'done'` and never navigates; only
  the live `cldAdvancePlayback` calls `cldEndPlayback`. The loopback proves the live replay unchanged.
- **The swap** (`cldArenaRun`) — the Arena keeps its own record and runs the real rules through a
  swap into the module globals for one synchronous call, restored in `finally`. Chosen over threading
  state through the v243 core (too large a diff) and over an Arena-lite copy (the drift D2 forbids).
  It **bends DD-12's wording** ("never reads or writes `cldPenguins`") and keeps its intent: the live
  match is never disturbed, proven by 20 Arena Slides run between live replay steps.
- **Three drills, pick one**; **the Berth branch only if you go in**; tabs **The Rules | Practice |
  The Cast**. `CLD_PR_DRILLS` as shipped — the plan's `place`/`shoves` held unchanged; `--tune`
  gave the ring seeds:

  | Drill | `ringSeed` | `slideSeed` | `gapAt` | place (at, r) ×3 | shoves |
  |---|---|---|---|---|---|
  | Head-on | 4 | 1 | 0 | (0, .62) · (0, .05) · (−π/2, .6) | Sylvia → You, 1.0 |
  | Crossfire | 1 | 1 | — | (0, 0) · (π, .6) · (0, .6) | Sylvia → Sam, 0.9 |
  | Edge | 19 | 1 | π/2 | (π/2, .8) · (π, .6) · (π/2, .45) | Sam → You, 0.7 |

**Found while building it** (the SE visual pass, 320×452 / 375×548 / 375×667):
- **The Practice stage squashed to 0 px tall.** As a flex child of the scrolling body, with
  `overflow-hidden` giving it a min-height of 0, `flex-shrink` took its whole height; the canvas was
  never sized and a drag landed on Resurface. Fixed with `flex-shrink: 0` on `#cld-pr-stage`. No
  harness could see it — a mock element has no box.
- **The aim guide was invisible** — white on near-white ice (v243's dot had the same problem). The
  guide now draws in the game's dark ice-blue at partial alpha.
- **Logged, not fixed:** the coach card (132 px) and the stage cannot both fit the Practice body's
  visible height at any SE size (213 / 290 / 385 px); the stage alone fits at all three. And a
  *mouse* drag off the stage releases on `pointerleave` (touch has implicit pointer capture, so phones
  are unaffected). Both in `docs/deferred-work.md` § Cold Shoulder.

**Lesson.** A swap is safe exactly as long as the call is synchronous and the list is complete — so
the list is checked against the source (`verify-cld-practice.js` reads every top-level `let`), not
remembered. And a layout bug in a pane no harness renders is found only by a real browser: the
141-check harness was green over a stage that was 0 px tall.

### DD-19 — plugs in the Drink, a bigger floe, a camera, and Practice plans (SW v245)

Spec: `docs/superpowers/specs/2026-09-29-cld-fun-pass-design.md` § 3; plan: `docs/superpowers/plans/2026-09-29-cld-fun-pass-phase1.md`.

**Why.** The owner's v244 review: one practice bot did nothing, a drill was one Slide, a drowned penguin
sat on the ice ring instead of in the water, and the board was too small to have fun on.

**What changed (owner calls in bold).**
- **Plugs float fully in the Drink**, touching the edge from outside: `cldSeatR()` = rim + `CLD_PLUG_OUT`
  (one radius); Knocked back drifts `CLD_BACK_OFFSET` = 2.2 r. A seat opens only where a penguin could pass
  the chunk ring — each anchor's ban is taken at its OWN radius — so a plug is never behind a chunk. Slip gaps
  cap at **1.8** diameters (was 2.4): the widest one floating plug seals on Roomy, Standard and Cramped
  (the seal proof uses an unbreakable plug — with the real one hit, a glancing blow knocks it back and the
  shover may follow it in, which is the rule, not a leak). Plugs can no longer calve a chunk
  (seat − chunk circle = r + r_berg exactly), so that filter was deleted.
- **A bigger floe, a stronger shove**: radii ×1.3 (195 / 170 / 143), `CLD_V_MAX` 195, Snowball 780, Thaw
  step 10 — every derived distance scales, penguins do not (~2× the ice each).
- **A camera** (the view no longer holds the whole floe): overview at each Slide start → aim cam (1.14,
  32% toward you) → slide cam (moving bodies ∪ you, ≤ 1.25); pinch/pan, double-tap back to auto; a
  mini-map above zoom 1.05. **It never moves under a finger** — the style prototype showed a camera that
  frames the aim feeds back into the aim.
- **Practice: each drill is a plan both bots follow**, played as a **real Floe-Off to a natural end** (Ice
  Bath included, 40-Slide draw cap), with a coach that reacts to what happened and a full-height sheet whose
  coach floats over the water. Crossfire's bots are unequal (0.95 / 0.8): equal head-on shoves swap
  velocities and replay the same Slide forever. Drill seeds (`--tune`): Head-on 1, Crossfire 1, Edge 3.
- Folded in from v244's minors: pointer capture on both stages, Aim Assist read on every Practice open,
  reduced motion stops the idle clocks, Peck Off's selection ring only while aiming.

**Found while building it.** The Arena had always opened on an unsized 300×150 canvas: `cldOpenHowTo` picked
the tab (which sizes the canvas) before showing the overlay — visible in the v244 screenshot's black strip.
Now the overlay shows first and `cldPrLoop` refits whenever the stage box changes. And three mutants
survived the new geometry because the overlap sweeps that used to catch them by side effect went quiet
(plugs can't overlap chunks any more); they now have direct checks (a pre-seated plug is knocked back, the
rng's first draws spread, a wide-gap seat sweep). SE stage heights: 291 / 269 / 173 px at 375×667 /
375×548 / 320×452 — the smallest is workable but small (owner to judge in hand).
The whole-branch review then found two more, both invisible to the mock-DOM harness: the stage's pointer
capture stole the end card's click, so **Practice again was dead with a mouse** (the card is now skipped
before capturing — proved with a real-Chromium `page.click`, red on the old code); and a camera target
that moves every frame made reduced motion *cut* every frame (the Slide camera now holds). A lost
pointer-up could also have left every later touch reading as a pinch; a new primary touch now clears the
finger list.

**Lesson.** A camera must never move the world under a finger; and an invariant that stops being reachable
takes its mutants' coverage with it — when a rule makes an old failure impossible, re-run the mutants.

**Balance** (`simulate-cld-balance.js 60`, `CLD_SEED` default, mean Slides/Floe-Off; target ±15% of v244):

| config | v244 | target band | v245 first cut (gaps [2,3], cover 0.80) | [3,4] 0.80 | [3,4] 0.75 **shipped (provisional)** | [4,5] 0.80 | [4,5] 0.75 | [3,4] 0.85 | [2,3] 0.75 | [3,4] 0.70 | [3,4] 0.65 | [4,5] 0.70 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 3p Slush | 17.0 | 14.5–19.6 | 29.0 | 28.7 | **22.0** | 30.9 | 25.0 | 27.1 | 25.5 | 23.8 | 20.7 | 20.9 |
| 3p Slush + Thaw | 6.2 | 5.3–7.1 | 6.6 | 7.0 | **7.0** | 7.0 | 6.6 | 6.9 | 7.7 | 6.7 | 7.0 | 7.3 |
| 5p Slush | 15.4 | 13.1–17.7 | 26.2 | 24.9 | **20.1** | 22.8 | 25.2 | 26.4 | 25.0 | 23.6 | 22.3 | 23.6 |
| 5p Slush + Thaw | 7.0 | 6.0–8.1 | 8.7 | 8.2 | **8.3** | 8.0 | 8.4 | 8.3 | 8.8 | 8.6 | 8.2 | 8.6 |

**No cell reaches the band — an owner call (spec § 8's stop rule).** The Thaw rows are in or at the edge
of their band; the Thaw-OFF rows run ~30% long whatever the two allowed levers do (ten cells, cover
0.65–0.85, 2–5 slip gaps). The length comes from the two approved changes themselves — twice the ice per
penguin, and gaps capped at 1.8 so one floating plug seals them — and the instrument's neutral bots do not
aim at each other, so a real table runs shorter (the DD-16/DD-17 caveat). Shipped provisionally at
[3,4] / 0.75, the closest overall. Levers outside the spec's two, for the owner: a longer full pull
(`CLD_ICE_MULT`), a smaller floe scale than ×1.3, or accepting longer Thaw-off Floe-Offs.

**Hunger — the owner's lever (29 Sep 2026).** The owner chose a new lever: the penguins get **Hungry**.
Every `CLD_HUNGER_EVERY` Slides of a Floe-Off (or Ice Bath), full power grows ×`CLD_HUNGER_STEP`, compounding.
Decel stays derived from the base `CLD_V_MAX`, so reach grows as the square. It is derived from `cldSlideNo`
on every device, so it needs no packet field. The loopback proves all three devices raise the beat from
their own count. The Snowball stays a fraction of the base v_max (the per-throw invariant). The beat:
**HUNGRY!** floats, a 🐟❗ bubble shows over every Standing penguin, angry brows stay while it lasts, and
`playHullThud` plays. Practice gets the same beat plus a coach line.

The approved starting point, every 4 Slides at **×1.15, overshot by half**: Thaw-off Floe-Offs fell to
~10 Slides. With fixed bots, Hunger does not trim the long tail — it removes it. Sweep (`simulate-cld-balance.js 60`,
default seed, mean Slides/Floe-Off, cell = every N / step; **bold** = all four rows in band):

| config | band | none | 4/1.15 | 4/1.10 | 4/1.06 | 4/1.05 | **4/1.04** | 3/1.04 | 5/1.05 | 6/1.05 | 8/1.05 | 8/1.10 | 10/1.15 | 12/1.15 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 3p Slush | 14.5–19.6 | 22.0 | 10.1 | 10.5 | 13.4 | 14.9 | **15.1** | 14.6 | 14.5 | 15.9 | 18.6 | 14.7 | 15.8 | 15.9 |
| 3p Slush + Thaw | 5.3–7.1 | 7.0 | 6.6 | 6.5 | 6.9 | 6.5 | **6.6** | 7.0 | 6.9 | 7.1 | 6.9 | 7.1 | 7.1 | 6.7 |
| 5p Slush | 13.1–17.7 | 20.1 | 10.4 | 12.0 | 13.3 | 14.4 | **14.4** | 14.4 | 14.8 | 16.4 | 15.6 | 15.7 | 15.5 | 16.6 |
| 5p Slush + Thaw | 6.0–8.1 | 8.3 | 7.5 | 7.6 | 8.0 | 7.6 | **8.1** | 8.1 | 8.6 | 8.3 | 8.4 | 8.2 | 8.2 | 8.3 |

60 runs was too noisy to pick from. At 120 runs the no-Hunger baseline itself moved (5p Thaw-off
20.1 → 22.8), so the finalists were re-run at 120:

| config (120 runs) | band | none | 4/1.05 | **4/1.04** | 4/1.035 | 4/1.03 |
|---|---|---|---|---|---|---|
| 3p Slush | 14.5–19.6 | 21.3 | 13.8 | **15.9** | 15.4 | 16.4 |
| 3p Slush + Thaw | 5.3–7.1 | 7.1 | 6.5 | **6.7** | 7.1 | 6.7 |
| 5p Slush | 13.1–17.7 | 22.8 | 14.0 | **15.2** | 16.0 | 16.1 |
| 5p Slush + Thaw | 6.0–8.1 | 8.4 | 7.3 | **7.9** | 8.2 | 8.1 |

**Shipped: every 4 Slides, ×1.04.** It is the only step in band on all four rows at both run counts.
×1.05 looked best at 60 runs but drops 3p below its floor at 120. Later, stronger Hunger
(10/1.15, 8/1.10) also fixes Thaw-off, but it leaves 5p Thaw at 8.2+. Early Hunger is what shortens the
short Thaw Floe-Offs, and every-4 keeps the owner's rhythm, so the beat comes often. Treat ±1 Slide as noise.
The bots do not know about Hunger (they aim with the fed reach). A player reading the guide can pull back
less, so the real effect is a little weaker than measured. The DD-16/17 caveat still applies: neutral bots
don't gang up. The ring values stay [3,4] / 0.75 and are **no longer provisional**.

*Lesson:* a lever that compounds with time does not behave like a constant. The whole curve is set by where the tail
used to be, so tune the step from the gentle end — the first plausible value (×1.15) was nearly four times too strong.

### DD-20 — procedural art as a game-owned pure module: Cold Shoulder looks fun (SW v246)

Spec: `docs/superpowers/specs/2026-09-29-cld-fun-pass-design.md` § 4; plan: `docs/superpowers/plans/2026-09-29-cld-fun-pass-phase2.md`.

**Why.** Owner items 4, 5 and 7 of the v244 review: the aim guide vanished white on white, the Practice
buttons were ugly, and the whole game wanted the sticker's look — "a huge asset overhaul … the cue stick
needs to go".

**What changed (owner calls in bold).**
- **The module.** `js/games/cld-art.js` (`window.CldArt`, ~62 KB, precached, loads before `cld.js`), ported
  from the approved prototype. Pure like `dyb-dice.js`: it draws what it is given and reads no `cld*` state; its
  only state lives in objects the caller owns (a floe surface, a particle system). Every drawing entry point is a
  no-op without `document`/`Path2D`, and `cld.js` runs with it absent (`cldArt()` → `null` → draws nothing).
- **The seam kept.** `cldRenderPenguin` is still the one door for every penguin pixel, in play and in chrome
  (tally heads, avatars, podium, menu, intro, the Cast) — proven by a call-depth spy, not by trusting call sites.
  `cldPose`/`cldPaintProcedural`/`cldPaintBody` are gone; `cldSkinArt` stays a stub.
- **The Hunger ladder** replaces v245's placeholder brows: a mood OVER the pose's face, one rung per level (a
  frown now and then → all the time → a huff and a stamp → angry → fire in the eyes → a glow that grows), static
  per level, frozen under reduced motion, none for a Drowned penguin. The level aimed under is the level worn for
  the whole replay.
- **The model's derived fields** — `pose`, `look`, `power`, `vel`, `k`, `outward`, `seed`, `hunger`, `splat`, plus
  `snowballs`, `phase`, `meMarker`, `winnerIdx`, `floeKey`, `floeSeed` — all from the timeline or input, never
  sent. A penguin seated THIS Slide is drawn in the water from its seat beat, which the v245 model missed (it
  read `drowned`, still false until the post-state lands).
- **View-owned art state.** Each view has its own particles, floe surface, trails and splats, so the Arena can
  never paint on the live floe. A `hooks.fx` beside `sfx`/`bark`, called BEFORE the sound throttle — the
  throttle protects the ear, not the eye. A bounce off a plug barks **Boing!**.
- **Aim marks in the owner's colour** — tether, power arrow, guide dots/ghost/stub, reticle, Dive rings; a
  rival's shove at half strength and dashed. The cue stick is gone (the gesture is unchanged).
- **The floe goes full bleed**: a header floating over the water, the controls on an ice shelf, a power tube in
  your colour, a tally of heads (one neutral colour — counts only, never who).
- **The ice block** (`.cld-ice-btn`) for secondary in-game buttons — Start over, Practice again, Waddle Off —
  never a CTA, a pill or a Decision Modal button. **Waddle Off keeps DD-31 parity** with March On!
  (`min-h-14`, not the spec's `min-h-11`).
- **No packet change.** The `landing` event already carried `from`, `x`, `y`, `t`, so Snowball arcs are derived
  on every device. `MP_PROTOCOL_VERSION` stays `'v245'`.

**Found while building it.**
- *A floe key can repeat* — `'f:1'` again after a first-to-1 match and Play Again, `'pr1:…'` again after
  `resetToLobby` (both views persist) — and would have brought the last match's grooves back. `cldViewForget`
  drops a view's art state on every Floe-Off intro and in `cldResetState`.
- *A header inside the stage loses its clicks.* The stage `setPointerCapture`s on pointer-down, so a press on the
  floating `[?]`/🔊/✕ would have had its click retargeted to the stage. The button guard runs in the listener
  BEFORE capture (and again in `cldPointerDown`); proven with a real press in headless Chromium.
- `cldSyncFloeUI` rewrites the `[?]`'s whole `className` every sync, which silently undid its new 44 px target
  and white ink.
- The prototype drew unchosen Dive seats white — invisible on the foam collar. Every mark is now in your colour.
- `cldPaintPodium` measured a hidden column (0 px → a 320 px fallback) and overflowed at 320 wide; it paints
  after `showScreen` now.
- The tally's glacier and stone heads were indistinguishable at 7 px; empty heads draw faded.
- Harness: the reduced-motion frame check was vacuous — the mock `#sound-overlay`'s `display` is `undefined`,
  which `cldLoop` reads as open, so the loop was paused and its clock never moved. A mutant proved it.
- Tuned by eye: `HEAD_CY` −1.38 / `HEAD_R` 0.68 (the face centred in an avatar), the result art 132 × 176.

**The final review (a fresh reviewer over the whole range) found four more, each fixed RED → GREEN with a mutant.**
- *In the water by a beat.* A Thaw-drop or a refused seat reaches the water through an AFTERMATH beat, not a sim
  seat, so the model drew the penguin upright, with its Hunger mood, outside the rim until the post-state. A
  `thaw-drop` now marks it over the lip; a `surface` stamps `seatT` (and `seatPlug`, so a Knocked-back surface is
  `back`); anything going in wears no mood.
- *A second Ice Bath.* A Floe-Off can wash out twice, and both baths are `f:Nb` — the second opened with the
  first one's splats. Every bath start (host, client, Arena) now forgets the view.
- *The idle glance* (spec § 4.2) was lost in the port: `posePars` pinned a null look to face-front. An idle penguin
  with no look of its own now glances about, as the prototype's composer did.
- *A paused Slide* (the sound overlay up, the loop stepping at dt 0) pushed the same trail point every frame —
  unbounded. A repeated point is now skipped, and nothing sprays at dt 0.

**Numbers.** `verify-cld-practice.js` 189 → 348 (sections M–T + the review's checks), `mutate-cld.js` 45 → 68 (an `art` source kind,
`CLD_ART_SRC=`). Practice stage 291 / 265 / 169 px at the three SE sizes (DD-19: 291 / 269 / 173). A crowded
frame (16 penguins, 30 chunks) is ~1,030 fill/stroke calls — the baseline for the SE's frame-rate pass.

*Lesson:* a render check that can't fail is a harness, not a test — when a reduced-motion or layout assertion
passes on its first run, plant the one-line mutant that should break it before believing it.

### DD-21 — the bot brain: three difficulties, and Hard looks ahead through the real rules (SW v247)

Spec: `docs/superpowers/specs/2026-09-29-bots-design.md` § 5; engine half: `shared-implementation-notes.md` DD-52.

**The hook.** `view` = `cldBotView(i)`: `cldSwapOut()` deep-cloned, **every commit blanked** (other seats'
commits are CLD's only hidden state), `timeline: null`, `me: i`. `submit` = `cldBotSubmit(i, move, tag)` =
`cldHostTakeCommit` — the `CLD_COMMIT` handler's body lifted out, so a client's packet and a bot share
the stale-tag and no-overwrite guards. The prompt is one line at the end of `cldShowFloe()` — the single
place a Slide opens for aiming on the host (Floe-Off start, Ice Bath start, after playback). There is no
aiming clock, so nothing ever cancels. Names go through `cldSeatNames()` → `mpSeatLabel`, so 🤖 rides
the `playerNames` `CLD_FLOEOFF_START` already carries to the scoreboard, podium and barks.

**Easy / Medium** (`cldBotSimple`) simulate nothing. Easy: a random standing rival, a straight shove,
power 0.5–1.0, ±15° noise, holds still one Slide in five (`CLD_BOT_EASY_HOLD`), dives half the time.
Medium: the rival nearest the rim, the Practice Edge cut (`cldBotAimAt`, shared with the drill bots) else
straight, power 0.85–1.0 divided by `cldHungerMult`, ±4°, dives into the nearest free gap.

**Hard** (`cldBotHard`) runs the real `cldResolveSlide` on a clone of its view through `cldRulesRun`
(the Arena swap generalised — `cldArenaRun` is now a wrapper over it). Every other seat is assumed to
play its **Medium** move from the same public view on a fixed stream (`CLD_BOT_SEED`), so the
assumption is part of the view, never the live game. One coordinate pass over its own penguins: hold,
a dodge, and straight + cut × power {0.7, 0.85, 1.0} per rival (≤ 24 per penguin), then Throw/Dive
options. Score: +1 per rival penguin newly in, −1.5 (`CLD_BOT_SELF_COST`) per own, + 0.1 × (own rim
margin − rivals' mean), in floe radii.

**The ordering, and an owner call.** At a 3-seat table with one of each, 60 matches: Hard 50, Medium 4,
Easy 6 — Hard is clearly strongest, but it takes ~80% of the wins and leaves Medium and Easy ~10 to
split, too few to order them. At 300 matches the three-way order holds (241 / 38 / 21), and head to head
Medium beats Easy 241–59 (3 seats) and 222–78 (4 seats). **Owner, 29 Sep 2026:** no brain constant was
tuned; `verify-cld-bots.js` § 8 asserts Hard > Medium on the three-way table and § 8b asserts Medium >
Easy **head to head** (60 matches: 50–10). § 8b was run against a copy with Easy and Medium swapped
first — 41–19, red.

**Cost.** Hard's decide: mean ~4–5 ms per seat, max 12 ms, on a desktop — far under the spec's 250 ms
tripwire. The SE pass is still the owner's. `simulate-cld-bots.js` (30 matches a row): Hard 80 / 77 / 67
/ 63% at 3 / 4 / 5 / 6 seats; Easy and Medium trade places above 3 seats — a feel question for the
real-device pass, not a harness one.

**Harness.** `verify-cld-bots.js` 97 (on `tools/lib/cld-rules-world.js`): fairness over Standing /
Knocked back / Drowned / Peck Off × every difficulty, legality, whole bot-only matches at 2–8 seats, a
stale move refused, swap safety (50 Hard decisions leave the live state byte-identical), the ordering.
`verify-cld-loopback.js` 192 → 209: § 17 two bot seats beside a human client over the wire, § 18 a Solo
match on a null wire to the podium. `mutate-cld.js` 68 → 70 (a view that leaks commits; the prompt
dropped).

*Lesson:* an ordering asserted on a shared table is only as sharp as the weakest pair's share of the
wins. When one entrant dominates, test the others head to head.

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

**BUG-12 — every non-host Lock In was refused by the live Firebase rules (28 Sep 2026, 3-player
playtest).** `CLD_COMMIT` is the suite's first client → host private write; the live rules had no
`private` block. Fixed in the rules plus a warn in `mpSendPrivate`. Detail:
`shared-implementation-notes.md` BUG-26.

**BUG-13 — displacing inside the timeline walk seated a penguin on a spot a LATER plunge held (SW
v243 build, caught by the plug-legality sweep, seed 77).** What happened: the aftermath walked the
sim's events once, and on each `seat` moved any knocked-back penguin in that gap to the nearest free
seat — but a plunge later in the same Slide had already seated there in the sim, and was not on the
ring yet in the rules state. Root cause: the sim's end state did not exist yet when a post-sim move
consulted it. Fix: two passes — apply every seat and knock-back first (= the sim's end state), then
displacements and refused-seat surfacing in timeline order. **Lesson:** anything decided *after* a
simulation must read the simulation's *final* state, never a half-applied one.

**BUG-14 — the canvas spilled over the Drowned row the first time a player went in (found by
`visual-check`, SW v243; the v242 Dive row had the same ordering).** What happened: `cldResize()`
sizes the canvas in px once, inside `cldShowFloe()`, and `cldSyncFloeUI()` reveals the row
afterwards; the stage shrank, the canvas did not, and it painted over the Throw · Dive pills and
pushed the header off. Root cause: a px-sized child of a flex-shrunk parent never learns the parent
changed. Fix: `cldSyncFloeUI()` re-fits the canvas whenever the stage's height differs from the
canvas's. No harness can see it — a mock element has no box.

**BUG-15 — every Floe-Off ended in a loop: the result and the Fish replayed every frame (owner, the
first Solo matches, 29 Sep 2026, fixed SW v247).** What happened: at "X is the last one dry" the game
hung, flashing the result screen with a loud repeated Fish; seen at 8 seats (host lost) and 5 (host
won). Root cause: `cldLoop` nulled `cldRafHandle` at the top of every frame and re-armed itself at the
bottom whenever the handle was still null. Inside the frame, `cldAdvancePlayback` → `cldEndPlayback` →
`cldShowResult` → `cldStopLoop()` found nothing to cancel, so the frame re-armed a loop that had just
been stopped; `cldPhase` was still `'resolving'` and `cldStepPlayback` returns `'done'` on every call
past the end, so every frame ended the playback again — the result, `cldSfx('fish')`, and a fresh
2.5 s result timer that never got to fire. **Not a bot bug**: the shape dates from at least SW v243
and hit every device at every Floe-Off end. Nothing saw it because no harness ran the real loop
(every mock `requestAnimationFrame` returned 0 and the loopback pumps playback by hand) and the
phase-40 live session was never played; Solo was the first way to play a whole match alone. Fix: while
a frame runs the handle holds `CLD_RAF_RUNNING`; a stop (null) or restart (a real handle) overwrites
it, and only an untouched frame re-arms. The Practice loop has the same shape but is only stopped
from UI events, never inside a frame. Proof: `verify-cld-loopback.js` § 19 drives the REAL loop with
one clock for timers and frames — red at 64 results in one second, green at 1 — and the real app in
Chromium (8-seat Solo: one result, the podium 2.5 s later). *Lesson:* a harness that stubs the frame
loop proves nothing about what the frame loop does at a phase change; drive the real one once, with a
clock, through every phase exit. (Also: a mock `style.display` of `undefined` reads as "visible" to
the sound-overlay pause check, so the loop never advances — set it to `'none'`.)

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

**TG-14 — A check that asks the function under test where the answer is can never see it move
(SW v243, found by three surviving mutants).** `every seat sits on the ring circle` compared seats
against `cldRingR()` — so moving the ring moved the check with it; `…on a ringless floe` cleared the
Bergs by hand before the bath started; nothing measured a plug's rebound energy. Each passed a
mutant that broke exactly what it named. Fix: measure against an independent source (the chunks' own
circle, `cldBergInset()`), set up the state the code must produce rather than producing it in the
test, and assert physics by its closed form (rest distance vs `v²/2a`). **Rule:** when a mutant
survives, first ask whether the check reads its expected value from the thing it is checking.
