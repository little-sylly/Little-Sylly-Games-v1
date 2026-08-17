// ═══════════════════════════════════════════════════════════════════════════
// verify-nt-loopback.js — HOST ↔ N-CLIENT loopback for Net-Trace, across a wire
// that behaves like Firebase Realtime Database.
//
//   node tools/verify-nt-loopback.js         (exits 1 on any failure)
//   NT_SRC=path/to/broken-copy.js node tools/verify-nt-loopback.js
//   NT_SEED=12345 node tools/verify-nt-loopback.js
//
// Built on tools/verify-cjar-loopback.js (the wire + assertion style), with two
// upgrades taken from tools/verify-shp-loopback.js that this game specifically
// needs:
//
//   • an N-CLIENT room, not a two-device pair. The desync this harness was built
//     for was reported with 1 host + 2 clients, and a 2-device harness cannot
//     reproduce a bug whose symptom is "one client is fine and the other is not".
//   • a SEEDED Math.random per device. ntGenerateNode is unseeded, and the exact
//     randomness it rolls (convertN, below) IS the bug's trigger — so the run has
//     to be reproducible.
//
// WHAT THIS HARNESS EXISTS TO CATCH (both found by static analysis, Aug 2026,
// both instances of the BUG-06 class in logic-engine.md — "Firebase erases every
// EMPTY value"):
//
//   1. ntGenerateNode rolls `convertN = ntRandInt(0, min(ntNativeHoneypots, …))`,
//      which can be 0 — and IS always 0 under the shipped "Native Honeypots: 0"
//      setting. That leaves `nativeHoneypots: []`, which Firebase erases, so a
//      client's node arrives with the field undefined. ntBlockAt and ntDrawMaze
//      read it with no `|| []` guard (five other read sites have one), so the
//      client throws mid-render — after ntRenderBuildGrid already cleared the
//      grid. Blank black terminal, applier aborts, build timer never starts.
//
//   2. A player who places no honeypots produces `fires: []`, erased the same
//      way. The NT_PLAYBACK applier rebuilds allPlacements per-seat but assigns
//      payload.timelines raw, and ntRenderFrame reads `tl.fires.forEach` with no
//      guard (slowSpans IS guarded three lines up). Playback throws on clients.
//
// Neither is visible to a host-only playtest (the host never round-trips its own
// node or timelines through the wire) nor to any 'single'-mode harness (they use
// `getElementById: () => null`, which short-circuits every render guard so no
// render code runs at all). That combination is why these survived to a live
// 3-device session — see CLAUDE.md § Verification harnesses on the shared blind
// spot, and docs/deferred-work.md for the symptom report.
// ═══════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT  = path.join(__dirname, '..');
// NT_SRC lets a deliberately-broken copy be driven through the same wire, which is
// how these fixes were proven to fail before they were proven to pass.
const ntSrc = fs.readFileSync(process.env.NT_SRC || path.join(ROOT, 'js/games/nt.js'), 'utf8');
const SEED  = Number(process.env.NT_SEED || 0) || 0;

// ── The wire ───────────────────────────────────────────────────────────────────
// Copied verbatim from verify-cjar-loopback.js — proven, and self-tested in the
// first section below before anything relies on it.
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

