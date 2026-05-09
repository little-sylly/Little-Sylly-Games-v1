// ═══════════════════════════════════════════════════════════════════════════
// Late To The Party — Plugin
// Depends on: engine.js (showScreen, playSuccess, playBoing, playLaunch,
//             playExit, playDone, playPillClick, playSyllyOn, playSyllyOff,
//             shuffle, normaliseWord, isMuted, activeGameId)
// ═══════════════════════════════════════════════════════════════════════════

// ── LTTP Settings (persist between games) ───────────────────────────────────
let lttpPlayerCount = 4;
let lttpDifficulty  = 'local';   // 'local' = d1+d2 places | 'secret' = d1+d2+d3 places
let lttpJokerMode   = false;
let lttpGroupVote   = true;
let lttpSmallTalk   = true;      // true = Guided (ON) | false = Pro (OFF)

// ── LTTP Small Talk matrix ───────────────────────────────────────────────────
const LTTP_SMALL_TALK = {
  What: [{ emoji: '👔', label: 'Wear'      }, { emoji: '🎒', label: 'Items'     }, { emoji: '🎨', label: 'Sights'   }],
  When: [{ emoji: '⌚', label: 'Arrival'   }, { emoji: '🚪', label: 'Departure' }, { emoji: '⏳', label: 'Duration' }],
  How:  [{ emoji: '🚗', label: 'Travel'    }, { emoji: '💰', label: 'Price'     }, { emoji: '🎟️', label: 'Access'   }],
  Why:  [{ emoji: '🍰', label: 'Vibe'      }, { emoji: '🎯', label: 'Reason'    }, { emoji: '👥', label: 'Crowd'    }],
};

// ── LTTP Roles & Grid ────────────────────────────────────────────────────────
let lttpPlayerNames   = [];
let lttpStrayIdx      = -1;
let lttpJokerIdx      = -1;       // -1 when Sylly Mode off
let lttpGridLocations = [];       // [string × 16] all cells on the map
let lttpAddressIdx    = -1;       // index of the real address in lttpGridLocations
let lttpHighlights    = new Set();// grid indices currently shown to IC
let lttpFadedCells    = new Set();// grid indices ruled out in previous plans (shown faded)
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
let lttpPlanLog      = [];        // [{plan, highlights: [...]}] for gameover carousel
let lttpPlanLogIdx   = 0;

// ── LTTP Decoy pool (used across narrowing steps) ────────────────────────────
let lttpDecoys       = [];        // indices of current non-address highlights

