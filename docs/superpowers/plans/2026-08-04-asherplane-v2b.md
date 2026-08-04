# Asherplane v2b Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the double-shot powerup into a glowing, temporary (10s) buff that gates its own respawn, and fix the rocket car's rear-wing placement/shape, speed, and toughness.

**Architecture:** Two isolated changes in the same already-shipped file, `js/arcade/asherplane.js`. Neither touches enemy generation, difficulty, or the collision-loop abstraction — the powerup gets a duration timer and a shared "return to normal" helper; the rocket gets new tuning constants and a redrawn spoiler.

**Tech Stack:** Vanilla ES6+, HTML5 Canvas 2D. No libraries, no build step, no new files.

**Spec:** `docs/superpowers/specs/2026-08-04-asherplane-v2b-design.md`

## Global Constraints

- **Only `js/arcade/asherplane.js` may change.** No other file — the spec (§5) is explicit.
- **No test framework exists in this project**, and this feature has no `tools/verify-*.js` harness — it's visual/feel work for a young child. Every task's cycle is: **`node --check js/arcade/asherplane.js` → the task's hand-trace (no implementer has a browser) → commit.** A human runs the real device pass at the end.
- **Zero external dependencies.** No images, no audio, no npm. All artwork stays procedural Canvas 2D.
- **`CanvasRenderingContext2D.roundRect` is banned** — older iPad Safari is a target device. `shadowColor`/`shadowBlur` are legal (not banned) and used for the powerup's glow.
- **Canvas logical resolution stays fixed at 360×640.** No task touches `apResize()`.
- **`ap` prefix** on every new global.
- **Australian English** in comments.
- **No `localStorage`.**
- **No SW version bump.** No new assets.
- **Everything Tasks 1-5 of v2 shipped must survive untouched except where a task below explicitly names a line to change.** In particular: the RAF lifecycle in `apLoop`/`apEnterState`, the collision-loop abstraction (`apEnemyHitBoxes`/`apDamageEnemy`), the death beat, the sound-overlay pause, and the distance-driven difficulty curve.

---

## File Structure

| File | Responsibility |
|------|-----------------|
| `js/arcade/asherplane.js` | The whole feature. Both tasks modify this one file, in unrelated regions. |

---

### Task 1: Powerup rework — glow, 10s duration, spawn gating

**Files:**
- Modify: `js/arcade/asherplane.js`

**Interfaces:**
- Consumes: `apDoubleShot`, `apPowerups`, `apPowerupT`, `AP_POWERUP_INTERVAL_MS`, `AP_POWERUP_SPEED`, `apPlayerBox()`, `apAABB`, `apBurst`, `AP_SOUND`, `apResetRun()` (all existing)
- Produces: `AP_POWERUP_DURATION_MS`, `apDoubleShotT` (runtime state), `apClearDoubleShot()`

- [ ] **Step 1: Add the duration constant and the countdown state**

In the `── Tuning ──` block, immediately after `const AP_POWERUP_SPEED = 90;`, add:

```js
const AP_POWERUP_DURATION_MS = 10000;   // how long a picked-up buff lasts if untouched
```

In the `── Runtime state ──` block, immediately after `let apDoubleShot = false;`, add:

```js
let apDoubleShotT = 0;   // ms remaining on the current buff, while apDoubleShot is true
```

- [ ] **Step 2: Add `apClearDoubleShot()`**

