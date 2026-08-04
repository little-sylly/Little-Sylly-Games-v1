// ═══════════════════════════════════════════════════════════════════════════
// asherplane.js — ARCADE CABINET 01. Top-down shmup, procedural canvas art.
// NOT a Sylly Game: no multiplayer, no settings, no Sylly Mode, no harness.
// See docs/superpowers/specs/2026-08-03-arcade-asherplane-design.md § 2.
// Depends on: engine.js (showScreen), secret-mode.js (playSecretBeep)
// ═══════════════════════════════════════════════════════════════════════════

// ── Logical canvas size — ALL drawing code works in these coordinates ────────
const AP_W = 360;
const AP_H = 640;

// ── Tuning ───────────────────────────────────────────────────────────────────
const AP_PLAYER_SPEED = 260;   // logical px/sec
const AP_BULLET_SPEED = 420;
const AP_FIRE_MS      = 200;
const AP_INVULN_MS    = 1500;
const AP_START_LIVES  = 2;
const AP_DYING_MS     = 700;   // the death beat — shake decays, particles fly
const AP_CAR_COLOURS  = ['#E63946', '#FFB703', '#52B788', '#9B5DE5', '#00B4D8'];
const AP_HIT_FLASH_MS = 120;   // a medium vehicle's "took a hit but survived" flash

// Per-type stats for every enemy that presents a single hit box (car, medium
// — rocket joins this table in Task 3). Trains are handled separately: a
// train's length varies per spawn, so it has no single w/h/hp to put here.
const AP_ENEMY_STATS = {
  car:    { w: 28, h: 44, hp: 1, baseSpeedMul: 1.0,  points: 10 },
  medium: { w: 36, h: 56, hp: 2, baseSpeedMul: 0.85, points: 25 },
  rocket: { w: 28, h: 44, hp: 1, baseSpeedMul: 1.0,  points: 20 },
};

const AP_TRAIN_CARRIAGE_W          = 30;
const AP_TRAIN_CARRIAGE_H          = 40;
const AP_TRAIN_GAP                 = 4;
const AP_TRAIN_MIN_CARS            = 3;
const AP_TRAIN_MAX_CARS            = 5;
const AP_TRAIN_POINTS_PER_CARRIAGE = 15;

const AP_ROCKET_IDLE_MIN_MS = 500;
const AP_ROCKET_IDLE_MAX_MS = 800;
const AP_ROCKET_BOOST_MUL   = 1.2;   // vs. apCarSpeed() at the moment it boosts
const AP_ROCKET_TRAIL_MS    = 70;    // how often it emits a trail puff while boosting

const AP_POWERUP_INTERVAL_MS = 9000;   // roughly one chance every 9s of play
const AP_POWERUP_SPEED       = 90;

// ── Audio — one map of moments onto the existing NES-style beep. Same shape as
// CJAR_SOUND / PKO_EVENT_SOUND. Inherits isMuted and masterVolume for free.
// There is deliberately no per-shot sound: at 5 shots/sec it grates.
const AP_SOUND = {
  explode:   () => playSecretBeep(220),
  hit:       () => playSecretBeep(110),
  gameOver:  () => playSecretBeep(160),
  highScore: () => playSecretBeep(1046),
  select:    () => playSecretBeep(660),
  powerup:   () => playSecretBeep(880),
};

// ── Runtime state ────────────────────────────────────────────────────────────
let apCanvas    = null;
let apCtx       = null;
let apRafHandle = null;   // TIMER — cancel in every teardown (logic-engine.md)
let apLastT     = 0;
let apState     = 'attract';

let apScore   = 0;
let apLives   = AP_START_LIVES;
let apShake   = 0;        // seconds remaining
let apInvuln  = 0;        // ms remaining
let apDyingT  = 0;        // ms remaining in the 'dying' state
// TIMER — logic-engine.md § Timer Lifecycle: clear it everywhere apRafHandle is
// cleared, not only on natural expiry. It is armed on the fatal hit and would
// otherwise beep over the lobby if the player taps ✕ inside its 220 ms window.
let apGameOverT = null;
let apPlayer  = { x: AP_W / 2, y: AP_H - 70, w: 34, h: 30 };
let apBullets = [];
let apCars    = [];
let apParts   = [];
let apStars   = [];
let apFireT   = 0;
let apSpawnT  = 0;
let apPowerups   = [];
let apPowerupT   = 0;
let apDoubleShot = false;

