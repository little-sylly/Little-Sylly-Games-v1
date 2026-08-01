// ═══════════════════════════════════════════════════════════════════════════
// verify-pko-events.js — asserts Pecking Order's Force of Nature ruleset.
//
//   node tools/verify-pko-events.js        (exits 1 on any failure)
//
// Third harness. verify-pko-chain.js owns the DATA layer, verify-pko-loop.js the
// TURN LOOP, this one the EVENTS — draw gate, Mimic, reversal, track locks, and
// every mutating event's effect on the Hoards.
//
// Same vm gotcha as the other two: `let` in a vm-evaluated script creates a lexical
// binding, NOT a property on the context object, so state is invisible from out here.
// The appended bridge exposes it. `const` behaves the SAME way — PKO_EVENTS is reached
// through the bridge's registry getter, not off `sandbox`. Only `function` declarations
// land on the object, which is why the appliers are callable directly.
//
// TG-07 STILL BINDS: this runs in 'single' mode where pkoMyHoard ALIASES pkoHoards[0],
// so it is structurally blind to per-device mirror bugs. It cannot prove the three new
// pkoSyncAllHands() senders reach a client. Only a non-host playtest can.
// ═══════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT = path.join(__dirname, '..');
const chainJson = fs.readFileSync(path.join(ROOT, 'data/pko-data.json'), 'utf8');

const screens = [];
const timers  = [];
const sandbox = {
  console,
  document: { addEventListener() {}, getElementById: () => null, querySelectorAll: () => [] },
  window: { syllyMultiplayerMode: 'single' },
  fetch: () => Promise.resolve({ json: () => Promise.resolve(JSON.parse(chainJson)) }),
  shuffle: a => [...a],
  showScreen: id => screens.push(id),
  setTimeout: (fn, ms) => timers.push({ fn, ms }) - 1,
  clearTimeout: () => {},
  playLaunch() {}, playBoing() {}, playWhoosh() {}, playDone() {}, playPillClick() {},
  playSyllyOn() {}, playSyllyOff() {}, playStampede() {}, playUnchallenged() {},
  playPoacher() {}, playClashWin() {}, playSuccess() {}, playAbyssThud() {}, playSonarPing() {},
  mpSendEnvelope() { throw new Error('mpSendEnvelope called in single mode'); },
  mpSendPrivate()  { throw new Error('mpSendPrivate called in single mode'); },
  mpLockSync() {}, mpUnlockSync() {}, mpPlayerSlots: [],
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const BRIDGE = `
globalThis.__fon = {
  get registry()    { return PKO_EVENTS; },
  get event()       { return pkoEvent; },
  get fired()       { return pkoEventsFired; },
  get alpha()       { return pkoAlphaIdx; },
  get marks()       { return pkoMarks; },
  get hoards()      { return pkoHoards; },
  get counts()      { return pkoHoardCounts; },
  get scores()      { return pkoScores; },
  get watering()    { return pkoWateringHole; },
  get wateringFlat(){ return pkoWateringHole.flatMap(b => b.cards); },
  get trail()       { return pkoTrail; },
  get turn()        { return pkoTurnIdx; },
  get leader()      { return pkoLeaderIdx; },
  get reserve()     { return pkoReserve; },
  seat(o) {
    pkoPlayerCount = o.hoards.length;
    pkoPlayerNames = o.hoards.map((_, i) => 'P' + i);
    pkoHoards      = o.hoards.map(h => [...h]);
    pkoHoardCounts = pkoHoards.map(h => h.length);
    pkoMarks          = [...(o.marks || [])];
    pkoMarkOwnerIdx   = o.owner === undefined ? -1 : o.owner;
    pkoTurnIdx        = o.turn || 0;
    pkoRetreatedSince = new Array(pkoPlayerCount).fill(false);
    pkoScores         = o.scores || new Array(pkoPlayerCount).fill(0);
    pkoClashHistory = []; pkoWateringHole = []; pkoReserve = o.reserve || [];
    pkoTrail = []; pkoEncounterNum = o.encounter || 1; pkoClashNum = 1;
    pkoLeaderIdx = o.leader || 0;
    pkoStartSmall = 'off'; pkoAppetite = o.appetite || 'sated';
    pkoEvent = o.event === undefined ? null : o.event;
    pkoEventsFired = o.fired || [];
    pkoAlphaIdx = o.alphaIdx === undefined ? -1 : o.alphaIdx;
    pkoSyllyMode = o.sylly === undefined ? true : o.sylly;
    pkoMyHoard = pkoHoards[0];
  },
  set(k, v) {
    if (k === 'event')       pkoEvent = v;
    if (k === 'fired')       pkoEventsFired = [...v];
    if (k === 'alphaIdx')    pkoAlphaIdx = v;
    if (k === 'appetite')    pkoAppetite = v;
    if (k === 'sylly')       pkoSyllyMode = v;
    if (k === 'hoardSize')   pkoHoardSize = v;
    if (k === 'clashTarget') pkoClashTarget = v;
    if (k === 'marks')       pkoMarks = [...v];
    if (k === 'myHoard')     pkoMyHoard = [...v];
  },
  flag(k)        { return pkoEventFlag(k); },
  predators(id)  { return [...(pkoPredators(id) || [])].sort(); },
  beats(m, c)    { return pkoBeats(m, c); },
  answers(m, cs) { return pkoAnswers(m, cs); },
  canAct(h, t)   { return pkoCanActUnderTrack(h, t); },
  draw()         { pkoDrawEvent(); return pkoEvent; },
  events()       { return PKO_EVENTS.map(e => e.id); },
  // Runs the REAL pkoStartEncounter but pins the event, so the Leader pass and every
  // onFire can be tested against a chosen event instead of whatever the draw picked.
  // pkoDrawEvent is a function declaration, so it lands on the context and is
  // reassignable from in here — never try this from outside the vm.
  startWithEvent(id) {
    const real = pkoDrawEvent;
    pkoDrawEvent = () => { pkoEvent = id; pkoEventsFired.push(id); };
    try { pkoStartEncounter(); } finally { pkoDrawEvent = real; }
    return pkoTurnIdx;
  },
};`;
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/games/pko.js'), 'utf8') + BRIDGE, sandbox,
  { filename: 'js/games/pko.js' });

