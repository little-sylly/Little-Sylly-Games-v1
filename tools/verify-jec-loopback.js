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
    requestAnimationFrame: fn => { fn(); return 1; },
    cancelAnimationFrame: () => {},
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
    '      subState: jecSiftingSubState,',
    '      oversight: jecOversightSelected,',
    '      voteIdx: jecVoteCurrentIdx, voteCheck: jecMpVoteCheck,',
    '    };',
    '  },',
    '  seat(o) {',
    '    jecPlayerCount         = o.players;',
    '    jecPlayerNames         = (mpPlayerSlots || []).map(p => p.nickname);',
    '    jecPlayerNames         = jecPlayerNames.slice(0, o.players);',
    "    if (jecPlayerNames.length < o.players) jecPlayerNames = Array.from({ length: o.players }, (_, i) => 'Chef' + (i + 1));",
    '    jecScores              = Array(o.players).fill(0);',
    '    jecGoldenScore         = o.golden === undefined ? 30 : o.golden;',
    '    jecRounds              = o.rounds === undefined ? 3 : o.rounds;',
    '    jecRound               = 0;',
    '    jecSpecialInstructions = !!o.instructions;',
    '    jecFusionCuisine       = !!o.fusion;',
    '    jecSpecialsBoard       = !!o.specials;',
    '    jecSousChefCheck       = o.souschef === undefined ? true : !!o.souschef;',
    '    jecRoundLog            = [];',
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
    '  reroll() { jecReroll(); },',
    '  // Every seat submits, then the host resolves - the shortest honest route to',
    '  // a rendered Sifting board. The packet path itself is § 2/§ 3\'s job.',
    '  runPrepAll(inputs, crutches, sigs, names) {',
    '    jecStartRound();',
    '    for (let p = 0; p < jecPlayerCount; p++) {',
    '      jecInputs[p]       = [...inputs[p]];',
    "      jecCrutches[p]     = crutches[p] || '';",
    '      jecSignatures[p]   = sigs[p] === undefined ? -1 : sigs[p];',
    "      jecFusionNames[p]  = names ? (names[p] || '') : '';",
    '      jecMpReadyCheck[p] = true;',
    '    }',
    '    jecHostResolveSifting();',
    '  },',
    '  // Fills the REAL prep inputs and calls the REAL jecSubmitIngredients. A copy',
    '  // of the validation rules here would only ever test the copy.',
    '  tryPrep(o) {',
    '    const set = (id, v) => { document.getElementById(id).value = v; };',
    "    set('jec-prep-ingredient-1', o.ingredients[0]);",
    "    set('jec-prep-ingredient-2', o.ingredients[1]);",
    "    set('jec-prep-ingredient-3', o.ingredients[2]);",
    "    set('jec-prep-crutch',      o.crutch     === undefined ? '' : o.crutch);",
    "    set('jec-prep-fusion-name', o.fusionName === undefined ? '' : o.fusionName);",
    "    document.getElementById('jec-prep-error').textContent = '';",
    '    jecPrepSignatureIdx = o.signatureIdx === undefined ? -1 : o.signatureIdx;',
    '    jecSubmitIngredients();',
    "    return document.getElementById('jec-prep-error').textContent;",
    '  },',
    '  forceSignatures(a) { jecSignatures = [...a]; },',
    '  merge(a, b) { jecApplyMerge(normaliseWord(a), normaliseWord(b)); },',
    '  // The SHIPPED advance, guard included - not a copy of the listener body.',
    '  advanceCheck() { jecAdvanceToTasting(); },',
    '  // The SHIPPED Tasting advance - Fusion detour and J4 guard included.',
    '  advanceTasting() { jecAdvanceFromTasting(); },',
    '  finishTally() { jecFinishRoundToTally(); },',
    '  showWashup() { jecShowWashup(); },',
    '  podiumMedals(s) { return jecPodiumMedals(s); },',
    '  vote(voter, target) { jecCastNameVote(voter, target); },',
    '  // The ACTION a third client would send. Mirrors the client branch of',
    '  // jecCastNameVote - the shape is the contract being asserted.',
    '  buildVote(idx, target) {',
    "    return { type: 'ACTION', payload: {",
    "      action: 'JEC_NAME_VOTE', playerIdx: idx, votedForIdx: target,",
    '    }};',
    '  },',
    '  tap(norm) { jecHandleOversightTap(norm); },',
    '  el(id) { return document.getElementById(id); },',
    '  norm(w) { return normaliseWord(w); },',
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
    __reroll: () => J.reroll(),
    __runPrepAll: (i, c, s, names) => J.runPrepAll(i, c, s, names),
    __merge: (a, b) => J.merge(a, b),
    __advanceCheck: () => J.advanceCheck(),
    __advanceTasting: () => J.advanceTasting(),
    __finishTally: () => J.finishTally(),
    __showWashup: () => J.showWashup(),
    __podiumMedals: s => J.podiumMedals(s),
    // A client vote SENDS; return the envelope so the caller can deliver it.
    __vote: (v, t) => { J.vote(v, t); return [...sent].reverse().find(e => e.payload.action === 'JEC_NAME_VOTE'); },
    __buildVote: (i, t) => J.buildVote(i, t),
    __tap: norm => J.tap(norm),
    __el: id => J.el(id),
    __norm: w => J.norm(w),
    // A client that clears validation SENDS. Reading the error line alone would not
    // separate pass from fail — on success the same element carries the waiting text.
    __tryPrep: o => { const before = sent.length; const err = J.tryPrep(o);
                      return { ok: sent.length > before, err }; },
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
  // A MISSING envelope is a finding, not a crash. A sender that never broadcast
  // is exactly the bug this harness exists to catch, and letting it throw here
  // buries the failing check under a stack trace and skips every later section.
  if (!env) { to.__errors.push('no envelope to deliver (sender never broadcast)'); return; }
  const onWire = wire(env);
  if (onWire === undefined) { to.__errors.push('envelope erased whole: ' + env.payload.action); return; }
  try { to.__handle(onWire); }
  catch (e) { to.__errors.push(env.payload.action + ': ' + e.message); }
}

