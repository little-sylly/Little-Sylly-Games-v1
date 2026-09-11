# Controller Stickers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Workshop gains a Stickers tab: a player picks a design from a book, taps the controller to place it — wrapped correctly over the curved shell or flat on an ear — then selects, moves, rotates, scales, deletes and undoes any placement, and it all survives a reload.

**Architecture:** The frozen prototype's placement mathematics (`docs/controller-prototype/sticker-surface.js`) is wrapped unchanged as `js/lib/controller-sticker-surface.js`, exposing `window.StickerSurface` exactly as `controller-body.js` exposes `window.ControllerBody`. `js/controller.js` gains a lazily-built surface instance, a pure placement state machine (no DOM, so a Node harness can drive the whole transition table), a per-texel shell rasteriser, a flat ear rasteriser, and a `stickers` array inside the existing v1 `sylly_controller` payload. The Stickers tab is a second tab in the Workshop panel band that was deliberately left free for it.

**Tech Stack:** Vanilla ES6+, Three.js r128 (vendored), 2D canvas atlases, `localStorage`, Node for the verification harnesses. No build step, no new dependency.

**Spec:** `docs/superpowers/specs/2026-09-11-controller-stickers-design.md` — read it alongside this plan; every task below cites the section it implements.

## Global Constraints

- **Australian English** in all user-facing copy; metric units only. (`CLAUDE.md` § Token Hygiene)
- **Never use the Edit tool for systematic/multi-location changes to `index.html`** — it causes UTF-8 mojibake (Windows-1252 read / UTF-8 write double-encoding). Use a Node.js script with explicit `'utf8'` encoding. `index.html` is **CRLF** throughout — match it or an anchored insert will not find its marker.
- **Never full-read `index.html`** (~515 KB) or `docs/code-map.md` (~132 KB). Grep for the identifier, then offset-Read the slice.
- No build step, no external JS libraries, no additional HTML pages.
- **`CTL_STATE_VERSION` stays at `1`.** Bumping it silently resets every existing player's saved *colours*, not just their stickers. (spec D7)
- **`maxDistort: 0.14`** and the four keep-out discs are caller-supplied and are part of the port. Constructing `StickerSurface` with `{}` compiles, runs, and is silently wrong. (spec § 5.2b)
- **A saved placement's coordinates are used as-is on load.** `plan()` may be re-run for its `ok` flag only; its returned `x`/`y`/`chart` are discarded. (spec § 6)
- Prefix for all new controller symbols is `ctl` — verified free against all twenty game prefixes.
- Commit after every task. Do not push unless the owner asks.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `js/lib/controller-sticker-surface.js` | **create** | The ported placement mathematics. Pure — takes `U`/`ATLAS`/`opt` as arguments, touches no DOM. Exposes `window.StickerSurface`. |
| `data/stickers/manifest.json` | **create** | The flat sticker inventory. Runtime-cached, network-first. |
| `tools/verify-controller-stickers.js` | **create** | Node harness: keep-outs, legality, chart routing, manifest validation, persistence round-trip, bit-stability, the state machine, undo. |
| `js/controller.js` | **modify** | Sticker state, the pure state machine, the manifest loader, the lazy surface, both rasterisers, the Stickers tab, tap-to-place. |
| `tools/verify-controller-state.js` | **modify** | One existing assertion hard-codes the payload's key list and **will fail** once `stickers` is serialised (Task 3). |
| `index.html` | **modify** | The Workshop panel's tab bar and the sticker-editing control row. |
| `sw.js` | **modify** | `PRECACHE_URLS` gains the new lib file; the fetch handler gains the `data/stickers/` prefix; `CACHE_NAME` bumps. |
| `docs/code-map.md`, `CLAUDE.md`, `.claude/rules/logic-engine.md`, `docs/implementation-notes/shared-implementation-notes.md`, `docs/decision-log.md`, `docs/sw-changelog.md` | **modify** | Documentation Integrity Protocol closure (Task 11). |

---

## Plan-level decisions not settled by the spec

Three gaps surfaced while mapping the spec onto the real code. Both are recorded here rather than left to the implementer, and both are called out again at the task that implements them.

**P1 — The atlas grows to 2048 lazily, at the same moment the sticker surface is built.**
`js/controller.js:111` ships `CTL_ATLAS = 1024` with the comment *"The sticker sub-project restores 2048 when it needs the resolution."* A sticker of radius 0.18 on a 4.6-unit-wide body covers ~7.8% of the atlas: 80 px at 1024, 160 px at 2048, against source art of ~512 px. 1024 is visibly soft, so 2048 is needed — but paying 16 MB per atlas for a player who never opens the Stickers tab is exactly what that comment was protecting against. So `CTL_ATLAS` becomes a `let`, starts at 1024, and is raised to 2048 by `ctlEnsureStickerSurface()` before the surface is constructed (the surface and `padPairs` both close over `ATLAS`, so the order is forced). Task 5 implements it.

**P2 — The lobby ornament renders saved stickers, via a deferred build.**
Spec § 5.3 describes stamping `ctlDraft.stickers`, and `ctlDraft` exists only inside the Workshop — read literally, a decorated controller would appear undecorated on the lobby, which is the one place the player actually looks at it. But § 5.2 also guarantees colour-only use never pays the build cost. Both hold if the trigger is *the design*, not *the screen*: `ctlApplyDesign` stamps stickers whenever the design being applied has at least one, and when the surface is not yet built it schedules the build on idle and repaints when it lands. A player with no stickers pays nothing; a player with stickers pays one deferred build, off the critical path, the same way `ctlMountLobby` already defers `buildBody`. Task 10 implements it.

**P3 — Spec § 5.2's seven placement functions become one reducer plus one dispatcher.**
The spec lists `ctlArmSticker` / `ctlDeselectSticker` / `ctlPlaceOrRelocateSticker` /
`ctlPlaceOrRelocateEarSticker` / `ctlDeleteSelectedSticker` / `ctlUndoSticker` and marks the names
"indicative, not binding". They are implemented as actions on `ctlStickerReduce` (Task 4) behind a
single `ctlStickerDispatch` (Task 8), because the spec's own next paragraph asks for the state
machine to be *pure functions over a plain structure* so § 9.1 can assert the transition table with
no DOM — and seven functions that each mutate module state and then repaint cannot be that. The
mapping, for anyone checking the plan against the spec:

| Spec § 5.2 | Here |
|---|---|
| `ctlArmSticker(id)` / `ctlDeselectSticker()` | `{ t: 'bookTap', id }` — one action, because § 7's own rule is that a book tap does all three jobs depending on the tile |
| `ctlPlaceOrRelocateSticker(x, y, back)` | `ctlStickerTap` resolves the tap, then `{ t: 'place' \| 'relocate', rec }` |
| `ctlPlaceOrRelocateEarSticker(uv)` | `ctlPlanEarSticker(uv, …)`, then the same two actions |
| `ctlDeleteSelectedSticker()` | `{ t: 'delete' }` |
| `ctlUndoSticker()` | `{ t: 'undo' }` |
| `ctlStickerArmed` / `ctlStickerSelected` / `ctlStickerHistory` | fields of `ctlStickerState` |
| `ctlRenderStickerBook()` | unchanged — it is the render layer, and stays separate |

---

## Verified reference values

