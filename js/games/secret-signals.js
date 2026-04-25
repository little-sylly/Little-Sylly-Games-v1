// ═══════════════════════════════════════════════════════════════════════════════
// PLUGIN: Secret Signals (secret-signals)
// Mechanic: Two teams share secret vaults of 4 keywords (numbered 1–4).
//   Each round, one player receives a 3-digit code and gives 3 clues.
//   The opposing team tries to intercept the code; the encrypting team
//   must also decode it correctly or suffer a misfire.
//   Win: 2 interceptions. Lose: 2 misfires.
// Depends on: engine.js (audio, showScreen, resetToLobby), li5.js (allWords, loadWords)
// ═══════════════════════════════════════════════════════════════════════════════

// ── SS Settings ───────────────────────────────────────────────────────────────
let ssSettingInterceptsToWin = 2;  // 2 | 3
let ssDifficultyLevel        = 1;  // 1 | 2 | 3

// Curated 10 categories (shared with Great Minds) — used when Customise Vault is OFF
const SS_CURATED_CATS = ['animals','food','places','objects','nature','sports','activities','emotions','jobs','actions'];
// All 16 categories — available when Customise Vault is ON
const SS_CATEGORIES   = ['animals','food','places','objects','sports','nature','vehicles','jobs','activities','emotions','actions','music','pop_culture','people','brands','aussie_slang'];
let ssSelectedCategories = [];     // empty = use curated/all pool; non-empty = filtered
let ssCustomiseVault     = false;  // false = curated pool; true = full picker visible

let ssRerollLimitSetting = 1;      // max rerolls per keyword: 1 | 2 | Infinity
let ssTimerSetting       = 0;      // countdown seconds (0 = off)

// ── SS Team + vault state ─────────────────────────────────────────────────────
let ssTeamNames    = ['Team A', 'Team B'];
let ssPlayerCount  = 2;           // 2 or 3 per team
let ssPlayerNamesA = ['', ''];
let ssPlayerNamesB = ['', ''];
let ssVaultA    = [];  // 4 word objects
let ssVaultB    = [];  // 4 word objects
let ssRerollCounts = [[0,0,0,0],[0,0,0,0]]; // [team][kwIdx]

// ── SS Round state ────────────────────────────────────────────────────────────
let ssEncryptingTeam = 0;        // 0 = Team A encrypts, 1 = Team B encrypts
let ssCurrentCode    = [];       // e.g. [3, 1, 4] — three distinct ints 1–4
let ssCurrentClues   = ['', '', ''];

// Spy Log — indexed by keyword position (index 0 = keyword 1, ..., index 3 = keyword 4)
// Populated AFTER resolution so intercept/decode screens show only previous rounds
let ssClueHistoryA = [[], [], [], []];
let ssClueHistoryB = [[], [], [], []];

// Guesses — current half-turn
let ssInterceptGuess = [0, 0, 0];
let ssDecodeGuess    = [0, 0, 0];

// ── SS Score ──────────────────────────────────────────────────────────────────
let ssTokens   = [0, 0];  // interception tokens [A, B]
let ssMisfires = [0, 0];  // misfire tokens [A, B]
let ssRound    = 0;
let ssRoundHistory = [];  // per-half log for Mission Journal

// ── SS Timer ──────────────────────────────────────────────────────────────────
let ssTimerInterval    = null;
let ssTimerSecondsLeft = 0;
let ssAlarmInterval    = null;

// ── SS Intel Phase ────────────────────────────────────────────────────────────
const SS_INTEL_KW_PTS       = 0.25;   // per keyword found
const SS_INTEL_SCRAMBLE_PTS = 1.0;    // bonus for finding all 4; max total = 2.0

let ssIntelSyllyMode    = false;      // ✨ Sylly Mode toggle (default OFF)
let ssIntelScoreA       = 0;          // float — intel pts earned by Team A
let ssIntelScoreB       = 0;          // float — intel pts earned by Team B
let ssIntelLeader       = 0;          // team index guessing first
let ssIntelGuessingTeam = 0;          // team currently guessing
let ssIntelKwIdx        = 0;          // current keyword index (0–3)
let ssIntelAttemptNum   = 0;          // current attempt (0, 1, or 2)
let ssIntelFound           = [[false,false,false,false],[false,false,false,false]]; // [team][kwIdx]
let ssIntelPreviousGuesses    = [];   // stores rawInputs for previous failed attempts (per keyword)
let ssIntelAttempts           = [];   // all 3 raw attempt strings (current keyword) — for Dip Res selection
let ssOverrideSelectedAttempt = '';   // which attempt the player tapped to argue for
let ssIntelHistory            = [];   // [{team, kwIdx, word, attempts, found}] — for Mission Journal

// ── SS Fuzzy Matching ─────────────────────────────────────────────────────────

const SS_IRREGULARS = {
  men: 'man', women: 'woman', children: 'child', mice: 'mouse',
  geese: 'goose', feet: 'foot', teeth: 'tooth', oxen: 'ox',
  man: 'man', woman: 'woman', child: 'child', mouse: 'mouse',
  goose: 'goose', foot: 'foot', tooth: 'tooth', ox: 'ox',
};

// Returns all normalised surface forms for a word (singular + plural variants)
function ssWordForms(w) {
  w = w.trim().toLowerCase();
  const forms = new Set([w]);

  // Check irregulars (both directions)
  if (SS_IRREGULARS[w]) forms.add(SS_IRREGULARS[w]);
  // Add plurals of any singular irregular forms found
  Object.entries(SS_IRREGULARS).forEach(([pl, sg]) => {
    if (sg === w) forms.add(pl);
  });

  // S suffix: cave → caves, caves → cave
  if (w.endsWith('s') && w.length > 2)  forms.add(w.slice(0, -1));
  else                                   forms.add(w + 's');

  // ES suffix: box → boxes, boxes → box
  if (w.endsWith('es') && w.length > 3) forms.add(w.slice(0, -2));
  else if (/[sxzh]$/.test(w))          forms.add(w + 'es');

  // IES suffix: baby → babies, babies → baby
  if (w.endsWith('ies') && w.length > 4) forms.add(w.slice(0, -3) + 'y');
  else if (w.endsWith('y') && w.length > 2) forms.add(w.slice(0, -1) + 'ies');

  return [...forms];
}

// Returns true if a and b are the same word (case-insensitive, plural-aware, compound-aware)
function ssFuzzyMatch(a, b) {
  const normalB = b.trim().toLowerCase();
  const formsA  = ssWordForms(a.trim().toLowerCase());

  // Direct match (plural/singular aware)
  if (formsA.includes(normalB)) return true;

  // Component match: if target is a compound word (hyphen/space), match any part
  const components = normalB.split(/[-\s]+/).filter(c => c.length >= 3);
  if (components.length > 1) {
    return components.some(comp => formsA.includes(comp));
  }
  return false;
}

// ── SS Helpers ────────────────────────────────────────────────────────────────

function ssGenerateCode() {
  // Returns an array of 3 distinct ints, each 1–4 (no repeats)
  const digits = [1, 2, 3, 4];
  for (let i = digits.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }
  return digits.slice(0, 3);
}

function ssBuildVaults() {
  // In Secret Mode: draw from expansion word bank, skip user filters
  if (isSecretMode) {
    const shuffled = secretWords.slice().sort(() => Math.random() - 0.5);
    ssVaultA = shuffled.slice(0, 4);
    ssVaultB = shuffled.slice(4, 8);
    ssRerollCounts = [[0,0,0,0],[0,0,0,0]];
    return;
  }
  // Standard mode: filter by difficulty + category
  let pool = allWords.filter(w => w.difficulty === ssDifficultyLevel);
  if (!ssCustomiseVault) {
    pool = pool.filter(w => SS_CURATED_CATS.includes(w.category));
  } else if (ssSelectedCategories.length > 0) {
    pool = pool.filter(w => ssSelectedCategories.includes(w.category));
  }
  if (pool.length < 8) pool = allWords.filter(w => w.difficulty === ssDifficultyLevel);
  const shuffled = pool.slice().sort(() => Math.random() - 0.5);
  ssVaultA = shuffled.slice(0, 4);
  ssVaultB = shuffled.slice(4, 8);
  ssRerollCounts = [[0,0,0,0],[0,0,0,0]];
}

// Rerolls a single vault keyword if within the reroll limit
function ssRerollWord(team, kwIdx) {
  if (ssRerollCounts[team][kwIdx] >= ssRerollLimitSetting) return;
  const usedIds = new Set([...ssVaultA, ...ssVaultB].map(w => w.id));

  // In Secret Mode: reroll from expansion word bank only
  if (isSecretMode) {
    const pool = secretWords.filter(w => !usedIds.has(w.id));
    if (pool.length === 0) return;
    const newWord = pool[Math.floor(Math.random() * pool.length)];
    if (team === 0) ssVaultA[kwIdx] = newWord;
    else            ssVaultB[kwIdx] = newWord;
    ssRerollCounts[team][kwIdx]++;
    ssShowVaultAfterReroll(team);
    return;
  }
  let pool = allWords.filter(w => w.difficulty === ssDifficultyLevel && !usedIds.has(w.id));
  if (!ssCustomiseVault) {
    const catPool = pool.filter(w => SS_CURATED_CATS.includes(w.category));
    if (catPool.length > 0) pool = catPool;
  } else if (ssSelectedCategories.length > 0) {
    const catPool = pool.filter(w => ssSelectedCategories.includes(w.category));
    if (catPool.length > 0) pool = catPool;
  }

  if (pool.length === 0) return;  // no replacement available
  const newWord = pool[Math.floor(Math.random() * pool.length)];
  if (team === 0) ssVaultA[kwIdx] = newWord;
  else            ssVaultB[kwIdx] = newWord;
  ssRerollCounts[team][kwIdx]++;
  // Re-render the vault grid
  ssShowVaultAfterReroll(team);
}

