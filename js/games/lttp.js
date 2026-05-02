// ═══════════════════════════════════════════════════════════════════════════
// Late To The Party — Plugin
// Depends on: engine.js (showScreen, playSuccess, playBoing, playLaunch,
//             playExit, playDone, playPillClick, playSyllyOn, playSyllyOff,
//             shuffle, normaliseWord, isMuted, activeGameId)
// ═══════════════════════════════════════════════════════════════════════════

// ── LTTP Settings (persist between games) ───────────────────────────────────
let lttpPlayerCount = 4;
let lttpDifficulty  = 'local';   // 'local' = d2 places | 'secret' = d3 places
let lttpJokerMode   = false;

// ── LTTP Roles & Grid ────────────────────────────────────────────────────────
let lttpPlayerNames   = [];
let lttpStrayIdx      = -1;
let lttpJokerIdx      = -1;       // -1 when Sylly Mode off
let lttpGridLocations = [];       // [string × 16] all cells on the map
let lttpAddressIdx    = -1;       // index of the real address in lttpGridLocations
let lttpHighlights    = new Set();// grid indices currently shown to IC
let lttpFakeTargets   = [];       // [idx, idx] — Joker's 2 decoy target indices

// ── LTTP Round / Lap ─────────────────────────────────────────────────────────
let lttpPlan          = 0;        // 1–4
let lttpActiveIdx     = -1;       // who holds the phone right now
let lttpLapAnswered   = new Set();// player indices who have had the phone this lap
let lttpHandoverMode  = 'chat';   // 'role' during initial reveals | 'chat' during gameplay

// ── LTTP Per-Session State ───────────────────────────────────────────────────
let lttpHistory      = [];        // [{asker, asked, plan}]
let lttpNotes        = {};        // {playerIdx: string} — private per-player scratchpad
let lttpSuspicionMap = {};        // {playerIdx: 'none'|'safe'|'sus'|'joker'}
let lttpAnnotations  = {};        // {gridIdx: 'none'|'green'|'red'} — Stray only

// ── LTTP Vote / Endgame ──────────────────────────────────────────────────────
let lttpGuessOrder   = [];        // player indices in order for the guess phase
let lttpGuessStep    = 0;         // current step through lttpGuessOrder
let lttpVotes        = {};        // {voterIdx: guessPlayerIdx} — non-Stray votes
let lttpStrayPin     = -1;        // grid index pinned by the Stray
let lttpScores       = [];        // [number × N] final scores
let lttpPlanLog      = [];        // [{plan, highlights: [...]}] for gameover carousel
let lttpPlanLogIdx   = 0;

