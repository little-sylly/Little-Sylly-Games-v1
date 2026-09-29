// ═══════════════════════════════════════════════════════════════════════════
// verify-bots.js — the engine half of bots (SW v247), driven through the REAL
// js/engine-multiplayer.js on the shared fake Firebase world (tools/lib/mp-world.js).
//
//   node tools/verify-bots.js        (exits 1 on any failure)
//   MP_SRC=path node tools/…         (drive a deliberately-broken copy)
//
// Spec: docs/superpowers/specs/2026-09-29-bots-design.md §§ 3–4. The game half
// (Cold Shoulder's brain) is verify-cld-bots.js.
// ═══════════════════════════════════════════════════════════════════════════
'use strict';
const W = require('./lib/mp-world');
const { flush, server, makePhone, devices, boot, advance, check, ok, section, errorsOf } = W;

// A test game that adopts bots. Its hook records every call, so the order of
// view → decide → submit is observable.
function addBotGame(d, extra) {
  d.S.__bot = [];
  d.run(`
    MP_GAME_CONFIGS.botgame = Object.assign({}, MP_GAME_CONFIGS.plain, {
      gameName: 'Bot Game', supportedModes: ['mdlm', 'solo'],
      getMaxPlayers: () => 4, getMinPlayers: () => 3,
      bots: {
        names: ['Sylvia', 'Sam', 'Shirley'],
        pillClass: 'pill-active-test',
        view:    i => { __bot.push('view:' + i); return { seat: i }; },
        decide:  (v, d, rng) => { __bot.push('decide:' + v.seat + ':' + d); return { seat: v.seat, r: rng() }; },
        submit:  (i, m, tag) => { __bot.push('submit:' + i + ':' + tag); return true; },
        thinkMs: () => 2000,
      },
    });
    MP_GAME_CONFIGS.botrc = Object.assign({}, MP_GAME_CONFIGS.rcgame, { gameName: 'Bot RC',
      getMaxPlayers: () => 4, getMinPlayers: () => 2, bots: MP_GAME_CONFIGS.botgame.bots });
    ${extra || ''}
  `);
}
function useGame(d, game) { d.run(`mpActiveGame = '${game}'; mpActiveGameConfig = MP_GAME_CONFIGS['${game}'];`); }
function fresh() { server.tree = {}; server.subs = []; devices.length = 0; }

async function hostRoom(nick, game) {
  const host = boot('host', 'uH', makePhone());
  addBotGame(host);
  host.S.localStorage.setItem('sylly_nickname', nick);
  useGame(host, game || 'botgame');
  host.run('mpHostCreateRoom()');
  await flush();
  return host;
}
async function join(host, name, uid, nick, game) {
  const c = boot(name, uid, makePhone());
  addBotGame(c);
  useGame(c, game || 'botgame');
  host.run('mpActiveRoomCode').split('').forEach((ch, j) => { c.el('mp-join-c' + (j + 1)).value = ch; });
  c.el('mp-join-nickname-input').value = nick;
  c.run('mpClientJoinRoom()');
  await flush();
  return c;
}
const names = d => d.run('mpPlayerSlots.map(s => s.nickname)');
const uids  = d => d.run('mpPlayerSlots.map(s => s.uid)');

