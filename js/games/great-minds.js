// ═══════════════════════════════════════════════════════════════════════════════
// PLUGIN: Great Minds (great-minds)
// Mechanic: Two players find a shared connecting word for a random pair.
// No timer. Rounds loop until both players say the same word (Mind Meld).
// Score = rounds taken (lower is better, like golf).
// Depends on: engine.js (audio, showScreen, resetToLobby), dstw.js (allWords, loadWords)
// ═══════════════════════════════════════════════════════════════════════════════

// ── GM Settings ───────────────────────────────────────────────────────────────
const GM_CATEGORIES = ['animals', 'food', 'places', 'objects', 'nature', 'sports', 'activities', 'emotions', 'jobs', 'actions'];

const GM_MISMATCH_PHRASES = [
  'Yeah, nah. Not even close! 😅',
  'Two different planets, those thoughts. 🪐',
  "Tell him he's dreaming! ☁️",
  'A bit of a stretch, that one! 🐈‍⬛',
  'Not even in the same zip code. 🗺️',
];

const GM_OVERRIDE_PHRASES = [
  "Fair dinkum? We're counting it! 🤝",
  'The judges allow it! 👩‍⚖️',
  "A bit of a reach, but we'll take it! 🤏",
  'Pure genius... or pure cheating? 🧠',
  'Close enough for government work! ✅',
];

let gmSettingDifficulty = 1;
let gmSyllyMode         = false;
let gmCustomWords       = false;
let gmPoolA             = new Set(GM_CATEGORIES);
let gmPoolB             = new Set(GM_CATEGORIES);
let gmEditingPool       = 'a';

// ── GM State ──────────────────────────────────────────────────────────────────
let gmPlayerNames    = ['Player 1', 'Player 2'];
let gmCurrentPair    = ['', ''];
let gmWordA          = '';
let gmWordB          = '';
let gmRound          = 0;
let gmActivePlayer   = 0;
let gmCountdownTimer = null;
let gmRoundLog       = [];  // [{ round, pair, guessA, guessB }] — one entry per mismatch

// ── GM Helpers ────────────────────────────────────────────────────────────────
function gmBuildPool(categorySet) {
  // Build a word pool from a Set of categories, with difficulty + safety fallbacks
  const diff = gmSettingDifficulty;
  const cats = categorySet.size > 0 ? [...categorySet] : [...GM_CATEGORIES];
  let pool = allWords.filter(w => cats.includes(w.category) && w.difficulty === diff);
  if (pool.length === 0) pool = allWords.filter(w => cats.includes(w.category) && w.difficulty === 1);
  if (pool.length === 0) pool = allWords.filter(w => GM_CATEGORIES.includes(w.category) && w.difficulty === 1);
  return pool;
}

function gmPickStarterPair() {
  if (!gmCustomWords) {
    // Standard: full GM pool
    const pool = gmBuildPool(new Set(GM_CATEGORIES));
    const a = pool[Math.floor(Math.random() * pool.length)];
    let b;
    do { b = pool[Math.floor(Math.random() * pool.length)]; } while (b.id === a.id);
    return [a.word, b.word];
  }

  // Custom recipe: one word from pool A, one from pool B
  const poolA = gmBuildPool(gmPoolA);
  const poolB = gmBuildPool(gmPoolB);
  const a = poolA[Math.floor(Math.random() * poolA.length)];
  let b = poolB[Math.floor(Math.random() * poolB.length)];
  // Guard: if pools overlap and same word drawn, retry up to 10x
  let attempts = 0;
  while (b.id === a.id && attempts < 10) {
    b = poolB[Math.floor(Math.random() * poolB.length)];
    attempts++;
  }
  return [a.word, b.word];
}


function gmShowPair(wordA, wordB, targetA, targetB) {
  document.getElementById(targetA).textContent = wordA;
  document.getElementById(targetB).textContent = wordB;
}

// Returns true if the input is a partial match against either pair word (cheap move).
function gmIsCheapMove(input) {
  return gmCurrentPair.some(w => {
    const word = w.toLowerCase();
    return input.includes(word) || word.includes(input);
  });
}

