// ═══════════════════════════════════════════════════════════════════════════
// verify-game-intro.js — the Intro (UI revamp Stage 0), driven through the REAL
// js/engine-multiplayer.js + js/engine-intro.js on several devices, over the
// shared fake Firebase world (tools/lib/mp-world.js): a WIRE that erases empty
// values, mock DOM of real elements, a console whose warn lands in the error list.
//
//   node tools/verify-game-intro.js        (exits 1 on any failure)
//   INTRO_SRC=path node tools/…            (drive a deliberately-broken intro copy)
//   MP_SRC=path    node tools/…            (…or a broken engine copy)
//   node tools/mutate-game-intro.js        (the broken-copy runs, every mutant red)
//
// Spec: docs/superpowers/specs/2026-11-08-ui-revamp-design.md § 5 + § 12.
// No real game has an intro in Stage 0 — every game here is a stub registered in
// the vm. Section 2 is the one that guards the twenty real games: a game WITHOUT
// an intro must pass through the new seam exactly as before.
// ═══════════════════════════════════════════════════════════════════════════
'use strict';
const fs = require('fs'), path = require('path');
const W = require('./lib/mp-world');
const { ROOT, fbWrite, fbRead, flush, server, makePhone, devices, boot, advance,
        check, ok, section, errorsOf } = W;

// ── The stub games ───────────────────────────────────────────────────────────
// The template is the <template id="intro-test"> a game's partial would carry:
// plain text nodes only, read through content.querySelector(All).
function tplContent(opts) {
  const node = (attr, text, dataset) => ({ attr, textContent: text, dataset: dataset || {}, querySelectorAll: () => [] });
  const brief = (key, items) => ({ attr: 'brief', textContent: '', dataset: { introBrief: key },
    querySelectorAll: s => (s === 'li' ? items.map(t => ({ textContent: t })) : []) });
  const nodes = [
    node('narrator', 'Ms Pip'), node('role', 'The teacher'),
    node('line', 'Right, class — eyes up here.'),
    node('line', 'Today we play a guessing game.'),
    node('line', 'But first: groups.'),
    brief('default', ['Listen to the clue', 'Shout your guess', 'Cheer your team on', 'A fourth point is never shown']),
    brief('red', ['Describe the word', 'Dodge the No-No words']),
    node('lineup', 'Into your groups, please.'),
  ];
  if (opts && opts.unassigned) nodes.push(node('unassigned', opts.unassigned));
  const hit = (sel, n) => sel === '[data-intro-' + n.attr + ']';
  return { querySelector: s => nodes.find(n => hit(s, n)) || null, querySelectorAll: s => nodes.filter(n => hit(s, n)) };
}

function addIntroGames(d) {
  d.el('intro-test').content = tplContent();
  d.el('intro-beats').content = tplContent({ unassigned: 'Not in a <group>' });
  d.S.__scene = { mounts: 0, stops: 0, last: null };
  d.S.__beats = []; d.S.__beatText = [];
  d.run(`
    const __mkScene = () => ({
      mount(el, o) { __scene.mounts++; __scene.last = { id: el.id, reducedMotion: o.reducedMotion, mode: o.mode }; },
      stop() { __scene.stops++; },
    });
    // A scene WITH the optional beat(i, text) hook (LI5 pilot § 4.4) — it records.
    let __beatThrows = false;
    const __beatScene = () => Object.assign(__mkScene(), {
      beat(i, t) { __beats.push(i); __beatText.push(t); if (__beatThrows) throw new Error('chalk snapped'); },
    });
    const __intro = extra => Object.assign({ template: 'intro-test', scene: __mkScene,
      brief: (seat, team) => (team === 0 ? 'red' : 'default') }, extra || {});
    const __teams = { type: 'teams', teamNames: ['Reds', 'Blues'], minPerTeam: 2 };
    const __bots = { names: ['Sylvia', 'Sam', 'Shirley'], pillClass: 'pill-active-test',
      view: i => ({ seat: i }), decide: v => ({ seat: v.seat }), submit: () => true, thinkMs: () => 2000 };
    MP_GAME_CONFIGS.introgame = Object.assign({}, MP_GAME_CONFIGS.plain, { gameName: 'Intro Game',
      brandBtnClass: 'bg-intro', supportedModes: ['mdlm', 'solo', 'ptp'], recommendedMode: 'mdlm',
      getMaxPlayers: () => 6, getMinPlayers: () => 2, bots: __bots, intro: __intro({ lineup: __teams }) });
    MP_GAME_CONFIGS.introplain = Object.assign({}, MP_GAME_CONFIGS.plain, { gameName: 'Intro Plain',
      supportedModes: ['mdlm', 'solo', 'ptp'], bots: __bots, intro: __intro() });
    MP_GAME_CONFIGS.introrc = Object.assign({}, MP_GAME_CONFIGS.rcgame, { gameName: 'Intro RC',
      getMaxPlayers: () => 6, intro: __intro({ lineup: __teams }) });
    MP_GAME_CONFIGS.introbalanced = Object.assign({}, MP_GAME_CONFIGS.plain, { gameName: 'Balanced',
      getMaxPlayers: () => 6, intro: __intro({ lineup: { type: 'teams', teamNames: ['Ups', 'Downs'], balanced: true } }) });
    MP_GAME_CONFIGS.introbeats = Object.assign({}, MP_GAME_CONFIGS.introgame, { gameName: 'Beats',
      intro: Object.assign(__intro({ lineup: __teams }), { template: 'intro-beats', scene: __beatScene }) });
    mpWireIntro();
  `);
}
const useGame = (d, g) => d.run(`mpActiveGame = '${g}'; mpActiveGameConfig = MP_GAME_CONFIGS['${g}'];`);