function ssShowVaultAfterReroll(team) {
  const vault  = ssGetVault(team);
  const limit  = ssRerollLimitSetting === Infinity ? '∞' : ssRerollLimitSetting;
  document.getElementById('ss-vault-grid').innerHTML = vault.map((w, i) => {
    const used   = ssRerollCounts[team][i];
    const canRoll = ssRerollLimitSetting === Infinity || used < ssRerollLimitSetting;
    return `<div class="bg-white rounded-xl p-3 shadow-sm text-center relative">
      <p class="text-2xl font-bold text-teal-500">${i + 1}</p>
      <p class="text-stone-800 font-bold text-base mt-0.5 leading-tight">${w.word.toUpperCase()}</p>
      <button onclick="ssRerollWord(${team},${i})" ${canRoll ? '' : 'disabled'}
        class="mt-2 text-xs px-2 py-1 rounded-full ${canRoll ? 'bg-stone-100 hover:bg-stone-200 text-stone-500 active:scale-90' : 'bg-stone-50 text-stone-300 cursor-not-allowed'} transition-all">
        ${canRoll ? '🔄' : '🚫'} ${used}/${limit}
      </button>
    </div>`;
  }).join('');
  const note = document.getElementById('ss-vault-reroll-note');
  if (ssRerollLimitSetting > 0 || ssRerollLimitSetting === Infinity) {
    note.style.display = 'block';
    note.textContent   = `Tap 🔄 to cycle a word (${limit === '∞' ? 'unlimited' : limit + ' time' + (limit > 1 ? 's' : '')} per keyword)`;
  }
}

function ssGetVault(team) {
  return team === 0 ? ssVaultA : ssVaultB;
}

function ssGetHistory(team) {
  return team === 0 ? ssClueHistoryA : ssClueHistoryB;
}

function ssTeamName(team) {
  return ssTeamNames[team];
}

function ssInterceptingTeam() {
  return 1 - ssEncryptingTeam;
}

// Archives current round clues into the encrypting team's spy log
function ssArchiveClues() {
  const history = ssGetHistory(ssEncryptingTeam);
  ssCurrentCode.forEach((kwNum, i) => {
    history[kwNum - 1].push(ssCurrentClues[i]);
  });
}

// Returns winning team index (0|1) or null if game continues
function ssCheckWin() {
  if (ssTokens[0]   >= ssSettingInterceptsToWin) return 0;  // A wins by intercepting
  if (ssTokens[1]   >= ssSettingInterceptsToWin) return 1;  // B wins by intercepting
  if (ssMisfires[0] >= 2) return 1;  // B wins — A misfired out
  if (ssMisfires[1] >= 2) return 0;  // A wins — B misfired out
  return null;
}

// Renders the Intelligence Archive for a given team into a container element.
// showWords=true (default) reveals keyword names; false = clue history only (interceptor view)
function ssRenderArchive(containerEl, team, showWords = true) {
  const history   = ssGetHistory(team);
  const vault     = ssGetVault(team);
  const hasAny    = history.some(arr => arr.length > 0);
  const maxRounds = Math.max(...history.map(h => h.length), 1);

  if (!hasAny) {
    containerEl.innerHTML = '<p class="text-stone-400 text-sm italic">No history yet.</p>';
    return;
  }

  const roundHeaders = Array.from({ length: maxRounds }, (_, i) =>
    `<th class="text-left text-stone-400 font-semibold pb-1 pr-2 whitespace-nowrap">R${i + 1}</th>`
  ).join('');

  const rows = history.map((clues, i) => {
    const label = showWords && vault[i] ? vault[i].word.toUpperCase() : `KW${i + 1}`;
    const cells = Array.from({ length: maxRounds }, (_, r) =>
      `<td class="pr-2 pb-0.5 text-teal-600 font-semibold text-xs whitespace-nowrap">${clues[r] || '—'}</td>`
    ).join('');
    return `<tr>
      <td class="pr-1 pb-0.5 text-stone-400 font-bold text-xs">${i + 1}</td>
      <td class="pr-2 pb-0.5 text-stone-600 font-semibold text-xs max-w-[5rem] truncate">${label}</td>
      ${cells}
    </tr>`;
  }).join('');

  containerEl.innerHTML = `<table class="w-full border-collapse">
    <thead>
      <tr>
        <th class="text-left text-stone-400 font-semibold pb-1 pr-1 w-4">#</th>
        <th class="text-left text-stone-400 font-semibold pb-1 pr-2">${showWords ? 'Keyword' : 'KW'}</th>
        ${roundHeaders}
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

// Renders the current-round clue cards into a container
function ssRenderCurrentClues(containerEl) {
  containerEl.innerHTML = ssCurrentClues.map((clue, i) => `
    <div class="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-3">
      <span class="text-xs font-bold text-stone-400 uppercase tracking-widest w-14 flex-shrink-0">Clue ${i + 1}</span>
      <span class="text-stone-800 font-semibold">"${clue}"</span>
    </div>
  `).join('');
}

// Renders a 3-position code-guess pill UI into a container.
// Pills already used in another position are greyed out (mutual exclusion).
// onSelect(posIndex, value) called when a pill is tapped.
function ssRenderCodeGuessUI(containerEl, guessArr, onSelect) {
  const usedVals = new Set(guessArr.filter(v => v !== 0));

  containerEl.innerHTML = [0, 1, 2].map(pos => `
    <div class="flex items-center gap-2">
      <span class="text-xs font-bold text-stone-400 uppercase tracking-widest w-14 flex-shrink-0">Pos ${pos + 1}</span>
      <div class="flex gap-2 flex-1">
        ${[1, 2, 3, 4].map(val => {
          const isActive      = guessArr[pos] === val;
          const usedElsewhere = !isActive && usedVals.has(val);
          const cls = isActive
            ? 'pill-active-teal'
            : usedElsewhere ? 'pill opacity-30 cursor-not-allowed' : 'pill';
          return `<button class="ss-code-pill flex-1 min-h-11 rounded-xl font-bold text-lg transition-all duration-150 ${cls}" data-pos="${pos}" data-val="${val}" ${usedElsewhere ? 'disabled' : ''}>${val}</button>`;
        }).join('')}
      </div>
    </div>
  `).join('');

  containerEl.querySelectorAll('.ss-code-pill:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      const pos = parseInt(btn.dataset.pos);
      const val = parseInt(btn.dataset.val);
      playPillClick();
      guessArr[pos] = (guessArr[pos] === val) ? 0 : val;  // toggle deselect
      // Full re-render so mutual exclusion updates across all positions
      ssRenderCodeGuessUI(containerEl, guessArr, onSelect);
      onSelect(pos, val);
    });
  });
}

// Renders the scoreboard with 🔍/💣 icons and placeholder slots
function ssRenderScoreboard(containerEl) {
  containerEl.innerHTML = [0, 1].map(t => {
    const interceptSlots = Array.from({ length: ssSettingInterceptsToWin }, (_, i) =>
      i < ssTokens[t]
        ? '<span class="text-base">🔍</span>'
        : '<span class="text-base opacity-20">🔍</span>'
    ).join('');
    const misfireSlots = Array.from({ length: 2 }, (_, i) =>
      i < ssMisfires[t]
        ? '<span class="text-base">💣</span>'
        : '<span class="text-base opacity-20">💣</span>'
    ).join('');
    return `<div class="flex items-center justify-between text-sm w-full">
      <span class="font-bold text-stone-700">${ssTeamName(t)}</span>
      <span class="flex gap-4 items-center">
        <span class="flex gap-0.5" title="Interceptions">${interceptSlots}</span>
        <span class="flex gap-0.5" title="Misfires">${misfireSlots}</span>
      </span>
    </div>`;
  }).join('');
}

// ── SS Intel Helpers ──────────────────────────────────────────────────────────

// Opponent's vault (the one being guessed)
function ssIntelTargetVault() {
  return ssIntelGuessingTeam === 0 ? ssVaultB : ssVaultA;
}

// Clue history for the vault being guessed
function ssIntelTargetHistory() {
  return ssIntelGuessingTeam === 0 ? ssClueHistoryB : ssClueHistoryA;
}

function ssIntelScore(team) {
  return team === 0 ? ssIntelScoreA : ssIntelScoreB;
}

function ssIntelAddScore(team, pts) {
  if (team === 0) ssIntelScoreA = Math.round((ssIntelScoreA + pts) * 100) / 100;
  else            ssIntelScoreB = Math.round((ssIntelScoreB + pts) * 100) / 100;
}

function ssFinalScore(team) {
  return Math.round((ssTokens[team] + ssIntelScore(team)) * 100) / 100;
}

function ssFormatPts(n) {
  // e.g. 1 → "1.0", 0.25 → "0.25", 0.5 → "0.5"
  return n % 1 === 0 ? n.toFixed(1) : String(n);
}

// ── SS Intel Phase ────────────────────────────────────────────────────────────

function ssStartIntelPhase() {
  // Reset intel state
  ssIntelScoreA    = 0;
  ssIntelScoreB    = 0;
  ssIntelKwIdx     = 0;
  ssIntelAttemptNum = 0;
  ssIntelFound     = [[false,false,false,false],[false,false,false,false]];

  // Determine leader (goes first — going second is the strategic advantage)
  if (ssTokens[0] > ssTokens[1]) {
    ssIntelLeader = 0;
  } else if (ssTokens[1] > ssTokens[0]) {
    ssIntelLeader = 1;
  } else {
    // Tied interceptions — fewer misfires goes first
    if (ssMisfires[0] < ssMisfires[1]) {
      ssIntelLeader = 0;
    } else if (ssMisfires[1] < ssMisfires[0]) {
      ssIntelLeader = 1;
    } else {
      // Still tied — show tiebreak screen
      ssShowTiebreak();
      return;
    }
  }
  ssShowIntelIntro(ssIntelLeader);
}

function ssShowTiebreak() {
  // Populate RPS winner buttons with actual team names
  document.getElementById('btn-ss-rps-a-won').textContent = ssTeamName(0) + ' Won!';
  document.getElementById('btn-ss-rps-b-won').textContent = ssTeamName(1) + ' Won!';
  // Reset to method selection view
  document.getElementById('ss-tiebreak-method').style.display        = 'flex';
  document.getElementById('ss-tiebreak-rps-result').style.display    = 'none';
  document.getElementById('ss-tiebreak-winner-choice').style.display = 'none';
  showScreen('screen-ss-tiebreak');
}

function ssShowIntelIntro(team) {
  ssIntelGuessingTeam = team;
  ssIntelKwIdx        = 0;
  ssIntelAttemptNum   = 0;

  const opponent = 1 - team;
  document.getElementById('ss-intel-intro-title').textContent    = `${ssTeamName(team)} — your turn`;
  document.getElementById('ss-intel-intro-opponent').textContent = ssTeamName(opponent);

  // "Target to Beat" — shown only for the underdog (2nd team)
  const targetCard = document.getElementById('ss-intel-target-card');
  if (team !== ssIntelLeader) {
    // This is the second team — show target
    const leaderIntel   = ssIntelScore(ssIntelLeader);
    const leaderTotal   = ssFinalScore(ssIntelLeader);
    const myCodePts     = ssTokens[team];
    const needed        = Math.round((leaderTotal - myCodePts + 0.01) * 100) / 100;  // need > leaderTotal - myCodePts
    const max           = SS_INTEL_KW_PTS * 4 + SS_INTEL_SCRAMBLE_PTS;
    const canWin        = needed <= max;

    document.getElementById('ss-intel-target-text').innerHTML =
      `${ssTeamName(ssIntelLeader)} scored <strong>${ssFormatPts(leaderIntel)} intel pts</strong> — combined total: <strong>${ssFormatPts(leaderTotal)}</strong>`;
    function ssKwsNeeded(pts) {
      if (pts <= 0)    return null;
      if (pts <= 0.25) return '1 keyword';
      if (pts <= 0.5)  return '2 keywords';
      if (pts <= 0.75) return '3 keywords';
      if (pts <= 1.0)  return '4 keywords';
      if (pts <= 2.0)  return 'all 4 + the bonus';
      return null;  // gap > 2.0, unbeatable
    }
    const kwText = ssKwsNeeded(needed);
    document.getElementById('ss-intel-target-needed').textContent = canWin && kwText
      ? `Data gap: ${needed.toFixed(2)} pts — ${kwText} to intercept the lead 🎯`
      : `Data gap too large — intel alone can't close it. Play for pride. 📡`;
    targetCard.style.display = 'block';
  } else {
    targetCard.style.display = 'none';
  }

  showScreen('screen-ss-intel-intro');
}

