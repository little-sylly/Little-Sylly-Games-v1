// ═══════════════════════════════════════════════════════════════════════════
// verify-controller-stickers.js — the sticker sub-project's pure layer.
//
//   node tools/verify-controller-stickers.js        (exits 1 on any failure)
//
// Everything here fails silently in the wild if it regresses, which is why it
// is pinned under Node before any pixel is trusted:
//
//   1. THE KEEP-OUTS. They are caller-supplied. A port constructed with {}
//      runs fine and paints stickers inside the stick-well holes.
//   2. CHART ROUTING. makeChart/boxes branch on st.chart, so a misrouted
//      placement renders in the wrong place or on the wrong sheet.
//   3. LOAD BIT-STABILITY. Re-deriving a saved anchor walks it across the
//      shell a fraction of a texel per load — undiagnosable months later.
//   4. THE STATE MACHINE. Written as pure functions precisely so the whole
//      Idle/Armed/Selected table can be driven without a DOM.
// ═══════════════════════════════════════════════════════════════════════════

const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
function ok(cond, label) {
  if (cond) { pass++; }
  else { fail++; console.log('  FAIL  ' + label); }
}

const fs = require('fs');
const vm = require('vm');

// js/controller.js's pure half, evaluated with no DOM — the same cut
// verify-controller-state.js uses. CTL_SRC= points at another copy so a
// pre-fix version can be driven through these checks.
const CTL_SRC = process.env.CTL_SRC
  ? path.resolve(process.env.CTL_SRC)
  : path.join(ROOT, 'js/controller.js');

/* The symbols the pure half publishes to these checks. const/let at top level
   never become own properties of the vm context, so each is copied onto
   `window` explicitly. The copy is typeof-guarded because this list spans the
   whole sub-project and later tasks have not written their half yet — but a
   guarded copy would turn a RENAMED symbol into a silent undefined, so every
   call names the symbols it actually requires and loadCtlPure throws when one
   is missing. Guarded for the not-yet-written; loud for the misspelt. */
const CTL_PURE_EXPORTS = ['ctlReadDesign', 'ctlWriteDesign', 'ctlValidateManifest',
                          'ctlStickerById', 'ctlValidateStickers', 'ctlStickerReduce',
                          'ctlStickerMode', 'CTL_STICKER_OPT', 'CTL_EAR_MAX_R',
                          'CTL_STICKER_HISTORY_MAX'];

/* Top-level `let`s that a check needs to DRIVE, not just read. A plain copy
   cannot: `let` at the top of a vm script is a lexical binding, not an own
   property of the context, so `sandbox.ctlStickerManifest = [...]` would make a
   new global the module's own code never looks at — the injection would be
   silently inert and the check would pass for the wrong reason. An accessor
   pair reaches the real binding. Harness-side only; nothing is added to
   js/controller.js for the tests' benefit. */
const CTL_PURE_MUTABLE = ['ctlStickerManifest'];

function loadCtlPure(storeInitial, need) {
  const map = Object.assign({}, storeInitial);
  const store = {
    _map: map,
    getItem(k) { return k in map ? map[k] : null; },
    setItem(k, v) { map[k] = String(v); },
    removeItem(k) { delete map[k]; },
  };
  const sandbox = { localStorage: store, console, Math, JSON, Date };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  const full = fs.readFileSync(CTL_SRC, 'utf8');
  const cut = full.indexOf('// ══ RENDERER ══');
  if (cut < 0) throw new Error('js/controller.js is missing its "// ══ RENDERER ══" marker');
  const publish = CTL_PURE_EXPORTS
    .map(n => "if (typeof " + n + " !== 'undefined') window." + n + " = " + n + ";")
    .concat(CTL_PURE_MUTABLE.map(n =>
      "if (typeof " + n + " !== 'undefined') Object.defineProperty(window, '" + n + "', {" +
      " get() { return " + n + "; }, set(v) { " + n + " = v; }, configurable: true });"))
    .join('\n');
  vm.runInContext(full.slice(0, cut) + '\n' + publish, sandbox, { filename: 'controller-pure' });
  for (const n of (need || [])) {
    if (typeof sandbox[n] === 'undefined')
      throw new Error('js/controller.js pure half does not define ' + n);
  }
  return { sandbox, store };
}

