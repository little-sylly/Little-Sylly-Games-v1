# Cold Shoulder Fun Pass — Phase 1 ("plays fun") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Plugs float in the Drink, the floe is ~1.3× bigger with a matching shove, a camera frames the play (overview → aim cam → slide cam, pinch/pan, mini-map), and Practice becomes three bot *plans* played as full Floe-Offs in a full-height sheet with a reactive coach. Ships as SW v245, `MP_PROTOCOL_VERSION 'v245'`.

**Architecture:** Every rule change lives in `js/games/cld.js`'s headless rules layer (above the `STAGE 4 OF 6` marker) and is proven by `tools/verify-cld-loop.js`. The camera is view state plus pure helpers in the UI layer, reaching every existing caller through the view's effective `scale/offX/offY`, which is why `cldToLogical` doesn't change. Practice keeps the v244 swap (`cldArenaRun`); the bots are one pure function over the Arena record.

**Tech Stack:** Vanilla JS (no modules, globals), `<canvas>` 2D, `js/lib/physics.js` (unchanged), Node `vm` harnesses in `tools/`. Markup is edited in `src/screens/cld.html`, then `node tools/build-index.js`.

**Spec:** `docs/superpowers/specs/2026-09-29-cld-fun-pass-design.md` — § 3 is this plan. Read § 1–3 before Task 1.

## Global Constraints

- No packet field changes. An armed aim stays `{ penguinId, dx, dy, power }`; the commit shape is unchanged.
- `MP_PROTOCOL_VERSION` → `'v245'` (Task 8 only); `CACHE_NAME` → `'sylly-games-v245'` (Task 8 only).
- `js/lib/physics.js` is not edited.
- Edit `src/screens/cld.html`, never `index.html`. Rebuild with `node tools/build-index.js` and confirm with `node tools/verify-build-fresh.js`.
- **The world frame stays 360 × 360, centre (180, 180)** (spec § 3.2, amended). `CLD_W` and `CLD_H` do not change.
- The rules layer must stay loadable in a bare `vm` (no DOM at parse time; nothing new above the Stage-4 marker may touch `document`/`window` except through existing guarded helpers).
- Every requestAnimationFrame-driven motion honours `prefers-reduced-motion` in JS via the existing `cldReducedMotion()`.
- Every copy change in Practice is paired with `docs/game-identities/cld.md` T7b and must pass `node tools/verify-identity-docs.js`.
- Australian English. No emoji in coach lines (the harness asserts it).
- The CTA and pill classes stay exactly as they are (`cld-cta`, `.pill` + `pill-active-cld`). Phase 1 adds no new visual style; the ice-block button is Phase 2.
- A harness check pinned to a v244 number is updated to the value the new constants derive. It is never loosened, deleted or skipped.

## Review Focus

These are the inputs no task's main tests exercise. Each gets its test in the task named.
1. **Rotating or resizing the phone mid-Slide keeps the camera where it was.** A resize must not snap to the overview or lose a manual zoom. (Test: Task 4, section C.)
2. **Practice opened from the live floe's `[?]` moves only the Arena's camera.** Stepping `cldPrView`'s camera leaves `cldView.cam` untouched. (Test: Task 7, section L.)
3. **On Roomy at zoom 1, the outermost Knocked-back penguin is fully on screen.** (Test: Task 4, section C.)
4. **The end card never shows while a Slide is still playing,** even when the Slide that ends the round is mid-replay. (Test: Task 6, section K.)
5. **A second finger landing during a Drowned player's Snowball tap never crashes and never moves the target.** (Test: Task 4, section E.)

---

## File map

| File | Responsibility in this plan |
|---|---|
| `js/games/cld.js` | rules: seat geometry (T1), constants (T2–T3); UI: camera (T4), bot plans (T5), rounds + coach (T6), Practice sync (T7) |
| `tools/verify-cld-loop.js` | ring geometry, seal, pinned constants (T1–T2) |
| `tools/verify-cld-physics.js` | pinned §4B table (T2) |
| `tools/verify-cld-practice.js` | camera (T4), plans + `--tune` (T5), rounds + coach (T6), Arena on screen (T6–T7) |
| `tools/mutate-cld.js` | new geometry mutants (T1), plan mutants (T5) |
| `src/screens/cld.html` | Practice end card + Start over (T6), full-height layout + coach bubble (T7) |
| `css/styles.css` | Practice full-height sheet, stage, bubble (T7) |
| `docs/game-identities/cld.md` | T3/T5 plug wording (T1), T7a/T7b Practice (T6–T7) |
| `js/engine.js`, `sw.js`, `CLAUDE.md`, docs | release + closure (T8) |

Baseline before starting (all green on `cld-fun-pass` at `39e2abc`): `verify-cld-physics` 133 · `verify-cld-loop` 138 · `verify-cld-practice` 146 · `verify-cld-loopback` 186 · `mutate-cld` 33/33.

---

### Task 1: Plugs in the Drink — the seat geometry

**Files:**
- Modify: `js/games/cld.js` — § "Ring geometry (SW v243)" (~lines 303–462), `cldResolveDives` (~580), `cldProjectBergsToRim` (~276–301), `cldDiveModel` (~1659–1670)
- Modify: `tools/verify-cld-loop.js` — bridge (~59–97), `rimLegal` (~164–176), sections "Ring geometry" and "The seal" (~628–695), every `cldRingR` / `* 1.4` use
- Modify: `tools/mutate-cld.js` — the `plug-seats-on-the-rim-not-the-ring` entry
- Modify: `docs/game-identities/cld.md` — T3 and T5 plug wording

**Interfaces:**
- Produces: `CLD_PLUG_OUT` (= `CLD_PENGUIN_R`), `CLD_BACK_OFFSET` (= `2.2 × CLD_PENGUIN_R`), `cldChunkR()` → chunk-circle radius, `cldSeatR()` → plug-circle radius. `cldSeatSpotFrom(anchors, angle)` keeps its signature and return shape `{ angle, x, y } | null`.
- Removes: `cldRingR()` (every caller migrates; nothing may keep calling it).

- [ ] **Step 1: Find every caller of the old radius across the repo**

Run: `grep -rn "cldRingR\|PENGUIN_R \* 1\.4\|CLD_PENGUIN_R \* 1\.4" js tools`
Expected: hits in `js/games/cld.js`, `tools/verify-cld-loop.js` and `tools/mutate-cld.js`. Write the list down; every hit is migrated in this task.

- [ ] **Step 2: Write the failing harness changes in `tools/verify-cld-loop.js`**

In the bridge's `C:` block add `CLD_PLUG_OUT, CLD_BACK_OFFSET,`. In the `fn:` block replace `cldRingR,` with `cldChunkR, cldSeatR,`.

Replace the body of `rimLegal()`'s radius line so it measures the circles **directly**, never by asking the function under test:

```js
    const want = p.plug ? G.radius + C.CLD_PLUG_OUT : G.radius + C.CLD_BACK_OFFSET;
    if (Math.abs(distC(p.x, p.y) - want) > 1e-6)
      return (p.plug ? 'plug off the seat circle: ' : 'knocked-back penguin off its drift line: ') + p.id;
```

In section "Ring geometry", replace the block from `const R = F.cldRingR();` down to `ok('every seat sits on the chunks’ own circle and overlaps no chunk', clean);` with:

```js
    const RC = G.radius - C.CLD_BERG_R;             // the chunk circle, measured directly
    const S  = G.radius + C.CLD_PLUG_OUT;           // the seat circle, measured directly
    const P = C.CLD_PENGUIN_R;
    const touching = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) >= a.r + b.r - 1e-6;

    check('with no anchors the spot is exactly the asked angle',
      Math.round(F.cldSeatSpotFrom([], 1.0).angle * 1e6), 1e6);

    let onCircle = true, clear = true, behind = false;
    for (let k = 0; k < 72; k++) {
      const s = F.cldSeatSpot(k * TAU / 72, null);
      if (!s) continue;
      const me = { x: s.x, y: s.y, r: P };
      if (Math.abs(Math.hypot(s.x - CX, s.y - CY) - S) > 1e-6) onCircle = false;
      if (!F.cldRingAnchors(null).every(a => touching(me, a))) clear = false;
      // Never behind a chunk: the seat's angle must be one a penguin could PASS
      // the chunk ring at (the ban taken at the chunk's own radius).
      G.bergs.forEach(b => {
        const half = 2 * Math.asin(Math.min(1, (b.r + P) / (2 * Math.hypot(b.x - CX, b.y - CY))));
        if (F.cldArcDist(s.angle, Math.atan2(b.y - CY, b.x - CX)) < half - 1e-9) behind = true;
      });
    }
    ok('every seat floats in the Drink, one body-radius past the edge', onCircle);
    ok('…overlapping no chunk and no plug', clear);
    ok('…and never behind a chunk — only where a penguin could get through', !behind);
```

Then, in the same section, change `const chunkHalf = Math.asin(C.CLD_BERG_R / R);` to `const chunkHalf = Math.asin(C.CLD_BERG_R / RC);` and `const edgeGap = (nx - a - 2 * chunkHalf) * R;` to `const edgeGap = (nx - a - 2 * chunkHalf) * RC;`.

Replace the whole "The seal" block (from `section('The seal …` to its `ok(...)`) with a proof on every floe size and every approach angle:

```js
    section('The seal — a floating plug holds its gap on every floe size (spec § 3.1)');
    // Hand-built worst case per floe size: two chunks with the WIDEST slip gap the
    // ring can generate, a plug floating at the gap's centre, and a penguin driven
    // at full power at every offset across the gap and every approach within ±60°.
    // Only a plunge THROUGH the gap counts — the mini world has open rim elsewhere.
    let sealed = true, worst = '';
    for (const size of ['roomy', 'standard', 'cramped']) {
      setup({ players: 3, iceBreaker: 3, floe: size, seed: 51 });
      const RC = G.radius - C.CLD_BERG_R, S = G.radius + C.CLD_PLUG_OUT;
      const widest = 2 * C.CLD_PENGUIN_R * C.CLD_SLIP_GAP_WIDTH[1];
      const half = Math.asin(C.CLD_BERG_R / RC);
      const a0 = 0, a1 = a0 + 2 * half + widest / RC, mid = (a0 + a1) / 2;
      const at = (a, r) => ({ x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) });
      for (let off = -1; off <= 1.0001; off += 0.125) for (const tilt of [-1, -0.5, 0, 0.5, 1]) {
        const lane = mid + off * (a1 - a0) / 2, dir = lane + tilt * Math.PI / 3;
        const start = at(lane, RC - 60);
        const res = sandbox.window.Physics.simulate({
          world: { cx: CX, cy: CY, radius: G.radius },
          bodies: [{ id: 'p', x: start.x, y: start.y, r: C.CLD_PENGUIN_R },
                   Object.assign({ id: 'g0', r: C.CLD_BERG_R, kind: 'berg', hits: 3 }, at(a0, RC)),
                   Object.assign({ id: 'g1', r: C.CLD_BERG_R, kind: 'berg', hits: 3 }, at(a1, RC)),
                   Object.assign({ id: 'd', r: C.CLD_PENGUIN_R, kind: 'drowned', hits: 1 }, at(mid, S))],
          impulses: [{ bodyId: 'p', vx: Math.cos(dir) * C.CLD_V_MAX, vy: Math.sin(dir) * C.CLD_V_MAX }],
          params: F.cldSimParams(), seed: 9 });
        const pl = res.events.find(e => e.type === 'plunge' && e.id === 'p');
        if (pl) {
          const pa = Math.atan2(pl.y - CY, pl.x - CX);
          if (pa >= a0 - 1e-9 && pa <= a1 + 1e-9) { sealed = false; worst = size + ' off ' + off + ' tilt ' + tilt; }
        }
      }
    }
    ok('a floating plug seals the widest slip gap on Roomy, Standard and Cramped, at every offset and angle', sealed, worst);
```

Migrate every remaining hit from Step 1 by one rule:
- A plug's radius becomes `G.radius + C.CLD_PLUG_OUT`.
- A knocked-back radius (`G.radius + C.CLD_PENGUIN_R * 1.4`) becomes `G.radius + C.CLD_BACK_OFFSET`.
- A lane driven at a gap (`F.cldRingR() - back`) becomes `F.cldChunkR() - back`.

- [ ] **Step 3: Run the loop harness to see it fail**

Run: `node tools/verify-cld-loop.js`
Expected: the run crashes at the bridge with `ReferenceError: cldChunkR is not defined` (reported as "the run crashed" or a vm stack).

- [ ] **Step 4: Implement the geometry in `js/games/cld.js`**

Replace the section header comment and the three declarations at the top of "Ring geometry (SW v243)" (from `// Ring geometry (SW v243)` through `function cldRingR() { return cldBergInset(); }`) with:

```js
// ═══════════════════════════════════════════════════════════════════════════
// Ring geometry (SW v245) — where a Drowned penguin can sit. A penguin can only
// go in through a GAP, and it plugs that gap FROM THE DRINK: a Plugged penguin's
// centre sits on the seat circle (cldSeatR), one body-radius past the edge, so
// its whole body floats in the water just touching the ice. Chunks keep their
// own circle (cldChunkR). A seat is legal where a penguin could PASS the chunk
// ring at that angle and no other plug overlaps it — every anchor's ban is taken
// at the anchor's own radius — so a plug never sits behind a chunk. One floating
// plug seals any slip gap up to 1.8 diameters on every floe size (the seal
// harness). spec 2026-09-29-cld-fun-pass § 3.1 (owner: "fully in the water").
// ═══════════════════════════════════════════════════════════════════════════
const CLD_CENTRE_GAP_DIAM = 2;                   // open interval < this × penguin diameter → seat at its centre
const CLD_PLUG_OUT        = CLD_PENGUIN_R;       // a plug's centre sits this far past the edge
const CLD_BACK_OFFSET     = CLD_PENGUIN_R * 2.2; // a Knocked-back penguin drifts this far past the edge

function cldChunkR() { return cldBergInset(); }
function cldSeatR()  { return cldFloeRadius + CLD_PLUG_OUT; }
```

In `cldSeatSpotFrom`, replace `const R = cldRingR();` with `const S = cldSeatR(), RC = cldChunkR();`. Change `const pos = cldRimPos(t, R);` inside `at` to `const pos = cldRimPos(t, S);`. Replace the bans' `half` line with:

```js
    const half = 2 * Math.asin(Math.min(1, (q.r + CLD_PENGUIN_R) / (2 * cldDistFromCentre(q.x, q.y))));
```

and `const widthUnits = (e - s) * R;` with `const widthUnits = (e - s) * RC;`.

Then migrate the other callers:
- `cldPlaceDrowned`: `const r = p.plug ? cldSeatR() : cldFloeRadius + CLD_BACK_OFFSET;`
- `cldDisplaceFrom`: `const clash = 2 * Math.asin(Math.min(1, CLD_PENGUIN_R / cldSeatR()));`
- `cldResolveDives`: `dist: cldArcDist(p.angle, target) * cldSeatR()`
- `cldDiveModel`: `const apart = 2 * Math.asin(Math.min(1, CLD_PENGUIN_R / cldSeatR()));` and `const g = chosen ? cldRimPos(chosen.angle, cldSeatR()) : null;`

