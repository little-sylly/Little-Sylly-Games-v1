// ═══════════════════════════════════════════════════════════════════════════
// secret-mode.js — Konami gateway, Sylly-OS Terminal, expansion proxy state
// Depends on: engine.js (getAudioCtx, masterVolume, isMuted, showScreen)
// ═══════════════════════════════════════════════════════════════════════════

// ── Global proxy state ────────────────────────────────────────────────────────
let isSecretMode = false;
let activeExpansion = null;
window.activeExpansionOverrides = null;

// ── Terminal config — add new expansions/games here only ─────────────────────
const SM_TERMINAL_CONFIG = {
  expansions: [
    { id: 'dota2',      label: 'DOTA 2',          locked: false, file: 'data/secret_words.json' },
    { id: 'classified', label: '??? [CLASSIFIED]', locked: true,  file: null },
  ],
  games: [
    { id: 'li5', label: "LIKE I'M FIVE",  screen: 'screen-menu'    },
    { id: 'gm',  label: 'GREAT MINDS',    screen: 'screen-gm-menu' },
    { id: 'ss',  label: 'SECRET SIGNALS', screen: 'screen-ss-menu' },
  ],
};

// ── Expansion overrides — pushed to window.activeExpansionOverrides at launch ─
// Keys match exact plugin variable names so SM-4/5 can apply directly.
const SM_EXPANSION_OVERRIDES = {
  dota2: {
    // LI5 (dstw.js)
    settingTimer:       60,
    settingRounds:      5,
    settingTabooCount:  10,
    settingPenaltyMode: 'points',
    settingSkipFree:    false,
    settingSylly:       true,
    settingSyllyPct:    40,
    // GM (great-minds.js)
    gmFrequencyRange:     'chaotic',
    gmMemoryGuard:        true,
    gmResonanceTolerance: 'normal',   // "Resonant" display label
    gmInfiniteResync:     true,
    gmSignalBoost:        false,
    gmSyllyIntensity:     'sub-atomic', // Sylly Mode OFF
    // SS (sylly-signals.js)
    ssDifficultyLevel:        3,
    ssSettingInterceptsToWin: 2,
    ssRerollLimitSetting:     Infinity, // unlimited rerolls
    ssIntelSyllyMode:         true,
  },
};

// ── Settings display map — human-readable labels for the terminal summary ─────
const SM_SETTINGS_DISPLAY = {
  li5: [
    { key: 'settingTimer',       label: 'Timer',       fmt: v => `${v}s` },
    { key: 'settingRounds',      label: 'Rounds',      fmt: v => String(v) },
    { key: 'settingTabooCount',  label: 'No-No List',  fmt: v => `${v} words` },
    { key: 'settingPenaltyMode', label: 'Penalty',     fmt: v => v[0].toUpperCase() + v.slice(1) },
    { key: 'settingSkipFree',    label: 'Skip Cost',   fmt: v => v ? 'Free' : 'Costs Points' },
    { key: 'settingSylly',       label: 'Sylly Mode',  fmt: v => v ? 'ON' : 'OFF' },
    { key: 'settingSyllyPct',    label: 'Sylly %',     fmt: v => `${v}%` },
  ],
  gm: [
    { key: 'gmFrequencyRange',     label: 'Frequency',       fmt: v => v[0].toUpperCase() + v.slice(1) },
    { key: 'gmMemoryGuard',        label: 'Memory Guard',    fmt: v => v ? 'ON' : 'OFF' },
    { key: 'gmResonanceTolerance', label: 'Resonance',       fmt: v => v === 'normal' ? 'Resonant' : 'High Fidelity' },
    { key: 'gmInfiniteResync',     label: 'Infinite Resync', fmt: v => v ? 'ON' : 'OFF' },
    { key: 'gmSignalBoost',        label: 'Signal Boost',    fmt: v => v ? 'ON' : 'OFF' },
    { key: 'gmSyllyIntensity',     label: 'Sylly Mode',      fmt: v => v === 'supernova' ? 'Neural Storm' : 'OFF' },
  ],
  ss: [
    { key: 'ssDifficultyLevel',        label: 'Difficulty',        fmt: v => (['', 'Standard', 'Wild', 'Wilder'][v] ?? String(v)) },
    { key: 'ssSettingInterceptsToWin', label: 'Intercepts to Win', fmt: v => String(v) },
    { key: 'ssRerollLimitSetting',     label: 'Rerolls',           fmt: v => v === Infinity ? 'Unlimited' : String(v) },
    { key: 'ssIntelSyllyMode',         label: 'Intel Phase',       fmt: v => v ? 'ON' : 'OFF' },
  ],
};

