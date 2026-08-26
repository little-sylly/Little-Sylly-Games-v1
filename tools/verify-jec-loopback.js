// ═══════════════════════════════════════════════════════════════════════════
// verify-jec-loopback.js — drives Just Enough Cooks host↔client over a
// Firebase-shaped WIRE with a REAL mock DOM.
//
//   node tools/verify-jec-loopback.js        (exits 1 on any failure)
//   JEC_SRC=/path/to/broken.js    node tools/verify-jec-loopback.js
//   JEC_MP_SRC=/path/to/broken.js node tools/verify-jec-loopback.js
//
// verify-jec-loop.js runs in 'single' mode with one process driving all N seats,
// which is what lets it assert rules — and exactly what blinds it to the packet
// layer and to every line of render code. This file closes both gaps:
//
//   • THE WIRE. fbWrite/fbRead reproduce what Firebase actually persists and
//     hands back. null, {} and [] are DELETED in flight; '', 0 and false
//     survive. Piping mpSendEnvelope straight into the handler would pass live
//     JS references and let every empty collection make a trip Firebase would
//     not have allowed.
//   • A REAL DOM. getElementById: () => null short-circuits every `if (!el)
//     return` guard, so no render code executes at all and a render throw inside
//     a SYNC applier is invisible. These elements are real objects.
//
// JEC's MP handlers live in js/engine-multiplayer.js, not the plugin (Phase-22
// layout). jecHandleEnvelope is extracted out of that file by name and evaluated
// in the same sandbox as the plugin, so this harness drives the REAL handlers.
//
// Still NOT a substitute for a three-device session: no clock skew, no Firebase
// ordering, no dropped packets, nothing visual.
// ═══════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT   = path.join(__dirname, '..');
const jecSrc = fs.readFileSync(process.env.JEC_SRC    || path.join(ROOT, 'js/games/jec.js'), 'utf8');
const mpSrc  = fs.readFileSync(process.env.JEC_MP_SRC || path.join(ROOT, 'js/engine-multiplayer.js'), 'utf8');

// Pull jecHandleEnvelope out of engine-multiplayer.js by brace matching. Driving
// the real handler is the whole point — a copy in this file would drift.
function extractFn(src, name) {
  const start = src.indexOf('function ' + name + '(');
  if (start === -1) throw new Error(name + ' not found in engine-multiplayer.js');
  let depth = 0;
  const open = src.indexOf('{', start);
  for (let j = open; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
  }
  throw new Error('unbalanced braces in ' + name);
}
const handlerSrc = extractFn(mpSrc, 'jecHandleEnvelope');

const WORDS = [
  { word: 'pizza',    category: 'food', difficulty: 1 },
  { word: 'nachos',   category: 'food', difficulty: 1 },
  { word: 'sushi',    category: 'food', difficulty: 2 },
  { word: 'pho',      category: 'food', difficulty: 2 },
  { word: 'terrine',  category: 'food', difficulty: 3 },
  { word: 'consomme', category: 'food', difficulty: 3 },
];

// ── Assertions ────────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function check(label, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; }
  else { fail++; console.error('FAIL  ' + label + '\n        expected ' + e + '\n        actual   ' + a); }
}

// ── The wire ───────────────────────────────────────────────────────────────────
// fbWrite = what Firebase actually persists. fbRead = what the SDK hands back.
// Scalars survive intact — 0, false and '' are all legitimate stored values; only
// null/undefined and containers left empty by them are dropped.
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
    // The SDK materialises an array when the numeric keys are at least half dense;
    // below that it stays an object. Missing slots come back as null holes.
    if (keys.length * 2 > max + 1) {
      const arr = [];
      for (let i = 0; i <= max; i++) {
        arr[i] = Object.prototype.hasOwnProperty.call(v, String(i)) ? fbRead(v[String(i)]) : null;
      }
      return arr;
    }
  }
  const out = {};
  keys.forEach(k => { out[k] = fbRead(v[k]); });
  return out;
}

const wire = env => {
  const stored = fbWrite(env);
  return stored === undefined ? undefined : fbRead(stored);
};

