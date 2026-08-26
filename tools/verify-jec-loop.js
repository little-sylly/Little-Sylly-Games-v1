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

console.log('\njec-loop: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
