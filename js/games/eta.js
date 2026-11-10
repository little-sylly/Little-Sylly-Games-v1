// ═══════════════════════════════════════════════════════════════════════════
// E.T.A. (eta) — estimation + persuasion. Each courier is handed a Ride nobody
// knows the speed of, logs an ETA for the shared Route, talks the table through
// it, and watches a parcel drop on the truth. MDLM-only, 3–8 couriers,
// host-authoritative, host-as-participant.
// Sylly Mode = Backseat Drivers — secret Course Corrections that multiply.
// World: E.T.A. Couriers ("Every Thing, Anywhere. Eventually."), Dotty, Head of
// Dispatch, the Clipboard direction.
// Spec: docs/new-game-tech-eta.md (Stage 2 confirmed 10 Nov 2026)
// Depends on: engine.js (showScreen, play*, resetToLobby, activeGameId, openSoundOverlay),
//             engine-multiplayer.js (mpShowModeScreen, mpPlayerSlots, mpMyPlayerIdx,
//             mpSendEnvelope, mpSendPrivate, mpReturnToLobby, mpNotifyPlayerLeft),
//             eta-scene.js (EtaScene, etaMakeBoard, etaDocketInto, etaRenderBadge,
//             etaDur, etaFmtInt, etaNoteInto)
// ═══════════════════════════════════════════════════════════════════════════

// ── Constants (spec §4; numbers from docs/new-ideas/eta/for archive/eta-maths-round-1.md) ──
const ETA_ACC_MAX      = 40000;
const ETA_ACC_D0       = Math.log10(1.05);   // the perfect zone: within ±5%
const ETA_ACC_L        = 1.25;               // zero at 10^1.25 ≈ 17.8× off
const ETA_ACC_P        = 1.5;
const ETA_TIP_BY_N     = { 3: 4500, 4: 3500, 5: 3000, 6: 2500, 7: 2250, 8: 2000 };
const ETA_SWEEP_MIN    = 5;
const ETA_NAV_RATE     = 0.8;
const ETA_DETOUR_RATE  = 0.4;
const ETA_INS_PER_DEC  = 3000;
const ETA_INS_MAX      = 4000;
const ETA_HAZARD       = 4000;
const ETA_BANNER_SWING = 3000;               // Spin-out / Back on Course [UNTESTED — playtest]
const ETA_BACK_WITHIN  = Math.log10(1.25);
const ETA_CORR_MIN     = 0.1;
const ETA_CORR_MAX     = 10;
const ETA_CORR_STOPS   = [0.1, 0.2, 1 / 3, 0.5, 2 / 3, 1.5, 2, 3, 5, 10];
const ETA_RANKS = [
  { km: 0,      name: 'Work-Experience Kid', line: 'Here for a fortnight. Has already lost a parcel.' },
  { km: 25000,  name: 'Trolley Pusher',      line: 'Moves the cages. Knows where the good trolley is.' },
  { km: 55000,  name: 'Casual on Call',      line: 'Turns up when the phone rings. Usually.' },
  { km: 85000,  name: 'Route Regular',       line: 'Knows every pothole by its first name.' },
  { km: 115000, name: 'Senior Courier',      line: 'Gets first pick of the shed. Sometimes.' },
  { km: 145000, name: 'Leading Hand',        line: "Signs other people's paperwork. Loves it." },
  { km: 170000, name: 'Shift Supervisor',    line: 'Has a lanyard. Uses it.' },
  { km: 195000, name: "Dotty's Favourite",   line: "Gold star on the Run Sheet. Don't tell the others." },
];
const ETA_STALL_MS     = 30000;   // Stamp / Correction: once all but one are in [ASSUMPTION]
const ETA_LOG_STALL_MS = 60000;   // Log ETA: once all but one are in (spec §16 Q6)
const ETA_DOCKET_MS    = 4200;    // the job docket's dwell (interstitial, auto-advance)
const ETA_OFFMAP_MS    = 1200;    // + the GPS Signal Lost banner
const ETA_OFFMAP_SHARE = 0.25;    // share of Off the Map Routes when the setting is on [ASSUMPTION]
const ETA_NEAR_SAME    = 1.15;    // two Rides within ×1.15 effective speed are "near-identical"
const ETA_UNIT_MIN     = { min: 1, hr: 60, day: 1440, wk: 10080, mo: 43830, yr: 525960 };
const ETA_UNIT_WORD    = { min: ['minute', 'minutes'], hr: ['hour', 'hours'], day: ['day', 'days'],
                           wk: ['week', 'weeks'], mo: ['month', 'months'], yr: ['year', 'years'] };
const ETA_MAX_MINUTES  = 1e12 * 525960;   // longer than the universe — refused
const ETA_MODE_NAME    = { land: 'Land', sea: 'Sea', air: 'Air', space: 'Space' };

// ── Settings (persist between play-agains; host-only, SETTINGS_SYNC) ─────────
let etaRange       = 'mixed';   // 'local' | 'mixed' | 'cosmic'
let etaShiftLength = 5;         // 3 | 5 | 7
let etaGps         = true;
let etaOffMap      = false;     // flips ON when Sylly turns ON — a default, never a lock
let etaSyllyMode   = false;     // Backseat Drivers

// ── Roster (from mpPlayerSlots at entry — no setup screen, MDLM only) ────────
let etaPlayerCount = 0;
let etaPlayerNames = [];

// ── Shift state (reset each play-again) ──────────────────────────────────────
let etaRun         = 0;         // 1-based current Run
let etaRuns        = 5;         // the Shift's length, frozen at ETA_SHIFT_START
let etaSylly       = false;     // Sylly, frozen at ETA_SHIFT_START (a client's settings may lag)
let etaJobBase     = 40;
let etaTotals      = [];        // per seat, shown (geared, rounded) km
let etaHistory     = [];        // per Run: the applied ETA_PROOF payload (awards, Sharpest)
let etaUsedRoutes  = [];        // HOST: route ids this Shift
let etaUsedRides   = [];        // HOST: per seat, ride ids held this Shift
let etaShiftEnd    = null;      // the applied ETA_SHIFT_END payload

// ── Run state (reset each Run) ───────────────────────────────────────────────
let etaRoute       = null;      // public docket { headline, km|null, briefing[], offMap }
let etaFlavour     = '';
let etaMyRide      = null;      // this device's Ride { name, mode, emoji, unreg }
let etaPendingRide = null;      // a private ETA_RIDE that beat its ETA_RUN_START here
let etaRunRides    = [];        // HOST ONLY: full ride objects per seat (speeds) — never sent before Proof
let etaRunRoute    = null;      // HOST ONLY: the full route object
let etaRunTruths   = [];        // HOST ONLY: true ETA (minutes) per seat — never sent before Proof
let etaLogged      = [];        // per seat minutes | null (host: as received; clients: from ETA_SHEET)
let etaLogReady    = [];        // per seat bool
let etaSheetRows   = [];        // the public rows from ETA_SHEET
let etaStamps      = [];        // HOST ONLY: per seat, target seat | -1
let etaCorrections = [];        // HOST ONLY until ETA_CORRECTIONS: per seat { target, mult } | null
let etaSocialReady = [];        // per seat bool
let etaCorrList    = [];        // public, from ETA_CORRECTIONS: [{ from, to, mult }]
let etaRevised     = [];        // per seat minutes | null (Sylly)
let etaProof       = null;      // the applied ETA_PROOF payload
let etaHostPhase   = 'idle';    // HOST: 'log' | 'social' | 'resolved'
let etaStallEndsAt = 0;
let etaStallTimer  = null;      // HOST: stamp / correction stall
let etaLogStallTimer = null;    // HOST: log stall

// ── UI / device-local ────────────────────────────────────────────────────────
let etaPhase        = 'idle';   // sheet: 'reveal' | 'talk' | 'shove' | 'proof' | 'done'
let etaLogStage     = 'entry';  // 'entry' | 'locked'
let etaSocialStage  = 'idle';   // 'idle' | 'picking' | 'sent'
let etaMyLogged     = null;     // this device's own entry { minutes, label }
let etaMySelect     = -1;       // the row my Stamp / Correction points at (local)
let etaMySent       = -1;       // the row my last sent Stamp / Correction points at
let etaMyMult       = 1;        // my dial (local ghost only)
let etaPendingEntry = null;     // the entry waiting on Dotty's Double-Take
let etaTimers       = [];       // EVERY choreography timer — etaClearTimers()
let etaTickInterval = null;     // stall-countdown text
let etaBoard        = null;     // the Run Sheet board (eta-scene.js)
let etaData         = null;     // the content file (host draws from it)
let etaDataPromise  = null;
let etaRng          = Math.random;   // a harness pins this

// ═══════════════════════════════════════════════════════════════════════════
// Pure rules — no DOM, no state. tools/verify-eta-rules.js asserts every one.
// ═══════════════════════════════════════════════════════════════════════════

// Accuracy Mileage (raw, before the Gear Ratio). Judged on the RATIO, never the gap.
function etaAcc(logged, truth) {
  if (!(logged > 0) || !(truth > 0)) return 0;
  const d = Math.abs(Math.log10(logged / truth));
  if (d <= ETA_ACC_D0) return ETA_ACC_MAX;
  const x = (d - ETA_ACC_D0) / (ETA_ACC_L - ETA_ACC_D0);
  return x >= 1 ? 0 : ETA_ACC_MAX * Math.pow(1 - x, ETA_ACC_P);
}

function etaGearOf(runs) { return 5 / runs; }
// One receipt line, geared and rounded on its own so the receipt always adds up.
function etaGeared(raw, runs) { return Math.round(raw * etaGearOf(runs) / 10) * 10; }

function etaRankIdx(km) {
  let r = 0;
  for (let i = 0; i < ETA_RANKS.length; i++) if (km >= ETA_RANKS[i].km) r = i;
  return r;
}

function etaToMinutes(value, unit, mult) {
  const v = Number(value);
  if (!isFinite(v) || v <= 0) return null;
  const m = v * (ETA_UNIT_MIN[unit] || 0) * (mult || 1);
  return (m > 0 && isFinite(m)) ? m : null;
}

function etaPlural(n, pair) { return Math.abs(n - 1) < 1e-9 ? pair[0] : pair[1]; }

// The entry in the courier's own words: "4,000 hours", "3 million years".
function etaEntryLabel(value, unit, mult) {
  const v = Number(value);
  const shown = v >= 1000 ? etaFmtInt(v) : String(Math.round(v * 100) / 100);
  const big = mult === 1e6 ? ' million' : mult === 1e3 ? ' thousand' : '';
  return `${shown}${big} ${etaPlural(big ? 2 : v, ETA_UNIT_WORD[unit])}`;
}

// Dotty's Double-Take — repeats the entry in plain words. NEVER reads a truth.
function etaDoubleTakeText(value, unit, mult, minutes) {
  const entry = etaEntryLabel(value, unit, mult);
  const friendly = etaDur(minutes);
  const same = friendly.replace(/s$/, '') === entry.replace(/s$/, '');
  return same ? `${entry}. Lock it in?` : `${entry} — about ${friendly}. Lock it in?`;
}

function etaVerdict(logged, truth) {
  const r = logged / truth;
  const f = r >= 1 ? r : 1 / r;
  const dir = r >= 1 ? 'TOO SLOW' : 'TOO FAST';
  const fs = f >= 10 ? etaFmtInt(f) : (Math.round(f * 10) / 10).toFixed(1);
  if (f <= 1.05) return { top: 'DEAD ON ★', bot: 'WITHIN 5%', kind: 'dead', factor: f };
  if (f <= 1.25) return { top: 'CLOSE!', bot: `×${fs} ${dir}`, kind: 'close', factor: f };
  return { top: `×${fs}`, bot: dir, kind: r < 1 ? 'fast' : 'slow', factor: f };
}

// The miss in plain words, from a verdict: "within 5%", "×3.1 too fast".
function etaOffWords(v) {
  if (!v || v.kind === 'none') return 'no ETA';
  if (v.kind === 'dead') return 'within 5%';
  return (v.kind === 'close' ? v.bot : `${v.top} ${v.bot}`).toLowerCase();
}

// Placings by accuracy on the LOGGED ETA (never a Revised one): how many times out,
// 1-based, ties share (1, 1, 3); 0 = no ETA. The 1st / 2nd / 3rd stamps at Proof.
function etaPlacings(logged, truths) {
  const off = logged.map((l, i) => (l > 0 && truths[i] > 0 ? Math.abs(Math.log10(l / truths[i])) : null));
  return off.map(d => (d == null ? 0 : 1 + off.filter(x => x != null && x < d - 1e-9).length));
}

