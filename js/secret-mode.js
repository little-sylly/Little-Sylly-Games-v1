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
    { key: 'jecRounds',             label: 'Courses',         fmt: v => String(v) },
    { key: 'jecTableForOnePenalty', label: 'Table for One',   fmt: v => v ? '−5 pts' : 'Off' },
    { key: 'jecCrowdedKitchenTax',  label: 'Crowded Kitchen', fmt: v => v ? '−2 per Chef' : 'Off' },
    { key: 'jecFusionCuisine',      label: 'Sylly Mode',      fmt: v => v ? 'ON' : 'OFF' },
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
// Stack of #sm-terminal-log lengths, one push per forward navigation step that writes its
// own breadcrumb lines. A "back" pops and truncates the log to that length instead of
// appending a new line on top — otherwise the log grows every time forward/back is used,
// however many times the player wanders back and forth (11 Aug 2026).
let smLogCheckpoints = [];

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
    smOpenGateway();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ── The Sylly Gateway — the loadout between the code and the terminal ─────
// ═══════════════════════════════════════════════════════════════════════════

/* Plausible-looking nonsense. It is meant to be scanned, not read — the blur
   is doing half the work — so the shapes matter more than the words: hex
   addresses, symbol names, sizes, the vocabulary of something linking.
   Four line SHAPES, not one, so the stream reads as a real execution rather
   than one table repeated 26 times: a linker-style row (the original,
   tuned to run the container's full width so it doesn't look clipped), a raw
   hex dump (fixed-width by construction, so it always reaches the edge), and
   two templated one-liners (a code statement, a JSON blob) whose LENGTH
   varies line to line — that variation is deliberate, the same way a real
   build log doesn't line up. */
const SM_GATEWAY_TOKENS = [
  'SEG', 'REL', 'PLT', 'GOT', 'BSS', 'TEXT', 'RODATA', 'SYM', 'DWARF', 'VMA',
  'sylly_core', 'pack_registry', 'arcade_rom', 'vault_key', 'brand_lut',
  'atlas_blit', 'shader_cache', 'audio_graph', 'wake_lock', 'sw_scope',
];
const SM_GATEWAY_VERBS = [
  'LINK', 'MAP', 'PATCH', 'VERIFY', 'INFLATE', 'SEED', 'BIND', 'RESOLVE', 'MOUNT', 'ARM',
];
const SM_GATEWAY_CODE_TEMPLATES = [
  'if (vault.unlock(0x{H4}) && rom.mounted) queue.push(seed);',
  'const key = deriveKey(seed_0x{H2}, ROUNDS={N2});',
  'for (i=0;i<pack_registry.length;i++) resolve(pack_registry[i]);',
  'function initShaderCache(seed) { return atlas.decrypt(seed); }',
  'export default class Loadout extends Module { boot() { return 0x{H2}; } }',
  'await Promise.all(chunks.map(c => c.verify(0x{H4})));',
  'while (!arcade.ready) tick(sw_scope, 0x{H2});',
  'return sylly_core.mount(brand_lut, { strict: true });',
];
const SM_GATEWAY_JSON_TEMPLATES = [
  '{"module":"{TOKEN}","size":{N4},"status":"ok","chk":"0x{H4}"}',
  '{"seed":"0x{H8}","rounds":{N2},"verified":true}',
  '{"pack":"{TOKEN}","version":1,"locked":false}',
  '{"scope":"sw","cache":"{TOKEN}","hit":true}',
];

function smGatewayHex(n) {
  let s = '';
  for (let i = 0; i < n; i++) s += '0123456789ABCDEF'[Math.floor(Math.random() * 16)];
  return s;
}

