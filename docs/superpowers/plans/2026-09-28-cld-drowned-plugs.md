# Cold Shoulder — Drowned Plugs, Throw-or-Dive, Ice Bath — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Cold Shoulder's fixed rim-slice Berths with Drowned penguins that plug the gap they fell through (instantly, mid-Slide), absorb one hit, then get knocked back; give the knocked-back a Throw-or-Dive choice; turn a Washout into an Ice Bath sudden-death floe.

**Architecture:** One generic option in the pure physics module (`seatOnPlunge` + breakable anchors) lets the game seat a plunging body mid-sim without `physics.js` learning any rule. All rule logic lives in `js/games/cld.js`'s headless rules layer (above its "STAGE 4" banner) behind one geometric primitive, `cldSeatSpotFrom(anchors, angle)`, which every arrival path uses. Packets change shape, so `MP_PROTOCOL_VERSION` bumps to `'v243'`.

**Tech Stack:** Vanilla JS (ES6, no modules, all globals), Node `vm` harnesses in `tools/`, canvas 2D render seam, Firebase RTDB over `mpSendEnvelope` / `mpSendPrivate`.

**Spec:** `docs/superpowers/specs/2026-09-28-cld-drowned-plugs-design.md` — read it first; this plan argues from it.

## Global Constraints

- `index.html` is generated. Edit `src/screens/cld.html`, then `node tools/build-index.js` and `node tools/verify-build-fresh.js`.
- `js/lib/physics.js` stays **pure and total**: no DOM, no `window` reads inside `simulate`, no `Date.now()`, no bare `Math.random()`. The new option must be absent-safe: with no `seatOnPlunge`, output is byte-identical to today.
- The rules layer of `cld.js` (everything above the `STAGE 4 OF 6` banner) must run in a bare `vm` with `getElementById: () => null` — no DOM access at parse time or in rules functions.
- Firebase erases `null`, `{}` and `[]`. Every wire read goes through a `cldWire*` normaliser; never assign a raw payload collection.
- `MP_PROTOCOL_VERSION` → `'v243'` (`js/engine.js`); `CACHE_NAME` → `'sylly-games-v243'` (`sw.js`). No new Firebase node, no new writer — `CLD_COMMIT`'s path is already covered by spec §2.7's `private` rule.
- UI: pill toggle rule (never remove `.pill`, only `pill-active-cld`); no emoji on action buttons; amber `text-amber-600 text-xs` for an *unavailable* reason line; Australian English.
- Timers: nothing new here starts a timer; if one is added it is cleared in quit-confirm, `resetToLobby()` (`cldResetState`) and every early phase exit.
- **Commits:** the owner commits only on request. Each task ends with a commit step — run it only if the owner has authorised commits for this build; otherwise leave the tree staged and say so.
- Harness rule (CLAUDE.md): assertions for rules, packets, state and appliers only. The Throw · Dive UI and knocked-back drawing get a `visual-check` pass, not assertions.

## Review Focus

1. **Switching Dive → Throw (or back) before Lock It In** — the commit must carry only the mode on screen at commit time; a stale `cldMyDive` or `cldMySnowball` must never ride along. Test: Task 7 Step 1.
2. **A Washout inside an Ice Bath, repeatedly** — each bath's roster is non-empty, has ≥ 2 owners, and never grows; the loop terminates. Test: Task 5 Step 1.
3. **The Thaw to its floor with several plugs** — plugs never overlap each other or a chunk after any number of shrinks. Test: Task 4 Step 1.
4. **`dive: null`, `plug: false`, `angle` of a Standing penguin over the wire** — erased values rebuild to `null` / `false` / `null`, never `undefined`. Test: Task 6 Step 1.
5. **A Dive into a spot a sliding penguin reaches the same Slide** — the Dive seats before the sim, so that gap is sealed for the Slide. Test: Task 3 Step 1 (seal) + Task 4 Step 1 (dive-before-sim).

---

## File map

| File | Responsibility in this build |
|---|---|
| `js/lib/physics.js` | `params.seatOnPlunge`; `damageAnchor` for any immovable with `hits`; `seat` / `knockback` events; `seated` / `knocked` in `final`. |
| `js/games/cld.js` (rules layer) | Delete the rim-slice Berth system. Add ring geometry (`cldRingR`, `cldAngleOf`, `cldArcDist`, `cldSeatSpotFrom`, `cldSeatSpot`), Drowned placement (`cldPlaceDrowned`, `cldSurfaceAt`, `cldKnockBack`, `cldDisplace`), `cldResolveDives`, the new `cldResolveSlide` / `cldThawStep` / `cldProjectBergsToRim`, the Ice Bath (`cldBathRadius`, `cldStartIceBath`). |
| `js/games/cld.js` (UI + MP layer) | Wire normalisers, payloads, `CLD_FLOEOFF_START` bath branch, playback by `bodyIds`, Throw · Dive switch, tap-to-dive, ghost + free-spot drawing, copy. |
| `src/screens/cld.html` | Dive row → Throw/Dive pills + reason line; How-to copy. |
| `css/styles.css` | Drop `.cld-dive-btn.cld-dive-unavailable`. |
| `js/engine.js`, `sw.js` | Version bumps. |
| `tools/verify-cld-physics.js` | The option's contract. |
| `tools/verify-cld-loop.js` | Rules: seat geometry, the seal, displacement, Dives, Thaw, Ice Bath. |
| `tools/verify-cld-loopback.js` | Wire + host↔2-client agreement. |
| `tools/mutate-cld.js`, `tools/simulate-cld-balance.js` | Mutants re-pointed; bots learn Throw-or-Dive; re-measure. |
| Docs | Task 9. |

---

### Task 1: Physics — `seatOnPlunge` and breakable anchors

**Files:**
- Modify: `js/lib/physics.js` (DEFAULTS; body map ~L88–113; `damageBerg` L144–152; rebound branch ~L267–283; boundary loop L292–305; `final` L337–346)
- Test: `tools/verify-cld-physics.js` (new section before `section('Determinism …')`)

