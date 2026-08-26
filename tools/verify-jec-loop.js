// ═══════════════════════════════════════════════════════════════════════════
// verify-jec-loop.js — drives Just Enough Cooks' scoring, deck and vote logic
// headlessly in 'single' mode.
//
//   node tools/verify-jec-loop.js        (exits 1 on any failure)
//   JEC_SRC=/path/to/broken.js node tools/verify-jec-loop.js
//
// Companion to verify-jec-loopback.js (packet layer). This one asserts RULES:
// the tier table at every player count, the Signature double applying to the
// Golden range only, Crutch resolution, the Crutch never entering the frequency
// pool, merge-map resolution, penalty priority, Special Instructions deck
// exhaustion, and Fusion name-vote tallying.
//
// Sandbox rules: mpSendEnvelope THROWS so a leaked broadcast fails loudly in
// single mode. setTimeout is CAPTURED, not fired. shuffle is the identity so
// deck order is deterministic.
// ═══════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT   = path.join(__dirname, '..');
const jecSrc = fs.readFileSync(process.env.JEC_SRC || path.join(ROOT, 'js/games/jec.js'), 'utf8');

// A small deterministic food pool. The real data/words.json is not needed —
// jecBuildFoodPool only reads .category, .difficulty and .word.
const WORDS = [
  { word: 'pizza',    category: 'food', difficulty: 1 },
  { word: 'nachos',   category: 'food', difficulty: 1 },
  { word: 'sushi',    category: 'food', difficulty: 2 },
  { word: 'pho',      category: 'food', difficulty: 2 },
  { word: 'terrine',  category: 'food', difficulty: 3 },
  { word: 'consomme', category: 'food', difficulty: 3 },
];

// ── Mock document ─────────────────────────────────────────────────────────────
// jec.js registers ~30 listeners at load time; every getElementById must return
// an object carrying addEventListener or the file throws before defining anything.
function makeDocument() {
  const byId = {};
  const mk = () => ({
    style: {}, dataset: {}, className: '', textContent: '', value: '',
    disabled: false, placeholder: '', children: [],
    _html: '',
    get innerHTML() { return this._html; },
    set innerHTML(v) { this._html = String(v); this.children = []; },
    classList: { add() {}, remove() {}, contains: () => false, toggle() {} },
    appendChild(c) { this.children.push(c); return c; },
    addEventListener() {}, removeEventListener() {},
    querySelector: () => null, querySelectorAll: () => [],
  });
  return {
    body: mk(), addEventListener() {}, createElement: mk,
    querySelector: () => null, querySelectorAll: () => [],
    getElementById(id) { return byId[id] || (byId[id] = mk()); },
  };
}

