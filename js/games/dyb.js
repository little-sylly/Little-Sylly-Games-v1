// ═══════════════════════════════════════════════════════════════════════════
// DICEY BLUFFS (DYB)
// Trust no one, count every face.
// Depends on: engine.js (showScreen, play*, resetToLobby, allScreens),
//             engine-multiplayer.js (mpSendEnvelope, mpLockSync, mpUnlockSync,
//                                    mpReturnToLobby, mpPlayerSlots,
//                                    window.syllyMultiplayerMode, mpMyPlayerIdx)
// ═══════════════════════════════════════════════════════════════════════════

// ── Settings (persist between play-agains) ───────────────────────────────────
let dybWildcardsStyle = 'classic'; // 'strict' | 'classic' | 'volatile'
let dybStartingHand   = 5;         // 3 | 4 | 5
let dybSyllyMode      = false;
let dybSyllyIntensity = 5;         // 5–10 (% per special die type)

// ── Roster (from mpPlayerSlots; persists across play-agains) ─────────────────
let dybPlayerCount = 0;
let dybPlayerNames = []; // string[N]
let dybSeatNumbers = []; // int[N] — seatNumbers[playerIdx] = seat (1..N)

// ── Match state (reset each play-again) ──────────────────────────────────────
let dybDiceInHand       = []; // int[N] — dice remaining per player
let dybActivePlayers    = []; // int[] — playerIdx of non-eliminated players
let dybCurrentOpenerIdx = 0;  // who opens the next Shake
let dybShakeNumber      = 0;
let dybEliminationOrder = []; // int[] — playerIdx in elimination order

// ── Shake state (reset each Shake) ───────────────────────────────────────────
let dybShakeReadyCheck = []; // bool[N] — true when player submitted their roll
let dybAllRolls        = []; // int[][] — host only; all players' dice this shake
let dybAllSpecialTypes = []; // string[][] — host only; per-player special types
let dybAllSlickFaces   = []; // int[][] — host only; per-player slick assignments

// ── Round state (reset each Shake) ───────────────────────────────────────────
let dybCurrentFace       = 0;     // current alleged face (0 = no bid yet)
let dybCurrentQty        = 0;     // current alleged quantity (0 = no bid yet)
let dybCurrentBidderIdx  = 0;     // whose turn it is to bid or challenge
let dybChallengerIdx     = -1;    // set when DYB_CALL_BLUFF received
let dybOnesStripped      = false; // Volatile Wilds: true after 1s directly alleged
let dybAllegationHistory = [];    // {playerIdx, qty, face}[]

// ── Per-device roll state (private; not broadcast until showdown) ─────────────
let dybMyRoll       = []; // int[] — this device's current dice values
let dybSpecialTypes = []; // string[] — die types for this device's roll
let dybSlickFaces   = []; // int[] — assigned face per die (-1 = unassigned, Slick only)

