// Port of sim/test_engine.py scenarios (brief v4) for the JS engine. Run:  node engine_tests.js
const assert = require('assert');
const H = require('./engine.js');
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

/* Build a Battle from rows. Tokens: 'I-Dm' (face-down), 'I-Dm^' (face-up), 'G-Gs' neutral Geisha, '..' empty.
 * raised = true sets team 0 = Ivory, team 1 = Crimson already. */
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
  S.dm = [IV, CR].map(col => cells.filter(c => c && c[0] === col && c[1] === 'Dm').length);
  if (raised) S.teamCol = [IV, CR];
  return B;
}
function kindFor(S, i) { const t = S.board[i][1]; return t === 'Gn' ? 'v' : t === 'Kn' ? 'k' : 'x'; }
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

let n = 0;
const ok = name => { n++; console.log('ok  ' + name); };

// ---------- Sample A (brief section 21) ----------
{
  const rows = [
    'I-Dm C-Gn I-Rn C-Sm I-On', 'C-On I-Kn C-Dm I-Gn C-Rn', 'I-Sg G-Gs I-Sm C-Rn G-Gs',
    'C-Sg I-On C-Kn I-Dm C-Gn', 'I-Gn C-Sm I-Rn C-On G-Gs', 'C-Dm I-Rn C-Rn I-Sm G-Gs'];
  const B = battleFrom(rows, {}, false);
  run(B, [['U', 'C3'], ['U', 'B3'], ['U', 'D3'], ['U', 'A3'], ['S', 'C3', 'D3'], ['S', 'B3', 'A3']]);
  assert.strictEqual(B.over.reason, 'shogun'); assert.strictEqual(B.over.winner, 1);
  assert.strictEqual(B.over.sgBy, 'Gs'); assert.strictEqual(B.S.cmd, 6);
  assert.strictEqual(B.over.sgExposed, false, 'Shogun was still Guarded (face-down Daimyo count)');
  assert.strictEqual(B.S.shrouds, 26);
  assert.deepStrictEqual(B.S.teamCol, [IV, CR]); assert.deepStrictEqual(B.S.hired, [0, 1]);
  ok('Sample A: Geisha hired by the Rearguard topples the Guarded Shogun in 6 Commands, 26 Shrouds left');
}
// a Guarded Shogun cannot be struck by a Daimyo, Gunner or Ronin
{
  const S = emptyState(); put(S, 'A3', IV, 'Sg'); put(S, 'B3', CR, 'Dm'); put(S, 'A4', CR, 'Gn'); put(S, 'A5', CR, 'Rn');
  assert(!genStrikes(S, CR).some(s => s[1] === pos('A3')));
  ok('Guard holds against Daimyo, Gunner, Ronin');
}
// ---------- C1: Charge past the Gunner ----------
{
  let S = emptyState(); put(S, 'C6', IV, 'Sm'); put(S, 'C3', CR, 'Gn'); put(S, 'C2', CR, 'Rn'); put(S, 'B3', CR, 'Rn', false); put(S, 'D3', CR, 'Rn', false);
  const a = genActions(S, IV);
  assert(has(a, ['C', pos('C6'), pos('C4')]) && has(a, ['M', pos('C6'), pos('C5')]));
  S = emptyState(); put(S, 'C5', IV, 'Sm'); put(S, 'C3', CR, 'Gn'); assert(hasStrike(S, CR, 'C3', 'C5', 'v'));
  S = emptyState(); put(S, 'C4', IV, 'Sm'); put(S, 'C3', CR, 'Gn');
  assert.strictEqual(genStrikes(S, CR).length, 0); assert(hasStrike(S, IV, 'C4', 'C3', 'x'));
  ok('C1 Charge past the Gunner');
}
// ---------- C2: Vault (v4: anything but a Geisha or a Guarded Shogun) ----------
{
  let S = emptyState(); put(S, 'B1', IV, 'Sg'); put(S, 'B2', CR, 'Gs'); put(S, 'B4', IV, 'Rn'); put(S, 'B6', IV, 'Kn');
  assert(hasStrike(S, IV, 'B6', 'B2', 'k'), 'v4: Kunoichi keeps the Geisha capture'); assert(hasStrike(S, CR, 'B2', 'B1', 'x'));
  assert(!genStrikes(S, IV).some(s => s[0] === pos('B1') && s[1] === pos('B2')), 'Shogun cannot strike a Geisha');
  S = emptyState(); put(S, 'B6', IV, 'Kn'); put(S, 'B4', IV, 'Rn'); put(S, 'B2', CR, 'Dm');
  assert(hasStrike(S, IV, 'B6', 'B2', 'k'), 'v4: the Vault ignores rank');
  S = emptyState(); put(S, 'B6', IV, 'Kn'); put(S, 'B4', IV, 'Rn'); put(S, 'B2', CR, 'Sg'); put(S, 'A2', CR, 'Dm');
  assert(!genStrikes(S, IV).some(s => s[1] === pos('B2')), 'Guarded Shogun is safe from the Vault');
  S.dm[CR] = 0; assert(hasStrike(S, IV, 'B6', 'B2', 'k'), 'Exposed Shogun is not');
  S = emptyState(); put(S, 'B3', IV, 'Kn'); put(S, 'B2', CR, 'Sm');
  assert.strictEqual(genStrikes(S, IV).length, 0, 'adjacent Kunoichi cannot Vault');
  S = emptyState(); put(S, 'B6', IV, 'Kn'); put(S, 'B4', IV, 'Rn'); put(S, 'B2', CR, 'Sm', false);
  assert(!genActions(S, IV).some(a => a[0] === 'S'), 'face-down piece beyond the screen: no Vault');
  S = emptyState(); put(S, 'B6', IV, 'Kn'); put(S, 'B4', CR, 'Rn', false); put(S, 'B2', CR, 'Sm');
  assert(hasStrike(S, IV, 'B6', 'B2', 'k'), 'Vault over a face-down screen');
  S = emptyState(); put(S, 'B6', IV, 'Kn'); put(S, 'B5', IV, 'Rn'); put(S, 'B4', IV, 'Rn'); put(S, 'B2', CR, 'Sm');
  assert(!hasStrike(S, IV, 'B6', 'B2', 'k'), 'two pieces between = no Vault');
  ok('C2 Vault (all but a Guarded Shogun, Geisha included; adjacent, face-down target, face-down screen, two screens)');
}
// ---------- Ronin: Ronin, Gunner, Geisha (v4), nothing else ----------
{
  const S = emptyState(); put(S, 'C3', IV, 'Rn'); put(S, 'C2', CR, 'Gs'); put(S, 'B3', CR, 'Sm'); put(S, 'D3', CR, 'Gn'); put(S, 'C4', CR, 'Rn');
  assert.deepStrictEqual(genStrikes(S, IV).map(x => x[1]).sort((p, q) => p - q), [pos('C2'), pos('D3'), pos('C4')].sort((p, q) => p - q));
  ok('Ronin strike Geisha, Gunner and Ronin only');
}
// ---------- Gunner fires at 2 or 3 ----------
{
  let S = emptyState(); put(S, 'A1', IV, 'Gn'); put(S, 'A4', CR, 'Sm');
  assert(hasStrike(S, IV, 'A1', 'A4', 'v'), 'Volley at distance 3');
  S = emptyState(); put(S, 'A1', IV, 'Gn'); put(S, 'A5', CR, 'Sm');
  assert.strictEqual(genStrikes(S, IV).length, 0, 'distance 4 is out of range');
  ok('Gunner Volley at distance 2 or 3');
}
// ---------- C3: Guard falls ----------
{
  const S = emptyState(); S.dm = [2, 1];
  put(S, 'D1', CR, 'Sg'); put(S, 'B1', CR, 'Dm'); put(S, 'B3', IV, 'Gn'); put(S, 'D2', IV, 'Rn');
  assert(!genStrikes(S, IV).some(s => s[1] === pos('D1')));
  assert(hasStrike(S, IV, 'B3', 'B1', 'v'));
  H.simApply(S, ['S', pos('B3'), pos('B1'), 'v']);
  assert.strictEqual(S.dm[CR], 0);
  assert(hasStrike(S, IV, 'D2', 'D1', 'x')); assert(hasStrike(S, CR, 'D1', 'D2', 'x'));
  ok('C3 the Guard falls');
}
// ---------- C4: Cast ----------
{
  let S = emptyState(); put(S, 'B4', IV, 'On'); put(S, 'C3', CR, 'Gn'); put(S, 'B3', CR, 'Rn', false); put(S, 'C4', IV, 'Rn', false);
  assert(hasStrike(S, IV, 'B4', 'C3', 'x'));
  S = emptyState(); put(S, 'B4', IV, 'On'); put(S, 'B3', CR, 'Gn');
  assert.strictEqual(genStrikes(S, IV).length, 0, 'Onmyoji cannot strike orthogonally');
  S = emptyState(); put(S, 'B4', IV, 'On'); put(S, 'C3', CR, 'Dm'); put(S, 'A3', CR, 'Gs'); put(S, 'C5', CR, 'Sg');
  assert(hasStrike(S, IV, 'B4', 'C3', 'x'), 'Cast on a Daimyo');
  assert(!strikesOf(S, IV).some(s => s.split(',')[1] === String(pos('A3')) || s.split(',')[1] === String(pos('C5'))));
  ok('C4 Cast (diagonal only, Daimyo yes, Geisha and Guarded Shogun no)');
}
// ---------- Gunner shoots over a Shroud, not adjacent, not a Geisha ----------
{
  let S = emptyState(); put(S, 'A1', IV, 'Gn'); put(S, 'A2', CR, 'Rn', false); put(S, 'A3', CR, 'Kn');
  assert(hasStrike(S, IV, 'A1', 'A3', 'v'), 'Volley over a Shroud');
  S = emptyState(); put(S, 'A1', IV, 'Gn'); put(S, 'A3', CR, 'Gs');
  assert.strictEqual(genStrikes(S, IV).length, 0, 'Gunner cannot hit a Geisha');
  ok('Gunner Volley over a Shroud');
}
// ---------- capture matrix (brief 4b) ----------
{
  const types = ['Sg', 'Dm', 'Sm', 'Kn', 'On', 'Gn', 'Rn', 'Gs'];
  const G = { Sg: '*', Dm: 1, Sm: 1, Kn: 1, On: 1, Gn: 1, Rn: 1, Gs: 0 }, K = Object.assign({}, G, { Gs: 1 });
  const exp = {
    Sg: G, Dm: G, Sm: { Sg: '*', Dm: 0, Sm: 1, Kn: 1, On: 0, Gn: 1, Rn: 1, Gs: 0 }, Kn: K, On: G, Gn: G,
    Rn: { Sg: '*', Dm: 0, Sm: 0, Kn: 0, On: 0, Gn: 1, Rn: 1, Gs: 1 }, Gs: { Sg: 1, Dm: 0, Sm: 0, Kn: 0, On: 0, Gn: 0, Rn: 0, Gs: 0 } };
  const cfg = makeCfg();
  for (const a of types) for (const t of types) {
    const e = exp[a][t], g = canHit(cfg, a, t, false), gx = canHit(cfg, a, t, true);
    if (e === '*') assert(!g && gx, a + '>' + t); else assert(!!e === g && g === gx, a + '>' + t);
  }
  ok('capture matrix matches brief 4b');
}
// ---------- Guard rules ----------
{
  const S = emptyState(); put(S, 'A1', CR, 'Sg'); put(S, 'B1', CR, 'Dm', false); put(S, 'A2', IV, 'Rn');
  assert(!exposed(S, CR) && genStrikes(S, IV).length === 0, 'face-down Daimyo guard a normally-hidden Shogun');
  S.fo[CR] = true;
  assert(exposed(S, CR) && hasStrike(S, IV, 'A2', 'A1', 'x'), 'shamed out + only face-down Daimyo = Exposed');
  S.board[pos('B1')][2] = true;
  assert(!exposed(S, CR) && genStrikes(S, IV).length === 0, 'a face-up Daimyo restores the Guard');
  S.board[pos('B1')] = null; S.dm[CR] = 0;
  assert(exposed(S, CR), 'no Daimyo = Exposed');
  ok('Guard / Exposed rules');
}
// ---------- Geisha for hire ----------
{
  for (const hire of [2, 4]) {
    const rng = H.makeRng(9);
    for (let g = 0; g < 30; g++) {
      const S = H.newState(makeCfg({ hire }), rng);
      assert.strictEqual(S.board.length, 30);
      assert.strictEqual(S.board.filter(c => c[0] === NEUTRAL).length, hire);
    }
  }
  assert.strictEqual(H.defaultRoster(4).Rn, 3); assert.strictEqual(H.defaultRoster(2).Rn, 4);
  ok('roster: 30 tiles with 2 or 4 Geisha (3 or 4 Ronin each)');
}
{ // hire cap: Crimson hires two, flips a third -> joins Ivory (brief C5)
  const rows = [
    'I-Dm C-Gn I-Rn C-Sm I-On', 'C-On I-Kn C-Dm I-Gn C-Rn', 'I-Sg G-Gs I-Sm C-Rn G-Gs',
    'C-Sg I-On C-Kn I-Dm C-Gn', 'I-Gn C-Sm I-Rn C-On G-Gs', 'C-Dm I-Rn C-Rn I-Sm G-Gs'];
  const B = battleFrom(rows, { night: null }, false);
  run(B, [['U', 'C3'], ['U', 'B3'], ['U', 'D3'], ['U', 'E3'], ['U', 'A3'], ['U', 'E5']]);
  const S = B.S;
  assert.deepStrictEqual(S.hired, [1, 2]);
  assert.strictEqual(S.board[pos('E5')][0], IV); assert.strictEqual(S.board[pos('B3')][0], CR); assert.strictEqual(S.board[pos('E3')][0], CR);
  assert.strictEqual(B.hires[2].joinedOpponent, true);
  ok('hire cap: a third Geisha flipped by a clan at the cap joins the opponent');
}
{ // Geisha flipped first, before the banners: waits, takes the flipper's colour once banners are raised (round-2 decision 6)
  const rows = [
    'G-Gs I-Sg I-Rn C-Rn C-Sg', 'I-Dm I-Dm I-Rn C-Rn C-Dm', '.. .. .. .. ..', '.. .. .. .. ..', '.. .. .. .. ..', '.. .. .. .. ..'];
  const B = battleFrom(rows, {}, false);
  run(B, [['U', 'A1']]);
  assert.strictEqual(B.S.teamCol[0], null, 'banners not raised by a Geisha');
  assert.strictEqual(B.S.board[pos('A1')][0], NEUTRAL, 'the Geisha waits');
  assert.strictEqual(B.S.pending.length, 1);
  // before the banners the only Commands are Unveils
  assert(H.battleLegal(B).every(a => a[0] === 'U'));
  run(B, [['U', 'B1']]);           // Rearguard unveils an Ivory Shogun: Rearguard are Ivory, Vanguard are Crimson
  assert.deepStrictEqual(B.S.teamCol, [CR, IV]);
  assert.strictEqual(B.S.board[pos('A1')][0], CR, 'waiting Geisha belongs to the Vanguard who flipped her, so she is Crimson');
  assert.strictEqual(B.S.pending.length, 0);
  ok('Geisha flipped before the banners waits and takes the flipper\'s colour');
}
// ---------- Shogun's Shame (v4: 5 own Commands, only a face-down Shogun) ----------
const SHAME = ['I-Sg I-Dm .. .. ..', 'I-Dm .. .. .. ..', 'I-Rn^ .. .. .. ..', '.. .. .. .. ..', '.. .. .. .. C-Rn^', '.. .. .. C-Dm C-Sg^'];
{
  const script = [];
  for (let k = 0; k < 5; k++) {
    script.push(k % 2 === 0 ? ['M', 'A3', 'A4'] : ['M', 'A4', 'A3']);
    script.push(k % 2 === 0 ? ['M', 'E5', 'D5'] : ['M', 'D5', 'E5']);
  }
  let B = run(battleFrom(SHAME, { night: null, forcedFight: true }, true), script);
  const sg = B.S.board.find(c => c && c[0] === IV && c[1] === 'Sg');
  assert(sg[2] === true && B.S.fo[IV] === true, 'face-down Shogun forced out at its 5th quiet Command');
  assert.deepStrictEqual(B.shameCount, [1, 0]); assert.strictEqual(B.shame[0], 9);
  assert.strictEqual(B.S.fo[CR], false, 'face-up Shogun is never forced out');
  assert(exposed(B.S, IV) && !exposed(B.S, CR));
  // legacy v2 wording would also force the face-up Shogun
  B = run(battleFrom(SHAME, { night: null, ffFacedownOnly: false, forcedFight: true }, true), script);
  assert.deepStrictEqual(B.shameCount, [1, 1]);
  // Unveil resets the count
  const SH2 = ['I-Sg I-Dm .. .. ..', 'I-Dm .. .. .. ..', 'I-Rn^ .. .. .. ..', 'I-Rn .. .. .. ..', '.. .. .. .. C-Rn^', '.. .. .. C-Dm C-Sg^'];
  const s2 = [];
  for (let k = 0; k < 8; k++) {
    if (k === 4) s2.push(['U', 'A4']); else s2.push((k < 4 ? k % 2 === 0 : k % 2 === 1) ? ['M', 'A3', 'B3'] : ['M', 'B3', 'A3']);
    s2.push(k % 2 === 0 ? ['M', 'E5', 'D5'] : ['M', 'D5', 'E5']);
  }
  B = run(battleFrom(SH2, { night: null, forcedFight: true }, true), s2);
  assert.deepStrictEqual(B.shameCount, [0, 0]); assert.strictEqual(B.S.stall[0], 3);
  ok("Shogun's Shame: only a face-down Shogun is forced; an Unveil resets the count");
  // Shame off
  B = run(battleFrom(SHAME, { night: null, forcedFight: false }, true), script);
  assert.deepStrictEqual(B.shameCount, [0, 0]);
  ok("Shogun's Shame switched off");
}
{ // a face-up Daimyo at the trigger keeps the Guard
  const rows = ['I-Sg I-Dm^ .. .. ..', 'I-Dm .. .. .. ..', 'I-Rn^ .. .. .. ..', '.. .. .. .. ..', '.. .. .. .. C-Rn^', '.. .. .. C-Dm C-Sg^'];
  const script = [];
  for (let k = 0; k < 5; k++) { script.push(k % 2 === 0 ? ['M', 'A3', 'A4'] : ['M', 'A4', 'A3']); script.push(k % 2 === 0 ? ['M', 'E5', 'D5'] : ['M', 'D5', 'E5']); }
  const B = run(battleFrom(rows, { night: null, forcedFight: true }, true), script);
  assert(B.S.fo[IV] && !exposed(B.S, IV), 'shamed out but a Daimyo is face-up: still Guarded');
  ok('Shogun\'s Shame with a face-up Daimyo: still Guarded');
}
// ---------- The Long Night (v4: 12 quiet Commands, face-up pieces only) ----------
{
  const NIGHT = ['I-Sg^ .. .. .. ..', 'I-Dm^ .. .. .. ..', 'I-Rn^ .. .. .. ..', '.. .. .. .. ..', 'C-Sg C-Dm C-Rn C-Rn ..', 'C-Rn^ .. .. .. C-Sm^'];
  const script = [];
  for (let k = 0; k < 6; k++) { script.push(k % 2 === 0 ? ['M', 'A3', 'B3'] : ['M', 'B3', 'A3']); script.push(k % 2 === 0 ? ['M', 'A6', 'B6'] : ['M', 'B6', 'A6']); }
  let B = run(battleFrom(NIGHT, { forcedFight: false }, true), script);
  assert(B.over.reason === 'night_count' && B.over.winner === 0 && B.over.nightCounts.join() === '3,2' && B.S.cmd === 12);
  B = run(battleFrom(NIGHT, { forcedFight: false, nightFaceup: false }, true), script);
  assert(B.over.reason === 'night_count' && B.over.winner === 1 && B.over.nightCounts.join() === '3,6');
  const T = NIGHT.slice(); T[0] = 'I-Sg^ .. .. .. C-Gs^';
  B = run(battleFrom(T, { forcedFight: false }, true), script);
  assert(B.over.reason === 'night_tie' && B.over.winner === -1 && B.over.nightCounts.join() === '3,3');
  ok('Long Night counts face-up pieces only; a tie is a Truce (a hired Geisha counts for her clan)');
  const long = []; for (let k = 0; k < 10; k++) { long.push(k % 2 === 0 ? ['M', 'A3', 'B3'] : ['M', 'B3', 'A3']); long.push(k % 2 === 0 ? ['M', 'A6', 'B6'] : ['M', 'B6', 'A6']); }
  B = run(battleFrom(NIGHT, { forcedFight: false, night: 20 }, true), long);
  assert(B.over && B.over.reason === 'night_count' && B.S.cmd === 20);
  ok('The Long Night is a fixed 12 quiet Commands (6 each); the config can still change it for tests');
}
// ---------- Surrounded ----------
{
  // Ivory's only piece, an Ronin in the corner, is boxed in by a Daimyo and a Samurai it cannot strike; no Shrouds left
  const rows = ['I-Rn^ C-Dm^ .. .. ..', 'C-Sm^ .. .. .. ..', '.. .. .. .. ..', '.. .. .. .. ..', '.. .. .. .. ..', '.. .. .. .. C-Sg^'];
  const B = battleFrom(rows, {}, true);
  B.S.dm = [0, 1];
  assert.strictEqual(H.battleLegal(B).length, 0, 'boxed-in Ronin has no Command');
  assert(H.battleCheckSurrounded(B));
  assert(B.over.reason === 'surrounded' && B.over.winner === 1);
  ok('Surrounded: no legal Command loses');
}
// ---------- the Geisha can always strike a Guarded Shogun; Kunoichi can strike an Exposed one ----------
{
  let S = emptyState(); put(S, 'A1', IV, 'Sg'); put(S, 'A2', CR, 'Gs'); put(S, 'D1', IV, 'Dm', false);
  assert(hasStrike(S, CR, 'A2', 'A1', 'x'));
  S = emptyState(); S.dm = [0, 2]; put(S, 'A1', IV, 'Sg'); put(S, 'A4', CR, 'Kn'); put(S, 'A2', CR, 'Rn');
  assert(hasStrike(S, CR, 'A4', 'A1', 'k'), 'Kunoichi Vaults onto an Exposed Shogun');
  ok('Geisha vs Guarded Shogun; Kunoichi vs Exposed Shogun');
}
console.log('\nALL ' + n + ' JS ENGINE CHECKS PASSED');
