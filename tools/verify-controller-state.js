// ═══════════════════════════════════════════════════════════════════════════
// verify-controller-state.js — the controller customiser's PURE layer.
//
//   node tools/verify-controller-state.js        (exits 1 on any failure)
//
// Three things live here, and all three are the kind that fail silently:
//
//   1. THE TOTAL READ. ctlReadDesign() runs on the app's FRONT DOOR. Absent,
//      empty, malformed, wrong-typed, wrong-version and hostile input must all
//      resolve to the factory design without throwing — a throw here is a blank
//      lobby, not a missing controller.
//   2. PALETTE DERIVATION. The palette is READ from GAME_BRAND_HEX, never
//      copied, so a 21st game appears for free. This asserts the reading, and
//      that the order matches the lobby's own Colour sort — the two surfaces
//      have to agree about what "next to" means.
//   3. THE KONAMI MAPPING (added in Task 6). The one genuinely
//      correctness-shaped thing in the feature, and cheap to pin.
//
// js/controller.js is evaluated in a vm with a mock localStorage and the two
// engine palette globals injected. Nothing here needs a DOM, Three, or a canvas
// — the file is written so its pure half can be loaded without them.
// ═══════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT = path.join(__dirname, '..');
// CTL_SRC= points the checks at another copy of js/controller.js, so a pre-fix
// version can be driven through them — proving they fail before the fix passes.
const CTL_SRC = process.env.CTL_SRC
  ? path.resolve(process.env.CTL_SRC)
  : path.join(ROOT, 'js/controller.js');
const ENGINE = path.join(ROOT, 'js/engine.js');

let pass = 0, fail = 0;
function ok(cond, label) {
  if (cond) { pass++; }
  else { fail++; console.log('  FAIL  ' + label); }
}

