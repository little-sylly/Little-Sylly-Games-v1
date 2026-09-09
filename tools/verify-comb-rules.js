// ═══════════════════════════════════════════════════════════════════════════
// verify-comb-rules.js — Honeycomb Hills' RULES LAYER, headlessly.
//
//   node tools/verify-comb-rules.js          (exits 1 on any failure)
//   COMB_SRC=path node tools/…               (drive a different copy of comb.js)
//
// Owns everything verify-comb-board.js deliberately does not: costs, placement
// legality including the Distance Rule, the longest-chain DFS with cuts, BOTH
// achievement transfer rules including every tie case, the win check's
// own-turn-only rule, Instinct legality and the bank rates (spec §6/§7).
//
// ── The known blind spot ───────────────────────────────────────────────────
// One process, `getElementById: () => null`, `syllyMultiplayerMode = 'single'`.
// That is what lets it drive all N seats, and exactly what blinds it to the
// packet layer and every line of render code. mpSendEnvelope/mpSendPrivate
// THROW here — they are the tripwire proving the rules layer broadcasts nothing.
// ═══════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT = path.join(__dirname, '..');
const PHYS = path.join(ROOT, 'js/lib/physics.js');
const GAME = process.env.COMB_SRC || path.join(ROOT, 'js/games/comb.js');

const sandbox = {
  console,
  window: { syllyMultiplayerMode: 'single', syllyDeviceUid: null },
  document: { addEventListener() {}, getElementById: () => null, querySelectorAll: () => [] },
  showScreen() {}, setTimeout: () => 0, clearTimeout() {}, clearInterval() {},
  requestAnimationFrame: () => 0, cancelAnimationFrame() {},
  playLaunch() {}, playExit() {}, playDone() {}, playSuccess() {}, playBoing() {},
  playWhoosh() {}, playPillClick() {}, playTick() {}, playAlarm() {},
  mpSendEnvelope() { throw new Error('mpSendEnvelope called from the rules layer'); },
  mpSendPrivate()  { throw new Error('mpSendPrivate called from the rules layer'); },
  mpLockSync() {}, mpUnlockSync() {}, mpPlayerSlots: [], mpMyPlayerIdx: 0,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(PHYS, 'utf8'), sandbox, { filename: PHYS });
vm.runInContext(fs.readFileSync(GAME, 'utf8'), sandbox, { filename: GAME });

const BRIDGE = `
globalThis.__comb = {
  C: { COMB_RES, COMB_COSTS, COMB_LIMITS, COMB_ACHIEVEMENT, COMB_TOPOLOGY,
       COMB_DECK_COUNT, COMB_HEX_YIELD, COMB_MARKERS },
  fn: { combLongestChain, combRecomputeAchievements, combResolveHolder, combCheckWin,
        combPublicPoints, combTruePoints, combApplyPlace, combAttemptPlace,
        combPlaceLegal, combLegalTargetsFor, combCanAfford, combAtPieceLimit,
        combPieceCount, combBankRate, combTradeStillValid, combSetHand,
        combSetInstinct, combTendedBoard, combTarget, combCarryLimit, combAchievement,
        combNodeTouchesOwn, combApplySeasonPreset },
  get nodes()    { return combNodes; },    set nodes(v)    { combNodes = v; },
  get edges()    { return combEdges; },    set edges(v)    { combEdges = v; },
  get hexes()    { return combHexes; },    set hexes(v)    { combHexes = v; },
  get hands()    { return combHands; },    set hands(v)    { combHands = v; },
  get instinct() { return combInstinct; }, set instinct(v) { combInstinct = v; },
  get count()    { return combPlayerCount; }, set count(v) { combPlayerCount = v; },
  get turn()     { return combTurn; },     set turn(v)     { combTurn = v; },
  get turnNo()   { return combTurnNo; },   set turnNo(v)   { combTurnNo = v; },
  get phase()    { return combPhase; },    set phase(v)    { combPhase = v; },
  get chainLen() { return combChainLen; }, set chainLen(v) { combChainLen = v; },
  get guards()   { return combGuardsPlayed; }, set guards(v) { combGuardsPlayed = v; },
  get largest()  { return combLargestHolder; },  set largest(v)  { combLargestHolder = v; },
  get fiercest() { return combFiercestHolder; }, set fiercest(v) { combFiercestHolder = v; },
  get wasp()     { return combWaspHex; },  set wasp(v)     { combWaspHex = v; },
  get season()   { return combSeason; },   set season(v)   { combSeason = v; },
  get waspSetting()     { return combWasp; },     set waspSetting(v)     { combWasp = v; },
  get overflowSetting() { return combOverflow; }, set overflowSetting(v) { combOverflow = v; },
  get stats()    { return combStats; },    set stats(v)    { combStats = v; },
};
`;
vm.runInContext(BRIDGE, sandbox, { filename: 'comb-rules-bridge' });
const G = sandbox.__comb, C = G.C, F = G.fn;
const T = C.COMB_TOPOLOGY;