// ── LTTP Decoy pool (used across narrowing steps) ────────────────────────────
let lttpDecoys       = [];        // indices of current non-address highlights

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS LISTENERS
// ═══════════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {

  // ── Lobby → LTTP Menu ──────────────────────────────────────────────────────
  document.getElementById('btn-lttp').addEventListener('click', () => {
    activeGameId = 'lttp';
    playLaunch();
    showScreen('screen-lttp-menu');
  });

  // ── Menu buttons ───────────────────────────────────────────────────────────
  document.getElementById('btn-lttp-menu-play').addEventListener('click', () => {
    playLaunch();
    showScreen('screen-lttp-setup');
    lttpSyncSetup();
  });
  document.getElementById('btn-lttp-menu-how-to').addEventListener('click', () => {
    playDone();
    const ov = document.getElementById('lttp-how-to-overlay');
    ov.querySelector('.overlay-data-inner').scrollTop = 0;
    ov.style.display = 'flex';
  });
  document.getElementById('btn-lttp-menu-settings').addEventListener('click', () => {
    playDone();
    const ov = document.getElementById('lttp-settings-overlay');
    ov.querySelector('.overlay-data-inner').scrollTop = 0;
    ov.style.display = 'flex';
  });
  document.getElementById('btn-lttp-menu-back').addEventListener('click', () => {
    playExit();
    activeGameId = null;
    resetToLobby();
  });

  // ── Setup screen ───────────────────────────────────────────────────────────
  document.getElementById('btn-lttp-setup-back').addEventListener('click', () => {
    playExit();
    showScreen('screen-lttp-menu');
  });
  document.querySelectorAll('[data-lttp-player-count]').forEach(btn => {
    btn.addEventListener('click', () => {
      playPillClick();
      lttpPlayerCount = parseInt(btn.dataset.lttpPlayerCount);
      document.querySelectorAll('[data-lttp-player-count]').forEach(b => {
        b.className = `pill${parseInt(b.dataset.lttpPlayerCount) === lttpPlayerCount ? ' pill-active-red' : ''}`;
      });
      lttpSyncPlayerRows();
    });
  });
  document.getElementById('btn-lttp-setup-confirm').addEventListener('click', () => {
    const names = [];
    for (let i = 1; i <= lttpPlayerCount; i++) {
      const val = (document.getElementById(`lttp-player-${i}`)?.value || '').trim();
      names.push(val || `Player ${i}`);
    }
    lttpPlayerNames = names;
    playLaunch();
    lttpStartGame();
  });

  // ── Settings overlay ───────────────────────────────────────────────────────
  document.querySelectorAll('[data-lttp-difficulty]').forEach(btn => {
    btn.addEventListener('click', () => {
      playPillClick();
      lttpDifficulty = btn.dataset.lttpDifficulty;
      document.querySelectorAll('[data-lttp-difficulty]').forEach(b => {
        b.className = `pill${b.dataset.lttpDifficulty === lttpDifficulty ? ' pill-active-red' : ''}`;
      });
    });
  });
  document.getElementById('btn-lttp-joker-toggle').addEventListener('click', () => {
    lttpJokerMode = !lttpJokerMode;
    const btn = document.getElementById('btn-lttp-joker-toggle');
    btn.textContent = lttpJokerMode ? 'ON' : 'OFF';
    btn.className   = lttpJokerMode ? 'sylly-toggle-on shrink-0' : 'sylly-toggle-off shrink-0';
    lttpJokerMode ? playSyllyOn() : playSyllyOff();
  });
  document.getElementById('btn-lttp-settings-done').addEventListener('click', () => {
    playDone();
    document.getElementById('lttp-settings-overlay').style.display = 'none';
  });

  // ── How-to overlay close ───────────────────────────────────────────────────
  document.getElementById('btn-lttp-how-to-done').addEventListener('click', () => {
    playDone();
    document.getElementById('lttp-how-to-overlay').style.display = 'none';
  });

  // ── Quit overlay ───────────────────────────────────────────────────────────
  document.querySelectorAll('.btn-lttp-quit-open').forEach(btn => {
    btn.addEventListener('click', () => {
      playExit();
      document.getElementById('lttp-quit-overlay').style.display = 'flex';
    });
  });
  document.getElementById('btn-lttp-quit-cancel').addEventListener('click', () => {
    playDone();
    document.getElementById('lttp-quit-overlay').style.display = 'none';
  });
  document.getElementById('btn-lttp-quit-confirm').addEventListener('click', () => {
    playExit();
    document.getElementById('lttp-quit-overlay').style.display = 'none';
    showScreen('screen-lttp-menu');
  });

  // ── Map overlay close ──────────────────────────────────────────────────────
  document.getElementById('btn-lttp-map-done').addEventListener('click', () => {
    playDone();
    document.getElementById('lttp-map-overlay').style.display = 'none';
  });

  // ── Suspicion overlay close ────────────────────────────────────────────────
  document.getElementById('btn-lttp-suspicion-done').addEventListener('click', () => {
    playDone();
    document.getElementById('lttp-suspicion-overlay').style.display = 'none';
  });

  // ── Handover "I'm Ready" ───────────────────────────────────────────────────
  document.getElementById('btn-lttp-handover-ready').addEventListener('click', () => {
    playLaunch();
    lttpShowChat(lttpActiveIdx);
  });

  // ── Chat: map + suspicion icons ────────────────────────────────────────────
  document.getElementById('btn-lttp-chat-map').addEventListener('click', () => {
    playDone();
    lttpOpenMapOverlay();
  });
  document.getElementById('btn-lttp-chat-suspicion').addEventListener('click', () => {
    playDone();
    lttpOpenSuspicionOverlay();
  });

  // ── Guess screen: map icon (Stray can check annotations) ──────────────────
  document.getElementById('btn-lttp-guess-map').addEventListener('click', () => {
    playDone();
    lttpOpenMapOverlay();
  });

  // ── Guess "I'm Ready" (pass gate between voters) ──────────────────────────
  document.getElementById('btn-lttp-guess-ready').addEventListener('click', () => {
    playLaunch();
    lttpShowGuess(lttpGuessOrder[lttpGuessStep]);
  });

  // ── Gameover: plan log carousel ────────────────────────────────────────────
  document.getElementById('btn-lttp-log-prev').addEventListener('click', () => {
    if (lttpPlanLogIdx > 0) { lttpPlanLogIdx--; lttpRenderPlanLog(); }
  });
  document.getElementById('btn-lttp-log-next').addEventListener('click', () => {
    if (lttpPlanLogIdx < lttpPlanLog.length - 1) { lttpPlanLogIdx++; lttpRenderPlanLog(); }
  });

  // ── Gameover: New Plans ────────────────────────────────────────────────────
  document.getElementById('btn-lttp-new-plans').addEventListener('click', () => {
    playLaunch();
    showScreen('screen-lttp-setup');
    lttpSyncSetup();
  });

  // ── Gameover: ✕ and ← Back to the Box ────────────────────────────────────
  document.getElementById('btn-lttp-gameover-exit').addEventListener('click', () => {
    playExit();
    resetToLobby();
  });
  document.getElementById('btn-lttp-gameover-back').addEventListener('click', () => {
    playExit();
    resetToLobby();
  });

  // ── Briefing "Let's Go" ──────────────────────────────────────────────────
  document.getElementById('btn-lttp-briefing-go').addEventListener('click', () => {
    playLaunch();
    lttpShowChat(lttpActiveIdx);
  });

});

