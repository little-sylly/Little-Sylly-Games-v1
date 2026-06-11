// ════════════════════════════════════════════════════════════════════════════
// BAILED — Plugin
// Depends on: engine.js (showScreen, playLaunch, playExit, playDone,
//             playPillClick, playSuccess, playBoing, playTick, playAlarm,
//             playWhoosh, resetToLobby, activeGameId)
//             engine-multiplayer.js (syllyMultiplayerMode, mpLockSync,
//             mpSendEnvelope, mpUnlockSync, mpReturnToLobby, mpMyPlayerIdx)
// ════════════════════════════════════════════════════════════════════════════

// ── Constants ────────────────────────────────────────────────────────────────
const BLD_ROLE_TABLE = {
  5:  { friends: 3, flakes: 2 },
  6:  { friends: 4, flakes: 2 },
  7:  { friends: 4, flakes: 3 },
  8:  { friends: 5, flakes: 3 },
  9:  { friends: 6, flakes: 3 },
  10: { friends: 6, flakes: 4 },
};

const BLD_GROUP_TABLE = {
  5:  [2, 3, 2, 3, 3],
  6:  [2, 3, 4, 3, 4],
  7:  [2, 3, 3, 4, 4],
  8:  [3, 4, 4, 5, 5],
  9:  [3, 4, 4, 5, 5],
  10: [3, 4, 4, 5, 5],
};

const BLD_PLANS = [
  { name: 'Booking Accommodation', emoji: '🏠' },
  { name: "Who's Driving",         emoji: '🚗' },
  { name: 'Food Pickup',           emoji: '🍕' },
  { name: 'Alcohol Run',           emoji: '🍾' },
  { name: 'The Big Party',         emoji: '🎉' },
];

const BLD_FAIL_PHRASES = [
  // Plan 1 — Booking Accommodation
  [
    "Forgot to check the calendar 😬",
    "I thought someone else was handling the booking",
    "My account got locked and I just gave up",
    "I went to book it and the dates were already gone",
    "The group chat moved too fast and I lost the link",
    "I had every intention of doing it. Truly.",
  ],
  // Plan 2 — Who's Driving
  [
    "My car is in for a service, actually",
    "Had a couple drinks earlier — can't do it tonight",
    "GPS said it's like an hour away. I'm not doing that.",
    "My mate borrowed my car and I forgot to get it back",
    "I was going to, but then I sat down",
    "Paint spill on the highway, not joking.",
    "I thought someone else had put their hand up",
  ],
  // Plan 3 — Food Pickup
  [
    "The app cancelled my order and I gave up",
    "I got there and the place was closed",
    "My phone died and I couldn't find the address",
    "I ordered the wrong thing and had to start over",
    "There was a queue and I ran out of patience",
    "I thought we said we'd just sort it ourselves",
  ],
  // Plan 4 — Alcohol Run
  [
    "I got there and left my wallet at home",
    "They were out of what we wanted, so I bailed",
    "The bottleshop was closed by the time I got there",
    "I couldn't carry it all on my own, honestly",
    "I got distracted at the servo and lost track of time",
    "I thought we said we'd just drink what was there",
  ],
  // Plan 5 — The Big Party
  [
    "I'm just really not feeling it tonight",
    "There was something in my building's elevator I cannot explain",
    "Okay so there was an elephant. At the bottle shop. I'm serious.",
    "My couch has never felt so good as it did right then",
    "I made it to the door and then I remembered my favourite show was on",
    "I wasn't feeling 100% — it felt responsible to stay home",
    "My cat was giving me a look and I couldn't leave",
  ],
];

const BLD_SUCCESS_PHRASES = [
  "A modern miracle. We actually went.",
  "Everyone showed up. Frame this moment.",
  "The group chat survived another day.",
  "Against all odds, the vibes were immaculate.",
  "No one flaked! Check the group's temperature.",
  "Somehow, it all came together.",
  "The Itinerary thanks you for your service.",
];

// ── Settings (persist between play-agains) ────────────────────────────────────
let bldDramaMode = false;

// ── Roster (set in setup, persist across play-agains) ─────────────────────────
let bldPlayerCount = 5;
let bldPlayerNames = [];

// ── Game state (reset each play-again) ────────────────────────────────────────
let bldPlanTrack             = [null, null, null, null, null];
let bldSuccessCount          = 0;
let bldFailCount             = 0;
let bldCurrentPlanIdx        = 0;
let bldCurrentNominationAttempt = 0;
let bldCurrentPlannerIdx     = 0;
let bldFirstPlannerIdx       = 0;
let bldGameResult            = null;
let bldDramaGuessResult      = null;
let bldPlanHistory           = [];

// ── Role assignment (set once at bldStartGame(), never mutated) ────────────────
let bldFlakeIndices  = [];
let bldPotStirrerIdx = -1;
let bldBigFlakeIdx   = -1;

// ── Nomination / round state ──────────────────────────────────────────────────
let bldNominatedGroup = [];
let bldVotes          = {};
let bldVoteReady      = [];
let bldMissionCards   = {};
let bldMissionReady   = [];

// ── PTP-only state ────────────────────────────────────────────────────────────
let bldPtpPhase = null;
let bldPtpQueue = [];

// ── UI / phase state ──────────────────────────────────────────────────────────
let bldGamePhase      = null;
let bldAftermathPhase = null;

// ── MDLM: this device's player identity ──────────────────────────────────────
let bldMyPlayerIdx  = -1;
let bldMyRoleData   = null;
let bldSeatNumbers  = []; // bldSeatNumbers[playerIdx] = seat number (1-based)
let bldSeatOrder    = []; // bldSeatOrder[seatPos] = playerIdx; host-only for rotation
let bldCurrentSeatPos = 0; // current seat position in planner rotation (0-based)

// ── Drama Mode: Big Flake's pending guess ─────────────────────────────────────
let bldDramaGuessIdx = -1;

// ── Helper: shuffle an array ─────────────────────────────────────────────────
function bldShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Helper: pick random item from array ──────────────────────────────────────
function bldRandItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Helper: derived values ────────────────────────────────────────────────────
function bldGroupSize() {
  return BLD_GROUP_TABLE[bldPlayerCount][bldCurrentPlanIdx];
}

function bldBailsRequired() {
  return (bldCurrentPlanIdx === 3 && bldPlayerCount >= 7) ? 2 : 1;
}

// ── Toggle helper (shared with other games) ───────────────────────────────────
function bldSetToggle(id, isOn) {
  const btn = document.getElementById(id);
  if (!btn) return;
  if (isOn) {
    btn.textContent = 'ON';
    btn.className = 'game-toggle-on-yellow shrink-0';
  } else {
    btn.textContent = 'OFF';
    btn.className = 'game-toggle-off shrink-0';
  }
}

// ── Reset state ───────────────────────────────────────────────────────────────
function bldResetState() {
  bldPlanTrack                = [null, null, null, null, null];
  bldSuccessCount             = 0;
  bldFailCount                = 0;
  bldCurrentPlanIdx           = 0;
  bldCurrentNominationAttempt = 0;
  bldCurrentPlannerIdx        = 0;
  bldFirstPlannerIdx          = 0;
  bldGameResult               = null;
  bldDramaGuessResult         = null;
  bldPlanHistory              = [];
  bldFlakeIndices             = [];
  bldPotStirrerIdx            = -1;
  bldBigFlakeIdx              = -1;
  bldNominatedGroup           = [];
  bldVotes                    = {};
  bldVoteReady                = [];
  bldMissionCards             = {};
  bldMissionReady             = [];
  bldPtpPhase                 = null;
  bldPtpQueue                 = [];
  bldGamePhase                = null;
  bldAftermathPhase           = null;
  bldMyPlayerIdx              = -1;
  bldMyRoleData               = null;
  // bldSeatNumbers, bldSeatOrder, bldCurrentSeatPos are roster state — set by seating screen (MDLM) or bldAssignRoles (PTP)
  bldDramaGuessIdx            = -1;
}

// ── Show menu ─────────────────────────────────────────────────────────────────
function bldShowMenu() {
  showScreen('screen-bld-menu');
}

// ── Show setup ────────────────────────────────────────────────────────────────
function bldShowSetup() {
  bldRenderSetupInputs();
  bldUpdateFlakeHint();
  showScreen('screen-bld-setup');
}

function bldRenderSetupInputs() {
  const container = document.getElementById('bld-setup-inputs');
  container.innerHTML = '';
  for (let i = 0; i < bldPlayerCount; i++) {
    const div = document.createElement('div');
    div.innerHTML = `
      <label class="text-stone-500 text-sm font-semibold uppercase tracking-widest block mb-1">Player ${i + 1}</label>
      <input type="text" class="bld-player-input w-full rounded-xl border-2 border-stone-200 bg-white px-4 py-3 text-lg text-stone-800 placeholder-stone-300 focus:border-yellow-400 focus:outline-none transition-colors"
        placeholder="Name..." maxlength="20" data-idx="${i}" value="${bldPlayerNames[i] || ''}">
    `;
    container.appendChild(div);
  }
}

