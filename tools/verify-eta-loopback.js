// ═══════════════════════════════════════════════════════════════════════════
// verify-eta-loopback.js — ETA? in Lobby Mode, driven through the REAL
// js/engine-multiplayer.js + js/engine-intro.js + js/games/eta.js on a host and
// up to 4 clients, over the shared fake Firebase world (tools/lib/mp-world.js):
// a WIRE that erases empty values, a private queue per uid, a mock DOM of real
// elements (the plugin's DOMContentLoaded wiring runs, so real buttons are clicked),
// a console whose warn lands in the error list, a fake clock.
//
//   node tools/verify-eta-loopback.js       (exits 1 on any failure)
//   ETA_SRC=path node tools/…               (drive a deliberately-broken eta.js)
//
// The board / docket / badge / Intro scene need a real DOM; here they are RECORDING
// fakes (spec §15 Stage 3): every callback still runs on the fake clock, so the real
// phase machine is exercised, and what each device hands its board is scanned.
// Privacy invariants: spec §11.
// ═══════════════════════════════════════════════════════════════════════════
'use strict';
const fs = require('fs'), path = require('path');
const W = require('./lib/mp-world');
const { ROOT, fbRead, flush, server, makePhone, devices, boot, advance, check, ok, section, errorsOf } = W;

const ETA    = process.env.ETA_SRC ? path.resolve(process.env.ETA_SRC) : path.join(ROOT, 'js/games/eta.js');
const etaSrc = fs.readFileSync(ETA, 'utf8');
const KIT    = fs.readFileSync(path.join(ROOT, 'js/games/eta-scene.js'), 'utf8').replace(/\r\n/g, '\n');   // a CRLF checkout
const DATA   = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/eta-data.json'), 'utf8'));
const ALL_RIDES = DATA.rides.map(d => d.name);

// The pure formatting half of the kit is loaded for real; the DOM half is faked.
const KIT_PURE = ['etaFmtInt', 'etaNum', 'etaDur', 'etaKitEsc', 'etaKitTrim']
  .map(n => (new RegExp(`^function ${n}\\(.*\\}$`, 'm').exec(KIT) || new RegExp(`function ${n}\\([\\s\\S]*?\\n\\}\\n`).exec(KIT))[0]).join('\n');

const FAKE_KIT = `
  const __board = { calls: [], rowsSeen: [], ghosts: [], proofRows: null };
  function etaMakeBoard(root, opts) {
    const B = { root, opts };
    const later = (fn, ms) => setTimeout(fn, ms);
    ['setReduced','setHeader','setNote','setSelectable','setSelected','setStamped','settleReveal','skip','stop']
      .forEach(k => { B[k] = (...a) => { __board.calls.push(k); }; });
    B.setRows = (rows, o) => { __board.calls.push('setRows'); __board.rowsSeen.push(JSON.parse(JSON.stringify(rows))); };
    B.setGhost = (i, m) => { if (i >= 0) __board.ghosts.push({ i, m }); };
    B.reveal = done => { __board.calls.push('reveal'); later(done, 600); };
    B.shove  = (list, rev, done) => { __board.calls.push('shove:' + list.length); later(done, 900); };
    B.proof  = (rows, best, done) => { __board.calls.push('proof'); __board.proofRows = JSON.parse(JSON.stringify(rows)); later(done, 1500); };
    return B;
  }
  function etaDocketInto(root, d) { root.innerHTML = JSON.stringify(d); }
  function etaRenderBadge(mode, o) { const e = document.createElement('span'); e.textContent = mode; return e; }
  function etaNoteInto() {}
  const EtaScene = { mount() {}, beat() {}, stop() {} };
`;

const seeded = seed => `(() => { let s = ${seed >>> 0 || 1}; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; })()`;

