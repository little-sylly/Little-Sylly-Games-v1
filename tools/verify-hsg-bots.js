// ═══════════════════════════════════════════════════════════════════════════
// verify-hsg-bots.js — Hide and Shogun's bots, headless (spec §15, stage S8).
//
//   node tools/verify-hsg-bots.js            (exits 1 on any failure)
//   HSG_SRC=<path> node tools/verify-hsg-bots.js   drive a deliberately broken copy
//   HSG_BOTS_BATTLES=n                       Battles per pairing in the ladder (default 40)
//
// Loads the REAL js/games/hsg-rules.js + js/games/hsg.js into a vm in HOST mode.
// The sandbox's mpBotsPrompt QUEUES each prompt; the harness then runs the real
// hsgBotView → hsgBotDecide → hsgBotSubmit on it — the engine's order, minus the
// timer — so bot-vs-bot Campaigns go through hsgOpenCommand exactly as on a phone.
// (The engine half — seats, timers, Solo — is verify-bots.js.)
//
// What this proves (rules and state — never presentation):
//   1. Think time per level, in the spec's ranges (§11), Hard the slowest.
//   2. The view: the public snapshot + the unseen counts, a copy, nothing else.
//   3. FAIRNESS: shuffling the closed doors' contents leaves the view AND the
//      decision byte-identical, at all three levels, every Command of many
//      Battles. A view that leaks the layout is caught by the same comparison.
//   4. decide is pure: the view is unchanged by it.
//   5. Every bot Command is legal on the host's real engine; submit takes it
//      through hsgHostCommand; a stale tag or a wrong phase is dropped.
//   6. Bot-vs-bot Campaigns end (every Battle ends, the Campaign reaches its
//      gameover), at every level pairing, both fox settings.
//   7. Hard's decide stays under 150 ms on Node (re-check on the iPhone SE).
//   8. REPORTS the level ladder — head-to-head win rates. Not asserted.
// ═══════════════════════════════════════════════════════════════════════════
'use strict';
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT     = path.join(__dirname, '..');
const rulesSrc = fs.readFileSync(path.join(ROOT, 'js/games/hsg-rules.js'), 'utf8');
const hsgSrc   = fs.readFileSync(process.env.HSG_SRC || path.join(ROOT, 'js/games/hsg.js'), 'utf8');
const LADDER_BATTLES = Number(process.env.HSG_BOTS_BATTLES || 40);
const LEVELS = ['easy', 'medium', 'hard'];
const HARD_BUDGET_MS = 150;

let pass = 0, fail = 0;
const failures = [];
function check(name, cond, detail) {
  if (cond) { pass++; return; }
  fail++; failures.push(name + (detail ? '  — ' + detail : ''));
}
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const section = t => console.log('\n── ' + t);
// The engine's own bot stream (mpBotRng): xorshift32 → [0, 1).
function xorshift(seed) {
  let x = (seed >>> 0) || 1;
  return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
}

// ── One host device, both seats configurable ───────────────────────────────
function makeHost(slots) {
  const timers = [], prompts = [];
  let tid = 0, cancels = 0;
  const sandbox = {
    console,
    document: { getElementById: () => null, querySelectorAll: () => [], createElement: () => ({}) },
    window: { syllyMultiplayerMode: 'host' },
    setTimeout: (fn, ms) => { timers.push({ fn, ms, id: ++tid }); return tid; },
    clearTimeout: id => { const i = timers.findIndex(t => t.id === id); if (i >= 0) timers.splice(i, 1); },
    showScreen: () => {},
    mpSendEnvelope: () => {},
    mpSendPrivate: () => {},
    mpUnlockSync: () => {},
    mpPlayerSlots: slots,
    mpMyPlayerIdx: 0,
    mpIsBotSlot: s => !!s && String(s.uid).indexOf('bot:') === 0,
    mpSeatLabel: i => sandbox.mpPlayerSlots[i].nickname,
    mpBotsPrompt: (tag, seats) => prompts.push({ tag, seats }),
    mpBotsCancel: () => { cancels++; prompts.length = 0; },
  };
  const ctx = vm.createContext(sandbox);
  vm.runInContext(rulesSrc, ctx, { filename: 'hsg-rules.js' });
  vm.runInContext(hsgSrc + '\nfunction __get(n){ return eval(n); }\nfunction __set(n, v){ eval(n + " = arguments[1]"); }',
    ctx, { filename: process.env.HSG_SRC || 'hsg.js' });
  let seed = 4242;
  sandbox.__rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  vm.runInContext('Math.random = __rand', ctx);
  return {
    ctx, sandbox, timers, prompts,
    get: n => sandbox.__get(n), set: (n, v) => sandbox.__set(n, v),
    cancels: () => cancels,
    fire() { const now = timers.splice(0, timers.length); now.forEach(t => t.fn()); return now.length; },
  };
}
const bot = (n, difficulty) => ({ uid: 'bot:' + n, nickname: '🤖 Bot' + n, bot: { difficulty } });
const human = { uid: 'local:host', nickname: 'Hana' };

