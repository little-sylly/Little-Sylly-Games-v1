// ═══════════════════════════════════════════════════════════════════════════
// nt-path-probe.js — movement-model instrument for Net-Trace.
//
// Asserts nothing and always exits 0. It exists to answer ONE question: when
// NT's latency for a board disagrees with maze.game's, is the gap a flat clock
// error or a missing per-turn cost? Those two are indistinguishable from a
// score alone, so this prints the covariate a score is missing — how many
// degrees of turning the route actually contains.
//
//   node tools/nt-path-probe.js                       (the calibration pair)
//   node tools/nt-path-probe.js --empty 9x10
//   node tools/nt-path-probe.js --comb 9x10 --target 38472
//   node tools/nt-path-probe.js board.json --target 38472
//
// A board.json is the same shape nt.js already uses internally:
//   { "w":9, "h":10,
//     "ingress":{"edge":"top","idx":3}, "egress":{"edge":"bottom","idx":5},
//     "blocks":[[ax,ay], ...] }        // 2×2 top-left tile anchors
// Blocks are geometry only — a firewall and a bad sector bend the route
// identically, so transcribing a maze.game board needs no type information.
// ═══════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT  = path.join(__dirname, '..');
const ntSrc = fs.readFileSync(process.env.NT_SRC || path.join(ROOT, 'js/games/nt.js'), 'utf8');