In `cldProjectBergsToRim`, delete the plug-calving filter (the three lines from `// Plugs are fixed: a chunk the shrinking ring squeezes into a plug calves (§3.5).` to the `CLD_PENGUIN_R + b.r - 0.01));` line) and put this comment in its place:

```js
  // No plug can calve a chunk any more (SW v245): a plug floats on cldSeatR, and
  // cldSeatR − cldChunkR = CLD_PENGUIN_R + CLD_BERG_R exactly, so a plug and a
  // chunk can at most touch — at any radius the Thaw reaches. The Thaw sweep in
  // verify-cld-loop.js holds the invariant this line used to enforce.
```

Update the file-header comment line `// ring geometry (where a Drowned penguin plugs)` if it mentions "on the ring" to read "in the Drink". Set `CLD_SLIP_GAP_WIDTH` to `[1.6, 1.8]` with the comment `// × penguin diameter, arc length — capped so one floating plug seals the widest (SW v245)`.

- [ ] **Step 5: Run every harness the geometry reaches**

Run: `node tools/verify-cld-loop.js && node tools/verify-cld-physics.js && node tools/verify-cld-practice.js && node tools/verify-cld-loopback.js`
Expected: all four print `ALL CHECKS PASSED` (or their equivalent final pass line) with no failures. If a Thaw check asserted that a plug *calves* a chunk, restate it as "after every Thaw, no chunk overlaps a plug", which is the invariant it protected. Don't delete it.

- [ ] **Step 6: Update the mutants**

In `tools/mutate-cld.js`, replace the `plug-seats-on-the-rim-not-the-ring` entry with two entries:

```js
['plug-seats-on-the-ice', 'game', [[
  'function cldSeatR()  { return cldFloeRadius + CLD_PLUG_OUT; }',
  'function cldSeatR()  { return cldChunkR(); }']]],

['chunk-ban-taken-at-the-seat-circle', 'game', [[
  '    const half = 2 * Math.asin(Math.min(1, (q.r + CLD_PENGUIN_R) / (2 * cldDistFromCentre(q.x, q.y))));',
  '    const half = 2 * Math.asin(Math.min(1, (q.r + CLD_PENGUIN_R) / (2 * S)));']]],
```

Run: `node tools/mutate-cld.js`
Expected: `All 34 mutants caught.`

- [ ] **Step 7: Identity doc wording (paired with the rule)**

In `docs/game-identities/cld.md`:
- **T3 "Going in the Drink".** Change "It **plugs** the gap it went through the instant it goes in" so it reads: "It **plugs** the gap it went through the instant it goes in — floating in the Drink right at the mouth of the gap, its back against the ice".
- **T3, the knocked-back bullet.** Change "the plug is **knocked back** into the water" to "the plug is **knocked back**, drifting further out".
- **T5 Plugged.** "The Drowned state that blocks its gap from the water: floating just past the edge, an immovable, energetic bumper that absorbs **one** contact."
- **T5 Knocked back.** "…drifted out past its gap…".

- [ ] **Step 8: Commit**

```bash
git add js/games/cld.js tools/verify-cld-loop.js tools/mutate-cld.js docs/game-identities/cld.md
git commit -m "feat(cld): plugs float in the Drink — seat circle past the edge, bans at each anchor's own radius, 1.8-wide gaps

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: A bigger floe, a stronger shove

**Files:**
- Modify: `js/games/cld.js` — constants block (~lines 46–84), `CLD_VIEW_FIT` (~980)
- Modify: `tools/verify-cld-loop.js:208-215`, `:285`; `tools/verify-cld-physics.js:186-193`

**Interfaces:**
- Produces: `CLD_R_STD = 170`, `CLD_FLOE_SIZE = { roomy: 195, standard: 170, cramped: 143 }`, `CLD_V_MAX = 195`, `CLD_SNOWBALL_SPEED = 780`, `CLD_THAW_STEP = 10`, `CLD_VIEW_FIT` derived from the Roomy floe (the camera replaces it in Task 4).

- [ ] **Step 1: Update the pinned numbers first (they will fail against v244 constants)**

`tools/verify-cld-loop.js`, the §4B table block:

```js
    close('Powder full-power slide distance',   F.cldFullSlideDist('powder'),   119, 0.001);
    close('Slush full-power slide distance',    F.cldFullSlideDist('slush'),    170, 0.001);
    close('Black Ice full-power slide distance', F.cldFullSlideDist('blackice'), 238, 0.001);
    close('Powder minimum floe radius',    F.cldMinRadius('powder'),   59.5, 0.001);
    close('Slush minimum floe radius',     F.cldMinRadius('slush'),    85,   0.001);
    close('Black Ice minimum floe radius', F.cldMinRadius('blackice'), 119,  0.001);
```

and the label `'a Standard floe can roughly halve before it stops (130 → 65)'` → `'a Standard floe can roughly halve before it stops (170 → 85)'`.

`tools/verify-cld-physics.js`:

```js
  check('§4B table — full-power slide distances 119 / 170 / 238',
    ICE_KEYS.map(i => Math.round(cldFullSlideDist(i))), [119, 170, 238]);
  check('§4B table — minimum floe radii 60 / 85 / 119 (COMPUTED, never literals)',
    ICE_KEYS.map(i => Math.round(cldMinRadius(i))), [60, 85, 119]);
```

and the label `'The Thaw can roughly halve a Standard floe (130 → 65) before it stops'` → `'(170 → 85)'`.

- [ ] **Step 2: Run to see them fail**

Run: `node tools/verify-cld-loop.js; node tools/verify-cld-physics.js`
Expected: FAIL on exactly the six table checks in the loop harness and the two table checks in the physics harness.

- [ ] **Step 3: Change the constants**

In `js/games/cld.js`:

```js
const CLD_V_MAX           = 195;    // full-power Slide launch velocity, units/s (SW v245: ×1.3 with the floe, so a Slide still plays in the same time)
const CLD_R_STD           = 170;    // Standard floe radius — R_std (SW v245: was 130; about 2× the ice per penguin)
```

```js
const CLD_SNOWBALL_SPEED  = 780;    // units/s in flight → arrivalMs = distance / this (SW v245: ×1.3 — same arrival fraction of a Slide, DD-13's race)
```

```js
const CLD_FLOE_SIZE = { roomy: 195, standard: CLD_R_STD, cramped: 143 };   // SW v245: ×1.3
```

```js
const CLD_THAW_STEP   = 10;     // logical units shed per Slide under The Thaw (SW v245: ×1.3, was 8)
```

Leave the long DD-13 comments above them; add one line above `CLD_V_MAX`:
`// SW v245 (spec 2026-09-29-cld-fun-pass § 3.2): the floe grew ~1.3×; every distance and speed derived from it scaled with it, penguins did not.`

Replace `const CLD_VIEW_FIT = 330;` and its comment with:

```js
// Logical units fitted to the stage's short axis: the Roomy floe, the Knocked-
// back drift past its edge and a penguin radius either side (SW v245). The
// camera (Task 4 of the fun pass) replaces this with a per-floe fit.
const CLD_VIEW_FIT = 2 * (CLD_FLOE_SIZE.roomy + CLD_BACK_OFFSET + CLD_PENGUIN_R + 4);
```

- [ ] **Step 4: Run all CLD harnesses**

Run: `node tools/verify-cld-physics.js && node tools/verify-cld-loop.js && node tools/verify-cld-practice.js && node tools/verify-cld-loopback.js && node tools/mutate-cld.js`
Expected: all green, 34/34 mutants caught.
- **If a Practice drill claim now fails** (the floe grew under the drills): leave it. Task 5 rewrites the drills. Record which drill claim failed in the commit message.
- **Any other failure that pins a v244 number:** replace it with the value derived from the new constants. Never loosen it.

- [ ] **Step 5: Commit**

```bash
git add js/games/cld.js tools/verify-cld-loop.js tools/verify-cld-physics.js
git commit -m "feat(cld): a bigger floe and a stronger shove — R_std 170, V_MAX 195, Snowball 780, Thaw step 10

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Balance — tune slip-gap count and ring cover to today's Floe-Off length

**Files:**
- Modify: `js/games/cld.js` — `CLD_SLIP_GAPS`, `CLD_RING_COVER`
- Create: `docs/implementation-notes/cld-implementation-notes.md` — a new `### DD-19` entry (drafted here, completed in Task 8)

**Interfaces:**
- Produces: final `CLD_SLIP_GAPS` and `CLD_RING_COVER` values. Nothing else reads them by name.

- [ ] **Step 1: Capture the v244 baseline from the previous branch**

```bash
mkdir -p .superpowers/sdd/2026-09-29-cld-fun-pass
git show cld-cue-arena:js/games/cld.js > .superpowers/sdd/2026-09-29-cld-fun-pass/cld-v244.js
CLD_SRC=.superpowers/sdd/2026-09-29-cld-fun-pass/cld-v244.js node tools/simulate-cld-balance.js 60 > .superpowers/sdd/2026-09-29-cld-fun-pass/balance-v244.txt
```

Expected: the file's § B table has one row per `N ice thaw`. Copy the `slides/FO` mean for **3 slush off, 3 slush on, 5 slush off, 5 slush on** into a scratch table. These four are the target, and each must land within ±15%.

- [ ] **Step 2: Measure the current code**

Run: `node tools/simulate-cld-balance.js 60 > .superpowers/sdd/2026-09-29-cld-fun-pass/balance-try-0.txt`
Expected: longer Floe-Offs than baseline (narrower gaps + more room). Read the same four rows.

- [ ] **Step 3: Sweep the two levers**

Set `CLD_SLIP_GAPS = [3, 4]` and `CLD_RING_COVER = 0.80`, re-run, and record the four numbers. Continue through this grid in order, stopping at the **first** cell where all four are within ±15% of baseline:

| try | `CLD_SLIP_GAPS` | `CLD_RING_COVER` |
|---|---|---|
| 1 | [3, 4] | 0.80 |
| 2 | [3, 4] | 0.75 |
| 3 | [4, 5] | 0.80 |
| 4 | [4, 5] | 0.75 |
| 5 | [3, 4] | 0.85 |
| 6 | [2, 3] | 0.75 |

For each try, run `node tools/simulate-cld-balance.js 60 > .superpowers/sdd/2026-09-29-cld-fun-pass/balance-try-N.txt`.
**Stop rule:** if no cell reaches all four, stop. Report the closest cell and its four numbers to the owner, and do not touch any other constant (spec § 8).

- [ ] **Step 4: Run the rules harnesses on the chosen values**

Run: `node tools/verify-cld-loop.js && node tools/mutate-cld.js`
Expected: green; `ok('the generated ring has slip gaps', found >= 2)` still passes.

- [ ] **Step 5: Draft DD-19's balance table**

Append to `docs/implementation-notes/cld-implementation-notes.md` (after DD-18, before `## Bug Index`):

```markdown
### DD-19 — plugs in the Drink, a bigger floe, a camera, and Practice plans (SW v245)

Spec: `docs/superpowers/specs/2026-09-29-cld-fun-pass-design.md` § 3; plan: `docs/superpowers/plans/2026-09-29-cld-fun-pass-phase1.md`.

**Balance** (`simulate-cld-balance.js 60`, `CLD_SEED` default, mean Slides/Floe-Off):

| config | v244 | v245 first cut (gaps [2,3], cover 0.80) | v245 shipped (gaps [a,b], cover c) |
|---|---|---|---|
| 3p Slush | … | … | … |
| 3p Slush + Thaw | … | … | … |
| 5p Slush | … | … | … |
| 5p Slush + Thaw | … | … | … |
```

Fill every `…`, `a`, `b` and `c` with the measured numbers from Steps 1–3. There must be no `…` left before committing.

- [ ] **Step 6: Commit**

