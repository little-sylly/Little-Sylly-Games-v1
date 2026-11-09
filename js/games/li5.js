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

// Classmates' voices (pilot spec § 3 — owner-approved copy, ≤3 words, no emoji). Cosmetic and local:
// each device picks its own line off the Yay/Nay it already has, so there is no packet.
const LI5_VOICES = {
  yay:  ['Gold star!', 'Clever clogs!', 'Top of the class!', 'A-plus!', "Teacher's pet!", 'Smarty pants!'],
  roll: ['On a roll!', 'Show-off!', 'Unstoppable!'],
  nay:  ['Busted!', 'Ooooh!', 'Caught out!'],
};
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
// Called from li5RenderDescriber only. The look itself lives in css/li5.css (.li5-sylly).
function applySyllyVisuals(on) {
  const nay  = document.getElementById('btn-taboo');
  const skip = document.getElementById('btn-skip');
  document.getElementById('li5-desc-board').classList.toggle('li5-sylly', on);
  document.getElementById('btn-correct').textContent = on ? 'Double Yay!' : 'Yay!';
  nay.textContent  = on ? 'Double Nay!' : 'Nay!';
  skip.textContent = 'Skip!';
  nay.classList.toggle('shake', on);
  skip.classList.toggle('shake', on);
  document.getElementById('sylly-scoring-hint').style.display = on ? '' : 'none';
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
  el.className = currentWordIsSylly ? 'li5-nono li5-nono-2' : 'li5-nono li5-nono-1';   // 5 → one column, Extra Credit's 10 → two
  el.innerHTML = words.map((t, i) => `<li data-word="${t}" data-slot="${i}">${t}</li>`).join('');
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
// Copy: pilot spec § 4.3 (signed off). Content lands in its FINAL state synchronously; the
// wipe-and-write (li5GateWrite) is a cosmetic pass over it, so a harness never sees it half-built.
function li5RenderGate(aside) {
  const $  = id => document.getElementById(id);
  const mp = window.syllyMultiplayerMode !== 'single';
  const t  = mp ? li5V.turn : null;
  const role = mp ? li5MyRole() : 'up';
  const tlm  = window.mpLobbyStyle === 'team';
  const team = t ? t.team : currentTeam;
  const name = t ? li5SeatName(t.upSeat) : '';
  const standby = mp && !t;
  $('gatekeeper-round-label').textContent = standby ? '' : `Round ${currentRound} of ${totalRounds} · ${teamNames[team]}`;
  [0, 1].forEach(i => {
    const n = i + 1;
    $('gatekeeper-name-team' + n).textContent = teamNames[i];
    $('gatekeeper-pts-team' + n).textContent  = teamScores[i];
    $('gatekeeper-tally-team' + n).innerHTML  = li5TallySvg(teamScores[i]);
    $('gatekeeper-score-team' + n).classList.toggle('li5-gate-active', !standby && team === i);
  });
  let head = '', line = '', wait = '';
  if (standby) {                                      // before the first LI5_TURN
    head = 'Settle down, please.';
  } else if (!mp || tlm) {                            // PTP, and the TLM device that is up
    const pass = !mp || role === 'up';
    head = pass ? `Pass it to ${teamNames[team]}.` : `${teamNames[team]} is up.`;
    line = pass ? "Whoever's up the front takes the phone. Everyone else, eyes off the screen."
                : 'Listen for No-No words. Hear one? Dob.';
    wait = pass ? '' : `Waiting for ${teamNames[team]}…`;
  } else {
    head = `${name}, up the front.`;
    line = role === 'up'    ? "Explain it like they're five. Don't say the No-No words."
         : role === 'guess' ? `Shout it out. ${name} can't show you the word.`
         :                    'Listen for No-No words. Hear one? Dob.';
    wait = role === 'up' ? '' : `Waiting for ${name}…`;
  }
  $('gatekeeper-team-name').textContent   = head;
  $('gatekeeper-hype').textContent        = standby ? '' : (aside || '');
  $('li5-gate-aside').style.display = (!standby && aside) ? '' : 'none';
  $('li5-gate-role').textContent          = line;
  $('li5-gate-role').style.display        = line ? '' : 'none';
  $('li5-gate-wait').textContent          = wait;
  $('li5-gate-wait').style.display        = wait ? '' : 'none';
  $('btn-start-turn').style.display       = (!mp || (t && role === 'up')) ? '' : 'none';
  li5GateWrite();
}

// Wipe and write: a duster pass over the board's text, then Miss chalks the headline and the role
// line. Cosmetic only — reduced motion (or no WAAPI) leaves the final state untouched. A newer
// render cancels this one and restores the lines.
let li5GateAnim = null, li5GateTok = 0;
function li5GateWrite() {
  const my = ++li5GateTok;
  if (li5GateAnim) { try { li5GateAnim.cancel(); } catch (_) {} li5GateAnim = null; }
  const box = document.getElementById('li5-gate-text');
  const els = ['gatekeeper-team-name', 'li5-gate-role'].map(id => document.getElementById(id));
  els.forEach(el => { el.style.opacity = ''; });
  let reduced = false;
  try { reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (_) {}
  if (reduced || typeof Li5Scene === 'undefined' || !box || typeof box.animate !== 'function') return;
  const texts = els.map(el => el.textContent);
  els.forEach(el => { el.style.opacity = '0'; });
  const dummy = document.createElement('span');          // the duster needs something to rub out
  dummy.setAttribute('aria-hidden', 'true');
  box.appendChild(dummy);
  const wipe = li5Duster(dummy, { duration: 450 });
  li5GateAnim = wipe;
  wipe.finished.then(() => {
    if (my !== li5GateTok) return;
    els.forEach((el, i) => {
      el.style.opacity = '';
      if (!texts[i]) return;
      li5GateAnim = li5Chalk(el, texts[i], {});
    });
    const hd = els[0].getBoundingClientRect(), bx = box.getBoundingClientRect();
    li5Dust(box, Math.min(bx.width - 24, 24 + Math.min(hd.width, 200)), Math.max(8, hd.bottom - bx.top), {});
  });
  if (dummy.parentNode) wipe.finished.then(() => { if (dummy.parentNode) dummy.parentNode.removeChild(dummy); });
}

// ── Screen: ACTIVE PLAY — the describer's board (pilot S4) ────────────────────
function showActivePlay() {
  roundLog        = [];
  currentStreak   = 0;
  scoreBeforeTurn = teamScores[currentTeam];
  isPaused = false;
  li5DescReset();
  timeLeft = settingTimer;
  const timerEl = document.getElementById('timer-display');
  timerEl.classList.remove('timer-warning');
  timerEl.textContent = formatTime(timeLeft);
  li5RenderDescriber();
  startTimer();
  showScreen('screen-active-play');
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
  }

  if (action === 'correct') currentStreak++; else currentStreak = 0;
  li5VoiceFor(action, currentStreak);

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
      li5RenderDescriber();
    }, 150);
  }
  li5PaintDescTallies();   // the tallies move now; the new word follows the exit above
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