// ── GM Screen Transitions ─────────────────────────────────────────────────────
function startGreatMinds() {
  gmCurrentPair  = ['', ''];
  gmWordA        = '';
  gmWordB        = '';
  gmRound        = 0;
  gmActivePlayer = 0;
  gmRoundLog     = [];
  document.getElementById('gm-setup-names').style.display = 'flex';
  document.getElementById('gm-setup-pair').style.display  = 'none';
  // Pre-populate with last known names; blank if still default
  document.getElementById('gm-input-player1').value = gmPlayerNames[0] === 'Player 1' ? '' : gmPlayerNames[0];
  document.getElementById('gm-input-player2').value = gmPlayerNames[1] === 'Player 2' ? '' : gmPlayerNames[1];
  showScreen('screen-gm-setup');
}

function gmShowPairReveal() {
  loadWords().then(() => {
    gmCurrentPair = gmPickStarterPair();
    document.getElementById('gm-pair-word-a').textContent = gmCurrentPair[0];
    document.getElementById('gm-pair-word-b').textContent = gmCurrentPair[1];
    document.getElementById('gm-setup-names').style.display = 'none';
    document.getElementById('gm-setup-pair').style.display  = 'flex';
  });
}

function gmStartInputPhase() {
  gmActivePlayer = 0;
  gmWordA = '';
  gmWordB = '';
  gmRound++;
  gmShowPlayerInput();
}

function gmShowPlayerInput() {
  document.getElementById('gm-input-prompt').textContent = `${gmPlayerNames[gmActivePlayer]} — your turn`;
  gmShowPair(gmCurrentPair[0], gmCurrentPair[1], 'gm-input-word-a', 'gm-input-word-b');
  document.getElementById('gm-word-input').value = '';
  document.getElementById('gm-input-error').style.display = 'none';
  showScreen('screen-gm-input');
}

function gmLockIn() {
  const val = document.getElementById('gm-word-input').value.trim();
  if (!val) return;

  const input = val.toLowerCase();

  // Cheap move guard — block partial matches against either pair word
  if (gmIsCheapMove(input)) {
    const err = document.getElementById('gm-input-error');
    err.style.display = 'block';
    playBoing();
    return;
  }

  document.getElementById('gm-input-error').style.display = 'none';

  if (gmActivePlayer === 0) {
    gmWordA = input;
    document.getElementById('gm-pass-name').textContent = gmPlayerNames[1];
    showScreen('screen-gm-pass-gate');
  } else {
    gmWordB = input;
    // Show the shared ready gate so both players watch the countdown together
    document.getElementById('gm-ready-pass-name').textContent = gmPlayerNames[0];
    showScreen('screen-gm-reveal-gate');
  }
}

function gmStartCountdown() {
  let count = 3;
  document.getElementById('gm-countdown-number').textContent = count;
  showScreen('screen-gm-reveal');
  playTick();
  gmCountdownTimer = setInterval(() => {
    count--;
    if (count > 0) {
      document.getElementById('gm-countdown-number').textContent = count;
      playTick();
    } else {
      clearInterval(gmCountdownTimer);
      gmCountdownTimer = null;
      gmShowResult();
    }
  }, 1000);
}

function gmShowResult() {
  const isMatch = gmWordA === gmWordB;

  if (isMatch) {
    playSuccess();
    gmRenderVictory();
  } else {
    playBoing();
    document.getElementById('gm-result-heading').textContent =
      GM_MISMATCH_PHRASES[Math.floor(Math.random() * GM_MISMATCH_PHRASES.length)];
    // Log this mismatch round
    gmRoundLog.push({
      round:  gmRound,
      pair:   [...gmCurrentPair],
      guessA: gmWordA,
      guessB: gmWordB,
    });
    document.getElementById('gm-result-nomatch').style.display = 'flex';
    document.getElementById('gm-result-match').style.display   = 'none';
    document.getElementById('gm-result-name-a').textContent    = gmPlayerNames[0];
    document.getElementById('gm-result-name-b').textContent    = gmPlayerNames[1];
    document.getElementById('gm-result-word-a').textContent    = gmWordA;
    document.getElementById('gm-result-word-b').textContent    = gmWordB;
    document.getElementById('gm-result-round-num').textContent = gmRound;
    document.getElementById('gm-result-pair-hint').textContent = 'These are your new starting words ↑';
    gmCurrentPair = [gmWordA, gmWordB];
  }

  showScreen('screen-gm-result');
}