global.window = global;
const THREE = require(path.join(ROOT, 'js/lib/three.min.js'));
require(path.join(ROOT, 'js/lib/controller-body.js'));
const { StickerSurface } = require(path.join(ROOT, 'js/lib/controller-sticker-surface.js'));

console.log('── 1. Module loads and exposes its contract ──');
ok(typeof StickerSurface === 'function', 'StickerSurface is a function');
ok(!!(global.window.StickerSurface && global.window.StickerSurface.StickerSurface),
   'window.StickerSurface.StickerSurface is set for the browser');

const U = global.window.ControllerBody.buildBody(THREE, {}).userData;
const ATLAS = 2048;

// The prototype's exact call-site options (standalone.html:1691). These are
// duplicated here deliberately: the harness must fail if js/controller.js stops
// passing them, so it cannot import them from the file under test.
const OPT = {
  exclude: [{ x: -1.25, y:  0.20, r: 0.33, back: false },
            { x:  1.25, y: -0.85, r: 0.33, back: false },
            { x: -0.84, y:  0.84, r: 0.45, back: true  },
            { x:  0.84, y:  0.84, r: 0.45, back: true  }],
  maxDistort: 0.14,
};

const t0 = Date.now();
const S = StickerSurface(U, ATLAS, OPT);
console.log('  StickerSurface built in ' + (Date.now() - t0) + ' ms (plan recorded 339 ms)');

['field','point','normal','blocked','padPairs','outlineAt','plainAtlas','toAtlas','fromAtlas',
 'makeChart','boxes','sheets','plan','tangentFrame'].forEach(fn =>
  ok(typeof S[fn] === 'function', 'surface exposes ' + fn + '()'));

console.log('── 2. The keep-outs are actually wired (spec § 5.2b) ──');
for (const e of OPT.exclude) {
  const p = S.plan(e.x, e.y, e.back, 0.18);
  ok(p.ok === false && p.reason === 'ring',
     'keep-out (' + e.x + ',' + e.y + ') back=' + e.back + ' refuses with ring, got ' +
     (p.ok ? 'ok' : p.reason));
}
// The assertion that catches a port constructed with {} — without it, all four
// of the above pass trivially against a surface that has no keep-outs at all.
{
  const bare = StickerSurface(U, ATLAS, {});
  const accepted = OPT.exclude.filter(e => bare.plan(e.x, e.y, e.back, 0.18).ok).length;
  ok(accepted === 4,
     'a surface built with {} accepts all four keep-out centres — proving the ' +
     'check above tests the config, not the geometry (got ' + accepted + '/4)');
}

console.log('── 3. Legality routes to the right chart ──');
{
  const flat = S.plan(1.16, -0.12, false, 0.18);
  ok(flat.ok && flat.chart === 'tangent', 'the deep front deck is a flat tangent placement');
  ok(flat.x === undefined && flat.y === undefined,
     'a tangent plan returns NO x/y — the caller keeps the tapped coordinates');

  const rim = S.plan(2.11, -0.12, false, 0.18);
  ok(rim.ok && rim.chart === 'rim', 'near the right rim it wraps');
  ok(typeof rim.x === 'number' && typeof rim.y === 'number',
     'a rim plan returns a snapped anchor');

  ok(S.plan(0, -0.9, false, 0.18).reason === 'off',
     'the notch between the grips is off the body');
  ok(S.plan(9, 9, false, 0.18).reason === 'off', 'far outside the body is off');

  // Size-dependent edge refusal — spec § 12.3. The same spot takes a small
  // sticker and refuses a large one, which is the whole point of the rule.
  ok(S.plan(-2.22, -1.39, false, 0.28).reason === 'edge',
     'a large sticker on the lower-left rim refuses with edge');
  const small = S.plan(-2.22, -1.39, false, 0.10);
  ok(small.ok && small.chart === 'rim',
     'the SAME spot takes a small sticker as a rim wrap');
}

