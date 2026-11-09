// ═══════════════════════════════════════════════════════════════════════════════
// PLUGIN: Like I'm Five (LI5)
// Depends on: engine.js (audio, showScreen, shuffle, formatTime, resetToLobby/Menu),
//             engine-multiplayer.js (mpSendEnvelope, mpSendPrivate, mpPlayerSlots,
//             mpMyPlayerIdx — Lobby Mode only; see § Lobby Mode near the end)
// ═══════════════════════════════════════════════════════════════════════════════

// ── Session settings (JS memory only — resets on page refresh) ───────────────
let settingTimer      = 60;
let settingRounds     = 5;
let settingDifficulty = 'standard'; // 'easy' | 'standard'
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

const HYPE_PHRASES = ['Gold Star! 🌟', 'Clever clogs! 🧠', 'A+ Student! 📝', 'Show and Tell champion! 🎤', "Teacher's Pet! 🍎", 'Playground Legend! 🎡', 'Sticker Chart Full! 🎫'];
let lastHypeIdx     = -1;
let reviewCallback  = null;
let matchLog        = [];
let scoreBeforeTurn = 0;

let teamNames    = ['Crayon Crew', 'Glue Stick Gang'];
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
  setTimeout(() => document.body.classList.remove('flash-green', 'flash-red'), 400); // matches flash animation duration in CSS
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

  const yay = document.getElementById('btn-correct');
  if (currentWordIsSylly) {
    card.classList.add('sylly-glow');
    yay.textContent        = 'Double Yay!';
    nay.textContent        = 'Double Nay!';
    skip.textContent       = 'Skip!';
    nay.classList.add('shake');
    nay.style.background   = '#a855f7';
    nay.style.color        = '#fff';
    skip.classList.add('shake');
    skip.style.background  = '#a855f7';
    skip.style.color       = '#fff';
    hint.classList.add('sylly-hint-show');
  } else {
    card.classList.remove('sylly-glow');
    yay.textContent        = 'Yay!';
    nay.textContent        = 'Nay!';
    skip.textContent       = 'Skip!';
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
function timePenaltyForTimer(secs) {
  return secs === 30 ? 5 : secs === 90 ? 20 : 10;
}

// ── Single-source rules (pilot spec § 5.8) ────────────────────────────────────
// Pure: Pass-the-Phone, the Lobby Mode host and Pinky Swear all score through these,
// so a rules change cannot miss a path (logic-engine.md § Single-source arithmetic).
function li5Rules() {
  return { timer: settingTimer, rounds: settingRounds, penaltyMode: settingPenaltyMode, skipFree: settingSkipFree,
           timePenalty: settingTimePenalty, corrections: settingCorrections, sylly: settingSylly };
}

// One mark → { points, score, penaltySecs }. Extra Credit doubles everything; the score
// never goes below 0; a penalised mark costs points OR seconds, by Oopsie Daisy.
function li5Score(score, entry, rules) {
  const mult      = entry.isSylly ? 2 : 1;
  const penalised = entry.action === 'taboo' || (entry.action === 'skip' && !rules.skipFree);
  if (entry.action === 'correct') return { points: mult, score: score + mult, penaltySecs: 0 };
  if (!penalised)                 return { points: 0, score, penaltySecs: 0 };
  if (rules.penaltyMode === 'points') return { points: -Math.min(mult, score), score: Math.max(0, score - mult), penaltySecs: 0 };
  return { points: 0, score, penaltySecs: rules.timePenalty * mult };
}

// Pinky Swear: flip one Report Card row (mutates it; unclamped — li5Reclamp settles).
function li5Flip(e, rules) {
  const mult = e.isSylly ? 2 : 1;
  const nayPts = rules.penaltyMode === 'points' ? -mult : 0;
  if (e.originalAction === 'skip') {
    if (e.action === 'skip')         { e.action = 'correct'; e.points = mult; }
    else if (e.action === 'correct') { e.action = 'taboo';   e.points = nayPts; }
    else                             { e.action = 'skip';    e.points = rules.skipFree ? 0 : nayPts; }
  } else if (e.action === 'correct') { e.action = 'taboo';   e.points = nayPts; }
  else                               { e.action = 'correct'; e.points = mult; }
  return e;
}

// Clamp each row in order so its shown points match what it really did; returns the score.
function li5Reclamp(log, scoreBefore) {
  let r = scoreBefore;
  for (const x of log) {
    if (x.points < 0) x.points = -Math.min(-x.points, r);
    r = Math.max(0, r + x.points);
  }
  return r;
}

// Turn order: the first group, then the other, each round. null = the bell.
// (Pass-the-Phone used to test `currentTeam === 0`, so when the second group won the
// toss, round 1 ended after their turn alone — the first group lost a turn.)
function li5NextTurn(round, team, firstTeam, totalRounds) {
  if (team === firstTeam) return { round, team: 1 - team };
  if (round < totalRounds) return { round: round + 1, team: firstTeam };
  return null;
}

// ── Secret Mode: apply forced overrides before game start ────────────────────
function applyExpansionOverrides() {
  if (!isSecretMode || !window.activeExpansionOverrides) return;
  const ov = window.activeExpansionOverrides;
  if (ov.settingTimer       !== undefined) settingTimer       = ov.settingTimer;
  if (ov.settingRounds      !== undefined) settingRounds      = ov.settingRounds;
  if (ov.settingPenaltyMode !== undefined) settingPenaltyMode = ov.settingPenaltyMode;
  if (ov.settingSkipFree    !== undefined) settingSkipFree    = ov.settingSkipFree;
  if (ov.settingSylly       !== undefined) settingSylly       = ov.settingSylly;
  if (ov.settingSyllyPct    !== undefined) settingSyllyPct    = ov.settingSyllyPct;
}

// ── Screen: SETUP ─────────────────────────────────────────────────────────────
// The deck — Pass-the-Phone and the Lobby Mode host build it the same way.
function li5BuildDeck() {
  // In Secret Mode, use expansion word bank instead of standard words
  const active = isSecretMode
    ? secretWords
    : (settingPlayAllDecks ? allWords : allWords.filter(w => settingCategories.has(w.category)));
  regularWords   = shuffle(active.filter(w => settingDifficulty === 'easy' ? w.difficulty === 1 : w.difficulty < 3));
  syllyWords     = settingSylly ? shuffle(active.filter(w => w.difficulty >= 3)) : [];
  regularIdx     = 0;
  syllyIdx       = 0;
  wordsExhausted = false;
}

let li5FirstTeam = 0;   // Pass-the-Phone: the group that won the toss (li5NextTurn)

async function startGame() {
  applyExpansionOverrides();
  if (!isSecretMode && !settingPlayAllDecks && settingCategories.size === 0) return;
  await loadWords();
  li5BuildDeck();
  teamScores     = [0, 0];
  matchLog       = [];
  currentTeam    = 0;
  currentRound   = 1;
  totalRounds    = settingRounds;

  // In Lobby Mode, team names come from the roster — preserve them
  if (window.syllyMultiplayerMode === 'single') {
    const n1 = document.getElementById('input-team1').value.trim();
    const n2 = document.getElementById('input-team2').value.trim();
    teamNames[0] = n1 || 'Crayon Crew';
    teamNames[1] = n2 || 'Glue Stick Gang';
  }

  showWhoFirst({
    emoji:           '💬',
    eyebrow:         'Ready to Go?',
    heading:         'Who Goes First?',
    prompt:          'Decide which Playgroup starts describing.',
    teamA:           teamNames[0],
    teamB:           teamNames[1],
    confirmLabel:    "Let's Go!",
    accentBtnClass:  'bg-pink-500 hover:bg-pink-600',
    accentTextClass: 'text-pink-600',
    onResult: (idx) => {
      currentTeam  = idx;
      li5FirstTeam = idx;
      drawNextWord();
      showGatekeeper();
    }
  });
}

// ── Taboo list renderer ───────────────────────────────────────────────────────
function renderTabooList(containerId, tabooList) {
  const count = currentWordIsSylly ? 10 : 5;
  const words = tabooList.slice(0, count);
  const el = document.getElementById(containerId);
  el.className = currentWordIsSylly ? 'taboo-list-hard' : 'taboo-list-clean';
  el.innerHTML = words.map(t => `<li data-word="${t}">${t}</li>`).join('');
}

// ── Miss's asides (pilot spec § 4.5 — owner-approved 9 Nov 2026) ──────────────
// Host-picked and sent in LI5_TURN.aside in Lobby Mode (flavour is synced); PTP picks locally.
const LI5_MISS_ASIDES = {
  opening:    ['Use your words.', 'No pointing at things in the room.', 'Inside voices? Not today.'],
  finalRound: ['Last turn before the bell.', 'Final turn. Best effort, please.', 'Nearly home time.'],
  scoreless:  ["Let's get a tally on the board.", "Eyes open. Nobody's napping.", "The first one's the hardest."],
  hot:        ['Top of the class so far.', 'Look at all those tallies.', "Very impressive. Don't get cocky."],
  trailing:   ['Thinking caps on, please.', 'Plenty of time to catch up.', 'A bit behind. Big turn, please.'],
  tied:       ['Neck and neck.', 'All square. Sit up straight.', 'Dead even. Somebody break it.'],
  leading:    ['Out in front. Stay there, please.', 'Lovely work. Keep it up.', 'In the lead. No showing off.'],
};

function li5PickAside(scores, team, round, rounds) {
  const mine   = scores[team];
  const theirs = scores[1 - team];
  const P      = LI5_MISS_ASIDES;
  const pick   = arr => arr[Math.floor(Math.random() * arr.length)];
  if (round === rounds)            return pick(P.finalRound);
  if (round === 1)                 return pick(P.opening);
  if (mine === 0)                  return pick(P.scoreless);
  if (mine > 10)                   return pick(P.hot);
  if (mine < theirs)               return pick(P.trailing);
  if (mine === theirs && mine > 0) return pick(P.tied);
  return pick(P.leading);
}

// ── Screen: GATEKEEPER ────────────────────────────────────────────────────────
function showGatekeeper() {
  li5RenderGate(li5PickAside(teamScores, currentTeam, currentRound, totalRounds));
  showScreen('screen-gatekeeper');
}

// The ONE render function for screen-gatekeeper — Pass-the-Phone, and every Lobby Mode
// role (up / guess / tattle / standby). It sets every element, even to '' (Stack rule 4).
// Copy: pilot spec § 4.3 (signed off). S3 dresses it as the wipe and write.
function li5RenderGate(aside) {
  const $  = id => document.getElementById(id);
  const mp = window.syllyMultiplayerMode !== 'single';
  const t  = mp ? li5V.turn : null;
  const role = mp ? li5MyRole() : 'up';
  const tlm  = window.mpLobbyStyle === 'team';
  const team = t ? t.team : currentTeam;
  const name = t ? li5SeatName(t.upSeat) : '';
  $('gatekeeper-round-label').textContent = (!mp || t) ? `Round ${currentRound} of ${totalRounds}` : '';
  $('gatekeeper-name-team1').textContent  = teamNames[0];
  $('gatekeeper-pts-team1').textContent   = teamScores[0];
  $('gatekeeper-name-team2').textContent  = teamNames[1];
  $('gatekeeper-pts-team2').textContent   = teamScores[1];
  setTeamBoxState('gatekeeper-score-team1', team === 0 ? 'team-box-active team-box-pulse' : 'team-box-inactive');
  setTeamBoxState('gatekeeper-score-team2', team === 1 ? 'team-box-active team-box-pulse' : 'team-box-inactive');
  let head = teamNames[team], line = '', wait = '';
  if (mp && !t) {                                     // standby: before the first LI5_TURN
    head = 'Settle down, please.';
  } else if (mp && tlm) {
    head = role === 'up' ? `Pass it to ${teamNames[team]}.` : `${teamNames[team]} is up.`;
    line = role === 'up' ? "Whoever's up the front takes the phone. Everyone else, eyes off the screen."
                         : 'Listen for No-No words. Hear one? Dob.';
    wait = role === 'up' ? '' : `Waiting for ${teamNames[team]}…`;
  } else if (mp) {
    head = `${name}, up the front.`;
    line = role === 'up'    ? "Explain it like they're five. Don't say the No-No words."
         : role === 'guess' ? `Shout it out. ${name} can't show you the word.`
         :                    'Listen for No-No words. Hear one? Dob.';
    wait = role === 'up' ? '' : `Waiting for ${name}…`;
  }
  $('li5-gate-eyebrow').style.display     = mp ? 'none' : '';
  $('gatekeeper-team-name').textContent   = head;
  $('gatekeeper-hype').textContent        = aside || '';
  $('li5-gate-role').textContent          = line;
  $('li5-gate-role').style.display        = line ? '' : 'none';
  $('li5-gate-wait').textContent          = wait;
  $('li5-gate-wait').style.display        = wait ? '' : 'none';
  $('btn-start-turn').style.display       = (!mp || (t && role === 'up')) ? '' : 'none';
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
  document.getElementById('li5-note').style.display       = 'none';
  document.getElementById('li5-timeup').style.display     = 'none';
  li5DimControls(false);
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
  const card = document.getElementById('active-word-card');
  card.classList.remove('card-enter');
  void card.offsetWidth;
  card.classList.add('card-enter');
  card.addEventListener('animationend', () => card.classList.remove('card-enter'), { once: true });
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
  const r = li5Score(teamScores[currentTeam], { action, isSylly: currentWordIsSylly }, li5Rules());
  teamScores[currentTeam] = r.score;
  // Logged first, so a Nay that runs the clock out still shows on the Report Card.
  roundLog.push({ word: currentWordData.word, action, originalAction: action, isSylly: currentWordIsSylly, points: r.points });

  if (r.penaltySecs) {
    timeLeft = Math.max(0, timeLeft - r.penaltySecs);
    document.getElementById('timer-display').textContent = formatTime(timeLeft);
    if (timeLeft <= 0) { endTurn(); return; }
  } else if (action !== 'skip' || !settingSkipFree) {   // a Yay, or a penalised mark in points mode
    document.getElementById('score-display').textContent = teamScores[currentTeam];
    pulseScore();
  }

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
    const card = document.getElementById('active-word-card');
    const exitClass = action === 'correct' ? 'card-exit-right' : 'card-exit-left';
    card.classList.add(exitClass);
    setTimeout(() => {
      card.classList.remove(exitClass); // wait for 150ms card-exit CSS animation before rendering next word
      renderCurrentWord();
    }, 150);
  }
}