// ── Minimal sandbox. Only the pure geometry functions are used, but nt.js still
// has to evaluate top-to-bottom, so the same stubs verify-nt-loopback.js uses are
// supplied here.
const noop = () => {};
const el = () => ({
  style: {}, classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
  addEventListener: noop, appendChild: noop, querySelector: () => null,
  querySelectorAll: () => [], getContext: () => null, children: [],
  textContent: '', innerHTML: '', dataset: {},
});
const sandbox = {
  console,
  document: {
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    createElement: el, body: el(), addEventListener: noop,
  },
  window: { syllyMultiplayerMode: 'single', syllyDeviceUid: 'probe', syllySyncLocked: false },
  performance: { now: () => Date.now() },
  shuffle: a => [...a],
  formatTime: s => String(s),
  showScreen: noop, setTimeout: () => 0, clearTimeout: noop,
  setInterval: () => 0, clearInterval: noop,
  requestAnimationFrame: () => 0, cancelAnimationFrame: noop,
  playLaunch: noop, playWhoosh: noop, playDone: noop, playTick: noop, playBoing: noop,
  playAlarm: noop, playSuccess: noop, playExit: noop, playPillClick: noop,
  playSyllyOn: noop, playSyllyOff: noop, playSonarPing: noop, playHullThud: noop,
  mpLockSync: noop, mpUnlockSync: noop, mpShowModeScreen: noop, mpReturnToLobby: noop,
  mpSendPrivate: noop, mpPlayerSlots: [], mpMyPlayerIdx: 0, resetToLobby: noop,
  Math,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const BRIDGE = `
globalThis.__probe = {
  shortestPath: (node, pl) => ntShortestPath(node, pl),
  timeline:     (poly, hp) => ntComputeTimeline(poly, hp),
  tileTime:     () => NT_BASE_TILE_TIME,
  runnerHalf:   () => NT_RUNNER_HALF,
  honeypotCentres: (node, pl) => ntHoneypotCentres(node, pl),
};`;
vm.runInContext(ntSrc + BRIDGE, sandbox, { filename: 'nt.js (probe)' });
const P = sandbox.__probe;

// ── Board builders ─────────────────────────────────────────────────────────────

// Straight shot down the middle: no blocks, no turns. The pure-clock baseline —
// any gap against maze.game here is a rate error and nothing else.
function emptyBoard(w, h) {
  return { w, h, ingress: { edge: 'top', idx: w >> 1 }, egress: { edge: 'bottom', idx: w >> 1 }, blocks: [] };
}

// Serpentine: alternating walls of 2×2 blocks with the gap at alternating ends,
// forcing a countable set of switchbacks. The per-turn probe.
function combBoard(w, h) {
  const blocks = [];
  let row = 2, side = 0;
  while (row <= h - 3) {
    const from = side ? 0 : 2;
    const to   = w - (side ? 2 : 0);
    for (let ax = from; ax + 1 < to; ax += 2) blocks.push([ax, row]);
    row += 3; side ^= 1;
  }
  return { w, h, ingress: { edge: 'top', idx: 0 }, egress: { edge: 'bottom', idx: w - 1 }, blocks };
}

// ── Turn measurement ───────────────────────────────────────────────────────────
// Exterior angle at each interior vertex, reported as a total in degrees and as
// 90°-equivalents — "how many right-angle corners' worth of turning" is the unit
// a per-turn cost would actually be charged in.
// `from`/`to` bound which vertices count. The polyline is
// [outside, border, interior, …taut…, interior, border, outside], so vertices 1–2
// and the mirrored pair at the end are the PORT MOUTH joints — the runner is forced
// to enter and leave perpendicular to the edge regardless of the maze. Those turns
// exist on every board including an empty one, so charging them the same per-turn
// cost as a real maze corner is what made the empty board look like an outlier.
function turnStats(poly, from, to) {
  let totalDeg = 0, count = 0, oneMinusCos = 0, sinHalf = 0;
  from = from == null ? 1 : from;
  to = to == null ? poly.length - 1 : to;
  for (let i = from; i < to; i++) {
    const ax = poly[i].x - poly[i - 1].x, ay = poly[i].y - poly[i - 1].y;
    const bx = poly[i + 1].x - poly[i].x, by = poly[i + 1].y - poly[i].y;
    const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
    if (la < 1e-9 || lb < 1e-9) continue;
    const cos = Math.max(-1, Math.min(1, (ax * bx + ay * by) / (la * lb)));
    const deg = Math.acos(cos) * 180 / Math.PI;
    if (deg < 0.5) continue;                       // collinear vertices are not turns
    totalDeg += deg; count++;
    // Two rival laws for how much a corner should cost, both normalised so a 90°
    // turn scores 1.0. Linear-in-angle charges a shallow bend proportionally; the
    // other two are the shapes a real decelerating body gives, and charge a shallow
    // bend much less. Which one is right is decided by the near-empty board, whose
    // single 63° bend is the only shallow corner in the data.
    oneMinusCos += (1 - cos) / 1;                  // 1−cos θ   (90° ⇒ 1.0)
    sinHalf += Math.sin(Math.acos(cos) / 2) / Math.SIN45;
  }
  return { totalDeg, count, oneMinusCos, sinHalf };
}
Math.SIN45 = Math.sin(Math.PI / 4);                // 90° normaliser for sinHalf

// How many times does the route ENTER a slow block's radius? Pure geometry — no clock,
// no cooldown, no duration. It is the ceiling on the fire count under any rule that
// re-arms on leaving the field, and it is the number to compare against maze.game's
// on-screen trigger count. If a board that maze.game scores as a quad has only three
// distinct entries, an entry-triggered rule cannot be the whole story.
function aoePasses(poly, honeypots) {
  const R2 = 18;                                  // (3√2)² — NT_HONEYPOT_RADIUS_SQ
  const STEP = 0.05;                              // fine enough that a clipped corner of the disc still registers
  const per = honeypots.map(() => 0);
  const inside = honeypots.map(() => false);
  for (let i = 1; i < poly.length; i++) {
    const a = poly[i - 1], b = poly[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(1, Math.ceil(len / STEP));
    for (let k = 0; k <= n; k++) {
      const x = a.x + (b.x - a.x) * k / n, y = a.y + (b.y - a.y) * k / n;
      honeypots.forEach((hp, j) => {
        const dx = hp.x - x, dy = hp.y - y;
        const now = dx * dx + dy * dy <= R2;
        if (now && !inside[j]) per[j]++;
        inside[j] = now;
      });
    }
  }
  return { per, total: per.reduce((a, b) => a + b, 0) };
}

function polyLength(poly) {
  let L = 0;
  for (let i = 1; i < poly.length; i++) L += Math.hypot(poly[i].x - poly[i - 1].x, poly[i].y - poly[i - 1].y);
  return L;
}

// ── Report ─────────────────────────────────────────────────────────────────────
function report(name, board, target) {
  // `slows` are maze.game's ice blocks — solid AND slowing, which is exactly NT's
  // nativeHoneypot. They are listed in `blocks` too (they are obstacles first), so
  // subtract them out rather than declaring them twice.
  const slows = board.slows || [];
  const isSlow = (ax, ay) => slows.some(([sx, sy]) => sx === ax && sy === ay);
  const node = {
    w: board.w, h: board.h, ingress: board.ingress, egress: board.egress,
    badSectors: (board.blocks || []).filter(([ax, ay]) => !isSlow(ax, ay)).map(([ax, ay]) => ({ ax, ay })),
    nativeHoneypots: slows.map(([ax, ay]) => ({ ax, ay })),
  };
  const poly = P.shortestPath(node, []);
  if (!poly) { console.log('\n' + name + ': NO ROUTE — this board seals the egress.'); return; }
  const tl  = P.timeline(poly, P.honeypotCentres(node, []));
  const t   = turnStats(poly);
  const len = polyLength(poly);

  // The off-board approach/exit stubs are the first two and last two points. Split
  // them out: if maze.game measures from the board edge and we measure from 0.6
  // tiles outside it, that is a fixed offset masquerading as a rate error.
  const innerLen = polyLength(poly.slice(2, poly.length - 2));

  console.log('\n── ' + name + '  (' + board.w + '×' + board.h + ', ' + (board.blocks || []).length + ' blocks)');
  console.log('   latency        ' + tl.latencyMs.toLocaleString('en-AU') + ' ms');
  console.log('   path length    ' + len.toFixed(3) + ' tiles  (' + innerLen.toFixed(3) +
              ' on-board + ' + (len - innerLen).toFixed(3) + ' entry/exit stubs)');
  console.log('   vertices       ' + poly.length);
  const tm = turnStats(poly, 3, poly.length - 3);   // maze corners only, no port mouths
  console.log('   turning        ' + t.count + ' turns, ' + t.totalDeg.toFixed(1) + '° total = ' +
              (t.totalDeg / 90).toFixed(2) + ' right-angle equivalents');
  // FIRES are a sharper constraint than latency. maze.game shows the trigger count on
  // screen, so "this board scored a quad" pins the re-trigger rule directly, with none
  // of the clock error a score comparison carries. Print them whenever the board slows.
  if (tl.fires.length || (board.slows || []).length) {
    // Centres, not block anchors — the same conversion the timeline itself uses.
    const passes = aoePasses(poly, P.honeypotCentres(node, []));
    console.log('   slow blocks    ' + (node.nativeHoneypots || []).length +
                '   fires ' + tl.fires.length + '  at [' +
                tl.fires.map(f => Math.round(f.atMs)).join(', ') + ']');
    console.log('   AoE passes     ' + passes.total + ' distinct entries' +
                (passes.per.length > 1 ? '  (per block: ' + passes.per.join(', ') + ')' : '') +
                '   ← the ceiling on fires under an entry-triggered rule');
    const slowMs = tl.slowSpans.reduce((a, [s0, s1]) => a + (s1 - s0), 0);
    console.log('   slowed for     ' + Math.round(slowMs).toLocaleString('en-AU') + ' ms of ' +
                tl.latencyMs.toLocaleString('en-AU') + '  (' + (100 * slowMs / tl.latencyMs).toFixed(1) + '%)');
  }
  console.log('   maze corners   ' + tm.count + ' turns, ' + tm.totalDeg.toFixed(1) + '° = ' +
              (tm.totalDeg / 90).toFixed(2) + ' RA-eq  (port mouths excluded)');

  const turnArg = process.argv.indexOf('--turn');
  const kTurn = turnArg >= 0 ? Number(process.argv[turnArg + 1]) : 0;
  if (kTurn) {
    const withTurn = tl.latencyMs + kTurn * tm.sinHalf;
    console.log('   + turn cost    ' + Math.round(withTurn).toLocaleString('en-AU') + ' ms   (' +
                kTurn + ' ms x ' + tm.sinHalf.toFixed(2) + ' 90-deg-equivalents = +' +
                Math.round(kTurn * tm.sinHalf).toLocaleString('en-AU') + ' ms)');
    if (target != null && !Number.isNaN(target)) {
      const r = target - withTurn;
      console.log('     residual vs maze.game  ' + (r >= 0 ? '+' : '') + Math.round(r).toLocaleString('en-AU') +
                  ' ms  (' + (100 * r / target).toFixed(2) + '%)');
    }
  }
  if (target != null && !Number.isNaN(target)) {
    const gap = target - tl.latencyMs;
    const eq  = tm.totalDeg / 90;
    console.log('   ── against maze.game ' + target.toLocaleString('en-AU') + ' ms');
    console.log('      gap             ' + (gap >= 0 ? '+' : '') + gap.toLocaleString('en-AU') +
                ' ms  (' + (100 * gap / tl.latencyMs).toFixed(2) + '%)');
    console.log('      flat-clock fix  NT_BASE_TILE_TIME ' + P.tileTime() + ' → ' +
                (P.tileTime() * target / tl.latencyMs).toFixed(1));
    console.log('      per-turn fits   linear ' + (eq > 0.01 ? (gap / eq).toFixed(1) : 'n/a') +
                '   1−cos ' + (tm.oneMinusCos > 0.01 ? (gap / tm.oneMinusCos).toFixed(1) : 'n/a') +
                '   sin(θ/2) ' + (tm.sinHalf > 0.01 ? (gap / tm.sinHalf).toFixed(1) : 'n/a') +
                '   ms per 90°-equivalent');
    console.log('      legacy          ' + (eq > 0.01
      ? (gap / eq).toFixed(1) + ' ms per right-angle turn'
      : 'n/a — this board has no turns, so the gap is all clock'));
  }
}

// ── CLI ────────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const ti = argv.indexOf('--target');
const target = ti >= 0 ? Number(argv[ti + 1]) : null;
const dims = s => { const m = /^(\d+)x(\d+)$/.exec(s || ''); return m ? [Number(m[1]), Number(m[2])] : [18, 18]; };

console.log('nt-path-probe — tile time ' + P.tileTime() + ' ms/tile, runner half-width ' + P.runnerHalf() + ' tiles');

if (argv.includes('--empty')) {
  const [w, h] = dims(argv[argv.indexOf('--empty') + 1]);
  report('EMPTY (clock baseline)', emptyBoard(w, h), target);
} else if (argv.includes('--comb')) {
  const [w, h] = dims(argv[argv.indexOf('--comb') + 1]);
  report('COMB (per-turn probe)', combBoard(w, h), target);
} else if (argv[0] && argv[0].indexOf('--') !== 0) {
  report(path.basename(argv[0]), JSON.parse(fs.readFileSync(argv[0], 'utf8')), target);
} else {
  [['9×10', 9, 10], ['18×18', 18, 18]].forEach(([label, w, h]) => {
    report('EMPTY ' + label + ' (clock baseline)', emptyBoard(w, h), null);
    report('COMB ' + label + ' (per-turn probe)', combBoard(w, h), null);
  });
  console.log('\nReplicate a maze.game board as a board.json, then pass --target <its score> for the fit.\n');
}