Add this function immediately after `apClearGameOverT()` (both are "clear on transition" helpers with the same shape — keeping them adjacent matches the existing file's organisation):

```js
// Clears the double-shot buff AND immediately restarts the wait-for-next-
// powerup timer. Called from both places the buff can end (the 10s
// countdown running out, or a hit) — "return to normal" is whichever of
// those happens first, and apPowerupT only starts counting a fresh
// interval from that moment, not from when the buff started.
function apClearDoubleShot() {
  apDoubleShot  = false;
  apDoubleShotT = 0;
  apPowerupT    = 0;
}
```

- [ ] **Step 3: Reset the countdown in `apResetRun`**

In `apResetRun`, immediately after the existing `apDoubleShot = false;` line, add:

```js
  apDoubleShotT = 0;
```

- [ ] **Step 4: Gate spawning, arm the countdown on pickup, and add the countdown tick**

In `apUpdate`, the powerup block currently reads:

```js
  // Powerup: falls independently of enemy spawns, on its own timer. At most
  // one on screen at a time — simplest way to guarantee "no stacking" without
  // a cooldown-after-pickup mechanism.
  apPowerupT += dt * 1000;
  if (apPowerupT >= AP_POWERUP_INTERVAL_MS && apPowerups.length === 0) {
    apPowerupT = 0;
    apPowerups.push({ x: 8 + Math.random() * (AP_W - 26 - 16), y: -30, w: 26, h: 26 });
  }
  apPowerups.forEach(p => { p.y += AP_POWERUP_SPEED * dt; });
  apPowerups = apPowerups.filter(p => p.y < AP_H + 40);

  const powerupPlayerBox = apPlayerBox();
  apPowerups = apPowerups.filter(p => {
    if (!apAABB(powerupPlayerBox, p)) return true;
    apDoubleShot = true;
    AP_SOUND.powerup();
    apBurst(p.x + p.w / 2, p.y + p.h / 2, '#38BDF8');
    return false;
  });
```

Replace it with:

```js
  // Powerup: falls independently of enemy spawns, on its own timer. At most
  // one on screen at a time, and NONE while the buff is already active —
  // apPowerupT only starts counting toward the next one once
  // apClearDoubleShot() resets it, i.e. once the player is genuinely back
  // to normal (see below).
  apPowerupT += dt * 1000;
  if (apPowerupT >= AP_POWERUP_INTERVAL_MS && apPowerups.length === 0 && !apDoubleShot) {
    apPowerupT = 0;
    apPowerups.push({ x: 8 + Math.random() * (AP_W - 26 - 16), y: -30, w: 26, h: 26, glowT: 0 });
  }
  apPowerups.forEach(p => { p.y += AP_POWERUP_SPEED * dt; p.glowT += dt; });
  apPowerups = apPowerups.filter(p => p.y < AP_H + 40);

  const powerupPlayerBox = apPlayerBox();
  apPowerups = apPowerups.filter(p => {
    if (!apAABB(powerupPlayerBox, p)) return true;
    apDoubleShot  = true;
    apDoubleShotT = AP_POWERUP_DURATION_MS;
    AP_SOUND.powerup();
    apBurst(p.x + p.w / 2, p.y + p.h / 2, '#38BDF8');
    return false;
  });

  // Double-shot countdown — separate from the pickup handling above, since
  // this keeps running long after the powerup entity itself is gone. Ends
  // the buff exactly like a hit does (apClearDoubleShot), just from time
  // running out instead of a collision.
  if (apDoubleShot) {
    apDoubleShotT -= dt * 1000;
    if (apDoubleShotT <= 0) apClearDoubleShot();
  }
```

- [ ] **Step 5: Route the hit-clear path through the same helper**

In the `hitSearch:` labelled loop (the enemy-hits-player collision), find the line `apDoubleShot = false;` and replace it with:

```js
        apClearDoubleShot();
```

- [ ] **Step 6: Redraw the powerup as a glowing sphere with an up-arrow**

Replace the whole of `apDrawPowerup` with:

```js
function apDrawPowerup(p) {
  const g  = apCtx;
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2, r = p.w / 2;
  const pulse = 0.55 + 0.35 * Math.sin(p.glowT * 4);

  // Glow: shadowBlur/shadowColor persist on the context until changed, so
  // this MUST be its own save/restore — otherwise the glow would bleed
  // onto the bullets, glider, particles and HUD text drawn right after it.
  g.save();
  g.shadowColor = '#38BDF8';
  g.shadowBlur  = 14 * pulse;
  g.fillStyle   = `rgba(56,189,248,${pulse})`;
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fill();
  g.restore();

  // Up arrow — a filled triangle head plus a short stem, same construction
  // style as apDrawGlider's nose highlight.
  g.fillStyle = '#FFFFFF';
  g.beginPath();
  g.moveTo(cx, cy - r * 0.6);
  g.lineTo(cx - r * 0.45, cy + r * 0.05);
  g.lineTo(cx + r * 0.45, cy + r * 0.05);
  g.closePath();
  g.fill();
  g.fillRect(cx - r * 0.16, cy, r * 0.32, r * 0.55);
}
```

- [ ] **Step 7: Syntax check**

```bash
node --check js/arcade/asherplane.js
```

Expected: no output.

- [ ] **Step 8: Hand-trace (no browser available)**

Write into your report:
1. Trace a full pickup-to-expiry cycle: `apDoubleShot` and `apDoubleShotT` are set on pickup; the countdown block decrements `apDoubleShotT` every frame `apUpdate` runs while `apDoubleShot` is true; at ≤0, `apClearDoubleShot()` fires, setting `apDoubleShot = false`, `apDoubleShotT = 0`, AND `apPowerupT = 0` — confirm all three, not just the first two.
2. Trace a pickup interrupted by a hit: the `hitSearch:` loop now calls `apClearDoubleShot()` instead of the bare assignment — confirm this produces the identical three-field reset as the timeout path, so both exits from the buff are indistinguishable in their aftermath.
3. Confirm the spawn condition `apPowerupT >= AP_POWERUP_INTERVAL_MS && apPowerups.length === 0 && !apDoubleShot` cannot pass while `apDoubleShot` is true, and that because `apClearDoubleShot()` resets `apPowerupT` to 0 at the exact moment the buff ends, a full `AP_POWERUP_INTERVAL_MS` must elapse AFTER that moment before the condition can pass again — not before.
4. Confirm `apDrawPowerup`'s `g.save()`/`g.restore()` genuinely brackets only the glow circle (not the arrow), and that `shadowBlur`/`shadowColor` are therefore guaranteed reset to their pre-call values before the arrow triangle/stem are drawn with plain `fillStyle` — i.e. the arrow itself never gets a glow, only the circle behind it does. (This doesn't matter visually either way, but confirm the save/restore pairing is structurally correct — an unbalanced save/restore would corrupt every subsequent draw call this frame.)

