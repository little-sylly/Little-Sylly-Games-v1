# Premium Lounge Greybox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Premium lounge as a working sandbox under `wip/premium/` — a fully procedural Three.js room whose props are doors (TV → TV mode, phone → Shelves, controller → Workshop, dial → Random Game into TV mode, jukebox → sound), recoloured live from the player's controller design — to the point where the owner can judge the toy-diorama look and every interaction on a real screen.

**Architecture:** Four plain-script files with `prm` prefix: `prm-lib.js` (the moulded helper, canvas textures, materials, `prmApplyDesign`), `prm-room.js` (the shell), `prm-props.js` (one pure builder per prop + the action/placement data), `prm-scene.js` (renderer, lights, env map, camera, picking, motion contract, host contract). Builders take an injected `lib` (which carries `THREE`), touch no DOM and tag materials by role, so `verify-prm-props.js` drives every builder under Node with a stub canvas. Images (stickers, lamp portraits) are never loaded by a builder — a material is tagged `userData.prmImage = url` and the scene loads it after mount.

**Tech Stack:** Three.js r128 (vendored `js/lib/three.min.js`), `js/lib/controller-body.js` (`buildBody`/`buildEars`/`buildControls`/`smoothNormals`), the verified 20-game table `wip/lobby-lab/games.js`, `data/stickers/`, Node for the harness, Playwright (outside the repo, per the `visual-check` skill) for screenshots.

**Spec:** `docs/superpowers/specs/2026-09-18-premium-lounge-scene-design.md` — read it first; every task below cites the section it implements.

## Global Constraints