// ── LTTP Contacts / Folder state ─────────────────────────────────────────────
let lttpPendingTarget  = -1;      // player index awaiting confirm modal
let lttpPendingTag     = null;    // {root, emoji, label} | null — Small Talk tag for current turn
let lttpFolderPlayerIdx = -1;     // player index currently open in folder
let lttpFolderHintIdx  = 0;       // cycles placeholder hints each folder open

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
  document.getElementById('btn-lttp-groupvote-toggle').addEventListener('click', () => {
    lttpGroupVote = !lttpGroupVote;
    const btn = document.getElementById('btn-lttp-groupvote-toggle');
    btn.textContent = lttpGroupVote ? 'ON' : 'OFF';
    btn.className   = lttpGroupVote ? 'sylly-toggle-on shrink-0' : 'sylly-toggle-off shrink-0';
    playPillClick();
  });
  document.getElementById('btn-lttp-smalltalk-toggle').addEventListener('click', () => {
    lttpSmallTalk = !lttpSmallTalk;
    const btn = document.getElementById('btn-lttp-smalltalk-toggle');
    btn.textContent = lttpSmallTalk ? 'ON' : 'OFF';
    btn.className   = lttpSmallTalk ? 'sylly-toggle-on shrink-0' : 'sylly-toggle-off shrink-0';
    playPillClick();
  });
  document.getElementById('btn-lttp-st-overlay-close').addEventListener('click', () => {
    playDone();
    document.getElementById('lttp-smalltalk-overlay').style.display = 'none';
    lttpPendingTag    = null;
    lttpPendingTarget = null;
  });
  document.getElementById('btn-lttp-st-overlay-send').addEventListener('click', () => {
    if (!lttpPendingTag) return;
    playLaunch();
    document.getElementById('lttp-smalltalk-overlay').style.display = 'none';
    lttpSelectPlayer(lttpPendingTarget, lttpPendingTag);
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

  // ── History overlay close ──────────────────────────────────────────────────
  document.getElementById('btn-lttp-history-close').addEventListener('click', () => {
    playDone();
    document.getElementById('lttp-history-overlay').style.display = 'none';
  });

  // ── Handover "I'm Ready" ───────────────────────────────────────────────────
  document.getElementById('btn-lttp-handover-ready').addEventListener('click', () => {
    playLaunch();
    lttpShowChat(lttpActiveIdx);
  });

  // ── Chat: carousel tab buttons ────────────────────────────────────────────
  document.getElementById('btn-lttp-tab-map').addEventListener('click', () => {
    playDone();
    lttpSnapToPane('map');
  });
  document.getElementById('btn-lttp-tab-contacts').addEventListener('click', () => {
    playDone();
    lttpSnapToPane('contacts');
  });

  // ── Chat: open full history overlay ───────────────────────────────────────
  document.getElementById('btn-lttp-open-history').addEventListener('click', () => {
    playDone();
    lttpOpenFullHistory();
  });

  // ── Guess screen: map icon (Stray can check annotations) ──────────────────
  document.getElementById('btn-lttp-guess-map').addEventListener('click', () => {
    playDone();
    lttpOpenGuessMapOverlay();
  });
  document.getElementById('btn-lttp-guess-map-close').addEventListener('click', () => {
    playDone();
    document.getElementById('lttp-guess-map-overlay').style.display = 'none';
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

  // ── Briefing "Let's Go" / "Got It" ──────────────────────────────────────
  document.getElementById('btn-lttp-briefing-go').addEventListener('click', () => {
    playLaunch();
    lttpShowChat(lttpActiveIdx);
  });

  // ── Contacts folder navigation ───────────────────────────────────────────
  document.getElementById('btn-lttp-folder-back').addEventListener('click', () => {
    playDone();
    document.getElementById('lttp-suspicion-overlay').style.display = 'none';
    lttpRenderPaneB();
  });
  document.getElementById('btn-lttp-folder-done').addEventListener('click', () => {
    playDone();
    document.getElementById('lttp-suspicion-overlay').style.display = 'none';
    lttpRenderPaneB();
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
  let pool = allWords.filter(w => w.category === 'places' && w.difficulty <= diffLevel);

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
  lttpFadedCells   = new Set();
  lttpPlanLog      = [];
  lttpPlanLogIdx   = 0;
  lttpGuessOrder      = [];
  lttpGuessStep       = 0;
  lttpHandoverMode    = 'chat';
  lttpPendingTag      = null;
  lttpFolderPlayerIdx = -1;
  lttpFolderHintIdx   = 0;

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
    info.textContent   = 'Listen carefully. Find the location before the Uber arrives.';
    info.className     = 'text-stone-500 text-sm text-center mt-1';
    lttpRenderRevealGrid(grid, 'stray');
  } else if (isJoker) {
    badge.textContent  = '🃏 You\'re The Troublemaker.';
    badge.className    = 'text-2xl font-black text-orange-500 tracking-wide text-center';
    info.textContent   = 'Lead the Friend of a Friend to a fake location. Don\'t blow your cover.';
    info.className     = 'text-stone-500 text-sm text-center mt-1';
    lttpRenderRevealGrid(grid, 'joker');
  } else {
    badge.textContent  = '📍 The Gang.';
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
  const diffLabel = lttpDifficulty === 'secret' ? 'The Secret Spot' : 'The Local Hang';
  document.getElementById('lttp-briefing-emoji').textContent   = '🎉';
  document.getElementById('lttp-briefing-heading').textContent = 'Tonight\'s Plans';
  document.getElementById('lttp-briefing-players').textContent = `👥 ${lttpPlayerCount} players`;
  document.getElementById('lttp-briefing-diff').textContent    = `🗺️ ${diffLabel}`;
  document.getElementById('lttp-briefing-joker').textContent   = `🃏 Troublemaker Mode: ${lttpJokerMode ? 'ON' : 'OFF'}`;
  document.getElementById('lttp-briefing-joker').style.display = '';
  document.getElementById('lttp-briefing-first').textContent   = `📱 ${lttpPlayerNames[firstIdx]}, you're up first.`;
  document.getElementById('lttp-briefing-btn-label').textContent = 'Let\'s Go 🚀';
  showScreen('screen-lttp-briefing');
}

function lttpShowPlanUpdate(targetIdx) {
  lttpActiveIdx = targetIdx;
  const locTexts = { 2: '🗺️ 3 locations remain.', 3: '🗺️ Location confirmed.', 4: '🗺️ Final call.' };
  document.getElementById('lttp-briefing-emoji').textContent   = '📋';
  document.getElementById('lttp-briefing-heading').textContent = 'Plans Updated';
  document.getElementById('lttp-briefing-players').textContent = `👥 ${lttpPlayerCount} players`;
  document.getElementById('lttp-briefing-diff').textContent    = locTexts[lttpPlan] || '';
  const jokerRow = document.getElementById('lttp-briefing-joker');
  if (lttpJokerMode) {
    jokerRow.textContent   = '🃏 Someone\'s stirring the pot.';
    jokerRow.style.display = '';
  } else {
    jokerRow.style.display = 'none';
  }
  document.getElementById('lttp-briefing-first').textContent     = `📱 ${lttpPlayerNames[targetIdx]}, you're up.`;
  document.getElementById('lttp-briefing-btn-label').textContent = 'Got It →';
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
  const name      = lttpPlayerNames[playerIdx];
  const isStray   = playerIdx === lttpStrayIdx;
  const isJoker   = lttpJokerMode && playerIdx === lttpJokerIdx;
  const roleLabel = isStray ? 'Friend of a Friend' : isJoker ? 'Troublemaker' : 'The Gang';

  document.getElementById('lttp-chat-plan-label').textContent   = `Plan ${lttpPlan} of 4`;
  document.getElementById('lttp-chat-player-label').textContent = `${name}'s Phone`;
  document.getElementById('lttp-chat-role-label').textContent   = roleLabel;

  lttpRenderMapPane();
  lttpRenderPaneB();
  showScreen('screen-lttp-chat');
  lttpSnapToPane('map');
}

function lttpSnapToPane(pane) {
  const onMap = pane === 'map';
  document.getElementById('lttp-pane-map').style.display      = onMap ? 'flex' : 'none';
  document.getElementById('lttp-pane-contacts').style.display = onMap ? 'none'  : 'flex';

  const mapTab      = document.getElementById('btn-lttp-tab-map');
  const contactsTab = document.getElementById('btn-lttp-tab-contacts');
  mapTab.classList.toggle('text-stone-700',     onMap);
  mapTab.classList.toggle('border-stone-700',   onMap);
  mapTab.classList.toggle('text-stone-400',     !onMap);
  mapTab.classList.toggle('border-transparent', !onMap);
  contactsTab.classList.toggle('text-stone-700',     !onMap);
  contactsTab.classList.toggle('border-stone-700',   !onMap);
  contactsTab.classList.toggle('text-stone-400',     onMap);
  contactsTab.classList.toggle('border-transparent', onMap);
}

function lttpRenderPaneB() {
  const statusLabels  = { none: '—', safe: '✅ Maybe', sus: '❓ Sus', joker: '🃏 Troublemaker' };
  const statusColours = {
    none:  'bg-stone-100 text-stone-500',
    safe:  'bg-green-100 text-green-700',
    sus:   'bg-yellow-100 text-yellow-700',
    joker: 'bg-purple-100 text-purple-700',
  };

  const isStray = lttpActiveIdx === lttpStrayIdx;
  const isJoker = lttpJokerMode && lttpActiveIdx === lttpJokerIdx;
  const role    = isStray ? 'stray' : isJoker ? 'joker' : 'ic';
  const cycles  = {
    ic:    ['none', 'safe', 'sus', 'joker'],
    joker: ['none', 'safe', 'sus'],
    stray: lttpJokerMode ? ['none', 'joker'] : [],
  };

  // ── Contacts table ──────────────────────────────────────────────────────────
  const list = document.getElementById('lttp-contacts-list');
  list.innerHTML = '';
  for (let i = 0; i < lttpPlayerCount; i++) {
    if (i === lttpActiveIdx) continue;
    const answered  = lttpLapAnswered.has(i);
    const status    = lttpSuspicionMap[i] || 'none';
    const notesText = (lttpNotes[i] || '').trim();

    const row = document.createElement('div');
    row.className = `flex items-center bg-white rounded-2xl shadow-sm px-3 py-3 min-h-[52px]${answered ? ' opacity-50' : ''}`;

    // Name column — tap → confirm modal (disabled if answered)
    const nameSpan = document.createElement('span');
    nameSpan.className = `w-1/4 font-medium text-sm truncate pr-1 ${answered ? 'text-stone-400 cursor-not-allowed' : 'text-stone-800 cursor-pointer active:scale-95 transition-transform duration-100'}`;
    nameSpan.textContent = lttpPlayerNames[i];
    if (!answered) {
      nameSpan.addEventListener('click', (e) => { e.stopPropagation(); lttpOpenConfirmModal(i); });
    }

    // Notes column — tap → open folder
    const notesSpan = document.createElement('span');
    notesSpan.className = 'w-1/2 px-2 text-xs text-stone-400 line-clamp-2 leading-snug cursor-pointer';
    notesSpan.innerHTML = notesText || '<em>No notes yet</em>';
    notesSpan.addEventListener('click', (e) => {
      e.stopPropagation();
      lttpOpenPlayerFolder(i);
    });

    // Status column — tap → cycle
    const chipWrap = document.createElement('div');
    chipWrap.className = 'w-1/4 flex justify-end';
    const chip = document.createElement('button');
    chip.className = `lttp-pane-chip px-2 py-1 rounded-full text-xs font-medium ${statusColours[status]} active:scale-90 transition-transform duration-100`;
    chip.textContent = statusLabels[status];
    const cycle = cycles[role];
    if (cycle.length > 0) {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        const cur  = lttpSuspicionMap[i] || 'none';
        const next = cycle[(cycle.indexOf(cur) + 1) % cycle.length];
        lttpSuspicionMap[i] = next;
        chip.textContent = statusLabels[next];
        chip.className   = `lttp-pane-chip px-2 py-1 rounded-full text-xs font-medium ${statusColours[next]} active:scale-90 transition-transform duration-100`;
        playPillClick();
      });
    } else {
      chip.style.pointerEvents = 'none';
    }
    chipWrap.appendChild(chip);
    row.appendChild(nameSpan);
    row.appendChild(notesSpan);
    row.appendChild(chipWrap);
    list.appendChild(row);
  }

  // ── Chatlog preview (last 4) ────────────────────────────────────────────────
  const preview = document.getElementById('lttp-chatlog-preview');
  if (lttpHistory.length === 0) {
    preview.textContent = 'No chatter yet...';
  } else {
    preview.innerHTML = '';
    lttpHistory.slice(-4).reverse().forEach(entry => {
      const el = document.createElement('p');
      const tagStr = entry.tag
        ? (entry.tag.label ? ` · ${entry.tag.root} → ${entry.tag.emoji} ${entry.tag.label}` : ` · ${entry.tag.root}`)
        : '';
      el.textContent = `${lttpPlayerNames[entry.asker]} ➡ ${lttpPlayerNames[entry.asked]}${tagStr}`;
      preview.appendChild(el);
    });
  }
}

// ── Confirm modal ─────────────────────────────────────────────────────────────
function lttpOpenConfirmModal(targetIdx) {
  lttpPendingTarget = targetIdx;
  if (lttpSmallTalk) {
    lttpOpenSmallTalkOverlay(targetIdx);
  } else {
    document.getElementById('lttp-confirm-name').textContent = lttpPlayerNames[targetIdx];
    document.getElementById('lttp-confirm-overlay').style.display = 'flex';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-lttp-confirm-send').addEventListener('click', () => {
    playLaunch();
    document.getElementById('lttp-confirm-overlay').style.display = 'none';
    lttpShowSmallTalk();
  });
  document.getElementById('btn-lttp-confirm-back').addEventListener('click', () => {
    playDone();
    document.getElementById('lttp-confirm-overlay').style.display = 'none';
  });
  // ── Folder notes auto-save ─────────────────────────────────────────────────
  document.getElementById('lttp-folder-notes').addEventListener('input', e => {
    lttpNotes[lttpFolderPlayerIdx] = e.target.value;
  });
});

// ── Player selection — core lap logic ────────────────────────────────────────
function lttpSelectPlayer(targetIdx, tag = null) {
  playLaunch();
  lttpHistory.push({ asker: lttpActiveIdx, asked: targetIdx, plan: lttpPlan, tag });
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
      lttpShowPlanUpdate(targetIdx);
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
    const nextHighlights = new Set([lttpAddressIdx, ...keep]);
    [...lttpHighlights].filter(i => !nextHighlights.has(i)).forEach(i => lttpFadedCells.add(i));
    lttpHighlights  = nextHighlights;
    lttpDecoys      = keep;
  } else if (lttpPlan === 2) {
    // 3 → 1: only the address remains
    const nextHighlights = new Set([lttpAddressIdx]);
    [...lttpHighlights].filter(i => !nextHighlights.has(i)).forEach(i => lttpFadedCells.add(i));
    lttpHighlights = nextHighlights;
    lttpDecoys     = [];
  }
  // Plan 3 → 4: no narrowing (still 1 highlight)

  lttpPlan++;
  lttpLapAnswered.clear();
}

