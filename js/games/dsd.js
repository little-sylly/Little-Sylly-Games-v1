// ══════════════════════════════════════════════════════════════════════════════
// Deep-Sea Deploy (DSD)
// Codenames-style clue-giving + sequential deduction for two naval task forces.
// Depends on: engine.js (showScreen, showWhoFirst, resetToLobby, audio, allScreens)
// ══════════════════════════════════════════════════════════════════════════════

// ── Settings (persist between New Operations) ─────────────────────────────────
let dsdSeaState         = 'turbulent'; // 'calm' | 'turbulent' | 'tempest'
let dsdHazardControl    = { urchin: false, mine: true, enemy: true };
let dsdDangerLevel      = 'pressure';  // 'pressure' | 'nuclear'
let dsdStrategicPlanning = false;
let dsdSyllyMode        = false;

// ── Roster (set in setup, persist across New Operations) ──────────────────────
let dsdTeamNames      = ['SS Kraken', 'SS Leviathan']; // customisable; defaults shown
let dsdPlayersPerTeam = 2;                         // 2 or 3
let dsdPlayerNames    = [[], []];                  // [team0[], team1[]] — name strings
let dsdCaptainName    = ['', ''];                  // designated Captain name per team

// ── Game state (reset each New Operation) ────────────────────────────────────
let dsdWordPool         = []; // full shuffled pool from dsdBuildGame (for per-word swaps)
let dsdWordPoolIdx      = 0;  // pointer to next unused word in dsdWordPool
let dsdValour      = [0, 0];  // [team0Valour, team1Valour]
let dsdGrid        = [];      // [{ word, role, revealed }] × 25
let dsdCurrentTeam = 0;       // 0 = team0 active, 1 = team1 active
let dsdFirstTeam   = 0;       // from showWhoFirst() — the team with 9 payloads
let dsdDeployment  = 0;       // Deployment counter (increments when both teams play)

// ── Turn state (reset each turn) ─────────────────────────────────────────────
let dsdPingClue      = '';
let dsdPingNumber    = 0;
let dsdSequence      = []; // grid indices in chosen order (max dsdPingNumber + 1)
let dsdTurnOutcomes  = []; // [{word, role, vp, label}] — populated by dsdResolveHit each turn

// ── Game log (reset each New Operation) ──────────────────────────────────────
let dsdTurnLog     = []; // [{deployment, team, teamName, captainName, ping, pingNumber, outcomes[]}]
let dsdHistoryIdx  = 0;  // active carousel card index (per-deployment) — gameover screen
let dsdHistoryPage = 0;  // deployment shown in in-game history carousel

// ── Sylly Mode only (Silent Running) ─────────────────────────────────────────
let dsdJammers       = [-1, -1]; // dsdJammers[t] = grid index jammed BY team t; -1 = none
let dsdUpgradedMines = [];       // indices upgraded urchin→mine this cycle; reverted before next jam

// ── Captain grid UI state ─────────────────────────────────────────────────────
let dsdCaptainFilter = new Set(); // roles currently greyed out; tapping legend key toggles
let dsdFlippedCells  = new Set(); // revealed cell indices showing word instead of emoji
let dsdMpStandby     = false;     // Lobby Mode: true when this device is the non-active team

// ── Setup helpers ─────────────────────────────────────────────────────────────

function dsdLaunchWhoFirst() {
  showWhoFirst({
    emoji: '⚓',
    eyebrow: 'DEEP-SEA DEPLOY',
    heading: 'Which team deploys first?',
    prompt: 'First team arms 9 payloads. Second team arms 8.',
    teamA: dsdTeamNames[0],
    teamB: dsdTeamNames[1],
    confirmLabel: 'Begin Deployment',
    accentBtnClass:  'bg-cyan-700 hover:bg-cyan-800',
    accentTextClass: 'text-cyan-700',
    onResult: (idx) => {
      dsdFirstTeam = idx;
      dsdBuildGame().then(() => {
        if (dsdStrategicPlanning) {
          dsdShowBriefing();
        } else {
          dsdShowCaptain();
        }
      });
    }
  });
}

const DSD_EXCLUDED_CATEGORIES = new Set(['aussie_slang', 'pop_culture', 'people', 'brands']);

async function dsdBuildGame() {
  await loadWords();
  if (typeof isSecretMode !== 'undefined' && isSecretMode && window.activeExpansionOverrides) {
    const ov = window.activeExpansionOverrides;
    if (ov.dsdSeaState      !== undefined) dsdSeaState      = ov.dsdSeaState;
    if (ov.dsdDangerLevel   !== undefined) dsdDangerLevel   = ov.dsdDangerLevel;
    if (ov.dsdSyllyMode     !== undefined) dsdSyllyMode     = ov.dsdSyllyMode;
    if (ov.dsdHazardControl !== undefined) Object.assign(dsdHazardControl, ov.dsdHazardControl);
  }
  const tierMap = { calm: [1], turbulent: [1, 2], tempest: [1, 2, 3] };
  const tiers = tierMap[dsdSeaState] || [1, 2];
  let pool;
  if (typeof isSecretMode !== 'undefined' && isSecretMode &&
      typeof secretWords !== 'undefined' && secretWords && secretWords.length) {
    pool = shuffle(secretWords.map(w => w.word));
  } else {
    const filtered = allWords.filter(w =>
      tiers.includes(w.difficulty) &&
      !DSD_EXCLUDED_CATEGORIES.has(w.category) &&
      !w.word.includes(' ')
    );
    pool = shuffle(filtered.map(w => w.word));
  }
  dsdWordPool    = pool;
  dsdWordPoolIdx = 25;
  const words = pool.slice(0, 25);
  const roles = [
    ...Array(9).fill(dsdFirstTeam),
    ...Array(8).fill(1 - dsdFirstTeam),
    ...Array(4).fill('urchin'),
    ...Array(4).fill('mine'),
  ];
  const shuffledRoles = shuffle(roles);
  dsdGrid = words.map((word, i) => ({ word, role: shuffledRoles[i], revealed: false }));
  dsdCurrentTeam = dsdFirstTeam;
  dsdDeployment = 1;
}

// ── Screen functions ──────────────────────────────────────────────────────────

function dsdShowMenu() {
  playLaunch();
  showScreen('screen-dsd-menu');
}

function dsdShowSetup() {
  // Lobby Mode with rosterData: bypass PTP setup screens
  if (window.syllyMultiplayerMode !== 'single' && window.mpLobbyRoster) {
    dsdApplyLobbyRoster();
    const myTeamIdx = window.syllyMultiplayerMode === 'host' ? 0 : 1;
    dsdShowPassGate({
      heading:   `Pass to ${dsdCaptainName[myTeamIdx]}`,
      subtext:   `${dsdTeamNames[myTeamIdx]} — hand this device to your Captain.`,
      ctaLabel:  'Ready to deploy →',
      onConfirm: () => {
        if (window.syllyMultiplayerMode === 'host') {
          showWhoFirst({
            emoji:           '⚓',
            eyebrow:         'Operations',
            heading:         'Who Deploys First?',
            prompt:          'Decide which task force strikes first.',
            teamA:           dsdTeamNames[0],
            teamB:           dsdTeamNames[1],
            confirmLabel:    'Commence Operation',
            accentBtnClass:  'bg-cyan-700 hover:bg-cyan-800',
            accentTextClass: 'text-cyan-700',
            onResult: goesFirstIdx => {
              dsdFirstTeam = goesFirstIdx;
              dsdBuildGame().then(() => dsdShowCaptain());
            },
          });
        }
        // Client waits for DSD_CREW_ACTIVE sync
      },
    });
    return;
  }
  // PTP path unchanged
  showScreen('screen-dsd-setup');
  document.getElementById('dsd-team-name-0').value = dsdTeamNames[0] !== 'SS Kraken'    ? dsdTeamNames[0] : '';
  document.getElementById('dsd-team-name-1').value = dsdTeamNames[1] !== 'SS Leviathan' ? dsdTeamNames[1] : '';
}

function dsdApplyLobbyRoster() {
  const r = window.mpLobbyRoster;
  dsdTeamNames = r.teamNames || ['SS Kraken', 'SS Leviathan'];
  dsdPlayerNames = [[], []];
  (r.playerTeamIdx || []).forEach((teamIdx, slotIdx) => {
    dsdPlayerNames[teamIdx].push(mpPlayerSlots[slotIdx].nickname);
  });
  dsdPlayersPerTeam = dsdPlayerNames[0].length || 1;
  dsdCaptainName = r.captainNames
    ? r.captainNames.slice(0, 2).map((n, i) => n || `${dsdTeamNames[i]} Captain`)
    : r.captainSlots
      ? r.captainSlots.map(slotIdx => mpPlayerSlots[slotIdx]?.nickname || 'Captain')
      : [dsdPlayerNames[0][0] || 'Captain', dsdPlayerNames[1][0] || 'Captain'];
}

function dsdShowPlayers() {
  // Save team names before moving on
  const n0 = document.getElementById('dsd-team-name-0').value.trim() || 'SS Kraken';
  const n1 = document.getElementById('dsd-team-name-1').value.trim() || 'SS Leviathan';
  dsdTeamNames = [n0, n1];
  showScreen('screen-dsd-players');
  dsdSyncPptPills();
  dsdUpdateTeamHeadings();
  dsdRenderPlayerInputs();
}

function dsdSyncPptPills() {
  document.querySelectorAll('#dsd-ppt-pills .pill').forEach(btn => {
    btn.classList.toggle('pill-active-cyan', parseInt(btn.dataset.val) === dsdPlayersPerTeam);
  });
}

