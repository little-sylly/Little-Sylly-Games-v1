// ═══════════════════════════════════════════════════════════════════════════════
// PLUGIN: Great Minds (great-minds)
// Mechanic: Two players find a shared connecting word for a random pair.
// No timer. Rounds loop until both players say the same word (Mind Meld).
// Score = rounds taken (lower is better, like golf).
// Depends on: engine.js (audio, showScreen, resetToLobby), li5.js (allWords, loadWords)
// ═══════════════════════════════════════════════════════════════════════════════

// ── GM Settings ───────────────────────────────────────────────────────────────
const GM_CATEGORIES = ['animals', 'food', 'places', 'objects', 'nature', 'sports', 'activities', 'emotions', 'jobs', 'actions'];

const GM_MISMATCH_PHRASES = [
  'Signal interference — frequencies misaligned. 📡',
  'Out of phase. Recalibrating… 🌀',
  'Neural link disrupted. Try again. 🧠',
  'Wavelengths crossed. Close, but no sync. ⚡',
  'Transmission garbled. Boost the signal. 📻',
];

const GM_OVERRIDE_PHRASES = [
  "Quantum entanglement detected — we'll allow it! ⚛️",
  'Unconventional frequency… but the judges confirm sync. 📡',
  'Neural link established by lateral pathways. 🧠',
  'Close enough for a quantum state — it counts! ✅',
  'Signal weak, but detectable. Neural link confirmed. 💫',
];

let gmFrequencyRange     = 'stable'; // 'stable' | 'unstable' | 'chaotic'
let gmStaticInterference = false;
let gmCustomWords        = false;
let gmInfiniteResync     = false;
let gmMemoryGuard        = false;
let gmResonanceTolerance = 'strict'; // 'strict' | 'normal'
let gmSignalBoost        = false;
let gmSyllyIntensity     = 'sub-atomic'; // 'sub-atomic' | 'supernova'
let gmPoolA              = new Set(GM_CATEGORIES);
let gmPoolB              = new Set(GM_CATEGORIES);
let gmEditingPool        = 'a';

// ── GM State ──────────────────────────────────────────────────────────────────
let gmPlayerNames    = ['Player 1', 'Player 2'];
let gmCurrentPair    = ['', ''];
let gmWordA          = '';
let gmWordB          = '';
let gmRound          = 0;
let gmActivePlayer   = 0;
let gmCountdownTimer = null;
let gmStartingPair    = [];        // original 2 words — never mutated; contains check, entire game
let gmRoundLog        = [];        // [{ round, pair, guessA, guessB, traceA, traceB, isWin }]
let gmSessionGuesses  = new Set(); // all clues typed this game (Memory Guard ON)
let gmPrevRoundWords  = new Set(); // last round's pair + both clues — always blocked
let gmBannedLetter    = '';        // current round's banned letter (Static Interference)
let gmLastBannedLetter = '';       // previous round's banned letter (to prevent repeats)
let gmPendingLockIn   = '';        // validated clue held while boost overlay is open
let gmPendingBoostA   = '';        // signal boost context from transmitter this round
let gmPendingBoostB   = '';        // signal boost context for player 2 this round (legacy, unused)

// ── GM Helpers ────────────────────────────────────────────────────────────────
// In Secret Mode Round 2+, word source switches to expansion bank
function gmGetWordPool() {
  return (isSecretMode && gmRound >= 2) ? secretWords : allWords;
}

function gmBuildPool(categorySet) {
  // Secret Mode Round 2+: expansion is pre-curated, skip category/difficulty filters
  if (isSecretMode && gmRound >= 2) return gmGetWordPool();
  // Standard: filter by category + difficulty with safety fallbacks
  const wordPool = gmGetWordPool();
  const maxDiff = { stable: 1, unstable: 2, chaotic: 3 }[gmFrequencyRange] || 1;
  const cats = categorySet.size > 0 ? [...categorySet] : [...GM_CATEGORIES];
  let pool = wordPool.filter(w => cats.includes(w.category) && w.difficulty <= maxDiff);
  if (pool.length === 0) pool = wordPool.filter(w => cats.includes(w.category) && w.difficulty === 1);
  if (pool.length === 0) pool = wordPool.filter(w => GM_CATEGORIES.includes(w.category) && w.difficulty === 1);
  return pool;
}