```bash
git add js/games/cld.js docs/implementation-notes/cld-implementation-notes.md
git commit -m "tune(cld): slip gaps and ring cover hold Floe-Off length within 15% of v244

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The camera

**Files:**
- Modify: `js/games/cld.js` — canvas plumbing (`cldMakeView`, `cldResize`, ~1259–1318), `cldLoop` (~1324), `cldDraw` end (~1480), pointer handlers (~1718–1790), `cldShowFloe` (~1795), `cldBeginPlayback` (~2054), `cldFloeModel` selection ring (~1685), `CLD_VIEW_FIT` removed
- Modify: `tools/verify-cld-practice.js` — section C (rewrite), section E (add), section K's `CLD_VIEW_FIT` line

**Interfaces:**
- Consumes: `CLD_BACK_OFFSET` (Task 1), `cldReducedMotion()` (existing, hoisted).
- Produces:
  - `cldViewFit(radius) → number`
  - `cldCamApply(view)`
  - `cldCamFrame(view, radius)`
  - `cldCamOverview(view, snap)`
  - `cldCamFit(points, pad, box, base, zmax, radius) → { x, y, z }`
  - `cldCamTarget(view, m, phase) → { x, y, z } | null` (phase `'aiming' | 'resolving' | 'overview'`)
  - `cldCamStep(view, dtS, target, frozen)`
  - `cldCamPointer(view, e, kind) → bool` (kind `'down' | 'move' | 'up'`)
  - `cldCancelDrag()`
  - `cldDrawMiniMap(view, m)`
  - view fields: `box`, `base`, `fitR`, `dpr`, `cssW`, `cssH`, `insetTop`, `insetBottom`, `cam { x, y, z, tx, ty, tz, manual, holdUntil, clock, prev }`, `ptrs`, `pinch`, `lastTap`.
  - `view.scale / offX / offY` stay the **effective** transform, so `cldToLogical` is unchanged.

- [ ] **Step 1: Write the failing camera checks**

In `tools/verify-cld-practice.js`, replace the whole section C block (`if (!TUNE) { section('C. The view'); … }`) with:

```js
if (!TUNE) {
  section('C. The view and the camera');
  const doc = S.document;
  const box = doc.createElement('div'); box.clientWidth = 320; box.clientHeight = 480;
  const cv  = doc.createElement('canvas'); box.appendChild(cv);
  cv.getBoundingClientRect = () => ({ left: 10, top: 20, width: 320, height: 480 });
  const v = RUN('cldMakeView')(cv);
  RUN('cldResize')(v);
  const FIT = RUN('cldViewFit')(G('CLD_R_STD'));
  ok('at zoom 1 the floe and its outer margin fit the short axis', near(v.scale, 320 / FIT, 1e-9), String(v.scale));
  ok('the floe centre sits at the box centre', near(v.offX + 180 * v.scale, 160, 1e-9) && near(v.offY + 180 * v.scale, 240, 1e-9));
  const round = (x, y) => { const c = RUN('cldToLogical')(v, { clientX: 10 + v.offX + x * v.scale, clientY: 20 + v.offY + y * v.scale });
                            return near(c.x, x, 1e-6) && near(c.y, y, 1e-6); };
  ok('cldToLogical inverts the transform at zoom 1', round(180, 180) && round(40, 300));
  v.cam.x = 220; v.cam.y = 150; v.cam.z = 1.7; RUN('cldCamApply')(v);
  ok('…and at any camera position and zoom', round(220, 150) && round(-20, 400) && near(v.scale, 1.7 * v.base, 1e-9));
  // Review Focus 1 — a resize keeps the camera.
  RUN('cldResize')(v);
  ok('a resize keeps the camera where it was (no snap to the overview)', near(v.cam.x, 220) && near(v.cam.z, 1.7) && round(220, 150));
  // Review Focus 3 — Roomy's outermost Knocked-back penguin is on screen at zoom 1.
  RUN('cldCamFrame')(v, G('CLD_FLOE_SIZE').roomy);
  const edge = 180 + G('CLD_FLOE_SIZE').roomy + G('CLD_BACK_OFFSET') + G('CLD_PENGUIN_R');
  ok('Roomy at zoom 1: the furthest Knocked-back penguin is inside the box',
     v.offX + edge * v.scale <= v.box.x + v.box.w + 1e-6 && v.offX + (360 - edge) * v.scale >= v.box.x - 1e-6);
  RUN('cldCamFrame')(v, G('CLD_R_STD'));
  const two = RUN('cldCamFit')([{ x: 150, y: 180 }, { x: 210, y: 180 }], 90, v.box, v.base, 1.25, 170);
  ok('cldCamFit centres on the points and caps the zoom', near(two.x, 180) && near(two.y, 180) && two.z >= 1 && two.z <= 1.25);
  const far = RUN('cldCamFit')([{ x: 400, y: 180 }, { x: 420, y: 180 }], 10, v.box, v.base, 2, 170);
  ok('…and never lets the centre wander past CLD_CAM_CENTRE_LIM × radius',
     near(Math.hypot(far.x - 180, far.y - 180), G('CLD_CAM_CENTRE_LIM') * 170, 1e-6));
  RUN('cldCamOverview')(v, true);
  const t = { x: 230, y: 180, z: 1.14 };
  RUN('cldCamStep')(v, 0.5, t, false);
  ok('the overview holds for CLD_CAM_OVERVIEW_S', near(v.cam.tx, 180) && near(v.cam.x, 180));
  RUN('cldCamStep')(v, 0.4, t, false);
  ok('…then the camera eases toward its target rather than jumping', v.cam.x > 180 && v.cam.x < 230);
  const x0 = v.cam.x;
  RUN('cldCamStep')(v, 0.5, { x: 100, y: 100, z: 2 }, true);
  ok('the camera never moves while a finger is down', near(v.cam.x, x0) && near(v.cam.tx, 230));
  S.window.matchMedia = () => ({ matches: true });
  RUN('cldCamStep')(v, 0.016, t, false);
  ok('reduced motion: the camera cuts straight to its target', near(v.cam.x, 230) && near(v.cam.z, 1.14));
  S.window.matchMedia = () => ({ matches: false });
  const pe = (id, x, y, ts) => ({ pointerId: id, clientX: x, clientY: y, timeStamp: ts || 0 });
  ok('one finger is never the camera', RUN('cldCamPointer')(v, pe(1, 100, 100, 1000), 'down') === false);
  ok('a second finger starts a pinch and takes manual control',
     RUN('cldCamPointer')(v, pe(2, 200, 100, 1010), 'down') === true && v.cam.manual === true);
  const z0 = v.cam.z;
  RUN('cldCamPointer')(v, pe(2, 300, 100), 'move');
  ok('spreading the fingers zooms in', v.cam.z > z0);
  ok('lifting one finger of a pinch is still the camera’s', RUN('cldCamPointer')(v, pe(2, 300, 100), 'up') === true);
  ok('…and lifting the last one never reaches the aim', RUN('cldCamPointer')(v, pe(1, 100, 100), 'up') === false && v.pinch === null);
  RUN('cldCamStep')(v, 1, t, false);
  ok('manual control holds against the auto camera', !near(v.cam.tx, 230));
  RUN('cldCamPointer')(v, pe(3, 50, 50, 5000), 'down'); RUN('cldCamPointer')(v, pe(3, 50, 50), 'up');
  RUN('cldCamPointer')(v, pe(4, 52, 51, 5200), 'down'); RUN('cldCamPointer')(v, pe(4, 52, 51), 'up');
  ok('a double-tap hands the camera back to auto', v.cam.manual === false);
  const v2 = RUN('cldMakeView')(doc.createElement('canvas'));
  ok('two views are independent objects, each with its own camera', v2 !== v && v2.cam !== v.cam && v2.scale === 1);
  ok('CLD_VIEW_FIT is gone — the fit is per floe', RUN("typeof CLD_VIEW_FIT === 'undefined'"));
}
```

In section E (the live gesture), just before `SET('cldPhase', 'resolving');`, add:

```js
  // A second finger mid-aim is the camera: the aim is dropped, never armed.
  fresh([pen('0-0', 0, 140, 180), pen('1-0', 1, 260, 180)]);
  down(60, 180); move(60 - PULL / view.scale, 180);
  RUN('cldPointerDown')({ clientX: 5, clientY: 5, pointerId: 2 });
  ok('a second finger cancels the aim without arming it', G('cldDragging') === false && G('cldMyAims').length === 0);
  RUN('cldPointerUp')({ clientX: 5, clientY: 5, pointerId: 2 });
  up(60 - PULL / view.scale, 180);
  check('…and lifting both fingers arms nothing', G('cldMyAims').length, 0);
  // Review Focus 5 — a second finger during a Drowned player's Snowball tap.
  fresh([pen('0-0', 0, 140, 180, { drowned: true, plug: true, angle: 0 }), pen('1-0', 1, 260, 180)]);
  SET('cldFloeRadius', 130);
  let threw2 = null;
  try {
    down(170, 170);
    RUN('cldPointerDown')({ clientX: 7, clientY: 7, pointerId: 2 });
    RUN('cldPointerUp')({ clientX: 7, clientY: 7, pointerId: 2 });
    up(170, 170);
  } catch (e) { threw2 = e; }
  ok('a second finger during a Snowball tap never throws', threw2 === null, threw2 && threw2.stack);
  ok('…and never moves the target', G('cldMySnowball') && near(G('cldMySnowball').x, 170, 1e-6));
  SET('cldMySnowball', null);
```

`pen` in section E takes no `extra` argument. Extend its definition to `const pen = (id, owner, x, y, extra) => Object.assign({ id, ownerIdx: owner, x, y, drowned: false, plug: false, angle: null, seq: null }, extra || {});`.

In section K, replace `ok('the canvas is sized when Practice is shown', near(G('cldPrView').scale, 300 / G('CLD_VIEW_FIT'), 1e-9));` with:

```js
  ok('the canvas is sized and framed on the Arena floe when Practice is shown',
     near(G('cldPrView').base, 300 / RUN('cldViewFit(CLD_R_STD)'), 1e-9) && near(G('cldPrView').cam.z, 1, 1e-9));
```

- [ ] **Step 2: Run to see it fail**

Run: `node tools/verify-cld-practice.js`
Expected: the run crashes in section C at `RUN('cldViewFit')` — `cldViewFit is not defined`.

- [ ] **Step 3: Implement the camera in `js/games/cld.js`**

Delete the `CLD_VIEW_FIT` constant (Task 2's version) and its comment. Directly after the `// ── Canvas / playback state` block, add:

```js
// ═══════════════════════════════════════════════════════════════════════════
// The camera (SW v245 — spec 2026-09-29-cld-fun-pass § 3.3). The view no longer
// has to hold the whole floe. Each view owns a camera in LOGICAL units, and
// cldCamApply turns it into the view's EFFECTIVE transform (scale, offX, offY) —
// so cldToLogical, and every caller that reads view.scale, is unchanged.
// Every number here is a feel tunable (spec § 8): change them here only.
// ═══════════════════════════════════════════════════════════════════════════
const CLD_CAM_EASE         = 3.2;    // 1/s — each frame eases 1 − e^(−EASE·dt) of the way
const CLD_CAM_AIM_Z        = 1.14;   // aim cam zoom
const CLD_CAM_AIM_LEAN     = 0.32;   // aim cam centre: this share of the way from the floe's centre to you
const CLD_CAM_SLIDE_Z      = 1.25;   // slide cam zoom ceiling
const CLD_CAM_SLIDE_PAD    = 90;     // logical units round whatever is moving
const CLD_CAM_CENTRE_LIM   = 0.55;   // × radius — the furthest the centre may wander from the floe's
const CLD_CAM_OVERVIEW_S   = 0.8;    // s the whole floe holds at the start of every Slide
const CLD_CAM_SLIDE_HOLD_S = 0.35;   // s the camera waits before following a Slide
const CLD_CAM_Z_MIN        = 0.8;    // pinch limits
const CLD_CAM_Z_MAX        = 2.6;
const CLD_CAM_MAP_Z        = 1.18;   // the mini-map shows above this zoom, or whenever the camera is manual
const CLD_CAM_TAP_MS       = 300;    // two taps inside this, and CLD_CAM_TAP_PX apart, = a double-tap
const CLD_CAM_TAP_PX       = 24;
const CLD_CAM_MOVE_EPS     = 0.5;    // logical units a penguin must move in a frame to count as moving

// The floe, the Knocked-back drift past its edge and a penguin radius either side.
function cldViewFit(radius) { return 2 * (radius + CLD_BACK_OFFSET + CLD_PENGUIN_R + 4); }
```

Replace `cldMakeView` and `cldResize` with:

```js
function cldMakeView(canvas) {
  const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  return { canvas: canvas, ctx: ctx, scale: 1, offX: 0, offY: 0, x: 0, y: 0, w: CLD_W, h: CLD_H,
           cssW: 0, cssH: 0, dpr: 1, box: { x: 0, y: 0, w: 0, h: 0 }, insetTop: 0, insetBottom: 0,
           base: 1, fitR: CLD_R_STD,
           cam: { x: CLD_W / 2, y: CLD_H / 2, z: 1, tx: CLD_W / 2, ty: CLD_H / 2, tz: 1,
                  manual: false, holdUntil: 0, clock: 0, prev: {} },
           ptrs: null, pinch: null, lastTap: null };
}

// Size the canvas to its stage and recompute the base fit. The CAMERA is kept —
// a resize or a rotation mid-Slide must never snap the view anywhere.
function cldResize(view) {
  if (!view || !view.canvas || !view.ctx) return;
  const box = view.canvas.parentElement;
  if (!box || !box.clientWidth || !box.clientHeight) return;
  const w = box.clientWidth, h = box.clientHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  view.cssW = w; view.cssH = h; view.dpr = dpr;
  view.canvas.style.width  = w + 'px';
  view.canvas.style.height = h + 'px';
  view.canvas.width        = Math.floor(w * dpr);
  view.canvas.height       = Math.floor(h * dpr);
  const top = view.insetTop || 0, bottom = view.insetBottom || 0;
  view.box  = { x: 0, y: top, w: w, h: Math.max(1, h - top - bottom) };
  view.base = Math.min(view.box.w, view.box.h) / cldViewFit(view.fitR || CLD_R_STD);
  cldCamApply(view);
}

// The camera → the view's effective transform, and the visible region in
// LOGICAL units (what the water has to cover).
function cldCamApply(view) {
  const c = view.cam, s = view.base * c.z;
  view.scale = s;
  view.offX  = view.box.x + view.box.w / 2 - c.x * s;
  view.offY  = view.box.y + view.box.h / 2 - c.y * s;
  if (view.ctx) view.ctx.setTransform(s * view.dpr, 0, 0, s * view.dpr, view.offX * view.dpr, view.offY * view.dpr);
  view.x = -view.offX / s;
  view.y = -view.offY / s;
  view.w = (view.cssW || view.box.w || CLD_W) / s;
  view.h = (view.cssH || view.box.h || CLD_H) / s;
}

// A fresh floe (a Floe-Off, an Ice Bath): fit to it and open on the whole of it.
function cldCamFrame(view, radius) {
  if (!view) return;
  view.fitR = radius || CLD_R_STD;
  if (view.box.w) view.base = Math.min(view.box.w, view.box.h) / cldViewFit(view.fitR);
  cldCamOverview(view, true);
}

// The start of every Slide: the whole floe, held CLD_CAM_OVERVIEW_S. Also ends
// manual control — a pinch lasts until the next Slide (spec § 3.3).
function cldCamOverview(view, snap) {
  if (!view) return;
  const c = view.cam;
  c.manual = false;
  c.tx = CLD_W / 2; c.ty = CLD_H / 2; c.tz = 1;
  c.holdUntil = c.clock + CLD_CAM_OVERVIEW_S;
  if (snap || cldReducedMotion()) { c.x = c.tx; c.y = c.ty; c.z = c.tz; }
  cldCamApply(view);
}

// PURE. Frame `points` with `pad` round them inside `box` at base scale `base`;
// zoom clamped to [1, zmax]; the centre never further than
// CLD_CAM_CENTRE_LIM × radius from the floe's.
function cldCamFit(points, pad, box, base, zmax, radius) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  points.forEach(p => { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); });
  const w = x1 - x0 + 2 * pad, h = y1 - y0 + 2 * pad;
  const z = Math.max(1, Math.min(zmax, box.w / (w * base), box.h / (h * base)));
  let x = (x0 + x1) / 2, y = (y0 + y1) / 2;
  const dx = x - CLD_W / 2, dy = y - CLD_H / 2, d = Math.hypot(dx, dy), lim = CLD_CAM_CENTRE_LIM * radius;
  if (d > lim) { x = CLD_W / 2 + dx / d * lim; y = CLD_H / 2 + dy / d * lim; }
  return { x: x, y: y, z: z };
}

// What the camera wants this frame (spec § 3.3's table), or null to hold still.
function cldCamTarget(view, m, phase) {
  const c = view.cam, prev = c.prev || {}, now = {};
  m.penguins.forEach(p => { now[p.id] = { x: p.x, y: p.y }; });
  c.prev = now;
  const mine = m.penguins.filter(p => p.me && !p.drowned);
  if (phase === 'aiming') {
    if (!mine.length) return { x: CLD_W / 2, y: CLD_H / 2, z: 1 };
    return { x: CLD_W / 2 + (mine[0].x - CLD_W / 2) * CLD_CAM_AIM_LEAN,
             y: CLD_H / 2 + (mine[0].y - CLD_H / 2) * CLD_CAM_AIM_LEAN, z: CLD_CAM_AIM_Z };
  }
  if (phase === 'resolving') {
    const pts = m.penguins.filter(p => prev[p.id] &&
      Math.hypot(p.x - prev[p.id].x, p.y - prev[p.id].y) > CLD_CAM_MOVE_EPS).map(p => ({ x: p.x, y: p.y }));
    mine.forEach(p => pts.push({ x: p.x, y: p.y }));
    if (pts.length < 2) return null;
    return cldCamFit(pts, CLD_CAM_SLIDE_PAD, view.box, view.base, CLD_CAM_SLIDE_Z, m.radius || CLD_R_STD);
  }
  return { x: CLD_W / 2, y: CLD_H / 2, z: 1 };
}

// One frame. The camera NEVER moves while a finger is down (`frozen`): a camera
// that frames the aim feeds back into the aim (the style prototype found it).
function cldCamStep(view, dtS, target, frozen) {
  if (!view) return;
  const c = view.cam;
  c.clock += dtS;
  if (!frozen && !c.manual && c.clock >= c.holdUntil && target) { c.tx = target.x; c.ty = target.y; c.tz = target.z; }
  if (!frozen) {
    const k = cldReducedMotion() ? 1 : 1 - Math.exp(-CLD_CAM_EASE * dtS);
    c.x += (c.tx - c.x) * k; c.y += (c.ty - c.y) * k; c.z += (c.tz - c.z) * k;
  }
  cldCamApply(view);
}

// Two fingers pinch and pan; one finger always aims. Returns true when the camera
// took the event — the caller then drops any aim in progress WITHOUT arming it.
// A double-tap hands the camera back to auto (and still does what a tap does).
function cldCamPointer(view, e, kind) {
  if (!view) return false;
  const c = view.cam, id = e.pointerId === undefined ? 'mouse' : e.pointerId;
  const at = { x: e.clientX, y: e.clientY };
  if (!view.ptrs) view.ptrs = new Map();
  if (kind === 'down') {
    view.ptrs.set(id, at);
    if (view.ptrs.size >= 2) {
      const pq = [...view.ptrs.values()], p = pq[0], q = pq[1];
      view.pinch = { d: Math.hypot(p.x - q.x, p.y - q.y) || 1, z: c.z,
                     mid: { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }, x: c.x, y: c.y };
      c.manual = true;
      return true;
    }
    const t = e.timeStamp || 0, last = view.lastTap;
    if (last && t - last.t < CLD_CAM_TAP_MS && Math.hypot(at.x - last.x, at.y - last.y) < CLD_CAM_TAP_PX) {
      view.lastTap = null;
      cldCamOverview(view, false);
      c.holdUntil = c.clock;                       // straight back to auto, no overview hold
    } else view.lastTap = { t: t, x: at.x, y: at.y };
    return false;
  }
  if (kind === 'move') {
    if (view.ptrs.has(id)) view.ptrs.set(id, at);
    if (!view.pinch || view.ptrs.size < 2) return false;
    const pq = [...view.ptrs.values()], p = pq[0], q = pq[1];
    const d = Math.hypot(p.x - q.x, p.y - q.y), mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
    c.z = c.tz = Math.max(CLD_CAM_Z_MIN, Math.min(CLD_CAM_Z_MAX, view.pinch.z * d / view.pinch.d));
    const s = view.base * c.z;
    c.x = c.tx = view.pinch.x - (mid.x - view.pinch.mid.x) / s;
    c.y = c.ty = view.pinch.y - (mid.y - view.pinch.mid.y) / s;
    cldCamApply(view);
    return true;
  }
  view.ptrs.delete(id);
  if (view.pinch) { if (view.ptrs.size < 2) view.pinch = null; return true; }   // the rest of a pinch never aims
  return false;
}
```