let failures = 0, checks = 0;
function stable(v) {
  if (Array.isArray(v)) return v.map(stable);
  if (v && typeof v === 'object') {
    const o = {}; Object.keys(v).sort().forEach(k => { o[k] = stable(v[k]); }); return o;
  }
  return v;
}
function check(label, got, want) {
  checks++;
  if (JSON.stringify(stable(got)) !== JSON.stringify(stable(want))) {
    failures++;
    console.log(`  FAIL  ${label}\n        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`);
  } else console.log(`  ok    ${label}`);
}
function ok(label, cond) { check(label, !!cond, true); }
function section(t) { console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 62 - t.length))}`); }

// Fresh board with N players, nothing built. Every test starts from this so no
// test can inherit another's board.
function reset(n) {
  n = n || 4;
  G.count = n;
  G.hexes = F.combTendedBoard();
  G.nodes = Array.from({ length: 54 }, () => ({ owner: -1, level: 0 }));
  G.edges = new Array(72).fill(-1);
  G.hands = Array.from({ length: n }, () => [0, 0, 0, 0, 0]);
  G.instinct = Array.from({ length: n }, () => []);
  G.guards = new Array(n).fill(0);
  G.chainLen = new Array(n).fill(0);
  G.largest = -1; G.fiercest = -1;
  G.turn = 0; G.turnNo = 1; G.phase = 'actions';
  G.wasp = G.hexes.findIndex(h => h.kind === 'smoke');
  G.stats = { scoutFlights: 0, waspLandings: 0 };
}
// Give p a straight run of walls along a PATH of connected edges. The greedy
// walk dead-ends once it reaches a node whose other edges are all used, so it is
// only good for short runs — which is all the chain tests need. Use
// connectedBlob() when the count matters more than the shape.
function chainOf(len, p) {
  const used = [];
  let node = T.nodesOfEdge[0][0];
  const seenE = new Set();
  while (used.length < len) {
    const next = T.edgesOfNode[node].find(e => !seenE.has(e));
    if (next === undefined) break;
    seenE.add(next); used.push(next);
    const [a, b] = T.nodesOfEdge[next];
    node = (a === node) ? b : a;
  }
  used.forEach(e => { G.edges[e] = p; });
  return used;
}

// N connected edges, BFS rather than a single path — so an exact count is always
// reachable and a legal (connected, unowned) (N+1)th edge always exists.
function connectedBlob(len, p) {
  const start = T.nodesOfEdge[0][0];
  const owned = [], seenE = new Set(), queue = [start], seenN = new Set([start]);
  while (queue.length && owned.length < len) {
    const node = queue.shift();
    for (const e of T.edgesOfNode[node]) {
      if (owned.length >= len) break;
      if (seenE.has(e)) continue;
      seenE.add(e); owned.push(e); G.edges[e] = p;
      const [a, b] = T.nodesOfEdge[e];
      for (const m of [a, b]) if (!seenN.has(m)) { seenN.add(m); queue.push(m); }
    }
  }
  return owned;
}

// ══ 1. Costs ══════════════════════════════════════════════════════════════
section('Build costs — one constant, three readers (spec §6)');
check('Comb Wall  = 1 Resin + 1 Wax',            C.COMB_COSTS.wall, [1, 1, 0, 0, 0]);
check('Drone Cell = 1 Resin + 1 Wax + 1 Pollen + 1 Nectar', C.COMB_COSTS.cell, [1, 1, 1, 1, 0]);
check('Queen Dome = 2 Nectar + 3 Royal Jelly',   C.COMB_COSTS.dome, [0, 0, 0, 2, 3]);
check('Instinct   = 1 Pollen + 1 Nectar + 1 Royal Jelly', C.COMB_COSTS.instinct, [0, 0, 1, 1, 1]);
check('resource index order', C.COMB_RES, ['resin', 'wax', 'pollen', 'nectar', 'jelly']);
check('piece limits 15/5/4', C.COMB_LIMITS, { wall: 15, cell: 5, dome: 4 });
check('25-card deck', Object.values(C.COMB_DECK_COUNT).reduce((a, b) => a + b, 0), 25);
check('14 Guard Bees', C.COMB_DECK_COUNT.guard, 14);
check('5 Golden Nectar', C.COMB_DECK_COUNT.golden, 5);

section('Affordability');
reset();
G.hands[0] = [1, 1, 0, 0, 0];
ok('can afford a wall with exactly its cost', F.combCanAfford(0, C.COMB_COSTS.wall));
ok('cannot afford a cell one short', !F.combCanAfford(0, C.COMB_COSTS.cell));
G.hands[0] = [0, 0, 0, 0, 0];
ok('cannot afford a wall with nothing', !F.combCanAfford(0, C.COMB_COSTS.wall));

// ══ 2. Season targets ═════════════════════════════════════════════════════
section('The Season — target and carry limit');
G.season = 'short'; check('Short Summer target is 7', F.combTarget(), 7);
G.season = 'full';  check('Full Season target is 10', F.combTarget(), 10);
G.season = 'short';
check('achievement config keyed by Season', F.combAchievement(), { points: 2, minChain: 5, minGuards: 3 });

// ══ 3. Placement legality ═════════════════════════════════════════════════
section('Drone Cell — the Distance Rule (spec §7, the most-missed rule)');
reset();
const n0 = 0, nbr = T.neighboursOfNode[n0][0];
const far = T.nodes.map((_, i) => i).find(i =>
  i !== n0 && !T.neighboursOfNode[n0].includes(i) && !T.neighboursOfNode[i].includes(n0));
ok('an empty unconnected node is legal in the DRAFT', F.combPlaceLegal('cell', n0, 0, { draft: true }).ok);
ok('the same node is ILLEGAL outside the draft (unconnected)',
  !F.combPlaceLegal('cell', n0, 0, {}).ok);
check('…and its reason is the connection message',
  F.combPlaceLegal('cell', n0, 0, {}).reason, 'Nothing of yours reaches here yet.');
G.nodes[n0] = { owner: 0, level: 1 };
check('a NEIGHBOUR of a cell is blocked by the Distance Rule',
  F.combPlaceLegal('cell', nbr, 0, { draft: true }).reason, 'Too close to the comb next door.');
ok('the Distance Rule blocks your OWN neighbour too, not just an opponent\'s',
  !F.combPlaceLegal('cell', nbr, 0, { draft: true }).ok);
ok('a non-neighbour is still legal in the draft', F.combPlaceLegal('cell', far, 1, { draft: true }).ok);
ok('an occupied node never lights up (reason null)',
  F.combPlaceLegal('cell', n0, 1, { draft: true }).reason === null);
// Two hops is the minimum separation the render layer's 30px pieces rely on.
ok('a node two hops away is legal', (() => {
  const two = T.neighboursOfNode[nbr].find(m => m !== n0 && !T.neighboursOfNode[n0].includes(m));
  return two !== undefined && F.combPlaceLegal('cell', two, 0, { draft: true }).ok;
})());

section('Comb Wall — connection');
reset();
const e0 = 0, [ea, eb] = T.nodesOfEdge[e0];
ok('an unconnected edge is illegal', !F.combPlaceLegal('wall', e0, 0, {}).ok);
check('…with the connection reason', F.combPlaceLegal('wall', e0, 0, {}).reason,
  'Nothing of yours reaches here yet.');
G.nodes[ea] = { owner: 0, level: 1 };
ok('an edge touching your own cell is legal', F.combPlaceLegal('wall', e0, 0, {}).ok);
ok('the same edge is illegal for another player', !F.combPlaceLegal('wall', e0, 1, {}).ok);
G.edges[e0] = 0;
ok('an occupied edge never lights up', F.combPlaceLegal('wall', e0, 0, {}).reason === null);
// Extending from your own wall
reset();
G.edges[e0] = 0;
const nextE = T.edgesOfNode[eb].find(e => e !== e0);
ok('you may extend from your own wall', F.combPlaceLegal('wall', nextE, 0, {}).ok);
// …but not THROUGH an opponent's building
G.nodes[eb] = { owner: 1, level: 1 };
ok('you may NOT extend through an opponent\'s building',
  !F.combPlaceLegal('wall', nextE, 0, {}).ok);
G.nodes[eb] = { owner: 0, level: 1 };
ok('…but you may extend through your OWN building',
  F.combPlaceLegal('wall', nextE, 0, {}).ok);

section('Queen Dome and the Wasp');
reset();
G.nodes[5] = { owner: 0, level: 1 };
ok('your own Drone Cell can be upgraded', F.combPlaceLegal('dome', 5, 0, {}).ok);
ok('an opponent\'s cell cannot', !F.combPlaceLegal('dome', 5, 1, {}).ok);
G.nodes[5] = { owner: 0, level: 2 };
ok('an existing Dome cannot be upgraded again', !F.combPlaceLegal('dome', 5, 0, {}).ok);
ok('an empty node cannot be domed', !F.combPlaceLegal('dome', 6, 0, {}).ok);
G.wasp = 3;
check('the Wasp cannot stay put', F.combPlaceLegal('wasp', 3, 0, {}).reason, 'The Wasp is already there.');
ok('the Wasp may move anywhere else', F.combPlaceLegal('wasp', 4, 0, {}).ok);

// ══ 4. The applier ════════════════════════════════════════════════════════
section('combApplyPlace — cost, limits and the free exemptions');
reset();
G.hands[0] = [1, 1, 0, 0, 0];
let r = F.combApplyPlace('wall', e0, 0, { draft: true, free: true });
ok('a free draft wall places', r.ok);
check('…and costs nothing', G.hands[0], [1, 1, 0, 0, 0]);
reset();
G.nodes[ea] = { owner: 0, level: 1 };
G.hands[0] = [1, 1, 0, 0, 0];
r = F.combApplyPlace('wall', e0, 0, {});
ok('a paid wall places', r.ok);
check('…and deducts exactly its cost', G.hands[0], [0, 0, 0, 0, 0]);
check('…and the edge is owned', G.edges[e0], 0);
r = F.combApplyPlace('wall', T.edgesOfNode[eb].find(e => e !== e0), 0, {});
ok('a wall with an empty hand is refused', !r.ok);
// Piece limits
reset();
G.hands[0] = [99, 99, 99, 99, 99];
G.nodes[ea] = { owner: 0, level: 1 };
const walls = connectedBlob(15, 0);
check('15 walls placed by fixture', F.combPieceCount(0, 'wall'), 15);
ok('at the wall limit', F.combAtPieceLimit(0, 'wall'));
// A CONNECTED, unowned 16th edge — so the refusal can only be the limit, never
// a connection failure. That is what makes this assertion mean what it says.
const spare = walls.map(e => T.nodesOfEdge[e]).flat()
  .map(n => T.edgesOfNode[n]).flat().find(e => G.edges[e] === -1);
ok('a connected unowned 16th edge exists to aim at', spare !== undefined);
ok('…and it would be legal but for the limit', F.combPlaceLegal('wall', spare, 0, {}).ok);
r = F.combApplyPlace('wall', spare, 0, {});
check('a 16th wall is refused with the limit message', r.reason, 'Your colony has no more to give.');
check('…and the edge is still unowned', G.edges[spare], -1);
// The limit outranks a connection failure — the dominant, more useful reason.
const stranded = G.edges.findIndex((o, e) => o === -1 &&
  T.nodesOfEdge[e].every(n => !F.combNodeTouchesOwn(0, n) && G.nodes[n].level === 0));
check('the limit outranks "nothing reaches here" on an unconnected edge',
  F.combApplyPlace('wall', stranded, 0, {}).reason, 'Your colony has no more to give.');
// Cells and domes have their own caps.
reset();
G.hands[0] = [99, 99, 99, 99, 99];
[0, 6, 12, 18, 24].forEach(n => { G.nodes[n] = { owner: 0, level: 1 }; });
ok('5 Drone Cells is the cap', F.combAtPieceLimit(0, 'cell'));
ok('a dome is still allowed at the cell cap', !F.combAtPieceLimit(0, 'dome'));
F.combApplyPlace('dome', 0, 0, {});
check('upgrading frees a cell slot (the cap counts CURRENT level)',
  F.combAtPieceLimit(0, 'cell'), false);
check('…and the node is now a Dome', G.nodes[0].level, 2);

// ══ 5. Longest chain ══════════════════════════════════════════════════════
section('combLongestChain — the DFS, and the cut');
reset();
check('no walls -> chain 0', F.combLongestChain(0), 0);
const c5 = chainOf(5, 0);
check('a 5-wall run -> chain 5', F.combLongestChain(0), 5);
check('another player\'s chain is 0', F.combLongestChain(1), 0);
// The cut: an opponent's Drone Cell in the middle of the run.
const midNode = T.nodesOfEdge[c5[2]][1];
G.nodes[midNode] = { owner: 1, level: 1 };
const cut = F.combLongestChain(0);
ok(`an opponent's cell CUTS the chain (5 -> ${cut})`, cut < 5);
ok('…and both halves still count as chains', cut >= 2);
// Your own building does NOT cut it.
G.nodes[midNode] = { owner: 0, level: 1 };
check('your OWN building does not cut your chain', F.combLongestChain(0), 5);
// A branching network may revisit a node — visited must be over EDGES.
reset();
const hub = T.nodesOfEdge[0][0];
T.edgesOfNode[hub].forEach(e => { G.edges[e] = 0; });
const deg = T.edgesOfNode[hub].length;
check(`a ${deg}-spoke star through one hub -> chain 2 (a path uses two spokes)`,
  F.combLongestChain(0), 2);