function bldUpdateFlakeHint() {
  const { flakes } = BLD_ROLE_TABLE[bldPlayerCount];
  const hasDrama = bldDramaMode;
  let hint = `${flakes} Flake${flakes > 1 ? 's' : ''} will be assigned secretly.`;
  if (hasDrama) hint += ' Drama Mode: includes The Pot-Stirrer and The Big Flake.';
  document.getElementById('bld-setup-flake-hint').textContent = hint;
}

// ── Assign roles ─────────────────────────────────────────────────────────────
function bldAssignRoles() {
  const { flakes } = BLD_ROLE_TABLE[bldPlayerCount];
  const indices    = bldShuffle([...Array(bldPlayerCount).keys()]);
  bldFlakeIndices  = indices.slice(0, flakes);
  const friendIndices = indices.slice(flakes);

  bldPotStirrerIdx = -1;
  bldBigFlakeIdx   = -1;

  if (bldDramaMode) {
    // First Friend in shuffled order = Pot-Stirrer
    bldPotStirrerIdx = friendIndices[0];
    // First Flake in shuffled order = Big Flake
    bldBigFlakeIdx   = bldFlakeIndices[0];
  }

  if (window.syllyMultiplayerMode !== 'single') {
    // MDLM: bldSeatOrder + bldSeatNumbers already set by seating screen
    bldCurrentSeatPos    = 0;
    bldCurrentPlannerIdx = bldSeatOrder[0];
    bldFirstPlannerIdx   = bldCurrentPlannerIdx;
  } else {
    // PTP: random seats — derive bldSeatOrder from shuffled bldSeatNumbers
    bldSeatNumbers = bldShuffle([...Array(bldPlayerCount).keys()].map(i => i + 1));
    bldSeatOrder   = [...Array(bldPlayerCount).keys()].sort((a, b) => bldSeatNumbers[a] - bldSeatNumbers[b]);
    bldCurrentSeatPos    = 0;
    bldCurrentPlannerIdx = bldSeatOrder[0];
    bldFirstPlannerIdx   = bldCurrentPlannerIdx;
  }
}

// ── Seating setup (MDLM host only — shown before roles are dealt) ────────────
function bldShowSeatingSetup() {
  bldSeatOrder = [...Array(bldPlayerCount).keys()]; // default: join order
  bldRenderSeatingList();
  showScreen('screen-bld-seating');
}

function bldRenderSeatingList() {
  const list = document.getElementById('bld-seating-list');
  if (!list) return;
  list.innerHTML = bldSeatOrder.map((playerIdx, seatPos) => {
    const name        = bldPlayerNames[playerIdx];
    const playerLabel = playerIdx === 0 ? 'Host' : `Player ${playerIdx + 1}`;
    const canUp       = seatPos > 0;
    const canDown     = seatPos < bldSeatOrder.length - 1;
    return `<div class="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm">
      <span class="text-stone-400 text-xs font-semibold w-12 shrink-0">Seat ${seatPos + 1}</span>
      <span class="flex-1 text-stone-800 font-semibold text-sm">${name}
        <span class="text-stone-400 font-normal text-xs ml-1">${playerLabel}</span>
      </span>
      <div class="flex gap-1">
        <button class="bld-seat-up min-h-9 min-w-9 rounded-xl bg-stone-100 text-stone-500 text-sm font-bold active:scale-90 transition-transform ${canUp ? '' : 'opacity-30 pointer-events-none'}" data-seat-pos="${seatPos}">↑</button>
        <button class="bld-seat-down min-h-9 min-w-9 rounded-xl bg-stone-100 text-stone-500 text-sm font-bold active:scale-90 transition-transform ${canDown ? '' : 'opacity-30 pointer-events-none'}" data-seat-pos="${seatPos}">↓</button>
      </div>
    </div>`;
  }).join('');
}

// ── Planner rotation (seat-order based) ──────────────────────────────────────
function bldAdvancePlanner() {
  bldCurrentSeatPos    = (bldCurrentSeatPos + 1) % bldPlayerCount;
  bldCurrentPlannerIdx = bldSeatOrder[bldCurrentSeatPos];
}

// ── Start game — kicks off PTP role reveal chain ──────────────────────────────
function bldStartGame() {
  applyExpansionOverrides(); // no-op for Bailed; hook required by checklist
  bldResetState();
  bldAssignRoles();

  if (window.syllyMultiplayerMode !== 'single') {
    bldStartGameMdlm();
    return;
  }
  // PTP: walk through role reveals player by player
  bldPtpQueue = [...Array(bldPlayerCount).keys()];
  bldShowNextPassGate();
}

// ── PTP pass-gate + role reveal chain ────────────────────────────────────────
function bldShowNextPassGate() {
  if (bldPtpQueue.length === 0) {
    // All roles revealed — start nominating
    bldStartNominating();
    return;
  }
  const playerIdx = bldPtpQueue[0];
  document.getElementById('bld-gate-name').textContent = bldPlayerNames[playerIdx];
  showScreen('screen-bld-pass-gate');
}

function bldShowRoleReveal(playerIdx) {
  const isFlake       = bldFlakeIndices.includes(playerIdx);
  const isBigFlake    = playerIdx === bldBigFlakeIdx;
  const isPotStirrer  = playerIdx === bldPotStirrerIdx;

  document.getElementById('bld-reveal-player-name').textContent = bldPlayerNames[playerIdx];

  const seatEl = document.getElementById('bld-reveal-seat-number');
  if (seatEl) {
    const seat = bldSeatNumbers[playerIdx];
    seatEl.textContent = seat ? `Seat ${seat}` : '';
    seatEl.classList.toggle('hidden', !seat || window.syllyMultiplayerMode === 'single');
  }

  const emojiEl     = document.getElementById('bld-reveal-role-emoji');
  const nameEl      = document.getElementById('bld-reveal-role-name');
  const descEl      = document.getElementById('bld-reveal-description');
  const extraEl     = document.getElementById('bld-reveal-extra');
  const extraNames  = document.getElementById('bld-reveal-extra-names');
  const dramaLabel  = document.getElementById('bld-reveal-drama-label');
  const dramaText   = document.getElementById('bld-reveal-drama-text');

  extraEl.classList.add('hidden');
  dramaLabel.classList.add('hidden');

  if (isPotStirrer) {
    emojiEl.textContent = '🤫';
    nameEl.textContent  = 'The Pot-Stirrer';
    descEl.textContent  = "You're a Friend — but you know who all the Flakes are. Steer the group quietly. If anyone figures you out, it could cost everyone.";
    const flakeNames = bldFlakeIndices.map(i => bldPlayerNames[i]).join(', ');
    extraEl.classList.remove('hidden');
    extraNames.textContent = flakeNames;
  } else if (isFlake) {
    emojiEl.textContent = '🚪';
    nameEl.textContent  = 'The Flake';
    const otherFlakes   = bldFlakeIndices.filter(i => i !== playerIdx);
    if (otherFlakes.length > 0) {
      descEl.textContent = "You're a Flake. Make sure the plans fail — without getting caught.";
      extraEl.classList.remove('hidden');
      extraNames.textContent = otherFlakes.map(i => bldPlayerNames[i]).join(', ');
    } else {
      descEl.textContent = "You're a Flake. Make sure the plans fail — without getting caught. You're on your own.";
    }
    if (isBigFlake && bldDramaMode) {
      dramaLabel.classList.remove('hidden');
      dramaText.textContent = "You're the Big Flake — if the Friends win, you get one chance to name The Pot-Stirrer.";
    }
  } else {
    emojiEl.textContent = '✅';
    nameEl.textContent  = 'A Friend';
    descEl.textContent  = "You're a Friend. Vote honestly, pick the right group, and make sure the plans go ahead.";
  }

  const confirmBtn = document.getElementById('btn-bld-reveal-confirm');
  confirmBtn.textContent = window.syllyMultiplayerMode !== 'single'
    ? 'Got it ✓'
    : 'Got it — pass the phone';

  showScreen('screen-bld-role-reveal');
}

// ── Role indicator (MDLM: show role + name in header) ────────────────────────
function bldUpdateRoleIndicator() {
  const subtitleEl = document.getElementById('bld-header-role-subtitle');
  const fellowEl   = document.getElementById('bld-header-fellow-flakes');
  if (!subtitleEl) return;
  if (window.syllyMultiplayerMode === 'single' || bldMyPlayerIdx < 0) {
    subtitleEl.classList.add('hidden');
    if (fellowEl) fellowEl.classList.add('hidden');
    return;
  }
  const isFlake      = bldFlakeIndices.includes(bldMyPlayerIdx);
  const isPotStirrer = bldMyPlayerIdx === bldPotStirrerIdx;
  const role        = isPotStirrer ? '🤫 The Pot-Stirrer' : isFlake ? '🚪 The Flake' : '✅ A Friend';
  const name        = bldPlayerNames[bldMyPlayerIdx] || '';
  const playerLabel = bldMyPlayerIdx === 0 ? 'Host' : `Player ${bldMyPlayerIdx + 1}`;
  const seat        = bldSeatNumbers[bldMyPlayerIdx];
  const seatLabel   = seat ? ` · Seat ${seat}` : '';
  subtitleEl.textContent = `${name} · ${playerLabel}${seatLabel} · ${role}`;
  subtitleEl.classList.remove('hidden');
  if (fellowEl) {
    if (isFlake && bldFlakeIndices.length > 1) {
      const fellowNames = bldFlakeIndices
        .filter(i => i !== bldMyPlayerIdx)
        .map(i => bldPlayerNames[i])
        .join(', ');
      fellowEl.textContent = `Fellow Flakes: ${fellowNames}`;
      fellowEl.classList.remove('hidden');
    } else {
      fellowEl.classList.add('hidden');
    }
  }
}

