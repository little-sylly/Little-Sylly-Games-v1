# Asherplane v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three new enemy types (2-hit medium vehicles, multi-compartment trains, one-shot straight-line rocket cars), a double-shot powerup lost on death, and a distance-driven difficulty/scoring rework to the shipped Asherplane arcade cabinet.

**Architecture:** Every enemy entity gains a `type` field and exposes its currently-hittable boxes through one function (`apEnemyHitBoxes`), so both collision loops iterate a generic box list instead of assuming one box per entity — this is what lets a train's per-carriage hit detection reuse the exact same loops a small car uses. Difficulty and scoring move from being driven by kill score to a new `apDistance` accumulator (seconds survived), decoupled so a kill streak can't spiral the spawn rate.

**Tech Stack:** Vanilla ES6+, HTML5 Canvas 2D. No libraries, no build step, no new files — every change lives in the one file the game already ships in.

**Spec:** `docs/superpowers/specs/2026-08-04-asherplane-v2-design.md`

## Global Constraints

- **Only `js/arcade/asherplane.js` may change.** No other file — not `index.html`, not `sw.js`, not any doc. The spec (§7, §8) is explicit: this is a pure gameplay/scoring change inside the one file.
- **No test framework exists in this project**, and this feature deliberately has no `tools/verify-*.js` harness (spec §9) — it's gameplay feel for a young child, which a headless harness can't meaningfully assert. Every task's cycle is: **`node --check js/arcade/asherplane.js` → the task's hand-trace (no implementer has a browser) → commit.** A human runs the real manual/iPad checkpoints across the whole plan at the end.
- **Zero external dependencies.** No images, no audio files, no npm, no CDN. All artwork stays procedural Canvas 2D paths.
- **`CanvasRenderingContext2D.roundRect` is banned** — older iPad Safari is a target device. Build shapes from `fillRect`/paths only, matching the existing `apDrawCar`.
- **Canvas logical resolution stays fixed at 360×640** (`AP_W`/`AP_H`). No task touches `apResize()` or the coordinate system.
- **`ap` prefix** on every new global, per `definitions.md`.
- **Australian English** in all comments and any user-facing copy (there is none new here beyond code comments).
- **No `localStorage`.** Nothing in this feature persists across a reload.
- **No SW version bump.** No new assets are added, so `sw.js`'s `PRECACHE_URLS`/`CACHE_NAME` are untouched.
- **v1's fixes must survive untouched**: the RAF lifecycle in `apLoop`/`apEnterState`, the pointer-id steering guards in `apStagePointer`, the death-beat `'dying'` state, the sound-overlay pause, and the `apGameOverT` timer cancellation. No task in this plan touches any of those functions except where explicitly instructed.

---

## File Structure

| File | Responsibility |
|------|-----------------|
| `js/arcade/asherplane.js` | The whole feature. Every task modifies this one file. |

---

### Task 1: Generalised enemy entities + medium vehicles

Establishes the entity/hit-box abstraction every later enemy type builds on, and ships the first new enemy type end-to-end (spawns, takes 2 hits, flashes, scores, draws).

**Files:**
- Modify: `js/arcade/asherplane.js`

**Interfaces:**
- Consumes: `apCars`, `apBullets`, `apPlayer`, `apPlayerBox()`, `apAABB(a,b)`, `apBurst(x,y,colour)`, `AP_SOUND`, `apCarSpeed()`, `AP_CAR_COLOURS`, `apEnterDying()`, `apGameOverT` handling (all unchanged, existing)
- Produces: `AP_ENEMY_STATS` (object keyed by type: `{w,h,hp,baseSpeedMul,points}`), `AP_HIT_FLASH_MS`, `apEnemyHitBoxes(e)` → `[{x,y,w,h,segIndex}]`, `apDamageEnemy(e, box)` → `bool` (true = whole entity destroyed), `apPickEnemyType()` → `string`, `apSpawnEnemy()`, `apDrawEnemy(e)`

- [ ] **Step 1: Add the enemy stats table and the hit-flash constant**

In `js/arcade/asherplane.js`, immediately after the existing `AP_CAR_COLOURS` constant (in the `── Tuning ──` block near the top), add:

```js
const AP_HIT_FLASH_MS = 120;   // a medium vehicle's "took a hit but survived" flash

// Per-type stats for every enemy that presents a single hit box (car, medium
// — rocket joins this table in Task 3). Trains are handled separately: a
// train's length varies per spawn, so it has no single w/h/hp to put here.
const AP_ENEMY_STATS = {
  car:    { w: 28, h: 44, hp: 1, baseSpeedMul: 1.0,  points: 10 },
  medium: { w: 36, h: 56, hp: 2, baseSpeedMul: 0.85, points: 25 },
};
```

- [ ] **Step 2: Add `apHitFlashT` handling to runtime state — no change needed**

