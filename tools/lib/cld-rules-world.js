// ═══════════════════════════════════════════════════════════════════════════
// cld-rules-world.js — Cold Shoulder's rules layer in one vm, headless, for the
// bot tools (verify-cld-bots.js, simulate-cld-bots.js). Same sandbox as
// verify-cld-loop.js: 'single' mode, getElementById: () => null, and the MP
// sends THROW so a leaked broadcast fails loudly. CLD_SRC= / CLD_PHYS_SRC=.
// ═══════════════════════════════════════════════════════════════════════════
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..');
const PHYS = process.env.CLD_PHYS_SRC || path.join(ROOT, 'js/lib/physics.js');
const GAME = process.env.CLD_SRC      || path.join(ROOT, 'js/games/cld.js');

const sandbox = {
  console,
  window: {},
  document: { addEventListener() {}, getElementById: () => null, querySelectorAll: () => [] },
  showScreen() {}, setTimeout: () => 0, clearTimeout() {},
  requestAnimationFrame: () => 0, cancelAnimationFrame() {},
  playLaunch() {}, playExit() {}, playDone() {}, playSuccess() {}, playBoing() {},
  playWhoosh() {}, playAbyssThud() {}, playHullThud() {}, playAlarm() {}, playSplash() {},
  mpSendEnvelope() { throw new Error('mpSendEnvelope called from the rules layer'); },
  mpSendPrivate()  { throw new Error('mpSendPrivate called from the rules layer'); },
  mpLockSync() {}, mpUnlockSync() {}, mpPlayerSlots: [], mpMyPlayerIdx: 0,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(PHYS, 'utf8'), sandbox, { filename: PHYS });
vm.runInContext(fs.readFileSync(GAME, 'utf8'), sandbox, { filename: GAME });
vm.runInContext(`
globalThis.__cld = {
  C: { CLD_W, CLD_H, CLD_MIN_POWER, CLD_PENGUIN_R },
  fn: { cldStartMatch, cldStartFloeOff, cldResolveSlide, cldStartIceBath, cldMatchWinner,
        cldSeatSpot, cldDiveSpot, cldSeatR, cldSwapOut, cldRulesRun, cldApplyCommit,
        cldBotView, cldBotDecide, cldBotThinkMs },
  rng(s) { return window.Physics.rng(s); },
  get penguins()    { return cldPenguins; },
  get commits()     { return cldCommits; },     set commits(v)    { cldCommits = v; },
  get playerCount() { return cldPlayerCount; },
  get slideNo()     { return cldSlideNo; },
  set ice(v)        { cldIceConditions = v; },
  set floe(v)       { cldFloeSize = v; cldFloeSizeTouched = true; },
  set sylly(v)      { cldSyllyMode = v; },      set peckOff(v)    { cldPeckOff = v; },
  set fishToWin(v)  { cldFishToWin = v; },      set iceBreaker(v) { cldIceBreaker = v; },
};`, sandbox);
const G = sandbox.__cld, F = G.fn, C = G.C;

// Seat a match + a fresh Floe-Off through the real entry points.
function setup(o) {
  G.ice = o.ice || 'slush'; G.floe = o.floe || 'standard';
  G.sylly = !!o.sylly; G.peckOff = !!o.peckOff;
  G.fishToWin = o.fishToWin === undefined ? 1 : o.fishToWin;
  G.iceBreaker = o.iceBreaker === undefined ? 0 : o.iceBreaker;
  F.cldStartMatch(Array.from({ length: o.players }, (_, i) => 'P' + i));
  F.cldStartFloeOff(o.seed >>> 0);
}

// null = legal; otherwise the reason (spec § 6, legality).
function legal(i, c) {
  const mine = G.penguins.filter(p => p.ownerIdx === i);
  if (!c || !Array.isArray(c.aims)) return 'no aims array';
  for (const a of c.aims) {
    const p = mine.find(q => q.id === a.penguinId);
    if (!p) return 'aims a penguin it does not own: ' + a.penguinId;
    if (p.drowned) return 'aims a drowned penguin';
    if (!(a.power >= C.CLD_MIN_POWER && a.power <= 1)) return 'power out of range: ' + a.power;
    if (Math.abs(Math.hypot(a.dx, a.dy) - 1) > 1e-6) return 'direction is not a unit vector';
  }
  if (c.dive && c.snowball) return 'both a Dive and a Throw';
  if (c.dive) {
    const p = mine.find(q => q.id === c.dive.penguinId);
    if (!p || !p.drowned || p.plug) return 'a Dive by a penguin that is not knocked back';
    if (!F.cldDiveSpot(c.dive.angle, p)) return 'a Dive into no gap (its own gap does not count)';
  }
  if (c.snowball && !mine.some(p => p.drowned)) return 'a Throw with nobody in the Drink';
  return null;
}

// Every seat's bot decides, legality recorded, the Slide resolves — to the end.
function playMatch(o) {
  setup(o);
  const botRng = G.rng((o.seed ^ 0x9e37) >>> 0);
  let illegal = null, hardMs = [];
  for (let s = 0; s < 1500; s++) {
    const cs = [];
    for (let i = 0; i < G.playerCount; i++) {
      const d = o.diffs[i % o.diffs.length];
      const t0 = Date.now();
      const c = F.cldBotDecide(F.cldBotView(i), d, botRng);
      if (d === 'hard') hardMs.push(Date.now() - t0);
      const why = legal(i, c);
      if (why && !illegal) illegal = `seat ${i} (${d}), Slide ${s}: ${why}`;
      cs.push(c);
    }
    cs.forEach((c, i) => F.cldApplyCommit(i, c, G.slideNo));
    const tl = F.cldResolveSlide((o.seed * 7919 + s) >>> 0);
    if (tl.washout) { F.cldStartIceBath(tl.bathIds || [], (o.seed + s) >>> 0); continue; }
    if (tl.matchOver) return { winner: F.cldMatchWinner(), slides: s + 1, illegal, hardMs };
    if (tl.floeOffOver) F.cldStartFloeOff((o.seed * 31 + s) >>> 0);
  }
  return { winner: -1, slides: 1500, illegal, hardMs };
}

// Play Medium bots until pred(seat's penguins) holds for some seat; that seat, or -1.
function reachState(o, pred) {
  setup(o);
  const r = G.rng(o.seed >>> 0);
  for (let s = 0; s < 400; s++) {
    for (let i = 0; i < G.playerCount; i++) if (pred(G.penguins.filter(p => p.ownerIdx === i))) return i;
    const cs = [];
    for (let i = 0; i < G.playerCount; i++) cs.push(F.cldBotDecide(F.cldBotView(i), 'medium', r));
    cs.forEach((c, i) => F.cldApplyCommit(i, c, G.slideNo));
    const tl = F.cldResolveSlide((o.seed + s) >>> 0);
    if (tl.washout) F.cldStartIceBath(tl.bathIds || [], s);
    else if (tl.matchOver) return -1;
    else if (tl.floeOffOver) F.cldStartFloeOff(s + 99);
  }
  return -1;
}

module.exports = { G, F, C, setup, playMatch, legal, reachState, rng: s => G.rng(s) };