// ══ 6. Achievements ═══════════════════════════════════════════════════════
section('Largest Comb — the transfer rule uses > and never >= (Q18)');
// combResolveHolder is the shared shape; drive it directly for the tie cases.
G.count = 4;
check('below the minimum -> nobody holds it', F.combResolveHolder([4, 3, 0, 0], -1, 5), -1);
check('first to 5, alone -> they take it',     F.combResolveHolder([5, 3, 0, 0], -1, 5), 0);
check('two arrive at 5 together -> nobody',    F.combResolveHolder([5, 5, 0, 0], -1, 5), -1);
check('holder tied by a challenger -> HOLDER KEEPS IT', F.combResolveHolder([5, 5, 0, 0], 0, 5), 0);
check('challenger exceeds outright -> transfer',       F.combResolveHolder([5, 6, 0, 0], 0, 5), 1);
check('holder still leads -> unchanged',               F.combResolveHolder([7, 6, 0, 0], 0, 5), 0);
// The one genuinely ambiguous case in Catan's own rules, settled deliberately.
check('holder beaten by TWO at once -> HOLDER KEEPS IT (spec §6 step 3)',
  F.combResolveHolder([5, 6, 6, 0], 0, 5), 0);

// ⚠️ These four are the ones that actually PIN the tie rule, and they were added
// after a mutation run (7 Sep 2026) showed the first batch could not. The rule is
// implemented with TWO independent guards — the `scores[holder] === best` early
// return AND `leaders.length === 1` — so no SINGLE mutation can break it, and
// every tie case where the holder happens to be leaders[0] is answered
// identically by both. Only a tie where the holder is NOT the lowest-numbered
// leader tells the two apart, and only those cases kill the double mutant.
check('tie where the holder is NOT the first leader -> still keeps it',
  F.combResolveHolder([5, 5, 0, 0], 1, 5), 1);
