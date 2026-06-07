// ═══════════════════════════════════════════════════════════════════════════
// Natural Selection — Plugin
// Depends on: engine.js (showScreen, playSuccess, playBoing, playLaunch,
//             playExit, playDone, playPillClick, playSyllyOn, playSyllyOff,
//             shuffle, normaliseWord, openSoundOverlay, resetToLobby,
//             activeGameId),
//             li5.js (allWords, loadWords)
// ═══════════════════════════════════════════════════════════════════════════

// ── NAT Settings (persist between games) ────────────────────────────────────
let natMatchesSetting  = 3;        // 3 | 4 | 5
let natRoundsPerMatch  = 2;        // 2 | 3 | 4
let natDifficulty      = 'd1+d2';  // 'd1' | 'd1+d2' | 'all'
let natCumulativeClues = false;    // Research Log — Researchers get new word each day, accumulate history
let natSyllyMode       = false;
let natVotingMode           = 'consensus'; // 'consensus' | 'independent'
let natScientificIntegrity  = 'relaxed';   // 'relaxed' | 'peer-review'
let natEscapePoints         = 10;          // 10 | 15 | 20

// ── NAT Roster ───────────────────────────────────────────────────────────────
let natPlayerCount     = 4;
let natPlayerNames     = [];

// ── NAT Match state ──────────────────────────────────────────────────────────
let natCurrentMatch    = 0;
let natSpecimen        = null;
let natBiologistIdx    = -1;
let natMoleIdx         = -1;
let natAssignedWords   = [];
let natUsedWordIds     = new Set();

// ── NAT Round (observation day within a match) ───────────────────────────────
let natCurrentMatchRound = 0;
let natClueOrder         = [];
let natClueOrders        = []; // [dayIdx] → submission order array for that day
let natCurrentClueStep   = 0;
let natCluesByRound      = []; // [dayIdx][playerIdx] → observation string
let natWordsByDay        = []; // [dayIdx][playerIdx] → word shown that day (Research Log)

// ── NAT Selection (voting phase) ─────────────────────────────────────────────
let natSelectionPhase    = 'reveal';
let natVoteOrder         = [];
let natCurrentVoteStep   = 0;
let natVotes             = [];
let natConsensusTallies  = [];
let natEvictedIdx        = -1;

// ── NAT Last Stand ───────────────────────────────────────────────────────────
let natLastStandPhase  = 'mole-guess';
let natMoleGuess       = '';

// ── NAT Scoring ──────────────────────────────────────────────────────────────
let natScores          = [];
let natRoundLog        = [];

// ── NAT Scientific Integrity (dispute mechanic) ───────────────────────────────
let natClueStatuses    = []; // [playerIdx][dayIdx] = 'normal' | 'review' | 'discredited'
let natMpVoteReadyCheck = []; // Lobby Mode (independent voting): tracks per-player vote submission


// ── Init & Menu ───────────────────────────────────────────────────────────────
function natInit() {
  activeGameId = 'nat';
  updateSliderTheme('nat');
  showScreen('screen-nat-menu');
}

// ── Settings overlay ──────────────────────────────────────────────────────────
function natOpenSettings() {
  const el = document.getElementById('nat-settings-overlay');
  el.querySelector('.overlay-data-inner').scrollTop = 0;
  el.style.display = 'flex';
}

function natCloseSettings() {
  document.getElementById('nat-settings-overlay').style.display = 'none';
}

function natApplyExpansionOverrides() {
  if (!isSecretMode || !window.activeExpansionOverrides) return;
  const ov = window.activeExpansionOverrides;
  if (ov.natMatchesSetting  !== undefined) natMatchesSetting  = ov.natMatchesSetting;
  if (ov.natRoundsPerMatch  !== undefined) natRoundsPerMatch  = ov.natRoundsPerMatch;
  if (ov.natDifficulty      !== undefined) natDifficulty      = ov.natDifficulty;
  if (ov.natCumulativeClues !== undefined) natCumulativeClues = ov.natCumulativeClues;
  if (ov.natSyllyMode       !== undefined) natSyllyMode       = ov.natSyllyMode;
  if (ov.natEscapePoints    !== undefined) natEscapePoints    = ov.natEscapePoints;
}

function natApplySettings() {
  const mPill = document.querySelector('#nat-matches-group .pill-active-lime');
  if (mPill) natMatchesSetting = parseInt(mPill.dataset.habitats);

  const rPill = document.querySelector('#nat-rounds-group .pill-active-lime');
  if (rPill) natRoundsPerMatch = parseInt(rPill.dataset.days);

  const dPill = document.querySelector('#nat-diff-group .pill-active-lime');
  if (dPill) natDifficulty = dPill.dataset.diff;

  const vPill = document.querySelector('#nat-vote-group .pill-active-lime');
  if (vPill) natVotingMode = vPill.dataset.vote;

  const iPill = document.querySelector('#nat-integrity-group .pill-active-lime');
  if (iPill) natScientificIntegrity = iPill.dataset.integrity;

  const ePill = document.querySelector('#nat-escape-group .pill-active-lime');
  if (ePill) natEscapePoints = parseInt(ePill.dataset.escape);

  const cToggle = document.getElementById('btn-nat-cumulative-toggle');
  if (cToggle) natCumulativeClues = cToggle.classList.contains('game-toggle-on-lime');
}

// ── How to Play overlay ───────────────────────────────────────────────────────
function natOpenHowTo() {
  const el = document.getElementById('nat-how-to-overlay');
  el.querySelector('.overlay-data-inner').scrollTop = 0;
  el.style.display = 'flex';
}

function natCloseHowTo() {
  document.getElementById('nat-how-to-overlay').style.display = 'none';
}

function natShowHelpTip(emoji, heading, tip) {
  document.getElementById('nat-help-tip-emoji').textContent   = emoji;
  document.getElementById('nat-help-tip-heading').textContent = heading;
  document.getElementById('nat-help-tip-text').textContent    = tip;
  document.getElementById('nat-help-tip-overlay').style.display = 'flex';
}

// ── Quit overlay ──────────────────────────────────────────────────────────────
function natOpenQuit() {
  document.getElementById('nat-quit-overlay').style.display = 'flex';
  playExit();
}

function natCloseQuit() {
  document.getElementById('nat-quit-overlay').style.display = 'none';
}

function natConfirmQuit() {
  natCloseQuit();
  showScreen('screen-nat-menu');
}