- [ ] **Step 9: Commit**

```bash
git add js/arcade/asherplane.js
git commit -m "feat(arcade): powerup rework — glowing sphere, 10s duration, spawn gate

The double-shot pickup is now a pulsing glow-circle with an up-arrow
instead of a flat square with '2'. Picking it up starts a 10s
countdown; a hit still clears it immediately, same as before, but now
either exit routes through apClearDoubleShot(), which also resets the
wait-for-next-one timer -- so a full interval is always spent
genuinely powerless before another powerup can spawn, rather than one
appearing the instant a long buff ends.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Rocket car — rear spoiler, faster boost, two hits

**Files:**
- Modify: `js/arcade/asherplane.js`

**Interfaces:**
- Consumes: `AP_ENEMY_STATS`, `apDrawCar(car)`, `AP_ROCKET_BOOST_MUL` (existing — this task changes its value)
- Produces: nothing new — pure tuning + a redrawn `apDrawRocket(e)`

- [ ] **Step 1: Bump the boost speed and the toughness/points**

Change `AP_ROCKET_BOOST_MUL`:

```js
const AP_ROCKET_BOOST_MUL   = 1.45;   // vs. apCarSpeed() at the moment it boosts
```

In `AP_ENEMY_STATS`, change the `rocket` entry:

```js
  rocket: { w: 28, h: 44, hp: 2, baseSpeedMul: 1.0,  points: 30 },
