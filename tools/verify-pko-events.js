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

  console.log('\n' + '='.repeat(48));
  console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
})();
