// ═══════════════════════════════════════════════════════════════════════════════
// PLUGIN: Don't Say Those Words (dstw)
// Depends on: engine.js (audio, showScreen, shuffle, formatTime, resetToLobby/Menu)
// ═══════════════════════════════════════════════════════════════════════════════

// ── Session settings (JS memory only — resets on page refresh) ───────────────
let settingTimer      = 60;
let settingRounds     = 5;
let settingSylly      = false;
let settingSyllyPct   = 30;
let settingCategories = new Set([
  'animals', 'food', 'places', 'objects', 'sports',
  'nature', 'vehicles', 'jobs', 'activities', 'aussie_slang',
  'pop_culture', 'people', 'brands', 'emotions', 'actions', 'music',
]);

const CATEGORY_EMOJI = {
  animals:      '🐾',
  food:         '🍕',
  places:       '📍',
  objects:      '📦',
  sports:       '⚽',
  nature:       '🌿',
  vehicles:     '🚗',
  jobs:         '💼',
  activities:   '🎯',
  aussie_slang: '🦘',
  pop_culture:  '🎬',
  people:       '👤',
  brands:       '🏷️',
  emotions:     '💭',
  actions:      '⚡',
  music:        '🎵',
};

let settingPlayAllDecks = true;
let settingTabooCount   = 5;
let settingPenaltyMode  = 'points';
let settingSkipFree     = true;
let settingTimePenalty  = 10;
let settingCorrections  = false;

// ── Game state ────────────────────────────────────────────────────────────────
let allWords           = [];
let regularWords       = [];
let syllyWords         = [];
let regularIdx         = 0;
let syllyIdx           = 0;
let currentWordData    = null;
let currentWordIsSylly = false;
let wordsLoaded        = false;

let roundLog        = [];
let currentStreak   = 0;
let isProcessing    = false;

const HYPE_PHRASES = ['Gold Star! 🌟', 'Clever clogs! 🧠', "You're on a roll! 🎉", 'Hat trick! 🎩', 'Absolutely smashing! 🏆', 'Too easy! 😎', 'Legendary! ⚡'];
let lastHypeIdx     = -1;
let reviewCallback  = null;
let matchLog        = [];
let scoreBeforeTurn = 0;

let teamNames    = ['Team 1', 'Team 2'];
let teamScores   = [0, 0];
let currentTeam  = 0;
let currentRound = 1;
let totalRounds  = 5;
let timeLeft     = 60;
let timerHandle  = null;
let isPaused     = false;
let wordsExhausted = false;

// ── UI helpers ────────────────────────────────────────────────────────────────
function setTeamBoxState(id, state) {
  const el = document.getElementById(id);
  el.classList.remove('team-box-active', 'team-box-inactive', 'team-box-pulse', 'team-box-winner');
  if (state) el.classList.add(...state.split(' '));
}

function pulseScore() {
  const el = document.getElementById('score-display');
  el.classList.remove('score-pulse');
  void el.offsetWidth;
  el.classList.add('score-pulse');
}

function flashBackground(colour) {
  document.body.classList.remove('flash-green', 'flash-red');
  document.body.classList.add(colour === 'green' ? 'flash-green' : 'flash-red');
  setTimeout(() => document.body.classList.remove('flash-green', 'flash-red'), 400);
}

// ── Word loading + drawing ────────────────────────────────────────────────────
async function loadWords() {
  if (wordsLoaded) return;
  allWords    = await fetch('data/words.json').then(r => r.json());
  wordsLoaded = true;
}

function drawNextWord() {
  const regularLeft = regularIdx < regularWords.length;
  const syllyLeft   = settingSylly && syllyIdx < syllyWords.length;

  if (!regularLeft && !syllyLeft) return false;

  const goSylly = syllyLeft && (!regularLeft || Math.random() < settingSyllyPct / 100);

  if (goSylly) {
    currentWordIsSylly = true;
    currentWordData    = syllyWords[syllyIdx++];
  } else {
    currentWordIsSylly = false;
    currentWordData    = regularWords[regularIdx++];
  }
  return true;
}