console.log('── 4. Charts accept a persisted record verbatim ──');
{
  const tangent = { x: 1.16, y: -0.12, back: false, rot: 0.3, size: 0.18, chart: 'tangent' };
  const rimRec  = { x: 2.1957, y: -0.1070, back: false, rot: 0, size: 0.18, chart: 'rim' };
  ok(S.boxes(tangent).length === 1, 'a tangent placement covers one sheet');
  ok(S.boxes(rimRec).length === 2, 'a rim placement covers both sheets');
  for (const [label, rec] of [['tangent', tangent], ['rim', rimRec]]) {
    const c = S.makeChart(rec)(rec.x, rec.y, rec.back);
    ok(c && Math.abs(c[0]) < 1e-6 && Math.abs(c[1]) < 1e-6,
       'the ' + label + ' chart returns [0,0] at its own anchor');
  }
  for (const b of S.boxes(rimRec)) {
    ok(Number.isInteger(b.x0) && Number.isInteger(b.y0) &&
       Number.isInteger(b.x1) && Number.isInteger(b.y1),
       'box bounds are integers (a fractional bound scatters the paint)');
  }
}

console.log('── 5. padPairs is computed and non-empty ──');
{
  const PAD = S.padPairs(4);
  ok(PAD && PAD.dst && PAD.src, 'padPairs(4) returns a dst/src pair');
  ok(PAD.dst.length === PAD.src.length, 'the pair arrays are the same length');
  ok(PAD.dst.length > 1000, 'it found a real number of seam texels, got ' + PAD.dst.length);
}

console.log('── 6. Manifest validation is total (spec § 5.1) ──');
{
  const { sandbox } = loadCtlPure(undefined, ['ctlValidateManifest']);
  const V = sandbox.ctlValidateManifest;

  const good = { stickers: [
    { id: 'banana', label: 'Banana', image: 'banana.png', unlocked: true },
    { id: 'pan',    label: 'Pan',    image: 'pan.png',    unlocked: true },
  ] };
  ok(V(good).length === 2, 'a well-formed manifest keeps both entries');
  ok(V(good)[0].id === 'banana', 'order is preserved');

  const cases = [
    ['null',                 null],
    ['a bare array',         []],
    ['a number',             7],
    ['a string',             'stickers'],
    ['no stickers key',      { things: [] }],
    ['stickers not an array',{ stickers: {} }],
  ];
  for (const [label, value] of cases) {
    let out = null, threw = null;
    try { out = V(value); } catch (e) { threw = e; }
    ok(!threw, 'validating ' + label + ' does not throw');
    ok(Array.isArray(out) && out.length === 0, 'validating ' + label + ' yields []');
  }

  const messy = { stickers: [
    null,                                                       // dropped
    7,                                                          // dropped
    { label: 'No id', image: 'x.png' },                         // dropped: no id
    { id: 'noimg', label: 'No image' },                         // dropped: no image
    { id: 'nolabel', image: 'x.png' },                          // dropped: no label
    { id: '', label: 'Empty id', image: 'x.png' },              // dropped: empty id
    { id: 'ok1', label: 'Fine', image: 'ok1.png' },             // kept, unlocked defaults true
    { id: 'ok1', label: 'Duplicate', image: 'other.png' },      // dropped: duplicate id
    { id: 'ok2', label: 'Locked', image: 'ok2.png', unlocked: false }, // kept, unlocked false
  ] };
  const out = V(messy);
  ok(out.length === 2, 'a messy manifest keeps exactly the two valid entries, got ' + out.length);
  ok(out[0].id === 'ok1' && out[0].unlocked === true, 'unlocked defaults to true');
  ok(out[1].id === 'ok2' && out[1].unlocked === false, 'an explicit unlocked:false is kept');
  ok(out.filter(e => e.id === 'ok1').length === 1, 'the duplicate id is dropped, first wins');
}

console.log('── 7. The shipped manifest is valid ──');
{
  const { sandbox } = loadCtlPure(undefined, ['ctlValidateManifest']);
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/stickers/manifest.json'), 'utf8'));
  const out = sandbox.ctlValidateManifest(raw);
  ok(out.length === raw.stickers.length,
     'every entry in the shipped manifest survives validation (' +
     out.length + '/' + raw.stickers.length + ')');
  for (const e of out) {
    ok(fs.existsSync(path.join(ROOT, 'data/stickers', e.image)),
       'the image named by "' + e.id + '" exists on disk: ' + e.image);
  }
}