// ═══════════════════════════════════════════════════════════════════════════
// SETUP HELPERS
// ═══════════════════════════════════════════════════════════════════════════
function lttpSyncSetup() {
  // Restore player count pills
  document.querySelectorAll('[data-lttp-player-count]').forEach(b => {
    b.className = `pill${parseInt(b.dataset.lttpPlayerCount) === lttpPlayerCount ? ' pill-active-red' : ''}`;
  });
  // Restore saved names
  for (let i = 1; i <= 6; i++) {
    const el = document.getElementById(`lttp-player-${i}`);
    if (el) el.value = lttpPlayerNames[i - 1] || '';
  }
  lttpSyncPlayerRows();
}

function lttpSyncPlayerRows() {
  for (let i = 1; i <= 6; i++) {
    const row = document.getElementById(`lttp-player-row-${i}`);
    if (row) row.style.display = i <= lttpPlayerCount ? 'block' : 'none';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GRID BUILDER
// ═══════════════════════════════════════════════════════════════════════════
function lttpBuildGrid(allWords) {
  const diffLevel = lttpDifficulty === 'secret' ? 3 : 2;
  let pool = allWords.filter(w => w.category === 'places' && w.difficulty === diffLevel);

  // Secret Mode override
  if (typeof isSecretMode !== 'undefined' && isSecretMode &&
      typeof secretWords !== 'undefined' && secretWords.length) {
    const sub = secretWords.filter(w => w.category === 'places');
    if (sub.length >= 16) pool = sub;
  }

  if (pool.length < 16) {
    // Fallback: mix d1 places in if pool is too small
    pool = allWords.filter(w => w.category === 'places');
  }

  const picked = shuffle(pool).slice(0, 16);
  lttpGridLocations = picked.map(w => w.word);

  // Pick the address
  lttpAddressIdx = Math.floor(Math.random() * 16);

  // Build initial 6 highlights: address + 5 random decoys
  const others = lttpGridLocations.map((_, i) => i).filter(i => i !== lttpAddressIdx);
  const decoyPool = shuffle(others).slice(0, 5);
  lttpHighlights = new Set([lttpAddressIdx, ...decoyPool]);
  lttpDecoys = decoyPool; // mutable list we'll shrink during narrowing

  // Joker fake targets: 2 of those 5 decoys
  lttpFakeTargets = lttpJokerMode ? shuffle([...decoyPool]).slice(0, 2) : [];
}

// ═══════════════════════════════════════════════════════════════════════════
// ROLE ASSIGNMENT
// ═══════════════════════════════════════════════════════════════════════════
function lttpAssignRoles() {
  const indices = shuffle(lttpGridLocations.map((_, i) => i));
  // Use a player indices shuffle instead
  const playerOrder = shuffle([...Array(lttpPlayerCount).keys()]);
  lttpStrayIdx = playerOrder[0];
  lttpJokerIdx = lttpJokerMode ? playerOrder[1] : -1;
}

// ═══════════════════════════════════════════════════════════════════════════
// START GAME
// ═══════════════════════════════════════════════════════════════════════════
function lttpStartGame() {
  // Reset runtime state (preserve settings + names)
  lttpPlan        = 0;
  lttpActiveIdx   = -1;
  lttpLapAnswered = new Set();
  lttpRoleRevealIdx = 0;
  lttpHistory     = [];
  lttpNotes       = {};
  lttpSuspicionMap = {};
  lttpAnnotations  = {};
  lttpVotes        = {};
  lttpStrayPin     = -1;
  lttpScores       = [];
  lttpPlanLog      = [];
  lttpPlanLogIdx   = 0;
  lttpGuessOrder   = [];
  lttpGuessStep    = 0;
  lttpHandoverMode = 'chat';

  // Initialise suspicion map
  for (let i = 0; i < lttpPlayerCount; i++) lttpSuspicionMap[i] = 'none';

  fetch('data/words.json')
    .then(r => r.json())
    .then(allWords => {
      lttpBuildGrid(allWords);
      lttpAssignRoles();
      lttpHandoverMode = 'chat';
      lttpPlan         = 1;
      lttpLapAnswered.clear();
      lttpPlanLog.push({ plan: 1, highlights: [...lttpHighlights] });
      const first = Math.floor(Math.random() * lttpPlayerCount);
      lttpActiveIdx = first;
      lttpShowBriefing(first);
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// ROLE REVEAL SCREEN
// ═══════════════════════════════════════════════════════════════════════════
function lttpShowRoleReveal(idx) {
  lttpActiveIdx = idx;
  const name   = lttpPlayerNames[idx];
  const isStray  = idx === lttpStrayIdx;
  const isJoker  = lttpJokerMode && idx === lttpJokerIdx;

  document.getElementById('lttp-reveal-name').textContent = name;

  const badge  = document.getElementById('lttp-reveal-badge');
  const info   = document.getElementById('lttp-reveal-info');
  const grid   = document.getElementById('lttp-reveal-grid');

  if (isStray) {
    badge.textContent  = '🚨 YOU ARE LATE.';
    badge.className    = 'text-2xl font-black text-red-600 tracking-wide text-center';
    info.textContent   = 'Listen carefully. Find the address before the Uber arrives.';
    info.className     = 'text-stone-500 text-sm text-center mt-1';
    lttpRenderRevealGrid(grid, 'stray');
  } else if (isJoker) {
    badge.textContent  = '🃏 You\'re The Joker.';
    badge.className    = 'text-2xl font-black text-orange-500 tracking-wide text-center';
    info.textContent   = 'Lead the Stray to a Fake Target. Don\'t blow your cover.';
    info.className     = 'text-stone-500 text-sm text-center mt-1';
    lttpRenderRevealGrid(grid, 'joker');
  } else {
    badge.textContent  = '📍 Inner Circle.';
    badge.className    = 'text-2xl font-black text-stone-800 tracking-wide text-center';
    info.textContent   = 'The party is somewhere here. Don\'t give it away.';
    info.className     = 'text-stone-500 text-sm text-center mt-1';
    lttpRenderRevealGrid(grid, 'ic');
  }

  showScreen('screen-lttp-role-reveal');
}

function lttpRenderRevealGrid(container, role) {
  container.innerHTML = '';
  lttpGridLocations.forEach((loc, idx) => {
    const cell = document.createElement('div');
    cell.textContent = loc;
    cell.className   = 'rounded-lg p-1 text-center text-xs leading-tight hyphens-auto ' + lttpCellClass(idx, role);
    container.appendChild(cell);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// BRIEFING SCREEN (settings recap + first player callout)
// ═══════════════════════════════════════════════════════════════════════════
function lttpShowBriefing(firstIdx) {
  lttpActiveIdx = firstIdx;
  const diffLabel = lttpDifficulty === 'secret' ? 'The Secret Trip' : 'The Local Hang';
  document.getElementById('lttp-briefing-players').textContent = `👥 ${lttpPlayerCount} players`;
  document.getElementById('lttp-briefing-diff').textContent    = `🗺️ ${diffLabel}`;
  document.getElementById('lttp-briefing-joker').textContent   = `🃏 Joker Mode: ${lttpJokerMode ? 'ON' : 'OFF'}`;
  document.getElementById('lttp-briefing-first').textContent   = `📱 ${lttpPlayerNames[firstIdx]}, you're up first.`;
  showScreen('screen-lttp-briefing');
}

// HANDOVER SCREEN (pass gate between turns + plan transitions)
// ═══════════════════════════════════════════════════════════════════════════
function lttpShowHandover(toIdx, transitionMsg) {
  lttpActiveIdx = toIdx;
  const name = lttpPlayerNames[toIdx];
  document.getElementById('lttp-handover-name').textContent = name;
  document.getElementById('lttp-handover-sub').textContent  = transitionMsg
    ? transitionMsg
    : 'Don\'t peek — hand it over.';
  showScreen('screen-lttp-handover');
}

// ═══════════════════════════════════════════════════════════════════════════
// CHAT SCREEN (main interrogation hub)
// ═══════════════════════════════════════════════════════════════════════════
function lttpShowChat(playerIdx) {
  lttpActiveIdx = playerIdx;
  const name = lttpPlayerNames[playerIdx];

  document.getElementById('lttp-chat-plan-label').textContent  = `Plan ${lttpPlan} of 4`;
  document.getElementById('lttp-chat-player-label').textContent = `IT'S ${name.toUpperCase()}'S TURN`;
  document.getElementById('lttp-chat-notes').value = lttpNotes[playerIdx] || '';

  lttpRenderPlayerList();
  lttpRenderHistory();
  showScreen('screen-lttp-chat');
  lttpOpenMapOverlay();
}

function lttpRenderPlayerList() {
  const list = document.getElementById('lttp-chat-player-list');
  list.innerHTML = '';
  for (let i = 0; i < lttpPlayerCount; i++) {
    if (i === lttpActiveIdx) continue; // can't pass to yourself
    const answered = lttpLapAnswered.has(i);
    const btn = document.createElement('button');
    btn.textContent = lttpPlayerNames[i];
    btn.className   = answered
      ? 'w-full text-left px-4 py-3 rounded-2xl bg-stone-100 text-stone-300 text-base font-medium cursor-not-allowed'
      : 'w-full text-left px-4 py-3 rounded-2xl bg-white border border-stone-200 text-stone-800 text-base font-medium active:scale-95 transition-transform duration-100 shadow-sm';
    if (!answered) {
      btn.addEventListener('click', () => lttpSelectPlayer(i));
    }
    list.appendChild(btn);
  }
}

function lttpRenderHistory() {
  const feed = document.getElementById('lttp-chat-history');
  if (lttpHistory.length === 0) {
    feed.textContent = 'No chatter yet...';
    return;
  }
  feed.innerHTML = '';
  // Show most recent 6 entries
  const recent = lttpHistory.slice(-6).reverse();
  recent.forEach(entry => {
    const el = document.createElement('p');
    el.textContent = `${lttpPlayerNames[entry.asker]} ➡ ${lttpPlayerNames[entry.asked]}`;
    el.className   = 'text-stone-500 text-xs';
    feed.appendChild(el);
  });
}

// ── Notes auto-save ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('lttp-chat-notes').addEventListener('input', e => {
    lttpNotes[lttpActiveIdx] = e.target.value;
  });
});

// ── Player selection — core lap logic ────────────────────────────────────────
function lttpSelectPlayer(targetIdx) {
  playLaunch();
  lttpHistory.push({ asker: lttpActiveIdx, asked: targetIdx, plan: lttpPlan });
  lttpLapAnswered.add(lttpActiveIdx);

  // Check if lap is complete (all players except active have been covered)
  const allGone = [...Array(lttpPlayerCount).keys()]
    .filter(i => i !== targetIdx)
    .every(i => lttpLapAnswered.has(i) || i === lttpActiveIdx);

  // A lap is done when every player has held the phone (been in lttpLapAnswered)
  // lttpLapAnswered tracks who has ASKED (held phone). Lap ends when N-1 players have gone
  // (the final target will become active next; when they ask, they close the loop)
  // Simpler: lap ends when all N players will have had the phone after this pass.
  // After this pass, targetIdx becomes active. They haven't asked yet.
  // Lap is complete when lttpLapAnswered.size === lttpPlayerCount - 1
  // (everyone except the last target has already held the phone this lap)
  const lapComplete = lttpLapAnswered.size === lttpPlayerCount - 1;

  if (lapComplete) {
    // targetIdx is the last person in the lap — they complete the lap by holding the phone
    // but they don't get another question; the lap closes.
    lttpLapAnswered.add(targetIdx);
    lttpActiveIdx = targetIdx;

    if (lttpPlan < 4) {
      lttpNarrowHighlights();
      const msg = lttpPlan <= 3
        ? `Plan ${lttpPlan - 1} complete — The Pick is narrowing. ${lttpHighlights.size} location${lttpHighlights.size !== 1 ? 's' : ''} remain.`
        : `Plan 3 complete — The Inner Circle knows. Time to find The Stray.`;
      lttpShowHandover(targetIdx, msg);
    } else {
      // Plan 4 lap complete → enter guess phase
      lttpStartGuessPhase();
    }
  } else {
    lttpShowHandover(targetIdx, null);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HIGHLIGHTS NARROWING
// ═══════════════════════════════════════════════════════════════════════════
function lttpNarrowHighlights() {
  // Save snapshot before narrowing
  lttpPlanLog.push({ plan: lttpPlan, highlights: [...lttpHighlights] });

  if (lttpPlan === 1) {
    // 6 → 3: keep address + 2 random remaining decoys
    const remaining = shuffle([...lttpDecoys]);
    const keep      = remaining.slice(0, 2);
    lttpHighlights  = new Set([lttpAddressIdx, ...keep]);
    lttpDecoys      = keep;
  } else if (lttpPlan === 2) {
    // 3 → 1: only the address remains
    lttpHighlights = new Set([lttpAddressIdx]);
    lttpDecoys     = [];
  }
  // Plan 3 → 4: no narrowing (still 1 highlight)

  lttpPlan++;
  lttpLapAnswered.clear();
}

// ═══════════════════════════════════════════════════════════════════════════
// MAP OVERLAY (role-aware)
// ═══════════════════════════════════════════════════════════════════════════
function lttpOpenMapOverlay() {
  const container = document.getElementById('lttp-map-grid');
  const role      = lttpActiveIdx === lttpStrayIdx ? 'stray'
                  : (lttpJokerMode && lttpActiveIdx === lttpJokerIdx) ? 'joker'
                  : 'ic';

  const headerEl = document.getElementById('lttp-map-header');
  if (role === 'stray')      headerEl.textContent = '🚨 Your Map — Mark What You Know';
  else if (role === 'joker') headerEl.textContent = '🃏 The Joker\'s View';
  else                        headerEl.textContent = '📍 Inner Circle — Party Options';

  container.innerHTML = '';
  lttpGridLocations.forEach((loc, idx) => {
    const cell = document.createElement('div');
    cell.textContent = loc;
    cell.className   = 'rounded-lg p-1 text-center text-xs leading-tight hyphens-auto cursor-pointer select-none ' + lttpCellClass(idx, role);

    if (role === 'stray') {
      // Tap to cycle annotation
      cell.addEventListener('click', () => {
        const current = lttpAnnotations[idx] || 'none';
        const next    = current === 'none' ? 'green' : current === 'green' ? 'red' : 'none';
        lttpAnnotations[idx] = next;
        cell.className = 'rounded-lg p-1 text-center text-xs leading-tight hyphens-auto cursor-pointer select-none ' + lttpCellClass(idx, 'stray');
        playPillClick();
      });
    }

    container.appendChild(cell);
  });

  const ov = document.getElementById('lttp-map-overlay');
  ov.style.display = 'flex';
}

function lttpCellClass(idx, role) {
  if (role === 'stray') {
    const ann = lttpAnnotations[idx] || 'none';
    if (ann === 'green') return 'bg-green-100 text-green-800 font-medium';
    if (ann === 'red')   return 'bg-red-50 text-red-300 line-through';
    return 'bg-stone-100 text-stone-600';
  }
  if (role === 'joker') {
    if (idx === lttpAddressIdx) return 'bg-yellow-200 text-yellow-800 font-bold ring-2 ring-yellow-400'; // gold
    if (lttpFakeTargets.includes(idx)) return 'bg-orange-100 text-orange-700 font-medium ring-1 ring-orange-300'; // purple/orange
    if (lttpHighlights.has(idx)) return 'bg-red-100 text-red-700';
    return 'bg-stone-100 text-stone-400';
  }
  // IC view
  if (lttpHighlights.has(idx)) {
    if (lttpHighlights.size === 1) {
      // Plan 3+: single confirmed destination
      return 'bg-red-500 text-white font-bold ring-2 ring-red-700';
    }
    return 'bg-red-100 text-red-800 font-medium';
  }
  return 'bg-stone-100 text-stone-400';
}

// ═══════════════════════════════════════════════════════════════════════════
// SUSPICION OVERLAY
// ═══════════════════════════════════════════════════════════════════════════
function lttpOpenSuspicionOverlay() {
  const list = document.getElementById('lttp-suspicion-list');
  list.innerHTML = '';
  for (let i = 0; i < lttpPlayerCount; i++) {
    if (i === lttpActiveIdx) continue; // don't track yourself
    const status = lttpSuspicionMap[i] || 'none';
    const labels = { none: '—', safe: '✅ Safe', sus: '❓ Sus', joker: '🃏 Joker' };
    const colours = {
      none:  'bg-stone-100 text-stone-500',
      safe:  'bg-green-100 text-green-700',
      sus:   'bg-yellow-100 text-yellow-700',
      joker: 'bg-orange-100 text-orange-700',
    };
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between px-4 py-3 bg-white rounded-2xl shadow-sm';
    row.innerHTML = `
      <span class="text-stone-800 font-medium">${lttpPlayerNames[i]}</span>
      <span id="lttp-sus-chip-${i}" class="px-3 py-1 rounded-full text-sm font-medium ${colours[status]}">${labels[status]}</span>
    `;
    row.addEventListener('click', () => {
      const cycle = ['none', 'safe', 'sus', 'joker'];
      const cur   = lttpSuspicionMap[i] || 'none';
      lttpSuspicionMap[i] = cycle[(cycle.indexOf(cur) + 1) % cycle.length];
      playPillClick();
      lttpOpenSuspicionOverlay(); // re-render
    });
    list.appendChild(row);
  }
  document.getElementById('lttp-suspicion-overlay').style.display = 'flex';
}

// ═══════════════════════════════════════════════════════════════════════════
// GUESS PHASE (Plan 4 vote + pin)
// ═══════════════════════════════════════════════════════════════════════════
function lttpStartGuessPhase() {
  // Build pass order: all players 0 → N-1
  lttpGuessOrder = [...Array(lttpPlayerCount).keys()];
  lttpGuessStep  = 0;

  // Show first handover before first guess
  lttpShowGuessHandover(lttpGuessOrder[0]);
}

function lttpShowGuessHandover(playerIdx) {
  lttpActiveIdx = playerIdx;
  document.getElementById('lttp-guess-pass-name').textContent = lttpPlayerNames[playerIdx];
  showScreen('screen-lttp-guess');
  // Show the pass-gate state (ready button), hide the action state
  document.getElementById('lttp-guess-pass-gate').style.display  = 'flex';
  document.getElementById('lttp-guess-action').style.display     = 'none';
}

function lttpShowGuess(playerIdx) {
  lttpActiveIdx = playerIdx;
  const isStray = playerIdx === lttpStrayIdx;

  document.getElementById('lttp-guess-pass-gate').style.display = 'none';
  document.getElementById('lttp-guess-action').style.display    = 'flex';

  const header = document.getElementById('lttp-guess-action-header');
  const sub    = document.getElementById('lttp-guess-action-sub');
  const pinArea  = document.getElementById('lttp-guess-pin-area');
  const voteArea = document.getElementById('lttp-guess-vote-area');

  if (isStray) {
    header.textContent = '🚨 Find the Party.';
    sub.textContent    = 'Pin the address on the map.';
    pinArea.style.display  = 'flex';
    voteArea.style.display = 'none';
    lttpRenderPinGrid();
  } else {
    header.textContent = '🕵️ Who\'s Late?';
    sub.textContent    = 'Pick the player who doesn\'t know the address.';
    pinArea.style.display  = 'none';
    voteArea.style.display = 'flex';
    lttpRenderVoteList(playerIdx);
  }
}

function lttpRenderPinGrid() {
  const grid = document.getElementById('lttp-guess-grid');
  grid.innerHTML = '';
  lttpGridLocations.forEach((loc, idx) => {
    const cell = document.createElement('div');
    cell.textContent = loc;
    const ann = lttpAnnotations[idx] || 'none';
    let cls = 'rounded-lg p-1.5 text-center text-xs leading-tight hyphens-auto cursor-pointer active:scale-95 transition-transform border-2 ';
    if (lttpStrayPin === idx) {
      cls += 'border-red-500 bg-red-500 text-white font-bold';
    } else if (ann === 'green') {
      cls += 'border-green-300 bg-green-50 text-green-800';
    } else if (ann === 'red') {
      cls += 'border-stone-200 bg-red-50 text-red-300 line-through';
    } else {
      cls += 'border-stone-200 bg-stone-100 text-stone-600';
    }
    cell.className = cls;
    cell.addEventListener('click', () => {
      lttpStrayPin = idx;
      playPillClick();
      lttpRenderPinGrid(); // re-render to show selection
    });
    grid.appendChild(cell);
  });
}

function lttpRenderVoteList(voterIdx) {
  const list = document.getElementById('lttp-guess-vote-list');
  list.innerHTML = '';
  for (let i = 0; i < lttpPlayerCount; i++) {
    if (i === voterIdx) continue; // can't vote for yourself
    const btn = document.createElement('button');
    btn.textContent = lttpPlayerNames[i];
    const selected  = lttpVotes[voterIdx] === i;
    btn.className   = selected
      ? 'w-full text-left px-4 py-3 rounded-2xl bg-red-500 text-white text-base font-semibold active:scale-95 transition-transform shadow-sm'
      : 'w-full text-left px-4 py-3 rounded-2xl bg-white border border-stone-200 text-stone-800 text-base font-medium active:scale-95 transition-transform shadow-sm';
    btn.addEventListener('click', () => {
      lttpVotes[voterIdx] = i;
      playPillClick();
      lttpRenderVoteList(voterIdx); // re-render to show selection
    });
    list.appendChild(btn);
  }
}

// ── Confirm action button ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-lttp-guess-confirm').addEventListener('click', () => {
    const playerIdx = lttpGuessOrder[lttpGuessStep];
    const isStray   = playerIdx === lttpStrayIdx;

    // Validation
    if (isStray && lttpStrayPin === -1) return; // must pin
    if (!isStray && lttpVotes[playerIdx] === undefined) return; // must vote

    playLaunch();
    lttpGuessStep++;

    if (lttpGuessStep < lttpGuessOrder.length) {
      lttpShowGuessHandover(lttpGuessOrder[lttpGuessStep]);
    } else {
      lttpComputeAndShowGameover();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SCORING
// ═══════════════════════════════════════════════════════════════════════════
function lttpComputeAndShowGameover() {
  const N      = lttpPlayerCount;
  const scores = new Array(N).fill(0);

  // Vote scoring (always applied)
  let correctVotes = 0, incorrectVotes = 0;
  Object.entries(lttpVotes).forEach(([vStr, guess]) => {
    const v = parseInt(vStr);
    if (guess === lttpStrayIdx) {
      scores[v] += 2;
      scores[lttpStrayIdx] -= 2;
      correctVotes++;
    } else {
      scores[v] -= 2;
      scores[lttpStrayIdx] += 2;
      incorrectVotes++;
    }
  });

  // Win condition priority
  const jokerPrank    = lttpJokerMode && lttpJokerIdx >= 0 && lttpFakeTargets.includes(lttpStrayPin);
  const pinCorrect    = lttpStrayPin === lttpAddressIdx;
  const confusionBonus = incorrectVotes > correctVotes;

  let winner    = 'ic';
  let winReason = 'stray-missed';

  if (jokerPrank) {
    scores[lttpJokerIdx] += 20;
    winner    = 'joker';
    winReason = 'joker-prank';
  } else if (pinCorrect) {
    scores[lttpStrayIdx] += 10;
    winner    = 'stray';
    winReason = 'pin-correct';
  } else if (confusionBonus) {
    winner    = 'stray';
    winReason = 'confusion-bonus';
  } else {
    // IC wins — each IC member gets +5
    for (let i = 0; i < N; i++) {
      if (i !== lttpStrayIdx) scores[i] += 5;
    }
  }

  lttpScores = scores;

  // Append final Plan 4 snapshot
  lttpPlanLog.push({ plan: 4, highlights: [...lttpHighlights] });
  lttpPlanLogIdx = 0;

  lttpShowGameover(winner, winReason);
}

// ═══════════════════════════════════════════════════════════════════════════
// GAMEOVER SCREEN
// ═══════════════════════════════════════════════════════════════════════════
function lttpShowGameover(winner, winReason) {
  const address  = lttpGridLocations[lttpAddressIdx];
  const strayName = lttpPlayerNames[lttpStrayIdx];
  const pinName   = lttpGridLocations[lttpStrayPin] || '—';
  const pinRight  = lttpStrayPin === lttpAddressIdx;

  // Win banner
  const banner    = document.getElementById('lttp-gameover-banner');
  const bannerSub = document.getElementById('lttp-gameover-banner-sub');
  if (winReason === 'joker-prank') {
    banner.textContent    = `🃏 Joker Perfect Prank!`;
    bannerSub.textContent = `${lttpPlayerNames[lttpJokerIdx]} wins big. Never again.`;
    banner.className      = 'text-2xl font-black text-orange-500 text-center';
  } else if (winReason === 'pin-correct') {
    banner.textContent    = `🏃‍♂️ Made it to the party!`;
    bannerSub.textContent = `${strayName} found The Address.`;
    banner.className      = 'text-2xl font-black text-red-600 text-center';
  } else if (winReason === 'confusion-bonus') {
    banner.textContent    = `🌀 Confusion Bonus!`;
    bannerSub.textContent = `${strayName} vanished into the crowd.`;
    banner.className      = 'text-2xl font-black text-red-600 text-center';
  } else {
    banner.textContent    = `🔐 Secret Kept!`;
    bannerSub.textContent = `The Inner Circle protected the address.`;
    banner.className      = 'text-2xl font-black text-stone-800 text-center';
  }
  bannerSub.className = 'text-stone-500 text-sm text-center mt-1';

  // Reveal block
  document.getElementById('lttp-gameover-address').textContent =
    `The Address was: ${address.toUpperCase()}`;
  document.getElementById('lttp-gameover-stray').textContent =
    `The Stray was: ${strayName}`;
  document.getElementById('lttp-gameover-pin').textContent =
    `${strayName} pinned: ${pinName} ${pinRight ? '✓' : '✗'}`;

  // Votes
  const voteList = document.getElementById('lttp-gameover-votes');
  voteList.innerHTML = '';
  for (let i = 0; i < lttpPlayerCount; i++) {
    if (i === lttpStrayIdx) continue;
    const guess   = lttpVotes[i];
    const correct = guess === lttpStrayIdx;
    const el      = document.createElement('p');
    el.textContent = `${lttpPlayerNames[i]} voted: ${guess !== undefined ? lttpPlayerNames[guess] : '—'} ${correct ? '✓' : '✗'}`;
    el.className   = `text-sm ${correct ? 'text-green-600' : 'text-stone-400'}`;
    voteList.appendChild(el);
  }

  // Friendship Points tally
  const tally = document.getElementById('lttp-gameover-tally');
  tally.innerHTML = '';
  const ranked = lttpScores
    .map((s, i) => ({ i, s }))
    .sort((a, b) => b.s - a.s);
  ranked.forEach((entry, pos) => {
    const medal = pos === 0 ? '🥇' : pos === 1 ? '🥈' : pos === 2 ? '🥉' : '  ';
    const tag   = entry.i === lttpStrayIdx ? ' (Stray)' : (lttpJokerMode && entry.i === lttpJokerIdx ? ' (Joker)' : '');
    const el    = document.createElement('div');
    el.className = 'flex justify-between items-center px-4 py-2 bg-white rounded-2xl shadow-sm';
    el.innerHTML = `<span class="text-stone-800 font-medium">${medal} ${lttpPlayerNames[entry.i]}${tag}</span><span class="text-stone-500 font-semibold">${entry.s > 0 ? '+' : ''}${entry.s} pts</span>`;
    tally.appendChild(el);
  });

  // Plan log
  lttpRenderPlanLog();

  showScreen('screen-lttp-gameover');
}

function lttpRenderPlanLog() {
  if (!lttpPlanLog.length) return;
  const idx  = lttpPlanLogIdx;
  const snap = lttpPlanLog[idx];
  document.getElementById('lttp-log-plan-label').textContent =
    `Plan ${snap.plan} — ${snap.highlights.length} location${snap.highlights.length !== 1 ? 's' : ''} highlighted`;

  const grid = document.getElementById('lttp-log-grid');
  grid.innerHTML = '';
  lttpGridLocations.forEach((loc, i) => {
    const cell = document.createElement('div');
    cell.textContent = loc;
    const isHL = snap.highlights.includes(i);
    const isAddr = i === lttpAddressIdx;
    cell.className   = `rounded-lg p-1 text-center text-xs leading-tight hyphens-auto ${
      isAddr && snap.highlights.length === 1 ? 'bg-red-500 text-white font-bold' :
      isHL ? 'bg-red-100 text-red-800' : 'bg-stone-100 text-stone-400'}`;
    grid.appendChild(cell);
  });

  document.getElementById('btn-lttp-log-prev').disabled = idx === 0;
  document.getElementById('btn-lttp-log-next').disabled = idx === lttpPlanLog.length - 1;
}

// ═══════════════════════════════════════════════════════════════════════════
// TEARDOWN
// ═══════════════════════════════════════════════════════════════════════════
function resetLateToTheParty() {
  // Hide all overlays
  ['lttp-map-overlay', 'lttp-suspicion-overlay', 'lttp-settings-overlay',
   'lttp-how-to-overlay', 'lttp-quit-overlay'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  // Zero runtime state (settings + player names preserved)
  lttpPlan          = 0;
  lttpActiveIdx     = -1;
  lttpLapAnswered   = new Set();
  lttpRoleRevealIdx = 0;
  lttpStrayIdx      = -1;
  lttpJokerIdx      = -1;
  lttpGridLocations = [];
  lttpAddressIdx    = -1;
  lttpHighlights    = new Set();
  lttpFakeTargets   = [];
  lttpDecoys        = [];
  lttpHistory       = [];
  lttpNotes         = {};
  lttpSuspicionMap  = {};
  lttpAnnotations   = {};
  lttpGuessOrder    = [];
  lttpGuessStep     = 0;
  lttpHandoverMode  = 'chat';
  lttpVotes         = {};
  lttpStrayPin      = -1;
  lttpScores        = [];
  lttpPlanLog       = [];
  lttpPlanLogIdx    = 0;
}