// ── Sylly visuals ─────────────────────────────────────────────────────────────
function applySyllyVisuals() {
  const card = document.getElementById('active-word-card');
  const nay  = document.getElementById('btn-taboo');
  const skip = document.getElementById('btn-skip');
  const hint = document.getElementById('sylly-scoring-hint');

  if (currentWordIsSylly) {
    card.classList.add('sylly-glow');
    nay.classList.add('shake');
    nay.style.background   = '#a855f7';
    nay.style.color        = '#fff';
    skip.classList.add('shake');
    skip.style.background  = '#a855f7';
    skip.style.color       = '#fff';
    hint.classList.add('sylly-hint-show');
  } else {
    card.classList.remove('sylly-glow');
    nay.classList.remove('shake');
    nay.style.background   = '';
    nay.style.color        = '';
    skip.classList.remove('shake');
    skip.style.background  = '';
    skip.style.color       = '';
    hint.classList.remove('sylly-hint-show');
  }
}

// ── Dynamic scoring ───────────────────────────────────────────────────────────
function getMultiplier() { return currentWordIsSylly ? 2 : 1; }

function timePenaltyForTimer(secs) {
  return secs === 30 ? 5 : secs === 90 ? 20 : 10;
}

// ── Secret Mode: apply forced overrides before game start ────────────────────
function applyExpansionOverrides() {
  if (!isSecretMode || !window.activeExpansionOverrides) return;
  const ov = window.activeExpansionOverrides;
  if (ov.settingTimer       !== undefined) settingTimer       = ov.settingTimer;
  if (ov.settingRounds      !== undefined) settingRounds      = ov.settingRounds;
  if (ov.settingTabooCount  !== undefined) settingTabooCount  = ov.settingTabooCount;
  if (ov.settingPenaltyMode !== undefined) settingPenaltyMode = ov.settingPenaltyMode;
  if (ov.settingSkipFree    !== undefined) settingSkipFree    = ov.settingSkipFree;
  if (ov.settingSylly       !== undefined) settingSylly       = ov.settingSylly;
  if (ov.settingSyllyPct    !== undefined) settingSyllyPct    = ov.settingSyllyPct;
}

// ── Screen: SETUP ─────────────────────────────────────────────────────────────
async function startGame() {
  applyExpansionOverrides();
  if (!isSecretMode && !settingPlayAllDecks && settingCategories.size === 0) return;
  await loadWords();
  // In Secret Mode, use expansion word bank instead of standard words
  const active = isSecretMode
    ? secretWords
    : (settingPlayAllDecks ? allWords : allWords.filter(w => settingCategories.has(w.category)));
  regularWords   = shuffle(active.filter(w => w.difficulty < 3));
  syllyWords     = settingSylly ? shuffle(active.filter(w => w.difficulty >= 3)) : [];
  regularIdx     = 0;
  syllyIdx       = 0;
  teamScores     = [0, 0];
  wordsExhausted = false;
  matchLog       = [];
  currentTeam    = 0;
  currentRound   = 1;
  totalRounds    = settingRounds;

  const n1 = document.getElementById('input-team1').value.trim();
  const n2 = document.getElementById('input-team2').value.trim();
  teamNames[0] = n1 || 'Team 1';
  teamNames[1] = n2 || 'Team 2';

  drawNextWord();
  showGatekeeper();
}

// ── Taboo list renderer ───────────────────────────────────────────────────────
function renderTabooList(containerId, tabooList) {
  const words = tabooList.slice(0, settingTabooCount);
  const el = document.getElementById(containerId);
  if (settingTabooCount >= 10) {
    el.className = 'taboo-list-hard';
  } else {
    el.className = 'taboo-list-clean';
  }
  el.innerHTML = words.map(t => `<li>${t}</li>`).join('');
}

// ── Hype message pools ────────────────────────────────────────────────────────
const HYPE_POOLS = {
  finalRound: [
    'Last chance for a gold star!',
    'One more? When is lunch!',
    'Final round— team circle!',
    'One more turn! Time to win!',
  ],
  scoreless: [
    "Let's get a sticker on the chart!",
    "Time to wake up — No time for a nap!",
    "No time to waste! Let's get moving!",
    "Pick up the pace!",
  ],
  hot: [
    "You're a total whiz-kid!",
    "Top of the class!",
    "You're on a roll—roll-roll!",
  ],
  trailing: [
    "Don't be a slow-poke! Catch up!",
    'Time to put your thinking cap on!',
    "You're behind—time for a big play!",
  ],
  tied: [
    "Tied up! Who's the big brain?",
    "Head to head! Feet to Feet!",
    "It's a tie! Let's make it count!",
    "No time to be drawing!",
  ],
  leading: [
    "King of the castle! Don't let go!",
    "Look at you go! Stay in front!",
    "You're the leader—keep up the pace!",
  ],
};

