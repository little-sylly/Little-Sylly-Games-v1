// ═══════════════════════════════════════════════════════════════════════════
// cld.js — Cold Shoulder (game 19). Blind-commit physics party game on a
// shrinking ice floe. MDLM, host-authoritative timeline playback.
// Sylly Mode = The Thaw.
//
// Depends on: js/lib/physics.js (window.Physics.simulate / .rng),
//             engine.js (showScreen, play*, activeGameId, resetToLobby)
//
// ── STAGE 2 OF 6 (spec §15 build order) ────────────────────────────────────
// This file currently holds the RULES LAYER ONLY: constants, state, Berth
// geometry, the multi-hop shunt, Dives, Berg placement, Slide resolution,
// The Thaw, Washout and Fish scoring. There is deliberately NO DOM, NO canvas,
// NO multiplayer and NO event wiring in it yet — Stage 4 adds the UI and the
// render seam, Stage 5 the MP layer. Everything here is driven headlessly by
// tools/verify-cld-loop.js, and the file must stay loadable in a bare vm
// sandbox until then.
//
// The seam with js/lib/physics.js (spec §4A): the sim owns motion and only
// ever *reports* a plunge. Everything a plunge MEANS — which Berth, which
// slot, whether the Floe-Off just ended — is decided here, between runs.
// ═══════════════════════════════════════════════════════════════════════════

// ── Constants ──────────────────────────────────────────────────────────────
const CLD_W = 360, CLD_H = 360;        // logical canvas space; floe centred at (180,180)
const CLD_SIM_HZ          = 120;       // fixed physics substep — determinism depends on it
const CLD_SAMPLE_HZ       = 20;        // timeline sample rate (payload budget, §11)
const CLD_SIM_CAP_MS      = 5000;      // hard cap; still-moving bodies are forced to rest
const CLD_INTERSTITIAL_MS = 5000;      // Floe-Off intro (PKO/CJAR value)
const CLD_RESULT_MS       = 2500;      // Floe-Off result beat
const CLD_WASHOUT_MS      = 1500;      // brief Decision 21 — the joke needs the beat
const CLD_COLLISION_SFX_MS = 90;       // min gap between collision sounds (§9 throttle)
const CLD_PENGUIN_R       = 11;        // logical units — the collision circle IS the sprite
const CLD_BERG_R          = 12;
const CLD_SUBSTEP_MS      = 1000 / CLD_SIM_HZ;

// ── Ice Conditions and floe geometry (§4B) ─────────────────────────────────
// These moved here VERBATIM from tools/verify-cld-physics.js, which owned them
// for the whole of Stage 1 (no cld.js existed). physics.js must never own Ice
// Conditions mapping (§4A), and a harness that keeps its own copy verifies its
// own arithmetic rather than the shipped game's — so the harness now reads
// them back out of this file. See cld-implementation-notes TG-01.
// v_max CANCELS OUT of D = v²/2a — `a` is derived from it — so this sets how
// long a Slide takes to play, never how far anything reaches. Measured: mean
// 1587 ms, p90 2150, p99 2650, and 0.0% of Slides reach the 5000 ms cap.
const CLD_V_MAX           = 150;    // full-power Slide launch velocity, units/s
const CLD_R_STD           = 130;    // Standard floe radius — R_std
// Both Snowball constants were resolved together at Stage 3 — they are one
// dial, not two. At the Stage-2 shape (r 4, speed 260) 89.6% of thrown balls
// found open ice and only 6% of throws were ever CONTESTED, so §4D's race —
// the near ball landing first and making the far one miss — was invisible
// behind Snowballs that simply never connected. The cause is structural: every
// Slide impulse lands at t = 0, so a ball aimed at where someone IS is aimed at
// where they are about to stop being, and at 260 u/s it arrives ~24% into the
// Slide, by which time a target has covered most of its travel.
//
// At r 8 / speed 600: 54.9% of balls strike, 44.6% find open ice, and 1188 of
// 4214 throws are contested with a 38.6% race-miss — §4D's band, between
// "invisible" and "reads as randomly failing". Bystander hits stay at 0.5%.
// A naive throw still connects only ~31% of the time and a half-led one ~87%,
// so leading the target stays the skill the mechanic is FOR. Going further
// (speed 1400) reaches 96% strikes and kills the race outright at 7.6%.
//
// Neither constant touches `force` (a fraction of v_max, §4D), so the per-throw
// invariant — one Snowball can never push a RESTING penguin off the floe — is
// unaffected, and verify-cld-physics.js still asserts it directly.
const CLD_SNOWBALL_R      = 8;      // the ball's own radius — a contact test, not a blast
const CLD_SNOWBALL_SPEED  = 600;    // units/s in flight → arrivalMs = distance / this
// Confirmed at Stage 3: the floor (0.5·D = 45.5 / 65 / 91 by Ice Conditions)
// is reached in 4.8% of Thaw Floe-Offs — a safety rail, as §4B intends, not a
// routine state.
const CLD_MIN_RADIUS_MULT = 0.5;

const CLD_ICE_MULT  = { powder: 0.70, slush: 1.00, blackice: 1.40 };
const CLD_FLOE_SIZE = { roomy: 150, standard: CLD_R_STD, cramped: 110 };

// ── Rim, Berg and launch constants ─────────────────────────────────────────
const CLD_TAU         = Math.PI * 2;
// Two slots per Berth is the MINIMUM that satisfies both stated constraints at
// once: §4C's "two Drowned penguins may share a Berth" needs ≥2, and Peck Off
// (2 Berths, 4 penguins, up to 3 Drowned at once while both players are still
// alive) needs rim capacity ≥ 3. At 2 the capacity invariant is stronger than
// §4C claims — N·2 slots always exceeds the penguin count, in every mode — so
// the shunt can never run out of rim. See cld-implementation-notes DD-11.
const CLD_BERTH_SLOTS = 2;
// Confirmed at Stage 3. 8 units/Slide bottoms out a Standard floe in 9 Slides
// against a measured 4.21 Slides/Floe-Off under the Thaw, and halves Floe-Off
// length (9.92 → 4.21). The ceiling is the Washout rate, not the shrink rate:
// 12/16/24 take it to 15%/17%/23% of Floe-Offs voided, and a Washout is a joke
// beat (§8) that stops being funny at one in five. 4 and 6 never bite.
const CLD_THAW_STEP   = 8;      // logical units shed per Slide under The Thaw
// Confirmed at Stage 3, and deliberately NOT raised. At 3 Bergs / Ice Breaker
// 3 the sweep gives 0.31 rebounds per Slide against 0.37 plunges — a Berg
// already saves nearly as many penguins as the edge takes. Raising it to 4
// moves the share of Floe-Offs that see a shatter from 30.0% to 33.9%, which is
// inside this instrument's bot-model noise and not worth a constant change; 6
// reaches 57.2% but walls the rim in (0.52 rebounds/Slide). The "until they
// shatter" arc is the ICE BREAKER setting's job, not the count's — at capacity
// 1 a Berg breaks in 79% of Floe-Offs, at capacity 3 in 24%, which is the range
// the setting exists to span. If playtest finds Bergs invisible, 4 is the next
// value and § G of the balance instrument is the table to re-read.
const CLD_BERG_COUNT  = 3;      // Bergs placed when Ice Breaker is on
const CLD_START_RING  = 0.55;   // penguins start on this fraction of the floe radius
const CLD_MIN_POWER   = 0.08;   // §7 — below this a drag is "Too soft", never a commit

// ── Settings (persist between play-agains) ─────────────────────────────────
let cldIceConditions = 'slush';    // 'powder' | 'slush' | 'blackice'
let cldFloeSize      = 'standard'; // 'roomy' | 'standard' | 'cramped'
let cldFloeSizeTouched = false;    // false → auto-pre-select by player count at match start (§5)
let cldFishToWin     = 3;          // 1 | 3 | 5
let cldAimAssist     = true;
let cldIceBreaker    = 3;          // 0 (Off) | 1 | 3  — Berg hit capacity
let cldPeckOff       = false;      // 1v1, two penguins each — forces room bounds to exactly 2
let cldSyllyMode     = false;      // ✨ The Thaw — always last

// ── Roster (set from the lobby, persist across play-agains) ────────────────
let cldPlayerCount = 0;
let cldPlayerNames = [];

// ── Match state (reset each play-again) ────────────────────────────────────
let cldFish        = [];   // [playerIdx] = Fish caught
let cldFloeOffNo   = 0;
let cldMatchStats  = [];   // [playerIdx] = { slidesStood, plunges } — the two gameover stat lines

// ── Floe-Off state (reset on every Resurface) ──────────────────────────────
let cldSlideNo     = 0;
let cldFloeRadius  = 0;    // shrinks under The Thaw; floored per §4B
let cldPenguins    = [];   // [{ id, ownerIdx, x, y, drowned, berth, slot }]  id = `${ownerIdx}-${n}`
let cldBergs       = [];   // [{ id, x, y, r, hits, angle }] — hits survive Slides, reset on Resurface
let cldBerthCount  = 0;    // === cldPlayerCount, for the whole match. NEVER changes.

// ── Slide state (reset each Slide) ─────────────────────────────────────────
let cldCommits     = [];   // [playerIdx] = commit object | null. HOST-LOCAL. Never broadcast.
let cldTimeline    = null; // { samples, events, aftermath, durationMs } — the thing clients replay
let cldPlaybackT   = 0;    // ms into the current playback

// ── Turn / input state (this device only) ──────────────────────────────────
let cldMyAims      = [];   // [{ penguinId, dx, dy, power }] — armed, not committed
let cldMyDive      = 0;    // -1 | 0 | +1
let cldMySnowball  = null; // { x, y } | null
let cldCommitted   = false;// local double-tap guard (NOT the authority — see §11)
let cldPowerLock   = null; // locked power 0..1, or null. Persists across Slides, resets on Resurface

// ── UI / render state (Stage 4 populates these) ────────────────────────────
let cldPhase       = 'aiming';  // 'aiming' | 'waiting' | 'resolving' | 'washout'
let cldIntroMode   = 'intro';   // 'intro' | 'standby'
let cldCanvas = null, cldCtx = null;
let cldRafHandle   = null;      // TIMER — cancel in quit-confirm, resetToLobby(), every phase exit
let cldIntroTimer  = null;      // TIMER
let cldResultTimer = null;      // TIMER
let cldSkinArt     = {};        // assetId -> HTMLImageElement | null — empty for the whole of v1
let cldLastSfxT    = 0;         // collision sound throttle

// ═══════════════════════════════════════════════════════════════════════════
// Derived values — computed on every read, NEVER stored (§4)
// ═══════════════════════════════════════════════════════════════════════════

function cldStanding() { return cldPenguins.filter(p => !p.drowned); }

// The win test is on PLAYERS, not penguins (§6). Getting this wrong ends a
// Peck Off match a Slide early and is invisible in the 1-penguin case.
function cldPlayersAlive() {
  const owners = {};
  cldStanding().forEach(p => { owners[p.ownerIdx] = true; });
  return Object.keys(owners).length;
}

// `ice` is optional everywhere below so the physics harness can ask about a
// setting other than the live one; it defaults to the live Ice Conditions.
function cldFullSlideDist(ice) { return CLD_ICE_MULT[ice || cldIceConditions] * CLD_R_STD; }
function cldDecel(ice)         { return (CLD_V_MAX * CLD_V_MAX) / (2 * cldFullSlideDist(ice)); }

// NEVER a hard-coded number — the floor moves with Ice Conditions (§4B), and a
// literal silently breaks Black Ice.
function cldMinRadius(ice)     { return CLD_MIN_RADIUS_MULT * cldFullSlideDist(ice); }

// §4D — force is a fraction of full-power VELOCITY, never of slide distance.
function cldSnowballForce(dist, maxRange) {
  return (0.40 + (0.20 - 0.40) * Math.min(1, dist / maxRange)) * CLD_V_MAX;
}
function cldSnowballArrivalMs(dist) { return (dist / CLD_SNOWBALL_SPEED) * 1000; }

function cldSimParams() {
  return { decel:     cldDecel(),
           substepMs: CLD_SUBSTEP_MS,
           capMs:     CLD_SIM_CAP_MS,
           sampleHz:  CLD_SAMPLE_HZ };
}

// ═══════════════════════════════════════════════════════════════════════════
// Berth geometry (§4C)
// Berth k is the arc [k·2π/N, (k+1)·2π/N). Each Berth holds CLD_BERTH_SLOTS
// discrete positions, evenly spaced inside its own arc.
//
// CLOCKWISE means an INCREASING Berth index throughout this file. The canvas
// y-axis points down, so a growing atan2 angle sweeps clockwise on screen.
// ═══════════════════════════════════════════════════════════════════════════

function cldNormAngle(a) { return ((a % CLD_TAU) + CLD_TAU) % CLD_TAU; }
function cldBerthArc()   { return CLD_TAU / cldBerthCount; }

function cldBerthOfAngle(a) {
  return Math.min(cldBerthCount - 1, Math.floor(cldNormAngle(a) / cldBerthArc()));
}

function cldSlotAngle(berth, slot) {
  const arc = cldBerthArc();
  return berth * arc + arc * (slot + 0.5) / CLD_BERTH_SLOTS;
}

function cldRimPos(angle, radius) {
  const r = (radius === undefined) ? cldFloeRadius : radius;
  return { x: CLD_W / 2 + r * Math.cos(angle), y: CLD_H / 2 + r * Math.sin(angle) };
}

function cldDistFromCentre(x, y) { return Math.hypot(x - CLD_W / 2, y - CLD_H / 2); }

function cldSlotTaken(berth, slot) {
  return cldPenguins.some(p => p.drowned && p.berth === berth && p.slot === slot);
}

function cldFreeSlots(berth) {
  let n = 0;
  for (let s = 0; s < CLD_BERTH_SLOTS; s++) if (!cldSlotTaken(berth, s)) n++;
  return n;
}

// Seeded, per §4C step 2. `rand` is always a Physics.rng stream — never a bare
// Math.random(), or two devices resolve the same Slide differently.
function cldPickFreeSlot(berth, rand) {
  const free = [];
  for (let s = 0; s < CLD_BERTH_SLOTS; s++) if (!cldSlotTaken(berth, s)) free.push(s);
  if (!free.length) return -1;
  return free[Math.min(free.length - 1, Math.floor(rand() * free.length))];
}

// Which way round the rim was this penguin travelling? The tangent in the
// direction of increasing angle is (−sin a, cos a), so a positive projection
// means clockwise. A dead-straight or zero-velocity exit — every thaw-drop is
// one — falls through to the documented CLOCKWISE default.
function cldShuntSide(exitAngle, vx, vy) {
  const speed = Math.hypot(vx, vy);
  const t = -vx * Math.sin(exitAngle) + vy * Math.cos(exitAngle);
  // "Dead-straight" has to be a TOLERANCE, never an exact zero. A purely radial
  // exit computes t as the difference of two products that are equal in real
  // arithmetic but not in IEEE, so it lands a few ulps either side of zero with
  // an arbitrary sign — two identical exits would shunt opposite ways. A true
  // zero-velocity exit (every thaw-drop) falls in here too.
  if (!(Math.abs(t) > speed * 1e-9)) return +1;
  return t > 0 ? +1 : -1;
}

// ═══════════════════════════════════════════════════════════════════════════
// Berth assignment — the multi-hop shunt (§4C). Never fails.
//
// There is deliberately NO "nowhere left to put them" fallback. Rim capacity
// (N × CLD_BERTH_SLOTS) always exceeds the number of penguins in play, in every
// mode, so the search cannot run out of rim. If it ever does, an invariant has
// broken upstream and the correct response is a loud failure — never a silent
// placement that quietly corrupts the rim.
// ═══════════════════════════════════════════════════════════════════════════
function cldAssignBerth(x, y, vx, vy, rand) {
  const angle = Math.atan2(y - CLD_H / 2, x - CLD_W / 2);
  const home  = cldBerthOfAngle(angle);
  const N     = cldBerthCount;

  const own = cldPickFreeSlot(home, rand);
  if (own >= 0) return { berth: home, slot: own, hops: 0 };

  const side = cldShuntSide(cldNormAngle(angle), vx, vy);

  for (let h = 1; h <= Math.floor(N / 2); h++) {
    const ccw = ((home - h) % N + N) % N;   // decreasing index
    const cw  = (home + h) % N;             // increasing index — "clockwise"
    const fCcw = cldFreeSlots(ccw);
    const fCw  = cldFreeSlots(cw);

    let pick;
    if (ccw === cw)      pick = cw;                    // the antipode, at h = N/2
    else if (fCw > fCcw) pick = cw;                    // prefer MORE free positions
    else if (fCcw > fCw) pick = ccw;
    else                 pick = (side > 0) ? cw : ccw; // tie (incl. both full) → travel direction

    const slot = cldPickFreeSlot(pick, rand);
    if (slot >= 0) return { berth: pick, slot: slot, hops: h };
  }

  throw new Error('cldAssignBerth: the rim is full at ' + cldPenguins.filter(p => p.drowned).length +
                  ' Drowned across ' + N + ' Berths × ' + CLD_BERTH_SLOTS +
                  ' slots — a §4C capacity invariant broke upstream');
}

// Move a Drowned penguin onto its Berth slot on the current rim.
function cldSeatDrowned(p, berth, slot) {
  p.berth = berth;
  p.slot  = slot;
  const pos = cldRimPos(cldSlotAngle(berth, slot));
  p.x = pos.x;
  p.y = pos.y;
}

