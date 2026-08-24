// ═══════════════════════════════════════════════════════════════════════════
// verify-mp-configs.js — asserts the MULTIPLAYER CONTRACT that no game harness sees.
//
//   node tools/verify-mp-configs.js        (exits 1 on any failure)
//
// Every other tools/verify-*.js drives one game's rules. This one drives the seam
// ABOVE them: MP_GAME_CONFIGS in js/engine-multiplayer.js, which the mode and lobby
// screens read directly for all 18 games.
//
// Why it exists — two bug classes that shipped, and no harness could see either:
//
//   1. LOBBY BOUNDS READING SINGLE-DEVICE STATE. getMaxPlayers/getMinPlayers are
//      consulted ONLY while a room fills (mpRenderHostPlayerList, and the room node's
//      maxPlayers at create time). Five games resolved them against a game-local
//      variable that only the Pass-the-Phone setup screen ever moves — a screen Lobby
//      Mode never shows. Every one of those rooms silently capped at that variable's
//      DEFAULT. Section 3 makes it unrepresentable: a bound may depend on nothing but
//      window.mpLobbyStyle.
//
//   2. THE MID-GAME QUIT CONTRACT SIMPLY NOT BEING WIRED UP. Eight games had an
//      unconditional quit-confirm handler, so a leaver kept its Firebase slot and
//      stranded every other device. Invisible in single-device play, and invisible to
//      every 'single'-mode harness. Section 6 greps for it.
//
// Deliberately NOT a loopback: it runs no game logic and sends no packets. It checks
// the declarations and the wiring — the things that are already wrong before a packet
// is ever sent. Run a loopback as well for anything packet-shaped.
//
// The configs are evaluated as an OBJECT LITERAL in a vm rather than by loading
// engine-multiplayer.js, which would need a whole DOM. Nothing here calls
// onPassThePhone, so the game functions it closes over never have to exist.
// ═══════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT = path.join(__dirname, '..');
// MP_SRC= points sections 1-5 at another copy of engine-multiplayer.js, so a pre-fix
// version can be driven through the same checks — proving they fail before the fix makes
// them pass. Section 6 also reads js/games/*.js and is unaffected by it.
const ENGINE_MP = process.env.MP_SRC
  ? path.resolve(process.env.MP_SRC)
  : path.join(ROOT, 'js/engine-multiplayer.js');
const INDEX     = path.join(ROOT, 'index.html');

const engineSrc = fs.readFileSync(ENGINE_MP, 'utf8');
const indexSrc  = fs.readFileSync(INDEX, 'utf8');

// ── Extract the MP_GAME_CONFIGS literal ──────────────────────────────────────
const start = engineSrc.indexOf('const MP_GAME_CONFIGS = {');
if (start < 0) { console.error('FATAL: MP_GAME_CONFIGS not found in engine-multiplayer.js'); process.exit(1); }
const open  = engineSrc.indexOf('{', start);
const close = engineSrc.indexOf('\n};', open);
if (close < 0) { console.error('FATAL: could not find the end of MP_GAME_CONFIGS'); process.exit(1); }
const literal = engineSrc.slice(open, close + 2);

const sandbox = { window: { mpLobbyStyle: 'individual' } };
vm.createContext(sandbox);
const CONFIGS = vm.runInContext('(' + literal + ')', sandbox);

// ── Harness plumbing ─────────────────────────────────────────────────────────
let failures = 0;
function check(label, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { console.log('  ok    ' + label); }
  else { failures++; console.log('  FAIL  ' + label + '\n          expected ' + e + ', got ' + a); }
}
function ok(label, cond, detail) {
  if (cond) { console.log('  ok    ' + label); }
  else { failures++; console.log('  FAIL  ' + label + (detail ? '\n          ' + detail : '')); }
}
const section = t => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 66 - t.length)));

// Evaluate a bound under a given lobby style — the ONLY legitimate input.
function bound(cfg, which, lobbyStyle) {
  sandbox.window.mpLobbyStyle = lobbyStyle;
  const fn = cfg[which];
  return typeof fn === 'function' ? fn() : undefined;
}

const IDS = Object.keys(CONFIGS);

// Plugin file per game id — the two legacy names are why this is a map, not a template.
const PLUGIN = {
  li5: 'li5.js', gm: 'great-minds.js', ss: 'secret-signals.js', jec: 'jec.js',
  ygi: 'ygi.js', lttp: 'lttp.js', nat: 'nat.js', dsd: 'dsd.js', gth: 'gth.js',
  dyb: 'dyb.js', bld: 'bld.js', pass: 'pass.js', nt: 'nt.js', frt: 'frt.js',
  shp: 'shp.js', flw: 'flw.js', pko: 'pko.js', cjar: 'cjar.js',
};

// ═════════════════════════════════════════════════════════════════════════════
console.log('\nverify-mp-configs — MP_GAME_CONFIGS + the Mid-Game Quit Contract');
console.log('='.repeat(70));