// ── Setup (roster) ────────────────────────────────────────────────────────────
function natShowSetup() {
  if (window.syllyMultiplayerMode !== 'single') {
    // MDLM: independent voting; PTP: consensus default
    if (window.mpLobbyStyle === 'individual') natVotingMode = 'independent';
    // Lobby Mode: use slot names, Host starts match directly
    natApplySettings();
    natPlayerCount = mpPlayerSlots.length;
    natPlayerNames = mpPlayerSlots.map(p => p.nickname);
    if (window.syllyMultiplayerMode === 'host') {
      natScores       = Array(natPlayerCount).fill(0);
      natRoundLog     = [];
      natUsedWordIds  = new Set();
      natCurrentMatch = 0;
      natClueStatuses = Array.from({ length: natPlayerCount }, () => Array(natRoundsPerMatch).fill('normal'));
      natStartMatch();
    }
    // Clients wait for NAT_MATCH_START SYNC from Host
    return;
  }
  natApplySettings();
  natRenderNameInputs();
  showScreen('screen-nat-setup');
}

function natRenderNameInputs() {
  const container = document.getElementById('nat-name-inputs');
  container.innerHTML = '';
  for (let i = 0; i < natPlayerCount; i++) {
    const saved = natPlayerNames[i] || '';
    container.insertAdjacentHTML('beforeend', `
      <input id="nat-name-${i}" type="text" maxlength="14" autocomplete="off"
        placeholder="Researcher ${i + 1}"
        value="${saved.replace(/"/g, '&quot;')}"
        class="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-800 text-base focus:outline-none focus:ring-2 focus:ring-lime-400" />
    `);
  }
}

async function natStartGame() {
  natApplySettings();
  natApplyExpansionOverrides();
  const names = [];
  for (let i = 0; i < natPlayerCount; i++) {
    const val = (document.getElementById(`nat-name-${i}`)?.value || '').trim();
    names.push(val || `Researcher ${i + 1}`);
  }
  natPlayerNames  = names;
  natScores          = Array(natPlayerCount).fill(0);
  natRoundLog        = [];
  natUsedWordIds     = new Set();
  natCurrentMatch    = 0;
  natClueStatuses    = Array.from({ length: natPlayerCount }, () => Array(natRoundsPerMatch).fill('normal'));
  await natStartMatch();
}

// ── Match setup ───────────────────────────────────────────────────────────────
async function natStartMatch() {
  await loadWords();

  natSpecimen = natDrawSpecimen();
  if (!natSpecimen) {
    natUsedWordIds.clear();
    natSpecimen = natDrawSpecimen();
  }
  if (!natSpecimen) return;
  natUsedWordIds.add(natSpecimen.id);

  natCluesByRound     = [];
  natClueOrders       = [];
  natVotes            = Array(natPlayerCount).fill(-1);
  natConsensusTallies = Array(natPlayerCount).fill(0);
  natCurrentVoteStep  = 0;
  natClueStatuses     = Array.from({ length: natPlayerCount }, () => Array(natRoundsPerMatch).fill('normal'));
  natEvictedIdx       = -1;
  natSelectionPhase   = 'reveal';
  natMoleGuess        = '';
  natLastStandPhase   = 'mole-guess';

  natCurrentMatchRound = 0;
  natAssignRoles();

  if (window.syllyMultiplayerMode === 'host') {
    // Lobby Mode: broadcast specimen + role assignments so all devices know their role
    mpSendEnvelope({ type: 'SYNC', payload: {
      action:       'NAT_MATCH_START',
      specimen:     natSpecimen,
      assignedWords: natAssignedWords,
      moleIdx:      natMoleIdx,
      biologistIdx: natBiologistIdx,
      match:        natCurrentMatch,
      matchesSetting: natMatchesSetting,
      roundsPerMatch: natRoundsPerMatch,
    }});
  }

  natStartClueRound();
}

