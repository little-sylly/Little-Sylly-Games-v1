// verify-board.js — the pure tier of the Board (js/lobby/board.js, SW v250).
// Zero dependencies. Rules and state only, never presentation (CLAUDE.md §
// Harness rule): the board's order per tab, the swipe rail's D6 rule (a game
// that doesn't fit is never on it), Random's pick and the tapes' counts.
//
// The fit rule is the REAL lbWhyOut from js/lobby/lobby.js, run in a vm context
// against the real GAMES — a copy of it here could agree with itself forever.
//
// Run:  node tools/verify-board.js
//       BOARD_SRC=path/to/broken-board.js node tools/verify-board.js   (must go red)
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const BOARD = process.env.BOARD_SRC ? path.resolve(process.env.BOARD_SRC) : path.join(ROOT, 'js/lobby/board.js');

const ctx = vm.createContext({ console });
for (const f of ['js/lobby/lobby-games.js', 'js/lobby/lobby.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
vm.runInContext(fs.readFileSync(BOARD, 'utf8'), ctx, { filename: BOARD });
const get = (expr) => vm.runInContext(expr, ctx);
const GAMES = get('GAMES'), SHELVES = get('LB_SHELVES'), lbState = get('lbState'), whyOut = get('lbWhyOut');
const { bdOrder, bdRail, bdPick, bdTabCount } = { bdOrder: get('bdOrder'), bdRail: get('bdRail'), bdPick: get('bdPick'), bdTabCount: get('bdTabCount') };

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log('  FAIL ' + msg); } };
const eq = (a, b, msg) => ok(a === b, `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
const ids = (list) => list.map(g => g.id);

const TABS = ['all', ...SHELVES.map(s => s.id)];
const COUNTS = [null, 2, 3, 4, 5, 6, 7, 8, 9, 10];
// Every filter state the stepper and the One phone key can reach.
const FILTERS = [];
for (const count of COUNTS) for (const onePhone of [false, true]) FILTERS.push({ count, onePhone });
const setFilter = (f) => { lbState.count = f.count; lbState.onePhone = f.onePhone; };
const label = (f, tab) => `${tab} @ ${f.count == null ? 'any' : f.count}${f.onePhone ? ' one-phone' : ''}`;

// ── bdOrder ─────────────────────────────────────────────────────────────────
console.log('bdOrder');
for (const f of FILTERS) {
  setFilter(f);
  for (const tab of TABS) {
    const { fit, out } = bdOrder(GAMES, tab, whyOut);
    const want = GAMES.filter(g => tab === 'all' || g.shelves.includes(tab));
    const both = fit.concat(out);
    eq(both.length, want.length, `${label(f, tab)}: every game on the tab, once`);
    eq(new Set(ids(both)).size, both.length, `${label(f, tab)}: no game twice`);
    ok(both.every(g => tab === 'all' || g.shelves.includes(tab)), `${label(f, tab)}: nothing from another shelf`);
    ok(fit.every(g => !whyOut(g)), `${label(f, tab)}: every fitter fits`);
    ok(out.every(g => !!whyOut(g)), `${label(f, tab)}: every ghost has a reason`);
    // Catalogue order kept inside each half — the board never shuffles.
    const rank = (g) => GAMES.indexOf(g);
    ok(fit.every((g, i) => i === 0 || rank(fit[i - 1]) < rank(g)), `${label(f, tab)}: fitters in GAMES order`);
    ok(out.every((g, i) => i === 0 || rank(out[i - 1]) < rank(g)), `${label(f, tab)}: ghosts in GAMES order`);
  }
}
setFilter({ count: null, onePhone: false });
eq(bdOrder(GAMES, 'all', whyOut).fit.length, GAMES.length, 'unfiltered, All holds every game and no ghost');
eq(bdOrder(GAMES, 'all', whyOut).out.length, 0, 'unfiltered, All has no ghost');
eq(ids(bdOrder(GAMES, 'all', whyOut).fit).join(), ids(GAMES).join(), 'unfiltered, All is the catalogue exactly');
// Every game sits on at least one shelf tab — or it could only ever be reached from All.
for (const g of GAMES) ok(SHELVES.some(s => g.shelves.includes(s.id)), `${g.id} sits on at least one shelf tab`);

// ── bdRail — D6: the swipe never holds a game that doesn't fit ──────────────
console.log('bdRail');
let filteredOut = 0;
for (const f of FILTERS) {
  setFilter(f);
  for (const tab of TABS) {
    const rail = bdRail(GAMES, tab, whyOut);
    ok(rail.every(g => !whyOut(g)), `${label(f, tab)}: the rail holds no game lbWhyOut rejects`);
    eq(ids(rail).join(), ids(bdOrder(GAMES, tab, whyOut).fit).join(), `${label(f, tab)}: the rail is the board's fitters, same order`);
    filteredOut += bdOrder(GAMES, tab, whyOut).out.length;
  }
}
// Guards the guard: if no filter ever rejected a game, the D6 check above proved nothing.
ok(filteredOut > 0, `the filter sweep did reject games (${filteredOut} ghosts across it) — the D6 check is live`);