let apDir  = 0;                            // -1 left, 0 still, 1 right
let apKeys = { left: false, right: false };

// The single pointer currently allowed to steer #ap-stage — null when free.
// apPtrSteer distinguishes a pointer that claimed the stage to steer (its
// down happened while apState was already 'playing') from one that merely
// tapped a menu button (its down changed apState to 'playing' itself); the
// latter must never steer off its own down-and-hold. See Important 2/3/4.
let apPtrId    = null;
let apPtrSteer = false;

// Session leaderboard. Deliberately NOT cleared by resetArcade() — it survives
// trips to the lobby so two kids can compare scores across an afternoon.
let apLeaderboard = [];

function apStart() {
  apCanvas = document.getElementById('ap-canvas');
  apCtx    = apCanvas.getContext('2d');
  if (apStars.length === 0) {
    for (let i = 0; i < 40; i++) {
      apStars.push({ x: Math.random() * AP_W, y: Math.random() * AP_H,
                     s: 20 + Math.random() * 50, l: 2 + Math.random() * 6 });
    }
  }
  showScreen('screen-arcade-asherplane');
  apResize();
  apEnterState('attract');
}

// Every exit from 'playing' cancels the loop; every entry starts it. Keeping
// both in one place is what stops a stray loop ticking against a dead screen.
function apEnterState(next) {
  apState = next;
  if (apRafHandle) { cancelAnimationFrame(apRafHandle); apRafHandle = null; }
  if (next === 'playing') apResetRun();
  // A fatal hit sets apShake/apInvuln, then apEndRun() lands here with
  // next === 'attract' — apUpdate (the only code that ever decrements them)
  // never runs again outside 'playing', so without this they would be stuck
  // at their hit values and apDraw's unconditional shake translate would
  // jitter the attract screen forever. Cleared on every transition, not only
  // inside apResetRun, precisely because a state change can arrive mid-shake.
  apShake  = 0;
  apInvuln = 0;
  apLastT = 0;
  apRafHandle = requestAnimationFrame(apLoop);
}

// The death beat. Deliberately NOT routed through apEnterState(): that zeroes
// apShake and apInvuln on every transition (which is correct — it stops the
// attract screen shaking forever), and doing so here would kill the very
// feedback this state exists to show. It also must not cancel the RAF loop —
// the loop is what plays the beat.
function apEnterDying() {
  apState  = 'dying';
  apDyingT = AP_DYING_MS;
}

// Cancels the staggered game-over beep. Called from resetArcade() (which covers
// both the ✕ handler and resetToLobby()) and from apResetRun() (so a PLAY AGAIN
// tapped inside the 220 ms window cannot carry a beep into the new run).
function apClearGameOverT() {
  if (apGameOverT) { clearTimeout(apGameOverT); apGameOverT = null; }
}

function apResetRun() {
  apScore   = 0;
  apLives   = AP_START_LIVES;
  apShake   = 0;
  apInvuln  = 0;
  apPlayer.x = AP_W / 2;
  apBullets = [];
  apCars    = [];
  apParts   = [];
  apFireT   = 0;
  apSpawnT  = 0;
  apDir     = 0;   // otherwise a PLAY tap held from the attract screen starts the run already drifting (Important 3)
  apDyingT  = 0;
  apPowerups   = [];
  apPowerupT   = 0;
  apDoubleShot = false;
  apClearGameOverT();
}

