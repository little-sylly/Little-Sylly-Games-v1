// ═══════════════════════════════════════════════════════════════════════════
// verify-dyb-practice.js — The Bluff's Practice tab: the script, both branches
// at the decision, the climb gate, and isolation from the live game.
//
//   node tools/verify-dyb-practice.js        (exits 1 on any failure)
// ═══════════════════════════════════════════════════════════════════════════
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const elStub = new Proxy(function () {}, {
  get(_t, k) { return k === Symbol.toPrimitive ? () => '' : elStub; }, set() { return true; }, apply() { return elStub; },
});
let sends = 0;
const sandbox = {
  console,
  document: { addEventListener() {}, getElementById: () => elStub, querySelector: () => elStub,
              querySelectorAll: () => [], createElement: () => elStub, body: elStub },
  window: {}, setTimeout: () => 0, clearTimeout() {}, requestAnimationFrame: () => 0,
  mpMyPlayerIdx: 0, mpPlayerSlots: [],
  mpSendEnvelope() { sends++; }, mpLockSync() {}, mpUnlockSync() {},
  showScreen() {}, shuffle: a => a.slice(), bindCardHold() {}, refHighlightRow() {}, assetDiceSet: () => null,
};
['playDone', 'playPillClick', 'playBoing', 'playLaunch', 'playExit', 'playWhoosh', 'playTick', 'playSuccess',
 'playSyllyOn', 'playSyllyOff', 'playSliderTick', 'openSoundOverlay', 'resetToLobby', 'mpReturnToLobby',
 'mpShowModeScreen'].forEach(n => { sandbox[n] = () => {}; });
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
['js/games/dyb-dice.js', process.env.DYB_SRC || 'js/games/dyb.js']
  .forEach(rel => vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel }));
const S = sandbox, run = src => vm.runInContext(src, sandbox);