// ── 1. Schema ────────────────────────────────────────────────────────────────
// A missing display field renders the literal string "undefined" on screen-mp-mode.
section('1. Entry schema (every field the mode/lobby screens read)');
check('18 games registered', IDS.length, 18);
ok('every game has a plugin file mapping', IDS.every(id => PLUGIN[id]),
   'unmapped: ' + IDS.filter(id => !PLUGIN[id]).join(', '));

const STRINGS = ['gameName', 'emoji', 'brandBtnClass', 'ptpLabel', 'lobbyCtaLabel', 'menuScreen', 'recommendedMode'];
for (const id of IDS) {
  const c = CONFIGS[id];
  const missing = STRINGS.filter(k => typeof c[k] !== 'string' || !c[k].trim());
  ok(id + ': all display strings present', missing.length === 0, 'missing/empty: ' + missing.join(', '));
  ok(id + ': onPassThePhone is a function', typeof c.onPassThePhone === 'function');
  ok(id + ': supportedModes is a non-empty array',
     Array.isArray(c.supportedModes) && c.supportedModes.length > 0);
  ok(id + ': recommendedMode is one of supportedModes',
     (c.supportedModes || []).includes(c.recommendedMode),
     c.recommendedMode + ' not in [' + c.supportedModes + ']');
  ok(id + ': rosterConfig declares a type', !!c.rosterConfig && c.rosterConfig.type !== undefined);
  ok(id + ': menuScreen looks like a screen id', /^screen-/.test(c.menuScreen || ''));
}

// ── 2. Bounds are sane in every supported lobby style ────────────────────────
section('2. Player-count bounds are sane');
for (const id of IDS) {
  const c = CONFIGS[id];
  ok(id + ': getMaxPlayers is a function', typeof c.getMaxPlayers === 'function');
  for (const style of ['individual', 'team']) {
    // Skip a style the game cannot enter — TLM bounds are meaningless for an MDLM-only game.
    if (style === 'team' && !(c.supportedModes || []).includes('tlm')) continue;
    const max = bound(c, 'getMaxPlayers', style);
    const min = bound(c, 'getMinPlayers', style) !== undefined
      ? bound(c, 'getMinPlayers', style) : 2;   // engine default when the getter is absent
    ok(id + ' [' + style + ']: 2 <= min <= max <= 12',
       Number.isInteger(min) && Number.isInteger(max) && min >= 2 && min <= max && max <= 12,
       'min=' + min + ' max=' + max);
  }
  // getMinPlayers is mandatory the moment a game can hold more than two seats — without
  // it the lobby falls back to 2 and can start an under-strength match (BLD's original bug).
  const maxInd = bound(c, 'getMaxPlayers', 'individual');
  if (maxInd > 2) {
    ok(id + ': declares getMinPlayers (max ' + maxInd + ' > 2)', typeof c.getMinPlayers === 'function');
  }
}

// ── 3. Bound PURITY — the fix for bug class 1 ────────────────────────────────
// A lobby bound is read while the room fills. The test is WHERE the variable it reads
// gets set:
//
//   • A game-menu SETTING (settings overlay) is chosen before the host taps Play, so the
//     room is created with the host's real choice. Legitimate — see ALLOWED_SETTINGS.
//   • A SETUP/ROSTER screen variable is set on a screen Lobby Mode skips entirely, so at
//     room-creation time it is still sitting at its declared default. Never legitimate:
//     the room silently caps at that default, and no UI anywhere explains the rejection.
//
// Everything else (window.mpLobbyStyle, numeric literals) is fine. A new identifier fails
// here on purpose — adding one is a claim that needs a line in the table below.
section('3. Bounds read no post-lobby setup state');
const ALLOWED_IDENT = /^(window|mpLobbyStyle|team|individual|typeof|undefined)$/;
// Pre-lobby settings a bound may legitimately read, each with why it is safe.
const ALLOWED_SETTINGS = {
  frtPearOff: 'FRT: a settings-overlay toggle on screen-frt-menu, so it is already set when ' +
              'the host creates the room (and rides SETTINGS_SYNC to clients). Pear-Off is a ' +
              'strict 2-player duel — the bound genuinely differs by setting.',
};
for (const id of IDS) {
  for (const which of ['getMaxPlayers', 'getMinPlayers']) {
    const fn = CONFIGS[id][which];
    if (typeof fn !== 'function') continue;
    const src = fn.toString();
    const idents = [...new Set((src.match(/[A-Za-z_$][A-Za-z0-9_$]*/g) || [])
      .filter(t => !ALLOWED_IDENT.test(t)))];
    const unlisted = idents.filter(t => !ALLOWED_SETTINGS[t]);
    ok(id + '.' + which + ': reads no post-lobby setup state', unlisted.length === 0,
       'references ' + unlisted.join(', ') + ' — source: ' + src.replace(/\s+/g, ' ') +
       '\n          If this is a pre-lobby SETTING, add it to ALLOWED_SETTINGS with the reason.');
    idents.filter(t => ALLOWED_SETTINGS[t]).forEach(t =>
      console.log('  note  ' + id + '.' + which + ' reads ' + t + ' — ALLOWED: ' + ALLOWED_SETTINGS[t]));
  }
}

