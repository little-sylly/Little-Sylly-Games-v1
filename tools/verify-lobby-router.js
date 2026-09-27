// verify-lobby-router.js — the lobby's pure tier: the router (js/lobby/lobby-router.js)
// and the door map (js/lobby/lobby-doors.js). Zero dependencies, no DOM stubbing —
// lounge-scene.js requires cleanly under plain Node (its window assignment is guarded).
// Run: node tools/verify-lobby-router.js
const { GAMES } = require('../js/lobby/lobby-games.js');
const R = require('../js/lobby/lobby-router.js');
const LouScene = require('../js/lounge/lounge-scene.js');
const H = require('../js/lobby/lobby-doors.js');

let pass = 0, fail = 0, current = '';
const section = (name) => { current = name; console.log('── ' + name + ' ──'); };
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log('  FAIL [' + current + '] ' + msg); } };
const eq = (a, b, msg) => ok(a === b, `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);

const start = (patch) => Object.assign({}, R.LOBBY_INIT, patch || {});

section('shape');
eq(R.LOBBY_INIT.view, 'lounge', 'the shell opens on Premium');
eq(R.LOBBY_INIT.room, 'absent', 'nothing is built yet');
eq(R.LOBBY_INIT.workshop, false, 'the Workshop is shut');
eq(R.LOBBY_INIT.stickerbook, false, 'the stickerbook is shut');
eq(R.LOBBY_INIT.jukebox, false, 'the jukebox is shut');
eq(R.LOBBY_INIT.switcher, false, 'the dock is hidden on Premium (W6)');
eq(R.LOBBY_INIT.design, null, 'no design has been read');
eq(R.LOBBY_INIT.arrival, 'none', 'no arrival beat has played');
ok(GAMES.some(g => g.id === R.LOBBY_INIT.tvSel), `the default tvSel "${R.LOBBY_INIT.tvSel}" is a real game id`);
eq(R.LOBBY_VIEWS.length, 4, 'four views');
R.LOBBY_VIEWS.forEach(v => ok(typeof v === 'string', `view "${v}" is a string`));

section('purity');
{
  const before = start();
  const snapshot = JSON.stringify(before);
  const after = R.lobbyReduce(before, { t: 'enterTV', gameId: 'cjar' });
  eq(JSON.stringify(before), snapshot, 'lobbyReduce does not mutate the state it is given');
  ok(after !== before, 'lobbyReduce returns a new object');
  eq(R.lobbyReduce(before, { t: 'nonsense' }), before, 'an unknown action returns the same reference');
  eq(R.lobbyReduce(before, null), before, 'a null action returns the same reference');
  eq(R.lobbyReduce(before, { t: 'go', view: 'nowhere' }), before, 'a go to an unknown view is refused');
}

section('claim 1 — the return path (production: close to where you opened)');
// The sandbox only ever opened the Workshop from the lounge, so "close" meant
// "the lounge". Production opens it from four places — every ornament and the
// lounge's prop — and each one expects its own layout back (spec § 4.1).
R.LOBBY_VIEWS.forEach(v => {
  const s = R.lobbyReduce(start({ view: v, room: 'idle', workshop: true }), { t: 'workshopClose' });
  eq(s.view, v, `workshopClose from "${v}" lands back on "${v}"`);
  eq(s.workshop, false, `workshopClose from "${v}" clears the workshop flag`);
  eq(s.switcher, false, `workshopClose from "${v}" re-hides the dock`);
  eq(s.room, v === 'lounge' ? 'running' : 'idle', `workshopClose from "${v}" runs the room only if it is the lounge`);
});
eq(R.lobbyReduce(start({ workshop: true, room: 'absent' }), { t: 'workshopClose' }).room, 'absent',
   'workshopClose does not claim a room that was never built');

section('claim 2 — the design round-trip');
{
  const d1 = { shell: '#FFE500', plate: '#5C3A21', ears: '#E879A8', buttons: '#10B981' };
  const a = R.lobbyReduce(start(), { t: 'designSaved', design: d1 });
  eq(a.design, d1, 'designSaved stores the design');
  const b = R.lobbyReduce(a, { t: 'designSaved', design: d1 });
  eq(b.design, d1, 'a second identical designSaved leaves the same design');
  eq(b, a, 'and returns the SAME state object — one change to apply, not two');
  const c = R.lobbyReduce(a, { t: 'designSaved', design: { shell: '#8ECAE6' } });
  ok(c !== a && c.design.shell === '#8ECAE6', 'a different design is a new state');
  // The pure tier asserts the state change only. That the room actually
  // repaints is visual-shell.js's job — api.setDesign lives behind a WebGL
  // context no Node harness has.
}

section('claim 3 — the lifecycle (W5)');
{
  const mounted = start({ room: 'running' });
  const leaving = [
    { t: 'go', view: 'tv' }, { t: 'go', view: 'shelves' }, { t: 'go', view: 'original' },
    { t: 'enterTV', gameId: 'cjar' }, { t: 'enterShelves' }, { t: 'workshopOpen' },
  ];
  leaving.forEach(a => {
    const s = R.lobbyReduce(mounted, a);
    eq(s.room, 'idle', `${a.t}${a.view ? ':' + a.view : ''} stops the room, it never disposes it`);
  });
  eq(R.lobbyReduce(mounted, { t: 'leaveLobby' }).room, 'absent', 'only leaveLobby disposes');
  // Nothing may invent a room that was never built.
  const cold = start({ room: 'absent' });
  [{ t: 'go', view: 'tv' }, { t: 'enterTV' }, { t: 'enterShelves' }, { t: 'workshopOpen' }].forEach(a => {
    eq(R.lobbyReduce(cold, a).room, 'absent', `${a.t} from absent stays absent — there is nothing to stop yet`);
  });
  eq(R.lobbyReduce(cold, { t: 'go', view: 'lounge' }).room, 'running',
     'a go to premium asks for a running room; the page mounts it');
  eq(R.lobbyReduce(start({ room: 'idle' }), { t: 'go', view: 'lounge' }).room, 'running', 'returning to premium restarts it');
  eq(R.lobbyReduce(start({ room: 'idle' }), { t: 'roomMounted' }).room, 'running', 'roomMounted confirms the fact');
}

section('views and the seeded telly');
{
  const s = R.lobbyReduce(start({ tvSel: 'ss' }), { t: 'enterTV' });
  eq(s.view, 'tv', 'enterTV enters the TV layout');
  eq(s.tvSel, 'ss', 'enterTV with no gameId keeps the previous selection — the telly screen is a door, not a picker');
  eq(R.lobbyReduce(start({ tvSel: 'ss' }), { t: 'enterTV', gameId: null }).tvSel, 'ss', 'an explicit null keeps it too');
  eq(R.lobbyReduce(start({ tvSel: 'ss' }), { t: 'enterTV', gameId: 'comb' }).tvSel, 'comb', 'the dial seeds it');
  GAMES.forEach(g => eq(R.lobbyReduce(start(), { t: 'enterTV', gameId: g.id }).tvSel, g.id,
                        `every id the dial can produce is routable (${g.id})`));
  eq(R.lobbyReduce(start(), { t: 'enterShelves' }).view, 'shelves', 'enterShelves enters the phone layout');
}

section('the dock (W6)');
{
  /* The dock is SUMMONED, never automatic. It was shown in every non-Premium
     view, which put a second layout switcher on screen in all three of them —
     Shelves and Original already carry lobby.js's in-phone `.lb-switch`, TV
     carries the Lounge's own mode buttons, and each offers all four views. Off
     Premium the dock was therefore always a duplicate, and in TV it sat under
     the rail. Premium is the one layout with no switcher of its own, by design
     — it is a room, not a menu — so that is the one place a summon is for. */
  R.LOBBY_VIEWS.forEach(v => {
    const s = R.lobbyReduce(start({ switcher: true }), { t: 'go', view: v });
    eq(s.switcher, false, `arriving in the ${v} view does not raise a second switcher`);
  });
  eq(R.lobbyReduce(start(), { t: 'openSwitcher' }).switcher, true,
     "the telly's channel dial is the only way to see the dock while on Premium");
  eq(R.lobbyReduce(start(), { t: 'openSwitcher' }).view, 'lounge', 'and summoning it does not leave the room');
  eq(R.lobbyReduce(start({ switcher: true }), { t: 'enterTV' }).switcher, false, 'a door out of the room hands over to that layout\'s own switcher');
  eq(R.lobbyReduce(start(), { t: 'enterShelves' }).switcher, false, 'both doors do');
}

section('claim 4 — the one-way arrival (Scene B)');
{
  /* Owner, 21–22 Sep 2026: a phone can never STAY in the lounge. It is shown
     the room, panned to the clamshell and handed to the Shelves — one way,
     no portrait HUD, no path back. There are exactly TWO outcomes for any
     device: the interactive lounge, or the Shelves. */

  // Starting it is idempotent, so a resize-driven re-apply cannot start a second.
  const playing = R.lobbyReduce(start({ room: 'running' }), { t: 'arrivalBegin' });
  eq(playing.arrival, 'playing', 'arrivalBegin starts the beat');
  eq(R.lobbyReduce(playing, { t: 'arrivalBegin' }), playing, 'a second arrivalBegin while playing is the same state');

  // The beat IS the clamshell door, taken automatically — no action of its own.
  const done = R.lobbyReduce(playing, { t: 'enterShelves' });
  eq(done.arrival, 'done', 'the beat ends by taking the phone door');
  eq(done.view, 'shelves', 'and lands in the Shelves');
  eq(done.room, 'idle', 'stopping the room on the way, never disposing it');
  eq(R.lobbyReduce(done, { t: 'arrivalBegin' }), done, 'and it cannot be replayed');

  // Widescreen: the same door, with no beat in progress, must not invent one.
  eq(R.lobbyReduce(start({ room: 'running' }), { t: 'enterShelves' }).arrival, 'none',
     'the clamshell door on a widescreen leaves arrival untouched');

  // ONE-WAY. This is the whole rule, and it is a refusal, not a hidden button:
  // lobby.js's in-phone switcher renders Premium unconditionally.
  eq(R.lobbyReduce(done, { t: 'go', view: 'lounge' }), done,
     'once handed out, a go to premium is REFUSED — same state, not a new one');
  eq(R.lobbyReduce(done, { t: 'workshopClose' }).view, 'shelves',
     'and even workshopClose cannot smuggle a device back into the lounge');
  ok(R.lobbyReduce(done, { t: 'workshopClose' }).room !== 'running',
     'nor restart a room it is not allowed to be in');
  ['tv', 'shelves', 'original'].forEach(v => {
    eq(R.lobbyReduce(done, { t: 'go', view: v }).view, v, `but the ${v} layout is still reachable — only the lounge is closed`);
  });

  // The tier can change under us: a window grown past the floor gets the real
  // lounge back, because the page disposes the lean room that has no controller.
  const reset = R.lobbyReduce(done, { t: 'arrivalReset' });
  eq(reset.arrival, 'none', 'arrivalReset clears the beat when the tier changes');
  eq(R.lobbyReduce(reset, { t: 'go', view: 'lounge' }).view, 'lounge', 'and the lounge is offered again');
  const fresh = start();
  eq(R.lobbyReduce(fresh, { t: 'arrivalReset' }), fresh, 'arrivalReset from none is a no-op');

  // The two outcomes, as a table. louEligible is outcome 1; everything else is
  // outcome 2, and louCanArrive only says whether it arrives with the beat.
  const tier = (w, h, gl, data) =>
    LouScene.louEligible(w, h, gl, data) ? 'lounge' : (LouScene.louCanArrive(gl, data) ? 'beat' : 'quiet');
  eq(tier(1280, 720, true, false), 'lounge', 'widescreen with a context: the interactive lounge');
  eq(tier(390, 844, true, false), 'beat', 'a portrait phone with a context: the arrival beat');
  eq(tier(1280, 400, true, false), 'beat', 'a short landscape window too — the floor is size, not device');
  eq(tier(390, 844, false, false), 'quiet', 'no WebGL: the Shelves, without the journey');
  eq(tier(1280, 720, true, true), 'quiet', 'prefers-reduced-data: the same, at any size');
  /* Three code paths, two outcomes. The beat path and the quiet path differ
     only in whether anything was animated on the way — they must not differ
     in where the player ends up, or the owner's "only two options" is a lie
     the state machine tells. */
  const viaBeat  = R.lobbyReduce(R.lobbyReduce(start({ room: 'running' }), { t: 'arrivalBegin' }), { t: 'enterShelves' });
  const viaQuiet = R.lobbyReduce(R.lobbyReduce(start({ room: 'absent' }),  { t: 'arrivalBegin' }), { t: 'enterShelves' });
  eq(viaBeat.view, 'shelves', 'the path WITH a beat ends in the Shelves');
  eq(viaQuiet.view, 'shelves', 'and so does the path with nothing to play it with');
  eq(viaBeat.arrival, viaQuiet.arrival, 'both are equally one-way afterwards');
  eq(viaQuiet.room, 'absent', 'and the quiet path never claims a room it could not build');

  // The beat's budget. It is a blocking choreography beat, so it is allowed
  // past the 300 ms ceiling — but not past the point of being a wait.
  ok(LouScene.louArriveMs(false) <= 2500, `the beat is ${LouScene.louArriveMs(false)} ms — a beat, not a wait`);
  ok(LouScene.louArriveMs(true) < LouScene.louArriveMs(false), 'reduced motion skips the journey, so it is shorter');
  ok(LouScene.louArriveMs(true) >= 500, 'but still long enough to read the room it is showing you');
}

section('the stickerbook (binder door, 23 Sep 2026)');
{
  const lounge = start({ room: 'running' });
  const open = R.lobbyReduce(lounge, { t: 'stickerbookOpen' });
  eq(open.stickerbook, true, 'the binder door opens the stickerbook');
  eq(open.room, 'idle', 'the room is kept but stopped while it is up (the Workshop precedent)');
  eq(open.view, 'lounge', 'the view does not change under it');
  eq(R.lobbyReduce(open, { t: 'stickerbookOpen' }), open, 'opening it again changes nothing');
  const shut = R.lobbyReduce(open, { t: 'stickerbookClose' });
  eq(shut.stickerbook, false, 'close shuts it');
  eq(shut.view, 'lounge', 'and the way out is the lounge');
  eq(shut.room, 'running', 'running again');
  eq(R.lobbyReduce(lounge, { t: 'stickerbookClose' }), lounge, 'closing a shut book changes nothing');
  const oneWay = R.lobbyReduce(start({ room: 'running', arrival: 'done', view: 'shelves' }), { t: 'stickerbookOpen' });
  const out = R.lobbyReduce(oneWay, { t: 'stickerbookClose' });
  eq(out.view, 'shelves', 'a device the lounge is closed to leaves to the Shelves');
  eq(out.room, 'idle', 'with the room still stopped');
  const absent = R.lobbyReduce(R.lobbyReduce(start(), { t: 'stickerbookOpen' }), { t: 'stickerbookClose' });
  eq(absent.room, 'absent', 'a room never built stays unbuilt');
}

section("the jukebox (the cat's door, SW v233)");
{
  const lounge = start({ room: 'running' });
  const open = R.lobbyReduce(lounge, { t: 'jukeboxOpen' });
  eq(open.jukebox, true, 'the cat opens the jukebox');
  eq(open.room, 'idle', 'the room is kept but stopped while it is up — two scenes never render at once');
  eq(open.view, 'lounge', 'the view does not change under it');
  eq(R.lobbyReduce(open, { t: 'jukeboxOpen' }), open, 'opening it again changes nothing');
  const shut = R.lobbyReduce(open, { t: 'jukeboxClose' });
  eq(shut.jukebox, false, '✕ shuts it');
  eq(shut.view, 'lounge', 'and the way out is the Lounge');
  eq(shut.room, 'running', 'running again');
  eq(R.lobbyReduce(lounge, { t: 'jukeboxClose' }), lounge, 'closing a shut jukebox changes nothing');
  const handed = R.lobbyReduce(start({ room: 'running', arrival: 'done', view: 'lounge' }), { t: 'jukeboxOpen' });
  eq(R.lobbyReduce(handed, { t: 'jukeboxClose' }).view, 'shelves', 'a device the Lounge is closed to leaves to the Shelves');
  eq(R.lobbyReduce(R.lobbyReduce(start(), { t: 'jukeboxOpen' }), { t: 'jukeboxClose' }).room, 'absent', 'a room never built stays unbuilt');
  ok(R.LOBBY_PAGE_ACTIONS.includes('jukeboxClose'), "jukeboxClose is the page's own action (the screen's ✕)");
}

section("the places row — the rooms' doors outside the Lounge (SW v238)");
{
  ok(R.LOBBY_PAGE_ACTIONS.includes('jukeboxOpen') && R.LOBBY_PAGE_ACTIONS.includes('stickerbookOpen'),
     "both opens are the page's own actions too (Shelves' and Classic's places row)");
  // Opened from a menu layout, each closes back to THAT layout — never the Lounge,
  // on a device that still could go there and on one handed out of it.
  for (const view of ['shelves', 'original']) {
    for (const arrival of ['none', 'done']) {
      for (const [o, c] of [['jukeboxOpen', 'jukeboxClose'], ['stickerbookOpen', 'stickerbookClose']]) {
        const from = start({ room: 'idle', view, arrival });
        const open = R.lobbyReduce(from, { t: o });
        eq(open.view, view, `${o} from ${view} (arrival ${arrival}) leaves the view alone`);
        eq(open.room, 'idle', `  and the stopped room stays stopped`);
        const shut = R.lobbyReduce(open, { t: c });
        eq(shut.view, view, `${c} returns to ${view}`);
        eq(shut.room, 'idle', `  without waking the room behind it`);
      }
    }
  }
}

section('the door map');
{
  const seen = [];
  const deps = {
    games: GAMES, stickers: { base: 'x/', list: [] }, design: { shell: '#a97fd6' },
    lampPanels: { base: 'y/', manifest: {} }, music: { keys: [], nowPlaying: () => null, playFor() {} },
    dispatch: (a) => seen.push(a),
    openSound: () => seen.push({ t: '@openSound' }),
  };
  const host = H.lobbyCreateHost(deps);

  ok(LouScene.louValidateHost(host) === true, 'the shell host satisfies louValidateHost');
  LouScene.LOU_REQUIRED.forEach(k => ok(host[k] !== undefined, `host supplies the required key "${k}"`));
  eq(typeof host.openJukebox, 'function', 'host supplies openJukebox — the cat is a real door now (SW v233)');
  eq(typeof host.openStickerbook, 'function', 'host supplies openStickerbook — the binder is a real door now');

  // Every callable the room can reach has exactly one destination, and the
  // destination table covers exactly the callables — no orphans either way.
  LouScene.LOU_FUNCS.forEach(k => ok(k in H.LOBBY_DOORS, `LOU_FUNCS name "${k}" has a destination`));
  Object.keys(H.LOBBY_DOORS).forEach(k => ok(LouScene.LOU_FUNCS.indexOf(k) !== -1 || LouScene.LOU_OPTIONAL_FUNCS.indexOf(k) !== -1, `door "${k}" is a real LOU_FUNCS or optional name`));

  // Each door actually dispatches the action the table promises.
  Object.entries(H.LOBBY_DOORS).forEach(([fn, action]) => {
    seen.length = 0;
    host[fn]();
    eq(seen.length, 1, `${fn}() produces exactly one effect`);
    eq(seen[0].t, action || '@openSound', `${fn}() ${action ? 'dispatches ' + action : 'calls the injected openSound effect'}`);
  });

  // No router action is unreachable: every one is either a door's destination
  // or on the page's own list.
  const reachable = new Set(Object.values(H.LOBBY_DOORS).filter(Boolean).concat(R.LOBBY_PAGE_ACTIONS));
  ['go', 'enterTV', 'enterShelves', 'openSwitcher', 'roomMounted', 'workshopOpen', 'workshopClose', 'designSaved', 'leaveLobby',
   'arrivalBegin', 'arrivalReset', 'stickerbookOpen', 'stickerbookClose', 'jukeboxOpen', 'jukeboxClose', 'home', 'closeSwitcher']
    .forEach(t => ok(reachable.has(t), `router action "${t}" is reachable`));

  // The dial's game id rides through untouched; the telly screen sends nothing.
  seen.length = 0; host.enterTV('comb');
  eq(seen[0].gameId, 'comb', 'the dial hands its game id to the router');
  seen.length = 0; host.enterTV();
  eq(seen[0].gameId, null, 'the telly screen hands null, which keeps the previous pick');

  // Refuse to build a host that cannot reach anything.
  let threw = 0;
  try { H.lobbyCreateHost(Object.assign({}, deps, { dispatch: null })); } catch (_) { threw++; }
  try { H.lobbyCreateHost(Object.assign({}, deps, { openSound: null })); } catch (_) { threw++; }
  eq(threw, 2, 'a host with no dispatch or no openSound is refused at build time');

  // Optional passthroughs are absent unless asked for, so louMount's own
  // defaults (real prefers-reduced-motion, Math.random) stay in charge.
  eq(host.reducedMotion, undefined, 'reducedMotion is absent unless supplied');
  eq(host.rand, undefined, 'rand is absent unless supplied');
  const seeded = H.lobbyCreateHost(Object.assign({}, deps, { reducedMotion: true, rand: () => 0.5 }));
  eq(seeded.reducedMotion, true, 'reducedMotion passes through when supplied');
  eq(typeof seeded.rand, 'function', 'rand passes through when supplied');
}

section('production — LOBBY_LAYOUTS');
eq(R.LOBBY_LAYOUTS.map(l => l.id).join(','), 'lounge,shelves,tv,original', 'four layouts, in switcher order');
eq(R.LOBBY_LAYOUTS.find(l => l.id === 'original').screen, 'screen-lobby', 'Original IS the shipped screen-lobby');
eq(R.LOBBY_LAYOUTS.find(l => l.id === 'lounge').label, 'Lounge', 'the room is called the Lounge');
eq(R.LOBBY_LAYOUTS.every(l => typeof l.label === 'string' && l.label && l.ico && /^screen-/.test(l.screen)), true,
   'every layout has a label, an icon and a screen');
eq([...R.LOBBY_VIEWS].sort().join(), R.LOBBY_LAYOUTS.map(l => l.id).sort().join(), 'LOBBY_VIEWS and LOBBY_LAYOUTS name the same four');
eq(R.LOBBY_INIT.view, 'lounge', 'the lobby opens on the Lounge');

section('production — home (every exit from outside the lobby)');
R.LOBBY_VIEWS.forEach(v => {
  const s = R.lobbyReduce(start({ view: v, room: v === 'lounge' ? 'idle' : 'idle', workshop: true, stickerbook: true, jukebox: true, switcher: true }), { t: 'home' });
  eq(s.view, v, `home from a game launched in "${v}" lands on "${v}"`);
  eq(s.workshop || s.stickerbook || s.jukebox || s.switcher, false, `home from "${v}" closes the Workshop, the book, the jukebox and the dock`);
});
{
  const out = R.lobbyReduce(start({ view: 'lounge', arrival: 'done', room: 'idle' }), { t: 'home' });
  eq(out.view, 'shelves', 'home never lands a handed-out device in the Lounge');
  eq(out.room, 'idle', 'and leaves its room stopped');
  eq(R.lobbyReduce(start({ view: 'lounge', room: 'idle' }), { t: 'home' }).room, 'running', 'home into the Lounge restarts the room');
  eq(R.lobbyReduce(start({ view: 'tv', room: 'idle' }), { t: 'home' }).room, 'idle', 'home into TV leaves the room stopped');
  eq(R.lobbyReduce(start({ view: 'lounge', room: 'absent' }), { t: 'home' }).room, 'absent', 'home does not claim a room that was never built');
}

section('production — closeSwitcher and the one-way rule on every close');
{
  const up = R.lobbyReduce(start(), { t: 'openSwitcher' });
  const down = R.lobbyReduce(up, { t: 'closeSwitcher' });
  eq(down.switcher, false, 'closeSwitcher shuts the dock');
  eq(down.view, up.view, 'and changes nothing else');
  const shut = start();
  eq(R.lobbyReduce(shut, { t: 'closeSwitcher' }), shut, 'closing a shut dock is a no-op');
  const handed = start({ view: 'lounge', arrival: 'done', room: 'idle' });
  eq(R.lobbyReduce(Object.assign({}, handed, { workshop: true }), { t: 'workshopClose' }).view, 'shelves',
     'workshopClose cannot put a handed-out device back in the Lounge');
  eq(R.lobbyReduce(Object.assign({}, handed, { stickerbook: true }), { t: 'stickerbookClose' }).view, 'shelves',
     'nor can stickerbookClose');
  eq(R.lobbyReduce(Object.assign({}, handed, { jukebox: true }), { t: 'jukeboxClose' }).view, 'shelves',
     'nor can jukeboxClose');
  eq(R.lobbyReduce(handed, { t: 'go', view: 'lounge' }), handed, 'nor a switcher pick');
}

section('production — the doors pass the controller parts through');
{
  const noop = () => {};
  const base = { dispatch: noop, openSound: noop, games: GAMES, stickers: {}, design: {}, lampPanels: {}, music: {} };
  eq(H.lobbyCreateHost(base).controllerParts, undefined, 'absent unless supplied');
  const parts = () => null;
  eq(H.lobbyCreateHost(Object.assign({}, base, { controllerParts: parts })).controllerParts, parts, 'passed through when supplied');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