// ── End of turn ───────────────────────────────────────────────────────────────
function endTurn() {
  stopTimer();
  const nx = li5NextTurn(currentRound, currentTeam, li5FirstTeam, totalRounds);
  showRoundReview(() => {
    if (!nx) { showGameOver(); return; }
    currentRound = nx.round;
    currentTeam  = nx.team;
    if (!drawNextWord()) { wordsExhausted = true; showGameOver(); return; }
    showGatekeeper();
  });
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
  // Pinky Swear rows are tappable only for whoever controls the Report Card (Lobby Mode:
  // the describer and the host — pilot spec § 5.3).
  const editable = settingCorrections && li5CanControlReview();
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
    const ringClass = (editable && e.action !== e.originalAction) ? ' row-edited' : '';
    return editable
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
  if (window.syllyMultiplayerMode !== 'single') {       // the host owns the log
    if (li5CanControlReview()) li5Act('LI5_FLIP', { row: idx });
    return;
  }
  if (!roundLog[idx]) return;
  li5Flip(roundLog[idx], li5Rules());
  teamScores[currentTeam] = li5Reclamp(roundLog, scoreBeforeTurn);
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
  if (window.syllyMultiplayerMode !== 'single') return;   // Lobby Mode: the host's clock never stopped
  // Only resume the turn timer if a turn is actually running. The gatekeeper screen opens
  // this same overlay with no active turn — restarting the timer there spawns a phantom
  // turn timer (ticks, then fires endTurn on a stale Report Card). Guard on the active-play
  // screen being visible.
  const activePlay = document.getElementById('screen-active-play');
  if (!isPaused && activePlay && activePlay.style.display !== 'none') startTimer();
}

function showSkipTurnConfirm() {
  stopTimer();
  document.getElementById('skip-turn-overlay').style.display = 'flex';
}

function hideSkipTurnConfirm() {
  document.getElementById('skip-turn-overlay').style.display = 'none';
  if (window.syllyMultiplayerMode !== 'single') return;
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
  const body = el.querySelector('.overlay-data-inner');
  if (body) body.scrollTop = 0;
  el.style.display = 'flex';
  updateDifficultyVal();
}

// Dynamic value line (ui-style.md § Settings Card Standard, DD-13) — the pill carries the
// thematic name only; this says what it means for the word pool.
function updateDifficultyVal() {
  const el = document.getElementById('li5-val-difficulty');
  if (!el) return;
  el.textContent = settingDifficulty === 'easy'
    ? 'Gold Star uses only the easiest words.'
    : 'Honour Roll mixes easy and tricky words.';
}

function closeSettings() {
  document.getElementById('settings-overlay').style.display = 'none';
}

