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

// ── Copy — every visible string drawn by JS lives here, so the identity-doc
//    checker (which reads this file) can find each one whole. ────────────────
const DYB_COPY = {
  yourCup:   'Your cup',
  ascent:    'The Ascent ›',
  closeUp:   'Close-up',
  whole:     'Whole table',
  noClaim:   'No claim yet.',
  call:      'Call the Bluff',
  deciding:  'is deciding…',
  youOpen:   'No claim yet. You open.',
  enough:    'enough on your own',
};
const DYB_NUM_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
function dybBidText(qty, face) { return `${DYB_NUM_WORDS[qty] || qty} ${face}${qty === 1 ? '' : 's'}`; }

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

  // ── Tip overlay close
  document.getElementById('btn-dyb-tip-close').addEventListener('click', () => {
    playDone();
    document.getElementById('dyb-tip-overlay').style.display = 'none';
  });

  // ── Ascent overlay
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
  dybDraft = null;
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
// ── Table phase — live wiring over the shared renderers ────────────────────
function dybTableCtx() { return { claim: dybClaimNow(), rules: dybRulesNow(), tableTotal: dybTableTotal() }; }
function dybRenderTableScreen(extra) {
  const isMyTurn = dybCurrentBidderIdx === mpMyPlayerIdx;
  if (isMyTurn && !dybDraft) dybDraft = dybDraftInit(dybClaimNow(), dybRulesNow());
  if (!isMyTurn) dybDraft = null;
  document.getElementById('dyb-table-shake').textContent = `Shake ${dybShakeNumber}`;
  const m = Object.assign(dybTableModel(), extra || {});
  dybRenderTable(document.getElementById('dyb-table-root'), m, dybTableAct);
}
function dybTableAct(act, data) {
  const ctx = dybTableCtx();
  let extra = null;
  switch (act) {
    case 'face':   playPillClick(); dybDraft = dybDraftReduce(dybDraft, { type: 'face', face: parseInt(data.face, 10) }, ctx); break;
    case 'inc':    playPillClick(); dybDraft = dybDraftReduce(dybDraft, { type: 'inc' }, ctx); break;
    case 'dec':    playPillClick(); dybDraft = dybDraftReduce(dybDraft, { type: 'dec' }, ctx); break;
    case 'view':   playPillClick(); extra = { ghostsIn: data.view === 'whole' && dybStageView !== 'whole' }; dybStageView = data.view; break;
    case 'climb':  playDone(); dybSubmitAllegation(); return;
    case 'call':   playExit(); dybCallBluff(); return;
    case 'ascent': playDone(); dybRenderAscentHistory(); document.getElementById('dyb-ascent-overlay').style.display = 'flex'; return;
    case 'slick':  dybOpenSlickPicker(parseInt(data.die, 10)); return;
    default: return;
  }
  dybRenderTableScreen(extra);
}

// ── Pure rules — no globals; the live table and Practice both call these ─────
// claim / bid: { qty, face } — qty 0 means "no claim yet".
// rules: { wildcards: 'strict'|'classic'|'volatile', onesStripped: bool }
function dybRulesNow() { return { wildcards: dybWildcardsStyle, onesStripped: dybOnesStripped }; }
function dybClaimNow() { return { qty: dybCurrentQty, face: dybCurrentFace }; }

// Which faces may be claimed at all. Volatile after a 1s claim allows ONLY 1s —
// the shipped picker's behaviour ("they strip and lock"), kept deliberately.
function dybFaceAllowed(face, rules) {
  if (face < 1 || face > 6) return false;
  if (rules.onesStripped) return face === 1;
  if (rules.wildcards === 'classic') return face !== 1;
  return true;
}

// Higher face → may keep the quantity; same/lower face → must raise it.
function dybMinQty(claim, face) {
  return face > claim.face ? Math.max(1, claim.qty) : claim.qty + 1;
}