// Create, join, (bots), confirm — the real lobby path, so mpConfirmRoster's
// GAME_START and the client's GAME_START applier both run.
async function startIntro(game, names, opts) {
  opts = opts || {};
  server.tree = {}; server.subs = []; devices.length = 0;
  const host = boot('host', 'uH', makePhone());
  addIntroGames(host);
  host.S.localStorage.setItem('sylly_nickname', names[0]);
  useGame(host, game);
  if (opts.style) host.run(`window.mpLobbyStyle = '${opts.style}'`);
  host.run('mpHostCreateRoom()');
  await flush();
  const code = host.run('mpActiveRoomCode');
  const clients = [];
  for (let i = 1; i < names.length; i++) {
    const c = boot('c' + i, 'u' + i, makePhone());
    addIntroGames(c);
    useGame(c, game);
    code.split('').forEach((ch, j) => { c.el('mp-join-c' + (j + 1)).value = ch; });
    c.el('mp-join-nickname-input').value = names[i];
    c.run('mpClientJoinRoom()');
    await flush();
    clients.push(c);
  }
  for (let b = 0; b < (opts.bots || 0); b++) host.run('mpAddBot()');
  host.run('mpConfirmRoster()');
  await flush();
  return { host, clients, code, all: [host, ...clients] };
}

const onScreen = d => d.screens[d.screens.length - 1];
const passes   = d => d.S.__rc.filter(x => x.startsWith('onPassThePhone')).length;
const st       = d => d.run('mpIntro && mpIntro.state ? JSON.parse(JSON.stringify(mpIntro.state)) : null');
const wire     = code => Object.values(server.read(`rooms/${code}/events`) || {}).map(e => e.payload && e.payload.action);
const introOn  = d => d.run('mpIntroIsOpen()');
const tap      = (d, id) => d.el(id).click();