// Permutes the CONTENTS of the closed doors (the multiset is unchanged, so the
// unseen counts are too). Returns an undo.
function shuffleClosed(d, r) {
  const b = d.get('hsgB').S.board;
  const idx = [];
  b.forEach((c, i) => { if (c !== null && !c[2]) idx.push(i); });
  const before = idx.map(i => b[i]);
  const perm = before.slice();
  for (let k = perm.length - 1; k > 0; k--) { const j = Math.floor(r() * (k + 1)); const t = perm[k]; perm[k] = perm[j]; perm[j] = t; }
  idx.forEach((i, k) => { b[i] = perm[k]; });
  return () => idx.forEach((i, k) => { b[i] = before[k]; });
}
const closedLayout = d => JSON.stringify(d.get('hsgB').S.board.filter(c => c !== null && !c[2]));

// Starts a fresh Campaign on a host and fires the Battle intro (→ castle → a prompt).
function startCampaign(d, { len = 3, foxes = 4, seed = 1 } = {}) {
  d.set('hsgCampaignLen', len); d.set('hsgFoxes', foxes); d.set('hsgSeed', seed);
  d.ctx.hsgStartCampaign();
  d.fire();
}

// Runs every queued prompt the way the engine would (view at once, then decide,
// then submit), calling `each` before submit. Returns Commands taken.
function drain(d, each, cap = 600) {
  let n = 0;
  while (d.prompts.length && n < cap) {
    const p = d.prompts.shift();
    for (const seat of p.seats) {
      const slot = d.sandbox.mpPlayerSlots[seat];
      const view = d.ctx.hsgBotView(seat);
      const level = slot.bot.difficulty;
      const t0 = process.hrtime.bigint();
      const move = d.ctx.hsgBotDecide(view, level, xorshift(1000 + n));
      const ms = Number(process.hrtime.bigint() - t0) / 1e6;
      if (each) each({ seat, view, move, level, ms, tag: p.tag });
      d.ctx.hsgBotSubmit(seat, move, p.tag);
      n++;
    }
  }
  return n;
}

console.log('Hide and Shogun — the bots');
console.log('='.repeat(72));

// ═══════════════════════════════════════════════════════════════════════════
section('1 · Think time, per level (spec §11)');
{
  const d = makeHost([human, bot(0, 'medium')]);
  const r = xorshift(3);
  const within = (lv, lo, hi) => { for (let k = 0; k < 400; k++) { const v = d.ctx.hsgBotThinkMs(lv, r); if (v < lo || v > hi) return false; } return true; };
  const mean = lv => { let s = 0; for (let k = 0; k < 400; k++) s += d.ctx.hsgBotThinkMs(lv, r); return s / 400; };
  check('Easy thinks 700–1,200 ms', within('easy', 700, 1200));
  check('Medium thinks 900–1,600 ms', within('medium', 900, 1600));
  check('Hard thinks 1,100–2,000 ms', within('hard', 1100, 2000));
  check('…Hard the slowest on average, Easy the quickest', mean('hard') > mean('medium') && mean('medium') > mean('easy'));
  check('an unknown level falls back to Medium', within('nonsense', 900, 1600));
}

