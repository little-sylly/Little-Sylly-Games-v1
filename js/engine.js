// Little Sylly Games — Engine
// Shared primitives: audio, screen routing, reset, global state.
// Loaded first. All symbols here are global and available to plugin files.

// ── Global audio state ────────────────────────────────────────────────────────
let isMuted      = localStorage.getItem('sylly-muted') === 'true';
let masterVolume = parseFloat(localStorage.getItem('sylly-volume') ?? '0.6');
let audioCtx     = null;

// ── Gamebox routing ───────────────────────────────────────────────────────────
let activeGameId = null;  // set by each plugin on entry; cleared by resetToLobby
const SYLLY_VERSION = 'v83'; // must match CACHE_NAME in sw.js — bump both together

// ── Who Goes First shared utility ─────────────────────────────────────────────
let whoFirstConfig      = null;
let whoFirstSelectedIdx = -1;
let whoFirstPath        = null;   // 'random' | 'rps' — drives back-from-confirm routing

// ── DOM: all screen IDs ───────────────────────────────────────────────────────
const allScreens = [
  'screen-lobby', 'screen-who-first', 'screen-menu', 'screen-setup',
  'screen-gatekeeper', 'screen-active-play', 'screen-gameover',
  'screen-gm-menu', 'screen-gm-setup', 'screen-gm-input', 'screen-gm-pass-gate',
  'screen-gm-reveal-gate', 'screen-gm-reveal', 'screen-gm-result',
  'screen-ss-menu', 'screen-ss-setup', 'screen-ss-vault-gate', 'screen-ss-vault',
  'screen-ss-encrypt', 'screen-ss-broadcast', 'screen-ss-intercept', 'screen-ss-standby',
  'screen-ss-decode-gate', 'screen-ss-decode', 'screen-ss-resolution', 'screen-ss-gameover',
  'screen-ss-players',
  'screen-ss-tiebreak', 'screen-ss-intel-intro', 'screen-ss-intel-guess', 'screen-ss-intel-summary',
  'screen-secret-controller',
  'screen-secret-terminal',
  'screen-gm-concede',
  'screen-jec-menu', 'screen-jec-roster', 'screen-jec-order',
  'screen-jec-prep', 'screen-jec-sifting',
  'screen-jec-tally', 'screen-jec-washup',
  'screen-ygi-menu', 'screen-ygi-setup', 'screen-ygi-pass',
  'screen-ygi-prompt', 'screen-ygi-input', 'screen-ygi-reveal',
  'screen-ygi-vote', 'screen-ygi-results', 'screen-ygi-gameover',
  'screen-ygi-sd-intro', 'screen-ygi-sd-input',
  // Late To The Party
  'screen-lttp-menu', 'screen-lttp-setup', 'screen-lttp-briefing', 'screen-lttp-role-reveal',
  'screen-lttp-handover', 'screen-lttp-chat', 'screen-lttp-guess', 'screen-lttp-group-guess', 'screen-lttp-gameover',
  // Natural Selection
  'screen-nat-menu', 'screen-nat-setup', 'screen-nat-handover',
  'screen-nat-observation', 'screen-nat-daily-review', 'screen-nat-selection', 'screen-nat-last-stand',
  'screen-nat-tally', 'screen-nat-gameover',
  // Deep-Sea Deploy
  'screen-dsd-menu', 'screen-dsd-setup', 'screen-dsd-players',
  'screen-dsd-briefing', 'screen-dsd-pass-gate',
  'screen-dsd-captain', 'screen-dsd-crew', 'screen-dsd-execution', 'screen-dsd-sabotage',
  'screen-dsd-spectator', 'screen-dsd-gameover',
  // Multiplayer — 3 shared parameterised screens + LI5-specific monitor
  'screen-mp-mode', 'screen-mp-lobby-host', 'screen-mp-lobby-join',
  'screen-mp-roster',
  'screen-li5-monitor',
  // Bailed
  'screen-bld-menu', 'screen-bld-setup', 'screen-bld-seating', 'screen-bld-pass-gate',
  'screen-bld-role-reveal', 'screen-bld-main', 'screen-bld-aftermath',
  // Group Therapy
  'screen-gth-menu', 'screen-gth-patient-intake', 'screen-gth-disorder-reveal', 'screen-gth-canvas',
  'screen-gth-waiting-room', 'screen-gth-shrink-intro', 'screen-gth-case',
  'screen-gth-case-report', 'screen-gth-big-reveal', 'screen-gth-final-report',
  // The Bluff (dyb)
  'screen-dyb-menu', 'screen-dyb-seating', 'screen-dyb-shake',
  'screen-dyb-table', 'screen-dyb-showdown', 'screen-dyb-gameover',
  'screen-dyb-spirit-board',
  // Pass
  'screen-pass-menu', 'screen-pass-seating', 'screen-pass-table',
  'screen-pass-round-wrap', 'screen-pass-gameover',
  // Net-Trace
  'screen-nt-menu', 'screen-nt-setup', 'screen-nt-handshake', 'screen-nt-allocation', 'screen-nt-gate',
  'screen-nt-build', 'screen-nt-playback', 'screen-nt-summary', 'screen-nt-standby',
  // Fruit Salad
  'screen-frt-menu', 'screen-frt-deal', 'screen-frt-table', 'screen-frt-gameover',
  // Counting Sheep
  'screen-shp-menu', 'screen-shp-table', 'screen-shp-gameover',
  // Flawless
  'screen-flw-menu', 'screen-flw-table', 'screen-flw-showing-result', 'screen-flw-gameover',
  // Pecking Order
  'screen-pko-menu', 'screen-pko-hoard', 'screen-pko-table', 'screen-pko-event',
  'screen-pko-unchallenged', 'screen-pko-clash-result', 'screen-pko-hierarchy',
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

// SONAR PING — DSD: Urchin hit / Sonar Ping transmit (dual sine + water filter)
function playSonarPing() {
  if (isMuted) return;
  const ctx = getAudioCtx(), now = ctx.currentTime;
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass'; filt.frequency.value = 600; filt.Q.value = 1.5;
  filt.connect(ctx.destination);
  // Primary: 880Hz → 440Hz chirp, 1.2s decay
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.exponentialRampToValueAtTime(440, now + 0.3);
  env.gain.setValueAtTime(0.25, now);
  env.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
  osc.connect(env); env.connect(filt);
  osc.start(now); osc.stop(now + 1.25);
  // Harmonic: 1760Hz, 0.2× gain — glassy sonar chirp
  const harm = ctx.createOscillator();
  const harmGain = ctx.createGain();
  harm.type = 'sine'; harm.frequency.value = 1760;
  harmGain.gain.setValueAtTime(0.05, now);
  harmGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
  harm.connect(harmGain); harmGain.connect(filt);
  harm.start(now); harm.stop(now + 0.85);
}

// HULL THUD — DSD: Pressure Mine hit (white noise + resonant lowpass + triangle sub)
function playHullThud() {
  if (isMuted) return;
  const ctx = getAudioCtx(), now = ctx.currentTime;
  // White noise through resonant lowpass — metallic crunch
  const bufLen = Math.floor(ctx.sampleRate * 0.5);
  const noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf;
  const nFilt = ctx.createBiquadFilter();
  nFilt.type = 'lowpass'; nFilt.frequency.value = 80; nFilt.Q.value = 8;
  const nEnv = ctx.createGain();
  nEnv.gain.setValueAtTime(0.6, now);
  nEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  noise.connect(nFilt); nFilt.connect(nEnv); nEnv.connect(ctx.destination);
  noise.start(now); noise.stop(now + 0.45);
  // Triangle sub 70Hz — low-frequency punch
  const sub = ctx.createOscillator();
  const sEnv = ctx.createGain();
  sub.type = 'triangle'; sub.frequency.value = 70;
  sEnv.gain.setValueAtTime(0.35, now);
  sEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  sub.connect(sEnv); sEnv.connect(ctx.destination);
  sub.start(now); sub.stop(now + 0.35);
}

// ABYSS THUD — DSD: Nuclear Mine hit — hull thud + 35Hz sawtooth rumble (2.5s)
function playAbyssThud() {
  if (isMuted) return;
  playHullThud();
  const ctx = getAudioCtx(), now = ctx.currentTime;
  const rumble = ctx.createOscillator();
  const rFilt = ctx.createBiquadFilter();
  const rEnv = ctx.createGain();
  rumble.type = 'sawtooth'; rumble.frequency.value = 35;
  rFilt.type = 'lowpass'; rFilt.frequency.value = 100; rFilt.Q.value = 2;
  rEnv.gain.setValueAtTime(0.4, now);
  rEnv.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
  rumble.connect(rFilt); rFilt.connect(rEnv); rEnv.connect(ctx.destination);
  rumble.start(now); rumble.stop(now + 2.55);
}

// ── Pecking Order (spec §9) ───────────────────────────────────────────────────
// The brief asked for animal calls, roars and herd thunder. Those are sample-based
// and the suite ships no audio files, so these four are abstract-texture re-briefs.

// STAMPEDE — PKO: the herd takes the board. Sub-bass swell + rising filtered noise (~1.2s)
function playStampede() {
  if (isMuted) return;
  const ctx = getAudioCtx(), now = ctx.currentTime;
  // Sub-bass swell — the weight of the herd
  const sub = ctx.createOscillator();
  const sEnv = ctx.createGain();
  sub.type = 'sawtooth';
  sub.frequency.setValueAtTime(38, now);
  sub.frequency.linearRampToValueAtTime(55, now + 1.0);
  sEnv.gain.setValueAtTime(0.0001, now);
  sEnv.gain.exponentialRampToValueAtTime(0.4, now + 0.5);
  sEnv.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
  sub.connect(sEnv); sEnv.connect(ctx.destination);
  sub.start(now); sub.stop(now + 1.25);
  // Rising filtered noise — hooves closing in
  const bufLen = Math.floor(ctx.sampleRate * 1.2);
  const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const nFilt = ctx.createBiquadFilter();
  nFilt.type = 'lowpass'; nFilt.Q.value = 4;
  nFilt.frequency.setValueAtTime(120, now);
  nFilt.frequency.linearRampToValueAtTime(900, now + 1.0);
  const nEnv = ctx.createGain();
  nEnv.gain.setValueAtTime(0.0001, now);
  nEnv.gain.exponentialRampToValueAtTime(0.3, now + 0.6);
  nEnv.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
  noise.connect(nFilt); nFilt.connect(nEnv); nEnv.connect(ctx.destination);
  noise.start(now); noise.stop(now + 1.25);
}

// UNCHALLENGED — PKO: you win an Encounter. Rising three-note sting, brass-ish
function playUnchallenged() {
  if (isMuted) return;
  const ctx = getAudioCtx(), now = ctx.currentTime;
  [[196, 0], [294, 0.10], [392, 0.20]].forEach(([freq, at]) => {
    const osc = ctx.createOscillator();
    const filt = ctx.createBiquadFilter();
    const env = ctx.createGain();
    osc.type = 'sawtooth'; osc.frequency.value = freq;
    filt.type = 'lowpass'; filt.frequency.value = 1400; filt.Q.value = 1;
    env.gain.setValueAtTime(0.0001, now + at);
    env.gain.exponentialRampToValueAtTime(0.18, now + at + 0.03);
    env.gain.exponentialRampToValueAtTime(0.001, now + at + (at === 0.20 ? 0.5 : 0.18));
    osc.connect(filt); filt.connect(env); env.connect(ctx.destination);
    osc.start(now + at); osc.stop(now + at + 0.55);
  });
}

// POACHER — PKO: the wildcard lands. Dry mechanical click + metallic ring —
// deliberately out-of-ecosystem: nothing else in this game sounds man-made.
function playPoacher() {
  if (isMuted) return;
  const ctx = getAudioCtx(), now = ctx.currentTime;
  // Dry click — a trap snapping shut
  const bufLen = Math.floor(ctx.sampleRate * 0.05);
  const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
  const click = ctx.createBufferSource();
  click.buffer = buf;
  const cFilt = ctx.createBiquadFilter();
  cFilt.type = 'highpass'; cFilt.frequency.value = 1800;
  const cEnv = ctx.createGain();
  cEnv.gain.setValueAtTime(0.5, now);
  click.connect(cFilt); cFilt.connect(cEnv); cEnv.connect(ctx.destination);
  click.start(now); click.stop(now + 0.06);
  // Metallic ring — two detuned partials, no musical interval
  [2350, 3130].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'square'; osc.frequency.value = freq;
    env.gain.setValueAtTime(0.0001, now + 0.02);
    env.gain.exponentialRampToValueAtTime(i ? 0.05 : 0.09, now + 0.04);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc.connect(env); env.connect(ctx.destination);
    osc.start(now + 0.02); osc.stop(now + 0.75);
  });
}