// ── UI state ─────────────────────────────────────────────────────────────────
let dybHandVisible   = true;  // stealth veil toggle
let dybSlickPickerDie = -1;   // which die index the slick picker is open for

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // ── Lobby button
  document.getElementById('btn-dyb').addEventListener('click', () => {
    playLaunch();
    activeGameId = 'dyb';
    showScreen('screen-dyb-menu');
  });

  // ── Game menu
  document.getElementById('btn-dyb-menu-play').addEventListener('click', () => {
    playLaunch();
    if (window.syllyMultiplayerMode !== 'single') {
      dybStartSession();
    } else {
      mpShowModeScreen('dyb');
    }
  });
  document.getElementById('btn-dyb-menu-how-to').addEventListener('click', () => {
    playDone();
    document.querySelector('#dyb-how-to-overlay .overlay-data-inner').scrollTop = 0;
    document.getElementById('dyb-how-to-overlay').style.display = 'flex';
  });
  document.getElementById('btn-dyb-menu-settings').addEventListener('click', () => {
    playDone();
    dybApplySettingsToUI();
    document.querySelector('#dyb-settings-overlay .overlay-data-inner').scrollTop = 0;
    document.getElementById('dyb-settings-overlay').style.display = 'flex';
  });
  document.getElementById('btn-dyb-menu-back').addEventListener('click', () => {
    playExit();
    resetToLobby();
  });

  // ── Settings overlay
  dybInitSettingsListeners();

  // ── How-to overlay
  document.getElementById('btn-dyb-howto-close').addEventListener('click', () => {
    playDone();
    document.getElementById('dyb-how-to-overlay').style.display = 'none';
  });

  // ── Quit overlay
  document.querySelectorAll('.btn-dyb-quit-open').forEach(btn => {
    btn.addEventListener('click', () => {
      playDone();
      document.getElementById('dyb-quit-overlay').style.display = 'flex';
    });
  });
  document.getElementById('btn-dyb-quit-confirm').addEventListener('click', () => {
    playExit();
    document.getElementById('dyb-quit-overlay').style.display        = 'none';
    document.getElementById('dyb-slick-picker-overlay').style.display = 'none';
    showScreen('screen-dyb-menu');
  });
  document.getElementById('btn-dyb-quit-cancel').addEventListener('click', () => {
    playDone();
    document.getElementById('dyb-quit-overlay').style.display = 'none';
  });

  // ── How-to button in gameplay header
  document.getElementById('btn-dyb-how-to').addEventListener('click', () => {
    playDone();
    document.querySelector('#dyb-how-to-overlay .overlay-data-inner').scrollTop = 0;
    document.getElementById('dyb-how-to-overlay').style.display = 'flex';
  });

  // ── Seating screen
  document.getElementById('btn-dyb-start-game').addEventListener('click', () => {
    playLaunch();
    dybStartGame();
  });

  // ── Shake screen
  document.getElementById('btn-dyb-roll').addEventListener('click', () => {
    playLaunch();
    dybDoRoll();
  });
  document.getElementById('btn-dyb-roll-ready').addEventListener('click', () => {
    playDone();
    dybSubmitRoll();
  });
  document.getElementById('btn-dyb-hand-veil').addEventListener('click', () => {
    dybHandVisible = !dybHandVisible;
    dybRenderHandVeil();
  });

  // ── Table screen
  document.getElementById('btn-dyb-call-bluff').addEventListener('click', () => {
    playExit();
    dybCallBluff();
  });
  document.getElementById('btn-dyb-raise').addEventListener('click', () => {
    playDone();
    dybSubmitAllegation();
  });
  document.getElementById('btn-dyb-table-veil').addEventListener('click', () => {
    dybHandVisible = !dybHandVisible;
    dybRenderHandVeil();
  });
  document.getElementById('btn-dyb-face-dec').addEventListener('click', () => {
    playPillClick();
    dybAdjustFacePicker(-1);
  });
  document.getElementById('btn-dyb-face-inc').addEventListener('click', () => {
    playPillClick();
    dybAdjustFacePicker(1);
  });
  document.getElementById('btn-dyb-qty-dec').addEventListener('click', () => {
    playPillClick();
    dybAdjustQtyPicker(-1);
  });
  document.getElementById('btn-dyb-qty-inc').addEventListener('click', () => {
    playPillClick();
    dybAdjustQtyPicker(1);
  });

  // ── Showdown screen
  document.getElementById('btn-dyb-next-shake').addEventListener('click', () => {
    playLaunch();
    dybAdvanceFromShowdown();
  });
  document.getElementById('btn-dyb-showdown-exit').addEventListener('click', () => {
    playExit();
    resetToLobby();
  });

  // ── Gameover screen
  document.getElementById('btn-dyb-gameover-again').addEventListener('click', () => {
    playDone();
    dybRenderNewGameOverlay();
    document.getElementById('dyb-new-game-overlay').style.display = 'flex';
  });
  document.getElementById('btn-dyb-gameover-exit').addEventListener('click', () => {
    playExit();
    resetToLobby();
  });
  document.getElementById('btn-dyb-new-game-confirm').addEventListener('click', () => {
    playLaunch();
    document.getElementById('dyb-new-game-overlay').style.display = 'none';
    if (window.syllyMultiplayerMode !== 'single') {
      mpReturnToLobby();
      return;
    }
    dybResetMatchState();
    showScreen('screen-dyb-menu');
  });
  document.getElementById('btn-dyb-new-game-cancel').addEventListener('click', () => {
    playDone();
    document.getElementById('dyb-new-game-overlay').style.display = 'none';
  });

  // ── Sound buttons ─────────────────────────────────────────────────────────
  document.querySelectorAll('#screen-dyb-menu .btn-open-sound, #screen-dyb-seating .btn-open-sound, #screen-dyb-shake .btn-open-sound, #screen-dyb-table .btn-open-sound, #screen-dyb-showdown .btn-open-sound, #screen-dyb-gameover .btn-open-sound, #screen-dyb-spirit-board .btn-open-sound').forEach(btn => {
    btn.addEventListener('click', openSoundOverlay);
  });
});

// ── Settings listeners ────────────────────────────────────────────────────────
function dybInitSettingsListeners() {
  // Wildcards Style pills
  document.querySelectorAll('[data-dyb-wildcards]').forEach(pill => {
    pill.addEventListener('click', () => {
      playPillClick();
      document.querySelectorAll('[data-dyb-wildcards]').forEach(p => p.classList.remove('pill-active-stone'));
      pill.classList.add('pill-active-stone');
      dybWildcardsStyle = pill.dataset.dybWildcards;
      dybUpdateWildcardsDesc();
    });
  });

  // Starting Hand pills
  document.querySelectorAll('[data-dyb-hand]').forEach(pill => {
    pill.addEventListener('click', () => {
      playPillClick();
      document.querySelectorAll('[data-dyb-hand]').forEach(p => p.classList.remove('pill-active-stone'));
      pill.classList.add('pill-active-stone');
      dybStartingHand = parseInt(pill.dataset.dybHand);
    });
  });

  // Sylly Mode toggle
  document.getElementById('btn-dyb-sylly-toggle').addEventListener('click', () => {
    dybSyllyMode = !dybSyllyMode;
    const btn = document.getElementById('btn-dyb-sylly-toggle');
    btn.textContent = dybSyllyMode ? 'ON' : 'OFF';
    btn.className = dybSyllyMode
      ? 'game-toggle-on-stone shrink-0'
      : 'game-toggle-off shrink-0';
    document.getElementById('dyb-sylly-sub-options').style.display = dybSyllyMode ? 'block' : 'none';
    if (dybSyllyMode) { playSyllyOn(); } else { playSyllyOff(); }
  });

  // Intensity slider
  const intensitySlider = document.getElementById('dyb-sylly-intensity-slider');
  if (intensitySlider) {
    intensitySlider.addEventListener('input', () => {
      playSliderTick((parseInt(intensitySlider.value) - 5) * 20);
      dybSyllyIntensity = parseInt(intensitySlider.value);
      document.getElementById('dyb-sylly-intensity-label').textContent = `${dybSyllyIntensity}% chaos per die`;
    });
  }

  // Close settings
  document.getElementById('btn-dyb-settings-close').addEventListener('click', () => {
    playDone();
    document.getElementById('dyb-settings-overlay').style.display = 'none';
  });
}

