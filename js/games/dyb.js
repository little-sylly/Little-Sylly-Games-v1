// ═══════════════════════════════════════════════════════════════════════════
// THE BLUFF (DYB)
// Trust no one, count every face.
// Depends on: engine.js (showScreen, play*, resetToLobby, allScreens),
//             engine-multiplayer.js (mpSendEnvelope, mpLockSync, mpUnlockSync,
//                                    mpReturnToLobby, mpPlayerSlots,
//                                    window.syllyMultiplayerMode, mpMyPlayerIdx)
// ═══════════════════════════════════════════════════════════════════════════

// ── Settings (persist between play-agains) ───────────────────────────────────
let dybWildcardsStyle  = 'classic'; // 'strict' | 'classic' | 'volatile'
let dybStartingHand    = 5;         // 3 | 4 | 5
let dybFootholdsMode   = false;     // OFF by default — lose a foothold instead of a die
let dybFootholdsCount  = 5;         // 3 | 5 | 10 (lives per player in foothold mode)
let dybSyllyMode       = false;
let dybSyllyIntensity  = 5;         // 5–10 (% per special die type)

// ── Roster (from mpPlayerSlots; persists across play-agains) ─────────────────
let dybPlayerCount = 0;
let dybPlayerNames = []; // string[N]
let dybSeatNumbers = []; // int[N] — seatNumbers[playerIdx] = seat (1..N)

// ── Match state (reset each play-again) ──────────────────────────────────────
let dybDiceInHand       = []; // int[N] — dice per shake (constant in foothold mode)
let dybLives            = []; // int[N] — footholds remaining (foothold mode only)
let dybActivePlayers    = []; // int[] — playerIdx of non-eliminated players
let dybCurrentOpenerIdx = 0;  // who opens the next Shake
let dybShakeNumber      = 0;
let dybEliminationOrder = []; // int[] — playerIdx in elimination order

// ── Summit stats (accumulated by host; sent in DYB_GAMEOVER payload) ─────────
let dybClashWins   = []; // int[N] — showdown wins per player
let dybClashLosses = []; // int[N] — showdown losses per player
let dybFaceFreq    = []; // int[N][7] — raw face roll frequency (indices 1–6)
let dybShakeLogs   = []; // {shakeNum, bids:{playerIdx,qty,face}[], conclusion}[]
let dybAllShakeLogs = []; // set from gameover payload for Chronicle rendering
let dybChronicleIdx = 0; // current Chronicle page

// ── Shake state (reset each Shake) ───────────────────────────────────────────
let dybShakeReadyCheck = []; // bool[N] — true when player submitted their roll
let dybAllRolls        = []; // int[][] — host only; all players' dice this shake
let dybAllSpecialTypes = []; // string[][] — host only; per-player special types
let dybAllSlickFaces   = []; // int[][] — host only; per-player slick assignments
let dybAllPhantomTypes = []; // (string|null)[][] — host only; secondary type per phantom die

// ── Round state (reset each Shake) ───────────────────────────────────────────
let dybCurrentFace       = 0;     // current alleged face (0 = no bid yet)
let dybCurrentQty        = 0;     // current alleged quantity (0 = no bid yet)
let dybCurrentBidderIdx  = 0;     // whose turn it is to bid or challenge
let dybChallengerIdx     = -1;    // set when DYB_CALL_BLUFF received
let dybOnesStripped      = false; // Volatile Wilds: true after 1s directly alleged
let dybAllegationHistory = [];    // {playerIdx, qty, face}[]

// ── Per-device roll state (private; not broadcast until showdown) ─────────────
let dybMyRoll        = []; // int[] — this device's current dice values
let dybSpecialTypes  = []; // string[] — die types for this device's roll
let dybSlickFaces    = []; // int[] — current face per die (-1 = hidden/unknown, Slick only)
let dybSlickAssigned = []; // bool[] — true if player has exercised their one-time Slick change
let dybPhantomTypes  = []; // (string|null)[] — secondary type per phantom die (null = pure phantom)