function ssStartIntelKeyword() {
  const vault   = ssIntelTargetVault();
  const history = ssIntelTargetHistory();
  const kwNum   = ssIntelKwIdx + 1;

  document.getElementById('ss-intel-guess-progress').textContent =
    `Keyword ${kwNum} of 4`;
  document.getElementById('ss-intel-guess-team').textContent =
    `${ssTeamName(ssIntelGuessingTeam)} guessing`;

  // Clue Dossier
  const clues = history[ssIntelKwIdx];
  const dossierEl = document.getElementById('ss-intel-dossier');
  if (clues.length === 0) {
    dossierEl.innerHTML = '<span class="text-stone-400 text-sm italic">No clues recorded for this keyword.</span>';
  } else {
    dossierEl.innerHTML = clues.map((c, r) =>
      `<span class="bg-white rounded-xl px-3 py-1.5 text-sm font-semibold text-stone-700 shadow-sm">
        <span class="text-teal-400 text-xs font-bold mr-1">R${r + 1}</span>${c}
      </span>`
    ).join('');
  }

  // Reset attempt UI
  ssIntelAttemptNum         = 0;
  ssIntelPreviousGuesses    = [];
  ssIntelAttempts           = [];
  ssOverrideSelectedAttempt = '';
  ssIntelRenderAttempts();

  // Hide feedback + continue button; show override button
  const fb = document.getElementById('ss-intel-feedback');
  fb.style.display = 'none';
  fb.textContent = '';
  document.getElementById('btn-ss-intel-continue').style.display   = 'none';
  document.getElementById('btn-ss-intel-override').style.display   = 'block';

  showScreen('screen-ss-intel-guess');
}

function ssIntelRenderAttempts() {
  const container = document.getElementById('ss-intel-attempts');
  container.innerHTML = '';
  for (let i = 0; i <= ssIntelAttemptNum; i++) {
    const isLast = i === ssIntelAttemptNum;
    const wrapper = document.createElement('div');
    wrapper.className = 'ss-attempt-row flex gap-2';

    const label = document.createElement('label');
    label.className = 'text-stone-400 text-xs font-semibold uppercase tracking-widest w-20 flex-shrink-0 pt-3';
    label.textContent = `Attempt ${i + 1}`;

    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 30;
    input.placeholder = 'One word…';
    input.id = `ss-intel-input-${i}`;
    input.disabled = !isLast;
    // Restore previous guess text on disabled inputs
    if (!isLast && ssIntelPreviousGuesses[i]) {
      input.value = ssIntelPreviousGuesses[i];
    }
    input.className = `flex-1 rounded-xl border-2 px-4 py-3 text-lg text-stone-800 placeholder-stone-300 focus:outline-none transition-colors ${
      isLast
        ? 'border-stone-200 bg-white focus:border-teal-400'
        : 'border-stone-100 bg-stone-50 text-stone-400 cursor-not-allowed'
    }`;

    const btn = document.createElement('button');
    btn.textContent = 'Submit';
    btn.disabled = !isLast;
    btn.className = `min-h-12 px-4 rounded-xl font-semibold text-base transition-all duration-150 ${
      isLast
        ? 'bg-teal-500 hover:bg-teal-600 active:scale-95 text-white'
        : 'bg-stone-200 text-stone-400 cursor-not-allowed'
    }`;

    if (isLast) {
      btn.addEventListener('click', () => {
        const val = input.value.trim();
        if (!val) return;
        playPillClick();
        ssIntelSubmitGuess(val);
      });
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); btn.click(); }
      });
    }

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    wrapper.appendChild(btn);
    container.appendChild(wrapper);

    if (isLast) setTimeout(() => input.focus(), 100);
  }
}

function ssIntelSubmitGuess(rawInput) {
  const target = ssIntelTargetVault()[ssIntelKwIdx].word;
  ssIntelAttempts.push(rawInput.trim());

  if (ssFuzzyMatch(rawInput, target)) {
    ssIntelOnFound(rawInput);
  } else if (ssIntelAttemptNum < 2) {
    ssIntelPreviousGuesses.push(rawInput.trim());
    ssIntelAttemptNum++;
    const fb = document.getElementById('ss-intel-feedback');
    fb.textContent = '❌ Not quite — try again';
    fb.style.cssText = 'display:block; color: #ef4444;';
    playBoing();
    ssIntelRenderAttempts();
  } else {
    ssIntelPreviousGuesses.push(rawInput.trim());
    // Lock the input after the 3rd attempt
    document.querySelectorAll('#ss-intel-attempts input, #ss-intel-attempts button').forEach(el => {
      el.disabled = true;
    });
    ssLockAttemptInputs();
    ssIntelOnNotFound();
  }
}

function ssLockAttemptInputs() {
  document.querySelectorAll('#ss-intel-attempts .ss-attempt-row').forEach((row, i) => {
    const attempt = ssIntelAttempts[i];
    if (!attempt) return;
    // Hide submit button
    const btn = row.querySelector('button');
    if (btn) btn.style.display = 'none';
    // Style row as selectable pill
    row.classList.add('cursor-pointer', 'rounded-xl', 'transition-all', 'duration-150');
    row.addEventListener('click', () => {
      playPillClick();
      document.querySelectorAll('#ss-intel-attempts .ss-attempt-row').forEach(r =>
        r.classList.remove('ring-2', 'ring-teal-400', 'bg-teal-50'));
      row.classList.add('ring-2', 'ring-teal-400', 'bg-teal-50');
      ssOverrideSelectedAttempt = attempt;
    });
  });
}

function ssIntelOnFound(rawInput) {
  ssIntelHistory.push({
    team: ssIntelGuessingTeam, kwIdx: ssIntelKwIdx,
    word: ssIntelTargetVault()[ssIntelKwIdx].word,
    attempts: [...ssIntelPreviousGuesses, rawInput],
    found: true,
  });
  ssIntelFound[ssIntelGuessingTeam][ssIntelKwIdx] = true;
  ssIntelAddScore(ssIntelGuessingTeam, SS_INTEL_KW_PTS);
  const fb  = document.getElementById('ss-intel-feedback');
  const btn = document.getElementById('btn-ss-intel-continue');
  fb.textContent = '✅ Correct!';
  fb.style.cssText = 'display:block; color: #14b8a6; font-size: 1.25rem; font-weight: 700;';
  btn.style.display = 'block';
  btn.onclick = () => { playPillClick(); btn.style.display = 'none'; ssIntelAdvance(); };
  document.querySelectorAll('#ss-intel-attempts input, #ss-intel-attempts button').forEach(el => {
    el.disabled = true;
  });
  document.getElementById('btn-ss-intel-override').style.display = 'none';
  playSuccess();
}

function ssIntelOnNotFound() {
  ssIntelHistory.push({
    team: ssIntelGuessingTeam, kwIdx: ssIntelKwIdx,
    word: ssIntelTargetVault()[ssIntelKwIdx].word,
    attempts: [...ssIntelPreviousGuesses],
    found: false,
  });
  const fb  = document.getElementById('ss-intel-feedback');
  const btn = document.getElementById('btn-ss-intel-continue');
  fb.textContent = `❌ The word was "${ssIntelTargetVault()[ssIntelKwIdx].word}"`;
  fb.style.cssText = 'display:block; color: #78716c; font-weight: 600;';
  btn.style.display = 'block';
  btn.onclick = () => { playPillClick(); btn.style.display = 'none'; ssIntelAdvance(); };
  // Keep Dip Res visible — both Continue and Dip Res shown on 3rd failure
  playBoing();
}

function ssIntelAdvance() {
  if (ssIntelKwIdx < 3) {
    ssIntelKwIdx++;
    ssIntelAttemptNum = 0;
    ssStartIntelKeyword();
  } else {
    ssCheckScrambleBonus();
    ssShowIntelSummary();
  }
}

function ssCheckScrambleBonus() {
  if (ssIntelFound[ssIntelGuessingTeam].every(Boolean)) {
    ssIntelAddScore(ssIntelGuessingTeam, SS_INTEL_SCRAMBLE_PTS);
  }
}

function ssShowInningTransition(team) {
  document.getElementById('ss-inning-transition').style.display = 'flex';
  document.getElementById('btn-ss-mission-continues').onclick = () => {
    playLaunch();
    document.getElementById('ss-inning-transition').style.display = 'none';
    ssShowIntelIntro(team);
  };
}