// ── § 1 JEC_ORDER carries the instruction and the second Order ────────────────
const slots = [{ uid: 'u0', nickname: 'Sam' }, { uid: 'u1', nickname: 'Ali' },
               { uid: 'u2', nickname: 'Bo' },  { uid: 'u3', nickname: 'Cass' }];
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

// ── § 5 A Specials Board reroll reaches the clients ──────────────────────────
// Before this, the reroll listener repainted the host's own word and broadcast
// nothing, so every client kept prepping against the previous Order. Invisible in
// single-device play and to every 'single'-mode harness.
host.__seat({ players: 3, golden: 30, specials: true, instructions: true, fusion: true });
client.__seat({ players: 3, golden: 30, specials: true, instructions: true, fusion: true });
host.__clearSent();
client.__errors.length = 0;
host.__startRound();
deliver(host, client, host.__lastSent('JEC_ORDER'));
const beforeWord = client.__state().word;

const before = { word:  host.__state().word,
                 word2: host.__state().word2,
                 instr: host.__state().instruction };

host.__clearSent();
host.__reroll();
const rerolled = host.__lastSent('JEC_ORDER');
check('reroll broadcasts JEC_ORDER', !!rerolled, true);

// Half 1 — the host really redrew all three. The pool and the deck are both
// drawn without replacement, so consecutive draws differ deterministically.
check('reroll drew a new Order',       host.__state().word        !== before.word,  true);
check('reroll drew a new second Order',host.__state().word2       !== before.word2, true);
check('reroll drew a new Instruction', host.__state().instruction !== before.instr, true);
check('reroll kept the two Orders apart', host.__state().word !== host.__state().word2, true);

// Half 2 — the redraw reached the client. Before the fix the listener repainted
// the host's own word and broadcast nothing, so clients kept the previous Order.
deliver(host, client, rerolled);
check('client followed the reroll', client.__state().word,        host.__state().word);
check('client took new word2',      client.__state().word2,       host.__state().word2);
check('client took new instruction',client.__state().instruction, host.__state().instruction);
check('client moved off the old Order', client.__state().word !== beforeWord, true);
check('no throw on reroll',         client.__errors, []);

// ── § 6 The prep gate: what jecSubmitIngredients refuses ──────────────────────
// Serve it Up! is disabled until every field is PRESENT, so these are the
// semantic refusals a filled-in screen can still hit, plus the two fields the
// rework adds to the packet.
client.__seat({ players: 3, golden: 30, instructions: false, fusion: false, specials: false });
client.__startRound();
client.__clearSent();