function dybLegalRaise(claim, bid, rules) {
  if (!dybFaceAllowed(bid.face, rules) || bid.qty < 1) return false;
  return bid.qty > claim.qty || (bid.qty === claim.qty && bid.face > claim.face);
}

const DYB_FACE_REASON = {
  wildOnes: "1s are wild, so they can't be claimed.",
  stripped: '1s were claimed. Only 1s from here this Shake.',
  volatile: 'Claiming 1s switches wilds off for this Shake.',
};
// The line under the face row after a tap: why a face is closed, or a warning.
function dybFaceNote(face, rules) {
  if (!dybFaceAllowed(face, rules)) return rules.onesStripped ? DYB_FACE_REASON.stripped : DYB_FACE_REASON.wildOnes;
  if (face === 1 && rules.wildcards === 'volatile' && !rules.onesStripped) return DYB_FACE_REASON.volatile;
  return null;
}






function dybSubmitAllegation() {
  if (dybCurrentBidderIdx !== mpMyPlayerIdx || !dybDraft) return;
  if (!dybLegalRaise(dybClaimNow(), dybDraft, dybRulesNow())) return;
  const { face, qty } = dybDraft;
  mpLockSync();
  const payload = { action: 'DYB_ALLEGATION', face, qty };
  if (window.syllyMultiplayerMode === 'client') {
    mpSendEnvelope({ type: 'ACTION', payload });
    return;
  }
  dybProcessAllegation(mpMyPlayerIdx, face, qty);
}