function bldShowRoleHelp() {
  const isFlake      = bldFlakeIndices.includes(bldMyPlayerIdx);
  const isPotStirrer = bldMyPlayerIdx === bldPotStirrerIdx;
  let emoji, name, desc;
  if (isPotStirrer) {
    emoji = '🤫'; name = 'The Pot-Stirrer';
    desc  = "You're a Friend who knows all the Flakes. Steer the group without getting caught — if the Friends win and the Big Flake names you correctly, they score.";
  } else if (isFlake) {
    emoji = '🚪'; name = 'The Flake';
    desc  = "Make the plans fail — without being obvious. Nominate suspicious groups, vote strategically, and bail when you're in the group. Don't get caught.";
  } else {
    emoji = '✅'; name = 'A Friend';
    desc  = "Vote honestly and pick trustworthy people. If a plan gets approved and someone bails, the Flakes score. 3 failed plans and the Flakes win.";
  }
  document.getElementById('bld-role-help-emoji').textContent = emoji;
  document.getElementById('bld-role-help-name').textContent  = name;
  document.getElementById('bld-role-help-desc').textContent  = desc;
  document.getElementById('bld-role-help-overlay').style.display = 'flex';
}

// ── Main game: nominating ─────────────────────────────────────────────────────
function bldStartNominating() {
  bldNominatedGroup = [];
  bldGamePhase = 'nominating';
  showScreen('screen-bld-main');
  bldRenderItinerary();
  bldRenderPatienceMeter();
  bldRenderMainHeader();
  bldUpdateRoleIndicator();
  bldRenderPhase();
}

function bldRenderMainHeader() {
  const plan = BLD_PLANS[bldCurrentPlanIdx];
  document.getElementById('bld-main-plan-label').textContent =
    `${plan.emoji} Plan ${bldCurrentPlanIdx + 1}: ${plan.name}`;
  document.getElementById('bld-main-planner-label').textContent =
    `Planner: ${bldPlayerNames[bldCurrentPlannerIdx]}`;
  bldUpdateRoleIndicator();
}

function bldRenderItinerary() {
  const container = document.getElementById('bld-itinerary');
  container.innerHTML = BLD_PLANS.map((plan, i) => {
    const status = bldPlanTrack[i];
    let bg = 'bg-stone-200 text-stone-500';
    let icon = plan.emoji;
    if (status === 'success') { bg = 'bg-green-100 text-green-700'; icon = '✅'; }
    if (status === 'fail')    { bg = 'bg-red-100 text-red-700';   icon = '❌'; }
    const isCurrent = i === bldCurrentPlanIdx && !status;
    const border = isCurrent ? 'ring-2 ring-yellow-400' : '';
    return `<button class="bld-itinerary-box flex-1 rounded-xl p-1.5 ${bg} ${border} text-center text-xs font-semibold leading-tight active:scale-95 transition-transform" data-plan-idx="${i}">
      <span class="block text-base">${icon}</span>
      <span class="block" style="font-size:10px">${'👤'.repeat(BLD_GROUP_TABLE[bldPlayerCount][i])}</span>
    </button>`;
  }).join('');
}

function bldRenderPatienceMeter() {
  const container = document.getElementById('bld-patience-dots');
  container.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const filled = i < bldCurrentNominationAttempt - (bldPlanTrack[bldCurrentPlanIdx] ? 0 : 0);
    // Count rejections for current plan from history
    const rejectionsThisPlan = bldPlanHistory.filter(
      r => r.planNumber === bldCurrentPlanIdx + 1 && r.status === 'Rejected'
    ).length;
    const dot = document.createElement('div');
    dot.className = `w-3 h-3 rounded-full ${i < rejectionsThisPlan ? 'bg-yellow-500' : 'bg-stone-200'}`;
    container.appendChild(dot);
  }
}

function bldRenderPhase() {
  const phases = ['nominating', 'voting', 'vote-pending', 'vote-result',
                  'mission', 'mission-pending', 'plan-result', 'drama-lock'];
  phases.forEach(p => {
    const el = document.getElementById(`bld-phase-${p}`);
    if (el) el.classList.add('hidden');
  });
  const activeEl = document.getElementById(`bld-phase-${bldGamePhase}`);
  if (activeEl) activeEl.classList.remove('hidden');

  // Populate phase-specific content
  if (bldGamePhase === 'nominating')   bldRenderNominating();
  if (bldGamePhase === 'voting')       bldRenderVoting();
  if (bldGamePhase === 'vote-result')  bldRenderVoteResultList();
  if (bldGamePhase === 'mission')      bldRenderMission();
  if (bldGamePhase === 'drama-lock')   bldRenderDramaLock();
}

// ── Nominating ────────────────────────────────────────────────────────────────
function bldRenderNominating() {
  const isMePlanner = (window.syllyMultiplayerMode === 'single') ||
                      (bldCurrentPlannerIdx === bldMyPlayerIdx);
  const plannerView = document.getElementById('bld-nominating-planner');
  const waitView    = document.getElementById('bld-nominating-waiting');

  if (isMePlanner) {
    plannerView.classList.remove('hidden');
    waitView.classList.add('hidden');
    const size = bldGroupSize();
    document.getElementById('bld-nominating-instruction').textContent =
      `Pick exactly ${size} ${size === 1 ? 'person' : 'people'} for this plan.`;
    const list = document.getElementById('bld-nominating-player-list');
    list.innerHTML = bldPlayerNames.map((name, i) => {
      const selected = bldNominatedGroup.includes(i);
      const bg = selected ? 'bg-yellow-100 ring-2 ring-yellow-400 text-yellow-800' : 'bg-stone-100 text-stone-700';
      return `<button class="bld-nominate-player min-h-12 w-full rounded-xl px-4 py-2 text-base font-semibold text-left ${bg} active:scale-95 transition-all duration-100" data-idx="${i}">
        ${name}${selected ? ' ✓' : ''}
      </button>`;
    }).join('');
  } else {
    plannerView.classList.add('hidden');
    waitView.classList.remove('hidden');
    document.getElementById('bld-nominating-wait-text').textContent =
      `${bldPlayerNames[bldCurrentPlannerIdx]} is choosing who's going…`;
  }
}

// ── Voting ────────────────────────────────────────────────────────────────────
function bldRenderVoting() {
  const names = bldNominatedGroup.map(i => bldPlayerNames[i]).join(', ');
  document.getElementById('bld-vote-group-display').textContent = names;
}

function bldCollectVote(vote) {
  // PTP: determine whose turn it is from bldPtpQueue
  const playerIdx = window.syllyMultiplayerMode === 'single'
    ? bldPtpQueue[0]
    : bldMyPlayerIdx;

  if (window.syllyMultiplayerMode === 'client') {
    mpLockSync();
    mpSendEnvelope({ type: 'ACTION', payload: { action: 'BLD_VOTE_SUBMIT', vote, playerIdx } });
    // switch this device to pending — voting is done for this player
    bldGamePhase = 'vote-pending';
    bldRenderPhase();
    return;
  }

  bldRecordVote(playerIdx, vote);
}

function bldRecordVote(playerIdx, vote) {
  bldVotes[playerIdx] = vote;
  bldVoteReady[playerIdx] = true;
  playDone();

  if (window.syllyMultiplayerMode === 'single') {
    bldPtpQueue.shift();
    if (bldPtpQueue.length > 0) {
      // Next player's PTP gate
      bldShowVotingPassGate();
    } else {
      bldResolveVote();
    }
  } else {
    // Host: check readyCheck
    const allReady = bldVoteReady.every(Boolean);
    if (allReady) {
      bldResolveVote();
    } else {
      // Only show pending if this device has already submitted its own vote
      if (bldVoteReady[bldMyPlayerIdx]) {
        bldGamePhase = 'vote-pending';
        bldRenderPhase();
      }
    }
  }
}

function bldShowVotingPassGate() {
  const nextIdx = bldPtpQueue[0];
  document.getElementById('bld-pass-reveal-heading').textContent = `${bldPlayerNames[nextIdx]}'s turn.`;
  document.getElementById('btn-bld-pass-reveal-confirm').textContent = 'Tap to Vote';
  bldPtpPhase = 'vote';
  document.getElementById('bld-pass-reveal-overlay').style.display = 'flex';
}