function ssShowIntelSummary() {
  const team    = ssIntelGuessingTeam;
  const found   = ssIntelFound[team];
  const kwCount = found.filter(Boolean).length;
  const hasBonus = found.every(Boolean);
  const intel   = ssIntelScore(team);

  document.getElementById('ss-intel-summary-title').textContent = ssTeamName(team);

  // Keyword result grid — shows vault word + found/not
  const targetVault = ssIntelTargetVault();
  document.getElementById('ss-intel-summary-grid').innerHTML = found.map((f, i) => {
    const word = targetVault[i].word;
    const wordFontCls = word.length > 9 ? 'text-[10px]' : 'text-xs';
    return `<div class="rounded-xl p-2 text-center ${f ? 'bg-teal-500 text-white' : 'bg-stone-200 text-stone-400'}">
      <p class="text-xs font-semibold mb-0.5">${i + 1}</p>
      <p class="${wordFontCls} font-bold uppercase leading-tight break-all">${word}</p>
      <p class="text-base mt-0.5">${f ? '✅' : '❌'}</p>
    </div>`;
  }).join('');

  document.getElementById('ss-intel-summary-kw').textContent = `${kwCount} / 4`;

  const scrambleRow = document.getElementById('ss-intel-summary-scramble-row');
  scrambleRow.style.display = hasBonus ? 'flex' : 'none';

  document.getElementById('ss-intel-summary-total').textContent = `+${ssFormatPts(intel)} pts`;

  // Button label + handler
  const nextBtn = document.getElementById('btn-ss-intel-summary-next');
  const underdog = 1 - ssIntelLeader;

  if (team === ssIntelLeader) {
    // First team done — hand to underdog
    nextBtn.textContent = `Pass to ${ssTeamName(underdog)} →`;
    nextBtn.onclick = () => { playDone(); ssShowInningTransition(underdog); };
  } else {
    // Both teams done — final result
    nextBtn.textContent = 'Final Mission Report 📑';
    nextBtn.onclick = () => { playLaunch(); ssShowFinalGameOver(); };
  }

  showScreen('screen-ss-intel-summary');
}

function ssShowFinalGameOver() {
  const scoreA = ssFinalScore(0);
  const scoreB = ssFinalScore(1);

  let winner;
  if      (scoreA > scoreB) winner = 0;
  else if (scoreB > scoreA) winner = 1;
  else                      winner = null;  // exact tie (extremely rare with 0.25 increments)

  const emoji = winner !== null ? '🏆' : '🤝';
  const title = winner !== null ? `${ssTeamName(winner)} wins!` : "It's a tie!";
  let reason = '';
  if (winner !== null) {
    const intelWinner = ssIntelScore(winner) > ssIntelScore(1 - winner);
    reason = intelWinner
      ? `${ssTeamName(winner)} cracked the codes and pulled off the upset! 🕵️`
      : `${ssTeamName(winner)} defended their lead through the Intelligence Reveal.`;
  }

  document.getElementById('ss-gameover-emoji').textContent  = emoji;
  document.getElementById('ss-gameover-title').textContent  = title;
  document.getElementById('ss-gameover-reason').textContent = reason;

  document.getElementById('ss-gameover-scores').innerHTML = `
    <div class="flex text-xs font-semibold uppercase tracking-widest text-stone-400 justify-between mb-1 px-1">
      <span></span>
      <div class="flex gap-4">
        <span>Code</span>
        <span>Intel</span>
        <span class="text-stone-600">Total</span>
      </div>
    </div>
    ${[0, 1].map(t => `
      <div class="flex items-center justify-between text-sm py-1.5 border-t border-stone-200">
        <span class="font-bold text-stone-700">${ssTeamName(t)}</span>
        <div class="flex gap-4 text-right">
          <span class="w-10 text-stone-500">${ssFormatPts(ssTokens[t])}</span>
          <span class="w-10 text-teal-600">+${ssFormatPts(ssIntelScore(t))}</span>
          <span class="w-10 font-bold ${winner === t ? 'text-teal-600' : 'text-stone-800'}">${ssFormatPts(ssFinalScore(t))}</span>
        </div>
      </div>
    `).join('')}
  `;

  ssRenderMissionJournal(document.getElementById('ss-mission-journal'));
  playLaunch();
  showScreen('screen-ss-gameover');
}

// ── SS Setup flow ─────────────────────────────────────────────────────────────

function startSyllySignals() {
  activeGameId      = 'sylly-signals';
  ssEncryptingTeam  = 0;
  ssCurrentCode     = [];
  ssCurrentClues    = ['', '', ''];
  ssClueHistoryA    = [[], [], [], []];
  ssClueHistoryB    = [[], [], [], []];
  ssInterceptGuess  = [0, 0, 0];
  ssDecodeGuess     = [0, 0, 0];
  ssTokens          = [0, 0];
  ssMisfires        = [0, 0];
  ssRound           = 0;

  // Pre-populate team name inputs (blank if still defaults)
  document.getElementById('ss-input-team-a').value = ssTeamNames[0] === 'Team A' ? '' : ssTeamNames[0];
  document.getElementById('ss-input-team-b').value = ssTeamNames[1] === 'Team B' ? '' : ssTeamNames[1];
  showScreen('screen-ss-setup');
}

function ssConfirmSetup() {
  const valA = document.getElementById('ss-input-team-a').value.trim();
  const valB = document.getElementById('ss-input-team-b').value.trim();
  ssTeamNames[0] = valA || 'Team A';
  ssTeamNames[1] = valB || 'Team B';
  ssShowPlayers();
}

function ssShowPlayers() {
  // Update team name labels
  document.getElementById('ss-players-team-a-label').textContent = ssTeamNames[0];
  document.getElementById('ss-players-team-b-label').textContent = ssTeamNames[1];
  // Sync player count toggle
  document.querySelectorAll('[data-ss-player-count]').forEach(btn => {
    const isActive = parseInt(btn.dataset.ssPlayerCount) === ssPlayerCount;
    btn.className = `pill${isActive ? ' pill-active-teal' : ''}`;
  });
  // Show/hide 3rd input
  const show3 = ssPlayerCount === 3;
  ['ss-player-a3', 'ss-player-b3'].forEach(id => {
    document.getElementById(id).style.display = show3 ? '' : 'none';
  });
  // Pre-populate
  const namesA = ssPlayerNamesA.concat(['', '']);
  const namesB = ssPlayerNamesB.concat(['', '']);
  ['a1','a2','a3'].forEach((s, i) => {
    document.getElementById(`ss-player-${s}`).value = namesA[i] || '';
  });
  ['b1','b2','b3'].forEach((s, i) => {
    document.getElementById(`ss-player-${s}`).value = namesB[i] || '';
  });
  showScreen('screen-ss-players');
}

function ssConfirmPlayers() {
  const count = ssPlayerCount;
  const suffixes = count === 3 ? ['1','2','3'] : ['1','2'];
  ssPlayerNamesA = suffixes.map(s => document.getElementById(`ss-player-a${s}`).value.trim());
  ssPlayerNamesB = suffixes.map(s => document.getElementById(`ss-player-b${s}`).value.trim());

  loadWords().then(() => {
    // Secret Mode: apply forced overrides + lockdown vault customisation
    if (isSecretMode && window.activeExpansionOverrides) {
      const ov = window.activeExpansionOverrides;
      if (ov.ssDifficultyLevel        !== undefined) ssDifficultyLevel        = ov.ssDifficultyLevel;
      if (ov.ssSettingInterceptsToWin !== undefined) ssSettingInterceptsToWin = ov.ssSettingInterceptsToWin;
      if (ov.ssRerollLimitSetting     !== undefined) ssRerollLimitSetting     = ov.ssRerollLimitSetting;
      if (ov.ssIntelSyllyMode         !== undefined) ssIntelSyllyMode         = ov.ssIntelSyllyMode;
      ssCustomiseVault = false; // lockdown: no vault customisation in Secret Mode
    }
    ssBuildVaults();
    ssShowVaultGate(0);
  });
}

function ssGetBroadcaster(team) {
  const names  = (team === 0 ? ssPlayerNamesA : ssPlayerNamesB).filter(n => n.trim());
  if (!names.length) return ssTeamName(team);
  return names[ssRound % names.length];
}

let ssFirstTeamWinner = -1;

function ssShowFirstTeam() {
  // Populate RPS team-name buttons
  document.getElementById('btn-ss-first-rps-a').textContent = `${ssTeamName(0)} Won`;
  document.getElementById('btn-ss-first-rps-b').textContent = `${ssTeamName(1)} Won`;
  // Reset to initial state
  document.getElementById('ss-first-team-main').style.display   = 'flex';
  document.getElementById('ss-first-rps-row').style.display     = 'none';
  document.getElementById('ss-first-winner-row').style.display  = 'none';
  ssFirstTeamWinner = -1;
  showScreen('screen-ss-first-team');
}

function ssFirstTeamShowWinner(winner) {
  ssFirstTeamWinner = winner;
  document.getElementById('ss-first-winner-label').textContent  = `${ssTeamName(winner)} — your call.`;
  document.getElementById('ss-first-team-main').style.display   = 'none';
  document.getElementById('ss-first-rps-row').style.display     = 'none';
  document.getElementById('ss-first-winner-row').style.display  = 'flex';
}

function ssShowVaultGate(team) {
  const name = ssTeamName(team);
  document.getElementById('ss-vault-gate-title').textContent = `${name} only`;
  document.getElementById('ss-vault-gate-team').textContent  = name;
  // Store which team's vault we're about to show
  document.getElementById('btn-ss-vault-gate-ready').dataset.team = team;
  showScreen('screen-ss-vault-gate');
}

function ssShowVault(team) {
  document.getElementById('ss-vault-title').textContent = ssTeamName(team);
  document.getElementById('btn-ss-vault-done').dataset.team = team;
  ssShowVaultAfterReroll(team);
  showScreen('screen-ss-vault');
}

// ── SS Round flow ─────────────────────────────────────────────────────────────

function ssStartHalf() {
  ssCurrentCode   = ssGenerateCode();
  ssCurrentClues  = ['', '', ''];
  ssInterceptGuess = [0, 0, 0];
  ssDecodeGuess    = [0, 0, 0];
  ssShowEncrypt();
}