Measured against the real geometry (`buildBody` + `sticker-surface.js` with § 5.2b's options, `ATLAS = 2048`) while writing this plan. The harness code in the tasks below uses these — they are facts about the shipped geometry, not guesses.

| Fact | Value |
|---|---|
| `StickerSurface` build cost | **339 ms** (Node, desktop) |
| `padPairs(4)` cost / size | **4 ms**, 50 360 pairs |
| Body extent | x `-2.300 … 2.300`, y `-2.042 … 0.995` |
| Deepest-inside point | `(1.16, -0.12)`, signed distance 1.019 |
| A flat tangent placement | `(1.16, -0.12)` front, r=0.18 → `{ok:true, chart:'tangent', distortion:0.0000}` |
| A rim wrap | `(2.11, -0.12)` front, r=0.18 → `{ok:true, chart:'rim'}`, anchor snapped to `(2.1957, -0.1070)`, `boxes()` returns **2** sheets |
| An off-body point inside the bounding box | `(0, -0.9)` — the notch between the grips → `reason:'off'` |
| An `edge` refusal | `(-2.22, -1.39)` front at r=**0.28** → `reason:'edge'`; the *same spot* at r=**0.10** is a legal rim wrap |
| The four keep-outs with the real config | all four → `reason:'ring'` |
| The four keep-outs with `{}` | **all four are accepted** — this is the port bug the harness must catch |
| Load path using stored coords (spec § 6) | **exactly 0** drift over 500 iterations |
| Load path re-deriving coords (the bug) | 0.45 atlas texels over 500 iterations at that spot; up to 5.75 texels elsewhere |
| `makeChart(rec)(rec.x, rec.y, rec.back)` | `[0, 0]` for both charts |

---

## Task 1: Port the placement mathematics

Implements spec § 5.1. The module moves into `js/lib/` unchanged and gets a Node harness proving it loads, that the keep-outs are wired, and that legality routes to the right chart.

**Files:**
- Create: `js/lib/controller-sticker-surface.js`
- Create: `tools/verify-controller-stickers.js`
- Modify: `sw.js` (`PRECACHE_URLS`, `CACHE_NAME`), `index.html` (script tag), `CLAUDE.md` (load order)

**Interfaces:**
- Consumes: `docs/controller-prototype/sticker-surface.js` (source, unchanged).
- Produces: `window.StickerSurface.StickerSurface(U, ATLAS, opt)` → an object exposing `field(x,y)`, `point(x,y,back,d)`, `normal(x,y,back)`, `blocked(x,y,back)`, `padPairs(width)`, `outlineAt(s)`, `plainAtlas(x,y,back)`, `toAtlas(x,y,back)`, `fromAtlas(px,py,back)`, `makeChart(st)`, `boxes(st)`, `sheets(st)`, `flatDistortion`, `wrapCap`, `plan(x,y,back,want)`, `gaussK`, `kappaAt`, `outline`, `across`, `acrossInv`, `arcLookup`, `ATF`, `ATB`, `tangentFrame(x,y,back)`.
  `plan()` returns `{ok:true, chart:'rim'|'tangent', size, distortion, x?, y?, wrapped?}` or `{ok:false, reason:'off'|'ring'|'edge'|'curve'}`. **`x`/`y` are present only on the rim branch** — a tangent placement keeps the coordinates the caller passed in.

- [ ] **Step 1: Copy the module and add the browser-global wrapper**

```bash
cp "docs/controller-prototype/sticker-surface.js" "js/lib/controller-sticker-surface.js"
```

The source's final line is:

```js
if (typeof module !== 'undefined') module.exports = { StickerSurface };
```

Replace that single line with the dual export — Node for the harness, `window` for the app, matching how `controller-body.js` already does it:

```js
/* Dual export, same shape as js/lib/controller-body.js: `window` for the app
   (no ES modules anywhere in this project), `module.exports` for the Node
   harnesses, which is what lets tools/verify-controller-stickers.js drive the
   real shipped file rather than a copy of it. */
if (typeof window !== 'undefined') window.StickerSurface = { StickerSurface };
if (typeof module !== 'undefined') module.exports = { StickerSurface };
```

Add this header block above the existing `/* ===` comment at the top of the file:

```js
// ═══════════════════════════════════════════════════════════════════════════
// controller-sticker-surface.js — surface-space sticker placement and
// rasterisation for the 3D controller. Global: window.StickerSurface
//
// Ported unchanged from docs/controller-prototype/sticker-surface.js (frozen
// prototype). Pure: takes geo.userData + the atlas size + an options object as
// arguments, touches no DOM and no THREE.
//
// THE TUNED NUMBERS ARE NOT IN THIS FILE. Every keep-out disc is opt.exclude
// and the distortion tolerance is opt.maxDistort (default 0.10, NOT the tuned
// 0.14). Constructing this with {} compiles, runs, and silently lets stickers
// paint inside the stick-well holes. The real options live in CTL_STICKER_OPT
// in js/controller.js and are asserted by tools/verify-controller-stickers.js.
// ═══════════════════════════════════════════════════════════════════════════
```

- [ ] **Step 2: Write the failing harness**

Create `tools/verify-controller-stickers.js`:

```js
// ═══════════════════════════════════════════════════════════════════════════
// verify-controller-stickers.js — the sticker sub-project's pure layer.
//
//   node tools/verify-controller-stickers.js        (exits 1 on any failure)
//
// Everything here fails silently in the wild if it regresses, which is why it
// is pinned under Node before any pixel is trusted:
//
//   1. THE KEEP-OUTS. They are caller-supplied. A port constructed with {}
//      runs fine and paints stickers inside the stick-well holes.
//   2. CHART ROUTING. makeChart/boxes branch on st.chart, so a misrouted
//      placement renders in the wrong place or on the wrong sheet.
//   3. LOAD BIT-STABILITY. Re-deriving a saved anchor walks it across the
//      shell a fraction of a texel per load — undiagnosable months later.
//   4. THE STATE MACHINE. Written as pure functions precisely so the whole
//      Idle/Armed/Selected table can be driven without a DOM.
// ═══════════════════════════════════════════════════════════════════════════

const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
function ok(cond, label) {
  if (cond) { pass++; }
  else { fail++; console.log('  FAIL  ' + label); }
}

global.window = global;
const THREE = require(path.join(ROOT, 'js/lib/three.min.js'));
require(path.join(ROOT, 'js/lib/controller-body.js'));
const { StickerSurface } = require(path.join(ROOT, 'js/lib/controller-sticker-surface.js'));

console.log('── 1. Module loads and exposes its contract ──');
ok(typeof StickerSurface === 'function', 'StickerSurface is a function');
ok(!!(global.window.StickerSurface && global.window.StickerSurface.StickerSurface),
   'window.StickerSurface.StickerSurface is set for the browser');

const U = global.window.ControllerBody.buildBody(THREE, {}).userData;
const ATLAS = 2048;

// The prototype's exact call-site options (standalone.html:1691). These are
// duplicated here deliberately: the harness must fail if js/controller.js stops
// passing them, so it cannot import them from the file under test.
const OPT = {
  exclude: [{ x: -1.25, y:  0.20, r: 0.33, back: false },
            { x:  1.25, y: -0.85, r: 0.33, back: false },
            { x: -0.84, y:  0.84, r: 0.45, back: true  },
            { x:  0.84, y:  0.84, r: 0.45, back: true  }],
  maxDistort: 0.14,
};

const t0 = Date.now();
const S = StickerSurface(U, ATLAS, OPT);
console.log('  StickerSurface built in ' + (Date.now() - t0) + ' ms (plan recorded 339 ms)');

['field','point','normal','blocked','padPairs','outlineAt','plainAtlas','toAtlas','fromAtlas',
 'makeChart','boxes','sheets','plan','tangentFrame'].forEach(fn =>
  ok(typeof S[fn] === 'function', 'surface exposes ' + fn + '()'));

console.log('── 2. The keep-outs are actually wired (spec § 5.2b) ──');
for (const e of OPT.exclude) {
  const p = S.plan(e.x, e.y, e.back, 0.18);
  ok(p.ok === false && p.reason === 'ring',
     'keep-out (' + e.x + ',' + e.y + ') back=' + e.back + ' refuses with ring, got ' +
     (p.ok ? 'ok' : p.reason));
}
// The assertion that catches a port constructed with {} — without it, all four
// of the above pass trivially against a surface that has no keep-outs at all.
{
  const bare = StickerSurface(U, ATLAS, {});
  const accepted = OPT.exclude.filter(e => bare.plan(e.x, e.y, e.back, 0.18).ok).length;
  ok(accepted === 4,
     'a surface built with {} accepts all four keep-out centres — proving the ' +
     'check above tests the config, not the geometry (got ' + accepted + '/4)');
}

console.log('── 3. Legality routes to the right chart ──');
{
  const flat = S.plan(1.16, -0.12, false, 0.18);
  ok(flat.ok && flat.chart === 'tangent', 'the deep front deck is a flat tangent placement');
  ok(flat.x === undefined && flat.y === undefined,
     'a tangent plan returns NO x/y — the caller keeps the tapped coordinates');

  const rim = S.plan(2.11, -0.12, false, 0.18);
  ok(rim.ok && rim.chart === 'rim', 'near the right rim it wraps');
  ok(typeof rim.x === 'number' && typeof rim.y === 'number',
     'a rim plan returns a snapped anchor');

  ok(S.plan(0, -0.9, false, 0.18).reason === 'off',
     'the notch between the grips is off the body');
  ok(S.plan(9, 9, false, 0.18).reason === 'off', 'far outside the body is off');

  // Size-dependent edge refusal — spec § 12.3. The same spot takes a small
  // sticker and refuses a large one, which is the whole point of the rule.
  ok(S.plan(-2.22, -1.39, false, 0.28).reason === 'edge',
     'a large sticker on the lower-left rim refuses with edge');
  const small = S.plan(-2.22, -1.39, false, 0.10);
  ok(small.ok && small.chart === 'rim',
     'the SAME spot takes a small sticker as a rim wrap');
}

console.log('── 4. Charts accept a persisted record verbatim ──');
{
  const tangent = { x: 1.16, y: -0.12, back: false, rot: 0.3, size: 0.18, chart: 'tangent' };
  const rimRec  = { x: 2.1957, y: -0.1070, back: false, rot: 0, size: 0.18, chart: 'rim' };
  ok(S.boxes(tangent).length === 1, 'a tangent placement covers one sheet');
  ok(S.boxes(rimRec).length === 2, 'a rim placement covers both sheets');
  for (const [label, rec] of [['tangent', tangent], ['rim', rimRec]]) {
    const c = S.makeChart(rec)(rec.x, rec.y, rec.back);
    ok(c && Math.abs(c[0]) < 1e-6 && Math.abs(c[1]) < 1e-6,
       'the ' + label + ' chart returns [0,0] at its own anchor');
  }
  for (const b of S.boxes(rimRec)) {
    ok(Number.isInteger(b.x0) && Number.isInteger(b.y0) &&
       Number.isInteger(b.x1) && Number.isInteger(b.y1),
       'box bounds are integers (a fractional bound scatters the paint)');
  }
}

console.log('── 5. padPairs is computed and non-empty ──');
{
  const PAD = S.padPairs(4);
  ok(PAD && PAD.dst && PAD.src, 'padPairs(4) returns a dst/src pair');
  ok(PAD.dst.length === PAD.src.length, 'the pair arrays are the same length');
  ok(PAD.dst.length > 1000, 'it found a real number of seam texels, got ' + PAD.dst.length);
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
```

- [ ] **Step 3: Run it and confirm it fails without the module**

Run: `node tools/verify-controller-stickers.js`
Expected before Step 1's file exists: `Cannot find module '.../js/lib/controller-sticker-surface.js'`.
If Step 1 is already done, run it now, then deliberately break it once: temporarily change `OPT` in the harness to `{}` and confirm section 2 reports four failures. Restore it.

- [ ] **Step 4: Run it green**

Run: `node tools/verify-controller-stickers.js`
Expected: `N passed, 0 failed`, exit 0, and the build time printed near 339 ms.

- [ ] **Step 5: Register the file with the service worker and the page**

In `sw.js`, add the new lib beside `controller-body.js` in `PRECACHE_URLS` (it is app code, precached like every other `js/lib/` file):

```js
  'js/lib/three.min.js',
  'js/lib/controller-body.js',
  'js/lib/controller-sticker-surface.js',
```

Bump `CACHE_NAME` at `sw.js:4`:

```js
const CACHE_NAME = 'sylly-games-v229';
```

Add the script tag to `index.html` immediately after the `controller-body.js` tag. Use a Node script, never the Edit tool, and match CRLF:

```bash
node -e "
const fs=require('fs');
const p='index.html';
let s=fs.readFileSync(p,'utf8');
const anchor='<script src=\"js/lib/controller-body.js\"></script>';
if(s.indexOf(anchor)<0) throw new Error('anchor not found');
if(s.indexOf('controller-sticker-surface.js')>=0) throw new Error('already present');
s=s.replace(anchor, anchor+'\r\n  <script src=\"js/lib/controller-sticker-surface.js\"></script>');
fs.writeFileSync(p,s,'utf8');
console.log('ok');
"
```

Then update `CLAUDE.md` § Load Order to name the new file after `controller-body.js`.

- [ ] **Step 6: Commit**

```bash
git add js/lib/controller-sticker-surface.js tools/verify-controller-stickers.js sw.js index.html CLAUDE.md
git commit -m "feat(controller): port the sticker placement mathematics into js/lib

Wrapped unchanged from the frozen prototype; the tuned keep-outs and distortion
tolerance stay caller-supplied in controller.js. The harness asserts a surface
built with {} accepts all four keep-out centres, so the check is testing the
config rather than the geometry.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---
## Task 2: The sticker inventory — manifest, caching contract, loader

Implements spec D1, § 5.1 and § 8. A flat manifest (the `data/music/` shape) under a packs-style caching contract (network-first JSON, cache-first images, no version bump to add a sticker).

**Files:**
- Create: `data/stickers/manifest.json`
- Modify: `sw.js` (fetch handler — one more matched prefix, no new logic)
- Modify: `js/controller.js` (loader + validation, in the PURE half above the `// ══ RENDERER ══` marker)
- Modify: `tools/verify-controller-stickers.js` (manifest validation section)

**Interfaces:**
- Consumes: nothing from Task 1 at runtime; the harness file it extends.
- Produces:
  - `ctlValidateManifest(raw)` → `Array<{id, label, image, unlocked}>`. Pure, total, never throws. Drops any entry that is not an object, or whose `id`/`label`/`image` is not a non-empty string; coerces `unlocked` to a boolean defaulting to `true`; drops duplicate `id`s keeping the first.
  - `ctlLoadStickerManifest()` → `Promise<Array>`, resolving to `[]` on any failure. Populates the module-level `ctlStickerManifest`.
  - `ctlStickerManifest` — `null` until the first load resolves, an array thereafter.
  - `CTL_STICKER_DIR` — `'data/stickers/'`.

- [ ] **Step 1: Write the manifest**

Create `data/stickers/manifest.json`. `unlocked: true` on every entry from day one — the achievements sub-project changes what *sets* this field, not the schema (spec D3):

```json
{ "stickers": [
  { "id": "banana",   "label": "Banana",   "image": "banana.png",   "unlocked": true },
  { "id": "computer", "label": "Computer", "image": "computer.png", "unlocked": true },
  { "id": "pan",      "label": "Pan",      "image": "pan.png",      "unlocked": true }
] }
```

Confirm the three images are already in place and the names match:

```bash
ls data/stickers/
```
Expected: `banana.png  computer.png  manifest.json  pan.png`

- [ ] **Step 2: Write the failing manifest-validation tests**

Append to `tools/verify-controller-stickers.js`, before the final summary lines. This section needs `ctlValidateManifest` out of `js/controller.js`'s pure half, loaded the way `verify-controller-state.js` already does it — add this loader near the top of the harness, just after the `ok()` helper:

```js
const fs = require('fs');
const vm = require('vm');

// js/controller.js's pure half, evaluated with no DOM — the same cut
// verify-controller-state.js uses. CTL_SRC= points at another copy so a
// pre-fix version can be driven through these checks.
const CTL_SRC = process.env.CTL_SRC
  ? path.resolve(process.env.CTL_SRC)
  : path.join(ROOT, 'js/controller.js');

function loadCtlPure(storeInitial) {
  const map = Object.assign({}, storeInitial);
  const store = {
    _map: map,
    getItem(k) { return k in map ? map[k] : null; },
    setItem(k, v) { map[k] = String(v); },
    removeItem(k) { delete map[k]; },
  };
  const sandbox = { localStorage: store, console, Math, JSON, Date };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  const full = fs.readFileSync(CTL_SRC, 'utf8');
  const cut = full.indexOf('// ══ RENDERER ══');
  if (cut < 0) throw new Error('js/controller.js is missing its "// ══ RENDERER ══" marker');
  // const/let at top level never become own properties of the context object,
  // so each symbol under test is copied onto `window` explicitly.
  vm.runInContext(full.slice(0, cut) +
    '\nwindow.ctlValidateManifest = ctlValidateManifest;' +
    '\nwindow.ctlValidateStickers = ctlValidateStickers;' +
    '\nwindow.ctlStickerReduce = ctlStickerReduce;' +
    '\nwindow.CTL_STICKER_OPT = CTL_STICKER_OPT;',
    sandbox, { filename: 'controller-pure' });
  return { sandbox, store };
}
```

Then the section itself:

```js
console.log('── 6. Manifest validation is total (spec § 5.1) ──');
{
  const { sandbox } = loadCtlPure();
  const V = sandbox.ctlValidateManifest;

  const good = { stickers: [
    { id: 'banana', label: 'Banana', image: 'banana.png', unlocked: true },
    { id: 'pan',    label: 'Pan',    image: 'pan.png',    unlocked: true },
  ] };
  ok(V(good).length === 2, 'a well-formed manifest keeps both entries');
  ok(V(good)[0].id === 'banana', 'order is preserved');

  const cases = [
    ['null',                 null],
    ['a bare array',         []],
    ['a number',             7],
    ['a string',             'stickers'],
    ['no stickers key',      { things: [] }],
    ['stickers not an array',{ stickers: {} }],
  ];
  for (const [label, value] of cases) {
    let out = null, threw = null;
    try { out = V(value); } catch (e) { threw = e; }
    ok(!threw, 'validating ' + label + ' does not throw');
    ok(Array.isArray(out) && out.length === 0, 'validating ' + label + ' yields []');
  }

  const messy = { stickers: [
    null,                                                       // dropped
    7,                                                          // dropped
    { label: 'No id', image: 'x.png' },                         // dropped: no id
    { id: 'noimg', label: 'No image' },                         // dropped: no image
    { id: 'nolabel', image: 'x.png' },                          // dropped: no label
    { id: '', label: 'Empty id', image: 'x.png' },              // dropped: empty id
    { id: 'ok1', label: 'Fine', image: 'ok1.png' },             // kept, unlocked defaults true
    { id: 'ok1', label: 'Duplicate', image: 'other.png' },      // dropped: duplicate id
    { id: 'ok2', label: 'Locked', image: 'ok2.png', unlocked: false }, // kept, unlocked false
  ] };
  const out = V(messy);
  ok(out.length === 2, 'a messy manifest keeps exactly the two valid entries, got ' + out.length);
  ok(out[0].id === 'ok1' && out[0].unlocked === true, 'unlocked defaults to true');
  ok(out[1].id === 'ok2' && out[1].unlocked === false, 'an explicit unlocked:false is kept');
  ok(out.filter(e => e.id === 'ok1').length === 1, 'the duplicate id is dropped, first wins');
}

console.log('── 7. The shipped manifest is valid ──');
{
  const { sandbox } = loadCtlPure();
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/stickers/manifest.json'), 'utf8'));
  const out = sandbox.ctlValidateManifest(raw);
  ok(out.length === raw.stickers.length,
     'every entry in the shipped manifest survives validation (' +
     out.length + '/' + raw.stickers.length + ')');
  for (const e of out) {
    ok(fs.existsSync(path.join(ROOT, 'data/stickers', e.image)),
       'the image named by "' + e.id + '" exists on disk: ' + e.image);
  }
}
```

- [ ] **Step 3: Run it to verify it fails**

Run: `node tools/verify-controller-stickers.js`
Expected: FAIL — `ctlValidateManifest is not a function` (the vm copy line throws a `ReferenceError`), because Step 4 has not written it yet.

- [ ] **Step 4: Write the loader and validator**

In `js/controller.js`, in the **pure half** (above the `// ══ RENDERER ══` marker at line 96), after the Konami adapter block:

```js
// ── The sticker inventory ────────────────────────────────────────────────────
/* Runtime-cached, never precached — a sticker ships by dropping a PNG in the
   folder and adding one manifest line, with no sw.js edit and no CACHE_NAME
   bump. Same contract as data/packs/ and data/music/, and the opposite of
   data/art/'s precached-and-version-bumped one, which is for default art that
   IS part of the app version. See logic-engine.md § PWA Guardian.

   The file shape is data/music/'s — one flat manifest — rather than
   data/packs/'s folder-per-item + registry.json: a pack carries a whole
   settings/word-list config, a sticker carries four fields. */
const CTL_STICKER_DIR = 'data/stickers/';

let ctlStickerManifest = null;   // null until the first load resolves

/* Total by construction, same defensive shape as ctlReadDesign. Anything
   malformed becomes a DROPPED ENTRY, never a throw and never a partial record
   the renderer would later trip over. `unlocked` is reserved for the
   achievements sub-project (spec D3) and defaults to true: today every sticker
   is free to everyone, exactly like every colour. */
function ctlValidateManifest(raw) {
  const out = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  if (!Array.isArray(raw.stickers)) return out;
  const seen = new Set();
  for (const e of raw.stickers) {
    if (!e || typeof e !== 'object' || Array.isArray(e)) continue;
    const str = v => typeof v === 'string' && v.length > 0;
    if (!str(e.id) || !str(e.label) || !str(e.image)) continue;
    if (seen.has(e.id)) continue;          // first occurrence wins
    seen.add(e.id);
    out.push({ id: e.id, label: e.label, image: e.image, unlocked: e.unlocked !== false });
  }
  return out;
}

/* One fetch for the life of the page. Every failure path — offline before the
   first fetch, a 404, malformed JSON — resolves to an empty inventory, which
   renders as a book with nothing in it rather than an error on a screen the
   player reached by tapping a toy. */
function ctlLoadStickerManifest() {
  if (ctlStickerManifest) return Promise.resolve(ctlStickerManifest);
  return fetch(CTL_STICKER_DIR + 'manifest.json')
    .then(r => r.ok ? r.json() : null)
    .catch(() => null)
    .then(raw => (ctlStickerManifest = ctlValidateManifest(raw)));
}

function ctlStickerById(id) {
  if (!ctlStickerManifest) return null;
  for (const e of ctlStickerManifest) if (e.id === id) return e;
  return null;
}
```

- [ ] **Step 5: Run the tests green**

Run: `node tools/verify-controller-stickers.js`
Expected: sections 6 and 7 pass; total still `0 failed`.

- [ ] **Step 6: Add the caching prefix to the service worker**

In `sw.js`, immediately after the `data/music/` block's closing `return;` and before the "Everything else" fallback, add the third prefix. It is the same split as the two above it — a copy, not new logic:

```js
  // Stickers (data/stickers/) — runtime cache, no precache, no version bump.
  // Same contract as data/packs/ and data/music/: the owner adds stickers as
  // they are drawn, and a new one must not cost a service-worker release.
  // js/lib/controller-sticker-surface.js IS precached — that is app code, and
  // app code is part of the app version. The art is not.
  if (url.pathname.includes('/data/stickers/')) {
    if (url.pathname.endsWith('.json')) {
      // Manifest: network-first, so a newly-drawn sticker is discovered on the
      // next online load; the cache covers offline.
      event.respondWith(
        fetch(event.request).then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
          return res;
        }).catch(() => caches.match(event.request))
      );
    } else {
      // Art: cache-first — fetched once, then free.
      event.respondWith(
        caches.match(event.request).then(cached => cached || fetch(event.request).then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
          return res;
        }))
      );
    }
    return;
  }
```

Also extend the comment block at `sw.js:51` (which currently says only packs are excluded) to name `data/stickers/` alongside them.

- [ ] **Step 7: Verify the service worker still parses**

Run: `node --check sw.js && node --check js/controller.js && node tools/verify-controller-stickers.js`
Expected: no syntax errors, harness green.

- [ ] **Step 8: Commit**

```bash
git add data/stickers/manifest.json sw.js js/controller.js tools/verify-controller-stickers.js
git commit -m "feat(controller): sticker manifest, loader and runtime-caching contract

Flat manifest in the data/music/ shape under the data/packs/ caching contract:
network-first JSON, cache-first art, no CACHE_NAME bump to add a sticker. The
validator is total — malformed entries drop, never throw — and reserves
unlocked for the achievements sub-project.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: Persist placements inside the v1 payload

Implements spec D2, D7 and § 6. The `stickers` array joins the four colour fields in the **same v1 object** — no version bump, because bumping it resets every existing player's saved colours.

**This task breaks an existing assertion on purpose.** `tools/verify-controller-state.js:107` asserts the payload's keys are exactly `buttons,ears,plate,shell,v`. That assertion is correct today and wrong the moment `stickers` is written. Update it in Step 4, do not delete it — its job is to catch a field arriving unnoticed.

**Files:**
- Modify: `js/controller.js` — `ctlReadDesign`, `ctlWriteDesign`, `CTL_DEFAULTS`, plus `ctlValidateStickers`
- Modify: `tools/verify-controller-state.js` — the key-list assertion
- Modify: `tools/verify-controller-stickers.js` — persistence sections

**Interfaces:**
- Consumes: `ctlStickerManifest` / `ctlStickerById` (Task 2), `StickerSurface.plan()` (Task 1).
- Produces:
  - `ctlValidateStickers(raw, opts)` → a clean array. `opts` is `{ known, legal }`: `known` is a `Set` of manifest ids (omit to skip rule 2), `legal` is `(rec) => boolean` (omit to skip rule 6). Pure, total, never throws.
  - `ctlReadDesign()` → gains a `stickers` array (always present, `[]` by default).
  - `ctlWriteDesign(design)` → serialises `stickers` alongside the four colours.
  - Shell record: `{ id, surface:'shell', x, y, back, rot, size, chart }`.
  - Ear record: `{ id, surface:'earL'|'earR', u, v, r, rot }`.
  - `CTL_EAR_MAX_R = 0.26`.

- [ ] **Step 1: Write the failing persistence tests**

Append to `tools/verify-controller-stickers.js`:

```js
console.log('── 8. Placement validation (spec § 6, rules 1-7) ──');
{
  const { sandbox } = loadCtlPure();
  const V = sandbox.ctlValidateStickers;
  const known = new Set(['banana', 'computer', 'pan']);

  ok(Array.isArray(V(null, { known })) && V(null, { known }).length === 0,
     'a non-array resolves to []');
  ok(V('nope', { known }).length === 0, 'a string resolves to []');

  const shell = { id: 'banana', surface: 'shell', x: 1.16, y: -0.12, back: false,
                  rot: 0.3, size: 0.18, chart: 'tangent' };
  const ear   = { id: 'pan', surface: 'earL', u: 0.5, v: 0.6, r: 0.2, rot: 0 };
  ok(V([shell, ear], { known }).length === 2, 'two well-formed entries survive');

  // rule 1 — missing id or surface
  ok(V([{ surface: 'shell', x: 0, y: 0, back: false, rot: 0, size: 0.18, chart: 'tangent' }],
       { known }).length === 0, 'rule 1: an entry with no id is dropped');
  ok(V([Object.assign({}, shell, { surface: 'elbow' })], { known }).length === 0,
     'rule 1: an unknown surface is dropped');

  // rule 2 — id not in the manifest
  ok(V([Object.assign({}, shell, { id: 'retired' })], { known }).length === 0,
     'rule 2: an id absent from the manifest is dropped');
  ok(V([Object.assign({}, shell, { id: 'retired' })], {}).length === 1,
     'rule 2 is skipped when no known-set is supplied');

  // rule 3 — non-finite numbers
  for (const bad of [NaN, Infinity, -Infinity, 'x', null, undefined]) {
    ok(V([Object.assign({}, shell, { x: bad })], { known }).length === 0,
       'rule 3: a non-finite x (' + String(bad) + ') is dropped');
  }

  // rule 4 — chart must be exactly rim or tangent, never guessed
  ok(V([Object.assign({}, shell, { chart: 'rim' })], { known }).length === 1,
     'rule 4: chart rim is accepted');
  for (const bad of ['flat', '', undefined, null, 0]) {
    ok(V([Object.assign({}, shell, { chart: bad })], { known }).length === 0,
       'rule 4: chart "' + String(bad) + '" is dropped, never guessed');
  }

  // rule 5 — one design, one placement (D2), enforced on READ
  const dup = V([shell, Object.assign({}, shell, { x: 0.5 })], { known });
  ok(dup.length === 1, 'rule 5: a duplicate id keeps only one entry');
  ok(dup[0].x === 1.16, 'rule 5: the FIRST occurrence is the one kept');
  const crossSurface = V([shell, { id: 'banana', surface: 'earR', u: 0.5, v: 0.5, r: 0.2, rot: 0 }],
                         { known });
  ok(crossSurface.length === 1,
     'rule 5: the cap is per design across the WHOLE controller, shell and ears together');

  // rule 6 — legality, ok flag only
  ok(V([shell], { known, legal: () => false }).length === 0,
     'rule 6: an entry the legality probe rejects is dropped');
  ok(V([shell], { known, legal: () => true })[0].x === 1.16,
     'rule 6: a legal entry keeps its STORED x — the probe cannot move it');

  // rule 7 — ear radius re-clamped
  const big = V([Object.assign({}, ear, { r: 5 })], { known })[0];
  ok(big && Math.abs(big.r - 0.26) < 1e-9,
     'rule 7: an oversized ear radius is re-clamped to 0.26, got ' + (big && big.r));
  ok(V([Object.assign({}, ear, { r: -1 })], { known }).length === 0,
     'rule 7: a non-positive ear radius is dropped');
  ok(V([Object.assign({}, ear, { u: 2 })], { known }).length === 0,
     'rule 7: an out-of-range ear uv is dropped');

  // the shape that comes back is the shape the renderer consumes
  const clean = V([shell, ear], { known });
  ok(Object.keys(clean[0]).sort().join(',') === 'back,chart,id,rot,size,surface,x,y',
     'a clean shell record carries exactly its eight fields, got ' +
     Object.keys(clean[0]).sort().join(','));
  ok(Object.keys(clean[1]).sort().join(',') === 'id,r,rot,surface,u,v',
     'a clean ear record carries exactly its six fields, got ' +
     Object.keys(clean[1]).sort().join(','));
}

console.log('── 9. Persistence round-trip, no version bump (spec D7) ──');
{
  const { sandbox, store } = loadCtlPure();
  sandbox.ctlStickerManifest = [
    { id: 'banana', label: 'Banana', image: 'banana.png', unlocked: true },
    { id: 'pan',    label: 'Pan',    image: 'pan.png',    unlocked: true },
  ];
  const design = {
    shell: '#A855F7', plate: '#9333EA', ears: '#14B8A6', buttons: '#18181B',
    stickers: [
      { id: 'banana', surface: 'shell', x: 1.16, y: -0.12, back: false,
        rot: 0.3, size: 0.18, chart: 'tangent' },
      { id: 'pan', surface: 'earL', u: 0.5, v: 0.6, r: 0.2, rot: 0 },
    ],
  };
  sandbox.ctlWriteDesign(design);
  const parsed = JSON.parse(store._map['sylly_controller']);
  ok(parsed.v === 1, 'the payload is STILL v:1 — no version bump');
  ok(Array.isArray(parsed.stickers) && parsed.stickers.length === 2,
     'both placements are serialised');
  ok(parsed.stickers[0].chart === 'tangent',
     'chart is PERSISTED, not re-derived (spec § 6)');

  const back = loadCtlPure(store._map);
  back.sandbox.ctlStickerManifest = sandbox.ctlStickerManifest;
  const read = back.sandbox.ctlReadDesign();
  ok(read.shell === design.shell && read.buttons === design.buttons,
     'the colours survive alongside the stickers');
  ok(read.stickers.length === 2, 'both placements read back');
  ok(read.stickers[0].x === 1.16 && read.stickers[0].chart === 'tangent',
     'the shell placement reads back identically');
  ok(read.stickers[1].r === 0.2 && read.stickers[1].surface === 'earL',
     'the ear placement reads back identically');

  // A design saved before stickers existed
  const old = loadCtlPure({ sylly_controller:
    '{"v":1,"shell":"#A855F7","plate":"#9333EA","ears":"#14B8A6","buttons":"#18181B"}' });
  const d = old.sandbox.ctlReadDesign();
  ok(Array.isArray(d.stickers) && d.stickers.length === 0,
     'a pre-sticker payload reads back with an empty stickers array, not undefined');
  ok(d.shell === '#A855F7', 'and its colours are untouched');
}

console.log('── 10. The load path is bit-stable (spec § 6, the slow-creep bug) ──');
{
  // The rim branch's crest snap is not exactly idempotent, so re-planning a
  // saved anchor walks it across the shell — measured at up to 5.75 atlas
  // texels over 200 loads, monotonically. The spec's fix is to read plan()'s
  // ok flag and DISCARD its coordinates. This proves the shipped read does that.
  const { sandbox } = loadCtlPure();
  const known = new Set(['banana']);
  const seed = S.plan(2.11, -0.12, false, 0.18);
  ok(seed.ok && seed.chart === 'rim', 'the seed placement is a rim wrap');

  let rec = [{ id: 'banana', surface: 'shell', x: seed.x, y: seed.y, back: false,
               rot: 0, size: seed.size, chart: seed.chart }];
  const first = JSON.stringify(rec[0]);
  const legal = r => S.plan(r.x, r.y, r.back, r.size).ok;
  for (let i = 0; i < 500; i++) rec = sandbox.ctlValidateStickers(rec, { known, legal });
  ok(rec.length === 1, 'the placement survives 500 load cycles');
  ok(JSON.stringify(rec[0]) === first,
     'and is BYTE-IDENTICAL after 500 loads — no anchor drift');

  // The contrast: the re-deriving version this replaced does move.
  let bad = { x: seed.x, y: seed.y, back: false, size: seed.size, chart: seed.chart };
  for (let i = 0; i < 500; i++) {
    const p = S.plan(bad.x, bad.y, bad.back, bad.size);
    if (!p.ok) break;
    if (p.x !== undefined) bad.x = p.x;
    if (p.y !== undefined) bad.y = p.y;
  }
  ok(bad.x !== seed.x || bad.y !== seed.y,
     'sanity: re-deriving the anchor DOES move it — the check above is real');
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node tools/verify-controller-stickers.js`
Expected: FAIL — `ctlValidateStickers is not a function`.

- [ ] **Step 3: Write the validator and extend read/write**

In `js/controller.js`'s pure half. First extend the defaults at line 24-25 — note `stickers` is **not** added to `CTL_GROUPS` (that array drives the colour-swatch UI and the hex validator loop):

```js
const CTL_DEFAULTS = { shell: '#a97fd6', plate: '#9670c8', ears: '#a97fd6', buttons: '#8f66c4' };
const CTL_GROUPS = ['shell', 'plate', 'ears', 'buttons'];

/* The ear crown is 0.36 by 0.52 and its outer 0.075 is bevel, so a sticker is
   held to what will actually lie flat on it. */
const CTL_EAR_MAX_R = 0.26;
const CTL_SURFACES = ['shell', 'earL', 'earR'];
```

Then the validator, after `ctlStickerById`:

```js
/* Placement validation — spec § 6, rules 1-7. Total by construction, same
   defensive shape the colour read already uses: this runs on the app's front
   door, and a hand-edited or half-written localStorage value must yield a
   controller, never a throw.

   The two optional probes are injected rather than reached for, so this stays
   pure and the harness can drive every rule under Node with no geometry:
     known — a Set of manifest ids; omit to skip rule 2
     legal — (rec) => boolean; omit to skip rule 6

   Rule 6 is the subtle one. plan() is consulted for its `ok` flag ONLY and its
   returned coordinates are thrown away. Feeding them back moves the anchor a
   fraction of a texel per load, monotonically, and a sticker that creeps
   across the shell over months is close to undiagnosable after the fact. */
function ctlValidateStickers(raw, opts) {
  const out = [];
  if (!Array.isArray(raw)) return out;
  const known = opts && opts.known;
  const legal = opts && opts.legal;
  const num = v => typeof v === 'number' && isFinite(v);
  const seen = new Set();

  for (const e of raw) {
    if (!e || typeof e !== 'object' || Array.isArray(e)) continue;          // 1
    if (typeof e.id !== 'string' || !e.id) continue;                        // 1
    if (CTL_SURFACES.indexOf(e.surface) < 0) continue;                      // 1
    if (known && !known.has(e.id)) continue;                                // 2
    if (seen.has(e.id)) continue;                                           // 5 (first wins)

    if (e.surface === 'shell') {
      if (!num(e.x) || !num(e.y) || !num(e.size) || !num(e.rot)) continue;  // 3
      if (e.size <= 0) continue;                                            // 3
      if (e.chart !== 'rim' && e.chart !== 'tangent') continue;             // 4 — never guessed
      const rec = { id: e.id, surface: 'shell', x: e.x, y: e.y,
                    back: e.back === true, rot: e.rot, size: e.size, chart: e.chart };
      if (legal && !legal(rec)) continue;                                   // 6 — ok flag only
      seen.add(e.id); out.push(rec);
    } else {
      if (!num(e.u) || !num(e.v) || !num(e.r) || !num(e.rot)) continue;     // 3
      if (e.r <= 0) continue;                                               // 7
      if (e.u < 0 || e.u > 1 || e.v < 0 || e.v > 1) continue;               // 7
      seen.add(e.id);
      out.push({ id: e.id, surface: e.surface, u: e.u, v: e.v,
                 r: Math.min(e.r, CTL_EAR_MAX_R), rot: e.rot });            // 7 — re-clamped
    }
  }
  return out;
}
```

Extend `ctlReadDesign` — the colour loop is untouched; the stickers read is independent, so a malformed placement array can never cost the player their colours:

```js
function ctlReadDesign() {
  const out = Object.assign({}, CTL_DEFAULTS);
  out.stickers = [];
  try {
    const raw = localStorage.getItem(CTL_STORAGE_KEY);
    if (!raw) return out;
    const o = JSON.parse(raw);
    if (!o || typeof o !== 'object' || Array.isArray(o)) return out;
    if (o.v !== CTL_STATE_VERSION) return out;
    for (const k of CTL_GROUPS) if (ctlIsHex(o[k])) out[k] = o[k];
    /* Independently validated, so a malformed placement array costs the player
       their stickers and not their colours. The legality probe is only
       available once the surface has been built (it is lazy — spec § 5.2), so
       rule 6 is applied later, by ctlEnsureStickerSurface, rather than skipped:
       see ctlRevalidateStickers below. */
    out.stickers = ctlValidateStickers(o.stickers, {
      known: ctlStickerManifest ? new Set(ctlStickerManifest.map(s => s.id)) : null,
    });
  } catch (_) { /* fall through to the factory design */ }
  return out;
}
```

Extend `ctlWriteDesign`:

```js
function ctlWriteDesign(design) {
  try {
    localStorage.setItem(CTL_STORAGE_KEY, JSON.stringify({
      v: CTL_STATE_VERSION,                       // NOT bumped — see spec D7
      shell:   design.shell,
      plate:   design.plate,
      ears:    design.ears,
      buttons: design.buttons,
      stickers: Array.isArray(design.stickers) ? design.stickers : [],
    }));
  } catch (_) { /* storage unavailable — the session still works, it just won't persist */ }
}
```

- [ ] **Step 4: Update the assertion in the colour harness that this breaks**

`tools/verify-controller-state.js` around line 107 currently reads:

```js
  ok(Object.keys(parsed).sort().join(',') === 'buttons,ears,plate,shell,v',
     'the payload carries exactly v + the four groups, got ' + Object.keys(parsed).sort().join(','));
```

Replace with:

```js
  ok(Object.keys(parsed).sort().join(',') === 'buttons,ears,plate,shell,stickers,v',
     'the payload carries exactly v + the four groups + stickers, got ' +
     Object.keys(parsed).sort().join(','));
```

Keep the assertion rather than loosening it — its job is to catch a field arriving unnoticed, and that job only survives if it stays exact.

- [ ] **Step 5: Run all three harnesses green**

Run:
```bash
node tools/verify-controller-stickers.js && node tools/verify-controller-state.js && node tools/verify-controller-body.js
```
Expected: all three `0 failed`, exit 0. `verify-controller-state.js`'s existing "a future field added by the sticker sub-project must not wipe the colours" case (its `"stickers":[1,2]` payload) must still pass — `1` and `2` are not objects, so both drop and the colours survive.

- [ ] **Step 6: Commit**

```bash
git add js/controller.js tools/verify-controller-stickers.js tools/verify-controller-state.js
git commit -m "feat(controller): persist sticker placements in the v1 payload

No CTL_STATE_VERSION bump: the stickers array joins the four colour fields in
the same v1 object, because bumping resets every existing player's colours.
chart is persisted and stored coordinates are used as-is — re-deriving the
anchor on load walks it up to 5.75 atlas texels over 200 loads.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---
## Task 4: The placement state machine, as pure functions

Implements spec § 5.2 (the separation) and § 7 (the transition table). Written as pure reducers over a plain `{ stickers, armed, selected, history }` structure so the whole table is drivable under Node with no DOM — that separation is the only reason § 9.1 can assert it at all.

**Files:**
- Modify: `js/controller.js` (pure half)
- Modify: `tools/verify-controller-stickers.js`

**Interfaces:**
- Consumes: `ctlValidateStickers` (Task 3).
- Produces: `ctlStickerReduce(state, action)` → a **new** state object; never mutates its input.
  - State: `{ stickers: Array, armed: string|null, selected: number, history: Array }`. `selected` is an index into `stickers`, or `-1`.
  - Actions:
    - `{ t: 'bookTap', id }`
    - `{ t: 'place', rec }` — `rec` is a validated placement record minus `id`
    - `{ t: 'relocate', rec }`
    - `{ t: 'adjust', patch }` — `{rot}` / `{size}` / `{r}` onto the selected entry
    - `{ t: 'hit', index }` — a controller tap that landed on an existing placement; `index` may be `-1` for a miss
    - `{ t: 'delete' }`, `{ t: 'done' }`, `{ t: 'undo' }`
  - `ctlStickerMode(state)` → `'idle' | 'armed' | 'selected'`, derived, never stored.
  - `CTL_STICKER_HISTORY_MAX = 30`.

- [ ] **Step 1: Write the failing state-machine tests**

Append to `tools/verify-controller-stickers.js`:

```js
console.log('── 11. The placement state machine (spec § 7) ──');
{
  const { sandbox } = loadCtlPure();
  const R = sandbox.ctlStickerReduce;
  const M = sandbox.ctlStickerMode;
  const blank = { stickers: [], armed: null, selected: -1, history: [] };
  const shellRec = { surface: 'shell', x: 1.16, y: -0.12, back: false,
                     rot: 0, size: 0.18, chart: 'tangent' };

  ok(M(blank) === 'idle', 'a blank state is Idle');

  // --- book taps: the rule is the same in every state ---
  let s = R(blank, { t: 'bookTap', id: 'banana' });
  ok(M(s) === 'armed' && s.armed === 'banana', 'tapping an unplaced tile arms that design');
  ok(blank.armed === null && blank.stickers.length === 0, 'the reducer did not mutate its input');

  s = R(s, { t: 'bookTap', id: 'banana' });
  ok(M(s) === 'idle', 'tapping the ALREADY armed tile deselects back to Idle');

  s = R(R(blank, { t: 'bookTap', id: 'banana' }), { t: 'bookTap', id: 'pan' });
  ok(M(s) === 'armed' && s.armed === 'pan',
     'a book tap can interrupt an in-progress Arm and jump to another design');

  // --- Armed + a legal spot -> placed, and becomes Selected ---
  s = R(blank, { t: 'bookTap', id: 'banana' });
  s = R(s, { t: 'place', rec: shellRec });
  ok(s.stickers.length === 1 && s.stickers[0].id === 'banana', 'placing pushes the entry');
  ok(s.stickers[0].x === 1.16 && s.stickers[0].chart === 'tangent',
     'the placement record is stored verbatim');
  ok(M(s) === 'selected' && s.selected === 0, 'after placing, the new entry is Selected');
  ok(s.armed === null, 'and nothing is left armed');

  // --- Selected + a legal spot -> relocates, STAYS Selected ---
  const placed = s;
  s = R(placed, { t: 'relocate', rec: Object.assign({}, shellRec, { x: 0.4 }) });
  ok(s.stickers.length === 1, 'relocating does not add an entry');
  ok(s.stickers[0].x === 0.4, 'the entry moved');
  ok(s.stickers[0].id === 'banana', 'and kept its id');
  ok(M(s) === 'selected' && s.selected === 0, 'it stays Selected after a relocate');

  // --- a book tap on a PLACED tile selects rather than re-arming (D2) ---
  s = R(placed, { t: 'bookTap', id: 'banana' });
  ok(M(s) === 'idle', 'tapping the placed tile that is already selected deselects');
  s = R(R(placed, { t: 'done' }), { t: 'bookTap', id: 'banana' });
  ok(M(s) === 'selected' && s.selected === 0,
     'from Idle, tapping a PLACED tile selects that placement — it never re-arms');
  ok(s.armed === null, 'D2: an already-placed design can never be armed again');

  // --- controller taps that hit or miss an existing placement ---
  s = R(R(placed, { t: 'done' }), { t: 'hit', index: 0 });
  ok(M(s) === 'selected' && s.selected === 0, 'Idle + a hit selects that placement');
  s = R(R(placed, { t: 'done' }), { t: 'hit', index: -1 });
  ok(M(s) === 'idle', 'Idle + a miss is a no-op');

  // --- adjust writes to the selected entry ---
  s = R(placed, { t: 'adjust', patch: { rot: 1.2, size: 0.22 } });
  ok(s.stickers[0].rot === 1.2 && s.stickers[0].size === 0.22,
     'adjust patches the selected entry');
  ok(R(R(placed, { t: 'done' }), { t: 'adjust', patch: { rot: 9 } }).stickers[0].rot === 0,
     'adjust with nothing selected is a no-op');

  // --- delete returns to Idle ---
  s = R(placed, { t: 'delete' });
  ok(s.stickers.length === 0, 'delete removes the entry');
  ok(M(s) === 'idle', 'and returns to Idle');

  // --- done deselects ---
  ok(M(R(placed, { t: 'done' })) === 'idle', 'Done deselects to Idle');
}

console.log('── 12. Undo (spec § 5.2, § 9.1) ──');
{
  const { sandbox } = loadCtlPure();
  const R = sandbox.ctlStickerReduce;
  const blank = { stickers: [], armed: null, selected: -1, history: [] };
  const rec = { surface: 'shell', x: 1.16, y: -0.12, back: false,
                rot: 0, size: 0.18, chart: 'tangent' };

  ok(R(blank, { t: 'undo' }).stickers.length === 0, 'undo on an empty history is a no-op');

  // place -> undo
  let s = R(R(blank, { t: 'bookTap', id: 'banana' }), { t: 'place', rec });
  ok(s.history.length === 1, 'placing pushes one history entry');
  s = R(s, { t: 'undo' });
  ok(s.stickers.length === 0, 'undo removes the placement');
  ok(s.history.length === 0, 'and pops the history');

  // relocate -> undo restores the old position
  let p = R(R(blank, { t: 'bookTap', id: 'banana' }), { t: 'place', rec });
  p = R(p, { t: 'relocate', rec: Object.assign({}, rec, { x: 0.4 }) });
  ok(p.stickers[0].x === 0.4, 'the relocate applied');
  p = R(p, { t: 'undo' });
  ok(p.stickers[0].x === 1.16, 'undo restores the previous position');
  ok(p.stickers.length === 1, 'and does not remove the sticker');

  // delete -> undo restores it at its index
  let d = R(R(blank, { t: 'bookTap', id: 'banana' }), { t: 'place', rec });
  d = R(d, { t: 'bookTap', id: 'pan' });
  d = R(d, { t: 'place', rec: Object.assign({}, rec, { x: -0.5 }) });
  ok(d.stickers.length === 2, 'two placements');
  d = R(R(d, { t: 'done' }), { t: 'hit', index: 0 });
  d = R(d, { t: 'delete' });
  ok(d.stickers.length === 1 && d.stickers[0].id === 'pan', 'the first was deleted');
  d = R(d, { t: 'undo' });
  ok(d.stickers.length === 2, 'undo restores it');
  ok(d.stickers[0].id === 'banana', 'at its original index, not appended');

  // push/pop parity across a long run
  let q = blank;
  for (let i = 0; i < 5; i++) {
    q = R(q, { t: 'bookTap', id: 'id' + i });
    q = R(q, { t: 'place', rec: Object.assign({}, rec, { x: i * 0.1 }) });
  }
  ok(q.stickers.length === 5 && q.history.length === 5, 'five placements, five history entries');
  for (let i = 0; i < 5; i++) q = R(q, { t: 'undo' });
  ok(q.stickers.length === 0 && q.history.length === 0,
     'five undos return to empty — push/pop parity');

  // the stack is bounded
  let big = blank;
  for (let i = 0; i < 60; i++) {
    big = R(big, { t: 'bookTap', id: 'id' + i });
    big = R(big, { t: 'place', rec: Object.assign({}, rec, { x: i * 0.01 }) });
  }
  ok(big.history.length === sandbox.CTL_STICKER_HISTORY_MAX,
     'the history stack is capped at CTL_STICKER_HISTORY_MAX, got ' + big.history.length);
}
```

Add `'\nwindow.ctlStickerMode = ctlStickerMode;'` and `'\nwindow.CTL_STICKER_HISTORY_MAX = CTL_STICKER_HISTORY_MAX;'` to the copy list in `loadCtlPure`.

- [ ] **Step 2: Run it to verify it fails**

Run: `node tools/verify-controller-stickers.js`
Expected: FAIL — `ctlStickerReduce is not a function`.

- [ ] **Step 3: Write the reducer**

In `js/controller.js`'s pure half, after `ctlValidateStickers`:

```js
// ── The placement state machine ──────────────────────────────────────────────
/* Pure reducers over a plain { stickers, armed, selected, history } object,
   deliberately separated from every DOM-touching render call — the same split
   js/lib/physics.js and controller-body.js already establish in this codebase.
   That is what lets tools/verify-controller-stickers.js drive the whole
   Idle/Armed/Selected table under Node with no browser at all.

   Nothing here mutates its input: each action returns a new state. The render
   layer reads the result; it never reaches in and edits a placement directly. */
const CTL_STICKER_HISTORY_MAX = 30;   // a Workshop session, not a document history

function ctlStickerMode(st) {
  if (st.armed) return 'armed';
  if (st.selected >= 0 && st.selected < st.stickers.length) return 'selected';
  return 'idle';
}

/* Snapshot the whole array. It is at most one entry per design in the
   inventory, so a deep copy is a handful of small objects — far cheaper to
   reason about than a per-action inverse patch, and it makes undo of a
   relocate, a delete and a place the single line below. */
function ctlStickerPush(st) {
  const h = st.history.concat([st.stickers.map(s => Object.assign({}, s))]);
  return h.length > CTL_STICKER_HISTORY_MAX ? h.slice(h.length - CTL_STICKER_HISTORY_MAX) : h;
}

function ctlStickerReduce(st, a) {
  const S = st.stickers;
  const next = (patch) => Object.assign({ stickers: S, armed: st.armed,
                                          selected: st.selected, history: st.history }, patch);
  switch (a.t) {
    /* One rule, every state (spec § 7): an unplaced tile arms, a placed tile
       selects, and the tile that is already current deselects. So a book tap
       can interrupt anything to jump to another design, and there is no dead
       state to get stuck in. */
    case 'bookTap': {
      const idx = S.findIndex(s => s.id === a.id);
      if (idx >= 0) {
        return next(st.selected === idx ? { armed: null, selected: -1 }
                                        : { armed: null, selected: idx });
      }
      return next(st.armed === a.id ? { armed: null, selected: -1 }
                                    : { armed: a.id, selected: -1 });
    }

    case 'place': {
      if (!st.armed) return st;
      const history = ctlStickerPush(st);
      const stickers = S.concat([Object.assign({ id: st.armed }, a.rec)]);
      return { stickers, armed: null, selected: stickers.length - 1, history };
    }

    case 'relocate': {
      const i = st.selected;
      if (i < 0 || i >= S.length) return st;
      const history = ctlStickerPush(st);
      const stickers = S.slice();
      stickers[i] = Object.assign({ id: S[i].id }, a.rec);
      return { stickers, armed: null, selected: i, history };
    }

    /* Rotate and size are dragged on a slider, so they deliberately do NOT
       push history on every input event — the Workshop would fill the stack
       with a hundred intermediate values from one gesture. Undo steps over the
       whole adjustment to the last place/relocate/delete, which is the unit a
       player thinks in. */
    case 'adjust': {
      const i = st.selected;
      if (i < 0 || i >= S.length) return st;
      const stickers = S.slice();
      stickers[i] = Object.assign({}, S[i], a.patch);
      return next({ stickers });
    }

    case 'hit':
      return (a.index >= 0 && a.index < S.length)
        ? next({ armed: null, selected: a.index })
        : st;

    case 'delete': {
      const i = st.selected;
      if (i < 0 || i >= S.length) return st;
      const history = ctlStickerPush(st);
      return { stickers: S.slice(0, i).concat(S.slice(i + 1)),
               armed: null, selected: -1, history };
    }

    case 'done':
      return next({ armed: null, selected: -1 });

    case 'undo': {
      if (!st.history.length) return st;
      const stickers = st.history[st.history.length - 1];
      return { stickers, armed: null, selected: -1,
               history: st.history.slice(0, st.history.length - 1) };
    }

    default:
      return st;
  }
}
```

- [ ] **Step 4: Run the tests green**

Run: `node tools/verify-controller-stickers.js`
Expected: sections 11 and 12 pass, total `0 failed`.

- [ ] **Step 5: Commit**

```bash
git add js/controller.js tools/verify-controller-stickers.js
git commit -m "feat(controller): the sticker placement state machine, as pure reducers

Idle/Armed/Selected plus undo, written over a plain object with no DOM, so the
whole transition table is drivable under Node. Slider adjustments deliberately
do not push history: undo steps to the last place/relocate/delete, the unit a
player thinks in.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5: The shell rasteriser — atlas upgrade, bump map, stamping

Implements spec § 5.2b and § 5.3 (shell half), plus **plan decision P1**. This is the first task that puts a sticker on screen.

Three things the shipped `controller.js` deliberately dropped come back together, because none works without the others: the 2048 atlas, the bump atlas, and `padEdges`.

**Files:**
- Modify: `js/controller.js` (renderer half)

**Interfaces:**
- Consumes: `StickerSurface` (Task 1), `ctlStickerById` (Task 2), `ctlValidateStickers` (Task 3).
- Produces:
  - `CTL_STICKER_OPT` — the named constant holding the tuned keep-outs and `maxDistort` (spec § 5.2b).
  - `ctlEnsureStickerSurface()` → `boolean`. Idempotent; raises the atlas to 2048, builds the surface and `ctlStickerPad`, re-validates saved placements against rule 6, repaints. Returns `false` if the body is not built yet.
  - `ctlStickerSurface` — the instance, or `null`.
  - `ctlStickerImage(id)` → `{img, data}` or `null` — lazily decoded, cached in `ctlStickerImages`.
  - `ctlStampShell(rec)` — paints one placement into the colour and bump atlases.
  - `ctlPadEdges(boxes)` — bleeds the atlas seam.
  - `CTL_LIP = 0.055`.

- [ ] **Step 1: Make the atlas size mutable and restore the bump atlas**

At `js/controller.js:111`, replace the `const CTL_ATLAS = 1024;` line and its comment block:

```js
/* CHANGE FROM THE PROTOTYPE (1), NOW CONDITIONAL: 1024 until stickers are
   needed, then 2048.

   A colour-only atlas holds a flat fill and one inset polygon, and a 2048
   square canvas is 16 MB of memory per atlas on a phone for no visible gain.
   But a sticker of radius 0.18 covers about 7.8% of the atlas width — 80 px at
   1024 against source art of ~512 px, which is visibly soft, and 160 px at
   2048, which is not. So the atlas GROWS, once, inside
   ctlEnsureStickerSurface(): a player who only ever recolours never pays for
   the resolution, and a player who places a sticker pays once.

   Everything downstream is expressed in fractions of CTL_ATLAS, so the resize
   is a canvas resize plus a plate-UV rebuild plus a repaint. The order in
   ctlEnsureStickerSurface is forced: the surface and its pad pairs both close
   over the atlas size at construction, so the resize must happen FIRST. */
let CTL_ATLAS = 1024;
const CTL_ATLAS_STICKERS = 2048;
const CTL_EAR_ATLAS = 512;
```

Then extend `ctlBuildAtlases()` to create the bump canvases alongside the colour ones:

```js
/* CHANGE FROM THE PROTOTYPE (3), NOW CONDITIONAL: the bump atlas exists but
   stays black while there are no stickers.

   The prototype pairs each colour atlas with a greyscale height atlas so the
   renderer lights a sticker's edge as a raised lip. A bare shell is height zero
   everywhere, so on a stickerless controller this is a uniformly black texture
   — which costs a canvas but keeps the material contract identical whether or
   not stickers are present, so no material has to be rebuilt when the first one
   lands. bumpScale is deliberately small: this is a sticker on a shell, not a
   puffy dome. */
function ctlBuildAtlases() {
  ctlCanvas = document.createElement('canvas');
  ctlCanvas.width = ctlCanvas.height = CTL_ATLAS;
  ctlCtx = ctlCanvas.getContext('2d', { willReadFrequently: true });
  ctlTex = new THREE.CanvasTexture(ctlCanvas);
  ctlTex.flipY = false; ctlTex.anisotropy = 8; ctlTex.encoding = THREE.sRGBEncoding;

  ctlBumpCanvas = document.createElement('canvas');
  ctlBumpCanvas.width = ctlBumpCanvas.height = CTL_ATLAS;
  ctlBumpCtx = ctlBumpCanvas.getContext('2d', { willReadFrequently: true });
  ctlBumpTex = new THREE.CanvasTexture(ctlBumpCanvas);
  ctlBumpTex.flipY = false; ctlBumpTex.anisotropy = 8;

  ctlEarCanvas = document.createElement('canvas');
  ctlEarCanvas.width = ctlEarCanvas.height = CTL_EAR_ATLAS;
  ctlEarCtx = ctlEarCanvas.getContext('2d', { willReadFrequently: true });
  ctlEarTex = new THREE.CanvasTexture(ctlEarCanvas);
  ctlEarTex.flipY = false; ctlEarTex.anisotropy = 8; ctlEarTex.encoding = THREE.sRGBEncoding;
}
```

Declare the new handles next to the existing ones at line 100, and add the surface/image state:

```js
let ctlCanvas, ctlCtx, ctlTex, ctlEarCanvas, ctlEarCtx, ctlEarTex;
let ctlBumpCanvas, ctlBumpCtx, ctlBumpTex;
let ctlGeo = null;                  // retained: geo.userData is what the surface needs
let ctlStickerSurface = null;       // lazily built — see ctlEnsureStickerSurface
let ctlStickerPad = null;           // padPairs(4), computed once with the surface
const ctlStickerImages = {};        // id -> { img, data } once decoded
```

Retain the geometry in `ctlEnsureBuilt` — change `const geo = ControllerBody.buildBody(THREE, {});` to:

```js
  const geo = ControllerBody.buildBody(THREE, {});
  ctlGeo = geo;                      // the sticker surface needs geo.userData later
```

Attach the bump map to the shell material in `ctlEnsureBuilt`:

```js
  ctlShellMat = new THREE.MeshStandardMaterial({ map: ctlTex, roughness: .52, metalness: .06,
                                                 bumpMap: ctlBumpTex, bumpScale: 0.035 });
```

- [ ] **Step 2: Write the surface builder**

Add to the renderer half, before `ctlRedrawShell`:

```js
// ── Stickers: the surface ────────────────────────────────────────────────────
/* THE TUNED NUMBERS. sticker-surface.js contains none of these — every keep-out
   is opt.exclude and the tolerance is opt.maxDistort (whose default is a
   stricter 0.10). Building the surface with {} compiles, runs, and silently
   lets stickers paint INSIDE the stick-well holes, where they show straight
   through. tools/verify-controller-stickers.js § 2 asserts all four refuse.

   Grips are deliberately NOT a keep-out — that was removed at the owner's
   request because it refused too many spots that felt placeable. Curvature
   alone governs them. Measured consequence: at 0.14 nothing on the body is
   ever refused for curvature (the highest distortion anywhere is 0.0864), so
   maxDistort is currently an inert dial. It is also the ONLY lever for grip
   and ear warping: if a real-device check says the worst spots look too
   stretched, 0.05-0.06 is the useful range — spec § 12.1 tabulates what each
   value costs. */
const CTL_STICKER_OPT = {
  exclude: [{ x: -1.25, y:  0.20, r: 0.33, back: false },   // left stick well
            { x:  1.25, y: -0.85, r: 0.33, back: false },   // right stick well
            { x: -0.84, y:  0.84, r: 0.45, back: true  },   // left ear boss
            { x:  0.84, y:  0.84, r: 0.45, back: true  }],  // right ear boss
  maxDistort: 0.14,
};

/* Idempotent and lazy. Measured at 339 ms on a desktop at 2048; a low-end
   phone is plausibly 3-5x that, which is why it is never on the app's front
   door. Called from the Stickers tab's first open, and from the deferred
   lobby path when a SAVED design already has stickers (see ctlApplyDesign). */
function ctlEnsureStickerSurface() {
  if (ctlStickerSurface) return true;
  if (!ctlBuilt || !ctlGeo || !window.StickerSurface) return false;

  // Order is forced: the surface and its pad pairs both close over the atlas
  // size at construction, so the resize has to land first.
  if (CTL_ATLAS !== CTL_ATLAS_STICKERS) {
    CTL_ATLAS = CTL_ATLAS_STICKERS;
    ctlCanvas.width = ctlCanvas.height = CTL_ATLAS;
    ctlBumpCanvas.width = ctlBumpCanvas.height = CTL_ATLAS;
    ctlBuildPlateUV(ctlGeo);          // plate UVs are in atlas pixels
  }

  ctlStickerSurface = window.StickerSurface.StickerSurface(
    ctlGeo.userData, CTL_ATLAS, CTL_STICKER_OPT);
  ctlStickerPad = ctlStickerSurface.padPairs(4);

  /* Rule 6 of the load validation (spec § 6) needs the surface, which did not
     exist when ctlReadDesign ran. Apply it now to both the live design and any
     open draft — a placement made illegal by a future body-geometry change is
     dropped rather than rendered somewhere invalid. The ok flag ONLY: its
     returned coordinates are discarded, or saved stickers creep. */
  const legal = r => ctlStickerSurface.plan(r.x, r.y, r.back, r.size).ok;
  const known = ctlStickerManifest ? new Set(ctlStickerManifest.map(s => s.id)) : null;
  for (const d of [ctlDesign, ctlDraft]) {
    if (d && Array.isArray(d.stickers)) d.stickers = ctlValidateStickers(d.stickers, { known, legal });
  }

  ctlRedrawShell();
  ctlRedrawEars();
  ctlWake();
  return true;
}
```

- [ ] **Step 3: Write the image cache and the rasteriser**

```js
/* Decoded once per design, held as ImageData so the per-texel loop can sample
   it directly. Bilinear, because a wrapped sticker is magnified where the
   surface turns and nearest-neighbour there looks like a broken JPEG. */
function ctlStickerImage(id) {
  const hit = ctlStickerImages[id];
  if (hit) return hit.data ? hit : null;      // present but still loading
  const entry = ctlStickerById(id);
  if (!entry) return null;
  const rec = { img: new Image(), data: null };
  ctlStickerImages[id] = rec;
  rec.img.onload = () => {
    const c = document.createElement('canvas');
    c.width = rec.img.width; c.height = rec.img.height;
    const cx = c.getContext('2d', { willReadFrequently: true });
    cx.drawImage(rec.img, 0, 0);
    rec.data = cx.getImageData(0, 0, c.width, c.height);
    /* The atlas was painted before this arrived, so repaint now. Placing a
       sticker for the first time in a session goes through here. */
    ctlRedrawShell(); ctlRedrawEars(); ctlWake();
  };
  rec.img.onerror = () => { /* a missing image is simply an absent sticker */ };
  rec.img.src = CTL_STICKER_DIR + entry.image;
  return null;
}

function ctlSampleImage(im, sx, sy, out) {
  const x = Math.max(0, Math.min(im.width - 1.001, sx - 0.5));
  const y = Math.max(0, Math.min(im.height - 1.001, sy - 0.5));
  const x0 = x | 0, y0 = y | 0, tx = x - x0, ty = y - y0, W = im.width, D = im.data;
  for (let k = 0; k < 4; k++) {
    const a = D[(y0 * W + x0) * 4 + k],       b = D[(y0 * W + x0 + 1) * 4 + k];
    const c = D[((y0 + 1) * W + x0) * 4 + k], d = D[((y0 + 1) * W + x0 + 1) * 4 + k];
    out[k] = (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
  }
}

/* LIP is how wide the height ramp is as a fraction of the sticker radius —
   small, because a sticker on paper has a very short edge, not a dome. */
const CTL_LIP = 0.055;

/* The real rasteriser, ported from standalone.html:1886. NOT the stampFlat /
   OLD_WAY debug path, which pasted the sticker into the atlas with drawImage
   and inherited every distortion the atlas parameterisation has; it is not
   ported at all.

   This runs the other way round. For each atlas texel the sticker could touch,
   it asks the surface where that texel is and which part of the sticker lands
   there. Nothing about the atlas layout enters the answer, so the rim roll and
   the grip bulges stop mattering and a sticker running off the front island
   simply continues onto the back one. */
function ctlStampShell(s) {
  const S = ctlStickerSurface;
  if (!S) return;
  const rec = ctlStickerImage(s.id);
  if (!rec) return;                       // not decoded yet; onload repaints
  const im = rec.data;
  const chart = S.makeChart(s), R = s.size, px = [0, 0, 0, 0];
  const eb = R * CTL_LIP, W = im.width, H = im.height, DA = im.data;

  const alphaAt = (a, b) => {
    if (a < -R || a > R || b < -R || b > R) return 0;
    const x = (a / R * 0.5 + 0.5) * W, y = (0.5 - b / R * 0.5) * H;
    const xi = x < 0 ? 0 : (x > W - 1 ? W - 1 : x | 0);
    const yi = y < 0 ? 0 : (y > H - 1 ? H - 1 : y | 0);
    return DA[(yi * W + xi) * 4 + 3] / 255;
  };

  for (const bx of S.boxes(s)) {
    const w = bx.x1 - bx.x0, h = bx.y1 - bx.y0;
    if (w <= 0 || h <= 0) continue;
    const dst = ctlCtx.getImageData(bx.x0, bx.y0, w, h), D = dst.data;
    const bst = ctlBumpCtx.getImageData(bx.x0, bx.y0, w, h), B = bst.data;
    let touched = false;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const xy = S.fromAtlas(bx.x0 + i + 0.5, bx.y0 + j + 0.5, bx.back);
      const c = chart(xy[0], xy[1], bx.back);
      if (!c) continue;
      const o = (j * w + i) * 4;
      ctlSampleImage(im, (c[0] / R * 0.5 + 0.5) * W, (0.5 - c[1] / R * 0.5) * H, px);
      const al = px[3] / 255;
      if (al <= 0.004) continue;     // outside the sticker: atlas and height untouched
      /* Height averaged over a small ring, so the ramp spreads over the lip
         width rather than the one or two texels of the image's own antialiased
         edge — a one-texel cliff makes the bump map sparkle instead of
         catching the light. */
      const hgt = (al + alphaAt(c[0] + eb, c[1]) + alphaAt(c[0] - eb, c[1])
                      + alphaAt(c[0], c[1] + eb) + alphaAt(c[0], c[1] - eb)) / 5;
      const hv = hgt * 255;
      if (hv > B[o]) { B[o] = B[o + 1] = B[o + 2] = hv; B[o + 3] = 255; }  // overlaps keep the taller
      D[o]     = D[o]     * (1 - al) + px[0] * al;
      D[o + 1] = D[o + 1] * (1 - al) + px[1] * al;
      D[o + 2] = D[o + 2] * (1 - al) + px[2] * al;
      D[o + 3] = 255; touched = true;
    }
    if (touched) {
      ctlCtx.putImageData(dst, bx.x0, bx.y0);
      ctlBumpCtx.putImageData(bst, bx.x0, bx.y0);
    }
  }
}

/* Both islands stop dead at the silhouette and the renderer filters texels
   bilinearly, so along the crest it mixes painted texels with the unpainted
   atlas behind them and draws a hard line exactly where the two sheets meet.
   That line is what read as stickers being "cut off at the seam" even when
   they had wrapped correctly. Bleeding the painted edge a few texels outward
   gives the filter something sensible to reach for. Both atlases get it:
   padding only the colours would leave the height map with a cliff at the
   crest, and the renderer lights that cliff as a crease across every wrap. */
function ctlPadEdges(boxes) {
  const PAD = ctlStickerPad;
  if (!PAD || !PAD.dst.length) return;
  const regions = boxes && boxes.length
    ? boxes.map(b => ({ x0: Math.max(0, b.x0 - 12), y0: Math.max(0, b.y0 - 12),
                        x1: Math.min(CTL_ATLAS, b.x1 + 12), y1: Math.min(CTL_ATLAS, b.y1 + 12) }))
    : [{ x0: 0, y0: 0, x1: CTL_ATLAS, y1: CTL_ATLAS }];
  for (const r of regions) {
    const w = r.x1 - r.x0, h = r.y1 - r.y0;
    if (w <= 0 || h <= 0) continue;
    const im = ctlCtx.getImageData(r.x0, r.y0, w, h), D = im.data;
    const bm = ctlBumpCtx.getImageData(r.x0, r.y0, w, h), BD = bm.data;
    for (let i = 0; i < PAD.dst.length; i++) {
      const dy = (PAD.dst[i] / CTL_ATLAS) | 0, dx = PAD.dst[i] - dy * CTL_ATLAS;
      if (dx < r.x0 || dx >= r.x1 || dy < r.y0 || dy >= r.y1) continue;
      const sy = (PAD.src[i] / CTL_ATLAS) | 0, sx = PAD.src[i] - sy * CTL_ATLAS;
      if (sx < r.x0 || sx >= r.x1 || sy < r.y0 || sy >= r.y1) continue;
      const d = ((dy - r.y0) * w + (dx - r.x0)) * 4, s = ((sy - r.y0) * w + (sx - r.x0)) * 4;
      D[d] = D[s]; D[d + 1] = D[s + 1]; D[d + 2] = D[s + 2]; D[d + 3] = 255;
      BD[d] = BD[s]; BD[d + 1] = BD[s + 1]; BD[d + 2] = BD[s + 2]; BD[d + 3] = 255;
    }
    ctlCtx.putImageData(im, r.x0, r.y0);
    ctlBumpCtx.putImageData(bm, r.x0, r.y0);
  }
}
```

- [ ] **Step 4: Wire the stamps into the shell repaint**

Extend `ctlRedrawShell()` — the existing fill and plate polygon are unchanged; the stickers go on after them, and `padEdges` runs last:

```js
function ctlRedrawShell() {
  ctlCtx.fillStyle = ctlDesign.shell;
  ctlCtx.fillRect(0, 0, CTL_ATLAS, CTL_ATLAS);
  // bare shell is height zero; only stickers stand proud of it
  if (ctlBumpCtx) { ctlBumpCtx.fillStyle = '#000'; ctlBumpCtx.fillRect(0, 0, CTL_ATLAS, CTL_ATLAS); }
  if (ctlPlateUV && ctlPlateUV.length) {
    ctlCtx.save();
    ctlCtx.beginPath();
    ctlCtx.moveTo(ctlPlateUV[0][0], ctlPlateUV[0][1]);
    for (let i = 1; i < ctlPlateUV.length; i++) ctlCtx.lineTo(ctlPlateUV[i][0], ctlPlateUV[i][1]);
    ctlCtx.closePath();
    ctlCtx.fillStyle = ctlDesign.plate;
    ctlCtx.fill();
    // the hairline carries the separation, so the two fills do not have to
    ctlCtx.lineWidth = CTL_ATLAS * 0.004;
    ctlCtx.strokeStyle = ctlShade(ctlDesign.plate, -0.14);
    ctlCtx.stroke();
    ctlCtx.restore();
  }
  /* Stickers go on AFTER the plate, so one can straddle the faceplate edge.
     A recolour re-enters here and re-stamps every sticker from scratch, which
     is what lets the die-cut border (Task 6) re-derive against the new shell
     colour for free. */
  if (ctlStickerSurface) {
    for (const s of ctlDesign.stickers || []) if (s.surface === 'shell') ctlStampShell(s);
    ctlPadEdges(null);
    if (ctlBumpTex) ctlBumpTex.needsUpdate = true;
  }
  ctlTex.needsUpdate = true;
}
```

- [ ] **Step 5: Verify — the atlas grows and a sticker lands**

No Node harness reaches pixels, so this is a browser check. Serve the app and drive it with Playwright (the `visual-check` skill's install at `$HOME/.claude-tooling/playwright`):

```js
// scratchpad/check-stamp.js
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('http://localhost:8080/index.html');
  await p.waitForFunction(() => window.ctlEnsureBuilt && ctlEnsureBuilt());
  const out = await p.evaluate(async () => {
    await ctlLoadStickerManifest();
    const before = CTL_ATLAS;
    ctlOpenWorkshop();
    const built = ctlEnsureStickerSurface();
    ctlDraft.stickers = [{ id: 'banana', surface: 'shell', x: 1.16, y: -0.12,
                           back: false, rot: 0, size: 0.18, chart: 'tangent' }];
    ctlDesign.stickers = ctlDraft.stickers;
    ctlRedrawShell();
    // count texels that differ from the flat shell fill
    const d = ctlCtx.getImageData(0, 0, CTL_ATLAS, CTL_ATLAS).data;
    const n = parseInt(ctlDesign.shell.slice(1), 16);
    const sr = (n >> 16) & 255, sg = (n >> 8) & 255, sb = n & 255;
    let diff = 0;
    for (let i = 0; i < d.length; i += 4)
      if (Math.abs(d[i] - sr) + Math.abs(d[i+1] - sg) + Math.abs(d[i+2] - sb) > 24) diff++;
    const bd = ctlBumpCtx.getImageData(0, 0, CTL_ATLAS, CTL_ATLAS).data;
    let lit = 0;
    for (let i = 0; i < bd.length; i += 4) if (bd[i] > 8) lit++;
    return { before, after: CTL_ATLAS, built, diff, lit,
             canvas: ctlCanvas.width, manifest: ctlStickerManifest.length };
  });
  console.log(out, 'pageerrors:', errs);
  await b.close();
})();
```

Expected: `before: 1024`, `after: 2048`, `canvas: 2048`, `built: true`, `manifest: 3`, `diff` in the tens of thousands (a plate polygon plus a sticker), `lit` clearly non-zero (the bump lip), and **no page errors**. If `diff` counts only the plate, the stamp did not run — check that `ctlStickerImage` resolved before the count (add an `await new Promise(r => setTimeout(r, 400))` after the first `ctlRedrawShell`).

- [ ] **Step 6: Take a screenshot and look at it**

```js
await p.evaluate(() => { ctlRotX = 0; ctlRotY = 0; ctlRig.rotation.set(0,0,0);
                         ctlRenderer.render(ctlScene, ctlCamera); });
