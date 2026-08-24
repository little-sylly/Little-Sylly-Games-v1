// js/engine-multiplayer.js
// Multiplayer Sync Module — Phase 22
// Depends on: engine.js (SYLLY_VERSION, showScreen, resetToLobby, play* audio)
// Sprint 1: global variable declarations.
// Sprint 2: config registry, shared screen show functions, event wiring, nickname helpers, room code generator.
// Sprint 3: Firebase lazy-loader, room creation/join, handshake, sync lock, teardown, data hygiene.

// ── Global Multiplayer State (Sprint 1) ───────────────────────────────────────
window.syllyMultiplayerMode = 'single'; // 'single' | 'host' | 'client'
window.syllySyncLocked      = false;
window.syllyFirebase        = null;     // set by firebase-init.js after lazy load
window.syllyDeviceUid       = null;     // set by firebase-init.js after signInAnonymously
window.mpLobbyStyle         = 'individual'; // 'team' | 'individual' — set at mode selection; 'team' = TLM, 'individual' = MDLM

// ── MP Navigation State (Sprint 2) ───────────────────────────────────────────
let mpActiveGame       = null;   // current game abbr ('li5' | 'gm' | etc.)
let mpActiveGameConfig = null;   // full config object for active game
let mpSelectedMode     = 'host'; // 'host' | 'join' | 'ptp'

// ── MP Session State (Sprint 3) ───────────────────────────────────────────────
let mpActiveRoomCode  = null;  // '4-char code' when in a room
let mpRoomRef         = null;  // Firebase DatabaseReference to /rooms/{code}
let mpEventsListener  = null;  // onValue unsubscribe for /events
let mpPrivateListener = null;  // onChildAdded unsubscribe for private/{myUid} (hidden-info games — FLW)
let mpRoomListener    = null;  // onValue unsubscribe for room deletion detection (client)
let mpPlayersListener = null;  // onValue unsubscribe for /players changes (host lobby)
let mpPlayerSlots     = [];    // [{uid, nickname}] — index 0 = Host
window.mpClientPlayerRef = null; // Firebase ref to this client's own player slot
let mpSyncLockTimer   = null;  // timeout handle for 8-second sync lock fallback
let mpActionAuthorised = false; // true for exactly one ACTION after a fresh mpLockSync(); blocks double-tap resubmits
let mpJoinListenFrom  = 0;     // timestamp cutoff — ignore events older than this
let mpMyPlayerIdx     = -1;    // this device's slot index in mpPlayerSlots; 0 = Host

// ── Roster helper: hasCaptain may be a bool or a zero-arg function ────────────
function mpRcHasCaptain(rc) { return typeof rc?.hasCaptain === 'function' ? rc.hasCaptain() : !!rc?.hasCaptain; }

// ── Roster State (Phase 24) ───────────────────────────────────────────────────
window.mpLobbyRoster          = null;   // confirmed roster — broadcast in GAME_START
window.mpLobbyRosterTeamNames    = null;   // team names captured from pre-lobby overlay
window.mpLobbyRosterCaptainNames = null;   // captain names captured from pre-lobby overlay (hasCaptain games)
let mpRosterPendingTeamIdx    = [];     // working copy: team index per slot during roster UI
let mpRosterPendingCaptain    = [];     // working copy: captain slot index per team during roster UI
let mpRosterSelectedChip      = null;   // currently selected player chip (uid string)

// ── Per-Game Config Registry ──────────────────────────────────────────────────
const MP_GAME_CONFIGS = {
  li5: {
    gameName:        "Like I'm Five",
    emoji:           '🧒',
    brandBtnClass:   'bg-pink-500 hover:bg-pink-600',
    ptpLabel:        'Play Time!',
    menuScreen:      'screen-menu',
    onPassThePhone: () => {
      if (window.syllyMultiplayerMode === 'client') {
        // Client (opposing team): show monitor standby until word arrives via SYNC
        document.getElementById('li5-monitor-word').textContent = '—';
        document.getElementById('li5-monitor-nono-list').innerHTML =
          '<li class="text-stone-400 text-sm italic text-center">Waiting for round to start…</li>';
        // Apply team names from roster if provided
        if (window.mpLobbyRoster?.teamNames && typeof teamNames !== 'undefined') {
          teamNames[0] = window.mpLobbyRoster.teamNames[0];
          teamNames[1] = window.mpLobbyRoster.teamNames[1];
        }
        showScreen('screen-li5-monitor');
      } else {
        // Host: apply team names from roster, then skip the setup screen
        if (window.mpLobbyRoster?.teamNames && typeof teamNames !== 'undefined') {
          teamNames[0] = window.mpLobbyRoster.teamNames[0];
          teamNames[1] = window.mpLobbyRoster.teamNames[1];
        }
        startGame(); // bypasses screen-setup; team names already applied above
      }
    },
    recommendedMode: 'ptp',
    supportedModes:  ['ptp', 'tlm'],
    multiplayerOnly: false,
    lobbyCtaLabel:   'Play Time!',
    rosterConfig: { type: 'none', showTeamNamesInPreLobby: true, defaultTeamNames: ['Crayon Crew', 'Glue Stick Gang'], hasCaptain: false },
    getMaxPlayers: () => 2,
  },
  gm: {
    gameName:        'Great Minds',
    emoji:           '🧠',
    brandBtnClass:   'bg-purple-500 hover:bg-purple-600',
    ptpLabel:        "Let's Play!",
    menuScreen:      'screen-gm-menu',
    onPassThePhone:  () => startGreatMinds(),
    recommendedMode: 'ptp',
    supportedModes:  ['ptp', 'mdlm'],
    multiplayerOnly: false,
    lobbyCtaLabel:   "Let's Play!",
    rosterConfig: { type: 'individual', showTeamNamesInPreLobby: false, defaultTeamNames: null, hasCaptain: false },
    getMaxPlayers: () => 2,
  },
  ss: {
    gameName:        'Secret Signals',
    emoji:           '📡',
    brandBtnClass:   'bg-teal-500 hover:bg-teal-600',
    ptpLabel:        "Let's Play!",
    menuScreen:      'screen-ss-menu',
    onPassThePhone:  () => startSyllySignals(),
    recommendedMode: 'tlm',
    supportedModes:  ['ptp', 'tlm', 'mdlm'],
    multiplayerOnly: false,
    lobbyCtaLabel:   "Let's Play!",
    rosterConfig: { type: ls => ls === 'team' ? 'none' : 'teams', showTeamNamesInPreLobby: true, defaultTeamNames: ['Alpha Echo', 'Bravo Zulu'], hasCaptain: false, requiresBalancedTeams: true },
    // Lobby bounds are consulted ONLY while a room fills, so they must be the game's TRUE range —
    // never a single-device setup variable. ssPlayerCount is set by the Team-size pills on
    // screen-ss-players, a screen Lobby Mode never shows. 2v2 to 3v3.
    getMaxPlayers: () => window.mpLobbyStyle === 'team' ? 2 : 6,
    getMinPlayers: () => window.mpLobbyStyle === 'team' ? 2 : 4,
  },
  jec: {
    gameName:        'Just Enough Cooks',
    emoji:           '🍳',
    brandBtnClass:   'bg-amber-500 hover:bg-amber-600',
    ptpLabel:        "Let's Cook!",
    menuScreen:      'screen-jec-menu',
    onPassThePhone:  () => { jecInitRoster(); showScreen('screen-jec-roster'); },
    recommendedMode: 'mdlm',
    supportedModes:  ['ptp', 'mdlm'],
    multiplayerOnly: false,
    lobbyCtaLabel:   "Let's Cook!",
    rosterConfig: { type: 'individual', showTeamNamesInPreLobby: false, defaultTeamNames: null, hasCaptain: false },
    // True range, not jecPlayerCount — the roster screen that moves it is skipped in Lobby Mode.
    getMaxPlayers: () => 6,
    getMinPlayers: () => 3,
  },
  ygi: {
    gameName:        'You Get It?',
    emoji:           '🃏',
    brandBtnClass:   'bg-orange-500 hover:bg-orange-600',
    ptpLabel:        'Show Your Take 🃏',
    menuScreen:      'screen-ygi-menu',
    onPassThePhone:  () => { ygiShowSetup(); showScreen('screen-ygi-setup'); },
    recommendedMode: 'mdlm',
    supportedModes:  ['ptp', 'mdlm'],
    multiplayerOnly: false,
    lobbyCtaLabel:   'Show Your Take 🃏',
    rosterConfig: { type: 'individual', showTeamNamesInPreLobby: false, defaultTeamNames: null, hasCaptain: false },
    // True range, not ygiPlayerCount — the setup screen that moves it is skipped in Lobby Mode.
    getMaxPlayers: () => 6,
    getMinPlayers: () => 3,
  },
  lttp: {
    gameName:        'Late to the Party',
    emoji:           '🎉',
    brandBtnClass:   'bg-red-500 hover:bg-red-600',
    ptpLabel:        'Find The Location!',
    menuScreen:      'screen-lttp-menu',
    onPassThePhone: () => {
      if (window.syllyMultiplayerMode === 'host') {
        // Host: use slot names, then run lttpStartGame() which broadcasts LTTP_GAME_START
        lttpPlayerCount = mpPlayerSlots.length;
        lttpPlayerNames = mpPlayerSlots.map(p => p.nickname);
        lttpStartGame();
      } else if (window.syllyMultiplayerMode === 'single') {
        // PTP mode: no Firebase — go to setup screen like any single-device game
        showScreen('screen-lttp-setup');
        lttpSyncSetup();
      }
      // else: client — waits for LTTP_GAME_START SYNC from Host
    },
    recommendedMode: 'mdlm',
    supportedModes:  ['ptp', 'mdlm'],
    multiplayerOnly: false,
    lobbyCtaLabel:   'Find The Location!',
    rosterConfig: { type: 'individual', showTeamNamesInPreLobby: false, defaultTeamNames: null, hasCaptain: false },
    // True range, not lttpPlayerCount — the setup screen that moves it is skipped in Lobby Mode,
    // which pinned min AND max to its default of 4 (an MDLM room could only ever be exactly 4).
    getMaxPlayers: () => 6,
    getMinPlayers: () => 4,
  },
  nat: {
    gameName:        'Natural Selection',
    emoji:           '🦁',
    brandBtnClass:   'bg-lime-600 hover:bg-lime-700',
    ptpLabel:        'Begin Observation',
    menuScreen:      'screen-nat-menu',
    onPassThePhone:  () => natShowSetup(),
    recommendedMode: 'mdlm',
    supportedModes:  ['ptp', 'mdlm'],
    multiplayerOnly: false,
    lobbyCtaLabel:   'Begin Observation',
    rosterConfig: { type: 'individual', showTeamNamesInPreLobby: false, defaultTeamNames: null, hasCaptain: false },
    getMaxPlayers: () => 8,
    getMinPlayers: () => 3,
  },
  dsd: {
    gameName:        'Deep-Sea Deploy',
    emoji:           '⚓',
    brandBtnClass:   'bg-cyan-700 hover:bg-cyan-800',
    ptpLabel:        "Let's Sail!",
    menuScreen:      'screen-dsd-menu',
    onPassThePhone:  () => dsdShowSetup(),
    recommendedMode: 'tlm',
    supportedModes:  ['ptp', 'tlm', 'mdlm'],
    multiplayerOnly: false,
    lobbyCtaLabel:   "Let's Sail!",
    rosterConfig: { type: 'teams', showTeamNamesInPreLobby: true, defaultTeamNames: ['SS Kraken', 'SS Leviathan'], hasCaptain: () => window.mpLobbyStyle === 'team', requiresBalancedTeams: true },
    // True range, not dsdPlayersPerTeam — the Crew screen that moves it is skipped in Lobby Mode. 2v2 to 3v3.
    getMaxPlayers: () => window.mpLobbyStyle === 'team' ? 2 : 6,
    getMinPlayers: () => window.mpLobbyStyle === 'team' ? 2 : 4,
  },
  bld: {
    gameName:        'Bailed',
    emoji:           '💬',
    brandBtnClass:   'bld-cta',
    ptpLabel:        'Make the Plans 💬',
    menuScreen:      'screen-bld-menu',
    onPassThePhone: () => {
      if (window.syllyMultiplayerMode === 'host') {
        bldPlayerCount = mpPlayerSlots.length;
        bldPlayerNames = mpPlayerSlots.map(p => p.nickname);
        bldShowSeatingSetup();
      } else if (window.syllyMultiplayerMode === 'single') {
        bldShowSetup(); // PTP: no lobby, collect names manually
      }
      // 'client': waits for BLD_GAME_START SYNC from Host
    },
    recommendedMode: 'mdlm',
    supportedModes:  ['mdlm'],
    multiplayerOnly: true,
    lobbyCtaLabel:   'Make the Plans 💬',
    rosterConfig: { type: 'none', showTeamNamesInPreLobby: false, defaultTeamNames: null, hasCaptain: false },
    getMaxPlayers: () => 10,
    getMinPlayers: () => 5,
  },
  gth: {
    gameName:        'Group Therapy',
    emoji:           '🛋️',
    brandBtnClass:   'bg-[#B1BCA0] hover:opacity-90',
    ptpLabel:        'Start the Session 🛋️',
    menuScreen:      'screen-gth-menu',
    onPassThePhone: () => {
      if (window.syllyMultiplayerMode === 'host') {
        gthPlayerCount = mpPlayerSlots.length;
        gthPlayerNames = mpPlayerSlots.map(p => p.nickname);
        gthStartSession(); // settings already locked from lobby — skip menu re-visit
      }
      // 'client': waits for GTH_GAME_START SYNC from Host
    },
    recommendedMode: 'mdlm',
    supportedModes:  ['mdlm'],
    multiplayerOnly: true,
    lobbyCtaLabel:   'Start the Session 🛋️',
    rosterConfig: { type: 'none', showTeamNamesInPreLobby: false, defaultTeamNames: null, hasCaptain: false },
    getMaxPlayers: () => 8,
    getMinPlayers: () => 4,
  },
  dyb: {
    gameName:       'The Bluff',
    emoji:          '\u{1F3B2}',
    brandBtnClass:  'dyb-cta',
    ptpLabel:       "Let's Play!",
    menuScreen:     'screen-dyb-menu',
    onPassThePhone: () => {
      if (window.syllyMultiplayerMode === 'host') {
        dybPlayerCount = mpPlayerSlots.length;
        dybPlayerNames = mpPlayerSlots.map(p => p.nickname);
        dybShowSeating();
      }
      // 'client': waits for DYB_GAME_START SYNC
    },
    recommendedMode: 'mdlm',
    supportedModes:  ['mdlm'],
    multiplayerOnly: true,
    lobbyCtaLabel:   "Let's Play!",
    rosterConfig: { type: 'none', showTeamNamesInPreLobby: false, defaultTeamNames: null, hasCaptain: false },
    getMaxPlayers:   () => 8,
    getMinPlayers:   () => 3,
  },
  pass: {
    gameName:       'Pass',
    emoji:          '\u{1F0CF}',
    brandBtnClass:  'bg-zinc-900 hover:bg-zinc-800',
    ptpLabel:       'Deal Me In',
    menuScreen:     'screen-pass-menu',
    onPassThePhone: () => {
      if (window.syllyMultiplayerMode === 'host') {
        passPlayerCount = mpPlayerSlots.length;
        passPlayerNames = mpPlayerSlots.map(p => p.nickname);
        passShowSeating();
      }
      // 'client': waits for PASS_GAME_START SYNC
    },
    recommendedMode: 'mdlm',
    supportedModes:  ['mdlm'],
    multiplayerOnly: true,
    lobbyCtaLabel:   'Deal Me In',
    rosterConfig: { type: 'none', showTeamNamesInPreLobby: false, defaultTeamNames: null, hasCaptain: false },
    getMaxPlayers:   () => 6,
    getMinPlayers:   () => 3,
  },
  nt: {
    gameName:       'Net-Trace',
    emoji:          '⚡',
    brandBtnClass:  'bg-emerald-500 hover:bg-emerald-600',
    ptpLabel:       'Initialise System',
    lobbyCtaLabel:  'Initialise System',
    menuScreen:     'screen-nt-menu',
    onPassThePhone: () => {
      if (window.syllyMultiplayerMode === 'single') {
        // PTP selected: route to setup screen for player count + names
        ntShowSetup();
        return;
      }
      // Host AND client must both derive team/captain/name state from the confirmed
      // roster. Clients receive it via GAME_START (window.mpLobbyRoster is set just
      // before this fires). Previously only the host populated these — so on every
      // client ntTeamIdx stayed [] and ntCaptainSlots [-1,-1], breaking DNP routing:
      // no team members rendered (empty "My Team" hub), no second-team captain was
      // recognised, and ntCheckBothTeamsLocked() never fired (stuck after lock).
      ntPlayerCount = mpPlayerSlots.length;
      ntPlayerNames = mpPlayerSlots.map(p => p.nickname);
      if (window.mpLobbyRoster?.playerTeamIdx) {
        ntTeamIdx      = window.mpLobbyRoster.playerTeamIdx;
        ntTeamNames    = window.mpLobbyRoster.teamNames    || ntTeamNames;
        ntCaptainSlots = window.mpLobbyRoster.captainSlots || [-1, -1];
      }
      if (window.syllyMultiplayerMode === 'host') {
        // Go straight into the game (handshake → match), not back to the menu —
        // settings were configured pre-lobby. Matches FRT/GTH post-lobby routing.
        ntStartSession();
      }
      // 'client': waits for NT_GENERATE / NT_HUDDLE_START / NT_BUILD_BEGIN SYNCs
    },
    recommendedMode: 'mdlm',
    supportedModes:  ['ptp', 'mdlm'],
    multiplayerOnly: false,
    // PTP is locked when DNP (Sylly) is active — DNP requires a team
    getLockedModes: () => (typeof ntSyllyMode !== 'undefined' && ntSyllyMode)
      ? [{ mode: 'ptp', reason: 'DNP requires Multiplayer. Disable Sylly Mode in Settings to play solo.' }]
      : [],
    rosterConfig: {
      type:                  () => (typeof ntSyllyMode !== 'undefined' && ntSyllyMode) ? 'teams' : 'none',
      showTeamNamesInPreLobby: false,
      defaultTeamNames:      ['Amaze Inc.', 'Pender Securities'],
      hasCaptain:            () => (typeof ntSyllyMode !== 'undefined' && ntSyllyMode),
      captainIcon:           '⚡',
    },
    getMaxPlayers:   () => 8,
    getMinPlayers:   () => 2,
  },
  frt: {
    gameName:       'Fruit Salad',
    emoji:          '🍌',
    brandBtnClass:  'bg-[#FFE500] hover:bg-[#E6D200]',
    ctaTextClass:   'text-stone-800',
    ptpLabel:       'Start Serving',
    lobbyCtaLabel:  'Start Serving',
    menuScreen:     'screen-frt-menu',
    onPassThePhone: () => {
      if (window.syllyMultiplayerMode === 'host') {
        frtPlayerCount = mpPlayerSlots.length;
        frtPlayerNames = mpPlayerSlots.map(p => p.nickname);
        frtStartSession(); // deal straight into play (settings were set on the menu pre-lobby)
      }
      // 'client': waits for FRT_DEAL SYNC
    },
    recommendedMode: 'mdlm',
    supportedModes:  ['mdlm'],
    multiplayerOnly: true,
    rosterConfig:    { type: 'none' },
    getMaxPlayers:   () => (typeof frtPearOff !== 'undefined' && frtPearOff) ? 2 : 8,
    getMinPlayers:   () => (typeof frtPearOff !== 'undefined' && frtPearOff) ? 2 : 3,
  },

  shp: {
    gameName:       'Counting Sheep',
    emoji:          '\u{1F411}',
    brandBtnClass:  'shp-cta',
    ptpLabel:       'Lights Out',
    lobbyCtaLabel:  'Lights Out',
    menuScreen:     'screen-shp-menu',
    onPassThePhone: () => {
      if (window.syllyMultiplayerMode === 'host') {
        shpPlayerCount = mpPlayerSlots.length;
        shpPlayerNames = mpPlayerSlots.map(p => p.nickname);
        shpStartSession();
      }
      // 'client': waits for SHP_DEAL SYNC
    },
    recommendedMode: 'mdlm',
    supportedModes:  ['mdlm'],
    multiplayerOnly: true,
    rosterConfig:    { type: 'none' },
    getMaxPlayers:   () => 8,
    getMinPlayers:   () => 3,
  },
  flw: {
    gameName:       'Flawless',
    emoji:          '\u{1F48E}',
    brandBtnClass:  'flw-cta',
    ptpLabel:       'Enter the Exhibition',
    lobbyCtaLabel:  'Enter the Exhibition',
    menuScreen:     'screen-flw-menu',
    onPassThePhone: () => {
      if (window.syllyMultiplayerMode === 'host') {
        flwPlayerCount = mpPlayerSlots.length;
        flwPlayerNames = mpPlayerSlots.map(p => p.nickname);
        flwStartSession();
      }
      // 'client': waits for FLW_SHOWING_START SYNC
    },
    recommendedMode: 'mdlm',
    supportedModes:  ['mdlm'],
    multiplayerOnly: true,
    rosterConfig:    { type: 'none' },
    getMaxPlayers:   () => 4,
    getMinPlayers:   () => 3,
  },
  pko: {
    gameName:       'Pecking Order',
    emoji:          '\u{1F418}',
    brandBtnClass:  'pko-cta',
    ptpLabel:       'Enter the Wild',
    lobbyCtaLabel:  'Enter the Wild',
    menuScreen:     'screen-pko-menu',
    onPassThePhone: () => {
      // Names come straight from the lobby — PKO has no setup screen (spec §17 D2).
      // Every device populates them; only the host deals.
      pkoPlayerCount = mpPlayerSlots.length;
      pkoPlayerNames = mpPlayerSlots.map(p => p.nickname);   // {uid, nickname} — never .name
      if (window.syllyMultiplayerMode === 'host') pkoStartSession();
      else pkoShowClientStandby();                            // waits for PKO_CLASH_BEGIN
    },
    recommendedMode: 'mdlm',
    supportedModes:  ['mdlm'],
    multiplayerOnly: true,
    rosterConfig:    { type: 'none' },
    getMaxPlayers:   () => 6,
    getMinPlayers:   () => 3,
  },
  cjar: {
    gameName:       'Cookie Jar',
    emoji:          '\u{1F36A}',
    brandBtnClass:  'cjar-cta',
    // REQUIRED. #D4A017 measures 2.38:1 against white — below the 3:1 floor. cjar is
    // the second consumer of this field after FRT (v156).
    ctaTextClass:   'text-stone-800',
    ptpLabel:       'Raid the Jar!',
    lobbyCtaLabel:  'Raid the Jar!',
    menuScreen:     'screen-cjar-menu',
    onPassThePhone: () => {
      // Names come straight from the lobby — cjar has no setup screen (spec D-01).
      // The slot object is { uid, nickname }: .name returns undefined silently.
      cjarPlayerCount = mpPlayerSlots.length;
      cjarPlayerNames = mpPlayerSlots.map(p => p.nickname);
      // Straight into Raid 1 — NOT back to the game menu. Settings were locked in
      // before the lobby (menu → Settings → Play → mode screen → host lobby), so a
      // menu re-visit just makes the host tap "Raid the Jar!" a second time. This is
      // what GTH, FRT, SHP, FLW and PKO all do; cjar was the only game that bounced.
      if (window.syllyMultiplayerMode === 'host') cjarStartMatch();
      else cjarShowClientStandby();
    },
    recommendedMode: 'mdlm',
    supportedModes:  ['mdlm'],
    multiplayerOnly: true,
    // 'individual' requires every player to be hand-assigned in Assign Spots; anyone
    // left unassigned produces reordered[-1] and corrupts the slot array.
    rosterConfig:    { type: 'none' },
    getMaxPlayers:   () => 8,
    getMinPlayers:   () => 3,   // 4 → 3, owner call 3 Aug 2026. Nothing in the deck,
    // bust odds or the affinity draw is player-count dependent; 3-player balance is
    // UNSIMULATED (the balance tool ran 5 and 8) — watch it at the next playtest.
  },
};

