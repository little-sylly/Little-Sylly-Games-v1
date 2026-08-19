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
  hpCentres()         { return ntHoneypotCentres(ntNode, ntMyPlacements); },
  aoeRadiusSq()       { return NT_HONEYPOT_RADIUS_SQ; },
  honeypotDuration()  { return NT_HONEYPOT_DURATION; },
  resolveMdlm(all)    { ntResolveCycleMdlm(all); },
  showBuild(ts)       { ntShowBuild(ts); },
  showSummary(m)      { ntShowSummary(m); },
  renderGrid()        { ntRenderBuildGrid(); },
  drawPort(gridId, port, col, inward, w, h) {
    return ntDrawPortMarker(document.getElementById(gridId), port, col, inward, w, h);
  },
  mouthIdxs(port, w, h)       { return ntMouthIdxs(port, w, h); },
  mouthTiles(port, w, h)      { return ntMouthTiles(port, w, h); },
  mouthsIntersect(a, b, w, h) { return ntMouthsIntersect(a, b, w, h); },
  portCorner(port, w, h)      { return ntPortCorner(port, w, h); },
  portCands(edge, idx, w, h)  { return ntPortCandidates(edge, idx, w, h); },
  pathOkWith(p)    { return ntPathExists(ntNode, p); },
  cellType(tx, ty) { return ntCellType(tx, ty); },
  setInv(fw, hp)   { ntInventory = { firewall: fw, honeypot: hp }; },
  place(tx, ty, hp){ ntAttemptPlace(tx, ty, !!hp); },
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
  startSolo()      { ntStartSolo(); },
  showDebugConfig(){ ntShowDebugConfig(); },
  deployDims(w, h) { ntDebugLastW = w; ntDebugLastH = h; ntShowAuthoring(); },
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
  finish()         { ntDebugFinish(); },
  setBest(p)       { ntDebugBest = { latencyMs: 1000, placements: p.slice(), timeline: ntComputeTimeline_local() }; },
  // The mock's innerHTML setter parses every id/class-bearing tag FLAT, so a raw children.length
  // would also count the two spans inside each row. Filter to the row wrapper's own class.
  rosterRows()     { return document.getElementById('nt-standby-roster').children
                       .filter(c => /rounded-xl/.test(c.className || '')).length; },

  // ── DOM readers ──
  // Counts painted CELLS only — ntRenderBuildGrid also appends the ghost-preview span
  // and a port marker, so a raw children.length overcounts. Word-boundary match, since
  // a naive substring test would also catch nt-cell-* modifier classes.
  gridCells()      { return document.getElementById('nt-build-grid').children
                       .filter(c => /(^| )nt-cell( |$)/.test(c.className || '')).length; },
  gridPorts()      { return document.getElementById('nt-build-grid').children
                       .filter(c => /(^| )absolute( |$)/.test(c.className || '')).length; },
  authPorts()      { return document.getElementById('nt-auth-grid').children
                       .filter(c => /(^| )nt-port-marker( |$)/.test(c.className || '')).length; },
  // Every bar, primary or wrapped — an L-shaped corner mouth contributes two.
  authPortBars()   { return document.getElementById('nt-auth-grid').children
                       .filter(c => /(^| )nt-port-(marker|wrap)( |$)/.test(c.className || '')).length; },
  // The LAST wrap segment drawn — the perpendicular arm of an L.
  lastPortWrap()   { const w = document.getElementById('nt-auth-grid').children
                       .filter(c => /(^| )nt-port-wrap( |$)/.test(c.className || '')); return w[w.length - 1] || null; },
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
  logsContentCount(){ return document.getElementById('nt-logs-content').children.length; },
  logsContentText() { return document.getElementById('nt-logs-content').children.map(c => c.textContent).join(' '); },
  logPillLabels()   { return document.getElementById('nt-logs-player-chips').children.map(c => c.textContent); },
  logPillShown()    { return document.getElementById('nt-logs-player-chips').style.display; },
  logPillActive()   { return document.getElementById('nt-logs-player-chips').children
                         .findIndex(c => /pill-active-emerald/.test(c.className || '')); },
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
  get debugAttempts() { return ntDebugAttempts; },
  get debugAttemptsBySeat() { return ntDebugAttemptsBySeat; },
  get debugFinished() { return ntDebugFinished; },
  get debugCounts()   { return ntDebugAttemptCounts; },
  openLogs(i)         {
    // The mock auto-vivifies missing elements as childless divs (deliberately — the inversion
    // of getElementById:()=>null — see the comment on getElementById above), so the overlay's
    // real '.overlay-data-inner' child (present in index.html, absent from this stub DOM) has
    // to be seeded once before ntOpenLogs's scroll-reset line has anything to find.
    const overlay = document.getElementById('nt-logs-overlay');
    if (!overlay.querySelector('.overlay-data-inner')) {
      const inner = document.createElement('div');
      inner.className = 'overlay-data-inner';
      overlay.appendChild(inner);
    }
    ntOpenLogs(i);
  },
  openLogAttempt(p, a){ ntOpenLogAttempt(p, a); },
  // The mock's addEventListener is a no-op (see getElementById's own comment on the class),
  // so a simulated .click() can never reach the pill's real handler — call the function the
  // handler calls directly, which is the whole of what the handler does.
  switchLog(i)        { ntRenderDebugLog(i); },
  rawWin()            { return ntHardeningWin; },     // the STORED value, never the effective one
  setDebug(v)         { ntDebugMode = !!v; },
  effWin()            { return ntEffectiveHardeningWin(); },
  syncSettings()      { ntSyncSettingsUI(); },
  text(id)            { return document.getElementById(id).textContent; },
  // The mock creates every element with style:{} — style.display is undefined until code
  // actually sets it. A "!== 'none'" test reads true for BOTH a real "" (shown, code ran)
  // and an untouched undefined (nothing ran), so it can never fail regardless of whether
  // the code under test runs at all. Requiring the exact "" the suite's own show/hide idiom
  // uses (nt.js sets '' to show, 'none' to hide — see ntShowBuild/ntRenderSummary) makes an
  // untouched element read as NOT shown, same as a hidden one — the discriminating case.
  shown(id)           { return document.getElementById(id).style.display === ''; },
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
  w: 18, h: 18,
  ingress: { edge: 'left', idx: 4 }, egress: { edge: 'right', idx: 9 },
  badSectors: [{ ax: 2, ay: 3 }],
  nativeHoneypots: [],
};
const wiredNode = wire({ action: 'NT_GENERATE', cycle: 0, node: bareNode, inventory: { firewall: 6, honeypot: 0 } });
check('node.nativeHoneypots:[] is ERASED in flight', wiredNode.node.nativeHoneypots, undefined);
check('node.badSectors survives when non-empty',     wiredNode.node.badSectors, [{ ax: 2, ay: 3 }]);
check('node.w/h / ports survive',                    [wiredNode.node.w, wiredNode.node.h, wiredNode.node.ingress.idx], [18, 18, 4]);
check('inventory.honeypot:0 survives (scalar)',      wiredNode.inventory.honeypot, 0);
check('cycle:0 survives (scalar)',                   wiredNode.cycle, 0);

const emptyBoard = wire({ node: { w: 18, h: 18, ingress: { edge: 'left', idx: 4 }, egress: { edge: 'right', idx: 9 }, badSectors: [], nativeHoneypots: [] } });
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
check('clients agree with host on grid size', r1.all.map(d => d.__nt.node.w), [18, 18, 18]);
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
const n1 = r1.host.__nt.node.w;
check('host on the build screen',      lastScreen(r1.host), 'screen-nt-build');
check('both clients on the build screen', r1.clients.map(lastScreen), ['screen-nt-build', 'screen-nt-build']);
check('host painted a full grid',      r1.host.__nt.gridCells(), n1 * n1);
check('client A painted a full grid',  r1.clients[0].__nt.gridCells(), n1 * n1);
check('client B painted a full grid',  r1.clients[1].__nt.gridCells(), n1 * n1);
check('no render exceptions on any device', r1.all.map(errs), [[], [], []]);
check('each device labels its OWN admin', r1.all.map(d => d.__nt.buildPlayer()),
  ['user:\\ali', 'user:\\bec', 'user:\\cam']);