function dsdUpdateTeamHeadings() {
  const n0 = document.getElementById('dsd-team-name-0').value.trim() || 'SS Kraken';
  const n1 = document.getElementById('dsd-team-name-1').value.trim() || 'SS Leviathan';
  const h0 = document.getElementById('dsd-team-0-heading');
  const h1 = document.getElementById('dsd-team-1-heading');
  h0.textContent = n0 + ' Crew';
  h0.className = 'text-xs font-semibold uppercase tracking-widest text-cyan-700 mb-2';
  h1.textContent = n1 + ' Crew';
  h1.className = 'text-xs font-semibold uppercase tracking-widest text-indigo-800 mb-2';
}

function dsdRenderPlayerInputs() {
  [0, 1].forEach(team => {
    const container = document.getElementById(`dsd-players-team-${team}`);
    const prevNames = Array.from(container.querySelectorAll('input')).map(el => el.value);
    container.innerHTML = '';
    for (let i = 0; i < dsdPlayersPerTeam; i++) {
      const row = document.createElement('div');
      row.className = 'flex items-center gap-2';
      row.innerHTML = `
        <input id="dsd-player-${team}-${i}" type="text" maxlength="20"
          placeholder="Crew member ${i + 1}"
          class="flex-1 rounded-xl border-2 border-stone-200 bg-white px-4 py-3 text-base text-stone-800 placeholder-stone-300 focus:border-cyan-600 focus:outline-none transition-colors"
          value="${prevNames[i] || ''}">
        <button class="dsd-captain-btn shrink-0 px-3 py-2 rounded-xl text-base font-semibold transition-all duration-150 bg-stone-100 text-stone-400 active:scale-90"
          data-team="${team}" data-player="${i}" title="Set as Captain">⚓</button>
      `;
      container.appendChild(row);
    }
  });
  document.querySelectorAll('.dsd-captain-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const team = btn.dataset.team;
      document.querySelectorAll(`.dsd-captain-btn[data-team="${team}"]`).forEach(b => {
        b.classList.remove('bg-cyan-100', 'text-cyan-700');
        b.classList.add('bg-stone-100', 'text-stone-400');
      });
      btn.classList.remove('bg-stone-100', 'text-stone-400');
      btn.classList.add('bg-cyan-100', 'text-cyan-700');
      playPillClick();
    });
  });
  // Default the first crew member of each team to captain
  [0, 1].forEach(team => {
    const firstBtn = document.querySelector(`.dsd-captain-btn[data-team="${team}"][data-player="0"]`);
    if (firstBtn) {
      firstBtn.classList.remove('bg-stone-100', 'text-stone-400');
      firstBtn.classList.add('bg-cyan-100', 'text-cyan-700');
    }
  });
}

function dsdValidatePlayers() {
  const error = document.getElementById('dsd-setup-error');
  error.classList.add('hidden');
  const playerNames = [[], []];
  for (let team = 0; team < 2; team++) {
    for (let i = 0; i < dsdPlayersPerTeam; i++) {
      const input = document.getElementById(`dsd-player-${team}-${i}`);
      playerNames[team].push(input ? input.value.trim() || `Crew member ${i + 1}` : `Crew member ${i + 1}`);
    }
  }
  const captains = ['', ''];
  [0, 1].forEach(team => {
    const active = document.querySelector(`.dsd-captain-btn[data-team="${team}"].bg-cyan-100`);
    if (active) captains[team] = playerNames[team][parseInt(active.dataset.player)];
  });
  if (!captains[0] || !captains[1]) {
    error.textContent = 'Each team needs a Captain — tap ⚓ to assign.';
    error.classList.remove('hidden');
    return;
  }
  dsdPlayerNames = playerNames;
  dsdCaptainName = captains;
  playLaunch();
  dsdLaunchWhoFirst();
}

function dsdShowPassGate({ heading, subtext, ctaLabel, onConfirm, teamIdx }) {
  document.getElementById('dsd-gate-heading').textContent = heading;
  document.getElementById('dsd-gate-subtext').textContent = subtext;
  const btn = document.getElementById('btn-dsd-gate-confirm');
  btn.textContent = ctaLabel;
  btn.onclick = () => { playLaunch(); onConfirm(); };
  const btnBase = 'min-h-14 w-full rounded-2xl active:scale-95 text-white text-xl font-semibold transition-all duration-150';
  btn.className = teamIdx === 1
    ? `${btnBase} bg-indigo-800 hover:bg-indigo-900`
    : `${btnBase} bg-cyan-700 hover:bg-cyan-800`;
  showScreen('screen-dsd-pass-gate');
}

// ── Strategic Planning briefing screen ────────────────────────────────────────
function dsdShowBriefing() {
  const grid = document.getElementById('dsd-briefing-grid');
  if (grid) {
    grid.innerHTML = dsdGrid.map((cell, i) => {
      const len = cell.word.length;
      const fontClass = len > 12 ? 'text-[9px]' : len > 9 ? 'text-[10px]' : 'text-xs';
      return `<div onclick="dsdRerollWord(${i})" class="bg-white rounded-xl border border-stone-200 ${fontClass} text-stone-700 p-2 text-center font-medium leading-tight select-none overflow-hidden whitespace-nowrap cursor-pointer hover:bg-stone-100 active:scale-95 transition-all duration-100">${cell.word}</div>`;
    }).join('');
  }
  showScreen('screen-dsd-briefing');
}

function dsdRerollWord(cellIdx) {
  if (dsdWordPoolIdx >= dsdWordPool.length) {
    // Pool exhausted — rebuild from eligible words not currently on the board
    const onBoard = new Set(dsdGrid.map(c => c.word));
    const tierMap = { calm: [1], turbulent: [1, 2], tempest: [1, 2, 3] };
    const tiers = tierMap[dsdSeaState] || [1, 2];
    let fresh;
    if (typeof isSecretMode !== 'undefined' && isSecretMode &&
        typeof secretWords !== 'undefined' && secretWords && secretWords.length) {
      fresh = shuffle(secretWords.map(w => w.word).filter(w => !onBoard.has(w)));
    } else {
      fresh = shuffle(
        allWords
          .filter(w => tiers.includes(w.difficulty) && !DSD_EXCLUDED_CATEGORIES.has(w.category) && !w.word.includes(' ') && !onBoard.has(w.word))
          .map(w => w.word)
      );
    }
    if (!fresh.length) return;
    dsdWordPool    = fresh;
    dsdWordPoolIdx = 0;
  }
  dsdGrid[cellIdx].word = dsdWordPool[dsdWordPoolIdx++];
  playPillClick();
  dsdShowBriefing();
}

function dsdUpdateLegend() {
  const me = dsdCurrentTeam;
  const enemy = 1 - me;
  const enemyName = dsdTeamNames[enemy];
  const enemyEnds = dsdHazardControl.enemy;
  const urchinEnds = dsdHazardControl.urchin;
  const isNuclear = dsdDangerLevel === 'nuclear';

  document.getElementById('dsd-legend-team0-val').textContent = '+10';
  document.getElementById('dsd-legend-team1-val').textContent = enemyEnds
    ? `+10 to ${enemyName} · ends turn` : `+10 to ${enemyName}`;
  if (me === 1) {
    document.getElementById('dsd-legend-team0-val').textContent = enemyEnds
      ? `+10 to ${dsdTeamNames[0]} · ends turn` : `+10 to ${dsdTeamNames[0]}`;
    document.getElementById('dsd-legend-team1-val').textContent = '+10';
  }
  document.getElementById('dsd-legend-urchin-val').textContent = urchinEnds ? '−5 · ends turn' : '−5 · continues';
  document.getElementById('dsd-legend-mine-val').textContent   = isNuclear
    ? '−1000 ☠️ GAME OVER' : '−20 · ends turn';
  document.getElementById('dsd-legend-jammer-val').textContent = '−5 · ends turn';

  const jammerBtn = document.querySelector('[data-role="jammer"]');
  if (jammerBtn) jammerBtn.style.display = dsdSyllyMode ? '' : 'none';

  const mineSwatch = document.getElementById('dsd-legend-mine-swatch');
  if (mineSwatch) mineSwatch.className = `inline-block w-3 h-3 rounded-sm flex-shrink-0 ${isNuclear ? 'bg-red-900' : 'bg-red-600'}`;
}