console.log('── 8. Placement validation (spec § 6, rules 1-7) ──');
{
  const { sandbox } = loadCtlPure(undefined, ['ctlValidateStickers', 'CTL_EAR_MAX_R']);
  const V = sandbox.ctlValidateStickers;
  const known = new Set(['banana', 'computer', 'pan']);

  ok(Array.isArray(V(null, { known })) && V(null, { known }).length === 0,
     'a non-array resolves to []');
  ok(V('nope', { known }).length === 0, 'a string resolves to []');

  const shell = { id: 'banana', surface: 'shell', x: 1.16, y: -0.12, back: false,
                  rot: 0.3, size: 0.18, chart: 'tangent' };
  const ear   = { id: 'pan', surface: 'earL', u: 0.5, v: 0.6, r: 0.2, rot: 0 };
  ok(V([shell, ear], { known }).length === 2, 'two well-formed entries survive');

  // rule 1 — missing id or surface
  ok(V([{ surface: 'shell', x: 0, y: 0, back: false, rot: 0, size: 0.18, chart: 'tangent' }],
       { known }).length === 0, 'rule 1: an entry with no id is dropped');
  ok(V([Object.assign({}, shell, { surface: 'elbow' })], { known }).length === 0,
     'rule 1: an unknown surface is dropped');

  // rule 2 — id not in the manifest
  ok(V([Object.assign({}, shell, { id: 'retired' })], { known }).length === 0,
     'rule 2: an id absent from the manifest is dropped');
  ok(V([Object.assign({}, shell, { id: 'retired' })], {}).length === 1,
     'rule 2 is skipped when no known-set is supplied');

  // rule 3 — non-finite numbers
  for (const bad of [NaN, Infinity, -Infinity, 'x', null, undefined]) {
    ok(V([Object.assign({}, shell, { x: bad })], { known }).length === 0,
       'rule 3: a non-finite x (' + String(bad) + ') is dropped');
  }

  // rule 4 — chart must be exactly rim or tangent, never guessed
  ok(V([Object.assign({}, shell, { chart: 'rim' })], { known }).length === 1,
     'rule 4: chart rim is accepted');
  for (const bad of ['flat', '', undefined, null, 0]) {
    ok(V([Object.assign({}, shell, { chart: bad })], { known }).length === 0,
       'rule 4: chart "' + String(bad) + '" is dropped, never guessed');
  }

  // rule 5 — one design, one placement (D2), enforced on READ
  const dup = V([shell, Object.assign({}, shell, { x: 0.5 })], { known });
  ok(dup.length === 1, 'rule 5: a duplicate id keeps only one entry');
  ok(dup[0].x === 1.16, 'rule 5: the FIRST occurrence is the one kept');
  const crossSurface = V([shell, { id: 'banana', surface: 'earR', u: 0.5, v: 0.5, r: 0.2, rot: 0 }],
                         { known });
  ok(crossSurface.length === 1,
     'rule 5: the cap is per design across the WHOLE controller, shell and ears together');

  // rule 6 — legality, ok flag only
  ok(V([shell], { known, legal: () => false }).length === 0,
     'rule 6: an entry the legality probe rejects is dropped');
  ok(V([shell], { known, legal: () => true })[0].x === 1.16,
     'rule 6: a legal entry keeps its STORED x — the probe cannot move it');

  // rule 7 — ear radius re-clamped
  const big = V([Object.assign({}, ear, { r: 5 })], { known })[0];
  ok(big && Math.abs(big.r - 0.26) < 1e-9,
     'rule 7: an oversized ear radius is re-clamped to 0.26, got ' + (big && big.r));
  ok(V([Object.assign({}, ear, { r: -1 })], { known }).length === 0,
     'rule 7: a non-positive ear radius is dropped');
  ok(V([Object.assign({}, ear, { u: 2 })], { known }).length === 0,
     'rule 7: an out-of-range ear uv is dropped');

  // the shape that comes back is the shape the renderer consumes
  const clean = V([shell, ear], { known });
  ok(Object.keys(clean[0]).sort().join(',') === 'back,chart,id,rot,size,surface,x,y',
     'a clean shell record carries exactly its eight fields, got ' +
     Object.keys(clean[0]).sort().join(','));
  ok(Object.keys(clean[1]).sort().join(',') === 'id,r,rot,surface,u,v',
     'a clean ear record carries exactly its six fields, got ' +
     Object.keys(clean[1]).sort().join(','));
}