function dybApplySettingsToUI() {
  // Wildcards Style pills
  document.querySelectorAll('[data-dyb-wildcards]').forEach(p => p.classList.remove('pill-active-stone'));
  const activeWild = document.querySelector(`[data-dyb-wildcards="${dybWildcardsStyle}"]`);
  if (activeWild) activeWild.classList.add('pill-active-stone');
  dybUpdateWildcardsDesc();

  // Starting Hand pills
  document.querySelectorAll('[data-dyb-hand]').forEach(p => p.classList.remove('pill-active-stone'));
  const activeHand = document.querySelector(`[data-dyb-hand="${dybStartingHand}"]`);
  if (activeHand) activeHand.classList.add('pill-active-stone');

  // Sylly Mode toggle
  const btn = document.getElementById('btn-dyb-sylly-toggle');
  btn.textContent = dybSyllyMode ? 'ON' : 'OFF';
  btn.className = dybSyllyMode ? 'game-toggle-on-stone shrink-0' : 'game-toggle-off shrink-0';
  document.getElementById('dyb-sylly-sub-options').style.display = dybSyllyMode ? 'block' : 'none';

  // Intensity slider
  const slider = document.getElementById('dyb-sylly-intensity-slider');
  if (slider) {
    slider.value = dybSyllyIntensity;
    document.getElementById('dyb-sylly-intensity-label').textContent = `${dybSyllyIntensity}% chaos per die`;
  }
}

function dybUpdateWildcardsDesc() {
  const desc = {
    strict:   "1s are just 1s — no wild business.",
    classic:  "1s count toward any face. Can't be directly alleged.",
    volatile: "1s are wild until someone bids them — then they strip and lock.",
  };
  const el = document.getElementById('dyb-wildcards-desc');
  if (el) el.textContent = desc[dybWildcardsStyle] || '';
}

// ── Session start ─────────────────────────────────────────────────────────────
function dybStartSession() {
  if (window.syllyMultiplayerMode === 'client') return; // client: wait for DYB_GAME_START
  dybShowSeating();
}

// ── Seating screen ────────────────────────────────────────────────────────────
function dybShowSeating() {
  dybRenderSeatingList();
  showScreen('screen-dyb-seating');
}

function dybRenderSeatingList() {
  const list = document.getElementById('dyb-seating-list');
  list.innerHTML = dybPlayerNames.map((name, i) => `
    <div class="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between">
      <span class="text-stone-700 font-semibold">${name || 'Player ' + (i + 1)}</span>
      <span class="text-stone-300 text-sm">ready</span>
    </div>
  `).join('');
}

// ── Game start (host only) ────────────────────────────────────────────────────
function dybStartGame() {
  // Assign random seat order
  const seats = Array.from({length: dybPlayerCount}, (_, i) => i + 1);
  const shuffled = shuffle(seats);
  dybSeatNumbers = shuffled;

  // Pick random opener
  dybCurrentOpenerIdx = Math.floor(Math.random() * dybPlayerCount);

  // Init dice in hand
  dybDiceInHand = Array(dybPlayerCount).fill(dybStartingHand);
  dybActivePlayers = Array.from({length: dybPlayerCount}, (_, i) => i);
  dybEliminationOrder = [];
  dybShakeNumber = 0;

  const payload = {
    action: 'DYB_GAME_START',
    playerNames: dybPlayerNames,
    seatNumbers: dybSeatNumbers,
    diceInHand: dybDiceInHand,
    firstOpenerIdx: dybCurrentOpenerIdx,
    wildcards: dybWildcardsStyle,
    startingHand: dybStartingHand,
    syllyMode: dybSyllyMode,
    syllyIntensity: dybSyllyIntensity,
  };
  mpSendEnvelope({ type: 'SYNC', payload });
  dybInitShake();
}

// ── Shake phase ───────────────────────────────────────────────────────────────
function dybInitShake() {
  dybShakeNumber++;
  dybMyRoll = [];
  dybSpecialTypes = [];
  dybSlickFaces = [];
  dybHandVisible = true;
  dybShakeReadyCheck = new Array(dybPlayerCount).fill(false);

  dybCurrentFace = 0;
  dybCurrentQty  = 0;
  dybOnesStripped = false;
  dybAllegationHistory = [];
  dybChallengerIdx = -1;
  dybAllRolls = [];
  dybAllSpecialTypes = [];
  dybAllSlickFaces = [];

  dybRenderShakeScreen();
  showScreen('screen-dyb-shake');
}

function dybRenderShakeScreen() {
  const myIdx = mpMyPlayerIdx;
  const openerName = dybPlayerNames[dybCurrentOpenerIdx] || 'Player';
  const isOpener = dybCurrentOpenerIdx === myIdx;

  document.getElementById('dyb-shake-opener-label').textContent = isOpener
    ? 'Your deal — open the table.'
    : `${openerName}'s deal.`;
  document.getElementById('dyb-shake-number').textContent = `Shake #${dybShakeNumber}`;

  // Show dice count per active player
  const diceRow = document.getElementById('dyb-shake-dice-counts');
  diceRow.innerHTML = dybActivePlayers.map(i => {
    const name = dybPlayerNames[i] || ('P' + (i + 1));
    const count = dybDiceInHand[i];
    return `<span class="text-stone-500 text-sm">${name}: ${count}</span>`;
  }).join('<span class="text-stone-300 mx-1">|</span>');

  // Reset roll state
  document.getElementById('btn-dyb-roll').disabled = false;
  document.getElementById('btn-dyb-roll').style.display = 'flex';
  document.getElementById('dyb-roll-waiting').style.display = 'none';
  document.getElementById('dyb-hand-dock-shake').innerHTML = '';
}

function dybDoRoll() {
  const count = dybDiceInHand[mpMyPlayerIdx];
  dybMyRoll = dybGenerateRoll(count);

  // Render hand
  dybRenderHandDock('dyb-hand-dock-shake');

  // Show roll button → ready button
  document.getElementById('btn-dyb-roll').style.display = 'none';
  document.getElementById('btn-dyb-roll-ready').disabled = false;
  document.getElementById('btn-dyb-roll-ready').style.display = 'flex';
}