function bldResolveVote() {
  const inCount  = Object.values(bldVotes).filter(v => v === "Sounds Good").length;
  const outCount = Object.values(bldVotes).filter(v => v === "No Way").length;
  const approved = inCount > outCount;

  const record = {
    planNumber:     bldCurrentPlanIdx + 1,
    attemptNumber:  bldCurrentNominationAttempt,
    planner:        bldPlayerNames[bldCurrentPlannerIdx],
    nominatedGroup: bldNominatedGroup.map(i => bldPlayerNames[i]),
    votes:          Object.fromEntries(Object.entries(bldVotes).map(([idx, v]) => [bldPlayerNames[idx], v])),
    status:         approved ? 'Approved' : 'Rejected',
  };

  if (window.syllyMultiplayerMode !== 'single') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'BLD_VOTE_RESULT',
      votes: bldVotes,
      approved,
      record,
      plannerIdx: bldCurrentPlannerIdx,
      nominationAttempt: bldCurrentNominationAttempt,
    }});
  }

  bldApplyVoteResult(approved, record);
}

function bldApplyVoteResult(approved, record) {
  bldPlanHistory.push(record);
  bldGamePhase = 'vote-result';

  const outcomeEl = document.getElementById('bld-vote-result-outcome');
  if (approved) {
    outcomeEl.innerHTML = `<p class="text-green-600 font-bold text-lg">✅ Approved!</p><p class="text-stone-500 text-sm mt-1">The group is going ahead.</p>`;
  } else {
    const rejections = bldPlanHistory.filter(
      r => r.planNumber === bldCurrentPlanIdx + 1 && r.status === 'Rejected'
    ).length;
    if (rejections >= 5) {
      outcomeEl.innerHTML = `<p class="text-red-600 font-bold text-lg">❌ Rejected — 5th time!</p><p class="text-stone-500 text-sm mt-1">The Flakes win — the group couldn't agree on anything.</p>`;
    } else {
      outcomeEl.innerHTML = `<p class="text-red-500 font-semibold text-lg">❌ Rejected</p><p class="text-stone-500 text-sm mt-1">Patience Meter: ${rejections}/5</p>`;
    }
  }

  bldRenderVoteResultList();
  bldRenderItinerary();
  bldRenderPatienceMeter();
  bldRenderPhase();

  // Store whether approved for the next-button handler
  document.getElementById('btn-bld-vote-result-next').dataset.approved = approved ? '1' : '0';
}

function bldRenderVoteResultList() {
  const list = document.getElementById('bld-vote-result-list');
  list.innerHTML = Object.entries(bldVotes).map(([idx, vote]) => {
    const name  = bldPlayerNames[idx];
    const isIn  = vote === "Sounds Good";
    const colour = isIn ? 'text-green-600' : 'text-red-500';
    const icon   = isIn ? '✅' : '❌';
    return `<div class="flex items-center justify-between py-1 border-b border-stone-100 last:border-0">
      <span class="text-stone-700 text-sm font-semibold">${name}</span>
      <span class="${colour} text-sm font-semibold">${icon} ${vote}</span>
    </div>`;
  }).join('');
}

// ── Mission ───────────────────────────────────────────────────────────────────
function bldStartMission() {
  bldMissionCards = {};
  bldMissionReady = new Array(bldNominatedGroup.length).fill(false);

  if (window.syllyMultiplayerMode === 'single') {
    bldPtpQueue = [...bldNominatedGroup];
    bldShowMissionPassGate();
    return;
  }

  bldGamePhase = 'mission';
  bldRenderPhase();
}

function bldShowMissionPassGate() {
  const nextIdx = bldPtpQueue[0];
  document.getElementById('bld-pass-reveal-heading').textContent = `${bldPlayerNames[nextIdx]}'s turn.`;
  document.getElementById('btn-bld-pass-reveal-confirm').textContent = 'Tap to Submit';
  bldPtpPhase = 'mission';
  document.getElementById('bld-pass-reveal-overlay').style.display = 'flex';
}

function bldRenderMission() {
  const isMeNominated = window.syllyMultiplayerMode === 'single'
    ? true // always show the right view — pass-gate handles sequencing
    : bldNominatedGroup.includes(bldMyPlayerIdx);

  const nominatedView = document.getElementById('bld-mission-nominated');
  const waitingView   = document.getElementById('bld-mission-waiting');
  const bailBtn       = document.getElementById('btn-bld-mission-bailed');

  if (isMeNominated) {
    nominatedView.classList.remove('hidden');
    waitingView.classList.add('hidden');
    // Show "I Bailed" only for Flakes (PTP: check current player role)
    const currentPlayerIdx = window.syllyMultiplayerMode === 'single'
      ? bldPtpQueue[0]
      : bldMyPlayerIdx;
    const isCurrentFlake = bldFlakeIndices.includes(currentPlayerIdx);
    bailBtn.classList.toggle('hidden', !isCurrentFlake);
    // Show tip [?] only for Flakes — Friends have no choice but to submit honestly
    const tipBtn = document.getElementById('btn-bld-tip-mission');
    if (tipBtn) tipBtn.classList.toggle('hidden', !isCurrentFlake);
  } else {
    nominatedView.classList.add('hidden');
    waitingView.classList.remove('hidden');
  }
}

function bldCollectMissionCard(card) {
  const playerIdx = window.syllyMultiplayerMode === 'single'
    ? bldPtpQueue[0]
    : bldMyPlayerIdx;

  if (window.syllyMultiplayerMode === 'client') {
    mpLockSync();
    mpSendEnvelope({ type: 'ACTION', payload: { action: 'BLD_MISSION_SUBMIT', card, playerIdx } });
    bldGamePhase = 'mission-pending';
    bldRenderPhase();
    return;
  }

  bldRecordMissionCard(playerIdx, card);
}

function bldRecordMissionCard(playerIdx, card) {
  const queuePos = bldNominatedGroup.indexOf(playerIdx);
  bldMissionCards[playerIdx] = card;
  bldMissionReady[queuePos] = true;
  playDone();

  if (window.syllyMultiplayerMode === 'single') {
    bldPtpQueue.shift();
    if (bldPtpQueue.length > 0) {
      bldShowMissionPassGate();
    } else {
      bldResolveMission();
    }
  } else {
    if (bldMissionReady.every(Boolean)) {
      bldResolveMission();
    } else {
      // Only switch to pending if this device is nominated and has already submitted its own card
      const myQueuePos = bldNominatedGroup.indexOf(bldMyPlayerIdx);
      if (myQueuePos >= 0 && bldMissionReady[myQueuePos]) {
        bldGamePhase = 'mission-pending';
        bldRenderPhase();
      }
    }
  }
}

function bldResolveMission() {
  const bailCount   = Object.values(bldMissionCards).filter(c => c === 'I Bailed').length;
  const required    = bldBailsRequired();
  const planFailed  = bailCount >= required;

  // Plan 4 at 7+ players: 1 bail survives — special intermediate state
  const isIntermediate = (bldCurrentPlanIdx === 3 && bldPlayerCount >= 7 && bailCount === 1 && required === 2);

  let planOutcome;
  if (isIntermediate) {
    planOutcome = 'survived-one-bail';
  } else if (planFailed) {
    planOutcome = 'fail';
  } else {
    planOutcome = 'success';
  }

  // Add mission result to the last history record for this plan
  const lastRecord = bldPlanHistory[bldPlanHistory.length - 1];
  if (lastRecord) {
    lastRecord.bailCount   = bailCount;
    lastRecord.planOutcome = planOutcome;
  }

  if (planOutcome === 'success') {
    bldSuccessCount++;
    bldPlanTrack[bldCurrentPlanIdx] = 'success';
    playSuccess();
  } else if (planOutcome === 'fail') {
    bldFailCount++;
    bldPlanTrack[bldCurrentPlanIdx] = 'fail';
    playBoing();
  }
  // 'survived-one-bail' does not update planTrack yet

  if (window.syllyMultiplayerMode !== 'single') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'BLD_MISSION_RESULT',
      bailCount, planOutcome,
      planTrack: bldPlanTrack,
      successCount: bldSuccessCount,
      failCount: bldFailCount,
      record: bldPlanHistory[bldPlanHistory.length - 1],
    }});
  }

  bldShowPlanResult(bailCount, planOutcome);
}