function dsdShowCaptain() {
  const team = dsdCurrentTeam;

  if (window.syllyMultiplayerMode !== 'single') {
    // Host (TLM): broadcast turn state so client navigates correctly
    if (window.syllyMultiplayerMode === 'host' && window.mpLobbyStyle === 'team') {
      mpSendEnvelope({ type: 'SYNC', payload: {
        action:     'DSD_CAPTAIN_ACTIVE',
        team:       dsdCurrentTeam,
        deployment: dsdDeployment,
        grid:       dsdGrid.map(c => ({ ...c })),
      }});
    }
    if (dsdCurrentTeam !== mpMyPlayerIdx) {
      // Non-active team's device → spectator (TLM) or standby (MDLM)
      if (window.mpLobbyStyle === 'team') {
        dsdShowSpectatorView();
      } else {
        dsdMpStandby = true;
        dsdShowCrewStandby('Awaiting enemy Sonar Ping…');
      }
      return;
    }
    // Active team's device — TLM gets an intra-device pass gate before the captain screen
    if (window.mpLobbyStyle === 'team') {
      dsdShowPassGate({
        heading:  `Pass to ${dsdCaptainName[dsdCurrentTeam]}`,
        subtext:  `${dsdTeamNames[dsdCurrentTeam]} — your turn to deploy.`,
        ctaLabel: `Ready, Captain`,
        teamIdx:  dsdCurrentTeam,
        onConfirm: () => {
          dsdMpStandby = false;
          dsdCaptainFilter.clear();
          showScreen('screen-dsd-captain');
          dsdUpdateLegend();
          dsdRenderCaptainGrid();
          dsdRenderInGameHistory('captain');
          document.getElementById('dsd-ping-word').value  = '';
          document.getElementById('dsd-ping-number').value = '';
          document.getElementById('dsd-ping-error').classList.add('hidden');
        },
      });
    } else {
      // MDLM: skip pass gate — captain uses their own device
      dsdMpStandby = false;
      dsdCaptainFilter.clear();
      showScreen('screen-dsd-captain');
      dsdUpdateLegend();
      dsdRenderCaptainGrid();
      dsdRenderInGameHistory('captain');
      document.getElementById('dsd-ping-word').value  = '';
      document.getElementById('dsd-ping-number').value = '';
      document.getElementById('dsd-ping-error').classList.add('hidden');
    }
    return;
  }

  const captainName = dsdCaptainName[team];
  const teamName = dsdTeamNames[team];
  dsdShowPassGate({
    heading: `Pass to ${captainName}`,
    subtext: `${teamName} — Captain ⚓`,
    ctaLabel: `I'm ${captainName}`,
    teamIdx: team,
    onConfirm: () => {
      dsdCaptainFilter.clear();
      showScreen('screen-dsd-captain');
      dsdUpdateLegend();
      dsdRenderCaptainGrid();
      dsdRenderInGameHistory('captain');
      document.getElementById('dsd-ping-word').value = '';
      document.getElementById('dsd-ping-number').value = '';
      document.getElementById('dsd-ping-error').classList.add('hidden');
    }
  });
}

// Lobby Mode: standby state for non-active team device
function dsdShowCrewStandby(message) {
  dsdMpStandby = true;
  dsdFlippedCells = new Set();
  document.getElementById('dsd-ping-display').textContent = message || 'Standby…';
  document.getElementById('btn-dsd-crew-execute').disabled = true;
  dsdRenderCrewGrid(); // renders public grid (unrevealed = word-only, no colour coding)
  showScreen('screen-dsd-crew');
}

// TLM: spectator view for non-active team — shows grid + clue history
function dsdShowSpectatorView() {
  dsdMpStandby = true;
  dsdFlippedCells = new Set();
  const nonActiveTeam   = dsdCurrentTeam === 0 ? 1 : 0;
  const labelEl         = document.getElementById('dsd-spectator-label');
  const teamTextClass   = nonActiveTeam === 0 ? 'text-cyan-700' : 'text-indigo-800';
  labelEl.className     = `${teamTextClass} text-xs font-semibold uppercase tracking-widest`;
  labelEl.textContent   = `${dsdTeamNames[nonActiveTeam].toUpperCase()} — WATCHING`;
  dsdRenderSpectatorGrid();
  dsdRenderSpectatorHistory();
  showScreen('screen-dsd-spectator');
}

function dsdRenderSpectatorGrid() {
  const pingEl = document.getElementById('dsd-spectator-ping');
  pingEl.textContent = dsdPingClue
    ? `${dsdPingClue.toUpperCase()} — ${dsdPingNumber}`
    : 'Waiting for Sonar Ping…';

  const revealedColour = {
    0:      'bg-cyan-200 text-cyan-900',
    1:      'bg-indigo-200 text-indigo-900',
    urchin: 'bg-red-100 text-red-600',
    mine:   'bg-red-200 text-red-900',
  };
  const grid = document.getElementById('dsd-spectator-grid');
  grid.innerHTML = dsdGrid.map((cell, i) => {
    const wlen  = cell.word.length;
    const wFont = wlen > 12 ? 'text-[8px]' : wlen > 9 ? 'text-[9px]' : 'text-[10px]';
    if (cell.revealed) {
      const col   = revealedColour[cell.role] || 'bg-stone-200 text-stone-400';
      const emoji = { mine: '💣', urchin: '💥' }[cell.role] ?? '⚓';
      return `<div class="h-[52px] ${col} opacity-60 rounded-lg flex items-center justify-center px-1 overflow-hidden"><span class="text-xl">${emoji}</span></div>`;
    }
    // Unrevealed: show ? by default; tap to peek word (toggle via dsdFlippedCells)
    const peeked = dsdFlippedCells.has(i);
    const inner  = peeked
      ? `<span class="${wFont} font-semibold uppercase text-center leading-tight whitespace-normal break-words">${cell.word}</span>`
      : `<span class="text-stone-400 text-base font-bold">?</span>`;
    return `<div data-spectator-idx="${i}" class="h-[52px] bg-stone-100 text-stone-700 rounded-lg flex items-center justify-center px-1 overflow-hidden cursor-pointer active:scale-95 transition-transform duration-100">${inner}</div>`;
  }).join('');

  // Wire tap-to-peek on unrevealed cells
  grid.querySelectorAll('[data-spectator-idx]').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.spectatorIdx, 10);
      dsdFlippedCells.has(idx) ? dsdFlippedCells.delete(idx) : dsdFlippedCells.add(idx);
      dsdRenderSpectatorGrid();
    });
  });
}

function dsdRenderSpectatorHistory() {
  const histEl = document.getElementById('dsd-spectator-history');
  if (!dsdTurnLog.length) {
    histEl.innerHTML = '<p class="text-stone-400 text-sm italic text-center mt-2">Waiting for first ping…</p>';
    return;
  }
  histEl.innerHTML = dsdTurnLog.slice().reverse().map(entry => {
    const teamClass = entry.team === 0 ? 'text-cyan-700' : 'text-indigo-800';
    const outcomes  = (entry.outcomes || []).map(o => `<span class="text-xs text-stone-500">${o.word} — ${o.label}</span>`).join('<br>');
    return `<div class="border-b border-stone-100 px-1 py-2">
      <p class="text-xs text-stone-400 mb-0.5"><span class="${teamClass} font-semibold">${entry.teamName}</span> · D${entry.deployment}</p>
      <p class="font-bold text-stone-800 text-sm">${entry.ping.toUpperCase()} — ${entry.pingNumber}</p>
      ${outcomes ? `<div class="mt-0.5 flex flex-col gap-0">${outcomes}</div>` : ''}
    </div>`;
  }).join('');
}

function dsdRenderCaptainGrid() {
  const label = document.getElementById('dsd-captain-label');
  const tag   = document.getElementById('dsd-captain-tag');
  const grid  = document.getElementById('dsd-captain-grid');
  const team  = dsdCurrentTeam;
  const teamTextClass = team === 0 ? 'text-cyan-700' : 'text-indigo-800';
  label.className   = `${teamTextClass} text-xs font-semibold uppercase tracking-widest`;
  label.textContent = `${dsdTeamNames[team].toUpperCase()} — DEPLOYMENT ${dsdDeployment}`;
  tag.textContent   = `Captain: ${dsdCaptainName[team]}`;
  // Update legend — bold active team; mine swatch colour reflects danger level; sync filter opacity
  [0, 1].forEach(t => {
    const span = document.getElementById(`dsd-legend-team${t}`);
    if (!span) return;
    span.textContent = dsdTeamNames[t];
    span.className   = t === team ? 'font-bold text-stone-800' : 'font-medium';
  });
  const mineSwatch = document.getElementById('dsd-legend-mine-swatch');
  if (mineSwatch) {
    mineSwatch.className = `inline-block w-3 h-3 rounded-sm flex-shrink-0 ${dsdDangerLevel === 'nuclear' ? 'bg-red-900' : 'bg-red-600'}`;
  }
  document.querySelectorAll('.dsd-legend-key').forEach(btn => {
    const raw  = btn.dataset.role;
    const role = raw === '0' ? 0 : raw === '1' ? 1 : raw;
    btn.classList.toggle('opacity-40', dsdCaptainFilter.has(role));
  });
  // Update transmit button colour to match active team
  document.getElementById('btn-dsd-transmit').className = dsdTeamBtnClass(team);

  // Corner-bracket reticle for own-team cells (target crosshair feel)
  const reticle = `<span class="absolute top-0.5 left-0.5 w-2 h-2 border-t-2 border-l-2 border-white/50 pointer-events-none"></span><span class="absolute top-0.5 right-0.5 w-2 h-2 border-t-2 border-r-2 border-white/50 pointer-events-none"></span><span class="absolute bottom-0.5 left-0.5 w-2 h-2 border-b-2 border-l-2 border-white/50 pointer-events-none"></span><span class="absolute bottom-0.5 right-0.5 w-2 h-2 border-b-2 border-r-2 border-white/50 pointer-events-none"></span>`;

  grid.innerHTML = dsdGrid.map((cell, i) => {
    const wlen = cell.word.length;
    const wFont = wlen > 12 ? 'text-[8px]' : wlen > 9 ? 'text-[9px]' : 'text-[10px]';

    // Jammer override (Sylly Mode) — render as placing team's colour with amber ring
    const isJammer = dsdSyllyMode && i === dsdJammers[1 - team]; // opponent's jammer on our grid
    if (isJammer) {
      const jammerBg = team === 0 ? 'bg-cyan-700' : 'bg-indigo-800';
      const filterCls = dsdCaptainFilter.has('jammer') ? 'opacity-20' : '';
      return `<div class="relative h-[52px] ${jammerBg} ${filterCls} ring-2 ring-amber-400 rounded-lg flex items-center justify-center ${wFont} font-semibold uppercase text-center px-1 leading-tight text-amber-300 overflow-hidden"><span class="whitespace-nowrap overflow-hidden">${cell.word}</span><span class="absolute top-0.5 right-0.5 text-[11px] font-bold text-amber-400">⚡</span></div>`;
    }

    // Revealed cells — emoji replaces word; tap to peek at original word (never filtered)
    if (cell.revealed) {
      const emoji = cell.role === 'mine' ? '💣' : cell.role === 'urchin' ? '💥' : '⚓';
      return `<div class="relative h-[52px] bg-stone-900 opacity-40 rounded-lg flex items-center justify-center px-1 cursor-pointer overflow-hidden" data-revealed="1"><span class="emoji-view text-lg">${emoji}</span><span class="word-view hidden line-through ${wFont} text-white/70 whitespace-nowrap">${cell.word}</span></div>`;
    }

    // Own-team unrevealed — solid vibrant block with corner reticle
    if (cell.role === team) {
      const solidBg = team === 0 ? 'bg-cyan-700 text-white' : 'bg-indigo-800 text-white';
      const filterCls = dsdCaptainFilter.has(team) ? 'opacity-20' : '';
      return `<div class="relative h-[52px] ${solidBg} ${filterCls} rounded-lg flex items-center justify-center ${wFont} font-semibold uppercase text-center px-1 leading-tight overflow-hidden">${reticle}<span class="whitespace-nowrap overflow-hidden">${cell.word}</span></div>`;
    }

    // Non-team unrevealed — light tint of role colour; own-team pops by contrast
    let bgClass;
    if (cell.role === 'mine') {
      bgClass = 'bg-red-200 text-red-900 dsd-mine-pulse';
    } else if (cell.role === 'urchin') {
      bgClass = 'bg-red-100 text-red-600';
    } else {
      bgClass = team === 0 ? 'bg-indigo-200 text-indigo-900' : 'bg-cyan-100 text-cyan-900';
    }
    const filterCls = dsdCaptainFilter.has(cell.role) ? 'opacity-20' : '';
    return `<div class="relative h-[52px] ${bgClass} ${filterCls} rounded-lg flex items-center justify-center ${wFont} font-semibold uppercase text-center px-1 leading-tight overflow-hidden"><span class="whitespace-nowrap overflow-hidden">${cell.word}</span></div>`;
  }).join('');
}