function ssShowEncrypt() {
  const team  = ssEncryptingTeam;
  const vault = ssGetVault(team);
  const code  = ssCurrentCode;

  document.getElementById('ss-encrypt-team-label').textContent = ssTeamName(team);

  // Vault compact grid
  document.getElementById('ss-encrypt-vault').innerHTML = vault.map((w, i) => `
    <div class="flex items-center gap-2 py-0.5">
      <span class="text-teal-500 font-bold text-base w-5 flex-shrink-0">${i + 1}</span>
      <span class="text-stone-700 font-semibold text-sm">${w.word.toUpperCase()}</span>
    </div>
  `).join('');

  // Code display
  document.getElementById('ss-encrypt-code').textContent = code.join(' — ');

  // Clue inputs — labelled with keyword number AND word
  const clueContainer = document.getElementById('ss-clue-inputs');
  clueContainer.innerHTML = code.map((kwNum, i) => {
    const kwWord = vault[kwNum - 1].word.toUpperCase();
    return `<div>
      <label class="text-stone-500 text-xs font-semibold uppercase tracking-widest block mb-1">Clue for ${kwNum} — ${kwWord}</label>
      <input type="text" maxlength="30" placeholder="One word or phrase…"
        class="ss-clue-input w-full rounded-xl border-2 border-stone-200 bg-white px-4 py-3 text-lg text-stone-800 placeholder-stone-300 focus:border-teal-400 focus:outline-none transition-colors"
        data-clue-index="${i}" />
      <p class="ss-clue-warn text-red-500 text-xs mt-0.5 font-semibold" style="display:none">Clue can't be the keyword!</p>
    </div>`;
  }).join('');

  // Wire inputs → enable Transmit when all 3 filled AND no clue matches its keyword
  const transmitBtn = document.getElementById('btn-ss-transmit');
  transmitBtn.disabled = true;

  // Stem normaliser for fuzzy dupe check (Cave/Caves, Run/Running etc.)
  function ssNormClue(str) {
    let s = str.toLowerCase().trim();
    if (s.endsWith('ing')) s = s.slice(0, -3);
    else if (s.endsWith('ed'))  s = s.slice(0, -2);
    else if (s.endsWith('er'))  s = s.slice(0, -2);
    else if (s.endsWith('es'))  s = s.slice(0, -2);
    else if (s.endsWith('s'))   s = s.slice(0, -1);
    return s;
  }

  function ssValidateClues() {
    let errorMsg = '';
    const filled = ssCurrentClues.filter(c => c);
    const history = team === 0 ? ssClueHistoryA : ssClueHistoryB;

    clueContainer.querySelectorAll('.ss-clue-input').forEach(inp => {
      const idx    = parseInt(inp.dataset.clueIndex);
      const kwWord = vault[code[idx] - 1].word;
      const clue   = inp.value.trim();
      const warn   = inp.parentElement.querySelector('.ss-clue-warn');
      if (clue && ssFuzzyMatch(clue, kwWord)) {
        inp.classList.add('border-red-400');
        if (warn) warn.style.display = 'block';
        if (!errorMsg) errorMsg = `"${clue}" is too close to a vault keyword!`;
      } else {
        inp.classList.remove('border-red-400');
        if (warn) warn.style.display = 'none';
      }
    });

    // Within-round duplicate check (exact + fuzzy stem)
    if (!errorMsg) {
      const clueNorms = ssCurrentClues.map(c => ssNormClue(c));
      for (let i = 0; i < 3 && !errorMsg; i++) {
        if (!ssCurrentClues[i]) continue;
        for (let j = i + 1; j < 3; j++) {
          if (!ssCurrentClues[j]) continue;
          if (clueNorms[i] === clueNorms[j]) {
            errorMsg = `Clues ${i+1} and ${j+1} are too similar — use different words.`;
          }
        }
      }
    }

    // Historical duplicate check (exact + fuzzy stem)
    if (!errorMsg) {
      for (let i = 0; i < 3 && !errorMsg; i++) {
        const clue = ssCurrentClues[i];
        if (!clue) continue;
        const normClue = ssNormClue(clue);
        for (let kwI = 0; kwI < 4 && !errorMsg; kwI++) {
          for (const prev of history[kwI]) {
            if (ssNormClue(prev) === normClue) {
              errorMsg = `"${clue}" was used in a previous round — try something new.`;
              break;
            }
          }
        }
      }
    }

    const errEl = document.getElementById('ss-clue-error');
    errEl.textContent    = errorMsg;
    errEl.style.display  = errorMsg ? 'block' : 'none';
    transmitBtn.disabled = ssCurrentClues.some(c => !c) || !!errorMsg;
  }

  clueContainer.querySelectorAll('.ss-clue-input').forEach(input => {
    input.addEventListener('input', () => {
      const idx = parseInt(input.dataset.clueIndex);
      ssCurrentClues[idx] = input.value.trim();
      ssValidateClues();
    });
  });

  // Broadcaster label
  const broadcasterEl = document.getElementById('ss-broadcaster-name');
  const broadcasterName = ssGetBroadcaster(team);
  if (broadcasterName !== ssTeamName(team)) {
    broadcasterEl.textContent = `Round ${ssRound + 1} — ${broadcasterName} is the Broadcaster`;
    broadcasterEl.style.display = 'block';
  } else {
    broadcasterEl.style.display = 'none';
  }

  // Timer
  ssStopTimer();
  const timerLabelEl  = document.getElementById('ss-encrypt-timer-label');
  const timerDisplay  = document.getElementById('ss-encrypt-timer-display');
  if (ssTimerSetting > 0) {
    timerLabelEl.style.display = 'block';
    timerDisplay.style.display = 'block';
    ssTimerSecondsLeft = ssTimerSetting;
    timerDisplay.textContent = formatTime(ssTimerSecondsLeft);
    timerDisplay.classList.remove('timer-warning');
    ssTimerInterval = setInterval(() => {
      ssTimerSecondsLeft--;
      timerDisplay.textContent = formatTime(ssTimerSecondsLeft);
      if (ssTimerSecondsLeft <= 10 && ssTimerSecondsLeft > 0) {
        timerDisplay.classList.add('timer-warning');
        playTick();
      }
      if (ssTimerSecondsLeft <= 0) {
        clearInterval(ssTimerInterval);
        ssTimerInterval = null;
        ssAlarmInterval = setInterval(playAlarm, 1400);
      }
    }, 1000);
  } else {
    timerLabelEl.style.display = 'none';
    timerDisplay.style.display = 'none';
  }

  showScreen('screen-ss-encrypt');
}

function ssStopTimer() {
  clearInterval(ssTimerInterval);
  clearInterval(ssAlarmInterval);
  ssTimerInterval = null;
  ssAlarmInterval = null;
}

function ssTransmit() {
  if (ssCurrentClues.some(c => !c)) return;
  ssStopTimer();
  ssShowBroadcast();
}

function ssShowBroadcast() {
  const team = ssEncryptingTeam;
  document.getElementById('ss-broadcast-label').textContent =
    `${ssTeamName(team)} — Round ${ssRound + 1}`;

  ssRenderCurrentClues(document.getElementById('ss-broadcast-clues'));
  ssRenderArchive(document.getElementById('ss-broadcast-archive'), team);
  showScreen('screen-ss-broadcast');
}

function ssShowIntercept() {
  const interceptor = ssInterceptingTeam();
  const encrypting  = ssEncryptingTeam;

  document.getElementById('ss-intercept-team-label').textContent = ssTeamName(interceptor);

  ssRenderCurrentClues(document.getElementById('ss-intercept-clues'));
  ssRenderArchive(document.getElementById('ss-intercept-archive'), encrypting, false);

  ssInterceptGuess = [0, 0, 0];
  const guessUI = document.getElementById('ss-intercept-guess-ui');
  const submitBtn = document.getElementById('btn-ss-submit-intercept');
  submitBtn.disabled = true;

  ssRenderCodeGuessUI(guessUI, ssInterceptGuess, () => {
    submitBtn.disabled = ssInterceptGuess.some(v => v === 0);
  });

  showScreen('screen-ss-intercept');
}

function ssShowDecodeGate() {
  const encTeam = ssEncryptingTeam;
  const name    = ssTeamName(encTeam);
  document.getElementById('ss-decode-gate-title').textContent = `${name} — Decode`;
  document.getElementById('ss-decode-gate-team').textContent  = name;
  showScreen('screen-ss-decode-gate');
}

function ssShowDecode() {
  const team = ssEncryptingTeam;

  document.getElementById('ss-decode-team-label').textContent = ssTeamName(team);
  // Thematic header: name the broadcaster whose transmission is being decoded
  const broadcaster = ssGetBroadcaster(team);
  document.getElementById('ss-decode-header').textContent =
    `🔑 Decrypt ${broadcaster}'s Transmission`;

  // Vault card (open to the encrypting team)
  const vault = ssGetVault(team);
  document.getElementById('ss-decode-vault').innerHTML = `<div class="grid grid-cols-2 gap-2">${
    vault.map((w, i) =>
      `<div class="flex items-center gap-2 py-0.5">
        <span class="text-teal-500 font-bold text-base w-5 flex-shrink-0">${i + 1}</span>
        <span class="text-stone-700 font-semibold text-sm">${w.word.toUpperCase()}</span>
      </div>`
    ).join('')
  }</div>`;

  ssRenderCurrentClues(document.getElementById('ss-decode-clues'));
  ssRenderArchive(document.getElementById('ss-decode-archive'), team);

  ssDecodeGuess = [0, 0, 0];
  const guessUI  = document.getElementById('ss-decode-guess-ui');
  const submitBtn = document.getElementById('btn-ss-submit-decode');
  submitBtn.disabled = true;

  ssRenderCodeGuessUI(guessUI, ssDecodeGuess, () => {
    submitBtn.disabled = ssDecodeGuess.some(v => v === 0);
  });

  showScreen('screen-ss-decode');
}

function ssResolve() {
  const interceptCorrect = ssCurrentCode.every((v, i) => ssInterceptGuess[i] === v);
  const decodeCorrect    = ssCurrentCode.every((v, i) => ssDecodeGuess[i] === v);

  const interceptor = ssInterceptingTeam();
  const encoder     = ssEncryptingTeam;

  if (interceptCorrect) { ssTokens[interceptor]++; playSuccess(); }
  else                  { playBoing(); }
  if (!decodeCorrect)     ssMisfires[encoder]++;

  // Log this half for Mission Journal
  ssRoundHistory.push({
    round:            ssRound + 1,
    encryptingTeam:   encoder,
    code:             [...ssCurrentCode],
    clues:            [...ssCurrentClues],
    interceptGuess:   [...ssInterceptGuess],
    decodeGuess:      [...ssDecodeGuess],
    interceptCorrect,
    decodeCorrect,
  });

  ssArchiveClues();

  // ── Side-by-side comparison ──────────────────────────────────────────────
  function digitRow(guessArr, correct) {
    const digits = ssCurrentCode.map((v, i) => {
      const hit = guessArr[i] === v;
      return `<span class="font-bold text-lg ${hit ? 'text-teal-600' : 'text-red-500'}">${guessArr[i]}</span>`;
    }).join('<span class="text-stone-300 mx-1">—</span>');
    return `<div class="flex items-center gap-3">
      <div class="flex items-center">${digits}</div>
      <span class="text-lg">${correct ? '✅' : '❌'}</span>
    </div>`;
  }

  document.getElementById('ss-resolution-code').textContent =
    ssCurrentCode.join(' — ');

  // Hype message
  const hypeMsg = interceptCorrect && decodeCorrect
    ? '📡 Signals crossed — both teams nailed it!'
    : interceptCorrect && !decodeCorrect
      ? '🎯 Interception! Their signal was compromised.'
      : !interceptCorrect && decodeCorrect
        ? '🔒 Transmission secured — code held!'
        : '📻 Static on all frequencies…';
  document.getElementById('ss-resolution-hype').textContent = hypeMsg;

  document.getElementById('ss-resolution-results').innerHTML = `
    <div class="w-full bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3">
      <div>
        <p class="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1">
          ${ssTeamName(interceptor)} — intercept attempt
        </p>
        ${digitRow(ssInterceptGuess, interceptCorrect)}
        ${interceptCorrect ? '<p class="text-teal-600 text-xs font-bold mt-0.5">+1 🔍 Interception!</p>' : ''}
      </div>
      <hr class="border-stone-100" />
      <div>
        <p class="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1">
          ${ssTeamName(encoder)} — decode
        </p>
        ${digitRow(ssDecodeGuess, decodeCorrect)}
        ${!decodeCorrect ? '<p class="text-orange-500 text-xs font-bold mt-0.5">+1 💣 Misfire!</p>' : ''}
      </div>
    </div>
  `;

  ssRenderScoreboard(document.getElementById('ss-scoreboard'));
  showScreen('screen-ss-resolution');
}