// Fisher-Yates shuffle — returns a new shuffled copy of the array
function gmShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// exclude: array of word strings to hard-exclude from this draw (used by reroll to prevent sticky words)
function gmPickStarterPair(exclude = []) {
  const excluded = exclude.map(w => w.toLowerCase());

  if (!gmCustomWords) {
    // Standard: full GM pool, shuffled, excluding current words
    let pool = gmBuildPool(new Set(GM_CATEGORIES))
      .filter(w => !excluded.includes(w.word.toLowerCase()));
    if (pool.length < 2) pool = gmBuildPool(new Set(GM_CATEGORIES)); // fallback if pool too small
    const shuffled = gmShuffle(pool);
    return [shuffled[0].word, shuffled[1].word];
  }

  // Custom recipe: one word from pool A, one from pool B
  let poolA = gmBuildPool(gmPoolA).filter(w => !excluded.includes(w.word.toLowerCase()));
  let poolB = gmBuildPool(gmPoolB).filter(w => !excluded.includes(w.word.toLowerCase()));
  if (poolA.length === 0) poolA = gmBuildPool(gmPoolA);
  if (poolB.length === 0) poolB = gmBuildPool(gmPoolB);
  const shuffledA = gmShuffle(poolA);
  const shuffledB = gmShuffle(poolB);
  // If pools overlap and first picks collide, take the second from pool B's shuffle
  const a = shuffledA[0];
  const b = shuffledB[0].id === a.id ? (shuffledB[1] || shuffledB[0]) : shuffledB[0];
  return [a.word, b.word];
}


function gmShowPair(wordA, wordB, targetA, targetB) {
  document.getElementById(targetA).textContent = wordA;
  document.getElementById(targetB).textContent = wordB;
}

// Returns the matched pair word if the input CONTAINS it (compound extension).
// Root words that are substrings of a pair word (e.g. "Bird" for "Birdcage") are allowed.
function gmCheapMoveWord(input) {
  return gmCurrentPair.find(w => input.includes(w.toLowerCase())) || null;
}

// Strips common plural/verb suffixes to a root form for near-sync comparison.
// Order matters: -ies before -es before -s.

// Picks a random banned letter that differs from the previous round's letter.
function gmPickBannedLetter() {
  const consonants = 'bcdfghjklmnpqrstvwxyz';
  const vowels     = 'aeiou';
  const pool = gmSyllyIntensity === 'supernova' ? vowels : consonants;
  let letter;
  do { letter = pool[Math.floor(Math.random() * pool.length)]; }
  while (letter === gmLastBannedLetter);
  gmLastBannedLetter = letter;
  gmBannedLetter = letter;
}

// ── GM Screen Transitions ─────────────────────────────────────────────────────
function startGreatMinds() {
  gmCurrentPair    = ['', ''];
  gmWordA          = '';
  gmWordB          = '';
  gmRound          = 0;
  gmActivePlayer   = 0;
  gmStartingPair     = [];
  gmRoundLog         = [];
  gmSessionGuesses   = new Set();
  gmPrevRoundWords   = new Set();
  gmBannedLetter     = '';
  gmLastBannedLetter = '';
  gmPendingLockIn    = '';
  gmPendingBoostA    = '';
  gmPendingBoostB    = '';
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
    document.getElementById('btn-gm-reroll-pair').style.display = gmInfiniteResync ? 'block' : 'none';
  });
}

// Secret Mode: apply forced overrides on first round only
function gmApplyExpansionOverrides() {
  if (!isSecretMode || !window.activeExpansionOverrides) return;
  const ov = window.activeExpansionOverrides;
  if (ov.gmFrequencyRange     !== undefined) gmFrequencyRange     = ov.gmFrequencyRange;
  if (ov.gmMemoryGuard        !== undefined) gmMemoryGuard        = ov.gmMemoryGuard;
  if (ov.gmResonanceTolerance !== undefined) gmResonanceTolerance = ov.gmResonanceTolerance;
  if (ov.gmInfiniteResync     !== undefined) gmInfiniteResync     = ov.gmInfiniteResync;
  if (ov.gmSignalBoost        !== undefined) gmSignalBoost        = ov.gmSignalBoost;
  if (ov.gmSyllyIntensity     !== undefined) gmSyllyIntensity     = ov.gmSyllyIntensity;
}

