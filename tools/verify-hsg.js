// ═══════════════════════════════════════════════════════════════════════════
// verify-hsg.js — Hide and Shogun's state machine, headless (spec §15, stage S2).
//
//   node tools/verify-hsg.js        (exits 1 on any failure)
//   HSG_SRC=<path> node tools/verify-hsg.js   drive a deliberately broken copy
//
// Loads the REAL js/games/hsg-rules.js + js/games/hsg.js into one vm and plays
// them. No rules are re-implemented here, so the harness cannot drift from
// shipped code. The sandbox follows new-game-process.md § Verifying the rules
// engine: getElementById → null, setTimeout CAPTURED and never fired unless a
// test steps it, and mpSendEnvelope / mpSendPrivate THROW in 'single' mode so a
// broadcast leaking into one-phone play fails loudly.
//
// What this proves (rules, packets, state — never presentation):
//   1. The Campaign: first to 1 / 3 / 5; a Truce keeps the Battle number; the
//      first move alternates every Battle, replays included; New Campaign.
//   2. hsgHostCommand with an explicit seat plays BOTH seats; a wrong seat, a
//      stale cmd and an illegal action are each refused and change nothing.
//   3. PRIVACY: shuffling the closed doors' contents leaves hsgPub
//      byte-identical, no '#' cell ever carries more than '#', and the masked
//      state the CLIENT lights its moves from gives exactly the host engine's
//      legal Commands, every Command of hundreds of random Battles.
//   4. The wire codec: every pub survives Firebase's erase-empties behaviour
//      and comes back byte-identical; hsgWirePub is idempotent and total.
//   5. Every ending (Found you!, Gekokujo!, Last Lantern, Truce, Cornered) with
//      the right Seal, the right counts and the right screen.
//   6. The Battle-intro and ending timers are SCHEDULED, and cleared by a
//      teardown. The Battle intro's three states (toss · battle · replay) and
//      its length come from the pub alone; the Intro brief variant follows The
//      Campaign and exists in the template (S5). Host-mode packets: shape, wire round-trip, repair, bot prompts.
//
// Not covered, deliberately: the client RECEIVE path (S7 loopback), the bots'
// decisions (S8), layout. Headless harnesses cannot see those.
// ═══════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT     = path.join(__dirname, '..');
const rulesSrc = fs.readFileSync(path.join(ROOT, 'js/games/hsg-rules.js'), 'utf8');
const hsgSrc   = fs.readFileSync(process.env.HSG_SRC || path.join(ROOT, 'js/games/hsg.js'), 'utf8');

// ── Check plumbing ─────────────────────────────────────────────────────────
let pass = 0, fail = 0;
const failures = [];
function check(name, cond, detail) {
  if (cond) { pass++; return; }
  fail++; failures.push(name + (detail ? '  — ' + detail : ''));
}
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const section = t => console.log('\n── ' + t);

// ── The wire: what Firebase RTDB actually does to a payload (verify-cjar-loopback) ──
function fbWrite(v) {
  if (v === null || v === undefined) return undefined;
  if (typeof v !== 'object') return v;
  const out = {};
  const keys = Array.isArray(v) ? v.map((_, i) => String(i)) : Object.keys(v);
  keys.forEach(k => {
    const w = fbWrite(Array.isArray(v) ? v[Number(k)] : v[k]);
    if (w !== undefined) out[k] = w;
  });
  return Object.keys(out).length ? out : undefined;     // {} and [] are deletions
}
function fbRead(v) {
  if (v === undefined || v === null || typeof v !== 'object') return v;
  const keys = Object.keys(v);
  const numeric = keys.length > 0 && keys.every(k => /^\d+$/.test(k));
  if (numeric) {
    const max = Math.max(...keys.map(Number));
    if (keys.length * 2 > max + 1) {                     // at least half dense → an array, holes are null
      const arr = [];
      for (let i = 0; i <= max; i++) arr[i] = Object.prototype.hasOwnProperty.call(v, String(i)) ? fbRead(v[String(i)]) : null;
      return arr;
    }
  }
  const out = {};
  keys.forEach(k => { out[k] = fbRead(v[k]); });
  return out;
}
const wire = x => { const s = fbWrite(x); return s === undefined ? undefined : fbRead(s); };

// ── One device ─────────────────────────────────────────────────────────────
function makeDevice() {
  const timers = [], screens = [], sent = [], priv = [], botPrompts = [];
  let tid = 0, botCancels = 0;
  const sandbox = {
    console,
    document: { getElementById: () => null, querySelectorAll: () => [], createElement: () => ({}) },
    window: { syllyMultiplayerMode: 'single' },
    setTimeout: (fn, ms) => { timers.push({ fn, ms, id: ++tid }); return tid; },
    clearTimeout: id => { const i = timers.findIndex(t => t.id === id); if (i >= 0) timers.splice(i, 1); },
    showScreen: id => screens.push(id),
    // THROW outside host mode: a broadcast leaking into one-phone play must fail loudly.
    mpSendEnvelope: env => { if (sandbox.window.syllyMultiplayerMode !== 'host') throw new Error('mpSendEnvelope called in ' + sandbox.window.syllyMultiplayerMode); sent.push(env); },
    mpSendPrivate: (uid, env) => { if (sandbox.window.syllyMultiplayerMode !== 'host') throw new Error('mpSendPrivate called in ' + sandbox.window.syllyMultiplayerMode); priv.push({ uid, env }); },
    mpPlayerSlots: [{ uid: 'u0', nickname: 'Hana' }, { uid: 'u1', nickname: 'Priya' }],
    mpMyPlayerIdx: 0,
    mpIsBotSlot: s => !!s && String(s.uid).indexOf('bot:') === 0,
    mpSeatLabel: i => sandbox.mpPlayerSlots[i].nickname,
    mpBotsPrompt: (tag, seats) => botPrompts.push({ tag, seats }),
    mpBotsCancel: () => { botCancels++; },
  };
  const ctx = vm.createContext(sandbox);
  vm.runInContext(rulesSrc, ctx, { filename: 'hsg-rules.js' });
  // The vm gotcha: `let` state is invisible from outside. A bridge reads/writes it.
  vm.runInContext(hsgSrc + '\nfunction __get(n){ return eval(n); }\nfunction __set(n, v){ eval(n + " = arguments[1]"); }',
    ctx, { filename: process.env.HSG_SRC || 'hsg.js' });
  // A seeded Math.random, so the fan toss and the flavour pick are reproducible.
  let seed = 12345;
  sandbox.__rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  vm.runInContext('Math.random = __rand', ctx);

  const dev = {
    ctx, sandbox, timers, screens, sent, priv, botPrompts,
    get: n => sandbox.__get(n), set: (n, v) => sandbox.__set(n, v),
    mode: m => { sandbox.window.syllyMultiplayerMode = m; },
    botCancels: () => botCancels,
    // Fires every timer pending NOW, in order (ones they schedule wait for the next call).
    fire() { const now = timers.splice(0, timers.length); now.forEach(t => t.fn()); return now.length; },
    pendingMs: () => timers.map(t => t.ms),
    lastScreen: () => screens[screens.length - 1],
  };
  return dev;
}
const R = (() => { const d = makeDevice(); return d.ctx.HsgRules; })();
const idx = R.idx;