// Debug's Clear All button is Debug-only — outside Debug it must stay hidden. The paired
// "it IS offered in Debug" assertion lives in the Debug section further down.
check('Clear All is hidden outside Debug', r1.host.__nt.shown('btn-nt-build-clear'), false);

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
const n2 = r2.host.__nt.node.w;
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
// The Debug-only staging caption must stay hidden on a Standard summary. The paired
// "…and the caption IS visible" assertion lives in the Debug summary section further down.
check('the Debug staging caption is hidden outside Debug', r3.host.__nt.shown('nt-summary-caption'), false);

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
  const { w, h } = d.__nt.node;
  d.__nt.drawPort('nt-auth-grid', d.__nt.node.ingress, '#34d399', true, w, h);
  d.__nt.drawPort('nt-auth-grid', d.__nt.node.egress, '#334155', false, w, h);
  check('…and the same function serves a second grid', d.__nt.authPorts(), 2);

  // A marker spans the MOUTH, not one tile — and it measures against the port's own
  // axis. On an 18-wide board a standard 2-unit mouth is 11.11% wide; a corner mouth
  // is half that. Spec §6.2.
  const mk = (port) => d.__nt.drawPort('nt-auth-grid', port, '#34d399', true, 18, 18);
  const std = mk({ edge: 'top', idx: 4 });
  check('a standard top marker spans two tiles',
        std.style.width, 'calc(11.11111111111111%)');
  check('…offset to the first mouth tile', std.style.left, '22.22222222222222%');
  const cnr = mk({ edge: 'top', idx: 17, corner: true });
  check('a wrapped corner marker spans one tile',
        cnr.style.width, 'calc(5.555555555555555%)');
  check('…and a FLUSH corner marker still spans two',
        mk({ edge: 'top', idx: 0 }).style.width, 'calc(11.11111111111111%)');
  // The L. A wrapped top-right mouth puts its primary arm along the TOP at column 17
  // and its perpendicular arm down the RIGHT at row 0 — one tile each, both straddling
  // their own border. Asserting the arm's EDGE (right:-3px, not left) is what catches a
  // perpEdge mix-up; asserting its offset is what catches a perpIdx read off the wrong
  // axis. Neither is visible to the bar COUNT that sits beside this.
  mk({ edge: 'top', idx: 17, corner: true });
  const arm = d.__nt.lastPortWrap();
  check('the second arm of the L runs down the RIGHT edge',
        [arm.style.right, arm.style.width], ['-3px', '6px']);
  check('…starting at row 0, one tile tall',
        [arm.style.top, arm.style.height], ['0%', 'calc(5.555555555555555%)']);
  check('…and carries no direction arrow', arm.children.length, 0);

  const vert = mk({ edge: 'left', idx: 4 });
  check('a left marker spans on the vertical axis',
        [vert.style.height, vert.style.width], ['calc(11.11111111111111%)', '6px']);
  check('…and keeps the border straddle', vert.style.left, '-3px');

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
  d.__nt.bumpFw(7);
  const budgetBefore = { ...d.__nt.inventory };
  d.__nt.authRandTerrain();
  check('Randomise Terrain fills the board', d.__nt.node.badSectors.length > 0, true);
  // Ports re-roll too now (owner-requested, 19 Aug 2026) — Randomise Terrain no longer restores
  // a hand-authored pair over the fresh roll. Can't assert the ports CHANGED (the RNG could
  // legitimately re-roll the same edge/idx by chance, and this section runs across NT_SEED=0..7
  // per the suite convention), so assert the actual contract instead: whatever came back routes,
  // on its own, with no fallback/keep logic left to probe.
  check('…and only ever produces a routable node', d.__nt.pathOk(), true);
  check('…and leaves the budget alone (keepInventory)', d.__nt.inventory, budgetBefore);

  const terrainBefore = JSON.stringify(d.__nt.node.badSectors);
  d.__nt.authRandBudget();
  check('Randomise Budget leaves the terrain alone',
        JSON.stringify(d.__nt.node.badSectors), terrainBefore);
  check('…and rolls a firewall budget inside the real match range (6%–30% of 81)',
        d.__nt.inventory.firewall >= 5 && d.__nt.inventory.firewall <= 24, true);

  check('no exceptions anywhere in the editor', errs(d), []);
})();

section('Sandbox Initialisation — dimensions gate the authored node');
(() => {
  const d = makeDevice('cfg', 'single', 0, [{ uid: 'u0', nickname: 'Ali' }]);
  d.__nt.seat({ players: 1, names: ['Ali'], scale: 18, debug: true });
  d.__nt.startSolo();
  check('Debug entry opens the config screen, not the editor',
        lastScreen(d), 'screen-nt-debug-config');

  d.__nt.deployDims(16, 18);
  check('…then the editor',            lastScreen(d), 'screen-nt-authoring');
  check('node takes the chosen w/h',   [d.__nt.node.w, d.__nt.node.h], [16, 18]);
  check('grid renders w×h cells',      d.__nt.authCells(), 16 * 18);
  check('…and still routes',           d.__nt.pathOk(), true);
  check('no exceptions',               errs(d), []);
})();

// ── Mouth derivation ──────────────────────────────────────────────────────────
// The mouth is DERIVED from { edge, idx, corner? }. It is ALWAYS two units wide: at a
// corner it either sits FLUSH (both units along one edge) or WRAPS (one unit on each of
// the two edges meeting there, both fronting the same tile). It never truncates — that
// is maze.game's behaviour, and the old collapse-to-one rule is what made a door flush
// against a corner unauthorable. Spec §1, §3.1.
section('Mouth derivation — always two units; flush or wrapped at a corner');
(() => {
  const d = makeDevice('mouth', 'single', 0, [{ uid: 'u0', nickname: 'Ali' }]);
  d.__nt.seat({ players: 1, names: ['Ali'] });
  const M = (edge, idx, w, h) => d.__nt.mouthIdxs({ edge, idx }, w, h);

  const C  = (edge, idx, w, h) => d.__nt.mouthIdxs({ edge, idx, corner: true }, w, h);
  const PC = (port, w, h) => d.__nt.portCorner(port, w, h);

  check('mid-edge port spans two units',           M('left', 4, 18, 18),  [4, 5]);
  check('idx 0 is FLUSH, not collapsed',           M('left', 0, 18, 18),  [0, 1]);
  check('idx len-1 clamps back to the last that fits', M('left', 17, 18, 18), [16, 17]);
  check('idx len-2 spans two',                     M('left', 16, 18, 18), [16, 17]);
  check('idx 1 spans two',                         M('left', 1, 18, 18),  [1, 2]);

  // The wrapped form is now the ONLY one-unit mouth, and it is opt-in.
  check('a wrapped corner is one unit on its edge', C('left', 0, 18, 18),  [0]);
  check('…and at the far end too',                 C('left', 17, 18, 18), [17]);
  check('a wrapped corner names its corner',
        (c => [c.name, c.perpEdge, c.perpIdx])(PC({ edge: 'top', idx: 17, corner: true }, 18, 18)),
        ['top-right', 'right', 0]);
  check('…and the SAME corner reached from the other edge',
        (c => [c.name, c.perpEdge, c.perpIdx])(PC({ edge: 'right', idx: 0, corner: true }, 18, 18)),
        ['top-right', 'top', 17]);
  check('a non-corner port has no corner info',    PC({ edge: 'top', idx: 4 }, 18, 18), null);
  // Rectangular discriminator: perpIdx must come from the OTHER axis. On 16×20 a
  // wrapped bottom-left port's perpendicular unit sits at row 19, not column 15.
  check('wrapped corner perpIdx measures the other axis',
        (c => [c.tx, c.ty, c.perpEdge, c.perpIdx])(PC({ edge: 'bottom', idx: 0, corner: true }, 16, 20)),
        [0, 19, 'left', 19]);

  // Per-axis length. On a 16-wide × 20-high node a LEFT port's last index is 19 and a
  // TOP port's is 15. A swapped (h, w) argument order exchanges them — invisible on a
  // square node, which is why these four checks are the D46 discriminator for this
  // function. See spec §8.3.
  check('left port measures against h',            M('left', 19, 16, 20), [18, 19]);
  check('…and idx 15 is nowhere near its end',     M('left', 15, 16, 20), [15, 16]);
  check('top port measures against w',             M('top', 15, 16, 20),  [14, 15]);
  check('…and an out-of-range idx clamps to it',   M('top', 19, 16, 20),  [14, 15]);
  check('a wrapped left port ends at h-1, not w-1', C('left', 19, 16, 20), [19]);
  check('a wrapped top port ends at w-1',           C('top', 19, 16, 20),  [15]);

  check('mouth tiles follow the span — left edge',
        d.__nt.mouthTiles({ edge: 'left', idx: 4 }, 18, 18), [[0, 4], [0, 5]]);
  check('mouth tiles follow the span — bottom edge',
        d.__nt.mouthTiles({ edge: 'bottom', idx: 3 }, 16, 20), [[3, 19], [4, 19]]);

  // Overlap is a TILE-SET test, not an idx-span test on a shared edge: two corner ports
  // on DIFFERENT edges can meet at the same physical tile. Spec §3.3, §7.5.
  const I = (a, b) => d.__nt.mouthsIntersect(a, b, 18, 18);
  check('same-edge mouths one apart overlap',
        I({ edge: 'left', idx: 3 }, { edge: 'left', idx: 4 }), true);
  check('same-edge mouths two apart do not',
        I({ edge: 'left', idx: 3 }, { edge: 'left', idx: 5 }), false);
  check('wrapped corner ports meeting at the SAME tile overlap',
        I({ edge: 'left', idx: 0, corner: true }, { edge: 'top', idx: 0, corner: true }), true);
  check('wrapped corner ports at OPPOSITE ends do not',
        I({ edge: 'left', idx: 0, corner: true }, { edge: 'top', idx: 17, corner: true }), false);
  // A flush mouth reaches one tile further than the wrapped form, so a pair that missed
  // under the old collapse rule now genuinely shares a tile. This is the check that
  // fails if idx 0 ever goes back to being one unit.
  check('two FLUSH mouths meeting at a corner overlap',
        I({ edge: 'left', idx: 0 }, { edge: 'top', idx: 0 }), true);

  check('no exceptions', errs(d), []);
})();