function gmStartInputPhase() {
  if (gmRound === 0) gmApplyExpansionOverrides(); // apply before first round starts
  gmActivePlayer = 0;
  gmWordA        = '';
  gmWordB        = '';
  if (gmRound === 0) gmStartingPair = [...gmCurrentPair]; // lock in before increment
  gmRound++;
  gmPendingBoostA = '';
  gmPendingBoostB = '';
  // Static Interference: pick a new banned letter for this round
  if (gmStaticInterference) gmPickBannedLetter();
  gmShowPlayerInput();
}

function gmShowPlayerInput() {
  document.getElementById('gm-round-num-input').textContent = gmRound;
  document.getElementById('gm-input-prompt').textContent = `${gmPlayerNames[gmActivePlayer]} — your turn`;
  gmShowPair(gmCurrentPair[0], gmCurrentPair[1], 'gm-input-word-a', 'gm-input-word-b');
  document.getElementById('gm-word-input').value = '';
  document.getElementById('gm-input-error').style.display = 'none';
  // Static Interference alert
  const alertEl = document.getElementById('gm-static-alert');
  alertEl.style.display = gmStaticInterference ? 'block' : 'none';
  if (gmStaticInterference) {
    document.getElementById('gm-static-letter').textContent = gmBannedLetter.toUpperCase();
  }
  gmRenderInputEchoes();
  // Boost context banner — shown to receiver if transmitter provided a boost
  const banner = document.getElementById('gm-boost-context-banner');
  const isBoostRound = gmSignalBoost && gmRound >= 5;
  const transmitter  = isBoostRound ? ((gmRound - 5) % 2 === 0 ? 0 : 1) : -1;
  if (isBoostRound && gmActivePlayer !== transmitter && gmPendingBoostA) {
    document.getElementById('gm-boost-context-text').textContent = gmPendingBoostA;
    banner.style.display = 'block';
  } else {
    banner.style.display = 'none';
  }
  document.getElementById('gm-vocab-list-btn').style.display = 'none';
  showScreen('screen-gm-input');
  document.getElementById('gm-concede-wrap').style.display =
    (isSecretMode && gmRound >= 11) ? 'flex' : 'none';
}