function smGatewayFill(tpl) {
  return tpl
    .replace(/\{H8\}/g, () => smGatewayHex(8))
    .replace(/\{H4\}/g, () => smGatewayHex(4))
    .replace(/\{H2\}/g, () => smGatewayHex(2))
    .replace(/\{N2\}/g, () => String(1 + Math.floor(Math.random() * 32)))
    .replace(/\{N4\}/g, () => String(1 + Math.floor(Math.random() * 4096)))
    .replace(/\{TOKEN\}/g, () => SM_GATEWAY_TOKENS[Math.floor(Math.random() * SM_GATEWAY_TOKENS.length)]);
}

/* Every field is a fixed width (padEnd/fixed-length hex), so this always
   comes out the same length — long enough to run to the log's right edge
   rather than stopping visibly short of it. */
function smGatewayTableLine() {
  const v = SM_GATEWAY_VERBS[Math.floor(Math.random() * SM_GATEWAY_VERBS.length)];
  const t = SM_GATEWAY_TOKENS[Math.floor(Math.random() * SM_GATEWAY_TOKENS.length)];
  const size = (1 + Math.floor(Math.random() * 4096)) + 'b';
  return '0x' + smGatewayHex(8) + '  ' + v.padEnd(8) + t.padEnd(16) +
         '+' + smGatewayHex(4) + '  ' + size.padEnd(6) + ' #' + smGatewayHex(4) + ' OK';
}

/* A classic hex-viewer row — offset, 12 byte pairs, an ASCII gutter. Fixed
   width by construction, so it's the one shape guaranteed to reach the
   right edge every single time. */
function smGatewayHexDumpLine() {
  const addr = smGatewayHex(6);
  const bytes = [];
  let ascii = '';
  for (let i = 0; i < 12; i++) {
    const b = Math.floor(Math.random() * 256);
    bytes.push(b.toString(16).toUpperCase().padStart(2, '0'));
    ascii += (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.';
  }
  return addr + '  ' + bytes.join(' ') + '  ' + ascii;
}

/* Builds the whole stream up front so the SHAPE of the sequence is
   deliberate, not per-line-random: the first and last few lines read like a
   boot/finalise beat (a code statement or a JSON blob), the middle is mostly
   the table/hex-dump "data" simulation with occasional code/JSON breaking it
   up — mixed formats, mixed lengths, reads like a real execution rather than
   one table repeated. */
function smGatewayBuildLines(n) {
  const lines = [];
  for (let i = 0; i < n; i++) {
    const edge = i < 3 || i >= n - 3;
    let kind;
    if (edge) {
      kind = Math.random() < 0.5 ? 'code' : 'json';
    } else {
      const r = Math.random();
      kind = r < 0.55 ? 'table' : r < 0.80 ? 'hexdump' : r < 0.90 ? 'code' : 'json';
    }
    if (kind === 'table') lines.push(smGatewayTableLine());
    else if (kind === 'hexdump') lines.push(smGatewayHexDumpLine());
    else if (kind === 'code') lines.push(smGatewayFill(SM_GATEWAY_CODE_TEMPLATES[Math.floor(Math.random() * SM_GATEWAY_CODE_TEMPLATES.length)]));
    else lines.push(smGatewayFill(SM_GATEWAY_JSON_TEMPLATES[Math.floor(Math.random() * SM_GATEWAY_JSON_TEMPLATES.length)]));
  }
  return lines;
}

/* This plays once, so it earns a proper length — ~5s of stream before the
   payoff, not a 1.4s blink. */
const SM_GATEWAY_LINES = 70;
const SM_GATEWAY_GAP   = 70;   // ms — 70 × 70ms = 4.9s of stream, then the payoff

function smGatewayTimestamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear() +
         ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}

/* One line of the header's stat box — a fake module id and a fake load
   percentage, same vocabulary as the stream below it. */
function smGatewayStatLine() {
  const t = SM_GATEWAY_TOKENS[Math.floor(Math.random() * SM_GATEWAY_TOKENS.length)];
  return t.toUpperCase().slice(0, 8) + '_' + smGatewayHex(2) + '  ' +
         (100 + Math.floor(Math.random() * 900)) + '%';
}