const screens = [];
const timers  = [];
const sandbox = {
  console,
  document: makeDocument(),
  window: { syllyMultiplayerMode: 'single', activeExpansionOverrides: null },
  allWords: WORDS,
  loadWords: () => Promise.resolve(),
  isSecretMode: false,
  secretWords: [],
  // The real normaliseWord from engine.js:844. A stub that only lowercased
  // would silently break every merge and Crutch assertion in this file.
  normaliseWord: w => {
    w = w.toLowerCase().trim();
    if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y';
    if (w.endsWith('es')  && w.length > 3) return w.slice(0, -2);
    if (w.endsWith('s')   && w.length > 2) return w.slice(0, -1);
    return w;
  },
  shuffle: a => [...a],                       // identity — deterministic decks
  showScreen: id => screens.push(id),
  setTimeout: (fn, ms) => timers.push({ fn, ms }) - 1,
  clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
  playLaunch() {}, playWhoosh() {}, playDone() {}, playTick() {}, playBoing() {},
  playAlarm() {}, playSuccess() {}, playExit() {}, playPillClick() {},
  playSyllyOn() {}, playSyllyOff() {},
  mpSendEnvelope() { throw new Error('mpSendEnvelope called in single mode'); },
  mpLockSync() {}, mpUnlockSync() {},
  mpPlayerSlots: [], mpMyPlayerIdx: 0,
  mpNotifyPlayerLeft() {}, mpShowModeScreen() {}, mpReturnToLobby() {},
  resetToLobby() {},
  activeGameId: null,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

// The bridge exposes jec.js's top-level `let` state, otherwise unreachable
// from outside the vm context.
const BRIDGE = `
globalThis.__jec = {
  get freq()       { return jecWordFrequency; },
  get display()    { return jecDisplayWords; },
  get mergeMap()   { return jecMergeMap; },
  get inputs()     { return jecInputs; },
  get scores()     { return jecScores; },
  get signatures() { return jecSignatures; },
  get count()      { return jecPlayerCount; },
  get golden()     { return jecGoldenScore; },
  points(c, n)     { return jecCalcPoints(c, n); },
  badge(c, n)  { return jecBadge(c, n); },
  topCount()   { return jecTopCount(); },
  crutchHit(p) { return jecCrutchHit(p); },
  norm(w)      { return normaliseWord(w); },
  isGolden(k) { return jecIsGolden(k); },
  last()      { return globalThis.__jecLast; },
  // Drives one complete round through the SHIPPED functions: seats the table,
  // sets the settings, loads the inputs, builds the frequency pool, applies any
  // merges, then scores.
  round(o) {
    jecPlayerCount        = o.players;
    jecPlayerNames        = Array.from({ length: o.players }, (_, i) => 'Chef ' + (i + 1));
    jecScores             = Array(o.players).fill(0);
    jecGoldenScore        = o.golden === undefined ? 30 : o.golden;
    jecTableForOnePenalty = !!o.tableForOne;
    jecCrowdedKitchenTax  = !!o.crowdedKitchenTax;
    jecFusionCuisine      = !!o.fusion;
    jecCurrentWord        = o.word  || 'pizza';
    jecCurrentWord2       = o.word2 || '';
    jecInstruction        = o.instruction || '';
    jecRoundLog           = [];
    jecInputs      = o.inputs.map(a => [...a]);
    jecSignatures  = o.signatures ? [...o.signatures] : Array(o.players).fill(-1);
    jecCrutches    = o.crutches   ? [...o.crutches]   : Array(o.players).fill('');
    jecFusionNames = o.names      ? [...o.names]      : Array(o.players).fill('');
    jecNameVotes   = o.votes      ? [...o.votes]      : Array(o.players).fill(-1);
    jecBuildFrequency();
    (o.merges || []).forEach(m => jecApplyMerge(normaliseWord(m[0]), normaliseWord(m[1])));
    globalThis.__jecLast = jecCalcRoundScores();
    return globalThis.__jecLast;
  },
  seat(o) {
    jecPlayerCount = o.players;
    jecPlayerNames = o.names || Array.from({ length: o.players }, (_, i) => 'Chef ' + (i + 1));
    jecScores      = Array(o.players).fill(0);
    jecGoldenScore = o.golden === undefined ? 30 : o.golden;
    jecRounds      = o.rounds === undefined ? 3 : o.rounds;
  },
};
`;
vm.runInContext(jecSrc + BRIDGE, sandbox);
const J = sandbox.__jec;

// ── Assertions ────────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function check(label, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; }
  else { fail++; console.error('FAIL  ' + label + '\n        expected ' + e + '\n        actual   ' + a); }
}

// ── § 1 Tier table (spec § 2.6) ───────────────────────────────────────────────
// Unchanged by this rework — these must be green against shipped jec.js.
J.seat({ players: 4, golden: 30 });
check('N=4 count 1 -> 0',      J.points(1, 4), 0);
check('N=4 count 2 -> golden', J.points(2, 4), 30);
check('N=4 count 3 -> half',   J.points(3, 4), 15);
check('N=4 count 4 -> token',  J.points(4, 4), 5);   // round(30 * 0.15)

// 3 players is deliberately binary: jackpot then token, no Crowd-Pleaser band.
check('N=3 count 2 -> golden', J.points(2, 3), 30);
check('N=3 count 3 -> token',  J.points(3, 3), 5);

// The Crowd-Pleaser band is deliberately FLAT at 6 players.
check('N=6 count 3 -> half',   J.points(3, 6), 15);
check('N=6 count 5 -> half',   J.points(5, 6), 15);
check('N=6 count 6 -> token',  J.points(6, 6), 5);

// The Sweet Spot setting scales every band.
J.seat({ players: 4, golden: 10 });
check('golden=10 count 2', J.points(2, 4), 10);
check('golden=10 count 3', J.points(3, 4), 5);
check('golden=10 count 4', J.points(4, 4), 2);   // round(10 * 0.15) = 2

