// ═══════════════════════════════════════════════════════════════════════════
// verify-hsg-loopback.js — Hide and Shogun in Lobby Mode (spec §15, stage S7),
// driven through the REAL js/engine-multiplayer.js + js/engine-intro.js +
// js/games/hsg-rules.js + hsg-scene.js + hsg.js on a host and a client, over the
// shared fake Firebase world (tools/lib/mp-world.js): a WIRE that erases empty
// values, a private queue per uid, a mock DOM of REAL elements (the plugin's
// DOMContentLoaded wiring runs, so the real Next Battle / quit buttons are
// clicked and every renderer paints), a console whose warn lands in the error
// list, a fake clock.
//
//   node tools/verify-hsg-loopback.js        (exits 1 on any failure)
//   HSG_SRC=path node tools/verify-hsg-loopback.js   drive a deliberately broken hsg.js
//
// What this proves (packets, state — never presentation):
//   1. Entry: the Intro → the host deals Battle 1, the client waits on standby
//      and then runs its OWN Battle intro off HSG_BATTLE_START (same flavour).
//   2. Whole Campaigns with both seats acting through hsgTap: after every
//      Command the client's pub, news and screen match the host's.
//   3. Privacy, client side: the client never holds hsgB; every '#' it is sent is
//      just '#'; and shuffling the host's closed doors then repairing the client
//      leaves the client's pub AND its painted DOM byte-identical.
//   4. Next Battle from the client; both players tapping it → one Battle.
//   5. Double-tap → one HSG_COMMAND on the wire.
//   6. Refusals (wrong turn, stale tag, illegal act, seat named in the payload,
//      a stranger) change nothing and repair the client with HSG_STATE, which
//      releases its sync lock.
//   7. HSG_STATE's appliers land on the right screen from each phase.
//   8. The quit contract both ways.
//   9. Zero warnings on every device.
// Not here: the rejoin itself (reconnect is S9), bots (S8), layout.
// ═══════════════════════════════════════════════════════════════════════════
'use strict';
const fs = require('fs'), path = require('path');
const W = require('./lib/mp-world');
const { ROOT, fbRead, flush, server, makePhone, devices, boot, advance, check, ok, section, errorsOf } = W;

const HSG      = process.env.HSG_SRC ? path.resolve(process.env.HSG_SRC) : path.join(ROOT, 'js/games/hsg.js');
const hsgSrc   = fs.readFileSync(HSG, 'utf8');
const rulesSrc = fs.readFileSync(path.join(ROOT, 'js/games/hsg-rules.js'), 'utf8');
const sceneSrc = fs.readFileSync(path.join(ROOT, 'js/games/hsg-scene.js'), 'utf8');

