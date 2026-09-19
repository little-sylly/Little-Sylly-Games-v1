// verify-shell.js — the pure tier of the shell (wip/lobby-lab/shell.html): the
// router and the door map. Zero dependencies, no DOM stubbing — prm-scene.js
// requires cleanly under plain Node (its window assignment is guarded).
// Run: node wip/lobby-lab/verify-shell.js
const { GAMES } = require('./games.js');
const R = require('./shell-router.js');
const PrmScene = require('../premium/prm-scene.js');
const H = require('./shell-host.js');

let pass = 0, fail = 0, current = '';
const section = (name) => { current = name; console.log('── ' + name + ' ──'); };
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log('  FAIL [' + current + '] ' + msg); } };
const eq = (a, b, msg) => ok(a === b, `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);

const start = (patch) => Object.assign({}, R.SHELL_INIT, patch || {});

section('shape');
eq(R.SHELL_INIT.view, 'premium', 'the shell opens on Premium');
eq(R.SHELL_INIT.room, 'absent', 'nothing is built yet');
eq(R.SHELL_INIT.workshop, false, 'the Workshop is shut');
eq(R.SHELL_INIT.switcher, false, 'the dock is hidden on Premium (W6)');
eq(R.SHELL_INIT.design, null, 'no design has been read');
eq(R.SHELL_INIT.live, false, '?live is off by default');
ok(GAMES.some(g => g.id === R.SHELL_INIT.tvSel), `the default tvSel "${R.SHELL_INIT.tvSel}" is a real game id`);
eq(R.SHELL_VIEWS.length, 4, 'four views');
R.SHELL_VIEWS.forEach(v => ok(typeof v === 'string', `view "${v}" is a string`));

section('purity');
{
  const before = start();
  const snapshot = JSON.stringify(before);
  const after = R.shellReduce(before, { t: 'enterTV', gameId: 'cjar' });
  eq(JSON.stringify(before), snapshot, 'shellReduce does not mutate the state it is given');
  ok(after !== before, 'shellReduce returns a new object');
  eq(R.shellReduce(before, { t: 'nonsense' }), before, 'an unknown action returns the same reference');
  eq(R.shellReduce(before, null), before, 'a null action returns the same reference');
  eq(R.shellReduce(before, { t: 'go', view: 'nowhere' }), before, 'a go to an unknown view is refused');
}

section('claim 1 — the return path');
// Spec § 1.1.1: ctlCloseWorkshop hardcodes showScreen('screen-lobby'). The
// shell's way out of the Workshop is the lounge, from wherever you started.
R.SHELL_VIEWS.forEach(v => {
  const s = R.shellReduce(start({ view: v, room: 'idle', workshop: true }), { t: 'workshopClose' });
  eq(s.view, 'premium', `workshopClose from "${v}" lands on premium, never lobby or shelves`);
  eq(s.workshop, false, `workshopClose from "${v}" clears the workshop flag`);
  eq(s.switcher, false, `workshopClose from "${v}" re-hides the dock`);
  eq(s.room, 'running', `workshopClose from "${v}" restarts the room`);
});
eq(R.shellReduce(start({ workshop: true, room: 'absent' }), { t: 'workshopClose' }).room, 'absent',
   'workshopClose does not claim a room that was never built');

section('claim 2 — the design round-trip');
{
  const d1 = { shell: '#FFE500', plate: '#5C3A21', ears: '#E879A8', buttons: '#10B981' };
  const a = R.shellReduce(start(), { t: 'designSaved', design: d1 });
  eq(a.design, d1, 'designSaved stores the design');
  const b = R.shellReduce(a, { t: 'designSaved', design: d1 });
  eq(b.design, d1, 'a second identical designSaved leaves the same design');
  eq(b, a, 'and returns the SAME state object — one change to apply, not two');
  const c = R.shellReduce(a, { t: 'designSaved', design: { shell: '#8ECAE6' } });
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
    const s = R.shellReduce(mounted, a);
    eq(s.room, 'idle', `${a.t}${a.view ? ':' + a.view : ''} stops the room, it never disposes it`);
  });
  eq(R.shellReduce(mounted, { t: 'leaveShell' }).room, 'absent', 'only leaveShell disposes');
  // Nothing may invent a room that was never built.
  const cold = start({ room: 'absent' });
  [{ t: 'go', view: 'tv' }, { t: 'enterTV' }, { t: 'enterShelves' }, { t: 'workshopOpen' }].forEach(a => {
    eq(R.shellReduce(cold, a).room, 'absent', `${a.t} from absent stays absent — there is nothing to stop yet`);
  });
  eq(R.shellReduce(cold, { t: 'go', view: 'premium' }).room, 'running',
     'a go to premium asks for a running room; the page mounts it');
  eq(R.shellReduce(start({ room: 'idle' }), { t: 'go', view: 'premium' }).room, 'running', 'returning to premium restarts it');
  eq(R.shellReduce(start({ room: 'idle' }), { t: 'roomMounted' }).room, 'running', 'roomMounted confirms the fact');
}

section('views and the seeded telly');
{
  const s = R.shellReduce(start({ tvSel: 'ss' }), { t: 'enterTV' });
  eq(s.view, 'tv', 'enterTV enters the TV layout');
  eq(s.tvSel, 'ss', 'enterTV with no gameId keeps the previous selection — the telly screen is a door, not a picker');
  eq(R.shellReduce(start({ tvSel: 'ss' }), { t: 'enterTV', gameId: null }).tvSel, 'ss', 'an explicit null keeps it too');
  eq(R.shellReduce(start({ tvSel: 'ss' }), { t: 'enterTV', gameId: 'comb' }).tvSel, 'comb', 'the dial seeds it');
  GAMES.forEach(g => eq(R.shellReduce(start(), { t: 'enterTV', gameId: g.id }).tvSel, g.id,
                        `every id the dial can produce is routable (${g.id})`));
  eq(R.shellReduce(start(), { t: 'enterShelves' }).view, 'shelves', 'enterShelves enters the phone layout');
}

section('the dock (W6)');
{
  R.SHELL_VIEWS.forEach(v => {
    const s = R.shellReduce(start({ switcher: true }), { t: 'go', view: v });
    eq(s.switcher, v !== 'premium', `the dock is ${v === 'premium' ? 'hidden' : 'shown'} in the ${v} view`);
  });
  eq(R.shellReduce(start(), { t: 'openSwitcher' }).switcher, true,
     "the telly's channel dial is the only way to see the dock while on Premium");
  eq(R.shellReduce(start(), { t: 'openSwitcher' }).view, 'premium', 'and summoning it does not leave the room');
  eq(R.shellReduce(start({ switcher: true }), { t: 'enterTV' }).switcher, true, 'a door out of the room shows the dock');
  eq(R.shellReduce(start(), { t: 'enterShelves' }).switcher, true, 'both doors do');
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
  const host = H.shellCreateHost(deps);

  ok(PrmScene.prmValidateHost(host) === true, 'the shell host satisfies prmValidateHost');
  PrmScene.PRM_REQUIRED.forEach(k => ok(host[k] !== undefined, `host supplies the required key "${k}"`));
  PrmScene.PRM_OPTIONAL_FUNCS.forEach(k => eq(host[k], undefined, `host supplies no ${k} — the door stays dormant`));

  // Every callable the room can reach has exactly one destination, and the
  // destination table covers exactly the callables — no orphans either way.
  PrmScene.PRM_FUNCS.forEach(k => ok(k in H.SHELL_DOORS, `PRM_FUNCS name "${k}" has a destination`));
  Object.keys(H.SHELL_DOORS).forEach(k => ok(PrmScene.PRM_FUNCS.indexOf(k) !== -1, `door "${k}" is a real PRM_FUNCS name`));

  // Each door actually dispatches the action the table promises.
  Object.entries(H.SHELL_DOORS).forEach(([fn, action]) => {
    seen.length = 0;
    host[fn]();
    eq(seen.length, 1, `${fn}() produces exactly one effect`);
    eq(seen[0].t, action || '@openSound', `${fn}() ${action ? 'dispatches ' + action : 'calls the injected openSound effect'}`);
  });

  // No router action is unreachable: every one is either a door's destination
  // or on the page's own list.
  const reachable = new Set(Object.values(H.SHELL_DOORS).filter(Boolean).concat(R.SHELL_PAGE_ACTIONS));
  ['go', 'enterTV', 'enterShelves', 'openSwitcher', 'roomMounted', 'workshopOpen', 'workshopClose', 'designSaved', 'leaveShell']
    .forEach(t => ok(reachable.has(t), `router action "${t}" is reachable`));

  // The dial's game id rides through untouched; the telly screen sends nothing.
  seen.length = 0; host.enterTV('comb');
  eq(seen[0].gameId, 'comb', 'the dial hands its game id to the router');
  seen.length = 0; host.enterTV();
  eq(seen[0].gameId, null, 'the telly screen hands null, which keeps the previous pick');

  // Refuse to build a host that cannot reach anything.
  let threw = 0;
  try { H.shellCreateHost(Object.assign({}, deps, { dispatch: null })); } catch (_) { threw++; }
  try { H.shellCreateHost(Object.assign({}, deps, { openSound: null })); } catch (_) { threw++; }
  eq(threw, 2, 'a host with no dispatch or no openSound is refused at build time');

  // Optional passthroughs are absent unless asked for, so prmMount's own
  // defaults (real prefers-reduced-motion, Math.random) stay in charge.
  eq(host.reducedMotion, undefined, 'reducedMotion is absent unless supplied');
  eq(host.rand, undefined, 'rand is absent unless supplied');
  const seeded = H.shellCreateHost(Object.assign({}, deps, { reducedMotion: true, rand: () => 0.5 }));
  eq(seeded.reducedMotion, true, 'reducedMotion passes through when supplied');
  eq(typeof seeded.rand, 'function', 'rand passes through when supplied');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
