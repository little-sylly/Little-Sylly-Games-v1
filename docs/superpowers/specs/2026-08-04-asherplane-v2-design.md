# Design — Asherplane v2: Enemy Variety, a Powerup, and Distance-Driven Difficulty

**Date:** 4 August 2026
**Status:** Approved design, ready for implementation
**Origin:** Owner playtested Asherplane v1 (browser) and asked for enemy variety, a
double-shot powerup, and a distance-based difficulty/scoring rework.
**Builds on:** `docs/superpowers/specs/2026-08-03-arcade-asherplane-design.md` (v1) and
the shipped `js/arcade/asherplane.js` (commit `785ae35` on `main`). This spec assumes v1
is already live and only describes the delta.

---

## 1. What this changes

v1 has one enemy (a one-hit toy car), one difficulty driver (kill score), and no
powerups. This adds three new enemy types, a collectible, and reworks the difficulty
and scoring model to run off survival time rather than kills. Everything lives inside
`js/arcade/asherplane.js` — no other file changes. The exemptions from v1 §2 (not a
Sylly Game, no MP config, no settings overlay, no verification harness) still apply
unchanged.

## 2. Enemy taxonomy

| Type | Size (logical px) | HP | Speed vs. small car | Points |
|---|---|---|---|---|
| Small car *(existing, unchanged)* | 28×44 | 1 | baseline | 10, on the kill |
| Medium vehicle | 36×56 | 2 | ~15% slower | 25, on the kill (2nd hit) |
| Rocket car | 28×44 (same footprint as small) | 1 | ~20% faster once boosted | 20, on the kill |
| Train | 3–5 carriages, each ~30×40 | 1 per carriage | baseline | 15 per carriage (45–75 a train) |

A medium vehicle flashes white for a few frames on its first (non-lethal) hit — the
only signal a young player gets that this one takes two. No score is awarded on that
first hit; the full 25 lands only when it's destroyed, matching the existing "score
pops on the kill" pattern.

Colliding with the player costs exactly one life and 1.5s of invulnerability
regardless of enemy type — toughness only affects how many *bullets* it takes, never
how much a collision costs. This keeps the collision rule uniform across four enemy
shapes instead of branching player damage by type.

## 3. The train — the one real architecture change

v1's `apCars` is a flat array of single-box entities, and both collision loops (dart
hits enemy, enemy hits player) assume exactly one hittable box per entity. A train
can't be modelled that way: it's a chain of independently-hittable carriages that
move as one unit, and destroying a middle carriage has to leave a visible gap without
splitting the remainder into two separately-moving pieces.

**Approach:** generalise every enemy entity to expose its currently-hittable boxes
through one function rather than a bare `{x,y,w,h}`. A small car, medium vehicle, or
rocket car returns an array containing just its own box; a train returns one box per
*alive* carriage, each positioned at `trainY + i * (carriageH + gap)`. Both collision
loops call this function instead of reading `.x/.y/.w/.h` directly — the loop logic
itself (iterate backwards, splice on hit) doesn't change shape, only what it iterates
over.

A destroyed carriage is marked dead and skipped by both the hit-box function and the
renderer; the train entity itself is only removed once every carriage is dead. The
remaining carriages keep the train's single shared `y`/`speed` — they never
re-flow to close the gap. This is a visual choice (a train with a hole in it), not a
technical constraint, and it's the simplest correct behaviour.

## 4. Rocket car

Spawns and falls exactly like a small car for a short random idle window (0.5–0.8s).
At the end of that window it "boosts" once: computes a straight unit vector toward
the player's position *at that instant*, sets its velocity along that vector at a
speed a bit above a small car's, and holds that line — unlike every other enemy, it
can now move horizontally as well as vertically, so its off-screen cull has to check
both axes, not just `y > AP_H`. It never re-aims after boosting, which is what makes
it dodgeable rather than a homing threat.

A short particle trail plays while boosting, reusing the existing particle system
(`apBurst`'s shape, emitted a couple of times a second rather than as one burst) —
no new rendering machinery, just a different call pattern.

## 5. Powerup — double shot

A pickup that falls from the top like a car, on its own independent spawn timer,
collected by flying into it (standalone drop, not a kill-drop — confirmed with the
owner). Picking it up sets `apDoubleShot = true`; while true, auto-fire spawns two
bullets side-by-side instead of one. The flag clears the instant a life is lost — the
same moment invulnerability starts — so losing the powerup is legible as part of
"you got hit," not a separate timer running out. No stacking: picking it up again
while already active is a no-op.

## 6. Distance, difficulty, and scoring

**`apDistance`** is a new accumulator: seconds survived while `apState === 'playing'`
(not `'dying'`, not paused behind the sound overlay). It is internal only — the HUD
still shows a single score number, confirmed with the owner — and it is the sole
difficulty driver, decoupled from score so a kill streak can't spiral the spawn rate
on its own.

**Unlock thresholds** (first-pass numbers — tunable constants, expected to move after
a playtest, same as v1's spawn/speed formulas were): medium vehicles from ~20s,
rocket cars from ~40s, trains from ~65s. Once unlocked, a type joins a flat-weighted
spawn pool alongside everything already unlocked — no ramp-up weighting, no
per-distance tuning curve beyond the existing spawn-interval/speed formulas already in
v1. Adding that later is one changed constant, not a redesign.

**Spawn interval and enemy speed** keep v1's existing clamped-curve shape
(`apSpawnInterval`, `apCarSpeed`), just re-keyed off `apDistance` instead of
`apScore`.

**Scoring** splits into two parts: a steady trickle for survival (~4 points/second,
the "distance" component) as the base, plus the kill-table points from §2 as a bonus
on top. Staying alive is the floor; shooting is the spike — matching the brief's
"score on distance travelled, shooting is a bonus."

## 7. Explicitly out of scope

- **Simultaneous multi-spawns ("density" via spawn *count*).** The existing
  spawn-interval floor already densifies the screen at high difficulty; stacking a
  second spawn mechanism on top is real added complexity for a benefit not yet shown
  to be needed. Revisit only if a playtest says the late game plateaus too gently.
- **Any change to the terminal, lobby, leaderboard, or engine/SW integration.** This
  is a pure gameplay-and-scoring change inside `js/arcade/asherplane.js`.
- **Visible distance HUD, powerup stacking, weighted/ramping spawn tables** — all
  considered and deliberately deferred per §5–6 above.

## 8. Files touched

| File | Change |
|------|--------|
| `js/arcade/asherplane.js` | All of it — new entity shapes, spawn table, collision generalisation, powerup, scoring rework |

No other file changes. No SW version bump (no new assets, nothing new to precache).

## 9. Verification

Same posture as v1: no test framework, no `tools/verify-*.js` harness — this is
gameplay feel for a young child, which a headless harness can't meaningfully assert.
`node --check` after every change, then a manual browser/iPad pass covering:

1. A medium vehicle visibly flashes on hit 1 and is destroyed (with score) on hit 2.
2. A train's carriages can be shot down individually, in any order, leaving a visible
   gap; the train entity disappears only once the last carriage is gone.
3. A rocket car falls straight briefly, then visibly re-aims once toward wherever the
   player is standing at that moment, and never re-aims again.
4. The powerup pickup visibly changes fire from one bullet to two; losing a life
   reverts it to one.
5. Score climbs slowly while only dodging, and jumps on every kill.
6. New enemy types appear roughly in the stated order as a run goes on, and the
   spawn rate/speed still caps rather than becoming unfair.
7. Regression: everything from v1's own checklist still holds (multi-touch steering,
   the sound-overlay pause, the death beat, the leaderboard).