// ── Expansion word bank — loaded at launch, shared by all plugins ─────────────
let secretWords = [];

// ── Expansion data index — built at launch from secretWords ──────────────────
// vocab:      Set of normalised strings for O(1) guard checks
// byCategory: { CategoryName: [primary words...] } — sorted, for display
// misc:       all nono_list terms deduplicated + sorted — for display
function smBuildExpansionData(words) {
  const byCategory = {};
  const miscSet    = new Set();
  const vocab      = new Set();
  words.forEach(entry => {
    const cat = entry.category;
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(entry.word);
    vocab.add(normaliseWord(entry.word));
    entry.nono_list.forEach(term => {
      vocab.add(normaliseWord(term));
      miscSet.add(term);
    });
  });
  Object.keys(byCategory).forEach(cat => byCategory[cat].sort());
  window.activeExpansionData = { vocab, byCategory, misc: [...miscSet].sort() };
}

// ── Terminal UI state ─────────────────────────────────────────────────────────
let smSelectedExpansion = null;
let smSelectedGame      = null;
let smTypewriterTimers  = [];

// ── Konami sequence: U U D D L R L R B A Start ───────────────────────────────
const SM_KONAMI = ['U','U','D','D','L','R','L','R','B','A','S'];
let smKonamiBuffer = [];

// ── Reset (called by engine.js resetToLobby via forward reference) ────────────
function resetSecretMode() {
  isSecretMode  = false;
  activeExpansion = null;
  window.activeExpansionOverrides = null;
  smKonamiBuffer      = [];
  secretWords         = [];
  smSelectedExpansion = null;
  smSelectedGame      = null;
  smTypewriterTimers.forEach(clearTimeout);
  smTypewriterTimers  = [];
  document.querySelectorAll('.sm-menu-banner').forEach(el => el.remove());
  window.activeExpansionData = null;
  smUpdateProgress();
}

// ── Retro beep (square wave, NES-style) ──────────────────────────────────────
function playSecretBeep(freq = 440) {
  if (isMuted) return;
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.connect(env);
  env.connect(ctx.destination);
  osc.type = 'square';
  osc.frequency.value = freq;
  env.gain.setValueAtTime(0.12 * masterVolume, now);
  env.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
  osc.start(now);
  osc.stop(now + 0.07);
}

// ── Progress dots display (controller screen) ─────────────────────────────────
function smUpdateProgress() {
  const el = document.getElementById('sm-konami-progress');
  if (!el) return;
  const filled = smKonamiBuffer.length;
  const total  = SM_KONAMI.length;
  el.textContent = '●'.repeat(filled) + '○'.repeat(total - filled);
}