The `hitFlashT` field lives on each enemy object itself (set in Step 5's spawn function), not as a separate global — skip this step, it's covered by Step 5. (This step intentionally does nothing; it exists so the numbering matches the design's flow. Proceed to Step 3.)

- [ ] **Step 3: Add the generic hit-box and damage-resolution functions**

Add these two functions immediately before `apUpdate` (i.e. after `apBurst`, before `function apUpdate(dt) {`):

```js
// Returns the currently-hittable boxes for an enemy entity. A simple entity
// (car, medium — and rocket from Task 3) has exactly one: its own box. A
// train (Task 2) returns one per alive carriage. Both collision loops below
// call this instead of reading e.x/e.y/e.w/e.h directly, so a multi-box
// enemy needs no special-casing in the loops themselves — only here.
function apEnemyHitBoxes(e) {
  return [{ x: e.x, y: e.y, w: e.w, h: e.h, segIndex: -1 }];
}

// Registers one bullet hit against a specific hit-box (as returned by
// apEnemyHitBoxes). Decrements the entity's hp, flashes it if it survives,
// or bursts + scores it if this hit was lethal. Returns true when the WHOLE
// entity is now destroyed, so the caller knows to remove it from apCars.
function apDamageEnemy(e, box) {
  e.hp -= 1;
  if (e.hp > 0) {
    e.hitFlashT = AP_HIT_FLASH_MS;
    return false;
  }
  apBurst(e.x + e.w / 2, e.y + e.h / 2, e.colour);
  apScore += AP_ENEMY_STATS[e.type].points;
  return true;
}
```

- [ ] **Step 4: Replace `apUpdate` wholesale**

Replace the entire `apUpdate(dt)` function with this version. It is byte-identical to the current one except: the enemy-movement `forEach` also decays `hitFlashT`; the spawn call is now `apSpawnEnemy()`; the dart-hits-enemy loop is generalised to hit boxes; the enemy-hits-player loop is generalised to hit boxes (but does **not** yet know about trains — that's Task 2).

```js
function apUpdate(dt) {
  // Player
  const keyDir = (apKeys.right ? 1 : 0) - (apKeys.left ? 1 : 0);
  const dir    = keyDir !== 0 ? keyDir : apDir;
  apPlayer.x  += dir * AP_PLAYER_SPEED * dt;
  const half   = apPlayer.w / 2;
  apPlayer.x   = Math.max(half, Math.min(AP_W - half, apPlayer.x));
  if (apShake  > 0) apShake  = Math.max(0, apShake - dt);
  if (apInvuln > 0) apInvuln = Math.max(0, apInvuln - dt * 1000);

  // Particles — above the 'dying' guard on purpose: the death burst is the
  // whole point of that state, so it must keep integrating after the hit.
  apParts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; });
  apParts = apParts.filter(p => p.life > 0);

  if (apState === 'dying') {
    apDyingT -= dt * 1000;
    if (apDyingT <= 0) apEndRun();
    return;
  }
  if (apState !== 'playing') return;

  // Auto-fire — nothing to press.
  apFireT += dt * 1000;
  if (apFireT >= AP_FIRE_MS) {
    apFireT = 0;
    apBullets.push({ x: apPlayer.x - 2, y: apPlayer.y - 18, w: 4, h: 11 });
  }
  apBullets.forEach(b => { b.y -= AP_BULLET_SPEED * dt; });
  apBullets = apBullets.filter(b => b.y + b.h > 0);

  // Spawning
  apSpawnT += dt * 1000;
  if (apSpawnT >= apSpawnInterval()) { apSpawnT = 0; apSpawnEnemy(); }
  apCars.forEach(c => {
    c.y += c.speed * dt;
    if (c.hitFlashT > 0) c.hitFlashT = Math.max(0, c.hitFlashT - dt * 1000);
  });
  apCars = apCars.filter(c => c.y < AP_H + 60);

  // Dart hits enemy — an enemy may present multiple hit boxes (train
  // carriages, from Task 2); each bullet can only ever resolve against one
  // box, and a box that's already been hit this frame must not be hit again
  // (two simultaneous bullets — the Task 4 powerup — could otherwise both
  // land on the same box in one frame). Both guarantees come from splicing
  // the matched bullet AND the matched box out of their local lists the
  // moment they're used.
  for (let i = apCars.length - 1; i >= 0; i--) {
    const e = apCars[i];
    const boxes = apEnemyHitBoxes(e);
    let destroyed = false;
    for (let bi = boxes.length - 1; bi >= 0; bi--) {
      const box = boxes[bi];
      const j = apBullets.findIndex(b => apAABB(b, box));
      if (j === -1) continue;
      AP_SOUND.explode();
      apBullets.splice(j, 1);
      boxes.splice(bi, 1);
      if (apDamageEnemy(e, box)) destroyed = true;
    }
    if (destroyed) apCars.splice(i, 1);
  }

  // Enemy hits player. Iterates entities, then each entity's currently-
  // hittable boxes (apEnemyHitBoxes) — stops after resolving exactly one
  // collision per frame, same as v1.
  if (apInvuln <= 0) {
    const box = apPlayerBox();
    hitSearch:
    for (let i = apCars.length - 1; i >= 0; i--) {
      const e = apCars[i];
      const eBoxes = apEnemyHitBoxes(e);
      for (const eb of eBoxes) {
        if (!apAABB(box, eb)) continue;
        apBurst(eb.x + eb.w / 2, eb.y + eb.h / 2, e.colour);
        apCars.splice(i, 1);
        apLives -= 1;
        apShake  = 0.35;
        apInvuln = AP_INVULN_MS;
        AP_SOUND.hit();
        if (apLives <= 0) {
          apGameOverT = setTimeout(() => {
            apGameOverT = null;
            AP_SOUND.gameOver();
          }, 220);
          apEnterDying();
          return;
        }
        break hitSearch;
      }
    }
  }
}
```

- [ ] **Step 5: Replace `apSpawnCar` with `apPickEnemyType` and `apSpawnEnemy`**

Replace the existing `apSpawnCar` function entirely with:

```js
// Interim weighting — Task 3 extends this to 4 types, Task 5 replaces it
// entirely with distance-gated unlocking. Until then this always offers both
// car and medium so medium vehicles can be manually verified in isolation.
function apPickEnemyType() {
  return Math.random() < 0.7 ? 'car' : 'medium';
}

function apSpawnEnemy() {
  const type  = apPickEnemyType();
  const stats = AP_ENEMY_STATS[type];
  apCars.push({
    type,
    x: 8 + Math.random() * (AP_W - stats.w - 16),
    y: -stats.h - 10,
    w: stats.w,
    h: stats.h,
    speed: apCarSpeed() * stats.baseSpeedMul * (0.85 + Math.random() * 0.4),
    hp: stats.hp,
    hitFlashT: 0,
    colour: AP_CAR_COLOURS[Math.floor(Math.random() * AP_CAR_COLOURS.length)],
  });
}
```

- [ ] **Step 6: Add the hit-flash overlay to `apDrawCar`, and add the `apDrawEnemy` dispatcher**

In `apDrawCar`, add this block immediately before the function's closing `}` (after the existing four `fillRect` calls for windows/shading):

```js
  // Medium vehicles take 2 hits; this is the only signal a young player gets
  // that the first shot connected but didn't destroy it.
  if (car.hitFlashT > 0) {
    g.fillStyle = `rgba(255,255,255,${0.55 * (car.hitFlashT / AP_HIT_FLASH_MS)})`;
    g.fillRect(x - 3, y, w + 6, h);
  }
```

Then, immediately after `apDrawCar`'s closing brace, add:

```js
// Dispatches by enemy type. A passthrough for now — Task 2 adds the train
// branch, Task 3 adds the rocket branch. car/medium share apDrawCar's
// silhouette, scaled by e.w/e.h.
function apDrawEnemy(e) {
  apDrawCar(e);
}
```

Finally, in `apDraw`, change the line `apCars.forEach(apDrawCar);` to `apCars.forEach(apDrawEnemy);`.

- [ ] **Step 7: Syntax check**

```bash
node --check js/arcade/asherplane.js
```

Expected: no output.

- [ ] **Step 8: Hand-trace (no browser available)**

Write into your report:
1. A medium vehicle (`hp: 2`) hit once: `apDamageEnemy` returns `false`, `hitFlashT` is set to 120, no score is added, the entity stays in `apCars`. Hit a second time: `hp` reaches 0, `apDamageEnemy` returns `true`, `apScore += 25`, the caller splices it out.
2. `hitFlashT` decays to exactly 0 (not negative) over multiple frames via the `Math.max(0, ...)` clamp in the movement `forEach`, and `apDrawCar`'s overlay alpha therefore never goes negative either.
3. Confirm the dart-hits-enemy loop cannot double-count a single bullet: once `apBullets.splice(j, 1)` runs, that bullet's index is gone from `apBullets` for the rest of this frame's iteration, and once `boxes.splice(bi, 1)` runs, that box can't be matched again this frame either.
4. Confirm a small car (`type: 'car'`) behaves identically to before this task — same size, same 1-hit kill, same 10 points — by tracing `AP_ENEMY_STATS.car` against the pre-task hardcoded values.

- [ ] **Step 9: Commit**

```bash
git add js/arcade/asherplane.js
git commit -m "feat(arcade): generalise enemy entities, add medium (2-hit) vehicles

Every enemy now exposes its hittable boxes through apEnemyHitBoxes()
and is damaged through apDamageEnemy(), rather than the collision
loops assuming one box per entity. This is the seam Task 2 (trains)
and Task 3 (rocket cars) build on without touching the loops again.

Medium vehicles take 2 hits, flashing white on the first, and are
worth 25 points on the kill. Spawn weighting is interim (70/30
car/medium) until Task 5 wires distance-gated unlocking.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Trains

Adds the multi-compartment enemy the entity generalisation in Task 1 was built for.

**Files:**
- Modify: `js/arcade/asherplane.js`

**Interfaces:**
- Consumes: `apEnemyHitBoxes(e)`, `apDamageEnemy(e, box)`, `apDrawCar(car)`, `apDrawEnemy(e)`, `apBurst`, `apCarSpeed()`, `AP_CAR_COLOURS` (all from Task 1/existing)
- Produces: `AP_TRAIN_CARRIAGE_W/H`, `AP_TRAIN_GAP`, `AP_TRAIN_MIN_CARS/MAX_CARS`, `AP_TRAIN_POINTS_PER_CARRIAGE`, `apSpawnTrainEntity()`, `apDrawTrain(e)`

- [ ] **Step 1: Add train constants**

Immediately after `AP_ENEMY_STATS` (added in Task 1), add:

```js
const AP_TRAIN_CARRIAGE_W          = 30;
const AP_TRAIN_CARRIAGE_H          = 40;
const AP_TRAIN_GAP                 = 4;
const AP_TRAIN_MIN_CARS            = 3;
const AP_TRAIN_MAX_CARS            = 5;
const AP_TRAIN_POINTS_PER_CARRIAGE = 15;
```

- [ ] **Step 2: Add the train branch to `apEnemyHitBoxes`**

Replace the whole function with:

```js
function apEnemyHitBoxes(e) {
  if (e.type === 'train') {
    const boxes = [];
    e.segments.forEach((seg, i) => {
      if (!seg.alive) return;
      boxes.push({
        x: e.x,
        y: e.y + i * (AP_TRAIN_CARRIAGE_H + AP_TRAIN_GAP),
        w: AP_TRAIN_CARRIAGE_W,
        h: AP_TRAIN_CARRIAGE_H,
        segIndex: i,
      });
    });
    return boxes;
  }
  return [{ x: e.x, y: e.y, w: e.w, h: e.h, segIndex: -1 }];
}
```

- [ ] **Step 3: Add the train branch to `apDamageEnemy`**

Replace the whole function with:

```js
function apDamageEnemy(e, box) {
  if (e.type === 'train') {
    const seg = e.segments[box.segIndex];
    seg.alive = false;
    apBurst(box.x + box.w / 2, box.y + box.h / 2, e.colour);
    apScore += AP_TRAIN_POINTS_PER_CARRIAGE;
    return e.segments.every(s => !s.alive);
  }
  e.hp -= 1;
  if (e.hp > 0) {
    e.hitFlashT = AP_HIT_FLASH_MS;
    return false;
  }
  apBurst(e.x + e.w / 2, e.y + e.h / 2, e.colour);
  apScore += AP_ENEMY_STATS[e.type].points;
  return true;
}
```

- [ ] **Step 4: Add the train branch to the enemy-hits-player loop**

In `apUpdate`, inside the `hitSearch:` labelled loop, replace the single line `apCars.splice(i, 1);` with:

```js
        if (e.type === 'train') {
          e.segments[eb.segIndex].alive = false;
          if (e.segments.every(s => !s.alive)) apCars.splice(i, 1);
        } else {
          apCars.splice(i, 1);
        }
```

Nothing else in `apUpdate` changes for this task — the dart-hits-enemy loop already iterates `apEnemyHitBoxes(e)` generically from Task 1 and needs no edits.

- [ ] **Step 5: Add `apSpawnTrainEntity` and wire it into `apSpawnEnemy`**

Add this function immediately after `apSpawnEnemy` (from Task 1):

```js
function apSpawnTrainEntity() {
  const n = AP_TRAIN_MIN_CARS + Math.floor(Math.random() * (AP_TRAIN_MAX_CARS - AP_TRAIN_MIN_CARS + 1));
  const w = AP_TRAIN_CARRIAGE_W;
  const totalH = n * AP_TRAIN_CARRIAGE_H + (n - 1) * AP_TRAIN_GAP;
  apCars.push({
    type: 'train',
    x: 8 + Math.random() * (AP_W - w - 16),
    y: -totalH - 10,
    w, h: totalH,   // the whole train's span — used only for the off-screen cull
    speed: apCarSpeed() * (0.85 + Math.random() * 0.4),
    colour: AP_CAR_COLOURS[Math.floor(Math.random() * AP_CAR_COLOURS.length)],
    segments: Array.from({ length: n }, () => ({ alive: true })),
  });
}
```

Then change `apSpawnEnemy`'s first line from `const type  = apPickEnemyType();` to keep that line, but add a train branch immediately after it — the function becomes:

```js
function apSpawnEnemy() {
  const type = apPickEnemyType();
  if (type === 'train') { apSpawnTrainEntity(); return; }
  const stats = AP_ENEMY_STATS[type];
  apCars.push({
    type,
    x: 8 + Math.random() * (AP_W - stats.w - 16),
    y: -stats.h - 10,
    w: stats.w,
    h: stats.h,
    speed: apCarSpeed() * stats.baseSpeedMul * (0.85 + Math.random() * 0.4),
    hp: stats.hp,
    hitFlashT: 0,
    colour: AP_CAR_COLOURS[Math.floor(Math.random() * AP_CAR_COLOURS.length)],
  });
}
```

- [ ] **Step 6: Widen `apPickEnemyType` to include trains (interim)**

Replace the whole function with:

```js
// Interim weighting — Task 3 adds rocket cars here too, Task 5 replaces this
// whole function with distance-gated unlocking.
function apPickEnemyType() {
  const r = Math.random();
  if (r < 0.55) return 'car';
  if (r < 0.85) return 'medium';
  return 'train';
}
```

- [ ] **Step 7: Add `apDrawTrain` and wire it into `apDrawEnemy`**

Replace `apDrawEnemy`'s body with:

```js
function apDrawEnemy(e) {
  if (e.type === 'train') { apDrawTrain(e); return; }
  apDrawCar(e);
}
```

Then add, immediately after `apDrawEnemy`:

```js
// Draws each alive carriage with the same tyre/window motif as apDrawCar,
// scaled to carriage size, with a small gap between carriages — so a
// destroyed middle carriage reads as a visible hole in the train, and the
// remaining carriages keep moving together at the train's shared speed.
function apDrawTrain(e) {
  e.segments.forEach((seg, i) => {
    if (!seg.alive) return;
    const y = e.y + i * (AP_TRAIN_CARRIAGE_H + AP_TRAIN_GAP);
    apDrawCar({ x: e.x, y, w: AP_TRAIN_CARRIAGE_W, h: AP_TRAIN_CARRIAGE_H, colour: e.colour, hitFlashT: 0 });
  });
}
```

- [ ] **Step 8: Syntax check**

```bash
node --check js/arcade/asherplane.js
```

Expected: no output.

- [ ] **Step 9: Hand-trace (no browser available)**

Write into your report:
1. Spawn a train with `n = 4`. Trace `apEnemyHitBoxes` producing 4 boxes at `y`, `y+44`, `y+88`, `y+132` (carriage height 40 + gap 4). Destroy carriage index 1 (`apDamageEnemy` with `box.segIndex === 1`): confirm `e.segments[1].alive` becomes `false`, the function returns `false` (3 carriages remain alive), and a subsequent call to `apEnemyHitBoxes` on the same entity now yields only 3 boxes — index 1 is skipped, not reindexed (i.e. the remaining boxes still carry `segIndex` 0, 2, 3, not 0, 1, 2).
2. Destroy the remaining 3 carriages in any order; confirm `apDamageEnemy` returns `true` only on the hit that empties the last `alive` segment, regardless of which `segIndex` that is.
3. Trace the enemy-hits-player branch: colliding with carriage index 2 of a still-mostly-alive train sets `apLives -= 1` exactly once, marks only `segments[2].alive = false`, and does NOT call `apCars.splice` (the train survives with 3 carriages) — versus colliding with the last remaining carriage, which does splice the whole entity.
4. Confirm `apDrawTrain` never throws for a destroyed carriage — the `if (!seg.alive) return;` inside the `forEach` guards it.

- [ ] **Step 10: Commit**

```bash
git add js/arcade/asherplane.js
git commit -m "feat(arcade): trains — multi-compartment enemies, 1 hit per carriage

3-5 carriages, built on Task 1's hit-box generalisation: each alive
carriage is its own box in apEnemyHitBoxes, so the existing dart-hits-
enemy loop needed no changes at all. Destroying a carriage leaves a
visible gap; the whole train is removed only once every carriage is
gone. Colliding with the player costs one life and removes just the
carriage that was hit, same rule as any other enemy.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Rocket cars

Adds the one-shot, straight-line, non-tracking enemy — the first with diagonal motion.

**Files:**
- Modify: `js/arcade/asherplane.js`

**Interfaces:**
- Consumes: `AP_ENEMY_STATS`, `apCars`, `apPlayer`, `apCarSpeed()`, `apParts`, `apDrawCar(car)`, `apDrawEnemy(e)` (all from Task 1/2/existing)
- Produces: `AP_ROCKET_IDLE_MIN_MS/MAX_MS`, `AP_ROCKET_BOOST_MUL`, `AP_ROCKET_TRAIL_MS`, `apSpawnRocket()`, `apBoostRocket(c)`, `apRocketTrail(x, y)`, `apDrawRocket(e)`

- [ ] **Step 1: Add rocket constants and its `AP_ENEMY_STATS` entry**

Add to `AP_ENEMY_STATS` (from Task 1) a new key, so the object reads:

```js
const AP_ENEMY_STATS = {
  car:    { w: 28, h: 44, hp: 1, baseSpeedMul: 1.0,  points: 10 },
  medium: { w: 36, h: 56, hp: 2, baseSpeedMul: 0.85, points: 25 },
  rocket: { w: 28, h: 44, hp: 1, baseSpeedMul: 1.0,  points: 20 },
};
```

Then add, immediately after the `AP_TRAIN_*` constants (from Task 2):

```js
const AP_ROCKET_IDLE_MIN_MS = 500;
const AP_ROCKET_IDLE_MAX_MS = 800;
const AP_ROCKET_BOOST_MUL   = 1.2;   // vs. apCarSpeed() at the moment it boosts
const AP_ROCKET_TRAIL_MS    = 70;    // how often it emits a trail puff while boosting
```

- [ ] **Step 2: Add `apSpawnRocket` and wire it into `apSpawnEnemy`**

Add this function immediately after `apSpawnTrainEntity` (from Task 2):

```js
function apSpawnRocket() {
  const stats = AP_ENEMY_STATS.rocket;
  apCars.push({
    type: 'rocket',
    x: 8 + Math.random() * (AP_W - stats.w - 16),
    y: -stats.h - 10,
    w: stats.w,
    h: stats.h,
    speed: apCarSpeed() * stats.baseSpeedMul * (0.85 + Math.random() * 0.4),
    hp: stats.hp,
    hitFlashT: 0,
    phase: 'idle',
    idleT: AP_ROCKET_IDLE_MIN_MS + Math.random() * (AP_ROCKET_IDLE_MAX_MS - AP_ROCKET_IDLE_MIN_MS),
    trailT: 0,
    vx: 0,
    vy: 0,
    colour: '#F97316',   // distinct burnt-orange — reads differently from the random car palette
  });
}
```

In `apSpawnEnemy`, add a rocket branch alongside the existing train branch — the function becomes:

```js
function apSpawnEnemy() {
  const type = apPickEnemyType();
  if (type === 'train')  { apSpawnTrainEntity(); return; }
  if (type === 'rocket') { apSpawnRocket();      return; }
  const stats = AP_ENEMY_STATS[type];
  apCars.push({
    type,
    x: 8 + Math.random() * (AP_W - stats.w - 16),
    y: -stats.h - 10,
    w: stats.w,
    h: stats.h,
    speed: apCarSpeed() * stats.baseSpeedMul * (0.85 + Math.random() * 0.4),
    hp: stats.hp,
    hitFlashT: 0,
    colour: AP_CAR_COLOURS[Math.floor(Math.random() * AP_CAR_COLOURS.length)],
  });
}
```

- [ ] **Step 3: Add `apBoostRocket` and `apRocketTrail`**

Add these two functions immediately after `apSpawnRocket`:

```js
// Aims once at the player's position at THIS exact instant, then never
// re-aims — a straight line, not a homing missile. Called when a rocket
// car's idle window expires.
function apBoostRocket(c) {
  const dx  = apPlayer.x - (c.x + c.w / 2);
  const dy  = apPlayer.y - (c.y + c.h / 2);
  const len = Math.max(1, Math.hypot(dx, dy));
  const spd = apCarSpeed() * AP_ROCKET_BOOST_MUL;
  c.vx = (dx / len) * spd;
  c.vy = (dy / len) * spd;
  c.phase = 'boost';
}

// A light trail puff — deliberately NOT apBurst (12 particles is an
// explosion, too heavy to emit every 70ms for a couple of seconds of boost).
function apRocketTrail(x, y) {
  for (let i = 0; i < 3; i++) {
    const a = Math.PI / 2 + (Math.random() - 0.5) * 0.8;
    const s = 20 + Math.random() * 40;
    apParts.push({
      x, y,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: 0.2 + Math.random() * 0.15, max: 0.35,
      colour: '#FDBA74',
    });
  }
}
```

- [ ] **Step 4: Give rockets their own movement branch in `apUpdate`**

In `apUpdate`, the enemy-movement `forEach` currently reads (as left by Task 1):

```js
  apCars.forEach(c => {
    c.y += c.speed * dt;
    if (c.hitFlashT > 0) c.hitFlashT = Math.max(0, c.hitFlashT - dt * 1000);
  });
```

Replace it with:

```js
  apCars.forEach(c => {
    if (c.type === 'rocket') {
      if (c.phase === 'idle') {
        c.y += c.speed * dt;
        c.idleT -= dt * 1000;
        if (c.idleT <= 0) apBoostRocket(c);
      } else {
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.trailT += dt * 1000;
        if (c.trailT >= AP_ROCKET_TRAIL_MS) {
          c.trailT = 0;
          apRocketTrail(c.x + c.w / 2, c.y + c.h);
        }
      }
    } else {
      c.y += c.speed * dt;
    }
    if (c.hitFlashT > 0) c.hitFlashT = Math.max(0, c.hitFlashT - dt * 1000);
  });
```

Immediately below that same block, the off-screen cull currently reads `apCars = apCars.filter(c => c.y < AP_H + 60);`. A boosted rocket can now drift off the left or right edge without its `y` ever exceeding that bound. Replace the cull with:

```js
  apCars = apCars.filter(c => c.y < AP_H + 60 && c.x > -80 && c.x < AP_W + 80);
```

- [ ] **Step 5: Add rockets to `apPickEnemyType` (interim)**

Replace the whole function with:

```js
// Interim weighting — Task 5 replaces this whole function with
// distance-gated unlocking.
function apPickEnemyType() {
  const r = Math.random();
  if (r < 0.45) return 'car';
  if (r < 0.70) return 'medium';
  if (r < 0.85) return 'rocket';
  return 'train';
}
```

- [ ] **Step 6: Add `apDrawRocket` and wire it into `apDrawEnemy`**

Replace `apDrawEnemy`'s body with:

```js
function apDrawEnemy(e) {
  if (e.type === 'train')  { apDrawTrain(e);  return; }
  if (e.type === 'rocket') { apDrawRocket(e); return; }
  apDrawCar(e);
}
```

Then add, immediately after `apDrawEnemy`:

```js
// Small-car silhouette plus two rear wing fins. The flame trail is drawn
// through the shared particle system (apRocketTrail, emitted from apUpdate)
// — this only draws the vehicle body.
function apDrawRocket(e) {
  apDrawCar(e);
  const g = apCtx, x = e.x, y = e.y, w = e.w, h = e.h;
  g.fillStyle = '#7C2D12';
  g.beginPath();
  g.moveTo(x - 2, y + h - 6);  g.lineTo(x - 9, y + h + 4); g.lineTo(x - 2, y + h - 14);
  g.closePath(); g.fill();
  g.beginPath();
  g.moveTo(x + w + 2, y + h - 6); g.lineTo(x + w + 9, y + h + 4); g.lineTo(x + w + 2, y + h - 14);
  g.closePath(); g.fill();
}
```

- [ ] **Step 7: Syntax check**

```bash
node --check js/arcade/asherplane.js
```

Expected: no output.

- [ ] **Step 8: Hand-trace (no browser available)**

Write into your report:
1. A freshly spawned rocket has `phase: 'idle'` and falls straight down (`c.y += c.speed * dt`, `c.x` untouched) for `idleT` milliseconds (500-800).
2. When `idleT` reaches ≤0, `apBoostRocket` is called exactly once: trace it computing `dx`/`dy` from the player's position AT THAT MOMENT, normalising by `len`, and setting `vx`/`vy`. Confirm nothing in the `'boost'` branch of the movement `forEach` ever recomputes `vx`/`vy` again — it only applies them.
3. Confirm the off-screen cull's new `c.x > -80 && c.x < AP_W + 80` bounds only matter for a boosted rocket (every other type's `x` never leaves `[8, AP_W-8-w]`), so this change is a no-op for cars/mediums/trains.
4. Confirm `apRocketTrail` pushes exactly 3 particles per call, each with `life` in `[0.2, 0.35]` — short enough that the trail can't accumulate unboundedly even during a long boost, since the existing particle filter (`p.life > 0`) already runs every frame.

- [ ] **Step 9: Commit**

```bash
git add js/arcade/asherplane.js
git commit -m "feat(arcade): rocket cars — one-shot straight-line boost toward the player

Falls like a small car for a short idle window, then aims once at the
player's position at that instant and holds that line — never re-aims,
so it's dodgeable rather than a homing threat. First enemy with
horizontal motion, so the off-screen cull now also checks x bounds.
1 hit, worth 20 points.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Double-shot powerup

Adds the collectible that changes auto-fire from one bullet to two, cleared on the next life lost.

**Files:**
- Modify: `js/arcade/asherplane.js`

**Interfaces:**
- Consumes: `apPlayer`, `apPlayerBox()`, `apAABB`, `apBurst`, `AP_SOUND`, `apResetRun()` (existing)
- Produces: `apPowerups` (array), `apPowerupT`, `apDoubleShot` (bool), `AP_POWERUP_INTERVAL_MS`, `AP_POWERUP_SPEED`, `apDrawPowerup(p)`

- [ ] **Step 1: Add runtime state and constants**

In the `── Runtime state ──` block, immediately after the existing `let apSpawnT = 0;` line, add:

```js
let apPowerups   = [];
let apPowerupT   = 0;
let apDoubleShot = false;
```

In the `── Tuning ──` block, immediately after `AP_ROCKET_TRAIL_MS` (from Task 3), add:

```js
const AP_POWERUP_INTERVAL_MS = 9000;   // roughly one chance every 9s of play
const AP_POWERUP_SPEED       = 90;
```

- [ ] **Step 2: Add the powerup sound**

In `AP_SOUND`, add a new entry alongside the existing five:

```js
  powerup:   () => playSecretBeep(880),
```

- [ ] **Step 3: Reset powerup state in `apResetRun`**

In `apResetRun`, immediately after the existing `apDyingT  = 0;` line, add:

```js
  apPowerups   = [];
  apPowerupT   = 0;
  apDoubleShot = false;
```

(`apClearGameOverT();` stays as the last line of the function, unchanged.)

- [ ] **Step 4: Change auto-fire to respect `apDoubleShot`**

In `apUpdate`, the auto-fire block currently reads:

```js
  apFireT += dt * 1000;
  if (apFireT >= AP_FIRE_MS) {
    apFireT = 0;
    apBullets.push({ x: apPlayer.x - 2, y: apPlayer.y - 18, w: 4, h: 11 });
  }
```

Replace it with:

```js
  apFireT += dt * 1000;
  if (apFireT >= AP_FIRE_MS) {
    apFireT = 0;
    if (apDoubleShot) {
      apBullets.push({ x: apPlayer.x - 10, y: apPlayer.y - 18, w: 4, h: 11 });
      apBullets.push({ x: apPlayer.x + 6,  y: apPlayer.y - 18, w: 4, h: 11 });
    } else {
      apBullets.push({ x: apPlayer.x - 2, y: apPlayer.y - 18, w: 4, h: 11 });
    }
  }
```

- [ ] **Step 5: Add powerup spawn/move/pickup, and clear on life loss**

Immediately after the enemy movement/cull block (`apCars = apCars.filter(...)`, as it stands after Task 3) and before the dart-hits-enemy loop, insert:

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

Then, in the enemy-hits-player `hitSearch:` loop, immediately after the line `apLives -= 1;`, add:

```js
        apDoubleShot = false;
```

- [ ] **Step 6: Draw the powerup**

In `apDraw`, immediately after the line `apCars.forEach(apDrawEnemy);`, add:

```js
    apPowerups.forEach(apDrawPowerup);
```

Then add this function immediately after `apDrawCar` (before `apDrawEnemy`):

```js
function apDrawPowerup(p) {
  const g = apCtx;
  g.fillStyle = '#38BDF8';
  g.fillRect(p.x, p.y, p.w, p.h);
  g.fillStyle = '#0B0B0B';
  g.font = 'bold 16px monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('2', p.x + p.w / 2, p.y + p.h / 2 + 1);
  g.textBaseline = 'alphabetic';
}
```

- [ ] **Step 7: Syntax check**

```bash
node --check js/arcade/asherplane.js
```

Expected: no output.

- [ ] **Step 8: Hand-trace (no browser available)**

Write into your report:
1. `apPowerupT` reaching `AP_POWERUP_INTERVAL_MS` with `apPowerups.length === 0` spawns exactly one powerup and resets `apPowerupT` to 0; while one is already on screen, the timer keeps counting but the `apPowerups.length === 0` guard blocks a second spawn.
2. Colliding with it sets `apDoubleShot = true` and removes it from `apPowerups` via the `filter` callback's `return false`.
3. The next life lost sets `apDoubleShot = false` via the new line in the `hitSearch:` loop, regardless of which enemy type caused it (the line sits before the `if (e.type === 'train')` branch added in Task 2, so it runs for every type).
4. Confirm picking it up while `apDoubleShot` is already `true` is a harmless no-op — setting a boolean already `true` to `true` again.
5. Confirm `apResetRun` clears all three new pieces of state (`apPowerups`, `apPowerupT`, `apDoubleShot`) so a new run never inherits the previous run's powerup.

- [ ] **Step 9: Commit**

```bash
git add js/arcade/asherplane.js
git commit -m "feat(arcade): double-shot powerup, cleared on the next life lost

A standalone collectible (own spawn timer, not a kill-drop) that
doubles auto-fire to two side-by-side bullets while active. The flag
clears the instant a life is lost, in the same branch that already
handles a hit — so losing it reads as part of \"you got hit,\" not a
separate timer running out. No stacking: picking it up again while
already active is a no-op.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Distance-driven difficulty and scoring

Replaces the score-driven difficulty curve with a distance (survival-time) one, gates the new enemy types behind distance thresholds, and splits scoring into a survival trickle plus kill bonuses.

**Files:**
- Modify: `js/arcade/asherplane.js`

**Interfaces:**
- Consumes: `apScore`, `apSpawnInterval()`, `apCarSpeed()`, `apPickEnemyType()`, `apResetRun()`, `apQualifies(score)`, `apSubmitScore(name, score)`, `apEndRun()`, `apDrawHud`, `apDrawNameEntry`, `apDrawLeaderboard`, `apStagePointer` (all existing/from earlier tasks)
- Produces: `apDistance` (runtime state), `AP_SCORE_PER_SECOND`, `AP_UNLOCK_MEDIUM_S/ROCKET_S/TRAIN_S`, `apScoreInt()`

- [ ] **Step 1: Add `apDistance` runtime state and reset it**

In the `── Runtime state ──` block, immediately after `let apScore = 0;`, add:

```js
let apDistance = 0;   // seconds survived while 'playing' — drives difficulty, not score
```

In `apResetRun`, immediately after the existing `apScore   = 0;` line, add:

```js
  apDistance = 0;
```

- [ ] **Step 2: Add the score-per-second constant and the integer-score helper**

In the `── Tuning ──` block, immediately after `AP_POWERUP_SPEED` (from Task 4), add:

```js
const AP_SCORE_PER_SECOND = 4;   // the "staying alive" trickle
```

Immediately after `apResetRun`, add:

```js
// apScore accumulates fractionally (the survival trickle below is added
// every frame), so every place that DISPLAYS or SUBMITS a score must floor
// it first — this is the one place that happens.
function apScoreInt() { return Math.floor(apScore); }
```

- [ ] **Step 3: Accumulate distance and the score trickle in `apUpdate`**

In `apUpdate`, immediately after the line `if (apState !== 'playing') return;`, add:

```js
  apDistance += dt;
  apScore    += dt * AP_SCORE_PER_SECOND;
```

This places both accumulators after the `'dying'` early-return, so neither advances once a run has ended, and after the caller-level pause guard in `apLoop` (which skips calling `apUpdate` at all while the sound overlay is open) — so distance and the trickle both freeze exactly when the player does.

- [ ] **Step 4: Re-key the difficulty curves off `apDistance`**

Replace the two functions:

```js
function apSpawnInterval() { return Math.max(280, 900 - apScore * 1.2); }
function apCarSpeed()      { return 70 + Math.min(90, apScore * 0.35); }
```

with:

```js
// ── Difficulty — driven by apDistance (seconds survived), not apScore, so a
// kill streak can't spiral the spawn rate on its own. Both curves stay
// clamped: harder, then flat, never impossible. First-pass numbers, tunable.
function apSpawnInterval() { return Math.max(280, 900 - apDistance * 9); }
function apCarSpeed()      { return 70 + Math.min(90, apDistance * 3); }
```

- [ ] **Step 5: Replace `apPickEnemyType` with distance-gated unlocking**

Add these three constants immediately above the function (in the `── Tuning ──` block, alongside the other unlock-adjacent constants):

```js
const AP_UNLOCK_MEDIUM_S = 20;
const AP_UNLOCK_ROCKET_S = 40;
const AP_UNLOCK_TRAIN_S  = 65;
```

Replace the whole function (this supersedes the interim versions from Tasks 1-3):

```js
// The enemy pool. Once a type unlocks (by apDistance) it joins at equal
// weight with everything already unlocked — no per-type ramp beyond that.
function apPickEnemyType() {
  const pool = ['car'];
  if (apDistance >= AP_UNLOCK_MEDIUM_S) pool.push('medium');
  if (apDistance >= AP_UNLOCK_ROCKET_S) pool.push('rocket');
  if (apDistance >= AP_UNLOCK_TRAIN_S)  pool.push('train');
  return pool[Math.floor(Math.random() * pool.length)];
}
```

- [ ] **Step 6: Floor the score everywhere it's displayed or submitted**

In `apDrawHud`, change `g.fillText(String(apScore).padStart(6, '0'), 10, 22);` to:

```js
  g.fillText(String(apScoreInt()).padStart(6, '0'), 10, 22);
```

In `apDrawNameEntry`, change `g.fillText(String(apScore).padStart(6, '0'), AP_W / 2, 215);` to:

```js
  g.fillText(String(apScoreInt()).padStart(6, '0'), AP_W / 2, 215);
```

In `apDrawLeaderboard`, change `` g.fillText(`THIS RUN: ${String(apScore).padStart(6, '0')}`, AP_W / 2, 158); `` to:

```js
  g.fillText(`THIS RUN: ${String(apScoreInt()).padStart(6, '0')}`, AP_W / 2, 158);
```

In `apEndRun`, change `if (apQualifies(apScore)) {` to:

```js
  if (apQualifies(apScoreInt())) {
```

In `apStagePointer`, inside the `'nameEntry'` branch, change `apSubmitScore(apInitials.map(i => AP_ALPHABET[i]).join(''), apScore);` to:

```js
        apSubmitScore(apInitials.map(i => AP_ALPHABET[i]).join(''), apScoreInt());
```

- [ ] **Step 7: Syntax check**

```bash
node --check js/arcade/asherplane.js
```

Expected: no output.

- [ ] **Step 8: Hand-trace (no browser available)**

Write into your report:
1. `apDistance` only increments inside the `apState === 'playing'` branch of `apUpdate`, which itself is only called from `apLoop` when `!paused` — so it freezes both during `'dying'` and while the sound overlay is open, and resumes at the correct rate afterward (no banked time, since `apLastT` is updated unconditionally in `apLoop` regardless of pause state — confirm this by re-reading `apLoop`, which this task does not modify).
2. `apPickEnemyType()` at `apDistance = 10` returns `pool = ['car']` only; at `25` returns `['car','medium']`; at `45` returns `['car','medium','rocket']`; at `70` returns all four. Trace each threshold boundary (e.g. exactly `20.0`) resolves via `>=`, so medium is included exactly at the threshold, not one tick after.
3. `apScoreInt()` always returns a whole number even mid-frame with a fractional `apScore` (e.g. `apScore = 47.83` → `apScoreInt()` → `47`), and every display/submission site now goes through it — grep the file for `apScore` to confirm no remaining direct `String(apScore)` or bare `apScore` reads at the 5 sites this task changed.
4. Confirm `apSpawnInterval()`/`apCarSpeed()` still return the same shape of value (a number, clamped) as before — only their input variable changed, not their callers' expectations.

- [ ] **Step 9: Commit**

```bash
git add js/arcade/asherplane.js
git commit -m "feat(arcade): distance-driven difficulty and a survival-plus-kills score

apDistance (seconds survived) replaces apScore as the sole difficulty
driver, decoupled so a kill streak can't spiral the spawn rate. Medium
vehicles, rocket cars and trains now unlock at 20s/40s/65s instead of
spawning from the start. Score splits into a steady survival trickle
(the floor) plus kill points (the bonus) — apScore is now fractional
internally, floored via apScoreInt() at every display/submission site.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Final verification

Manual, on a real device — same posture as v1 (spec §9). No headless harness exists or should be added for this.

- [ ] A medium vehicle visibly flashes white on hit 1 and is destroyed (with score) on hit 2
- [ ] A train's carriages can be shot down individually, in any order, leaving a visible gap; the train disappears only once the last carriage is gone
- [ ] Colliding with a train costs exactly one life and removes only the carriage that was hit (unless it was the last one)
- [ ] A rocket car falls straight briefly, then visibly re-aims once toward wherever the player is standing at that moment, trails a flame while boosting, and never re-aims again
- [ ] The powerup pickup visibly changes fire from one bullet to two; losing a life reverts it to one; picking it up again while active does nothing bad
- [ ] Score climbs slowly while only dodging (no kills), and jumps on every kill
- [ ] New enemy types appear roughly in the stated order as a run goes on (car-only early, medium ~20s, rocket ~40s, train ~65s) — a stopwatch or just playing through ~70s is enough to eyeball this
- [ ] Spawn rate/speed still caps rather than becoming unfair at high distance
- [ ] A double-shot player firing at a 2-hp medium or a train can land both bullets in one frame without any double-scoring or a stuck hp/segment state
- [ ] Regression: everything from v1's own final checklist still holds — multi-touch steering, the sound-overlay pause, the death beat (shake, particles, staggered sounds), the leaderboard, quitting mid-run
