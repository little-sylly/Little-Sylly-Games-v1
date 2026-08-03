// ═══════════════════════════════════════════════════════════════════════════
// asherplane.js — ARCADE CABINET 01. Top-down shmup, procedural canvas art.
// NOT a Sylly Game: no multiplayer, no settings, no Sylly Mode, no harness.
// See docs/superpowers/specs/2026-08-03-arcade-asherplane-design.md § 2.
// Depends on: engine.js (showScreen), secret-mode.js (playSecretBeep)
// ═══════════════════════════════════════════════════════════════════════════

// ── Logical canvas size — ALL drawing code works in these coordinates ────────
const AP_W = 360;
const AP_H = 640;

// ── Runtime state ────────────────────────────────────────────────────────────
let apCanvas    = null;
let apCtx       = null;
let apRafHandle = null;   // TIMER — cancel in every teardown (logic-engine.md)

// Session leaderboard. Deliberately NOT cleared by resetArcade() — it survives
// trips to the lobby so two kids can compare scores across an afternoon.
let apLeaderboard = [];

function apStart() {
  apCanvas = document.getElementById('ap-canvas');
  apCtx    = apCanvas.getContext('2d');
  showScreen('screen-arcade-asherplane');
  apResize();
  apCtx.fillStyle = '#000';
  apCtx.fillRect(0, 0, AP_W, AP_H);
  apCtx.fillStyle = '#4ADE80';
  apCtx.font = 'bold 24px monospace';
  apCtx.textAlign = 'center';
  apCtx.fillText('ASHERPLANE', AP_W / 2, AP_H / 2);
}

// Fit the fixed 360x640 logical canvas into its container, preserving aspect,
// and scale the backing store by devicePixelRatio so it stays sharp on Retina.
function apResize() {
  if (!apCanvas) return;
  const box   = apCanvas.parentElement;
  const scale = Math.min(box.clientWidth / AP_W, box.clientHeight / AP_H);
  const dpr   = Math.min(window.devicePixelRatio || 1, 2);
  apCanvas.style.width  = Math.floor(AP_W * scale) + 'px';
  apCanvas.style.height = Math.floor(AP_H * scale) + 'px';
  apCanvas.width        = Math.floor(AP_W * dpr);
  apCanvas.height       = Math.floor(AP_H * dpr);
  apCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// Called from engine.js resetToLobby() via forward reference.
function resetArcade() {
  if (apRafHandle) { cancelAnimationFrame(apRafHandle); apRafHandle = null; }
}

window.addEventListener('resize', () => {
  if (document.getElementById('screen-arcade-asherplane').style.display !== 'none') apResize();
});