console.log('── 9. Persistence round-trip, no version bump (spec D7) ──');
{
  const { sandbox, store } = loadCtlPure(undefined, ['ctlReadDesign', 'ctlWriteDesign']);
  sandbox.ctlStickerManifest = [
    { id: 'banana', label: 'Banana', image: 'banana.png', unlocked: true },
    { id: 'pan',    label: 'Pan',    image: 'pan.png',    unlocked: true },
  ];
  ok(sandbox.ctlStickerById('banana') !== null,
     "the injected manifest reaches the module's own binding — the accessor is not inert");
  const design = {
    shell: '#A855F7', plate: '#9333EA', ears: '#14B8A6', buttons: '#18181B',
    stickers: [
      { id: 'banana', surface: 'shell', x: 1.16, y: -0.12, back: false,
        rot: 0.3, size: 0.18, chart: 'tangent' },
      { id: 'pan', surface: 'earL', u: 0.5, v: 0.6, r: 0.2, rot: 0 },
    ],
  };
  sandbox.ctlWriteDesign(design);
  const parsed = JSON.parse(store._map['sylly_controller']);
  ok(parsed.v === 1, 'the payload is STILL v:1 — no version bump');
  ok(Array.isArray(parsed.stickers) && parsed.stickers.length === 2,
     'both placements are serialised');
  ok(parsed.stickers[0].chart === 'tangent',
     'chart is PERSISTED, not re-derived (spec § 6)');

  const back = loadCtlPure(store._map, ['ctlReadDesign']);
  back.sandbox.ctlStickerManifest = sandbox.ctlStickerManifest;
  const read = back.sandbox.ctlReadDesign();
  ok(read.shell === design.shell && read.buttons === design.buttons,
     'the colours survive alongside the stickers');
  ok(read.stickers.length === 2, 'both placements read back');
  ok(read.stickers[0].x === 1.16 && read.stickers[0].chart === 'tangent',
     'the shell placement reads back identically');
  ok(read.stickers[1].r === 0.2 && read.stickers[1].surface === 'earL',
     'the ear placement reads back identically');

  // A design saved before stickers existed
  const old = loadCtlPure({ sylly_controller:
    '{"v":1,"shell":"#A855F7","plate":"#9333EA","ears":"#14B8A6","buttons":"#18181B"}' },
    ['ctlReadDesign']);
  const d = old.sandbox.ctlReadDesign();
  ok(Array.isArray(d.stickers) && d.stickers.length === 0,
     'a pre-sticker payload reads back with an empty stickers array, not undefined');
  ok(d.shell === '#A855F7', 'and its colours are untouched');
}

console.log('── 10. The load path is bit-stable (spec § 6, the slow-creep bug) ──');
{
  // The rim branch's crest snap is not exactly idempotent, so re-planning a
  // saved anchor walks it across the shell — measured at up to 5.75 atlas
  // texels over 200 loads, monotonically. The spec's fix is to read plan()'s
  // ok flag and DISCARD its coordinates. This proves the shipped read does that.
  const { sandbox } = loadCtlPure(undefined, ['ctlValidateStickers']);
  const known = new Set(['banana']);
  const seed = S.plan(2.11, -0.12, false, 0.18);
  ok(seed.ok && seed.chart === 'rim', 'the seed placement is a rim wrap');

  let rec = [{ id: 'banana', surface: 'shell', x: seed.x, y: seed.y, back: false,
               rot: 0, size: seed.size, chart: seed.chart }];
  const first = JSON.stringify(rec[0]);
  const legal = r => S.plan(r.x, r.y, r.back, r.size).ok;
  for (let i = 0; i < 500; i++) rec = sandbox.ctlValidateStickers(rec, { known, legal });
  ok(rec.length === 1, 'the placement survives 500 load cycles');
  ok(JSON.stringify(rec[0]) === first,
     'and is BYTE-IDENTICAL after 500 loads — no anchor drift');

  // The contrast: the re-deriving version this replaced does move.
  let bad = { x: seed.x, y: seed.y, back: false, size: seed.size, chart: seed.chart };
  for (let i = 0; i < 500; i++) {
    const p = S.plan(bad.x, bad.y, bad.back, bad.size);
    if (!p.ok) break;
    if (p.x !== undefined) bad.x = p.x;
    if (p.y !== undefined) bad.y = p.y;
  }
  ok(bad.x !== seed.x || bad.y !== seed.y,
     'sanity: re-deriving the anchor DOES move it — the check above is real');
}

