// ═══════════════════════════════════════════════════════════════════════════
// verify-hsg-rules.js — asserts js/games/hsg-rules.js (Hide and Shogun's pure
// rules engine + bots) against tech spec docs/new-game-tech-hsg.md §15 S1.
//
//   node tools/verify-hsg-rules.js                      (exits 1 on any failure)
//   HSG_PARITY=<path>/parity.json node tools/…          (adds the Python parity replay)
//   HSG_RULES_SRC=path node tools/…                     (drive a different copy — proves a
//                                                        broken build actually fails here)
//
// It re-implements no rules: the shipped file is evaluated in a vm sandbox that has
// NOTHING in it (no window, no document, no module) — which is itself the purity check.
//
// What it covers (rules only — no presentation, no game state, no packets; those are S2+):
//   1  the file's own contract — bare-sandbox load, v5 ids only, no impure globals
//   2  the idea folder's engine_tests.js scenarios, ported to v5 ids
//   3  the v5 capture matrix (exp_matrix) and the Guard rules (a CLOSED Guard still guards)
//   4  the fox share, a fox found before the banners, the Last Lantern, Truce, Cornered
//   5  Shogun's Shame is gone (a face-down Shogun is never forced out)
//   6  closed doors are never read: masking every door leaves legality + bot decisions identical
//   7  the three bots play whole Battles: every Command legal, bookkeeping consistent, always ends
//   8  PARITY (only with HSG_PARITY): every legal list and transition replayed against the
//      Python reference, v4 codes mapped to v5. A trace stops at the Command where Shogun's
//      Shame would have fired — that rule is cut, so nothing after it can match. The count of
//      such games is reported, never hidden.
//
// The idea-folder reference stays runnable:
//   node "docs/new-ideas/hide and shogun/proto/engine_tests.js"
//
// Depends on: nothing (Node built-ins only). Reads: js/games/hsg-rules.js.
// ═══════════════════════════════════════════════════════════════════════════
const fs     = require('fs');
const path   = require('path');
const vm     = require('vm');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const SRC  = process.env.HSG_RULES_SRC || path.join(ROOT, 'js/games/hsg-rules.js');
const code = fs.readFileSync(SRC, 'utf8');

// A sandbox with NOTHING in it but console: if the file touches window / document / module it throws here.
const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(code, sandbox, { filename: SRC });
const H = sandbox.HsgRules;

// Arrays built inside the vm have a different Array.prototype, so assert.deepStrictEqual against a local literal
// fails on identity alone. Compare by JSON instead.
const same = (a, b, msg) => assert.strictEqual(JSON.stringify(a), JSON.stringify(b), msg);
let passed = 0, failed = 0;
function check(name, fn) {
  try { fn(); passed++; console.log('ok   ' + name); }
  catch (e) { failed++; console.log('FAIL ' + name + '\n       ' + String(e && e.stack || e).split('\n').slice(0, 4).join('\n       ')); }
}

// ── 1. The file's own contract ───────────────────────────────────────────────
check('1 loads in a bare vm and exposes the global HsgRules', () => {
  assert(H && typeof H === 'object', 'HsgRules is not on the sandbox global');
  for (const k of ['makeCfg', 'makeRng', 'newState', 'legal', 'genActions', 'genStrikes', 'canHit', 'exposed', 'applyAct',
    'newBattle', 'battleLegal', 'battleStep', 'battleCheckCornered', 'choose', 'playBattle', 'BOTS', 'BOT_LEVELS', 'IDS'])
    assert(k in H, 'missing export: ' + k);
});
check('1 loads under Node require() too (module.exports)', () => {
  const m = require(SRC);
  assert(m && m.makeCfg && m.IDS.join() === H.IDS.join());
});