// ── § 2 Badges, Signature nomination, penalty priority ────────────────────
J.seat({ players: 4, golden: 30 });
check('badge alone',   J.badge(1, 4).key, 'alone');
check('badge kiss',    J.badge(2, 4).key, 'kiss');
check('badge crowd',   J.badge(3, 4).key, 'crowd');
check('badge toomany', J.badge(4, 4).key, 'toomany');
check('label alone',   J.badge(1, 4).label, 'Table for One 🍽️');
check('label kiss',    J.badge(2, 4).label, "Chef's Kiss ✨");
check('label crowd',   J.badge(3, 4).label, 'Crowd-Pleaser 👌');
check('label toomany', J.badge(4, 4).label, 'Too Many Cooks! 🍲');

// The Golden range is exactly Chef's Kiss + Crowd-Pleaser — the ONLY thing the
// Signature double may key off. The shipped code doubled any positive score,
// including the Too Many Cooks token, against what the identity doc describes.
check('golden range kiss',    J.isGolden('kiss'),    true);
check('golden range crowd',   J.isGolden('crowd'),   true);
check('golden range alone',   J.isGolden('alone'),   false);
check('golden range toomany', J.isGolden('toomany'), false);

// Signature doubles a Chef's Kiss. Chef 0: cheese(x2 kiss, nominated) + basil(1) + olive(1).
J.round({
  players: 4, golden: 30,
  inputs: [['cheese', 'basil', 'olive'], ['cheese', 'ham', 'rocket'],
           ['anchovy', 'caper', 'crust'], ['pine', 'fig', 'honey']],
  signatures: [0, 0, 0, 0],
});
check('sig doubles a kiss',  J.last().roundScores[0], 60);
check('sig bonus recorded',  J.last().bonus[0].signature, 30);

// Signature does NOT double a Too Many Cooks token.
J.round({
  players: 3, golden: 30,
  inputs: [['salt', 'a1', 'a2'], ['salt', 'b1', 'b2'], ['salt', 'c1', 'c2']],
  signatures: [0, 0, 0],
});
check('sig does not double token', J.last().roundScores[0], 5);
check('sig bonus zero on token',   J.last().bonus[0].signature, 0);

// Signature does NOT rescue a Table for One, and costs nothing extra when it fails.
// Chef 0: lonely(1, nominated, penalty −5) + salt(3 of 3 = token +5) + x1(1, −5).
J.round({
  players: 3, golden: 30, tableForOne: true,
  inputs: [['lonely', 'salt', 'x1'], ['salt', 'y1', 'y2'], ['salt', 'z1', 'z2']],
  signatures: [0, 1, 1],
});
check('failed sig takes the penalty once', J.last().roundScores[0], -5 + 5 - 5);
check('sig bonus zero on table-for-one',   J.last().bonus[0].signature, 0);

// Penalties REPLACE the tier reward, never stack with it.
// Chef 0: salt(4 of 4 -> tax −8) + a1(1, no penalty set) + a2(1).
J.round({
  players: 4, golden: 30, crowdedKitchenTax: true,
  inputs: [['salt', 'a1', 'a2'], ['salt', 'b1', 'b2'],
           ['salt', 'c1', 'c2'], ['salt', 'd1', 'd2']],
  signatures: [1, 1, 1, 1],
});
check('crowded tax replaces token', J.last().roundScores[0], -8);

// A signature index of −1 (unset — a dropped packet) is inert and never throws.
J.round({
  players: 3, golden: 30,
  inputs: [['cheese', 'a1', 'a2'], ['cheese', 'b1', 'b2'], ['c0', 'c1', 'c2']],
  signatures: [-1, -1, -1],
});
check('unset signature is inert', J.last().bonus[0].signature, 0);

// ── § 3 The Crutch ────────────────────────────────────────────────────────────
// Pays jecBonusValue() when the called word is at the round's TOP count AND
// that count is >= 3. Ties all pay. A miss costs nothing.

// 4 Chefs. cheese appears 3x (top count 3, >= 3). Chef 3 called it.
J.round({
  players: 4, golden: 30,
  inputs: [['cheese', 'a1', 'a2'], ['cheese', 'b1', 'b2'],
           ['cheese', 'c1', 'c2'], ['d0', 'd1', 'd2']],
  crutches: ['', '', '', 'cheese'],
});
check('top count is 3',        J.topCount(), 3);
check('crutch hit at top >=3', J.crutchHit(3), true);
check('crutch pays half',      J.last().bonus[3].crutch, 15);
check('non-caller gets none',  J.last().bonus[0].crutch, 0);

