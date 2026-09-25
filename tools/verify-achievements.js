// verify-achievements.js — the stickerbook's rules (js/lobby/achievements.js),
// pure tier. Zero dependencies. Spec: docs/superpowers/specs/2026-09-23-stickerbook-achievements-design.md
// Run: node tools/verify-achievements.js
const path = require('path');
const MANIFEST = require(path.join(__dirname, '..', 'data', 'stickers', 'manifest.json'));

let pass = 0, fail = 0, current = '';
const section = (name) => { current = name; console.log('── ' + name + ' ──'); };
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log('  FAIL [' + current + '] ' + msg); } };
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);

/* Purity: the module must never reach for any of these. Forbidden BEFORE it
   loads, so a top-level touch fails as loudly as a call-time one. */
['document', 'localStorage', 'window', 'setTimeout', 'setInterval'].forEach(name =>
  Object.defineProperty(global, name, { get() { throw new Error('achievements touched ' + name); }, configurable: true }));
const realNow = Date.now, realRandom = Math.random;
Date.now = () => { throw new Error('achievements touched Date.now'); };
Math.random = () => { throw new Error('achievements touched Math.random'); };

let A = null;
try { A = require('../js/lobby/achievements.js'); } catch (e) { console.log('  FAIL [load] ' + e.message); fail++; }
if (!A) { console.log(`\n${pass} passed, ${fail} failed`); process.exit(1); }

const STICKERS = MANIFEST.stickers;
const book = A.achDefine(STICKERS);
const ids = STICKERS.map(s => s.id);
const S0 = A.ACH_EMPTY;
const run = (state, ...actions) => actions.reduce((s, a) => A.achReduce(book, s, a), state);
const plays = (id, n) => Array.from({ length: n }, () => ({ t: 'play', id }));

section('shape');
eq(A.ACH_TIERS, [1, 5, 10], 'three tiers: 1, 5 and 10 plays');
eq(A.ACH_PER_PAGE, 4, 'four sleeves a page (the mockup\'s 2×2)');
eq(book.entries.length, STICKERS.length, 'one entry per manifest sticker');
eq(book.entries.map(e => e.slot), ids.map((_, i) => i), 'slots are fixed, in manifest order');
eq(book.entries.map(e => e.id), ids, 'entries keep the manifest order');
ok(book.entries.every(e => e.label && e.image && JSON.stringify(e.tiers) === '[1,5,10]'), 'every entry has a label, an image and the tiers');
eq(book.pages, Math.ceil(STICKERS.length / 4), 'pages = ceil(stickers / 4)');
ok(book.byId[ids[3]] === book.entries[3], 'byId finds an entry');
eq(A.achDefine([{ id: 'a', label: 'A', image: 'a.png' }], [2, 3]).entries[0].tiers, [2, 3], 'tiers can be given');
eq(A.achDefine([{ id: 'a', label: 'A', image: 'a.png' }, { id: 'a', label: 'dup', image: 'x.png' }, null, { label: 'no id' }]).entries.length, 1,
  'duplicate, null and id-less manifest rows are dropped');
eq(A.achDefine([]).pages, 0, 'an empty manifest is an empty book');
eq(S0, { v: 1, plays: {}, placed: {} }, 'the empty state');

section('purity');
{
  const before = run(S0, { t: 'play', id: ids[0] });
  const snap = JSON.stringify(before);
  const after = A.achReduce(book, before, { t: 'play', id: ids[0] });
  eq(JSON.stringify(before), snap, 'achReduce does not mutate the state it is given');
  ok(after !== before, 'a change returns a new object');
  ok(A.achReduce(book, before, { t: 'nonsense' }) === before, 'an unknown action returns the same reference');
  ok(A.achReduce(book, before, null) === before, 'a null action returns the same reference');
  eq(JSON.stringify(S0), '{"v":1,"plays":{},"placed":{}}', 'ACH_EMPTY is never mutated by use');
}