function apLoop(now) {
  apRafHandle = null;   // this frame's handle is spent — see Important 1 below
  if (!apLastT) apLastT = now;
  // Clamp dt so a backgrounded tab cannot teleport every entity across the
  // screen on the first frame back.
  const dt = Math.min((now - apLastT) / 1000, 0.05);
  apLastT = now;

  // The global sound overlay is fixed inset-0 at z-[110], so it covers the
  // stage completely: a child adjusting the volume cannot steer and would
  // otherwise lose the run behind it. Freeze rather than fight it.
  const so     = document.getElementById('sound-overlay');
  const paused = !!so && so.style.display !== 'none' && so.style.display !== '';

  // apLastT is updated unconditionally above and dt is clamped, so no time
  // banks up while paused — the run resumes at exactly normal speed. Passing
  // dt 0 to apDraw also holds the star field still rather than scrolling it.
  if (!paused && (apState === 'playing' || apState === 'dying')) apUpdate(dt);
  apDraw(paused ? 0 : dt);

  // apUpdate may itself call apEnterState() mid-frame (e.g. a car ends the
  // run), which schedules its own next frame and leaves apRafHandle non-null
  // — in that case standing down here is what stops a second apLoop chain
  // running alongside the first (the double-speed bug).
  if (!apRafHandle) apRafHandle = requestAnimationFrame(apLoop);
}

// ── Difficulty — both curves are clamped so it gets harder, never impossible.
// At +10/car: score 100 => ~780 ms spawns; score 500 => the 280 ms floor.
function apSpawnInterval() { return Math.max(280, 900 - apScore * 1.2); }
function apCarSpeed()      { return 70 + Math.min(90, apScore * 0.35); }

// Interim weighting — Task 5 replaces this whole function with
// distance-gated unlocking.
function apPickEnemyType() {
  const r = Math.random();
  if (r < 0.45) return 'car';
  if (r < 0.70) return 'medium';
  if (r < 0.85) return 'rocket';
  return 'train';
}

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

// Axis-Aligned Bounding Box overlap. apPlayer.x is a CENTRE; cars and bullets
// use a top-left origin, so the player is converted before comparing.
function apAABB(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

function apPlayerBox() {
  return { x: apPlayer.x - apPlayer.w / 2, y: apPlayer.y - apPlayer.h / 2,
           w: apPlayer.w, h: apPlayer.h };
}

function apBurst(x, y, colour) {
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 40 + Math.random() * 120;
    apParts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
                   life: 0.45 + Math.random() * 0.25, max: 0.7, colour });
  }
}

// Returns the currently-hittable boxes for an enemy entity. A simple entity
// (car, medium — and rocket from Task 3) has exactly one: its own box. A
// train (Task 2) returns one per alive carriage. Both collision loops below
// call this instead of reading e.x/e.y/e.w/e.h directly, so a multi-box
// enemy needs no special-casing in the loops themselves — only here.
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

// Registers one bullet hit against a specific hit-box (as returned by
// apEnemyHitBoxes). Decrements the entity's hp, flashes it if it survives,
// or bursts + scores it if this hit was lethal. Returns true when the WHOLE
// entity is now destroyed, so the caller knows to remove it from apCars.
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
    if (apDoubleShot) {
      apBullets.push({ x: apPlayer.x - 10, y: apPlayer.y - 18, w: 4, h: 11 });
      apBullets.push({ x: apPlayer.x + 6,  y: apPlayer.y - 18, w: 4, h: 11 });
    } else {
      apBullets.push({ x: apPlayer.x - 2, y: apPlayer.y - 18, w: 4, h: 11 });
    }
  }
  apBullets.forEach(b => { b.y -= AP_BULLET_SPEED * dt; });
  apBullets = apBullets.filter(b => b.y + b.h > 0);

  // Spawning
  apSpawnT += dt * 1000;
  if (apSpawnT >= apSpawnInterval()) { apSpawnT = 0; apSpawnEnemy(); }
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
  apCars = apCars.filter(c => c.y < AP_H + 60 && c.x > -80 && c.x < AP_W + 80);

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
        if (e.type === 'train') {
          e.segments[eb.segIndex].alive = false;
          if (e.segments.every(s => !s.alive)) apCars.splice(i, 1);
        } else {
          apCars.splice(i, 1);
        }
        apLives -= 1;
        apDoubleShot = false;
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