Add `cldCancelDrag` beside `cldPointerDown`:

```js
// A pinch took over mid-aim: drop the drag without arming anything.
function cldCancelDrag() {
  cldDragging = false; cldPtrId = null; cldDragPenguin = null;
  cldDragFrom = cldDragTo = null; cldDragDir = null;
  cldSyncFloeUI();
}
```

Make the camera see every pointer event first (in every phase, so a Slide can be pinched):
- `cldPointerDown(e)`: first line becomes `if (cldCamPointer(cldView, e, 'down')) { cldCancelDrag(); return; }`, before the existing `if (cldPhase !== 'aiming') return;`.
- `cldPointerMove(e)`: first line `if (cldCamPointer(cldView, e, 'move')) return;`.
- `cldPointerUp(e)`: first line `if (cldCamPointer(cldView, e, 'up')) return;`.

`cldLoop`: replace `if (!paused) cldClock += dt;` and `cldDraw(cldView, cldFloeModel());` with:

```js
  if (!paused && !cldReducedMotion()) cldClock += dt;      // idle sway stands still under reduced motion
  const m = cldFloeModel();
  cldCamStep(cldView, paused ? 0 : dt,
    cldCamTarget(cldView, m, cldPhase === 'aiming' ? 'aiming' : cldPhase === 'resolving' ? 'resolving' : 'overview'),
    cldDragging);
  cldDraw(cldView, m);
```

`cldShowFloe`: after `cldResize(cldView);` add:

```js
  // A fresh floe (slide 0 of a Floe-Off or an Ice Bath) is framed; every other
  // Slide opens on the overview, which also ends any pinch (spec § 3.3).
  if (cldSlideNo === 0) cldCamFrame(cldView, cldFloeRadius); else cldCamOverview(cldView, false);
```

`cldBeginPlayback`: after `cldArmPlayback(tl);` add `if (cldView) cldView.cam.holdUntil = cldView.cam.clock + CLD_CAM_SLIDE_HOLD_S;`.

`cldFloeModel`: the selection ring only means something while you can still aim (the folded SW v244 minor):

```js
    selectedId: (standing.length > 1 && cldPhase === 'aiming' && !cldCommitted) ? cldDefaultPenguin(standing, cldMyAims).id : null,
```

At the very end of `cldDraw` (after the snowball marker), add:

```js
  if (view.cam && view.box && view.box.w && (view.cam.manual || view.cam.z > CLD_CAM_MAP_Z)) cldDrawMiniMap(view, m);
```

and the function after `cldDraw`:

```js
// Screen space, top-left of the box: the floe, a dot per penguin (yours ringed
// white), and the rectangle the camera is showing.
function cldDrawMiniMap(view, m) {
  const ctx = view.ctx, R = m.radius || CLD_R_STD, mr = 30;
  const mx = 16 + mr, my = view.box.y + 12 + mr, k = mr / (R + 6);
  ctx.save();
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  ctx.fillStyle = 'rgba(8,36,56,0.55)';
  ctx.beginPath(); ctx.arc(mx, my, mr + 5, 0, CLD_TAU); ctx.fill();
  ctx.fillStyle = '#e9f6fb';
  ctx.beginPath(); ctx.arc(mx, my, mr, 0, CLD_TAU); ctx.fill();
  m.penguins.forEach(p => {
    ctx.fillStyle = cldTintOf(p.ownerIdx);
    ctx.beginPath(); ctx.arc(mx + (p.x - CLD_W / 2) * k, my + (p.y - CLD_H / 2) * k, p.me ? 3.2 : 2.4, 0, CLD_TAU); ctx.fill();
    if (p.me) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.stroke(); }
  });
  const x0 = Math.max(-R, view.x - CLD_W / 2), x1 = Math.min(R, view.x + view.w - CLD_W / 2);
  const y0 = Math.max(-R, (view.box.y - view.offY) / view.scale - CLD_H / 2);
  const y1 = Math.min(R, (view.box.y + view.box.h - view.offY) / view.scale - CLD_H / 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.2;
  ctx.strokeRect(mx + x0 * k, my + y0 * k, (x1 - x0) * k, (y1 - y0) * k);
  ctx.restore();
}
```

In the Wiring block, capture pointers on the floe stage (the folded SW v244 minor: a mouse drag off the stage no longer ends early), and drop `pointerleave`:

```js
  const stage = document.getElementById('cld-stage');
  if (stage) {
    stage.addEventListener('pointerdown', e => {
      try { if (e.pointerId !== undefined) stage.setPointerCapture(e.pointerId); } catch (_) {}
      cldPointerDown(e);
    });
    stage.addEventListener('pointermove', cldPointerMove);
    stage.addEventListener('pointerup', cldPointerUp);
    stage.addEventListener('pointercancel', cldPointerUp);
  }
```

The Arena gets its camera in Task 7. Until then `cldPrLoop` keeps drawing through `cldPrView` at zoom 1. In `cldPracticeStart`, after `cldResize(cldPrView);`, add `cldCamFrame(cldPrView, cldArenaRun(() => cldFloeRadius || CLD_R_STD));` so section K's framing check holds.

- [ ] **Step 4: Run the harnesses**

Run: `node tools/verify-cld-practice.js && node tools/verify-cld-loopback.js && node tools/verify-cld-loop.js`
Expected: all green. The loopback still passes, because clients now call `cldCamFrame`/`cldCamOverview` through `cldShowFloe` and those only touch the view.

- [ ] **Step 5: Add camera mutants**

Append to `M` in `tools/mutate-cld.js`:

```js
// ── SW v245: the camera (verify-cld-practice.js) ────────────────────────────
['camera-follows-a-finger', 'game', [[
  '  if (!frozen && !c.manual && c.clock >= c.holdUntil && target) { c.tx = target.x; c.ty = target.y; c.tz = target.z; }\n  if (!frozen) {',
  '  if (!c.manual && c.clock >= c.holdUntil && target) { c.tx = target.x; c.ty = target.y; c.tz = target.z; }\n  {']], 'practice'],

['a-pinch-arms-the-aim', 'game', [[
  "  if (cldCamPointer(cldView, e, 'down')) { cldCancelDrag(); return; }",
  "  if (cldCamPointer(cldView, e, 'down')) { return; }"]], 'practice'],

['resize-snaps-the-camera', 'game', [[
  '  view.base = Math.min(view.box.w, view.box.h) / cldViewFit(view.fitR || CLD_R_STD);\n  cldCamApply(view);',
  '  view.base = Math.min(view.box.w, view.box.h) / cldViewFit(view.fitR || CLD_R_STD);\n  view.cam.x = CLD_W / 2; view.cam.y = CLD_H / 2; view.cam.z = 1;\n  cldCamApply(view);']], 'practice'],
```

Run: `node tools/mutate-cld.js`
Expected: `All 37 mutants caught.`

- [ ] **Step 6: Commit**