function getHypeMessage() {
  const mine   = teamScores[currentTeam];
  const theirs = teamScores[1 - currentTeam];
  const pick   = arr => arr[Math.floor(Math.random() * arr.length)];
  if (currentRound === totalRounds) return pick(HYPE_POOLS.finalRound);
  if (mine === 0)                   return pick(HYPE_POOLS.scoreless);
  if (mine > 10)                    return pick(HYPE_POOLS.hot);
  if (mine < theirs)                return pick(HYPE_POOLS.trailing);
  if (mine === theirs && mine > 0)  return pick(HYPE_POOLS.tied);
  return pick(HYPE_POOLS.leading);
}

// ── Screen: GATEKEEPER ────────────────────────────────────────────────────────
function showGatekeeper() {
  document.getElementById('gatekeeper-round-label').textContent =
    `Round ${currentRound} of ${totalRounds}`;
  document.getElementById('gatekeeper-name-team1').textContent = teamNames[0];
  document.getElementById('gatekeeper-pts-team1').textContent  = teamScores[0];
  document.getElementById('gatekeeper-name-team2').textContent = teamNames[1];
  document.getElementById('gatekeeper-pts-team2').textContent  = teamScores[1];
  document.getElementById('gatekeeper-team-name').textContent  = teamNames[currentTeam];
  document.getElementById('gatekeeper-hype').textContent       = getHypeMessage();

  setTeamBoxState('gatekeeper-score-team1', currentTeam === 0 ? 'team-box-active team-box-pulse' : 'team-box-inactive');
  setTeamBoxState('gatekeeper-score-team2', currentTeam === 1 ? 'team-box-active team-box-pulse' : 'team-box-inactive');

  showScreen('screen-gatekeeper');
}

// ── Screen: ACTIVE PLAY ───────────────────────────────────────────────────────
function showActivePlay() {
  document.getElementById('active-team-label').textContent = teamNames[currentTeam];
  renderCurrentWord();
  document.getElementById('score-display').textContent = teamScores[currentTeam];

  roundLog        = [];
  currentStreak   = 0;
  document.getElementById('active-team-label').classList.remove('streak-fire-active', 'streak-fire-shake');
  const _hype = document.getElementById('hype-phrase');
  _hype.classList.remove('hype-pop'); _hype.textContent = '';
  scoreBeforeTurn = teamScores[currentTeam];
  isPaused = false;
  document.getElementById('pause-overlay').style.display  = 'none';
  document.getElementById('active-content').style.display = 'flex';
  timeLeft = settingTimer;
  const timerEl = document.getElementById('timer-display');
  timerEl.classList.remove('timer-warning');
  timerEl.textContent = formatTime(timeLeft);
  ['gatekeeper-score-team1', 'gatekeeper-score-team2'].forEach(id =>
    document.getElementById(id).classList.remove('team-box-pulse')
  );
  startTimer();
  showScreen('screen-active-play');
}

function renderCurrentWord() {
  document.getElementById('active-word').textContent = currentWordData.word;
  const emoji = CATEGORY_EMOJI[currentWordData.category] ?? '';
  const label = currentWordData.category.replace('_', ' ');
  document.getElementById('word-category-label').textContent = `${emoji} ${label}`;
  renderTabooList('active-taboo-list', currentWordData.nono_list);
  applySyllyVisuals();
}

// ── Timer ─────────────────────────────────────────────────────────────────────
function startTimer() {
  stopTimer();
  const timerEl = document.getElementById('timer-display');
  function tick() {
    timeLeft--;
    playTick();
    timerEl.textContent = formatTime(timeLeft);
    if (timeLeft <= 10) timerEl.classList.add('timer-warning');
    if (timeLeft <= 0) { endTurn(); return; }
    timerHandle = setTimeout(tick, 1000);
  }
  timerHandle = setTimeout(tick, 1000);
}

function stopTimer() {
  if (timerHandle) { clearTimeout(timerHandle); timerHandle = null; }
}