function addEta(d, seed) {
  d.S.isSecretMode = false;
  d.S.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve(JSON.parse(JSON.stringify(DATA))) });
  ['playResume', 'playSyllyOn', 'playSyllyOff', 'playSliderTick', 'playHullThud', 'playAbyssThud', 'playStampede',
   'playClashWin', 'playSplash', 'openSoundOverlay'].forEach(n => { d.S[n] = () => {}; });
  d.S.mpShowModeScreen = () => {};
  const els = new Map();
  const orig = d.S.document.getElementById;
  d.S.document.getElementById = function (id) { const e = orig.call(this, id); els.set(id, e); return e; };
  d.els = els;
  d.domText = () => [...els.values()].map(e => [e.textContent, e.innerHTML, e.value].join(' ')).join('\n');
  d.run(KIT_PURE);
  d.run(FAKE_KIT);
  d.run(etaSrc);
  d.run(`etaRng = ${seeded(seed)};`);
  d.run('mpWireIntro();');
  (d.S.document._l.DOMContentLoaded || []).forEach(fn => fn());   // the plugin's own wiring
  d.run(`{ const __r = resetToLobby; resetToLobby = () => { etaTeardown(); __r(); }; }`);
}

function useEta(d) { d.run(`mpActiveGame = 'eta'; mpActiveGameConfig = MP_GAME_CONFIGS.eta; activeGameId = 'eta';`); }

async function etaMatch(names, opts) {
  opts = opts || {};
  server.tree = {}; server.subs = []; devices.length = 0;
  const host = boot('host', 'uH', makePhone());
  addEta(host, opts.seed || 7);
  host.S.localStorage.setItem('sylly_nickname', names[0]);
  useEta(host);
  host.run(`etaShiftLength = ${opts.runs || 3}; etaSyllyMode = ${!!opts.sylly}; etaOffMap = ${!!opts.offMap}; etaGps = ${opts.gps !== false}; etaRange = '${opts.range || 'mixed'}';`);
  host.run('mpHostCreateRoom()');
  await flush();
  const code = host.run('mpActiveRoomCode');
  const clients = [];
  for (let i = 1; i < names.length; i++) {
    const c = boot('c' + i, 'u' + i, makePhone());
    addEta(c, 100 + i);
    useEta(c);
    code.split('').forEach((ch, j) => { c.el('mp-join-c' + (j + 1)).value = ch; });
    c.el('mp-join-nickname-input').value = names[i];
    c.run('mpClientJoinRoom()');
    await flush();
    clients.push(c);
  }
  host.run('mpConfirmRoster()');
  await flush();
  const all = [host, ...clients];
  host.run('mpIntroSkip()'); await flush();
  all.forEach(d => d.run('mpIntroReady()')); await flush();
  host.run('mpIntroStart(false)');
  for (let i = 0; i < 6; i++) await flush();             // etaEnsureData() is async on the host
  return { host, clients, all, code };
}

const J = (d, expr) => d.run(`JSON.parse(JSON.stringify(${expr}))`);
const seatOf = d => d.run('mpMyPlayerIdx');
const pubEvents = code => {
  const ev = fbRead(server.read(`rooms/${code}/events`)) || {};
  return Object.keys(ev).sort().map(k => ev[k]).filter(e => e && e.payload);
};
const privOf = (code, uid) => {
  const ev = fbRead(server.read(`rooms/${code}/private/${uid}`)) || {};
  return Object.keys(ev).sort().map(k => ev[k]).filter(e => e && e.payload);
};
const ERR = [];

// One full Run on every device. plan(seat, M) → { log: minutes|null, stamp: seat, corr: {target, mult}|null }
async function playRun(M, plan) {
  const { host, all } = M;
  advance(8000); await flush();                                   // the docket → the log screen
  all.forEach(d => ok(`${d.name}: on the log screen (Run ${host.run('etaRun')})`, d.screens[d.screens.length - 1] === 'screen-eta-log', d.screens.slice(-3).join(',')));
  const truths = J(host, 'etaRunTruths');
  for (const d of all) {
    const seat = seatOf(d);
    const p = plan(seat, M, truths);
    if (p.log == null) continue;
    d.run(`etaPendingEntry = { value: ${p.log}, unit: 'min', mult: 1, minutes: ${p.log}, label: '${p.log} minutes' };`);
    d.el('btn-eta-doubletake-confirm').click();
    await flush();
  }
  return truths;
}