function dsdTransmitPing() {
  const wordInput = document.getElementById('dsd-ping-word');
  const numInput  = document.getElementById('dsd-ping-number');
  const errEl     = document.getElementById('dsd-ping-error');
  const word = wordInput.value.trim();
  const num  = parseInt(numInput.value);
  errEl.classList.add('hidden');
  if (!word || /\s/.test(word)) {
    errEl.textContent = 'One word only — no spaces.';
    errEl.classList.remove('hidden');
    return;
  }
  if (word.length === 1) {
    errEl.textContent = 'Single-letter clues aren\'t allowed.';
    errEl.classList.remove('hidden');
    return;
  }
  if (isNaN(num) || num < 1 || num > 9) {
    errEl.textContent = 'Number must be 1–9.';
    errEl.classList.remove('hidden');
    return;
  }
  const normPing = normaliseWord(word);
  const conflict = dsdGrid.find(cell => {
    if (cell.revealed) return false;
    const nw = normaliseWord(cell.word);
    return nw === normPing || nw.includes(normPing) || normPing.includes(nw);
  });
  if (conflict) {
    errEl.textContent = `"${word}" is too close to a grid word.`;
    errEl.classList.remove('hidden');
    return;
  }
  const repeated = dsdTurnLog.some(t => normaliseWord(t.ping) === normPing);
  if (repeated) {
    errEl.textContent = `"${word}" has already been used this operation.`;
    errEl.classList.remove('hidden');
    return;
  }
  dsdPingClue   = word;
  dsdPingNumber = num;
  dsdSequence   = [];
  playSonarPing();

  if (window.syllyMultiplayerMode !== 'single') {
    if (window.syllyMultiplayerMode === 'client') {
      // Client captain: send to Host; Host will broadcast crew-active SYNC to standby device
      mpLockSync();
      mpSendEnvelope({ type: 'ACTION', payload: {
        action: 'DSD_PING_TRANSMIT', word, num,
        team: dsdCurrentTeam, deployment: dsdDeployment,
      }});
      mpUnlockSync(); // captain moves on immediately; crew submit is a separate action
      if (window.mpLobbyStyle === 'team') {
        // TLM: pass device to crew before sequence input
        dsdShowPassGate({
          heading:  `Pass to ${dsdTeamNames[dsdCurrentTeam]} Crew`,
          subtext:  `${word.toUpperCase()} — ${num} · Confirm the sequence.`,
          ctaLabel: `We're Ready`,
          teamIdx:  dsdCurrentTeam,
          onConfirm: () => { dsdMpStandby = false; dsdShowCrew(); },
        });
      } else {
        dsdMpStandby = false;
        dsdShowCrew();
      }
      return;
    }
    // Host captain: broadcast SYNC so standby device shows spectator, then handle crew transition
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'DSD_CREW_ACTIVE', word, num, team: dsdCurrentTeam,
    }});
    if (window.mpLobbyStyle === 'team') {
      // TLM: pass device to crew before sequence input
      dsdShowPassGate({
        heading:  `Pass to ${dsdTeamNames[dsdCurrentTeam]} Crew`,
        subtext:  `${word.toUpperCase()} — ${num} · Confirm the sequence.`,
        ctaLabel: `We're Ready`,
        teamIdx:  dsdCurrentTeam,
        onConfirm: () => { dsdMpStandby = false; dsdShowCrew(); },
      });
    } else {
      dsdMpStandby = false;
      dsdShowCrew();
    }
    return;
  }

  const teamName = dsdTeamNames[dsdCurrentTeam];
  dsdShowPassGate({
    heading: `Pass to ${teamName} Crew`,
    subtext: `${teamName} — your sequence awaits`,
    ctaLabel: `We're Ready`,
    teamIdx: dsdCurrentTeam,
    onConfirm: dsdShowCrew
  });
}

function dsdShowCrew() {
  dsdFlippedCells = new Set(); // reset flip state for this crew selection phase
  showScreen('screen-dsd-crew');
  dsdRenderCrewGrid();
}

function dsdRenderCrewGrid() {
  const labelEl = document.getElementById('dsd-crew-label');
  const teamTextClass = dsdCurrentTeam === 0 ? 'text-cyan-700' : 'text-indigo-800';
  labelEl.className   = `${teamTextClass} text-xs font-semibold uppercase tracking-widest`;
  labelEl.textContent = dsdTeamNames[dsdCurrentTeam].toUpperCase() + ' CREW';
  document.getElementById('dsd-ping-display').textContent =
    `${dsdPingClue.toUpperCase()} — ${dsdPingNumber}`;
  const grid = document.getElementById('dsd-crew-grid');
  grid.innerHTML = dsdGrid.map((cell, i) => {
    const seqPos = dsdSequence.indexOf(i);
    const badge  = seqPos !== -1
      ? `<span class="absolute top-0.5 right-0.5 w-4 h-4 bg-cyan-700 text-white text-[8px] font-bold rounded-full flex items-center justify-center leading-none">${seqPos + 1}</span>`
      : '';
    const revealedColour = {
      0:      'bg-cyan-200 text-cyan-900',
      1:      'bg-indigo-200 text-indigo-900',
      urchin: 'bg-red-100 text-red-600',
      mine:   'bg-red-200 text-red-900',
    };
    const wlen  = cell.word.length;
    const wFont = wlen > 12 ? 'text-[8px]' : wlen > 9 ? 'text-[9px]' : 'text-[10px]';
    if (cell.revealed) {
      const col     = revealedColour[cell.role] || 'bg-stone-200 text-stone-400';
      const emoji   = { mine: '💣', urchin: '💥' }[cell.role] ?? '⚓';
      const flipped = dsdFlippedCells.has(i);
      return `<div class="relative h-[52px] ${col} opacity-60 rounded-lg flex items-center justify-center px-1 cursor-pointer overflow-hidden" data-idx="${i}" data-revealed="1"><span class="${flipped ? 'hidden' : ''} text-xl">${emoji}</span><span class="${flipped ? '' : 'hidden'} ${wFont} font-semibold uppercase line-through leading-tight text-center whitespace-nowrap">${cell.word}</span></div>`;
    }
    const colour = seqPos !== -1 ? 'bg-cyan-100 text-cyan-800 ring-2 ring-cyan-500' : 'bg-stone-100 text-stone-700';
    return `<div class="relative h-[52px] ${colour} rounded-lg flex items-center justify-center ${wFont} font-semibold uppercase text-center px-1 leading-tight cursor-pointer active:scale-95 transition-transform duration-100 overflow-hidden whitespace-nowrap" data-idx="${i}">${cell.word}${badge}</div>`;
  }).join('');
  const execBtn = document.getElementById('btn-dsd-crew-execute');
  execBtn.disabled = dsdSequence.length === 0;
  execBtn.className = dsdTeamBtnClass(dsdCurrentTeam) + ' disabled:opacity-40 disabled:pointer-events-none';
  // Ping banner colour matches active team
  const banner = document.getElementById('dsd-ping-banner');
  if (banner) {
    banner.className = dsdCurrentTeam === 1
      ? 'px-4 py-2 bg-indigo-50 border-b border-indigo-100 flex-shrink-0'
      : 'px-4 py-2 bg-cyan-50 border-b border-cyan-100 flex-shrink-0';
  }
  const pingDisplay = document.getElementById('dsd-ping-display');
  if (pingDisplay) {
    pingDisplay.className = dsdCurrentTeam === 1
      ? 'text-indigo-800 font-bold text-sm text-center'
      : 'text-cyan-700 font-bold text-sm text-center';
  }
}