check('valid prep accepted', client.__tryPrep({
  ingredients: ['cheese', 'ham', 'basil'], crutch: 'tomato', signatureIdx: 0, fusionName: '' }).ok, true);
// The Crutch is a read of the TABLE. Calling your own ingredient is not one.
check('self-crutch rejected', client.__tryPrep({
  ingredients: ['cheese', 'ham', 'basil'], crutch: 'cheese', signatureIdx: 0, fusionName: '' }).ok, false);
// Compared through normaliseWord, not string equality - 'basils' is still your
// basil. (The stemmer is crude: it strips -s/-es/-ies and nothing else, so
// 'cheese'/'cheeses' do NOT collapse. Pick a pair that actually does.)
check('self-crutch caught after normalising', client.__tryPrep({
  ingredients: ['cheese', 'ham', 'basil'], crutch: 'basils', signatureIdx: 0, fusionName: '' }).ok, false);
// Nomination is mandatory: no default, no silent fallback to slot 0.
check('missing signature rejected', client.__tryPrep({
  ingredients: ['cheese', 'ham', 'basil'], crutch: 'tomato', signatureIdx: -1, fusionName: '' }).ok, false);
check('signature 0 is a real nomination', client.__tryPrep({
  ingredients: ['cheese', 'ham', 'basil'], crutch: 'tomato', signatureIdx: 0, fusionName: '' }).ok, true);
check('missing crutch rejected', client.__tryPrep({
  ingredients: ['cheese', 'ham', 'basil'], crutch: '', signatureIdx: 1, fusionName: '' }).ok, false);
check('duplicate ingredients rejected', client.__tryPrep({
  ingredients: ['cheese', 'basil', 'basils'], crutch: 'tomato', signatureIdx: 0, fusionName: '' }).ok, false);
// In standard play the name is neither asked for nor sent - but it is sent as '',
// never omitted, or the field is erased in flight and arrives undefined.
check('standard prep carries an empty name',
  client.__lastSent('JEC_PREP_SUBMIT').payload.fusionName, '');

// Fusion: the name is mandatory, and it rides the SAME packet as the prep, which
// is what keeps the mode at +0 handoffs.
client.__seat({ players: 3, golden: 30, instructions: false, fusion: true, specials: false });
client.__startRound();
client.__clearSent();
check('fusion requires a name', client.__tryPrep({
  ingredients: ['cheese', 'ham', 'basil'], crutch: 'tomato', signatureIdx: 0, fusionName: '' }).ok, false);
check('fusion prep with a name accepted', client.__tryPrep({
  ingredients: ['cheese', 'ham', 'basil'], crutch: 'tomato', signatureIdx: 2, fusionName: 'Pav Roll' }).ok, true);
const prep = client.__lastSent('JEC_PREP_SUBMIT');
check('crutch rides the prep packet',    prep.payload.crutch,       'tomato');
check('signature rides the prep packet', prep.payload.signatureIdx, 2);
check('name rides the prep packet',      prep.payload.fusionName,   'Pav Roll');
check('no poison field on the wire',     'poison' in prep.payload,  false);

// And it lands. The client's own state proving the fields were set says nothing
// about what the host will hold when it scores.
host.__seat({ players: 3, golden: 30, instructions: false, fusion: true, specials: false });
host.__startRound();
const hostErrsBefore = host.__errors.length;
deliver(client, host, prep);
check('host stored the crutch',     host.__state().crutches[1],   'tomato');
check('host stored the signature',  host.__state().signatures[1], 2);
check('host stored the fused name', host.__state().names[1],      'Pav Roll');
check('no throw on prep delivery',  host.__errors.length,         hostErrsBefore);

// A failed length check must not then crash the run on children[0], hiding every
// later section behind a stack trace.
const first = el => ((el.children[0] || {}).innerHTML || '');
// The same rule for a missing envelope: read its payload defensively, so the
// 'never sent' check is the failure rather than a TypeError two lines later.
const pay = e => ((e || {}).payload || {});

// ── § 7 Sous Chef's Check -> The Tasting ──────────────────────────────────────
// Blind merging is an INTEGRITY fix, not only pacing: on the old scored board a
// Chef could push a merge that raised their own count with full knowledge of
// what it was worth. So the client's Check list must carry no counts at all.
host.__seat({ players: 3, golden: 30, souschef: true });
client.__seat({ players: 3, golden: 30, souschef: true });
host.__clearSent();
client.__errors.length = 0;
host.__runPrepAll([['tomato', 'a1', 'a2'], ['tomatoe', 'b1', 'b2'], ['c0', 'c1', 'c2']],
                  ['', '', ''], [0, 0, 0]);