const bare = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
check('1 v5 ids only: IDS, RANK, VALUE, THREAT, TYPE_NAME and the roster use exactly the eight', () => {
  const want = ['Sg', 'Gd', 'Mk', 'Sm', 'Nj', 'Ar', 'Fm', 'Fx'].sort().join();
  assert.strictEqual(H.IDS.slice().sort().join(), want);
  for (const t of [H.RANK, H.VALUE, H.THREAT, H.TYPE_NAME]) assert.strictEqual(Object.keys(t).sort().join(), want);
  assert.strictEqual(Object.keys(H.makeCfg().roster).sort().join(), ['Sg', 'Gd', 'Mk', 'Sm', 'Nj', 'Ar', 'Fm'].sort().join());
  assert.strictEqual(Object.keys(H.makeCfg().roster).includes('Fx'), false, 'foxes are not in a clan roster');
  assert.strictEqual(H.TYPE_NAME.Gd, 'Guard'); assert.strictEqual(H.TYPE_NAME.Fm, 'Farmer'); assert.strictEqual(H.TYPE_NAME.Fx, 'Fox');
  assert.strictEqual(H.COL_NAME[0], 'Indigo Moon'); assert.strictEqual(H.COL_NAME[1], 'Crimson Sun');
});
check('1 no v4 code survives as a string literal (Dm On Kn Gn Rn Gs)', () => {
  const left = bare.match(/['"](Dm|On|Kn|Gn|Rn|Gs)['"]/g);
  assert(!left, 'v4 codes left in the code: ' + left);
});
check('1 pure: no DOM, window, timers, clock or hsg* game state; Math.random only for the unseeded RNG', () => {
  const bad = bare.match(/\b(window|document|localStorage|sessionStorage|setTimeout|setInterval|requestAnimationFrame|performance|Date\.now|new Date)\b/g);
  assert(!bad, 'impure reference: ' + bad);
  assert(!/\bhsg[A-Z]\w*/.test(bare), 'reads an hsg* game variable');
  assert.strictEqual((bare.match(/Math\.random/g) || []).length, 1, 'Math.random must appear once (the unseeded makeRng)');
});
check('1 the retired vocabulary is not in the exports (Shame, Surrounded, Long Night)', () => {
  assert(!('battleCheckSurrounded' in H));
  const c = H.makeCfg();
  for (const k of ['forcedFight', 'ffN', 'ffFacedownOnly']) assert(!(k in c), 'cfg still has ' + k);
  const S = H.newState(c, H.makeRng(3));
  assert(!('fo' in S) && !('stall' in S), 'state still carries Shame bookkeeping');
});

// ── helpers (the idea folder's engine_tests.js, v5 ids) ─────────────────────
const { idx, makeCfg, genActions, genStrikes, exposed, canHit, NEUTRAL } = H;
const IV = 0, CR = 1;
const pos = s => idx('ABCDE'.indexOf(s[0]), +s[1] - 1);
const has = (list, a) => list.some(x => x.join(',') === a.join(','));
const strikesOf = (S, col) => genStrikes(S, col).map(x => x.join(','));
const hasStrike = (S, col, from, to, kind) => strikesOf(S, col).includes([pos(from), pos(to), kind].join(','));

function emptyState(cfgOver) {
  const cfg = makeCfg(cfgOver);
  const S = H.newState(cfg, H.makeRng(1));
  S.board = new Array(30).fill(null);
  S.teamCol = [IV, CR]; S.dm = [2, 2]; S.pool = {}; S.shrouds = 0;
  return S;
}
function put(S, p, col, t, up = true) { S.board[pos(p)] = [col, t, up]; }

/* Build a Battle from rows. Tokens: 'I-Gd' (closed), 'I-Gd^' (face-up), 'G-Fx' unclaimed fox, '..' empty.
 * raised = true sets team 0 = Indigo, team 1 = Crimson already. */
function battleFrom(rows, cfgOver, raised) {
  const B = H.newBattle(makeCfg(cfgOver), H.makeRng(1));
  const cells = [];
  for (const line of rows) for (const tok of line.trim().split(/\s+/)) {
    if (tok === '..') cells.push(null);
    else cells.push([{ I: IV, C: CR, G: NEUTRAL }[tok[0]], tok.slice(2, 4), tok.endsWith('^')]);
  }
  const S = B.S;
  S.board = cells; S.pool = {};
  for (const c of cells) if (c && !c[2]) { const k = c[0] + '|' + c[1]; S.pool[k] = (S.pool[k] || 0) + 1; }
  S.shrouds = cells.filter(c => c && !c[2]).length;
  S.dm = [IV, CR].map(col => cells.filter(c => c && c[0] === col && c[1] === 'Gd').length);
  if (raised) S.teamCol = [IV, CR];
  return B;
}
function kindFor(S, i) { const t = S.board[i][1]; return t === 'Ar' ? 'v' : t === 'Nj' ? 'l' : 'x'; }
function run(B, steps) {
  for (const st of steps) {
    assert(!B.over, 'Battle already over before ' + st.join(' '));
    const legal = H.battleLegal(B);
    let act;
    if (st[0] === 'U') act = ['U', pos(st[1])];
    else if (st[0] === 'M') act = ['M', pos(st[1]), pos(st[2])];
    else if (st[0] === 'C') act = ['C', pos(st[1]), pos(st[2])];
    else act = ['S', pos(st[1]), pos(st[2]), kindFor(B.S, pos(st[1]))];
    assert(has(legal, act), 'illegal scripted Command: ' + st.join(' '));
    H.battleStep(B, act);
  }
  return B;
}

// ── 2. engine_tests.js scenarios ─────────────────────────────────────────────
const SAMPLE_A = [
  'I-Gd C-Ar I-Fm C-Sm I-Mk', 'C-Mk I-Nj C-Gd I-Ar C-Fm', 'I-Sg G-Fx I-Sm C-Fm G-Fx',
  'C-Sg I-Mk C-Nj I-Gd C-Ar', 'I-Ar C-Sm I-Fm C-Mk G-Fx', 'C-Gd I-Fm C-Fm I-Sm G-Fx'];

check('2 Sample A: a fox found by the second clan topples the Guarded Shogun in 6 Commands, 26 doors left', () => {
  const B = battleFrom(SAMPLE_A, {}, false);
  run(B, [['U', 'C3'], ['U', 'B3'], ['U', 'D3'], ['U', 'A3'], ['S', 'C3', 'D3'], ['S', 'B3', 'A3']]);
  assert.strictEqual(B.over.reason, 'shogun'); assert.strictEqual(B.over.winner, 1);
  assert.strictEqual(B.over.sgBy, 'Fx'); assert.strictEqual(B.S.cmd, 6);
  assert.strictEqual(B.over.sgExposed, false, 'the Shogun was still Guarded (closed Guards count)');
  assert.strictEqual(B.S.shrouds, 26);
  same(B.S.teamCol, [IV, CR]); same(B.S.hired, [0, 1]);
});
check('2 a Guarded Shogun cannot be struck by a Guard, Archer or Farmer', () => {
  const S = emptyState(); put(S, 'A3', IV, 'Sg'); put(S, 'B3', CR, 'Gd'); put(S, 'A4', CR, 'Ar'); put(S, 'A5', CR, 'Fm');
  assert(!genStrikes(S, CR).some(s => s[1] === pos('A3')));
});
check('2 C1 the Samurai\'s Charge past the Archer', () => {
  let S = emptyState(); put(S, 'C6', IV, 'Sm'); put(S, 'C3', CR, 'Ar'); put(S, 'C2', CR, 'Fm'); put(S, 'B3', CR, 'Fm', false); put(S, 'D3', CR, 'Fm', false);
  const a = genActions(S, IV);
  assert(has(a, ['C', pos('C6'), pos('C4')]) && has(a, ['M', pos('C6'), pos('C5')]));
  S = emptyState(); put(S, 'C5', IV, 'Sm'); put(S, 'C3', CR, 'Ar'); assert(hasStrike(S, CR, 'C3', 'C5', 'v'));
  S = emptyState(); put(S, 'C4', IV, 'Sm'); put(S, 'C3', CR, 'Ar');
  assert.strictEqual(genStrikes(S, CR).length, 0); assert(hasStrike(S, IV, 'C4', 'C3', 'x'));
});
check('2 C2 the Ninja\'s Leap (anything but a Guarded Shogun, fox included; adjacent, closed target, closed screen, two screens)', () => {
  let S = emptyState(); put(S, 'B1', IV, 'Sg'); put(S, 'B2', CR, 'Fx'); put(S, 'B4', IV, 'Fm'); put(S, 'B6', IV, 'Nj');
  assert(hasStrike(S, IV, 'B6', 'B2', 'l'), 'the Ninja keeps the fox capture'); assert(hasStrike(S, CR, 'B2', 'B1', 'x'));
  assert(!genStrikes(S, IV).some(s => s[0] === pos('B1') && s[1] === pos('B2')), 'a Shogun cannot strike a fox');
  S = emptyState(); put(S, 'B6', IV, 'Nj'); put(S, 'B4', IV, 'Fm'); put(S, 'B2', CR, 'Gd');
  assert(hasStrike(S, IV, 'B6', 'B2', 'l'), 'the Leap ignores rank');
  S = emptyState(); put(S, 'B6', IV, 'Nj'); put(S, 'B4', IV, 'Fm'); put(S, 'B2', CR, 'Sg'); put(S, 'A2', CR, 'Gd');
  assert(!genStrikes(S, IV).some(s => s[1] === pos('B2')), 'a Guarded Shogun is safe from the Leap');
  S.dm[CR] = 0; assert(hasStrike(S, IV, 'B6', 'B2', 'l'), 'an Unguarded one is not');
  S = emptyState(); put(S, 'B3', IV, 'Nj'); put(S, 'B2', CR, 'Sm');
  assert.strictEqual(genStrikes(S, IV).length, 0, 'an adjacent Ninja cannot Leap');
  S = emptyState(); put(S, 'B6', IV, 'Nj'); put(S, 'B4', IV, 'Fm'); put(S, 'B2', CR, 'Sm', false);
  assert(!genActions(S, IV).some(a => a[0] === 'S'), 'a closed door beyond the screen: no Leap');
  S = emptyState(); put(S, 'B6', IV, 'Nj'); put(S, 'B4', CR, 'Fm', false); put(S, 'B2', CR, 'Sm');
  assert(hasStrike(S, IV, 'B6', 'B2', 'l'), 'Leap over a closed screen');
  S = emptyState(); put(S, 'B6', IV, 'Nj'); put(S, 'B5', IV, 'Fm'); put(S, 'B4', IV, 'Fm'); put(S, 'B2', CR, 'Sm');
  assert(!hasStrike(S, IV, 'B6', 'B2', 'l'), 'two pieces between = no Leap');
});
check('2 Farmers strike Farmer, Archer and Fox only', () => {
  const S = emptyState(); put(S, 'C3', IV, 'Fm'); put(S, 'C2', CR, 'Fx'); put(S, 'B3', CR, 'Sm'); put(S, 'D3', CR, 'Ar'); put(S, 'C4', CR, 'Fm');
  same(genStrikes(S, IV).map(x => x[1]).sort((p, q) => p - q), [pos('C2'), pos('D3'), pos('C4')].sort((p, q) => p - q));
});
check('2 the Archer fires at distance 2 or 3', () => {
  let S = emptyState(); put(S, 'A1', IV, 'Ar'); put(S, 'A4', CR, 'Sm');
  assert(hasStrike(S, IV, 'A1', 'A4', 'v'), 'Volley at distance 3');
  S = emptyState(); put(S, 'A1', IV, 'Ar'); put(S, 'A5', CR, 'Sm');
  assert.strictEqual(genStrikes(S, IV).length, 0, 'distance 4 is out of range');
});
check('2 C3 the Guard falls', () => {
  const S = emptyState(); S.dm = [2, 1];
  put(S, 'D1', CR, 'Sg'); put(S, 'B1', CR, 'Gd'); put(S, 'B3', IV, 'Ar'); put(S, 'D2', IV, 'Fm');
  assert(!genStrikes(S, IV).some(s => s[1] === pos('D1')));
  assert(hasStrike(S, IV, 'B3', 'B1', 'v'));
  H.simApply(S, ['S', pos('B3'), pos('B1'), 'v']);
  assert.strictEqual(S.dm[CR], 0);
  assert(hasStrike(S, IV, 'D2', 'D1', 'x')); assert(hasStrike(S, CR, 'D1', 'D2', 'x'));
});
check('2 C4 the Monk\'s diagonal strike (Guard yes, fox and Guarded Shogun no, orthogonal no)', () => {
  let S = emptyState(); put(S, 'B4', IV, 'Mk'); put(S, 'C3', CR, 'Ar'); put(S, 'B3', CR, 'Fm', false); put(S, 'C4', IV, 'Fm', false);
  assert(hasStrike(S, IV, 'B4', 'C3', 'x'));
  S = emptyState(); put(S, 'B4', IV, 'Mk'); put(S, 'B3', CR, 'Ar');
  assert.strictEqual(genStrikes(S, IV).length, 0, 'the Monk cannot strike orthogonally');
  S = emptyState(); put(S, 'B4', IV, 'Mk'); put(S, 'C3', CR, 'Gd'); put(S, 'A3', CR, 'Fx'); put(S, 'C5', CR, 'Sg');
  assert(hasStrike(S, IV, 'B4', 'C3', 'x'), 'the Monk strikes a Guard');
  assert(!strikesOf(S, IV).some(s => s.split(',')[1] === String(pos('A3')) || s.split(',')[1] === String(pos('C5'))));
});
check('2 the Archer shoots over a closed door; never a fox', () => {
  let S = emptyState(); put(S, 'A1', IV, 'Ar'); put(S, 'A2', CR, 'Fm', false); put(S, 'A3', CR, 'Nj');
  assert(hasStrike(S, IV, 'A1', 'A3', 'v'), 'Volley over a closed door');
  S = emptyState(); put(S, 'A1', IV, 'Ar'); put(S, 'A3', CR, 'Fx');
  assert.strictEqual(genStrikes(S, IV).length, 0, 'the Archer cannot hit a fox');
});

// ── 3. the capture matrix + Guard rules ─────────────────────────────────────
check('3 capture matrix (the v5 exp_matrix): who can strike whom', () => {
  const types = ['Sg', 'Gd', 'Sm', 'Nj', 'Mk', 'Ar', 'Fm', 'Fx'];
  const G = { Sg: '*', Gd: 1, Sm: 1, Nj: 1, Mk: 1, Ar: 1, Fm: 1, Fx: 0 }, K = Object.assign({}, G, { Fx: 1 });
  const exp = {
    Sg: G, Gd: G, Sm: { Sg: '*', Gd: 0, Sm: 1, Nj: 1, Mk: 0, Ar: 1, Fm: 1, Fx: 0 }, Nj: K, Mk: G, Ar: G,
    Fm: { Sg: '*', Gd: 0, Sm: 0, Nj: 0, Mk: 0, Ar: 1, Fm: 1, Fx: 1 }, Fx: { Sg: 1, Gd: 0, Sm: 0, Nj: 0, Mk: 0, Ar: 0, Fm: 0, Fx: 0 } };
  const cfg = makeCfg();
  for (const a of types) for (const t of types) {
    const e = exp[a][t], g = canHit(cfg, a, t, false), gx = canHit(cfg, a, t, true);
    if (e === '*') assert(!g && gx, a + '>' + t); else assert(!!e === g && g === gx, a + '>' + t);
  }
});
check('3 Guard / Unguarded: a CLOSED Guard still guards; a Guard in the open restores nothing it did not already give', () => {
  const S = emptyState(); put(S, 'A1', CR, 'Sg'); put(S, 'B1', CR, 'Gd', false); put(S, 'A2', IV, 'Fm');
  assert(!exposed(S, CR) && genStrikes(S, IV).length === 0, 'a closed Guard guards the Shogun');
  S.board[pos('B1')][2] = true;
  assert(!exposed(S, CR) && genStrikes(S, IV).length === 0, 'opening it changes nothing');
  S.board[pos('B1')] = null; S.dm[CR] = 0;
  assert(exposed(S, CR) && hasStrike(S, IV, 'A2', 'A1', 'x'), 'no Guard left = Unguarded');
  assert.strictEqual(exposed(S, NEUTRAL), false, 'a fox colour is never Unguarded');
});
check('3 roster: 30 doors, 2 or 4 foxes, 4 or 3 Farmers a clan, 15 a clan once its foxes join', () => {
  for (const hire of [2, 4]) {
    const rng = H.makeRng(9);
    for (let g = 0; g < 30; g++) {
      const S = H.newState(makeCfg({ hire }), rng);
      assert.strictEqual(S.board.length, 30);
      assert.strictEqual(S.board.filter(c => c[0] === NEUTRAL).length, hire);
      for (const col of [IV, CR]) {
        assert.strictEqual(S.board.filter(c => c[0] === col).length, 15 - hire / 2, 'a clan is 15 once its foxes have joined');
        assert.strictEqual(S.board.filter(c => c[0] === col && c[1] === 'Fm').length, hire === 4 ? 3 : 4);
      }
      assert(S.board.every(c => !c[2]), 'every door starts closed');
    }
  }
  assert.strictEqual(H.defaultRoster(4).Fm, 3); assert.strictEqual(H.defaultRoster(2).Fm, 4);
});

// ── 4. the fox share, the Last Lantern, Truce, Cornered ─────────────────────
check('4 fox share (A Skulk): a third fox flipped by a clan at its cap joins the other clan', () => {
  const B = battleFrom(SAMPLE_A, { night: null }, false);
  run(B, [['U', 'C3'], ['U', 'B3'], ['U', 'D3'], ['U', 'E3'], ['U', 'A3'], ['U', 'E5']]);
  const S = B.S;
  same(S.hired, [1, 2]);
  assert.strictEqual(S.board[pos('E5')][0], IV); assert.strictEqual(S.board[pos('B3')][0], CR); assert.strictEqual(S.board[pos('E3')][0], CR);
  assert.strictEqual(B.foxLog[2].joinedOpponent, true);
  assert.strictEqual(B.foxLog[0].joinedOpponent, false);
});
check('4 fox share (A Pair): one fox each; a second fox flipped by the same clan joins the other', () => {
  const rows = ['I-Sg G-Fx G-Fx C-Sg I-Gd', 'C-Gd I-Fm C-Fm I-Fm C-Fm', '.. .. .. .. ..', '.. .. .. .. ..', '.. .. .. .. ..', '.. .. .. .. ..'];
  const B = battleFrom(rows, { hire: 2, night: null }, true);
  run(B, [['U', 'B1'], ['U', 'B2'], ['U', 'C1']]);   // Indigo finds a fox; Crimson opens a Farmer; Indigo flips the second fox
  same(B.S.hired, [1, 1], 'the cap is one each');
  assert.strictEqual(B.foxLog[1].joinedOpponent, true);
  assert.strictEqual(B.S.board[pos('B1')][0], IV); assert.strictEqual(B.S.board[pos('C1')][0], CR);
});
check('4 a fox flipped before the banners waits and takes the flipper\'s colour', () => {
  const rows = ['G-Fx I-Sg I-Fm C-Fm C-Sg', 'I-Gd I-Gd I-Fm C-Fm C-Gd', '.. .. .. .. ..', '.. .. .. .. ..', '.. .. .. .. ..', '.. .. .. .. ..'];
  const B = battleFrom(rows, {}, false);
  run(B, [['U', 'A1']]);
  assert.strictEqual(B.S.teamCol[0], null, 'the banners are not raised by a fox');
  assert.strictEqual(B.S.board[pos('A1')][0], NEUTRAL, 'the fox waits');
  assert.strictEqual(B.S.pending.length, 1);
  assert(H.battleLegal(B).every(a => a[0] === 'U'), 'before the banners the only Commands are Opens');
  assert.strictEqual(H.countPieces(B.S, IV, true) + H.countPieces(B.S, CR, true), 0, 'a waiting fox counts for nobody');
  run(B, [['U', 'B1']]);   // the second player opens an Indigo Shogun: they are Indigo, the first player Crimson
  same(B.S.teamCol, [CR, IV]);
  assert.strictEqual(B.S.board[pos('A1')][0], CR, 'the waiting fox belongs to the first player who flipped her, so she is Crimson');
  assert.strictEqual(B.S.pending.length, 0);
});
const LANTERN = ['I-Sg^ .. .. .. ..', 'I-Gd^ .. .. .. ..', 'I-Fm^ .. .. .. ..', '.. .. .. .. ..', 'C-Sg C-Gd C-Fm C-Fm ..', 'C-Fm^ .. .. .. C-Sm^'];
const lanternScript = n => { const s = []; for (let k = 0; k < n / 2; k++) { s.push(k % 2 === 0 ? ['M', 'A3', 'B3'] : ['M', 'B3', 'A3']); s.push(k % 2 === 0 ? ['M', 'A6', 'B6'] : ['M', 'B6', 'A6']); } return s; };
check('4 the Last Lantern: 12 quiet Commands; the open pieces are counted, the closed are not', () => {
  let B = run(battleFrom(LANTERN, {}, true), lanternScript(12));
  assert(B.over.reason === 'lantern' && B.over.winner === 0 && B.over.counts.join() === '3,2' && B.S.cmd === 12);
  B = run(battleFrom(LANTERN, { nightFaceup: false }, true), lanternScript(12));
  assert(B.over.reason === 'lantern' && B.over.winner === 1 && B.over.counts.join() === '3,6', 'counting closed pieces flips it (so the rule is really "open only")');
  assert(B.over.events.some(e => e.t === 'lantern'));
});
check('4 Truce: equal counts end the Battle with no winner (a found fox counts for her clan)', () => {
  const T = LANTERN.slice(); T[0] = 'I-Sg^ .. .. .. C-Fx^';
  const B = run(battleFrom(T, {}, true), lanternScript(12));
  assert(B.over.reason === 'truce' && B.over.winner === -1 && B.over.counts.join() === '3,3');
});
check('4 the lantern is configurable for tests only; an Open or Strike relights it', () => {
  const B = run(battleFrom(LANTERN, { night: 20 }, true), lanternScript(20));
  assert(B.over && B.over.reason === 'lantern' && B.S.cmd === 20);
  const R = battleFrom(['I-Sg^ .. .. .. ..', 'I-Fm^ .. .. .. ..', 'I-Fm .. .. .. ..', '.. .. .. .. ..', '.. .. .. .. C-Fm', '.. .. .. C-Sg^ C-Fm^'], {}, true);
  run(R, [['M', 'A2', 'B2'], ['M', 'D6', 'D5']]);
  assert.strictEqual(R.S.quiet, 2);
  run(R, [['U', 'A3']]);
  assert.strictEqual(R.S.quiet, 0, 'an Open relights the lantern');
});
check('4 Cornered: no legal Command loses', () => {
  const rows = ['I-Fm^ C-Gd^ .. .. ..', 'C-Sm^ .. .. .. ..', '.. .. .. .. ..', '.. .. .. .. ..', '.. .. .. .. ..', '.. .. .. .. C-Sg^'];
  const B = battleFrom(rows, {}, true);
  B.S.dm = [0, 1];
  assert.strictEqual(H.battleLegal(B).length, 0, 'a boxed-in Farmer has no Command');
  assert(H.battleCheckCornered(B));
  assert(B.over.reason === 'cornered' && B.over.winner === 1);
});
check('4 the fox always strikes a Guarded Shogun; the Ninja strikes an Unguarded one', () => {
  let S = emptyState(); put(S, 'A1', IV, 'Sg'); put(S, 'A2', CR, 'Fx'); put(S, 'D1', IV, 'Gd', false);
  assert(hasStrike(S, CR, 'A2', 'A1', 'x'));
  S = emptyState(); S.dm = [0, 2]; put(S, 'A1', IV, 'Sg'); put(S, 'A4', CR, 'Nj'); put(S, 'A2', CR, 'Fm');
  assert(hasStrike(S, CR, 'A4', 'A1', 'l'), 'the Ninja Leaps onto an Unguarded Shogun');
});
check('4 a Strike on the Shogun ends the Battle at once: the striker\'s team wins, sgBy says who (a Farmer = Gekokujo)', () => {
  const rows = ['I-Fm^ C-Sg^ .. .. ..', '.. .. .. .. ..', '.. .. .. .. ..', '.. .. .. .. ..', '.. .. .. .. ..', '.. .. .. .. I-Sg^'];
  const B = battleFrom(rows, {}, true); B.S.dm = [0, 0];
  const out = run(B, [['S', 'A1', 'B1']]).over;
  assert(out.reason === 'shogun' && out.winner === 0 && out.sgBy === 'Fm' && out.sgExposed === true && out.fallen === CR);
  same(B.S.board[pos('B1')], [IV, 'Fm', true], 'the strike is played on the board so the end screen can show it');
  assert.strictEqual(B.team, 0, 'the turn does not pass after the Battle ends');
});

// ── 5. Shame is gone ─────────────────────────────────────────────────────────
check('5 a face-down Shogun is never forced out, however long the quiet (forcedFight is ignored)', () => {
  const SHOGUN_DOWN = ['I-Sg I-Gd .. .. ..', 'I-Gd .. .. .. ..', 'I-Fm^ .. .. .. ..', '.. .. .. .. ..', '.. .. .. .. C-Fm^', '.. .. .. C-Gd C-Sg^'];
  const script = [];
  for (let k = 0; k < 20; k++) {
    script.push(k % 2 === 0 ? ['M', 'A3', 'A4'] : ['M', 'A4', 'A3']);
    script.push(k % 2 === 0 ? ['M', 'E5', 'D5'] : ['M', 'D5', 'E5']);
  }
  for (const over of [{ night: null }, { night: null, forcedFight: true, ffN: 5 }]) {
    const B = run(battleFrom(SHOGUN_DOWN, over, true), script);
    const sg = B.S.board.find(c => c && c[0] === IV && c[1] === 'Sg');
    assert.strictEqual(sg[2], false, 'the Indigo Shogun was flipped by something');
    assert.strictEqual(exposed(B.S, IV), false, 'still Guarded');
    assert.strictEqual(B.S.cmd, 40);
  }
});

// ── 6. closed doors are never read ───────────────────────────────────────────
// The spec's claim (§4): legality + the bots work from a state whose closed doors are opaque. hsg.js builds
// that state in S2 (hsgMaskedState); here is the rules-level proof it can be built.
const maskOf = S => {
  const M = Object.assign({}, S);
  M.board = S.board.map(c => c === null ? null : (c[2] ? [c[0], c[1], true] : [-1, '?', false]));
  M.teamCol = S.teamCol.slice(); M.dm = S.dm.slice(); M.hired = S.hired.slice(); M.pool = Object.assign({}, S.pool); M.pending = [];
  return M;
};
const closedCount = S => S.board.filter(c => c !== null && !c[2]).length;
const tally = S => { const t = {}; for (const c of S.board) if (c && !c[2]) { const k = c[0] + '|' + c[1]; t[k] = (t[k] || 0) + 1; } return t; };
const sortedKeys = o => Object.keys(o).filter(k => o[k] > 0).sort().map(k => k + '=' + o[k]).join();

/* Plays a Battle with bot `a` (team 0) vs `b` (team 1) and calls `each(B)` before every Command. */
function playWatched(cfg, a, b, seed, each) {
  const rng = H.makeRng(seed), B = H.newBattle(cfg, rng);
  while (!B.over) {
    if (B.S.cmd >= cfg.maxCmd) { B.over = { over: true, winner: -1, reason: 'cap', events: [] }; break; }
    if (H.battleCheckCornered(B)) break;
    each(B);
    const act = H.choose(B.S, B.team, rng, [a, b][B.team]);
    if (act === null) { B.over = { over: true, winner: 1 - B.team, reason: 'cornered', events: [] }; break; }
    H.battleStep(B, act);
  }
  return B;
}

check('6 masking every closed door leaves both colours\' legal lists identical (every state of 40 Battles)', () => {
  let states = 0;
  for (let seed = 1; seed <= 40; seed++) {
    playWatched(makeCfg({ hire: seed % 2 ? 4 : 2 }), H.BOTS.easy, H.BOTS.cautious, seed, B => {
      const S = B.S, M = maskOf(S);
      for (const col of [IV, CR]) {
        same(H.genActions(M, col), H.genActions(S, col), 'legal list differs at cmd ' + S.cmd);
        assert.strictEqual(H.exposed(M, col), H.exposed(S, col));
      }
      states++;
    });
  }
  assert(states > 1000, 'too few states sampled: ' + states);
});
check('6 swapping the contents of closed doors leaves legality identical', () => {
  for (let seed = 100; seed < 120; seed++) {
    playWatched(makeCfg(), H.BOTS.easy, H.BOTS.easy, seed, B => {
      const S = B.S, closed = [];
      S.board.forEach((c, i) => { if (c && !c[2]) closed.push(i); });
      if (closed.length < 2) return;
      const before = [IV, CR].map(col => JSON.stringify(H.genActions(S, col)));
      const contents = closed.map(i => S.board[i].slice());
      const rot = contents.slice(1).concat(contents.slice(0, 1));
      closed.forEach((i, n) => { S.board[i] = rot[n].slice(); });
      same([IV, CR].map(col => JSON.stringify(H.genActions(S, col))), before, 'legality read a closed door');
      closed.forEach((i, n) => { S.board[i] = contents[n]; });
    });
  }
});
check('6 each bot decides identically on the real board and on the masked one (doors still closed)', () => {
  let compared = 0;
  for (const name of ['easy', 'cautious', 'search3']) {
    for (let seed = 1; seed <= 25; seed++) {
      playWatched(makeCfg(), H.BOTS.easy, H.BOTS.cautious, 300 + seed, B => {
        const S = B.S;
        if (S.shrouds === 0 || B.over) return;
        const M = maskOf(S);
        // `team` may be pre-banners (teamCol null) — choose() handles that; the masked copy keeps teamCol.
        const real = H.choose(S, B.team, H.makeRng(seed * 7 + S.cmd), H.BOTS[name]);
        const mask = H.choose(M, B.team, H.makeRng(seed * 7 + S.cmd), H.BOTS[name]);
        same(mask, real, name + ' decided from a closed door at cmd ' + S.cmd);
        compared++;
      });
    }
  }
  assert(compared > 900, 'too few decisions compared: ' + compared);
});

// ── 7. the bots play whole Battles ───────────────────────────────────────────
check('7 bot-vs-bot Battles: every Command legal, bookkeeping consistent, always ends in a real result', () => {
  const lv = ['easy', 'cautious', 'search3'], reasons = {};
  let battles = 0, longest = 0;
  for (const a of lv) for (const b of lv) {
    const n = (a === 'search3' || b === 'search3') ? 6 : 24;
    for (let seed = 1; seed <= n; seed++) {
      const cfg = makeCfg({ hire: seed % 2 ? 4 : 2 });
      const B = playWatched(cfg, H.BOTS[a], H.BOTS[b], 5000 + seed, B => {
        const S = B.S;
        // bookkeeping: unseen counts, closed-door count and Guards left all agree with the board
        assert.strictEqual(S.shrouds, closedCount(S), 'S.shrouds drifted at cmd ' + S.cmd);
        assert.strictEqual(sortedKeys(S.pool), sortedKeys(tally(S)), 'S.pool drifted at cmd ' + S.cmd);
        for (const col of [IV, CR]) assert.strictEqual(S.dm[col], S.board.filter(c => c && c[0] === col && c[1] === 'Gd').length, 'S.dm drifted');
        assert(S.hired[0] <= Math.floor(cfg.hire / 2) + 1 && S.hired[1] <= Math.floor(cfg.hire / 2) + 1);
        if (S.teamCol[0] === null) assert(H.battleLegal(B).every(x => x[0] === 'U'));
      });
      assert(B.over && ['shogun', 'lantern', 'truce', 'cornered'].includes(B.over.reason), a + ' v ' + b + ' seed ' + seed + ' ended: ' + (B.over && B.over.reason));
      assert(B.S.cmd < 800, 'a Battle ran past the spec\'s ~770-Command bound: ' + B.S.cmd);
      reasons[B.over.reason] = (reasons[B.over.reason] || 0) + 1; battles++; longest = Math.max(longest, B.S.cmd);
    }
  }
  console.log('       ' + battles + ' Battles; reasons ' + JSON.stringify(reasons) + '; longest ' + longest + ' Commands');
});
check('7 a bot Command is always one of the legal Commands (all three levels, mid-Battle states)', () => {
  let n = 0;
  for (const name of ['easy', 'cautious', 'search3']) {
    for (let seed = 1; seed <= 20; seed++) {
      playWatched(makeCfg(), H.BOTS.cautious, H.BOTS.easy, 900 + seed, B => {
        const S = B.S, me = S.teamCol[B.team];
        const act = H.choose(S, B.team, H.makeRng(seed + S.cmd), H.BOTS[name]);
        assert(act !== null && has(H.battleLegal(B), act), name + ' chose an illegal Command ' + JSON.stringify(act));
        n++;
      });
    }
  }
  assert(n > 800);
});
check('7 same seed, same Battle (the RNG is the only source of chance)', () => {
  const play = () => { const B = H.playBattle(makeCfg(), [H.BOTS.cautious, H.BOTS.easy], H.makeRng(77)); return B.moves.join('|'); };
  assert.strictEqual(play(), play());
  assert.notStrictEqual(play(), (() => { const B = H.playBattle(makeCfg(), [H.BOTS.cautious, H.BOTS.easy], H.makeRng(78)); return B.moves.join('|'); })());
});
check('7 BOT_LEVELS maps the suite\'s three levels onto shipped bots', () => {
  same(Object.keys(H.BOT_LEVELS).sort(), ['easy', 'hard', 'medium']);
  for (const v of Object.values(H.BOT_LEVELS)) assert(H.BOTS[v], 'no such bot: ' + v);
  same(Object.keys(H.BOTS).sort(), ['cautious', 'easy', 'search3']);
});

// ── 8. parity against the Python reference ──────────────────────────────────
const PARITY = process.env.HSG_PARITY;
if (!PARITY) {
  console.log('skip 8 PARITY — HSG_PARITY is not set (point it at docs/new-ideas/hide and shogun/parity.json; the file is git-ignored)');
} else {
  check('8 PARITY: every legal list and transition matches the Python trace (v4 codes mapped to v5)', () => {
    const data = JSON.parse(fs.readFileSync(PARITY, 'utf8'));
    const T = { Sg: 'Sg', Dm: 'Gd', On: 'Mk', Sm: 'Sm', Kn: 'Nj', Gn: 'Ar', Rn: 'Fm', Gs: 'Fx' };
    const REASON = { shogun: 'shogun', night_count: 'lantern', night_tie: 'truce', surrounded: 'cornered' };
    const mapAct = a => a === null ? null : (a.length === 4 ? [a[0], a[1], a[2], a[3] === 'k' ? 'l' : a[3]] : a.slice());
    const mapBoard = b => b.map(c => c === null ? null : [c[0], T[c[1]], !!c[2]]);
    const key = a => JSON.stringify(a);
    const canon = list => list.map(x => mapAct(x).join(',')).sort();
    const build = (snap, cfgd) => {
      const cfg = makeCfg({ hire: cfgd.hire, night: cfgd.night, knHitsGs: cfgd.knHitsGs });
      const S = H.newState(cfg, H.makeRng(1));
      S.board = mapBoard(snap.board);
      S.teamCol = snap.teamCol.slice(); S.dm = snap.dm.slice(); S.hired = snap.hired.slice();
      S.quiet = snap.quiet; S.shrouds = snap.shrouds; S.cmd = snap.cmd;
      S.pending = snap.pending.map(([i, t]) => [S.board[i], t]);
      S.pool = tally(S);
      return S;
    };
    const compare = (S, snap, where) => {
      const nb = mapBoard(snap.board);
      const got = { board: S.board.map(c => c === null ? null : [c[0], c[1], c[2]]), teamCol: S.teamCol, dm: S.dm, hired: S.hired, quiet: S.quiet,
        shrouds: S.shrouds, cmd: S.cmd, pending: S.pending.map(([pc, t]) => [S.board.indexOf(pc), t]) };
      const want = { board: nb, teamCol: snap.teamCol, dm: snap.dm, hired: snap.hired, quiet: snap.quiet, shrouds: snap.shrouds, cmd: snap.cmd, pending: snap.pending };
      for (const f of Object.keys(got)) if (key(got[f]) !== key(want[f])) throw new Error('state mismatch in ' + f + ' at ' + where + '\n js: ' + key(got[f]) + '\n py: ' + key(want[f]));
      const wantPool = {}; for (const c of nb) if (c && !c[2]) { const k = c[0] + '|' + c[1]; wantPool[k] = (wantPool[k] || 0) + 1; }
      if (sortedKeys(S.pool) !== sortedKeys(wantPool)) throw new Error('S.pool (unseen counts) mismatch at ' + where);
    };
    // Would Shogun's Shame (cut) have fired on this Command in the Python run? Exactly the Python condition:
    // forced_fight, banners up, a quiet Command (March/Charge), own stall count reaching ffN, own Shogun still closed.
    const shameFires = (r, cfgd) => {
      if (!cfgd.forcedFight || r.act === null || r.before.teamCol[r.team] === null) return false;
      if (r.act[0] !== 'M' && r.act[0] !== 'C') return false;
      if (r.before.stall[r.team] + 1 < cfgd.ffN) return false;
      const me = r.before.teamCol[r.team];
      return r.before.board.some(c => c !== null && c[0] === me && c[1] === 'Sg' && !c[2]);
    };
    let games = 0, truncated = 0, legals = 0, trans = 0, ends = 0;
    data.forEach((g, gi) => {
      games++;
      for (let ri = 0; ri < g.records.length; ri++) {
        const r = g.records[ri], where = 'game ' + gi + ' cmd ' + ri;
        if (r.before.fo.some(x => x)) throw new Error('trace carries a Shame state before the cut point at ' + where + ' (harness bug)');
        const S = build(r.before, g.cfg);
        for (const col of [0, 1]) {
          const js = canon(H.genActions(S, col)), py = canon(r.legal[col]);
          if (key(js) !== key(py)) throw new Error('legal list mismatch col ' + col + ' at ' + where + '\n js-py: ' + js.filter(x => !py.includes(x)) + '\n py-js: ' + py.filter(x => !js.includes(x)));
          if (H.exposed(S, col) !== r.exposed[col]) throw new Error('exposed mismatch at ' + where);
          legals++;
        }
        if (r.act === null) { ends++; break; }
        if (shameFires(r, g.cfg)) { truncated++; break; }
        const out = H.applyAct(S, r.team, mapAct(r.act));
        const next = g.records[ri + 1];
        if (next) { compare(S, next.before, where); if (out.over) throw new Error('JS ended the Battle early at ' + where + ' ' + out.reason); trans++; }
        else {
          if (!out.over) throw new Error('JS did not end the Battle at ' + where);
          const res = g.result;
          if (out.winner !== res.winner || out.reason !== REASON[res.reason]) throw new Error('result mismatch at ' + where + ' js ' + out.winner + '/' + out.reason + ' py ' + res.winner + '/' + res.reason);
          if (res.reason.startsWith('night') && key(out.counts) !== key(res.nightCounts)) throw new Error('lantern counts mismatch at ' + where);
          if (S.cmd !== res.cmds) throw new Error('command count mismatch at ' + where);
          ends++; trans++;
        }
      }
    });
    console.log('       PARITY: ' + games + ' games, ' + legals + ' legal-list comparisons, ' + trans + ' transitions, ' + ends + ' endings; '
      + truncated + ' games replayed only up to the Command where Shogun\'s Shame (cut) would have fired');
  });
}

console.log('\n' + (failed ? 'FAILED' : 'ALL PASSED') + ' — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