function dsdOpenDisarmOverlay() {
  const list = document.getElementById('dsd-disarm-list');
  list.innerHTML = dsdSequence
    .map(i => `<li class="font-semibold">${dsdGrid[i].word}</li>`)
    .join('');
  document.getElementById('dsd-confirm-disarm').style.display = 'flex';
}

async function dsdShowExecution() {
  dsdFlippedCells = new Set(); // reset flip state for this execution phase
  showScreen('screen-dsd-execution');
  dsdTurnOutcomes = [];
  document.getElementById('dsd-execution-log').innerHTML = '';
  document.getElementById('dsd-execution-footer').classList.add('hidden');
  document.getElementById('btn-dsd-execution-next').className = dsdTeamBtnClass(dsdCurrentTeam);
  dsdRenderExecutionGrid();
  dsdUpdateValourDisplay();
  dsdRenderInGameHistory('exec');
  let turnEnded = false;
  for (let i = 0; i < dsdSequence.length; i++) {
    const idx = dsdSequence[i];
    dsdRenderExecutionGrid(idx);   // highlight pending tile
    await dsdDelay(400); // pre-reveal pause so player can see which tile is next
    if (dsdSyllyMode && idx === dsdJammers[1 - dsdCurrentTeam]) {
      await dsdFlashJammer(idx); // 700ms ⚡ before hull thud fires in resolve
    }
    const ended = dsdResolveHit(idx);
    dsdRenderExecutionGrid();      // resolved — tile now shows role colour
    dsdAppendExecutionLog(dsdTurnOutcomes[dsdTurnOutcomes.length - 1]);
    dsdUpdateValourDisplay();
    await dsdDelay(300); // post-resolve pause before moving to next tile
    if (ended) { turnEnded = true; break; }
  }
  document.getElementById('dsd-execution-footer').classList.remove('hidden');

  // Lobby Mode: Host broadcasts updated grid + scores after execution completes
  if (window.syllyMultiplayerMode === 'host') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action:   'DSD_EXECUTION_RESULT',
      grid:     dsdGrid.map(c => ({ ...c })),
      valour:   [...dsdValour],
      outcomes: [...dsdTurnOutcomes],
      turnLog:  dsdTurnLog.map(e => ({ ...e, outcomes: [...(e.outcomes || [])] })),
      team:     dsdCurrentTeam,
    }});
    mpUnlockSync();
  }
}

function dsdRenderExecutionGrid(pendingIdx = -1) {
  const grid = document.getElementById('dsd-execution-grid');
  if (!grid) return;
  const colours = {
    0:      'bg-cyan-700 text-white',
    1:      'bg-indigo-800 text-white',
    urchin: 'bg-red-300 text-red-900',
    mine:   dsdDangerLevel === 'nuclear' ? 'bg-red-900 text-white' : 'bg-red-600 text-white',
  };
  grid.innerHTML = dsdGrid.map((cell, i) => {
    if (cell.revealed) {
      const col     = colours[cell.role] || 'bg-stone-300 text-stone-600';
      const emoji   = { mine: '💣', urchin: '💥' }[cell.role] ?? '⚓';
      const flipped = dsdFlippedCells.has(i);
      return `<div class="h-[52px] ${col} rounded-lg flex items-center justify-center px-1 cursor-pointer" data-idx="${i}" data-revealed="1"><span class="${flipped ? 'hidden' : ''} text-xl">${emoji}</span><span class="${flipped ? '' : 'hidden'} text-[10px] font-semibold uppercase line-through leading-tight text-center opacity-80">${cell.word}</span></div>`;
    }
    if (i === pendingIdx) {
      return `<div class="h-[52px] bg-cyan-100 text-cyan-800 ring-2 ring-cyan-400 rounded-lg flex items-center justify-center text-xs font-semibold uppercase text-center px-1 leading-tight">⚡</div>`;
    }
    return `<div class="h-[52px] bg-stone-100 text-stone-700 rounded-lg flex items-center justify-center text-xs font-semibold uppercase text-center px-1 leading-tight">${cell.word}</div>`;
  }).join('');
}

function dsdAppendExecutionLog(outcome) {
  if (!outcome) return;
  const log = document.getElementById('dsd-execution-log');
  if (!log) return;
  const n = dsdTurnOutcomes.length;
  const isPos  = outcome.vp > 0;
  const isNeg  = outcome.vp < 0;
  const colCls = isPos ? 'text-cyan-700' : (isNeg ? 'text-red-600' : 'text-stone-500');
  const item = document.createElement('div');
  item.className = 'flex items-center gap-2 text-xs py-0.5';
  item.innerHTML = `
    <span class="font-bold text-stone-400 w-4 text-right shrink-0">${n}.</span>
    <span class="font-semibold text-stone-700 uppercase">${outcome.word}</span>
    <span class="${colCls} font-medium ml-auto shrink-0">${outcome.label}</span>`;
  log.appendChild(item);
  log.scrollTop = log.scrollHeight;
}

function dsdDelay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function dsdFlashJammer(idx) {
  const cell = document.getElementById('dsd-execution-grid')?.querySelector(`[data-idx="${idx}"]`);
  if (!cell) return;
  cell.className = 'h-[52px] bg-amber-400 rounded-lg flex items-center justify-center text-3xl';
  cell.textContent = '⚡';
  await dsdDelay(700); // flash before resolve redraws the cell
}

function dsdUpdateValourDisplay() {
  const el = document.getElementById('dsd-valour-display');
  if (!el) return;
  el.innerHTML = `
    <div class="flex justify-around">
      <div class="text-center">
        <p class="text-xs text-stone-400 uppercase tracking-wide">${dsdTeamNames[0]}</p>
        <p class="text-2xl font-bold text-stone-800">${dsdValour[0]}</p>
      </div>
      <div class="text-center">
        <p class="text-xs text-stone-400 uppercase tracking-wide">${dsdTeamNames[1]}</p>
        <p class="text-2xl font-bold text-stone-800">${dsdValour[1]}</p>
      </div>
    </div>`;
}

function dsdRenderInGameHistory(mode) {
  const wrapId  = mode === 'captain' ? 'dsd-captain-history' : 'dsd-exec-history';
  const prefix  = mode === 'captain' ? 'dsd-cap-hist'        : 'dsd-exec-hist';
  const wrapper = document.getElementById(wrapId);
  if (!wrapper) return;
  if (!dsdTurnLog.length) { wrapper.classList.add('hidden'); return; }
  wrapper.classList.remove('hidden');

  const deployments = [...new Set(dsdTurnLog.map(t => t.deployment))].sort((a, b) => a - b);
  const page  = Math.min(dsdHistoryPage, deployments.length - 1);
  const dep   = deployments[page];
  const turns = dsdTurnLog.filter(t => t.deployment === dep);

  document.getElementById(`${prefix}-prev`).disabled = page === 0;
  document.getElementById(`${prefix}-next`).disabled = page === deployments.length - 1;

  document.getElementById(`${prefix}-card`).innerHTML = turns.map(t => {
    const teamCls  = t.team === 0 ? 'text-cyan-700' : 'text-indigo-800';
    const outcomes = mode === 'exec' && t.outcomes?.length
      ? ` — ${t.outcomes.map(o => o.label).join(', ')}`
      : '';
    return `<div class="flex items-baseline gap-1.5 text-[10px] text-stone-400 leading-snug">
      <span class="${teamCls} font-semibold shrink-0">${t.teamName}</span>
      <span class="opacity-60 shrink-0">D${t.deployment}:</span>
      <span class="font-semibold text-stone-600 shrink-0">${t.ping.toUpperCase()} (${t.pingNumber})</span>
      ${outcomes ? `<span class="opacity-70 ml-auto shrink-0 text-right">${outcomes}</span>` : ''}
    </div>`;
  }).join('');
}

function dsdShowSabotage(placingTeam) {
  showScreen('screen-dsd-sabotage');
  dsdRenderSabotageGrid(placingTeam);
}

// ── Scoring & turn logic ──────────────────────────────────────────────────────

