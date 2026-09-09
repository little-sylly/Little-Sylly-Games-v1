// ═══════════════════════════════════════════════════════════════════════════
// verify-comb-board.js — Honeycomb Hills' BOARD LAYER, headlessly.
//
//   node tools/verify-comb-board.js          (exits 1 on any failure)
//   COMB_SRC=path node tools/…               (drive a different copy of comb.js —
//                                             proves a broken build fails here)
//   COMB_SEED=n node tools/…                 (reseed the Wild-deal sweep)
//
// Owns the topology (54/72/Euler/stability), both layouts, the 6-8 separation,
// the marker multiset, the pip totals and the Tended table from spec §10.
//
// It re-implements no rules. js/lib/physics.js and js/games/comb.js are both
// evaluated in ONE vm context with a bare `window` stub, and a bridge script run
// in that same context hands their lexical globals back — comb.js declares its
// state with `let`/`const`, so nothing lands on the sandbox object by itself.
//
// ── The known blind spot ───────────────────────────────────────────────────
// One process, `getElementById: () => null`. That is what lets it drive the
// board directly, and exactly what blinds it to the packet layer and to every
// line of render code. verify-comb-loopback.js is what covers that; a green run
// here proves the board, not the game.
// ═══════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT = path.join(__dirname, '..');
const PHYS = path.join(ROOT, 'js/lib/physics.js');
const GAME = process.env.COMB_SRC || path.join(ROOT, 'js/games/comb.js');
const SEED = Number(process.env.COMB_SEED || 20260907);

const sandbox = {
  console,
  window: {},
  document: { addEventListener() {}, getElementById: () => null, querySelectorAll: () => [] },
  showScreen() {}, setTimeout: () => 0, clearTimeout() {}, clearInterval() {},
  requestAnimationFrame: () => 0, cancelAnimationFrame() {},
  playLaunch() {}, playExit() {}, playDone() {}, playSuccess() {}, playBoing() {},
  playWhoosh() {}, playPillClick() {}, playTick() {}, playAlarm() {},
  mpSendEnvelope() { throw new Error('mpSendEnvelope called from the board layer'); },
  mpSendPrivate()  { throw new Error('mpSendPrivate called from the board layer'); },
  mpLockSync() {}, mpUnlockSync() {}, mpPlayerSlots: [], mpMyPlayerIdx: 0,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(PHYS, 'utf8'), sandbox, { filename: PHYS });
vm.runInContext(fs.readFileSync(GAME, 'utf8'), sandbox, { filename: GAME });

const BRIDGE = `
globalThis.__comb = {
  C: { COMB_AXIAL, COMB_SPIRAL, COMB_TENDED_KIND, COMB_TENDED_MARKER, COMB_MARKERS,
       COMB_HEX_COUNT, COMB_HEX_YIELD, COMB_TOPOLOGY, COMB_RES, COMB_COSTS },
  fn: { combBuildTopology, combTendedBoard, combDealBoard, combLayoutLegal,
        combHexesAdjacent, combShuffle },
  set layout(v) { combLayout = v; },  get layout() { return combLayout; },
};
`;
vm.runInContext(BRIDGE, sandbox, { filename: 'comb-board-bridge' });
const G = sandbox.__comb, C = G.C, F = G.fn;

