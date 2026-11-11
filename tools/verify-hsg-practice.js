// ═══════════════════════════════════════════════════════════════════════════
// verify-hsg-practice.js — Hide and Shogun's Practice lessons, headless (spec §15, S11).
//
//   node tools/verify-hsg-practice.js        (exits 1 on any failure)
//   HSG_SRC=<path> node tools/verify-hsg-practice.js   drive a deliberately broken copy
//
// Loads the REAL hsg-rules.js + hsg.js and plays every lesson the way a thumb does:
// hsgPracPub → hsgTapDecide → hsgPracApply, never re-implementing a rule. Proves
// (rules and state, not presentation):
//   1. All nine lessons finish from a fresh board by taps alone, in order.
//   2. A lesson's legal Commands stay on its board and on its goal (the pracFilter):
//      with the taught piece lifted, only the taught move is marked, and nothing the
//      engine could do below the drawn rows is offered.
//   3. Practice is quarantined: no packet, no hsgB / hsgPub, and the live Castle's
//      hsgLegalFor is untouched (no pracFilter on a real pub).
//   4. The Last Lantern reply runs on the practice timer bag, is instant under
//      reduced motion, and hsgPracStop() / hsgTeardown() clear it.
// ═══════════════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const rulesSrc = fs.readFileSync(path.join(ROOT, 'js/games/hsg-rules.js'), 'utf8');
const hsgSrc = fs.readFileSync(process.env.HSG_SRC || path.join(ROOT, 'js/games/hsg.js'), 'utf8');

let pass = 0, fail = 0;
const failures = [];
const check = (name, cond, detail) => { if (cond) pass++; else { fail++; failures.push(name + (detail ? '  — ' + detail : '')); } };

function makeDevice(reduced) {
  const timers = [], sent = [];
  let tid = 0;
  const sandbox = {
    console,
    document: { getElementById: () => null, querySelectorAll: () => [], createElement: () => ({}) },
    window: { syllyMultiplayerMode: 'single', matchMedia: () => ({ matches: !!reduced }) },
    setTimeout: (fn, ms) => { timers.push({ fn, ms, id: ++tid }); return tid; },
    clearTimeout: id => { const i = timers.findIndex(t => t.id === id); if (i >= 0) timers.splice(i, 1); },
    showScreen: () => {},
    mpSendEnvelope: e => { sent.push(e); throw new Error('Practice sent a packet'); },
    mpSendPrivate: () => { throw new Error('Practice sent a private packet'); },
    playSuccess() {}, playPillClick() {}, playExit() {}, playDone() {},
    mpPlayerSlots: [], mpMyPlayerIdx: 0,
  };
  const ctx = vm.createContext(sandbox);
  vm.runInContext(rulesSrc, ctx, { filename: 'hsg-rules.js' });
  vm.runInContext(hsgSrc + '\nfunction __get(n){ return eval(n); }', ctx, { filename: process.env.HSG_SRC || 'hsg.js' });
  return { ctx, sandbox, timers, sent, get: n => sandbox.__get(n) };
}

// Plays lesson n to the end by taps. Returns the number of taps, or -1 if it got stuck.
function playLesson(d, n) {
  const c = d.ctx;
  c.hsgPracStart(n);
  const L = d.get('HSG_LESSONS')[n];
  let taps = 0, guard = 0;
  while (!d.get('hsgPracEnd') && guard++ < 40) {
    const step = L.steps[d.get('hsgPracStep')];
    if (d.get('hsgPracBusy')) { d.timers.splice(0).forEach(t => t.fn()); continue; }
    const S = d.get('hsgPracS');
    const from = step.from(S);
    if (!from.length) return -1;
    c.hsgPracTap(from[0]); taps++;
    if (!step.door) {
      let to = step.to ? step.to(S) : [];
      if (!to.length) {
        const mk = c.hsgMarksFor(c.hsgPracPub(), 0, d.get('hsgPracSel')).marks;
        to = Object.keys(mk).map(Number);
      }
      if (!to.length) return -1;
      c.hsgPracTap(to[0]); taps++;
    } else {
      c.hsgPracTap(from[0]); taps++;                       // the second tap on the same door
    }
  }
  return d.get('hsgPracEnd') ? taps : -1;
}

// ── 1. Every lesson finishes by taps alone ─────────────────────────────────
console.log('── Lessons');
const d0 = makeDevice(false);
const LESSONS = d0.get('HSG_LESSONS');
check('nine lessons (brief §24)', LESSONS.length === 9, String(LESSONS.length));
for (let n = 0; n < LESSONS.length; n++) {
  const d = makeDevice(false);
  const taps = playLesson(d, n);
  check('lesson ' + (n + 1) + ' (' + LESSONS[n].title + ') finishes', taps > 0, 'taps=' + taps);
  check('lesson ' + (n + 1) + ' ends with words and is ticked', !!(d.get('hsgPracEnd') && d.get('hsgPracEnd').text) && d.get('hsgPracDone').indexOf(n) >= 0);
  check('lesson ' + (n + 1) + ' sent no packet', d.sent.length === 0);
}