// ── Session leaderboard ──────────────────────────────────────────────────────
// Top 5, memory only. Survives resetToLobby() (see resetSecretMode's carve-out)
// but not a page reload — "scores last the afternoon, not forever".
const AP_TOP_N = 5;

function apQualifies(score) {
  if (score <= 0) return false;
  if (apLeaderboard.length < AP_TOP_N) return true;
  return score > apLeaderboard[apLeaderboard.length - 1].score;
}

function apSubmitScore(name, score) {
  apLeaderboard.push({ name, score });
  apLeaderboard.sort((a, b) => b.score - a.score);
  apLeaderboard = apLeaderboard.slice(0, AP_TOP_N);
}

// Three tap-cycling A-Z slots. No <input> anywhere: an iOS keyboard popping up
// over the canvas rescales the whole stage, which is the failure this avoids.
const AP_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
let apInitials = [0, 0, 0];

const AP_SLOTS = [
  { x:  60, y: 300, w: 66, h: 84 },
  { x: 147, y: 300, w: 66, h: 84 },
  { x: 234, y: 300, w: 66, h: 84 },
];
const AP_BTN_OK    = { x: 80, y: 430, w: 200, h: 62 };
const AP_BTN_AGAIN = { x: 60, y: 500, w: 240, h: 62 };

function apEndRun() {
  if (apQualifies(apScore)) {
    apInitials = [0, 0, 0];
    AP_SOUND.highScore();
    apEnterState('nameEntry');
  } else {
    apEnterState('leaderboard');
  }
}

function apDraw(dt) {
  const g = apCtx;
  g.save();
  if (apShake > 0) {
    g.translate((Math.random() - 0.5) * 8 * apShake * 6,
                (Math.random() - 0.5) * 8 * apShake * 6);
  }
  g.fillStyle = '#05070D';
  g.fillRect(-20, -20, AP_W + 40, AP_H + 40);

  // Scrolling star field — cheap, and it is what sells the sense of flying.
  g.fillStyle = '#1E3A5F';
  apStars.forEach(s => {
    if (apState === 'playing') { s.y += s.s * dt; if (s.y > AP_H) { s.y = -s.l; s.x = Math.random() * AP_W; } }
    g.fillRect(s.x, s.y, 2, s.l);
  });

  if (apState === 'playing' || apState === 'dying') {
    apCars.forEach(apDrawEnemy);
    apPowerups.forEach(apDrawPowerup);
    apCtx.fillStyle = '#FDE68A';
    apBullets.forEach(b => apCtx.fillRect(b.x, b.y, b.w, b.h));
    apDrawGlider(apPlayer.x, apPlayer.y, apInvuln > 0 && Math.floor(apInvuln / 100) % 2 === 0);
    apParts.forEach(p => {
      apCtx.globalAlpha = Math.max(0, p.life / p.max);
      apCtx.fillStyle   = p.colour;
      apCtx.fillRect(p.x - 2, p.y - 2, 4, 4);
    });
    apCtx.globalAlpha = 1;
    apDrawHud();
  } else if (apState === 'attract') {
    apDrawAttract();
  } else if (apState === 'nameEntry') {
    apDrawNameEntry();
  } else if (apState === 'leaderboard') {
    apDrawLeaderboard();
  }
  g.restore();
}