await p.locator('#ctl-stage canvas').screenshot({ path: 'scratchpad/stamp.png' });
```

Read the image. The sticker must be on the deck, the right way up, not stretched, and not doubled. A sticker that is mirrored or quarter-turned means the chart's a/b roles are swapped — re-check `ctlStampShell` against `standalone.html:1886` line by line rather than adjusting the rotation to compensate.

- [ ] **Step 7: Commit**

```bash
git add js/controller.js
git commit -m "feat(controller): the surface-space shell rasteriser

Restores the three things the colour-only port dropped, together because none
works without the others: the 2048 atlas (grown lazily, so colour-only use
still pays 1024), the bump atlas for the sticker lip, and padEdges for the
atlas seam. Ported from the prototype's real per-texel stamp(), not the
stampFlat debug path.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---
## Task 6: The adaptive die-cut border

Implements spec **D8** and § 12.4. Every sticker gains a thin outline whose colour is chosen **per texel** from the shell pixel already underneath.

**Why this is not decoration.** Measured: all three test stickers are near-white dominant (18–32% of their opaque pixels at ≈`rgb(240,240,239)`), and on six of the twenty shells — FRT, CLD, FLW, GTH, COMB, YGI — the dominant band contrasts at **1.01–1.16:1** against the shell. 1.0:1 is literally the same colour. The bump map does not rescue it: `if (al <= 0.004) continue;` means the lip ramp exists only *inside* the sticker's own alpha, so there is no outward halo — on a matching shell you get a faint relief outline around a flat blank plateau.