// ── Endpoint snapping ─────────────────────────────────────────────────────────
// With one half of a mouth blocked, the route must use the OTHER half — and the
// off-board stub and border point must carry that same half, or the runner enters at
// the seam and jogs sideways on every run. Spec §4.3, §4.4.
section('Endpoint snapping — the stubs track the half the route used');
(() => {
  const NODE_18 = () => ({ w: 18, h: 18,
    ingress: { edge: 'left',  idx: 4 },
    egress:  { edge: 'right', idx: 9 },
    badSectors: [], nativeHoneypots: [] });

  const d = makeDevice('snap', 'single', 0, [{ uid: 'u0', nickname: 'Ali' }]);
  d.__nt.seat({ players: 1, names: ['Ali'] });

  // Unblocked: the route uses the FIRST half (idx 4 → y 4.5), since Dijkstra settles
  // sources in NT_STEPS order and both halves are equidistant from the egress.
  d.__nt.setNode(NODE_18());
  d.__nt.setPlacements([]);
  let tl = d.__nt.timeline();
  check('polyline is [outside, border, interior, …, interior, border, outside]',
        tl.polyline.length >= 6, true);
  check('an unobstructed mouth enters through a half of itself',
        [4.5, 5.5].includes(tl.polyline[2].y), true);

  // Half-block the ingress: anchor (0,3) covers (0,3) (1,3) (0,4) (1,4) — mouth tile
  // (0,4) goes solid, (0,5) stays open.
  d.__nt.setNode(NODE_18());
  d.__nt.setPlacements([{ ax: 0, ay: 3, type: 'firewall' }]);
  tl = d.__nt.timeline();
  check('a half-blocked mouth still routes',        tl.polyline.length >= 6, true);
  check('…through the OPEN half (y 5.5, not 4.5)',  tl.polyline[2].y,        5.5);
  check('…the border point shares that half',       tl.polyline[1].y,        5.5);
  check('…and so does the off-board stub',          tl.polyline[0].y,        5.5);
  check('…the stub is off the board on the left',   tl.polyline[0].x,        -0.6);
  check('no kink: stub, border and interior are colinear in y',
        [tl.polyline[0].y, tl.polyline[1].y, tl.polyline[2].y], [5.5, 5.5, 5.5]);

  // D46's finite-geometry tripwire, re-run against a resolved (not nominal) endpoint —
  // this is the shape ntResolveHalf's fallback exists to keep catchable.
  check('every polyline point is still finite',
        tl.polyline.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)), true);
  check('every sample is still finite',
        tl.samples.every(s => Number.isFinite(s.x) && Number.isFinite(s.y) && Number.isFinite(s.t)), true);

  // Fully blocking the mouth (anchor (0,4) covers BOTH (0,4) and (0,5)) leaves no open
  // source, so there is no route at all.
  d.__nt.setNode(NODE_18());
  d.__nt.setPlacements([{ ax: 0, ay: 4, type: 'firewall' }]);
  check('a fully-blocked mouth yields no route', d.__nt.timeline().polyline, []);

  check('no exceptions', errs(d), []);
})();

// ── Placement legality ────────────────────────────────────────────────────────
// The mouth reservation is GONE. ntPathExists is the only gate, and half-block-legal
// / full-block-rejected / corner-unblockable all fall out of it. Spec §5.
section('Placement legality — narrowing a door is legal, sealing it is not');
(() => {
  const NODE_18 = () => ({ w: 18, h: 18,
    ingress: { edge: 'left',  idx: 4 },
    egress:  { edge: 'right', idx: 9 },
    badSectors: [], nativeHoneypots: [] });

  const d = makeDevice('legality', 'single', 0, [{ uid: 'u0', nickname: 'Ali' }]);
  d.__nt.seat({ players: 1, names: ['Ali'] });
  d.__nt.setNode(NODE_18());
  d.__nt.setPlacements([]);

  // The gate itself. Ingress mouth is (0,4) and (0,5).
  check('a 2×2 clear of the mouth routes',
        d.__nt.pathOkWith([{ ax: 0, ay: 6, type: 'firewall' }]), true);
  check('covering ONE half narrows the door — still routes',
        d.__nt.pathOkWith([{ ax: 0, ay: 3, type: 'firewall' }]), true);
  check('covering BOTH halves seals it — no route',
        d.__nt.pathOkWith([{ ax: 0, ay: 4, type: 'firewall' }]), false);

  // A FLUSH corner mouth is two tiles like any other — that is the whole point of the
  // change; a door against a corner is no longer half a door. Spec §5.3.
  const flush = NODE_18(); flush.ingress = { edge: 'left', idx: 0 };
  d.__nt.setNode(flush);
  check('a flush corner mouth is two tiles',
        d.__nt.mouthTiles(flush.ingress, 18, 18), [[0, 0], [0, 1]]);
  check('a 2×2 clear of a flush corner mouth routes',
        d.__nt.pathOkWith([{ ax: 0, ay: 2, type: 'firewall' }]), true);
  check('…and a 2×2 over BOTH its halves seals it',
        d.__nt.pathOkWith([{ ax: 0, ay: 0, type: 'firewall' }]), false);

  // A WRAPPED corner mouth is one tile, so there is no half to give up: any 2×2
  // covering it removes the only source. That asymmetry is the mechanic, not a gap —
  // and it is now the player's choice to author it, rather than the model's default.
  const corner = NODE_18(); corner.ingress = { edge: 'left', idx: 0, corner: true };
  d.__nt.setNode(corner);
  check('a wrapped corner mouth is one tile',
        d.__nt.mouthTiles(corner.ingress, 18, 18), [[0, 0]]);
  check('a 2×2 clear of a wrapped corner mouth routes',
        d.__nt.pathOkWith([{ ax: 0, ay: 2, type: 'firewall' }]), true);
  check('a wrapped corner port cannot be narrowed at all',
        d.__nt.pathOkWith([{ ax: 0, ay: 0, type: 'firewall' }]), false);

  // End-to-end through the real placement path — this is what proves the reservation
  // is actually deleted, not merely unreachable.
  d.__nt.setNode(NODE_18());
  d.__nt.setPlacements([]);
  d.__nt.setInv(10, 0);
  d.__nt.renderGrid();
  d.__nt.place(0, 3, false);
  check('the build screen accepts a half-blocking placement', d.__nt.placements.length, 1);
  d.__nt.place(0, 4, false);
  check('…and refuses the one that would seal the mouth',     d.__nt.placements.length, 1);

  // The vacant mouth still paints as a door; a firewall on one half shadows it, which
  // is the only thing on the grid that shows the door was narrowed. Spec §6.1.
  d.__nt.setNode(NODE_18());
  d.__nt.setPlacements([]);
  check('both vacant mouth tiles paint as port',
        [d.__nt.cellType(0, 4), d.__nt.cellType(0, 5)], ['port', 'port']);
  d.__nt.setPlacements([{ ax: 0, ay: 3, type: 'firewall' }]);
  check('a firewall on one half shadows the port paint',
        [d.__nt.cellType(0, 4), d.__nt.cellType(0, 5)], ['firewall', 'port']);

  check('no exceptions', errs(d), []);
})();