// ── Score + word advance ──────────────────────────────────────────────────────
function applyAndAdvance(action) {
  const mult      = getMultiplier();
  const penalised = action === 'taboo' || (action === 'skip' && !settingSkipFree);
  let   points    = 0;

  if (action === 'correct') {
    points = mult;
    teamScores[currentTeam] += points;
    document.getElementById('score-display').textContent = teamScores[currentTeam];
    pulseScore();
  } else if (penalised) {
    if (settingPenaltyMode === 'points') {
      points = -Math.min(mult, teamScores[currentTeam]);
      teamScores[currentTeam] = Math.max(0, teamScores[currentTeam] - mult);
      document.getElementById('score-display').textContent = teamScores[currentTeam];
      pulseScore();
    } else {
      points = 0;
      timeLeft = Math.max(0, timeLeft - (settingTimePenalty * mult));
      document.getElementById('timer-display').textContent = formatTime(timeLeft);
      if (timeLeft <= 0) { endTurn(); return; }
    }
  }

  roundLog.push({ word: currentWordData.word, action, originalAction: action, isSylly: currentWordIsSylly, points });

  if (action === 'correct') {
    currentStreak++;
    if (currentStreak >= 3) {
      const lbl = document.getElementById('active-team-label');
      lbl.classList.add('streak-fire-active');
      lbl.classList.remove('streak-fire-shake');
      void lbl.offsetWidth;
      lbl.classList.add('streak-fire-shake');
      lbl.addEventListener('animationend', () => lbl.classList.remove('streak-fire-shake'), { once: true });
      showHypePhrase();
    }
  } else {
    currentStreak = 0;
    const lbl = document.getElementById('active-team-label');
    lbl.classList.remove('streak-fire-active', 'streak-fire-shake');
  }

  if (!drawNextWord()) {
    wordsExhausted = true;
    stopTimer();
    showRoundReview(() => showGameOver());
  } else {
    renderCurrentWord();
  }
}

// ── End of turn ───────────────────────────────────────────────────────────────
function endTurn() {
  stopTimer();
  if (currentTeam === 0) {
    showRoundReview(() => {
      currentTeam = 1;
      drawNextWord();
      showGatekeeper();
    });
  } else {
    if (currentRound < totalRounds) {
      showRoundReview(() => {
        currentRound++;
        currentTeam = 0;
        drawNextWord();
        showGatekeeper();
      });
    } else {
      showRoundReview(() => showGameOver());
    }
  }
}

// ── Hype phrase pop ───────────────────────────────────────────────────────────
function showHypePhrase() {
  let idx;
  do { idx = Math.floor(Math.random() * HYPE_PHRASES.length); } while (idx === lastHypeIdx && HYPE_PHRASES.length > 1);
  lastHypeIdx = idx;
  const el = document.getElementById('hype-phrase');
  el.textContent = HYPE_PHRASES[idx];
  el.classList.remove('hype-pop');
  void el.offsetWidth;
  el.classList.add('hype-pop');
  el.addEventListener('animationend', () => { el.classList.remove('hype-pop'); el.textContent = ''; }, { once: true });
}

function showPenaltyPhrase() {
  const el = document.getElementById('hype-phrase');
  el.textContent = "Oops! That's a No-No! 🙊";
  el.classList.add('text-red-500');
  el.classList.remove('hype-pop');
  void el.offsetWidth;
  el.classList.add('hype-pop');
  el.addEventListener('animationend', () => { el.classList.remove('hype-pop', 'text-red-500'); el.textContent = ''; }, { once: true });
}

// ── Round Review ──────────────────────────────────────────────────────────────
const REVIEW_ICONS = { correct: '✅', taboo: '❌', skip: '⏩' };

function renderReviewHeader() {
  document.getElementById('review-team-label').textContent = teamNames[currentTeam];
  const turnPts = roundLog.reduce((sum, e) => sum + e.points, 0);
  const deltaEl = document.getElementById('review-score-delta');
  deltaEl.textContent = turnPts > 0 ? `+${turnPts} pts this turn` : turnPts < 0 ? `${turnPts} pts this turn` : 'No points scored';
  deltaEl.className   = turnPts > 0 ? 'text-emerald-500 font-semibold text-sm mt-0.5'
                      : turnPts < 0 ? 'text-red-400 font-semibold text-sm mt-0.5'
                      :               'text-stone-400 font-semibold text-sm mt-0.5';

  let maxStreak = 0, cur = 0;
  roundLog.forEach(e => { cur = e.action === 'correct' ? cur + 1 : 0; maxStreak = Math.max(maxStreak, cur); });
  const streakEl = document.getElementById('review-streak');
  streakEl.classList.remove('streak-glow');
  if (maxStreak >= 3) {
    streakEl.textContent = `🔥 ${maxStreak} in a row!`;
    streakEl.style.display = 'block';
    void streakEl.offsetWidth;
    streakEl.classList.add('streak-glow');
  } else {
    streakEl.style.display = 'none';
  }
}