deliver(host, client, host.__lastSent('JEC_SIFTING'));
check('client lands on the Check',   client.__state().subState, 'check');
check('host lands on the Check',     host.__state().subState,   'check');
check('Check list rendered',         client.__el('jec-check-list').children.length > 0, true);
check('Check list carries no counts',
  client.__el('jec-check-list').children.every(c => !/Chef/.test(c.innerHTML)), true);
check('Check list carries no badges',
  client.__el('jec-check-list').children.every(c => !/rounded-full/.test(c.innerHTML)), true);
check('the Tasting list is still empty',
  client.__el('jec-tasting-list').children.length, 0);

// A merge made blind still reaches the client.
host.__merge('tomato', 'tomatoe');
deliver(host, client, host.__lastSent('JEC_MERGE'));
check('client applied the merge', client.__state().freq[client.__norm('tomato')], 2);
check('no throw on JEC_MERGE',    client.__errors, []);

// J4: the advance is host-gated. A client running it locally would jump its own
// board to a scored state ahead of the table.
client.__clearSent();
client.__advanceCheck();
check('client cannot advance itself', client.__state().subState, 'check');
check('client broadcast nothing',     client.__lastSent('JEC_TASTING'), undefined);

host.__clearSent();
host.__advanceCheck();
env = host.__lastSent('JEC_TASTING');
check('JEC_TASTING sent',           !!env, true);
check('JEC_TASTING carries the merged board', env.payload.jecWordFrequency[host.__norm('tomato')], 2);
deliver(host, client, env);
check('client reached the Tasting', client.__state().subState, 'tasting');
check('Tasting rows rendered',      client.__el('jec-tasting-list').children.length > 0, true);
check('Tasting rows carry counts',
  /Chefs?</.test(first(client.__el('jec-tasting-list'))), true);
check('no throw on JEC_TASTING',    client.__errors, []);

// Merging is blind, or not at all. Once counts are on screen a tap must be inert,
// or the integrity hole this split exists to close is simply reopened one screen
// later - with the board scored and every Chef able to see what a merge is worth.
host.__tap(host.__norm('tomato'));
check('a merge tap is inert once scored', host.__state().oversight, null);

// Ascending count order: Table for One first, Too Many Cooks last. The merged
// 2-Chef word must therefore sort BELOW the four 1-Chef words.
const tastingRows = client.__el('jec-tasting-list').children.map(c => c.innerHTML);
check('the merged word reveals last',
  /Tomato/.test(tastingRows[tastingRows.length - 1]), true);

// Sous Chef Check OFF skips the sub-state WHOLE — not a Check screen with the
// merge affordance hidden. There is nothing to look at on a blind board.
host.__seat({ players: 3, golden: 30, souschef: false });
client.__seat({ players: 3, golden: 30, souschef: false });
host.__clearSent();
client.__errors.length = 0;
host.__runPrepAll([['a0', 'a1', 'a2'], ['b0', 'b1', 'b2'], ['c0', 'c1', 'c2']],
                  ['', '', ''], [0, 0, 0]);
deliver(host, client, host.__lastSent('JEC_SIFTING'));
check('OFF goes straight to the Tasting', client.__state().subState, 'tasting');
check('OFF host goes straight there too', host.__state().subState,   'tasting');
check('no throw with the Check off',      client.__errors, []);

// The Callouts render for every Chef who called, hit or miss. Three Chefs on
// 'cheese' puts the top count at 3, which is the Crutch's floor.
host.__seat({ players: 4, golden: 30, souschef: false });
client.__seat({ players: 4, golden: 30, souschef: false });
host.__clearSent();
client.__errors.length = 0;
client.sandbox.__timers.length = 0;   // so 'a timer is pending' cannot be vacuous
host.__runPrepAll([['cheese', 'a1', 'a2'], ['cheese', 'b1', 'b2'],
                   ['cheese', 'c1', 'c2'], ['d0', 'd1', 'd2']],
                  ['', '', '', 'cheese'], [0, 0, 0, 0]);
deliver(host, client, host.__lastSent('JEC_SIFTING'));
check('one callout row', client.__el('jec-callouts-list').children.length, 1);
check('callout names the Chef who called',
  /Cass/.test(first(client.__el('jec-callouts-list'))), true);