// ── Plan result ───────────────────────────────────────────────────────────────
function bldShowPlanResult(bailCount, planOutcome) {
  // Game over — skip plan result card, go straight to aftermath on all devices
  if (bldCheckWinCondition()) {
    bldShowAftermath();
    return;
  }

  bldGamePhase = 'plan-result';
  bldRenderItinerary();
  bldRenderPhase();

  const card   = document.getElementById('bld-plan-result-card');
  const phrase = document.getElementById('bld-plan-result-phrase');
  const nextBtn = document.getElementById('btn-bld-plan-result-next');

  if (planOutcome === 'success') {
    card.innerHTML = `<p class="text-3xl">✅</p><p class="text-green-600 font-bold text-xl">Plan succeeded!</p>
      <p class="text-stone-500 text-sm">${bailCount === 0 ? 'Nobody bailed.' : `${bailCount} bail${bailCount > 1 ? 's' : ''} but it wasn't enough.`}</p>`;
    phrase.textContent = bldRandItem(BLD_SUCCESS_PHRASES);
  } else if (planOutcome === 'fail') {
    const failPhrase = bldRandItem(BLD_FAIL_PHRASES[bldCurrentPlanIdx]);
    const personWord = bailCount === 1 ? 'person' : 'people';
    card.innerHTML = `<p class="text-3xl">❌</p><p class="text-red-500 font-bold text-xl">${bailCount} ${personWord} bailed.</p>`;
    phrase.textContent = `"${failPhrase}"`;
  } else {
    // survived-one-bail
    card.innerHTML = `<p class="text-3xl">⚠️</p><p class="text-yellow-600 font-bold text-xl">Someone bailed — but the plan survived.</p>
      <p class="text-stone-500 text-sm">1/2 bails needed. The plan goes ahead.</p>`;
    phrase.textContent = '';
  }

  nextBtn.textContent = bldCheckWinCondition() ? 'See Results →' : 'Next Plan →';
  nextBtn.dataset.outcome = planOutcome;
}

function bldCheckWinCondition() {
  if (bldFailCount >= 3) { bldGameResult = 'flakes'; return true; }
  if (bldSuccessCount >= 3) {
    if (bldDramaMode) { return false; } // Drama sequence triggers separately
    bldGameResult = 'friends';
    return true;
  }
  return false;
}

function bldAdvanceAfterPlanResult() {
  const outcome = document.getElementById('btn-bld-plan-result-next').dataset.outcome;

  if (bldGameResult) {
    bldShowAftermath();
    return;
  }

  if (bldSuccessCount >= 3 && bldDramaMode) {
    bldTriggerDramaLock();
    return;
  }

  // Advance to next plan if not survived-one-bail; otherwise re-run same plan's mission
  if (outcome !== 'survived-one-bail') {
    bldCurrentPlanIdx++;
  }

  // Advance planner by seat order
  bldAdvancePlanner();
  bldCurrentNominationAttempt = 0;
  bldStartNominating();

  if (window.syllyMultiplayerMode === 'host') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action:             'BLD_NEXT_NOMINATION',
      currentPlannerIdx:  bldCurrentPlannerIdx,
      currentPlanIdx:     bldCurrentPlanIdx,
      nominationAttempt:  0,
    }});
  }
}

// ── Rejection handling ────────────────────────────────────────────────────────
function bldHandleRejection() {
  const rejections = bldPlanHistory.filter(
    r => r.planNumber === bldCurrentPlanIdx + 1 && r.status === 'Rejected'
  ).length;

  if (rejections >= 5) {
    bldGameResult = 'flakes';
    playAlarm();
    bldShowAftermath();
    return;
  }

  playTick();
  // Pass planner role by seat order
  bldAdvancePlanner();
  bldStartNominating();

  if (window.syllyMultiplayerMode === 'host') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action:            'BLD_NEXT_NOMINATION',
      currentPlannerIdx: bldCurrentPlannerIdx,
      currentPlanIdx:    bldCurrentPlanIdx,
    }});
  }
}

// ── Drama Mode lock ───────────────────────────────────────────────────────────
function bldTriggerDramaLock() {
  bldGamePhase = 'drama-lock';
  bldRenderPhase();
  playExit(); // tense audio cue per audio map

  if (window.syllyMultiplayerMode !== 'single') {
    mpSendEnvelope({ type: 'SYNC', payload: { action: 'BLD_DRAMA_IDENTIFICATION' } });
  }
}

function bldRenderDramaLock() {
  const isPtpBigFlake = window.syllyMultiplayerMode === 'single';
  const isMdlmBigFlake = window.syllyMultiplayerMode !== 'single' &&
                          bldMyPlayerIdx === bldBigFlakeIdx;
  const showActive = isPtpBigFlake || isMdlmBigFlake;

  document.getElementById('bld-drama-lock-waiting').classList.toggle('hidden', showActive);
  document.getElementById('bld-drama-lock-active').classList.toggle('hidden', !showActive);

  if (showActive) {
    // Render player list excluding Flakes
    const guessEl = document.getElementById('bld-drama-guess-list');
    bldDramaGuessIdx = -1;
    guessEl.innerHTML = bldPlayerNames.map((name, i) => {
      if (bldFlakeIndices.includes(i)) return ''; // Flakes cannot be the Pot-Stirrer
      return `<button class="bld-drama-guess-btn min-h-12 w-full rounded-xl px-4 py-2 text-base font-semibold text-left bg-stone-100 text-stone-700 active:scale-95 transition-all duration-100" data-idx="${i}">
        ${name}
      </button>`;
    }).join('');
    document.getElementById('btn-bld-drama-guess-confirm').disabled = true;
  }
}

function bldSubmitDramaGuess() {
  if (bldDramaGuessIdx === -1) return;

  if (window.syllyMultiplayerMode === 'client') {
    mpLockSync();
    mpSendEnvelope({ type: 'ACTION', payload: { action: 'BLD_DRAMA_GUESS', guessIdx: bldDramaGuessIdx } });
    return;
  }

  bldResolveDramaGuess(bldDramaGuessIdx);
}

function bldResolveDramaGuess(guessIdx) {
  const correct = guessIdx === bldPotStirrerIdx;
  bldDramaGuessResult = correct ? 'correct' : 'wrong';
  bldGameResult = correct ? 'flakes' : 'friends';

  if (window.syllyMultiplayerMode !== 'single') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'BLD_AFTERMATH',
      result: bldGameResult,
      dramaGuessResult: bldDramaGuessResult,
      planHistory: bldPlanHistory,
      planTrack: bldPlanTrack,
    }});
  }

  bldShowAftermath();
}

// ── Aftermath ─────────────────────────────────────────────────────────────────
function bldShowAftermath() {
  bldAftermathPhase = bldDramaMode && bldDramaGuessResult !== null
    ? 'drama-identification'
    : 'roles-revealed';

  const headline = document.getElementById('bld-aftermath-headline');
  if (bldGameResult === 'friends') {
    headline.innerHTML = `<p class="text-4xl mb-2">🎉</p><h2 class="text-2xl font-bold text-green-600">The Friends pulled it off.</h2>`;
  } else {
    headline.innerHTML = `<p class="text-4xl mb-2">🚪</p><h2 class="text-2xl font-bold text-red-500">The Flakes got away with it.</h2>`;
  }

  // Final itinerary — tappable tiles open the plan log
  const itinEl = document.getElementById('bld-aftermath-itinerary');
  itinEl.innerHTML = BLD_PLANS.map((plan, i) => {
    const status = bldPlanTrack[i];
    let bg = 'bg-stone-200 text-stone-400';
    let icon = '—';
    if (status === 'success') { bg = 'bg-green-100 text-green-600'; icon = '✅'; }
    if (status === 'fail')    { bg = 'bg-red-100 text-red-500';   icon = '❌'; }
    return `<button class="bld-aftermath-tile flex-1 rounded-xl p-1.5 ${bg} text-center text-xs font-semibold active:scale-95 transition-transform" data-plan-idx="${i}">
      <span class="block text-base">${icon}</span>
      <span style="font-size:10px">${'👤'.repeat(BLD_GROUP_TABLE[bldPlayerCount][i])}</span>
    </button>`;
  }).join('');
  itinEl.querySelectorAll('.bld-aftermath-tile').forEach(tile => {
    tile.addEventListener('click', () => bldOpenPlanDetail(+tile.dataset.planIdx));
  });

  // Drama identification phase
  const dramaSection = document.getElementById('bld-aftermath-drama');
  if (bldAftermathPhase === 'drama-identification') {
    dramaSection.classList.remove('hidden');
    const dramaCard = document.getElementById('bld-aftermath-drama-card');
    const potStirrerName = bldPlayerNames[bldPotStirrerIdx];
    if (bldDramaGuessResult === 'correct') {
      dramaCard.innerHTML = `<p class="text-3xl mb-1">🎯</p>
        <p class="text-red-500 font-bold text-lg">The Big Flake nailed it.</p>
        <p class="text-stone-500 text-sm mt-1">The Pot-Stirrer was <strong>${potStirrerName}</strong>. The Flakes steal the win.</p>`;
    } else {
      dramaCard.innerHTML = `<p class="text-3xl mb-1">🤭</p>
        <p class="text-green-600 font-bold text-lg">Wrong guess.</p>
        <p class="text-stone-500 text-sm mt-1">The Pot-Stirrer was <strong>${potStirrerName}</strong>. The Friends keep their win.</p>`;
    }
  } else {
    dramaSection.classList.add('hidden');
    bldRevealRoles();
  }

  showScreen('screen-bld-aftermath');
}