function gmRenderVictory() {
  document.getElementById('gm-result-nomatch').style.display = 'none';
  document.getElementById('gm-result-match').style.display   = 'flex';
  document.getElementById('gm-match-subtext').textContent    = 'You both said…';
  document.getElementById('gm-match-word').textContent       = gmWordA;
  document.getElementById('gm-victory-rounds').textContent   = gmRound;

  // Render journey log
  const log = document.getElementById('gm-journey-log');
  if (gmRoundLog.length === 0) {
    log.innerHTML = '';
    return;
  }
  log.innerHTML = gmRoundLog.map(e =>
    `<div class="bg-white rounded-xl px-4 py-3 shadow-sm text-sm">
      <p class="text-stone-400 text-xs uppercase tracking-widest mb-1.5">Round ${e.round}</p>
      <div class="flex items-center justify-center gap-2 font-semibold text-stone-700">
        <span>${e.pair[0]}</span>
        <span class="text-stone-300">↔</span>
        <span>${e.pair[1]}</span>
      </div>
      <p class="text-stone-400 text-xs mt-1.5">
        ${gmPlayerNames[0]}: <span class="text-stone-600 font-medium">${e.guessA}</span>
        &nbsp;·&nbsp;
        ${gmPlayerNames[1]}: <span class="text-stone-600 font-medium">${e.guessB}</span>
      </p>
    </div>`
  ).join('');
}

function gmTriggerVictory() {
  // Social override path — show both words + random cheeky subtext
  gmRenderVictory();
  document.getElementById('gm-match-word').textContent    = `${gmWordA} / ${gmWordB}`;
  document.getElementById('gm-match-subtext').textContent =
    GM_OVERRIDE_PHRASES[Math.floor(Math.random() * GM_OVERRIDE_PHRASES.length)];
}

// ── GM Event Listeners ────────────────────────────────────────────────────────
document.getElementById('btn-great-minds')
  .addEventListener('click', () => { activeGameId = 'great-minds'; playLaunch(); showScreen('screen-gm-menu'); });

document.getElementById('btn-gm-names-done').addEventListener('click', () => {
  const p1 = document.getElementById('gm-input-player1').value.trim() || 'Player 1';
  const p2 = document.getElementById('gm-input-player2').value.trim() || 'Player 2';
  gmPlayerNames = [p1, p2];
  playPillClick();
  gmShowPairReveal();
});

document.getElementById('btn-gm-start-round').addEventListener('click', () => {
  playLaunch();
  gmStartInputPhase();
});

document.getElementById('btn-gm-lock-in').addEventListener('click', () => {
  playPillClick();
  gmLockIn();
});

document.getElementById('btn-gm-ready').addEventListener('click', () => {
  // Pass gate → Player 2 input
  playPillClick();
  gmActivePlayer = 1;
  gmShowPlayerInput();
});

document.getElementById('btn-gm-countdown-ready').addEventListener('click', () => {
  // Reveal gate → countdown (both players watching)
  playLaunch();
  gmStartCountdown();
});

document.getElementById('btn-gm-next-round').addEventListener('click', () => {
  playLaunch();
  gmStartInputPhase();
});

document.getElementById('btn-gm-victory-lobby').addEventListener('click', () => {
  playLaunch();
  showScreen('screen-gm-menu');
});

// ── GM Menu listeners ─────────────────────────────────────────────────────────
document.getElementById('btn-gm-menu-play').addEventListener('click', () => {
  playLaunch();
  startGreatMinds();
});

document.getElementById('btn-gm-menu-how-to').addEventListener('click', () => {
  playPillClick();
  document.getElementById('gm-how-to-overlay').style.display = 'flex';
});

document.getElementById('btn-gm-how-to-close').addEventListener('click', () => {
  playDone();
  document.getElementById('gm-how-to-overlay').style.display = 'none';
});

document.getElementById('btn-gm-menu-settings').addEventListener('click', () => {
  playPillClick();
  document.getElementById('gm-settings-overlay').style.display = 'flex';
});

document.getElementById('btn-gm-menu-back').addEventListener('click', () => {
  playExit();
  resetToLobby();
});