// ── bdPick ──────────────────────────────────────────────────────────────────
console.log('bdPick');
// xorshift32, the same stream shape js/lib/physics.js uses — a seed is a replay.
const seeded = (seed) => { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };
eq(bdPick([], Math.random), null, 'an empty pool picks nothing');
eq(bdPick(null, Math.random), null, 'no pool picks nothing');
eq((bdPick([GAMES[0]], () => 0.999999) || {}).id, GAMES[0].id, 'a pool of one always picks it');
eq((bdPick(GAMES, () => 1) || {}).id, GAMES[GAMES.length - 1].id, 'rand() === 1 is clamped to the last game');
eq((bdPick(GAMES, () => 0) || {}).id, GAMES[0].id, 'rand() === 0 picks the first');
for (const f of FILTERS) {
  setFilter(f);
  for (const tab of TABS) {
    const pool = bdRail(GAMES, tab, whyOut);
    const r = seeded(7 + pool.length);
    for (let k = 0; k < 25; k++) {
      const p = bdPick(pool, r);
      if (!pool.length) { eq(p, null, `${label(f, tab)}: empty pool picks nothing`); break; }
      ok(pool.includes(p), `${label(f, tab)}: pick ${k} comes from the pool`);
    }
  }
}
setFilter({ count: null, onePhone: false });
const runA = [], runB = [], ra = seeded(42), rb = seeded(42);
for (let k = 0; k < 40; k++) { runA.push(bdPick(GAMES, ra).id); runB.push(bdPick(GAMES, rb).id); }
eq(runA.join(), runB.join(), 'the same seed picks the same games, in the same order');
ok(new Set(runA).size > 10, `a seeded run spreads across the pool (${new Set(runA).size} distinct in 40)`);

// ── bdTabCount ──────────────────────────────────────────────────────────────
console.log('bdTabCount');
for (const f of FILTERS) {
  setFilter(f);
  const filtered = f.count != null || f.onePhone;
  for (const tab of TABS) {
    const o = bdOrder(GAMES, tab, whyOut), total = o.fit.length + o.out.length;
    const want = tab === 'all' ? (filtered ? `${o.fit.length} fit` : '') : (filtered ? `${o.fit.length}/${total}` : `${total}`);
    eq(bdTabCount(GAMES, tab, whyOut, filtered), want, `${label(f, tab)}: the tape's count`);
  }
}
setFilter({ count: null, onePhone: false });
for (const s of SHELVES) eq(bdTabCount(GAMES, s.id, whyOut, false), String(GAMES.filter(g => g.shelves.includes(s.id)).length), `${s.id}: unfiltered count is the shelf's size`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