function smOpenGateway() {
  /* The Workshop's rAF is a timer and this is an early transition out of that
     screen — logic-engine.md § Timer Lifecycle's third required clear site. */
  if (typeof ctlTeardown === 'function') ctlTeardown();
  showScreen('screen-secret-gateway');
  const ts = document.getElementById('sm-gateway-timestamp');
  if (ts) ts.textContent = smGatewayTimestamp();
  const s1 = document.getElementById('sm-gateway-stat1');
  const s2 = document.getElementById('sm-gateway-stat2');
  if (s1) s1.textContent = smGatewayStatLine();
  if (s2) s2.textContent = smGatewayStatLine();
  smGatewayStream();
}

function smGatewayStream() {
  smTypewriterTimers.forEach(clearTimeout);
  smTypewriterTimers = [];
  const log = document.getElementById('sm-gateway-log');
  const granted = document.getElementById('sm-gateway-granted');
  if (!log || !granted) return;
  log.innerHTML = '';
  granted.style.display = 'none';

  const lines = smGatewayBuildLines(SM_GATEWAY_LINES);

  /* The stream is driven by timers, and the global prefers-reduced-motion CSS
     block only zeroes animation/transition durations — it cannot reach a
     setTimeout writing text. Under reduced motion the screen renders its
     finished state at once: the whole loadout is there to read, and the payoff
     is there to tap. Reduced motion, not reduced information. */
  if (smReducedMotion()) {
    log.textContent = lines.join('\n');
    smGatewayFinish();
    return;
  }

  for (let i = 0; i < SM_GATEWAY_LINES; i++) {
    const t = setTimeout(() => {
      const p = document.createElement('div');
      p.textContent = lines[i];
      log.appendChild(p);
      log.scrollTop = log.scrollHeight;
      if (i % 4 === 0) playSecretBeep(180 + i * 12);
    }, i * SM_GATEWAY_GAP);
    smTypewriterTimers.push(t);
  }
  const done = setTimeout(smGatewayFinish, SM_GATEWAY_LINES * SM_GATEWAY_GAP + 120);
  smTypewriterTimers.push(done);
}

function smGatewayFinish() {
  const granted = document.getElementById('sm-gateway-granted');
  if (granted) granted.style.display = 'flex';
  playSecretBeep(523);
  setTimeout(() => playSecretBeep(659), 100);
  setTimeout(() => playSecretBeep(784), 200);
}