// ── Pull the two palette globals out of engine.js the way verify-mp-configs
//    pulls MP_GAME_CONFIGS: evaluate the declarations alone, not the whole file
//    (which wants a DOM at parse time).
const engineSrc = fs.readFileSync(ENGINE, 'utf8');
function extract(startRe, endToken) {
  const i = engineSrc.search(startRe);
  if (i < 0) throw new Error('could not find ' + startRe + ' in js/engine.js');
  const j = engineSrc.indexOf(endToken, i);
  if (j < 0) throw new Error('could not find the end of ' + startRe);
  return engineSrc.slice(i, j + endToken.length);
}
const paletteSrc = [
  extract(/const GAME_BRAND_HEX = \{/, '};'),
  extract(/function lobbyHexToHSL\(hex\) \{/, '\n}'),
  extract(/const LOBBY_COLOUR_START_ID = /, ';'),
  extract(/const LOBBY_COLOUR_ORDER = \(\(\) => \{/, '})();'),
].join('\n');

// ── A localStorage that behaves like the real one, including throwing.
function makeStore(initial) {
  const map = Object.assign({}, initial);
  return {
    _map: map,
    throwOnGet: false,
    throwOnSet: false,
    getItem(k) { if (this.throwOnGet) throw new Error('SecurityError'); return k in map ? map[k] : null; },
    setItem(k, v) { if (this.throwOnSet) throw new Error('QuotaExceededError'); map[k] = String(v); },
    removeItem(k) { delete map[k]; },
  };
}

function load(storeInitial) {
  const store = makeStore(storeInitial);
  const sandbox = { localStorage: store, console, Math, JSON, Date };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  // `const`/`let` at top level never become own properties of the context
  // object — only `var` and function declarations do (the same gotcha
  // logic-engine.md's window.-prefix rule and the visual-check skill's
  // mpMyPlayerIdx trap describe for the browser's own global object). The
  // production files correctly use bare const/let and reference each other
  // by lexical scope; this harness reaches in from OUTSIDE that scope, so it
  // has to ask each snippet to explicitly copy what it needs onto `window`.
  vm.runInContext(paletteSrc + '\nwindow.GAME_BRAND_HEX = GAME_BRAND_HEX; window.LOBBY_COLOUR_ORDER = LOBBY_COLOUR_ORDER;',
    sandbox, { filename: 'engine-palette' });
  // Only the pure half of controller.js is evaluated: everything below the
  // RENDERER marker needs THREE and a document, and none of it is under test.
  const full = fs.readFileSync(CTL_SRC, 'utf8');
  const cut  = full.indexOf('// ══ RENDERER ══');
  if (cut < 0) throw new Error('js/controller.js is missing its "// ══ RENDERER ══" marker');
  vm.runInContext(full.slice(0, cut) + '\nwindow.CTL_DEFAULTS = CTL_DEFAULTS;',
    sandbox, { filename: 'controller-pure' });
  return { sandbox, store };
}

console.log('── 1. Persistence round-trip ──');
{
  const { sandbox, store } = load();
  const wanted = { shell: '#A855F7', plate: '#9333EA', ears: '#14B8A6', buttons: '#18181B' };
  sandbox.ctlWriteDesign(wanted);
  const raw = store._map['sylly_controller'];
  ok(typeof raw === 'string', 'ctlWriteDesign writes the sylly_controller key');
  const parsed = JSON.parse(raw);
  ok(parsed.v === 1, 'the stored payload is versioned v:1');
  ok(Object.keys(parsed).sort().join(',') === 'buttons,ears,plate,shell,stickers,v',
     'the payload carries exactly v + the four groups + stickers, got ' +
     Object.keys(parsed).sort().join(','));

  const back = load(store._map).sandbox.ctlReadDesign();
  ok(back.shell === wanted.shell && back.plate === wanted.plate &&
     back.ears === wanted.ears && back.buttons === wanted.buttons,
     'a saved design reads back identically');
}

console.log('── 2. The read is total ──');
{
  const cases = [
    ['absent',              undefined],
    ['empty string',        ''],
    ['malformed JSON',      '{"v":1,'],
    ['JSON null',           'null'],
    ['a bare array',        '[]'],
    ['a bare number',       '7'],
    ['unknown version',     '{"v":99,"shell":"#A855F7"}'],
    ['missing version',     '{"shell":"#A855F7"}'],
    ['wrong-typed fields',  '{"v":1,"shell":42,"plate":null,"ears":{},"buttons":[]}'],
    ['not a hex string',    '{"v":1,"shell":"rebeccapurple","plate":"#GGG","ears":"#12345","buttons":"A855F7"}'],
  ];
  for (const [label, value] of cases) {
    const init = value === undefined ? {} : { sylly_controller: value };
    let d = null, threw = null;
    try { d = load(init).sandbox.ctlReadDesign(); } catch (e) { threw = e; }
    ok(!threw, 'reading ' + label + ' does not throw');
    ok(d && d.shell && d.plate && d.ears && d.buttons,
       'reading ' + label + ' still yields a complete design');
  }

  // A partially valid payload keeps what is valid and defaults the rest — a
  // future field added by the sticker sub-project must not wipe the colours.
  const mixed = load({ sylly_controller: '{"v":1,"shell":"#A855F7","plate":"nope","stickers":[1,2]}' }).sandbox;
  const d = mixed.ctlReadDesign();
  ok(d.shell === '#A855F7', 'a valid field survives alongside an invalid one');
  ok(d.plate === mixed.CTL_DEFAULTS.plate, 'an invalid field falls back to its default');
  ok(d.ears === mixed.CTL_DEFAULTS.ears && d.buttons === mixed.CTL_DEFAULTS.buttons,
     'absent fields fall back to their defaults');

  // localStorage itself can throw (private mode, blocked site data).
  {
    const { sandbox, store } = load();
    store.throwOnGet = true;
    let threw = null, out = null;
    try { out = sandbox.ctlReadDesign(); } catch (e) { threw = e; }
    ok(!threw && out && out.shell, 'a throwing localStorage still yields the factory design');
    store.throwOnGet = false; store.throwOnSet = true;
    threw = null;
    try { sandbox.ctlWriteDesign(sandbox.CTL_DEFAULTS); } catch (e) { threw = e; }
    ok(!threw, 'a throwing localStorage does not break a save');
  }
}

console.log('── 3. The factory design ──');
{
  const { sandbox } = load();
  const D = sandbox.CTL_DEFAULTS;
  ['shell', 'plate', 'ears', 'buttons'].forEach(k =>
    ok(/^#[0-9a-fA-F]{6}$/.test(D[k]), 'CTL_DEFAULTS.' + k + ' is a #rrggbb string'));
  // Reset restores the factory look, which is deliberately NOT one of the
  // twenty — so it must survive a round-trip like any other value. This is why
  // the read validates hex SHAPE and not palette membership.
  const hexes = sandbox.ctlPalette().map(p => p.hex.toUpperCase());
  ok(hexes.indexOf(D.shell.toUpperCase()) < 0,
     'the factory shell colour is deliberately outside the twenty');
  const rt = load({ sylly_controller: JSON.stringify(Object.assign({ v: 1 }, D)) }).sandbox.ctlReadDesign();
  ok(rt.shell === D.shell && rt.buttons === D.buttons,
     'the factory design itself round-trips (an out-of-palette hex is valid input)');
}

console.log('── 4. Palette derivation ──');
{
  const { sandbox } = load();
  const pal = sandbox.ctlPalette();
  ok(Array.isArray(pal), 'ctlPalette returns an array');
  ok(pal.length === Object.keys(sandbox.GAME_BRAND_HEX).length,
     'every GAME_BRAND_HEX entry appears, got ' + pal.length +
     ' of ' + Object.keys(sandbox.GAME_BRAND_HEX).length);
  ok(pal.every(p => p.id && /^#[0-9a-fA-F]{6}$/.test(p.hex)), 'every swatch is {id, hex}');
  ok(new Set(pal.map(p => p.id)).size === pal.length, 'no id appears twice');
  ok(pal.map(p => p.id).join(',') === sandbox.LOBBY_COLOUR_ORDER.join(','),
     'the swatch order is the lobby Colour sort hue walk, exactly');
  ok(pal[0].id === 'btn-flw', 'the walk opens on btn-flw, like the lobby');

  // A 21st game must appear with no customiser edit. Prove it by adding one.
  sandbox.GAME_BRAND_HEX['btn-newgame'] = '#123456';
  const grown = sandbox.ctlPalette();
  ok(grown.length === pal.length + 1, 'a new brand colour appears with no edit here');
  ok(grown.some(p => p.id === 'btn-newgame'), 'the new colour is the one that appeared');
  delete sandbox.GAME_BRAND_HEX['btn-newgame'];
}

console.log('── 5. The Konami adapter ──');
{
  const { sandbox } = load();
  const code = sandbox.ctlKonamiCode;

  // The four cardinals come off ONE mesh — the d-pad is a single rocker plate,
  // and tryPress resolves which arm was hit from the raycast point.
  ok(code('D-pad', 'Up')    === 'U', 'D-pad Up maps to U');
  ok(code('D-pad', 'Down')  === 'D', 'D-pad Down maps to D');
  ok(code('D-pad', 'Left')  === 'L', 'D-pad Left maps to L');
  ok(code('D-pad', 'Right') === 'R', 'D-pad Right maps to R');
  ok(code('Face A') === 'A', 'Face A maps to A');
  ok(code('Face B') === 'B', 'Face B maps to B');
  ok(code('Start')  === 'S', 'Start maps to S');

  // Everything else presses and sounds normally but feeds no code.
  ['Face X', 'Face Y', 'Select', 'L button', 'R button',
   'Left stick', 'Right stick', 'Left well', 'Right well']
    .forEach(n => ok(code(n) === null, n + ' contributes no code'));
  ok(code('D-pad', undefined) === null, 'a d-pad press with no resolved direction contributes nothing');
  ok(code('D-pad', 'Diagonal') === null, 'an unrecognised direction contributes nothing');

  // The whole sequence, in order, is exactly what SM_KONAMI expects.
  const presses = [
    ['D-pad', 'Up'], ['D-pad', 'Up'], ['D-pad', 'Down'], ['D-pad', 'Down'],
    ['D-pad', 'Left'], ['D-pad', 'Right'], ['D-pad', 'Left'], ['D-pad', 'Right'],
    ['Face B'], ['Face A'], ['Start'],
  ];
  const got = presses.map(p => code(p[0], p[1])).join('');
  ok(got === 'UUDDLRLRBAS', 'the full press order produces U U D D L R L R B A S, got ' + got);

  // A stray unmapped press mid-sequence must not break it — it contributes
  // nothing rather than a wrong code, so the buffer is untouched.
  const withNoise = [
    ['D-pad', 'Up'], ['Face X'], ['D-pad', 'Up'], ['Select'], ['D-pad', 'Down'], ['D-pad', 'Down'],
    ['D-pad', 'Left'], ['D-pad', 'Right'], ['Left stick'], ['D-pad', 'Left'], ['D-pad', 'Right'],
    ['Face B'], ['Face A'], ['Start'],
  ];
  const noisy = withNoise.map(p => code(p[0], p[1])).filter(c => c !== null).join('');
  ok(noisy === 'UUDDLRLRBAS', 'unmapped presses interleaved through the sequence change nothing');
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