function natDrawSpecimen() {
  const diffMax = natDifficulty === 'd1' ? 1 : natDifficulty === 'd1+d2' ? 2 : 3;
  const pool = isSecretMode
    ? secretWords.filter(w => w.difficulty <= diffMax && !natUsedWordIds.has(w.id))
    : allWords.filter(w => w.category === 'animals' && w.difficulty <= diffMax && !natUsedWordIds.has(w.id));
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function natAssignRoles() {
  const order = shuffle([...Array(natPlayerCount).keys()]);

  natMoleIdx       = order[0];
  natAssignedWords = Array(natPlayerCount).fill('');
  natAssignedWords[natMoleIdx] = natSpecimen.nono_list[0];

  if (natSyllyMode) {
    natBiologistIdx = -1;
    const detailPool = shuffle(natSpecimen.nono_list.slice(1));
    order.slice(1).forEach((pIdx, i) => {
      natAssignedWords[pIdx] = detailPool[i] || natSpecimen.nono_list[1];
    });
  } else {
    natBiologistIdx = order[1];
    natAssignedWords[natBiologistIdx] = natSpecimen.word;
    const detailPool = shuffle(natSpecimen.nono_list.slice(1));
    order.slice(2).forEach((pIdx, i) => {
      natAssignedWords[pIdx] = detailPool[i] || natSpecimen.nono_list[1];
    });
  }

  natVoteOrder = [...order];
}

function natGetWordForPlayer(pIdx) {
  if (!natSyllyMode) return natAssignedWords[pIdx];
  if (natCurrentMatchRound === 0) return natSpecimen.nono_list[0];
  return pIdx === natMoleIdx ? natSpecimen.nono_list[0] : natAssignedWords[pIdx];
}

function natGetRoleLabel(pIdx) {
  if (pIdx === natMoleIdx) return '🕵️ The Mole';
  if (!natSyllyMode && pIdx === natBiologistIdx) return '🔬 Lead Biologist';
  return '📋 Field Researcher';
}

function natGetRoleDescription(pIdx) {
  if (pIdx === natMoleIdx) return 'Blend in. Guess what the animal is and give a clue about it.';
  if (!natSyllyMode && pIdx === natBiologistIdx) return 'Give one clue — guide the group without tipping off The Mole.';
  return 'Figure out the animal from your word. Give one clue about it.';
}

function natWordIsResearcher(pIdx) {
  return pIdx !== natMoleIdx && (natSyllyMode || pIdx !== natBiologistIdx);
}

function natGetWordLabel(pIdx) {
  if (pIdx === natMoleIdx) return 'Classification';
  if (!natSyllyMode && pIdx === natBiologistIdx) return 'Target Specimen';
  return 'Field Observation';
}

// ── Observation day setup ─────────────────────────────────────────────────────
function natStartClueRound() {
  // Research Log: draw new words for Field Researchers on day 1+
  if (natCumulativeClues && natCurrentMatchRound > 0) {
    const detailPool = shuffle(natSpecimen.nono_list.slice(1));
    let poolIdx = 0;
    for (let i = 0; i < natPlayerCount; i++) {
      if (natWordIsResearcher(i)) {
        natAssignedWords[i] = detailPool[poolIdx % detailPool.length];
        poolIdx++;
      }
    }
  }
  // Record what each player sees today (used by Research Log stacked display)
  natWordsByDay[natCurrentMatchRound] = Array.from({ length: natPlayerCount }, (_, i) => natGetWordForPlayer(i));

  // Reshuffle order every day — no persistent tells
  natClueOrder = shuffle([...Array(natPlayerCount).keys()]);
  natClueOrders[natCurrentMatchRound] = [...natClueOrder];
  natCluesByRound[natCurrentMatchRound] = Array(natPlayerCount).fill('');
  natCurrentClueStep = 0;
  natShowHandover(natClueOrder[0]);
}

// ── Handover gate ─────────────────────────────────────────────────────────────
function natShowHandover(pIdx) {
  if (window.syllyMultiplayerMode !== 'single') {
    // Lobby Mode: skip handover screen; broadcast active player + navigate all devices to observation
    if (window.syllyMultiplayerMode === 'host') {
      mpSendEnvelope({ type: 'SYNC', payload: {
        action:      'NAT_ACTIVE_PLAYER',
        playerIdx:   pIdx,
        clueOrder:   natClueOrder,
        clueStep:    natCurrentClueStep,
        day:         natCurrentMatchRound,
      }});
    }
    natShowObservation();
    return;
  }
  document.getElementById('nat-handover-name').textContent = natPlayerNames[pIdx];
  document.getElementById('nat-handover-sub').textContent  =
    `Day ${natCurrentMatchRound + 1} of ${natRoundsPerMatch} — don't peek.`;
  showScreen('screen-nat-handover');
}

// ── Observation (journal entry) ───────────────────────────────────────────────
function natShowObservation() {
  natRenderObservationScreen();
  showScreen('screen-nat-observation');
  document.getElementById('screen-nat-observation').scrollTop = 0;
}

function natRenderObservationScreen() {
  const pIdx = natClueOrder[natCurrentClueStep]; // whose turn it is to give a clue
  // In MDLM each device shows its OWN role; single-device shows the current turn player
  const myPIdx       = (window.syllyMultiplayerMode !== 'single') ? mpMyPlayerIdx : pIdx;
  const myIsResearcher = natWordIsResearcher(myPIdx);

  // Reset input state first
  document.getElementById('nat-obs-input').value         = '';
  document.getElementById('btn-nat-obs-submit').disabled = true;

  // Lobby Mode standby: lock input when it's not this device's turn
  if (window.syllyMultiplayerMode !== 'single') {
    const isActive = pIdx === mpMyPlayerIdx;
    const inputEl  = document.getElementById('nat-obs-input');
    const submitEl = document.getElementById('btn-nat-obs-submit');
    if (inputEl) inputEl.disabled = !isActive;
    if (submitEl) submitEl.disabled = !isActive;
    document.getElementById('nat-obs-error').textContent =
      isActive ? '' : `Recording ${natPlayerNames[pIdx]}'s field observation…`;
  } else {
    document.getElementById('nat-obs-error').textContent = '';
  }

  document.getElementById('nat-obs-round').textContent =
    `Day ${natCurrentMatchRound + 1} of ${natRoundsPerMatch} · Habitat ${natCurrentMatch + 1} of ${natMatchesSetting}`;
  document.getElementById('nat-obs-step').textContent  =
    `Observation ${natCurrentClueStep + 1} of ${natPlayerCount}`;
  // Role info always reflects THIS DEVICE's player (myPIdx)
  document.getElementById('nat-obs-name').textContent      = natPlayerNames[myPIdx];
  document.getElementById('nat-obs-role').textContent      = natGetRoleLabel(myPIdx);
  document.getElementById('nat-obs-role-desc').textContent = natGetRoleDescription(myPIdx);
  document.getElementById('nat-obs-word-label').textContent = natGetWordLabel(myPIdx);

  // Research Log: clues shown left-to-right in order (no day labels — player can infer order)
  if (natCumulativeClues && myIsResearcher && natCurrentMatchRound > 0) {
    const parts = [];
    for (let d = 0; d <= natCurrentMatchRound; d++) {
      const w = natWordsByDay[d]?.[myPIdx] || '';
      if (w) parts.push(w);
    }
    document.getElementById('nat-obs-word').textContent = parts.join(' · ');
  } else {
    document.getElementById('nat-obs-word').textContent = natGetWordForPlayer(myPIdx);
  }

  // Category — show for non-Mole; Mole's word IS the category so hide the separate label
  const catLabelEl = document.getElementById('nat-obs-category-label');
  const catValEl   = document.getElementById('nat-obs-category-value');
  if (myPIdx !== natMoleIdx) {
    catLabelEl.textContent = 'Category';
    catValEl.textContent   = natSpecimen.nono_list[0];
    catLabelEl.classList.remove('hidden');
    catValEl.classList.remove('hidden');
  } else {
    catLabelEl.classList.add('hidden');
    catValEl.classList.add('hidden');
  }

  natRenderJournal();
}

function natRenderJournal() {
  const journal = document.getElementById('nat-obs-journal');
  journal.innerHTML = '';

  // Sylly Mode: show previous days only (current day sealed until daily review)
  // Standard mode: show all days including current day's submitted entries
  const daysToShow = natSyllyMode ? natCurrentMatchRound : natCurrentMatchRound + 1;

  for (let r = daysToShow - 1; r >= 0; r--) {
    const isCurrentDay = r === natCurrentMatchRound;
    const order = natClueOrders[r] || [];

    const entries = order
      .filter(pIdx => {
        if (!isCurrentDay) return true;
        // Current day: only players who've already submitted
        return natClueOrder.indexOf(pIdx) < natCurrentClueStep;
      })
      .map(pIdx => ({ name: natPlayerNames[pIdx], word: natCluesByRound[r][pIdx] }))
      .filter(e => e.word)
      .reverse();

    if (!entries.length) continue;

    let html = `<div class="flex flex-col gap-1.5">
      <p class="text-xs text-stone-400 font-semibold uppercase tracking-widest px-1">Day ${r + 1}</p>`;
    entries.forEach(e => {
      html += `<div class="bg-amber-50 border-l-2 border-amber-300 rounded-r-xl px-3 py-2">
        <p class="text-stone-400 text-xs font-semibold leading-none mb-0.5">${e.name}</p>
        <p class="text-stone-800 font-bold">${e.word}</p>
      </div>`;
    });
    html += `</div>`;
    journal.insertAdjacentHTML('beforeend', html);
  }

  if (!journal.children.length) {
    const msg = natSyllyMode && natCurrentMatchRound === 0
      ? 'Observations are sealed until end of day.'
      : 'The journal is empty. You\'re first in.';
    journal.insertAdjacentHTML('beforeend',
      `<p class="text-stone-300 text-sm text-center py-6 italic">${msg}</p>`);
  }

  // Scroll to top — newest day is already at top
  document.getElementById('screen-nat-observation').scrollTop = 0;
}

// ── Root-word stemmer — strips common English suffixes for derivative blocking ─
function natStem(word) {
  const suffixes = [
    'ations','nesses','ments','tions','sions',
    'ians','ings','ness','ment','tion','sion',
    'ers','ies','est','ing','ian','ia',
    'al','an','ed','er','es','ly','ous','ive','ful',
    'y','s'
  ];
  for (const suf of suffixes) {
    if (word.endsWith(suf) && word.length - suf.length >= 3) {
      return word.slice(0, word.length - suf.length);
    }
  }
  return word;
}

// ── Submit observation ────────────────────────────────────────────────────────
function natSubmitObservation() {
  const inputEl = document.getElementById('nat-obs-input');
  const val     = normaliseWord(inputEl.value.trim());
  const errEl   = document.getElementById('nat-obs-error');

  if (!val) return;

  if (inputEl.value.trim().includes(' ')) {
    errEl.textContent = 'One word only.';
    inputEl.classList.remove('shake'); void inputEl.offsetWidth; inputEl.classList.add('shake');
    playBoing();
    return;
  }

  const animal    = normaliseWord(natSpecimen.word);
  const submitted = natCluesByRound.flat().filter(c => c !== '').map(normaliseWord);

  if (val === animal) {
    errEl.textContent = `You can't name the specimen.`;
    inputEl.classList.remove('shake'); void inputEl.offsetWidth; inputEl.classList.add('shake');
    playBoing();
    return;
  }
  if (submitted.includes(val)) {
    errEl.textContent = 'That observation was already used this habitat.';
    inputEl.classList.remove('shake'); void inputEl.offsetWidth; inputEl.classList.add('shake');
    playBoing();
    return;
  }
  const stemNew = natStem(val);
  if (natStem(animal) === stemNew || submitted.some(s => natStem(s) === stemNew)) {
    errEl.textContent = 'Too similar to a word already used.';
    inputEl.classList.remove('shake'); void inputEl.offsetWidth; inputEl.classList.add('shake');
    playBoing();
    return;
  }
  const pIdx = natClueOrder[natCurrentClueStep];
  const assignedWord = pIdx === natMoleIdx ? natSpecimen.nono_list[0] : (natAssignedWords[pIdx] || null);
  if (assignedWord && natStem(normaliseWord(assignedWord)) === stemNew) {
    errEl.textContent = "You can't use your own clue word.";
    inputEl.classList.remove('shake'); void inputEl.offsetWidth; inputEl.classList.add('shake');
    playBoing();
    return;
  }
  natCluesByRound[natCurrentMatchRound][pIdx] = inputEl.value.trim();
  playSuccess();

  if (window.syllyMultiplayerMode !== 'single') {
    // Lobby Mode: send observation to Host; Host advances
    if (window.syllyMultiplayerMode === 'client') {
      mpLockSync();
      document.getElementById('btn-nat-obs-submit').disabled = true;
      mpSendEnvelope({ type: 'ACTION', payload: {
        action:   'NAT_OBSERVATION',
        playerIdx: pIdx,
        clue:      inputEl.value.trim(),
        day:       natCurrentMatchRound,
        step:      natCurrentClueStep,
      }});
      return; // Host will advance via NAT_ACTIVE_PLAYER SYNC
    }
    // Host: advance and broadcast
    natCurrentClueStep++;
    if (natCurrentClueStep >= natPlayerCount) {
      if (natSyllyMode) {
        mpSendEnvelope({ type: 'SYNC', payload: {
          action:        'NAT_DAY_END',
          cluesByRound:  natCluesByRound,
          day:           natCurrentMatchRound,
          isSyllyReview: true,
        }});
        natShowDailyReview();
      } else if (natCurrentMatchRound < natRoundsPerMatch - 1) {
        natCurrentMatchRound++;
        natCurrentClueStep = 0;
        natStartClueRound(); // broadcasts next NAT_ACTIVE_PLAYER internally
      } else {
        natMpBroadcastSelection();
        natShowSelection();
      }
    } else {
      natShowHandover(natClueOrder[natCurrentClueStep]); // broadcasts NAT_ACTIVE_PLAYER
    }
    return;
  }

  natCurrentClueStep++;
  if (natCurrentClueStep >= natPlayerCount) {
    // Day complete
    if (natSyllyMode) {
      natShowDailyReview();
    } else if (natCurrentMatchRound < natRoundsPerMatch - 1) {
      natCurrentMatchRound++;
      natCurrentClueStep = 0;
      natStartClueRound();
    } else {
      natShowSelection();
    }
  } else {
    natShowHandover(natClueOrder[natCurrentClueStep]);
  }
}

// ── Daily Review (Sylly Mode — shared end-of-day observation reveal) ──────────
function natShowDailyReview() {
  const isLastDay = natCurrentMatchRound >= natRoundsPerMatch - 1;

  document.getElementById('nat-review-header').textContent =
    `Day ${natCurrentMatchRound + 1} · Habitat ${natCurrentMatch + 1} of ${natMatchesSetting}`;

  const entries = document.getElementById('nat-review-entries');
  entries.innerHTML = '';
  const order = natClueOrders[natCurrentMatchRound] || [];
  order.forEach(pIdx => {
    const word = natCluesByRound[natCurrentMatchRound][pIdx] || '—';
    entries.insertAdjacentHTML('beforeend', `
      <div class="bg-amber-50 border-l-2 border-amber-300 rounded-r-xl px-3 py-2.5">
        <p class="text-stone-400 text-xs font-semibold leading-none mb-0.5">${natPlayerNames[pIdx]}</p>
        <p class="text-stone-800 font-bold text-lg">${word}</p>
      </div>
    `);
  });

  const btn = document.getElementById('btn-nat-review-continue');
  btn.textContent = isLastDay ? 'To The Selection →' : `Day ${natCurrentMatchRound + 2} →`;

  showScreen('screen-nat-daily-review');
}

function natContinueDailyReview() {
  if (natCurrentMatchRound < natRoundsPerMatch - 1) {
    natCurrentMatchRound++;
    natCurrentClueStep = 0;
    natStartClueRound();
  } else {
    natShowSelection();
  }
}

// ── The Selection (voting phase) ──────────────────────────────────────────────
function natShowSelection() {
  natSelectionPhase   = 'reveal';
  natConsensusTallies = Array(natPlayerCount).fill(0);
  natRenderSelectionScreen();
  showScreen('screen-nat-selection');
}

function natRenderSelectionScreen() {
  document.getElementById('nat-sel-round').textContent =
    `Habitat ${natCurrentMatch + 1} of ${natMatchesSetting}`;

  const list = document.getElementById('nat-sel-clues');
  const isPeerReview = natScientificIntegrity === 'peer-review' && natSelectionPhase === 'reveal';
  list.innerHTML = '';
  for (let i = 0; i < natPlayerCount; i++) {
    const dayClues = natCluesByRound.map((round, r) => {
      const clue = round[i] || '—';
      if (clue === '—' || !isPeerReview) {
        return `<span class="text-stone-500 text-sm">Day ${r + 1}: <span class="font-semibold text-stone-800">${clue}</span></span>`;
      }
      const discredited = (natClueStatuses[i]?.[r] ?? 'normal') === 'discredited';
      const clueHtml  = discredited
        ? `<span class="line-through text-stone-400">${clue}</span>`
        : `<span class="font-semibold text-stone-800">${clue}</span>`;
      const badgeHtml = discredited ? `<span class="text-xs text-red-400 font-semibold">Discredited</span>` : '';
      const btnClass  = discredited ? 'bg-red-100 text-red-500 active:bg-red-200' : 'bg-stone-100 text-stone-500 active:bg-stone-200';
      return `<span class="text-stone-500 text-sm">Day ${r + 1}: ${clueHtml} <button onclick="natDispute(${i},${r})" class="ml-0.5 text-xs px-1.5 py-0.5 rounded-full ${btnClass}">🔬</button>${badgeHtml ? ' ' + badgeHtml : ''}</span>`;
    }).join('<span class="text-stone-300 mx-1">·</span>');
    list.insertAdjacentHTML('beforeend', `
      <div class="bg-white rounded-2xl px-4 py-3 shadow-sm">
        <p class="text-xs text-stone-400 font-semibold uppercase tracking-wide mb-1">${natPlayerNames[i]}</p>
        <p class="flex flex-wrap gap-x-2 gap-y-1">${dayClues}</p>
      </div>
    `);
  }

  const revealFooter    = document.getElementById('nat-sel-reveal-footer');
  const consensusFooter = document.getElementById('nat-sel-consensus-footer');
  const tallyWrapper    = document.getElementById('nat-sel-tally-wrapper');
  const indepWrapper    = document.getElementById('nat-sel-indep-wrapper');

  if (natSelectionPhase === 'reveal') {
    revealFooter.style.display    = 'flex';
    consensusFooter.style.display = 'none';
    tallyWrapper.style.display    = 'none';
    indepWrapper.style.display    = 'none';
  } else if (natVotingMode === 'consensus') {
    revealFooter.style.display    = 'none';
    consensusFooter.style.display = 'flex';
    tallyWrapper.style.display    = 'block';
    indepWrapper.style.display    = 'none';
    natRenderConsensusTally();
  } else {
    revealFooter.style.display    = 'none';
    consensusFooter.style.display = 'none';
    tallyWrapper.style.display    = 'none';
    indepWrapper.style.display    = 'block';
    natRenderVoterTurn();
  }
}

function natDispute(playerIdx, dayIdx) {
  const cycle = { 'normal': 'discredited', 'discredited': 'normal' };
  natClueStatuses[playerIdx][dayIdx] = cycle[natClueStatuses[playerIdx][dayIdx]] || 'normal';
  natRenderSelectionScreen();
}

// Lobby Mode helper: Host broadcasts full selection data to all devices
function natMpBroadcastSelection() {
  if (window.syllyMultiplayerMode !== 'host') return;
  mpSendEnvelope({ type: 'SYNC', payload: {
    action:       'NAT_SELECTION',
    cluesByRound: natCluesByRound,
    wordsByDay:   natWordsByDay,
    moleIdx:      natMoleIdx,
    biologistIdx: natBiologistIdx,
    match:        natCurrentMatch,
    day:          natCurrentMatchRound,
  }});
}

function natStartVoting() {
  if (natScientificIntegrity === 'peer-review') {
    natClueStatuses.forEach((playerStatuses, pIdx) => {
      const count = playerStatuses.filter(s => s === 'discredited').length;
      if (count > 0) natScores[pIdx] = Math.max(0, natScores[pIdx] - count * 5);
    });
  }
  natSelectionPhase  = 'vote';
  natCurrentVoteStep = 0;
  natRenderSelectionScreen();
}

// ── Field Consensus voting ────────────────────────────────────────────────────
function natRenderConsensusTally() {
  const tally = document.getElementById('nat-sel-consensus-tally');
  tally.innerHTML = '';
  for (let i = 0; i < natPlayerCount; i++) {
    tally.insertAdjacentHTML('beforeend', `
      <div class="flex items-center justify-between bg-white rounded-2xl px-4 py-3 shadow-sm">
        <span class="text-stone-800 font-semibold">${natPlayerNames[i]}</span>
        <div class="flex items-center gap-3">
          <button onclick="natAdjustVote(${i}, -1)"
            class="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 active:scale-90 text-stone-600 font-bold text-lg leading-none flex items-center justify-center transition-all">−</button>
          <span id="nat-cons-count-${i}" class="text-stone-800 font-bold w-5 text-center">${natConsensusTallies[i]}</span>
          <button onclick="natAdjustVote(${i}, 1)"
            class="w-8 h-8 rounded-full bg-lime-100 hover:bg-lime-200 active:scale-90 text-lime-700 font-bold text-lg leading-none flex items-center justify-center transition-all">+</button>
        </div>
      </div>
    `);
  }
  natUpdateConsensusTotals();
}

function natAdjustVote(idx, delta) {
  const total = natConsensusTallies.reduce((a, b) => a + b, 0);
  if (delta > 0 && total >= natPlayerCount) return;
  natConsensusTallies[idx] = Math.max(0, natConsensusTallies[idx] + delta);
  document.getElementById(`nat-cons-count-${idx}`).textContent = natConsensusTallies[idx];
  natUpdateConsensusTotals();
  playPillClick();
}

function natUpdateConsensusTotals() {
  const total = natConsensusTallies.reduce((a, b) => a + b, 0);
  document.getElementById('nat-sel-consensus-total').textContent =
    `${total} of ${natPlayerCount} votes assigned`;
  document.getElementById('btn-nat-sel-consensus-submit').disabled = total !== natPlayerCount;
}

function natSubmitConsensusVote() {
  natVotes = [];
  for (let i = 0; i < natPlayerCount; i++) {
    for (let j = 0; j < natConsensusTallies[i]; j++) natVotes.push(i);
  }
  playLaunch();
  natResolveEviction();
}

// ── Independent Verification voting ──────────────────────────────────────────
function natRenderVoterTurn() {
  const voterIdx = natVoteOrder[natCurrentVoteStep];
  document.getElementById('nat-sel-voter').textContent     = `${natPlayerNames[voterIdx]}'s Classification`;
  document.getElementById('nat-sel-vote-step').textContent =
    `Classification ${natCurrentVoteStep + 1} of ${natPlayerCount}`;

  const btns = document.getElementById('nat-sel-vote-buttons');
  btns.innerHTML = '';
  for (let i = 0; i < natPlayerCount; i++) {
    if (i === voterIdx) continue;
    btns.insertAdjacentHTML('beforeend', `
      <button onclick="natSubmitVote(${i})"
        class="min-h-14 w-full rounded-2xl bg-white border border-stone-200 text-stone-800 font-semibold text-base active:scale-95 transition-all duration-150 shadow-sm">
        ${natPlayerNames[i]}
      </button>
    `);
  }
}

function natSubmitVote(targetIdx) {
  natVotes[natVoteOrder[natCurrentVoteStep]] = targetIdx;
  playPillClick();
  natCurrentVoteStep++;
  if (natCurrentVoteStep >= natPlayerCount) {
    natResolveEviction();
  } else {
    natRenderVoterTurn();
  }
}

function natResolveEviction() {
  const counts = Array(natPlayerCount).fill(0);
  natVotes.forEach(v => { if (v >= 0) counts[v]++; });
  const max = Math.max(...counts);
  let tied = counts.reduce((acc, v, i) => v === max ? [...acc, i] : acc, []);

  if (tied.length === 1) {
    natEvictedIdx = tied[0];
  } else {
    const minScore = Math.min(...tied.map(i => natScores[i]));
    tied = tied.filter(i => natScores[i] === minScore);
    natEvictedIdx = tied.length === 1 ? tied[0] : -1;
  }
  natShowLastStand();
}

// ── Last Stand ────────────────────────────────────────────────────────────────
function natShowLastStand() {
  natLastStandPhase = 'mole-guess';
  natRenderLastStand();
  showScreen('screen-nat-last-stand');
}

function natRenderLastStand() {
  const moleSection = document.getElementById('nat-ls-mole-section');
  const bioSection  = document.getElementById('nat-ls-bio-section');

  if (natLastStandPhase === 'mole-guess') {
    moleSection.classList.remove('hidden');
    bioSection.classList.add('hidden');
    document.getElementById('nat-ls-mole-name').textContent   = natPlayerNames[natMoleIdx];
    document.getElementById('nat-ls-guess-input').value       = '';
    document.getElementById('nat-ls-guess-error').textContent = '';
    document.getElementById('btn-nat-ls-submit').disabled     = true;
    document.getElementById('btn-nat-ls-submit').classList.remove('hidden');
    document.getElementById('btn-nat-ls-confirmed').classList.add('hidden');
    document.getElementById('btn-nat-ls-disputed').classList.add('hidden');
  } else {
    moleSection.classList.add('hidden');
    bioSection.classList.remove('hidden');
    const verifierName = natSyllyMode ? 'Everyone' : natPlayerNames[natBiologistIdx];
    document.getElementById('nat-ls-bio-name').textContent      = verifierName;
    document.getElementById('nat-ls-guess-display').textContent = natMoleGuess;
    document.getElementById('nat-ls-specimen-reveal').textContent = natSpecimen.word;
    document.getElementById('btn-nat-ls-submit').classList.add('hidden');
    document.getElementById('btn-nat-ls-confirmed').classList.remove('hidden');
    document.getElementById('btn-nat-ls-disputed').classList.remove('hidden');
  }
}

function natSubmitMoleGuess() {
  const val = document.getElementById('nat-ls-guess-input').value.trim();
  if (!val) return;
  natMoleGuess      = val;
  natLastStandPhase = 'biologist-verdict';
  natRenderLastStand();
  playDone();
}

function natBiologistVerdict(confirmed) {
  playExit();
  const caught = natEvictedIdx === natMoleIdx;
  natResolveRound(caught, confirmed);
  natShowTally();
}

// ── Scoring ───────────────────────────────────────────────────────────────────
function natResolveRound(caught, correctId) {
  if (!caught) {
    natScores[natMoleIdx] += natEscapePoints;
  } else if (natVotingMode === 'independent') {
    for (let i = 0; i < natPlayerCount; i++) {
      if (i !== natMoleIdx && natVotes[i] === natMoleIdx) natScores[i] += 10;
    }
  } else {
    for (let i = 0; i < natPlayerCount; i++) {
      if (i !== natMoleIdx) natScores[i] += 10;
    }
  }
  if (correctId) natScores[natMoleIdx] += 10;

  natRoundLog.push({
    match:        natCurrentMatch,
    specimen:     natSpecimen.word,
    moleIdx:      natMoleIdx,
    biologistIdx: natBiologistIdx,
    evictedIdx:   natEvictedIdx,
    moleGuess:    natMoleGuess,
    caught, correctId,
    scores:       [...natScores],
  });
}

// ── Tally (per-match scores) ──────────────────────────────────────────────────
function natShowTally() {
  const entry  = natRoundLog[natRoundLog.length - 1];
  const isLast = natCurrentMatch >= natMatchesSetting - 1;

  document.getElementById('nat-tally-round').textContent =
    `Habitat ${natCurrentMatch + 1} of ${natMatchesSetting}`;
  document.getElementById('nat-tally-specimen').textContent = `Specimen: ${entry.specimen}`;

  const noConsensus = !entry.caught && entry.evictedIdx === -1;
  const caughtText = entry.caught
    ? `✅ The anomaly has been identified. Research secured.`
    : noConsensus
      ? `🤝 No consensus reached — ${natPlayerNames[natMoleIdx]} escapes by default.`
      : `🕵️ ${natPlayerNames[natMoleIdx]} blended in. Research compromised.`;
  const idText = entry.correctId
    ? `🔬 ${natPlayerNames[natMoleIdx]} correctly identified the specimen.`
    : `❌ ${natPlayerNames[natMoleIdx]} couldn't name the specimen.`;
  document.getElementById('nat-tally-result').innerHTML = `${caughtText}<br><span class="text-sm">${idText}</span>`;
  document.getElementById('nat-tally-mole-reveal').textContent = `The Mole: ${natPlayerNames[natMoleIdx]}`;

  const sorted = [...natScores.map((s, i) => ({ name: natPlayerNames[i], score: s }))]
    .sort((a, b) => b.score - a.score);
  document.getElementById('nat-tally-scores').innerHTML = sorted.map(p => `
    <div class="flex items-center justify-between bg-white rounded-2xl px-4 py-3 shadow-sm">
      <span class="text-stone-800 font-semibold">${p.name}</span>
      <span class="text-lime-700 font-bold text-lg">${p.score} Cred</span>
    </div>
  `).join('');

  const suspicionEl = document.getElementById('nat-tally-suspicion');
  if (entry.caught && !entry.correctId && natVotingMode === 'consensus') {
    const rows = natConsensusTallies
      .map((votes, i) => votes > 0 ? `<div class="flex items-center justify-between bg-amber-50 rounded-xl px-3 py-2">
        <span class="text-stone-700 text-sm font-semibold">${natPlayerNames[i]}</span>
        <span class="text-amber-700 text-sm font-bold">${votes} vote${votes !== 1 ? 's' : ''}</span>
      </div>` : '')
      .join('');
    suspicionEl.innerHTML = `<p class="text-xs text-stone-400 font-semibold uppercase tracking-widest px-1">Suspicion Log</p>${rows}`;
    suspicionEl.style.display = 'flex';
  } else if (entry.caught && !entry.correctId && natVotingMode === 'independent') {
    const experts = natPlayerNames
      .map((name, i) => ({ name, i }))
      .filter(p => p.i !== natMoleIdx && natVotes[p.i] === natMoleIdx)
      .map(p => `<div class="flex items-center justify-between bg-lime-50 rounded-xl px-3 py-2">
        <span class="text-stone-700 text-sm font-semibold">${p.name}</span>
        <span class="text-lime-700 text-sm font-bold">+10 Expert Bonus</span>
      </div>`)
      .join('');
    suspicionEl.innerHTML = `<p class="text-xs text-stone-400 font-semibold uppercase tracking-widest px-1">Expert Bonus</p>${experts}`;
    suspicionEl.style.display = experts ? 'flex' : 'none';
  } else {
    suspicionEl.style.display = 'none';
  }

  document.getElementById('btn-nat-tally-next').textContent = isLast ? 'View Final Report' : 'Next Habitat';

  if (window.syllyMultiplayerMode === 'host') {
    // Lobby Mode: broadcast tally so all devices render the same result
    mpSendEnvelope({ type: 'SYNC', payload: {
      action:   'NAT_TALLY',
      roundLog: natRoundLog,
      scores:   [...natScores],
      moleIdx:  natMoleIdx,
      isLast:   isLast,
    }});
  }

  showScreen('screen-nat-tally');
}

function natNextMatch() {
  if (natCurrentMatch >= natMatchesSetting - 1) {
    natShowGameover();
  } else {
    natCurrentMatch++;
    natStartMatch();
  }
}

// ── Gameover ──────────────────────────────────────────────────────────────────
function natShowGameover() {
  const sorted = [...natScores.map((s, i) => ({ name: natPlayerNames[i], score: s }))]
    .sort((a, b) => b.score - a.score);

  document.getElementById('nat-go-winner').textContent       = sorted[0].name;
  document.getElementById('nat-go-winner-score').textContent = `${sorted[0].score} Credibility`;

  const medals = ['🥇', '🥈', '🥉'];
  document.getElementById('nat-go-leaderboard').innerHTML = sorted.map((p, i) => `
    <div class="flex items-center justify-between bg-white rounded-2xl px-4 py-3 shadow-sm">
      <span class="text-stone-800">${medals[i] || ''} ${p.name}</span>
      <span class="text-lime-700 font-bold">${p.score} Cred</span>
    </div>
  `).join('');

  document.getElementById('nat-go-log').innerHTML = natRoundLog.map(r => `
    <div class="bg-stone-50 rounded-2xl px-4 py-3 border border-stone-100">
      <p class="text-xs text-stone-400 font-semibold uppercase tracking-wide">Habitat ${r.match + 1}</p>
      <p class="text-stone-800 font-bold">${r.specimen}</p>
      <p class="text-stone-500 text-sm">Mole: ${natPlayerNames[r.moleIdx]}</p>
      <p class="text-stone-500 text-sm">${!r.caught ? `🕵️ Blended in (+${natEscapePoints})` : '✅ Caught (+10 each)'}</p>
    </div>
  `).join('');

  playLaunch();
  showScreen('screen-nat-gameover');
}

// ── Reset ─────────────────────────────────────────────────────────────────────
function natResetState() {
  natCurrentMatch      = 0;
  natCurrentMatchRound = 0;
  natSpecimen          = null;
  natBiologistIdx      = -1;
  natMoleIdx           = -1;
  natAssignedWords     = [];
  natWordsByDay        = [];
  natUsedWordIds       = new Set();
  natClueOrder         = [];
  natClueOrders        = [];
  natCurrentClueStep   = 0;
  natCluesByRound      = [];
  natSelectionPhase    = 'reveal';
  natVoteOrder         = [];
  natCurrentVoteStep   = 0;
  natVotes             = [];
  natConsensusTallies  = [];
  natEvictedIdx        = -1;
  natLastStandPhase    = 'mole-guess';
  natMoleGuess         = '';
  natScores            = [];
  natRoundLog          = [];
  natPlayerNames       = [];
}


// ── Event Listeners ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // ── Lobby button ──
  document.getElementById('btn-nat')?.addEventListener('click', () => {
    playLaunch(); natInit();
  });

  // ── Menu ──
  document.getElementById('btn-nat-menu-play')?.addEventListener('click', () => {
    playLaunch(); mpShowModeScreen('nat');
  });
  document.getElementById('btn-nat-menu-howto')?.addEventListener('click', () => {
    playDone(); natOpenHowTo();
  });
  document.getElementById('btn-nat-menu-settings')?.addEventListener('click', () => {
    playDone(); natOpenSettings();
  });
  document.getElementById('btn-nat-menu-back')?.addEventListener('click', () => {
    playExit(); resetToLobby();
  });

  // ── Settings overlay ──
  document.getElementById('btn-nat-settings-close')?.addEventListener('click', () => {
    playDone(); natCloseSettings();
  });
  ['#nat-matches-group', '#nat-rounds-group', '#nat-diff-group', '#nat-vote-group', '#nat-integrity-group', '#nat-escape-group'].forEach(grp => {
    document.querySelectorAll(`${grp} .pill`).forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll(`${grp} .pill`).forEach(p => p.classList.remove('pill-active-lime'));
        pill.classList.add('pill-active-lime');
        playPillClick();
      });
    });
  });
  document.getElementById('btn-nat-cumulative-toggle')?.addEventListener('click', () => {
    natCumulativeClues = !natCumulativeClues;
    const btn = document.getElementById('btn-nat-cumulative-toggle');
    btn.textContent = natCumulativeClues ? 'ON' : 'OFF';
    btn.className   = natCumulativeClues ? 'game-toggle-on-lime shrink-0' : 'game-toggle-off shrink-0';
    playPillClick();
  });
  document.getElementById('btn-nat-sylly-toggle')?.addEventListener('click', () => {
    natSyllyMode = !natSyllyMode;
    const btn = document.getElementById('btn-nat-sylly-toggle');
    btn.textContent = natSyllyMode ? 'ON' : 'OFF';
    btn.className   = natSyllyMode ? 'game-toggle-on-lime shrink-0' : 'game-toggle-off shrink-0';
    natSyllyMode ? playSyllyOn() : playSyllyOff();
  });

  // ── How to Play overlay ──
  document.getElementById('btn-nat-howto-close')?.addEventListener('click', () => {
    playDone(); natCloseHowTo();
  });

  // ── [?] Help — header opens How to Play; contextual tip on observation screen ──
  document.querySelectorAll('.btn-nat-help-open').forEach(btn => {
    btn.addEventListener('click', () => { playDone(); natOpenHowTo(); });
  });
  document.getElementById('btn-nat-obs-help-tip')?.addEventListener('click', () => {
    natShowHelpTip('📋', 'Your Observation', 'Give one word based on your assigned clue. No spaces — hyphens OK.');
  });
  document.getElementById('btn-nat-help-tip-close')?.addEventListener('click', () => {
    playDone();
    document.getElementById('nat-help-tip-overlay').style.display = 'none';
  });

  // ── Setup ──
  document.querySelectorAll('#nat-count-group .pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('#nat-count-group .pill')
        .forEach(p => p.classList.remove('pill-active-lime'));
      pill.classList.add('pill-active-lime');
      natPlayerCount = parseInt(pill.dataset.count);
      playPillClick();
      natRenderNameInputs();
    });
  });
  document.getElementById('btn-nat-setup-back')?.addEventListener('click', () => {
    playExit(); showScreen('screen-nat-menu');
  });
  document.getElementById('btn-nat-setup-start')?.addEventListener('click', () => {
    playLaunch(); natStartGame();
  });

  // ── Handover gate ──
  document.getElementById('btn-nat-handover-ready')?.addEventListener('click', () => {
    playLaunch(); natShowObservation();
  });
  document.getElementById('btn-nat-handover-quit')?.addEventListener('click', () => {
    natOpenQuit();
  });

  // ── Observation ──
  document.getElementById('nat-obs-input')?.addEventListener('input', e => {
    document.getElementById('btn-nat-obs-submit').disabled = !e.target.value.trim();
    document.getElementById('nat-obs-error').textContent   = '';
    document.getElementById('nat-obs-input').classList.remove('shake');
  });
  document.getElementById('nat-obs-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') natSubmitObservation();
  });
  document.getElementById('btn-nat-obs-submit')?.addEventListener('click', () => {
    natSubmitObservation();
  });
  document.getElementById('btn-nat-obs-quit')?.addEventListener('click', () => {
    natOpenQuit();
  });

  // ── Daily Review ──
  document.getElementById('btn-nat-review-continue')?.addEventListener('click', () => {
    playLaunch(); natContinueDailyReview();
  });
  document.getElementById('btn-nat-review-quit')?.addEventListener('click', () => {
    natOpenQuit();
  });

  // ── The Selection ──
  document.getElementById('btn-nat-sel-start')?.addEventListener('click', () => {
    playLaunch(); natStartVoting();
  });
  document.getElementById('btn-nat-sel-consensus-submit')?.addEventListener('click', () => {
    natSubmitConsensusVote();
  });
  document.getElementById('btn-nat-sel-quit')?.addEventListener('click', () => {
    natOpenQuit();
  });

  // ── Last Stand ──
  document.getElementById('nat-ls-guess-input')?.addEventListener('input', e => {
    document.getElementById('btn-nat-ls-submit').disabled = !e.target.value.trim();
  });
  document.getElementById('btn-nat-ls-submit')?.addEventListener('click', () => {
    natSubmitMoleGuess();
  });
  document.getElementById('btn-nat-ls-confirmed')?.addEventListener('click', () => {
    natBiologistVerdict(true);
  });
  document.getElementById('btn-nat-ls-disputed')?.addEventListener('click', () => {
    natBiologistVerdict(false);
  });
  document.getElementById('btn-nat-ls-quit')?.addEventListener('click', () => {
    natOpenQuit();
  });

  // ── Tally ──
  document.getElementById('btn-nat-tally-next')?.addEventListener('click', () => {
    playLaunch(); natNextMatch();
  });
  document.getElementById('btn-nat-tally-quit')?.addEventListener('click', () => {
    natOpenQuit();
  });

  // ── Gameover ──
  document.getElementById('btn-nat-go-new')?.addEventListener('click', () => {
    const confirmBtn = document.getElementById('btn-nat-expedition-confirm');
    if (window.syllyMultiplayerMode === 'host') {
      confirmBtn.textContent = 'Restart in Lobby 🔄';
    } else if (window.syllyMultiplayerMode === 'client') {
      confirmBtn.textContent = 'Leave Session';
    } else {
      confirmBtn.textContent = 'New Expedition 🦁';
    }
    document.getElementById('nat-new-expedition-overlay').style.display = 'flex';
  });
  document.getElementById('btn-nat-expedition-confirm')?.addEventListener('click', () => {
    playLaunch();
    document.getElementById('nat-new-expedition-overlay').style.display = 'none';
    if (window.syllyMultiplayerMode !== 'single') {
      mpReturnToLobby();
      return;
    }
    natScores       = Array(natPlayerCount).fill(0);
    natRoundLog     = [];
    natUsedWordIds  = new Set();
    natCurrentMatch = 0;
    natStartMatch();
  });
  document.getElementById('btn-nat-expedition-cancel')?.addEventListener('click', () => {
    document.getElementById('nat-new-expedition-overlay').style.display = 'none';
  });
  document.getElementById('btn-nat-go-exit')?.addEventListener('click', () => {
    playExit(); resetToLobby();
  });
  document.getElementById('btn-nat-gameover-exit')?.addEventListener('click', () => {
    playExit(); resetToLobby();
  });

  // ── Quit overlay ──
  document.getElementById('btn-nat-quit-confirm')?.addEventListener('click', () => {
    natConfirmQuit();
  });
  document.getElementById('btn-nat-quit-cancel')?.addEventListener('click', () => {
    playDone(); natCloseQuit();
  });

  // ── Sound buttons (all nat screens) ──
  [
    'screen-nat-menu', 'screen-nat-setup', 'screen-nat-handover',
    'screen-nat-observation', 'screen-nat-daily-review', 'screen-nat-selection',
    'screen-nat-last-stand', 'screen-nat-tally', 'screen-nat-gameover',
  ].forEach(id => {
    document.getElementById(id)?.querySelectorAll('.btn-open-sound').forEach(btn => {
      btn.addEventListener('click', openSoundOverlay);
    });
  });

});