- **Sandbox only.** Everything lives under `wip/premium/`. Never edit `index.html` (generated), `sw.js`, `src/screens/`, or any `js/` file.
- **No new dependencies, no build step, no model files, no painted textures.** Geometry is primitives + `ExtrudeGeometry`; patterns are canvas-drawn (spec § 4, D1). No post-processing passes (spec § 1.1).
- **Prefix `prm`.** Globals: `window.PrmLib`, `window.PrmRoom`, `window.PrmProps`, `window.PrmScene`; every function `prm*`, every constant `PRM_*`.
- **Builders are pure:** signature `(lib, …data)`, `lib.THREE` for Three, no `window`/`document`/`localStorage`. The harness throws on any such access.
- **Colour inheritance (spec § 10):** every recolourable material carries `material.userData.prmRole ∈ {shell, plate, ears, buttons}`; the scene never copies a hex. Room, binder and lamp use fixed neutrals.
- **Reduced motion is checked in JS** (`prmReducedMotion()`); the global CSS block cannot see a RAF loop (spec § 11).
- **Timer lifecycle:** every RAF, interval and timeout is cleared in `dispose()`.
- **Australian English** in every string and comment. No emoji on action buttons.
- **Commits:** one per task, message prefix `feat(premium):` / `test(premium):` / `docs(premium):`, ending with the attribution line `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- **Screens:** the sandbox is 16:9 widescreen; below `900×500` it shows the honest card (spec § 13).

---

## File map

| File | Responsibility | Created in |
|---|---|---|
| `wip/premium/lamp images/manifest.json` | The lamp's panel set (spec § 7.6) | Task 1 |
| `wip/premium/prm-hud.css` | The 2D layer: heading, keycap, status, focus ring, fade, honest card | Task 1 |
| `wip/premium/index.html` | Sandbox page: loads scripts, fetches manifests, stub host, mounts | Task 1 (skeleton) · Task 4 (mount) |
| `wip/premium/verify-prm-props.js` | Node harness — grows a section per task | Task 1 (scaffold) |
| `wip/premium/prm-lib.js` | `prmCreateLib`, `prmApplyDesign` | Task 2 |
| `wip/premium/prm-room.js` | `prmBuildRoom` | Task 3 |
| `wip/premium/prm-scene.js` | `prmMount`, `prmValidateHost`, `prmEligible`, `prmReducedMotion` | Task 4 |
| `wip/premium/visual-prm.js` | Playwright screenshots + the reduced-motion / idle-RAF checks | Task 4 |
| `wip/premium/prm-props.js` | `PRM_ACTIONS`, `PRM_PLACES`, `PRM_TAB_ORDER`, `prmBuildAll`, the builders | Task 5 → 9 |
| `wip/premium/shots/*.png` | Committed screenshots the owner reviews | Task 4 onward |
| `wip/premium/HANDOFF-claude-design.md` | The 2D-chrome handoff (spec § 17) | Task 12 |

**Interfaces shared by every task (defined in Task 2 and Task 5, repeated here so a task can be read alone):**

```js
// prm-lib.js
const lib = PrmLib.prmCreateLib(THREE, { makeCanvas, smoothNormals });
lib.THREE                                   // the injected Three
lib.moulded(w, h, d, r, opt) → BufferGeometry  // rounded-rect extrude, bevelled, centred, smoothed; front face +z
lib.extrude(shape, d, bevel, opt) → BufferGeometry // opt.center === false keeps the shape's origin
lib.roundedRect(w, h, r) → THREE.Shape
lib.tex.wood(base, dark, rx, ry) / wallpaper() / weave() / boucle() / quilt() / label(text, bg, ink, w, h) / abstract(seed)
lib.mats.birch, birchDark, floor, wall, rug, fabric, cream, skirting, plum, black, chrome, brass, curtain, window, shade, yellow, yellowDark, paper, sleeve, emissive(hex, intensity)
lib.role(role, hex, extra) → MeshStandardMaterial with userData.prmRole = role
PrmLib.prmApplyDesign(root, design) → number of meshes repainted

// prm-props.js
PrmProps.PRM_ACTIONS      // prmId → { callback | local, arg?, pushIn?, spin?, turn?, fade?, optional?, fallback? }
PrmProps.PRM_PLACES       // prop id → { pos: [x,y,z], rot?: [x,y,z] }
PrmProps.PRM_TAB_ORDER    // ['tv-screen','jukebox-record','dial','binder','phone','controller','lamp']
PrmProps.PRM_BUILDERS     // prop id → (ctx, shared) => Group
PrmProps.prmBuildAll(ctx) → { [propId]: Group }
// every prop Group: .name = propId, .userData.prmId on the pick node(s), .userData.api = { tick(now, dt, reduced) → bool, … }
```

---

### Task 1: Sandbox skeleton, lamp manifest, harness scaffold, spec touch-ups

**Files:**
- Create: `wip/premium/lamp images/manifest.json`
- Create: `wip/premium/prm-hud.css`
- Create: `wip/premium/index.html`
- Create: `wip/premium/verify-prm-props.js`
- Modify: `docs/superpowers/specs/2026-09-18-premium-lounge-scene-design.md` (§ 5 file table, § 7.5 one sentence, § 9.3 two field shapes, § 15 one line)

**Interfaces:**
- Produces: the harness's `ok`/`eq`/`section` helpers and its canvas stub, which every later task's checks use verbatim; `window.prmReady`, `window.prmDebug` names the visual driver reads.

- [ ] **Step 1: Write the lamp manifest**

```json
{ "schema": 1, "rows": 1,
  "panels": [
    { "id": "laughing",   "image": "laughing.jpg" },
    { "id": "victory",    "image": "victory.jpg" },
    { "id": "focused",    "image": "focused.jpg" },
    { "id": "confused",   "image": "confused.jpg" },
    { "id": "startled",   "image": "startled.jpg" },
    { "id": "bored",      "image": "bored.jpg" },
    { "id": "meh",        "image": "meh.jpg" },
    { "id": "sad",        "image": "sad.jpg" },
    { "id": "frustrated", "image": "frustrated.jpg" }
  ] }
```

- [ ] **Step 2: Write the HUD stylesheet**

```css
/* prm-hud.css — the 2D layer over the lounge canvas. Colours are the brief's palette. */
html, body { margin: 0; height: 100%; background: #FAFAF9; font-family: Fredoka, system-ui, sans-serif; color: #2B1B45; overflow: hidden; }
#prm-stage { position: fixed; inset: 0; }
#prm-canvas { width: 100%; height: 100%; display: block; outline: none; }
#prm-canvas:focus-visible { box-shadow: inset 0 0 0 3px #2B1B45; }
#prm-vignette { position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 55%, rgba(43,27,69,0.28) 100%); }
#prm-hud { position: absolute; inset: 0; pointer-events: none; z-index: 2; }   /* above the fade, so Reset view stays reachable */
#prm-hud > * { pointer-events: auto; }
#prm-heading { position: absolute; left: 32px; top: 24px; margin: 0; font-size: 28px; font-weight: 700; }
#prm-status { position: absolute; left: 32px; top: 64px; font-size: 14px; color: #6b5d80; min-height: 18px; }
#prm-tools { position: absolute; right: 24px; top: 24px; display: flex; gap: 8px; }
.prm-keycap { border: 0; border-radius: 14px; padding: 10px 16px; font: 600 15px Fredoka, sans-serif; color: #fff;
  background: #E9408E; box-shadow: 0 4px 0 rgba(0,0,0,0.18); cursor: pointer; transition: transform 120ms ease-out; }
.prm-keycap:active { transform: translateY(3px); box-shadow: none; }
.prm-keycap.prm-light { background: #fff; color: #2B1B45; }
.prm-swatch { width: 34px; height: 34px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 2px 0 rgba(0,0,0,0.18); cursor: pointer; }
#prm-focus { position: absolute; display: none; border: 3px solid #2B1B45; border-radius: 10px; pointer-events: none; }
#prm-fade { position: absolute; inset: 0; z-index: 1; background: #FAFAF9; opacity: 0; pointer-events: none; transition: opacity 200ms ease-out; }
#prm-fade.on { opacity: 1; pointer-events: auto; }
#prm-card { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; padding: 24px; background: #FAFAF9; }
#prm-card.on { display: flex; }
#prm-card > div { max-width: 360px; text-align: center; }
#prm-card h2 { margin: 0 0 8px; font-size: 24px; }
#prm-card p { margin: 0 0 16px; color: #6b5d80; }
@media (prefers-reduced-motion: reduce) { .prm-keycap, #prm-fade { transition-duration: 0.01ms; } }
```

- [ ] **Step 3: Write the sandbox page skeleton (mount wiring lands in Task 4)**

```html
<!DOCTYPE html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Premium — the lounge (sandbox)</title>
<link rel="stylesheet" href="../../css/styles.css">
<link rel="stylesheet" href="prm-hud.css">
</head>
<body>
<div id="prm-stage">
  <canvas id="prm-canvas" tabindex="0" aria-label="Little Sylly's lounge. Tab through the room, Enter to use a thing."></canvas>
  <div id="prm-vignette"></div>
  <div id="prm-hud">
    <h1 id="prm-heading">Little Sylly's Lounge</h1>
    <div id="prm-status"></div>
    <div id="prm-tools">
      <button class="prm-swatch" data-design='{"shell":"#a97fd6","plate":"#9670c8","ears":"#a97fd6","buttons":"#8f66c4"}' style="background:#a97fd6" title="Factory lilac"></button>
      <button class="prm-swatch" data-design='{"shell":"#F0A500","plate":"#5C3A21","ears":"#E9408E","buttons":"#8ECAE6"}' style="background:#F0A500" title="Honey / chocolate / pink / glacier"></button>
      <button class="prm-swatch" data-design='{"shell":"#3A3D52","plate":"#E879A8","ears":"#FFE500","buttons":"#10B981"}' style="background:#3A3D52" title="Midnight / rose / lemon / emerald"></button>
      <button id="prm-reset" class="prm-keycap prm-light">Reset view</button>
      <button id="prm-portrait" class="prm-keycap prm-light">Portrait preset</button>
    </div>
    <div id="prm-focus"></div>
  </div>
  <div id="prm-fade"></div>
</div>
<div id="prm-card"><div>
  <h2>The lounge wants a bigger screen.</h2>
  <p>Cast it, or open it on a laptop — the Shelves are right here.</p>
  <button class="prm-keycap">Open the Shelves</button>
</div></div>

<script src="../../js/lib/three.min.js"></script>
<script src="../../js/lib/controller-body.js"></script>
<script src="../lobby-lab/games.js"></script>
<script src="prm-lib.js"></script>
<script src="prm-room.js"></script>
<script src="prm-props.js"></script>
<script src="prm-scene.js"></script>
<script>
  // Mount wiring is added in Task 4. Until then the page proves the scripts load.
  window.prmReady = false;
</script>
</body>
</html>
```

- [ ] **Step 4: Write the harness scaffold**

```js
// verify-prm-props.js — the pure tier of the Premium lounge (wip/premium/prm-*.js).
// Drives every builder under Node with the vendored Three and a stub canvas, so a
// geometry or contract slip is caught before a pixel exists. Sections are added
// task by task. Run: node wip/premium/verify-prm-props.js   (exits 1 on any failure)
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');

let pass = 0, fail = 0, current = '';
const section = (name) => { current = name; console.log('── ' + name + ' ──'); };
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log('  FAIL [' + current + '] ' + msg); } };
const eq = (a, b, msg) => ok(a === b, `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
const near = (a, b, tol, msg) => ok(Math.abs(a - b) <= tol, `${msg} — got ${a}, want ${b} ±${tol}`);

// A 2D context that accepts every call and returns itself, so texture code runs
// under Node without drawing. Anything that READS a context value (measureText,
// getImageData) is deliberately unsupported — builders must not depend on one.
const ctxProxy = new Proxy(function () {}, {
  get: (t, k) => (k === Symbol.toPrimitive ? undefined : ctxProxy),
  set: () => true,
  apply: () => ctxProxy,
});
const makeCanvas = (w, h) => ({ width: w, height: h, getContext: () => ctxProxy });

global.window = global;
const THREE = require(path.join(ROOT, 'js/lib/three.min.js'));
require(path.join(ROOT, 'js/lib/controller-body.js'));
const CB = global.window.ControllerBody;
const { GAMES } = require(path.join(ROOT, 'wip/lobby-lab/games.js'));

// The purity trap, armed AFTER the vendored Three has loaded (it may probe
// `document` at load time; the prm-* modules must never): any builder touching
// the DOM throws here.
const forbid = (name) => { Object.defineProperty(global, name, { get() { throw new Error('builder touched ' + name); }, configurable: true }); };
forbid('document'); forbid('localStorage');

section('load');
ok(THREE.REVISION === '128', 'Three r128 loads under Node');
ok(typeof CB.buildEars === 'function', 'ControllerBody present');
eq(GAMES.length, 20, 'games.js holds 20 games');

// Later tasks append their sections above this line.
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 5: Run the scaffold**

Run: `node wip/premium/verify-prm-props.js`
Expected: `3 passed, 0 failed`, exit 0.

- [ ] **Step 6: Spec touch-ups (the plan refines four details of the spec; keep them in sync)**

In `docs/superpowers/specs/2026-09-18-premium-lounge-scene-design.md`:

1. § 5 table: replace the two-row `prm-scene.js` / `prm-props.js` description with the four-file map from this plan's *File map* (prm-lib / prm-room / prm-props / prm-scene) and change the builder signature sentence to: *"each builder is `prmBuildX(lib, …data) → Group`, where `lib` carries `THREE`, the moulded helper, the canvas textures and the material set, injected by the scene (or by the harness)."*
2. § 7.5, after "Stickers render through the same atlas path": append *"— in **production**. The sandbox mounts the shipped geometry with the design's four flat colours (no plate outline, no stickers), because the atlas painter lives in `js/controller.js` and is wired in the production round."*
3. § 9.3: change `games, stickers, design,` to `games, stickers: { base, list }, design, lampPanels: { base, manifest },` and delete the standalone `lampPanels,` line.
4. § 15: "two JS files (`prm-scene.js`, `prm-props.js`)" → "four JS files (`prm-lib.js`, `prm-room.js`, `prm-props.js`, `prm-scene.js`)".

- [ ] **Step 7: Commit**

```bash
git add "wip/premium/lamp images/manifest.json" wip/premium/prm-hud.css wip/premium/index.html wip/premium/verify-prm-props.js docs/superpowers/specs/2026-09-18-premium-lounge-scene-design.md
git commit -m "feat(premium): sandbox skeleton, lamp manifest, harness scaffold" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: `prm-lib.js` — the moulded helper, canvas textures, materials, `prmApplyDesign`

**Files:**
- Create: `wip/premium/prm-lib.js`
- Modify: `wip/premium/verify-prm-props.js` (append the `lib` section)

**Interfaces:**
- Consumes: `THREE`, an injected `makeCanvas(w, h)`, an injected `smoothNormals(THREE, geo, creaseDeg)` (from `ControllerBody`).
- Produces: `PrmLib.prmCreateLib(THREE, { makeCanvas, smoothNormals }) → lib` and `PrmLib.prmApplyDesign(root, design) → count` exactly as listed in *File map → Interfaces*. `lib.moulded` extrudes along **z** (front face +z) and is centred. `lib.role(role, hex, extra)` returns a `MeshStandardMaterial` tagged `userData.prmRole`; set `material.userData.prmEmissive = true` if `emissive` should follow the design too.

- [ ] **Step 1: Append the failing harness section**

Insert above `// Later tasks append their sections above this line.`:

```js
section('lib');
const PrmLib = require(path.join(ROOT, 'wip/premium/prm-lib.js'));
const lib = PrmLib.prmCreateLib(THREE, { makeCanvas, smoothNormals: CB.smoothNormals });
ok(lib.THREE === THREE, 'lib carries the injected THREE');
{
  const g = lib.moulded(0.6, 0.4, 0.3, 0.05);
  g.computeBoundingBox(); const s = new THREE.Vector3(); g.boundingBox.getSize(s);
  near(s.x, 0.6, 0.002, 'moulded width'); near(s.y, 0.4, 0.002, 'moulded height'); near(s.z, 0.3, 0.002, 'moulded depth');
  const c = new THREE.Vector3(); g.boundingBox.getCenter(c);
  near(c.length(), 0, 0.002, 'moulded geometry is centred');
  ok(!!g.attributes.normal, 'moulded geometry has normals');
}
{
  const g = lib.extrude(lib.roundedRect(0.2, 0.2, 0.02), 0.1, 0.01, { center: false });
  g.computeBoundingBox();
  near(g.boundingBox.min.z, -0.01, 0.002, 'extrude with center:false keeps the shape origin (bevel below z=0)');
}
['wood', 'wallpaper', 'weave', 'boucle', 'quilt'].forEach(k => {
  const t = lib.tex[k](); ok(t && t.isTexture && t.wrapS === THREE.RepeatWrapping, `tex.${k} returns a repeating texture`);
});
ok(lib.tex.label('Hello').isTexture, 'tex.label returns a texture');
ok(lib.tex.abstract(3).isTexture, 'tex.abstract returns a texture');
['birch', 'birchDark', 'floor', 'wall', 'rug', 'fabric', 'cream', 'skirting', 'plum', 'black', 'chrome', 'brass', 'curtain', 'window', 'shade', 'yellow', 'yellowDark', 'paper', 'sleeve']
  .forEach(k => ok(lib.mats[k] && lib.mats[k].isMaterial, `mats.${k} exists`));
ok(lib.mats.emissive('#ff0000', 2).emissiveIntensity === 2, 'mats.emissive takes an intensity');
{
  const m = lib.role('ears', '#112233'); eq(m.userData.prmRole, 'ears', 'role() tags the material');
  eq(m.color.getHexString(), '112233', 'role() sets the colour');
  const root = new THREE.Group();
  const a = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), lib.role('shell', '#000000'));
  const b = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), lib.role('ears', '#000000'));
  const c = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), lib.mats.cream);
  root.add(a, b, c);
  const n = PrmLib.prmApplyDesign(root, { shell: '#aaaaaa', plate: '#bbbbbb', ears: '#cccccc', buttons: '#dddddd' });
  eq(n, 2, 'applyDesign repaints exactly the role-tagged meshes');
  eq(a.material.color.getHexString(), 'aaaaaa', 'shell follows design.shell');
  eq(b.material.color.getHexString(), 'cccccc', 'ears follow design.ears');
  eq(c.material.color.getHexString(), lib.mats.cream.color.getHexString(), 'untagged material untouched');
  const before = c.material.color.getHex();
  PrmLib.prmApplyDesign(root, { shell: '#aaaaaa', plate: '#bbbbbb', ears: '#123456', buttons: '#dddddd' });
  eq(b.material.color.getHexString(), '123456', 'changing one role changes that role');
  eq(a.material.color.getHexString(), 'aaaaaa', 'and no other role');
  eq(c.material.color.getHex(), before, 'and nothing untagged');
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `node wip/premium/verify-prm-props.js`
Expected: throws `Cannot find module '…/prm-lib.js'`.

- [ ] **Step 3: Write `prm-lib.js`**

```js
// ═══════════════════════════════════════════════════════════════════════════
// prm-lib.js — Premium lounge: the moulded-plastic helper, canvas-drawn
// surface patterns and the material set. Spec § 4.
//
// Pure: THREE, a canvas factory and smoothNormals are INJECTED, so
// wip/premium/verify-prm-props.js can drive it under Node. No DOM, no globals.
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  function prmRoundedRect(THREE, w, h, r) {
    const s = new THREE.Shape(); const x = -w / 2, y = -h / 2; r = Math.min(r, w / 2, h / 2);
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }

  /* ExtrudeGeometry puts bevelThickness on BOTH ends, so the caller's depth d
     is the total: the straight run is d - 2*bevel. Centred unless opt.center
     === false (the dial's wedge keeps its origin at the dial's centre). */
  function prmExtrude(THREE, shape, d, bevel, opt, smoothNormals) {
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(d - 2 * bevel, 0.0005), bevelEnabled: bevel > 0,
      bevelThickness: bevel, bevelSize: bevel,
      bevelSegments: opt.bevelSegments || 4, curveSegments: opt.curveSegments || 12 });
    if (opt.center !== false) geo.center();
    if (opt.smooth !== false && smoothNormals) smoothNormals(THREE, geo, opt.crease || 35);
    return geo;
  }

  /* Deterministic pseudo-random: a texture is the same on every mount. */
  const prmRng = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

  function prmTextures(THREE, makeCanvas) {
    const wrap = (c, rx, ry, linear) => {
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
      t.encoding = linear ? THREE.LinearEncoding : THREE.sRGBEncoding; return t;
    };
    const flat = (c) => { const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; };
    return {
      wood(base = '#dcc2a0', dark = '#b8946a', rx = 3, ry = 3) {
        const c = makeCanvas(512, 512), x = c.getContext('2d'), r = prmRng(7);
        x.fillStyle = base; x.fillRect(0, 0, 512, 512);
        for (let p = 0; p < 6; p++) { x.fillStyle = 'rgba(0,0,0,' + (0.02 + r() * 0.03) + ')'; x.fillRect(0, p * 86, 512, 2); }
        x.strokeStyle = dark;
        for (let i = 0; i < 160; i++) {
          x.globalAlpha = 0.05 + r() * 0.08; x.lineWidth = 1 + r() * 1.5; x.beginPath();
          const y0 = r() * 512; x.moveTo(0, y0);
          for (let xx = 0; xx <= 512; xx += 32) x.lineTo(xx, y0 + Math.sin(xx / 70 + i) * 3);
          x.stroke();
        }
        x.globalAlpha = 1; return wrap(c, rx, ry);
      },
      wallpaper(base = '#f3dccb', tone = '#eccfb9', rx = 6, ry = 4) {
        const c = makeCanvas(256, 256), x = c.getContext('2d');
        x.fillStyle = base; x.fillRect(0, 0, 256, 256); x.strokeStyle = tone; x.lineWidth = 6;
        for (let k = 0; k < 4; k++) { x.beginPath(); x.arc(128, 200, 40 + k * 22, Math.PI, 2 * Math.PI); x.stroke(); }
        return wrap(c, rx, ry);
      },
      weave(rx = 12, ry = 9) {
        const c = makeCanvas(128, 128), x = c.getContext('2d');
        x.fillStyle = '#808080'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#9a9a9a';
        for (let i = 0; i < 128; i += 8) { x.fillRect(i, 0, 3, 128); x.fillRect(0, i, 128, 3); }
        return wrap(c, rx, ry, true);
      },
      boucle(rx = 8, ry = 8) {
        const c = makeCanvas(128, 128), x = c.getContext('2d'), r = prmRng(3);
        x.fillStyle = '#808080'; x.fillRect(0, 0, 128, 128);
        for (let i = 0; i < 400; i++) { x.fillStyle = r() > .5 ? '#a0a0a0' : '#606060'; x.beginPath(); x.arc(r() * 128, r() * 128, 2 + r() * 3, 0, 7); x.fill(); }
        return wrap(c, rx, ry, true);
      },
      quilt(rx = 4, ry = 5) {
        const c = makeCanvas(128, 128), x = c.getContext('2d');
        x.fillStyle = '#909090'; x.fillRect(0, 0, 128, 128); x.strokeStyle = '#404040'; x.lineWidth = 5;
        x.beginPath(); x.moveTo(0, 64); x.lineTo(64, 0); x.lineTo(128, 64); x.lineTo(64, 128); x.closePath(); x.stroke();
        return wrap(c, rx, ry, true);
      },
      label(text, bg = '#f8f1dc', ink = '#2B1B45', w = 256, h = 128) {
        const c = makeCanvas(w, h), x = c.getContext('2d');
        x.fillStyle = bg; x.fillRect(0, 0, w, h); x.fillStyle = ink;
        x.font = 'bold ' + Math.round(h * 0.28) + 'px Fredoka, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(text, w / 2, h / 2); return flat(c);
      },
      abstract(seed = 1, w = 128, h = 128) {
        const c = makeCanvas(w, h), x = c.getContext('2d'), r = prmRng(seed);
        const cols = ['#E9408E', '#F0A500', '#8ECAE6', '#B1BCA0', '#a97fd6'];
        x.fillStyle = '#FAFAF9'; x.fillRect(0, 0, w, h);
        for (let i = 0; i < 4; i++) { x.fillStyle = cols[Math.floor(r() * cols.length)]; x.beginPath(); x.arc(r() * w, r() * h, 14 + r() * 30, 0, 7); x.fill(); }
        return flat(c);
      },
    };
  }

  function prmMaterials(THREE, tex) {
    const std = (o) => new THREE.MeshStandardMaterial(o);
    return {
      birch:      std({ map: tex.wood(), roughness: .6, metalness: 0 }),
      birchDark:  std({ map: tex.wood('#c9a77f', '#9d7a52'), roughness: .62 }),
      floor:      std({ map: tex.wood('#e6d2b4', '#c6a882', 6, 6), roughness: .5 }),
      wall:       std({ map: tex.wallpaper(), roughness: .95 }),
      rug:        std({ color: '#f1ebe1', bumpMap: tex.weave(), bumpScale: .004, roughness: .95 }),
      fabric:     std({ color: '#8d7f74', bumpMap: tex.boucle(), bumpScale: .006, roughness: 1 }),
      cream:      std({ color: '#f4efe6', roughness: .55, metalness: .05 }),
      skirting:   std({ color: '#f7f2ea', roughness: .6 }),
      plum:       std({ color: '#2B1B45', roughness: .6 }),
      black:      std({ color: '#1b1b1f', roughness: .45 }),
      chrome:     std({ color: '#cfd3d8', roughness: .25, metalness: .9 }),
      brass:      std({ color: '#c9a24a', roughness: .35, metalness: .85 }),
      curtain:    std({ color: '#f6efe3', roughness: .9, transparent: true, opacity: .92, side: THREE.DoubleSide }),
      window:     std({ color: '#dbe9f5', emissive: '#dbe9f5', emissiveIntensity: 1.4, roughness: .8 }),
      shade:      std({ color: '#f6ead6', emissive: '#ffd7a0', emissiveIntensity: .35, roughness: .9, side: THREE.DoubleSide }),
      yellow:     std({ color: '#F3E2A0', roughness: .55, bumpMap: tex.quilt(), bumpScale: .0025 }),
      yellowDark: std({ color: '#d9c27a', roughness: .55 }),
      paper:      std({ color: '#ffffff', roughness: .8 }),
      sleeve:     std({ color: '#ffffff', roughness: .15, transparent: true, opacity: .85 }),
      emissive(hex, intensity = 1) { return std({ color: hex, emissive: hex, emissiveIntensity: intensity, roughness: .5 }); },
    };
  }

  function prmCreateLib(THREE, deps) {
    const makeCanvas = deps.makeCanvas, smoothNormals = deps.smoothNormals || null;
    const tex = prmTextures(THREE, makeCanvas);
    return {
      THREE, tex, mats: prmMaterials(THREE, tex), makeCanvas,
      roundedRect: (w, h, r) => prmRoundedRect(THREE, w, h, r),
      moulded(w, h, d, r, opt = {}) {
        const bevel = opt.bevel !== undefined ? opt.bevel : Math.min(r / 3, d / 4);
        return prmExtrude(THREE, prmRoundedRect(THREE, w, h, r), d, bevel, opt, smoothNormals);
      },
      extrude: (shape, d, bevel, opt = {}) => prmExtrude(THREE, shape, d, bevel, opt, smoothNormals),
      role(role, hex, extra = {}) {
        const m = new THREE.MeshStandardMaterial(Object.assign({ color: hex, roughness: .52, metalness: .06 }, extra));
        m.userData.prmRole = role; return m;
      },
    };
  }

  /* One loop, spec § 10: every material tagged with a role takes that role's
     colour. Returns the number of meshes repainted (the harness counts it). */
  function prmApplyDesign(root, design) {
    let n = 0;
    root.traverse(o => {
      if (!o.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      let hit = false;
      mats.forEach(m => {
        const role = m.userData && m.userData.prmRole;
        if (!role || !design[role]) return;
        m.color.set(design[role]);
        if (m.emissive && m.userData.prmEmissive) m.emissive.set(design[role]);
        hit = true;
      });
      if (hit) n++;
    });
    return n;
  }

  const api = { prmCreateLib, prmApplyDesign, prmRoundedRect };
  if (typeof window !== 'undefined') window.PrmLib = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
```

- [ ] **Step 4: Run the harness**

Run: `node wip/premium/verify-prm-props.js`
Expected: all `lib` checks pass, `0 failed`, exit 0.

- [ ] **Step 5: Commit**

```bash
git add wip/premium/prm-lib.js wip/premium/verify-prm-props.js
git commit -m "feat(premium): prm-lib — moulded helper, canvas textures, materials, applyDesign" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---
### Task 3: `prm-room.js` — the shell (spec § 6)

**Files:**
- Create: `wip/premium/prm-room.js`
- Modify: `wip/premium/verify-prm-props.js` (append the `room` section)

**Interfaces:**
- Consumes: `lib` from Task 2.
- Produces: `PrmRoom.prmBuildRoom(lib) → Group` named `room`, children named as in the table below, with `group.userData.prmRoom = { floorY, backZ, leftX, benchZ, benchTopY, tableTopY, armTopY, sideTableTopY }` and `group.userData.prmShelf = { x, z, w, d, ys: [low, mid, top], side }`. Nothing in the room carries `prmId` (not pickable). The rug and floor `receiveShadow`.

| Child name(s) | What |
|---|---|
| `wallBack`, `wallLeft`, `skirtingBack`, `skirtingLeft`, `cornice` | Walls + trim |
| `floor`, `rug` | Floor plane, moulded rug |
| `tableTop`, `tableLeg0..3` | Coffee table |
| `bench`, `benchDrawerL/R`, `benchKnobL/R`, `benchLeg0/1`, `deck`, `deckKey0..3` | TV bench + cassette deck |
| `shelfBack`, `shelfSideL/R`, `shelfBoard0..2` | Bookshelf unit (books + trinkets come from `prmBuildShelf`, Task 9) |
| `sideTableTop`, `sideTableLeg0..2` | Side table |
| `couchArm` | Foreground couch arm |
| `window`, `curtain` | Cool-fill source + wavy curtain |
| `floorLampBase/Stem/Shade` | Warm-key source |
| `printA/B`, `printAFace/BFace` | Two framed prints |

- [ ] **Step 1: Append the failing harness section**

```js
section('room');
const PrmRoom = require(path.join(ROOT, 'wip/premium/prm-room.js'));
const room = PrmRoom.prmBuildRoom(lib);
eq(room.name, 'room', 'room group is named');
const roomNames = new Set(); room.traverse(o => { if (o.name) roomNames.add(o.name); });
['wallBack', 'wallLeft', 'skirtingBack', 'skirtingLeft', 'cornice', 'floor', 'rug', 'tableTop', 'tableLeg0', 'tableLeg3',
 'bench', 'benchDrawerL', 'benchDrawerR', 'benchKnobL', 'benchKnobR', 'deck', 'deckKey3', 'shelfBack', 'shelfSideL', 'shelfSideR',
 'shelfBoard0', 'shelfBoard1', 'shelfBoard2', 'sideTableTop', 'sideTableLeg2', 'couchArm', 'window', 'curtain',
 'floorLampBase', 'floorLampStem', 'floorLampShade', 'printA', 'printAFace', 'printB', 'printBFace']
  .forEach(n => ok(roomNames.has(n), `room has ${n}`));
{
  let picks = 0; room.traverse(o => { if (o.userData.prmId) picks++; });
  eq(picks, 0, 'nothing in the room shell is a pick target');
  const rug = room.getObjectByName('rug'); ok(rug.receiveShadow, 'rug receives shadow');
  const floor = room.getObjectByName('floor'); ok(floor.receiveShadow, 'floor receives shadow');
  const R = room.userData.prmRoom;
  ['floorY', 'backZ', 'leftX', 'benchZ', 'benchTopY', 'tableTopY', 'armTopY', 'sideTableTopY'].forEach(k => ok(typeof R[k] === 'number', `prmRoom.${k} is a number`));
  near(R.benchTopY, 0.52, 0.001, 'bench top height'); near(R.tableTopY, 0.44, 0.001, 'table top height');
  const S = room.userData.prmShelf; eq(S.ys.length, 3, 'three shelf boards');
  room.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(room.getObjectByName('tableTop'));
  near(bb.max.y, R.tableTopY, 0.001, 'tableTop surface equals prmRoom.tableTopY');
  const arm = new THREE.Box3().setFromObject(room.getObjectByName('couchArm'));
  near(arm.max.y, R.armTopY, 0.002, 'couchArm top equals prmRoom.armTopY');
  const cur = room.getObjectByName('curtain'); const cb = new THREE.Box3().setFromObject(cur);
  ok(cb.max.y - cb.min.y > 2.0, 'curtain is tall (extruded vertically, not lying flat)');
}
```

- [ ] **Step 2: Run to see it fail** — `node wip/premium/verify-prm-props.js` → `Cannot find module '…/prm-room.js'`.

- [ ] **Step 3: Write `prm-room.js`**

```js
// ═══════════════════════════════════════════════════════════════════════════
// prm-room.js — Premium lounge: the shell. Walls, floor, rug, furniture, the
// curtain, the floor lamp, two prints. Spec § 6. Everything is geometry; every
// patterned surface is a canvas texture from prm-lib. Fixed warm neutrals —
// never the player's colours (the props are what pop).
// Pure: takes lib, touches no DOM. Nothing here is a pick target.
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  function prmBuildRoom(lib) {
    const { THREE, mats, moulded, tex } = lib;
    const R = { floorY: 0, backZ: -3.0, leftX: -3.0, benchZ: -2.55, benchTopY: 0.52, tableTopY: 0.44, armTopY: 0.58, sideTableTopY: 0.565 };
    const g = new THREE.Group(); g.name = 'room';
    const add = (name, geo, mat, pos, rot, o = {}) => {
      const m = new THREE.Mesh(geo, mat); m.name = name; m.position.set(pos[0], pos[1], pos[2]);
      if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
      m.receiveShadow = o.receive !== false; m.castShadow = !!o.cast; g.add(m); return m;
    };
    const FLAT = [-Math.PI / 2, 0, 0];   // a moulded slab extrudes along z; this lays it on the floor

    // walls + trim
    add('wallBack', new THREE.PlaneGeometry(8, 3.2), mats.wall, [0.5, 1.6, R.backZ]);
    add('wallLeft', new THREE.PlaneGeometry(8, 3.2), mats.wall, [R.leftX, 1.6, -0.2], [0, Math.PI / 2, 0]);
    add('skirtingBack', new THREE.BoxGeometry(8, 0.1, 0.02), mats.skirting, [0.5, 0.05, R.backZ + 0.01]);
    add('skirtingLeft', new THREE.BoxGeometry(0.02, 0.1, 8), mats.skirting, [R.leftX + 0.01, 0.05, -0.2]);
    add('cornice', new THREE.BoxGeometry(8, 0.06, 0.04), mats.skirting, [0.5, 3.17, R.backZ + 0.02]);
    add('floor', new THREE.PlaneGeometry(9, 9), mats.floor, [0.5, 0, 0.5], FLAT);

    // rug — receives every table prop's contact shadow
    add('rug', moulded(2.3, 1.7, 0.012, 0.08, { bevel: 0.004 }), mats.rug, [0.1, 0.006, 0.35], FLAT);

    // coffee table (top surface = tableTopY)
    add('tableTop', moulded(1.1, 0.62, 0.04, 0.05), mats.birch, [0.1, R.tableTopY - 0.02, 0.35], FLAT, { cast: true });
    [[-0.48, 0.22], [0.48, 0.22], [-0.48, -0.22], [0.48, -0.22]].forEach(([x, z], i) =>
      add('tableLeg' + i, new THREE.CylinderGeometry(0.02, 0.025, 0.4, 16), mats.birchDark, [0.1 + x, 0.2, 0.35 + z], null, { cast: true }));

    // TV bench: body spans y 0.08..0.52, sits on two short legs; the deck lives in the open middle
    add('bench', moulded(1.9, 0.44, 0.46, 0.05), mats.birch, [0.3, 0.30, R.benchZ], null, { cast: true });
    add('benchDrawerL', moulded(0.5, 0.16, 0.02, 0.02), mats.birchDark, [-0.35, 0.30, R.benchZ + 0.235]);
    add('benchDrawerR', moulded(0.5, 0.16, 0.02, 0.02), mats.birchDark, [0.95, 0.30, R.benchZ + 0.235]);
    add('benchKnobL', new THREE.CylinderGeometry(0.015, 0.015, 0.02, 16), mats.brass, [-0.35, 0.30, R.benchZ + 0.255], [Math.PI / 2, 0, 0]);
    add('benchKnobR', new THREE.CylinderGeometry(0.015, 0.015, 0.02, 16), mats.brass, [0.95, 0.30, R.benchZ + 0.255], [Math.PI / 2, 0, 0]);
    [-0.55, 1.15].forEach((x, i) => add('benchLeg' + i, new THREE.CylinderGeometry(0.02, 0.02, 0.08, 12), mats.birchDark, [x, 0.04, R.benchZ]));
    add('deck', moulded(0.42, 0.1, 0.3, 0.015), mats.cream, [0.3, 0.30, R.benchZ + 0.06], null, { cast: true });
    for (let i = 0; i < 4; i++) add('deckKey' + i, new THREE.BoxGeometry(0.03, 0.012, 0.02), mats.plum, [0.18 + i * 0.045, 0.315, R.benchZ + 0.215]);

    // bookshelf unit, wall-mounted right of the bench; books + trinkets are props (prmBuildShelf)
    const S = { x: 1.55, w: 0.85, d: 0.22, ys: [1.12, 1.48, 1.84], side: 0.02 }; S.z = R.backZ + S.d / 2;
    add('shelfBack', new THREE.BoxGeometry(S.w, 0.9, 0.01), mats.birchDark, [S.x, 1.5, R.backZ + 0.005]);
    add('shelfSideL', new THREE.BoxGeometry(S.side, 0.9, S.d), mats.birch, [S.x - S.w / 2, 1.5, S.z], null, { cast: true });
    add('shelfSideR', new THREE.BoxGeometry(S.side, 0.9, S.d), mats.birch, [S.x + S.w / 2, 1.5, S.z], null, { cast: true });
    S.ys.forEach((y, i) => add('shelfBoard' + i, new THREE.BoxGeometry(S.w, 0.02, S.d), mats.birch, [S.x, y, S.z], null, { cast: true }));

    // side table (top surface = sideTableTopY) — carries the photo-carousel lamp
    add('sideTableTop', new THREE.CylinderGeometry(0.22, 0.22, 0.03, 32), mats.birch, [-1.7, R.sideTableTopY - 0.015, -2.1], null, { cast: true });
    [0, 1, 2].forEach(i => { const a = i * 2 * Math.PI / 3;
      add('sideTableLeg' + i, new THREE.CylinderGeometry(0.015, 0.018, 0.55, 12), mats.birchDark,
          [-1.7 + Math.sin(a) * 0.15, 0.27, -2.1 + Math.cos(a) * 0.15], [Math.cos(a) * 0.12, 0, -Math.sin(a) * 0.12]); });

    // couch arm, front plane, bottom-left, partly out of frame (top surface = armTopY)
    add('couchArm', moulded(0.4, 0.58, 0.95, 0.09), mats.fabric, [-1.4, R.armTopY - 0.29, 1.35], null, { cast: true });

    // window (the cool fill's visible source) + the wavy curtain in front of it
    add('window', new THREE.PlaneGeometry(0.7, 1.3), mats.window, [2.55, 1.7, R.backZ + 0.005]);
    add('curtain', prmCurtainGeometry(lib, 0.9, 2.2, 7), mats.curtain, [2.55, 1.15, R.backZ + 0.12], null, { cast: true });

    // floor lamp (the warm key's visible source)
    add('floorLampBase', new THREE.CylinderGeometry(0.13, 0.13, 0.02, 24), mats.chrome, [-2.3, 0.01, -1.5]);
    add('floorLampStem', new THREE.CylinderGeometry(0.012, 0.012, 1.35, 12), mats.chrome, [-2.3, 0.69, -1.5]);
    add('floorLampShade', new THREE.CylinderGeometry(0.13, 0.2, 0.3, 32, 1, true), mats.shade, [-2.3, 1.5, -1.5]);

    // two prints on the shelf wall
    const print = (id, x, y, seed) => {
      add('print' + id, new THREE.BoxGeometry(0.22, 0.28, 0.02), mats.birchDark, [x, y, R.backZ + 0.01]);
      add('print' + id + 'Face', new THREE.PlaneGeometry(0.18, 0.24), new THREE.MeshStandardMaterial({ map: tex.abstract(seed), roughness: .9 }), [x, y, R.backZ + 0.021]);
    };
    print('A', 1.35, 2.4, 1); print('B', 1.8, 2.3, 5);

    g.userData.prmRoom = R; g.userData.prmShelf = S;
    return g;
  }

  /* A sine-wave strip extruded to the curtain's height. Drawn in the shape's
     XY plane, extruded along z, then rotated so the extrusion stands up (y)
     and the wave runs along z. */
  function prmCurtainGeometry(lib, w, h, waves) {
    const { THREE } = lib; const amp = 0.04, thick = 0.012, N = 64;
    const s = new THREE.Shape();
    const wave = (t) => Math.sin(t * Math.PI * 2 * waves) * amp;
    s.moveTo(-w / 2, wave(0));
    for (let i = 1; i <= N; i++) { const t = i / N; s.lineTo(-w / 2 + t * w, wave(t)); }
    for (let i = N; i >= 0; i--) { const t = i / N; s.lineTo(-w / 2 + t * w, wave(t) + thick); }
    s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 1 });
    geo.center(); geo.rotateX(-Math.PI / 2);
    return geo;
  }

  const api = { prmBuildRoom, prmCurtainGeometry };
  if (typeof window !== 'undefined') window.PrmRoom = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
```

- [ ] **Step 4: Run the harness** — `node wip/premium/verify-prm-props.js` → `0 failed`.

- [ ] **Step 5: Commit**

```bash
git add wip/premium/prm-room.js wip/premium/verify-prm-props.js
git commit -m "feat(premium): prm-room — the procedural shell" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---
### Task 4: `prm-props.js` core + `prm-scene.js` + sandbox mount + first screenshot (spec §§ 3, 8, 9, 11, 13)

The scene is written **complete** here — picking, hover, keyboard, push-in, spin sequencing, jukebox sync, reduced motion, render-on-demand, dispose — driven entirely by data in `prm-props.js`. Tasks 5–9 then only add builders and their registry lines; the scene never changes again. This task's `prm-props.js` holds the data, the registry, the tween helper and the attract-screen drawer; no builder yet, so the room renders empty and Step 9's screenshot proves the diorama look before a single prop exists (spec § 16 step 1).

**Files:**
- Create: `wip/premium/prm-props.js` (core), `wip/premium/prm-scene.js`, `wip/premium/visual-prm.js`
- Modify: `wip/premium/index.html` (replace the last `<script>` block), `wip/premium/verify-prm-props.js` (append `props-core` and `scene-pure` sections)

**Interfaces:**
- Consumes: `PrmLib`, `PrmRoom`, `ControllerBody`, `window.GAMES`.
- Produces (props core): `PrmProps.PRM_ACTIONS`, `PRM_PLACES`, `PRM_TAB_ORDER`, `PRM_BUILDERS`, `prmBuildAll(ctx) → { id: Group }`, `prmMotion() → { add(from, to, ms, ease, onUpdate, onDone), tick(now) → bool, active(), clear() }`, `prmEaseOutCubic`, `prmEaseOutBack`, `prmAttract(makeCanvas, games) → { canvas, draw(tSec), attach(id, img), frames() }`, `PRM_ATTRACT_LINES`.
  `ctx` passed to every builder: `{ lib, design, games, stickers: { base, list }, lampPanels: { base, manifest }, ControllerBody, attractTexture, roomData: { prmRoom, prmShelf } }`; `shared = { earGeometry }` (the controller's ear geometry, built once).
- Produces (scene): `PrmScene.prmMount(canvasEl, host) → { setDesign(d), setPreset(name), resetView(), activate(prmId), focus(prmId), dispose() }`, `prmValidateHost(host)`, `prmEligible(w, h, webgl)`, `prmReducedMotion()`, `PRM_PRESETS`, `PRM_REQUIRED`.
- Host contract (spec § 9.3 as amended in Task 1): `{ games, stickers: { base, list }, design, lampPanels: { base, manifest }, music: { keys, nowPlaying(), playFor(key) }, enterTV(gameId|null), enterShelves(), openWorkshop(), openSound(), openSwitcher(), openStickerbook? , rand?, reducedMotion?, debug? }`.

- [ ] **Step 1: Append the failing harness sections**

```js
section('props-core');
const PrmProps = require(path.join(ROOT, 'wip/premium/prm-props.js'));
ok(PrmProps.PRM_ACTIONS && typeof PrmProps.PRM_ACTIONS === 'object', 'PRM_ACTIONS exists');
ok(Array.isArray(PrmProps.PRM_TAB_ORDER) && PrmProps.PRM_TAB_ORDER[0] === 'tv-screen', 'PRM_TAB_ORDER starts at the TV');
{
  const m = PrmProps.prmMotion(); const seen = [];
  m.add(0, 10, 100, PrmProps.prmEaseOutCubic, v => seen.push(v), () => seen.push('done'));
  ok(m.tick(1000) === true, 'motion active on first tick'); ok(m.tick(1050) === true, 'still active mid-way');
  ok(m.tick(1100) === false, 'finished at ms'); eq(seen[seen.length - 1], 'done', 'onDone fires once at the end');
  near(seen[seen.length - 2], 10, 1e-9, 'final value is the target');
  near(PrmProps.prmEaseOutCubic(0), 0, 1e-9, 'easeOutCubic(0)'); near(PrmProps.prmEaseOutCubic(1), 1, 1e-9, 'easeOutCubic(1)');
  near(PrmProps.prmEaseOutBack(1), 1, 1e-9, 'easeOutBack(1)'); ok(PrmProps.prmEaseOutBack(0.7) > 1, 'easeOutBack overshoots');
}
{
  const at = PrmProps.prmAttract(makeCanvas, GAMES);
  at.draw(0); at.draw(3.5); eq(at.frames(), 2, 'attract counts frames'); ok(at.canvas.width === 512, 'attract canvas is 512 wide');
}
{
  const ctx = { lib, design: { shell: '#111111', plate: '#222222', ears: '#333333', buttons: '#444444' }, games: GAMES,
    stickers: { base: 'data/stickers/', list: GAMES.map(g => ({ id: g.id, image: g.id + '.png', unlocked: true })) },
    lampPanels: { base: 'lamp images/', manifest: require(path.join(ROOT, 'wip/premium/lamp images/manifest.json')) },
    ControllerBody: CB, attractTexture: null, roomData: room.userData };
  const built = PrmProps.prmBuildAll(ctx);
  ok(built && typeof built === 'object', 'prmBuildAll returns an object (empty until builders register)');
  global.__prmCtx = ctx;   // later sections reuse it
}

section('scene-pure');
const PrmScene = require(path.join(ROOT, 'wip/premium/prm-scene.js'));
{
  const good = { games: GAMES, stickers: { base: '', list: [] }, design: {}, lampPanels: { base: '', manifest: { panels: [] } }, music: { keys: [], nowPlaying: () => null, playFor: () => {} },
    enterTV() {}, enterShelves() {}, openWorkshop() {}, openSound() {}, openSwitcher() {} };
  ok(PrmScene.prmValidateHost(good) === true, 'a complete host validates');
  ok(PrmScene.prmValidateHost(Object.assign({}, good, { openStickerbook() {} })) === true, 'openStickerbook is accepted when given');
  let threw = false; try { PrmScene.prmValidateHost(Object.assign({}, good, { enterTV: undefined })); } catch (e) { threw = /enterTV/.test(e.message); }
  ok(threw, 'a missing required callback throws naming it');
  threw = false; try { PrmScene.prmValidateHost(Object.assign({}, good, { openStickerbook: 'nope' })); } catch (e) { threw = true; }
  ok(threw, 'a non-function openStickerbook throws');
  ok(PrmScene.prmEligible(1280, 720, true), 'eligible at 1280x720 with WebGL');
  ok(!PrmScene.prmEligible(390, 844, true), 'a portrait phone is not eligible');
  ok(!PrmScene.prmEligible(1280, 720, false), 'no WebGL is not eligible');
  ok(PrmScene.PRM_PRESETS.wide && PrmScene.PRM_PRESETS.portrait, 'both camera presets exist');
}
```

- [ ] **Step 2: Run to see it fail** — `Cannot find module '…/prm-props.js'`.

- [ ] **Step 3: Write `prm-props.js` (core — builders are appended by Tasks 5–9)**

```js
// ═══════════════════════════════════════════════════════════════════════════
// prm-props.js — Premium lounge: the props. One pure builder per prop plus the
// DATA the scene runs on: what each pick id does (PRM_ACTIONS), where each prop
// sits (PRM_PLACES), the keyboard order (PRM_TAB_ORDER). Spec §§ 7, 8, 9.
//
// Pure: every builder takes lib (which carries THREE) and data, touches no DOM,
// loads no image — a material that wants one is tagged userData.prmImage = url
// and prm-scene.js loads it after mount. verify-prm-props.js drives all of it
// under Node.
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  /* What a tap on each pick id does. `callback` names a host callback; `local`
     names a prop api call. The scene interprets the flags — see prmMount. */
  const PRM_ACTIONS = {
    'tv-screen':      { callback: 'enterTV', arg: null, pushIn: 'tv-screen' },
    'tv-channel':     { callback: 'openSwitcher', turn: true },
    'tv-volume':      { callback: 'openSound', turn: true },
    'jukebox-knob':   { callback: 'openSound' },
    'jukebox-record': { callback: 'music.next' },
    'dial':           { callback: 'enterTV', spin: true, pushIn: 'tv-screen' },
    'phone':          { callback: 'enterShelves', fade: true },
    'controller':     { callback: 'openWorkshop' },
    'lamp':           { local: 'flick' },
    'binder':         { callback: 'openStickerbook', optional: true, fallback: 'openCover' },
  };
  /* Keyboard / remote order, spec § 9.2. */
  const PRM_TAB_ORDER = ['tv-screen', 'jukebox-record', 'dial', 'binder', 'phone', 'controller', 'lamp'];
  /* World placement per prop group. y values sit on the room's surfaces
     (prm-room.js prmRoom): bench top 0.52, table top 0.44, arm top 0.58,
     side table top 0.565. A builder's group origin is its resting base. */
  const PRM_PLACES = {
    tv:            { pos: [-0.20, 0.52, -2.50] },
    jukebox:       { pos: [ 0.85, 0.52, -2.50] },
    dial:          { pos: [ 0.35, 0.44,  0.30] },
    binder:        { pos: [-0.25, 0.44,  0.20], rot: [0, 0.18, 0] },
    phone:         { pos: [ 0.55, 0.44,  0.57], rot: [0, -0.5, 0] },
    controller:    { pos: [-1.30, 0.58,  1.30], rot: [0, -0.35, 0] },
    lamp:          { pos: [-1.70, 0.565, -2.10] },
    shelfContents: { pos: [0, 0, 0] },
  };
  /* Builders register here, one per task: id → (ctx, shared) => Group. */
  const PRM_BUILDERS = {};

  function prmBuildAll(ctx) {
    const shared = { earGeometry: ctx.ControllerBody ? ctx.ControllerBody.buildEars(ctx.lib.THREE, ctx.lib.mats.cream)[0].geometry : null };
    const out = {};
    Object.keys(PRM_BUILDERS).forEach(id => { const g = PRM_BUILDERS[id](ctx, shared); g.name = id; out[id] = g; });
    return out;
  }

  /* Tiny tween list. add() queues; tick(now) advances all and returns whether
     any is still running — the scene's render-on-demand loop reads that. */
  function prmMotion() {
    const tweens = [];
    return {
      add(from, to, ms, ease, onUpdate, onDone) { tweens.push({ from, to, ms, ease, onUpdate, onDone, t0: null }); },
      tick(now) {
        for (let i = tweens.length - 1; i >= 0; i--) {
          const tw = tweens[i]; if (tw.t0 === null) tw.t0 = now;
          const p = Math.min(1, (now - tw.t0) / tw.ms);
          tw.onUpdate(tw.from + (tw.to - tw.from) * tw.ease(p));
          if (p >= 1) { tweens.splice(i, 1); if (tw.onDone) tw.onDone(); }
        }
        return tweens.length > 0;
      },
      active: () => tweens.length > 0,
      clear() { tweens.length = 0; },
    };
  }
  const prmEaseOutCubic = p => 1 - Math.pow(1 - p, 3);
  const prmEaseOutBack = p => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };

  /* Helpers every builder uses. tag() marks a pick node. */
  function prmMesh(THREE, geo, mat, name, pos, rot, cast = true) {
    const m = new THREE.Mesh(geo, mat); m.name = name; m.position.set(pos[0], pos[1], pos[2]);
    if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
    m.castShadow = cast; m.receiveShadow = true; return m;
  }
  function prmTag(obj, id) { obj.userData.prmId = id; return obj; }

  /* The TV's attract screen, spec § 8. Pure drawing on an injected canvas; the
     scene turns it into a CanvasTexture and calls draw() at ~10 fps. */
  const PRM_ATTRACT_LINES = ['Tap the telly to browse the box.', 'Game night. No excuses.', 'Twenty games. One couch.', 'Pick a game, any game.'];
  function prmAttract(makeCanvas, games, lines = PRM_ATTRACT_LINES) {
    const W = 512, H = 384, c = makeCanvas(W, H), x = c.getContext('2d');
    const imgs = {}; let frame = 0;
    function draw(tSec) {
      x.fillStyle = '#e4f0e8'; x.fillRect(0, 0, W, H);
      const pitch = 150, speed = 50, span = games.length * pitch, off = (tSec * speed) % span;
      games.forEach((g, i) => {
        [W + i * pitch - off, W + i * pitch - off - span].forEach(px => {
          if (px < -pitch || px > W + pitch) return;
          const img = imgs[g.id];
          if (img) x.drawImage(img, px, 170, 110, 110);
          else { x.fillStyle = g.brandHex; x.beginPath(); x.arc(px + 55, 225, 45, 0, 7); x.fill(); }
        });
      });
      x.fillStyle = '#2B1B45'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = 'bold 44px Fredoka, sans-serif'; x.fillText("LITTLE SYLLY'S LOUNGE", W / 2, 90);
      x.font = '22px Fredoka, sans-serif'; x.fillText(lines[Math.floor(tSec / 6) % lines.length], W / 2, 330);
      x.fillStyle = 'rgba(0,0,0,0.06)'; for (let y = 0; y < H; y += 4) x.fillRect(0, y, W, 2);   // scanlines
      frame++;
    }
    return { canvas: c, draw, attach(id, img) { imgs[id] = img; }, frames: () => frame };
  }

  // ── builders are appended below by Tasks 5–9 ──────────────────────────────

  const api = { PRM_ACTIONS, PRM_TAB_ORDER, PRM_PLACES, PRM_BUILDERS, PRM_ATTRACT_LINES, prmBuildAll, prmMotion, prmEaseOutCubic, prmEaseOutBack, prmMesh, prmTag, prmAttract };
  if (typeof window !== 'undefined') window.PrmProps = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
```

- [ ] **Step 4: Write `prm-scene.js`**

```js
// ═══════════════════════════════════════════════════════════════════════════
// prm-scene.js — Premium lounge: renderer, lights, env map, camera rig,
// picking, the motion contract and the host contract. Spec §§ 3, 9, 11, 13.
//
// The scene never calls showScreen, never reads localStorage, never touches
// Music directly: everything that leaves the room goes through the host
// callbacks validated in prmValidateHost. Only prmMount touches the DOM; the
// pure functions above it are what verify-prm-props.js loads under Node.
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  const PRM_PRESETS = {
    wide:     { pos: [0.25, 1.15, 2.70], look: [0.05, 0.62, -1.20], fov: 35 },
    portrait: { pos: [0.00, 1.55, 1.75], look: [0.00, 0.45,  0.25], fov: 52 },
  };
  const PRM_REQUIRED = ['games', 'stickers', 'design', 'lampPanels', 'music', 'enterTV', 'enterShelves', 'openWorkshop', 'openSound', 'openSwitcher'];
  const PRM_FUNCS = ['enterTV', 'enterShelves', 'openWorkshop', 'openSound', 'openSwitcher'];
  const PRM_HOVER_LIFT = 0.003, PRM_PUSH_MS = 600, PRM_FADE_AT_MS = 400, PRM_ATTRACT_MS = 100, PRM_PARALLAX = 0.035;

  function prmValidateHost(host) {
    if (!host || typeof host !== 'object') throw new Error('prmMount: host object required');
    const missing = PRM_REQUIRED.filter(k => host[k] === undefined);
    if (missing.length) throw new Error('prmMount: host is missing ' + missing.join(', '));
    PRM_FUNCS.forEach(k => { if (typeof host[k] !== 'function') throw new Error('prmMount: host.' + k + ' must be a function'); });
    if (host.openStickerbook !== undefined && typeof host.openStickerbook !== 'function') throw new Error('prmMount: host.openStickerbook must be a function when given');
    if (!Array.isArray(host.games) || host.games.length === 0) throw new Error('prmMount: host.games must be a non-empty array');
    return true;
  }
  function prmReducedMotion() {
    return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  /* TV mode's floor, reused (wip/lobby-lab/lobby.js LB_TV_MIN_W/H). No device sniffing. */
  function prmEligible(w, h, webgl) { return w >= 900 && h >= 500 && !!webgl; }

  /* A procedural environment: four emissive planes through PMREM. Zero assets;
     it is what makes matte plastic read as plastic (spec § 3.2). */
  function prmBuildEnvMap(THREE, renderer) {
    const env = new THREE.Scene(); env.background = new THREE.Color('#e9e2d8');
    const plane = (w, h, pos, rot, hex) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: hex, side: THREE.DoubleSide })); m.position.set(pos[0], pos[1], pos[2]); m.rotation.set(rot[0], rot[1], rot[2]); env.add(m); };
    plane(6, 3, [-3, 3, 0], [0, Math.PI / 2, 0], '#ffe4c2');    // warm, above-left (the lamp side)
    plane(4, 4, [3, 2, 0], [0, -Math.PI / 2, 0], '#cfe0ef');    // cool, right (the window side)
    plane(8, 8, [0, -2, 0], [Math.PI / 2, 0, 0], '#5b514a');    // dark floor
    plane(8, 8, [0, 5, 0], [-Math.PI / 2, 0, 0], '#fff6ea');    // pale ceiling
    const pmrem = new THREE.PMREMGenerator(renderer); const rt = pmrem.fromScene(env, 0.04); pmrem.dispose();
    return rt.texture;
  }

  function prmMount(canvasEl, host) {
    prmValidateHost(host);
    const THREE = window.THREE, CB = window.ControllerBody, P = window.PrmProps;
    const reduced = () => (host.reducedMotion !== undefined ? !!host.reducedMotion : prmReducedMotion());
    const makeCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    const lib = window.PrmLib.prmCreateLib(THREE, { makeCanvas, smoothNormals: CB.smoothNormals });
    let design = Object.assign({}, host.design);
    const timers = { raf: null, interval: null, timeouts: new Set() };
    const later = (fn, ms) => { const id = setTimeout(() => { timers.timeouts.delete(id); fn(); }, ms); timers.timeouts.add(id); return id; };

    // renderer + scene
    const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#efe6dc'); scene.fog = new THREE.Fog('#efe6dc', 4.5, 9);
    scene.environment = prmBuildEnvMap(THREE, renderer);
    const camera = new THREE.PerspectiveCamera(35, 16 / 9, 0.05, 30);
    const lookAt = new THREE.Vector3();

    // lights — spec § 3.2: the three visible sources each have a real light behind them
    const key = new THREE.SpotLight('#ffd9b0', 2.2, 12, 0.75, 0.5, 1);
    key.position.set(-2.3, 1.55, -1.5); key.target.position.set(0.1, 0.45, 0.3);
    key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004; key.shadow.radius = 3;
    scene.add(key, key.target);
    scene.add(new THREE.HemisphereLight('#cfe0ef', '#e2c9ae', 0.55));
    const tvLight = new THREE.PointLight('#bfe6d0', 0.6, 2.5, 2); tvLight.position.set(-0.25, 0.9, -2.0); scene.add(tvLight);
    const bulb = new THREE.PointLight('#ffd7a0', 0.5, 1.5, 2); bulb.position.set(-1.7, 0.75, -2.1); scene.add(bulb);
    const dialLight = new THREE.PointLight(design.buttons || '#ffffff', 0.25, 0.6, 2); dialLight.position.set(0.35, 0.5, 0.3); scene.add(dialLight);

    // room + props
    const room = window.PrmRoom.prmBuildRoom(lib); scene.add(room);
    const attract = P.prmAttract(makeCanvas, host.games);
    const attractTex = new THREE.CanvasTexture(attract.canvas); attractTex.encoding = THREE.sRGBEncoding;
    const ctx = { lib, design, games: host.games, stickers: host.stickers, lampPanels: host.lampPanels, ControllerBody: CB, attractTexture: attractTex, roomData: room.userData };
    const props = new THREE.Group(); props.name = 'props'; scene.add(props);
    const built = P.prmBuildAll(ctx);
    Object.keys(built).forEach(id => {
      const g = built[id], pl = P.PRM_PLACES[id];
      if (pl) { g.position.set(pl.pos[0], pl.pos[1], pl.pos[2]); if (pl.rot) g.rotation.set(pl.rot[0], pl.rot[1], pl.rot[2]); }
      props.add(g);
    });
    scene.updateMatrixWorld(true);

    // pick nodes: any object carrying prmId; every mesh under it points back at it
    const nodes = {}, pickables = [];
    props.traverse(o => { if (o.userData.prmId) { nodes[o.userData.prmId] = o; o.userData.restY = o.position.y; } });
    props.traverse(o => {
      if (!o.isMesh) return; let p = o;
      while (p && !p.userData.prmId) p = p.parent;
      if (p && p.userData.prmId) { o.userData.prmPickNode = p; pickables.push(o); }
    });
    let shadowDirty = true;

    // images: stickers, lamp portraits — loaded here, never by a builder
    const loader = new THREE.TextureLoader();
    props.traverse(o => {
      if (!o.isMesh || !o.material || !o.material.userData.prmImage) return;
      const m = o.material;
      loader.load(m.userData.prmImage, t => { t.encoding = THREE.sRGBEncoding; m.map = t; if (m.userData.prmEmissiveMap) m.emissiveMap = t; m.needsUpdate = true; shadowDirty = true; wake(); });
    });
    (host.stickers.list || []).forEach(s => { const img = new Image(); img.onload = () => attract.attach(s.id, img); img.src = host.stickers.base + s.image; });

    // motion
    const camTweens = P.prmMotion(), hoverTweens = P.prmMotion();
    let hovered = null, focused = -1, busy = false, parallaxT = { x: 0, y: 0 }, parallax = { x: 0, y: 0 };
    const hud = { focus: document.getElementById('prm-focus'), fade: document.getElementById('prm-fade') };
    function setHover(node) {
      if (hovered === node) return;
      if (hovered) { const h = hovered; hoverTweens.add(h.position.y, h.userData.restY, 150, P.prmEaseOutCubic, v => h.position.y = v); }
      hovered = node;
      if (node && !reduced()) hoverTweens.add(node.position.y, node.userData.restY + PRM_HOVER_LIFT, 150, P.prmEaseOutCubic, v => node.position.y = v);
      canvasEl.style.cursor = node ? 'pointer' : ''; shadowDirty = true; wake();
    }
    function applyPreset(name) {
      const pr = PRM_PRESETS[name] || PRM_PRESETS.wide;
      camera.position.set(pr.pos[0], pr.pos[1], pr.pos[2]); lookAt.set(pr.look[0], pr.look[1], pr.look[2]);
      camera.fov = pr.fov; camera.updateProjectionMatrix(); camera.lookAt(lookAt); wake();
    }
    let preset = 'wide'; applyPreset(preset);
    function pushIn(target, done) {
      const p = new THREE.Vector3(); target.getWorldPosition(p);
      later(() => hud.fade && hud.fade.classList.add('on'), reduced() ? 0 : PRM_FADE_AT_MS);
      if (reduced()) { later(done, 220); return; }
      const from = camera.position.clone(), look0 = lookAt.clone(), to = p.clone().add(new THREE.Vector3(0, 0, 0.45));
      camTweens.add(0, 1, PRM_PUSH_MS, P.prmEaseOutCubic, t => { camera.position.lerpVectors(from, to, t); lookAt.lerpVectors(look0, p, t); camera.lookAt(lookAt); }, done);
      wake();
    }
    function fadeOut(done) { if (hud.fade) hud.fade.classList.add('on'); later(done, 220); }
    function resetView() { if (hud.fade) hud.fade.classList.remove('on'); busy = false; camTweens.clear(); applyPreset(preset); }
    function tweenTurn(node) { const from = node.userData.turn || 0, to = from + Math.PI / 6; node.userData.turn = to; hoverTweens.add(from, to, 120, P.prmEaseOutCubic, v => node.rotation.y = v); wake(); }
    function syncJukebox() {
      const jb = built.jukebox && built.jukebox.userData.api; if (!jb) return;
      const np = host.music.nowPlaying(); jb.setPlaying(!!np);
      let label = 'Quiet';
      if (np) { const g = host.games.find(x => x.id === np.key); label = np.title || (g ? g.gameName : np.key); }
      jb.setLabel(label); wake();
    }
    syncJukebox();

    // actions — the interpreter for PRM_ACTIONS
    function activate(id) {
      const a = P.PRM_ACTIONS[id], node = nodes[id]; if (!a || !node || busy) return;
      if (a.local === 'flick') { built.lamp.userData.api.flick(4.0); wake(); return; }
      if (a.turn) tweenTurn(node);
      if (a.spin) {
        busy = true; const api = built.dial.userData.api;
        api.spin(host.rand || Math.random, { instant: reduced() }).then(gameId => {
          later(() => pushIn(nodes['tv-screen'], () => { busy = false; host.enterTV(gameId); }), reduced() ? 600 : 250);
        }); wake(); return;
      }
      if (a.callback === 'openStickerbook') {
        if (typeof host.openStickerbook === 'function') host.openStickerbook();
        else built.binder.userData.api[a.fallback](reduced());
        wake(); return;
      }
      if (a.callback === 'music.next') {
        const keys = host.music.keys || []; if (!keys.length) return;
        const np = host.music.nowPlaying(); const i = keys.indexOf(np && np.key);
        host.music.playFor(keys[(i + 1) % keys.length]); syncJukebox(); return;
      }
      if (a.pushIn) { busy = true; pushIn(nodes[a.pushIn], () => { busy = false; host[a.callback](a.arg === undefined ? null : a.arg); }); return; }
      if (a.fade) { busy = true; fadeOut(() => { busy = false; host[a.callback](); }); return; }
      host[a.callback]();
    }

    // pointer: hover, tap, the lamp's drag-to-flick, parallax
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    let down = null, dragLamp = null;
    function pick(ev) {
      const r = canvasEl.getBoundingClientRect();
      ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera); const hits = ray.intersectObjects(pickables, false);
      return hits.length ? hits[0].object.userData.prmPickNode : null;
    }
    const onMove = ev => {
      const r = canvasEl.getBoundingClientRect();
      parallaxT.x = ((ev.clientX - r.left) / r.width - 0.5) * 2; parallaxT.y = ((ev.clientY - r.top) / r.height - 0.5) * 2;
      if (dragLamp) { dragLamp.vel = (ev.clientX - dragLamp.x) * 0.02; dragLamp.x = ev.clientX; built.lamp.userData.api.nudge(dragLamp.vel); wake(); return; }
      setHover(busy ? null : pick(ev)); wake();
    };
    const onDown = ev => { const n = pick(ev); down = { x: ev.clientX, y: ev.clientY, t: performance.now(), node: n }; if (n && n.userData.prmId === 'lamp') dragLamp = { x: ev.clientX, vel: 0 }; };
    const onUp = ev => {
      if (dragLamp) { built.lamp.userData.api.flick(dragLamp.vel * 12); dragLamp = null; wake(); }
      if (!down) return; const d = Math.hypot(ev.clientX - down.x, ev.clientY - down.y), dt = performance.now() - down.t;
      if (down.node && d < 6 && dt < 400) activate(down.node.userData.prmId);
      down = null;
    };
    const onLeave = () => { parallaxT.x = 0; parallaxT.y = 0; setHover(null); wake(); };
    canvasEl.addEventListener('pointermove', onMove); canvasEl.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp); canvasEl.addEventListener('pointerleave', onLeave);

    // keyboard / remote — one tab stop, arrows move, Enter/Space activate, spec § 9.2
    const order = () => P.PRM_TAB_ORDER.filter(id => nodes[id]);
    function drawFocus() {
      const el = hud.focus; if (!el) return;
      const ids = order(); if (focused < 0 || !ids[focused]) { el.style.display = 'none'; return; }
      const node = nodes[ids[focused]]; const box = new THREE.Box3().setFromObject(node);
      const r = canvasEl.getBoundingClientRect(); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (let i = 0; i < 8; i++) {
        const v = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(camera);
        const sx = (v.x + 1) / 2 * r.width, sy = (1 - v.y) / 2 * r.height;
        x0 = Math.min(x0, sx); y0 = Math.min(y0, sy); x1 = Math.max(x1, sx); y1 = Math.max(y1, sy);
      }
      el.style.display = 'block'; el.style.left = (x0 - 6) + 'px'; el.style.top = (y0 - 6) + 'px'; el.style.width = (x1 - x0 + 12) + 'px'; el.style.height = (y1 - y0 + 12) + 'px';
    }
    function focus(id) { const ids = order(); focused = ids.indexOf(id); drawFocus(); }
    const onKey = ev => {
      const ids = order(); if (!ids.length) return;
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') { focused = (focused + 1) % ids.length; drawFocus(); ev.preventDefault(); }
      else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') { focused = (focused - 1 + ids.length) % ids.length; drawFocus(); ev.preventDefault(); }
      else if ((ev.key === 'Enter' || ev.key === ' ') && focused >= 0) { activate(ids[focused]); ev.preventDefault(); }
      else if (ev.key === 'Escape') { focused = -1; drawFocus(); }
    };
    canvasEl.addEventListener('keydown', onKey);
    canvasEl.addEventListener('blur', () => { focused = -1; drawFocus(); });

    // the attract loop, 10 fps, only while visible; one frozen frame under reduced motion
    const t0 = performance.now(); let attractDrawn = false;
    timers.interval = setInterval(() => {
      if (document.hidden) return;
      if (reduced()) { if (attractDrawn) return; attractDrawn = true; attract.draw(0); }
      else attract.draw((performance.now() - t0) / 1000);
      attractTex.needsUpdate = true; wake();
    }, PRM_ATTRACT_MS);

    // render on demand: run while something animates, then stop
    let last = 0, frames = 0;
    function wake() { if (timers.raf === null) timers.raf = requestAnimationFrame(frame); }
    function frame(now) {
      timers.raf = null;
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0; last = now;
      let active = camTweens.tick(now); active = hoverTweens.tick(now) || active;
      Object.keys(built).forEach(id => { const api = built[id].userData.api; if (api && api.tick && api.tick(now, dt, reduced())) active = true; });
      if (!reduced()) {
        const tx = parallaxT.x * PRM_PARALLAX, ty = parallaxT.y * PRM_PARALLAX * 0.6;
        if (Math.abs(tx - parallax.x) > 1e-4 || Math.abs(ty - parallax.y) > 1e-4) {
          parallax.x += (tx - parallax.x) * 0.08; parallax.y += (ty - parallax.y) * 0.08; active = true;
          if (!camTweens.active()) { const pr = PRM_PRESETS[preset]; camera.position.set(pr.pos[0] + parallax.x, pr.pos[1] - parallax.y, pr.pos[2]); camera.lookAt(lookAt); }
        }
      }
      if (shadowDirty) { renderer.shadowMap.needsUpdate = true; shadowDirty = false; }
      renderer.render(scene, camera); frames++;
      if (focused >= 0) drawFocus();
      if (active) timers.raf = requestAnimationFrame(frame); else last = 0;
    }
    function resize() {
      const w = canvasEl.clientWidth || 1280, h = canvasEl.clientHeight || 720;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); shadowDirty = true; wake();
    }
    window.addEventListener('resize', resize); resize();

    const api = {
      setDesign(d) { design = Object.assign(design, d); window.PrmLib.prmApplyDesign(props, design); if (design.buttons) dialLight.color.set(design.buttons); shadowDirty = true; wake(); },
      setPreset(name) { preset = PRM_PRESETS[name] ? name : 'wide'; resetView(); },
      resetView, activate, focus, built, nodes,
      dispose() {
        if (timers.raf !== null) cancelAnimationFrame(timers.raf); timers.raf = null;
        clearInterval(timers.interval); timers.timeouts.forEach(clearTimeout); timers.timeouts.clear();
        canvasEl.removeEventListener('pointermove', onMove); canvasEl.removeEventListener('pointerdown', onDown);
        window.removeEventListener('pointerup', onUp); canvasEl.removeEventListener('pointerleave', onLeave);
        canvasEl.removeEventListener('keydown', onKey); window.removeEventListener('resize', resize);
        scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); });
        renderer.dispose();
      },
    };
    if (host.debug) window.prmDebug = { cameraMatrix: () => camera.matrixWorld.elements.slice(), frames: () => frames, isRunning: () => timers.raf !== null, nodes: () => Object.keys(nodes), api };
    wake();
    return api;
  }

  const api = { prmMount, prmValidateHost, prmEligible, prmReducedMotion, prmBuildEnvMap, PRM_PRESETS, PRM_REQUIRED };
  if (typeof window !== 'undefined') window.PrmScene = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