```bash
git add js/games/cld.js tools/verify-cld-practice.js tools/mutate-cld.js
git commit -m "feat(cld): the camera — overview, aim cam, slide cam, pinch/pan, double-tap, mini-map; never moves under a finger

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Practice bots follow a plan

**Files:**
- Modify: `js/games/cld.js` — `CLD_PR_DRILLS` (~2632), `cldPrLoadDrill` (~2725), `cldPrRivalCommit` (removed), `cldPrResolve` (~2760), `cldArenaModel` (~2845), `cldBuildModel` (adds `rivalThrows`), `cldDraw` (rival throw marks)
- Modify: `tools/verify-cld-practice.js` — the drill helpers + `--tune` block + section H (~447–549)
- Modify: `tools/mutate-cld.js` — plan mutants

**Interfaces:**
- Consumes: `cldSeatSpot`, `cldAngleOf`, `cldRimPos`, `cldArenaRun` (existing).
- Produces:
  - `CLD_PR_DRILLS[key] = { name, ringSeed, place[3], plan: 'headon'|'crossfire'|'edge', power }`
  - `CLD_PR_CUT_MAX` (radians)
  - `cldPrPlanTarget(plan, i) → penguin|null`
  - `cldPrBotCommit(d, i) → commit` (call inside `cldArenaRun`)
  - `cldPrRefreshPlans()`
  - `cldPrUi.plans = [null, commit, commit]`
  - `cldPrUi.slides` (int)
  - model field `rivalThrows: [{ x, y, ownerIdx }]`
  - Slide seed `d.ringSeed * 1000 + cldPrUi.slides + 1`.

- [ ] **Step 1: Write the failing plan checks and the new tuner**

In `tools/verify-cld-practice.js`, replace everything from `function claimHolds(key) {` through the end of the `if (TUNE) { … process.exit(0); }` block with:

```js
// The drills' opening claims (spec § 3.4) — what --tune searches ring seeds for.
function collided(events, a, b) { return events.some(e => e.type === 'collision' && ((e.a === a && e.b === b) || (e.a === b && e.b === a))); }
function claimHolds(key) {
  load(key);
  if (key === 'crossfire') { resolveWith(HOLD); return arena('cldTimeline.events').some(e => e.type === 'collision' && (e.a === '0-0' || e.b === '0-0')); }
  if (key === 'headon') {
    resolveWith(HOLD);
    const ev = arena('cldTimeline.events');
    if (!collided(ev, '0-0', '1-0') && !collided(ev, '0-0', '2-0')) return false;
    for (let k = 0; k < 2 && !meNow().drowned; k++) resolveWith(HOLD);
    return !!meNow().drowned;
  }
  if (key === 'edge') { resolveWith(HOLD); if (meNow().drowned) return true; resolveWith(HOLD); return !!meNow().drowned; }
  return false;
}
function counters(key) {
  const found = [];
  for (let k = 0; k < 36; k++) for (const pw of [0.3, 0.5, 0.7, 0.9, 1]) {
    load(key); resolveWith(aimAt(k * Math.PI / 18, pw));
    if (!meNow().drowned) found.push([k * 10, pw]);
  }
  return found;
}

if (TUNE) {
  // Prints, per drill, the first ring seed at which every opening claim holds.
  // Paste the numbers into CLD_PR_DRILLS. Asserts nothing.
  const drills = G('CLD_PR_DRILLS');
  for (const key of Object.keys(drills)) {
    let hit = null;
    for (let seed = 1; seed <= 4000 && hit === null; seed++) {
      RUN(`CLD_PR_DRILLS['${key}'].ringSeed = ${seed}`);
      load(key);
      if (!startClean() || !claimHolds(key) || !counters(key).length) continue;
      hit = seed;
    }
    console.log(`${key.padEnd(10)} ringSeed: ${hit === null ? 'NONE in 1..4000 — move `place` and re-run' : hit}`);
  }
  process.exit(0);
}
```

Delete `berthReachable` (the Berth branch is gone with the one-Slide drill). Then replace section H (`if (!TUNE) { section('H. The drills'); …` up to, but not including, `// ── 9(b)/9(c)`) with:

```js
if (!TUNE) {
  section('H. The drills and their plans');
  const keys = Object.keys(G('CLD_PR_DRILLS'));
  check('three drills, in order', keys, ['headon', 'crossfire', 'edge']);
  check('each drill is a plan both bots follow', keys.map(k => G('CLD_PR_DRILLS')[k].plan), ['headon', 'crossfire', 'edge']);
  const plans = () => G('cldPrUi').plans;
  const bot = i => arena(`cldPenguins.find(p => p.ownerIdx === ${i})`);
  const aimsAt = (i, tgt) => { const a = plans()[i].aims[0], b = bot(i);
    return !!a && near(Math.atan2(a.dy, a.dx), Math.atan2(tgt.y - b.y, tgt.x - b.x), 1e-9); };
  keys.forEach(key => {
    load(key);
    ok(`${key}: nobody starts overlapping a chunk or a penguin`, startClean());
    ok(`${key}: the opening claim holds`, claimHolds(key));
    ok(`${key}: at least one counter keeps you Standing`, counters(key).length > 0, 'none of 180 aims');
    load(key); resolveWith(aimAt(0.3, 0.8)); const t1 = safeJSON(arena('[cldTimeline.samples, cldTimeline.events]'));
    load(key); resolveWith(aimAt(0.3, 0.8)); const t2 = safeJSON(arena('[cldTimeline.samples, cldTimeline.events]'));
    ok(`${key}: the same aim meets the same plan — a byte-identical Slide`, t1 === t2);
  });

  load('headon');
  ok('Head-on: BOTH bots shove straight at You, full power',
     [1, 2].every(i => aimsAt(i, meNow()) && near(plans()[i].aims[0].power, 1)));
  arena("(() => { const me = cldPenguins.find(p => p.id === '0-0'); cldSeatAt(me, cldSeatSpot(0, me.id)); })()");
  RUN('cldPrRefreshPlans()');
  ok('Head-on: they keep coming when you are a plug', [1, 2].every(i => aimsAt(i, meNow())));
  arena("cldKnockBack(cldPenguins.find(p => p.id === '0-0'))");
  RUN('cldPrRefreshPlans()');
  ok('…and when you are knocked back', [1, 2].every(i => aimsAt(i, meNow())));

  load('crossfire');
  ok('Crossfire: each bot shoves at the other', aimsAt(1, bot(2)) && aimsAt(2, bot(1)) && near(plans()[1].aims[0].power, 0.9));

  load('headon');
  arena("(() => { const b = cldPenguins.find(p => p.ownerIdx === 1); cldSeatAt(b, cldSeatSpot(Math.PI, b.id)); })()");
  RUN('cldPrRefreshPlans()');
  ok('a Drowned bot throws a Snowball at its Standing target instead',
     plans()[1].aims.length === 0 && !!plans()[1].snowball && near(plans()[1].snowball.x, meNow().x) && near(plans()[1].snowball.y, meNow().y));
  arena("(() => { const me = cldPenguins.find(p => p.id === '0-0'); cldSeatAt(me, cldSeatSpot(Math.PI / 2, me.id)); })()");
  RUN('cldPrRefreshPlans()');
  ok('…and holds when its target is in the Drink too', plans()[1].aims.length === 0 && plans()[1].snowball === null);

  // Edge: the cut sends you toward a gap (spec § 3.4: within 25° when you hold still).
  load('edge');
  const start = meNow();
  const toGap = arena(`(() => { const s = cldSeatSpot(cldAngleOf(${start.x}, ${start.y}), null);
    const g = cldRimPos(s.angle, cldFloeRadius); return Math.atan2(g.y - ${start.y}, g.x - ${start.x}); })()`);
  resolveWith(HOLD);
  const after = meNow();
  const moved = Math.atan2(after.y - start.y, after.x - start.x);
  const off = Math.abs(((moved - toGap + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
  ok('Edge: holding still, the cut sends you toward the nearest gap', after.drowned || off < 25 * Math.PI / 180,
     'off by ' + (off * 180 / Math.PI).toFixed(1) + '°');

  S.window.matchMedia = () => ({ matches: true });
  load('headon'); S.__c = HOLD; RUN('cldPrResolve(__c)');
  ok('reduced motion: the Slide is finished the moment it is committed', G('cldPrUi').playing === false);
  S.window.matchMedia = () => ({ matches: false });
```

The rest of the old section H (the `load('headon'); const r1 = …`, `Go again keeps your armed aim`, `Head-on, stand still → outcome in`, `the Berth branch …`, `a Dive arrives Plugged` lines) is deleted. The `// ── 9(b)/9(c)` isolation block that follows stays as it is.

- [ ] **Step 2: Run to see it fail**

Run: `node tools/verify-cld-practice.js`
Expected: FAIL at `each drill is a plan both bots follow` (the v244 drills have no `plan`), then a crash at `G('cldPrUi').plans` or `cldPrRefreshPlans is not defined`.

- [ ] **Step 3: Implement the plans in `js/games/cld.js`**

Replace `CLD_PR_DRILLS` and its comment with:

```js
// Three drills, each a PLAN both Sylvia and Sam follow every Slide (spec
// 2026-09-29-cld-fun-pass § 3.4). place: { at: angle, r: × floe radius }.
// ringSeed values come from `node tools/verify-cld-practice.js --tune`.
const CLD_PR_DRILLS = {
  headon:    { name: 'Head-on',   ringSeed: 4,  plan: 'headon',    power: 1.0,
               place: [{ at: 0, r: 0.62 }, { at: 0, r: 0.05 }, { at: -Math.PI / 2, r: 0.6 }] },
  crossfire: { name: 'Crossfire', ringSeed: 1,  plan: 'crossfire', power: 0.9,
               place: [{ at: 0, r: 0 }, { at: Math.PI, r: 0.6 }, { at: 0, r: 0.6 }] },
  edge:      { name: 'Edge',      ringSeed: 19, plan: 'edge',      power: 0.85,
               place: [{ at: Math.PI / 2, r: 0.8 }, { at: Math.PI, r: 0.6 }, { at: Math.PI / 2, r: 0.45 }] },
};
const CLD_PR_CUT_MAX = 70 * Math.PI / 180;   // Edge: a cut sharper than this is a straight shove instead

// Who a bot's plan is after: You (Head-on, Edge) or the other bot (Crossfire) —
// whatever state they're in. Call inside cldArenaRun.
function cldPrPlanTarget(plan, i) {
  if (plan === 'crossfire') return cldPenguins.find(q => q.ownerIdx === (i === 1 ? 2 : 1)) || null;
  return cldPenguins.find(q => q.id === '0-0') || null;
}

// PURE over the Arena record (call inside cldArenaRun). A Standing bot shoves at
// its target — Edge CUTS you toward the free gap nearest you, pool-style, by
// aiming at the ghost-ball point one diameter behind you. A Drowned bot throws
// at its target if the target is Standing, and never Dives.
function cldPrBotCommit(d, i) {
  const hold = { aims: [], dive: null, snowball: null };
  const me = cldPenguins.find(q => q.ownerIdx === i), tgt = cldPrPlanTarget(d.plan, i);
  if (!me || !tgt) return hold;
  if (me.drowned) return tgt.drowned ? hold : { aims: [], dive: null, snowball: { x: tgt.x, y: tgt.y } };
  let ax = tgt.x, ay = tgt.y;
  if (d.plan === 'edge' && !tgt.drowned) {
    const seat = cldSeatSpot(cldAngleOf(tgt.x, tgt.y), null);
    if (seat) {
      const g = cldRimPos(seat.angle, cldFloeRadius);
      const ul = Math.hypot(g.x - tgt.x, g.y - tgt.y) || 1, ux = (g.x - tgt.x) / ul, uy = (g.y - tgt.y) / ul;
      const hx = tgt.x - 2 * CLD_PENGUIN_R * ux, hy = tgt.y - 2 * CLD_PENGUIN_R * uy;
      const dl = Math.hypot(hx - me.x, hy - me.y) || 1;
      const cut = Math.acos(Math.max(-1, Math.min(1, ((hx - me.x) * ux + (hy - me.y) * uy) / dl)));
      if (cut <= CLD_PR_CUT_MAX) { ax = hx; ay = hy; }
    }
  }
  const l = Math.hypot(ax - me.x, ay - me.y);
  if (l < 1e-6) return hold;
  return { aims: [{ penguinId: me.id, dx: (ax - me.x) / l, dy: (ay - me.y) / l, power: d.power }], dive: null, snowball: null };
}

// Their next moves, worked out from the ice as it stands — drawn before you aim.
function cldPrRefreshPlans() {
  const u = cldPrUi, d = CLD_PR_DRILLS[u.drill];
  u.plans = cldArenaRun(() => [null, cldPrBotCommit(d, 1), cldPrBotCommit(d, 2)]);
}
```

Replace `cldPrLoadDrill(key, keepAim)` with a version that keeps the v244 coach state (Task 6 replaces the coach):

```js
// A fresh go at `key` on a fresh floe.
function cldPrLoadDrill(key) {
  const d = CLD_PR_DRILLS[key];
  const coach = cldPrUi ? cldPrUi.coach : cldPrCoachStart();
  cldPrFloe = cldPrFreshFloe();
  cldArenaRun(() => {
    cldStartFloeOff(d.ringSeed);                 // the real setup: radius, ring, penguins
    d.place.forEach((pl, i) => {
      const pos = cldRimPos(pl.at, cldFloeRadius * pl.r);
      cldPenguins[i].x = pos.x; cldPenguins[i].y = pos.y;
    });
  });
  cldPrUi = { drill: key, aim: null, lock: null, mode: 'throw', snowball: null, dive: null,
              playing: false, outcome: null, knocked: false, slides: 0, plans: [null, null, null],
              drag: null, coach: coach };
  cldPrRefreshPlans();
  if (cldPrView) cldCamFrame(cldPrView, cldArenaRun(() => cldFloeRadius));
}
```

Delete `cldPrRivalCommit`. In `cldPrResolve`, replace the `cldCommits = …` and `cldResolveSlide(d.slideSeed)` with:

```js
    cldCommits = [mine, u.plans[1], u.plans[2]];
    cldArmPlayback(cldTimelineFromPayload(cldTimelinePayload(cldResolveSlide(d.ringSeed * 1000 + u.slides + 1))));
```

and add `u.slides += 1;` after `u.playing = true;`. At the end of `cldPrSlideDone`, add `cldPrRefreshPlans();`.

Every existing call `cldPrLoadDrill(x, true|false)` drops its second argument.

In `cldArenaModel`, replace the rival-aims line and pass the rival throws:

```js
      u.plans.forEach(c => { if (c && c.aims[0] && standing(c.aims[0].penguinId)) aims.push(Object.assign({}, c.aims[0], { live: false, rival: true })); });
```

and add to the `cldBuildModel` ui object: `rivalThrows: u.playing ? [] : u.plans.map((c, i) => c && c.snowball ? { x: c.snowball.x, y: c.snowball.y, ownerIdx: i } : null).filter(Boolean),`.

In `cldBuildModel`'s return object add `rivalThrows: ui.rivalThrows || [],`. In `cldDraw`, before `// ── The snowball target marker`, add:

```js
  // A Drowned rival's next Snowball (Practice): a small cross in its colour.
  (m.rivalThrows || []).forEach(s => {
    ctx.save();
    ctx.strokeStyle = cldTintOf(s.ownerIdx); ctx.globalAlpha = 0.7; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(s.x, s.y, 6, 0, CLD_TAU);
    ctx.moveTo(s.x - 9, s.y); ctx.lineTo(s.x + 9, s.y); ctx.moveTo(s.x, s.y - 9); ctx.lineTo(s.x, s.y + 9);
    ctx.stroke(); ctx.restore();
  });
```

- [ ] **Step 4: Tune the ring seeds**

Run: `node tools/verify-cld-practice.js --tune`
Expected: one `ringSeed: N` line per drill. Paste the three numbers into `CLD_PR_DRILLS`.
- **If a drill prints `NONE`:** move that drill's `place` (keep the drill's idea, nudge the radii by ±0.1 or the bot angles by ±0.3), then re-run. Record the final `place` values.

- [ ] **Step 5: Run the harnesses**

Run: `node tools/verify-cld-practice.js && node tools/verify-cld-loopback.js`
Expected: green.
- **If a section K or L check fails because the v244 one-Slide flow moved:** that's expected only for checks that name `Go again`, `Resurface`, `rivalAims` or `outcome`. Update those to the new field names (`plans`) and leave the rest for Task 6. No other failure is acceptable.

- [ ] **Step 6: Plan mutants**

Append to `M` in `tools/mutate-cld.js`:

```js
// ── SW v245: the Practice plans (verify-cld-practice.js) ────────────────────
['one-bot-sits-out', 'game', [[
  '  u.plans = cldArenaRun(() => [null, cldPrBotCommit(d, 1), cldPrBotCommit(d, 2)]);',
  "  u.plans = cldArenaRun(() => [null, cldPrBotCommit(d, 1), { aims: [], dive: null, snowball: null }]);"]], 'practice'],

['headon-gives-up-on-a-plug', 'game', [[
  '  if (!me || !tgt) return hold;',
  '  if (!me || !tgt || tgt.drowned) return hold;']], 'practice'],

['crossfire-targets-you', 'game', [[
  "  if (plan === 'crossfire') return cldPenguins.find(q => q.ownerIdx === (i === 1 ? 2 : 1)) || null;",
  "  if (plan === 'nope') return null;"]], 'practice'],
```

Run: `node tools/mutate-cld.js`
Expected: `All 40 mutants caught.`

- [ ] **Step 7: Commit**

```bash
git add js/games/cld.js tools/verify-cld-practice.js tools/mutate-cld.js
git commit -m "feat(cld): Practice bots follow a plan — Head-on, Crossfire, Edge's cut; both bots, every Slide, telegraphed

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Practice rounds and the reactive coach

**Files:**
- Modify: `js/games/cld.js` — `CLD_PR_COACH`, `cldPrCoachStart`, `cldPrCoach`, `cldPrCoachView` (~2647–2713), `cldPrLoadDrill`, `cldPrResolve`, `cldPrSlideDone` (~2784), `cldPrCanCommit`, `cldPrAction` (~2915), `cldPrSyncUI` (~2950), wiring (`btn-cld-pr-resurface` → `btn-cld-pr-restart`)
- Modify: `src/screens/cld.html` — the Practice body's bottom row and a new end card in `#cld-pr-stage`
- Modify: `css/styles.css:2711` — the transition selector's `#btn-cld-pr-resurface` → `#btn-cld-pr-restart`
- Modify: `tools/verify-cld-practice.js` — sections I, K and L; a new section H3
- Modify: `docs/game-identities/cld.md` — T7b Practice blocks, T7a Practice description

**Interfaces:**
- Consumes: `cldPrRefreshPlans`, `cldPrUi.plans`, `cldPrUi.slides` (Task 5); `cldCamFrame`, `cldCamOverview` (Task 4).
- Produces:
  - `CLD_PR_SLIDE_CAP = 40`
  - `CLD_PR_COACH` keys: `intro.headon`, `intro.crossfire`, `intro.edge`, `aim`, `armed`, `again`, `meIn`, `meKnocked`, `botIn`, `bath`, `win`, `lose`, `draw`
  - coach state `{ key, name, slide, armedOnce, lockedOnce }`
  - `cldPrCoachStart(drill)`
  - `cldPrCoach(s, ev)` with events `load{drill}`, `armed`, `locked`, `committed`, `slideDone{ meIn, meKnocked, botIn, bath, winner, winnerName, draw }`
  - `cldPrCoachView(s) → { line, step, ring }`, with ring one of `'stage' | 'power' | 'commit' | 'dive' | 'again' | null`
  - `cldPrUi.end = null | { winner, draw }`
  - `cldPrUi.before` (snapshot)
  - actions `'restart'`, `'again'`
  - DOM ids `#cld-pr-end`, `#cld-pr-end-line`, `#btn-cld-pr-restart`, and `#btn-cld-pr-again` (now inside the end card).

- [ ] **Step 1: Write the failing coach checks**

Replace section I (`if (!TUNE) { section('I. The coach'); … }`) with:

```js
if (!TUNE) {
  section('I. The coach');
  const C = G('CLD_PR_COACH');
  const start = d => RUN('cldPrCoachStart')(d || 'headon');
  const step = (s, ...evs) => evs.reduce((acc, e) => RUN('cldPrCoach')(acc, e), s);
  const view = s => RUN('cldPrCoachView')(s);
  const D = x => Object.assign({ type: 'slideDone' }, x || {});
  let s = start('headon');
  check('opens on the drill’s plan plus how to aim, Slide 1, ring on the stage',
    [view(s).line, view(s).step, view(s).ring], [C['intro.headon'] + ' ' + C.aim, 'Slide 1', 'stage']);
  s = step(s, { type: 'armed' });
  check('the first arm teaches the lock, ring on Power', [view(s).line, view(s).ring], [C.armed, 'power']);
  s = step(s, { type: 'locked' });
  check('locked → ring on Lock It In', view(s).ring, 'commit');
  s = step(s, { type: 'committed' }, D());
  check('a quiet first Slide → "Same plan every Slide", Slide 2', [view(s).line, view(s).step], [C.again, 'Slide 2']);
  check('a later arm never repeats the lock tip', view(step(s, { type: 'armed' })).line, C.again);
  check('going in', view(step(s, D({ meIn: true }))).line, C.meIn);
  check('knocked back outranks going in, ring on Dive',
    [view(step(s, D({ meIn: true, meKnocked: true }))).line, view(step(s, D({ meKnocked: true }))).ring], [C.meKnocked, 'dive']);
  check('a bot going in is named', view(step(s, D({ botIn: 'Sylvia' }))).line, C.botIn.replace('{Name}', 'Sylvia'));
  check('a Washout → the Ice Bath line', view(step(s, D({ bath: true, meIn: true }))).line, C.bath);
  check('you win', view(step(s, D({ winner: 0 }))).line, C.win);
  check('a bot wins, by name', view(step(s, D({ winner: 2, winnerName: 'Sam' }))).line, C.lose.replace('{Name}', 'Sam'));
  check('the cap is a draw', view(step(s, D({ draw: true }))).line, C.draw);
  check('an ending rings Practice again', view(step(s, D({ winner: 0 }))).ring, 'again');
  const loaded = step(step(start('headon'), { type: 'armed' }), { type: 'load', drill: 'edge' });
  check('a new drill shows its own plan, and never re-teaches an arm you already did',
    [view(loaded).line, view(loaded).step], [C['intro.edge'], 'Slide 1']);
  const frozen = start(); step(frozen, { type: 'armed' });
  check('the reducer never mutates its input', frozen.armedOnce, false);
  ok('every coach line is set and emoji-free', Object.values(C)
     .every(l => typeof l === 'string' && l.length > 10 && !/\p{Extended_Pictographic}/u.test(l)));
  check('exactly the spec’s thirteen lines', Object.keys(C).sort(),
    ['aim', 'again', 'armed', 'bath', 'botIn', 'draw', 'intro.crossfire', 'intro.edge', 'intro.headon', 'lose', 'meIn', 'meKnocked', 'win']);
}
```

Add a new section after the `H2. Isolation` block and before section I:

```js
if (!TUNE) {
  section('H3. Rounds play to a natural end');
  // Four scripted players (spec § 3.4). Each returns MY commit for Slide k.
  const angleTo = expr => arena(`(() => { const me = cldPenguins.find(p => p.id === '0-0'); if (me.drowned) return null;
    const t = ${expr}; return t ? Math.atan2(t.y - me.y, t.x - me.x) : null; })()`);
  const POLICIES = {
    hold:    () => HOLD,
    random:  k => aimAt((k * 2.39996) % (2 * Math.PI), 0.35 + (k % 5) * 0.15),
    nearest: () => { const a = angleTo(`cldPenguins.filter(p => p.ownerIdx !== 0 && !p.drowned)
                       .sort((p, q) => Math.hypot(p.x - me.x, p.y - me.y) - Math.hypot(q.x - me.x, q.y - me.y))[0]`);
                     return a === null ? HOLD : aimAt(a, 0.8); },
    centre:  () => { const a = angleTo('({ x: CLD_W / 2, y: CLD_H / 2 })'); return a === null ? HOLD : aimAt(a, 0.5); },
  };
  const cap = G('CLD_PR_SLIDE_CAP');
  let worst = 0, allEnded = true, draws = [];
  for (const key of ['headon', 'crossfire', 'edge']) for (const name of Object.keys(POLICIES)) {
    load(key);
    let k = 0;
    while (!G('cldPrUi').end && k < cap + 5) { resolveWith(POLICIES[name](k)); k++; }
    const end = G('cldPrUi').end;
    if (!end) allEnded = false;
    if (end && end.draw) draws.push(key + '/' + name);
    worst = Math.max(worst, k);
  }
  ok('every drill ends against every scripted player', allEnded);
  check('…and none of them reaches the draw cap', draws, []);
  ok('…the longest took ' + worst + ' Slides, well inside the cap of ' + cap, worst < cap * 0.75);

  // A Washout starts the REAL Ice Bath in the Arena and the round carries on.
  load('headon');
  arena("(() => { cldTimeline = { washout: true, bathIds: cldPenguins.map(p => p.id), floeOffOver: false, winnerIdx: -1 }; })()");
  RUN('cldPrUi.before = cldArenaRun(() => cldPenguins.map(p => ({ id: p.id, drowned: false, plug: false })))');
  RUN('cldPrUi.playing = true'); RUN('cldPrSlideDone()');
  ok('a Washout starts the real Ice Bath in the Arena', arena('cldInBath') === true && G('cldPrUi').end === null);
  check('…and the coach says so', G('cldPrUi').coach.key, 'bath');

  // The cap: a drill with cap 1 ends in a draw after one quiet Slide.
  load('crossfire');
  RUN("CLD_PR_DRILLS.crossfire.cap = 1");
  resolveWith(aimAt(Math.PI / 2, 0.08));
  const e1 = G('cldPrUi').end;
  RUN("delete CLD_PR_DRILLS.crossfire.cap");
  ok('the cap calls a still-running round a draw', !!e1 && (e1.draw === true || e1.winner >= 0));
}
```

In section K, replace its body from `check('it opens on Head-on, 1 / 5', …` through the end of section K with:

```js
  check('it opens on Head-on, Slide 1', [G('cldPrUi').drill, $('cld-pr-coach-step').textContent], ['headon', 'Slide 1']);
  ok('the soft ring is on the stage', stage.classList.contains('cld-pr-ring'));
  check('Lock It In waits for an aim', $('btn-cld-pr-commit').disabled, true);
  const v = G('cldPrView');
  const ev = (x, y) => ({ clientX: v.offX + x * v.scale, clientY: v.offY + y * v.scale, pointerId: 7 });
  const you = arena("cldPenguins.find(p => p.id === '0-0')");
  const fx = you.x + 60, fy = you.y, PULL = G('CLD_CUE_PULL_PX');
  RUN('cldPrPointerDown')(ev(fx, fy));
  RUN('cldPrPointerMove')(ev(fx + PULL / v.scale, fy));
  RUN('cldPrPointerUp')(ev(fx + PULL / v.scale, fy));
  const aim = G('cldPrUi').aim;
  ok('a full pull on the Arena stage arms a full-power shot away from the finger',
     aim && near(aim.dx, -1) && near(aim.power, 1, 1e-6), JSON.stringify(aim));
  check('the coach teaches the lock and rings Power',
    [$('cld-pr-coach-line').textContent, $('btn-cld-pr-power').classList.contains('cld-pr-ring')], [G('CLD_PR_COACH').armed, true]);
  RUN("cldPrAction('power')");
  ok('Power locks and the ring moves to Lock It In', near(G('cldPrUi').lock, 1, 1e-6) && $('btn-cld-pr-commit').classList.contains('cld-pr-ring'));
  RUN("cldPrAction('cta')");
  check('committing starts the Slide', [G('cldPrUi').playing, $('btn-cld-pr-commit').textContent], [true, 'Sliding…']);
  // Review Focus 4 — the end card never shows while a Slide is still playing.
  RUN("CLD_PR_DRILLS.headon.cap = 1");
  let sawEndWhilePlaying = false, g = 0;
  while (G('cldPrUi').playing && g++ < 4000) {
    RUN('cldPrLoop')(1000 + g * 50);
    if (G('cldPrUi').playing && $('cld-pr-end').style.display === 'flex') sawEndWhilePlaying = true;
  }
  RUN("delete CLD_PR_DRILLS.headon.cap");
  ok('the loop plays the Slide out', !G('cldPrUi').playing);
  ok('the end card never showed while the Slide played', !sawEndWhilePlaying);
  check('with the round over, the end card shows the coach’s last line',
    [$('cld-pr-end').style.display, $('cld-pr-end-line').textContent, $('btn-cld-pr-commit').style.display],
    ['flex', $('cld-pr-coach-line').textContent, 'none']);
  RUN("cldPrAction('again')");
  check('Practice again: the same drill, a fresh floe', [G('cldPrUi').drill, G('cldPrUi').slides, G('cldPrUi').end, $('cld-pr-end').style.display],
        ['headon', 0, null, 'none']);
  RUN("cldPrAction('restart')");
  check('Start over resets the drill and your aim', [G('cldPrUi').slides, G('cldPrUi').aim], [0, null]);
  RUN("cldPrAction('drill', 'edge')");
  check('a drill pill switches and shows its plan', [G('cldPrUi').drill, $('cld-pr-coach-line').textContent], ['edge', G('CLD_PR_COACH')['intro.edge']]);

  // In the Drink: the Throw · Dive row, a Snowball tap, the amber reason.
  load('headon');
  for (let k = 0; k < 4 && !meNow().drowned && !G('cldPrUi').end; k++) resolveWith(HOLD);
  RUN('cldPrSyncUI()');
  if (meNow().drowned && !G('cldPrUi').end) {
    check('in the Drink: the Throw · Dive row shows', $('cld-pr-drowned-row').style.display, 'flex');
    check('…and Lock It In is always open to you', $('btn-cld-pr-commit').disabled, false);
    const sy = arena("cldPenguins.find(p => p.id === '1-0')");
    RUN('cldPrPointerDown')(ev(sy.x, sy.y)); RUN('cldPrPointerUp')(ev(sy.x, sy.y));
    ok('a tap aims a Snowball', !!G('cldPrUi').snowball);
    if (meNow().plug) {
      RUN("cldPrAction('mode', 'dive')");
      check('Plugged: Dive is refused, with the amber reason', [G('cldPrUi').mode, $('cld-pr-dive-reason').textContent],
            ['throw', 'You can Dive once you’re knocked back.']);
    }
  } else ok('Head-on puts you in the Drink within four still Slides', false, 'retune Head-on (Task 5 Step 4)');

  RUN('cldResetState()');
  check('cldResetState clears the Arena', [G('cldPrUi'), G('cldPrRaf'), G('cldPrFloe')], [null, null, null]);
  check('the Arena sent nothing, start to finish', sent.envelope + sent.private - sentAtStart, 0);
}
```

Replace section L entirely with:

```js
if (!TUNE) {
  section('L. Folded-in minors and the Arena’s own camera');
  const $ = id => S.document.getElementById(id);
  const stage = $('cld-pr-stage'), canvas = $('cld-pr-canvas');
  canvas.parentElement = stage; stage.clientWidth = 300; stage.clientHeight = 300;
  RUN('cldResetState()');
  RUN('cldAimAssist = true'); RUN("cldSetHowtoTab('practice')");
  RUN("cldSetHowtoTab('rules')"); RUN('cldAimAssist = false'); RUN("cldSetHowtoTab('practice')");
  check('the Arena reads Aim Assist on every open', arena('cldAimAssist'), false);
  RUN('cldAimAssist = true');
  const c0 = G('cldPrClock');
  S.window.matchMedia = () => ({ matches: true });
  RUN('cldPrLoop')(5000); RUN('cldPrLoop')(5050);
  check('under reduced motion the Arena’s idle clock stands still', G('cldPrClock'), c0);
  S.window.matchMedia = () => ({ matches: false });
  RUN('cldResetState()');
}
```

In section J, change `ok('How to Play step 2 teaches the cue', …)` only if Step 3 below changes step 2. It doesn't, so leave it.

- [ ] **Step 2: Run to see it fail**

Run: `node tools/verify-cld-practice.js`
Expected: FAIL in section I at the first `check` (`CLD_PR_COACH['intro.headon']` is undefined) and a crash in H3 at `CLD_PR_SLIDE_CAP`.

- [ ] **Step 3: Implement rounds and the coach in `js/games/cld.js`**

Replace `CLD_PR_COACH` through `cldPrCoachDispatch` with:

```js
// The coach (spec 2026-09-29-cld-fun-pass § 3.5) REACTS to what happened — a
// pure reducer over events, one line at a time. Lines are copy, mirrored
// verbatim in docs/game-identities/cld.md T7b (a paired change). {Name} is
// filled at runtime from CLD_PR_CAST.
const CLD_PR_COACH = {
  'intro.headon':    'Sylvia and Sam are coming straight for you — every Slide, full power. Dodge them, or meet them.',
  'intro.crossfire': 'Sylvia and Sam only want each other, and you’re in the middle. Get out of the way — or use it.',
  'intro.edge':      'They’ll try to cut you into the nearest gap. Keep ice between you and the water.',
  aim:               'Touch anywhere and pull back — the shot goes the other way. Their next shoves are drawn in their colours.',
  armed:             'The dots show your first hit. Tap Power to lock it, then Lock It In.',
  again:             'Same plan every Slide. Read it, and counter it.',
  meIn:              'You’re in the Drink, plugging the gap you went through. The next penguin to hit you bounces off harder. Tap the ice to aim a Snowball.',
  meKnocked:         'Knocked back — now it’s Throw or Dive. Dive into a free gap to plug it again.',
  botIn:             '{Name}’s in the Drink — a plug now. Hit it and you bounce back harder.',
  bath:              'Everyone went in at once — into the Ice Bath. Last one dry still wins.',
  win:               'Last one dry — that’s a Fish.',
  lose:              '{Name}’s the last one dry. Practice again, or try another drill.',
  draw:              'Nobody’s budging. Call it a draw.',
};
const CLD_PR_SLIDE_CAP = 40;    // a round still running after this many Slides is a draw (spec § 3.4)

function cldPrCoachStart(drill) {
  return { key: 'intro.' + (drill || 'headon'), name: null, slide: 1, armedOnce: false, lockedOnce: false };
}

// PURE. The first matching line wins; otherwise the last line stays.
function cldPrCoach(s, ev) {
  const n = Object.assign({}, s);
  switch (ev.type) {
    case 'load':    return Object.assign(cldPrCoachStart(ev.drill), { armedOnce: s.armedOnce, lockedOnce: s.lockedOnce });
    case 'armed':   if (!s.armedOnce) { n.armedOnce = true; n.key = 'armed'; } return n;
    case 'locked':  n.lockedOnce = true; return n;
    case 'committed': return n;
    case 'slideDone':
      n.slide = s.slide + 1; n.name = null;
      if (ev.winner !== undefined && ev.winner !== null) { n.key = ev.winner === 0 ? 'win' : 'lose'; n.name = ev.winnerName || null; return n; }
      if (ev.draw)      { n.key = 'draw'; return n; }
      if (ev.bath)      { n.key = 'bath'; return n; }
      if (ev.meKnocked) { n.key = 'meKnocked'; return n; }
      if (ev.meIn)      { n.key = 'meIn'; return n; }
      if (ev.botIn)     { n.key = 'botIn'; n.name = ev.botIn; return n; }
      if (s.slide === 1) { n.key = 'again'; return n; }
      return n;
  }
  return n;
}

function cldPrCoachView(s) {
  const C = CLD_PR_COACH, k = s.key;
  let line = (C[k] || C.again).replace('{Name}', s.name || '');
  if (k.indexOf('intro.') === 0 && !s.armedOnce) line += ' ' + C.aim;
  const ring = (k.indexOf('intro.') === 0 && !s.armedOnce) ? 'stage'
             : k === 'armed' ? (s.lockedOnce ? 'commit' : 'power')
             : k === 'meIn' ? 'stage' : k === 'meKnocked' ? 'dive'
             : (k === 'win' || k === 'lose' || k === 'draw') ? 'again' : null;
  return { line: line, step: 'Slide ' + s.slide, ring: ring };
}

function cldPrCoachDispatch(ev) { if (cldPrUi) cldPrUi.coach = cldPrCoach(cldPrUi.coach, ev); }
```

In `cldPrLoadDrill`, replace `const coach = cldPrUi ? cldPrUi.coach : cldPrCoachStart();` with
`const coach = cldPrUi ? cldPrCoach(cldPrUi.coach, { type: 'load', drill: key }) : cldPrCoachStart(key);`
and in the `cldPrUi = { … }` literal replace `outcome: null, knocked: false,` with `end: null, before: null,`.

In `cldPrResolve`, before the `cldArenaRun(() => { cldCommits = …`, add:

```js
  u.before = cldArenaRun(() => cldPenguins.map(p => ({ id: p.id, drowned: !!p.drowned, plug: !!p.plug })));
```

and change the coach dispatch to `cldPrCoachDispatch({ type: 'committed' });`. After `u.slides += 1;` add `if (cldPrView) cldPrView.cam.holdUntil = cldPrView.cam.clock + CLD_CAM_SLIDE_HOLD_S;`.

Replace `cldPrSlideDone` with:

```js
// The Slide has played out: settle it, then decide what the round is now — an
// Ice Bath (the real rule), a winner, a draw at the cap, or the next Slide.
function cldPrSlideDone() {
  const u = cldPrUi, d = CLD_PR_DRILLS[u.drill];
  const res = cldArenaRun(() => {
    const tl = cldTimeline;
    cldPenguins.forEach(p => { p.plungedThisSlide = false; });
    if (tl && tl.post) cldApplyPost(tl.post);
    const was = id => (u.before || []).find(b => b.id === id) || { drowned: false, plug: false };
    const me = cldPenguins.find(p => p.id === '0-0');
    const out = {
      meIn: !!me.drowned && !was('0-0').drowned,
      meKnocked: !!me.drowned && !me.plug && (!was('0-0').drowned || was('0-0').plug),
      botIn: null, bath: false, winner: null, draw: false,
    };
    const bot = cldPenguins.find(p => p.ownerIdx !== 0 && p.drowned && !was(p.id).drowned);
    if (bot) out.botIn = CLD_PR_CAST[bot.ownerIdx];
    if (tl && tl.washout) { cldStartIceBath(tl.bathIds || [], d.ringSeed * 7919 + u.slides); out.bath = true; }
    else if (tl && tl.floeOffOver && tl.winnerIdx >= 0) out.winner = tl.winnerIdx;
    out.radius = cldFloeRadius;
    return out;
  });
  u.playing = false; u.snowball = null; u.dive = null;
  if (res.winner === null && !res.bath && u.slides >= (d.cap || CLD_PR_SLIDE_CAP)) res.draw = true;
  if (res.winner !== null || res.draw) u.end = { winner: res.winner === null ? -1 : res.winner, draw: !!res.draw };
  cldPrCoachDispatch({ type: 'slideDone', meIn: res.meIn, meKnocked: res.meKnocked, botIn: res.botIn,
                       bath: res.bath, winner: res.winner, draw: res.draw,
                       winnerName: res.winner !== null ? CLD_PR_CAST[res.winner] : null });
  if (!u.end) cldPrRefreshPlans();
  if (cldPrView) { if (res.bath) cldCamFrame(cldPrView, res.radius); else cldCamOverview(cldPrView, false); }
}
```

`cldPrCanCommit`: the first guard becomes `if (!u || u.playing || u.end) return false;`.

Replace `cldPrAction` with:

```js
function cldPrAction(kind, arg) {
  const u = cldPrUi;
  if (!u) return;
  if (kind === 'again' || kind === 'restart') {
    if (u.playing) return;
    cldPrLoadDrill(u.drill);                       // same drill, fresh floe
  } else if (u.playing) {
    return;                                        // nothing else acts during a Slide
  } else if (kind === 'drill') {
    cldPrLoadDrill(arg);
  } else if (kind === 'power') {
    if (u.lock !== null) u.lock = null;            // tapping a locked bar releases it
    else if (u.aim && u.aim.power >= CLD_MIN_POWER) {
      u.lock = u.aim.power;
      cldSfx('powerLock');
      cldPrCoachDispatch({ type: 'locked' });
    }
  } else if (kind === 'mode') {
    u.mode = arg;
    if (arg === 'throw') u.dive = null; else u.snowball = null;
  } else if (kind === 'cta' && cldPrCanCommit()) {
    const me = cldPrMe();
    const mine = me.drowned
      ? { aims: [], dive: u.mode === 'dive' ? u.dive : null, snowball: u.mode === 'throw' ? u.snowball : null }
      : { aims: [u.aim], dive: null, snowball: null };
    cldSfx('commit');
    cldPrResolve(mine);
  }
  cldPrSyncUI();
}
```

In `cldPrSyncUI`:
- In the ring map, replace `resurface: 'btn-cld-pr-resurface'` with `again: 'btn-cld-pr-again'`.
- Replace the whole scroll-on-new-line block with just the text update: `if (lineEl && lineEl.textContent !== v.line) lineEl.textContent = v.line;`. The full-height layout (Task 7) never scrolls.
- Replace the CTA block and the `again`/`res` lines at the end with:

```js
  const cta = $('btn-cld-pr-commit');
  if (cta) {
    const base = 'min-h-14 w-full rounded-2xl text-xl font-semibold flex items-center justify-center';
    if (u.end) {
      cta.style.display = 'none';
    } else if (u.playing) {
      cta.style.display = 'flex'; cta.textContent = 'Sliding…'; cta.disabled = true;
      cta.className = base + ' bg-stone-200 text-stone-500';
    } else {
      const can = cldPrCanCommit();
      cta.style.display = 'flex'; cta.textContent = 'Lock It In'; cta.disabled = !can;
      cta.className = base + ' cld-cta' + (can ? '' : ' opacity-50 pointer-events-none');
    }
  }
  const end = $('cld-pr-end');
  if (end) end.style.display = (u.end && !u.playing) ? 'flex' : 'none';
  const endLine = $('cld-pr-end-line');
  if (endLine) endLine.textContent = u.end ? v.line : '';
  const restart = $('btn-cld-pr-restart');
  if (restart) restart.disabled = !!u.playing;
```

In the Wiring block, replace `on('btn-cld-pr-resurface', …)` with `on('btn-cld-pr-restart', () => { playPillClick(); cldPrAction('restart'); });`. Keep `btn-cld-pr-again`.

In `cldPrLoop`, change `cldPrClock += dt;` to `if (!cldReducedMotion()) cldPrClock += dt;` (the folded SW v244 minor). In `cldPracticeStart`, after `cldPrView` is sized, add `if (cldPrFloe) cldPrFloe.aimAssist = cldAimAssist;` (the other folded minor: Aim Assist is read on every open).

- [ ] **Step 4: Markup**

In `src/screens/cld.html`, inside `#cld-pr-stage` after `<div id="cld-pr-float" …></div>`, add:

```html
          <!-- The end card: floats over the stage when the round is decided. -->
          <div id="cld-pr-end" style="display:none" class="absolute inset-0 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-lg p-4 flex flex-col gap-3 text-center w-full max-w-[16rem]">
              <p id="cld-pr-end-line" class="text-stone-800 font-semibold"></p>
              <button id="btn-cld-pr-again" class="min-h-11 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 font-semibold text-sm active:scale-95">Practice again</button>
            </div>
          </div>
```

Replace the old bottom row (the `<div class="flex gap-2">` holding Resurface and Practice again) with:

```html
        <div class="flex gap-2">
          <button id="btn-cld-pr-restart" class="flex-1 min-h-11 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 font-semibold text-sm active:scale-95">Start over</button>
        </div>
```

In `css/styles.css`, change `#btn-cld-pr-resurface` to `#btn-cld-pr-restart` in the transition selector.

Update the Practice comment in `cld.html` ("their shoves are fixed and drawn before you move") to: "Sylvia and Sam follow the drill's plan every Slide; their next shoves are drawn before you move."

Run: `node tools/build-index.js && node tools/verify-build-fresh.js`
Expected: the build writes `index.html`; the fresh check passes.

- [ ] **Step 5: Identity doc (paired copy)**

In `docs/game-identities/cld.md` T7b, replace the `# cld-how-to-overlay — Practice (the Arena, SW v244)` block with:

````
```copy
# cld-how-to-overlay — Practice (the Arena, SW v245)
Head-on
Crossfire
Edge
Tap to lock power
Power locked — tap to release
Too soft
Lock It In
Sliding…
Start over
Practice again
Got it
```
````

Replace the `# CLD_PR_COACH — the Practice coach (js/games/cld.js)` block's lines with the thirteen `CLD_PR_COACH` strings, in the order declared, exactly as written in Step 3 (`{Name}` stays literal).

In T7a's overlays row and the paragraph under it, replace "three drills against Sylvia and Sam" / "the rivals' shoves fixed and drawn before you move" with: "three drills — Sylvia and Sam each follow the drill's plan every Slide, their next shoves drawn before you move — played as a real Floe-Off to one player left, with a coach that reacts to what happens".

Run: `node tools/verify-identity-docs.js`
Expected: all docs pass.

- [ ] **Step 6: Run the harnesses**

Run: `node tools/verify-cld-practice.js && node tools/verify-cld-loopback.js && node tools/mutate-cld.js`
Expected: green, 40/40 mutants caught.
- **If H3's "none reaches the draw cap" fails:** the drill is too passive. Re-run `--tune` (Task 5 Step 4). The tuner doesn't yet include the round sweep, so first add `roundsEnd(key)` to its criteria: the H3 loop for that drill across all four policies, true when none draws. Re-tune.

- [ ] **Step 7: Commit**

```bash
git add js/games/cld.js src/screens/cld.html index.html css/styles.css tools/verify-cld-practice.js docs/game-identities/cld.md
git commit -m "feat(cld): Practice rounds play to a winner (Ice Bath, draw cap) with a coach that reacts; Start over, end card

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: The full-height Practice sheet, the coach bubble, the Arena's camera

**Files:**
- Modify: `src/screens/cld.html` — the How-to inner (`id`), subtitle class, the Practice body
- Modify: `css/styles.css:2690-2715` — `#cld-pr-stage` and the new sheet/bubble rules
- Modify: `js/games/cld.js` — `cldSetHowtoTab`, `cldPrLoop`, `cldPrPointerDown/Move/Up`, `cldPrSyncUI` (bubble inset + stage refit), Practice wiring
- Modify: `tools/verify-cld-practice.js` — section L additions
- Create: `vc-practice.js` in the session scratchpad (a throwaway visual-check driver; never committed)

**Interfaces:**
- Consumes: the camera (Task 4), `cldPrUi.drag`, `cldPrUi.end` (Task 6).
- Produces: DOM ids `#cld-how-to-inner`, `.cld-howto-sub`, `.cld-howto-full`, `.cld-pr-bubble`; `cldPrView.insetTop` follows the bubble's height.

- [ ] **Step 1: Write the failing checks**

Append inside section L (before its `RUN('cldResetState()');`):

```js
  const inner = $('cld-how-to-inner');
  RUN("cldSetHowtoTab('practice')");
  ok('Practice takes the whole sheet height', inner.classList.contains('cld-howto-full'));
  RUN("cldSetHowtoTab('rules')");
  ok('…and The Rules gives it back', !inner.classList.contains('cld-howto-full'));
  RUN("cldSetHowtoTab('practice')");
  $('cld-pr-coach').offsetHeight = 60;
  RUN('cldPrSyncUI()');
  check('the camera’s box starts below the coach bubble', G('cldPrView').insetTop, 72);
  // Review Focus 2 — the Arena's camera is its own.
  const liveCam = safeJSON(G('cldView') && G('cldView').cam);
  for (let k = 0; k < 10; k++) RUN('cldPrLoop')(9000 + k * 50);
  check('stepping the Arena moves only the Arena’s camera', safeJSON(G('cldView') && G('cldView').cam), liveCam);
  // A pinch on the Arena stage drops an aim in progress.
  const v = G('cldPrView');
  const you = arena("cldPenguins.find(p => p.id === '0-0')");
  const pev = (id, x, y) => ({ clientX: v.offX + x * v.scale, clientY: v.offY + y * v.scale, pointerId: id });
  RUN('cldPrPointerDown')(pev(1, you.x + 60, you.y));
  RUN('cldPrPointerDown')(pev(2, you.x - 60, you.y));
  ok('a second finger on the Arena is the camera, not an aim', G('cldPrUi').drag === null && v.cam.manual === true);
  RUN('cldPrPointerUp')(pev(2, you.x - 60, you.y)); RUN('cldPrPointerUp')(pev(1, you.x + 60, you.y));
  check('…and arms nothing', G('cldPrUi').aim, null);
```

- [ ] **Step 2: Run to see it fail**

Run: `node tools/verify-cld-practice.js`
Expected: FAIL at `Practice takes the whole sheet height` (no class is ever toggled).

- [ ] **Step 3: Markup**

In `src/screens/cld.html`:
- **The How-to overlay's inner div:** add `id="cld-how-to-inner"` to the `overlay-data-inner` div of `#cld-how-to-overlay`.
- **Its subtitle** `<p class="text-xs text-stone-400 mt-1">Shove your mates off the ice. Last one dry wins.</p>`: add the class `cld-howto-sub`.
- **The Practice body:** replace the whole `#cld-howto-body-practice` div with:

```html
      <!-- PRACTICE — the Arena, full height (SW v245, spec 2026-09-29-cld-fun-pass § 3.5).
           The stage takes every leftover pixel; the coach is a bubble floating in the
           water over it, so it costs no layout height. #cld-pr-stage is
           touch-action:none so a drag never scrolls the sheet. -->
      <div id="cld-howto-body-practice" style="display:none" class="flex-col gap-2 px-4 pt-3 pb-4">
        <div class="flex gap-2 flex-shrink-0">
          <button class="pill pill-active-cld flex-1" data-cld-pr-drill="headon">Head-on</button>
          <button class="pill flex-1" data-cld-pr-drill="crossfire">Crossfire</button>
          <button class="pill flex-1" data-cld-pr-drill="edge">Edge</button>
        </div>
        <div id="cld-pr-stage" class="relative rounded-2xl overflow-hidden">
          <canvas id="cld-pr-canvas"></canvas>
          <div id="cld-pr-coach" class="cld-pr-bubble">
            <p id="cld-pr-coach-step" class="text-stone-400 text-xs font-semibold uppercase tracking-widest"></p>
            <p id="cld-pr-coach-line" class="text-stone-700 text-sm leading-snug"></p>
          </div>
          <div id="cld-pr-float" class="absolute inset-0 pointer-events-none flex items-end justify-center pb-3"></div>
          <div id="cld-pr-end" style="display:none" class="absolute inset-0 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-lg p-4 flex flex-col gap-3 text-center w-full max-w-[16rem]">
              <p id="cld-pr-end-line" class="text-stone-800 font-semibold"></p>
              <button id="btn-cld-pr-again" class="min-h-11 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 font-semibold text-sm active:scale-95">Practice again</button>
            </div>
          </div>
        </div>
        <div id="cld-pr-drowned-row" style="display:none" class="flex-col gap-1 flex-shrink-0">
          <div class="flex gap-2">
            <button id="btn-cld-pr-mode-throw" class="pill pill-active-cld flex-1" data-cld-pr-mode="throw">Throw</button>
            <button id="btn-cld-pr-mode-dive" class="pill flex-1" data-cld-pr-mode="dive">Dive</button>
          </div>
          <p id="cld-pr-dive-reason" style="display:none" class="text-amber-600 text-xs"></p>
        </div>
        <button id="btn-cld-pr-power" class="w-full flex flex-col gap-1 py-1 rounded-xl active:scale-[0.99] flex-shrink-0">
          <div class="flex items-center justify-between w-full">
            <p id="cld-pr-power-hint" class="text-stone-400 text-xs">Tap to lock power</p>
            <p class="text-stone-400 text-xs font-semibold uppercase tracking-widest">Power</p>
          </div>
          <div id="cld-pr-power-track" class="cld-power-track w-full">
            <div id="cld-pr-power-fill" class="cld-power-fill"></div>
          </div>
        </button>
        <button id="btn-cld-pr-commit" class="cld-cta min-h-14 w-full rounded-2xl text-xl font-semibold flex items-center justify-center flex-shrink-0">Lock It In</button>
        <div class="flex gap-2 flex-shrink-0">
          <button id="btn-cld-pr-restart" class="flex-1 min-h-11 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 font-semibold text-sm active:scale-95">Start over</button>
          <button id="btn-cld-howto-close-practice" class="cld-cta flex-1 min-h-11 rounded-2xl text-base font-semibold active:scale-95 transition-transform duration-150">Got it</button>
        </div>
      </div>
```

`cldPrSyncUI` sets `#cld-pr-drowned-row`'s display to `'flex'`, so its `flex-col` applies.

- [ ] **Step 4: CSS**

In `css/styles.css`, replace the `#cld-pr-stage { … }` rule (width/aspect-ratio/flex-shrink/margin) with:

```css
/* CLD Practice, full height (SW v245 — spec 2026-09-29-cld-fun-pass § 3.5). The
   sheet grows to the viewport while Practice shows; the stage takes every
   leftover pixel and can never be squashed to nothing (DD-18's 0 px stage). */
#cld-how-to-overlay .overlay-data-inner.cld-howto-full { height: 100%; max-height: 100%; border-radius: 1.25rem 1.25rem 0 0; }
#cld-how-to-overlay .cld-howto-full .cld-howto-sub { display: none; }
#cld-howto-body-practice { flex: 1 1 auto; min-height: 0; overflow: hidden; }
#cld-pr-stage {
  flex: 1 1 0;
  min-height: 120px;
  width: 100%;
  background: #0e2536;
  touch-action: none;
  user-select: none; -webkit-user-select: none;
}
.cld-pr-bubble {
  position: absolute; left: 8px; right: 8px; top: 8px; z-index: 1;
  padding: 8px 12px; border-radius: 14px;
  background: rgba(255, 255, 255, 0.93); box-shadow: 0 4px 12px rgba(4, 26, 44, 0.25);
  pointer-events: none;
}
.cld-pr-bubble::after {
  content: ''; position: absolute; left: 22px; bottom: -6px; width: 12px; height: 12px;
  background: rgba(255, 255, 255, 0.93); transform: rotate(45deg);
}
```

Delete the comment block above the old rule that describes the square stage, and keep the `#cld-pr-canvas` and `.cld-pr-ring` rules.

- [ ] **Step 5: JS**

`cldSetHowtoTab`: after the bodies loop, add:

```js
  // Practice takes the whole sheet (spec § 3.5); every other tab gives it back.
  const inner = document.getElementById('cld-how-to-inner');
  if (inner) inner.classList.toggle('cld-howto-full', tab === 'practice');
```

`cldPrPointerDown`: the first line becomes `if (cldPrUi && cldCamPointer(cldPrView, e, 'down')) { cldPrUi.drag = null; cldPrSyncUI(); return; }`, placed before the existing `if (!u || u.playing || u.drag || !cldPrView) return;`.
`cldPrPointerMove`: the first line becomes `if (cldCamPointer(cldPrView, e, 'move')) return;`.
`cldPrPointerUp`: the first line becomes `if (cldCamPointer(cldPrView, e, 'up')) return;`.

`cldPrLoop`: replace `if (cldPrView && cldPrUi) cldDraw(cldPrView, cldArenaModel());` with:

```js
  if (cldPrView && cldPrUi) {
    const m = cldArenaModel();
    cldCamStep(cldPrView, dt, cldCamTarget(cldPrView, m,
      cldPrUi.playing ? 'resolving' : cldPrUi.end ? 'overview' : 'aiming'), !!cldPrUi.drag);
    cldDraw(cldPrView, m);
  }
```

`cldPrSyncUI`, at the end:

```js
  // The coach bubble floats over the stage: the camera frames the ice below it.
  // And the stage's height moves with the Throw · Dive row — refit when it does.
  const bubble = $('cld-pr-coach');
  const inset = bubble && bubble.offsetHeight ? bubble.offsetHeight + 12 : 0;
  const stageEl = $('cld-pr-stage');
  if (cldPrView && (cldPrView.insetTop !== inset ||
      (stageEl && stageEl.clientHeight && Math.round(cldPrView.cssH) !== stageEl.clientHeight))) {
    cldPrView.insetTop = inset;
    cldResize(cldPrView);
  }
```

Practice wiring: capture pointers on the Arena stage and drop `pointerleave` (the folded minor, and the mouse-drag backdrop-close note):

```js
  const prStage = document.getElementById('cld-pr-stage');
  if (prStage) {
    prStage.addEventListener('pointerdown', e => {
      try { if (e.pointerId !== undefined) prStage.setPointerCapture(e.pointerId); } catch (_) {}
      cldPrPointerDown(e);
    });
    prStage.addEventListener('pointermove', cldPrPointerMove);
    prStage.addEventListener('pointerup', cldPrPointerUp);
    prStage.addEventListener('pointercancel', cldPrPointerUp);
  }
```

Also in the Wiring block, the window `resize` listener already refits `cldPrView`. Leave it.

Run: `node tools/build-index.js && node tools/verify-build-fresh.js`
Expected: pass.

- [ ] **Step 6: Run the harnesses**

Run: `node tools/verify-cld-practice.js && node tools/verify-cld-loopback.js && node tools/mutate-cld.js`
Expected: green, 40/40.

- [ ] **Step 7: Visual check at the three SE sizes**

Invoke the `visual-check` skill (serve on port 8791 with `npx.cmd http-server . -p 8791 -s -c-1`). In the scratchpad, write `vc-practice.js`. For each viewport **375×667, 375×548 and 320×452**:
1. Open `index.html`.
2. Stub the audio: `['playSplash','playBoing','playLaunch','playWhoosh','playSuccess','playPillClick','playSonarPing','playAbyssThud','playClashWin','playDone','playExit'].forEach(n => window[n] = () => {})`.
3. Set `activeGameId = 'cld'` and run `cldOpenHowTo('practice')`.
4. Wait 600 ms, then take a screenshot and measure:
   - `#cld-pr-stage` height;
   - `#cld-pr-coach` bottom vs `#cld-pr-stage` bottom;
   - `#btn-cld-howto-close-practice` bottom ≤ viewport height;
   - `document.documentElement.scrollWidth <= clientWidth`.
5. Also call `cldStartMatch(['You','Sylvia','Sam','Shirley','Jeff','Max']); cldFloeSize='roomy'; cldFloeSizeTouched=true; cldStartFloeOff(7); cldShowFloe();`, wait 1.2 s, take a screenshot, and check that no penguin is clipped at zoom 1.

Pass criteria:
- Stage ≥ 220 px at 375×548 and 375×667.
- Got it fully on screen at all three sizes.
- No sideways scroll.
- The bubble never covers the controls.

At 320×452, record the stage height in the commit message and in DD-19. If it is under 120 px, stop and report to the owner (spec § 8's fallback: fold the drill pills into a compact selector).

- [ ] **Step 8: Commit**

```bash
git add src/screens/cld.html index.html css/styles.css js/games/cld.js tools/verify-cld-practice.js
git commit -m "feat(cld): Practice takes the whole sheet — the stage fills it, the coach floats over the water, the Arena gets its own camera

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Release v245 and close the docs

**Files:**
- Modify: `js/engine.js:19`, `sw.js:4`, `CLAUDE.md` (§ Current Focus + the CLD harness rows), `docs/sw-changelog.md`, `docs/code-map.md` (CLD section), `docs/implementation-notes/cld-implementation-notes.md` (DD-19 completed), `docs/deferred-work.md` (§ Cold Shoulder item 6), `docs/deferred-work-log.md`, `docs/decision-log.md`, `docs/game-identities/cld.md` (status line)

**Interfaces:** none new.

- [ ] **Step 1: The wire version and the cache**

`js/engine.js:19`: `const MP_PROTOCOL_VERSION = 'v245';`
`sw.js:4`: `const CACHE_NAME = 'sylly-games-v245';`

- [ ] **Step 2: Every harness, green, with the counts recorded**

Run each and write down its final count:

```bash
node tools/verify-cld-physics.js && node tools/verify-cld-loop.js && node tools/verify-cld-practice.js && \
node tools/verify-cld-loopback.js && node tools/mutate-cld.js && node tools/verify-mp-configs.js && \
node tools/verify-mp-reconnect.js && node tools/verify-identity-docs.js && node tools/verify-build-fresh.js
```

Expected: all pass. `mutate-cld` reports 40/40.

- [ ] **Step 3: CLAUDE.md**

Move the current `**SW v244 — …**` Current Focus paragraph **verbatim** to the top of `docs/sw-changelog.md`. Replace it in `CLAUDE.md` with at most six lines:

```markdown
**SW v245 — Cold Shoulder, "plays fun" (29 Sep 2026).** Plugs float in the Drink (touching the edge; gaps
cap at 1.8 penguins so one plug still seals), the floe is ~1.3× bigger with a matching shove, and a camera
frames the play (overview → aim cam → slide cam; pinch, pan, double-tap; a mini-map). Practice: each drill
is a plan both bots follow, played as a real Floe-Off to a winner, in a full-height sheet with a reacting
coach. **`MP_PROTOCOL_VERSION` → `'v245'`** (the geometry changed). Detail: `cld-implementation-notes.md` DD-19.
```

In the harness table, update the CLD rows' counts (physics, loop, practice, loopback, mutate 40/40) and the practice row's description ("…the camera, the plans, rounds to a winner, the coach…").

- [ ] **Step 4: code-map, impl-notes, deferred work, decision log, identity doc**

- **`docs/code-map.md`, CLD section** (Grep `cldSeatSpotFrom` to find it; don't read the whole file).
  - Add: `cldChunkR`, `cldSeatR`, `CLD_PLUG_OUT`, `CLD_BACK_OFFSET` (2.2r), the `cldCam*` functions and the view's camera fields, `cldPrBotCommit`, `cldPrPlanTarget`, `cldPrRefreshPlans`, `CLD_PR_SLIDE_CAP`, `#cld-how-to-inner`, `#cld-pr-end`, `#btn-cld-pr-restart`.
  - Remove: `cldRingR`, `CLD_VIEW_FIT`, `cldPrRivalCommit`, `#btn-cld-pr-resurface`.
- **`cld-implementation-notes.md` DD-19:** complete the entry drafted in Task 3.
  - What changed, with the owner's calls in bold: fully in the water; bigger floe + camera; plans; natural end.
  - The seal numbers.
  - The balance table (already filled).
  - The camera constants.
  - The tuned drill `ringSeed`/`place` values.
  - The 320×452 stage height.
  - **Lesson:** "the camera must never move under a finger: framing the aim feeds back into the aim".
- **`docs/deferred-work.md` § Cold Shoulder item 6:** mark these minors `RESOLVED 29 Sep 2026` with one line each, then move them to `docs/deferred-work-log.md` under the same heading.
  - the Aim Assist read on open;
  - `setPointerCapture` on both stages;
  - a drill change with no aim (now moot: the coach is reactive);
  - the Arena's reduced motion;
  - the Peck Off selection ring.

  The touch-down power floor and the loopback's `cldDraw` note stay open. In item 1, change "Every device must be on SW v243 (`MP_PROTOCOL_VERSION` `'v243'`)" to v245 / `'v245'`, and replace the Practice sentence with "check How to Play → Practice: all three drills' plans, a round played to a winner, the camera (pinch, double-tap) (SW v245)".
- **`docs/decision-log.md`, one entry on top:** `2026-09-29 — CLD plugs float in the Drink; the view gets a camera. The owner called for plugs "fully in the water" and a floe with "enough room"; a seal proof capped gaps at 1.8 penguins, and a camera replaced the fixed fit. Detail: cld-impl-notes DD-19; spec 2026-09-29-cld-fun-pass.`
- **`docs/game-identities/cld.md`:** the status line gains "· plugs in the Drink, a bigger floe + camera, Practice plans SW v245 (29 September 2026)". T6 needs no change: the setting labels are unchanged.

- [ ] **Step 5: Commit**

```bash
git add -A js/engine.js sw.js CLAUDE.md docs
git commit -m "release(cld): SW v245 — plays fun; MP_PROTOCOL_VERSION v245; docs closure

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## After Phase 1

Phase 2 ("looks fun", spec § 4 → SW v246) gets its own plan once this ships. The owner playtests v245 first, since the camera numbers and the balance feel are theirs to call. The approved prototype is committed at `docs/superpowers/prototypes/2026-09-29-cld-style/` (`cld-art.js` + its `index.html` harness page, which loads `physics.js` from beside it; published at https://claude.ai/artifact/SXiWaCTCfMSMXyXCC5aVae). Its `cld-art.js` is Phase 2's starting draft.