// Top-down toy car. Deliberately generic — a coloured body, two light windows
// and four dark tyres. No branding, no badges.
function apDrawCar(car) {
  const g = apCtx, x = car.x, y = car.y, w = car.w, h = car.h;
  g.fillStyle = '#0B0B0B';
  g.fillRect(x - 3,     y + 6,      4, 11);
  g.fillRect(x + w - 1, y + 6,      4, 11);
  g.fillRect(x - 3,     y + h - 17, 4, 11);
  g.fillRect(x + w - 1, y + h - 17, 4, 11);
  g.fillStyle = car.colour;
  g.fillRect(x, y + 3, w, h - 6);
  g.fillRect(x + 3, y, w - 6, h);
  g.fillStyle = 'rgba(255,255,255,0.72)';
  g.fillRect(x + 5, y + 8,      w - 10, 8);
  g.fillRect(x + 5, y + h - 18, w - 10, 7);
  g.fillStyle = 'rgba(0,0,0,0.18)';
  g.fillRect(x + 5, y + 20, w - 10, h - 40);
  // Medium vehicles take 2 hits; this is the only signal a young player gets
  // that the first shot connected but didn't destroy it.
  if (car.hitFlashT > 0) {
    g.fillStyle = `rgba(255,255,255,${0.55 * (car.hitFlashT / AP_HIT_FLASH_MS)})`;
    g.fillRect(x - 3, y, w + 6, h);
  }
}

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

// Dispatches by enemy type. A passthrough for now — Task 2 adds the train
// branch, Task 3 adds the rocket branch. car/medium share apDrawCar's
// silhouette, scaled by e.w/e.h.
function apDrawEnemy(e) {
  if (e.type === 'train')  { apDrawTrain(e);  return; }
  if (e.type === 'rocket') { apDrawRocket(e); return; }
  apDrawCar(e);
}

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

function apDrawGlider(x, y, dim) {
  const g = apCtx;
  g.save();
  g.translate(x, y);
  if (dim) g.globalAlpha = 0.3;
  g.fillStyle = '#2E7FD4';
  g.beginPath();                                   // wings
  g.moveTo(-17, 6); g.lineTo(0, -2); g.lineTo(17, 6);
  g.lineTo(17, 11); g.lineTo(0, 7);  g.lineTo(-17, 11);
  g.closePath(); g.fill();
  g.beginPath();                                   // fuselage
  g.moveTo(0, -15); g.lineTo(5, 10); g.lineTo(0, 15); g.lineTo(-5, 10);
  g.closePath(); g.fill();
  g.fillRect(-8, 11, 16, 4);                       // tail
  g.fillStyle = '#9BD1FF';                         // nose highlight
  g.beginPath();
  g.moveTo(0, -15); g.lineTo(2, -6); g.lineTo(-2, -6);
  g.closePath(); g.fill();
  g.restore();
}

function apDrawHud() {
  const g = apCtx;
  g.fillStyle = '#4ADE80';
  g.font = 'bold 14px monospace';
  g.textAlign = 'left';
  g.fillText(String(apScore).padStart(6, '0'), 10, 22);
  g.textAlign = 'right';
  g.fillText('✈'.repeat(Math.max(0, apLives)), AP_W - 10, 22);
}

function apDrawAttract() {
  const g = apCtx;
  g.textAlign = 'center';
  g.fillStyle = '#4ADE80';
  g.font = 'bold 30px monospace';
  g.fillText('ASHERPLANE', AP_W / 2, 190);
  g.font = '12px monospace';
  g.fillText('HOLD LEFT OR RIGHT TO FLY', AP_W / 2, 225);
  g.fillText('YOU SHOOT ALL BY YOURSELF', AP_W / 2, 245);
  apDrawGlider(AP_W / 2, 330, false);
  apDrawButton(AP_BTN_PLAY, 'PLAY');
}

function apDrawNameEntry() {
  const g = apCtx;
  g.textAlign = 'center';
  g.fillStyle = '#FDE68A';
  g.font = 'bold 26px monospace';
  g.fillText('NEW HIGH SCORE!', AP_W / 2, 170);
  g.fillStyle = '#4ADE80';
  g.font = 'bold 34px monospace';
  g.fillText(String(apScore).padStart(6, '0'), AP_W / 2, 215);
  g.font = '12px monospace';
  g.fillText('TAP A LETTER TO CHANGE IT', AP_W / 2, 260);
  AP_SLOTS.forEach((r, i) => {
    g.strokeStyle = '#4ADE80';
    g.lineWidth = 3;
    g.strokeRect(r.x, r.y, r.w, r.h);
    g.fillStyle = '#4ADE80';
    g.font = 'bold 44px monospace';
    g.textBaseline = 'middle';
    g.fillText(AP_ALPHABET[apInitials[i]], r.x + r.w / 2, r.y + r.h / 2 + 2);
    g.textBaseline = 'alphabetic';
  });
  apDrawButton(AP_BTN_OK, 'OK');
}

