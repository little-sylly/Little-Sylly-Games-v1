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
load(DICE);
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

section('dybYouHold — only what the player can see');
const H = (roll, types = [], slicks = []) => ({ roll, types, slicks });
check('Classic: two 3s and a wild 1 hold three 3s', S.dybYouHold(H([3, 3, 1, 5, 2]), 3, R('classic')).total, 3);
check('…the 1 is flagged wild', S.dybYouHold(H([3, 3, 1, 5, 2]), 3, R('classic')).dice.map(d => d.wild), [false, false, true]);
check('Strict: the 1 is just a 1', S.dybYouHold(H([3, 3, 1, 5, 2]), 3, R('strict')).total, 2);
check('Volatile stripped: no wilds', S.dybYouHold(H([3, 3, 1]), 3, R('volatile', true)).total, 2);
check('a claim of 1s: a 1 is not wild for itself', S.dybYouHold(H([1, 1, 4]), 1, R('volatile')).dice.map(d => d.wild), [false, false]);
check('Loaded weighs 2', S.dybYouHold(H([4, 4], ['loaded', 'standard']), 4, R('strict')).total, 3);
check('Cracked and Snake fill nothing', S.dybYouHold(H([4, 4, 4], ['cracked', 'snake', 'standard']), 4, R('strict')).total, 1);
check('a Slick counts toward its shown face', S.dybYouHold(H([2], ['slick'], [5]), 5, R('strict')).total, 1);
check('…and not toward the face it rolled', S.dybYouHold(H([2], ['slick'], [5]), 2, R('strict')).total, 0);
check('a Slick picked later follows the pick (DYB_SLICK_UPDATE)', S.dybYouHold(H([2], ['slick'], [6]), 6, R('classic')).total, 1);
{
  let leaks = 0;
  for (const sec of [null, 'loaded', 'slick', 'cracked', 'snake']) for (const face of F) {
    const seen = new Set();
    for (const v of F) seen.add(JSON.stringify(S.dybYouHold(H([v, 3], ['phantom', 'standard'], [-1, -1]), face, R('classic'))));
    if (seen.size !== 1) leaks++;
  }
  check('a Phantom never counts: its hidden value never changes the result', leaks, 0);
}

section('The bid draft');
{
  const cls = R('classic'), none = C(0, 0);
  check('opening draft: the lowest allowed face at 1 (Classic → 2)', S.dybDraftInit(none, cls), { face: 2, qty: 1, notice: null });
  check('opening draft under Strict starts at 1s', S.dybDraftInit(none, R('strict')).face, 1);
  check('facing a claim: the standing face, one more', S.dybDraftInit(C(5, 4), cls), { face: 4, qty: 6, notice: null });
  const ctx = { claim: C(5, 4), rules: cls, tableTotal: 20 };
  let d = S.dybDraftInit(C(5, 4), cls);
  d = S.dybDraftReduce(d, { type: 'face', face: 6 }, ctx);
  check('tapping a higher face snaps to its minimum (keeps 5)', [d.face, d.qty], [6, 5]);
  d = S.dybDraftReduce(d, { type: 'face', face: 2 }, ctx);
  check('tapping a lower face snaps to one more', [d.face, d.qty], [2, 6]);
  d = S.dybDraftReduce(d, { type: 'dec' }, ctx);
  check('− never goes below the minimum', d.qty, 6);
  d = S.dybDraftReduce(S.dybDraftReduce(d, { type: 'inc' }, ctx), { type: 'inc' }, ctx);
  check('+ climbs', d.qty, 8);
  const blocked = S.dybDraftReduce(d, { type: 'face', face: 1 }, ctx);
  check('a closed face keeps the draft and raises a notice', [blocked.face, blocked.qty, blocked.notice], [2, 8, 1]);
  check('the next action clears the notice', S.dybDraftReduce(blocked, { type: 'inc' }, ctx).notice, null);
  // Review Focus 2 — the claim at the table total
  const full = { claim: C(15, 6), rules: cls, tableTotal: 15 };
  const top = S.dybDraftInit(C(15, 6), cls);
  check('at the table total the draft still initialises (sixteen 6s — legal, impossible)', [top.face, top.qty], [6, 16]);
  check('+ is inert above the table total', S.dybDraftReduce(top, { type: 'inc' }, full).qty, 16);
  check('…and the draft is still a legal raise (legality never reads the table)', S.dybLegalRaise(C(15, 6), top, cls), true);
}

section('dybStageFit — dice sized to the stage');
check('20 dice in a wide stage fit at a comfortable size', S.dybStageFit(20, 231, 132) >= 24, true);
check('40 dice at the SE width (375) still fit', S.dybStageFit(40, 231, 132) >= run('DYB_STAGE_MIN_PX'), true);
check('40 dice at 320 wide do not fit — the caller collapses the ghosts', S.dybStageFit(40, 176, 132), 0);
check('never larger than the maximum', S.dybStageFit(1, 400, 400), run('DYB_STAGE_MAX_PX'));