**This is the one part of the sub-project with no prototype precedent.** Everything else is porting reviewed code; this is new rendering, and no Node harness can see it. Expect to iterate on Step 4's screenshot.

**Files:**
- Modify: `js/controller.js` (`ctlStampShell` only)

**Interfaces:**
- Consumes: `ctlStampShell` (Task 5).
- Produces: `CTL_BORDER = 0.055` — the border's width as a fraction of the sticker radius, and equally the amount the art sampling is inset by.

- [ ] **Step 1: Replace `ctlStampShell`'s sampling and per-texel loop**

Three changes, all inside the function written in Task 5. Replace it wholesale:

```js
/* The border's width as a fraction of the sticker radius, and equally the
   amount the ART is inset by so the border always has somewhere to go.
   Deliberately the same as CTL_LIP: the border IS the lip, made visible. */
const CTL_BORDER = 0.055;

function ctlStampShell(s) {
  const S = ctlStickerSurface;
  if (!S) return;
  const rec = ctlStickerImage(s.id);
  if (!rec) return;
  const im = rec.data;
  const chart = S.makeChart(s), R = s.size, px = [0, 0, 0, 0];
  const W = im.width, H = im.height, DA = im.data;

  /* THE ART IS INSET, not the border added outside it (spec D8). All three
     test stickers are full-bleed — measured: zero transparent margin on all
     four edges — so a border drawn inside the existing [-R,R] square would
     clip. Insetting makes the border unconditional and costs future sticker
     authoring nothing: an artwork that DOES carry a margin simply gets a
     slightly wider gap, which is harmless. */
  const AR = R * (1 - CTL_BORDER);        // the radius the artwork now occupies
  const eb = R * CTL_BORDER;              // ring radius = border width

  /* Alpha of the ARTWORK at a chart coordinate, under the inset mapping.
     Used both for the ring average and for the outside test, so the two can
     never disagree about where the artwork ends. */
  const alphaAt = (a, b) => {
    if (a < -AR || a > AR || b < -AR || b > AR) return 0;
    const x = (a / AR * 0.5 + 0.5) * W, y = (0.5 - b / AR * 0.5) * H;
    const xi = x < 0 ? 0 : (x > W - 1 ? W - 1 : x | 0);
    const yi = y < 0 ? 0 : (y > H - 1 ? H - 1 : y | 0);
    return DA[(yi * W + xi) * 4 + 3] / 255;
  };

  for (const bx of S.boxes(s)) {
    const w = bx.x1 - bx.x0, h = bx.y1 - bx.y0;
    if (w <= 0 || h <= 0) continue;
    const dst = ctlCtx.getImageData(bx.x0, bx.y0, w, h), D = dst.data;
    const bst = ctlBumpCtx.getImageData(bx.x0, bx.y0, w, h), B = bst.data;
    let touched = false;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const xy = S.fromAtlas(bx.x0 + i + 0.5, bx.y0 + j + 0.5, bx.back);
      const c = chart(xy[0], xy[1], bx.back);
      if (!c) continue;
      const o = (j * w + i) * 4;

      ctlSampleImage(im, (c[0] / AR * 0.5 + 0.5) * W, (0.5 - c[1] / AR * 0.5) * H, px);
      const al = (c[0] < -AR || c[0] > AR || c[1] < -AR || c[1] > AR) ? 0 : px[3] / 255;

      /* The ring average is now computed BEFORE the alpha early-out — that
         reordering is the whole mechanism. A texel with al ~ 0 but hgt > 0 is
         in the band just OUTSIDE the artwork, which is exactly the band the
         border occupies. */
      const hgt = (al + alphaAt(c[0] + eb, c[1]) + alphaAt(c[0] - eb, c[1])
                      + alphaAt(c[0], c[1] + eb) + alphaAt(c[0], c[1] - eb)) / 5;
      if (al <= 0.004 && hgt <= 0.004) continue;   // genuinely outside: untouched

      /* Height first, so the border stands proud with the artwork — it is part
         of the same piece of vinyl, and a border at height zero would read as
         painted on rather than cut out. Overlaps keep the taller. */
      const hv = hgt * 255;
      if (hv > B[o]) { B[o] = B[o + 1] = B[o + 2] = hv; B[o + 3] = 255; }

      if (al > 0.004) {
        // inside the artwork — colours go down flat, no baked shading
        D[o]     = D[o]     * (1 - al) + px[0] * al;
        D[o + 1] = D[o + 1] * (1 - al) + px[1] * al;
        D[o + 2] = D[o + 2] * (1 - al) + px[2] * al;
      } else {
        /* THE BORDER. Its colour is chosen per texel from the atlas pixel
           ALREADY underneath: a light shell gets a dark border, a dark shell a
           light one. Per-texel is what makes a sticker straddling the
           faceplate edge work with no special case — and because a recolour
           re-enters ctlRedrawShell and re-stamps every sticker from scratch,
           borders re-derive against the new shell colour for free.

           Coverage is the ring average, so the outer edge antialiases instead
           of stepping. */
        const lum = (0.2126 * D[o] + 0.7152 * D[o + 1] + 0.0722 * D[o + 2]) / 255;
        const bc = lum > 0.5 ? 28 : 242;
        const a2 = Math.min(1, hgt * 1.6);   // firm up the thin outer tail
        D[o]     = D[o]     * (1 - a2) + bc * a2;
        D[o + 1] = D[o + 1] * (1 - a2) + bc * a2;
        D[o + 2] = D[o + 2] * (1 - a2) + bc * a2;
      }
      D[o + 3] = 255; touched = true;
    }
    if (touched) {
      ctlCtx.putImageData(dst, bx.x0, bx.y0);
      ctlBumpCtx.putImageData(bst, bx.x0, bx.y0);
    }
  }
}
```