function apDrawLeaderboard() {
  const g = apCtx;
  g.textAlign = 'center';
  g.fillStyle = '#4ADE80';
  g.font = 'bold 24px monospace';
  g.fillText('HIGH SCORES', AP_W / 2, 130);
  g.font = '13px monospace';
  g.fillStyle = '#94A3B8';
  g.fillText(`THIS RUN: ${String(apScore).padStart(6, '0')}`, AP_W / 2, 158);
  g.font = 'bold 20px monospace';
  if (apLeaderboard.length === 0) {
    g.fillStyle = '#334155';
    g.font = '14px monospace';
    g.fillText('NO SCORES YET', AP_W / 2, 250);
  }
  apLeaderboard.forEach((e, i) => {
    const y = 210 + i * 38;
    g.fillStyle = i === 0 ? '#FDE68A' : '#4ADE80';
    g.textAlign = 'left';
    g.fillText(`${i + 1}. ${e.name}`, 80, y);
    g.textAlign = 'right';
    g.fillText(String(e.score).padStart(6, '0'), AP_W - 80, y);
  });
  apDrawButton(AP_BTN_AGAIN, 'PLAY AGAIN');
}

// Shared big-target button. Menu screens are drawn on the canvas and hit-tested
// against these rects, so there is one input path rather than a DOM overlay.
const AP_BTN_PLAY = { x: 80, y: 430, w: 200, h: 62 };

function apDrawButton(r, label) {
  const g = apCtx;
  g.strokeStyle = '#4ADE80';
  g.lineWidth = 3;
  g.strokeRect(r.x, r.y, r.w, r.h);
  g.fillStyle = '#4ADE80';
  g.font = 'bold 22px monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 1);
  g.textBaseline = 'alphabetic';
}

// Convert a pointer event to logical 360x640 canvas coordinates.
function apToLogical(e) {
  const r = apCanvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * AP_W / r.width,
           y: (e.clientY - r.top)  * AP_H / r.height };
}

