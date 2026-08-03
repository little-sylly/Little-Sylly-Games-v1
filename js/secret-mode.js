// ═══════════════════════════════════════════════════════════════════════════
// secret-mode.js — Konami gateway, Sylly-OS Terminal, expansion proxy state
// Depends on: engine.js (getAudioCtx, masterVolume, isMuted, showScreen)
// ═══════════════════════════════════════════════════════════════════════════

// ── Global proxy state ────────────────────────────────────────────────────────
let isSecretMode = false;
let activeExpansion = null;
window.activeExpansionOverrides = null;
// window.activeAssetPack is DECLARED in js/lib/art.js (which loads first) and only
// assigned here — set in smLaunch() when a skin pack launches, cleared in
// resetSecretMode(). Do not re-initialise it at load: this file loads last, so a
// bare `= null` here would wipe any skin state art.js is holding.

// ── Game catalogue — engine knowledge (not pack data); stays hardcoded ───────
const SM_GAMES = [
  { id: 'li5', label: "LIKE I'M FIVE",      screen: 'screen-menu'     },
  { id: 'gm',  label: 'GREAT MINDS',        screen: 'screen-gm-menu'  },
  { id: 'ss',  label: 'SECRET SIGNALS',     screen: 'screen-ss-menu'  },
  { id: 'jec', label: 'JUST ENOUGH COOKS',  screen: 'screen-jec-menu' },
  { id: 'nat', label: 'NATURAL SELECTION',  screen: 'screen-nat-menu' },
  // Card/dice games — added for asset (skin) packs. A game appears in the terminal only
  // for packs whose `games` array lists it, so these never surface for word packs.
  { id: 'frt',  label: 'FRUIT SALAD',     screen: 'screen-frt-menu'  },
  { id: 'shp',  label: 'COUNTING SHEEP',  screen: 'screen-shp-menu'  },
  { id: 'flw',  label: 'FLAWLESS',        screen: 'screen-flw-menu'  },
  { id: 'pass', label: 'PASS',            screen: 'screen-pass-menu' },
  { id: 'dyb',  label: 'THE BLUFF',       screen: 'screen-dyb-menu'  },
  { id: 'pko',  label: 'PECKING ORDER',   screen: 'screen-pko-menu'  },
];

// ── Arcade cabinets — standalone canvas games, NOT packs and NOT Sylly Games.
// Adding a cabinet = one entry here + one file in js/arcade/. No pack manifest,
// no MP config, no game-identities entry. See the spec § 2 for the exemption.
const SM_ARCADE = [
  { id: 'asherplane', label: 'ASHERPLANE', screen: 'screen-arcade-asherplane',
    start: () => apStart() },
];

// Last cabinet played this session — survives resetSecretMode() (see below).
let smArcadeLastId = null;

// ── Terminal config — expansions are built at runtime from data/packs/ ───────
// To add/remove a pack: drop a folder in data/packs/ + edit data/packs/registry.json.
// No edits here, no sw.js edit, no version bump. See docs/expansion-guide.md.
let SM_TERMINAL_CONFIG     = { expansions: [], games: SM_GAMES };
let SM_EXPANSION_OVERRIDES = {};      // id -> settings overrides (built by smLoadPacks)
let SM_PACK_WORDS          = {};      // id -> inline word array (or null if wordFile is used)
let SM_PACK_ASSETS         = {};      // id -> assets block (asset packs only; null otherwise)
let smPacksLoaded          = false;

// Build the runtime consts from data/packs/registry.json + each pack.json manifest.
// One-time; cached after first success. Throws on fetch/parse failure (caller shows error).
async function smLoadPacks() {
  if (smPacksLoaded) return;
  const ids = await (await fetch('data/packs/registry.json')).json();
  const manifests = await Promise.all(
    ids.map(id => fetch(`data/packs/${id}/pack.json`).then(r => {
      if (!r.ok) throw new Error(`pack ${id}: HTTP ${r.status}`);
      return r.json();
    }))
  );
  SM_TERMINAL_CONFIG.expansions = manifests.map(m => ({
    id: m.id, label: m.label, locked: !!m.locked,
    games: m.games, subCategories: m.subCategories || [],
    wordFile: m.wordFile || null,
    // Asset (skin) packs are grouped per-game in the terminal instead of listed individually.
    isAsset: !!m.assets,
    game: m.assets ? ((m.games && m.games[0]) || m.assets.kind) : null,
  }));
  // Locked teaser sentinel — appended by the loader, always last, never a real pack.
  SM_TERMINAL_CONFIG.expansions.push({ id: 'classified', label: '??? [CLASSIFIED]', locked: true });
  manifests.forEach(m => {
    SM_EXPANSION_OVERRIDES[m.id] = smReviveSettings(m.settings || {});
    SM_PACK_WORDS[m.id]          = m.words || null;   // null => fetch wordFile at launch
    SM_PACK_ASSETS[m.id]         = m.assets || null;  // present only for asset (skin) packs
  });
  smPacksLoaded = true;
}

// JSON has no Infinity literal — manifests store it as the string "Infinity".
// Convert it back to the JS Infinity number so === Infinity checks (e.g.
// ssRerollLimitSetting → "Unlimited" rerolls) keep working after the round-trip.
function smReviveSettings(settings) {
  const out = {};
  for (const [k, v] of Object.entries(settings)) {
    out[k] = (v === 'Infinity') ? Infinity : v;
  }
  return out;
}