section('The table model');
run(`dybPlayerCount = 3; dybPlayerNames = ['Ann', 'Bo', 'Cy']; dybSeatNumbers = [3, 1, 2];
     dybDiceInHand = [5, 4, 2]; dybLives = []; dybFootholdsMode = false; dybActivePlayers = [0, 1, 2];
     dybWildcardsStyle = 'classic'; dybOnesStripped = false; dybCurrentQty = 3; dybCurrentFace = 4;
     dybAllegationHistory = [{ playerIdx: 2, qty: 3, face: 4 }]; dybCurrentBidderIdx = 0;
     dybMyRoll = [4, 1, 6, 2, 4]; dybSpecialTypes = ['standard','standard','standard','standard','standard'];
     dybSlickFaces = [-1,-1,-1,-1,-1]; dybSlickAssigned = [false,false,false,false,false];
     dybSyllyMode = false; dybDraft = dybDraftInit(dybClaimNow(), dybRulesNow()); dybStageView = 'whole';`);
S.mpMyPlayerIdx = 0;
{
  const m = S.dybTableModel();
  check('table total is the active players\' dice', m.tableTotal, 11);
  check('tints follow seats', m.players.map(p => p.tint), [2, 0, 1]);
  check('the claim knows who made it', m.claim, { qty: 3, face: 4, by: 2 });
  check('it is my turn and the draft is four 4s', [m.isMyTurn, m.draft.qty, m.draft.face], [true, 4, 4]);
  check('the climb is enabled', m.climbEnabled, true);
  check('my chip is labelled "(you)"', m.players[0].label, 'Ann (you)');
  run('dybCurrentBidderIdx = 1; dybDraft = null;');
  const w = S.dybTableModel();
  check('off-turn: not my turn, no draft, the turn is named', [w.isMyTurn, w.draft, w.turnName], [false, null, 'Bo']);
}

section('dybRenderTable — markup from a model');
{
  const root = { innerHTML: '', clientWidth: 340, querySelector: () => null, querySelectorAll: () => [] };
  run(`dybCurrentBidderIdx = 0; dybDraft = dybDraftInit(dybClaimNow(), dybRulesNow());
       dybPlayerNames = ['Ann <b>', 'Bo & "Co"', "Cy'"];`);
  S.dybRenderTable(root, S.dybTableModel(), () => {});
  const html = root.innerHTML;
  check('names are escaped (Review Focus 3)', [html.includes('Ann &lt;b&gt;'), html.includes('Bo &amp; &quot;Co&quot;'), html.includes('Cy&#39;')], [true, true, true]);
  check('no raw markup from a name survives', html.includes('Ann <b>'), false);
  check('six face buttons', (html.match(/data-act="face"/g) || []).length, 6);
  check('Classic: the 1 button is marked blocked', /data-face="1"[^>]*class="[^"]*blocked/.test(html) || /class="[^"]*blocked[^"]*"[^>]*data-face="1"/.test(html), true);
  check('the climb label spells the bid', html.includes('Climb: four 4s'), true);
  check('Call is offered once a claim exists', html.includes('data-act="call"'), true);
  check('held dice (a 4, a wild 1, a 4) are drawn solid: one WILD tag', (html.match(/dyb-wild/g) || []).length, 1);
  check('whole-table view draws ghosts to the table total', (html.match(/dyb-slot-ghost/g) || []).length, 11 - 4);
  run('dybStageView = "close";');
  S.dybRenderTable(root, S.dybTableModel(), () => {});
  check('close-up draws no ghosts', (root.innerHTML.match(/dyb-slot-ghost/g) || []).length, 0);
  run('dybCurrentBidderIdx = 1; dybDraft = null; dybStageView = "whole";');
  S.dybRenderTable(root, S.dybTableModel(), () => {});
  check('off-turn: the turn bar names who is deciding', root.innerHTML.includes('is deciding'), true);
  check('off-turn: no face buttons', root.innerHTML.includes('data-act="face"'), false);
  run(`dybPlayerNames = ['Ann', 'Bo', 'Cy']; dybCurrentBidderIdx = 0; dybCurrentQty = 0; dybCurrentFace = 0;
       dybAllegationHistory = []; dybDraft = dybDraftInit(dybClaimNow(), dybRulesNow());`);
  S.dybRenderTable(root, S.dybTableModel(), () => {});
  check('opening: no Call button', root.innerHTML.includes('data-act="call"'), false);
  check('opening: the primary reads "Open with"', root.innerHTML.includes('Open with one 2'), true);
}