// ═══════════════════════════════════════════════════════════════════════════
// Dive (§4C) — voluntary, one Berth left or right, and ALLOWED TO FAIL.
// No shunt, no search: a full target Berth means the penguin simply stays put.
// The aiming UI renders a full direction as unavailable (Stage 4) rather than
// letting it fail silently at resolution.
// ═══════════════════════════════════════════════════════════════════════════
function cldDiveTarget(p, dir) {
  const N = cldBerthCount;
  if (!p || !p.drowned || !dir || N < 2) return -1;
  return ((p.berth + dir) % N + N) % N;
}

function cldDiveAvailable(p, dir) {
  const t = cldDiveTarget(p, dir);
  return t >= 0 && t !== p.berth && cldFreeSlots(t) > 0;
}

function cldApplyDive(p, dir, rand) {
  const t = cldDiveTarget(p, dir);
  if (t < 0 || t === p.berth) return false;
  const slot = cldPickFreeSlot(t, rand);
  if (slot < 0) return false;              // full → stays put. This is not an error.
  cldSeatDrowned(p, t, slot);
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// Bergs — placement is a GAME rule, so it lives here and not in physics.js.
// Each Berg keeps its own angle so The Thaw can re-project it exactly.
// ═══════════════════════════════════════════════════════════════════════════
function cldBergInset() { return cldFloeRadius - CLD_BERG_R; }

function cldPlaceBergs(rand) {
  cldBergs = [];
  if (!cldIceBreaker) return;                       // Ice Breaker Off — no Bergs at all
  const share = CLD_TAU / CLD_BERG_COUNT;
  for (let i = 0; i < CLD_BERG_COUNT; i++) {
    // Jittered inside its own share of the rim, so two Bergs can never stack.
    const angle = i * share + share * (0.25 + rand() * 0.5);
    const pos   = cldRimPos(angle, cldBergInset());
    cldBergs.push({ id: 'berg-' + i, x: pos.x, y: pos.y, r: CLD_BERG_R,
                    hits: cldIceBreaker, angle: angle });
  }
}

function cldProjectBergsToRim() {
  cldBergs.forEach(b => {
    const pos = cldRimPos(b.angle, cldBergInset());
    b.x = pos.x;
    b.y = pos.y;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Match / Floe-Off lifecycle
// ═══════════════════════════════════════════════════════════════════════════
function cldStartMatch(names) {
  cldPlayerNames = names.slice();
  cldPlayerCount = cldPlayerNames.length;
  cldBerthCount  = cldPlayerCount;      // fixed for the whole match — NEVER changes
  cldFish        = new Array(cldPlayerCount).fill(0);
  cldMatchStats  = [];
  for (let i = 0; i < cldPlayerCount; i++) cldMatchStats.push({ slidesStood: 0, plunges: 0 });
  cldFloeOffNo   = 0;
  cldTimeline    = null;
}

// Resurface — a fresh Floe-Off on a fresh floe. Also the Washout replay path.
function cldStartFloeOff(seed) {
  const rand = window.Physics.rng(seed);

  cldFloeOffNo += 1;
  cldSlideNo    = 0;
  cldFloeRadius = CLD_FLOE_SIZE[cldFloeSize];
  cldPowerLock  = null;
  cldTimeline   = null;

  const per   = cldPeckOff ? 2 : 1;
  const total = cldPlayerCount * per;
  cldPenguins = [];
  for (let k = 0; k < per; k++) {
    for (let i = 0; i < cldPlayerCount; i++) {
      // Interleaved by owner, so Peck Off's two pairs start alternating rather
      // than as two adjacent blocks.
      const seat  = k * cldPlayerCount + i;
      const angle = (seat / total) * CLD_TAU;
      const pos   = cldRimPos(angle, cldFloeRadius * CLD_START_RING);
      cldPenguins.push({ id: i + '-' + k, ownerIdx: i, x: pos.x, y: pos.y,
                         drowned: false, berth: null, slot: null });
    }
  }

  cldPlaceBergs(rand);
  cldCommits = new Array(cldPlayerCount).fill(null);
}

// ═══════════════════════════════════════════════════════════════════════════
// Slide resolution — the host-authoritative core.
//
// A commit is { aims: [{ penguinId, dx, dy, power }], dive: -1|0|+1,
//               snowball: { x, y } | null }.
// ═══════════════════════════════════════════════════════════════════════════
function cldBuildSlideInputs() {
  const bodies = [], impulses = [], events = [];

  // Body order IS the wire contract — samples[] are positional (§4A).
  cldPenguins.forEach(p => bodies.push({
    id: p.id, x: p.x, y: p.y, r: CLD_PENGUIN_R,
    kind: p.drowned ? 'drowned' : 'penguin',
  }));
  cldBergs.forEach(b => bodies.push({
    id: b.id, x: b.x, y: b.y, r: b.r, kind: 'berg', hits: b.hits,
  }));

  for (let i = 0; i < cldPlayerCount; i++) {
    const c = cldCommits[i];
    if (!c) continue;

    (c.aims || []).forEach(a => {
      const p = cldPenguins.find(q => q.id === a.penguinId && q.ownerIdx === i);
      if (!p || p.drowned) return;
      const len = Math.hypot(a.dx, a.dy);
      const pow = Math.max(0, Math.min(1, a.power || 0));
      // A zero-length or zero-power aim is a Peck Off HOLD (§7) — a deliberate
      // park, not a too-soft drag. It contributes no impulse and is never an error.
      if (len < 1e-9 || pow <= 0) return;
      const v = pow * CLD_V_MAX;
      impulses.push({ bodyId: p.id, vx: (a.dx / len) * v, vy: (a.dy / len) * v });
    });

    if (c.snowball) {
      // Thrown from one of this player's own penguins — a Standing one if they
      // have it, otherwise from the rim.
      const src = cldPenguins.find(q => q.ownerIdx === i && !q.drowned) ||
                  cldPenguins.find(q => q.ownerIdx === i);
      if (src) {
        const d = Math.hypot(c.snowball.x - src.x, c.snowball.y - src.y);
        events.push({
          t:      cldSnowballArrivalMs(d),           // SCHEDULED, never summed (§4D)
          type:   'snowball',
          x:      c.snowball.x,
          y:      c.snowball.y,
          radius: CLD_SNOWBALL_R,
          force:  cldSnowballForce(d, 2 * cldFloeRadius),
          from:   { x: src.x, y: src.y },
        });
      }
    }
  }

  return { bodies: bodies, impulses: impulses, events: events };
}

function cldResolveSlide(seed) {
  const rand = window.Physics.rng(seed);
  cldSlideNo += 1;

  // ── 1. Dives resolve BEFORE the sim ──────────────────────────────────────
  // A Dive repositions a rim bumper, so it has to be in place for the Slide it
  // was committed alongside. It needs no aftermath beat: the moved body is
  // already in the sim's frame 0.
  const dives = [];
  for (let i = 0; i < cldPlayerCount; i++) {
    const c = cldCommits[i];
    if (!c || !c.dive) continue;
    const mine = cldPenguins.find(p => p.ownerIdx === i && p.drowned);
    if (!mine) continue;
    const moved = cldApplyDive(mine, c.dive, rand);
    dives.push({ penguinId: mine.id, dir: c.dive, moved: moved,
                 berth: mine.berth, x: mine.x, y: mine.y });
  }

  // ── 2. The Slide itself ──────────────────────────────────────────────────
  const input = cldBuildSlideInputs();
  const res = window.Physics.simulate({
    world:    { cx: CLD_W / 2, cy: CLD_H / 2, radius: cldFloeRadius },
    bodies:   input.bodies,
    impulses: input.impulses,
    events:   input.events,
    params:   cldSimParams(),
    seed:     seed,
  });

  // ── 3. Resting positions, Berg damage ────────────────────────────────────
  res.final.forEach(f => {
    const p = cldPenguins.find(q => q.id === f.id);
    if (p) {
      // No "skip the Drowned" guard here on purpose. A Drowned penguin enters
      // the sim immovable, so it comes back at EXACTLY its input position and
      // such a guard would be indistinguishable from its own absence — the
      // dead-latch shape BUG-01 cost a mutation run to find. What actually
      // protects the rim is that a Drowned penguin is immovable in the first
      // place, and the harness asserts THAT: after every Slide, every Drowned
      // penguin still sits on its own Berth slot's geometry.
      if (!f.plunged) { p.x = f.x; p.y = f.y; }
      return;
    }
    const b = cldBergs.find(q => q.id === f.id);
    if (b) { b.hits = f.hits; b.shattered = !!f.shattered; }
  });
  cldBergs = cldBergs.filter(b => !b.shattered);   // a shattered Berg is gone for good

  // ── 4. Plunges → Drowned, in chronological order ─────────────────────────
  // Earlier plunges claim their slots first, which is what makes the shunt's
  // outcome a function of the timeline rather than of array order.
  const aftermath = [];
  res.events.filter(e => e.type === 'plunge').forEach(e => {
    const p = cldPenguins.find(q => q.id === e.id);
    if (!p || p.drowned) return;
    const spot = cldAssignBerth(e.x, e.y, e.vx, e.vy, rand);
    p.drowned = true;
    cldMatchStats[p.ownerIdx].plunges += 1;
    cldSeatDrowned(p, spot.berth, spot.slot);
    aftermath.push({ type: 'surface', penguinId: p.id, berth: spot.berth,
                     slot: spot.slot, hops: spot.hops, x: p.x, y: p.y });
  });

  // ── 5. Stat line — every player still Standing stood this Slide ──────────
  const stood = {};
  cldStanding().forEach(p => { stood[p.ownerIdx] = true; });
  Object.keys(stood).forEach(i => { cldMatchStats[i].slidesStood += 1; });

  // ── 6. The Thaw (Sylly Mode only) ────────────────────────────────────────
  const thaw = cldThawStep(rand);
  if (thaw) thaw.beats.forEach(b => aftermath.push(b));

  // ── 7. Washout / Floe-Off end — AFTER the Thaw ───────────────────────────
  // Order matters (§6): a Thaw step can itself drop the last penguins, so both
  // of these read state the Thaw may have just changed.
  //
  // There is deliberately no "if not a Washout" guard around the award.
  // cldResolveFloeOff() refuses to award unless EXACTLY one owner is left, so a
  // second guard here would be indistinguishable from its own absence — the
  // dead-latch shape BUG-01 cost a mutation run to find. One authority.
  const washout = cldCheckWashout();
  const outcome = cldResolveFloeOff();
  const floeOffOver = washout || outcome.winnerIdx >= 0;
  const winnerIdx   = outcome.winnerIdx;
  const matchOver   = outcome.matchOver;

  cldCommits = new Array(cldPlayerCount).fill(null);

  cldTimeline = {
    slideNo:    cldSlideNo,
    samples:    res.samples,
    events:     res.events,
    aftermath:  aftermath,
    dives:      dives,
    final:      res.final,
    durationMs: res.durationMs,
    radius:     cldFloeRadius,
    washout:    washout,
    floeOffOver: floeOffOver,
    winnerIdx:  winnerIdx,
    matchOver:  matchOver,
  };
  return cldTimeline;
}

// ═══════════════════════════════════════════════════════════════════════════
// The Thaw (§12) — a geometry rule, not a rules rule.
// ═══════════════════════════════════════════════════════════════════════════
function cldThawStep(rand) {
  if (!cldSyllyMode) return null;

  const from = cldFloeRadius;
  const to   = Math.max(cldMinRadius(), cldFloeRadius - CLD_THAW_STEP);
  cldFloeRadius = to;

  const beats = [{ type: 'thaw', newRadius: to, fromRadius: from }];

  // Drowned penguins and surviving Bergs ride the rim inward — same angle, new
  // radius — so nobody is ever stranded off the floe.
  cldPenguins.forEach(p => { if (p.drowned) cldSeatDrowned(p, p.berth, p.slot); });
  cldProjectBergsToRim();

  // Standing penguins are NOT moved (§16 Q1). Anyone the ice has left behind
  // plunges as its own beat — with ZERO exit velocity, which is what sends the
  // shunt tie-break to its clockwise default.
  const dropped = cldStanding().filter(p => cldDistFromCentre(p.x, p.y) > to);
  dropped.forEach(p => {
    const spot = cldAssignBerth(p.x, p.y, 0, 0, rand);
    beats.push({ type: 'thaw-drop', penguinId: p.id, x: p.x, y: p.y });
    p.drowned = true;
    cldMatchStats[p.ownerIdx].plunges += 1;
    cldSeatDrowned(p, spot.berth, spot.slot);
    beats.push({ type: 'surface', penguinId: p.id, berth: spot.berth,
                 slot: spot.slot, hops: spot.hops, x: p.x, y: p.y });
  });

  return { from: from, to: to, shrunk: to < from,
           dropped: dropped.map(p => p.id), beats: beats };
}

// ═══════════════════════════════════════════════════════════════════════════
// Washout and Fish scoring (§6)
// ═══════════════════════════════════════════════════════════════════════════

// Runs after a Slide AND after a Thaw step — a shrink that drops everyone left
// is a Washout just as much as a Slide that does.
function cldCheckWashout() { return cldStanding().length === 0; }

function cldResolveFloeOff() {
  const owners = {};
  cldStanding().forEach(p => { owners[p.ownerIdx] = true; });
  const alive = Object.keys(owners).map(Number);
  if (alive.length !== 1) return { winnerIdx: -1, matchOver: false };

  const w = alive[0];
  cldFish[w] += 1;
  return { winnerIdx: w, matchOver: cldFish[w] >= cldFishToWin };
}

function cldMatchWinner() {
  let best = -1;
  for (let i = 0; i < cldPlayerCount; i++) {
    if (cldFish[i] >= cldFishToWin && (best < 0 || cldFish[i] > cldFish[best])) best = i;
  }
  return best;
}
// ═══════════════════════════════════════════════════════════════════════════
// ── STAGE 4 OF 6 — UI, canvas render seam, settings, overlays ──────────────
//
// Everything above this line is the headless rules layer and must stay that
// way: tools/verify-cld-loop.js loads this whole file into a bare vm sandbox
// with `document.getElementById: () => null`, so nothing below may run at
// parse time except constant declarations and the DOMContentLoaded binding
// (which never fires there). Every function below is guarded on a null
// element or a null canvas.
//
// No multiplayer yet — Stage 5. Where a host/client branch will go, this
// stage runs the 'single' path and leaves a marked seam.
// ═══════════════════════════════════════════════════════════════════════════

// ── Flavour content (§10) — two constant arrays, no data file ──────────────
// Host-picked and synced by index in Stage 5's CLD_FLOEOFF_START; picked
// independently per device, players sitting together would read different text
// for the same moment (§ Round/Night Intro Screen Standard).
const CLD_INTRO_FLAVOUR = [
  'Brace for the Slide…',
  'Everyone aims at once. Nobody sees a thing.',
  'Find a gap. There isn’t one.',
  'Shove first, apologise never.',
  'The ice is fine. Probably.',
  'Last one dry gets the Fish.',
];

const CLD_PLUNGE_BARKS = [
  'Into the Drink!',
  'See you at the bottom.',
  'That’ll be cold.',
  'Straight in.',
  'Off you pop.',
  'Didn’t see that coming.',
  'Well, that’s that.',
  'Splash.',
];

// ── Audio map (§9) — a MOMENT name pointing at an existing play*(). Third game
// on this shape after PKO and CJAR; playSplash is the one bespoke addition and
// it lives in engine.js with every other effect.
const CLD_SOUND = {
  commit:    'playLaunch',      // Lock It In — the point of no return
  powerLock: 'playPillClick',   // the dial seating
  collide:   'playBoing',       // penguin-on-penguin. VELOCITY-GATED + THROTTLED
  rebound:   'playBoing',       // off a Drowned penguin — same tone, raised gain
  snowball:  'playWhoosh',      // a soft dry whump; small and slightly pathetic
  dive:      'playSonarPing',   // quiet, two blips bracketing the move
  plunge:    'playSplash',      // the signature moment
  fish:      'playSuccess',     // Floe-Off won
  thaw:      'playAbyssThud',   // the floe cracks and shrinks
  washout:   'playBoing',       // under the WASHOUT! flash
  matchEnd:  'playClashWin',    // The Final Floe
};

// Collisions below this speed are silent — a six-penguin Slide makes a dozen
// contacts in two seconds and ungated it is noise, not comedy (§9).
const CLD_SFX_MIN_V = 26;

// The eight player tints. Chosen for hue separation at 24px on a white floe —
// a 6% -of-screen disc is all the "which one is me" a player gets besides the
// ring, so adjacent seats must never be adjacent hues.
const CLD_TINTS = [
  '#E4572E', // 0 vermilion
  '#2E86AB', // 1 deep cyan
  '#F4B942', // 2 amber
  '#6A4C93', // 3 violet
  '#1B998B', // 4 teal-green
  '#E4459B', // 5 magenta
  '#5C6F82', // 6 slate
  '#8FBF3F', // 7 lime
];

// Playback pacing. The samples arrive at CLD_SAMPLE_HZ; playback walks them in
// real time and interpolates between the two bracketing frames, so the motion
// is smooth at 60fps off a 20Hz timeline.
const CLD_AFTERMATH_MS   = 900;   // beat held after the last sample, for surfacings
const CLD_BARK_MS        = 1400;  // how long a plunge bark floats
const CLD_ASSIST_STEPS   = 90;    // aim-assist trace resolution (first bounce only)
const CLD_VIEW_FIT       = 330;   // logical units fitted to the stage's SHORT axis:
                                  // the largest floe (Roomy, 300 across) plus a
                                  // penguin radius either side, so a rim penguin on
                                  // the widest setting is never clipped

// ── Canvas / playback state ────────────────────────────────────────────────
let cldLastFrameT   = 0;      // rAF timestamp of the previous frame
let cldDragging     = false;
let cldDragPenguin  = null;   // penguin id being aimed, or null
let cldDragFrom     = null;   // { x, y } logical — the penguin's own centre
let cldDragTo       = null;   // { x, y } logical — where the finger is now
let cldPtrId        = null;   // single-pointer discipline (the asherplane rule)
let cldIntroIdx     = 0;      // which CLD_INTRO_FLAVOUR line this Floe-Off shows
let cldWashoutUntil = 0;      // playback-clock ms at which the washout beat ends
let cldFloatTimer   = null;   // TIMER — the plunge-bark float layer

// The view transform (set by cldResize). The physics world stays 360x360; these
// describe where that world sits inside a canvas that fills the whole stage.
let cldViewScale = 1, cldViewOffX = 0, cldViewOffY = 0;
let cldViewX = 0, cldViewY = 0, cldViewW = CLD_W, cldViewH = CLD_H;

// ═══════════════════════════════════════════════════════════════════════════
// Colour helpers — inline arithmetic, no offscreen tint cache (§10).
// There is no sprite matrix to multiply, so there is nothing to cache: the
// PKO 48-sprite mistake has no equivalent to make here.
// ═══════════════════════════════════════════════════════════════════════════
function cldHexToRgb(hex) {
  const h = hex.replace('#', '');
  return { r: parseInt(h.substr(0, 2), 16),
           g: parseInt(h.substr(2, 2), 16),
           b: parseInt(h.substr(4, 2), 16) };
}
function cldMix(hex, target, amt) {
  const c = cldHexToRgb(hex);
  const r = Math.round(c.r + (target - c.r) * amt);
  const g = Math.round(c.g + (target - c.g) * amt);
  const b = Math.round(c.b + (target - c.b) * amt);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}
function cldLighten(hex, amt) { return cldMix(hex, 255, amt); }
function cldDarken(hex, amt)  { return cldMix(hex, 0,   amt); }
function cldTintOf(idx) { return CLD_TINTS[((idx % CLD_TINTS.length) + CLD_TINTS.length) % CLD_TINTS.length]; }

// ═══════════════════════════════════════════════════════════════════════════
// THE POSE TABLE (§10) — animation is transform parameters, never drawn frames.
// Every state returns the same shape, so cldPaintProcedural has exactly one
// draw path and the states differ only in the numbers fed to it.
//   rot    — radians, applied around the body's own centre
//   sx/sy  — squash/stretch
//   flip   — flipper sweep, radians from rest
//   alpha  — global alpha
//   sink   — 0..1, how far the waterline clips the body (bob only)
//   lift   — vertical offset in body radii (the plunge's fall-away)
// ═══════════════════════════════════════════════════════════════════════════
function cldPose(state, t) {
  switch (state) {
    case 'lean':
      // Wind-up: leaning back against the pull, flippers swept behind.
      return { rot: 0, sx: 0.94, sy: 1.07, flip: 0.55, alpha: 1, sink: 0, lift: 0 };
    case 'squash':
      // Impact frame. One frame is enough — the physics carries the motion.
      return { rot: 0, sx: 1.20, sy: 0.82, flip: 0.20, alpha: 1, sink: 0, lift: 0 };
    case 'plunge':
      // The comedy beat: spin, shrink, fade, drop. t is 0..1 across the fall.
      return { rot: t * Math.PI * 4, sx: 1 - t * 0.45, sy: 1 - t * 0.45,
               flip: -1.1, alpha: 1 - t * 0.85, sink: 0, lift: t * 0.7 };
    case 'bob':
      // Half-submerged, riding a slow swell. Same paint call clipped twice at a
      // waterline — not a sixth-and-a-half state.
      return { rot: Math.sin(t * 2.1) * 0.10, sx: 1, sy: 1, flip: 0.05,
               alpha: 1, sink: 0.42 + Math.sin(t * 2.1) * 0.05, lift: 0 };
    case 'throw':
      // Flipper cocked back over the shoulder.
      return { rot: -0.18, sx: 0.97, sy: 1.03, flip: -1.25,
               alpha: 1, sink: 0.42, lift: 0 };
    case 'idle':
    default:
      // A slow idle sway so a still floe is never a dead one.
      return { rot: Math.sin(t * 1.4) * 0.055, sx: 1, sy: 1,
               flip: Math.sin(t * 1.4) * 0.12, alpha: 1, sink: 0, lift: 0 };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// THE RENDER SEAM (§10, §17 deviation 3)
//
//   cldRenderPenguin(ctx, state, colourIdx, x, y, r, opts) → undefined
//
// The suite's first CANVAS render seam: it draws to a 2D context and returns
// nothing, where every other game's seam returns a DOM node. The RULE the seam
// exists to serve is unchanged and binding — every pixel of the penguin, in
// play and in chrome alike, is produced here and nowhere else. There is no
// second code path to diverge from, because there is no DOM version at all.
//
// `opts`: { t, facing, ring, ringDark, dim }
//   t        — animation clock in seconds (drives cldPose)
//   facing   — radians; the beak points here, so facing IS free aim feedback
//   ring     — draw the owner ring under the body (false for chrome)
//   ringDark — Peck Off's second penguin: same hue, darker ring. NEVER a second
//              hue, which would read as two more players.
// ═══════════════════════════════════════════════════════════════════════════
function cldRenderPenguin(ctx, state, colourIdx, x, y, r, opts) {
  if (!ctx) return;
  const o = opts || {};
  // A future skin's raster art, if one is ever built. cldSkinArt stays an empty
  // object for the whole of v1 — there is no core art pack and no cldPreloadArt()
  // — so this branch never fires. It exists only so a skin CAN override a state
  // without a render-seam rewrite (§10).
  const skinUrl = (typeof assetFace === 'function') && assetFace('cld', state);
  if (skinUrl && cldSkinArt[state]) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(o.facing || 0);
    ctx.drawImage(cldSkinArt[state], -r, -r, r * 2, r * 2);
    ctx.restore();
    return;
  }
  cldPaintProcedural(ctx, state, colourIdx, x, y, r, o);
}

// The v1 default — always reached. Bézier silhouettes plus a gradient clipped
// to the body path. Not stacked primitives: a circle-plus-two-ellipses penguin
// is exactly the stiff programmer art this is drawn to avoid (§15).
function cldPaintProcedural(ctx, state, colourIdx, x, y, r, o) {
  const p     = cldPose(state, o.t || 0);
  const tint  = cldTintOf(colourIdx);
  const face  = (o.facing || 0);

  ctx.save();
  ctx.globalAlpha = (o.dim ? 0.55 : 1) * p.alpha;

  // ── Owner ring — programmatic, drawn UNDER the body, and deliberately the
  // primary "which one is me" signal at a glance. Sits outside the transform so
  // a squash frame never distorts the identity cue.
  if (o.ring) {
    // A soft dark disc first, so a penguin sits ON the ice rather than floating
    // over it — without this the rings read as bubbles.
    ctx.beginPath();
    ctx.arc(x, y + r * 0.16, r * 1.02, 0, CLD_TAU);
    ctx.fillStyle = 'rgba(30,60,80,0.16)';
    ctx.fill();

    // FULL tint, not a lightened wash. Peck Off's second penguin darkens it —
    // never a second hue, which would read as two more players.
    ctx.beginPath();
    ctx.arc(x, y, r * 1.26, 0, CLD_TAU);
    ctx.strokeStyle = o.ringDark ? cldDarken(tint, 0.42) : tint;
    ctx.lineWidth = Math.max(1.6, r * 0.15);
    ctx.stroke();

    // "Me" gets a white outer ring on top of its tint ring. At 24px on a busy
    // floe this is the only seat cue that survives a glance.
    if (o.me) {
      ctx.beginPath();
      ctx.arc(x, y, r * 1.45, 0, CLD_TAU);
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = Math.max(1.4, r * 0.12);
      ctx.stroke();
    }
  }

  ctx.translate(x, y + r * p.lift);
  ctx.rotate(face + p.rot);
  ctx.scale(p.sx, p.sy);

  // ── The waterline clip (bob / throw). Everything below it draws at reduced
  // alpha, which is what makes a bobbing penguin read as IN the water rather
  // than ON it. Two passes over one paint call, not a separate sprite.
  const passes = p.sink > 0
    ? [{ from: -r * 2, to: r * (2 * p.sink - 1), alpha: 1 },
       { from: r * (2 * p.sink - 1), to: r * 2,  alpha: 0.30 }]
    : [{ from: -r * 2, to: r * 2, alpha: 1 }];

  passes.forEach(pass => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(-r * 2, pass.from, r * 4, pass.to - pass.from);
    ctx.clip();
    ctx.globalAlpha *= pass.alpha;
    cldPaintBody(ctx, r, tint, p);
    ctx.restore();
  });

  ctx.restore();
}

// One body, drawn at the origin, facing +x. Called once per waterline pass.
function cldPaintBody(ctx, r, tint, p) {
  // ── Flippers — behind the body, swept by the pose's `flip`. Drawn first so
  // the body silhouette overlaps them cleanly with no seam.
  ctx.fillStyle = cldDarken(tint, 0.34);
  ctx.strokeStyle = cldDarken(tint, 0.58);
  ctx.lineWidth = Math.max(0.5, r * 0.05);
  [1, -1].forEach(side => {
    ctx.save();
    ctx.rotate(side * p.flip * 0.5);
    ctx.beginPath();
    // A blade, not a blob: leaves the shoulder, sweeps BACK along the flank, and
    // stays inside the body's own widest point so the silhouette reads as one shape.
    ctx.moveTo(r * 0.10, side * r * 0.62);
    ctx.quadraticCurveTo(-r * 0.34, side * r * 0.98, -r * 0.78, side * r * 0.74);
    ctx.quadraticCurveTo(-r * 0.46, side * r * 0.66, -r * 0.16, side * r * 0.44);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });

  // ── Body silhouette — one closed bézier ovoid, narrower at the tail, fuller
  // at the shoulders. This curve is the whole reason the penguin reads as drawn
  // rather than assembled.
  const body = new Path2D();
  body.moveTo(r * 0.92, 0);                                        // nose
  body.bezierCurveTo(r * 0.88, -r * 0.62,  r * 0.30, -r * 0.98, -r * 0.18, -r * 0.86);
  body.bezierCurveTo(-r * 0.78, -r * 0.70, -r * 1.00, -r * 0.26, -r * 0.96, 0);
  body.bezierCurveTo(-r * 1.00,  r * 0.26, -r * 0.78,  r * 0.70, -r * 0.18,  r * 0.86);
  body.bezierCurveTo(r * 0.30,  r * 0.98,  r * 0.88,  r * 0.62,  r * 0.92, 0);
  body.closePath();

  ctx.fillStyle = tint;
  ctx.fill(body);

  // ── Shading gradient, CLIPPED TO THE BODY PATH — never drawn past the
  // silhouette (§15). Light from the top-left, the same key the gel buttons use.
  ctx.save();
  ctx.clip(body);
  const g = ctx.createLinearGradient(-r * 0.7, -r * 0.9, r * 0.6, r * 0.9);
  g.addColorStop(0,    cldLighten(tint, 0.30));
  g.addColorStop(0.45, cldLighten(tint, 0.04));
  g.addColorStop(1,    cldDarken(tint, 0.24));
  ctx.fillStyle = g;
  ctx.fill(body);
  ctx.restore();

  // ── Belly — a second bézier, offset forward, in a cold cream. Clipped to the
  // body so it can never spill past the outline on a squash frame.
  ctx.save();
  ctx.clip(body);
  // Deliberately SMALL and pushed forward — a chest, not a second body. The first
  // pass gave the belly nearly the whole silhouette and the tint stopped reading.
  const belly = new Path2D();
  belly.moveTo(r * 0.66, 0);
  belly.bezierCurveTo(r * 0.62, -r * 0.30,  r * 0.30, -r * 0.44,  r * 0.04, -r * 0.38);
  belly.bezierCurveTo(-r * 0.18, -r * 0.32, -r * 0.26, -r * 0.14, -r * 0.24, 0);
  belly.bezierCurveTo(-r * 0.26,  r * 0.14, -r * 0.18,  r * 0.32,  r * 0.04,  r * 0.38);
  belly.bezierCurveTo(r * 0.30,  r * 0.44,  r * 0.62,  r * 0.30,  r * 0.66, 0);
  belly.closePath();
  ctx.fillStyle = '#F7F3E8';
  ctx.fill(belly);
  ctx.restore();

  // ── Beak — points along +x, so `facing` doubles as free aim feedback with no
  // extra UI (brief §11, the top-down camera decision).
  ctx.beginPath();
  ctx.moveTo(r * 0.78, -r * 0.28);
  ctx.lineTo(r * 1.30, 0);
  ctx.lineTo(r * 0.78, r * 0.28);
  ctx.closePath();
  ctx.fillStyle = '#F2A03D';
  ctx.fill();
  ctx.strokeStyle = '#B96C13';
  ctx.lineWidth = Math.max(0.5, r * 0.05);
  ctx.stroke();

  // ── Eyes — two dots either side of the beak. At 24px they are a suggestion,
  // not detail, which is exactly the point of drawing rather than painting.
  ctx.fillStyle = '#1C1917';
  [1, -1].forEach(side => {
    ctx.beginPath();
    ctx.arc(r * 0.48, side * r * 0.27, Math.max(0.75, r * 0.098), 0, CLD_TAU);
    ctx.fill();
  });

  // ── Outline last, so nothing above bleeds over the silhouette edge.
  ctx.strokeStyle = cldDarken(tint, 0.55);
  ctx.lineWidth = Math.max(0.6, r * 0.075);
  ctx.stroke(body);
}

// ═══════════════════════════════════════════════════════════════════════════
// Canvas plumbing — the asherplane apResize/apToLogical/apLoop patterns (§15).
// ═══════════════════════════════════════════════════════════════════════════

// Fit the fixed 360x360 logical canvas into #cld-stage, preserving aspect, and
// size the backing store at (CSS scale x devicePixelRatio) so it renders at
// native resolution instead of being upscaled from a fixed buffer. The logical
// coordinate space every draw call uses is unaffected — it stays exactly 360x360.
function cldResize() {
  if (!cldCanvas || !cldCtx) return;
  const box = cldCanvas.parentElement;
  if (!box || !box.clientWidth || !box.clientHeight) return;
  const w = box.clientWidth, h = box.clientHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  // Fit CLD_VIEW_FIT logical units to the SHORT axis, then let the canvas fill
  // the whole stage on the long one. Letterboxing a 360x360 square instead left
  // ~250px of dead page above and below the water on a phone, and the dark
  // rectangle's hard edge against stone-50 read as a rendering fault rather than
  // as an ocean. The physics world is still exactly 360x360 centred at (180,180)
  // — nothing about coordinates or determinism changes; the extra space on the
  // long axis is simply more water drawn around the same floe.
  const scale = Math.min(w, h) / CLD_VIEW_FIT;
  cldViewScale = scale;
  cldViewOffX  = (w - CLD_W * scale) / 2;
  cldViewOffY  = (h - CLD_H * scale) / 2;

  cldCanvas.style.width  = w + 'px';
  cldCanvas.style.height = h + 'px';
  cldCanvas.width        = Math.floor(w * dpr);
  cldCanvas.height       = Math.floor(h * dpr);
  cldCtx.setTransform(scale * dpr, 0, 0, scale * dpr, cldViewOffX * dpr, cldViewOffY * dpr);

  // The visible region in LOGICAL units — what the water has to cover.
  cldViewX = -cldViewOffX / scale;
  cldViewY = -cldViewOffY / scale;
  cldViewW = w / scale;
  cldViewH = h / scale;
}

// Convert a pointer event to logical 360x360 canvas coordinates.
function cldToLogical(e) {
  if (!cldCanvas) return { x: 0, y: 0 };
  const b = cldCanvas.getBoundingClientRect();
  if (!b.width || !b.height || !cldViewScale) return { x: 0, y: 0 };
  // Undo the SAME offset cldResize baked into the context transform. Reading the
  // bounding box alone would be off by half the letterbox band the moment the
  // stage stops being square — which is always, on a phone.
  return { x: (e.clientX - b.left - cldViewOffX) / cldViewScale,
           y: (e.clientY - b.top  - cldViewOffY) / cldViewScale };
}

function cldInitCanvas() {
  if (cldCanvas) return;
  cldCanvas = document.getElementById('cld-canvas');
  if (!cldCanvas || !cldCanvas.getContext) { cldCanvas = null; return; }
  cldCtx = cldCanvas.getContext('2d');
  cldResize();
}

// The RAF loop. Cancelled in the quit-confirm handler, in resetToLobby() via
// cldResetState(), and on EVERY early phase transition — a live loop repaints
// against the next screen's state (logic-engine.md § Timer Lifecycle: a
// requestAnimationFrame is a timer).
function cldLoop(now) {
  cldRafHandle = null;
  if (!cldLastFrameT) cldLastFrameT = now;
  // Clamp dt so a backgrounded tab cannot teleport a whole playback on the
  // first frame back.
  const dt = Math.min((now - cldLastFrameT) / 1000, 0.05);
  cldLastFrameT = now;

  // The global sound overlay is fixed inset-0 at z-[110] and covers the stage
  // completely: a player adjusting the volume cannot watch the Slide and would
  // otherwise miss it. Freeze rather than fight it (the asherplane rule).
  const so = document.getElementById('sound-overlay');
  const paused = !!so && so.style.display !== 'none' && so.style.display !== '';

  if (!paused && cldPhase === 'resolving') cldAdvancePlayback(dt * 1000);
  cldDraw(paused ? 0 : dt);

  // A phase transition inside cldAdvancePlayback may have scheduled its own
  // next frame; standing down here is what stops two loops running alongside
  // each other at double speed.
  if (!cldRafHandle) cldRafHandle = requestAnimationFrame(cldLoop);
}

function cldStartLoop() {
  if (cldRafHandle) return;
  cldLastFrameT = 0;
  cldRafHandle = requestAnimationFrame(cldLoop);
}

function cldStopLoop() {
  if (cldRafHandle) { cancelAnimationFrame(cldRafHandle); cldRafHandle = null; }
  cldLastFrameT = 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// Drawing the world
// ═══════════════════════════════════════════════════════════════════════════
let cldClock = 0;   // seconds of wall time on this screen — drives idle sway

function cldDraw(dt) {
  if (!cldCtx) return;
  cldClock += dt;
  const ctx = cldCtx;
  const cx = CLD_W / 2, cy = CLD_H / 2;

  ctx.clearRect(cldViewX, cldViewY, cldViewW, cldViewH);

  // ── The Drink — a cold gradient with slow concentric swell rings. Animated by
  // phase, not by frames. Painted across the whole VISIBLE region, which is wider
  // than the 360x360 world on any non-square stage.
  const water = ctx.createLinearGradient(0, cldViewY, 0, cldViewY + cldViewH);
  water.addColorStop(0, '#1c3f57');
  water.addColorStop(1, '#0e2536');
  ctx.fillStyle = water;
  ctx.fillRect(cldViewX, cldViewY, cldViewW, cldViewH);
  ctx.strokeStyle = 'rgba(142,202,230,0.10)';
  ctx.lineWidth = 1.5;
  for (let k = 0; k < 4; k++) {
    const ph = (cldClock * 0.25 + k * 0.25) % 1;
    ctx.globalAlpha = 1 - ph;
    ctx.beginPath();
    ctx.arc(cx, cy, cldFloeRadius + 6 + ph * 46, 0, CLD_TAU);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  if (!cldFloeRadius) return;

  // ── The floe. A ring of shadow, then the ice, then a few procedural cracks.
  ctx.beginPath();
  ctx.arc(cx, cy + 3, cldFloeRadius, 0, CLD_TAU);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fill();

  const ice = ctx.createRadialGradient(cx - cldFloeRadius * 0.3, cy - cldFloeRadius * 0.35,
                                       cldFloeRadius * 0.1, cx, cy, cldFloeRadius);
  ice.addColorStop(0, '#ffffff');
  ice.addColorStop(0.72, '#eaf6fb');
  ice.addColorStop(1, '#c9e4f0');
  ctx.beginPath();
  ctx.arc(cx, cy, cldFloeRadius, 0, CLD_TAU);
  ctx.fillStyle = ice;
  ctx.fill();
  ctx.strokeStyle = '#8ECAE6';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Cracks — deterministic from the radius so they don't crawl frame to frame,
  // and they visibly redraw when The Thaw shrinks the floe.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, cldFloeRadius, 0, CLD_TAU);
  ctx.clip();
  ctx.strokeStyle = 'rgba(120,170,195,0.22)';
  ctx.lineWidth = 0.9;
  for (let k = 0; k < 9; k++) {
    const a  = (k * 2.399963) + cldFloeRadius * 0.013;   // golden-angle scatter
    const r0 = cldFloeRadius * (0.18 + (k % 4) * 0.20);
    const r1 = r0 + cldFloeRadius * 0.20;                // SHORT — a crack, not a
    const a1 = a + 0.34;                                 // scratch across the floe
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r1);
    ctx.stroke();
  }
  ctx.restore();

  // ── Berths — faint arc ticks on the rim, so a player can see where they'd
  // surface and which way a Dive would take them.
  if (cldBerthCount > 1) {
    ctx.strokeStyle = 'rgba(42,107,133,0.35)';
    ctx.lineWidth = 1;
    for (let k = 0; k < cldBerthCount; k++) {
      const a = k * cldBerthArc();
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (cldFloeRadius - 7), cy + Math.sin(a) * (cldFloeRadius - 7));
      ctx.lineTo(cx + Math.cos(a) * (cldFloeRadius + 7), cy + Math.sin(a) * (cldFloeRadius + 7));
      ctx.stroke();
    }
  }

  // ── Bergs. Never illustrated — a procedural chunk plus a crack overlay whose
  // density reads the remaining hits, so damage is visible before it shatters.
  cldBergs.forEach(b => cldDrawBerg(ctx, b));

  // ── Aim assist + the drag vector, under the penguins so nothing is hidden.
  cldDrawAim(ctx);

  // ── Penguins. EVERY one goes through the seam — no bypass anywhere.
  cldPenguins.forEach(p => {
    const mine    = cldIsMine(p);
    const drowned = p.drowned;
    let state = 'idle';
    if (drowned)                                  state = 'bob';
    if (drowned && cldMySnowball && mine)         state = 'throw';
    if (!drowned && cldDragging && cldDragPenguin === p.id) state = 'lean';
    cldRenderPenguin(ctx, state, p.ownerIdx, p.x, p.y, CLD_PENGUIN_R, {
      t: cldClock,
      facing: cldFacingOf(p),
      ring: true,
      me: mine,
      ringDark: cldIsSecondPenguin(p),
      dim: drowned,
    });
  });

  // ── The snowball target marker — a crosshair the thrower can see, nobody else.
  if (cldMySnowball) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cldMySnowball.x, cldMySnowball.y, 7, 0, CLD_TAU);
    ctx.moveTo(cldMySnowball.x - 11, cldMySnowball.y);
    ctx.lineTo(cldMySnowball.x + 11, cldMySnowball.y);
    ctx.moveTo(cldMySnowball.x, cldMySnowball.y - 11);
    ctx.lineTo(cldMySnowball.x, cldMySnowball.y + 11);
    ctx.stroke();
    ctx.restore();
  }
}

function cldDrawBerg(ctx, b) {
  ctx.save();
  ctx.beginPath();
  // A five-point irregular chunk, deterministic from the Berg's own angle so it
  // keeps its shape as The Thaw moves it inward.
  for (let k = 0; k < 5; k++) {
    const a = b.angle + k * (CLD_TAU / 5);
    // Never exceeds b.r — the drawn chunk IS the collision circle's envelope.
    const rr = b.r * (0.72 + ((k * 37 + Math.floor(b.angle * 100)) % 28) / 100);
    const px = b.x + Math.cos(a) * rr, py = b.y + Math.sin(a) * rr;
    if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#b7d9e8';
  ctx.fill();
  ctx.strokeStyle = '#5d92ab';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Damage cracks — one per hit already taken, so a Berg about to shatter LOOKS
  // about to shatter rather than only being a number in the rules layer.
  const taken = Math.max(0, cldIceBreaker - b.hits);
  ctx.strokeStyle = 'rgba(60,100,120,0.55)';
  ctx.lineWidth = 1;
  for (let k = 0; k < taken; k++) {
    const a = b.angle + k * 1.9;
    ctx.beginPath();
    ctx.moveTo(b.x - Math.cos(a) * b.r * 0.8, b.y - Math.sin(a) * b.r * 0.8);
    ctx.lineTo(b.x + Math.cos(a + 0.5) * b.r * 0.8, b.y + Math.sin(a + 0.5) * b.r * 0.8);
    ctx.stroke();
  }
  ctx.restore();
}

// The drag vector plus, with Aim Assist on, a dotted trace to the FIRST bounce
// only. It deliberately does not predict beyond that and never predicts a
// Snowball's flight — either would solve the game (brief §14).
function cldDrawAim(ctx) {
  // Every aim I currently hold: the ones already armed, plus the one being dragged
  // right now (which supersedes that penguin's armed aim while the finger is down).
  const live = cldDragging ? cldCurrentDragAim() : null;
  const aims = cldMyAims.filter(a => !live || a.penguinId !== live.penguinId);
  if (live) aims.push(live);
  aims.forEach(a => cldDrawOneAim(ctx, a, live && a.penguinId === live.penguinId));
}

function cldDrawOneAim(ctx, aim, isLive) {
  if (!aim) return;
  const p = cldPenguins.find(q => q.id === aim.penguinId);
  if (!p || p.drowned) return;
  if (aim.power < CLD_MIN_POWER) return;   // a too-soft drag draws nothing

  const len = Math.hypot(aim.dx, aim.dy) || 1;
  const ux = aim.dx / len, uy = aim.dy / len;

  // The pull-back line — drawn BEHIND the penguin, the slingshot convention.
  ctx.save();
  ctx.strokeStyle = isLive ? 'rgba(228,87,46,0.95)' : 'rgba(228,87,46,0.62)';
  ctx.lineWidth = isLive ? 2.5 : 2;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x - ux * aim.power * 46, p.y - uy * aim.power * 46);
  ctx.stroke();

  if (cldAimAssist) {
    // March forward until the first contact with a body or the rim. Cheap, and
    // exactly as far as the brief allows the prediction to go.
    const step = (cldFullSlideDist() * aim.power) / CLD_ASSIST_STEPS;
    let hx = p.x, hy = p.y;
    for (let k = 0; k < CLD_ASSIST_STEPS; k++) {
      hx += ux * step; hy += uy * step;
      if (cldDistFromCentre(hx, hy) > cldFloeRadius) break;
      let hit = false;
      for (let j = 0; j < cldPenguins.length; j++) {
        const q = cldPenguins[j];
        if (q.id === p.id) continue;
        if (Math.hypot(q.x - hx, q.y - hy) < CLD_PENGUIN_R * 2) { hit = true; break; }
      }
      if (!hit) for (let j = 0; j < cldBergs.length; j++) {
        const b = cldBergs[j];
        if (Math.hypot(b.x - hx, b.y - hy) < b.r + CLD_PENGUIN_R) { hit = true; break; }
      }
      if (hit) break;
    }
    ctx.setLineDash([4, 5]);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(hx, hy, 4, 0, CLD_TAU);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();
  }
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════
// Seat identity. In Stage 4 (single-device) seat 0 is "me"; Stage 5 swaps this
// for mpMyPlayerIdx. ONE function so there is one place to change.
// mpMyPlayerIdx is a top-level `let` in engine-multiplayer.js and NOT on window
// — reading it via window. returns undefined silently (BLD Bug 8).
// ═══════════════════════════════════════════════════════════════════════════
function cldMyIdx() {
  if (typeof mpMyPlayerIdx === 'number' && mpMyPlayerIdx >= 0) return mpMyPlayerIdx;
  return 0;
}
function cldIsMine(p) { return !!p && p.ownerIdx === cldMyIdx(); }
// Peck Off's second penguin — id is `${ownerIdx}-${n}`, so n>0 is the second.
function cldIsSecondPenguin(p) { return !!p && String(p.id).split('-')[1] !== '0'; }

// A penguin faces along its armed aim while aiming, and outward from the centre
// otherwise — so a bobbing Drowned penguin faces the ice it wants back.
function cldFacingOf(p) {
  const aim = cldArmedAimFor(p.id);
  if (aim && !p.drowned) return Math.atan2(aim.dy, aim.dx);
  if (p.drowned) return Math.atan2(CLD_H / 2 - p.y, CLD_W / 2 - p.x);
  return Math.atan2(p.y - CLD_H / 2, p.x - CLD_W / 2);
}

function cldArmedAimFor(penguinId) {
  if (!penguinId) return null;
  return cldMyAims.find(a => a.penguinId === penguinId) || null;
}

function cldMyPenguins() { return cldPenguins.filter(p => cldIsMine(p)); }

// ═══════════════════════════════════════════════════════════════════════════
// Drag-to-aim (brief §14)
//
// Release ARMS the aim; it never commits. The arm-then-commit split is the only
// safety net between a fat-fingered drag and a lost Floe-Off, which is why the
// commit is a separate button your thumb has to travel to.
// ═══════════════════════════════════════════════════════════════════════════
function cldCurrentDragAim() {
  if (!cldDragFrom || !cldDragTo || !cldDragPenguin) return null;
  // Slingshot: drag AWAY from where you want to go, so the travel vector is the
  // reverse of the finger's displacement.
  const dx = cldDragFrom.x - cldDragTo.x;
  const dy = cldDragFrom.y - cldDragTo.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return null;
  const power = cldPowerLock !== null
    ? cldPowerLock
    : Math.max(0, Math.min(1, len / (CLD_W * 0.36)));
  return { penguinId: cldDragPenguin, dx: dx, dy: dy, power: power };
}

function cldPointerDown(e) {
  if (cldPhase !== 'aiming') return;
  if (cldPtrId !== null) return;                 // one pointer at a time
  const pt = cldToLogical(e);

  // A Drowned player's tap is a Snowball target, not a drag. Outside the floe
  // disc it is ignored entirely — no aim is set (§7).
  const standing = cldMyPenguins().filter(p => !p.drowned);
  if (!standing.length) {
    if (cldDistFromCentre(pt.x, pt.y) <= cldFloeRadius) {
      cldMySnowball = { x: pt.x, y: pt.y };
      cldSfx('snowball');
      cldSyncFloeUI();
    }
    return;
  }

  // Grab the nearest of MY standing penguins within a generous radius — at 24px
  // an exact hit is not a reasonable thing to ask of a thumb.
  let best = null, bestD = 1e9;
  standing.forEach(p => {
    const d = Math.hypot(p.x - pt.x, p.y - pt.y);
    if (d < bestD) { bestD = d; best = p; }
  });
  if (!best || bestD > CLD_PENGUIN_R * 3.2) return;

  cldPtrId       = (e.pointerId === undefined) ? 'mouse' : e.pointerId;
  cldDragging    = true;
  cldDragPenguin = best.id;
  cldDragFrom    = { x: best.x, y: best.y };
  cldDragTo      = pt;
  cldSyncFloeUI();
}

function cldPointerMove(e) {
  if (!cldDragging) return;
  const id = (e.pointerId === undefined) ? 'mouse' : e.pointerId;
  if (id !== cldPtrId) return;
  cldDragTo = cldToLogical(e);
  cldSyncFloeUI();
}

function cldPointerUp(e) {
  if (!cldDragging) return;
  const id = (e.pointerId === undefined) ? 'mouse' : e.pointerId;
  if (id !== cldPtrId) return;

  const aim = cldCurrentDragAim();
  cldDragging = false;
  cldPtrId    = null;

  if (aim && aim.power >= CLD_MIN_POWER) {
    // A new drag REPLACES this penguin's armed aim, as many times as you like —
    // right up until Lock It In, and never after.
    cldMyAims = cldMyAims.filter(a => a.penguinId !== aim.penguinId);
    cldMyAims.push(aim);
  }
  cldDragPenguin = null;
  cldDragFrom = cldDragTo = null;
  cldSyncFloeUI();
}

// ═══════════════════════════════════════════════════════════════════════════
// The Floe screen — one screen, four phases via cldPhase.
// ═══════════════════════════════════════════════════════════════════════════
function cldShowFloe() {
  cldPhase       = 'aiming';
  cldCommitted   = false;
  cldMyAims      = [];
  cldMyDive      = 0;
  cldMySnowball  = null;
  cldDragging    = false;
  cldPtrId       = null;
  cldDragPenguin = null;
  showScreen('screen-cld-floe');
  cldInitCanvas();
  cldResize();
  cldSyncFloeUI();
  cldStartLoop();
}

function cldSyncFloeUI() {
  const hdr = document.getElementById('cld-floe-header');
  if (hdr) hdr.textContent = 'Floe-Off ' + cldFloeOffNo + ' · Slide ' + (cldSlideNo + 1);

  const iAmDrowned = cldMyPenguins().length > 0 && cldMyPenguins().every(p => p.drowned);

  // ── Dive row — Drowned only. A direction with no free position renders
  // UNAVAILABLE rather than failing at resolution (brief §14, §4C).
  const diveRow = document.getElementById('cld-dive-row');
  if (diveRow) diveRow.style.display = (iAmDrowned && cldPhase === 'aiming') ? 'flex' : 'none';
  if (iAmDrowned) {
    const mine = cldMyPenguins().find(p => p.drowned);
    document.querySelectorAll('[data-cld-dive]').forEach(btn => {
      const dir = parseInt(btn.dataset.cldDive, 10);
      const ok  = dir === 0 || (mine && cldDiveAvailable(mine, dir));
      btn.classList.toggle('cld-dive-unavailable', !ok);
      // Only pill-active-cld comes on and off — .pill carries every structural
      // style and must NEVER be removed.
      btn.classList.remove('pill-active-cld');
      if (dir === cldMyDive) btn.classList.add('pill-active-cld');
    });
  }

  // ── Power bar. Live during a drag; frozen at the locked value when locked.
  const aim  = cldDragging ? cldCurrentDragAim() : cldArmedAimFor(cldFirstUnarmedOrLast());
  const shown = cldPowerLock !== null ? cldPowerLock : (aim ? aim.power : 0);
  const fill  = document.getElementById('cld-power-fill');
  if (fill) fill.style.width = Math.round(shown * 100) + '%';
  const track = document.getElementById('cld-power-track');
  if (track) track.classList.toggle('cld-power-locked', cldPowerLock !== null);
  const hint = document.getElementById('cld-power-hint');
  if (hint) {
    // "Too soft" blocks an ACCIDENTAL drag from registering as a committed
    // Slide. A Peck Off hold is a deliberate, separate action and never routes
    // through this check (§7).
    if (cldPhase !== 'aiming')            hint.textContent = '';
    else if (cldPowerLock !== null)       hint.textContent = 'Power locked — tap to release';
    else if (aim && aim.power < CLD_MIN_POWER) hint.textContent = 'Too soft';
    else                                  hint.textContent = 'Tap to lock power';
    hint.className = (aim && aim.power < CLD_MIN_POWER && cldPowerLock === null)
      ? 'text-amber-600 text-xs' : 'text-stone-400 text-xs';
  }

  // ── Tally. Counts only — it must NEVER say who (spec §11 privacy contract,
  // and the same rule holds on a single device so the two paths cannot diverge).
  const tally = document.getElementById('cld-tally');
  if (tally) {
    const done = cldCommits.filter(c => c !== null).length;
    tally.textContent = cldPhase === 'resolving' ? 'Sliding…'
                      : done + ' of ' + cldPlayerCount + ' locked in';
  }

  // ── Lock It In. Disabled until a valid aim is armed; after commit it becomes
  // a non-interactive waiting label and the canvas stops accepting drags.
  const btn = document.getElementById('btn-cld-commit');
  if (btn) {
    if (cldPhase !== 'aiming') {
      btn.style.display = 'none';
    } else if (cldCommitted) {
      const waiting = cldPlayerCount - cldCommits.filter(c => c !== null).length;
      btn.style.display = 'flex';
      btn.textContent = 'Locked in — waiting on ' + waiting;
      btn.disabled = true;
      btn.className = 'btn-mp-action min-h-14 w-full rounded-2xl text-xl font-semibold ' +
                      'flex items-center justify-center bg-stone-200 text-stone-500';
    } else {
      btn.style.display = 'flex';
      btn.textContent = 'Lock It In';
      btn.disabled = !cldCanCommit();
      // The reveal sets display:flex, so the centring classes have to be in the
      // class string — a <button> only centres its label until something makes
      // it a flex container (checklist, PKO BUG-03).
      btn.className = 'btn-mp-action cld-cta min-h-14 w-full rounded-2xl text-xl font-semibold' +
                      (cldCanCommit() ? '' : ' opacity-50 pointer-events-none');
    }
  }

  // The [?] does not open during resolving/washout — a slide-up panel over a
  // playing Slide hides the one thing the player needs to watch (brief §15).
  // Greyed rather than removed, so it doesn't appear to vanish.
  const help = document.getElementById('btn-cld-how-to');
  if (help) help.className = (cldPhase === 'aiming' || cldPhase === 'waiting')
    ? 'text-stone-400 font-bold text-sm active:scale-90 transition-transform duration-100'
    : 'text-stone-200 font-bold text-sm';
}

// Which penguin's power the bar is showing when nothing is being dragged: the
// most recently armed one, so the bar always reflects the last thing you did.
function cldFirstUnarmedOrLast() {
  if (!cldMyAims.length) return null;
  return cldMyAims[cldMyAims.length - 1].penguinId;
}

// A Drowned player can always commit (a Dive and/or a Snowball, or neither).
// A Standing player needs at least one aim at or above the minimum power.
function cldCanCommit() {
  if (cldCommitted) return false;
  const mine = cldMyPenguins();
  if (!mine.length) return false;
  if (mine.every(p => p.drowned)) return true;
  return cldMyAims.some(a => a.power >= CLD_MIN_POWER &&
                             mine.some(p => p.id === a.penguinId && !p.drowned));
}

// ═══════════════════════════════════════════════════════════════════════════
// Commit → resolve → playback
//
// Stage 5 replaces the marked seam below with the private CLD_COMMIT packet and
// the host's CLD_SLIDE_RESOLVE broadcast. The shape here is already the one the
// packet layer needs: build a commit object, hand it to the host, and let the
// host be the only thing that ever calls cldResolveSlide().
// ═══════════════════════════════════════════════════════════════════════════
function cldBuildMyCommit() {
  const mine = cldMyPenguins();
  const aims = cldMyAims.filter(a => mine.some(p => p.id === a.penguinId && !p.drowned));
  // A Peck Off penguin left un-armed is NOT blocked — it defaults to a
  // zero-power hold, a deliberate park and a different code path from the
  // too-soft check (§7).
  mine.filter(p => !p.drowned && !aims.some(a => a.penguinId === p.id))
      .forEach(p => aims.push({ penguinId: p.id, dx: 0, dy: 0, power: 0 }));
  return { aims: aims, dive: cldMyDive, snowball: cldMySnowball };
}

function cldCommit() {
  if (!cldCanCommit()) return;
  cldCommitted = true;
  cldSfx('commit');
  const mine = cldBuildMyCommit();

  if (window.syllyMultiplayerMode === 'client') {
    // PRIVATE, to the host alone. A public ACTION would publish this aim to every
    // rival before resolution, and nothing on screen would reveal it (spec §11).
    mpLockSync();
    // Local count proxy FIRST, so the tally moves before the host's round-trips —
    // and so it cannot overwrite the authoritative tally that answers this very
    // packet. It is set before the send, not after, because the two are ordered
    // only by the network: a fast host reply must be the LAST word on the count.
    cldCommits[cldMyIdx()] = true;
    mpSendPrivate(cldHostUid(), {
      type: 'ACTION',
      payload: { action: 'CLD_COMMIT', slideNo: cldSlideNo, commit: mine },
    });
    cldSyncFloeUI();
    return;
  }

  // Host (and single): record our own slot DIRECTLY. Never a self-sent ACTION —
  // engine-multiplayer.js drops every envelope where originId === syllyDeviceUid,
  // so the host's own slot would never be set and the Slide would hang forever.
  cldApplyCommit(cldMyIdx(), mine, cldSlideNo);
  cldBroadcastTally();

  // Single-device ONLY: no other seat will ever submit, so fill the absent ones
  // with a zero-power hold and let the Slide be watched end to end. Unreachable
  // in a lobby session — a client returned above, and a host is not 'single'.
  if (window.syllyMultiplayerMode === 'single') {
    for (let i = 0; i < cldPlayerCount; i++) {
      if (i === cldMyIdx() || cldCommits[i]) continue;
      cldCommits[i] = { aims: [], dive: 0, snowball: null };
    }
  }

  cldSyncFloeUI();
  // Plain .every() — a gate that reads a per-seat array must be checked in the
  // mode where that array is EMPTY, because [].every() is true (CJAR BUG-05).
  if (cldPlayerCount > 0 && cldCommits.every(c => c !== null)) cldHostResolveSlide();
}

// HOST ONLY. The one true simulation in the room.
function cldHostResolveSlide() {
  if (window.syllyMultiplayerMode === 'client') return;
  const seed = (Date.now() ^ (cldFloeOffNo * 7919) ^ (cldSlideNo * 104729)) >>> 0;
  const tl = cldResolveSlide(seed);
  const payload = cldTimelinePayload(tl);
  if (window.syllyMultiplayerMode === 'host') {
    mpSendEnvelope({ type: 'SYNC', payload: payload });
  }
  // The host replays its OWN broadcast payload, not the live timeline (§16 Q5) —
  // host and clients then run byte-identical playback, and a missing payload field
  // breaks the host instead of only the devices nobody is watching.
  cldBeginPlayback(cldTimelineFromPayload(payload));
}

// ── Timeline playback ──────────────────────────────────────────────────────
// The host replays its OWN broadcast samples rather than the live sim (§16 Q5),
// so host and clients see pixel-identical playback and any sampling or
// quantisation bug shows up on the host instead of only on devices nobody is
// watching. Costs one frame of latency on the host and nothing else.
let cldPlaybackEventPtr = 0;
let cldAftermathPtr     = 0;

function cldBeginPlayback(tl) {
  cldTimeline         = tl;
  // A client never runs cldResolveSlide(), so neither of these advances by
  // itself. Setting them here rather than in the applier keeps host and client
  // on one code path; on the host both assignments are already true.
  if (typeof tl.slideNo === 'number') cldSlideNo = tl.slideNo;
  // TG-13 — under The Thaw the Slide was simulated on the PRE-Thaw floe, but by
  // now cldFloeRadius is already post-Thaw (host: cldThawStep shrank it in
  // cldResolveSlide; client: the packet's post-Thaw `radius` is all it ever saw).
  // Rewind to the rim the samples were generated on so the shrink is a visible
  // beat when the thaw aftermath plays, not a state the replay opens in.
  const cldFirstThaw = (tl.aftermath || []).find(b => b.type === 'thaw');
  if (cldFirstThaw && typeof cldFirstThaw.fromRadius === 'number') {
    cldFloeRadius = cldFirstThaw.fromRadius;
  }
  cldCommits          = new Array(cldPlayerCount).fill(null);
  cldPlaybackT        = 0;
  cldPlaybackEventPtr = 0;
  cldAftermathPtr     = 0;
  cldLastSfxT         = -CLD_COLLISION_SFX_MS;
  cldWashoutUntil     = 0;
  cldPhase            = 'resolving';
  cldMyAims = []; cldMySnowball = null; cldMyDive = 0;
  cldSyncFloeUI();
  cldStartLoop();
}

function cldAdvancePlayback(dtMs) {
  if (!cldTimeline) { cldPhase = 'aiming'; return; }
  const tl = cldTimeline;
  cldPlaybackT += dtMs;

  // ── Positions: interpolate between the two bracketing samples. The samples
  // are quantised ints at CLD_SAMPLE_HZ; interpolating is what makes 20Hz data
  // look like 60fps motion.
  const sampleMs = 1000 / CLD_SAMPLE_HZ;
  const fIdx = Math.min(cldPlaybackT / sampleMs, tl.samples.length - 1);
  const i0 = Math.floor(fIdx), i1 = Math.min(i0 + 1, tl.samples.length - 1);
  const f  = fIdx - i0;
  const s0 = tl.samples[i0], s1 = tl.samples[i1];
  if (s0 && s1) {
    // Body order IS the wire contract — penguins first, then Bergs, in the same
    // order cldBuildSlideInputs pushed them.
    cldPenguins.forEach((p, k) => {
      if (p.plungedThisSlide) return;   // frozen at the lip; the plunge beat owns it
      p.x = s0[k * 2]     + (s1[k * 2]     - s0[k * 2])     * f;
      p.y = s0[k * 2 + 1] + (s1[k * 2 + 1] - s0[k * 2 + 1]) * f;
    });
  }

  // ── Events, in order, as the clock passes them.
  while (cldPlaybackEventPtr < tl.events.length &&
         tl.events[cldPlaybackEventPtr].t <= cldPlaybackT) {
    cldPlayEvent(tl.events[cldPlaybackEventPtr]);
    cldPlaybackEventPtr++;
  }

  // ── Aftermath beats — surfacings, the Thaw step, thaw-drops. Held for
  // CLD_AFTERMATH_MS past the last sample so they are not a jump cut.
  if (cldPlaybackT >= tl.durationMs) {
    const into = cldPlaybackT - tl.durationMs;
    const per  = CLD_AFTERMATH_MS / Math.max(1, tl.aftermath.length);
    while (cldAftermathPtr < tl.aftermath.length && into >= cldAftermathPtr * per) {
      cldPlayAftermath(tl.aftermath[cldAftermathPtr]);
      cldAftermathPtr++;
    }
    if (into >= CLD_AFTERMATH_MS) cldEndPlayback();
  }
}

function cldPlayEvent(e) {
  if (e.type === 'collision' || e.type === 'rebound') {
    // Two gates, both mandatory (§9). The throttle is keyed on PLAYBACK time,
    // not wall-clock, so it behaves identically on a replayed timeline as it did
    // in the sim.
    if ((e.speed || 0) < CLD_SFX_MIN_V) return;
    if (cldPlaybackT - cldLastSfxT < CLD_COLLISION_SFX_MS) return;
    cldLastSfxT = cldPlaybackT;
    cldSfx(e.type === 'rebound' ? 'rebound' : 'collide');
    return;
  }
  if (e.type === 'plunge') {
    // Never throttled — the plunge is one of the beats the throttle protects.
    const p = cldPenguins.find(q => q.id === e.id);
    if (p) { p.plungedThisSlide = true; p.plungeT = 0; }
    cldSfx('plunge');
    cldFloatBark();
    return;
  }
  if (e.type === 'shatter') {
    cldSfx('rebound');
    return;
  }
  if (e.type === 'landing') {
    cldSfx('snowball');
    return;
  }
}

function cldPlayAftermath(b) {
  if (b.type === 'surface') {
    const p = cldPenguins.find(q => q.id === b.penguinId);
    if (p) { p.x = b.x; p.y = b.y; p.plungedThisSlide = false; }
    return;
  }
  if (b.type === 'thaw')      { cldFloeRadius = b.newRadius; cldSfx('thaw'); return; }
  if (b.type === 'thaw-drop') { cldSfx('plunge'); cldFloatBark(); return; }
}

function cldEndPlayback() {
  const tl = cldTimeline;
  cldPenguins.forEach(p => { p.plungedThisSlide = false; });
  cldStopLoop();                        // EVERY early phase transition (§13)

  if (!tl) { cldPhase = 'aiming'; cldShowFloe(); return; }

  // The rim the Slide left behind, from the broadcast rather than from a local
  // simulation — the same object on every device, host included.
  cldApplyPost(tl.post);

  if (tl.washout) {
    // The joke needs the beat (brief Decision 21) — hold on WASHOUT! before
    // replaying the Floe-Off.
    cldPhase = 'washout';
    cldSfx('washout');
    cldFloatText('WASHOUT!');
    cldSyncFloeUI();
    cldResultTimer = setTimeout(() => {
      cldResultTimer = null;
      // The replay is a Resurface, and a Resurface is host-authored. A client
      // running cldStartFloeOffLocal() here would seed its own penguins and Bergs
      // and diverge until the host's CLD_FLOEOFF_START overwrote them.
      if (window.syllyMultiplayerMode === 'client') { cldShowClientStandby(); return; }
      cldStartFloeOffLocal();
    }, CLD_WASHOUT_MS);
    return;
  }

  if (tl.floeOffOver) { cldShowResult(tl); return; }

  // More Slides to come — back to aiming on the same floe.
  cldPhase = 'aiming';
  cldShowFloe();
}

// ═══════════════════════════════════════════════════════════════════════════
// Match / Floe-Off screens
// ═══════════════════════════════════════════════════════════════════════════

// The only place a Floe-Off starts locally. Stage 5's CLD_FLOEOFF_START applier
// calls the same two lines, so the intro is wired in at the SAME point on host
// and client — miss either half and one class of device skips the intro
// (ui-style.md § Round Intro Screen Standard).
function cldStartFloeOffLocal() {
  if (window.syllyMultiplayerMode === 'client') return;   // Resurfaces are host-authored
  const seed = (Date.now() ^ 0x5f3a) >>> 0;
  cldStartFloeOff(seed);
  cldIntroIdx = Math.floor(Math.random() * CLD_INTRO_FLAVOUR.length);
  // Wired in at the SAME point as the client's CLD_FLOEOFF_START applier, so no
  // class of device skips the intro (ui-style.md § Round Intro Screen Standard).
  if (window.syllyMultiplayerMode === 'host') {
    mpSendEnvelope({ type: 'SYNC', payload: cldFloeOffStartPayload() });
  }
  cldShowFloeOffIntro('intro');
}

function cldStartMatchLocal(names) {
  cldStartMatch(names);
  // Floe Size pre-selection (§5 / §17 deviation 2): applied ONCE at match start,
  // and only if the host never tapped a Floe Size pill. Their choice, if made,
  // stands untouched.
  if (!cldFloeSizeTouched) {
    cldFloeSize = cldPlayerCount <= 4 ? 'roomy'
                : cldPlayerCount <= 6 ? 'standard'
                : 'cramped';
  }
  cldStartFloeOffLocal();
}

function cldShowFloeOffIntro(mode) {
  cldIntroMode = mode || 'intro';
  cldStopLoop();
  if (cldIntroTimer) { clearTimeout(cldIntroTimer); cldIntroTimer = null; }

  const h = document.getElementById('cld-intro-heading');
  const s = document.getElementById('cld-intro-sub');
  const n = document.getElementById('cld-intro-note');
  if (cldIntroMode === 'standby') {
    if (h) h.textContent = 'Standing by…';
    if (s) s.textContent = 'Waiting for the host to push everyone onto the ice.';
    if (n) n.style.display = 'none';
  } else {
    if (h) h.textContent = 'Floe-Off ' + cldFloeOffNo;
    // Rotated per Floe-Off — the same sentence every time reads as filler by the
    // third showing. Host-picked and synced in Stage 5 so players sitting
    // together read the same line.
    if (s) s.textContent = CLD_INTRO_FLAVOUR[cldIntroIdx % CLD_INTRO_FLAVOUR.length];
    if (n) {
      const notes = [];
      if (cldSyllyMode) notes.push('The Thaw is on — the floe is already melting.');
      if (cldIceBreaker) notes.push('Bergs on the rim will bounce you back. For a while.');
      n.textContent = notes.join(' ');
      n.style.display = notes.length ? 'block' : 'none';
    }
  }
  showScreen('screen-cld-floeoff-intro');

  // The auto-advance is armed in 'intro' mode ONLY. Arming it in standby would
  // march a client past the intro into an empty floe (spec §2).
  if (cldIntroMode === 'intro') {
    cldIntroTimer = setTimeout(() => { cldIntroTimer = null; cldShowFloe(); }, CLD_INTERSTITIAL_MS);
  }
}

function cldShowResult(tl) {
  cldStopLoop();
  if (cldResultTimer) { clearTimeout(cldResultTimer); cldResultTimer = null; }

  const winner = tl.winnerIdx;
  if (winner >= 0) cldSfx('fish');

  // The result art goes through the SAME seam as the in-play penguins — a
  // larger r, the idle state. There is no separate "key art" to diverge (§10).
  const art = document.getElementById('cld-result-art');
  if (art) {
    art.innerHTML = '';
    const c = document.createElement('canvas');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.style.width = '96px'; c.style.height = '96px';
    c.width = 96 * dpr; c.height = 96 * dpr;
    const g = c.getContext('2d');
    if (g) {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      // ring:false — the ring exists to answer "which one is me" on a crowded floe.
      // Here the winner's name is directly beneath the art, and the ring's gap reads
      // as a page-coloured halo against chrome instead of the ice it was drawn for.
      cldRenderPenguin(g, winner >= 0 ? 'idle' : 'bob', winner >= 0 ? winner : 0,
                       48, 48, 32, { t: 0, facing: -0.35, ring: false });
    }
    art.appendChild(c);
  }

  const h = document.getElementById('cld-result-heading');
  const s = document.getElementById('cld-result-sub');
  if (h) h.textContent = winner >= 0
    ? (cldPlayerNames[winner] || 'Someone') + ' is the last one dry.'
    : 'Washout!';
  if (s) s.textContent = winner >= 0
    ? 'That’s a Fish. 🐟'
    : 'Nobody made it. No Fish — back on the ice.';

  const box = document.getElementById('cld-result-plunges');
  if (box) {
    box.innerHTML = '';
    const wentIn = cldPenguins.filter(p => p.drowned);
    if (wentIn.length) {
      const line = document.createElement('p');
      const names = [];
      wentIn.forEach(p => {
        const nm = cldPlayerNames[p.ownerIdx] || ('P' + (p.ownerIdx + 1));
        if (names.indexOf(nm) < 0) names.push(nm);
      });
      line.textContent = 'In the Drink: ' + names.join(', ');
      box.appendChild(line);
    }
  }

  showScreen('screen-cld-result');
  cldResultTimer = setTimeout(() => {
    cldResultTimer = null;
    if (tl.matchOver) cldShowGameover(); else cldShowScoreboard();
  }, CLD_RESULT_MS);
}

function cldShowScoreboard() {
  cldStopLoop();
  const box = document.getElementById('cld-scoreboard-rows');
  if (box) {
    box.innerHTML = '';
    cldPlayerNames.map((nm, i) => ({ nm: nm, i: i, fish: cldFish[i] || 0 }))
      .sort((a, b) => b.fish - a.fish)
      .forEach(row => {
        const el = document.createElement('div');
        el.className = 'flex items-center justify-between bg-white rounded-2xl px-4 py-3 shadow-sm';
        const left = document.createElement('div');
        left.className = 'flex items-center gap-2';
        const dot = document.createElement('span');
        dot.style.cssText = 'width:0.75rem;height:0.75rem;border-radius:9999px;flex-shrink:0;' +
                            'background:' + cldTintOf(row.i);
        const nameEl = document.createElement('span');
        nameEl.className = 'font-semibold text-stone-800';
        nameEl.textContent = row.nm;
        left.appendChild(dot); left.appendChild(nameEl);
        const right = document.createElement('span');
        right.className = 'text-stone-500 text-sm';
        right.textContent = cldFishLabel(row.fish);
        el.appendChild(left); el.appendChild(right);
        box.appendChild(el);
      });
  }

  // Host-gated. In Stage 4 there is only one device, so the host path always
  // runs; Stage 5's client branch shows the waiting line instead.
  const btn = document.getElementById('btn-cld-next-floeoff');
  const wait = document.getElementById('cld-scoreboard-waiting');
  const isClient = window.syllyMultiplayerMode === 'client';
  if (btn)  btn.style.display  = isClient ? 'none' : 'flex';
  if (wait) wait.style.display = isClient ? 'block' : 'none';

  showScreen('screen-cld-scoreboard');
}

// Fish render as icons up to 5, then as a numeral — a row of eight wrecks the
// column alignment, and 5 is the highest Fish-to-Win setting anyway (brief §17).
function cldFishLabel(n) {
  if (n <= 0) return '—';
  if (n <= 5) return '🐟'.repeat(n);
  return '🐟 × ' + n;
}

function cldShowGameover() {
  cldStopLoop();
  cldSfx('matchEnd');
  const winner = cldMatchWinner();

  const sub = document.getElementById('cld-go-sub');
  if (sub) sub.textContent = winner >= 0
    ? (cldPlayerNames[winner] || 'Someone') + ' is the last one dry.'
    : 'Everyone back to the water.';

  const podium = document.getElementById('cld-podium');
  if (podium) {
    podium.innerHTML = '';
    cldPlayerNames.map((nm, i) => ({ nm: nm, i: i, fish: cldFish[i] || 0 }))
      .sort((a, b) => b.fish - a.fish)
      .forEach((row, rank) => {
        const el = document.createElement('div');
        el.className = 'flex items-center justify-between bg-white rounded-2xl px-4 py-3 shadow-sm';
        const left = document.createElement('div');
        left.className = 'flex items-center gap-2';
        // A fixed-width leading slot on EVERY row, medal or blank — a row with no
        // medal must still reserve the width or the podium reads as misaligned.
        const medal = document.createElement('span');
        medal.className = 'cld-medal-slot';
        medal.textContent = ['🥇', '🥈', '🥉'][rank] || '';
        const nameEl = document.createElement('span');
        nameEl.className = 'font-semibold text-stone-800';
        nameEl.textContent = row.nm;
        left.appendChild(medal); left.appendChild(nameEl);
        const right = document.createElement('span');
        right.className = 'text-stone-500 text-sm';
        right.textContent = cldFishLabel(row.fish);
        el.appendChild(left); el.appendChild(right);
        podium.appendChild(el);
      });
  }

  // Both stat lines are hidden at Fish to Win = 1, where a single Floe-Off makes
  // them meaningless (brief §17). The podium always shows.
  const stats = document.getElementById('cld-go-stats');
  if (stats) {
    stats.innerHTML = '';
    if (cldFishToWin > 1 && cldMatchStats.length) {
      const best = (key) => {
        let bi = 0;
        for (let i = 1; i < cldMatchStats.length; i++) {
          if ((cldMatchStats[i][key] || 0) > (cldMatchStats[bi][key] || 0)) bi = i;
        }
        return { name: cldPlayerNames[bi] || '—', val: cldMatchStats[bi][key] || 0 };
      };
      const stood = best('slidesStood'), wet = best('plunges');
      [['Longest stand', stood.name + ' — ' + stood.val + ' Slide' + (stood.val === 1 ? '' : 's')],
       ['Most plunges',  wet.name + ' — ' + wet.val + ' trip' + (wet.val === 1 ? '' : 's') + ' in']]
        .forEach(([label, val]) => {
          const p = document.createElement('p');
          p.className = 'text-stone-500 text-sm';
          p.innerHTML = '<span class="font-semibold text-stone-700">' + label + ':</span> ' + val;
          stats.appendChild(p);
        });
    }
  }

  showScreen('screen-cld-gameover');
}

// ═══════════════════════════════════════════════════════════════════════════
// Float layer — transient text over an absolutely-positioned layer, never in
// the flow. An in-flow animated element changes the column's height while it
// plays, which re-centres the whole Stack (ui-style.md, SHP's sheep parade).
// ═══════════════════════════════════════════════════════════════════════════
function cldFloatBark() {
  cldFloatText(CLD_PLUNGE_BARKS[Math.floor(Math.random() * CLD_PLUNGE_BARKS.length)]);
}

function cldFloatText(text) {
  const layer = document.getElementById('cld-float-layer');
  if (!layer) return;
  layer.innerHTML = '';
  const el = document.createElement('p');
  el.className = 'text-white font-bold text-lg px-3 py-1 rounded-full';
  el.style.cssText = 'background:rgba(18,59,76,0.72); text-shadow:0 1px 2px rgba(0,0,0,.5);';
  el.textContent = text;
  layer.appendChild(el);
  if (cldFloatTimer) { clearTimeout(cldFloatTimer); cldFloatTimer = null; }
  cldFloatTimer = setTimeout(() => {
    cldFloatTimer = null;
    const l = document.getElementById('cld-float-layer');
    if (l) l.innerHTML = '';
  }, CLD_BARK_MS);
}

// One indirection for every sound, so a moment's identity (data) and its voice
// (audio) cannot drift apart, and so a harness sandbox with no play*() defined
// never throws.
function cldSfx(moment) {
  const fn = CLD_SOUND[moment];
  if (fn && typeof window[fn] === 'function') window[fn]();
}

// ═══════════════════════════════════════════════════════════════════════════
// Overlays and settings
// ═══════════════════════════════════════════════════════════════════════════
function cldOpenOverlay(id) {
  const ov = document.getElementById(id);
  if (!ov) return;
  // overlay-data-inner gets overflow-y:auto from its CSS CLASS, not a Tailwind
  // utility — querying .overflow-y-auto returns null and the scroll is silently
  // never reset (ui-style.md § Settings Layout Standard).
  const inner = ov.querySelector('.overlay-data-inner');
  if (inner) inner.scrollTop = 0;
  ov.style.display = 'flex';
}

function cldOpenHowTo(tab) {
  cldSyncSettingsUI();          // the two conditional cards read the live settings
  cldSetHowtoTab(tab || 'rules');
  cldOpenOverlay('cld-how-to-overlay');
}

// Rules and The Floe are two tabs of ONE overlay; bodies are siblings toggled by
// display so each keeps its own scroll position across a flick. The Floe's RAF
// loop only runs while its tab is showing — started here, stopped on any switch
// away, on close, and in cldResetState() (§ Timer Lifecycle: a RAF is a timer).
function cldSetHowtoTab(tab) {
  const rules = document.getElementById('cld-howto-body-rules');
  const floe  = document.getElementById('cld-howto-body-floe');
  if (rules) rules.style.display = tab === 'floe' ? 'none' : 'flex';
  if (floe)  floe.style.display  = tab === 'floe' ? 'flex' : 'none';
  document.querySelectorAll('[data-cld-howto-tab]').forEach(b => {
    b.classList.remove('pill-active-cld');   // .pill is the base — never removed
    if (b.dataset.cldHowtoTab === tab) b.classList.add('pill-active-cld');
  });
  const body = tab === 'floe' ? floe : rules;
  if (body) body.scrollTop = 0;
  if (tab === 'floe') cldHowtoStart(); else cldHowtoStop();
}

// ═══════════════════════════════════════════════════════════════════════════
// "The Floe" — the How-to reference tab: a live practice sim plus the cast of
// poses. A STATE ISLAND — everything is cldHowto*-prefixed and shares nothing
// with the live game (no cldPenguins, no cldTimeline, no cldFloeRadius, no
// commits, no packets), and it never branches on syllyMultiplayerMode. It
// borrows exactly two things the game already owns: window.Physics.simulate()
// and cldRenderPenguin() — so the poses shown here cannot drift from the ones
// played, and the sim shown here IS the sim.
//
// Deviation, logged (cld-implementation-notes): ui-style.md says a how-to tab
// should not carry "live running state". The practice floe does. Owner call.
// ═══════════════════════════════════════════════════════════════════════════
const CLD_HOWTO_N       = 5;     // penguins on the practice floe
const CLD_HOWTO_RADIUS  = 130;   // fixed (CLD_R_STD) — deliberately not a settings mirror
const CLD_HOWTO_HOLD_MS = 700;   // beat held after the last sample before settling

const CLD_HOWTO_CAST = [
  { pose: 'idle',   name: 'Idle',   note: 'waiting to aim' },
  { pose: 'lean',   name: 'Lean',   note: 'winding up' },
  { pose: 'squash', name: 'Squash', note: 'impact frame' },
  { pose: 'plunge', name: 'Plunge', note: 'into the Drink' },
  { pose: 'bob',    name: 'Bob',    note: 'Drowned, on the rim' },
  { pose: 'throw',  name: 'Throw',  note: 'a Snowball lob' },
];
const CLD_HOWTO_TILE_R = 72;   // cast-tile penguin radius, logical units (fills the tile)

let cldHowtoCtx   = null;
let cldHowtoRaf   = null;
let cldHowtoLastT = 0;
let cldHowtoClock = 0;      // wall seconds — drives idle sway + the plunge tile cycle
let cldHowtoPeng  = [];     // [{ id, x, y, drowned }]
let cldHowtoTL    = null;   // active playback { samples, durationMs, final } or null
let cldHowtoPlayT = 0;      // playback clock, ms
let cldHowtoCast  = [];     // [{ el, ctx, pose, colour }] — the six cast-tile canvases

function cldHowtoBuildCast() {
  const box = document.getElementById('cld-howto-cast');
  if (!box || box.childElementCount) return;   // built once
  cldHowtoCast = [];
  CLD_HOWTO_CAST.forEach((c, i) => {
    const tile = document.createElement('div');
    tile.className = 'flex flex-col items-center gap-1';
    const cv = document.createElement('canvas');
    cv.className = 'w-full rounded-lg';
    cv.style.cssText = 'aspect-ratio:1/1;background:#0e2536';
    const name = document.createElement('p');
    name.className = 'text-[11px] font-semibold text-stone-700';
    name.textContent = c.name;
    const note = document.createElement('p');
    note.className = 'text-[10px] text-stone-400 text-center leading-tight';
    note.textContent = c.note;
    tile.append(cv, name, note);
    box.appendChild(tile);
    const ctx = cv.getContext && cv.getContext('2d');
    if (ctx) cldHowtoCast.push({ el: cv, ctx: ctx, pose: c.pose, colour: i });
  });
}

// DPR-aware fit for a canvas that fills its CSS box, mapping the CLD_W logical
// square into it. Re-sizes only when the box actually changed (a canvas resize
// clears it); the transform is re-set every frame regardless.
function cldHowtoFit(cv, ctx) {
  const box = cv.getBoundingClientRect();
  const w = Math.max(1, box.width), h = Math.max(1, box.height);
  const dpr = window.devicePixelRatio || 1;
  const wantW = Math.round(w * dpr), wantH = Math.round(h * dpr);
  if (cv.width !== wantW || cv.height !== wantH) { cv.width = wantW; cv.height = wantH; }
  const scale = Math.min(w, h) / CLD_W;
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr,
                   (w - CLD_W * scale) / 2 * dpr, (h - CLD_W * scale) / 2 * dpr);
}

function cldHowtoSeed() {
  cldHowtoTL = null; cldHowtoPlayT = 0;
  cldHowtoPeng = [];
  for (let i = 0; i < CLD_HOWTO_N; i++) {
    const a = (i / CLD_HOWTO_N) * CLD_TAU - Math.PI / 2;
    const r = CLD_HOWTO_RADIUS * CLD_START_RING;
    cldHowtoPeng.push({ id: i, x: CLD_W / 2 + r * Math.cos(a), y: CLD_H / 2 + r * Math.sin(a), drowned: false });
  }
}

function cldHowtoShove() {
  if (cldHowtoTL) return;                      // already resolving — ignore the tap
  const stand = cldHowtoPeng.filter(p => !p.drowned);
  if (stand.length < 2) { cldHowtoSeed(); return; }   // nothing left to shove
  const bodies = cldHowtoPeng.map(p => ({
    id: p.id, x: p.x, y: p.y, r: CLD_PENGUIN_R,
    kind: p.drowned ? 'drowned' : 'penguin',
  }));
  const impulses = stand.map(p => {
    const a = Math.random() * CLD_TAU;
    const v = (0.55 + Math.random() * 0.45) * CLD_V_MAX;
    return { bodyId: p.id, vx: Math.cos(a) * v, vy: Math.sin(a) * v };
  });
  cldHowtoTL = window.Physics.simulate({
    world:    { cx: CLD_W / 2, cy: CLD_H / 2, radius: CLD_HOWTO_RADIUS },
    bodies:   bodies,
    impulses: impulses,
    events:   [],
    params:   { decel: cldDecel('slush'), substepMs: CLD_SUBSTEP_MS, capMs: CLD_SIM_CAP_MS, sampleHz: CLD_SAMPLE_HZ },
    seed:     (Math.random() * 0xffffffff) >>> 0,
  });
  cldHowtoPlayT = 0;
  cldSfx('collide');
}

// Apply the sim's resting state. A plunged penguin becomes Drowned and rides the
// rim at its final angle — the real game's rule, minus the Berth bookkeeping the
// reference doesn't need.
function cldHowtoSettle() {
  const tl = cldHowtoTL; if (!tl) return;
  tl.final.forEach(f => {
    const p = cldHowtoPeng.find(q => q.id === f.id);
    if (!p) return;
    if (f.plunged) {
      const a = Math.atan2(f.y - CLD_H / 2, f.x - CLD_W / 2);
      p.drowned = true;
      p.x = CLD_W / 2 + CLD_HOWTO_RADIUS * Math.cos(a);
      p.y = CLD_H / 2 + CLD_HOWTO_RADIUS * Math.sin(a);
    } else {
      p.x = f.x; p.y = f.y;
    }
  });
  cldHowtoTL = null; cldHowtoPlayT = 0;
}

function cldHowtoLoop(now) {
  cldHowtoRaf = null;
  if (!cldHowtoLastT) cldHowtoLastT = now;
  const dt = Math.min((now - cldHowtoLastT) / 1000, 0.05);
  cldHowtoLastT = now;
  cldHowtoClock += dt;

  if (cldHowtoTL) {
    const tl = cldHowtoTL;
    cldHowtoPlayT += dt * 1000;
    const sampleMs = 1000 / CLD_SAMPLE_HZ;
    const fIdx = Math.min(cldHowtoPlayT / sampleMs, tl.samples.length - 1);
    const i0 = Math.floor(fIdx), i1 = Math.min(i0 + 1, tl.samples.length - 1);
    const f  = fIdx - i0;
    const s0 = tl.samples[i0], s1 = tl.samples[i1];
    if (s0 && s1) {
      cldHowtoPeng.forEach((p, k) => {
        if (p.drowned) return;
        p.x = s0[k * 2]     + (s1[k * 2]     - s0[k * 2])     * f;
        p.y = s0[k * 2 + 1] + (s1[k * 2 + 1] - s0[k * 2 + 1]) * f;
      });
    }
    if (cldHowtoPlayT >= tl.durationMs + CLD_HOWTO_HOLD_MS) cldHowtoSettle();
  }

  cldHowtoDrawFloe();
  cldHowtoDrawCast();

  if (!cldHowtoRaf) cldHowtoRaf = requestAnimationFrame(cldHowtoLoop);
}

function cldHowtoDrawFloe() {
  const ctx = cldHowtoCtx;
  const cv  = document.getElementById('cld-howto-floe-canvas');
  if (!ctx || !cv) return;
  cldHowtoFit(cv, ctx);
  const cx = CLD_W / 2, cy = CLD_H / 2, R = CLD_HOWTO_RADIUS;

  ctx.clearRect(-CLD_W, -CLD_W, CLD_W * 3, CLD_W * 3);
  const water = ctx.createLinearGradient(0, 0, 0, CLD_H);
  water.addColorStop(0, '#1c3f57');
  water.addColorStop(1, '#0e2536');
  ctx.fillStyle = water;
  ctx.fillRect(-CLD_W, -CLD_W, CLD_W * 3, CLD_W * 3);

  ctx.strokeStyle = 'rgba(142,202,230,0.10)';
  ctx.lineWidth = 1.5;
  for (let k = 0; k < 4; k++) {
    const ph = (cldHowtoClock * 0.25 + k * 0.25) % 1;
    ctx.globalAlpha = 1 - ph;
    ctx.beginPath();
    ctx.arc(cx, cy, R + 6 + ph * 46, 0, CLD_TAU);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.beginPath(); ctx.arc(cx, cy + 3, R, 0, CLD_TAU);
  ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fill();
  const ice = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R);
  ice.addColorStop(0, '#f2f9fc'); ice.addColorStop(1, '#cfe4ee');
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, CLD_TAU);
  ctx.fillStyle = ice; ctx.fill();

  cldHowtoPeng.forEach(p => {
    cldRenderPenguin(ctx, p.drowned ? 'bob' : 'idle', p.id, p.x, p.y, CLD_PENGUIN_R,
      { t: cldHowtoClock, ring: true, me: p.id === 0 });
  });
}

function cldHowtoDrawCast() {
  cldHowtoCast.forEach(tile => {
    cldHowtoFit(tile.el, tile.ctx);
    tile.ctx.clearRect(-CLD_W, -CLD_W, CLD_W * 3, CLD_W * 3);
    // plunge's t is 0..1 across the fall and fades alpha with it — cap the cycle
    // so a still frame is never caught mid-vanish.
    const t = tile.pose === 'plunge' ? ((cldHowtoClock * 0.45) % 1) * 0.7 : cldHowtoClock;
    cldRenderPenguin(tile.ctx, tile.pose, tile.colour, CLD_W / 2, CLD_H / 2, CLD_HOWTO_TILE_R,
      { t: t, ring: true });
  });
}

function cldHowtoStart() {
  const cv = document.getElementById('cld-howto-floe-canvas');
  cldHowtoCtx = cv && cv.getContext ? cv.getContext('2d') : null;
  cldHowtoBuildCast();
  if (!cldHowtoPeng.length) cldHowtoSeed();
  cldHowtoLastT = 0;
  if (!cldHowtoRaf) cldHowtoRaf = requestAnimationFrame(cldHowtoLoop);
}

function cldHowtoStop() {
  if (cldHowtoRaf) { cancelAnimationFrame(cldHowtoRaf); cldHowtoRaf = null; }
  cldHowtoLastT = 0;
}

function cldSyncSettingsUI() {
  const setGroup = (group, val) => {
    document.querySelectorAll('[data-group="' + group + '"]').forEach(p => {
      p.classList.remove('pill-active-cld');
      if (p.dataset.val === String(val)) p.classList.add('pill-active-cld');
    });
  };
  setGroup('cld-ice',  cldIceConditions);
  setGroup('cld-floe', cldFloeSize);
  setGroup('cld-fish', cldFishToWin);
  setGroup('cld-berg', cldIceBreaker);

  // Dynamic value lines. The pill carries the THEMATIC name and nothing else;
  // the concrete value lives here. The static description above still says what
  // the setting CONTROLS — this says what you have just PICKED.
  const setVal = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  setVal('cld-val-ice', {
    powder:   'Powder — grippy. A full pull carries you about a third of the floe.',
    slush:    'Slush — a full pull carries you about half the floe.',
    blackice: 'Black Ice — slippery. A full pull carries you most of the way across.',
  }[cldIceConditions] || '');
  // Berth count reads the live player count once known, and falls back to the
  // pre-selection band before the lobby has filled.
  const berths = cldPlayerCount || (cldFloeSize === 'roomy' ? 4 : cldFloeSize === 'cramped' ? 8 : 6);
  setVal('cld-val-floe', {
    roomy:    'Roomy — ' + berths + ' Berths, plenty of ice.',
    standard: 'Standard — ' + berths + ' Berths, comfortable for 6.',
    cramped:  'Cramped — ' + berths + ' Berths, elbows out.',
  }[cldFloeSize] || '');
  setVal('cld-val-fish', cldFishToWin === 1
    ? 'One Floe-Off and it’s done.'
    : 'First to ' + cldFishToWin + ' Fish takes it.');
  setVal('cld-val-berg', {
    0: 'No Bergs — the edge is the edge.',
    1: 'Each Berg saves you once, then shatters.',
    3: 'Each Berg takes three hits before it shatters.',
  }[cldIceBreaker] || '');

  const toggle = (id, on) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = (on ? 'game-toggle-on-cld' : 'game-toggle-off') + ' shrink-0';
    el.textContent = on ? 'ON' : 'OFF';
  };
  toggle('btn-cld-aimassist-toggle', cldAimAssist);
  toggle('btn-cld-peckoff-toggle',   cldPeckOff);
  toggle('btn-cld-sylly-toggle',     cldSyllyMode);

  // The two conditional How-to cards (§8) — shown only when the mode is on.
  const berg = document.getElementById('cld-howto-berg');
  if (berg) berg.style.display = cldIceBreaker ? 'flex' : 'none';
  const peck = document.getElementById('cld-howto-peckoff');
  if (peck) peck.style.display = cldPeckOff ? 'flex' : 'none';
}