// ── § 0 The wire's own behaviour ──────────────────────────────────────────────
// A harness whose wire is wrong passes while the game is broken. Assert it first,
// before a single line of game code runs.
check('wire: empty array is erased',     wire({ a: [] }),                 undefined);
check('wire: empty object is erased',    wire({ a: {} }),                 undefined);
check('wire: all-null array vanishes',   wire({ a: [null, null] }),       undefined);
check("wire: '' survives",               wire({ a: '' }).a,               '');
check('wire: 0 survives',                wire({ a: 0 }).a,                0);
check('wire: false survives',            wire({ a: false }).a,            false);
check('wire: -1 survives',               wire({ a: -1 }).a,               -1);
check("wire: all-'' array survives",     wire({ a: ['', ''] }).a,         ['', '']);
check('wire: sparse array -> nulls',     wire({ a: ['x', null, 'y'] }).a, ['x', null, 'y']);
check('wire: signatureIdx 0 survives',
  wire({ payload: { signatureIdx: 0, x: 1 } }).payload.signatureIdx, 0);
check('wire: all--1 array survives',     wire({ a: [-1, -1, -1] }).a,     [-1, -1, -1]);

// ── DOM mock with REAL elements ───────────────────────────────────────────────
function makeDocument() {
  const byId = {};
  const mk = tag => ({
    tagName: tag, children: [], style: {}, dataset: {}, title: '',
    scrollLeft: 0, scrollWidth: 0, disabled: false,
    // JEC's prep screen reads .value from four inputs; CJAR's screens have none.
    value: '', placeholder: '',
    className: '', textContent: '',
    _html: '',
    get innerHTML() { return this._html; },
    set innerHTML(v) { this._html = String(v); this.children = []; },
    classList: { add() {}, remove() {}, contains: () => false, toggle() {} },
    appendChild(c) { this.children.push(c); return c; },
    removeChild(c) { this.children = this.children.filter(x => x !== c); return c; },
    addEventListener() {}, removeEventListener() {},
    querySelector: () => null, querySelectorAll: () => [],
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0 }),
  });
  return {
    body: mk('body'),
    addEventListener() {},
    createElement: mk,
    querySelectorAll: () => [],
    querySelector: () => null,
    getElementById(id) { return byId[id] || (byId[id] = mk('div')); },
  };
}