function gmLockIn() {
  const val = document.getElementById('gm-word-input').value.trim();
  if (!val) return;

  const input = val.toLowerCase();
  const err = document.getElementById('gm-input-error');

  // Priority 1 — Starting Pair Guard (contains check, entire game)
  const startMatch = gmStartingPair.find(w => input.includes(w.toLowerCase()));
  if (startMatch) {
    err.textContent = '⚛️ Quantum Entanglement! You can\'t use words from the starting pair.';
    err.style.display = 'block';
    playBoing();
    return;
  }

  // Priority 2 — Last Round Guard (exact match)
  if (gmPrevRoundWords.has(input)) {
    err.textContent = '⚛️ Quantum Entanglement! You can\'t use a word from last round.';
    err.style.display = 'block';
    playBoing();
    return;
  }

  // Priority 3 — Cheap Move Guard (contains check on current pair)
  const matchedWord = gmCheapMoveWord(input);
  if (matchedWord) {
    err.textContent = `⚛️ Quantum Entanglement! You can't use a word that contains "${matchedWord}".`;
    err.style.display = 'block';
    playBoing();
    return;
  }

  // Priority 4 — Vocabulary Lock (Secret Mode Round 2+: clue must be in expansion vocab)
  if (isSecretMode && gmRound >= 2 && window.activeExpansionData) {
    if (!window.activeExpansionData.vocab.has(normaliseWord(input))) {
      err.textContent = '📡 Signal Blocked — word not in expansion vocabulary.';
      err.style.display = 'block';
      document.getElementById('gm-vocab-list-btn').style.display = 'block';
      playBoing();
      return;
    }
    // Priority 5 — Too Easy block (clue in nono_list of BOTH active pair words)
    const pairObjs = secretWords.filter(w => gmCurrentPair.some(p => p.toLowerCase() === w.word.toLowerCase()));
    if (pairObjs.length === 2) {
      const inBoth = pairObjs[0].nono_list.map(n => n.toLowerCase()).includes(input)
                  && pairObjs[1].nono_list.map(n => n.toLowerCase()).includes(input);
      if (inBoth) {
        err.textContent = 'Haha, that would be too easy! Try another word.';
        err.style.display = 'block';
        playBoing();
        return;
      }
    }
  }

  // Priority 6 — Static Interference (letter ban)
  if (gmStaticInterference && gmBannedLetter && input.includes(gmBannedLetter)) {
    err.textContent = `⚡ Static Interference! Letter "${gmBannedLetter.toUpperCase()}" is banned this round.`;
    err.style.display = 'block';
    playBoing();
    return;
  }

  // Memory Guard ON — block if clue was used in any previous round
  if (gmMemoryGuard && gmSessionGuesses.has(input)) {
    err.textContent = 'Temporal Paradox! That frequency has already been transmitted. ⏳';
    err.style.display = 'block';
    playBoing();
    return;
  }

  err.style.display = 'none';

  // Signal Boost overlay — transmitter only, from round 5
  if (gmSignalBoost && gmRound >= 5) {
    const transmitter = (gmRound - 5) % 2 === 0 ? 0 : 1;
    if (gmActivePlayer === transmitter) {
      gmPendingLockIn = input;
      document.getElementById('gm-boost-input').value = '';
      document.getElementById('gm-boost-error').style.display = 'none';
      document.getElementById('gm-boost-overlay').style.display = 'flex';
      return;
    }
  }

  gmProcessLockIn(input, '');
}

function gmProcessLockIn(input, boost) {
  if (gmActivePlayer === 0) {
    gmWordA = input;
    gmPendingBoostA = boost;
    document.getElementById('gm-pass-name').textContent = gmPlayerNames[1];
    document.getElementById('gm-round-num-pass').textContent = gmRound;
    showScreen('screen-gm-pass-gate');
  } else {
    gmWordB = input;
    gmPendingBoostB = boost;
    document.getElementById('gm-ready-pass-name').textContent = gmPlayerNames[0];
    document.getElementById('gm-round-num-reveal-gate').textContent = gmRound;
    showScreen('screen-gm-reveal-gate');
  }
}