function renderReviewList() {
  const correctEntries = roundLog.filter(e => e.action === 'correct');
  const starWord = correctEntries.length
    ? correctEntries.reduce((best, e) => e.points > best.points ? e : best, correctEntries[0]).word
    : null;

  const list = document.getElementById('review-list');
  if (roundLog.length === 0) {
    list.innerHTML = '<li class="text-center text-stone-400 text-sm py-4">No words played this turn.</li>';
    return;
  }

  list.innerHTML = roundLog.map((e, i) => {
    const ptLabel = e.points > 0 ? `+${e.points}` : e.points < 0 ? `${e.points}` : '0';
    const ptClass = e.points > 0 ? 'text-emerald-500' : e.points < 0 ? 'text-red-400' : 'text-stone-400';
    const sylly   = e.isSylly ? ' <span class="text-purple-400">✨</span>' : '';
    const star    = e.word === starWord ? ' <span class="text-yellow-400">🌟</span>' : '';
    const edited  = e.action !== e.originalAction ? ' <span class="text-stone-400 text-xs">🔄</span>' : '';
    const inner   = `<span class="flex items-center gap-1.5">
        <span>${REVIEW_ICONS[e.action]}</span>
        <span class="font-semibold text-stone-800">${e.word}</span>${sylly}${star}
      </span>
      <span class="font-bold ${ptClass}">${ptLabel}${edited}</span>`;
    const ringClass = (settingCorrections && e.action !== e.originalAction) ? ' row-edited' : '';
    return settingCorrections
      ? `<li><button onclick="flipEntry(${i})" class="w-full flex items-center justify-between bg-white rounded-xl px-4 py-2.5 shadow-sm text-sm active:opacity-60 transition-opacity${ringClass}">${inner}</button></li>`
      : `<li class="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 shadow-sm text-sm">${inner}</li>`;
  }).join('');
}

function showRoundReview(callback) {
  reviewCallback = callback;
  renderReviewHeader();
  renderReviewList();
  document.getElementById('review-overlay').style.display = 'flex';
}

// ── Justice Toggle ────────────────────────────────────────────────────────────
function flipEntry(idx) {
  const e    = roundLog[idx];
  const mult = e.isSylly ? 2 : 1;

  if (e.originalAction === 'skip') {
    if (e.action === 'skip') {
      e.action = 'correct'; e.points = mult;
    } else if (e.action === 'correct') {
      e.action = 'taboo'; e.points = settingPenaltyMode === 'points' ? -mult : 0;
    } else {
      e.action = 'skip'; e.points = settingSkipFree ? 0 : (settingPenaltyMode === 'points' ? -mult : 0);
    }
  } else {
    if (e.action === 'correct') {
      e.action = 'taboo'; e.points = settingPenaltyMode === 'points' ? -mult : 0;
    } else {
      e.action = 'correct'; e.points = mult;
    }
  }

  teamScores[currentTeam] = Math.max(0, scoreBeforeTurn + roundLog.reduce((s, x) => s + x.points, 0));
  document.getElementById('score-display').textContent = teamScores[currentTeam];
  renderReviewList();
  renderReviewHeader();
}

// ── Match History ─────────────────────────────────────────────────────────────
function showMatchHistory(teamIdx) {
  const isWinner  = teamScores[teamIdx] > teamScores[1 - teamIdx];
  const titleEl   = document.getElementById('history-title');
  titleEl.textContent = isWinner ? `🏆 ${teamNames[teamIdx]}'s Journey` : `📊 ${teamNames[teamIdx]}'s Journey`;
  titleEl.className   = isWinner ? 'text-xl font-bold text-amber-500' : 'text-xl font-bold text-stone-700';

  const turns = matchLog.filter(t => t.team === teamIdx);
  const body  = document.getElementById('history-body');

  if (turns.length === 0) {
    body.innerHTML = '<p class="text-stone-400 text-sm text-center py-4">No turns played.</p>';
  } else {
    body.innerHTML = turns.map(t => {
      const rows = t.entries.length
        ? t.entries.map(e => {
            const pt      = e.points > 0 ? `+${e.points}` : `${e.points}`;
            const ptClass = e.points > 0 ? 'text-emerald-500' : e.points < 0 ? 'text-red-400' : 'text-stone-400';
            const sylly   = e.isSylly ? ' <span class="text-purple-400">✨</span>' : '';
            return `<li class="flex items-center justify-between py-1.5 text-sm border-b border-stone-100 last:border-0">
              <span class="flex items-center gap-1.5">${REVIEW_ICONS[e.action]} <span class="font-medium text-stone-800">${e.word}</span>${sylly}</span>
              <span class="font-bold ${ptClass}">${pt}</span>
            </li>`;
          }).join('')
        : '<li class="text-stone-400 text-sm py-1">No words played.</li>';
      return `<div>
        <p class="text-stone-400 text-xs font-semibold uppercase tracking-widest mb-1.5">Round ${t.round}</p>
        <ul class="bg-white rounded-xl px-4 py-1 shadow-sm">${rows}</ul>
      </div>`;
    }).join('');
  }

  document.getElementById('history-overlay').style.display = 'flex';
}