let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}` + (ok ? '' : `\n          expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`));
}
const section = t => console.log(`\n${t}`);
const drive = (s, evs) => evs.reduce((acc, e) => S.dybPracticeReduce(acc, e), s);

console.log('The Bluff — Practice\n' + '='.repeat(40));

section('The script is honest');
const P = run('DYB_PRACTICE');
check('the cast is the suite Practice cast', P.names.slice(1), ['Sylvia', 'Sam']);
{
  const hands = S.dybPracticeHands();
  check('the table holds five 3s (you 3 incl. a wild 1, Sylvia 1, Sam a wild 1)',
        S.dybCountSum(S.dybCountEvents(3, hands, P.rules)), 5);
  check('your cup reads as three 3s', S.dybYouHold({ roll: P.hands[0], types: [], slicks: [] }, 3, P.rules).total, 3);
  check('seven steps', run('DYB_PR_STEPS').length, 7);
  check('every step has a coach line', run('DYB_PR_STEPS').every(k => typeof S.dybPracticeCoach({ step: k, watch: 0, branch: 'call' }) === 'string'), true);
}

section('Walking the script');
let s = S.dybPracticeInit();
check('starts on the shake', s.step, 'shake');
check('the shake ignores anything but the throw', S.dybPracticeReduce(s, { type: 'next' }).step, 'shake');
s = drive(s, [{ type: 'thrown' }, { type: 'next' }]);
check('read → open, with an opening draft', [s.step, s.draft.face, s.draft.qty], ['open', 2, 1]);
check('Climb is locked on anything but three 3s', S.dybPracticeClimbAllowed(s), false);
check('…so climbing does nothing', S.dybPracticeReduce(s, { type: 'climb' }).step, 'open');
s = drive(s, [{ type: 'face', face: 3 }, { type: 'inc' }, { type: 'inc' }]);
check('three 3s unlocks the climb', [s.draft.qty, s.draft.face, S.dybPracticeClimbAllowed(s)], [3, 3, true]);
s = drive(s, [{ type: 'climb' }]);
check('the claim is yours and the others take their turns', [s.step, s.claim.qty, s.claim.by], ['watch', 3, 0]);
s = drive(s, [{ type: 'tick' }]);
check('Sylvia claims four 3s', [s.claim.by, s.claim.qty, s.claim.face], [1, 4, 3]);
s = drive(s, [{ type: 'tick' }]);
check('Sam claims seven 3s and it is your call', [s.step, s.claim.by, s.claim.qty], ['decide', 2, 7]);
check('your draft facing it is eight 3s', [s.draft.qty, s.draft.face], [8, 3]);
const atDecide = s;

section('Branch 1 — Call the Bluff');
{
  const c = drive(atDecide, [{ type: 'call' }]);
  const o = S.dybPracticeOutcome(c);
  check('the reveal: five against seven, Sam loses', [c.step, o.real, o.claimed, o.loser], ['reveal', 5, 7, 2]);
  check('…then done', drive(c, [{ type: 'revealed' }]).step, 'done');
}

section('Branch 2 — climb, and every legal climb loses');
{
  let wins = 0, tried = 0;
  for (let qty = 7; qty <= 15; qty++) for (let face = 2; face <= 6; face++) {
    const bid = { qty, face };
    if (!S.dybLegalRaise({ qty: 7, face: 3 }, bid, P.rules)) continue;
    const c = drive({ ...atDecide, draft: { ...bid, notice: null } }, [{ type: 'climb' }]);
    if (c.step !== 'reveal' || c.branch !== 'climb') { wins += 1000; continue; }
    tried++;
    if (S.dybPracticeOutcome(c).loser !== 0) wins++;
  }
  check(`all ${tried} legal climbs are called by Sylvia and you fall`, wins, 0);
}

section('The model is the table model');
{
  const m = S.dybPracticeModel(atDecide);
  check('three climbers, you first', m.players.map(p => p.label), ['You', 'Sylvia', 'Sam']);
  check('fifteen dice on the table', m.tableTotal, 15);
  check('it is your turn with a legal climb ready', [m.isMyTurn, m.climbEnabled], [true, true]);
}

section('Isolation from the live game');
run(`dybCurrentQty = 4; dybCurrentFace = 5; dybAllegationHistory = [{ playerIdx: 1, qty: 4, face: 5 }]; dybMyRoll = [6, 6, 2];`);
drive(S.dybPracticeInit(), [{ type: 'thrown' }, { type: 'next' }, { type: 'face', face: 3 }, { type: 'inc' }, { type: 'inc' },
                            { type: 'climb' }, { type: 'tick' }, { type: 'tick' }, { type: 'call' }, { type: 'revealed' }]);
check('no packet was sent', sends, 0);
check('live claim, history and hand are untouched', run('[dybCurrentQty, dybCurrentFace, dybAllegationHistory.length, dybMyRoll.join()]'), [4, 5, 1, '6,6,2']);

section('The driver — real renders, its own timers, stops clean (Review Focus 5)');
{
  const byId = {};
  const mk = () => {
    const el = { style: {}, dataset: {}, className: '', textContent: '', innerHTML: '', children: [],
                 addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], firstElementChild: null };
    el.classList = { add() {}, remove() {}, contains: () => false };
    return el;
  };
  S.document.getElementById = id => byId[id] || (byId[id] = mk());
  S.document.querySelectorAll = () => [];
  S.document.querySelector = () => null;
  const pending = new Map(); let seq = 0;
  S.setTimeout = (fn, ms) => { pending.set(++seq, fn); return seq; };
  S.clearTimeout = h => pending.delete(h);
  const fire = () => { let g = 0; while (pending.size && g++ < 200) { const [h, fn] = pending.entries().next().value; pending.delete(h); fn(); } };
  run(`dybAnimTimers.length = 0;`);
  sends = 0;
  S.dybSetHowToTab('practice');
  check('opening the tab starts on the shake', run('dybPr.step'), 'shake');
  S.dybPracticeThrow(); fire();
  check('the throw lands and reading begins', run('dybPr.step'), 'read');
  check('the table rendered through dybRenderTable', byId['dyb-pr-table'].innerHTML.includes('dyb-climbers'), true);
  S.dybPracticeDispatch({ type: 'next' });
  ['face', 'inc', 'inc'].forEach((a, i) => S.dybPracticeAct(a, a === 'face' ? { face: '3' } : {}));
  S.dybPracticeAct('climb', {});
  check('watching: one pending beat', pending.size, 1);
  S.dybPracticeAct('view', { view: 'close' });
  check('a view tap while watching does not queue a second beat', pending.size, 1);
  fire();
  check('the others climbed on their own timers; your call', run('dybPr.step'), 'decide');
  S.dybPracticeAct('call', {});
  check('the reveal is running on the Practice bag', [run('dybPr.step'), run('dybPrTimers.length') > 0], ['reveal', true]);
  check('…and never on the live bag', run('dybAnimTimers.length'), 0);
  S.dybSetHowToTab('rules');                                // tab away mid-reveal
  check('tabbing away stops Practice and clears its timers', [run('dybPr'), run('dybPrTimers.length'), pending.size], [null, 0, 0]);
  check('still no packet sent', sends, 0);
  check('live state still untouched', run('[dybCurrentQty, dybCurrentFace, dybMyRoll.join()]'), [4, 5, '6,6,2']);
}

// ── Task 16 appends the driver section above this line ─────────────────────

console.log(`\n${failures ? `${failures} FAILED` : 'ALL PASS'}`);
process.exit(failures ? 1 : 0);
