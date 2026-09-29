# Cold Shoulder Fun Pass — Phase 2 ("looks fun") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every Cold Shoulder pixel is redrawn in the sticker's look: inked-watercolour penguins with faces, nine poses and a Hunger mood ladder; a snow-slab floe that keeps the story of the Floe-Off; ice-cube chunks; a moving Drink; particles; aim marks in your colour instead of the cue; an ice-shelf floe screen; and drawn art on every other CLD screen. Ships as SW v246. `MP_PROTOCOL_VERSION` stays `'v245'`.

**Architecture:** A new pure module, `js/games/cld-art.js` (`window.CldArt`, the shape of `dyb-dice.js`), is ported from the approved prototype. It draws what it is given and reads no `cld*` state. `cld.js` keeps the two seams that make the art trustworthy. The first is `cldRenderPenguin`, the one door every penguin pixel goes through. The second is `cldDraw(view, m)`, which reads only the render model. The model grows per-penguin fields (`pose`, `look`, `vel`, `k`, `hunger`…) derived from the timeline, never sent. View-owned objects (a floe surface, a particle system, belly-slide trails) hang off each view, so the live floe and the Practice Arena never share one.

**Tech Stack:** Vanilla JS (globals, no modules), `<canvas>` 2D, Node `vm` harnesses in `tools/`, the `visual-check` skill (headless Chromium) for layout. Markup is edited in `src/screens/cld.html`, then run `node tools/build-index.js`.

**Spec:** `docs/superpowers/specs/2026-09-29-cld-fun-pass-design.md`. § 4 is this plan, and § 2 binds it. Read § 1, § 2 and § 4 whole before Task 1. The prototype `docs/superpowers/prototypes/2026-09-29-cld-style/cld-art.js` is the starting draft for Task 1. Its `index.html` (`penguinState`, `draw`, `stepPlay`) is the reference for the composer.

## Global Constraints