// ── Screen: GAME OVER ─────────────────────────────────────────────────────────
function showGameOver() {
  document.getElementById('gameover-name-team1').textContent = teamNames[0];
  document.getElementById('gameover-pts-team1').textContent  = teamScores[0];
  document.getElementById('gameover-name-team2').textContent = teamNames[1];
  document.getElementById('gameover-pts-team2').textContent  = teamScores[1];

  const [s0, s1] = teamScores;
  let result;
  if (s0 > s1) {
    result = `🎉 ${teamNames[0]} wins!`;
    setTeamBoxState('gameover-card-team1', 'team-box-active team-box-winner');
    setTeamBoxState('gameover-card-team2', 'team-box-inactive');
  } else if (s1 > s0) {
    result = `🎉 ${teamNames[1]} wins!`;
    setTeamBoxState('gameover-card-team1', 'team-box-inactive');
    setTeamBoxState('gameover-card-team2', 'team-box-active team-box-winner');
  } else {
    result = `🤝 It's a draw!`;
    setTeamBoxState('gameover-card-team1', 'team-box-active');
    setTeamBoxState('gameover-card-team2', 'team-box-active');
  }
  document.getElementById('gameover-result').textContent = result;

  const earlyEnd = document.getElementById('gameover-early-end');
  earlyEnd.textContent   = wordsExhausted ? 'Extraordinary! You used all our words. Game ended early!' : '';
  earlyEnd.style.display = wordsExhausted ? 'block' : 'none';

  showScreen('screen-gameover');
}

// ── Quit / Skip Turn / Pause ──────────────────────────────────────────────────
function showQuitConfirm() {
  stopTimer();
  document.getElementById('quit-overlay').style.display = 'flex';
}

function hideQuitConfirm() {
  document.getElementById('quit-overlay').style.display = 'none';
  if (!isPaused) startTimer();
}

function showSkipTurnConfirm() {
  stopTimer();
  document.getElementById('skip-turn-overlay').style.display = 'flex';
}

function hideSkipTurnConfirm() {
  document.getElementById('skip-turn-overlay').style.display = 'none';
  if (!isPaused) startTimer();
}

function togglePause() {
  isPaused = !isPaused;
  document.getElementById('pause-overlay').style.display  = isPaused ? 'flex' : 'none';
  document.getElementById('active-content').style.display = isPaused ? 'none' : 'flex';
  isPaused ? stopTimer() : startTimer();
}

// ── Settings modal ────────────────────────────────────────────────────────────
function openSettings() {
  const el = document.getElementById('settings-overlay');
  const body = el.querySelector('.overflow-y-auto');
  if (body) body.scrollTop = 0;
  el.style.display = 'flex';
}

function closeSettings() {
  document.getElementById('settings-overlay').style.display = 'none';
}

function handlePill(btn) {
  playPillClick();
  const group = btn.dataset.group;
  const value = btn.dataset.value;

  document.querySelectorAll(`[data-group="${group}"]`).forEach(b => {
    b.classList.remove('pill-active', 'pill-active-purple');
  });
  btn.classList.add('pill-active');

  if (group === 'timer') {
    settingTimer       = parseInt(value);
    settingTimePenalty = timePenaltyForTimer(settingTimer);
    document.getElementById('pill-time-penalty').textContent = `−${settingTimePenalty} Secs`;
  }
  if (group === 'rounds')       settingRounds      = parseInt(value);
  if (group === 'taboo-count')  settingTabooCount  = parseInt(value);
  if (group === 'penalty-mode') settingPenaltyMode = value;
  if (group === 'skip-cost')    settingSkipFree    = (value === 'free');
}

function handleCategoryPill(btn) {
  playPillClick();
  const cat = btn.dataset.category;
  if (settingCategories.has(cat)) {
    settingCategories.delete(cat);
    btn.classList.remove('deck-card-active');
  } else {
    settingCategories.add(cat);
    btn.classList.add('deck-card-active');
  }
  document.getElementById('deck-empty-msg').style.display = 'none';
  document.getElementById('deck-few-msg').style.display = 'none';
  deckFewWarned = false;
}