check('three-way tie, holder is the last of them -> still keeps it',
  F.combResolveHolder([5, 5, 5, 0], 2, 5), 2);
check('beaten by two, holder is the highest index -> still keeps it',
  F.combResolveHolder([6, 6, 5, 0], 2, 5), 2);
check('sole leader who is NOT player 0 takes it from an unheld card',
  F.combResolveHolder([3, 4, 6, 0], -1, 5), 2);
// The same gap existed on Fiercest Guard — same shape, so the same blind spot.
check('Fiercest: tie where the holder is not the first leader -> keeps it',
  F.combResolveHolder([4, 4, 0, 0], 1, 3), 1);
check('holder drops below the minimum -> nobody holds it',
  F.combResolveHolder([4, 4, 0, 0], 0, 5), -1);
check('a cut that drops the leader hands it to the new sole leader',
  F.combResolveHolder([3, 5, 0, 0], 0, 5), 1);

section('Fiercest Guard — the identical shape, minimum 3');
check('2 Guard Bees is not enough', F.combResolveHolder([2, 1, 0, 0], -1, 3), -1);
check('3 alone takes it',           F.combResolveHolder([3, 1, 0, 0], -1, 3), 0);
check('a tie at 3 gives it to nobody', F.combResolveHolder([3, 3, 0, 0], -1, 3), -1);
check('holder tied -> keeps it',    F.combResolveHolder([3, 3, 0, 0], 0, 3), 0);
check('beaten outright -> transfer', F.combResolveHolder([3, 4, 0, 0], 0, 3), 1);