// ═══════════════════════════════════════════════════════════════════════════
section('2 · The view: the public copy + the unseen counts, a copy');
{
  const d = makeHost([human, bot(0, 'medium')]);
  d.set('hsgFirstSeat', 1);
  d.set('hsgCampaignLen', 3); d.set('hsgFoxes', 4); d.set('hsgSeed', 9);
  d.set('hsgSeals', [0, 0]); d.set('hsgBattleNo', 1); d.set('hsgReplay', false);
  d.ctx.hsgStartBattle(); d.fire();
  check('the Battle intro ending with the bot to move prompts it', d.prompts.length === 1 && eq(d.prompts[0].seats, [1]), JSON.stringify(d.prompts));
  const v = d.ctx.hsgBotView(1);
  check('the view holds exactly me, pub and unseen', eq(Object.keys(v).sort(), ['me', 'pub', 'unseen']), Object.keys(v).join());
  check('it knows whose seat it is', v.me === 1);
  check('its pub is the host\'s public copy, byte for byte', eq(v.pub, d.get('hsgPub')));
  const unseenTotal = Object.values(v.unseen).reduce((a, b) => a + b, 0);
  check('the unseen counts add up to the closed doors', unseenTotal === v.pub.board.filter(c => c === '#').length, unseenTotal + '');
  check('no layout rides along: nothing but "#" where a door is shut', v.pub.board.every(c => c === '#'));
  v.unseen[Object.keys(v.unseen)[0]] = -99; v.pub.board[0] = 'Sg0';
  check('it is a copy: the host\'s pool and pub are untouched',
    Object.values(d.get('hsgB').S.pool).every(n => n >= 0) && d.get('hsgPub').board[0] === '#');
}

// ═══════════════════════════════════════════════════════════════════════════
section('3–5 · Fairness, purity, legality — every Command of many bot Battles');
const hardMs = [], allMs = { easy: [], medium: [], hard: [] };
{
  let positions = 0, viewSame = 0, decSame = 0, pure = 0, legalN = 0, submitted = 0, shuffledReal = 0;
  let firstBad = '';
  const pairings = [];
  for (const a of LEVELS) for (const b of LEVELS) pairings.push([a, b]);
  let campaigns = 0;
  pairings.forEach(([a, b], pi) => {
    for (const foxes of [2, 4]) {
      const d = makeHost([bot(0, a), bot(1, b)]);
      startCampaign(d, { len: 1, foxes, seed: 31 + pi * 7 + foxes });
      campaigns++;
      const r = xorshift(77 + pi);
      drain(d, ({ seat, view, move, level, ms, tag }) => {
        positions++;
        allMs[level].push(ms);
        // Fairness at ALL THREE levels on this position, not just the seat's own.
        for (const lv of LEVELS) {
          const v0 = d.ctx.hsgBotView(seat);
          const m0 = d.ctx.hsgBotDecide(v0, lv, xorshift(5 + positions));
          const before = closedLayout(d);
          const undo = shuffleClosed(d, r);
          if (closedLayout(d) !== before) shuffledReal++;
          const v1 = d.ctx.hsgBotView(seat);
          const m1 = d.ctx.hsgBotDecide(v1, lv, xorshift(5 + positions));
          undo();
          if (eq(v0, v1)) viewSame++; else if (!firstBad) firstBad = 'view differs at ' + lv;
          if (eq(m0, m1)) decSame++; else if (!firstBad) firstBad = 'decision differs at ' + lv + ': ' + JSON.stringify([m0, m1]);
        }
        // Purity: deciding does not touch the view it was handed.
        const vc = JSON.stringify(view);
        d.ctx.hsgBotDecide(view, level, xorshift(9));
        if (JSON.stringify(view) === vc) pure++;
        // Legality on the host's REAL engine, before submit.
        const legal = d.ctx.HsgRules.battleLegal(d.get('hsgB')).map(x => JSON.stringify(x));
        if (Array.isArray(move) && legal.includes(JSON.stringify(move))) legalN++;
        else if (!firstBad) firstBad = 'illegal ' + JSON.stringify(move);
        const cmdBefore = d.get('hsgPub').cmd;
        // (drain submits right after this callback; the cmd advance is checked below)
        submitted += (tag === cmdBefore) ? 1 : 0;
      });
    }
  });
  const fairChecks = positions * LEVELS.length;
  console.log('   ' + campaigns + ' one-Battle Campaigns, ' + positions + ' bot Commands, ' + fairChecks + ' fairness comparisons');
  check('the shuffle really moves something (the test is not vacuous)', shuffledReal > positions, shuffledReal + ' of ' + fairChecks);
  check('FAIRNESS: the view is byte-identical under a shuffled layout, every level', viewSame === fairChecks, (fairChecks - viewSame) + ' differ — ' + firstBad);
  check('FAIRNESS: the decision is byte-identical under a shuffled layout, every level', decSame === fairChecks, (fairChecks - decSame) + ' differ — ' + firstBad);
  check('decide is pure: the view it is handed comes back unchanged', pure === positions);
  check('every bot Command is legal on the host\'s real engine', legalN === positions, (positions - legalN) + ' illegal — ' + firstBad);
  check('every prompt carried the live cmd as its tag', submitted === positions);
}

