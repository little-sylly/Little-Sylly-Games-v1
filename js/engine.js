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
  'screen-ss-players',
  'screen-ss-tiebreak', 'screen-ss-intel-intro', 'screen-ss-intel-guess', 'screen-ss-intel-summary',
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

function playSuccess() {
  if (isMuted) return;
  const ctx = getAudioCtx(), now = ctx.currentTime;
  playTone({ type: 'triangle', freq: 523, startTime: now,         duration: 0.12, gain: 0.22 });
  playTone({ type: 'triangle', freq: 659, startTime: now + 0.08, duration: 0.12, gain: 0.22 });
  playTone({ type: 'triangle', freq: 784, startTime: now + 0.16, duration: 0.18, gain: 0.22 });
}

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

function playPillClick() {
  if (isMuted) return;
  const ctx = getAudioCtx();
  playTone({ type: 'sine', freq: 900, startTime: ctx.currentTime, duration: 0.025, gain: 0.08 });
}

function playDone() {
  if (isMuted) return;
  const ctx = getAudioCtx(), now = ctx.currentTime;
  playTone({ type: 'sine', freq: 392, startTime: now,         duration: 0.09, gain: 0.18 });
  playTone({ type: 'sine', freq: 523, startTime: now + 0.07, duration: 0.12, gain: 0.18 });
}

function playLaunch() {
  if (isMuted) return;
  const ctx = getAudioCtx(), now = ctx.currentTime;
  playTone({ type: 'triangle', freq: 330, startTime: now,         duration: 0.10, gain: 0.20 });
  playTone({ type: 'triangle', freq: 392, startTime: now + 0.07, duration: 0.10, gain: 0.20 });
  playTone({ type: 'triangle', freq: 494, startTime: now + 0.14, duration: 0.15, gain: 0.20 });
}

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

// ── Helpers ───────────────────────────────────────────────────────────────────
function showScreen(id) {
  allScreens.forEach(s => { 
    const screen = document.getElementById(s);
    if(screen) screen.style.display = 'none'; 
  });
  const el = document.getElementById(id);
  if(el) {
    el.style.display = 'flex';
    el.classList.remove('screen-enter');
    void el.offsetWidth;
    el.classList.add('screen-enter');
  }
}

function toggleMute() {
  isMuted = !isMuted;
  localStorage.setItem('sylly-muted', isMuted);
  
  const muteBtn = document.getElementById('btn-mute');
  if (muteBtn) muteBtn.textContent = isMuted ? '🔇' : '🔊';

  const globalBtn = document.getElementById('global-mute-toggle');
  if (globalBtn) {
    globalBtn.textContent = isMuted ? 'ON' : 'OFF';
    globalBtn.className   = isMuted ? 'sylly-toggle-on' : 'sylly-toggle-off';
  }

  const volGrp = document.getElementById('global-volume-group');
  if (volGrp) volGrp.classList.toggle('volume-hidden', isMuted);

  document.querySelectorAll('.btn-open-sound').forEach(b => {
    b.textContent = isMuted ? '🔇' : '🔊';
  });
}

function openSoundOverlay() {
  const overlay = document.getElementById('sound-overlay');
  if(overlay) overlay.style.display = 'flex';
}

// ── Audio control init + Safety Checks ────────────────────────────────────────
// This section prevents the "null" errors that break the buttons

const initMuteBtn = document.getElementById('btn-mute');
if (initMuteBtn) initMuteBtn.textContent = isMuted ? '🔇' : '🔊';

document.querySelectorAll('.btn-open-sound').forEach(b => { b.textContent = isMuted ? '🔇' : '🔊'; });

const initGlobalMute = document.getElementById('global-mute-toggle');
if (initGlobalMute) {
  initGlobalMute.textContent = isMuted ? 'ON' : 'OFF';
  initGlobalMute.className   = isMuted ? 'sylly-toggle-on' : 'sylly-toggle-off';
}

const initVolSlider = document.getElementById('global-sound-volume');
if (initVolSlider) initVolSlider.value = Math.round(masterVolume * 100);

const initVolLabel = document.getElementById('global-volume-label');
if (initVolLabel) initVolLabel.textContent = `${Math.round(masterVolume * 100)}%`;

const initVolGrp = document.getElementById('global-volume-group');
if (initVolGrp) initVolGrp.classList.toggle('volume-hidden', isMuted);

// Listeners
if (initMuteBtn) initMuteBtn.addEventListener('click', toggleMute);
if (initGlobalMute) initGlobalMute.addEventListener('click', toggleMute);

if (initVolSlider) {
  initVolSlider.addEventListener('input', e => {
    masterVolume = parseInt(e.target.value) / 100;
    localStorage.setItem('sylly-volume', masterVolume);
    if (initVolLabel) initVolLabel.textContent = `${e.target.value}%`;
    playSliderTick(parseInt(e.target.value));
  });
}

const soundDoneBtn = document.getElementById('btn-sound-overlay-done');
if (soundDoneBtn) {
  soundDoneBtn.addEventListener('click', () => {
    playDone();
    const overlay = document.getElementById('sound-overlay');
    if(overlay) overlay.style.display = 'none';
  });
}

document.querySelectorAll('.btn-open-sound').forEach(b => {
  b.addEventListener('click', () => { playPillClick(); openSoundOverlay(); });
});