section('combRecomputeAchievements — the single resolution point');
reset();
chainOf(5, 0);
F.combRecomputeAchievements();
check('a 5-chain claims Largest Comb', G.largest, 0);
check('chain lengths cached', G.chainLen[0], 5);
G.guards = [3, 0, 0, 0];
F.combRecomputeAchievements();
check('3 Guard Bees claims Fiercest Guard', G.fiercest, 0);
// A cut recomputes BOTH, and can strip the card.
const cutNode = T.nodesOfEdge[T.edgesOfNode[T.nodesOfEdge[0][0]][0]][1];
reset();
const c6 = chainOf(6, 0);
F.combRecomputeAchievements();
check('a 6-chain holds it', G.largest, 0);
G.nodes[T.nodesOfEdge[c6[2]][1]] = { owner: 1, level: 1 };
F.combRecomputeAchievements();
ok('an opponent\'s cut recomputes the chain', G.chainLen[0] < 6);
ok('…and strips the card if it falls under 5', G.chainLen[0] < 5 ? G.largest === -1 : G.largest === 0);

// ══ 7. Points and the win ═════════════════════════════════════════════════
section('Points — public, true, and the hidden Golden Nectar');
reset();
G.nodes[0] = { owner: 0, level: 1 };
G.nodes[10] = { owner: 0, level: 2 };
check('cell 1 + dome 2 = 3 public', F.combPublicPoints(0), 3);
check('true points equal public with no Golden Nectar', F.combTruePoints(0), 3);
G.instinct[0] = [{ kind: 'golden', boughtTurn: 1, played: false },
                 { kind: 'guard',  boughtTurn: 1, played: false }];