// ── Node Editor port authoring ────────────────────────────────────────────────
// Two-unit mouths make near-misses overlap: ingress left/3 spans [3,4] and egress
// left/4 spans [4,5], sharing tile 4. An overlapping mouth makes one sub-cell both a
// BFS source and a goal — a zero-length route. Spec §7.5.
section('Node Editor — overlapping mouths are refused');
(() => {
  const d = makeDevice('authports', 'single', 0, [{ uid: 'u0', nickname: 'Ali' }]);
  d.__nt.seat({ players: 1, names: ['Ali'], scale: 18, natives: 0, debug: true });
  d.__nt.showAuthoring();

  d.__nt.setBrushDbg('ingress');
  d.__nt.authTap(0, 3);
  check('ingress authored to left/3',
        [d.__nt.node.ingress.edge, d.__nt.node.ingress.idx], ['left', 3]);

  // left/4 spans [4,5] and shares tile (0,4) with the ingress mouth [3,4].
  d.__nt.setBrushDbg('egress');
  const before = { ...d.__nt.node.egress };
  d.__nt.authTap(0, 4);
  check('an egress whose mouth OVERLAPS the ingress is refused',
        [d.__nt.node.egress.edge, d.__nt.node.egress.idx], [before.edge, before.idx]);

  // left/5 spans [5,6] — adjacent to the ingress mouth but disjoint. Legal.
  d.__nt.authTap(0, 5);
  check('an adjacent but disjoint mouth is accepted',
        [d.__nt.node.egress.edge, d.__nt.node.egress.idx], ['left', 5]);
  check('…and the node still routes', d.__nt.pathOk(), true);

  check('no exceptions', errs(d), []);
})();

// ── Honeypot firing ───────────────────────────────────────────────────────────
// A honeypot fires the instant the runner is within its FOOTPRINT-based AoE and its
// own cooldown has fully elapsed (SW v209) — not on entry, and not gated by the runner
// ever leaving. The distance test is against the block's 2×2 rectangle (nearest point),
// not its dead centre — SW v209 corrected the earlier centre-distance model, which D45
// (SW v208) had wrongly kept after rejecting Minkowski at the wrong radius. Calibrated
// against maze.game's on-screen trigger counts — see nt-implementation-notes D44/D46.
section('Honeypot firing — footprint AoE, cooldown-gated, not entry-triggered');
(() => {
  const d = makeDevice('hpfire', 'single', 0, [{ uid: 'u0', nickname: 'Ali' }]);
  d.__nt.seat({ players: 1, names: ['Ali'], scale: 18, natives: 2 });
  // A HAND-BUILT node, not a rolled one. A rolled node may put every honeypot far from
  // the route, and then fires and entries are both zero and every assertion below is
  // vacuously true — which is exactly what happened on the first draft of this section:
  // it passed identically with the hysteresis deleted. Ingress left/4 → egress right/4
  // runs the route straight along y≈4.5; the honeypot block at (8,7) centres on (9,8),
  // footprint [8,10]×[7,9] — the route's closest approach to the FOOTPRINT is 2.5 tiles
  // (dy from y=4.5 to the footprint's y=7 edge), comfortably inside the 2√2 AoE.
  d.__nt.setNode({ w: 18, h: 18,
    ingress: { edge: 'left',  idx: 4 },
    egress:  { edge: 'right', idx: 4 },
    badSectors: [], nativeHoneypots: [{ ax: 8, ay: 7 }] });
  d.__nt.setPlacements([]);
  const tl = d.__nt.timeline();
  const hps = d.__nt.hpCentres();
  const R2 = d.__nt.aoeRadiusSq();

  // The expectation is derived from the TRAJECTORY, not from the firing code — count
  // outside→inside transitions along samples[] and compare. D42's rule: capture the
  // expected value independently of the machinery under test. Footprint distance,
  // matching checkFires: nearest point on [hp.x-1,hp.x+1]×[hp.y-1,hp.y+1], not the
  // centre — a centre-distance count here would diverge from the real fires whenever
  // the closest approach is inside the footprint radius but outside the centre one.
  let entries = 0;
  hps.forEach(hp => {
    let inside = false;
    tl.samples.forEach(s => {
      const nx = Math.max(hp.x - 1, Math.min(s.x, hp.x + 1));
      const ny = Math.max(hp.y - 1, Math.min(s.y, hp.y + 1));
      const dx = nx - s.x, dy = ny - s.y;
      const now = dx * dx + dy * dy <= R2;
      if (now && !inside) entries++;
      inside = now;
    });
  });
  check('the board has a honeypot on the route to fire at all', hps.length, 1);
  check('…and the route actually triggers it', tl.fires.length > 0, true);
  check('…exactly once — one pass, one entry', tl.fires.length, 1);
  check('fires equal the route’s distinct AoE entries', tl.fires.length, entries);

  // The v209 invariant: two fires of the SAME honeypot are never less than
  // NT_HONEYPOT_DURATION apart, however the runner moves in between — no exit needed,
  // no early re-fire on re-entry either. This replaces the v208 "must leave first"
  // check, which asserted the opposite of what v209 deliberately does.
  const duration = d.__nt.honeypotDuration();
  let violations = 0;
  hps.forEach(hp => {
    const mine = tl.fires.filter(f => f.x === hp.x && f.y === hp.y).map(f => f.atMs);
    for (let i = 1; i < mine.length; i++) {
      if (mine[i] - mine[i - 1] < duration) violations++;
    }
  });
  check('no honeypot re-fires before its own cooldown has fully elapsed', violations, 0);
  check('no exceptions', errs(d), []);
  // A genuine multi-fire case — a route that actually revisits the same honeypot's AoE
  // more than once, cooldown gaps enforced throughout — needs a maze shape this
  // single-honeypot hand-built board doesn't produce (its shortest path only brushes
  // the AoE once). That case is proven against real recorded data instead:
  // `node tools/nt-slow-fit.js maze-puzzles/boards/191490.json` — a board whose
  // shortest path visits all 3 honeypots more than once, every consecutive per-
  // honeypot gap >= NT_HONEYPOT_DURATION, trigger counts matching the owner's own
  // recorded hits. See nt-implementation-notes D46.
})();