check('callout marked as a hit',
  /Called It/.test(first(client.__el('jec-callouts-list'))), true);
// The Callouts are the punchline: hidden until the ingredient list has finished.
check('callouts hidden on first paint',
  client.__el('jec-callouts-section').style.display, 'none');
check('a reveal timer is pending', client.sandbox.__timers.length > 0, true);

// A missed call still gets a row — the round says so out loud either way.
host.__seat({ players: 4, golden: 30, souschef: false });
client.__seat({ players: 4, golden: 30, souschef: false });
host.__clearSent();
client.__errors.length = 0;
host.__runPrepAll([['a0', 'a1', 'a2'], ['b0', 'b1', 'b2'],
                   ['c0', 'c1', 'c2'], ['d0', 'd1', 'd2']],
                  ['', '', '', 'parsley'], [0, 0, 0, 0]);
deliver(host, client, host.__lastSent('JEC_SIFTING'));
check('a missed call still gets a row', client.__el('jec-callouts-list').children.length, 1);
check('missed call is not marked a hit',
  /Called It/.test(first(client.__el('jec-callouts-list'))), false);

// ── § 8 Name the Dish ─────────────────────────────────────────────────────────
// The vote runs between The Tasting and The Tally, so the Tally carries the
// round's complete score. Assert the readiness gate in BOTH modes: [].every() is
// true, so a matrix gate can be vacuously open in the mode with no matrix.
host.__seat({ players: 3, golden: 30, fusion: true, souschef: false });
client.__seat({ players: 3, golden: 30, fusion: true, souschef: false });
host.__clearSent();
client.__clearSent();
client.__errors.length = 0;
host.__runPrepAll([['a0', 'a1', 'a2'], ['b0', 'b1', 'b2'], ['c0', 'c1', 'c2']],
                  ['', '', ''], [0, 0, 0], ['Sushizza', 'Pizushi', 'Rice Pie']);
deliver(host, client, host.__lastSent('JEC_SIFTING'));

host.__clearSent();
host.__advanceTasting();
env = host.__lastSent('JEC_NAME_VOTE_BEGIN');
check('vote begin sent', !!env, true);
check('vote begin carries every name',
  pay(env).jecFusionNames, ['Sushizza', 'Pizushi', 'Rice Pie']);
deliver(host, client, env);
check('client on the vote screen',
  client.__screens[client.__screens.length - 1], 'screen-jec-name-vote');
check('ballot lists all three names', client.__el('jec-name-vote-list').children.length, 3);
// Disabled, not hidden — a hidden row shifts every other name up and makes the
// list length itself a tell.
const ballot = k => ((client.__el('jec-name-vote-list').children[k] || {}).disabled);
check('own entry is disabled',      ballot(1), true);
check('another chef stays votable', ballot(0), false);
check('no throw on VOTE_BEGIN',   client.__errors, []);

// The host votes DIRECTLY. mpHandleEnvelope drops every envelope whose originId
// is this device, so a self-sent ACTION would leave the host slot false forever.
host.__clearSent();
host.__vote(0, 1);
check('host sent no self ACTION',
  host.__sent.filter(e => e.type === 'ACTION' && e.payload.action === 'JEC_NAME_VOTE').length, 0);
check('host marked its own slot', host.__state().voteCheck[0], true);
check('gate closed at 1 of 3',    !!host.__lastSent('JEC_NAME_RESULT'), false);

const clientVote = client.__vote(1, 0);
check('client vote is an ACTION', pay(clientVote).action, 'JEC_NAME_VOTE');
deliver(client, host, clientVote);
check('gate still closed at 2 of 3', !!host.__lastSent('JEC_NAME_RESULT'), false);

deliver(client, host, client.__buildVote(2, 0));
env = host.__lastSent('JEC_NAME_RESULT');
check('gate opens at 3 of 3', !!env, true);
check('winner is chef 0',     pay(env).winners, [0]);
deliver(host, client, env);
check('client sees the winner',  client.__state().winners, [0]);
check('the result sub-state is showing',
  client.__el('jec-name-vote-result').style.display, '');
check('no throw on NAME_RESULT', client.__errors, []);