// ── Nickname Helpers ──────────────────────────────────────────────────────────
function mpGetNickname() { return localStorage.getItem('sylly_nickname') || ''; }
function mpSaveNickname(v) { if (v.trim()) localStorage.setItem('sylly_nickname', v.trim()); }

// ── Room Code Generator ───────────────────────────────────────────────────────
function mpGenerateRoomCode() {
  return Array.from({length:4}, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random()*32)]).join('');
}

// ── Nickname field shake helper ───────────────────────────────────────────────
function mpShakeNicknameInput(inputEl) {
  inputEl.classList.add('border-red-400');
  inputEl.classList.remove('shake');
  void inputEl.offsetWidth;
  inputEl.classList.add('shake');
  setTimeout(() => inputEl.classList.remove('border-red-400'), 1500);
}

// ── Mode metadata ─────────────────────────────────────────────────────────────
const MODE_INFO = {
  ptp:  { label: 'Pass the Phone',          desc: 'Take turns on a single device. No internet needed.',                              icon: '📲' },
  tlm:  { label: 'Team Lobby Mode',         desc: 'Each team shares one device. Host creates a room, others join with a code.',      icon: '👥' },
  mdlm: { label: 'Multi-device Lobby Mode', desc: 'Each player uses their own phone. Host creates a room, others join with a code.', icon: '📱' },
};

// ── Mode selection card visuals ───────────────────────────────────────────────
function mpSetModeSelection(mode, lobbyStyle) {
  mpSelectedMode = mode;
  if (mode !== 'ptp' && lobbyStyle) window.mpLobbyStyle = lobbyStyle;

  document.querySelectorAll('#screen-mp-mode .mp-mode-dot-btn').forEach(btn => {
    const btnMode  = btn.dataset.selMode;
    const btnStyle = btn.dataset.lobbyStyle || null;
    const isSelected = (btnMode === mode) && (mode === 'ptp' || btnStyle === lobbyStyle);
    const dot = btn.querySelector('.mp-mode-dot');
    btn.classList.toggle('border-stone-800', isSelected);
    btn.classList.toggle('bg-stone-50',      isSelected);
    btn.classList.toggle('border-stone-200', !isSelected);
    btn.classList.toggle('bg-white',         !isSelected);
    dot.classList.toggle('bg-stone-800',     isSelected);
    dot.classList.toggle('border-stone-800', isSelected);
    dot.classList.toggle('bg-transparent',   !isSelected);
    dot.classList.toggle('border-stone-300', !isSelected);
  });
}

// ── Build one mode section (recommended or others) ────────────────────────────
function mpBuildModeSection(modes, isRecommended, online) {
  const wrap = document.createElement('div');
  wrap.className = 'flex flex-col gap-3';

  // Section label + divider
  const labelRow = document.createElement('div');
  labelRow.className = 'flex items-center gap-3';
  labelRow.innerHTML = `
    <p class="text-xs font-bold text-stone-400 uppercase tracking-widest flex-shrink-0">${isRecommended ? 'Recommended' : 'Other options'}</p>
    <div class="flex-1 h-px bg-stone-200"></div>
  `;
  wrap.appendChild(labelRow);

  // Generic locked-mode hook — game config may declare getLockedModes() to disable
  // specific modes with a reason string. Used by NT to lock PTP when DNP (Sylly) is on.
  const lockedModes = mpActiveGameConfig?.getLockedModes?.() || [];

  for (const modeKey of modes) {
    const info       = MODE_INFO[modeKey];
    const isLobby    = (modeKey === 'tlm' || modeKey === 'mdlm');
    const lobbyStyle = modeKey === 'tlm' ? 'team' : 'individual';
    const dimmed     = isLobby && !online;
    const lockInfo   = lockedModes.find(l => l.mode === modeKey);
    const locked     = !!lockInfo;

    // Mode description chip
    const chip = document.createElement('div');
    chip.className = `rounded-2xl px-4 py-3 flex flex-col gap-1 ${(dimmed || locked) ? 'bg-stone-100 opacity-40' : 'bg-stone-50'}`;
    chip.innerHTML = `
      <p class="text-stone-700 font-semibold text-sm">${info.label}</p>
      <p class="text-stone-400 text-xs">${info.desc}</p>
    `;
    wrap.appendChild(chip);

    if (isLobby) {
      const rows = [
        { selMode: 'host', lobbyStyle, icon: '🖥', label: 'Host Lobby',  sub: 'Create a room and share the code' },
        { selMode: 'join', lobbyStyle, icon: '📱', label: 'Join Lobby',  sub: 'Enter a code to join someone\'s room' },
      ];
      rows.forEach(({ selMode, lobbyStyle: ls, icon, label, sub }) => {
        const btn = document.createElement('button');
        btn.className = `flex items-center gap-3 w-full p-4 rounded-2xl border-2 border-stone-200 bg-white active:scale-95 transition-all duration-150 text-left mp-mode-dot-btn${(dimmed || locked) ? ' opacity-40 pointer-events-none' : ''}`;
        btn.dataset.selMode    = selMode;
        btn.dataset.lobbyStyle = ls;
        btn.disabled           = dimmed || locked;
        btn.innerHTML = `
          <span class="mp-mode-dot w-5 h-5 rounded-full border-2 border-stone-300 bg-transparent flex-shrink-0 transition-all duration-150"></span>
          <div>
            <p class="font-semibold text-stone-800 text-sm leading-tight">${icon} ${label}</p>
            <p class="text-stone-400 text-xs mt-0.5">${sub}</p>
          </div>
        `;
        btn.addEventListener('click', () => { playPillClick(); mpSetModeSelection(selMode, ls); });
        wrap.appendChild(btn);
      });
    } else {
      // PTP: single selectable row
      const btn = document.createElement('button');
      btn.className = `flex items-center gap-3 w-full p-4 rounded-2xl border-2 border-stone-200 bg-white active:scale-95 transition-all duration-150 text-left mp-mode-dot-btn${locked ? ' opacity-40 pointer-events-none' : ''}`;
      btn.dataset.selMode = 'ptp';
      btn.disabled        = locked;
      btn.innerHTML = `
        <span class="mp-mode-dot w-5 h-5 rounded-full border-2 border-stone-300 bg-transparent flex-shrink-0 transition-all duration-150"></span>
        <div>
          <p class="font-semibold text-stone-800 text-sm leading-tight">${info.icon} Pass the Phone</p>
          <p class="text-stone-400 text-xs mt-0.5">Take turns on a single device</p>
        </div>
      `;
      btn.addEventListener('click', () => { playPillClick(); mpSetModeSelection('ptp', null); });
      wrap.appendChild(btn);
    }

    // Locked reason note — shown below the button(s) for this mode
    if (locked && lockInfo.reason) {
      const note = document.createElement('p');
      note.className = 'text-stone-400 text-xs text-center italic px-2';
      note.textContent = '🔒 ' + lockInfo.reason;
      wrap.appendChild(note);
    }
  }

  return wrap;
}

// ── Show: Mode Selection ──────────────────────────────────────────────────────
function mpShowModeScreen(gameAbbr) {
  const cfg = MP_GAME_CONFIGS[gameAbbr];
  mpActiveGame       = gameAbbr;
  mpActiveGameConfig = cfg;

  document.getElementById('mp-mode-emoji').textContent     = cfg.emoji;
  document.getElementById('mp-mode-game-name').textContent = cfg.gameName;

  const cta = document.getElementById('btn-mp-mode-cta');
  cta.textContent = cfg.ptpLabel;
  cta.className   = `min-h-14 w-full rounded-2xl ${cfg.brandBtnClass} active:scale-95 ${cfg.ctaTextClass || 'text-white'} text-xl font-semibold transition-all duration-150`;

  const online     = navigator.onLine;
  document.getElementById('mp-mode-offline-notice').style.display = online ? 'none' : 'block';

  const recMode    = cfg.recommendedMode;
  const otherModes = cfg.supportedModes.filter(m => m !== recMode);

  const recSection = document.getElementById('mp-mode-recommended-section');
  const othSection = document.getElementById('mp-mode-others-section');
  recSection.innerHTML = '';
  othSection.innerHTML = '';

  recSection.appendChild(mpBuildModeSection([recMode], true, online));
  if (otherModes.length > 0) {
    othSection.appendChild(mpBuildModeSection(otherModes, false, online));
  }

  // Default selection: first option of the recommended mode
  if (!online || recMode === 'ptp') {
    mpSetModeSelection('ptp', null);
  } else if (recMode === 'tlm') {
    mpSetModeSelection('host', 'team');
  } else {
    mpSetModeSelection('host', 'individual');
  }

  showScreen('screen-mp-mode');
}

// ── Show: Host Lobby ──────────────────────────────────────────────────────────
function mpShowLobbyHost() {
  const cta       = document.getElementById('btn-mp-lobby-host-cta');
  cta.textContent = (mpActiveGameConfig?.lobbyCtaLabel || 'Start') + ' →';
  cta.disabled    = true;
  cta.classList.add('opacity-50', 'pointer-events-none');

  showScreen('screen-mp-lobby-host');
}

// ── Show: Join Lobby ──────────────────────────────────────────────────────────
function mpShowLobbyJoin() {
  ['mp-join-c1','mp-join-c2','mp-join-c3','mp-join-c4'].forEach(id => {
    document.getElementById(id).value = '';
  });
  const nicknameInput = document.getElementById('mp-join-nickname-input');
  nicknameInput.value = mpGetNickname();
  nicknameInput.classList.remove('border-red-400', 'shake');

  const status = document.getElementById('mp-join-status');
  status.textContent = '';

  const cta = document.getElementById('btn-mp-join-enter');
  cta.textContent = 'Enter Room →';
  cta.disabled    = true;
  cta.classList.add('opacity-50');

  showScreen('screen-mp-lobby-join');
}

// ── Join CTA: check code boxes AND nickname ───────────────────────────────────
function mpUpdateJoinCta() {
  const codeBoxes = ['mp-join-c1','mp-join-c2','mp-join-c3','mp-join-c4'].map(id => document.getElementById(id));
  const allFilled = codeBoxes.every(b => b.value.length === 1);
  const hasNick   = document.getElementById('mp-join-nickname-input').value.trim().length > 0;
  const cta       = document.getElementById('btn-mp-join-enter');
  const ready     = allFilled && hasNick;
  cta.disabled    = !ready;
  cta.classList.toggle('opacity-50', !ready);
}

// ═══════════════════════════════════════════════════════════════
// SPRINT 3 — FIREBASE INFRASTRUCTURE
// ═══════════════════════════════════════════════════════════════

// ── Firebase lazy-loader ──────────────────────────────────────────────────────
function syllyLoadFirebase(onReady) {
  if (window.syllyFirebase) { onReady(); return; }
  const s  = document.createElement('script');
  s.type   = 'module';
  s.src    = 'js/lib/firebase-init.js';

  // Timeout: if neither event fires in 12s the module likely failed silently
  const giveUp = setTimeout(() => {
    document.removeEventListener('sylly-firebase-ready', onReady);
    syllyShowNetworkError();
  }, 12000);

  const onSuccess = () => { clearTimeout(giveUp); onReady(); };
  const onFail    = () => { clearTimeout(giveUp); syllyShowNetworkError(); };

  document.addEventListener('sylly-firebase-ready', onSuccess, { once: true });
  document.addEventListener('sylly-firebase-error', onFail,    { once: true });
  s.onerror = onFail;
  document.head.appendChild(s);
}

function syllyShowNetworkError() {
  document.getElementById('mp-network-error-overlay').style.display = 'flex';
}

// ── Room teardown (called from resetToLobby guard + host Cancel) ──────────────
async function syllyTeardownRoom() {
  if (!mpRoomRef || !window.syllyFirebase) return;
  try {
    await window.syllyFirebase.set(
      window.syllyFirebase.ref(`rooms/${mpActiveRoomCode}/lifecycle`),
      { state: 'closed', closedAt: Date.now() }
    );
    await window.syllyFirebase.remove(mpRoomRef);
  } catch (_) {}
  mpStopListeners();
  mpActiveRoomCode = null;
  mpRoomRef        = null;
  mpPlayerSlots    = [];
}

// ── Sync lock ─────────────────────────────────────────────────────────────────
function mpLockSync() {
  // Already locked = a prior ACTION is still in flight (double-tap). Don't re-authorise:
  // mpSendEnvelope() will drop the duplicate ACTION. Keep the existing lock + timer running.
  if (window.syllySyncLocked) return;
  window.syllySyncLocked = true;
  mpActionAuthorised = true; // authorise the single ACTION that follows this lock
  document.body.classList.add('mp-sync-locked');
  mpSyncLockTimer = setTimeout(() => {
    mpUnlockSync();
    // Brief connection-slow feedback: reuse network error overlay with a different message
    // (Sprint 4 can add a dedicated toast component)
  }, 8000);
}
function mpUnlockSync() {
  window.syllySyncLocked = false;
  mpActionAuthorised     = false;
  document.body.classList.remove('mp-sync-locked');
  if (mpSyncLockTimer) { clearTimeout(mpSyncLockTimer); mpSyncLockTimer = null; }
}