```

Do not change `car` or `medium`'s rows, and do not change `baseSpeedMul` for rocket — that governs only the idle-phase fall, which stays at a small car's rate per the spec.

- [ ] **Step 2: Redraw the rear spoiler at the correct edge**

Replace the whole of `apDrawRocket` with:

```js
// Small-car silhouette plus a rear-mounted spoiler: two struts and a
// crossbar at the TOP edge — the true rear, since the rocket travels
// downward and the top is opposite its direction of travel. (The previous
// version drew fins near the bottom edge, which is the front — that was
// the bug.) The spoiler does not rotate to track the boost direction;
// nothing in this game rotates a sprite to face its travel direction, not
// even the player's own glider while steering, so this is consistent with
// the rest of the game rather than a shortcut.
function apDrawRocket(e) {
  apDrawCar(e);
  const g = apCtx, x = e.x, y = e.y, w = e.w;
  g.fillStyle = '#7C2D12';
  g.fillRect(x + 4,     y - 6, 4, 7);   // left strut
  g.fillRect(x + w - 8, y - 6, 4, 7);   // right strut
  g.fillRect(x - 2, y - 9, w + 4, 4);   // crossbar — the wing itself
}
```

- [ ] **Step 3: Syntax check**

```bash
node --check js/arcade/asherplane.js
```

Expected: no output.

- [ ] **Step 4: Hand-trace (no browser available)**

Write into your report:
1. Confirm `AP_ENEMY_STATS.rocket.hp: 2` means a rocket now survives its first hit — trace this through `apDamageEnemy`'s existing generic branch (`e.hp -= 1; if (e.hp > 0) { e.hitFlashT = ...; return false; }`) and confirm nothing rocket-specific needs to change there: the function is entity-type-agnostic below its train branch, so a 2-hp rocket automatically gets the same white flash a medium vehicle gets on its first hit.
2. Confirm `apSpawnRocket` (unmodified by this task) still reads `hp: stats.hp` from `AP_ENEMY_STATS.rocket`, so the new `hp: 2` takes effect without any change to the spawn function itself.
3. Confirm `AP_ROCKET_BOOST_MUL`'s only read site is inside `apBoostRocket` (`const spd = apCarSpeed() * AP_ROCKET_BOOST_MUL;`) — this task's change to its value doesn't require touching `apBoostRocket` itself, since the function was already written to read the constant rather than a hardcoded number.
4. Confirm the new spoiler's strut/crossbar coordinates sit at the TOP of the sprite (small `y` values, i.e. `y - 6` and `y - 9`, above `y` itself) rather than the bottom (`y + h`-relative, as the old fins were) — this is the actual fix, not just a shape change, so trace it explicitly rather than assuming the coordinates are right because they compile.

- [ ] **Step 5: Commit**

```bash
git add js/arcade/asherplane.js
git commit -m "feat(arcade): rocket car — rear spoiler, faster boost, two hits

The old wings were drawn near the sprite's bottom edge, which is the
FRONT (the rocket travels downward) -- that's what read as \"wrong
side.\" Redrawn as a sports-car spoiler (two struts + a crossbar) at
the top edge, the true rear. Boost speed 1.2x -> 1.45x. Now 2 hits
(was 1), points 20 -> 30 to match -- proportionate to a medium vehicle
(also 2 hits, 25 points) while staying the more dangerous target.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Final verification

Manual, on a real device — same posture as v1/v2. No headless harness exists or should be added.

- [ ] The powerup renders as a glowing, pulsing sphere with a visible white up-arrow — not a flat square with "2"
- [ ] Picking it up still doubles fire immediately
- [ ] The buff visibly ends after ~10 seconds if untouched, and immediately on taking a hit if hit first
- [ ] No second powerup ever appears while one is already on screen, or at any point while double-shot is active
- [ ] After the buff ends (either way), a genuine `AP_POWERUP_INTERVAL_MS` passes with nothing on screen before the next one appears — not an instant reappearance
- [ ] A rocket's spoiler sits at the rear (the edge it's flying away from), reads as a spoiler-on-struts, not two side fins
- [ ] Rockets visibly take 2 hits, flashing white on the first, same as a medium vehicle
- [ ] Rockets feel noticeably faster once boosting than before
- [ ] Regression: the rest of the enemy zoo, the death beat, the sound-overlay pause, the leaderboard, and distance-driven difficulty all still work exactly as they did before this plan
