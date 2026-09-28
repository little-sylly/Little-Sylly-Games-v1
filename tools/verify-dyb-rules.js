// ═══════════════════════════════════════════════════════════════════════════
// verify-dyb-rules.js — The Bluff's pure rules: legal raises, counting, what a
// player can vouch for, the bid draft, the stage fit, the table model and the
// reveal plan.
//
//   node tools/verify-dyb-rules.js        (exits 1 on any failure)
//
// Runs the REAL js/games/dyb.js (and dyb-dice.js once it exists) in a vm
// sandbox. Every function under test takes arguments — nothing here needs a DOM.
// DYB_SRC= points the harness at a deliberately-broken copy of dyb.js.
// ═══════════════════════════════════════════════════════════════════════════
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');
const ROOT = path.join(__dirname, '..');

const elStub = new Proxy(function () {}, {
  get(_t, k) { return k === Symbol.toPrimitive ? () => '' : elStub; },
  set() { return true; },
  apply() { return elStub; },
});
const sandbox = {
  console,
  document: {
    addEventListener() {}, getElementById: () => elStub, querySelector: () => elStub,
    querySelectorAll: () => [], createElement: () => elStub, body: elStub,
  },
  window: {},
  setTimeout: () => 0, clearTimeout() {}, requestAnimationFrame: () => 0, cancelAnimationFrame() {},
  mpMyPlayerIdx: 0, mpPlayerSlots: [],
  mpSendEnvelope() { throw new Error('the rules harness must never send a packet'); },
  mpLockSync() {}, mpUnlockSync() {},
  showScreen() {}, shuffle: a => a.slice(), bindCardHold() {}, refHighlightRow() {},
  assetDiceSet: () => null,
};
['playDone', 'playPillClick', 'playBoing', 'playLaunch', 'playExit', 'playWhoosh', 'playTick',
 'playSuccess', 'playSyllyOn', 'playSyllyOff', 'playSliderTick', 'openSoundOverlay', 'resetToLobby',
 'mpReturnToLobby', 'mpShowModeScreen', 'mpNotifyPlayerLeft'].forEach(n => { sandbox[n] = () => {}; });
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