function ssShowEndgameSplash(winner) {
  const loser     = 1 - winner;
  const byMisfire = ssMisfires[loser] >= 2;

  document.getElementById('ss-splash-icon').textContent   = byMisfire ? '💥' : '📑';
  document.getElementById('ss-splash-status').textContent = byMisfire ? 'TRANSMISSION LOST' : 'INTELLIGENCE SECURED';
  document.getElementById('ss-splash-title').textContent  = byMisfire
    ? `${ssTeamName(loser)} lost the signal`
    : `${ssTeamName(winner)} intercepted`;
  document.getElementById('ss-splash-sub').textContent = byMisfire
    ? 'Two misfires — the data never reached its destination.'
    : `${ssTeamName(winner)} cracked the code.`;

  document.getElementById('btn-ss-splash-phase2').style.display  = 'none';
  document.getElementById('btn-ss-splash-results').style.display = 'none';
  document.getElementById('ss-endgame-splash').style.display     = 'flex';

  // After 2s reveal the action button
  setTimeout(() => {
    if (ssIntelSyllyMode) {
      const p2Btn = document.getElementById('btn-ss-splash-phase2');
      p2Btn.style.display = 'block';
      p2Btn.onclick = () => {
        playLaunch();
        document.getElementById('ss-endgame-splash').style.display = 'none';
        ssStartIntelPhase();
      };
    } else {
      const resBtn = document.getElementById('btn-ss-splash-results');
      resBtn.style.display = 'block';
      resBtn.onclick = () => {
        playLaunch();
        document.getElementById('ss-endgame-splash').style.display = 'none';
        ssShowGameOver(winner);
      };
    }
  }, 2000);
}

function ssNextHalf() {
  const winner = ssCheckWin();
  if (winner !== null) {
    ssShowEndgameSplash(winner);
    return;
  }

  if (ssEncryptingTeam === 0) {
    // First half done — now Team B encrypts
    ssEncryptingTeam = 1;
  } else {
    // Both halves done — new round
    ssRound++;
    ssEncryptingTeam = 0;
  }
  ssStartHalf();
}

function ssShowGameOver(winner) {
  const loser = 1 - winner;

  // Determine win reason
  let reason = '';
  if (ssTokens[winner] >= ssSettingInterceptsToWin) {
    reason = `${ssTeamName(winner)} intercepted ${ssTokens[winner]} transmission${ssTokens[winner] > 1 ? 's' : ''}.`;
  } else if (ssMisfires[loser] >= 2) {
    reason = `${ssTeamName(loser)} suffered 2 misfires — their own team couldn't understand them!`;
  }

  document.getElementById('ss-gameover-emoji').textContent  = '🏆';
  document.getElementById('ss-gameover-title').textContent  = `${ssTeamName(winner)} wins!`;
  document.getElementById('ss-gameover-reason').textContent = reason;

  document.getElementById('ss-gameover-scores').innerHTML = [0, 1].map(t => `
    <div class="flex items-center justify-between text-sm py-1">
      <span class="font-bold text-stone-700">${ssTeamName(t)}</span>
      <span class="flex gap-4 text-sm">
        <span>🔍 ${ssTokens[t]} intercept${ssTokens[t] !== 1 ? 's' : ''}</span>
        <span>💣 ${ssMisfires[t]} misfire${ssMisfires[t] !== 1 ? 's' : ''}</span>
      </span>
    </div>
  `).join('');

  ssRenderMissionJournal(document.getElementById('ss-mission-journal'));
  playLaunch();
  showScreen('screen-ss-gameover');
}

// ── Mission Journal ───────────────────────────────────────────────────────────
function ssRenderMissionJournal(containerEl) {
  if (!ssRoundHistory.length) {
    containerEl.innerHTML = '<p class="text-stone-400 text-xs italic">No rounds played.</p>';
    return;
  }

  // Group by round number (each round = 2 halves)
  const rounds = {};
  ssRoundHistory.forEach(h => {
    if (!rounds[h.round]) rounds[h.round] = [];
    rounds[h.round].push(h);
  });

  containerEl.innerHTML = Object.entries(rounds).map(([roundNum, halves]) => {
    const halvesHtml = halves.map(h => {
      const enc  = ssTeamName(h.encryptingTeam);
      const intc = ssTeamName(1 - h.encryptingTeam);
      const sep = '<span class="text-stone-300 text-xs mx-0.5">—</span>';
      const codeDigits = h.code.join(' — ');

      const iDigits = h.code.map((v, i) => {
        const hit = h.interceptGuess[i] === v;
        return `<span class="${hit ? 'text-teal-600' : 'text-red-500'} font-semibold">${h.interceptGuess[i]}</span>`;
      }).join(sep);

      const dDigits = h.code.map((v, i) => {
        const hit = h.decodeGuess[i] === v;
        return `<span class="${hit ? 'text-teal-600' : 'text-red-500'} font-semibold">${h.decodeGuess[i]}</span>`;
      }).join(sep);

      const clueList = h.clues.map((c, i) =>
        `<span class="text-xs bg-stone-100 rounded px-1.5 py-0.5 text-stone-600">${c}</span>`
      ).join(' ');

      return `<div class="text-xs border-t border-stone-100 pt-2 mt-2">
        <div class="flex items-center gap-2 mb-1">
          <span class="font-semibold text-stone-600">${enc} broadcast</span>
          <span class="text-stone-300">·</span>
          <span class="font-bold text-teal-500 tracking-widest">Code: ${codeDigits}</span>
        </div>
        <div class="flex flex-wrap gap-1 mb-1.5">${clueList}</div>
        <div class="flex flex-col gap-0.5">
          <div class="flex items-center gap-2">
            <span class="text-stone-400 w-16 flex-shrink-0">${intc} 🔍</span>
            <span>${iDigits}</span>
            <span>${h.interceptCorrect ? '✅' : '❌'}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-stone-400 w-16 flex-shrink-0">${enc} 🔑</span>
            <span>${dDigits}</span>
            <span>${h.decodeCorrect ? '✅' : '❌'}</span>
          </div>
        </div>
      </div>`;
    }).join('');

    return `<div class="bg-stone-50 rounded-xl p-3">
      <p class="text-xs font-bold uppercase tracking-widest text-stone-400">Round ${roundNum}</p>
      ${halvesHtml}
    </div>`;
  }).join('');

  // ── Intel Dossier section (if intel phase was played)
  if (ssIntelHistory.length) {
    containerEl.innerHTML += `<div class="bg-stone-50 rounded-xl p-3 mt-1">
      <p class="text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">Intel Dossier</p>
      ${[0, 1].map(team => {
        const entries = ssIntelHistory.filter(e => e.team === team);
        if (!entries.length) return '';
        return `<p class="text-xs font-semibold text-teal-600 mb-1">${ssTeamName(team)}</p>
        <div class="flex flex-col gap-1.5 mb-2">${entries.map(e => `
          <div class="flex items-start gap-2 text-xs">
            <span class="text-stone-500 font-bold w-5 flex-shrink-0">${e.kwIdx + 1}</span>
            <span class="font-bold uppercase text-stone-700 w-16 flex-shrink-0">${e.word}</span>
            <span class="${e.found ? 'text-teal-600' : 'text-stone-400'} flex-1 min-w-0 break-words">${e.attempts.join(' → ') || '—'}</span>
            <span class="ml-auto flex-shrink-0">${e.found ? '✅' : '❌'}</span>
          </div>`
        ).join('')}</div>`;
      }).join('')}
    </div>`;
  }
}

// ── SS Quit ───────────────────────────────────────────────────────────────────
function ssShowQuitOverlay() {
  document.getElementById('ss-quit-overlay').style.display = 'flex';
}

// ── SS Reset (called by engine resetToLobby) ──────────────────────────────────
function resetSyllySignals() {
  ssEncryptingTeam       = 0;
  ssCurrentCode          = [];
  ssCurrentClues         = ['', '', ''];
  ssClueHistoryA         = [[], [], [], []];
  ssClueHistoryB         = [[], [], [], []];
  ssInterceptGuess       = [0, 0, 0];
  ssDecodeGuess          = [0, 0, 0];
  ssTokens               = [0, 0];
  ssMisfires             = [0, 0];
  ssRound                = 0;
  ssRoundHistory         = [];
  ssRerollCounts         = [[0,0,0,0],[0,0,0,0]];
  ssIntelPreviousGuesses = [];
  ssIntelHistory         = [];
  // Intel phase
  ssIntelScoreA          = 0;
  ssIntelScoreB          = 0;
  ssIntelLeader          = 0;
  ssIntelGuessingTeam    = 0;
  ssIntelKwIdx           = 0;
  ssIntelAttemptNum      = 0;
  ssIntelFound              = [[false,false,false,false],[false,false,false,false]];
  ssIntelAttempts           = [];
  ssOverrideSelectedAttempt = '';
  ssCustomiseVault          = false;
  ssStopTimer();
  document.getElementById('ss-quit-overlay').style.display          = 'none';
  document.getElementById('ss-override-overlay').style.display      = 'none';
  document.getElementById('ss-inning-transition').style.display     = 'none';
  document.getElementById('ss-endgame-splash').style.display        = 'none';
  document.getElementById('ss-play-again-overlay').style.display    = 'none';
}