console.log('── 11. The placement state machine (spec § 7) ──');
{
  const { sandbox } = loadCtlPure(undefined, ['ctlStickerReduce', 'ctlStickerMode']);
  const R = sandbox.ctlStickerReduce;
  const M = sandbox.ctlStickerMode;
  const blank = { stickers: [], armed: null, selected: -1, history: [] };
  const shellRec = { surface: 'shell', x: 1.16, y: -0.12, back: false,
                     rot: 0, size: 0.18, chart: 'tangent' };

  ok(M(blank) === 'idle', 'a blank state is Idle');

  // --- book taps: the rule is the same in every state ---
  let s = R(blank, { t: 'bookTap', id: 'banana' });
  ok(M(s) === 'armed' && s.armed === 'banana', 'tapping an unplaced tile arms that design');
  ok(blank.armed === null && blank.stickers.length === 0, 'the reducer did not mutate its input');

  s = R(s, { t: 'bookTap', id: 'banana' });
  ok(M(s) === 'idle', 'tapping the ALREADY armed tile deselects back to Idle');

  s = R(R(blank, { t: 'bookTap', id: 'banana' }), { t: 'bookTap', id: 'pan' });
  ok(M(s) === 'armed' && s.armed === 'pan',
     'a book tap can interrupt an in-progress Arm and jump to another design');

  // --- Armed + a legal spot -> placed, and becomes Selected ---
  s = R(blank, { t: 'bookTap', id: 'banana' });
  s = R(s, { t: 'place', rec: shellRec });
  ok(s.stickers.length === 1 && s.stickers[0].id === 'banana', 'placing pushes the entry');
  ok(s.stickers[0].x === 1.16 && s.stickers[0].chart === 'tangent',
     'the placement record is stored verbatim');
  ok(M(s) === 'selected' && s.selected === 0, 'after placing, the new entry is Selected');
  ok(s.armed === null, 'and nothing is left armed');

  // --- Selected + a legal spot -> relocates, STAYS Selected ---
  const placed = s;
  s = R(placed, { t: 'relocate', rec: Object.assign({}, shellRec, { x: 0.4 }) });
  ok(s.stickers.length === 1, 'relocating does not add an entry');
  ok(s.stickers[0].x === 0.4, 'the entry moved');
  ok(s.stickers[0].id === 'banana', 'and kept its id');
  ok(M(s) === 'selected' && s.selected === 0, 'it stays Selected after a relocate');

  // --- a book tap on a PLACED tile selects rather than re-arming (D2) ---
  s = R(placed, { t: 'bookTap', id: 'banana' });
  ok(M(s) === 'idle', 'tapping the placed tile that is already selected deselects');
  s = R(R(placed, { t: 'done' }), { t: 'bookTap', id: 'banana' });
  ok(M(s) === 'selected' && s.selected === 0,
     'from Idle, tapping a PLACED tile selects that placement — it never re-arms');
  ok(s.armed === null, 'D2: an already-placed design can never be armed again');

  // --- controller taps that hit or miss an existing placement ---
  s = R(R(placed, { t: 'done' }), { t: 'hit', index: 0 });
  ok(M(s) === 'selected' && s.selected === 0, 'Idle + a hit selects that placement');
  s = R(R(placed, { t: 'done' }), { t: 'hit', index: -1 });
  ok(M(s) === 'idle', 'Idle + a miss is a no-op');

  // --- adjust writes to the selected entry ---
  s = R(placed, { t: 'adjust', patch: { rot: 1.2, size: 0.22 } });
  ok(s.stickers[0].rot === 1.2 && s.stickers[0].size === 0.22,
     'adjust patches the selected entry');
  ok(R(R(placed, { t: 'done' }), { t: 'adjust', patch: { rot: 9 } }).stickers[0].rot === 0,
     'adjust with nothing selected is a no-op');

  // --- delete returns to Idle ---
  s = R(placed, { t: 'delete' });
  ok(s.stickers.length === 0, 'delete removes the entry');
  ok(M(s) === 'idle', 'and returns to Idle');

  // --- done deselects ---
  ok(M(R(placed, { t: 'done' })) === 'idle', 'Done deselects to Idle');
}

