// ═══════════════════════════════════════════════════════════════════════════
// verify-li5-loopback.js — Like I'm Five in Lobby Mode (MDLM + TLM), driven
// through the REAL js/engine-multiplayer.js + js/engine-intro.js + js/games/li5.js
// on N devices, over the shared fake Firebase world (tools/lib/mp-world.js):
// a WIRE that erases empty values, a private queue per uid, a mock DOM of real
// elements, a console whose warn lands in the error list, a fake clock.
//
//   node tools/verify-li5-loopback.js        (exits 1 on any failure)
//   LI5_SRC=path node tools/…                (drive a deliberately-broken li5.js)
//   node tools/mutate-li5-loopback.js        (the four broken copies, every one red)
//
// Spec: docs/superpowers/specs/2026-11-09-li5-pilot-design.md § 5 (§ 5.10 is this
// file's table of contents). The deck is synthetic and every token unique — Wd07 is
// a word, Nn07c one of its No-No words — so a privacy scan is a substring search.
// ═══════════════════════════════════════════════════════════════════════════
'use strict';
const fs = require('fs'), path = require('path');
const W = require('./lib/mp-world');
const { ROOT, fbWrite, fbRead, flush, server, makePhone, devices, boot, advance, clock,
        check, ok, section, errorsOf } = W;

const LI5    = process.env.LI5_SRC ? path.resolve(process.env.LI5_SRC) : path.join(ROOT, 'js/games/li5.js');
const li5Src = fs.readFileSync(LI5, 'utf8');

// ── The deck: 70 regular words + 20 Extra Credit, every token unique ─────────
const CATS = ['animals', 'food', 'places', 'objects'];
const DECK = Array.from({ length: 90 }, (_, i) => {
  const k = String(i).padStart(2, '0');
  return { id: 'x-' + k, word: 'Wd' + k, nono_list: 'abcdefghij'.split('').map(c => 'Nn' + k + c),
           category: CATS[i % 4], difficulty: i < 70 ? 1 + (i % 2) : 3 };
});
const DECK_JSON = JSON.stringify(DECK);
const TOKEN_RE  = /(?:Wd|Nn)\d\d[a-j]?/g;

const ALL_ERRORS = [];
const BTN = { correct: 'btn-correct', taboo: 'btn-taboo', skip: 'btn-skip' };
const TIMER = 30;          // the shortest Tick Tock Clock — fewer fake seconds to burn

// ── One device = the real engine (mp-world) + li5.js ────────────────────────
function addLi5(d, seed) {
  d.S.isSecretMode = false;
  d.S.secretWords  = [];
  d.S.fetch = () => Promise.resolve({ json: () => Promise.resolve(JSON.parse(DECK_JSON)) });
  d.S.navigator.vibrate = () => {};
  ['playResume', 'playSyllyOn', 'playSyllyOff', 'playSliderTick'].forEach(n => { d.S[n] = () => {}; });
  d.run(`
    let __seed = ${seed >>> 0 || 1};
    Math.random = () => { __seed ^= __seed << 13; __seed >>>= 0; __seed ^= __seed >>> 17; __seed ^= __seed << 5; __seed >>>= 0; return __seed / 4294967296; };
    function shuffle(a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
    function formatTime(secs) { const m = Math.floor(secs / 60), s = secs % 60; return m + ':' + String(s).padStart(2, '0'); }
    let __whoFirst = null;
    function showWhoFirst(cfg) { __whoFirst = cfg; showScreen('screen-who-first'); }
  `);
  // Every element li5.js touches is recorded, so a device's whole DOM text can be scanned.
  const els = new Map();
  const orig = d.S.document.getElementById;
  d.S.document.getElementById = function (id) { const e = orig.call(this, id); els.set(id, e); return e; };
  d.els = els;
  d.domText = () => [...els.values()].map(e => [e.textContent, e.innerHTML, e.value].join(' ')).join('\n');
  d.run(li5Src);
  d.run('mpWireIntro();');                 // engine-intro.js wires on DOMContentLoaded, which a vm never fires
  // engine.js resetToLobby()/resetToMenu() call stopTimer() + li5Teardown() — mirrored here.
  d.run(`{ const __r = resetToLobby; resetToLobby = () => { stopTimer(); li5Teardown(); __r(); }; }
         function resetToMenu() { stopTimer(); li5Teardown(); showScreen('screen-menu'); }`);
}

function useLi5(d, style) {
  d.run(`mpActiveGame = 'li5'; mpActiveGameConfig = MP_GAME_CONFIGS.li5; activeGameId = 'li5';` +
        (style ? ` window.mpLobbyStyle = '${style}';` : ''));
}