// Nobody voted is a legitimate outcome, and [] is erased in flight.
client.__errors.length = 0;
deliver(host, client, { type: 'SYNC', payload: {
  action: 'JEC_NAME_RESULT', votes: [0, 0, 0], winners: [], bonus: 15 } });
check('empty winners rebuild to []',        client.__state().winners, []);
check('no throw on an empty-winner result', client.__errors, []);

// A self-vote is refused at the host too, not only by the disabled button.
host.__handle({ type: 'ACTION', payload: {
  action: 'JEC_NAME_VOTE', playerIdx: 2, votedForIdx: 2 } });
check('a self-vote is not recorded', host.__state().votes[2], 0);

// Without Fusion the vote does not exist and the round goes straight to scoring.
host.__seat({ players: 3, golden: 30, fusion: false, souschef: false });
client.__seat({ players: 3, golden: 30, fusion: false, souschef: false });
host.__clearSent();
client.__errors.length = 0;
host.__runPrepAll([['a0', 'a1', 'a2'], ['b0', 'b1', 'b2'], ['c0', 'c1', 'c2']],
                  ['', '', ''], [0, 0, 0]);
deliver(host, client, host.__lastSent('JEC_SIFTING'));
host.__clearSent();
host.__advanceTasting();
check('no vote without Fusion',        !!host.__lastSent('JEC_NAME_VOTE_BEGIN'), false);
check('standard path reaches the Tally', !!host.__lastSent('JEC_TALLY'), true);

// Pass-the-Phone: the same gate, driven by cycling one device. This is the mode
// where a matrix-based gate would be vacuously open.
const solo = makeDevice('solo', 'single', 0, []);
solo.__seat({ players: 3, golden: 30, fusion: true, souschef: false });
solo.__runPrepAll([['a0', 'a1', 'a2'], ['b0', 'b1', 'b2'], ['c0', 'c1', 'c2']],
                  ['', '', ''], [0, 0, 0], ['Alpha', 'Bravo', 'Charlie']);
solo.__advanceTasting();
check('PTP on the vote screen',
  solo.__screens[solo.__screens.length - 1], 'screen-jec-name-vote');
check('PTP starts on chef 0', solo.__state().voteIdx, 0);
solo.__vote(0, 0);
check('a self-vote is refused', solo.__state().voteIdx, 0);
solo.__vote(0, 1);
check('PTP advanced to chef 1',      solo.__state().voteIdx, 1);
check('the ballot follows the voter',
  (solo.__el('jec-name-vote-list').children[1] || {}).disabled, true);
solo.__vote(1, 0);
check('PTP not resolved at 2 of 3',  solo.__state().winners, []);
solo.__vote(2, 0);
check('PTP resolved after all 3',    solo.__state().winners, [0]);
check('PTP showed the result',
  solo.__el('jec-name-vote-result').style.display, '');
check('PTP broadcast no result',
  solo.__sent.filter(e => e.payload.action === 'JEC_NAME_RESULT').length, 0);

// ── § 9 The Tally ─────────────────────────────────────────────────────────────
// A bare total tells a Chef what they got, not which bet paid off. The breakdown
// has to survive the wire, and its all-zero and half-dense shapes are exactly
// what Firebase mangles.
// The mock's innerHTML getter is not rebuilt by appendChild, so read the rows.
const rowsHTML = (d, id) => d.__el(id).children.map(c => c.innerHTML).join('');

host.__seat({ players: 4, golden: 30, fusion: false, souschef: false });
client.__seat({ players: 4, golden: 30, fusion: false, souschef: false });
host.__clearSent();
client.__errors.length = 0;
// Three Chefs on 'cheese' puts the top count at 3 — the Crutch's floor — and the
// fourth Chef is the one who called it.
host.__runPrepAll([['cheese', 'a1', 'a2'], ['cheese', 'b1', 'b2'],
                   ['cheese', 'c1', 'c2'], ['d0', 'd1', 'd2']],
                  ['', '', '', 'cheese'], [0, 0, 1, 0]);
deliver(host, client, host.__lastSent('JEC_SIFTING'));
host.__clearSent();
host.__advanceTasting();
env = host.__lastSent('JEC_TALLY');
check('tally sent',                  !!env, true);
check('tally carries a bonus array', Array.isArray(pay(env).bonus), true);
check('bonus length is N',           (pay(env).bonus || []).length, 4);
check('the Crutch bonus is on the wire', ((pay(env).bonus || [])[3] || {}).crutch, 15);
deliver(host, client, env);
check('client scores match host',   client.__state().scores, host.__state().scores);
check('client rendered N rows',     client.__el('jec-tally-list').children.length, 4);
check('client rendered the Called It line',
  /Called It/.test(rowsHTML(client, 'jec-tally-list')), true);
