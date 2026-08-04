# Design — Asherplane v2b: Powerup Rework and Rocket Car Fixes

**Date:** 4 August 2026
**Status:** Approved design, ready for implementation
**Origin:** Owner played v2 (enemy variety, powerup, distance difficulty) and found two
things wrong: the powerup spawns too often and doesn't read as special, and the rocket
car's rear wings are on the wrong side, don't look like what was asked for, and are too
easy.
**Builds on:** `docs/superpowers/specs/2026-08-04-asherplane-v2-design.md` (v2) and the
shipped `js/arcade/asherplane.js` (commit `72a3be8` on `main`). This spec assumes v2 is
already live and only describes the delta.

---

## 1. What this changes

Two isolated changes to the same file, `js/arcade/asherplane.js`. Neither touches enemy
generation, difficulty, or scoring beyond one point-value tweak — no new architecture,
no new entity shapes.

## 2. The powerup — visual, duration, and spawn gating

### 2.1 Visual

Replace the flat blue square with a "2" (`apDrawPowerup`, current) with a glowing sphere
containing a white up-arrow:

- A soft radial glow behind the circle, via `shadowColor`/`shadowBlur` — legal Canvas 2D,
  not `roundRect`.
- A pulsing alpha on the glow so it reads as active/special rather than static. Cheap: one
  phase counter per powerup entity, advanced each frame, fed through `Math.sin`.
- The arrow: a filled triangle plus a short rectangle stem, in the same construction style
  already used for the glider's nose highlight — no new drawing primitives needed.

### 2.2 Duration

Picking it up starts a 10-second countdown (`AP_POWERUP_DURATION_MS = 10000`) on
`apDoubleShot`. Getting hit during that window still clears it immediately — confirmed
with the owner — so the countdown is an upper bound layered on the existing "lose it on a
hit" rule, not a replacement for it. Whichever ends the buff first (the timer reaching
zero, or a hit) is what "returning to normal" means for §2.3.

### 2.3 Spawn gating

Two changes to the spawn logic:

- **No new powerup while one is active.** The existing `apPowerups.length === 0` guard
  gains `&& !apDoubleShot`.
- **The wait-for-next-one timer resets on return to normal, not on pickup.** Today
  `apPowerupT` only resets at the moment of pickup, meaning it keeps counting up the
  entire time the buff is active — so if a 10-second buff outlasts the spawn interval,
  the instant it ends a new powerup could appear on the very next frame. That undercuts
  "temporary and a bit special." Instead, `apPowerupT` resets to zero at the same moment
  `apDoubleShot` is cleared — whether that's the countdown expiring naturally or a hit
  cutting it short — so the full interval is always spent genuinely powerless before the
  next one is due.

## 3. The rocket car — wing placement, redesign, speed, and toughness

### 3.1 The bug

`apDrawRocket` currently draws its fins near `y + h - 6` — the **bottom** edge of the
sprite. Since the rocket travels downward, the bottom is the front of the car, not the
rear. This is almost certainly what read as "the wrong side," independent of the shape
itself.

### 3.2 Redesign: sports-car spoiler

Replace the two outward-angled fins with a top-down spoiler: two short struts rising from
the sprite's **top** edge (the true rear — opposite the direction of travel) up to a
horizontal crossbar spanning most of the car's width. Same dark rust colour the old fins
used. This is the standard top-down "wing on struts" silhouette.

**Non-goal, stated explicitly:** the spoiler does not rotate to track the rocket's boost
direction. Nothing in Asherplane rotates a sprite to face its direction of travel — not
even the player's own glider while steering — so keeping the spoiler fixed at the
sprite's geometric top during a diagonal boost is consistent with the rest of the game,
not an oversight.

### 3.3 Speed

`AP_ROCKET_BOOST_MUL` moves from `1.2` to `1.45`. Scoped to the boost dash only — the
idle fall before it commits stays at the small car's rate (`baseSpeedMul: 1.0`,
unchanged), since the boost is the part that's meant to feel faster and more dangerous.

### 3.4 Toughness

`AP_ENEMY_STATS.rocket.hp` moves from `1` to `2`. Its point value rises from `20` to `30`
to stay proportionate — mediums are 2 hits for 25 points; a rocket is now also 2 hits but
worth more, reflecting that it's the more dangerous target. No new code is needed for the
hit-flash on its first (non-lethal) hit: `apDamageEnemy` and `apDrawCar`'s flash overlay
are already generic across every entity type, so a 2-hp rocket gets it automatically.

## 4. Explicitly out of scope

- No change to enemy spawn weighting, distance-unlock thresholds, or any other enemy
  type. This is a powerup/rocket-only pass.
- No sprite rotation system (§3.2's non-goal) — a genuinely separate feature if ever
  wanted, not bundled in here.
- No visible countdown/timer readout for the active buff, and no glow/indicator on the
  player while double-shot is active. Only the ground pickup itself gets the new visual
  treatment. Not requested; can be a follow-up if the 10-second window turns out to be
  hard to judge in practice.

## 5. Files touched

| File | Change |
|------|--------|
| `js/arcade/asherplane.js` | `apDrawPowerup` rewrite, powerup duration/reset state and logic, `apDrawRocket` rewrite, `AP_ROCKET_BOOST_MUL` and `AP_ENEMY_STATS.rocket` tuning |

No other file. No SW version bump — no new assets, everything stays procedural.

## 6. Verification

Same posture as v2: no test framework, no `tools/verify-*.js` harness — this is visual
and feel work for a young child. `node --check` after every change, then a manual
browser/device pass covering:

1. The powerup renders as a glowing, pulsing sphere with a visible up-arrow — not a flat
   square.
2. Picking it up doubles fire immediately, as before.
3. The buff visibly ends after ~10 seconds if untouched, and immediately on taking a hit
   if hit first.
4. No second powerup appears anywhere on screen while one is already active or while
   double-shot is active.
5. After the buff ends (either way), a full `AP_POWERUP_INTERVAL_MS` genuinely passes
   with no powerup before the next one can spawn — not an instant reappearance.
6. A rocket car's spoiler sits at the rear (the edge it's flying away from), not the
   front, and reads as a spoiler-on-struts rather than two side fins.
7. Rockets visibly take 2 hits to destroy, flashing white on the first, same as a medium
   vehicle.
8. Rockets feel noticeably faster once boosting than in the previous build.
9. Regression: everything else from v1/v2's checklists still holds — the rest of the
   enemy zoo, the death beat, the sound-overlay pause, the leaderboard.