function gmStartCountdown() {
  let count = 3;
  document.getElementById('gm-countdown-number').textContent = count;
  document.getElementById('gm-round-num-countdown').textContent = gmRound;
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

// Compact table rendered on the input and result screens while players are thinking
function gmRenderInputEchoes(containerId = 'gm-input-echoes') {
  const container = document.getElementById(containerId);
  if (!container || gmRoundLog.length === 0) { if (container) container.innerHTML = ''; return; }
  const header = `<div class="grid grid-cols-[2rem_1fr_1fr_1fr] text-[10px] font-semibold uppercase tracking-widest text-stone-400 pb-1 border-b border-stone-200 mb-1">
    <span>#</span><span>Pair</span><span>${gmPlayerNames[0]}</span><span>${gmPlayerNames[1]}</span>
  </div>`;
  const rows = gmRoundLog.map(e => {
    const clueA = e.traceA ? `${e.guessA} <span class="text-stone-400">(${e.traceA})</span>` : e.guessA;
    const clueB = e.traceB ? `${e.guessB} <span class="text-stone-400">(${e.traceB})</span>` : e.guessB;
    const rowClass = e.isWin ? ' text-violet-500 font-bold' : '';
    return `<div class="grid grid-cols-[2rem_1fr_1fr_1fr] text-[11px] text-stone-600 py-1 border-b border-stone-100 last:border-0 items-start${rowClass}">
      <span class="text-stone-300 font-mono">${e.round}</span>
      <span>${e.pair[0]} · ${e.pair[1]}</span>
      <span>${clueA}</span>
      <span>${clueB}</span>
    </div>`;
  }).join('');
  container.innerHTML = header + rows;
}

// Full table rendered on the victory screen — "Psychic Echoes 📖" log
function gmRenderPsychicEchoes(containerId = 'gm-journey-log') {
  const container = document.getElementById(containerId);
  if (!container || gmRoundLog.length === 0) { if (container) container.innerHTML = ''; return; }
  const header = `<div class="grid grid-cols-[2rem_1fr_1fr_1fr] text-[10px] font-semibold uppercase tracking-widest text-stone-400 pb-1 border-b border-stone-200 mb-1">
    <span>#</span><span>Pair</span><span>${gmPlayerNames[0]}</span><span>${gmPlayerNames[1]}</span>
  </div>`;
  const rows = gmRoundLog.map(e => {
    const clueA = e.traceA ? `${e.guessA} <span class="text-stone-400 text-[10px]">(${e.traceA})</span>` : e.guessA;
    const clueB = e.traceB ? `${e.guessB} <span class="text-stone-400 text-[10px]">(${e.traceB})</span>` : e.guessB;
    const rowClass = e.isWin ? ' text-violet-500 font-bold' : '';
    return `<div class="grid grid-cols-[2rem_1fr_1fr_1fr] text-[11px] text-stone-600 py-1.5 border-b border-stone-100 last:border-0 items-start${rowClass}">
      <span class="text-stone-300 font-mono">${e.round}</span>
      <span>${e.pair[0]} · ${e.pair[1]}</span>
      <span>${clueA}</span>
      <span>${clueB}</span>
    </div>`;
  }).join('');
  container.innerHTML = header + rows;
}

// Shared mismatch handler — called from gmShowResult and from near-sync Reject
function gmHandleMismatch() {
  document.getElementById('gm-result-heading').textContent =
    GM_MISMATCH_PHRASES[Math.floor(Math.random() * GM_MISMATCH_PHRASES.length)];
  gmRoundLog.push({
    round:  gmRound,
    pair:   [...gmCurrentPair],
    guessA: gmWordA,
    guessB: gmWordB,
    traceA: gmPendingBoostA,
    traceB: gmPendingBoostB,
  });
  gmPendingBoostA = ''; gmPendingBoostB = '';
  // Record both clues in session history after round resolves (Memory Guard)
  if (gmMemoryGuard) {
    gmSessionGuesses.add(gmWordA.toLowerCase());
    gmSessionGuesses.add(gmWordB.toLowerCase());
  }
  // Baseline: block all words from this round in the next round
  gmPrevRoundWords = new Set([
    ...gmCurrentPair.map(w => w.toLowerCase()),
    gmWordA.toLowerCase(),
    gmWordB.toLowerCase(),
  ]);
  document.getElementById('gm-result-nomatch').style.display = 'flex';
  document.getElementById('gm-result-match').style.display   = 'none';
  document.getElementById('gm-result-name-a').textContent    = gmPlayerNames[0];
  document.getElementById('gm-result-name-b').textContent    = gmPlayerNames[1];
  document.getElementById('gm-result-word-a').textContent    = gmWordA;
  document.getElementById('gm-result-word-b').textContent    = gmWordB;
  document.getElementById('gm-result-round-num').textContent = gmRound;
  document.getElementById('gm-result-pair-hint').textContent = 'New signal acquired ↑';
  gmCurrentPair = [gmWordA, gmWordB];
  document.getElementById('btn-gm-reroll-result').style.display = 'none';
  gmRenderInputEchoes('gm-result-echoes');
}

function gmShowResult() {
  const isMatch = gmWordA === gmWordB;

  if (isMatch) {
    playSuccess();
    gmHandleMatch();
    gmRenderVictory();
    showScreen('screen-gm-result');
    return;
  }

  // Near-sync check: roots match but words aren't identical
  if (gmResonanceTolerance === 'normal' &&
      normaliseWord(gmWordA) === normaliseWord(gmWordB)) {
    document.getElementById('gm-near-sync-word-a').textContent = gmWordA;
    document.getElementById('gm-near-sync-word-b').textContent = gmWordB;
    document.getElementById('gm-near-sync-overlay').style.display = 'flex';
    playSuccess();
    return; // wait for Accept or Reject
  }

  playBoing();
  gmHandleMismatch();
  showScreen('screen-gm-result');
}

function gmHandleMatch() {
  // Guard against double-log (near-sync override may call after gmShowResult already logged)
  if (gmRoundLog.length > 0 && gmRoundLog[gmRoundLog.length - 1].isWin) return;
  gmRoundLog.push({
    round:  gmRound,
    pair:   [...gmCurrentPair],
    guessA: gmWordA,
    guessB: gmWordB,
    traceA: gmPendingBoostA,
    traceB: gmPendingBoostB,
    isWin:  true,
  });
  gmPendingBoostA = ''; gmPendingBoostB = '';
  // Record both clues in session history after round resolves (Memory Guard)
  if (gmMemoryGuard) {
    gmSessionGuesses.add(gmWordA.toLowerCase());
    gmSessionGuesses.add(gmWordB.toLowerCase());
  }
}

function gmRenderVictory() {
  document.getElementById('gm-result-nomatch').style.display = 'none';
  document.getElementById('gm-result-match').style.display   = 'flex';
  document.getElementById('gm-match-subtext').textContent    = 'You both thought of…';
  document.getElementById('gm-match-word').textContent       = gmWordA;
  document.getElementById('gm-victory-rounds').textContent   = gmRound;
  gmRenderPsychicEchoes('gm-journey-log');
}

function gmTriggerVictory() {
  // Social override path — log winning round then show both words + random cheeky subtext
  gmHandleMatch();
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

// Clear validation error the moment the input is emptied
document.getElementById('gm-word-input').addEventListener('input', () => {
  if (!document.getElementById('gm-word-input').value) {
    document.getElementById('gm-input-error').style.display = 'none';
  }
});

// Reroll pair on setup screen — exclude the current words to prevent sticky repeats
document.getElementById('btn-gm-reroll-pair').addEventListener('click', () => {
  playPillClick();
  gmCurrentPair = gmPickStarterPair(gmCurrentPair);
  document.getElementById('gm-pair-word-a').textContent = gmCurrentPair[0];
  document.getElementById('gm-pair-word-b').textContent = gmCurrentPair[1];
});

// Reroll pair on result screen (before next round) — exclude current pair
document.getElementById('btn-gm-reroll-result').addEventListener('click', () => {
  playPillClick();
  gmCurrentPair = gmPickStarterPair(gmCurrentPair);
  document.getElementById('gm-result-word-a').textContent    = gmCurrentPair[0];
  document.getElementById('gm-result-word-b').textContent    = gmCurrentPair[1];
  document.getElementById('gm-result-pair-hint').textContent = 'New frequency locked in ↑';
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

document.getElementById('btn-gm-new-frequency').addEventListener('click', () => {
  playPillClick();
  document.getElementById('gm-new-frequency-overlay').style.display = 'flex';
});

document.getElementById('btn-gm-new-game-confirm').addEventListener('click', () => {
  document.getElementById('gm-new-frequency-overlay').style.display = 'none';
  playLaunch();
  showScreen('screen-gm-menu');
});

document.getElementById('btn-gm-new-game-cancel').addEventListener('click', () => {
  document.getElementById('gm-new-frequency-overlay').style.display = 'none';
  playPillClick();
});

// Signal Boost overlay confirm
document.getElementById('btn-gm-boost-confirm').addEventListener('click', () => {
  const boost = (document.getElementById('gm-boost-input').value || '').trim().slice(0, 15);
  if (boost.length >= 3 && gmPendingLockIn.length >= 3) {
    const normBoost = normaliseWord(boost);
    const normClue  = normaliseWord(gmPendingLockIn);
    if (normBoost.includes(normClue) || normClue.includes(normBoost)) {
      document.getElementById('gm-boost-error').style.display = 'block';
      return;
    }
  }
  document.getElementById('gm-boost-error').style.display = 'none';
  document.getElementById('gm-boost-overlay').style.display = 'none';
  playPillClick();
  gmProcessLockIn(gmPendingLockIn, boost);
  gmPendingLockIn = '';
});

document.getElementById('btn-gm-raw-signal').addEventListener('click', () => {
  document.getElementById('gm-boost-error').style.display = 'none';
  document.getElementById('gm-boost-overlay').style.display = 'none';
  playPillClick();
  gmProcessLockIn(gmPendingLockIn, '');
  gmPendingLockIn = '';
});

document.getElementById('btn-gm-boost-help').addEventListener('click', () => {
  document.getElementById('gm-neural-library-overlay').style.display = 'flex';
});
document.getElementById('btn-gm-boost-help-settings').addEventListener('click', () => {
  document.getElementById('gm-neural-library-overlay').style.display = 'flex';
});
document.getElementById('btn-gm-neural-library-close').addEventListener('click', () => {
  document.getElementById('gm-neural-library-overlay').style.display = 'none';
});

document.getElementById('gm-boost-input').addEventListener('input', () => {
  document.getElementById('gm-boost-error').style.display = 'none';
});

// ── Concede (Secret Mode) ─────────────────────────────────────────────────────
function gmNavigateToConcede() {
  document.getElementById('gm-concede-word-a').textContent = gmCurrentPair[0] ?? '';
  document.getElementById('gm-concede-word-b').textContent = gmCurrentPair[1] ?? '';
  document.getElementById('gm-concede-rounds').textContent = gmRound;
  gmRenderPsychicEchoes('gm-concede-log');
  showScreen('screen-gm-concede');
}

document.getElementById('btn-gm-sever-link').addEventListener('click', () => {
  playPillClick();
  document.getElementById('gm-concede-overlay').style.display = 'flex';
});

document.getElementById('btn-gm-concede-cancel').addEventListener('click', () => {
  playDone();
  document.getElementById('gm-concede-overlay').style.display = 'none';
});

document.getElementById('btn-gm-concede-confirm').addEventListener('click', () => {
  playExit();
  document.getElementById('gm-concede-overlay').style.display = 'none';
  gmNavigateToConcede();
});

document.getElementById('btn-gm-concede-new-frequency').addEventListener('click', () => {
  playLaunch();
  document.getElementById('gm-new-frequency-overlay').style.display = 'flex';
});

document.getElementById('btn-gm-concede-back').addEventListener('click', () => {
  playExit();
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

// Infinite Resync toggle
document.getElementById('btn-gm-resync-toggle').addEventListener('click', () => {
  playPillClick();
  gmInfiniteResync = !gmInfiniteResync;
  const btn = document.getElementById('btn-gm-resync-toggle');
  btn.textContent = gmInfiniteResync ? 'ON' : 'OFF';
  btn.className   = gmInfiniteResync ? 'sylly-toggle-on' : 'sylly-toggle-off';
});

// Adjust Frequency Range pills
document.getElementById('gm-frequency-pills').addEventListener('click', e => {
  const btn = e.target.closest('[data-gm-frequency]');
  if (!btn) return;
  playPillClick();
  gmFrequencyRange = btn.dataset.gmFrequency;
  document.querySelectorAll('#gm-frequency-pills [data-gm-frequency]').forEach(b =>
    b.classList.toggle('pill-active-purple', b === btn));
  const descs = {
    stable:   'Standard words only.',
    unstable: 'Standard and tricky words.',
    chaotic:  'Full range including abstract concepts.',
  };
  document.getElementById('gm-frequency-desc').textContent = descs[gmFrequencyRange];
});

// Sylly Mode toggle (Static Interference)
document.getElementById('btn-gm-static-toggle').addEventListener('click', () => {
  gmStaticInterference ? playSyllyOff() : playSyllyOn();
  gmStaticInterference = !gmStaticInterference;
  const btn = document.getElementById('btn-gm-static-toggle');
  btn.textContent = gmStaticInterference ? 'ON' : 'OFF';
  btn.className   = gmStaticInterference ? 'sylly-toggle-on' : 'sylly-toggle-off';
  document.getElementById('gm-sylly-mode-detail').style.display = gmStaticInterference ? 'block' : 'none';
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
  gmCurrentPair    = ['', ''];
  gmWordA          = '';
  gmWordB          = '';
  gmRound          = 0;
  gmActivePlayer   = 0;
  gmStartingPair     = [];
  gmRoundLog         = [];
  gmSessionGuesses   = new Set();
  gmPrevRoundWords   = new Set();
  gmBannedLetter     = '';
  gmLastBannedLetter = '';
  gmPendingLockIn    = '';
  gmPendingBoostA    = '';
  gmPendingBoostB    = '';
  if (gmCountdownTimer) { clearInterval(gmCountdownTimer); gmCountdownTimer = null; }
  showScreen('screen-gm-menu');
});

document.getElementById('btn-gm-quit-cancel').addEventListener('click', () => {
  playPillClick();
  document.getElementById('gm-quit-overlay').style.display = 'none';
});

// ── Near-Sync overlay ────────────────────────────────────────────────────────
document.getElementById('btn-gm-near-sync-accept').addEventListener('click', () => {
  document.getElementById('gm-near-sync-overlay').style.display = 'none';
  gmTriggerVictory();
  showScreen('screen-gm-result');
});

document.getElementById('btn-gm-near-sync-reject').addEventListener('click', () => {
  document.getElementById('gm-near-sync-overlay').style.display = 'none';
  playBoing();
  gmHandleMismatch();
  showScreen('screen-gm-result');
});

// ── New settings listeners ────────────────────────────────────────────────────

// Memory Guard toggle
document.getElementById('btn-gm-memory-guard-toggle').addEventListener('click', () => {
  gmMemoryGuard ? playSyllyOff() : playSyllyOn();
  gmMemoryGuard = !gmMemoryGuard;
  const btn = document.getElementById('btn-gm-memory-guard-toggle');
  btn.textContent = gmMemoryGuard ? 'ON' : 'OFF';
  btn.className   = gmMemoryGuard ? 'sylly-toggle-on' : 'sylly-toggle-off';
  document.getElementById('gm-memory-guard-desc').textContent = gmMemoryGuard
    ? 'All clues from every round are permanently banned for this game.'
    : "Previous round's words are always blocked. No further restrictions.";
});

// Resonance Tolerance pills
document.getElementById('gm-resonance-pills').addEventListener('click', e => {
  const btn = e.target.closest('[data-gm-resonance]');
  if (!btn) return;
  playPillClick();
  gmResonanceTolerance = btn.dataset.gmResonance;
  document.querySelectorAll('#gm-resonance-pills [data-gm-resonance]').forEach(b =>
    b.classList.toggle('pill-active-purple', b === btn));
  const descs = {
    strict: 'Exact match only. No partial credit.',
    normal: 'Plural and singular variants trigger a Near-Sync alert for player review.',
  };
  document.getElementById('gm-resonance-desc').textContent = descs[gmResonanceTolerance];
});

// Signal Boost toggle
document.getElementById('btn-gm-signal-boost-toggle').addEventListener('click', () => {
  playPillClick();
  gmSignalBoost = !gmSignalBoost;
  const btn = document.getElementById('btn-gm-signal-boost-toggle');
  btn.textContent = gmSignalBoost ? 'ON' : 'OFF';
  btn.className   = gmSignalBoost ? 'sylly-toggle-on' : 'sylly-toggle-off';
});

// Sylly Intensity pills
document.getElementById('gm-sylly-intensity-pills').addEventListener('click', e => {
  const btn = e.target.closest('[data-gm-intensity]');
  if (!btn) return;
  playPillClick();
  gmSyllyIntensity = btn.dataset.gmIntensity;
  document.querySelectorAll('#gm-sylly-intensity-pills [data-gm-intensity]').forEach(b =>
    b.classList.toggle('pill-active-purple', b === btn));
  const intensityDescs = {
    'sub-atomic': 'Each round, a random consonant is banned for both players.',
    'supernova':  'Each round, a random vowel is banned. Prepare for chaos.',
  };
  document.getElementById('gm-sylly-intensity-desc').textContent = intensityDescs[gmSyllyIntensity];
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