function handlePill(btn) {
  playPillClick();
  const group = btn.dataset.group;
  const value = btn.dataset.value;

  document.querySelectorAll(`[data-group="${group}"]`).forEach(b => {
    b.classList.remove('pill-active', 'pill-active-purple', 'pill-active-pink');
  });
  btn.classList.add('pill-active-pink');

  if (group === 'timer') {
    settingTimer       = parseInt(value);
    settingTimePenalty = timePenaltyForTimer(settingTimer);
    document.getElementById('pill-time-penalty').textContent = `−${settingTimePenalty} Secs`;
  }
  if (group === 'rounds')       settingRounds      = parseInt(value);
  if (group === 'difficulty')   { settingDifficulty  = value; updateDifficultyVal(); }
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

// ── Help tip overlay ──────────────────────────────────────────────────────────
function li5ShowHelpTip(emoji, heading, tip) {
  document.getElementById('li5-help-tip-emoji').textContent   = emoji;
  document.getElementById('li5-help-tip-heading').textContent = heading;
  document.getElementById('li5-help-tip-text').textContent    = tip;
  document.getElementById('li5-help-tip-overlay').style.display = 'flex';
}

// ═══════════════════════════════════════════════════════════════════════════════
// § Lobby Mode — MDLM and TLM, one code path, host-authoritative
// Spec: docs/superpowers/specs/2026-11-09-li5-pilot-design.md § 5 (packet table § 5.2).
//
// The host holds the deck, the scores, the clock, the log and the dob tally (li5H).
// EVERY device — the host included — renders only through the appliers below (li5V):
// the host broadcasts a packet and then applies it to itself (li5Broadcast/li5SendTo),
// so a host screen and a client screen cannot drift.
//
// Roles each turn (li5RoleOf): 'up' (up the front) · 'guess' (rest of that group) ·
// 'tattle' (the other group). The current word, its No-No List and its Extra Credit
// flag travel ONLY by mpSendPrivate to 'up' + 'tattle' (li5MayKnow). The one
// structural exception: the host device holds the deck, so a host who is guessing has
// the word in memory — never on screen (screen-li5-guess has no word element).
//
// Host → all:  LI5_MATCH · LI5_TURN · LI5_CLOCK · LI5_CARD · LI5_TIME_UP · LI5_REVIEW · LI5_GAMEOVER
// Host → seat: LI5_WORD · LI5_DOBS · LI5_STATE (a rejoin)
// Client → host (fire-and-forget, idempotent by turnId + cardNo, no sync lock):
//   LI5_READY · LI5_MARK · LI5_TIMEOUT · LI5_END_TURN · LI5_DOB · LI5_WAVE · LI5_FLIP · LI5_NEXT
// The host takes a submitter's seat from originId (li5SeatOf), never the payload, and
// applies its own taps directly (the dedup guard drops self-sent ACTIONs).
// Firebase erases empty values: every collection is rebuilt on receipt (li5Wire*).
// ═══════════════════════════════════════════════════════════════════════════════
const LI5_TIME_UP_GRACE_MS = 1000;   // a Yay tapped at 0:01 lands after 0:00 on a real network
const LI5_DOB_COOLDOWN_MS  = 5000;   // per tattletale, host-enforced (mirrored locally for the dimming)

let li5H         = null;             // host only — the authoritative match
let li5V         = li5FreshView();   // every device — what this screen shows
let li5ClockTick = null;             // every device — the 1 s display tick (Timer Lifecycle: li5Teardown)

function li5FreshView() {
  return { phase: 'standby', turnId: -1, turn: null, groups: [], clock: null, card: null, next: null,
           dobs: null, feed: [], streak: 0, lastResolved: -1, marked: -1, early: [], coolUntil: 0,
           noteSlot: -1, renderedCard: -1, reviewUp: -1 };
}

// Timer Lifecycle (logic-engine.md): from resetToLobby(), resetToMenu() and every match entry.
function li5Teardown() {
  if (li5H) {
    if (li5H.clockTimer) clearTimeout(li5H.clockTimer);
    if (li5H.graceTimer) clearTimeout(li5H.graceTimer);
  }
  li5H = null;
  li5StopClockTick();
  li5V = li5FreshView();
}

// ── Wire normalisers (own copies — cjarWireArr's shape) ──────────────────────
function li5WireLen(v) {
  if (Array.isArray(v)) return v.length;
  if (!v || typeof v !== 'object') return 0;
  const ks = Object.keys(v).filter(k => /^\d+$/.test(k)).map(Number);
  return ks.length ? Math.max(...ks) + 1 : 0;
}
function li5WireArr(v, n, fill) {
  const src = (v && typeof v === 'object') ? v : {};
  const out = [];
  for (let i = 0; i < n; i++) { const x = src[i]; out.push(x === undefined || x === null ? fill : x); }
  return out;
}
function li5WireList(v) {
  if (Array.isArray(v)) return v.filter(x => x !== undefined && x !== null);
  if (!v || typeof v !== 'object') return [];
  return Object.keys(v).filter(k => /^\d+$/.test(k)).sort((a, b) => a - b).map(k => v[k]).filter(x => x != null);
}
function li5WireEntry(e) {
  e = e || {};
  return { word: String(e.word == null ? '' : e.word), action: String(e.action || 'skip'),
           originalAction: String(e.originalAction || e.action || 'skip'), isSylly: e.isSylly === true, points: Number(e.points) || 0 };
}
function li5WireCard(c, cardNo) {
  c = c || {};
  return { cardNo, word: String(c.word == null ? '' : c.word), nonoList: li5WireList(c.nonoList).map(String),
           isSylly: c.isSylly === true, category: String(c.category || '') };
}
function li5Esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, ch =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

// ── Seats and roles (pure) ───────────────────────────────────────────────────
function li5RoleOf(seat, turn, groups) {
  if (!turn || !Number.isInteger(turn.upSeat) || turn.upSeat < 0) return null;
  if (seat === turn.upSeat) return 'up';
  return groups[seat] === turn.team ? 'guess' : 'tattle';
}
function li5MyRole()       { return li5RoleOf(mpMyPlayerIdx, li5V.turn, li5V.groups); }
function li5SeatOf(uid)    { return mpPlayerSlots.findIndex(s => s && s.uid === uid); }
function li5SeatName(seat) { const s = mpPlayerSlots[seat]; return (s && s.nickname) || `Player ${seat + 1}`; }
function li5MayKnow(seat)  { return !!li5H && li5RoleOf(seat, li5H, li5H.groups) !== 'guess'; }   // ONE source for who may know
function li5CanControlReview() {
  if (window.syllyMultiplayerMode === 'single') return true;
  return window.syllyMultiplayerMode === 'host' || mpMyPlayerIdx === li5V.reviewUp;
}

// ── Sending ──────────────────────────────────────────────────────────────────
function li5Broadcast(payload) {
  mpSendEnvelope({ type: 'SYNC', payload });
  li5Apply(payload);                                 // the host's own screen, same applier
}
function li5SendTo(seat, payload) {
  if (seat === mpMyPlayerIdx) { li5Apply(payload); return; }
  const s = mpPlayerSlots[seat];
  if (s) mpSendPrivate(s.uid, { type: 'SYNC', payload });
}
// A tap: the host applies it directly; a client sends an ACTION.
function li5Act(action, extra) {
  const p = Object.assign({ action, turnId: li5V.turnId }, extra || {});
  if (window.syllyMultiplayerMode === 'host') li5HostAction(mpMyPlayerIdx, p);
  else if (window.syllyMultiplayerMode === 'client') mpSendEnvelope({ type: 'ACTION', payload: p });
}

// ── Entry — MP_GAME_CONFIGS.li5.onPassThePhone (safe to re-run: Play again, a rejoin) ──
function li5OnEnter() {
  if (window.syllyMultiplayerMode === 'single') { startGame(); return; }
  li5Teardown();
  const r = window.mpLobbyRoster, pre = window.mpLobbyRosterTeamNames;
  [0, 1].forEach(i => {
    const n = (r && r.teamNames && r.teamNames[i]) || (pre && pre[i]) || '';
    teamNames[i] = String(n).trim() || ['Crayon Crew', 'Glue Stick Gang'][i];
  });
  if (window.syllyMultiplayerMode === 'host') { li5HostStartMatch(); return; }
  li5RenderGate('');                                 // standby until the first LI5_TURN (or LI5_STATE)
  showScreen('screen-gatekeeper');
}

// ═══ Host ════════════════════════════════════════════════════════════════════
async function li5HostStartMatch() {
  applyExpansionOverrides();
  await loadWords();
  if (window.syllyMultiplayerMode !== 'host') return;    // left while the words loaded
  li5BuildDeck();
  const n = mpPlayerSlots.length;
  const r = window.mpLobbyRoster;
  let groups = (window.mpLobbyStyle !== 'team' && r && r.playerTeamIdx)
    ? li5WireArr(r.playerTeamIdx, n, 0).map(x => (Number(x) === 1 ? 1 : 0))
    : mpPlayerSlots.map((_, i) => i % 2);              // TLM: a device IS a group
  let members = [0, 1].map(g => groups.map((x, i) => (x === g ? i : -1)).filter(i => i >= 0));
  if (!members[0].length || !members[1].length) {
    groups  = mpPlayerSlots.map((_, i) => i % 2);
    members = [0, 1].map(g => groups.map((x, i) => (x === g ? i : -1)).filter(i => i >= 0));
  }
  const first = Math.random() < 0.5 ? 0 : 1;         // Miss picks the first group (departure D4)
  li5H = {
    turnId: -1, round: 1, team: first, firstTeam: first, totalRounds: settingRounds, upPtr: [0, 0], upSeat: -1,
    phase: 'gate', scores: [0, 0], scoreBefore: 0, log: [], feed: [], matchLog: [], streak: 0,
    card: null, next: null, cardNo: -1, endTimestamp: 0, remainingMs: 0, clockTimer: null, graceTimer: null,
    timeUpAt: 0, dobs: null, dobAt: {}, awayPaused: false, exhausted: false, groups, members, aside: '',
  };
  li5Broadcast(li5MatchPayload());
  li5HostBeginTurn();
}

function li5DrawCard() {
  if (!drawNextWord()) return null;
  return { word: currentWordData.word, nonoList: (currentWordData.nono_list || []).slice(0, currentWordIsSylly ? 10 : 5),
           isSylly: currentWordIsSylly, category: currentWordData.category || '' };
}

// ── Payloads (one builder each — the live packets and LI5_STATE share them) ──
function li5MatchPayload() {
  return { action: 'LI5_MATCH', teamNames: teamNames.slice(0, 2), playerTeamIdx: li5H.groups.slice(), rules: li5Rules() };
}
function li5TurnPayload() {
  const H = li5H;
  return { action: 'LI5_TURN', turnId: H.turnId, round: H.round, totalRounds: H.totalRounds, team: H.team,
           upSeat: H.upSeat, scores: H.scores.slice(), aside: H.aside };
}
function li5ClockPayload() {
  const H = li5H;
  return { action: 'LI5_CLOCK', turnId: H.turnId, endTimestamp: H.endTimestamp, paused: H.phase === 'timeout', remainingMs: H.remainingMs };
}
function li5WordPayload(seat) {
  const H = li5H, c = H.card;
  const p = { action: 'LI5_WORD', turnId: H.turnId, cardNo: H.cardNo, word: c.word, nonoList: c.nonoList.slice(),
              isSylly: c.isSylly, category: c.category };
  if (seat === H.upSeat) p.next = H.next ? Object.assign({}, H.next, { nonoList: H.next.nonoList.slice() }) : null;
  return p;
}
function li5DobsPayload() {
  const H = li5H;
  return { action: 'LI5_DOBS', turnId: H.turnId, cardNo: H.cardNo, counts: H.dobs.map(a => a.length) };
}
function li5ReviewPayload() {
  const H = li5H;
  return { action: 'LI5_REVIEW', turnId: H.turnId, log: H.log.map(e => Object.assign({}, e)), scores: H.scores.slice(),
           upSeat: H.upSeat, team: H.team };
}
function li5GameOverPayload() {
  const H = li5H;
  return { action: 'LI5_GAMEOVER', scores: H.scores.slice(), wordsExhausted: H.exhausted,
           matchLog: H.matchLog.map(t => ({ round: t.round, team: t.team, teamName: t.teamName, entries: t.entries.map(e => Object.assign({}, e)) })) };
}
// A rejoining seat, stripped by role through li5MayKnow / li5WordPayload — the same
// filter the live packets use (pilot spec § 5.7).
function li5StatePayload(seat) {
  const H = li5H, knows = li5MayKnow(seat);
  const p = { action: 'LI5_STATE', phase: H.phase, match: li5MatchPayload(), turn: li5TurnPayload(), clock: li5ClockPayload(),
              scores: H.scores.slice(), streak: H.streak, feed: H.feed.map(f => Object.assign({}, f)) };
  if (H.phase === 'review')   p.review   = li5ReviewPayload();
  if (H.phase === 'gameover') p.gameover = li5GameOverPayload();
  if (knows && H.card)        p.word     = li5WordPayload(seat);
  if (knows && H.card && H.dobs) p.dobs  = li5DobsPayload();
  return p;
}

// ── The turn ─────────────────────────────────────────────────────────────────
function li5HostBeginTurn() {
  const H = li5H;
  H.turnId++;
  const mem = H.members[H.team];
  H.upSeat = mem[H.upPtr[H.team] % mem.length];
  H.phase = 'gate'; H.log = []; H.feed = []; H.streak = 0; H.card = null; H.next = null; H.cardNo = -1;
  H.dobs = null; H.dobAt = {}; H.scoreBefore = H.scores[H.team];
  H.endTimestamp = 0; H.remainingMs = 0; H.awayPaused = false; H.timeUpAt = 0;
  H.aside = li5PickAside(H.scores, H.team, H.round, H.totalRounds);
  li5Broadcast(li5TurnPayload());
}

function li5HostAction(seat, p) {
  const H = li5H;
  if (!H || window.syllyMultiplayerMode !== 'host' || !p) return;
  if (p.turnId !== H.turnId) return;                    // an old turn's tap (or a forged one)
  const up = seat === H.upSeat;
  switch (p.action) {
    case 'LI5_READY':    if (up && H.phase === 'gate') li5HostOpenTurn(); return;
    case 'LI5_MARK':     if (up) li5HostMark(p.cardNo, p.mark); return;
    case 'LI5_TIMEOUT':  if (up) li5HostTimeout(p.paused === true); return;
    case 'LI5_END_TURN': if (up && (H.phase === 'play' || H.phase === 'timeout')) li5HostEndTurn(); return;
    case 'LI5_DOB':      li5HostDob(seat, p.cardNo, p.slot); return;
    case 'LI5_WAVE':     if (up) li5HostWave(p.cardNo, p.slot); return;
    case 'LI5_FLIP':     if ((up || seat === mpMyPlayerIdx) && H.phase === 'review' && settingCorrections) li5HostFlip(p.row); return;
    case 'LI5_NEXT':     if ((up || seat === mpMyPlayerIdx) && H.phase === 'review') li5HostNext(); return;
  }
}

function li5HostSendWord() {
  for (let s = 0; s < mpPlayerSlots.length; s++) if (li5MayKnow(s)) li5SendTo(s, li5WordPayload(s));
}
function li5HostSendDobs() {
  for (let s = 0; s < mpPlayerSlots.length; s++) if (li5MayKnow(s)) li5SendTo(s, li5DobsPayload());
}
function li5HostNewCard() {
  li5H.dobs = Array.from({ length: li5H.card.nonoList.length + 1 }, () => []);   // last slot = the word itself
}

// Ready, Miss! — settle (two cards drawn, clock stamped), private words first, then public.
function li5HostOpenTurn() {
  const H = li5H;
  H.card = li5DrawCard();
  if (!H.card) { H.exhausted = true; li5HostEndTurn(); return; }
  H.next = li5DrawCard();
  H.cardNo = 0;
  li5HostNewCard();
  H.phase = 'play';
  H.endTimestamp = Date.now() + settingTimer * 1000;   // the host stamps the clock (departure D5)
  H.remainingMs = 0;
  li5HostSendWord();
  li5Broadcast(li5ClockPayload());
  li5HostArmClock();
}

function li5HostMark(cardNo, mark) {
  const H = li5H;
  if (mark !== 'correct' && mark !== 'taboo' && mark !== 'skip') return;
  const inGrace = H.phase === 'timeup' && Date.now() - H.timeUpAt <= LI5_TIME_UP_GRACE_MS;
  if (!(H.phase === 'play' || inGrace)) return;
  if (!H.card || cardNo !== H.cardNo) return;            // stale, repeated, or already marked
  const card = H.card;
  const r = li5Score(H.scores[H.team], { action: mark, isSylly: card.isSylly }, li5Rules());
  H.scores[H.team] = r.score;
  H.log.push({ word: card.word, action: mark, originalAction: mark, isSylly: card.isSylly, points: r.points });
  H.streak = mark === 'correct' ? H.streak + 1 : 0;
  const last = { action: mark, isSylly: card.isSylly, points: r.points };
  if (mark === 'correct') last.word = card.word;         // a Yay is the only word a guesser may see mid-turn
  H.feed.push(Object.assign({ cardNo }, last));
  let ended = false, shifted = false;
  if (inGrace) {
    H.card = null; H.cardNo = -1;                         // the turn is over: nothing more to mark
  } else {
    H.card = H.next;
    H.next = H.card ? li5DrawCard() : null;
    if (!H.card) { H.exhausted = true; ended = true; }
    else { H.cardNo++; li5HostNewCard(); }
    if (r.penaltySecs && !ended) {
      if (H.awayPaused) H.remainingMs = Math.max(0, H.remainingMs - r.penaltySecs * 1000);
      else H.endTimestamp -= r.penaltySecs * 1000;
      shifted = true;
    }
  }
  if (!ended && !inGrace) li5HostSendWord();
  li5Broadcast({ action: 'LI5_CARD', turnId: H.turnId, cardNo, last, scores: H.scores.slice(), streak: H.streak });
  if (ended) { li5HostEndTurn(); return; }
  if (shifted) { li5Broadcast(li5ClockPayload()); if (!H.awayPaused) li5HostArmClock(); }
}

function li5HostTimeout(paused) {
  const H = li5H;
  if (H.awayPaused) return;
  if (paused && H.phase === 'play') {
    H.remainingMs = Math.max(0, H.endTimestamp - Date.now());
    li5HostDisarm();
    H.phase = 'timeout';
    li5Broadcast(li5ClockPayload());
  } else if (!paused && H.phase === 'timeout') {
    H.endTimestamp = Date.now() + H.remainingMs;
    H.remainingMs = 0;
    H.phase = 'play';
    li5Broadcast(li5ClockPayload());
    li5HostArmClock();
  }
}

function li5HostDob(seat, cardNo, slot) {
  const H = li5H;
  if (H.phase !== 'play' || !H.card || cardNo !== H.cardNo) return;
  if (li5RoleOf(seat, H, H.groups) !== 'tattle') return;
  slot = Number(slot);
  if (!Number.isInteger(slot) || slot < 0 || slot >= H.dobs.length) return;
  const now = Date.now();
  if (now - (H.dobAt[seat] || -Infinity) < LI5_DOB_COOLDOWN_MS) return;
  H.dobAt[seat] = now;
  if (!H.dobs[slot].includes(seat)) H.dobs[slot].push(seat);   // a repeat dobber counts once
  li5HostSendDobs();
}

function li5HostWave(cardNo, slot) {
  const H = li5H;
  if ((H.phase !== 'play' && H.phase !== 'timeout') || !H.card || cardNo !== H.cardNo) return;
  slot = Number(slot);
  if (!Number.isInteger(slot) || slot < 0 || slot >= H.dobs.length) return;
  H.dobs[slot] = [];
  li5HostSendDobs();
}

function li5HostArmClock() {
  const H = li5H;
  li5HostDisarm();
  const ms = H.endTimestamp - Date.now();
  if (ms <= 0) { li5HostTimeUp(); return; }
  H.clockTimer = setTimeout(li5HostTimeUp, ms);
}
function li5HostDisarm() {
  if (li5H && li5H.clockTimer) { clearTimeout(li5H.clockTimer); li5H.clockTimer = null; }
}
// Only the host ends a turn (pilot spec § 5.4). Then the 1 s grace, then the Report Card.
function li5HostTimeUp() {
  const H = li5H;
  if (!H || H.phase !== 'play') return;
  H.clockTimer = null;
  H.phase = 'timeup';
  H.timeUpAt = Date.now();
  li5Broadcast({ action: 'LI5_TIME_UP', turnId: H.turnId });
  H.graceTimer = setTimeout(() => { if (li5H) { li5H.graceTimer = null; li5HostEndTurn(); } }, LI5_TIME_UP_GRACE_MS);
}

function li5HostEndTurn() {
  const H = li5H;
  li5HostDisarm();
  if (H.graceTimer) { clearTimeout(H.graceTimer); H.graceTimer = null; }
  H.phase = 'review'; H.card = null; H.next = null; H.cardNo = -1; H.dobs = null;
  li5Broadcast(li5ReviewPayload());
}

function li5HostFlip(row) {
  const H = li5H;
  row = Number(row);
  if (!Number.isInteger(row) || !H.log[row]) return;
  li5Flip(H.log[row], li5Rules());
  H.scores[H.team] = li5Reclamp(H.log, H.scoreBefore);
  li5Broadcast(li5ReviewPayload());
}

function li5HostNext() {
  const H = li5H;
  H.matchLog.push({ round: H.round, team: H.team, teamName: teamNames[H.team], entries: H.log.map(e => Object.assign({}, e)) });
  H.upPtr[H.team]++;
  const nx = H.exhausted ? null : li5NextTurn(H.round, H.team, H.firstTeam, H.totalRounds);
  if (!nx) { H.phase = 'gameover'; li5Broadcast(li5GameOverPayload()); return; }
  H.round = nx.round;
  H.team  = nx.team;
  li5HostBeginTurn();
}

// ── Reconnect (MP_GAME_CONFIGS.li5.reconnect — pilot spec § 5.7) ──────────────
// pause: freeze the clock as Time Out does, but send nothing (the Away overlay covers
// every device). resume: LI5_CLOCK only — never LI5_TURN, whose applier wipes the board.
function li5ReconnectPause() {
  const H = li5H;
  if (!H || H.phase !== 'play' || H.awayPaused) return;
  H.remainingMs = Math.max(0, H.endTimestamp - Date.now());
  li5HostDisarm();
  H.awayPaused = true;
}
function li5ReconnectResume() {
  const H = li5H;
  if (!H || !H.awayPaused) return;
  H.awayPaused   = false;
  H.endTimestamp = Date.now() + H.remainingMs;
  H.remainingMs  = 0;
  li5Broadcast(li5ClockPayload());
  li5HostArmClock();
}
function li5SendState(seat) {
  if (li5H) li5SendTo(seat, li5StatePayload(seat));
}

// ═══ Every device: the envelope router + the appliers ═════════════════════════
// From mpHandleEnvelope (one dispatch line). Throws are warned, never silent (ML-05).
function li5HandleEnvelope(env) {
  const p = env && env.payload;
  if (!p || typeof p.action !== 'string' || p.action.indexOf('LI5_') !== 0) return;
  try {
    if (env.type === 'ACTION') {
      if (window.syllyMultiplayerMode !== 'host') return;
      const seat = li5SeatOf(env.originId);           // the seat comes from originId, never the payload
      if (seat < 0) return;
      li5HostAction(seat, p);
      return;
    }
    if (window.syllyMultiplayerMode === 'client') li5Apply(p);
  } catch (e) {
    console.warn('[li5] envelope', p.action, e);
  }
}

function li5Apply(p) {
  const fn = LI5_APPLIERS[p && p.action];
  if (fn) fn(p);
}

const LI5_APPLIERS = {
  LI5_MATCH(p) {
    li5V.groups = li5WireArr(p.playerTeamIdx, mpPlayerSlots.length, 0).map(x => (Number(x) === 1 ? 1 : 0));
    const names = li5WireList(p.teamNames);
    if (names.length === 2) { teamNames[0] = String(names[0]); teamNames[1] = String(names[1]); }
    const r = p.rules || {};
    if (r.timer       !== undefined) settingTimer       = Number(r.timer);
    if (r.rounds      !== undefined) settingRounds      = Number(r.rounds);
    if (r.penaltyMode !== undefined) settingPenaltyMode = r.penaltyMode;
    if (r.skipFree    !== undefined) settingSkipFree    = r.skipFree === true;
    if (r.timePenalty !== undefined) settingTimePenalty = Number(r.timePenalty);
    if (r.corrections !== undefined) settingCorrections = r.corrections === true;
    if (r.sylly       !== undefined) settingSylly       = r.sylly === true;
  },

  // Rebuilds every turn-scoped accumulator from nothing (logic-engine.md § accumulators).
  LI5_TURN(p) {
    const id = Number(p.turnId);
    if (!(id >= li5V.turnId)) return;                  // older turn (NaN-safe)
    const early = li5V.early.filter(x => Number(x.turnId) > id);
    const replay = li5V.early.filter(x => Number(x.turnId) === id);
    li5V = Object.assign(li5FreshView(), { groups: li5V.groups, early });
    li5V.turnId = id;
    li5V.turn = { round: Number(p.round) || 1, totalRounds: Number(p.totalRounds) || 1, team: Number(p.team) === 1 ? 1 : 0,
                  upSeat: Number(p.upSeat), aside: String(p.aside || '') };
    li5V.phase = 'gate';
    teamScores   = li5WireArr(p.scores, 2, 0).map(Number);
    currentTeam  = li5V.turn.team;
    currentRound = li5V.turn.round;
    totalRounds  = li5V.turn.totalRounds;
    roundLog = []; currentStreak = 0;
    li5StopClockTick();
    li5WipeWordDom();
    document.getElementById('review-overlay').style.display = 'none';
    li5RenderGate(li5V.turn.aside);
    showScreen('screen-gatekeeper');
    replay.forEach(li5Apply);
  },

  LI5_CLOCK(p) {
    if (Number(p.turnId) !== li5V.turnId) return;
    li5V.clock = { endTimestamp: Number(p.endTimestamp) || 0, paused: p.paused === true, remainingMs: Number(p.remainingMs) || 0 };
    const ph = li5V.phase;
    if (ph === 'review' || ph === 'gameover' || ph === 'timeup') return;
    li5V.phase = li5V.clock.paused ? 'timeout' : 'play';
    if (ph === 'gate' || ph === 'standby') li5ShowRoleScreen();
    li5RenderPlay();
    li5StartClockTick();
  },

  LI5_WORD(p) {
    const id = Number(p.turnId);
    if (id > li5V.turnId) { li5V.early.push(p); return; }   // a private packet that beat its LI5_TURN
    if (id !== li5V.turnId) return;
    const cardNo = Number(p.cardNo);
    const cur = li5V.card ? li5V.card.cardNo : -1;
    if (cardNo < cur || cardNo <= li5V.marked) return;  // highest cardNo wins; never one already marked here
    li5V.card = li5WireCard(p, cardNo);
    if (li5MyRole() === 'up') li5V.next = p.next ? li5WireCard(p.next, cardNo + 1) : null;
    li5RenderPlay();
  },

  LI5_CARD(p) {
    if (Number(p.turnId) !== li5V.turnId) return;
    const cardNo = Number(p.cardNo);
    if (cardNo <= li5V.lastResolved) return;            // a re-delivery adds nothing
    li5V.lastResolved = cardNo;
    const l = p.last;                                   // absent → null (Firebase empties, § 5.9)
    if (l && typeof l === 'object') {
      li5V.feed.push({ cardNo, action: String(l.action || 'skip'), word: l.word == null ? null : String(l.word),
                       isSylly: l.isSylly === true, points: Number(l.points) || 0 });
    }
    teamScores    = li5WireArr(p.scores, 2, 0).map(Number);
    li5V.streak   = Number(p.streak) || 0;
    currentStreak = li5V.streak;
    li5RenderPlay();
  },

  LI5_DOBS(p) {
    const id = Number(p.turnId);
    if (id > li5V.turnId) { li5V.early.push(p); return; }
    if (id !== li5V.turnId) return;
    li5V.dobs = { cardNo: Number(p.cardNo), counts: li5WireArr(p.counts, li5WireLen(p.counts), 0).map(Number) };
    li5RenderPlay();
  },

  LI5_TIME_UP(p) {
    if (Number(p.turnId) !== li5V.turnId) return;
    if (li5V.phase !== 'play' && li5V.phase !== 'timeout') return;
    li5V.phase = 'timeup';
    li5RenderPlay();
  },

  LI5_REVIEW(p) {
    if (Number(p.turnId) !== li5V.turnId) return;
    li5V.phase    = 'review';
    li5V.reviewUp = Number(p.upSeat);
    roundLog      = li5WireList(p.log).map(li5WireEntry);
    teamScores    = li5WireArr(p.scores, 2, 0).map(Number);
    currentTeam   = Number(p.team) === 1 ? 1 : 0;
    li5StopClockTick();
    li5ShowReview();
  },

  LI5_GAMEOVER(p) {
    li5V.phase     = 'gameover';
    teamScores     = li5WireArr(p.scores, 2, 0).map(Number);
    matchLog       = li5WireList(p.matchLog).map(t => ({ round: Number(t.round) || 1, team: Number(t.team) === 1 ? 1 : 0,
                       teamName: String(t.teamName || ''), entries: li5WireList(t.entries).map(li5WireEntry) }));
    wordsExhausted = p.wordsExhausted === true;
    li5StopClockTick();
    document.getElementById('review-overlay').style.display = 'none';
    showGameOver();
  },

  // A rejoin: the whole picture, idempotent — applying it twice shows the same thing.
  LI5_STATE(p) {
    li5V = li5FreshView();
    LI5_APPLIERS.LI5_MATCH(p.match || {});
    if (!p.turn) { li5RenderGate(''); showScreen('screen-gatekeeper'); return; }
    LI5_APPLIERS.LI5_TURN(p.turn);
    const id = li5V.turnId, ph = p.phase;
    if (ph === 'play' || ph === 'timeout' || ph === 'timeup') {
      li5V.feed = li5WireList(p.feed).map(f => ({ cardNo: Number(f.cardNo) || 0, action: String(f.action || 'skip'),
        word: f.word == null ? null : String(f.word), isSylly: f.isSylly === true, points: Number(f.points) || 0 }));
      li5V.lastResolved = li5V.feed.reduce((m, f) => Math.max(m, f.cardNo), -1);
      teamScores    = li5WireArr(p.scores, 2, 0).map(Number);
      li5V.streak   = Number(p.streak) || 0;
      currentStreak = li5V.streak;
      if (p.word) LI5_APPLIERS.LI5_WORD(Object.assign({}, p.word, { turnId: id }));
      if (p.dobs) LI5_APPLIERS.LI5_DOBS(Object.assign({}, p.dobs, { turnId: id }));
      if (p.clock) LI5_APPLIERS.LI5_CLOCK(Object.assign({}, p.clock, { turnId: id }));
      if (ph === 'timeup') LI5_APPLIERS.LI5_TIME_UP({ turnId: id });
    } else if (ph === 'review' && p.review) {
      LI5_APPLIERS.LI5_REVIEW(Object.assign({}, p.review, { turnId: id }));
    } else if (ph === 'gameover' && p.gameover) {
      LI5_APPLIERS.LI5_GAMEOVER(p.gameover);
    }
  },
};

// ── Lobby Mode screens (plain in S1 — S3–S6 dress them) ──────────────────────
const LI5_ROLE_SCREEN = { up: 'screen-active-play', tattle: 'screen-li5-tattle', guess: 'screen-li5-guess' };

function li5ShowRoleScreen() {
  const id = LI5_ROLE_SCREEN[li5MyRole()];
  if (id) showScreen(id);
}

// Leaving a turn: no word survives on a hidden screen for a device that guesses next.
function li5WipeWordDom() {
  const $ = id => document.getElementById(id);
  ['active-word', 'word-category-label', 'li5-tattle-word', 'li5-note-text'].forEach(id => { $(id).textContent = ''; });
  ['active-taboo-list', 'li5-tattle-list', 'li5-guess-feed'].forEach(id => { $(id).innerHTML = ''; });
  $('li5-note').style.display = 'none';
  currentWordData = null;
}

function li5DimControls(on) {
  ['btn-correct', 'btn-taboo', 'btn-skip'].forEach(id => {
    const b = document.getElementById(id);
    b.classList.toggle('opacity-50', !!on);
  });
}

function li5ClockSecs() {
  const c = li5V.clock;
  if (!c) return settingTimer;
  const ms = c.paused ? c.remainingMs : c.endTimestamp - Date.now();
  return Math.max(0, Math.ceil(ms / 1000));
}

function li5ScoresLine() {
  return `${teamNames[0]} ${teamScores[0]} · ${teamNames[1]} ${teamScores[1]}`;
}

function li5RenderClock() {
  const ph = li5V.phase;
  if (ph !== 'play' && ph !== 'timeout' && ph !== 'timeup') return;
  const secs = li5ClockSecs();
  const txt  = ph === 'timeup' ? 'Time!' : formatTime(secs);
  ['timer-display', 'li5-tattle-clock', 'li5-guess-clock'].forEach(id => {
    const el = document.getElementById(id);
    el.textContent = txt;
    el.classList.toggle('timer-warning', ph === 'play' && secs <= 10);
  });
  if (li5MyRole() === 'tattle') li5RenderTattleStatus();
}

function li5StartClockTick() {
  if (!li5ClockTick) li5ClockTick = setInterval(li5RenderClock, 1000);
  li5RenderClock();
}
function li5StopClockTick() {
  if (li5ClockTick) { clearInterval(li5ClockTick); li5ClockTick = null; }
}

function li5RenderPlay() {
  const ph = li5V.phase;
  if (ph !== 'play' && ph !== 'timeout' && ph !== 'timeup') return;
  const role = li5MyRole();
  if (role === 'up') li5RenderDescriber();
  else if (role === 'tattle') li5RenderTattle();
  else if (role === 'guess') li5RenderGuess();
  li5RenderClock();
}

function li5RenderDescriber() {
  const $ = id => document.getElementById(id);
  const ph = li5V.phase, c = li5V.card;
  $('active-team-label').textContent = teamNames[currentTeam];
  $('score-display').textContent     = teamScores[currentTeam];
  $('pause-overlay').style.display   = ph === 'timeout' ? 'flex' : 'none';
  $('active-content').style.display  = ph === 'timeout' ? 'none' : 'flex';
  $('li5-timeup').textContent        = ph === 'timeup' ? 'Time!' : '';
  $('li5-timeup').style.display      = ph === 'timeup' ? '' : 'none';
  li5DimControls(ph === 'timeup');
  if (c) {
    if (li5V.renderedCard !== c.cardNo) {
      li5V.renderedCard  = c.cardNo;
      currentWordData    = { word: c.word, category: c.category, nono_list: c.nonoList };
      currentWordIsSylly = c.isSylly;
      renderCurrentWord();
    }
  } else {                                            // waiting-word: the clock beat the first LI5_WORD
    li5V.renderedCard = -1;
    $('active-word').textContent = '…';
    $('word-category-label').textContent = '';
    $('active-taboo-list').innerHTML = '';
  }
  li5RenderNote();
}

// A dob arrives as a note: the most-dobbed slot, in the passed-note voice (§ 2.10).
function li5RenderNote() {
  const $ = id => document.getElementById(id);
  const c = li5V.card, d = li5V.dobs;
  let slot = -1;
  if (c && d && d.cardNo === c.cardNo && li5V.phase !== 'timeup') {
    d.counts.forEach((n, i) => { if (n > 0 && (slot < 0 || n > d.counts[slot])) slot = i; });
  }
  li5V.noteSlot = slot;
  if (slot < 0) { $('li5-note').style.display = 'none'; $('li5-note-text').textContent = ''; return; }
  const said = slot >= c.nonoList.length ? c.word : c.nonoList[slot];
  const n = d.counts[slot];
  $('li5-note-text').textContent = n === 1 ? `Psst — you said "${said}"` : `${n} tattletales say you said "${said}"`;
  $('li5-note').style.display = '';
}

function li5RenderTattle() {
  const $ = id => document.getElementById(id);
  const ph = li5V.phase, c = li5V.card, t = li5V.turn;
  $('li5-tattle-scores').textContent = li5ScoresLine();
  $('li5-tattle-up').textContent     = t ? `${li5SeatName(t.upSeat)} is up the front` : '';
  const live = ph === 'play' && c;
  $('li5-tattle-word').textContent   = ph === 'timeout' ? '' : (c ? c.word : '…');
  const counts = (li5V.dobs && c && li5V.dobs.cardNo === c.cardNo) ? li5V.dobs.counts : [];
  $('li5-tattle-list').innerHTML = (live || ph === 'timeup') && c
    ? c.nonoList.map((w, i) => `<li><button type="button" data-li5-dob="${i}" class="min-h-12 w-full bg-white rounded-xl px-3 py-2 text-stone-800 font-semibold text-base shadow-sm${ph === 'play' ? '' : ' opacity-50'}">${li5Esc(w)}${counts[i] ? ` <span class="text-pink-500">· ${counts[i]} dobbed</span>` : ''}</button></li>`).join('')
    : '';
  $('btn-li5-dob-word').style.display = live ? '' : 'none';
  li5RenderTattleStatus();
}

function li5RenderTattleStatus() {
  const ph = li5V.phase;
  const left = Math.ceil((li5V.coolUntil - Date.now()) / 1000);
  const name = li5V.turn ? li5SeatName(li5V.turn.upSeat) : '';
  document.getElementById('li5-tattle-status').textContent =
      ph === 'timeup'  ? 'Time!'
    : ph === 'timeout' ? 'Time Out'
    : left > 0         ? `Note passed to ${name}. Dob again in ${left} s`
    :                    '';
}

function li5RenderGuess() {
  const $ = id => document.getElementById(id);
  const ph = li5V.phase, t = li5V.turn;
  $('li5-guess-scores').textContent = li5ScoresLine();
  $('li5-guess-up').textContent     = t ? `${li5SeatName(t.upSeat)} is up the front. Shout it out!` : '';
  $('li5-guess-streak').textContent = li5V.streak >= 2 ? `${li5V.streak} in a row!` : '';
  $('li5-guess-feed').innerHTML = li5V.feed.map(f => (f.action === 'correct' && f.word)
    ? `<li class="bg-yellow-100 text-stone-800 font-semibold rounded-lg px-3 py-2">${li5Esc(f.word)}${f.points > 1 ? ` +${f.points}` : ''}</li>`
    : `<li class="bg-stone-100 text-stone-400 rounded-lg px-3 py-2">${f.action === 'skip' ? 'Skipped' : 'Dobbed'}${f.points < 0 ? ` ${f.points}` : ''}</li>`).join('');
  $('li5-guess-status').textContent = ph === 'timeup' ? 'Time!' : ph === 'timeout' ? 'Time Out' : '';
}

// The Report Card — on every device; only the describer and the host can change it.
function li5ShowReview() {
  const $ = id => document.getElementById(id);
  const can = li5CanControlReview();
  renderReviewHeader();
  renderReviewList();
  $('btn-review-next').style.display = can ? '' : 'none';
  $('li5-review-wait').textContent   = can ? '' : `Waiting for ${li5SeatName(li5V.reviewUp)}…`;
  $('li5-review-wait').style.display = can ? 'none' : '';
  $('review-overlay').style.display  = 'flex';
}

// ── Lobby Mode taps ──────────────────────────────────────────────────────────
function li5DescriberMark(mark) {
  if (li5MyRole() !== 'up' || (li5V.phase !== 'play' && li5V.phase !== 'timeup')) return;
  const c = li5V.card;
  if (!c || li5V.marked >= c.cardNo) return;          // one mark per card from this device
  li5V.marked = c.cardNo;
  // A client's next word is already here (LI5_WORD.next) — show it now; the host confirms.
  // BEFORE the send: the host's LI5_WORD for the new card may land before li5Act returns,
  // and an advance after it would overwrite that card with this (older) guess.
  if (window.syllyMultiplayerMode === 'client' && li5V.phase === 'play') {
    li5V.card = li5V.next ? Object.assign({}, li5V.next, { cardNo: c.cardNo + 1 }) : null;
    li5V.next = null;
    li5V.dobs = null;
    li5RenderPlay();
  }
  li5Act('LI5_MARK', { cardNo: c.cardNo, mark });
}

function li5Dob(slot) {
  if (li5MyRole() !== 'tattle' || li5V.phase !== 'play' || !li5V.card) return;
  const now = Date.now();
  if (now < li5V.coolUntil) return;                   // the local mirror of the host's cooldown
  li5V.coolUntil = now + LI5_DOB_COOLDOWN_MS;
  playBoing();
  li5Act('LI5_DOB', { cardNo: li5V.card.cardNo, slot });
  li5RenderTattle();
}

// ── Event listeners ───────────────────────────────────────────────────────────
document.getElementById('btn-dstw')
  .addEventListener('click', () => { activeGameId = 'li5'; playLaunch(); showScreen('screen-menu'); });

document.getElementById('btn-back-to-lobby')
  .addEventListener('click', () => { playExit(); resetToLobby(); });

document.getElementById('btn-play')
  .addEventListener('click', () => {
    playLaunch();
    const t1 = document.getElementById('input-team1');
    const t2 = document.getElementById('input-team2');
    if (isSecretMode) {
      const names = window.activeExpansionOverrides?.teamNames;
      if (names) { t1.value = names[0]; t2.value = names[1]; t1.disabled = true; t2.disabled = true; }
    } else {
      t1.disabled = false;
      t2.disabled = false;
    }
    mpShowModeScreen('li5');
  });

document.getElementById('btn-how-to')
  .addEventListener('click', () => {
    playPillClick();
    const el = document.getElementById('li5-how-to-overlay');
    const inner = el.querySelector('.overlay-data-inner');
    if (inner) inner.scrollTop = 0;
    el.style.display = 'flex';
  });

document.getElementById('btn-li5-how-to-close')
  .addEventListener('click', () => {
    document.getElementById('li5-how-to-overlay').style.display = 'none';
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
  btn.className   = settingPlayAllDecks ? 'game-toggle-on-pink shrink-0' : 'sylly-toggle-off shrink-0';
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
  toggle.className   = settingSylly ? 'game-toggle-on-pink shrink-0' : 'sylly-toggle-off shrink-0';
  document.getElementById('sylly-pct-row').style.display = settingSylly ? 'block' : 'none';
});

document.getElementById('sylly-intensity').addEventListener('input', e => {
  settingSyllyPct = parseInt(e.target.value);
  document.getElementById('sylly-intensity-label').textContent = `${settingSyllyPct}% extra credit words`;
  playSliderTick(settingSyllyPct);
});

document.getElementById('btn-start-game')
  .addEventListener('click', () => { playLaunch(); startGame(); });

// Ready, Miss! — PTP starts the turn here; Lobby Mode asks the host (LI5_READY).
document.getElementById('btn-start-turn')
  .addEventListener('click', () => {
    playLaunch();
    if (window.syllyMultiplayerMode === 'single') { showActivePlay(); return; }
    if (li5MyRole() === 'up' && li5V.phase === 'gate') li5Act('LI5_READY');
  });

// Time Out / Keep going — Lobby Mode: the describer's, through the host's clock.
document.getElementById('btn-pause')
  .addEventListener('click', () => {
    playPillClick();
    if (window.syllyMultiplayerMode === 'single') { togglePause(); return; }
    if (li5MyRole() === 'up' && li5V.phase === 'play') li5Act('LI5_TIMEOUT', { paused: true });
  });

document.getElementById('btn-resume')
  .addEventListener('click', () => {
    playResume();
    if (window.syllyMultiplayerMode === 'single') { togglePause(); return; }
    if (li5MyRole() === 'up' && li5V.phase === 'timeout') li5Act('LI5_TIMEOUT', { paused: false });
  });

// End my turn — inside the Time Out view (already a deliberate second tap; departure D6).
document.getElementById('btn-li5-end-my-turn')
  .addEventListener('click', () => {
    playWhoosh();
    if (window.syllyMultiplayerMode === 'single') {
      isPaused = false;
      document.getElementById('pause-overlay').style.display  = 'none';
      document.getElementById('active-content').style.display = 'flex';
      endTurn();
      return;
    }
    if (li5MyRole() === 'up') li5Act('LI5_END_TURN');
  });

// Yay / Nay / Skip — 300 ms debounce in every mode; Lobby Mode marks through the host.
function li5Debounced() {
  if (isProcessing) return true;
  isProcessing = true; setTimeout(() => { isProcessing = false; }, 300); // debounce: blocks double-tap within 300ms
  return false;
}

document.getElementById('btn-correct').addEventListener('click', () => {
  if (li5Debounced()) return;
  playSuccess(); flashBackground('green');
  if (window.syllyMultiplayerMode !== 'single') { li5DescriberMark('correct'); return; }
  applyAndAdvance('correct');
});

document.getElementById('btn-taboo').addEventListener('click', () => {
  if (li5Debounced()) return;
  playBoing(); flashBackground('red'); navigator.vibrate?.(40);
  if (window.syllyMultiplayerMode !== 'single') { li5DescriberMark('taboo'); return; }
  showPenaltyPhrase(); applyAndAdvance('taboo');
});

document.getElementById('btn-skip').addEventListener('click', () => {
  if (li5Debounced()) return;
  if (!settingSkipFree) { playBoing(); navigator.vibrate?.(40); } else { playWhoosh(); }
  if (window.syllyMultiplayerMode !== 'single') { li5DescriberMark('skip'); return; }
  applyAndAdvance('skip');
});

// A dob note on the describer's board: I said it = a Nay; I didn't = wave it off.
document.getElementById('btn-li5-said-it').addEventListener('click', () => {
  if (li5Debounced()) return;
  playBoing();
  li5DescriberMark('taboo');
});
document.getElementById('btn-li5-didnt').addEventListener('click', () => {
  playPillClick();
  if (li5MyRole() !== 'up' || !li5V.card || li5V.noteSlot < 0) return;
  li5Act('LI5_WAVE', { cardNo: li5V.card.cardNo, slot: li5V.noteSlot });
});

// Tattletales: a No-No row, or the word itself (the last slot).
document.getElementById('li5-tattle-list').addEventListener('click', e => {
  const b = e.target && e.target.closest ? e.target.closest('[data-li5-dob]') : null;
  if (b) li5Dob(Number(b.dataset.li5Dob));
});
document.getElementById('btn-li5-dob-word').addEventListener('click', () => {
  if (li5V.card) li5Dob(li5V.card.nonoList.length);
});

// The role screens' ✕ — the same quit overlay (Mid-Game Quit Contract on confirm).
['btn-li5-tattle-quit', 'btn-li5-guess-quit'].forEach(id => {
  document.getElementById(id).addEventListener('click', () => { playPillClick(); showQuitConfirm(); });
});

document.getElementById('btn-stop')
  .addEventListener('click', () => { playPillClick(); showQuitConfirm(); });

document.getElementById('btn-quit-confirm')
  .addEventListener('click', () => {
    playExit();
    // Mid-Game Quit Contract (logic-engine.md): in a lobby session, leaving must dissolve the
    // session for every other device — resetToMenu() only tears this one down.
    if (window.syllyMultiplayerMode !== 'single') { mpNotifyPlayerLeft(); resetToLobby(); return; }
    resetToMenu();
  });

document.getElementById('btn-quit-cancel')
  .addEventListener('click', () => { playResume(); hideQuitConfirm(); });

document.getElementById('btn-end-turn')
  .addEventListener('click', () => { playPillClick(); showSkipTurnConfirm(); });

document.getElementById('btn-skip-turn-confirm').addEventListener('click', () => {
  playWhoosh();
  document.getElementById('skip-turn-overlay').style.display = 'none';
  if (window.syllyMultiplayerMode !== 'single') { if (li5MyRole() === 'up') li5Act('LI5_END_TURN'); return; }
  endTurn();
});

document.getElementById('btn-skip-turn-cancel')
  .addEventListener('click', () => { playResume(); hideSkipTurnConfirm(); });

document.getElementById('btn-review-next').addEventListener('click', () => {
  playLaunch();
  if (window.syllyMultiplayerMode !== 'single') {       // the host closes the turn (LI5_NEXT)
    if (li5CanControlReview() && li5V.phase === 'review') li5Act('LI5_NEXT');
    return;
  }
  matchLog.push({ round: currentRound, team: currentTeam, teamName: teamNames[currentTeam], entries: [...roundLog] });
  document.getElementById('review-overlay').style.display = 'none';
  if (reviewCallback) { reviewCallback(); reviewCallback = null; }
});

document.getElementById('corrections-toggle').addEventListener('click', () => {
  settingCorrections = !settingCorrections;
  document.getElementById('corrections-toggle').textContent = settingCorrections ? 'ON' : 'OFF';
  document.getElementById('corrections-toggle').className   = settingCorrections ? 'game-toggle-on-pink shrink-0' : 'sylly-toggle-off shrink-0';
  playPillClick();
});

document.getElementById('gameover-card-team1').addEventListener('click', () => showMatchHistory(0));
document.getElementById('gameover-card-team2').addEventListener('click', () => showMatchHistory(1));

document.getElementById('btn-history-close').addEventListener('click', () => {
  document.getElementById('history-overlay').style.display = 'none';
});

document.getElementById('btn-play-again').addEventListener('click', () => {
  playPillClick();
  const confirmBtn = document.getElementById('btn-li5-confirm-new-game');
  if (window.syllyMultiplayerMode === 'host') {
    confirmBtn.textContent = 'Restart in Lobby';
  } else if (window.syllyMultiplayerMode === 'client') {
    confirmBtn.textContent = 'Leave Session';
  } else {
    confirmBtn.textContent = 'New Playgroup!';
  }
  document.getElementById('li5-play-again-overlay').style.display = 'flex';
});

document.getElementById('btn-li5-confirm-new-game').addEventListener('click', () => {
  playLaunch();
  document.getElementById('li5-play-again-overlay').style.display = 'none';
  if (window.syllyMultiplayerMode !== 'single') {
    mpReturnToLobby();
    return;
  }
  stopTimer();
  teamScores = [0, 0];
  wordsExhausted = false;
  matchLog = [];
  currentRound = 1;
  showScreen('screen-setup');
});

document.getElementById('btn-li5-cancel-new-game').addEventListener('click', () => {
  playExit();
  document.getElementById('li5-play-again-overlay').style.display = 'none';
});

// ── [?] Help buttons ──────────────────────────────────────────────────────────
document.querySelectorAll('.btn-li5-help-open').forEach(btn => {
  btn.addEventListener('click', () => {
    playDone();
    const el = document.getElementById('li5-how-to-overlay');
    const inner = el.querySelector('.overlay-data-inner');
    if (inner) inner.scrollTop = 0;
    el.style.display = 'flex';
  });
});
document.getElementById('btn-li5-how-to')?.addEventListener('click', () => {
  playDone();
  const el = document.getElementById('li5-how-to-overlay');
  const inner = el.querySelector('.overlay-data-inner');
  if (inner) inner.scrollTop = 0;
  el.style.display = 'flex';
});
document.getElementById('btn-li5-help-tip-close')?.addEventListener('click', () => {
  playDone();
  document.getElementById('li5-help-tip-overlay').style.display = 'none';
});

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