function dybSubmitRoll() {
  const payload = {
    action: 'DYB_ROLL_SUBMIT',
    roll: dybMyRoll,
    specialTypes: dybSpecialTypes,
    slickFaces: dybSlickFaces,
  };
  mpLockSync();
  if (window.syllyMultiplayerMode === 'client') {
    mpSendEnvelope({ type: 'ACTION', payload });
  } else {
    // Host: record own roll and check ready
    dybRecordRoll(mpMyPlayerIdx, dybMyRoll, dybSpecialTypes, dybSlickFaces);
  }

  document.getElementById('btn-dyb-roll-ready').disabled = true;
  document.getElementById('dyb-roll-waiting').style.display = 'block';
}

function dybRecordRoll(playerIdx, roll, specialTypes, slickFaces) {
  dybAllRolls[playerIdx]        = roll;
  dybAllSpecialTypes[playerIdx] = specialTypes;
  dybAllSlickFaces[playerIdx]   = slickFaces;
  dybShakeReadyCheck[playerIdx] = true;

  if (dybActivePlayers.every(i => dybShakeReadyCheck[i])) {
    dybBroadcastShakeActive();
  }
}

function dybBroadcastShakeActive() {
  mpUnlockSync();
  // Broadcast to eliminated players (Spirit Board)
  mpSendEnvelope({
    type: 'SYNC',
    payload: {
      action: 'DYB_SPIRIT_SHAKE',
      allRolls:        dybAllRolls,
      allSpecialTypes: dybAllSpecialTypes,
      activePlayers:   dybActivePlayers,
      playerNames:     dybPlayerNames,
      diceInHand:      dybDiceInHand,
    },
  });
  // Advance active players to table
  mpSendEnvelope({
    type: 'SYNC',
    payload: { action: 'DYB_SHAKE_ACTIVE', openerIdx: dybCurrentOpenerIdx },
  });
  dybCurrentBidderIdx = dybCurrentOpenerIdx;
  dybRenderTableScreen();
  showScreen('screen-dyb-table');
}

// ── Table phase ───────────────────────────────────────────────────────────────
function dybRenderTableScreen() {
  const myIdx = mpMyPlayerIdx;
  const isMyTurn = dybCurrentBidderIdx === myIdx;
  const bidderName = dybPlayerNames[dybCurrentBidderIdx] || 'Player';

  // Player pip row
  const pipRow = document.getElementById('dyb-pip-row');
  pipRow.innerHTML = dybActivePlayers.map(i => {
    const name = dybPlayerNames[i] || ('P' + (i + 1));
    const count = dybDiceInHand[i];
    const isActive = i === dybCurrentBidderIdx;
    return `<div class="flex flex-col items-center gap-0.5 ${isActive ? 'opacity-100' : 'opacity-40'}">
      <span class="text-xs font-semibold ${isActive ? 'text-stone-800' : 'text-stone-400'}">${name}</span>
      <span class="text-base">${'■'.repeat(count)}</span>
    </div>`;
  }).join('');

  // Current allegation
  if (dybCurrentFace === 0) {
    document.getElementById('dyb-allegation-display').textContent = 'No bid yet.';
  } else {
    document.getElementById('dyb-allegation-display').textContent =
      `${dybCurrentQty} × [${dybCurrentFace}]`;
  }

  // Last bidder label
  document.getElementById('dyb-last-bidder-label').textContent =
    dybAllegationHistory.length > 0
      ? `${bidderName} alleged ${dybCurrentQty} × ${dybCurrentFace}.`
      : '';

  // Turn label
  document.getElementById('dyb-turn-label').textContent = isMyTurn
    ? 'Your turn.'
    : `Waiting for ${bidderName}…`;

  // Show/hide controls
  const controls = document.getElementById('dyb-bid-controls');
  const waiting  = document.getElementById('dyb-waiting-label');
  controls.style.display = isMyTurn ? 'flex' : 'none';
  waiting.style.display  = isMyTurn ? 'none' : 'block';

  if (isMyTurn) {
    dybRenderBidPicker();
  }

  // Hand dock
  dybRenderHandDock('dyb-hand-dock-table');

  // Allegation history (last 3)
  dybRenderAllegationHistory();
}

function dybRenderBidPicker() {
  // Compute legal face range
  const minFace = dybOnesStripped ? 1
    : (dybWildcardsStyle === 'classic' ? 2 : 1);
  const maxFace = dybOnesStripped ? 1 : 6;

  // If no bid yet, start at minFace; else current face or higher
  let selectedFace = dybCurrentFace === 0 ? minFace : dybCurrentFace;
  if (selectedFace < minFace) selectedFace = minFace;
  if (selectedFace > maxFace) selectedFace = maxFace;

  const minQty = dybCurrentQty + (selectedFace === dybCurrentFace ? 1 : 0);
  const selectedQty = Math.max(dybCurrentQty, minQty);

  document.getElementById('dyb-face-display').textContent = selectedFace;
  document.getElementById('dyb-qty-display').textContent  = selectedQty;

  // Store current picker values in data attrs for adjustment functions
  const picker = document.getElementById('dyb-bid-controls');
  picker.dataset.face = selectedFace;
  picker.dataset.qty  = selectedQty;

  dybUpdateBidButtonState();
}

function dybAdjustFacePicker(delta) {
  const picker = document.getElementById('dyb-bid-controls');
  const minFace = dybOnesStripped ? 1 : (dybWildcardsStyle === 'classic' ? 2 : 1);
  const maxFace = dybOnesStripped ? 1 : 6;

  let face = parseInt(picker.dataset.face) + delta;
  face = Math.max(minFace, Math.min(maxFace, face));
  picker.dataset.face = face;
  document.getElementById('dyb-face-display').textContent = face;

  // Recompute min qty for new face
  const minQty = dybCurrentQty + (face === dybCurrentFace ? 1 : 0);
  let qty = Math.max(parseInt(picker.dataset.qty), minQty);
  picker.dataset.qty = qty;
  document.getElementById('dyb-qty-display').textContent = qty;

  dybUpdateBidButtonState();
}