// Plugin-PREFIXED, never bare: `applyExpansionOverrides` is LI5 legacy and a
// bare redeclaration here would silently clobber it (BLD Bug 16). Cold Shoulder
// has no word pool to substitute — this exists so a future skin pack's settings
// block has somewhere to land (§10).
function cldApplyExpansionOverrides() {
  if (typeof isSecretMode === 'undefined' || !isSecretMode) return;
  const o = window.activeExpansionOverrides;
  if (!o) return;
  if (typeof o.cldIceConditions === 'string') cldIceConditions = o.cldIceConditions;
  if (typeof o.cldFloeSize === 'string')      cldFloeSize      = o.cldFloeSize;
  if (typeof o.cldFishToWin === 'number')     cldFishToWin     = o.cldFishToWin;
}

// ═══════════════════════════════════════════════════════════════════════════
// ── STAGE 5 OF 6 — the multiplayer layer (spec §11) ────────────────────────
//
// Cold Shoulder is MDLM-only. The host runs the ONE true simulation and
// broadcasts sampled keyframes plus a discrete event list; every device — the
// host included — replays that broadcast. No client ever simulates, so desync
// is structurally impossible rather than merely unlikely.
//
// Exactly ONE client→host packet exists in the whole game, and it is PRIVATE:
// CLD_COMMIT. Every device in a room can read the public /events feed, and in
// a game whose entire tension is blind commit, a rival who reads an aim before
// resolution wins every Slide silently — with nothing on screen to reveal it.
//
// Deviation from the §11 packet table, deliberate: there is no CLD_FLOEOFF_END
// and no CLD_GAME_OVER. Neither has a moment of its own — the Fish award and
// the match-over decision both happen INSIDE cldResolveSlide(), so both travel
// on CLD_SLIDE_RESOLVE with the timeline that produced them. That is the same
// reasoning §11 already gives for keeping the surfacings, the Thaw step and the
// thaw-drops in one packet: one authoritative order, no cross-packet race.
// ═══════════════════════════════════════════════════════════════════════════