- [ ] **Step 2: Confirm the pure harness is unaffected**

Run: `node tools/verify-controller-stickers.js && node tools/verify-controller-state.js`
Expected: both `0 failed`. Nothing here touches the pure layer — this step exists to prove that, because a stray edit to the wrong half of the file is easy and silent.

- [ ] **Step 3: Verify the border appears on both a light and a dark shell**

Extend the Playwright script from Task 5:

```js
const out = await p.evaluate(async () => {
  await ctlLoadStickerManifest();
  ctlOpenWorkshop();
  ctlEnsureStickerSurface();
  const rec = { id: 'banana', surface: 'shell', x: 1.16, y: -0.12,
                back: false, rot: 0, size: 0.22, chart: 'tangent' };
  const probe = (shellHex) => {
    ctlDesign.shell = shellHex; ctlDesign.stickers = [rec];
    ctlRedrawShell();
    const d = ctlCtx.getImageData(0, 0, CTL_ATLAS, CTL_ATLAS).data;
    let dark = 0, light = 0;
    for (let i = 0; i < d.length; i += 4) {
      const l = (0.2126*d[i] + 0.7152*d[i+1] + 0.0722*d[i+2]) / 255;
      if (l < 0.16) dark++; else if (l > 0.90) light++;
    }
    return { dark, light };
  };
  await new Promise(r => setTimeout(r, 500));     // let the image decode
  return { onYellow: probe('#FFE500'), onNearBlack: probe('#18181B') };
});
```

Expected: `onYellow.dark` is clearly non-zero (a dark ring on a light shell) and `onNearBlack.light` clearly exceeds the count on yellow (a light ring on a dark shell). If both are ~0 the border band never fired — the most likely cause is `AR` not being used in the outside test, so `al` is never 0 within the patch.

- [ ] **Step 4: Screenshot it on the worst-case shell and look at it**

FRT `#FFE500` against `banana` measured **1.06:1** — it is the case that motivated D8.

```js
await p.evaluate(() => {
  ctlDesign.shell = '#FFE500'; ctlDesign.plate = '#FFE500';
  ctlRedrawShell();
  ctlRotX = 0; ctlRotY = 0; ctlRig.rotation.set(0,0,0);
  ctlRenderer.render(ctlScene, ctlCamera);
});
await p.locator('#ctl-stage canvas').screenshot({ path: 'scratchpad/border-frt.png' });
```