// ── Envelope: send ────────────────────────────────────────────────────────────
async function mpSendEnvelope(envelope) {
  if (!mpActiveRoomCode || !window.syllyFirebase) return;
  // Double-submission backstop (universal — works without .btn-mp-action being present):
  // while the sync lock is held, only the single ACTION authorised by the matching
  // mpLockSync() may pass. A rapid second tap re-enters mpLockSync() (no-op while locked,
  // no re-authorise) and is dropped here — preventing e.g. two SS_DECODE_SUBMITs running
  // ssResolve() twice. Fire-and-forget ACTIONs that never lock (votes, disputes, messages)
  // see syllySyncLocked === false and are unaffected.
  if (envelope.type === 'ACTION' && window.syllySyncLocked) {
    if (!mpActionAuthorised) return;
    mpActionAuthorised = false;
  }
  await window.syllyFirebase.push(
    window.syllyFirebase.ref(`rooms/${mpActiveRoomCode}/events`),
    { ...envelope, originId: window.syllyDeviceUid, timestamp: Date.now() }
  );
}

// ── Listeners: start / stop ───────────────────────────────────────────────────
function mpStartEventListener() {
  if (!mpActiveRoomCode || !window.syllyFirebase) return;
  mpJoinListenFrom = Date.now();
  const eventsRef  = window.syllyFirebase.ref(`rooms/${mpActiveRoomCode}/events`);
  // onChildAdded fires exactly once per new child — prevents re-processing on subsequent writes
  mpEventsListener = window.syllyFirebase.onChildAdded(eventsRef, childSnap => {
    const env = childSnap.val();
    if (!env || env.timestamp < mpJoinListenFrom) return;
    if (env.originId === window.syllyDeviceUid) return;
    mpHandleEnvelope(env);
  });
}

function mpStopListeners() {
  if (mpEventsListener)  { mpEventsListener();  mpEventsListener  = null; }
  if (mpPrivateListener) { mpPrivateListener(); mpPrivateListener = null; }
  if (mpRoomListener)    { mpRoomListener();    mpRoomListener    = null; }
  if (mpPlayersListener) { mpPlayersListener(); mpPlayersListener = null; }
}

// ── Private envelope: Host → ONE device (bypasses the public /events stream) ──
// First true private-write primitive (Flawless / hidden-information games). The host
// delivers a single player's secret state — their hand, an Amethyst peek result, a
// failed-audit leak — to that device's own queue under rooms/{code}/private/{uid},
// so secrets NEVER enter the shared /events log every device reads.
//
// Contract:
//   • HOST-ONLY writer. A client must never write here.
//   • `envelope` is a FULL envelope ({ type, payload }) — same shape as mpSendEnvelope —
//     so the recipient routes it through mpHandleEnvelope() unchanged.
//   • Never call with the host's OWN uid: the host already holds all private state
//     locally (host-as-participant). A self-write would be filtered out by the
//     originId === syllyDeviceUid guard in mpStartPrivateListener anyway.
//   • Privacy note: this gives ORGANISATIONAL privacy (each device only subscribes to
//     its own queue; secrets stay out of /events). True at-rest network privacy also
//     requires Firebase RTDB rules scoping private/{uid} reads to that uid.
async function mpSendPrivate(targetUid, envelope) {
  if (!mpActiveRoomCode || !window.syllyFirebase || !targetUid) return;
  await window.syllyFirebase.push(
    window.syllyFirebase.ref(`rooms/${mpActiveRoomCode}/private/${targetUid}`),
    { ...envelope, originId: window.syllyDeviceUid, timestamp: Date.now() }
  );
}

// Every device subscribes to its OWN private queue (mirrors mpStartEventListener).
// Started for host + clients alongside the events listener; the private/* node is torn
// down transitively by syllyTeardownRoom()'s remove(mpRoomRef) (whole-room delete).
function mpStartPrivateListener() {
  if (!mpActiveRoomCode || !window.syllyFirebase || !window.syllyDeviceUid) return;
  const privRef = window.syllyFirebase.ref(`rooms/${mpActiveRoomCode}/private/${window.syllyDeviceUid}`);
  // onChildAdded fires once per new private write to THIS device's queue.
  // mpJoinListenFrom is already set by mpStartEventListener (host) / pre-handshake (client).
  mpPrivateListener = window.syllyFirebase.onChildAdded(privRef, childSnap => {
    const env = childSnap.val();
    if (!env || env.timestamp < mpJoinListenFrom) return;
    if (env.originId === window.syllyDeviceUid) return; // never receive own writes
    mpHandleEnvelope(env);
  });
}

// ── Settings serialiser (Host → SETTINGS_SYNC payload) ───────────────────────
function mpSerialiseSettings(abbr) {
  switch (abbr) {
    case 'gm': return {
      gmFrequencyRange, gmStaticInterference, gmCustomWords, gmInfiniteResync,
      gmMemoryGuard, gmResonanceTolerance, gmSignalBoost, gmSyllyIntensity,
    };
    case 'jec': return {
      jecRounds, jecGoldenScore, jecRottenPenalty, jecSpoiltPenalty,
      jecSousChefOversight, jecKitchenNightmares, jecFoodDifficulty, jecSpecialsBoard,
    };
    case 'ygi': return {
      ygiRounds, ygiDecider, ygiFullTally, ygiRinger,
      // ygiVerdictStyle is force-overridden to 'secret-ballot' in lobby mode; not included
    };
    case 'nat': return {
      natMatchesSetting, natRoundsPerMatch, natDifficulty, natCumulativeClues,
      natSyllyMode, natVotingMode, natScientificIntegrity, natEscapePoints,
    };
    case 'li5': return {
      settingTimer, settingRounds, settingDifficulty, settingSylly,
      settingPenaltyMode, settingSkipFree, settingTimePenalty, settingPlayAllDecks,
    };
    case 'dsd': return {
      dsdSeaState, dsdDangerLevel, dsdStrategicPlanning, dsdSyllyMode,
      dsdHazardControl: { ...dsdHazardControl },
    };
    case 'bld': return { bldDramaMode };
    case 'gth': return {
      gthDisordersPerPatient, gthDrawingTime, gthDiagnosisWindow,
      gthDifficultyMix, gthDeepDive, gthSyllyMode,
    };
    case 'dyb': return { dybWildcardsStyle, dybStartingHand, dybFootholdsMode, dybFootholdsCount, dybSyllyMode, dybSyllyIntensity };
    case 'pass': return {
      passHandSize, passChipStack, passMatchDuration, passBombStrictness,
      passMidGameDraw, passOpenClimbing, passMinSequenceLength, passJokerCount, passSkyJokerVariant, passSyllyMode,
    };
    case 'nt': return {
      ntMatrixScale, ntIterations, ntHardeningWin, ntNativeHoneypots, ntDebugMode, ntSyllyMode,
    };
    case 'frt': return {
      frtFruitStock, frtRounds, frtTurnTimer, frtSyllyMode, frtPearOff,
    };
    case 'flw': return {
      flwLedgerMode, flwTokenMode, flwCustomTarget, flwTurnTimer, flwBurnSetting, flwSyllyMode,
    };
    case 'shp': return {
      shpHandSize, shpMoons, shpMoonsToWin, shpDreamAccel, shpSyllyMode,
    };
    // pkoSyllyMode is inert in v1 (Force of Nature is Phase 2) but ships serialised
    // from day one so Phase 2 is a pure addition — spec §12/§16 Q7.
    // pkoAppetite is load-bearing, not cosmetic: the host re-validates every Challenge with
    // pkoBeats(), so a client on a different Appetite would have legal plays silently
    // rejected — the dead-button shape of BUG-02.
    // pkoScoring changes what pkoClashTarget MEANS (Clashes to win vs Clashes to play), so
    // the pair travels together or a client counts down to the wrong finish line.
    case 'pko': return {
      pkoScoring, pkoClashTarget, pkoHoardSize, pkoPoacherSetting, pkoScavenge, pkoStartSmall,
      pkoAppetite, pkoSyllyMode,
    };
    // All five are host-owned; a missing field means clients silently play with
    // different rules. cjarOpenBook is render-layer only but still must match, or
    // two devices disagree about what they are allowed to show.
    case 'cjar': return {
      cjarSnackFriendly, cjarHouseRules, cjarMatchLength, cjarDecisionTime,
      cjarOpenBook, cjarSyllyMode,
    };
    case 'ss': return {
      ssSettingInterceptsToWin, ssDifficultyLevel,
      ssRerollLimitSetting: ssRerollLimitSetting === Infinity ? 'Infinity' : ssRerollLimitSetting,  // JSON-safe (Infinity → null otherwise)
      ssTimerSetting, ssCustomiseVault, ssIntelSyllyMode,
      ssSelectedCategories: [...ssSelectedCategories],
    };
    case 'lttp': return {
      lttpPlayerCount, lttpDifficulty, lttpJokerMode, lttpGroupVote, lttpSmallTalk,
    };
    // Additional games added as Sprint 4 progresses
    default: return {};
  }
}

// ── Envelope: receive + route ─────────────────────────────────────────────────
// ── Mid-Game Quit Contract (logic-engine.md § Mid-Game Quit Contract) ─────────
// One device leaving mid-game dissolves the session for everyone: a client tells the host,
// and the host's own resetToLobby() broadcasts HOST_END_GAME to the rest. Without this a
// quitting client keeps its Firebase slot and every other device waits on a turn that never
// comes. Call this from a game's quit-confirm handler immediately BEFORE resetToLobby().
//
// Generic on purpose: the ten games that predate it each ship an identical [ABBR]_PLAYER_LEFT
// handler doing nothing game-specific. Those still work; new work uses this instead.
// Safe (a no-op) in 'single' and 'host' mode.
function mpNotifyPlayerLeft() {
  if (window.syllyMultiplayerMode !== 'client') return;
  try {
    mpSendEnvelope({ type: 'ACTION', payload: { action: 'MP_PLAYER_LEFT', playerIdx: mpMyPlayerIdx } });
  } catch (_) {}
}