function dybAdjustQtyPicker(delta) {
  const picker = document.getElementById('dyb-bid-controls');
  const face = parseInt(picker.dataset.face);
  const minQty = dybCurrentQty + (face === dybCurrentFace ? 1 : 0);

  let qty = parseInt(picker.dataset.qty) + delta;
  qty = Math.max(minQty, qty);
  picker.dataset.qty = qty;
  document.getElementById('dyb-qty-display').textContent = qty;

  dybUpdateBidButtonState();
}

function dybUpdateBidButtonState() {
  const picker = document.getElementById('dyb-bid-controls');
  const face = parseInt(picker.dataset.face);
  const qty  = parseInt(picker.dataset.qty);
  const minFace = dybOnesStripped ? 1 : (dybWildcardsStyle === 'classic' ? 2 : 1);

  const isLegal = face >= minFace
    && (face > dybCurrentFace || (face === dybCurrentFace && qty > dybCurrentQty))
    && qty >= dybCurrentQty;

  document.getElementById('btn-dyb-raise').disabled = !isLegal;

  // Call Bluff only allowed when there's an active bid
  document.getElementById('btn-dyb-call-bluff').disabled = dybCurrentFace === 0;
}

function dybSubmitAllegation() {
  const picker = document.getElementById('dyb-bid-controls');
  const face = parseInt(picker.dataset.face);
  const qty  = parseInt(picker.dataset.qty);

  mpLockSync();
  const payload = { action: 'DYB_ALLEGATION', face, qty };

  if (window.syllyMultiplayerMode === 'client') {
    mpSendEnvelope({ type: 'ACTION', payload });
    return;
  }
  // Host: process directly
  dybProcessAllegation(mpMyPlayerIdx, face, qty);
}

function dybProcessAllegation(fromIdx, face, qty) {
  dybCurrentFace = face;
  dybCurrentQty  = qty;
  dybAllegationHistory.push({ playerIdx: fromIdx, qty, face });

  // Volatile Wilds — strip 1s if face === 1
  if (dybWildcardsStyle === 'volatile' && face === 1) {
    dybOnesStripped = true;
  }

  // Compute real count for Spirit Board bluff flag
  const realCount = dybComputeRealCount(face);
  const allegationExceedsReal = qty > realCount;

  // Next bidder: next in activePlayers after current
  const curPos = dybActivePlayers.indexOf(dybCurrentBidderIdx);
  const nextPos = (curPos + 1) % dybActivePlayers.length;
  dybCurrentBidderIdx = dybActivePlayers[nextPos];

  mpUnlockSync();
  mpSendEnvelope({
    type: 'SYNC',
    payload: {
      action: 'DYB_ALLEGATION_SYNC',
      face, qty,
      bidderIdx:   fromIdx,
      nextBidderIdx: dybCurrentBidderIdx,
      onesStripped: dybOnesStripped,
      allegationExceedsReal,
    },
  });

  dybRenderTableScreen();
}

function dybCallBluff() {
  mpLockSync();
  const payload = { action: 'DYB_CALL_BLUFF' };

  if (window.syllyMultiplayerMode === 'client') {
    mpSendEnvelope({ type: 'ACTION', payload });
    return;
  }
  dybProcessCallBluff(mpMyPlayerIdx);
}

function dybProcessCallBluff(challengerIdx) {
  dybChallengerIdx = challengerIdx;
  dybResolveShowdown();
}

// ── Showdown ──────────────────────────────────────────────────────────────────
function dybResolveShowdown() {
  const face    = dybCurrentFace;
  const claimed = dybCurrentQty;
  const real    = dybComputeRealCount(face);
  // dybCurrentBidderIdx has already advanced to the caller — use history for actual last bidder
  const lastBid      = dybAllegationHistory[dybAllegationHistory.length - 1];
  const bidderIdx    = lastBid ? lastBid.playerIdx : dybCurrentOpenerIdx;
  const challengerIdx = dybChallengerIdx;

  // loser: bidder if real < claimed, else challenger
  const loserIdx = real < claimed ? bidderIdx : challengerIdx;

  dybDiceInHand[loserIdx]--;
  let eliminatedIdx = -1;
  if (dybDiceInHand[loserIdx] <= 0) {
    dybDiceInHand[loserIdx] = 0;
    dybEliminationOrder.push(loserIdx);
    dybActivePlayers = dybActivePlayers.filter(i => i !== loserIdx);
    eliminatedIdx = loserIdx;
  }

  // Next opener = loser (or next active if eliminated)
  if (eliminatedIdx === -1) {
    dybCurrentOpenerIdx = loserIdx;
  } else if (dybActivePlayers.length > 0) {
    dybCurrentOpenerIdx = dybActivePlayers[0];
  }

  const gameOver = dybActivePlayers.length <= 1;

  const syncPayload = {
    action: 'DYB_SHOWDOWN',
    face, claimed, real,
    loserIdx,
    eliminatedIdx,
    newDiceInHand: [...dybDiceInHand],
    allRolls: dybAllRolls,
    allSpecialTypes: dybAllSpecialTypes,
    allSlickFaces: dybAllSlickFaces,
    playerNames: dybPlayerNames,
    gameOver,
    winnerIdx: gameOver && dybActivePlayers.length === 1 ? dybActivePlayers[0] : -1,
    eliminationOrder: [...dybEliminationOrder],
  };

  mpUnlockSync();
  mpSendEnvelope({ type: 'SYNC', payload: syncPayload });

  dybApplyShowdown(syncPayload);
}