function dybProcessAllegation(fromIdx, face, qty) {
  dybDraft = null;
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
  const out = [];
  dybCountEvents(face, dybHandsNow(), dybRulesNow()).forEach(e => {
    for (let k = 0; k < e.delta; k++) out.push({ pIdx: e.pIdx, dieIdx: e.dieIdx });
  });
  return out;
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

/// ── Counting — ONE source for the verdict and the reveal ────────────────────
// hands: { n, rolls, types, slicks, phantoms }, each indexed [pIdx][dieIdx].
// After the wire any of them may be an index-keyed OBJECT (an eliminated seat
// leaves a hole), so everything here indexes 0..n-1 and never calls forEach on
// the outer collection.
function dybHandsNow() {
  return { n: dybPlayerCount, rolls: dybAllRolls, types: dybAllSpecialTypes,
           slicks: dybAllSlickFaces, phantoms: dybAllPhantomTypes };
}

// One die's contribution to a count of `face`: 2 | 1 | 0 | -1, or null when it
// takes no part (a 0 is a Cracked die that WOULD have counted — it shudders).
function dybDieDelta(val, type, slick, secondary, face, rules) {
  const wild    = rules.wildcards !== 'strict' && !rules.onesStripped;
  const matches = val === face || (wild && val === 1 && face !== 1);
  const eff     = type === 'phantom' ? (secondary || 'standard') : type;
  switch (eff) {
    case 'cracked': return matches ? 0 : null;
    case 'slick':   return slick === face ? 1 : null;     // a Slick counts only its chosen face, never wild
    case 'snake':   return matches ? -1 : null;
    case 'loaded':  return matches ? 2 : null;
    default:        return matches ? 1 : null;
  }
}

// Ordered for the reveal: every positive first, then the shudders, then the
// knocks — so a Snake always has a filled slot to knock out if one exists.
function dybCountEvents(face, hands, rules) {
  const pos = [], zero = [], neg = [];
  for (let pIdx = 0; pIdx < hands.n; pIdx++) {
    const roll = (hands.rolls || {})[pIdx];
    if (!roll) continue;
    const types = (hands.types || {})[pIdx] || [], slicks = (hands.slicks || {})[pIdx] || [];
    const phantoms = (hands.phantoms || {})[pIdx] || [];
    for (let dieIdx = 0; dieIdx < roll.length; dieIdx++) {
      const s = slicks[dieIdx];
      const d = dybDieDelta(roll[dieIdx], types[dieIdx] || 'standard', s === undefined || s === null ? -1 : s,
                            phantoms[dieIdx] || null, face, rules);
      if (d === null) continue;
      (d > 0 ? pos : d === 0 ? zero : neg).push({ pIdx, dieIdx, delta: d });
    }
  }
  return [...pos, ...zero, ...neg];
}
function dybCountSum(events) { return events.reduce((s, e) => s + e.delta, 0); }

function dybComputeRealCount(face) { return dybCountSum(dybCountEvents(face, dybHandsNow(), dybRulesNow())); }

// ── What THIS player can vouch for ──────────────────────────────────────────
// From what they can SEE: a Phantom never counts — its face is hidden from its
// owner, and counting it would leak it. Cracked and Snake fill nothing.
function dybMyHand() {
  return { roll: dybMyRoll, types: dybSpecialTypes, slicks: dybSlickFaces, slickAssigned: dybSlickAssigned };
}
function dybYouHold(hand, face, rules) {
  const wild = rules.wildcards !== 'strict' && !rules.onesStripped;
  const dice = [];
  (hand.roll || []).forEach((val, dieIdx) => {
    const type = (hand.types || [])[dieIdx] || 'standard';
    if (type === 'phantom' || type === 'cracked' || type === 'snake') return;
    if (type === 'slick') {
      if ((hand.slicks || [])[dieIdx] === face) dice.push({ dieIdx, face, weight: 1, wild: false });
      return;
    }
    const isWild = wild && val === 1 && face !== 1;
    if (val === face || isWild) dice.push({ dieIdx, face: val, weight: type === 'loaded' ? 2 : 1, wild: isWild });
  });
  return { total: dice.reduce((s, d) => s + d.weight, 0), dice };
}

// ── The bid draft — the claim this device is building (pure) ───────────────
let dybDraft     = null;     // { face, qty, notice } — this device's bid in progress; null off-turn
let dybStageView = 'whole';  // 'whole' | 'close' — memory only; survives matches, not reloads (spec § 4.1)

// Opening: the lowest face the rules allow, at 1. Facing a claim: the standing
// face, one more — so climbing is always a single tap.
function dybDraftInit(claim, rules) {
  if (!claim.qty) {
    let f = 1;
    while (f < 6 && !dybFaceAllowed(f, rules)) f++;
    return { face: f, qty: 1, notice: null };
  }
  return { face: claim.face, qty: dybMinQty(claim, claim.face), notice: null };
}

// ctx: { claim, rules, tableTotal }. A closed face never changes the bid — it
// raises a notice (the face) so the row can say why. Legality never reads the
// table total; only + does (it stops there).
function dybDraftReduce(draft, action, ctx) {
  switch (action.type) {
    case 'face':
      if (!dybFaceAllowed(action.face, ctx.rules)) return { ...draft, notice: action.face };
      return { face: action.face, qty: dybMinQty(ctx.claim, action.face), notice: null };
    case 'inc':
      return { ...draft, qty: draft.qty < ctx.tableTotal ? draft.qty + 1 : draft.qty, notice: null };
    case 'dec':
      return { ...draft, qty: Math.max(dybMinQty(ctx.claim, draft.face), draft.qty - 1), notice: null };
    default:
      return draft;
  }
}

// ── Stage fit — the largest die size that keeps n dice on the stage ────────
const DYB_STAGE_MIN_PX = 18, DYB_STAGE_MAX_PX = 44;
const DYB_DIE_GAP = 3, DYB_GROUP_GAP = 8, DYB_ROW_GAP = 6;
// Dice sit in groups of five, like tally marks. Returns 0 when even the minimum
// size does not fit — the renderer then collapses the ghosts into "+N more".
function dybStageFit(n, w, h) {
  for (let px = DYB_STAGE_MAX_PX; px >= DYB_STAGE_MIN_PX; px--) {
    const groupW = 5 * px + 4 * DYB_DIE_GAP;
    if (groupW > w) continue;
    const perLine = Math.max(1, Math.floor((w + DYB_GROUP_GAP) / (groupW + DYB_GROUP_GAP)));
    const lines = Math.ceil(Math.ceil(n / 5) / perLine);
    if (lines * px + (lines - 1) * DYB_ROW_GAP <= h) return px;
  }
  return 0;
}

// ── The live table model ────────────────────────────────────────────────────
function dybTableTotal() { return dybActivePlayers.reduce((s, i) => s + (dybDiceInHand[i] || 0), 0); }
function dybPlayersModel(turnIdx) {
  const me = mpMyPlayerIdx;
  return dybPlayerNames.map((name, idx) => ({
    idx, name: name || `Player ${idx + 1}`,
    label: idx === me ? `${name || `Player ${idx + 1}`} (you)` : (name || `Player ${idx + 1}`),
    tint: dybTintFor(idx),
    count: dybFootholdsMode ? (dybLives[idx] || 0) : (dybDiceInHand[idx] || 0),
    footholds: dybFootholdsMode,
    out: !dybActivePlayers.includes(idx), active: idx === turnIdx, you: idx === me,
  }));
}
function dybTableModel() {
  const me = mpMyPlayerIdx, turn = dybCurrentBidderIdx, claim = dybClaimNow(), rules = dybRulesNow();
  const last = dybAllegationHistory[dybAllegationHistory.length - 1];
  const isMyTurn = turn === me;
  return {
    set: dybActiveSet(), me, myTint: dybTintFor(me), tempest: dybSyllyMode,
    players: dybPlayersModel(turn),
    claim: claim.qty ? { qty: claim.qty, face: claim.face, by: last ? last.playerIdx : -1 } : null,
    rules, tableTotal: dybTableTotal(), hand: dybMyHand(),
    isMyTurn, turnName: dybPlayerNames[turn] || 'Player', turnTint: dybTintFor(turn),
    draft: isMyTurn ? dybDraft : null, view: dybStageView, preview: null, caption: null,
    climbEnabled: isMyTurn && !!dybDraft && dybLegalRaise(claim, dybDraft, rules),
    highlight: null, ghostsIn: false,
  };
}

// ── Table renderers — model in, markup out. Shared by the live table and Practice.
function dybClimbersHTML(players, set, plungeIdx = -1) {
  return players.map(p => {
    const hex = dybTintHex(set, p.tint);
    const shown = p.count + (p.idx === plungeIdx ? 1 : 0);   // the falling die is still there until the verdict
    let lives;
    if (p.footholds && shown > 5) {
      lives = `${dybMiniMarkup(set, p.tint, 'dyb-mini-foothold')}<span>${shown}</span>`;
    } else {
      lives = Array.from({ length: shown }, (_, k) => {
        const fall = p.idx === plungeIdx && k === shown - 1 ? ' dyb-mini-plunge' : '';
        return dybMiniMarkup(set, p.tint, (p.footholds ? 'dyb-mini-foothold' : '') + fall);
      }).join('');
    }
    return `<div class="dyb-chip${p.active ? ' dyb-chip-on' : ''}${p.out ? ' dyb-chip-out' : ''}" style="--dyb-tint:${hex}">
      <div class="dyb-chip-top">${dybDieMarkup(dybDieRecipe({ set, tint: p.tint, face: 5 }), 16)}<span class="dyb-chip-name">${dybEsc(p.label)}</span></div>
      <div class="dyb-chip-lives">${lives}</div></div>`;
  }).join('');
}

// The player's own dice. Special dice carry data-hold (tap-and-hold → the Dice
// gallery); an unpicked Slick carries data-act="slick".
function dybCupDiceHTML(hand, set, tint, px) {
  return (hand.roll || []).map((val, i) => {
    const type = (hand.types || [])[i] || 'standard';
    const s = (hand.slicks || [])[i];
    const assigned = (hand.slickAssigned || [])[i] !== false;
    const concealed = type === 'phantom';
    let face = val, state = 'face';
    if (type === 'slick') { face = s > 0 ? s : val; if (!assigned) state = 'unpicked'; }
    if (concealed) state = 'concealed';
    const act = type === 'slick' && !assigned ? ' data-act="slick"' : '';
    const hold = type !== 'standard' ? ` data-hold="${type}"` : '';
    return dybDieMarkup(dybDieRecipe({ set, tint, face, type, state }), px, ` data-die="${i}"${act}${hold}`);
  }).join('');
}

function dybClaimLineHTML(m) {
  if (!m.claim) {
    return `<span class="dyb-claim-text">${m.isMyTurn ? DYB_COPY.youOpen : DYB_COPY.noClaim}</span>`;
  }
  const by = m.players.find(p => p.idx === m.claim.by);
  const who = by ? `<span class="dyb-swatch" style="--dyb-tint:${dybTintHex(m.set, by.tint)}"></span><b>${dybEsc(by.name)}</b> claims ` : '';
  return `${who}<span class="dyb-claim-text"><b>${dybBidText(m.claim.qty, m.claim.face)}</b></span>` +
         `<button class="dyb-link" data-act="ascent">${DYB_COPY.ascent}</button>`;
}

function dybStageWidth(root) {
  const s = root.querySelector && root.querySelector('.dyb-stage-dice');
  if (s && s.clientWidth) return s.clientWidth;
  return Math.max(120, (root.clientWidth || 340) - 104);
}

function dybStageHTML(m, w) {
  const target = m.isMyTurn ? m.draft : (m.claim || m.preview);
  const H = 132;
  if (!target) return `<div class="dyb-stage"><p class="dyb-hold">${DYB_COPY.noClaim}</p></div>`;
  const hold = dybYouHold(m.hand, target.face, m.rules);
  const need = Math.max(0, target.qty - hold.total);
  const others = Math.max(0, m.tableTotal - (m.hand.roll || []).length);
  const wantWhole = m.view === 'whole';
  let px = dybStageFit(wantWhole ? m.tableTotal : target.qty, w, H);
  let collapse = false;
  if (wantWhole && !px) { collapse = true; px = dybStageFit(target.qty, w, H) || DYB_STAGE_MIN_PX; }
  if (!px) px = DYB_STAGE_MIN_PX;
  const cells = [];
  hold.dice.forEach(d => {
    const type = (m.hand.types || [])[d.dieIdx] || 'standard';
    const die = dybDieMarkup(dybDieRecipe({ set: m.set, tint: m.myTint, face: d.face, type: type === 'loaded' ? 'loaded' : 'standard' }), px);
    for (let k = 0; k < d.weight && cells.length < target.qty; k++) {
      const one = k ? die.replace('<div class="dyb-die ', '<div class="dyb-die dyb-slot-echo ') : die;
      cells.push(d.wild ? `<span class="dyb-wild">${one}</span>` : one);
    }
  });
  const needRecipe = dybDieRecipe({ set: m.set, tint: m.myTint, face: target.face });
  while (cells.length < target.qty) cells.push(dybDieMarkup(needRecipe, px, '', 'dyb-slot-need'));
  if (wantWhole && !collapse) {
    for (let i = target.qty; i < m.tableTotal; i++) {
      cells.push(`<span class="dyb-slot-ghost${m.ghostsIn ? ' dyb-ghost-in' : ''}" style="--dyb-s:${px}px"></span>`);
    }
  }
  const groups = [];
  for (let i = 0; i < cells.length; i += 5) groups.push(`<div class="dyb-group">${cells.slice(i, i + 5).join('')}</div>`);
  if (collapse) groups.push(`<span class="dyb-more">+${m.tableTotal - target.qty} more on the table</span>`);
  const caption = m.caption || (m.isMyTurn
    ? `${m.claim ? 'Your climb' : 'Your opening'}: <b>${dybBidText(target.qty, target.face)}</b>`
    : `Standing claim: <b>${dybBidText(target.qty, target.face)}</b>`);
  const hi = k => (m.highlight === k ? ' dyb-coach-ring' : '');
  const toggle = `<div class="dyb-toggle${hi('toggle')}">` +
    `<button data-act="view" data-view="close" class="${m.view === 'close' ? 'on' : ''}">${DYB_COPY.closeUp}</button>` +
    `<button data-act="view" data-view="whole" class="${m.view === 'whole' ? 'on' : ''}">${DYB_COPY.whole}</button></div>`;
  const step = (act, sign, off) => (m.isMyTurn
    ? `<button class="dyb-step${hi(act)}" data-act="${act}" aria-label="${act === 'inc' ? 'One more' : 'One fewer'}"${off ? ' disabled' : ''}>${sign}</button>` : '');
  const atMin = m.draft && m.draft.qty <= dybMinQty(m.claim || { qty: 0, face: 0 }, m.draft.face);
  const atMax = m.draft && m.draft.qty >= m.tableTotal;
  const holdLine = need === 0
    ? `You hold <b>${hold.total}</b> · ${DYB_COPY.enough}`
    : `You hold <b>${hold.total}</b> · need <b>${need}</b> more from the other <b>${others}</b> dice`;
  return `<div class="dyb-stage${hi('stage')}">
    <div class="dyb-stage-head"><span>${caption}</span>${toggle}</div>
    <div class="dyb-stage-row">${step('dec', '−', atMin)}<div class="dyb-stage-dice">${groups.join('')}</div>${step('inc', '+', atMax)}</div>
    <p class="dyb-hold">${holdLine}</p></div>`;
}

function dybControlsHTML(m) {
  if (!m.isMyTurn) {
    const hex = dybTintHex(m.set, m.turnTint);
    return `<div class="dyb-turnbar" style="--dyb-tint:${hex}">${dybDieMarkup(dybDieRecipe({ set: m.set, tint: m.turnTint, face: 5 }), 20)}` +
           `<b>${dybEsc(m.turnName)}</b>&nbsp;${DYB_COPY.deciding}</div>`;
  }
  const d = m.draft;
  const faces = [1, 2, 3, 4, 5, 6].map(f => {
    const cls = ['dyb-face-btn', d && d.face === f ? 'on' : '', dybFaceAllowed(f, m.rules) ? '' : 'blocked',
                 m.highlight === `face-${f}` ? 'dyb-coach-ring' : ''].filter(Boolean).join(' ');
    return `<button class="${cls}" data-act="face" data-face="${f}" aria-label="Face ${f}">${dybDieMarkup(dybDieRecipe({ set: m.set, tint: m.myTint, face: f }), 36)}</button>`;
  }).join('');
  const note = d ? (d.notice ? dybFaceNote(d.notice, m.rules) : dybFaceNote(d.face, m.rules)) : null;
  const label = d ? `${m.claim ? 'Climb' : 'Open with'}: ${dybBidText(d.qty, d.face)}`.replace('Open with:', 'Open with') : '';
  const ring = k => (m.highlight === k ? ' dyb-coach-ring' : '');
  return `<div class="dyb-faces">${faces}</div>
    <p class="dyb-face-note">${note || ''}</p>
    <div class="dyb-actions">
      ${m.claim ? `<button class="dyb-btn-call btn-mp-action${ring('call')}" data-act="call">${DYB_COPY.call}</button>` : ''}
      <button class="dyb-btn-climb dyb-cta btn-mp-action${ring('climb')}" data-act="climb"${m.climbEnabled ? '' : ' disabled'}>${label}</button>
    </div>`;
}

// Draws every part into root and routes taps through ONE delegated listener.
function dybRenderTable(root, m, onAct) {
  const w = dybStageWidth(root);
  root.innerHTML = `
    <div class="dyb-climbers">${dybClimbersHTML(m.players, m.set)}</div>
    <div class="dyb-cuprow"><span class="dyb-cuplabel">${DYB_COPY.yourCup}</span>
      <div class="dyb-cupdice${m.highlight === 'cup' ? ' dyb-coach-ring' : ''}">${dybCupDiceHTML(m.hand, m.set, m.myTint, 34)}</div></div>
    <div class="dyb-claimline">${dybClaimLineHTML(m)}</div>
    ${dybStageHTML(m, w)}
    ${dybControlsHTML(m)}`;
  root.onclick = e => {
    const b = e.target && e.target.closest ? e.target.closest('[data-act]') : null;
    if (!b || (root.contains && !root.contains(b)) || b.disabled) return;
    if (b.dataset.held === '1') { delete b.dataset.held; return; }   // the click after a tap-hold
    onAct(b.dataset.act, b.dataset);
  };
  dybBindHandHolds(root);
}

// Tap-and-hold on a special die → its row in the Dice gallery (Task 17 adds the row).
function dybBindHandHolds(box) {
  if (!box || !box.querySelectorAll) return;
  box.querySelectorAll('[data-hold]').forEach(el => {
    bindCardHold(el, () => { el.dataset.held = '1'; dybOpenHowTo('dice', el.dataset.hold); });
  });
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

// ── Dice render seam — every die in the game goes through here ─────────────
// dieIdx >= 0 : an owner's live hand (a Phantom stays concealed)
// dieIdx === -1: The Overlook (a Phantom is revealed; its mist lifts)
// dieIdx === -2: a spectator's view — The Depths (a Phantom stays concealed)
function dybTintFor(playerIdx) {
  const seat = (dybSeatNumbers || [])[playerIdx];
  return ((seat ? seat - 1 : playerIdx) % 8 + 8) % 8;
}
function dybEsc(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function dybDieHTML(val, type, slickFace, dieIdx = -1, isSlickAssigned = true, phantomSecondary = null, tint = null, px = 44) {
  const concealed = type === 'phantom' && dieIdx !== -1;
  let face = val, state = 'face';
  if (type === 'slick') { face = slickFace > 0 ? slickFace : val; if (!isSlickAssigned) state = 'unpicked'; }
  if (type === 'phantom' && !concealed && phantomSecondary === 'slick' && slickFace > 0) face = slickFace;
  if (concealed) state = 'concealed';
  const t = tint === null ? dybTintFor(typeof mpMyPlayerIdx === 'number' ? mpMyPlayerIdx : 0) : tint;
  return dybDieMarkup(dybDieRecipe({ set: dybActiveSet(), tint: t, face, type, secondary: phantomSecondary, state }), px);
}
function dybDieHTMLSm(face, tint = null) { return dybDieHTML(face, 'standard', -1, -1, true, null, tint, 38); }
function dybDieHTMLXs(face, tint = null) { return dybDieHTML(face, 'standard', -1, -1, true, null, tint, 26); }
// Face-down die (still used by the gallery's "In the Cup" until Task 17).
function dybDieBackHTML() { return dybCupMarkup(dybActiveSet()); }

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
  if (shakeScreen && shakeScreen.style.display !== 'none') dybRenderHandDock('dyb-hand-dock-shake');
  else dybRenderTableScreen();
}

// ── The Ascent — bid history ──────────────────────────────────────────────────

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
        dybDraft = null;
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
      // logic-engine.md § Mid-Game Quit Contract). Host-only gate already applied above.
      case 'DYB_PLAYER_LEFT':
        resetToLobby(); // broadcasts HOST_END_GAME to remaining clients
        break;
    }
  }
}