// ── The corner cycle ──────────────────────────────────────────────────────────
// A single tap cannot name three different doors, and maze.game has three at every
// corner. Tapping the corner again advances the cycle. Away from a corner there is
// only ever one placement, so the tap means exactly what it always did.
section('Node Editor — tapping a corner cycles wrapped → flush → flush');
(() => {
  const d = makeDevice('cornercycle', 'single', 0, [{ uid: 'u0', nickname: 'Ali' }]);
  d.__nt.seat({ players: 1, names: ['Ali'], scale: 18, natives: 0, debug: true });
  d.__nt.showAuthoring();
  d.__nt.setBrushDbg('ingress');
  const P = () => { const p2 = d.__nt.node.ingress; return [p2.edge, p2.idx, !!p2.corner]; };

  // Top-left. The nearest-edge sort resolves the (0,0) tie to 'top', so the cycle runs
  // wrapped → flush along top → flush down left → back.
  d.__nt.authTap(0, 0);
  check('first tap on a corner gives the WRAPPED door', P(), ['top', 0, true]);
  check('…drawn as an L — two bars for two ports',
        [d.__nt.authPorts(), d.__nt.authPortBars()], [2, 3]);
  d.__nt.authTap(0, 0);
  check('second tap gives the FLUSH door along the tapped edge', P(), ['top', 0, false]);
  check('…and a flush door is a single bar again',
        [d.__nt.authPorts(), d.__nt.authPortBars()], [2, 2]);
  check('…spanning two tiles', d.__nt.mouthTiles(d.__nt.node.ingress, 18, 18), [[0, 0], [1, 0]]);
  d.__nt.authTap(0, 0);
  check('third tap gives the FLUSH door along the other edge', P(), ['left', 0, false]);
  check('…spanning two tiles down that edge',
        d.__nt.mouthTiles(d.__nt.node.ingress, 18, 18), [[0, 0], [0, 1]]);
  d.__nt.authTap(0, 0);
  check('fourth tap returns to the wrapped door', P(), ['top', 0, true]);

  // The FAR end of an edge. The flush option must store the last idx a two-unit mouth
  // actually fits in (len-2), not the corner index itself. Storing len-1 renders the
  // same mouth — ntMouthIdxs re-clamps it — so only reading .idx back catches it, and
  // an idx that disagrees with its own mouth is the exact hazard the generator's
  // bound exists to avoid.
  d.__nt.authTap(17, 0);
  check('far-corner first tap is wrapped at len-1',  P(), ['top', 17, true]);
  d.__nt.authTap(17, 0);
  check('…and its flush option STORES len-2, not len-1', P(), ['top', 16, false]);
  check('…which is the mouth it actually has',
        d.__nt.mouthTiles(d.__nt.node.ingress, 18, 18), [[16, 0], [17, 0]]);
  d.__nt.authTap(17, 0);
  check('…then flush down the right edge from the top', P(), ['right', 0, false]);

  // Away from a corner there is nothing to cycle: a repeat tap is idempotent, which is
  // what stops the new behaviour leaking into ordinary port placement.
  d.__nt.authTap(0, 5);
  check('a mid-edge tap places a plain two-unit door', P(), ['left', 5, false]);
  d.__nt.authTap(0, 5);
  check('…and tapping it again does not cycle it anywhere', P(), ['left', 5, false]);
  check('a mid-edge tap offers exactly one placement',
        d.__nt.portCands('left', 5, 18, 18).length, 1);
  check('a corner tap offers three',
        d.__nt.portCands('left', 0, 18, 18).length, 3);

  check('no exceptions', errs(d), []);
})();

// The perpendicular flush option must be measured on the OTHER axis. On a 16×20 board
// the bottom-left corner's left-edge flush door sits at idx 18 (h-2); a w/h mix-up puts
// it at 14 and the check reads identically on a square board. D44's class again.
section('Corner cycle — the perpendicular option measures the other axis');
(() => {
  const d = makeDevice('cornerrect', 'single', 0, [{ uid: 'u0', nickname: 'Ali' }]);
  d.__nt.seat({ players: 1, names: ['Ali'], scale: 18, debug: true });
  d.__nt.startSolo();
  d.__nt.deployDims(16, 20);
  d.__nt.setBrushDbg('ingress');
  const P = () => { const p2 = d.__nt.node.ingress; return [p2.edge, p2.idx, !!p2.corner]; };

  d.__nt.authTap(0, 19);
  check('bottom-left wrapped door', P(), ['bottom', 0, true]);
  d.__nt.authTap(0, 19);
  check('flush along the bottom edge', P(), ['bottom', 0, false]);
  d.__nt.authTap(0, 19);
  check('flush up the left edge lands at h-2, not w-2', P(), ['left', 18, false]);
  check('…and its mouth is the two tiles above the corner',
        d.__nt.mouthTiles(d.__nt.node.ingress, 16, 20), [[0, 18], [0, 19]]);
  check('the node still routes throughout', d.__nt.pathOk(), true);
  check('no exceptions', errs(d), []);
})();

// ── Rolled ports ──────────────────────────────────────────────────────────────
// ntRandomEdgePort bounded idx with a single n for all four edges — correct only
// because generated nodes are square. D44's class. Spec §7.1.
section('Rolled ports — idx is bounded by the port\'s OWN edge');
(() => {
  const d = makeDevice('rollports', 'single', 0, [{ uid: 'u0', nickname: 'Ali' }]);
  d.__nt.seat({ players: 1, names: ['Ali'], scale: 18, natives: 0 });

  // Generated nodes are square, so this asserts the invariant rather than the split.
  // The split itself is proven by the mouth-derivation section's per-axis checks.
  let allInRange = true, mouthsClear = true;
  for (let i = 0; i < 12; i++) {
    d.__nt.genNode();
    const nd = d.__nt.node;
    for (const p of [nd.ingress, nd.egress]) {
      const len = (p.edge === 'top' || p.edge === 'bottom') ? nd.w : nd.h;
      if (!(p.idx >= 0 && p.idx <= len - 1)) allInRange = false;
      // Generation reserves the FULL span, so no bad sector or native honeypot may sit
      // on any mouth tile. Spec §7.2.
      for (const [mx, my] of d.__nt.mouthTiles(p, nd.w, nd.h)) {
        const solid = nd.badSectors.concat(nd.nativeHoneypots)
          .some(b => mx >= b.ax && mx <= b.ax + 1 && my >= b.ay && my <= b.ay + 1);
        if (solid) mouthsClear = false;
      }
    }
  }
  check('every rolled idx is within its own edge', allInRange,  true);
  check('no generated terrain sits on a mouth tile', mouthsClear, true);
  check('no exceptions', errs(d), []);
})();

// ── Finite geometry — the NaN tripwire ────────────────────────────────────────
// A missed .n → .w/.h rename yields undefined → NaN, which throws nothing and asserts
// nothing: every render call still "succeeds" while drawing garbage. These checks are the
// only thing standing between that and a green suite. (D42 — prove a check can fail.)
section('Finite geometry — no NaN reaches the timeline or the trace');
(() => {
  const d = makeDevice('finite', 'single', 0, [{ uid: 'u0', nickname: 'Ali' }]);
  d.__nt.seat({ players: 1, names: ['Ali'] });
  d.__nt.genNode();
  const tl = d.__nt.timeline();

  check('latency is a finite number', Number.isFinite(tl.latencyMs), true);
  check('latency is above zero',      tl.latencyMs > 0,              true);
  check('polyline is non-empty',      tl.polyline.length > 0,        true);
  check('every polyline point is finite',
        tl.polyline.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)), true);
  check('every sample is finite',
        tl.samples.every(s => Number.isFinite(s.x) && Number.isFinite(s.y) && Number.isFinite(s.t)), true);
  check('no exceptions', errs(d), []);
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
  // The mouth span is a pure function of idx, so a chained idx chains the span too —
  // this pre-existing check already proves spec §7.4's coverage without needing its own.
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