// ── SS Settings ───────────────────────────────────────────────────────────────

function ssyncTimerToggleUI() {
  const on = ssTimerSetting > 0;
  const toggleBtn = document.getElementById('btn-ss-timer-toggle');
  toggleBtn.textContent = on ? 'ON' : 'OFF';
  toggleBtn.className   = on ? 'sylly-toggle-on flex-shrink-0' : 'sylly-toggle-off flex-shrink-0';
  document.getElementById('ss-timer-duration-row').style.display = on ? 'flex' : 'none';
  // Sync active pill for current duration
  document.querySelectorAll('[data-ss-setting="timer"]').forEach(btn => {
    btn.className = `pill${parseInt(btn.dataset.value) === ssTimerSetting ? ' pill-active-teal' : ''}`;
  });
}

function ssyncCustomiseToggleUI() {
  const toggleBtn = document.getElementById('btn-ss-customise-toggle');
  toggleBtn.textContent = ssCustomiseVault ? 'ON' : 'OFF';
  toggleBtn.className   = ssCustomiseVault ? 'sylly-toggle-on' : 'sylly-toggle-off';
  document.getElementById('ss-customise-body').style.display = ssCustomiseVault ? 'flex' : 'none';
}

function ssOpenSettings() {
  // Sync customise vault toggle
  ssyncCustomiseToggleUI();
  // Sync intercepts-to-win
  document.querySelectorAll('[data-ss-setting="interceptsToWin"]').forEach(btn => {
    btn.className = `pill${parseInt(btn.dataset.value) === ssSettingInterceptsToWin ? ' pill-active-teal' : ''}`;
  });
  // Sync difficulty
  document.querySelectorAll('[data-ss-setting="difficulty"]').forEach(btn => {
    btn.className = `pill${parseInt(btn.dataset.value) === ssDifficultyLevel ? ' pill-active-teal' : ''}`;
  });
  // Sync timer toggle
  ssyncTimerToggleUI();
  // Sync reroll limit
  document.querySelectorAll('[data-ss-setting="rerollLimit"]').forEach(btn => {
    const val = btn.dataset.value === 'Infinity' ? Infinity : parseInt(btn.dataset.value);
    btn.className = `pill${val === ssRerollLimitSetting ? ' pill-active-teal' : ''}`;
  });
  // Sync Sylly Mode toggle
  const toggle = document.getElementById('ss-sylly-toggle');
  toggle.textContent = ssIntelSyllyMode ? 'ON' : 'OFF';
  toggle.className   = ssIntelSyllyMode ? 'sylly-toggle-on' : 'sylly-toggle-off';
  // Render category pills
  ssSyncCategoryPills();
  document.getElementById('ss-settings-overlay').style.display = 'flex';
}

function ssSyncCategoryPills() {
  const grid         = document.getElementById('ss-cat-grid');
  const countEl      = document.getElementById('ss-cat-count');
  const warnEl       = document.getElementById('ss-cat-warn');
  const selectAllBtn = document.getElementById('btn-ss-cat-select-all');
  const done         = document.getElementById('btn-ss-settings-done');

  // Build word counts per category at current difficulty
  const catCounts = {};
  SS_CATEGORIES.forEach(c => {
    catCounts[c] = allWords ? allWords.filter(w => w.category === c && w.difficulty === ssDifficultyLevel).length : 0;
  });

  grid.innerHTML = SS_CATEGORIES.map(cat => {
    const isActive = ssSelectedCategories.includes(cat);
    const count    = catCounts[cat] || 0;
    const badge    = count < 8 && count > 0 ? ' ⚠️' : '';
    const label    = cat.replace(/_/g, ' ');
    return `<button class="gm-cat-pill${isActive ? ' gm-cat-active' : ''}" data-ss-cat="${cat}"
      style="text-transform:capitalize">${label}${badge}</button>`;
  }).join('');

  const n   = ssSelectedCategories.length;
  const all = SS_CATEGORIES.length;
  countEl.textContent = `${n} / ${all}`;

  // Select All / Deselect All button label
  if (selectAllBtn) {
    selectAllBtn.textContent = n === all ? 'Deselect All' : 'Select All';
  }

  // Warning for thin pools (1–3 selected)
  warnEl.style.display = (n >= 1 && n <= 3) ? 'block' : 'none';

  // Block Done when Customise is ON and nothing is selected
  const blocked = ssCustomiseVault && n === 0;
  done.disabled = blocked;
  done.classList.toggle('opacity-40', blocked);

  grid.querySelectorAll('[data-ss-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      playPillClick();
      const cat = btn.dataset.ssCat;
      const idx = ssSelectedCategories.indexOf(cat);
      if (idx >= 0) ssSelectedCategories.splice(idx, 1);
      else          ssSelectedCategories.push(cat);
      ssSyncCategoryPills();
    });
  });

  // Wire Select All / Deselect All (re-wire every render to stay current)
  if (selectAllBtn) {
    selectAllBtn.onclick = () => {
      playPillClick();
      ssSelectedCategories = n === all ? [] : [...SS_CATEGORIES];
      ssSyncCategoryPills();
    };
  }
}

// ── Event Listeners ───────────────────────────────────────────────────────────

// Lobby → SS menu
document.getElementById('btn-sylly-signals').addEventListener('click', () => {
  playLaunch();
  activeGameId = 'sylly-signals';
  showScreen('screen-ss-menu');
});

// SS menu buttons
document.getElementById('btn-ss-play').addEventListener('click', () => {
  playLaunch();
  startSyllySignals();
});
document.getElementById('btn-ss-how-to').addEventListener('click', () => {
  playPillClick();
  document.getElementById('ss-how-to-overlay').style.display = 'flex';
});
document.getElementById('btn-ss-settings').addEventListener('click', () => {
  playPillClick();
  ssOpenSettings();
});
document.getElementById('btn-ss-back').addEventListener('click', () => {
  playExit();
  resetToLobby();
});

// Setup screen
document.getElementById('btn-ss-setup-exit').addEventListener('click', () => {
  playExit();
  showScreen('screen-ss-menu');
});
document.getElementById('btn-ss-start-game').addEventListener('click', () => {
  playLaunch();
  ssConfirmSetup();
});

// Vault gate → vault
document.getElementById('btn-ss-vault-gate-ready').addEventListener('click', () => {
  playPillClick();
  const team = parseInt(document.getElementById('btn-ss-vault-gate-ready').dataset.team ?? '0');
  ssShowVault(team);
});

// Vault → next stage
document.getElementById('btn-ss-vault-done').addEventListener('click', () => {
  playDone();
  const team = parseInt(document.getElementById('btn-ss-vault-done').dataset.team ?? '0');
  if (team === 0) {
    // Team A done — now show Team B vault gate
    ssShowVaultGate(1);
  } else {
    // Both vaults revealed — decide who encrypts first
    ssRound = 0;
    ssShowFirstTeam();
  }
});

// Vault screen exit
document.getElementById('btn-ss-vault-exit').addEventListener('click', () => {
  playExit();
  ssShowQuitOverlay();
});

// Encrypt screen
document.getElementById('btn-ss-encrypt-exit').addEventListener('click', () => {
  playExit();
  ssShowQuitOverlay();
});
document.getElementById('btn-ss-transmit').addEventListener('click', () => {
  playSuccess();
  ssTransmit();
});

// Broadcast exit
document.getElementById('btn-ss-broadcast-exit').addEventListener('click', () => {
  playExit();
  ssShowQuitOverlay();
});

// Broadcast → intercept
document.getElementById('btn-ss-to-intercept').addEventListener('click', () => {
  playPillClick();
  ssShowIntercept();
});

// Intercept screen
document.getElementById('btn-ss-intercept-exit').addEventListener('click', () => {
  playExit();
  ssShowQuitOverlay();
});
document.getElementById('btn-ss-submit-intercept').addEventListener('click', () => {
  playDone();
  ssShowDecodeGate();
});

// Decode gate
document.getElementById('btn-ss-decode-gate-ready').addEventListener('click', () => {
  playPillClick();
  ssShowDecode();
});

// Decode screen exit
document.getElementById('btn-ss-decode-exit').addEventListener('click', () => {
  playExit();
  ssShowQuitOverlay();
});

// Decode screen
document.getElementById('btn-ss-submit-decode').addEventListener('click', () => {
  playDone();
  ssResolve();
});

// Resolution exit → quit overlay
document.getElementById('btn-ss-resolution-exit').addEventListener('click', () => {
  playExit();
  ssShowQuitOverlay();
});

// Resolution → next half
document.getElementById('btn-ss-continue').addEventListener('click', () => {
  playPillClick();
  ssNextHalf();
});

// Game over — Play Again → confirmation modal
document.getElementById('btn-ss-play-again').addEventListener('click', () => {
  playPillClick();
  document.getElementById('ss-play-again-overlay').style.display = 'flex';
});
document.getElementById('btn-ss-play-again-confirm').addEventListener('click', () => {
  playLaunch();
  document.getElementById('ss-play-again-overlay').style.display = 'none';
  startSyllySignals();
});
document.getElementById('btn-ss-play-again-cancel').addEventListener('click', () => {
  playDone();
  document.getElementById('ss-play-again-overlay').style.display = 'none';
});
document.getElementById('btn-ss-gameover-exit').addEventListener('click', () => {
  playExit();
  resetToLobby();
});

// Quit overlay
document.getElementById('btn-ss-quit-confirm').addEventListener('click', () => {
  playExit();
  document.getElementById('ss-quit-overlay').style.display = 'none';
  resetToLobby();
});
document.getElementById('btn-ss-quit-cancel').addEventListener('click', () => {
  playDone();
  document.getElementById('ss-quit-overlay').style.display = 'none';
});

// Settings — customise vault toggle
document.getElementById('btn-ss-customise-toggle').addEventListener('click', () => {
  playPillClick();
  ssCustomiseVault = !ssCustomiseVault;
  if (!ssCustomiseVault) {
    ssSelectedCategories = [];                    // turning off — curated pool, no selection needed
  } else {
    ssSelectedCategories = [...SS_CATEGORIES];    // turning on — start with everything selected
  }
  ssyncCustomiseToggleUI();
  ssSyncCategoryPills();
});