Read the image. The sticker must be legible as a distinct object against the yellow. Judge three things: the border is present the whole way round (not broken where the artwork's own alpha is soft), it is thin enough to read as die-cut rather than as a drawn outline, and it does not eat into the artwork. Tune `CTL_BORDER` if the width is wrong and the `a2` multiplier if the outer edge is too soft — do not tune by changing the inset alone, which moves the artwork rather than the border.

- [ ] **Step 5: Commit**

```bash
git add js/controller.js
git commit -m "feat(controller): adaptive die-cut border on every sticker

The test art is near-white dominant and measured 1.01-1.16:1 against six of
the twenty shells — the same colour, effectively invisible, and the bump lip
cannot rescue it because it only exists inside the sticker's own alpha. The
border colour is chosen per texel from the shell pixel underneath, so a
straddled faceplate works with no special case and a recolour re-derives it.
Art sampling is inset rather than requiring a transparent margin: all three
test stickers are full-bleed.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 7: Ear stickers — planar UVs and the flat rasteriser

Implements spec **D5** and § 5.3 (ear half).

**The trap in this task.** The shipped `ControllerBody.buildEars` returns meshes carrying `ExtrudeGeometry`'s **default** UVs, and `js/controller.js` never overrides them — it only flood-fills a 512 ear atlas, so the UVs have never mattered. The prototype assigns its **own** planar UVs in an IIFE after `buildEars` returns (`standalone.html:1745-1783`), laying both outward caps of both ears into a 2×2 grid and parking every mixed-normal triangle on a single texel. Without that block, `h[0].uv` from an ear raycast is meaningless and every ear sticker lands somewhere arbitrary. Port the block; do not modify `controller-body.js` (it is shared geometry with its own harness).

**Files:**
- Modify: `js/controller.js` (renderer half)

**Interfaces:**
- Consumes: `ctlStickerImage` (Task 5), `CTL_EAR_MAX_R` (Task 3).
- Produces:
  - `CTL_EAR_ATLAS = 1024` (raised from 512 — the 2×2 grid needs a 512 quadrant per cap).
  - `ctlBuildEarUV()` — assigns the planar UVs; sets `ctlEarScale` and `m.userData.earQ` per mesh.
  - `ctlEarScale` — the world-units-to-UV factor the rasteriser needs.
  - `ctlRedrawEars()` — extended to stamp ear placements.
  - Ear record semantics: **`u`/`v` are full-atlas UVs exactly as the raycast returns them**, already carrying the ear's half and the cap's band. `surface` (`'earL'`/`'earR'`) is stored for the book's benefit and is **derived from `u < 0.5`** — the renderer reads `u`/`v` alone and must not apply a second offset.

- [ ] **Step 1: Raise the ear atlas and give it a bump canvas**

```js
const CTL_EAR_ATLAS = 1024;   // was 512 — the 2x2 cap grid needs a 512 quadrant each
```

In `ctlBuildAtlases()`, add the ear bump canvas beside the ear colour canvas:

```js
  ctlEarBumpCanvas = document.createElement('canvas');
  ctlEarBumpCanvas.width = ctlEarBumpCanvas.height = CTL_EAR_ATLAS;
  ctlEarBumpCtx = ctlEarBumpCanvas.getContext('2d');
  ctlEarBumpTex = new THREE.CanvasTexture(ctlEarBumpCanvas);
  ctlEarBumpTex.flipY = false; ctlEarBumpTex.anisotropy = 8;
```

Declare `ctlEarBumpCanvas, ctlEarBumpCtx, ctlEarBumpTex` and `let ctlEarScale = 1;` with the other handles, and attach the bump map in `ctlEnsureBuilt`:

```js
  ctlEarMat = new THREE.MeshStandardMaterial({ map: ctlEarTex, roughness: .52, metalness: .06,
                                               bumpMap: ctlEarBumpTex, bumpScale: 0.035 });
```

- [ ] **Step 2: Port the planar UV assignment**

Add to the renderer half, and call it from `ctlEnsureBuilt` immediately after `ctlEars = ControllerBody.buildEars(...)`:

```js
/* ── Ear UVs ──────────────────────────────────────────────────────────────
   buildEars returns ExtrudeGeometry's DEFAULT UVs, which are meaningless for
   painting: the shipped colour-only build never noticed because it flood-fills
   the ear atlas. Ported from standalone.html:1745.

   Planar UVs over BOTH outward-facing caps. The ellipse extrusion has one cap
   that used to be the only stickerable "crown" and a second, opposite cap that
   was parked as bevel/side; each now gets its own band within the ear's half of
   the canvas — a 2x2 grid, left/right ear by column and front/back cap by row.
   Mixed-normal triangles (the bevel, the rim) are parked on a SINGLE texel of
   bare shell colour, so nothing smears across either cap and a tap there can be
   rejected cheaply (see ctlDropEar).

   The ears each hold geo.clone(), so per-mesh UVs are safe. This must NOT be
   pushed down into controller-body.js: that module is shared geometry with its
   own contract harness, and these UVs are this renderer's business. */
function ctlBuildEarUV() {
  const HALF = [0.25, 0.75];                    // ear column centres
  const VBAND = { back: 0.74, front: 0.26 };    // cap band centres
  ctlEars.forEach((m, idx) => {
    const g = m.geometry, p = g.attributes.position.array, nm = g.attributes.normal.array;
    let hw = 0, hh = 0;
    for (let i = 0; i < p.length; i += 3) {
      hw = Math.max(hw, Math.abs(p[i])); hh = Math.max(hh, Math.abs(p[i + 1]));
    }
    // 0.40 not 0.94: half the height, two bands not one
    ctlEarScale = Math.min(0.46 / (2 * hw), 0.40 / (2 * hh));
    /* Which local cap — +Z or -Z in the ellipse's OWN space — actually faces
       the controller's front. Read off the mesh's own fixed rotation rather
       than assumed, so this keeps working if buildEars' tilt numbers change. */
    const q = new THREE.Quaternion().setFromEuler(m.rotation);
    m.userData.earQ = q;
    const frontIsPosZ = new THREE.Vector3(0, 0, 1).applyQuaternion(q).z
                      > new THREE.Vector3(0, 0, -1).applyQuaternion(q).z;
    const uv = new Float32Array(p.length / 3 * 2);
    for (let t = 0; t < p.length / 3; t += 3) {
      let side = null, consistent = true;
      for (let k = 0; k < 3; k++) {
        const nz = nm[(t + k) * 3 + 2];
        const s = nz < -0.35 ? (frontIsPosZ ? 'back' : 'front')
                : (nz >  0.35 ? (frontIsPosZ ? 'front' : 'back') : null);
        if (k === 0) side = s; else if (s !== side) consistent = false;
      }
      if (!consistent) side = null;
      for (let k = 0; k < 3; k++) {
        const i = t + k;
        if (side) {
          uv[i * 2]     = HALF[idx] + p[i * 3] * ctlEarScale;
          uv[i * 2 + 1] = VBAND[side] - p[i * 3 + 1] * ctlEarScale;
        } else {
          uv[i * 2] = 0.998; uv[i * 2 + 1] = 0.004;   // the parked texel
        }
      }
    }
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  });
}
```

- [ ] **Step 3: Extend the ear repaint to stamp placements**

Replace `ctlRedrawEars()`:

```js
/* The ears get their own texture rather than a corner of the body atlas: they
   are separate meshes standing off the boss — that is WHY they are separate,
   the height field cannot do the undercut — so nothing ever crosses between
   the two, and a second small canvas costs far less than repacking the body's
   islands. Their outward face is close to flat, so this is plain 2D drawing:
   no chart and no per-texel rasteriser, because the crown has almost no
   curvature to correct for. */
function ctlRedrawEars() {
  ctlEarCtx.fillStyle = ctlDesign.ears;
  ctlEarCtx.fillRect(0, 0, CTL_EAR_ATLAS, CTL_EAR_ATLAS);
  if (ctlEarBumpCtx) { ctlEarBumpCtx.fillStyle = '#000'; ctlEarBumpCtx.fillRect(0, 0, CTL_EAR_ATLAS, CTL_EAR_ATLAS); }

  for (const s of ctlDesign.stickers || []) {
    if (s.surface !== 'earL' && s.surface !== 'earR') continue;
    const rec = ctlStickerImage(s.id);
    if (!rec) continue;                      // not decoded yet; onload repaints
    const im = rec.img;
    const w = s.r * 2 * ctlEarScale * CTL_EAR_ATLAS, h = w * im.height / im.width;
    ctlEarCtx.save(); ctlEarBumpCtx.save();
    /* Clipped to its own quadrant — ear column (left/right) AND cap band
       (front/back). A sticker near a region's inner edge would otherwise paint
       across into whichever neighbour shares that edge. u/v are the raycast's
       full-atlas UVs and already carry both offsets; do not add them again. */
    for (const g of [ctlEarCtx, ctlEarBumpCtx]) {
      g.beginPath();
      g.rect(s.u < 0.5 ? 0 : CTL_EAR_ATLAS / 2, s.v > 0.5 ? CTL_EAR_ATLAS / 2 : 0,
             CTL_EAR_ATLAS / 2, CTL_EAR_ATLAS / 2);
      g.clip();
      g.translate(s.u * CTL_EAR_ATLAS, s.v * CTL_EAR_ATLAS);
      g.rotate(s.rot);
    }
    // colours go down flat, exactly as on the shell — no baked shading
    ctlEarCtx.drawImage(im, -w / 2, -h / 2, w, h);
    /* Height: the sticker's own silhouette in white, blurred just enough to
       turn its cut edge into a short ramp. Same lip the shell gets, done with
       a 2D blur rather than per-texel because the ear cap is flat.
       'lighten' takes the per-pixel MAX against what is already there, so a
       stack of overlapping stickers reads as the tallest at each point.
       'lighter' was tried first and was the actual cause of ear stickers
       looking puffy and blown out: it SUMS every overlap, so a handful of them
       saturated to solid white over a spreading area. Do not change it back. */
    ctlEarBumpCtx.globalCompositeOperation = 'lighten';
    try { ctlEarBumpCtx.filter = 'blur(' + Math.max(1, w * CTL_LIP * 0.9) + 'px) brightness(0) invert(1)'; } catch (e) {}
    ctlEarBumpCtx.drawImage(im, -w / 2, -h / 2, w, h);
    ctlEarBumpCtx.filter = 'none'; ctlEarBumpCtx.globalCompositeOperation = 'source-over';
    ctlEarCtx.restore(); ctlEarBumpCtx.restore();
  }
  ctlEarTex.needsUpdate = true;
  if (ctlEarBumpTex) ctlEarBumpTex.needsUpdate = true;
}
```

- [ ] **Step 4: Write the ear placement handler**

```js
/* The crown is 0.36 by 0.52 and its outer 0.075 is bevel, so a sticker is held
   to what will actually lie flat on it. A sticker cannot run from the ear onto
   the shell: there is a real gap between them, and no parameterisation bridges
   a gap. Returns a placement record, or null with a refusal already reported. */
function ctlPlanEarSticker(uv, want, rot) {
  /* Everything that is not an outward cap shares one parked texel, so a tap on
     the side or the bevel would paint that texel and flood the whole rim of the
     ear with it. */
  if (uv.y < 0.05 || uv.x > 0.99) return { ok: false, reason: 'earSide' };
  const r = Math.min(want, CTL_EAR_MAX_R);
  return { ok: true, rec: { surface: uv.x < 0.5 ? 'earL' : 'earR',
                            u: uv.x, v: uv.y, r: r, rot: rot },
           capped: r < want - 1e-4 };
}
```

- [ ] **Step 5: Verify the UVs land where they should**

```js
const out = await p.evaluate(async () => {
  await ctlLoadStickerManifest();
  ctlOpenWorkshop(); ctlEnsureStickerSurface();
  // every ear vertex must be inside its own quadrant, or on the parked texel
  const bad = [];
  ctlEars.forEach((m, idx) => {
    const uv = m.geometry.attributes.uv.array;
    for (let i = 0; i < uv.length; i += 2) {
      const u = uv[i], v = uv[i + 1];
      if (u > 0.99 && v < 0.01) continue;                 // parked
      const col = idx === 0 ? (u < 0.5) : (u >= 0.5);
      if (!col || u < 0 || u > 1 || v < 0 || v > 1) bad.push([idx, u, v]);
    }
  });
  ctlDesign.stickers = [{ id: 'pan', surface: 'earL', u: 0.25, v: 0.26, r: 0.2, rot: 0 }];
  await new Promise(r => setTimeout(r, 500));
  ctlRedrawEars();
  const d = ctlEarCtx.getImageData(0, 0, CTL_EAR_ATLAS, CTL_EAR_ATLAS).data;
  const n = parseInt(ctlDesign.ears.slice(1), 16);
  const er = (n >> 16) & 255, eg = (n >> 8) & 255, ebv = n & 255;
  // how much paint landed in each quadrant
  const q = [0, 0, 0, 0];
  const HALF = CTL_EAR_ATLAS / 2;
  for (let y = 0; y < CTL_EAR_ATLAS; y++) for (let x = 0; x < CTL_EAR_ATLAS; x++) {
    const o = (y * CTL_EAR_ATLAS + x) * 4;
    if (Math.abs(d[o]-er) + Math.abs(d[o+1]-eg) + Math.abs(d[o+2]-ebv) < 24) continue;
    q[(y < HALF ? 0 : 2) + (x < HALF ? 0 : 1)]++;
  }
  return { badUVs: bad.length, quadrants: q, earScale: ctlEarScale };
});
```

Expected: `badUVs: 0`; `quadrants[0]` (top-left, `u<0.5` and `v<0.5`) clearly non-zero and **every other quadrant 0** — a sticker at `(0.25, 0.26)` must be wholly inside the left ear's front cap. Any bleed into a neighbour means the clip rect is wrong. `earScale` should be a small positive number.

- [ ] **Step 6: Screenshot both ears**

```js
await p.evaluate(() => {
  ctlDesign.stickers = [
    { id: 'pan',    surface: 'earL', u: 0.25, v: 0.26, r: 0.2, rot: 0 },
    { id: 'banana', surface: 'earR', u: 0.75, v: 0.26, r: 0.2, rot: 0.4 },
  ];
  ctlRedrawEars();
  ctlRotX = 0; ctlRotY = 0; ctlRig.rotation.set(0,0,0);
  ctlRenderer.render(ctlScene, ctlCamera);
});
await p.locator('#ctl-stage canvas').screenshot({ path: 'scratchpad/ears.png' });
```

Read it. Both ears must carry their sticker on the face pointing at the camera, upright, not mirrored, not wrapped round the bevel.

- [ ] **Step 7: Run every harness, then commit**

```bash
node tools/verify-controller-stickers.js && node tools/verify-controller-state.js && node tools/verify-controller-body.js
```

```bash
git add js/controller.js
git commit -m "feat(controller): ear stickers — planar cap UVs and the flat rasteriser

buildEars ships ExtrudeGeometry's default UVs, which the colour-only build
never noticed because it flood-fills the ear atlas. Ports the prototype's 2x2
cap grid (left/right ear by column, front/back cap by row, mixed-normal
triangles parked on one texel) so an ear raycast's uv means something. Ear
atlas 512 -> 1024 for a 512 quadrant per cap. The bump pass uses 'lighten',
not 'lighter' — summing overlaps is what made ear stickers look blown out.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 8: Tap to place, select and relocate

Implements spec **D6** and § 7's controller-tap column. One gesture throughout; dragging the canvas still rotates the view, unchanged.

**Do not touch the click-vs-drag disambiguation.** `ctlBindPointer`'s `pointerup` already resolves a tap from a drag with `CTL_CLICK_MOVE_MAX` / `CTL_CLICK_TIME_MAX` and calls `ctlOnTap(ev)`. `controller-handoff-v3.md` § 3.1 flags that logic as fragile and asks to be read before changing it. This task assigns `ctlOnTap` in the Workshop and adds nothing to the pointer handlers.

**Files:**
- Modify: `js/controller.js` (renderer half + `ctlOpenWorkshop`)

**Interfaces:**
- Consumes: `ctlStickerReduce` / `ctlStickerMode` (Task 4), `ctlStickerSurface` (Task 5), `ctlPlanEarSticker` (Task 7).
- Produces:
  - `ctlStickerState` — the live state object the reducer operates on; `{stickers, armed, selected, history}`. **`ctlStickerState.stickers` and `ctlDraft.stickers` are kept as the same array reference after every action** (see the note in Step 2).
  - `ctlStickerDispatch(action)` — applies the reducer, re-syncs `ctlDraft`, repaints, re-renders the panel.
  - `ctlStickerTap(ev)` — the raycast handler assigned to `ctlOnTap`.
  - `ctlStickerSay(msg)` — writes the status line.
  - `CTL_REFUSAL` — the prototype's exact message set, plus one for the ear side.
  - `ctlStickerWantRadius()` — the size slider's value in body units.

- [ ] **Step 1: Port the refusal copy verbatim**

Spec § 7: reuse the prototype's message set, no new copy. One line is added for the ear side, which the prototype also has (`standalone.html:2022`):

```js
/* One place decides what a refusal means, so nothing can disagree about
   whether a spot is legal. Ported verbatim from standalone.html:2000. */
const CTL_REFUSAL = {
  off:     'That is off the edge of the controller.',
  ring:    'The stick rings and the bosses behind the ears are off-limits.',
  edge:    'Too tight an edge to wrap around — try a smaller sticker or move in a bit.',
  curve:   'Too curved here for a sticker this big — try a smaller one.',
  earSide: 'That is the side of the ear — stickers go on its face.',
};
```

- [ ] **Step 2: Write the dispatcher and the tap handler**

```js
// ── Sticker editing: live state and the tap gesture ──────────────────────────
let ctlStickerState = { stickers: [], armed: null, selected: -1, history: [] };

/* The reducer is pure and returns a NEW stickers array on every structural
   action, so ctlDraft has to be re-pointed at it each time. Assigning the
   array (rather than mutating in place) is deliberate: ctlApplyDesign does
   Object.assign({}, ctlDesign, design), which would otherwise leave ctlDesign
   and ctlDraft sharing one array and make "discard unsaved changes" a lie. */
function ctlStickerDispatch(action) {
  const before = ctlStickerState;
  ctlStickerState = ctlStickerReduce(before, action);
  if (ctlStickerState === before) return;         // a no-op action
  if (ctlDraft) ctlDraft.stickers = ctlStickerState.stickers;
  ctlDesign.stickers = ctlStickerState.stickers;
  ctlRedrawShell();
  ctlRedrawEars();
  ctlWake();
  ctlRenderPanel();
}

function ctlStickerSay(msg) {
  const el = document.getElementById('ctl-sticker-say');
  if (el) el.textContent = msg || '';
}

/* The size slider in body units. The prototype's conversion, unchanged:
   the slider is a percentage of half the body's width. */
function ctlStickerWantRadius() {
  const el = document.getElementById('ctl-sticker-size');
  const pct = el ? +el.value : 18;
  const U = ctlGeo.userData;
  return (pct / 100) * (U.maxx - U.minx) / 1.96;
}

function ctlStickerWantRot() {
  const el = document.getElementById('ctl-sticker-rot');
  return (el ? +el.value : 0) * Math.PI / 180;
}

/* Which placement, if any, did this tap land on? Compared in the sticker's own
   chart space, so a wrapped sticker is hit correctly on both sheets and the
   test matches exactly what was painted. */
function ctlStickerHitIndex(xy, back) {
  const S = ctlStickerSurface;
  if (!S) return -1;
  const list = ctlStickerState.stickers;
  // last painted is on top, so search backwards
  for (let i = list.length - 1; i >= 0; i--) {
    const s = list[i];
    if (s.surface !== 'shell') continue;
    const c = S.makeChart(s)(xy[0], xy[1], back);
    if (c && Math.abs(c[0]) <= s.size && Math.abs(c[1]) <= s.size) return i;
  }
  return -1;
}

function ctlStickerEarHitIndex(uv) {
  const list = ctlStickerState.stickers;
  for (let i = list.length - 1; i >= 0; i--) {
    const s = list[i];
    if (s.surface !== 'earL' && s.surface !== 'earR') continue;
    // same quadrant, and within the sticker's own UV footprint
    if ((uv.x < 0.5) !== (s.u < 0.5)) continue;
    if ((uv.y > 0.5) !== (s.v > 0.5)) continue;
    const half = s.r * ctlEarScale;
    if (Math.abs(uv.x - s.u) <= half && Math.abs(uv.y - s.v) <= half) return i;
  }
  return -1;
}

/* Assigned to ctlOnTap in the Workshop. The pointer handlers are UNCHANGED:
   ctlBindPointer already tells a tap from a drag, and that disambiguation is
   flagged as fragile in controller-handoff-v3.md § 3.1. Dragging still rotates
   the view — placing, selecting and relocating are all the same single tap
   (spec D6), which is exactly why this needed no new gesture. */
function ctlStickerTap(ev) {
  if (!ctlStickerSurface) return;
  const r = ctlRenderer.domElement.getBoundingClientRect();
  _ctlPtr.x =  ((ev.clientX - r.left) / r.width)  * 2 - 1;
  _ctlPtr.y = -((ev.clientY - r.top)  / r.height) * 2 + 1;
  _ctlRay.setFromCamera(_ctlPtr, ctlCamera);
  const hits = _ctlRay.intersectObjects([ctlBody].concat(ctlEars), false);
  if (!hits.length || !hits[0].uv) return;

  const mode = ctlStickerMode(ctlStickerState);

  // ---- an ear ----
  if (hits[0].object !== ctlBody) {
    const uv = hits[0].uv;
    const hit = ctlStickerEarHitIndex(uv);
    if (mode === 'idle') { if (hit >= 0) ctlStickerDispatch({ t: 'hit', index: hit }); return; }
    const plan = ctlPlanEarSticker(uv, ctlStickerWantRadius(), ctlStickerWantRot());
    if (!plan.ok) { ctlStickerSay(CTL_REFUSAL[plan.reason]); return; }
    ctlStickerDispatch({ t: mode === 'armed' ? 'place' : 'relocate', rec: plan.rec });
    ctlStickerSay('On the ear' + (plan.capped ? ' — sized down to fit the face.' : '.'));
    return;
  }

  // ---- the shell ----
  const uv = hits[0].uv, back = uv.y < 0.50;
  const xy = ctlStickerSurface.fromAtlas(uv.x * CTL_ATLAS, uv.y * CTL_ATLAS, back);
  if (mode === 'idle') {
    ctlStickerDispatch({ t: 'hit', index: ctlStickerHitIndex(xy, back) });
    return;
  }
  const want = ctlStickerWantRadius();
  const p = ctlStickerSurface.plan(xy[0], xy[1], back, want);
  if (!p.ok) { ctlStickerSay(CTL_REFUSAL[p.reason] || 'Cannot place a sticker there.'); return; }
  /* plan() returns x/y only on the rim branch, where it nudges the anchor onto
     the crest so the wrap is even. A flat placement keeps the tapped point. */
  const rec = { surface: 'shell',
                x: p.x !== undefined ? p.x : xy[0],
                y: p.y !== undefined ? p.y : xy[1],
                back: back, rot: ctlStickerWantRot(), size: p.size, chart: p.chart };
  ctlStickerDispatch({ t: mode === 'armed' ? 'place' : 'relocate', rec: rec });
  ctlStickerSay(p.chart === 'rim' ? 'Wrapped over the edge.'
                                  : 'Placed on the ' + (back ? 'back' : 'front') + '.');
}
```

- [ ] **Step 3: Arm the handler in the Workshop, and only there**

In `ctlOpenWorkshop`, replace `ctlOnTap = null;` with a tab-aware assignment, and seed the sticker state from the draft:

```js
  ctlOnTap = ctlStickerTap;       // no-ops until the surface exists (Stickers tab)
  ctlStickerState = { stickers: (ctlDraft.stickers || []).slice(),
                      armed: null, selected: -1, history: [] };
```

`ctlStickerTap` returns immediately when `ctlStickerSurface` is null, so the Colours tab behaves exactly as it does today and the lobby is untouched (`ctlMountLobby` sets its own `ctlOnTap`).

In `ctlCloseWorkshop`, clear the session state — the history is Workshop-scoped and an unsaved edit must not survive (`ctlDesign = ctlReadDesign()` on the next line already restores the saved placements):

```js
  ctlStickerState = { stickers: [], armed: null, selected: -1, history: [] };
```

- [ ] **Step 4: Verify placing, selecting, relocating and refusing**

```js
const out = await p.evaluate(async () => {
  await ctlLoadStickerManifest();
  ctlOpenWorkshop(); ctlEnsureStickerSurface();
  await new Promise(r => setTimeout(r, 500));
  const S = ctlStickerSurface;
  const log = [];
  // arm, then place at the deep front deck
  ctlStickerDispatch({ t: 'bookTap', id: 'banana' });
  log.push(['armed', ctlStickerMode(ctlStickerState)]);
  const p1 = S.plan(1.16, -0.12, false, 0.18);
  ctlStickerDispatch({ t: 'place', rec: { surface: 'shell', x: 1.16, y: -0.12, back: false,
                                          rot: 0, size: p1.size, chart: p1.chart } });
  log.push(['placed', ctlStickerState.stickers.length, ctlStickerMode(ctlStickerState)]);
  log.push(['draftShared', ctlDraft.stickers === ctlStickerState.stickers]);
  // a refusal leaves the state alone
  const bad = S.plan(-1.25, 0.20, false, 0.18);
  log.push(['keepOut', bad.ok, bad.reason]);
  // relocate
  ctlStickerDispatch({ t: 'relocate', rec: { surface: 'shell', x: 0.4, y: -0.4, back: false,
                                             rot: 0, size: 0.18, chart: 'tangent' } });
  log.push(['relocated', ctlStickerState.stickers[0].x, ctlStickerState.stickers.length]);
  // undo
  ctlStickerDispatch({ t: 'undo' });
  log.push(['undone', ctlStickerState.stickers[0].x]);
  return log;
});
```

Expected: `armed`, then `placed 1 selected`, `draftShared true`, `keepOut false ring`, `relocated 0.4 1`, `undone 1.16`. Then drive a **real tap** through the DOM to prove the wiring, not just the reducer:

```js
const box = await p.locator('#ctl-stage canvas').boundingBox();
await p.evaluate(() => { ctlStickerDispatch({ t: 'bookTap', id: 'computer' }); });
await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
console.log(await p.evaluate(() => ctlStickerState.stickers.map(s => s.id)));
```

Expected: the array now contains `computer`. If it does not, the tap was classified as a drag — check `CTL_CLICK_MOVE_MAX`, and do **not** loosen it.

- [ ] **Step 5: Commit**

```bash
git add js/controller.js
git commit -m "feat(controller): tap to place, select and relocate a sticker

One gesture throughout (spec D6): dragging still rotates the view, and the
click-vs-drag disambiguation in ctlBindPointer is untouched — the handoff flags
it as fragile. Placing, selecting and relocating are the same tap; relocating
overwrites the selected entry instead of pushing a new one. Refusal copy is the
prototype's verbatim.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---
## Task 9: The Stickers tab

Implements spec **D4** and § 7. Exactly two tabs — Colours and Stickers — with the placed-sticker list living *inside* the Stickers tab as the book itself, not as a third tab.

**Structural rule from `ui-style.md` § How-to Overlay Standard, applied here:** the two tab bodies are **siblings toggled by display**, not one body repainted. Flicking across and back must not lose the other tab's scroll position, and — the reason it matters more here — the sticker sliders must survive a repaint of the book, so they are static markup that is synced, never rebuilt.

**Files:**
- Modify: `index.html` (Workshop panel band — via a Node script, CRLF)
- Modify: `js/controller.js` (panel rendering)

**Interfaces:**
- Consumes: everything from Tasks 2, 4, 7, 8.
- Produces:
  - `ctlActiveTab` — `'colours' | 'stickers'`, default `'colours'`.
  - `ctlRenderPanel()` — unchanged name and call sites; now dispatches on the tab.
  - `ctlRenderColourCard()`, `ctlRenderStickerBook()`, `ctlSyncStickerControls()`.
  - `ctlOpenStickersTab()` — loads the manifest, builds the surface, shows a warming state.
  - New element ids: `ctl-tabs`, `ctl-panel-colours`, `ctl-panel-stickers`, `ctl-sticker-book`, `ctl-sticker-say`, `ctl-sticker-controls`, `ctl-sticker-rot`, `ctl-sticker-size`, `btn-ctl-sticker-undo`, `btn-ctl-sticker-delete`, `btn-ctl-sticker-done`.

- [ ] **Step 1: Add the tab bar and the sticker panel body to `index.html`**

`#ctl-panel` currently holds one JS-built card. It becomes a container for two sibling bodies, with a sticky tab bar above it. Use a Node script — never the Edit tool — and match CRLF:

```bash
node -e "
const fs=require('fs');
const p='index.html';
let s=fs.readFileSync(p,'utf8');
if(s.indexOf('id=\"ctl-tabs\"')>=0) throw new Error('already applied');
const old='    <!-- PANEL — scrolls independently -->\r\n    <div id=\"ctl-panel\" class=\"flex-1 min-h-0 overflow-y-auto px-5 py-4 flex flex-col gap-4\"></div>';
if(s.indexOf(old)<0) throw new Error('panel anchor not found — check CRLF and the comment text');
const neu = [
'    <!-- TAB BAR — sticky with the stage, never scrolls. The panel band was',
'         left free of a tab bar by the colour-only build specifically so these',
'         two could arrive without anything reflowing. -->',
'    <div id=\"ctl-tabs\" class=\"flex-shrink-0 px-5 pt-1 pb-2 flex gap-2\">',
'      <button class=\"pill pill-active-purple\" data-ctl-tab=\"colours\">Colours</button>',
'      <button class=\"pill\" data-ctl-tab=\"stickers\">Stickers</button>',
'    </div>',
'',
'    <!-- PANEL — scrolls independently. Two sibling bodies toggled by display,',
'         never one body repainted, so each keeps its own scroll position and',
'         the sticker sliders survive a repaint of the book. -->',
'    <div id=\"ctl-panel\" class=\"flex-1 min-h-0 overflow-y-auto px-5 py-4\">',
'      <div id=\"ctl-panel-colours\" class=\"flex flex-col gap-4\"></div>',
'      <div id=\"ctl-panel-stickers\" style=\"display:none\" class=\"flex flex-col gap-4\">',
'        <div id=\"ctl-sticker-book\" class=\"grid grid-cols-4 gap-2\"></div>',
'        <p id=\"ctl-sticker-say\" class=\"text-stone-400 text-xs min-h-[1rem]\"></p>',
'        <div id=\"ctl-sticker-controls\" style=\"display:none\"',
'          class=\"bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3\">',
'          <div class=\"flex flex-col gap-1\">',
'            <label for=\"ctl-sticker-size\" class=\"text-stone-500 text-sm font-semibold\">Size</label>',
'            <input id=\"ctl-sticker-size\" type=\"range\" min=\"6\" max=\"30\" step=\"1\" value=\"18\"',
'              class=\"ctl-range w-full\" />',
'          </div>',
'          <div class=\"flex flex-col gap-1\">',
'            <label for=\"ctl-sticker-rot\" class=\"text-stone-500 text-sm font-semibold\">Turn</label>',
'            <input id=\"ctl-sticker-rot\" type=\"range\" min=\"-180\" max=\"180\" step=\"5\" value=\"0\"',
'              class=\"ctl-range w-full\" />',
'          </div>',
'          <div class=\"flex gap-2\">',
'            <button id=\"btn-ctl-sticker-undo\"',
'              class=\"min-h-11 flex-1 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 font-semibold text-sm\">Undo</button>',
'            <button id=\"btn-ctl-sticker-delete\"',
'              class=\"min-h-11 flex-1 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm\">Remove</button>',
'            <button id=\"btn-ctl-sticker-done\"',
'              class=\"min-h-11 flex-1 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-semibold text-sm\">Done</button>',
'          </div>',
'        </div>',
'      </div>',
'    </div>'
].join('\r\n');
s=s.replace(old,neu);
fs.writeFileSync(p,s,'utf8');
console.log('ok');
"
```

Then confirm nothing was mangled:

```bash
node -e "
const s=require('fs').readFileSync('index.html','utf8');
for (const id of ['ctl-tabs','ctl-panel-colours','ctl-panel-stickers','ctl-sticker-book',
                  'ctl-sticker-say','ctl-sticker-controls','ctl-sticker-rot','ctl-sticker-size',
                  'btn-ctl-sticker-undo','btn-ctl-sticker-delete','btn-ctl-sticker-done'])
  if (s.indexOf('id=\"'+id+'\"') < 0) throw new Error('missing '+id);
if (/Ã|â€|Â/.test(s)) throw new Error('MOJIBAKE introduced — revert and use a Node script with utf8');
console.log('markup ok, no mojibake');
"
```

**Copy notes.** "Turn" rather than "Rotate" and "Remove" rather than "Delete" — the Workshop is a toy, and `ui-style.md` § Sylly Tone asks for one moment of warmth without forcing it. "Remove" is red because it is destructive within the editing session (§ Action Button Standard, rule 2 exception 3); Undo is neutral stone; Done takes the Workshop's purple.

- [ ] **Step 2: Split the panel renderer**

Replace `ctlRenderPanel` in `js/controller.js` and add the new renderers:

```js
/* Which tab the panel is showing. Two, not three (spec D4): the placed list
   lives INSIDE the Stickers tab as the book itself — one surface to scan
   rather than two. */
let ctlActiveTab = 'colours';

function ctlRenderPanel() {
  const tabs = document.getElementById('ctl-tabs');
  if (tabs) {
    tabs.querySelectorAll('[data-ctl-tab]').forEach(b => {
      const on = b.getAttribute('data-ctl-tab') === ctlActiveTab;
      // .pill must ALWAYS stay on — only pill-active-* is toggled
      // (ui-style.md § Settings Layout Standard, pill toggle rule)
      b.classList.toggle('pill-active-purple', on);
    });
  }
  const colours = document.getElementById('ctl-panel-colours');
  const stickers = document.getElementById('ctl-panel-stickers');
  if (colours)  colours.style.display  = ctlActiveTab === 'colours'  ? 'flex' : 'none';
  if (stickers) stickers.style.display = ctlActiveTab === 'stickers' ? 'flex' : 'none';
  if (ctlActiveTab === 'colours') ctlRenderColourCard();
  else { ctlRenderStickerBook(); ctlSyncStickerControls(); }
}

/* Unchanged from the colour-only build except for the container it renders
   into — it used to own #ctl-panel outright. */
function ctlRenderColourCard() {
  const panel = document.getElementById('ctl-panel-colours');
  if (!panel) return;
  panel.innerHTML = '';
  const palette = ctlPalette();
  const meta = CTL_GROUP_LABELS[ctlActiveGroup];

  const card = document.createElement('div');
  card.className = 'bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3';

  const pills = document.createElement('div');
  pills.className = 'flex gap-2 flex-wrap';
  for (const group of CTL_GROUPS) {
    const p = document.createElement('button');
    p.className = 'pill' + (group === ctlActiveGroup ? ' pill-active-purple' : '');
    p.textContent = CTL_GROUP_LABELS[group].name;
    p.addEventListener('click', () => {
      if (group === ctlActiveGroup) return;
      playPillClick();
      ctlActiveGroup = group;
      ctlRenderPanel();
    });
    pills.appendChild(p);
  }
  card.appendChild(pills);

  const hint = document.createElement('p');
  hint.className = 'text-stone-400 text-sm';
  hint.textContent = meta.hint;
  card.appendChild(hint);

  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-6 gap-1.5';
  for (const sw of palette) {
    const b = document.createElement('button');
    b.className = 'ctl-swatch' + (ctlDraft[ctlActiveGroup].toUpperCase() === sw.hex.toUpperCase() ? ' ctl-swatch-on' : '');
    b.style.backgroundColor = sw.hex;
    b.setAttribute('aria-label', meta.name + ' — ' + sw.hex);
    b.addEventListener('click', () => ctlSelectColour(ctlActiveGroup, sw.hex));
    grid.appendChild(b);
  }
  card.appendChild(grid);
  panel.appendChild(card);
}

/* The book: one tile per manifest entry. A PLACED tile stays tappable and
   SELECTS its placement rather than re-arming the design (spec D2 + § 7) —
   which matters because a sticker on the back face or an ear may not be
   visible from the current camera angle, and selecting from the book sidesteps
   having to rotate to find it. */
function ctlRenderStickerBook() {
  const book = document.getElementById('ctl-sticker-book');
  if (!book) return;
  book.innerHTML = '';

  if (!ctlStickerManifest) {
    const p = document.createElement('p');
    p.className = 'text-stone-400 text-sm col-span-4';
    p.textContent = 'Getting the stickers out…';
    book.appendChild(p);
    return;
  }
  if (!ctlStickerManifest.length) {
    const p = document.createElement('p');
    p.className = 'text-stone-400 text-sm col-span-4';
    // Offline before the manifest was ever fetched is a legitimate path, and it
    // is not an error — there simply are no stickers to show yet.
    p.textContent = 'No stickers yet — they turn up as they are drawn.';
    book.appendChild(p);
    return;
  }

  const placedIdx = {};
  ctlStickerState.stickers.forEach((s, i) => { placedIdx[s.id] = i; });

  for (const e of ctlStickerManifest) {
    const i = placedIdx[e.id];
    const isPlaced = i !== undefined;
    const isArmed = ctlStickerState.armed === e.id;
    const isSelected = isPlaced && ctlStickerState.selected === i;

    const b = document.createElement('button');
    b.className = 'ctl-sticker-tile' +
      ((isArmed || isSelected) ? ' ctl-sticker-tile-on' : '') +
      (isPlaced ? ' ctl-sticker-tile-placed' : '');
    b.setAttribute('aria-label', e.label + (isPlaced ? ' — on the controller' : ''));
    b.setAttribute('aria-pressed', String(isArmed || isSelected));

    const img = document.createElement('img');
    img.src = CTL_STICKER_DIR + e.image;
    img.alt = '';
    img.className = 'w-full h-full object-contain pointer-events-none';
    b.appendChild(img);

    if (isPlaced) {
      const dot = document.createElement('span');
      dot.className = 'ctl-sticker-dot';
      dot.setAttribute('aria-hidden', 'true');
      b.appendChild(dot);
    }

    b.addEventListener('click', () => {
      playPillClick();
      ctlStickerDispatch({ t: 'bookTap', id: e.id });
      const m = ctlStickerMode(ctlStickerState);
      ctlStickerSay(m === 'armed' ? 'Tap the controller to put it on.'
                  : m === 'selected' ? 'Tap somewhere else to move it.'
                  : '');
    });
    book.appendChild(b);
  }
}

/* Synced, never rebuilt — the sliders are static markup precisely so a repaint
   of the book cannot interrupt a drag. */
function ctlSyncStickerControls() {
  const row = document.getElementById('ctl-sticker-controls');
  if (!row) return;
  const mode = ctlStickerMode(ctlStickerState);
  row.style.display = mode === 'idle' ? 'none' : 'flex';

  const del = document.getElementById('btn-ctl-sticker-delete');
  if (del) del.style.display = mode === 'selected' ? '' : 'none';   // nothing to remove while Armed
  const undo = document.getElementById('btn-ctl-sticker-undo');
  if (undo) undo.style.display = ctlStickerState.history.length ? '' : 'none';

  const sel = ctlStickerState.stickers[ctlStickerState.selected];
  if (mode === 'selected' && sel) {
    const rot = document.getElementById('ctl-sticker-rot');
    const size = document.getElementById('ctl-sticker-size');
    if (rot) rot.value = String(Math.round(sel.rot * 180 / Math.PI));
    if (size && ctlGeo) {
      const U = ctlGeo.userData;
      const r = sel.surface === 'shell' ? sel.size : sel.r;
      if (size) size.value = String(Math.round(r * 1.96 / (U.maxx - U.minx) * 100));
    }
  }
}
```

- [ ] **Step 3: Add the tab, slider and button listeners**

These are parse-time bindings alongside the existing `btn-ctl-save` / `btn-ctl-reset` block at the bottom of the file:

```js
document.querySelectorAll('#ctl-tabs [data-ctl-tab]').forEach(b => {
  b.addEventListener('click', () => {
    const tab = b.getAttribute('data-ctl-tab');
    if (tab === ctlActiveTab) return;
    playPillClick();
    ctlActiveTab = tab;
    if (tab === 'stickers') ctlOpenStickersTab();
    else { ctlStickerDispatch({ t: 'done' }); ctlRenderPanel(); }
  });
});

/* First open pays for the manifest fetch and the surface build. Measured at
   339 ms on a desktop; a low-end phone is plausibly 3-5x that, so the panel
   says what it is doing rather than sitting blank. */
function ctlOpenStickersTab() {
  ctlRenderPanel();                       // shows "Getting the stickers out…"
  ctlLoadStickerManifest().then(() => {
    ctlEnsureStickerSurface();
    ctlRenderPanel();
    ctlStickerSay(ctlStickerState.stickers.length
      ? 'Tap a sticker to move it, or pick a new one.'
      : 'Pick a sticker, then tap the controller.');
  });
}

/* Live on input, so the sticker resizes/turns under the finger. These
   deliberately do NOT push undo history — a single drag would otherwise fill
   the stack with a hundred intermediate values; undo steps over the whole
   adjustment to the last place/relocate/remove (see ctlStickerReduce). */
['ctl-sticker-rot', 'ctl-sticker-size'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', () => {
    const sel = ctlStickerState.stickers[ctlStickerState.selected];
    if (!sel) return;
    const patch = id === 'ctl-sticker-rot'
      ? { rot: ctlStickerWantRot() }
      : (sel.surface === 'shell'
          ? { size: ctlStickerWantRadius() }
          : { r: Math.min(ctlStickerWantRadius(), CTL_EAR_MAX_R) });
    ctlStickerDispatch({ t: 'adjust', patch: patch });
  });
});

document.getElementById('btn-ctl-sticker-undo').addEventListener('click', () => {
  playWhoosh();
  ctlStickerDispatch({ t: 'undo' });
  ctlStickerSay('Put that back.');
});
document.getElementById('btn-ctl-sticker-delete').addEventListener('click', () => {
  playExit();
  ctlStickerDispatch({ t: 'delete' });
  ctlStickerSay('Peeled it off.');
});
document.getElementById('btn-ctl-sticker-done').addEventListener('click', () => {
  playDone();
  ctlStickerDispatch({ t: 'done' });
  ctlStickerSay('');
});
```

Reset the tab in `ctlOpenWorkshop` (`ctlActiveTab = 'colours';` beside `ctlActiveGroup = 'shell';`) so the Workshop always opens on Colours.

**The Reset button must clear stickers too** — it currently assigns `CTL_DEFAULTS`, which has no `stickers` key, leaving the previous placements attached to a factory-coloured shell:

```js
document.getElementById('btn-ctl-reset').addEventListener('click', () => {
  playWhoosh();
  ctlDraft = Object.assign({}, CTL_DEFAULTS, { stickers: [] });
  ctlStickerState = { stickers: [], armed: null, selected: -1, history: [] };
  ctlApplyDesign(ctlDraft);
  ctlRenderPanel();
});
```

- [ ] **Step 4: Add the tile styles to `css/styles.css`**

Alongside the existing `.ctl-swatch` rules (around line 3136):

```css
/* The Workshop's slider. It is not a game, so it has no [abbr]-range class of
   its own — but borrowing another game's would be exactly the FRT_LEAF mistake
   ui-style.md § Menu Title Treatment records (reaching for an existing accent
   constant without checking it is actually this surface's colour). Three rules,
   the same shape as every .[abbr]-range: base, webkit thumb, moz thumb. */
.ctl-range {
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 9999px;
  background: linear-gradient(to right, #ede9fe, #a855f7);
  outline: none;
  cursor: pointer;
}
.ctl-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 22px; height: 22px;
  border-radius: 50%;
  background: #a855f7;
  border: 3px solid #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
}
.ctl-range::-moz-range-thumb {
  width: 22px; height: 22px;
  border-radius: 50%;
  background: #a855f7;
  border: none;
  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
}

/* Sticker book tiles. 4 columns x 68px + 3 x 8px gap = 296px, inside the 312px
   a max-w-sm panel leaves once its own padding is taken — and comfortably over
   the 44px touch minimum (ui-style.md § Thumb-Friendly UI). */
.ctl-sticker-tile {
  position: relative;
  aspect-ratio: 1 / 1;
  min-height: 44px;
  border-radius: 0.75rem;
  background: #fff;
  border: 2px solid #e7e5e4;
  padding: 0.35rem;
  transition: transform 120ms ease, border-color 120ms ease;
}
.ctl-sticker-tile:active { transform: scale(0.95); }
.ctl-sticker-tile-on { border-color: #a855f7; box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.22); }
/* the placed badge — a filled dot, not a tick: it marks state, not success */
.ctl-sticker-dot {
  position: absolute; top: 4px; right: 4px;
  width: 10px; height: 10px; border-radius: 9999px;
  background: #a855f7; border: 2px solid #fff;
}
```

- [ ] **Step 5: Verify the tab at 390 px with `visual-check`**

Invoke the **`visual-check`** skill. Assert, at a 390 px viewport:
- every `.ctl-sticker-tile` has `getBoundingClientRect().height >= 44` and `width >= 44`
- the tab bar's two pills are on one line and do not wrap
- with a placement selected, `#ctl-sticker-controls` is visible and the three buttons are each `>= 44` tall
- `#screen-workshop` does not scroll horizontally (`scrollWidth <= clientWidth`)
- switching Colours → Stickers → Colours preserves `#ctl-panel`'s `scrollTop`

- [ ] **Step 6: Commit**

```bash
git add index.html js/controller.js css/styles.css
git commit -m "feat(controller): the Stickers tab

Two tabs, not three: the placed list lives inside the Stickers tab as the book
itself, so there is one surface to scan. A placed tile selects its placement
rather than re-arming the design, which is how a sticker on the back face or an
ear is reached without rotating to find it. The two bodies are siblings toggled
by display so each keeps its scroll position and the sliders survive a repaint
of the book. Reset now clears placements as well as colours.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 10: Saved stickers on the lobby ornament

Implements **plan decision P2**. A decorated controller must look decorated on the lobby — that is the whole payoff — without putting a 339 ms build on the app's front door for a player who has never placed one.

**Files:**
- Modify: `js/controller.js`

**Interfaces:**
- Consumes: `ctlEnsureStickerSurface` (Task 5).
- Produces: `ctlMaybeBuildStickerSurface()` — schedules a deferred build when the design being applied has at least one placement.

- [ ] **Step 1: Schedule the build from the design, not the screen**

```js
/* A design with stickers needs the surface; a design without one never builds
   it. So the trigger is the DESIGN, not the screen — which is what lets the
   lobby ornament show a decorated controller while preserving the guarantee
   that colour-only use pays nothing (spec § 5.2).

   Deferred exactly the way ctlMountLobby already defers buildBody: this runs
   on the app's front door, and the build is the single most expensive thing
   the feature does. */
let ctlStickerBuildQueued = false;
function ctlMaybeBuildStickerSurface() {
  if (ctlStickerSurface || ctlStickerBuildQueued) return;
  if (!ctlDesign || !Array.isArray(ctlDesign.stickers) || !ctlDesign.stickers.length) return;
  ctlStickerBuildQueued = true;
  const run = () => {
    ctlStickerBuildQueued = false;
    /* The manifest gates rule 2 of the load validation, so it has to land
       first — otherwise every placement is dropped as an unknown id. */
    ctlLoadStickerManifest().then(() => {
      ctlDesign.stickers = ctlValidateStickers(ctlDesign.stickers, {
        known: new Set(ctlStickerManifest.map(s => s.id)),
      });
      ctlEnsureStickerSurface();     // re-validates with the legality probe and repaints
    });
  };
  if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 2000 });
  else setTimeout(run, 0);
}
```

- [ ] **Step 2: Call it from `ctlApplyDesign`**

```js
function ctlApplyDesign(design) {
  if (design) ctlDesign = Object.assign({}, ctlDesign, design);
  if (!ctlBuilt) return;
  ctlRedrawShell();
  ctlRedrawEars();
  ctlSetButtonColour(ctlDesign.buttons);
  ctlMaybeBuildStickerSurface();   // no-op unless this design actually has stickers
  ctlWake();
}
```

- [ ] **Step 3: Verify both halves of the guarantee**

```js
const out = await p.evaluate(async () => {
  // (a) a colour-only design must NEVER build the surface
  localStorage.setItem('sylly_controller', JSON.stringify({
    v: 1, shell: '#A855F7', plate: '#9333EA', ears: '#14B8A6', buttons: '#18181B' }));
  location.reload();
});
```
Reload, then:
```js
await p.waitForFunction(() => window.ctlBuilt === true);
await p.waitForTimeout(2500);
console.log('colour-only built surface?',
  await p.evaluate(() => ctlStickerSurface !== null), 'atlas', await p.evaluate(() => CTL_ATLAS));