function bldRevealRoles() {
  const rolesSection = document.getElementById('bld-aftermath-roles');
  const roleList     = document.getElementById('bld-aftermath-role-list');
  rolesSection.classList.remove('hidden');

  roleList.innerHTML = bldPlayerNames.map((name, i) => {
    let roleLabel = 'The Friend';
    let colour    = 'text-stone-700';
    let extra     = '';

    if (i === bldPotStirrerIdx) {
      roleLabel = 'The Pot-Stirrer';
      colour    = 'text-yellow-600';
      extra     = ' 🤫';
    } else if (bldFlakeIndices.includes(i)) {
      roleLabel = 'The Flake';
      colour    = 'text-yellow-500';
      if (i === bldBigFlakeIdx && bldDramaMode) extra = ' (Big Flake)';
    }

    return `<div class="flex items-center justify-between py-1 border-b border-stone-100 last:border-0">
      <span class="text-stone-800 font-semibold text-sm">${name}${extra}</span>
      <span class="${colour} text-sm font-medium">${roleLabel}</span>
    </div>`;
  }).join('');

  document.getElementById('bld-aftermath-actions').classList.remove('hidden');
}

// ── Plan detail overlay ───────────────────────────────────────────────────────
function bldOpenPlanDetail(planIdx) {
  const plan     = BLD_PLANS[planIdx];
  const attempts = bldPlanHistory.filter(r => r.planNumber === planIdx + 1);

  document.getElementById('bld-detail-title').textContent   = `${plan.emoji} Plan ${planIdx + 1}: ${plan.name}`;
  document.getElementById('bld-detail-subtitle').textContent = `${attempts.length} attempt${attempts.length !== 1 ? 's' : ''}`;

  const content = document.getElementById('bld-detail-content');
  if (attempts.length === 0) {
    content.innerHTML = '<p class="text-stone-400 text-sm text-center py-4">No attempts yet.</p>';
  } else {
    content.innerHTML = [...attempts].reverse().map((rec, i) => {
      const attemptNum = attempts.length - i;
      const votesHtml = Object.entries(rec.votes).map(([name, vote]) => {
        const isIn = vote === "Sounds Good";
        return `<div class="flex items-center justify-between text-xs py-0.5">
          <span class="text-stone-600">${name}</span>
          <span class="${isIn ? 'text-green-600' : 'text-red-500'} font-semibold">${vote}</span>
        </div>`;
      }).join('');

      let outcomeHtml = '';
      if (rec.status === 'Approved' && rec.planOutcome) {
        const outcomeColour = rec.planOutcome === 'success' ? 'text-green-600' : 'text-red-500';
        const outcomeText   = rec.planOutcome === 'success' ? '✅ Plan succeeded'
          : rec.planOutcome === 'survived-one-bail' ? '⚠️ Survived (1/2 bails)'
          : `❌ Plan failed (${rec.bailCount} bail${rec.bailCount > 1 ? 's' : ''})`;
        outcomeHtml = `<p class="${outcomeColour} font-semibold text-xs mt-2">${outcomeText}</p>`;
      }

      const statusColour = rec.status === 'Approved' ? 'text-green-600' : 'text-red-500';

      return `<div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <p class="text-stone-500 text-xs font-semibold uppercase tracking-widest">Attempt ${attemptNum}</p>
          <p class="${statusColour} text-xs font-bold">${rec.status}</p>
        </div>
        <p class="text-stone-700 text-xs">Planner: <strong>${rec.planner}</strong></p>
        <p class="text-stone-700 text-xs">Group: ${rec.nominatedGroup.join(', ')}</p>
        <div class="border-t border-stone-100 pt-2 mt-1">${votesHtml}</div>
        ${outcomeHtml}
      </div>`;
    }).join('');
  }

  document.getElementById('bld-plan-detail-overlay').style.display = 'flex';
}

// ── MDLM multiplayer start ────────────────────────────────────────────────────
function bldStartGameMdlm() {
  bldMyPlayerIdx = mpMyPlayerIdx;

  if (window.syllyMultiplayerMode === 'host') {
    // Broadcast all role state; each device renders only its own slot (couch security)
    mpSendEnvelope({ type: 'SYNC', payload: {
      action:          'BLD_GAME_START',
      playerNames:     bldPlayerNames,
      playerCount:     bldPlayerCount,
      dramaMode:       bldDramaMode,
      firstPlannerIdx: bldFirstPlannerIdx,
      flakeIndices:    bldFlakeIndices,
      bigFlakeIdx:     bldBigFlakeIdx,
      potStirrerIdx:   bldPotStirrerIdx,
      seatNumbers:     bldSeatNumbers,
    }});
    bldShowRoleReveal(bldMyPlayerIdx);
    showScreen('screen-bld-role-reveal');
  }
  // Client navigates on receiving BLD_GAME_START
}

// ── Multiplayer envelope handler ──────────────────────────────────────────────
// Called from mpHandleEnvelope() in engine-multiplayer.js via case 'bld'
function bldHandleEnvelope(env) {
  const { action } = env.payload;

  if (action === 'BLD_GAME_START') {
    bldPlayerNames       = env.payload.playerNames;
    bldPlayerCount       = env.payload.playerCount;
    bldDramaMode         = env.payload.dramaMode;
    bldCurrentPlannerIdx = env.payload.firstPlannerIdx;
    bldFirstPlannerIdx   = env.payload.firstPlannerIdx;
    bldMyPlayerIdx       = mpMyPlayerIdx;
    bldFlakeIndices      = env.payload.flakeIndices;
    bldBigFlakeIdx       = env.payload.bigFlakeIdx;
    bldPotStirrerIdx     = env.payload.potStirrerIdx;
    bldSeatNumbers       = env.payload.seatNumbers || [];
    bldShowRoleReveal(bldMyPlayerIdx);
    showScreen('screen-bld-role-reveal');
  }

  if (action === 'BLD_NOMINATION_CONFIRMED') {
    bldNominatedGroup = env.payload.nominatedGroup;
    if (env.payload.currentPlanIdx !== undefined) bldCurrentPlanIdx = env.payload.currentPlanIdx;
    bldVotes          = {};
    bldVoteReady      = new Array(bldPlayerCount).fill(false);
    bldGamePhase      = 'voting';
    if (window.syllyMultiplayerMode === 'host') {
      // Client planner sent ACTION — sync attempt counter, then re-broadcast as SYNC so all devices advance
      if (env.payload.nominationAttempt !== undefined) bldCurrentNominationAttempt = env.payload.nominationAttempt;
      mpUnlockSync();
      mpSendEnvelope({ type: 'SYNC', payload: {
        action:         'BLD_NOMINATION_CONFIRMED',
        nominatedGroup: bldNominatedGroup,
        currentPlanIdx: bldCurrentPlanIdx,
      }});
    } else {
      mpUnlockSync();
    }
    bldRenderPhase();
  }

  // Host receives vote from client device
  if (action === 'BLD_VOTE_SUBMIT' && window.syllyMultiplayerMode === 'host') {
    mpUnlockSync();
    bldRecordVote(env.payload.playerIdx, env.payload.vote);
  }

  // Host receives mission card from nominated client
  if (action === 'BLD_MISSION_SUBMIT' && window.syllyMultiplayerMode === 'host') {
    mpUnlockSync();
    bldRecordMissionCard(env.payload.playerIdx, env.payload.card);
  }

  // Host receives Big Flake's drama guess from client
  if (action === 'BLD_DRAMA_GUESS' && window.syllyMultiplayerMode === 'host') {
    mpUnlockSync();
    bldResolveDramaGuess(env.payload.guessIdx);
  }

  if (action === 'BLD_VOTE_PENDING') {
    if (window.syllyMultiplayerMode === 'client') {
      mpUnlockSync();
      bldGamePhase = 'vote-pending';
      bldRenderPhase();
    }
  }

  if (action === 'BLD_VOTE_RESULT') {
    mpUnlockSync();
    bldVotes = env.payload.votes;
    const { approved, record, plannerIdx, nominationAttempt } = env.payload;
    bldCurrentPlannerIdx        = plannerIdx;
    bldCurrentNominationAttempt = nominationAttempt;
    bldApplyVoteResult(approved, record); // bldApplyVoteResult() pushes record — don't push again here
  }

  if (action === 'BLD_MISSION_START') {
    bldStartMission();
  }

  if (action === 'BLD_NEXT_NOMINATION') {
    bldCurrentPlannerIdx = env.payload.currentPlannerIdx;
    bldCurrentPlanIdx    = env.payload.currentPlanIdx;
    if (env.payload.nominationAttempt !== undefined) {
      bldCurrentNominationAttempt = env.payload.nominationAttempt;
    }
    bldStartNominating();
  }

  if (action === 'BLD_MISSION_PENDING') {
    if (window.syllyMultiplayerMode === 'client') {
      mpUnlockSync();
      bldGamePhase = 'mission-pending';
      bldRenderPhase();
    }
  }

  if (action === 'BLD_MISSION_RESULT') {
    mpUnlockSync();
    bldPlanTrack    = env.payload.planTrack;
    bldSuccessCount = env.payload.successCount;
    bldFailCount    = env.payload.failCount;
    const lastRecord = bldPlanHistory[bldPlanHistory.length - 1];
    if (lastRecord) Object.assign(lastRecord, env.payload.record);
    bldShowPlanResult(env.payload.bailCount, env.payload.planOutcome);
  }

  if (action === 'BLD_DRAMA_IDENTIFICATION') {
    bldGamePhase = 'drama-lock';
    showScreen('screen-bld-main');
    bldRenderPhase();
  }

  if (action === 'BLD_AFTERMATH') {
    mpUnlockSync();
    bldGameResult        = env.payload.result;
    bldDramaGuessResult  = env.payload.dramaGuessResult;
    bldPlanHistory       = env.payload.planHistory;
    bldPlanTrack         = env.payload.planTrack;
    bldShowAftermath();
  }
}