section('play and devAdd');
{
  const s = run(S0, ...plays(ids[2], 3));
  eq(A.achPlays(s, ids[2]), 3, 'three plays count three');
  eq(A.achPlays(s, ids[0]), 0, 'an unplayed game has 0');
  ok(A.achReduce(book, S0, { t: 'play', id: 'bld' }) === S0, 'a play for a game with no sticker (Bailed) is ignored');
  ok(A.achReduce(book, S0, { t: 'play' }) === S0, 'a play with no id is ignored');
  eq(A.achPlays(run(S0, { t: 'devAdd', id: ids[1], n: 7 }), ids[1]), 7, 'devAdd adds n');
  eq(A.achPlays(run(S0, { t: 'devAdd', id: ids[1], n: 3 }, { t: 'devAdd', id: ids[1], n: -10 }), ids[1]), 0, 'devAdd clamps at 0');
  ok(A.achReduce(book, S0, { t: 'devAdd', id: ids[1], n: 0 }) === S0, 'devAdd of 0 changes nothing');
  ok(A.achReduce(book, S0, { t: 'devAdd', id: ids[1], n: 'x' }) === S0, 'devAdd of a non-number changes nothing');
  ok(A.achReduce(book, S0, { t: 'devAdd', id: 'nope', n: 3 }) === S0, 'devAdd for an unknown id is ignored');
  eq(A.achPlays(run(S0, { t: 'devAdd', id: ids[1], n: 2.7 }), ids[1]), 2, 'devAdd floors a fraction');
}

section('status, tiers, complete');
{
  const at = n => run(S0, { t: 'devAdd', id: ids[0], n });
  eq(A.achStatus(book, at(0), ids[0]), 'locked', '0 plays: locked');
  eq(A.achStatus(book, at(1), ids[0]), 'tray', '1 play: earned, waiting in the tray');
  eq(A.achStatus(book, run(at(1), { t: 'place', id: ids[0] }), ids[0]), 'placed', 'placed once placed');
  eq(A.achStatus(book, S0, 'nope'), null, 'an unknown id has no status');
  const doneAt = n => A.achTiers(book, at(n), ids[0]).map(t => t.done);
  eq(doneAt(0), [false, false, false], 'tiers at 0');
  eq(doneAt(1), [true, false, false], 'tiers at 1');
  eq(doneAt(4), [true, false, false], 'tiers at 4');
  eq(doneAt(5), [true, true, false], 'tiers at 5');
  eq(doneAt(9), [true, true, false], 'tiers at 9');
  eq(doneAt(10), [true, true, true], 'tiers at 10');
  eq(doneAt(11), [true, true, true], 'tiers at 11');
  eq(A.achTiers(book, at(3), ids[0]).map(t => t.need), [1, 5, 10], 'each tier says what it needs');
  ok(!A.achComplete(book, at(9), ids[0]) && A.achComplete(book, at(10), ids[0]), 'complete at exactly 10');
  eq(A.achTiers(book, S0, 'nope'), [], 'an unknown id has no tiers');
}

section('place');
{
  const earned = run(S0, { t: 'play', id: ids[4] });
  const placed = run(earned, { t: 'place', id: ids[4] });
  eq(placed.placed[ids[4]], true, 'place marks it placed');
  ok(A.achReduce(book, placed, { t: 'place', id: ids[4] }) === placed, 'placing twice is refused (same reference)');
  ok(A.achReduce(book, S0, { t: 'place', id: ids[4] }) === S0, 'placing a locked sticker is refused');
  ok(A.achReduce(book, S0, { t: 'place', id: 'nope' }) === S0, 'placing an unknown id is refused');
  const more = run(placed, ...plays(ids[4], 9));
  eq(A.achStatus(book, more, ids[4]), 'placed', 'more plays leave a placed sticker placed');
}

section('tray and progress');
{
  const s = run(S0, { t: 'play', id: ids[7] }, { t: 'play', id: ids[2] }, { t: 'play', id: ids[5] }, { t: 'place', id: ids[5] });
  eq(A.achTray(book, s), [ids[2], ids[7]], 'the tray is earned-and-unplaced, in book order (not the order earned)');
  eq(A.achTray(book, S0), [], 'nothing earned: an empty tray');
  eq(A.achProgress(book, S0), { done: 0, total: STICKERS.length * 3 }, `progress counts ${STICKERS.length * 3} tier achievements`);
  eq(A.achProgress(book, run(S0, { t: 'devAdd', id: ids[0], n: 5 }, { t: 'play', id: ids[1] })), { done: 3, total: STICKERS.length * 3 }, 'two tiers + one tier = 3');
}