// ── Wire normalisation ─────────────────────────────────────────────────────
// Firebase RTDB stores no `null`, no `{}` and no `[]` — a key holding any of
// them is DELETED and the reader gets `undefined`. An all-null array vanishes
// whole; a half-dense one comes back as an OBJECT keyed by index. `0` and
// `false` are legitimate stored values and always survive: only emptiness is
// erased.
//
// Cold Shoulder broadcasts reset values on purpose (the accumulator rule), and
// its reset values are exactly the erasable ones — `events: []` on a
// collision-free Slide, `aftermath: []` on a Slide with no surfacings,
// `bergs: []` with Ice Breaker off, `berth: null` while Standing, `aims: []`
// from a Drowned player. NEVER assign a raw `p.x` collection field.
function cldWireArr(v, n, fill) {
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const x = v ? v[i] : undefined;
    out[i] = (x === undefined || x === null) ? fill : x;
  }
  return out;
}
// Length-unknown lists (samples, events, aftermath, the roster). Handles the
// object-keyed shape a sparse array comes back as.
function cldWireList(v) {
  if (Array.isArray(v)) return v.filter(x => x !== undefined && x !== null);
  if (v && typeof v === 'object') return Object.keys(v).sort((a, b) => a - b).map(k => v[k]);
  return [];
}
// `berth: 0` and `winnerIdx: 0` are both real values, so a `|| fallback` here
// would quietly rewrite Berth 0 and player 0 — hence a typeof test.
function cldWireNum(v, fill) { return typeof v === 'number' ? v : fill; }