// ── Rectangular nodes end to end ──────────────────────────────────────────────
// 16×18 is the owner-specified case; 16×20 is the widest gap the range allows, which is where
// an axis confusion (w used for a row bound, or vice versa) shows up most readily.
// makeRoom(names) takes no settings object (confirmed by reading its signature), so this uses
// the single-device makeDevice form — the geometry-discriminating checks below don't need the
// wire, only Sandbox Initialisation's own w/h split.
section('Rectangular nodes — authored, deployed, played');
[[16, 18], [16, 20], [20, 16]].forEach(([w, h]) => {
  const d = makeDevice(`rect-${w}x${h}`, 'single', 0, [{ uid: 'u0', nickname: 'Ali' }]);
  d.__nt.seat({ players: 1, names: ['Ali'], scale: 18, debug: true });
  d.__nt.startSolo();
  d.__nt.deployDims(w, h);

  check(`${w}×${h}: node carries both dimensions`, [d.__nt.node.w, d.__nt.node.h], [w, h]);
  check(`${w}×${h}: blank board routes`,           d.__nt.pathOk(), true);
  check(`${w}×${h}: grid renders w×h cells`,       d.__nt.authCells(), w * h);
  check(`${w}×${h}: two port markers`,             d.__nt.authPorts(), 2);

  // A port's mouth measures against its OWN edge. On a non-square node a swapped
  // argument order exchanges the two, which is invisible on a square node — this is the
  // same discriminator D46 established for ntPortMouth, applied to ntMouthIdxs.
  const nd = d.__nt.node;
  for (const p of [nd.ingress, nd.egress]) {
    const len = (p.edge === 'top' || p.edge === 'bottom') ? nd.w : nd.h;
    const idxs = d.__nt.mouthIdxs(p, nd.w, nd.h);
    check(`${w}×${h}: ${p.edge} mouth stays within its own edge`,
          idxs.every(i => i >= 0 && i <= len - 1), true);
    check(`${w}×${h}: ${p.edge} mouth is one unit at a corner, two otherwise`,
          idxs.length, (p.idx <= 0 || p.idx >= len - 1) ? 1 : 2);
  }

  const tl = d.__nt.timeline();
  check(`${w}×${h}: latency is finite and positive`,
        Number.isFinite(tl.latencyMs) && tl.latencyMs > 0, true);
  check(`${w}×${h}: every polyline point is finite`,
        tl.polyline.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)), true);
  check(`${w}×${h}: the trace stays inside the board`,
        tl.polyline.every(p => p.x >= -1 && p.x <= w + 1 && p.y >= -1 && p.y <= h + 1), true);

  // Randomise Topology must NOT un-rectangle the sandbox. ntGenerateNode defaults to a square
  // ntMatrixScale × ntMatrixScale board (18×18 here, since `scale: 18` above) — this is
  // EXACTLY the assertion deferred-work.md called for: the previous section only ever exercised
  // a blank deployDims(w, h), never authRandTerrain(), which is how this bug shipped unnoticed.
  d.__nt.authRandTerrain();
  check(`${w}×${h}: Randomise Topology keeps the AUTHORED dimensions, not 18×18`,
        [d.__nt.node.w, d.__nt.node.h], [w, h]);
  check(`${w}×${h}: …and the re-rolled board still routes`, d.__nt.pathOk(), true);
  check(`${w}×${h}: …and the grid repaints w×h cells, not 18×18`, d.__nt.authCells(), w * h);
  check(`${w}×${h}: …with no exceptions`, errs(d), []);
});

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

  // Attempt 2 — a real build. Find a single-block firewall anchor that genuinely lengthens the
  // baseline route. A fixed offset pair (or a point picked off the polyline's own geometry)
  // isn't reliably safe across every seed's random terrain: it can land off the actual route
  // (leaving latency unchanged even under CORRECT code) or right against a port's edge tile,
  // severing the only entrance instead of forcing a detour (both hit during a mid-fix seed
  // sweep). Search block anchors outward from the board CENTRE — the tile least likely to
  // border either port, since both live on the map edge — and use the first one that empirically
  // produces a longer, still-routable trace. This is the same validity concept the real build
  // screen already checks via ntPathExists before it lets a placement stick.
  const gridN = client.__nt.node.w;
  const cx = Math.floor(gridN / 2) - 1, cy = Math.floor(gridN / 2) - 1;
  const anchors = [];
  for (let bx = 0; bx <= gridN - 2; bx++) for (let by = 0; by <= gridN - 2; by++) anchors.push({ ax: bx, ay: by });
  anchors.sort((a, b) => (Math.abs(a.ax - cx) + Math.abs(a.ay - cy)) - (Math.abs(b.ax - cx) + Math.abs(b.ay - cy)));

  // expectedSecond is read straight from the same PURE function the app itself uses to score
  // an attempt — computed independently of ntDebugBest's isBest bookkeeping, so a comparison-
  // direction bug in that bookkeeping cannot also corrupt the value we're checking it against.
  let expectedSecond = 0, chosen = null;
  for (const cand of anchors) {
    client.__nt.setPlacements([{ ax: cand.ax, ay: cand.ay, type: 'firewall' }]);
    const lat = client.__nt.timeline().latencyMs;
    if (lat > first) { expectedSecond = lat; chosen = cand; break; }
  }
  if (!chosen) throw new Error('no block anchor lengthened the baseline route — terrain too open');
  // ntMyPlacements is already `chosen` — the loop's last (successful) setPlacements call.
  client.__nt.commit();
  check('attempt 2 counted', client.__nt.debugAttempt, 2);
  check('a slower trace becomes the recorded best (higher latency wins in NT)',
        client.__nt.debugBest, expectedSecond);

  // Attempt 3 — deliberately worse. Best must NOT regress to "last". Checked against
  // expectedSecond (captured above from the pure function) — never re-read from ntDebugBest
  // after attempt 2, which is exactly the state a comparison-direction bug corrupts.
  client.__nt.runAgain();
  client.__nt.setPlacements([]);
  client.__nt.commit();
  check('attempt 3 counted',      client.__nt.debugAttempt, 3);
  check('best is BEST, not LAST', client.__nt.debugBest, expectedSecond);
  check('three attempts still sent NO packets', clientPackets, []);
  check('no exceptions', r.all.map(errs), [[], []]);
})();