section('new tiers (the toast)');
{
  const a = S0, b = run(a, { t: 'play', id: ids[3] });
  eq(A.achNewTiers(book, a, b), [{ id: ids[3], tier: 0, need: 1 }], '0 → 1 completes the first tier');
  const c = run(b, { t: 'devAdd', id: ids[3], n: 5 });
  eq(A.achNewTiers(book, b, c), [{ id: ids[3], tier: 1, need: 5 }], '1 → 6 completes the second only');
  const d = run(run(S0, { t: 'devAdd', id: ids[3], n: 4 }), { t: 'devAdd', id: ids[3], n: 8 });
  eq(A.achNewTiers(book, run(S0, { t: 'devAdd', id: ids[3], n: 4 }), d), [{ id: ids[3], tier: 1, need: 5 }, { id: ids[3], tier: 2, need: 10 }], '4 → 12 completes two at once');
  eq(A.achNewTiers(book, b, run(b, { t: 'place', id: ids[3] })), [], 'placing completes nothing');
  eq(A.achNewTiers(book, c, run(S0)), [], 'a reset completes nothing');
}

section('hints');
{
  const label = STICKERS[0].label;
  eq(A.achHint(book, S0, ids[0]), `Play ${label} once to unlock`, 'locked: once');
  eq(A.achHint(book, run(S0, { t: 'play', id: ids[0] }), ids[0]), '4 more plays for the next star', '1 play: 4 more');
  eq(A.achHint(book, run(S0, { t: 'devAdd', id: ids[0], n: 9 }), ids[0]), '1 more play for the next star', 'singular at 1');
  eq(A.achHint(book, run(S0, { t: 'devAdd', id: ids[0], n: 10 }), ids[0]), '100% complete', 'all tiers');
  eq(A.achHint(book, S0, 'nope'), '', 'unknown id: no hint');
}

section('reset');
{
  const s = run(S0, { t: 'devAdd', id: ids[0], n: 3 }, { t: 'place', id: ids[0] });
  eq(run(s, { t: 'reset' }), S0, 'reset returns the empty state');
  ok(A.achReduce(book, S0, { t: 'reset' }) === S0, 'reset of the empty state changes nothing');
}

section('revive');
{
  const good = run(S0, { t: 'devAdd', id: ids[0], n: 3 }, { t: 'place', id: ids[0] });
  eq(A.achRevive(JSON.parse(JSON.stringify(good)), book), good, 'a stored state round-trips');
  [null, undefined, 'junk', 42, [], { v: 1 }, { v: 1, plays: 'x', placed: 7 }].forEach(raw =>
    eq(A.achRevive(raw, book), S0, `junk ${JSON.stringify(raw)} revives as the empty state`));
  eq(A.achRevive({ v: 2, plays: { [ids[0]]: 3 }, placed: {} }, book), S0, 'a future schema is not guessed at: empty');
  eq(A.achRevive({ v: 1, plays: { [ids[0]]: -4, [ids[1]]: 2.9, [ids[2]]: 'x', nope: 5 }, placed: {} }, book).plays, { [ids[1]]: 2 },
    'negative, fractional, non-numeric and unknown plays are cleaned');
  eq(A.achRevive({ v: 1, plays: { [ids[0]]: 2 }, placed: { [ids[0]]: 'yes', [ids[1]]: true, nope: true } }, book).placed, {},
    'placed keeps only true for an EARNED, known sticker');
  eq(A.achRevive({ v: 1, plays: { [ids[0]]: 2 }, placed: { [ids[0]]: true } }, book).placed, { [ids[0]]: true }, 'a real placement survives');
  let threw = false; try { A.achRevive({ get v() { throw new Error('x'); } }, book); } catch (_) { threw = true; }
  ok(!threw, 'a throwing getter does not escape revive');
}

section('achAllPlaced — v1 ships everything unlocked, nothing saved (owner, 25 Sep 2026)');
{
  const book = A.achDefine(MANIFEST.stickers);
  const all = A.achAllPlaced(book);
  eq(Object.keys(all.placed).length, book.entries.length, 'every sticker is on its sleeve');
  eq(book.entries.every(e => A.achStatus(book, all, e.id) === 'placed'), true, 'every status reads placed');
  eq(A.achTray(book, all), [], 'the tray is empty');
  const p = A.achProgress(book, all);
  eq(p.done, p.total, 'every tier is complete, so no progress hint can dangle');
  eq(A.achRevive(JSON.parse(JSON.stringify(all)), book).placed, all.placed, 'it survives a revive untouched');
  eq(A.achAllPlaced(A.achDefine([])).placed, {}, 'an empty manifest gives an empty book');
}

Date.now = realNow; Math.random = realRandom;
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