// ── Expansion override hook (required; no-op for Bailed) ─────────────────────
function applyExpansionOverrides() {
  // Bailed has no word bank — hook is a no-op
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT LISTENERS
// ════════════════════════════════════════════════════════════════════════════

// ── Lobby button ──────────────────────────────────────────────────────────────
document.getElementById('btn-bld').addEventListener('click', () => {
  playLaunch();
  activeGameId = 'bld';
  bldShowMenu();
});

// ── Menu navigation ───────────────────────────────────────────────────────────
document.getElementById('btn-bld-menu-play').addEventListener('click', () => {
  playLaunch();
  mpShowModeScreen('bld');
});
document.getElementById('btn-bld-menu-how-to').addEventListener('click', () => {
  playPillClick();
  const overlay = document.getElementById('bld-how-to-overlay');
  overlay.querySelector('.overlay-data-inner').scrollTop = 0;
  overlay.style.display = 'flex';
});
document.getElementById('btn-bld-how-to-done').addEventListener('click', () => {
  playDone();
  document.getElementById('bld-how-to-overlay').style.display = 'none';
});
document.getElementById('btn-bld-menu-settings').addEventListener('click', () => {
  playPillClick();
  const overlay = document.getElementById('bld-settings-overlay');
  overlay.querySelector('.overlay-data-inner').scrollTop = 0;
  bldSetToggle('btn-bld-drama-toggle', bldDramaMode);
  overlay.style.display = 'flex';
});
document.getElementById('btn-bld-menu-back').addEventListener('click', () => {
  playExit();
  resetToLobby();
});

// ── Settings ──────────────────────────────────────────────────────────────────
document.getElementById('btn-bld-drama-toggle').addEventListener('click', () => {
  bldDramaMode = !bldDramaMode;
  bldDramaMode ? playSyllyOn() : playSyllyOff();
  bldSetToggle('btn-bld-drama-toggle', bldDramaMode);
  bldUpdateFlakeHint();
});
document.getElementById('btn-bld-settings-done').addEventListener('click', () => {
  playDone();
  document.getElementById('bld-settings-overlay').style.display = 'none';
});

// ── Setup ─────────────────────────────────────────────────────────────────────
document.getElementById('btn-bld-setup-back').addEventListener('click', () => {
  playWhoosh();
  bldShowMenu();
});

document.getElementById('bld-player-count-pills').addEventListener('click', e => {
  const btn = e.target.closest('[data-count]');
  if (!btn) return;
  playPillClick();
  bldPlayerCount = parseInt(btn.dataset.count, 10);
  document.querySelectorAll('#bld-player-count-pills .pill').forEach(p => {
    p.className = parseInt(p.dataset.count, 10) === bldPlayerCount
      ? 'pill pill-active-yellow'
      : 'pill';
  });
  bldRenderSetupInputs();
  bldUpdateFlakeHint();
});

document.getElementById('btn-bld-setup-start').addEventListener('click', () => {
  // Collect names
  const inputs = document.querySelectorAll('.bld-player-input');
  const names  = [];
  let hasError = false;
  inputs.forEach((inp, i) => {
    const val = inp.value.trim();
    if (!val) { hasError = true; inp.classList.add('border-red-400'); }
    else { inp.classList.remove('border-red-400'); }
    names.push(val || `Player ${i + 1}`);
  });

  const errEl = document.getElementById('bld-setup-error');
  if (hasError) {
    errEl.textContent = 'Give everyone a name.';
    errEl.classList.remove('hidden');
    return;
  }
  errEl.classList.add('hidden');
  bldPlayerNames = names;
  playLaunch();
  bldStartGame();
});

// ── Pass gate (role reveal) ───────────────────────────────────────────────────
document.getElementById('btn-bld-gate-reveal').addEventListener('click', () => {
  playWhoosh();
  const playerIdx = bldPtpQueue[0];
  bldShowRoleReveal(playerIdx);
});

// ── Role reveal ───────────────────────────────────────────────────────────────
document.getElementById('btn-bld-reveal-confirm').addEventListener('click', () => {
  playDone();
  if (window.syllyMultiplayerMode !== 'single') {
    bldStartNominating();
    return;
  }
  bldPtpQueue.shift();
  bldShowNextPassGate();
});

// ── Main screen — nominating ──────────────────────────────────────────────────
document.getElementById('bld-nominating-player-list').addEventListener('click', e => {
  const btn = e.target.closest('.bld-nominate-player');
  if (!btn) return;
  const idx  = parseInt(btn.dataset.idx, 10);
  const pos  = bldNominatedGroup.indexOf(idx);
  if (pos === -1) {
    if (bldNominatedGroup.length >= bldGroupSize()) {
      // Shake the confirm button — already full
      const shake = document.getElementById('btn-bld-nominate-confirm');
      shake.classList.remove('shake');
      void shake.offsetWidth;
      shake.classList.add('shake');
      return;
    }
    bldNominatedGroup.push(idx);
  } else {
    bldNominatedGroup.splice(pos, 1);
  }
  playPillClick();
  bldRenderNominating();
});

document.getElementById('btn-bld-nominate-confirm').addEventListener('click', () => {
  if (bldNominatedGroup.length !== bldGroupSize()) {
    const errEl = document.getElementById('bld-nominating-error');
    errEl.textContent = `Pick exactly ${bldGroupSize()} people for this plan.`;
    errEl.classList.remove('hidden');
    const shake = document.getElementById('btn-bld-nominate-confirm');
    shake.classList.remove('shake');
    void shake.offsetWidth;
    shake.classList.add('shake');
    return;
  }
  document.getElementById('bld-nominating-error').classList.add('hidden');
  playLaunch();

  bldCurrentNominationAttempt++;
  bldVotes    = {};
  bldVoteReady = new Array(bldPlayerCount).fill(false);

  if (window.syllyMultiplayerMode === 'client') {
    mpLockSync();
    mpSendEnvelope({ type: 'ACTION', payload: {
      action:             'BLD_NOMINATION_CONFIRMED',
      nominatedGroup:     bldNominatedGroup,
      nominationAttempt:  bldCurrentNominationAttempt,
    }});
    return;
  }

  if (window.syllyMultiplayerMode === 'host') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action:         'BLD_NOMINATION_CONFIRMED',
      nominatedGroup: bldNominatedGroup,
      currentPlanIdx: bldCurrentPlanIdx,
    }});
  }

  // Start voting phase
  bldGamePhase = 'voting';
  if (window.syllyMultiplayerMode === 'single') {
    bldPtpQueue = [...Array(bldPlayerCount).keys()];
    bldShowVotingPassGate();
  } else {
    bldRenderPhase();
  }
});

// ── Voting ────────────────────────────────────────────────────────────────────
document.getElementById('btn-bld-vote-in').addEventListener('click', () => {
  bldCollectVote("Sounds Good");
});
document.getElementById('btn-bld-vote-not-them').addEventListener('click', () => {
  bldCollectVote("No Way");
});

// ── Vote result ───────────────────────────────────────────────────────────────
document.getElementById('btn-bld-vote-result-next').addEventListener('click', () => {
  playDone();
  if (window.syllyMultiplayerMode === 'client') return;
  const approved = document.getElementById('btn-bld-vote-result-next').dataset.approved === '1';
  if (approved) {
    bldStartMission();
    if (window.syllyMultiplayerMode === 'host') {
      mpSendEnvelope({ type: 'SYNC', payload: { action: 'BLD_MISSION_START' } });
    }
  } else {
    bldHandleRejection();
  }
});

// ── Pass-reveal overlay (voting + mission) ────────────────────────────────────
document.getElementById('btn-bld-pass-reveal-confirm').addEventListener('click', () => {
  playWhoosh();
  document.getElementById('bld-pass-reveal-overlay').style.display = 'none';
  if (bldPtpPhase === 'vote') {
    bldGamePhase = 'voting';
    bldRenderPhase();
  } else {
    bldGamePhase = 'mission';
    bldRenderPhase();
  }
});

// ── Mission ───────────────────────────────────────────────────────────────────
document.getElementById('btn-bld-mission-in').addEventListener('click', () => {
  bldCollectMissionCard("I'm In");
});
document.getElementById('btn-bld-mission-bailed').addEventListener('click', () => {
  bldCollectMissionCard('I Bailed');
});

// ── Plan result ───────────────────────────────────────────────────────────────
document.getElementById('btn-bld-plan-result-next').addEventListener('click', () => {
  playDone();
  if (window.syllyMultiplayerMode === 'client') return; // client driven forward by BLD_NOMINATION_CONFIRMED SYNC
  bldAdvanceAfterPlanResult();
});