async function socialRound(M, plan, sylly) {
  const { all } = M;
  advance(1000); await flush();                                     // the board's reveal → talk
  for (const d of all) {
    const seat = seatOf(d);
    const p = plan(seat, M);
    if (p.skip) continue;
    if (!sylly) {
      if (p.stampFirst != null) { d.run(`etaMySelect = ${p.stampFirst}`); d.el('btn-eta-stamp').click(); await flush(); }
      d.run(`etaMySelect = ${p.stamp}`); d.el('btn-eta-stamp').click();
    } else if (p.corr) {
      d.run(`etaMySelect = ${p.corr.target}; etaMyMult = ${p.corr.mult};`); d.el('btn-eta-wheel-lock').click();
    } else d.el('btn-eta-wheel-hands').click();
    await flush();
  }
  advance(20000); await flush();                                    // shove → proof → done
}

(async () => {
  // ═════════════════════════════════════════════════════════════════════════
  section('1. Config + entry');
  const M = await etaMatch(['Ada', 'Boris', 'Chloe', 'Dev'], { runs: 3, seed: 21 });
  const { host, clients, all, code } = M;
  check('host is seat 0, clients follow', all.map(seatOf), [0, 1, 2, 3]);
  all.forEach(d => check(`${d.name}: names from the lobby`, J(d, 'etaPlayerNames'), ['Ada', 'Boris', 'Chloe', 'Dev']));
  all.forEach(d => check(`${d.name}: Run 1 open, 3-Run Shift`, [d.run('etaRun'), d.run('etaRuns')], [1, 3]));
  all.forEach(d => ok(`${d.name}: the job docket is up`, d.screens.includes('screen-eta-docket')));
  const rides1 = J(host, 'etaRunRides.map(r => r.name)');
  all.forEach(d => check(`${d.name}: holds only its own Ride`, d.run('etaMyRide && etaMyRide.name'), rides1[seatOf(d)]));

  section('2. Privacy before the Run Sheet');
  let ev = pubEvents(code);
  const runStart = ev.find(e => e.payload.action === 'ETA_RUN_START');
  ok('ETA_RUN_START carries no Ride, speed or truth', runStart && !/"ride"|"rides"|cruise|"max"|truth|speed/.test(JSON.stringify(runStart.payload)), JSON.stringify(runStart && runStart.payload).slice(0, 200));
  ok('no public envelope names a dealt Ride before the Run Sheet', !ev.some(e => rides1.some(r => JSON.stringify(e.payload).includes(r))));
  clients.forEach(c => {
    const q = privOf(code, c.uid);
    ok(`${c.name}: its private queue holds exactly its own ETA_RIDE`, q.length === 1 && q[0].payload.action === 'ETA_RIDE' && q[0].payload.ride.name === rides1[seatOf(c)], JSON.stringify(q.map(x => x.payload)));
    ok(`${c.name}: the private Ride has no speed`, !/cruise|"max"|speed|truth/.test(JSON.stringify(q)));
    const others = rides1.filter((r, i) => i !== seatOf(c) && r !== rides1[seatOf(c)]);
    ok(`${c.name}: no other courier's Ride anywhere in its DOM`, !others.some(r => c.domText().includes(r)));
  });

  // ── Run 1: Standard. Dev never logs (the log stall), then a Stamp change. ──
  section('3. Log ETA — private entries, the readiness count, the log stall');
  await playRun(M, (seat, _, truths) => ({ log: seat === 3 ? null : Math.round(truths[seat] * (seat + 1)) }));
  ev = pubEvents(code);
  ok('no Logged ETA ever on the public channel', !ev.some(e => e.payload.action === 'ETA_LOG'));
  const hostQ = privOf(code, 'uH');
  check('the host received two private ETA_LOGs (Boris, Chloe — the host logs directly, Dev never)', hostQ.filter(e => e.payload.action === 'ETA_LOG').length, 2);
  const st = ev.filter(e => e.payload.action === 'ETA_LOG_STATUS').pop();
  ok('ETA_LOG_STATUS carries bools only, and a stall deadline', st && st.payload.ready.every(x => x === true || x === false) && st.payload.stallEndsAt > 0, JSON.stringify(st && st.payload));
  all.forEach(d => check(`${d.name}: the readiness count agrees`, J(d, 'etaLogReady'), [true, true, true, false]));
  ok('nobody is on the Run Sheet yet', all.every(d => d.screens[d.screens.length - 1] !== 'screen-eta-sheet'));
  advance(61000); await flush();
  all.forEach(d => ok(`${d.name}: the log stall opened the Run Sheet`, d.screens.includes('screen-eta-sheet')));
  ev = pubEvents(code);
  const sheet = ev.find(e => e.payload.action === 'ETA_SHEET');
  ok('ETA_SHEET: the first public sight of the Rides', !!sheet && sheet.payload.rows.length === 4);
  ok('ETA_SHEET carries no speed or truth', !/cruise|"max"|speed|truth/.test(JSON.stringify(sheet.payload)));
  all.forEach(d => check(`${d.name}: Dev has No ETA`, J(d, 'etaLogged[3]'), null));
  all.forEach(d => ok(`${d.name}: the board got logged ETAs only`, J(d, '__board.rowsSeen').every(rs => rs.every(r => Object.keys(r).sort().join() === 'logged,mode,name,ride,unreg'))));

  section('4. Stamps — private, changeable until all are in');
  await socialRound(M, seat => (seat === 1 ? { stampFirst: 2, stamp: 0 } : { stamp: seat === 0 ? 1 : 0 }), false);
  ev = pubEvents(code);
  ok('no Stamp target ever on the public channel', !ev.some(e => e.payload.action === 'ETA_STAMP'));
  const soc = ev.filter(e => e.payload.action === 'ETA_SOCIAL_STATUS');
  ok('ETA_SOCIAL_STATUS carries bools only', soc.length > 0 && soc.every(e => !/target/.test(JSON.stringify(e.payload))));
  const proof1 = ev.find(e => e.payload.action === 'ETA_PROOF');
  ok('the Proof arrives', !!proof1);
  const before = ev.slice(0, ev.indexOf(proof1));
  ok('no truth or speed in any public envelope before ETA_PROOF', !before.some(e => /truths|speeds|cruise/.test(JSON.stringify(e.payload))));
  check("Boris changed his Stamp from Chloe to Ada: Ada 3, Boris 1, Chloe 0 (a No-ETA courier can still stamp)", J(host, 'etaProof.stampsIn'), [3, 1, 0, 0]);
  all.forEach(d => check(`${d.name}: same totals as the host`, J(d, 'etaTotals'), J(host, 'etaTotals')));
  all.forEach(d => check(`${d.name}: the sheet settled ('done')`, d.run('etaPhase'), 'done'));
  all.forEach(d => ok(`${d.name}: the board was handed truths only at Proof`, J(d, '__board.proofRows').length === 4));
  check('Dev scored no Accuracy (No ETA)', J(host, 'etaProof.receipts[3][0]'), { key: 'acc', label: 'Accuracy (no ETA)', km: 0 });
  // Placings (playtest round 1): derived on every device from the Proof — never sent before it.
  all.forEach(d => check(`${d.name}: same placings as the host`, J(d, 'etaProof.places'), J(host, 'etaProof.places')));
  check('Dev (No ETA) is unplaced; someone is 1st', [J(host, 'etaProof.places[3]'), J(host, 'etaProof.places').includes(1)], [0, true]);
  all.forEach(d => check(`${d.name}: the board got each row's place`, J(d, '__board.proofRows.map(r => r.place)'), J(host, 'etaProof.places')));
  all.forEach(d => ok(`${d.name}: the board got SAID / TRUE in words`, J(d, '__board.proofRows').every((r, i) => r.trueLabel && (i === 3 ? r.said === '' : !!r.said))));
  all.forEach(d => ok(`${d.name}: Your result is shown once the sheet settles`, d.el('eta-my-result').style.display !== 'none' && /YOUR RESULT/.test(d.el('eta-my-result').innerHTML)));

  section('5. Tally → Next job (host only)');
  all.forEach(d => d.el('btn-eta-odometer').click());
  all.forEach(d => ok(`${d.name}: on the Odometer tally`, d.screens[d.screens.length - 1] === 'screen-eta-tally'));
  clients.forEach(c => { c.el('btn-eta-next').click(); });
  await flush();
  check('a client cannot hand out the next job', host.run('etaRun'), 1);
  host.el('btn-eta-next').click();
  await flush();
  all.forEach(d => check(`${d.name}: Run 2`, d.run('etaRun'), 2));

  section('6. Stale and forged packets');
  host.run(`etaHandleEnvelope({ type: 'ACTION', originId: 'u1', payload: { action: 'ETA_LOG', run: 1, minutes: 5 } })`);
  check('a Run-1 log in Run 2 is dropped', J(host, 'etaLogReady'), [false, false, false, false]);
  host.run(`etaHandleEnvelope({ type: 'ACTION', originId: 'uStranger', payload: { action: 'ETA_LOG', run: 2, minutes: 5 } })`);
  check('a stranger (not on the roster) is dropped', J(host, 'etaLogReady'), [false, false, false, false]);
  host.run(`etaHandleEnvelope({ type: 'ACTION', originId: 'u2', payload: { action: 'ETA_LOG', run: 2, minutes: 5, seat: 1 } })`);
  check('the seat comes from originId, never the payload', J(host, 'etaLogReady'), [false, false, true, false]);
  host.run(`etaHandleEnvelope({ type: 'ACTION', originId: 'u2', payload: { action: 'ETA_LOG', run: 2, minutes: 9 } })`);
  check('a second log from the same seat is dropped', host.run('etaLogged[2]'), 5);

  // Runs 2–3 normally, then End of Shift.
  await playRun(M, (seat, _, truths) => ({ log: seat === 2 ? null : Math.round(truths[seat] * 1.5) }));
  advance(100); await flush();
  await socialRound(M, seat => ({ stamp: (seat + 1) % 4 }), false);
  all.forEach(d => check(`${d.name}: Run 2 resolved, same totals`, J(d, 'etaTotals'), J(host, 'etaTotals')));
  all.forEach(d => d.el('btn-eta-odometer').click());
  host.el('btn-eta-next').click(); await flush();
  await playRun(M, (seat, _, truths) => ({ log: Math.round(truths[seat] * 0.5) }));
  advance(100); await flush();
  await socialRound(M, seat => ({ stamp: (seat + 1) % 4 }), false);
  all.forEach(d => d.el('btn-eta-odometer').click());
  check('the last tally offers End of Shift', host.el('btn-eta-next').textContent, 'End of Shift');
  host.el('btn-eta-next').click(); await flush();
  all.forEach(d => ok(`${d.name}: End of Shift`, d.screens[d.screens.length - 1] === 'screen-eta-gameover'));
  all.forEach(d => check(`${d.name}: same winners + awards`, J(d, 'etaShiftEnd'), J(host, 'etaShiftEnd')));
  ok('an end screen is an MP end screen', host.run(`MP_END_SCREENS.has('screen-eta-gameover')`));
  ERR.push(...errorsOf(all));

  // ═════════════════════════════════════════════════════════════════════════
  section('7. Backseat Drivers — 5 couriers, private corrections, the reveal');
  const N = await etaMatch(['Ada', 'Boris', 'Chloe', 'Dev', 'Eli'], { runs: 3, sylly: true, offMap: true, seed: 33 });
  check('Sylly is frozen into the Shift on every device', N.all.map(d => d.run('etaSylly')), [true, true, true, true, true]);
  await playRun(N, (seat, _, truths) => ({ log: Math.round(truths[seat] * (seat % 2 ? 3 : 0.5)) }));
  advance(100); await flush();
  const plan = seat => (seat === 4 ? {} : { corr: { target: (seat + 1) % 4 === seat ? 0 : (seat === 0 ? 1 : 0), mult: seat === 0 ? 2 : 0.5 } });
  // a ghost is previewed only on the corrector's own screen
  advance(1000); await flush();
  N.clients[0].run('etaMySelect = 0; etaMyMult = 3; etaRenderSheetControls();');
  ok("a correction's ghost exists only on its own device", N.all.filter(d => J(d, '__board.ghosts').length).length === 1);
  await socialRound(N, plan, true);
  ev = pubEvents(N.code);
  ok('no Course Correction ever on the public channel before the reveal', !ev.some(e => e.payload.action === 'ETA_CORRECT'));
  const cor = ev.find(e => e.payload.action === 'ETA_CORRECTIONS');
  const prf = ev.find(e => e.payload.action === 'ETA_PROOF');
  ok('ETA_CORRECTIONS comes before ETA_PROOF and carries no truth', cor && prf && ev.indexOf(cor) < ev.indexOf(prf) && !/truth|speed/.test(JSON.stringify(cor.payload)));
  N.all.forEach(d => check(`${d.name}: same Revised ETAs`, J(d, 'etaRevised'), J(N.host, 'etaRevised')));
  N.all.forEach(d => ok(`${d.name}: the board shoved before the Proof`, J(d, '__board.calls').indexOf('shove:4') >= 0 && J(d, '__board.calls').lastIndexOf('proof') > J(d, '__board.calls').indexOf('shove:4')));
  N.all.forEach(d => check(`${d.name}: same totals`, J(d, 'etaTotals'), J(N.host, 'etaTotals')));
  check('Eli (Hands off) has no Navigation Assist or Detour', J(N.host, 'etaProof.receipts[4].filter(l => l.key === "nav" || l.key === "det").length'), 0);
  ok('a correction moved at least one ETA (so the next check means something)', J(N.host, 'etaRevised.some((r, i) => r && Math.abs(r - etaLogged[i]) > 1e-6)'));
  check('placings rank the Logged ETA, never the Revised one', J(N.host, 'etaProof.places'), J(N.host, 'etaPlacings(etaLogged, etaProof.truths)'));
  N.all.forEach(d => check(`${d.name}: same placings`, J(d, 'etaProof.places'), J(N.host, 'etaProof.places')));

  section('8. Backseat Drivers — everyone Hands off (an empty list over the wire)');
  N.all.forEach(d => d.el('btn-eta-odometer').click());
  N.host.el('btn-eta-next').click(); await flush();
  await playRun(N, (seat, _, truths) => ({ log: Math.round(truths[seat] * 2) }));
  advance(100); await flush();
  await socialRound(N, () => ({}), true);
  N.all.forEach(d => check(`${d.name}: the empty corrections list survived the wire`, J(d, 'etaCorrList'), []));
  N.all.forEach(d => check(`${d.name}: settled`, d.run('etaPhase'), 'done'));
  ERR.push(...errorsOf(N.all));

  // ═════════════════════════════════════════════════════════════════════════
  section('9. The Mid-Game Quit Contract');
  const Q = await etaMatch(['Ada', 'Boris', 'Chloe'], { runs: 3, seed: 5 });
  advance(8000); await flush();
  Q.clients[1].el('btn-eta-quit-confirm').click();
  await flush();
  ok('a client quitting ends the Shift for the host', Q.host.S.__resets > 0);
  ok('…and the host tells everyone else (HOST_END_GAME reached the other client)', Q.clients[0].inbox.some(e => e.payload && e.payload.action === 'HOST_END_GAME'));
  ok('…and the room is gone', server.read(`rooms/${Q.code}`) === undefined);
  ERR.push(...errorsOf(Q.all).filter(e => !/HOST_END_GAME|host-disconnected/.test(e)));

  section('10. Zero warnings');
  ok('no device logged a warning or error', ERR.length === 0, ERR.slice(0, 6).join('\n          '));
  W.report();
})().catch(e => { console.error(e); process.exit(1); });