// CLASH WIN — PKO: you empty your Hoard. A deepened, slower playSuccess
function playClashWin() {
  if (isMuted) return;
  const ctx = getAudioCtx(), now = ctx.currentTime;
  playTone({ type: 'triangle', freq: 262, startTime: now,        duration: 0.18, gain: 0.26 });
  playTone({ type: 'triangle', freq: 330, startTime: now + 0.14, duration: 0.18, gain: 0.26 });
  playTone({ type: 'triangle', freq: 392, startTime: now + 0.28, duration: 0.35, gain: 0.26 });
  playTone({ type: 'sine',     freq: 131, startTime: now,        duration: 0.7,  gain: 0.18 });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function showScreen(id) {
  allScreens.forEach(s => { const el = document.getElementById(s); if (el) el.style.display = 'none'; });
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
  globalBtn.className   = isMuted ? getMuteToggleOnClass(activeGameId) : 'sylly-toggle-off';
  document.getElementById('global-volume-group').classList.toggle('volume-hidden', isMuted);
  // All screen speaker icons
  document.querySelectorAll('.btn-open-sound').forEach(b => {
    b.textContent = isMuted ? '🔇' : '🔊';
  });
}

function openSoundOverlay() {
  updateSliderTheme(activeGameId);
  const muteBtn = document.getElementById('global-mute-toggle');
  if (isMuted) muteBtn.className = getMuteToggleOnClass(activeGameId);
  document.getElementById('sound-overlay').style.display = 'flex';
}

function updateSliderTheme(gameId) {
  const map = {
    'li5': 'li5-range', 'great-minds': 'sylly-range',
    'sylly-signals': 'ss-range', 'jec': 'jec-range',
    'ygi': 'ygi-range', 'lttp': 'lttp-range',
    'nat': 'nat-range', 'dsd': 'dsd-range',
    'gth': 'gth-range', 'bld': 'bld-range', 'dyb': 'dyb-range', 'pass': 'pass-range',
    'nt': 'nt-range', 'frt': 'frt-range', 'shp': 'shp-range', 'flw': 'flw-range',
    'pko': 'pko-range'
  };
  const el = document.getElementById('global-sound-volume');
  el.className = (map[gameId] || 'stone-range') + ' w-full';
}

function getMuteToggleOnClass(gameId) {
  const map = {
    'li5': 'game-toggle-on-pink', 'great-minds': 'game-toggle-on-purple',
    'sylly-signals': 'game-toggle-on-teal', 'jec': 'game-toggle-on-amber',
    'ygi': 'game-toggle-on-orange', 'lttp': 'game-toggle-on-red',
    'nat': 'game-toggle-on-lime', 'dsd': 'game-toggle-on-cyan',
    'gth': 'game-toggle-on-sage', 'bld': 'game-toggle-on-yellow',
    'dyb': 'game-toggle-on-dyb', 'pass': 'game-toggle-on-zinc',
    'nt': 'game-toggle-on-emerald', 'shp': 'game-toggle-on-indigo',
    'flw': 'game-toggle-on-flw', 'pko': 'game-toggle-on-pko'
  };
  return map[gameId] || 'game-toggle-on-stone';
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
  document.getElementById('quit-overlay').style.display          = 'none';
  document.getElementById('li5-play-again-overlay').style.display = 'none';
  document.getElementById('li5-how-to-overlay').style.display     = 'none';
  document.getElementById('review-overlay').style.display        = 'none';
  document.getElementById('history-overlay').style.display       = 'none';
  document.getElementById('settings-overlay').style.display      = 'none';
  document.getElementById('deck-panel').style.display            = 'none';
  document.getElementById('skip-turn-overlay').style.display     = 'none';
  document.getElementById('gm-override-overlay').style.display = 'none';
  document.getElementById('gm-quit-overlay').style.display     = 'none';
  document.getElementById('gm-settings-overlay').style.display      = 'none';
  document.getElementById('gm-near-sync-overlay').style.display     = 'none';
  document.getElementById('gm-boost-overlay').style.display         = 'none';
  document.getElementById('gm-neural-library-overlay').style.display = 'none';
  document.getElementById('gm-new-frequency-overlay').style.display = 'none';
  document.getElementById('gm-vocab-overlay').style.display         = 'none';
  document.getElementById('gm-concede-overlay').style.display       = 'none';
  document.getElementById('gm-deck-panel').style.display            = 'none';
  document.getElementById('gm-how-to-overlay').style.display        = 'none';
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
  // You Get It? teardown
  if (typeof resetYouGetIt === 'function') resetYouGetIt();
  // Late To The Party teardown
  if (typeof resetLateToTheParty === 'function') resetLateToTheParty();
  // Natural Selection teardown
  document.getElementById('nat-quit-overlay').style.display            = 'none';
  document.getElementById('nat-settings-overlay').style.display        = 'none';
  document.getElementById('nat-how-to-overlay').style.display          = 'none';
  document.getElementById('nat-new-expedition-overlay').style.display  = 'none';
  if (typeof natResetState === 'function') natResetState();
  // Deep-Sea Deploy teardown
  document.getElementById('dsd-quit-overlay').style.display     = 'none';
  document.getElementById('dsd-settings-overlay').style.display = 'none';
  document.getElementById('dsd-how-to-overlay').style.display   = 'none';
  document.getElementById('dsd-confirm-disarm').style.display   = 'none';
  document.getElementById('dsd-new-op-overlay').style.display   = 'none';
  if (typeof dsdResetState === 'function') dsdResetState();
  // Bailed teardown
  const bldSeatingScreen = document.getElementById('screen-bld-seating');
  if (bldSeatingScreen) bldSeatingScreen.style.display = 'none';
  document.getElementById('bld-quit-overlay').style.display            = 'none';
  document.getElementById('bld-settings-overlay').style.display        = 'none';
  document.getElementById('bld-how-to-overlay').style.display          = 'none';
  document.getElementById('bld-second-chances-overlay').style.display  = 'none';
  document.getElementById('bld-plan-detail-overlay').style.display     = 'none';
  document.getElementById('bld-pass-reveal-overlay').style.display     = 'none';
  document.getElementById('bld-role-help-overlay').style.display       = 'none';
  document.getElementById('bld-tip-overlay').style.display             = 'none';
  if (typeof bldResetState === 'function') bldResetState();
  // Group Therapy teardown
  document.getElementById('gth-settings-overlay').style.display    = 'none';
  document.getElementById('gth-how-to-overlay').style.display      = 'none';
  document.getElementById('gth-quit-overlay').style.display        = 'none';
  document.getElementById('gth-new-session-overlay').style.display = 'none';
  if (typeof gthCountdownTimer !== 'undefined' && gthCountdownTimer) { clearInterval(gthCountdownTimer); gthCountdownTimer = null; }
  if (typeof gthPhase2Timer    !== 'undefined' && gthPhase2Timer)    { clearInterval(gthPhase2Timer);    gthPhase2Timer    = null; }
  if (typeof gthIntakeTimer    !== 'undefined' && gthIntakeTimer)    { clearInterval(gthIntakeTimer);    gthIntakeTimer    = null; }
  if (typeof CanvasDraw !== 'undefined') {
    const gthWrapper = document.getElementById('gth-canvas-wrapper');
    if (gthWrapper) CanvasDraw.setTremor(gthWrapper, false);
  }
  if (typeof gthResetState === 'function') gthResetState();
  // The Bluff (dyb) teardown
  document.getElementById('dyb-settings-overlay').style.display    = 'none';
  document.getElementById('dyb-how-to-overlay').style.display      = 'none';
  document.getElementById('dyb-quit-overlay').style.display        = 'none';
  document.getElementById('dyb-new-game-overlay').style.display    = 'none';
  document.getElementById('dyb-slick-picker-overlay').style.display = 'none';
  document.getElementById('dyb-ascent-overlay').style.display      = 'none';
  document.getElementById('dyb-tip-overlay').style.display         = 'none';
  document.getElementById('dyb-chronicle-section').style.display   = 'none';
  dybMyRoll = []; dybAllRolls = []; dybActivePlayers = [];
  dybOnesStripped = false; dybAllegationHistory = []; dybShakeReadyCheck = [];
  // Pass teardown
  document.getElementById('pass-settings-overlay').style.display = 'none';
  document.getElementById('pass-how-to-overlay').style.display   = 'none';
  document.getElementById('pass-quit-overlay').style.display     = 'none';
  document.getElementById('pass-new-deal-overlay').style.display = 'none';
  document.getElementById('pass-history-overlay').style.display  = 'none';
  // Net-Trace teardown
  ['nt-settings-overlay','nt-how-to-overlay','nt-quit-overlay','nt-reboot-overlay','nt-logs-overlay','nt-bridge-preview-overlay'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = 'none';
  });
  document.body.classList.remove('nt-overclock'); // easter-egg theme off
  if (typeof ntResetState === 'function') ntResetState();
  // Fruit Salad teardown
  if (typeof frtResetState === 'function') frtResetState();
  // Counting Sheep teardown
  ['shp-settings-overlay','shp-how-to-overlay','shp-quit-overlay',
   'shp-new-night-overlay','shp-tip-overlay','shp-card-info-overlay','shp-play-log-overlay'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = 'none';
  });
  if (typeof shpResetState === 'function') shpResetState();
  // Flawless teardown
  ['flw-settings-overlay','flw-how-to-overlay','flw-gems-overlay','flw-target-overlay',
   'flw-scratch-overlay','flw-peek-overlay','flw-appraisal-overlay','flw-emerald-overlay',
   'flw-quit-overlay','flw-new-showing-overlay'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = 'none';
  });
  if (typeof flwResetState === 'function') flwResetState();
  // Pecking Order teardown
  ['pko-settings-overlay','pko-challenge-overlay','pko-how-to-overlay','pko-chain-overlay',
   'pko-trail-overlay','pko-quit-overlay','pko-stampede-overlay','pko-new-match-overlay',
   'pko-carrion-overlay'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = 'none';
  });
  if (typeof pkoResetState === 'function') pkoResetState();
  // Help-tip overlay cleanup (Phase 21a)
  ['li5','gm','ss','jec','ygi','lttp','nat','dsd'].forEach(abbr => {
    const el = document.getElementById(`${abbr}-help-tip-overlay`);
    if (el) el.style.display = 'none';
  });
  // Contextual tip overlays (Phase 28)
  ['lttp'].forEach(abbr => {
    const el = document.getElementById(`${abbr}-tip-overlay`);
    if (el) el.style.display = 'none';
  });
  // Play-again confirmation overlays (Phase 29)
  const lttpNewPlansEl = document.getElementById('lttp-new-plans-overlay');
  if (lttpNewPlansEl) lttpNewPlansEl.style.display = 'none';
  // Multiplayer teardown
  if (window.syllyFirebase && window.syllyMultiplayerMode === 'host') {
    // Notify clients before room deletion so the disconnect overlay appears immediately
    try { if (typeof mpSendEnvelope === 'function') mpSendEnvelope({ type: 'LOBBY', payload: { action: 'HOST_END_GAME' } }); } catch (_) {}
    if (typeof syllyTeardownRoom === 'function') syllyTeardownRoom();
  }
  if (window.syllyFirebase && window.syllyMultiplayerMode === 'client' && window.mpClientPlayerRef) {
    try { window.syllyFirebase.remove(window.mpClientPlayerRef); } catch (_) {}
    window.mpClientPlayerRef = null;
  }
  window.syllyMultiplayerMode   = 'single';
  window.syllySyncLocked        = false;
  window.mpLobbyStyle           = 'individual';
  window.mpLobbyRoster          = null;
  window.mpLobbyRosterTeamNames    = null;
  window.mpLobbyRosterCaptainNames = null;
  document.body.classList.remove('mp-sync-locked');
  ['mp-version-mismatch-overlay', 'mp-host-disconnected-overlay',
   'mp-lttp-message-interrupt-overlay', 'mp-network-error-overlay',
   'mp-host-prelobby-overlay'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  document.getElementById('sound-overlay').style.display = 'none';
  updateSliderTheme(null);
  if (isMuted) document.getElementById('global-mute-toggle').className = getMuteToggleOnClass(null);
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
_globalMute.className   = isMuted ? getMuteToggleOnClass(activeGameId) : 'sylly-toggle-off';
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

// ── Who Goes First shared utility ─────────────────────────────────────────────
const _WHO_BTN_BASE = 'min-h-14 w-full rounded-2xl active:scale-95 text-white text-xl font-semibold transition-all duration-150';

function showWhoFirst(config) {
  whoFirstConfig      = config;
  whoFirstSelectedIdx = -1;
  whoFirstPath        = null;
  document.getElementById('who-first-emoji').textContent    = config.emoji;
  document.getElementById('who-first-eyebrow').textContent  = config.eyebrow;
  document.getElementById('who-first-heading').textContent  = config.heading;
  document.getElementById('who-first-prompt').textContent   = config.prompt;
  document.getElementById('btn-who-first-rps-a').textContent = config.teamA;
  document.getElementById('btn-who-first-rps-b').textContent = config.teamB;
  const accentBtn  = config.accentBtnClass  || 'bg-stone-700 hover:bg-stone-800';
  const accentText = config.accentTextClass || 'text-stone-700';
  document.getElementById('btn-who-first-random').className  = `${_WHO_BTN_BASE} ${accentBtn}`;
  document.getElementById('btn-who-first-confirm').className = `${_WHO_BTN_BASE} ${accentBtn}`;
  document.getElementById('who-first-confirm-label').className = `text-2xl font-bold text-center ${accentText}`;
  _whoFirstSubState('method');
  showScreen('screen-who-first');
}

function _whoFirstSubState(state) {
  document.getElementById('who-first-sub-method').style.display  = state === 'method'  ? 'flex' : 'none';
  document.getElementById('who-first-sub-rps').style.display     = state === 'rps'     ? 'flex' : 'none';
  document.getElementById('who-first-sub-confirm').style.display = state === 'confirm' ? 'flex' : 'none';
}

function _whoFirstSelectTeam(idx, path) {
  whoFirstSelectedIdx = idx;
  whoFirstPath        = path;
  const name = idx === 0 ? whoFirstConfig.teamA : whoFirstConfig.teamB;
  document.getElementById('who-first-confirm-label').textContent = `${name} goes first!`;
  document.getElementById('btn-who-first-confirm').textContent   = whoFirstConfig.confirmLabel;
  _whoFirstSubState('confirm');
}

// ── Who Goes First screen listeners ───────────────────────────────────────────
document.getElementById('btn-who-first-random').addEventListener('click', () => {
  playLaunch(); _whoFirstSelectTeam(Math.random() < 0.5 ? 0 : 1, 'random');
});
document.getElementById('btn-who-first-rps').addEventListener('click', () => {
  playPillClick(); _whoFirstSubState('rps');
});
document.getElementById('btn-who-first-rps-a').addEventListener('click', () => {
  playPillClick(); _whoFirstSelectTeam(0, 'rps');
});
document.getElementById('btn-who-first-rps-b').addEventListener('click', () => {
  playPillClick(); _whoFirstSelectTeam(1, 'rps');
});
document.getElementById('btn-who-first-back-from-rps').addEventListener('click', () => {
  playExit(); _whoFirstSubState('method');
});
document.getElementById('btn-who-first-back-from-confirm').addEventListener('click', () => {
  playExit(); _whoFirstSubState(whoFirstPath === 'rps' ? 'rps' : 'method');
});
document.getElementById('btn-who-first-confirm').addEventListener('click', () => {
  playLaunch(); whoFirstConfig.onResult(whoFirstSelectedIdx);
});
