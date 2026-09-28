# Cold Shoulder — Pool-style Cue + Practice Arena Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Cold Shoulder's slingshot drag with a pool-style cue (touch anywhere, finger is the butt of the cue, pull back for power, ghost + deflection guide), and add a Practice tab that runs three fixed drills on the game's real rules and renderer.

**Architecture:** Pure cue/guide maths (`cldCueAim`, `cldAimGuide`) feed both the live floe and the Arena. The renderer becomes model-fed (`cldDraw(view, m)`). The Arena keeps its own swap-shaped state record and runs the real rules layer through `cldArenaRun(fn)`, which swaps it into the module globals for one synchronous call and restores them in `finally`. The replay is split so the Arena can step it without navigating.

**Tech Stack:** Vanilla JS (no modules, all globals), Canvas 2D, `js/lib/physics.js` (deterministic sim), Node `vm` harnesses, `tools/build-index.js` (assembles `index.html` from `src/screens/*.html`).

**Spec:** `docs/superpowers/specs/2026-09-28-cld-cue-arena-design.md` — read it first; this plan argues from it.

## Global Constraints

- **No packet changes.** An armed aim on the wire stays exactly `{ penguinId, dx, dy, power }` — never add `dir` or any field to `cldMyAims` entries. `MP_PROTOCOL_VERSION` stays `'v243'`.
- **SW v244** — `sw.js` `CACHE_NAME` → `'sylly-games-v244'` in the closure task only.
- **Edit `src/screens/cld.html`, never `index.html`.** Rebuild with `node tools/build-index.js`; verify with `node tools/verify-build-fresh.js`.
- **Australian English** in all copy and comments (colour, behaviour, practise as a verb).
- **Comment style:** `// ── Section ───` headers, inline rationale comments — match `js/games/cld.js`.
- **Action buttons carry no emoji.** Practice buttons use `cld-cta` (brand) or neutral stone.
- **Only `transform`/`opacity` animate; the soft ring is a `box-shadow` *transition*, never `animation`.**
- **Reduced motion is checked in JS** for the Arena's replay (`cldReducedMotion()`).
- **The Arena never calls `mpSendEnvelope` / `mpSendPrivate`** and never branches on `syllyMultiplayerMode`.
- **Nothing inside `cldArenaRun` may touch screens, the live loop, timers, the network or the live DOM** (spec § 5.2 list).
- **Timers:** every Arena RAF/timeout is cleared on tab-away, on every overlay close, and in `cldResetState()`.
- Harness convention: `check(label, actual, expected)` / `ok(label, cond)`; the run ends with `ALL CHECKS PASSED` or `N CHECK(S) FAILED` and exits 1 on failure (mutate-cld parses that exact phrase).

## Review Focus

1. **A touch that starts on (or inside the dead zone of) the penguin** — the player expects today's behaviour to still work: pulling straight out from the penguin arms a shot away from the finger. Pinned in Task 1 (cue test "touch-down on the penguin").
2. **A plain tap on the stage after arming** — must not wipe or change the armed aim. Pinned in Task 5 (gesture test "tap keeps the armed aim").
3. **Practice opened from the floe `[?]` while the live Slide then starts resolving** (the host resolves while the overlay is open) — the live replay must finish exactly as it would have. Pinned in Task 7 (isolation 9(b) runs Arena Slides between live playback steps).
4. **Resize / tab switch while the Practice pane is hidden** — a hidden canvas has zero size; opening Practice must size it on show, not at build. Pinned in Task 10 (UI test "canvas sized on tab show").
5. **Arming in Peck Off** — an anywhere-touch must go to the first unarmed penguin, never silently re-aim the one already armed. Pinned in Task 5 (gesture test "Peck Off default penguin").

## File map

| File | Responsibility | Tasks |
|---|---|---|
| `js/games/cld.js` | cue + guide maths, view, model, renderer, live gesture, replay split, swap, Arena rules/coach/UI, Floe-tab removal | 1–11 |
| `tools/verify-cld-practice.js` (new) | D7 harness: cue, guide, view, model, gesture, replay split, swap, drills (+ `--tune`), coach, tabs, Arena UI — 141 checks | 1–11 |
| `src/screens/cld.html` | How to Play tabs: Rules \| Practice \| The Cast; Practice pane; Floe tab removed; step 2 + Aim Assist copy | 10, 14 |
| `css/styles.css` | `#cld-pr-stage`, `.cld-pr-ring` | 10 |
| `tools/mutate-cld.js` | per-mutant harness selection; four new mutants (29 → 33) | 12 |
| layout | `visual-check` pass (D9) + stage review (D3) | 13 |
| docs + `sw.js` + `CLAUDE.md` | closure, SW v244 | 14 |