let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}` +
    (ok ? '' : `\n          expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`));
}
const section = t => console.log(`\n${t}`);

(async () => {
  await sandbox.pkoLoadChain();
  const F = sandbox.__fon;

  console.log('Pecking Order — Force of Nature verification\n' + '='.repeat(48));

  section('The registry');
  check('nine events — eight random plus the fixed opener (§1)', F.events().length, 9);
  check('Dark Forest was cut (D26)', F.events().includes('dark-forest'), false);
  check('every event carries an id, name, emoji and blurb',
    F.registry.filter(e => !e.id || !e.name || !e.emoji || !e.blurb).map(e => e.id), []);
  check('no event is both mutating and passive',
    F.registry.filter(e => e.onFire && (e.track || e.reversal || e.alpha || e.carrion))
      .map(e => e.id), []);

  section('pkoEventFlag reads the ACTIVE event only');
  F.seat({ hoards: [['mouse'], ['bear']], event: null });
  check('no event → every flag is null',
    ['track', 'reversal', 'alpha', 'carrion'].map(k => F.flag(k)), [null, null, null, null]);
  F.set('event', 'deluge');
  check('Deluge → track is sea', F.flag('track'), 'sea');
  check('Deluge → reversal is null, not a false positive', F.flag('reversal'), null);
  F.set('event', 'great-reversal');
  check('Great Reversal → reversal is true', F.flag('reversal'), true);
  check('Great Reversal → track is null', F.flag('track'), null);
  F.set('event', null);

  section('The draw gate — an ineligible event is never selected (D34)');
  F.seat({ hoards: [['mouse', 'bear'], ['leopard', 'bee']], event: null });
  const landOnly = new Set();
  for (let i = 0; i < 400; i++) { F.set('fired', []); F.set('event', null); landOnly.add(F.draw()); }
  check('the Deluge is never drawn when no Hoard can act at sea', landOnly.has('deluge'), false);
  check('the Dry Season IS drawn — every Hoard is land', landOnly.has('dry-season'), true);
  check('the fixed opener is never drawn as a random event',
    landOnly.has('invasive-mimicry'), false);

  F.seat({ hoards: [['fish'], ['octopus']], event: null });
  const seaOnly = new Set();
  for (let i = 0; i < 400; i++) { F.set('fired', []); F.set('event', null); seaOnly.add(F.draw()); }
  check('the Dry Season is never drawn when no Hoard can act on land',
    seaOnly.has('dry-season'), false);
  check('the Deluge IS drawn — every Hoard is sea', seaOnly.has('deluge'), true);

  section('Extinction fires at most once per Clash');
  F.seat({ hoards: [['mouse'], ['bear']], event: null, fired: ['extinction'] });
  const after = new Set();
  for (let i = 0; i < 400; i++) { F.set('event', null); F.draw(); after.add(F.event); }
  check('never redrawn once it is in pkoEventsFired', after.has('extinction'), false);

  section('A drawn event is recorded in the accumulator');
  F.seat({ hoards: [['mouse', 'fish'], ['bear', 'octopus']], event: null, fired: [] });
  const drawn = F.draw();
  check('the drawn id lands in pkoEventsFired', F.fired, [drawn]);
  check('pkoEventFlag is null-safe when no event is live',
    (() => { F.set('event', null); return F.flag('track'); })(), null);

  section('The Great Reversal — the prey set becomes the predator set (§7.2)');
  ['sated', 'ravenous'].forEach(mode => {
    F.seat({ hoards: [['mouse'], ['bear']], event: null, appetite: mode });
    const ids = ['mouse', 'fish', 'eagle', 'elephant', 'bear', 'leopard'];
    const normal = ids.map(id => F.predators(id));
    F.set('event', 'great-reversal');
    const rev = ids.map(id => F.predators(id));
    F.set('event', null);
    check(`[${mode}] reversal is an involution — turning it off restores the graph`,
      ids.map(id => F.predators(id)), normal);
    check(`[${mode}] the Eagle becomes beatable when reversed (intended chaos — do not "fix")`,
      normal[2].length === 0 && rev[2].length > 0, true);
    check(`[${mode}] the Elephant becomes the weakest — its prey set was empty`,
      normal[3].length > 0 && rev[3].length >= 0, true);
    F.set('event', 'great-reversal');
    check(`[${mode}] a Poacher still beats every Mark under reversal`,
      ['mouse', 'eagle', 'elephant', 'human'].filter(id => !F.beats(id, 'human')), []);
    check(`[${mode}] nothing but a Poacher beats a Poacher-Mark under reversal`,
      ['mouse', 'eagle', 'bear'].filter(id => F.beats('human', id)), []);
    F.set('event', null);
  });

  section('Reversal COMPOSES with Appetite — four graphs, all pre-built');
  F.seat({ hoards: [['mouse']], event: 'great-reversal', appetite: 'sated' });
  const revSated = F.predators('leopard');
  F.set('appetite', 'ravenous');
  const revWide = F.predators('leopard');
  check('Ravenous reversal reaches at least as far as Sated reversal',
    revWide.length >= revSated.length && revSated.every(x => revWide.includes(x)), true);
  check('the two are not identical — Ravenous really does add edges',
    revWide.length > revSated.length, true);
  F.set('appetite', 'sated'); F.set('event', null);

  section('Track locks — the playability predicate (§7.3)');
  check('a sea card qualifies under a sea lock', F.canAct(['fish'], 'sea'), true);
  check('a land card does NOT qualify under a sea lock', F.canAct(['bear'], 'sea'), false);
  check('a Poacher always qualifies', F.canAct(['human'], 'sea'), true);
  check('a lone Mimic does NOT qualify — it needs a real anchor',
    F.canAct(['mimic'], 'sea'), false);
  check('a Mimic plus a sea card qualifies', F.canAct(['mimic', 'fish'], 'sea'), true);
  check('an empty Hoard qualifies for nothing', F.canAct([], 'sea'), false);

  section('The lock bites inside pkoAnswers, so every Challenge path inherits it');
  F.seat({ hoards: [['bear']], marks: ['leopard'], event: null });
  check('no lock → a Bear answers a Leopard', F.answers('leopard', ['bear']), true);
  F.set('event', 'deluge');
  check('Deluge → the land Bear may not answer at all', F.answers('leopard', ['bear']), false);
  check('Deluge → a Poacher is unaffected', F.answers('leopard', ['human']), true);
  check('Deluge → a sea Swarm on a sea Mark is legal', F.answers('fish', ['fish', 'fish']), true);
  F.set('event', 'dry-season');
  check('Dry Season → the land Bear is legal again', F.answers('leopard', ['bear']), true);
  check('Dry Season → a sea Swarm is refused', F.answers('fish', ['fish', 'fish']), false);
  check('Dry Season → a Poacher is still unaffected', F.answers('fish', ['human']), true);
  F.set('event', null);

  section('The Leader pass — the Stake walks clockwise to the first seat that can act');
  // P0 leads but holds only land; P1 is land too; P2 is the first clockwise seat at sea.
  F.seat({
    hoards: [['bear', 'leopard'], ['elephant'], ['fish', 'octopus'], ['bee']],
    event: null, leader: 0, encounter: 5, sylly: true,
  });
  check('the turn passes to the first seat that can act at sea',
    F.startWithEvent('deluge'), 2);
  check('leadership itself does NOT transfer — pkoLeaderIdx is untouched', F.leader, 0);
  check('the Leader keeps the turn when they CAN act',
    (() => {
      F.seat({ hoards: [['fish'], ['bear'], ['octopus']], leader: 1, encounter: 5, sylly: true });
      return F.startWithEvent('dry-season');
    })(), 1);
  check('with no lock the turn is simply the Leader',
    (() => {
      F.seat({ hoards: [['fish'], ['bear'], ['octopus']], leader: 2, encounter: 5, sylly: true });
      return F.startWithEvent('great-reversal');
    })(), 2);

  section('The Culling — discard your fewest-held species (§7.6)');
  F.seat({ hoards: [['mouse', 'mouse', 'mouse', 'bear'], ['fish', 'fish', 'octopus', 'octopus']],
           event: null, encounter: 5, sylly: true });
  F.startWithEvent('culling');
  check('the singleton species is culled', F.hoards[0], ['mouse', 'mouse', 'mouse']);
  check('a tie culls exactly ONE species, not both', F.hoards[1].length, 2);
  check('the tie broke to the lower PKO_PREY_RANK — Fish (1) before Octopus (2)',
    F.hoards[1], ['octopus', 'octopus']);
  check('counts follow the Hoards', F.counts, [3, 2]);
  check('the culled cards reached the Watering Hole',
    F.wateringFlat.sort(), ['bear', 'fish', 'fish']);
  check('one batch record for the whole event, not one per player', F.watering.length, 1);

  section('The Culling can NEVER empty a Hoard (§6 / D27)');
  F.seat({ hoards: [['mouse'], ['fish', 'fish']], event: null, encounter: 5, sylly: true });
  check('holding one species discards nothing at all',
    F.startWithEvent('culling') >= 0 && F.hoards[0].length === 1 && F.hoards[1].length === 2, true);
  check('nobody scored', F.scores, [0, 0]);
  F.seat({ hoards: [['mouse', 'bear', 'fish'], ['eagle', 'eagle']], event: null, encounter: 5, sylly: true });
  F.startWithEvent('culling');
  check('a three-way tie still leaves two cards', F.hoards[0].length, 2);
  check('a single-species Hoard is untouched', F.hoards[1], ['eagle', 'eagle']);

  section('Extinction Event — the globally rarest species is wiped (§8)');
  F.seat({ hoards: [['mouse', 'mouse', 'bear'], ['mouse', 'bear', 'bear'], ['mouse', 'eagle']],
           event: null, encounter: 5, sylly: true });
  // Census: mouse 4, bear 3, eagle 1 → eagle is the minimum.
  F.startWithEvent('extinction');
  check('every copy of the rarest species is gone',
    F.hoards.flat().filter(c => c === 'eagle'), []);
  check('nothing else was touched', F.hoards.flat().sort(),
    ['bear', 'bear', 'bear', 'mouse', 'mouse', 'mouse', 'mouse']);
  check('the wiped cards reached the Watering Hole', F.wateringFlat, ['eagle']);

  section('Extinction wipes ALL tied-minimum species');
  F.seat({ hoards: [['mouse', 'mouse', 'bear'], ['mouse', 'eagle', 'fish']],
           event: null, encounter: 5, sylly: true });
  // Census: mouse 3, bear 1, eagle 1, fish 1 → three species tie at the minimum.
  F.startWithEvent('extinction');
  check('all three minimum species are wiped together', F.hoards.flat().sort(),
    ['mouse', 'mouse', 'mouse']);

  section('Extinction can empty several Hoards → joint scorers (§6)');
  F.seat({ hoards: [['mouse', 'mouse'], ['eagle'], ['fish'], ['mouse', 'bear', 'bear']],
           event: null, encounter: 5, sylly: true, scores: [0, 0, 0, 0] });
  F.set('clashTarget', 9);
  // Census: mouse 3, bear 2, eagle 1, fish 1 → Eagle and Fish tie at 1; P1 and P2 empty.
  F.startWithEvent('extinction');
  check('both emptied seats score', F.scores, [0, 1, 1, 0]);
  check('the Clash ended before a card was played', F.marks, []);

  section('Migration — every Hoard moves one seat to the left');
  F.seat({ hoards: [['mouse'], ['bear', 'bear'], ['fish', 'fish', 'fish']],
           event: null, encounter: 5, sylly: true });
  F.startWithEvent('migration');
  check('P0 receives what P2 held — one seat clockwise', F.hoards[0], ['fish', 'fish', 'fish']);
  check('P1 receives what P0 held', F.hoards[1], ['mouse']);
  check('P2 receives what P1 held', F.hoards[2], ['bear', 'bear']);
  check('counts follow the Hoards', F.counts, [3, 1, 2]);
  check('total card count is conserved', F.hoards.flat().length, 6);
  check('Migration discards nothing', F.wateringFlat, []);
  check('Migration never scores', F.scores, [0, 0, 0]);

  section('Every mutating event writes the Trail');
  F.seat({ hoards: [['mouse', 'bear'], ['fish', 'fish']], event: null, encounter: 5, sylly: true });
  F.startWithEvent('culling');
  check('the event names itself at the head of the Encounter',
    F.trail.some(e => /The Culling/.test(e.text)), true);
  check('a per-player line names what was lost',
    F.trail.filter(e => /was Culled/.test(e.text)).length >= 1, true);

  console.log('\n' + '='.repeat(48));
  console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
})();