function cldWirePenguins(v) {
  return cldWireList(v).map(p => ({
    id:       String(p.id),
    ownerIdx: cldWireNum(p.ownerIdx, 0),
    x:        cldWireNum(p.x, 0),
    y:        cldWireNum(p.y, 0),
    drowned:  !!p.drowned,
    berth:    cldWireNum(p.berth, null),   // null while Standing — erased in flight
    slot:     cldWireNum(p.slot,  null),
  }));
}
function cldWireBergs(v) {
  return cldWireList(v).map(b => ({
    id:    String(b.id),
    x:     cldWireNum(b.x, 0),
    y:     cldWireNum(b.y, 0),
    r:     cldWireNum(b.r, CLD_BERG_R),
    hits:  cldWireNum(b.hits, 0),
    angle: cldWireNum(b.angle, 0),
  }));
}
function cldWireStats(v, n) {
  return cldWireArr(v, n, null).map(s => ({
    slidesStood: s ? cldWireNum(s.slidesStood, 0) : 0,
    plunges:     s ? cldWireNum(s.plunges, 0)     : 0,
  }));
}
// A client's commit, rebuilt host-side. `aims: []` (a Drowned player committing
// a Dive and nothing else) and `snowball: null` are both erased in flight; a
// zero-power HOLD aim survives, because its penguinId keeps the object non-empty.
function cldWireCommit(c) {
  c = c || {};
  return {
    aims: cldWireList(c.aims)
      .filter(a => a && a.penguinId !== undefined && a.penguinId !== null)
      .map(a => ({
        penguinId: String(a.penguinId),
        dx:    cldWireNum(a.dx, 0),
        dy:    cldWireNum(a.dy, 0),
        power: cldWireNum(a.power, 0),
      })),
    dive: cldWireNum(c.dive, 0),
    snowball: (c.snowball && typeof c.snowball === 'object')
      ? { x: cldWireNum(c.snowball.x, 0), y: cldWireNum(c.snowball.y, 0) }
      : null,
  };
}