// ── Drama Mode — guess selection ──────────────────────────────────────────────
document.getElementById('bld-drama-guess-list').addEventListener('click', e => {
  const btn = e.target.closest('.bld-drama-guess-btn');
  if (!btn) return;
  playPillClick();
  bldDramaGuessIdx = parseInt(btn.dataset.idx, 10);
  document.querySelectorAll('.bld-drama-guess-btn').forEach(b => {
    b.className = parseInt(b.dataset.idx, 10) === bldDramaGuessIdx
      ? 'bld-drama-guess-btn min-h-12 w-full rounded-xl px-4 py-2 text-base font-semibold text-left bg-yellow-100 ring-2 ring-yellow-400 text-yellow-800 active:scale-95 transition-all duration-100'
      : 'bld-drama-guess-btn min-h-12 w-full rounded-xl px-4 py-2 text-base font-semibold text-left bg-stone-100 text-stone-700 active:scale-95 transition-all duration-100';
  });
  document.getElementById('btn-bld-drama-guess-confirm').disabled = false;
});

document.getElementById('btn-bld-drama-guess-confirm').addEventListener('click', () => {
  playLaunch();
  bldSubmitDramaGuess();
});

// ── Itinerary plan boxes ──────────────────────────────────────────────────────
document.getElementById('bld-itinerary').addEventListener('click', e => {
  const btn = e.target.closest('.bld-itinerary-box');
  if (!btn) return;
  const planIdx = parseInt(btn.dataset.planIdx, 10);
  if (bldPlanHistory.some(r => r.planNumber === planIdx + 1)) {
    bldOpenPlanDetail(planIdx);
  }
});

document.getElementById('btn-bld-detail-close').addEventListener('click', () => {
  playDone();
  document.getElementById('bld-plan-detail-overlay').style.display = 'none';
});

// ── Aftermath ─────────────────────────────────────────────────────────────────
document.getElementById('btn-bld-aftermath-drama-continue').addEventListener('click', () => {
  playDone();
  document.getElementById('bld-aftermath-drama').classList.add('hidden');
  bldAftermathPhase = 'roles-revealed';
  bldRevealRoles();
});

document.getElementById('btn-bld-go-again').addEventListener('click', () => {
  const confirmBtn = document.getElementById('btn-bld-second-chances-confirm');
  if (window.syllyMultiplayerMode === 'host') {
    confirmBtn.textContent = 'Restart in Lobby 🔄';
  } else if (window.syllyMultiplayerMode === 'client') {
    confirmBtn.textContent = 'Leave Session';
  } else {
    confirmBtn.textContent = 'Second Chances 💬';
  }
  document.getElementById('bld-second-chances-overlay').style.display = 'flex';
});

document.getElementById('btn-bld-second-chances-confirm').addEventListener('click', () => {
  playLaunch();
  document.getElementById('bld-second-chances-overlay').style.display = 'none';
  if (window.syllyMultiplayerMode !== 'single') {
    mpReturnToLobby();
    return;
  }
  bldResetState();
  bldShowSetup();
});

document.getElementById('btn-bld-second-chances-cancel').addEventListener('click', () => {
  document.getElementById('bld-second-chances-overlay').style.display = 'none';
});

document.getElementById('btn-bld-aftermath-exit').addEventListener('click', () => {
  playExit();
  resetToLobby();
});
document.getElementById('btn-bld-aftermath-exit-2').addEventListener('click', () => {
  playExit();
  resetToLobby();
});

// ── How To Play (header [?] — always visible on main game screen) ─────────────
document.getElementById('btn-bld-how-to').addEventListener('click', () => {
  playDone();
  document.getElementById('bld-how-to-overlay').querySelector('.overlay-data-inner').scrollTop = 0;
  document.getElementById('bld-how-to-overlay').style.display = 'flex';
});

// ── Role help overlay (opened from role reveal screen [?]) ───────────────────
document.getElementById('btn-bld-role-reveal-help').addEventListener('click', () => {
  playPillClick();
  bldShowRoleHelp();
});
document.getElementById('btn-bld-role-help-close').addEventListener('click', () => {
  playDone();
  document.getElementById('bld-role-help-overlay').style.display = 'none';
});

// ── Contextual tip overlay ────────────────────────────────────────────────────
function bldShowTip(emoji, heading, lines) {
  document.getElementById('bld-tip-emoji').textContent = emoji;
  document.getElementById('bld-tip-heading').textContent = heading;
  const body = document.getElementById('bld-tip-body');
  body.innerHTML = lines.map(l => `<p>• ${l}</p>`).join('');
  document.getElementById('bld-tip-overlay').style.display = 'flex';
}
document.getElementById('btn-bld-tip-close').addEventListener('click', () => {
  playDone();
  document.getElementById('bld-tip-overlay').style.display = 'none';
});

document.getElementById('btn-bld-tip-planner').addEventListener('click', () => {
  bldShowTip('🗓️', 'As the Planner', [
    'Choose a group of players you trust to pass the plan.',
    'You should include yourself — would be suspicious if you didn\'t.',
    'Pick carefully — a bad group can fail the plan.',
  ]);
});

document.getElementById('btn-bld-tip-patience').addEventListener('click', () => {
  bldShowTip('⏳', 'Patience Meter', [
    'Each rejected group uses up one Patience point.',
    'At 5 rejections for a single plan, the Flakes win automatically.',
    'Vote wisely — every No Way chips away at the group\'s patience.',
  ]);
});

document.getElementById('btn-bld-tip-nominate').addEventListener('click', () => {
  const isFlake = bldFlakeIndices.includes(bldMyPlayerIdx) ||
                  (window.syllyMultiplayerMode === 'single' && bldFlakeIndices.includes(bldCurrentPlannerIdx));
  if (isFlake) {
    bldShowTip('🃏', 'Picking Your Group', [
      'Blend in by picking a balanced mix of players.',
      'Including another Flake can help — but only if they\'re not already sus.',
      'Include yourself but avoid raising suspicion.',
    ]);
  } else {
    bldShowTip('🤝', 'Picking Your Group', [
      'Pick players you trust to pass the plan.',
      'A group of all Friends will always succeed.',
      'Include yourself to show you\'re committed to the plan.',
    ]);
  }
});

document.getElementById('btn-bld-tip-vote').addEventListener('click', () => {
  bldShowTip('🗳️', 'Approving the Group', [
    'Vote "Sounds Good" if you trust everyone in the group.',
    'Vote "No Way" if you suspect a Flake is included.',
    'Too many rejections and the Flakes win automatically — use your votes wisely.',
  ]);
});

document.getElementById('btn-bld-tip-mission').addEventListener('click', () => {
  bldShowTip('🚪', 'Your Decision', [
    'Vote "I\'m In" to stay under the radar and build trust.',
    'Vote "I Bail" to fail the plan — but expect suspicion.',
    'Bailing while Friends are watching makes you an easy target.',
  ]);
});

// ── Quit overlay ──────────────────────────────────────────────────────────────
document.querySelectorAll('.btn-bld-quit-open').forEach(btn =>
  btn.addEventListener('click', () => {
    document.getElementById('bld-quit-overlay').style.display = 'flex';
  })
);
document.getElementById('btn-bld-quit-confirm').addEventListener('click', () => {
  playExit();
  document.getElementById('bld-quit-overlay').style.display = 'none';
  bldResetState();
  bldShowMenu();
});
document.getElementById('btn-bld-quit-cancel').addEventListener('click', () => {
  document.getElementById('bld-quit-overlay').style.display = 'none';
});

// ── Seating setup ─────────────────────────────────────────────────────────────
document.getElementById('bld-seating-list').addEventListener('click', e => {
  const upBtn   = e.target.closest('.bld-seat-up');
  const downBtn = e.target.closest('.bld-seat-down');
  const pos = upBtn ? +upBtn.dataset.seatPos : downBtn ? +downBtn.dataset.seatPos : -1;
  if (pos < 0) return;
  playPillClick();
  if (upBtn && pos > 0) {
    [bldSeatOrder[pos], bldSeatOrder[pos - 1]] = [bldSeatOrder[pos - 1], bldSeatOrder[pos]];
  } else if (downBtn && pos < bldSeatOrder.length - 1) {
    [bldSeatOrder[pos], bldSeatOrder[pos + 1]] = [bldSeatOrder[pos + 1], bldSeatOrder[pos]];
  }
  bldRenderSeatingList();
});

document.getElementById('btn-bld-randomise-seating').addEventListener('click', () => {
  playPillClick();
  bldSeatOrder = bldShuffle([...bldSeatOrder]);
  bldRenderSeatingList();
});

document.getElementById('btn-bld-confirm-seating').addEventListener('click', () => {
  playLaunch();
  bldSeatNumbers = new Array(bldPlayerCount);
  bldSeatOrder.forEach((playerIdx, seatPos) => { bldSeatNumbers[playerIdx] = seatPos + 1; });
  bldStartGame();
});

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('#screen-bld-menu .btn-open-sound').forEach(btn => {
    btn.addEventListener('click', openSoundOverlay);
  });
});