function mpHandleEnvelope(env) {
  // Generic quit contract — checked before any per-game routing so a game needs no handler.
  if (env.type === 'ACTION' && env.payload?.action === 'MP_PLAYER_LEFT') {
    if (window.syllyMultiplayerMode === 'host') resetToLobby(); // broadcasts HOST_END_GAME
    return;
  }

  if (env.type === 'HANDSHAKE' && window.syllyMultiplayerMode === 'host') {
    if (env.payload.version !== SYLLY_VERSION) {
      document.getElementById('mp-version-mismatch-overlay').style.display = 'flex';
      return;
    }
    const slotIdx = mpPlayerSlots.length;
    mpPlayerSlots.push({ uid: env.originId, nickname: env.payload.nickname });
    window.syllyFirebase.set(
      window.syllyFirebase.ref(`rooms/${mpActiveRoomCode}/players/${slotIdx}`),
      { uid: env.originId, nickname: env.payload.nickname }
    );
    mpRenderHostPlayerList();
  }

  if (env.type === 'LOBBY') {
    if (env.payload.action === 'HOST_END_GAME') {
      document.getElementById('mp-host-disconnected-overlay').style.display = 'flex';
    }
    if (env.payload.action === 'LOBBY_RESET') {
      // Host is starting another round — return to join screen in a waiting state
      const codeChars = (mpActiveRoomCode || '----').split('');
      ['mp-join-c1','mp-join-c2','mp-join-c3','mp-join-c4'].forEach((id, i) => {
        const el = document.getElementById(id);
        if (el) el.value = codeChars[i] || '-';
      });
      const nicknameInput = document.getElementById('mp-join-nickname-input');
      if (nicknameInput) nicknameInput.value = mpGetNickname();
      const status = document.getElementById('mp-join-status');
      if (status) {
        status.textContent = 'Host is setting up another round — waiting to start…';
        status.className   = 'text-stone-500 text-sm text-center mt-2';
      }
      const cta = document.getElementById('btn-mp-join-enter');
      if (cta) { cta.textContent = 'Waiting for host…'; cta.disabled = true; cta.classList.add('opacity-50'); }
      showScreen('screen-mp-lobby-join');
    }
    if (env.payload.action === 'SETTINGS_SYNC') {
      const s = env.payload.gameSettings || {};
      switch (mpActiveGame) {
        case 'gm':
          if (s.gmFrequencyRange     !== undefined) gmFrequencyRange     = s.gmFrequencyRange;
          if (s.gmStaticInterference !== undefined) gmStaticInterference = s.gmStaticInterference;
          if (s.gmCustomWords        !== undefined) gmCustomWords        = s.gmCustomWords;
          if (s.gmInfiniteResync     !== undefined) gmInfiniteResync     = s.gmInfiniteResync;
          if (s.gmMemoryGuard        !== undefined) gmMemoryGuard        = s.gmMemoryGuard;
          if (s.gmResonanceTolerance !== undefined) gmResonanceTolerance = s.gmResonanceTolerance;
          if (s.gmSignalBoost        !== undefined) gmSignalBoost        = s.gmSignalBoost;
          if (s.gmSyllyIntensity     !== undefined) gmSyllyIntensity     = s.gmSyllyIntensity;
          break;
        case 'jec':
          if (s.jecRounds            !== undefined) jecRounds            = s.jecRounds;
          if (s.jecGoldenScore       !== undefined) jecGoldenScore       = s.jecGoldenScore;
          if (s.jecRottenPenalty     !== undefined) jecRottenPenalty     = s.jecRottenPenalty;
          if (s.jecSpoiltPenalty     !== undefined) jecSpoiltPenalty     = s.jecSpoiltPenalty;
          if (s.jecSousChefOversight !== undefined) jecSousChefOversight = s.jecSousChefOversight;
          if (s.jecKitchenNightmares !== undefined) jecKitchenNightmares = s.jecKitchenNightmares;
          if (s.jecFoodDifficulty    !== undefined) jecFoodDifficulty    = s.jecFoodDifficulty;
          if (s.jecSpecialsBoard     !== undefined) jecSpecialsBoard     = s.jecSpecialsBoard;
          break;
        case 'ygi':
          if (s.ygiRounds    !== undefined) ygiRounds    = s.ygiRounds;
          if (s.ygiDecider   !== undefined) ygiDecider   = s.ygiDecider;
          if (s.ygiFullTally !== undefined) ygiFullTally = s.ygiFullTally;
          if (s.ygiRinger    !== undefined) ygiRinger    = s.ygiRinger;
          // ygiVerdictStyle applied later in ygiStartGame() based on mpLobbyStyle
          break;
        case 'lttp':
          if (s.lttpPlayerCount !== undefined) lttpPlayerCount = s.lttpPlayerCount;
          if (s.lttpDifficulty  !== undefined) lttpDifficulty  = s.lttpDifficulty;
          if (s.lttpJokerMode   !== undefined) lttpJokerMode   = s.lttpJokerMode;
          if (s.lttpGroupVote   !== undefined) lttpGroupVote   = s.lttpGroupVote;
          if (s.lttpSmallTalk   !== undefined) lttpSmallTalk   = s.lttpSmallTalk;
          break;
        case 'ss':
          if (s.ssSettingInterceptsToWin !== undefined) ssSettingInterceptsToWin = s.ssSettingInterceptsToWin;
          if (s.ssDifficultyLevel        !== undefined) ssDifficultyLevel        = s.ssDifficultyLevel;
          if (s.ssRerollLimitSetting     !== undefined) ssRerollLimitSetting     = s.ssRerollLimitSetting === 'Infinity' ? Infinity : s.ssRerollLimitSetting;
          if (s.ssTimerSetting           !== undefined) ssTimerSetting           = s.ssTimerSetting;
          if (s.ssCustomiseVault         !== undefined) ssCustomiseVault         = s.ssCustomiseVault;
          if (s.ssIntelSyllyMode         !== undefined) ssIntelSyllyMode         = s.ssIntelSyllyMode;
          if (Array.isArray(s.ssSelectedCategories))    ssSelectedCategories     = [...s.ssSelectedCategories];
          break;
        case 'dsd':
          if (s.dsdSeaState          !== undefined) dsdSeaState          = s.dsdSeaState;
          if (s.dsdDangerLevel       !== undefined) dsdDangerLevel       = s.dsdDangerLevel;
          if (s.dsdStrategicPlanning !== undefined) dsdStrategicPlanning = s.dsdStrategicPlanning;
          if (s.dsdSyllyMode         !== undefined) dsdSyllyMode         = s.dsdSyllyMode;
          if (s.dsdHazardControl     !== undefined) Object.assign(dsdHazardControl, s.dsdHazardControl);
          break;
        case 'bld':
          if (s.bldDramaMode !== undefined) bldDramaMode = s.bldDramaMode;
          break;
        case 'gth':
          if (s.gthDisordersPerPatient !== undefined) gthDisordersPerPatient = s.gthDisordersPerPatient;
          if (s.gthDrawingTime         !== undefined) gthDrawingTime         = s.gthDrawingTime;
          if (s.gthDiagnosisWindow     !== undefined) gthDiagnosisWindow     = s.gthDiagnosisWindow;
          if (s.gthDifficultyMix       !== undefined) gthDifficultyMix       = s.gthDifficultyMix;
          if (s.gthDeepDive            !== undefined) gthDeepDive            = s.gthDeepDive;
          if (s.gthSyllyMode           !== undefined) gthSyllyMode           = s.gthSyllyMode;
          break;
        case 'dyb':
          if (s.dybWildcardsStyle  !== undefined) dybWildcardsStyle  = s.dybWildcardsStyle;
          if (s.dybStartingHand    !== undefined) dybStartingHand    = s.dybStartingHand;
          if (s.dybFootholdsMode   !== undefined) dybFootholdsMode   = s.dybFootholdsMode;
          if (s.dybFootholdsCount  !== undefined) dybFootholdsCount  = s.dybFootholdsCount;
          if (s.dybSyllyMode       !== undefined) dybSyllyMode       = s.dybSyllyMode;
          if (s.dybSyllyIntensity  !== undefined) dybSyllyIntensity  = s.dybSyllyIntensity;
          break;
        case 'li5':
          if (s.settingTimer        !== undefined) settingTimer        = s.settingTimer;
          if (s.settingRounds       !== undefined) settingRounds       = s.settingRounds;
          if (s.settingDifficulty   !== undefined) settingDifficulty   = s.settingDifficulty;
          if (s.settingSylly        !== undefined) settingSylly        = s.settingSylly;
          if (s.settingPenaltyMode  !== undefined) settingPenaltyMode  = s.settingPenaltyMode;
          if (s.settingSkipFree     !== undefined) settingSkipFree     = s.settingSkipFree;
          if (s.settingTimePenalty  !== undefined) settingTimePenalty  = s.settingTimePenalty;
          if (s.settingPlayAllDecks !== undefined) settingPlayAllDecks = s.settingPlayAllDecks;
          break;
        case 'nat':
          if (s.natMatchesSetting   !== undefined) natMatchesSetting   = s.natMatchesSetting;
          if (s.natRoundsPerMatch   !== undefined) natRoundsPerMatch   = s.natRoundsPerMatch;
          if (s.natDifficulty       !== undefined) natDifficulty       = s.natDifficulty;
          if (s.natCumulativeClues  !== undefined) natCumulativeClues  = s.natCumulativeClues;
          if (s.natSyllyMode        !== undefined) natSyllyMode        = s.natSyllyMode;
          if (s.natVotingMode       !== undefined) natVotingMode       = s.natVotingMode;
          if (s.natScientificIntegrity !== undefined) natScientificIntegrity = s.natScientificIntegrity;
          if (s.natEscapePoints     !== undefined) natEscapePoints     = s.natEscapePoints;
          break;
        case 'nt':
          if (s.ntMatrixScale      !== undefined) ntMatrixScale      = s.ntMatrixScale;
          if (s.ntIterations       !== undefined) ntIterations       = s.ntIterations;
          if (s.ntHardeningWin     !== undefined) ntHardeningWin     = s.ntHardeningWin;
          if (s.ntNativeHoneypots  !== undefined) ntNativeHoneypots  = s.ntNativeHoneypots;
          if (s.ntDebugMode        !== undefined) ntDebugMode        = s.ntDebugMode;
          if (s.ntSyllyMode        !== undefined) ntSyllyMode        = s.ntSyllyMode;
          break;
        case 'frt':
          if (s.frtFruitStock !== undefined) frtFruitStock = s.frtFruitStock;
          if (s.frtRounds     !== undefined) frtRounds     = s.frtRounds;
          if (s.frtTurnTimer  !== undefined) frtTurnTimer  = s.frtTurnTimer;
          if (s.frtSyllyMode  !== undefined) frtSyllyMode  = s.frtSyllyMode;
          if (s.frtPearOff    !== undefined) frtPearOff    = s.frtPearOff;
          break;
        case 'shp':
          if (s.shpHandSize     !== undefined) shpHandSize     = s.shpHandSize;
          if (s.shpMoons        !== undefined) shpMoons        = s.shpMoons;
          if (s.shpMoonsToWin   !== undefined) shpMoonsToWin   = s.shpMoonsToWin;
          if (s.shpDreamAccel   !== undefined) shpDreamAccel   = s.shpDreamAccel;
          if (s.shpSyllyMode    !== undefined) shpSyllyMode    = s.shpSyllyMode;
          break;
        case 'flw':
          if (s.flwLedgerMode   !== undefined) flwLedgerMode   = s.flwLedgerMode;
          if (s.flwTokenMode    !== undefined) flwTokenMode    = s.flwTokenMode;
          if (s.flwCustomTarget !== undefined) flwCustomTarget = s.flwCustomTarget;
          if (s.flwTurnTimer    !== undefined) flwTurnTimer    = s.flwTurnTimer;
          if (s.flwBurnSetting  !== undefined) flwBurnSetting  = s.flwBurnSetting;
          if (s.flwSyllyMode    !== undefined) flwSyllyMode    = s.flwSyllyMode;
          break;
        case 'pko':
          if (s.pkoScoring        !== undefined) pkoScoring        = s.pkoScoring;
          if (s.pkoClashTarget    !== undefined) pkoClashTarget    = s.pkoClashTarget;
          if (s.pkoHoardSize      !== undefined) pkoHoardSize      = s.pkoHoardSize;
          if (s.pkoPoacherSetting !== undefined) pkoPoacherSetting = s.pkoPoacherSetting;
          if (s.pkoScavenge       !== undefined) pkoScavenge       = s.pkoScavenge;
          if (s.pkoStartSmall     !== undefined) pkoStartSmall     = s.pkoStartSmall;
          if (s.pkoAppetite       !== undefined) pkoAppetite       = s.pkoAppetite;
          if (s.pkoSyllyMode      !== undefined) pkoSyllyMode      = s.pkoSyllyMode;
          break;
        // The deserialise half of the pair above. Without it SETTINGS_SYNC arrives and
        // is silently discarded, so a client's read-only settings overlay shows its own
        // defaults instead of the host's while the lobby is still open. CJAR_MATCH_START
        // also carries all five, so the in-match rules would still agree — this is the
        // pre-game view only, but every other game wires both halves.
        case 'cjar':
          if (s.cjarSnackFriendly !== undefined) cjarSnackFriendly = s.cjarSnackFriendly;
          if (s.cjarHouseRules    !== undefined) cjarHouseRules    = s.cjarHouseRules;
          if (s.cjarMatchLength   !== undefined) cjarMatchLength   = s.cjarMatchLength;
          if (s.cjarDecisionTime  !== undefined) cjarDecisionTime  = s.cjarDecisionTime;
          if (s.cjarOpenBook      !== undefined) cjarOpenBook      = s.cjarOpenBook;
          if (s.cjarSyllyMode     !== undefined) cjarSyllyMode     = s.cjarSyllyMode;
          break;
        // Additional games added as Sprint 4 progresses
      }
    }
    if (env.payload.action === 'GAME_START') {
      const slots = env.payload.playerSlots || [];
      const myIdx = slots.findIndex(p => p.uid === window.syllyDeviceUid);
      if (myIdx < 0) {
        // This device's uid isn't in the roster the host just confirmed — it joined too
        // late (its HANDSHAKE hadn't been processed into the host's mpPlayerSlots snapshot
        // yet when the host clicked Start). Falling through with mpMyPlayerIdx = -1 would
        // corrupt every per-seat array indexed by it (readyChecks, placements, names) —
        // and NOT a safe "assume seat 0" fallback, since that would make this device
        // impersonate the host's own seat. Fail visibly instead.
        document.getElementById('mp-roster-mismatch-overlay').style.display = 'flex';
        return;
      }
      mpMyPlayerIdx = myIdx;
      mpPlayerSlots = slots;
      if (env.payload.mpLobbyStyle) window.mpLobbyStyle = env.payload.mpLobbyStyle;
      window.mpLobbyRoster = env.payload.rosterData || null;
      // Navigate to the game's first screen — same path as Pass-the-Phone
      mpActiveGameConfig.onPassThePhone();
    }
  }

  // ── Great Minds ACTION/SYNC ────────────────────────────────────────────────
  if (mpActiveGame === 'gm') {
    // GM_ROUND_START — Client applies pair and enters input phase
    if (env.type === 'SYNC' && env.payload.action === 'GM_ROUND_START') {
      gmCurrentPair = env.payload.pair;
      if (env.payload.bannedLetter !== undefined) gmBannedLetter = env.payload.bannedLetter;
      // Reset the setup screen pair display for client, then advance to input
      document.getElementById('btn-gm-start-round').style.display = '';
      document.getElementById('btn-gm-reroll-pair').style.display = '';
      gmStartInputPhase();
    }

    // GM_SUBMIT — Host receives client's word; resolves when both submitted
    if (env.type === 'ACTION' && env.payload.action === 'GM_SUBMIT' &&
        window.syllyMultiplayerMode === 'host') {
      const { playerIdx, word, boost } = env.payload;
      if (playerIdx === 1) {
        gmWordB        = word;
        gmPendingBoostB = boost || '';
      }
      gmMpReadyCheck[playerIdx] = true;
      if (gmMpReadyCheck[0] && gmMpReadyCheck[1]) gmMpResolveRound();
    }

    // GM_RESULT — Client applies resolved state and renders result screen
    if (env.type === 'SYNC' && env.payload.action === 'GM_RESULT') {
      gmMpDisplayResult(env.payload);
    }
  }

  // ── Just Enough Cooks ACTION/SYNC ─────────────────────────────────────────
  if (mpActiveGame === 'jec') {
    // JEC_ORDER — Client shows the order screen for this round
    if (env.type === 'SYNC' && env.payload.action === 'JEC_ORDER') {
      jecCurrentWord  = env.payload.word;
      jecRound        = env.payload.round;
      jecRounds       = env.payload.rounds;
      jecInputs       = Array.from({ length: jecPlayerCount }, () => ['', '', '']);
      jecMpReadyCheck = Array(jecPlayerCount).fill(false);
      if (jecKitchenNightmares) {
        jecSignatures = Array(jecPlayerCount).fill(-1);
        jecPoisons    = Array(jecPlayerCount).fill('');
      }
      jecShowOrderScreen();
    }

    // JEC_PREP_SUBMIT — Host collects submissions; resolves sifting when all ready
    if (env.type === 'ACTION' && env.payload.action === 'JEC_PREP_SUBMIT' &&
        window.syllyMultiplayerMode === 'host') {
      const { playerIdx, ingredients, poison } = env.payload;
      jecInputs[playerIdx] = ingredients;
      if (jecKitchenNightmares && poison) {
        jecPoisons[playerIdx]    = poison;
        jecSignatures[playerIdx] = 0;
      }
      jecMpReadyCheck[playerIdx] = true;

      if (jecMpReadyCheck.every(Boolean)) {
        // All chefs submitted — run sifting, broadcast full sifting state
        jecBuildFrequency();
        if (jecKitchenNightmares) jecBuildPoisonSet();
        mpSendEnvelope({ type: 'SYNC', payload: {
          action:          'JEC_SIFTING',
          jecInputs:        jecInputs.map(a => [...a]),
          jecWordFrequency: {...jecWordFrequency},
          jecDisplayWords:  {...jecDisplayWords},
          jecMergeMap:      {...jecMergeMap},
          jecPoisonedNorms: [...jecPoisonedNorms],
          jecPoisons:       [...jecPoisons],
          jecSignatures:    [...jecSignatures],
        }});
        mpUnlockSync();
        jecStartSifting();
      }
    }

    // JEC_SIFTING — Client applies sifting state and renders sifting screen
    if (env.type === 'SYNC' && env.payload.action === 'JEC_SIFTING') {
      const p            = env.payload;
      jecInputs          = (p.jecInputs || []).map(a => [...(a || [])]);
      jecWordFrequency   = {...p.jecWordFrequency};
      jecDisplayWords    = {...p.jecDisplayWords};
      jecMergeMap        = {...p.jecMergeMap};
      jecPoisonedNorms   = new Set(p.jecPoisonedNorms || []);
      jecPoisons         = [...(p.jecPoisons || [])];
      jecSignatures      = [...(p.jecSignatures || [])];
      mpUnlockSync();
      jecStartSifting();
    }

    // JEC_MERGE — Client applies Host merge and re-renders sifting view
    if (env.type === 'SYNC' && env.payload.action === 'JEC_MERGE') {
      const p          = env.payload;
      jecWordFrequency = {...p.jecWordFrequency};
      jecDisplayWords  = {...p.jecDisplayWords};
      jecMergeMap      = {...p.jecMergeMap};
      jecPoisonedNorms = new Set(p.jecPoisonedNorms || []);
      jecRenderSifting();
    }

    // JEC_TALLY — Client applies scores and renders tally screen
    if (env.type === 'SYNC' && env.payload.action === 'JEC_TALLY') {
      jecRound    = env.payload.round;
      jecRounds   = env.payload.rounds;
      jecScores   = [...env.payload.scores];
      jecRoundLog = env.payload.roundLog;
      jecRenderTally(env.payload.roundScores);
      showScreen('screen-jec-tally');
    }

    // JEC_NEXT_ROUND — deprecated no-op. The Host's tally-next now drives clients
    // purely via JEC_ORDER (broadcast from jecStartRound). Running jecStartRound()
    // here popped the client's own word pool and flashed a wrong order word before
    // JEC_ORDER landed. Kept as a no-op in case a stale packet is re-delivered. (J4)
    if (env.type === 'SYNC' && env.payload.action === 'JEC_NEXT_ROUND') {
      /* intentionally empty — JEC_ORDER drives the client's next round */
    }

    // JEC_WASHUP — Client shows final washup
    if (env.type === 'SYNC' && env.payload.action === 'JEC_WASHUP') {
      jecScores   = [...env.payload.scores];
      jecRoundLog = env.payload.roundLog;
      jecShowWashup();
    }
  }

  // ── You Get It? ACTION/SYNC ────────────────────────────────────────────────
  if (mpActiveGame === 'ygi') {
    // YGI_ROUND_START — Client shows prompt screen for this situation
    if (env.type === 'SYNC' && env.payload.action === 'YGI_ROUND_START') {
      ygiCurrentPrompt   = env.payload.prompt;
      ygiCurrentRinger   = env.payload.ringer || null;
      ygiRound           = env.payload.round;
      ygiRounds          = env.payload.rounds;
      ygiInputs          = [];
      ygiLineup          = [];
      ygiVotes           = [];
      ygiMpReadyCheck    = Array(ygiPlayerCount).fill(false);
      ygiVoteReadyCheck  = Array(ygiPlayerCount).fill(false);
      document.getElementById('ygi-prompt-round-label').textContent = `Situation ${ygiRound} of ${ygiRounds}`;
      document.getElementById('ygi-prompt-text').textContent        = ygiCurrentPrompt.text;
      showScreen('screen-ygi-prompt');
    }

    // YGI_TAKE_SUBMIT — Host collects takes; when all ready builds lineup and broadcasts SYNC
    if (env.type === 'ACTION' && env.payload.action === 'YGI_TAKE_SUBMIT' &&
        window.syllyMultiplayerMode === 'host') {
      const { playerIdx, number, metric } = env.payload;
      ygiInputs.push({ playerIdx, number, metric });
      ygiMpReadyCheck[playerIdx] = true;

      if (ygiMpReadyCheck.every(Boolean)) {
        // Build lineup and inject ringer
        const lineup = [...ygiInputs]
          .sort((a, b) => a.number - b.number)
          .map(e => ({ number: e.number, metric: e.metric, playerIdx: e.playerIdx, isGhost: false }));
        if (ygiRinger && ygiCurrentRinger) {
          const ghost    = { number: ygiCurrentRinger.number, metric: ygiCurrentRinger.metric, playerIdx: -1, isGhost: true };
          const insertAt = lineup.findIndex(e => e.number > ghost.number);
          if (insertAt === -1) lineup.push(ghost);
          else lineup.splice(insertAt, 0, ghost);
        }
        ygiLineup = lineup;
        mpSendEnvelope({ type: 'SYNC', payload: { action: 'YGI_LINEUP', lineup, round: ygiRound } });
        mpUnlockSync();
        ygiShowReveal();
      }
    }

    // YGI_LINEUP — Client applies lineup and shows reveal screen
    if (env.type === 'SYNC' && env.payload.action === 'YGI_LINEUP') {
      ygiLineup = env.payload.lineup;
      mpUnlockSync();
      // Re-enable input confirm for next round
      document.getElementById('btn-ygi-input-confirm').classList.remove('opacity-50', 'pointer-events-none');
      ygiShowReveal();
    }

    // YGI_VOTE_SUBMIT — Host collects votes; when all ready computes results and broadcasts SYNC
    if (env.type === 'ACTION' && env.payload.action === 'YGI_VOTE_SUBMIT' &&
        window.syllyMultiplayerMode === 'host') {
      const { voterIdx, rankings } = env.payload;
      ygiVotes.push({ voterIdx, rankings });
      ygiVoteReadyCheck[voterIdx] = true;

      if (ygiVoteReadyCheck.every(Boolean)) {
        // Compute results on Host then broadcast full payload
        const VOTE_PTS  = [3, 2, 1];
        const roundPts  = Array(ygiLineup.length).fill(0);
        ygiVotes.forEach(vote => {
          vote.rankings.forEach((lineupIdx, rank) => {
            if (rank < VOTE_PTS.length) roundPts[lineupIdx] += VOTE_PTS[rank];
          });
        });
        const ghostIdx     = ygiLineup.findIndex(e => e.isGhost);
        let   ghostWins    = false;
        if (ghostIdx !== -1) {
          const ghostFirst    = ygiVotes.filter(v => v.rankings[0] === ghostIdx).length;
          const maxHumanFirst = Math.max(...ygiLineup.map((e, i) => e.isGhost ? 0 : ygiVotes.filter(v => v.rankings[0] === i).length));
          ghostWins = ghostFirst > maxHumanFirst;
          if (ghostWins) for (let i = 0; i < ygiPlayerCount; i++) ygiScores[i] -= 2;
        }
        const maxRoundPts = Math.max(...ygiLineup.map((e, i) => e.isGhost ? -Infinity : roundPts[i]));
        ygiLineup.forEach((entry, idx) => {
          if (!entry.isGhost) {
            ygiScores[entry.playerIdx] += roundPts[idx];
            if (roundPts[idx] === maxRoundPts && maxRoundPts > 0) ygiScores[entry.playerIdx] += 2;
          }
        });
        // ygiShowResults() owns the round-log push (single source of truth) — call it
        // first so the SYNC carries the freshly-pushed, well-formed entry (Y3).
        ygiShowResults(roundPts, ghostIdx, ghostWins, maxRoundPts);
        mpSendEnvelope({ type: 'SYNC', payload: {
          action: 'YGI_VERDICT',
          roundPts, ghostIdx, ghostWins, maxRoundPts,
          scores: [...ygiScores], roundLog: ygiRoundLog,
        }});
        mpUnlockSync();
      }
    }

    // YGI_VERDICT — Client applies scores and shows results screen
    if (env.type === 'SYNC' && env.payload.action === 'YGI_VERDICT') {
      const p       = env.payload;
      ygiScores     = [...p.scores];
      mpUnlockSync();
      // Re-enable vote submit for next round
      document.getElementById('btn-ygi-vote-submit').classList.remove('opacity-50', 'pointer-events-none');
      // ygiShowResults() pushes a local entry; overwrite afterwards with the host's
      // authoritative log so the client never double-counts (Y3).
      ygiShowResults(p.roundPts, p.ghostIdx, p.ghostWins, p.maxRoundPts);
      ygiRoundLog   = p.roundLog;
    }

    // YGI_SUDDEN_DEATH — clients enter the host-driven sudden death (Solo Take tie-break)
    if (env.type === 'SYNC' && env.payload.action === 'YGI_SUDDEN_DEATH') {
      ygiSuddenDeathPlayers  = [...env.payload.tiedPlayers];
      ygiSuddenDeathQ        = env.payload.question;
      ygiSuddenDeathInputs   = [];
      ygiSuddenDeathInputIdx = 0;
      ygiRenderSDIntro();
    }

    // YGI_SD_SUBMIT — Host collects one finalist's answer; resolves when all are in
    if (env.type === 'ACTION' && env.payload.action === 'YGI_SD_SUBMIT' &&
        window.syllyMultiplayerMode === 'host') {
      ygiMpCollectSD(env.payload.playerIdx, env.payload.number);
    }

    // YGI_GAMEOVER — clients show the final standings (host is authoritative on winners)
    if (env.type === 'SYNC' && env.payload.action === 'YGI_GAMEOVER') {
      ygiScores = [...env.payload.scores];
      if (env.payload.afterSD && env.payload.sdInputs) {
        ygiSuddenDeathInputs = env.payload.sdInputs.map(e => ({ ...e }));
      }
      ygiShowFinalStandings(env.payload.winners, !!env.payload.afterSD);
    }
  }

  // ── Natural Selection ACTION/SYNC ──────────────────────────────────────────
  if (mpActiveGame === 'nat') {
    // NAT_MATCH_START — Client receives specimen + role assignments, waits for first NAT_ACTIVE_PLAYER
    if (env.type === 'SYNC' && env.payload.action === 'NAT_MATCH_START') {
      const p          = env.payload;
      natSpecimen      = p.specimen;
      natAssignedWords = p.assignedWords;
      natMoleIdx       = p.moleIdx;
      natBiologistIdx  = p.biologistIdx;
      natCurrentMatch  = p.match;
      natMatchesSetting = p.matchesSetting;
      natRoundsPerMatch = p.roundsPerMatch;
      natCluesByRound   = [];
      natClueOrders     = [];
      natVotes          = Array(natPlayerCount).fill(-1);
      natConsensusTallies = Array(natPlayerCount).fill(0);
      natCurrentVoteStep  = 0;
      natEvictedIdx       = -1;
      natMoleGuess        = '';
      natLastStandPhase   = 'mole-guess';
      natCurrentMatchRound = 0;
      natMpVoteReadyCheck  = Array(natPlayerCount).fill(false);
      natHabitatFlavourIdx = p.flavourIdx || 0;
      // Habitat Intro (ui-style.md § Round/Night Intro Screen) — no onDone: the client just
      // displays the beat and waits for NAT_ACTIVE_PLAYER SYNC, exactly as before this screen
      // existed, just with something to look at while it waits.
      natShowHabitatIntro();
    }

    // NAT_ACTIVE_PLAYER — All devices update clue order and show observation screen
    if (env.type === 'SYNC' && env.payload.action === 'NAT_ACTIVE_PLAYER') {
      const p          = env.payload;
      natClueOrder     = p.clueOrder;
      natCurrentClueStep = p.clueStep;
      natCurrentMatchRound = p.day;
      // Ensure cluesByRound arrays exist for this day
      if (!natCluesByRound[natCurrentMatchRound]) {
        natCluesByRound[natCurrentMatchRound] = Array(natPlayerCount).fill('');
      }
      natWordsByDay[natCurrentMatchRound] = Array.from(
        { length: natPlayerCount }, (_, i) => natGetWordForPlayer(i)
      );
      mpUnlockSync();
      natShowObservation();
    }

    // NAT_OBSERVATION — Host receives clue from Client, advances
    if (env.type === 'ACTION' && env.payload.action === 'NAT_OBSERVATION' &&
        window.syllyMultiplayerMode === 'host') {
      const { playerIdx, clue, day, step } = env.payload;
      if (!natCluesByRound[day]) natCluesByRound[day] = Array(natPlayerCount).fill('');
      natCluesByRound[day][playerIdx] = clue;
      natCurrentClueStep = step + 1;
      mpUnlockSync();

      if (natCurrentClueStep >= natPlayerCount) {
        if (natSyllyMode) {
          mpSendEnvelope({ type: 'SYNC', payload: {
            action:        'NAT_DAY_END',
            cluesByRound:  natCluesByRound,
            day,
            isSyllyReview: true,
          }});
          natShowDailyReview();
        } else if (natCurrentMatchRound < natRoundsPerMatch - 1) {
          natCurrentMatchRound++;
          natCurrentClueStep = 0;
          natStartClueRound();
        } else {
          natMpBroadcastSelection();
          natShowSelection();
        }
      } else {
        natShowHandover(natClueOrder[natCurrentClueStep]);
      }
    }

    // NAT_DAY_END (Sylly Mode) — All devices show daily review
    if (env.type === 'SYNC' && env.payload.action === 'NAT_DAY_END') {
      natCluesByRound  = env.payload.cluesByRound;
      natCurrentMatchRound = env.payload.day;
      natShowDailyReview();
    }

    // NAT_SELECTION — Client receives all clue data and shows selection screen
    if (env.type === 'SYNC' && env.payload.action === 'NAT_SELECTION') {
      natCluesByRound = env.payload.cluesByRound;
      natWordsByDay   = env.payload.wordsByDay;
      natClueStatuses = (env.payload.clueStatuses || []).map(row => [...row]);
      natMoleIdx      = env.payload.moleIdx;
      natBiologistIdx = env.payload.biologistIdx;
      natMpVoteReadyCheck = Array(natPlayerCount).fill(false);
      natShowSelection();
    }

    // NAT_DISPUTE — peer-review dispute toggle (host-authoritative; broadcast to all)
    if (env.type === 'ACTION' && env.payload.action === 'NAT_DISPUTE' &&
        window.syllyMultiplayerMode === 'host') {
      const { playerIdx, dayIdx } = env.payload;
      if (natClueStatuses[playerIdx]) {
        const cycle = { 'normal': 'discredited', 'discredited': 'normal' };
        natClueStatuses[playerIdx][dayIdx] = cycle[natClueStatuses[playerIdx][dayIdx]] || 'normal';
      }
      mpSendEnvelope({ type: 'SYNC', payload: { action: 'NAT_DISPUTE', clueStatuses: natClueStatuses } });
    }
    if (env.type === 'SYNC' && env.payload.action === 'NAT_DISPUTE') {
      natClueStatuses = env.payload.clueStatuses.map(row => [...row]);
      natRenderSelectionScreen();
    }

    // NAT_VOTE_START — clients enter per-device Independent voting with host's adjusted scores
    if (env.type === 'SYNC' && env.payload.action === 'NAT_VOTE_START') {
      natScores           = [...env.payload.scores];
      natSelectionPhase   = 'vote';
      natCurrentVoteStep  = 0;
      natMpVoteReadyCheck = Array(natPlayerCount).fill(false);
      natRenderSelectionScreen();
    }

    // NAT_VOTE — Host receives one device's vote; resolves eviction when all are in
    if (env.type === 'ACTION' && env.payload.action === 'NAT_VOTE' &&
        window.syllyMultiplayerMode === 'host') {
      const { voterIdx, targetIdx } = env.payload;
      natVotes[voterIdx] = targetIdx;
      natMpVoteReadyCheck[voterIdx] = true;
      if (natMpVoteReadyCheck.every(Boolean)) {
        natResolveEviction(); // sets natEvictedIdx, then natShowLastStand broadcasts NAT_LAST_STAND
      }
    }

    // NAT_LAST_STAND — clients enter the Last Stand with the host's eviction result
    if (env.type === 'SYNC' && env.payload.action === 'NAT_LAST_STAND') {
      natEvictedIdx     = env.payload.evictedIdx;
      natVotes          = [...env.payload.votes];
      natScores         = [...env.payload.scores];
      natLastStandPhase = 'mole-guess';
      natRenderLastStand();
      showScreen('screen-nat-last-stand');
    }

    // NAT_MOLE_GUESS — Host receives the Mole's final guess; advances all to the verdict phase
    if (env.type === 'ACTION' && env.payload.action === 'NAT_MOLE_GUESS' &&
        window.syllyMultiplayerMode === 'host') {
      natMoleGuess      = env.payload.guess;
      natLastStandPhase = 'biologist-verdict';
      mpSendEnvelope({ type: 'SYNC', payload: { action: 'NAT_BIO_PHASE', moleGuess: natMoleGuess } });
      natRenderLastStand();
    }

    // NAT_BIO_PHASE — clients move to the Biologist verdict sub-phase
    if (env.type === 'SYNC' && env.payload.action === 'NAT_BIO_PHASE') {
      natMoleGuess      = env.payload.moleGuess;
      natLastStandPhase = 'biologist-verdict';
      natRenderLastStand();
    }

    // NAT_BIO_VERDICT — Host receives the verdict; resolves the round + broadcasts NAT_TALLY
    if (env.type === 'ACTION' && env.payload.action === 'NAT_BIO_VERDICT' &&
        window.syllyMultiplayerMode === 'host') {
      natHostResolveVerdict(env.payload.confirmed);
    }

    // NAT_TALLY — Client applies results and shows tally screen
    if (env.type === 'SYNC' && env.payload.action === 'NAT_TALLY') {
      natRoundLog = env.payload.roundLog;
      natScores   = [...env.payload.scores];
      natMoleIdx  = env.payload.moleIdx;
      natShowTally();
    }

    // NAT_GAMEOVER — Client shows the final report
    if (env.type === 'SYNC' && env.payload.action === 'NAT_GAMEOVER') {
      natScores   = [...env.payload.scores];
      natRoundLog = env.payload.roundLog;
      natMoleIdx  = env.payload.moleIdx;
      natShowGameover();
    }
  }

  // ── Like I'm Five ACTION/SYNC ──────────────────────────────────────────────
  if (mpActiveGame === 'li5') {
    // LI5_ROUND_START — Client receives word + nono list.
    // isClientTurn: true = it's our team describing; show word-card mode (L2).
    // isClientTurn: false = opposing team describing; show tattletale mode (default).
    if (env.type === 'SYNC' && env.payload.action === 'LI5_ROUND_START') {
      const word         = env.payload.word;
      const nonoList     = env.payload.nonoList || [];
      const isClientTurn = !!env.payload.isClientTurn;

      document.getElementById('li5-monitor-word').textContent = word;
      const labelEl   = document.getElementById('li5-monitor-describing-label');
      const nonoSec   = document.getElementById('li5-monitor-nono-section');
      const catchSec  = document.getElementById('li5-monitor-catch-section');

      if (isClientTurn) {
        // L2: Our team is describing — show the word prominently, hide nono/catch
        if (labelEl)  labelEl.textContent       = "You're describing!";
        if (nonoSec)  nonoSec.style.display     = 'none';
        if (catchSec) catchSec.style.display    = 'none';
      } else {
        // Opposing team is describing — show full tattletale sheet (default)
        if (labelEl)  labelEl.textContent       = "They're describing";
        if (nonoSec)  nonoSec.style.display     = 'block';
        if (catchSec) catchSec.style.display    = 'block';
        // L3: Render nono words as tappable buttons (tap = CATCH! that word)
        const ul = document.getElementById('li5-monitor-nono-list');
        ul.innerHTML = nonoList.map(w =>
          `<button data-word="${w}" class="li5-nono-word-btn w-full bg-pink-50 rounded-xl px-3 py-2 text-stone-800 font-semibold text-sm text-center active:scale-95 transition-all duration-100">${w}</button>`
        ).join('');
      }
      showScreen('screen-li5-monitor');
    }

    // LI5_CATCH — Host receives alert from opposing team; pulses word card + highlights caught word
    if (env.type === 'ACTION' && env.payload.action === 'LI5_CATCH' &&
        window.syllyMultiplayerMode === 'host') {
      playBoing();
      const card = document.getElementById('active-word-card');
      if (card) {
        card.classList.remove('shake');
        void card.offsetWidth;
        card.classList.add('shake');
      }
      // L3: Highlight the caught word in the active taboo list on host
      const caughtWord = env.payload.word;
      if (caughtWord) {
        document.querySelectorAll('#active-taboo-list li').forEach(li => {
          if (li.textContent.trim() === caughtWord) {
            li.classList.add('bg-pink-200', 'text-pink-800', 'font-bold');
          }
        });
      }
    }
  }

  // ── Deep-Sea Deploy ACTION/SYNC ────────────────────────────────────────────
  if (mpActiveGame === 'dsd') {
    // DSD_CREW_ACTIVE — Standby device shows spectator (TLM) or standby crew view (MDLM) with ping info
    if (env.type === 'SYNC' && env.payload.action === 'DSD_CREW_ACTIVE') {
      dsdPingClue    = env.payload.word;
      dsdPingNumber  = env.payload.num;
      dsdCurrentTeam = env.payload.team;
      if (window.mpLobbyStyle === 'team') {
        // Active team's device already navigated locally in dsdTransmitPing(); skip to avoid overwrite
        if (dsdCurrentTeam === mpMyPlayerIdx) return;
        dsdShowSpectatorView();
      } else {
        dsdShowCrewStandby(`${env.payload.word.toUpperCase()} — ${env.payload.num}`);
      }
    }

    // DSD_CAPTAIN_ACTIVE — Client navigates to captain (or spectator) when host advances the turn
    if (env.type === 'SYNC' && env.payload.action === 'DSD_CAPTAIN_ACTIVE') {
      dsdCurrentTeam = env.payload.team;
      dsdDeployment  = env.payload.deployment;
      if (env.payload.grid) dsdGrid = env.payload.grid.map(c => ({ ...c }));
      dsdShowCaptain(); // client routes to pass gate (active team) or spectator (non-active)
    }

    // DSD_PING_TRANSMIT — Host receives Client captain's ping; records state; broadcasts crew-active
    if (env.type === 'ACTION' && env.payload.action === 'DSD_PING_TRANSMIT' &&
        window.syllyMultiplayerMode === 'host') {
      dsdPingClue   = env.payload.word;
      dsdPingNumber = env.payload.num;
      dsdCurrentTeam = env.payload.team;
      dsdSequence    = [];
      // Broadcast to standby (Host device — Team 0) so it shows standby crew view
      mpSendEnvelope({ type: 'SYNC', payload: {
        action: 'DSD_CREW_ACTIVE', word: env.payload.word, num: env.payload.num,
        team: dsdCurrentTeam,
      }});
      mpUnlockSync();
      // Host shows spectator (TLM) or standby (MDLM); Client already shows crew screen
      dsdMpStandby = true;
      if (window.mpLobbyStyle === 'team') {
        dsdShowSpectatorView();
      } else {
        dsdShowCrewStandby(`${dsdPingClue.toUpperCase()} — ${dsdPingNumber}`);
      }
    }

    // DSD_SEQUENCE_SUBMIT — Host receives Client crew's sequence; executes
    if (env.type === 'ACTION' && env.payload.action === 'DSD_SEQUENCE_SUBMIT' &&
        window.syllyMultiplayerMode === 'host') {
      dsdSequence    = env.payload.sequence || [];
      dsdCurrentTeam = env.payload.team;
      dsdMpStandby   = false;
      mpUnlockSync();
      dsdShowExecution(); // Host executes; broadcasts DSD_EXECUTION_RESULT when done
    }

    // DSD_EXECUTION_RESULT — Client applies updated grid and scores, shows execution summary
    if (env.type === 'SYNC' && env.payload.action === 'DSD_EXECUTION_RESULT') {
      dsdGrid   = env.payload.grid.map(c => ({ ...c }));
      dsdValour = [...env.payload.valour];
      dsdTurnOutcomes = env.payload.outcomes || [];
      if (env.payload.turnLog) dsdTurnLog = env.payload.turnLog;
      mpUnlockSync();
      if (dsdMpStandby && window.mpLobbyStyle === 'team') {
        // TLM spectator: update grid + history in place
        dsdRenderSpectatorGrid();
        dsdRenderSpectatorHistory();
      } else {
        // Client already showed their execution screen locally; just update the grid view
        dsdRenderExecutionGrid();
        dsdUpdateValourDisplay();
      }
    }

    // DSD_GAMEOVER — Client shows gameover screen
    if (env.type === 'SYNC' && env.payload.action === 'DSD_GAMEOVER') {
      dsdValour  = [...env.payload.valour];
      dsdGrid    = env.payload.grid.map(c => ({ ...c }));
      dsdTurnLog = env.payload.turnLog;
      dsdShowGameover();
    }
  }

  // ── Bailed ACTION/SYNC ────────────────────────────────────────────────────
  if (mpActiveGame === 'bld') {
    if (typeof bldHandleEnvelope === 'function') bldHandleEnvelope(env);
  }

  // ── Group Therapy ACTION/SYNC ─────────────────────────────────────────────
  if (mpActiveGame === 'gth') {
    if (typeof gthHandleEnvelope === 'function') gthHandleEnvelope(env);
  }

  // ── The Bluff (dyb) ACTION/SYNC ───────────────────────────────────────────
  if (mpActiveGame === 'dyb') {
    if (typeof dybHandleEnvelope === 'function') dybHandleEnvelope(env);
  }

  // ── Pass ACTION/SYNC ──────────────────────────────────────────────────────
  if (mpActiveGame === 'pass') {
    if (typeof passHandleEnvelope === 'function') passHandleEnvelope(env);
  }

  // ── Net-Trace ACTION/SYNC ─────────────────────────────────────────────────
  if (mpActiveGame === 'nt') {
    if (typeof ntHandleEnvelope === 'function') ntHandleEnvelope(env);
  }

  // ── Fruit Salad ACTION/SYNC ───────────────────────────────────────────────
  if (mpActiveGame === 'frt') {
    if (typeof frtHandleEnvelope === 'function') frtHandleEnvelope(env);
  }

  // ── Counting Sheep ACTION/SYNC ────────────────────────────────────────────
  if (mpActiveGame === 'shp') {
    if (typeof shpHandleEnvelope === 'function') shpHandleEnvelope(env);
  }

  // ── Flawless ACTION/SYNC/private ──────────────────────────────────────────
  if (mpActiveGame === 'flw') {
    if (typeof flwHandleEnvelope === 'function') flwHandleEnvelope(env);
  }

  // ── Pecking Order ACTION/SYNC/private ─────────────────────────────────────
  if (mpActiveGame === 'pko') {
    if (typeof pkoHandleEnvelope === 'function') pkoHandleEnvelope(env);
  }

  // ── Cookie Jar ACTION/SYNC/private ────────────────────────────────────────
  if (mpActiveGame === 'cjar') {
    if (typeof cjarHandleEnvelope === 'function') cjarHandleEnvelope(env);
  }

  // ── Secret Signals ACTION/SYNC ─────────────────────────────────────────────
  if (mpActiveGame === 'ss') {
    // SS_VAULT_DATA — every device receives BOTH vaults; renders only its own team's gate
    if (env.type === 'SYNC' && env.payload.action === 'SS_VAULT_DATA') {
      ssVaultA = env.payload.vaultA.map(w => ({ word: w.word, id: w.id, category: w.category }));
      ssVaultB = env.payload.vaultB.map(w => ({ word: w.word, id: w.id, category: w.category }));
      ssShowVaultGate(ssMyTeam());
    }

    // SS_VAULT_READY — Host marks a device's vault confirmation; starts when ALL devices ready
    if (env.type === 'ACTION' && env.payload.action === 'SS_VAULT_READY' &&
        window.syllyMultiplayerMode === 'host') {
      ssMpVaultReady[env.payload.deviceIdx] = true;
      if (ssMpVaultReady.every(Boolean)) {
        ssEncryptingTeam = 0;
        ssStartHalf(); // host generates the code, broadcasts SS_ENCRYPT_TURN, routes itself
      }
    }

    // SS_ENCRYPT_TURN — every device receives the new half; routes to transmit/standby.
    // The code travels to all devices but only the broadcaster's screen reveals it.
    if (env.type === 'SYNC' && env.payload.action === 'SS_ENCRYPT_TURN') {
      ssEncryptingTeam   = env.payload.encryptingTeam;
      ssRound            = env.payload.round ?? ssRound;
      ssCurrentCode      = [...env.payload.code];
      ssCurrentClues     = ['', '', ''];
      ssInterceptGuess   = [0, 0, 0];
      ssDecodeGuess      = [0, 0, 0];
      ssTokens           = [...env.payload.tokens];
      ssMisfires         = [...env.payload.misfires];
      ssRouteEncryptPhase();
    }

    // SS_BROADCAST — Intercepting device receives clues and shows intercept screen
    if (env.type === 'SYNC' && env.payload.action === 'SS_BROADCAST') {
      ssCurrentClues   = [...env.payload.clues];
      ssEncryptingTeam = env.payload.encryptingTeam;
      ssRound          = env.payload.round;
      ssRouteGuessPhase(); // each device → decode / intercept / standby
    }

    // SS_ENCODE_TRANSMIT — Host receives the client broadcaster's clues; emits SS_BROADCAST to all
    if (env.type === 'ACTION' && env.payload.action === 'SS_ENCODE_TRANSMIT' &&
        window.syllyMultiplayerMode === 'host') {
      ssCurrentClues   = [...env.payload.clues];
      ssEncryptingTeam = env.payload.team;
      ssRound          = env.payload.round;
      // (host already holds the authoritative code from ssStartHalf)
      ssEmitBroadcast();
    }

    // SS_INTERCEPT_SUBMIT — Host records the intercepting guesser's code; resolves when both in
    if (env.type === 'ACTION' && env.payload.action === 'SS_INTERCEPT_SUBMIT' &&
        window.syllyMultiplayerMode === 'host') {
      ssInterceptGuess   = [...env.payload.guess];
      ssMpInterceptReady = true;
      ssHostMaybeResolve();
    }

    // SS_DECODE_SUBMIT — Host records the decoding guesser's code; resolves when both in
    if (env.type === 'ACTION' && env.payload.action === 'SS_DECODE_SUBMIT' &&
        window.syllyMultiplayerMode === 'host') {
      ssDecodeGuess   = [...env.payload.guess];
      ssMpDecodeReady = true;
      ssHostMaybeResolve();
    }

    // SS_RESOLUTION — Client applies the authoritative payload and RENDERS only (no re-resolve).
    // (Fixes S9: the old handler re-ran ssResolve(), double-pushing round history + re-scoring.)
    if (env.type === 'SYNC' && env.payload.action === 'SS_RESOLUTION') {
      const p        = env.payload;
      ssTokens       = [...p.tokens];
      ssMisfires     = [...p.misfires];
      ssClueHistoryA = p.clueHistoryA.map(h => [...h]);
      ssClueHistoryB = p.clueHistoryB.map(h => [...h]);
      ssRoundHistory = p.roundHistory;
      ssInterceptGuess = [...p.result.interceptGuess];
      ssDecodeGuess    = [...p.result.decodeGuess];
      ssCurrentCode    = [...p.result.code];
      ssCurrentClues   = [...p.result.clues];
      ssEncryptingTeam = p.result.encryptingTeam;
      mpUnlockSync();
      ssRenderResolution();
    }

    // SS_ENDGAME — Client shows endgame splash
    if (env.type === 'SYNC' && env.payload.action === 'SS_ENDGAME') {
      ssTokens   = [...env.payload.tokens];
      ssMisfires = [...env.payload.misfires];
      ssShowEndgameSplash(env.payload.winner);
    }

    // SS_INTEL_SYNC — Sylly Mode Intel Phase: every device applies the host's
    // authoritative intel snapshot and routes to the right screen (active guesser
    // vs board). Phases: tiebreak / intro / keyword / summary / gameover.
    if (env.type === 'SYNC' && env.payload.action === 'SS_INTEL_SYNC') {
      ssApplyIntelSnapshot(env.payload);
    }

    // SS_INTEL_GUESS — Host applies the active guesser's committed keyword outcome,
    // then advances + broadcasts the next intel phase.
    if (env.type === 'ACTION' && env.payload.action === 'SS_INTEL_GUESS' &&
        window.syllyMultiplayerMode === 'host') {
      ssIntelHostResolve(env.payload.outcome);
    }
  }

  // ── Late to the Party ACTION/SYNC ──────────────────────────────────────────
  if (mpActiveGame === 'lttp') {
    // LTTP_GAME_START — Client receives world state; shows their own role reveal
    if (env.type === 'SYNC' && env.payload.action === 'LTTP_GAME_START') {
      const p           = env.payload;
      lttpStrayIdx      = p.strayIdx;
      lttpJokerIdx      = p.jokerIdx;
      lttpAddressIdx    = p.addressIdx;
      lttpGridLocations = [...(p.gridLocations || [])];
      lttpHighlights    = new Set(p.highlights);
      lttpDecoys        = [...(p.decoys || [])];
      lttpFakeTargets   = [...(p.fakeTargets || [])];
      lttpActiveIdx     = p.firstActiveIdx;
      lttpPlan          = p.plan;
      lttpPlayerNames   = [...(p.playerNames || [])];
      lttpPlayerCount   = p.playerCount;
      for (let i = 0; i < lttpPlayerCount; i++) lttpSuspicionMap[i] = 'none';
      lttpShowBriefing(p.firstActiveIdx);
    }

    // LTTP_TURN_ADVANCE — All devices advance to next active player
    if (env.type === 'SYNC' && env.payload.action === 'LTTP_TURN_ADVANCE') {
      lttpActiveIdx   = env.payload.activeIdx;
      lttpPlan        = env.payload.plan;
      lttpHistory     = env.payload.history || lttpHistory;
      lttpLapAnswered = new Set(env.payload.lapAnswered || []);
      lttpShowChat(lttpActiveIdx);
    }

    // LTTP_MESSAGE_INTERRUPT — All devices show the interrupt overlay
    if (env.type === 'SYNC' && env.payload.action === 'LTTP_MESSAGE_INTERRUPT') {
      const p = env.payload;
      lttpActiveIdx = p.targetIdx; // turn has advanced to the target
      document.getElementById('mp-lttp-interrupt-heading').textContent =
        `${p.fromName} → ${p.toName}`;
      document.getElementById('mp-lttp-interrupt-body').textContent =
        p.messageText ? `"${p.messageText}"` : '';
      document.getElementById('mp-lttp-message-interrupt-overlay').style.display = 'flex';
    }

    // LTTP_MESSAGE_SEND — Host receives a Client's message; processes it authoritatively
    // (pushes history, broadcasts the interrupt, then drives turn advance / plan update / guess phase)
    if (env.type === 'ACTION' && env.payload.action === 'LTTP_MESSAGE_SEND' &&
        window.syllyMultiplayerMode === 'host') {
      const p = env.payload;
      mpUnlockSync();
      lttpHostProcessMessage(p.askerIdx, p.targetIdx, p.messageText);
    }

    // LTTP_PLAN_UPDATE — clients apply the host's narrowing + plan advance (no local narrowing)
    if (env.type === 'SYNC' && env.payload.action === 'LTTP_PLAN_UPDATE') {
      const p = env.payload;
      lttpPlan        = p.plan;
      lttpHighlights  = new Set(p.highlights);
      lttpFadedCells  = new Set(p.fadedCells);
      lttpDecoys      = [...(p.decoys || [])];
      lttpActiveIdx   = p.activeIdx;
      lttpLapAnswered = new Set(p.lapAnswered);
      lttpHistory     = p.history || lttpHistory;
      lttpPlanLog     = p.planLog || lttpPlanLog;
      lttpShowPlanUpdate(p.activeIdx);
    }

    // LTTP_GUESS_PHASE — clients enter the Plan-4 guess phase (each device guesses for its own player)
    if (env.type === 'SYNC' && env.payload.action === 'LTTP_GUESS_PHASE') {
      lttpShowGuessForDevice();
    }

    // LTTP_PIN_SUBMIT — Host receives the Stray's pin
    if (env.type === 'ACTION' && env.payload.action === 'LTTP_PIN_SUBMIT' &&
        window.syllyMultiplayerMode === 'host') {
      lttpHostCollectGuess(lttpStrayIdx, env.payload.pin, null);
    }

    // LTTP_VOTE_SUBMIT — Host receives a non-Stray player's suspect vote
    if (env.type === 'ACTION' && env.payload.action === 'LTTP_VOTE_SUBMIT' &&
        window.syllyMultiplayerMode === 'host') {
      lttpHostCollectGuess(env.payload.voterIdx, null, env.payload.suspectIdx);
    }

    // LTTP_GAMEOVER — clients apply the host's result and show the final screen
    if (env.type === 'SYNC' && env.payload.action === 'LTTP_GAMEOVER') {
      const p = env.payload;
      lttpStrayPin   = p.strayPin;
      lttpVotes      = p.votes || {};
      lttpHighlights = new Set(p.highlights || []);
      lttpPlanLog.push({ plan: 4, highlights: [...lttpHighlights] });
      lttpPlanLogIdx = 0;
      lttpShowGameover(p.winner, p.winReason);
    }
  }
}