console.log('── 12. Undo (spec § 5.2, § 9.1) ──');
{
  const { sandbox } = loadCtlPure(undefined, ['ctlStickerReduce', 'CTL_STICKER_HISTORY_MAX']);
  const R = sandbox.ctlStickerReduce;
  const blank = { stickers: [], armed: null, selected: -1, history: [] };
  const rec = { surface: 'shell', x: 1.16, y: -0.12, back: false,
                rot: 0, size: 0.18, chart: 'tangent' };

  ok(R(blank, { t: 'undo' }).stickers.length === 0, 'undo on an empty history is a no-op');

  // place -> undo
  let s = R(R(blank, { t: 'bookTap', id: 'banana' }), { t: 'place', rec });
  ok(s.history.length === 1, 'placing pushes one history entry');
  s = R(s, { t: 'undo' });
  ok(s.stickers.length === 0, 'undo removes the placement');
  ok(s.history.length === 0, 'and pops the history');

  // relocate -> undo restores the old position
  let p = R(R(blank, { t: 'bookTap', id: 'banana' }), { t: 'place', rec });
  p = R(p, { t: 'relocate', rec: Object.assign({}, rec, { x: 0.4 }) });
  ok(p.stickers[0].x === 0.4, 'the relocate applied');
  p = R(p, { t: 'undo' });
  ok(p.stickers[0].x === 1.16, 'undo restores the previous position');
  ok(p.stickers.length === 1, 'and does not remove the sticker');

  // delete -> undo restores it at its index
  let d = R(R(blank, { t: 'bookTap', id: 'banana' }), { t: 'place', rec });
  d = R(d, { t: 'bookTap', id: 'pan' });
  d = R(d, { t: 'place', rec: Object.assign({}, rec, { x: -0.5 }) });
  ok(d.stickers.length === 2, 'two placements');
  d = R(R(d, { t: 'done' }), { t: 'hit', index: 0 });
  d = R(d, { t: 'delete' });
  ok(d.stickers.length === 1 && d.stickers[0].id === 'pan', 'the first was deleted');
  d = R(d, { t: 'undo' });
  ok(d.stickers.length === 2, 'undo restores it');
  ok(d.stickers[0].id === 'banana', 'at its original index, not appended');

  // push/pop parity across a long run
  let q = blank;
  for (let i = 0; i < 5; i++) {
    q = R(q, { t: 'bookTap', id: 'id' + i });
    q = R(q, { t: 'place', rec: Object.assign({}, rec, { x: i * 0.1 }) });
  }
  ok(q.stickers.length === 5 && q.history.length === 5, 'five placements, five history entries');
  for (let i = 0; i < 5; i++) q = R(q, { t: 'undo' });
  ok(q.stickers.length === 0 && q.history.length === 0,
     'five undos return to empty — push/pop parity');

  // the stack is bounded
  let big = blank;
  for (let i = 0; i < 60; i++) {
    big = R(big, { t: 'bookTap', id: 'id' + i });
    big = R(big, { t: 'place', rec: Object.assign({}, rec, { x: i * 0.01 }) });
  }
  ok(big.history.length === sandbox.CTL_STICKER_HISTORY_MAX,
     'the history stack is capped at CTL_STICKER_HISTORY_MAX, got ' + big.history.length);
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