// ── One device ────────────────────────────────────────────────────────────────
function makeDevice(name, mode, myIdx, slots) {
  const timers  = [];
  const screens = [];
  const errors  = [];
  const sent    = [];
  let seq = 0;

  const sandbox = {
    console,
    document: makeDocument(),
    window: { syllyMultiplayerMode: mode, activeExpansionOverrides: null },
    allWords: WORDS,
    loadWords: () => Promise.resolve(),
    isSecretMode: false,
    secretWords: [],
    // The real normaliseWord from engine.js.
    normaliseWord: w => {
      w = String(w == null ? '' : w).toLowerCase().trim();
      if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y';
      if (w.endsWith('es')  && w.length > 3) return w.slice(0, -2);
      if (w.endsWith('s')   && w.length > 2) return w.slice(0, -1);
      return w;
    },
    // The real Fisher–Yates from engine.js — NOT the identity stub verify-jec-loop
    // uses. A Fusion draw needs two genuinely distinct words off the pool.
    shuffle: a => { const c = [...a]; for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; },
    showScreen: id => screens.push(id),
    setTimeout: (fn, ms) => { timers.push({ fn, at: Date.now() + (ms || 0), id: ++seq }); return seq; },
    clearTimeout: id => { const i = timers.findIndex(t => t.id === id); if (i >= 0) timers.splice(i, 1); },
    setInterval: () => 0, clearInterval: () => {},
    playLaunch() {}, playWhoosh() {}, playDone() {}, playTick() {}, playBoing() {},
    playAlarm() {}, playSuccess() {}, playExit() {}, playPillClick() {},
    playSyllyOn() {}, playSyllyOff() {},
    // Lobby mode: a broadcast is CAPTURED, not thrown, and deep-copied so a later
    // mutation of host state cannot retroactively change what was "sent".
    mpSendEnvelope: env => { sent.push(JSON.parse(JSON.stringify(env))); },
    mpLockSync() {}, mpUnlockSync() {},
    mpPlayerSlots: slots, mpMyPlayerIdx: myIdx, mpActiveGame: 'jec',
    mpNotifyPlayerLeft() {}, mpShowModeScreen() {}, mpReturnToLobby() {},
    resetToLobby() { sandbox.__dissolved = true; },
    __dissolved: false,
    __name: name, __screens: screens, __timers: timers, __errors: errors, __sent: sent,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  const BRIDGE = [
    'globalThis.__jec = {',
    '  state() {',
    '    return {',
    '      word: jecCurrentWord, word2: jecCurrentWord2, instruction: jecInstruction,',
    '      round: jecRound, rounds: jecRounds,',
    '      inputs: jecInputs, crutches: jecCrutches, signatures: jecSignatures,',
    '      names: jecFusionNames, votes: jecNameVotes, winners: jecNameWinners,',
    '      freq: jecWordFrequency, display: jecDisplayWords, mergeMap: jecMergeMap,',
    '      ready: jecMpReadyCheck, scores: jecScores,',
    '    };',
    '  },',
    '  seat(o) {',
    '    jecPlayerCount         = o.players;',
    '    jecPlayerNames         = (mpPlayerSlots || []).map(p => p.nickname);',
    '    jecScores              = Array(o.players).fill(0);',
    '    jecGoldenScore         = o.golden === undefined ? 30 : o.golden;',
    '    jecRounds              = o.rounds === undefined ? 3 : o.rounds;',
    '    jecRound               = 0;',
    '    jecSpecialInstructions = !!o.instructions;',
    '    jecFusionCuisine       = !!o.fusion;',
    '    jecWordPool            = [];',
    '    jecInstructionDeck     = [];',
    '  },',
    '  startRound() { jecStartRound(); },',
    '  // The host processes its OWN submission directly — never via mpSendEnvelope.',
    '  // mpHandleEnvelope drops every envelope where originId === syllyDeviceUid, so',
    '  // a self-sent ACTION would never mark the host slot. That is bug J1.',
    '  hostSubmitOwn(o) {',
    '    jecInputs[mpMyPlayerIdx]       = [...o.ingredients];',
    "    jecCrutches[mpMyPlayerIdx]     = o.crutch || '';",
    '    jecSignatures[mpMyPlayerIdx]   = o.signatureIdx === undefined ? -1 : o.signatureIdx;',
    "    jecFusionNames[mpMyPlayerIdx]  = o.fusionName || '';",
    '    jecMpReadyCheck[mpMyPlayerIdx] = true;',
    '    if (jecMpReadyCheck.every(Boolean)) jecHostResolveSifting();',
    '  },',
    '  // Builds the ACTION a client sends. Mirrors jecSubmitIngredients client branch.',
    '  buildPrep(idx, o) {',
    "    return { type: 'ACTION', payload: {",
    "      action: 'JEC_PREP_SUBMIT',",
    '      playerIdx: idx,',
    '      ingredients: [...o.ingredients],',
    "      crutch: o.crutch || '',",
    '      signatureIdx: o.signatureIdx === undefined ? -1 : o.signatureIdx,',
    "      fusionName: o.fusionName || '',",
    '    }};',
    '  },',
    '  forceSignatures(a) { jecSignatures = [...a]; },',
    '  rebroadcastSifting() { jecHostResolveSifting(); },',
    '  handle(env) { jecHandleEnvelope(env); },',
    '};',
  ].join('\n');

  vm.runInContext(jecSrc + '\n' + handlerSrc + '\n' + BRIDGE, sandbox);
  const J = sandbox.__jec;

  return {
    name, sandbox,
    __sent: sent, __errors: errors, __screens: screens,
    __state: () => J.state(),
    __seat: o => J.seat(o),
    __startRound: () => J.startRound(),
    __hostSubmitOwn: o => J.hostSubmitOwn(o),
    __buildPrep: (idx, o) => J.buildPrep(idx, o),
    __forceSignatures: a => J.forceSignatures(a),
    __rebroadcastSifting: () => { sent.length = 0; J.rebroadcastSifting(); return sent.find(e => e.payload.action === 'JEC_SIFTING'); },
    __handle: env => J.handle(env),
    __lastSent: action => [...sent].reverse().find(e => e.payload.action === action),
    __clearSent: () => { sent.length = 0; },
  };
}

// Route one envelope from one device to another THROUGH the wire, exactly as
// mpHandleEnvelope would. A throw inside an applier is captured, not swallowed:
// in the real app it escapes through mpHandleEnvelope and strands the device.
function deliver(from, to, env) {
  const onWire = wire(env);
  if (onWire === undefined) { to.__errors.push('envelope erased whole: ' + env.payload.action); return; }
  try { to.__handle(onWire); }
  catch (e) { to.__errors.push(env.payload.action + ': ' + e.message); }
}

// ── § 1 JEC_ORDER carries the instruction and the second Order ────────────────
const slots = [{ uid: 'u0', nickname: 'Sam' }, { uid: 'u1', nickname: 'Ali' },
               { uid: 'u2', nickname: 'Bo' }];
const host   = makeDevice('host',   'host',   0, slots);
const client = makeDevice('client', 'client', 1, slots);

host.__seat({ players: 3, golden: 30, instructions: true, fusion: true });
client.__seat({ players: 3, golden: 30, instructions: true, fusion: true });
host.__startRound();
let env = host.__lastSent('JEC_ORDER');
check('JEC_ORDER broadcast exists',      !!env, true);
check('JEC_ORDER has word',              typeof env.payload.word, 'string');
check('JEC_ORDER has word2',             env.payload.word2 !== undefined, true);
check('JEC_ORDER word2 non-empty',       env.payload.word2 !== '', true);
check('JEC_ORDER orders differ',         env.payload.word !== env.payload.word2, true);
check('JEC_ORDER has instruction',       env.payload.instruction !== undefined, true);
check('JEC_ORDER instruction non-empty', env.payload.instruction !== '', true);
deliver(host, client, env);
check('client took order',     client.__state().word,        env.payload.word);
check('client took order2',    client.__state().word2,       env.payload.word2);
check('client took instr',     client.__state().instruction, env.payload.instruction);
check('no throw on JEC_ORDER', client.__errors, []);

// Standard mode: word2 and instruction are '' — the two values Firebase is most
// likely to erase. They must arrive as '' on the client, never undefined.
host.__seat({ players: 3, golden: 30, instructions: false, fusion: false });
client.__seat({ players: 3, golden: 30, instructions: false, fusion: false });
host.__clearSent();
host.__startRound();
env = host.__lastSent('JEC_ORDER');
check('standard word2 is empty string', env.payload.word2, '');
check('standard instr is empty string', env.payload.instruction, '');
deliver(host, client, env);
check('client word2 rebuilt to empty',  client.__state().word2, '');
check('client instr rebuilt to empty',  client.__state().instruction, '');
check('no throw on standard JEC_ORDER', client.__errors, []);

// ── § 2 JEC_PREP_SUBMIT ───────────────────────────────────────────────────────
// Fields per spec § 7.1: -poison, +crutch, +signatureIdx, +fusionName.
const sub = client.__buildPrep(1, { ingredients: ['cheese', 'ham', 'basil'],
                                    crutch: 'cheese', signatureIdx: 1, fusionName: '' });
check('ACTION not SYNC',   sub.type, 'ACTION');
check('no poison field',   'poison' in sub.payload, false);
check('has crutch',        sub.payload.crutch, 'cheese');
check('has signatureIdx',  sub.payload.signatureIdx, 1);
check('fusionName is empty string, not null', sub.payload.fusionName, '');

// ── § 3 JEC_SIFTING rebuilds every collection ─────────────────────────────────
// Three Chefs submit; the host resolves and broadcasts. jecCrutches all-'' and
// jecSignatures all--1 are the two arrays Firebase is most likely to mangle.
host.__seat({ players: 3, golden: 30 });
client.__seat({ players: 3, golden: 30 });
host.__clearSent();
client.__errors.length = 0;
host.__startRound();
deliver(host, client, host.__lastSent('JEC_ORDER'));

// Host processes its OWN submission directly — never via mpSendEnvelope.
host.__hostSubmitOwn({ ingredients: ['cheese', 'a1', 'a2'], crutch: '', signatureIdx: 0 });
check('no self-sent ACTION from host',
  host.__sent.filter(e => e.type === 'ACTION' && e.payload.playerIdx === 0).length, 0);
check('host does not resolve early', host.__lastSent('JEC_SIFTING'), undefined);

deliver(client, host, client.__buildPrep(1, { ingredients: ['cheese', 'b1', 'b2'], crutch: '', signatureIdx: 0, fusionName: '' }));
deliver(client, host, client.__buildPrep(2, { ingredients: ['c0', 'c1', 'c2'],     crutch: '', signatureIdx: 0, fusionName: '' }));

env = host.__lastSent('JEC_SIFTING');
check('sifting broadcast exists',        !!env, true);
check("all-'' crutches sent explicitly", env.payload.jecCrutches, ['', '', '']);
deliver(host, client, env);
check("client rebuilt all-'' crutches", client.__state().crutches, ['', '', '']);
check('client crutches length is N',    client.__state().crutches.length, 3);
check('client signatures rebuilt',      client.__state().signatures, [0, 0, 0]);
check('client freq matches host',       client.__state().freq, host.__state().freq);
check('client inputs rebuilt',          client.__state().inputs, host.__state().inputs);
check('no throw on JEC_SIFTING',        client.__errors, []);

// An all--1 signature array (nobody nominated — every prep packet dropped) is the
// erasure worst case: the array vanishes whole and must be rebuilt to length N.
host.__forceSignatures([-1, -1, -1]);
env = host.__rebroadcastSifting();
check('all--1 signatures sent explicitly', env.payload.jecSignatures, [-1, -1, -1]);
deliver(host, client, env);
check('all--1 signatures rebuilt to length N', client.__state().signatures, [-1, -1, -1]);
check('no throw on rebroadcast', client.__errors, []);

// The case that ACTUALLY bites. All-'' and all--1 SURVIVE the wire — '' and -1
// are legitimate stored scalars, so those arrays are not empty and nothing is
// dropped. What Firebase erases is an EMPTY collection: a host whose jecCrutches
// is [] sends a key that is deleted in flight and the client sees undefined.
// jecWireArr rebuilds it to length N; a raw assignment leaves undefined and the
// next jecCrutches[p] read throws inside the applier.
const erased = JSON.parse(JSON.stringify(host.__lastSent('JEC_SIFTING')));
delete erased.payload.jecCrutches;      // what an erased [] looks like on arrival
delete erased.payload.jecSignatures;
delete erased.payload.jecFusionNames;
client.__errors.length = 0;
deliver(host, client, erased);
check('erased crutches rebuilt to length N',   client.__state().crutches,   ['', '', '']);
check('erased signatures rebuilt to length N', client.__state().signatures, [-1, -1, -1]);
check('erased names rebuilt to length N',      client.__state().names,      ['', '', '']);
check('no throw on erased-collection SIFTING', client.__errors, []);

// A half-dense array comes back index-keyed, not as an array. The normaliser must
// still produce a dense array of length N.
const sparse = JSON.parse(JSON.stringify(host.__lastSent('JEC_SIFTING')));
sparse.payload.jecCrutches = ['cheese', null, null];
client.__errors.length = 0;
deliver(host, client, sparse);
check('sparse crutches densified', client.__state().crutches, ['cheese', '', '']);
check('no throw on sparse SIFTING', client.__errors, []);

// ── § 4 A render throw inside a SYNC applier is caught, not silent ─────────────
// This is the check getElementById: () => null cannot make. If a JEC_SIFTING
// applier throws while rendering, mpHandleEnvelope propagates it and the device
// is stranded on the previous screen with no error anywhere.
check('client reached the sifting screen',
  client.__screens[client.__screens.length - 1], 'screen-jec-sifting');

console.log('\njec-loopback: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