// ── Host lobby: render player list + enable CTA ───────────────────────────────
function mpRenderHostPlayerList() {
  const list    = document.getElementById('mp-lobby-players-list');
  const waiting = document.getElementById('mp-lobby-host-waiting');
  list.innerHTML = '';

  const nameCounts = {};
  mpPlayerSlots.forEach(p => { nameCounts[p.nickname] = (nameCounts[p.nickname] || 0) + 1; });

  mpPlayerSlots.forEach((p, i) => {
    const chip = document.createElement('div');
    chip.className = 'flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm border border-stone-100';
    const dupeWarning = nameCounts[p.nickname] > 1
      ? `<span class="text-xs text-red-500 font-semibold ml-1">⚠️ Duplicate name</span>`
      : '';
    chip.innerHTML =
      `<span class="text-stone-400 text-xs font-bold w-10 flex-shrink-0">${i === 0 ? 'HOST' : `P${i + 1}`}</span>` +
      `<span class="text-stone-800 font-semibold text-sm">${p.nickname}${dupeWarning}</span>`;
    list.appendChild(chip);
  });

  waiting.style.display = mpPlayerSlots.length <= 1 ? 'block' : 'none';

  const maxP = mpActiveGameConfig?.getMaxPlayers?.() ?? 99;
  const cap  = document.getElementById('mp-lobby-capacity-display');
  if (cap) cap.textContent = `${mpPlayerSlots.length} / ${maxP} joined`;

  const cta   = document.getElementById('btn-mp-lobby-host-cta');
  const minP  = mpActiveGameConfig?.getMinPlayers?.() ?? 2;
  const enough = mpPlayerSlots.length >= minP;
  // A game whose two teams must be the same size can never split an odd roster — block the
  // CTA on the count itself rather than letting the host reach the roster screen and stall there.
  const oddBlocked = mpRosterNeedsBalance() && mpPlayerSlots.length % 2 === 1;
  const ready = enough && !oddBlocked;

  // Hint: tell the host why the CTA is locked
  const hint = document.getElementById('mp-lobby-min-hint');
  if (hint) {
    if (!enough) {
      const need = minP - mpPlayerSlots.length;
      hint.textContent = `Need ${need} more ${need === 1 ? 'player' : 'players'} to start (min ${minP})`;
      hint.style.display = 'block';
    } else if (oddBlocked) {
      hint.textContent = 'Teams must be even — one more player, or one fewer.';
      hint.style.display = 'block';
    } else {
      hint.style.display = 'none';
    }
  }

  cta.disabled = !ready;
  cta.classList.toggle('opacity-50',          !ready);
  cta.classList.toggle('pointer-events-none', !ready);
  // CTA label: "Assign Spots →" when roster screen is needed; game label otherwise
  const rosterType = mpGetRosterType();
  cta.textContent = (ready && rosterType !== 'none') ? 'Assign Spots →' : (mpActiveGameConfig?.lobbyCtaLabel || 'Start') + ' →';
}