// ── 2. The filter: on the board, on the goal ───────────────────────────────
console.log('── Filter');
for (let n = 0; n < LESSONS.length; n++) {
  const d = makeDevice(false);
  d.ctx.hsgPracStart(n);
  const L = LESSONS[n], lim = L.rows * 5;
  const legal = d.ctx.hsgLegalFor(d.ctx.hsgPracPub(), 0);
  check('lesson ' + (n + 1) + ': legal Commands stay on the drawn rows', legal.every(a => a[1] < lim && (a[0] === 'U' || a[2] < lim)), JSON.stringify(legal));
  check('lesson ' + (n + 1) + ': only the taught Commands are offered', legal.every(a => L.steps[0].allow(a, d.get('hsgPracS'))));
  if (n >= 1 && n <= 5) {
    d.ctx.hsgPracTap(L.steps[0].from()[0]);
    const mk = d.ctx.hsgMarksFor(d.ctx.hsgPracPub(), 0, d.get('hsgPracSel')).marks;
    check('lesson ' + (n + 1) + ': the lifted piece shows exactly one mark', Object.keys(mk).length === 1, JSON.stringify(mk));
  }
}
{
  const d = makeDevice(false);
  d.ctx.hsgPracStart(1);                                   // a stray tap does not advance or strand
  d.ctx.hsgPracTap(4);                                     // an enemy piece: nothing lifts
  check('a stray tap changes nothing', d.get('hsgPracStep') === 0 && d.get('hsgPracSel') === -1 && !d.get('hsgPracEnd'));
  d.ctx.hsgPracTap(3);                                     // the wrong own piece lifts but has no move
  check('the wrong piece lifts with no marks', Object.keys(d.ctx.hsgMarksFor(d.ctx.hsgPracPub(), 0, d.get('hsgPracSel')).marks).length === 0);
}

// ── 3. Quarantine ──────────────────────────────────────────────────────────
console.log('── Quarantine');
{
  const d = makeDevice(false);
  playLesson(d, 6);
  check('Practice never made a Battle or a public copy', d.get('hsgB') === null && d.get('hsgPub') === null);
  const realPub = Object.assign({}, d.ctx.hsgPracPub(), { pracFilter: undefined });
  const open = d.ctx.hsgLegalFor(realPub, 0).length;
  check('a pub without pracFilter is unfiltered', open > 0);
  check('lesson 7 ends on the Shogun', /Shogun falls/.test(d.get('hsgPracEnd').text));
}

// ── 4. The Last Lantern: timer bag and reduced motion ──────────────────────
console.log('── Lantern');
{
  const d = makeDevice(false);
  d.ctx.hsgPracStart(8);
  d.ctx.hsgPracTap(0); d.ctx.hsgPracTap(5);                // march Fm1 down
  check('Sam’s reply is scheduled on the practice bag', d.get('hsgPracTimers').length === 1 && d.get('hsgPracBusy') === true);
  d.ctx.hsgPracTap(1);
  check('input is ignored while Sam moves', d.get('hsgPracSel') === -1 && d.get('hsgPracS').quiet === 9);
  d.ctx.hsgPracStop();
  check('hsgPracStop clears the bag', d.get('hsgPracTimers').length === 0 && d.get('hsgPracBusy') === false);
  d.ctx.hsgPracStart(8);
  d.ctx.hsgPracTap(0); d.ctx.hsgPracTap(5);
  d.ctx.hsgTeardown();
  check('hsgTeardown clears the bag and the lesson', d.get('hsgPracTimers').length === 0 && d.get('hsgPracLesson') === -1);
  { const e = makeDevice(false); playLesson(e, 1); playLesson(e, 2);
    check('lessons are ticked after playing', e.get('hsgPracDone').length === 2);
    e.ctx.hsgTeardown();
    check('leaving HSG (hsgTeardown) clears the ticks', e.get('hsgPracDone').length === 0 && e.get('hsgPracLesson') === -1); }
  check('a cleared reply never fires', d.timers.length === 0);
}
{
  const d = makeDevice(true);                              // reduced motion
  d.ctx.hsgPracStart(8);
  d.ctx.hsgPracTap(0); d.ctx.hsgPracTap(5);
  check('reduced motion: Sam replies at once, no timer', d.get('hsgPracTimers').length === 0 && d.get('hsgPracS').quiet === 10 && !d.get('hsgPracBusy'));
  const taps = playLesson(makeDevice(true), 8);
  check('reduced motion: the lantern lesson still finishes', taps > 0);
  const e = makeDevice(true); playLesson(e, 8);
  check('lantern win counts the open pieces only (3 v 2)', /3 pieces in the open, Sam has 2/.test(e.get('hsgPracEnd').text), e.get('hsgPracEnd').text);
}

console.log('\n' + (fail ? '✗ ' + fail + ' failed, ' + pass + ' passed\n' + failures.map(f => '  - ' + f).join('\n') : '✓ ' + pass + ' passed, 0 failed'));
process.exit(fail ? 1 : 0);