function apHit(r, p) {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

// Pointer lives on #ap-stage, not the canvas, so the whole letterboxed area
// steers. During play only the half of the stage matters, so a thumb never has
// to find a button; on menu screens the tap is hit-tested against the drawn
// button rects instead.
//
// Only one pointer is ever tracked at a time (apPtrId) — a second finger
// touching the stage is ignored entirely, so it can neither steer nor stop
// the first finger's steering by lifting (Important 2). apPtrSteer is fixed
// at the moment a pointer is claimed, from the apState that was current
// BEFORE this same down event might change it — a finger that taps PLAY
// claims the stage with apPtrSteer = false, so its own held-down jitter can
// never be read as steering once apState flips to 'playing' a line later
// (Important 3). A claimed pointer's 'up' always zeroes apDir, whatever
// apState is by the time it lifts (Important 4).
function apStagePointer(e, phase) {
  const stage = document.getElementById('ap-stage');

  if (phase === 'down') {
    if (apPtrId !== null) return;               // stage already claimed by another finger
    apPtrId    = e.pointerId;
    apPtrSteer = apState === 'playing';
    if (apPtrSteer) {
      const r = stage.getBoundingClientRect();
      apDir = e.clientX < r.left + r.width / 2 ? -1 : 1;
      return;
    }
    const p = apToLogical(e);
    if (apState === 'attract' && apHit(AP_BTN_PLAY, p)) {
      AP_SOUND.select();
      apEnterState('playing');
      return;
    }
    if (apState === 'nameEntry') {
      for (let i = 0; i < AP_SLOTS.length; i++) {
        if (!apHit(AP_SLOTS[i], p)) continue;
        apInitials[i] = (apInitials[i] + 1) % AP_ALPHABET.length;
        AP_SOUND.select();
        return;
      }
      if (apHit(AP_BTN_OK, p)) {
        AP_SOUND.select();
        apSubmitScore(apInitials.map(i => AP_ALPHABET[i]).join(''), apScore);
        apEnterState('leaderboard');
      }
      return;
    }
    if (apState === 'leaderboard' && apHit(AP_BTN_AGAIN, p)) {
      AP_SOUND.select();
      apEnterState('playing');
    }
    return;
  }

  if (e.pointerId !== apPtrId) return;           // not the pointer we claimed — ignore

  if (phase === 'up') {
    apPtrId    = null;
    apPtrSteer = false;
    apDir      = 0;
    return;
  }

  // phase === 'move'
  if (!apPtrSteer) return;                       // this pointer began as a menu tap — its drag never steers
  const r = stage.getBoundingClientRect();
  apDir = e.clientX < r.left + r.width / 2 ? -1 : 1;
}

(function apBindInput() {
  const stage = document.getElementById('ap-stage');
  stage.addEventListener('pointerdown',   e => { stage.setPointerCapture(e.pointerId); apStagePointer(e, 'down'); });
  stage.addEventListener('pointermove',   e => { if (e.buttons) apStagePointer(e, 'move'); });
  stage.addEventListener('pointerup',     e => apStagePointer(e, 'up'));
  stage.addEventListener('pointercancel', e => apStagePointer(e, 'up'));

  document.addEventListener('keydown', e => {
    if (document.getElementById('screen-arcade-asherplane').style.display === 'none') return;
    if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') apKeys.left  = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') apKeys.right = true;
  });
  document.addEventListener('keyup', e => {
    if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') apKeys.left  = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') apKeys.right = false;
  });

  document.getElementById('btn-ap-exit').addEventListener('click', () => {
    resetArcade();
    resetToLobby();
  });

  // A child WILL put the iPad down mid-run. Without this the loop keeps ticking
  // against a hidden screen, and the dt clamp alone would not stop the run
  // continuing unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.getElementById('screen-arcade-asherplane').style.display === 'none') return;
    if (document.hidden) {
      if (apRafHandle) { cancelAnimationFrame(apRafHandle); apRafHandle = null; }
      // Desktop: a key held while the window blurs never delivers its keyup
      // here, so the plane would slide forever on return.
      apKeys.left = apKeys.right = false;
    } else if (!apRafHandle) {
      apLastT = 0;
      apRafHandle = requestAnimationFrame(apLoop);
    }
  });
})();

// Fit the fixed 360x640 logical canvas into its container, preserving aspect,
// and size the backing store at (CSS scale × devicePixelRatio) so the canvas
// renders at native resolution instead of being upscaled from a fixed
// 360x640 buffer — on a full-size iPad `scale` alone is already ~1.9, so
// omitting it left the canvas visibly soft. The logical coordinate space
// every draw call uses is unaffected — it stays exactly 360x640.
function apResize() {
  if (!apCanvas) return;
  const box   = apCanvas.parentElement;
  const scale = Math.min(box.clientWidth / AP_W, box.clientHeight / AP_H);
  const dpr   = Math.min(window.devicePixelRatio || 1, 2);
  apCanvas.style.width  = Math.floor(AP_W * scale) + 'px';
  apCanvas.style.height = Math.floor(AP_H * scale) + 'px';
  apCanvas.width        = Math.floor(AP_W * scale * dpr);
  apCanvas.height       = Math.floor(AP_H * scale * dpr);
  apCtx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
}

// Called from engine.js resetToLobby() via forward reference.
function resetArcade() {
  if (apRafHandle) { cancelAnimationFrame(apRafHandle); apRafHandle = null; }
  apClearGameOverT();
  apState    = 'attract';
  apDir      = 0;
  apPtrId    = null;
  apPtrSteer = false;
  apKeys.left = apKeys.right = false;
  // apLeaderboard is NOT cleared — see the declaration above.
}

window.addEventListener('resize', () => {
  if (document.getElementById('screen-arcade-asherplane').style.display !== 'none') apResize();
});