// ── Seat plumbing ──────────────────────────────────────────────────────────
// mpPlayerSlots is a bare top-level `let` in engine-multiplayer.js, NOT on
// window — reading it through window. returns undefined silently (BLD Bug 8).
function cldHostUid() {
  return (typeof mpPlayerSlots !== 'undefined' && mpPlayerSlots && mpPlayerSlots[0])
    ? mpPlayerSlots[0].uid : null;
}
function cldSenderIdx(originId) {
  if (typeof mpPlayerSlots === 'undefined' || !mpPlayerSlots) return -1;
  return mpPlayerSlots.findIndex(s => s && s.uid === originId);
}

function cldShowClientStandby() {
  // Delegates, so the standby copy lives in exactly one place. The intro's
  // auto-advance is armed in 'intro' mode ONLY, so a client parks here until the
  // host's CLD_FLOEOFF_START moves it.
  cldShowFloeOffIntro('standby');
}

// ── Payload builders ───────────────────────────────────────────────────────
// EVERY accumulator resets IN this payload, not just locally. The host resets
// when it builds the Floe-Off; a client never does, and would carry the previous
// Floe-Off's Fish, stats and rim forward until a field overwrote them.
function cldFloeOffStartPayload() {
  return {
    action:      'CLD_FLOEOFF_START',
    floeOffNo:   cldFloeOffNo,
    slideNo:     cldSlideNo,        // 0 — an accumulator, sent at its reset value
    radius:      cldFloeRadius,
    berthCount:  cldBerthCount,
    flavourIdx:  cldIntroIdx,       // host-picked, so players sitting together read one line
    floeSize:    cldFloeSize,       // the match-start pre-selection may have moved it
    playerNames: cldPlayerNames.slice(),
    penguins:    cldPenguins.map(p => ({ id: p.id, ownerIdx: p.ownerIdx, x: p.x, y: p.y,
                                         drowned: p.drowned, berth: p.berth, slot: p.slot })),
    bergs:       cldBergs.map(b => ({ id: b.id, x: b.x, y: b.y, r: b.r,
                                      hits: b.hits, angle: b.angle })),
    fish:        cldFish.slice(),
    stats:       cldMatchStats.map(s => ({ slidesStood: s.slidesStood, plunges: s.plunges })),
  };
}