**Harness running total** (each task's "Expected" line): T1 12 · T2 22 · T3 27 · T4 41 · T5 51 · T6 58 · T7 67 · T8 91 · T9 111 · T10 118 · T11 141.

---

### Task 1: The cue maths + the harness scaffold

**Files:**
- Modify: `js/games/cld.js` (constants after line 100 `CLD_MIN_POWER`; new function after `cldArcDist`, ~line 307)
- Create: `tools/verify-cld-practice.js`

**Interfaces:**
- Produces: constants `CLD_CUE_PULL_PX` (96), `CLD_CUE_DEAD` (22), `CLD_CUE_LEN` (58), `CLD_CUE_GAP_MAX` (22), `CLD_GUIDE_STUB` (30), `CLD_GRAB_R` (35.2); `cldCueAim({ down, now, penguin, scale, lock, lastDir }) → { dx, dy, power, dir } | null` where `dx,dy` is the unit shot direction, `dir = { x, y }` the same vector.
- Produces (harness): `S` (the vm sandbox), `G(name)` read a binding, `SET(name, v)` write a binding, `RUN(expr)` evaluate, `check`, `ok`, `section(title)`, and `makeDocument()` / `ctx2d()` mocks later tasks reuse.

- [ ] **Step 1: Create the harness scaffold with the cue tests**

Create `tools/verify-cld-practice.js`:

```js
// ═══════════════════════════════════════════════════════════════════════════
// verify-cld-practice.js — Cold Shoulder's cue, render model and Practice Arena.
//
//   node tools/verify-cld-practice.js          (exits 1 on any failure)
//   node tools/verify-cld-practice.js --tune   (drill tuner: prints ring seeds, asserts nothing)
//   CLD_SRC=path / CLD_PHYS_SRC=path           (drive a different copy — mutate-cld uses this)
//
// Loads physics.js + cld.js into ONE vm context with a mock DOM of real
// elements (the loopback's shape), so render and Arena UI code actually runs.
// mpSendEnvelope / mpSendPrivate are COUNTED — the Arena must never call them.
// Spec: docs/superpowers/specs/2026-09-28-cld-cue-arena-design.md § 7.1.
// ═══════════════════════════════════════════════════════════════════════════
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const PHYS = process.env.CLD_PHYS_SRC || path.join(ROOT, 'js/lib/physics.js');
const GAME = process.env.CLD_SRC      || path.join(ROOT, 'js/games/cld.js');
const TUNE = process.argv.includes('--tune');

// ── Mock DOM (the verify-cld-loopback.js shape) ────────────────────────────
function ctx2d() {
  const noop = () => {};
  return {
    canvas: { width: 360, height: 360 },
    setTransform: noop, save: noop, restore: noop, translate: noop, rotate: noop,
    scale: noop, beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop,
    arc: noop, ellipse: noop, quadraticCurveTo: noop, bezierCurveTo: noop, rect: noop,
    fill: noop, stroke: noop, clip: noop, clearRect: noop, fillRect: noop,
    strokeRect: noop, fillText: noop, strokeText: noop, drawImage: noop,
    setLineDash: noop, measureText: () => ({ width: 10 }),
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1, font: '',
    textAlign: '', textBaseline: '', lineCap: '', lineJoin: '', shadowBlur: 0,
    shadowColor: '', filter: '',
  };
}
function makeDocument() {
  const byId = {};
  const mk = tag => {
    const el = {
      tagName: String(tag).toUpperCase(), id: '', style: {}, dataset: {}, children: [],
      textContent: '', className: '', disabled: false, scrollTop: 0,
      clientWidth: 320, clientHeight: 320, width: 0, height: 0, parentElement: null,
      _html: '',
      get innerHTML() { return this._html; },
      set innerHTML(v) { this._html = String(v); this.children = []; },
      _cls: new Set(),
      classList: null,
      appendChild(c) { this.children.push(c); c.parentElement = this; return c; },
      append(...cs) { cs.forEach(c => this.appendChild(c)); },
      removeChild(c) { this.children = this.children.filter(x => x !== c); return c; },
      addEventListener() {}, removeEventListener() {},
      querySelector: () => null, querySelectorAll: () => [],
      getBoundingClientRect: () => ({ top: 0, left: 0, width: 320, height: 320 }),
      getContext: () => ctx2d(),
      scrollIntoView() {},
      setAttribute() {}, getAttribute: () => null,
    };
    el.classList = {
      add: (...c) => c.forEach(x => el._cls.add(x)),
      remove: (...c) => c.forEach(x => el._cls.delete(x)),
      contains: c => el._cls.has(c),
      toggle: (c, on) => { const want = on === undefined ? !el._cls.has(c) : !!on;
                           if (want) el._cls.add(c); else el._cls.delete(c); return want; },
    };
    return el;
  };
  return {
    body: mk('body'), addEventListener() {}, createElement: mk,
    querySelectorAll: () => [], querySelector: () => null,
    getElementById(id) { if (!byId[id]) { byId[id] = mk('div'); byId[id].id = id; } return byId[id]; },
    __byId: byId,
  };
}
function Path2DStub() {}
['moveTo','lineTo','arc','ellipse','rect','closePath','quadraticCurveTo','bezierCurveTo','addPath']
  .forEach(k => { Path2DStub.prototype[k] = function () {}; });

// ── The sandbox ────────────────────────────────────────────────────────────
const sent = { envelope: 0, private: 0 };
const screens = [];
const S = {
  console, document: makeDocument(),
  window: { syllyMultiplayerMode: 'single', devicePixelRatio: 1, addEventListener() {},
            matchMedia: () => ({ matches: false }) },
  showScreen: id => screens.push(id),
  setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  requestAnimationFrame: () => 0, cancelAnimationFrame() {},
  playLaunch() {}, playExit() {}, playDone() {}, playSuccess() {}, playBoing() {},
  playWhoosh() {}, playAbyssThud() {}, playHullThud() {}, playAlarm() {}, playSplash() {},
  playTick() {}, playPillClick() {}, playSyllyOn() {}, playSyllyOff() {},
  mpSendEnvelope() { sent.envelope++; }, mpSendPrivate() { sent.private++; },
  mpLockSync() {}, mpUnlockSync() {}, mpPlayerSlots: [], mpMyPlayerIdx: 0,
  Path2D: Path2DStub,
};
S.globalThis = S;
S.window.window = S.window;
vm.createContext(S);
vm.runInContext(fs.readFileSync(PHYS, 'utf8'), S, { filename: PHYS });
vm.runInContext(fs.readFileSync(GAME, 'utf8'), S, { filename: GAME });

// Top-level let/const/function bindings are visible to later scripts in the
// same context, so plain evaluation reads and writes them — no bridge needed.
const G   = name => vm.runInContext(name, S);
const SET = (name, v) => { S.__v = v; vm.runInContext(name + ' = __v', S); };
const RUN = expr => vm.runInContext(expr, S);

// ── Assertions ─────────────────────────────────────────────────────────────
let failures = 0, passes = 0;
process.on('uncaughtException', e => {
  console.log('\n  FAIL  the run crashed before it finished\n          ' + e.stack);
  console.log('\n' + '='.repeat(70) + '\n' + (failures + 1) + ' CHECK(S) FAILED');
  process.exit(1);
});
function check(label, actual, expected) {
  const good = JSON.stringify(actual) === JSON.stringify(expected);
  good ? passes++ : failures++;
  console.log(`${good ? '  PASS' : '  FAIL'}  ${label}` +
    (good ? '' : `\n          expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`));
}
function ok(label, cond, detail) {
  cond ? passes++ : failures++;
  console.log(`${cond ? '  PASS' : '  FAIL'}  ${label}` + (cond || !detail ? '' : `\n          ${detail}`));
}
function near(a, b, eps) { return Math.abs(a - b) <= (eps || 1e-6); }
function section(t) { console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 66 - t.length))); }

// ═══════════════════════════════════════════════════════════════════════════
// A. The cue (spec § 2.1–2.2)
// ═══════════════════════════════════════════════════════════════════════════
if (!TUNE) {
  section('A. The cue');
  const cue = o => RUN('cldCueAim')(o);
  const P = { x: 180, y: 180 };
  const PULL = G('CLD_CUE_PULL_PX'), DEAD = G('CLD_CUE_DEAD');

  // Finger 80 units LEFT of the penguin → the shot goes RIGHT (+x).
  let a = cue({ down: { x: 100, y: 180 }, now: { x: 100, y: 180 }, penguin: P, scale: 1, lock: null, lastDir: null });
  ok('touch-down is power 0', a && a.power === 0, JSON.stringify(a));
  ok('the shot goes away from the finger (+x)', a && near(a.dx, 1) && near(a.dy, 0), JSON.stringify(a));

  for (const scale of [0.87, 2.0]) {
    a = cue({ down: { x: 100, y: 180 }, now: { x: 100 - PULL / scale, y: 180 }, penguin: P, scale, lock: null, lastDir: null });
    ok(`a pull of ${PULL} CSS px is full power at scale ${scale}`, a && near(a.power, 1, 1e-9), JSON.stringify(a));
  }
  a = cue({ down: { x: 100, y: 180 }, now: { x: 100 - 48, y: 180 }, penguin: P, scale: 1, lock: null, lastDir: null });
  ok('half the pull is half power', a && near(a.power, 0.5, 1e-9), JSON.stringify(a));

  // Swing: same radius (80) round the penguin, 60° away → power unchanged.
  const th = Math.PI - Math.PI / 3;
  a = cue({ down: { x: 100, y: 180 }, now: { x: 180 + 80 * Math.cos(th), y: 180 + 80 * Math.sin(th) },
            penguin: P, scale: 1, lock: null, lastDir: null });
  ok('a pure swing keeps power at 0', a && near(a.power, 0, 1e-9), JSON.stringify(a));
  ok('a swing turns the aim', a && !near(a.dy, 0, 1e-3));

  a = cue({ down: { x: 100, y: 180 }, now: { x: 140, y: 180 }, penguin: P, scale: 1, lock: null, lastDir: null });
  ok('pushing in past touch-down is power 0, never negative', a && a.power === 0, JSON.stringify(a));

  const held = { x: 0, y: -1 };
  a = cue({ down: { x: 100, y: 180 }, now: { x: 180 + DEAD / 2, y: 180 }, penguin: P, scale: 1, lock: null, lastDir: held });
  ok('inside the dead zone the direction holds', a && near(a.dx, 0) && near(a.dy, -1), JSON.stringify(a));
  a = cue({ down: { x: 181, y: 180 }, now: { x: 182, y: 180 }, penguin: P, scale: 1, lock: null, lastDir: null });
  check('inside the dead zone with no direction yet → null', a, null);

  a = cue({ down: { x: 100, y: 180 }, now: { x: 20, y: 180 }, penguin: P, scale: 1, lock: 0.4, lastDir: null });
  ok('a locked bar holds power while the pull changes', a && near(a.power, 0.4), JSON.stringify(a));

  // Review Focus 1 — touch-down ON the penguin, pull straight out: the old slingshot still works.
  a = cue({ down: { x: 180, y: 180 }, now: { x: 180 - 60, y: 180 }, penguin: P, scale: 1, lock: null, lastDir: null });
  ok('touch-down on the penguin, pull left → shot right with power', a && near(a.dx, 1) && a.power > 0.5, JSON.stringify(a));
}

// ── Report (keep LAST in the file) ─────────────────────────────────────────
if (!TUNE) {
  console.log('\n' + '='.repeat(70));
  console.log(failures ? `${failures} CHECK(S) FAILED` : `ALL CHECKS PASSED (${passes})`);
  process.exit(failures ? 1 : 0);
}
```

Every later task inserts its section **above** the `// ── Report` block.

- [ ] **Step 2: Run it — expect a crash on the missing function**

Run: `node tools/verify-cld-practice.js`
Expected: FAIL — `cldCueAim is not defined` (reported as `1 CHECK(S) FAILED` by the crash handler).

- [ ] **Step 3: Add the constants**

In `js/games/cld.js`, directly after line 100 (`const CLD_MIN_POWER …`):

```js
// ── The cue (SW v244 — pool-style drag; spec 2026-09-28-cld-cue-arena § 2) ──
// Touch anywhere; the finger is the butt of the cue. Power is the pull-back
// since touch-down in CSS PIXELS, so full power is the same thumb travel on
// every phone. All five are tunables (spec § 9) — change them here only.
const CLD_CUE_PULL_PX = 96;                   // CSS px of pull-back for full power
const CLD_CUE_DEAD    = 2 * CLD_PENGUIN_R;    // logical — inside this the aim holds still
const CLD_CUE_LEN     = 58;                   // cue stick length, logical
const CLD_CUE_GAP_MAX = 22;                   // cue tip stand-off at full power, logical
const CLD_GUIDE_STUB  = 30;                   // deflection stub, logical (~1.4 diameters)
const CLD_GRAB_R      = CLD_PENGUIN_R * 3.2;  // touch this close to one of mine to pick it
```

- [ ] **Step 4: Add `cldCueAim`**

In `js/games/cld.js`, directly after `function cldArcDist(a, b) { … }` (ends ~line 307):

```js
// PURE (spec § 2.2). The cue runs from the finger THROUGH the penguin, so the
// shot goes away from the finger. Swinging the finger turns the aim; the pull
// since touch-down (in CSS px) sets the power, so a touch-down is always 0 and
// a stray touch can never fire. Inside CLD_CUE_DEAD the direction holds
// (`lastDir`) instead of flipping under the finger. null = no direction yet.
function cldCueAim(o) {
  const P = o.penguin, F = o.now, D = o.down;
  const ex = P.x - F.x, ey = P.y - F.y;
  const dist = Math.hypot(ex, ey);
  let dir = o.lastDir || null;
  if (dist >= CLD_CUE_DEAD) dir = { x: ex / dist, y: ey / dist };
  if (!dir) return null;
  const pullUnits = dist - Math.hypot(P.x - D.x, P.y - D.y);
  const byPull = Math.max(0, Math.min(1, (pullUnits * o.scale) / CLD_CUE_PULL_PX));
  const power = (o.lock !== null && o.lock !== undefined) ? o.lock : byPull;
  return { dx: dir.x, dy: dir.y, power: power, dir: dir };
}
```

Note: the touch-down-on-the-penguin case works because `|D − P| ≈ 0`, so the whole distance out counts as pull (Review Focus 1).

- [ ] **Step 5: Run the harness**

Run: `node tools/verify-cld-practice.js`
Expected: `ALL CHECKS PASSED (12)`

- [ ] **Step 6: Commit**

```bash
git add js/games/cld.js tools/verify-cld-practice.js
git commit -m "feat(cld): pure pool-style cue maths + practice harness scaffold"
```

---

### Task 2: The aim guide — ghost + deflection stub

**Files:**
- Modify: `js/games/cld.js` (new function directly after `cldCueAim`)
- Test: `tools/verify-cld-practice.js` (section B)

**Interfaces:**
- Consumes: `CLD_GUIDE_STUB`, `CLD_PENGUIN_R`, `CLD_W/CLD_H`, `CLD_ASSIST_STEPS` (90, defined ~line 807 — read at call time, so declaration order is fine).
- Produces: `cldAimGuide(m, aim) → { end:{x,y}, ghost:{x,y}|null, stub:{x1,y1,x2,y2}|null, kind:'penguin'|'plug'|'berg'|'rim'|null } | null`. `m` needs only `m.penguins[]` (`{ id, x, y, drowned, plug }`), `m.bergs[]` (`{ x, y, r }`), `m.radius`, `m.reach` (full-power slide distance). `aim` is `{ penguinId, dx, dy, power }`.

- [ ] **Step 1: Write the failing tests** — insert above `// ── Report`:

```js
// ═══════════════════════════════════════════════════════════════════════════
// B. The aim guide (spec § 2.3)
// ═══════════════════════════════════════════════════════════════════════════
if (!TUNE) {
  section('B. The aim guide');
  const guide = (m, a) => RUN('cldAimGuide')(m, a);
  const R = G('CLD_PENGUIN_R'), STUB = G('CLD_GUIDE_STUB');
  const me = { id: '0-0', x: 120, y: 180, drowned: false, plug: false };
  const base = extra => Object.assign({ penguins: [me], bergs: [], radius: 130, reach: 130 }, extra);
  const aimR = { penguinId: '0-0', dx: 1, dy: 0, power: 1 };

  // Head-on: a penguin 60 ahead.
  let g = guide(base({ penguins: [me, { id: '1-0', x: 180, y: 180, drowned: false, plug: false }] }), aimR);
  check('head-on: first contact is a penguin', g && g.kind, 'penguin');
  ok('the ghost sits one diameter short of the struck penguin', g && g.ghost && near(g.ghost.x, 180 - 2 * R, 2) && near(g.ghost.y, 180, 1e-6),
     JSON.stringify(g && g.ghost));
  ok('the stub is exactly CLD_GUIDE_STUB long', g && g.stub && near(Math.hypot(g.stub.x2 - g.stub.x1, g.stub.y2 - g.stub.y1), STUB, 1e-6));
  ok('head-on: the stub carries straight on (+x)', g && g.stub && near(g.stub.y2, 180, 1e-6) && g.stub.x2 > g.stub.x1);

  // Oblique: the struck penguin sits 12 below the line → it is pushed down-right,
  // along the centre line ghost → struck, never along the aim.
  g = guide(base({ penguins: [me, { id: '1-0', x: 180, y: 192, drowned: false, plug: false }] }), aimR);
  ok('oblique: the stub follows the centre line, not the aim', g && g.stub && g.stub.y2 > g.stub.y1 + 1,
     JSON.stringify(g && g.stub));

  g = guide(base({ bergs: [{ x: 200, y: 180, r: 16 }] }), aimR);
  ok('a Berg: ghost only, no stub', g && g.kind === 'berg' && g.ghost && g.stub === null, JSON.stringify(g));

  g = guide(base({ penguins: [me, { id: '1-0', x: 180, y: 180, drowned: true, plug: true }] }), aimR);
  ok('a plug: ghost only, no stub', g && g.kind === 'plug' && g.stub === null, JSON.stringify(g));

  g = guide(base({ penguins: [me, { id: '1-0', x: 180, y: 180, drowned: true, plug: false }] }), aimR);
  ok('a Knocked-back penguin is not a body — no contact', g && g.kind !== 'penguin' && g.kind !== 'plug', JSON.stringify(g));

  g = guide(base({}), { penguinId: '0-0', dx: 1, dy: 0, power: 0.3 });
  ok('nothing in reach: no ghost, the line ends at reach × power', g && g.ghost === null && near(g.end.x, 120 + 130 * 0.3, 2),
     JSON.stringify(g));

  g = guide(base({}), { penguinId: '0-0', dx: -1, dy: 0, power: 1 });
  ok('heading off the floe: kind rim, ghost at the lip, no stub', g && g.kind === 'rim' && g.ghost && g.stub === null &&
     Math.hypot(g.ghost.x - 180, g.ghost.y - 180) <= 130, JSON.stringify(g));
}
```

- [ ] **Step 2: Run — expect failure**

Run: `node tools/verify-cld-practice.js`
Expected: crash `cldAimGuide is not defined`.

- [ ] **Step 3: Implement** — directly after `cldCueAim`:

```js
// PURE (spec § 2.3). March along the aim to the FIRST contact and stop there —
// one contact deep, never further (brief § 14: everyone slides at once, so any
// deeper prediction would be a lie). The ghost is the last free position; a
// struck Standing penguin also gets a fixed-length stub along the centre line
// (the pool object-ball line): direction only, never distance.
function cldAimGuide(m, aim) {
  const p = m.penguins.find(q => q.id === aim.penguinId);
  if (!p) return null;
  const len = Math.hypot(aim.dx, aim.dy) || 1;
  const ux = aim.dx / len, uy = aim.dy / len;
  const step = (m.reach * aim.power) / CLD_ASSIST_STEPS;
  let hx = p.x, hy = p.y, kind = null, struck = null;
  for (let k = 0; k < CLD_ASSIST_STEPS && !kind; k++) {
    const nx = hx + ux * step, ny = hy + uy * step;
    if (Math.hypot(nx - CLD_W / 2, ny - CLD_H / 2) > m.radius) { kind = 'rim'; break; }
    for (let j = 0; j < m.penguins.length; j++) {
      const q = m.penguins[j];
      if (q.id === p.id || (q.drowned && !q.plug)) continue;   // Knocked back is not a body
      if (Math.hypot(q.x - nx, q.y - ny) < CLD_PENGUIN_R * 2) { kind = q.drowned ? 'plug' : 'penguin'; struck = q; break; }
    }
    if (!kind) for (let j = 0; j < m.bergs.length; j++) {
      const b = m.bergs[j];
      if (Math.hypot(b.x - nx, b.y - ny) < b.r + CLD_PENGUIN_R) { kind = 'berg'; break; }
    }
    if (!kind) { hx = nx; hy = ny; }
  }
  const end = { x: hx, y: hy };
  if (!kind) return { end: end, ghost: null, stub: null, kind: null };
  let stub = null;
  if (kind === 'penguin') {
    const sx = struck.x - hx, sy = struck.y - hy, sl = Math.hypot(sx, sy) || 1;
    stub = { x1: struck.x, y1: struck.y,
             x2: struck.x + (sx / sl) * CLD_GUIDE_STUB, y2: struck.y + (sy / sl) * CLD_GUIDE_STUB };
  }
  return { end: end, ghost: { x: hx, y: hy }, stub: stub, kind: kind };
}
```

- [ ] **Step 4: Run** — `node tools/verify-cld-practice.js` → `ALL CHECKS PASSED (22)`

- [ ] **Step 5: Commit**

```bash
git add js/games/cld.js tools/verify-cld-practice.js
git commit -m "feat(cld): aim guide - ghost at first contact + deflection stub"
```

---

### Task 3: The view object (two canvases can coexist)

**Files:**
- Modify: `js/games/cld.js` — line 149 (`let cldCanvas = null, cldCtx = null;`), lines 824–827 (`cldView*` lets), `cldResize` (1095), `cldToLogical` (1128), `cldInitCanvas` (1139), `cldDraw` (1190–1205), `cldSyncFloeUI` re-fit (1677–1679), `cldPointerDown/Move` (`cldToLogical(e)` calls), the resize listener (~3150).
- Test: `tools/verify-cld-practice.js` (section C)

**Interfaces:**
- Produces: `cldMakeView(canvas) → { canvas, ctx, scale, offX, offY, x, y, w, h }`; `cldResize(view)`; `cldToLogical(view, e) → { x, y }`; live global `let cldView = null`.
- Removes: `cldCanvas`, `cldCtx`, `cldViewScale`, `cldViewOffX`, `cldViewOffY`, `cldViewX`, `cldViewY`, `cldViewW`, `cldViewH`.

- [ ] **Step 1: Write the failing tests** — insert above `// ── Report`:

```js
// ═══════════════════════════════════════════════════════════════════════════
// C. The view (spec § 4.1)
// ═══════════════════════════════════════════════════════════════════════════
if (!TUNE) {
  section('C. The view');
  const doc = S.document;
  const box = doc.createElement('div'); box.clientWidth = 320; box.clientHeight = 480;
  const cv  = doc.createElement('canvas'); box.appendChild(cv);
  cv.getBoundingClientRect = () => ({ left: 10, top: 20, width: 320, height: 480 });
  const v = RUN('cldMakeView')(cv);
  RUN('cldResize')(v);
  const VF = G('CLD_VIEW_FIT');
  ok('scale fits CLD_VIEW_FIT to the short axis', near(v.scale, 320 / VF, 1e-9), String(v.scale));
  ok('the long axis is centred', near(v.offY, (480 - 360 * v.scale) / 2, 1e-9));
  const c = RUN('cldToLogical')(v, { clientX: 10 + v.offX + 180 * v.scale, clientY: 20 + v.offY + 180 * v.scale });
  ok('cldToLogical inverts the fit (centre → 180,180)', near(c.x, 180, 1e-6) && near(c.y, 180, 1e-6), JSON.stringify(c));
  const v2 = RUN('cldMakeView')(doc.createElement('canvas'));
  ok('two views are independent objects', v2 !== v && v2.scale === 1);
  ok('the old view globals are gone', RUN("typeof cldViewScale === 'undefined' && typeof cldCanvas === 'undefined'"));
}
```

- [ ] **Step 2: Run** — expect `cldMakeView is not defined`.

- [ ] **Step 3: Replace the globals.** Line 149 becomes:

```js
let cldView        = null;      // the floe's canvas view — cldMakeView(); the Arena owns its own
```

Delete lines 824–827 (the comment "The view transform (set by cldResize)…" and both `let cldView…` lines).

- [ ] **Step 4: Rewrite `cldResize`, `cldToLogical`, `cldInitCanvas`** (replace lines 1095–1145 in full):

```js
// A view is one canvas and the transform that fits the 360x360 logical world
// into it. The floe owns `cldView`; the Practice Arena owns `cldPrView` — two
// canvases on screen at once (Practice opened from the floe's [?]).
function cldMakeView(canvas) {
  const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  return { canvas: canvas, ctx: ctx, scale: 1, offX: 0, offY: 0,
           x: 0, y: 0, w: CLD_W, h: CLD_H };
}

function cldResize(view) {
  if (!view || !view.canvas || !view.ctx) return;
  const box = view.canvas.parentElement;
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
  view.scale = scale;
  view.offX  = (w - CLD_W * scale) / 2;
  view.offY  = (h - CLD_H * scale) / 2;

  view.canvas.style.width  = w + 'px';
  view.canvas.style.height = h + 'px';
  view.canvas.width        = Math.floor(w * dpr);
  view.canvas.height       = Math.floor(h * dpr);
  view.ctx.setTransform(scale * dpr, 0, 0, scale * dpr, view.offX * dpr, view.offY * dpr);

  // The visible region in LOGICAL units — what the water has to cover.
  view.x = -view.offX / scale;
  view.y = -view.offY / scale;
  view.w = w / scale;
  view.h = h / scale;
}

// Convert a pointer event to logical 360x360 coordinates in this view.
function cldToLogical(view, e) {
  if (!view || !view.canvas) return { x: 0, y: 0 };
  const b = view.canvas.getBoundingClientRect();
  if (!b.width || !b.height || !view.scale) return { x: 0, y: 0 };
  // Undo the SAME offset cldResize baked into the context transform. Reading the
  // bounding box alone would be off by half the letterbox band the moment the
  // stage stops being square — which is always, on a phone.
  return { x: (e.clientX - b.left - view.offX) / view.scale,
           y: (e.clientY - b.top  - view.offY) / view.scale };
}

function cldInitCanvas() {
  if (cldView) return;
  const cv = document.getElementById('cld-canvas');
  if (!cv || !cv.getContext) return;
  cldView = cldMakeView(cv);
  cldResize(cldView);
}
```

- [ ] **Step 5: Update the remaining sites.**
  - `cldDraw` (line ~1191): `if (!cldCtx) return;` → `if (!cldView || !cldView.ctx) return;`; `const ctx = cldCtx;` → `const ctx = cldView.ctx;`; every `cldViewX/Y/W/H` → `cldView.x/.y/.w/.h` (lines 1196, 1201, 1205). *(Task 4 rewrites cldDraw's signature; this step only keeps it compiling.)*
  - `cldSyncFloeUI` (1677–1679):
    ```js
    const cv = cldView && cldView.canvas;
    const stage = cv && cv.parentElement;
    if (stage && stage.clientHeight &&
        Math.round(parseFloat(cv.style.height) || 0) !== stage.clientHeight) cldResize(cldView);
    ```
  - `cldPointerDown` / `cldPointerMove`: `cldToLogical(e)` → `cldToLogical(cldView, e)` (2 sites).
  - `cldShowFloe`: `cldResize();` → `cldResize(cldView);`
  - resize listener (~3150): `if (el && el.style.display !== 'none') cldResize();` → `… cldResize(cldView);`
  - Then Grep `\b(cldCanvas|cldCtx|cldViewScale|cldViewOffX|cldViewOffY|cldViewX|cldViewY|cldViewW|cldViewH)\b` in `js/games/cld.js` — expected: **no matches**.

- [ ] **Step 6: Run the new section + the loopback (it executes the real render path)**

Run: `node tools/verify-cld-practice.js; node tools/verify-cld-loopback.js`
Expected: practice `ALL CHECKS PASSED (27)`; loopback `ALL CHECKS PASSED`.

- [ ] **Step 7: Commit**

```bash
git add js/games/cld.js tools/verify-cld-practice.js
git commit -m "refactor(cld): canvas view object - floe and Arena canvases can coexist"
```

---

### Task 4: The render model — `cldDraw(view, m)` draws only from a model (D2)

**Files:**
- Modify: `js/games/cld.js` — `cldLoop` (1151), `cldDraw` (1190–1327, replaced whole), `cldDrawBerg` (1329), delete `cldDrawAim` + `cldDrawOneAim` (1362–1427) and `cldFacingOf` (1443–1450); new functions after `cldMyPenguins` (~1457).
- Test: `tools/verify-cld-practice.js` (section D)

**Interfaces:**
- Consumes: `cldAimGuide` (Task 2), `cldView` (Task 3).
- Produces:
  - `cldDefaultPenguin(standing, aims) → penguin` — first Standing penguin with no armed aim, else the most recently aimed Standing one, else `standing[0]`.
  - `cldPickPenguin(standing, pt, aims) → penguin | null` — the nearest within `CLD_GRAB_R` of `pt`, else `cldDefaultPenguin`.
  - `cldCurrentSrc() → { penguins, bergs, radius, iceBreaker, ice }` (reads the globals — the live floe, or the Arena's record while swapped in).
  - `cldBuildModel(src, ui) → m` with `ui = { meIdx, phase, playbackT, aims[], live, snowball, dive, assist, clock, selectedId }`; `m = { radius, bergs, iceBreaker, reach, penguins[], aims[], assist, dive, snowball, clock }`; each `m.penguins[i] = { id, ownerIdx, x, y, drowned, plug, state, facing, me, ringDark, dim, selected }`; each `m.aims[i] = { penguinId, dx, dy, power, live, rival }`.
  - `cldDiveModel(back, chosen) → { seats:[{x,y}], ghost:{x,y,ownerIdx}|null }`.
  - `cldFloeModel() → m` (the live floe).
  - `cldDraw(view, m)`; `cldDrawBerg(ctx, b, iceBreaker)`; `cldDrawCue(ctx, m, a)`.

- [ ] **Step 1: Write the failing tests** — insert above `// ── Report`:

```js
// ═══════════════════════════════════════════════════════════════════════════
// D. The render model (spec § 4.2)
// ═══════════════════════════════════════════════════════════════════════════
if (!TUNE) {
  section('D. The render model');
  const pen = (id, owner, x, y, extra) => Object.assign({ id, ownerIdx: owner, x, y, drowned: false, plug: false, angle: null, seq: null }, extra || {});

  // Pure penguin picking (Peck Off — Review Focus 5).
  const A = pen('0-0', 0, 100, 180), B = pen('0-1', 0, 260, 180);
  const pick = (st, pt, aims) => RUN('cldPickPenguin')(st, pt, aims);
  check('a touch on a penguin picks it', pick([A, B], { x: 262, y: 181 }, []).id, '0-1');
  check('an anywhere-touch picks the first unarmed', pick([A, B], { x: 180, y: 40 }, [{ penguinId: '0-0', dx: 1, dy: 0, power: 0.5 }]).id, '0-1');
  check('both armed → the most recently aimed', pick([A, B], { x: 180, y: 40 },
        [{ penguinId: '0-1', dx: 1, dy: 0, power: 0.5 }, { penguinId: '0-0', dx: 1, dy: 0, power: 0.5 }]).id, '0-0');

  // Live model.
  SET('cldPenguins', [pen('0-0', 0, 140, 180), pen('1-0', 1, 220, 180), pen('2-0', 2, 180, 60, { drowned: true, plug: true, angle: 0 })]);
  SET('cldBergs', []); SET('cldFloeRadius', 130); SET('cldIceConditions', 'slush'); SET('cldIceBreaker', 2);
  SET('cldPhase', 'aiming'); SET('cldMyMode', 'throw'); SET('cldMySnowball', null); SET('cldMyDive', null);
  SET('cldDragging', false);
  SET('cldMyAims', [{ penguinId: '0-0', dx: 1, dy: 0, power: 0.6 }]);
  let m = RUN('cldFloeModel()');
  check('three penguins in the model', m.penguins.length, 3);
  ok('mine is flagged me', m.penguins[0].me === true && m.penguins[1].me === false);
  ok('the armed penguin faces along its aim', near(m.penguins[0].facing, 0, 1e-9));
  check('a plug is drawn bob, not dim', [m.penguins[2].state, m.penguins[2].dim], ['bob', false]);
  check('the armed aim is in m.aims as mine, not live', m.aims.map(a => [a.penguinId, a.live, a.rival]), [['0-0', false, false]]);
  ok('reach is the full-power slide distance', near(m.reach, RUN("cldFullSlideDist('slush')")));
  check('one Standing penguin of mine → no selection ring', m.penguins.filter(p => p.selected).length, 0);
  ok('the model carries no live-state references (a copy)', m.penguins[0] !== G('cldPenguins')[0]);

  // Rendering executes end to end on a mock view, rival aim + guide included.
  const box = S.document.createElement('div'); box.clientWidth = 320; box.clientHeight = 320;
  const cv = S.document.createElement('canvas'); box.appendChild(cv);
  const v = RUN('cldMakeView')(cv); RUN('cldResize')(v);
  m.aims.push({ penguinId: '1-0', dx: -1, dy: 0, power: 1, live: false, rival: true });
  m.assist = true;
  let threw = null;
  try { RUN('cldDraw')(v, m); } catch (e) { threw = e; }
  ok('cldDraw(view, m) renders without throwing', threw === null, threw && threw.stack);
  ok('cldDraw reads no live globals: an empty live floe still draws the model', (() => {
    SET('cldPenguins', []); SET('cldFloeRadius', 0);
    try { RUN('cldDraw')(v, m); return true; } catch (e) { return false; }
  })());
  ok('the old aim/facing helpers are gone',
     RUN("typeof cldDrawAim === 'undefined' && typeof cldDrawOneAim === 'undefined' && typeof cldFacingOf === 'undefined'"));
}
```

- [ ] **Step 2: Run** — expect `cldPickPenguin is not defined`.

- [ ] **Step 3: Add the picking helpers and the model builders** — directly after `function cldMyPenguins() { … }` (~line 1457):

```js
// PURE. Which of my Standing penguins an anywhere-touch aims (spec § 2.1):
// the first with no armed aim, else the one aimed most recently (a new drag is
// always pushed to the END of cldMyAims). A penguin I actually touched wins.
function cldDefaultPenguin(standing, aims) {
  const unarmed = standing.find(p => !aims.some(a => a.penguinId === p.id));
  if (unarmed) return unarmed;
  for (let i = aims.length - 1; i >= 0; i--) {
    const p = standing.find(q => q.id === aims[i].penguinId);
    if (p) return p;
  }
  return standing[0] || null;
}
function cldPickPenguin(standing, pt, aims) {
  if (!standing.length) return null;
  let best = null, bestD = Infinity;
  standing.forEach(p => {
    const d = Math.hypot(p.x - pt.x, p.y - pt.y);
    if (d < bestD) { bestD = d; best = p; }
  });
  if (best && bestD <= CLD_GRAB_R) return best;
  return cldDefaultPenguin(standing, aims);
}

// ═══════════════════════════════════════════════════════════════════════════
// The render model (spec § 4.2). cldDraw reads ONLY this — so the live floe
// and the Practice Arena are drawn by one renderer, never a hand-built copy.
// ═══════════════════════════════════════════════════════════════════════════
// The floe as the globals hold it right now — the live match, or the Arena's
// record while cldArenaRun has it swapped in.
function cldCurrentSrc() {
  return { penguins: cldPenguins, bergs: cldBergs, radius: cldFloeRadius,
           iceBreaker: cldIceBreaker, ice: cldIceConditions };
}

// PURE over its arguments. Every pose and facing decision the old cldDraw
// made inline is made here, so the renderer has nothing left to decide.
function cldBuildModel(src, ui) {
  const aims = ui.aims || [];
  const aimFor = id => aims.find(a => a.penguinId === id) || null;
  const penguins = src.penguins.map(p => {
    const mine = p.ownerIdx === ui.meIdx;
    let state = 'idle';
    if (p.drowned) state = 'bob';
    if (p.drowned && p.seatT !== undefined && ui.phase === 'resolving' &&
        ui.playbackT - p.seatT < 500)                        state = 'plunge';  // tumbling in, bottom already blocking
    if (p.drowned && ui.snowball && mine)                    state = 'throw';
    if (!p.drowned && ui.live && ui.live.penguinId === p.id) state = 'lean';
    const a = aimFor(p.id);
    // A penguin faces along its aim while aiming, and outward from the centre
    // otherwise — so a bobbing Drowned penguin faces the ice it wants back.
    const facing = (a && !p.drowned) ? Math.atan2(a.dy, a.dx)
                 : p.drowned ? Math.atan2(CLD_H / 2 - p.y, CLD_W / 2 - p.x)
                 : Math.atan2(p.y - CLD_H / 2, p.x - CLD_W / 2);
    return { id: p.id, ownerIdx: p.ownerIdx, x: p.x, y: p.y,
             drowned: !!p.drowned, plug: !!p.plug, state: state, facing: facing,
             me: mine, ringDark: cldIsSecondPenguin(p),
             dim: !!(p.drowned && !p.plug),              // Plugged reads solid, Knocked back reads faded
             selected: ui.selectedId === p.id };
  });
  return { radius: src.radius, bergs: src.bergs, iceBreaker: src.iceBreaker,
           reach: cldFullSlideDist(src.ice), penguins: penguins, aims: aims,
           assist: !!ui.assist, dive: ui.dive || null, snowball: ui.snowball || null,
           clock: ui.clock || 0 };
}

// Dive mode: the free seats round the ring, and the ghost at the chosen one.
// A slip gap's seat is its CENTRE, which no sample angle lands on — so a sample
// is snapped to its seat, not tested against it.
function cldDiveModel(back, chosen) {
  const apart = 2 * Math.asin(Math.min(1, CLD_PENGUIN_R / cldRingR()));
  const seats = [], drawn = [];
  for (let k = 0; k < 96; k++) {
    const s = cldSeatSpot(k * CLD_TAU / 96, back.id);
    if (!s || drawn.some(a => cldArcDist(a, s.angle) < apart)) continue;
    drawn.push(s.angle);
    seats.push({ x: s.x, y: s.y });
  }
  const g = chosen ? cldRimPos(chosen.angle, cldRingR()) : null;
  return { seats: seats, ghost: g ? { x: g.x, y: g.y, ownerIdx: back.ownerIdx } : null };
}

// The live floe's model — this device's input state over the live globals.
function cldFloeModel() {
  const live = cldDragging ? cldCurrentDragAim() : null;
  const aims = cldMyAims.filter(a => !live || a.penguinId !== live.penguinId)
    .map(a => ({ penguinId: a.penguinId, dx: a.dx, dy: a.dy, power: a.power, live: false, rival: false }));
  if (live) aims.push({ penguinId: live.penguinId, dx: live.dx, dy: live.dy, power: live.power, live: true, rival: false });
  const standing = cldMyPenguins().filter(p => !p.drowned);
  const back = (cldMyMode === 'dive' && cldPhase === 'aiming') ? cldMyBackPenguin() : null;
  return cldBuildModel(cldCurrentSrc(), {
    meIdx: cldMyIdx(), phase: cldPhase, playbackT: cldPlaybackT, aims: aims, live: live,
    snowball: cldMySnowball, dive: back ? cldDiveModel(back, cldMyDive) : null,
    assist: cldAimAssist, clock: cldClock,
    // The ring only means something when there is a choice to make (Peck Off).
    selectedId: standing.length > 1 ? cldDefaultPenguin(standing, cldMyAims).id : null,
  });
}
```

- [ ] **Step 4: Replace `cldDraw` (1190–1327) in full:**

```js
function cldDraw(view, m) {
  if (!view || !view.ctx) return;
  const ctx = view.ctx;
  const cx = CLD_W / 2, cy = CLD_H / 2;

  ctx.clearRect(view.x, view.y, view.w, view.h);

  // ── The Drink — a cold gradient with slow concentric swell rings. Animated by
  // phase, not by frames. Painted across the whole VISIBLE region, which is wider
  // than the 360x360 world on any non-square stage.
  const water = ctx.createLinearGradient(0, view.y, 0, view.y + view.h);
  water.addColorStop(0, '#1c3f57');
  water.addColorStop(1, '#0e2536');
  ctx.fillStyle = water;
  ctx.fillRect(view.x, view.y, view.w, view.h);
  ctx.strokeStyle = 'rgba(142,202,230,0.10)';
  ctx.lineWidth = 1.5;
  for (let k = 0; k < 4; k++) {
    const ph = (m.clock * 0.25 + k * 0.25) % 1;
    ctx.globalAlpha = 1 - ph;
    ctx.beginPath();
    ctx.arc(cx, cy, m.radius + 6 + ph * 46, 0, CLD_TAU);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  if (!m.radius) return;

  // ── The floe. A ring of shadow, then the ice, then a few procedural cracks.
  ctx.beginPath();
  ctx.arc(cx, cy + 3, m.radius, 0, CLD_TAU);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fill();

  const ice = ctx.createRadialGradient(cx - m.radius * 0.3, cy - m.radius * 0.35,
                                       m.radius * 0.1, cx, cy, m.radius);
  ice.addColorStop(0, '#ffffff');
  ice.addColorStop(0.72, '#eaf6fb');
  ice.addColorStop(1, '#c9e4f0');
  ctx.beginPath();
  ctx.arc(cx, cy, m.radius, 0, CLD_TAU);
  ctx.fillStyle = ice;
  ctx.fill();
  ctx.strokeStyle = '#8ECAE6';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Cracks — deterministic from the radius so they don't crawl frame to frame,
  // and they visibly redraw when The Thaw shrinks the floe.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, m.radius, 0, CLD_TAU);
  ctx.clip();
  ctx.strokeStyle = 'rgba(120,170,195,0.22)';
  ctx.lineWidth = 0.9;
  for (let k = 0; k < 9; k++) {
    const a  = (k * 2.399963) + m.radius * 0.013;        // golden-angle scatter
    const r0 = m.radius * (0.18 + (k % 4) * 0.20);
    const r1 = r0 + m.radius * 0.20;                     // SHORT — a crack, not a
    const a1 = a + 0.34;                                 // scratch across the floe
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r1);
    ctx.stroke();
  }
  ctx.restore();

  // ── Bergs. Never illustrated — a procedural chunk plus a crack overlay whose
  // density reads the remaining hits, so damage is visible before it shatters.
  m.bergs.forEach(b => cldDrawBerg(ctx, b, m.iceBreaker));

  // ── Cues + the aim guide, under the penguins so nothing is hidden.
  m.aims.forEach(a => cldDrawCue(ctx, m, a));

  // ── Penguins. EVERY one goes through the seam — no bypass anywhere.
  m.penguins.forEach(p => {
    if (p.selected) {
      // Peck Off: which penguin an anywhere-touch will aim (spec § 2.1).
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, CLD_PENGUIN_R + 5, 0, CLD_TAU); ctx.stroke();
      ctx.restore();
    }
    cldRenderPenguin(ctx, p.state, p.ownerIdx, p.x, p.y, CLD_PENGUIN_R, {
      t: m.clock, facing: p.facing, ring: true, me: p.me, ringDark: p.ringDark, dim: p.dim,
    });
  });

  // ── Dive mode: the free seats round the ring, and the ghost at the chosen one.
  if (m.dive) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.setLineDash([3, 3]);
    m.dive.seats.forEach(s => { ctx.beginPath(); ctx.arc(s.x, s.y, CLD_PENGUIN_R, 0, CLD_TAU); ctx.stroke(); });
    ctx.restore();
    if (m.dive.ghost) {
      ctx.save(); ctx.globalAlpha = 0.6;
      cldRenderPenguin(ctx, 'bob', m.dive.ghost.ownerIdx, m.dive.ghost.x, m.dive.ghost.y, CLD_PENGUIN_R,
                       { t: m.clock, ring: true, me: true });
      ctx.restore();
    }
  }

  // ── The snowball target marker — a crosshair the thrower can see, nobody else.
  if (m.snowball) {
    const s = m.snowball;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 7, 0, CLD_TAU);
    ctx.moveTo(s.x - 11, s.y); ctx.lineTo(s.x + 11, s.y);
    ctx.moveTo(s.x, s.y - 11); ctx.lineTo(s.x, s.y + 11);
    ctx.stroke();
    ctx.restore();
  }
}
```

- [ ] **Step 5: `cldDrawBerg` takes the capacity.** Signature `function cldDrawBerg(ctx, b, iceBreaker)`, and inside it `const taken = Math.max(0, cldIceBreaker - b.hits);` → `const taken = Math.max(0, iceBreaker - b.hits);`.

- [ ] **Step 6: Replace `cldDrawAim` + `cldDrawOneAim` (1362–1427) with `cldDrawCue`:**

```js
// The cue (spec § 2.3). The stick sits BEHIND the penguin on the finger's side
// and stands off by CLD_CUE_GAP_MAX × power — the gap IS the power reading, so
// it stays readable while the thumb covers the penguin. A rival's cue (the
// Practice Arena) is the same drawing in its owner's colour at lower alpha.
function cldDrawCue(ctx, m, a) {
  const p = m.penguins.find(q => q.id === a.penguinId);
  if (!p || p.drowned || a.power < CLD_MIN_POWER) return;   // a too-soft pull draws nothing
  const len = Math.hypot(a.dx, a.dy) || 1;
  const ux = a.dx / len, uy = a.dy / len;
  const alpha = a.live ? 0.95 : (a.rival ? 0.5 : 0.62);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.setLineDash([]);
  const gap  = CLD_PENGUIN_R + 2 + CLD_CUE_GAP_MAX * a.power;
  const tipX = p.x - ux * gap, tipY = p.y - uy * gap;
  ctx.strokeStyle = a.rival ? cldTintOf(p.ownerIdx) : '#e4572e';
  ctx.lineWidth = a.live ? 4 : 3;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX - ux * CLD_CUE_LEN, tipY - uy * CLD_CUE_LEN);
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';                              // the pale tip
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX - ux * 5, tipY - uy * 5);
  ctx.stroke();

  // Aim Assist: forward to the FIRST contact only (cldAimGuide), never beyond.
  if (m.assist) {
    const g = cldAimGuide(m, a);
    if (g) {
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(g.end.x, g.end.y); ctx.stroke();
      ctx.setLineDash([]);
      if (g.ghost) {
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(g.ghost.x, g.ghost.y, CLD_PENGUIN_R, 0, CLD_TAU); ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath(); ctx.arc(g.end.x, g.end.y, 4, 0, CLD_TAU); ctx.fill();
      }
      if (g.stub) {
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(g.stub.x1, g.stub.y1); ctx.lineTo(g.stub.x2, g.stub.y2); ctx.stroke();
      }
    }
  }
  ctx.restore();
}
```

Delete `cldFacingOf` (1443–1450) — its logic now lives in `cldBuildModel`.

- [ ] **Step 7: The loop feeds the model.** In `cldLoop`, replace `cldDraw(paused ? 0 : dt);` with:

```js
  if (!paused) cldClock += dt;
  cldDraw(cldView, cldFloeModel());
```

(`cldClock += dt` has moved out of `cldDraw`, which no longer takes `dt`.) Grep `cldDraw(` — the loop is the only live caller.

- [ ] **Step 8: Run all the CLD harnesses**

Run: `node tools/verify-cld-practice.js; node tools/verify-cld-loop.js; node tools/verify-cld-loopback.js`
Expected: practice `ALL CHECKS PASSED (41)`; loop and loopback `ALL CHECKS PASSED`.

- [ ] **Step 9: Commit**

```bash
git add js/games/cld.js tools/verify-cld-practice.js
git commit -m "refactor(cld): model-fed renderer - cldDraw(view, m), the cue replaces the pull-back line"
```

---

### Task 5: The live gesture — cue from anywhere

**Files:**
- Modify: `js/games/cld.js` — cue constants (Task 1 block), drag lets (~815–818), `cldCurrentDragAim` (~1466), `cldPointerDown/Move/Up` (~1484–1552), `cldShowFloe` (~1557), `cldResetState` (~2928).
- Test: `tools/verify-cld-practice.js` (section E)

**Interfaces:**
- Consumes: `cldCueAim` (T1), `cldPickPenguin` (T4), `cldView` (T3).
- Produces: `CLD_CUE_TAP_PX` (4); `cldReleaseAim(aim, down, now, scale) → { penguinId, dx, dy, power } | null` (pure — the Arena reuses it); `let cldDragDir`; `cldCurrentDragAim() → { penguinId, dx, dy, power, dir } | null`. `cldDragFrom` now means **the touch-down point** (was the penguin's centre).

- [ ] **Step 1: Write the failing tests** — insert above `// ── Report`:

```js
// ═══════════════════════════════════════════════════════════════════════════
// E. The live gesture (spec § 2.1)
// ═══════════════════════════════════════════════════════════════════════════
if (!TUNE) {
  section('E. The live gesture');
  const pen = (id, owner, x, y) => ({ id, ownerIdx: owner, x, y, drowned: false, plug: false, angle: null, seq: null });
  const box = S.document.createElement('div'); box.clientWidth = 320; box.clientHeight = 320;
  const cv = S.document.createElement('canvas'); box.appendChild(cv);
  const view = RUN('cldMakeView')(cv); RUN('cldResize')(view); SET('cldView', view);
  const ev = (x, y) => ({ clientX: view.offX + x * view.scale, clientY: view.offY + y * view.scale, pointerId: 1 });
  const down = (x, y) => RUN('cldPointerDown')(ev(x, y));
  const move = (x, y) => RUN('cldPointerMove')(ev(x, y));
  const up   = (x, y) => RUN('cldPointerUp')(ev(x, y));
  const PULL = G('CLD_CUE_PULL_PX');
  const fresh = pens => {
    SET('cldPenguins', pens); SET('cldPhase', 'aiming'); SET('cldMyMode', 'throw');
    SET('cldMyAims', []); SET('cldPowerLock', null); SET('cldPtrId', null); SET('cldDragging', false);
    SET('cldMySnowball', null); SET('cldMyDive', null);
  };

  fresh([pen('0-0', 0, 140, 180), pen('1-0', 1, 260, 180)]);
  down(60, 180); move(60 - PULL / view.scale, 180);
  const m = RUN('cldFloeModel()');
  check('mid-drag: my penguin leans', m.penguins.find(p => p.id === '0-0').state, 'lean');
  ok('mid-drag: the live aim is in the model', m.aims.some(a => a.live && a.penguinId === '0-0'));
  up(60 - PULL / view.scale, 180);
  let aims = G('cldMyAims');
  ok('a full pull from anywhere arms a full-power shot away from the finger',
     aims.length === 1 && near(aims[0].dx, 1) && near(aims[0].dy, 0) && near(aims[0].power, 1, 1e-6), JSON.stringify(aims));
  check('the armed aim carries exactly the four wire fields', Object.keys(aims[0]).sort(), ['dx', 'dy', 'penguinId', 'power']);

  // Review Focus 2 — a tap after arming changes nothing, with or without a locked bar.
  const before = JSON.stringify(G('cldMyAims'));
  down(60, 100); up(60, 100);
  check('a plain tap keeps the armed aim', JSON.stringify(G('cldMyAims')), before);
  SET('cldPowerLock', 0.4);
  down(60, 100); up(60, 100);
  check('a tap with the bar locked keeps the armed aim too', JSON.stringify(G('cldMyAims')), before);

  down(60, 180); move(60, 100); up(60, 100);
  aims = G('cldMyAims');
  ok('locked: a drag re-aims at the locked power', aims.length === 1 && near(aims[0].power, 0.4) && aims[0].dy > 0.5, JSON.stringify(aims));
  SET('cldPowerLock', null);

  // Review Focus 5 — Peck Off: an anywhere-touch goes to the first unarmed penguin.
  fresh([pen('0-0', 0, 100, 180), pen('0-1', 0, 260, 180)]);
  SET('cldMyAims', [{ penguinId: '0-0', dx: 1, dy: 0, power: 0.5 }]);
  down(180, 40); move(180, 40 - PULL / view.scale); up(180, 40 - PULL / view.scale);
  check('Peck Off: an anywhere-touch arms the unarmed penguin', G('cldMyAims').map(a => a.penguinId), ['0-0', '0-1']);
  down(102, 181); move(102, 181 + 60); up(102, 181 + 60);
  ok('Peck Off: touching a penguin re-aims that one', G('cldMyAims').slice(-1)[0].penguinId === '0-0');

  SET('cldPhase', 'resolving');
  const n = G('cldMyAims').length;
  down(60, 180); move(20, 180); up(20, 180);
  check('no aiming while the Slide resolves', G('cldMyAims').length, n);
  SET('cldPhase', 'aiming');
}
```

- [ ] **Step 2: Run** — expect FAILs (today's grab-near-the-penguin gesture ignores an anywhere-touch).

- [ ] **Step 3: One more constant** — append to the Task 1 cue block:

```js
const CLD_CUE_TAP_PX  = 4;                    // CSS px a touch must travel before release can arm
```

- [ ] **Step 4: The drag state.** Replace lines ~815–818:

```js
let cldDragging     = false;
let cldDragPenguin  = null;   // penguin id being aimed, or null
let cldDragFrom     = null;   // { x, y } logical — where the finger TOUCHED DOWN (SW v244; was the penguin's centre)
let cldDragTo       = null;   // { x, y } logical — where the finger is now
let cldDragDir      = null;   // { x, y } — the last aim direction, held inside the dead zone
```

- [ ] **Step 5: Replace `cldCurrentDragAim` and the three pointer handlers** (~1466–1552; keep `cldMyBackPenguin` and `CLD_BATH_LEAD` where they are):

```js
// ═══════════════════════════════════════════════════════════════════════════
// Drag-to-aim — the pool-style cue (spec § 2). Touch ANYWHERE; the finger is
// the butt of the cue. Release ARMS the aim; it never commits. The arm-then-
// commit split is the only safety net between a fat-fingered drag and a lost
// Floe-Off, which is why the commit is a separate button your thumb has to
// travel to.
// ═══════════════════════════════════════════════════════════════════════════
function cldCurrentDragAim() {
  if (!cldDragging || !cldDragFrom || !cldDragTo || !cldDragPenguin) return null;
  const p = cldPenguins.find(q => q.id === cldDragPenguin);
  if (!p) return null;
  const a = cldCueAim({ down: cldDragFrom, now: cldDragTo, penguin: p,
                        scale: cldView ? cldView.scale : 1, lock: cldPowerLock, lastDir: cldDragDir });
  return a ? { penguinId: p.id, dx: a.dx, dy: a.dy, power: a.power, dir: a.dir } : null;
}

// PURE. What a release arms: nothing for a tap (so a stray touch can never
// re-aim, even with the bar locked) or a too-soft pull; otherwise exactly the
// four wire fields — never `dir` (the CLD_COMMIT shape is unchanged, spec § 2.1).
function cldReleaseAim(aim, down, now, scale) {
  if (!aim || aim.power < CLD_MIN_POWER) return null;
  if (Math.hypot(now.x - down.x, now.y - down.y) * scale < CLD_CUE_TAP_PX) return null;
  return { penguinId: aim.penguinId, dx: aim.dx, dy: aim.dy, power: aim.power };
}

function cldPointerDown(e) {
  if (cldPhase !== 'aiming') return;
  if (cldPtrId !== null) return;                 // one pointer at a time
  const pt = cldToLogical(cldView, e);

  // Dive mode: the tap picks a gap. It snaps to the free seat nearest the tap.
  if (cldMyMode === 'dive') {
    const back = cldMyBackPenguin();
    const spot = back ? cldSeatSpot(cldAngleOf(pt.x, pt.y), back.id) : null;
    if (spot) { cldMyDive = { penguinId: back.id, angle: spot.angle }; cldSfx('dive'); cldSyncFloeUI(); }
    return;
  }

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

  // Anywhere on the stage aims: the penguin under the thumb if there is one,
  // otherwise the default (Peck Off: the first unarmed).
  const target = cldPickPenguin(standing, pt, cldMyAims);
  if (!target) return;
  const armed = cldArmedAimFor(target.id);
  const al = armed ? (Math.hypot(armed.dx, armed.dy) || 1) : 1;

  cldPtrId       = (e.pointerId === undefined) ? 'mouse' : e.pointerId;
  cldDragging    = true;
  cldDragPenguin = target.id;
  cldDragFrom    = pt;
  cldDragTo      = pt;
  // A touch-down inside the dead zone keeps the armed direction, not none.
  cldDragDir     = armed ? { x: armed.dx / al, y: armed.dy / al } : null;
  cldSyncFloeUI();
}

function cldPointerMove(e) {
  if (!cldDragging) return;
  const id = (e.pointerId === undefined) ? 'mouse' : e.pointerId;
  if (id !== cldPtrId) return;
  cldDragTo = cldToLogical(cldView, e);
  const a = cldCurrentDragAim();
  if (a) cldDragDir = a.dir;
  cldSyncFloeUI();
}

function cldPointerUp(e) {
  if (!cldDragging) return;
  const id = (e.pointerId === undefined) ? 'mouse' : e.pointerId;
  if (id !== cldPtrId) return;

  const armed = cldReleaseAim(cldCurrentDragAim(), cldDragFrom, cldDragTo, cldView ? cldView.scale : 1);
  cldDragging = false;
  cldPtrId    = null;

  if (armed) {
    // A new drag REPLACES this penguin's armed aim, as many times as you like —
    // right up until Lock It In, and never after. Pushed to the END: the most
    // recently aimed penguin is the default when every one is armed.
    cldMyAims = cldMyAims.filter(a => a.penguinId !== armed.penguinId);
    cldMyAims.push(armed);
  }
  cldDragPenguin = null;
  cldDragFrom = cldDragTo = null;
  cldDragDir = null;
  cldSyncFloeUI();
}
```

- [ ] **Step 6: Reset the new state.** In `cldShowFloe` add `cldDragDir = null;` after `cldDragPenguin = null;`. In `cldResetState`, the line `cldDragFrom = null; cldDragTo = null;` becomes `cldDragFrom = null; cldDragTo = null; cldDragDir = null;`.

- [ ] **Step 7: Run all the CLD harnesses**

Run: `node tools/verify-cld-practice.js; node tools/verify-cld-loop.js; node tools/verify-cld-loopback.js`
Expected: practice `ALL CHECKS PASSED (51)`; the other two green (their commits still carry `{ penguinId, dx, dy, power }`).

- [ ] **Step 8: Commit**

```bash
git add js/games/cld.js tools/verify-cld-practice.js
git commit -m "feat(cld): pool-style cue on the floe - touch anywhere, pull back for power"
```

---

### Task 6: Split the replay — `cldStepPlayback(dtMs, hooks)` never navigates

**Files:**
- Modify: `js/games/cld.js` — `cldBeginPlayback` (~1790), `cldAdvancePlayback` (~1817), `cldPlayEvent` (~1863), `cldPlayAftermath` (~1900), `cldFloatBark` (~2203).
- Test: `tools/verify-cld-practice.js` (section F)

**Interfaces:**
- Produces:
  - `cldArmPlayback(tl)` — the state half of `cldBeginPlayback` (timeline, slide number, TG-13 rewind, pointers, sfx throttle). No DOM, no loop.
  - `cldStepPlayback(dtMs, hooks) → 'idle' | 'playing' | 'done'` — positions, events, aftermath. Never calls `cldEndPlayback`, never touches the DOM itself: every sound and bark goes through `hooks = { sfx(moment), bark() }`.
  - `CLD_LIVE_HOOKS = { sfx: cldSfx, bark: cldFloatBark }`; `cldBarkLine() → string`.
  - `cldPlayEvent(e, hooks)`, `cldPlayAftermath(b, hooks)`.

- [ ] **Step 1: Write the failing tests** — insert above `// ── Report`:

```js
// ═══════════════════════════════════════════════════════════════════════════
// F. The replay split (spec § 5.3)
// ═══════════════════════════════════════════════════════════════════════════
if (!TUNE) {
  section('F. The replay split');
  RUN("cldIceBreaker = 2; cldSyllyMode = false; cldPeckOff = false; cldFloeSize = 'standard'; cldIceConditions = 'slush'");
  RUN("cldStartMatch(['You', 'Sylvia', 'Sam']); cldStartFloeOff(7);");
  // Penguin 0 shoved straight at penguin 1 — there will be a collision to hear.
  RUN(`(() => {
    const a = cldPenguins[0], b = cldPenguins[1];
    cldCommits = [{ aims: [{ penguinId: a.id, dx: b.x - a.x, dy: b.y - a.y, power: 1 }], dive: null, snowball: null },
                  { aims: [], dive: null, snowball: null }, { aims: [], dive: null, snowball: null }];
  })()`);
  const tl = RUN('cldTimelineFromPayload(cldTimelinePayload(cldResolveSlide(11)))');
  const heard = [];
  S.__hooks = { sfx: m => heard.push(m), bark: () => heard.push('bark') };
  const screensBefore = screens.length, phaseBefore = G('cldPhase');
  RUN('cldArmPlayback')(tl);
  let r, guard = 0;
  do { r = RUN('cldStepPlayback(50, __hooks)'); } while (r === 'playing' && guard++ < 4000);
  check('the replay steps to done', r, 'done');
  check('stepping never shows a screen', screens.length, screensBefore);
  check('stepping never changes the phase', G('cldPhase'), phaseBefore);
  check('every event was walked', G('cldPlaybackEventPtr'), tl.events.length);
  heard.length = 0;
  RUN("cldPlayEvent({ type: 'plunge', id: 'nobody' }, __hooks)");
  check('a plunge sounds and barks through the hooks — never the live float layer', heard, ['plunge', 'bark']);
  SET('cldTimeline', null);
  check('no timeline → idle', RUN('cldStepPlayback(50, __hooks)'), 'idle');
  ok('the bark line comes from the pool', G('CLD_PLUNGE_BARKS').includes(RUN('cldBarkLine()')));
}
```

- [ ] **Step 2: Run** — expect `cldArmPlayback is not defined`.

- [ ] **Step 3: Split `cldBeginPlayback`** (~1790–1815) into:

```js
// The STATE half of starting a replay — no DOM, no loop — so the Practice
// Arena can arm its own replay inside cldArenaRun (spec § 5.2).
function cldArmPlayback(tl) {
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
  cldPlaybackT        = 0;
  cldPlaybackEventPtr = 0;
  cldAftermathPtr     = 0;
  cldLastSfxT         = -CLD_COLLISION_SFX_MS;
  cldWashoutUntil     = 0;
}

function cldBeginPlayback(tl) {
  cldArmPlayback(tl);
  cldCommits          = new Array(cldPlayerCount).fill(null);
  cldPhase            = 'resolving';
  cldMyAims = []; cldMySnowball = null; cldMyDive = null; cldMyMode = 'throw';
  cldSyncFloeUI();
  cldStartLoop();
}
```

(Order note: the original set `cldCommits` between the rewind and `cldPlaybackT`; nothing between them reads either, so the move is behaviour-neutral — the loopback proves it in Step 7.)

- [ ] **Step 4: Split `cldAdvancePlayback`** (~1817–1861) into:

```js
// The live replay: step it, and only the live path navigates when it ends.
function cldAdvancePlayback(dtMs) {
  if (cldStepPlayback(dtMs, CLD_LIVE_HOOKS) === 'done') cldEndPlayback();
}

// Positions, events and aftermath — and nothing else (spec § 5.3). Every sound
// and bark goes out through `hooks`, and the end is RETURNED, never acted on,
// so the Practice Arena can step a replay without leaving its tab.
function cldStepPlayback(dtMs, hooks) {
  if (!cldTimeline) { cldPhase = 'aiming'; return 'idle'; }
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
    // Samples are positional by tl.bodyIds — Knocked-back penguins are not
    // bodies, so a penguin's index is NOT its index in cldPenguins.
    const ids = tl.bodyIds || [];
    cldPenguins.forEach(p => {
      if (p.plungedThisSlide) return;   // frozen at the lip until its seat beat
      const k = ids.indexOf(p.id);
      if (k < 0) return;
      p.x = s0[k * 2]     + (s1[k * 2]     - s0[k * 2])     * f;
      p.y = s0[k * 2 + 1] + (s1[k * 2 + 1] - s0[k * 2 + 1]) * f;
    });
  }

  // ── Events, in order, as the clock passes them.
  while (cldPlaybackEventPtr < tl.events.length &&
         tl.events[cldPlaybackEventPtr].t <= cldPlaybackT) {
    cldPlayEvent(tl.events[cldPlaybackEventPtr], hooks);
    cldPlaybackEventPtr++;
  }

  // ── Aftermath beats — surfacings, the Thaw step, thaw-drops. Held for
  // CLD_AFTERMATH_MS past the last sample so they are not a jump cut.
  if (cldPlaybackT >= tl.durationMs) {
    const into = cldPlaybackT - tl.durationMs;
    const per  = CLD_AFTERMATH_MS / Math.max(1, tl.aftermath.length);
    while (cldAftermathPtr < tl.aftermath.length && into >= cldAftermathPtr * per) {
      cldPlayAftermath(tl.aftermath[cldAftermathPtr], hooks);
      cldAftermathPtr++;
    }
    if (into >= CLD_AFTERMATH_MS) return 'done';
  }
  return 'playing';
}
```

- [ ] **Step 5: Route the effects through `hooks`.** In `cldPlayEvent(e)` → `cldPlayEvent(e, hooks)`: every `cldSfx(x)` → `hooks.sfx(x)`, and `cldFloatBark();` → `hooks.bark();`. Same in `cldPlayAftermath(b)` → `cldPlayAftermath(b, hooks)` (`cldSfx('dive')`, `cldSfx('thaw')`, `cldSfx('plunge')`, `cldFloatBark()`). Grep `cldPlayEvent(\|cldPlayAftermath(` — the only callers are inside `cldStepPlayback`.

- [ ] **Step 6: The bark line and the live hooks.** Replace `cldFloatBark` (~2203):

```js
function cldBarkLine() { return CLD_PLUNGE_BARKS[Math.floor(Math.random() * CLD_PLUNGE_BARKS.length)]; }
function cldFloatBark() { cldFloatText(cldBarkLine()); }

// The live floe's replay effects. The Practice Arena passes its own pair, so a
// bark in Practice lands in the Arena's float layer, never the floe's.
const CLD_LIVE_HOOKS = { sfx: m => cldSfx(m), bark: () => cldFloatBark() };
```

- [ ] **Step 7: Run all the CLD harnesses** — the loopback is the proof the live replay is unchanged on 3 devices.

Run: `node tools/verify-cld-practice.js; node tools/verify-cld-loop.js; node tools/verify-cld-loopback.js`
Expected: practice `ALL CHECKS PASSED (58)`; loop and loopback `ALL CHECKS PASSED`.

- [ ] **Step 8: Commit**

```bash
git add js/games/cld.js tools/verify-cld-practice.js
git commit -m "refactor(cld): split the replay - cldStepPlayback returns 'done', only the live path navigates"
```

---

### Task 7: The swap — `cldArenaRun(fn)`

**Files:**
- Modify: `js/games/cld.js` — new block directly after `cldMatchWinner()` (~line 728), before the `STAGE 4 OF 6` banner (it is headless and belongs with the rules layer).
- Test: `tools/verify-cld-practice.js` (section G + shared helpers)

**Interfaces:**
- Produces: `CLD_SWAP_EXEMPT` (string[]); `cldSwapOut() → record`; `cldSwapIn(record)`; `CLD_PR_CAST = ['You', 'Sylvia', 'Sam']`; `cldPrFreshFloe() → record`; `let cldPrFloe`, `let cldPrSwapDepth`; `cldArenaRun(fn) → fn's return value`.
- The record's 28 keys (exact): `iceConditions, floeSize, floeSizeTouched, fishToWin, aimAssist, iceBreaker, peckOff, syllyMode, playerCount, playerNames, fish, floeOffNo, matchStats, slideNo, floeRadius, penguins, bergs, seatSeq, inBath, commits, timeline, playbackT, playbackEventPtr, aftermathPtr, lastSfxT, washoutUntil, phase, powerLock`.
- Produces (harness): `declaredLets()`, `liveSnapshot()`, `safeJSON(v)`.

- [ ] **Step 1: Write the failing tests** — insert above `// ── Report`:

```js
// ═══════════════════════════════════════════════════════════════════════════
// G. The swap (spec § 5.1, § 7.1 check 9(a))
// ═══════════════════════════════════════════════════════════════════════════
// Every top-level `let` in cld.js, read from the SOURCE — so a global added
// tomorrow is covered without anyone remembering to add it here.
function declaredLets() {
  const src = fs.readFileSync(GAME, 'utf8');
  const out = [];
  src.replace(/^let\s+([^;]+);/gm, (_, decl) => {
    decl.split(',').forEach(part => { const m = part.trim().match(/^(cld\w+)\s*(=|$)/); if (m) out.push(m[1]); });
    return '';
  });
  return out;
}
function safeJSON(v) {
  const seen = new WeakSet();
  return JSON.stringify(v, (k, x) => {
    if (typeof x === 'function') return '<fn>';
    if (x && typeof x === 'object') {
      if (typeof x.getContext === 'function' || x.tagName) return '<el>';
      if (seen.has(x)) return '<cycle>';
      seen.add(x);
    }
    return x;
  });
}
// The LIVE game's state: every declared let except the Arena's own (cldPr*).
function liveSnapshot() {
  const snap = {};
  declaredLets().filter(n => !/^cldPr/.test(n)).forEach(n => {
    let v; try { v = G(n); } catch (_) { v = '<tdz>'; }
    snap[n] = safeJSON(v);
  });
  return snap;
}
function diffSnap(a, b) { return Object.keys(a).filter(k => a[k] !== b[k]); }

if (!TUNE) {
  section('G. The swap');
  const lets = declaredLets();
  const swapSrc = RUN('cldSwapOut').toString();
  const exempt  = G('CLD_SWAP_EXEMPT');
  const swapped = n => new RegExp('\\b' + n + '\\b').test(swapSrc);
  const unclassified = lets.filter(n => !swapped(n) && !exempt.includes(n));
  const both = lets.filter(n => swapped(n) && exempt.includes(n));
  check('every top-level let is swapped or exempt', unclassified, []);
  check('no let is both swapped and exempt', both, []);

  // The live match from section F is still loaded. Run a whole Arena Slide.
  const before = liveSnapshot();
  const n = RUN(`cldArenaRun(() => {
    cldStartFloeOff(5);
    cldCommits = [{ aims: [{ penguinId: '0-0', dx: 1, dy: 0, power: 1 }], dive: null, snowball: null },
                  { aims: [], dive: null, snowball: null }, { aims: [], dive: null, snowball: null }];
    cldResolveSlide(9);
    return cldPenguins.length;
  })`);
  check('the Arena Slide ran on the Arena record', [n, G('cldPrFloe').slideNo], [3, 1]);
  check('the live game is byte-identical after an Arena Slide', diffSnap(before, liveSnapshot()), []);

  let threw = false;
  try { RUN("cldArenaRun(() => { cldPenguins = []; throw new Error('boom'); })"); } catch (_) { threw = true; }
  ok('a throw inside the swap propagates', threw);
  check('…and the live game is still restored', diffSnap(before, liveSnapshot()), []);
  check('…and the swap depth is back to 0', G('cldPrSwapDepth'), 0);

  const inner = RUN('cldArenaRun(() => cldArenaRun(() => cldSlideNo))');
  check('a nested call never double-swaps (sees the Arena record)', inner, 1);
  check('…and still leaves the live game alone', diffSnap(before, liveSnapshot()), []);
}
```

- [ ] **Step 2: Run** — expect `cldSwapOut is not defined`.

- [ ] **Step 3: Implement** — directly after `cldMatchWinner()`:

```js
// ═══════════════════════════════════════════════════════════════════════════
// The Practice Arena's swap (spec § 5). The Arena runs the REAL rules layer on
// its own state record: cldArenaRun(fn) swaps the record into the module
// globals, runs ONE SYNCHRONOUS call, and restores the live values in
// `finally`. JavaScript is single-threaded, so no live RAF frame, Firebase
// callback or timer can run while the Arena's values sit in the globals — even
// with Practice opened mid-Slide from the floe's [?].
//
// This bends DD-12's wording ("never reads or writes cldPenguins") and keeps
// its intent: the live match is never disturbed (cld-impl-notes DD-18).
//
// MAY run inside the swap: the rules layer (cldStartFloeOff, cldResolveSlide,
// cldApplyPost, cldSeatSpot…), cldTimelinePayload / cldTimelineFromPayload,
// cldArmPlayback, cldStepPlayback, cldBuildModel / cldDiveModel.
// MAY NOT — ever: anything touching screens, the live loop, timers, the network
// or the live DOM — cldBeginPlayback, cldEndPlayback, cldAdvancePlayback,
// cldShowFloe, cldSyncFloeUI, cldHostResolveSlide, cldStartIceBathLocal,
// cldShowResult, cldFloatBark, cldFloatText, showScreen, mp*. And never an
// `await` or a setTimeout inside `fn`: the swap only holds for synchronous code.
// verify-cld-practice.js spies on every name in that list.
// ═══════════════════════════════════════════════════════════════════════════

// Every top-level `let cld*` is EITHER in cldSwapOut/cldSwapIn OR listed here
// with its reason. verify-cld-practice.js reads the source and fails on a new
// global that is neither — a missed variable is a red check, not a silent leak.
const CLD_SWAP_EXEMPT = [
  // This device's input and the live floe's canvas, loop and timers. The rules
  // and the replay never read them; the Arena keeps its own (cldPrUi, cldPrView).
  'cldMyAims', 'cldMyDive', 'cldMyMode', 'cldMySnowball', 'cldCommitted', 'cldIntroMode',
  'cldView', 'cldRafHandle', 'cldIntroTimer', 'cldResultTimer', 'cldSkinArt', 'cldLastFrameT',
  'cldDragging', 'cldDragPenguin', 'cldDragFrom', 'cldDragTo', 'cldDragDir', 'cldPtrId',
  'cldIntroIdx', 'cldFloatTimer', 'cldClock',
  // How to Play's The Cast loop.
  'cldHowtoRaf', 'cldHowtoLastT', 'cldHowtoClock', 'cldHowtoCast',
  // The Floe tab's sandbox — deleted in Task 10 (and from this list with it).
  'cldHowtoCtx', 'cldHowtoPeng', 'cldHowtoTL', 'cldHowtoPlayT',
  // The Arena's own state.
  'cldPrFloe', 'cldPrUi', 'cldPrView', 'cldPrRaf', 'cldPrLastT', 'cldPrClock',
  'cldPrFloatTimer', 'cldPrSwapDepth',
];

function cldSwapOut() {
  return {
    iceConditions: cldIceConditions, floeSize: cldFloeSize, floeSizeTouched: cldFloeSizeTouched,
    fishToWin: cldFishToWin, aimAssist: cldAimAssist, iceBreaker: cldIceBreaker,
    peckOff: cldPeckOff, syllyMode: cldSyllyMode,
    playerCount: cldPlayerCount, playerNames: cldPlayerNames,
    fish: cldFish, floeOffNo: cldFloeOffNo, matchStats: cldMatchStats,
    slideNo: cldSlideNo, floeRadius: cldFloeRadius, penguins: cldPenguins, bergs: cldBergs,
    seatSeq: cldSeatSeq, inBath: cldInBath,
    commits: cldCommits, timeline: cldTimeline, playbackT: cldPlaybackT,
    playbackEventPtr: cldPlaybackEventPtr, aftermathPtr: cldAftermathPtr,
    lastSfxT: cldLastSfxT, washoutUntil: cldWashoutUntil,
    phase: cldPhase, powerLock: cldPowerLock,
  };
}

function cldSwapIn(s) {
  cldIceConditions = s.iceConditions; cldFloeSize = s.floeSize; cldFloeSizeTouched = s.floeSizeTouched;
  cldFishToWin = s.fishToWin; cldAimAssist = s.aimAssist; cldIceBreaker = s.iceBreaker;
  cldPeckOff = s.peckOff; cldSyllyMode = s.syllyMode;
  cldPlayerCount = s.playerCount; cldPlayerNames = s.playerNames;
  cldFish = s.fish; cldFloeOffNo = s.floeOffNo; cldMatchStats = s.matchStats;
  cldSlideNo = s.slideNo; cldFloeRadius = s.floeRadius; cldPenguins = s.penguins; cldBergs = s.bergs;
  cldSeatSeq = s.seatSeq; cldInBath = s.inBath;
  cldCommits = s.commits; cldTimeline = s.timeline; cldPlaybackT = s.playbackT;
  cldPlaybackEventPtr = s.playbackEventPtr; cldAftermathPtr = s.aftermathPtr;
  cldLastSfxT = s.lastSfxT; cldWashoutUntil = s.washoutUntil;
  cldPhase = s.phase; cldPowerLock = s.powerLock;
}

// The Practice cast (ui-style.md § Practice tab): You, then Sylvia, then Sam.
const CLD_PR_CAST = ['You', 'Sylvia', 'Sam'];

// A fresh Arena record: Standard floe, Slush, Ice Breaker 2, no Thaw, 3 players.
// Aim Assist is copied from the live setting so the Arena shows what the game will.
function cldPrFreshFloe() {
  return {
    iceConditions: 'slush', floeSize: 'standard', floeSizeTouched: true, fishToWin: 99,
    aimAssist: cldAimAssist, iceBreaker: 2, peckOff: false, syllyMode: false,
    playerCount: 3, playerNames: CLD_PR_CAST.slice(),
    fish: [0, 0, 0], floeOffNo: 0,
    matchStats: [0, 1, 2].map(() => ({ slidesStood: 0, plunges: 0 })),
    slideNo: 0, floeRadius: 0, penguins: [], bergs: [], seatSeq: 0, inBath: false,
    commits: [null, null, null], timeline: null, playbackT: 0,
    playbackEventPtr: 0, aftermathPtr: 0, lastSfxT: 0, washoutUntil: 0,
    phase: 'aiming', powerLock: null,
  };
}

let cldPrFloe      = null;   // the Arena's record while it is NOT swapped in
let cldPrSwapDepth = 0;      // > 0 while the Arena's values sit in the globals

function cldArenaRun(fn) {
  if (cldPrSwapDepth > 0) return fn();         // already swapped in — never double-swap
  if (!cldPrFloe) cldPrFloe = cldPrFreshFloe();
  const live = cldSwapOut();
  cldSwapIn(cldPrFloe);
  cldPrSwapDepth++;
  try { return fn(); }
  finally {
    cldPrSwapDepth--;
    cldPrFloe = cldSwapOut();
    cldSwapIn(live);
  }
}
```

- [ ] **Step 4: Run** — `node tools/verify-cld-practice.js` → `ALL CHECKS PASSED (67)`. If "every top-level let is swapped or exempt" fails, the FAIL line names the variable: classify it (swap it if the rules/replay read or write it, else exempt it with a reason).

- [ ] **Step 5: Run the other CLD harnesses** (the rules layer gained definitions only) — `node tools/verify-cld-loop.js; node tools/verify-cld-loopback.js` → both green.

- [ ] **Step 6: Commit**

```bash
git add js/games/cld.js tools/verify-cld-practice.js
git commit -m "feat(cld): cldArenaRun - run the real rules on the Arena's record, live state untouched"
```

---

### Task 8: The drills and the Arena's Slide (no UI yet)

**Files:**
- Modify: `js/games/cld.js` — new `// ═══ The Practice Arena` block directly after `cldHowtoStop()` (~line 2490).
- Test: `tools/verify-cld-practice.js` (sections H, H2, and the `--tune` mode)

**Interfaces:**
- Consumes: `cldArenaRun`, `cldPrFreshFloe`, `CLD_PR_CAST` (T7); `cldArmPlayback`, `cldStepPlayback`, `cldBarkLine` (T6).
- Produces:
  - `CLD_PR_DRILLS = { headon, crossfire, edge }`, each `{ name, ringSeed, slideSeed, gapAt: number|null, place: [{at, r}×3], shoves: [null | {target, power}]×3 }` — index 0 is You, 1 Sylvia, 2 Sam.
  - `let cldPrUi = null` — `{ drill, aim, lock, mode, snowball, dive, playing, outcome, knocked, rivalAims:[null|{penguinId,dx,dy,power}]×3, drag }`. (Task 9 adds `coach`.)
  - `cldReducedMotion() → bool`.
  - `cldPrLoadDrill(key, keepAim)`; `cldPrRivalCommit(i) → commit`; `cldPrResolve(mine)`; `cldPrTick(dtMs)`; `cldPrSlideDone()`; `cldPrFloat(text)`; `let cldPrFloatTimer`.
  - `cldPrUi.outcome ∈ 'dry' | 'in' | 'fish' | 'washout' | null`; precedence washout > in > fish > dry.

- [ ] **Step 1: Write the failing tests** — insert above `// ── Report`:

```js
// ═══════════════════════════════════════════════════════════════════════════
// H. The drills (spec § 6.3–6.4; § 7.1 checks 3–6) — and `--tune`
// ═══════════════════════════════════════════════════════════════════════════
const HOLD = { aims: [], dive: null, snowball: null };
const arena = expr => RUN('cldArenaRun(() => ' + expr + ')');
const meNow = () => arena("cldPenguins.find(p => p.id === '0-0')");
function playOut() { let g = 0; while (G('cldPrUi').playing && g++ < 4000) RUN('cldPrTick(50)'); }
function resolveWith(commit) { S.__c = commit; RUN('cldPrResolve(__c)'); playOut(); }
function aimAt(angle, power) {
  return { aims: [{ penguinId: '0-0', dx: Math.cos(angle), dy: Math.sin(angle), power }], dive: null, snowball: null };
}
function load(key, keep) { RUN(`cldPrLoadDrill('${key}', ${!!keep})`); }
function startClean() {
  return arena(`(() => {
    for (const p of cldPenguins) {
      for (const b of cldBergs) if (Math.hypot(p.x - b.x, p.y - b.y) < b.r + CLD_PENGUIN_R) return false;
      for (const q of cldPenguins) if (q !== p && Math.hypot(p.x - q.x, p.y - q.y) < 2 * CLD_PENGUIN_R) return false;
    }
    return true; })()`);
}
function claimHolds(key) {
  load(key); resolveWith(HOLD);
  const d = G('CLD_PR_DRILLS')[key], m = meNow();
  const events = arena('cldTimeline.events');
  if (key === 'headon')    return !!m.drowned;
  if (key === 'crossfire') return events.some(e => e.type === 'collision' && (e.a === '0-0' || e.b === '0-0'));
  if (key === 'edge')      return !!m.drowned && RUN('cldArcDist')(m.angle, d.gapAt) < 0.35;
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
// Stand still, go in, then Snowball Sylvia until someone knocks your plug back.
function berthReachable(key) {
  load(key); resolveWith(HOLD);
  if (!meNow().drowned) return false;
  for (let i = 0; i < 6; i++) {
    if (G('cldPrUi').knocked) return true;
    const sy = arena("cldPenguins.find(p => p.id === '1-0')");
    resolveWith({ aims: [], dive: null, snowball: { x: sy.x, y: sy.y } });
  }
  return !!G('cldPrUi').knocked;
}

if (TUNE) {
  // Prints, per drill, the first ring seed at which every claim the harness
  // checks holds. Paste the numbers into CLD_PR_DRILLS. Asserts nothing.
  const drills = G('CLD_PR_DRILLS');
  for (const key of Object.keys(drills)) {
    let hit = null;
    for (let seed = 1; seed <= 4000 && hit === null; seed++) {
      RUN(`CLD_PR_DRILLS['${key}'].ringSeed = ${seed}`);
      load(key);
      if (!startClean() || !claimHolds(key)) continue;
      if (key === 'headon' && !berthReachable(key)) continue;
      if (!counters(key).length) continue;
      hit = seed;
    }
    console.log(`${key.padEnd(10)} ringSeed: ${hit === null ? 'NONE in 1..4000 — move place/shoves and re-run' : hit}`);
  }
  process.exit(0);
}

if (!TUNE) {
  section('H. The drills');
  const keys = Object.keys(G('CLD_PR_DRILLS'));
  check('three drills, in order', keys, ['headon', 'crossfire', 'edge']);
  keys.forEach(key => {
    load(key);
    ok(`${key}: nobody starts overlapping a chunk or a penguin`, startClean());
    ok(`${key}: the stand-still claim holds`, claimHolds(key));
    ok(`${key}: at least one counter keeps you Standing`, counters(key).length > 0, 'none of 180 aims');
    load(key); resolveWith(aimAt(0.3, 0.8)); const t1 = safeJSON(arena('[cldTimeline.samples, cldTimeline.events]'));
    load(key); resolveWith(aimAt(0.3, 0.8)); const t2 = safeJSON(arena('[cldTimeline.samples, cldTimeline.events]'));
    ok(`${key}: the same aim gives a byte-identical Slide`, t1 === t2);
  });

  load('headon'); const r1 = safeJSON(G('cldPrUi').rivalAims);
  resolveWith(aimAt(1, 0.5)); load('headon', true);
  ok('the rivals shove the same way on every go', r1 === safeJSON(G('cldPrUi').rivalAims));
  S.__aim = { penguinId: '0-0', dx: 0, dy: 1, power: 0.7 };
  RUN('cldPrUi.aim = __aim'); load('headon', true);
  check('Go again keeps your armed aim', safeJSON(G('cldPrUi').aim), safeJSON(S.__aim));
  load('crossfire');
  check('a new drill clears it', G('cldPrUi').aim, null);

  load('headon'); resolveWith(HOLD);
  check('Head-on, stand still → outcome in', G('cldPrUi').outcome, 'in');
  ok('the Berth branch reaches Knocked back (Head-on)', berthReachable('headon'));
  const spot = arena("cldSeatSpot(Math.PI / 2, '0-0')");
  if (spot) resolveWith({ aims: [], dive: { penguinId: '0-0', angle: spot.angle }, snowball: null });
  ok('a Dive arrives Plugged', !!spot && meNow().plug === true);

  S.window.matchMedia = () => ({ matches: true });
  load('headon'); S.__c = HOLD; RUN('cldPrResolve(__c)');
  ok('reduced motion: the Slide is finished the moment it is committed', G('cldPrUi').playing === false &&
     G('cldPrUi').outcome === 'in');
  S.window.matchMedia = () => ({ matches: false });

  // ── 9(b)/9(c): a LIVE replay is mid-flight; Arena Slides run between its steps.
  section('H2. Isolation under a live replay');
  S.__forbidden = [];
  ['cldBeginPlayback', 'cldEndPlayback', 'cldAdvancePlayback', 'cldShowFloe', 'cldSyncFloeUI',
   'cldHostResolveSlide', 'cldStartIceBathLocal', 'cldShowResult', 'cldFloatBark', 'cldFloatText']
    .forEach(fn => RUN(`(() => { const o = ${fn}; ${fn} = function () {
      if (cldPrSwapDepth > 0) __forbidden.push('${fn}'); return o.apply(this, arguments); }; })()`));
  const realShow = S.showScreen;
  S.showScreen = id => { if (G('cldPrSwapDepth') > 0) S.__forbidden.push('showScreen'); realShow(id); };

  RUN(`(() => {
    cldStartFloeOff(21);
    const a = cldPenguins[0], b = cldPenguins[1];
    cldCommits = [{ aims: [{ penguinId: a.id, dx: b.x - a.x, dy: b.y - a.y, power: 1 }], dive: null, snowball: null },
                  { aims: [], dive: null, snowball: null }, { aims: [], dive: null, snowball: null }];
    cldBeginPlayback(cldTimelineFromPayload(cldTimelinePayload(cldResolveSlide(33))));
    cldAdvancePlayback(200);
  })()`);
  check('the live replay is mid-flight', G('cldPhase'), 'resolving');
  const sent0 = sent.envelope + sent.private;
  let drift = [];
  const order = ['headon', 'crossfire', 'edge'];
  for (let i = 0; i < 20; i++) {
    const before = liveSnapshot();
    load(order[i % 3]);
    resolveWith(aimAt(i * 0.7, 0.4 + (i % 5) * 0.12));
    drift = drift.concat(diffSnap(before, liveSnapshot()));
    if (G('cldPhase') === 'resolving') RUN('cldAdvancePlayback(50)');   // Review Focus 3
  }
  check('20 Arena Slides between live replay steps leave the live game untouched', [...new Set(drift)], []);
  check('nothing on the "may not" list ran inside the swap', S.__forbidden, []);
  check('the Arena sent nothing', sent.envelope + sent.private - sent0, 0);
  S.showScreen = realShow;
}
```

- [ ] **Step 2: Run** — expect `cldPrLoadDrill is not defined`.

- [ ] **Step 3: Implement the Arena core** — directly after `cldHowtoStop()`:

```js
// ═══════════════════════════════════════════════════════════════════════════
// The Practice Arena (spec § 6) — You, Sylvia and Sam on a fixed floe. The
// rivals' shoves are FIXED and drawn before you move; yours is free. Every
// Slide runs the real rules through cldArenaRun, so the same counter always
// gives the same result — which is what makes it practice.
// ═══════════════════════════════════════════════════════════════════════════
// place: { at: angle, r: × floe radius }. shoves: null (holds still) or
// { target: seat, power } — aimed at the target's START position, once, so a
// rival repeats the same shove from wherever it stands.
// ringSeed values come from `node tools/verify-cld-practice.js --tune`.
const CLD_PR_DRILLS = {
  headon:    { name: 'Head-on',   ringSeed: 1, slideSeed: 1, gapAt: 0,
               place:  [{ at: 0, r: 0.62 }, { at: 0, r: 0.05 }, { at: -Math.PI / 2, r: 0.6 }],
               shoves: [null, { target: 0, power: 1.0 }, null] },
  crossfire: { name: 'Crossfire', ringSeed: 1, slideSeed: 1, gapAt: null,
               place:  [{ at: 0, r: 0 }, { at: Math.PI, r: 0.6 }, { at: 0, r: 0.6 }],
               shoves: [null, { target: 2, power: 0.9 }, null] },
  edge:      { name: 'Edge',      ringSeed: 1, slideSeed: 1, gapAt: Math.PI / 2,
               place:  [{ at: Math.PI / 2, r: 0.8 }, { at: Math.PI, r: 0.6 }, { at: Math.PI / 2, r: 0.45 }],
               shoves: [null, null, { target: 0, power: 0.7 }] },
};

let cldPrUi         = null;   // the Arena's input + flow state (never swapped)
let cldPrFloatTimer = null;   // TIMER — the Arena's own bark layer

function cldReducedMotion() {
  try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  catch (_) { return false; }
}

// A fresh go at `key`. keepAim (Go again, Resurface) keeps your armed aim and
// your locked power, so the next try is an adjustment, not a fresh start.
function cldPrLoadDrill(key, keepAim) {
  const d = CLD_PR_DRILLS[key];
  const prev = keepAim ? cldPrUi : null;
  cldPrFloe = cldPrFreshFloe();
  const rivalAims = [null, null, null];
  cldArenaRun(() => {
    cldStartFloeOff(d.ringSeed);                 // the real setup: radius, ring, penguins
    d.place.forEach((pl, i) => {
      const pos = cldRimPos(pl.at, cldFloeRadius * pl.r);
      cldPenguins[i].x = pos.x; cldPenguins[i].y = pos.y;
    });
    d.shoves.forEach((s, i) => {
      if (!s) return;
      const from = cldPenguins[i], to = cldPenguins[s.target];
      const l = Math.hypot(to.x - from.x, to.y - from.y) || 1;
      rivalAims[i] = { penguinId: from.id, dx: (to.x - from.x) / l, dy: (to.y - from.y) / l, power: s.power };
    });
  });
  cldPrUi = {
    drill: key, aim: prev ? prev.aim : null, lock: prev ? prev.lock : null,
    mode: 'throw', snowball: null, dive: null,
    playing: false, outcome: null, knocked: false, rivalAims: rivalAims, drag: null,
  };
}

// A rival repeats its fixed shove while Standing; a Drowned rival does nothing.
function cldPrRivalCommit(i) {
  const shove = cldPrUi.rivalAims[i];
  const p = cldArenaRun(() => cldPenguins.find(q => q.ownerIdx === i));
  return { aims: (shove && p && !p.drowned) ? [shove] : [], dive: null, snowball: null };
}

// Resolve one Arena Slide with MY commit — the host's own path, byte for byte:
// resolve → payload → timeline (§16 Q5), then arm the replay.
function cldPrResolve(mine) {
  const u = cldPrUi;
  const d = CLD_PR_DRILLS[u.drill];
  cldArenaRun(() => {
    cldCommits = [mine, cldPrRivalCommit(1), cldPrRivalCommit(2)];
    cldArmPlayback(cldTimelineFromPayload(cldTimelinePayload(cldResolveSlide(d.slideSeed))));
  });
  u.playing = true;
  if (cldReducedMotion()) cldPrTick(1e9);        // nothing travels — straight to the end state
}

// One step of the Arena's replay. Barks are queued inside the swap and drawn
// AFTER it — no DOM timer is ever created while the Arena's values are live.
function cldPrTick(dtMs) {
  const u = cldPrUi;
  if (!u || !u.playing) return;
  let bark = null;
  const hooks = { sfx: m => cldSfx(m), bark: () => { bark = cldBarkLine(); } };
  const r = cldArenaRun(() => cldStepPlayback(dtMs, hooks));
  if (bark) cldPrFloat(bark);
  if (r !== 'playing') cldPrSlideDone();
}

function cldPrSlideDone() {
  const u = cldPrUi;
  const res = cldArenaRun(() => {
    const tl = cldTimeline;
    cldPenguins.forEach(p => { p.plungedThisSlide = false; });
    if (tl) cldApplyPost(tl.post);
    const me = cldPenguins.find(p => p.id === '0-0');
    return { washout: !!(tl && tl.washout), meIn: !!me.drowned, knocked: !!(me.drowned && !me.plug),
             rivalsIn: cldPenguins.filter(p => p.ownerIdx !== 0).every(p => p.drowned) };
  });
  u.playing  = false;
  u.outcome  = res.washout ? 'washout' : res.meIn ? 'in' : res.rivalsIn ? 'fish' : 'dry';
  u.knocked  = res.knocked;
  u.snowball = null;
  u.dive     = null;                              // one-shot, like the live floe after a Slide
}

function cldPrFloat(text) {
  const layer = document.getElementById('cld-pr-float');
  if (!layer) return;
  layer.innerHTML = '';
  const el = document.createElement('p');
  el.className = 'text-white font-bold text-base px-3 py-1 rounded-full';
  el.style.cssText = 'background:rgba(18,59,76,0.72); text-shadow:0 1px 2px rgba(0,0,0,.5);';
  el.textContent = text;
  layer.appendChild(el);
  if (cldPrFloatTimer) { clearTimeout(cldPrFloatTimer); cldPrFloatTimer = null; }
  cldPrFloatTimer = setTimeout(() => {
    cldPrFloatTimer = null;
    const l = document.getElementById('cld-pr-float');
    if (l) l.innerHTML = '';
  }, CLD_BARK_MS);
}
```

- [ ] **Step 4: Tune the drills.**

Run: `node tools/verify-cld-practice.js --tune`
Expected output, one line per drill, e.g. `headon     ringSeed: 37`. Paste each number into that drill's `ringSeed` in `CLD_PR_DRILLS`. If a drill prints `NONE in 1..4000`, move its `place`/`shoves` by small steps — `r` ±0.05, `power` ±0.1 — and re-run until all three print a seed. **Record the final table in the Task 13 impl-notes entry.**

- [ ] **Step 5: Run everything**

Run: `node tools/verify-cld-practice.js; node tools/verify-cld-loop.js; node tools/verify-cld-loopback.js`
Expected: practice `ALL CHECKS PASSED (91)`; the other two green.

- [ ] **Step 6: Commit**

```bash
git add js/games/cld.js tools/verify-cld-practice.js
git commit -m "feat(cld): Practice Arena core - three tuned drills on the real rules, isolation proven"
```

---

### Task 9: The coach — a pure reducer

**Files:**
- Modify: `js/games/cld.js` — new code directly after `CLD_PR_DRILLS`; small edits to `cldPrLoadDrill`, `cldPrResolve`, `cldPrSlideDone` (Task 8).
- Test: `tools/verify-cld-practice.js` (section I)

**Interfaces:**
- Produces:
  - `CLD_PR_COACH` — the coach lines, keyed `1, 2, 3, 4, dry, fish, washout, ready, B1, B2k, B2p, B3`.
  - Coach state `{ at: 1|2|3|4|5|'B1'|'B2'|'B3', result: 'dry'|'fish'|'washout'|'ready'|null, knocked: bool, reachedEnd: bool, pending: 'snowball'|'dive'|null }`.
  - `cldPrCoachStart() → state`; `cldPrCoach(state, ev) → state` (pure; never mutates `state`); events `{type:'armed'}`, `{type:'locked'}`, `{type:'committed', snowball, dive}`, `{type:'slideDone', outcome, knocked}`, `{type:'reset'}`, `{type:'restart'}`.
  - `cldPrCoachView(state) → { line, step, ring }` — `step` like `'2 / 5'` or `'1 / 3'`; `ring ∈ 'stage'|'power'|'commit'|'resurface'|'dive'|null`.
  - `cldPrCoachDispatch(ev)` — applies to `cldPrUi.coach`.
  - `cldPrUi.coach` — carried across `cldPrLoadDrill` (a drill change or Go again never loses your place).

- [ ] **Step 1: Write the failing tests** — insert above `// ── Report`:

```js
// ═══════════════════════════════════════════════════════════════════════════
// I. The coach (spec § 6.5)
// ═══════════════════════════════════════════════════════════════════════════
if (!TUNE) {
  section('I. The coach');
  const start = () => RUN('cldPrCoachStart()');
  const step = (s, ...evs) => evs.reduce((acc, e) => RUN('cldPrCoach')(acc, e), s);
  const view = s => RUN('cldPrCoachView')(s);
  const A = { type: 'armed' }, L = { type: 'locked' }, R = { type: 'reset' };
  const C = (x) => Object.assign({ type: 'committed', snowball: false, dive: false }, x || {});
  const D = (outcome, knocked) => ({ type: 'slideDone', outcome, knocked: !!knocked });

  let s = start();
  check('starts at 1 / 5, ring on the stage', [view(s).step, view(s).ring], ['1 / 5', 'stage']);
  s = step(s, A);  check('armed → 2, ring on Power', [s.at, view(s).ring], [2, 'power']);
  s = step(s, L);  check('locked → 3, ring on Lock It In', [s.at, view(s).ring], [3, 'commit']);
  s = step(s, C()); check('committed → 4', s.at, 4);
  s = step(s, D('dry'));
  check('dry → 5 / 5 "Still dry", end reached', [view(s).step, s.result, s.reachedEnd], ['5 / 5', 'dry', true]);
  check('skipping the lock: 2 + commit → 4', step(start(), A, C()).at, 4);
  check('armed does nothing before step 1 advances twice', step(start(), A, A).at, 2);

  s = step(start(), A, C(), D('in'));
  check('going in → B1, 1 / 3', [s.at, view(s).step], ['B1', '1 / 3']);
  check('B1 + a bare commit stays B1', step(s, C(), D('in', false)).at, 'B1');
  s = step(s, C({ snowball: true }), D('in', false));
  check('B1 + Snowball, still plugged → B2 "Still plugged", ring Resurface',
        [s.at, view(s).line === G('CLD_PR_COACH').B2p, view(s).ring], ['B2', true, 'resurface']);
  s = step(s, C({ snowball: true }), D('in', true));
  check('B2 + knocked back → the Dive line, ring on Dive', [view(s).line === G('CLD_PR_COACH').B2k, view(s).ring], [true, 'dive']);
  s = step(s, C({ dive: true }), D('in', false));
  check('a Dive → B3, 3 / 3, end reached', [s.at, view(s).step, s.reachedEnd], ['B3', '3 / 3', true]);

  check('a Washout ends anything on step 5', step(start(), A, C(), D('washout')).result, 'washout');
  check('reset while learning keeps your place', step(start(), A, R).at, 2);
  s = step(start(), A, C(), D('in'), R);
  check('reset from the Berth → 5 "Your go", end reached', [s.at, s.result, s.reachedEnd], [5, 'ready', true]);
  check('restart → back to 1 / 5', view(step(s, { type: 'restart' })).step, '1 / 5');
  const frozen = start(); step(frozen, A);
  check('the reducer never mutates its input', frozen.at, 1);
  ok('every coach line is set and emoji-free', Object.values(G('CLD_PR_COACH'))
     .every(l => typeof l === 'string' && l.length > 10 && !/\p{Extended_Pictographic}/u.test(l)));

  // Wired into the Arena: committing and finishing a Slide drive the coach.
  RUN('cldPrUi.coach = cldPrCoachStart()');
  load('headon', true);
  ok('the coach survives a drill reload', G('cldPrUi').coach.at === 1);
  resolveWith(HOLD);
  check('Arena: a stand-still Head-on walks the coach 1 → 4 → B1', G('cldPrUi').coach.at, 'B1');
}
```

- [ ] **Step 2: Run** — expect `cldPrCoachStart is not defined`.

- [ ] **Step 3: Implement** — directly after `CLD_PR_DRILLS`:

```js
// The coach (spec § 6.5). Every step waits for the player to DO the thing; a
// soft ring points at the control being taught. Lines are copy — they are
// mirrored verbatim in docs/game-identities/cld.md T7b (a paired change).
const CLD_PR_COACH = {
  1:       'Their shoves are drawn in their colours, and they’ll do the same thing every time. Touch anywhere and pull back — your finger is the end of the cue.',
  2:       'The ghost shows where you’ll hit first. Tap Power to lock it — then dragging only swings your aim.',
  3:       'Happy? Lock It In. Once it’s in, it’s in.',
  4:       'Everyone slides at once.',
  dry:     'Still dry. Try another counter — or another drill.',
  fish:    'Last one dry — that’d be a Fish.',
  washout: 'Washout — everyone’s in. Resurface.',
  ready:   'Your go. Try a counter — or another drill.',
  B1:      'You’re in the Drink — and you’ve plugged the gap you went through. The next penguin to hit you bounces off. Tap a penguin to aim a Snowball, then Lock It In.',
  B2k:     'Knocked back — so now it’s Throw or Dive. Tap Dive, then a dashed gap.',
  B2p:     'Still plugged. Resurface to try the drill again.',
  B3:      'That’s the Drink. Resurface to get back on the ice.',
};

function cldPrCoachStart() { return { at: 1, result: null, knocked: false, reachedEnd: false, pending: null }; }

// PURE. Locking is taught, not required: a commit at step 2 jumps straight to
// 4 (Lock It In is never disabled to force a step — the ring points, the
// player chooses). In the Berth branch, what you committed decides the next
// line once the Slide it started has played out.
function cldPrCoach(s, ev) {
  const n = Object.assign({}, s);
  switch (ev.type) {
    case 'restart': return cldPrCoachStart();
    case 'armed':   if (s.at === 1) n.at = 2; return n;
    case 'locked':  if (s.at === 2) n.at = 3; return n;
    case 'committed':
      if (s.at === 'B1' || s.at === 'B2') { n.pending = ev.dive ? 'dive' : ev.snowball ? 'snowball' : null; return n; }
      if (s.at === 'B3') return n;
      n.at = 4; return n;
    case 'slideDone':
      if (ev.outcome === 'washout') { n.at = 5; n.result = 'washout'; n.reachedEnd = true; n.pending = null; return n; }
      if (s.at === 'B1') { if (s.pending === 'snowball') { n.at = 'B2'; n.knocked = !!ev.knocked; } n.pending = null; return n; }
      if (s.at === 'B2') {
        if (s.knocked && s.pending === 'dive') { n.at = 'B3'; n.reachedEnd = true; }
        else n.knocked = !!ev.knocked;
        n.pending = null; return n;
      }
      if (s.at === 'B3') return n;
      if (ev.outcome === 'in') { n.at = 'B1'; n.pending = null; return n; }
      n.at = 5; n.result = ev.outcome; n.reachedEnd = true; return n;
    case 'reset':
      if (s.at === 1 || s.at === 2 || s.at === 3) return n;   // still learning — keep your place
      n.at = 5; n.result = 'ready'; n.reachedEnd = true; n.pending = null; return n;
  }
  return n;
}

function cldPrCoachView(s) {
  const C = CLD_PR_COACH;
  if (s.at === 'B1') return { line: C.B1, step: '1 / 3', ring: 'stage' };
  if (s.at === 'B2') return s.knocked ? { line: C.B2k, step: '2 / 3', ring: 'dive' }
                                      : { line: C.B2p, step: '2 / 3', ring: 'resurface' };
  if (s.at === 'B3') return { line: C.B3, step: '3 / 3', ring: 'resurface' };
  if (s.at === 5)    return { line: C[s.result] || C.ready, step: '5 / 5',
                              ring: s.result === 'washout' ? 'resurface' : 'commit' };
  return { line: C[s.at], step: s.at + ' / 5',
           ring: s.at === 1 ? 'stage' : s.at === 2 ? 'power' : s.at === 3 ? 'commit' : null };
}

function cldPrCoachDispatch(ev) { if (cldPrUi) cldPrUi.coach = cldPrCoach(cldPrUi.coach, ev); }
```

- [ ] **Step 4: Wire it into the Task 8 functions.**
  - `cldPrLoadDrill`: in the `cldPrUi = { … }` literal add `coach: cldPrUi ? cldPrUi.coach : cldPrCoachStart(),` — and move that read **above** the assignment: `const coach = cldPrUi ? cldPrUi.coach : cldPrCoachStart();` then `coach: coach,`.
  - `cldPrResolve`: after `u.playing = true;` add `cldPrCoachDispatch({ type: 'committed', snowball: !!mine.snowball, dive: !!mine.dive });` — **before** the reduced-motion line, so the commit is seen before the Slide ends.
  - `cldPrSlideDone`: at the end add `cldPrCoachDispatch({ type: 'slideDone', outcome: u.outcome, knocked: u.knocked });`.

- [ ] **Step 5: Run** — `node tools/verify-cld-practice.js` → `ALL CHECKS PASSED (111)`.

- [ ] **Step 6: Commit**

```bash
git add js/games/cld.js tools/verify-cld-practice.js
git commit -m "feat(cld): the Practice coach - gated steps, the Berth branch, a pure reducer"
```

---

### Task 10: The tabs — Rules | Practice | The Cast, and The Floe tab retired

**Files:**
- Modify: `src/screens/cld.html` — the `cld-how-to-overlay` block (lines ~263–377).
- Modify: `css/styles.css` — after the `#cld-canvas` rule (~line 2693).
- Modify: `js/games/cld.js` — `cldSetHowtoTab` (~2256), the `cldHowto*` block (~2270–2490), `cldResetState` (~2915–2916), `CLD_SWAP_EXEMPT` (Task 7), the How-to wiring (~3044–3057).
- Test: `tools/verify-cld-practice.js` (section J)

**Interfaces:**
- Produces: tab ids `data-cld-howto-tab="rules|practice|cast"`; body ids `cld-howto-body-rules|practice|cast`; close buttons `btn-cld-howto-close`, `btn-cld-howto-close-practice`, `btn-cld-howto-close-cast`; Practice pane ids `cld-pr-coach`, `cld-pr-coach-step`, `cld-pr-coach-line`, `cld-pr-stage`, `cld-pr-canvas`, `cld-pr-float`, `cld-pr-drowned-row`, `btn-cld-pr-mode-throw|dive` (`data-cld-pr-mode`), `cld-pr-dive-reason`, `btn-cld-pr-power`, `cld-pr-power-hint`, `cld-pr-power-track`, `cld-pr-power-fill`, `btn-cld-pr-commit`, `btn-cld-pr-resurface`, `btn-cld-pr-again`; drill pills `data-cld-pr-drill`.
- Produces: `cldPracticeStart()` / `cldPracticeStop()` **stubs** in this task (Task 11 fills them); `cldSetHowtoTab(tab)` calling them.
- Removes: `CLD_HOWTO_N`, `CLD_HOWTO_RADIUS`, `CLD_HOWTO_HOLD_MS`, `cldHowtoCtx`, `cldHowtoPeng`, `cldHowtoTL`, `cldHowtoPlayT`, `cldHowtoSeed`, `cldHowtoShove`, `cldHowtoSettle`, `cldHowtoDrawFloe`.

- [ ] **Step 1: Write the failing tests** — insert above `// ── Report`:

```js
// ═══════════════════════════════════════════════════════════════════════════
// J. The tabs (spec § 6.1)
// ═══════════════════════════════════════════════════════════════════════════
if (!TUNE) {
  section('J. The tabs');
  const $ = id => S.document.getElementById(id);
  const shown = () => ['rules', 'practice', 'cast'].filter(t => $('cld-howto-body-' + t).style.display === 'flex');
  RUN("cldSetHowtoTab('practice')"); check('Practice shows only its own body', shown(), ['practice']);
  RUN("cldSetHowtoTab('cast')");     check('The Cast shows only its own body', shown(), ['cast']);
  RUN("cldSetHowtoTab('rules')");    check('The Rules shows only its own body', shown(), ['rules']);
  ok('The Floe sandbox is gone', RUN("['cldHowtoSeed','cldHowtoShove','cldHowtoSettle','cldHowtoDrawFloe']" +
     ".every(n => { try { eval(n); return false; } catch (_) { return true; } })"));
  ok('its constants are gone too', RUN("typeof CLD_HOWTO_RADIUS === 'undefined' && typeof CLD_HOWTO_N === 'undefined'"));
  const html = fs.readFileSync(path.join(ROOT, 'src/screens/cld.html'), 'utf8');
  ok('the markup has the three tabs and no Floe tab',
     /data-cld-howto-tab="practice"/.test(html) && /data-cld-howto-tab="cast"/.test(html) &&
     !/data-cld-howto-tab="floe"/.test(html) && !/cld-howto-floe-canvas/.test(html));
  ok('How to Play step 2 teaches the cue', /Pull back to aim, like a pool cue/.test(html) && !/like a slingshot/.test(html));
}
```

- [ ] **Step 2: Run** — expect FAIL (no practice/cast bodies; The Floe still present).

- [ ] **Step 3: The markup.** In `src/screens/cld.html`:

(a) Replace the overlay's leading comment (lines ~263–265) with:

```html
  <!-- CLD HOW TO PLAY — three tabs (SW v244): The Rules | Practice | The Cast.
       Practice is the Arena (spec 2026-09-28-cld-cue-arena § 6): the floe's own
       renderer (cldDraw) fed cldArenaModel(), on the real rules via cldArenaRun.
       Tap-hold on a penguin is deliberately left idle under the documented
       Tap-Hold Reference exception. -->
```

(b) The tab bar — replace the two tab buttons with:

```html
        <button id="btn-cld-howto-tab-rules" class="pill pill-active-cld" data-cld-howto-tab="rules">The Rules</button>
        <button id="btn-cld-howto-tab-practice" class="pill" data-cld-howto-tab="practice">Practice</button>
        <button id="btn-cld-howto-tab-cast" class="pill" data-cld-howto-tab="cast">The Cast</button>
```

(c) Step 2's card — replace its heading and body lines with:

```html
          <p class="font-bold text-stone-800">Pull back to aim, like a pool cue</p>
          <p class="text-stone-500 text-sm">Touch anywhere on the ice and pull back — your finger is the end of the cue, and the further you pull, the harder the shove. Release to <span class="font-semibold text-stone-700">arm</span> it, then tap <span class="font-semibold text-stone-700">Lock It In</span> to commit. Re-aim as many times as you like before that, but once you lock in, that's your Slide.</p>
```

(d) Replace the whole `<!-- THE FLOE tab … -->` comment and `cld-howto-body-floe` div (lines ~350–375) with:

```html
      <!-- PRACTICE — the Arena. You, Sylvia and Sam; their shoves are fixed and drawn
           before you move. #cld-pr-stage is touch-action:none so a drag never scrolls
           the overlay (the same rule as #cld-stage). -->
      <div id="cld-howto-body-practice" style="display:none" class="overflow-y-auto flex flex-col gap-3 px-5 py-5">
        <div class="flex gap-2">
          <button class="pill pill-active-cld flex-1" data-cld-pr-drill="headon">Head-on</button>
          <button class="pill flex-1" data-cld-pr-drill="crossfire">Crossfire</button>
          <button class="pill flex-1" data-cld-pr-drill="edge">Edge</button>
        </div>
        <div id="cld-pr-coach" class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-1">
          <p id="cld-pr-coach-step" class="text-stone-400 text-xs font-semibold uppercase tracking-widest"></p>
          <p id="cld-pr-coach-line" class="text-stone-700 text-sm"></p>
        </div>
        <div id="cld-pr-stage" class="relative rounded-2xl overflow-hidden">
          <canvas id="cld-pr-canvas"></canvas>
          <div id="cld-pr-float" class="absolute inset-0 pointer-events-none flex items-start justify-center pt-2"></div>
        </div>
        <div id="cld-pr-drowned-row" style="display:none" class="flex flex-col gap-1">
          <div class="flex gap-2">
            <button id="btn-cld-pr-mode-throw" class="pill pill-active-cld flex-1" data-cld-pr-mode="throw">Throw</button>
            <button id="btn-cld-pr-mode-dive" class="pill flex-1" data-cld-pr-mode="dive">Dive</button>
          </div>
          <p id="cld-pr-dive-reason" style="display:none" class="text-amber-600 text-xs"></p>
        </div>
        <button id="btn-cld-pr-power" class="w-full flex flex-col gap-1 py-2 rounded-xl active:scale-[0.99]">
          <div class="flex items-center justify-between w-full">
            <p id="cld-pr-power-hint" class="text-stone-400 text-xs">Tap to lock power</p>
            <p class="text-stone-400 text-xs font-semibold uppercase tracking-widest">Power</p>
          </div>
          <div id="cld-pr-power-track" class="cld-power-track w-full">
            <div id="cld-pr-power-fill" class="cld-power-fill"></div>
          </div>
        </button>
        <button id="btn-cld-pr-commit" class="cld-cta min-h-14 w-full rounded-2xl text-xl font-semibold flex items-center justify-center">Lock It In</button>
        <div class="flex gap-2">
          <button id="btn-cld-pr-resurface" class="flex-1 min-h-11 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 font-semibold text-sm active:scale-95">Resurface</button>
          <button id="btn-cld-pr-again" style="display:none" class="flex-1 min-h-11 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 font-semibold text-sm active:scale-95">Practice again</button>
        </div>
        <button id="btn-cld-howto-close-practice"
          class="cld-cta min-h-14 w-full rounded-2xl text-xl font-semibold active:scale-95 transition-all duration-150">Got it</button>
      </div>

      <!-- THE CAST — the six poses, each drawn through cldRenderPenguin, the one seam.
           Procedural, so not tap-to-enlarge and not an offline-install check. -->
      <div id="cld-howto-body-cast" style="display:none" class="overflow-y-auto flex flex-col gap-4 px-5 py-5">
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3">
          <p class="text-xs font-semibold uppercase tracking-widest cld-label">The Cast</p>
          <p class="text-stone-500 text-sm">Every pose the penguin strikes on the ice, and the moment it means.</p>
          <div id="cld-howto-cast" class="grid grid-cols-3 gap-2"></div>
        </div>
        <button id="btn-cld-howto-close-cast"
          class="cld-cta min-h-14 w-full rounded-2xl text-xl font-semibold active:scale-95 transition-all duration-150">Got it</button>
      </div>
```

(The Practice pane's three small buttons deliberately carry no `transition-*` utility — the CSS in Step 4 gives them one `transition` covering both the ring and the press.)

- [ ] **Step 4: The CSS.** In `css/styles.css`, directly after `#cld-canvas { display: block; touch-action: none; }`:

```css
/* The Practice Arena's stage (SW v244). Square, never taller than 46vh, so the
   whole stage is on screen before a drag starts inside the scrolling overlay.
   touch-action:none is load-bearing for the same reason as #cld-stage: without
   it a drag scrolls the overlay instead of aiming. */
#cld-pr-stage {
  width: min(100%, 46vh);
  aspect-ratio: 1 / 1;
  margin: 0 auto;
  background: #0e2536;
  touch-action: none;
  user-select: none; -webkit-user-select: none;
}
#cld-pr-canvas { display: block; touch-action: none; }
/* The coach's soft ring — a box-shadow TRANSITION, never an animation, so the
   global reduced-motion block already zeroes it. One rule carries the press
   too: an id rule would otherwise override a Tailwind transition utility. */
#cld-pr-stage, #btn-cld-pr-power, #btn-cld-pr-commit, #btn-cld-pr-resurface,
#btn-cld-pr-mode-throw, #btn-cld-pr-mode-dive {
  transition: box-shadow 160ms ease-out, transform 100ms ease-out;
}
.cld-pr-ring { box-shadow: 0 0 0 3px rgba(142, 202, 230, 0.95); }
```

- [ ] **Step 5: The tab switch.** Replace `cldSetHowtoTab` (and its comment, ~2252–2268):

```js
// The Rules, Practice and The Cast are three tabs of ONE overlay; bodies are
// siblings toggled by display. Each tab's loop runs only while it is showing —
// started here, stopped on any switch away, on close, and in cldResetState()
// (§ Timer Lifecycle: a RAF is a timer).
function cldSetHowtoTab(tab) {
  const bodies = { rules: 'cld-howto-body-rules', practice: 'cld-howto-body-practice', cast: 'cld-howto-body-cast' };
  if (!bodies[tab]) tab = 'rules';
  Object.keys(bodies).forEach(k => {
    const el = document.getElementById(bodies[k]);
    if (el) el.style.display = k === tab ? 'flex' : 'none';
  });
  document.querySelectorAll('[data-cld-howto-tab]').forEach(b => {
    b.classList.remove('pill-active-cld');   // .pill is the base — never removed
    if (b.dataset.cldHowtoTab === tab) b.classList.add('pill-active-cld');
  });
  const body = document.getElementById(bodies[tab]);
  if (body) body.scrollTop = 0;
  if (tab === 'cast') cldHowtoStart(); else cldHowtoStop();
  if (tab === 'practice') cldPracticeStart(); else cldPracticeStop();
}
```

- [ ] **Step 6: Retire The Floe sandbox.** In the `cldHowto*` block (~2270–2490):
  - Replace the block's header comment with:
    ```js
    // ═══════════════════════════════════════════════════════════════════════════
    // "The Cast" — the How-to pose reference: the six cldPose states, each drawn
    // through cldRenderPenguin, so the poses shown here cannot drift from the
    // ones played. (The Floe's practice sandbox was absorbed by the Practice
    // Arena at SW v244 — spec 2026-09-28-cld-cue-arena.)
    // ═══════════════════════════════════════════════════════════════════════════
    ```
  - Delete `CLD_HOWTO_N`, `CLD_HOWTO_RADIUS`, `CLD_HOWTO_HOLD_MS`; the lets `cldHowtoCtx`, `cldHowtoPeng`, `cldHowtoTL`, `cldHowtoPlayT`; the functions `cldHowtoSeed`, `cldHowtoShove`, `cldHowtoSettle`, `cldHowtoDrawFloe`. Keep `CLD_HOWTO_CAST`, `CLD_HOWTO_TILE_R`, `cldHowtoRaf`, `cldHowtoLastT`, `cldHowtoClock`, `cldHowtoCast`, `cldHowtoBuildCast`, `cldHowtoFit`, `cldHowtoDrawCast`, `cldHowtoStop`.
  - Replace `cldHowtoLoop` and `cldHowtoStart` with:
    ```js
    function cldHowtoLoop(now) {
      cldHowtoRaf = null;
      if (!cldHowtoLastT) cldHowtoLastT = now;
      const dt = Math.min((now - cldHowtoLastT) / 1000, 0.05);
      cldHowtoLastT = now;
      cldHowtoClock += dt;
      cldHowtoDrawCast();
      if (!cldHowtoRaf) cldHowtoRaf = requestAnimationFrame(cldHowtoLoop);
    }

    function cldHowtoStart() {
      cldHowtoBuildCast();
      cldHowtoLastT = 0;
      if (!cldHowtoRaf) cldHowtoRaf = requestAnimationFrame(cldHowtoLoop);
    }
    ```
  - Add the Practice stubs right after `cldHowtoStop` (Task 11 replaces them):
    ```js
    function cldPracticeStart() {}
    function cldPracticeStop() {}
    ```
- [ ] **Step 7: Teardown + exempt list + wiring.**
  - `cldResetState`: replace the two lines `cldHowtoStop(); …` / `cldHowtoPeng = []; cldHowtoTL = null; cldHowtoPlayT = 0;` with
    ```js
    cldHowtoStop();                       // The Cast's loop — a RAF is a timer
    cldPracticeStop();                    // the Practice Arena's loop and bark timer
    ```
  - `CLD_SWAP_EXEMPT`: delete the line `'cldHowtoCtx', 'cldHowtoPeng', 'cldHowtoTL', 'cldHowtoPlayT',` and its comment.
  - How-to wiring (~3044–3057): `cldCloseHowTo` gains `cldPracticeStop();` after `cldHowtoStop();`; replace `on('btn-cld-howto-close-floe', cldCloseHowTo);` with
    ```js
    on('btn-cld-howto-close-practice', cldCloseHowTo);
    on('btn-cld-howto-close-cast', cldCloseHowTo);
    ```
    and delete the `btn-cld-howto-shove` and `btn-cld-howto-resurface` lines.
  - Grep the repo (excluding `docs/`) for `howto-body-floe|howto-close-floe|howto-shove|howto-resurface|howto-floe-canvas|cldHowtoShove|cldHowtoSeed` — expected: **no matches** (index.html is regenerated in Step 8).

- [ ] **Step 8: Rebuild and run everything**

Run: `node tools/build-index.js; node tools/verify-build-fresh.js; node tools/verify-cld-practice.js; node tools/verify-cld-loopback.js`
Expected: build fresh; practice `ALL CHECKS PASSED (118)`; loopback green.

- [ ] **Step 9: Commit**

```bash
git add src/screens/cld.html index.html css/styles.css js/games/cld.js tools/verify-cld-practice.js
git commit -m "feat(cld): How to Play becomes Rules | Practice | The Cast; The Floe sandbox retired"
```

---

### Task 11: The Arena on screen — gesture, controls, loop, teardown

**Files:**
- Modify: `js/games/cld.js` — replace the Task 10 stubs `cldPracticeStart/Stop` with the block below (after `cldPrFloat`, Task 8); `cldResetState`; the DOMContentLoaded wiring (after the How-to wiring) and the resize listener (~3150).
- Test: `tools/verify-cld-practice.js` (section K)

**Interfaces:**
- Consumes: everything from Tasks 1–10.
- Produces: `let cldPrView, cldPrRaf, cldPrLastT, cldPrClock`; `cldPrCanCommit() → bool`; `cldPrDragAim() → aim|null`; `cldArenaModel() → m`; `cldPrPointerDown/Move/Up(e)`; `cldPrAction(kind, arg)` with `kind ∈ 'again'|'drill'|'resurface'|'power'|'mode'|'cta'`; `cldPrSyncUI()`; `cldPrLoop(now)`; `cldPracticeStart()`; `cldPracticeStop()`.

- [ ] **Step 1: Write the failing tests** — insert above `// ── Report`:

```js
// ═══════════════════════════════════════════════════════════════════════════
// K. The Arena on screen (spec § 6.2, § 6.6; D4, D5)
// ═══════════════════════════════════════════════════════════════════════════
if (!TUNE) {
  section('K. The Arena on screen');
  const $ = id => S.document.getElementById(id);
  const sentAtStart = sent.envelope + sent.private;
  let rafSeq = 100;
  S.requestAnimationFrame = () => ++rafSeq;
  S.cancelAnimationFrame = () => {};
  const stage = $('cld-pr-stage'), canvas = $('cld-pr-canvas');
  canvas.parentElement = stage; stage.clientWidth = 0; stage.clientHeight = 0;
  RUN('cldResetState()');

  // Review Focus 4 — a hidden stage has no box; Practice sizes it on SHOW.
  RUN("cldSetHowtoTab('practice')");
  ok('a zero-size stage is left unsized', G('cldPrView') && G('cldPrView').scale === 1);
  RUN("cldSetHowtoTab('rules')");
  check('tab-away stops the Arena loop', G('cldPrRaf'), null);
  stage.clientWidth = 300; stage.clientHeight = 300;
  RUN("cldSetHowtoTab('practice')");
  ok('the canvas is sized when Practice is shown', near(G('cldPrView').scale, 300 / G('CLD_VIEW_FIT'), 1e-9));
  ok('the Arena loop runs while Practice shows', !!G('cldPrRaf'));
  check('it opens on Head-on, 1 / 5', [G('cldPrUi').drill, $('cld-pr-coach-step').textContent], ['headon', '1 / 5']);
  ok('the soft ring is on the stage', stage.classList.contains('cld-pr-ring'));
  check('Lock It In waits for an aim', $('btn-cld-pr-commit').disabled, true);

  // A real gesture on the Arena's own stage: finger right of You → the shot goes left.
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
  check('the coach moves to 2 and rings Power', [$('cld-pr-coach-step').textContent,
        $('btn-cld-pr-power').classList.contains('cld-pr-ring')], ['2 / 5', true]);
  RUN("cldPrAction('power')");
  ok('Power locks and the coach moves to 3', near(G('cldPrUi').lock, 1, 1e-6) && G('cldPrUi').coach.at === 3);
  check('Lock It In is live', [$('btn-cld-pr-commit').textContent, $('btn-cld-pr-commit').disabled], ['Lock It In', false]);
  RUN("cldPrAction('cta')");
  check('committing starts the Slide', [G('cldPrUi').playing, $('btn-cld-pr-commit').textContent], [true, 'Sliding…']);
  let g = 0;
  while (G('cldPrUi').playing && g++ < 4000) RUN('cldPrLoop')(1000 + g * 50);
  ok('the loop plays the Slide out', !G('cldPrUi').playing);
  const out = G('cldPrUi').outcome;
  check('the CTA reads the outcome', $('btn-cld-pr-commit').textContent, out === 'in' ? 'Lock It In' : 'Go again');

  RUN("cldPrAction('resurface')");
  ok('Resurface resets the drill and keeps your aim',
     G('cldPrUi').outcome === null && !!G('cldPrUi').aim && near(G('cldPrUi').aim.power, 1, 1e-6));
  RUN("cldPrAction('drill', 'edge')");
  check('a drill pill switches and clears your aim', [G('cldPrUi').drill, G('cldPrUi').aim], ['edge', null]);
  ok('Practice again shows exactly when the end is reached',
     ($('btn-cld-pr-again').style.display === 'flex') === !!G('cldPrUi').coach.reachedEnd);
  RUN("cldPrAction('again')");
  check('Practice again → Head-on, 1 / 5', [G('cldPrUi').drill, $('cld-pr-coach-step').textContent], ['headon', '1 / 5']);

  // In the Drink: the Throw · Dive row, a Snowball tap, and the amber reason.
  load('headon'); resolveWith(HOLD); RUN('cldPrSyncUI()');
  check('in the Drink: the Throw · Dive row shows', $('cld-pr-drowned-row').style.display, 'flex');
  const sy = arena("cldPenguins.find(p => p.id === '1-0')");
  RUN('cldPrPointerDown')(ev(sy.x, sy.y)); RUN('cldPrPointerUp')(ev(sy.x, sy.y));
  ok('a tap aims a Snowball', !!G('cldPrUi').snowball);
  RUN("cldPrAction('mode', 'dive')");
  check('Plugged: Dive is refused, with the amber reason', [G('cldPrUi').mode, $('cld-pr-dive-reason').textContent],
        ['throw', 'You can Dive once you’re knocked back.']);

  RUN('cldResetState()');
  check('cldResetState clears the Arena', [G('cldPrUi'), G('cldPrRaf'), G('cldPrFloe')], [null, null, null]);
  check('the Arena sent nothing, start to finish', sent.envelope + sent.private - sentAtStart, 0);
}
```

- [ ] **Step 2: Run** — expect `cldPrPointerDown is not defined` (or a FAIL on the first sizing check).

- [ ] **Step 3: Replace the two stubs with the Arena's UI layer:**

```js
// ── The Arena on screen ─────────────────────────────────────────────────────
let cldPrView  = null;   // the Arena's canvas view (cldMakeView) — never the floe's
let cldPrRaf   = null;   // TIMER — cancelled by cldPracticeStop (tab-away, close, teardown)
let cldPrLastT = 0;
let cldPrClock = 0;      // idle sway for the Arena's penguins

// Me, read through the swap. Only one penguin is ever mine in the Arena.
function cldPrMe() { return cldArenaRun(() => cldPenguins.find(p => p.id === '0-0')); }

function cldPrCanCommit() {
  const u = cldPrUi;
  if (!u || u.playing) return false;
  if (cldPrMe().drowned) return true;            // a Drowned player can always commit
  return !!(u.aim && u.aim.power >= CLD_MIN_POWER);
}

function cldPrDragAim() {
  const u = cldPrUi;
  if (!u || !u.drag || !cldPrView) return null;
  const a = cldCueAim({ down: u.drag.down, now: u.drag.now, penguin: cldPrMe(),
                        scale: cldPrView.scale, lock: u.lock, lastDir: u.drag.dir });
  return a ? { penguinId: '0-0', dx: a.dx, dy: a.dy, power: a.power, dir: a.dir } : null;
}

// The Arena's model — the same cldBuildModel the live floe uses, over the
// Arena's record (swapped in), with the rivals' fixed shoves drawn as cues.
function cldArenaModel() {
  const u = cldPrUi;
  const live = u.drag ? cldPrDragAim() : null;
  return cldArenaRun(() => {
    const standing = id => { const p = cldPenguins.find(q => q.id === id); return !!p && !p.drowned; };
    const aims = [];
    if (!u.playing) {
      u.rivalAims.forEach(a => { if (a && standing(a.penguinId)) aims.push(Object.assign({}, a, { live: false, rival: true })); });
      const mine = live || u.aim;
      if (mine && standing('0-0')) aims.push({ penguinId: '0-0', dx: mine.dx, dy: mine.dy, power: mine.power,
                                               live: !!live, rival: false });
    }
    const me = cldPenguins.find(q => q.id === '0-0');
    const back = (u.mode === 'dive' && !u.playing && me.drowned && !me.plug) ? me : null;
    return cldBuildModel(cldCurrentSrc(), {
      meIdx: 0, phase: u.playing ? 'resolving' : 'aiming', playbackT: cldPlaybackT,
      aims: aims, live: live, snowball: u.mode === 'throw' ? u.snowball : null,
      dive: back ? cldDiveModel(back, u.dive) : null,
      assist: cldAimAssist, clock: cldPrClock, selectedId: null,
    });
  });
}

// The same gesture as the floe (cldCueAim + cldReleaseAim); a Drowned You taps
// for a Snowball, or — Knocked back, in Dive mode — for a gap.
function cldPrPointerDown(e) {
  const u = cldPrUi;
  if (!u || u.playing || u.drag || !cldPrView) return;
  const pt = cldToLogical(cldPrView, e);
  const me = cldPrMe();
  if (me.drowned) {
    if (u.mode === 'dive') {
      if (me.plug) return;                        // only a Knocked-back penguin Dives
      const spot = cldArenaRun(() => cldSeatSpot(cldAngleOf(pt.x, pt.y), '0-0'));
      if (spot) { u.dive = { penguinId: '0-0', angle: spot.angle }; cldSfx('dive'); }
    } else if (cldArenaRun(() => cldDistFromCentre(pt.x, pt.y) <= cldFloeRadius)) {
      u.snowball = { x: pt.x, y: pt.y };
      cldSfx('snowball');
    }
    cldPrSyncUI();
    return;
  }
  const al = u.aim ? (Math.hypot(u.aim.dx, u.aim.dy) || 1) : 1;
  u.drag = { ptrId: e.pointerId === undefined ? 'mouse' : e.pointerId, down: pt, now: pt,
             dir: u.aim ? { x: u.aim.dx / al, y: u.aim.dy / al } : null };
  cldPrSyncUI();
}

function cldPrPointerMove(e) {
  const u = cldPrUi;
  if (!u || !u.drag) return;
  if ((e.pointerId === undefined ? 'mouse' : e.pointerId) !== u.drag.ptrId) return;
  u.drag.now = cldToLogical(cldPrView, e);
  const a = cldPrDragAim();
  if (a) u.drag.dir = a.dir;
  cldPrSyncUI();
}

function cldPrPointerUp(e) {
  const u = cldPrUi;
  if (!u || !u.drag) return;
  if ((e.pointerId === undefined ? 'mouse' : e.pointerId) !== u.drag.ptrId) return;
  const armed = cldReleaseAim(cldPrDragAim(), u.drag.down, u.drag.now, cldPrView.scale);
  u.drag = null;
  if (armed) { u.aim = armed; cldPrCoachDispatch({ type: 'armed' }); }
  cldPrSyncUI();
}

// Every Practice control, in one place — so the wiring is one line per button
// and the harness can drive the pane without synthesising DOM events.
function cldPrAction(kind, arg) {
  const u = cldPrUi;
  if (!u) return;
  if (kind === 'again') {
    cldPrLoadDrill('headon', false);
    cldPrUi.coach = cldPrCoachStart();
  } else if (u.playing) {
    return;                                       // nothing else acts during a Slide
  } else if (kind === 'drill') {
    cldPrLoadDrill(arg, false);
    cldPrCoachDispatch({ type: 'reset' });
  } else if (kind === 'resurface' || (kind === 'cta' && u.outcome && u.outcome !== 'in')) {
    cldPrLoadDrill(u.drill, true);                // Go again == Resurface: aim and lock kept
    cldPrCoachDispatch({ type: 'reset' });
  } else if (kind === 'power') {
    if (u.lock !== null) u.lock = null;           // tapping a locked bar releases it
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

function cldPrSyncUI() {
  const u = cldPrUi;
  if (!u) return;
  const $ = id => document.getElementById(id);

  document.querySelectorAll('[data-cld-pr-drill]').forEach(b => {
    b.classList.remove('pill-active-cld');
    if (b.dataset.cldPrDrill === u.drill) b.classList.add('pill-active-cld');
  });

  // ── The coach. A new line scrolls the card (and the stage under it) into view.
  const v = cldPrCoachView(u.coach);
  const stepEl = $('cld-pr-coach-step');
  if (stepEl) stepEl.textContent = v.step;
  const lineEl = $('cld-pr-coach-line');
  if (lineEl && lineEl.textContent !== v.line) {
    lineEl.textContent = v.line;
    const card = $('cld-pr-coach');
    if (card && card.scrollIntoView) card.scrollIntoView({ block: 'nearest', behavior: cldReducedMotion() ? 'auto' : 'smooth' });
  }
  const ringIds = { stage: 'cld-pr-stage', power: 'btn-cld-pr-power', commit: 'btn-cld-pr-commit',
                    resurface: 'btn-cld-pr-resurface', dive: 'btn-cld-pr-mode-dive' };
  Object.keys(ringIds).forEach(k => { const el = $(ringIds[k]); if (el) el.classList.toggle('cld-pr-ring', v.ring === k); });

  // ── Throw · Dive — the live floe's rules: Dive only while Knocked back and
  // while the ring has a free seat (amber reason = can't, never grey).
  const me = cldPrMe();
  const row = $('cld-pr-drowned-row');
  if (row) row.style.display = (me.drowned && !u.playing) ? 'flex' : 'none';
  if (me.drowned) {
    const room = !me.plug ? cldArenaRun(() => cldSeatSpot(me.angle, '0-0')) : null;
    const why = me.plug ? 'You can Dive once you’re knocked back.'
              : !room   ? 'Every gap is taken — nowhere to Dive.' : '';
    if (why && u.mode === 'dive') { u.mode = 'throw'; u.dive = null; }
    const tb = $('btn-cld-pr-mode-throw'), db = $('btn-cld-pr-mode-dive');
    if (tb) tb.classList.toggle('pill-active-cld', u.mode === 'throw');
    if (db) {
      db.classList.toggle('pill-active-cld', u.mode === 'dive');
      db.classList.toggle('opacity-50', !!why);
      db.classList.toggle('pointer-events-none', !!why);
    }
    const reason = $('cld-pr-dive-reason');
    if (reason) { reason.textContent = why; reason.style.display = why ? 'block' : 'none'; }
  }

  // ── Power bar — live during a drag, frozen when locked.
  const dragAim = u.drag ? cldPrDragAim() : null;
  const shown = u.lock !== null ? u.lock : (dragAim ? dragAim.power : (u.aim ? u.aim.power : 0));
  const fill = $('cld-pr-power-fill');
  if (fill) fill.style.width = Math.round(shown * 100) + '%';
  const track = $('cld-pr-power-track');
  if (track) track.classList.toggle('cld-power-locked', u.lock !== null);
  const hint = $('cld-pr-power-hint');
  if (hint) {
    const soft = dragAim && dragAim.power < CLD_MIN_POWER && u.lock === null;
    hint.textContent = (u.playing || me.drowned) ? '' : u.lock !== null ? 'Power locked — tap to release'
                     : soft ? 'Too soft' : 'Tap to lock power';
    hint.className = soft ? 'text-amber-600 text-xs' : 'text-stone-400 text-xs';
  }

  // ── The CTA — Lock It In / Sliding… / Go again; hidden at the end of the Berth.
  const cta = $('btn-cld-pr-commit');
  if (cta) {
    const base = 'min-h-14 w-full rounded-2xl text-xl font-semibold flex items-center justify-center';
    if (u.playing) {
      cta.style.display = 'flex'; cta.textContent = 'Sliding…'; cta.disabled = true;
      cta.className = base + ' bg-stone-200 text-stone-500';
    } else if (u.coach.at === 'B3') {
      cta.style.display = 'none';
    } else if (u.outcome && u.outcome !== 'in') {
      cta.style.display = 'flex'; cta.textContent = 'Go again'; cta.disabled = false;
      cta.className = base + ' cld-cta';
    } else {
      const can = cldPrCanCommit();
      cta.style.display = 'flex'; cta.textContent = 'Lock It In'; cta.disabled = !can;
      cta.className = base + ' cld-cta' + (can ? '' : ' opacity-50 pointer-events-none');
    }
  }
  const again = $('btn-cld-pr-again');
  if (again) again.style.display = u.coach.reachedEnd ? 'flex' : 'none';
  const res = $('btn-cld-pr-resurface');
  if (res) res.disabled = !!u.playing;
}

function cldPrLoop(now) {
  cldPrRaf = null;
  if (!cldPrLastT) cldPrLastT = now;
  const dt = Math.min((now - cldPrLastT) / 1000, 0.05);   // a backgrounded tab cannot teleport a Slide
  cldPrLastT = now;
  cldPrClock += dt;
  const wasPlaying = !!(cldPrUi && cldPrUi.playing);
  cldPrTick(dt * 1000);
  if (wasPlaying && !cldPrUi.playing) cldPrSyncUI();
  if (cldPrView && cldPrUi) cldDraw(cldPrView, cldArenaModel());
  if (!cldPrRaf) cldPrRaf = requestAnimationFrame(cldPrLoop);
}

function cldPracticeStart() {
  const cv = document.getElementById('cld-pr-canvas');
  if (!cldPrView && cv && cv.getContext) cldPrView = cldMakeView(cv);
  cldResize(cldPrView);                           // sized on SHOW — a hidden canvas has no box
  if (!cldPrUi) cldPrLoadDrill('headon', false);
  cldPrSyncUI();
  cldPrLastT = 0;
  if (!cldPrRaf) cldPrRaf = requestAnimationFrame(cldPrLoop);
}

function cldPracticeStop() {
  if (cldPrRaf) { cancelAnimationFrame(cldPrRaf); cldPrRaf = null; }
  cldPrLastT = 0;
  if (cldPrFloatTimer) { clearTimeout(cldPrFloatTimer); cldPrFloatTimer = null; }
  if (cldPrUi) cldPrUi.drag = null;               // a finger lifted off-screen never strands a drag
}
```

- [ ] **Step 4: Teardown.** In `cldResetState`, after `cldPracticeStop();` (Task 10) add:

```js
  cldPrUi = null; cldPrFloe = null; cldPrClock = 0;   // the Arena starts fresh next time
  const prLayer = document.getElementById('cld-pr-float');
  if (prLayer) prLayer.innerHTML = '';
```

- [ ] **Step 5: Wiring.** In the DOMContentLoaded block, after the How-to wiring:

```js
  // ── Practice (the Arena) ─────────────────────────────────────────────────
  const prStage = document.getElementById('cld-pr-stage');
  if (prStage) {
    prStage.addEventListener('pointerdown', cldPrPointerDown);
    prStage.addEventListener('pointermove', cldPrPointerMove);
    prStage.addEventListener('pointerup', cldPrPointerUp);
    prStage.addEventListener('pointercancel', cldPrPointerUp);
    prStage.addEventListener('pointerleave', cldPrPointerUp);
  }
  document.querySelectorAll('[data-cld-pr-drill]').forEach(b => {
    b.addEventListener('click', () => { playPillClick(); cldPrAction('drill', b.dataset.cldPrDrill); });
  });
  document.querySelectorAll('[data-cld-pr-mode]').forEach(b => {
    b.addEventListener('click', () => { playPillClick(); cldPrAction('mode', b.dataset.cldPrMode); });
  });
  on('btn-cld-pr-power',     () => { playPillClick(); cldPrAction('power'); });
  on('btn-cld-pr-commit',    () => { cldPrAction('cta'); });
  on('btn-cld-pr-resurface', () => { playPillClick(); cldPrAction('resurface'); });
  on('btn-cld-pr-again',     () => { playPillClick(); cldPrAction('again'); });
```

And in the resize listener, after the floe line:

```js
    const pb = document.getElementById('cld-howto-body-practice');
    if (pb && pb.style.display !== 'none') cldResize(cldPrView);
```

- [ ] **Step 6: Rebuild and run everything**

Run: `node tools/build-index.js; node tools/verify-build-fresh.js; node tools/verify-cld-practice.js; node tools/verify-cld-physics.js; node tools/verify-cld-loop.js; node tools/verify-cld-loopback.js`
Expected: practice `ALL CHECKS PASSED (141)`; the rest green.

- [ ] **Step 7: Commit**

```bash
git add js/games/cld.js index.html tools/verify-cld-practice.js
git commit -m "feat(cld): the Practice Arena on screen - cue, coach, drills, Berth branch"
```

---

### Task 12: Mutants — prove the new checks can fail

**Files:**
- Modify: `tools/mutate-cld.js` — the mutant table (`const M = [` … `];`) and the runner loop (~lines 181–199).

**Interfaces:**
- A mutant entry gains an optional 4th element, the harness key: `[name, which, edits, harness?]`, `harness ∈ 'loop' (default) | 'practice'`.

- [ ] **Step 1: Let a mutant choose its harness.** Above `console.log('Cold Shoulder — planted-drift run');` add:

```js
// Which harness a mutant is aimed at. The rules/sim mutants above run the loop
// harness; the cue / swap mutants below are claims about verify-cld-practice.
const HARNESS = { loop: 'tools/verify-cld-loop.js', practice: 'tools/verify-cld-practice.js' };
```

In the loop, `for (const [name, which, edits] of M) {` → `for (const [name, which, edits, harness] of M) {`, and the spawn line's `path.join(ROOT, 'tools/verify-cld-loop.js')` → `path.join(ROOT, HARNESS[harness || 'loop'])`.

- [ ] **Step 2: Add four mutants** — at the end of `M`, before the closing `];`:

```js
// ── SW v244: the cue and the Arena's swap (verify-cld-practice.js) ──────────
['cue-dead-zone-removed', 'game', [[
  '  if (dist >= CLD_CUE_DEAD) dir = { x: ex / dist, y: ey / dist };',
  '  if (dist > 0) dir = { x: ex / dist, y: ey / dist };']], 'practice'],

['a-tap-arms-an-aim', 'game', [[
  '  if (Math.hypot(now.x - down.x, now.y - down.y) * scale < CLD_CUE_TAP_PX) return null;',
  '  // MUTANT: a tap arms']], 'practice'],

['swap-never-restores-live', 'game', [[
`  try { return fn(); }
  finally {
    cldPrSwapDepth--;
    cldPrFloe = cldSwapOut();
    cldSwapIn(live);
  }`,
`  const r = fn();
  cldPrSwapDepth--;
  cldPrFloe = cldSwapOut();
  return r;`]], 'practice'],

['swap-misses-a-global', 'game', [
  ['    phase: cldPhase, powerLock: cldPowerLock,', '    phase: cldPhase,'],
  ['  cldPhase = s.phase; cldPowerLock = s.powerLock;', '  cldPhase = s.phase;']], 'practice'],
```

- [ ] **Step 3: Run it**

Run: `node tools/mutate-cld.js`
Expected: `All 33 mutants caught.` — the 29 existing plus the 4 new, each `CAUGHT` (not `PATCH-MISS`: a miss means an anchor line above drifted from what Tasks 1/5/7 wrote — fix the anchor, not the code). Run it **3 times**; a mutant that survives once is a flaky check, not a pass.

- [ ] **Step 4: Commit**

```bash
git add tools/mutate-cld.js
git commit -m "test(cld): mutants for the cue dead zone, the tap guard and the Arena swap"
```

---

### Task 13: Layout pass (D9) + stage review (D3)

**Files:**
- Possibly modify: `src/screens/cld.html`, `css/styles.css` (only for a layout defect found here), then rebuild `index.html`.
- Record: findings go into the Task 14 impl-notes entry; anything not fixed goes into `docs/deferred-work.md` § Cold Shoulder with its reason.

- [ ] **Step 1: Invoke the `visual-check` skill** (Skill tool, `visual-check`) and follow it. It drives real headless Chromium over the real `index.html`.

- [ ] **Step 2: The floe, three sizes — 320×452 first, then 375×548, 375×667.** Start a single-device floe the way the skill's CLD recipe does (or `cldStartMatchLocal(['You','A','B'])` + `cldShowFloe()`), arm an aim by dispatching pointer events on `#cld-stage` (touch-down away from the penguin, pull back). Measure and pass when:
  - the cue, the dotted guide and the ghost are drawn (screenshot) and the ghost sits on the first penguin in line;
  - `#cld-power-track`, `#cld-tally` and `#btn-cld-commit` do not overlap `#cld-stage` (`getBoundingClientRect`) and `#btn-cld-commit` height ≥ 44 px;
  - `document.documentElement.scrollWidth <= innerWidth` (no horizontal scroll).
  **D3 review while here:** is the power bar's hint readable at 320? Does the tally line wrap? Fix in markup/CSS if a one-line class change does it; otherwise log it.

- [ ] **Step 3: Practice, three sizes.** Open How to Play → Practice. Pass when:
  - `#cld-pr-stage` is square (width ≈ height ± 1 px) and, after the coach card's `scrollIntoView`, fully inside the overlay's visible area;
  - `#btn-cld-pr-commit` and `#btn-cld-howto-close-practice` are reachable by scrolling the overlay body and each ≥ 44 px tall;
  - a drag on `#cld-pr-stage` arms an aim (the coach reads `2 / 5`) and **does not scroll** the overlay body (`scrollTop` unchanged across the drag);
  - no horizontal overflow.

- [ ] **Step 4: Reduced motion.** Emulate `prefers-reduced-motion: reduce`; in Practice, arm and Lock It In. Pass when the coach shows its step-5 (or B1) line on the very next frame and the penguins are at their final positions — nothing travels.

- [ ] **Step 5: Practice opened mid-game.** On the floe with an armed aim, tap `[?]`, switch to Practice, run one Arena Slide, close the overlay. Pass when the floe still shows the armed cue, `#cld-canvas` still fills `#cld-stage`, and Lock It In still commits.

- [ ] **Step 6: Fix anything found, rebuild, re-run the harnesses**

Run: `node tools/build-index.js; node tools/verify-build-fresh.js; node tools/verify-cld-practice.js; node tools/verify-cld-loopback.js`
Expected: all green.

- [ ] **Step 7: Commit** (only if something changed)

```bash
git add src/screens/cld.html css/styles.css index.html
git commit -m "fix(cld): layout fixes from the SE visual pass (cue + Practice)"
```

---

### Task 14: Documentation closure + SW v244 (D11, D12)

**Files:** `src/screens/cld.html` (one paired copy line), `index.html`, `sw.js`, `CLAUDE.md`, `docs/sw-changelog.md`, `docs/code-map.md`, `docs/game-identities/cld.md`, `.claude/rules/ui-style.md`, `docs/implementation-notes/cld-implementation-notes.md`, `docs/deferred-work.md` (+ `docs/deferred-work-log.md` if anything resolves), `docs/decision-log.md`, `docs/practice-rollout.md`.

- [ ] **Step 1: The Aim Assist copy (paired).** The setting now draws a ghost and a stub, so its description in `src/screens/cld.html` (the settings overlay's Aim Assist card) changes from `Draws a dotted line showing where your first bounce lands while you aim.` to:

```
Draws your aim to the first thing you'd hit — a ghost where you touch, and which way they'd go.
```

Rebuild: `node tools/build-index.js`.

- [ ] **Step 2: `docs/game-identities/cld.md`** (paired sections — the code shipped in Tasks 1–11):
  - **T3**, the Aim bullet → `**Aim.** Touch anywhere on the ice and pull back — your finger is the end of a pool cue, the shot goes the other way, and further back is a harder shove. Release to **arm** it. Re-aim as often as you like.`
  - **T6** table, Aim Assist row, "What it does in play" → `Draws your aim to the first contact: a ghost penguin where yours would touch, and a short line for which way a penguin you hit is pushed. One contact deep, never further.`
  - **T7a** overlay table, `cld-how-to-overlay` row → `How to Play — **3 tabs**: *The Rules*, *Practice* (the Arena: three drills against Sylvia and Sam) and *The Cast* (the six poses)`; replace the paragraph beginning "There is **no tip overlay**" so its second and third sentences describe Practice (the Arena: You, Sylvia and Sam on a fixed floe; the rivals' shoves fixed and drawn before you move; the real rules and renderer; a coach with a step counter) and The Cast, instead of The Floe.
  - **T7b**:
    - `# cld-settings-overlay — Aim Assist, Ice Breaker` block: the Aim Assist line → the Step 1 text.
    - `# cld-how-to-overlay — step headings`: `Drag back to aim, like a slingshot` → `Pull back to aim, like a pool cue`.
    - Delete the `# cld-how-to-overlay — The Floe tab (SW v221)` block and add these three:

```copy
# cld-how-to-overlay — tabs (SW v244)
The Rules
Practice
The Cast
Every pose the penguin strikes on the ice, and the moment it means.
```

```copy
# cld-how-to-overlay — Practice (the Arena, SW v244)
Head-on
Crossfire
Edge
Tap to lock power
Power locked — tap to release
Too soft
Lock It In
Sliding…
Go again
Resurface
Practice again
Got it
```

```copy
# CLD_PR_COACH — the Practice coach (js/games/cld.js)
Their shoves are drawn in their colours, and they’ll do the same thing every time. Touch anywhere and pull back — your finger is the end of the cue.
The ghost shows where you’ll hit first. Tap Power to lock it — then dragging only swings your aim.
Happy? Lock It In. Once it’s in, it’s in.
Everyone slides at once.
Still dry. Try another counter — or another drill.
Last one dry — that’d be a Fish.
Washout — everyone’s in. Resurface.
Your go. Try a counter — or another drill.
You’re in the Drink — and you’ve plugged the gap you went through. The next penguin to hit you bounces off. Tap a penguin to aim a Snowball, then Lock It In.
Knocked back — so now it’s Throw or Dive. Tap Dive, then a dashed gap.
Still plugged. Resurface to try the drill again.
That’s the Drink. Resurface to get back on the ice.
```

  - **T9**, the "How to Play's "The Floe" tab (SW v221)" paragraph → `**How to Play's The Cast** is the pose reference — all six `pose(state, t)` states drawn through `cldRenderPenguin`. **Practice** (SW v244) draws the Arena through the floe's own renderer (`cldDraw` fed `cldArenaModel()`), so nothing in it is a hand-built copy. Both are procedural, so neither is tap-to-enlarge nor an offline-install check. Tap-hold on a penguin in play is still deliberately idle — a penguin is not a card (the documented Tap-Hold Reference exception).`
  - Header status line → append ` · pool-style cue + Practice Arena SW v244 (29 September 2026)`.
  - Run: `node tools/verify-identity-docs.js` → green (a failing line names the copy that drifted; the code is the source of truth — fix the doc).

- [ ] **Step 3: `docs/code-map.md`** — Grep `Cold Shoulder` for the CLD section, then Grep inside it for `cldHowto` and `cld-howto-body-floe`. Remove the Floe-tab rows (`cld-howto-body-floe`, `cld-howto-floe-canvas`, `btn-cld-howto-shove`, `btn-cld-howto-resurface`, `btn-cld-howto-close-floe`, `cldHowtoSeed/Shove/Settle/DrawFloe`, `CLD_HOWTO_N/RADIUS/HOLD_MS`) and add:
  - **IDs:** `cld-howto-body-practice`, `cld-howto-body-cast`, `btn-cld-howto-close-practice`, `btn-cld-howto-close-cast`, `btn-cld-howto-tab-practice`, `btn-cld-howto-tab-cast`, and every `cld-pr-*` / `btn-cld-pr-*` id from Task 10's Interfaces.
  - **Functions (the cue):** `cldCueAim`, `cldAimGuide`, `cldReleaseAim`, `cldPickPenguin`, `cldDefaultPenguin`.
  - **Functions (render):** `cldMakeView`, `cldResize(view)`, `cldToLogical(view, e)`, `cldCurrentSrc`, `cldBuildModel`, `cldDiveModel`, `cldFloeModel`, `cldDraw(view, m)`, `cldDrawCue`, `cldDrawBerg(ctx, b, iceBreaker)`.
  - **Functions (replay):** `cldArmPlayback`, `cldStepPlayback`, `CLD_LIVE_HOOKS`, `cldBarkLine`.
  - **Functions (Arena):** `cldSwapOut`, `cldSwapIn`, `cldArenaRun`, `CLD_SWAP_EXEMPT`, `cldPrFreshFloe`, `CLD_PR_CAST`, `CLD_PR_DRILLS`, `CLD_PR_COACH`, `cldPrCoach*`, `cldPrLoadDrill`, `cldPrRivalCommit`, `cldPrResolve`, `cldPrTick`, `cldPrSlideDone`, `cldPrFloat`, `cldPrMe`, `cldPrCanCommit`, `cldPrDragAim`, `cldArenaModel`, `cldPrPointerDown/Move/Up`, `cldPrAction`, `cldPrSyncUI`, `cldPrLoop`, `cldPracticeStart/Stop`, `cldReducedMotion`.
  - **State:** `cldView` (replaces `cldCanvas`/`cldCtx`/`cldView*`), `cldDragDir`, `cldPrFloe`, `cldPrUi`, `cldPrView`, `cldPrRaf`, `cldPrLastT`, `cldPrClock`, `cldPrFloatTimer`, `cldPrSwapDepth`. Note `cldDragFrom` now holds the touch-down point.
  - **Constants:** `CLD_CUE_PULL_PX`, `CLD_CUE_DEAD`, `CLD_CUE_LEN`, `CLD_CUE_GAP_MAX`, `CLD_GUIDE_STUB`, `CLD_GRAB_R`, `CLD_CUE_TAP_PX`.

- [ ] **Step 4: SW + `CLAUDE.md` + changelog.**
  - `sw.js`: `CACHE_NAME = 'sylly-games-v243'` → `'sylly-games-v244'`. (No `PRECACHE_URLS` change — no new file ships; `MP_PROTOCOL_VERSION` stays `'v243'`.)
  - Move the `**SW v243 — …**` paragraph from `CLAUDE.md` § Current Focus **verbatim** to the top of `docs/sw-changelog.md`, then put in its place:

```markdown
**SW v244 — Cold Shoulder: the pool-style cue + the Practice Arena (29 Sep 2026).**
Touch anywhere and pull back — the finger is the butt of the cue; a ghost + stub guide shows the first
contact. How to Play is now Rules | Practice | The Cast: three drills against Sylvia and Sam on the real
rules and renderer (`cldArenaRun` swaps the Arena's record into the globals for one synchronous call).
**No packet changed — `MP_PROTOCOL_VERSION` stays `'v243'`.** Detail: `cld-implementation-notes.md` DD-18.
```

  - `CLAUDE.md` harness table: after the `CLD | node tools/verify-cld-loopback.js …` row add
    `| CLD | `node tools/verify-cld-practice.js` — the cue + guide maths, the render model, the live gesture, the replay split, the Arena's swap (every top-level `let` classified; 20 Arena Slides mid-live-replay leave it byte-identical), the three drills' claims (`--tune` re-derives their ring seeds), the coach, the pane. Accepts `CLD_SRC=` | 141 |`
    and in the `mutate-cld.js` row change `29/29` → `33/33`.
  - `CLAUDE.md` Current Focus, "Phase gates" sentence: leave phase 40 OPEN (the live session and offline check are still owed), but change "a live multi-device session" pointer text only if it names The Floe.

- [ ] **Step 5: `.claude/rules/ui-style.md`.**
  - § Practice tab, the **Arena** bullet: append ` Reference: CLD (SW v244) — three drills, the rivals' shoves drawn before you move. A game whose rules read module globals may run them through a **swap** (`cldArenaRun`) rather than threading state, provided a harness classifies every top-level `let` and proves the live state untouched.`
  - § How-to Overlay Standard → Optional tab bar, the **Rollout** paragraph: replace the sentences about CLD's "The Floe" tab (from "CLD's is the odd one out" through "and in teardown.") with: `CLD's (SW v244) is **The Rules | Practice | The Cast**: The Cast renders the six penguin poses through `cldRenderPenguin` — procedural, so not `artMakeZoomable` and not an install check — and Practice is the suite's first **Arena**.`
  - Same section's Rules list: delete the bullet paragraph beginning **"One sanctioned exception:** CLD's "The Floe" tab embeds a live practice sim" — the Practice tab standard now covers live content.

- [ ] **Step 6: `docs/implementation-notes/cld-implementation-notes.md`** — add **DD-18** after DD-17 (What → Why → Lesson shape used by DD-16/17):
  - **Why:** the 28 Sep live session called the drag clunky (grab radius ~20 px, a 113 px pull that varied by phone, feedback under the thumb). Spec `docs/superpowers/specs/2026-09-28-cld-cue-arena-design.md`.
  - **What changed (owner calls in bold):** **cue from anywhere**, finger is the butt, power = pull since touch-down in CSS px (`CLD_CUE_PULL_PX` 96), dead zone `2 × CLD_PENGUIN_R`; **ghost + fixed-length stub**; `CLD_CUE_TAP_PX` (4) added at planning so a tap can never re-aim with the bar locked; renderer model-fed (`cldDraw(view, m)`), `cldHowtoDrawFloe`'s DD-12 copy retired; replay split (`cldStepPlayback` returns `'done'`); **the swap** (`cldArenaRun`) — bends DD-12's wording, keeps its intent; **three drills** — paste the final `CLD_PR_DRILLS` table (seeds from `--tune`, any `place`/`shove` you moved); **Berth only if you go in**; **Rules | Practice | The Cast**.
  - **Found while building it:** whatever Task 13 found, fixed or logged.
  - **Lesson:** a swap is safe exactly as long as the call is synchronous and the list is complete — so the list is checked against the source, not remembered.

- [ ] **Step 7: `docs/deferred-work.md`.** Grep it for `Floe tab`, `The Floe`, `drag`, `RAF animations`, `cld`. In § Cold Shoulder item 1: "check **How to Play → The Floe** on a real device…" → "check **How to Play → Practice** on a real device: all three drills, the Berth branch, and the cue's feel (96 px, the dead zone) (SW v244)"; the feel-notes sentence → "the pool-style drag + the Practice Arena shipped at SW v244 (DD-18); the procedural art pass is the next spec." In § RAF animations, if an entry names CLD's practice sim: the Arena checks reduced motion in JS (SW v244) — mark that part `RESOLVED 29 Sep 2026` and move it to `docs/deferred-work-log.md` under the same heading; the live floe's replay is untouched, so leave any floe-replay part open. Add any Task 13 finding not fixed.

- [ ] **Step 8: `docs/decision-log.md`** — newest on top:

```markdown
## 2026-09-29 — Cold Shoulder: pool-style cue + a Practice Arena on the real rules (SW v244)
Decision: the drag becomes a cue from anywhere (finger = butt, pull-back power in CSS px, ghost + stub guide), and Practice runs the real rules layer through a synchronous swap (`cldArenaRun`) instead of threading a state object through the v243 core.
Rationale: the live session called the drag clunky; a swap reuses every rule untouched, and a source-reading harness makes the one risk (a missed global) a red check.
Changed: `js/games/cld.js`, `src/screens/cld.html`, `css/styles.css`, `tools/verify-cld-practice.js` (new), `tools/mutate-cld.js`. No packet change. Detail: `cld-implementation-notes` DD-18.
```

- [ ] **Step 9: `docs/practice-rollout.md`** — tracker row 1 (CLD): Status `✅`, D1–D12 `11/12 — D10 open`, Next action `Owner: hardware pass (all three drills, both branches) + the phase-40 live session`. In card § 6.1 add an evidence table in the § 6.0 shape (D1 spec path · D2 `cldFloeModel`/`cldArenaModel` → `cldDraw(view, m)` · D3 Task 13 notes · D4 Rules | Practice | The Cast · D5 `cldPrRaf`/`cldPracticeStop`, `cldArenaRun` · D6 `cldReducedMotion()` · D7 `verify-cld-practice.js` 141 · D8 loop/loopback/physics/mutate 33/33/mp-configs/identity-docs/build-fresh · D9 the Task 13 pass · **D10 ☐ owner** · D11 this task · D12 SW v244). Update the header count line to `2 done, 18 to go`.

- [ ] **Step 10: The full regression run**

Run: `node tools/build-index.js; node tools/verify-build-fresh.js; node tools/verify-cld-physics.js; node tools/verify-cld-loop.js; node tools/verify-cld-loopback.js; node tools/verify-cld-practice.js; node tools/mutate-cld.js; node tools/verify-mp-configs.js; node tools/verify-identity-docs.js; node tools/verify-identity-docs.js --self-test`
Expected: every one ends `ALL CHECKS PASSED` / `All 33 mutants caught.` Paste the tail of each into the final report.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "docs(cld): SW v244 closure - pool-style cue + Practice Arena"
```