// ── Roster helpers ────────────────────────────────────────────────────────────
function mpUpdatePrelobbyDeviceLabels(defaults) {
  const valA = document.getElementById('mp-prelobby-team-a').value.trim() || defaults[0];
  const valB = document.getElementById('mp-prelobby-team-b').value.trim() || defaults[1];
  document.getElementById('mp-prelobby-this-team').textContent  = valA;
  document.getElementById('mp-prelobby-other-team').textContent = valB;
}

function mpGetRosterType() {
  const t = mpActiveGameConfig?.rosterConfig?.type;
  if (!t) return 'none';
  return typeof t === 'function' ? t(window.mpLobbyStyle) : t;
}

function mpShowRosterScreen() {
  const rosterType = mpGetRosterType();
  if (rosterType === 'none') { mpConfirmRoster(); return; }
  mpRosterPendingTeamIdx = mpPlayerSlots.map(() => -1); // -1 = unassigned
  mpRosterPendingCaptain = [-1, -1];
  mpRosterSelectedChip   = null;
  mpBuildRosterUI(rosterType);
  showScreen('screen-mp-roster');
}

function mpRosterPlaceChipInZone(uid, teamIdx, dropZone, rc, rosterType) {
  const selIdx = mpPlayerSlots.findIndex(p => p.uid === uid);
  // Remove from previous team zone if applicable
  const prevTeam = mpRosterPendingTeamIdx[selIdx];
  if (prevTeam >= 0) {
    const prevZone = document.getElementById(`mp-roster-team-zone-${prevTeam}`);
    const prevRow = prevZone?.querySelector(`[data-chip-uid="${uid}"]`);
    if (prevRow) prevRow.remove();
    // If was captain, clear captain slot for that team
    if (mpRosterPendingCaptain[prevTeam] === selIdx) mpRosterPendingCaptain[prevTeam] = -1;
  }
  mpRosterPendingTeamIdx[selIdx] = teamIdx;
  // Dim chip in pool (stays visible but greyed — tap to pick up again)
  const poolChip = document.getElementById(`mp-roster-chip-${uid}`);
  if (poolChip) poolChip.style.display = 'none';
  // Render entry into zone
  const teamEntry = document.createElement('div');
  teamEntry.className = 'flex items-center justify-between gap-1 bg-white rounded-lg px-2 py-1 cursor-pointer';
  teamEntry.dataset.chipUid = uid;
  teamEntry.innerHTML = `<span class="text-stone-800 text-sm font-semibold truncate flex-1 pointer-events-none">${mpPlayerSlots[selIdx].nickname}</span>`;
  // Tap entry to pick it back up
  teamEntry.addEventListener('click', e => {
    if (e.target.classList.contains('mp-roster-cap-btn')) return; // captain button handled separately
    // Pick up: remove entry, restore chip to pool, clear assignment
    const pickTeam = mpRosterPendingTeamIdx[selIdx];
    teamEntry.remove();
    const chip = document.getElementById(`mp-roster-chip-${uid}`);
    if (chip) { chip.style.display = ''; chip.classList.add('ring-2', 'ring-stone-800'); }
    if (mpRcHasCaptain(rc) && mpRosterPendingCaptain[pickTeam] === selIdx) {
      mpRosterPendingCaptain[pickTeam] = -1;
    }
    mpRosterPendingTeamIdx[selIdx] = -1;
    mpRosterSelectedChip = uid;
    mpRosterHighlightTargets('teams');
    mpRosterCheckConfirm(rosterType);
  });
  if (mpRcHasCaptain(rc)) {
    const capBtn = document.createElement('button');
    capBtn.className = 'shrink-0 text-base px-1 rounded transition-all duration-150 mp-roster-cap-btn';
    capBtn.dataset.slotIdx = selIdx;
    capBtn.dataset.team = teamIdx;
    capBtn.textContent = rc.captainIcon || '⚓';
    capBtn.title = 'Set as Captain';
    // Colour-emoji glyphs (⚓/⚡) ignore CSS `color`, so a captain highlighted only via
    // text-cyan vs text-stone is indistinguishable — every marker looks identical. Show
    // captain-state via opacity + a background pill instead (both DO affect emoji).
    const setCapState = (btn, active) => {
      btn.classList.toggle('opacity-100',      active);
      btn.classList.toggle('bg-emerald-100',   active);
      btn.classList.toggle('ring-1',           active);
      btn.classList.toggle('ring-emerald-400', active);
      btn.classList.toggle('opacity-30',      !active);
    };
    capBtn.addEventListener('click', e => {
      e.stopPropagation();
      mpRosterPendingCaptain[teamIdx] = parseInt(capBtn.dataset.slotIdx);
      document.querySelectorAll(`.mp-roster-cap-btn[data-team="${teamIdx}"]`).forEach(b => {
        setCapState(b, b === capBtn);
      });
      playPillClick();
      mpRosterCheckConfirm(rosterType);
    });
    if (mpRosterPendingCaptain[teamIdx] === -1) {
      mpRosterPendingCaptain[teamIdx] = selIdx;
      setCapState(capBtn, true);
    } else {
      setCapState(capBtn, false);
    }
    teamEntry.appendChild(capBtn);
  }
  dropZone.appendChild(teamEntry);
  mpRosterSelectedChip = null;
  document.querySelectorAll('.mp-roster-chip').forEach(c => c.classList.remove('ring-2','ring-stone-800'));
  mpRosterClearHighlights();
  mpRosterCheckConfirm(rosterType);
}

function mpRosterHighlightTargets(rosterType) {
  if (rosterType === 'individual') {
    document.querySelectorAll('#mp-roster-slots [data-slot]').forEach(el =>
      el.classList.add('mp-roster-target'));
  } else {
    document.querySelectorAll('[data-team]').forEach(el =>
      el.classList.add('mp-roster-target'));
  }
  const pool = document.getElementById('mp-roster-pool');
  if (pool) pool.classList.add('mp-roster-bench-target');
}

function mpRosterClearHighlights() {
  document.querySelectorAll('.mp-roster-target').forEach(el =>
    el.classList.remove('mp-roster-target'));
  const pool = document.getElementById('mp-roster-pool');
  if (pool) pool.classList.remove('mp-roster-bench-target');
}