// The same comparison catches a view that leaks — a check that never fires proves nothing.
{
  const d = makeHost([human, bot(0, 'hard')]);
  startCampaign(d, { len: 1, seed: 5 });
  const leaky = i => Object.assign(d.ctx.hsgBotView(i), { layout: d.get('hsgB').S.board.map(c => c && c.slice()) });
  const v0 = leaky(1), undo = shuffleClosed(d, xorshift(8)), v1 = leaky(1); undo();
  check('a view that carries the layout fails the same comparison', !eq(v0, v1));
}

// ═══════════════════════════════════════════════════════════════════════════
section('5b · Submit: the host\'s record path; stale tags and wrong phases dropped');
{
  const d = makeHost([human, bot(0, 'medium')]);
  d.set('hsgFirstSeat', 1);
  d.set('hsgCampaignLen', 3); d.set('hsgFoxes', 4); d.set('hsgSeed', 3);
  d.set('hsgSeals', [0, 0]); d.set('hsgBattleNo', 1); d.set('hsgReplay', false);
  d.ctx.hsgStartBattle(); d.fire();
  const p = d.prompts.shift();
  const v = d.ctx.hsgBotView(1), m = d.ctx.hsgBotDecide(v, 'medium', xorshift(2));
  check('before the banners a bot can only Open', m[0] === 'U');
  const snap = JSON.stringify(d.get('hsgPub'));
  check('a stale tag is dropped', d.ctx.hsgBotSubmit(1, m, p.tag + 1) === false && JSON.stringify(d.get('hsgPub')) === snap);
  check('a missing move is dropped', d.ctx.hsgBotSubmit(1, null, p.tag) === false && JSON.stringify(d.get('hsgPub')) === snap);
  d.set('hsgPhase', 'chronicle');
  check('a wrong phase is dropped', d.ctx.hsgBotSubmit(1, m, p.tag) === false && JSON.stringify(d.get('hsgPub')) === snap);
  d.set('hsgPhase', 'castle');
  check('the live tag goes through hsgHostCommand', d.ctx.hsgBotSubmit(1, m, p.tag) === true && d.get('hsgPub').cmd === 1);
  check('…the same Command twice is dropped as stale', d.ctx.hsgBotSubmit(1, m, p.tag) === false && d.get('hsgPub').cmd === 1);
  check('…and the human is to move, with no new prompt', d.get('hsgPub').turnSeat === 0 && d.prompts.length === 0);
  // The human moves → the bot is prompted again with the new tag.
  const hm = d.ctx.HsgRules.battleLegal(d.get('hsgB'))[0];
  d.ctx.hsgHostCommand(0, hm);
  check('after the human\'s Command the bot is prompted with the new cmd', d.prompts.length === 1 && d.prompts[0].tag === 2 && eq(d.prompts[0].seats, [1]), JSON.stringify(d.prompts));
}