check('Golden Nectar is INVISIBLE in public points', F.combPublicPoints(0), 3);
check('…and counts in true points', F.combTruePoints(0), 4);
check('a Guard Bee is worth nothing', F.combTruePoints(0) - F.combPublicPoints(0), 1);
G.largest = 0;
check('Largest Comb adds 2 to public', F.combPublicPoints(0), 5);
G.fiercest = 0;
check('both achievements add 4', F.combPublicPoints(0), 7);
G.largest = -1; G.fiercest = -1;
check('an unclaimed achievement is worth 0 and is not an error', F.combPublicPoints(0), 3);

section('The win check — own turn only (spec §6, brief §5)');
reset();
G.season = 'short';
G.nodes[0]  = { owner: 0, level: 2 };
G.nodes[10] = { owner: 0, level: 2 };
G.nodes[20] = { owner: 0, level: 2 };
G.largest = 0;                             // 6 + 2 = 8 >= 7
G.turn = 0;
ok('the active player at 8 wins', F.combCheckWin());
G.turn = 1;
ok('the SAME board does not win on someone else\'s turn', !F.combCheckWin());
G.turn = 0; G.largest = -1;                // 6 < 7
ok('6 points does not win at a target of 7', !F.combCheckWin());
G.instinct[0] = [{ kind: 'golden', boughtTurn: 1, played: false }];
ok('a hidden Golden Nectar CAN complete the win', F.combCheckWin());
G.season = 'full';
ok('…but not at a target of 10', !F.combCheckWin());
G.season = 'short';

// ══ 8. Bank rates ═════════════════════════════════════════════════════════
section('Trade Blossoms — the Meadow\'s rate');
reset();
check('4:1 with no port reached', F.combBankRate(0, 0), 4);
const generic = T.ports.find(p => p.kind === 'any');
G.nodes[generic.nodes[0]] = { owner: 0, level: 1 };
check('3:1 on a generic Blossom', F.combBankRate(0, 0), 3);
check('…for every resource', F.combBankRate(0, 3), 3);
check('an opponent gets no benefit', F.combBankRate(1, 0), 4);
reset();
const resinPort = T.ports.find(p => p.kind === 'resin');
G.nodes[resinPort.nodes[1]] = { owner: 0, level: 2 };
check('2:1 on the Resin Blossom, for Resin', F.combBankRate(0, 0), 2);
check('…but still 4:1 for everything else', F.combBankRate(0, 1), 4);
ok('a Queen Dome reaches a port just as a cell does', F.combBankRate(0, 0) === 2);