// ── Asset packs (Phase B) — device-local cosmetic skins, zero multiplayer impact ──
// Secret Mode's job is only to SET the active skin: smLaunch() assigns
// window.activeAssetPack, resetSecretMode() clears it. Resolution itself lives in
// js/lib/art.js (assetFace / assetBack / assetExtra), which loads before every game
// plugin and layers skin → core art (data/art/) → emoji fallback. Do NOT redeclare
// those functions here: secret-mode.js loads last, so a duplicate declaration would
// silently clobber the three-tier resolver with a skins-only one.

// ── Settings display map — human-readable labels for the terminal summary ─────
const SM_SETTINGS_DISPLAY = {
  li5: [
    { key: 'settingTimer',       label: 'Timer',       fmt: v => `${v}s` },
    { key: 'settingRounds',      label: 'Rounds',      fmt: v => String(v) },
    { key: 'settingTabooCount',  label: 'No-No List',  fmt: v => `${v} words` },
    { key: 'settingPenaltyMode', label: 'Penalty',     fmt: v => v[0].toUpperCase() + v.slice(1) },
    { key: 'settingSkipFree',    label: 'Skip Cost',   fmt: v => v ? 'Free' : 'Costs Points' },
    { key: 'settingSylly',       label: 'Sylly Mode',  fmt: v => v ? 'ON' : 'OFF' },
    { key: 'settingSyllyPct',    label: 'Sylly %',     fmt: v => `${v}%` },
  ],
  gm: [
    { key: 'gmFrequencyRange',     label: 'Frequency',       fmt: v => v[0].toUpperCase() + v.slice(1) },
    { key: 'gmMemoryGuard',        label: 'Memory Guard',    fmt: v => v ? 'ON' : 'OFF' },
    { key: 'gmResonanceTolerance', label: 'Resonance',       fmt: v => v === 'normal' ? 'Resonant' : 'High Fidelity' },
    { key: 'gmInfiniteResync',     label: 'Infinite Resync', fmt: v => v ? 'ON' : 'OFF' },
    { key: 'gmSignalBoost',        label: 'Signal Boost',    fmt: v => v ? 'ON' : 'OFF' },
    { key: 'gmSyllyIntensity',     label: 'Sylly Mode',      fmt: v => v === 'supernova' ? 'Neural Storm' : 'OFF' },
  ],
  ss: [
    { key: 'ssDifficultyLevel',        label: 'Difficulty',        fmt: v => (['', 'Standard', 'Wild', 'Wilder'][v] ?? String(v)) },
    { key: 'ssSettingInterceptsToWin', label: 'Intercepts to Win', fmt: v => String(v) },
    { key: 'ssRerollLimitSetting',     label: 'Rerolls',           fmt: v => v === Infinity ? 'Unlimited' : String(v) },
    { key: 'ssIntelSyllyMode',         label: 'Intel Phase',       fmt: v => v ? 'ON' : 'OFF' },
  ],
  jec: [
    { key: 'jecRounds',            label: 'Dishes',     fmt: v => String(v) },
    { key: 'jecRottenPenalty',     label: 'Rotten',     fmt: v => v ? '−10 pts' : 'Off' },
    { key: 'jecSpoiltPenalty',     label: 'Spoilt',     fmt: v => v ? '−10 pts' : 'Off' },
    { key: 'jecKitchenNightmares', label: 'Sylly Mode', fmt: v => v ? 'ON' : 'OFF' },
  ],
  nat: [
    { key: 'natMatchesSetting', label: 'Habitats',         fmt: v => String(v) },
    { key: 'natRoundsPerMatch', label: 'Days / Habitat',   fmt: v => String(v) },
    { key: 'natDifficulty',     label: 'Field Difficulty', fmt: v => ({ 'd1': 'Shallow', 'd1+d2': 'Mixed', 'all': 'All' }[v] ?? v) },
    { key: 'natSyllyMode',      label: 'Sylly Mode',       fmt: v => v ? 'ON' : 'OFF' },
  ],
};

// ── Expansion word bank — loaded at launch, shared by all plugins ─────────────
let secretWords = [];

// ── Expansion data index — built at launch from secretWords ──────────────────
// vocab:      Set of normalised strings for O(1) guard checks
// byCategory: { CategoryName: [primary words...] } — sorted, for display
// misc:       all nono_list terms deduplicated + sorted — for display
function smBuildExpansionData(words) {
  const byCategory = {};
  const miscSet    = new Set();
  const vocab      = new Set();
  words.forEach(entry => {
    const cat = entry.category;
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(entry.word);
    vocab.add(normaliseWord(entry.word));
    entry.nono_list.forEach(term => {
      vocab.add(normaliseWord(term));
      miscSet.add(term);
    });
  });
  Object.keys(byCategory).forEach(cat => byCategory[cat].sort());
  window.activeExpansionData = { vocab, byCategory, misc: [...miscSet].sort() };
}

// ── Terminal UI state ─────────────────────────────────────────────────────────
let smSelectedExpansion   = null;
let smSelectedGame        = null;
let smSelectedSubCategory = null;
let smTypewriterTimers    = [];

// ── Konami sequence: U U D D L R L R B A Start ───────────────────────────────
const SM_KONAMI = ['U','U','D','D','L','R','L','R','B','A','S'];
let smKonamiBuffer = [];

// ── Reset (called by engine.js resetToLobby via forward reference) ────────────
function resetSecretMode() {
  isSecretMode  = false;
  activeExpansion = null;
  window.activeExpansionOverrides = null;
  window.activeAssetPack = null;
  smKonamiBuffer        = [];
  secretWords           = [];
  smSelectedExpansion   = null;
  smSelectedGame        = null;
  smSelectedSubCategory = null;
  smTypewriterTimers.forEach(clearTimeout);
  smTypewriterTimers  = [];
  document.querySelectorAll('.sm-menu-banner').forEach(el => el.remove());
  window.activeExpansionData = null;
  // DELIBERATELY NOT CLEARED: smArcadeUnlocked, smArcadeLastId and the
  // Asherplane session leaderboard. This function runs on every resetToLobby(),
  // so clearing them would re-lock the arcade and wipe the scores each time a
  // child backs out to the menu. That is the whole problem the sticky unlock
  // solves. Do not "tidy" these into the list above.
  smUpdateProgress();
}