// ═══════════════════════════════════════════════════════════════════════════
// MAP PANE (role-aware)
// ═══════════════════════════════════════════════════════════════════════════
function lttpRenderMapPane() {
  const container = document.getElementById('lttp-map-grid');
  const role      = lttpActiveIdx === lttpStrayIdx ? 'stray'
                  : (lttpJokerMode && lttpActiveIdx === lttpJokerIdx) ? 'joker'
                  : 'ic';

  const subEl = document.getElementById('lttp-map-sub');
  if (role === 'stray') {
    subEl.textContent = 'Tap cells to mark Maybe or Nope.';
  } else if (role === 'joker') {
    subEl.textContent = 'Gold is real. Purple is your decoy.';
  } else {
    subEl.textContent = 'Red cells are your remaining location options.';
  }

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
}

function lttpOpenGuessMapOverlay() {
  const container = document.getElementById('lttp-guess-map-grid');
  container.innerHTML = '';
  lttpGridLocations.forEach((loc, idx) => {
    const cell = document.createElement('div');
    cell.textContent = loc;
    cell.className   = 'rounded-lg p-1 text-center text-xs leading-tight hyphens-auto select-none ' + lttpCellClass(idx, 'stray');
    container.appendChild(cell);
  });
  document.getElementById('lttp-guess-map-overlay').style.display = 'flex';
}