// ══ 9. Trade re-validation ════════════════════════════════════════════════
section('Trade — re-validate at execution, never escrow (brief §14c)');
reset();
G.hands[0] = [2, 0, 0, 0, 0];
G.hands[1] = [0, 2, 0, 0, 0];
const offer = { from: 0, to: 1, give: [2, 0, 0, 0, 0], want: [0, 2, 0, 0, 0] };
ok('a deal both sides can afford is valid', F.combTradeStillValid(offer, 1));
G.hands[0] = [1, 0, 0, 0, 0];
ok('…and goes stale the moment the poster spends', !F.combTradeStillValid(offer, 1));
G.hands[0] = [2, 0, 0, 0, 0]; G.hands[1] = [0, 1, 0, 0, 0];
ok('…or the moment the partner spends', !F.combTradeStillValid(offer, 1));
ok('a null offer is never valid', !F.combTradeStillValid(null, 1));

// ══ 10. Legal-target enumeration ══════════════════════════════════════════
section('Legal targets — what placement mode lights up');
reset();
check('every node is a legal FIRST draft cell', F.combLegalTargetsFor('cell', 0, { draft: true }).length, 54);
G.nodes[0] = { owner: 0, level: 1 };
const after = F.combLegalTargetsFor('cell', 0, { draft: true }).length;
check('one cell removes itself plus its neighbours',
  after, 54 - 1 - T.neighboursOfNode[0].length);
check('no legal cells at all outside the draft with nothing connected',
  F.combLegalTargetsFor('cell', 1, {}).length, 0);
reset();
G.nodes[ea] = { owner: 0, level: 1 };
ok('a lone cell lights up its own incident edges',
  F.combLegalTargetsFor('wall', 0, {}).length === T.edgesOfNode[ea].length);
check('the Wasp may go to any hex but its own', F.combLegalTargetsFor('wasp', 0, {}).length, 18);

// ══ 11. The rules layer broadcasts nothing ════════════════════════════════
section('Silence — mpSendEnvelope/mpSendPrivate would THROW if called');
reset();
G.hands[0] = [5, 5, 5, 5, 5];
G.nodes[ea] = { owner: 0, level: 1 };
let threw = null;
try {
  F.combApplyPlace('wall', e0, 0, {});
  F.combSetHand(0, [1, 1, 1, 1, 1]);
  F.combSetInstinct(0, [{ kind: 'guard', boughtTurn: 1, played: false }]);
  F.combRecomputeAchievements();
} catch (e) { threw = e.message; }
check('a full placement + both private writers broadcast nothing in single mode', threw, null);

// ══ 12. The Season presets The Wasp and The Overflow (spec §5) ═══════════
// A PLAIN preset — nothing dims, no amber reason line. Tapping The Season
// sets both partner variables; tapping either partner directly must NOT
// touch The Season. This is the rule half of the trap spec §19 names — the
// repaint-both-cards half is presentation and belongs to visual-check, not
// here.
section('The Season presets The Wasp and The Overflow');
G.season = 'short'; G.waspSetting = 'blocks'; G.overflowSetting = 'off';
F.combApplySeasonPreset('full');
check('Full Season sets The Season', G.season, 'full');
check('…and presets The Wasp to Blocks and Steals', G.waspSetting, 'steals');
check('…and presets The Overflow to Snug', G.overflowSetting, 'snug');
F.combApplySeasonPreset('short');
check('Short Summer sets The Season back', G.season, 'short');
check('…and presets The Wasp back to Blocks Only', G.waspSetting, 'blocks');
check('…and presets The Overflow back to Off', G.overflowSetting, 'off');

console.log('\n' + '='.repeat(70));
if (failures) { console.log(`${failures} of ${checks} CHECKS FAILED`); process.exit(1); }
console.log(`ALL ${checks} CHECKS PASSED`);