// The Slide, its whole aftermath, and the rim it left behind — one packet.
//
// NOTHING derived from cldCommits appears here. cldCommits is host-local and is
// never broadcast at all: not the aims, not the Snowball targets, and not the
// Dive directions (a Dive's `dir` is a committed intention even though the moved
// body is visible in frame 0 — its resolved position travels in `penguins`
// instead). The timeline carries MOTION, never intentions.
function cldTimelinePayload(tl) {
  return {
    action:      'CLD_SLIDE_RESOLVE',
    slideNo:     tl.slideNo,
    samples:     tl.samples,
    events:      tl.events,          // [] on a collision-free Slide — erased in flight
    aftermath:   tl.aftermath,       // [] on a Slide with no surfacings and no Thaw
    durationMs:  tl.durationMs,
    radius:      tl.radius,
    washout:     tl.washout,
    floeOffOver: tl.floeOffOver,
    winnerIdx:   tl.winnerIdx,
    matchOver:   tl.matchOver,
    // The post-Slide state. A client never simulates, so the resolved rim — who
    // Drowned, which Berth they took, which Bergs survived — travels WITH the
    // timeline rather than being inferred from it.
    penguins: cldPenguins.map(p => ({ id: p.id, ownerIdx: p.ownerIdx, x: p.x, y: p.y,
                                      drowned: p.drowned, berth: p.berth, slot: p.slot })),
    bergs:    cldBergs.map(b => ({ id: b.id, x: b.x, y: b.y, r: b.r,
                                   hits: b.hits, angle: b.angle })),
    fish:     cldFish.slice(),
    stats:    cldMatchStats.map(s => ({ slidesStood: s.slidesStood, plunges: s.plunges })),
  };
}

// The inverse. The host and every client build their playback timeline through
// THIS function, from the same payload object (§16 Q5) — so a payload field that
// could not survive a real room breaks the host first, on a device somebody is
// actually holding, instead of only on the ones nobody is watching.
function cldTimelineFromPayload(p) {
  const n = cldPlayerCount;
  return {
    slideNo:     cldWireNum(p.slideNo, cldSlideNo + 1),
    samples:     cldWireList(p.samples),
    events:      cldWireList(p.events),
    aftermath:   cldWireList(p.aftermath),
    durationMs:  cldWireNum(p.durationMs, 0),
    radius:      cldWireNum(p.radius, cldFloeRadius),
    washout:     !!p.washout,
    floeOffOver: !!p.floeOffOver,
    winnerIdx:   cldWireNum(p.winnerIdx, -1),
    matchOver:   !!p.matchOver,
    post: {
      penguins: cldWirePenguins(p.penguins),
      bergs:    cldWireBergs(p.bergs),
      radius:   cldWireNum(p.radius, cldFloeRadius),
      fish:     cldWireArr(p.fish, n, 0),      // all-zero at Floe-Off 1
      stats:    cldWireStats(p.stats, n),      // all-zero at match start
    },
  };
}

// Applied at the END of playback on EVERY device. On the host it is a no-op by
// value — which is precisely the property that proves the payload is complete.
function cldApplyPost(post) {
  if (!post) return;
  cldPenguins   = post.penguins;
  cldBergs      = post.bergs;
  cldFloeRadius = post.radius;
  cldFish       = post.fish;
  cldMatchStats = post.stats;
}