function dsdResolveHit(gridIdx) {
  const cell = dsdGrid[gridIdx];
  cell.revealed = true;
  const { role, word } = cell;
  const me = dsdCurrentTeam, them = 1 - me;
  if (dsdSyllyMode && gridIdx === dsdJammers[them]) { // opponent's jammer placed on our grid
    dsdValour[me] -= 5;
    playHullThud();
    dsdJammers[them] = -1;
    dsdTurnOutcomes.push({ word, role: 'jammer', vp: -5, label: 'Jammer! −5' });
    return true;
  }
  if (role === me) {
    dsdValour[me] += 10;
    playSonarPing();
    dsdTurnOutcomes.push({ word, role, vp: +10, label: `${dsdTeamNames[me]} Payload +10` });
    return false;
  }
  if (role === them) {
    dsdValour[them] += 10;
    playBoing();
    dsdTurnOutcomes.push({ word, role, vp: +10, label: `${dsdTeamNames[them]} Payload (them) +10` });
    return dsdHazardControl.enemy;
  }
  if (role === 'urchin') {
    dsdValour[me] -= 5;
    playHullThud();
    dsdTurnOutcomes.push({ word, role, vp: -5, label: 'Urchin! −5' });
    return dsdHazardControl.urchin;
  }
  if (role === 'mine') {
    if (dsdDangerLevel === 'nuclear') {
      dsdValour[me] -= 1000;
      playAbyssThud();
      dsdTurnOutcomes.push({ word, role, vp: -1000, label: 'NUCLEAR MINE ☢️' });
      dsdTurnLog.push({                          // commit turn before bypassing dsdAdvanceTurn
        deployment: dsdDeployment,
        team: me,
        teamName: dsdTeamNames[me],
        captainName: dsdCaptainName[me],
        ping: dsdPingClue,
        pingNumber: dsdPingNumber,
        outcomes: [...dsdTurnOutcomes],
      });
      // Nuclear Mine is terminal and bypasses dsdAdvanceTurn() — the only other
      // DSD_GAMEOVER broadcaster. Broadcast here so the non-active spectator/standby
      // device isn't stranded (it only receives DSD_EXECUTION_RESULT otherwise).
      if (window.syllyMultiplayerMode === 'host') {
        mpSendEnvelope({ type: 'SYNC', payload: {
          action: 'DSD_GAMEOVER',
          valour: [...dsdValour],
          grid:   dsdGrid.map(c => ({ ...c })),
          turnLog: dsdTurnLog,
        }});
      }
      setTimeout(() => dsdShowGameover(), 2600); // 2600ms matches playAbyssThud() decay
      return true;
    }
    dsdValour[me] -= 20;
    playHullThud();
    dsdTurnOutcomes.push({ word, role, vp: -20, label: 'Mine! −20' });
    return dsdHazardControl.mine;
  }
  return false;
}

function dsdAdvanceTurn() {
  const justFinished = dsdCurrentTeam;
  dsdTurnLog.push({
    deployment: dsdDeployment,
    team: justFinished,
    teamName: dsdTeamNames[justFinished],
    captainName: dsdCaptainName[justFinished],
    ping: dsdPingClue,
    pingNumber: dsdPingNumber,
    outcomes: [...dsdTurnOutcomes],
  });
  dsdHistoryPage = dsdDeployment; // auto-navigate carousel to the deployment just completed
  dsdTurnOutcomes = [];
  dsdCurrentTeam = 1 - dsdCurrentTeam;
  if (dsdCurrentTeam === dsdFirstTeam) {
    dsdDeployment++;
    if (dsdSyllyMode && dsdDeployment >= 2) {
      dsdRevertUpgradedMines(); // clean roles before drift so shuffle sees ground truth
      dsdApplyDrift();
    }
  }
  dsdPingClue = ''; dsdPingNumber = 0; dsdSequence = [];
  if (dsdCheckVictory()) {
    if (window.syllyMultiplayerMode === 'host') {
      mpSendEnvelope({ type: 'SYNC', payload: {
        action: 'DSD_GAMEOVER',
        valour: [...dsdValour],
        grid:   dsdGrid.map(c => ({ ...c })),
        turnLog: dsdTurnLog,
      }});
    }
    return;
  }
  if (dsdSyllyMode && dsdDeployment >= 2) {
    const placingTeam = justFinished;
    dsdRevertUpgradedMines();
    dsdShowPassGate({
      heading: `Pass to ${dsdCaptainName[placingTeam] || dsdTeamNames[placingTeam]}`,
      subtext: 'Silent Running: the Captain sabotages in secret.',
      ctaLabel: 'Deploy Jammer',
      teamIdx: placingTeam,
      onConfirm: () => dsdShowSabotage(placingTeam),
    });
    return;
  }
  dsdShowCaptain();
}

function dsdCheckVictory() {
  for (let t = 0; t < 2; t++) {
    const allRevealed = dsdGrid.filter(c => c.role === t).every(c => c.revealed);
    if (allRevealed) { dsdShowGameover(); return true; }
  }
  return false;
}

function dsdShowGameover() {
  showScreen('screen-dsd-gameover');
  dsdHistoryIdx = 0;
  dsdRenderGameover();
  dsdRenderGameoverGrid();
  dsdRenderTurnLog();
}

function dsdRenderGameover() {
  const v0 = dsdValour[0], v1 = dsdValour[1];
  const winnerEl = document.getElementById('dsd-winner-display');
  if (v0 > v1)       winnerEl.textContent = dsdTeamNames[0] + ' wins!';
  else if (v1 > v0)  winnerEl.textContent = dsdTeamNames[1] + ' wins!';
  else               winnerEl.textContent = "It's a draw!";
  document.getElementById('dsd-final-scores').innerHTML = `
    <div class="flex justify-around">
      <div class="text-center">
        <p class="text-xs text-stone-400 uppercase tracking-wide font-medium">${dsdTeamNames[0]}</p>
        <p class="text-3xl font-bold ${v0 >= v1 ? 'text-cyan-700' : 'text-stone-500'}">${v0}</p>
        <p class="text-xs text-stone-400 mt-0.5">Valour</p>
      </div>
      <div class="text-center">
        <p class="text-xs text-stone-400 uppercase tracking-wide font-medium">${dsdTeamNames[1]}</p>
        <p class="text-3xl font-bold ${v1 >= v0 ? 'text-cyan-700' : 'text-stone-500'}">${v1}</p>
        <p class="text-xs text-stone-400 mt-0.5">Valour</p>
      </div>
    </div>`;
  document.getElementById('dsd-deployment-count').textContent =
    `Completed in ${dsdDeployment} deployment${dsdDeployment !== 1 ? 's' : ''}.`;
}

function dsdRenderGameoverGrid() {
  const grid = document.getElementById('dsd-gameover-grid');
  if (!grid) return;
  const colours = {
    0:      'bg-cyan-700 text-white',
    1:      'bg-indigo-800 text-white',
    urchin: 'bg-red-300 text-red-900',
    mine:   dsdDangerLevel === 'nuclear' ? 'bg-red-900 text-white' : 'bg-red-600 text-white',
  };
  grid.innerHTML = dsdGrid.map(cell => {
    const col  = colours[cell.role] || 'bg-stone-300 text-stone-600';
    const word = cell.revealed
      ? `<span class="line-through opacity-70">${cell.word}</span>`
      : cell.word;
    return `<div class="h-[44px] ${col} rounded-lg flex items-center justify-center text-[9px] font-semibold uppercase text-center px-1 leading-tight">${word}</div>`;
  }).join('');
}

function dsdRenderTurnLog() {
  const deployments = [...new Set(dsdTurnLog.map(t => t.deployment))].sort((a, b) => a - b);
  const total = deployments.length;
  const indicator = document.getElementById('dsd-history-indicator');
  const card      = document.getElementById('dsd-history-card');
  const prevBtn   = document.getElementById('dsd-history-prev');
  const nextBtn   = document.getElementById('dsd-history-next');
  if (total === 0) {
    card.innerHTML = '<p class="text-stone-400 text-sm text-center py-4">No deployments recorded.</p>';
    indicator.textContent = '';
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    return;
  }
  dsdHistoryIdx = Math.max(0, Math.min(dsdHistoryIdx, total - 1));
  const dep   = deployments[dsdHistoryIdx];
  const turns = dsdTurnLog.filter(t => t.deployment === dep);
  indicator.textContent = `Deployment ${dsdHistoryIdx + 1} / ${total}`;
  prevBtn.disabled = dsdHistoryIdx === 0;
  nextBtn.disabled = dsdHistoryIdx === total - 1;
  card.innerHTML = turns.map(t => {
    const outcomes = t.outcomes.map(o =>
      `<div class="text-xs text-stone-500 pl-3">${o.word} — ${o.label}</div>`
    ).join('');
    return `
      <div class="flex flex-col gap-0.5 py-2 border-b border-stone-100 last:border-0">
        <div class="flex items-center justify-between">
          <span class="font-semibold text-stone-800 text-sm">${t.teamName}</span>
          <span class="text-xs text-stone-400">Capt: ${t.captainName}</span>
        </div>
        <div class="text-xs text-stone-500 font-medium">⚓ "${t.ping.toUpperCase()}" — ${t.pingNumber}</div>
        ${outcomes || '<div class="text-xs text-stone-400 pl-3">No outcomes recorded.</div>'}
      </div>`;
  }).join('');
}

// ── State reset (called by resetToLobby in engine.js) ────────────────────────
function dsdResetState() {
  dsdValour        = [0, 0];
  dsdGrid          = [];
  dsdCurrentTeam   = 0;
  dsdFirstTeam     = 0;
  dsdDeployment    = 0;
  dsdPingClue      = '';
  dsdPingNumber    = 0;
  dsdSequence      = [];
  dsdJammers       = [-1, -1];
  dsdUpgradedMines = [];
  dsdTurnOutcomes  = [];
  dsdTurnLog       = [];
  dsdCaptainFilter = new Set();
  dsdFlippedCells  = new Set();
  dsdHistoryPage   = 0;
}

// ── Sylly Mode helpers ────────────────────────────────────────────────────────

function dsdRevertUpgradedMines() {
  dsdUpgradedMines.forEach(idx => { if (!dsdGrid[idx].revealed) dsdGrid[idx].role = 'urchin'; });
  dsdUpgradedMines = [];
}

function dsdApplyDrift() {
  // Words stay fixed in position — only role assignments shuffle among unrevealed cells
  const unrevealed = dsdGrid.map((c, i) => i).filter(i => !dsdGrid[i].revealed);
  const roles = shuffle(unrevealed.map(i => dsdGrid[i].role));
  unrevealed.forEach((idx, n) => { dsdGrid[idx].role = roles[n]; });
}