// Create, join, Intro (Line-up), Start — the real lobby + Intro path end to end.
async function li5Match(names, teams, opts) {
  opts = opts || {};
  server.tree = {}; server.subs = []; devices.length = 0;
  const host = boot('host', 'uH', makePhone());
  addLi5(host, opts.seed || 11);
  host.S.localStorage.setItem('sylly_nickname', names[0]);
  useLi5(host, opts.style || 'individual');
  host.run(`settingTimer = ${TIMER}; settingTimePenalty = timePenaltyForTimer(${TIMER}); settingRounds = ${opts.rounds || 2};`);
  if (opts.settings) host.run(opts.settings);
  host.run('mpHostCreateRoom()');
  await flush();
  const code = host.run('mpActiveRoomCode');
  const clients = [];
  for (let i = 1; i < names.length; i++) {
    const c = boot('c' + i, 'u' + i, makePhone());
    addLi5(c, 100 + i);
    useLi5(c);
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
  if (opts.style !== 'team') { all.forEach((d, i) => d.run(`mpIntroPick(${teams[i]})`)); await flush(); }
  all.forEach(d => d.run('mpIntroReady()')); await flush();
  host.run('mpIntroStart(false)');
  for (let i = 0; i < 4; i++) await flush();              // loadWords() is async on the host
  // A fast phone, from here on. (Booted fast, it would drop every host event stamped
  // before its own join time — the engine's join filter — and never reach the game.)
  Object.entries(opts.skew || {}).forEach(([i, ms]) => { all[i].S.Date = { now: () => clock.now + ms }; });
  return { host, clients, all, code };
}

// ── Reading a device ─────────────────────────────────────────────────────────
const J       = (d, expr) => d.run(`JSON.parse(JSON.stringify(${expr}))`);
const H       = M => J(M.host, 'li5H');
const V       = d => J(d, 'li5V');
const seatOf  = d => d.run('mpMyPlayerIdx');
const devAt   = (M, seat) => M.all.find(d => seatOf(d) === seat);
const roleOf  = d => d.run('li5MyRole()');
const upDev   = M => devAt(M, M.host.run('li5H.upSeat'));
const byRole  = (M, r) => M.all.filter(d => roleOf(d) === r);
const onScreen = d => d.screens[d.screens.length - 1];
const tap     = (d, id) => d.el(id).click();
const shown   = (d, id) => d.el(id).style.display === 'flex';
const visible = (d, id) => d.el(id).style.display !== 'none';
const events  = code => Object.values(server.read(`rooms/${code}/events`) || {});
const priv    = code => Object.entries(server.read(`rooms/${code}/private`) || {}).map(([uid, q]) => [uid, Object.values(q)]);
const sent    = (code, action) => events(code).filter(e => e.payload && e.payload.action === action);
const noteErr = list => { ALL_ERRORS.push(...errorsOf(list)); };

async function ready(M) { tap(upDev(M), 'btn-start-turn'); await flush(); }
async function mark(M, m) { tap(upDev(M), BTN[m]); await flush(); advance(310); await flush(); }
async function timeUp(M) { advance(TIMER * 1000); await flush(); advance(1100); await flush(); }
async function next(M) { tap(upDev(M), 'btn-review-next'); await flush(); }
// Send an ACTION from a device over the real wire (bypassing its own UI guards). The
// host's own taps never go over the wire (the dedup guard would drop them — a check
// that sends one proves nothing), so a host act is applied the way the host applies it.
async function act(d, payload) {
  if (d.run("window.syllyMultiplayerMode") === 'host') d.run(`li5HostAction(mpMyPlayerIdx, ${JSON.stringify(payload)})`);
  else d.run(`mpSendEnvelope(${JSON.stringify({ type: 'ACTION', payload })})`);
  await flush();
}

// ── The PTP reference game ───────────────────────────────────────────────────
function ptpDevice(seed, settings) {
  server.tree = {}; server.subs = []; devices.length = 0;
  const d = boot('ptp', 'uP', makePhone());
  addLi5(d, seed);
  useLi5(d);
  d.run(`window.syllyMultiplayerMode = 'single'; settingTimer = ${TIMER}; settingTimePenalty = timePenaltyForTimer(${TIMER}); settingRounds = 2;`);
  if (settings) d.run(settings);
  return d;
}
async function ptpMatch(d, firstTeam, scripts) {
  d.run('mpEnterGame(mpActiveGameConfig)');
  tap(d, 'btn-game-intro-go');
  for (let i = 0; i < 4; i++) await flush();
  d.run(`__whoFirst.onResult(${firstTeam})`);
  let k = 0;
  while (onScreen(d) === 'screen-gatekeeper' && k < 20) {
    tap(d, 'btn-start-turn');
    for (const m of scripts[k % scripts.length]) { tap(d, BTN[m]); advance(310); }
    advance(TIMER * 1000);
    tap(d, 'btn-review-next');
    k++;
  }
  return k;
}
const SCRIPTS = [
  ['correct', 'correct', 'taboo', 'skip', 'correct'],
  ['taboo', 'correct', 'skip', 'skip'],
  ['correct', 'taboo', 'taboo', 'correct', 'correct', 'correct'],
  ['skip', 'correct'],
];

// ── The privacy scan (§ 4) ───────────────────────────────────────────────────
// Public: never a No-No word; a word only as a resolved Yay (LI5_CARD.last.word) or
// after the turn (REVIEW / GAMEOVER); no card-shaped keys. Private to a seat that is
// GUESSING that turn: nothing of any card, and never LI5_WORD / LI5_DOBS.
function privacyProblems(M) {
  const out = [];
  const pub = events(M.code).filter(e => e.payload && /^LI5_/.test(e.payload.action || ''));
  const turns = {};
  pub.filter(e => e.payload.action === 'LI5_TURN').forEach(e => { turns[e.payload.turnId] = e.payload; });
  const match = (pub.find(e => e.payload.action === 'LI5_MATCH') || {}).payload || {};
  const groups = fbRead(match.playerTeamIdx) || [];
  for (const e of pub) {
    const p = fbRead(e.payload), a = p.action;
    if (a === 'LI5_REVIEW' || a === 'LI5_GAMEOVER') continue;
    let s = JSON.stringify(p);
    if (a === 'LI5_CARD' && p.last && p.last.action === 'correct' && p.last.word) s = s.split('"' + p.last.word + '"').join('""');
    const toks = s.match(TOKEN_RE);
    if (toks) out.push(`public ${a} carries ${toks.join(',')}`);
    ['nonoList', 'next', 'category', 'isSylly'].forEach(k => { if (k in p) out.push(`public ${a} has a "${k}" key`); });
    if (a === 'LI5_CARD' && p.last && p.last.action !== 'correct' && 'word' in p.last) out.push('public LI5_CARD names a word that was not a Yay');
  }
  const seatByUid = Object.fromEntries(M.host.run('mpPlayerSlots.map(s => s.uid)').map((u, i) => [u, i]));
  for (const [uid, q] of priv(M.code)) {
    const seat = seatByUid[uid];
    for (const e of q) {
      const p = fbRead(e.payload || {});
      if (!/^LI5_/.test(p.action || '')) continue;
      const t = turns[p.turnId];
      if (!t) continue;
      const guessing = seat !== t.upSeat && groups[seat] === t.team;
      if (!guessing) continue;
      if (p.action === 'LI5_WORD' || p.action === 'LI5_DOBS') out.push(`a guesser (seat ${seat}) was sent ${p.action}`);
      const toks = JSON.stringify(p).match(TOKEN_RE);
      if (toks) out.push(`a guesser (seat ${seat}) was sent ${toks.join(',')} in ${p.action}`);
    }
  }
  return out;
}
// No guesser's DOM — the host's included — holds the current or next card.
const domLeaks = [];
function guardDom(M, where) {
  const h = H(M);
  if (!h || (!h.card && !h.next)) return;
  const toks = [h.card, h.next].filter(Boolean).flatMap(c => [c.word, ...c.nonoList]);
  for (const d of byRole(M, 'guess')) {
    const txt = d.domText();
    const hit = toks.filter(t => txt.includes(t));
    if (hit.length) domLeaks.push(`${where}: ${d.name} (guessing) shows ${hit.join(',')}`);
  }
}

(async () => {
  console.log("Like I'm Five — Lobby Mode loopback (real engine + Intro + li5.js on N devices)");
  console.log('='.repeat(72));
  try {
    // ════════════════════════════════════════════════════════════════════════
    section('0. PTP regression — a whole single-device match');
    {
      const d = ptpDevice(7, "settingPenaltyMode = 'points'; settingSkipFree = false;");
      const turns = await ptpMatch(d, 0, SCRIPTS);
      check('four turns: two rounds, two groups', turns, 4);
      check('the match ends on screen-gameover', onScreen(d), 'screen-gameover');
      check('every turn is in the match log', J(d, 'matchLog.map(t => [t.round, t.team])'), [[1, 0], [1, 1], [2, 0], [2, 1]]);
      const want = [0, 0];
      J(d, 'matchLog').forEach(t => { want[t.team] += t.entries.reduce((s, e) => s + e.points, 0); });
      check('the scores are the sum of the Report Cards', J(d, 'teamScores'), want);
      ok('the Intro\'s one-tap form came first', d.screens.indexOf('screen-game-intro') >= 0 && d.screens.indexOf('screen-game-intro') < d.screens.indexOf('screen-gatekeeper'));
      ok('PTP still asks who goes first', d.screens.includes('screen-who-first'));
      noteErr([d]);
    }
    {
      const d = ptpDevice(8);
      const turns = await ptpMatch(d, 1, SCRIPTS);
      check('the second group going first still gets both groups every round (was: round 1 ended after one turn)',
            [turns, J(d, 'matchLog.map(t => [t.round, t.team])')], [4, [[1, 1], [1, 0], [2, 1], [2, 0]]]);
      noteErr([d]);
    }

    // ════════════════════════════════════════════════════════════════════════
    section('1. The wire erases what Firebase erases');
    {
      check('null / [] / {} are erased', fbRead(fbWrite({ a: null, b: [], c: {}, keep: 0 })), { keep: 0 });
      check('turnId 0, false and an all-zero array survive', fbRead(fbWrite({ turnId: 0, paused: false, counts: [0, 0, 0] })), { turnId: 0, paused: false, counts: [0, 0, 0] });
      check('a half-dense array comes back as an object', fbRead(fbWrite({ v: [null, null, null, 3] })), { v: { 3: 3 } });
      const d = ptpDevice(1);
      check('li5WireArr rebuilds an erased array', d.run('li5WireArr(undefined, 3, 0)'), [0, 0, 0]);
      check('  …and an object back into an array', d.run('li5WireArr({ 1: 2 }, 3, 0)'), [0, 2, 0]);
      check('li5WireList: erased → []', d.run('li5WireList(undefined)'), []);
      check('  …an object keyed by index → its values in order', d.run("li5WireList({ 2: 'c', 0: 'a' })"), ['a', 'c']);
    }

    // ════════════════════════════════════════════════════════════════════════
    section('2. Config — modes, bounds, intro, reconnect');
    {
      const d = ptpDevice(1);
      const cfg = k => d.run(`(() => { const c = MP_GAME_CONFIGS.li5; return JSON.parse(JSON.stringify(${k})); })()`);
      check('modes: Pass-the-Phone, Team Lobby, every player their own phone', cfg('c.supportedModes'), ['ptp', 'tlm', 'mdlm']);
      check('bounds MDLM 4–12, TLM 2', d.run(`(() => { const c = MP_GAME_CONFIGS.li5, r = [];
        window.mpLobbyStyle = 'individual'; r.push(c.getMinPlayers(), c.getMaxPlayers());
        window.mpLobbyStyle = 'team'; r.push(c.getMinPlayers(), c.getMaxPlayers()); window.mpLobbyStyle = 'individual'; return r; })()`), [4, 12, 2, 2]);
      check('the Intro: template + a two-group Line-up, min 2, unbalanced allowed', cfg('{ t: c.intro.template, l: c.intro.lineup }'),
            { t: 'intro-li5', l: { type: 'teams', teamNames: ['Crayon Crew', 'Glue Stick Gang'], minPerTeam: 2, balanced: false } });
      check('the brief is picked per mode', d.run(`(() => { const b = MP_GAME_CONFIGS.li5.intro.brief, r = [];
        window.syllyMultiplayerMode = 'single'; r.push(b());
        window.syllyMultiplayerMode = 'host'; window.mpLobbyStyle = 'team'; r.push(b());
        window.mpLobbyStyle = 'individual'; r.push(b()); window.syllyMultiplayerMode = 'single'; return r; })()`), ['ptp', 'tlm', 'default']);
      ok('reconnect is whole', d.run("['sendState', 'pause', 'resume'].every(k => typeof MP_GAME_CONFIGS.li5.reconnect[k] === 'function')"));
      ok('no bots (a spoken game)', d.run('MP_GAME_CONFIGS.li5.bots === undefined'));
    }

    // ════════════════════════════════════════════════════════════════════════
    section('3. Match start on 4 (2v2), 6 (3v3) and 5 (3v2)');
    for (const [names, teams] of [[['Ali', 'Bec', 'Cam', 'Dee'], [0, 1, 0, 1]],
                                  [['Ali', 'Bec', 'Cam', 'Dee', 'Eve', 'Fin'], [0, 1, 0, 1, 0, 1]],
                                  [['Ali', 'Bec', 'Cam', 'Dee', 'Eve'], [0, 0, 1, 0, 1]]]) {
      const M = await li5Match(names, teams);
      const n = names.length, h = H(M);
      const tag = `${n} players:`;
      check(`${tag} every device has the same groups`, M.all.map(d => V(d).groups), Array(n).fill(h.groups));
      check(`${tag} the groups are the Line-up's`, [h.groups.filter(g => g === 0).length, h.groups.filter(g => g === 1).length],
            [teams.filter(t => t === 0).length, teams.filter(t => t === 1).length]);
      check(`${tag} every device shows the wipe-and-write gate`, M.all.map(onScreen), Array(n).fill('screen-gatekeeper'));
      const roles = M.all.map(roleOf);
      const g = h.groups[h.upSeat];
      check(`${tag} one up the front, the rest of that group guessing, the other group tattling`,
            [roles.filter(r => r === 'up').length, roles.filter(r => r === 'guess').length, roles.filter(r => r === 'tattle').length],
            [1, h.groups.filter(x => x === g).length - 1, h.groups.filter(x => x !== g).length]);
      check(`${tag} Miss picked the first group — and it is the one up`, [h.firstTeam === 0 || h.firstTeam === 1, h.team], [true, h.firstTeam]);
      ok(`${tag} nobody saw a who-goes-first screen`, M.all.every(d => !d.screens.includes('screen-who-first')));
      check(`${tag} only the person up the front has Ready, Miss!`, M.all.map(d => visible(d, 'btn-start-turn')), roles.map(r => r === 'up'));
      const up = upDev(M), other = M.all.find(d => roleOf(d) !== 'up');
      check(`${tag} everyone else is told who they're waiting on`, other.el('li5-gate-wait').textContent, `Waiting for ${up.run('li5SeatName(li5V.turn.upSeat)')}…`);
      check(`${tag} names came from the lobby`, J(M.host, 'mpPlayerSlots.map(s => s.nickname)').slice().sort(), names.slice().sort());
      noteErr(M.all);
    }

    // ════════════════════════════════════════════════════════════════════════
    section('4. Privacy — a guesser never gets the word, on the wire or on screen');
    {
      const M = await li5Match(['Ali', 'Bec', 'Cam', 'Dee', 'Eve', 'Fin'], [0, 1, 0, 1, 0, 1], { seed: 21 });
      let k = 0, hostGuessed = false;
      while (M.host.run("li5V.phase") === 'gate' && k < 8) {
        if (roleOf(M.host) === 'guess') hostGuessed = true;
        await ready(M); guardDom(M, `turn ${k} start`);
        for (const m of SCRIPTS[k % 4]) { await mark(M, m); guardDom(M, `turn ${k} after ${m}`); }
        await timeUp(M);
        await next(M);
        k++;
      }
      check('a whole match: two rounds, two groups', k, 4);
      ok('the host itself was a guesser at least once (the structural exception, screen side)', hostGuessed);
      const probs = privacyProblems(M);
      ok('no public envelope, and nothing sent to a guessing seat, names the current card', probs.length === 0, probs.slice(0, 6).join('\n          '));
      ok('no guesser\'s screen ever showed the current or next card', domLeaks.length === 0, domLeaks.slice(0, 6).join('\n          '));
      ok('the guess screen has no word slot at all', !fs.readFileSync(path.join(ROOT, 'src/screens/li5.html'), 'utf8')
        .match(/<section id="screen-li5-guess"[\s\S]*?<\/section>/)[0].match(/word"|li5-guess-word/));
      noteErr(M.all);
    }

    // ════════════════════════════════════════════════════════════════════════
    section('5. The Ready gate — only up the front opens it; only the host stamps the clock');
    {
      const M = await li5Match(['Ali', 'Bec', 'Cam', 'Dee'], [0, 1, 0, 1]);
      const notUp = M.clients.find(d => roleOf(d) !== 'up');
      await act(notUp, { action: 'LI5_READY', turnId: V(notUp).turnId });
      check('a READY from anyone but up the front is dropped', H(M).phase, 'gate');
      tap(notUp, 'btn-start-turn'); await flush();
      check('  …and their (hidden) button sends nothing', sent(M.code, 'LI5_READY').length, 1);
      const t0 = clock.now;
      await ready(M);
      const h = H(M);
      check('Ready, Miss! opens the turn', h.phase, 'play');
      check('the host stamped endTimestamp = now + the timer', h.endTimestamp, t0 + TIMER * 1000);
      check('every device counts down to the same instant', M.all.map(d => V(d).clock.endTimestamp), Array(4).fill(h.endTimestamp));
      ok('the clock packet came from the host', sent(M.code, 'LI5_CLOCK').every(e => e.originId === 'uH'));
      check('each seat went to its role screen', M.all.map(d => [roleOf(d), onScreen(d)]).map(([r, s]) => s),
            M.all.map(d => ({ up: 'screen-active-play', guess: 'screen-li5-guess', tattle: 'screen-li5-tattle' })[roleOf(d)]));
      check('the describer sees its card', upDev(M).el('active-word').textContent, h.card.word);
      check('a tattletale sees the same card', byRole(M, 'tattle')[0].el('li5-tattle-word').textContent, h.card.word);
      noteErr(M.all);
    }
    {
      // A CLIENT describer advances optimistically on its own tap (LI5_WORD.next); after
      // every mark its screen must still be the host's current card, never one ahead.
      const M = await li5Match(['Ali', 'Bec', 'Cam', 'Dee'], [0, 1, 0, 1]);
      for (let k = 0; k < 4 && upDev(M) === M.host; k++) {
        await ready(M); tap(M.host, 'btn-pause'); await flush(); tap(M.host, 'btn-li5-end-my-turn'); await flush(); await next(M);
      }
      ok('a client is up the front', upDev(M) !== M.host);
      await ready(M);
      const seen = [];
      for (const m of ['correct', 'skip', 'correct']) {
        await mark(M, m);
        const hc = H(M).card.word;
        const u = upDev(M);
        seen.push([u.el('active-word').textContent === hc, V(u).card && V(u).card.word === hc,
                   byRole(M, 'tattle')[0].el('li5-tattle-word').textContent === hc]);
      }
      // The view STATE too: the screen alone can look right (renderedCard dedupes by cardNo)
      // while li5V.card holds the next card under this number — and a dob note reads it.
      check('after each mark the describer (screen AND state) and the tattletales match the host\'s card', seen, Array(3).fill([true, true, true]));
      noteErr(M.all);
    }

    // ════════════════════════════════════════════════════════════════════════
    section('6. Marks — single-source scoring, Extra Credit, time penalties, idempotence');
    {
      const S = "settingPenaltyMode = 'points'; settingSkipFree = false;";
      const M = await li5Match(['Ali', 'Bec', 'Cam', 'Dee'], [0, 1, 0, 1], { seed: 31, settings: S });
      const first = H(M).firstTeam;
      let k = 0;
      while (M.host.run('li5V.phase') === 'gate' && k < 8) {
        await ready(M);
        for (const m of SCRIPTS[k % 4]) await mark(M, m);
        await timeUp(M); await next(M); k++;
      }
      const mp = H(M);
      const d = ptpDevice(31, S);
      await ptpMatch(d, first, SCRIPTS);
      const shape = log => log.map(t => [t.team, t.entries.map(e => [e.action, e.points])]);
      check('MDLM and PTP, fed the same marks, write the same Report Cards', shape(mp.matchLog), shape(J(d, 'matchLog')));
      check('  …and end on the same scores', mp.scores, J(d, 'teamScores'));
      check('every device agrees on the final scores', M.all.map(x => V(x) && x.run('teamScores.slice()')), Array(4).fill(mp.scores));
      noteErr([...M.all, d]);
    }
    {
      const M = await li5Match(['Ali', 'Bec', 'Cam', 'Dee'], [0, 1, 0, 1], { settings: 'settingSylly = true; settingSyllyPct = 100;' });
      await ready(M);
      check('Extra Credit on: the card is flagged', H(M).card.isSylly, true);
      const before = H(M).scores[H(M).team];
      await mark(M, 'correct');
      check('a Yay on Extra Credit is worth 2', H(M).scores[H(M).team] - before, 2);
      check('  …and the guessers\' feed shows the +2', byRole(M, 'guess')[0] ? V(byRole(M, 'guess')[0]).feed.slice(-1)[0].points : 2, 2);
      noteErr(M.all);
    }
    {
      const M = await li5Match(['Ali', 'Bec', 'Cam', 'Dee'], [0, 1, 0, 1], { settings: "settingPenaltyMode = 'time';" });
      await ready(M);
      const end0 = H(M).endTimestamp;
      await mark(M, 'taboo');
      const h = H(M);
      check('a Nay in Oopsie-seconds mode moves the deadline back by the penalty', end0 - h.endTimestamp, 5000);
      check('  …on every device', M.all.map(x => V(x).clock.endTimestamp), Array(4).fill(h.endTimestamp));
      check('  …and costs no points', h.log[0].points, 0);
      const up = upDev(M), notUp = M.all.find(x => roleOf(x) === 'guess') || M.all.find(x => roleOf(x) === 'tattle');
      const n0 = h.log.length;
      await act(up, { action: 'LI5_MARK', turnId: h.turnId, cardNo: h.cardNo - 1, mark: 'correct' });
      check('a mark for a card already marked is dropped', H(M).log.length, n0);
      await act(up, { action: 'LI5_MARK', turnId: h.turnId, cardNo: h.cardNo, mark: 'correct' });
      await act(up, { action: 'LI5_MARK', turnId: h.turnId, cardNo: h.cardNo, mark: 'correct' });
      check('the same mark delivered twice applies once', H(M).log.length, n0 + 1);
      const h2 = H(M);
      await act(notUp, { action: 'LI5_MARK', turnId: h2.turnId, cardNo: h2.cardNo, mark: 'correct' });
      check('a mark from anyone but up the front is dropped', H(M).log.length, n0 + 1);
      await act(upDev(M), { action: 'LI5_MARK', turnId: h2.turnId - 1, cardNo: h2.cardNo, mark: 'correct' });
      check('a mark from an old turn is dropped', H(M).log.length, n0 + 1);
      noteErr(M.all);
    }

    // ════════════════════════════════════════════════════════════════════════
    section('7. Dobs — host-enforced cooldown, distinct dobbers, notes');
    {
      const M = await li5Match(['Ali', 'Bec', 'Cam', 'Dee'], [0, 1, 0, 1]);
      await ready(M);
      const up = upDev(M), [t1, t2] = byRole(M, 'tattle');
      const nono = H(M).card.nonoList;
      t1.run('li5Dob(0)'); await flush();
      check('a dob reaches the describer as one note', [V(up).dobs.counts[0], up.el('li5-note').style.display], [1, '']);
      check('  …in the passed-note voice', up.el('li5-note-text').textContent, `Psst — you said "${nono[0]}"`);
      check('  …and the tattletales see the count', V(t2).dobs.counts[0], 1);
      t2.run('li5Dob(0)'); await flush();
      check('two tattletales on one word: a crowd', up.el('li5-note-text').textContent, `2 tattletales say you said "${nono[0]}"`);
      await act(t1, { action: 'LI5_DOB', turnId: H(M).turnId, cardNo: H(M).cardNo, slot: 1 });
      check('a second dob inside 5 s is refused by the HOST (the local dimming bypassed)', H(M).dobs[1], []);
      advance(5000); await flush();
      await act(t1, { action: 'LI5_DOB', turnId: H(M).turnId, cardNo: H(M).cardNo, slot: 0 });
      check('after the cooldown, the same dobber on the same word still counts once', V(up).dobs.counts[0], 2);
      const g = M.all.find(d => roleOf(d) !== 'tattle' && d !== up) || up;
      advance(5000); await flush();
      await act(g, { action: 'LI5_DOB', turnId: H(M).turnId, cardNo: H(M).cardNo, slot: 2 });
      check('a dob from the describing group is dropped', H(M).dobs[2], []);
      await act(t2, { action: 'LI5_DOB', turnId: H(M).turnId, cardNo: H(M).cardNo - 1, slot: 2 });
      check('a dob for a stale card is dropped', H(M).dobs[2], []);
      await act(t2, { action: 'LI5_DOB', turnId: H(M).turnId, cardNo: H(M).cardNo, slot: nono.length });
      check('"They said the word itself" is the last slot', V(up).dobs.counts[nono.length], 1);
      tap(up, 'btn-li5-didnt'); await flush();
      check('I didn\'t clears the slot the note named (the crowded one) — and only it',
            H(M).dobs.map(a => a.length), [...Array(nono.length).fill(0), 1]);
      check('  …and the note moves on to the next one', up.el('li5-note-text').textContent, `Psst — you said "${H(M).card.word}"`);
      const n0 = H(M).log.length;
      tap(up, 'btn-li5-said-it'); await flush(); advance(310); await flush();
      check('I said it is a Nay', H(M).log.slice(n0).map(e => e.action), ['taboo']);
      check('notes clear on a new card', [up.el('li5-note').style.display, H(M).dobs.every(a => a.length === 0)], ['none', true]);
      noteErr(M.all);
    }

    // ════════════════════════════════════════════════════════════════════════
    section('8. Time Out — the describer\'s, the remaining time kept, End my turn');
    {
      const M = await li5Match(['Ali', 'Bec', 'Cam', 'Dee'], [0, 1, 0, 1]);
      await ready(M);
      advance(4000); await flush();
      const up = upDev(M);
      tap(up, 'btn-pause'); await flush();
      const h = H(M);
      check('Time Out freezes the host clock with what was left', [h.phase, h.remainingMs], ['timeout', TIMER * 1000 - 4000]);
      check('  …every device shows Time Out', M.all.map(d => V(d).phase), Array(4).fill('timeout'));
      check('  …and the describer\'s word is put away', [up.el('pause-overlay').style.display, up.el('active-content').style.display], ['flex', 'none']);
      advance(60000); await flush();
      check('a minute later the turn is still waiting', [H(M).phase, sent(M.code, 'LI5_TIME_UP').length], ['timeout', 0]);
      const t = byRole(M, 'tattle')[0];
      await act(t, { action: 'LI5_TIMEOUT', turnId: h.turnId, paused: false });
      check('only the describer can call Time In', H(M).phase, 'timeout');
      tap(up, 'btn-resume'); await flush();
      check('Keep going: the deadline is now + what was left', H(M).endTimestamp, clock.now + TIMER * 1000 - 4000);
      check('  …on every device', M.all.map(d => V(d).phase), Array(4).fill('play'));
      const onCard = H(M).card.word;
      tap(up, 'btn-pause'); await flush();
      tap(up, 'btn-li5-end-my-turn'); await flush();
      check('End my turn goes to the Report Card everywhere', M.all.map(d => V(d).phase), Array(4).fill('review'));
      ok('  …and the card on screen did not count', !H(M).log.some(e => e.word === onCard));
      noteErr(M.all);
    }

    // ════════════════════════════════════════════════════════════════════════
    section('9. The clock — only the host ends a turn; the 1 s grace');
    {
      const M = await li5Match(['Ali', 'Bec', 'Cam', 'Dee'], [0, 1, 0, 1], { skew: { 2: 4000 } });
      await ready(M);
      advance(TIMER * 1000 - 1); await flush();
      check('a phone 4 s fast shows 0:00 early but ends nothing', [M.all.map(d => V(d).phase), sent(M.code, 'LI5_TIME_UP').length], [Array(4).fill('play'), 0]);
      advance(1); await flush();
      check('the host\'s clock hits 0: Time! on every device', M.all.map(d => V(d).phase), Array(4).fill('timeup'));
      ok('  …sent by the host alone', sent(M.code, 'LI5_TIME_UP').every(e => e.originId === 'uH'));
      advance(600); await flush();
      const n0 = H(M).log.length;
      tap(upDev(M), 'btn-correct'); await flush();
      check('a Yay inside the 1 s grace still counts', H(M).log.slice(n0).map(e => e.action), ['correct']);
      advance(500); await flush();
      check('the grace over, the Report Card', H(M).phase, 'review');
      await next(M); await ready(M);
      await timeUp(M);
      const h = H(M);
      await act(upDev(M), { action: 'LI5_MARK', turnId: h.turnId, cardNo: 0, mark: 'correct' });
      check('a mark after the grace does not count', H(M).log.length, h.log.length);
      noteErr(M.all);
    }

    // ════════════════════════════════════════════════════════════════════════
    section('10. The Report Card — describer + host control; rotation in Line-up order');
    {
      const M = await li5Match(['Ali', 'Bec', 'Cam', 'Dee'], [0, 1, 0, 1], { settings: "settingCorrections = true; settingPenaltyMode = 'points';" });
      await ready(M);
      for (const m of ['correct', 'taboo', 'correct']) await mark(M, m);
      await timeUp(M);
      const up = upDev(M), nobody = M.all.find(d => d !== up && d !== M.host);
      check('the Report Card is on every device', M.all.map(d => shown(d, 'review-overlay')), Array(4).fill(true));
      check('  …the describer drives it', [visible(up, 'btn-review-next'), visible(up, 'li5-review-wait')], [true, false]);
      check('  …everyone else waits', [visible(nobody, 'btn-review-next'), nobody.el('li5-review-wait').textContent],
            [false, `Waiting for ${nobody.run('li5SeatName(li5V.turn.upSeat)')}…`]);
      if (up !== M.host) ok('  …the host keeps its override', visible(M.host, 'btn-review-next'));
      await act(nobody, { action: 'LI5_FLIP', turnId: H(M).turnId, row: 1 });
      check('a flip from anyone else is dropped', H(M).log[1].action, 'taboo');
      up.run('flipEntry(1)'); await flush();
      const h = H(M);
      check('the describer flips a row (Pinky Swear)', h.log[1].action, 'correct');
      check('  …and the score is the re-clamp of the log', h.scores[h.team], M.host.run(`li5Reclamp(${JSON.stringify(h.log)}, li5H.scoreBefore)`));
      check('  …on every device\'s Report Card', M.all.map(d => d.run('roundLog.map(e => e.action)')), Array(4).fill(['correct', 'correct', 'correct']));
      M.host.run('flipEntry(0)'); await flush();
      check('the host can flip too (a describer who wandered off)', H(M).log[0].action, 'taboo');
      await act(nobody, { action: 'LI5_NEXT', turnId: H(M).turnId });
      check('Your Turn → from anyone else is dropped', H(M).phase, 'review');
      await next(M);
      check('the describer closes it: the next turn', H(M).phase, 'gate');
      noteErr(M.all);
    }
    {
      const M = await li5Match(['Ali', 'Bec', 'Cam', 'Dee', 'Eve'], [0, 0, 1, 0, 1], { rounds: 3 });
      const h0 = H(M), ups = [];
      for (let k = 0; k < 6; k++) {
        ups.push(H(M).upSeat);
        await ready(M);
        tap(upDev(M), 'btn-pause'); await flush(); tap(upDev(M), 'btn-li5-end-my-turn'); await flush();
        await next(M);
      }
      const m = h0.members, f = h0.firstTeam;
      const want = [0, 1, 2].flatMap(r => [m[f][r % m[f].length], m[1 - f][r % m[1 - f].length]]);
      check('3v2: each group\'s members come up in Line-up order, and the pair wraps', ups, want);
      check('  …so the smaller group describes more often', [m[0].length, m[1].length].sort(), [2, 3]);
      check('six turns, then the bell', M.all.map(onScreen), Array(5).fill('screen-gameover'));
      noteErr(M.all);
    }
    {
      const M = await li5Match(['Ali', 'Bec', 'Cam', 'Dee'], [0, 1, 0, 1]);
      await ready(M);
      tap(upDev(M), 'btn-pause'); await flush(); tap(upDev(M), 'btn-li5-end-my-turn'); await flush();
      check('a turn with no words: an empty Report Card arrives everywhere (the erased log rebuilt)',
            M.all.map(d => [V(d).phase, d.run('roundLog.length')]), Array(4).fill(['review', 0]));
      noteErr(M.all);
    }

    // ════════════════════════════════════════════════════════════════════════
    section('11. Gameover on every device; out of words');
    {
      const M = await li5Match(['Ali', 'Bec', 'Cam', 'Dee'], [0, 1, 0, 1], { rounds: 1 });
      for (let k = 0; k < 2; k++) { await ready(M); await mark(M, 'correct'); await timeUp(M); await next(M); }
      check('the bell: screen-gameover on every device', M.all.map(onScreen), Array(4).fill('screen-gameover'));
      check('  …with the host\'s scores', M.all.map(d => d.run('teamScores.slice()')), Array(4).fill(H(M).scores));
      check('  …and the whole match log (for Report cards ›)', M.all.map(d => d.run('matchLog.length')), Array(4).fill(2));
      ok('the match is over for reconnect too (an end screen)', M.all.every(d => d.run('!mpMatchLive')));
      noteErr(M.all);
    }
    {
      const M = await li5Match(['Ali', 'Bec', 'Cam', 'Dee'], [0, 1, 0, 1]);
      M.host.run('regularWords.length = regularIdx + 2;');
      await ready(M); await mark(M, 'correct'); await mark(M, 'correct');
      check('out of words mid-turn: straight to the Report Card', H(M).phase, 'review');
      await next(M);
      check('  …then the bell on every device', M.all.map(onScreen), Array(4).fill('screen-gameover'));
      check('  …saying why', M.all.map(d => d.el('gameover-early-end').style.display), Array(4).fill('block'));
      noteErr(M.all);
    }

    // ════════════════════════════════════════════════════════════════════════
    section('12. The Mid-Game Quit Contract — every LI5 screen, every role');
    for (const [label, pick, btn] of [
      ['the gate', M => M.clients[0], 'btn-gatekeeper-exit'],
      ['up the front', M => upDev(M), 'btn-stop'],
      ['tattling', M => byRole(M, 'tattle').find(d => d !== M.host), 'btn-li5-tattle-quit'],
      ['guessing', M => byRole(M, 'guess').find(d => d !== M.host), 'btn-li5-guess-quit'],
    ]) {
      const M = await li5Match(['Ali', 'Bec', 'Cam', 'Dee', 'Eve', 'Fin'], [0, 1, 0, 1, 0, 1]);
      if (label !== 'the gate') {
        for (let k = 0; k < 6 && upDev(M) === M.host; k++) {
          await ready(M); tap(M.host, 'btn-pause'); await flush(); tap(M.host, 'btn-li5-end-my-turn'); await flush(); await next(M);
        }
        await ready(M);
      }
      const q = pick(M);
      tap(q, btn);
      ok(`${label}: ✕ asks first`, shown(q, 'quit-overlay'));
      tap(q, 'btn-quit-confirm'); await flush();
      check(`${label}: a client quitting dissolves the session (the host reset)`, M.host.S.__resets, 1);
      ok(`${label}:   …everyone else got the disconnect overlay`, M.clients.filter(d => d !== q).every(d => d.shown('mp-host-disconnected-overlay')));
      check(`${label}:   …no LI5 timer left on the host`, [M.host.run('li5H'), M.host.run('li5ClockTick')], [null, null]);
      noteErr(M.all);
    }

    // ════════════════════════════════════════════════════════════════════════
    section('13. Reconnect — pause, resume (clock only), a role-stripped snapshot');
    {
      const M = await li5Match(['Ali', 'Bec', 'Cam', 'Dee', 'Eve', 'Fin'], [0, 1, 0, 1, 0, 1]);
      for (let k = 0; k < 6 && (upDev(M) === M.host); k++) {
        await ready(M); tap(M.host, 'btn-pause'); await flush(); tap(M.host, 'btn-li5-end-my-turn'); await flush(); await next(M);
      }
      await ready(M);
      { const t = byRole(M, 'tattle').find(d => d !== M.host); if (t) { t.run('li5Dob(1)'); await flush(); } }
      for (const r of ['guess', 'tattle', 'up']) {
        const d = byRole(M, r).find(x => x !== M.host);
        if (!d) { ok(`${r}: a client in this role exists`, false); continue; }
        const seat = seatOf(d), i = M.all.indexOf(d);
        advance(3000); await flush();
        d.net.kill(); advance(50);
        const back = boot(d.name + "'", d.uid, d.phone);
        addLi5(back, 500 + i); useLi5(back);
        advance(3000); await flush();
        ok(`${r}: the drop is Away`, M.host.run(`mpAwaySeats.has(${seat})`));
        const hp = H(M);
        check(`${r}: pause() stopped the host clock and kept the time left`, [hp.clockTimer, hp.awayPaused, hp.remainingMs > 0], [null, true, true]);
        const clocks0 = sent(M.code, 'LI5_CLOCK').length, turns0 = sent(M.code, 'LI5_TURN').length;
        advance(10000); await flush();
        check(`${r}:   …ten seconds Away cost the turn nothing`, H(M).remainingMs, hp.remainingMs);
        back.run(`mpRejoinRoom('${M.code}')`); await flush(); await flush();
        const h = H(M);
        check(`${r}: resume() sends LI5_CLOCK only — never LI5_TURN`, [sent(M.code, 'LI5_CLOCK').length - clocks0, sent(M.code, 'LI5_TURN').length - turns0], [1, 0]);
        check(`${r}:   …the deadline is now + what was left`, h.endTimestamp, clock.now + hp.remainingMs);
        const v = V(back);
        check(`${r}: the rejoiner is back in its seat, in its role, on the live deadline`, [seatOf(back), roleOf(back), v.phase, v.clock.endTimestamp], [seat, r, 'play', h.endTimestamp]);
        const st = priv(M.code).find(([u]) => u === d.uid)[1].map(e => fbRead(e.payload)).filter(p => p.action === 'LI5_STATE').slice(-1)[0];
        if (r === 'guess') check('guess: the snapshot carries no word, no list, no dobs (only the Yays already shouted)',
          [!!st.word, !!st.dobs, JSON.stringify(Object.assign({}, st, { feed: null })).match(TOKEN_RE)], [false, false, null]);
        if (r === 'tattle') check('tattle: the snapshot carries the word and the dobs, not the next card', [st.word && st.word.word, !!st.dobs, !!(st.word && st.word.next)], [h.card.word, true, false]);
        if (r === 'up') check('up: the snapshot carries the next card too', st.word && st.word.next && st.word.next.word, h.next && h.next.word);
        if (r !== 'guess') check(`${r}:   …and the screen shows it`, r === 'up' ? back.el('active-word').textContent : back.el('li5-tattle-word').textContent, h.card.word);
        const before = JSON.stringify(V(back));
        back.run(`li5HandleEnvelope(${JSON.stringify({ type: 'SYNC', originId: 'uH', payload: st })})`);
        check(`${r}: applying the snapshot again changes nothing (idempotent)`, JSON.stringify(V(back)), before);
        M.all[i] = back;
        if (M.clients.includes(d)) M.clients[M.clients.indexOf(d)] = back;
        noteErr([back]);
      }
      noteErr(M.all);
    }

    // ════════════════════════════════════════════════════════════════════════
    section('14. TLM — two devices, a device is a group');
    {
      const M = await li5Match(['Crayons', 'Glue'], [0, 1], { style: 'team' });
      const h = H(M);
      check('two seats, one per group', h.groups, [0, 1]);
      check('nobody is "guessing" — the describing device is up, the other tattles', M.all.map(roleOf).sort(), ['tattle', 'up']);
      const t = byRole(M, 'tattle')[0], up = upDev(M);
      check('  …and the gate says so', t.el('gatekeeper-team-name').textContent, `${t.run('teamNames[li5V.turn.team]')} is up.`);
      await ready(M);
      check('the tattle device gets the word', t.el('li5-tattle-word').textContent, H(M).card.word);
      await mark(M, 'correct');
      check('the describing device marks (Yay moved off the host)', H(M).log.map(e => e.action), ['correct']);
      await timeUp(M); await next(M);
      check('next turn: the roles swap', [roleOf(up), roleOf(t)], ['tattle', 'up']);
      check('every LI5 envelope from the client is an ACTION (the host owns the state)',
            [...new Set(events(M.code).filter(e => e.originId !== 'uH' && /^LI5_/.test(e.payload.action)).map(e => e.type))], ['ACTION']);
      noteErr(M.all);
    }

    // ════════════════════════════════════════════════════════════════════════
    section('15. No console.warn on any device, in any run');
    check('zero warnings and zero errors, every device, every section', ALL_ERRORS.slice(0, 5), []);

    section('16. The engine no longer carries LI5');
    {
      const src = W.mpSrc;
      ok('the LI5_ROUND_START / LI5_CATCH block is gone', !/LI5_ROUND_START|LI5_CATCH/.test(src));
      ok('the monitor screen is gone', !/li5-monitor/.test(src) && !/screen-li5-monitor/.test(fs.readFileSync(path.join(ROOT, 'js/engine.js'), 'utf8')));
      ok('one dispatch line routes to li5HandleEnvelope', /mpActiveGame === 'li5'\)[\s\S]{0,120}li5HandleEnvelope\(env\)/.test(src));
      const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
      ok('index.html has both new screens and the Intro template', ['screen-li5-tattle', 'screen-li5-guess'].every(id => index.includes(`id="${id}"`)) && index.includes('<template id="intro-li5">'));
      const eng = fs.readFileSync(path.join(ROOT, 'js/engine.js'), 'utf8');
      ok('allScreens registers both', /'screen-li5-tattle'/.test(eng) && /'screen-li5-guess'/.test(eng));
      ok('resetToLobby() tears LI5 down', /function resetToLobby[\s\S]*?li5Teardown\(\)/.test(eng));
    }
  } catch (e) {
    W.tally.failures++; W.tally.total++;
    console.log('\n  FAIL  the run could not finish');
    console.log('          ' + String(e && e.stack || e).split('\n').slice(0, 6).join('\n          '));
  }
  W.report();
})();