// ── Tiny assertion harness ────────────────────────────────────────────────
let failures = 0, checks = 0;
// Key order must not decide a comparison — an object built by counting has
// insertion order, and the expected literal has source order.
function stable(v) {
  if (Array.isArray(v)) return v.map(stable);
  if (v && typeof v === 'object') {
    const o = {}; Object.keys(v).sort().forEach(k => { o[k] = stable(v[k]); }); return o;
  }
  return v;
}
function check(label, got, want) {
  checks++;
  const ok = JSON.stringify(stable(got)) === JSON.stringify(stable(want));
  if (!ok) { failures++; console.log(`  FAIL  ${label}\n        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`); }
  else console.log(`  ok    ${label}`);
}
function ok(label, cond) { check(label, !!cond, true); }
function section(t) { console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 62 - t.length))}`); }

// ══ 1. Topology ═══════════════════════════════════════════════════════════
section('Topology — the numbers packets depend on');
const T = C.COMB_TOPOLOGY;
check('19 hexes in COMB_AXIAL', C.COMB_AXIAL.length, 19);
check('54 nodes', T.nodes.length, 54);
check('72 edges', T.nodesOfEdge.length, 72);
// Euler for a planar graph: V - E + F = 2, with F = 19 hexes + the outer face.
check('Euler V - E + F = 2 (F = 20)', T.nodes.length - T.nodesOfEdge.length + 20, 2);
ok('every node touches 1-3 hexes', T.hexesOfNode.every(h => h.length >= 1 && h.length <= 3));
ok('every node has 2-3 neighbours', T.neighboursOfNode.every(n => n.length >= 2 && n.length <= 3));
ok('every edge has exactly 2 nodes', T.nodesOfEdge.every(e => e.length === 2));
ok('every edge joins two DIFFERENT nodes', T.nodesOfEdge.every(e => e[0] !== e[1]));
ok('every hex has 6 corner nodes', T.nodesOfHex.every(n => n.length === 6 && new Set(n).size === 6));
ok('every hex has 6 edges, none unresolved', T.edgesOfHex.every(e => e.length === 6 && e.every(x => x >= 0)));
ok('every node index in range', T.nodesOfEdge.every(e => e.every(n => n >= 0 && n < 54)));
ok('edgesOfNode agrees with nodesOfEdge', T.nodesOfEdge.every(([a, b], e) =>
  T.edgesOfNode[a].includes(e) && T.edgesOfNode[b].includes(e)));

// The negative-zero trap, spec §10. toFixed(3) yields "-0.000" for three corners
// on this layout and silently produces 56 nodes / 76 edges. Assert the property
// the fix guarantees: no rounded key is a negative zero string.
section('The negative-zero trap (spec §10)');
const keys = T.nodes.map(n => Math.round(n.x * 1000) + '|' + Math.round(n.y * 1000));
ok('no node key contains "-0|" or "|-0"', !keys.some(k => /(^|\|)-0($|\|)/.test(k)));
check('all 54 node keys distinct', new Set(keys).size, 54);
// And the counter-proof: the WRONG key really does break the board, so this
// assertion is not vacuous.
const bad = new Set();
for (const [q, r] of C.COMB_AXIAL) {
  const cx = Math.sqrt(3) * (q + r / 2), cy = 1.5 * r;
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 180) * (60 * k - 30);
    bad.add((cx + Math.cos(a)).toFixed(3) + '|' + (cy + Math.sin(a)).toFixed(3));
  }
}
check('counter-proof: toFixed(3) really does yield 56 nodes', bad.size, 56);

section('Stability — the guarantee a node id in a packet relies on');
const build1 = JSON.stringify(F.combBuildTopology());
const build2 = JSON.stringify(F.combBuildTopology());
ok('topology byte-identical across two builds', build1 === build2);
// Sorted by (y, then x) — the property that makes it stable in the first place.
let sorted = true;
for (let i = 1; i < T.nodes.length; i++) {
  const p = T.nodes[i - 1], c = T.nodes[i];
  if (c.y - p.y < -1e-9 || (Math.abs(c.y - p.y) <= 1e-9 && c.x < p.x - 1e-9)) sorted = false;
}
ok('nodes sorted by (y, then x)', sorted);
let eSorted = true;
for (let i = 1; i < T.nodesOfEdge.length; i++) {
  const p = T.nodesOfEdge[i - 1], c = T.nodesOfEdge[i];
  if (c[0] < p[0] || (c[0] === p[0] && c[1] < p[1])) eSorted = false;
}
ok('edges sorted by (min node, max node)', eSorted);
ok('every edge stored low-node-first', T.nodesOfEdge.every(([a, b]) => a < b));

section('Trade Blossoms — 9 ports on the rim');
check('9 ports', T.ports.length, 9);
check('4 generic 3:1', T.ports.filter(p => p.kind === 'any').length, 4);
check('5 specific 2:1', T.ports.filter(p => p.kind !== 'any').length, 5);
check('one port per resource', T.ports.filter(p => p.kind !== 'any').map(p => p.kind).sort(),
  C.COMB_RES.slice().sort());
ok('generic ports are rate 3', T.ports.filter(p => p.kind === 'any').every(p => p.rate === 3));
ok('specific ports are rate 2', T.ports.filter(p => p.kind !== 'any').every(p => p.rate === 2));
ok('every port node is coastal (touches < 3 hexes)',
  T.ports.every(p => p.nodes.every(n => T.hexesOfNode[n].length < 3)));
ok('every port covers two ADJACENT nodes',
  T.ports.every(p => T.neighboursOfNode[p.nodes[0]].includes(p.nodes[1])));
check('no node serves two ports', new Set(T.ports.flatMap(p => p.nodes)).size, 18);

// ══ 2. The Tended layout ══════════════════════════════════════════════════
section('Tended layout — the four verified properties (spec §10)');
G.layout = 'tended';
const tended = F.combTendedBoard();
check('19 hexes', tended.length, 19);
const kindCount = {};
tended.forEach(h => { kindCount[h.kind] = (kindCount[h.kind] || 0) + 1; });
check('kind counts match COMB_HEX_COUNT', kindCount, C.COMB_HEX_COUNT);
check('exactly one Smoke Zone', tended.filter(h => h.kind === 'smoke').length, 1);
check('the Smoke Zone carries no marker', tended.find(h => h.kind === 'smoke').marker, 0);
check('18 producing hexes carry a marker', tended.filter(h => h.marker > 0).length, 18);
const markers = tended.filter(h => h.marker > 0).map(h => h.marker).sort((a, b) => a - b);
check('marker multiset matches COMB_MARKERS', markers, C.COMB_MARKERS.slice().sort((a, b) => a - b));
ok('no marker is a 7', !markers.includes(7));
ok('no 6 adjacent to an 8 (nor 6-6, nor 8-8)', F.combLayoutLegal(tended, T));

// Pips = 6 - |7 - marker|. Spec §10 states the per-kind totals and the sum.
const pips = {};
tended.forEach(h => {
  if (!h.marker) return;
  pips[h.kind] = (pips[h.kind] || 0) + (6 - Math.abs(7 - h.marker));
});
check('pip totals per kind', pips, { grove: 13, blossom: 13, clover: 12, rock: 11, nursery: 9 });
check('total pips = 58', Object.values(pips).reduce((a, b) => a + b, 0), 58);
// Wax (rock) and Royal Jelly (nursery) are the scarcer pair by BOTH measures —
// the asymmetry brief §10 calls load-bearing, so it is asserted, not assumed.
ok('rock + nursery are the scarcest by hex count',
  C.COMB_HEX_COUNT.rock === 3 && C.COMB_HEX_COUNT.nursery === 3 &&
  C.COMB_HEX_COUNT.grove === 4 && C.COMB_HEX_COUNT.blossom === 4 && C.COMB_HEX_COUNT.clover === 4);
ok('rock + nursery are the scarcest by pips',
  pips.rock < pips.clover && pips.nursery < pips.rock);

// The spec's own table, transcribed. If someone edits COMB_TENDED_* this catches it.
section('Tended layout — the spec §10 table, hex by hex');
check('Tended markers match the spec table', tended.map(h => h.marker),
  [5, 2, 6, 10, 9, 4, 3, 8, 11, 0, 5, 8, 4, 3, 6, 10, 11, 12, 9]);
check('Tended kinds match the spec table', tended.map(h => h.kind),
  ['rock', 'grove', 'clover', 'grove', 'blossom', 'blossom', 'nursery',
   'blossom', 'clover', 'smoke', 'grove', 'rock', 'nursery', 'rock',
   'grove', 'clover', 'clover', 'blossom', 'nursery']);
check('the Smoke Zone is hex 9 (the centre)', tended.findIndex(h => h.kind === 'smoke'), 9);
check('COMB_SPIRAL visits all 19 hexes once', C.COMB_SPIRAL.slice().sort((a, b) => a - b),
  Array.from({ length: 19 }, (_, i) => i));

section('No same-kind connected triple (spec §10)');
// A "triple" is three hexes of one kind mutually forming a connected component
// of size >= 3 in the adjacency graph restricted to that kind.
const kindsOnBoard = [...new Set(tended.map(h => h.kind))].filter(k => k !== 'smoke');
let worstComponent = 0, worstKind = null;
for (const kind of kindsOnBoard) {
  const members = tended.map((h, i) => h.kind === kind ? i : -1).filter(i => i >= 0);
  const seen = new Set();
  for (const start of members) {
    if (seen.has(start)) continue;
    const stack = [start]; seen.add(start); let size = 0;
    while (stack.length) {
      const cur = stack.pop(); size++;
      for (const m of members) {
        if (!seen.has(m) && F.combHexesAdjacent(cur, m, T)) { seen.add(m); stack.push(m); }
      }
    }
    if (size > worstComponent) { worstComponent = size; worstKind = kind; }
  }
}
check(`largest same-kind connected group is a pair (worst: ${worstKind})`, worstComponent, 2);

// ══ 3. The Wild deal ══════════════════════════════════════════════════════
section('Wild deal — legal under every seed, and reproducible');
G.layout = 'wild';
let wildFail = 0, wildKindFail = 0, wildMarkerFail = 0;
const SWEEP = 300;
for (let i = 0; i < SWEEP; i++) {
  const b = F.combDealBoard(SEED + i * 7919);
  if (!F.combLayoutLegal(b, T)) wildFail++;
  const kc = {};
  b.forEach(h => { kc[h.kind] = (kc[h.kind] || 0) + 1; });
  // stable() — a counted object has insertion order, the constant has source order.
  if (JSON.stringify(stable(kc)) !== JSON.stringify(stable(C.COMB_HEX_COUNT))) wildKindFail++;
  const ms = b.filter(h => h.marker > 0).map(h => h.marker).sort((a, b2) => a - b2);
  if (JSON.stringify(ms) !== JSON.stringify(C.COMB_MARKERS.slice().sort((a, b2) => a - b2))) wildMarkerFail++;
  if (b.filter(h => h.kind === 'smoke')[0].marker !== 0) wildMarkerFail++;
}
check(`${SWEEP} Wild deals: none has a 6 touching an 8`, wildFail, 0);
check(`${SWEEP} Wild deals: kind counts always correct`, wildKindFail, 0);
check(`${SWEEP} Wild deals: marker multiset always correct`, wildMarkerFail, 0);
const r1 = JSON.stringify(F.combDealBoard(12345));
const r2 = JSON.stringify(F.combDealBoard(12345));
ok('same seed deals the identical board', r1 === r2);
ok('different seeds deal different boards', r1 !== JSON.stringify(F.combDealBoard(12346)));
// The setting overrides the seed entirely — Tended is Tended whatever is passed.
G.layout = 'tended';
ok('layout=tended ignores the seed', F.combDealBoard(999)[9].kind === 'smoke' &&
   JSON.stringify(F.combDealBoard(999)) === JSON.stringify(F.combDealBoard(111)));
G.layout = 'wild';

section('Adjacency helper — an EDGE, not a corner');
// ⚠️ Finding, 7 Sep 2026: on a hex TILING a pair sharing exactly ONE corner
// cannot exist. Three mutually-adjacent hexes meet at every vertex, so any two
// hexes that share a corner necessarily share an edge. The spec's "an edge, not
// a corner" caution is therefore defensively right but geometrically vacuous
// HERE — and asserting "some pair shares one corner" would assert something
// impossible. What is asserted instead is the real invariant.
const shareCount = {};
for (let a = 0; a < 19; a++) for (let b = a + 1; b < 19; b++) {
  let shared = 0;
  for (const n of T.nodesOfHex[a]) if (T.nodesOfHex[b].includes(n)) shared++;
  shareCount[shared] = (shareCount[shared] || 0) + 1;
}
// 19x6 = 114 hex-edge incidences over 72 edges: interior i, boundary b,
// b + i = 72 and b + 2i = 114, so i = 42 interior edges and b = 30 rim edges.
check('42 adjacent hex pairs (share an edge)', shareCount[2] || 0, 42);
check('NO pair shares exactly one corner (hex-tiling property)', shareCount[1] || 0, 0);
ok('sharing a corner implies sharing an edge', (shareCount[1] || 0) === 0);
ok('combHexesAdjacent agrees with the 2-shared-node test', (() => {
  for (let a = 0; a < 19; a++) for (let b = a + 1; b < 19; b++) {
    let shared = 0;
    for (const n of T.nodesOfHex[a]) if (T.nodesOfHex[b].includes(n)) shared++;
    if (F.combHexesAdjacent(a, b, T) !== (shared === 2)) return false;
  }
  return true;
})());
// 30 rim edges is also what the port walk assumes when it strides the rim cycle.
check('30 rim nodes (the port walk\'s assumption)',
  T.hexesOfNode.filter(h => h.length < 3).length, 30);

// ══ Summary ═══════════════════════════════════════════════════════════════
console.log('\n' + '='.repeat(70));
if (failures) { console.log(`${failures} of ${checks} CHECKS FAILED`); process.exit(1); }
console.log(`ALL ${checks} CHECKS PASSED`);
