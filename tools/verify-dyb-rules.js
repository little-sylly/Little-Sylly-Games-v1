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

// ── Later tasks append their sections above this line ──────────────────────

console.log(`\n${failures ? `${failures} FAILED` : 'ALL PASS'}`);
process.exit(failures ? 1 : 0);
