// Little Sylly Games — Engine
// Shared primitives: audio, screen routing, reset, global state.
// Loaded first. All symbols here are global and available to plugin files.

// ── Global audio state ────────────────────────────────────────────────────────
let isMuted      = localStorage.getItem('sylly-muted') === 'true';
let masterVolume = parseFloat(localStorage.getItem('sylly-volume') ?? '0.6');
let audioCtx     = null;

// ── Gamebox routing ───────────────────────────────────────────────────────────
let activeGameId = null;  // set by each plugin on entry; cleared by resetToLobby

// ── DOM: all screen IDs ───────────────────────────────────────────────────────
const allScreens = [
  'screen-lobby', 'screen-menu', 'screen-setup',
  'screen-gatekeeper', 'screen-active-play', 'screen-gameover',
  'screen-gm-menu', 'screen-gm-setup', 'screen-gm-input', 'screen-gm-pass-gate',
  'screen-gm-reveal-gate', 'screen-gm-reveal', 'screen-gm-result',
  'screen-ss-menu', 'screen-ss-setup', 'screen-ss-vault-gate', 'screen-ss-vault',
  'screen-ss-encrypt', 'screen-ss-broadcast', 'screen-ss-intercept',
  'screen-ss-decode-gate', 'screen-ss-decode', 'screen-ss-resolution', 'screen-ss-gameover',
  'screen-ss-players', 'screen-ss-first-team',
  'screen-ss-tiebreak', 'screen-ss-intel-intro', 'screen-ss-intel-guess', 'screen-ss-intel-summary',
  'screen-secret-controller',
  'screen-secret-terminal',
  'screen-gm-concede',
  'screen-jec-menu', 'screen-jec-roster', 'screen-jec-order',
  'screen-jec-prep', 'screen-jec-sifting',
  'screen-jec-tally', 'screen-jec-washup',
];