function lttpCellClass(idx, role) {
  if (role === 'stray') {
    const ann = lttpAnnotations[idx] || 'none';
    if (ann === 'green') return 'bg-green-100 text-green-800 font-medium';
    if (ann === 'red')   return 'bg-red-50 text-red-300 line-through';
    if (lttpFadedCells.has(idx)) return 'bg-red-50 text-red-300 line-through';
    return 'bg-stone-100 text-stone-600';
  }
  if (role === 'joker') {
    if (idx === lttpAddressIdx) return 'bg-yellow-200 text-yellow-800 font-bold ring-2 ring-yellow-400';
    if (lttpFakeTargets.includes(idx)) return 'bg-purple-100 text-purple-700 font-medium ring-1 ring-purple-300';
    if (lttpHighlights.has(idx)) return 'bg-red-100 text-red-700';
    if (lttpFadedCells.has(idx)) return 'bg-red-50 text-red-300 line-through';
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
  if (lttpFadedCells.has(idx)) return 'bg-red-50 text-red-300 line-through';
  return 'bg-stone-100 text-stone-400';
}

// ═══════════════════════════════════════════════════════════════════════════
// FOLDER OVERLAY + FULL HISTORY
// ═══════════════════════════════════════════════════════════════════════════
function lttpOpenFullHistory() {
  const feed = document.getElementById('lttp-history-full');
  feed.innerHTML = '';
  if (lttpHistory.length === 0) {
    feed.textContent = 'No chatter yet...';
  } else {
    [...lttpHistory].reverse().forEach(entry => {
      const el = document.createElement('p');
      const tagStr = entry.tag
        ? (entry.tag.label ? ` · ${entry.tag.root} → ${entry.tag.emoji} ${entry.tag.label}` : ` · ${entry.tag.root}`)
        : '';
      el.textContent = `${lttpPlayerNames[entry.asker]} ➡ ${lttpPlayerNames[entry.asked]}${tagStr}`;
      feed.appendChild(el);
    });
  }
  document.getElementById('lttp-history-overlay').style.display = 'flex';
}

function lttpOpenPlayerFolder(playerIdx) {
  document.getElementById('lttp-suspicion-overlay').style.display = 'flex';
  lttpFolderPlayerIdx = playerIdx;
  lttpFolderHintIdx++;

  const isStray = lttpActiveIdx === lttpStrayIdx;
  const isJoker = lttpJokerMode && lttpActiveIdx === lttpJokerIdx;

  // Determine active player's role for cycle + hints
  const role = isStray ? 'stray' : isJoker ? 'joker' : 'ic';

  // Status cycle definitions per role
  const cycles = {
    ic:    ['none', 'safe', 'sus', 'joker'],
    joker: ['none', 'safe', 'sus'],
    stray: lttpJokerMode ? ['none', 'joker'] : [],
  };
  const statusLabels = { none: '—', safe: '✅ Maybe', sus: '❓ Sus', joker: '🃏 Troublemaker' };
  const statusColours = {
    none:  'bg-stone-100 text-stone-500',
    safe:  'bg-green-100 text-green-700',
    sus:   'bg-yellow-100 text-yellow-700',
    joker: 'bg-purple-100 text-purple-700',
  };

  // Placeholder hints per role
  const hints = {
    stray: [
      'What did they say? Does it match the map?',
      'Any slips? Which locations kept coming up?',
      'Who\'s been too specific? Too vague?',
      'Did their answers change between conversations?',
      'Who avoided certain locations entirely?',
      'What did they claim to know — and how would they know it?',
    ],
    joker: [
      'What lie did you tell them? Keep it consistent.',
      'Did the Friend of a Friend take the bait? Track what they believe.',
      'Stick to your story. What\'s your cover here?',
      'What false trail have you been laying?',
      'Did anyone seem suspicious of you? Adjust the story.',
      'Which details of your cover have you already committed to?',
    ],
    ic: [
      'Do they seem like they know the location?',
      'Were they too specific or too vague?',
      'Could they be the one who\'s late?',
      'Did they seem nervous about certain locations?',
      'Were they fishing for information rather than sharing it?',
      'What have they said so far — does it add up?',
    ],
  };

  // Populate header
  document.getElementById('lttp-folder-name').textContent = lttpPlayerNames[playerIdx];

  // Status section
  const statusSection = document.getElementById('lttp-folder-status-section');
  const cycle = cycles[role];
  if (cycle.length === 0) {
    statusSection.style.display = 'none';
  } else {
    statusSection.style.display = 'flex';
    const cur    = lttpSuspicionMap[playerIdx] || 'none';
    const chipEl = document.getElementById('btn-lttp-folder-status');
    chipEl.textContent = statusLabels[cur] || '—';
    chipEl.className   = `px-4 py-1.5 rounded-full text-sm font-medium ${statusColours[cur] || statusColours.none}`;
    chipEl.onclick = () => {
      const cur2 = lttpSuspicionMap[playerIdx] || 'none';
      const next = cycle[(cycle.indexOf(cur2) + 1) % cycle.length];
      lttpSuspicionMap[playerIdx] = next;
      chipEl.textContent = statusLabels[next];
      chipEl.className   = `px-4 py-1.5 rounded-full text-sm font-medium ${statusColours[next]}`;
      playPillClick();
    };
  }

  // Notes + placeholder
  const notesEl = document.getElementById('lttp-folder-notes');
  notesEl.value       = lttpNotes[playerIdx] || '';
  notesEl.placeholder = hints[role][lttpFolderHintIdx % hints[role].length];

}

// ═══════════════════════════════════════════════════════════════════════════
// GUESS PHASE (Plan 4 vote + pin)
// ═══════════════════════════════════════════════════════════════════════════
function lttpStartGuessPhase() {
  lttpGuessStep = 0;

  if (lttpGroupVote) {
    // Stray pins privately first; IC/Joker vote together after
    lttpGuessOrder = [lttpStrayIdx];
  } else {
    // Individual pass-the-phone for all players
    lttpGuessOrder = [...Array(lttpPlayerCount).keys()];
  }

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
    sub.textContent    = 'Pin the location on the map.';
    pinArea.style.display  = 'flex';
    voteArea.style.display = 'none';
    lttpRenderPinGrid();
  } else {
    header.textContent = '🕵️ Who\'s Late?';
    sub.textContent    = 'Pick the player who doesn\'t know the location.';
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

function lttpShowGroupGuess() {
  let groupPick = -1;
  const list    = document.getElementById('lttp-group-guess-list');
  const confirm = document.getElementById('btn-lttp-group-guess-confirm');

  list.innerHTML = '';
  confirm.disabled  = true;
  confirm.className = 'min-h-14 w-full rounded-2xl bg-stone-300 text-white text-xl font-semibold transition-all duration-150 cursor-not-allowed';

  for (let i = 0; i < lttpPlayerCount; i++) {
    if (i === lttpStrayIdx) continue; // can't pick yourself as suspect
    const btn = document.createElement('button');
    btn.textContent = lttpPlayerNames[i];
    btn.className   = 'w-full text-left px-4 py-3 rounded-2xl bg-white border border-stone-200 text-stone-800 text-base font-medium active:scale-95 transition-transform shadow-sm';
    btn.addEventListener('click', () => {
      groupPick = i;
      playPillClick();
      // Highlight selection
      list.querySelectorAll('button').forEach(b => {
        b.className = 'w-full text-left px-4 py-3 rounded-2xl bg-white border border-stone-200 text-stone-800 text-base font-medium active:scale-95 transition-transform shadow-sm';
      });
      btn.className = 'w-full text-left px-4 py-3 rounded-2xl bg-red-500 text-white text-base font-semibold active:scale-95 transition-transform shadow-sm';
      confirm.disabled  = false;
      confirm.className = 'min-h-14 w-full rounded-2xl bg-red-500 hover:bg-red-600 active:scale-95 text-white text-xl font-semibold transition-all duration-150';
    });
    list.appendChild(btn);
  }

  confirm.onclick = () => {
    if (groupPick === -1) return;
    playLaunch();
    // Fill all non-Stray votes with the group's collective pick
    for (let i = 0; i < lttpPlayerCount; i++) {
      if (i !== lttpStrayIdx) lttpVotes[i] = groupPick;
    }
    lttpComputeAndShowGameover();
  };

  showScreen('screen-lttp-group-guess');
}

// ═══════════════════════════════════════════════════════════════════════════
// SMALL TALK — topic selection flow
// ═══════════════════════════════════════════════════════════════════════════

// Guided mode: tabbed slide-up overlay
function lttpOpenSmallTalkOverlay(targetIdx) {
  lttpPendingTag = null;
  document.getElementById('lttp-st-overlay-name').textContent = lttpPlayerNames[targetIdx];
  const sendBtn = document.getElementById('btn-lttp-st-overlay-send');
  sendBtn.disabled = true;
  sendBtn.className = 'min-h-14 w-full rounded-2xl bg-stone-200 text-stone-400 text-xl font-semibold transition-all duration-150';
  lttpRenderSmallTalkTabs();
  lttpSnapToSmallTalkTab(Object.keys(LTTP_SMALL_TALK)[0]);
  document.getElementById('lttp-smalltalk-overlay').style.display = 'flex';
}

function lttpRenderSmallTalkTabs() {
  const bar = document.getElementById('lttp-st-overlay-tabs');
  bar.innerHTML = '';
  Object.keys(LTTP_SMALL_TALK).forEach((root, i) => {
    const btn = document.createElement('button');
    btn.textContent  = root + '?';
    btn.dataset.root = root;
    btn.className = i === 0
      ? 'flex-1 py-2.5 text-sm font-semibold text-stone-700 border-b-2 border-stone-700 transition-all duration-200'
      : 'flex-1 py-2.5 text-sm font-semibold text-stone-400 border-b-2 border-transparent transition-all duration-200';
    btn.addEventListener('click', () => {
      playPillClick();
      lttpSnapToSmallTalkTab(root);
    });
    bar.appendChild(btn);
  });
}

function lttpSnapToSmallTalkTab(root) {
  document.querySelectorAll('#lttp-st-overlay-tabs button').forEach(btn => {
    const active = btn.dataset.root === root;
    btn.classList.toggle('text-stone-700',     active);
    btn.classList.toggle('border-stone-700',   active);
    btn.classList.toggle('text-stone-400',     !active);
    btn.classList.toggle('border-transparent', !active);
  });
  lttpRenderSmallTalkSubs(root);
}

function lttpRenderSmallTalkSubs(root) {
  const container = document.getElementById('lttp-st-overlay-subs');
  container.innerHTML = '';
  LTTP_SMALL_TALK[root].forEach(({ emoji, label }) => {
    const btn = document.createElement('button');
    btn.textContent = `${emoji}  ${label}`;
    const isSelected = lttpPendingTag && lttpPendingTag.root === root && lttpPendingTag.label === label;
    btn.className = isSelected
      ? 'min-h-14 w-full py-3 rounded-2xl bg-red-500 text-white text-base font-semibold active:scale-95 transition-transform shadow-sm'
      : 'min-h-14 w-full py-3 rounded-2xl bg-white border border-stone-200 text-stone-800 text-base font-medium active:scale-95 transition-transform shadow-sm';
    btn.addEventListener('click', () => {
      playPillClick();
      lttpPendingTag = { root, emoji, label };
      const sendBtn = document.getElementById('btn-lttp-st-overlay-send');
      sendBtn.disabled  = false;
      sendBtn.className = 'min-h-14 w-full rounded-2xl bg-red-500 hover:bg-red-600 active:scale-95 text-white text-xl font-semibold transition-all duration-150';
      lttpRenderSmallTalkSubs(root);
    });
    container.appendChild(btn);
  });
}

// Pro mode: "Ask your question!" holding screen with root stamp row
function lttpShowSmallTalk() {
  lttpPendingTag = null;
  ['lttp-st-ask-phase', 'lttp-st-stamp-row'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });
  lttpShowSmallTalkAskPhase(null);
  showScreen('screen-lttp-smalltalk');
}

function lttpShowSmallTalkAskPhase(tag) {
  const emojiEl = document.getElementById('lttp-st-ask-emoji');
  const labelEl = document.getElementById('lttp-st-ask-label');
  const subEl   = document.getElementById('lttp-st-ask-sub');
  emojiEl.textContent = '💬';
  labelEl.textContent = 'Ask your question!';
  subEl.textContent   = 'Then stamp what you asked.';
  lttpRenderStampRow();
  document.getElementById('lttp-st-stamp-row').style.display = 'flex';
  document.getElementById('lttp-st-ask-phase').style.display = 'flex';
}

function lttpRenderStampRow() {
  const row = document.getElementById('lttp-st-stamp-row');
  row.innerHTML = '';
  Object.keys(LTTP_SMALL_TALK).forEach(root => {
    const btn = document.createElement('button');
    btn.textContent = root;
    btn.className = 'flex-1 py-3 rounded-2xl bg-white border border-stone-200 text-stone-800 text-sm font-semibold active:scale-95 transition-transform shadow-sm';
    btn.addEventListener('click', () => {
      playLaunch();
      lttpSelectPlayer(lttpPendingTarget, { root, emoji: null, label: null });
    });
    row.appendChild(btn);
  });
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
    } else if (lttpGroupVote) {
      lttpShowGroupGuess();
    } else {
      lttpComputeAndShowGameover();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SCORING
// ═══════════════════════════════════════════════════════════════════════════
function lttpComputeAndShowGameover() {
  // Count votes to determine confusion bonus
  let correctVotes = 0, incorrectVotes = 0;
  Object.entries(lttpVotes).forEach(([, guess]) => {
    if (guess === lttpStrayIdx) correctVotes++; else incorrectVotes++;
  });

  // Win condition priority
  const jokerPrank     = lttpJokerMode && lttpJokerIdx >= 0 && lttpFakeTargets.includes(lttpStrayPin);
  const pinCorrect     = lttpStrayPin === lttpAddressIdx;
  const confusionBonus = incorrectVotes > correctVotes;

  let winner    = 'ic';
  let winReason = 'stray-missed';

  if (jokerPrank)      { winner = 'joker'; winReason = 'joker-prank';    }
  else if (pinCorrect) { winner = 'stray'; winReason = 'pin-correct';    }
  else if (confusionBonus) { winner = 'stray'; winReason = 'confusion-bonus'; }

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
  const screen = document.getElementById('screen-lttp-gameover');
  const baseScreenClass = 'flex flex-col w-full max-w-sm mx-auto h-screen overflow-hidden';

  if (winReason === 'joker-prank') {
    banner.textContent    = `🚫 ${strayName} No Show`;
    bannerSub.textContent = `The Troublemaker caused chaos.`;
    banner.className      = 'text-2xl font-black text-orange-600 text-center';
    bannerSub.className   = 'text-stone-600 text-sm text-center mt-1';
    screen.className      = baseScreenClass + ' bg-red-50';
  } else if (winReason === 'pin-correct') {
    banner.textContent    = `🏃‍♂️ ${strayName} Made it to the party!`;
    bannerSub.textContent = `They figured out the location.`;
    banner.className      = 'text-2xl font-black text-green-700 text-center';
    bannerSub.className   = 'text-green-500 text-sm text-center mt-1';
    screen.className      = baseScreenClass + ' bg-green-50';
  } else if (winReason === 'confusion-bonus') {
    banner.textContent    = `🌀 Mischief Bonus!`;
    bannerSub.textContent = `💅 ${strayName} was Fashionably Late`;
    banner.className      = 'text-2xl font-black text-purple-700 text-center';
    bannerSub.className   = 'text-stone-600 text-sm text-center mt-1';
    screen.className      = baseScreenClass + ' bg-purple-50';
  } else {
    banner.textContent    = `🎉 The Gang kept it secret!`;
    bannerSub.textContent = `💅 ${strayName} was Fashionably Late`;
    banner.className      = 'text-2xl font-black text-stone-800 text-center';
    bannerSub.className   = 'text-stone-500 text-sm text-center mt-1';
    screen.className      = baseScreenClass + ' bg-blue-50';
  }

  // Reveal block
  document.getElementById('lttp-gameover-address').textContent =
    `The Location was: ${address.toUpperCase()}`;
  document.getElementById('lttp-gameover-stray').textContent =
    `Friend of a Friend: ${strayName}`;
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
  ['lttp-suspicion-overlay', 'lttp-history-overlay', 'lttp-guess-map-overlay',
   'lttp-settings-overlay', 'lttp-how-to-overlay', 'lttp-quit-overlay',
   'lttp-confirm-overlay'].forEach(id => {
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
  lttpPlanLog       = [];
  lttpPlanLogIdx    = 0;
}