// ── Event listeners ───────────────────────────────────────────────────────────
document.getElementById('btn-dstw')
  .addEventListener('click', () => { activeGameId = 'dstw'; playLaunch(); showScreen('screen-menu'); });

document.getElementById('btn-back-to-lobby')
  .addEventListener('click', () => { playExit(); resetToLobby(); });

document.getElementById('btn-play')
  .addEventListener('click', () => {
    playLaunch();
    const t1 = document.getElementById('input-team1');
    const t2 = document.getElementById('input-team2');
    if (isSecretMode) {
      t1.value = 'The Radiant';
      t2.value = 'The Dire';
      t1.disabled = true;
      t2.disabled = true;
    } else {
      t1.disabled = false;
      t2.disabled = false;
    }
    showScreen('screen-setup');
  });

document.getElementById('btn-how-to')
  .addEventListener('click', () => {
    playPillClick();
    const el = document.getElementById('how-to-overlay');
    const inner = el.querySelector('.overlay-data-inner');
    if (inner) inner.scrollTop = 0;
    el.style.display = 'flex';
  });

document.getElementById('btn-how-to-close')
  .addEventListener('click', () => {
    document.getElementById('how-to-overlay').style.display = 'none';
  });

document.getElementById('btn-settings')
  .addEventListener('click', () => { playPillClick(); openSettings(); });

document.getElementById('btn-settings-done')
  .addEventListener('click', () => { playDone(); closeSettings(); });

document.getElementById('settings-overlay')
  .addEventListener('click', e => {
    const btn = e.target.closest('[data-group]');
    if (btn) handlePill(btn);
  });

document.getElementById('all-decks-toggle').addEventListener('click', () => { playPillClick();
  settingPlayAllDecks = !settingPlayAllDecks;
  const btn = document.getElementById('all-decks-toggle');
  btn.textContent = settingPlayAllDecks ? 'ON' : 'OFF';
  btn.className   = settingPlayAllDecks ? 'sylly-toggle-on' : 'sylly-toggle-off';
  document.getElementById('btn-edit-deck').style.display = settingPlayAllDecks ? 'none' : 'block';
  if (settingPlayAllDecks) {
    settingCategories = new Set([
      'animals', 'food', 'places', 'objects', 'sports',
      'nature', 'vehicles', 'jobs', 'activities', 'aussie_slang',
      'pop_culture', 'people', 'brands', 'emotions', 'actions', 'music',
    ]);
    document.querySelectorAll('[data-category]').forEach(b => b.classList.add('deck-card-active'));
  }
});

document.getElementById('btn-edit-deck').addEventListener('click', () => {
  playPillClick();
  document.getElementById('deck-panel').style.display = 'flex';
});

let deckFewWarned = false;
document.getElementById('btn-deck-done').addEventListener('click', () => {
  if (settingCategories.size === 0) {
    document.getElementById('deck-empty-msg').style.display = 'block';
    document.getElementById('deck-few-msg').style.display = 'none';
    deckFewWarned = false;
    return;
  }
  document.getElementById('deck-empty-msg').style.display = 'none';
  if (settingCategories.size < 3 && !deckFewWarned) {
    document.getElementById('deck-few-msg').style.display = 'block';
    deckFewWarned = true;
    return;
  }
  document.getElementById('deck-few-msg').style.display = 'none';
  deckFewWarned = false;
  playDone();
  document.getElementById('deck-panel').style.display = 'none';
});

document.getElementById('btn-toggle-all-decks').addEventListener('click', () => {
  playPillClick();
  const allBtns = document.querySelectorAll('[data-category]');
  const allSelected = settingCategories.size === allBtns.length;
  if (allSelected) {
    settingCategories.clear();
    allBtns.forEach(b => b.classList.remove('deck-card-active'));
  } else {
    allBtns.forEach(b => { settingCategories.add(b.dataset.category); b.classList.add('deck-card-active'); });
  }
  document.getElementById('btn-toggle-all-decks').textContent = settingCategories.size === allBtns.length ? 'Deselect All' : 'Select All';
});

document.getElementById('deck-panel').addEventListener('click', e => {
  const card = e.target.closest('[data-category]');
  if (card) handleCategoryPill(card);
});

document.getElementById('sylly-toggle').addEventListener('click', () => {
  settingSylly = !settingSylly;
  settingSylly ? playSyllyOn() : playSyllyOff();
  const toggle = document.getElementById('sylly-toggle');
  toggle.textContent = settingSylly ? 'ON' : 'OFF';
  toggle.className   = settingSylly ? 'sylly-toggle-on' : 'sylly-toggle-off';
  document.getElementById('sylly-pct-row').style.display = settingSylly ? 'block' : 'none';
});