function dsdRenderSabotageGrid(placingTeam) {
  let selectedIdx = -1;
  const opponent  = 1 - placingTeam;
  const confirmBtn = document.getElementById('btn-dsd-sabotage-confirm');
  confirmBtn.disabled = true;
  const label    = document.getElementById('dsd-sabotage-label');
  const grid     = document.getElementById('dsd-sabotage-grid');
  const teamName = dsdTeamNames[placingTeam] || 'Team';

  const opponentPayloadsLeft = dsdGrid.filter(c => !c.revealed && c.role === opponent).length;
  const upgradeMode = opponentPayloadsLeft <= 2;

  const sabColours = {
    0:      'bg-cyan-700 text-white',
    1:      'bg-indigo-800 text-white',
    urchin: 'bg-red-100 text-red-600',
    mine:   dsdDangerLevel === 'nuclear' ? 'bg-red-900 text-white' : 'bg-red-600 text-white',
  };

  function isTappable(cell) {
    if (cell.revealed) return false;
    return upgradeMode ? cell.role === 'urchin' : cell.role === opponent;
  }

  if (!upgradeMode) {
    label.innerHTML = `<strong>${teamName}</strong>: tap an enemy Payload to plant your Jammer — triggering it costs them 5 Valour and ends their turn.`;
    confirmBtn.textContent = 'Plant Jammer';
    confirmBtn.onclick = () => {
      if (selectedIdx === -1) return;
      dsdJammers[placingTeam] = selectedIdx;
      dsdShowCaptain();
    };
  } else {
    const urchinsLeft = dsdGrid.filter(c => !c.revealed && c.role === 'urchin').length;
    label.innerHTML = urchinsLeft > 0
      ? `<strong>${teamName}</strong>: enemy is nearly out — upgrade an Urchin to a ${dsdDangerLevel === 'nuclear' ? 'Nuclear' : 'Pressure'} Mine instead.`
      : `<strong>${teamName}</strong>: enemy is nearly out, and no Urchins remain. Skip or carry on.`;
    confirmBtn.textContent = 'Upgrade Urchin';
    confirmBtn.onclick = () => {
      if (selectedIdx === -1) return;
      dsdGrid[selectedIdx].role = 'mine';
      dsdUpgradedMines.push(selectedIdx);
      dsdShowCaptain();
    };
  }

  function render() {
    grid.innerHTML = dsdGrid.map((cell, i) => {
      if (cell.revealed) {
        const col   = sabColours[cell.role] || 'bg-stone-200';
        const emoji = { mine: '💣', urchin: '💥' }[cell.role] ?? '⚓';
        return `<div class="h-[52px] ${col} opacity-30 rounded-lg flex items-center justify-center text-xl">${emoji}</div>`;
      }
      if (!isTappable(cell)) {
        const baseCls = sabColours[cell.role] || 'bg-stone-100 text-stone-700';
        return `<div class="h-[52px] ${baseCls} opacity-20 rounded-lg flex items-center justify-center text-[10px] font-semibold uppercase text-center px-1 leading-tight">${cell.word}</div>`;
      }
      const selected = i === selectedIdx;
      const baseCls  = sabColours[cell.role] || 'bg-stone-100 text-stone-700';
      const cellCls  = selected ? 'bg-amber-300 ring-2 ring-amber-500 text-stone-800' : baseCls;
      return `<div class="h-[52px] ${cellCls} rounded-lg flex items-center justify-center text-[10px] font-semibold uppercase text-center px-1 leading-tight cursor-pointer active:scale-95 transition-transform duration-100" data-sab="${i}">${cell.word}</div>`;
    }).join('');
  }

  render();
  grid.onclick = function(e) {
    const tile = e.target.closest('[data-sab]');
    if (!tile) return;
    const idx = parseInt(tile.dataset.sab);
    if (!isTappable(dsdGrid[idx])) return;
    selectedIdx = (selectedIdx === idx) ? -1 : idx;
    confirmBtn.disabled = selectedIdx === -1;
    render();
  };
}

// ── [?] Help ─────────────────────────────────────────────────────────────────

function dsdShowHelpTip(emoji, heading, tip) {
  document.getElementById('dsd-help-tip-emoji').textContent   = emoji;
  document.getElementById('dsd-help-tip-heading').textContent = heading;
  document.getElementById('dsd-help-tip-text').textContent    = tip;
  document.getElementById('dsd-help-tip-overlay').style.display = 'flex';
}

// ── Settings ─────────────────────────────────────────────────────────────────

function dsdOpenSettings() {
  const overlay = document.getElementById('dsd-settings-overlay');
  overlay.querySelector('.overlay-data-inner').scrollTop = 0;
  dsdSyncSettingsPills();
  dsdSyncHazardPills();
  dsdSetToggle('btn-dsd-planning-toggle', dsdStrategicPlanning);
  dsdSetToggle('btn-dsd-sylly-toggle', dsdSyllyMode);
  overlay.style.display = 'flex';
}

function dsdSyncSettingsPills() {
  document.querySelectorAll('#dsd-sea-state-pills .pill').forEach(btn => {
    btn.classList.toggle('pill-active-cyan', btn.dataset.val === dsdSeaState);
  });
  document.querySelectorAll('#dsd-danger-pills .pill').forEach(btn => {
    btn.classList.toggle('pill-active-cyan', btn.dataset.val === dsdDangerLevel);
  });
}

function dsdSyncHazardPills() {
  document.querySelectorAll('#dsd-hazard-pills .pill').forEach(btn => {
    btn.classList.toggle('pill-active-cyan', !!dsdHazardControl[btn.dataset.hazard]);
  });
}

function dsdSetToggle(id, on) {
  const btn = document.getElementById(id);
  btn.textContent = on ? 'ON' : 'OFF';
  const onClass = 'game-toggle-on-cyan';
  btn.className = on ? `${onClass} shrink-0` : 'game-toggle-off shrink-0';
}

function dsdTeamBtnClass(teamIdx) {
  const base = 'min-h-14 w-full rounded-2xl active:scale-95 text-white text-xl font-semibold transition-all duration-150';
  return teamIdx === 1
    ? `${base} bg-indigo-800 hover:bg-indigo-900`
    : `${base} bg-cyan-700 hover:bg-cyan-800`;
}

// ── Lobby button ──────────────────────────────────────────────────────────────
document.getElementById('btn-dsd').addEventListener('click', () => {
  playLaunch();
  activeGameId = 'dsd';
  dsdShowMenu();
});

// ── Menu navigation ───────────────────────────────────────────────────────────
document.getElementById('btn-dsd-menu-play').addEventListener('click', () => {
  playLaunch();
  mpShowModeScreen('dsd');
});
document.getElementById('btn-dsd-menu-howto').addEventListener('click', () => {
  playPillClick();
  const overlay = document.getElementById('dsd-how-to-overlay');
  overlay.querySelector('.overlay-data-inner').scrollTop = 0;
  overlay.style.display = 'flex';
});
document.getElementById('btn-dsd-howto-done').addEventListener('click', () => {
  playDone();
  document.getElementById('dsd-how-to-overlay').style.display = 'none';
});
document.getElementById('btn-dsd-menu-settings').addEventListener('click', () => {
  playPillClick();
  dsdOpenSettings();
});
document.getElementById('btn-dsd-menu-back').addEventListener('click', () => {
  playExit();
  resetToLobby();
});

// ── Settings overlay ──────────────────────────────────────────────────────────
document.getElementById('dsd-sea-state-pills').addEventListener('click', e => {
  const btn = e.target.closest('.pill[data-val]');
  if (!btn) return;
  playPillClick();
  dsdSeaState = btn.dataset.val;
  dsdSyncSettingsPills();
});
document.getElementById('dsd-danger-pills').addEventListener('click', e => {
  const btn = e.target.closest('.pill[data-val]');
  if (!btn) return;
  playPillClick();
  dsdDangerLevel = btn.dataset.val;
  dsdSyncSettingsPills();
});
document.getElementById('dsd-hazard-pills').addEventListener('click', e => {
  const btn = e.target.closest('.pill[data-hazard]');
  if (!btn) return;
  const hazard = btn.dataset.hazard;
  dsdHazardControl[hazard] = !dsdHazardControl[hazard];
  playPillClick();
  dsdSyncHazardPills();
});
document.getElementById('btn-dsd-planning-toggle').addEventListener('click', () => {
  dsdStrategicPlanning = !dsdStrategicPlanning;
  dsdSetToggle('btn-dsd-planning-toggle', dsdStrategicPlanning);
  playPillClick();
});
document.getElementById('btn-dsd-sylly-toggle').addEventListener('click', () => {
  dsdSyllyMode = !dsdSyllyMode;
  dsdSyllyMode ? playSyllyOn() : playSyllyOff();
  dsdSetToggle('btn-dsd-sylly-toggle', dsdSyllyMode);
});
document.getElementById('btn-dsd-settings-done').addEventListener('click', () => {
  playDone();
  document.getElementById('dsd-settings-overlay').style.display = 'none';
});