function dybApplyShowdown(data) {
  dybDiceInHand = data.newDiceInHand;
  dybActivePlayers = dybActivePlayers.filter(i => dybDiceInHand[i] > 0);
  if (data.eliminatedIdx !== -1) {
    dybEliminationOrder = [...data.eliminationOrder];
  }
  dybAllRolls        = data.allRolls        || dybAllRolls;
  dybAllSpecialTypes = data.allSpecialTypes || dybAllSpecialTypes;
  dybAllSlickFaces   = data.allSlickFaces   || dybAllSlickFaces;

  showScreen('screen-dyb-showdown');
  dybRenderShowdownScreen(data, () => {
    if (data.gameOver && window.syllyMultiplayerMode !== 'client') {
      setTimeout(() => { // pause after tally animation before advancing to gameover
        const goPayload = {
          action: 'DYB_GAMEOVER',
          winnerIdx: data.winnerIdx,
          eliminationOrder: data.eliminationOrder,
          playerNames: dybPlayerNames,
          finalDiceInHand: dybDiceInHand,
        };
        mpSendEnvelope({ type: 'SYNC', payload: goPayload });
        dybShowGameover(goPayload);
      }, 1500);
    }
  });
}

function dybRenderShowdownScreen(data, onDone) {
  const faceName   = data.face;
  const claimed    = data.claimed;
  const real       = data.real;
  const held       = real >= claimed;
  const loserName  = data.playerNames[data.loserIdx] || 'Player';
  const eliminated = data.eliminatedIdx !== -1;

  document.getElementById('dyb-showdown-claimed').textContent = `Claimed: ${claimed} × [${faceName}]`;
  document.getElementById('dyb-showdown-real').textContent    = 'Counting…';
  document.getElementById('dyb-showdown-verdict').textContent = '';
  document.getElementById('dyb-showdown-loser').textContent   = '';

  dybRenderAllHandsOnShowdown(); // reveal all hands immediately — the cup is slammed

  // Hide action buttons until animation completes
  document.getElementById('btn-dyb-next-shake').style.display          = 'none';
  document.getElementById('dyb-showdown-client-waiting').style.display = 'none';

  const reveal = () => {
    document.getElementById('dyb-showdown-verdict').textContent = held ? 'CLAIM HOLDS' : 'BLUFF CALLED';
    document.getElementById('dyb-showdown-verdict').className   = held
      ? 'text-2xl font-bold text-stone-700'
      : 'text-2xl font-bold text-red-600';
    document.getElementById('dyb-showdown-loser').textContent =
      eliminated ? `${loserName} is out!` : `${loserName} loses a die.`;
    playBoing();
    if (window.syllyMultiplayerMode !== 'client') {
      document.getElementById('btn-dyb-next-shake').style.display = data.gameOver ? 'none' : 'flex';
    } else {
      document.getElementById('dyb-showdown-client-waiting').style.display = 'block';
    }
    if (onDone) onDone();
  };

  if (real <= 0) {
    setTimeout(reveal, 600); // no count to animate — short pause before verdict
    return;
  }

  let count = 0;
  const step = () => {
    count++;
    document.getElementById('dyb-showdown-real').textContent = `Real count: ${count}`;
    playTick();
    if (count < real) {
      setTimeout(step, 400); // 400ms per tick
    } else {
      setTimeout(reveal, 200); // brief pause after final tick before verdict
    }
  };
  setTimeout(step, 400); // initial 400ms before first tick
}

function dybRenderAllHandsOnShowdown() {
  const container = document.getElementById('dyb-showdown-hands');
  container.innerHTML = '';
  for (let i = 0; i < dybPlayerCount; i++) {
    if (!dybAllRolls[i]) continue;
    const name = dybPlayerNames[i] || ('P' + (i + 1));
    const roll = dybAllRolls[i];
    const types = dybAllSpecialTypes[i] || [];
    const slicks = dybAllSlickFaces[i] || [];
    const diceHtml = roll.map((val, j) => {
      const type = types[j] || 'standard';
      return dybDieHTML(val, type, slicks[j] || -1, true);
    }).join('');
    container.innerHTML += `
      <div class="bg-white rounded-2xl p-3 shadow-sm">
        <p class="text-xs font-semibold text-stone-500 mb-2">${name}</p>
        <div class="flex gap-2 flex-wrap">${diceHtml}</div>
      </div>`;
  }
}

function dybAdvanceFromShowdown() {
  // Host only — advance to next shake
  dybInitShake();
  mpSendEnvelope({
    type: 'SYNC',
    payload: {
      action: 'DYB_NEXT_SHAKE',
      nextOpenerIdx: dybCurrentOpenerIdx,
      activePlayers: dybActivePlayers,
      diceInHand:    dybDiceInHand,
    },
  });
}

// ── Gameover ──────────────────────────────────────────────────────────────────
function dybShowGameover(data) {
  const winnerName = data.playerNames[data.winnerIdx] || 'Player';
  document.getElementById('dyb-gameover-winner').textContent = `${winnerName} wins!`;

  const order = [...data.eliminationOrder].reverse();
  const standingsEl = document.getElementById('dyb-gameover-standings');
  standingsEl.innerHTML = '';

  const positions = [data.winnerIdx, ...order.reverse()];
  positions.forEach((pIdx, rank) => {
    const name = data.playerNames[pIdx] || ('P' + (pIdx + 1));
    standingsEl.innerHTML += `
      <div class="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between">
        <span class="text-stone-500 text-sm font-medium">${rank + 1}${rank === 0 ? ' \u{1F3C6}' : ''}</span>
        <span class="text-stone-800 font-semibold">${name}</span>
      </div>`;
  });

  playSuccess();
  showScreen('screen-dyb-gameover');
}

function dybRenderNewGameOverlay() {
  const confirmBtn = document.getElementById('btn-dyb-new-game-confirm');
  if (window.syllyMultiplayerMode === 'host') {
    confirmBtn.textContent = 'Restart in Lobby \u{1F504}';
  } else if (window.syllyMultiplayerMode === 'client') {
    confirmBtn.textContent = 'Leave Session';
  } else {
    confirmBtn.textContent = 'Roll Again \u{1F3B2}';
  }
}