```
Expected: `false`, `1024`. **This is the guarantee the whole lazy design exists to keep** — if it prints `true`, something is calling `ctlEnsureStickerSurface` eagerly.

Then the other half:
```js
await p.evaluate(() => {
  localStorage.setItem('sylly_controller', JSON.stringify({
    v: 1, shell: '#FFE500', plate: '#FFE500', ears: '#FFE500', buttons: '#18181B',
    stickers: [{ id: 'banana', surface: 'shell', x: 1.16, y: -0.12, back: false,
                 rot: 0, size: 0.18, chart: 'tangent' }] }));
});
await p.reload();
await p.waitForFunction(() => window.ctlStickerSurface !== null, { timeout: 8000 });
console.log('atlas after deferred build', await p.evaluate(() => CTL_ATLAS));
await p.locator('#lobby-controller canvas').screenshot({ path: 'scratchpad/lobby-sticker.png' });
```
Expected: the surface builds within a couple of seconds, `CTL_ATLAS` is `2048`, and the screenshot shows the banana on the lobby ornament with its die-cut border. Confirm the lobby's **first paint** is not blocked — the controller should appear before the sticker does.

- [ ] **Step 4: Commit**

```bash
git add js/controller.js
git commit -m "feat(controller): the lobby ornament shows saved stickers