// ── Host authority ─────────────────────────────────────────────────────────
// The ONLY place a commit is recorded. Three layers guard a duplicate (the local
// cldCommitted flag, the .btn-mp-action grey-out, and this) — but mpSendPrivate
// bypasses mpSendEnvelope's sync-lock backstop entirely, so a double-tap really
// does put two packets on the wire and THIS is the only authority.
//
// REJECT, never overwrite: overwriting turns a duplicate packet from a flaky
// connection into an accidental take-back, which is exactly the finality the
// brief traded the re-open path for (Decision 9).
function cldApplyCommit(playerIdx, commit, slideNo) {
  if (window.syllyMultiplayerMode === 'client') return false;
  if (!(playerIdx >= 0 && playerIdx < cldPlayerCount)) return false;   // unknown sender → -1
  // Stale tag: an in-flight commit from a Slide that has already resolved must
  // not land in the fresh array as a choice its player never made for THIS Slide
  // (the PKO BUG-01 class).
  if (slideNo !== undefined && slideNo !== null && slideNo !== cldSlideNo) return false;
  if (cldCommits[playerIdx] !== null) return false;
  cldCommits[playerIdx] = commit;
  return true;
}

// A COUNT, never a name. The same rule holds on a single device so the two paths
// cannot diverge — there is no name in this packet to print.
function cldBroadcastTally() {
  if (window.syllyMultiplayerMode !== 'host') return;
  mpSendEnvelope({ type: 'SYNC', payload: {
    action:  'CLD_SLIDE_TALLY',
    slideNo: cldSlideNo,
    locked:  cldCommits.filter(c => c !== null).length,
    total:   cldPlayerCount,
  } });
}

// ── Envelope routing ───────────────────────────────────────────────────────
function cldHandleEnvelope(env) {
  const p = (env && env.payload) || {};

  if (env.type === 'ACTION') {
    // The single client→host packet in the game, and it arrives on the PRIVATE
    // channel. mpStartPrivateListener() is started by the engine in both
    // mpHostCreateRoom() and mpClientJoinRoom(); the loopback harness asserts
    // that a client never writes the private channel at all.
    if (window.syllyMultiplayerMode !== 'host') return;
    if (p.action === 'CLD_COMMIT') {
      if (!cldApplyCommit(cldSenderIdx(env.originId), cldWireCommit(p.commit), p.slideNo)) return;
      cldBroadcastTally();
      cldSyncFloeUI();
      // Plain .every() — a gate reading a per-seat array must be checked in the
      // mode where that array is EMPTY, because [].every() is true (CJAR BUG-05).
      if (cldPlayerCount > 0 && cldCommits.every(c => c !== null)) {
        cldHostResolveSlide();
      }
    }
    return;
  }

  if (env.type !== 'SYNC') return;
  // The host is the author of every SYNC below. mpStartEventListener already
  // drops originId === syllyDeviceUid, so this never fires on the host in a real
  // room; the guard is what stops a replayed or mis-routed packet rebuilding the
  // authoritative floe out from under the simulation that produced it.
  if (window.syllyMultiplayerMode === 'host') return;

  switch (p.action) {
    case 'CLD_FLOEOFF_START': {
      cldPlayerNames = cldWireList(p.playerNames).map(String);
      if (!cldPlayerNames.length && typeof mpPlayerSlots !== 'undefined' && mpPlayerSlots) {
        cldPlayerNames = mpPlayerSlots.map(s => s.nickname);
      }
      cldPlayerCount = cldPlayerNames.length;
      cldBerthCount  = cldWireNum(p.berthCount, cldPlayerCount);
      cldFloeOffNo   = cldWireNum(p.floeOffNo, 1);
      cldSlideNo     = cldWireNum(p.slideNo, 0);
      cldFloeRadius  = cldWireNum(p.radius, CLD_FLOE_SIZE[cldFloeSize]);
      if (typeof p.floeSize === 'string') cldFloeSize = p.floeSize;
      cldPenguins    = cldWirePenguins(p.penguins);
      cldBergs       = cldWireBergs(p.bergs);
      cldFish        = cldWireArr(p.fish, cldPlayerCount, 0);
      cldMatchStats  = cldWireStats(p.stats, cldPlayerCount);
      cldIntroIdx    = cldWireNum(p.flavourIdx, 0);
      // Device-local accumulators the wire never carries — a Resurface clears the
      // locked power, the armed aims and the commit flag on every device.
      cldCommits    = new Array(cldPlayerCount).fill(null);
      cldTimeline   = null;
      cldPowerLock  = null;
      cldCommitted  = false;
      cldMyAims     = [];
      cldMyDive     = 0;
      cldMySnowball = null;
      cldShowFloeOffIntro('intro');
      break;
    }

    case 'CLD_SLIDE_TALLY': {
      if (p.slideNo !== undefined && p.slideNo !== null && p.slideNo !== cldSlideNo) break;
      const total  = cldWireNum(p.total, cldPlayerCount);
      const locked = Math.max(0, Math.min(cldWireNum(p.locked, 0), total));
      // A client's cldCommits is a COUNT PROXY, never real commits — the host
      // broadcasts no aim, so there is nothing here to hold. Filling `locked`
      // placeholder slots is what lets the shared tally renderer run unchanged on
      // both devices.
      cldCommits = new Array(total).fill(null);
      for (let i = 0; i < locked; i++) cldCommits[i] = true;
      cldSyncFloeUI();
      break;
    }

    case 'CLD_SLIDE_RESOLVE': {
      if (typeof mpUnlockSync === 'function') mpUnlockSync();
      // A device still sitting on the Floe-Off intro has a canvas that was never
      // sized; playback there would advance against nothing.
      if (cldIntroTimer) { clearTimeout(cldIntroTimer); cldIntroTimer = null; cldShowFloe(); }
      cldBeginPlayback(cldTimelineFromPayload(p));
      break;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Teardown — called from resetToLobby(). Every handle here is ALSO cleared in
// the quit-confirm path (via resetToLobby) and on every early phase transition.
// ═══════════════════════════════════════════════════════════════════════════
function cldResetState() {
  // All four timers. A requestAnimationFrame IS a timer (§ Timer Lifecycle) and
  // a live loop repaints against the next screen's state.
  if (cldRafHandle)   { cancelAnimationFrame(cldRafHandle); cldRafHandle = null; }
  cldHowtoStop();                       // The Floe's reference loop — a RAF is a timer
  cldHowtoPeng = []; cldHowtoTL = null; cldHowtoPlayT = 0;
  if (cldIntroTimer)  { clearTimeout(cldIntroTimer);  cldIntroTimer  = null; }
  if (cldResultTimer) { clearTimeout(cldResultTimer); cldResultTimer = null; }
  if (cldFloatTimer)  { clearTimeout(cldFloatTimer);  cldFloatTimer  = null; }

  cldPenguins = []; cldBergs = []; cldCommits = []; cldTimeline = null;
  cldFish = []; cldMatchStats = []; cldFloeOffNo = 0; cldSlideNo = 0;
  cldMyAims = []; cldMySnowball = null; cldMyDive = 0;
  cldCommitted = false; cldPowerLock = null;
  cldPhase = 'aiming'; cldIntroMode = 'intro';
  cldFloeRadius = 0; cldPlaybackT = 0; cldLastFrameT = 0; cldClock = 0;
  cldDragging = false; cldPtrId = null; cldDragPenguin = null;
  cldDragFrom = null; cldDragTo = null;
  cldPlaybackEventPtr = 0; cldAftermathPtr = 0;

  // A mid-flight quit hides the screen with display:none, so nothing else clears
  // the float layer and a bark would still be sitting there on the next entry.
  const layer = document.getElementById('cld-float-layer');
  if (layer) layer.innerHTML = '';

  // cldSkinArt is deliberately NOT cleared — it is a decoded-asset cache (empty
  // for the whole of v1), not game state, and re-decoding on every lobby return
  // would be pure waste if a skin ever populates it.
}

// ═══════════════════════════════════════════════════════════════════════════
// Wiring
// ═══════════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };

  // Cold Shoulder's HTML sits AFTER the <script> block, so engine.js's parse-time
  // querySelectorAll never reached these — the speaker icon would be dead on
  // every screen. NT, FRT, SHP and FLW all needed this same fix.
  document.querySelectorAll('[id^="screen-cld-"] .btn-open-sound')
    .forEach(btn => btn.addEventListener('click', openSoundOverlay));

  on('btn-cld', () => { playLaunch(); activeGameId = 'cld'; showScreen('screen-cld-menu'); });

  // Dual-context CTA (§2). Pre-lobby this opens the mode screen; post-lobby
  // onPassThePhone has already shown this menu with the roster ready, so it must
  // start the match instead of re-hosting.
  on('btn-cld-menu-play', () => {
    playLaunch();
    if (window.syllyMultiplayerMode !== 'single') {
      cldStartMatchLocal((typeof mpPlayerSlots !== 'undefined' && mpPlayerSlots)
        ? mpPlayerSlots.map(p => p.nickname) : cldPlayerNames);
    } else {
      mpShowModeScreen('cld');
    }
  });
  on('btn-cld-menu-back', () => { playExit(); resetToLobby(); });

  // Mid-game ✕ → quit overlay. In a lobby session the confirm goes to
  // resetToLobby(), NOT the game menu — one device leaving dissolves the session
  // for everyone (Mid-Game Quit Contract). Stage 5 adds mpNotifyPlayerLeft().
  document.querySelectorAll('.btn-cld-quit-open').forEach(btn =>
    btn.addEventListener('click', () => {
      playDone();
      const ov = document.getElementById('cld-quit-overlay');
      if (ov) ov.style.display = 'flex';
    }));
  on('btn-cld-quit-cancel', () => {
    playDone();
    const ov = document.getElementById('cld-quit-overlay');
    if (ov) ov.style.display = 'none';
  });
  on('btn-cld-quit-confirm', () => {
    playExit();
    const ov = document.getElementById('cld-quit-overlay');
    if (ov) ov.style.display = 'none';
    // The RAF loop is cancelled here as well as in resetToLobby() — the quit
    // handler is one of the three places § Timer Lifecycle requires.
    cldStopLoop();
    if (window.syllyMultiplayerMode !== 'single') {
      if (typeof mpNotifyPlayerLeft === 'function') mpNotifyPlayerLeft();
      resetToLobby();
      return;
    }
    resetToLobby();
  });

  // Post-game ✕ and Waddle Off both go straight out — the game is over, there is
  // no state left to preserve.
  on('btn-cld-go-exit',  () => { playExit(); resetToLobby(); });
  on('btn-cld-go-leave', () => { playExit(); resetToLobby(); });

  // Play again ALWAYS goes through the confirmation modal — never restarts directly.
  on('btn-cld-go-new', () => {
    playDone();
    const btn = document.getElementById('btn-cld-new-confirm');
    if (btn) btn.textContent = window.syllyMultiplayerMode === 'client' ? 'Leave Session'
                             : window.syllyMultiplayerMode === 'host'   ? 'Restart in Lobby 🔄'
                             : 'March On!';
    const ov = document.getElementById('cld-new-game-overlay');
    if (ov) ov.style.display = 'flex';
  });
  on('btn-cld-new-cancel', () => {
    playDone();
    const ov = document.getElementById('cld-new-game-overlay');
    if (ov) ov.style.display = 'none';
  });
  on('btn-cld-new-confirm', () => {
    playLaunch();
    const ov = document.getElementById('cld-new-game-overlay');
    if (ov) ov.style.display = 'none';
    if (window.syllyMultiplayerMode !== 'single') { mpReturnToLobby(); return; }
    cldStartMatchLocal(cldPlayerNames);
  });

  on('btn-cld-next-floeoff', () => {
    // Host-only. An ABSENT broadcast branch does not stop a client running this
    // locally and diverging until the next SYNC — the guard is what stops it.
    if (window.syllyMultiplayerMode === 'client') return;
    playLaunch();
    cldStartFloeOffLocal();
  });

  // How to Play. The header [?] is gated by cldPhase — it does not open during
  // resolving or washout (brief §15).
  on('btn-cld-menu-how-to', () => { playDone(); cldOpenHowTo(); });
  on('btn-cld-scoreboard-how-to', () => { playDone(); cldOpenHowTo(); });
  on('btn-cld-how-to', () => {
    if (cldPhase !== 'aiming' && cldPhase !== 'waiting') return;
    playDone();
    cldOpenHowTo();
  });
  const cldCloseHowTo = () => {
    playDone();
    cldHowtoStop();
    const ov = document.getElementById('cld-how-to-overlay');
    if (ov) ov.style.display = 'none';
  };
  on('btn-cld-howto-close', cldCloseHowTo);
  on('btn-cld-howto-close-floe', cldCloseHowTo);

  document.querySelectorAll('[data-cld-howto-tab]').forEach(b => {
    b.addEventListener('click', () => { playPillClick(); cldSetHowtoTab(b.dataset.cldHowtoTab); });
  });
  on('btn-cld-howto-shove',     () => { playPillClick(); cldHowtoShove(); });
  on('btn-cld-howto-resurface', () => { playPillClick(); cldHowtoSeed(); });

  on('btn-cld-menu-settings', () => { playDone(); cldSyncSettingsUI(); cldOpenOverlay('cld-settings-overlay'); });
  on('btn-cld-settings-close', () => {
    playDone();
    const ov = document.getElementById('cld-settings-overlay');
    if (ov) ov.style.display = 'none';
  });

  document.querySelectorAll('[data-group^="cld-"]').forEach(pill => {
    pill.addEventListener('click', () => {
      // In MDLM every setting is host-owned; a client's overlay is read-only.
      // They may still OPEN it to read the rules.
      if (window.syllyMultiplayerMode === 'client') return;
      playPillClick();
      const group = pill.dataset.group, val = pill.dataset.val;
      // Only pill-active-cld comes off. The .pill base class carries every
      // structural style and must NEVER be removed.
      document.querySelectorAll('[data-group="' + group + '"]')
        .forEach(p => p.classList.remove('pill-active-cld'));
      pill.classList.add('pill-active-cld');
      if (group === 'cld-ice')  cldIceConditions = val;
      if (group === 'cld-floe') { cldFloeSize = val; cldFloeSizeTouched = true; }
      if (group === 'cld-fish') cldFishToWin = parseInt(val, 10);
      if (group === 'cld-berg') cldIceBreaker = parseInt(val, 10);
      cldSyncSettingsUI();   // repaint the value line under the group that changed
    });
  });

  on('btn-cld-aimassist-toggle', () => {
    if (window.syllyMultiplayerMode === 'client') return;
    playPillClick();
    cldAimAssist = !cldAimAssist;
    cldSyncSettingsUI();
  });
  on('btn-cld-peckoff-toggle', () => {
    if (window.syllyMultiplayerMode === 'client') return;
    playPillClick();
    // Peck Off and The Thaw are COMPOSABLE, not exclusive — noted because the
    // FRT naming parallel (Pear-Off IS exclusive with its Sylly Mode) invites
    // the opposite assumption. No ntSetCardDisabled-style gating in this game.
    cldPeckOff = !cldPeckOff;
    cldSyncSettingsUI();
  });
  on('btn-cld-sylly-toggle', () => {
    if (window.syllyMultiplayerMode === 'client') return;
    cldSyllyMode = !cldSyllyMode;
    if (cldSyllyMode) playSyllyOn(); else playSyllyOff();
    cldSyncSettingsUI();
  });

  // ── The Floe: pointer + control wiring ───────────────────────────────────
  const stage = document.getElementById('cld-stage');
  if (stage) {
    stage.addEventListener('pointerdown', e => { cldPointerDown(e); });
    stage.addEventListener('pointermove', cldPointerMove);
    stage.addEventListener('pointerup', cldPointerUp);
    stage.addEventListener('pointercancel', cldPointerUp);
    stage.addEventListener('pointerleave', cldPointerUp);
  }

  on('btn-cld-power', () => {
    if (cldPhase !== 'aiming') return;
    playPillClick();
    if (cldPowerLock !== null) {
      cldPowerLock = null;                       // tapping a locked bar releases it
    } else {
      const aim = cldArmedAimFor(cldFirstUnarmedOrLast());
      if (!aim || aim.power < CLD_MIN_POWER) return;   // nothing worth locking yet
      cldPowerLock = aim.power;
      cldSfx('powerLock');
    }
    cldSyncFloeUI();
  });

  document.querySelectorAll('[data-cld-dive]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (cldPhase !== 'aiming') return;
      const dir = parseInt(btn.dataset.cldDive, 10);
      const mine = cldMyPenguins().find(p => p.drowned);
      // A direction with no free position is already non-interactive via
      // .cld-dive-unavailable; this is the belt to that brace.
      if (dir !== 0 && (!mine || !cldDiveAvailable(mine, dir))) return;
      playPillClick();
      cldMyDive = dir;
      if (dir !== 0) cldSfx('dive');
      cldSyncFloeUI();
    });
  });

  on('btn-cld-commit', () => { cldCommit(); });

  // Guarded on the floe screen being visible, so a resize while another game is on
  // screen never touches this canvas. Registered INSIDE DOMContentLoaded, not at
  // top level: tools/verify-cld-*.js load this whole file into a bare vm sandbox
  // that has no window.addEventListener, and a parse-time call there throws before
  // a single assertion runs. The DOMContentLoaded callback simply never fires in
  // the sandbox, which is exactly the property that makes it safe.
  window.addEventListener('resize', () => {
    const el = document.getElementById('screen-cld-floe');
    if (el && el.style.display !== 'none') cldResize();
  });
});