```

- [ ] **Step 5: Run the harness** — `node wip/premium/verify-prm-props.js` → `props-core` and `scene-pure` sections pass, `0 failed`.

- [ ] **Step 6: Replace the last `<script>` block in `index.html` with the mount wiring**

```html
<script>
(async function () {
  const $ = id => document.getElementById(id);
  const status = (t) => { $('prm-status').textContent = t; };
  const webgl = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (_) { return false; } })();
  function gate() {
    const ok = PrmScene.prmEligible(window.innerWidth, window.innerHeight, webgl);
    $('prm-card').classList.toggle('on', !ok); return ok;
  }
  window.addEventListener('resize', gate);
  if (!gate()) { window.prmReady = true; return; }

  const [stickerManifest, lampManifest] = await Promise.all([
    fetch('../../data/stickers/manifest.json').then(r => r.json()),
    fetch('lamp images/manifest.json').then(r => r.json()),
  ]);
  const DESIGN_DEFAULT = { shell: '#a97fd6', plate: '#9670c8', ears: '#a97fd6', buttons: '#8f66c4' };
  let saved = null; try { saved = JSON.parse(localStorage.getItem('sylly_controller') || 'null'); } catch (_) {}
  const design = Object.assign({}, DESIGN_DEFAULT, saved && saved.shell ? { shell: saved.shell, plate: saved.plate, ears: saved.ears, buttons: saved.buttons } : {});

  // The sandbox host: every door writes to the status line and offers the way back.
  const music = { keys: window.GAMES.map(g => g.id), current: null,
    nowPlaying() { if (!this.current) return null; const g = window.GAMES.find(x => x.id === this.current); return { key: this.current, title: null, artist: null, game: g && g.gameName }; },
    playFor(k) { this.current = k; } };
  const params = new URLSearchParams(location.search);
  const host = {
    games: window.GAMES,
    stickers: { base: '../../data/stickers/', list: stickerManifest.stickers },
    design, lampPanels: { base: 'lamp images/', manifest: lampManifest }, music,
    enterTV(gameId) { status(gameId ? 'TV mode would open on ' + gameId + '. Reset view to come back.' : 'TV mode would open. Reset view to come back.'); },
    enterShelves() { status('Shelves would open. Reset view to come back.'); },
    openWorkshop() { status('The Workshop would open (ctlOpenWorkshop).'); },
    openSound() { status('The sound overlay would open.'); },
    openSwitcher() { status('The layout switcher would open.'); },
    debug: true,
    reducedMotion: params.has('reduced') ? true : undefined,
  };
  if (params.has('seed')) { let s = +params.get('seed') || 1; host.rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const api = PrmScene.prmMount($('prm-canvas'), host);
  window.prmApi = api;
  $('prm-reset').addEventListener('click', () => { api.resetView(); status(''); });
  $('prm-portrait').addEventListener('click', () => { api.setPreset('portrait'); status('Portrait preset (Scene B framing, spec § 12).'); });
  document.querySelectorAll('.prm-swatch').forEach(b => b.addEventListener('click', () => api.setDesign(JSON.parse(b.dataset.design))));
  window.prmReady = true;
})();
</script>
```

- [ ] **Step 7: Write `visual-prm.js` (screenshots + the two motion-contract checks)**

Playwright lives outside the repo per the `visual-check` skill (`$HOME/.claude-tooling/playwright`); install once if absent (`npm install playwright && npx playwright install chromium` there). The driver serves the repo root itself, like `tools/visual-controller-stickers.js`.

```js
// visual-prm.js — real headless Chromium over wip/premium/index.html: the two
// composition screenshots the owner reviews, plus the two contract checks no
// Node harness can make — under prefers-reduced-motion the camera never moves
// and the RAF goes idle. Run from the repo root:
//   NODE_PATH="$HOME/.claude-tooling/playwright/node_modules" node wip/premium/visual-prm.js
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.resolve(__dirname, '..', '..');
const SHOTS = path.join(__dirname, 'shots');
const GL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok   ' + m); } else { fail++; console.log('  FAIL ' + m); } };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };

function serve() {
  return new Promise(resolve => {
    const s = http.createServer((req, res) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      fs.readFile(p, (err, data) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(data); });
    });
    s.listen(0, '127.0.0.1', () => resolve({ server: s, port: s.address().port }));
  });
}
function loadPlaywright() {
  for (const c of [path.join(os.homedir(), '.claude-tooling', 'playwright', 'node_modules', 'playwright'), 'playwright']) { try { return require(c); } catch (_) {} }
  throw new Error('Playwright not found — see .claude/skills/visual-check/SKILL.md § 2');
}
(async () => {
  const pw = loadPlaywright(); const { server, port } = await serve();
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await pw.chromium.launch({ args: GL_ARGS });
  const url = `http://127.0.0.1:${port}/wip/premium/index.html?seed=7`;
  const settle = async (page) => { await page.waitForFunction(() => window.prmReady === true, null, { timeout: 20000 }); await page.waitForTimeout(1500); };

  for (const [w, h] of [[1280, 720], [1920, 1080]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto(url); await settle(page);
    await page.screenshot({ path: path.join(SHOTS, `wide-${w}.png`) });
    ok(true, `screenshot wide-${w}.png`);
    if (w === 1280) {
      const f0 = await page.evaluate(() => window.prmDebug.frames()); await page.waitForTimeout(600);
      const f1 = await page.evaluate(() => window.prmDebug.frames());
      ok(f1 > f0, 'normal motion: the loop keeps rendering while idle rotations run (or nothing animates yet, in which case this is expected to FAIL until Task 7)');
      await page.evaluate(() => window.prmApi.setPreset('portrait')); await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(SHOTS, `portrait-preset-${w}.png`) });
    }
    await page.close();
  }
  // reduced motion: camera frozen, RAF idle
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage(); await page.goto(url); await settle(page);
  await page.mouse.move(400, 300); await page.waitForTimeout(300);
  const m0 = await page.evaluate(() => window.prmDebug.cameraMatrix()); const f0 = await page.evaluate(() => window.prmDebug.frames());
  await page.mouse.move(900, 500); await page.waitForTimeout(2000);
  const m1 = await page.evaluate(() => window.prmDebug.cameraMatrix()); const f1 = await page.evaluate(() => window.prmDebug.frames());
  ok(JSON.stringify(m0) === JSON.stringify(m1), 'reduced motion: the camera matrix never changes (no parallax, no drift)');
  ok(f1 - f0 <= 2, `reduced motion: the RAF is idle (frames advanced ${f1 - f0}, allow ≤2 for the pointer-move repaint)`);
  const running = await page.evaluate(() => window.prmDebug.isRunning());
  ok(!running, 'reduced motion: no RAF scheduled once settled');
  await page.screenshot({ path: path.join(SHOTS, 'reduced-1280.png') });
  // the honest card below the floor
  const small = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await small.goto(url); await small.waitForFunction(() => window.prmReady === true);
  ok(await small.evaluate(() => document.getElementById('prm-card').classList.contains('on')), 'portrait phone shows the honest card');
  await browser.close(); server.close();
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 8: Run the driver**

Run: `NODE_PATH="$HOME/.claude-tooling/playwright/node_modules" node wip/premium/visual-prm.js`
Expected: four screenshots in `wip/premium/shots/`; the reduced-motion and honest-card checks pass. The "keeps rendering while idle" check is **expected to fail in this task** (nothing animates yet) and passes from Task 7 — note it in the commit message, don't suppress it.

- [ ] **Step 9: Look at `shots/wide-1280.png` and tune the shell before committing**

Judge against spec § 3.3 (a well-lit toy diorama) and § 12 of the brief. Adjust in this order, re-running the driver after each: (1) key light position/intensity until the rug shows soft contact shadows under the table legs; (2) `PRM_PRESETS.wide` until the bench + table fill the lower two thirds and the couch arm enters bottom-left; (3) fog near/far until the back wall reads softer than the table without going grey; (4) exposure. Do not touch geometry numbers in this step unless something intersects.

- [ ] **Step 10: Commit**

```bash
git add wip/premium/prm-props.js wip/premium/prm-scene.js wip/premium/visual-prm.js wip/premium/index.html wip/premium/verify-prm-props.js wip/premium/shots/
git commit -m "feat(premium): scene, host contract, motion contract, sandbox mount, first screenshots" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---
### Task 5: The controller on the couch arm (spec § 7.5)

**Files:**
- Modify: `wip/premium/prm-props.js` (append `prmBuildController` + its registry line above the `api` block)
- Modify: `wip/premium/verify-prm-props.js` (append `controller` section)

**Interfaces:**
- Consumes: `ControllerBody.buildBody/buildEars/buildControls`, `lib.role`.
- Produces: `PRM_BUILDERS.controller`; the group carries `prmId = 'controller'`; materials tagged `shell`, `ears`, `buttons` (no `plate` in the sandbox — see spec § 7.5 as amended).

- [ ] **Step 1: Append the failing harness section**

```js
section('controller');
{
  const built = PrmProps.prmBuildAll(global.__prmCtx);
  ok(built.controller, 'controller builds');
  eq(built.controller.userData.prmId, 'controller', 'controller group is the pick node');
  const roles = new Set(); built.controller.traverse(o => { if (o.isMesh && o.material.userData.prmRole) roles.add(o.material.userData.prmRole); });
  ['shell', 'ears', 'buttons'].forEach(r => ok(roles.has(r), `controller carries a ${r} material`));
  const shellM = built.controller.getObjectByName('body').material;
  eq(shellM.color.getHexString(), '111111', 'shell takes design.shell');
  built.controller.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(built.controller); const s = new THREE.Vector3(); bb.getSize(s);
  ok(s.x > 0.12 && s.x < 0.22, `controller is hand-sized in metres (x ${s.x.toFixed(3)})`);
  near(bb.min.y, 0, 0.02, 'controller rests on its group origin (base at y≈0)');
}
```

- [ ] **Step 2: Run to see it fail** — `controller builds` fails (no builder registered).

- [ ] **Step 3: Append the builder to `prm-props.js`** (insert above `const api = {`)

```js
  /* The player's controller: the shipped geometry, mounted with the design's
     flat colours. Stickers and the plate outline come with the production
     round (the atlas painter lives in js/controller.js). Never monochrome. */
  function prmBuildController(lib, design, CB) {
    const { THREE } = lib; const g = new THREE.Group(); prmTag(g, 'controller');
    const geo = CB.buildBody(THREE, {});
    const body = new THREE.Mesh(geo, lib.role('shell', design.shell)); body.name = 'body'; body.castShadow = body.receiveShadow = true;
    const inner = new THREE.Group(); inner.name = 'rig'; inner.add(body);
    CB.buildEars(THREE, lib.role('ears', design.ears)).forEach(m => inner.add(m));
    const controls = CB.buildControls(THREE, geo); inner.add(controls.group);
    controls.group.traverse(o => {
      if (!o.isMesh || !o.material) return; o.castShadow = true;
      const pd = o.parent && o.parent.name === 'D-pad';
      if (o.name === 'L button' || o.name === 'R button' || o.name === 'D-pad' || pd || / stick$/.test(o.name) || / well$/.test(o.name)) {
        o.material = o.material.clone(); o.material.userData.prmRole = 'buttons'; o.material.color.set(design.buttons);
      }
    });
    /* Body units are ~4.6 wide; 0.036 makes it ~16.5 cm. Face up, leaning toward the camera. */
    inner.scale.setScalar(0.036); inner.rotation.x = -Math.PI / 2 + 0.28;
    inner.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(inner); inner.position.y = -bb.min.y;   // rest the lowest point on the group origin
    g.add(inner);
    g.userData.api = { tick() { return false; } };
    return g;
  }
  PRM_BUILDERS.controller = (ctx) => prmBuildController(ctx.lib, ctx.design, ctx.ControllerBody);
```

- [ ] **Step 4: Run the harness** → `0 failed`. **Step 5:** run the visual driver, check `shots/wide-1280.png`: the controller sits on the arm bottom-left, partly cropped, in the design's lilac. If it floats or sinks, the fix is `PRM_PLACES.controller.pos[1]` (must equal the room's `armTopY`), not the builder.

- [ ] **Step 6: Commit** — `git add wip/premium/prm-props.js wip/premium/verify-prm-props.js wip/premium/shots/ && git commit -m "feat(premium): the controller on the couch arm" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"`

---

### Task 6: The TV — CRT with ears, attract screen, two dials (spec §§ 7.1, 8)

**Files:**
- Modify: `wip/premium/prm-props.js` (append `prmBuildTV` + registry line)
- Modify: `wip/premium/verify-prm-props.js` (append `tv` section)

**Interfaces:**
- Consumes: `shared.earGeometry` (from `prmBuildAll`), `ctx.attractTexture`.
- Produces: `PRM_BUILDERS.tv`; pick nodes `tv-screen` (the screen mesh), `tv-channel`, `tv-volume` (the dial meshes); `api.screen`; roles `shell` (body, feet), `plate` (bezel), `ears`, `buttons` (dials).

- [ ] **Step 1: Append the failing harness section**

```js
section('tv');
{
  const built = PrmProps.prmBuildAll(global.__prmCtx); const tv = built.tv; ok(tv, 'tv builds');
  const ids = {}; tv.traverse(o => { if (o.userData.prmId) ids[o.userData.prmId] = o; });
  ['tv-screen', 'tv-channel', 'tv-volume'].forEach(id => ok(ids[id], `tv has pick node ${id}`));
  ok(ids['tv-screen'].isMesh && ids['tv-screen'].geometry.type === 'SphereGeometry', 'the screen is a sphere section (curved glass)');
  ok(tv.getObjectByName('earL') && tv.getObjectByName('earR'), 'tv has two ears');
  const roles = {}; tv.traverse(o => { if (o.isMesh && o.material.userData.prmRole) roles[o.material.userData.prmRole] = (roles[o.material.userData.prmRole] || 0) + 1; });
  ['shell', 'plate', 'ears', 'buttons'].forEach(r => ok(roles[r] > 0, `tv carries ${r}`));
  eq(tv.getObjectByName('earL').material.color.getHexString(), '333333', 'ears take design.ears');
  tv.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(tv);
  near(bb.min.y, 0, 0.005, 'tv rests on its origin'); ok(bb.max.y > 0.6 && bb.max.y < 0.9, `tv with ears is ${bb.max.y.toFixed(2)} tall`);
  ok(bb.max.x - bb.min.x < 0.75, 'tv fits its bench slot');
  // the screen faces +z: its centre is in front of the body's front face
  const sc = new THREE.Vector3(); ids['tv-screen'].getWorldPosition(sc);
  const body = new THREE.Box3().setFromObject(tv.getObjectByName('body'));
  ok(sc.z < body.max.z, 'screen sphere centre sits behind the front face (the slice bulges forward)');
}
```

- [ ] **Step 2: Run to see it fail.**

- [ ] **Step 3: Append the builder**

```js
  /* The telly: a CRT silhouette in the controller's material language. Body =
     shell, bezel = plate, dials = buttons, ears = the controller's own ear
     geometry scaled up and stood upright. The screen is a sphere section. */
  function prmBuildTV(lib, design, opts = {}) {
    const { THREE, mats } = lib; const W = 0.62, H = 0.48, D = 0.40, FEET = 0.03;
    const g = new THREE.Group();
    const shell = lib.role('shell', design.shell), plate = lib.role('plate', design.plate);
    const ears = lib.role('ears', design.ears), buttons = lib.role('buttons', design.buttons, { roughness: .34 });
    const cy = FEET + H / 2;   // body centre, so the feet rest on the group origin
    g.add(prmMesh(THREE, lib.moulded(W, H, D, 0.06), shell, 'body', [0, cy, 0]));
    g.add(prmMesh(THREE, lib.moulded(W - 0.04, H - 0.04, 0.03, 0.05), plate, 'bezel', [0, cy, D / 2 + 0.005]));
    // screen: sphere section facing +z, bulging ~2 cm proud of the bezel
    const R = 1.2, sw = 0.40, sh = 0.30, phiL = sw / R, thL = sh / R;
    const screenGeo = new THREE.SphereGeometry(R, 40, 30, Math.PI / 2 - phiL / 2, phiL, Math.PI / 2 - thL / 2, thL);
    const screenMat = new THREE.MeshStandardMaterial({ color: '#dfeee4', emissive: '#ffffff', emissiveIntensity: 0.9, roughness: .25, metalness: 0 });
    if (opts.attractTexture) { screenMat.map = opts.attractTexture; screenMat.emissiveMap = opts.attractTexture; }
    const screen = prmMesh(THREE, screenGeo, screenMat, 'screen', [-0.05, cy, D / 2 + 0.02 - R], null, false); prmTag(screen, 'tv-screen'); g.add(screen);
    const glow = prmMesh(THREE, new THREE.PlaneGeometry(sw + 0.04, sh + 0.04),
      new THREE.MeshBasicMaterial({ color: '#cfe9dc', transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false }), 'screenGlow', [-0.05, cy, D / 2 + 0.03], null, false); g.add(glow);
    // two dials on the control strip, each with a chrome rim and a mark that turns with it
    const dialGeo = new THREE.CylinderGeometry(0.036, 0.036, 0.03, 28), rimGeo = new THREE.TorusGeometry(0.036, 0.006, 10, 36);
    [['tv-channel', 0.10], ['tv-volume', -0.04]].forEach(([id, dy]) => {
      const d = prmMesh(THREE, dialGeo, buttons, id, [0.22, cy + dy, D / 2 + 0.03], [Math.PI / 2, 0, 0]); prmTag(d, id);
      d.add(prmMesh(THREE, new THREE.BoxGeometry(0.004, 0.004, 0.02), mats.plum, id + '-mark', [0, 0.016, -0.02]));
      g.add(d); g.add(prmMesh(THREE, rimGeo, mats.chrome, id + '-rim', [0.22, cy + dy, D / 2 + 0.035]));
    });
    for (let i = 0; i < 6; i++) g.add(prmMesh(THREE, new THREE.BoxGeometry(0.09, 0.006, 0.006), mats.plum, 'grille' + i, [0.22, cy - 0.12 - i * 0.014, D / 2 + 0.022], null, false));
    if (opts.earGeometry) [-1, 1].forEach(side => {
      const e = new THREE.Mesh(opts.earGeometry, ears); e.name = side < 0 ? 'earL' : 'earR';
      e.scale.setScalar(0.24); e.position.set(side * 0.2, cy + H / 2 + 0.06, -0.04); e.rotation.set(-0.12, 0, -side * 0.1);
      e.castShadow = e.receiveShadow = true; g.add(e);
    });
    [[-0.24, -0.15], [0.24, -0.15], [-0.24, 0.12], [0.24, 0.12]].forEach(([x, z], i) =>
      g.add(prmMesh(THREE, new THREE.CylinderGeometry(0.02, 0.022, FEET, 16), shell, 'foot' + i, [x, FEET / 2, z])));
    g.userData.api = { screen, tick() { return false; } };
    return g;
  }
  PRM_BUILDERS.tv = (ctx, shared) => prmBuildTV(ctx.lib, ctx.design, { earGeometry: shared.earGeometry, attractTexture: ctx.attractTexture });
```

- [ ] **Step 4: Run the harness** → `0 failed`. **Step 5:** run the visual driver; open the page in a real browser too (`npx http-server` per the `visual-check` skill) and check: the attract loop scrolls stickers, a click on the screen pushes in and the status line reads "TV mode would open", *Reset view* returns, the two dials turn 30° on click and write their status lines, the three swatches recolour body/bezel/ears/dials live.

- [ ] **Step 6: Commit** — `git add wip/premium/prm-props.js wip/premium/verify-prm-props.js wip/premium/shots/ && git commit -m "feat(premium): the CRT telly — attract screen, dials, ears" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"`

---
### Task 7: The dial — Random Game made physical (spec § 7.3, D4, D7)

**Files:**
- Modify: `wip/premium/prm-props.js` (append `prmSpinPlan`, `prmBuildDial`, registry line; add `prmSpinPlan` to the exported `api`)
- Modify: `wip/premium/verify-prm-props.js` (append `dial` section)

**Interfaces:**
- Consumes: `ctx.games` (20 entries with `id`, `gameName`, `brandHex`), `ctx.stickers` (`base + list[i].image`).
- Produces: `PrmProps.prmSpinPlan(n, currentRot, targetIdx, turns = 3) → { targetIdx, endRot, durationMs }` (pure); `PRM_BUILDERS.dial`; the group is the pick node `dial`; `api = { spin(rand, { instant }) → Promise<gameId>, rise(k), setDisplay(text), pauseDrift(ms, now), isSpinning(), tick(now, dt, reduced) }`; roles `shell` (base), `plate` (top plate, boss, wedge), `buttons` (ring, `prmEmissive`).
- Convention the scene relies on: spinner rotation `θ` brings cartridge `k` to the front (+z) when `θ ≡ -k·2π/n`.

- [ ] **Step 1: Append the failing harness section**

```js
section('dial');
{
  const TAU = Math.PI * 2, n = 20, slot = TAU / n;
  const p = PrmProps.prmSpinPlan(n, 0.3, 5);
  eq(p.targetIdx, 5, 'plan keeps the target'); eq(p.durationMs, 1800, 'plan is 1800 ms');
  ok(p.endRot > 0.3 + 3 * TAU, 'plan spins at least three full turns forward');
  const wrap = a => ((a % TAU) + TAU) % TAU;
  near(wrap(p.endRot), wrap(-5 * slot), 1e-9, 'end rotation puts cartridge 5 at the front');
  const p2 = PrmProps.prmSpinPlan(n, -5 * slot, 5); ok(p2.endRot > -5 * slot + 3 * TAU, 'already-at-target still spins forward a full turn, never zero');
  const built = PrmProps.prmBuildAll(global.__prmCtx); const dial = built.dial; ok(dial, 'dial builds');
  eq(dial.userData.prmId, 'dial', 'dial group is the pick node');
  const carts = []; dial.traverse(o => { if (o.userData.gameId) carts.push(o); });
  eq(carts.length, 20, 'dial holds exactly 20 cartridges');
  eq(new Set(carts.map(c => c.userData.gameId)).size, 20, 'one cartridge per game id');
  GAMES.forEach(g => ok(carts.some(c => c.userData.gameId === g.id), `cartridge for ${g.id}`));
  const urls = []; dial.traverse(o => { if (o.isMesh && o.material.userData.prmImage) urls.push(o.material.userData.prmImage); });
  eq(urls.length, 20, '20 label materials tagged with an image url');
  ok(urls.every(u => u.startsWith(global.__prmCtx.stickers.base)), 'every label url comes from the sticker base');
  const bodyOf = carts[3].getObjectByName('cartBody'); eq(bodyOf.material.color.getHexString(), GAMES[3].brandHex.slice(1).toLowerCase(), 'cartridge takes its game brand hex');
  const ring = dial.getObjectByName('ring'); eq(ring.material.userData.prmRole, 'buttons', 'ring glow is the buttons role'); ok(ring.material.userData.prmEmissive, 'ring emissive follows the design');
  const api = dial.userData.api; let calls = 0; const rand = () => { calls++; return 0.37; };   // → index 7
  let resolved = null; api.spin(rand, { instant: false }).then(id => resolved = id);
  ok(api.isSpinning(), 'spinning after spin()'); api.spin(rand); ok(calls === 1, 'a second spin() while running is a no-op (same promise)');
  let t = 1000; for (let i = 0; i <= 40; i++) api.tick(t += 50, 0.05, false);   // 2000 ms of ticks > 1800 ms tween
  // the resolution is a microtask; the rest of this section runs after it, then finish() prints the summary
  Promise.resolve().then(() => {
    api.tick(3060, 0.05, true); api.tick(3300, 0.05, true);   // let the 200 ms rise tween finish (tweens tick even under reduced motion)
    eq(resolved, GAMES[7].id, 'spin resolves to the rand-chosen game'); ok(!api.isSpinning(), 'not spinning after the tween ends');
    near(wrap(dial.getObjectByName('spinner').rotation.y), wrap(-7 * slot), 1e-6, 'spinner rests with cartridge 7 at the front');
    ok(carts[7].position.y > carts[6].position.y + 0.01, 'the chosen cartridge is risen');
    const r0 = dial.getObjectByName('spinner').rotation.y; api.tick(3350, 0.05, true); eq(dial.getObjectByName('spinner').rotation.y, r0, 'no drift under reduced motion');
    api.pauseDrift(0, 3350); api.tick(3400, 0.05, false); ok(dial.getObjectByName('spinner').rotation.y > r0, 'drift resumes when not reduced');
    let instant = null; api.spin(() => 0.12, { instant: true }).then(id => instant = id);   // → index 2
    ok(!api.isSpinning(), 'an instant spin is never "spinning"');
    Promise.resolve().then(() => { eq(instant, GAMES[2].id, 'instant spin resolves to the chosen game'); near(wrap(dial.getObjectByName('spinner').rotation.y), wrap(-2 * slot), 1e-9, 'instant spin puts the cartridge at the front'); finish(); });
  });
}
```

Because the spin resolves through a Promise, the harness's summary must wait for it. Replace the harness's last two lines (`console.log(...)` / `process.exit(...)`) with:

```js
function finish() { console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0); }
if (!global.__prmAsync) finish();
```

and put `global.__prmAsync = true;` as the first line of the `dial` section (right after `section('dial');`). Sections appended by later tasks go **above** the `dial` section so they run before `finish()`.

- [ ] **Step 2: Run to see it fail.**

- [ ] **Step 3: Append `prmSpinPlan` and the builder**

```js
  /* Pure: the rotation a spin ends on. Cartridge i sits at angle i·slot on the
     ring; spinner rotation θ = -k·slot brings k to the front. Always at least
     `turns` full turns forward, then the shortest forward distance. */
  function prmSpinPlan(n, currentRot, targetIdx, turns = 3) {
    const TAU = Math.PI * 2, slot = TAU / n, want = -targetIdx * slot;
    let delta = ((want - currentRot) % TAU + TAU) % TAU; if (delta < 1e-9) delta = TAU;
    return { targetIdx, endRot: currentRot + turns * TAU + delta, durationMs: 1800 };
  }

  /* The cartridge caddy. Base = shell, top plate/boss/wedge = plate, one soft
     ring in the buttons colour (all that is left of the RGB), twenty generic
     cartridges in their games' brand colours with the stickers as labels. */
  function prmBuildDial(lib, design, games, stickerUrl) {
    const { THREE, mats } = lib; const g = new THREE.Group(); prmTag(g, 'dial');
    const shell = lib.role('shell', design.shell), plate = lib.role('plate', design.plate);
    const ring = lib.role('buttons', design.buttons, { emissive: design.buttons, emissiveIntensity: .35, transparent: true, opacity: .9 }); ring.userData.prmEmissive = true;
    g.add(prmMesh(THREE, new THREE.CylinderGeometry(0.16, 0.165, 0.05, 48), shell, 'base', [0, 0.025, 0]));
    g.add(prmMesh(THREE, new THREE.TorusGeometry(0.155, 0.005, 8, 64), ring, 'ring', [0, 0.02, 0], [Math.PI / 2, 0, 0], false));
    const spinner = new THREE.Group(); spinner.name = 'spinner'; spinner.position.y = 0.05; g.add(spinner);
    spinner.add(prmMesh(THREE, new THREE.CylinderGeometry(0.145, 0.145, 0.012, 48), plate, 'topPlate', [0, 0.006, 0]));
    spinner.add(prmMesh(THREE, new THREE.CylinderGeometry(0.045, 0.045, 0.012, 32), plate, 'boss', [0, 0.018, 0]));
    spinner.add(prmMesh(THREE, new THREE.PlaneGeometry(0.06, 0.06), new THREE.MeshStandardMaterial({ map: lib.tex.label('★', '#ffffff', '#2B1B45', 128, 128), roughness: .5 }), 'bossLabel', [0, 0.0251, 0], [-Math.PI / 2, 0, 0], false));
    const n = games.length, slot = Math.PI * 2 / n, r = 0.115, REST = 0.03;
    const cartGeo = lib.moulded(0.03, 0.038, 0.007, 0.004, { bevelSegments: 2 });
    const cartridges = games.map((game, i) => {
      const a = i * slot, cg = new THREE.Group(); cg.name = 'cart-' + game.id; cg.userData.gameId = game.id; cg.userData.restY = REST;
      cg.position.set(Math.sin(a) * r, REST, Math.cos(a) * r); cg.rotation.y = a;
      cg.add(prmMesh(THREE, cartGeo, new THREE.MeshStandardMaterial({ color: game.brandHex, roughness: .5 }), 'cartBody', [0, 0, 0]));
      const labelMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .6, transparent: true }); labelMat.userData.prmImage = stickerUrl(game.id);
      cg.add(prmMesh(THREE, new THREE.PlaneGeometry(0.022, 0.022), labelMat, 'cartLabel', [0, 0.002, 0.0042], null, false));
      spinner.add(cg); return cg;
    });
    // fixed wedge housing, front-right, with the little display on top
    const a0 = -75 * Math.PI / 180, a1 = -25 * Math.PI / 180, wedge = new THREE.Shape();
    wedge.absarc(0, 0, 0.09, a0, a1, false); wedge.absarc(0, 0, 0.17, a1, a0, true); wedge.closePath();
    const wedgeGeo = lib.extrude(wedge, 0.05, 0.006, { center: false }); wedgeGeo.rotateX(-Math.PI / 2);
    g.add(prmMesh(THREE, wedgeGeo, plate, 'wedge', [0, 0.056, 0]));
    const am = (a0 + a1) / 2, dispMat = new THREE.MeshStandardMaterial({ map: lib.tex.label('', '#1a1a1a', '#e9ffe9', 256, 96), roughness: .3, emissive: '#3a5a3a', emissiveIntensity: .3 });
    g.add(prmMesh(THREE, new THREE.PlaneGeometry(0.05, 0.018), dispMat, 'display', [Math.cos(am) * 0.13, 0.113, -Math.sin(am) * 0.13], [-Math.PI / 2, 0, -am - Math.PI / 2], false));
    let rot = 0, driftPauseUntil = 0, risen = null, spinning = null; const motion = prmMotion();
    const api = {
      spinner, cartridges, isSpinning: () => !!spinning,
      setDisplay(text) { const old = dispMat.map; dispMat.map = lib.tex.label(text, '#1a1a1a', '#e9ffe9', 256, 96); dispMat.needsUpdate = true; if (old) old.dispose(); },
      rise(k, instant) {
        if (risen !== null && risen !== k) { const prev = cartridges[risen]; motion.add(prev.position.y, REST, 200, prmEaseOutCubic, v => prev.position.y = v); }
        const c = cartridges[k]; risen = k;
        if (instant) c.position.y = REST + 0.012; else motion.add(c.position.y, REST + 0.012, 200, prmEaseOutBack, v => c.position.y = v);
        api.setDisplay(games[k].gameName);
      },
      spin(rand, opt = {}) {
        if (spinning) return spinning;
        const k = Math.min(n - 1, Math.floor(rand() * n));
        /* Reduced motion: show the result, skip the journey (spec § 11). Not
           tracked as `spinning` — there is no tween to guard against. */
        if (opt.instant) { rot = -k * slot; spinner.rotation.y = rot; api.rise(k, true); return Promise.resolve(games[k].id); }
        driftPauseUntil = Infinity;
        const plan = prmSpinPlan(n, rot, k);
        spinning = new Promise(res => {
          motion.add(rot, plan.endRot, plan.durationMs, prmEaseOutCubic, v => { rot = v; spinner.rotation.y = v; },
            () => { api.rise(k); spinning = null; driftPauseUntil = 0; res(games[k].id); });
        });
        return spinning;
      },
      pauseDrift(ms, now) { driftPauseUntil = now + ms; },
      tick(now, dt, reduced) {
        let active = motion.tick(now);
        if (!spinning && !reduced && now >= driftPauseUntil) { rot += dt * 0.07; spinner.rotation.y = rot; active = true; }
        return active;
      },
    };
    g.userData.api = api; return g;
  }
  PRM_BUILDERS.dial = (ctx) => prmBuildDial(ctx.lib, ctx.design, ctx.games, id => { const s = (ctx.stickers.list || []).find(x => x.id === id); return ctx.stickers.base + (s ? s.image : id + '.png'); });
```

Add `prmSpinPlan` to the exported `api` object.

- [ ] **Step 4: Run the harness** → `0 failed` (the summary now prints after the Promise settles).

- [ ] **Step 5: Run the visual driver** — the "keeps rendering while idle" check now passes (the dial drifts). In a real browser: hover pauses the drift; a click spins ~1.8 s, one cartridge rises, the display names it, the camera pushes into the TV, the status line names the game; `?reduced` (the sandbox's `reducedMotion` override) shows the result instantly and cuts.

- [ ] **Step 6: Commit** — `git add wip/premium/prm-props.js wip/premium/verify-prm-props.js wip/premium/shots/ && git commit -m "feat(premium): the cartridge dial — drift, spin, rise, hand-off" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"`

---
### Task 8: Jukebox, phone, stickerbook (spec §§ 7.2, 7.4, 7.7, D9)

**Files:**
- Modify: `wip/premium/prm-props.js` (append `prmStarShape`, `prmBuildJukebox`, `prmBuildPhone`, `prmBuildBinder`, three registry lines)
- Modify: `wip/premium/verify-prm-props.js` (append `jukebox-phone-binder` section **above** the `dial` section)

**Interfaces:**
- Produces: `PRM_BUILDERS.jukebox` (pick nodes `jukebox-knob`, `jukebox-record`; `api = { setLabel(text), setPlaying(bool), tick }`), `PRM_BUILDERS.phone` (pick node `phone`; `api.tick` pulses the screen), `PRM_BUILDERS.binder` (pick node `binder`; `api = { isOpen(), openCover(instant), tick }`). The scene's `activate('binder')` calls `openStickerbook()` when the host gives one, else `api.openCover(reduced)` (that is `PRM_ACTIONS.binder.fallback`).

- [ ] **Step 1: Append the failing harness section (above `section('dial')`)**

```js
section('jukebox-phone-binder');
{
  const built = PrmProps.prmBuildAll(global.__prmCtx);
  ok(built.jukebox && built.phone && built.binder, 'jukebox, phone and binder build');
  const ids = {}; built.jukebox.traverse(o => { if (o.userData.prmId) ids[o.userData.prmId] = o; });
  ok(ids['jukebox-knob'] && ids['jukebox-record'], 'jukebox has knob + record pick nodes');
  ok(built.jukebox.getObjectByName('earL') && built.jukebox.getObjectByName('earR'), 'jukebox has ears');
  ok(built.jukebox.getObjectByName('earL').scale.y < built.jukebox.getObjectByName('earL').scale.x, 'jukebox ears are shorter and rounder than tall (distinct from the TV)');
  const jb = built.jukebox.userData.api; jb.setLabel('Hello'); jb.setPlaying(true);
  const q0 = ids['jukebox-record'].quaternion.clone(); ok(jb.tick(100, 0.1, false) === true, 'record turns while playing');
  ok(!ids['jukebox-record'].quaternion.equals(q0), 'record orientation changed'); ok(jb.tick(200, 0.1, true) === false, 'record still under reduced motion');
  jb.setPlaying(false); ok(jb.tick(300, 0.1, false) === false, 'record still when nothing plays');
  eq(built.phone.userData.prmId, 'phone', 'phone group is the pick node');
  const keys = []; built.phone.traverse(o => { if (/^key\d\d$/.test(o.name)) keys.push(o); }); eq(keys.length, 12, 'phone has a 3x4 keypad');
  ok(keys[0].material.userData.prmRole === 'buttons', 'keypad takes the buttons role');
  const b = built.binder, api = b.userData.api; eq(b.userData.prmId, 'binder', 'binder group is the pick node');
  const stickers = []; b.traverse(o => { if (o.isMesh && o.material.userData.prmImage) stickers.push(o); }); eq(stickers.length, 20, 'binder shows all 20 stickers');
  ok(b.getObjectByName('cover').material === lib.mats.yellow, 'cover is the fixed soft yellow (never the design)');
  let roleCount = 0; b.traverse(o => { if (o.isMesh && o.material.userData.prmRole) roleCount++; }); eq(roleCount, 0, 'nothing on the binder follows the design');
  ok(!api.isOpen(), 'binder starts closed'); api.openCover(true); ok(api.isOpen(), 'openCover(instant) opens');
  ok(Math.abs(b.getObjectByName('hinge').rotation.z) > 2.5, 'cover flops back past 145°'); api.openCover(true); ok(!api.isOpen(), 'second call closes');
  eq(PrmProps.PRM_ACTIONS.binder.fallback, 'openCover', 'binder falls back to openCover when no openStickerbook is given');
  ok(typeof api[PrmProps.PRM_ACTIONS.binder.fallback] === 'function', 'the fallback names a real api method');
}
```

- [ ] **Step 2: Run to see it fail.**

- [ ] **Step 3: Append the three builders**

```js
  function prmStarShape(THREE, R, r, n = 5) {
    const s = new THREE.Shape();
    for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r : R; const x = Math.cos(a) * rr, y = Math.sin(a) * rr; if (i) s.lineTo(x, y); else s.moveTo(x, y); }
    s.closePath(); return s;
  }

  /* The jukebox: an arched cabinet (shell), inset panel (plate), grille, two
     knobs + four candy caps (buttons), a record with a label, a brass antenna
     with a lit bead, and ears that are shorter, rounder and angled out. */
  function prmBuildJukebox(lib, design, opts = {}) {
    const { THREE, mats } = lib; const g = new THREE.Group(); const W = 0.30, H = 0.44, D = 0.24, cy = H / 2;
    const shell = lib.role('shell', design.shell), plate = lib.role('plate', design.plate);
    const ears = lib.role('ears', design.ears), buttons = lib.role('buttons', design.buttons, { roughness: .34 });
    const arch = (w, h) => { const s = new THREE.Shape(), r = w / 2; s.moveTo(-r, -h / 2); s.lineTo(r, -h / 2); s.lineTo(r, h / 2 - r); s.absarc(0, h / 2 - r, r, 0, Math.PI, false); s.lineTo(-r, -h / 2); return s; };
    g.add(prmMesh(THREE, lib.extrude(arch(W, H), D, 0.02), shell, 'cabinet', [0, cy, 0]));
    g.add(prmMesh(THREE, lib.extrude(arch(W - 0.05, H - 0.05), 0.02, 0.005), plate, 'panel', [0, cy, D / 2 + 0.005]));
    for (let i = 0; i < 6; i++) g.add(prmMesh(THREE, new THREE.BoxGeometry(0.12, 0.005, 0.006), mats.plum, 'grille' + i, [0, cy + 0.12 - i * 0.012, D / 2 + 0.02], null, false));
    const knobGeo = new THREE.CylinderGeometry(0.018, 0.02, 0.02, 24);
    const knob = prmMesh(THREE, knobGeo, buttons, 'jukebox-knob', [-0.09, cy + 0.02, D / 2 + 0.025], [Math.PI / 2, 0, 0]); prmTag(knob, 'jukebox-knob'); g.add(knob);
    g.add(prmMesh(THREE, knobGeo, buttons, 'knobR', [0.09, cy + 0.02, D / 2 + 0.025], [Math.PI / 2, 0, 0]));
    const capGeo = new THREE.CylinderGeometry(0.011, 0.012, 0.008, 20);
    [[0, 0.045], [0, 0.005], [-0.02, 0.025], [0.02, 0.025]].forEach(([x, y], i) => g.add(prmMesh(THREE, capGeo, buttons, 'cap' + i, [x, cy + y, D / 2 + 0.02], [Math.PI / 2, 0, 0])));
    const record = prmMesh(THREE, new THREE.CylinderGeometry(0.085, 0.085, 0.005, 48), mats.black, 'jukebox-record', [0, cy - 0.11, D / 2 + 0.02], [Math.PI / 2, 0, 0]); prmTag(record, 'jukebox-record'); g.add(record);
    const labelMat = new THREE.MeshStandardMaterial({ map: lib.tex.label('', '#2B1B45', '#ffffff', 256, 256), roughness: .6 });
    const label = prmMesh(THREE, new THREE.CircleGeometry(0.032, 32), labelMat, 'recordLabel', [0, cy - 0.11, D / 2 + 0.0231], null, false); g.add(label);
    g.add(prmMesh(THREE, new THREE.CylinderGeometry(0.003, 0.003, 0.06, 8), mats.brass, 'antenna', [0, H + 0.03, -0.02], null, false));
    g.add(prmMesh(THREE, new THREE.SphereGeometry(0.008, 12, 10), mats.emissive('#ffd27a', 1.5), 'bead', [0, H + 0.065, -0.02], null, false));
    if (opts.earGeometry) [-1, 1].forEach(side => {
      const e = new THREE.Mesh(opts.earGeometry, ears); e.name = side < 0 ? 'earL' : 'earR';
      e.scale.set(0.17, 0.14, 0.17); e.position.set(side * 0.11, H + 0.02, -0.03); e.rotation.set(-0.1, 0, -side * 0.45);
      e.castShadow = e.receiveShadow = true; g.add(e);
    });
    let playing = false;
    g.userData.api = {
      setLabel(text) { const old = labelMat.map; labelMat.map = lib.tex.label(text, '#2B1B45', '#ffffff', 256, 256); labelMat.needsUpdate = true; if (old) old.dispose(); },
      setPlaying(b) { playing = !!b; },
      tick(now, dt, reduced) { if (!playing || reduced) return false; const d = dt * 3.49; record.rotateY(d); label.rotation.z += d; return true; },   // 33 rpm
    };
    return g;
  }
  PRM_BUILDERS.jukebox = (ctx, shared) => prmBuildJukebox(ctx.lib, ctx.design, { earGeometry: shared.earGeometry });

  /* The flip phone: lower half with the keypad flat on the table, upper half
     hinged open ~110° with its screen facing the camera. Body = shell, screen
     surround = plate, keys = buttons. */
  function prmBuildPhone(lib, design) {
    const { THREE } = lib; const g = new THREE.Group(); prmTag(g, 'phone');
    const shell = lib.role('shell', design.shell), plate = lib.role('plate', design.plate), buttons = lib.role('buttons', design.buttons, { roughness: .4 });
    const PW = 0.05, PL = 0.10, PT = 0.012, FLAT = [-Math.PI / 2, 0, 0];
    g.add(prmMesh(THREE, lib.moulded(PW, PL, PT, 0.008), shell, 'lower', [0, PT / 2, 0], FLAT));
    const keyGeo = new THREE.BoxGeometry(0.009, 0.003, 0.007);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) g.add(prmMesh(THREE, keyGeo, buttons, 'key' + r + c, [(c - 1) * 0.013, PT + 0.0015, 0.005 + r * 0.011], null, false));
    const hinge = new THREE.Group(); hinge.name = 'hinge'; hinge.position.set(0, PT, -PL / 2); hinge.rotation.x = -110 * Math.PI / 180; g.add(hinge);
    hinge.add(prmMesh(THREE, lib.moulded(PW, PL, PT * 0.8, 0.008), shell, 'upper', [0, PT * 0.4, PL / 2], FLAT));
    hinge.add(prmMesh(THREE, lib.moulded(PW - 0.008, PL - 0.02, 0.002, 0.005), plate, 'surround', [0, -0.0008, PL / 2], [Math.PI / 2, 0, 0], false));
    const screenMat = new THREE.MeshStandardMaterial({ map: lib.tex.label('Shelves', '#dcefff', '#2B1B45', 128, 192), emissive: '#dcefff', emissiveIntensity: .5, roughness: .3 });
    screenMat.emissiveMap = screenMat.map;
    hinge.add(prmMesh(THREE, new THREE.PlaneGeometry(PW - 0.014, PL - 0.03), screenMat, 'screen', [0, -0.0022, PL / 2], [Math.PI / 2, 0, 0], false));
    g.userData.api = { tick(now, dt, reduced) { if (reduced) { screenMat.emissiveIntensity = .5; return false; } screenMat.emissiveIntensity = .5 + Math.sin(now / 640) * 0.03; return true; } };
    return g;
  }
  PRM_BUILDERS.phone = (ctx) => prmBuildPhone(ctx.lib, ctx.design);

  /* The stickerbook: the soft-yellow quilted binder (fixed colour), a cover
     hinged on the spine, ten stickers on the open page and ten on the cover's
     inside. A prop today; PRM_ACTIONS.binder is its dormant door. */
  function prmBuildBinder(lib, stickerIds, stickerUrl) {
    const { THREE, mats } = lib; const g = new THREE.Group(); prmTag(g, 'binder');
    const BW = 0.20, BH = 0.24, T = 0.03, FLAT = [-Math.PI / 2, 0, 0];
    g.add(prmMesh(THREE, lib.moulded(BW, BH, T, 0.015), mats.yellow, 'base', [0, T / 2, 0], FLAT));
    g.add(prmMesh(THREE, new THREE.BoxGeometry(BW - 0.02, T - 0.012, BH - 0.02), mats.paper, 'pages', [0.005, T / 2, 0], null, false));
    const grid = (parent, ids, y, flip) => ids.forEach((id, i) => {
      const cx = (i % 2 - 0.5) * 0.075, cz = (Math.floor(i / 2) - 2) * 0.042, rot = flip ? [Math.PI / 2, 0, 0] : FLAT;
      parent.add(prmMesh(THREE, new THREE.PlaneGeometry(0.065, 0.036), mats.sleeve, 'sleeve-' + id, [cx, y, cz], rot, false));
      const sm = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .6, transparent: true }); sm.userData.prmImage = stickerUrl(id);
      parent.add(prmMesh(THREE, new THREE.PlaneGeometry(0.03, 0.03), sm, 'sticker-' + id, [cx, y + (flip ? -0.0006 : 0.0006), cz], rot, false));
    });
    const page = new THREE.Group(); page.name = 'page'; page.position.set(0.005, T - 0.005, 0); g.add(page);
    grid(page, stickerIds.slice(0, 10), 0.0006, false);
    const hinge = new THREE.Group(); hinge.name = 'hinge'; hinge.position.set(-BW / 2, T, 0); g.add(hinge);
    hinge.add(prmMesh(THREE, lib.moulded(BW, BH, 0.008, 0.015), mats.yellow, 'cover', [BW / 2, 0.004, 0], FLAT));
    hinge.add(prmMesh(THREE, lib.extrude(prmStarShape(THREE, 0.028, 0.013), 0.003, 0.0008), mats.yellowDark, 'star', [BW / 2, 0.0095, 0], FLAT, false));
    const inside = new THREE.Group(); inside.name = 'coverInside'; inside.position.set(BW / 2, 0, 0); hinge.add(inside);
    grid(inside, stickerIds.slice(10, 20), -0.0006, true);
    let open = false; const motion = prmMotion();
    g.userData.api = {
      isOpen: () => open,
      openCover(instant) { open = !open; const to = open ? Math.PI * 0.92 : 0; if (instant) { hinge.rotation.z = to; return; } motion.add(hinge.rotation.z, to, 400, prmEaseOutCubic, v => hinge.rotation.z = v); },
      tick(now) { return motion.tick(now); },
    };
    return g;
  }
  PRM_BUILDERS.binder = (ctx) => prmBuildBinder(ctx.lib, ctx.games.map(g => g.id), id => { const s = (ctx.stickers.list || []).find(x => x.id === id); return ctx.stickers.base + (s ? s.image : id + '.png'); });
```

- [ ] **Step 4: Run the harness** → `0 failed`. **Step 5:** visual driver + real browser: the record turns once a track is set (click the record: the label reads a game name and it spins); the phone's screen pulses and a click fades to "Shelves would open"; the binder's cover flops open on click and closes on the next; swatches recolour the jukebox and phone but never the binder.

- [ ] **Step 6: Commit** — `git add wip/premium/prm-props.js wip/premium/verify-prm-props.js wip/premium/shots/ && git commit -m "feat(premium): jukebox, flip phone, the yellow stickerbook" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"`

---

### Task 9: The photo-carousel lamp and the shelf (spec §§ 7.6, 7.9, D8)

**Files:**
- Modify: `wip/premium/prm-props.js` (append `prmLampSlots`, `prmBuildLamp`, `PRM_TRINKETS_V1`, `prmBuildShelf`, two registry lines; export `prmLampSlots`, `PRM_TRINKETS_V1`)
- Modify: `wip/premium/verify-prm-props.js` (append `lamp-shelf` section above `dial`)

**Interfaces:**
- Consumes: `ctx.lampPanels = { base, manifest: { rows, panels: [{ id, image }] } }`, `ctx.roomData.prmShelf`.
- Produces: `PrmProps.prmLampSlots(manifest) → [{ id, image, row, col }]` (pure; `rows × panels.length` entries, repeating); `PRM_BUILDERS.lamp` (pick node `lamp`; `api = { flick(v), nudge(v), tick }`); `PRM_BUILDERS.shelfContents` (no pick node; books + trinkets on the room's shelf boards); `PRM_TRINKETS_V1`.

- [ ] **Step 1: Append the failing harness section**

```js
section('lamp-shelf');
{
  const man = global.__prmCtx.lampPanels.manifest;
  const slots = PrmProps.prmLampSlots(man); eq(slots.length, man.panels.length * man.rows, 'slots = panels × rows');
  eq(slots[0].id, 'laughing', 'slot 0 is the first panel'); eq(slots[8].id, 'frustrated', 'slot 8 is the ninth panel');
  const two = PrmProps.prmLampSlots(Object.assign({}, man, { rows: 2 })); eq(two.length, 18, 'two rows double the slots'); eq(two[9].id, 'laughing', 'the second row repeats from the start');
  const built = PrmProps.prmBuildAll(global.__prmCtx); const lamp = built.lamp; ok(lamp, 'lamp builds'); eq(lamp.userData.prmId, 'lamp', 'lamp group is the pick node');
  const films = []; lamp.traverse(o => { if (o.isMesh && o.material.userData.prmImage) films.push(o.material.userData.prmImage); });
  eq(films.length, 9, 'nine film materials tagged with images');
  ok(films.every(u => u.startsWith(global.__prmCtx.lampPanels.base)), 'every film url comes from the lamp base');
  ok(films.every(u => man.panels.some(p => u.endsWith(p.image))), 'no film url outside the manifest');
  lamp.traverse(o => { if (o.isMesh && o.material.userData.prmImage) ok(o.material.userData.prmEmissiveMap === true, 'portraits are lit from inside (emissiveMap flag)'); });
  const spin = lamp.getObjectByName('spinGroup'); const r0 = spin.rotation.y; const api = lamp.userData.api;
  ok(api.tick(100, 0.1, false) === true, 'lamp idles (active)'); ok(spin.rotation.y > r0, 'idle rotation advances');
  const r1 = spin.rotation.y; api.tick(200, 0.1, true); eq(spin.rotation.y, r1, 'no rotation under reduced motion');
  api.flick(4); api.tick(300, 0.1, false); ok(spin.rotation.y - r1 > 0.2, 'a flick spins it hard');
  const shelf = built.shelfContents; ok(shelf, 'shelf contents build');
  let books = 0, trinkets = 0, picks = 0; shelf.traverse(o => { if (/^book\d+$/.test(o.name)) books++; if (/^trinket-/.test(o.name)) trinkets++; if (o.userData.prmId) picks++; });
  eq(books, 10, 'ten books'); eq(trinkets, 5, 'five unlocked trinkets'); eq(picks, 0, 'nothing on the shelf is interactive');
  const locked = PrmProps.prmBuildShelf(lib, PrmProps.PRM_TRINKETS_V1.map((t, i) => Object.assign({}, t, { unlocked: i !== 2 })), GAMES, room.userData.prmShelf);
  let t2 = 0; locked.traverse(o => { if (/^trinket-/.test(o.name)) t2++; }); eq(t2, 4, 'a locked trinket leaves its slot empty');
  const S = room.userData.prmShelf; shelf.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(shelf);
  ok(bb.min.x > S.x - S.w / 2 - 0.01 && bb.max.x < S.x + S.w / 2 + 0.01, 'shelf contents stay inside the shelf width');
}
```

- [ ] **Step 2: Run to see it fail.**

- [ ] **Step 3: Append the builders**

```js
  /* Pure: which image goes in which ring slot. rows × panels.length slots,
     filled in manifest order and repeating — so a 9-panel set fills one row of
     nine, and a second row repeats from the start. */
  function prmLampSlots(manifest) {
    const rows = Math.max(1, manifest.rows | 0), panels = manifest.panels || [], out = [];
    for (let row = 0; row < rows; row++) for (let col = 0; col < panels.length; col++) { const p = panels[(row * panels.length + col) % panels.length]; out.push({ id: p.id, image: p.image, row, col }); }
    return out;
  }

  /* The photo-carousel lamp, ported from lampshade-hero.html at metre scale:
     birch base, brass stem/hoops/posts, a lit tube, and one card per slot
     carrying a portrait from the manifest. Drag-to-flick with friction. */
  function prmBuildLamp(lib, lampPanels) {
    const { THREE, mats } = lib; const g = new THREE.Group(); prmTag(g, 'lamp');
    const slots = prmLampSlots(lampPanels.manifest), n = lampPanels.manifest.panels.length, rows = Math.max(1, lampPanels.manifest.rows | 0);
    g.add(prmMesh(THREE, new THREE.CylinderGeometry(0.065, 0.068, 0.02, 32), mats.birch, 'base', [0, 0.01, 0]));
    g.add(prmMesh(THREE, new THREE.CylinderGeometry(0.008, 0.008, 0.06, 12), mats.brass, 'stem', [0, 0.05, 0]));
    g.add(prmMesh(THREE, new THREE.CylinderGeometry(0.012, 0.012, 0.14, 20), mats.emissive('#ffe2b8', 1.2), 'tube', [0, 0.15, 0], null, false));
    const spin = new THREE.Group(); spin.name = 'spinGroup'; g.add(spin);
    const CARD = 0.05, GAP = 0.006, R = 0.075, TOP = 0.215, pitch = CARD + GAP;
    const bottomY = TOP - rows * pitch;
    [TOP, bottomY + 0.01].forEach((y, i) => spin.add(prmMesh(THREE, new THREE.TorusGeometry(R, 0.0025, 6, 64), mats.brass, 'hoop' + i, [0, y, 0], [Math.PI / 2, 0, 0], false)));
    for (let v = 0; v < n; v += 2) { const a = (v + 0.5) * Math.PI * 2 / n; spin.add(prmMesh(THREE, new THREE.CylinderGeometry(0.002, 0.002, TOP - bottomY, 6), mats.brass, 'post' + v, [Math.sin(a) * R, (TOP + bottomY) / 2, Math.cos(a) * R], null, false)); }
    const cardGeo = new THREE.BoxGeometry(CARD, CARD, 0.002), filmGeo = new THREE.PlaneGeometry(CARD * 0.74, CARD * 0.74);
    slots.forEach(s => {
      const a = s.col * Math.PI * 2 / n, y = TOP - s.row * pitch - CARD / 2 - 0.004;
      const card = prmMesh(THREE, cardGeo, mats.cream, 'card-' + s.row + '-' + s.col, [Math.sin(a) * R, y, Math.cos(a) * R], [0, a, 0], false); spin.add(card);
      const fm = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: .35, roughness: .6 });
      fm.userData.prmImage = lampPanels.base + s.image; fm.userData.prmEmissiveMap = true;
      card.add(prmMesh(THREE, filmGeo, fm, 'film-' + s.id, [0, 0, 0.0011], null, false));
    });
    const IDLE = 0.21;   // rad/s ≈ 2 rpm
    let vel = IDLE, dragging = false;
    g.userData.api = {
      flick(v) { vel = v; dragging = false; },
      nudge(v) { dragging = true; spin.rotation.y += v; },
      tick(now, dt, reduced) {
        if (reduced || dragging) { dragging = false; return false; }
        vel *= Math.pow(0.955, dt * 60); if (Math.abs(vel) < IDLE) vel += (IDLE - vel) * 0.02;
        spin.rotation.y += vel * dt; return true;
      },
    };
    return g;
  }
  PRM_BUILDERS.lamp = (ctx) => prmBuildLamp(ctx.lib, ctx.lampPanels);

  /* Trinkets are easter eggs: looks only, never a pick target, never a door.
     `unlocked` is the seam a future earning system flips (spec § 7.9). */
  const PRM_TRINKETS_V1 = [
    { id: 'mini-controller', builder: 'controller', unlocked: true },
    { id: 'mini-lamp',       builder: 'lamp',       unlocked: true },
    { id: 'plant',           builder: 'plant',      unlocked: true },
    { id: 'studio-print',    builder: 'print',      unlocked: true },
    { id: 'game-stack',      builder: 'stack',      unlocked: true },
  ];
  function prmBuildShelf(lib, trinkets, games, S) {
    const { THREE, mats } = lib; const g = new THREE.Group();
    const heights = [0.2, 0.17, 0.22, 0.15, 0.19, 0.16, 0.21, 0.18, 0.2, 0.14];
    let x = S.x - S.w / 2 + S.side + 0.02; const y = S.ys[1] + 0.01;
    heights.forEach((h, i) => {
      const col = new THREE.Color(games[(i * 3) % games.length].brandHex).lerp(new THREE.Color('#8f8a85'), 0.5), t = 0.02 + (i % 3) * 0.006;
      const b = prmMesh(THREE, new THREE.BoxGeometry(t, h, 0.16), new THREE.MeshStandardMaterial({ color: col, roughness: .8 }), 'book' + i, [x + t / 2, y + h / 2, S.z + 0.02]);
      if (i === 6) b.rotation.z = -0.12; g.add(b); x += t + 0.004;
    });
    const mini = {
      controller() { const m = new THREE.Group(); m.add(prmMesh(THREE, lib.moulded(0.06, 0.035, 0.014, 0.012), new THREE.MeshStandardMaterial({ color: '#a97fd6', roughness: .5 }), 'miniBody', [0, 0.012, 0], [-Math.PI / 2 + 0.3, 0, 0]));
        [-1, 1].forEach(s => m.add(prmMesh(THREE, new THREE.SphereGeometry(0.008, 12, 10), new THREE.MeshStandardMaterial({ color: '#a97fd6' }), 'miniEar', [s * 0.02, 0.03, -0.006]))); return m; },
      lamp() { const m = new THREE.Group(); m.add(prmMesh(THREE, new THREE.CylinderGeometry(0.02, 0.02, 0.006, 20), mats.birch, 'miniBase', [0, 0.003, 0]));
        m.add(prmMesh(THREE, new THREE.CylinderGeometry(0.005, 0.005, 0.045, 12), mats.emissive('#ffe2b8', 1), 'miniTube', [0, 0.03, 0], null, false));
        m.add(prmMesh(THREE, new THREE.TorusGeometry(0.02, 0.0015, 6, 32), mats.brass, 'miniHoop', [0, 0.05, 0], [Math.PI / 2, 0, 0], false)); return m; },
      plant() { const m = new THREE.Group(); m.add(prmMesh(THREE, new THREE.CylinderGeometry(0.025, 0.02, 0.04, 20), new THREE.MeshStandardMaterial({ color: '#c9795a', roughness: .8 }), 'pot', [0, 0.02, 0]));
        [[0, 0.06, 0], [0.015, 0.05, 0.01], [-0.014, 0.052, -0.008]].forEach((p, i) => m.add(prmMesh(THREE, new THREE.SphereGeometry(0.022, 14, 12), new THREE.MeshStandardMaterial({ color: '#7fa86b', roughness: .9 }), 'leaf' + i, p))); return m; },
      print() { const m = new THREE.Group(); m.add(prmMesh(THREE, new THREE.BoxGeometry(0.07, 0.09, 0.008), mats.birchDark, 'frame', [0, 0.045, 0], [-0.15, 0, 0]));
        m.add(prmMesh(THREE, new THREE.PlaneGeometry(0.058, 0.078), new THREE.MeshStandardMaterial({ map: lib.tex.label('★', '#FAFAF9', '#E9408E', 128, 160), roughness: .9 }), 'printFace', [0, 0.045 + 0.0006, 0.0041], [-0.15, 0, 0], false)); return m; },
      stack() { const m = new THREE.Group(); [3, 7, 12].forEach((gi, i) => m.add(prmMesh(THREE, new THREE.BoxGeometry(0.08, 0.02, 0.06), new THREE.MeshStandardMaterial({ color: games[gi % games.length].brandHex, roughness: .6 }), 'box' + i, [0, 0.01 + i * 0.021, 0], [0, (i - 1) * 0.15, 0]))); return m; },
    };
    const pitch = S.w / 5, y2 = S.ys[2] + 0.01;
    trinkets.forEach((t, i) => {
      if (!t.unlocked || !mini[t.builder]) return;
      const tg = mini[t.builder](); tg.name = 'trinket-' + t.id; tg.position.set(S.x - S.w / 2 + pitch * (i + 0.5), y2, S.z); g.add(tg);
    });
    return g;
  }
  PRM_BUILDERS.shelfContents = (ctx) => prmBuildShelf(ctx.lib, PRM_TRINKETS_V1, ctx.games, ctx.roomData.prmShelf);
```

Add `prmLampSlots`, `prmBuildShelf`, `PRM_TRINKETS_V1` to the exported `api`.

- [ ] **Step 4: Run the harness** → `0 failed`. **Step 5:** visual driver + real browser: the lamp turns slowly with the nine portraits glowing; a drag across it flicks it and it settles back to idle; the shelf shows leaning books and five trinkets; nothing on the shelf responds to hover.

- [ ] **Step 6: Commit** — `git add wip/premium/prm-props.js wip/premium/verify-prm-props.js wip/premium/shots/ && git commit -m "feat(premium): the portrait lamp and the trinket shelf" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"`

---
### Task 10: The whole-room contracts — registry, footprints, design purity, keyboard, reduced motion (spec §§ 9, 10, 11, 14)

Everything here already exists; this task proves the contracts that only hold once every prop is in the room.

**Files:**
- Modify: `wip/premium/verify-prm-props.js` (append `contracts` section above `dial`)
- Modify: `wip/premium/visual-prm.js` (append the keyboard walk and the spin-under-reduced-motion check)

- [ ] **Step 1: Append the harness section (spec § 14 checks 2, 5 and the footprints of check 1)**

```js
section('contracts');
{
  const A = PrmProps.PRM_ACTIONS, built = PrmProps.prmBuildAll(global.__prmCtx);
  const ids = new Set(); Object.values(built).forEach(g => g.traverse(o => { if (o.userData.prmId) ids.add(o.userData.prmId); }));
  Object.keys(A).forEach(id => ok(ids.has(id), `action id "${id}" exists as a pick node`));
  ids.forEach(id => ok(A[id], `pick node "${id}" has an action`));
  const HOST = new Set(['enterTV', 'enterShelves', 'openWorkshop', 'openSound', 'openSwitcher', 'openStickerbook', 'music.next']);
  Object.entries(A).forEach(([id, a]) => ok(a.local || HOST.has(a.callback), `"${id}" names a host callback or a local api`));
  ['enterTV', 'enterShelves', 'openWorkshop', 'openSound', 'openSwitcher'].forEach(cb => ok(Object.values(A).some(a => a.callback === cb), `required callback ${cb} is reachable from a prop`));
  eq(Object.values(A).filter(a => a.optional).length, 1, 'exactly one optional action (the binder)');
  PrmProps.PRM_TAB_ORDER.forEach(id => ok(ids.has(id), `tab order id "${id}" exists`));
  // footprints: each prop, placed, sits inside its surface's region (spec § 14 check 1)
  const place = (id) => { const g = built[id], p = PrmProps.PRM_PLACES[id]; g.position.set(...p.pos); if (p.rot) g.rotation.set(...p.rot); g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(g); };
  const inside = (bb, r) => bb.min.x >= r.x[0] && bb.max.x <= r.x[1] && bb.min.z >= r.z[0] && bb.max.z <= r.z[1] && bb.min.y >= r.y[0] - 0.01;
  const R = room.userData.prmRoom;
  const REGIONS = {
    tv:        { x: [-0.65, 0.25], z: [-2.80, -2.20], y: [R.benchTopY, 1.5] },
    jukebox:   { x: [ 0.60, 1.10], z: [-2.80, -2.20], y: [R.benchTopY, 1.5] },
    dial:      { x: [-0.45, 0.65], z: [ 0.04,  0.66], y: [R.tableTopY, 0.8] },
    binder:    { x: [-0.45, 0.65], z: [ 0.04,  0.66], y: [R.tableTopY, 0.8] },
    phone:     { x: [-0.45, 0.65], z: [ 0.04,  0.66], y: [R.tableTopY, 0.8] },
    controller:{ x: [-1.65, -1.05], z: [ 0.85,  1.85], y: [R.armTopY, 1.0] },
    lamp:      { x: [-1.95, -1.45], z: [-2.35, -1.85], y: [R.sideTableTopY, 1.0] },
  };
  Object.entries(REGIONS).forEach(([id, r]) => { const bb = place(id); ok(inside(bb, r), `${id} sits inside its surface region (x ${bb.min.x.toFixed(2)}..${bb.max.x.toFixed(2)}, z ${bb.min.z.toFixed(2)}..${bb.max.z.toFixed(2)}, y ${bb.min.y.toFixed(2)})`); });
  // table props must not overlap each other
  const boxes = ['dial', 'binder', 'phone'].map(id => [id, new THREE.Box3().setFromObject(built[id])]);
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) ok(!boxes[i][1].intersectsBox(boxes[j][1]), `${boxes[i][0]} and ${boxes[j][0]} do not overlap`);
  // design purity across the whole prop set (spec § 14 check 2)
  const root = new THREE.Group(); Object.values(built).forEach(g => root.add(g));
  const snap = () => { const m = new Map(); root.traverse(o => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(mat => m.set(mat, mat.color.getHex())); }); return m; };
  const d0 = Object.assign({}, global.__prmCtx.design), before = snap();
  PrmLib.prmApplyDesign(root, Object.assign({}, d0, { ears: '#abcdef' }));
  const after = snap(); let earsChanged = 0, othersChanged = 0;
  before.forEach((hex, mat) => { if (after.get(mat) !== hex) { if (mat.userData.prmRole === 'ears') earsChanged++; else othersChanged++; } });
  ok(earsChanged >= 4, `changing design.ears repaints the ear materials (${earsChanged})`); eq(othersChanged, 0, 'and nothing else');
  const noRole = []; root.traverse(o => { if (o.isMesh && o.material.userData.prmRole && !['shell', 'plate', 'ears', 'buttons'].includes(o.material.userData.prmRole)) noRole.push(o.name); });
  eq(noRole.length, 0, 'every tagged role is one of the four');
}
```

- [ ] **Step 2: Run the harness** → `0 failed`. If a footprint check fails, fix the **placement** in `PRM_PLACES` or the region, not the builder, unless the builder's origin is not its resting base (then fix that, as Task 5 did with `inner.position.y = -bb.min.y`).

- [ ] **Step 3: Extend `visual-prm.js` — keyboard walk + reduced-motion spin**

Insert before `await browser.close();`:

```js
  // keyboard: Tab into the canvas, arrows walk the order, Enter activates the dial (spin), Escape clears
  const kb = await browser.newPage({ viewport: { width: 1280, height: 720 } }); await kb.goto(url); await settle(kb);
  await kb.focus('#prm-canvas'); await kb.keyboard.press('ArrowRight'); await kb.keyboard.press('ArrowRight'); await kb.waitForTimeout(100);
  ok(await kb.evaluate(() => document.getElementById('prm-focus').style.display === 'block'), 'keyboard: focus ring is drawn');
  await kb.keyboard.press('ArrowRight'); await kb.keyboard.press('Enter'); await kb.waitForTimeout(2600);
  ok(await kb.evaluate(() => /TV mode would open on /.test(document.getElementById('prm-status').textContent)), 'keyboard: Enter on the dial spins and hands a game to TV mode');
  await kb.evaluate(() => window.prmApi.resetView()); await kb.keyboard.press('Escape');
  ok(await kb.evaluate(() => document.getElementById('prm-focus').style.display === 'none'), 'keyboard: Escape clears the ring');
  await kb.close();
  // reduced motion: a dial spin resolves instantly and the camera cuts (no tween)
  const rmp = await ctx.newPage(); await rmp.goto(url); await settle(rmp);
  const before = await rmp.evaluate(() => window.prmDebug.cameraMatrix());
  await rmp.evaluate(() => window.prmApi.activate('dial')); await rmp.waitForTimeout(150);
  const mid = await rmp.evaluate(() => window.prmDebug.cameraMatrix());
  ok(JSON.stringify(before) === JSON.stringify(mid), 'reduced motion: no camera tween in the first 150 ms of a spin');
  await rmp.waitForTimeout(1200);
  ok(await rmp.evaluate(() => /TV mode would open on /.test(document.getElementById('prm-status').textContent)), 'reduced motion: the dial still hands a game to TV mode');
  await rmp.close();
```

- [ ] **Step 4: Run the driver** → all checks pass, screenshots refreshed.

- [ ] **Step 5: Commit** — `git add wip/premium/verify-prm-props.js wip/premium/visual-prm.js wip/premium/shots/ && git commit -m "test(premium): whole-room contracts — registry, footprints, design purity, keyboard, reduced motion" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"`

---

### Task 11: Polish pass, escape-hatch calls, owner screenshots, documentation closure (spec §§ 3.3, 4, 16 step 7, 18)

**Files:**
- Modify: `wip/premium/prm-scene.js` (light/fog/exposure numbers only), `wip/premium/prm-lib.js` (material numbers only), `wip/premium/prm-room.js` / `prm-props.js` (only if an element is swapped for a plate)
- Modify: `docs/superpowers/specs/2026-09-18-premium-lounge-scene-design.md` (Status line), `docs/deferred-work.md` (the Premium bullet), `docs/implementation-notes/shared-implementation-notes.md` (one Design Decision entry)
- Create (only if an escape hatch is taken): `wip/premium/plates/<element>.png`

- [ ] **Step 1: The polish loop.** With the real lighting on, run the visual driver and iterate on numbers only, in this order, one change per run: key light intensity and cone (`SpotLight` args in `prm-scene.js`), `toneMappingExposure`, `Fog` near/far, the hemisphere fill, the env-map plane colours in `prmBuildEnvMap`, material roughness in `prmMaterials`. Judge every run against spec § 3.3 (toy diorama) and the brief's § 12 frozen test. Stop when a further change makes the props read less clearly than the room.

- [ ] **Step 2: Escape-hatch decisions (spec D2).** For each of `couchArm`, `curtain`, the wallpaper and `floorLampShade`, decide from the screenshot: keep procedural, or replace with a plane + PNG. A replacement is a **one-line change in the room builder** (`add('couchArm', new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, transparent: true }), pos)` with the PNG loaded through the same `prmImage` tag) and the PNG goes in `wip/premium/plates/`. Record each decision, and the reason, in the deferred-work bullet (Step 5). Default is **keep procedural** — a plate must earn its place by the screenshot alone.

- [ ] **Step 3: Verify everything still passes** — `node wip/premium/verify-prm-props.js` and the visual driver, both green. Regenerate all screenshots.

- [ ] **Step 4: Owner review pack.** Ensure `wip/premium/shots/` holds `wide-1280.png`, `wide-1920.png`, `portrait-preset-1280.png`, `reduced-1280.png`. Write `wip/premium/OWNER-REVIEW.md` in the shape of `wip/lobby-lab/OWNER-REVIEW.md`: one numbered question per open judgement (the diorama look vs the renders; each escape-hatch call; the dial's drift speed; the ear shapes on TV vs jukebox; whether the phone reads as the Shelves door without a label), each with "Look at:" pointing to a screenshot and an "Answer:" line left blank for the owner.

- [ ] **Step 5: Documentation closure (CLAUDE.md § Documentation Integrity Protocol — the sandbox subset).**
  - Spec: change the Status line to `built as greybox (wip/premium/), owner review pending`.
  - `docs/deferred-work.md`, the Premium bullet under *Lobby redesign*: append the escape-hatch decisions taken (or "none taken") and point at `wip/premium/OWNER-REVIEW.md`.
  - `docs/implementation-notes/shared-implementation-notes.md`, Design Decisions: one entry, *What happened → Root cause → Lesson*, for the env-map finding — the shipped controller has no `scene.environment`, which is why its matte plastic reads flat in the Workshop; `prmBuildEnvMap` is a zero-asset fix that the production round should apply to `ctlBuildScene` too. Add a one-line pointer in `docs/deferred-work.md` under the controller entry.
  - No `code-map.md` entry (sandbox files are not mapped) and no `CLAUDE.md` change (no SW bump; the sandbox ships nothing).

- [ ] **Step 6: Commit** — `git add wip/premium/ docs/superpowers/specs/2026-09-18-premium-lounge-scene-design.md docs/deferred-work.md docs/implementation-notes/shared-implementation-notes.md && git commit -m "feat(premium): polish pass, owner review pack, docs closure" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"`

---

### Task 12: The Claude Design handoff for the 2D chrome (spec § 17)

**Files:**
- Create: `wip/premium/HANDOFF-claude-design.md`

- [ ] **Step 1: Write the handoff** in the shape of the TV-mode handoff (`wip/lobby-lab/OWNER-REVIEW.md` § "handed to Claude Design"), self-contained, no repo paths the tool cannot open. It must contain:
  1. **What it owns:** the heading and keycap, the four-slot switcher's Premium state, the honest card (copy fixed: *"The lounge wants a bigger screen. Cast it, or open it on a laptop — the Shelves are right here."*), the focus ring, the vignette, and the attract screen's typography + sticker-carousel layout as a flat 512×384 composition.
  2. **What it must not touch:** the 3D scene, the composition, the lighting, any prop.
  3. **The palette and type** copied from the brief § 2 (Fredoka, `#2B1B45`, `#FAFAF9`, `#E9408E`, the moulded keycap description).
  4. **The screenshots** `shots/wide-1280.png` and `shots/wide-1920.png` embedded as the canvas it designs over, with the safe areas the HUD may use (top-left heading block, top-right tools, bottom centre for a future keycap) drawn as a paragraph, not an image.
  5. **The return format:** a `.dc.html` beside `TV Mode.dc.html` in `wip/tv-mode-design/`, plus the attract composition as a PNG at 512×384.
  6. **Reduced motion:** any transition it proposes must be `transform`/`opacity` only and ≤ 300 ms (ui-style.md § Motion Standard), and the fade it designs for the push-in is 200 ms.

- [ ] **Step 2: Commit** — `git add wip/premium/HANDOFF-claude-design.md && git commit -m "docs(premium): Claude Design handoff for the lounge's 2D chrome" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"`

---

## Not in this plan (deliberately)

- **Scene B** (portrait) — the `portrait` preset exists so the framing can be judged from `shots/portrait-preset-1280.png`, but the portrait HUD, the eligibility switch and the fade transitions are their own round (spec § 12, `docs/deferred-work.md`).
- **Production wiring** — `src/screens/lobby.html`, the switcher, `sw.js` precache lines, `ctlOpenWorkshop` and `Music` hooks, the controller's atlas/sticker path. Spec § 1.1.
- **The stickerbook feature, achievements, earnable trinkets** — the seams (`openStickerbook`, `unlocked`) are built; the features are not.