The trigger is the design, not the screen: a design carrying placements
schedules the surface build on idle and repaints when it lands, so a decorated
controller looks decorated on the lobby while a colour-only design still never
pays the 339 ms build or the 2048 atlas.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 11: Verification sweep and documentation closure

Implements spec § 9 and § 10. The Documentation Integrity Protocol is not optional and is done in the order `CLAUDE.md` gives.

**Files:**
- Modify: `docs/code-map.md`, `CLAUDE.md`, `docs/sw-changelog.md`, `.claude/rules/logic-engine.md`, `docs/implementation-notes/shared-implementation-notes.md`, `docs/decision-log.md`

- [ ] **Step 1: Run the full regression set**

```bash
node tools/verify-controller-stickers.js && \
node tools/verify-controller-state.js && \
node tools/verify-controller-body.js && \
node tools/verify-mp-configs.js && \
node tools/verify-identity-docs.js
```
Expected: all green. The last two are unaffected by this work and are re-run to prove it.

- [ ] **Step 2: The manual pass on a real phone (spec § 9.3)**

No harness reaches any of this. Work through it and record the result in the impl notes:

1. Place a sticker wrapped over an edge — it must continue onto the back sheet, not stop at the crest.
2. Place one flat on an ear.
3. Rotate the controller so a placement is out of view, then **select it from the book** and relocate it.
4. Remove one; undo it; undo a relocate.
5. **Look hard at the annulus just outside the ear bosses, `y ≈ 0.57–0.78` on the back sheet, and the saddle between them** — spec § 12.2 measured the body's worst distortion there, and it is the concrete version of the owner's "around the ears was problematic" report. If it looks too warped, the only lever is `maxDistort`: 0.05–0.06 is the useful range and spec § 12.1 tabulates what each value costs.
6. Check the die-cut border on **FRT `#FFE500`, COMB `#F0A500`, CLD `#8ECAE6`, FLW `#F9A8D4`, GTH `#B1BCA0` and YGI `#F59E0B`** — the six shells measured at 1.01–1.16:1 without it.
7. Save, kill the app, reopen: every placement survives, in the same place.
8. Offline install from cold — the manifest and images fetched while online are still there; a design never fetched simply does not appear (not an error).

- [ ] **Step 3: `docs/code-map.md` (protocol step 1)**

Grep for the `3D Controller / Workshop` section, then offset-Read it — **never full-read this file**. Add: the new element ids from Task 9; the new `ctl*` state and functions; and `js/lib/controller-sticker-surface.js` in that section's file table.

- [ ] **Step 4: `CLAUDE.md` (protocol step 3)**

**Move the outgoing v228 entry verbatim to `docs/sw-changelog.md` FIRST**, then write the v229 entry in § Current Focus — ≤6 lines, one version only. Cover: the Stickers tab, the ported surface module, the runtime-cached `data/stickers/` contract, the adaptive die-cut border, and the new harness. Also add `verify-controller-stickers.js` to the § Verification harnesses table.

- [ ] **Step 5: `logic-engine.md` (protocol step 4)**

Add `js/lib/controller-sticker-surface.js` to § Shared Library Modules beside `controller-body.js`, and note the `data/stickers/` caching contract in § PWA Guardian alongside the `data/packs/` and `data/music/` paragraphs.

- [ ] **Step 6: `shared-implementation-notes.md` (protocol step 5)**

Root cause lives in engine/lib code, so this file, not a game's. Write up, in the **What happened → Root cause → Lesson** shape:

- **The caller-side config.** A pure module whose tuned constants all live at its call site ports cleanly and silently wrong. Lesson: when porting a module that takes an options object, port the *call site* as a named constant in the same commit, and write the assertion that fails when the options are absent — here, that a surface built with `{}` **accepts** all four keep-out centres.
- **Re-deriving persisted state on load.** `plan()`'s rim snap is not idempotent, so re-planning a saved anchor on every load walks it up to 5.75 atlas texels over 200 loads, monotonically. Lesson: a load path that recomputes what it could have stored is a slow-drift bug generator; store the derived value and re-run the derivation only for its *validity* flag.
- **The bump map has no outward halo.** `if (al <= 0.004) continue;` confines the lip to the sticker's own alpha, so on a matching shell the relief outlines a blank plateau. Lesson: a depth cue is not a contrast cue — check legibility against the actual palette, not against the design's default colours.
- **Default UVs that never mattered until they did.** `buildEars` ships `ExtrudeGeometry`'s default UVs and the colour-only build flood-fills the ear atlas, so nothing depended on them for a whole release. Lesson: "the renderer has never read this attribute" is not the same as "this attribute is right".

- [ ] **Step 7: `docs/decision-log.md` (protocol step 6)**

One entry, newest on top, ~4 lines, a pointer not a deep doc: the sticker sub-project ships; D1–D8 summarised; point at the spec and this plan.

- [ ] **Step 8: Final commit**

```bash
git add docs/ CLAUDE.md .claude/rules/logic-engine.md
git commit -m "docs(controller): close the sticker sub-project

Documentation Integrity Protocol in order: code-map, CLAUDE.md (v228 moved to
the changelog first), logic-engine, shared impl notes, decision log.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Spec coverage

| Spec section | Covered by |
|---|---|
| § 3 scope — inventory, port, lifecycle, tab, persistence | Tasks 1–10 |
| D1 packs-style caching | Task 2 (steps 1, 6) |
| D2 one design, one placement | Task 3 (rule 5, read side) + Task 4 (`bookTap`, write side) |
| D3 `unlocked` reserved | Task 2 (manifest + validator default) |
| D4 exactly two tabs | Task 9 |
| D5 shell and ears | Tasks 5–6 (shell), Task 7 (ears) |
| D6 tap-only, drag still rotates | Task 8 |
| D7 no `CTL_STATE_VERSION` bump | Task 3 (steps 3, 4) |
| D8 adaptive die-cut border | Task 6 |
| § 5.1 new files | Tasks 1, 2 |
| § 5.2 new state and functions | Tasks 2–5, 8, 9 |
| § 5.2b caller-side config | Task 5 (step 2) + Task 1 (harness § 2) |
| § 5.3 redraw additions | Task 5 (shell), Task 7 (ears) |
| § 6 data model, 7 load rules | Task 3 |
| § 7 the tab, the three states, refusal copy | Tasks 8, 9 |
| § 8 PWA | Task 1 (step 5), Task 2 (step 6) |
| § 9.1 the new harness | Tasks 1–4 (built up section by section) |
| § 9.2 `visual-check` | Task 9 (step 5) |
| § 9.3 manual | Task 11 (step 2) |
| § 9.4 regression | Task 11 (step 1) |
| § 10 documentation | Task 11 (steps 3–7) |
| § 12.1 `maxDistort` is an inert dial | Task 5 (step 2 comment), Task 11 (step 2, item 5) |
| § 12.2 distortion is around the ears | Task 11 (step 2, item 5) |
| § 12.3 the seam is `edge` working | Task 1 (harness § 3, the paired size assertion) |
| § 12.4 legibility | Task 6 |
| § 11 out of scope | Nothing here implements textures, unlock gating, or cross-device sync |