// ── Finish, and the per-player readiness gate ─────────────────────────────────
section('Finish — a gate that must not be vacuous');
(() => {
  const r = makeRoom(['Ali', 'Bec', 'Cam']);
  seatAll(r, { win: 90, debug: true });
  r.host.__nt.showAuthoring();
  r.host.__nt.authRandTerrain();
  r.host.__nt.deploy();
  r.all.forEach(drain);

  // Every device runs one attempt, then finishes one at a time.
  r.all.forEach(d => { d.__nt.showBuild(); d.__nt.commit(); });

  // Client 1 finishes with an EMPTY build — normal in a sandbox, and the array Firebase
  // deletes in flight. Without `payload.bestPlacements || []` the host reads undefined and
  // ntResolveCycleMdlm maps over it and throws, stranding the entire room.
  //
  // Every device is ALREADY sitting on screen-nt-playback at this point — that's the retry
  // loop's own design (each attempt shows its own trace, retry overlay on top), not a bug — so
  // a plain "does the screen list include screen-nt-playback" check can't tell a premature sweep
  // apart from that pre-existing, correct state; it would read true either way. Snapshot each
  // device's own screen-push COUNT instead and assert the DELTA: only the finisher (Bec) may
  // navigate anywhere: a premature resolve broadcasting NT_PLAYBACK to the two still-testing
  // devices would show up as a non-zero delta for them.
  const screensBefore = r.all.map(d => d.__screens.length);
  r.clients[0].__nt.setBest([]);
  r.clients[0].__nt.finish();
  check('host recorded seat 1 as finished', r.host.__nt.debugFinished, [false, true, false]);
  check('…and kept an ARRAY for their empty best build',
        Array.isArray(r.host.__nt.ptpPlacements[1]), true);
  check('the round has NOT resolved on one Finish', r.host.__nt.cycleResolved, false);
  check('…and only the finisher navigated — nobody was swept to playback',
        r.all.map((d, i) => d.__screens.length - screensBefore[i]), [0, 1, 0]);

  // Second client finishes — two of three seats done, host still outstanding. Still not
  // resolved (host is the one who must tip it), and the roster reaches every device.
  r.clients[1].__nt.finish();
  r.all.forEach(drain);
  check('host recorded seat 2 as finished', r.host.__nt.debugFinished, [false, true, true]);
  check('still not resolved — the host has not finished', r.host.__nt.cycleResolved, false);
  check('clients see the roster',
        r.clients.map(c => c.__nt.debugFinished), [[false, true, true], [false, true, true]]);
  // Cam (the finisher who just tipped this checkpoint) is the one who rendered its own standby
  // roster locally — the host hasn't shown standby at all yet, it finishes (and resolves) next.
  check('roster renders one row per player', r.clients[1].__nt.rosterRows(), 3);

  // The HOST finishes LAST — deliberately, not just for variety. Its own Finish marks its slot
  // directly (a self-sent ACTION would be dropped by the dedup guard, originId ===
  // syllyDeviceUid — NT's own BUG-05) and, because that tips every seat to finished, resolves
  // in the SAME step and mirrors its own NT_PLAYBACK navigation locally (nt.js: "Host is also a
  // participant and never receives its own SYNC"). A CLIENT tipping the gate is deliberately
  // NOT exercised here: this harness's wire is a direct function call, so a client's own
  // NT_DEBUG_FINISH would receive NT_DEBUG_ROSTER + NT_PLAYBACK back inside that same call,
  // before its own ntShowStandby() line runs — a reentrancy that is structurally impossible on
  // real Firebase (a round trip can never complete before the sending function returns) and so
  // isn't something the fix needs to defend against, but it does mean this synchronous harness
  // cannot honestly prove "everyone reaches the summary" for that ordering. See nt.js
  // ntDebugFinish's client branch for the production reasoning.
  r.host.__nt.finish();
  r.all.forEach(drain);
  check('host marked its own slot', r.host.__nt.debugFinished, [true, true, true]);
  // `sent` records the HOST's sends, so this is a direct observation of the claim: a self-sent
  // ACTION would appear here and would then be dropped by the dedup guard, leaving the slot
  // unset and the round hung forever.
  check('…and sent no NT_DEBUG_FINISH of its own',
        r.sent.includes('NT_DEBUG_FINISH'), false);
  check('all finished — the round resolves', r.host.__nt.cycleResolved, true);
  // Attempt-log design (2026-08-18): Finish goes straight to the Diagnostic Summary now — no
  // playback hop. Both halves of the host/client pair changed (ntResolveCycleMdlm's tail AND
  // the NT_PLAYBACK applier) — miss either one and this assertion is exactly what catches the
  // split-brain (one screen list would show playback, the others summary).
  check('…and everyone reaches the summary, not playback',
        r.all.map(lastScreen), ['screen-nt-summary', 'screen-nt-summary', 'screen-nt-summary']);
  check('no exceptions anywhere', r.all.map(errs), [[], [], []]);
})();

// ── Attempt log (design doc 2026-08-18) ────────────────────────────────────────
section('Attempt log — accumulates, replays, resets at every lifecycle point');
(() => {
  const r = makeRoom(['Ali', 'Bec']);
  seatAll(r, { win: 90, debug: true });
  r.host.__nt.showAuthoring();
  r.host.__nt.authRandTerrain();
  r.host.__nt.deploy();
  r.all.forEach(drain);
  r.all.forEach(d => { d.__nt.showBuild(); d.__nt.commit(); });   // ntCommit() → ntDebugRunAttempt() in Debug Mode

  // One entry per attempt, and — captured OUTSIDE ntDebugAttempts itself, independently, per
  // D42: an assertion that reads the same field it is checking cannot fail against the bug it
  // exists to catch — latencyMs must match a fresh ntComputeTimeline_local() over the SAME
  // placements this attempt actually ran with.
  check('one attempt recorded after one commit', r.host.__nt.debugAttempts.length, 1);
  const firstPlacements = r.host.__nt.debugAttempts[0].placements.slice();
  const firstLatency    = r.host.__nt.debugAttempts[0].latencyMs;
  r.host.__nt.setInv(2, 2);
  r.host.__nt.place(2, 0, false);
  r.host.__nt.runAgain();
  r.host.__nt.commit();
  check('two attempts recorded after a retry', r.host.__nt.debugAttempts.length, 2);
  check('attempt 1 latency matches an independent recompute of the SAME placements',
        (() => {
          const saved = r.host.__nt.placements;
          r.host.__nt.setPlacements(firstPlacements);
          const recomputed = r.host.__nt.timeline().latencyMs;
          r.host.__nt.setPlacements(saved);
          return recomputed;
        })(), firstLatency);

  // Finish both — MDLM tail lands on the summary with the per-player table, not playback.
  r.clients[0].__nt.finish();
  r.host.__nt.finish();
  r.all.forEach(drain);
  check('both devices land on the summary', r.all.map(lastScreen),
        ['screen-nt-summary', 'screen-nt-summary']);
  check('summary board has one row per player', r.host.__nt.summaryRows(), 2);

  // Own row opens the full log; the other seat's row opens a single best-only row.
  r.host.__nt.openLogs(0);
  check('own log lists every attempt, newest first — heading + 2 rows',
        r.host.__nt.logsContentCount(), 3);
  r.host.__nt.openLogs(1);
  check('another player’s log names them as best-only',
        /best trace only/.test(r.host.__nt.logsContentText()), true);

  // Author New Node — the PTP hand-over trap the design doc calls out by name: miss this reset
  // and the next session opens showing the PREVIOUS session's attempts.
  r.host.__nt.tapSummary();
  r.all.forEach(drain);
  check('Author New Node clears the attempt log — host', r.host.__nt.debugAttempts, []);
  check('…and on the client too', r.clients[0].__nt.debugAttempts, []);
})();

// ── PTP (pass-the-phone) — the bug an owner playtest actually hit, twice ──────
// Two players, ONE device, sequential turns. Round 1 (the pill switcher) fixed "P1 is
// unreachable" but only down to best-only, because ntDebugAttempts was wiped at hand-over.
// The owner asked the obvious follow-up: why does P1 only get best-only when this is the SAME
// device holding the memory the whole time, with no network cost either way? Round 2
// (ntDebugAttemptsBySeat) stashes the just-finished seat's full array instead of discarding it
// — MDLM still throws other seats' histories away (a different device genuinely never held
// them), but PTP now keeps every seat's history for the rest of the session.
section('Attempt log — PTP: BOTH players keep their full history, not just the last one');
(() => {
  const d = makeDevice('ptp', 'single', 0,
    [{ uid: 'u0', nickname: 'Ali' }, { uid: 'u1', nickname: 'Bec' }]);
  d.__nt.seat({ players: 2, names: ['Ali', 'Bec'], debug: true });
  d.__nt.showAuthoring();
  d.__nt.authRandTerrain();
  d.__nt.deploy();

  // P1 (Ali) runs TWO attempts, finishes — hands over to P2.
  d.__nt.showBuild();
  d.__nt.commit();
  d.__nt.runAgain();
  d.__nt.commit();
  d.__nt.finish();
  check('P1 finished, turn handed to P2', d.__nt.debugAttempt, 0);   // reset for the new turn
  check('P1\'s two attempts were stashed under her own seat, not discarded',
        d.__nt.debugAttemptsBySeat[0].length, 2);

  // P2 (Bec) runs one attempt, finishes — both done, PTP multi routes through the gather gate.
  d.__nt.showBuild();
  d.__nt.commit();
  d.__nt.finish();
  d.__nt.tapGate();
  check('lands on the summary, not playback', lastScreen(d), 'screen-nt-summary');

  // Opening System Logs with no argument — exactly what tapping the top-level button does —
  // defaults to ntDebugMySeat(), which in PTP is the LAST player (Bec, seat 1).
  d.__nt.openLogs();
  check('default open shows the LAST player', d.__nt.logPillActive(), 1);
  check('pills list both players', d.__nt.logPillLabels(), ['Ali', 'Bec']);
  check('Bec (seat 1, the live seat) has her full attempt list',
        /every attempt/.test(d.__nt.logsContentText()), true);

  // The fix: Ali (seat 0, no longer live) STILL gets her full two-attempt history — not
  // best-only — because ntDebugAttemptsBySeat[0] holds what she ran, exactly as she ran it.
  d.__nt.switchLog(0);
  check('switching to Ali updates the active pill', d.__nt.logPillActive(), 0);
  check('…and Ali ALSO gets her full history, not best-only — the follow-up fix',
        /every attempt/.test(d.__nt.logsContentText()), true);
  check('…specifically her 2 attempts, heading + 2 rows',
        d.__nt.logsContentCount(), 3);
  check('no exceptions', errs(d), []);
})();