// ── Web Audio API ─────────────────────────────────────────────────────────────
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone({ type = 'sine', freq, startTime, duration, gain = 0.3 }) {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.connect(env);
  env.connect(ctx.destination);
  osc.type = type;
  osc.frequency.value = freq;
  const scaledGain = gain * masterVolume;
  env.gain.setValueAtTime(scaledGain, startTime);
  env.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

// YAY! — bright ascending collect chime: C5 → E5 → G5 (triangle, musical)
function playSuccess() {
  if (isMuted) return;
  const ctx = getAudioCtx(), now = ctx.currentTime;
  playTone({ type: 'triangle', freq: 523, startTime: now,        duration: 0.12, gain: 0.22 });
  playTone({ type: 'triangle', freq: 659, startTime: now + 0.08, duration: 0.12, gain: 0.22 });
  playTone({ type: 'triangle', freq: 784, startTime: now + 0.16, duration: 0.18, gain: 0.22 });
}

// NAY! — cartoon descending boing (square sweep 280→120 Hz, gentle gain)
function playBoing() {
  if (isMuted) return;
  const ctx = getAudioCtx(), now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.connect(env);
  env.connect(ctx.destination);
  osc.type = 'square';
  osc.frequency.setValueAtTime(280, now);
  osc.frequency.exponentialRampToValueAtTime(120, now + 0.20);
  env.gain.setValueAtTime(0.18, now);
  env.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
  osc.start(now);
  osc.stop(now + 0.23);
}

// SKIP — breezy swish: sweep up then tail off down
function playWhoosh() {
  if (isMuted) return;
  const ctx = getAudioCtx(), now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.connect(env);
  env.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(350, now);
  osc.frequency.exponentialRampToValueAtTime(700, now + 0.08);
  osc.frequency.exponentialRampToValueAtTime(250, now + 0.18);
  env.gain.setValueAtTime(0.14, now);
  env.gain.exponentialRampToValueAtTime(0.001, now + 0.20);
  osc.start(now);
  osc.stop(now + 0.21);
}

// PILL/TOGGLE — tactile micro-pop
function playPillClick() {
  if (isMuted) return;
  const ctx = getAudioCtx();
  playTone({ type: 'sine', freq: 900, startTime: ctx.currentTime, duration: 0.025, gain: 0.08 });
}

// DONE/CLOSE — satisfying two-note confirm: G4 → C5
function playDone() {
  if (isMuted) return;
  const ctx = getAudioCtx(), now = ctx.currentTime;
  playTone({ type: 'sine', freq: 392, startTime: now,        duration: 0.09, gain: 0.18 });
  playTone({ type: 'sine', freq: 523, startTime: now + 0.07, duration: 0.12, gain: 0.18 });
}

// LAUNCH — energetic 3-note arpeggio for big CTAs (Play, Let's Go, Start Turn, Play Again)
function playLaunch() {
  if (isMuted) return;
  const ctx = getAudioCtx(), now = ctx.currentTime;
  playTone({ type: 'triangle', freq: 330, startTime: now,        duration: 0.10, gain: 0.20 });
  playTone({ type: 'triangle', freq: 392, startTime: now + 0.07, duration: 0.10, gain: 0.20 });
  playTone({ type: 'triangle', freq: 494, startTime: now + 0.14, duration: 0.15, gain: 0.20 });
}

// RESUME — warm two-note rise for "back to it" positive confirms
function playResume() {
  if (isMuted) return;
  const ctx = getAudioCtx(), now = ctx.currentTime;
  playTone({ type: 'sine', freq: 392, startTime: now,        duration: 0.09, gain: 0.15 });
  playTone({ type: 'sine', freq: 659, startTime: now + 0.06, duration: 0.13, gain: 0.15 });
}

// EXIT — gentle two-note fall for destructive confirms
function playExit() {
  if (isMuted) return;
  const ctx = getAudioCtx(), now = ctx.currentTime;
  playTone({ type: 'sine', freq: 247, startTime: now,        duration: 0.10, gain: 0.15 });
  playTone({ type: 'sine', freq: 196, startTime: now + 0.08, duration: 0.14, gain: 0.12 });
}

// SLIDER TICK — bypasses isMuted and masterVolume so user always hears it.
// value (0–100): scales pitch 700→1600 Hz and gain 0.02→0.14 for an auditory ramp.
function playSliderTick(value = 50) {
  const t = value / 100;
  const freq = 700 + t * 900;
  const gain = 0.02 + t * 0.12;
  const ctx = getAudioCtx(), now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.connect(env); env.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.value = freq;
  env.gain.setValueAtTime(gain, now);
  env.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
  osc.start(now); osc.stop(now + 0.018);
}

// SYLLY ON — fast ascending sparkle arpeggio (playSuccess at 2x speed)
function playSyllyOn() {
  if (isMuted) return;
  const ctx = getAudioCtx(), now = ctx.currentTime;
  playTone({ type: 'triangle', freq: 523, startTime: now,        duration: 0.06, gain: 0.20 });
  playTone({ type: 'triangle', freq: 659, startTime: now + 0.04, duration: 0.06, gain: 0.20 });
  playTone({ type: 'triangle', freq: 784, startTime: now + 0.08, duration: 0.06, gain: 0.20 });
  playTone({ type: 'triangle', freq: 1047,startTime: now + 0.12, duration: 0.10, gain: 0.18 });
}

// SYLLY OFF — descending version, neutral "back to normal"
function playSyllyOff() {
  if (isMuted) return;
  const ctx = getAudioCtx(), now = ctx.currentTime;
  playTone({ type: 'triangle', freq: 784, startTime: now,        duration: 0.06, gain: 0.16 });
  playTone({ type: 'triangle', freq: 659, startTime: now + 0.04, duration: 0.06, gain: 0.14 });
  playTone({ type: 'triangle', freq: 523, startTime: now + 0.08, duration: 0.09, gain: 0.12 });
}

// ALARM — short 3-pulse radar blip for timer expiry (stops on Transmit)
function playAlarm() {
  if (isMuted) return;
  const ctx = getAudioCtx(), now = ctx.currentTime;
  [0, 0.22, 0.44].forEach(offset => {
    playTone({ type: 'square', freq: 880, startTime: now + offset, duration: 0.12, gain: 0.18 });
  });
}

// TICK — soft clock tick (1 per second during countdown)
function playTick() {
  if (isMuted) return;
  const ctx = getAudioCtx();
  playTone({ freq: 440, startTime: ctx.currentTime, duration: 0.05, gain: 0.15 });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function showScreen(id) {
  allScreens.forEach(s => { document.getElementById(s).style.display = 'none'; });
  const el = document.getElementById(id);
  el.style.display = 'flex';
  el.classList.remove('screen-enter');
  void el.offsetWidth;
  el.classList.add('screen-enter');
}

function toggleMute() {
  isMuted = !isMuted;
  localStorage.setItem('sylly-muted', isMuted);
  // Active play header button
  document.getElementById('btn-mute').textContent = isMuted ? '🔇' : '🔊';
  // Global overlay toggle
  const globalBtn = document.getElementById('global-mute-toggle');
  globalBtn.textContent = isMuted ? 'ON' : 'OFF';
  globalBtn.className   = isMuted ? 'sylly-toggle-on' : 'sylly-toggle-off';
  document.getElementById('global-volume-group').classList.toggle('volume-hidden', isMuted);
  // All screen speaker icons
  document.querySelectorAll('.btn-open-sound').forEach(b => {
    b.textContent = isMuted ? '🔇' : '🔊';
  });
}

function openSoundOverlay() {
  document.getElementById('sound-overlay').style.display = 'flex';
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── Reset (settings intentionally preserved) ──────────────────────────────────
function resetToLobby() {
  stopTimer();
  document.getElementById('quit-overlay').style.display        = 'none';
  document.getElementById('review-overlay').style.display      = 'none';
  document.getElementById('history-overlay').style.display     = 'none';
  document.getElementById('gm-override-overlay').style.display = 'none';
  document.getElementById('gm-quit-overlay').style.display     = 'none';
  document.getElementById('input-team1').value    = '';
  document.getElementById('input-team2').value    = '';
  document.getElementById('input-team1').disabled = false;
  document.getElementById('input-team2').disabled = false;
  // DSTW cold boot
  teamScores      = [0, 0];
  roundLog        = [];
  matchLog        = [];
  regularIdx      = 0;
  syllyIdx        = 0;
  currentWordData = null;
  // Great Minds teardown
  if (gmCountdownTimer) { clearInterval(gmCountdownTimer); gmCountdownTimer = null; }
  gmRound       = 0;
  gmCurrentPair = ['', ''];
  gmRoundLog    = [];
  activeGameId  = null;
  // Sylly Signals teardown
  resetSyllySignals();
  // Secret Mode hard-reset (forward ref — safe at runtime)
  if (typeof resetSecretMode === 'function') resetSecretMode();
  // JEC teardown
  document.getElementById('jec-quit-overlay').style.display        = 'none';
  document.getElementById('jec-settings-overlay').style.display    = 'none';
  document.getElementById('jec-how-to-overlay').style.display      = 'none';
  document.getElementById('jec-oversight-overlay').style.display   = 'none';
  document.getElementById('jec-new-shift-overlay').style.display   = 'none';
  jecRound            = 0;
  jecScores           = [];
  jecWordPool         = [];
  jecInputs           = [];
  jecSignatures       = [];
  jecPoisons          = [];
  jecWordFrequency    = {};
  jecDisplayWords     = {};
  jecMergeMap         = {};
  jecRoundLog         = [];
  jecCurrentPlayerIdx  = 0;
  jecOversightSelected = null;
  jecPoisonedNorms     = new Set();
  showScreen('screen-lobby');
}

function resetToMenu() {
  stopTimer();
  document.getElementById('quit-overlay').style.display    = 'none';
  document.getElementById('review-overlay').style.display  = 'none';
  document.getElementById('history-overlay').style.display = 'none';
  document.getElementById('input-team1').value = '';
  document.getElementById('input-team2').value = '';
  showScreen('screen-menu');
}

// ── Audio control init + listeners ────────────────────────────────────────────
document.getElementById('btn-mute').textContent = isMuted ? '🔇' : '🔊';
document.querySelectorAll('.btn-open-sound').forEach(b => { b.textContent = isMuted ? '🔇' : '🔊'; });
const _globalMute = document.getElementById('global-mute-toggle');
_globalMute.textContent = isMuted ? 'ON' : 'OFF';
_globalMute.className   = isMuted ? 'sylly-toggle-on' : 'sylly-toggle-off';
document.getElementById('global-sound-volume').value             = Math.round(masterVolume * 100);
document.getElementById('global-volume-label').textContent       = `${Math.round(masterVolume * 100)}%`;
document.getElementById('global-volume-group').classList.toggle('volume-hidden', isMuted);

document.getElementById('btn-mute').addEventListener('click', toggleMute);
document.getElementById('global-mute-toggle').addEventListener('click', toggleMute);
document.getElementById('global-sound-volume').addEventListener('input', e => {
  masterVolume = parseInt(e.target.value) / 100;
  localStorage.setItem('sylly-volume', masterVolume);
  document.getElementById('global-volume-label').textContent = `${e.target.value}%`;
  playSliderTick(parseInt(e.target.value));
});
document.getElementById('btn-sound-overlay-done').addEventListener('click', () => {
  playDone();
  document.getElementById('sound-overlay').style.display = 'none';
});
document.querySelectorAll('.btn-open-sound').forEach(b => {
  b.addEventListener('click', () => { playPillClick(); openSoundOverlay(); });
});

// ── Shared word normalisation — used by GM near-sync + future games ───────────
function normaliseWord(w) {
  w = w.toLowerCase().trim();
  if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y'; // berries → berry
  if (w.endsWith('es')  && w.length > 3) return w.slice(0, -2);        // foxes → fox
  if (w.endsWith('s')   && w.length > 2) return w.slice(0, -1);        // cats → cat
  return w;
}