// ── UI state ─────────────────────────────────────────────────────────────────
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
    dybOpenHowTo();
  });
  // Tab bar — every opener routes through dybOpenHowTo so the pill state can never
  // disagree with which body is showing.
  document.querySelectorAll('[data-dyb-howto-tab]').forEach(b => {
    b.addEventListener('click', () => { playPillClick(); dybSetHowToTab(b.dataset.dybHowtoTab); });
  });
  const dybCloseDice = document.getElementById('btn-dyb-howto-close-dice');
  if (dybCloseDice) dybCloseDice.addEventListener('click', () => {
    playDone();
    document.getElementById('dyb-how-to-overlay').style.display = 'none';
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
    document.getElementById('dyb-quit-overlay').style.display = 'none';
    // MDLM quit contract (PASS pattern): a client leaving mid-game must tell the host,
    // which dissolves the match for every remaining device — resetToLobby() alone only
    // tears down THIS device's view.
    if (window.syllyMultiplayerMode === 'client') {
      mpSendEnvelope({ type: 'ACTION', payload: { action: 'DYB_PLAYER_LEFT', playerIdx: mpMyPlayerIdx } });
    }
    resetToLobby();
  });
  document.getElementById('btn-dyb-quit-cancel').addEventListener('click', () => {
    playDone();
    document.getElementById('dyb-quit-overlay').style.display = 'none';
  });

  // ── How-to button in gameplay header (table screen)
  document.getElementById('btn-dyb-how-to').addEventListener('click', () => {
    playDone();
    dybOpenHowTo();
  });

  // ── How-to button in shake screen header
  document.getElementById('btn-dyb-shake-how-to').addEventListener('click', () => {
    playDone();
    dybOpenHowTo();
  });

  // ── Tempest guide [?] — shake screen
  document.getElementById('btn-dyb-tempest-guide').addEventListener('click', () => {
    playDone();
    dybShowTempestGuide();
  });

  // ── Tempest guide [?] — table screen "Your Hand" label
  document.getElementById('btn-dyb-hand-tip').addEventListener('click', () => {
    playDone();
    dybShowTempestGuide();
  });

  // ── Tip overlay close
  document.getElementById('btn-dyb-tip-close').addEventListener('click', () => {
    playDone();
    document.getElementById('dyb-tip-overlay').style.display = 'none';
  });

  // ── Ascent overlay
  document.getElementById('btn-dyb-ascent-open').addEventListener('click', () => {
    playDone();
    dybRenderAscentHistory();
    document.getElementById('dyb-ascent-overlay').style.display = 'flex';
  });
  document.getElementById('btn-dyb-ascent-close').addEventListener('click', () => {
    playDone();
    document.getElementById('dyb-ascent-overlay').style.display = 'none';
  });

  // ── Seating screen
  document.getElementById('btn-dyb-start-game').addEventListener('click', () => {
    playLaunch();
    dybStartGame();
  });

  // ── Shake screen
  document.getElementById('dyb-shake-cup-area').addEventListener('click', () => {
    if (dybMyRoll && dybMyRoll.length) return;
    playWhoosh();
    dybHandleCupTap();
  });
  document.getElementById('btn-dyb-ready').addEventListener('click', () => {
    playDone();
    dybSubmitRoll();
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

  // ── Chronicle nav ─────────────────────────────────────────────────────────
  document.getElementById('btn-dyb-chronicle-prev').addEventListener('click', () => {
    if (dybChronicleIdx > 0) { dybChronicleIdx--; dybRenderChronicle(); }
  });
  document.getElementById('btn-dyb-chronicle-next').addEventListener('click', () => {
    if (dybChronicleIdx < dybAllShakeLogs.length - 1) { dybChronicleIdx++; dybRenderChronicle(); }
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
      document.querySelectorAll('[data-dyb-wildcards]').forEach(p => p.classList.remove('pill-active-dyb'));
      pill.classList.add('pill-active-dyb');
      dybWildcardsStyle = pill.dataset.dybWildcards;
      dybUpdateWildcardsDesc();
    });
  });

  // Starting Hand pills
  document.querySelectorAll('[data-dyb-hand]').forEach(pill => {
    pill.addEventListener('click', () => {
      playPillClick();
      document.querySelectorAll('[data-dyb-hand]').forEach(p => p.classList.remove('pill-active-dyb'));
      pill.classList.add('pill-active-dyb');
      dybStartingHand = parseInt(pill.dataset.dybHand);
    });
  });

  // Footholds toggle
  document.getElementById('btn-dyb-footholds-toggle').addEventListener('click', () => {
    dybFootholdsMode = !dybFootholdsMode;
    const btn = document.getElementById('btn-dyb-footholds-toggle');
    btn.textContent = dybFootholdsMode ? 'ON' : 'OFF';
    btn.className = dybFootholdsMode ? 'game-toggle-on-dyb shrink-0' : 'game-toggle-off shrink-0';
    document.getElementById('dyb-footholds-sub-options').style.display = dybFootholdsMode ? 'flex' : 'none';
    if (dybFootholdsMode) { playPillClick(); } else { playPillClick(); }
  });

  // Footholds count pills
  document.querySelectorAll('[data-dyb-footholds]').forEach(pill => {
    pill.addEventListener('click', () => {
      playPillClick();
      document.querySelectorAll('[data-dyb-footholds]').forEach(p => p.classList.remove('pill-active-dyb'));
      pill.classList.add('pill-active-dyb');
      dybFootholdsCount = parseInt(pill.dataset.dybFootholds);
    });
  });

  // Sylly Mode toggle
  document.getElementById('btn-dyb-sylly-toggle').addEventListener('click', () => {
    dybSyllyMode = !dybSyllyMode;
    const btn = document.getElementById('btn-dyb-sylly-toggle');
    btn.textContent = dybSyllyMode ? 'ON' : 'OFF';
    btn.className = dybSyllyMode
      ? 'game-toggle-on-dyb shrink-0'
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

  // Tempest guide tip
  document.getElementById('btn-dyb-settings-tempest-tip').addEventListener('click', () => {
    dybShowTempestGuide();
  });

  // Close settings
  document.getElementById('btn-dyb-settings-close').addEventListener('click', () => {
    playDone();
    document.getElementById('dyb-settings-overlay').style.display = 'none';
  });
}

function dybApplySettingsToUI() {
  // Wildcards Style pills
  document.querySelectorAll('[data-dyb-wildcards]').forEach(p => p.classList.remove('pill-active-dyb'));
  const activeWild = document.querySelector(`[data-dyb-wildcards="${dybWildcardsStyle}"]`);
  if (activeWild) activeWild.classList.add('pill-active-dyb');
  dybUpdateWildcardsDesc();

  // Starting Hand pills
  document.querySelectorAll('[data-dyb-hand]').forEach(p => p.classList.remove('pill-active-dyb'));
  const activeHand = document.querySelector(`[data-dyb-hand="${dybStartingHand}"]`);
  if (activeHand) activeHand.classList.add('pill-active-dyb');

  // Footholds toggle
  const fhBtn = document.getElementById('btn-dyb-footholds-toggle');
  fhBtn.textContent = dybFootholdsMode ? 'ON' : 'OFF';
  fhBtn.className = dybFootholdsMode ? 'game-toggle-on-dyb shrink-0' : 'game-toggle-off shrink-0';
  document.getElementById('dyb-footholds-sub-options').style.display = dybFootholdsMode ? 'flex' : 'none';
  // Footholds count pills
  document.querySelectorAll('[data-dyb-footholds]').forEach(p => p.classList.remove('pill-active-dyb'));
  const activeFH = document.querySelector(`[data-dyb-footholds="${dybFootholdsCount}"]`);
  if (activeFH) activeFH.classList.add('pill-active-dyb');

  // Sylly Mode toggle
  const btn = document.getElementById('btn-dyb-sylly-toggle');
  btn.textContent = dybSyllyMode ? 'ON' : 'OFF';
  btn.className = dybSyllyMode ? 'game-toggle-on-dyb shrink-0' : 'game-toggle-off shrink-0';
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

  // Init dice in hand + lives
  dybDiceInHand = Array(dybPlayerCount).fill(dybStartingHand);
  dybLives = dybFootholdsMode ? Array(dybPlayerCount).fill(dybFootholdsCount) : [];
  dybActivePlayers = Array.from({length: dybPlayerCount}, (_, i) => i);
  dybEliminationOrder = [];
  dybShakeNumber = 0;

  const payload = {
    action: 'DYB_GAME_START',
    playerNames: dybPlayerNames,
    seatNumbers: dybSeatNumbers,
    diceInHand: dybDiceInHand,
    lives: dybLives,
    firstOpenerIdx: dybCurrentOpenerIdx,
    wildcards: dybWildcardsStyle,
    startingHand: dybStartingHand,
    footholdsMode: dybFootholdsMode,
    footholdsCount: dybFootholdsCount,
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
  dybShakeReadyCheck = new Array(dybPlayerCount).fill(false);

  dybCurrentFace = 0;
  dybCurrentQty  = 0;
  dybOnesStripped = false;
  dybAllegationHistory = [];
  dybChallengerIdx = -1;
  dybAllRolls        = [];
  dybAllSpecialTypes = [];
  dybAllSlickFaces   = [];
  dybAllPhantomTypes = [];

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

  const diceRow = document.getElementById('dyb-shake-dice-counts');
  diceRow.innerHTML = dybActivePlayers.map(i => {
    const name  = dybPlayerNames[i] || ('P' + (i + 1));
    const count = dybFootholdsMode ? dybLives[i] : dybDiceInHand[i];
    const unit  = dybFootholdsMode ? (count === 1 ? 'foothold' : 'footholds') : (count === 1 ? 'die' : 'dice');
    return `<span class="text-stone-500 text-sm">${name}: ${count} ${unit}</span>`;
  }).join('<span class="text-stone-300 mx-1">|</span>');

  // Render face-down dice in cup area
  const count = dybDiceInHand[myIdx];
  document.getElementById('dyb-hand-dock-shake').innerHTML = Array.from({ length: count }, () =>
    dybDieBackHTML()
  ).join('');
  document.getElementById('dyb-shake-cup-label').textContent = "Tap to shake 'em up";
  // Show the Tempest guide [?] before rolling too, so players can review special dice
  document.getElementById('btn-dyb-tempest-guide').style.display = dybSyllyMode ? '' : 'none';

  const readyBtn = document.getElementById('btn-dyb-ready');
  readyBtn.disabled = false;
  readyBtn.textContent = 'Ready!';
  document.getElementById('dyb-roll-waiting').style.display = 'none';
}

function dybHandleCupTap() {
  if (dybMyRoll && dybMyRoll.length) return;
  const cup = document.getElementById('dyb-shake-cup-area');
  cup.classList.remove('dyb-cup-shaking');
  void cup.offsetWidth;
  cup.classList.add('dyb-cup-shaking');
  setTimeout(() => {
    cup.classList.remove('dyb-cup-shaking');
    dybDoRoll();
  }, 550);
}

function dybDoRoll() {
  if (dybMyRoll && dybMyRoll.length) return;
  const count = dybDiceInHand[mpMyPlayerIdx];
  dybMyRoll = dybGenerateRoll(count);
  dybRenderHandDock('dyb-hand-dock-shake');
  document.getElementById('dyb-shake-cup-label').textContent = "Your hand.";
  if (dybSyllyMode) {
    document.getElementById('btn-dyb-tempest-guide').style.display = '';
  }
}

function dybSubmitRoll() {
  // Path B: player tapped Ready! without shaking first — roll instantly
  if (!dybMyRoll || !dybMyRoll.length) {
    dybDoRoll();
  }
  const payload = {
    action: 'DYB_ROLL_SUBMIT',
    roll: dybMyRoll,
    specialTypes: dybSpecialTypes,
    slickFaces: dybSlickFaces,
    phantomTypes: dybPhantomTypes,
  };
  mpLockSync();
  if (window.syllyMultiplayerMode === 'client') {
    mpSendEnvelope({ type: 'ACTION', payload });
  } else {
    // Host: record own roll and check ready
    dybRecordRoll(mpMyPlayerIdx, dybMyRoll, dybSpecialTypes, dybSlickFaces, dybPhantomTypes);
  }
  document.getElementById('btn-dyb-ready').disabled = true;
  document.getElementById('dyb-roll-waiting').style.display = 'block';
}

function dybRecordRoll(playerIdx, roll, specialTypes, slickFaces, phantomTypes) {
  dybAllRolls[playerIdx]        = roll;
  dybAllSpecialTypes[playerIdx] = specialTypes;
  dybAllSlickFaces[playerIdx]   = slickFaces;
  dybAllPhantomTypes[playerIdx] = phantomTypes || Array(roll.length).fill(null);
  dybShakeReadyCheck[playerIdx] = true;

  // Track face frequency for Lucky Face stat (host only; phantom faces excluded)
  if (!dybFaceFreq[playerIdx]) dybFaceFreq[playerIdx] = Array(7).fill(0);
  roll.forEach((val, j) => {
    if ((specialTypes[j] || 'standard') !== 'phantom') dybFaceFreq[playerIdx][val]++;
  });

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
      lives:           dybLives,
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
  const nextBidderName = dybPlayerNames[dybCurrentBidderIdx] || 'Player';

  // Player pip row
  const pipRow = document.getElementById('dyb-pip-row');
  pipRow.innerHTML = dybActivePlayers.map(i => {
    const name    = dybPlayerNames[i] || ('P' + (i + 1));
    const count   = dybFootholdsMode ? dybLives[i] : dybDiceInHand[i];
    const symbol  = dybFootholdsMode ? '◆' : '■';
    const isActive = i === dybCurrentBidderIdx;
    return `<div class="flex flex-col items-center gap-0.5 ${isActive ? 'opacity-100' : 'opacity-40'}">
      <span class="text-xs font-semibold ${isActive ? 'text-stone-800' : 'text-stone-400'}">${name}</span>
      <span class="text-base">${symbol.repeat(count)}</span>
    </div>`;
  }).join('');

  // Current allegation display
  const dispEl = document.getElementById('dyb-allegation-display');
  if (dybCurrentFace === 0) {
    dispEl.style.cssText = '';
    dispEl.textContent = 'No claim yet.';
  } else {
    dispEl.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:8px;';
    dispEl.innerHTML = `<span>${dybCurrentQty} ×</span>${dybDieHTMLSm(dybCurrentFace)}`;
  }

  // Last bidder label — read from history so name is correct after dybCurrentBidderIdx advances
  const lastBid = dybAllegationHistory.length > 0
    ? dybAllegationHistory[dybAllegationHistory.length - 1] : null;
  const lastBidderName = lastBid ? (dybPlayerNames[lastBid.playerIdx] || 'Player') : '';
  document.getElementById('dyb-last-bidder-label').textContent =
    lastBid ? `${lastBidderName} alleged ${lastBid.qty} × ${lastBid.face}.` : '';

  // Turn label
  document.getElementById('dyb-turn-label').textContent = isMyTurn
    ? 'Your turn.'
    : `Waiting for ${nextBidderName}…`;

  // Show/hide picker controls
  const controls = document.getElementById('dyb-bid-controls');
  const waiting  = document.getElementById('dyb-waiting-label');
  controls.style.display = isMyTurn ? 'flex' : 'none';
  waiting.style.display  = isMyTurn ? 'none' : 'block';

  if (isMyTurn) {
    dybRenderBidPicker(); // calls dybUpdateBidButtonState() which manages action button state
  }

  // Action button locking — BUG-14: buttons sit outside #dyb-bid-controls so must be
  // managed explicitly; non-active players must never be able to submit an allegation
  const callBtn  = document.getElementById('btn-dyb-call-bluff');
  const raiseBtn = document.getElementById('btn-dyb-raise');
  if (!isMyTurn) {
    callBtn.disabled  = true;
    raiseBtn.disabled = true;
    callBtn.classList.add('opacity-40');
    raiseBtn.classList.add('opacity-40');
    raiseBtn.textContent = dybCurrentFace === 0 ? 'Make the Call' : 'Climb Higher';
  } else {
    // dybUpdateBidButtonState() (called via dybRenderBidPicker above) handles opacity
    // Do NOT call remove('opacity-40') here — dybUpdateBidButtonState already set the
    // correct state; overriding it caused the opener's "Call the Bluff" to appear enabled
    // even though dybCurrentFace === 0 makes it a no-op (BUG-24)
  }

  // Hand dock — show [?] Tempest Guide button only in Sylly Mode
  const handTipBtn = document.getElementById('btn-dyb-hand-tip');
  if (handTipBtn) handTipBtn.style.display = dybSyllyMode ? 'inline-flex' : 'none';
  dybRenderHandDock('dyb-hand-dock-table');

  // Ascent preview (last 3 bids)
  dybRenderAscentPreview();
}

// Canonical raise rule (single source of truth for picker floors + button gate):
// a raise is legal if the quantity goes UP (any face), or the quantity stays the
// same AND the face goes up. Quantity must never decrease.
function dybIsLegalRaise(face, qty) {
  const minFace = dybOnesStripped ? 1 : (dybWildcardsStyle === 'classic' ? 2 : 1);
  if (face < minFace || qty < 1) return false;
  return qty > dybCurrentQty || (qty === dybCurrentQty && face > dybCurrentFace);
}

// Lowest legal quantity for a given face against the standing allegation.
// Higher face → may keep the same quantity; same/lower face → must raise quantity.
function dybMinQtyForFace(face) {
  return face > dybCurrentFace ? Math.max(1, dybCurrentQty) : dybCurrentQty + 1;
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

  const minQty = dybMinQtyForFace(selectedFace);
  const selectedQty = Math.max(dybCurrentQty, minQty);

  document.getElementById('dyb-face-display').innerHTML = dybDieHTMLSm(selectedFace);
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
  document.getElementById('dyb-face-display').innerHTML = dybDieHTMLSm(face);

  // Recompute min qty for new face
  const minQty = dybMinQtyForFace(face);
  let qty = Math.max(parseInt(picker.dataset.qty), minQty);
  picker.dataset.qty = qty;
  document.getElementById('dyb-qty-display').textContent = qty;

  dybUpdateBidButtonState();
}

function dybAdjustQtyPicker(delta) {
  const picker = document.getElementById('dyb-bid-controls');
  const face = parseInt(picker.dataset.face);
  const minQty = dybMinQtyForFace(face);

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
  const noBid = dybCurrentFace === 0;

  const raiseBtn = document.getElementById('btn-dyb-raise');
  const callBtn  = document.getElementById('btn-dyb-call-bluff');

  raiseBtn.disabled = !dybIsLegalRaise(face, qty);
  raiseBtn.classList.toggle('opacity-40', raiseBtn.disabled);
  raiseBtn.textContent = noBid ? 'Make the Call' : 'Climb Higher';

  callBtn.disabled = noBid;
  callBtn.classList.toggle('opacity-40', noBid);
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

  let eliminatedIdx = -1;
  if (dybFootholdsMode) {
    dybLives[loserIdx]--;
    if (dybLives[loserIdx] <= 0) {
      dybLives[loserIdx] = 0;
      dybEliminationOrder.push(loserIdx);
      dybActivePlayers = dybActivePlayers.filter(i => i !== loserIdx);
      eliminatedIdx = loserIdx;
    }
  } else {
    dybDiceInHand[loserIdx]--;
    if (dybDiceInHand[loserIdx] <= 0) {
      dybDiceInHand[loserIdx] = 0;
      dybEliminationOrder.push(loserIdx);
      dybActivePlayers = dybActivePlayers.filter(i => i !== loserIdx);
      eliminatedIdx = loserIdx;
    }
  }

  // Next opener = loser (or next active if eliminated)
  if (eliminatedIdx === -1) {
    dybCurrentOpenerIdx = loserIdx;
  } else if (dybActivePlayers.length > 0) {
    dybCurrentOpenerIdx = dybActivePlayers[0];
  }

  // ── Clash tracking (host only) ────────────────────────────────────────────
  const clashWinner = real < claimed ? challengerIdx : bidderIdx;
  if (!dybClashWins[clashWinner]) dybClashWins[clashWinner] = 0;
  dybClashWins[clashWinner]++;
  if (!dybClashLosses[loserIdx]) dybClashLosses[loserIdx] = 0;
  dybClashLosses[loserIdx]++;

  // ── Save shake log for Chronicle (host only) ──────────────────────────────
  const _loserName     = dybPlayerNames[loserIdx]    || ('P' + (loserIdx + 1));
  const _challName     = dybPlayerNames[challengerIdx] || ('P' + (challengerIdx + 1));
  const _loseVerb = dybFootholdsMode ? 'loses a foothold' : 'loses a die';
  const _shakeConclusion = eliminatedIdx !== -1
    ? `${_loserName} lost their last foothold and fell from the climb.`
    : real < claimed
      ? `${_challName} called the bluff. ${_loserName} ${_loseVerb}.`
      : `The claim held. ${_loserName} ${_loseVerb}.`;
  dybShakeLogs.push({
    shakeNum:   dybShakeNumber,
    bids:       [...dybAllegationHistory],
    conclusion: _shakeConclusion,
  });

  const gameOver = dybActivePlayers.length <= 1;

  const syncPayload = {
    action: 'DYB_SHOWDOWN',
    face, claimed, real,
    loserIdx,
    eliminatedIdx,
    newDiceInHand: [...dybDiceInHand],
    newLives: [...dybLives],
    allRolls: dybAllRolls,
    allSpecialTypes: dybAllSpecialTypes,
    allSlickFaces: dybAllSlickFaces,
    allPhantomTypes: dybAllPhantomTypes,
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
  if (dybFootholdsMode && data.newLives) dybLives = data.newLives;
  dybActivePlayers = dybActivePlayers.filter(i =>
    dybFootholdsMode ? dybLives[i] > 0 : dybDiceInHand[i] > 0
  );
  if (data.eliminatedIdx !== -1) {
    dybEliminationOrder = [...data.eliminationOrder];
  }
  dybAllRolls        = data.allRolls        || dybAllRolls;
  dybAllSpecialTypes = data.allSpecialTypes || dybAllSpecialTypes;
  dybAllSlickFaces   = data.allSlickFaces   || dybAllSlickFaces;
  dybAllPhantomTypes = data.allPhantomTypes || dybAllPhantomTypes;

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
          clashWins:   dybClashWins,
          clashLosses: dybClashLosses,
          faceFreq:    dybFaceFreq,
          shakeLogs:   dybShakeLogs,
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

  dybRenderAllHandsOnShowdown(); // reveal all hands immediately — the cup is slammed, all dice start dimmed

  const container    = document.getElementById('dyb-showdown-hands');
  const countingDice = dybGetCountingDice(data.face);

  // Hide action buttons until animation completes
  document.getElementById('btn-dyb-next-shake').style.display          = 'none';
  document.getElementById('dyb-showdown-client-waiting').style.display = 'none';

  const reveal = () => {
    document.getElementById('dyb-showdown-verdict').textContent = held ? 'CLAIM HOLDS' : 'BLUFF CALLED';
    document.getElementById('dyb-showdown-verdict').className   = held
      ? 'text-2xl font-bold text-stone-700'
      : 'text-2xl font-bold text-red-600';
    const _loseMsg = dybFootholdsMode ? 'loses a foothold.' : 'loses a die.';
    document.getElementById('dyb-showdown-loser').textContent =
      eliminated ? `${loserName} is out!` : `${loserName} ${_loseMsg}`;
    // un-dim all remaining dice so the full table is visible at the verdict
    container.querySelectorAll('.dyb-die-dim').forEach(el => el.classList.remove('dyb-die-dim'));
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
  let highlightIdx = 0;
  const step = () => {
    count++;
    document.getElementById('dyb-showdown-real').textContent = `Real count: ${count}`;
    // un-dim the next counting die so the tally is visual
    if (highlightIdx < countingDice.length) {
      const { pIdx, dieIdx } = countingDice[highlightIdx];
      const el = container.querySelector(`[data-p="${pIdx}"][data-d="${dieIdx}"]`);
      if (el) el.classList.remove('dyb-die-dim');
      highlightIdx++;
    }
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
    const name    = dybPlayerNames[i] || ('P' + (i + 1));
    const roll    = dybAllRolls[i];
    const types   = dybAllSpecialTypes[i]  || [];
    const slicks  = dybAllSlickFaces[i]    || [];
    const phantoms = dybAllPhantomTypes[i] || [];
    const diceHtml = roll.map((val, j) => {
      const type = types[j] || 'standard';
      // dieIdx=-1 = reveal mode; pass phantom secondary for compound unmask
      return dybDieHTML(val, type, slicks[j] !== undefined ? slicks[j] : -1, -1, true, phantoms[j] || null)
        .replace('<div class="dyb-die ', `<div data-p="${i}" data-d="${j}" class="dyb-die dyb-die-dim `);
    }).join('');
    container.innerHTML += `
      <div class="bg-white rounded-2xl p-3 shadow-sm">
        <p class="text-xs font-semibold text-stone-500 mb-2">${name}</p>
        <div class="flex gap-2 flex-wrap">${diceHtml}</div>
      </div>`;
  }
}

// Returns ordered list of {pIdx, dieIdx} for dice that contribute positively to a face count.
// Loaded dice appear twice (they contribute +2). Snake/Cracked/negative phantoms are excluded.
function dybGetCountingDice(face) {
  const wildOnes = dybWildcardsStyle !== 'strict' && !dybOnesStripped;
  const list = [];
  for (let pIdx = 0; pIdx < dybPlayerCount; pIdx++) {
    const roll         = dybAllRolls[pIdx]         || [];
    const types        = dybAllSpecialTypes[pIdx]  || [];
    const slicks       = dybAllSlickFaces[pIdx]    || [];
    const phantomTypes = dybAllPhantomTypes[pIdx]  || [];
    roll.forEach((val, dieIdx) => {
      const type        = types[dieIdx] || 'standard';
      const matchesFace = val === face || (wildOnes && val === 1 && face !== 1);

      if (type === 'phantom') {
        const secondary = phantomTypes[dieIdx] || null;
        if (!secondary) {
          // Pure phantom — counts normally (+1)
          if (matchesFace) list.push({ pIdx, dieIdx });
        } else if (secondary === 'loaded') {
          // Phantom+Loaded counts +2: push twice
          if (matchesFace) { list.push({ pIdx, dieIdx }); list.push({ pIdx, dieIdx }); }
        } else if (secondary === 'slick') {
          // Phantom+Slick: face locked at roll time
          if ((slicks[dieIdx] !== undefined ? slicks[dieIdx] : -1) === face) list.push({ pIdx, dieIdx });
        }
        // cracked/snake compound phantoms contribute 0 or negative — excluded
        return;
      }

      if (type === 'cracked' || type === 'snake') return;
      if (type === 'slick') {
        if ((slicks[dieIdx] !== undefined ? slicks[dieIdx] : -1) === face) list.push({ pIdx, dieIdx });
        return;
      }
      if (matchesFace) {
        list.push({ pIdx, dieIdx });
        if (type === 'loaded') list.push({ pIdx, dieIdx }); // second entry for +2
      }
    });
  }
  return list;
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
      lives:         dybLives,
    },
  });
}

// ── Gameover ──────────────────────────────────────────────────────────────────
function dybShowGameover(data) {
  // Store for Chronicle rendering on all devices
  dybAllShakeLogs = data.shakeLogs || [];
  dybChronicleIdx = 0;

  const winnerName = data.playerNames[data.winnerIdx] || 'Player';
  document.getElementById('dyb-gameover-winner').textContent = `${winnerName} reaches The Summit!`;

  const order      = [...data.eliminationOrder].reverse();
  const positions  = [data.winnerIdx, ...order];
  const clashWins  = data.clashWins  || [];
  const clashLosses = data.clashLosses || [];
  const faceFreq   = data.faceFreq   || [];
  const rankEmojis = ['\u{1F3C6}', '\u{1F948}', '\u{1F949}'];

  const standingsEl = document.getElementById('dyb-gameover-standings');
  standingsEl.innerHTML = '';

  const hasFaceData = faceFreq && positions.some(p => faceFreq[p]);

  // Grid columns: rank(28px) | name(1fr) | challenges(80px) | favoured(40px optional)
  const gridCols = hasFaceData ? '28px 1fr 80px 40px' : '28px 1fr 80px';

  // Header row
  standingsEl.innerHTML = `
    <div class="grid px-4" style="grid-template-columns:${gridCols};gap:12px;align-items:center;">
      <span class="text-[9px] font-semibold uppercase tracking-wide text-stone-400 text-center">Rank</span>
      <span class="text-[9px] font-semibold uppercase tracking-wide text-stone-400">Climber</span>
      <span class="text-[9px] font-semibold uppercase tracking-wide text-stone-400 text-center">Challenges</span>
      ${hasFaceData ? '<span class="text-[9px] font-semibold uppercase tracking-wide text-stone-400 text-center">Favoured</span>' : ''}
    </div>`;

  positions.forEach((pIdx, rank) => {
    const name = data.playerNames[pIdx] || ('P' + (pIdx + 1));
    const w    = clashWins[pIdx]   || 0;
    const l    = clashLosses[pIdx] || 0;

    let luckyFaceHtml = '';
    const freq = faceFreq[pIdx];
    if (hasFaceData) {
      if (freq) {
        let bestFace = 1, bestCount = 0;
        for (let f = 1; f <= 6; f++) {
          if ((freq[f] || 0) > bestCount) { bestCount = freq[f]; bestFace = f; }
        }
        const miniPips = dybDieHTML(bestFace, 'standard', -1);
        luckyFaceHtml = `<div class="flex justify-center items-center"><div class="scale-75 origin-center">${miniPips}</div></div>`;
      } else {
        luckyFaceHtml = `<div></div>`;
      }
    }

    standingsEl.innerHTML += `
      <div class="bg-white rounded-2xl px-4 py-3 shadow-sm grid items-center" style="grid-template-columns:${gridCols};gap:12px;">
        <span class="text-sm text-center">${rankEmojis[rank] || (rank + 1)}</span>
        <span class="text-stone-800 font-semibold truncate">${name}</span>
        <span class="text-xs font-bold text-stone-700 text-center">${w}W / ${l}L</span>
        ${luckyFaceHtml}
      </div>`;
  });

  // Chronicle
  const chronicleSection = document.getElementById('dyb-chronicle-section');
  if (chronicleSection) {
    if (dybAllShakeLogs.length > 0) {
      chronicleSection.style.display = '';
      dybRenderChronicle();
    } else {
      chronicleSection.style.display = 'none';
    }
  }

  dybRenderNewGameOverlay();
  playSuccess();
  showScreen('screen-dyb-gameover');
}

function dybRenderChronicle() {
  const logs = dybAllShakeLogs;
  if (!logs.length) return;
  const idx  = dybChronicleIdx;
  const log  = logs[idx];
  document.getElementById('dyb-chronicle-label').textContent = `Shake ${log.shakeNum}`;
  const prev = document.getElementById('btn-dyb-chronicle-prev');
  const next = document.getElementById('btn-dyb-chronicle-next');
  if (prev) prev.disabled = idx === 0;
  if (next) next.disabled = idx === logs.length - 1;
  const bids = (log.bids || []).map(h => {
    const name = (dybPlayerNames[h.playerIdx] || ('P' + (h.playerIdx + 1))).split(' ')[0];
    return `<span class="text-stone-500">${name}: ${h.qty}&times;[${h.face}]</span>`;
  }).join('<span class="text-stone-300 mx-0.5">&rarr;</span>');
  const card = document.getElementById('dyb-chronicle-card');
  if (card) {
    card.innerHTML = `
      <div class="flex flex-wrap gap-1 text-xs leading-5">${bids || '<span class="text-stone-300 text-xs">No bids recorded.</span>'}</div>
      <p class="text-xs text-stone-400 mt-1 border-t border-stone-100 pt-1">${log.conclusion}</p>
    `;
  }
}

function dybRenderNewGameOverlay() {
  const confirmBtn = document.getElementById('btn-dyb-new-game-confirm');
  if (window.syllyMultiplayerMode === 'host') {
    confirmBtn.textContent = 'Restart in Lobby';
  } else if (window.syllyMultiplayerMode === 'client') {
    confirmBtn.textContent = 'Leave Session';
  } else {
    confirmBtn.textContent = 'Climb Again';
  }
}

// ── Spirit Board ──────────────────────────────────────────────────────────────
function dybShowSpiritBoard() {
  showScreen('screen-dyb-spirit-board');
}

function dybRenderSpiritBoard(allRolls, allSpecialTypes, activePlayers, playerNames, diceInHand, lives) {
  const grid = document.getElementById('dyb-spirit-grid');
  grid.innerHTML = '';
  activePlayers.forEach(i => {
    const name  = playerNames[i] || ('P' + (i + 1));
    const roll  = allRolls[i] || [];
    const types = allSpecialTypes[i] || [];
    const diceHtml = roll.map((val, j) => dybDieHTML(val, types[j] || 'standard', -1, -2)).join('');
    const remaining = dybFootholdsMode && lives ? `${lives[i]} foothold${lives[i] === 1 ? '' : 's'} left` : `${diceInHand[i]} left`;
    grid.innerHTML += `
      <div id="dyb-spirit-row-${i}" class="bg-white rounded-2xl p-3 shadow-sm">
        <p class="text-xs font-semibold text-stone-500 mb-2">${name} (${remaining})</p>
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
    dybSpecialTypes  = Array(count).fill('standard');
    dybSlickFaces    = Array(count).fill(-1);
    dybSlickAssigned = Array(count).fill(false);
    dybPhantomTypes  = Array(count).fill(null);
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

  // Slick dice auto-initialise to their rolled face value (shown as X* until the player commits)
  dybSlickFaces    = roll.map((val, i) => dybSpecialTypes[i] === 'slick' ? val : -1);
  dybSlickAssigned = Array(count).fill(false);

  // Phantom secondary types: each Phantom die has specialRate chance of harbouring a secondary type
  const secondaryOrder = ['loaded', 'slick', 'cracked', 'snake'];
  dybPhantomTypes = dybSpecialTypes.map((type, i) => {
    if (type !== 'phantom') return null;
    const r2 = Math.random();
    if (r2 >= specialRate) return null; // pure phantom
    const secondary = secondaryOrder[Math.floor(r2 / specialRate * secondaryOrder.length)];
    // Phantom+Slick: lock the rolled face immediately; no picker allowed
    if (secondary === 'slick') {
      dybSlickFaces[i]    = roll[i];
      dybSlickAssigned[i] = true;
    }
    return secondary;
  });

  return roll;
}

// Compute real count of a face value across all rolls
function dybComputeRealCount(face) {
  const wildOnes = dybWildcardsStyle !== 'strict' && !dybOnesStripped;
  let total = 0;

  for (let pIdx = 0; pIdx < dybPlayerCount; pIdx++) {
    const roll         = dybAllRolls[pIdx]         || [];
    const types        = dybAllSpecialTypes[pIdx]  || [];
    const slicks       = dybAllSlickFaces[pIdx]    || [];
    const phantomTypes = dybAllPhantomTypes[pIdx]  || [];

    roll.forEach((val, j) => {
      const type        = types[j] || 'standard';
      const matchesFace = val === face || (wildOnes && val === 1 && face !== 1);

      if (type === 'phantom') {
        const secondary = phantomTypes[j] || null;
        if (!secondary) {
          // Pure phantom — counts normally
          if (matchesFace) total += 1;
        } else if (secondary === 'cracked') {
          // counts 0
        } else if (secondary === 'loaded') {
          if (matchesFace) total += 2;
        } else if (secondary === 'snake') {
          if (matchesFace) total -= 1;
        } else if (secondary === 'slick') {
          // Phantom+Slick: locked face at roll time, cannot be reassigned
          const locked = slicks[j] !== undefined ? slicks[j] : -1;
          if (locked === face) total += 1;
        }
        return;
      }

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
      // standard — counts normally
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
    const type     = dybSpecialTypes[i]  || 'standard';
    const slick    = dybSlickFaces[i]    !== undefined ? dybSlickFaces[i] : -1;
    const assigned = dybSlickAssigned[i] || false;
    return dybDieHTML(val, type, slick, i, assigned); // always visible — MDLM, own device
  }).join('');

  // Sylly Mode: long-press any special die for info; tap Slick to assign face.
  // Each die gets its own _lpTimer / _didLP so a long-press on one die never
  // blocks a subsequent tap on a different die (shared-variable bug fixed).
  if (dybSyllyMode) {
    const dieDivs = container.querySelectorAll('.dyb-die'); // scoped lookup prevents ID collision when both docks are in the DOM (BUG-25)
    dybMyRoll.forEach((_, i) => {
      const el   = dieDivs[i];
      const type = dybSpecialTypes[i] || 'standard';
      if (!el || type === 'standard') return;

      let _lpTimer = null; // per-die
      let _didLP   = false; // per-die

      const startLP  = () => { _lpTimer = setTimeout(() => { _didLP = true; dybShowDieInfo(type); }, 500); };
      const cancelLP = () => clearTimeout(_lpTimer);
      el.addEventListener('touchstart',  startLP,  { passive: true });
      el.addEventListener('touchend',    cancelLP);
      el.addEventListener('touchmove',   cancelLP);
      el.addEventListener('mousedown',   startLP);
      el.addEventListener('mouseup',     cancelLP);
      el.addEventListener('mouseleave',  cancelLP);

      if (type === 'slick') {
        el.addEventListener('click', () => { if (_didLP) { _didLP = false; return; } dybOpenSlickPicker(i); });
      }
    });
  }
}

// Pip-position grid (1-indexed): 1=top-left  2=top-mid  3=top-right
//                                  4=mid-left  5=center   6=mid-right
//                                  7=bot-left  8=bot-mid  9=bot-right
const DYB_PIP_LAYOUTS = { 1:[5], 2:[3,7], 3:[3,5,7], 4:[1,3,7,9], 5:[1,3,5,7,9], 6:[1,3,4,6,7,9] };

// dieIdx >= 0 : owner's live hand (phantom shows ?)
// dieIdx === -1: showdown reveal (phantom unmasked — compound type shown with ring)
// dieIdx === -2: spectator view — Spirit Board (phantom shows ?)
function dybDieHTML(val, type, slickFace, dieIdx = -1, isSlickAssigned = true, phantomSecondary = null) {
  const idAttr = dieIdx >= 0 ? ` id="dyb-die-${dieIdx}"` : '';

  let borderCls = 'border-stone-200';
  let bgCls     = 'bg-stone-50';
  let pipCls    = 'bg-stone-700';
  let extraCls  = '';
  let ringCls   = ''; // phantom's additive ring — held OUT of extraCls so a secondary
                      // type's "frame": false can never suppress phantom's own identity
  let textLabel  = null;
  let textStyle  = 'text-stone-500 font-bold text-base';

  // Which `specials` entry this die wants, if any.
  // artKey is a face value, or 'blank' for a die that shows no face at all.
  let artType = null;
  let artKey  = null;

  switch (type) {
    case 'loaded':
      extraCls = 'dyb-die-loaded'; // amber glow breathing pulse via CSS compound class
      pipCls   = 'bg-amber-700';
      artType  = 'loaded'; artKey = val;
      break;
    case 'phantom':
      extraCls = 'dyb-die-phantom'; // purple tint + lavender border via CSS compound class
      if (dieIdx !== -1) {
        // Owner's live hand OR spectator view — face stays hidden
        textLabel = '?';
        textStyle = 'dyb-phantom-glyph'; // indigo ? with glow text-shadow
        artType   = 'phantom'; artKey = 'blank';
      } else {
        // Showdown reveal — unmask: pure phantom shows real face; compound shows secondary type with ring
        if (!phantomSecondary) {
          pipCls  = 'bg-indigo-400'; // pure phantom — indigo pips
          artType = 'phantom'; artKey = val;
        } else if (phantomSecondary === 'loaded') {
          extraCls = 'dyb-die-loaded'; ringCls = 'dyb-die-phantom-ring'; // amber glow + indigo ring
          pipCls   = 'bg-amber-700';
          artType  = 'loaded'; artKey = val;
        } else if (phantomSecondary === 'snake') {
          extraCls = 'dyb-die-snake'; ringCls = 'dyb-die-phantom-ring'; // dark green + indigo ring
          pipCls   = 'dyb-pip-snake';
          artType  = 'snake'; artKey = val;
        } else if (phantomSecondary === 'cracked') {
          ringCls   = 'dyb-die-phantom-ring'; // indigo ring only; cracked styling below
          bgCls     = 'bg-stone-100';
          borderCls = 'border-stone-200';
          textLabel = '✕';
          textStyle = 'text-stone-300 font-bold text-xl';
          artType   = 'cracked'; artKey = 'blank';
        } else if (phantomSecondary === 'slick') {
          ringCls   = 'dyb-die-phantom-ring'; // indigo ring + cyan styling
          borderCls = 'border-cyan-400';
          bgCls     = 'bg-cyan-50';
          pipCls    = 'bg-cyan-600';
          // Use locked slick face (assigned at generation time)
          if (slickFace > 0) val = slickFace;
          artType   = 'slick'; artKey = val;
        }
      }
      break;
    case 'slick':
      borderCls = 'border-cyan-400';
      bgCls     = 'bg-cyan-50';
      if (!isSlickAssigned) {
        // Pre-assignment: show auto-rolled face as X* with cyan text (tappable).
        // Deliberately NOT skinnable — the digit is live information the player
        // needs in order to choose, not decoration.
        extraCls  = 'cursor-pointer';
        textLabel = `${slickFace > 0 ? slickFace : '?'}*`;
        textStyle = 'text-cyan-600 font-bold text-sm';
      } else if (slickFace > 0) {
        // Committed — show assigned face
        val     = slickFace;
        pipCls  = 'bg-cyan-600';
        artType = 'slick'; artKey = val;
      } else {
        // Fallback (shouldn't occur post-redesign): unassigned with no auto-face
        textLabel = '~';
        textStyle = 'dyb-tilde-breathe';
      }
      break;
    case 'cracked':
      bgCls     = 'bg-stone-100';
      borderCls = 'border-stone-200';
      textLabel = '✕';
      textStyle = 'text-stone-300 font-bold text-xl'; // muted cross signals zero value
      artType   = 'cracked'; artKey = 'blank';
      break;
    case 'snake':
      extraCls = 'dyb-die-snake'; // sinister dark green; overrides default border/bg via specificity
      pipCls   = 'dyb-pip-snake'; // dark green diamond pip
      artType  = 'snake'; artKey = val;
      break;
  }

  // ── Asset seam ────────────────────────────────────────────────────────────
  // Standard faces keep the shipped edge-to-edge look. A SPECIAL die draws the
  // pack's art inside the engine's type frame, so the type stays legible under
  // any skin — unless the pack opts that type out, and then only for a die whose
  // special art actually resolved (otherwise a missing face silently ships an
  // unmarked die). A 'blank' key NEVER falls back to assetFace: for a concealed
  // phantom that would render its real value and leak it.
  let url = null, framed = false;
  if (artType) {
    const special = (typeof assetSpecial === 'function') && assetSpecial('dyb', artType, artKey);
    if (special) {
      url    = special;
      framed = !((typeof assetSpecialFrame === 'function') && assetSpecialFrame('dyb', artType) === false);
    } else if (artKey !== 'blank') {
      url    = (typeof assetFace === 'function') && assetFace('dyb', artKey);
      framed = !!url;
    }
  } else if (type === 'standard') {
    url = (typeof assetFace === 'function') && assetFace('dyb', val);
  }

  if (url) {
    return framed
      ? `<div${idAttr} class="dyb-die ${borderCls} ${bgCls} ${extraCls} ${ringCls} dyb-die-framed select-none"><span class="dyb-die-art" style="background-image:url('${url}')"></span></div>`
      : `<div${idAttr} class="dyb-die dyb-die-asset ${ringCls} select-none" style="background-image:url('${url}')"></div>`;
  }

  if (textLabel !== null) {
    return `<div${idAttr} class="dyb-die ${borderCls} ${bgCls} ${extraCls} ${ringCls} select-none" style="display:flex;align-items:center;justify-content:center;padding:0;"><span class="${textStyle}">${textLabel}</span></div>`;
  }

  const pips = DYB_PIP_LAYOUTS[val] || [];
  let cells = '';
  for (let i = 1; i <= 9; i++) {
    cells += pips.includes(i) ? `<span class="dyb-pip ${pipCls}"></span>` : '<span></span>';
  }
  return `<div${idAttr} class="dyb-die ${borderCls} ${bgCls} ${extraCls} ${ringCls} select-none">${cells}</div>`;
}

function dybDieHTMLSm(face) {
  return dybDieHTML(face, 'standard', -1).replace('class="dyb-die ', 'class="dyb-die dyb-die-sm ');
}
function dybDieHTMLXs(face) {
  return dybDieHTML(face, 'standard', -1).replace('class="dyb-die ', 'class="dyb-die dyb-die-xs ');
}

// Face-down die (cup, pre-shake). Routes through the seam so an asset pack can skin the back.
function dybDieBackHTML() {
  const back = (typeof assetBack === 'function') && assetBack('dyb');
  if (back) return `<div class="dyb-die dyb-die-asset select-none" style="background-image:url('${back}')"></div>`;
  return `<div class="dyb-die border-slate-500 bg-slate-800 select-none"></div>`;
}

// ── How to Play: the dice gallery ─────────────────────────────────────────
// Tab 2 of dyb-how-to-overlay. Every tile goes through dybDieHTML/dybDieBackHTML —
// the same seam the table uses — so a skin pack shows up here without a code change,
// and so this doubles as the offline install check once DYB has core art.
//
// Scope note: the five Tempest die TYPES are skinnable too (assets.specials), but they
// are not shown here. Their identity is the engine's frame plus live per-die state
// (an unassigned Slick shows the auto-rolled face you are about to choose), which a
// static reference tile would misrepresent. They are previewed in play under Sylly Mode.
function dybOpenHowTo(tab) {
  dybSetHowToTab(tab || 'rules');
  const inner = document.querySelector('#dyb-how-to-overlay .overlay-data-inner');
  if (inner) inner.scrollTop = 0;
  document.getElementById('dyb-how-to-overlay').style.display = 'flex';
}

function dybSetHowToTab(tab) {
  const rules = document.getElementById('dyb-how-to-body');
  const dice  = document.getElementById('dyb-how-to-dice');
  if (rules) rules.style.display = tab === 'dice' ? 'none' : 'flex';
  if (dice)  dice.style.display  = tab === 'dice' ? 'flex' : 'none';
  document.querySelectorAll('[data-dyb-howto-tab]').forEach(b => {
    b.classList.remove('pill-active-dyb');       // .pill is the base — never removed
    if (b.dataset.dybHowtoTab === tab) b.classList.add('pill-active-dyb');
  });
  if (tab === 'dice') dybRenderDiceGallery();
}

function dybRenderDiceGallery() {
  const box = document.getElementById('dyb-dice-body');
  if (!box) return;
  box.innerHTML = '';

  const section = (label, blurb) => {
    const wrap = document.createElement('div');
    wrap.className = 'flex flex-col gap-2';
    const h = document.createElement('p');
    h.className = 'text-xs font-semibold uppercase tracking-widest dyb-label';
    h.textContent = label;
    const b = document.createElement('p');
    b.className = 'text-stone-500 text-sm';
    b.textContent = blurb;
    const row = document.createElement('div');
    row.className = 'grid grid-cols-3 gap-3 justify-items-center pt-1';
    wrap.append(h, b, row);
    box.appendChild(wrap);
    return row;
  };
  // dybDieHTML returns markup, not a node — unwrap it so artMakeZoomable has an element.
  const tile = (row, html, url, caption) => {
    const holder = document.createElement('div');
    holder.innerHTML = html;
    const die = holder.firstElementChild;
    if (!die) return;
    const cell = document.createElement('div');
    cell.className = 'flex flex-col items-center gap-1';
    cell.appendChild(artMakeZoomable(die, url, caption));
    const c = document.createElement('p');
    c.className = 'text-[0.65rem] text-stone-500 text-center leading-tight';
    c.textContent = caption;
    cell.appendChild(c);
    row.appendChild(cell);
  };

  const faces = section('The Faces',
    'Five dice each, rolled behind your hand. These are the six a standard die can show.');
  for (let f = 1; f <= 6; f++) {
    const url = (typeof assetFace === 'function') && assetFace('dyb', f);
    tile(faces, dybDieHTML(f, 'standard', -1), url, String(f));
  }

  const back = section('In the Cup', 'What everyone else sees before The Overlook.');
  tile(back, dybDieBackHTML(), (typeof assetBack === 'function') && assetBack('dyb'), 'Face down');
}

function dybOpenSlickPicker(dieIdx) {
  // One-time lock: once a Slick face is committed (assigned) it cannot be changed
  if (dybSlickAssigned[dieIdx]) return;
  // Shake screen: always allow — all players roll simultaneously, so any player can
  // pre-assign their Slick face even if they won't get a bid turn this shake.
  // Table screen: only allow if it is currently this player's turn.
  const shakeScreen = document.getElementById('screen-dyb-shake');
  const isOnShake   = shakeScreen && shakeScreen.style.display !== 'none';
  if (!isOnShake) {
    const tableScreen = document.getElementById('screen-dyb-table');
    if (!tableScreen || tableScreen.style.display === 'none') return;
    if (window.syllyMultiplayerMode !== 'single' && dybCurrentBidderIdx !== mpMyPlayerIdx) return;
  }
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
  dybSlickFaces[dieIdx]    = face;
  dybSlickAssigned[dieIdx] = true;
  document.getElementById('dyb-slick-picker-overlay').style.display = 'none';
  // Sync the committed face to host so allSlickFaces is accurate at showdown
  if (window.syllyMultiplayerMode === 'client') {
    mpSendEnvelope({ type: 'ACTION', payload: { action: 'DYB_SLICK_UPDATE', dieIdx, face } });
  } else if (window.syllyMultiplayerMode === 'host') {
    if (!dybAllSlickFaces[mpMyPlayerIdx]) dybAllSlickFaces[mpMyPlayerIdx] = [];
    dybAllSlickFaces[mpMyPlayerIdx][dieIdx] = face;
  }
  const shakeScreen = document.getElementById('screen-dyb-shake');
  const dockId = shakeScreen && shakeScreen.style.display !== 'none'
    ? 'dyb-hand-dock-shake'
    : 'dyb-hand-dock-table';
  dybRenderHandDock(dockId);
}

// ── The Ascent — bid history ──────────────────────────────────────────────────

function dybRenderAscentPreview() {
  const section = document.getElementById('dyb-ascent-section');
  const preview = document.getElementById('dyb-ascent-preview');
  if (!section || !preview) return;
  if (!dybAllegationHistory.length) {
    section.style.display = 'none';
    return;
  }
  section.style.display = 'flex';
  preview.textContent = dybAllegationHistory.slice(-3).map(h => {
    const name = dybPlayerNames[h.playerIdx] || ('P' + (h.playerIdx + 1));
    return `${name}: ${h.qty}×[${h.face}]`;
  }).join(' → ');
}

function dybRenderAscentHistory() {
  const el = document.getElementById('dyb-ascent-history');
  if (!el) return;
  if (!dybAllegationHistory.length) {
    el.innerHTML = '<p class="text-stone-400 text-sm text-center">No bids yet.</p>';
    return;
  }
  el.innerHTML = dybAllegationHistory.map((h, idx) => {
    const name = dybPlayerNames[h.playerIdx] || ('P' + (h.playerIdx + 1));
    return `<div class="flex items-center gap-3 py-2 ${idx > 0 ? 'border-t border-stone-100' : ''}">
      <span class="text-xs text-stone-400 w-4 text-right">${idx + 1}</span>
      <span class="text-sm text-stone-600 font-semibold flex-1">${name}</span>
      <span class="text-sm text-stone-800 font-bold">${h.qty} × [${h.face}]</span>
    </div>`;
  }).join('');
}

// ── Tip / die-info overlay ────────────────────────────────────────────────────

function dybShowTip(emoji, heading, lines) {
  document.getElementById('dyb-tip-emoji').textContent = emoji;
  document.getElementById('dyb-tip-heading').textContent = heading;
  document.getElementById('dyb-tip-body').innerHTML = lines.map(l => `<p>${l}</p>`).join('');
  document.getElementById('dyb-tip-overlay').style.display = 'flex';
}

function dybShowDieInfo(type) {
  const info = {
    loaded:  ['🪙', 'Loaded Die',   ['This die counts as <strong>2</strong> toward its face value.', 'A bid of 3×4 with a Loaded 4 means the real count is actually 4.']],
    phantom: ['👻', 'Phantom Die',  ['The face is <strong>hidden from you</strong> — even you don\'t know what it rolled.', 'It counts normally at its real value during the Overlook.', 'It may also be <strong>hiding a special type</strong> underneath — Loaded, Snake, Cracked, or Slick — revealed only when the hands are shown.']],
    slick:   ['🔵', 'Slick Die',    ['It rolled a face automatically — shown as <strong>X*</strong> until you commit.', '<strong>Tap it</strong> to change to any face you like — but only once, and only during your turn.', 'Once committed the face is locked until the next Shake.']],
    cracked: ['💀', 'Cracked Die',  ['This die is <strong>worthless</strong> — counts as 0 toward any face.', 'Dead weight in your hand, but opponents don\'t know which die it is.']],
    snake:   ['🐍', 'Snake Die',    ['This die counts as <strong>−1</strong> toward its face value — it drags the real count down.', 'With Classic or Volatile Wildcards: a Snake rolling a 1 is <strong>Venom Wilds</strong> — it counts −1 toward whatever face is being bid.']],
  };
  const [emoji, heading, lines] = info[type] || ['🎲', 'Standard Die', ['A regular, fair die. Nothing special here.']];
  dybShowTip(emoji, heading, lines);
}

function dybShowTempestGuide() {
  dybShowTip('🌩️', 'The Tempest — Special Dice', [
    '🪙 <strong>Loaded</strong> — counts as 2 toward its face.',
    '👻 <strong>Phantom</strong> — face hidden even from you. Counts normally.',
    '🔵 <strong>Slick</strong> — tap to secretly assign any face.',
    '💀 <strong>Cracked</strong> — counts as 0. Dead weight.',
    '🐍 <strong>Snake</strong> — counts as −1 toward its face. Rolling a 1 with Wildcards on targets the bid face (Venom Wilds).',
  ]);
}

// ── Match reset ───────────────────────────────────────────────────────────────
function dybResetMatchState() {
  dybDiceInHand       = [];
  dybLives            = [];
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
  // Summit stats
  dybClashWins    = [];
  dybClashLosses  = [];
  dybFaceFreq     = [];
  dybShakeLogs    = [];
  dybAllShakeLogs = [];
  dybChronicleIdx = 0;
}

// ── Multiplayer envelope handler ──────────────────────────────────────────────
function dybHandleEnvelope(env) {
  const { type, payload } = env;

  if (type === 'ACTION') {
    if (window.syllyMultiplayerMode !== 'host') return;

    // Resolve player index from Firebase UID — env.originId is the UID, never an index
    const originIdx = mpPlayerSlots.findIndex(p => p.uid === env.originId);
    if (originIdx === -1) return;

    switch (payload.action) {
      case 'DYB_ROLL_SUBMIT':
        dybRecordRoll(originIdx, payload.roll, payload.specialTypes || [], payload.slickFaces || [], payload.phantomTypes || []);
        break;

      case 'DYB_SLICK_UPDATE':
        // Fire-and-forget: player committed their Slick face during table phase after initial roll submit
        if (!dybAllSlickFaces[originIdx]) dybAllSlickFaces[originIdx] = [];
        dybAllSlickFaces[originIdx][payload.dieIdx] = payload.face;
        break;

      case 'DYB_ALLEGATION':
        if (originIdx !== dybCurrentBidderIdx) return; // stale / wrong bidder
        dybProcessAllegation(originIdx, payload.face, payload.qty);
        break;

      case 'DYB_CALL_BLUFF':
        if (originIdx !== dybCurrentBidderIdx) return;
        dybProcessCallBluff(originIdx);
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
        dybLives            = payload.lives || [];
        dybCurrentOpenerIdx = payload.firstOpenerIdx;
        dybWildcardsStyle   = payload.wildcards;
        dybStartingHand     = payload.startingHand;
        dybFootholdsMode    = payload.footholdsMode  || false;
        dybFootholdsCount   = payload.footholdsCount || 5;
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
          payload.activePlayers, payload.playerNames, payload.diceInHand, payload.lives
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
        if (payload.lives) dybLives = payload.lives;
        if (!dybActivePlayers.includes(mpMyPlayerIdx)) {
          dybShowSpiritBoard(); // eliminated players stay on the Spirit Board, not the Shake screen
        } else {
          dybInitShake();
        }
        break;

      case 'DYB_GAMEOVER':
        dybShowGameover(payload);
        break;

      // A client quit mid-game; dissolve for everyone (MDLM quit contract, PASS pattern —
      // logic-engine.md § MDLM Mid-Game Quit Contract). Host-only gate already applied above.
      case 'DYB_PLAYER_LEFT':
        resetToLobby(); // broadcasts HOST_END_GAME to remaining clients
        break;
    }
  }
}