- **Suite standard untouched** (spec § 2): `cld-cta`, `.pill` + `pill-active-cld`, the toggles, the menu's four `gel-btn` buttons, the shared overlay frames, the Decision Modals' buttons, the z-index stack, and the engine chrome's behaviour.
- **Zero bytes of art.** No image, font or audio file is added, and no library. Emoji already in copy stays copy.
- **No packet change.** `cldTimelinePayload` already sends `events` whole, and a `landing` event carries `t`, `x`, `y` and `from: { x, y }` (the thrower's position at Slide start, `cld.js` ~586; the physics emits it at `physics.js` ~201). Snowball arcs are derived from that. `MP_PROTOCOL_VERSION` stays `'v245'`, and `verify-cld-loopback.js` must stay green unchanged in contract.
- `js/lib/physics.js` is not edited. The rules layer (above the `STAGE 4 OF 6` marker in `cld.js`) is not edited, except for new pure model helpers placed in Stage 4.
- **`cld-art.js` is pure:** no `cld*` reads, no `Date.now()`, and no `Math.random()` in any per-frame draw path (particle *spawns* may use it). Every drawing entry point is a no-op when `document` or `Path2D` is missing. The pure helpers (`posePars`, `moodPars`) answer anywhere.
- **`cld.js` must run with `cld-art.js` absent** (a rules-only harness, a failed fetch). It draws nothing and never throws. Every `CldArt` read goes through `cldArt()`.
- **Reduced motion is checked in JS** for every requestAnimationFrame loop, via the existing `cldReducedMotion()`: nothing travels and the end state shows. CSS motion relies on the global block in `css/styles.css` (~2191, which already pins `animation-iteration-count: 1`). Never add a second `prefers-reduced-motion` block.
- Only `transform`/`opacity` animate. No new `transition-all`. DPR is capped at 2 on every canvas.
- **Every new top-level `let` in `cld.js`** must be added to `cldSwapOut` or to `CLD_SWAP_EXEMPT`, or `verify-cld-practice.js` § G fails. Prefer state on the view objects, which needs no new lets.
- Edit `src/screens/cld.html`, never `index.html`. Rebuild with `node tools/build-index.js` and confirm with `node tools/verify-build-fresh.js`.
- Every changed line of copy is a paired change with `docs/game-identities/cld.md` T7b and must pass `node tools/verify-identity-docs.js`.
- Australian English. The CLD brand is glacier `#8ECAE6` (fill, white ink) and `#2a6b85` (`.cld-label` text). Deep ink is `#123B4C`.
- A harness check pinned to a v245 field name or value is **updated** to the renamed field (`state`→`pose`, `facing`→`look`, `hungry`→`hunger`). It is never loosened, deleted or skipped.
- **Test on the owner's iPhone SE sizes:** 375×667, 375×548 and 320×452 in every `visual-check` pass.

## Review Focus

These are the inputs no task's main tests exercise. Each gets its test in the task named.
1. **A penguin that went in this Slide is drawn in the water from its seat beat on.** It is never drawn standing or belly-sliding at its seat, even though `cldPenguins` still says `drowned: false` until the Slide's post-state lands. (Test: Task 2, section N.)
2. **The mood never changes mid-Slide.** The Hunger level a player aims under is the level their penguin wears for that Slide's whole replay, even though `cldSlideNo` has already advanced. (Test: Task 2, section N.)
3. **A Thaw repaint keeps the Floe-Off's grooves and splats,** and a new floe starts clean: the next Floe-Off, an Ice Bath, or Practice's Start over. (Test: Task 3, section O.)
4. **`cld.js` with `cld-art.js` missing draws nothing and never throws,** on the floe, in the Arena, on the result screen, and in the seam. (Test: Task 2, section N.)
5. **A touch on the floating header's `[?]`, 🔊 or ✕ opens that control and never starts an aim** on the stage underneath. (Test: Task 5, section Q.)

---

## File map

| File | Responsibility in this plan |
|---|---|
| `js/games/cld-art.js` | **new**: the art module (T1) |
| `js/games/cld.js` | the seam + model (T2), the composer, view objects and fx hook (T3), aim marks (T4), floe chrome sync (T5), chrome art (T6), the Cast (T7) |
| `src/screens/_scripts-3.html` | `cld-art.js` before `cld.js` (T1) |
| `sw.js` | precache `cld-art.js` (T1); `CACHE_NAME` → `v246` (T9 only) |
| `src/screens/cld.html` | the full-bleed floe screen + ice shelf (T5); the menu, intro and podium canvases, and the ice-block buttons (T6); the Cast's faces row (T7) |
| `css/styles.css` | `.cld-bark` (T3); the shelf, power tube and tally heads (T5); `.cld-ice-btn` and the menu bob (T6) |
| `tools/verify-cld-practice.js` | loads the art; sections M–R and T (T1–T7) |
| `tools/verify-cld-loopback.js` | loads the art on every device (T1) |
| `tools/mutate-cld.js` | an `art` source kind and the new mutants (T1–T6) |
| `docs/game-identities/cld.md` | T7b: Boing! (T3), the floe prose (T2), the Cast (T7); T9 (T9) |
| `CLAUDE.md`, `docs/code-map.md`, impl notes, decision log, `docs/deferred-work.md`, `docs/sw-changelog.md` | closure (T9) |

**Baseline before starting** (on `cld-cue-arena` at `1c9e805`, all green): `verify-cld-physics` 133 · `verify-cld-loop` 156 · `verify-cld-practice` 189 · `verify-cld-loopback` 192 · `mutate-cld` 45/45. Run all five first and stop if any is red.

---

### Task 0: The owner's v245 notes (conditional)

The handoff says the owner's v245 playtest notes, if any, come first. None are recorded in `docs/deferred-work.md` § Cold Shoulder as of 29 Sep 2026.

- [ ] **Step 1:** Ask the owner whether they have played v245 and have notes.
- [ ] **Step 2:** Sort each note. A note about **looks** (faces, colours, the cue, buttons) folds into the Phase 2 task that owns it; say which in reply. A note about **rules, balance, the camera's numbers or Practice plans** is a Phase 1 fix: do it first as a Tier-1 change on this branch, re-run the Phase 1 harnesses, and record it in DD-19. Stop and ask if a note contradicts spec § 4.
- [ ] **Step 3:** No notes means go straight to Task 1.

---

### Task 1: The art module — `js/games/cld-art.js`

**Files:**
- Create: `js/games/cld-art.js` (port of `docs/superpowers/prototypes/2026-09-29-cld-style/cld-art.js`)
- Modify: `src/screens/_scripts-3.html:16` — add `<script src="js/games/cld-art.js"></script>` on the line **before** `js/games/cld.js`
- Modify: `sw.js` `PRECACHE_URLS` — add `'js/games/cld-art.js',` immediately before `'js/games/cld.js',` (~line 33). Do **not** bump `CACHE_NAME` here; that happens in Task 9.
- Modify: `tools/verify-cld-practice.js` — the sandbox factory, the mock ctx, the art load, and new section M
- Modify: `tools/verify-cld-loopback.js` — load the art per device (~line 200), mock ctx additions (~line 112)
- Modify: `tools/mutate-cld.js` — an `art` source kind + four mutants

**Interfaces:**
- Consumes: nothing.
- Produces: `window.CldArt` (or `globalThis.CldArt` with no `window`):
  - `POSES` = `['idle','aim','slide','squash','plunge','bob','back','throw','win']`
  - `FACES` = `['happy','focus','strain','shock','grumpy','dizzy']`
  - `ready(ctx) → bool`: a DOM, `Path2D` and a context are all present
  - `posePars(o) → P`, pure. `o`: `{ pose, t, seed, look, power, vel, k, outward, expr }`. `P` keys: `rot, sx, sy, lift, flipL, flipR, frontL, frontR, feet, sink, expr, lookX, lookY, back, bob, pivot`.
  - `moodPars(level, t, seed, reduced) → { brow: 0|1|2|3, huff: bool, stamp: bool, fire: 0|1, flameT: number, glow: 0..1 }`, pure.
  - `penguin(ctx, o)`. `o`: `{ x, y, r, tint, t, pose, look, power, vel, k, outward, expr, hunger, seed, splat, me, second, dim, ring, head, fish, px, reduced }`. `ring` defaults to true: `ring: false` skips the owner ring and the "me" ring but keeps the shadow. `head: true` draws just the head, fitted to a circle of radius `r` at `(x, y)`. `fish: true` puts a Fish in a `win` penguin's flippers.
  - `meMarker(ctx, x, y, r, tint, t, px)`
  - `makeFloe(cx, cy, radius, seed, q) → f` (`f.marks = []`), `setFloeRadius(f, radius)` (repaints, then replays `f.marks`), `floeMark(f, kind, a, b)` (records into `f.marks`, then paints; `kind` is `'groove'` with `a = [{x,y}…]` and `b = width`, or `'splat'` with `a = {x,y}`), `floe(ctx, f, t, reduced)`, `groove(ctx, pts, w)`
  - `water(ctx, view, t, cx, cy, R, reduced)`, `scenery(ctx, view, t, cx, cy, R, reduced)`. `view` needs `{ x, y, w, h }` in world units.
  - `berg(ctx, b, maxHits, t)`, where `b` is `{ x, y, r, hits, angle }`
  - `aim(ctx, o)`. `o`: `{ x, y, r, dx, dy, power, tint, live, locked, rival, finger, guide, t, px, reduced }`. `guide` is exactly `cldAimGuide`'s return: `{ end:{x,y}, ghost:{x,y}|null, stub:{x1,y1,x2,y2}|null, kind }`, or `null`.
  - `reticle(ctx, o)`. `o`: `{ x, y, tint, t, from:{x,y}|null, rival, reduced }`
  - `seat(ctx, x, y, r, tint, t, chosen)`, `snowball(ctx, from, to, k, r)`
  - `fish(ctx, x, y, s, tilt)`: a drawn Fish about `1.2·s` long
  - `plinth(ctx, x, y, w, h)`: an ice block whose top face sits at `y`
  - `makeFx() → fx`: `{ setReduced, clear, count, spray, puff, splash, shatter, landing, step(dt), draw(ctx, layer) }`, capped at 420 particles
  - `lighten, darken, mix, INK`

- [ ] **Step 1: Refactor the practice harness sandbox into a factory, load the art, and extend the mock ctx**

In `tools/verify-cld-practice.js`, add the art path under `GAME` (~line 16):

```js
const ART  = process.env.CLD_ART_SRC  || path.join(ROOT, 'js/games/cld-art.js');
```

In `ctx2d()` (~line 20), add these members next to the existing ones:

```js
    createPattern: () => ({}), arcTo: noop,
    globalCompositeOperation: 'source-over', imageSmoothingEnabled: true,
```

In `makeDocument()`'s `mk`, give every element a style that supports custom properties. Replace `style: {},` with:

```js
      style: { setProperty(k, v) { this[k] = v; } },
```

Replace the sandbox block (~lines 80–100) with a factory, so later sections can build a second sandbox without the art:

```js
// ── The sandbox ────────────────────────────────────────────────────────────
const sent = { envelope: 0, private: 0 };
const screens = [];
function freshSandbox() {
  const s = {
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
  s.globalThis = s;
  s.window.window = s.window;
  return s;
}
const S = freshSandbox();
vm.createContext(S);
vm.runInContext(fs.readFileSync(PHYS, 'utf8'), S, { filename: PHYS });
vm.runInContext(fs.readFileSync(ART,  'utf8'), S, { filename: ART });    // SW v246 — before cld.js, as in the page
vm.runInContext(fs.readFileSync(GAME, 'utf8'), S, { filename: GAME });
```

(`S.window` is a separate object from `S`. `cld-art.js` publishes on `window`, so it lands on `S.window.CldArt`, and `cld.js` reads it through `cldArt()`, which reads `window.CldArt`.)

- [ ] **Step 2: Write section M (the failing test)**

Add at the end of the file's checks, before the summary lines:

```js
// ═══════════════════════════════════════════════════════════════════════════
// M. The art module (fun-pass spec § 4.1–4.2)
// ═══════════════════════════════════════════════════════════════════════════
// A context that counts what it paints, so "it drew something" is a fact.
function recCtx() {
  const c = S.document.createElement('canvas').getContext('2d');
  c.n = 0;
  ['fill', 'stroke', 'fillRect', 'strokeRect', 'drawImage', 'fillText'].forEach(k => {
    const f = c[k]; c[k] = function () { c.n++; return f.apply(c, arguments); };
  });
  return c;
}
if (!TUNE) {
  section('M. The art module');
  const A = S.window.CldArt;
  ok('cld-art.js exposes window.CldArt', !!A && typeof A.penguin === 'function');
  check('nine poses', A.POSES, ['idle', 'aim', 'slide', 'squash', 'plunge', 'bob', 'back', 'throw', 'win']);
  check('six faces', A.FACES, ['happy', 'focus', 'strain', 'shock', 'grumpy', 'dizzy']);

  const KEYS = ['back', 'bob', 'expr', 'feet', 'flipL', 'flipR', 'frontL', 'frontR', 'lift',
                'lookX', 'lookY', 'pivot', 'rot', 'sink', 'sx', 'sy'];
  A.POSES.forEach(pose => {
    const P = A.posePars({ pose, t: 1.3, seed: 2, power: 0.5, vel: { x: 1, y: 0 }, k: 0.5 });
    check(`posePars('${pose}') has the full shape`, Object.keys(P).sort(), KEYS);
  });
  const face = pose => A.posePars({ pose, t: 0, power: 0.5, k: 0.5 }).expr;
  check('each pose wears its face (slide shows its back)',
        ['idle', 'aim', 'squash', 'plunge', 'bob', 'back', 'throw', 'win'].map(face),
        ['happy', 'focus', 'shock', 'shock', 'grumpy', 'dizzy', 'focus', 'happy']);
  check('aim strains past 0.92', A.posePars({ pose: 'aim', power: 0.95 }).expr, 'strain');
  ok('slide is seen from behind', A.posePars({ pose: 'slide', vel: { x: 0, y: 1 } }).back === true);
  ok('a plug sits shallower than a knocked-back penguin',
     A.posePars({ pose: 'bob' }).sink < A.posePars({ pose: 'back' }).sink);
  check('expr overrides the pose’s face', A.posePars({ pose: 'idle', expr: 'dizzy' }).expr, 'dizzy');

  // The Hunger ladder (§ 4.2): a mood OVER the face, one rung per level.
  const mood = (l, t, reduced) => A.moodPars(l, t || 0, 3, !!reduced);
  const T = Array.from({ length: 400 }, (_, i) => i * 0.05);          // 20 s of clock
  const share = (l, key) => T.filter(t => mood(l, t)[key]).length / T.length;
  check('level 0: completely normal', mood(0, 5), { brow: 0, huff: false, stamp: false, fire: 0, flameT: 0, glow: 0 });
  ok('level 1: frowns now and then (15–35% of the time)', share(1, 'brow') > 0.15 && share(1, 'brow') < 0.35,
     'share ' + share(1, 'brow'));
  check('level 2: frowns all the time', share(2, 'brow'), 1);
  check('level 3: annoyed brows', mood(3, 1).brow, 2);
  ok('level 3: a huff and a stamp now and then', share(3, 'huff') > 0 && share(3, 'stamp') > 0);
  check('level 4: angry, no fire yet', [mood(4, 1).brow, mood(4, 1).fire], [3, 0]);
  check('level 5: fire in its eyes, no glow', [mood(5, 1).fire, mood(5, 1).glow], [1, 0]);
  ok('level 6: a glow', mood(6, 1).glow > 0);
  ok('level 7+: the glow grows every level', [7, 8, 9].every(l => mood(l, 1).glow > mood(l - 1, 1).glow));
  ok('the glow never passes 1', mood(40, 1).glow <= 1);
  ok('the glow is static per level (nothing pulses)', T.every(t => mood(8, t).glow === mood(8, 0).glow));
  ok('reduced motion: a still flame', T.every(t => mood(5, t, true).flameT === mood(5, 0, true).flameT));
  ok('reduced motion: no huff, no stamp', T.every(t => !mood(3, t, true).huff && !mood(3, t, true).stamp));

  // Every drawing entry point runs on the mock DOM and actually paints.
  const guide = { end: { x: 260, y: 180 }, ghost: { x: 250, y: 180 }, stub: { x1: 260, y1: 180, x2: 275, y2: 190 }, kind: 'penguin' };
  const draws = {
    'penguin':        c => A.penguin(c, { x: 180, y: 180, r: 11, tint: '#e4572e', t: 1, pose: 'idle', hunger: 6, seed: 1 }),
    'penguin (head)': c => A.penguin(c, { x: 10, y: 10, r: 8, tint: '#e4572e', t: 0, pose: 'idle', head: true }),
    'penguin (win + fish)': c => A.penguin(c, { x: 60, y: 90, r: 20, tint: '#e4572e', t: 0.3, pose: 'win', fish: true, ring: false }),
    'meMarker':       c => A.meMarker(c, 180, 180, 11, '#e4572e', 1, 2),
    'floe':           c => A.floe(c, A.makeFloe(180, 180, 170, 1, 3), 1, false),
    'water':          c => A.water(c, { x: -50, y: -50, w: 460, h: 460 }, 1, 180, 180, 170, false),
    'scenery':        c => A.scenery(c, { x: -50, y: -50, w: 460, h: 460 }, 1, 180, 180, 170, false),
    'berg':           c => A.berg(c, { x: 180, y: 20, r: 16, hits: 1, angle: 0 }, 2, 1),
    'aim':            c => A.aim(c, { x: 180, y: 180, r: 11, dx: 1, dy: 0, power: 0.7, tint: '#e4572e', live: true,
                                      locked: false, rival: false, finger: { x: 120, y: 180 }, guide, t: 1, px: 2, reduced: false }),
    'aim (rival)':    c => A.aim(c, { x: 180, y: 180, r: 11, dx: -1, dy: 0, power: 1, tint: '#3a86ff', live: false,
                                      locked: false, rival: true, finger: null, guide: null, t: 1, px: 2, reduced: false }),
    'reticle':        c => A.reticle(c, { x: 200, y: 150, tint: '#e4572e', t: 1, from: { x: 30, y: 180 }, rival: false, reduced: false }),
    'seat':           c => A.seat(c, 180, 10, 11, '#e4572e', 1, true),
    'snowball':       c => A.snowball(c, { x: 30, y: 180 }, { x: 200, y: 150 }, 0.5, 5.6),
    'fish':           c => A.fish(c, 20, 10, 12, 0),
    'plinth':         c => A.plinth(c, 50, 40, 60, 40),
    'groove':         c => A.groove(c, [{ x: 150, y: 180 }, { x: 200, y: 180 }], 8),
  };
  Object.keys(draws).forEach(k => {
    const c = recCtx(); let e = null;
    try { draws[k](c); } catch (x) { e = x; }
    ok(`CldArt.${k} paints on the mock DOM`, !e && c.n > 0, e ? e.stack : 'no paint calls');
  });

  // The floe keeps its story: marks survive a Thaw repaint.
  const f = A.makeFloe(180, 180, 170, 1, 3);
  A.floeMark(f, 'groove', [{ x: 150, y: 180 }, { x: 200, y: 180 }], 8);
  A.floeMark(f, 'splat', { x: 180, y: 200 });
  A.setFloeRadius(f, 160);
  check('a Thaw repaint keeps every mark', [f.radius, f.marks.length], [160, 2]);

  // Particles: capped, and reduced motion spawns nothing that travels.
  const fx = A.makeFx();
  fx.splash(180, 180, 1); ok('a splash spawns droplets', fx.count() > 2);
  fx.clear(); fx.setReduced(true); fx.splash(180, 180, 1);
  check('reduced motion: a splash leaves only its two rings', fx.count(), 2);
  fx.clear(); fx.puff(180, 180, 1); fx.spray(180, 180, 50, 0, 3); fx.landing(180, 180); fx.shatter(180, 180);
  check('reduced motion: nothing that travels spawns (only the shatter ring)', fx.count(), 1);
  fx.setReduced(false); fx.clear(); for (let i = 0; i < 60; i++) fx.splash(180, 180, 1);
  ok('the particle cap holds at 420', fx.count() <= 420, 'count ' + fx.count());

  // No DOM → no-op: a bare vm with no window, no document, no Path2D.
  const B = {}; B.globalThis = B; vm.createContext(B);
  let bareErr = null;
  try { vm.runInContext(fs.readFileSync(ART, 'utf8'), B, { filename: ART }); } catch (e) { bareErr = e; }
  ok('cld-art.js loads in a bare vm', bareErr === null, bareErr && bareErr.stack);
  const BA = B.CldArt;
  ok('…and publishes CldArt on globalThis', !!BA);
  const bc = recCtx(); let bErr = null;
  try {
    BA.penguin(bc, { x: 1, y: 1, r: 11, tint: '#e4572e', pose: 'idle' });
    BA.floe(bc, BA.makeFloe(180, 180, 170, 1, 3), 0, false);
    BA.water(bc, { x: 0, y: 0, w: 360, h: 360 }, 0, 180, 180, 170, false);
    BA.berg(bc, { x: 1, y: 1, r: 16, hits: 1, angle: 0 }, 2, 0);
    BA.aim(bc, { x: 1, y: 1, r: 11, dx: 1, dy: 0, power: 1, tint: '#e4572e' });
    BA.fish(bc, 1, 1, 10, 0); BA.plinth(bc, 1, 1, 10, 10);
    BA.makeFx().draw(bc, 'air');
  } catch (e) { bErr = e; }
  ok('every drawing entry point is a no-op with no DOM', bErr === null && bc.n === 0,
     bErr ? bErr.stack : 'paint calls: ' + bc.n);
  ok('pure helpers still answer with no DOM',
     BA.posePars({ pose: 'idle' }).expr === 'happy' && BA.moodPars(2, 0, 0, false).brow === 1);
}
```

- [ ] **Step 3: Run it to verify it fails**

Run: `node tools/verify-cld-practice.js`
Expected: the run crashes at load (`ENOENT … cld-art.js`), or section M fails.

- [ ] **Step 4: Port the module**

Copy the prototype **verbatim** to `js/games/cld-art.js` (the mutation harness anchors on its exact text, so don't reformat it). Then make these edits, in order.

**(a) Header.** Keep the prototype's header comment. Change the last line to `// Depends on: nothing. Loaded before cld.js (src/screens/_scripts-3.html).`

**(b) The guard.** Under `const HAS_DOM = …`, add:

```js
  // Every DRAWING entry point starts with this: no DOM, no Path2D or no context →
  // a no-op, so a headless harness can load the module and call it freely.
  // posePars / moodPars are pure and answer regardless.
  function ready(ctx) { return HAS_DOM && typeof Path2D !== 'undefined' && !!ctx; }
```

Make `if (!ready(ctx)) return;` the first line of `penguin`, `meMarker`, `floe`, `water`, `scenery`, `berg`, `aim`, `reticle`, `seat` and `snowball`, and of the new `fish` and `plinth`. `groove(g, …)` takes its context as `g`, so use `if (!ready(g)) return;`. In `makeFx`'s `draw(ctx, layer)`, start with `if (!ready(ctx)) return;`.

**(c) Poses and faces.** Under the colour constants:

```js
  const POSES = ['idle', 'aim', 'slide', 'squash', 'plunge', 'bob', 'back', 'throw', 'win'];
  const FACES = ['happy', 'focus', 'strain', 'shock', 'grumpy', 'dizzy'];
```

**(d) The mood ladder.** Add it after `posePars`:

```js
  // ── Hunger's mood (spec § 4.2) — a mood OVER whatever face the pose wears,
  // never a seventh face. One rung per Hunger level; nothing here pulses, and
  // reduced motion freezes the flame and drops the huff and stamp.
  const MOOD_GLANCE_S = 1.6;   // level 1: one glance window in four lands as a frown
  const MOOD_HUFF_S   = 3.2;   // level 3: one huff-and-stamp per cycle
  const GLOW_BASE = 0.35, GLOW_STEP = 0.15;
  function moodPars(level, t, seed, reduced) {
    const L = Math.max(0, Math.floor(level || 0)), s = Math.round(seed || 0), tt = t || 0;
    const M = { brow: 0, huff: false, stamp: false, fire: 0, flameT: 0, glow: 0 };
    if (L === 1) M.brow = ((Math.floor(tt / MOOD_GLANCE_S) + s) % 4 === 0) ? 1 : 0;
    if (L === 2) M.brow = 1;
    if (L === 3) {
      M.brow = 2;
      if (!reduced) {
        const ph = ((tt + s) % MOOD_HUFF_S + MOOD_HUFF_S) % MOOD_HUFF_S;
        M.huff = ph < 0.35;
        M.stamp = ph >= 0.35 && ph < 0.6;
      }
    }
    if (L >= 4) M.brow = 3;
    if (L >= 5) { M.fire = 1; M.flameT = reduced ? 0 : tt; }
    if (L >= 6) M.glow = Math.min(1, GLOW_BASE + GLOW_STEP * (L - 6));
    return M;
  }
```

**(e) Drawing the mood.** Add these helpers above `penguin`:

```js
  // A brow slanting down to the middle — the prototype's grumpy brow, steeper per rung.
  function brow(ctx, x, y, r, side, level) {
    const tilt = [0, 0.10, 0.14, 0.19][level] * r;
    ctx.save();
    ctx.strokeStyle = INK; ctx.lineCap = 'round';
    ctx.lineWidth = (0.07 + 0.012 * level) * r;
    ctx.beginPath();
    ctx.moveTo(x - side * 0.11 * r, y - 0.19 * r - tilt);
    ctx.lineTo(x + side * 0.10 * r, y - 0.15 * r);
    ctx.stroke();
    ctx.restore();
  }
  function flamePath(ctx, r, k) {
    ctx.beginPath();
    ctx.moveTo(0, -0.26 * r * k);
    ctx.quadraticCurveTo(0.13 * r * k, -0.06 * r * k, 0.07 * r * k, 0.06 * r * k);
    ctx.quadraticCurveTo(0, 0.12 * r * k, -0.07 * r * k, 0.06 * r * k);
    ctx.quadraticCurveTo(-0.13 * r * k, -0.06 * r * k, 0, -0.26 * r * k);
  }
  // Fire in its eyes. flameT is 0 under reduced motion, so the flame stands still.
  function flame(ctx, x, y, r, flameT, side) {
    const f = 1 + 0.12 * Math.sin(flameT * 18 + side * 1.3);
    ctx.save();
    ctx.translate(x, y - 0.04 * r); ctx.scale(1, f);
    flamePath(ctx, r, 1);    ctx.fillStyle = '#ffb02e'; ctx.fill();
    flamePath(ctx, r, 0.55); ctx.fillStyle = '#e4572e'; ctx.fill();
    ctx.restore();
  }
  // A glow in the player's colour behind the body — a STATIC strength per level.
  function glowBehind(ctx, r, tint, glow) {
    const g = ctx.createRadialGradient(0, -1.1 * r, 0.2 * r, 0, -1.1 * r, r * (1.8 + 1.2 * glow));
    g.addColorStop(0, alpha(tint, 0.55 * glow));
    g.addColorStop(1, alpha(tint, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, -1.1 * r, r * (1.8 + 1.2 * glow), 0, TAU); ctx.fill();
  }
  // A huff: two little clouds off the beak side.
  function huff(ctx, r, lookX) {
    const sx = lookX >= 0 ? 1 : -1;
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(sx * 0.95 * r, -1.35 * r, 0.12 * r, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(sx * 1.18 * r, -1.48 * r, 0.08 * r, 0, TAU); ctx.fill();
    ctx.restore();
  }
```

Inside `penguin(ctx, o)`:
- Directly below `const inWater = P.sink > 0;`, add `const M = moodPars(inWater ? 0 : (o.hunger || 0), t, o.seed || 0, !!o.reduced);`. A penguin in the water wears no mood.
- **The ring.** Wrap the owner-ring and "me"-ring strokes (both the on-ice block ~line 272 and the in-water block ~line 414) in `if (o.ring !== false) { … }`. Leave the shadow alone.
- **The glow.** Right after `ctx.scale(P.sx, P.sy)` (and any `pivot` translate), before the body is painted, add `if (M.glow > 0) glowBehind(ctx, r, tint, M.glow);`.
- **The eyes.** Give `eye()` an 8th parameter `noBrow`, and skip its own focus/grumpy/strain brow when it is true. At the call (~line 350) pass `M.brow > 0`. Directly after that `forEach`, add:

```js
          if (M.brow) [-1, 1].forEach(s => brow(ctx, fx + s * fw * 0.44, fy - 0.02 * r, r, s, M.brow));
          if (M.fire) [-1, 1].forEach(s => flame(ctx, fx + s * fw * 0.44, fy - 0.02 * r, r, M.flameT, s));
          if (M.huff) huff(ctx, r, P.lookX);
```

- **The stamp.** Give `feet(ctx, r, t, moving)` a 5th parameter `stamp`. When it is true, draw the left foot raised by `0.14 * r`. Pass `M.stamp` at the call.
- **The Fish.** When `o.fish && o.pose === 'win'`, after the flippers are painted in front, draw `fish(ctx, 0, -2.55 * r, 0.9 * r, -0.2)`, in the body's local frame (inside the transform).
- **The head.** When `o.head` is true, the penguin is a chrome avatar. First read `bodyPath(r)` and note, in local units of `r`, the head's centre `(0, HEAD_CY)` and a radius `HEAD_R` that encloses the head. Add them as named constants beside `bodyPath` (expect about `HEAD_CY ≈ -1.55`, `HEAD_R ≈ 0.62`). Then, at the top of `penguin` after the guard:

```js
    if (o.head) {
      // Just the head, fitted to a circle of radius o.r at (o.x, o.y): the tally,
      // the scoreboard, the plunge list. No shadow, rings, feet or flippers.
      const rb = o.r / HEAD_R;
      ctx.save();
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, TAU); ctx.clip();
      penguin(ctx, Object.assign({}, o, { head: false, ring: false, x: o.x, y: o.y - HEAD_CY * rb,
                                          r: rb, pose: 'idle', noShadow: true, noFeet: true }));
      ctx.restore();
      return;
    }
```

and honour `o.noShadow` (skip the shadow ellipse) and `o.noFeet` (force `P.feet = false`, and skip the flippers). Tune `HEAD_CY`/`HEAD_R` by eye in Task 6's visual pass; their names are the contract.

**(f) The floe keeps its marks.** In `makeFloe`, add `marks: []` to `f`. Replace the first two lines of `floeMark` so every mark is recorded before painting:

```js
  function floeMark(f, kind, a, b) {
    if (!f) return;
    f.marks.push({ kind: kind, a: a, b: b });
    if (!f.canvas) return;
```

Add under `floeMark`:

```js
  // The Thaw: the same surface, repainted at the new radius, with the Floe-Off's
  // story replayed onto it (clipped to the smaller rim by floeMark itself).
  function setFloeRadius(f, radius) {
    if (!f) return;
    f.radius = radius;
    paintFloe(f);
    const marks = f.marks; f.marks = [];
    marks.forEach(mk => floeMark(f, mk.kind, mk.a, mk.b));
  }
```

**(g) Rival marks.** In `aim(ctx, o)`, when `o.rival` is true: set `ctx.globalAlpha *= 0.5`, draw the arrow body with `ctx.setLineDash([5, 4])`, and skip the tether, the grip ring, the lock nub and the chevron flow. In `reticle(ctx, o)`, when `o.rival` is true, set `ctx.globalAlpha *= 0.55` and skip the throw arc.

**(h) Two new drawings.** Add before `makeFx`:

```js
  // A Fish — the prize. About 1.2·s long, nose to the right.
  function fish(ctx, x, y, s, tilt) {
    if (!ready(ctx)) return;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(tilt || 0); ctx.scale(s, s);
    ctx.lineJoin = 'round'; ctx.lineWidth = 0.09; ctx.strokeStyle = INK;
    ctx.beginPath(); ctx.moveTo(0.55, 0);
    ctx.quadraticCurveTo(0.1, -0.42, -0.35, 0); ctx.quadraticCurveTo(0.1, 0.42, 0.55, 0); ctx.closePath();
    ctx.fillStyle = '#6fb3d6'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-0.3, 0); ctx.lineTo(-0.62, -0.28); ctx.lineTo(-0.56, 0); ctx.lineTo(-0.62, 0.28); ctx.closePath();
    ctx.fillStyle = '#4f93b3'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0.12, 0.1, 0.22, 0.08, 0, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill();
    ctx.beginPath(); ctx.arc(0.34, -0.06, 0.05, 0, TAU); ctx.fillStyle = INK; ctx.fill();
    ctx.restore();
  }

  // An ice block for the podium: its lit top face sits at y, centred on x.
  function plinth(ctx, x, y, w, h) {
    if (!ready(ctx)) return;
    const top = Math.min(8, h * 0.25);
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineWidth = 1.2; ctx.strokeStyle = '#4f93b3';
    ctx.fillStyle = '#b3dcee';
    ctx.beginPath(); ctx.rect(x - w / 2, y, w, h); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e6f6fc';
    ctx.beginPath(); ctx.ellipse(x, y, w / 2, top / 2, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(x, y - 1, w * 0.42, top * 0.32, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
```

**(i) Per-frame randomness.** Run `grep -n "Math.random" js/games/cld-art.js`. Every hit must be inside a `makeFx` spawn method (`spray`, `puff`, `splash`, `shatter`, `landing`). Replace any other hit with the seeded `hash()`/`rng()` already in the file.

**(j) The export.** Replace `window.CldArt = {` and its object with:

```js
  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  ROOT.CldArt = {
    POSES: POSES, FACES: FACES, ready: ready,
    posePars: posePars, moodPars: moodPars,
    penguin: penguin, meMarker: meMarker, groove: groove,
    makeFloe: makeFloe, paintFloe: paintFloe, floeMark: floeMark, setFloeRadius: setFloeRadius, floe: floe,
    water: water, scenery: scenery, berg: berg,
    aim: aim, reticle: reticle, seat: seat, snowball: snowball,
    fish: fish, plinth: plinth,
    makeFx: makeFx,
    lighten: lighten, darken: darken, mix: mix, INK: INK,
  };
```

- [ ] **Step 5: Load the art in the loopback, and wire the script tag and precache**

In `tools/verify-cld-loopback.js`, after `const GAME = …` (~line 46):

```js
const ART  = process.env.CLD_ART_SRC  || path.join(ROOT, 'js/games/cld-art.js');
```

After `const gameSrc = …` (~line 50): `const artSrc = fs.readFileSync(ART, 'utf8');`. In the device builder (~line 200), between the physics and game loads:

```js
  vm.runInContext(artSrc, sandbox, { filename: `cld-art.js (${name})` });
```

In its `ctx2d()` (~line 112 area), add `createPattern: () => ({}), arcTo() {}, globalCompositeOperation: 'source-over', imageSmoothingEnabled: true,`. Then check the sandbox's `window`. If it is a separate object from the sandbox, `CldArt` lands on it, as in the practice harness; if it is the sandbox itself, `CldArt` lands there. Either works, because `cld.js` reads `window.CldArt`.

Edit `src/screens/_scripts-3.html` and `sw.js` as listed under **Files**. Then run `node tools/build-index.js`.

- [ ] **Step 6: Give the mutation harness an `art` source**

In `tools/mutate-cld.js`, replace the `GAME`/`PHYS`/`SRC` lines (~30–35) with:

```js
const GAME = path.join(ROOT, 'js/games/cld.js');
const PHYS = path.join(ROOT, 'js/lib/physics.js');
const ART  = path.join(ROOT, 'js/games/cld-art.js');
// Normalised to LF: core.autocrlf is on in this repo, and the multi-line anchors below
// would otherwise read as STALE on a CRLF checkout.
const SRC  = { game: fs.readFileSync(GAME, 'utf8').replace(/\r\n/g, '\n'),
               phys: fs.readFileSync(PHYS, 'utf8').replace(/\r\n/g, '\n'),
               art:  fs.readFileSync(ART,  'utf8').replace(/\r\n/g, '\n') };
const ENV  = { game: 'CLD_SRC', phys: 'CLD_PHYS_SRC', art: 'CLD_ART_SRC' };
const EXT  = { game: '.cld.js', phys: '.phys.js', art: '.art.js' };
```

In the runner loop, replace the file/env lines with `const file = path.join(OUT, name + EXT[which]);` and `env[ENV[which]] = file;`. Append to `M`:

```js
// ── SW v246: the art module (verify-cld-practice.js) ─────────────────────────
['mood-level-2-rests', 'art', [[
  '    if (L === 2) M.brow = 1;', '    if (L === 2) M.brow = (tt % 2 < 1) ? 1 : 0;']], 'practice'],
['glow-pulses', 'art', [[
  '    if (L >= 6) M.glow = Math.min(1, GLOW_BASE + GLOW_STEP * (L - 6));',
  '    if (L >= 6) M.glow = Math.min(1, (GLOW_BASE + GLOW_STEP * (L - 6)) * (0.9 + 0.1 * Math.sin(tt)));']], 'practice'],
['reduced-flame-flickers', 'art', [[
  '    if (L >= 5) { M.fire = 1; M.flameT = reduced ? 0 : tt; }', '    if (L >= 5) { M.fire = 1; M.flameT = tt; }']], 'practice'],
['thaw-repaint-drops-marks', 'art', [[
  '    marks.forEach(mk => floeMark(f, mk.kind, mk.a, mk.b));', '']], 'practice'],
```

- [ ] **Step 7: Run everything**

Run: `node tools/verify-cld-practice.js && node tools/verify-cld-loopback.js && node tools/verify-cld-loop.js && node tools/mutate-cld.js && node tools/verify-build-fresh.js`
Expected: all pass. Practice runs 189 + section M's checks, and mutate is 49/49. If `cld.js` breaks anything, stop: this task must not touch `cld.js`.

- [ ] **Step 8: Commit**

```bash
git add js/games/cld-art.js src/screens/_scripts-3.html index.html sw.js tools/verify-cld-practice.js tools/verify-cld-loopback.js tools/mutate-cld.js
git commit -m "feat(cld): cld-art.js — the procedural art module (pure, no-DOM no-op), with the Hunger mood ladder"
```

---

### Task 2: The seam and the per-penguin model

**Files:**
- Modify: `js/games/cld.js`
  - the pose table and render seam (~1069–1316): rewrite `cldRenderPenguin`; **delete** `cldPose`, `cldPaintProcedural` and `cldPaintBody`
  - Stage-4 constants (near `CLD_BARK_MS`, ~1006): the new model constants
  - `cldBuildModel` (~1871), `cldFloeModel` (~1922) and `cldArenaModel` (~3158)
  - `cldDraw`'s penguin loop (~1628–1643) and the dive ghost (~1654), `cldDrawHungerBubble` (~1688), `cldShowResult`'s art call (~2575), and `cldHowtoDrawCast` (~2888)
  - `cldPrLoad` (~3043): a floe id
- Modify: `tools/verify-cld-practice.js` — section D's renamed fields, and new section N
- Modify: `tools/verify-cld-loopback.js` — the stale `cldPaintBody` comment (~126); any `state`/`facing`/`hungry` read
- Modify: `tools/mutate-cld.js` — five mutants
- Modify: `docs/game-identities/cld.md` — T7b § The floe prose (the brows placeholder → the ladder)

**Interfaces:**
- Consumes: `CldArt.penguin`, `CldArt.posePars`, `CldArt.moodPars` (Task 1).
- Produces:
  - `cldArt() → CldArt | null`
  - `cldRenderPenguin(ctx, pose, colourIdx, x, y, r, opts)`. `opts`: `{ t, look, power, vel, k, outward, expr, hunger, seed, splat, me, second, dim, ring, head, fish, px, reduced, tint }`. `ring` is off unless `true`. `tint` overrides the owner's colour. The legacy pose name `'lean'` maps to `'aim'`.
  - `cldSeedOf(id) → int`
  - `cldModelVel(tl, tMs, id) → {x,y}`, `cldModelSquash(tl, tMs, id) → k | null`, `cldModelSnowballs(tl, tMs) → [{ from, to, k }]`, `cldModelGone(tl, tMs) → [bergId]`. All pure.
  - A model penguin: `{ id, ownerIdx, x, y, drowned, plug, pose, look, power, vel, k, outward, seed, hunger, me, ringDark, dim, selected, splat }`. `hungry` and `state`/`facing` are gone.
  - Model top level adds `snowballs`, `phase`, `meMarker`, `winnerIdx`, `floeKey`, `floeSeed`.
  - `ui` for `cldBuildModel` adds `timeline`, `winnerIdx`, `splat` (a map id → 0..1), `floeKey` and `floeSeed`.
  - Constants: `CLD_SLIDE_POSE_V` 40, `CLD_SQUASH_MS` 240, `CLD_SQUASH_MIN_V` (`0.12 × CLD_V_MAX`), `CLD_PLUNGE_MS` 500.

- [ ] **Step 1: Update section D's field names, and write section N (failing)**

In `tools/verify-cld-practice.js` § D (~296–345), rename the reads:
- `m.penguins[0].facing` → `m.penguins[0].look`. The label stays "the armed penguin faces along its aim".
- `[m.penguins[2].state, m.penguins[2].dim]` → `[m.penguins[2].pose, m.penguins[2].dim]`.
- `hm.penguins.map(p => p.hungry)` → `hm.penguins.map(p => p.hunger)`, with expected values `[1, 1, 0]` (aiming, `cldSlideNo` 4) and `[0, 0, 0]` (resolving). Relabel them "…every Standing penguin is at Hunger level 1, a plug at 0" and "while the 4th Slide plays out nobody is hungry yet".
- The bubble check's model map: `hunger: p.drowned ? 0 : 1` in place of `hungry: !p.drowned`.

Then `grep -n "\.state\b\|\.facing\b\|\.hungry\b\|'lean'" tools/verify-cld-practice.js tools/verify-cld-loopback.js` and apply the same renames anywhere else, with `'lean'` → `'aim'`.

Add these helpers at top level, above section M:

```js
function mkView(w, h, S_) {
  const s = S_ || S;
  const box = s.document.createElement('div'); box.clientWidth = w || 320; box.clientHeight = h || 320;
  const cv = s.document.createElement('canvas'); box.appendChild(cv);
  const v = vm.runInContext('cldMakeView', s)(cv); vm.runInContext('cldResize', s)(v);
  return v;
}
// Every CldArt.penguin call must happen INSIDE cldRenderPenguin — the seam rule,
// checked by call depth rather than by trusting the call sites.
function seamSpy() {
  const A = S.window.CldArt, real = A.penguin;
  const log = { inside: 0, outside: 0, opts: [] };
  S.__seam = { depth: 0, real: RUN('cldRenderPenguin') };
  RUN('cldRenderPenguin = function () { __seam.depth++; try { return __seam.real.apply(null, arguments); } finally { __seam.depth--; } }');
  A.penguin = function (c, o) {
    if (S.__seam.depth > 0) log.inside++; else log.outside++;
    log.opts.push(o);
    return real.apply(this, arguments);
  };
  log.restore = () => { A.penguin = real; RUN('cldRenderPenguin = __seam.real'); };
  return log;
}
```

Add section N after section M:

```js
// ═══════════════════════════════════════════════════════════════════════════
// N. The seam and the per-penguin model (fun-pass spec § 4.1–4.2)
// ═══════════════════════════════════════════════════════════════════════════
if (!TUNE) {
  section('N. The seam and the per-penguin model');
  const BM = RUN('cldBuildModel');
  const pen2 = (id, o, x, y, ex) => Object.assign({ id, ownerIdx: o, x, y, drowned: false, plug: false }, ex || {});
  // 20 Hz samples: one every 50 ms. Two bodies, 0-0 then 1-0.
  const tl = { bodyIds: ['0-0', '1-0'],
    samples: [[100, 180, 260, 180], [110, 180, 255, 180], [120, 180, 250, 180], [121, 180, 250, 180], [121, 180, 250, 180]],
    events: [{ t: 60,  type: 'collision', a: '0-0', b: '1-0', x: 180, y: 180, speed: 150 },
             { t: 120, type: 'shatter', id: 'b1', x: 180, y: 20 },
             { t: 150, type: 'landing', x: 200, y: 120, from: { x: 40, y: 180 } }],
    aftermath: [], durationMs: 200 };
  const bergs = [{ id: 'b1', x: 180, y: 20, r: 16, hits: 0, angle: 0 }, { id: 'b2', x: 180, y: 340, r: 16, hits: 2, angle: 1 }];
  const src = (pens, slideNo) => ({ penguins: pens, bergs, radius: 170, iceBreaker: 2, ice: 'slush', slideNo: slideNo === undefined ? 5 : slideNo });
  const pens = () => [pen2('0-0', 0, 110, 180), pen2('1-0', 1, 255, 180)];
  const ui = (t, ex) => Object.assign({ meIdx: 0, phase: 'resolving', playbackT: t, aims: [], timeline: tl, clock: 0 }, ex || {});

  let m = BM(src(pens()), ui(25));
  check('vel comes from the bracketing samples (units/s)', [m.penguins[0].vel.x, m.penguins[1].vel.x], [200, -100]);
  check('fast → a belly-slide', m.penguins[0].pose, 'slide');
  m = BM(src(pens()), ui(70));
  check('a bump just now → squash, k running through it',
        [m.penguins[0].pose, near(m.penguins[0].k, 10 / G('CLD_SQUASH_MS'))], ['squash', true]);
  m = BM(src(pens()), ui(320));
  check('at rest → idle, and still → no look (the art glances about)', [m.penguins[0].pose, m.penguins[0].look], ['idle', null]);

  check('a Snowball in flight, k = t / arrival', BM(src(pens()), ui(75)).snowballs,
        [{ from: { x: 40, y: 180 }, to: { x: 200, y: 120 }, k: 0.5 }]);
  check('…and gone once it has landed', BM(src(pens()), ui(150)).snowballs, []);
  check('a chunk is drawn until its shatter beat', BM(src(pens()), ui(110)).bergs.map(b => b.id), ['b1', 'b2']);
  check('…and not after it', BM(src(pens()), ui(120)).bergs.map(b => b.id), ['b2']);
  check('aiming: no velocities, no flights, every chunk (a stale timeline is ignored)',
        (() => { const a = BM(src(pens()), ui(75, { phase: 'aiming' })); return [a.penguins[0].vel, a.snowballs.length, a.bergs.length]; })(),
        [{ x: 0, y: 0 }, 0, 2]);

  // Review Focus 1 — a penguin that went in THIS Slide is in the water from its seat beat.
  const inPens = ex => [pen2('0-0', 0, 110, 180), pen2('1-0', 1, 255, 180, ex)];
  m = BM(src(inPens({ plungedThisSlide: true })), ui(25));
  check('frozen at the lip → plunge at k 0, never a belly-slide', [m.penguins[1].pose, m.penguins[1].k], ['plunge', 0]);
  m = BM(src(inPens({ seatT: 100 })), ui(150));
  check('seated this Slide → plunge, k through the tip-over', [m.penguins[1].pose, near(m.penguins[1].k, 50 / G('CLD_PLUNGE_MS'))], ['plunge', true]);
  m = BM(src(inPens({ seatT: 100 })), ui(100 + G('CLD_PLUNGE_MS') + 50));
  check('…then a plug: bob, in the water, no mood',
        [m.penguins[1].pose, m.penguins[1].drowned, m.penguins[1].plug, m.penguins[1].hunger], ['bob', true, true, 0]);

  // Review Focus 2 — the level you aim under is the level you wear for the whole replay.
  const lv = (slideNo, phase) => BM(src(pens(), slideNo), ui(75, { phase })).penguins[0].hunger;
  ok('the mood never changes mid-Slide (aiming Slide s = its replay, s = 0…12)',
     Array.from({ length: 13 }, (_, s) => lv(s, 'aiming') === lv(s + 1, 'resolving')).every(Boolean));
  check('Hunger level per penguin (slideNo 5 resolving → level 1)', BM(src(pens()), ui(75)).penguins.map(p => p.hunger), [1, 1]);

  // Aiming poses.
  m = BM(src(pens(), 0), { meIdx: 0, phase: 'aiming', aims: [], live: { penguinId: '0-0', dx: 0, dy: -1, power: 0.8 }, clock: 0 });
  check('a live drag → aim, with its power and look',
        [m.penguins[0].pose, m.penguins[0].power, near(m.penguins[0].look, -Math.PI / 2)], ['aim', 0.8, true]);
  m = BM(src(pens(), 0), { meIdx: 0, phase: 'aiming', aims: [], winnerIdx: 1, clock: 0 });
  check('the winner jumps', m.penguins.map(p => p.pose), ['idle', 'win']);
  check('Slide 1, nothing aimed → the "me" marker', m.meMarker, true);
  check('…gone once I aim', BM(src(pens(), 0), { meIdx: 0, phase: 'aiming', aims: [{ penguinId: '0-0', dx: 1, dy: 0, power: 0.5 }], clock: 0 }).meMarker, false);
  check('…and after Slide 1', BM(src(pens(), 1), { meIdx: 0, phase: 'aiming', aims: [], clock: 0 }).meMarker, false);
  check('seeds are stable per penguin', [RUN('cldSeedOf')('0-0'), RUN('cldSeedOf')('2-1')], [0, 13]);

  // The seam: every penguin pixel goes through cldRenderPenguin.
  SET('cldPenguins', [pen2('0-0', 0, 140, 180), pen2('1-0', 1, 220, 180), pen2('2-0', 2, 180, 20, { drowned: true, plug: true, angle: -Math.PI / 2 })]);
  SET('cldBergs', []); SET('cldFloeRadius', 170); SET('cldPhase', 'aiming'); SET('cldMyAims', []);
  SET('cldDragging', false); SET('cldMySnowball', null); SET('cldMyMode', 'throw');
  const v = mkView();
  const spy = seamSpy();
  RUN('cldDraw')(v, RUN('cldFloeModel()'));
  check('the floe: three penguins, all through the seam', [spy.inside, spy.outside], [3, 0]);
  SET('cldPlayerNames', ['Ada', 'Bo', 'Cy']);
  RUN('cldShowResult')({ winnerIdx: 1, matchOver: false });
  ok('the result art goes through the seam too', spy.inside >= 4 && spy.outside === 0, JSON.stringify([spy.inside, spy.outside]));
  spy.restore();

  // Review Focus 4 — cld.js with cld-art.js missing never throws.
  const S2 = freshSandbox(); vm.createContext(S2);
  vm.runInContext(fs.readFileSync(PHYS, 'utf8'), S2, { filename: PHYS });
  vm.runInContext(fs.readFileSync(GAME, 'utf8'), S2, { filename: GAME });     // NO cld-art.js
  let noArtErr = null;
  try {
    const v2 = mkView(320, 320, S2);
    vm.runInContext(`cldPenguins = [{ id: '0-0', ownerIdx: 0, x: 180, y: 180, drowned: false }];
      cldBergs = []; cldFloeRadius = 170; cldPlayerNames = ['A', 'B'];`, S2);
    S2.__v = v2;
    vm.runInContext(`(() => { const m = cldFloeModel(); cldDraw(__v, m);
      cldRenderPenguin(__v.ctx, 'idle', 0, 180, 180, 11, {});
      cldShowResult({ winnerIdx: 0, matchOver: false }); })()`, S2);
  } catch (e) { noArtErr = e; }
  ok('cld.js with cld-art.js missing draws nothing and never throws', noArtErr === null, noArtErr && noArtErr.stack);
  ok('…and cldArt() says so', vm.runInContext('cldArt()', S2) === null);
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node tools/verify-cld-practice.js`
Expected: FAIL, with section D's renamed fields undefined and section N failing (`cldModelVel`, `cldSeedOf`, `CLD_SQUASH_MS` not defined).

- [ ] **Step 3: Rewrite the seam**

Replace the whole block from the `THE POSE TABLE` banner (~1069) through the end of `cldPaintBody` (~1316) with:

```js
// ═══════════════════════════════════════════════════════════════════════════
// THE RENDER SEAM (§10, §17 deviation 3; SW v246 — fun-pass spec § 4.1)
//
//   cldRenderPenguin(ctx, pose, colourIdx, x, y, r, opts) → undefined
//
// Every pixel of every penguin, in play and in chrome alike, goes through here
// and on to CldArt.penguin (js/games/cld-art.js). The poses, faces and moods
// live in the art module; this maps the game's colours and options onto it.
//
// `opts`: { t, look, power, vel, k, outward, expr, hunger, seed, splat, me,
//           second, dim, ring, head, fish, px, reduced, tint }
//   look   — radians the penguin faces; null lets an idle penguin glance about
//   hunger — the Hunger level (0 when Drowned): the mood over its face
//   ring   — the owner ring on the ice; off unless true (chrome leaves it off)
//   second — Peck Off's second penguin: same hue, darker ring. NEVER a second
//            hue, which would read as two more players.
//   tint   — a hex that overrides the owner's colour (the tally's neutral heads)
// ═══════════════════════════════════════════════════════════════════════════
const CLD_POSE_ALIAS = { lean: 'aim' };     // the pre-v246 name for the wind-up

// The art module, or null when cld-art.js never loaded (a rules-only harness,
// a failed fetch). Every caller treats null as "draw nothing".
function cldArt() { return (typeof window !== 'undefined' && window.CldArt) || null; }

function cldRenderPenguin(ctx, pose, colourIdx, x, y, r, opts) {
  if (!ctx) return;
  const o = opts || {};
  const p = CLD_POSE_ALIAS[pose] || pose;
  // A future skin's raster art, if one is ever built. cldSkinArt stays an empty
  // object — there is no core art pack — so this branch never fires. It exists
  // only so a skin CAN override a pose without a render-seam rewrite (§10).
  const skinUrl = (typeof assetFace === 'function') && assetFace('cld', p);
  if (skinUrl && cldSkinArt[p]) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(typeof o.look === 'number' ? o.look : 0);
    ctx.drawImage(cldSkinArt[p], -r, -r, r * 2, r * 2);
    ctx.restore();
    return;
  }
  const A = cldArt();
  if (!A) return;
  A.penguin(ctx, {
    x: x, y: y, r: r, tint: o.tint || cldTintOf(colourIdx), pose: p,
    t: o.t || 0, look: typeof o.look === 'number' ? o.look : null,
    power: o.power || 0, vel: o.vel || null, k: o.k || 0, outward: o.outward || 0,
    expr: o.expr || null, hunger: o.hunger || 0, seed: o.seed || 0, splat: o.splat || 0,
    me: !!o.me, second: !!o.second, dim: !!o.dim, ring: o.ring === true,
    head: !!o.head, fish: !!o.fish, px: o.px || 2, reduced: !!o.reduced,
  });
}
```

Keep `cldTintOf`/`cldMix`/`cldLighten`/`cldDarken` (above the deleted block) and the `cldSkinArt` declaration wherever it lives. Then run `grep -n "cldPose\|cldPaintProcedural\|cldPaintBody" js/games/cld.js`. It must return nothing but comments; delete or reword those comments.

- [ ] **Step 4: Add the model constants and helpers**

Near `CLD_BARK_MS` (~1006), add:

```js
// ── The render model's poses (SW v246, fun-pass spec § 4.2) ─────────────────
const CLD_SLIDE_POSE_V = 40;                // units/s — faster than this reads as a belly-slide
const CLD_SQUASH_MS    = 240;               // a bump's squash, playback ms
const CLD_SQUASH_MIN_V = 0.12 * CLD_V_MAX;  // a softer bump doesn't squash
const CLD_PLUNGE_MS    = 500;               // the tip-over at a seat, playback ms
```

Directly above `cldBuildModel`, add:

```js
// A stable small integer per penguin — desyncs blinks, glances and huffs.
function cldSeedOf(id) {
  const parts = String(id).split('-').map(Number);
  return (parts[0] || 0) * 3 + (parts[1] || 0) * 7;
}

// PURE. Velocity from the two samples bracketing tMs (units/s), or zero.
function cldModelVel(tl, tMs, id) {
  if (!tl || !tl.samples || !tl.samples.length) return { x: 0, y: 0 };
  const k = (tl.bodyIds || []).indexOf(id);
  if (k < 0) return { x: 0, y: 0 };
  const n = tl.samples.length;
  const i0 = Math.min(Math.floor(tMs * CLD_SAMPLE_HZ / 1000), n - 1), i1 = Math.min(i0 + 1, n - 1);
  if (i0 === i1) return { x: 0, y: 0 };
  const s0 = tl.samples[i0], s1 = tl.samples[i1];
  return { x: (s1[k * 2] - s0[k * 2]) * CLD_SAMPLE_HZ, y: (s1[k * 2 + 1] - s0[k * 2 + 1]) * CLD_SAMPLE_HZ };
}

// PURE. How far through its squash a penguin is (0..1), or null: the latest
// hard-enough bump it took inside the last CLD_SQUASH_MS.
function cldModelSquash(tl, tMs, id) {
  if (!tl) return null;
  let at = null;
  (tl.events || []).forEach(e => {
    if (e.t > tMs || tMs - e.t >= CLD_SQUASH_MS || (e.speed || 0) < CLD_SQUASH_MIN_V) return;
    const mine = (e.type === 'collision' && (e.a === id || e.b === id)) || (e.type === 'rebound' && e.id === id);
    if (mine && (at === null || e.t > at)) at = e.t;
  });
  return at === null ? null : (tMs - at) / CLD_SQUASH_MS;
}

// PURE. Snowballs still in the air. Every throw leaves at t = 0 and lands at its
// `landing` event's t (cldBuildSlideInputs schedules it), and `from` is the
// thrower's spot — all already on the wire, so no packet change (spec § 4.4).
function cldModelSnowballs(tl, tMs) {
  if (!tl) return [];
  return (tl.events || []).filter(e => e.type === 'landing' && e.from && e.t > 0 && tMs < e.t)
    .map(e => ({ from: { x: e.from.x, y: e.from.y }, to: { x: e.x, y: e.y }, k: Math.max(0, tMs / e.t) }));
}

// PURE. The chunks that have already shattered this Slide.
function cldModelGone(tl, tMs) {
  if (!tl) return [];
  return (tl.events || []).filter(e => e.type === 'shatter' && e.t <= tMs).map(e => e.id);
}
```

- [ ] **Step 5: Rewrite `cldBuildModel`**

Replace the function body (~1871–1903) with:

```js
// PURE over its arguments. Every pose, look and mood decision is made here, so
// the renderer has nothing left to decide. Nothing in it is sent — every field
// is derived from the timeline (ui.timeline, while a Slide plays) or from input.
function cldBuildModel(src, ui) {
  const aims = ui.aims || [];
  // Hunger. While a Slide plays out the count has already moved on, so the
  // Slide on screen is the one before it — the level you aim under is the level
  // you wear for the whole replay (spec § 4.2: a level up shows at the beat).
  const hunger = cldHungerLevel(ui.phase === 'resolving' ? (src.slideNo || 0) - 1 : src.slideNo);
  const tl  = ui.phase === 'resolving' ? (ui.timeline || null) : null;
  const tMs = ui.playbackT || 0;
  const aimFor = id => aims.find(a => a.penguinId === id) || null;
  const toCentre = (x, y) => Math.atan2(CLD_H / 2 - y, CLD_W / 2 - x);
  const penguins = src.penguins.map(p => {
    const mine = p.ownerIdx === ui.meIdx;
    const vel  = cldModelVel(tl, tMs, p.id);
    // A penguin that went in THIS Slide is still `drowned: false` in the live
    // record until the post-state lands — but from its seat beat it is a plug.
    const seated  = !!tl && p.seatT !== undefined;
    const inWater = !!p.drowned || seated;
    let pose = 'idle', look = null, power = 0, k = 0, outward = 0;
    if (tl && p.plungedThisSlide) {
      pose = 'plunge';
      outward = Math.cos(Math.atan2(p.y - CLD_H / 2, p.x - CLD_W / 2));
    } else if (inWater) {
      look = toCentre(p.x, p.y);            // a Drowned penguin faces the ice it wants back
      if (seated && tMs - p.seatT < CLD_PLUNGE_MS) {
        pose = 'plunge'; k = (tMs - p.seatT) / CLD_PLUNGE_MS;
        outward = Math.cos(Math.atan2(p.y - CLD_H / 2, p.x - CLD_W / 2));
      } else if (mine && ui.snowball) pose = 'throw';
      else pose = (p.plug || seated) ? 'bob' : 'back';
    } else if (ui.live && ui.live.penguinId === p.id) {
      pose = 'aim'; power = ui.live.power; look = Math.atan2(ui.live.dy, ui.live.dx);
    } else if (tl) {
      const sq = cldModelSquash(tl, tMs, p.id), sp = Math.hypot(vel.x, vel.y);
      if (sq !== null)                 { pose = 'squash'; k = sq; }
      else if (sp > CLD_SLIDE_POSE_V)  pose = 'slide';
      else if (sp > 1)                 look = Math.atan2(vel.y, vel.x);
    } else if (ui.winnerIdx === p.ownerIdx) {
      pose = 'win';
    } else {
      const a = aimFor(p.id);
      if (a) look = Math.atan2(a.dy, a.dx);
    }
    return { id: p.id, ownerIdx: p.ownerIdx, x: p.x, y: p.y,
             drowned: inWater, plug: !!p.plug || seated,
             pose: pose, look: look, power: power, vel: vel, k: k, outward: outward,
             seed: cldSeedOf(p.id), hunger: inWater ? 0 : hunger,
             me: mine, ringDark: cldIsSecondPenguin(p),
             dim: !!(inWater && !(p.plug || seated)),       // Plugged reads solid, Knocked back reads faded
             selected: ui.selectedId === p.id,
             splat: (ui.splat && ui.splat[p.id]) || 0 };
  });
  const gone = cldModelGone(tl, tMs);
  return { radius: src.radius, bergs: src.bergs.filter(b => gone.indexOf(b.id) < 0), iceBreaker: src.iceBreaker,
           // Reach goes as v² — decel is the base one — so the guide scales by mult².
           reach: cldFullSlideDist(src.ice) * Math.pow(CLD_HUNGER_STEP, 2 * hunger), penguins: penguins, aims: aims,
           hunger: hunger, hungerBeat: !!ui.hungerBeat,
           assist: !!ui.assist, dive: ui.dive || null, snowball: ui.snowball || null, rivalThrows: ui.rivalThrows || [],
           snowballs: cldModelSnowballs(tl, tMs), phase: ui.phase || 'aiming',
           meMarker: ui.phase === 'aiming' && (src.slideNo || 0) === 0 && !aims.some(a => !a.rival),
           winnerIdx: typeof ui.winnerIdx === 'number' ? ui.winnerIdx : -1,
           floeKey: ui.floeKey || '', floeSeed: ui.floeSeed || 1,
           clock: ui.clock || 0 };
}
```

- [ ] **Step 6: Feed the new `ui` fields from both models**

In `cldFloeModel` (~1929), add to the `cldBuildModel(…, { … })` object:

```js
    timeline: cldTimeline, winnerIdx: -1, splat: cldView ? cldView.splat : null,
    floeKey: 'f:' + cldFloeOffNo + (cldInBath ? 'b' : ''), floeSeed: cldFloeOffNo * 31 + (cldInBath ? 7 : 1),
```

In `cldPrLoad` (~3043), number every fresh Arena floe so Start over and Practice again start clean. Add this before the `cldPrUi = {` assignment:

```js
  const floeId = ((cldPrUi && cldPrUi.floeId) || 0) + 1;
```

and add `floeId: floeId,` to the new `cldPrUi` object.

In `cldArenaModel` (~3172), add to its `cldBuildModel` `ui` object:

```js
      timeline: cldTimeline, winnerIdx: (u.end && !u.end.draw) ? u.end.winner : -1,
      splat: cldPrView ? cldPrView.splat : null,
      floeKey: 'pr' + (u.floeId || 0) + ':' + cldFloeOffNo + (cldInBath ? 'b' : ''),
      floeSeed: CLD_PR_DRILLS[u.drill].ringSeed * 101 + (u.floeId || 0),
```

(`cldView.splat`/`cldPrView.splat` arrive in Task 3. Until then they read `undefined`, which the model treats as no splat.)

- [ ] **Step 7: Move every call site onto the new seam**

In `cldDraw`'s penguin loop (~1637), replace the `cldRenderPenguin(…)` call with:

```js
    cldRenderPenguin(ctx, p.pose, p.ownerIdx, p.x, p.y, CLD_PENGUIN_R, {
      t: m.clock, look: p.look, power: p.power, vel: p.vel, k: p.k, outward: p.outward,
      hunger: p.hunger, seed: p.seed, splat: p.splat, ring: true, me: p.me, second: p.ringDark,
      dim: p.dim, px: view.scale, reduced: cldReducedMotion(),
    });
```

Change the Hunger bubble line to `if (m.hungerBeat) m.penguins.forEach(p => { if (p.hunger > 0) cldDrawHungerBubble(ctx, p.x, p.y); });`. In `cldDrawHungerBubble`, raise the bubble above the upright body: `by = y - r * 3.4`, and move the tail dot to `(x + r * 0.45, y - r * 2.45)`.

Dive ghost (~1654): `{ t: m.clock, ring: true, me: true, look: Math.PI / 2, reduced: cldReducedMotion() }`.

`cldShowResult` (~2575): `cldRenderPenguin(g, winner >= 0 ? 'win' : 'bob', winner >= 0 ? winner : 0, 48, 78, 26, { t: 0.3, look: Math.PI / 2, fish: winner >= 0 });`. Task 6 restyles it; this keeps it drawing.

`cldHowtoDrawCast` (~2888): `{ t: t, ring: true, look: Math.PI / 2, reduced: cldReducedMotion() }`. The `'lean'` tile still draws, through the alias.

In `tools/verify-cld-loopback.js` (~126), reword the stale comment to say the seam draws through `CldArt.penguin`, which builds its body as a Path2D.

- [ ] **Step 8: Update the identity doc's floe prose (paired)**

In `docs/game-identities/cld.md` T7b § The floe, replace the sentence beginning "Every few Slides the floe floats **HUNGRY!**…" through "(`2026-09-29-cld-fun-pass-design.md` § 4.2)." with:

```markdown
Every few Slides the floe floats **HUNGRY!** (with a 🐟❗ bubble over every Standing penguin) — Hunger,
SW v245. Each Hunger level also shows on the penguins' faces (SW v246): a frown now and then, then all
the time, then a huff and a stamp, then angry, then fire in the eyes, then a glow in the player's colour
that grows until the Floe-Off ends. A Drowned penguin keeps its own face.
```

- [ ] **Step 9: Add the mutants**

Append to `M` in `tools/mutate-cld.js`:

```js
// ── SW v246: the seam and the model (verify-cld-practice.js) ─────────────────
['seam-bypassed', 'game', [[
  '    cldRenderPenguin(ctx, p.pose, p.ownerIdx, p.x, p.y, CLD_PENGUIN_R, {',
  '    cldArt().penguin(ctx, { x: p.x, y: p.y, r: CLD_PENGUIN_R, tint: cldTintOf(p.ownerIdx), pose: p.pose }); if (0) cldRenderPenguin(ctx, p.pose, p.ownerIdx, p.x, p.y, CLD_PENGUIN_R, {']], 'practice'],
['drowned-stay-hungry', 'game', [[
  '             seed: cldSeedOf(p.id), hunger: inWater ? 0 : hunger,',
  '             seed: cldSeedOf(p.id), hunger: hunger,']], 'practice'],
['seated-still-standing', 'game', [[
  '    const seated  = !!tl && p.seatT !== undefined;', '    const seated  = false;']], 'practice'],
['snowball-flies-backwards', 'game', [[
  'to: { x: e.x, y: e.y }, k: Math.max(0, tMs / e.t) }));', 'to: { x: e.x, y: e.y }, k: Math.max(0, 1 - tMs / e.t) }));']], 'practice'],
['shattered-chunk-lingers', 'game', [[
  "  return (tl.events || []).filter(e => e.type === 'shatter' && e.t <= tMs).map(e => e.id);", '  return [];']], 'practice'],
```

- [ ] **Step 10: Run everything**

Run: `node tools/verify-cld-practice.js && node tools/verify-cld-loopback.js && node tools/verify-cld-loop.js && node tools/verify-cld-physics.js && node tools/mutate-cld.js && node tools/verify-identity-docs.js`
Expected: all pass, and mutate is 54/54. The live floe now draws the new penguins over the old water, floe and chunks. Task 3 replaces those.

- [ ] **Step 11: Commit**

```bash
git add js/games/cld.js tools/verify-cld-practice.js tools/verify-cld-loopback.js tools/mutate-cld.js docs/game-identities/cld.md
git commit -m "feat(cld): the seam draws through CldArt; the model carries pose, look, vel, k and a per-penguin Hunger level"
```

---

### Task 3: The world — the scene composer, the floe's story, particles and barks

**Files:**
- Modify: `js/games/cld.js`
  - `cldMakeView` (~1325): view-owned `fx`, `floe`, `trails`, `splat`, `wasResolving`
  - new `cldViewStep`, `cldFloeQ`, `cldFxEvent`, `cldDrawModelPenguin` (next to `cldDraw`)
  - `cldDraw` (~1553) rewritten as the composer; **delete** `cldDrawBerg` (~1727)
  - `cldPlayEvent` (~2381) and `cldPlayAftermath` (~2418): the `fx` hook and Boing!
  - `CLD_LIVE_HOOKS` (~2734), the Arena's hooks in `cldPrTick` (~3073), `cldFloatText` (~2736), `cldPrFloat` (~3115)
  - `cldLoop` (~1509) and `cldPrLoop` (~3359): call `cldViewStep`
  - constants: `CLD_BOING`, `CLD_GROOVE_MIN_V`, `CLD_GROOVE_W`, `CLD_SPLAT_FADE_S`, `CLD_FLOE_Q`, `CLD_FLOE_PX_MAX`, `CLD_FX_MIN_POWER`
- Modify: `css/styles.css` — `.cld-bark` (after the `.cld-pr-bubble` rules, ~2730)
- Modify: `docs/game-identities/cld.md` — a new T7b copy block for Boing!
- Modify: `tools/verify-cld-practice.js` — section O, and one line in section N
- Modify: `tools/mutate-cld.js` — three mutants

**Interfaces:**
- Consumes: `CldArt.water/scenery/floe/groove/berg/snowball/makeFloe/setFloeRadius/floeMark/makeFx` (Task 1); the model's `phase`, `pose`, `vel`, `snowballs`, `floeKey`, `floeSeed` (Task 2).
- Produces:
  - `cldViewStep(view, dtS, m)`: advances particles and splats, keeps the floe surface in step with `m.floeKey`/`m.radius`, gathers trails, and stamps grooves when a Slide ends.
  - `cldFxEvent(view, e)`: routes a timeline event or an aftermath beat to that view's particles, splats and floe marks.
  - `hooks.fx(e)` (optional in `cldStepPlayback`'s `hooks`) and `hooks.bark(text?)`, where `text` defaults to a random plunge line.
  - View fields: `fx`, `floe`, `floeKey`, `trails` (`{ id: [[{x,y}…], …] }`), `splat` (`{ id: 0..1 }`), `wasResolving`.
  - `cldDraw`'s layer order (spec § 4.3): water → scenery → ground fx → floe → live grooves → the aim layer → chunks and penguins y-sorted → snowballs → air fx → markers → mini-map. The aim layer is `cldDrawAimLayer(view, m)`, which Task 4 rewrites.

- [ ] **Step 1: Write section O (failing)**

In section N's no-art test, add a `cldViewStep` call so the missing-art path covers it too. Change `const m = cldFloeModel(); cldDraw(__v, m);` to `const m = cldFloeModel(); cldViewStep(__v, 0.016, m); cldDraw(__v, m);`.

Add after section N:

```js
// ═══════════════════════════════════════════════════════════════════════════
// O. The world: the composer, the floe's story, particles (spec § 4.3–4.4)
// ═══════════════════════════════════════════════════════════════════════════
if (!TUNE) {
  section('O. The world');
  const A = S.window.CldArt;
  const step = RUN('cldViewStep'), fxEv = RUN('cldFxEvent');
  const base = ex => Object.assign({ radius: 170, floeKey: 'f:1', floeSeed: 32, phase: 'aiming', penguins: [], clock: 0 }, ex || {});

  // The floe surface: one per floe; The Thaw repaints it, marks kept.
  const v = mkView();
  step(v, 0.016, base());
  const f1 = v.floe;
  ok('a floe surface is made for the view', !!f1 && f1.radius === 170);
  const slider = x => ({ id: '0-0', pose: 'slide', drowned: false, vel: { x: 200, y: 0 }, x: x, y: 180 });
  step(v, 0.016, base({ phase: 'resolving', penguins: [slider(100)] }));
  step(v, 0.016, base({ phase: 'resolving', penguins: [slider(120)] }));
  step(v, 0.016, base({ phase: 'resolving', penguins: [slider(140)] }));
  check('a belly-slide gathers one run while the Slide plays', v.trails['0-0'].map(r => r.length), [3]);
  step(v, 0.016, base());
  check('…and is cut into the ice when it ends', [f1.marks.length, f1.marks[0].kind, f1.marks[0].a.length], [1, 'groove', 3]);
  ok('…then the live trails clear', Object.keys(v.trails).length === 0);
  fxEv(v, { type: 'landing', x: 200, y: 200, hit: null });
  check('an open-ice Snowball splats the floe', f1.marks.length, 2);
  fxEv(v, { type: 'landing', x: 179, y: 400, hit: null });
  check('…but not a landing in the water', f1.marks.length, 2);
  // Review Focus 3 — the story survives The Thaw, and a new floe starts clean.
  step(v, 0.016, base({ radius: 160 }));
  check('The Thaw repaints the same surface and keeps its story', [v.floe === f1, f1.radius, f1.marks.length], [true, 160, 2]);
  step(v, 0.016, base({ floeKey: 'f:1b', radius: 90 }));
  check('an Ice Bath is a fresh floe', [v.floe !== f1, v.floe.marks.length, v.floe.radius], [true, 0, 90]);
  step(v, 0.016, base({ floeKey: 'f:2' }));
  check('…and so is the next Floe-Off', v.floe.marks.length, 0);

  // Splats on a penguin fade over CLD_SPLAT_FADE_S.
  fxEv(v, { type: 'landing', x: 150, y: 150, hit: 'penguin', id: '1-0' });
  check('a Snowball hit splats that penguin', v.splat['1-0'], 1);
  step(v, G('CLD_SPLAT_FADE_S') / 2, base({ floeKey: 'f:2' }));
  ok('…fading as time passes', near(v.splat['1-0'], 0.5, 1e-9));
  step(v, G('CLD_SPLAT_FADE_S'), base({ floeKey: 'f:2' }));
  ok('…and gone', !('1-0' in v.splat));

  // The fx hook: every event reaches the view — BEFORE the sound throttle.
  const seen = [], barks = [];
  const hooks = { sfx() {}, bark: t => barks.push(t || 'plunge-line'), fx: e => seen.push(e.type) };
  SET('cldPenguins', [{ id: '0-0', ownerIdx: 0, x: 180, y: 180 }]);
  SET('cldPlaybackT', 1000); SET('cldLastSfxT', 999);          // inside the throttle window
  [{ type: 'collision', a: '0-0', b: '1-0', x: 1, y: 1, speed: 5 },
   { type: 'rebound', id: '0-0', off: 'berg', x: 1, y: 1, speed: 5 },
   { type: 'seat', id: '0-0', x: 1, y: 1 }, { type: 'knockback', id: '0-0', x: 1, y: 1 },
   { type: 'shatter', id: 'b1', x: 1, y: 1 }, { type: 'landing', x: 1, y: 1, from: { x: 0, y: 0 } }]
    .forEach(e => RUN('cldPlayEvent')(Object.assign({ t: 0 }, e), hooks));
  check('every event type reaches hooks.fx, a soft or throttled bump included', seen,
        ['collision', 'rebound', 'seat', 'knockback', 'shatter', 'landing']);
  SET('cldLastSfxT', -1e9);
  RUN('cldPlayEvent')({ t: 0, type: 'rebound', id: '0-0', off: 'drowned', x: 1, y: 1, speed: 120 }, hooks);
  SET('cldLastSfxT', -1e9);            // clear the throttle again, or the chunk case never reaches its bark line
  RUN('cldPlayEvent')({ t: 0, type: 'rebound', id: '0-0', off: 'berg', x: 1, y: 1, speed: 120 }, { sfx() {}, bark: t => barks.push(t) });
  check('a bounce off a plug barks Boing! — a chunk doesn’t', barks, [G('CLD_BOING')]);
  let noFx = null;
  try { RUN('cldPlayEvent')({ t: 0, type: 'seat', id: '0-0', x: 1, y: 1 }, { sfx() {}, bark() {} }); } catch (e) { noFx = e; }
  ok('hooks without fx still work (the loopback’s hooks)', noFx === null, noFx && noFx.stack);

  // Reduced motion: the rings stay, nothing travels.
  const rm = S.window.matchMedia;
  S.window.matchMedia = () => ({ matches: true });
  const vr = mkView(); step(vr, 0.016, base());
  fxEv(vr, { type: 'seat', x: 180, y: 10 }); fxEv(vr, { type: 'collision', x: 180, y: 180, speed: 190 });
  check('reduced motion: a plunge leaves its rings, a bump nothing', vr.fx.count(), 2);
  S.window.matchMedia = rm;

  // Draw order (spec § 4.3): water, floe, then chunks and penguins y-sorted, then snowballs.
  const order = [], undo = [];
  ['water', 'floe', 'berg', 'penguin', 'snowball'].forEach(n => {
    const f = A[n];
    A[n] = function (c, o) { order.push([n, n === 'berg' || n === 'penguin' ? o.y : null]); return f.apply(this, arguments); };
    undo.push(() => { A[n] = f; });
  });
  const vd = mkView(); step(vd, 0.016, base());
  const md = RUN('cldBuildModel')({ penguins: [{ id: '0-0', ownerIdx: 0, x: 180, y: 250 }, { id: '1-0', ownerIdx: 1, x: 150, y: 120 }],
    bergs: [{ id: 'b1', x: 180, y: 20, r: 16, hits: 2, angle: 0 }, { id: 'b2', x: 180, y: 345, r: 16, hits: 2, angle: 1 }],
    radius: 170, iceBreaker: 2, ice: 'slush', slideNo: 1 },
    { meIdx: 0, phase: 'resolving', playbackT: 10, aims: [], clock: 0, floeKey: 'f:1', floeSeed: 32,
      timeline: { bodyIds: [], samples: [], aftermath: [], durationMs: 100,
                  events: [{ t: 90, type: 'landing', x: 200, y: 120, from: { x: 40, y: 180 } }] } });
  RUN('cldDraw')(vd, md);
  undo.forEach(u => u());
  const idx = n => order.findIndex(o => o[0] === n);
  const stand = order.filter(o => o[0] === 'berg' || o[0] === 'penguin');
  ok('water, then the floe, then the standing things, then snowballs',
     idx('water') < idx('floe') && idx('floe') < idx('berg') && idx('snowball') > order.lastIndexOf(stand[stand.length - 1]),
     JSON.stringify(order));
  ok('chunks and penguins are painted back to front (y ascending)',
     stand.every((o, i) => i === 0 || o[1] >= stand[i - 1][1]), JSON.stringify(stand));

  // The Arena's replay feeds ITS view, never the live floe's.
  RUN('cldInitCanvas()');
  const live = G('cldView');
  ok('the live view has its own particles', !!live && !!live.fx);
  const before = live.fx.count();
  RUN("cldPracticeStart(); cldPrLoad('headon')");
  for (let i = 0; i < 3; i++) {
    RUN('cldPrResolve')({ aims: [{ penguinId: '0-0', dx: -1, dy: 0, power: 1 }], dive: null, snowball: null });
    RUN('cldPrTick')(1e9);
  }
  check('three Arena Slides leave the live view’s particles alone', live.fx.count(), before);
  RUN('cldPracticeStop()');
}
```

(If `cldPracticeStart`/`cldPrLoad`/`cldPrResolve`/`cldPracticeStop` take other arguments in the current code, match section H3's existing calls. It already runs Arena rounds, so copy its setup lines rather than guessing.)

- [ ] **Step 2: Run it to verify it fails**

Run: `node tools/verify-cld-practice.js`
Expected: FAIL. `cldViewStep` and `cldFxEvent` are not defined, and the run may crash at section N's edited line. Both are expected.

- [ ] **Step 3: Constants, view fields and the view step**

Near the Task 2 constants, add:

```js
// ── The world (SW v246, fun-pass spec § 4.3–4.4) ───────────────────────────
const CLD_BOING        = 'Boing!';   // a bounce off a plug
const CLD_GROOVE_MIN_V = 45;         // units/s — a belly-slide this fast cuts a groove
const CLD_GROOVE_W     = 8;          // groove width, world units
const CLD_SPLAT_FADE_S = 3;          // a Snowball's splat on a penguin fades over this
const CLD_FLOE_Q       = 3;          // floe surface px per world unit…
const CLD_FLOE_PX_MAX  = 1200;       // …capped so a Roomy floe stays ≤ 1,200 px square
const CLD_FX_MIN_POWER = 0.12;       // a softer bump than this raises no puff
```

In `cldMakeView`, add to the returned object:

```js
           // View-owned art state (SW v246): each canvas has its own particles, floe
           // surface and trails, so the Arena can never paint on the live floe's.
           fx: cldArt() ? cldArt().makeFx() : null, floe: null, floeKey: null,
           trails: {}, splat: {}, wasResolving: false,
```

Above `cldDraw`, add:

```js
function cldFloeQ(radius) { return Math.min(CLD_FLOE_Q, (CLD_FLOE_PX_MAX - 4) / (2 * radius)); }

// One frame of the view's own art state — particles, splats, the floe surface
// and the belly-slide trails. Reads only the model; never the live globals.
function cldViewStep(view, dtS, m) {
  if (!view || !m) return;
  const A = cldArt(), reduced = cldReducedMotion();
  if (view.fx) { view.fx.setReduced(reduced); view.fx.step(dtS); }
  Object.keys(view.splat).forEach(id => {
    view.splat[id] = Math.max(0, view.splat[id] - dtS / CLD_SPLAT_FADE_S);
    if (!view.splat[id]) delete view.splat[id];
  });
  // A fresh surface per floe (a Floe-Off, an Ice Bath, an Arena restart); The
  // Thaw repaints the same one, its story replayed onto the smaller rim.
  if (A && m.radius) {
    if (!view.floe || view.floeKey !== m.floeKey) {
      view.floe = A.makeFloe(CLD_W / 2, CLD_H / 2, m.radius, m.floeSeed, cldFloeQ(m.radius));
      view.floeKey = m.floeKey; view.trails = {};
    } else if (view.floe.radius !== m.radius) {
      A.setFloeRadius(view.floe, m.radius);
    }
  }
  // Belly-slides cut grooves: gathered while the Slide plays, stamped when it ends.
  const resolving = m.phase === 'resolving';
  if (resolving) m.penguins.forEach(p => {
    const tr = view.trails[p.id] || (view.trails[p.id] = [[]]);
    const run = tr[tr.length - 1];
    if (!p.drowned && p.pose === 'slide' && Math.hypot(p.vel.x, p.vel.y) > CLD_GROOVE_MIN_V) {
      run.push({ x: p.x, y: p.y });
      if (view.fx && Math.random() < 0.7) view.fx.spray(p.x, p.y, p.vel.x, p.vel.y, 1);
    } else if (run.length) tr.push([]);
  });
  if (view.wasResolving && !resolving) {
    if (A && view.floe) Object.keys(view.trails).forEach(id =>
      view.trails[id].forEach(run => { if (run.length > 1) A.floeMark(view.floe, 'groove', run, CLD_GROOVE_W); }));
    view.trails = {};
  }
  view.wasResolving = resolving;
}

// A timeline event (or an aftermath beat) → this view's particles, splats and
// floe marks. Called through hooks.fx, so the live replay and the Arena each
// feed their OWN view. Reads only its arguments.
function cldFxEvent(view, e) {
  if (!view || !e) return;
  const fx = view.fx, pw = s => Math.min(1, (s || 0) / CLD_V_MAX);
  if (e.type === 'landing') {
    if (fx) fx.landing(e.x, e.y);
    if (e.hit === 'penguin' && e.id) view.splat[e.id] = 1;
    else if (!e.hit && view.floe && Math.hypot(e.x - CLD_W / 2, e.y - CLD_H / 2) < view.floe.radius) {
      const A = cldArt(); if (A) A.floeMark(view.floe, 'splat', { x: e.x, y: e.y });
    }
    return;
  }
  if (!fx) return;
  if (e.type === 'collision' && pw(e.speed) > CLD_FX_MIN_POWER) fx.puff(e.x, e.y, pw(e.speed));
  else if (e.type === 'rebound') fx.puff(e.x, e.y, e.off === 'drowned' ? Math.max(0.6, pw(e.speed)) : pw(e.speed));
  else if (e.type === 'seat' || e.type === 'thaw-drop') fx.splash(e.x, e.y, 1);
  else if (e.type === 'knockback') fx.splash(e.x, e.y, 0.6);
  else if (e.type === 'shatter') fx.shatter(e.x, e.y);
}
```

- [ ] **Step 4: The composer**

Replace `cldDraw` (~1553–1684) with the version below, and delete `cldDrawBerg`. `cldDrawAimLayer` and `cldDrawMarkers` start as moves of today's code. Task 4 rewrites both.

```js
function cldDraw(view, m) {
  if (!view || !view.ctx) return;
  const A = cldArt();
  if (!A) return;                                        // no art module → nothing to draw with
  const ctx = view.ctx, cx = CLD_W / 2, cy = CLD_H / 2, t = m.clock, reduced = cldReducedMotion();
  const R = m.radius || view.fitR || CLD_R_STD;

  ctx.clearRect(view.x, view.y, view.w, view.h);
  // 1. The Drink — across the whole VISIBLE region, wider than the world on a phone.
  A.water(ctx, view, t, cx, cy, R, reduced);
  A.scenery(ctx, view, t, cx, cy, R, reduced);
  if (view.fx) view.fx.draw(ctx, 'ground');
  if (m.radius) {
    // 2. The floe (painted once per floe) and this Slide's grooves still being cut.
    if (view.floe) A.floe(ctx, view.floe, t, reduced);
    Object.keys(view.trails || {}).forEach(id => view.trails[id].forEach(run => A.groove(ctx, run, CLD_GROOVE_W)));
    // 3. Marks on the ice and in the water, under everyone.
    cldDrawAimLayer(view, m);
    // 4. Everything that stands up, back to front — the slight 3D read.
    const objs = [];
    m.bergs.forEach(b => objs.push({ y: b.y, draw: () => A.berg(ctx, b, m.iceBreaker, t) }));
    m.penguins.forEach(p => objs.push({ y: p.y, draw: () => cldDrawModelPenguin(view, m, p) }));
    objs.sort((a, b) => a.y - b.y).forEach(o => o.draw());
    // 5. Snowballs in flight, then the air.
    m.snowballs.forEach(s => A.snowball(ctx, s.from, s.to, s.k, CLD_SNOWBALL_R * 0.7));
    if (view.fx) view.fx.draw(ctx, 'air');
    // 6. Reticles and markers, over everything in the world.
    cldDrawMarkers(view, m);
  }
  // 7. The mini-map, in screen space.
  if (view.cam && view.box && view.box.w && (view.cam.manual || view.cam.z > CLD_CAM_MAP_Z)) cldDrawMiniMap(view, m);
}

// One model penguin: Peck Off's selection ring, then the seam.
function cldDrawModelPenguin(view, m, p) {
  const ctx = view.ctx;
  if (p.selected) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 1, CLD_PENGUIN_R * 1.7, CLD_PENGUIN_R * 0.85, 0, 0, CLD_TAU); ctx.stroke();
    ctx.restore();
  }
  cldRenderPenguin(ctx, p.pose, p.ownerIdx, p.x, p.y, CLD_PENGUIN_R, {
    t: m.clock, look: p.look, power: p.power, vel: p.vel, k: p.k, outward: p.outward,
    hunger: p.hunger, seed: p.seed, splat: p.splat, ring: true, me: p.me, second: p.ringDark,
    dim: p.dim, px: view.scale, reduced: cldReducedMotion(),
  });
}
```

Make `cldDrawAimLayer(view, m)` hold today's aim-and-dive code unchanged: the `m.aims.forEach(a => cldDrawCue(ctx, m, a))` line and the dive-seats block. Make `cldDrawMarkers(view, m)` hold today's Hunger bubbles, rival-throw crosses and snowball crosshair. Both open with `const ctx = view.ctx;`. Keep the Task 2 bubble line (`p.hunger > 0`).

- [ ] **Step 5: The fx hook, Boing!, and the two hook sets**

In `cldPlayEvent` (~2381), make the first line of the function body `if (hooks.fx) hooks.fx(e);`. That puts it before every sound gate, because a particle is not a sound and the throttle protects the ear, not the eye. In the collision/rebound branch, directly after `hooks.sfx(e.type === 'rebound' ? 'rebound' : 'collide');`, add:

```js
    if (e.type === 'rebound' && e.off === 'drowned') hooks.bark(CLD_BOING);
```

In `cldPlayAftermath` (~2426), change the thaw-drop line to `if (b.type === 'thaw-drop') { if (hooks.fx) hooks.fx(b); hooks.sfx('plunge'); hooks.bark(); return; }`.

`CLD_LIVE_HOOKS` (~2734) becomes:

```js
const CLD_LIVE_HOOKS = { sfx: m => cldSfx(m), bark: text => cldFloatText(text || cldBarkLine()),
                         fx: e => cldFxEvent(cldView, e) };
```

Delete `cldFloatBark` if `grep -n cldFloatBark js/games/cld.js` shows no other caller. In `cldPrTick` (~3073):

```js
  const hooks = { sfx: m => cldSfx(m), bark: text => { bark = text || cldBarkLine(); },
                  fx: e => cldFxEvent(cldPrView, e) };
```

`cldFxEvent` runs inside the swap there. It is safe because it reads only its arguments and constants, and creates no timer.

- [ ] **Step 6: Step the views from both loops**

In `cldLoop` (~1525), after `const m = cldFloeModel();`, add `cldViewStep(cldView, paused ? 0 : dt, m);`. In `cldPrLoop` (~3371), after `const m = cldArenaModel();`, add `cldViewStep(cldPrView, dt, m);`.

- [ ] **Step 7: Barks as chunky outlined text**

In `cldFloatText` and `cldPrFloat`, replace the `className`/`style.cssText` pair with `el.className = 'cld-bark';` (and `el.style.cssText = '';` if the element could be reused). Add to `css/styles.css` after the `.cld-pr-bubble` rules:

```css
/* Barks — WASHOUT!, ICE BATH!, the plunge lines, Boing! (SW v246). Chunky white
   outlined text that pops in, then drifts up. `scale` and `translate` are separate
   properties so the two animations never fight over `transform`. No fill-mode:
   under reduced motion (the global block) the bark simply sits still and readable,
   and the drift (1500 ms) outlasts the JS removal (CLD_BARK_MS, 1400 ms), so its
   natural end never snaps back into view. */
.cld-bark {
  color: #ffffff;
  font-weight: 800;
  font-size: 1.5rem;
  line-height: 1.1;
  letter-spacing: 0.02em;
  -webkit-text-stroke: 1.5px #123B4C;
  paint-order: stroke fill;
  text-shadow: 0 3px 0 rgba(18, 59, 76, 0.35);
  animation: cld-bark-pop 180ms ease-out, cld-bark-drift 1500ms linear;
}
@keyframes cld-bark-pop   { from { scale: 0.95; } to { scale: 1; } }
@keyframes cld-bark-drift {
  0%   { translate: 0 4px;   opacity: 0; }
  10%  {                     opacity: 1; }
  85%  {                     opacity: 1; }
  100% { translate: 0 -16px; opacity: 0; }
}
```

- [ ] **Step 8: Boing! in the identity doc (paired)**

In `docs/game-identities/cld.md` T7b, directly after the `CLD_PLUNGE_BARKS` block, add:

````markdown
#### Barks over the floe (SW v246)

A bounce off a plug barks **Boing!**. The barks are chunky white outlined text, drawn over the water.

```copy
# screen-cld-floe — barks
Boing!
```
````

- [ ] **Step 9: Mutants**

The penguin call moved from `cldDraw`'s loop (4-space indent) into `cldDrawModelPenguin` (2-space indent), so Task 2's `seam-bypassed` anchor would now PATCH-MISS. A patch miss counts as a failure. Replace that mutant with:

```js
['seam-bypassed', 'game', [[
  '  cldRenderPenguin(ctx, p.pose, p.ownerIdx, p.x, p.y, CLD_PENGUIN_R, {',
  '  cldArt().penguin(ctx, { x: p.x, y: p.y, r: CLD_PENGUIN_R, tint: cldTintOf(p.ownerIdx), pose: p.pose }); if (0) cldRenderPenguin(ctx, p.pose, p.ownerIdx, p.x, p.y, CLD_PENGUIN_R, {']], 'practice'],
```

Then append:

```js
// ── SW v246: the world (verify-cld-practice.js) ──────────────────────────────
['fx-hook-missing', 'game', [[
  '  if (hooks.fx) hooks.fx(e);\n', '']], 'practice'],
['arena-paints-the-live-floe', 'game', [[
  '                  fx: e => cldFxEvent(cldPrView, e) };', '                  fx: e => cldFxEvent(cldView, e) };']], 'practice'],
['grooves-never-cut', 'game', [[
  '  if (view.wasResolving && !resolving) {', '  if (false) {']], 'practice'],
```

- [ ] **Step 10: Run everything, then look**

Run: `node tools/verify-cld-practice.js && node tools/verify-cld-loopback.js && node tools/verify-cld-loop.js && node tools/mutate-cld.js && node tools/verify-identity-docs.js`
Expected: all pass, and mutate is 57/57.

§ G's isolation check (H2) snapshots every non-`cldPr` top-level `let`, and `cldView` is one of them. If H2 now reports `cldView` changed, find out which side changed it before touching anything. The live replay's own `fx` hook changing the live view is legitimate. The Arena changing it is the bug the `arena-paints-the-live-floe` mutant plants. Never exempt `cldView` to make H2 pass.

Then invoke the **`visual-check`** skill. Screenshot the live floe mid-Slide (a single-device game, 3 players) and the Practice Arena at 375×667. Confirm by eye: the water moves, the floe is a snow slab, the chunks are ice cubes, bumps puff, and a plunge splashes.

- [ ] **Step 11: Commit**

```bash
git add js/games/cld.js css/styles.css docs/game-identities/cld.md tools/verify-cld-practice.js tools/mutate-cld.js
git commit -m "feat(cld): the scene composer — a moving Drink, a snow-slab floe that keeps its grooves and splats, ice-cube chunks, particles, Boing!"
```

---

### Task 4: Aiming and targets — all in your colour, and the cue goes

**Files:**
- Modify: `js/games/cld.js` — `cldFloeModel`/`cldArenaModel` (aim entries gain `finger`, `locked`), `cldDrawAimLayer` and `cldDrawMarkers` (rewritten); **delete** `cldDrawCue`, `CLD_CUE_LEN`, `CLD_CUE_GAP_MAX`
- Modify: `tools/verify-cld-practice.js` — section P
- Modify: `tools/mutate-cld.js` — two mutants

**Interfaces:**
- Consumes: `CldArt.aim/reticle/seat/meMarker` (Task 1), `cldAimGuide(m, a)` (unchanged), the model (Task 2), `cldDraw`'s layers (Task 3).
- Produces: a model aim entry `{ penguinId, dx, dy, power, live, rival, finger: {x,y}|null, locked: bool }`. `finger` is the live drag's current point in world units (`cldDragTo` / the Arena's `u.drag.now` through `cldToLogical`). It is null for anything not live.

- [ ] **Step 1: Write section P (failing)**

```js
// ═══════════════════════════════════════════════════════════════════════════
// P. Aiming and targets, all in your colour (spec § 4.5, owner item 4)
// ═══════════════════════════════════════════════════════════════════════════
if (!TUNE) {
  section('P. Aiming and targets');
  const A = S.window.CldArt, calls = {};
  const undo = ['aim', 'reticle', 'seat', 'meMarker'].map(n => {
    const f = A[n]; calls[n] = [];
    A[n] = function () { calls[n].push([].slice.call(arguments, 1)); return f.apply(this, arguments); };
    return () => { A[n] = f; };
  });
  const reset = () => Object.keys(calls).forEach(n => { calls[n].length = 0; });
  const me = RUN('cldTintOf')(0), sylvia = RUN('cldTintOf')(1);
  const pen3 = (id, o, x, y, ex) => Object.assign({ id, ownerIdx: o, x, y, drowned: false, plug: false }, ex || {});
  SET('cldPenguins', [pen3('0-0', 0, 140, 180), pen3('1-0', 1, 220, 180)]);
  SET('cldBergs', []); SET('cldFloeRadius', 170); SET('cldPhase', 'aiming'); SET('cldSlideNo', 2);
  SET('cldMyAims', []); SET('cldMySnowball', null); SET('cldMyMode', 'throw'); SET('cldPowerLock', null);
  SET('cldAimAssist', true);
  // A live drag: finger left of the penguin, so the shot goes right.
  SET('cldDragging', true); SET('cldDragPenguin', '0-0');
  SET('cldDragFrom', { x: 140, y: 180 }); SET('cldDragTo', { x: 90, y: 180 });
  const v = mkView();
  let m = RUN('cldFloeModel()');
  const live = m.aims.find(a => a.live);
  check('the live aim carries the finger (world units) and its lock state', [live.finger, live.locked], [{ x: 90, y: 180 }, false]);
  reset(); RUN('cldDraw')(v, m);
  check('one aim drawn, in MY colour — never white', calls.aim.map(c => c[0].tint), [me]);
  ok('…with the tether to my finger, live, and the guide (Aim Assist on)',
     calls.aim[0][0].live === true && calls.aim[0][0].finger.x === 90 && !!calls.aim[0][0].guide);
  SET('cldPowerLock', 0.7);
  reset(); RUN('cldDraw')(v, RUN('cldFloeModel()'));
  check('a locked bar shows the lock nub', calls.aim[0][0].locked, true);
  SET('cldAimAssist', false);
  reset(); RUN('cldDraw')(v, RUN('cldFloeModel()'));
  check('Aim Assist off → no guide', calls.aim[0][0].guide, null);
  SET('cldAimAssist', true); SET('cldPowerLock', null); SET('cldDragging', false);

  // A rival's shove (the Arena's telegraph): same arrow, their colour, half strength, no guide.
  m = RUN('cldFloeModel()');
  m.aims.push({ penguinId: '1-0', dx: -1, dy: 0, power: 1, live: false, rival: true, finger: null, locked: false });
  reset(); RUN('cldDraw')(v, m);
  const riv = calls.aim.find(c => c[0].rival);
  check('a rival shove: their colour, rival, no guide', [riv[0].tint, riv[0].rival, riv[0].guide], [sylvia, true, null]);

  // Drowned: the Snowball reticle in my colour, thrown from me; rivals' in theirs.
  SET('cldPenguins', [pen3('0-0', 0, 180, 5, { drowned: true, plug: true, angle: -Math.PI / 2 }), pen3('1-0', 1, 220, 180)]);
  SET('cldMySnowball', { x: 220, y: 180 });
  m = RUN('cldFloeModel()');
  m.rivalThrows = [{ x: 150, y: 150, ownerIdx: 1 }];
  reset(); RUN('cldDraw')(v, m);
  const mine = calls.reticle.find(c => !c[0].rival), theirs = calls.reticle.find(c => c[0].rival);
  check('my Snowball target: my colour, arcing from me', [mine[0].tint, mine[0].from], [me, { x: 180, y: 5 }]);
  check('a rival’s target: their colour', theirs[0].tint, sylvia);
  SET('cldMySnowball', null);

  // Dive: free seats as rings in the water, the chosen one shows my ghost.
  m = RUN('cldFloeModel()');
  m.dive = { seats: [{ x: 10, y: 180 }, { x: 350, y: 180 }], ghost: { x: 10, y: 180, ownerIdx: 0 } };
  reset(); RUN('cldDraw')(v, m);
  check('a dashed ring per free seat, in my colour', calls.seat.map(c => c[3]), [me, me]);
  ok('…and the chosen one is marked', calls.seat.some(c => c[5] === true));

  // Slide 1: the bouncing "me" marker, and only then.
  SET('cldPenguins', [pen3('0-0', 0, 140, 180), pen3('1-0', 1, 220, 180)]); SET('cldSlideNo', 0);
  reset(); RUN('cldDraw')(v, RUN('cldFloeModel()'));
  check('Slide 1, nothing aimed: the me marker in my colour', calls.meMarker.map(c => c[3]), [me]);
  SET('cldSlideNo', 2);
  reset(); RUN('cldDraw')(v, RUN('cldFloeModel()'));
  check('…not after', calls.meMarker.length, 0);
  undo.forEach(u => u());
  ok('the cue stick is gone', RUN("typeof cldDrawCue === 'undefined' && typeof CLD_CUE_LEN === 'undefined'"));
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node tools/verify-cld-practice.js`
Expected: FAIL in section P (no `finger`; the cue still draws; no `CldArt.aim` calls).

- [ ] **Step 3: `finger` and `locked` in both models**

In `cldFloeModel` (~1923–1926), make both aim maps carry the new fields:

```js
  const aims = cldMyAims.filter(a => !live || a.penguinId !== live.penguinId)
    .map(a => ({ penguinId: a.penguinId, dx: a.dx, dy: a.dy, power: a.power, live: false, rival: false,
                 finger: null, locked: false }));
  if (live) aims.push({ penguinId: live.penguinId, dx: live.dx, dy: live.dy, power: live.power, live: true, rival: false,
                        finger: cldDragTo ? { x: cldDragTo.x, y: cldDragTo.y } : null, locked: cldPowerLock !== null });
```

In `cldArenaModel` (~3165–3168), add `finger: null, locked: false` to the rival entries, and to yours:

```js
      if (mine && standing('0-0')) aims.push({ penguinId: '0-0', dx: mine.dx, dy: mine.dy, power: mine.power,
                                               live: !!live, rival: false,
                                               finger: live && u.drag && u.drag.nowW ? { x: u.drag.nowW.x, y: u.drag.nowW.y } : null,
                                               locked: u.lock !== null && u.lock !== undefined });
```

and, where the Arena's pointer-move handler updates `u.drag.now`, also store `u.drag.nowW = cldToLogical(cldPrView, e)`, the finger in world units. First check whether `u.drag.now` is already logical: `grep -n "drag.now\b\|drag.now =" js/games/cld.js`. If it is, use it directly and skip `nowW`.

- [ ] **Step 4: Rewrite the two layers, and delete the cue**

```js
// Layer 3 — marks on the ice and in the water, under everyone (spec § 4.5).
// Every aim and target is drawn in its OWNER's colour — yours in yours.
function cldDrawAimLayer(view, m) {
  const A = cldArt(), ctx = view.ctx, t = m.clock, reduced = cldReducedMotion();
  if (!A) return;
  m.aims.forEach(a => {
    const p = m.penguins.find(q => q.id === a.penguinId);
    if (!p || p.drowned || a.power < CLD_MIN_POWER) return;         // a too-soft pull draws nothing
    A.aim(ctx, { x: p.x, y: p.y, r: CLD_PENGUIN_R, dx: a.dx, dy: a.dy, power: a.power, tint: cldTintOf(p.ownerIdx),
                 live: !!a.live, locked: !!a.locked, rival: !!a.rival, finger: a.finger || null,
                 guide: (m.assist && !a.rival) ? cldAimGuide(m, a) : null,
                 t: t, px: view.scale, reduced: reduced });
  });
  if (m.dive) {
    const mine = m.penguins.find(p => p.me) || { ownerIdx: 0 };
    const g = m.dive.ghost;
    m.dive.seats.forEach(s => A.seat(ctx, s.x, s.y, CLD_PENGUIN_R, cldTintOf(mine.ownerIdx), t,
                                     !!g && Math.hypot(g.x - s.x, g.y - s.y) < 1));
    if (g) {
      ctx.save(); ctx.globalAlpha = 0.6;
      cldRenderPenguin(ctx, 'bob', g.ownerIdx, g.x, g.y, CLD_PENGUIN_R,
                       { t: t, ring: true, me: true, look: Math.PI / 2, reduced: reduced });
      ctx.restore();
    }
  }
}

// Layer 6 — reticles and markers, over everything in the world.
function cldDrawMarkers(view, m) {
  const A = cldArt(), ctx = view.ctx, t = m.clock, reduced = cldReducedMotion();
  if (!A) return;
  if (m.hungerBeat) m.penguins.forEach(p => { if (p.hunger > 0) cldDrawHungerBubble(ctx, p.x, p.y); });
  (m.rivalThrows || []).forEach(s => {
    const from = m.penguins.find(p => p.ownerIdx === s.ownerIdx);
    A.reticle(ctx, { x: s.x, y: s.y, tint: cldTintOf(s.ownerIdx), t: t, from: from ? { x: from.x, y: from.y } : null,
                     rival: true, reduced: reduced });
  });
  if (m.snowball) {
    // Thrown from a Standing penguin of mine if I have one, otherwise from the rim.
    const src = m.penguins.find(p => p.me && !p.drowned) || m.penguins.find(p => p.me);
    A.reticle(ctx, { x: m.snowball.x, y: m.snowball.y, tint: cldTintOf(src ? src.ownerIdx : 0), t: t,
                     from: src ? { x: src.x, y: src.y } : null, rival: false, reduced: reduced });
  }
  if (m.meMarker) {
    const p = m.penguins.find(q => q.me && !q.drowned);
    if (p) A.meMarker(ctx, p.x, p.y, CLD_PENGUIN_R, cldTintOf(p.ownerIdx), t, view.scale);
  }
}
```

Delete `cldDrawCue` and the `CLD_CUE_LEN`/`CLD_CUE_GAP_MAX` constants (~117–118). `grep -n "CLD_CUE_LEN\|CLD_CUE_GAP_MAX\|cldDrawCue" js/games/cld.js tools/*.js` must return nothing. **Keep** `CLD_CUE_PULL_PX`, `CLD_CUE_DEAD`, `CLD_CUE_TAP_PX` and `cldCueAim`: the gesture is unchanged, and only its drawing goes.

- [ ] **Step 5: Mutants**

```js
// ── SW v246: aim marks in your colour (verify-cld-practice.js) ───────────────
['aim-drawn-white', 'game', [[
  'dy: a.dy, power: a.power, tint: cldTintOf(p.ownerIdx),', "dy: a.dy, power: a.power, tint: '#ffffff',"]], 'practice'],
['rival-gets-the-guide', 'game', [[
  'guide: (m.assist && !a.rival) ? cldAimGuide(m, a) : null,', 'guide: m.assist ? cldAimGuide(m, a) : null,']], 'practice'],
```

- [ ] **Step 6: Run everything, then look**

Run: `node tools/verify-cld-practice.js && node tools/verify-cld-loopback.js && node tools/mutate-cld.js`
Expected: all pass, and mutate is 59/59.

Invoke **`visual-check`** at 375×667: the floe mid-aim (a live drag, Aim Assist on), a Drowned player choosing a Snowball target, Dive mode, and Practice's Head-on drill (rival arrows). Confirm the arrow, tether, guide dots, ghost and reticle all read in the player's colour against the ice. This is owner item 4; the v244 guide vanished white on white.

- [ ] **Step 7: Commit**

```bash
git add js/games/cld.js tools/verify-cld-practice.js tools/mutate-cld.js
git commit -m "feat(cld): aim marks in your colour — tether, power arrow, guide, reticle and Dive rings; the cue stick goes"
```

---

### Task 5: The floe screen — full bleed, a floating header, the ice shelf

**Files:**
- Modify: `src/screens/cld.html:50-102` — `screen-cld-floe`
- Modify: `css/styles.css` — `.cld-floe-screen`, `.cld-floe-hud`, `.cld-shelf`, the power tube (replaces `.cld-power-track`/`.cld-power-fill`, ~2745–2768) and `.cld-tally-heads`
- Modify: `js/games/cld.js` — `cldSyncFloeUI` (~2075: power fill + tally), `cldShowFloe` (~2054: tint + inset), wherever `cldResize(cldView)` is called (the header inset), the floe's pointer-down handler (ignore header buttons), `cldPrSyncUI` (the Arena's power fill), new `cldStaticCanvas` and `cldPaintTallyHeads`, and constants `CLD_TALLY_INK` and `CLD_TALLY_EMPTY`
- Modify: `tools/verify-cld-practice.js` — section Q

**Interfaces:**
- Consumes: `cldRenderPenguin` with `head` and `tint` (Task 2).
- Produces:
  - `cldStaticCanvas(cv, cssW, cssH) → ctx | null`: sizes a canvas at DPR ≤ 2, clears it, and sets the transform to CSS px. Used by every static chrome canvas in Tasks 5–6.
  - `cldPaintTallyHeads(cv, total, done)`
  - CSS custom property `--cld-tint` on `#screen-cld-floe` and on `#cld-how-to-overlay` (the power tube's fill)

- [ ] **Step 1: Write section Q (failing)**

```js
// ═══════════════════════════════════════════════════════════════════════════
// Q. The floe screen's chrome (spec § 4.6)
// ═══════════════════════════════════════════════════════════════════════════
if (!TUNE) {
  section('Q. The floe screen');
  const $ = id => S.document.getElementById(id);
  SET('cldPlayerCount', 5); SET('cldPhase', 'aiming'); SET('cldCommitted', false);
  SET('cldCommits', [{ aims: [] }, { aims: [] }, null, null, null]);
  SET('cldPenguins', [0, 1, 2, 3, 4].map(i => ({ id: i + '-0', ownerIdx: i, x: 100 + i * 30, y: 180, drowned: false })));
  SET('cldMyAims', []); SET('cldDragging', false); SET('cldPowerLock', 0.6);
  const spy = seamSpy();
  RUN('cldSyncFloeUI()');
  check('the power tube fills by transform, not width', [$('cld-power-fill').style.transform, $('cld-power-fill').style.width],
        ['scaleX(0.6)', undefined]);
  const heads = spy.opts.filter(o => o.head);
  check('the tally draws one head per player', heads.length, 5);
  const ink = G('CLD_TALLY_INK'), empty = G('CLD_TALLY_EMPTY');
  check('…filled in order, counts only', heads.map(o => o.tint), [ink, ink, empty, empty, empty]);
  const players = [0, 1, 2, 3, 4].map(i => RUN('cldTintOf')(i));
  ok('…and never in a player’s colour (the tally must not say who)', heads.every(o => players.indexOf(o.tint) < 0));
  spy.opts.length = 0;
  RUN('cldSyncFloeUI()');
  check('an unchanged count does not repaint the heads', spy.opts.filter(o => o.head).length, 0);
  spy.restore();
  SET('cldPowerLock', null);

  RUN('cldShowFloe()');
  check('the power tube fills in MY colour', $('screen-cld-floe').style['--cld-tint'], RUN('cldTintOf')(0));

  // Review Focus 5 — a touch on a header button never starts an aim.
  const btn = { closest: sel => (sel === 'button' ? {} : null) };
  SET('cldDragging', false);
  RUN('cldPointerDown')({ target: btn, clientX: 10, clientY: 10, pointerId: 1, isPrimary: true, timeStamp: 0,
                          preventDefault() {}, stopPropagation() {} });
  check('a press on [?] / 🔊 / ✕ is the button’s, not an aim', G('cldDragging'), false);

  // Static canvases are DPR-capped at 2.
  S.window.devicePixelRatio = 3;
  const cv = S.document.createElement('canvas');
  RUN('cldStaticCanvas')(cv, 100, 40);
  check('a static canvas caps DPR at 2', [cv.width, cv.height, cv.style.width], [200, 80, '100px']);
  S.window.devicePixelRatio = 1;
}
```

(The floe's pointer-down handler may be named differently. Find it with `grep -n "addEventListener('pointerdown'" js/games/cld.js` and use its real name in the test.)

- [ ] **Step 2: Run it to verify it fails**

Run: `node tools/verify-cld-practice.js`
Expected: FAIL in Q (width-based fill, no heads, no `cldStaticCanvas`).

- [ ] **Step 3: The markup**

Replace `screen-cld-floe` (the `<section>` from ~line 50 to its `</section>`) with the version below. Keep the comment block above it, and add one sentence to it: "SW v246: full bleed — the header floats over the water, and the controls sit on an ice shelf."

```html
  <section id="screen-cld-floe" style="display:none"
    class="cld-floe-screen h-screen w-full flex flex-col overflow-hidden">

    <!-- STAGE — edge to edge. The canvas is sized in JS (cldResize); the header
         floats over the water, and the camera's box starts below it (insetTop). -->
    <div id="cld-stage" class="flex-1 min-h-0 w-full relative">
      <canvas id="cld-canvas"></canvas>

      <!-- HEADER — white over the water. The row itself lets touches through to the
           stage (a drag may start anywhere); only its buttons take them. -->
      <div id="cld-floe-hud" class="cld-floe-hud absolute top-0 inset-x-0 flex items-center justify-between px-4 pt-4 pb-2 pointer-events-none">
        <p id="cld-floe-header" class="text-white text-sm font-semibold uppercase tracking-widest"></p>
        <div class="flex items-center gap-2 pointer-events-auto">
          <button id="btn-cld-how-to" class="min-h-11 min-w-11 text-white/90 font-bold text-sm active:scale-90 transition-transform duration-100">[?]</button>
          <button class="btn-open-sound min-h-11 min-w-11 text-xl active:scale-90 transition-transform duration-100">🔊</button>
          <button class="btn-cld-quit-open min-h-11 min-w-11 text-white font-bold text-xl active:scale-90 transition-transform duration-100">✕</button>
        </div>
      </div>

      <!-- Transient layer — floats, contributes zero height (ui-style.md). -->
      <div id="cld-float-layer" class="absolute inset-0 pointer-events-none flex items-start justify-center pt-16"></div>
    </div>

    <!-- CONTROLS — the ice shelf, frozen beneath the stage (the documented exception). -->
    <div class="cld-shelf flex-shrink-0 w-full">
      <div class="flex flex-col gap-2 w-full max-w-sm mx-auto px-4 pt-4 pb-4">

        <!-- Drowned-only row: Throw or Dive (SW v243). Dive only while Knocked back. -->
        <div id="cld-drowned-row" style="display:none" class="flex flex-col gap-1">
          <div class="flex gap-2">
            <button id="btn-cld-mode-throw" class="pill pill-active-cld flex-1" data-cld-mode="throw">Throw</button>
            <button id="btn-cld-mode-dive"  class="pill flex-1" data-cld-mode="dive">Dive</button>
          </div>
          <p id="cld-dive-reason" style="display:none" class="text-amber-600 text-xs"></p>
        </div>

        <!-- POWER — the bar IS the lock control; an ice tube that fills in your colour. -->
        <button id="btn-cld-power" class="w-full flex flex-col gap-1 py-2 active:scale-[0.99] transition-transform duration-100">
          <div class="flex items-center justify-between w-full">
            <p id="cld-power-hint" class="text-stone-500 text-xs">Tap to lock power</p>
            <p class="text-stone-500 text-xs font-semibold uppercase tracking-widest">Power</p>
          </div>
          <div id="cld-power-track" class="cld-power-track w-full">
            <div id="cld-power-fill" class="cld-power-fill"></div>
          </div>
        </button>

        <!-- TALLY — penguin heads that fill as players lock in. Counts only, never who. -->
        <div class="flex items-center justify-center gap-2">
          <canvas id="cld-tally-heads" class="cld-tally-heads" aria-hidden="true"></canvas>
          <p id="cld-tally" class="text-stone-600 text-sm text-center"></p>
        </div>

        <button id="btn-cld-commit" class="btn-mp-action cld-cta min-h-14 w-full rounded-2xl text-xl font-semibold">Lock It In</button>
      </div>
    </div>
  </section>
```

The copy is unchanged: same strings, same IDs. The header buttons gain `min-h-11 min-w-11` so they clear the 44 px touch minimum over a surface you drag on. The hint and tally inks darken one rung (`stone-500`/`stone-600`) to hold contrast on the shelf.

- [ ] **Step 4: The CSS**

Replace `.cld-power-track`, `.cld-power-track.cld-power-locked`, `.cld-power-fill` and `.cld-power-track.cld-power-locked .cld-power-fill` (~2745–2768) with:

```css
/* ── Cold Shoulder — the floe screen (SW v246, fun-pass spec § 4.6) ── */
.cld-floe-screen { background: #0e2536; }        /* the Drink shows past the canvas edge */
.cld-floe-hud { text-shadow: 0 1px 3px rgba(8, 36, 56, 0.6); }

/* The ice shelf: frosted sea ice with a snow lip over the water. */
.cld-shelf {
  position: relative;
  background: linear-gradient(to bottom, #f4fbfe, #dcf0f8 60%, #cfe7f2);
  border-top: 3px solid #ffffff;
  box-shadow: 0 -6px 14px rgba(8, 36, 56, 0.35), inset 0 2px 0 rgba(255, 255, 255, 0.9);
  padding-bottom: env(safe-area-inset-bottom);
}
.cld-shelf::before {                               /* the snow lip, scalloped */
  content: '';
  position: absolute; left: 0; right: 0; top: -9px; height: 10px;
  background: radial-gradient(circle at 10px 10px, #ffffff 9px, transparent 10px) 0 0 / 20px 10px repeat-x;
  pointer-events: none;
}

/* Power — an inset ice tube that fills in YOUR colour (--cld-tint), with frost
   ticks every quarter. The fill scales (transform only). The bar IS the lock
   control (brief §14): locked is outlined in deep ink and shows a lock. */
.cld-power-track {
  position: relative;
  height: 1.25rem;
  border-radius: 9999px;
  overflow: hidden;
  background: linear-gradient(to bottom, #b9dcec, #e3f3fa);
  box-shadow: inset 0 2px 4px rgba(18, 59, 76, 0.35), inset 0 -1px 0 rgba(255, 255, 255, 0.8);
  border: 2px solid transparent;
  transition: border-color 0.15s ease;
}
.cld-power-track::after {                          /* frost ticks */
  content: '';
  position: absolute; inset: 0; pointer-events: none; z-index: 1;
  background: repeating-linear-gradient(to right, transparent 0 calc(25% - 1px),
              rgba(255, 255, 255, 0.75) calc(25% - 1px) 25%);
}
.cld-power-track.cld-power-locked { border-color: #123B4C; }
.cld-power-track.cld-power-locked::before {        /* the lock */
  content: '🔒';
  position: absolute; right: 0.35rem; top: 50%; z-index: 2;
  font-size: 0.7rem; line-height: 1; transform: translateY(-50%);
}
.cld-power-fill {
  position: absolute; inset: 0;
  border-radius: 9999px;
  transform-origin: left center;
  transform: scaleX(0);
  background-color: var(--cld-tint, #8ECAE6);
  background-image: linear-gradient(to bottom, rgba(255, 255, 255, 0.45), rgba(255, 255, 255, 0) 60%);
  transition: transform 0.06s linear;
}
.cld-tally-heads { display: block; flex-shrink: 0; }
```

- [ ] **Step 5: The JS**

Add near the Task 2 constants:

```js
const CLD_TALLY_INK   = '#8ECAE6';   // a locked-in head — ONE neutral ice colour, never a seat's
const CLD_TALLY_EMPTY = '#d6d3d1';   // still aiming
```

Add near `cldShowResult`:

```js
// A static chrome canvas: CSS size, DPR ≤ 2, cleared, transform in CSS px.
function cldStaticCanvas(cv, cssW, cssH) {
  const ctx = cv && cv.getContext ? cv.getContext('2d') : null;
  if (!ctx) return null;
  const dpr = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 2);
  cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px';
  cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  return ctx;
}

// The tally as penguin heads (spec § 4.6). Counts only — never who: filled heads
// are ONE neutral colour, filled left to right, so no head can be read as a seat.
// Repaints only when the count changes.
function cldPaintTallyHeads(cv, total, done) {
  if (!cv) return;
  const key = total + ':' + done;
  if (cv.dataset && cv.dataset.key === key) return;
  if (cv.dataset) cv.dataset.key = key;
  const r = 7, gap = 4, w = Math.max(1, total * (2 * r + gap) - gap), h = 2 * r + 2;
  const ctx = cldStaticCanvas(cv, w, h);
  if (!ctx) return;
  for (let i = 0; i < total; i++) {
    cldRenderPenguin(ctx, 'idle', 0, r + i * (2 * r + gap), h / 2, r,
                     { head: true, tint: i < done ? CLD_TALLY_INK : CLD_TALLY_EMPTY, look: Math.PI / 2 });
  }
}
```

In `cldSyncFloeUI`:
- Power: replace `if (fill) fill.style.width = Math.round(shown * 100) + '%';` with `if (fill) fill.style.transform = 'scaleX(' + shown + ')';`. Keep the value unrounded; rounding to 2 dp is fine if a harness pins a string.
- Tally: after the `tally.textContent` assignments, add:

```js
  const heads = document.getElementById('cld-tally-heads');
  if (heads) {
    const washout = cldPhase === 'washout';
    heads.style.display = washout ? 'none' : 'block';
    if (!washout) cldPaintTallyHeads(heads, cldPlayerCount,
      cldPhase === 'resolving' ? cldPlayerCount : cldCommits.filter(c => c !== null).length);
  }
```

In `cldShowFloe` (~2054), before the canvas is sized:

```js
  const scr = document.getElementById('screen-cld-floe');
  if (scr && scr.style.setProperty) scr.style.setProperty('--cld-tint', cldTintOf(cldMyIdx()));
```

**The header inset.** Add:

```js
// The camera's box starts below the floating header, so the overview never
// frames the floe under the [?] 🔊 ✕ row.
function cldFloeInsets() {
  const hud = document.getElementById('cld-floe-hud');
  if (cldView) cldView.insetTop = hud && hud.offsetHeight ? hud.offsetHeight : 0;
}
```

and call `cldFloeInsets();` immediately before **every** `cldResize(cldView)`. Find them with `grep -n "cldResize(cldView)" js/games/cld.js`, and include `cldInitCanvas`.

**Header touches.** At the top of the floe's pointer-down handler, before `cldCamPointer`:

```js
  // The header floats over the stage: a press on its buttons is theirs, never an aim.
  if (e.target && e.target.closest && e.target.closest('button')) return;
```

**The Arena's power bar.** In `cldPrSyncUI`, change the `cld-pr-power-fill` width assignment to the same `style.transform = 'scaleX(…)'`. In `cldPracticeStart`, set `--cld-tint` to `cldTintOf(0)` on `#cld-how-to-overlay`.

- [ ] **Step 6: Build and run everything**

Run: `node tools/build-index.js && node tools/verify-build-fresh.js && node tools/verify-cld-practice.js && node tools/verify-cld-loopback.js && node tools/verify-identity-docs.js && node tools/mutate-cld.js`
Expected: all pass. If a practice or loopback check pinned `style.width` on a power fill, update it to the `scaleX(…)` string: the same value, the new property.

- [ ] **Step 7: The visual pass**

Invoke **`visual-check`** on `screen-cld-floe` at **375×667, 375×548, 320×452**, once Standing and aiming and once Drowned (the Throw · Dive row showing). Pass criteria:
- the header text and buttons are legible over the water, and each button is ≥ 44×44;
- the stage is never 0 px tall, and the overview frames the whole floe below the header;
- the shelf's lip is visible, and the Lock It In button is fully on screen;
- the tally heads and text sit on one line at 320 wide with 8 players;
- there is no horizontal scroll.

Record the stage heights.

- [ ] **Step 8: Commit**

```bash
git add src/screens/cld.html index.html css/styles.css js/games/cld.js tools/verify-cld-practice.js
git commit -m "feat(cld): the floe goes full bleed — a header over the water, an ice shelf, a power tube in your colour, a tally of heads"
```

---

### Task 6: The other screens, and the ice-block button

**Files:**
- Modify: `src/screens/cld.html` — the menu (~14: the 🐧 div), the intro (~36: the 🧊 div), the result art, the gameover (a podium canvas above `#cld-podium`; the Waddle Off class), and Practice's Start over and Practice again (~375, ~397)
- Modify: `css/styles.css` — `.cld-ice-btn`, `.cld-menu-art` + `@keyframes cld-menu-bob`, `.cld-art-canvas`
- Modify: `js/games/cld.js` — new `cldPaintMenuArt`, `cldPaintIntroArt`, `cldHeadEl`, `cldFishEl` and `cldPaintPodium`; `cldShowFloeOffIntro` (~2518), `cldShowResult` (~2553), `cldShowScoreboard` (~2613), `cldShowGameover` (~2659); every `showScreen('screen-cld-menu')` site
- Modify: `tools/verify-cld-practice.js` — section R
- Modify: `tools/mutate-cld.js` — one mutant

**Interfaces:**
- Consumes: `cldStaticCanvas` (Task 5), `cldRenderPenguin` with `head`/`fish` (Task 2), `CldArt.floe/makeFloe/plinth/fish` (Task 1).
- Produces:
  - `cldHeadEl(ownerIdx, cssR) → <canvas>`: a head avatar
  - `cldFishEl(n) → element`: up to 5 drawn Fish, else a Fish plus "× n", else `—`. Its `aria-label` is `cldFishLabel(n)`.
  - `.cld-ice-btn`

- [ ] **Step 1: Write section R (failing)**

The mock's `setAttribute` is a no-op, so first make it record. In `makeDocument`'s `mk`, replace `setAttribute() {}, getAttribute: () => null,` with:

```js
      attrs: {}, setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
```

Then add section R. Its markup checks read the built `index.html`, because a mock element never sees markup classes:

```js
// ═══════════════════════════════════════════════════════════════════════════
// R. The other screens (spec § 4.6 table)
// ═══════════════════════════════════════════════════════════════════════════
if (!TUNE) {
  section('R. The other screens');
  const $ = id => S.document.getElementById(id);
  SET('cldPlayerCount', 5); SET('cldPlayerNames', ['Ada', 'Bo', 'Cy', 'Di', 'Ed']);
  SET('cldFish', [2, 0, 7, 1, 0]); SET('cldFishToWin', 3);
  SET('cldMatchStats', [0, 1, 2, 3, 4].map(() => ({ slidesStood: 1, plunges: 1 })));
  SET('cldPenguins', [0, 1, 2, 3, 4].map(i => ({ id: i + '-0', ownerIdx: i, x: 180, y: 180, drowned: i === 1 || i === 3 })));
  const spy = seamSpy();
  const fresh = () => { spy.opts.length = 0; spy.inside = 0; };

  RUN('cldPaintMenuArt()');
  check('the menu: three penguins on a floe', spy.inside, 3);
  RUN('cldPaintMenuArt()');
  check('…painted once (it is a static canvas)', spy.inside, 3);

  fresh(); RUN("cldShowFloeOffIntro('intro')");
  check('the intro vignette: one penguin per player', spy.inside, 5);
  // Painted back to front (y-sorted), so compare as sets, not in seat order.
  check('…each in its player’s colour', spy.opts.map(o => o.tint).sort(), [0, 1, 2, 3, 4].map(i => RUN('cldTintOf')(i)).sort());

  fresh(); RUN('cldShowResult')({ winnerIdx: 2, matchOver: false });
  const big = spy.opts.find(o => o.pose === 'win');
  ok('the result: the winner, big, jumping with a Fish', !!big && big.fish === true && big.r >= 30, JSON.stringify(big));
  check('…and a head for each penguin in the Drink', spy.opts.filter(o => o.head).length, 2);

  fresh(); RUN('cldShowScoreboard()');
  check('the scoreboard: an avatar per row', spy.opts.filter(o => o.head).length, 5);
  const rows = $('cld-scoreboard-rows').children;
  check('drawn Fish for the tally, labelled for screen readers (Cy, 7 Fish, tops the table)',
        rows[0].children[1].attrs['aria-label'], '🐟 × 7');
  check('no Fish reads as a dash', rows[4].children[1].textContent, '—');

  fresh(); RUN('cldShowGameover()');
  const pod = spy.opts.filter(o => !o.head);
  check('the podium: the top three on ice blocks', pod.length, 3);
  ok('…the winner holding a Fish', pod.some(o => o.pose === 'win' && o.fish === true));

  check('every chrome penguin went through the seam', spy.outside, 0);
  spy.restore();

  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const classOf = id => { const m = html.match(new RegExp('id="' + id + '"[^>]*class="([^"]*)"')); return m ? m[1] : ''; };
  ok('Waddle Off is an ice block at March On!’s size (DD-31 parity)',
     /\bcld-ice-btn\b/.test(classOf('btn-cld-go-leave')) && /\bmin-h-14\b/.test(classOf('btn-cld-go-leave')));
  ok('Start over and Practice again are ice blocks',
     /\bcld-ice-btn\b/.test(classOf('btn-cld-pr-restart')) && /\bcld-ice-btn\b/.test(classOf('btn-cld-pr-again')));
  check('…and nothing else is — the Decision Modals stay suite-standard', (html.match(/\bcld-ice-btn\b/g) || []).length, 3);
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node tools/verify-cld-practice.js`
Expected: FAIL in R (`cldPaintMenuArt` not defined, and so on).

- [ ] **Step 3: The ice block and the menu bob (CSS)**

```css
/* ── The ice block — Cold Shoulder's secondary in-game button (SW v246) ──
   A block of sea ice: a lit top, a snow cap, a glint, and a 4px lip that sinks on
   press (transform only; the lip's shadow snaps). Dark ink. Used on Practice's
   Start over and Practice again and the gameover's Waddle Off — NEVER on a CTA,
   a pill, or a Decision Modal button (those are shared across 20 games). */
.cld-ice-btn {
  position: relative;
  isolation: isolate;
  display: inline-flex; align-items: center; justify-content: center;
  min-height: 2.75rem;
  padding: 0 1rem;
  border-radius: 0.9rem;
  color: #123B4C;
  font-weight: 600;
  background: linear-gradient(to bottom, #f2fbff 0%, #d4eef8 45%, #b3dcee 100%);
  box-shadow: 0 4px 0 #6fa9c2, 0 6px 10px rgba(18, 59, 76, 0.25), inset 0 1px 0 #ffffff;
  transition: transform 120ms ease-out;
}
.cld-ice-btn::before {                             /* snow cap */
  content: '';
  position: absolute; left: 6px; right: 6px; top: 0; height: 6px; z-index: -1;
  border-radius: 0 0 8px 8px; background: #ffffff; opacity: 0.9;
}
.cld-ice-btn::after {                              /* glint */
  content: '';
  position: absolute; top: 9px; right: 12px; width: 10px; height: 3px; z-index: -1;
  border-radius: 3px; background: rgba(255, 255, 255, 0.9); transform: rotate(-20deg);
}
.cld-ice-btn:active {
  transform: translateY(4px);
  box-shadow: 0 0 0 #6fa9c2, 0 2px 4px rgba(18, 59, 76, 0.2), inset 0 1px 0 #ffffff;
}
.cld-ice-btn:disabled { opacity: 0.5; pointer-events: none; }

/* The menu's key art bobs gently. CSS, so the global reduced-motion block stills it. */
.cld-menu-art { display: block; margin: 0 auto; animation: cld-menu-bob 2.6s ease-in-out infinite; }
@keyframes cld-menu-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
.cld-art-canvas { display: block; margin: 0 auto; }
```

- [ ] **Step 4: The markup**

- Menu: replace `<div class="text-5xl" role="img" aria-label="Penguin">🐧</div>` with `<canvas id="cld-menu-art" class="cld-menu-art" role="img" aria-label="Three penguins on an ice floe"></canvas>`.
- Intro: replace `<div class="text-6xl" role="img" aria-label="Ice floe">🧊</div>` with `<canvas id="cld-intro-art" class="cld-art-canvas" role="img" aria-label="Penguins on a fresh floe"></canvas>`.
- Gameover: directly above `<div id="cld-podium" …>`, add `<canvas id="cld-podium-art" class="cld-art-canvas w-full" role="img" aria-label="The podium"></canvas>`.
- Waddle Off (`btn-cld-go-leave`): `class="cld-ice-btn min-h-14 w-full text-xl"`. It keeps March On!'s size and weight (ui-style § Universal Menu Standard → DD-31 parity). The class's `min-height: 2.75rem` is its floor, not its size here.
- Start over (`btn-cld-pr-restart`): `class="cld-ice-btn flex-1 text-sm"`. Practice again (`btn-cld-pr-again`): `class="cld-ice-btn text-sm"`.
- Leave every copy string, `id` and Decision Modal untouched.

- [ ] **Step 5: The JS**

Add after `cldPaintTallyHeads`:

```js
// ── Chrome art (spec § 4.6) — static canvases, drawn once per show. Every
// penguin goes through the seam; any motion is CSS (the reduced-motion block
// covers it), so no new requestAnimationFrame appears.

// A small floe (world units) with penguins on it, fitted into a W×H canvas.
function cldPaintVignette(cv, W, H, radius, seats) {
  const A = cldArt();
  const ctx = A ? cldStaticCanvas(cv, W, H) : null;
  if (!ctx) return;
  const k = Math.min(W, H * 1.6) / (2 * radius + 60);           // world → CSS px, room for the bodies
  ctx.save();
  ctx.translate(W / 2, H * 0.6); ctx.scale(k, k); ctx.translate(-CLD_W / 2, -CLD_H / 2);
  A.floe(ctx, A.makeFloe(CLD_W / 2, CLD_H / 2, radius, 7, 1), 0, true);
  seats.slice().sort((a, b) => a.y - b.y).forEach(s =>
    cldRenderPenguin(ctx, 'idle', s.colour, CLD_W / 2 + s.x, CLD_H / 2 + s.y, CLD_PENGUIN_R,
                     { look: Math.PI / 2, seed: s.colour, reduced: true, px: k }));
  ctx.restore();
}

// The menu: three penguins on a small floe (replaces the 🐧). Painted once.
function cldPaintMenuArt() {
  const cv = document.getElementById('cld-menu-art');
  if (!cv || !cldArt() || (cv.dataset && cv.dataset.painted)) return;
  if (cv.dataset) cv.dataset.painted = '1';
  cldPaintVignette(cv, 168, 104, 46, [{ x: -24, y: 6, colour: 0 }, { x: 0, y: -8, colour: 1 }, { x: 24, y: 6, colour: 2 }]);
}

// The Floe-Off intro: the players' penguins on the fresh floe (replaces the 🧊).
function cldPaintIntroArt() {
  const cv = document.getElementById('cld-intro-art');
  if (!cv) return;
  const n = Math.max(2, cldPlayerCount || 2), R = 60, ring = n > 1 ? R * 0.55 : 0;
  const seats = Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + i * CLD_TAU / n;
    return { x: Math.cos(a) * ring, y: Math.sin(a) * ring * 0.7, colour: i };
  });
  cldPaintVignette(cv, 200, 120, R, seats);
}

// A head avatar for chrome rows — the scoreboard, the plunge list.
function cldHeadEl(ownerIdx, cssR) {
  const cv = document.createElement('canvas');
  cv.className = 'cld-art-canvas shrink-0';
  const ctx = cldStaticCanvas(cv, cssR * 2, cssR * 2);
  if (ctx) cldRenderPenguin(ctx, 'idle', ownerIdx, cssR, cssR, cssR, { head: true, look: Math.PI / 2 });
  return cv;
}

// Drawn Fish for a tally: up to 5, else one Fish and "× n"; "—" for none.
function cldFishEl(n) {
  const wrap = document.createElement('span');
  wrap.className = 'flex items-center gap-1 text-stone-500 text-sm';
  wrap.setAttribute('aria-label', cldFishLabel(n));
  if (n <= 0) { wrap.textContent = '—'; return wrap; }
  const shown = n <= 5 ? n : 1, s = 11;
  const cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden', 'true');
  const ctx = cldStaticCanvas(cv, shown * (s * 1.4), s * 1.2);
  const A = cldArt();
  if (ctx && A) for (let i = 0; i < shown; i++) A.fish(ctx, s * 0.7 + i * s * 1.4, s * 0.6, s, -0.15);
  wrap.appendChild(cv);
  if (n > 5) { const t = document.createElement('span'); t.textContent = '× ' + n; wrap.appendChild(t); }
  return wrap;
}

// The Final Floe's podium: the top three on ice blocks of 1st / 2nd / 3rd
// height, the winner jumping with a Fish.
function cldPaintPodium(order) {
  const cv = document.getElementById('cld-podium-art');
  const A = cldArt();
  if (!cv || !A) return;
  const host = cv.parentElement;
  const W = Math.min(384, (host && host.clientWidth) || 320), H = 150;
  const ctx = cldStaticCanvas(cv, W, H);
  if (!ctx) return;
  const slots = [{ rank: 1, x: W * 0.22, h: 42 }, { rank: 0, x: W * 0.5, h: 60 }, { rank: 2, x: W * 0.78, h: 30 }];
  const bw = W * 0.24, base = H - 4, pr = 18;
  slots.forEach(sl => {
    const row = order[sl.rank];
    if (!row) return;
    A.plinth(ctx, sl.x, base - sl.h, bw, sl.h);
    cldRenderPenguin(ctx, sl.rank === 0 ? 'win' : 'idle', row.i, sl.x, base - sl.h - 2, pr,
                     { t: sl.rank === 0 ? 0.3 : 0, look: Math.PI / 2, fish: sl.rank === 0, seed: row.i, reduced: true });
  });
}
```

Wire them in:
- **Menu:** `grep -n "showScreen('screen-cld-menu')" js/games/cld.js`, and put `cldPaintMenuArt();` on the line before each hit.
- **Intro:** in `cldShowFloeOffIntro`, call `cldPaintIntroArt();` before its `showScreen`.
- **Result:** in `cldShowResult`, size the art canvas at 132×132 through `cldStaticCanvas` (replacing the manual DPR lines) and draw `cldRenderPenguin(g, winner >= 0 ? 'win' : 'bob', winner >= 0 ? winner : 0, 66, 110, 34, { t: 0.3, look: Math.PI / 2, fish: winner >= 0, reduced: true })`. Then rebuild the plunge list: the `In the Drink:` label, then a `flex flex-wrap justify-center gap-2` row of chips (`cldHeadEl(p.ownerIdx, 10)` plus the name), one per owner who went in.
- **Scoreboard:** in each row, replace the colour dot with `cldHeadEl(row.i, 14)`, and replace `right.textContent = cldFishLabel(row.fish)` by appending `cldFishEl(row.fish)` in place of `right`.
- **Gameover:** after building the sorted rows, call `cldPaintPodium(sorted)`, where `sorted` is the same `{ nm, i, fish }` array, sorted. Use `cldFishEl(row.fish)` on each podium row in place of the text label.

- [ ] **Step 6: A mutant**

```js
['chrome-bypasses-seam', 'game', [[
  "  if (ctx) cldRenderPenguin(ctx, 'idle', ownerIdx, cssR, cssR, cssR, { head: true, look: Math.PI / 2 });",
  "  if (ctx && cldArt()) cldArt().penguin(ctx, { x: cssR, y: cssR, r: cssR, tint: cldTintOf(ownerIdx), pose: 'idle', head: true });"]], 'practice'],
```

- [ ] **Step 7: Build, run everything, then look**

Run: `node tools/build-index.js && node tools/verify-build-fresh.js && node tools/verify-cld-practice.js && node tools/verify-cld-loopback.js && node tools/verify-identity-docs.js && node tools/verify-mp-configs.js && node tools/mutate-cld.js`
Expected: all pass, and mutate is 60/60.

Invoke **`visual-check`** at the three SE sizes on `screen-cld-menu`, `screen-cld-floeoff-intro`, `screen-cld-result`, `screen-cld-scoreboard` and `screen-cld-gameover`, with 2, 5 and 16 players and one 20-character name. Pass criteria:
- the menu's key art sits where the 🐧 was, and the 🔊 still reads as attached to the title;
- the penguins read as the sticker's (faces visible at avatar size; tune `HEAD_CY`/`HEAD_R` here);
- no row overflows at 320 wide with 16 players;
- the podium's three blocks and the Fish are legible;
- the ice-block buttons clear 44 px and sink on press.

- [ ] **Step 8: Commit**

```bash
git add src/screens/cld.html index.html css/styles.css js/games/cld.js tools/verify-cld-practice.js tools/mutate-cld.js
git commit -m "feat(cld): drawn art on every screen — menu, intro, result, scoreboard, podium — and the ice-block secondary button"
```

---

### Task 7: The Cast — nine poses and six faces

**Files:**
- Modify: `js/games/cld.js` — `CLD_HOWTO_CAST` (~2813), new `CLD_HOWTO_FACES`, `CLD_HOWTO_TILE_R`, `cldHowtoBuildCast`, `cldHowtoDrawCast`, `cldHowtoLoop` (reduced motion), `cldHowtoFit` (DPR cap)
- Modify: `src/screens/cld.html` — the Cast body (~404): a faces heading and grid
- Modify: `docs/game-identities/cld.md` — T7b "The Cast — pose tiles" block, plus a faces block
- Modify: `tools/verify-cld-practice.js` — section T

**Interfaces:**
- Consumes: `CldArt.POSES`/`FACES` (Task 1), the seam (Task 2).
- Produces: `CLD_HOWTO_CAST` (9 × `{ pose, name, note }`) and `CLD_HOWTO_FACES` (6 × `{ expr, name }`).

- [ ] **Step 1: Write section T (failing)**

```js
// ═══════════════════════════════════════════════════════════════════════════
// T. The Cast — nine poses, six faces (spec § 4.6 table)
// ═══════════════════════════════════════════════════════════════════════════
if (!TUNE) {
  section('T. The Cast');
  const A = S.window.CldArt;
  check('the Cast shows every pose the art has, in its order', G('CLD_HOWTO_CAST').map(c => c.pose), A.POSES);
  check('…and every face', G('CLD_HOWTO_FACES').map(c => c.expr), A.FACES);
  const spy = seamSpy();
  RUN('cldHowtoBuildCast(); cldHowtoDrawCast()');
  check('fifteen tiles, all through the seam', [spy.inside, spy.outside], [15, 0]);
  check('the face tiles wear their face', spy.opts.filter(o => o.expr).map(o => o.expr), A.FACES);
  spy.restore();
  const rm = S.window.matchMedia;
  S.window.matchMedia = () => ({ matches: true });
  const c0 = G('cldHowtoClock');
  RUN('cldHowtoLoop')(1000); RUN('cldHowtoLoop')(1040);
  check('reduced motion: the Cast stands still', G('cldHowtoClock'), c0);
  S.window.matchMedia = rm;
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node tools/verify-cld-practice.js`
Expected: FAIL in T (six poses, no faces, and the clock advances under reduced motion).

- [ ] **Step 3: The Cast data and drawing**

```js
const CLD_HOWTO_CAST = [
  { pose: 'idle',   name: 'Idle',         note: 'waiting to aim' },
  { pose: 'aim',    name: 'Wind-up',      note: 'pulling back' },
  { pose: 'slide',  name: 'Belly-slide',  note: 'shoved across the ice' },
  { pose: 'squash', name: 'Squash',       note: 'a bump' },
  { pose: 'plunge', name: 'Plunge',       note: 'over the lip' },
  { pose: 'bob',    name: 'Plug',         note: 'in the Drink, blocking a gap' },
  { pose: 'back',   name: 'Knocked back', note: 'bumped off its gap' },
  { pose: 'throw',  name: 'Throw',        note: 'a Snowball lob' },
  { pose: 'win',    name: 'Win',          note: 'last one dry' },
];
const CLD_HOWTO_FACES = [
  { expr: 'happy',  name: 'Happy' },  { expr: 'focus',  name: 'Focus' },  { expr: 'strain', name: 'Strain' },
  { expr: 'shock',  name: 'Shock' },  { expr: 'grumpy', name: 'Grumpy' }, { expr: 'dizzy',  name: 'Dizzy' },
];
const CLD_HOWTO_TILE_R = 60;   // cast-tile body radius, logical units — the upright body rises ~2.3r
```

`cldHowtoBuildCast` builds the nine pose tiles into `#cld-howto-cast` as today, then the six face tiles the same way into `#cld-howto-faces`. A face tile has a name but no note, and carries `{ …, pose: 'idle', expr }`.

`cldHowtoDrawCast` draws each tile at `(CLD_W / 2, CLD_H * 0.68)` with these per-pose extras, so every tile shows its moment:

```js
    const t = cldHowtoClock, cyc = (t * 0.45) % 1;
    const extra = {
      aim:    { power: 0.55 + 0.4 * Math.abs(Math.sin(t * 0.9)), look: 0 },
      slide:  { vel: { x: 0.6, y: 0.8 } },
      squash: { k: cyc },
      plunge: { k: cyc * 0.85, outward: 1 },
      win:    { fish: true },
    }[tile.pose] || {};
    cldRenderPenguin(tile.ctx, tile.pose, tile.colour, CLD_W / 2, CLD_H * 0.68, CLD_HOWTO_TILE_R,
      Object.assign({ t: t, ring: true, look: Math.PI / 2, seed: tile.colour, expr: tile.expr || null,
                      reduced: cldReducedMotion() }, extra));
```

Delete the old `plunge` alpha-cycle comment and its `t` special case. The new plunge pose doesn't fade out.

`cldHowtoLoop`: change `cldHowtoClock += dt;` to `if (!cldReducedMotion()) cldHowtoClock += dt;`. `cldHowtoFit`: `const dpr = Math.min(window.devicePixelRatio || 1, 2);`.

- [ ] **Step 4: The markup**

In the Cast body (`#cld-howto-body-cast`), after the `#cld-howto-cast` grid, add:

```html
        <p class="text-xs font-semibold uppercase tracking-widest cld-label">Faces</p>
        <div id="cld-howto-faces" class="grid grid-cols-3 gap-3"></div>
```

Make `#cld-howto-cast` `grid grid-cols-3 gap-3` if it isn't already, so nine tiles make three even rows.

- [ ] **Step 5: The identity doc (paired)**

Replace the block `# The Cast — pose tiles (built from CLD_HOWTO_CAST in js/games/cld.js)` with:

````markdown
```copy
# The Cast — pose tiles (built from CLD_HOWTO_CAST in js/games/cld.js)
Idle
Wind-up
Belly-slide
Squash
Plunge
Plug
Knocked back
Throw
Win
```

```copy
# The Cast — faces (built from CLD_HOWTO_FACES in js/games/cld.js)
Faces
Happy
Focus
Strain
Shock
Grumpy
Dizzy
```
````

- [ ] **Step 6: Build, run, look**

Run: `node tools/build-index.js && node tools/verify-build-fresh.js && node tools/verify-cld-practice.js && node tools/verify-identity-docs.js && node tools/mutate-cld.js`
Expected: all pass.

Invoke **`visual-check`** on How to Play → The Cast at 375×667 and 320×452. Every tile shows a whole penguin (nothing clipped at the top), and the faces are distinct at tile size.

- [ ] **Step 7: Commit**

```bash
git add js/games/cld.js src/screens/cld.html index.html docs/game-identities/cld.md tools/verify-cld-practice.js
git commit -m "feat(cld): The Cast — nine poses and six faces from the art module; stands still under reduced motion"
```

---

### Task 8: Motion and performance — the audit, and the full visual pass

**Files:**
- Modify: `tools/verify-cld-practice.js` — a reduced-motion frame-stability check, and an informational paint-cost print
- Modify: `js/games/cld.js` / `js/games/cld-art.js` — only if the audit finds something

**Interfaces:** none new.

- [ ] **Step 1: Write the checks**

Append to section O:

```js
  // § 4.7 — under reduced motion, two frames of the live floe paint identically:
  // the camera cuts, waves and foam freeze, nothing travels, idle breathing stops.
  (() => {
    const rm = S.window.matchMedia;
    S.window.matchMedia = () => ({ matches: true });
    const A = S.window.CldArt, names = ['water', 'scenery', 'floe', 'berg', 'penguin', 'aim', 'reticle', 'seat', 'meMarker'];
    const frame = () => {
      const log = [], undo = names.map(n => {
        const f = A[n];
        A[n] = function () { log.push(n + JSON.stringify([].slice.call(arguments, 1), (k, x) => (x && x.canvas) ? '<surf>' : x)); return f.apply(this, arguments); };
        return () => { A[n] = f; };
      });
      RUN('cldLoop')(performance.now());
      undo.forEach(u => u());
      return log.join('\n');
    };
    SET('cldPenguins', [{ id: '0-0', ownerIdx: 0, x: 140, y: 180 }, { id: '1-0', ownerIdx: 1, x: 220, y: 180 }]);
    SET('cldBergs', [{ id: 'b1', x: 180, y: 12, r: 16, hits: 2, angle: 0 }]);
    SET('cldFloeRadius', 170); SET('cldPhase', 'aiming'); SET('cldDragging', false); SET('cldMyAims', []);
    RUN('cldInitCanvas()');
    const a = frame(), b = frame();
    ok('reduced motion: consecutive frames paint identically', a === b && a.length > 0);
    S.window.matchMedia = rm;
  })();

  // Informational: paint cost of a crowded frame (16 penguins, 30 chunks). The
  // spec's 60 fps target on the owner's SE is a hardware judgement (§ 4.7) — this
  // number is the baseline to compare against if the SE pass shows jank.
  (() => {
    const c = recCtx(), v = mkView(); v.ctx = c;
    const pens = Array.from({ length: 16 }, (_, i) => ({ id: i + '-0', ownerIdx: i,
      x: 180 + Math.cos(i) * 120, y: 180 + Math.sin(i) * 120 }));
    const bergs = Array.from({ length: 30 }, (_, i) => ({ id: 'b' + i, x: 180 + Math.cos(i / 30 * 6.283) * 179,
      y: 180 + Math.sin(i / 30 * 6.283) * 179, r: 16, hits: 2, angle: i }));
    const m = RUN('cldBuildModel')({ penguins: pens, bergs, radius: 195, iceBreaker: 2, ice: 'slush', slideNo: 1 },
                                   { meIdx: 0, phase: 'aiming', aims: [], clock: 1, floeKey: 'x', floeSeed: 1 });
    RUN('cldViewStep')(v, 0.016, m);
    c.n = 0; RUN('cldDraw')(v, m);
    console.log('          (info) crowded frame: ' + c.n + ' fill/stroke calls');
  })();
```

(`performance` is Node's global. If `cldLoop` needs the sandbox to carry it, add `performance` to `freshSandbox()`.)

- [ ] **Step 2: Run it**

Run: `node tools/verify-cld-practice.js`
If the reduced-motion check fails, diff `a` and `b` to find what travels. The usual culprits are a `t` passed where `m.clock` should be frozen, `Date.now()` in a draw path, or `Math.random()` outside a spawn. Fix it at the source, then re-run.

- [ ] **Step 3: The reduced-motion audit, by reading**

Confirm each of these in the code:
- `cldLoop`, `cldPrLoop` and `cldHowtoLoop` each gate their clock on `cldReducedMotion()`;
- the camera cuts (`cldCamStep`'s `k = 1`) and the Slide camera holds (Phase 1);
- `view.fx.setReduced` runs every frame in `cldViewStep`;
- `A.water`, `A.scenery` and `A.floe` receive `reduced` and freeze on it;
- the `.cld-bark`, `.cld-menu-art` and `.cld-ice-btn` motion is CSS only.

Then emulate `prefers-reduced-motion: reduce` in the **`visual-check`** skill, and watch the floe mid-Slide and the menu: nothing travels, and nothing is left behind.

- [ ] **Step 4: The full visual pass**

Invoke **`visual-check`** over every CLD screen at 375×667, 375×548 and 320×452: menu, Settings, How to Play (Rules, Practice, The Cast), intro, the floe (aiming, Drowned with a reticle, Dive, mid-Slide), result, scoreboard and gameover. Fix what fails. Record the Practice stage heights, and compare them with DD-19's 291 / 269 / 173 px.

- [ ] **Step 5: Run every CLD harness, then commit**

Run: `node tools/verify-cld-physics.js && node tools/verify-cld-loop.js && node tools/verify-cld-practice.js && node tools/verify-cld-loopback.js && node tools/mutate-cld.js && node tools/verify-mp-configs.js && node tools/verify-identity-docs.js && node tools/verify-build-fresh.js`
Run `mutate-cld.js` three times (fx spawns are random, and any flake must surface now).

```bash
git add -A tools/verify-cld-practice.js js/games/cld.js js/games/cld-art.js
git commit -m "test(cld): reduced motion paints a still frame; the crowded-frame paint baseline"
```

---

### Task 9: Release SW v246 and close the docs

**Files:**
- Modify: `sw.js` (`CACHE_NAME`), `CLAUDE.md`, `docs/sw-changelog.md`, `docs/code-map.md`, `docs/game-identities/cld.md` (T9), `docs/implementation-notes/cld-implementation-notes.md` (DD-20), `docs/decision-log.md`, `docs/deferred-work.md`, `.claude/rules/logic-engine.md` (one sentence), `.claude/rules/ui-style.md` (one sentence)

**Interfaces:** none new.

- [ ] **Step 1: The version**

`sw.js`: `const CACHE_NAME = 'sylly-games-v246';`. Confirm `'js/games/cld-art.js'` is in `PRECACHE_URLS` (Task 1). **`MP_PROTOCOL_VERSION` stays `'v245'`**: no packet changed shape or meaning (the § 4.4 check; see Global Constraints).

- [ ] **Step 2: `CLAUDE.md`**

Move the current `**SW v245 — …**` paragraph **verbatim** to the top of `docs/sw-changelog.md`. Write the new entry, ≤ 6 lines:

```markdown
**SW v246 — Cold Shoulder, "looks fun" (29 Sep 2026).** Every CLD pixel is redrawn in the sticker's look
by a new pure module, `js/games/cld-art.js` (`window.CldArt`, precached): inked-watercolour penguins with
nine poses and six faces, a Hunger mood ladder (a frown → fire in the eyes → a glow), a snow-slab floe
that keeps its grooves and splats, ice-cube chunks, a moving Drink and particles. Aim marks are in your
colour, and the cue stick is gone. The floe goes full bleed on an ice shelf. No packet change —
`MP_PROTOCOL_VERSION` stays `'v245'`. Detail: `cld-implementation-notes.md` DD-20.
```

Update the **Load Order** line (`… → shp.js → flw.js → pko.js → cjar.js → cld-art.js → cld.js → comb.js …`). Update the Verification harnesses table: the new CLD practice/loopback counts, the mutate count, and a note that `verify-cld-practice.js` now covers the art module, the seam spy and chrome art, and accepts `CLD_ART_SRC=`. In "Where the suite stands", next to "DYB's dice are procedural (SW v241)", add "and Cold Shoulder's art (SW v246)".

- [ ] **Step 3: `docs/code-map.md`**

Grep for the CLD section (`grep -n "Cold Shoulder\|cld\.js" docs/code-map.md | head`) and read only that slice. Then:
- **Add** `js/games/cld-art.js` and its API (Task 1 Interfaces).
- **Add** these `cld.js` names: `cldArt`, `cldSeedOf`, `cldModelVel`, `cldModelSquash`, `cldModelSnowballs`, `cldModelGone`, `cldViewStep`, `cldFloeQ`, `cldFxEvent`, `cldDrawModelPenguin`, `cldDrawAimLayer`, `cldDrawMarkers`, `cldFloeInsets`, `cldStaticCanvas`, `cldPaintTallyHeads`, `cldPaintVignette`, `cldPaintMenuArt`, `cldPaintIntroArt`, `cldHeadEl`, `cldFishEl`, `cldPaintPodium`.
- **Add** the view fields (`fx`, `floe`, `floeKey`, `trails`, `splat`, `wasResolving`), the model's new fields, and `CLD_HOWTO_FACES`.
- **Remove** `cldPose`, `cldPaintProcedural`, `cldPaintBody`, `cldDrawBerg`, `cldDrawCue`, `CLD_CUE_LEN` and `CLD_CUE_GAP_MAX`.
- **Add** the new element IDs: `cld-floe-hud`, `cld-tally-heads`, `cld-menu-art`, `cld-intro-art`, `cld-podium-art`, `cld-howto-faces`.

- [ ] **Step 4: The identity doc — T9**

Rewrite `docs/game-identities/cld.md` § T9 (Art & Assets, *derived*) so it says:
- the art is procedural and adds zero bytes, drawn by `cld-art.js` (~N KB precached; measure it with `wc -c`);
- the seam is `cldRenderPenguin` → `CldArt.penguin`, and `cldSkinArt` stays a stub, so a skin could still override a pose;
- the look is inked watercolour, the sticker's;
- there are nine poses, six faces and the Hunger ladder;
- the floe surface is ≤ 1,200 px, the particle cap is 420, and DPR is capped at 2;
- CLD needs no core art pack (like DYB's dice).

T7b was paired in Tasks 2, 3 and 7. Run `node tools/verify-identity-docs.js` once more.

- [ ] **Step 5: Implementation notes — DD-20**

Append after DD-19 in `cld-implementation-notes.md` (Design Decisions):
- **Why:** owner items 4, 5 and 7.
- **What changed (owner calls in bold):** the module and its purity; the seam kept; **the Hunger ladder**; the model's derived fields (and that a penguin seated this Slide is drawn in the water from its seat beat, which the v245 model missed); the view-owned floe/fx/trails; the fx hook before the sound throttle; aim marks in the owner's colour; the ice block and **Waddle Off keeping DD-31 parity** (`min-h-14`, not the spec's `min-h-11`); no packet change (the landing event already carried `from`).
- **Found while building it:** whatever the visual passes found.
- **Lesson:** one line.

- [ ] **Step 6: The decision log, the rule files, and deferred work**

- `docs/decision-log.md`, newest on top, about 4 lines: "Procedural art as a game-owned pure module (CLD, SW v246): `js/games/cld-art.js` draws what it's given and reads no game state, like `dyb-dice.js`; the render seam and the model stay in the game. Pointer: `cld-impl-notes` DD-20."
- `.claude/rules/logic-engine.md` § Shared Library Modules, in the "Dice is deliberately NOT shared" paragraph: add one sentence. "Cold Shoulder's art (`js/games/cld-art.js`, SW v246) is the same shape: game-owned and pure, and it moves to `js/lib/` only when a second game draws penguins."
- `.claude/rules/ui-style.md` § Action Button Standard, after the locked-scheme exceptions: add one sentence. "A game may give its **secondary** in-game buttons its own material (CLD's `.cld-ice-btn`, SW v246); CTAs, pills and Decision Modal buttons stay on the suite standard, and a secondary beside a primary still matches its size (DD-31)."
- `docs/deferred-work.md` § Cold Shoulder:
  - item 1: add "judge the v246 art in the hand: the faces at play size, the Hunger ladder's rungs, the floe screen on the shelf, **and the SE's frame rate** (spec § 4.7's 60 fps target; mitigations ready: cache chunk sprites, halve the wavelets, drop the grain)";
  - item 2: "confirm `js/games/cld-art.js` precached too";
  - item 6's last bullet ("the loopback does not execute `cldDraw`"): keep it, and add "the loopback now loads `cld-art.js`, so chrome art runs on 3 devices".

- [ ] **Step 7: Verify everything, then commit**

Run: `node tools/verify-cld-physics.js && node tools/verify-cld-loop.js && node tools/verify-cld-practice.js && node tools/verify-cld-loopback.js && node tools/mutate-cld.js && node tools/verify-mp-configs.js && node tools/verify-mp-reconnect.js && node tools/verify-identity-docs.js && node tools/verify-identity-docs.js --self-test && node tools/verify-build-fresh.js`
Expected: all green. Record the counts in the `CLAUDE.md` harness table (Step 2).

```bash
git add sw.js CLAUDE.md docs/ .claude/rules/logic-engine.md .claude/rules/ui-style.md
git commit -m "release(cld): SW v246 — looks fun; cld-art.js precached; docs closure (DD-20)"
```

---

## After Phase 2

The owner-only checks are `docs/deferred-work.md` § Cold Shoulder items 1–2: the live multi-device session on v246, the offline install check (now including `cld-art.js`), the SE's frame rate, and the feel of the faces, the ladder and the shelf in the hand. Their notes are the next round's intake. The phase-40 gate stays OPEN until items 1–2 pass.