section('Seating, The Depths, The Ascent, The Chronicle — tints and escaped names');
{
  const els = {};
  const realGet = S.document.getElementById;
  S.document.getElementById = id => (els[id] = els[id] || { innerHTML: '', textContent: '', style: {}, disabled: false });
  run(`dybPlayerCount = 3; dybPlayerNames = ['Ann <b>', 'Bo & "Co"', "Cy'"]; dybSeatNumbers = [];
       dybAllegationHistory = [{ playerIdx: 0, qty: 2, face: 3 }]; dybFootholdsMode = false;`);
  S.dybShowSeating();
  check('the seating screen deals the seats (a permutation of 1..N)', run('dybSeatNumbers.slice().sort()'), [1, 2, 3]);
  const seat = els['dyb-seating-list'].innerHTML;
  check('seating escapes names', [seat.includes('Ann &lt;b&gt;'), seat.includes('Ann <b>')], [true, false]);
  check('seating shows each climber\'s tint', (seat.match(/border-left:4px solid #/g) || []).length, 3);
  S.dybRenderAscentHistory();
  const asc = els['dyb-ascent-history'].innerHTML;
  check('The Ascent escapes names', [asc.includes('Ann &lt;b&gt;'), asc.includes('Ann <b>')], [true, false]);
  S.dybRenderSpiritBoard([[2, 3], [4], [5]], [[], [], []], [0, 1, 2], run('dybPlayerNames'), [2, 1, 1], null);
  const dep = els['dyb-spirit-grid'].innerHTML;
  check('The Depths escapes names', [dep.includes('Bo &amp; &quot;Co&quot;'), dep.includes('Bo & "Co"')], [true, false]);
  run(`dybAllShakeLogs = [{ shakeNum: 1, bids: [{ playerIdx: 0, qty: 2, face: 3 }], conclusion: 'Ann <b> loses a die.' }]; dybChronicleIdx = 0;`);
  S.dybRenderChronicle();
  const chr = els['dyb-chronicle-card'].innerHTML;
  check('The Chronicle escapes bids and the conclusion', [chr.includes('Ann <b>'), chr.includes('&lt;b&gt;')], [false, true]);
  S.document.getElementById = realGet;
}

section('Choreography timers stop cleanly');
{
  const pending = new Map(); let seq = 0;
  S.setTimeout = (fn, ms) => { pending.set(++seq, fn); return seq; };
  S.clearTimeout = h => pending.delete(h);
  let fired = 0;
  S.dybLater(run('dybAnimTimers'), () => fired++, 100);
  S.dybLater(run('dybAnimTimers'), () => fired++, 200);
  check('two pending in the live bag', run('dybAnimTimers').length, 2);
  S.dybStopChoreography();
  check('dybStopChoreography clears the bag and the timers', [run('dybAnimTimers').length, pending.size], [0, 0]);
  const h = S.dybLater(run('dybAnimTimers'), () => fired++, 10);
  pending.get(h)();
  check('a fired timer removes itself from its bag', [fired, run('dybAnimTimers').length], [1, 0]);
  S.dybLater(run('dybPrTimers'), () => {}, 10);
  S.dybStopChoreography();
  check('the live stop never touches the Practice bag', run('dybPrTimers').length, 1);
  S.dybStopBag(run('dybPrTimers'));
  S.setTimeout = () => 0; S.clearTimeout = () => {};
}
check('every DYB_SOUND moment names a real engine sound', Object.values(run('DYB_SOUND')).every(n => typeof S[n] === 'function'), true);

section('The shake — press, release, throw');
{
  S.mpMyPlayerIdx = 0;
  run(`dybPlayerCount = 3; dybDiceInHand = [4, 5, 5]; dybSyllyMode = false; dybMyRoll = []; dybShakeHeld = false;`);
  S.dybCupRelease();
  check('a release with no press does nothing', run('dybMyRoll.length'), 0);
  S.dybCupPress();
  check('a press holds the cup', run('dybShakeHeld'), true);
  S.dybCupRelease();
  check('the release throws: exactly your dice are rolled', [run('dybShakeHeld'), run('dybMyRoll.length')], [false, 4]);
  const before = JSON.stringify(run('dybMyRoll'));
  S.dybCupPress();
  check('a press after the throw is ignored', [run('dybShakeHeld'), JSON.stringify(run('dybMyRoll'))], [false, before]);
  run('dybMyRoll = [];');
  S.dybDoRoll();
  check('Ready without shaking rolls at once', run('dybMyRoll.length'), 4);
  S.dybStopChoreography();
}

// ── Later tasks append their sections above this line ──────────────────────

console.log(`\n${failures ? `${failures} FAILED` : 'ALL PASS'}`);
process.exit(failures ? 1 : 0);