// ── Helpers ────────────────────────────────────────────────────────────────
function lcg(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const sorted = acts => acts.map(a => JSON.stringify(a)).sort();

// Builds a fresh Battle on `d` (no timers fired) with a pinned layout seed.
function fresh(d, { len = 3, foxes = 4, seed = 1, first = 0 } = {}) {
  d.set('hsgCampaignLen', len); d.set('hsgFoxes', foxes); d.set('hsgSeed', seed);
  d.set('hsgSeals', [0, 0]); d.set('hsgBattleNo', 1); d.set('hsgReplay', false); d.set('hsgFirstSeat', first);
  d.ctx.hsgStartBattle();
  d.fire();                                              // the Battle intro ends → castle
}

// Lays a position onto the live Battle: cells = { [square]: [colour, id, faceUp] }.
function craft(d, { cells, teamCol = [0, 1], dm = [1, 0], quiet = 0, mover = 0, hired = [0, 0] }) {
  const B = d.get('hsgB'), S = B.S;
  for (let i = 0; i < 30; i++) S.board[i] = null;
  Object.keys(cells).forEach(k => { S.board[+k] = cells[k]; });
  S.teamCol = teamCol; S.dm = dm; S.quiet = quiet; S.hired = hired; S.pending = [];
  S.shrouds = S.board.filter(c => c !== null && !c[2]).length;
  B.team = mover; B.over = null;
  d.set('hsgPhase', 'castle');
  d.set('hsgPub', d.ctx.hsgBuildPub());
}
const seatOfTeam = (d, t) => d.ctx.hsgSeatOfTeam(t);

// ═══════════════════════════════════════════════════════════════════════════
section('1 · Loading, and a Battle begins');
{
  const d = makeDevice();
  check('HsgRules is on the context', typeof d.ctx.HsgRules === 'object');
  d.set('hsgSeed', 7);
  d.ctx.hsgStartCampaign();
  check('Campaign start → Battle intro phase', d.get('hsgPhase') === 'battle-intro');
  check('Battle intro routes to screen-hsg-battle-intro', d.lastScreen() === 'screen-hsg-battle-intro');
  check('Battle 1 (the fan toss): the landing beat (1.7 s) and the end (4.5 s) are SCHEDULED', eq(d.pendingMs(), [1700, 4500]), JSON.stringify(d.pendingMs()));
  check('nothing was broadcast in single mode', d.sent.length === 0 && d.priv.length === 0);
  const p = d.get('hsgPub');
  check('opening board is thirty closed doors', p.board.length === 30 && p.board.every(c => c === '#'));
  check('opening: cmd 0, no banners yet, Guards 2/2, quiet 0', p.cmd === 0 && eq(p.seatCol, [-1, -1]) && eq(p.guards, [2, 2]) && p.quiet === 0);
  check('opening: turnSeat is firstSeat', p.turnSeat === p.firstSeat && (p.firstSeat === 0 || p.firstSeat === 1));
  check('opening: Seals 0/0, last and result empty', eq(p.seals, [0, 0]) && p.last.k === 'none' && p.result.reason === 'none');
  check('opening: Skulk = 4 foxes, campaignLen 3', p.foxTotal === 4 && p.campaignLen === 3);
  check('flavour line index is in range', d.get('hsgFlavourIdx') >= 0 && d.get('hsgFlavourIdx') < 5);
  d.fire();
  check('the intro timer → castle phase and screen', d.get('hsgPhase') === 'castle' && d.lastScreen() === 'screen-hsg-castle');
  check('a fired timer leaves none pending', d.timers.length === 0);

  d.set('hsgFoxes', 2); d.ctx.hsgStartBattle();
  check('A Pair → 2 foxes in the public copy and the secret', d.get('hsgPub').foxTotal === 2 && d.get('hsgB').S.cfg.hire === 2);
  const closed = d.get('hsgB').S.board.length;
  check('the secret layout holds all the pieces: 30 doors', closed === 30);
}

// ═══════════════════════════════════════════════════════════════════════════
section('2 · Seat ⇄ team');
{
  const d = makeDevice();
  fresh(d, { first: 0 });
  check('firstSeat 0: team 0 is seat 0, team 1 is seat 1', seatOfTeam(d, 0) === 0 && seatOfTeam(d, 1) === 1);
  fresh(d, { first: 1 });
  check('firstSeat 1: team 0 is seat 1, team 1 is seat 0', seatOfTeam(d, 0) === 1 && seatOfTeam(d, 1) === 0);
  check('each map is its own inverse', [0, 1].every(s => d.ctx.hsgTeamOfSeat(d.ctx.hsgSeatOfTeam(s)) === s));
  check('turnSeat is the first seat at cmd 0', d.get('hsgPub').turnSeat === 1);
  // seat 1 opens first: it is team 0, so it gets the banner colour of the first clan piece found
  const B = d.get('hsgB');
  const sq = B.S.board.findIndex(c => c[0] !== 2);
  const colour = B.S.board[sq][0];
  const r = d.ctx.hsgHostCommand(1, ['U', sq]);
  check('seat 1 opens the first door', r.ok === true);
  const p = d.get('hsgPub');
  check('banners: the opener (seat 1) holds the colour found, the other seat the other', p.seatCol[1] === colour && p.seatCol[0] === 1 - colour, JSON.stringify(p.seatCol));
  check('the turn passed to seat 0', p.turnSeat === 0);
}

// ═══════════════════════════════════════════════════════════════════════════
section('3 · Random Battles, both seats: legality, privacy, codec, endings');
{
  const reasons = { shogun: 0, lantern: 0, truce: 0, cornered: 0 };
  let steps = 0, leakFail = 0, maskFail = 0, canonFail = 0, wireFail = 0, shapeFail = 0, neverEnded = 0, gekokujo = 0;
  let sealMismatch = 0, countFail = 0, foxFx = 0, bannerFx = 0, cappedFx = 0, guardFx = 0, struckFail = 0;
  const cellRe = /^(\.|#|(Sg|Gd|Mk|Sm|Nj|Ar|Fm|Fx)[01]|Fxp[01])$/;
  const BATTLES = 240;
  for (let b = 0; b < BATTLES; b++) {
    const d = makeDevice();
    const rnd = lcg(1000 + b);
    fresh(d, { len: 99, foxes: b % 3 === 0 ? 2 : 4, seed: 500 + b, first: b % 2 });
    let ended = false;
    for (let step = 0; step < 1500 && !ended; step++) {
      const pub = d.get('hsgPub');
      const seat = pub.turnSeat;
      const B = d.get('hsgB'), S = B.S;

      // (3a) masked state ≡ host engine, for the mover and (once known) the other colour
      const mover = R.battleLegal(B);
      const masked = d.ctx.hsgLegalFor(pub, seat);
      if (!eq(sorted(mover), sorted(masked))) maskFail++;
      const M = d.ctx.hsgMaskedState(pub);
      for (const col of [0, 1]) {
        if (S.teamCol[0] === null) break;
        if (!eq(sorted(R.legal(S, col)), sorted(R.legal(M, col)))) maskFail++;
        if (!eq(sorted(R.genStrikes(S, col)), sorted(R.genStrikes(M, col)))) maskFail++;
      }
      // every closed door in the masked state is opaque
      for (let i = 0; i < 30; i++) if (pub.board[i] === '#' && !eq(M.board[i], [-1, '?', false])) maskFail++;

      // (3b) the public copy is canonical, well-formed, and survives the wire byte-identical
      if (!eq(d.ctx.hsgWirePub(pub), pub)) canonFail++;
      if (!eq(d.ctx.hsgWirePub(wire(pub)), pub)) wireFail++;
      if (!pub.board.every(c => cellRe.test(c))) shapeFail++;

      // (3c) PRIVACY: permuting the closed doors' contents changes nothing public
      const closedIdx = []; S.board.forEach((c, i) => { if (c !== null && !c[2]) closedIdx.push(i); });
      if (closedIdx.length > 1 && (step % 3 === 0)) {
        const saved = closedIdx.map(i => S.board[i]);
        const before = JSON.stringify(pub);
        const rot = saved.slice(1).concat(saved.slice(0, 1));
        closedIdx.forEach((i, k) => { S.board[i] = rot[k]; });
        if (JSON.stringify(d.ctx.hsgBuildPub()) !== before) leakFail++;
        const rev = saved.slice().reverse();
        closedIdx.forEach((i, k) => { S.board[i] = rev[k]; });
        if (JSON.stringify(d.ctx.hsgBuildPub()) !== before) leakFail++;
        closedIdx.forEach((i, k) => { S.board[i] = saved[k]; });
      }

      // (3d) pick a legal Command (favour strikes) for the seat to move and play it
      const acts = masked;
      if (!acts.length) { neverEnded++; break; }
      const strikes = acts.filter(a => a[0] === 'S'), opens = acts.filter(a => a[0] === 'U');
      const pool = strikes.length && rnd() < 0.6 ? strikes : (opens.length && rnd() < 0.4 ? opens : acts);
      const act = pool[Math.floor(rnd() * pool.length)];
      const victim = act[0] === 'S' ? S.board[act[2]] : null;
      const sealsBefore = d.get('hsgSeals').slice();
      const foundOwn = act[0] === 'U' ? S.board[act[1]] : null;
      const res = d.ctx.hsgHostCommand(seat, act, pub.cmd);
      steps++;
      if (!res.ok) { shapeFail++; break; }
      if (res.fx.some(f => f === 'banners')) bannerFx++;
      res.fx.forEach(f => { if (f.indexOf('fox:') === 0) { foxFx++; if (f.endsWith(':1')) cappedFx++; } if (f.indexOf('guardFall:') === 0) guardFx++; });
      if (victim && victim[1] === 'Gd') { if (!res.fx.includes('guardFall:' + victim[0])) shapeFail++; }
      if (foundOwn && foundOwn[0] === 2 && !res.fx.some(f => f.indexOf('fox:') === 0)) shapeFail++;

      if (res.over) {
        ended = true;
        const np = d.get('hsgPub'), r = np.result;
        reasons[r.reason] = (reasons[r.reason] || 0) + 1;
        if (!(r.reason in reasons)) shapeFail++;
        const sealsAfter = d.get('hsgSeals');
        if (r.reason === 'truce') {
          if (r.winnerSeat !== -1 || !eq(sealsAfter, sealsBefore)) sealMismatch++;
        } else {
          const gained = [0, 1].filter(s => sealsAfter[s] === sealsBefore[s] + 1);
          if (gained.length !== 1 || gained[0] !== r.winnerSeat) sealMismatch++;
        }
        if (!eq(np.seals, sealsAfter)) sealMismatch++;
        if (r.reason === 'shogun') {
          if (r.gekokujo !== (r.by === 'Fm')) shapeFail++;
          if (r.gekokujo) gekokujo++;
          if (np.seatCol[r.winnerSeat] === -1) shapeFail++;
        }
        // counts = pieces in the open per colour, and match the engine's own for a Last Lantern
        const open = [0, 0]; S.board.forEach(c => { if (c !== null && c[2] && (c[0] === 0 || c[0] === 1)) open[c[0]]++; });
        if (!eq(r.counts, open)) countFail++;
        if (r.reason === 'lantern' || r.reason === 'truce') {
          const lo = d.get('hsgB').over;
          const byTeam = [open[S.teamCol[0]], open[S.teamCol[1]]];
          if (!eq(lo.counts, byTeam)) countFail++;
        }
        // struck stat: the whole Battle's strikes, per colour, never negative
        if (np.struck.some(n => n < 0) || np.struck[0] + np.struck[1] !== d.get('hsgB').strikes) struckFail++;
        if (d.get('hsgPhase') !== 'ending' || !eq(d.pendingMs(), [2400])) shapeFail++;
        if (np.result.campaignOver !== false) shapeFail++;   // len 99
      }
    }
    if (!ended) neverEnded++;
  }
  check(`${BATTLES} random Battles all end (${steps} Commands played)`, neverEnded === 0, 'unfinished: ' + neverEnded);
  check('masked state gives exactly the host engine\'s legal Commands, every Command', maskFail === 0, 'mismatches: ' + maskFail);
  check('PRIVACY: permuting closed-door contents never changes hsgPub', leakFail === 0, 'leaks: ' + leakFail);
  check('every pub is canonical (hsgWirePub(pub) === pub)', canonFail === 0, 'n: ' + canonFail);
  check('every pub survives the Firebase wire byte-identical', wireFail === 0, 'n: ' + wireFail);
  check('every board cell is "." "#" or a piece+colour — a "#" never carries more', shapeFail === 0, 'n: ' + shapeFail);
  check('Seals follow the result (winner +1, Truce 0, pub mirrors host)', sealMismatch === 0, 'n: ' + sealMismatch);
  check('result.counts = pieces in the open; Last Lantern counts match the engine', countFail === 0, 'n: ' + countFail);
  check('struck stat equals the Battle\'s strikes', struckFail === 0, 'n: ' + struckFail);
  check('random play reaches Found you!', reasons.shogun > 0, JSON.stringify(reasons));
  check('fx carried banners, fox and guardFall moments', bannerFx > 0 && foxFx > 0 && guardFx > 0, `banners ${bannerFx} fox ${foxFx} capped ${cappedFx} guard ${guardFx}`);
  console.log(`   (info) endings seen: ${JSON.stringify(reasons)} · Gekokujo ${gekokujo} · capped foxes ${cappedFx}`);
}

// ═══════════════════════════════════════════════════════════════════════════
section('4 · The endings, built by hand');
{
  // Found you! — a Samurai takes an exposed Shogun
  let d = makeDevice(); fresh(d, { first: 0 });
  craft(d, { cells: { [idx(1, 1)]: [0, 'Sm', true], [idx(2, 1)]: [1, 'Sg', true], [idx(0, 5)]: [0, 'Sg', true] }, dm: [1, 0] });
  let r = d.ctx.hsgHostCommand(0, ['S', idx(1, 1), idx(2, 1), 'x']);
  let p = d.get('hsgPub');
  check('Found you!: result shogun, winner seat 0, by Sm, no Gekokujo', p.result.reason === 'shogun' && p.result.winnerSeat === 0 && p.result.by === 'Sm' && p.result.gekokujo === false, JSON.stringify(p.result));
  check('Found you!: +1 Seal for the striker', eq(p.seals, [1, 0]));
  check('Found you!: Battle ends at once, phase ending, ending beat scheduled', r.over && d.get('hsgPhase') === 'ending' && eq(d.pendingMs(), [2400]));
  check('Found you!: the strike stays on the board for the end screen', p.board[idx(2, 1)] === 'Sm0');
  check('Found you!: last Command recorded (who made it, what it struck)', eq(p.last, { k: 'S', i: idx(1, 1), j: idx(2, 1), kind: 'x', seat: 0, vid: 'Sg' }), JSON.stringify(p.last));
  d.fire();
  check('ending beat over → War Chronicle (not Gameover: First to 3)', d.get('hsgPhase') === 'chronicle' && d.lastScreen() === 'screen-hsg-chronicle');

  // Gekokujo! — a Farmer
  d = makeDevice(); fresh(d, { first: 0 });
  craft(d, { cells: { [idx(1, 1)]: [0, 'Fm', true], [idx(2, 1)]: [1, 'Sg', true], [idx(0, 5)]: [0, 'Sg', true] }, dm: [1, 0] });
  d.ctx.hsgHostCommand(0, ['S', idx(1, 1), idx(2, 1), 'x']);
  p = d.get('hsgPub');
  check('Gekokujo!: a Farmer strike sets gekokujo', p.result.reason === 'shogun' && p.result.by === 'Fm' && p.result.gekokujo === true);

  // A Guarded Shogun cannot be struck at all
  d = makeDevice(); fresh(d, { first: 0 });
  craft(d, { cells: { [idx(1, 1)]: [0, 'Sm', true], [idx(2, 1)]: [1, 'Sg', true], [idx(4, 5)]: [1, 'Gd', false], [idx(0, 5)]: [0, 'Sg', true] }, dm: [1, 1] });
  const before = JSON.stringify(d.get('hsgPub'));
  r = d.ctx.hsgHostCommand(0, ['S', idx(1, 1), idx(2, 1), 'x']);
  check('a closed Guard still guards: the Shogun strike is refused', r.ok === false && r.why === 'illegal' && JSON.stringify(d.get('hsgPub')) === before);

  // The Last Lantern — more pieces in the open
  d = makeDevice(); fresh(d, { first: 0 });
  craft(d, { cells: { [idx(0, 5)]: [0, 'Sg', true], [idx(1, 5)]: [0, 'Fm', true], [idx(2, 5)]: [0, 'Fm', true], [idx(4, 0)]: [1, 'Sg', true],
    [idx(3, 3)]: [1, 'Gd', false] }, dm: [1, 1], quiet: 11 });
  r = d.ctx.hsgHostCommand(0, ['M', idx(0, 5), idx(0, 4)]);
  p = d.get('hsgPub');
  check('Last Lantern: the 12th quiet Command ends it', r.over && p.result.reason === 'lantern' && p.quiet === 12, JSON.stringify(p.result));
  check('Last Lantern: the player with more pieces in the open scores (closed door counts for nobody)', p.result.winnerSeat === 0 && eq(p.result.counts, [3, 1]) && eq(p.seals, [1, 0]));
  check('Last Lantern: no "by" piece, no Gekokujo', p.result.by === '' && p.result.gekokujo === false);

  // A Truce — equal counts, nobody scores, and the Battle will be replayed
  d = makeDevice(); fresh(d, { first: 0 });
  craft(d, { cells: { [idx(0, 5)]: [0, 'Sg', true], [idx(1, 5)]: [0, 'Fm', true], [idx(4, 0)]: [1, 'Sg', true], [idx(3, 0)]: [1, 'Fm', true] }, dm: [1, 1], quiet: 11 });
  d.ctx.hsgHostCommand(0, ['M', idx(0, 5), idx(0, 4)]);
  p = d.get('hsgPub');
  check('Truce: equal counts → reason truce, winnerSeat -1, no Seal', p.result.reason === 'truce' && p.result.winnerSeat === -1 && eq(p.seals, [0, 0]) && eq(p.result.counts, [2, 2]));

  // An Open or a Strike relights the lantern
  d = makeDevice(); fresh(d, { first: 0 });
  craft(d, { cells: { [idx(0, 5)]: [0, 'Sg', true], [idx(4, 0)]: [1, 'Sg', true], [idx(2, 2)]: [1, 'Fm', false] }, dm: [1, 1], quiet: 11 });
  r = d.ctx.hsgHostCommand(0, ['U', idx(2, 2)]);
  check('an Open resets the quiet count to 0 instead of ending the Battle', r.ok && !r.over && d.get('hsgPub').quiet === 0);

  // Cornered — the next player has no legal Command
  d = makeDevice(); fresh(d, { first: 0 });
  craft(d, { cells: {
    [idx(0, 0)]: [1, 'Sg', true], [idx(0, 1)]: [1, 'Fm', true], [idx(1, 0)]: [1, 'Fm', true],
    [idx(1, 1)]: [0, 'Gd', true], [idx(0, 2)]: [0, 'Sm', true], [idx(2, 0)]: [0, 'Sm', true], [idx(4, 5)]: [0, 'Sg', true] }, dm: [1, 0] });
  check('(setup) the boxed-in clan really has no Command', R.battleLegal({ S: d.get('hsgB').S, team: 1 }).length === 0);
  r = d.ctx.hsgHostCommand(0, ['M', idx(4, 5), idx(4, 4)]);
  p = d.get('hsgPub');
  check('Cornered: the mover scores when the other player has no Command', r.over && p.result.reason === 'cornered' && p.result.winnerSeat === 0 && eq(p.seals, [1, 0]), JSON.stringify(p.result));
}

// ═══════════════════════════════════════════════════════════════════════════
section('5 · Foxes');
{
  // A fox found before the banners waits for them; then sides with its finder
  let d = makeDevice(); fresh(d, { first: 0, seed: 21 });
  let S = d.get('hsgB').S;
  const fox = S.board.findIndex(c => c[0] === 2);
  const clan = S.board.findIndex(c => c[0] !== 2);
  let r = d.ctx.hsgHostCommand(0, ['U', fox]);
  let p = d.get('hsgPub');
  check('a fox found before the banners reads Fxp<finder seat>', p.board[fox] === 'Fxp0', p.board[fox]);
  check('...with the fox slot counted for the finder and fx "fox:0:0"', eq(p.foxesHeld, [1, 0]) && eq(r.fx, ['fox:0:0']));
  check('...and the banners are still down', eq(p.seatCol, [-1, -1]));
  check('...the secret layout never reaches the pub: only "Fxp0" and "#" so far', p.board.filter(c => c !== '#').length === 1);
  const masked = d.ctx.hsgMaskedState(p);
  check('masked state rebuilds the waiting fox as a pending cell for team 0', masked.pending.length === 1 && masked.pending[0][1] === 0 && masked.board[fox][0] === 2);
  r = d.ctx.hsgHostCommand(1, ['U', clan]);
  p = d.get('hsgPub');
  const col = S.board[clan][0];
  check('banners: the waiting fox takes her finder\'s colour', p.board[fox] === 'Fx' + p.seatCol[0], p.board[fox] + ' ' + JSON.stringify(p.seatCol));
  check('banners: seat 1 opened the clan piece, so seat 1 holds its colour', p.seatCol[1] === col && eq(r.fx, ['banners']));

  // The share cap: with 2 foxes each clan may take 1; a second fox found by the same seat joins the other clan
  d = makeDevice(); fresh(d, { first: 0, foxes: 2, seed: 33 });
  S = d.get('hsgB').S;
  const foxes = S.board.map((c, i) => c[0] === 2 ? i : -1).filter(i => i >= 0);
  const others = S.board.map((c, i) => c[0] !== 2 ? i : -1).filter(i => i >= 0);
  d.ctx.hsgHostCommand(0, ['U', foxes[0]]);          // seat 0 finds fox 1: takes her
  d.ctx.hsgHostCommand(1, ['U', others[0]]);         // seat 1 opens a clan piece: banners
  r = d.ctx.hsgHostCommand(0, ['U', foxes[1]]);      // seat 0 finds fox 2: already has its share → joins seat 1
  p = d.get('hsgPub');
  check('over the share: the fox joins the other clan (fx fox:1:1, capped)', eq(r.fx, ['fox:1:1']), JSON.stringify(r.fx));
  check('...foxesHeld [1,1] and the fox wears seat 1\'s colour', eq(p.foxesHeld, [1, 1]) && p.board[foxes[1]] === 'Fx' + p.seatCol[1]);
}

// ═══════════════════════════════════════════════════════════════════════════
section('6 · The Campaign: Seals, Truce, who opens');
{
  const winFor = (d, seat) => {
    d.fire();                                              // a pending intro, if any
    const t = d.ctx.hsgTeamOfSeat(seat);
    const tc = [null, null]; tc[t] = 0; tc[1 - t] = 1;
    craft(d, { cells: { [idx(1, 1)]: [0, 'Sm', true], [idx(2, 1)]: [1, 'Sg', true], [idx(0, 5)]: [0, 'Sg', true] }, teamCol: tc, dm: [1, 0], mover: t });
    return d.ctx.hsgHostCommand(seat, ['S', idx(1, 1), idx(2, 1), 'x']);
  };
  const toChronicle = d => { d.fire(); };
  const next = (d, seat) => d.ctx.hsgHostNextBattle(seat, { battleNo: d.get('hsgBattleNo'), replay: d.get('hsgReplay') });

  // First to 1 — one Battle decides it
  let d = makeDevice(); fresh(d, { len: 1, first: 0 });
  winFor(d, 1);
  check('Single Battle: one Seal wins the Campaign at once', d.get('hsgPub').result.campaignOver === true);
  toChronicle(d);
  check('Single Battle: ending beat → screen-hsg-gameover, phase gameover', d.get('hsgPhase') === 'gameover' && d.lastScreen() === 'screen-hsg-gameover');
  check('gameover refuses Next Battle', next(d, 0).ok === false);

  // First to 3 — 2-1 is not enough until a third Seal lands
  d = makeDevice(); fresh(d, { len: 3, first: 0 });
  const opened = [];
  const play = seat => {
    opened.push(d.get('hsgFirstSeat'));
    const r = winFor(d, seat); toChronicle(d); return r;
  };
  play(0);
  check('First to 3: 1-0 goes to the Chronicle, not Gameover', d.get('hsgPhase') === 'chronicle' && d.lastScreen() === 'screen-hsg-chronicle' && d.get('hsgPub').result.campaignOver === false);
  check('(Chronicle) a Next Battle tap with a stale tag is refused', d.ctx.hsgHostNextBattle(0, { battleNo: 9, replay: false }).ok === false);
  check('(Chronicle) a bad seat is refused', d.ctx.hsgHostNextBattle(5, { battleNo: 1, replay: false }).ok === false);
  check('Next Battle starts Battle 2, replay false', next(d, 1).ok && d.get('hsgBattleNo') === 2 && d.get('hsgReplay') === false && d.get('hsgPhase') === 'battle-intro');
  check('...a second tap (the other player) is refused — the first tap wins', next(d, 0).ok === false && d.get('hsgBattleNo') === 2);
  check('...Battle 2: the snap (0.9 s) and the end (3.5 s) are scheduled', eq(d.pendingMs(), [900, 3500]), JSON.stringify(d.pendingMs()));
  check('...Seals carried over, struck stat reset', eq(d.get('hsgSeals'), [1, 0]) && eq(d.get('hsgPub').struck, [0, 0]) && d.get('hsgPub').result.reason === 'none');
  play(1); check('First to 3: 1-1 goes on', d.get('hsgPhase') === 'chronicle'); next(d, 0);
  play(0); check('First to 3: 2-1 goes on', d.get('hsgPhase') === 'chronicle' && eq(d.get('hsgSeals'), [2, 1])); next(d, 0);
  play(0);
  check('First to 3: the third Seal wins the Campaign → gameover', d.get('hsgPhase') === 'gameover' && eq(d.get('hsgSeals'), [3, 1]) && d.get('hsgPub').result.campaignOver === true);
  check('who opens each Battle alternates every Battle', eq(opened, [opened[0], 1 - opened[0], opened[0], 1 - opened[0]]), JSON.stringify(opened));

  // New Campaign: Seals cleared, Battle 1, a fresh toss
  d.ctx.hsgStartCampaign();
  check('New Campaign: Seals 0/0, Battle 1, not a replay, intro running', eq(d.get('hsgSeals'), [0, 0]) && d.get('hsgBattleNo') === 1 && d.get('hsgReplay') === false && d.get('hsgPhase') === 'battle-intro');
  check('New Campaign: the pub shows the cleared Seals', eq(d.get('hsgPub').seals, [0, 0]));
  const tosses = new Set();
  for (let k = 0; k < 40; k++) { d.ctx.hsgStartCampaign(); tosses.add(d.get('hsgFirstSeat')); }
  check('the fan toss lands on both seats over time', tosses.size === 2);

  // First to 5
  d = makeDevice(); fresh(d, { len: 5, first: 0 });
  for (let k = 0; k < 4; k++) { winFor(d, 0); toChronicle(d); next(d, 0); }
  winFor(d, 0);
  check('First to 5: four Seals is not enough, the fifth wins', d.get('hsgPub').result.campaignOver === true && d.get('hsgSeals')[0] === 5);

  // A Truce keeps the Battle number, sets replay, and still flips the first move
  d = makeDevice(); fresh(d, { len: 3, first: 0 });
  d.fire();
  craft(d, { cells: { [idx(0, 5)]: [0, 'Sg', true], [idx(1, 5)]: [0, 'Fm', true], [idx(4, 0)]: [1, 'Sg', true], [idx(3, 0)]: [1, 'Fm', true] }, dm: [1, 1], quiet: 11 });
  d.ctx.hsgHostCommand(0, ['M', idx(0, 5), idx(0, 4)]);
  d.fire();
  check('Truce → the Chronicle offers a replay (result truce, Seals 0/0)', d.get('hsgPhase') === 'chronicle' && eq(d.get('hsgSeals'), [0, 0]));
  next(d, 0);
  check('Truce replay: Battle number kept, replay true, first move flipped', d.get('hsgBattleNo') === 1 && d.get('hsgReplay') === true && d.get('hsgFirstSeat') === 1 && d.get('hsgPub').replay === true);
  d.fire();
  winFor(d, 1); d.fire(); next(d, 0);
  check('after the replay: the next Battle is number 2 and flips again', d.get('hsgBattleNo') === 2 && d.get('hsgReplay') === false && d.get('hsgFirstSeat') === 0);

  // Teardown
  d.ctx.hsgTeardown();
  check('teardown clears the timers, the secret and the public copy', d.timers.length === 0 && d.get('hsgB') === null && d.get('hsgPub') === null && d.get('hsgPhase') === 'idle');
  check('teardown resets Seals / Battle number; settings persist', eq(d.get('hsgSeals'), [0, 0]) && d.get('hsgBattleNo') === 1 && d.get('hsgCampaignLen') === 3);
}

// ═══════════════════════════════════════════════════════════════════════════
section('7 · Refusals change nothing');
{
  const d = makeDevice(); fresh(d, { first: 0, seed: 3 });
  const snap = () => JSON.stringify([d.get('hsgPub'), d.get('hsgPhase'), d.get('hsgSeals'), d.get('hsgB').S.cmd]);
  const base = snap();
  const door = d.get('hsgPub').board.indexOf('#');
  let r = d.ctx.hsgHostCommand(1, ['U', door]);
  check('the wrong seat\'s Command is refused (turn)', r.ok === false && r.why === 'turn' && snap() === base);
  r = d.ctx.hsgHostCommand(0, ['U', door], 99);
  check('a stale cmd tag is refused', r.ok === false && r.why === 'stale' && snap() === base);
  r = d.ctx.hsgHostCommand(0, ['M', 0, 1]);
  check('an illegal action (a March from a door) is refused', r.ok === false && r.why === 'illegal' && snap() === base);
  r = d.ctx.hsgHostCommand(0, 'open');
  check('a malformed action is refused', r.ok === false && r.why === 'illegal' && snap() === base);
  r = d.ctx.hsgHostCommand(0, ['U', 99]);
  check('an Open of a square off the board is refused', r.ok === false && snap() === base);
  r = d.ctx.hsgHostCommand(0, ['U', door], 0);
  check('the right seat, a legal Open and the right tag is accepted', r.ok === true && d.get('hsgPub').cmd === 1);
  d.set('hsgPhase', 'chronicle');
  const b2 = snap();
  r = d.ctx.hsgHostCommand(d.get('hsgPub').turnSeat, ['U', d.get('hsgPub').board.indexOf('#')]);
  check('a Command outside the castle phase is refused', r.ok === false && r.why === 'phase' && snap() === b2);
  d.ctx.hsgTeardown();
  r = d.ctx.hsgHostCommand(0, ['U', 0]);
  check('a Command with no Battle on is refused, not thrown', r.ok === false && r.why === 'phase');
  check('single mode: no refusal ever sent a packet', d.priv.length === 0 && d.sent.length === 0);

  // A Command that lands while the Battle intro is still showing is legal (spec §7)
  const e = makeDevice();
  e.set('hsgSeed', 4); e.ctx.hsgStartCampaign();
  r = e.ctx.hsgHostCommand(e.get('hsgPub').turnSeat, ['U', 0]);
  check('a Command during the Battle intro is accepted; the intro timer still runs', r.ok === true && e.get('hsgPhase') === 'battle-intro' && e.pendingMs().includes(4500));
  e.fire();
  check('...and the intro then lands on the castle', e.get('hsgPhase') === 'castle');
}

// ═══════════════════════════════════════════════════════════════════════════
section('8 · The codec');
{
  const d = makeDevice(); fresh(d, { first: 1, seed: 9 });
  const fresh0 = d.get('hsgPub');
  const rt = d.ctx.hsgWirePub(wire(fresh0));
  check('an opening pub (all reset values) survives the wire', eq(rt, fresh0));
  check('hsgWirePub is idempotent', eq(d.ctx.hsgWirePub(rt), rt));
  const empty = d.ctx.hsgWirePub({});
  check('hsgWirePub({}) is a complete pub: 30 cells, fixed-length arrays, no undefined/null',
    empty.board.length === 30 && empty.seatCol.length === 2 && empty.guards.length === 2 && empty.foxesHeld.length === 2 &&
    empty.struck.length === 2 && empty.seals.length === 2 && JSON.stringify(empty).indexOf('null') < 0 && JSON.stringify(empty).indexOf('undefined') < 0);
  check('hsgWirePub(undefined) and hsgWirePub(null) do not throw', (() => { try { d.ctx.hsgWirePub(undefined); d.ctx.hsgWirePub(null); return true; } catch (e) { return false; } })());
  // The reset values Firebase erases: an all-zero struck/foxesHeld/guards, last none
  const reset = Object.assign({}, fresh0, { struck: [0, 0], foxesHeld: [0, 0], guards: [0, 0], quiet: 0, seals: [0, 0] });
  const stored = fbWrite(reset);
  check('0 and -1 are real stored values: reset arrays arrive intact', eq(d.ctx.hsgWirePub(fbRead(stored)).guards, [0, 0]) && eq(d.ctx.hsgWirePub(fbRead(stored)).seatCol, [-1, -1]));
  // A sparse array comes back as an object keyed by index
  const sparse = Object.assign({}, fresh0, { board: { 0: 'Sg0', 7: 'Fm1' } });
  const sp = d.ctx.hsgWirePub(sparse);
  check('a board that arrives as an index-keyed object is rebuilt to 30 cells', sp.board.length === 30 && sp.board[0] === 'Sg0' && sp.board[7] === 'Fm1' && sp.board[1] === '.');
  // A full ending carries every result field through
  const d2 = makeDevice(); fresh(d2, { first: 0 });
  craft(d2, { cells: { [idx(1, 1)]: [0, 'Fm', true], [idx(2, 1)]: [1, 'Sg', true], [idx(0, 5)]: [0, 'Sg', true] }, dm: [1, 0] });
  d2.ctx.hsgHostCommand(0, ['S', idx(1, 1), idx(2, 1), 'x']);
  const endPub = d2.get('hsgPub');
  check('an ending pub survives the wire byte-identical', eq(d2.ctx.hsgWirePub(wire(endPub)), endPub) && endPub.result.gekokujo === true);
  check('the pub never carries the layout, the seed or the engine state', Object.keys(endPub).sort().join() ===
    'battleNo,board,campaignLen,cmd,firstSeat,foxTotal,foxesHeld,guards,last,quiet,replay,result,seals,seatCol,struck,turnSeat');
  check('the result block holds only its six fields', Object.keys(endPub.result).sort().join() === 'by,campaignOver,counts,gekokujo,reason,winnerSeat');
}

// ═══════════════════════════════════════════════════════════════════════════
section('9 · Host mode: packets, repair, bot prompts');
{
  const d = makeDevice();
  d.mode('host'); d.sandbox.mpMyPlayerIdx = 0;
  d.set('hsgSeed', 11); d.ctx.hsgStartCampaign();
  check('host: HSG_BATTLE_START is broadcast as a SYNC with the pub and flavour', d.sent.length === 1 &&
    d.sent[0].type === 'SYNC' && d.sent[0].payload.action === 'HSG_BATTLE_START' && eq(d.sent[0].payload.pub, d.get('hsgPub')) &&
    typeof d.sent[0].payload.flavourIdx === 'number' && eq(Object.keys(d.sent[0].payload).sort(), ['action', 'flavourIdx', 'pub']));
  d.fire();
  check('host: the Battle intro ending with a human to move prompts no bot', d.botPrompts.length === 0);

  const sendsBefore = d.sent.length;
  const first = d.get('hsgPub').turnSeat;
  const r = d.ctx.hsgHostCommand(first, ['U', 3], 0);
  const env = d.sent[d.sent.length - 1];
  check('host: a Command broadcasts exactly one HSG_COMMAND_DONE', d.sent.length === sendsBefore + 1 && env.payload.action === 'HSG_COMMAND_DONE');
  check('host: the packet carries { pub, act, fx } and nothing else', eq(Object.keys(env.payload).sort(), ['act', 'action', 'fx', 'pub']) && eq(env.payload.act, ['U', 3]) && Array.isArray(env.payload.fx));
  check('host: the packet\'s pub IS the host\'s hsgPub, and survives the wire', eq(env.payload.pub, d.get('hsgPub')) && eq(d.ctx.hsgWirePub(wire(env.payload.pub)), d.get('hsgPub')));
  const wireText = JSON.stringify(env);
  const secret = d.get('hsgB').S.board.filter((c, i) => !c[2]).length;
  check('host: the packet reveals only the opened door (' + (30 - secret) + ' open piece)', env.payload.pub.board.filter(c => c !== '#').length === 1);
  check('host: no seed or layout key anywhere in the packet', !/seed|layout|pool|shroud/i.test(wireText));

  // Refusals: a CLIENT seat gets the truth back privately; the host's own seat and a bot get nothing
  d.priv.length = 0;
  const wrong = d.get('hsgPub').turnSeat === 0 ? 1 : 0;       // not that seat's turn
  d.sandbox.mpMyPlayerIdx = 0;
  d.ctx.hsgHostCommand(wrong, ['U', 4], d.get('hsgPub').cmd);
  if (wrong === 1) {
    check('host: a refused client Command is repaired with a private HSG_STATE to that seat',
      d.priv.length === 1 && d.priv[0].uid === 'u1' && d.priv[0].env.payload.action === 'HSG_STATE' && eq(d.priv[0].env.payload.pub, d.get('hsgPub')) && d.priv[0].env.payload.phase === 'castle');
  } else {
    check('host: a refusal for the host\'s own seat sends no repair', d.priv.length === 0);
  }
  // hsgSendState phases
  d.priv.length = 0; d.set('hsgPhase', 'battle-intro'); d.ctx.hsgSendState(1);
  check('HSG_STATE mid-Battle-intro tells a rejoiner "castle"', d.priv[0].env.payload.phase === 'castle');
  d.set('hsgPhase', 'ending'); d.ctx.hsgSendState(1);
  check('HSG_STATE during the ending beat tells a rejoiner "chronicle"', d.priv[1].env.payload.phase === 'chronicle');
  d.set('hsgResult', { reason: 'shogun', campaignOver: true });
  check('…but "gameover" when that Battle won the Campaign (S7 — the S6 draft said "chronicle")', d.ctx.hsgPhaseForWire() === 'gameover');
  d.set('hsgResult', { reason: 'none' });
  d.set('hsgPhase', 'chronicle'); d.ctx.hsgSendState(1);
  d.set('hsgPhase', 'gameover'); d.ctx.hsgSendState(1);
  check('HSG_STATE phases: chronicle and gameover', d.priv[2].env.payload.phase === 'chronicle' && d.priv[3].env.payload.phase === 'gameover');
  check('HSG_STATE goes to the right uid via mpSendPrivate', d.priv.every(p => p.uid === 'u1' && p.env.type === 'SYNC'));
  d.sandbox.mpPlayerSlots[1] = { uid: 'bot:0', nickname: 'Sylvia' };
  d.priv.length = 0; d.ctx.hsgSendState(1);
  check('a bot seat has no queue: HSG_STATE to a bot is never sent', d.priv.length === 0);
  d.sandbox.mpPlayerSlots[1] = { uid: 'u1', nickname: 'Priya' };

  // Bot prompts: hsgOpenCommand is the single place a Command opens
  const b = makeDevice();
  b.mode('host'); b.sandbox.mpMyPlayerIdx = 0;
  b.sandbox.mpPlayerSlots = [{ uid: 'solo:me', nickname: 'Hana' }, { uid: 'bot:0', nickname: 'Sylvia' }];
  fresh(b, { first: 1, seed: 5 });                                  // the bot (seat 1) opens
  check('bot: the Battle intro ending with the bot to move prompts it with the cmd tag', b.botPrompts.length === 1 && b.botPrompts[0].tag === 0 && eq(b.botPrompts[0].seats, [1]), JSON.stringify(b.botPrompts));
  b.ctx.hsgHostCommand(1, ['U', 2], 0);
  check('bot: after its Command the HUMAN is to move — no prompt', b.botPrompts.length === 1);
  b.ctx.hsgHostCommand(0, ['U', 5], 1);
  check('bot: after the human\'s Command the bot is prompted again, tag = the new cmd', b.botPrompts.length === 2 && b.botPrompts[1].tag === 2 && eq(b.botPrompts[1].seats, [1]));
  // A Command that ends the Battle prompts nobody and cancels pending bot moves
  const cancels = b.botCancels();
  // the human (seat 0) is the striker
  const humanTeam = b.ctx.hsgTeamOfSeat(0);
  const tc = [null, null]; tc[humanTeam] = 0; tc[1 - humanTeam] = 1;
  craft(b, { cells: { [idx(1, 1)]: [0, 'Sm', true], [idx(2, 1)]: [1, 'Sg', true], [idx(0, 5)]: [0, 'Sg', true] }, teamCol: tc, dm: [1, 0], mover: humanTeam });
  const promptsBefore = b.botPrompts.length;
  b.ctx.hsgHostCommand(0, ['S', idx(1, 1), idx(2, 1), 'x']);
  check('bot: a Battle-ending Command prompts no bot, and cancels any pending one', b.botPrompts.length === promptsBefore && b.botCancels() === cancels + 1);

  // single / client never prompt
  const s = makeDevice(); s.sandbox.mpPlayerSlots[1] = { uid: 'bot:0', nickname: 'Sylvia' };
  fresh(s, { first: 1, seed: 5 });
  check('single mode never prompts a bot', s.botPrompts.length === 0);
}

// ═══════════════════════════════════════════════════════════════════════════
section('10 · Entry and timers');
{
  const d = makeDevice();
  d.ctx.hsgOnEnter();
  check('one phone: entry goes to the setup screen', d.lastScreen() === 'screen-hsg-setup' && d.get('hsgPhase') === 'idle');
  d.mode('client'); d.ctx.hsgOnEnter();
  check('client: entry lands on standby (safe to re-run) with names from the lobby', d.lastScreen() === 'screen-hsg-standby' && eq(d.get('hsgNames'), ['Hana', 'Priya']));
  d.ctx.hsgOnEnter();
  check('client: re-running entry is harmless', d.lastScreen() === 'screen-hsg-standby' && d.get('hsgPub') === null);
  d.mode('host'); d.ctx.hsgOnEnter();
  check('host: entry starts the Campaign', d.get('hsgPhase') === 'battle-intro' && d.lastScreen() === 'screen-hsg-battle-intro' && eq(d.get('hsgNames'), ['Hana', 'Priya']));

  // Every timer this game owns dies with a teardown, mid-intro and mid-ending
  const t = makeDevice();
  t.set('hsgSeed', 1); t.ctx.hsgStartCampaign();
  check('a Battle intro leaves its two beats (the snap / landing + the end)', t.timers.length === 2);
  t.ctx.hsgTeardown();
  check('teardown clears a running Battle intro', t.timers.length === 0);
  fresh(t, { first: 0 });
  craft(t, { cells: { [idx(1, 1)]: [0, 'Sm', true], [idx(2, 1)]: [1, 'Sg', true], [idx(0, 5)]: [0, 'Sg', true] }, dm: [1, 0] });
  t.ctx.hsgHostCommand(0, ['S', idx(1, 1), idx(2, 1), 'x']);
  check('an ending leaves exactly the ending timer', eq(t.pendingMs(), [2400]));
  t.ctx.hsgTeardown();
  check('teardown clears a running ending beat', t.timers.length === 0);
  const u = makeDevice(); fresh(u, { first: 0 });
  craft(u, { cells: { [idx(1, 1)]: [0, 'Sm', true], [idx(2, 1)]: [1, 'Sg', true], [idx(0, 5)]: [0, 'Sg', true] }, dm: [1, 0] });
  u.ctx.hsgHostCommand(0, ['S', idx(1, 1), idx(2, 1), 'x']);
  u.ctx.hsgEndBattle({ reason: 'shogun', winnerSeat: 1, by: 'Sm', gekokujo: false, counts: [0, 0], campaignOver: false });
  check('hsgEndBattle is idempotent: a second call awards nothing', eq(u.get('hsgSeals'), [1, 0]));
}

// ═══════════════════════════════════════════════════════════════════════════
section('11 · The Castle: what a tap means (S4 — hsgTapDecide / hsgMarksFor)');
{
  // These DECIDE legality on the phone, so they are rules logic: every one reads
  // the public copy only, and must agree with the host engine.
  const d = makeDevice(); fresh(d, { first: 0 });
  const tap = (pub, seat, sel, armed, i) => d.ctx.hsgTapDecide(pub, seat, sel, armed, i);
  let p = d.get('hsgPub');
  const door = p.board.indexOf('#');
  let r = tap(p, 0, -1, -1, door);
  check('first tap on a door lifts it ("Open?"), sends nothing', r.armed === door && r.sel === -1 && r.act === null);
  r = tap(p, 0, -1, door, door);
  check('second tap on the SAME door opens it', eq(r.act, ['U', door]) && r.armed === -1);
  const other = p.board.indexOf('#', door + 1);
  r = tap(p, 0, -1, door, other);
  check('a tap on a different door moves the lift, sends nothing', r.armed === other && r.act === null);
  r = tap(p, 1, -1, door, door);
  check('not my Command: a tap changes nothing and sends nothing', r.armed === door && r.act === null);

  // A crafted position: seat 0 (team 0 = Indigo 0) to move.
  craft(d, { cells: {
    [idx(2, 2)]: [0, 'Sm', true],                         // Indigo Samurai C3, open space around
    [idx(2, 3)]: [1, 'Fm', true],                         // Crimson Farmer below it (strikable up close)
    [idx(0, 0)]: [0, 'Mk', true], [idx(1, 1)]: [1, 'Ar', true],   // Monk A1, Crimson Archer diagonal B2
    [idx(4, 0)]: [0, 'Nj', true], [idx(4, 1)]: [1, 'Fm', true], [idx(4, 3)]: [1, 'Gd', true],  // Ninja E1, screen E2, target E4
    [idx(0, 5)]: [0, 'Sg', true], [idx(4, 5)]: [1, 'Sg', true],
    [idx(3, 5)]: [1, 'Gd', false],                        // a closed door
  }, dm: [0, 2], teamCol: [0, 1], mover: 0 });
  p = d.get('hsgPub');
  const legal = d.ctx.hsgLegalFor(p, 0);
  // Every lifted piece's marks are exactly its legal Commands — nothing more lights up.
  let markFail = 0, tapFail = 0;
  for (let s = 0; s < 30; s++) {
    if (!d.ctx.hsgIsOwnPiece(p, 0, s)) continue;
    const mk = d.ctx.hsgMarksFor(p, 0, s);
    const want = legal.filter(a => a[0] !== 'U' && a[1] === s).map(a => a[2]).sort((a, b) => a - b);
    const got = Object.keys(mk.marks).map(Number).sort((a, b) => a - b);
    if (!eq(want, got)) markFail++;
    for (let j = 0; j < 30; j++) {
      const t = tap(p, 0, s, -1, j);
      const exp = legal.find(a => a[0] !== 'U' && a[1] === s && a[2] === j);
      if (exp ? !eq(t.act, exp) : (t.act !== null && p.board[j] !== '#')) tapFail++;
    }
  }
  check('every lifted piece lights exactly its legal targets', markFail === 0, 'n: ' + markFail);
  check('tap-tap sends exactly the legal Command for a lit square, and nothing for an unlit one', tapFail === 0, 'n: ' + tapFail);
  const sm = d.ctx.hsgMarksFor(p, 0, idx(2, 2)).marks;
  check('Samurai: March = dot, Charge = chevrons pointing the way, up-close Strike = brackets',
    sm[idx(2, 1)]?.mark === 'dot' && sm[idx(2, 0)]?.mark === 'chev' && sm[idx(2, 0)]?.dir === 'u' && sm[idx(2, 3)]?.mark === 'strike',
    JSON.stringify(sm));
  const mk = d.ctx.hsgMarksFor(p, 0, idx(0, 0)).marks;
  check('Monk: the diagonal strike has its own mark', mk[idx(1, 1)] && mk[idx(1, 1)].mark === 'diag', JSON.stringify(mk));
  const nj = d.ctx.hsgMarksFor(p, 0, idx(4, 0));
  check('Ninja: a Leap is marked, and the piece it jumps is outlined', nj.marks[idx(4, 3)] && nj.marks[idx(4, 3)].mark === 'leap' && eq(nj.screens, [idx(4, 1)]), JSON.stringify(nj));
  check('a lifted enemy piece shows no marks', Object.keys(d.ctx.hsgMarksFor(p, 0, idx(2, 3)).marks).length === 0);
  r = tap(p, 0, -1, -1, idx(2, 2));
  check('tap your own piece: it lifts', r.sel === idx(2, 2) && r.act === null);
  r = tap(p, 0, idx(2, 2), -1, idx(2, 2));
  check('tap it again: it is put down', r.sel === -1 && r.act === null);
  r = tap(p, 0, idx(2, 2), -1, idx(0, 0));
  check('tap another of yours: the lift moves to it', r.sel === idx(0, 0));
  r = tap(p, 0, idx(2, 2), -1, idx(3, 4));
  check('tap an unlit square: the piece is put down, nothing sent', r.sel === -1 && r.act === null);
  r = tap(p, 0, idx(2, 2), -1, idx(3, 5));
  check('tap a door with a piece lifted: the door lifts instead', r.armed === idx(3, 5) && r.sel === -1 && r.act === null);
  r = tap(p, 0, -1, -1, idx(2, 3));
  check('tap an enemy piece with nothing lifted: nothing', r.sel === -1 && r.act === null);

  // The decided Command really is accepted by the host, and the phone's tag is right.
  const act = tap(p, 0, idx(2, 2), -1, idx(2, 3)).act;
  const res = d.ctx.hsgHostCommand(0, act, p.cmd);
  check('a tapped Command is accepted by the host as-is', res.ok === true, JSON.stringify(res));
  check('the message card can name it: last.vid is the struck piece', d.get('hsgPub').last.vid === 'Fm' && d.get('hsgPub').last.seat === 0);

  // After the Battle ends the board is read-only.
  const e = makeDevice(); fresh(e, { first: 0 });
  craft(e, { cells: { [idx(1, 1)]: [0, 'Sm', true], [idx(2, 1)]: [1, 'Sg', true], [idx(0, 5)]: [0, 'Sg', true] }, dm: [1, 0] });
  e.ctx.hsgHostCommand(0, ['S', idx(1, 1), idx(2, 1), 'x']);
  const ep = e.get('hsgPub');
  r = e.ctx.hsgTapDecide(ep, ep.turnSeat, -1, -1, idx(0, 5));
  check('a finished Battle: taps decide nothing', r.act === null && r.sel === -1);

  // Before the banners nothing is anyone's: only doors respond.
  const b = makeDevice(); fresh(b, { first: 0 });
  const bp = b.get('hsgPub');
  check('before the banners no piece is "own"', [...Array(30).keys()].every(i => !b.ctx.hsgIsOwnPiece(bp, 0, i) && !b.ctx.hsgIsOwnPiece(bp, 1, i)));
}

// ═══════════════════════════════════════════════════════════════════════════
section('12 · The Battle intro + the Intro brief (S5)');
{
  // hsgBattleIntroText decides which of the three states shows (spec §2) and how long
  // the interstitial runs — the client (S7) runs the same function on the same pub.
  const d = makeDevice();
  d.set('hsgNames', ['Hana', 'Priya']);
  const pub = (o) => Object.assign({ battleNo: 1, replay: false, firstSeat: 0 }, o);
  let bi = d.ctx.hsgBattleIntroText(pub({}), 2);
  check('Battle 1 is the fan toss', bi.state === 'toss' && bi.title === 'Battle 1');
  check('...the toss names the first lord twice', bi.call === 'It lands on Hana. Hana opens the first door.', bi.call);
  check('...4.5 s, the call on the landing (1.7 s)', bi.ms === 4500 && bi.snapMs === 1700);
  check('...the toss line replaces the flavour line', /^Ahem! Who goes first\?/.test(bi.flavour));
  bi = d.ctx.hsgBattleIntroText(pub({ battleNo: 2, firstSeat: 1 }), 3);
  check('Battle 2 is a plain Battle, 3.5 s, the snap at 0.9 s', bi.state === 'battle' && bi.title === 'Battle 2' && bi.ms === 3500 && bi.snapMs === 900);
  check('...the host-picked flavour line, by index', bi.flavour === d.get('HSG_FLAVOUR')[3] && bi.call === 'Priya opens the first door.');
  const lines = [0, 1, 2, 3, 4].map(i => d.ctx.hsgBattleIntroText(pub({ battleNo: 3 }), i).flavour);
  check('all five flavour lines are reachable and distinct', new Set(lines).size === 5);
  check('an out-of-range or missing index falls back to line 0, never undefined',
    [-1, 5, 2.5, undefined, null, '3'].every(x => d.ctx.hsgBattleIntroText(pub({ battleNo: 3 }), x).flavour === lines[0]));
  bi = d.ctx.hsgBattleIntroText(pub({ battleNo: 2, replay: true }), 1);
  check('a Truce replay keeps the number and says again', bi.state === 'replay' && bi.title === 'Battle 2, again' && bi.ms === 3500);
  check('...the Truce line, and "this time"', /^A Truce!/.test(bi.flavour) && bi.call === 'Hana opens the first door this time.');
  bi = d.ctx.hsgBattleIntroText(pub({ battleNo: 1, replay: true }), 1);
  check('a Truce in Battle 1 replays — no second toss', bi.state === 'replay' && bi.title === 'Battle 1, again' && bi.ms === 3500);

  // The real flow agrees: the scheduled end IS hsgBattleIntroMs(pub), toss then not.
  d.set('hsgSeed', 3); d.ctx.hsgStartCampaign();
  check('the Campaign start schedules hsgBattleIntroMs(pub) (toss)', d.pendingMs().includes(d.ctx.hsgBattleIntroMs(d.get('hsgPub'))) && d.ctx.hsgBattleIntroMs(d.get('hsgPub')) === 4500);
  d.fire();
  check('the snap beat then the end: castle, no timer left', d.get('hsgPhase') === 'castle' && d.timers.length === 0);
  d.ctx.hsgStartBattle(); d.ctx.hsgTeardown();
  check('a teardown mid-intro clears both beats', d.timers.length === 0 && d.get('hsgPhase') === 'idle');

  // The Intro brief: MP_GAME_CONFIGS.hsg.intro.brief picks a variant from The Campaign,
  // and every variant it can pick exists in the real template (the engine would
  // otherwise fall back to 'default' — "First to 3" in a Single Battle).
  const eng = fs.readFileSync(path.join(ROOT, 'js/engine-multiplayer.js'), 'utf8');
  const st = eng.indexOf('const MP_GAME_CONFIGS = {');
  const lit = eng.slice(eng.indexOf('{', st), eng.indexOf('\n};', st) + 2);
  const bare = { window: { mpLobbyStyle: 'individual' } };
  vm.createContext(bare);
  const cfg = vm.runInContext('(' + lit + ')', bare).hsg;
  check('hsg adopts the Intro: template intro-hsg, a scene, a brief, no Line-up', !!cfg.intro && cfg.intro.template === 'intro-hsg' && typeof cfg.intro.scene === 'function' && typeof cfg.intro.brief === 'function' && !cfg.intro.lineup);
  check('...the scene getter is safe before hsg.js loads (null, not a throw)', cfg.intro.scene() === null);
  const pick = len => { if (len === undefined) delete bare.hsgCampaignLen; else bare.hsgCampaignLen = len; return cfg.intro.brief(0, -1); };
  check('brief: no game file → default; 3 → default; 1 → single; 5 → five', eq([pick(undefined), pick(3), pick(1), pick(5)], ['default', 'default', 'single', 'five']));
  const html = fs.readFileSync(path.join(ROOT, 'src/screens/hsg.html'), 'utf8');
  const tpl = (html.match(/<template id="intro-hsg">([\s\S]*?)<\/template>/) || [])[1] || '';
  const third = key => {
    const m = tpl.match(new RegExp('<ul data-intro-brief="' + key + '">([\\s\\S]*?)</ul>'));
    const li = m ? (m[1].match(/<li>[^<]*<\/li>/g) || []) : [];
    return li.length === 3 ? li[2] : '';
  };
  check('the template has all three brief variants, three lines each', ['default', 'single', 'five'].every(k => third(k) !== ''));
  check('...and each third line matches its Campaign', /First to 3 Seals/.test(third('default')) && /One Battle decides it/.test(third('single')) && /First to 5 Seals/.test(third('five')));
  check('the template carries four narrator lines + the roll-call hooks', (tpl.match(/data-intro-line/g) || []).length === 4 && /data-intro-roll>The lords take their cushions\.</.test(tpl) && /data-intro-ready-tag>BOWED IN</.test(tpl));
}

// ═══════════════════════════════════════════════════════════════════════════
section('13 · The War Chronicle (S6 — hsgChronicleModel picks the variant)');
{
  const d = makeDevice();
  d.set('hsgNames', ['Hana', 'Priya']);
  // seat 0 = Crimson (col 1), seat 1 = Indigo (col 0). pub.struck is per COLOUR [Indigo, Crimson].
  const mk = (result, over) => Object.assign({ battleNo: 2, cmd: 38, seatCol: [1, 0], struck: [6, 4], seals: [1, 0], campaignLen: 3,
    result: Object.assign({ reason: 'none', winnerSeat: -1, by: '', gekokujo: false, counts: [8, 9], campaignOver: false }, result) }, over || {});
  const model = (r, o) => d.ctx.hsgChronicleModel(mk(r, o));

  check('no result yet → no Chronicle', model({}) === null);
  const m1 = model({ reason: 'shogun', winnerSeat: 0, by: 'Sm' });
  check('Found you!: the brief §17 headline, sub-line and quote', m1.variant === 'shogun' && m1.head === 'Found you!' && m1.sub === 'Crimson Sun wins Battle 2.' && /^“The fox slips past the Guards/.test(m1.quote));
  check('...Next Battle, a Seal tally, the stats from the pub', m1.cta === 'Next Battle' && m1.showTally && m1.commands === 38 && eq(m1.struck, [['Crimson', 4], ['Indigo', 6]]));
  const m2 = model({ reason: 'shogun', winnerSeat: 1, by: 'Fm', gekokujo: true });
  check('Gekokujo!: a Farmer’s win has its own headline and quote', m2.variant === 'gekokujo' && m2.head === 'Gekokujo!' && m2.sub === 'Indigo Moon wins Battle 2.' && /farmer topples the Shogun/.test(m2.quote));
  const m3 = model({ reason: 'lantern', winnerSeat: 0, counts: [8, 9] });
  check('The Last Lantern: the counts and who holds the castle', m3.head === 'The Last Lantern' && m3.quote === 'The last lantern is out. Pieces in the open: Crimson 9 · Indigo 8. Crimson Sun holds the castle.');
  const m4 = model({ reason: 'truce', winnerSeat: -1, counts: [7, 7] });
  check('Truce: no winner, no Seal, and the button reads Replay the Battle', m4.truce && m4.head === 'A Truce!' && m4.sub === 'No Seal this Battle.' && m4.cta === 'Replay the Battle' && m4.banners.every(b => b.state === 'even'));
  const m5 = model({ reason: 'cornered', winnerSeat: 0 });
  check('Cornered: names the cornered clan (the loser)', m5.head === 'Cornered!' && m5.quote === 'Indigo Moon is Cornered. Nowhere left to hide.');
  check('the winner’s banner is won, the other lost (and the bottom seat hangs first)', eq(m1.banners.map(b => b.state), ['won', 'lost']) && m1.banners[0].name === 'Hana');
  const mf = model({ reason: 'shogun', winnerSeat: 1, by: 'Sm', campaignOver: true }, { seals: [1, 3] });
  check('Campaign won: the headline is the Campaign, the variant title moves to the sub-line', mf.final && mf.head === 'Priya takes the Campaign!' && mf.sub === 'Found you! Indigo Moon wins Battle 2.');
  check('a Single Battle (First to 1) shows no Seal tally', model({ reason: 'cornered', winnerSeat: 0, campaignOver: true }, { campaignLen: 1 }).showTally === false);

  // The real flow: the ending beat paints the right screen for the right reason.
  const e = makeDevice();
  fresh(e, { len: 1, seed: 5 });
  e.ctx.hsgEndBattle({ reason: 'cornered', winnerSeat: 0, by: '', gekokujo: false, counts: [3, 2], campaignOver: false });
  e.set('hsgPub', e.ctx.hsgBuildPub());
  e.fire();
  check('First to 1 → the ending beat opens the gameover, not the Chronicle', e.lastScreen() === 'screen-hsg-gameover' && e.get('hsgPhase') === 'gameover');
  const f = makeDevice();
  fresh(f, { len: 3, seed: 5 });
  f.ctx.hsgEndBattle({ reason: 'truce', winnerSeat: -1, by: '', gekokujo: false, counts: [3, 3], campaignOver: false });
  f.set('hsgPub', f.ctx.hsgBuildPub());
  f.fire();
  check('a Truce → the Chronicle; Replay keeps the Battle number and flips the first move',
    f.lastScreen() === 'screen-hsg-chronicle' && (() => { const was = f.get('hsgFirstSeat'); f.ctx.hsgHostNextBattle(0, { battleNo: 1, replay: false });
      return f.get('hsgBattleNo') === 1 && f.get('hsgReplay') === true && f.get('hsgFirstSeat') === 1 - was && f.lastScreen() === 'screen-hsg-battle-intro'; })());
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n' + (fail ? '✗' : '✓') + ` ${pass} passed, ${fail} failed`);
if (fail) { failures.forEach(f => console.log('  ✗ ' + f)); process.exit(1); }