// ── Konami buffer check ───────────────────────────────────────────────────────
function smHandleButton(code) {
  playSecretBeep();
  smKonamiBuffer.push(code);
  if (smKonamiBuffer.length > SM_KONAMI.length) smKonamiBuffer.shift();
  smUpdateProgress();

  if (smKonamiBuffer.join('') === SM_KONAMI.join('')) {
    smKonamiBuffer = [];
    smUpdateProgress();
    // Victory arpeggio
    playSecretBeep(523);
    setTimeout(() => playSecretBeep(659), 100);
    setTimeout(() => playSecretBeep(784), 200);
    // Show ACCESS GRANTED then slide to terminal
    setTimeout(() => {
      document.getElementById('sm-controller-status').textContent = '[ ACCESS GRANTED ]';
      document.getElementById('sm-controller-status').style.color = '#00FF00';
    }, 350);
    setTimeout(() => smOpenTerminal(), 1400);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ── Sylly-OS Terminal ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function smOpenTerminal() {
  smSelectedExpansion = null;
  smSelectedGame      = null;
  // Clear terminal UI to a clean state
  document.getElementById('sm-terminal-log').innerHTML = '';
  document.getElementById('sm-terminal-expansions').style.display  = 'none';
  document.getElementById('sm-terminal-expansions').innerHTML       = '';
  document.getElementById('sm-terminal-games').style.display       = 'none';
  document.getElementById('sm-terminal-games').innerHTML            = '';
  document.getElementById('sm-terminal-launch-wrap').style.display = 'none';
  const sp = document.getElementById('sm-terminal-settings');
  if (sp) sp.remove();
  showScreen('screen-secret-terminal');
  smRunBootSequence();
}

// Typewriter: reveals an array of strings line by line, then calls callback
function smTypeLines(lines, baseDelay, lineGap, callback) {
  smTypewriterTimers.forEach(clearTimeout);
  smTypewriterTimers = [];
  const log = document.getElementById('sm-terminal-log');
  lines.forEach((text, i) => {
    const t = setTimeout(() => {
      const p = document.createElement('p');
      p.textContent = text;
      if (text === '') {
        p.innerHTML = '&nbsp;';
        p.style.lineHeight = '0.5';
      }
      log.appendChild(p);
      log.scrollTop = log.scrollHeight;
    }, baseDelay + i * lineGap);
    smTypewriterTimers.push(t);
  });
  if (callback) {
    const total = baseDelay + lines.length * lineGap;
    const t = setTimeout(callback, total);
    smTypewriterTimers.push(t);
  }
}

function smRunBootSequence() {
  const lines = [
    '> BOOTING SYLLY-OS v1.0...',
    '> LOADING EXPANSION DATABASE...',
    '> AUTHENTICATION: VERIFIED',
    '',
    '> SELECT EXPANSION PACK:',
  ];
  smTypeLines(lines, 0, 220, smRenderExpansions);
}

function smRenderExpansions() {
  const wrap = document.getElementById('sm-terminal-expansions');
  wrap.innerHTML = '';
  SM_TERMINAL_CONFIG.expansions.forEach((exp, i) => {
    const btn = document.createElement('button');
    btn.className = exp.locked
      ? 'w-full text-left text-xs font-mono px-3 py-3 border border-green-900 text-green-900 rounded opacity-50 cursor-not-allowed min-h-11'
      : 'w-full text-left text-xs font-mono px-3 py-3 border border-green-400 text-green-400 rounded active:scale-95 transition-transform duration-75 min-h-11';
    btn.textContent = `  [${i + 1}] ${exp.label}${exp.locked ? ' — LOCKED' : ''}`;
    btn.disabled = exp.locked;
    if (!exp.locked) btn.addEventListener('click', () => smSelectExpansion(exp.id));
    wrap.appendChild(btn);
  });
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.gap = '8px';
}

function smSelectExpansion(expansionId) {
  playSecretBeep(660);
  smSelectedExpansion = expansionId;
  smSelectedGame      = null;
  // Clear any leftover settings panel from a previous game choice
  const prevSp = document.getElementById('sm-terminal-settings');
  if (prevSp) prevSp.remove();
  // Append selection confirmation to log
  const log = document.getElementById('sm-terminal-log');
  const exp = SM_TERMINAL_CONFIG.expansions.find(e => e.id === expansionId);
  const p = document.createElement('p');
  p.textContent = `> EXPANSION: ${exp?.label ?? expansionId.toUpperCase()} SELECTED`;
  log.appendChild(p);
  const p2 = document.createElement('p');
  p2.innerHTML = '&nbsp;';
  p2.style.lineHeight = '0.5';
  log.appendChild(p2);
  const p3 = document.createElement('p');
  p3.textContent = '  \u2514\u2500 SELECT GAME:';
  log.appendChild(p3);
  log.scrollTop = log.scrollHeight;
  // Collapse expansion list — it's chosen, now drill into game selection
  document.getElementById('sm-terminal-expansions').style.display = 'none';
  // Hide launch, reset game selection
  document.getElementById('sm-terminal-launch-wrap').style.display = 'none';
  smRenderGames();
}

function smRenderGames() {
  const wrap = document.getElementById('sm-terminal-games');
  wrap.innerHTML = '';
  SM_TERMINAL_CONFIG.games.forEach((game, i) => {
    const btn = document.createElement('button');
    btn.id = `sm-game-btn-${game.id}`;
    btn.className = 'w-full text-left text-xs font-mono px-3 py-3 border border-green-400 text-green-400 rounded active:scale-95 transition-transform duration-75 min-h-11';
    btn.textContent = `  [${i + 1}] ${game.label}`;
    btn.addEventListener('click', () => smSelectGame(game.id));
    wrap.appendChild(btn);
  });
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.gap = '8px';
  wrap.style.paddingLeft = '16px';
}

function smSelectGame(gameId) {
  playSecretBeep(660);
  smSelectedGame = gameId;
  // Visual: highlight selected, dim others
  SM_TERMINAL_CONFIG.games.forEach(g => {
    const btn = document.getElementById(`sm-game-btn-${g.id}`);
    if (!btn) return;
    if (g.id === gameId) {
      btn.className = 'w-full text-left text-xs font-mono px-3 py-3 border-2 border-green-400 bg-green-400 text-black rounded active:scale-95 transition-transform duration-75 min-h-11';
    } else {
      btn.className = 'w-full text-left text-xs font-mono px-3 py-3 border border-green-900 text-green-900 rounded opacity-40 min-h-11';
    }
  });

  // Remove previous settings panel if user is switching games
  const prevSp = document.getElementById('sm-terminal-settings');
  if (prevSp) prevSp.remove();

  // Build and inject settings summary before the launch button
  const overrides   = SM_EXPANSION_OVERRIDES[smSelectedExpansion] || {};
  const settingDefs = SM_SETTINGS_DISPLAY[gameId] || [];
  const sp = document.createElement('div');
  sp.id = 'sm-terminal-settings';
  sp.className = 'mb-3 flex-shrink-0 pl-4 text-xs font-mono leading-6';
  const hdr = document.createElement('p');
  hdr.className = 'text-green-400 mb-1';
  hdr.textContent = '  \u2514\u2500 ACTIVE SETTINGS:';
  sp.appendChild(hdr);
  settingDefs.forEach(({ key, label, fmt }) => {
    if (!(key in overrides)) return;
    const line = document.createElement('p');
    line.className = 'text-green-600';
    line.textContent = `     \u00b7 ${label}: ${fmt(overrides[key])}`;
    sp.appendChild(line);
  });
  document.getElementById('sm-terminal-launch-wrap').before(sp);

  document.getElementById('sm-terminal-launch-wrap').style.display = 'block';

  // Scroll terminal to reveal settings + launch button
  const terminal = document.getElementById('screen-secret-terminal');
  setTimeout(() => { terminal.scrollTop = terminal.scrollHeight; }, 30);
}

async function smLaunch() {
  if (!smSelectedExpansion || !smSelectedGame) return;
  const game = SM_TERMINAL_CONFIG.games.find(g => g.id === smSelectedGame);
  if (!game) return;

  // Show loading state
  const btn = document.getElementById('sm-terminal-launch');
  btn.textContent = '[ LOADING... ]';
  btn.disabled = true;

  try {
    // Load expansion word bank before navigating — solves GM Round 2 race condition
    const expansion = SM_TERMINAL_CONFIG.expansions.find(e => e.id === smSelectedExpansion);
    const res = await fetch(expansion.file);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    secretWords = await res.json();
    smBuildExpansionData(secretWords);
  } catch (e) {
    console.error('[Secret Mode] Word load failed:', e);
    btn.textContent = '[ LOAD FAILED — RETRY ]';
    btn.disabled = false;
    return;
  }

  // Push model: write overrides now; plugins read on settings-apply (SM-4/5)
  isSecretMode = true;
  activeExpansion = smSelectedExpansion;
  window.activeExpansionOverrides = SM_EXPANSION_OVERRIDES[smSelectedExpansion] || {};

  // Launch audio + navigate
  playSecretBeep(523);
  setTimeout(() => playSecretBeep(784), 120);
  setTimeout(() => {
    btn.textContent = '[ LAUNCH SEQUENCE ]';
    btn.disabled = false;
    showScreen(game.screen);
    // Inject submenu breadcrumb banner into the target game menu screen
    const screenEl = document.getElementById(game.screen);
    let banner = screenEl.querySelector('.sm-menu-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.className = 'sm-menu-banner absolute top-0 left-0 right-0 z-10 bg-black border-b border-green-800 px-3 py-2 flex items-center justify-between font-mono text-xs text-green-400 tracking-widest';
      screenEl.prepend(banner);
    }
    const expLabel = SM_TERMINAL_CONFIG.expansions.find(e => e.id === smSelectedExpansion)?.label ?? smSelectedExpansion.toUpperCase();
    banner.innerHTML = `
      <button onclick="smOpenTerminal()" class="text-green-600 active:scale-90 transition-transform duration-75 min-h-11 px-1">← TERMINAL</button>
      <span>SYLLY-OS › ${expLabel} › ${game.label}</span>
      <span class="opacity-0">← TERMINAL</span>
    `;
  }, 300);
}

// ═══════════════════════════════════════════════════════════════════════════
// ── Vocab Overlay (Secret Mode GM reference) ──────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

let smVocabActiveTab = 'ALL';

function smOpenVocabOverlay() {
  if (!window.activeExpansionData) return;
  smVocabActiveTab = 'ALL';
  document.getElementById('gm-vocab-search').value = '';
  const expLabel = SM_TERMINAL_CONFIG.expansions.find(e => e.id === activeExpansion)?.label ?? '';
  document.getElementById('gm-vocab-title').textContent = `VOCAB INDEX — ${expLabel}`;
  smRenderVocabTabs();
  smRenderVocabList();
  document.getElementById('gm-vocab-overlay').style.display = 'flex';
}

function smRenderVocabTabs() {
  const { byCategory } = window.activeExpansionData;
  const tabs = ['ALL', ...Object.keys(byCategory).sort(), 'MISC'];
  const wrap = document.getElementById('gm-vocab-tabs');
  wrap.innerHTML = '';
  tabs.forEach(tab => {
    const btn = document.createElement('button');
    btn.textContent = tab;
    btn.className = tab === smVocabActiveTab
      ? 'text-xs font-mono px-3 py-1 rounded border border-green-400 bg-green-400 text-black min-h-11 flex-shrink-0'
      : 'text-xs font-mono px-3 py-1 rounded border border-green-800 text-green-600 min-h-11 flex-shrink-0 active:scale-95 transition-transform';
    btn.addEventListener('click', () => {
      smVocabActiveTab = tab;
      document.getElementById('gm-vocab-search').value = '';
      smRenderVocabTabs();
      smRenderVocabList();
    });
    wrap.appendChild(btn);
  });
}

function smRenderVocabList() {
  const { byCategory, misc } = window.activeExpansionData;
  const search = document.getElementById('gm-vocab-search').value.toLowerCase().trim();
  let words;
  if (smVocabActiveTab === 'ALL') {
    words = [...new Set([...Object.values(byCategory).flat(), ...misc])].sort();
  } else if (smVocabActiveTab === 'MISC') {
    words = misc;
  } else {
    words = byCategory[smVocabActiveTab] || [];
  }
  if (search) words = words.filter(w => w.toLowerCase().includes(search));
  const list = document.getElementById('gm-vocab-list');
  list.innerHTML = '';
  if (!words.length) {
    const p = document.createElement('p');
    p.textContent = 'No matches.';
    p.className = 'text-green-900 mt-4';
    list.appendChild(p);
    return;
  }
  words.forEach(w => {
    const p = document.createElement('p');
    p.textContent = `\u00b7 ${w}`;
    list.appendChild(p);
  });
}

document.getElementById('gm-vocab-search').addEventListener('input', smRenderVocabList);
document.getElementById('btn-gm-vocab-close').addEventListener('click', () => {
  document.getElementById('gm-vocab-overlay').style.display = 'none';
});
document.getElementById('gm-vocab-list-btn').addEventListener('click', () => {
  playPillClick();
  smOpenVocabOverlay();
});

// ── Terminal button listeners ─────────────────────────────────────────────────
document.getElementById('sm-terminal-back').addEventListener('click', () => {
  smTypewriterTimers.forEach(clearTimeout);
  smTypewriterTimers = [];
  smSelectedExpansion = null;
  smSelectedGame      = null;
  document.getElementById('sm-controller-status').textContent = '> ENTER SEQUENCE TO CONTINUE';
  document.getElementById('sm-controller-status').style.color = '';
  showScreen('screen-secret-controller');
});

document.getElementById('sm-terminal-launch').addEventListener('click', smLaunch);

// ═══════════════════════════════════════════════════════════════════════════
// ── Controller button listeners ───────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

document.getElementById('sm-btn-up').addEventListener('click',    () => smHandleButton('U'));
document.getElementById('sm-btn-down').addEventListener('click',  () => smHandleButton('D'));
document.getElementById('sm-btn-left').addEventListener('click',  () => smHandleButton('L'));
document.getElementById('sm-btn-right').addEventListener('click', () => smHandleButton('R'));
document.getElementById('sm-btn-b').addEventListener('click',     () => smHandleButton('B'));
document.getElementById('sm-btn-a').addEventListener('click',     () => smHandleButton('A'));
document.getElementById('sm-btn-start').addEventListener('click', () => smHandleButton('S'));

document.getElementById('sm-btn-exit').addEventListener('click', () => {
  smKonamiBuffer = [];
  smUpdateProgress();
  document.getElementById('sm-controller-status').textContent = '> ENTER SEQUENCE TO CONTINUE';
  document.getElementById('sm-controller-status').style.color = '';
  showScreen('screen-lobby');
});

// ── Hidden trigger: 7 rapid taps on lobby icon ───────────────────────────────
let smLobbyTapCount = 0;
let smLobbyTapTimer = null;
document.getElementById('lobby-icon').addEventListener('click', () => {
  smLobbyTapCount++;
  clearTimeout(smLobbyTapTimer);
  smLobbyTapTimer = setTimeout(() => { smLobbyTapCount = 0; }, 1500);
  if (smLobbyTapCount >= 7) {
    smLobbyTapCount = 0;
    clearTimeout(smLobbyTapTimer);
    smKonamiBuffer = [];
    smUpdateProgress();
    document.getElementById('sm-controller-status').textContent = '> ENTER SEQUENCE TO CONTINUE';
    document.getElementById('sm-controller-status').style.color = '';
    showScreen('screen-secret-controller');
  }
});

// ── Keyboard Konami (desktop convenience) ────────────────────────────────────
const SM_KEY_MAP = {
  ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R',
  b: 'B', B: 'B', a: 'A', A: 'A', Enter: 'S'
};
document.addEventListener('keydown', e => {
  const code = SM_KEY_MAP[e.key];
  if (!code) return;
  if (document.getElementById('screen-secret-controller').style.display !== 'none') return;
  smKonamiBuffer.push(code);
  if (smKonamiBuffer.length > SM_KONAMI.length) smKonamiBuffer.shift();
  if (smKonamiBuffer.join('') === SM_KONAMI.join('')) {
    smKonamiBuffer = [];
    smUpdateProgress();
    showScreen('screen-secret-controller');
  }
});