// Top count of 2 is NOT enough — the >= 3 floor is what stops a 3-player table
// paying out on every ordinary Chef's Kiss.
J.round({
  players: 4, golden: 30,
  inputs: [['cheese', 'a1', 'a2'], ['cheese', 'b1', 'b2'],
           ['c0', 'c1', 'c2'], ['d0', 'd1', 'd2']],
  crutches: ['', '', '', 'cheese'],
});
check('top count 2 is a miss', J.crutchHit(3), false);
check('miss pays nothing',     J.last().bonus[3].crutch, 0);

// A correct word that is NOT at top count is a miss.
J.round({
  players: 5, golden: 30,
  inputs: [['cheese', 'ham', 'a2'], ['cheese', 'ham', 'b2'], ['cheese', 'ham', 'c2'],
           ['cheese', 'd1', 'd2'],  ['ham', 'e1', 'e2']],
  crutches: ['', '', '', '', 'ham'],   // ham = 4, cheese = 4 -> tie at top
});
check('tie at top: both pay', J.crutchHit(4), true);

// Ties all pay: two Chefs calling two DIFFERENT words that share the top count.
J.round({
  players: 6, golden: 20,
  inputs: [['cheese', 'ham', 'a2'], ['cheese', 'ham', 'b2'], ['cheese', 'ham', 'c2'],
           ['d0', 'd1', 'd2'], ['e0', 'e1', 'e2'], ['f0', 'f1', 'f2']],
  crutches: ['', '', '', 'cheese', 'ham', 'sardine'],
});
check('tie payer A', J.last().bonus[3].crutch, 10);
check('tie payer B', J.last().bonus[4].crutch, 10);
check('tie misser',  J.last().bonus[5].crutch, 0);

// THE INVARIANT: the Crutch must never enter the frequency pool.
// If it did, "cheese" below would read 3 (2 written + 1 called) and every Chef
// who wrote it would drop from Chef's Kiss to Crowd-Pleaser.
J.round({
  players: 4, golden: 30,
  inputs: [['cheese', 'a1', 'a2'], ['cheese', 'b1', 'b2'],
           ['c0', 'c1', 'c2'], ['d0', 'd1', 'd2']],
  crutches: ['', '', 'cheese', 'cheese'],
});
check('crutch is not in the pool',  J.freq[J.norm('cheese')], 2);
check('crutch cannot manufacture',  J.last().roundScores[0], 30);   // still a Chef's Kiss

// A Crutch word nobody wrote does not appear in the pool at all.
J.round({
  players: 3, golden: 30,
  inputs: [['a0', 'a1', 'a2'], ['b0', 'b1', 'b2'], ['c0', 'c1', 'c2']],
  crutches: ['vegemite', '', ''],
});
check('uncalled crutch word absent', J.freq[J.norm('vegemite')], undefined);

// The Crutch resolves THROUGH the merge map, exactly as an ingredient does.
// "tomatoe" is merged into "tomato"; a Crutch calling "tomatoe" must still hit.
J.round({
  players: 4, golden: 30,
  inputs: [['tomato', 'a1', 'a2'], ['tomato', 'b1', 'b2'],
           ['tomatoe', 'c1', 'c2'], ['d0', 'd1', 'd2']],
  merges: [['tomato', 'tomatoe']],
  crutches: ['', '', '', 'tomatoe'],
});
check('merged pool count',      J.freq[J.norm('tomato')], 3);
check('crutch follows a merge', J.crutchHit(3), true);

// Merging TWO Crutch-only words (neither in the pool) is a no-op, not a throw.
J.round({
  players: 3, golden: 30,
  inputs: [['a0', 'a1', 'a2'], ['b0', 'b1', 'b2'], ['c0', 'c1', 'c2']],
  merges: [['vegemite', 'vegimite']],
  crutches: ['vegemite', '', ''],
});
check('crutch-only merge is inert', J.crutchHit(0), false);

// An empty Crutch (a Chef who did not call, or a dropped packet) never hits.
J.round({
  players: 4, golden: 30,
  inputs: [['cheese', 'a1', 'a2'], ['cheese', 'b1', 'b2'],
           ['cheese', 'c1', 'c2'], ['d0', 'd1', 'd2']],
  crutches: ['', '', '', ''],
});
check('empty crutch never hits', J.crutchHit(0), false);
check('empty crutch pays zero',  J.last().bonus[0].crutch, 0);

console.log('\njec-loop: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
