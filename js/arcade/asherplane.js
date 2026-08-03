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
const AP_CAR_COLOURS  = ['#E63946', '#FFB703', '#52B788', '#9B5DE5', '#00B4D8'];

// ── Audio — one map of moments onto the existing NES-style beep. Same shape as
// CJAR_SOUND / PKO_EVENT_SOUND. Inherits isMuted and masterVolume for free.
// There is deliberately no per-shot sound: at 5 shots/sec it grates.
const AP_SOUND = {
  explode:   () => playSecretBeep(220),
  hit:       () => playSecretBeep(110),
  gameOver:  () => playSecretBeep(160),
  highScore: () => playSecretBeep(1046),
  select:    () => playSecretBeep(660),
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
let apPlayer  = { x: AP_W / 2, y: AP_H - 70, w: 34, h: 30 };
let apBullets = [];
let apCars    = [];
let apParts   = [];
let apStars   = [];
let apFireT   = 0;
let apSpawnT  = 0;

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
}

function apLoop(now) {
  apRafHandle = null;   // this frame's handle is spent — see Important 1 below
  if (!apLastT) apLastT = now;
  // Clamp dt so a backgrounded tab cannot teleport every entity across the
  // screen on the first frame back.
  const dt = Math.min((now - apLastT) / 1000, 0.05);
  apLastT = now;

  if (apState === 'playing') apUpdate(dt);
  apDraw(dt);

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

function apSpawnCar() {
  apCars.push({
    x: 8 + Math.random() * (AP_W - 44),
    y: -50,
    w: 28,
    h: 44,
    speed: apCarSpeed() * (0.85 + Math.random() * 0.4),
    colour: AP_CAR_COLOURS[Math.floor(Math.random() * AP_CAR_COLOURS.length)],
  });
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

function apUpdate(dt) {
  // Player
  const keyDir = (apKeys.right ? 1 : 0) - (apKeys.left ? 1 : 0);
  const dir    = keyDir !== 0 ? keyDir : apDir;
  apPlayer.x  += dir * AP_PLAYER_SPEED * dt;
  const half   = apPlayer.w / 2;
  apPlayer.x   = Math.max(half, Math.min(AP_W - half, apPlayer.x));
  if (apShake  > 0) apShake  = Math.max(0, apShake - dt);
  if (apInvuln > 0) apInvuln = Math.max(0, apInvuln - dt * 1000);

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
  if (apSpawnT >= apSpawnInterval()) { apSpawnT = 0; apSpawnCar(); }
  apCars.forEach(c => { c.y += c.speed * dt; });
  apCars = apCars.filter(c => c.y < AP_H + 60);

  // Dart hits car
  for (let i = apCars.length - 1; i >= 0; i--) {
    const car = apCars[i];
    for (let j = apBullets.length - 1; j >= 0; j--) {
      if (!apAABB(apBullets[j], car)) continue;
      apBurst(car.x + car.w / 2, car.y + car.h / 2, car.colour);
      AP_SOUND.explode();
      apCars.splice(i, 1);
      apBullets.splice(j, 1);
      apScore += 10;
      break;
    }
  }

  // Car hits player
  if (apInvuln <= 0) {
    const box = apPlayerBox();
    for (let i = apCars.length - 1; i >= 0; i--) {
      if (!apAABB(box, apCars[i])) continue;
      apBurst(apCars[i].x + apCars[i].w / 2, apCars[i].y + apCars[i].h / 2, apCars[i].colour);
      apCars.splice(i, 1);
      apLives -= 1;
      apShake  = 0.35;
      apInvuln = AP_INVULN_MS;
      AP_SOUND.hit();
      if (apLives <= 0) { AP_SOUND.gameOver(); apEndRun(); return; }
      break;
    }
  }

  // Particles
  apParts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; });
  apParts = apParts.filter(p => p.life > 0);
}

// Placeholder until Task 6 adds the leaderboard. Task 6 replaces this whole
// function — do not build on it.
function apEndRun() {
  apEnterState('attract');
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

  if (apState === 'playing') {
    apCars.forEach(apDrawCar);
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