// ── GM Settings listeners ─────────────────────────────────────────────────────
document.getElementById('btn-gm-settings-done').addEventListener('click', () => {
  playDone();
  document.getElementById('gm-settings-overlay').style.display = 'none';
});

// Sylly Mode toggle — OFF = diff 1, ON = reveal Wild/Wilder (default Wild)
document.getElementById('btn-gm-sylly-toggle').addEventListener('click', () => {
  playPillClick();
  gmSyllyMode = !gmSyllyMode;
  const btn = document.getElementById('btn-gm-sylly-toggle');
  btn.textContent = gmSyllyMode ? 'ON' : 'OFF';
  btn.className   = gmSyllyMode ? 'sylly-toggle-on' : 'sylly-toggle-off';
  document.getElementById('gm-sylly-intensity').style.display = gmSyllyMode ? 'flex' : 'none';
  if (!gmSyllyMode) {
    gmSettingDifficulty = 1;
  } else {
    // Auto-select Wild (diff 2) on first enable
    gmSettingDifficulty = 2;
    document.querySelectorAll('#gm-sylly-intensity [data-gm-intensity]').forEach(b => {
      b.classList.toggle('pill-active-purple', b.dataset.gmIntensity === '2');
    });
  }
});

// Intensity pills (Wild / Wilder) — only visible when Sylly Mode ON
document.getElementById('gm-sylly-intensity').addEventListener('click', e => {
  const btn = e.target.closest('[data-gm-intensity]');
  if (!btn) return;
  playPillClick();
  gmSettingDifficulty = parseInt(btn.dataset.gmIntensity);
  document.querySelectorAll('#gm-sylly-intensity [data-gm-intensity]').forEach(b => {
    b.classList.toggle('pill-active-purple', b === btn);
  });
});

// Customise Words toggle
document.getElementById('btn-gm-custom-toggle').addEventListener('click', () => {
  playPillClick();
  gmCustomWords = !gmCustomWords;
  const btn = document.getElementById('btn-gm-custom-toggle');
  btn.textContent = gmCustomWords ? 'ON' : 'OFF';
  btn.className   = gmCustomWords ? 'sylly-toggle-on' : 'sylly-toggle-off';
  document.getElementById('gm-custom-pickers').style.display = gmCustomWords ? 'flex' : 'none';
});

// Pool selector buttons — open the deck panel for pool A or B
function gmUpdatePoolLabel(pool) {
  const set    = pool === 'a' ? gmPoolA : gmPoolB;
  const btn    = document.getElementById(pool === 'a' ? 'btn-gm-set-pool-a' : 'btn-gm-set-pool-b');
  const label  = pool === 'a' ? 'Word 1' : 'Word 2';
  const suffix = set.size === GM_CATEGORIES.length ? 'all' : `${set.size} selected`;
  btn.textContent = `${label} Decks — ${suffix} 📂`;
}

function gmOpenDeckPanel(pool) {
  gmEditingPool = pool;
  const currentPool = pool === 'a' ? gmPoolA : gmPoolB;
  document.getElementById('gm-deck-panel-title').textContent = pool === 'a' ? 'Word 1 Decks' : 'Word 2 Decks';
  document.querySelectorAll('#gm-deck-grid [data-gm-deck]').forEach(btn => {
    btn.classList.toggle('gm-deck-card-active', currentPool.has(btn.dataset.gmDeck));
  });
  const allSelected = currentPool.size === GM_CATEGORIES.length;
  document.getElementById('btn-gm-deck-toggle-all').textContent = allSelected ? 'Deselect All' : 'Select All';
  document.getElementById('gm-deck-panel').style.display = 'flex';
}

document.getElementById('btn-gm-set-pool-a').addEventListener('click', () => {
  playPillClick();
  gmOpenDeckPanel('a');
});

document.getElementById('btn-gm-set-pool-b').addEventListener('click', () => {
  playPillClick();
  gmOpenDeckPanel('b');
});