function mpBuildRosterUI(rosterType) {
  const body = document.getElementById('mp-roster-body');
  body.innerHTML = '';
  const rc = mpActiveGameConfig.rosterConfig;

  if (rosterType === 'individual') {
    // ── Unassigned pool ────────────────────────────────────────────────────
    const poolLabel = document.createElement('p');
    poolLabel.className = 'text-stone-400 text-xs font-semibold uppercase tracking-widest';
    poolLabel.textContent = 'Players';
    body.appendChild(poolLabel);

    const pool = document.createElement('div');
    pool.id = 'mp-roster-pool';
    pool.className = 'flex flex-wrap gap-2 min-h-10';
    body.appendChild(pool);

    // ── Numbered slots ─────────────────────────────────────────────────────
    const slotsLabel = document.createElement('p');
    slotsLabel.className = 'text-stone-400 text-xs font-semibold uppercase tracking-widest mt-2';
    slotsLabel.textContent = 'Slot order';
    body.appendChild(slotsLabel);

    const slotsDiv = document.createElement('div');
    slotsDiv.id = 'mp-roster-slots';
    slotsDiv.className = 'flex flex-col gap-2';

    mpPlayerSlots.forEach((_, i) => {
      const row = document.createElement('div');
      row.className = 'flex items-center gap-3';
      row.innerHTML = `<span class="text-stone-400 text-xs font-bold w-6 flex-shrink-0 text-right">P${i + 1}</span>
        <div id="mp-roster-slot-${i}" class="flex-1 min-h-11 rounded-xl border-2 border-dashed border-stone-200 bg-stone-50 flex items-center px-3 text-stone-400 text-sm transition-colors"
          data-slot="${i}"></div>`;
      slotsDiv.appendChild(row);
    });
    body.appendChild(slotsDiv);

    // Populate chips
    mpPlayerSlots.forEach((p, i) => {
      pool.appendChild(mpMakeChip(p.nickname, p.uid, i));
    });

    // Slot click: assign selected chip, or pick up occupant if nothing selected
    slotsDiv.querySelectorAll('[data-slot]').forEach(slotEl => {
      slotEl.addEventListener('click', () => {
        if (!mpRosterSelectedChip) {
          // Pick up occupant from filled slot
          const filledUid = slotEl.dataset.assignedUid;
          if (!filledUid) return;
          const pickIdx = mpPlayerSlots.findIndex(p => p.uid === filledUid);
          slotEl.textContent = '';
          slotEl.classList.remove('border-stone-700', 'bg-stone-100', 'text-stone-800', 'font-semibold');
          slotEl.classList.add('border-dashed', 'border-stone-200', 'bg-stone-50', 'text-stone-400');
          delete slotEl.dataset.assignedUid;
          const pickChip = document.getElementById(`mp-roster-chip-${filledUid}`);
          if (pickChip) { pickChip.style.display = ''; pickChip.classList.add('ring-2', 'ring-stone-800'); }
          mpRosterPendingTeamIdx[pickIdx] = -1;
          mpRosterSelectedChip = filledUid;
          mpRosterHighlightTargets('individual');
          mpRosterCheckConfirm(rosterType);
          return;
        }
        const slotIdx = parseInt(slotEl.dataset.slot);
        // If slot already filled, return occupant to pool
        const prevUid = slotEl.dataset.assignedUid;
        if (prevUid) {
          const prevPlayerIdx = mpPlayerSlots.findIndex(p => p.uid === prevUid);
          const oldChip = document.getElementById(`mp-roster-chip-${prevUid}`);
          if (oldChip) oldChip.style.display = '';
          mpRosterPendingTeamIdx[prevPlayerIdx] = -1;
        }
        // Assign selected chip to slot
        const selIdx = mpPlayerSlots.findIndex(p => p.uid === mpRosterSelectedChip);
        // Remove from any previous slot
        const prevSlot = document.querySelector(`[data-assigned-uid="${mpRosterSelectedChip}"]`);
        if (prevSlot && prevSlot !== slotEl) {
          prevSlot.textContent = '';
          prevSlot.classList.remove('border-stone-700', 'bg-stone-100', 'text-stone-800', 'font-semibold');
          prevSlot.classList.add('border-dashed', 'border-stone-200', 'bg-stone-50', 'text-stone-400');
          prevSlot.removeAttribute('data-assigned-uid');
        }
        slotEl.textContent = mpPlayerSlots[selIdx].nickname;
        slotEl.classList.remove('border-dashed', 'border-stone-200', 'bg-stone-50', 'text-stone-400');
        slotEl.classList.add('border-stone-700', 'bg-stone-100', 'text-stone-800', 'font-semibold');
        slotEl.dataset.assignedUid = mpRosterSelectedChip;
        mpRosterPendingTeamIdx[selIdx] = slotIdx;
        const chip = document.getElementById(`mp-roster-chip-${mpRosterSelectedChip}`);
        if (chip) chip.style.display = 'none';
        mpRosterSelectedChip = null;
        document.querySelectorAll('.mp-roster-chip').forEach(c => c.classList.remove('ring-2','ring-stone-800'));
        mpRosterClearHighlights();
        mpRosterCheckConfirm(rosterType);
      });
    });

    // Bench tap: deselect selected chip (returns it to pool — already visible from pick-up)
    pool.addEventListener('click', e => {
      if (e.target !== pool) return;
      if (!mpRosterSelectedChip) return;
      document.querySelectorAll('.mp-roster-chip').forEach(c => c.classList.remove('ring-2','ring-stone-800'));
      mpRosterSelectedChip = null;
      mpRosterClearHighlights();
    });

  } else if (rosterType === 'teams') {
    // ── Unassigned pool ────────────────────────────────────────────────────
    const poolLabel = document.createElement('p');
    poolLabel.className = 'text-stone-400 text-xs font-semibold uppercase tracking-widest';
    poolLabel.textContent = 'Unassigned players';
    body.appendChild(poolLabel);

    const pool = document.createElement('div');
    pool.id = 'mp-roster-pool';
    pool.className = 'flex flex-wrap gap-2 min-h-10';
    mpPlayerSlots.forEach((p, i) => pool.appendChild(mpMakeChip(p.nickname, p.uid, i)));
    body.appendChild(pool);

    // ── Two team columns ───────────────────────────────────────────────────
    const teamsRow = document.createElement('div');
    teamsRow.className = 'flex gap-3 mt-2';

    [0, 1].forEach(teamIdx => {
      const col = document.createElement('div');
      col.className = 'flex-1 flex flex-col gap-2';

      const defaultName = window.mpLobbyRosterTeamNames?.[teamIdx]
                        || rc.defaultTeamNames?.[teamIdx]
                        || `Team ${teamIdx + 1}`;
      const nameInput = document.createElement('input');
      nameInput.id = `mp-roster-team-${teamIdx}-input`;
      nameInput.type = 'text';
      nameInput.maxLength = 20;
      nameInput.value = defaultName;
      nameInput.className = 'w-full rounded-xl border-2 border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-800 focus:border-stone-600 focus:outline-none transition-colors';

      const dropZone = document.createElement('div');
      dropZone.id = `mp-roster-team-zone-${teamIdx}`;
      dropZone.className = 'min-h-20 rounded-xl border-2 border-dashed border-stone-200 bg-stone-50 p-2 flex flex-col gap-1';
      dropZone.dataset.team = teamIdx;

      // Tap zone to assign selected chip to this team
      dropZone.addEventListener('click', e => {
        // Ignore clicks on child elements (captain button, entry row) — handled separately
        if (e.target !== dropZone) return;
        if (!mpRosterSelectedChip) return;
        mpRosterPlaceChipInZone(mpRosterSelectedChip, teamIdx, dropZone, rc, rosterType);
      });

      col.appendChild(nameInput);
      col.appendChild(dropZone);
      teamsRow.appendChild(col);
    });

    body.appendChild(teamsRow);

    // Bench tap: deselect selected chip (already visible in pool from pick-up)
    pool.addEventListener('click', e => {
      if (e.target !== pool) return;
      if (!mpRosterSelectedChip) return;
      document.querySelectorAll('.mp-roster-chip').forEach(c => c.classList.remove('ring-2','ring-stone-800'));
      mpRosterSelectedChip = null;
      mpRosterClearHighlights();
    });
  }

  // Confirm + Randomise handlers
  document.getElementById('btn-mp-roster-randomise').onclick = () => {
    playPillClick();
    mpRosterRandomise(rosterType);
  };
}

function mpMakeChip(nickname, uid, idx) {
  const chip = document.createElement('button');
  chip.id = `mp-roster-chip-${uid}`;
  chip.className = 'mp-roster-chip px-3 py-1.5 rounded-xl border-2 border-stone-200 bg-white text-stone-800 text-sm font-semibold transition-all active:scale-95';
  chip.dataset.uid = uid;
  chip.dataset.idx = idx;
  chip.textContent = nickname;
  chip.addEventListener('click', () => {
    if (mpRosterSelectedChip === uid) {
      mpRosterSelectedChip = null;
      chip.classList.remove('ring-2', 'ring-stone-800');
      mpRosterClearHighlights();
    } else {
      mpRosterSelectedChip = uid;
      document.querySelectorAll('.mp-roster-chip').forEach(c => c.classList.remove('ring-2','ring-stone-800'));
      chip.classList.add('ring-2', 'ring-stone-800');
      mpRosterHighlightTargets(mpGetRosterType());
    }
  });
  return chip;
}

function mpRosterRandomise(rosterType) {
  const shuffled = [...mpPlayerSlots].sort(() => Math.random() - 0.5);
  if (rosterType === 'individual') {
    mpRosterSelectedChip = null;
    mpRosterClearHighlights();
    // Fill slots in random order
    shuffled.forEach((p, i) => {
      const slotEl = document.querySelector(`[data-slot="${i}"]`);
      if (slotEl) {
        slotEl.textContent = p.nickname;
        slotEl.dataset.assignedUid = p.uid;
      }
      const originalIdx = mpPlayerSlots.findIndex(pl => pl.uid === p.uid);
      mpRosterPendingTeamIdx[originalIdx] = i;
      const chip = document.getElementById(`mp-roster-chip-${p.uid}`);
      if (chip) chip.style.display = 'none';
    });
  } else {
    // Split evenly into two teams — reset zones, restore pool chips, then place via shared helper
    const mid = Math.ceil(shuffled.length / 2);
    const teamA = shuffled.slice(0, mid);
    const teamB = shuffled.slice(mid);
    [0, 1].forEach(t => {
      const zone = document.getElementById(`mp-roster-team-zone-${t}`);
      if (zone) zone.innerHTML = '';
      mpRosterPendingCaptain[t] = -1;
    });
    mpRosterPendingTeamIdx = mpPlayerSlots.map(() => -1);
    mpPlayerSlots.forEach(p => {
      const chip = document.getElementById(`mp-roster-chip-${p.uid}`);
      if (chip) chip.style.display = '';
    });
    const rc = mpActiveGameConfig.rosterConfig;
    [teamA, teamB].forEach((team, teamIdx) => {
      const zone = document.getElementById(`mp-roster-team-zone-${teamIdx}`);
      team.forEach(p => mpRosterPlaceChipInZone(p.uid, teamIdx, zone, rc, rosterType));
    });
    return; // mpRosterCheckConfirm called inside mpRosterPlaceChipInZone
  }
  mpRosterCheckConfirm(rosterType);
}

// True when the active game's two teams must be the same size (SS, DSD — both derive their
// per-team size from team A's length alone, so a 3v2 would silently mis-size team B).
// TLM is one device per team and never reaches the roster screen, so it is exempt.
function mpRosterNeedsBalance() {
  return mpGetRosterType() === 'teams'
      && mpActiveGameConfig?.rosterConfig?.requiresBalancedTeams === true;
}

function mpRosterCheckConfirm(rosterType) {
  const allAssigned = mpRosterPendingTeamIdx.every(t => t >= 0);
  let captainsOk = true;
  if (rosterType === 'teams' && mpRcHasCaptain(mpActiveGameConfig?.rosterConfig)) {
    captainsOk = mpRosterPendingCaptain[0] >= 0 && mpRosterPendingCaptain[1] >= 0;
  }
  // Balance gate: "everyone assigned" allowed 3v2 — and, before the min-players fix, 4v0.
  let balanced = true;
  if (mpRosterNeedsBalance()) {
    const a = mpRosterPendingTeamIdx.filter(t => t === 0).length;
    const b = mpRosterPendingTeamIdx.filter(t => t === 1).length;
    balanced = a === b;
  }
  const ready = allAssigned && captainsOk && balanced;
  const btn   = document.getElementById('btn-mp-roster-confirm');
  btn.disabled = !ready;
  btn.classList.toggle('opacity-50',          !ready);
  btn.classList.toggle('pointer-events-none', !ready);

  const hint = document.getElementById('mp-roster-hint');
  if (hint) {
    const show = allAssigned && captainsOk && !balanced;
    hint.textContent  = show ? 'Both teams need the same number of players.' : '';
    hint.style.display = show ? 'block' : 'none';
  }
}

async function mpConfirmRoster() {
  const rosterType = mpGetRosterType();
  const rc         = mpActiveGameConfig?.rosterConfig;

  if (rosterType === 'teams') {
    const nameA = document.getElementById('mp-roster-team-0-input')?.value.trim()
                    || rc?.defaultTeamNames?.[0] || 'Team A';
    const nameB = document.getElementById('mp-roster-team-1-input')?.value.trim()
                    || rc?.defaultTeamNames?.[1] || 'Team B';
    // Reorder mpPlayerSlots: team 0 first, team 1 second (within each team, preserve assignment order)
    const origSlots  = [...mpPlayerSlots];
    // Sort team 0 by their position within team (order of assignment = order in zone)
    const teamASlots = origSlots.filter((_, i) => mpRosterPendingTeamIdx[i] === 0);
    const teamBSlots = origSlots.filter((_, i) => mpRosterPendingTeamIdx[i] === 1);
    mpPlayerSlots = [...teamASlots, ...teamBSlots];
    const newTeamIdx = [...Array(teamASlots.length).fill(0), ...Array(teamBSlots.length).fill(1)];
    // Remap captain slot indices to new absolute positions
    const newCaptains = mpRcHasCaptain(rc)
      ? mpRosterPendingCaptain.map(oldIdx => {
          if (oldIdx < 0) return 0;
          const uid = origSlots[oldIdx]?.uid;
          return uid ? mpPlayerSlots.findIndex(p => p.uid === uid) : 0;
        })
      : null;
    window.mpLobbyRoster = { teamNames: [nameA, nameB], playerTeamIdx: newTeamIdx, captainSlots: newCaptains };

  } else if (rosterType === 'individual') {
    // Reorder mpPlayerSlots based on slot assignment (mpRosterPendingTeamIdx holds slot index per player)
    const reordered = new Array(mpPlayerSlots.length);
    mpPlayerSlots.forEach((p, i) => { reordered[mpRosterPendingTeamIdx[i]] = p; });
    mpPlayerSlots = reordered;
    window.mpLobbyRoster = { teamNames: null, playerTeamIdx: null, captainSlots: null };

  } else {
    // 'none' — no roster assignment; carry pre-lobby team names if present
    const pln = window.mpLobbyRosterTeamNames;
    // Implicit team mapping for TLM: slot 0 = Host = Team 0, slot 1 = Client = Team 1
    const implicitIdx = mpPlayerSlots.map((_, i) => (i === 0 ? 0 : 1));
    const capNames = window.mpLobbyRosterCaptainNames || null;
    window.mpLobbyRoster = pln
      ? { teamNames: pln, playerTeamIdx: implicitIdx, captainSlots: null, captainNames: capNames }
      : null;
  }

  // Guard: check player count hasn't dropped since roster was built
  if (mpPlayerSlots.length < 2) {
    const cta2 = document.getElementById('btn-mp-roster-confirm');
    if (cta2) { cta2.disabled = false; cta2.textContent = 'Start Game →'; }
    // Return to lobby so host can see the updated player list
    mpShowLobbyHost();
    document.getElementById('mp-lobby-host-room-code').textContent = mpActiveRoomCode || '----';
    mpRenderHostPlayerList();
    showScreen('screen-mp-lobby-host');
    return;
  }

  // Lock player list — stop watching for departures while game loads
  if (mpPlayersListener) { mpPlayersListener(); mpPlayersListener = null; }

  // Send SETTINGS_SYNC then GAME_START
  const cta = document.getElementById('btn-mp-roster-confirm');
  if (cta) { cta.disabled = true; cta.textContent = 'Starting…'; }
  try {
    await mpSendEnvelope({
      type: 'LOBBY',
      payload: { action: 'SETTINGS_SYNC', gameSettings: mpSerialiseSettings(mpActiveGame) },
    });
    await mpSendEnvelope({
      type: 'LOBBY',
      payload: {
        action:      'GAME_START',
        playerSlots: mpPlayerSlots,
        mpLobbyStyle: window.mpLobbyStyle,
        rosterData:  window.mpLobbyRoster,
      },
    });
    mpMyPlayerIdx = mpPlayerSlots.findIndex(p => p.uid === window.syllyDeviceUid);
    if (mpMyPlayerIdx < 0) mpMyPlayerIdx = 0; // safety fallback
    mpActiveGameConfig.onPassThePhone();
  } catch (err) {
    console.error('[MP] GAME_START failed:', err);
    if (cta) { cta.disabled = false; cta.textContent = 'Start Game →'; }
  }
}

// ── Host: create room ─────────────────────────────────────────────────────────
function mpHostCreateRoom() {
  const btn = document.getElementById('btn-mp-host-generate');
  btn.textContent = 'Creating room…';
  btn.disabled    = true;

  syllyLoadFirebase(async () => {
    const fb = window.syllyFirebase;
    try {
      // Generate room code; retry once on active collision
      let code = mpGenerateRoomCode();
      for (let attempt = 0; attempt < 2; attempt++) {
        const snap = await fb.get(fb.ref(`rooms/${code}`));
        if (!snap.exists()) break;
        const age = Date.now() - (snap.val().createdAt || 0);
        if (age > 7200000) break; // stale room — safe to overwrite
        code = mpGenerateRoomCode();
      }

      mpActiveRoomCode = code;
      mpRoomRef        = fb.ref(`rooms/${code}`);

      // Write room node
      // Capture team names from pre-lobby overlay (team games only)
      const _rc = mpActiveGameConfig?.rosterConfig;
      window.mpLobbyRosterTeamNames = _rc?.showTeamNamesInPreLobby && _rc.defaultTeamNames
        ? [
            document.getElementById('mp-prelobby-team-a').value.trim() || _rc.defaultTeamNames[0],
            document.getElementById('mp-prelobby-team-b').value.trim() || _rc.defaultTeamNames[1],
          ]
        : null;
      window.mpLobbyRosterCaptainNames = mpRcHasCaptain(_rc)
        ? [
            document.getElementById('mp-prelobby-captain-a')?.value.trim() || null,
            document.getElementById('mp-prelobby-captain-b')?.value.trim() || null,
          ]
        : null;

      await fb.set(mpRoomRef, {
        hostUid:    window.syllyDeviceUid,
        createdAt:  Date.now(),
        game:       mpActiveGame,
        maxPlayers: mpActiveGameConfig?.getMaxPlayers?.() ?? 99,
        lifecycle:  { state: 'open' },
        players:    { 0: { uid: window.syllyDeviceUid, nickname: mpGetNickname() } },
      });

      // Tear down room if Host disconnects unexpectedly
      fb.onDisconnect(mpRoomRef).remove();

      window.syllyMultiplayerMode = 'host';
      mpPlayerSlots = [{ uid: window.syllyDeviceUid, nickname: mpGetNickname() }];

      // Listen for client handshakes
      mpStartEventListener();
      mpStartPrivateListener(); // own private queue (hidden-info games)

      // Watch for player departures while in the lobby
      mpStartPlayersWatcher();

      // Close pre-lobby modal and show lobby with real code
      document.getElementById('mp-host-prelobby-overlay').style.display = 'none';
      mpShowLobbyHost();
      document.getElementById('mp-lobby-host-room-code').textContent = code;
      mpRenderHostPlayerList();

      // Clean up stale rooms (fire-and-forget)
      mpCleanupStaleRooms();

      btn.textContent = 'Generate Room Code →';
      btn.disabled    = false;

    } catch (err) {
      console.error('[MP] mpHostCreateRoom failed:', err);
      btn.textContent = 'Generate Room Code →';
      btn.disabled    = false;
      window.syllyMultiplayerMode = 'single';
      mpActiveRoomCode = null;
      mpRoomRef = null;
      syllyShowNetworkError();
    }
  });
}