check('the Signature double is named',
  /Signature Dish/.test(rowsHTML(client, 'jec-tally-list')), true);
// Chefs 0 and 1 doubled a golden Signature and Chef 3 called the Crutch; Chef 2
// nominated a Table for One and earned nothing - so three lines, not four.
check('a Chef with no bonus gets no line',
  (rowsHTML(client, 'jec-tally-list').match(/text-amber-600 font-semibold/g) || []).length, 3);
check('no throw on JEC_TALLY',      client.__errors, []);

// An all-zero bonus array is the common case AND the erasure worst case: every
// object is {} means the array is [] means the key is deleted in flight.
client.__errors.length = 0;
deliver(host, client, { type: 'SYNC', payload: {
  action: 'JEC_TALLY', round: 1, rounds: 3,
  roundScores: [0, 0, 0, 0], scores: [0, 0, 0, 0], bonus: [], roundLog: [] } });
check('an erased bonus array still renders N rows',
  client.__el('jec-tally-list').children.length, 4);
check('no bonus line survives the erasure',
  /Called It|On the Menu|Signature Dish/.test(rowsHTML(client, 'jec-tally-list')), false);
check('no throw on an erased bonus', client.__errors, []);

// A half-dense bonus array comes back short and index-keyed — the real risk the
// per-field fallbacks exist for.
client.__errors.length = 0;
deliver(host, client, { type: 'SYNC', payload: {
  action: 'JEC_TALLY', round: 1, rounds: 3,
  roundScores: [0, 15, 0, 0], scores: [0, 15, 0, 0],
  bonus: [null, { signature: 0, crutch: 15, name: 0 }, null, null], roundLog: [] } });
check('a half-dense bonus still renders N rows',
  client.__el('jec-tally-list').children.length, 4);
check('the surviving entry still renders',
  /Called It/.test(rowsHTML(client, 'jec-tally-list')), true);
check('no throw on a half-dense bonus', client.__errors, []);

// Medals by score, not by row index.
check('tie for first takes two golds',   host.__podiumMedals([30, 30, 10]), ['🥇', '🥇', '🥉']);
check('a tie below first shares a medal', host.__podiumMedals([30, 20, 20]), ['🥇', '🥈', '🥈']);
check('fourth place gets a blank slot',   host.__podiumMedals([40, 30, 20, 10]), ['🥇', '🥈', '🥉', '']);
check('a clean sweep is all golds',       host.__podiumMedals([10, 10, 10]), ['🥇', '🥇', '🥇']);

// A Fusion course, all the way to the Cook Book: the pairing, the Instruction and
// the name bonus all have to survive into the log.
host.__seat({ players: 3, golden: 30, fusion: true, instructions: true, souschef: false });
client.__seat({ players: 3, golden: 30, fusion: true, instructions: true, souschef: false });
host.__clearSent();
client.__errors.length = 0;
host.__runPrepAll([['a0', 'a1', 'a2'], ['b0', 'b1', 'b2'], ['c0', 'c1', 'c2']],
                  ['', '', ''], [0, 0, 0], ['Sushizza', 'Pizushi', 'Rice Pie']);
deliver(host, client, host.__lastSent('JEC_SIFTING'));
host.__advanceTasting();
host.__vote(0, 1);
deliver(client, host, client.__buildVote(1, 0));
deliver(client, host, client.__buildVote(2, 0));
host.__clearSent();
host.__finishTally();
env = host.__lastSent('JEC_TALLY');
check('the name bonus reaches the wire', ((pay(env).bonus || [])[0] || {}).name, 15);
deliver(host, client, env);
check('the client renders On the Menu',
  /On the Menu/.test(rowsHTML(client, 'jec-tally-list')), true);
host.__showWashup();
check('the Cook Book shows the Fusion pairing',
  / \+ /.test(rowsHTML(host, 'jec-washup-cookbook')), true);
check('the Cook Book shows the Instruction',
  /italic/.test(rowsHTML(host, 'jec-washup-cookbook')), true);
check('no throw through the Fusion tally', client.__errors, []);

console.log('\njec-loopback: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