function smReducedMotion() {
  try {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (_) { return false; }
}

// ═══════════════════════════════════════════════════════════════════════════
// ── Sylly-OS Terminal ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

async function smOpenTerminal() {
  smSelectedExpansion   = null;
  smSelectedGame        = null;
  smSelectedSubCategory = null;
  smLogCheckpoints      = [];
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

// Call before a forward navigation step writes its own breadcrumb lines.
function smLogCheckpoint() { smLogCheckpoints.push(document.getElementById('sm-terminal-log').children.length); }
// Call from a "back" step instead of appending — removes everything the matching
// smLogCheckpoint()'d step wrote, leaving the log showing only the current path.
function smLogRewind() {
  const n = smLogCheckpoints.pop();
  const log = document.getElementById('sm-terminal-log');
  if (n === undefined) return;
  while (log.children.length > n) log.lastChild.remove();
  log.scrollTop = log.scrollHeight;
}

function smShowList(wrap) { wrap.style.display = 'flex'; wrap.style.flexDirection = 'column'; wrap.style.gap = '8px'; }

// "← BACK" entry prepended to a list — defaults to the top-level categories, but any
// deeper level can pass its own one-step-back handler (smRenderSkins, the launch-armed
// view) instead of jumping all the way out.
function smAppendBackButton(wrap, handler) {
  const btn = document.createElement('button');
  btn.className = 'w-full text-left text-xs font-mono px-3 py-2 text-green-600 active:scale-95 transition-transform duration-75 min-h-11';
  btn.textContent = '  [←] BACK';
  btn.addEventListener('click', handler || smReturnToCategories);
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
  smLogRewind();   // undoes whatever smSelectCategory() wrote — log already ends at SELECT CATEGORY:
  smRenderExpansions();
  document.getElementById('sm-terminal-expansions').style.display = 'flex';
}

function smSelectCategory(cat) {
  playSecretBeep(660);
  smLogCheckpoint();
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
/* The 🕹️ sits in the lobby's header icon row, to the LEFT of the speaker —
   prepended, so it reads as the earlier of the two. It used to wrap the lobby's
   🎮 emoji in a flex row and sit beside it; that emoji is now the 3D
   controller, which is the hero of the screen and has no room for a sibling.
   Idempotent, and the sticky unlock across resetToLobby() is unchanged. */
function smShowArcadeTile() {
  if (document.getElementById('sm-arcade-tile')) return;
  const row = document.getElementById('lobby-header-icons');
  if (!row) return;
  const btn = document.createElement('button');
  btn.id = 'sm-arcade-tile';
  btn.className = 'text-xl active:scale-90 transition-transform duration-100 min-h-11 min-w-11';
  btn.setAttribute('aria-label', 'Arcade');
  btn.textContent = '🕹️';
  btn.addEventListener('click', () => { playSecretBeep(660); smOpenArcadeMenu(); });
  row.insertBefore(btn, row.firstChild);
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
  smLogCheckpoint();
  const log = document.getElementById('sm-terminal-log');
  const p = document.createElement('p'); p.textContent = `> ${groupLabel} SELECTED`; log.appendChild(p);
  const sp = document.createElement('p'); sp.innerHTML = '&nbsp;'; sp.style.lineHeight = '0.5'; log.appendChild(sp);
  const p3 = document.createElement('p'); p3.textContent = '  └─ SELECT SKIN:'; log.appendChild(p3);
  log.scrollTop = log.scrollHeight;
  document.getElementById('sm-terminal-expansions').style.display = 'none';
  document.getElementById('sm-terminal-launch-wrap').style.display = 'none';
  smRenderSkins(gameId);
}

// One step back from the skin list — re-shows the "SELECT GAME" list rather than
// jumping all the way to categories, matching the back button every other first-level
// list already gets from smAppendBackButton.
function smReturnToSkinGames() {
  playSecretBeep(440);
  smSelectedExpansion = null; smSelectedGame = null;
  const prevSp = document.getElementById('sm-terminal-settings'); if (prevSp) prevSp.remove();
  document.getElementById('sm-terminal-subcategories').style.display = 'none';
  document.getElementById('sm-terminal-launch-wrap').style.display = 'none';
  smLogRewind();   // undoes whatever smSelectSkinGroup() wrote — log already ends at SELECT GAME:
  document.getElementById('sm-terminal-expansions').style.display = 'flex';
  smRenderSkinGames();
}

function smRenderSkins(gameId) {
  const wrap = document.getElementById('sm-terminal-subcategories');   // reuse the mid-level list container
  wrap.innerHTML = '';
  smAppendBackButton(wrap, smReturnToSkinGames);
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
  smLogCheckpoint();
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
  // Writes no breadcrumb line of its own, but still checkpoints — pairs with
  // smReturnFromLaunch()'s word-pack branch, which pops unconditionally.
  smLogCheckpoint();
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

// One step back from the launch-armed view — shared by both flows, since they share the
// one #sm-terminal-launch-wrap. Branches on isAsset because the correct "previous step"
// differs: a skin's is the skin list for its game, a word pack's is the game list.
function smReturnFromLaunch() {
  playSecretBeep(440);
  const exp = SM_TERMINAL_CONFIG.expansions.find(e => e.id === smSelectedExpansion);
  const gameId = smSelectedGame;
  const prevSp = document.getElementById('sm-terminal-settings');
  if (prevSp) prevSp.remove();
  document.getElementById('sm-terminal-launch-wrap').style.display = 'none';
  smSelectedGame = null;
  smLogRewind();   // undoes whatever the matching forward step (smSelectSkin / smSelectGame) wrote
  if (exp && exp.isAsset) {
    smSelectedExpansion = null;
    document.getElementById('sm-terminal-subcategories').style.display = 'flex';
    smRenderSkins(gameId);
  } else {
    document.getElementById('sm-terminal-games').style.display = 'flex';
    smRenderGames();
  }
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
    // The Terminal bypasses each game's own #btn-[abbr] lobby handler, so anything that
    // handler normally does on entry — activeGameId, a lazy data fetch — has to happen
    // here too. PKO's chain (data/pko-data.json) is fetched lazily on lobby entry (DD-07);
    // without this call the Terminal path leaves pkoChain null and the How to Play
    // Animals/Diagram tabs silently render empty.
    activeGameId = game.id;
    if (game.id === 'pko' && typeof pkoLoadChain === 'function') pkoLoadChain();
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
/* ← BACK returns to the LOBBY, not to the gateway. The gateway is now a
   one-shot boot animation: sending the player back there would either replay
   the whole hack sequence at them or strand them on a screen already reading
   ACCESS GRANTED with nothing to do but tap forward again.
   What that costs is worth being precise about. smArcadeUnlocked is sticky, so
   🕹️ stays in the lobby header for the rest of the session — but it calls
   smOpenArcadeMenu(), which lists CABINETS only (and skips smLoadPacks, so the
   arcade still opens on a cold offline start). The arcade is therefore one tap
   away; the pack/skin terminal costs a fresh Konami. Confirmed with the owner
   at spec review. */
document.getElementById('sm-terminal-back').addEventListener('click', () => {
  smTypewriterTimers.forEach(clearTimeout);
  smTypewriterTimers = [];
  smSelectedExpansion = null;
  smSelectedGame      = null;
  showScreen('screen-lobby');
  if (typeof ctlMountLobby === 'function') ctlMountLobby();
});

document.getElementById('sm-terminal-launch').addEventListener('click', smLaunch);
document.getElementById('sm-terminal-launch-back').addEventListener('click', smReturnFromLaunch);

// ═══════════════════════════════════════════════════════════════════════════
// ── The Sylly Gateway's own buttons ────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

document.getElementById('sm-btn-exit').addEventListener('click', () => {
  smTypewriterTimers.forEach(clearTimeout);
  smTypewriterTimers = [];
  smKonamiBuffer = [];
  smUpdateProgress();
  showScreen('screen-lobby');
  if (typeof ctlMountLobby === 'function') ctlMountLobby();
});

document.getElementById('sm-gateway-continue').addEventListener('click', () => {
  smTypewriterTimers.forEach(clearTimeout);
  smTypewriterTimers = [];
  playSecretBeep(880);
  smOpenTerminal();
});

// ── Keyboard Konami (desktop convenience) ────────────────────────────────────
const SM_KEY_MAP = {
  ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R',
  b: 'B', B: 'B', a: 'A', A: 'A', Enter: 'S'
};
document.addEventListener('keydown', e => {
  const code = SM_KEY_MAP[e.key];
  if (!code) return;
  if (document.getElementById('screen-secret-gateway').style.display !== 'none') return;
  // Asherplane's RAF loop reschedules unconditionally, so navigating away from
  // the cabinet without tearing it down leaves it updating and painting under
  // every later screen. The arrow keys are also its steering — see Small 3.
  if (document.getElementById('screen-arcade-asherplane').style.display !== 'none') return;
  smKonamiBuffer.push(code);
  if (smKonamiBuffer.length > SM_KONAMI.length) smKonamiBuffer.shift();
  if (smKonamiBuffer.join('') === SM_KONAMI.join('')) {
    smKonamiBuffer = [];
    smUpdateProgress();
    smArcadeUnlocked = true;
    smShowArcadeTile();
    smOpenGateway();
  }
});