**Interfaces:**
- Produces: `params.seatOnPlunge(x, y, vx, vy, anchors) → {x, y} | null`, `anchors: [{ id, kind, x, y, r }]` (active immovables only). Events `{ t, type: 'seat', id, x, y }` (emitted right after that body's `plunge`) and `{ t, type: 'knockback', id, x, y, by }`. `final[i].seated` / `final[i].knocked` (booleans, present only when true). Any immovable body with numeric `hits` is breakable; `kind: 'berg'` → `shatter`, any other kind → `knockback`.

- [ ] **Step 1: Write the failing tests** — append before the Determinism section in `tools/verify-cld-physics.js`:

```js
  // ═══════════════════════════════════════════════════════════════════════
  section('seatOnPlunge — a plunging body can be seated as a one-hit anchor (SW v243)');
  {
    const R = 130;
    const seatAt = { x: 180 + R - 16, y: 180 };
    const cfg = seat => ({
      world: W(R),
      bodies: [{ id: 'a', x: 180 + R - 20, y: 180, r: CLD_PENGUIN_R },
               { id: 'b', x: 180 + R - 110, y: 180, r: CLD_PENGUIN_R }],   // far enough back never to overlap the seat on arrival
      impulses: [{ bodyId: 'a', vx: 80, vy: 0 }, { bodyId: 'b', vx: 150, vy: 0 }],
      params: Object.assign(baseParams('slush'), seat ? { seatOnPlunge: seat } : {}),
      seed: 7,
    });
    const plain = Physics.simulate(cfg(null));
    const seen = [];
    const seated = Physics.simulate(cfg((x, y, vx, vy, anchors) => { seen.push(anchors.length); return seatAt; }));

    const ev = seated.events.map(e => e.type + ':' + (e.id || ''));
    ok('the plunge is still reported, then a seat event for the same body',
      ev.indexOf('plunge:a') >= 0 && ev.indexOf('seat:a') === ev.indexOf('plunge:a') + 1, ev.join(' '));
    const fa = seated.final.find(f => f.id === 'a');
    check('…the seated body rests exactly at the seat', [fa.x, fa.y, fa.seated === true], [seatAt.x, seatAt.y, true]);
    ok('…and the SECOND body rebounds off it instead of plunging',
      seated.events.some(e => e.type === 'rebound' && e.id === 'b' && e.offId === 'a') &&
      !seated.events.some(e => e.type === 'plunge' && e.id === 'b'));
    ok('…which knocks the seat back (one hit) and reports who did it',
      seated.events.some(e => e.type === 'knockback' && e.id === 'a' && e.by === 'b'));
    check('…so the seat is marked knocked in final', fa.knocked === true, true);
    check('the callback saw the live anchors (none here)', seen, [0]);

    const fb = plain.final.find(f => f.id === 'b');
    check('WITHOUT the option both bodies plunge, exactly as before', [plain.final.find(f => f.id === 'a').plunged, fb.plunged], [true, true]);
    ok('…and no seat/knockback events exist', !plain.events.some(e => e.type === 'seat' || e.type === 'knockback'));
    check('a null return from the callback is a plain plunge',
      JSON.stringify(Physics.simulate(cfg(() => null)).events), JSON.stringify(plain.events));

    const again = Physics.simulate(cfg((x, y) => seatAt));
    check('seating is deterministic (byte-identical rerun)', JSON.stringify(again), JSON.stringify(Physics.simulate(cfg((x, y) => seatAt))));

    // A drowned anchor with no hits (the How-to practice sim's shape) is still unbreakable.
    const legacy = Physics.simulate({
      world: W(R),
      bodies: [{ id: 'd', x: 180 + 100, y: 180, r: CLD_PENGUIN_R, kind: 'drowned' },
               { id: 'p', x: 180 + 40, y: 180, r: CLD_PENGUIN_R }],
      impulses: [{ bodyId: 'p', vx: 150, vy: 0 }], params: baseParams('slush'), seed: 3 });
    ok('a drowned body without hits never knocks back', !legacy.events.some(e => e.type === 'knockback'));

    // A Snowball landing on a hits:1 drowned anchor does nothing to it (spec §3.2).
    const ball = Physics.simulate({
      world: W(R),
      bodies: [{ id: 'd', x: 250, y: 180, r: CLD_PENGUIN_R, kind: 'drowned', hits: 1 }],
      events: [{ t: 10, type: 'snowball', x: 250, y: 180, radius: CLD_SNOWBALL_R, force: 60, from: { x: 180, y: 180 } }],
      params: baseParams('slush'), seed: 4 });
    ok('a Snowball on a plug is a no-op', !ball.events.some(e => e.type === 'knockback'));
  }
```

- [ ] **Step 2: Run to verify it fails**

Run: `node tools/verify-cld-physics.js`
Expected: FAIL lines under "seatOnPlunge" (no `seat` event; body `b` plunges).

- [ ] **Step 3: Implement** in `js/lib/physics.js`:

(a) In `DEFAULTS`, add `seatOnPlunge: null,`.

(b) In the body map, add two fields after `shattered: false,`:
```js
        seated:    false,
        knocked:   false,
```

(c) Replace `damageBerg` with:
```js
    // Any immovable body carrying a numeric `hits` is BREAKABLE. What breaking
    // means is reported, never decided: a Berg shatters, anything else (a
    // seated Drowned) is knocked back. Both leave the sim for the rest of it.
    function damageAnchor(anchor, t, cause, byId) {
      anchor.hits -= 1;
      if (anchor.hits > 0) return;
      anchor.hits   = 0;
      anchor.active = false;
      if (anchor.kind === 'berg') {
        anchor.shattered = true;
        out.push({ t: t, type: 'shatter', id: anchor.id, x: anchor.x, y: anchor.y, cause: cause });
      } else {
        anchor.knocked = true;
        out.push({ t: t, type: 'knockback', id: anchor.id, x: anchor.x, y: anchor.y, by: byId });
      }
    }
```
In the Snowball branch change `damageBerg(hit, tStamp, 'snowball');` to `damageAnchor(hit, tStamp, 'snowball', null);` (the branch still only runs for `hit.kind === 'berg'` — a Snowball never breaks a Drowned).

In the rebound branch replace
```js
              if (anchor.kind === 'berg') {
```
with
```js
              if (anchor.hits !== null) {
```
and the call inside it with `damageAnchor(anchor, tStamp, 'collision', mover.id);`. Keep the existing comment block; change its first line to `// ONE rebound, ONE hit — for every breakable anchor, not only Bergs.`

(d) In the boundary loop, replace the body of the plunge (from `b.active  = false;` to the `out.push(... 'plunge' ...)`) with:
```js
        b.exitVx  = b.vx;
        b.exitVy  = b.vy;
        out.push({ t: tStamp, type: 'plunge', id: b.id, x: b.x, y: b.y, vx: b.vx, vy: b.vy });
        b.plunged = true;
        // Optional, generic: the caller may SEAT the body instead of losing it —
        // it becomes a one-hit immovable at the returned spot, still in the sim.
        // The callback must be pure; it sees only the live immovable bodies.
        const seat = p.seatOnPlunge ? p.seatOnPlunge(b.x, b.y, b.vx, b.vy, anchorsNow()) : null;
        if (seat) {
          b.x = seat.x; b.y = seat.y; b.vx = 0; b.vy = 0;
          b.invM = 0; b.kind = 'drowned'; b.rest = kindRestitution('drowned', p);
          b.hits = 1; b.seated = true;
          out.push({ t: tStamp, type: 'seat', id: b.id, x: b.x, y: b.y });
          continue;
        }
        b.active = false;
```
and add, next to `pushFrame`:
```js
    function anchorsNow() {
      const a = [];
      for (let j = 0; j < n; j++) {
        const q = bodies[j];
        if (q.active && q.invM === 0) a.push({ id: q.id, kind: q.kind, x: q.x, y: q.y, r: q.r });
      }
      return a;
    }
```

(e) In `final`, after the Berg line add:
```js
      if (b.seated)  f.seated  = true;
      if (b.knocked) f.knocked = true;
```

- [ ] **Step 4: Run to verify it passes**

Run: `node tools/verify-cld-physics.js`
Expected: `ALL CHECKS PASSED` (every pre-existing section too — the option is absent there).

- [ ] **Step 5: Commit** (if authorised)
```bash
git add js/lib/physics.js tools/verify-cld-physics.js
git commit -m "feat(physics): seatOnPlunge option and breakable anchors"
```

---

### Task 2: Ring geometry — `cldSeatSpotFrom` and the seal

**Files:**
- Modify: `js/games/cld.js` rules layer — after `cldProjectBergsToRim()` (~L388–412)
- Test: `tools/verify-cld-loop.js` — add to the BRIDGE `fn:` list and a new section after 'Slide resolution — inputs, Bergs and determinism'

**Interfaces:**
- Consumes: `cldBergInset()`, `cldNormAngle`, `cldRimPos`, `CLD_PENGUIN_R`, `cldBergs`, `cldPenguins` (from Task 3 on, penguins carry `plug`/`angle`).
- Produces:
  - `const CLD_CENTRE_GAP_DIAM = 2;` — an open interval narrower than this many penguin diameters seats at its centre (a raw gap < 3 diameters).
  - `const CLD_BACK_OFFSET = CLD_PENGUIN_R * 1.4;`
  - `cldRingR() → number` — the circle chunks and plugs sit on (`cldBergInset()`).
  - `cldAngleOf(x, y) → angle` in `[0, τ)`.
  - `cldArcDist(a, b) → radians` the short way round.
  - `cldSeatSpotFrom(anchors, angle) → { angle, x, y } | null` — pure; `anchors: [{ x, y, r }]`.
  - `cldRingAnchors(excludeId) → [{ id, x, y, r }]` — every chunk + every Plugged Drowned except `excludeId`.
  - `cldSeatSpot(angle, excludeId) → { angle, x, y } | null`.

- [ ] **Step 1: Write the failing tests** — add `cldRingR, cldAngleOf, cldArcDist, cldSeatSpotFrom, cldRingAnchors, cldSeatSpot,` to the loop harness BRIDGE `fn:` list, then add:

```js
  // ═══════════════════════════════════════════════════════════════════════
  section('Ring geometry — where a Drowned penguin seats (spec §3.1)');
  {
    setup({ players: 4, iceBreaker: 2, seed: 50 });
    const R = F.cldRingR();
    const P = C.CLD_PENGUIN_R;
    const touching = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) >= a.r + b.r - 1e-6;

    check('with no anchors the spot is exactly the asked angle',
      Math.round(F.cldSeatSpotFrom([], 1.0).angle * 1e6), 1e6);

    // Every seat F.cldSeatSpot returns overlaps nothing, across many angles.
    let clean = true;
    for (let k = 0; k < 72; k++) {
      const s = F.cldSeatSpot(k * TAU / 72, null);
      if (!s) continue;
      const me = { x: s.x, y: s.y, r: P };
      if (!F.cldRingAnchors(null).every(a => touching(me, a))) clean = false;
      if (Math.abs(Math.hypot(s.x - CX, s.y - CY) - R) > 1e-6) clean = false;
    }
    ok('every seat sits on the ring circle and overlaps no chunk', clean);

    // A slip gap: narrow → the seat is the gap's centre, whatever the asked angle.
    const gapAngles = G.bergs.map(b => b.angle).sort((a, b) => a - b);
    const chunkHalf = Math.asin(C.CLD_BERG_R / R);
    let centred = true, found = 0;
    gapAngles.forEach((a, i) => {
      const nx = i + 1 < gapAngles.length ? gapAngles[i + 1] : gapAngles[0] + TAU;
      const edgeGap = (nx - a - 2 * chunkHalf) * R;
      if (edgeGap < 2 * P) return;                     // a crack, not a gap
      found++;
      const mid = cldMid(a, nx);
      const s1 = F.cldSeatSpot(a + chunkHalf + 0.01, null);
      const s2 = F.cldSeatSpot(nx - chunkHalf - 0.01, null);
      if (!s1 || !s2 || F.cldArcDist(s1.angle, mid) > 1e-6 || F.cldArcDist(s2.angle, mid) > 1e-6) centred = false;
    });
    ok('the generated ring has slip gaps', found >= 2);
    ok('…and a seat anywhere in a slip gap lands at its centre', centred);
  }
  {
    section('The seal — a plugged slip gap cannot be passed (spec §3.1)');
    // Build the tightest honest case by hand: two chunks with an edge gap of the
    // WIDEST slip width the ring can generate, a plug at its centre, and a
    // penguin driven straight at every offset across the gap at full power.
    setup({ players: 3, iceBreaker: 3, seed: 51 });
    const R = F.cldRingR();
    const widest = 2 * C.CLD_PENGUIN_R * C.CLD_SLIP_GAP_WIDTH[1];
    const half = Math.asin(C.CLD_BERG_R / R);
    const a0 = 0, a1 = a0 + 2 * half + widest / R;
    const pos = a => ({ x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) });
    const mid = (a0 + a1) / 2;
    let sealed = true;
    for (let off = -1; off <= 1.0001; off += 0.125) {
      const aim = mid + off * (a1 - a0) / 2;
      const start = { x: CX + (R - 60) * Math.cos(aim), y: CY + (R - 60) * Math.sin(aim) };
      const res = sandbox.window.Physics.simulate({
        world: { cx: CX, cy: CY, radius: G.radius },
        bodies: [{ id: 'p', x: start.x, y: start.y, r: C.CLD_PENGUIN_R },
                 Object.assign({ id: 'g0', r: C.CLD_BERG_R, kind: 'berg', hits: 3 }, pos(a0)),
                 Object.assign({ id: 'g1', r: C.CLD_BERG_R, kind: 'berg', hits: 3 }, pos(a1)),
                 Object.assign({ id: 'd', r: C.CLD_PENGUIN_R, kind: 'drowned', hits: 1 }, pos(mid))],
        impulses: [{ bodyId: 'p', vx: Math.cos(aim) * C.CLD_V_MAX, vy: Math.sin(aim) * C.CLD_V_MAX }],
        params: F.cldSimParams(), seed: 9 });
      if (res.events.some(e => e.type === 'plunge' && e.id === 'p')) sealed = false;
    }
    ok('a centred plug seals the widest slip gap against a full-power shove at every offset', sealed);
  }
```
Add the helper once near the top of the harness helpers:
```js
function cldMid(a, b) { return a + ((b - a) / 2); }
```

- [ ] **Step 2: Run to verify it fails**

Run: `node tools/verify-cld-loop.js`
Expected: crash or FAIL — `cldRingR is not defined`.

- [ ] **Step 3: Implement** — add after `cldProjectBergsToRim()`:

```js
// ═══════════════════════════════════════════════════════════════════════════
// Ring geometry (SW v243) — where a Drowned penguin can sit. A penguin can only
// go in through a GAP, and it plugs the gap it went through. Plugs and chunks
// share one circle (cldRingR): a plug out on the rim can be squeezed past in
// the widest slip gaps, a plug on the ring circle, centred, cannot (the seal
// harness proves it for every generated width). spec §3.1.
// ═══════════════════════════════════════════════════════════════════════════
const CLD_CENTRE_GAP_DIAM = 2;                  // open interval < this × penguin diameter → seat at its centre
const CLD_BACK_OFFSET     = CLD_PENGUIN_R * 1.4; // a Knocked-back penguin bobs this far outside the rim

function cldRingR() { return cldBergInset(); }
function cldAngleOf(x, y) { return cldNormAngle(Math.atan2(y - CLD_H / 2, x - CLD_W / 2)); }
function cldArcDist(a, b) {
  const d = Math.abs(cldNormAngle(a) - cldNormAngle(b));
  return Math.min(d, CLD_TAU - d);
}

// PURE. `anchors` are [{ x, y, r }] — chunks and Plugged Drowned, live. Returns
// the free seat nearest `angle`, or null when the ring has no room anywhere.
function cldSeatSpotFrom(anchors, angle) {
  const R = cldRingR();
  const a = cldNormAngle(angle);
  const at = t => { const pos = cldRimPos(t, R); return { angle: cldNormAngle(t), x: pos.x, y: pos.y }; };
  if (!anchors.length) return at(a);
  // Each anchor forbids a centre-angle interval: the chord at which a penguin
  // would touch it exactly (chord-exact, so touching is allowed, overlap not).
  const bans = anchors.map(q => {
    const c = cldAngleOf(q.x, q.y);
    const half = 2 * Math.asin(Math.min(1, (q.r + CLD_PENGUIN_R) / (2 * R)));
    return [c - half, c + half];
  });
  // Unroll onto [a0, a0 + τ) starting at the first ban's start, merge, invert.
  const base = bans[0][0];
  const norm = bans.map(([s, e]) => { const s2 = base + cldNormAngle(s - base); return [s2, s2 + (e - s)]; })
                   .sort((p, q) => p[0] - q[0]);
  const merged = [];
  norm.forEach(iv => {
    const last = merged[merged.length - 1];
    if (last && iv[0] <= last[1]) last[1] = Math.max(last[1], iv[1]); else merged.push(iv.slice());
  });
  const open = [];
  for (let i = 0; i < merged.length; i++) {
    const s = merged[i][1];
    const e = i + 1 < merged.length ? merged[i + 1][0] : merged[0][0] + CLD_TAU;
    if (e >= s) open.push([s, e]);                  // a zero-width interval still fits exactly
  }
  if (!open.length) return null;
  let best = null, bestD = Infinity;
  open.forEach(([s, e]) => {
    const widthUnits = (e - s) * R;
    let t;
    if (widthUnits < CLD_CENTRE_GAP_DIAM * 2 * CLD_PENGUIN_R) t = (s + e) / 2;
    else {
      const aa = s + cldNormAngle(a - s);           // a, unrolled into this interval's frame
      t = aa <= e ? aa : (cldArcDist(a, s) < cldArcDist(a, e) ? s : e);
    }
    const d = cldArcDist(a, t);
    if (d < bestD) { bestD = d; best = t; }
  });
  return at(best);
}

function cldRingAnchors(excludeId) {
  const out = cldBergs.map(b => ({ id: b.id, x: b.x, y: b.y, r: b.r }));
  cldPenguins.forEach(p => {
    if (p.drowned && p.plug && p.id !== excludeId) out.push({ id: p.id, x: p.x, y: p.y, r: CLD_PENGUIN_R });
  });
  return out;
}

function cldSeatSpot(angle, excludeId) { return cldSeatSpotFrom(cldRingAnchors(excludeId), angle); }
```

- [ ] **Step 4: Run to verify it passes**

Run: `node tools/verify-cld-loop.js`
Expected: the two new sections PASS. (Older Berth sections still pass — nothing is deleted yet.)

- [ ] **Step 5: Commit** (if authorised) — `git add js/games/cld.js tools/verify-cld-loop.js && git commit -m "feat(cld): ring geometry and the plug seal"`

---

### Task 3: The Slide — instant plugs, knock-back, displacement; Berth system deleted

**Files:**
- Modify: `js/games/cld.js` — penguin shape in `cldStartFloeOff`; delete L84 `CLD_BERTH_SLOTS` (+ its comment L78–83), `cldBerthCount` (L131 and the assignment in `cldStartMatch`), `cldBerthArc`, `cldBerthOfAngle`, `cldSlotAngle`, `cldSlotTaken`, `cldFreeSlots`, `cldPickFreeSlot`, `cldShuntSide`, `cldAssignBerth`, `cldSeatDrowned`, `cldDiveTarget`, `cldDiveAvailable`, `cldApplyDive`; rewrite `cldBuildSlideInputs`, `cldResolveSlide` steps 1–4.
- Test: `tools/verify-cld-loop.js` — delete sections 'Berth geometry (§4C)', 'The multi-hop shunt (§4C) — home Berth', 'The multi-hop shunt — stepping outward', 'Dive (§4C) — voluntary, one step, allowed to fail'; remove deleted names from the BRIDGE (`CLD_BERTH_SLOTS`, `cldBerthArc`, `cldBerthOfAngle`, `cldSlotAngle`, `cldSlotTaken`, `cldFreeSlots`, `cldPickFreeSlot`, `cldShuntSide`, `cldAssignBerth`, `cldSeatDrowned`, `cldDiveTarget`, `cldDiveAvailable`, `cldApplyDive`, the `berthCount` accessor, and `rimState()` + its callers); add the section below.

**Interfaces:**
- Consumes: Task 1 events/final fields; Task 2 geometry.
- Produces:
  - Penguin shape: `{ id, ownerIdx, x, y, drowned: bool, plug: bool, angle: number|null, seq: number|null }` — `plug` true = Plugged; `drowned && !plug` = Knocked back; `seq` = seat order (monotonic within a Floe-Off, for the Thaw's "later-seated").
  - `let cldSeatSeq = 0;` reset in `cldStartFloeOff`.
  - `cldPlaceDrowned(p)` — puts a Drowned penguin at its `angle`: Plugged on `cldRingR()`, Knocked back at `cldFloeRadius + CLD_BACK_OFFSET`.
  - `cldSeatAt(p, spot)` — Plugged at `spot`, `seq = ++cldSeatSeq`.
  - `cldKnockBack(p)` — `plug = false`, `cldPlaceDrowned(p)`.
  - `cldSurfaceAt(p, angle) → bool` — seat at `cldSeatSpot(angle, p.id)` or, if null, knock back at `angle`. Returns whether it plugged.
  - `cldDisplaceFrom(plugged, aftermath)` — moves every Knocked-back penguin whose plug would overlap `plugged` to `cldSeatSpot`, pushing `{ type: 'displace', penguinId, x, y, plug }`.
  - `cldSeatOnPlunge(x, y, vx, vy, anchors)` — the physics callback.
  - Timeline gains `bodyIds: [id…]` (the sim's body order) — playback maps samples by it (Task 6).

- [ ] **Step 1: Write the failing tests** (new section after the seal section):

```js
  // ═══════════════════════════════════════════════════════════════════════
  section('The Slide — instant plugs, one-hit knock-back, displacement (spec §3.2–3.3)');
  {
    // Two penguins shoved at the SAME slip gap, one behind the other.
    setup({ players: 3, iceBreaker: 3, seed: 52 });
    const s = F.cldSeatSpot(0, null);                // centre of the nearest gap to angle 0
    const [p0, p1, p2] = G.penguins;
    const lane = (p, back) => { p.x = CX + (F.cldRingR() - back) * Math.cos(s.angle); p.y = CY + (F.cldRingR() - back) * Math.sin(s.angle); };
    lane(p0, 25); lane(p1, 70); p2.x = CX - 40; p2.y = CY;
    const cs = allHold();
    cs[0].aims.push({ penguinId: p0.id, dx: Math.cos(s.angle), dy: Math.sin(s.angle), power: 0.7 });
    cs[1].aims.push({ penguinId: p1.id, dx: Math.cos(s.angle), dy: Math.sin(s.angle), power: 1 });
    G.commits = cs;
    const tl = F.cldResolveSlide(301);
    ok('the first penguin plugged the gap mid-Slide', tl.events.some(e => e.type === 'seat' && e.id === p0.id));
    ok('…and the second rebounded off it instead of following it in',
      !tl.events.some(e => e.type === 'plunge' && e.id === p1.id));
    check('…the plug took that hit and is Knocked back', [pen(p0.id).drowned, pen(p0.id).plug], [true, false]);
    close('…bobbing outside its gap', Math.hypot(pen(p0.id).x - CX, pen(p0.id).y - CY),
      G.radius + C.CLD_PENGUIN_R * 1.4, 1e-6);
    ok('the timeline names its body order', Array.isArray(tl.bodyIds) && tl.bodyIds[0] === p0.id);
  }
  {
    // Displacement: a Knocked-back penguin in the gap a new plunge seats into moves on.
    setup({ players: 3, iceBreaker: 3, seed: 53 });
    const [p0, p1, p2] = G.penguins;
    const s = F.cldSeatSpot(0, null);
    p0.drowned = true; p0.plug = false; p0.angle = s.angle; F.cldPlaceDrowned(p0);   // knocked back, in that gap
    p1.x = CX + (F.cldRingR() - 25) * Math.cos(s.angle); p1.y = CY + (F.cldRingR() - 25) * Math.sin(s.angle);
    const cs = allHold();
    cs[1].aims.push({ penguinId: p1.id, dx: Math.cos(s.angle), dy: Math.sin(s.angle), power: 0.7 });
    G.commits = cs;
    const tl = F.cldResolveSlide(302);
    ok('the new penguin plugged the gap', pen(p1.id).plug === true);
    const d = tl.aftermath.find(b => b.type === 'displace' && b.penguinId === p0.id);
    ok('…the knocked-back one was displaced, as its own beat', !!d);
    ok('…to a different free seat, Plugged again', pen(p0.id).plug === true && F.cldArcDist(pen(p0.id).angle, s.angle) > 1e-3);
  }
  {
    // Every arrival path keeps the ring legal: no plug overlaps a chunk or a plug.
    let legal = true;
    for (let seed = 60; seed < 90; seed++) {
      setup({ players: 3 + (seed % 6), iceBreaker: 1 + (seed % 3), seed: seed });
      for (let k = 0; k < 6; k++) {
        const cs = allHold();
        G.penguins.forEach(p => { if (!p.drowned) cs[p.ownerIdx].aims.push(shoveOut(p.id, 0.6 + 0.4 * ((seed + k) % 2))); });
        G.commits = cs;
        F.cldResolveSlide(seed * 31 + k);
        const plugs = G.penguins.filter(p => p.drowned && p.plug);
        plugs.forEach(p => {
          if (Math.abs(Math.hypot(p.x - CX, p.y - CY) - F.cldRingR()) > 1e-6) legal = false;
          F.cldRingAnchors(p.id).forEach(a => {
            if (Math.hypot(p.x - a.x, p.y - a.y) < C.CLD_PENGUIN_R + a.r - 1e-6) legal = false;
          });
        });
        if (F.cldCheckWashout() || F.cldPlayersAlive() <= 1) break;
      }
    }
    ok('after every Slide of 30 random Floe-Offs, no plug overlaps anything on the ring', legal);
  }
```
Replace the old 'Randomised sweep — rim legality across whole matches' section's Berth-slot assertions with a call-through to the same legality predicate (delete the slot-geometry lines; keep its washout/win bookkeeping).

- [ ] **Step 2: Run to verify it fails**

Run: `node tools/verify-cld-loop.js`
Expected: FAIL / throw — `cldPlaceDrowned is not defined`, no `seat` event.

- [ ] **Step 3: Implement.**

(a) `cldStartFloeOff` penguin push becomes:
```js
      cldPenguins.push({ id: i + '-' + k, ownerIdx: i, x: pos.x, y: pos.y,
                         drowned: false, plug: false, angle: null, seq: null });
```
and add `cldSeatSeq = 0;` beside `cldSlideNo = 0;`. Declare `let cldSeatSeq = 0;` next to `cldBergs`. Update the `cldPenguins` declaration comment to the new shape.

(b) Delete every name listed under **Files** above. `cldStartMatch` loses its `cldBerthCount` line.

(c) Add after `cldSeatSpot`:
```js
// ── Drowned placement ─────────────────────────────────────────────────────
function cldPlaceDrowned(p) {
  const r = p.plug ? cldRingR() : cldFloeRadius + CLD_BACK_OFFSET;
  const pos = cldRimPos(p.angle, r);
  p.x = pos.x; p.y = pos.y;
}
function cldSeatAt(p, spot) {
  p.drowned = true; p.plug = true; p.angle = spot.angle; p.seq = ++cldSeatSeq;
  p.x = spot.x; p.y = spot.y;
}
function cldKnockBack(p) { p.plug = false; cldPlaceDrowned(p); }
function cldSurfaceAt(p, angle) {
  p.drowned = true;
  const spot = cldSeatSpot(angle, p.id);
  if (spot) { cldSeatAt(p, spot); return true; }
  p.plug = false; p.angle = cldNormAngle(angle); cldPlaceDrowned(p);
  return false;
}
// "In that gap" = its plug would overlap the new one (spec §3.3 step 2).
function cldDisplaceFrom(plugged, aftermath) {
  const clash = 2 * Math.asin(Math.min(1, CLD_PENGUIN_R / cldRingR()));   // two penguins touching, chord-exact
  cldPenguins.forEach(q => {
    if (!q.drowned || q.plug || q.id === plugged.id) return;
    if (cldArcDist(q.angle, plugged.angle) >= clash) return;
    const plugs = cldSurfaceAt(q, q.angle);
    aftermath.push({ type: 'displace', penguinId: q.id, x: q.x, y: q.y, plug: plugs });
  });
}
// The physics callback — pure: reads only its arguments and the ring radius.
function cldSeatOnPlunge(x, y, vx, vy, anchors) {
  const s = cldSeatSpotFrom(anchors, cldAngleOf(x, y));
  return s ? { x: s.x, y: s.y } : null;
}
```

(d) `cldBuildSlideInputs` — replace the penguin push with:
```js
  // Body order IS the wire contract — samples[] are positional (§4A), and the
  // order travels as tl.bodyIds because Knocked-back penguins are NOT bodies.
  cldPenguins.forEach(p => {
    if (p.drowned && !p.plug) return;
    bodies.push(p.drowned
      ? { id: p.id, x: p.x, y: p.y, r: CLD_PENGUIN_R, kind: 'drowned', hits: 1 }
      : { id: p.id, x: p.x, y: p.y, r: CLD_PENGUIN_R, kind: 'penguin' });
  });
```
and in the Snowball block skip a player whose commit also Dives: change `if (c.snowball) {` to `if (c.snowball && !c.dive) {`.

(e) `cldResolveSlide` — replace steps 1–4 with:
```js
  // Ice Bath roster (§4): who was Standing going into this Slide.
  const standingBefore = cldStanding().map(p => p.id);

  // ── 1. Dives resolve BEFORE the sim (owner, 28 Sep 2026) ─────────────────
  const dives = cldResolveDives();

  // ── 2. The Slide itself — a plunge through a gap is SEATED mid-sim ───────
  const input = cldBuildSlideInputs();
  const res = window.Physics.simulate({
    world:    { cx: CLD_W / 2, cy: CLD_H / 2, radius: cldFloeRadius },
    bodies:   input.bodies,
    impulses: input.impulses,
    events:   input.events,
    params:   Object.assign(cldSimParams(), { seatOnPlunge: cldSeatOnPlunge }),
    seed:     seed,
  });

  // ── 3. Resting positions, chunk damage ───────────────────────────────────
  res.final.forEach(f => {
    const p = cldPenguins.find(q => q.id === f.id);
    if (p) { if (!f.plunged || f.seated) { p.x = f.x; p.y = f.y; } return; }
    const b = cldBergs.find(q => q.id === f.id);
    if (b) { b.hits = f.hits; b.shattered = !!f.shattered; }
  });
  cldBergs = cldBergs.filter(b => !b.shattered);

  // ── 4. Seats, knock-backs and displacements, in timeline order ───────────
  const aftermath = [];
  res.events.forEach(e => {
    const p = cldPenguins.find(q => q.id === e.id);
    if (!p) return;
    if (e.type === 'seat' && !p.drowned) {
      cldSeatAt(p, { angle: cldAngleOf(e.x, e.y), x: e.x, y: e.y });
      cldMatchStats[p.ownerIdx].plunges += 1;
      cldDisplaceFrom(p, aftermath);
    } else if (e.type === 'knockback' && p.drowned) {
      cldKnockBack(p);
      aftermath.push({ type: 'knockback', penguinId: p.id, x: p.x, y: p.y });
    } else if (e.type === 'plunge' && !p.drowned &&
               !res.events.some(s => s.type === 'seat' && s.id === p.id)) {
      // Seat refused (no room on the ring at all) — in, and Knocked back.
      cldMatchStats[p.ownerIdx].plunges += 1;
      cldSurfaceAt(p, cldAngleOf(e.x, e.y));
      aftermath.push({ type: 'surface', penguinId: p.id, x: p.x, y: p.y, plug: p.plug });
    }
  });
  const standingAfterSlide = cldStanding().map(p => p.id);
```
Add to the `cldTimeline` object: `bodyIds: input.bodies.map(b => b.id),` and keep `dives: dives,`. (`standingBefore` / `standingAfterSlide` are used in Task 5.)

Add a temporary `function cldResolveDives() { return []; }` directly above `cldResolveSlide` — Task 4 replaces it.

- [ ] **Step 4: Run to verify it passes**

Run: `node tools/verify-cld-loop.js && node tools/verify-cld-physics.js`
Expected: `ALL CHECKS PASSED` for both. If a pre-existing section still reads `berth`/`slot`, update it to `plug`/`angle` (a Drowned penguin's legality is now "on the ring circle, overlapping nothing" — reuse the Step 1 predicate).

**Expected red until Task 7:** `tools/verify-cld-loopback.js` runs the UI + MP layer, which still calls the deleted `cldBerthArc` / `cldDiveAvailable` and reads `berth` / `slot` (`cldDraw`, `cldSyncFloeUI`, the wire, the Dive listener). Tasks 6–7 remove every one of those. Do not patch them here — confirm with `grep -n "cldBerth\|cldDiveAvailable\|cldAssignBerth\|cldSeatDrowned\|\.berth\b\|\.slot\b" js/games/cld.js` that the only hits are below the `STAGE 4 OF 6` banner, and that the same grep is empty after Task 7.

- [ ] **Step 5: Commit** (if authorised) — `git commit -am "feat(cld): instant plugs, knock-back, displacement; retire rim-slice Berths"`

---

### Task 4: Throw-or-Dive resolution and the Thaw

**Files:**
- Modify: `js/games/cld.js` — replace the temporary `cldResolveDives`; `cldApplyCommit` (exclusivity); `cldThawStep`; `cldProjectBergsToRim` (plugs as fixed blockers).
- Test: `tools/verify-cld-loop.js` — replace section 'The Thaw — who rides the rim inward, and who does not' Drowned assertions; new Dive section.

**Interfaces:**
- Consumes: Tasks 2–3.
- Produces: commit `dive: null | { penguinId: string, angle: number }`; `cldResolveDives() → [{ penguinId, moved: bool, x, y }]`; `cldApplyCommit` normalises `dive + snowball` → `snowball: null`.

- [ ] **Step 1: Write the failing tests:**

```js
  // ═══════════════════════════════════════════════════════════════════════
  section('Throw or Dive (spec §3.4)');
  const knockBackAt = (p, a) => { p.drowned = true; p.plug = false; p.angle = a; F.cldPlaceDrowned(p); };
  {
    setup({ players: 3, iceBreaker: 3, seed: 70 });
    const [p0, p1] = G.penguins;
    const s = F.cldSeatSpot(Math.PI, null);
    knockBackAt(p0, s.angle - 0.30);          // nearer
    knockBackAt(p1, s.angle + 0.60);          // further
    const cs = allHold();
    cs[0].dive = { penguinId: p0.id, angle: s.angle };
    cs[1].dive = { penguinId: p1.id, angle: s.angle };
    G.commits = cs;
    F.cldResolveSlide(401);
    close('two Dives at one spot: the CLOSER penguin takes it', F.cldArcDist(pen(p0.id).angle, s.angle), 0, 1e-9);
    ok('…the other goes to the free seat nearest the target, Plugged',
      pen(p1.id).plug === true && F.cldArcDist(pen(p1.id).angle, s.angle) > 1e-3);
  }
  {
    setup({ players: 3, iceBreaker: 3, seed: 71 });
    const [p0, p1] = G.penguins;
    const s = F.cldSeatSpot(Math.PI, null);
    knockBackAt(p1, s.angle - 0.30);          // same distance, seat 1
    knockBackAt(p0, s.angle + 0.30);          // same distance, seat 0 — wins the tie
    const cs = allHold();
    cs[0].dive = { penguinId: p0.id, angle: s.angle };
    cs[1].dive = { penguinId: p1.id, angle: s.angle };
    G.commits = cs;
    F.cldResolveSlide(402);
    close('equal distances fall back to seat order', F.cldArcDist(pen(p0.id).angle, s.angle), 0, 1e-9);
  }
  {
    setup({ players: 3, iceBreaker: 3, seed: 72 });
    const [p0] = G.penguins;
    const s = F.cldSeatSpot(0, null);
    p0.drowned = true; p0.plug = true; p0.angle = s.angle; F.cldPlaceDrowned(p0);
    const cs = allHold();
    cs[0].dive = { penguinId: p0.id, angle: Math.PI };
    G.commits = cs;
    F.cldResolveSlide(403);
    close('a PLUGGED penguin cannot Dive', F.cldArcDist(pen(p0.id).angle, s.angle), 0, 1e-9);
  }
  {
    setup({ players: 3, iceBreaker: 3, seed: 73 });
    const [p0] = G.penguins;
    knockBackAt(p0, 0);
    check('host drops the Snowball when a commit also Dives',
      (F.cldApplyCommit(0, { aims: [], dive: { penguinId: p0.id, angle: 1 }, snowball: { x: 180, y: 180 } }, G.slideNo),
       G.commits[0].snowball), null);
    const tl = F.cldResolveSlide(404);
    ok('…so no Snowball lands that Slide', !tl.events.some(e => e.type === 'landing'));
  }
  {
    // Review Focus 5 — a Dive seals its gap before anyone slides at it.
    setup({ players: 3, iceBreaker: 3, seed: 74 });
    const [p0, p1] = G.penguins;
    const s = F.cldSeatSpot(0, null);
    knockBackAt(p0, s.angle + 1.0);
    p1.x = CX + (F.cldRingR() - 30) * Math.cos(s.angle); p1.y = CY + (F.cldRingR() - 30) * Math.sin(s.angle);
    const cs = allHold();
    cs[0].dive = { penguinId: p0.id, angle: s.angle };
    cs[1].aims.push({ penguinId: p1.id, dx: Math.cos(s.angle), dy: Math.sin(s.angle), power: 1 });
    G.commits = cs;
    const tl = F.cldResolveSlide(405);
    ok('a Dive is in place for the Slide it was committed with — the shove rebounds',
      !tl.events.some(e => e.type === 'plunge' && e.id === p1.id));
  }
  {
    // Review Focus 3 — The Thaw to its floor never leaves overlaps.
    let clean = true;
    for (let seed = 80; seed < 95; seed++) {
      setup({ players: 6, iceBreaker: 3, sylly: true, seed: seed });
      G.penguins.slice(0, 4).forEach((p, k) => { const sp = F.cldSeatSpot(k * TAU / 4, p.id); if (sp) { p.drowned = true; p.plug = true; p.angle = sp.angle; F.cldPlaceDrowned(p); } });
      for (let k = 0; k < 14; k++) {
        G.commits = allHold();
        F.cldResolveSlide(seed * 17 + k);
        const plugs = G.penguins.filter(p => p.drowned && p.plug);
        plugs.forEach(p => F.cldRingAnchors(p.id).forEach(a => {
          if (Math.hypot(p.x - a.x, p.y - a.y) < C.CLD_PENGUIN_R + a.r - 1e-6) clean = false;
        }));
        if (F.cldCheckWashout()) break;
      }
    }
    ok('The Thaw shrinking to its floor never leaves a plug overlapping a chunk or a plug', clean);
  }
```
Add `cldApplyCommit` to the BRIDGE `fn:` list if absent.

- [ ] **Step 2: Run to verify it fails** — `node tools/verify-cld-loop.js` → FAIL (Dives ignored; Snowball not dropped).

- [ ] **Step 3: Implement.**

Replace the temporary `cldResolveDives`:
```js
// Throw or Dive (§3.4). Only a Knocked-back penguin Dives. Contested spots go to
// the CLOSER penguin (the short arc on the ring circle), ties to seat order
// (owner, 28 Sep 2026) — one ordering, so three Dives resolve like two.
function cldResolveDives() {
  const want = [];
  for (let i = 0; i < cldPlayerCount; i++) {
    const c = cldCommits[i];
    if (!c || !c.dive) continue;
    const p = cldPenguins.find(q => q.id === c.dive.penguinId && q.ownerIdx === i && q.drowned && !q.plug);
    if (!p) continue;
    const target = cldNormAngle(c.dive.angle);
    want.push({ p: p, seat: i, target: target, dist: cldArcDist(p.angle, target) * cldRingR() });
  }
  want.sort((a, b) => { const d = a.dist - b.dist; return Math.abs(d) > 0.01 ? d : a.seat - b.seat; });
  return want.map(w => {
    const spot = cldSeatSpot(w.target, w.p.id);
    if (spot) cldSeatAt(w.p, spot);
    return { penguinId: w.p.id, moved: !!spot, x: w.p.x, y: w.p.y };
  });
}
```

In `cldApplyCommit`, before `cldCommits[playerIdx] = commit;`:
```js
  // Throw OR Dive, never both — a commit carrying both keeps the Dive (§3.4).
  if (commit && commit.dive && commit.snowball) commit = Object.assign({}, commit, { snowball: null });
```

`cldProjectBergsToRim` — after the projection loop and before the chunk-chunk walk, insert:
```js
  // Plugs are fixed: a chunk the shrinking ring squeezes into a plug calves (§3.5).
  const plugs = cldPenguins.filter(p => p.drowned && p.plug);
  cldBergs = cldBergs.filter(b => !plugs.some(p =>
    Math.hypot(p.x - b.x, p.y - b.y) < CLD_PENGUIN_R + b.r - 0.01));
```
(`cldPlaceDrowned` must have re-positioned plugs first — the Thaw below does that before calling this.)

`cldThawStep` — replace the "Drowned … ride the rim inward" line through the end of the `dropped.forEach` with:
```js
  // Drowned ride inward at their angle. Two plugs a shrink pushes together: the
  // LATER-seated one is knocked back. Then the ring calves around the plugs.
  cldPenguins.forEach(p => { if (p.drowned) cldPlaceDrowned(p); });
  const plugs = cldPenguins.filter(p => p.drowned && p.plug).sort((a, b) => a.seq - b.seq);
  const kept = [];
  plugs.forEach(p => {
    if (kept.some(k => Math.hypot(k.x - p.x, k.y - p.y) < 2 * CLD_PENGUIN_R - 0.01)) {
      cldKnockBack(p);
      beats.push({ type: 'knockback', penguinId: p.id, x: p.x, y: p.y });
    } else kept.push(p);
  });
  cldProjectBergsToRim();

  // Standing penguins are NOT moved (§16 Q1). Anyone the ice has left behind
  // goes in as its own beat and surfaces at the nearest free seat (§3.5).
  const dropped = cldStanding().filter(p => cldDistFromCentre(p.x, p.y) > to);
  dropped.forEach(p => {
    beats.push({ type: 'thaw-drop', penguinId: p.id, x: p.x, y: p.y });
    cldMatchStats[p.ownerIdx].plunges += 1;
    cldSurfaceAt(p, cldAngleOf(p.x, p.y));
    beats.push({ type: 'surface', penguinId: p.id, x: p.x, y: p.y, plug: p.plug });
  });
```
(The `rand` parameter is now unused by `cldThawStep`; keep the signature — callers pass it.)

- [ ] **Step 4: Run to verify it passes** — `node tools/verify-cld-loop.js` → `ALL CHECKS PASSED`.

- [ ] **Step 5: Commit** (if authorised) — `git commit -am "feat(cld): Throw-or-Dive resolution, closer-wins; Thaw with plugs"`

---

### Task 5: The Ice Bath

**Files:**
- Modify: `js/games/cld.js` — constants; `cldStartIceBath`, `cldBathRadius`; `cldResolveSlide` step 7 (roster); `let cldInBath`.
- Test: `tools/verify-cld-loop.js` — replace the Washout section's "everyone Resurfaces" assertions.

**Interfaces:**
- Produces: `const CLD_BATH_FLOOR_MULT = 1.25;` · `let cldInBath = false;` (cleared in `cldStartFloeOff`) · `cldBathRadius(nBath, nTotal) → number` · `cldStartIceBath(bathIds, seed)` · timeline field `bathIds: string[] | null` (non-null only on a Washout).

- [ ] **Step 1: Write the failing tests:**

```js
  // ═══════════════════════════════════════════════════════════════════════
  section('The Ice Bath — a Washout becomes sudden death (spec §4)');
  {
    setup({ players: 4, iceBreaker: 2, seed: 90, fishToWin: 3 });
    const [p0, p1, p2, p3] = G.penguins;
    // p2, p3 already Drowned; p0 and p1 go in together this Slide.
    [p2, p3].forEach((p, k) => { const sp = F.cldSeatSpot(Math.PI + k, p.id); p.drowned = true; p.plug = true; p.angle = sp.angle; F.cldPlaceDrowned(p); });
    G.bergs = [];                               // make the edge open so both really go in
    const cs = allHold();
    cs[0].aims.push(shoveOut(p0.id, 1)); cs[1].aims.push(shoveOut(p1.id, 1));
    G.commits = cs;
    const fishBefore = JSON.stringify(G.fish);
    const floeOffBefore = G.floeOffNo;
    const tl = F.cldResolveSlide(501);
    check('a Washout names the bath: the penguins Standing going into the Slide',
      (tl.bathIds || []).slice().sort(), [p0.id, p1.id].sort());
    F.cldStartIceBath(tl.bathIds, 777);
    check('…no Fish awarded, same Floe-Off', [JSON.stringify(G.fish), G.floeOffNo], [fishBefore, floeOffBefore]);
    check('…the bath penguins are Standing again, the rest still Drowned',
      G.penguins.map(p => p.drowned), [false, false, true, true]);
    check('…on a ringless floe', G.bergs.length, 0);
    close('…sized to the bath', G.radius, F.cldBathRadius(2, 4), 1e-9);
    ok('…the Drowned re-seated Plugged on the new rim',
      [p2, p3].every(p => pen(p.id).plug && Math.abs(Math.hypot(pen(p.id).x - CX, pen(p.id).y - CY) - F.cldRingR()) < 1e-6));
    ok('…and the floor holds', F.cldBathRadius(1, 8) >= 1.25 * F.cldMinRadius() - 1e-9);
  }
  {
    // Review Focus 2 — repeated baths shrink or hold, and always have ≥ 2 owners.
    let sane = true;
    for (let seed = 100; seed < 130; seed++) {
      setup({ players: 3 + (seed % 5), iceBreaker: 1, seed: seed });
      let last = G.penguins.length;
      for (let k = 0; k < 40; k++) {
        const cs = allHold();
        G.penguins.forEach(p => { if (!p.drowned) cs[p.ownerIdx].aims.push(shoveOut(p.id, 1)); });
        G.commits = cs;
        const tl = F.cldResolveSlide(seed * 101 + k);
        if (tl.bathIds) {
          const owners = new Set(tl.bathIds.map(id => pen(id).ownerIdx));
          if (tl.bathIds.length > last || owners.size < 2) sane = false;
          last = tl.bathIds.length;
          F.cldStartIceBath(tl.bathIds, seed + k);
        } else if (tl.floeOffOver) break;
      }
    }
    ok('every bath roster is ≥ 2 owners and never larger than the last', sane);
  }
```
Add `cldStartIceBath, cldBathRadius,` to the BRIDGE and `get floeOffNo`/`fish` already exist.

- [ ] **Step 2: Run to verify it fails** — `node tools/verify-cld-loop.js` → `cldStartIceBath is not defined`.

- [ ] **Step 3: Implement.**

Constants near `CLD_START_RING`:
```js
const CLD_BATH_FLOOR_MULT = 1.25;   // Ice Bath radius floor, × cldMinRadius() — a tuning value (Task 8)
```
State: `let cldInBath = false;` beside `cldSeatSeq`; in `cldStartFloeOff` add `cldInBath = false;`.

After `cldResolveFloeOff`:
```js
// ═══════════════════════════════════════════════════════════════════════════
// The Ice Bath (§4) — a Washout is sudden death, not a replay. The penguins
// that went in together come back on a ringless floe sized to them; everyone
// else keeps playing from the rim. Same Floe-Off, same Fish.
// ═══════════════════════════════════════════════════════════════════════════
function cldBathRadius(nBath, nTotal) {
  return Math.max(CLD_BATH_FLOOR_MULT * cldMinRadius(),
                  CLD_FLOE_SIZE[cldFloeSize] * Math.sqrt(nBath / Math.max(1, nTotal)));
}

function cldStartIceBath(bathIds, seed) {
  const rand = window.Physics.rng(seed);
  cldInBath     = true;
  cldSlideNo    = 0;
  cldTimeline   = null;
  cldPowerLock  = null;
  cldBergs      = [];
  cldFloeRadius = cldBathRadius(bathIds.length, cldPenguins.length);
  const inBath = cldPenguins.filter(p => bathIds.indexOf(p.id) >= 0);
  const spin = rand() * CLD_TAU;
  inBath.forEach((p, k) => {
    const pos = cldRimPos(spin + (k / inBath.length) * CLD_TAU, cldFloeRadius * CLD_START_RING);
    p.drowned = false; p.plug = false; p.angle = null; p.seq = null; p.x = pos.x; p.y = pos.y;
  });
  cldPenguins.filter(p => p.drowned).sort((a, b) => (a.seq || 0) - (b.seq || 0))
             .forEach(p => { p.plug = false; cldSurfaceAt(p, p.angle); });
  cldCommits = new Array(cldPlayerCount).fill(null);
}
```

In `cldResolveSlide` step 7, after `const washout = cldCheckWashout();` add:
```js
  // The bath is whoever went in at the step that washed out — the Thaw's melt
  // if Standing penguins survived the Slide itself, otherwise the Slide.
  const bathIds = washout ? (standingAfterSlide.length ? standingAfterSlide : standingBefore) : null;
```
and add `bathIds: bathIds,` to `cldTimeline`.

- [ ] **Step 4: Run to verify it passes** — `node tools/verify-cld-loop.js` → `ALL CHECKS PASSED`.

- [ ] **Step 5: Commit** (if authorised) — `git commit -am "feat(cld): Washout starts an Ice Bath"`

---

### Task 6: Packets, wire and playback; protocol v243

**Files:**
- Modify: `js/games/cld.js` — `cldWirePenguins`, `cldWireCommit`, `cldFloeOffStartPayload`, `cldTimelinePayload`, `cldTimelineFromPayload`, `CLD_FLOEOFF_START` applier, `cldAdvancePlayback`, `cldPlayEvent`, `cldPlayAftermath`, `cldEndPlayback`; `js/engine.js` (`MP_PROTOCOL_VERSION`).
- Test: `tools/verify-cld-loopback.js`.

**Interfaces:**
- Consumes: Tasks 3–5 state (`plug`, `angle`, `seq`, `cldInBath`, `tl.bodyIds`, `tl.bathIds`).
- Produces: `cldStartIceBathLocal(bathIds)` (host) · wire penguin `{ id, ownerIdx, x, y, drowned, plug, angle, seq }` · `CLD_FLOEOFF_START.bath` bool · `CLD_SLIDE_RESOLVE.bodyIds`, `.bathIds`.

- [ ] **Step 1: Write the failing tests** — in `tools/verify-cld-loopback.js`:
  - Replace the bridge accessors `berths` (delete) and `dive(d)` with `dive(d) { cldMyDive = d; }` taking an object, and add `mode(m) { cldMyMode = m; }` (Task 7 declares `cldMyMode`; until then the loopback's section 9 is expected to fail).
  - Replace the two wire checks at the old L323–331 with:
```js
check('a Standing penguin keeps 0-valued fields and rebuilds plug/angle/seq',
  wire({ p: { id: '0-0', ownerIdx: 0, x: 180, y: 108, drowned: false, plug: false, angle: null, seq: null } }),
  { p: { id: '0-0', ownerIdx: 0, x: 180, y: 108, drowned: false, plug: false } });
check('…and the applier reads them back as false / null / null, never undefined',
  (() => { const p = H.wirePenguins([{ id: '0-0', ownerIdx: 0, x: 1, y: 2, drowned: false }])[0];
           return [p.plug, p.angle, p.seq]; })(), [false, null, null]);
check('dive: null is erased in flight and rebuilt as null',
  H.wireCommit(wire({ c: { aims: [], dive: null, snowball: null } }).c || {}).dive, null);
check('a Dive survives as { penguinId, angle }, angle 0 included',
  H.wireCommit({ aims: [], dive: { penguinId: '1-0', angle: 0 }, snowball: null }).dive,
  { penguinId: '1-0', angle: 0 });
```
(add `wirePenguins: cldWirePenguins, wireCommit: cldWireCommit` to the loopback's host bridge.)
  - Delete `check('every device agrees on the Berth count', …)`.
  - Rewrite section 9 ('A Drowned player commits a Dive and nothing else'): drown client 1's penguin Knocked back via `vm.runInContext("var p = cldPenguins[1]; p.drowned = true; p.plug = false; p.angle = 0.5; cldPlaceDrowned(p);", ctx)` on host **and** that client, then `cd.__cld.mode('dive'); cd.__cld.dive({ penguinId: '1-0', angle: 2.0 });` and assert `buildCommit()` equals `{ aims: [], dive: { penguinId: '1-0', angle: 2.0 }, snowball: null }` and the host's `commits[1].dive` equals `{ penguinId: '1-0', angle: 2.0 }`.
  - Replace both `cldAssignBerth(...)`/`cldSeatDrowned(...)` drowning snippets (old L643, L742) with `p.drowned = true; p.plug = true; p.angle = cldSeatSpot(Math.atan2(p.y - 180, p.x - 180), p.id).angle; cldPlaceDrowned(p);`.
  - Add a new section:
```js
section('11. Plugs, knock-backs and the Ice Bath agree on every device (SW v243)');
{
  // Drive a Floe-Off on host + 2 clients with the ring off until a Slide washes
  // out, then confirm every device holds the same post state and the same bath.
  const seed = Number(process.env.CLD_SEED || 20260928);
  const room = makeRoom(3, seed);                    // the file's existing room builder
  room.host.__cld.iceBreaker = 1;
  runUntil(room, tl => tl.events.some(e => e.type === 'seat') && tl.washout, 60);
  const post = d => JSON.stringify(d.__cld.penguins.map(p => [p.id, p.drowned, p.plug, Math.round(p.x), Math.round(p.y)]));
  check('host and both clients hold the same plugs after the washout Slide',
    [post(room.c1), post(room.c2)], [post(room.host), post(room.host)]);
  check('every device replayed the same body order', [room.c1.__cld.lastBodyIds, room.c2.__cld.lastBodyIds].map(String),
    [String(room.host.__cld.lastBodyIds), String(room.host.__cld.lastBodyIds)]);
  flushBath(room);                                   // advance past CLD_WASHOUT_MS; host broadcasts the bath
  check('every device is in the Ice Bath on the same radius',
    [room.c1.__cld.inBath, room.c2.__cld.inBath, room.c1.__cld.radius === room.host.__cld.radius],
    [true, true, true]);
  check('…and the Floe-Off number did not advance',
    [room.c1.__cld.floeOffNo, room.c2.__cld.floeOffNo], [room.host.__cld.floeOffNo, room.host.__cld.floeOffNo]);
}
```
  If the loopback has no `makeRoom` / `runUntil` / `flushBath` helpers under those names, write them in this step from the file's existing section-8 room setup (host + two client `vm` contexts sharing the fake wire) — `runUntil(room, pred, maxSlides)` commits a full-power outward shove for every Standing penguin on every device and pumps the wire until `pred(host timeline)` is true; `flushBath(room)` runs the pending `setTimeout` the washout beat queued (the harness's timer stub) and pumps the wire once. Expose `lastBodyIds` (`cldTimeline && cldTimeline.bodyIds`), `inBath` (`cldInBath`) and `radius` (`cldFloeRadius`) in the bridge.

- [ ] **Step 2: Run to verify it fails** — `node tools/verify-cld-loopback.js` → FAILs on the new wire checks and section 11.

- [ ] **Step 3: Implement.**

Wire:
```js
function cldWirePenguins(v) {
  return cldWireList(v).map(p => ({
    id:       String(p.id),
    ownerIdx: cldWireNum(p.ownerIdx, 0),
    x:        cldWireNum(p.x, 0),
    y:        cldWireNum(p.y, 0),
    drowned:  !!p.drowned,
    plug:     !!p.plug,                    // false erased? no — false survives; missing → false
    angle:    cldWireNum(p.angle, null),   // null while Standing — erased in flight
    seq:      cldWireNum(p.seq, null),
  }));
}
```
In `cldWireCommit` replace the `dive:` line with:
```js
    dive: (c.dive && typeof c.dive === 'object' && c.dive.penguinId !== undefined && c.dive.penguinId !== null)
      ? { penguinId: String(c.dive.penguinId), angle: cldWireNum(c.dive.angle, 0) }
      : null,                                            // erased in flight → null
```
A shared penguin serialiser replaces the three inline copies (`cldFloeOffStartPayload`, `cldTimelinePayload`):
```js
function cldPenguinsOut() {
  return cldPenguins.map(p => ({ id: p.id, ownerIdx: p.ownerIdx, x: p.x, y: p.y,
                                 drowned: p.drowned, plug: p.plug, angle: p.angle, seq: p.seq }));
}
```
`cldFloeOffStartPayload`: remove `berthCount`, use `penguins: cldPenguinsOut()`, add `bath: cldInBath,`. `cldTimelinePayload`: use `penguins: cldPenguinsOut()`, add `bodyIds: tl.bodyIds, bathIds: tl.bathIds,`. `cldTimelineFromPayload`: add `bodyIds: cldWireList(p.bodyIds).map(String), bathIds: p.bathIds ? cldWireList(p.bathIds).map(String) : null,`.

`CLD_FLOEOFF_START` applier: delete the `cldBerthCount` line; add `cldInBath = !!p.bath;` and replace `cldMyDive = 0;` with `cldMyDive = null; cldMyMode = 'throw';`; replace the final `cldShowFloeOffIntro('intro');` with:
```js
      if (cldInBath) { cldShowFloe(); cldFloatText('ICE BATH!'); }
      else cldShowFloeOffIntro('intro');
```

Playback — in `cldAdvancePlayback` replace the `cldPenguins.forEach((p, k) => …)` sample block with:
```js
    // Samples are positional by tl.bodyIds — Knocked-back penguins are not
    // bodies, so a penguin's index is NOT its index in cldPenguins.
    const ids = tl.bodyIds || [];
    cldPenguins.forEach(p => {
      if (p.plungedThisSlide) return;
      const k = ids.indexOf(p.id);
      if (k < 0) return;
      p.x = s0[k * 2]     + (s1[k * 2]     - s0[k * 2])     * f;
      p.y = s0[k * 2 + 1] + (s1[k * 2 + 1] - s0[k * 2 + 1]) * f;
    });
```
`cldPlayEvent` — add:
```js
  if (e.type === 'seat') {
    const p = cldPenguins.find(q => q.id === e.id);
    if (p) { p.plungedThisSlide = false; p.seatT = cldPlaybackT; }   // its bottom blocks from here
    return;
  }
  if (e.type === 'knockback') { cldSfx('rebound'); return; }
```
`cldPlayAftermath` — replace the `surface` branch with one covering all three placements:
```js
  if (b.type === 'surface' || b.type === 'displace' || b.type === 'knockback') {
    const p = cldPenguins.find(q => q.id === b.penguinId);
    if (p) { p.x = b.x; p.y = b.y; p.plungedThisSlide = false; }
    if (b.type === 'displace') cldSfx('dive');
    return;
  }
```
`cldEndPlayback` washout branch — replace the `setTimeout` body's last line `cldStartFloeOffLocal();` with `cldStartIceBathLocal(tl.bathIds || []);` and add, beside `cldStartFloeOffLocal`:
```js
// The Ice Bath is host-authored like any Resurface; clients wait for the packet.
function cldStartIceBathLocal(bathIds) {
  if (window.syllyMultiplayerMode === 'client') return;
  cldStartIceBath(bathIds, (Date.now() ^ 0x1ceba7) >>> 0);
  if (window.syllyMultiplayerMode === 'host') {
    mpSendEnvelope({ type: 'SYNC', payload: cldFloeOffStartPayload() });
  }
  cldShowFloe();
  cldFloatText('ICE BATH!');
}
```
Also in `cldBeginPlayback` and `cldShowFloe` replace `cldMyDive = 0;` with `cldMyDive = null;` (Task 7 adds `cldMyMode`).

`js/engine.js`: `const MP_PROTOCOL_VERSION = 'v243';` — update its trailing comment to name SW v243 / the CLD packet change.

- [ ] **Step 4: Run to verify it passes** — `node tools/verify-cld-loopback.js` (section 9 passes once Task 7 lands `cldMyMode` — if running Task 6 alone, declare `let cldMyMode = 'throw';` now and let Task 7 own its behaviour), `CLD_SEED=1 …`, `CLD_SEED=7 …` too, then `node tools/verify-mp-configs.js && node tools/verify-mp-reconnect.js`.
Expected: all `ALL CHECKS PASSED`.

- [ ] **Step 5: Commit** (if authorised) — `git commit -am "feat(cld): v243 wire — plugs, bodyIds, Dive target, Ice Bath packet"`

---

### Task 7: UI — Throw · Dive, tap-to-dive, drawing, copy

**Files:**
- Modify: `src/screens/cld.html` (L77–85 Dive row; How-to L313–314); `js/games/cld.js` (state, `cldPointerDown`, `cldSyncFloeUI`, `cldCanCommit`, `cldBuildMyCommit`, `cldDraw`, DOMContentLoaded wiring, `cldSyncSettingsUI` floe line, the Washout result copy, header); `css/styles.css` L2726.
- Test: `tools/verify-cld-loop.js` has no DOM; this task's one assertion is a pure commit-builder check in `tools/verify-cld-loopback.js` (real mock DOM) + a `visual-check` pass.

**Interfaces:**
- Consumes: `cldSeatSpot`, `cldAngleOf`, Task 6 state.
- Produces: `let cldMyMode = 'throw';` (`'throw' | 'dive'`), `cldMyDive: null | { penguinId, angle }`, `cldMyBackPenguin() → penguin | null` (my Knocked-back penguin), `const CLD_BATH_LEAD = 'Nobody made it. Into the Ice Bath with';`.

- [ ] **Step 1: Write the failing test** (loopback, Review Focus 1):
```js
section('12. Switching Dive → Throw before Lock It In sends only the Throw (Review Focus 1)');
{
  const d = makeClientWithKnockedBack();            // one client whose only penguin is Knocked back
  d.__cld.mode('dive'); d.__cld.dive({ penguinId: '1-0', angle: 2 });
  d.__cld.mode('throw'); vm.runInContext('cldMySnowball = { x: 180, y: 180 };', d);
  check('the commit carries the Snowball and no Dive',
    [d.__cld.buildCommit().dive, !!d.__cld.buildCommit().snowball], [null, true]);
  d.__cld.mode('dive');
  check('…and switching back to Dive drops the Snowball', d.__cld.buildCommit().snowball, null);
}
```
(`makeClientWithKnockedBack` = the section-9 setup from Task 6 factored into a helper.)

- [ ] **Step 2: Run to verify it fails** — `node tools/verify-cld-loopback.js` → section 12 FAIL (commit carries both).

- [ ] **Step 3: Implement.**

HTML — replace the whole `cld-dive-row` block (L77–85) with:
```html
      <!-- Drowned-only row: Throw or Dive (SW v243). Dive only while Knocked back. -->
      <div id="cld-drowned-row" style="display:none" class="flex flex-col gap-1">
        <div class="flex gap-2">
          <button id="btn-cld-mode-throw" class="pill pill-active-cld flex-1" data-cld-mode="throw">Throw</button>
          <button id="btn-cld-mode-dive"  class="pill flex-1" data-cld-mode="dive">Dive</button>
        </div>
        <p id="cld-dive-reason" style="display:none" class="text-amber-600 text-xs"></p>
      </div>
```
How-to L313–314 — replace both `<p>`s with:
```html
          <p class="text-stone-500 text-sm">You go in through a gap in the ice, and you <span class="font-semibold text-stone-700">plug</span> it — that's your <span class="font-semibold text-stone-700">Berth</span>. The next penguin to hit you bounces off, once, and knocks you back into the water. From there, every Slide you either throw a <span class="font-semibold text-stone-700">Snowball</span> or <span class="font-semibold text-stone-700">Dive</span> into any free gap and plug that one instead.</p>
          <p class="text-stone-500 text-sm">Easy to miss: a plug <span class="font-semibold text-stone-700">does not save</span> whoever hits it — it shoves them back <span class="font-semibold text-stone-700">harder</span>. And if everyone goes in at once, the ones who did it go straight into the <span class="font-semibold text-stone-700">Ice Bath</span> — a small floe with no ice ring — to settle it.</p>
```
CSS: delete `.cld-dive-btn.cld-dive-unavailable { … }` (L2726).

JS state: `let cldMyDive = null;   // null | { penguinId, angle }` and `let cldMyMode = 'throw';` — reset `cldMyMode = 'throw'` everywhere `cldMyDive = null` is reset (`cldShowFloe`, `cldBeginPlayback`, `CLD_FLOEOFF_START`, `cldResetState`). `cldResetState` also sets `cldInBath = false; cldSeatSeq = 0;`.

Helpers (UI layer):
```js
function cldMyBackPenguin() { return cldMyPenguins().find(p => p.drowned && !p.plug) || null; }
const CLD_BATH_LEAD = 'Nobody made it. Into the Ice Bath with';
```

`cldPointerDown` — at the top, after `const pt = cldToLogical(e);`:
```js
  // Dive mode: the tap picks a gap. It snaps to the free seat nearest the tap.
  if (cldMyMode === 'dive') {
    const back = cldMyBackPenguin();
    const spot = back ? cldSeatSpot(cldAngleOf(pt.x, pt.y), back.id) : null;
    if (spot) { cldMyDive = { penguinId: back.id, angle: spot.angle }; cldSfx('dive'); cldSyncFloeUI(); }
    return;
  }
```

`cldBuildMyCommit` — return:
```js
  return { aims: aims,
           dive:     cldMyMode === 'dive'  ? cldMyDive     : null,
           snowball: cldMyMode === 'throw' ? cldMySnowball : null };
```

`cldSyncFloeUI` — replace the whole "Dive row" block with:
```js
  // ── Throw · Dive — shown to anyone with a Drowned penguin. Dive is live only
  // while Knocked back and while the ring has a free seat (amber reason = can't).
  const row = document.getElementById('cld-drowned-row');
  const anyDrowned = cldMyPenguins().some(p => p.drowned);
  if (row) row.style.display = (anyDrowned && cldPhase === 'aiming') ? 'flex' : 'none';
  if (anyDrowned) {
    const back = cldMyBackPenguin();
    const room = back ? cldSeatSpot(back.angle, back.id) : null;
    const why  = !back ? 'You can Dive once you’re knocked back.'
               : !room ? 'Every gap is taken — nowhere to Dive.' : '';
    if (why && cldMyMode === 'dive') { cldMyMode = 'throw'; cldMyDive = null; }
    const throwBtn = document.getElementById('btn-cld-mode-throw');
    const diveBtn  = document.getElementById('btn-cld-mode-dive');
    if (throwBtn) {
      throwBtn.textContent = iAmDrowned ? 'Throw' : 'Aim';
      throwBtn.classList.toggle('pill-active-cld', cldMyMode === 'throw');
    }
    if (diveBtn) {
      diveBtn.classList.toggle('pill-active-cld', cldMyMode === 'dive');
      diveBtn.classList.toggle('opacity-50', !!why);
      diveBtn.classList.toggle('pointer-events-none', !!why);
    }
    const reason = document.getElementById('cld-dive-reason');
    if (reason) { reason.textContent = why; reason.style.display = why ? 'block' : 'none'; }
  }
```
The header line becomes:
```js
  if (hdr) hdr.textContent = 'Floe-Off ' + cldFloeOffNo + (cldInBath ? ' · Ice Bath' : '') + ' · Slide ' + (cldSlideNo + 1);
```
and in the tally block, before the existing assignment, for the washout beat:
```js
    if (cldPhase === 'washout' && cldTimeline && cldTimeline.bathIds) {
      const names = [...new Set(cldTimeline.bathIds.map(id => (cldPenguins.find(p => p.id === id) || {}).ownerIdx))]
        .map(i => cldPlayerNames[i] || 'Someone');
      tally.textContent = CLD_BATH_LEAD + ' ' + names.join(' & ') + '.';
    } else
```
(chain the existing `tally.textContent = …` as the `else`).

DOMContentLoaded — replace the `[data-cld-dive]` listener block with:
```js
  document.querySelectorAll('[data-cld-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (cldPhase !== 'aiming') return;
      playPillClick();
      cldMyMode = btn.dataset.cldMode;
      if (cldMyMode === 'throw') cldMyDive = null; else cldMySnowball = null;
      cldSyncFloeUI();
    });
  });
```
`cldPointerDown`'s existing Drowned-Snowball branch stays (Throw mode).

`cldDraw` — delete the Berth tick block. In the penguin loop, the state line becomes:
```js
    if (drowned)                                  state = 'bob';
    if (drowned && p.seatT !== undefined && cldPhase === 'resolving' &&
        cldPlaybackT - p.seatT < 500)             state = 'plunge';   // tumbling in, bottom already blocking
```
and pass `dim: drowned && !p.plug` (Plugged reads solid, Knocked back reads faded). After the penguin loop, draw the Dive ghost and free seats when in Dive mode:
```js
  if (cldMyMode === 'dive' && cldPhase === 'aiming') {
    const back = cldMyBackPenguin();
    if (back) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.setLineDash([3, 3]);
      for (let k = 0; k < 48; k++) {                 // free seats, sampled round the ring
        const s = cldSeatSpot(k * CLD_TAU / 48, back.id);
        if (!s || cldArcDist(s.angle, k * CLD_TAU / 48) > 0.02) continue;
        ctx.beginPath(); ctx.arc(s.x, s.y, CLD_PENGUIN_R, 0, CLD_TAU); ctx.stroke();
      }
      ctx.restore();
      if (cldMyDive) {
        const g = cldRimPos(cldMyDive.angle, cldRingR());
        ctx.save(); ctx.globalAlpha = 0.6;
        cldRenderPenguin(ctx, 'bob', back.ownerIdx, g.x, g.y, CLD_PENGUIN_R, { t: cldClock, ring: true, me: true });
        ctx.restore();
      }
    }
  }
```
`cldSyncSettingsUI` floe line — drop the Berth count:
```js
  setVal('cld-val-floe', {
    roomy:    'Roomy — plenty of ice.',
    standard: 'Standard — comfortable for 6.',
    cramped:  'Cramped — elbows out.',
  }[cldFloeSize] || '');
```
and delete the now-unused `const berths = …` line. `cldShowResult`'s Washout sub-line becomes `CLD_BATH_LEAD + ' everyone still standing.'` (reached only if a future path shows a washout result).

Run `node tools/build-index.js && node tools/verify-build-fresh.js`.

- [ ] **Step 4: Verify.**
  - `node tools/verify-cld-loopback.js` → `ALL CHECKS PASSED` (section 12 included).
  - Invoke the `visual-check` skill on `screen-cld-floe` for a client whose penguin is Knocked back, at **375×667, 375×548, 320×452**: the Throw · Dive row sits inside the frozen Controls without pushing Lock It In off screen; the amber reason line wraps inside the column; in Dive mode the dashed free seats and the ghost show on the ring; a Knocked-back penguin at Roomy (radius 150 + 15.4) is inside the visible stage.

- [ ] **Step 5: Commit** (if authorised) — `git add src/screens/cld.html index.html js/games/cld.js css/styles.css tools/verify-cld-loopback.js && git commit -m "feat(cld): Throw · Dive UI, tap-to-dive, plug drawing, Ice Bath copy"`

---

### Task 8: Mutation harness and balance instrument

**Files:**
- Modify: `tools/mutate-cld.js`, `tools/simulate-cld-balance.js`, `js/games/cld.js` (`CLD_BATH_FLOOR_MULT` only if the measurement moves it).

**Interfaces:**
- Consumes: exact strings from Tasks 1–5 (the mutants patch them).

- [ ] **Step 1: Re-point the mutants.** Run `node tools/mutate-cld.js`. Every `PATCH-MISS` row names a mutant whose code this plan deleted or moved.
  - **Retire** (their code no longer exists): `shunt-one-hop-only`, `shunt-ignores-free-count`, `shunt-default-anticlockwise`, `shunt-exact-zero-not-tolerance`, `shunt-silent-fallback`, `dive-shunts-instead-of-failing`, `slot-pick-ignores-occupancy`, `berth-count-tracks-penguins`.
  - **Re-point** any other PATCH-MISS at its new line (same behaviour, new text).
  - **Add** these, verbatim:
```js
['plug-seats-on-the-rim-not-the-ring', 'game', [[
  'function cldRingR() { return cldBergInset(); }',
  'function cldRingR() { return cldFloeRadius; }']]],

['plug-never-centres', 'game', [[
  '    if (widthUnits < CLD_CENTRE_GAP_DIAM * 2 * CLD_PENGUIN_R) t = (s + e) / 2;',
  '    if (false) t = (s + e) / 2;']]],

['plug-absorbs-forever', 'game', [[
  "      ? { id: p.id, x: p.x, y: p.y, r: CLD_PENGUIN_R, kind: 'drowned', hits: 1 }",
  "      ? { id: p.id, x: p.x, y: p.y, r: CLD_PENGUIN_R, kind: 'drowned' }"]]],

['no-instant-plug', 'game', [[
  '    params:   Object.assign(cldSimParams(), { seatOnPlunge: cldSeatOnPlunge }),',
  '    params:   cldSimParams(),']]],

['no-displacement', 'game', [[
  '      cldDisplaceFrom(p, aftermath);',
  '      /* MUTANT: no displacement */']]],

['dive-furthest-wins', 'game', [[
  '  want.sort((a, b) => { const d = a.dist - b.dist; return Math.abs(d) > 0.01 ? d : a.seat - b.seat; });',
  '  want.sort((a, b) => { const d = b.dist - a.dist; return Math.abs(d) > 0.01 ? d : a.seat - b.seat; });']]],

['plugged-may-dive', 'game', [[
  '    const p = cldPenguins.find(q => q.id === c.dive.penguinId && q.ownerIdx === i && q.drowned && !q.plug);',
  '    const p = cldPenguins.find(q => q.id === c.dive.penguinId && q.ownerIdx === i && q.drowned);']]],

['throw-and-dive-both', 'game', [[
  '  if (commit && commit.dive && commit.snowball) commit = Object.assign({}, commit, { snowball: null });',
  '  /* MUTANT: both allowed */']]],

['bath-includes-everyone', 'game', [[
  '  const bathIds = washout ? (standingAfterSlide.length ? standingAfterSlide : standingBefore) : null;',
  '  const bathIds = washout ? cldPenguins.map(p => p.id) : null;']]],

['bath-keeps-the-ring', 'game', [[
  '  cldBergs      = [];\n  cldFloeRadius = cldBathRadius(',
  '  cldFloeRadius = cldBathRadius(']]],

['anchor-never-breaks', 'phys', [[
  '              if (anchor.hits !== null) {',
  "              if (anchor.kind === 'berg') {"]]],
```
Run `node tools/mutate-cld.js` 3× → every mutant `CAUGHT`. A `SURVIVED` row means a missing assertion: add it to the owning task's harness and re-run.

- [ ] **Step 2: Teach the bots Throw-or-Dive** — in `tools/simulate-cld-balance.js` `botCommit`, replace the `let dive = 0; … if (drowned && rand() < 0.25) dive = …` lines with:
```js
  let dive = null;
  const back = G.penguins.find(p => p.ownerIdx === i && p.drowned && !p.plug);
  if (back && rand() < 0.25) dive = { penguinId: back.id, angle: rand() * Math.PI * 2 };
```
and, after the Snowball is chosen, `if (dive) snowball = null;`. In the metrics, count `seat` and `knockback` events per Slide and Ice Baths per Floe-Off; print them in § B's totals line. Replace any remaining `berth`/`slot` reads with `plug`/`angle`.

- [ ] **Step 3: Measure** — `node tools/simulate-cld-balance.js 60 > "$TEMP/cld-v243.txt"`. Record in the impl-notes (Task 9): Slides/Floe-Off for 3p Slush±Thaw, 3p Black Ice, 5p Slush against SW v242 (5.8 / 13.7 / 7.7 / 14.8); plugs and knock-backs per Slide; Ice Bath rate and mean bath length. If a bath runs longer than the Floe-Off that produced it on average, raise `CLD_BATH_FLOOR_MULT` in 0.25 steps (never below 1.0) and re-measure; record the final value and why.

- [ ] **Step 4: Re-run everything** — `node tools/verify-cld-physics.js && node tools/verify-cld-loop.js && node tools/verify-cld-loopback.js && node tools/mutate-cld.js` → all green, 0 survivors.

- [ ] **Step 5: Commit** (if authorised) — `git commit -am "test(cld): mutants and balance for plugs and the Ice Bath"`

---

### Task 9: Documentation closure and SW v243

**Files:** `docs/game-identities/cld.md`, `docs/code-map.md` (Grep `cld` — offset-read only), `docs/implementation-notes/cld-implementation-notes.md`, `docs/decision-log.md`, `CLAUDE.md`, `docs/sw-changelog.md`, `sw.js`, `.claude/rules/logic-engine.md` (Shared Library Modules → `physics.js` row), `docs/deferred-work.md`.

- [ ] **Step 1: Identity doc** (`docs/game-identities/cld.md`) — T2 and T3 "Going in the Drink" rewritten to plugs / knock-back / Throw-or-Dive / Ice Bath; T5 rows per spec §2 (Berth redefined; add Plugged, Knocked back, Ice Bath; Dive redefined; the "Berth count equals player count" row text goes); T6 Floe Size descriptor prose drops Berths; T7b: `screen-cld-floe — controls` copy block replaces `Dive / ← Left / Stay / Right →` with `Throw / Dive / You can Dive once you’re knocked back. / Every gap is taken — nowhere to Dive.`; `screen-cld-result` copy block replaces `Nobody made it. No Fish — back on the ice.` with `Nobody made it. Into the Ice Bath with`; add `ICE BATH!` beside `WASHOUT!` wherever the float text is listed; T10's 8-player row loses the shunt sentence.
Run: `node tools/verify-identity-docs.js` → all PASS.

- [ ] **Step 2: Code-map** — Grep `docs/code-map.md` for `cldAssignBerth`, `cldBerthCount`, `cldMyDive`, `cld-dive-row`, `CLD_BERTH_SLOTS`; replace each row with the new names from Tasks 2–7 (`cldSeatSpotFrom`, `cldSeatSpot`, `cldRingAnchors`, `cldPlaceDrowned`, `cldSurfaceAt`, `cldKnockBack`, `cldDisplaceFrom`, `cldResolveDives`, `cldStartIceBath`, `cldStartIceBathLocal`, `cldMyMode`, `cldMyDive`, `cldInBath`, `cldSeatSeq`, `#cld-drowned-row`, `#cld-dive-reason`) and the packet table (`CLD_COMMIT.dive`, `CLD_SLIDE_RESOLVE.bodyIds/.bathIds`, `CLD_FLOEOFF_START.bath`).

- [ ] **Step 3: Impl-notes** — `cld-implementation-notes.md`: **DD-17** (plugs, Throw-or-Dive, closer-wins, Ice Bath — owner calls in bold, the four spec §7 calls, and Task 8's measured table vs v242); mark **DD-11** (rim capacity invariant) *superseded by DD-17*; add any bug found during the build to the Bug Index. `shared-implementation-notes.md` gets a one-line pointer only if `physics.js`'s option taught a lesson worth sharing.

- [ ] **Step 4: Rules + decision log** — `logic-engine.md` § Shared Library Modules, `physics.js` row: append "`params.seatOnPlunge(x,y,vx,vy,anchors)` seats a plunging body as a one-hit anchor; any immovable with `hits` is breakable (`shatter` for a Berg, `knockback` otherwise)". `docs/decision-log.md`: one entry — *Cold Shoulder's Drowned plug gaps; Washout is an Ice Bath* (Architecture), pointing at the spec and DD-17.

- [ ] **Step 5: Version** — move CLAUDE.md's SW v242 entry verbatim to the top of `docs/sw-changelog.md`; write the v243 entry (≤ 6 lines: plugs + Throw-or-Dive + Ice Bath, the physics option, `MP_PROTOCOL_VERSION` `'v243'` — every device must update, pointer to DD-17); `sw.js` `CACHE_NAME = 'sylly-games-v243'`; update "continuous, v242 back to v167".

- [ ] **Step 6: Deferred work** — `docs/deferred-work.md` § Cold Shoulder item 1: the live session now also covers plugs, a Dive, and an Ice Bath. Grep the file for `Berth`, `Dive`, `shunt` and resolve anything this build closes (move to `deferred-work-log.md` with a RESOLVED line).

- [ ] **Step 7: Final verification**
Run: `node tools/verify-build-fresh.js && node tools/verify-identity-docs.js && node tools/verify-cld-physics.js && node tools/verify-cld-loop.js && node tools/verify-cld-loopback.js && node tools/mutate-cld.js && node tools/verify-mp-configs.js && node tools/verify-mp-reconnect.js`
Expected: every harness green, 0 mutant survivors.

- [ ] **Step 8: Commit** (if authorised) — `git commit -am "docs(cld): SW v243 closure — plugs, Throw-or-Dive, Ice Bath"`