// ── DOM mock with REAL elements ───────────────────────────────────────────────
// A superset of the cjar mock. Every addition below is load-bearing for NT: if it
// is missing the harness throws for the WRONG reason, which masks the real defect
// it was built to catch.
function makeDocument() {
  const byId = {};

  // A no-op 2D context, complete enough for ntDrawMaze / ntDrawLegCanvas /
  // ntRenderFrame. Canvas work must EXECUTE (that is where defect 2 throws), it
  // just doesn't need to paint anything.
  const make2d = canvas => ({
    canvas,
    fillStyle: '', strokeStyle: '', lineWidth: 1, lineJoin: '', lineCap: '',
    globalAlpha: 1, shadowColor: '', shadowBlur: 0, font: '', textAlign: '', textBaseline: '',
    save() {}, restore() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {},
    stroke() {}, fill() {}, fillRect() {}, clearRect() {}, strokeRect() {}, rect() {},
    arc() {}, arcTo() {}, ellipse() {}, quadraticCurveTo() {}, bezierCurveTo() {},
    fillText() {}, strokeText() {}, measureText: () => ({ width: 0 }),
    translate() {}, scale() {}, rotate() {}, setTransform() {}, resetTransform() {},
    clip() {}, setLineDash() {}, getLineDash: () => [],
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    drawImage() {},
  });

  const mk = tag => {
    const el = {
      tagName: tag, children: [], style: {}, dataset: {}, title: '',
      id: '', value: '',
      scrollLeft: 0, scrollTop: 0, scrollWidth: 0, scrollHeight: 0,
      // Reflow reads (`void el.offsetWidth`) and canvas sizing (clientWidth) — both
      // real NT idioms; a missing property reads undefined and silently changes
      // behaviour rather than throwing, so they're seeded with plausible numbers.
      offsetWidth: 300, offsetHeight: 300, clientWidth: 300, clientHeight: 300,
      width: 300, height: 300,
      disabled: false, className: '', textContent: '',
      parentNode: null,
      _html: '',
      get innerHTML() { return this._html; },
      // Unlike the cjar mock, this PARSES a minimal tag/id/class structure out of the
      // assigned string. NT's DNP allocation screen writes its lanes as one innerHTML
      // template and then reaches back for them via getElementById('nt-lane-maze-N')
      // and querySelectorAll('.nt-alloc-lane') — with a store-the-string-only setter
      // those both come back empty and the entire DNP render path is skipped in
      // silence, which is exactly the kind of hole this harness exists to close.
      set innerHTML(v) {
        this._html = String(v);
        this.children = [];
        const re = /<([a-zA-Z][\w-]*)\b([^>]*)>/g;
        let m;
        while ((m = re.exec(this._html)) !== null) {
          const [, tagName, attrs] = m;
          if (/^\//.test(tagName)) continue;
          const idM  = /\bid\s*=\s*["']([^"']+)["']/.exec(attrs);
          const clsM = /\bclass\s*=\s*["']([^"']*)["']/.exec(attrs);
          if (!idM && !clsM) continue;         // only elements a selector could reach
          const child = mk(tagName.toLowerCase());
          if (idM)  { child.id = idM[1]; byId[child.id] = child; }
          if (clsM) child.className = clsM[1];
          child.parentNode = this;
          this.children.push(child);
        }
      },
      // A real classList (the cjar mock no-ops all four). NT paints every build-grid
      // cell through classList.add and repaints counters through remove/add, so a
      // no-op version would make cell-state assertions vacuously pass.
      classList: {
        add(...cs)  { const s = new Set((el.className || '').split(/\s+/).filter(Boolean)); cs.forEach(c => s.add(c)); el.className = [...s].join(' '); },
        remove(...cs) { const s = new Set((el.className || '').split(/\s+/).filter(Boolean)); cs.forEach(c => s.delete(c)); el.className = [...s].join(' '); },
        contains(c) { return (el.className || '').split(/\s+/).includes(c); },
        toggle(c, on) { const has = this.contains(c); const want = on === undefined ? !has : !!on; if (want) this.add(c); else this.remove(c); },
      },
      appendChild(c) { c.parentNode = this; this.children.push(c); return c; },
      append(...cs) { cs.forEach(c => this.appendChild(c)); },
      removeChild(c) { this.children = this.children.filter(x => x !== c); return c; },
      insertBefore(c, ref) {
        c.parentNode = this;
        const i = this.children.indexOf(ref);
        if (i < 0) this.children.push(c); else this.children.splice(i, 0, c);
        return c;
      },
      // ntRenderBuildGrid clones the grid shallowly and swaps it in to strip stale
      // listeners. The clone inherits the id, so getElementById must start resolving
      // to the NEW node or every later read sees the discarded one.
      cloneNode(deep) {
        const copy = mk(this.tagName);
        copy.id = this.id; copy.className = this.className;
        Object.assign(copy.style, this.style);
        if (deep) copy.children = this.children.slice();
        return copy;
      },
      replaceChild(newNode, oldNode) {
        const i = this.children.indexOf(oldNode);
        if (i >= 0) this.children[i] = newNode; else this.children.push(newNode);
        newNode.parentNode = this;
        if (oldNode.id) byId[oldNode.id] = newNode;
        return oldNode;
      },
      remove() { if (this.parentNode) this.parentNode.removeChild(this); },
      setAttribute(k, v) { if (k === 'id') { this.id = v; byId[v] = this; } else if (k === 'class') this.className = v; else this[k] = v; },
      getAttribute(k) { return k === 'class' ? this.className : (this[k] !== undefined ? this[k] : null); },
      addEventListener() {}, removeEventListener() {},
      getContext: () => make2d(el),
      querySelector(sel) { return this.querySelectorAll(sel)[0] || null; },
      querySelectorAll(sel) {
        const out = [];
        const want = String(sel || '').trim();
        const matches = e => {
          if (want.startsWith('.')) return (e.className || '').split(/\s+/).includes(want.slice(1));
          if (want.startsWith('#')) return e.id === want.slice(1);
          return e.tagName === want.toLowerCase();
        };
        const walk = e => { (e.children || []).forEach(c => { if (matches(c)) out.push(c); walk(c); }); };
        walk(this);
        return out;
      },
      getBoundingClientRect: () => ({ top: 0, left: 0, right: 300, bottom: 300, width: 300, height: 300 }),
    };
    return el;
  };

  const doc = {
    body: mk('body'),
    addEventListener() {},
    createElement: mk,
    querySelector: () => null,
    querySelectorAll: () => [],
    // Auto-vivifies, like the cjar mock — the inversion of `() => null`, so every
    // `if (!el) return` guard passes and render code genuinely runs. Auto-created
    // nodes are parented to <body> so ntRenderBuildGrid's parentNode.replaceChild
    // has something real to swap against.
    getElementById(id) {
      if (!byId[id]) {
        const el = mk('div');
        el.id = id;
        el.parentNode = doc.body;
        doc.body.children.push(el);
        byId[id] = el;
      }
      return byId[id];
    },
  };
  return doc;
}

// ── One device ────────────────────────────────────────────────────────────────
function makeDevice(name, mode, myIdx, slots) {
  const timers  = [];
  const screens = [];
  const errors  = [];
  let seq = 0;
  let nextRand = null;

  const sandbox = {
    console,
    document: makeDocument(),
    window: {
      syllyMultiplayerMode: mode,
      syllyDeviceUid: 'u' + myIdx,
      syllySyncLocked: false,
      mpLobbyRoster: null,
      isSecretMode: false,
    },
    performance: { now: () => Date.now() },
    shuffle: a => { const c = [...a]; for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; },
    formatTime: s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`,
    showScreen: id => screens.push(id),
    setTimeout: (fn, ms) => { timers.push({ fn, at: Date.now() + (ms || 0), id: ++seq }); return seq; },
    clearTimeout: id => { const i = timers.findIndex(t => t.id === id); if (i >= 0) timers.splice(i, 1); },
    // setInterval is a no-op by DESIGN: NT's build countdown ticks once a second and
    // calls ntCommit() at zero, which would auto-resolve every cycle out from under
    // the scenario driving it. A test that wants the expiry path calls ntCommit directly.
    setInterval: () => 0, clearInterval: () => {},
    // RAF is a no-op returning a fake handle. Both playback loops re-arm forever while
    // ntPlaybackScrubMs is non-null and read performance.now(), so a real pump hangs.
    // Frame rendering is still exercised — the bridge calls ntRenderFrame directly,
    // which is precisely where defect 2 lives.
    requestAnimationFrame: () => ++seq, cancelAnimationFrame: () => {},
    playLaunch() {}, playWhoosh() {}, playDone() {}, playTick() {}, playBoing() {},
    playAlarm() {}, playSuccess() {}, playExit() {}, playPillClick() {},
    playSyllyOn() {}, playSyllyOff() {}, playSonarPing() {}, playHullThud() {},
    mpLockSync() {}, mpUnlockSync() {},
    mpShowModeScreen() {}, mpReturnToLobby() { sandbox.__returned = true; },
    mpPlayerSlots: slots, mpMyPlayerIdx: myIdx,
    // NT never uses the private channel; make an accidental future use loud.
    mpSendPrivate() { throw new Error('nt.js does not use the private channel'); },
    resetToLobby() { sandbox.__dissolved = true; },
    __dissolved: false, __returned: false,
    __name: name, __screens: screens, __timers: timers, __errors: errors,
  };

  // Deterministic RNG (mulberry32), seeded per device name so a run is reproducible,
  // with a one-shot override for forcing a specific roll. NT_SEED shifts the whole run.
  let a = ((name.length * 2654435761) ^ SEED) >>> 0;
  const defaultRand = () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  sandbox.Math = Object.create(Math);
  sandbox.Math.random = () => {
    if (nextRand !== null) { const v = nextRand; nextRand = null; return v; }
    return defaultRand();
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  const BRIDGE = `
globalThis.__nt = {
  // ── state ──
  get node()          { return ntNode; },
  get inventory()     { return ntInventory; },
  get placements()    { return ntMyPlacements; },
  get cycle()         { return ntCycle; },
  get iterations()    { return ntIterations; },
  get cycleSERs()     { return ntCycleSERs; },
  get overallSER()    { return ntOverallSER; },
  get cycleLatencies(){ return ntCycleLatencies; },
  get teamCycleSERs() { return ntTeamCycleSERs; },
  get timelines()     { return ntPtpTimelines; },
  get ptpPlacements() { return ntPtpPlacements; },
  get gateReady()     { return ntGateReadyCheck; },
  get commitReady()   { return ntCommitReadyCheck; },
  get summaryReady()  { return ntSummaryReadyCheck; },
  get playerCount()   { return ntPlayerCount; },
  get playerNames()   { return ntPlayerNames; },
  get teamIdx()       { return ntTeamIdx; },
  get captainSlots()  { return ntCaptainSlots; },
  get allocations()   { return ntAllocations; },
  get allocPool()     { return ntAllocationPool; },
  get teamWorking()   { return ntTeamWorkingAllocs; },
  get teamLocked()    { return ntTeamAllocLocked; },
  get allPlayerAllocs(){ return ntAllPlayerAllocations; },
  get huddlePhase()   { return ntHuddlePhase; },
  get teamNodes()     { return ntTeamNodes; },
  get allCycleNodes() { return ntAllCycleNodes; },
  get allCycleTimelines() { return ntAllCycleTimelines; },
  get committed()     { return ntCommitted; },
  get cycleResolved() { return ntCycleResolved; },
  get sylly()         { return ntSyllyMode; },
  get summaryMode()   { return ntSummaryMode; },
  get viewingIdx()    { return ntViewingPlayerIdx; },
  get journey()       { return ntPbJourney ? { total: ntPbJourney.total, legs: ntPbJourney.legs.length } : null; },

  // ── config / actions ──
  seat(o) {
    ntPlayerCount     = o.players;
    ntPlayerNames     = o.names;
    ntIterations      = o.iterations !== undefined ? o.iterations : 5;
    ntHardeningWin    = o.win !== undefined ? o.win : 90;
    ntMatrixScale     = o.scale || 18;
    ntNativeHoneypots = o.natives !== undefined ? o.natives : 2;
    ntSyllyMode       = !!o.sylly;
    ntDebugMode       = !!o.debug;
    if (o.teamIdx)      ntTeamIdx      = o.teamIdx.slice();
    if (o.captainSlots) ntCaptainSlots = o.captainSlots.slice();
  },
  startMatch()        { ntStartMatch(); },
  handle(env)         { ntHandleEnvelope(env); },
  commit()            { ntCommit(); },
  genNode(keep, ing)  { return ntGenerateNode(keep, ing); },
  setNode(n)          { ntNode = n; },
  setPlacements(p)    { ntMyPlacements = p.slice(); },
  setCycle(c)         { ntCycle = c; },
  // ── DNP surplus-deposit allocation ──
  get allocBrush()    { return ntAllocBrush; },
  get allocDeposits() { return ntAllocDeposits; },
  allocBank()         { return ntAllocBank(); },
  setBrush(t)         { ntAllocBrush = t; },
  deposit(leg)        { ntDepositAlloc(leg); },
  withdraw(leg)       { ntWithdrawAlloc(leg); },
  undoDeposit()       { ntUndoDeposit(); },
  resetDeposits()     { ntResetDeposits(); },
  timeline()          { return ntComputeTimeline_local(); },
  resolveMdlm(all)    { ntResolveCycleMdlm(all); },
  showBuild(ts)       { ntShowBuild(ts); },
  showSummary(m)      { ntShowSummary(m); },
  renderGrid()        { ntRenderBuildGrid(); },
  drawPort(gridId, port, col, inward, n) {
    return ntDrawPortMarker(document.getElementById(gridId), port, col, inward, n);
  },
  renderFrame(ms)     { ntRenderFrame(ms, true); },
  renderComparison()  { ntRenderComparisonPanel(); },
  renderSummary()     { ntRenderSummary(); },
  buildJourney(t)     { ntPbTeam = t; ntPbJourney = ntBuildJourney(t); return ntPbJourney ? ntPbJourney.legs.length : 0; },
  resetState()        { ntResetState(); },
  // The gate / summary buttons are wired to swappable callbacks (ntGateCallback,
  // ntSummaryCallback). Firing the callback IS what the real click listener does.
  tapGate()           { if (ntGateCallback) ntGateCallback(); },
  tapSummary()        { if (ntSummaryCallback) ntSummaryCallback(); },

  // ── Node Editor (Debug Mode) ──
  showAuthoring()  { ntShowAuthoring(); },
  deploy()         { ntDeployNode(); },
  authTap(x, y)    { ntAuthTap(x, y); },
  setBrushDbg(b)   { ntDebugBrush = b; ntSyncAuthUI(); },
  authRandTerrain(){ ntAuthRandomiseTerrain(); },
  authRandBudget() { ntAuthRandomiseBudget(); },
  bumpFw(n)        { ntInventory.firewall += n; ntSyncAuthUI(); },
  bumpHp(n)        { ntInventory.honeypot += n; ntSyncAuthUI(); },
  pathOk()         { return ntPathExists(ntNode, []); },

  // ── Sandbox retry loop (Debug Mode) ──
  runAgain()       { ntDebugRunAgain(); },
  runAttempt()     { ntDebugRunAttempt(); },

  // ── DOM readers ──
  // Counts painted CELLS only — ntRenderBuildGrid also appends the ghost-preview span
  // and a port marker, so a raw children.length overcounts. Word-boundary match, since
  // a naive substring test would also catch nt-cell-* modifier classes.
  gridCells()      { return document.getElementById('nt-build-grid').children
                       .filter(c => /(^| )nt-cell( |$)/.test(c.className || '')).length; },
  gridPorts()      { return document.getElementById('nt-build-grid').children
                       .filter(c => /(^| )absolute( |$)/.test(c.className || '')).length; },
  authPorts()      { return document.getElementById('nt-auth-grid').children
                       .filter(c => /(^| )absolute( |$)/.test(c.className || '')).length; },
  // The existing gridCells() is hardcoded to nt-build-grid — the editor needs its own.
  authCells()      { return document.getElementById('nt-auth-grid').children
                       .filter(c => /(^| )nt-cell( |$)/.test(c.className || '')).length; },
  gridClasses()    { return document.getElementById('nt-build-grid').children.map(c => c.className); },
  bootLines()      { return document.getElementById('nt-gate-boot-log').children.map(c => c.textContent); },
  bootVisible()    { return document.getElementById('nt-gate-boot-log').style.display; },
  gateBtnText()    { return document.getElementById('btn-nt-gate-ready').textContent; },
  gateBtnOff()     { return !!document.getElementById('btn-nt-gate-ready').disabled; },
  gateBtnShown()   { return document.getElementById('btn-nt-gate-ready').style.display; },
  gateHeading()    { return document.getElementById('nt-gate-heading').textContent; },
  gateSub()        { return document.getElementById('nt-gate-sub').textContent; },
  summaryBtnText() { return document.getElementById('btn-nt-summary-next').textContent; },
  summaryBtnOff()  { return !!document.getElementById('btn-nt-summary-next').disabled; },
  summarySer()     { return document.getElementById('nt-summary-ser').textContent; },
  summaryRows()    { return document.getElementById('nt-summary-board').children.length; },
  chipLabels()     { return document.getElementById('nt-player-chips').children.map(c => c.textContent); },
  thumbs()         { return document.getElementById('nt-thumbnail-row').children.length; },
  buildPlayer()    { return document.getElementById('nt-build-player').textContent; },
  buildCounter()   { return document.getElementById('nt-build-counter').textContent; },
  commitBtnText()  { return document.getElementById('btn-nt-commit').textContent; },
  allocLanes()     { return document.getElementById('nt-alloc-body').querySelectorAll('.nt-alloc-lane').length; },

  // ── Debug / Sandbox Mode ──
  get debugMode()     { return ntDebugMode; },
  get debugBrush()    { return ntDebugBrush; },
  get debugAttempt()  { return ntDebugMyAttempt; },
  get debugBest()     { return ntDebugBest ? ntDebugBest.latencyMs : null; },
  get debugFinished() { return ntDebugFinished; },
  get debugCounts()   { return ntDebugAttemptCounts; },
  rawWin()            { return ntHardeningWin; },     // the STORED value, never the effective one
  setDebug(v)         { ntDebugMode = !!v; },
  effWin()            { return ntEffectiveHardeningWin(); },
  syncSettings()      { ntSyncSettingsUI(); },
  text(id)            { return document.getElementById(id).textContent; },
  shown(id)           { return document.getElementById(id).style.display !== 'none'; },
  cls(id)             { return document.getElementById(id).className; },
};`;

  vm.runInContext(ntSrc + BRIDGE, sandbox, { filename: `nt.js (${name})` });
  sandbox.__forceRandom = v => { nextRand = v; };
  return sandbox;
}

// ── A room: one host, N clients, wired both directions ─────────────────────────
function makeRoom(names) {
  const slots = names.map((n, i) => ({ uid: 'u' + i, nickname: n }));
  const host    = makeDevice('host', 'host', 0, slots);
  const clients = names.slice(1).map((n, i) => makeDevice(n, 'client', i + 1, slots));
  const sent    = [];

  host.mpSendEnvelope = env => {
    const onWire = wire({ ...env, originId: 'u0', timestamp: Date.now() });
    if (!onWire) return;
    sent.push(onWire.payload.action);
    clients.forEach(c => {
      try { c.__nt.handle(onWire); }
      catch (e) { c.__errors.push(`${onWire.payload.action}: ${e.message}`); }
    });
  };
  clients.forEach((c, idx) => {
    c.mpSendEnvelope = env => {
      const onWire = wire({ ...env, originId: 'u' + (idx + 1), timestamp: Date.now() });
      if (!onWire) return;
      try { host.__nt.handle(onWire); }
      catch (e) { host.__errors.push(`${onWire.payload.action}: ${e.message}`); }
    };
  });
  return { host, clients, all: [host, ...clients], sent, slots };
}

// Seat every device in a room with the same settings (each device runs its own
// SETTINGS_SYNC in the real app; here it's one call).
function seatAll(room, opts) {
  const names = room.slots.map(s => s.nickname);
  room.all.forEach(d => d.__nt.seat({ players: names.length, names, ...opts }));
}

// Fire exactly ONE pending timer — the earliest, and only if it is due within `withinMs`.
// The window matters: the host's ntResolveGuard is scheduled at endTimestamp + 4 s (~94 s
// out on a 90 s window) and force-resolves the cycle. Draining blindly would fire it
// immediately and sweep the host to playback before anyone has built anything.
const step = (dev, withinMs = 5000) => {
  if (!dev.__timers.length) return false;
  dev.__timers.sort((a, b) => a.at - b.at);
  if (dev.__timers[0].at > Date.now() + withinMs) return false;
  const t = dev.__timers.shift();
  try { t.fn(); } catch (e) { dev.__errors.push(`timer: ${e.message}`); }
  return true;
};
// Run the near-term chain out — in practice the ~2.4 s gate-boot typewriter. Bounded.
const drain = (dev, cap = 60) => { let n = 0; while (step(dev) && n++ < cap); return n; };
const lastScreen = dev => dev.__screens[dev.__screens.length - 1];
const errs = dev => dev.__errors;

// ── Assertions ────────────────────────────────────────────────────────────────
let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}` +
    (ok ? '' : `\n          expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`));
}
const section = t => console.log(`\n${t}`);

console.log('Net-Trace — host↔client loopback over a Firebase-shaped wire\n' + '='.repeat(62));

// ═══════════════════════════════════════════════════════════════════════════
(() => {

// ── 1. The wire itself ────────────────────────────────────────────────────────
section('The wire itself — Firebase erasure, reproduced');
check('empty object is deleted',      wire({ a: {}, keep: 1 }),            { keep: 1 });
check('empty array is deleted',       wire({ a: [], keep: 1 }),            { keep: 1 });
check('all-null array is deleted',    wire({ a: [null, null], keep: 1 }),  { keep: 1 });
check('null scalar is deleted',       wire({ a: null, keep: 1 }),          { keep: 1 });
check('0 survives',                   wire({ a: 0 }),                      { a: 0 });
check('false survives',               wire({ a: false }),                  { a: false });
check('empty string survives',        wire({ a: '' }),                     { a: '' });
check('dense array round-trips',      wire({ a: [1, 2, 3] }),              { a: [1, 2, 3] });
check('all-zero array round-trips',   wire({ a: [0, 0, 0, 0] }),           { a: [0, 0, 0, 0] });
check('half-dense → object',          wire({ a: [null, 'x', null, 'y'] }), { a: { 1: 'x', 3: 'y' } });
check('mostly-dense → array + holes', wire({ a: ['w', 'x', null, 'y'] }),  { a: ['w', 'x', null, 'y'] });

// ── 2. NT's own payload fields, through that wire ─────────────────────────────
section("NT payload fields — which of them survive a real room");

// A node exactly as ntGenerateNode builds it when convertN rolls 0 (guaranteed under
// the shipped "Native Honeypots: 0" setting, possible under any other).
const bareNode = {
  n: 18,
  ingress: { edge: 'left', idx: 4 }, egress: { edge: 'right', idx: 9 },
  badSectors: [{ ax: 2, ay: 3 }],
  nativeHoneypots: [],
};
const wiredNode = wire({ action: 'NT_GENERATE', cycle: 0, node: bareNode, inventory: { firewall: 6, honeypot: 0 } });
check('node.nativeHoneypots:[] is ERASED in flight', wiredNode.node.nativeHoneypots, undefined);
check('node.badSectors survives when non-empty',     wiredNode.node.badSectors, [{ ax: 2, ay: 3 }]);
check('node.n / ports survive',                      [wiredNode.node.n, wiredNode.node.ingress.idx], [18, 4]);
check('inventory.honeypot:0 survives (scalar)',      wiredNode.inventory.honeypot, 0);
check('cycle:0 survives (scalar)',                   wiredNode.cycle, 0);

const emptyBoard = wire({ node: { n: 18, ingress: { edge: 'left', idx: 4 }, egress: { edge: 'right', idx: 9 }, badSectors: [], nativeHoneypots: [] } });
check('a node with BOTH block arrays empty loses both',
  [emptyBoard.node.badSectors, emptyBoard.node.nativeHoneypots], [undefined, undefined]);

// A timeline exactly as ntComputeTimeline builds it for a player who placed no honeypots.
const bareTl = { polyline: [{ x: 0, y: 4 }, { x: 17, y: 9 }], fires: [], slowSpans: [], samples: [{ t: 0, x: 0, y: 4 }], latencyMs: 1234 };
const wiredPb = wire({ action: 'NT_PLAYBACK', timelines: [bareTl], allPlacements: [[]], cycleSERs: [100], teamCycleSERs: null });
check('timeline.fires:[] is ERASED in flight',       wiredPb.timelines[0].fires, undefined);
check('timeline.slowSpans:[] is ERASED in flight',   wiredPb.timelines[0].slowSpans, undefined);
check('timeline.latencyMs survives',                 wiredPb.timelines[0].latencyMs, 1234);
check('allPlacements[i]:[] is ERASED (BUG-06, already guarded)', wiredPb.allPlacements, undefined);
check('teamCycleSERs:null is ERASED (already guarded)',          wiredPb.teamCycleSERs, undefined);
check('endTimestamp:null is ERASED (harmless — win===0 returns early)',
  wire({ action: 'NT_BUILD_BEGIN', endTimestamp: null, cycle: 2 }).endTimestamp, undefined);

// ── 3. Lobby → NT_GENERATE → the gate, on all three devices ───────────────────
section('Three devices reach the Cycle Initialisation Gate together');
const r1 = makeRoom(['Ali', 'Bec', 'Cam']);
seatAll(r1, { iterations: 5, win: 90, natives: 2 });
r1.host.__nt.startMatch();
r1.all.forEach(d => drain(d));

check('host on the gate',            lastScreen(r1.host), 'screen-nt-gate');
check('both clients on the gate',    r1.clients.map(lastScreen), ['screen-nt-gate', 'screen-nt-gate']);
check('NT_GENERATE was the packet',  r1.sent[0], 'NT_GENERATE');
check('every device has a node',     r1.all.map(d => !!d.__nt.node), [true, true, true]);
check('clients agree with host on grid size', r1.all.map(d => d.__nt.node.n), [18, 18, 18]);
check('heading is the same on all three', r1.all.map(d => d.__nt.gateHeading()),
  ['Cycle Initialisation Gate', 'Cycle Initialisation Gate', 'Cycle Initialisation Gate']);
// The reported "the messages aren't the same for all 3p": every device should type the
// same fixed boot lines and differ ONLY on its own LOGIN: line.
const bootShapes = r1.all.map(d => d.__nt.bootLines().filter(l => !/^LOGIN:/.test(l)));
check('boot log is identical on all three bar LOGIN:', bootShapes[1], bootShapes[0]);
check('…and on the third too',                          bootShapes[2], bootShapes[0]);
check('each device logs in as ITSELF', r1.all.map(d => d.__nt.bootLines().find(l => /^LOGIN:/.test(l))),
  ['LOGIN: ALI', 'LOGIN: BEC', 'LOGIN: CAM']);
check('every device names the simulation', r1.all.map(d => d.__nt.bootLines().some(l => /SIMULATION 1\/5/.test(l))), [true, true, true]);
check('no exceptions anywhere', r1.all.map(errs), [[], [], []]);

// ── 4. The gate readyCheck ────────────────────────────────────────────────────
section('Gate readyCheck — host cannot start until both clients are ready');
check('host button starts disabled', r1.host.__nt.gateBtnOff(), true);
check('host self-marked its own slot', r1.host.__nt.gateReady, [true, false, false]);
r1.clients[0].__nt.tapGate();
check('one client ready — still disabled', r1.host.__nt.gateBtnOff(), true);
check('host recorded seat 1',              r1.host.__nt.gateReady, [true, true, false]);
r1.clients[1].__nt.tapGate();
check('both ready — host button enables',  r1.host.__nt.gateBtnOff(), false);
check('host recorded all seats',           r1.host.__nt.gateReady, [true, true, true]);

// ── 5. NT_BUILD_BEGIN → the grid must render on EVERY device ──────────────────
section('The build grid renders on every device (defect 1)');
r1.host.__nt.tapGate();          // host's callback broadcasts NT_BUILD_BEGIN + shows build
r1.all.forEach(d => drain(d));
const n1 = r1.host.__nt.node.n;
check('host on the build screen',      lastScreen(r1.host), 'screen-nt-build');
check('both clients on the build screen', r1.clients.map(lastScreen), ['screen-nt-build', 'screen-nt-build']);
check('host painted a full grid',      r1.host.__nt.gridCells(), n1 * n1);
check('client A painted a full grid',  r1.clients[0].__nt.gridCells(), n1 * n1);
check('client B painted a full grid',  r1.clients[1].__nt.gridCells(), n1 * n1);
check('no render exceptions on any device', r1.all.map(errs), [[], [], []]);
check('each device labels its OWN admin', r1.all.map(d => d.__nt.buildPlayer()),
  ['user:\\ali', 'user:\\bec', 'user:\\cam']);

// ── 6. The same thing with Native Honeypots: 0 — the deterministic reproduction ─
section('Native Honeypots: 0 — convertN is always 0, so nativeHoneypots:[] every cycle');
const r2 = makeRoom(['Ali', 'Bec', 'Cam']);
seatAll(r2, { iterations: 5, win: 90, natives: 0 });
r2.host.__nt.startMatch();
r2.all.forEach(d => drain(d));
check('host generated an empty native list', r2.host.__nt.node.nativeHoneypots, []);
// The field IS erased in flight — section 2 asserts that against the raw wire. What
// matters here is that the applier repairs it on receipt, so the client holds a usable
// [] rather than the undefined that made ntBlockAt throw per grid cell.
check("…and every client's copy is repaired back to []",
  r2.clients.map(c => c.__nt.node.nativeHoneypots), [[], []]);
check('…not left undefined', r2.clients.map(c => Array.isArray(c.__nt.node.nativeHoneypots)), [true, true]);
r2.clients.forEach(c => c.__nt.tapGate());
r2.host.__nt.tapGate();
r2.all.forEach(d => drain(d));
const n2 = r2.host.__nt.node.n;
check('host still paints a full grid',     r2.host.__nt.gridCells(), n2 * n2);
check('client A paints a full grid',       r2.clients[0].__nt.gridCells(), n2 * n2);
check('client B paints a full grid',       r2.clients[1].__nt.gridCells(), n2 * n2);
check('no client threw mid-render',        r2.clients.map(errs), [[], []]);

// ── 7. Commit → resolve → playback reaches everyone ───────────────────────────
section('NT_COMMIT ×3 → resolve → NT_PLAYBACK lands on every device');
const r3 = makeRoom(['Ali', 'Bec', 'Cam']);
seatAll(r3, { iterations: 5, win: 90, natives: 2 });
r3.host.__nt.startMatch();
r3.all.forEach(d => drain(d));
r3.clients.forEach(c => c.__nt.tapGate());
r3.host.__nt.tapGate();
r3.all.forEach(d => drain(d));
r3.clients.forEach(c => c.__nt.commit());
check('host is waiting on itself only', r3.host.__nt.commitReady, [false, true, true]);
r3.host.__nt.commit();
r3.all.forEach(d => drain(d));
check('host resolved the cycle',        r3.host.__nt.cycleResolved, true);
check('host on playback',               lastScreen(r3.host), 'screen-nt-playback');
check('both clients on playback',       r3.clients.map(lastScreen), ['screen-nt-playback', 'screen-nt-playback']);
check('SERs agree across devices',      r3.clients.map(c => c.__nt.cycleSERs[0]), [r3.host.__nt.cycleSERs[0], r3.host.__nt.cycleSERs[0]]);
check('every device has 3 SERs',        r3.all.map(d => d.__nt.cycleSERs[0].length), [3, 3, 3]);
check('every device viewing itself',    r3.all.map(d => d.__nt.viewingIdx), [0, 1, 2]);
check('comparison chips built on all',  r3.all.map(d => d.__nt.chipLabels().length), [3, 3, 3]);
check('no exceptions anywhere',         r3.all.map(errs), [[], [], []]);

// ── 8. Playback frames for a player who placed no honeypots (defect 2) ────────
section('Playback renders when a timeline carries no honeypot fires (defect 2)');
// Don't WAIT for a fires-free timeline to turn up — whether one does is a function of the
// seed (it depends on whether the path happens to clip a native honeypot's AoE), and a
// check that only fires on some seeds is a check that silently stops testing. Build the
// exact precondition instead, the way cjar's stackDeck() does.
//   The subtlety: samples must be NON-empty while fires is empty. ntRenderFrame guards the
//   whole block on `tl.samples && tl.samples.length`, so a fully-empty timeline would
//   short-circuit before ever reaching the unguarded tl.fires.forEach two lines down.
const firelessTl = {
  polyline:  [{ x: 0, y: 4 }, { x: 9, y: 4 }, { x: 17, y: 9 }],
  samples:   [{ t: 0, x: 0, y: 4 }, { t: 40, x: 5, y: 4 }, { t: 90, x: 17, y: 9 }],
  fires:     [],      // ← erased in flight
  slowSpans: [],      // ← erased in flight (already guarded at the read sites)
  latencyMs: 90,
};
const r3n = r3.host.__nt.playerCount;
r3.host.mpSendEnvelope({ type: 'SYNC', payload: {
  action: 'NT_PLAYBACK', cycle: 0,
  timelines:      Array.from({ length: r3n }, () => JSON.parse(JSON.stringify(firelessTl))),
  allPlacements:  Array.from({ length: r3n }, () => []),
  cycleSERs:      [100, 100, 100],
  overallSER:     [100, 100, 100],
  cycleLatencies: [90, 90, 90],
  teamCycleSERs:  null,
} });
check('the fires-free timeline reached the clients', r3.clients.map(c => !!c.__nt.timelines[0]), [true, true]);
check('fires was repaired to [] on receipt', r3.clients.map(c => c.__nt.timelines[0].fires), [[], []]);
check('samples survived (so the render is not short-circuited)',
  r3.clients.map(c => c.__nt.timelines[0].samples.length), [3, 3]);
r3.all.forEach(d => { try { d.__nt.renderFrame(50); } catch (e) { d.__errors.push('renderFrame: ' + e.message); } });
check('host rendered a frame',     errs(r3.host), []);
check('client A rendered a frame', errs(r3.clients[0]), []);
check('client B rendered a frame', errs(r3.clients[1]), []);

// ── 9. The summary readyCheck ─────────────────────────────────────────────────
section('Diagnostic Summary readyCheck — host waits for every device');
r3.all.forEach(d => d.__nt.showSummary('cycle'));
check('host sees Next Cycle, disabled',  [r3.host.__nt.summaryBtnText(), r3.host.__nt.summaryBtnOff()], ['Next Cycle ▶', true]);
check('clients see Ready, enabled',      r3.clients.map(c => [c.__nt.summaryBtnText(), c.__nt.summaryBtnOff()]),
  [['Ready ▶', false], ['Ready ▶', false]]);
check('host self-marked',                r3.host.__nt.summaryReady, [true, false, false]);
r3.clients[0].__nt.tapSummary();
check('one client ready — still disabled', r3.host.__nt.summaryBtnOff(), true);
check("that client's button now waits",    r3.clients[0].__nt.summaryBtnText(), 'Waiting for host…');
r3.clients[1].__nt.tapSummary();
check('both ready — host enables',       r3.host.__nt.summaryBtnOff(), false);
// One row per player, on every device — MDLM used to render the board not at all.
check('summary board has a row per player',   r3.all.map(d => d.__nt.summaryRows()), [3, 3, 3]);
// Assert the headline is a REAL leader name, not merely "not the placeholder": the mock
// element defaults to '' rather than the HTML's '--.--%', so a !== check passes vacuously.
check('SER headline names the cycle leader on every device',
  r3.all.map(d => ['Ali', 'Bec', 'Cam'].includes(d.__nt.summarySer())), [true, true, true]);
check('all three devices name the SAME leader',
  r3.clients.map(c => c.__nt.summarySer()), [r3.host.__nt.summarySer(), r3.host.__nt.summarySer()]);

// ── 10. Five cycles end to end ────────────────────────────────────────────────
section('Five cycles, three devices — nothing diverges (the reported failure shape)');
const r4 = makeRoom(['Ali', 'Bec', 'Cam']);
seatAll(r4, { iterations: 5, win: 90, natives: 2 });
r4.host.__nt.startMatch();
r4.all.forEach(d => drain(d));

const cycleTrace = [];
for (let c = 0; c < 5; c++) {
  r4.clients.forEach(x => x.__nt.tapGate());
  r4.host.__nt.tapGate();
  r4.all.forEach(d => drain(d));
  const grids = r4.all.map(d => d.__nt.gridCells());
  r4.clients.forEach(x => x.__nt.commit());
  r4.host.__nt.commit();
  r4.all.forEach(d => drain(d));
  const sers = r4.all.map(d => (d.__nt.cycleSERs[c] || []).length);
  cycleTrace.push({ c, grids, sers, screens: r4.all.map(lastScreen) });
  r4.all.forEach(d => d.__nt.showSummary(c === 4 ? 'match' : 'cycle'));
  if (c < 4) {
    r4.clients.forEach(x => x.__nt.tapSummary());
    r4.host.__nt.tapSummary();          // host advances → ntStartMatch() for the next cycle
    r4.all.forEach(d => drain(d));
  }
}
const nn = 18 * 18;
check('every cycle painted a full grid on every device',
  cycleTrace.map(t => t.grids), [[nn, nn, nn], [nn, nn, nn], [nn, nn, nn], [nn, nn, nn], [nn, nn, nn]]);
check('every cycle scored all three players on every device',
  cycleTrace.map(t => t.sers), [[3, 3, 3], [3, 3, 3], [3, 3, 3], [3, 3, 3], [3, 3, 3]]);
check('no device ever diverged on screen',
  cycleTrace.every(t => new Set(t.screens).size === 1), true);
check('five cycles recorded on every device', r4.all.map(d => d.__nt.cycleSERs.length), [5, 5, 5]);
check('overall SER computed for three players', r4.all.map(d => d.__nt.overallSER.length), [3, 3, 3]);
check('no exceptions across the whole match', r4.all.map(errs), [[], [], []]);
check('final summary is the match summary', r4.all.map(d => d.__nt.summaryMode), ['match', 'match', 'match']);

// ── 11. A client leaving dissolves the match ──────────────────────────────────
section('A client leaving dissolves the match for everyone');
const r5 = makeRoom(['Ali', 'Bec', 'Cam']);
seatAll(r5, { iterations: 5, win: 90, natives: 2 });
r5.host.__nt.startMatch();
r5.all.forEach(d => drain(d));
r5.clients[1].mpSendEnvelope({ type: 'ACTION', payload: { action: 'NT_PLAYER_LEFT' } });
check('host tore down',            r5.host.__dissolved, true);
check('the other client tore down', r5.clients[0].__dissolved, true);

// ═══════════════════════════════════════════════════════════════════════════
// DNP / Sylly Mode — 4 players, two teams of two, one captain each
// ═══════════════════════════════════════════════════════════════════════════
const DNP = { iterations: 5, win: 60, natives: 2, sylly: true, teamIdx: [0, 0, 1, 1], captainSlots: [0, 2] };

// ── 12. Huddle start ──────────────────────────────────────────────────────────
section('DNP — the Shared Allocation Hub opens on every device');
const d1 = makeRoom(['Ali', 'Bec', 'Cam', 'Dee']);
seatAll(d1, DNP);
d1.host.__nt.startMatch();
d1.all.forEach(d => drain(d));
check('NT_GENERATE then NT_HUDDLE_START', d1.sent.slice(0, 2), ['NT_GENERATE', 'NT_HUDDLE_START']);
check('every device is on the allocation hub', d1.all.map(lastScreen),
  ['screen-nt-allocation', 'screen-nt-allocation', 'screen-nt-allocation', 'screen-nt-allocation']);
check('every device holds all four leg nodes', d1.all.map(d => d.__nt.teamNodes.filter(Boolean).length), [4, 4, 4, 4]);
check('teams as rostered on every device', d1.all.map(d => d.__nt.teamIdx), [[0,0,1,1],[0,0,1,1],[0,0,1,1],[0,0,1,1]]);
check('each device sees its own team pool', d1.all.map(d => d.__nt.allocPool.firewall > 0), [true, true, true, true]);
check('two legs allocated per team',       d1.all.map(d => d.__nt.allocations.length), [2, 2, 2, 2]);
// The pool is a SURPLUS (3 FW / 1 HP per member), not the team's whole inventory: every
// leg keeps its base untouchably, so a captain can only ever add. Asserted on EVERY
// device — the host computes its own copy and broadcasts a second one in allPools, and
// the two drifting apart is exactly the bug this pins.
check('pool is the per-member surplus, on every device',
  d1.all.map(d => [d.__nt.allocPool.firewall, d.__nt.allocPool.honeypot]),
  [[6, 2], [6, 2], [6, 2], [6, 2]]);
check('legs start at base, whole surplus in hand',
  d1.host.__nt.allocations.reduce((s, a) => s + a.firewall, 0), d1.host.__nt.inventory.firewall * 2);
check('bank starts at the full surplus',
  [d1.host.__nt.allocBank().fw, d1.host.__nt.allocBank().hp], [6, 2]);
check('no exceptions on the DNP render path', d1.all.map(errs), [[], [], [], []]);

// ── 12b. The deposit model itself ─────────────────────────────────────────────
section('DNP — arm a resource, tap a leg to deposit; Undo and Reset restore');
const baseFW = d1.host.__nt.inventory.firewall;
d1.host.__nt.deposit(0);
d1.host.__nt.deposit(0);
check('two firewall deposits landed on leg 0', d1.host.__nt.allocations[0].firewall, baseFW + 2);
check('…and came out of the bank',             d1.host.__nt.allocBank().fw, 4);
check('…leaving the other leg at base',        d1.host.__nt.allocations[1].firewall, baseFW);
check('deposit stack tracks both taps',        d1.host.__nt.allocDeposits.length, 2);
d1.host.__nt.undoDeposit();
check('Undo pops exactly the last deposit',    d1.host.__nt.allocations[0].firewall, baseFW + 1);
check('…and returns it to the bank',           d1.host.__nt.allocBank().fw, 5);
d1.host.__nt.deposit(1);
d1.host.__nt.resetDeposits();
check('Reset All returns every leg to base',
  d1.host.__nt.allocations.map(a => a.firewall), [baseFW, baseFW]);
check('…and the whole surplus to the bank',    d1.host.__nt.allocBank().fw, 6);
check('…and empties the deposit stack',        d1.host.__nt.allocDeposits.length, 0);

// Overspend must be refused rather than clamped silently — drain the surplus, then
// keep tapping. The bank never goes negative and the leg never gains a free firewall.
for (let i = 0; i < 6; i++) d1.host.__nt.deposit(0);
check('the surplus drains to exactly zero',    d1.host.__nt.allocBank().fw, 0);
d1.host.__nt.deposit(0);
d1.host.__nt.deposit(1);
check('taps past an empty bank are refused',   d1.host.__nt.allocBank().fw, 0);
check('…and add nothing to any leg',
  d1.host.__nt.allocations.reduce((s, a) => s + a.firewall, 0), baseFW * 2 + 6);
d1.host.__nt.resetDeposits();

// D29 (16 Aug 2026) removed the per-leg honeypot ceiling entirely — same reasoning as
// firewall, which never had one: concentrating surplus on one leg is a captain judgement
// call (inefficiency, or a deliberate bet), never an out-of-bounds proposal. Force
// natives to 4 (the old ceiling would have been ZERO) so a successful deposit here is
// unambiguous proof there's no leg-level bound left, on every seed.
section('DNP — honeypot deposits have no per-leg ceiling (same as firewall)');
d1.host.__nt.setBrush('honeypot');
const baseHP    = d1.host.__nt.inventory.honeypot;
const surplusHP = 2;                                 // NT_SURPLUS_HONEYPOT(1) × 2 members
d1.host.__nt.teamNodes[0].nativeHoneypots = [{ax:0,ay:0},{ax:2,ay:0},{ax:4,ay:0},{ax:6,ay:0}];
for (let i = 0; i < 8; i++) d1.host.__nt.deposit(0);   // tap well past the old ceiling
check('deposits land past where the old (natives=4) ceiling would have been zero',
  d1.host.__nt.allocations[0].honeypot > baseHP, true);
check('bounded only by the bank, not any per-leg number',
  d1.host.__nt.allocations[0].honeypot, baseHP + surplusHP);
check('no exceptions from repeated deposits',  errs(d1.host), []);
d1.host.__nt.resetDeposits();
d1.host.__nt.teamNodes[0].nativeHoneypots = [];      // restore for sections below that read it
d1.host.__nt.setBrush('firewall');

// The per-leg bound is gone, but the TEAM POOL ceiling is not — that's the one bound
// honeypot still shares with firewall. The host is the authority, not the captain's
// device: an over-pool proposal must never land, however it arrives.
const poolHost = d1.host.__nt.allocPool;
const overPoolHpProposal = [{ firewall: baseFW, honeypot: poolHost.honeypot + 99 }, { firewall: baseFW, honeypot: 0 }];
const teamWorkBefore = JSON.stringify(d1.host.__nt.teamWorking[0]);
d1.clients[0].mpSendEnvelope({ type: 'ACTION',
  payload: { action: 'NT_ALLOCATION_UPDATE', allocations: overPoolHpProposal } });
check('host rejects an over-pool honeypot proposal', JSON.stringify(d1.host.__nt.teamWorking[0]), teamWorkBefore);
// (The LOCK path shares that validator — asserted in the lock section below, where a
// team locks legitimately. Sending a LOCK here would lock team 0 early and quietly make
// the later "both captains lock" checks vacuous.)

// ── 13. Allocation updates travel and are validated ───────────────────────────
section('DNP — a captain rebalances, the host validates and re-broadcasts');
const capB = d1.clients[1];      // seat 2 = Cam = team 1 captain
const poolB = capB.__nt.allocPool;
capB.mpSendEnvelope({ type: 'ACTION', payload: { action: 'NT_ALLOCATION_UPDATE',
  allocations: [{ firewall: poolB.firewall, honeypot: poolB.honeypot }, { firewall: 0, honeypot: 0 }] } });
check('host accepted the rebalance', d1.host.__nt.teamWorking[1][0].firewall, poolB.firewall);
check('…and zeroed the other leg',   d1.host.__nt.teamWorking[1][1].firewall, 0);
check('team 0 untouched',            d1.host.__nt.teamWorking[0].length, 2);
const beforeReject = JSON.stringify(d1.host.__nt.teamWorking[1]);
capB.mpSendEnvelope({ type: 'ACTION', payload: { action: 'NT_ALLOCATION_UPDATE',
  allocations: [{ firewall: poolB.firewall + 99, honeypot: 0 }, { firewall: 0, honeypot: 0 }] } });
check('an over-pool allocation is rejected outright', JSON.stringify(d1.host.__nt.teamWorking[1]), beforeReject);
// Current behaviour, asserted so a future change is visible: the host checks the sender's
// TEAM but never that the sender is that team's captain. Flagged in deferred-work.
const nonCap = d1.clients[2];    // seat 3 = Dee = team 1, NOT captain
nonCap.mpSendEnvelope({ type: 'ACTION', payload: { action: 'NT_ALLOCATION_UPDATE',
  allocations: [{ firewall: 1, honeypot: 0 }, { firewall: 2, honeypot: 0 }] } });
check('KNOWN GAP: a non-captain can drive their team allocation', d1.host.__nt.teamWorking[1][1].firewall, 2);

// ── 14. Both teams lock → build begins with per-player inventory ──────────────
section('DNP — both captains lock, everyone builds their own leg');
d1.host.__nt.tapGate;    // (host captain locks via the hub, not the gate)
vm.runInContext('ntCommitAllocation();', d1.host);          // team 0 captain = host
// Team 1's captain locks a proposal putting the whole honeypot pool's worth on one leg
// — legal now that there's no per-leg ceiling, so LOCK must commit it exactly as
// proposed (same convention as the firewall rebalance test above: the proposal is the
// leg's raw claimed total, not base+pool — the validator checks the TEAM SUM against
// the pool ceiling, not that any individual leg matches a "physically deposited" total).
// LOCK still shares the same host-side validator as UPDATE (only the team-pool ceiling
// remains in it) — falling back to the last valid working state if that bound is ever
// violated, which is what the over-pool check above already exercises.
capB.mpSendEnvelope({ type: 'ACTION', payload: { action: 'NT_ALLOCATION_LOCK',
  allocations: [{ firewall: 0, honeypot: poolB.honeypot }, { firewall: 0, honeypot: 0 }] } });
check('team 1 locks', d1.host.__nt.teamLocked[1], true);
check('…and commits the full honeypot pool on one leg, no ceiling clamp',
  (d1.host.__nt.allPlayerAllocs[2] || { honeypot: 0 }).honeypot, poolB.honeypot);
d1.all.forEach(d => drain(d));
check('both teams locked', d1.host.__nt.teamLocked, [true, true]);
check('NT_BUILD_BEGIN went out', d1.sent.includes('NT_BUILD_BEGIN'), true);
check('every device is building', d1.all.map(lastScreen),
  ['screen-nt-build', 'screen-nt-build', 'screen-nt-build', 'screen-nt-build']);
check('every device painted its leg', d1.all.map(d => d.__nt.gridCells()), [nn, nn, nn, nn]);
check('every device got an assigned inventory', d1.all.map(d => typeof d.__nt.inventory.firewall), ['number','number','number','number']);
check('no exceptions', d1.all.map(errs), [[], [], [], []]);

// ── 15. Cluster-ceiling scoring ───────────────────────────────────────────────
section('DNP — Cluster Ceiling scoring across the wire');
d1.clients.forEach(c => c.__nt.commit());
d1.host.__nt.commit();
d1.all.forEach(d => drain(d));
check('cycle resolved', d1.host.__nt.cycleResolved, true);
check('four player SERs on every device', d1.all.map(d => (d.__nt.cycleSERs[0] || []).length), [4, 4, 4, 4]);
check('two team SERs on every device',    d1.all.map(d => (d.__nt.teamCycleSERs[0] || []).length), [2, 2, 2, 2]);
check('client team SERs match the host',  d1.clients.map(c => c.__nt.teamCycleSERs[0]),
  [d1.host.__nt.teamCycleSERs[0], d1.host.__nt.teamCycleSERs[0], d1.host.__nt.teamCycleSERs[0]]);
// Cluster ceiling = Σ per-leg max(teamA, teamB); the two team SERs are each team's
// share of that same denominator, so together they must exceed 100% only if both
// teams contributed — assert the identity the formula guarantees instead of a literal.
const lat = d1.host.__nt.cycleLatencies[0];
const ceiling = Math.max(lat[0], lat[2]) + Math.max(lat[1], lat[3]);
check('team 0 SER = Σ team latencies / cluster ceiling',
  Math.round(d1.host.__nt.teamCycleSERs[0][0] * 100) / 100,
  Math.round(((lat[0] + lat[1]) / ceiling) * 100 * 100) / 100);
check('every device is on playback', d1.all.map(lastScreen),
  ['screen-nt-playback', 'screen-nt-playback', 'screen-nt-playback', 'screen-nt-playback']);
check('no exceptions', d1.all.map(errs), [[], [], [], []]);

// ── 16. Journey playback ──────────────────────────────────────────────────────
section('DNP — the team bridge journey builds on every device');
check('each device builds a two-leg journey for team 0', d1.all.map(d => d.__nt.buildJourney(0)), [2, 2, 2, 2]);
check('and for team 1',                                  d1.all.map(d => d.__nt.buildJourney(1)), [2, 2, 2, 2]);
check('journey totals agree across devices',
  d1.clients.map(c => c.__nt.journey.total), [d1.host.__nt.journey.total, d1.host.__nt.journey.total, d1.host.__nt.journey.total]);
check('no exceptions building journeys', d1.all.map(errs), [[], [], [], []]);

// ── 16b. The DNP summary actually READS the team layer ────────────────────────
// ntTeamCycleSERs was computed, broadcast and applied from the day DNP shipped, and
// read by no render function at all — the summary showed a flat per-player leaderboard
// in a mode whose whole point is teams. These checks are what make that visible.
section('DNP — the summary is by TEAM, not a flat player list');
d1.all.forEach(d => d.__nt.renderSummary());
const teamNames = ['Amaze Inc.', 'Pender Securities'];
check('headline names a TEAM, not a player',
  d1.all.map(d => teamNames.includes(d.__nt.summarySer())), [true, true, true, true]);
check('every device agrees on the leader',
  d1.clients.map(c => c.__nt.summarySer()),
  [d1.host.__nt.summarySer(), d1.host.__nt.summarySer(), d1.host.__nt.summarySer()]);
check('board is two team cards, not four player rows',
  d1.all.map(d => d.__nt.summaryRows()), [2, 2, 2, 2]);
check('no exceptions rendering the DNP summary', d1.all.map(errs), [[], [], [], []]);

// ── 17. Appliers with no producer ─────────────────────────────────────────────
section('Appliers that nothing sends — documented, not silently "fixed"');
const probe = makeDevice('probe', 'client', 1, [{ uid: 'u0', nickname: 'A' }, { uid: 'u1', nickname: 'B' }]);
probe.__nt.seat({ players: 2, names: ['A', 'B'] });
let summaryErr = null;
try { probe.__nt.handle({ type: 'SYNC', payload: { action: 'NT_SUMMARY', type: 'cycle', cycleSERs: [50, 100], overallSER: [50, 100] } }); }
catch (e) { summaryErr = e.message; }
check('NT_SUMMARY applies cleanly (but nothing sends it)', summaryErr, null);
let goErr = null;
try { probe.__nt.handle({ type: 'SYNC', payload: { action: 'NT_GAMEOVER', overallSER: [50, 100] } }); }
catch (e) { goErr = e.constructor.name; }
// ntShowMatchSummary() does not exist anywhere in the repo. Nothing sends NT_GAMEOVER,
// so this is unreachable in play — pinned here so it stays a known gap rather than a
// surprise if a future change ever wires a producer up to it.
check('KNOWN GAP: NT_GAMEOVER calls an undefined function', goErr, 'ReferenceError');

// ── Debug Mode: the setting, its exclusivity, and the superseded window ───────
section('Debug Mode — settings');
(() => {
  const d = makeDevice('solo', 'single', 0, [{ uid: 'u0', nickname: 'Ali' }]);

  d.__nt.seat({ players: 1, names: ['Ali'], win: 90, debug: false });
  check('effective window is the real one when Debug is off', d.__nt.effWin(), 90);

  d.__nt.seat({ players: 1, names: ['Ali'], win: 90, debug: true });
  check('effective window is 0 (∞) when Debug is on',         d.__nt.effWin(), 0);
  // Superseded, NOT overwritten — the player's stored choice must come back intact when
  // Debug is switched off again, which is the whole distinction from "mutually exclusive".
  check('…while the STORED setting is left untouched',        d.__nt.rawWin(), 90);

  // Superseded + mutually-exclusive dimming, painted by ntSyncSettingsUI().
  d.__nt.syncSettings();
  check('Hardening Window controls are dimmed',
        /opacity-50/.test(d.__nt.cls('nt-ctl-win')), true);
  check('…with an amber reason line, not a silent dead control',
        d.__nt.text('nt-reason-win'), 'Debug Mode has no time limit');
  check('Iterations controls are dimmed too',
        /pointer-events-none/.test(d.__nt.cls('nt-ctl-iters')), true);
  check('Sylly toggle is dimmed while Debug is on',
        d.__nt.text('nt-reason-sylly'), 'Unavailable while Debug Mode is on');

  d.__nt.seat({ players: 1, names: ['Ali'], win: 90, debug: false });
  d.__nt.syncSettings();
  check('turning Debug off restores the Hardening Window controls',
        /opacity-50/.test(d.__nt.cls('nt-ctl-win')), false);
  check('…and clears its reason line', d.__nt.text('nt-reason-win'), '');
  check('no exceptions', errs(d), []);
})();

// ── The shared port marker ────────────────────────────────────────────────────
section('Port markers — one drawing function, two grids');
(() => {
  const d = makeDevice('ports', 'single', 0, [{ uid: 'u0', nickname: 'Ali' }]);
  d.__nt.seat({ players: 1, names: ['Ali'] });
  d.__nt.genNode();
  d.__nt.renderGrid();
  check('build grid draws exactly two port markers', d.__nt.gridPorts(), 2);

  // The extracted function must be callable against ANY grid element, not just the build one.
  const n = d.__nt.node.n;
  d.__nt.drawPort('nt-auth-grid', d.__nt.node.ingress, '#34d399', true, n);
  d.__nt.drawPort('nt-auth-grid', d.__nt.node.egress, '#334155', false, n);
  check('…and the same function serves a second grid', d.__nt.authPorts(), 2);
  check('no exceptions', errs(d), []);
})();

// ── The Node Editor ───────────────────────────────────────────────────────────
section('Node Editor — authoring the same object ntGenerateNode() returns');
(() => {
  const d = makeDevice('editor', 'single', 0, [{ uid: 'u0', nickname: 'Ali' }]);
  d.__nt.seat({ players: 1, names: ['Ali'], scale: 18, natives: 2, debug: true });
  d.__nt.showAuthoring();

  check('opens the Node Editor',      lastScreen(d), 'screen-nt-authoring');
  check('starts on a BLANK board',
        [d.__nt.node.badSectors.length, d.__nt.node.nativeHoneypots.length], [0, 0]);
  check('…which is legal — an empty maze routes',  d.__nt.pathOk(), true);
  check('budget starts at zero',
        [d.__nt.inventory.firewall, d.__nt.inventory.honeypot], [0, 0]);
  check('grid renders every tile',    d.__nt.authCells(), 18 * 18);
  check('…plus the two port markers', d.__nt.authPorts(), 2);
  check('brush defaults to Bad Sector', d.__nt.debugBrush, 'bad');

  // Bad Sector brush — a 2×2 block, anchored and clamped like every other NT placement.
  d.__nt.authTap(4, 4);
  check('one tap draws one Bad Sector', d.__nt.node.badSectors.length, 1);
  check('…written into ntNode, NOT into placements', d.__nt.placements.length, 0);
  d.__nt.authTap(4, 4);
  check('tapping it again erases it',   d.__nt.node.badSectors.length, 0);

  // Native Honeypot brush, capped by the Native Honeypots setting (2 here).
  d.__nt.setBrushDbg('native');
  d.__nt.authTap(4, 4); d.__nt.authTap(8, 8); d.__nt.authTap(12, 12);
  check('native honeypots are capped by ntNativeHoneypots',
        d.__nt.node.nativeHoneypots.length, 2);

  // Budget ceilings.
  d.__nt.bumpFw(999);
  check('firewall budget is capped at the block-slot count ((18/2)² = 81)',
        d.__nt.inventory.firewall, 81);
  d.__nt.bumpFw(-999);
  check('…and floored at zero', d.__nt.inventory.firewall, 0);
  d.__nt.bumpHp(999);
  check('honeypot budget ceiling accounts for the natives already placed (4 − 2)',
        d.__nt.inventory.honeypot, 2);

  // Ports. The two generation heuristics are deliberately NOT enforced on a human author.
  d.__nt.setBrushDbg('ingress');
  d.__nt.authTap(0, 3);
  check('ingress moves to the tapped border tile',
        [d.__nt.node.ingress.edge, d.__nt.node.ingress.idx], ['left', 3]);
  d.__nt.setBrushDbg('egress');
  d.__nt.authTap(0, 5);
  check('egress may sit on the SAME edge as ingress — a human choice, not a bad roll',
        [d.__nt.node.egress.edge, d.__nt.node.egress.idx], ['left', 5]);
  check('…and the node still routes', d.__nt.pathOk(), true);
  d.__nt.authTap(0, 3);
  check('but the two ports may never share one mouth',
        [d.__nt.node.egress.edge, d.__nt.node.egress.idx], ['left', 5]);

  // Randomise — both produce an editable starting point; nothing is committed yet.
  // Re-author egress off left/5 → left/10 first: left/5's mouth tile is a 2×2 bad sector under
  // ntGenerateNode's OWN seed-0 roll (block at ax0/ay5 covers tiles (0,5) and (0,6)), which makes
  // the KEEP branch below unreachable at the default seed no matter what the fix does. left/10
  // keeps the same "shares an edge with ingress" authoring choice, clear of that block.
  d.__nt.setBrushDbg('egress');
  d.__nt.authTap(0, 10);
  check('egress re-authored to left/10 for the randomise-terrain check below',
        [d.__nt.node.egress.edge, d.__nt.node.egress.idx], ['left', 10]);

  d.__nt.bumpFw(7);
  const budgetBefore = { ...d.__nt.inventory };
  d.__nt.authRandTerrain();
  check('Randomise Terrain fills the board', d.__nt.node.badSectors.length > 0, true);
  // Ports are not terrain: the authored pair (left/3, left/10) must be KEPT across a re-roll —
  // unless the freshly-rolled terrain happens to block it, in which case the fallback pair
  // ntGenerateNode rolled must be used instead. Both branches are legitimate, and which one fires
  // is genuinely RNG-dependent (a bad sector can land on an authored mouth tile on some seeds) —
  // so probe the contract directly rather than hard-coding one branch's outcome. The probe
  // mutates the live node's ports and reads them back through the same ntPathExists the fix
  // itself calls; it changes nothing ntAuthRandomiseTerrain didn't already decide, so this proves
  // the KEEP/FALLBACK rule itself rather than depending on one lucky (or unlucky) seed.
  const keptIngress = { ...d.__nt.node.ingress }, keptEgress = { ...d.__nt.node.egress };
  d.__nt.node.ingress = { edge: 'left', idx: 3 };
  d.__nt.node.egress  = { edge: 'left', idx: 10 };
  const authoredWouldRoute = d.__nt.pathOk();
  d.__nt.node.ingress = keptIngress;   // put the real outcome back exactly as authRandTerrain left it
  d.__nt.node.egress  = keptEgress;
  const keptIsAuthored = keptIngress.edge === 'left' && keptIngress.idx === 3 &&
                          keptEgress.edge === 'left' && keptEgress.idx === 10;
  check('authored ports are kept iff they still route, dropped for the roll\'s own pair otherwise',
        authoredWouldRoute ? keptIsAuthored : !keptIsAuthored,
        true);
  check('…and leaves the budget alone (keepInventory)', d.__nt.inventory, budgetBefore);
  check('…and only ever produces a routable node', d.__nt.pathOk(), true);

  const terrainBefore = JSON.stringify(d.__nt.node.badSectors);
  d.__nt.authRandBudget();
  check('Randomise Budget leaves the terrain alone',
        JSON.stringify(d.__nt.node.badSectors), terrainBefore);
  check('…and rolls a firewall budget inside the real match range (6%–30% of 81)',
        d.__nt.inventory.firewall >= 5 && d.__nt.inventory.firewall <= 24, true);

  check('no exceptions anywhere in the editor', errs(d), []);
})();

// ── Deploying an authored node over the wire ──────────────────────────────────
section('Deploy Node — an authored node is shape-identical to a rolled one');
(() => {
  const r = makeRoom(['Ali', 'Bec', 'Cam']);
  seatAll(r, { win: 90, debug: true });

  // The host authors an ENTIRELY EMPTY node — no bad sectors, no native honeypots. This is
  // legitimate ("what is the baseline latency with no hardening at all?") and IMPOSSIBLE to
  // produce today, because ntGenerateNode has a bad-sector density floor. It is also the most
  // dangerous shape on the wire: Firebase deletes an empty array, so both collections vanish
  // in flight and every unguarded render read throws per grid cell (NT's own BUG-15/16).
  r.host.__nt.showAuthoring();
  check('host is in the editor',   lastScreen(r.host), 'screen-nt-authoring');
  check('the authored node is bare',
        [r.host.__nt.node.badSectors.length, r.host.__nt.node.nativeHoneypots.length], [0, 0]);

  r.host.__nt.deploy();
  r.all.forEach(drain);

  check('NT_GENERATE is reused verbatim — no new packet', r.sent.includes('NT_GENERATE'), true);
  check('every device landed on the gate',
        r.all.map(lastScreen), ['screen-nt-gate', 'screen-nt-gate', 'screen-nt-gate']);
  check('clients rebuilt badSectors after the wire erased it',
        r.clients.map(c => Array.isArray(c.__nt.node.badSectors)), [true, true]);
  check('…and nativeHoneypots too',
        r.clients.map(c => Array.isArray(c.__nt.node.nativeHoneypots)), [true, true]);
  check('clients agree with the host on the ports',
        r.clients.map(c => c.__nt.node.ingress.idx),
        [r.host.__nt.node.ingress.idx, r.host.__nt.node.ingress.idx]);

  // The real test of hazard 2: the grid must RENDER on a client without throwing.
  r.clients.forEach(c => c.__nt.renderGrid());
  check('an empty authored node renders on both clients',
        r.clients.map(c => c.__nt.gridCells()), [18 * 18, 18 * 18]);
  check('…with no exceptions anywhere', r.all.map(errs), [[], [], []]);

  // Sizing rule — the readiness arrays are length-N, never [].
  check('ntDebugFinished is length-N all-false, NOT []',
        r.host.__nt.debugFinished, [false, false, false]);
  check('ntDebugAttemptCounts is length-N all-zero, NOT []',
        r.host.__nt.debugCounts, [0, 0, 0]);
})();

// ── The retry loop ────────────────────────────────────────────────────────────
section('Retry loop — unlimited attempts, zero packets');
(() => {
  const r = makeRoom(['Ali', 'Bec']);
  seatAll(r, { win: 90, debug: true });
  r.host.__nt.showAuthoring();
  r.host.__nt.authRandTerrain();
  r.host.__nt.bumpFw(8);
  r.host.__nt.deploy();
  r.all.forEach(drain);

  const client = r.clients[0];
  // makeRoom's `sent` array records the HOST's sends only, so counting it would prove nothing
  // about a client's packets. Tap this client's own send instead — the claim under test is
  // "a retrying player sends nothing", and this is the only way to actually observe that.
  const clientPackets = [];
  const clientSend = client.mpSendEnvelope;
  client.mpSendEnvelope = env => { clientPackets.push(env.payload.action); return clientSend(env); };

  client.__nt.showBuild();
  check('build screen header reads ATTEMPT, not the cycle counter',
        client.__nt.text('nt-build-title-label'), 'STAGING — ATTEMPT');
  check('…starting at 1',        client.__nt.buildCounter(), '1');
  check('Clear All is offered in Debug', client.__nt.shown('btn-nt-build-clear'), true);
  check('the timer shows ∞',     client.__nt.text('nt-build-timer'), '∞');

  // Attempt 1 — an EMPTY build. Legitimate: it is how you measure baseline latency.
  client.__nt.commit();
  check('attempt 1 counted',      client.__nt.debugAttempt, 1);
  check('…and became the best by default', client.__nt.debugBest !== null, true);
  check('attempt 1 sent NO packet', clientPackets, []);

  const first = client.__nt.debugBest;
  client.__nt.runAgain();
  check('Run Again returns to the build screen', lastScreen(client), 'screen-nt-build');
  check('…and the header advances', client.__nt.buildCounter(), '2');

  // Attempt 2 — a real build. More hardening means a LONGER trace, which in NT is BETTER:
  // the defender is slowing the intruder down, and the longest delay scores 100% SER.
  client.__nt.setPlacements([{ ax: 4, ay: 4, type: 'firewall' }, { ax: 8, ay: 8, type: 'firewall' }]);
  client.__nt.commit();
  check('attempt 2 counted',      client.__nt.debugAttempt, 2);
  check('a slower trace is a NEW BEST (higher latency wins in NT)',
        client.__nt.debugBest >= first, true);
  const second = client.__nt.debugBest;

  // Attempt 3 — deliberately worse. Best must NOT regress to "last".
  client.__nt.runAgain();
  client.__nt.setPlacements([]);
  client.__nt.commit();
  check('attempt 3 counted',      client.__nt.debugAttempt, 3);
  check('best is BEST, not LAST', client.__nt.debugBest, second);
  check('three attempts still sent NO packets', clientPackets, []);
  check('no exceptions', r.all.map(errs), [[], []]);
})();

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n' + '='.repeat(62));
console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);

})();