// ── Round Review — the Report Card (LI5 pilot S6) ─────────────────────────────
// Chalk glyphs, not emoji: a tick, a cross, a skip arrow. ︎ pins the text presentation.
const REVIEW_MARKS = {
  correct: ['li5-mark-ok',   '✓︎', 'Yay'],
  taboo:   ['li5-mark-no',   '✗︎', 'Nay'],
  skip:    ['li5-mark-skip', '»',       'Skip'],
};
function li5EscHtml(t) {
  return String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function li5PtsLabel(p) { return p > 0 ? '+' + p : String(p); }

function renderReviewHeader() {
  document.getElementById('review-team-label').textContent = teamNames[currentTeam];
  const turnPts = roundLog.reduce((sum, e) => sum + e.points, 0);
  const deltaEl = document.getElementById('review-score-delta');
  deltaEl.textContent = turnPts > 0 ? `+${turnPts} this turn` : turnPts < 0 ? `${turnPts} this turn` : 'Nothing on the board';
  deltaEl.className   = 'li5-sheet-delta ' + (turnPts > 0 ? 'li5-delta-pos' : turnPts < 0 ? 'li5-delta-neg' : 'li5-delta-zero');

  let maxStreak = 0, cur = 0;
  roundLog.forEach(e => { cur = e.action === 'correct' ? cur + 1 : 0; maxStreak = Math.max(maxStreak, cur); });
  const streakEl = document.getElementById('review-streak');
  streakEl.textContent   = maxStreak >= 3 ? `${maxStreak} in a row!` : 'Hot streak!';
  streakEl.style.display = maxStreak >= 3 ? 'block' : 'none';
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
    list.innerHTML = '<li class="li5-sheet-empty">No words played this turn.</li>';
    return;
  }

  list.innerHTML = roundLog.map((e, i) => {
    const m       = REVIEW_MARKS[e.action] || REVIEW_MARKS.skip;
    const ptClass = e.points > 0 ? 'li5-delta-pos' : e.points < 0 ? 'li5-delta-neg' : 'li5-delta-zero';
    const sylly   = e.isSylly ? ' <span class="li5-xc" title="Extra Credit">✦</span>' : '';
    const star    = e.word === starWord ? ' <span class="li5-best" title="Best word">★︎</span>' : '';
    const edited  = e.action !== e.originalAction ? '<span class="li5-edited">changed</span>' : '';
    const inner   = `<span class="li5-sheet-word"><span class="li5-mark ${m[0]}" aria-label="${m[2]}">${m[1]}</span><span>${li5EscHtml(e.word)}</span>${sylly}${star}</span>
      <span class="li5-sheet-pts ${ptClass}">${edited}${li5PtsLabel(e.points)}</span>`;
    const ringClass = (editable && e.action !== e.originalAction) ? ' row-edited' : '';
    return editable
      ? `<li><button onclick="flipEntry(${i})" class="li5-sheet-row li5-sheet-flip${ringClass}">${inner}</button></li>`
      : `<li class="li5-sheet-row">${inner}</li>`;
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
  li5PaintDescTallies();
  renderReviewList();
  renderReviewHeader();
}

// ── Match History — lined paper, one sheet per group ──────────────────────────
function showMatchHistory(teamIdx) {
  const isWinner  = teamScores[teamIdx] > teamScores[1 - teamIdx];
  const titleEl   = document.getElementById('history-title');
  titleEl.textContent = teamNames[teamIdx];
  titleEl.classList.toggle('li5-paper-winner', isWinner);

  const turns = matchLog.filter(t => t.team === teamIdx);
  const body  = document.getElementById('history-body');

  if (turns.length === 0) {
    body.innerHTML = '<p class="li5-paper-empty">No turns played.</p>';
  } else {
    body.innerHTML = turns.map(t => {
      const rows = t.entries.length
        ? t.entries.map(e => {
            const m       = REVIEW_MARKS[e.action] || REVIEW_MARKS.skip;
            const ptClass = e.points > 0 ? 'li5-delta-pos' : e.points < 0 ? 'li5-delta-neg' : 'li5-delta-zero';
            const sylly   = e.isSylly ? ' <span class="li5-xc">✦</span>' : '';
            return `<li class="li5-paper-row">
              <span class="li5-sheet-word"><span class="li5-mark ${m[0]}" aria-label="${m[2]}">${m[1]}</span><span>${li5EscHtml(e.word)}</span>${sylly}</span>
              <span class="li5-sheet-pts ${ptClass}">${li5PtsLabel(e.points)}</span>
            </li>`;
          }).join('')
        : '<li class="li5-paper-empty">No words played.</li>';
      return `<div>
        <p class="li5-paper-round">Round ${t.round}</p>
        <ul class="li5-paper-list">${rows}</ul>
      </div>`;
    }).join('');
  }

  document.getElementById('history-overlay').style.display = 'flex';
}

// ── Screen: GAME OVER — Class Dismissed (LI5 pilot S6) ────────────────────────
// One render fn owns every element; the final state is written synchronously and the chalk /
// star-slap passes are cosmetic (reduced motion = nothing to wait for).
function showGameOver() {
  const $ = id => document.getElementById(id);
  const [s0, s1] = teamScores;
  const tie = s0 === s1;
  const win = s0 > s1 ? 0 : 1;

  $('gameover-name-team1').textContent = teamNames[0];
  $('gameover-pts-team1').textContent  = s0;
  $('gameover-name-team2').textContent = teamNames[1];
  $('gameover-pts-team2').textContent  = s1;
  $('li5-go-tally-0').innerHTML = li5TallySvg(s0);
  $('li5-go-tally-1').innerHTML = li5TallySvg(s1);
  [0, 1].forEach(i => {
    $('li5-go-star-' + i).style.display = (tie || win === i) ? '' : 'none';
    $('li5-go-row-' + i).classList.toggle('li5-go-win', tie || win === i);
  });
  $('li5-go-board').dataset.result = wordsExhausted ? 'exhausted' : tie ? 'tie' : 'win';
  $('li5-go-title').textContent    = 'Class Dismissed!';
  $('gameover-result').textContent = tie ? "It's a draw!" : `${teamNames[win]} wins!`;

  const earlyEnd = $('gameover-early-end');
  earlyEnd.textContent   = wordsExhausted ? 'You used every word in the box!' : '';
  earlyEnd.style.display = wordsExhausted ? 'block' : 'none';

  showScreen('screen-gameover');

  if (li5ReducedMotion() || typeof li5Chalk !== 'function') return;
  li5Chalk($('li5-go-title'), 'Class Dismissed!', {});
  [0, 1].forEach(i => {
    const st = $('li5-go-star-' + i);
    if (st.style.display === 'none' || typeof st.animate !== 'function') return;
    st.animate([
      { opacity: 0, transform: 'scale(1.8) rotate(-30deg)' },
      { opacity: 1, transform: 'scale(0.92) rotate(6deg)', offset: 0.7 },
      { opacity: 1, transform: 'scale(1) rotate(0deg)' }],
      { duration: 450, delay: 500, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' });
  });
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

function togglePause() {
  isPaused = !isPaused;
  isPaused ? stopTimer() : startTimer();
  li5RenderDescriber();
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
           dobs: null, feed: [], streak: 0, lastResolved: -1, marked: -1, early: [], coolUntil: 0, lastDob: null,
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
    const role = li5MyRole();                           // the describer already voiced its own tap
    if (l && role !== 'up') li5VoiceFor(String(l.action), li5V.streak, role === 'tattle' ? 'li5-tattle-board' : 'li5-guess-board');
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
  ['active-word', 'word-category-label', 'li5-tattle-word', 'li5-tattle-wordnote', 'li5-note-text'].forEach(id => { $(id).textContent = ''; });
  ['active-taboo-list', 'li5-tattle-list', 'li5-guess-feed'].forEach(id => { $(id).innerHTML = ''; });
  $('li5-note').style.display = 'none';
  $('li5-tattle-board').classList.remove('li5-sylly');
  currentWordData = null;
  li5DescReset();
}

function li5ClockSecs() {
  const c = li5V.clock;
  if (!c) return settingTimer;
  const ms = c.paused ? c.remainingMs : c.endTimestamp - Date.now();
  return Math.max(0, Math.ceil(ms / 1000));
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

// ── The describer's board (pilot S4) ─────────────────────────────────────────
// ONE render function owns every element of screen-active-play (Stack rule 4), for Pass-the-Phone
// and the Lobby Mode describer alike. Content lands in its FINAL state synchronously; the chalk
// reveal, the duster, the note wiggle and the voices are cosmetic passes over it — a newer render
// cancels them, and reduced motion (or no WAAPI) leaves the final state untouched.
let li5DescKey      = '';          // the word painted ('' = nothing yet, '~' = waiting for the first LI5_WORD)
let li5DescPhase    = '';          // the phase last painted (the Time Out wipe fires on entry)
let li5DescShown    = [-1, -1];    // scores last painted (a new tally mark draws in)
let li5DescNoteSeen = { key: '', n: 0 };   // the note on show (a new dobber wiggles it)
let li5DescAnim     = null;
let li5TabShown = [-1, -1], li5GuessShown = [-1, -1];   // scores last painted on the tattle / guess boards
let li5TabPhase = '', li5GuessPhase = '', li5GuessFeedN = 0;
let li5VoiceUp      = false, li5VoiceCorner = 0;

function li5DescReset() {
  li5DescKey = ''; li5DescPhase = ''; li5DescShown = [-1, -1]; li5DescNoteSeen = { key: '', n: 0 };
  li5TabShown = [-1, -1]; li5GuessShown = [-1, -1]; li5TabPhase = ''; li5GuessPhase = ''; li5GuessFeedN = 0;
  if (li5DescAnim) { try { li5DescAnim.cancel(); } catch (_) {} li5DescAnim = null; }
}

function li5ReducedMotion() {
  try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (_) { return false; }
}

// The tally rows on the describer / tattle / guess boards: prefix 'li5-desc' | 'li5-tt' | 'li5-gs'.
function li5PaintDescTallies(prefix, shown) {
  const $ = id => document.getElementById(id);
  prefix = prefix || 'li5-desc'; shown = shown || li5DescShown;
  [0, 1].forEach(i => {
    $(prefix + '-name-' + i).textContent = teamNames[i];
    $(prefix + '-pts-' + i).textContent  = teamScores[i];
    const marks = $(prefix + '-tally-' + i);
    marks.innerHTML = li5TallySvg(teamScores[i]);
    if (shown[i] >= 0 && teamScores[i] > shown[i] && !li5ReducedMotion()) {
      const svg = marks.firstChild, last = svg && svg.lastElementChild;
      if (last && last.classList) last.classList.add('li5-tally-new');   // the newest stroke draws in
    }
    shown[i] = teamScores[i];
    $(prefix + '-row-' + i).classList.toggle('li5-gate-active', currentTeam === i);
  });
}

// Classmates' voices: one at a time (a second is dropped, never queued), corners cycling tl → br → tr → bl.
function li5Voice(kind, host) {
  const pool = LI5_VOICES[kind];
  if (li5VoiceUp || !pool || !host || typeof host.animate !== 'function' || typeof li5VoiceBubble !== 'function') return;
  const corner = ['tl', 'br', 'tr', 'bl'][li5VoiceCorner++ % 4];
  li5VoiceUp = true;
  li5VoiceBubble(host, pool[Math.floor(Math.random() * pool.length)], corner, { reducedMotion: li5ReducedMotion() })
    .finished.then(() => { li5VoiceUp = false; });
}

// A Yay (a run of 3+ rolls every 3rd) or a taken Nay. A Skip says nothing. The describer voices its own tap;
// every other device voices the LI5_CARD it receives (S5), on its own board.
function li5VoiceFor(action, streak, hostId) {
  const kind = action === 'taboo' ? 'nay'
             : action === 'correct' ? ((streak >= 3 && streak % 3 === 0) ? 'roll' : 'yay') : null;
  if (kind) li5Voice(kind, document.getElementById(hostId || 'li5-desc-board'));
}

function li5RenderDescriber() {
  const $ = id => document.getElementById(id);
  const mp = window.syllyMultiplayerMode !== 'single';
  const ph = mp ? li5V.phase : (isPaused ? 'timeout' : 'play');
  const c  = mp ? li5V.card : null;
  const out = ph === 'timeout', up = ph === 'timeup';
  if (mp && c && li5V.renderedCard !== c.cardNo) {
    li5V.renderedCard  = c.cardNo;
    currentWordData    = { word: c.word, category: c.category, nono_list: c.nonoList };
    currentWordIsSylly = c.isSylly;
  } else if (mp && !c) {
    li5V.renderedCard = -1;
  }
  const waiting = mp && !c;                           // waiting-word: the clock beat the first LI5_WORD (§ 5.4)

  $('active-team-label').textContent = teamNames[currentTeam];
  li5PaintDescTallies();
  $('pause-overlay').style.display    = out ? 'flex' : 'none';
  $('active-content').style.display   = out ? 'none' : 'flex';
  $('li5-tray-play').style.display    = out ? 'none' : '';
  $('li5-tray-timeout').style.display = out ? '' : 'none';
  $('btn-pause').classList.toggle('li5-clock-frozen', out);
  $('li5-timeup').textContent         = up ? 'Time!' : '';
  $('li5-timeup').style.display       = up ? '' : 'none';
  $('word-category-label').style.visibility = up ? 'hidden' : '';
  ['btn-correct', 'btn-taboo', 'btn-skip'].forEach(id => $(id).classList.toggle('opacity-50', up));
  if (out) $('li5-timeout-time').textContent = formatTime(mp ? li5ClockSecs() : timeLeft);

  // The word and its No-No List: repainted only when the card changes
  const key = waiting || !currentWordData ? '~' : currentWordData.word + '|' + (currentWordIsSylly ? 1 : 0);
  if (key !== li5DescKey) {
    li5DescKey = key;
    if (key === '~') {
      $('active-word').textContent = '…';
      $('word-category-label').textContent = '';
      $('active-taboo-list').innerHTML = '';
      applySyllyVisuals(false);
    } else {
      $('active-word').textContent = currentWordData.word;
      const emoji = CATEGORY_EMOJI[currentWordData.category] ?? '';
      $('word-category-label').textContent = `${emoji} ${currentWordData.category.replace('_', ' ')}`;
      renderTabooList('active-taboo-list', currentWordData.nono_list);
      applySyllyVisuals(currentWordIsSylly);
    }
    li5DescNoteSeen = { key: '', n: 0 };               // notes clear on every new card
    li5DescReveal();
  }
  li5DescNote(ph);
  if (out && li5DescPhase !== 'timeout') li5DescTimeoutWipe();
  li5DescPhase = ph;
}

// New word (§ 4.5): the group is chalked on, 240 ms. Cosmetic; the text is already final.
function li5DescReveal() {
  if (li5DescAnim) { try { li5DescAnim.cancel(); } catch (_) {} li5DescAnim = null; }
  const g = document.getElementById('active-word-card');
  if (li5ReducedMotion() || !g || typeof g.animate !== 'function') return;
  li5DescAnim = g.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 240, easing: 'steps(6, end)' });
}

// Time Out (§ 4.5): a 300 ms duster pass, then Miss chalks the heading. Cosmetic; the view is already final.
function li5DescTimeoutWipe(boardId, headId) {
  const board = document.getElementById(boardId || 'li5-desc-board'), head = document.getElementById(headId || 'li5-timeout-head');
  if (li5ReducedMotion() || !board || !head || typeof board.animate !== 'function' || typeof li5Duster !== 'function') return;
  const dummy = document.createElement('span');
  dummy.setAttribute('aria-hidden', 'true');
  board.appendChild(dummy);
  head.style.opacity = '0';
  li5Duster(dummy, { duration: 300 }).finished.then(() => {
    if (dummy.parentNode) dummy.parentNode.removeChild(dummy);
    head.style.opacity = '';
    li5Chalk(head, head.textContent, {});
  });
}

// A dob arrives as a folded note passed along the tray: the most-dobbed slot, in the passed-note
// voice (§ 2.10). Two or more tattletales on one word stack the note and wiggle it; the word it
// names is ringed in the list.
function li5DescNote(ph) {
  const $ = id => document.getElementById(id);
  const c = li5V.card, d = li5V.dobs;
  const mp = window.syllyMultiplayerMode !== 'single';
  let slot = -1;
  if (mp && c && d && d.cardNo === c.cardNo && ph !== 'timeup' && ph !== 'timeout') {
    d.counts.forEach((n, i) => { if (n > 0 && (slot < 0 || n > d.counts[slot])) slot = i; });
  }
  li5V.noteSlot = slot;
  Array.prototype.forEach.call($('active-taboo-list').children || [], li => {
    li.classList.toggle('li5-ringed', slot >= 0 && Number(li.dataset.slot) === slot);
  });
  $('active-word').classList.toggle('li5-ringed', slot >= 0 && slot >= c.nonoList.length);
  if (slot < 0) {
    $('li5-note').style.display = 'none';
    $('li5-note-text').textContent = '';
    li5DescNoteSeen = { key: '', n: 0 };
    return;
  }
  const said = slot >= c.nonoList.length ? c.word : c.nonoList[slot];
  const n = d.counts[slot], key = c.cardNo + ':' + slot;
  $('li5-note-text').textContent = n === 1 ? `Psst — you said "${said}"` : `${n} tattletales say you said "${said}"`;
  $('li5-note').classList.toggle('li5-note-crowd', n >= 2);
  if (li5DescNoteSeen.key === key && n > li5DescNoteSeen.n && !li5ReducedMotion() && typeof $('li5-note').animate === 'function') {
    $('li5-note').animate([{ transform: 'rotate(-1.2deg)' }, { transform: 'rotate(-3.5deg)' }, { transform: 'rotate(1.5deg)' }, { transform: 'rotate(-1.2deg)' }],
                          { duration: 400, easing: 'ease-in-out' });
  }
  li5DescNoteSeen = { key, n };
  $('li5-note').style.display = '';
}

// ── The tattletale and guessing boards (pilot S5) ───────────────────────────
// Same board as the describer's. One render function per screen owns every element; text lands in
// its FINAL state synchronously and the duster / new-note pops are cosmetic passes over it.
function li5RenderTattle() {
  const $ = id => document.getElementById(id);
  const ph = li5V.phase, c = li5V.card, t = li5V.turn;
  const out = ph === 'timeout', up = ph === 'timeup', live = ph === 'play';
  li5PaintDescTallies('li5-tt', li5TabShown);
  $('li5-tattle-board').dataset.phase = ph;
  $('li5-tattle-board').classList.toggle('li5-sylly', !!(c && c.isSylly));
  $('li5-tattle-up').textContent = t ? li5SeatName(t.upSeat) : '';
  $('li5-tattle-timeout').style.display = out ? 'flex' : 'none';
  $('li5-tattle-live').style.display    = out ? 'none' : 'flex';
  if (out) $('li5-tattle-time').textContent = formatTime(li5ClockSecs());
  $('li5-tattle-word').textContent = c ? c.word : '…';
  const counts = (li5V.dobs && c && li5V.dobs.cardNo === c.cardNo) ? li5V.dobs.counts : [];
  const list = $('li5-tattle-list');
  const show = (live || up) && c;
  const n = show ? c.nonoList.length : 0;
  list.className = 'li5-dobs' + (n > 5 ? ' li5-dobs-2' : '');
  list.innerHTML = show
    ? c.nonoList.map((w, i) => `<li><button type="button" data-li5-dob="${i}" data-slot="${i}" class="li5-dob-row"><span class="li5-dob-word">${li5Esc(w)}</span>${li5DobCount(counts[i])}<span class="li5-dob-ack">Dobbed!</span></button></li>`).join('')
    : '';
  $('btn-li5-dob-word').style.display = live && c ? '' : 'none';
  li5RenderTattleStatus();
  if (out && li5TabPhase !== 'timeout') li5DescTimeoutWipe('li5-tattle-board', 'li5-tattle-timeout-head');
  li5TabPhase = ph;
}

// "N dobbed": a dot per tattletale (to 5) and the number.
function li5DobCount(n) {
  n = Number(n) || 0;
  if (!n) return '';
  return `<span class="li5-dob-count">${'<i class="li5-dob-dot"></i>'.repeat(Math.min(n, 5))}<span>${n} dobbed</span></span>`;
}

// Cooldown view (5 s after a dob) — repainted every clock tick as well as by li5RenderTattle.
function li5RenderTattleStatus() {
  const $ = id => document.getElementById(id);
  const ph = li5V.phase, c = li5V.card;
  const left = Math.ceil((li5V.coolUntil - Date.now()) / 1000);
  const cooling = ph === 'play' && left > 0;
  const name = li5V.turn ? li5SeatName(li5V.turn.upSeat) : '';
  const hit = cooling && c && li5V.lastDob && li5V.lastDob.cardNo === c.cardNo ? li5V.lastDob.slot : -1;
  $('li5-tattle-list').classList.toggle('li5-cooling', cooling || ph === 'timeup');
  Array.prototype.forEach.call($('li5-tattle-list').querySelectorAll('[data-slot]'), b => {
    b.classList.toggle('li5-dob-hit', Number(b.dataset.slot) === hit);
  });
  $('btn-li5-dob-word').classList.toggle('opacity-50', cooling);
  const counts = (li5V.dobs && c && li5V.dobs.cardNo === c.cardNo) ? li5V.dobs.counts : [];
  const wn = c ? (counts[c.nonoList.length] | 0) : 0;
  $('li5-tattle-wordnote').textContent = c && hit === c.nonoList.length ? 'Dobbed!' : (wn ? `${wn} dobbed` : '');
  const st = $('li5-tattle-status');
  st.classList.toggle('li5-status-big', ph === 'timeup');
  st.textContent = ph === 'timeup' ? 'Time!'
                 : cooling ? `Note passed to ${name}.` + '\n' + `Dob again in ${left} s`
                 : '';
}

function li5RenderGuess() {
  const $ = id => document.getElementById(id);
  const ph = li5V.phase, t = li5V.turn;
  const out = ph === 'timeout', up = ph === 'timeup';
  li5PaintDescTallies('li5-gs', li5GuessShown);
  $('li5-guess-board').dataset.phase = ph;
  $('li5-guess-up').textContent = t ? li5SeatName(t.upSeat) : '';
  $('li5-guess-timeout').style.display = out ? 'flex' : 'none';
  $('li5-guess-live').style.display    = out ? 'none' : 'flex';
  if (out) $('li5-guess-time').textContent = formatTime(li5ClockSecs());
  const st = $('li5-guess-streak');
  st.classList.toggle('li5-status-big', up);
  st.textContent = up ? 'Time!' : li5V.streak >= 2 ? `${li5V.streak} in a row!` : '';
  // The feed, newest first: a sticky note per Yay'd word, a blank slip for a Skip or a Dob.
  $('li5-guess-feed').innerHTML = li5V.feed.slice().reverse().map(f => {
    const rot = ((f.cardNo * 37) % 7 - 3) * 1.1;
    if (f.action === 'correct' && f.word) {
      return `<li class="li5-sticky" style="--r:${rot}deg">${li5Esc(f.word)}${f.points > 1 ? `<small>+${f.points}</small>` : ''}</li>`;
    }
    const txt = f.action === 'skip' ? 'Skipped' : `Dobbed${f.points < 0 ? ` \u2212${Math.abs(f.points)}` : ''}`;
    return `<li class="li5-slip" style="--r:${rot}deg">${txt}</li>`;
  }).join('');
  const first = $('li5-guess-feed').firstElementChild;
  if (first && li5V.feed.length > li5GuessFeedN && !li5ReducedMotion() && typeof first.animate === 'function') {
    first.animate([{ opacity: 0, transform: 'translateY(-10px) scale(0.9)' }], { duration: 200, easing: 'ease-out' });
  }
  li5GuessFeedN = li5V.feed.length;
  if (out && li5GuessPhase !== 'timeout') li5DescTimeoutWipe('li5-guess-board', 'li5-guess-timeout-head');
  li5GuessPhase = ph;
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
  li5VoiceFor(mark, mark === 'correct' ? li5V.streak + 1 : 0);
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
  li5V.lastDob = { cardNo: li5V.card.cardNo, slot };
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
    if (window.syllyMultiplayerMode === 'single') { if (!isPaused) togglePause(); return; }
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
  applyAndAdvance('taboo');
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
    confirmBtn.textContent = 'Wipe it!';
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