// Settings overlay
document.querySelectorAll('[data-ss-setting="interceptsToWin"]').forEach(btn => {
  btn.addEventListener('click', () => {
    playPillClick();
    ssSettingInterceptsToWin = parseInt(btn.dataset.value);
    document.querySelectorAll('[data-ss-setting="interceptsToWin"]').forEach(b => {
      const isActive = parseInt(b.dataset.value) === ssSettingInterceptsToWin;
      b.className = `pill${isActive ? ' pill-active-teal' : ''}`;
    });
  });
});
document.getElementById('btn-ss-settings-done').addEventListener('click', () => {
  playDone();
  document.getElementById('ss-settings-overlay').style.display = 'none';
});

// Settings — difficulty
document.querySelectorAll('[data-ss-setting="difficulty"]').forEach(btn => {
  btn.addEventListener('click', () => {
    playPillClick();
    ssDifficultyLevel = parseInt(btn.dataset.value);
    document.querySelectorAll('[data-ss-setting="difficulty"]').forEach(b => {
      b.className = `pill${parseInt(b.dataset.value) === ssDifficultyLevel ? ' pill-active-teal' : ''}`;
    });
    ssSyncCategoryPills();
  });
});

// Settings — timer toggle (ON/OFF)
document.getElementById('btn-ss-timer-toggle').addEventListener('click', () => {
  playPillClick();
  ssTimerSetting = ssTimerSetting === 0 ? 60 : 0;  // toggle; default 1 min on first enable
  ssyncTimerToggleUI();
});

// Settings — timer duration pills
document.querySelectorAll('[data-ss-setting="timer"]').forEach(btn => {
  btn.addEventListener('click', () => {
    playPillClick();
    ssTimerSetting = parseInt(btn.dataset.value);
    ssyncTimerToggleUI();
  });
});

// Settings — reroll limit
document.querySelectorAll('[data-ss-setting="rerollLimit"]').forEach(btn => {
  btn.addEventListener('click', () => {
    playPillClick();
    const raw = btn.dataset.value;
    ssRerollLimitSetting = raw === 'Infinity' ? Infinity : parseInt(raw);
    document.querySelectorAll('[data-ss-setting="rerollLimit"]').forEach(b => {
      const bv = b.dataset.value === 'Infinity' ? Infinity : parseInt(b.dataset.value);
      b.className = `pill${bv === ssRerollLimitSetting ? ' pill-active-teal' : ''}`;
    });
  });
});

// Players screen
document.getElementById('btn-ss-players-back').addEventListener('click', () => {
  playExit();
  showScreen('screen-ss-setup');
});

document.querySelectorAll('[data-ss-player-count]').forEach(btn => {
  btn.addEventListener('click', () => {
    playPillClick();
    ssPlayerCount = parseInt(btn.dataset.ssPlayerCount);
    document.querySelectorAll('[data-ss-player-count]').forEach(b => {
      b.className = `pill${parseInt(b.dataset.ssPlayerCount) === ssPlayerCount ? ' pill-active-teal' : ''}`;
    });
    // Show/hide third operative inputs
    ['ss-player-a3', 'ss-player-b3'].forEach(id => {
      document.getElementById(id).style.display = ssPlayerCount >= 3 ? '' : 'none';
    });
  });
});

document.getElementById('btn-ss-players-confirm').addEventListener('click', () => {
  playLaunch();
  ssConfirmPlayers();
});

// How to Play overlay
document.getElementById('btn-ss-how-to-close').addEventListener('click', () => {
  playDone();
  document.getElementById('ss-how-to-overlay').style.display = 'none';
});

// ── Sylly Mode toggle ─────────────────────────────────────────────────────────
document.getElementById('ss-sylly-toggle').addEventListener('click', () => {
  ssIntelSyllyMode ? playSyllyOff() : playSyllyOn();
  ssIntelSyllyMode = !ssIntelSyllyMode;
  const toggle = document.getElementById('ss-sylly-toggle');
  toggle.textContent = ssIntelSyllyMode ? 'ON' : 'OFF';
  toggle.className   = ssIntelSyllyMode ? 'sylly-toggle-on' : 'sylly-toggle-off';
});

// ── Who Encrypts First screen ─────────────────────────────────────────────────
document.getElementById('btn-ss-first-random').addEventListener('click', () => {
  playPillClick();
  ssFirstTeamShowWinner(Math.random() < 0.5 ? 0 : 1);
});
document.getElementById('btn-ss-first-rps').addEventListener('click', () => {
  playPillClick();
  document.getElementById('ss-first-team-main').style.display = 'none';
  document.getElementById('ss-first-rps-row').style.display   = 'flex';
});
document.getElementById('btn-ss-first-rps-a').addEventListener('click', () => {
  playPillClick();
  ssFirstTeamShowWinner(0);
});
document.getElementById('btn-ss-first-rps-b').addEventListener('click', () => {
  playPillClick();
  ssFirstTeamShowWinner(1);
});
document.getElementById('btn-ss-first-go-first').addEventListener('click', () => {
  playLaunch();
  ssEncryptingTeam = ssFirstTeamWinner;
  ssStartHalf();
});
document.getElementById('btn-ss-first-go-second').addEventListener('click', () => {
  playLaunch();
  ssEncryptingTeam = 1 - ssFirstTeamWinner;
  ssStartHalf();
});
document.getElementById('btn-ss-first-back-from-rps').addEventListener('click', () => {
  playExit();
  document.getElementById('ss-first-rps-row').style.display    = 'none';
  document.getElementById('ss-first-team-main').style.display  = 'flex';
});
document.getElementById('btn-ss-first-back-from-winner').addEventListener('click', () => {
  playExit();
  document.getElementById('ss-first-winner-row').style.display = 'none';
  document.getElementById('ss-first-team-main').style.display  = 'flex';
});

// ── Tiebreak screen ───────────────────────────────────────────────────────────
document.getElementById('btn-ss-tiebreak-exit').addEventListener('click', () => {
  playExit();
  ssShowQuitOverlay();
});

let ssTiebreakWinner = 0;

function ssShowWinnerChoice(winner) {
  ssTiebreakWinner = winner;
  document.getElementById('ss-tiebreak-winner-heading').textContent =
    `${ssTeamName(winner)} — your call.`;
  document.getElementById('ss-tiebreak-method').style.display        = 'none';
  document.getElementById('ss-tiebreak-rps-result').style.display    = 'none';
  document.getElementById('ss-tiebreak-winner-choice').style.display = 'flex';
}

document.getElementById('btn-ss-tiebreak-random').addEventListener('click', () => {
  playPillClick();
  const winner = Math.random() < 0.5 ? 0 : 1;
  ssShowWinnerChoice(winner);
});

document.getElementById('btn-ss-tiebreak-rps').addEventListener('click', () => {
  playPillClick();
  document.getElementById('ss-tiebreak-method').style.display     = 'none';
  document.getElementById('ss-tiebreak-rps-result').style.display = 'flex';
});

document.getElementById('btn-ss-rps-a-won').addEventListener('click', () => {
  playPillClick();
  ssShowWinnerChoice(0);
});

document.getElementById('btn-ss-rps-b-won').addEventListener('click', () => {
  playPillClick();
  ssShowWinnerChoice(1);
});

document.getElementById('btn-ss-tiebreak-go-first').addEventListener('click', () => {
  playLaunch();
  ssIntelLeader = ssTiebreakWinner;
  ssShowIntelIntro(ssIntelLeader);
});

document.getElementById('btn-ss-tiebreak-go-second').addEventListener('click', () => {
  playLaunch();
  ssIntelLeader = 1 - ssTiebreakWinner;
  ssShowIntelIntro(ssIntelLeader);
});

// ── Intel intro ───────────────────────────────────────────────────────────────
document.getElementById('btn-ss-intel-intro-exit').addEventListener('click', () => {
  playExit();
  ssShowQuitOverlay();
});

document.getElementById('btn-ss-intel-begin').addEventListener('click', () => {
  playLaunch();
  ssStartIntelKeyword();
});

// ── Intel guess ───────────────────────────────────────────────────────────────
document.getElementById('btn-ss-intel-guess-exit').addEventListener('click', () => {
  playExit();
  ssShowQuitOverlay();
});

document.getElementById('btn-ss-intel-override').addEventListener('click', () => {
  playPillClick();
  const target = ssIntelTargetVault()[ssIntelKwIdx].word;

  // After 3 attempts: require the player to select an attempt pill first
  if (ssIntelAttemptNum >= 2 && ssIntelAttempts.length >= 3) {
    if (!ssOverrideSelectedAttempt) {
      // Flash the locked attempt rows as a prompt — shake them
      document.querySelectorAll('#ss-intel-attempts .ss-attempt-row').forEach(r => {
        r.classList.remove('shake');
        void r.offsetWidth;  // force reflow to replay animation
        r.classList.add('shake');
        setTimeout(() => r.classList.remove('shake'), 600);
      });
      return;
    }
    // Use the selected attempt
    document.getElementById('btn-override-word-guess').textContent  = ssOverrideSelectedAttempt;
  } else {
    // Earlier attempts: use current input value
    const currentInput = document.querySelector('#ss-intel-attempts input:not([disabled])');
    const guessed = currentInput ? currentInput.value.trim() : '…';
    document.getElementById('btn-override-word-guess').textContent  = guessed || '…';
  }

  document.getElementById('btn-override-word-target').textContent = target.toUpperCase();
  // Reset highlight
  ['btn-override-word-guess', 'btn-override-word-target'].forEach(id => {
    document.getElementById(id).classList.remove('ring-2', 'ring-teal-400', 'bg-teal-50');
  });
  document.getElementById('ss-override-overlay').style.display = 'flex';
});

// Word tap-to-highlight in override overlay
['btn-override-word-guess', 'btn-override-word-target'].forEach(id => {
  document.getElementById(id).addEventListener('click', () => {
    playPillClick();
    ['btn-override-word-guess', 'btn-override-word-target'].forEach(i =>
      document.getElementById(i).classList.remove('ring-2', 'ring-teal-400', 'bg-teal-50'));
    document.getElementById(id).classList.add('ring-2', 'ring-teal-400', 'bg-teal-50');
  });
});

// ── Intel override overlay ────────────────────────────────────────────────────
document.getElementById('btn-ss-override-confirm').addEventListener('click', () => {
  playSuccess();
  document.getElementById('ss-override-overlay').style.display = 'none';
  // Pass the argued word as the rawInput for history/scoring
  const argued = document.getElementById('btn-override-word-guess').textContent || '…';
  ssIntelOnFound(argued);
});

document.getElementById('btn-ss-override-cancel').addEventListener('click', () => {
  playDone();
  document.getElementById('ss-override-overlay').style.display = 'none';
});