// ── Spirit Board ──────────────────────────────────────────────────────────────
function dybShowSpiritBoard() {
  showScreen('screen-dyb-spirit-board');
}

function dybRenderSpiritBoard(allRolls, allSpecialTypes, activePlayers, playerNames, diceInHand) {
  const grid = document.getElementById('dyb-spirit-grid');
  grid.innerHTML = '';
  activePlayers.forEach(i => {
    const name  = playerNames[i] || ('P' + (i + 1));
    const roll  = allRolls[i] || [];
    const types = allSpecialTypes[i] || [];
    const diceHtml = roll.map((val, j) => dybDieHTML(val, types[j] || 'standard', -1, true)).join('');
    grid.innerHTML += `
      <div id="dyb-spirit-row-${i}" class="bg-white rounded-2xl p-3 shadow-sm">
        <p class="text-xs font-semibold text-stone-500 mb-2">${name} (${diceInHand[i]} left)</p>
        <div class="flex gap-2 flex-wrap">${diceHtml}</div>
      </div>`;
  });
}

function dybSpiritFlashRow(playerIdx) {
  const row = document.getElementById(`dyb-spirit-row-${playerIdx}`);
  if (!row) return;
  row.classList.remove('dyb-spirit-flash');
  void row.offsetWidth; // force reflow
  row.classList.add('dyb-spirit-flash');
}

function dybUpdateSpiritAllegation(qty, face) {
  const el = document.getElementById('dyb-spirit-allegation');
  if (el) el.textContent = `Current bid: ${qty} × [${face}]`;
}

// ── Dice generation ───────────────────────────────────────────────────────────
function dybGenerateRoll(count) {
  const roll = Array.from({length: count}, () => Math.floor(Math.random() * 6) + 1);

  if (!dybSyllyMode) {
    dybSpecialTypes = Array(count).fill('standard');
    dybSlickFaces   = Array(count).fill(-1);
    return roll;
  }

  const specialRate = dybSyllyIntensity / 100;
  const typeOrder   = ['loaded', 'phantom', 'slick', 'cracked', 'snake'];
  dybSpecialTypes = roll.map(() => {
    const r = Math.random();
    for (let i = 0; i < typeOrder.length; i++) {
      if (r < specialRate * (i + 1)) return typeOrder[i];
    }
    return 'standard';
  });
  dybSlickFaces = dybSpecialTypes.map(t => t === 'slick' ? -1 : -1);
  return roll;
}

// Compute real count of a face value across all rolls
function dybComputeRealCount(face) {
  const wildOnes = dybWildcardsStyle !== 'strict' && !dybOnesStripped;
  let total = 0;

  for (let pIdx = 0; pIdx < dybPlayerCount; pIdx++) {
    const roll  = dybAllRolls[pIdx]        || [];
    const types = dybAllSpecialTypes[pIdx] || [];
    const slicks = dybAllSlickFaces[pIdx]  || [];

    roll.forEach((val, j) => {
      const type = types[j] || 'standard';
      const matchesFace = val === face || (wildOnes && val === 1 && face !== 1);

      if (type === 'cracked') return; // counts 0
      if (type === 'slick') {
        const assigned = slicks[j] !== undefined ? slicks[j] : -1;
        if (assigned === face) total += 1;
        return;
      }
      if (type === 'snake') {
        if (matchesFace) total -= 1;
        return;
      }
      if (type === 'loaded') {
        if (matchesFace) total += 2;
        return;
      }
      // standard or phantom — counts normally
      if (matchesFace) total += 1;
    });
  }

  return total;
}

// ── Hand dock rendering ───────────────────────────────────────────────────────
function dybRenderHandDock(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = dybMyRoll.map((val, i) => {
    const type  = dybSpecialTypes[i] || 'standard';
    const slick = dybSlickFaces[i]   || -1;
    return dybDieHTML(val, type, slick, dybHandVisible, i);
  }).join('');

  // Slick die tap handlers
  if (dybSyllyMode) {
    dybMyRoll.forEach((_, i) => {
      const el = document.getElementById(`dyb-die-${i}`);
      if (el && dybSpecialTypes[i] === 'slick') {
        el.addEventListener('click', () => dybOpenSlickPicker(i));
      }
    });
  }
}

function dybDieHTML(val, type, slickFace, visible, dieIdx = -1) {
  const faces = ['⚀','⚁','⚂','⚃','⚄','⚅']; // die face symbols
  let bg      = 'bg-stone-100 text-stone-700';
  let display = visible ? (faces[val - 1] || val) : '●';
  const idAttr = dieIdx >= 0 ? ` id="dyb-die-${dieIdx}"` : '';

  if (!visible) {
    return `<div${idAttr} class="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold ${bg} select-none">${display}</div>`;
  }

  switch (type) {
    case 'loaded':
      bg = 'bg-amber-100 text-amber-700 ring-2 ring-amber-400';
      break;
    case 'phantom':
      display = '?';
      bg = 'bg-stone-200 text-stone-400 italic';
      break;
    case 'slick':
      display = slickFace > 0 ? (faces[slickFace - 1] || slickFace) : '—';
      bg = 'bg-blue-50 text-blue-600 ring-2 ring-blue-300 cursor-pointer';
      break;
    case 'cracked':
      bg = 'bg-stone-50 text-stone-300 line-through';
      break;
    case 'snake':
      bg = 'bg-red-100 text-red-700';
      break;
  }

  return `<div${idAttr} class="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold ${bg} select-none">${display}</div>`;
}

function dybRenderHandVeil() {
  const icon = document.getElementById('btn-dyb-hand-veil');
  const icon2 = document.getElementById('btn-dyb-table-veil');
  if (icon)  icon.textContent  = dybHandVisible ? '👁️' : '👁️‍🗨️';
  if (icon2) icon2.textContent = dybHandVisible ? '👁️' : '👁️‍🗨️';
  dybRenderHandDock('dyb-hand-dock-shake');
  dybRenderHandDock('dyb-hand-dock-table');
}