// ═══════════════════════════════════════════════════════════════════════════
section('6 · Bot-vs-bot Campaigns end (first to 1 / 3 / 5, every pairing)');
{
  let ended = 0, total = 0, battles = 0, stuck = '';
  for (const len of [1, 3, 5]) for (const a of LEVELS) for (const b of LEVELS) {
    total++;
    const d = makeHost([bot(0, a), bot(1, b)]);
    startCampaign(d, { len, foxes: len === 3 ? 2 : 4, seed: 100 + len * 13 + total });
    let guard = 0;
    while (guard++ < 40) {
      const n = drain(d);
      const B = d.get('hsgB');
      if (!B.over) { stuck = stuck || (a + ' v ' + b + ': Battle did not end after ' + n + ' Commands'); break; }
      battles++;
      check('a Battle ending cancels the bots (' + a + ' v ' + b + ')', d.prompts.length === 0);
      d.fire();                                          // the ending beat → chronicle / gameover
      const ph = d.get('hsgPhase');
      if (ph === 'gameover') { ended++; break; }
      if (ph !== 'chronicle') { stuck = stuck || ('phase ' + ph + ' after the ending'); break; }
      d.ctx.hsgHostNextBattle(0, { battleNo: d.get('hsgBattleNo'), replay: d.get('hsgReplay') });
      d.fire();                                          // the Battle intro → castle → a prompt
    }
    if (d.get('hsgPhase') === 'gameover') {
      check('the winner holds the Seals the Campaign asked for (' + len + ')', Math.max(...d.get('hsgSeals')) === len);
    }
  }
  console.log('   ' + total + ' Campaigns, ' + battles + ' Battles');
  check('every bot-vs-bot Campaign reaches its gameover', ended === total, stuck);
}

// ═══════════════════════════════════════════════════════════════════════════
section('7 · Hard\'s decide budget (Node; re-check on the iPhone SE)');
{
  // A dedicated Hard-vs-Hard run so the search (all doors open) gets plenty of positions.
  for (let k = 0; k < 6; k++) {
    const d = makeHost([bot(0, 'hard'), bot(1, 'hard')]);
    startCampaign(d, { len: 1, foxes: k % 2 ? 2 : 4, seed: 900 + k });
    drain(d, ({ ms, view }) => { if (!view.pub.board.includes('#')) hardMs.push(ms); allMs.hard.push(ms); });
  }
  const st = xs => { const s = xs.slice().sort((a, b) => a - b); return { n: s.length, mean: s.reduce((a, b) => a + b, 0) / (s.length || 1), p95: s[Math.floor(s.length * 0.95)] || 0, max: s[s.length - 1] || 0 }; };
  for (const lv of LEVELS) {
    const s = st(allMs[lv]);
    console.log('   ' + lv.padEnd(6) + ' n=' + String(s.n).padStart(4) + '  mean ' + s.mean.toFixed(2) + ' ms  p95 ' + s.p95.toFixed(2) + '  max ' + s.max.toFixed(2));
  }
  const h = st(hardMs);
  console.log('   hard, every door open (the look-ahead): n=' + h.n + '  mean ' + h.mean.toFixed(2) + ' ms  max ' + h.max.toFixed(2));
  check('the look-ahead was exercised (positions with every door open)', h.n >= 20, h.n + '');
  check('Hard decides in under ' + HARD_BUDGET_MS + ' ms, every position', st(allMs.hard).max < HARD_BUDGET_MS, st(allMs.hard).max.toFixed(1) + ' ms');
}

// ═══════════════════════════════════════════════════════════════════════════
section('8 · The level ladder (REPORTED, not asserted — spec §11)');
{
  const pairs = [['easy', 'medium'], ['medium', 'hard'], ['easy', 'hard']];
  for (const [a, b] of pairs) {
    const w = { [a]: 0, [b]: 0, truce: 0 };
    for (let k = 0; k < LADDER_BATTLES; k++) {
      const swap = k % 2 === 1;                            // each level sits in each seat half the time
      const lv = swap ? [b, a] : [a, b];
      const d = makeHost([bot(0, lv[0]), bot(1, lv[1])]);
      startCampaign(d, { len: 1, seed: 5000 + k });
      drain(d);
      const r = d.get('hsgPub').result;
      if (r.winnerSeat < 0) w.truce++; else w[lv[r.winnerSeat]]++;
    }
    console.log('   ' + (a + ' v ' + b).padEnd(16) + ' ' + a + ' ' + w[a] + ' · ' + b + ' ' + w[b] + ' · truce ' + w.truce + '   (' + LADDER_BATTLES + ' Battles)');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n' + '='.repeat(72));
if (fail) {
  console.log('✗ ' + fail + ' FAILED, ' + pass + ' passed');
  failures.forEach(f => console.log('   ✗ ' + f));
  process.exit(1);
}
console.log('✓ ' + pass + ' passed, 0 failed');