(async () => {
  console.log('The Intro — the real engine + engine-intro.js on N devices');
  console.log('='.repeat(72));
  try {
    section('1. The wire — what the Intro\'s state survives');
    check('an empty array is erased', fbRead(fbWrite({ names: [], keep: 1 })), { keep: 1 });
    check('an all-false ready[] survives as an array', fbRead(fbWrite({ r: [false, false, false] })), { r: [false, false, false] });
    check('an all-Unassigned team[] (-1) survives', fbRead(fbWrite({ t: [-1, -1] })), { t: [-1, -1] });
    {
      const d = boot('probe', 'uP', makePhone());
      check('mpIntroWireArr rebuilds an ERASED array to the seat count', d.run('mpIntroWireArr(undefined, 3, false)'), [false, false, false]);
      check('  …and a sparse one that came back as an object', d.run("mpIntroWireArr({ 0: true, 2: true }, 4, false)"), [true, false, true, false]);
      check('mpIntroWireRoster: an erased roster is null', d.run('mpIntroWireRoster(undefined, 4)'), null);
      check('  …and an erased captainSlots is null, not undefined',
            d.run("mpIntroWireRoster({ teamNames: ['A','B'], playerTeamIdx: { 2: 1, 3: 1 } }, 4)"),
            { teamNames: ['A', 'B'], playerTeamIdx: [0, 0, 1, 1], captainSlots: null, captainNames: null });
      check('mpIntroPlace puts the unassigned into the smallest team, in seat order (lowest on a tie)',
            d.run('mpIntroPlace([0, -1, 0, -1, -1], 2)'), [0, 1, 0, 1, 0]);
    }

    section('2. A game WITHOUT an intro passes through the seam unchanged');
    {
      const { host, clients, code, all } = await startIntro('plain', ['Ali', 'Bec', 'Cam']);
      check('onPassThePhone ran once on every device', all.map(passes), [1, 1, 1]);
      check('  …as host, then as client', all.map(d => d.S.__rc[0]), ['onPassThePhone:host', 'onPassThePhone:client', 'onPassThePhone:client']);
      ok('no device ever showed the Intro', all.every(d => !d.screens.includes('screen-game-intro')));
      ok('no MP_INTRO_* or MP_LINEUP_* packet on the wire', !wire(code).some(a => /^MP_(INTRO|LINEUP)_/.test(a)), wire(code).join(','));
      check('the wire carries what it always did (after the two HANDSHAKEs)', wire(code).filter(Boolean), ['SETTINGS_SYNC', 'GAME_START']);
      check('no errors', errorsOf(all), []);
    }
    {
      const d = boot('ptp', 'uP', makePhone());
      addIntroGames(d);
      useGame(d, 'plain');
      d.run('mpEnterGame(mpActiveGameConfig)');
      check('Pass-the-Phone without an intro: straight into the game', d.S.__rc, ['onPassThePhone:single']);
    }

    section('3. The Intro opens on every device; nobody enters the game yet');
    const M = await startIntro('introgame', ['Ali', 'Bec', 'Cam'], { bots: 1 });
    const [H, C1, C2] = [M.host, M.clients[0], M.clients[1]];
    {
      check('four seats: three people and a bot', H.run('mpPlayerSlots.map(s => s.nickname)'), ['Ali', 'Bec', 'Cam', 'Sylvia']);
      check('every device is on screen-game-intro', M.all.map(onScreen), ['screen-game-intro', 'screen-game-intro', 'screen-game-intro']);
      check('onPassThePhone has NOT run anywhere', M.all.map(passes), [0, 0, 0]);
      check('the bot is pre-ready; nobody else is', st(H).ready, [false, false, false, true]);
      check('everyone starts Unassigned', st(H).team, [-1, -1, -1, -1]);
      check('every client mirrors the host\'s state', [st(C1), st(C2)], [st(H), st(H)]);
      check('the scene mounted once per device, into the scene slot', M.all.map(d => [d.S.__scene.mounts, d.S.__scene.last && d.S.__scene.last.id]),
            [[1, 'game-intro-scene'], [1, 'game-intro-scene'], [1, 'game-intro-scene']]);
      check('the copy came from the game\'s template', [C1.el('game-intro-who').textContent, C1.el('game-intro-line').textContent],
            ['Ms Pip · The teacher', 'Right, class — eyes up here.']);
      check('  …and the CTAs take the game\'s brand', H.el('btn-game-intro-start').className.includes('bg-intro'), true);
      ok('seats froze at GAME_START (presence works during the Intro)', H.run('mpMatchLive') && H.run('mpSeats.length') === 4);
    }

    section('4. Narrator beats are local: a tap advances one device only');
    {
      const before = wire(M.code).length;
      tap(C1, 'game-intro-narrator');
      check('client 1 is on beat 2', C1.run('mpIntro.beat'), 1);
      check('  …the host and client 2 are still on beat 1', [H.run('mpIntro.beat'), C2.run('mpIntro.beat')], [0, 0]);
      check('  …and nothing went on the wire', wire(M.code).length, before);
      C1.run('mpIntroReady()'); await flush();
      check('Ready does nothing during the beats', st(H).ready[1], false);
      ok('Ready is hidden during the beats', C1.el('btn-game-intro-ready').style.display === 'none');
      ok('only the host is offered Skip', H.el('btn-game-intro-skip').style.display === '' && C2.el('btn-game-intro-skip').style.display === 'none');
      advance(5000);
      check('a line auto-advances after 5 s on every device', M.all.map(d => d.run('mpIntro.beat')), [1, 2, 1]);
    }

    section('5. Host Skip: every device jumps to the Line-up');
    {
      tap(H, 'btn-game-intro-skip'); await flush();
      check('skipped on every device', M.all.map(d => st(d).skipped), [true, true, true]);
      check('nobody is in the beats any more', M.all.map(d => d.run('mpIntroInBeats()')), [false, false, false]);
      ok('the narrator card is hidden; the Line-up is shown', M.all.every(d => d.el('game-intro-narrator').style.display === 'none' && d.el('game-intro-lineup-wrap').style.display === ''));
      check('the brief shows three points at most', (C2.el('game-intro-brief-list').innerHTML.match(/<li>/g) || []).length, 3);
      check('no beat timer is left in the bag', H.run('mpIntro.beatTimer'), null);
    }

    section('6. Readiness — host-authoritative, seat from originId');
    {
      tap(C1, 'btn-game-intro-ready'); await flush();
      check('client 1 is ready on the host', st(H).ready, [false, true, false, true]);
      check('  …and on client 2', st(C2).ready, [false, true, false, true]);
      tap(C1, 'btn-game-intro-ready'); await flush();
      check('a second tap sends nothing more', wire(M.code).filter(a => a === 'MP_INTRO_READY').length, 1);
      H.run(`mpHandleEnvelope({ type: 'ACTION', originId: 'u2', payload: { action: 'MP_INTRO_READY', playerIdx: 0 } })`);
      check('a forged playerIdx is ignored — originId u2 readies seat 2, not seat 0', st(H).ready, [false, true, true, true]);
      H.run(`mpHandleEnvelope({ type: 'ACTION', originId: 'uZ', payload: { action: 'MP_INTRO_READY' } })`);
      check('a uid not on the roster changes nothing', st(H).ready, [false, true, true, true]);
      check('Start is still disabled — the host itself is not ready', H.el('btn-game-intro-start').disabled, true);
      tap(H, 'btn-game-intro-ready'); await flush();
      check('the host marked its OWN slot directly', st(H).ready, [true, true, true, true]);
      ok('  …without sending itself an ACTION (the dedup guard would drop it)',
         !Object.values(server.read(`rooms/${M.code}/events`) || {}).some(e => e.originId === 'uH' && e.type === 'ACTION'));
      check('every client agrees everyone is ready', [st(C1).ready, st(C2).ready], [[true, true, true, true], [true, true, true, true]]);
    }

    section('7. The Line-up — free switching, host override, the gate');
    {
      C1.run('mpIntroPick(0)'); await flush();
      check('client 1 joins the Reds', st(H).team[1], 0);
      check('  …and its brief changes with its team', C1.el('game-intro-brief-list').innerHTML.includes('Describe the word'), true);
      C1.run('mpIntroPick(1)'); await flush();
      check('switches to the Blues', st(H).team[1], 1);
      C1.run('mpIntroPick(-1)'); await flush();
      check('and back to Unassigned', st(H).team[1], -1);
      H.run(`mpHandleEnvelope({ type: 'ACTION', originId: 'u1', payload: { action: 'MP_LINEUP_PICK', team: 5 } })`);
      check('a team that does not exist is refused', st(H).team[1], -1);
      // Stack the Reds: three of four, every one ready.
      H.run('mpIntroPick(0)'); C1.run('mpIntroPick(0)'); C2.run('mpIntroPick(0)'); await flush();
      check('three on the Reds', st(H).team, [0, 0, 0, -1]);
      check('the gate names the rule', H.el('game-intro-problem').textContent, 'Each team needs at least 2 players.');
      check('Start is blocked although everyone is ready', [H.run('mpIntroAllReady()'), H.el('btn-game-intro-start').disabled], [true, true]);
      tap(H, 'btn-game-intro-start'); await flush();
      check('  …and a tap on it does nothing', passes(H), 0);
      H.run('mpIntroHostMove(2)'); await flush();
      check('host override: a tap moves Cam to the next column (Blues)', st(C2).team, [0, 0, 1, -1]);
      check('the gate clears — the unassigned bot will be placed in the Blues', H.el('game-intro-problem').textContent, '');
      H.run("mpIntroHostRename(1, '  Glue Stick Gang  ')"); await flush();
      check('host rename reaches every device, trimmed', [st(C1).names, st(C2).names], [['Reds', 'Glue Stick Gang'], ['Reds', 'Glue Stick Gang']]);
      H.run("mpIntroHostRename(0, '   ')"); await flush();
      check('an empty name falls back to the default (an empty string would never arrive)', st(C1).names[0], 'Reds');
      check('a client cannot move anyone', (C1.run('mpIntroHostMove(0)'), st(H).team[0]), 0);
      ok('names are escaped in the Line-up markup', H.run(`mpPlayerSlots[1].nickname = '<b>Bec</b>'; mpIntroRender(); document.getElementById('game-intro-lineup').innerHTML`).includes('&lt;b&gt;Bec&lt;/b&gt;'));
      H.run(`mpPlayerSlots[1].nickname = 'Bec'; mpIntroRender();`);
    }

    section('8. Start: one settled snapshot; seats re-frozen; every device enters the game');
    {
      const reds = st(H).team;
      tap(H, 'btn-game-intro-start'); await flush();
      check('the plan: Reds = Ali, Bec; Blues = Cam + the bot (auto-placed)', reds, [0, 0, 1, -1]);
      check('onPassThePhone ran once on every device', M.all.map(passes), [1, 1, 1]);
      check('every device has the same seat order, team by team', M.all.map(d => d.run('mpPlayerSlots.map(s => s.nickname)')),
            [['Ali', 'Bec', 'Cam', 'Sylvia'], ['Ali', 'Bec', 'Cam', 'Sylvia'], ['Ali', 'Bec', 'Cam', 'Sylvia']]);
      check('the roster every game already reads', M.all.map(d => d.run('JSON.parse(JSON.stringify(window.mpLobbyRoster))')),
            Array(3).fill({ teamNames: ['Reds', 'Glue Stick Gang'], playerTeamIdx: [0, 0, 1, 1], captainSlots: null, captainNames: null })
              .map((r, i) => i === 0 ? { teamNames: r.teamNames, playerTeamIdx: r.playerTeamIdx, captainSlots: null } : r));
      check('each device knows its own seat', M.all.map(d => d.run('mpMyPlayerIdx')), [0, 1, 2]);
      check('mpSeats agree everywhere', M.all.map(d => d.run('mpSeats')), Array(3).fill(['uH', 'u1', 'u2', H.run('mpPlayerSlots[3].uid')]));
      check('the Intro is closed everywhere', M.all.map(introOn), [false, false, false]);
      check('its timers are gone (the 20 s Start-anyway included)', M.all.map(d => d.run('mpIntroTimers.length')), [0, 0, 0]);
      check('the scene was stopped once per device', M.all.map(d => d.S.__scene.stops), [1, 1, 1]);
      const tail = wire(M.code).slice(-1)[0];
      check('MP_INTRO_DONE was the last packet the host sent', tail, 'MP_INTRO_DONE');
      check('no errors anywhere', errorsOf(M.all), []);
    }

    section('8b. A Line-up that reorders seats re-freezes them — on the server too');
    {
      const R = await startIntro('introgame', ['Ali', 'Bec', 'Cam', 'Dee']);
      const [h, c1, c2, c3] = R.all;
      h.run('mpIntroSkip()'); await flush();
      // Ali + Dee = Reds, Bec + Cam = Blues → seat order Ali, Dee, Bec, Cam.
      h.run('mpIntroPick(0)'); c3.run('mpIntroPick(0)'); c1.run('mpIntroPick(1)'); c2.run('mpIntroPick(1)');
      R.all.forEach(d => d.run('mpIntroReady()')); await flush();
      h.run('mpIntroStart(false)'); await flush();
      check('seat order is team by team', h.run('mpPlayerSlots.map(s => s.nickname)'), ['Ali', 'Dee', 'Bec', 'Cam']);
      check('rooms/{code}/seats was rewritten in that order', server.read(`rooms/${R.code}/seats`), { 0: 'uH', 1: 'u3', 2: 'u1', 3: 'u2' });
      check('each client found its new seat', [c1, c2, c3].map(d => d.run('mpMyPlayerIdx')), [2, 3, 1]);
      check('playerTeamIdx matches the new order', c2.run('window.mpLobbyRoster.playerTeamIdx'), [0, 0, 1, 1]);
      c3.net.kill(); advance(3000); await flush();
      check('Away after the re-freeze names the RIGHT seat (Dee is seat 1 now)', h.run('[...mpAwaySeats]'), [1]);
      check('  …by name', h.el('mp-away-heading').textContent, 'Waiting for Dee…');
    }

    section('9. Start anyway — 20 s after the Intro opens, waives readiness only');
    {
      const R = await startIntro('introgame', ['Ali', 'Bec', 'Cam', 'Dee']);
      const h = R.host;
      h.run('mpIntroSkip()'); await flush();
      h.run('mpIntroPick(0)'); R.clients[0].run('mpIntroPick(0)'); R.clients[1].run('mpIntroPick(1)'); R.clients[2].run('mpIntroPick(1)');
      h.run('mpIntroReady()'); await flush();
      ok('Start anyway is hidden at first', h.el('btn-game-intro-anyway').style.display === 'none');
      check('…and refuses before its time', h.run('mpIntroStart(true)'), false);
      advance(19999);
      ok('still hidden at 19.999 s', h.el('btn-game-intro-anyway').style.display === 'none');
      advance(1);
      ok('shown at 20 s', h.el('btn-game-intro-anyway').style.display === '');
      ok('  …to the host only', R.clients.every(c => c.el('btn-game-intro-anyway').style.display === 'none'));
      R.clients[2].run('mpIntroPick(0)'); await flush();     // Reds 3, Blues 1 — lopsided
      check('a lopsided Line-up blocks Start anyway too', [h.el('btn-game-intro-anyway').disabled, h.run('mpIntroStart(true)')], [true, false]);
      R.clients[2].run('mpIntroPick(1)'); await flush();
      check('fixed: Start anyway goes, though three are not ready', h.run('mpIntroStart(true)'), true);
      await flush();
      check('every device entered the game', R.all.map(passes), [1, 1, 1, 1]);
    }

    section('10. Play again — the returning form: beats skipped, Line-up + Ready still run');
    {
      const R = await startIntro('introgame', ['Ali', 'Bec', 'Cam', 'Dee']);
      const [h, c1, c2, c3] = R.all;
      h.run('mpIntroSkip()'); h.run('mpIntroPick(0)'); c1.run('mpIntroPick(1)'); c2.run('mpIntroPick(0)'); c3.run('mpIntroPick(1)');
      R.all.forEach(d => d.run('mpIntroReady()')); await flush();
      h.run('mpIntroStart(false)'); await flush();
      const firstTeams = h.run('window.mpLobbyRoster.playerTeamIdx');
      h.run('mpReturnToLobby()'); await flush();
      check('Play again flags the game as seen', h.run('mpIntroSeen'), 'introgame');
      h.run('mpConfirmRoster()'); await flush();
      check('the Intro opens again on every device', R.all.map(introOn), [true, true, true, true]);
      check('  …with the beats skipped everywhere', R.all.map(d => d.run('mpIntroInBeats()')), [false, false, false, false]);
      check('  …nobody ready yet', st(h).ready, [false, false, false, false]);
      check('  …and last match\'s teams kept, by player', st(h).team.map(Number), [0, 0, 1, 1]);
      check('  (the first match placed them the same)', firstTeams, [0, 0, 1, 1]);
      check('the game has not started', R.all.map(passes), [1, 1, 1, 1]);

      h.run('resetToLobby()'); await flush();
      check('resetToLobby clears the flag', h.run('mpIntroSeen'), null);
    }
    {
      const R = await startIntro('introgame', ['Ali', 'Bec']);
      check('exit and re-host: the narrator plays again', R.all.map(d => d.run('mpIntroInBeats()')), [true, true]);
    }

    section('10b. Play again with NO Line-up: straight into the game');
    {
      const R = await startIntro('introplain', ['Ali', 'Bec', 'Cam']);
      const [h] = R.all;
      h.run('mpIntroSkip()'); R.all.forEach(d => d.run('mpIntroReady()')); await flush();
      check('a game with no Line-up gets a roll call, not columns', [h.el('game-intro-roll').style.display, h.el('game-intro-lineup-wrap').style.display], ['', 'none']);
      h.run('mpIntroStart(false)'); await flush();
      h.run('mpReturnToLobby()'); await flush();
      const shownBefore = R.clients.map(c => c.screens.filter(s => s === 'screen-game-intro').length);
      h.run('mpConfirmRoster()'); await flush();
      check('every device went straight in', R.all.map(passes), [2, 2, 2]);
      check('no client showed the Intro this time', R.clients.map(c => c.screens.filter(s => s === 'screen-game-intro').length), shownBefore);
      check('no Intro is left open', R.all.map(introOn), [false, false, false]);
    }

    section('11. Drop and quit during the Intro — the existing contracts, unchanged');
    {
      const R = await startIntro('introgame', ['Ali', 'Bec', 'Cam', 'Dee']);
      const [h, c1, c2, c3] = R.all;
      h.run('mpIntroSkip()'); h.run('mpIntroPick(0)'); c1.run('mpIntroPick(0)'); c2.run('mpIntroPick(1)'); c3.run('mpIntroPick(1)');
      R.all.forEach(d => d.run('mpIntroReady()')); await flush();
      c3.net.kill(); advance(3000); await flush();
      ok('a drop is Away, during the Intro too', h.run('mpAwaySeats.has(3)'));
      ok('  …the table sees the Waiting overlay', c1.shown('mp-away-overlay'));
      check('Start waits on a dropped seat', h.run('mpIntroStart(false)'), false);
    }
    {
      const R = await startIntro('introgame', ['Ali', 'Bec', 'Cam']);
      const [h, c1, c2] = R.all;
      tap(c1, 'btn-game-intro-quit');
      ok('✕ asks first', c1.shown('game-intro-quit-overlay'));
      check('  …in words that say the room goes too', c1.el('game-intro-quit-sub').textContent, 'Everyone heads back to the lobby, and the game ends for the whole room.');
      tap(c1, 'btn-game-intro-quit-confirm'); await flush();
      check('a client quitting dissolves the session (the host reset)', h.S.__resets, 1);
      ok('  …the other client got the disconnect overlay', c2.shown('mp-host-disconnected-overlay'));
      check('nothing of the Intro is left on the host', [h.run('mpIntroIsOpen()'), h.run('mpIntroTimers.length'), h.timers.length], [false, 0, 0]);
    }

    section('12. Rejoin into the Intro (a reconnect-hook game)');
    {
      const R = await startIntro('introrc', ['Ali', 'Bec', 'Cam']);
      const [h, c1] = R.all;
      h.run('mpIntroSkip()'); h.run('mpIntroPick(0)'); await flush();
      c1.net.kill(); advance(50);
      const back = boot("c1'", 'u1', c1.phone);
      addIntroGames(back);
      advance(3000); await flush();
      ok('seat 1 is Away', h.run('mpAwaySeats.has(1)'));
      check('an adopter is NOT paused mid-Intro (no game to pause)', h.S.__rc.filter(x => x === 'pause'), []);
      advance(50);
      back.run(`mpRejoinRoom('${R.code}')`); await flush();
      check('the rejoiner is back in the Intro', [back.run('mpIntroIsOpen()'), onScreen(back)], [true, 'screen-game-intro']);
      check('  …with the host\'s state', st(back), st(h));
      check('  …in its own seat', back.run('mpMyPlayerIdx'), 1);
      check('the host sent no game snapshot', h.S.__rc.filter(x => x.startsWith('sendState')), []);
      check('  …and resumed nothing', h.S.__rc.filter(x => x === 'resume'), []);
      check('it did not enter the game early', passes(back), 0);
      check('Away cleared', h.run('[...mpAwaySeats]'), []);
      back.run('mpIntroPick(1)'); await flush();
      check('and it can pick a side again', st(h).team[1], 1);
      check('no errors', errorsOf([h, back, R.clients[1]]), []);
    }

    section('13. Pass-the-Phone — one tap, no readiness, no Line-up, no packets');
    {
      const d = boot('ptp', 'uP', makePhone());
      addIntroGames(d);
      useGame(d, 'introgame');
      d.run('mpEnterGame(mpActiveGameConfig)');
      check('the Intro is on screen', onScreen(d), 'screen-game-intro');
      check('  …in its one-tap form, no Line-up', [d.run('mpIntro.mode'), d.run('mpIntro.lineup')], ['ptp', null]);
      d.run('mpIntroSkip()');
      ok('one CTA: Let\'s go', d.el('btn-game-intro-go').style.display === '' && d.el('btn-game-intro-ready').style.display === 'none' && d.el('btn-game-intro-start').style.display === 'none');
      tap(d, 'btn-game-intro-go');
      check('Let\'s go enters the game', d.S.__rc, ['onPassThePhone:single']);
      check('  …the scene stopped', d.S.__scene.stops, 1);
      d.run('mpEnterGame(mpActiveGameConfig)');
      tap(d, 'btn-game-intro-quit'); tap(d, 'btn-game-intro-quit-confirm');
      check('✕ in Pass-the-Phone goes back to the game menu', [onScreen(d), d.S.__resets], ['screen-test-menu', 0]);
    }

    section('14. Solo — the host and bots only, a null wire');
    {
      server.tree = {}; server.subs = []; devices.length = 0;
      const d = boot('solo', 'uS', makePhone());
      addIntroGames(d);
      useGame(d, 'introplain');
      d.run('mpEnterSolo(); mpConfirmRoster();'); await flush();
      check('Solo opens the Intro', onScreen(d), 'screen-game-intro');
      check('  …the bot seat is pre-ready', st(d).ready, [false, true]);
      d.run('mpIntroSkip(); mpIntroReady();');
      check('one tap and Start goes', d.run('mpIntroStart(false)'), true);
      check('into the game', d.S.__rc, ['onPassThePhone:host']);
      check('no errors', errorsOf([d]), []);
    }

    section('15. A balanced Line-up; a scene that throws');
    {
      const R = await startIntro('introbalanced', ['Ali', 'Bec', 'Cam']);
      const h = R.host;
      h.run('mpIntroSkip()'); await flush();
      check('three players can never balance two teams', h.run('mpIntroProblem()'), 'Both teams need the same number of players.');
      h.run('mpIntroPick(0)'); R.clients[0].run('mpIntroPick(1)'); await flush();
      check('  …and the unassigned third cannot fix it', h.run('mpIntroProblem()'), 'Both teams need the same number of players.');
    }
    {
      const d = boot('ptp2', 'uQ', makePhone());
      addIntroGames(d);
      d.run("MP_GAME_CONFIGS.introgame.intro.scene = () => ({ mount() { throw new Error('boom'); }, stop() {} });");
      useGame(d, 'introgame');
      d.run('mpEnterGame(mpActiveGameConfig)');
      check('a throwing scene leaves the Intro running', [onScreen(d), d.run('mpIntroIsOpen()')], ['screen-game-intro', true]);
      check('  …with its slot hidden', d.el('game-intro-scene').style.display, 'none');
      ok('  …and a warning, not silence', d.errors.some(e => /\[intro\] scene\.mount/.test(e)));
    }

    section('16. Teardown and the markup the renderer needs');
    {
      const R = await startIntro('introgame', ['Ali', 'Bec']);
      R.host.run('resetToLobby()'); await flush();
      check('resetToLobby mid-Intro: closed, no timers, scene stopped', [R.host.run('mpIntroIsOpen()'), R.host.run('mpIntroTimers.length'), R.host.S.__scene.stops], [false, 0, 1]);
      const engineSrc = fs.readFileSync(path.join(ROOT, 'js/engine.js'), 'utf8');
      ok('engine.js resetToLobby() calls mpIntroTeardown()', /function resetToLobby[\s\S]*?mpIntroTeardown\(\)/.test(engineSrc));
      ok('screen-game-intro is in allScreens[]', /const allScreens = \[[\s\S]*?'screen-game-intro'[\s\S]*?\];/.test(engineSrc));
      ok('mpEndMatchLocal() stops the Intro', /function mpEndMatchLocal[\s\S]*?mpIntroStop\(\)[\s\S]*?\n\}/.test(W.mpSrc));
      const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
      const ids = [...new Set([...W.introSrc.matchAll(/\$\('([a-z0-9-]+)'\)/g)].map(m => m[1]))];
      const missing = ids.filter(id => !index.includes(`id="${id}"`));
      ok(`every element the Intro touches exists in index.html (${ids.length})`, ids.length > 15 && missing.length === 0, 'missing: ' + missing.join(', '));
      ok('index.html loads engine-intro.js right after engine-multiplayer.js',
         /engine-multiplayer\.js"><\/script>\s*<script src="js\/engine-intro\.js">/.test(index));
      ok('sw.js precaches it', fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8').includes("'js/engine-intro.js'"));
      // Every route goes through the seam: the only direct calls left are mpEnterGame's own two.
      const seam = (W.mpSrc.match(/function mpEnterGame[\s\S]*?\n\}/) || [''])[0];
      check('the engine calls onPassThePhone() only inside mpEnterGame',
            [(W.mpSrc.match(/\.onPassThePhone\(\)/g) || []).length, (seam.match(/\.onPassThePhone\(\)/g) || []).length], [2, 2]);
    }

    // ── LI5 pilot S0 (spec 2026-11-09-li5-pilot-design.md § 4.4) ──────────────
    const fireVis = (d, hidden) => { d.S.document.hidden = hidden; (d.S.document._l.visibilitychange || []).forEach(fn => fn()); };
    const ptpOn = (name, game) => { const d = boot(name, 'u' + name, makePhone()); addIntroGames(d); useGame(d, game); d.run('mpEnterGame(mpActiveGameConfig)'); return d; };

    section('17. The scene beat(i, text) hook — state, not an event');
    {
      const d = ptpOn('beatA', 'introbeats');
      check('after mount the scene is told the first line', [d.S.__beats, d.S.__beatText], [[0], ['Right, class — eyes up here.']]);
      ok('the screen is flagged data-scene-beats', d.el('screen-game-intro').dataset.sceneBeats !== undefined);
      check('  …and the narrator line is still in the DOM (sr-only, still read)', d.el('game-intro-line').textContent, 'Right, class — eyes up here.');
      tap(d, 'game-intro-narrator');
      tap(d, 'game-intro-scene');
      check('a tap on the narrator OR the scene advances a beat', d.run('mpIntro.beat'), 2);
      tap(d, 'game-intro-narrator');
      check('tapping through: 0 … n−1, then −1 exactly once', d.S.__beats, [0, 1, 2, -1]);
      check('  …the settle call carries no text', d.S.__beatText[3], '');
      d.run('mpIntroRender(); mpIntroRender();');
      check('re-rendering sends nothing new', d.S.__beats, [0, 1, 2, -1]);
      fireVis(d, true);
      check('tab-away stops the scene', d.S.__scene.stops, 1);
      fireVis(d, false);
      check('coming back re-mounts and re-sends the current state', [d.S.__scene.mounts, d.S.__beats], [2, [0, 1, 2, -1, -1]]);
      tap(d, 'btn-game-intro-go');
      check('  …and the Intro still finishes', d.S.__rc, ['onPassThePhone:single']);
    }
    {
      const d = ptpOn('beatB', 'introbeats');
      d.run('mpIntroSkip()');
      check('Skip after one beat: [0, −1]', d.S.__beats, [0, -1]);
      advance(20000);
      check('  …and no beat timer fires after it', d.S.__beats, [0, -1]);
    }
    {
      const d = ptpOn('beatC', 'introgame');
      ok('a scene WITHOUT beat: no data-scene-beats, the narrator shows as before',
         d.el('screen-game-intro').dataset.sceneBeats === undefined && d.el('game-intro-narrator').style.display === '');
      tap(d, 'game-intro-narrator'); tap(d, 'game-intro-narrator'); tap(d, 'game-intro-narrator');
      tap(d, 'btn-game-intro-go');
      check('  …and the whole Intro runs unchanged', d.S.__rc, ['onPassThePhone:single']);
    }
    {
      const d = boot('beatD', 'uD', makePhone()); addIntroGames(d);
      d.run('__beatThrows = true;');
      useGame(d, 'introbeats');
      d.run('mpEnterGame(mpActiveGameConfig)');
      tap(d, 'game-intro-narrator'); tap(d, 'game-intro-narrator'); tap(d, 'game-intro-narrator');
      ok('a throwing beat warns, not silence', d.errors.some(e => /\[intro\] scene\.beat/.test(e)));
      check('  …each beat still went to the scene once', d.S.__beats, [0, 1, 2, -1]);
      tap(d, 'btn-game-intro-go');
      check('  …and the Intro still reaches the game', d.S.__rc, ['onPassThePhone:single']);
    }
    {
      const R = await startIntro('introbeats', ['Ali', 'Bec', 'Cam', 'Dee']);
      const [h, c1, c2, c3] = R.all;
      check('MDLM: every device starts on beat 0', R.all.map(d => d.S.__beats), [[0], [0], [0], [0]]);
      h.run('mpIntroSkip()'); await flush();
      check('a host Skip settles every board once', R.all.map(d => d.S.__beats), [[0, -1], [0, -1], [0, -1], [0, -1]]);
      ok('the Line-up\'s third column uses the template\'s own word (escaped)',
         h.el('game-intro-lineup').innerHTML.includes('>Not in a &lt;group&gt;<') && !h.el('game-intro-lineup').innerHTML.includes('>Unassigned<'));
      h.run('mpIntroPick(0)'); c1.run('mpIntroPick(0)'); c2.run('mpIntroPick(1)'); c3.run('mpIntroPick(1)');
      R.all.forEach(d => d.run('mpIntroReady()')); await flush();
      h.run('mpIntroStart(false)'); await flush();
      h.run('mpReturnToLobby()'); await flush();
      R.all.forEach(d => { d.S.__beats.length = 0; });
      h.run('mpConfirmRoster()'); await flush();
      check('a returning Intro sees only beat(−1)', R.all.map(d => d.S.__beats), [[-1], [-1], [-1], [-1]]);
      h.run('mpIntroPick(1)'); c1.run('mpIntroPick(1)'); h.run('mpIntroHostMove(2)'); R.all.forEach(d => d.run('mpIntroReady()')); await flush();
      check('  …and Line-up picks and readiness never re-send it', R.all.map(d => d.S.__beats), [[-1], [-1], [-1], [-1]]);
      check('no errors', errorsOf(R.all), []);
    }
    {
      const R = await startIntro('introgame', ['Ali', 'Bec']);
      R.host.run('mpIntroSkip()'); await flush();
      ok('without data-intro-unassigned the column falls back to "Unassigned"', R.host.el('game-intro-lineup').innerHTML.includes('>Unassigned<'));
    }

    section('18. No Line-up in a Team Lobby — a device IS a team');
    {
      const R = await startIntro('introbeats', ['Crayons', 'Glue'], { style: 'team' });
      check('both devices know it is a Team Lobby', R.all.map(d => d.run('window.mpLobbyStyle')), ['team', 'team']);
      check('a lineup config gives no Line-up in TLM', R.all.map(d => d.run('mpIntro.lineup')), [null, null]);
      R.host.run('mpIntroSkip()'); await flush();
      check('  …a roll call instead', R.all.map(d => [d.el('game-intro-roll').style.display, d.el('game-intro-lineup-wrap').style.display]),
            [['', 'none'], ['', 'none']]);
      R.all.forEach(d => d.run('mpIntroReady()')); await flush();
      check('  …and Start goes without a minPerTeam it could never meet', R.host.run('mpIntroStart(false)'), true);
      await flush();
      check('both devices entered the game', R.all.map(passes), [1, 1]);
    }

  } catch (e) {
    W.tally.failures++; W.tally.total++;
    console.log('\n  FAIL  the run could not finish');
    console.log('          ' + String(e && e.stack || e).split('\n').slice(0, 4).join('\n          '));
  }
  W.report();
})();