// ── Client: join room ─────────────────────────────────────────────────────────
function mpClientJoinRoom() {
  const code     = ['mp-join-c1','mp-join-c2','mp-join-c3','mp-join-c4']
                    .map(id => document.getElementById(id).value).join('');
  const nickname = document.getElementById('mp-join-nickname-input').value.trim();
  mpSaveNickname(nickname);

  const btn = document.getElementById('btn-mp-join-enter');
  btn.textContent = 'Connecting…';
  btn.disabled    = true;

  const status = document.getElementById('mp-join-status');

  // Already connected to this room — update nickname in-place, don't create a second slot
  if (window.mpClientPlayerRef && window.syllyMultiplayerMode === 'client' && window.syllyFirebase && mpActiveRoomCode === code) {
    btn.textContent = 'Updating…';
    window.syllyFirebase.set(window.mpClientPlayerRef, { uid: window.syllyDeviceUid, nickname })
      .then(() => {
        btn.textContent    = 'Waiting…';
        status.textContent = 'Nickname updated — waiting for the host to start…';
        status.className   = 'text-stone-500 text-sm text-center mt-2';
      })
      .catch(() => {
        btn.textContent = 'Enter Room →';
        btn.disabled    = false;
        mpUpdateJoinCta();
      });
    return;
  }

  syllyLoadFirebase(async () => {
    const fb = window.syllyFirebase;
    try {
      const roomRef = fb.ref(`rooms/${code}`);
      const snap    = await fb.get(roomRef);

      if (!snap.exists()) {
        status.textContent = 'Room not found — check the code and try again.';
        status.className   = 'text-red-500 text-sm text-center mt-2';
        btn.textContent    = 'Enter Room →';
        btn.disabled       = false;
        mpUpdateJoinCta();
        return;
      }

      // Capacity check
      const roomData     = snap.val();
      const maxPlayers   = roomData.maxPlayers || 99;
      const currentCount = Object.keys(roomData.players || {}).length;
      if (currentCount >= maxPlayers) {
        status.textContent = 'This room is full — ask the host to expand the player count in settings.';
        status.className   = 'text-red-500 text-sm text-center mt-2';
        btn.textContent    = 'Enter Room →';
        btn.disabled       = false;
        mpUpdateJoinCta();
        return;
      }

      mpActiveRoomCode            = code;
      mpRoomRef                   = roomRef;
      window.syllyMultiplayerMode = 'client';

      // Write own player slot
      const players   = roomData.players || {};
      const slotIdx   = Object.keys(players).length;
      const playerRef = fb.ref(`rooms/${code}/players/${slotIdx}`);
      await fb.set(playerRef, { uid: window.syllyDeviceUid, nickname });
      fb.onDisconnect(playerRef).remove();
      window.mpClientPlayerRef = playerRef; // save for explicit removal on leave

      // Send HANDSHAKE
      mpJoinListenFrom = Date.now();
      await mpSendEnvelope({
        type:    'HANDSHAKE',
        payload: { version: SYLLY_VERSION, nickname },
      });

      // Listen for LOBBY/SYNC events from Host
      mpStartEventListener();
      mpStartPrivateListener(); // own private queue (hidden-info games)

      // Watch for room deletion (host disconnect / session end)
      mpRoomListener = fb.onValue(roomRef, roomSnap => {
        if (!roomSnap.exists() && window.syllyMultiplayerMode === 'client') {
          document.getElementById('mp-host-disconnected-overlay').style.display = 'flex';
          mpStopListeners();
          window.syllyMultiplayerMode = 'single';
        }
      });

      // Show waiting state
      status.textContent = 'Connected! Waiting for the host to start…';
      status.className   = 'text-stone-500 text-sm text-center mt-2';
      btn.textContent    = 'Waiting…';

    } catch (err) {
      console.error('[MP] mpClientJoinRoom failed:', err);
      status.textContent = 'Connection failed — please try again.';
      status.className   = 'text-red-500 text-sm text-center mt-2';
      btn.textContent    = 'Enter Room →';
      btn.disabled       = false;
      window.syllyMultiplayerMode = 'single';
      mpActiveRoomCode = null;
      mpRoomRef = null;
    }
  });
}

// ── Stale room cleanup (fire-and-forget) ──────────────────────────────────────
async function mpCleanupStaleRooms() {
  try {
    const fb   = window.syllyFirebase;
    const snap = await fb.get(fb.ref('rooms'));
    if (!snap.exists()) return;
    const now    = Date.now();
    const maxAge = 7200000; // 2 hours
    const deletes = [];
    snap.forEach(childSnap => {
      const data = childSnap.val();
      if (data && data.createdAt && (now - data.createdAt) > maxAge) {
        deletes.push(fb.remove(childSnap.ref));
      }
    });
    await Promise.all(deletes);
  } catch (_) {}
}

// ── Host: watch for player departures from the lobby ─────────────────────────
function mpStartPlayersWatcher() {
  if (!mpActiveRoomCode || !window.syllyFirebase) return;
  if (mpPlayersListener) { mpPlayersListener(); mpPlayersListener = null; }
  const playersRef = window.syllyFirebase.ref(`rooms/${mpActiveRoomCode}/players`);
  let lastCount = 0;
  mpPlayersListener = window.syllyFirebase.onValue(playersRef, snap => {
    if (window.syllyMultiplayerMode !== 'host') return;
    if (!snap.exists()) { lastCount = 0; return; }
    const entries = Object.values(snap.val()).filter(p => p && p.uid);
    const newCount = entries.length;
    if (newCount < lastCount) {
      // Player left — update slot list from Firebase
      mpPlayerSlots = entries.map(p => ({ uid: p.uid, nickname: p.nickname }));
      if (document.getElementById('screen-mp-lobby-host').style.display !== 'none') {
        mpRenderHostPlayerList();
      }
    }
    lastCount = newCount;
  });
}

// ── Multiplayer play-again: return all devices to lobby ───────────────────────
async function mpReturnToLobby() {
  if (window.syllyMultiplayerMode === 'host') {
    try {
      await mpSendEnvelope({ type: 'LOBBY', payload: { action: 'LOBBY_RESET' } });
    } catch (_) {}
    mpShowLobbyHost();
    document.getElementById('mp-lobby-host-room-code').textContent = mpActiveRoomCode || '----';
    mpRenderHostPlayerList();
    showScreen('screen-mp-lobby-host');
    // Re-subscribe players watcher so host sees any departures in the new lobby
    mpStartPlayersWatcher();
  } else {
    resetToLobby();
  }
}

// ── Event Wiring ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // — Mode screen: back + exit —
  document.getElementById('btn-mp-mode-back').addEventListener('click', () => {
    playDone();
    showScreen(mpActiveGameConfig.menuScreen);
  });
  document.getElementById('btn-mp-mode-exit').addEventListener('click', () => {
    playExit();
    showScreen(mpActiveGameConfig.menuScreen);
  });

  document.querySelectorAll('#screen-mp-mode .btn-open-sound').forEach(btn => {
    btn.addEventListener('click', openSoundOverlay);
  });

  // — Mode screen: single branded CTA —
  document.getElementById('btn-mp-mode-cta').addEventListener('click', () => {
    if (mpSelectedMode === 'host') {
      playPillClick();
      document.getElementById('mp-host-nickname').value = mpGetNickname();
      const gen     = document.getElementById('btn-mp-host-generate');
      const hasNick = mpGetNickname().length > 0;
      gen.disabled  = !hasNick;
      gen.classList.toggle('opacity-50', !hasNick);
      // Show/hide team name inputs based on active game config
      const rc = mpActiveGameConfig?.rosterConfig;
      const teamSection = document.getElementById('mp-prelobby-team-names');
      if (rc?.showTeamNamesInPreLobby && rc.defaultTeamNames) {
        document.getElementById('mp-prelobby-team-a').placeholder = `e.g. ${rc.defaultTeamNames[0]}`;
        document.getElementById('mp-prelobby-team-b').placeholder = `e.g. ${rc.defaultTeamNames[1]}`;
        document.getElementById('mp-prelobby-team-a').value = '';
        document.getElementById('mp-prelobby-team-b').value = '';
        teamSection.style.display = 'flex';
        mpUpdatePrelobbyDeviceLabels(rc.defaultTeamNames);
      } else {
        teamSection.style.display = 'none';
      }
      const captainSection = document.getElementById('mp-prelobby-captain-names');
      if (captainSection) {
        captainSection.style.display = mpRcHasCaptain(rc) ? 'flex' : 'none';
        if (mpRcHasCaptain(rc) && rc.defaultTeamNames) {
          document.getElementById('mp-prelobby-captain-a').placeholder = `e.g. ${rc.defaultTeamNames[0]} Captain`;
          document.getElementById('mp-prelobby-captain-b').placeholder = `e.g. ${rc.defaultTeamNames[1]} Captain`;
          document.getElementById('mp-prelobby-captain-a').value = '';
          document.getElementById('mp-prelobby-captain-b').value = '';
        }
      }
      document.getElementById('mp-host-prelobby-overlay').style.display = 'flex';
      setTimeout(() => document.getElementById('mp-host-nickname').focus(), 100);
    } else if (mpSelectedMode === 'join') {
      playLaunch(); mpShowLobbyJoin();
    } else {
      playLaunch(); mpActiveGameConfig.onPassThePhone();
    }
  });

  // — Host pre-lobby modal —
  document.getElementById('mp-host-nickname').addEventListener('input', () => {
    const val = document.getElementById('mp-host-nickname').value.trim();
    const gen = document.getElementById('btn-mp-host-generate');
    gen.disabled = !val;
    gen.classList.toggle('opacity-50', !val);
  });
  // Team name inputs → update device labels live
  ['mp-prelobby-team-a', 'mp-prelobby-team-b'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      const rc = mpActiveGameConfig?.rosterConfig;
      if (rc?.defaultTeamNames) mpUpdatePrelobbyDeviceLabels(rc.defaultTeamNames);
    });
  });
  // Swap button → swap input values + invert labels
  document.getElementById('btn-mp-prelobby-swap').addEventListener('click', () => {
    playPillClick();
    const inputA = document.getElementById('mp-prelobby-team-a');
    const inputB = document.getElementById('mp-prelobby-team-b');
    const rc = mpActiveGameConfig?.rosterConfig;
    const defaults = rc?.defaultTeamNames || ['Team A', 'Team B'];
    // Pre-fill with defaults if empty so swapping is meaningful
    if (!inputA.value.trim()) inputA.value = defaults[0];
    if (!inputB.value.trim()) inputB.value = defaults[1];
    const tmp = inputA.value;
    inputA.value = inputB.value;
    inputB.value = tmp;
    if (rc?.defaultTeamNames) mpUpdatePrelobbyDeviceLabels(rc.defaultTeamNames);
  });
  document.getElementById('btn-mp-host-generate').addEventListener('click', () => {
    const input = document.getElementById('mp-host-nickname');
    const val   = input.value.trim();
    if (!val) { mpShakeNicknameInput(input); return; }
    mpSaveNickname(val);
    mpHostCreateRoom(); // async — manages its own loading state
  });
  document.getElementById('btn-mp-host-prelobby-cancel').addEventListener('click', () => {
    playDone();
    document.getElementById('mp-host-prelobby-overlay').style.display = 'none';
  });

  // — Host lobby —
  document.getElementById('btn-mp-lobby-host-cancel').addEventListener('click', async () => {
    playDone();
    if (window.syllyMultiplayerMode === 'host') await syllyTeardownRoom();
    window.syllyMultiplayerMode = 'single';
    mpShowModeScreen(mpActiveGame);
  });
  document.getElementById('btn-mp-lobby-host-cta').addEventListener('click', () => {
    if (window.syllyMultiplayerMode !== 'host') return;
    playLaunch();
    mpShowRosterScreen();
  });
  document.getElementById('mp-lobby-host-room-code').addEventListener('click', () => {
    const code = document.getElementById('mp-lobby-host-room-code').textContent.replace(/\s|-/g, '');
    if (code.length === 4) navigator.clipboard?.writeText(code);
  });

  // — Roster screen —
  document.getElementById('btn-mp-roster-back').addEventListener('click', () => {
    playDone();
    mpShowLobbyHost();
    document.getElementById('mp-lobby-host-room-code').textContent = mpActiveRoomCode || '----';
    mpRenderHostPlayerList();
    showScreen('screen-mp-lobby-host');
  });
  document.getElementById('btn-mp-roster-confirm').addEventListener('click', () => {
    if (document.getElementById('btn-mp-roster-confirm').disabled) return;
    playLaunch();
    mpConfirmRoster();
  });

  // — Join screen —
  document.getElementById('btn-mp-join-cancel').addEventListener('click', () => {
    playDone();
    if (window.syllyMultiplayerMode === 'client') {
      // Explicitly remove player node so host sees the departure immediately
      if (window.syllyFirebase && window.mpClientPlayerRef) {
        try { window.syllyFirebase.remove(window.mpClientPlayerRef); } catch (_) {}
        window.mpClientPlayerRef = null;
      }
      mpStopListeners();
      window.syllyMultiplayerMode = 'single';
      mpActiveRoomCode = null;
      mpRoomRef        = null;
    }
    mpShowModeScreen(mpActiveGame);
  });
  document.getElementById('mp-join-nickname-input').addEventListener('input', mpUpdateJoinCta);

  // 4-box code input: auto-advance + CTA enable/disable
  const codeBoxes = ['mp-join-c1','mp-join-c2','mp-join-c3','mp-join-c4'].map(id => document.getElementById(id));
  codeBoxes.forEach((box, i) => {
    box.addEventListener('input', () => {
      box.value = box.value.toUpperCase().slice(-1);
      if (box.value && i < 3) {
        codeBoxes[i + 1].focus();
      } else if (box.value && i === 3) {
        const hasNick = document.getElementById('mp-join-nickname-input').value.trim().length > 0;
        if (hasNick) {
          mpUpdateJoinCta();
          mpClientJoinRoom();
          return;
        } else {
          document.getElementById('mp-join-nickname-input').focus();
        }
      }
      mpUpdateJoinCta();
    });
    box.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !box.value && i > 0) codeBoxes[i - 1].focus();
    });
  });

  // — Join: Enter Room button —
  document.getElementById('btn-mp-join-enter').addEventListener('click', () => {
    mpClientJoinRoom();
  });

  // — MP overlay dismiss buttons —
  document.getElementById('btn-mp-version-mismatch-ok').addEventListener('click', () => {
    document.getElementById('mp-version-mismatch-overlay').style.display = 'none';
  });
  document.getElementById('btn-mp-host-disconnected-ok').addEventListener('click', () => {
    document.getElementById('mp-host-disconnected-overlay').style.display = 'none';
    resetToLobby();
  });
  document.getElementById('btn-mp-roster-mismatch-ok').addEventListener('click', () => {
    document.getElementById('mp-roster-mismatch-overlay').style.display = 'none';
    resetToLobby();
  });
  document.getElementById('btn-mp-lttp-interrupt-ok').addEventListener('click', () => {
    // Close the modal only. Navigation is host-SYNC-driven now (LTTP_TURN_ADVANCE /
    // LTTP_PLAN_UPDATE / LTTP_GUESS_PHASE already set the underlying screen) — forcing
    // lttpShowChat here would clobber a plan-update or guess screen the host just navigated to.
    document.getElementById('mp-lttp-message-interrupt-overlay').style.display = 'none';
  });
  document.getElementById('btn-mp-network-error-ok').addEventListener('click', () => {
    document.getElementById('mp-network-error-overlay').style.display = 'none';
  });

  // LI5: CATCH! button on monitor screen → send alert to Host device (10s cooldown)
  let li5CatchCooldownTimer = null;

  // L3: tappable nono words — tap to trigger CATCH with the specific word
  document.getElementById('li5-monitor-nono-list')?.addEventListener('click', e => {
    const btn = e.target.closest('.li5-nono-word-btn');
    if (!btn || window.syllyMultiplayerMode !== 'client' || li5CatchCooldownTimer) return;
    const word = btn.dataset.word;
    // Highlight the tapped word on the monitor immediately
    btn.classList.add('ring-2', 'ring-pink-500', 'bg-pink-200', 'text-pink-800');
    playBoing();
    mpSendEnvelope({ type: 'ACTION', payload: { action: 'LI5_CATCH', word } });
    li5StartCatchCooldown();
  });

  function li5StartCatchCooldown() {
    const btn = document.getElementById('btn-li5-catch');
    if (!btn) return;
    btn.disabled = true;
    let remaining = 10;
    btn.textContent = `CATCH! 🚨 (${remaining}s)`;
    li5CatchCooldownTimer = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(li5CatchCooldownTimer);
        li5CatchCooldownTimer = null;
        btn.disabled = false;
        btn.textContent = 'CATCH! 🚨';
      } else {
        btn.textContent = `CATCH! 🚨 (${remaining}s)`;
      }
    }, 1000);
  }

  // Big CATCH! button — sends without a specific word (general alert)
  document.getElementById('btn-li5-catch')?.addEventListener('click', () => {
    if (window.syllyMultiplayerMode !== 'client' || li5CatchCooldownTimer) return;
    playBoing();
    mpSendEnvelope({ type: 'ACTION', payload: { action: 'LI5_CATCH' } });
    li5StartCatchCooldown();
  });

  // LI5 monitor screen ✕ — leave session and return to lobby (passive spectator, no confirm needed)
  document.getElementById('btn-li5-monitor-exit')?.addEventListener('click', () => {
    playExit();
    resetToLobby();
  });

});