function dybOpenSlickPicker(dieIdx) {
  dybSlickPickerDie = dieIdx;
  // Simple inline: show a small face-picker modal
  const faces = ['1','2','3','4','5','6'];
  const options = faces.map((f, i) =>
    `<button onclick="dybAssignSlickFace(${dieIdx},${i+1})" class="w-10 h-10 rounded-xl bg-stone-100 text-stone-700 font-bold text-base active:scale-90 transition-transform">${f}</button>`
  ).join('');
  document.getElementById('dyb-slick-picker-content').innerHTML = options;
  document.getElementById('dyb-slick-picker-overlay').style.display = 'flex';
}

function dybAssignSlickFace(dieIdx, face) {
  dybSlickFaces[dieIdx] = face;
  document.getElementById('dyb-slick-picker-overlay').style.display = 'none';
  dybRenderHandDock('dyb-hand-dock-table');
}

function dybRenderAllegationHistory() {
  const el = document.getElementById('dyb-allegation-history');
  if (!el) return;
  const recent = dybAllegationHistory.slice(-3);
  el.innerHTML = recent.map(h => {
    const name = dybPlayerNames[h.playerIdx] || ('P' + (h.playerIdx + 1));
    return `<p class="text-stone-400 text-sm">${name}: ${h.qty} × [${h.face}]</p>`;
  }).join('');
}

// ── Match reset ───────────────────────────────────────────────────────────────
function dybResetMatchState() {
  dybDiceInHand       = [];
  dybActivePlayers    = [];
  dybCurrentOpenerIdx = 0;
  dybShakeNumber      = 0;
  dybEliminationOrder = [];
  dybShakeReadyCheck  = [];
  dybAllRolls         = [];
  dybAllSpecialTypes  = [];
  dybAllSlickFaces    = [];
  dybCurrentFace      = 0;
  dybCurrentQty       = 0;
  dybCurrentBidderIdx = 0;
  dybChallengerIdx    = -1;
  dybOnesStripped     = false;
  dybAllegationHistory = [];
  dybMyRoll           = [];
  dybSpecialTypes     = [];
  dybSlickFaces       = [];
}

// ── Multiplayer envelope handler ──────────────────────────────────────────────
function dybHandleEnvelope(env) {
  const { type, payload } = env;

  if (type === 'ACTION') {
    if (window.syllyMultiplayerMode !== 'host') return;

    switch (payload.action) {
      case 'DYB_ROLL_SUBMIT':
        dybRecordRoll(env.originIdx, payload.roll, payload.specialTypes || [], payload.slickFaces || []);
        break;

      case 'DYB_ALLEGATION':
        if (env.originIdx !== dybCurrentBidderIdx) return; // stale action
        dybProcessAllegation(env.originIdx, payload.face, payload.qty);
        break;

      case 'DYB_CALL_BLUFF':
        if (env.originIdx !== dybCurrentBidderIdx) return;
        dybProcessCallBluff(env.originIdx);
        break;
    }
    return;
  }

  if (type === 'SYNC') {
    switch (payload.action) {
      case 'DYB_GAME_START':
        dybPlayerNames      = payload.playerNames;
        dybSeatNumbers      = payload.seatNumbers;
        dybDiceInHand       = payload.diceInHand;
        dybCurrentOpenerIdx = payload.firstOpenerIdx;
        dybWildcardsStyle   = payload.wildcards;
        dybStartingHand     = payload.startingHand;
        dybSyllyMode        = payload.syllyMode;
        dybSyllyIntensity   = payload.syllyIntensity;
        dybPlayerCount      = payload.playerNames.length;
        dybActivePlayers    = Array.from({length: dybPlayerCount}, (_, i) => i);
        dybEliminationOrder = [];
        dybShakeNumber      = 0;
        dybInitShake();
        break;

      case 'DYB_SHAKE_ACTIVE':
        if (!dybActivePlayers.includes(mpMyPlayerIdx)) return; // eliminated — stay on Spirit Board
        dybCurrentBidderIdx = payload.openerIdx;
        dybCurrentOpenerIdx = payload.openerIdx;
        mpUnlockSync();
        dybRenderTableScreen();
        showScreen('screen-dyb-table');
        break;

      case 'DYB_SPIRIT_SHAKE':
        // Only renders on spirit board devices
        if (dybActivePlayers.includes(mpMyPlayerIdx)) return;
        dybRenderSpiritBoard(
          payload.allRolls, payload.allSpecialTypes,
          payload.activePlayers, payload.playerNames, payload.diceInHand
        );
        dybShowSpiritBoard();
        break;

      case 'DYB_ALLEGATION_SYNC':
        dybCurrentFace      = payload.face;
        dybCurrentQty       = payload.qty;
        dybCurrentBidderIdx = payload.nextBidderIdx;
        dybOnesStripped     = payload.onesStripped;
        dybAllegationHistory.push({ playerIdx: payload.bidderIdx, qty: payload.qty, face: payload.face });
        mpUnlockSync();

        if (!dybActivePlayers.includes(mpMyPlayerIdx)) {
          // Spirit Board
          if (payload.allegationExceedsReal) dybSpiritFlashRow(payload.bidderIdx);
          dybUpdateSpiritAllegation(payload.qty, payload.face);
        } else {
          dybRenderTableScreen();
        }
        break;

      case 'DYB_SHOWDOWN':
        dybApplyShowdown(payload);
        break;

      case 'DYB_NEXT_SHAKE':
        dybCurrentOpenerIdx = payload.nextOpenerIdx;
        dybActivePlayers    = payload.activePlayers;
        dybDiceInHand       = payload.diceInHand;
        dybInitShake();
        break;

      case 'DYB_GAMEOVER':
        dybShowGameover(payload);
        break;
    }
  }
}