// Deck grid — toggle individual categories
document.getElementById('gm-deck-grid').addEventListener('click', e => {
  const btn = e.target.closest('[data-gm-deck]');
  if (!btn) return;
  playPillClick();
  const cat         = btn.dataset.gmDeck;
  const currentPool = gmEditingPool === 'a' ? gmPoolA : gmPoolB;
  if (currentPool.has(cat)) {
    currentPool.delete(cat);
    btn.classList.remove('gm-deck-card-active');
  } else {
    currentPool.add(cat);
    btn.classList.add('gm-deck-card-active');
  }
  const allSelected = currentPool.size === GM_CATEGORIES.length;
  document.getElementById('btn-gm-deck-toggle-all').textContent = allSelected ? 'Deselect All' : 'Select All';
});

// Toggle All / Deselect All
document.getElementById('btn-gm-deck-toggle-all').addEventListener('click', () => {
  playPillClick();
  const currentPool = gmEditingPool === 'a' ? gmPoolA : gmPoolB;
  const allSelected = currentPool.size === GM_CATEGORIES.length;
  if (allSelected) {
    currentPool.clear();
    document.querySelectorAll('#gm-deck-grid [data-gm-deck]').forEach(b => b.classList.remove('gm-deck-card-active'));
    document.getElementById('btn-gm-deck-toggle-all').textContent = 'Select All';
  } else {
    GM_CATEGORIES.forEach(c => currentPool.add(c));
    document.querySelectorAll('#gm-deck-grid [data-gm-deck]').forEach(b => b.classList.add('gm-deck-card-active'));
    document.getElementById('btn-gm-deck-toggle-all').textContent = 'Deselect All';
  }
});

// Done — safety valve: if pool empty, restore all categories silently
document.getElementById('btn-gm-deck-done').addEventListener('click', () => {
  const currentPool = gmEditingPool === 'a' ? gmPoolA : gmPoolB;
  if (currentPool.size === 0) {
    GM_CATEGORIES.forEach(c => currentPool.add(c));
    document.querySelectorAll('#gm-deck-grid [data-gm-deck]').forEach(b => b.classList.add('gm-deck-card-active'));
  }
  playDone();
  gmUpdatePoolLabel(gmEditingPool);
  document.getElementById('gm-deck-panel').style.display = 'none';
});

// ── Emergency Exit (quit mid-game) ───────────────────────────────────────────
function gmShowQuitOverlay() {
  playPillClick();
  document.getElementById('gm-quit-overlay').style.display = 'flex';
}

document.getElementById('btn-gm-setup-exit').addEventListener('click', gmShowQuitOverlay);
document.getElementById('btn-gm-input-exit').addEventListener('click', gmShowQuitOverlay);
document.getElementById('btn-gm-result-exit').addEventListener('click', gmShowQuitOverlay);
document.getElementById('btn-gm-pass-exit').addEventListener('click', gmShowQuitOverlay);
document.getElementById('btn-gm-reveal-gate-exit').addEventListener('click', gmShowQuitOverlay);
document.getElementById('btn-gm-reveal-exit').addEventListener('click', gmShowQuitOverlay);

document.getElementById('btn-gm-quit-confirm').addEventListener('click', () => {
  document.getElementById('gm-quit-overlay').style.display = 'none';
  playExit();
  // Reset in-game state, keep player names and settings
  gmCurrentPair  = ['', ''];
  gmWordA        = '';
  gmWordB        = '';
  gmRound        = 0;
  gmActivePlayer = 0;
  gmRoundLog     = [];
  if (gmCountdownTimer) { clearInterval(gmCountdownTimer); gmCountdownTimer = null; }
  showScreen('screen-gm-menu');
});

document.getElementById('btn-gm-quit-cancel').addEventListener('click', () => {
  playPillClick();
  document.getElementById('gm-quit-overlay').style.display = 'none';
});

// ── Social Override ───────────────────────────────────────────────────────────
document.getElementById('btn-gm-override').addEventListener('click', () => {
  playPillClick();
  document.getElementById('gm-override-overlay').style.display = 'flex';
});

document.getElementById('btn-gm-override-confirm').addEventListener('click', () => {
  document.getElementById('gm-override-overlay').style.display = 'none';
  playSuccess();
  gmTriggerVictory();
  showScreen('screen-gm-result');
});

document.getElementById('btn-gm-override-cancel').addEventListener('click', () => {
  playPillClick();
  document.getElementById('gm-override-overlay').style.display = 'none';
});