// ── Empty log — Finish is reachable without ever running an attempt ───────────
section('Attempt log — finishing with zero attempts renders, does not throw');
(() => {
  const d = makeDevice('solo', 'single', 0, [{ uid: 'u0', nickname: 'Ali' }]);
  d.__nt.seat({ players: 1, names: ['Ali'], debug: true });
  d.__nt.showAuthoring();
  d.__nt.authRandTerrain();
  d.__nt.deploy();
  d.__nt.finish();     // no runAttempt() at all — Finish is reachable straight from the gate
  check('zero attempts recorded', d.__nt.debugAttempts, []);
  d.__nt.openLogs(0);
  check('empty state rendered, not a throw', /NO ATTEMPTS LOGGED/.test(d.__nt.logsContentText()), true);
  check('no exceptions', errs(d), []);
})();

// ── No forced resolution while a player is still retrying ─────────────────────
section('Retrying players are never swept aside by a deadline');
(() => {
  const r = makeRoom(['Ali', 'Bec']);
  seatAll(r, { win: 45, debug: true });   // a REAL window is configured — Debug supersedes it
  r.host.__nt.showAuthoring();
  r.host.__nt.authRandTerrain();
  r.host.__nt.deploy();
  r.all.forEach(drain);

  // Drive the REAL gate → build path, not the mock's showBuild() shortcut. ntShowMdlmGate's
  // host callback (nt.js) is the ONLY place ntEffectiveHardeningWin() decides whether an
  // endTimestamp exists — and ntStartBuildTimer only arms the host's resolve guard when it's
  // called WITH a truthy endTimestamp. A no-arg showBuild() bypasses that decision entirely
  // and would leave this section unable to fail no matter what the function under test does.
  r.clients.forEach(c => c.__nt.tapGate());
  r.host.__nt.tapGate();             // host's callback computes endTimestamp + broadcasts NT_BUILD_BEGIN
  r.all.forEach(drain);
  r.all.forEach(d => d.__nt.commit());
  r.host.__nt.finish();

  // Pump the host's timers well past what would have been the build deadline (45 s + the 4 s
  // resolve-guard margin), with one player still mid-retry. Stated behaviourally rather than
  // as "the guard is unarmed", so it also catches any OTHER route to a premature resolve.
  for (let i = 0; i < 40; i++) step(r.host, 120000);
  check('the round has NOT resolved with a player still testing',
        r.host.__nt.cycleResolved, false);
  check('…and the retrying client is still on its own screen',
        lastScreen(r.clients[0]) !== 'screen-nt-summary', true);
  check('no exceptions', r.all.map(errs), [[], []]);
})();

// ── Summary: best of N, and the loop back to the editor ───────────────────────
section('Summary — scored on best attempts, then a fresh sandbox');
(() => {
  const r = makeRoom(['Ali', 'Bec']);
  seatAll(r, { win: 90, debug: true });
  r.host.__nt.showAuthoring();
  r.host.__nt.authRandTerrain();
  r.host.__nt.bumpFw(10);
  r.host.__nt.deploy();
  r.all.forEach(drain);

  // The host builds well, then deliberately throws away its last attempt. A fixed anchor pair
  // (as the brief's own draft used) isn't reliably safe across every seed's random terrain — it
  // can land off the actual route, or a detour around it can happen to dodge a honeypot's slow
  // zone and come out FASTER than the unobstructed baseline (latency isn't pure path length; a
  // honeypot proximity slow is folded in — see ntComputeTimeline). Confirmed by NT_SEED=7/8
  // failing this exact hardcoded-anchor check with correct code. Search outward from centre for
  // an anchor that empirically lengthens the route, same technique as the Retry loop section
  // above — this is scaffolding to reach "2 committed attempts", not new behaviour under test.
  r.host.__nt.showBuild();
  const gridN = r.host.__nt.node.w;
  const cx = Math.floor(gridN / 2) - 1, cy = Math.floor(gridN / 2) - 1;
  const anchors = [];
  for (let bx = 0; bx <= gridN - 2; bx++) for (let by = 0; by <= gridN - 2; by++) anchors.push({ ax: bx, ay: by });
  anchors.sort((a, b) => (Math.abs(a.ax - cx) + Math.abs(a.ay - cy)) - (Math.abs(b.ax - cx) + Math.abs(b.ay - cy)));
  const baseline = r.host.__nt.timeline().latencyMs;   // ntMyPlacements is [] right after showBuild
  let chosen = null;
  for (const cand of anchors) {
    r.host.__nt.setPlacements([{ ax: cand.ax, ay: cand.ay, type: 'firewall' }]);
    if (r.host.__nt.timeline().latencyMs > baseline) { chosen = cand; break; }
  }
  if (!chosen) throw new Error('no block anchor lengthened the baseline route — terrain too open');
  r.host.__nt.setPlacements([{ ax: chosen.ax, ay: chosen.ay, type: 'firewall' }]);
  r.host.__nt.commit();
  const good = r.host.__nt.debugBest;
  r.host.__nt.runAgain();
  r.host.__nt.setPlacements([]);
  r.host.__nt.commit();
  check('best survives a deliberately worse final attempt', r.host.__nt.debugBest, good);

  r.clients[0].__nt.showBuild(); r.clients[0].__nt.commit();
  r.host.__nt.finish();
  r.clients[0].__nt.finish();
  r.all.forEach(drain);

  r.host.__nt.showSummary('match');
  check('the summary is captioned with the attempt count',
        /best of 2 attempts/.test(r.host.__nt.text('nt-summary-caption')), true);
  check('…and the caption is visible', r.host.__nt.shown('nt-summary-caption'), true);
  check('the host is offered a fresh sandbox',
        r.host.__nt.summaryBtnText(), 'Author New Node');

  // The loop-back is symmetric with the opening: one entry point, reached twice.
  r.host.__nt.tapSummary();
  r.all.forEach(drain);
  check('host returns to the editor',       lastScreen(r.host), 'screen-nt-authoring');
  check('…on a genuinely blank board',
        [r.host.__nt.node.badSectors.length, r.host.__nt.node.nativeHoneypots.length], [0, 0]);
  check('client returns to the same standby it saw at the start',
        lastScreen(r.clients[0]), 'screen-nt-standby');
  check('…with its Debug state re-zeroed',
        [r.clients[0].__nt.debugAttempt, r.clients[0].__nt.debugBest], [0, null]);
  check('no exceptions', r.all.map(errs), [[], []]);
})();

// ── ntResetState ──────────────────────────────────────────────────────────────
section('Teardown — session state clears, the SETTING survives');
(() => {
  const d = makeDevice('reset', 'single', 0, [{ uid: 'u0', nickname: 'Ali' }]);
  d.__nt.seat({ players: 1, names: ['Ali'], debug: true });
  d.__nt.showAuthoring();
  d.__nt.authRandTerrain();
  d.__nt.deploy();
  d.__nt.showBuild();
  d.__nt.commit();
  check('mid-session state exists', d.__nt.debugAttempt, 1);

  // Move the brush off its default before reset, so "brush back to default" below is a real
  // check rather than one that would read 'bad' either way (it's already 'bad' post-authoring).
  d.__nt.setBrushDbg('native');

  d.__nt.resetState();
  check('attempt count cleared',   d.__nt.debugAttempt, 0);
  check('best cleared',            d.__nt.debugBest, null);
  check('attempt log cleared',     d.__nt.debugAttempts, []);
  check('readiness arrays cleared',[d.__nt.debugFinished, d.__nt.debugCounts], [[], []]);
  check('brush back to default',   d.__nt.debugBrush, 'bad');
  check('but ntDebugMode SURVIVES — it is a setting, like every other setting',
        d.__nt.debugMode, true);
  check('no exceptions', errs(d), []);
})();

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n' + '='.repeat(62));
console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);

})();