// ── 4. Bounds agree with the Pass-the-Phone count pills in index.html ────────
// The two describe the same game. They drifted precisely because nothing compared them.
section('4. Lobby bounds match the Pass-the-Phone count pills');
function pills(attr, scopeId) {
  let hay = indexSrc;
  if (scopeId) {
    const i = indexSrc.indexOf('id="' + scopeId + '"');
    if (i < 0) return [];
    hay = indexSrc.slice(i, i + 1200);
  }
  const re = new RegExp(attr + '="(\\d+)"', 'g');
  const out = [];
  let m;
  while ((m = re.exec(hay))) out.push(parseInt(m[1], 10));
  return out;
}
const PILL_SOURCES = {
  jec:  pills('data-jec-player-count'),
  ygi:  pills('data-ygi-player-count'),
  lttp: pills('data-lttp-player-count'),
  ss:   pills('data-ss-player-count').map(n => n * 2),        // pills are per-team
  dsd:  pills('data-val', 'dsd-ppt-pills').map(n => n * 2),   // pills are per-team
  nat:  pills('data-count', 'nat-count-group'),
};
// Documented, deliberate divergences. Anything NOT listed here must agree.
const PILL_EXCEPTIONS = {
  nat: 'pills offer 4-8, lobby floor is 3 — unresolved whether the PTP floor is intentional ' +
       '(three roles at three players leaves no spare Field Researcher). docs/deferred-work.md § NAT gaps.',
};
for (const [id, vals] of Object.entries(PILL_SOURCES)) {
  ok(id + ': found its count pills in index.html', vals.length > 0);
  if (!vals.length) continue;
  const c  = CONFIGS[id];
  const lo = Math.min(...vals), hi = Math.max(...vals);
  check(id + ': lobby max === highest pill', bound(c, 'getMaxPlayers', 'individual'), hi);
  const min = bound(c, 'getMinPlayers', 'individual') !== undefined
    ? bound(c, 'getMinPlayers', 'individual') : 2;
  if (PILL_EXCEPTIONS[id]) {
    console.log('  note  ' + id + ': lobby min ' + min + ' vs pill floor ' + lo);
    console.log('          KNOWN: ' + PILL_EXCEPTIONS[id]);
  } else {
    check(id + ': lobby min === lowest pill', min, lo);
  }
}

// ── 5. Balanced-teams games ──────────────────────────────────────────────────
// A game deriving per-team size from team A alone cannot survive an odd roster.
section('5. requiresBalancedTeams games have even, reachable bounds');
const balanced = IDS.filter(id => CONFIGS[id].rosterConfig && CONFIGS[id].rosterConfig.requiresBalancedTeams);
check('games requiring balanced teams', balanced.slice().sort(), ['dsd', 'ss']);
for (const id of balanced) {
  const c   = CONFIGS[id];
  const min = bound(c, 'getMinPlayers', 'individual');
  const max = bound(c, 'getMaxPlayers', 'individual');
  ok(id + ': MDLM min is even', min % 2 === 0, 'min=' + min);
  ok(id + ': MDLM max is even', max % 2 === 0, 'max=' + max);
}
// The gates that enforce it must actually exist.
ok('engine has mpRosterNeedsBalance()',      /function mpRosterNeedsBalance\s*\(/.test(engineSrc));
ok('roster confirm applies the balance gate', /balanced\s*=\s*a === b/.test(engineSrc));
ok('host lobby CTA blocks an odd roster',     /oddBlocked/.test(engineSrc));
ok('index.html has the roster reason line',   /id="mp-roster-hint"/.test(indexSrc));

// ── 6. The Mid-Game Quit Contract is wired up in every game ─────────────────
// logic-engine.md § Mid-Game Quit Contract. A game satisfies it by calling the engine
// helper, or (the ten games that predate it) by sending its own packet.
section('6. Every game wires up the Mid-Game Quit Contract');
ok('engine exports mpNotifyPlayerLeft()',      /function mpNotifyPlayerLeft\s*\(/.test(engineSrc));
ok('engine handles MP_PLAYER_LEFT generically', /'MP_PLAYER_LEFT'/.test(engineSrc));
for (const id of IDS) {
  const src     = fs.readFileSync(path.join(ROOT, 'js/games', PLUGIN[id]), 'utf8');
  const generic = /mpNotifyPlayerLeft\s*\(/.test(src);
  const legacy  = /_PLAYER_LEFT'/.test(src);
  ok(id + ': quit dissolves the session (' + (generic ? 'engine helper' : legacy ? 'own packet' : 'NEITHER') + ')',
     generic || legacy,
     'quit-confirm must call mpNotifyPlayerLeft() before resetToLobby(), or send its own [ABBR]_PLAYER_LEFT');
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n' + '='.repeat(70));
console.log(failures ? 'FAILED — ' + failures + ' check(s)' : 'ALL CHECKS PASSED');
process.exit(failures ? 1 : 0);