document.getElementById('sylly-intensity').addEventListener('input', e => {
  settingSyllyPct = parseInt(e.target.value);
  const label = document.getElementById('sylly-intensity-label');
  label.textContent = settingSyllyPct === 100 ? '100% 🔥' : `${settingSyllyPct}%`;
  playSliderTick(settingSyllyPct);
});

document.getElementById('btn-start-game')
  .addEventListener('click', () => { playLaunch(); startGame(); });

document.getElementById('btn-start-turn')
  .addEventListener('click', () => { playLaunch(); showActivePlay(); });

document.getElementById('btn-pause')
  .addEventListener('click', () => { playPillClick(); togglePause(); });

document.getElementById('btn-resume')
  .addEventListener('click', () => { playResume(); togglePause(); });

document.getElementById('btn-correct').addEventListener('click', () => {
  if (isProcessing) return;
  isProcessing = true; setTimeout(() => { isProcessing = false; }, 100);
  playSuccess(); flashBackground('green'); applyAndAdvance('correct');
});

document.getElementById('btn-taboo').addEventListener('click', () => {
  if (isProcessing) return;
  isProcessing = true; setTimeout(() => { isProcessing = false; }, 100);
  playBoing(); flashBackground('red'); navigator.vibrate?.(40); showPenaltyPhrase(); applyAndAdvance('taboo');
});

document.getElementById('btn-skip').addEventListener('click', () => {
  if (isProcessing) return;
  isProcessing = true; setTimeout(() => { isProcessing = false; }, 100);
  if (!settingSkipFree) { playBoing(); navigator.vibrate?.(40); } else { playWhoosh(); }
  applyAndAdvance('skip');
});

document.getElementById('btn-stop')
  .addEventListener('click', () => { playPillClick(); showQuitConfirm(); });

document.getElementById('btn-quit-confirm')
  .addEventListener('click', () => { playExit(); resetToMenu(); });

document.getElementById('btn-quit-cancel')
  .addEventListener('click', () => { playResume(); hideQuitConfirm(); });

document.getElementById('btn-end-turn')
  .addEventListener('click', () => { playPillClick(); showSkipTurnConfirm(); });

document.getElementById('btn-skip-turn-confirm').addEventListener('click', () => {
  playWhoosh();
  document.getElementById('skip-turn-overlay').style.display = 'none';
  endTurn();
});

document.getElementById('btn-skip-turn-cancel')
  .addEventListener('click', () => { playResume(); hideSkipTurnConfirm(); });

document.getElementById('btn-review-next').addEventListener('click', () => {
  playLaunch();
  matchLog.push({ round: currentRound, team: currentTeam, teamName: teamNames[currentTeam], entries: [...roundLog] });
  document.getElementById('review-overlay').style.display = 'none';
  if (reviewCallback) { reviewCallback(); reviewCallback = null; }
});

document.getElementById('corrections-toggle').addEventListener('click', () => {
  settingCorrections = !settingCorrections;
  document.getElementById('corrections-toggle').textContent = settingCorrections ? 'ON' : 'OFF';
  document.getElementById('corrections-toggle').className   = settingCorrections ? 'sylly-toggle-on' : 'sylly-toggle-off';
  playPillClick();
});

document.getElementById('gameover-card-team1').addEventListener('click', () => showMatchHistory(0));
document.getElementById('gameover-card-team2').addEventListener('click', () => showMatchHistory(1));

document.getElementById('btn-history-close').addEventListener('click', () => {
  document.getElementById('history-overlay').style.display = 'none';
});

document.getElementById('btn-play-again')
  .addEventListener('click', () => { playLaunch(); resetToMenu(); });

// ── Navigation exits on transition/score screens ──────────────────────────────
// Setup → back to DSTW menu (no game started, no confirmation needed)
document.getElementById('btn-setup-exit')
  .addEventListener('click', () => { playExit(); showScreen('screen-menu'); });

// Gatekeeper → quit confirmation (mid-game)
document.getElementById('btn-gatekeeper-exit')
  .addEventListener('click', () => { playPillClick(); document.getElementById('quit-overlay').style.display = 'flex'; });

// Game over → lobby (game already finished, no confirmation needed)
document.getElementById('btn-gameover-exit')
  .addEventListener('click', () => { playExit(); resetToLobby(); });