// ── Setup navigation ──────────────────────────────────────────────────────────
document.getElementById('btn-dsd-setup-back').addEventListener('click', () => {
  playWhoosh();
  dsdShowMenu();
});
document.getElementById('btn-dsd-setup-next').addEventListener('click', () => {
  dsdShowPlayers();
});
document.getElementById('dsd-ppt-pills').addEventListener('click', e => {
  const btn = e.target.closest('.pill[data-val]');
  if (!btn) return;
  playPillClick();
  dsdPlayersPerTeam = parseInt(btn.dataset.val);
  dsdSyncPptPills();
  dsdRenderPlayerInputs();
});
document.getElementById('dsd-team-name-0').addEventListener('input', dsdUpdateTeamHeadings);
document.getElementById('dsd-team-name-1').addEventListener('input', dsdUpdateTeamHeadings);

// ── Players navigation ────────────────────────────────────────────────────────
document.getElementById('btn-dsd-players-back').addEventListener('click', () => {
  playWhoosh();
  dsdShowSetup();
});
document.getElementById('btn-dsd-players-next').addEventListener('click', () => {
  dsdValidatePlayers();
});

// ── Strategic Planning briefing ───────────────────────────────────────────────
document.getElementById('btn-dsd-briefing-deploy').addEventListener('click', () => {
  playLaunch();
  dsdShowCaptain();
});

// ── [?] Help buttons ──────────────────────────────────────────────────────────
document.querySelectorAll('.btn-dsd-help-open').forEach(btn => {
  btn.addEventListener('click', () => {
    playDone();
    document.getElementById('dsd-how-to-overlay').querySelector('.overlay-data-inner').scrollTop = 0;
    document.getElementById('dsd-how-to-overlay').style.display = 'flex';
  });
});
document.getElementById('btn-dsd-captain-tip')?.addEventListener('click', () => {
  dsdShowHelpTip('⚓', 'Sonar Ping', 'Enter one word clue + a number (how many payloads it covers, 1–9).');
});
document.getElementById('btn-dsd-help-tip-close')?.addEventListener('click', () => {
  playDone();
  document.getElementById('dsd-help-tip-overlay').style.display = 'none';
});

// ── Captain grid — click-to-reveal original word on emoji'd cells ─────────────
document.getElementById('dsd-captain-grid').addEventListener('click', e => {
  const cell = e.target.closest('[data-revealed]');
  if (!cell) return;
  cell.querySelector('.emoji-view')?.classList.toggle('hidden');
  cell.querySelector('.word-view')?.classList.toggle('hidden');
});

// ── Execution grid — flip revealed cells between emoji and word ───────────────
document.getElementById('dsd-execution-grid').addEventListener('click', e => {
  const cell = e.target.closest('[data-revealed]');
  if (!cell) return;
  const idx = parseInt(cell.dataset.idx);
  dsdFlippedCells.has(idx) ? dsdFlippedCells.delete(idx) : dsdFlippedCells.add(idx);
  cell.querySelector('span:first-child')?.classList.toggle('hidden');
  cell.querySelector('span:last-child')?.classList.toggle('hidden');
});

// ── Mid-game forward navigation (stubs — replaced in Step 5) ─────────────────
document.getElementById('btn-dsd-transmit').addEventListener('click', () => {
  dsdTransmitPing();
});
document.getElementById('dsd-crew-grid').addEventListener('click', e => {
  const tile = e.target.closest('[data-idx]');
  if (!tile) return;
  const idx = parseInt(tile.dataset.idx);
  if (dsdGrid[idx].revealed) {
    dsdFlippedCells.has(idx) ? dsdFlippedCells.delete(idx) : dsdFlippedCells.add(idx);
    tile.querySelector('span:first-child')?.classList.toggle('hidden');
    tile.querySelector('span:last-child')?.classList.toggle('hidden');
    return;
  }
  const pos = dsdSequence.indexOf(idx);
  if (pos !== -1) {
    dsdSequence.splice(pos, 1);
  } else if (dsdSequence.length < dsdPingNumber + 1) {
    dsdSequence.push(idx);
  }
  dsdRenderCrewGrid();
});
document.getElementById('btn-dsd-crew-execute').addEventListener('click', () => {
  if (dsdSequence.length === 0) return;
  if (dsdMpStandby) return; // standby device: ignore
  dsdOpenDisarmOverlay();
});
document.getElementById('btn-dsd-disarm-confirm').addEventListener('click', () => {
  document.getElementById('dsd-confirm-disarm').style.display = 'none';
  if (window.syllyMultiplayerMode === 'client' && dsdCurrentTeam === mpMyPlayerIdx) {
    // Client's crew submits sequence to Host for execution
    mpLockSync();
    mpSendEnvelope({ type: 'ACTION', payload: {
      action:   'DSD_SEQUENCE_SUBMIT',
      sequence: [...dsdSequence],
      team:     dsdCurrentTeam,
    }});
    // Show execution screen locally (Host will confirm via SYNC)
    dsdShowExecution();
    return;
  }
  dsdShowExecution();
});
document.getElementById('btn-dsd-disarm-cancel').addEventListener('click', () => {
  document.getElementById('dsd-confirm-disarm').style.display = 'none';
});
document.getElementById('btn-dsd-execution-next').addEventListener('click', () => {
  dsdAdvanceTurn();
});
document.getElementById('btn-dsd-sabotage-skip').addEventListener('click', () => {
  dsdShowCaptain();
});

// ── Quit overlay ──────────────────────────────────────────────────────────────
document.querySelectorAll('.btn-dsd-quit-open').forEach(btn =>
  btn.addEventListener('click', () => {
    document.getElementById('dsd-quit-overlay').style.display = 'flex';
  })
);
document.getElementById('btn-dsd-quit-confirm').addEventListener('click', () => {
  playExit();
  document.getElementById('dsd-quit-overlay').style.display = 'none';
  dsdResetState();
  dsdShowMenu();
});
document.getElementById('btn-dsd-quit-cancel').addEventListener('click', () => {
  document.getElementById('dsd-quit-overlay').style.display = 'none';
});

// ── Gameover ──────────────────────────────────────────────────────────────────
document.getElementById('btn-dsd-gameover-exit').addEventListener('click', () => {
  playExit();
  resetToLobby();
});
document.getElementById('btn-dsd-new-operation').addEventListener('click', () => {
  const confirmBtn = document.getElementById('btn-dsd-new-op-confirm');
  if (window.syllyMultiplayerMode === 'host') {
    confirmBtn.textContent = 'Restart in Lobby';
  } else if (window.syllyMultiplayerMode === 'client') {
    confirmBtn.textContent = 'Leave Session';
  } else {
    confirmBtn.textContent = 'New Operation';
  }
  document.getElementById('dsd-new-op-overlay').style.display = 'flex';
});
document.getElementById('btn-dsd-new-op-confirm').addEventListener('click', () => {
  playLaunch();
  document.getElementById('dsd-new-op-overlay').style.display = 'none';
  if (window.syllyMultiplayerMode !== 'single') {
    mpReturnToLobby();
    return;
  }
  dsdResetState();
  dsdShowSetup();
});
document.getElementById('btn-dsd-new-op-cancel').addEventListener('click', () => {
  document.getElementById('dsd-new-op-overlay').style.display = 'none';
});
document.getElementById('dsd-history-prev').addEventListener('click', () => {
  if (dsdHistoryIdx > 0) { dsdHistoryIdx--; dsdRenderTurnLog(); }
});
document.getElementById('dsd-history-next').addEventListener('click', () => {
  const deployments = [...new Set(dsdTurnLog.map(t => t.deployment))];
  if (dsdHistoryIdx < deployments.length - 1) { dsdHistoryIdx++; dsdRenderTurnLog(); }
});

// ── Legend filter — tap to grey out a role on the captain grid ────────────────
document.querySelectorAll('.dsd-legend-key').forEach(btn => {
  btn.addEventListener('click', () => {
    playPillClick();
    const raw  = btn.dataset.role;
    const role = raw === '0' ? 0 : raw === '1' ? 1 : raw;
    if (dsdCaptainFilter.has(role)) {
      dsdCaptainFilter.delete(role);
      btn.classList.remove('opacity-40');
    } else {
      dsdCaptainFilter.add(role);
      btn.classList.add('opacity-40');
    }
    dsdRenderCaptainGrid();
  });
});
document.getElementById('btn-dsd-legend-showall').addEventListener('click', () => {
  playPillClick();
  dsdCaptainFilter.clear();
  document.querySelectorAll('.dsd-legend-key').forEach(b => b.classList.remove('opacity-40'));
  dsdRenderCaptainGrid();
});

// ── In-game history carousel navigation ──────────────────────────────────────
document.getElementById('dsd-cap-hist-prev')?.addEventListener('click', () => {
  if (dsdHistoryPage > 0) { dsdHistoryPage--; dsdRenderInGameHistory('captain'); }
});
document.getElementById('dsd-cap-hist-next')?.addEventListener('click', () => {
  const deps = [...new Set(dsdTurnLog.map(t => t.deployment))];
  if (dsdHistoryPage < deps.length - 1) { dsdHistoryPage++; dsdRenderInGameHistory('captain'); }
});
document.getElementById('dsd-exec-hist-prev')?.addEventListener('click', () => {
  if (dsdHistoryPage > 0) { dsdHistoryPage--; dsdRenderInGameHistory('exec'); }
});
document.getElementById('dsd-exec-hist-next')?.addEventListener('click', () => {
  const deps = [...new Set(dsdTurnLog.map(t => t.deployment))];
  if (dsdHistoryPage < deps.length - 1) { dsdHistoryPage++; dsdRenderInGameHistory('exec'); }
});

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('#screen-dsd-menu .btn-open-sound').forEach(btn => {
    btn.addEventListener('click', openSoundOverlay);
  });
});