function etaOrdinal(n) {
  const t = n % 100;
  return n + ((t >= 11 && t <= 13) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'));
}

// Backseat Drivers credit for ONE target (spec §6; eta_sim.py credit_pts).
// corr: [{ from, mult }]. Returns { final, swing, nav{from:km}, det{from:km}, ins, spin, back }.
function etaSyllyCredit(logged, truth, corr) {
  const out = { final: logged, swing: 0, nav: {}, det: {}, ins: 0, spin: false, back: false };
  if (!(logged > 0) || !corr.length) return out;
  const e = Math.log(logged / truth);
  const us = corr.map(c => Math.log(c.mult));
  const sum = us.reduce((a, b) => a + b, 0);
  const final = logged * Math.exp(sum);
  const swing = etaAcc(final, truth) - etaAcc(logged, truth);
  const sign = x => (x > 0 ? 1 : x < 0 ? -1 : 0);
  out.final = final;
  out.swing = swing;
  if (swing >= 0) {
    const helpers = corr.map((c, i) => i).filter(i => sign(us[i]) === -sign(e) && us[i] !== 0);
    const tot = helpers.reduce((a, i) => a + Math.abs(us[i]), 0) || 1;
    helpers.forEach(i => { out.nav[corr[i].from] = ETA_NAV_RATE * swing * Math.abs(us[i]) / tot; });
    corr.forEach((c, i) => {
      if (sign(us[i]) === sign(e) && us[i] !== 0) {
        const alone = etaAcc(logged * c.mult, truth) - etaAcc(logged, truth);
        out.det[c.from] = ETA_DETOUR_RATE * Math.max(0, -alone);
      }
    });
  } else {
    const dir = sign(sum);
    const movers = corr.map((c, i) => i).filter(i => sign(us[i]) === dir && dir !== 0);
    const tot = movers.reduce((a, i) => a + Math.abs(us[i]), 0) || 1;
    movers.forEach(i => { out.det[corr[i].from] = ETA_DETOUR_RATE * (-swing) * Math.abs(us[i]) / tot; });
  }
  out.ins = Math.min(ETA_INS_PER_DEC * us.reduce((a, u) => a + Math.abs(u), 0) / Math.LN10, ETA_INS_MAX);
  out.spin = corr.length >= 2 && swing <= -ETA_BANNER_SWING;
  out.back = swing >= ETA_BANNER_SWING && Math.abs(Math.log10(final / truth)) <= ETA_BACK_WITHIN;
  return out;
}

// One Run's scoring for every seat. inp: { n, runs, sylly, logged[], truths[], unreg[],
// stamps[] (target per giver, -1 none), corrections[] ({target, mult} | null per giver) }.
// Returns { raw[] (component objects), receipts[] (shown lines), runTotals[], banners[],
// stampsIn[], credits[] }.
function etaScoreRun(inp) {
  const { n, runs, sylly, logged, truths } = inp;
  const raw = Array.from({ length: n }, () => ({ acc: 0, tips: 0, sweep: 0, hazard: 0, nav: 0, det: 0, ins: 0 }));
  const banners = Array(n).fill(null);
  const stampsIn = Array(n).fill(0);
  const finals = Array(n).fill(null);
  for (let i = 0; i < n; i++) raw[i].acc = logged[i] ? etaAcc(logged[i], truths[i]) : 0;
  if (!sylly) {
    const tip = ETA_TIP_BY_N[n] || ETA_TIP_BY_N[8];
    (inp.stamps || []).forEach((t, giver) => { if (t >= 0 && t < n && t !== giver) stampsIn[t]++; });
    for (let i = 0; i < n; i++) {
      raw[i].tips = stampsIn[i] * tip;
      raw[i].sweep = (n >= ETA_SWEEP_MIN && stampsIn[i] === n - 1) ? tip : 0;
    }
  } else {
    for (let i = 0; i < n; i++) if (inp.unreg && inp.unreg[i]) raw[i].hazard = ETA_HAZARD;
    for (let j = 0; j < n; j++) {
      const corr = [];
      (inp.corrections || []).forEach((c, from) => {
        if (c && c.target === j && from !== j && c.mult > 0 && c.mult !== 1) corr.push({ from, mult: c.mult });
      });
      if (!corr.length || !logged[j]) continue;
      const cr = etaSyllyCredit(logged[j], truths[j], corr);
      finals[j] = cr.final;
      Object.keys(cr.nav).forEach(k => { raw[k].nav += cr.nav[k]; });
      Object.keys(cr.det).forEach(k => { raw[k].det += cr.det[k]; });
      raw[j].ins += cr.ins;
      banners[j] = cr.spin ? 'spin' : cr.back ? 'back' : null;
    }
  }
  const receipts = raw.map((r, i) => {
    const L = [];
    const add = (key, label, v) => { const km = etaGeared(v, runs); if (km !== 0 || key === 'acc') L.push({ key, label, km }); };
    add('acc', logged[i] ? 'Accuracy' : 'Accuracy (no ETA)', r.acc);
    if (!sylly) {
      if (stampsIn[i]) add('tips', `Depot Tips (${stampsIn[i]} ${stampsIn[i] === 1 ? 'Stamp' : 'Stamps'})`, r.tips);
      if (r.sweep) add('sweep', 'Sweep Bonus', r.sweep);
    } else {
      if (r.hazard) add('hazard', 'Hazard Pay', r.hazard);
      if (r.nav) add('nav', 'Navigation Assist', r.nav);
      if (r.det) add('det', 'Detour Penalty', -r.det);
      if (r.ins) add('ins', 'Insurance Payout', r.ins);
      const sum = L.reduce((a, l) => a + l.km, 0);
      if (sum < 0) L.push({ key: 'floor', label: 'Floor', km: -sum });
    }
    return L;
  });
  const runTotals = receipts.map(L => L.reduce((a, l) => a + l.km, 0));
  return { raw, receipts, runTotals, banners, stampsIn, finals };
}

// End of Shift: who wins (ties share) and Dotty's Notes.
function etaComputeEnd(names, totals, history, sylly) {
  const best = Math.max(...totals);
  const winners = totals.map((t, i) => (t === best ? i : -1)).filter(i => i >= 0);
  const awards = [];
  const pick = (vals, better) => {
    let at = -1, v = null;
    vals.forEach((x, i) => { if (x == null) return; if (at < 0 || better(x, v)) { at = i; v = x; } });
    return at < 0 ? null : { seat: at, value: v };
  };
  // Sharpest: smallest single |log10(logged/truth)| across the Shift.
  const sharp = Array(names.length).fill(null);
  history.forEach(h => (h.logged || []).forEach((l, i) => {
    if (!(l > 0) || !(h.truths[i] > 0)) return;
    const f = Math.abs(Math.log10(l / h.truths[i]));
    if (sharp[i] == null || f < sharp[i]) sharp[i] = f;
  }));
  const s = pick(sharp, (a, b) => a < b);
  if (s) awards.push({ key: 'sharp', emoji: '🎯', title: 'Sharpest Estimate', seat: s.seat,
    detail: `closest single Logged ETA: ${(Math.pow(10, s.value)).toFixed(2)}×` });
  if (!sylly) {
    const st = Array(names.length).fill(0);
    history.forEach(h => (h.stampsIn || []).forEach((k, i) => { st[i] += k || 0; }));
    const c = pick(st.map(v => v || null), (a, b) => a > b);
    if (c) awards.push({ key: 'crowd', emoji: '🎙️', title: 'Crowd Favourite', seat: c.seat,
      detail: `${c.value} ${c.value === 1 ? 'Stamp' : 'Stamps'} of Approval` });
  } else {
    const line = (h, i, key) => ((h.receipts[i] || []).find(l => l.key === key) || {}).km || 0;
    const det = Array(names.length).fill(null), nav = Array(names.length).fill(null), ins = Array(names.length).fill(0);
    history.forEach(h => names.forEach((_, i) => {
      const d = -line(h, i, 'det'); if (d > 0 && (det[i] == null || d > det[i].v)) det[i] = { v: d, run: h.run };
      const a = line(h, i, 'nav');  if (a > 0 && (nav[i] == null || a > nav[i].v)) nav[i] = { v: a, run: h.run };
      ins[i] += line(h, i, 'ins');
    }));
    const d = pick(det.map(x => x && x.v), (a, b) => a > b);
    if (d) awards.push({ key: 'spin', emoji: '💥', title: 'Biggest Spin-out', seat: d.seat,
      detail: `Run ${det[d.seat].run}: −${etaFmtInt(d.value)} km in Detour Penalties` });
    const a = pick(nav.map(x => x && x.v), (p, q) => p > q);
    if (a) awards.push({ key: 'rescue', emoji: '🧭', title: 'Best Rescue', seat: a.seat,
      detail: `Run ${nav[a.seat].run}: +${etaFmtInt(a.value)} km Navigation Assist` });
    const ii = pick(ins.map(v => v || null), (p, q) => p > q);
    if (ii) awards.push({ key: 'insured', emoji: '🛡️', title: 'Most Insured', seat: ii.seat,
      detail: `+${etaFmtInt(ii.value)} km in Insurance Payouts` });
  }
  return { winners, awards };
}

// ── Content: truth, the route draw, the curated deal (spec §10) ─────────────
function etaSpeedFor(route, ride) {
  let s = (route.useMax && ride.max) ? ride.max : ride.cruise;
  if (route.limitKmh) s = Math.min(s, route.limitKmh);
  return s;
}
function etaTruth(route, ride) { return route.km / etaSpeedFor(route, ride) * 60; }

function etaEligibleRides(data, route, sylly) {
  const w = data.window || { minMinutes: 2, maxMinutes: 5.26e10 };
  return (data.rides || []).filter(d => (sylly || !d.unregistered)).filter(d => {
    const t = etaTruth(route, d);
    return t >= w.minMinutes && t <= w.maxMinutes;
  });
}

function etaRouteOk(data, route, seats, sylly) {
  const el = etaEligibleRides(data, route, sylly);
  return el.length >= seats && new Set(el.filter(d => !d.unregistered).map(d => d.tier)).size >= 3;
}

function etaRangeHas(range, route) {
  return range === 'mixed' || (range === 'local' ? route.tier === 'local' : route.tier === 'astro');
}

// The Route for the next Run: Range filter, never a repeat, Off the Map share.
function etaDrawRoute(data, opts, rng) {
  rng = rng || Math.random;
  const ok = r => etaRangeHas(opts.range, r) && !(opts.used || []).includes(r.id) && etaRouteOk(data, r, opts.seats, opts.sylly);
  const real = (data.routes || []).filter(r => !r.offMap && ok(r));
  const fant = opts.offMap ? (data.routes || []).filter(r => r.offMap && ok(r)) : [];
  let pool = real;
  if (fant.length && (!real.length || rng() < ETA_OFFMAP_SHARE)) pool = fant;
  if (!pool.length) {
    // Ran dry (a 7-Run Local Shift on a thin content set): allow a repeat rather than stall.
    pool = (data.routes || []).filter(r => !r.offMap && etaRangeHas(opts.range, r) && etaRouteOk(data, r, opts.seats, opts.sylly));
  }
  if (!pool.length) pool = (data.routes || []).filter(r => etaRouteOk(data, r, opts.seats, opts.sylly));
  return pool[Math.floor(rng() * pool.length)] || null;
}

// One Ride per seat, drawn for SPREAD: eligible Rides sorted by speed and cut into
// `seats` bands, one from each. Skips a Ride the seat already held this Shift and any
// Ride within ×1.15 effective speed of one already picked — both best effort.
function etaDealRun(data, route, seats, opts, rng) {
  rng = rng || Math.random;
  const used = (opts && opts.used) || [];
  const el = etaEligibleRides(data, route, opts && opts.sylly)
    .map(d => ({ d, s: etaSpeedFor(route, d) }))
    .sort((a, b) => a.s - b.s);
  const picks = [];
  const near = s => picks.some(p => Math.max(p.s, s) / Math.min(p.s, s) < ETA_NEAR_SAME);
  for (let k = 0; k < seats; k++) {
    const lo = Math.floor(k * el.length / seats), hi = Math.floor((k + 1) * el.length / seats);
    let band = el.slice(lo, Math.max(hi, lo + 1)).filter(x => !picks.includes(x));
    const fresh = band.filter(x => !near(x.s));
    if (fresh.length) band = fresh;
    if (!band.length) band = el.filter(x => !picks.includes(x));
    picks.push(band[Math.floor(rng() * band.length)]);
  }
  // Shuffle across seats, then repair "already held this Shift" by swapping where possible.
  for (let i = picks.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [picks[i], picks[j]] = [picks[j], picks[i]]; }
  const held = (i, p) => (used[i] || []).includes(p.d.id);
  for (let i = 0; i < picks.length; i++) {
    if (!held(i, picks[i])) continue;
    for (let j = 0; j < picks.length; j++) {
      if (j !== i && !held(i, picks[j]) && !held(j, picks[i])) { [picks[i], picks[j]] = [picks[j], picks[i]]; break; }
    }
  }
  return picks.map(p => p.d);
}

// The shared Briefing: the Route's lines, then every dealt Unregistered Ride's hint.
function etaBuildBriefing(route, rides) {
  const lines = (route.briefing || []).slice();
  rides.forEach(d => { if (d.unregistered && d.hint && !lines.includes(d.hint)) lines.push(d.hint); });
  return lines;
}

function etaQuip(data, ride, kind, rng) {
  if (ride.quip && (kind === 'fast' || kind === 'slow' || kind === 'dead')) return ride.quip;
  const pool = ((data && data.quips) || {})[kind] || ['Received in good order.'];
  return pool[Math.floor((rng || Math.random)() * pool.length)];
}

// ── Wire normalisation (Firebase erases null / [] / {}) ─────────────────────
function etaWireArr(v, n, fill) {
  const out = Array(n).fill(fill);
  if (Array.isArray(v)) v.forEach((x, i) => { if (i < n && x !== undefined && x !== null) out[i] = x; });
  else if (v && typeof v === 'object') Object.keys(v).forEach(k => { const i = Number(k); if (i >= 0 && i < n && v[k] != null) out[i] = v[k]; });
  return out;
}
function etaWireList(v) {
  if (Array.isArray(v)) return v.filter(x => x != null);
  if (v && typeof v === 'object') return Object.keys(v).sort((a, b) => a - b).map(k => v[k]).filter(x => x != null);
  return [];
}

// ═══════════════════════════════════════════════════════════════════════════
// Seats, channels
// ═══════════════════════════════════════════════════════════════════════════
function etaN() { return etaPlayerNames.length; }
function etaMode() { return window.syllyMultiplayerMode; }
function etaIsHost() { return etaMode() === 'host'; }
function etaMySeat() { return (typeof mpMyPlayerIdx === 'number' && mpMyPlayerIdx >= 0) ? mpMyPlayerIdx : 0; }
function etaSeatOf(uid) { return (mpPlayerSlots || []).findIndex(s => s && s.uid === uid); }
function etaHostUid() { return mpPlayerSlots && mpPlayerSlots[0] ? mpPlayerSlots[0].uid : null; }
function etaName(i) { return etaPlayerNames[i] || `Courier ${i + 1}`; }

// Host → everyone (public). Never in 'single' mode — the harness drives seats directly.
function etaSend(payload) {
  if (etaMode() === 'single') return;
  mpSendEnvelope({ type: 'SYNC', payload });
}
// Host → one seat, private. The host's own seat is set directly (never a self-write).
function etaSendTo(seat, payload) {
  if (etaMode() === 'single') return;
  const s = mpPlayerSlots[seat];
  if (s && s.uid) mpSendPrivate(s.uid, { type: 'SYNC', payload });
}
// Seat → host, PRIVATE (the CLD_COMMIT pattern): a public ACTION would publish a
// Logged ETA, a Stamp or a Correction to every rival before its reveal.
function etaSendHost(payload) {
  mpSendPrivate(etaHostUid(), { type: 'ACTION', payload });
}

// ═══════════════════════════════════════════════════════════════════════════
// Content load
// ═══════════════════════════════════════════════════════════════════════════
// The safety net: a host whose fetch fails (offline, never cached) still has a Shift.
const ETA_FALLBACK_DATA = {
  version: 1, provisional: true, window: { minMinutes: 2, maxMinutes: 52596000000 },
  routes: [
    { id: 'fb-marathon', headline: 'A full marathon', km: 42.2, tier: 'local', briefing: ['A brand-new, perfectly straight, empty corridor runs end to end. No stops, no traffic.'] },
    { id: 'fb-italy', headline: 'The length of Italy', km: 1200, tier: 'geo', briefing: ['A brand-new, perfectly straight, empty corridor runs end to end. No stops, no traffic.'] },
    { id: 'fb-equator', headline: 'Once around the Earth at the equator', km: 40075, tier: 'geo', briefing: ['A cleared corridor runs the whole way — whatever your Ride, it can use it.'] },
    { id: 'fb-moon', headline: 'Earth to the Moon', km: 384400, tier: 'astro', briefing: ['A cleared corridor runs all the way.'] },
    { id: 'fb-mars', headline: 'Earth to Mars', km: 54600000, tier: 'astro', briefing: ['A cleared space lane runs the whole way, with air to breathe and a road to roll on.'] },
  ],
  rides: [
    { id: 'fb-snail', name: 'Garden snail', mode: 'land', tier: 'crawl', cruise: 0.048, reveal: 'A garden snail manages about 0.05 km/h.' },
    { id: 'fb-walk', name: 'Your own two feet', mode: 'land', tier: 'crawl', cruise: 5, reveal: 'A steady walk is about 5 km/h.' },
    { id: 'fb-trolley', name: 'Shopping trolley', mode: 'land', tier: 'crawl', cruise: 6, reveal: 'A shopping trolley does about 6 km/h.' },
    { id: 'fb-skate', name: 'Skateboard', mode: 'land', tier: 'pedal', cruise: 15, reveal: 'A skateboard cruises at about 15 km/h.' },
    { id: 'fb-bike', name: 'Bicycle', mode: 'land', tier: 'pedal', cruise: 25, reveal: 'A bicycle cruises at about 25 km/h.' },
    { id: 'fb-horse', name: 'Horse', mode: 'land', tier: 'pedal', cruise: 30, reveal: 'A horse holds about 30 km/h.' },
    { id: 'fb-boat', name: 'Speedboat', mode: 'sea', tier: 'road', cruise: 70, reveal: 'A speedboat cruises at about 70 km/h.' },
    { id: 'fb-car', name: 'Family car', mode: 'land', tier: 'road', cruise: 100, reveal: 'A family car cruises at about 100 km/h.' },
    { id: 'fb-heli', name: 'Helicopter', mode: 'air', tier: 'rail', cruise: 250, reveal: 'A helicopter cruises at about 250 km/h.' },
    { id: 'fb-train', name: 'High-speed train', mode: 'land', tier: 'rail', cruise: 300, reveal: 'A high-speed train runs at about 300 km/h.' },
    { id: 'fb-jet', name: 'Passenger jet', mode: 'air', tier: 'sky', cruise: 900, reveal: 'A passenger jet cruises at about 900 km/h.' },
    { id: 'fb-rocket', name: 'Rocket', mode: 'space', tier: 'sky', cruise: 28000, reveal: 'A rocket in orbit does about 28,000 km/h.' },
    { id: 'fb-carpet', name: 'Flying carpet', mode: 'air', tier: 'unreg', cruise: 50, max: 500, unregistered: true, hint: 'Wind speeds perfect for a gentle ride.', reveal: 'A flying carpet cruises at about 50 km/h.' },
  ],
  quips: { dead: ['Dead on. Gold star.'], close: ['Close enough for the paperwork.'], fast: ["You're dreaming."], slow: ["It's quicker than that. Keep up."] },
  flavour: ['Righto, next job.'],
};

function etaEnsureData() {
  if (etaData) return Promise.resolve(etaData);
  if (etaDataPromise) return etaDataPromise;
  if (typeof fetch !== 'function') { etaData = ETA_FALLBACK_DATA; return Promise.resolve(etaData); }
  etaDataPromise = fetch('data/eta-data.json')
    .then(r => (r.ok ? r.json() : Promise.reject(new Error('eta-data ' + r.status))))
    .then(d => { etaData = d; return d; })
    .catch(e => { console.warn('[eta] content load failed — fallback set', e); etaData = ETA_FALLBACK_DATA; return etaData; });
  return etaDataPromise;
}

// ═══════════════════════════════════════════════════════════════════════════
// Shift lifecycle — HOST
// ═══════════════════════════════════════════════════════════════════════════
function etaOnEnter() {
  etaPlayerNames = (mpPlayerSlots || []).map(p => p.nickname || '');
  etaPlayerCount = etaPlayerNames.length;
  activeGameId = 'eta';
  if (etaIsHost()) etaEnsureData().then(() => etaStartShift());
  else etaShowStandby();
}

function etaStartShift() {
  etaClearTimers();
  etaClearStalls();
  etaUsedRoutes = [];
  etaUsedRides  = etaPlayerNames.map(() => []);
  const p = {
    action: 'ETA_SHIFT_START',
    names: etaPlayerNames.slice(),
    runs: etaShiftLength,
    sylly: !!etaSyllyMode,
    jobBase: 11 + Math.floor(etaRng() * 70),
  };
  etaSend(p);
  etaApplyShiftStart(p);
  etaHostStartRun();
}

function etaHostStartRun() {
  const n = etaN();
  const run = etaRun + 1;
  const data = etaData || ETA_FALLBACK_DATA;
  const route = etaDrawRoute(data, { range: etaRange, used: etaUsedRoutes, seats: n, sylly: etaSylly, offMap: etaOffMap }, etaRng);
  const rides = etaDealRun(data, route, n, { used: etaUsedRides, sylly: etaSylly }, etaRng);
  etaUsedRoutes.push(route.id);
  rides.forEach((d, i) => { (etaUsedRides[i] = etaUsedRides[i] || []).push(d.id); });
  etaRunRoute  = route;
  etaRunRides  = rides;
  etaRunTruths = rides.map(d => etaTruth(route, d));
  const fl = data.flavour || ['Righto, next job.'];
  const p = {
    action: 'ETA_RUN_START',
    run,
    route: { headline: route.headline, km: etaGps ? route.km : null, briefing: etaBuildBriefing(route, rides), offMap: !!route.offMap },
    flavour: fl[Math.floor(etaRng() * fl.length)],
  };
  etaHostPhase = 'log';
  etaSend(p);
  etaApplyRunStart(p);
  // The Rides, privately — after RUN_START so a client's Run is open to receive them
  // (one that still beats it is held in etaPendingRide).
  rides.forEach((d, seat) => {
    const ride = { name: d.name, mode: d.mode, emoji: d.emoji || '', unreg: !!d.unregistered };
    if (seat === etaMySeat()) etaApplyRide({ action: 'ETA_RIDE', run, ride });
    else etaSendTo(seat, { action: 'ETA_RIDE', run, ride });
  });
}

// ── Host appliers — explicit seat, so one process can play every seat ────────
function etaApplyLog(seat, run, minutes) {
  if (run !== etaRun || etaHostPhase !== 'log') return false;
  if (!(seat >= 0 && seat < etaN()) || etaLogReady[seat]) return false;
  const m = Number(minutes);
  if (!(m > 0) || !isFinite(m) || m > ETA_MAX_MINUTES) return false;
  etaLogged[seat] = m;
  etaLogReady[seat] = true;
  etaHostLogProgress();
  return true;
}

function etaHostLogProgress() {
  const n = etaN();
  const missing = etaLogReady.filter(r => !r).length;
  if (!missing) { etaHostOpenSheet(); return; }
  if (missing === 1 && n > 1 && !etaLogStallTimer) {
    etaStallEndsAt = Date.now() + ETA_LOG_STALL_MS;
    // WHY: the brief's stalled-player rule — one courier mid-argument can't freeze the table.
    etaLogStallTimer = setTimeout(() => { etaLogStallTimer = null; etaHostOpenSheet(); }, ETA_LOG_STALL_MS);
  }
  const p = { action: 'ETA_LOG_STATUS', run: etaRun, ready: etaLogReady.slice(), stallEndsAt: etaLogStallTimer ? etaStallEndsAt : 0 };
  etaSend(p);
  etaApplyLogStatus(p);
}

function etaHostOpenSheet() {
  if (etaHostPhase !== 'log') return;
  etaClearStalls();
  etaHostPhase = 'social';
  const n = etaN();
  etaStamps      = Array(n).fill(-1);
  etaCorrections = Array(n).fill(null);
  const p = {
    action: 'ETA_SHEET',
    run: etaRun,
    rows: etaRunRides.map((d, i) => ({ ride: d.name, mode: d.mode, unreg: !!d.unregistered, logged: etaLogged[i] > 0 ? etaLogged[i] : -1 })),
  };
  etaSend(p);
  etaApplySheet(p);
}

function etaApplyStamp(seat, run, target) {
  if (run !== etaRun || etaHostPhase !== 'social' || etaSylly) return false;
  const n = etaN();
  if (!(seat >= 0 && seat < n) || !(target >= 0 && target < n) || target === seat) return false;
  etaStamps[seat] = target;
  etaSocialReady[seat] = true;
  etaHostSocialProgress();
  return true;
}

function etaApplyCorrection(seat, run, target, mult) {
  if (run !== etaRun || etaHostPhase !== 'social' || !etaSylly) return false;
  const n = etaN();
  if (!(seat >= 0 && seat < n)) return false;
  if (target === -1) etaCorrections[seat] = null;                     // Hands off
  else {
    if (!(target >= 0 && target < n) || target === seat || !(etaLogged[target] > 0)) return false;
    const m = Math.min(ETA_CORR_MAX, Math.max(ETA_CORR_MIN, Number(mult)));
    if (!isFinite(m)) return false;
    etaCorrections[seat] = Math.abs(m - 1) < 1e-9 ? null : { target, mult: m };
  }
  etaSocialReady[seat] = true;
  etaHostSocialProgress();
  return true;
}

function etaHostSocialProgress() {
  const n = etaN();
  const missing = etaSocialReady.filter(r => !r).length;
  if (!missing) { etaHostResolve(); return; }
  if (missing === 1 && n > 1 && !etaStallTimer) {
    etaStallEndsAt = Date.now() + ETA_STALL_MS;
    // WHY: the stalled-player rule — the last courier counts as no Stamp / Hands off.
    etaStallTimer = setTimeout(() => { etaStallTimer = null; etaHostResolve(); }, ETA_STALL_MS);
  }
  const p = { action: 'ETA_SOCIAL_STATUS', run: etaRun, ready: etaSocialReady.slice(), stallEndsAt: etaStallTimer ? etaStallEndsAt : 0 };
  etaSend(p);
  etaApplySocialStatus(p);
}

// Settle the WHOLE Run, then send: Corrections (Sylly) then the Proof.
function etaHostResolve() {
  if (etaHostPhase !== 'social') return;
  etaClearStalls();
  etaHostPhase = 'resolved';
  const n = etaN();
  const data = etaData || ETA_FALLBACK_DATA;
  const sc = etaScoreRun({
    n, runs: etaRuns, sylly: etaSylly, logged: etaLogged.slice(), truths: etaRunTruths.slice(),
    unreg: etaRunRides.map(d => !!d.unregistered), stamps: etaStamps.slice(), corrections: etaCorrections.slice(),
  });
  if (etaSylly) {
    const list = [];
    etaCorrections.forEach((c, from) => { if (c) list.push({ from, to: c.target, mult: c.mult }); });
    const revised = etaLogged.map((l, i) => (l > 0 ? (sc.finals[i] || l) : -1));
    const cp = { action: 'ETA_CORRECTIONS', run: etaRun, list, revised };
    etaSend(cp);
    etaApplyCorrections(cp);
  }
  const before = etaTotals.slice();
  const totals = before.map((t, i) => t + sc.runTotals[i]);
  const verdicts = etaLogged.map((l, i) => (l > 0 ? etaVerdict(l, etaRunTruths[i]) : null));
  const p = {
    action: 'ETA_PROOF',
    run: etaRun,
    truths: etaRunTruths.slice(),
    speeds: etaRunRides.map(d => etaSpeedFor(etaRunRoute, d)),
    reveal: etaRunRides.map(d => d.reveal || ''),
    quips: verdicts.map((v, i) => (v ? etaQuip(data, etaRunRides[i], v.kind, etaRng) : "No ETA, no paperwork, no pay.")),
    verdicts: verdicts.map(v => (v ? { top: v.top, bot: v.bot, kind: v.kind } : { top: 'NO ETA', bot: 'NOTHING LOGGED', kind: 'none' })),
    stampsIn: sc.stampsIn,
    banners: sc.banners.map(b => b || ''),
    receipts: sc.receipts,
    runTotals: sc.runTotals,
    totals,
    ranksBefore: before.map(etaRankIdx),
    ranksAfter: totals.map(etaRankIdx),
  };
  etaSend(p);
  etaApplyProof(p);
}

// Host: tally → the next Run, or End of Shift.
function etaHostNext() {
  if (!etaIsHost() && etaMode() !== 'single') return;
  if (etaHostPhase !== 'resolved') return;
  if (etaRun < etaRuns) { etaHostStartRun(); return; }
  const end = etaComputeEnd(etaPlayerNames, etaTotals, etaHistory, etaSylly);
  const p = { action: 'ETA_SHIFT_END', totals: etaTotals.slice(), winners: end.winners, awards: end.awards };
  etaHostPhase = 'idle';
  etaSend(p);
  etaApplyShiftEnd(p);
}

function etaClearStalls() {
  if (etaStallTimer)    { clearTimeout(etaStallTimer);    etaStallTimer = null; }
  if (etaLogStallTimer) { clearTimeout(etaLogStallTimer); etaLogStallTimer = null; }
  etaStallEndsAt = 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// Appliers — EVERY device (the host calls them on its own payloads, so host and
// clients reach the same state by the same code)
// ═══════════════════════════════════════════════════════════════════════════
function etaApplyShiftStart(p) {
  const n = etaWireList(p.names).length || etaN();
  etaPlayerNames = etaWireList(p.names).map(String);
  etaPlayerCount = n;
  etaRuns    = Number(p.runs) || 5;
  etaSylly   = p.sylly === true;
  etaJobBase = Number(p.jobBase) || 40;
  etaRun     = 0;
  etaTotals  = Array(n).fill(0);
  etaHistory = [];
  etaShiftEnd = null;
  etaPendingRide = null;
}

function etaApplyRunStart(p) {
  const n = etaN();
  etaClearTimers();
  etaRun = Number(p.run) || etaRun + 1;
  const r = p.route || {};
  etaRoute = { headline: r.headline || '', km: (r.km > 0 ? r.km : null), briefing: etaWireList(r.briefing).map(String), offMap: r.offMap === true };
  etaFlavour     = p.flavour || '';
  etaLogged      = Array(n).fill(null);
  etaLogReady    = Array(n).fill(false);
  etaSocialReady = Array(n).fill(false);
  etaSheetRows   = [];
  etaCorrList    = [];
  etaRevised     = Array(n).fill(null);
  etaProof       = null;
  etaStallEndsAt = 0;
  etaMyLogged = null; etaMySelect = -1; etaMySent = -1; etaMyMult = 1; etaPendingEntry = null;
  etaLogStage = 'entry'; etaSocialStage = 'idle'; etaPhase = 'idle';
  etaMyRide = (etaPendingRide && etaPendingRide.run === etaRun) ? etaPendingRide.ride : null;
  etaPendingRide = null;
  etaShowDocket();
}

function etaApplyRide(p) {
  const ride = p.ride || {};
  const r = { name: String(ride.name || ''), mode: ride.mode || 'land', emoji: ride.emoji || '', unreg: ride.unreg === true };
  if (Number(p.run) === etaRun) { etaMyRide = r; etaRenderLog(); }
  else if (Number(p.run) > etaRun) etaPendingRide = { run: Number(p.run), ride: r };
}

function etaApplyLogStatus(p) {
  if (Number(p.run) !== etaRun) return;
  etaLogReady    = etaWireArr(p.ready, etaN(), false).map(x => x === true);
  etaStallEndsAt = Number(p.stallEndsAt) || 0;
  etaRenderLog();
}

function etaApplySheet(p) {
  if (Number(p.run) !== etaRun) return;
  const n = etaN();
  etaSheetRows = etaWireArr(p.rows, n, null).map(r => (r ? {
    ride: String(r.ride || ''), mode: r.mode || 'land', unreg: r.unreg === true, logged: r.logged > 0 ? Number(r.logged) : null,
  } : { ride: '', mode: 'land', unreg: false, logged: null }));
  etaLogged = etaSheetRows.map(r => r.logged);
  etaLogReady = Array(n).fill(true);
  etaSocialReady = Array(n).fill(false);
  etaStallEndsAt = 0;
  etaPhase = 'reveal';
  etaSocialStage = 'idle';
  etaMySelect = -1; etaMySent = -1; etaMyMult = 1;
  etaShowSheet();
}

function etaApplySocialStatus(p) {
  if (Number(p.run) !== etaRun) return;
  etaSocialReady = etaWireArr(p.ready, etaN(), false).map(x => x === true);
  etaStallEndsAt = Number(p.stallEndsAt) || 0;
  etaRenderSheetControls();
}

function etaApplyCorrections(p) {
  if (Number(p.run) !== etaRun) return;
  const n = etaN();
  etaCorrList = etaWireList(p.list).map(c => ({ from: Number(c.from), to: Number(c.to), mult: Number(c.mult) }));
  etaRevised = etaWireArr(p.revised, n, -1).map(v => (v > 0 ? Number(v) : null));
  etaSocialReady = Array(n).fill(true);
  etaStallEndsAt = 0;
  etaPhase = 'shove';
  etaSocialStage = 'idle';
  etaPlaySheetPhase();
}

function etaApplyProof(p) {
  if (Number(p.run) !== etaRun) return;
  const n = etaN();
  const recs = etaWireArr(p.receipts, n, null).map(L => etaWireList(L).map(l => ({ key: String(l.key), label: String(l.label), km: Number(l.km) || 0 })));
  etaProof = {
    run: etaRun,
    truths:      etaWireArr(p.truths, n, 0).map(Number),
    speeds:      etaWireArr(p.speeds, n, 0).map(Number),
    reveal:      etaWireArr(p.reveal, n, '').map(String),
    quips:       etaWireArr(p.quips, n, '').map(String),
    verdicts:    etaWireArr(p.verdicts, n, null).map(v => v || { top: '', bot: '', kind: 'none' }),
    stampsIn:    etaWireArr(p.stampsIn, n, 0).map(Number),
    banners:     etaWireArr(p.banners, n, '').map(b => b || null),
    receipts:    recs,
    runTotals:   etaWireArr(p.runTotals, n, 0).map(Number),
    totals:      etaWireArr(p.totals, n, 0).map(Number),
    ranksBefore: etaWireArr(p.ranksBefore, n, 0).map(Number),
    ranksAfter:  etaWireArr(p.ranksAfter, n, 0).map(Number),
    logged:      etaLogged.slice(),
  };
  etaProof.places = etaPlacings(etaProof.logged, etaProof.truths);
  etaTotals = etaProof.totals.slice();
  etaHistory = etaHistory.filter(h => h.run !== etaRun).concat([etaProof]);
  etaSocialReady = Array(n).fill(true);
  etaStallEndsAt = 0;
  // Sylly: the Proof waits for the Corrections reveal to finish (it may arrive mid-shove).
  if (etaPhase !== 'shove') { etaPhase = 'proof'; etaPlaySheetPhase(); }
}

function etaApplyShiftEnd(p) {
  const n = etaN();
  etaShiftEnd = {
    totals:  etaWireArr(p.totals, n, 0).map(Number),
    winners: etaWireList(p.winners).map(Number),
    awards:  etaWireList(p.awards).map(a => ({ key: String(a.key), emoji: String(a.emoji || ''), title: String(a.title || ''), seat: Number(a.seat), detail: String(a.detail || '') })),
  };
  etaTotals = etaShiftEnd.totals.slice();
  etaShowGameover();
}

// ═══════════════════════════════════════════════════════════════════════════
// Local submits (every device; the host applies its own seat directly)
// ═══════════════════════════════════════════════════════════════════════════
function etaSubmitLog(minutes, label) {
  if (etaLogStage !== 'entry' || !(minutes > 0)) return;
  etaLogStage = 'locked';
  etaMyLogged = { minutes, label };
  const seat = etaMySeat();
  if (etaMode() === 'client') {
    etaLogReady[seat] = true;                 // local proxy; the host's status is the last word
    etaSendHost({ action: 'ETA_LOG', run: etaRun, minutes });
    etaRenderLog();
  } else {
    etaApplyLog(seat, etaRun, minutes);
    etaRenderLog();
  }
}

function etaSubmitStamp(target) {
  if (etaPhase !== 'talk' || etaSylly) return;
  const seat = etaMySeat();
  if (target === seat || !(target >= 0)) return;
  etaMySent = target;
  etaSocialStage = 'sent';
  if (etaMode() === 'client') {
    etaSocialReady[seat] = true;
    etaSendHost({ action: 'ETA_STAMP', run: etaRun, target });
  } else etaApplyStamp(seat, etaRun, target);
  etaRenderSheetControls();
}

function etaSubmitCorrection(target, mult) {
  if (etaPhase !== 'talk' || !etaSylly) return;
  const seat = etaMySeat();
  etaMySent = target;
  etaSocialStage = 'sent';
  if (etaMode() === 'client') {
    etaSocialReady[seat] = true;
    etaSendHost({ action: 'ETA_CORRECT', run: etaRun, target, mult: target < 0 ? 1 : mult });
  } else etaApplyCorrection(seat, etaRun, target, target < 0 ? 1 : mult);
  etaRenderSheetControls();
}

// ═══════════════════════════════════════════════════════════════════════════
// Envelope router (engine-multiplayer.js → here when mpActiveGame === 'eta')
// ═══════════════════════════════════════════════════════════════════════════
function etaHandleEnvelope(env) {
  const p = (env && env.payload) || {};
  try {
    if (env.type === 'ACTION') {
      if (!etaIsHost()) return;
      // Seat from the envelope, never the payload (logic-engine § MDLM Patterns).
      const seat = etaSeatOf(env.originId);
      if (seat < 0) return;
      if (p.action === 'ETA_LOG')     etaApplyLog(seat, Number(p.run), Number(p.minutes));
      if (p.action === 'ETA_STAMP')   etaApplyStamp(seat, Number(p.run), Number(p.target));
      if (p.action === 'ETA_CORRECT') etaApplyCorrection(seat, Number(p.run), Number(p.target), Number(p.mult));
      return;
    }
    if (env.type !== 'SYNC' || etaIsHost()) return;   // the host authors every SYNC
    switch (p.action) {
      case 'ETA_SHIFT_START':   etaApplyShiftStart(p); etaShowStandby(); break;
      case 'ETA_RUN_START':     etaApplyRunStart(p); break;
      case 'ETA_RIDE':          etaApplyRide(p); break;
      case 'ETA_LOG_STATUS':    etaApplyLogStatus(p); break;
      case 'ETA_SHEET':         etaApplySheet(p); break;
      case 'ETA_SOCIAL_STATUS': etaApplySocialStatus(p); break;
      case 'ETA_CORRECTIONS':   etaApplyCorrections(p); break;
      case 'ETA_PROOF':         etaApplyProof(p); break;
      case 'ETA_SHIFT_END':     etaApplyShiftEnd(p); break;
    }
  } catch (e) {
    console.warn('[eta] envelope', p.action, e);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Screens
// ═══════════════════════════════════════════════════════════════════════════
function etaEl(id) { return document.getElementById(id); }
function etaReduced() {
  try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  catch (_) { return false; }
}
function etaLater(fn, ms) { const h = setTimeout(fn, ms); etaTimers.push(h); return h; }
function etaClearTimers() {
  etaTimers.forEach(h => clearTimeout(h));
  etaTimers = [];
  if (etaBoard) etaBoard.stop();
}
function etaRunLabel() { return `RUN ${etaRun} OF ${etaRuns}`; }
function etaJobNo() { return `JOB #${String(etaJobBase + etaRun).padStart(4, '0')}`; }
function etaEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function etaSetText(id, t) { const el = etaEl(id); if (el) el.textContent = t; }
function etaShow(id, on, disp) { const el = etaEl(id); if (el) el.style.display = on ? (disp || '') : 'none'; }

function etaShowMenu() {
  etaSyncSettingsUI();
  showScreen('screen-eta-menu');
}

function etaShowStandby() {
  etaSetText('eta-standby-line', etaPlayerNames.length
    ? `Clocked on: ${etaPlayerNames.length} couriers. Waiting for the first job…`
    : 'Waiting for the first job…');
  showScreen('screen-eta-standby');
}

// ── The job docket (interstitial) ───────────────────────────────────────────
function etaShowDocket() {
  const root = etaEl('eta-docket-board');
  if (root && typeof etaDocketInto === 'function') {
    etaDocketInto(root, {
      runLabel: etaRunLabel(), jobNo: etaJobNo(), route: etaRoute, flavour: etaFlavour,
    }, { reducedMotion: etaReduced(), compact: false });
  }
  showScreen('screen-eta-docket');
  if (typeof playTick === 'function') { playTick(); etaLater(() => playTick(), 300); etaLater(() => playTick(), 600); }
  etaLater(() => { if (typeof playHullThud === 'function') playHullThud(); }, (etaRoute && etaRoute.offMap ? ETA_OFFMAP_MS : 0) + 700);
  // WHY: the docket is an auto-advancing interstitial (ui-style Global UI Protocol rule 5).
  etaLater(() => etaShowLog(), ETA_DOCKET_MS + (etaRoute && etaRoute.offMap ? ETA_OFFMAP_MS : 0));
}

// ── Your Ride + Log ETA ─────────────────────────────────────────────────────
function etaShowLog() {
  const root = etaEl('eta-log-docket');
  if (root && typeof etaDocketInto === 'function') {
    etaDocketInto(root, { runLabel: etaRunLabel(), jobNo: etaJobNo(), route: etaRoute, flavour: '' }, { reducedMotion: true, compact: true });
  }
  etaSetText('eta-log-run', etaRunLabel());
  const dial = etaEl('eta-dial');
  if (dial && etaLogStage === 'entry') etaDialReset(dial);
  showScreen('screen-eta-log');
  etaRenderLog();
}

function etaRenderLog() {
  const card = etaEl('eta-ride-card');
  if (card) {
    card.innerHTML = '';
    if (etaMyRide) {
      const badge = typeof etaRenderBadge === 'function' ? etaRenderBadge(etaMyRide.mode, { unreg: etaMyRide.unreg, size: 48 }) : null;
      const wrap = document.createElement('div');
      wrap.className = 'eta-ride-card-inner';
      if (badge) wrap.appendChild(badge);
      const txt = document.createElement('div');
      txt.className = 'eta-ride-text';
      txt.innerHTML = `<span class="eta-ride-eyebrow">YOUR RIDE</span>`
        + `<span class="eta-ride-name">${etaEsc(etaMyRide.name)}${etaMyRide.emoji ? ' <span aria-hidden="true">' + etaEsc(etaMyRide.emoji) + '</span>' : ''}</span>`
        + `<span class="eta-ride-mode">${etaEsc(ETA_MODE_NAME[etaMyRide.mode] || '')}${etaMyRide.unreg ? ' · <b>NO REGO</b> — Hazard Pay if you take it' : ''}</span>`;
      wrap.appendChild(txt);
      card.appendChild(wrap);
      card.classList.toggle('is-unreg', !!etaMyRide.unreg);
    } else {
      card.innerHTML = `<p class="eta-ride-wait">Dotty's finding you something in the shed…</p>`;
    }
  }
  const locked = etaLogStage === 'locked';
  etaShow('eta-dial', !locked);
  etaShow('btn-eta-log', !locked && !!etaMyRide, 'flex');
  etaShow('eta-log-wait', locked);
  if (locked) {
    etaSetText('eta-log-mine', etaMyLogged ? `Logged: ${etaMyLogged.label}` : 'Logged.');
    const k = etaLogReady.filter(Boolean).length;
    etaSetText('eta-log-count', `Clocked on: ${k} of ${etaN()}`);
    const ticks = etaEl('eta-log-ticks');
    if (ticks) ticks.innerHTML = etaPlayerNames.map((nm, i) =>
      `<li class="eta-tick-row${etaLogReady[i] ? ' is-in' : ''}"><span>${etaEsc(nm)}</span>${etaLogReady[i] ? '<span class="eta-tick-stamp">LOGGED</span>' : '<span class="eta-tick-wait">…</span>'}</li>`).join('');
  }
  etaRenderStall('eta-log-stall', locked);
}

// The countdown line, when the host has armed a stall.
function etaRenderStall(id, show) {
  const el = etaEl(id);
  if (!el) return;
  const left = etaStallEndsAt ? Math.max(0, Math.ceil((etaStallEndsAt - Date.now()) / 1000)) : 0;
  el.textContent = left ? `Last one in — ${left}s on the clock.` : '';
  el.style.display = (show !== false && left) ? '' : 'none';
  if (left && !etaTickInterval) {
    etaTickInterval = setInterval(() => {
      if (!etaStallEndsAt || Date.now() > etaStallEndsAt + 1500) { clearInterval(etaTickInterval); etaTickInterval = null; }
      if (etaPhase === 'talk') etaRenderSheetControls(); else etaRenderLog();
    }, 1000);
  }
}

// ── The Time Dial (shared with Practice): number + unit chips + ×1,000 / ×1M ──
function etaDialState(root) {
  return { unit: root.dataset.unit || 'hr', mult: Number(root.dataset.mult) || 1 };
}
function etaDialReset(root) {
  root.dataset.unit = 'hr';
  root.dataset.mult = '1';
  const num = root.querySelector('[data-eta-dial-num]');
  if (num) num.value = '';
  etaDialPaint(root);
}
function etaDialPaint(root) {
  const st = etaDialState(root);
  root.querySelectorAll('[data-eta-unit]').forEach(b => {
    const on = b.dataset.etaUnit === st.unit;
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  const multRow = root.querySelector('[data-eta-mult-row]');
  if (multRow) multRow.style.display = st.unit === 'yr' ? '' : 'none';
  root.querySelectorAll('[data-eta-mult]').forEach(b => {
    const on = Number(b.dataset.etaMult) === st.mult;
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}
function etaDialWire(root) {
  root.addEventListener('click', e => {
    const u = e.target.closest && e.target.closest('[data-eta-unit]');
    const m = e.target.closest && e.target.closest('[data-eta-mult]');
    if (u) {
      root.dataset.unit = u.dataset.etaUnit;
      if (root.dataset.unit !== 'yr') root.dataset.mult = '1';
      if (typeof playPillClick === 'function') playPillClick();
      etaDialPaint(root);
    } else if (m) {
      const v = Number(m.dataset.etaMult);
      root.dataset.mult = String(Number(root.dataset.mult) === v ? 1 : v);   // tap again to clear
      if (typeof playPillClick === 'function') playPillClick();
      etaDialPaint(root);
    }
  });
}
// → { value, unit, mult, minutes, label } or { error } (spec §7).
function etaDialRead(root) {
  const num = root.querySelector('[data-eta-dial-num]');
  const raw = num ? String(num.value).replace(/,/g, '').trim() : '';
  const v = Number(raw);
  const st = etaDialState(root);
  if (!raw || !isFinite(v) || v <= 0) return { error: 'Need a number. A real one.' };
  const minutes = etaToMinutes(v, st.unit, st.mult);
  if (!minutes || minutes > ETA_MAX_MINUTES) return { error: "That's longer than the universe. Try again." };
  return { value: v, unit: st.unit, mult: st.mult, minutes, label: etaEntryLabel(v, st.unit, st.mult) };
}
function etaShake(el) {
  if (!el) return;
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
}

function etaLogTap() {
  const dial = etaEl('eta-dial');
  if (!dial || etaLogStage !== 'entry') return;
  const r = etaDialRead(dial);
  if (r.error) {
    etaSetText('eta-dial-error', r.error);
    etaShow('eta-dial-error', true);
    etaShake(dial);
    if (typeof playBoing === 'function') playBoing();
    return;
  }
  etaShow('eta-dial-error', false);
  etaPendingEntry = r;
  etaSetText('eta-doubletake-text', etaDoubleTakeText(r.value, r.unit, r.mult, r.minutes));
  etaShow('eta-doubletake-overlay', true, 'flex');
  if (typeof playDone === 'function') playDone();
}

// ── The Run Sheet ───────────────────────────────────────────────────────────
function etaBoardRows() {
  return etaSheetRows.map((r, i) => ({
    name: etaName(i), ride: r.ride, mode: r.mode, unreg: r.unreg, logged: r.logged,
  }));
}

function etaEnsureBoard() {
  const root = etaEl('eta-sheet-board');
  if (!root || typeof etaMakeBoard !== 'function') return null;
  if (!etaBoard || etaBoard.root !== root) {
    etaBoard = etaMakeBoard(root, { onRowTap: i => etaRowTap(i) });
  }
  return etaBoard;
}

function etaShowSheet() {
  showScreen('screen-eta-sheet');
  etaSetText('eta-sheet-run', etaRunLabel());
  const b = etaEnsureBoard();
  if (b) {
    b.setReduced(etaReduced());
    b.setHeader({ runLabel: etaRunLabel(), jobNo: etaJobNo() });
    b.setRows(etaBoardRows(), { mine: etaMySeat() });
  }
  etaPlaySheetPhase();
}

function etaTalkNote() {
  return etaSylly
    ? ['Talk me through it, then.', "Then grab someone's wheel."]
    : ['Talk me through it, then.', 'Best pitch gets my stamp.'];
}

// Drives the board for the current etaPhase. Every phase has a settled end state
// the Skip button jumps to (the board's settle()).
function etaPlaySheetPhase() {
  const b = etaEnsureBoard();
  if (etaPhase === 'reveal') {
    if (b) {
      b.setNote('Filling in the Run Sheet…', 'Quickest at the top of the scale. Ish.');
      b.reveal(() => {
        if (etaPhase !== 'reveal') return;
        etaPhase = 'talk';
        const [a, c] = etaTalkNote();
        b.setNote(a, c);
        etaRenderSheetControls();
      });
    } else etaPhase = 'talk';
  } else if (etaPhase === 'shove') {
    if (b) {
      b.settleReveal();
      b.setSelected(-1); b.setGhost(-1, 1);
      b.setNote(etaCorrList.length ? "Hang on — a few amendments." : 'Hands off, the lot of you?', etaCorrList.length ? 'In red pen, naturally.' : 'Fair enough.');
      b.shove(etaCorrList.map(c => ({ to: c.to, mult: c.mult, from: etaName(c.from) })), etaRevised, () => {
        if (etaPhase !== 'shove') return;
        if (etaProof) { etaPhase = 'proof'; etaPlaySheetPhase(); }
        else { etaPhase = 'shove-done'; etaRenderSheetControls(); }
      });
    }
  } else if (etaPhase === 'proof') {
    if (b && etaProof) {
      b.settleReveal();
      b.setSelected(-1); b.setGhost(-1, 1);
      const P = etaProof;
      const rows = P.truths.map((t, i) => ({
        truth: t,
        verdict: P.verdicts[i],
        kmLabel: `+${etaFmtInt(P.runTotals[i])} km`,
        banner: P.banners[i],
        fact: P.truths[i] > 0
          ? `${etaSheetRows[i] ? etaSheetRows[i].ride : 'The Ride'} at ~${etaFmtInt(P.speeds[i])} km/h: about ${etaDur(t)}.`
          : '',
        quip: P.quips[i],
        said: P.logged[i] > 0 ? etaDur(P.logged[i]) : '',
        trueLabel: etaDur(t),
        place: P.places[i],
      }));
      b.proof(rows, etaClosest(P.places, P.verdicts, etaName), () => {
        if (etaPhase !== 'proof') return;
        etaPhase = 'done';
        etaRenderSheetControls();
      });
    }
  }
  etaRenderSheetControls();
}

// The sign-off's "Closest:" line — every courier sharing 1st, and how close they were.
function etaClosest(places, verdicts, nameOf) {
  const firsts = places.map((p, i) => (p === 1 ? i : -1)).filter(i => i >= 0);
  return firsts.length ? { name: firsts.map(nameOf).join(' & '), line: etaOffWords(verdicts[firsts[0]]) } : null;
}

function etaRowTap(i) {
  if (etaPhase !== 'talk') return;
  const me = etaMySeat();
  if (i === me) return;
  if (etaSylly && !(etaLogged[i] > 0)) return;
  if (etaSocialStage === 'sent' && etaSylly) return;   // a Course Correction is final once locked
  etaMySelect = i;
  if (etaSylly) { etaMyMult = etaMySent === i ? etaMyMult : 1; etaSocialStage = 'picking'; }
  if (typeof playPillClick === 'function') playPillClick();
  etaRenderSheetControls();
  // The controls can sit under the fold on a short phone: bring the choice into view.
  const ctl = etaEl(etaSylly ? 'eta-wheel' : 'eta-stamp-bar');
  if (ctl && typeof ctl.scrollIntoView === 'function') ctl.scrollIntoView({ block: 'nearest', behavior: etaReduced() ? 'auto' : 'smooth' });
}

function etaWheelReadout() {
  const t = etaMySelect;
  if (t < 0) return '';
  const pct = Math.round((etaMyMult - 1) * 100);
  const from = etaLogged[t];
  const sign = pct > 0 ? '+' : '';
  const factor = etaMyMult >= 1 ? `×${etaTrim(etaMyMult)}` : `÷${etaTrim(1 / etaMyMult)}`;
  return from > 0
    ? `Your correction: ${factor} (${sign}${pct}%) — ${etaDur(from)} → ${etaDur(from * etaMyMult)}`
    : `Your correction: ${factor}`;
}
function etaTrim(x) { return x >= 10 ? String(Math.round(x)) : String(Math.round(x * 100) / 100); }

// Dial position −1…+1 ↔ ÷10…×10 (a compressed scale: ÷10 and ×10 feel the same size).
function etaWheelFromPos(pos) {
  let m = Math.pow(10, Math.max(-1, Math.min(1, pos)));
  for (const s of ETA_CORR_STOPS) if (Math.abs(Math.log10(m / s)) < 0.0128) { m = s; break; }   // snap within 3%
  if (Math.abs(Math.log10(m)) < 0.0128) m = 1;
  return m;
}
function etaWheelPos(m) { return Math.log10(m); }

function etaRenderSheetControls() {
  const b = etaBoard;
  const me = etaMySeat();
  const talk = etaPhase === 'talk';
  const anim = etaPhase === 'reveal' || etaPhase === 'shove' || etaPhase === 'proof';
  etaShow('btn-eta-sheet-skip', anim, 'flex');
  etaShow('btn-eta-odometer', etaPhase === 'done', 'flex');
  // Selection + my own ghost only — never anyone else's, never the truth.
  if (b && talk) {
    b.setSelectable(i => i !== me && (!etaSylly || etaLogged[i] > 0));
    b.setSelected(etaMySelect);
    b.setStamped(!etaSylly ? etaMySent : -1);
    b.setGhost(etaSylly && etaMySelect >= 0 ? etaMySelect : -1, etaMyMult);
  } else if (b) b.setSelectable(null);

  // Standard: the stamp bar
  const stampOn = talk && !etaSylly;
  etaShow('eta-stamp-bar', stampOn);
  if (stampOn) {
    const sel = etaMySelect;
    const tip = `+${etaFmtInt(etaStampTip())} km`;
    const bar = etaEl('eta-stamp-prompt');
    if (bar) {
      if (etaMySent >= 0 && sel === etaMySent) {
        bar.innerHTML = `You stamped <b>${etaEsc(etaName(etaMySent))}</b> — ${tip} to them. Tap another line to change it, until everyone's in.`;
      } else if (sel >= 0) {
        bar.innerHTML = `Stamp <b>${etaEsc(etaName(sel))}</b>'s pitch? It pays them <b>${tip}</b>.`;
      } else {
        bar.innerHTML = `Stamp the best <b>pitch</b> — not the best guess. Each Stamp pays that courier <b>${tip}</b>. Tap their line.`;
      }
    }
    const btn = etaEl('btn-eta-stamp');
    if (btn) {
      btn.style.display = sel >= 0 && sel !== etaMySent ? 'flex' : 'none';
      btn.textContent = sel >= 0 ? `Stamp ${etaName(sel)}` : 'Stamp it';
    }
  }
  // Sylly: the wheel picker (in the Controls zone, never over the Run Sheet — spec §17 #3)
  const wheelOn = talk && etaSylly;
  etaShow('eta-wheel', wheelOn);
  if (wheelOn) {
    const sent = etaSocialStage === 'sent';
    const sel = etaMySelect;
    etaSetText('eta-wheel-title', sent
      ? (etaMySent >= 0 ? `Locked: ${etaName(etaMySent)}'s wheel` : 'Hands off — locked')
      : sel >= 0 ? `Grab ${etaName(sel)}'s wheel` : "Tap a courier's line to grab their wheel — or keep your hands off.");
    etaShow('eta-wheel-dial', !sent && sel >= 0);
    const range = etaEl('eta-wheel-range');
    if (range) range.value = String(Math.round(etaWheelPos(etaMyMult) * 1000));
    etaSetText('eta-wheel-readout', sel >= 0 ? etaWheelReadout() : '');
    etaShow('btn-eta-wheel-lock', !sent && sel >= 0, 'flex');
    etaShow('btn-eta-wheel-hands', !sent, 'flex');
  }
  // Status
  const k = etaSocialReady.filter(Boolean).length, n = etaN();
  let status = '';
  if (talk) status = etaSylly ? (etaSocialStage === 'sent' ? `Recalculating… ${k} of ${n} in` : `${k} of ${n} in`)
                              : `${k} of ${n} stamped`;
  if (etaPhase === 'shove-done') status = 'Waiting for Proof of Delivery…';
  etaSetText('eta-social-status', status);
  etaShow('eta-social-status', !!status);
  etaRenderStall('eta-sheet-stall', talk);
  // Your result, at a glance, once Proof of Delivery has settled.
  const mineOn = etaPhase === 'done' && !!etaProof;
  etaShow('eta-my-result', mineOn);
  if (mineOn) etaRenderMyResult();
}

// One Stamp's Depot Tip as the receipt will show it (geared to the Shift Length).
function etaStampTip() {
  return etaGeared(ETA_TIP_BY_N[etaN()] || ETA_TIP_BY_N[8], etaRuns);
}

function etaRenderMyResult() {
  const el = etaEl('eta-my-result');
  const P = etaProof;
  if (!el || !P) return;
  const i = etaMySeat();
  const l = P.logged[i], t = P.truths[i], pl = P.places[i] || 0;
  const v = P.verdicts[i] || { kind: 'none' };
  const km = `+${etaFmtInt(P.runTotals[i] || 0)} km`;
  let html = '<p class="eta-myresult-eye eta-sten">YOUR RESULT</p>';
  if (l > 0 && t > 0) {
    const place = pl >= 1 && pl <= 3
      ? `<span class="eta-place-chip is-p${pl}">${etaOrdinal(pl).toUpperCase()}</span>`
      : `<span class="eta-myresult-rank">${etaOrdinal(pl)} closest</span>`;
    const keep = m => etaEsc(etaDur(m)).replace(/ /g, ' ');   // "8.3 days" never splits across lines
    html += `<p class="eta-myresult-line">You said <b>${keep(l)}</b>. True ETA: <b>${keep(t)}</b>.</p>`
      + `<p class="eta-myresult-sub">${place}<span class="eta-myresult-off is-${etaEsc(v.kind)}">${etaEsc(etaOffWords(v))}</span><span class="eta-myresult-km">${km}</span></p>`;
  } else {
    html += `<p class="eta-myresult-line">No ETA logged — no Accuracy this Run.</p><p class="eta-myresult-sub"><span class="eta-myresult-km">${km}</span></p>`;
  }
  el.innerHTML = html;
}

// ── Odometer tally ──────────────────────────────────────────────────────────
function etaShowTally() {
  if (!etaProof) return;
  const P = etaProof;
  const n = etaN();
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => P.totals[b] - P.totals[a] || a - b);
  const list = etaEl('eta-tally-list');
  const reduced = etaReduced();
  if (list) {
    list.innerHTML = '';
    order.forEach((i, pos) => {
      const rb = P.ranksBefore[i], ra = P.ranksAfter[i];
      const next = ETA_RANKS[ra + 1];
      const card = document.createElement('div');
      card.className = 'eta-receipt' + (i === etaMySeat() ? ' is-me' : '') + (reduced ? ' is-settled' : '');
      card.style.setProperty('--d', `${pos * 140}ms`);
      const row = etaSheetRows[i] || {};
      const head = document.createElement('div');
      head.className = 'eta-receipt-head';
      const badge = typeof etaRenderBadge === 'function' ? etaRenderBadge(row.mode || 'land', { unreg: row.unreg, size: 28 }) : null;
      if (badge) head.appendChild(badge);
      const nm = document.createElement('div');
      nm.className = 'eta-receipt-name';
      nm.innerHTML = `<b>${etaEsc(etaName(i))}</b><span>${etaEsc(row.ride || '')}</span>`;
      head.appendChild(nm);
      const tot = document.createElement('div');
      tot.className = 'eta-receipt-total';
      tot.innerHTML = `<span class="eta-odo">${etaFmtInt(P.totals[i])}</span><span class="eta-odo-unit">km</span>`;
      head.appendChild(tot);
      card.appendChild(head);
      const lines = document.createElement('ul');
      lines.className = 'eta-receipt-lines';
      lines.innerHTML = (P.receipts[i] || []).map(l =>
        `<li><span>${etaEsc(l.label)}</span><span>${l.km < 0 ? '−' : '+'}${etaFmtInt(Math.abs(l.km))}</span></li>`).join('')
        + `<li class="eta-receipt-run"><span>This Run</span><span>+${etaFmtInt(P.runTotals[i])}</span></li>`;
      card.appendChild(lines);
      const rank = document.createElement('div');
      rank.className = 'eta-receipt-rank';
      rank.innerHTML = `<span class="eta-rank-name">${etaEsc(ETA_RANKS[ra].name)}</span>`
        + (ra > rb ? '<span class="eta-promo-stamp">PROMOTED</span>' : '')
        + `<span class="eta-rank-next">${next ? `next rank in ${etaFmtInt(next.km - P.totals[i])} km` : 'Top of the ladder'}</span>`;
      card.appendChild(rank);
      list.appendChild(card);
    });
  }
  const last = etaRun >= etaRuns;
  const host = etaIsHost() || etaMode() === 'single';
  const nb = etaEl('btn-eta-next');
  if (nb) { nb.style.display = host ? 'flex' : 'none'; nb.textContent = last ? 'End of Shift' : 'Next job'; }
  etaShow('eta-tally-wait', !host);
  etaSetText('eta-tally-run', etaRunLabel());
  showScreen('screen-eta-tally');
  if (typeof playTick === 'function') for (let k = 0; k < Math.min(n, 6); k++) etaLater(() => playTick(), 140 * k);
  if (P.ranksAfter.some((r, i) => r > P.ranksBefore[i]) && typeof playSuccess === 'function') etaLater(() => playSuccess(), 140 * n + 200);
}

// ── End of Shift ────────────────────────────────────────────────────────────
function etaShowGameover() {
  const E = etaShiftEnd;
  if (!E) return;
  const n = etaN();
  const win = E.winners.filter(i => i >= 0 && i < n);
  const cotm = etaEl('eta-cotm-name');
  if (cotm) cotm.textContent = win.length > 1 ? `Shared: ${win.map(etaName).join(' & ')}` : etaName(win[0]);
  const w0 = win[0] >= 0 ? win[0] : 0;
  etaSetText('eta-cotm-line', `${ETA_RANKS[etaRankIdx(E.totals[w0])].name} · ${etaFmtInt(E.totals[w0])} km`);
  etaSetText('eta-go-sub', `${etaRuns} Runs clocked. "That's the lot. Sign off and go home." — Dotty`);
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => E.totals[b] - E.totals[a] || a - b);
  const medals = ['🥇', '🥈', '🥉'];
  let place = 0, prev = null;
  const st = etaEl('eta-standings');
  if (st) st.innerHTML = order.map((i, k) => {
    if (prev === null || E.totals[i] !== prev) place = k;
    prev = E.totals[i];
    return `<li class="eta-stand-row${i === etaMySeat() ? ' is-me' : ''}"><span class="eta-medal-slot">${medals[place] || ''}</span>`
      + `<span class="eta-stand-name">${etaEsc(etaName(i))}</span>`
      + `<span class="eta-stand-rank">${etaEsc(ETA_RANKS[etaRankIdx(E.totals[i])].name)}</span>`
      + `<span class="eta-stand-km">${etaFmtInt(E.totals[i])} km</span></li>`;
  }).join('');
  const aw = etaEl('eta-awards');
  if (aw) aw.innerHTML = E.awards.length
    ? E.awards.map(a => `<li><span class="eta-award-emoji" aria-hidden="true">${etaEsc(a.emoji)}</span><span><b>${etaEsc(a.title)}</b> — ${etaEsc(etaName(a.seat))} <span class="eta-award-detail">(${etaEsc(a.detail)})</span></span></li>`).join('')
    : '<li>Nothing to note. A quiet one.</li>';
  showScreen('screen-eta-gameover');
  if (typeof playStampede === 'function') playStampede();
}

// ═══════════════════════════════════════════════════════════════════════════
// Settings
// ═══════════════════════════════════════════════════════════════════════════
const ETA_RANGE_LINE = { local: 'Local — marathons to countries', mixed: 'Mixed — everything', cosmic: 'Cosmic — orbit and beyond' };

function etaToggle(id, on) {
  const el = etaEl(id);
  if (!el) return;
  el.className = (on ? 'game-toggle-on-eta' : 'game-toggle-off') + ' shrink-0';
  el.textContent = on ? 'ON' : 'OFF';
}

function etaSyncSettingsUI() {
  document.querySelectorAll('[data-group="eta-range"]').forEach(p => p.classList.toggle('pill-active-eta', p.dataset.val === etaRange));
  document.querySelectorAll('[data-group="eta-shift"]').forEach(p => p.classList.toggle('pill-active-eta', Number(p.dataset.val) === etaShiftLength));
  etaSetText('eta-val-range', ETA_RANGE_LINE[etaRange] || '');
  etaSetText('eta-val-shift', `${etaShiftLength} Runs`);
  etaToggle('btn-eta-gps-toggle', etaGps);
  etaToggle('btn-eta-offmap-toggle', etaOffMap);
  etaToggle('btn-eta-sylly-toggle', etaSyllyMode);
}

// Secret Mode hook (checklist): settings-only overrides; ETA is in no pack yet.
function etaApplyExpansionOverrides() {
  const o = (typeof isSecretMode !== 'undefined' && isSecretMode) ? window.activeExpansionOverrides : null;
  if (!o) return;
  if (o.etaRange)       etaRange = o.etaRange;
  if (o.etaShiftLength) etaShiftLength = o.etaShiftLength;
}

// ═══════════════════════════════════════════════════════════════════════════
// How to Play (Rules · Practice · Ranks)
// ═══════════════════════════════════════════════════════════════════════════
function etaOpenHowTo(tab) {
  const ov = etaEl('eta-how-to-overlay');
  if (!ov) return;
  etaRenderRanks();
  etaSetHowToTab(tab || 'rules');
  const inner = ov.querySelector('.overlay-data-inner');
  if (inner) inner.scrollTop = 0;
  ov.style.display = 'flex';
}

function etaSetHowToTab(tab) {
  ['rules', 'practice', 'ranks'].forEach(t => {
    const on = t === tab;
    const b = etaEl(`btn-eta-howto-tab-${t}`);
    if (b) b.classList.toggle('pill-active-eta', on);
    const body = etaEl(`eta-how-to-${t}`);
    if (body) { body.style.display = on ? 'flex' : 'none'; if (on) body.scrollTop = 0; }
  });
  if (tab === 'practice' && typeof etaPracticeOpen === 'function') etaPracticeOpen();
  else if (typeof etaPracticeStop === 'function') etaPracticeStop();
}

function etaRenderRanks() {
  const el = etaEl('eta-ranks-list');
  if (!el) return;
  el.innerHTML = ETA_RANKS.map((r, i) =>
    `<li class="eta-rank-row"><span class="eta-rank-num">${i + 1}</span><span class="eta-rank-body"><b>${etaEsc(r.name)}</b><span>${etaEsc(r.line)}</span></span><span class="eta-rank-km">${etaFmtInt(r.km)} km</span></li>`).join('');
}

// ═══════════════════════════════════════════════════════════════════════════
// Practice — the Arena (brief §24). One scripted Run around the player's own free
// answer, built from the REAL Time Dial and the REAL Run Sheet board (a second
// instance) and the REAL scoring. Touches no match state; no multiplayer.
// ═══════════════════════════════════════════════════════════════════════════
const ETA_PRACTICE = {
  route: { headline: 'The length of Italy', km: 1200, briefing: ['A brand-new, perfectly **straight, empty corridor** runs end to end.', '**No stops, no traffic.**'], offMap: false },
  you:   { ride: 'Helicopter', mode: 'air', speed: 250, emoji: '🚁' },
  others: [
    { name: 'Boris', ride: 'Pogo stick',       mode: 'land',  logged: 4 * 1440,  speed: 4,     pitch: 'Four days of non-stop bouncing. No bathroom breaks.' },
    { name: 'Chloe', ride: 'Shopping trolley', mode: 'land',  logged: 21 * 1440, speed: 6,     pitch: 'One wonky wheel adds a full week.' },
    { name: 'Dev',   ride: 'Rocket',           mode: 'space', logged: 20,        speed: 28000, pitch: "Once we're airborne, it's twenty minutes flat." },
  ],
  // Fixed Stamps from the others (giver → target); seat 0 is the player.
  stamps: { 1: 2, 2: 1, 3: 0 },
};
let etaPrac = null;

function etaDialHtml() {
  const u = (k, l, on) => `<button type="button" class="eta-unit${on ? ' is-on' : ''}" data-eta-unit="${k}">${l}</button>`;
  return `<div class="eta-clip eta-dial" data-unit="hr" data-mult="1">
    <span class="eta-dial-label">YOUR LOGGED ETA</span>
    <input data-eta-dial-num type="text" inputmode="decimal" autocomplete="off" placeholder="0" class="eta-dial-num" aria-label="How long, as a number">
    <div class="eta-dial-units" role="group" aria-label="Time Dial">${u('min', 'min')}${u('hr', 'hrs', true)}${u('day', 'days')}${u('wk', 'wks')}${u('mo', 'months')}${u('yr', 'yrs')}</div>
    <div class="eta-dial-mults" data-eta-mult-row style="display:none"><span>For the really long ones:</span>
      <button type="button" class="eta-unit" data-eta-mult="1000">×1,000</button><button type="button" class="eta-unit" data-eta-mult="1000000">×1M</button></div>
    <p class="eta-dial-error" data-eta-dial-err style="display:none"></p></div>`;
}

function etaPracticeOpen() {
  etaPracticeStop();
  const root = etaEl('eta-practice');
  if (!root) return;
  const P = ETA_PRACTICE;
  etaPrac = { stage: 'log', board: null };
  root.innerHTML = `<div class="eta-desk eta-practice-desk flex flex-col gap-3">
      <p class="eta-practice-step" data-eta-prac-step>Read the docket, then guess how long your Ride takes. Distance ÷ speed, then pick a unit.</p>
      <div data-eta-prac-docket></div>
      <div class="eta-clip eta-ride-card" data-eta-prac-ride></div>
      <div data-eta-prac-dial>${etaDialHtml()}</div>
      <button type="button" class="eta-cta min-h-14 w-full rounded-2xl text-xl font-semibold active:scale-95 transition-transform duration-150" data-eta-prac-go>Log ETA</button>
      <div data-eta-prac-board style="display:none"></div>
      <p class="eta-practice-step" data-eta-prac-after style="display:none"></p>
    </div>`;
  const q = s => root.querySelector(s);
  etaDocketInto(q('[data-eta-prac-docket]'), { runLabel: 'PRACTICE', jobNo: 'JOB #0001', route: P.route }, { compact: true, reducedMotion: true });
  const card = q('[data-eta-prac-ride]');
  const wrap = document.createElement('div');
  wrap.className = 'eta-ride-card-inner';
  wrap.appendChild(etaRenderBadge(P.you.mode, { size: 56 }));
  const t = document.createElement('div');
  t.className = 'eta-ride-text';
  t.innerHTML = `<span class="eta-ride-eyebrow">YOUR RIDE</span><span class="eta-ride-name">${P.you.ride} <span aria-hidden="true">${P.you.emoji}</span></span><span class="eta-ride-mode">Air · a hint: helicopters cruise at a couple of hundred km/h</span>`;
  wrap.appendChild(t);
  card.appendChild(wrap);
  const dial = q('.eta-dial');
  etaDialWire(dial);
  etaDialPaint(dial);
  q('[data-eta-prac-go]').addEventListener('click', () => {
    if (!etaPrac || etaPrac.stage !== 'log') return;
    const r = etaDialRead(dial);
    const err = q('[data-eta-dial-err]');
    if (r.error) { err.textContent = r.error; err.style.display = ''; etaShake(dial); playBoing(); return; }
    err.style.display = 'none';
    playDone();
    etaPracticeSheet(root, r);
  });
}

function etaPracticeSheet(root, entry) {
  const P = ETA_PRACTICE;
  const q = s => root.querySelector(s);
  etaPrac.stage = 'reveal';
  etaPrac.entry = entry;
  ['[data-eta-prac-docket]', '[data-eta-prac-ride]', '[data-eta-prac-dial]', '[data-eta-prac-go]'].forEach(s => { q(s).style.display = 'none'; });
  const holder = q('[data-eta-prac-board]');
  holder.style.display = '';
  const step = q('[data-eta-prac-step]');
  step.textContent = `Dotty's Double-Take: ${etaDoubleTakeText(entry.value, entry.unit, entry.mult, entry.minutes)} Locked. Here comes the Run Sheet.`;
  const rows = [{ name: 'You', ride: P.you.ride, mode: P.you.mode, unreg: false, logged: entry.minutes }]
    .concat(P.others.map(o => ({ name: o.name, ride: o.ride, mode: o.mode, unreg: false, logged: o.logged })));
  const b = etaMakeBoard(holder, { onRowTap: i => {
    if (!etaPrac || etaPrac.stage !== 'stamp' || i === 0) return;
    playSuccess();
    etaPracticeProof(root, i);
  } });
  etaPrac.board = b;
  b.setReduced(etaReduced());
  b.setHeader({ runLabel: 'PRACTICE', jobNo: 'JOB #0001' });
  b.setRows(rows, { mine: 0 });
  b.setNote('Filling in the Run Sheet…', 'Quickest at the left. Ish.');
  b.reveal(() => {
    if (!etaPrac || etaPrac.board !== b) return;
    etaPrac.stage = 'talk';
    let k = 0;
    const next = () => {
      if (!etaPrac || etaPrac.board !== b) return;
      if (k < P.others.length) {
        const o = P.others[k++];
        b.setNote(`${o.name}: "${o.pitch}"`, 'Talk me through it, then.');
        step.textContent = 'Talk Me Through It — at a real table everyone argues out loud. Here, the others have a go…';
        // WHY: scripted pitches, one at a time, at reading pace (Practice only).
        etaPrac.timer = setTimeout(next, 2600);
      } else {
        etaPrac.stage = 'stamp';
        b.setSelectable(i => i !== 0);
        b.setNote('Best pitch gets my stamp.', 'Tap a line. Not your own.');
        step.textContent = "Give your Stamp of Approval: tap the courier whose pitch you liked best. It's for the pitch, not for being right.";
      }
    };
    next();
  });
}

function etaPracticeProof(root, target) {
  const P = ETA_PRACTICE;
  const b = etaPrac.board;
  etaPrac.stage = 'proof';
  b.setSelectable(null);
  b.setStamped(target);
  const n = 4;
  const speeds = [P.you.speed].concat(P.others.map(o => o.speed));
  const truths = speeds.map(s => P.route.km / s * 60);
  const logged = [etaPrac.entry.minutes].concat(P.others.map(o => o.logged));
  const stamps = [target, P.stamps[1], P.stamps[2], P.stamps[3]];
  const sc = etaScoreRun({ n, runs: 5, sylly: false, logged, truths, stamps, unreg: [false, false, false, false] });
  const rides = [P.you.ride].concat(P.others.map(o => o.ride));
  const places = etaPlacings(logged, truths);
  const rows = truths.map((t, i) => {
    const v = etaVerdict(logged[i], t);
    return { truth: t, verdict: v, kmLabel: `+${etaFmtInt(sc.runTotals[i])} km`, banner: null,
      said: etaDur(logged[i]), trueLabel: etaDur(t), place: places[i],
      fact: `${rides[i]} at ~${etaFmtInt(speeds[i])} km/h: about ${etaDur(t)}.`,
      quip: v.kind === 'dead' ? 'Dead on. Gold star.' : v.kind === 'close' ? 'Close enough for the paperwork.' : v.kind === 'fast' ? "You're dreaming." : "It's quicker than that. Keep up." };
  });
  const step = root.querySelector('[data-eta-prac-step]');
  step.textContent = 'Proof of Delivery: a parcel drops on each true ETA, and the three closest are stamped 1st, 2nd and 3rd. Closer means more Mileage — judged by how many times out, not the gap.';
  const names = ['You'].concat(P.others.map(o => o.name));
  b.proof(rows, etaClosest(places, rows.map(r => r.verdict), i => names[i]), () => {
    if (!etaPrac || etaPrac.board !== b) return;
    const v = rows[0].verdict;
    const lines = sc.receipts[0].map(l => `${l.label} +${etaFmtInt(l.km)}`).join(' · ');
    const after = root.querySelector('[data-eta-prac-after]');
    after.style.display = '';
    after.innerHTML = `<b>Your receipt:</b> ${etaEsc(lines)} = <b>${etaFmtInt(sc.runTotals[0])} km</b>. `
      + `You came ${etaOrdinal(places[0])} of 4. `
      + (v.kind === 'dead' ? 'Dead on — within 5% is full marks.' : `You were ${etaOffWords(v)}. Helicopters cruise at about 250 km/h: 1,200 ÷ 250 ≈ 4.8 hours.`)
      + ' <button type="button" class="eta-unit" data-eta-prac-again>Try again</button>';
    after.querySelector('[data-eta-prac-again]').addEventListener('click', () => { playPillClick(); etaPracticeOpen(); });
  });
}

function etaPracticeStop() {
  if (!etaPrac) return;
  if (etaPrac.board) etaPrac.board.stop();
  if (etaPrac.timer) clearTimeout(etaPrac.timer);
  etaPrac = null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Teardown
// ═══════════════════════════════════════════════════════════════════════════
function etaResetShift() {
  etaRun = 0; etaTotals = []; etaHistory = []; etaUsedRoutes = []; etaUsedRides = []; etaShiftEnd = null;
  etaRoute = null; etaFlavour = ''; etaMyRide = null; etaPendingRide = null;
  etaRunRides = []; etaRunRoute = null; etaRunTruths = [];
  etaLogged = []; etaLogReady = []; etaSheetRows = []; etaStamps = []; etaCorrections = [];
  etaSocialReady = []; etaCorrList = []; etaRevised = []; etaProof = null;
  etaHostPhase = 'idle'; etaPhase = 'idle'; etaLogStage = 'entry'; etaSocialStage = 'idle';
  etaMyLogged = null; etaMySelect = -1; etaMySent = -1; etaMyMult = 1; etaPendingEntry = null;
}

function etaTeardown() {
  etaClearTimers();
  etaClearStalls();
  if (etaTickInterval) { clearInterval(etaTickInterval); etaTickInterval = null; }
  if (etaBoard) etaBoard.stop();
  if (typeof EtaScene !== 'undefined' && EtaScene && typeof EtaScene.stop === 'function') EtaScene.stop();
  if (typeof etaPracticeStop === 'function') etaPracticeStop();
  etaResetShift();
}

// ═══════════════════════════════════════════════════════════════════════════
// Wiring
// ═══════════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  const on = (id, fn) => { const el = etaEl(id); if (el) el.addEventListener('click', fn); };

  // Lobby → menu (exact checklist pattern).
  on('btn-eta', () => { playLaunch(); activeGameId = 'eta'; etaEnsureData(); etaShowMenu(); });

  // ETA's partial is assembled AFTER the script block, so engine.js's parse-time
  // .btn-open-sound wiring never reaches it (checklist; FRT is the reference).
  document.querySelectorAll('[id^="screen-eta-"] .btn-open-sound').forEach(b => b.addEventListener('click', openSoundOverlay));

  // Menu
  on('btn-eta-menu-play',     () => { playLaunch(); etaApplyExpansionOverrides(); mpShowModeScreen('eta'); });
  on('btn-eta-menu-how-to',   () => { playDone(); etaOpenHowTo('rules'); });
  on('btn-eta-menu-settings', () => {
    playDone();
    etaSyncSettingsUI();
    const ov = etaEl('eta-settings-overlay');
    const inner = ov && ov.querySelector('.overlay-data-inner');
    if (inner) inner.scrollTop = 0;
    if (ov) ov.style.display = 'flex';
  });
  on('btn-eta-menu-back', () => { playExit(); resetToLobby(); });

  // Settings
  document.querySelectorAll('[data-group="eta-range"]').forEach(p => p.addEventListener('click', () => {
    playPillClick(); etaRange = p.dataset.val; etaSyncSettingsUI();
  }));
  document.querySelectorAll('[data-group="eta-shift"]').forEach(p => p.addEventListener('click', () => {
    playPillClick(); etaShiftLength = Number(p.dataset.val); etaSyncSettingsUI();
  }));
  on('btn-eta-gps-toggle',    () => { playPillClick(); etaGps = !etaGps; etaSyncSettingsUI(); });
  on('btn-eta-offmap-toggle', () => { playPillClick(); etaOffMap = !etaOffMap; etaSyncSettingsUI(); });
  on('btn-eta-sylly-toggle',  () => {
    etaSyllyMode = !etaSyllyMode;
    if (etaSyllyMode) { etaOffMap = true; if (typeof playSyllyOn === 'function') playSyllyOn(); }   // a visible default, not a lock
    else if (typeof playSyllyOff === 'function') playSyllyOff();
    etaSyncSettingsUI();
  });
  on('btn-eta-settings-close', () => { playDone(); etaEl('eta-settings-overlay').style.display = 'none'; });

  // How to Play
  document.querySelectorAll('.btn-eta-how-to').forEach(b => b.addEventListener('click', () => { playDone(); etaOpenHowTo('rules'); }));
  ['rules', 'practice', 'ranks'].forEach(t => on(`btn-eta-howto-tab-${t}`, () => { playPillClick(); etaSetHowToTab(t); }));
  document.querySelectorAll('.btn-eta-howto-close').forEach(b => b.addEventListener('click', () => {
    playDone(); etaEl('eta-how-to-overlay').style.display = 'none';
    if (typeof etaPracticeStop === 'function') etaPracticeStop();
  }));
  on('btn-eta-howto-close', () => {
    playDone(); etaEl('eta-how-to-overlay').style.display = 'none';
    if (typeof etaPracticeStop === 'function') etaPracticeStop();
  });

  // Quit — the Mid-Game Quit Contract (every ETA session is a lobby session).
  document.querySelectorAll('.btn-eta-quit-open').forEach(b => b.addEventListener('click', () => {
    playDone(); etaEl('eta-quit-overlay').style.display = 'flex';
  }));
  on('btn-eta-quit-cancel', () => { playDone(); etaEl('eta-quit-overlay').style.display = 'none'; });
  on('btn-eta-quit-confirm', () => {
    playExit();
    etaEl('eta-quit-overlay').style.display = 'none';
    if (window.syllyMultiplayerMode !== 'single') { mpNotifyPlayerLeft(); resetToLobby(); return; }
    etaShowMenu();
  });

  // Log ETA → Dotty's Double-Take
  const dial = etaEl('eta-dial');
  if (dial) {
    etaDialWire(dial);
    const num = dial.querySelector('[data-eta-dial-num]');
    if (num) num.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); etaLogTap(); } });
  }
  on('btn-eta-log', () => etaLogTap());
  on('btn-eta-doubletake-confirm', () => {
    etaEl('eta-doubletake-overlay').style.display = 'none';
    const r = etaPendingEntry;
    etaPendingEntry = null;
    if (!r) return;
    playDone();
    if (typeof playHullThud === 'function') playHullThud();
    etaSubmitLog(r.minutes, r.label);
  });
  on('btn-eta-doubletake-cancel', () => {
    playBoing();
    etaPendingEntry = null;
    etaEl('eta-doubletake-overlay').style.display = 'none';
  });

  // The Run Sheet
  on('btn-eta-sheet-skip', () => { playPillClick(); if (etaBoard) etaBoard.skip(); });
  on('btn-eta-stamp', () => {
    if (etaMySelect < 0) return;
    playSuccess();
    if (typeof playHullThud === 'function') playHullThud();
    etaSubmitStamp(etaMySelect);
  });
  const range = etaEl('eta-wheel-range');
  if (range) range.addEventListener('input', () => {
    etaMyMult = etaWheelFromPos(Number(range.value) / 1000);
    etaRenderSheetControls();
  });
  on('btn-eta-wheel-down', () => { playPillClick(); etaMyMult = Math.max(ETA_CORR_MIN, etaMyMult / 1.1); etaRenderSheetControls(); });
  on('btn-eta-wheel-up',   () => { playPillClick(); etaMyMult = Math.min(ETA_CORR_MAX, etaMyMult * 1.1); etaRenderSheetControls(); });
  const stops = etaEl('eta-wheel-stops');
  if (stops) stops.addEventListener('click', e => {
    const s = e.target.closest && e.target.closest('[data-eta-stop]');
    if (!s) return;
    playPillClick();
    etaMyMult = Number(s.dataset.etaStop);
    etaRenderSheetControls();
  });
  on('btn-eta-wheel-lock', () => {
    if (etaMySelect < 0) return;
    if (Math.abs(etaMyMult - 1) < 1e-9) { playBoing(); etaSetText('eta-wheel-readout', 'Move the dial first — or keep your hands off.'); return; }
    playSuccess();
    etaSubmitCorrection(etaMySelect, etaMyMult);
  });
  on('btn-eta-wheel-hands', () => { playDone(); etaMySelect = -1; etaSubmitCorrection(-1, 1); });
  on('btn-eta-odometer', () => { playLaunch(); etaShowTally(); });

  // Tally → next (host)
  on('btn-eta-next', () => { playLaunch(); etaHostNext(); });

  // End of Shift
  on('btn-eta-go-exit', () => { playExit(); resetToLobby(); });
  on('btn-eta-go-leave', () => { playExit(); resetToLobby(); });
  on('btn-eta-go-new', () => {
    playDone();
    const client = window.syllyMultiplayerMode === 'client';
    etaSetText('btn-eta-new-confirm', client ? 'Leave Shift' : 'Restart in Lobby');
    etaSetText('eta-new-sub', client ? "You'll leave this Shift." : 'Fresh Odometers, same crew.');
    etaEl('eta-new-shift-overlay').style.display = 'flex';
  });
  on('btn-eta-new-cancel', () => { playDone(); etaEl('eta-new-shift-overlay').style.display = 'none'; });
  on('btn-eta-new-confirm', () => {
    playLaunch();
    etaEl('eta-new-shift-overlay').style.display = 'none';
    mpReturnToLobby();   // host broadcasts LOBBY_RESET; a client leaves
  });

  etaSyncSettingsUI();
});