(async () => {
  console.log('Bots — the engine half, on the real engine');
  console.log('='.repeat(72));
  try {
    section('1. Bot seats: added by hand, named from the pool, humans first');
    {
      fresh();
      const host = await hostRoom('Sam');
      check('two bots added', [host.run('mpAddBot()'), host.run('mpAddBot()')], [true, true]);
      check('named in pool order, skipping the host\'s own name', names(host), ['Sam', 'Sylvia', 'Shirley']);
      check('bot uids', uids(host), ['uH', 'bot:0', 'bot:1']);
      check('mpIsBotUid', host.run("[mpIsBotUid('bot:3'), mpIsBotUid('uH'), mpIsBotUid(null)]"), [true, false, false]);
      check('seat labels carry the marker', host.run('[0, 1, 2].map(mpSeatLabel)'), ['Sam', 'Sylvia 🤖', 'Shirley 🤖']);
      check('the fourth seat fills from the fallback', [host.run('mpAddBot()'), host.run('mpPlayerSlots[3].nickname')], [true, 'Bot 1']);
      check('a fifth is refused at the maximum', host.run('mpAddBot()'), false);
      const code = host.run('mpActiveRoomCode');
      ok('bots are never written to /players',
         Object.values(server.read(`rooms/${code}/players`) || {}).every(p => !String(p.uid).startsWith('bot:')));
      check('a bot is removed by uid', host.run("mpRemoveBot('bot:0')"), true);
      check('…and a human never is', host.run("mpRemoveBot('uH')"), false);
      check('slots after removal', names(host), ['Sam', 'Shirley', 'Bot 1']);
      check('no errors', errorsOf([host]), []);
    }

    section('2. A human outranks a bot, and a bot gives up a clashing name');
    {
      fresh();
      const host = await hostRoom('Ali');
      host.run('mpAddBot(); mpAddBot(); mpAddBot();');
      check('the room is full of bots', names(host), ['Ali', 'Sylvia', 'Sam', 'Shirley']);
      const c1 = await join(host, 'c1', 'u1', 'sylvia');   // Review Focus 1: case-insensitive
      check('still four seats', host.run('mpPlayerSlots.length'), 4);
      check('the human sits before the bots; the newest bot stepped aside', uids(host), ['uH', 'u1', 'bot:0', 'bot:1']);
      check('the bot that held her name renamed', names(host), ['Ali', 'sylvia', 'Shirley', 'Sam']);
      ok('nobody is flagged a duplicate', !/Duplicate/.test(JSON.stringify(host.el('mp-lobby-players-list').children.map(c => c.innerHTML))));
      const c2 = await join(host, 'c2', 'u2', 'Bec');      // Review Focus 2: back to back
      check('a second human takes the next bot\'s seat', uids(host), ['uH', 'u1', 'u2', 'bot:0']);
      check('never past the maximum', host.run('mpPlayerSlots.length'), 4);
      c2.run('resetToLobby()'); await flush();
      check('a human leaving keeps the bots', uids(host), ['uH', 'u1', 'bot:0']);
      check('no errors', errorsOf([host, c1, c2]), []);
    }

    section('3. Through the match: bots are seated, stamped, and never Away');
    {
      fresh();
      const host = await hostRoom('Ali');
      const c1 = await join(host, 'c1', 'u1', 'Bec');
      host.run("mpAddBot(); mpBotDifficulty = 'hard';");
      host.run('mpConfirmRoster()'); await flush();
      check('seats include the bot', host.run('mpSeats'), ['uH', 'u1', 'bot:0']);
      check('difficulty stamped on the bot slot', host.run('mpPlayerSlots[2].bot'), { difficulty: 'hard' });
      check('the client learned the bot from GAME_START', uids(c1), ['uH', 'u1', 'bot:0']);
      check('…and labels it', c1.run('mpSeatLabel(2)'), 'Sylvia 🤖');
      advance(10000); await flush();
      check('a bot is never marked Away', host.run('[...mpAwaySeats]'), []);
      const before = JSON.stringify(server.tree);
      host.run("mpSendPrivate('bot:0', { type: 'SYNC', payload: { action: 'X' } })"); await flush();
      check('a private send to a bot writes nothing', JSON.stringify(server.tree), before);
      check('no errors', errorsOf([host, c1]), []);
    }

    section('4. mpBotsPrompt: view now, decide after the think time, submit with the tag');
    {
      fresh();
      const host = await hostRoom('Ali');
      const c1 = await join(host, 'c1', 'u1', 'Bec');
      host.run('mpAddBot(); mpBotSeed = 7;');
      host.run('mpConfirmRoster()'); await flush();
      host.S.__bot.length = 0;
      host.run('mpBotsPrompt(5)');
      check('the view is taken at once', host.S.__bot, ['view:2']);
      advance(1999);
      check('nothing is decided inside the think time', host.S.__bot, ['view:2']);
      advance(1);
      check('then decide and submit, with the tag', host.S.__bot, ['view:2', 'decide:2:medium', 'submit:2:5']);
      host.S.__bot.length = 0;
      host.run('mpBotsPrompt(6, [0, 1, 2])');
      check('only bot seats are prompted', host.S.__bot, ['view:2']);
      host.run('mpBotsPrompt(7)');
      advance(2000);
      check('a re-prompt replaces the pending move', host.S.__bot.filter(x => x.startsWith('submit')), ['submit:2:7']);
      host.run("MP_GAME_CONFIGS.botgame.bots.decide = () => { throw new Error('boom'); }");
      host.S.__bot.length = 0; host.errors.length = 0;
      host.run('mpBotsPrompt(8)'); advance(2000);
      ok('a throwing decide is warned, not thrown', host.errors.some(e => /bots\.decide/.test(e)));
      check('…and that seat submits nothing', host.S.__bot.filter(x => x.startsWith('submit')), []);
      host.errors.length = 0;
      check('no other errors', errorsOf([c1]), []);
    }

    section('5. The timer bag: paused while a seat is Away, cleared on every exit');
    {
      fresh();
      const host = await hostRoom('Ali');
      const c1 = await join(host, 'c1', 'u1', 'Bec');
      host.run("mpAddBot(); MP_GAME_CONFIGS.botgame.bots.thinkMs = () => 5000;");
      host.run('mpConfirmRoster()'); await flush();
      host.S.__bot.length = 0;
      host.run('mpBotsPrompt(1)');
      c1.net.drop();
      advance(3000); await flush();
      check('the client is Away', host.run('[...mpAwaySeats]'), [1]);
      advance(20000);
      check('no bot moved while a seat was Away', host.S.__bot.filter(x => x.startsWith('submit')), []);
      c1.net.heal(); await flush();
      check('the seat is back', host.run('[...mpAwaySeats]'), []);
      advance(1999);
      check('resumed with the REMAINING time, not a fresh wait', host.S.__bot.filter(x => x.startsWith('submit')), []);
      advance(1);
      check('…then the move lands, once', host.S.__bot.filter(x => x.startsWith('submit')), ['submit:2:1']);

      host.run('mpBotsPrompt(2)');
      host.run('mpReturnToLobby()'); await flush();
      advance(10000);
      check('Play Again clears a pending bot move', host.S.__bot.filter(x => x === 'submit:2:2'), []);
      check('…and keeps the bot seated', uids(host), ['uH', 'u1', 'bot:0']);

      host.run('mpConfirmRoster()'); await flush();
      host.run("mpBotDifficulty = 'hard'; mpBotsPrompt(3);");
      host.run('resetToLobby()');                          // Review Focus 3: the host quits mid-match
      advance(10000);
      check('resetToLobby clears a pending bot move', host.S.__bot.filter(x => x === 'submit:2:3'), []);
      check('…removes the bots', host.run('mpPlayerSlots.filter(mpIsBotSlot).length'), 0);
      check('…and resets the difficulty', host.run('mpBotDifficulty'), 'medium');
      check('no errors', errorsOf([host, c1]), []);
    }

    section('5b. A reconnect adopter with a bot: the dropped human rejoins, the bot is never Away');
    {
      fresh();
      const host = await hostRoom('Ali', 'botrc');
      const c1 = await join(host, 'c1', 'u1', 'Bec', 'botrc');
      const code = host.run('mpActiveRoomCode');
      host.run("mpAddBot(); MP_GAME_CONFIGS.botrc.bots.thinkMs = () => 5000;");
      host.run('mpConfirmRoster()'); await flush();
      host.S.__bot.length = 0;
      host.run('mpBotsPrompt(4)');
      c1.net.kill(); advance(3000); await flush();
      check('only the human is Away', host.run('[...mpAwaySeats]'), [1]);
      const back = boot("c1'", 'u1', c1.phone);
      addBotGame(back); useGame(back, 'botrc');
      advance(50);
      back.run(`mpRejoinRoom('${code}')`); await flush();
      check('the human is back in seat 1', back.run('mpMyPlayerIdx'), 1);
      check('nobody is Away', host.run('[...mpAwaySeats]'), []);
      advance(2000);
      check('the bot finishes its paused think time', host.S.__bot.filter(x => x.startsWith('submit')), ['submit:2:4']);
      check('no errors', errorsOf([host, back]), []);
    }

    section('7. The lobby: + Add bot, the chips, the difficulty pills, the hint');
    {
      fresh();
      const host = await hostRoom('Ali');
      host.S.document._l.DOMContentLoaded.forEach(f => f());     // wire the real buttons
      host.run('mpRenderHostPlayerList()');
      check('the bot controls show for a bot game', host.el('mp-lobby-bots').style.display, 'flex');
      check('the hint offers a bot', host.el('mp-lobby-min-hint').textContent,
            'Need 2 more players to start (min 3) — or add a bot');
      check('no difficulty row before a bot', host.el('mp-lobby-bot-difficulty').style.display, 'none');
      host.el('btn-mp-lobby-add-bot').click();
      check('+ Add bot seats one', names(host), ['Ali', 'Sylvia']);
      check('the difficulty row appears', host.el('mp-lobby-bot-difficulty').style.display, 'flex');
      check('Medium is the default pill', host.el('btn-mp-bot-medium').className, 'pill pill-active-test');
      host.el('btn-mp-bot-hard').click();
      check('tap Hard', [host.run('mpBotDifficulty'), host.el('btn-mp-bot-hard').className, host.el('btn-mp-bot-medium').className],
            ['hard', 'pill pill-active-test', 'pill']);
      const chip = host.el('mp-lobby-players-list').children[1];
      ok('the bot chip is tagged BOT and marked', /BOT/.test(chip.innerHTML) && /Sylvia 🤖/.test(chip.innerHTML));
      chip.children[0].click();                                   // the chip's ✕
      check('✕ removes that bot', names(host), ['Ali']);
      check('the difficulty row hides again', host.el('mp-lobby-bot-difficulty').style.display, 'none');
      host.run('mpAddBot(); mpAddBot(); mpAddBot(); mpRenderHostPlayerList();');
      check('+ Add bot dims at the maximum', [host.el('btn-mp-lobby-add-bot').disabled,
            host.el('btn-mp-lobby-add-bot').classList.contains('opacity-50')], [true, true]);
      check('with enough seats the CTA is live', host.el('btn-mp-lobby-host-cta').disabled, false);
      useGame(host, 'plain'); host.run('mpPlayerSlots = mpPlayerSlots.slice(0, 1); mpRenderHostPlayerList();');
      check('a game without bots shows no bot controls', host.el('mp-lobby-bots').style.display, 'none');
      check('…and its hint offers none', host.el('mp-lobby-min-hint').textContent, 'Need 1 more player to start (min 2)');
      check('no errors', errorsOf([host]), []);
    }

    section('6. Solo: a lobby nobody can join, on a null wire');
    {
      fresh();
      const d = boot('solo', 'unused', makePhone());          // Review Focus 4: no saved nickname
      d.run('window.syllyFirebase = null; window.syllyDeviceUid = null;');
      addBotGame(d);
      d.S.document._l.DOMContentLoaded.forEach(f => f());
      d.S.navigator.onLine = false;
      d.run("mpShowModeScreen('botgame')");
      check('offline, Solo is selected', d.run('mpSelectedMode'), 'solo');
      check('…and the notice says Solo still works', d.el('mp-mode-offline-notice').textContent, 'No internet — Solo still works.');
      d.el('btn-mp-mode-cta').click();
      check('Solo lands on the host lobby', d.screens[d.screens.length - 1], 'screen-mp-lobby-host');
      check('the code panel says SOLO', d.el('mp-lobby-host-room-code').textContent, 'SOLO');
      check('the uid is borrowed', d.run('window.syllyDeviceUid'), 'local:host');
      check('pre-filled to the minimum', names(d), ['You', 'Sylvia', 'Sam']);
      check('the start CTA is live', d.el('btn-mp-lobby-host-cta').disabled, false);
      check('the waiting line speaks to Solo', d.el('mp-lobby-host-waiting').textContent, 'Just you and the bots.');
      d.el('mp-lobby-host-room-code').click();              // must not throw (no clipboard in Node) or copy
      d.el('btn-mp-lobby-host-cta').click(); await flush();
      check('the match started on the host path', d.S.__rc, ['onPassThePhone:host']);
      check('seats', d.run('mpSeats'), ['local:host', 'bot:0', 'bot:1']);
      check('Firebase was never loaded', d.run('window.syllyFirebase'), null);
      check('nothing reached the server', server.tree, {});
      d.run('mpBotsPrompt(1)'); advance(2000);
      check('bots play in Solo', d.S.__bot.filter(x => x.startsWith('submit')), ['submit:1:1', 'submit:2:1']);
      d.run('mpReturnToLobby()'); await flush();
      check('Play Again goes back to the Solo lobby', [d.screens[d.screens.length - 1], d.el('mp-lobby-host-room-code').textContent],
            ['screen-mp-lobby-host', 'SOLO']);
      check('…with the bots still seated', d.run('mpPlayerSlots.length'), 3);
      d.run('resetToLobby()');
      check('resetToLobby hands the uid back', d.run('window.syllyDeviceUid'), null);
      check('…and leaves Solo', [d.run('mpSolo'), d.run('mpPlayerSlots.length')], [false, 0]);
      d.S.navigator.onLine = true;
      d.run("mpShowModeScreen('botgame'); mpSetModeSelection('solo', null);");
      d.el('btn-mp-mode-cta').click();
      d.el('btn-mp-lobby-host-cancel').click(); await flush();
      check('← Cancel from the Solo lobby leaves Solo', [d.run('mpSolo'), d.run('window.syllyDeviceUid')], [false, null]);
      check('no errors', errorsOf([d]), []);
    }

    section('6b. An abandoned Firebase load never reaches Solo (final review, Important #1)');
    {
      fresh();
      const d = boot('late', 'unused', makePhone());
      const fb = d.run('window.syllyFirebase');
      d.run('window.syllyFirebase = null; window.syllyDeviceUid = null;');
      addBotGame(d);
      d.S.document._l.DOMContentLoaded.forEach(f => f());
      const ready = () => (d.S.document._l['sylly-firebase-ready'] || []).slice().forEach(f => f());

      d.S.__late = 0;
      d.run('syllyLoadFirebase(() => { __late++; })');
      advance(12000);                                        // the give-up fires
      d.S.window.syllyFirebase = fb; ready();
      check('a load that gave up never runs its callback', d.S.__late, 0);

      d.run('window.syllyFirebase = null;');
      useGame(d, 'botgame');
      d.run('mpHostCreateRoom()');                           // Host → Generate, then the network stalls
      d.run('mpEnterSolo()');                                // …and the player picks Solo instead
      d.S.window.syllyFirebase = fb; d.run("window.syllyDeviceUid = 'uReal'"); ready();   // sign-in lands late
      await flush();
      check('Solo is not taken over by the late room', [d.run('mpSolo'), d.run('mpActiveRoomCode'), d.run('mpPlayerSlots.length')],
            [true, null, 3]);
      check('…and the lobby still reads SOLO', d.el('mp-lobby-host-room-code').textContent, 'SOLO');
      d.run('resetToLobby()');
      check('leaving Solo keeps a REAL uid the late sign-in wrote', d.run('window.syllyDeviceUid'), 'uReal');
      check('no errors', errorsOf([d]), []);
    }

    // ── Later tasks add sections here, above this line ──

  } catch (e) {
    W.tally.failures++; W.tally.total++;
    console.log('\n  FAIL  the run could not finish');
    console.log('          ' + String(e && e.stack || e).split('\n').slice(0, 4).join('\n          '));
  }
  W.report();
})();