function load(rel) {
  vm.runInContext(fs.readFileSync(path.isAbsolute(rel) ? rel : path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
}
const DICE = path.join(ROOT, 'js/games/dyb-dice.js');
if (fs.existsSync(DICE)) load(DICE);                     // joins in Task 4
load(process.env.DYB_SRC || 'js/games/dyb.js');
const run = src => vm.runInContext(src, sandbox);
const S = sandbox;

let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}` +
    (ok ? '' : `\n          expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`));
}
const section = t => console.log(`\n${t}`);
const R = (wildcards, onesStripped = false) => ({ wildcards, onesStripped });
const C = (qty, face) => ({ qty, face });
const F = [1, 2, 3, 4, 5, 6];

console.log('The Bluff — pure rules\n' + '='.repeat(40));

section('dybFaceAllowed — which faces may be claimed');
check('Classic bans 1s', F.map(f => S.dybFaceAllowed(f, R('classic'))), [false, true, true, true, true, true]);
check('Strict allows every face', F.map(f => S.dybFaceAllowed(f, R('strict'))), [true, true, true, true, true, true]);
check('Volatile allows every face before 1s are claimed', F.map(f => S.dybFaceAllowed(f, R('volatile'))), [true, true, true, true, true, true]);
check('Volatile after 1s are claimed allows only 1s', F.map(f => S.dybFaceAllowed(f, R('volatile', true))), [true, false, false, false, false, false]);
check('0 and 7 are never faces', [0, 7].map(f => S.dybFaceAllowed(f, R('strict'))), [false, false]);

section('dybMinQty — the lowest legal quantity for a face');
check('no claim → 1 for every face', F.map(f => S.dybMinQty(C(0, 0), f)), [1, 1, 1, 1, 1, 1]);
check('a higher face keeps the quantity', S.dybMinQty(C(5, 4), 5), 5);
check('the same face must go up', S.dybMinQty(C(5, 4), 4), 6);
check('a lower face must go up', S.dybMinQty(C(5, 4), 2), 6);

section('dybLegalRaise');
check('opening: an allowed face at 1', S.dybLegalRaise(C(0, 0), C(1, 2), R('classic')), true);
check('opening: quantity 0 is not a bid', S.dybLegalRaise(C(0, 0), C(0, 3), R('classic')), false);
check('Classic: 1s are never legal', S.dybLegalRaise(C(3, 4), C(9, 1), R('classic')), false);
check('higher quantity, any face', S.dybLegalRaise(C(5, 4), C(6, 2), R('classic')), true);
check('same quantity, higher face', S.dybLegalRaise(C(5, 4), C(5, 6), R('classic')), true);
check('same quantity, same face', S.dybLegalRaise(C(5, 4), C(5, 4), R('classic')), false);
check('same quantity, lower face', S.dybLegalRaise(C(5, 4), C(5, 3), R('classic')), false);
check('lower quantity, higher face', S.dybLegalRaise(C(5, 4), C(4, 6), R('classic')), false);
check('Volatile: claiming 1s is legal', S.dybLegalRaise(C(3, 4), C(4, 1), R('volatile')), true);
check('Volatile stripped: 1s go higher', S.dybLegalRaise(C(4, 1), C(5, 1), R('volatile', true)), true);
check('Volatile stripped: other faces are closed', S.dybLegalRaise(C(4, 1), C(5, 2), R('volatile', true)), false);

section('dybFaceNote — the line under a face tap');
check('Classic 1', S.dybFaceNote(1, R('classic')), run('DYB_FACE_REASON').wildOnes);
check('Volatile 1, before the strip, warns', S.dybFaceNote(1, R('volatile')), run('DYB_FACE_REASON').volatile);
check('Volatile stripped, a 4', S.dybFaceNote(4, R('volatile', true)), run('DYB_FACE_REASON').stripped);
check('an ordinary face says nothing', S.dybFaceNote(4, R('classic')), null);

section('The globals adapters read live state');
run(`dybWildcardsStyle = 'volatile'; dybOnesStripped = true; dybCurrentQty = 5; dybCurrentFace = 1;`);
check('dybRulesNow', S.dybRulesNow(), R('volatile', true));
check('dybClaimNow', S.dybClaimNow(), C(5, 1));
run(`dybWildcardsStyle = 'classic'; dybOnesStripped = false; dybCurrentQty = 0; dybCurrentFace = 0;`);

// ── Counting — dybCountEvents against a frozen copy of the shipped counter ──
// oracleCount is dybComputeRealCount exactly as it shipped before this build,
// rewritten only to take its inputs as arguments. It stays here for good: any
// future change to counting must keep agreeing with it or say why.
function oracleCount(face, t, wildcards, onesStripped) {
  const wildOnes = wildcards !== 'strict' && !onesStripped;
  let total = 0;
  for (let pIdx = 0; pIdx < t.n; pIdx++) {
    const roll = t.rolls[pIdx] || [], types = t.types[pIdx] || [];
    const slicks = t.slicks[pIdx] || [], phantomTypes = t.phantoms[pIdx] || [];
    roll.forEach((val, j) => {
      const type = types[j] || 'standard';
      const matchesFace = val === face || (wildOnes && val === 1 && face !== 1);
      if (type === 'phantom') {
        const secondary = phantomTypes[j] || null;
        if (!secondary) { if (matchesFace) total += 1; }
        else if (secondary === 'cracked') { /* 0 */ }
        else if (secondary === 'loaded') { if (matchesFace) total += 2; }
        else if (secondary === 'snake') { if (matchesFace) total -= 1; }
        else if (secondary === 'slick') { const locked = slicks[j] !== undefined ? slicks[j] : -1; if (locked === face) total += 1; }
        return;
      }
      if (type === 'cracked') return;
      if (type === 'slick') { const a = slicks[j] !== undefined ? slicks[j] : -1; if (a === face) total += 1; return; }
      if (type === 'snake') { if (matchesFace) total -= 1; return; }
      if (type === 'loaded') { if (matchesFace) total += 2; return; }
      if (matchesFace) total += 1;
    });
  }
  return total;
}
function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
const TYPES = ['standard', 'standard', 'standard', 'loaded', 'phantom', 'slick', 'cracked', 'snake'];
const SECOND = [null, null, 'loaded', 'slick', 'cracked', 'snake'];
function randomTable(r) {
  const n = 3 + Math.floor(r() * 6);
  const t = { n, rolls: [], types: [], slicks: [], phantoms: [] };
  for (let p = 0; p < n; p++) {
    if (r() < 0.12) continue;                            // an eliminated seat: a hole, as on the wire
    const k = 1 + Math.floor(r() * 5);
    t.rolls[p] = []; t.types[p] = []; t.slicks[p] = []; t.phantoms[p] = [];
    for (let d = 0; d < k; d++) {
      const v = 1 + Math.floor(r() * 6), ty = TYPES[Math.floor(r() * TYPES.length)];
      const sec = ty === 'phantom' ? SECOND[Math.floor(r() * SECOND.length)] : null;
      t.rolls[p].push(v); t.types[p].push(ty); t.phantoms[p].push(sec);
      t.slicks[p].push(ty === 'slick' || sec === 'slick' ? 1 + Math.floor(r() * 6) : -1);
    }
  }
  return t;
}
// What the wire does to a holey array: an index-keyed object.
const toObj = a => { const o = {}; a.forEach((v, i) => { if (v !== undefined) o[i] = v; }); return o; };

section('dybCountEvents — sums equal the shipped counter on 400 seeded tables');
{
  let mismatches = 0, objMismatches = 0, orderBreaks = 0;
  for (let seed = 1; seed <= 400; seed++) {
    const t = randomTable(rng(seed));
    const tObj = { n: t.n, rolls: toObj(t.rolls), types: toObj(t.types), slicks: toObj(t.slicks), phantoms: toObj(t.phantoms) };
    for (const w of ['strict', 'classic', 'volatile']) for (const st of [false, true]) for (const face of F) {
      const rules = R(w, st);
      const evs = S.dybCountEvents(face, t, rules);
      if (S.dybCountSum(evs) !== oracleCount(face, t, w, st)) mismatches++;
      if (S.dybCountSum(S.dybCountEvents(face, tObj, rules)) !== oracleCount(face, t, w, st)) objMismatches++;
      const signs = evs.map(e => Math.sign(e.delta));
      for (let i = 1; i < signs.length; i++) if (signs[i] > signs[i - 1]) { orderBreaks++; break; }
    }
  }
  check('sum of events === shipped count (every seed × style × strip × face)', mismatches, 0);
  check('…and identical when the hands arrive as index-keyed objects', objMismatches, 0);
  check('events are ordered: positives, then zeros, then negatives', orderBreaks, 0);
}
check('a Loaded die is ONE event worth +2', S.dybCountEvents(4,
  { n: 1, rolls: [[4]], types: [['loaded']], slicks: [[-1]], phantoms: [[null]] }, R('strict')), [{ pIdx: 0, dieIdx: 0, delta: 2 }]);
check('a Cracked die that matches is a 0 event (it shudders)', S.dybCountEvents(4,
  { n: 1, rolls: [[4]], types: [['cracked']], slicks: [[-1]], phantoms: [[null]] }, R('strict')), [{ pIdx: 0, dieIdx: 0, delta: 0 }]);
check('a Cracked die that does not match is no event', S.dybCountEvents(4,
  { n: 1, rolls: [[2]], types: [['cracked']], slicks: [[-1]], phantoms: [[null]] }, R('strict')), []);

section('dybComputeRealCount now reads through dybCountEvents');
run(`dybPlayerCount = 2; dybWildcardsStyle = 'classic'; dybOnesStripped = false;
     dybAllRolls = [[4, 1, 6], [4, 4]]; dybAllSpecialTypes = [['standard', 'standard', 'snake'], ['loaded', 'standard']];
     dybAllSlickFaces = [[-1, -1, -1], [-1, -1]]; dybAllPhantomTypes = [[null, null, null], [null, null]];`);
check('live count of 4s: 4 + wild 1 + loaded 4 (+2) + 4 = 5', S.dybComputeRealCount(4), 5);
check('dybGetCountingDice lists a Loaded die twice', S.dybGetCountingDice(4).length, 5);

// ── Later tasks append their sections above this line ──────────────────────

console.log(`\n${failures ? `${failures} FAILED` : 'ALL PASS'}`);
process.exit(failures ? 1 : 0);