// ── Retro beep (square wave, NES-style) ──────────────────────────────────────
function playSecretBeep(freq = 440) {
  if (isMuted) return;
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.connect(env);
  env.connect(ctx.destination);
  osc.type = 'square';
  osc.frequency.value = freq;
  env.gain.setValueAtTime(0.12 * masterVolume, now);
  env.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
  osc.start(now);
  osc.stop(now + 0.07);
}

// ── Progress dots display (controller screen) ─────────────────────────────────
function smUpdateProgress() {
  const el = document.getElementById('sm-konami-progress');
  if (!el) return;
  const filled = smKonamiBuffer.length;
  const total  = SM_KONAMI.length;
  el.textContent = '●'.repeat(filled) + '○'.repeat(total - filled);
}

// ── Konami buffer check ───────────────────────────────────────────────────────
function smHandleButton(code) {
  playSecretBeep();
  smKonamiBuffer.push(code);
  if (smKonamiBuffer.length > SM_KONAMI.length) smKonamiBuffer.shift();
  smUpdateProgress();

  if (smKonamiBuffer.join('') === SM_KONAMI.join('')) {
    smKonamiBuffer = [];
    smUpdateProgress();
    // Discovery beat — the arcade stays unlocked for the rest of the session.
    smArcadeUnlocked = true;
    smShowArcadeTile();
    // Victory arpeggio
    playSecretBeep(523);
    setTimeout(() => playSecretBeep(659), 100);
    setTimeout(() => playSecretBeep(784), 200);
    // Show ACCESS GRANTED then slide to terminal
    setTimeout(() => {
      document.getElementById('sm-controller-status').textContent = '[ ACCESS GRANTED ]';
      document.getElementById('sm-controller-status').style.color = '#00FF00';
    }, 350);
    setTimeout(() => smOpenTerminal(), 1400);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ── Sylly-OS Terminal ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

async function smOpenTerminal() {
  smSelectedExpansion   = null;
  smSelectedGame        = null;
  smSelectedSubCategory = null;
  // Clear terminal UI to a clean state
  document.getElementById('sm-terminal-log').innerHTML = '';
  document.getElementById('sm-terminal-expansions').style.display     = 'none';
  document.getElementById('sm-terminal-expansions').innerHTML          = '';
  document.getElementById('sm-terminal-subcategories').style.display  = 'none';
  document.getElementById('sm-terminal-subcategories').innerHTML       = '';
  document.getElementById('sm-terminal-games').style.display          = 'none';
  document.getElementById('sm-terminal-games').innerHTML               = '';
  document.getElementById('sm-terminal-launch-wrap').style.display = 'none';
  const sp = document.getElementById('sm-terminal-settings');
  if (sp) sp.remove();
  showScreen('screen-secret-terminal');
  // Build the expansion list from data/packs/ before the boot sequence renders it.
  let loadOk = true;
  try { await smLoadPacks(); }
  catch (e) { console.error('[Secret Mode] Pack load failed:', e); loadOk = false; }
  if (loadOk) smRunBootSequence();
  else        smRunBootError();
}

// Pack registry/manifest fetch failed (e.g. first-ever terminal open while offline).
function smRunBootError() {
  smTypeLines([
    '> BOOTING SYLLY-OS v1.0...',
    '> LOADING EXPANSION DATABASE...',
    '> [ LOAD FAILED ] — DATABASE UNREACHABLE',
    '',
    '> WORD PACKS AND SKINS NEED A NETWORK. RECONNECT, THEN RE-ENTER THE CODE.',
    '> THE ARCADE NEEDS NO NETWORK — TAP THE JOYSTICK BACK IN THE BOX.',
  ], 0, 220, null);
}

// Typewriter: reveals an array of strings line by line, then calls callback
function smTypeLines(lines, baseDelay, lineGap, callback) {
  smTypewriterTimers.forEach(clearTimeout);
  smTypewriterTimers = [];
  const log = document.getElementById('sm-terminal-log');
  lines.forEach((text, i) => {
    const t = setTimeout(() => {
      const p = document.createElement('p');
      p.textContent = text;
      if (text === '') {
        p.innerHTML = '&nbsp;';
        p.style.lineHeight = '0.5';
      }
      log.appendChild(p);
      log.scrollTop = log.scrollHeight;
    }, baseDelay + i * lineGap);
    smTypewriterTimers.push(t);
  });
  if (callback) {
    const total = baseDelay + lines.length * lineGap;
    const t = setTimeout(callback, total);
    smTypewriterTimers.push(t);
  }
}

function smRunBootSequence() {
  const lines = [
    '> BOOTING SYLLY-OS v1.0...',
    '> LOADING EXPANSION DATABASE...',
    '> AUTHENTICATION: VERIFIED',
    '',
    '> SELECT CATEGORY:',
  ];
  smTypeLines(lines, 0, 220, smRenderExpansions);
}

// Style helpers for terminal list buttons (kept identical to the original markup).
const SM_BTN_CLS        = 'w-full text-left text-xs font-mono px-3 py-3 border-2 border-green-400 text-green-400 rounded active:scale-95 transition-transform duration-75 min-h-11';
const SM_BTN_LOCKED_CLS = 'w-full text-left text-xs font-mono px-3 py-3 border-2 border-green-900 text-green-900 rounded opacity-50 cursor-not-allowed min-h-11';

// Tiny log helpers for the terminal console.
function smLogLine(text)  { const p = document.createElement('p'); p.textContent = text; document.getElementById('sm-terminal-log').appendChild(p); }
function smLogSpacer()    { const p = document.createElement('p'); p.innerHTML = '&nbsp;'; p.style.lineHeight = '0.5'; document.getElementById('sm-terminal-log').appendChild(p); }

function smShowList(wrap) { wrap.style.display = 'flex'; wrap.style.flexDirection = 'column'; wrap.style.gap = '8px'; }

// "← BACK" entry prepended to a category-member list — returns to the top-level categories.
function smAppendBackButton(wrap) {
  const btn = document.createElement('button');
  btn.className = 'w-full text-left text-xs font-mono px-3 py-2 text-green-600 active:scale-95 transition-transform duration-75 min-h-11';
  btn.textContent = '  [←] BACK';
  btn.addEventListener('click', smReturnToCategories);
  wrap.appendChild(btn);
}

// ── Top level: content CATEGORIES (Word Packs / Game Skins) — nested so the
// structure survives a category being emptied (e.g. IP word packs pulled at go-live).
function smRenderExpansions() {
  const wrap = document.getElementById('sm-terminal-expansions');
  wrap.innerHTML = '';
  const all = SM_TERMINAL_CONFIG.expansions;
  const hasWords = all.some(e => !e.isAsset && !e.locked);
  const hasSkins = all.some(e => e.isAsset);
  // ARCADE leads: Secret Mode is broader than "packs that change existing games".
  // It is unconditional — cabinets are engine knowledge, not pack data, so it
  // renders even when the pack registry failed to load.
  const cats = [{ id: 'arcade', label: 'ARCADE' }];
  if (hasWords) cats.push({ id: 'words', label: 'WORD PACKS' });
  if (hasSkins) cats.push({ id: 'skins', label: 'GAME SKINS' });
  all.filter(e => e.locked).forEach(e => cats.push({ id: e.id, label: e.label, locked: true }));

  cats.forEach((c, i) => {
    const btn = document.createElement('button');
    btn.className = c.locked ? SM_BTN_LOCKED_CLS : SM_BTN_CLS;
    btn.textContent = `  [${i + 1}] ${c.label}${c.locked ? ' — LOCKED' : ''}`;
    btn.disabled = !!c.locked;
    if (!c.locked) btn.addEventListener('click', () => smSelectCategory(c.id));
    wrap.appendChild(btn);
  });
  smShowList(wrap);
}

function smReturnToCategories() {
  playSecretBeep(440);
  smSelectedExpansion = null; smSelectedGame = null; smSelectedSubCategory = null;
  const prevSp = document.getElementById('sm-terminal-settings'); if (prevSp) prevSp.remove();
  document.getElementById('sm-terminal-subcategories').style.display = 'none';
  document.getElementById('sm-terminal-games').style.display = 'none';
  document.getElementById('sm-terminal-launch-wrap').style.display = 'none';
  smLogSpacer(); smLogLine('  └─ SELECT CATEGORY:');
  smRenderExpansions();
  document.getElementById('sm-terminal-expansions').style.display = 'flex';
}

function smSelectCategory(cat) {
  playSecretBeep(660);
  const label = cat === 'arcade' ? 'ARCADE'
              : cat === 'words'  ? 'WORD PACKS'
              :                    'GAME SKINS';
  smLogLine(`> CATEGORY: ${label} SELECTED`);
  smLogSpacer();
  smLogLine(cat === 'arcade' ? '  └─ SELECT CABINET:'
          : cat === 'words'  ? '  └─ SELECT PACK:'
          :                    '  └─ SELECT GAME:');
  document.getElementById('sm-terminal-log').scrollTop = document.getElementById('sm-terminal-log').scrollHeight;
  if      (cat === 'arcade') smRenderArcade();
  else if (cat === 'words')  smRenderWordPacks();
  else                       smRenderSkinGames();
}

// Word-pack themes (theme-first; multi-game). Reuses the existing smSelectExpansion flow.
function smRenderWordPacks() {
  const wrap = document.getElementById('sm-terminal-expansions');
  wrap.innerHTML = '';
  smAppendBackButton(wrap);
  SM_TERMINAL_CONFIG.expansions.filter(e => !e.isAsset && !e.locked).forEach((exp, i) => {
    const btn = document.createElement('button');
    btn.className = SM_BTN_CLS;
    btn.textContent = `  [${i + 1}] ${exp.label}`;
    btn.addEventListener('click', () => smSelectExpansion(exp.id));
    wrap.appendChild(btn);
  });
  smShowList(wrap);
}

// Games that have at least one skin (game-first). Drills into that game's skin list.
function smRenderSkinGames() {
  const wrap = document.getElementById('sm-terminal-expansions');
  wrap.innerHTML = '';
  smAppendBackButton(wrap);
  const games = [];
  SM_TERMINAL_CONFIG.expansions.filter(e => e.isAsset).forEach(e => { if (e.game && !games.includes(e.game)) games.push(e.game); });
  games.forEach((g, i) => {
    const label = (SM_GAMES.find(x => x.id === g) || {}).label || g.toUpperCase();
    const btn = document.createElement('button');
    btn.className = SM_BTN_CLS;
    btn.textContent = `  [${i + 1}] ${label}`;
    btn.addEventListener('click', () => smSelectSkinGroup(g, label));
    wrap.appendChild(btn);
  });
  smShowList(wrap);
}

// ── Arcade drill-down: cabinet list → launch ──────────────────────────────────
// Tapping a cabinet launches it immediately. This diverges from the skin flow
// (which arms, then needs a LAUNCH tap) on purpose: skins arm first so the
// active settings can be reviewed before committing, and a cabinet has none.
function smRenderArcade() {
  const wrap = document.getElementById('sm-terminal-expansions');
  wrap.innerHTML = '';
  smAppendBackButton(wrap);
  SM_ARCADE.forEach((cab, i) => {
    const btn = document.createElement('button');
    btn.className = SM_BTN_CLS;
    btn.textContent = `  [${i + 1}] ${cab.label}`;
    btn.addEventListener('click', () => smLaunchArcade(cab.id));
    wrap.appendChild(btn);
  });
  smShowList(wrap);
}

// Lean sibling of smLaunch(). No word bank, no settings overrides, no asset
// pack, no breadcrumb banner — a cabinet has no host game to decorate.
// smLaunch() is deliberately left untouched.
function smLaunchArcade(id) {
  const cab = SM_ARCADE.find(c => c.id === id);
  if (!cab) return;
  isSecretMode   = true;
  smArcadeLastId = id;
  playSecretBeep(523);
  setTimeout(() => playSecretBeep(784), 120);
  setTimeout(() => cab.start(), 260);
}

// ── Sticky session unlock ─────────────────────────────────────────────────────
// Flips true the moment the Konami sequence lands — the discovery beat. Stays
// true until the page is reloaded, so the arcade needs unlocking once per
// session rather than once per visit to the lobby. Memory only: no
// localStorage, and "scores last the afternoon, not forever" is the intent.
let smArcadeUnlocked = false;

// Injects the 🕹️ shortcut beside the lobby's 🎮. Built in JS rather than in
// index.html because the tile only exists once unlocked — this keeps the whole
// arcade self-contained and leaves the lobby markup alone. Idempotent.
function smShowArcadeTile() {
  if (document.getElementById('sm-arcade-tile')) return;
  const icon = document.getElementById('lobby-icon');
  if (!icon) return;
  const row = document.createElement('div');
  row.className = 'flex items-center justify-center gap-4';
  icon.parentElement.insertBefore(row, icon);
  row.appendChild(icon);
  const btn = document.createElement('button');
  btn.id = 'sm-arcade-tile';
  btn.className = 'text-5xl active:scale-90 transition-transform duration-100 min-h-11 min-w-11';
  btn.setAttribute('aria-label', 'Arcade');
  btn.textContent = '🕹️';
  btn.addEventListener('click', () => { playSecretBeep(660); smOpenArcadeMenu(); });
  row.appendChild(btn);
}

// Lean sibling of smOpenTerminal(). Critically it does NOT await smLoadPacks():
// cabinets need no pack data, so the arcade still opens on a cold offline start
// — exactly the case where the registry fetch fails and smRunBootError() would
// otherwise block entry.
function smOpenArcadeMenu() {
  smSelectedExpansion   = null;
  smSelectedGame        = null;
  smSelectedSubCategory = null;
  document.getElementById('sm-terminal-log').innerHTML            = '';
  document.getElementById('sm-terminal-expansions').innerHTML     = '';
  document.getElementById('sm-terminal-expansions').style.display = 'none';
  document.getElementById('sm-terminal-subcategories').innerHTML     = '';
  document.getElementById('sm-terminal-subcategories').style.display = 'none';
  document.getElementById('sm-terminal-games').innerHTML          = '';
  document.getElementById('sm-terminal-games').style.display      = 'none';
  document.getElementById('sm-terminal-launch-wrap').style.display = 'none';
  const sp = document.getElementById('sm-terminal-settings');
  if (sp) sp.remove();
  showScreen('screen-secret-terminal');
  smTypeLines([
    '> SYLLY-OS ARCADE',
    '> INSERT COIN...',
    '',
    '  └─ SELECT CABINET:',
  ], 0, 200, smRenderArcade);
}

// ── Asset-pack drill-down: <GAME> SKINS → skin list → arm + launch ─────────────
function smSelectSkinGroup(gameId, groupLabel) {
  playSecretBeep(660);
  smSelectedExpansion   = null;
  smSelectedGame        = null;
  smSelectedSubCategory = null;
  const prevSp = document.getElementById('sm-terminal-settings');
  if (prevSp) prevSp.remove();
  const log = document.getElementById('sm-terminal-log');
  const p = document.createElement('p'); p.textContent = `> ${groupLabel} SELECTED`; log.appendChild(p);
  const sp = document.createElement('p'); sp.innerHTML = '&nbsp;'; sp.style.lineHeight = '0.5'; log.appendChild(sp);
  const p3 = document.createElement('p'); p3.textContent = '  └─ SELECT SKIN:'; log.appendChild(p3);
  log.scrollTop = log.scrollHeight;
  document.getElementById('sm-terminal-expansions').style.display = 'none';
  document.getElementById('sm-terminal-launch-wrap').style.display = 'none';
  smRenderSkins(gameId);
}

function smRenderSkins(gameId) {
  const wrap = document.getElementById('sm-terminal-subcategories');   // reuse the mid-level list container
  wrap.innerHTML = '';
  SM_TERMINAL_CONFIG.expansions.filter(e => e.isAsset && e.game === gameId).forEach((skin, i) => {
    const btn = document.createElement('button');
    btn.className = SM_BTN_CLS;
    btn.textContent = `  [${i + 1}] ${skin.label}`;
    btn.addEventListener('click', () => smSelectSkin(skin.id, gameId, skin.label));
    wrap.appendChild(btn);
  });
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.gap = '8px';
}

function smSelectSkin(packId, gameId, skinLabel) {
  playSecretBeep(660);
  smSelectedExpansion = packId;   // the asset pack id (still a first-class expansion entry)
  smSelectedGame      = gameId;   // game is implicit for a skin — no game-selection step
  const prevSp = document.getElementById('sm-terminal-settings');
  if (prevSp) prevSp.remove();
  const log = document.getElementById('sm-terminal-log');
  const p = document.createElement('p'); p.textContent = `> SKIN: ${skinLabel} ARMED`; log.appendChild(p);
  const sp = document.createElement('p'); sp.innerHTML = '&nbsp;'; sp.style.lineHeight = '0.5'; log.appendChild(sp);
  log.scrollTop = log.scrollHeight;
  document.getElementById('sm-terminal-subcategories').style.display = 'none';
  document.getElementById('sm-terminal-launch-wrap').style.display = 'block';
  const terminal = document.getElementById('screen-secret-terminal');
  setTimeout(() => { terminal.scrollTop = terminal.scrollHeight; }, 30);
}

function smSelectExpansion(expansionId) {
  playSecretBeep(660);
  smSelectedExpansion = expansionId;
  smSelectedGame      = null;
  // Clear any leftover settings panel from a previous game choice
  const prevSp = document.getElementById('sm-terminal-settings');
  if (prevSp) prevSp.remove();
  // Append selection confirmation to log
  const log = document.getElementById('sm-terminal-log');
  const exp = SM_TERMINAL_CONFIG.expansions.find(e => e.id === expansionId);
  const p = document.createElement('p');
  p.textContent = `> EXPANSION: ${exp?.label ?? expansionId.toUpperCase()} SELECTED`;
  log.appendChild(p);
  const p2 = document.createElement('p');
  p2.innerHTML = '&nbsp;';
  p2.style.lineHeight = '0.5';
  log.appendChild(p2);
  const p3 = document.createElement('p');
  p3.textContent = exp.subCategories?.length ? '  └─ SELECT GENERATION:' : '  └─ SELECT GAME:';
  log.appendChild(p3);
  log.scrollTop = log.scrollHeight;
  // Collapse expansion list — it's chosen, now drill into sub-category or game selection
  document.getElementById('sm-terminal-expansions').style.display = 'none';
  // Hide launch, reset game selection
  document.getElementById('sm-terminal-launch-wrap').style.display = 'none';
  if (exp.subCategories?.length) {
    smRenderSubCategories(exp.subCategories);
  } else {
    smRenderGames();
  }
}

function smRenderSubCategories(subCats) {
  const wrap = document.getElementById('sm-terminal-subcategories');
  wrap.innerHTML = '';
  const allEntries = [...subCats, { id: null, label: 'ALL GENERATIONS' }];
  allEntries.forEach((cat, i) => {
    const btn = document.createElement('button');
    btn.className = 'w-full text-left text-xs font-mono px-3 py-3 border-2 border-green-400 text-green-400 rounded active:scale-95 transition-transform duration-75 min-h-11';
    btn.textContent = `  [${i + 1}] ${cat.label}`;
    btn.addEventListener('click', () => smSelectSubCategory(cat.id, cat.label));
    wrap.appendChild(btn);
  });
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.gap = '8px';
}

function smSelectSubCategory(subCatId, subCatLabel) {
  playSecretBeep(660);
  smSelectedSubCategory = subCatId;
  const log = document.getElementById('sm-terminal-log');
  const p = document.createElement('p');
  p.textContent = `> GENERATION: ${subCatLabel} SELECTED`;
  log.appendChild(p);
  const p2 = document.createElement('p');
  p2.innerHTML = '&nbsp;';
  p2.style.lineHeight = '0.5';
  log.appendChild(p2);
  const p3 = document.createElement('p');
  p3.textContent = '  └─ SELECT GAME:';
  log.appendChild(p3);
  log.scrollTop = log.scrollHeight;
  document.getElementById('sm-terminal-subcategories').style.display = 'none';
  smRenderGames();
}

function smRenderGames() {
  const wrap = document.getElementById('sm-terminal-games');
  wrap.innerHTML = '';
  const expCfg = SM_TERMINAL_CONFIG.expansions.find(e => e.id === smSelectedExpansion);
  const visibleGames = expCfg?.games
    ? SM_TERMINAL_CONFIG.games.filter(g => expCfg.games.includes(g.id))
    : SM_TERMINAL_CONFIG.games;
  visibleGames.forEach((game, i) => {
    const btn = document.createElement('button');
    btn.id = `sm-game-btn-${game.id}`;
    btn.className = 'w-full text-left text-xs font-mono px-3 py-3 border-2 border-green-400 text-green-400 rounded active:scale-95 transition-transform duration-75 min-h-11';
    btn.textContent = `  [${i + 1}] ${game.label}`;
    btn.addEventListener('click', () => smSelectGame(game.id));
    wrap.appendChild(btn);
  });
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.gap = '8px';
  wrap.style.paddingLeft = '16px';
}

function smSelectGame(gameId) {
  playSecretBeep(660);
  smSelectedGame = gameId;
  // Visual: highlight selected, dim others
  SM_TERMINAL_CONFIG.games.forEach(g => {
    const btn = document.getElementById(`sm-game-btn-${g.id}`);
    if (!btn) return;
    if (g.id === gameId) {
      btn.className = 'w-full text-left text-xs font-mono px-3 py-3 border-2 border-green-400 bg-green-400 text-black rounded active:scale-95 transition-transform duration-75 min-h-11';
    } else {
      btn.className = 'w-full text-left text-xs font-mono px-3 py-3 border border-green-900 text-green-900 rounded opacity-40 min-h-11';
    }
  });

  // Remove previous settings panel if user is switching games
  const prevSp = document.getElementById('sm-terminal-settings');
  if (prevSp) prevSp.remove();

  // Build and inject settings summary before the launch button
  const overrides   = SM_EXPANSION_OVERRIDES[smSelectedExpansion] || {};
  const settingDefs = SM_SETTINGS_DISPLAY[gameId] || [];
  const sp = document.createElement('div');
  sp.id = 'sm-terminal-settings';
  sp.className = 'mb-3 flex-shrink-0 pl-4 text-xs font-mono leading-6';
  const hdr = document.createElement('p');
  hdr.className = 'text-green-400 mb-1';
  hdr.textContent = '  \u2514\u2500 ACTIVE SETTINGS:';
  sp.appendChild(hdr);
  settingDefs.forEach(({ key, label, fmt }) => {
    if (!(key in overrides)) return;
    const line = document.createElement('p');
    line.className = 'text-green-600';
    line.textContent = `     \u00b7 ${label}: ${fmt(overrides[key])}`;
    sp.appendChild(line);
  });
  document.getElementById('sm-terminal-launch-wrap').before(sp);

  document.getElementById('sm-terminal-launch-wrap').style.display = 'block';

  // Scroll terminal to reveal settings + launch button
  const terminal = document.getElementById('screen-secret-terminal');
  setTimeout(() => { terminal.scrollTop = terminal.scrollHeight; }, 30);
}

async function smLaunch() {
  if (!smSelectedExpansion || !smSelectedGame) return;
  const game = SM_TERMINAL_CONFIG.games.find(g => g.id === smSelectedGame);
  if (!game) return;

  // Show loading state
  const btn = document.getElementById('sm-terminal-launch');
  btn.textContent = '[ LOADING... ]';
  btn.disabled = true;

  try {
    // Load expansion word bank before navigating — solves GM Round 2 race condition.
    // Inline words come straight from the manifest; wordFile is the escape-hatch path.
    const expansion = SM_TERMINAL_CONFIG.expansions.find(e => e.id === smSelectedExpansion);
    const inline = SM_PACK_WORDS[smSelectedExpansion];
    const assets = SM_PACK_ASSETS[smSelectedExpansion];
    // Asset pack: device-local skin read by the render seams via assetFace(). No MP sync.
    window.activeAssetPack = assets ? { id: smSelectedExpansion, assets } : null;
    if (inline) {
      secretWords = inline.slice();
    } else if (expansion && expansion.wordFile) {
      const res = await fetch(`data/packs/${smSelectedExpansion}/${expansion.wordFile}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      secretWords = await res.json();
    } else if (assets) {
      secretWords = [];   // pure asset (skin) pack — no word bank
    } else {
      throw new Error('pack has neither words/wordFile nor assets');
    }
    if (smSelectedSubCategory) {
      secretWords = secretWords.filter(w => w.category === smSelectedSubCategory);
    }
    smBuildExpansionData(secretWords);
  } catch (e) {
    console.error('[Secret Mode] Word load failed:', e);
    btn.textContent = '[ LOAD FAILED — RETRY ]';
    btn.disabled = false;
    return;
  }

  // Push model: write overrides now; plugins read on settings-apply (SM-4/5)
  isSecretMode = true;
  activeExpansion = smSelectedExpansion;
  window.activeExpansionOverrides = SM_EXPANSION_OVERRIDES[smSelectedExpansion] || {};

  // Launch audio + navigate
  playSecretBeep(523);
  setTimeout(() => playSecretBeep(784), 120);
  setTimeout(() => {
    btn.textContent = '[ LAUNCH SEQUENCE ]';
    btn.disabled = false;
    showScreen(game.screen);
    // Inject submenu breadcrumb banner into the target game menu screen
    const screenEl = document.getElementById(game.screen);
    let banner = screenEl.querySelector('.sm-menu-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.className = 'sm-menu-banner absolute top-0 left-0 right-0 z-10 bg-black border-b border-green-800 px-3 py-2 flex items-center justify-between font-mono text-xs text-green-400 tracking-widest';
      screenEl.prepend(banner);
    }
    const subCatLabel = smSelectedSubCategory
      ? SM_TERMINAL_CONFIG.expansions.find(e => e.id === smSelectedExpansion)
          ?.subCategories?.find(s => s.id === smSelectedSubCategory)?.label
      : null;
    const expLabel = (SM_TERMINAL_CONFIG.expansions.find(e => e.id === smSelectedExpansion)?.label ?? smSelectedExpansion.toUpperCase())
      + (subCatLabel ? ` (${subCatLabel})` : '');
    banner.innerHTML = `
      <button onclick="smOpenTerminal()" class="text-green-600 active:scale-90 transition-transform duration-75 min-h-11 px-1">← TERMINAL</button>
      <span>SYLLY-OS › ${expLabel} › ${game.label}</span>
      <span class="opacity-0">← TERMINAL</span>
    `;
  }, 300);
}

// ═══════════════════════════════════════════════════════════════════════════
// ── Vocab Overlay (Secret Mode GM reference) ──────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

let smVocabActiveTab = 'ALL';

function smOpenVocabOverlay() {
  if (!window.activeExpansionData) return;
  smVocabActiveTab = 'ALL';
  document.getElementById('gm-vocab-search').value = '';
  const expLabel = SM_TERMINAL_CONFIG.expansions.find(e => e.id === activeExpansion)?.label ?? '';
  document.getElementById('gm-vocab-title').textContent = `VOCAB INDEX — ${expLabel}`;
  smRenderVocabTabs();
  smRenderVocabList();
  document.getElementById('gm-vocab-overlay').style.display = 'flex';
}

function smRenderVocabTabs() {
  const { byCategory } = window.activeExpansionData;
  const tabs = ['ALL', ...Object.keys(byCategory).sort(), 'MISC'];
  const wrap = document.getElementById('gm-vocab-tabs');
  wrap.innerHTML = '';
  tabs.forEach(tab => {
    const btn = document.createElement('button');
    btn.textContent = tab;
    btn.className = tab === smVocabActiveTab
      ? 'text-xs font-mono px-3 py-1 rounded border border-green-400 bg-green-400 text-black min-h-11 flex-shrink-0'
      : 'text-xs font-mono px-3 py-1 rounded border border-green-800 text-green-600 min-h-11 flex-shrink-0 active:scale-95 transition-transform hover:bg-green-900/30 transition-colors';
    btn.addEventListener('click', () => {
      smVocabActiveTab = tab;
      document.getElementById('gm-vocab-search').value = '';
      smRenderVocabTabs();
      smRenderVocabList();
    });
    wrap.appendChild(btn);
  });
}

function smRenderVocabList() {
  const { byCategory, misc } = window.activeExpansionData;
  const search = document.getElementById('gm-vocab-search').value.toLowerCase().trim();
  let words;
  if (smVocabActiveTab === 'ALL') {
    words = [...new Set([...Object.values(byCategory).flat(), ...misc])].sort();
  } else if (smVocabActiveTab === 'MISC') {
    words = misc;
  } else {
    words = byCategory[smVocabActiveTab] || [];
  }
  if (search) words = words.filter(w => w.toLowerCase().includes(search));
  const list = document.getElementById('gm-vocab-list');
  list.innerHTML = '';
  if (!words.length) {
    const p = document.createElement('p');
    p.textContent = 'No matches.';
    p.className = 'text-green-600 mt-4';
    list.appendChild(p);
    return;
  }
  words.forEach(w => {
    const p = document.createElement('p');
    p.textContent = `\u00b7 ${w}`;
    list.appendChild(p);
  });
}

document.getElementById('gm-vocab-search').addEventListener('input', smRenderVocabList);
document.getElementById('btn-gm-vocab-close').addEventListener('click', () => {
  document.getElementById('gm-vocab-overlay').style.display = 'none';
});
document.getElementById('gm-vocab-list-btn').addEventListener('click', () => {
  playPillClick();
  smOpenVocabOverlay();
});

// ── Terminal button listeners ─────────────────────────────────────────────────
document.getElementById('sm-terminal-back').addEventListener('click', () => {
  smTypewriterTimers.forEach(clearTimeout);
  smTypewriterTimers = [];
  smSelectedExpansion = null;
  smSelectedGame      = null;
  document.getElementById('sm-controller-status').textContent = '> ENTER SEQUENCE TO CONTINUE';
  document.getElementById('sm-controller-status').style.color = '';
  showScreen('screen-secret-controller');
});

document.getElementById('sm-terminal-launch').addEventListener('click', smLaunch);

// ═══════════════════════════════════════════════════════════════════════════
// ── Controller button listeners ───────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

document.getElementById('sm-btn-up').addEventListener('click',    () => smHandleButton('U'));
document.getElementById('sm-btn-down').addEventListener('click',  () => smHandleButton('D'));
document.getElementById('sm-btn-left').addEventListener('click',  () => smHandleButton('L'));
document.getElementById('sm-btn-right').addEventListener('click', () => smHandleButton('R'));
document.getElementById('sm-btn-b').addEventListener('click',     () => smHandleButton('B'));
document.getElementById('sm-btn-a').addEventListener('click',     () => smHandleButton('A'));
document.getElementById('sm-btn-start').addEventListener('click', () => smHandleButton('S'));

document.getElementById('sm-btn-exit').addEventListener('click', () => {
  smKonamiBuffer = [];
  smUpdateProgress();
  document.getElementById('sm-controller-status').textContent = '> ENTER SEQUENCE TO CONTINUE';
  document.getElementById('sm-controller-status').style.color = '';
  showScreen('screen-lobby');
});

// ── Hidden trigger: 7 rapid taps on lobby icon ───────────────────────────────
let smLobbyTapCount = 0;
let smLobbyTapTimer = null;
document.getElementById('lobby-icon').addEventListener('click', () => {
  smLobbyTapCount++;
  clearTimeout(smLobbyTapTimer);
  smLobbyTapTimer = setTimeout(() => { smLobbyTapCount = 0; }, 1500);
  if (smLobbyTapCount >= 7) {
    smLobbyTapCount = 0;
    clearTimeout(smLobbyTapTimer);
    smKonamiBuffer = [];
    smUpdateProgress();
    document.getElementById('sm-controller-status').textContent = '> ENTER SEQUENCE TO CONTINUE';
    document.getElementById('sm-controller-status').style.color = '';
    playSyllyOn();
    showScreen('screen-secret-controller');
  }
});

// ── Keyboard Konami (desktop convenience) ────────────────────────────────────
const SM_KEY_MAP = {
  ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R',
  b: 'B', B: 'B', a: 'A', A: 'A', Enter: 'S'
};
document.addEventListener('keydown', e => {
  const code = SM_KEY_MAP[e.key];
  if (!code) return;
  if (document.getElementById('screen-secret-controller').style.display !== 'none') return;
  // Asherplane's RAF loop reschedules unconditionally, so navigating away from
  // the cabinet without tearing it down leaves it updating and painting under
  // every later screen. The arrow keys are also its steering — see Small 3.
  if (document.getElementById('screen-arcade-asherplane').style.display !== 'none') return;
  smKonamiBuffer.push(code);
  if (smKonamiBuffer.length > SM_KONAMI.length) smKonamiBuffer.shift();
  if (smKonamiBuffer.join('') === SM_KONAMI.join('')) {
    smKonamiBuffer = [];
    smUpdateProgress();
    showScreen('screen-secret-controller');
  }
});