const seeded = seed => `(() => { let s = ${seed >>> 0 || 1}; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; })()`;
function rngOf(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

function addHsg(d, seed) {
  ['openSoundOverlay', 'playFanSnap', 'playPaperSlide', 'playHullThud', 'playClashWin', 'playUnchallenged']
    .forEach(n => { d.S[n] = () => {}; });
  d.S.mpShowModeScreen = () => {};
  const els = new Map();
  const orig = d.S.document.getElementById;
  d.S.document.getElementById = function (id) { const e = orig.call(this, id); els.set(id, e); return e; };
  d.els = els;
  // Everything this device has painted, depth-first through appended children.
  d.domText = () => {
    const out = [];
    const walk = e => { if (!e) return; out.push([e.textContent, e.innerHTML, e.value, e.className, JSON.stringify(e._attrs)].join(' ')); (e.children || []).forEach(walk); };
    [...els.keys()].sort().forEach(k => walk(els.get(k)));
    return out.join('\n');
  };
  d.run(rulesSrc);
  d.run(sceneSrc);
  d.run(hsgSrc);
  d.run(`Math.random = ${seeded(seed)};`);              // the fan toss + the flavour, reproducibly
  d.run('mpWireIntro();');
  (d.S.document._l.DOMContentLoaded || []).forEach(fn => fn());   // the plugin's own wiring
  d.run(`{ const __r = resetToLobby; resetToLobby = () => { hsgTeardown(); __r(); }; }`);
}
const useHsg = d => d.run(`mpActiveGame = 'hsg'; mpActiveGameConfig = MP_GAME_CONFIGS.hsg; activeGameId = 'hsg';`);

async function hsgMatch(names, opts) {
  opts = opts || {};
  server.tree = {}; server.subs = []; devices.length = 0;
  const host = boot('host', 'uH', makePhone());
  addHsg(host, opts.seed || 7);
  host.S.localStorage.setItem('sylly_nickname', names[0]);
  useHsg(host);
  host.run(`hsgCampaignLen = ${opts.len || 3}; hsgFoxes = ${opts.foxes || 4}; hsgSeed = ${opts.layout || 11};`);
  host.run('mpHostCreateRoom()');
  await flush();
  const code = host.run('mpActiveRoomCode');
  const c = boot('c1', 'u1', makePhone());
  addHsg(c, 100 + (opts.seed || 7));
  useHsg(c);
  code.split('').forEach((ch, j) => { c.el('mp-join-c' + (j + 1)).value = ch; });
  c.el('mp-join-nickname-input').value = names[1];
  c.run('mpClientJoinRoom()');
  await flush();
  host.run('mpConfirmRoster()');
  await flush();
  const all = [host, c];
  host.run('mpIntroSkip()'); await flush();
  all.forEach(d => d.run('mpIntroReady()')); await flush();
  host.run('mpIntroStart(false)');
  await flush();
  return { host, client: c, all, code };
}

const J = (d, expr) => d.run(`JSON.parse(JSON.stringify(${expr}))`);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const seatOf = d => d.run('mpMyPlayerIdx');
const last = d => d.screens[d.screens.length - 1];
const pubEvents = code => {
  const ev = fbRead(server.read(`rooms/${code}/events`)) || {};
  return Object.keys(ev).sort().map(k => ev[k]).filter(e => e && e.payload);
};
const privOf = (code, uid) => {
  const ev = fbRead(server.read(`rooms/${code}/private/${uid}`)) || {};
  return Object.keys(ev).sort().map(k => ev[k]).filter(e => e && e.payload);
};
const ERR = [];
const PUB_KEYS = ['battleNo', 'board', 'campaignLen', 'cmd', 'firstSeat', 'foxTotal', 'foxesHeld', 'guards', 'last', 'quiet', 'replay', 'result', 'seals', 'seatCol', 'struck', 'turnSeat'];

// Every HSG envelope the client was ever sent: shape + the '#' rule.
function scanClientInbox(c) {
  const bad = [];
  c.inbox.filter(e => e.payload && /^HSG_/.test(e.payload.action)).forEach(e => {
    const p = e.payload, keys = Object.keys(p).sort().join();
    const allowed = { HSG_BATTLE_START: 'action,flavourIdx,pub', HSG_COMMAND_DONE: 'act,action,fx,pub', HSG_STATE: 'action,phase,pub' }[p.action];
    // fx may be erased by the wire when empty — that is the wire, not a leak
    const keysOk = p.action === 'HSG_COMMAND_DONE' ? (keys === allowed || keys === 'act,action,pub') : (p.action === 'HSG_COMMAND' || p.action === 'HSG_NEXT_BATTLE' || keys === allowed);
    if (!keysOk) bad.push(p.action + ' keys ' + keys);
    if (p.pub) {
      const b = p.pub.board || {};
      Object.keys(b).forEach(k => { const s = b[k]; if (typeof s === 'string' && s.indexOf('#') >= 0 && s !== '#') bad.push('cell ' + s); });
      if (/seed|layout|pool|shroud|unseen/i.test(JSON.stringify(p))) bad.push(p.action + ' names a secret key');
    }
  });
  return bad;
}

// One Command for whoever's turn it is, through the real tap path. Returns the act.
function chooseAct(d, rnd) {
  const legal = J(d, 'hsgLegalFor(hsgPub, mpMyPlayerIdx)');
  const strikes = legal.filter(a => a[0] === 'S');
  const pool = strikes.length && rnd() < 0.6 ? strikes : legal;
  return pool[Math.floor(rnd() * pool.length)];
}
async function tapAct(d, act) {
  if (act[0] === 'U') { d.run(`hsgTap(${act[1]})`); d.run(`hsgTap(${act[1]})`); }
  else { d.run(`hsgTap(${act[1]})`); d.run(`hsgTap(${act[2]})`); }
  await flush();
}

// Plays the current Battle to its end. Checks host/client agreement after every Command.
async function playBattle(M, rnd, tally) {
  const { host, client, all } = M;
  let guard = 0, agree = true, agreeNews = true, sameScreen = true, noSecret = true;
  while (host.run('hsgPub.result.reason') === 'none' && guard++ < 400) {
    const turn = host.run('hsgPub.turnSeat');
    const d = all.find(x => seatOf(x) === turn);
    const before = host.run('hsgPub.cmd');
    const act = chooseAct(d, rnd);
    await tapAct(d, act);
    const after = host.run('hsgPub.cmd');
    if (after !== before + 1) { ok(`a ${d.name} tap made exactly one Command (cmd ${before} → ${after}, act ${JSON.stringify(act)})`, false); return false; }
    tally[d.name] = (tally[d.name] || 0) + 1;
    if (!eq(J(client, 'hsgPub'), J(host, 'hsgPub'))) agree = false;
    if (!eq(J(client, 'hsgNewsFx'), J(host, 'hsgNewsFx'))) agreeNews = false;
    if (last(client) !== last(host)) sameScreen = false;
    if (client.run('hsgB') !== null) noSecret = false;
    if (client.run('window.syllySyncLocked')) { ok('the client is unlocked after every Command', false); return false; }
  }
  ok(`the Battle ended (${host.run('hsgPub.cmd')} Commands, ${host.run('hsgPub.result.reason')})`, host.run('hsgPub.result.reason') !== 'none');
  ok('after every Command the client\'s pub is the host\'s, byte for byte', agree);
  ok('…and its news (the fx keys, empty lists rebuilt off the wire)', agreeNews);
  ok('…and it is on the same screen', sameScreen);
  ok('…and it never held the secret (hsgB stays null on the client)', noSecret);
  return true;
}

// The Battle's ending beat → the Chronicle on both.
async function toChronicle(M) {
  advance(2500); await flush();
  const final = M.host.run('hsgPub.result.campaignOver');
  const want = final ? 'screen-hsg-gameover' : 'screen-hsg-chronicle';
  M.all.forEach(d => check(`${d.name}: the ending beat → ${want.replace('screen-hsg-', '')}`, last(d), want));
  const pick = d => J(d, '(m => ({ v: m.variant, f: m.final, h: m.head, s: m.sub, q: m.quote, c: m.cta }))(hsgChronicleModel(hsgPub))');
  check('the client\'s War Chronicle says what the host\'s says', pick(M.client), pick(M.host));
  return final;
}

async function toCastle(M) {
  advance(4600); await flush();
  M.all.forEach(d => check(`${d.name}: the Battle intro ends on the Castle`, [last(d), d.run('hsgPhase')], ['screen-hsg-castle', 'castle']));
}

(async () => {
  // ═════════════════════════════════════════════════════════════════════════
  section('1. Entry: the Intro, standby, the client\'s own Battle intro');
  const M = await hsgMatch(['Hana', 'Priya'], { len: 3, seed: 21, layout: 5 });
  const { host, client, all, code } = M;
  check('host is seat 0, the client seat 1', all.map(seatOf), [0, 1]);
  all.forEach(d => check(`${d.name}: names from the lobby`, J(d, 'hsgNames'), ['Hana', 'Priya']));
  ok('the client waited on standby before the Battle started', client.screens.includes('screen-hsg-standby'));
  ok('the host never shows standby', !host.screens.includes('screen-hsg-standby'));
  all.forEach(d => check(`${d.name}: Battle 1 intro (the fan toss)`, [last(d), d.run('hsgPhase')], ['screen-hsg-battle-intro', 'battle-intro']));
  check('the client got the host\'s pub', J(client, 'hsgPub'), J(host, 'hsgPub'));
  check('…and the host\'s flavour line', client.run('hsgFlavourIdx'), host.run('hsgFlavourIdx'));
  check('…and paints the same Battle intro words', J(client, 'hsgBattleIntroText(hsgPub, hsgFlavourIdx)'), J(host, 'hsgBattleIntroText(hsgPub, hsgFlavourIdx)'));
  check('the client mirrors the Campaign counters', J(client, '[hsgBattleNo, hsgReplay, hsgFirstSeat, hsgSeals]'), J(host, '[hsgBattleNo, hsgReplay, hsgFirstSeat, hsgSeals]'));
  ok('the client holds no layout (hsgB null)', client.run('hsgB') === null);
  const bs = pubEvents(code).find(e => e.payload.action === 'HSG_BATTLE_START');
  ok('HSG_BATTLE_START: every closed door is "#" and nothing else', bs && Object.values(bs.payload.pub.board).every(s => s === '#'));
  await toCastle(M);

  // ═════════════════════════════════════════════════════════════════════════
  section('2. Privacy, client side: shuffle the host\'s closed doors, repair, compare');
  {
    const rnd = rngOf(3);
    for (let k = 0; k < 6; k++) {                       // a few doors open first, so the board is mixed
      const turn = host.run('hsgPub.turnSeat');
      const d = all.find(x => seatOf(x) === turn);
      await tapAct(d, chooseAct(d, rnd));
    }
    client.run('hsgRenderCastle()');
    const pubBefore = JSON.stringify(J(client, 'hsgPub')), domBefore = client.domText();
    const closed = host.run('hsgB.S.board.filter(c => c && !c[2]).length');
    host.run(`{ const B = hsgB.S.board, ix = []; B.forEach((c, i) => { if (c && !c[2]) ix.push(i); });
      const cells = ix.map(i => B[i]); cells.reverse(); cells.push(cells.shift());
      ix.forEach((i, n) => { B[i] = cells[n]; }); hsgPub = hsgBuildPub(); hsgSendState(1); }`);
    await flush();
    client.run('hsgRenderCastle()');
    ok(`${closed} closed doors shuffled on the host`, closed > 4);
    check('the client\'s pub is byte-identical after the repair', JSON.stringify(J(client, 'hsgPub')), pubBefore);
    ok('…and so is everything it has painted', client.domText() === domBefore);
    ok('the client never held the secret', client.run('hsgB') === null);
  }

  // ═════════════════════════════════════════════════════════════════════════
  section('3. Double-tap: one HSG_COMMAND on the wire');
  {
    // make it the client's turn
    let guard = 0;
    while (host.run('hsgPub.turnSeat') !== 1 && guard++ < 4) { await tapAct(host, chooseAct(host, rngOf(9))); }
    check('it is the client\'s Command', host.run('hsgPub.turnSeat'), 1);
    const n0 = pubEvents(code).filter(e => e.payload.action === 'HSG_COMMAND').length;
    const cmd0 = host.run('hsgPub.cmd');
    const act = J(client, 'hsgLegalFor(hsgPub, 1)')[0];
    // The fake server delivers synchronously, so a reply would land INSIDE the first
    // call. Hold delivery (writes land; subscribers hear on release) = a packet in flight.
    server.busy = true;
    client.run(`hsgSubmitCommand(${JSON.stringify(act)}); hsgSubmitCommand(${JSON.stringify(act)});`);
    ok('the client is locked while its Command is in flight', client.run('window.syllySyncLocked') === true);
    server.busy = false; server.notify();
    await flush();
    check('two submits → one HSG_COMMAND on the wire', pubEvents(code).filter(e => e.payload.action === 'HSG_COMMAND').length - n0, 1);
    check('…and one Command on the host', host.run('hsgPub.cmd'), cmd0 + 1);
    ok('HSG_COMMAND_DONE released the client\'s lock', client.run('window.syllySyncLocked') === false);
    // two quick taps on a door while the first is in flight: the second door never opens
    guard = 0;
    while (host.run('hsgPub.turnSeat') !== 1 && guard++ < 4) { await tapAct(host, chooseAct(host, rngOf(13))); }
    const doors = J(client, 'hsgPub.board.map((c, i) => c === "#" ? i : -1).filter(i => i >= 0)');
    if (host.run('hsgPub.turnSeat') === 1 && doors.length >= 2) {
      const n1 = pubEvents(code).filter(e => e.payload.action === 'HSG_COMMAND').length;
      server.busy = true;
      client.run(`hsgTap(${doors[0]}); hsgTap(${doors[0]});`);
      const armedAfter = client.run('hsgDoorArmed');
      client.run(`hsgTap(${doors[1]}); hsgTap(${doors[1]});`);
      ok('taps on a second door while the first is in flight do not even lift it', client.run('hsgDoorArmed') === armedAfter && armedAfter === -1);
      server.busy = false; server.notify();
      await flush();
      check('…and send nothing: one HSG_COMMAND on the wire', pubEvents(code).filter(e => e.payload.action === 'HSG_COMMAND').length - n1, 1);
      check('the door opened is the first one', host.run('hsgPub.last.j'), doors[0]);
      check('the second door is still shut', host.run(`hsgPub.board[${doors[1]}]`), '#');
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  section('4. Refusals repair the client privately (and release its lock)');
  {
    const forge = async (payload, uid) => {
      const before = privOf(code, 'u1').filter(e => e.payload.action === 'HSG_STATE').length;
      const cmd = host.run('hsgPub.cmd'), pub = JSON.stringify(J(host, 'hsgPub'));
      if (uid) host.run(`hsgHandleEnvelope(${JSON.stringify({ type: 'ACTION', originId: uid, payload })})`);
      else client.run(`mpLockSync(); mpSendEnvelope({ type: 'ACTION', payload: ${JSON.stringify(payload)} })`);
      await flush();
      return { states: privOf(code, 'u1').filter(e => e.payload.action === 'HSG_STATE').length - before,
               unchanged: host.run('hsgPub.cmd') === cmd && JSON.stringify(J(host, 'hsgPub')) === pub };
    };
    // make it the HOST's turn for the wrong-turn cases
    let guard = 0;
    while (host.run('hsgPub.turnSeat') !== 0 && guard++ < 4) { await tapAct(client, chooseAct(client, rngOf(17))); }
    const door = J(host, 'hsgPub.board.indexOf("#")');
    const cmd = host.run('hsgPub.cmd');
    let r = await forge({ action: 'HSG_COMMAND', cmd, act: ['U', door] });
    ok('not the client\'s turn → refused, nothing changes', r.unchanged);
    check('…one private HSG_STATE to the client', r.states, 1);
    ok('…which released its lock', client.run('window.syllySyncLocked') === false);
    check('…and left it on the host\'s board', J(client, 'hsgPub'), J(host, 'hsgPub'));
    r = await forge({ action: 'HSG_COMMAND', cmd, act: ['U', door], seat: 0 });
    ok('a payload naming the host\'s seat is still refused (the seat is the originId\'s)', r.unchanged && r.states === 1);
    // now the client's turn
    await tapAct(host, chooseAct(host, rngOf(19)));
    check('the client\'s Command', host.run('hsgPub.turnSeat'), 1);
    const c2 = host.run('hsgPub.cmd'), door2 = J(host, 'hsgPub.board.indexOf("#")');
    r = await forge({ action: 'HSG_COMMAND', cmd: c2 - 1, act: ['U', door2] });
    ok('a stale cmd tag → refused + repaired', r.unchanged && r.states === 1 && client.run('window.syllySyncLocked') === false);
    r = await forge({ action: 'HSG_COMMAND', act: ['U', door2] });
    ok('a missing cmd tag → refused as stale, never "skip the check"', r.unchanged && r.states === 1);
    r = await forge({ action: 'HSG_COMMAND', cmd: c2, act: ['M', 0, 29] });
    ok('an illegal action → refused + repaired', r.unchanged && r.states === 1);
    r = await forge({ action: 'HSG_COMMAND', cmd: c2, act: ['U', door2] }, 'uStranger');
    ok('a stranger (not seated) → dropped, no repair to anyone', r.unchanged && r.states === 0);
    r = await forge({ action: 'HSG_NEXT_BATTLE', battleNo: 1, replay: false });
    ok('Next Battle mid-Battle → refused + repaired', r.unchanged && r.states === 1 && client.run('window.syllySyncLocked') === false);
    check('the client is still on the Castle after every repair', [last(client), client.run('hsgPhase')], ['screen-hsg-castle', 'castle']);
  }

  // ═════════════════════════════════════════════════════════════════════════
  section('5. A whole Campaign (first to 3), both seats tapping; Next Battle from the client');
  {
    const rnd = rngOf(77), taps = {};
    let battles = 0, final = false, replays = 0, clientNext = 0, hostNext = 0, raced = false;
    while (!final && battles < 14) {
      battles++;
      if (!(await playBattle(M, rnd, taps))) break;
      final = await toChronicle(M);
      if (final) break;
      if (host.run('hsgPub.result.reason') === 'truce') replays++;
      const tag = J(host, '[hsgPub.battleNo, hsgPub.replay]');
      if (battles === 2 && !raced) {
        // both tap at once: the host first, the client with the old tag → one Battle
        raced = true;
        host.el('btn-hsg-chron-next').click();
        client.el('btn-hsg-chron-next').click();
        await flush();
        ok('both tapping Next Battle starts ONE Battle', host.run('hsgPub.cmd') === 0 && pubEvents(code).filter(e => e.payload.action === 'HSG_BATTLE_START').length === battles + 1);
        ok('…the client\'s late tap is repaired, not left locked', client.run('window.syllySyncLocked') === false);
        check('…and it is in that Battle', J(client, 'hsgPub'), J(host, 'hsgPub'));
        hostNext++;
      } else if (battles % 2 === 1) {
        client.el('btn-hsg-chron-next').click(); clientNext++;
        await flush();
      } else {
        host.el('btn-hsg-chron-next').click(); hostNext++;
        await flush();
      }
      const now = J(host, '[hsgPub.battleNo, hsgPub.replay]');
      ok(`Next Battle → ${now[1] ? 'a replay of' : 'Battle'} ${now[0]} on both (was ${tag[0]}${tag[1] ? ' replay' : ''})`,
        all.every(d => last(d) === 'screen-hsg-battle-intro') && eq(J(client, 'hsgPub'), J(host, 'hsgPub')));
      await toCastle(M);
    }
    ok(`the Campaign was won (${battles} Battles, ${replays} Truce replays)`, final);
    ok(`both seats made Commands (host ${taps.host || 0}, client ${taps.c1 || 0})`, (taps.host || 0) > 10 && (taps.c1 || 0) > 10);
    ok(`Next Battle came from the client ${clientNext}× and the host ${hostNext}×`, clientNext >= 1 && hostNext >= 1);
    check('the Seals agree', J(client, 'hsgPub.seals'), J(host, 'hsgPub.seals'));
    ok('a seat reached 3 Seals', J(host, 'hsgPub.seals').some(n => n >= 3));
    ok('the gameover is an MP end screen', host.run(`MP_END_SCREENS.has('screen-hsg-gameover')`));
    ok('the between-Battles Chronicle is not', !host.run(`MP_END_SCREENS.has('screen-hsg-chronicle')`));
    const bad = scanClientInbox(client);
    ok(`every HSG envelope the client received has the spec's shape, and '#' is only ever '#' (${client.inbox.filter(e => e.payload && /^HSG_/.test(e.payload.action)).length} envelopes)`, bad.length === 0, bad.slice(0, 4).join('; '));
    const priv = privOf(code, 'u1').map(e => e.payload.action);
    ok('the only private HSG packet is HSG_STATE', priv.filter(a => /^HSG_/.test(a)).every(a => a === 'HSG_STATE'));
    ok('nothing was ever sent privately to the host for HSG', privOf(code, 'uH').every(e => !/^HSG_/.test(e.payload.action)));
  }

  // New Campaign: host restarts in the lobby, the client goes to the join screen
  section('6. New Campaign on the gameover');
  host.el('btn-hsg-go-new').click();
  check('the host\'s confirm reads "Restart in the lobby"', host.el('btn-hsg-new-confirm').textContent, 'Restart in the lobby');
  client.el('btn-hsg-go-new').click();
  check('the client\'s reads "Leave Session"', client.el('btn-hsg-new-confirm').textContent, 'Leave Session');
  host.el('btn-hsg-new-confirm').click();
  await flush(); await flush();
  check('the host is back in the room\'s lobby', last(host), 'screen-mp-lobby-host');
  check('the client waits on the join screen', last(client), 'screen-mp-lobby-join');
  ERR.push(...errorsOf(all));

  // ═════════════════════════════════════════════════════════════════════════
  section('7. Single Battle (Campaign 1) straight to the gameover; A Pair of foxes');
  {
    const S1 = await hsgMatch(['Alexandrina Ko', 'Priyanka Raju'], { len: 1, foxes: 2, seed: 4, layout: 23 });
    check('the room\'s rules reached the client', J(S1.client, '[hsgPub.campaignLen, hsgPub.foxTotal]'), [1, 2]);
    await toCastle(S1);
    const rnd = rngOf(41), taps = {};
    let final = false, n = 0;
    while (!final && n++ < 6) {
      await playBattle(S1, rnd, taps);
      final = await toChronicle(S1);
      if (!final) { S1.client.el('btn-hsg-chron-next').click(); await flush(); await toCastle(S1); }
    }
    ok(`one Seal wins the Campaign (${n} Battle${n === 1 ? '' : 's'} — a Truce replays)`, final);
    ERR.push(...errorsOf(S1.all));

    // ── HSG_STATE from each phase (the applier S9's rejoin will reuse) ──────
    section('8. HSG_STATE lands on the right screen');
    const { host: h, client: c } = S1;
    c.run('hsgTeardown(); hsgGo("screen-hsg-standby");');
    h.run('hsgSendState(1)'); await flush();
    check('gameover state → the gameover, painted', [last(c), c.run('hsgPhase'), c.el('hsg-go-body').innerHTML.length > 0], ['screen-hsg-gameover', 'gameover', true]);
    h.run(`hsgPhase = 'chronicle'; hsgPub = hsgWirePub(Object.assign({}, hsgPub, { result: Object.assign({}, hsgPub.result, { campaignOver: false }) })); hsgResult.campaignOver = false;`);
    c.run('hsgTeardown(); hsgGo("screen-hsg-standby");');
    h.run('hsgSendState(1)'); await flush();
    check('chronicle state → the Chronicle', [last(c), c.run('hsgPhase')], ['screen-hsg-chronicle', 'chronicle']);
    h.run(`hsgPhase = 'ending'; hsgResult.campaignOver = true;`);
    check('the ending beat of a Campaign-winning Battle reads "gameover" (the S6 draft said "chronicle")', h.run('hsgPhaseForWire()'), 'gameover');
    // a fresh Battle mid-intro → the Castle, skipping the intro
    h.run(`hsgPhase = 'chronicle'; hsgReplay = false; hsgResult = { reason: 'shogun', winnerSeat: 0, by: 'Sm', gekokujo: false, counts: [0, 0], campaignOver: false }; hsgHostNextBattle(0, { battleNo: hsgBattleNo, replay: false });`);
    await flush();
    check('the client follows Next Battle into the new Battle intro', last(c), 'screen-hsg-battle-intro');
    c.run('hsgTeardown(); hsgGo("screen-hsg-standby");');
    h.run('hsgSendState(1)'); await flush();
    check('mid-Battle-intro state → straight to the Castle', [last(c), c.run('hsgPhase')], ['screen-hsg-castle', 'castle']);
    check('…with the host\'s board', J(c, 'hsgPub'), J(h, 'hsgPub'));
    // a repair that arrives AFTER the client already had a newer snapshot is ignored
    h.run('hsgPhase = "castle"');
    const turnD = [h, c].find(d => seatOf(d) === h.run('hsgPub.turnSeat'));
    const oldPub = JSON.stringify(J(h, 'hsgPub'));
    await tapAct(turnD, J(turnD, 'hsgLegalFor(hsgPub, mpMyPlayerIdx)')[0]);
    c.run(`hsgHandleEnvelope({ type: 'SYNC', payload: { action: 'HSG_STATE', phase: 'castle', pub: ${oldPub} } })`);
    check('an older snapshot of the same Battle never rolls the client back', J(c, 'hsgPub.cmd'), J(h, 'hsgPub.cmd'));
    c.run(`hsgHandleEnvelope({ type: 'SYNC', payload: { action: 'HSG_BATTLE_START', flavourIdx: 1, pub: ${oldPub} } })`);
    check('a late HSG_BATTLE_START for a Battle already on screen is ignored', [last(c), J(c, 'hsgPub.cmd')], ['screen-hsg-castle', J(h, 'hsgPub.cmd')]);
    ok('the client never held the secret', c.run('hsgB') === null);
    ERR.push(...errorsOf(S1.all));
  }

  // ═════════════════════════════════════════════════════════════════════════
  section('9. The Mid-Game Quit Contract');
  {
    const Q = await hsgMatch(['Hana', 'Priya'], { seed: 5 });
    await toCastle(Q);
    Q.client.el('btn-hsg-quit-confirm').click();
    await flush();
    ok('a client quitting ends the session for the host', Q.host.S.__resets > 0);
    ok('…the host broadcast HOST_END_GAME', pubEvents(Q.code).some(e => e.payload.action === 'HOST_END_GAME') || Q.client.inbox.some(e => e.payload && e.payload.action === 'HOST_END_GAME'));
    ok('…and the room is gone', server.read(`rooms/${Q.code}`) === undefined);
    check('…and the host\'s Battle is torn down', [Q.host.run('hsgPhase'), Q.host.run('hsgB')], ['idle', null]);
    ERR.push(...errorsOf(Q.all).filter(e => !/HOST_END_GAME|host-disconnected/.test(e)));

    const R = await hsgMatch(['Hana', 'Priya'], { seed: 6 });
    await toCastle(R);
    R.host.el('btn-hsg-quit-confirm').click();
    await flush();
    ok('the host quitting tells the client (HOST_END_GAME reached it)', R.client.inbox.some(e => e.payload && e.payload.action === 'HOST_END_GAME'));
    ok('…and the room is gone', server.read(`rooms/${R.code}`) === undefined);
    ERR.push(...errorsOf(R.all).filter(e => !/HOST_END_GAME|host-disconnected/.test(e)));
  }

  section('10. Zero warnings');
  ok('no device logged a warning or error', ERR.length === 0, ERR.slice(0, 6).join('\n          '));
  W.report();
})().catch(e => { console.error(e); process.exit(1); });
