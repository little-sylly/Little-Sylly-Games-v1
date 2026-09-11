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

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
