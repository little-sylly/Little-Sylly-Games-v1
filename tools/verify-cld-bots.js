// ═══════════════════════════════════════════════════════════════════════════
// verify-cld-bots.js — Cold Shoulder's bot brain, headless (SW v247).
//
//   node tools/verify-cld-bots.js          (exits 1 on any failure)
//   CLD_SRC=path / CLD_PHYS_SRC=path       (drive a deliberately-broken copy)
//   CLD_BOTS_MATCHES=n                     (matches in the ordering run; default 60)
//
// Spec: docs/superpowers/specs/2026-09-29-bots-design.md §§ 5–6. The engine
// half (seats, prompt, timers, Solo) is verify-bots.js.
// ═══════════════════════════════════════════════════════════════════════════
'use strict';
const { G, F, C, setup, playMatch, legal, reachState, rng } = require('./lib/cld-rules-world');
const MATCHES = Number(process.env.CLD_BOTS_MATCHES || 60);

let failures = 0, total = 0;
function check(label, actual, expected) {
  total++;
  const good = JSON.stringify(actual) === JSON.stringify(expected);
  if (!good) failures++;
  console.log((good ? '  ok    ' : '  FAIL  ') + label +
    (good ? '' : '\n          expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual)));
}
function ok(label, cond, detail) {
  total++;
  if (cond) console.log('  ok    ' + label);
  else { failures++; console.log('  FAIL  ' + label + (detail ? '\n          ' + detail : '')); }
}
const section = t => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 68 - t.length)));
const DIFFS = ['easy', 'medium', 'hard'];

console.log('Cold Shoulder — the bot brain');
console.log('='.repeat(72));
try {
  section('1. Think time, per difficulty');
  {
    const r = rng(3), mean = d => { let s = 0; for (let k = 0; k < 400; k++) s += F.cldBotThinkMs(d, r); return s / 400; };
    const inRange = (d, lo, hi) => { for (let k = 0; k < 400; k++) { const v = F.cldBotThinkMs(d, r); if (v < lo || v > hi) return false; } return true; };
    ok('Easy thinks 1.0–2.5 s', inRange('easy', 1000, 2500));
    ok('Medium thinks 1.5–3.5 s', inRange('medium', 1500, 3500));
    ok('Hard thinks 2.0–4.5 s', inRange('hard', 2000, 4500));
    ok('…and Hard is the slowest on average', mean('hard') > mean('medium') && mean('medium') > mean('easy'));
  }

  section('2. The view: the public floe, nothing hidden, no shared references');
  {
    setup({ players: 4, seed: 11 });
    G.commits = [{ aims: [], dive: null, snowball: null }, null, null, null];
    const v = F.cldBotView(2);
    check('it knows whose seat it is', v.me, 2);
    check('every commit is blanked', v.commits, [null, null, null, null]);
    check('no timeline rides along', v.timeline, null);
    check('it carries the floe', [v.penguins.length, v.floeRadius > 0], [G.penguins.length, true]);
    v.penguins[0].x = -999;
    ok('it is a deep clone', G.penguins[0].x !== -999);
    G.commits = [null, null, null, null];
  }

  section('3. Fairness: another seat\'s hidden commit never reaches a bot');
  const junk = (k, r) => ({ aims: [{ penguinId: k + '-0', dx: r(), dy: r(), power: r() }], dive: null,
                            snowball: { x: r() * 360, y: r() * 360 } });
  const STATES = [
    ['Standing',     { players: 4, seed: 5 },                      m => m.some(p => !p.drowned)],
    ['Knocked back', { players: 8, seed: 21, floe: 'cramped' },    m => m.some(p => p.drowned && !p.plug)],
    ['Drowned',      { players: 6, seed: 33, floe: 'cramped' },    m => m.length > 0 && m.every(p => p.drowned && p.plug)],
    ['Peck Off',     { players: 2, seed: 44, peckOff: true },      m => m.some(p => !p.drowned)],
  ];
  for (const [label, o, pred] of STATES) {
    let i = -1;
    for (let k = 0; k < 20 && i < 0; k++) i = reachState(Object.assign({}, o, { seed: o.seed + k * 101 }), pred);
    ok(label + ': the state is reached', i >= 0);
    if (i < 0) continue;
    for (const d of DIFFS) {
      G.commits = new Array(G.playerCount).fill(null);
      const v0 = F.cldBotView(i), m0 = F.cldBotDecide(v0, d, rng(5));
      const r = rng(11);
      G.commits = G.commits.map((_, k) => (k === i ? null : junk(k, r)));
      const v1 = F.cldBotView(i), m1 = F.cldBotDecide(v1, d, rng(5));
      check(`${label} / ${d}: the view is identical with junk in every other seat`, JSON.stringify(v1), JSON.stringify(v0));
      check(`${label} / ${d}: …and so is the decision`, m1, m0);
      check(`${label} / ${d}: the move is legal`, legal(i, m0), null);
    }
    G.commits = new Array(G.playerCount).fill(null);
  }

  section('4. Whole matches, bots only: legal, no throw, every match ends');
  {
    const runs = [];
    for (const players of [3, 4, 5, 6, 7, 8]) for (const d of ['easy', 'medium']) {
      runs.push({ players, diffs: [d], seed: players * 17 + d.length, sylly: players % 2 === 0,
                  iceBreaker: players % 4, floe: ['roomy', 'standard', 'cramped'][players % 3] });
    }
    runs.push({ players: 2, diffs: ['easy', 'medium'], seed: 91, peckOff: true });
    runs.push({ players: 3, diffs: ['easy', 'medium'], seed: 92, fishToWin: 3 });
    for (const o of runs) {
      let res, threw = null;
      try { res = playMatch(o); } catch (e) { threw = e.message; }
      const label = `${o.players}p ${o.diffs.join('+')}${o.peckOff ? ' Peck Off' : ''}${o.sylly ? ' Thaw' : ''}`;
      check(label + ': no throw', threw, null);
      if (!res) continue;
      check(label + ': every move legal', res.illegal, null);
      ok(label + ': the match ends', res.winner >= 0, 'slides=' + res.slides);
    }
  }

  section('5. A stale bot move is rejected, never carried into the next Slide');
  {
    setup({ players: 3, seed: 7 });
    const move = F.cldBotDecide(F.cldBotView(1), 'medium', rng(1));
    const staleTag = G.slideNo - 1;
    check('a move tagged for an earlier Slide is refused', F.cldApplyCommit(1, move, staleTag), false);
    check('…and the seat stays open', G.commits[1], null);
  }

  // ── Task 8 adds sections here ──
} catch (e) {
  failures++; total++;
  console.log('\n  FAIL  the run could not finish\n          ' + String(e && e.stack || e).split('\n').slice(0, 4).join('\n          '));
}
console.log('\n' + '='.repeat(72));
console.log(failures ? `${failures} CHECK(S) FAILED` : `ALL ${total} CHECKS PASSED`);
process.exit(failures ? 1 : 0);
