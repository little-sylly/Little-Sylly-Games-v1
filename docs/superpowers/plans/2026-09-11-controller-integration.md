# Controller Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the lobby's 🎮 emoji with the real 3D controller, add a Workshop screen that recolours it from the suite's twenty brand colours, persist the design, and move the Konami code onto its real buttons feeding a rebuilt animated Sylly Gateway.

**Architecture:** Three.js is vendored into `js/lib/` as a third first-party library. The prototype's geometry module becomes `js/lib/controller-body.js` (one copy, `window.ControllerBody`); its scene/app code is extracted into a new `js/controller.js` (prefix `ctl`) owning one WebGL renderer re-parented between the lobby mount and the Workshop stage. Colour is painted into a canvas atlas — never `material.color` — for shell/faceplate/ears, and set directly on the shared materials for buttons. `js/secret-mode.js` keeps every piece of Konami machinery it has; only its *input surface* and its *destination screen* change.

**Tech Stack:** Vanilla ES6 globals, Three.js r128 (vendored, UMD), Canvas 2D atlas textures, `localStorage`, Node for the verification harness. No build step, no modules.

**Spec:** `docs/superpowers/specs/2026-09-11-controller-integration-design.md` — read § 4 (decisions), § 8 (colour model) and § 9 (Konami/gateway) before starting. Read `docs/controller-prototype/controller-handoff-v3.md` § 3 and § 5 before touching rotation, distortion or the press logic.

## Global Constraints

Every task's requirements implicitly include all of these.

- **Australian English** in all UI copy, comments and docs (colour, customise, organise). Metric units only.
- **Never full-read `index.html`** (~515 KB / ~128k tokens). Grep for the id, then `Read` with `offset`/`limit`.
- **Never use the `Edit` tool for a systematic/repeated pass over `index.html`** — it corrupts UTF-8 into mojibake. Single localised edits are fine; anything repetitive goes through a Node script. (Standing project rule; see memory `feedback_indexhtml_encoding`.)
- **Only `transform` and `opacity` may animate.** 300 ms ceiling for non-overlay motion. Never `ease-in`. `filter: blur()` is never animated.
- **A rAF loop is a timer** (`logic-engine.md` § Timer Lifecycle): every handle is cancelled in the quit/✕ handler, in `resetToLobby()`, and on any early transition out of the screen.
- **A rAF loop cannot see the global reduced-motion CSS block** — it needs its own JS check. Reduced motion must not become reduced information: show the end state, skip the journey.
- **localStorage keys are a closed set.** This plan adds exactly one: `sylly_controller`. No others.
- **Touch targets ≥ 44 px** (`min-h-11 min-w-11`).
- **Action buttons carry no emoji** and take one of: brand fill + white ink, neutral stone, or semantic red. The gateway and terminal screens are the documented exception — they use the CRT green-on-black language, not the brand palette.
- **`CACHE_NAME` bumps once, in Task 8.** `PRECACHE_URLS` entries are added as each file lands; the bump at the end is what makes the whole set install. `cache.addAll()` rejects wholesale on a single 404 — every path is verified against the filesystem before the bump.
- **No new harness assertions for presentation.** The harness covers state, palette derivation and the Konami mapping only.

**Prototype source of truth:** `docs/controller-prototype/standalone-stickerless.html` is frozen — read it, never edit it. Line numbers in this plan refer to that file as committed at `b504c7e`.

---

## File Structure

| File | Status | Responsibility |
|------|--------|----------------|
| `js/lib/three.min.js` | Create (vendored) | Three.js r128 UMD. Never edited. |
| `js/lib/controller-body.js` | Create (from prototype) | Geometry only: `window.ControllerBody = { buildBody, buildControls, buildEars, buildShoulder, smoothNormals }`. Pure, takes `THREE` as an argument, no DOM. |
| `js/controller.js` | Create | Everything else: colour state + persistence, palette, the scene/renderer, the atlas painter, pointer handling, the lobby mount, the Workshop, and the Konami adapter. Prefix `ctl`. |
| `tools/verify-controller-state.js` | Create | Node harness: persistence round-trip, total read, palette derivation, Konami mapping. |
| `index.html` | Modify | Lobby mount + header icon row; new `screen-workshop`; `screen-secret-controller` → `screen-secret-gateway`; three `<script>` tags. |
| `js/engine.js` | Modify | `allScreens[]` entries; `resetToLobby()` teardown. |
| `js/secret-mode.js` | Modify | Delete the 7-tap listener and the eight 2D button listeners; retarget `smShowArcadeTile()`; complete the unlock from the keyboard; add the gateway stream; re-point `sm-terminal-back`. |
| `css/styles.css` | Modify | Workshop swatch states and the gateway's static blur. |
| `sw.js` | Modify | Three precache entries + the `CACHE_NAME` bump. |

**Deliberate non-inclusion:** `sticker-surface.js` does not enter this project. Task 3 explains how `redraw()`'s apparent dependency on it is removed in eight lines.

---

## Task 1: Vendor Three.js and de-duplicate the geometry module

**Files:**
- Create: `js/lib/three.min.js` (downloaded)
- Create: `js/lib/controller-body.js`
- Modify: `index.html` (script tags, after line 4003 `js/lib/art.js`)
- Modify: `sw.js` `PRECACHE_URLS` (after `'js/lib/physics.js'`)
- Test: `tools/verify-controller-body.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `window.THREE` (r128) and `window.ControllerBody = { buildBody, buildControls, buildEars, buildShoulder, smoothNormals }`. `buildBody(THREE, opt)` returns a `THREE.BufferGeometry` whose `.userData` carries `{ minx, maxx, miny, maxy, N, M, sdf, heightF, heightB, poly, RIM, FRONT_H, BACK_H, roll }`. `buildControls(THREE, geo)` returns `{ group, pressables }`. `buildEars(THREE, material)` returns an array of meshes.

- [ ] **Step 1: Download the vendored Three.js**

The prototype loads r128 from cdnjs (`standalone-stickerless.html:53`). Pin that exact version.

```bash
cd "d:/Coding Projects/Little-Sylly-Games"
curl -L -o js/lib/three.min.js https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js
```

- [ ] **Step 2: Verify the download is the real, complete library**

```bash
node -e "const s=require('fs').readFileSync('js/lib/three.min.js','utf8'); console.log('bytes',s.length); console.log('rev', (s.match(/REVISION\s*=\s*['\"]([^'\"]+)/)||[])[1]);"
```

Expected: `bytes` around 600000 (± 10%), `rev 128`. A `bytes` figure under 100000 means an error page was saved — delete and retry. **Record the exact byte count**; Task 8 puts it in the SW release note.

- [ ] **Step 3: Create `js/lib/controller-body.js` from the prototype's first script block**

The geometry module is `standalone-stickerless.html` lines **74–745** (from `function buildBody(THREE, opt = {})` down to the line *before* `function StickerSurface(`). Copy it verbatim — do not retype it, and do not "tidy" it; the handoff's § 3 fixes live inside these functions.

```bash
cd "d:/Coding Projects/Little-Sylly-Games"
node -e "
const fs=require('fs');
const src=fs.readFileSync('docs/controller-prototype/standalone-stickerless.html','utf8').split(/\r?\n/);
// lines 74..745 inclusive, 1-indexed
const body=src.slice(73,745).join('\n');
if(!/^function buildBody/.test(body)) throw new Error('slice does not start at buildBody');
if(/StickerSurface/.test(body)) throw new Error('slice reached StickerSurface — wrong end line');
const header=\`// ═══════════════════════════════════════════════════════════════════════════
// controller-body.js — 3D controller GEOMETRY. Nothing else.
//
// Ported verbatim from docs/controller-prototype/standalone-stickerless.html
// (lines 74-745), which is now a FROZEN reference artefact. This file is the
// single copy: the prototype carried the same code duplicated inline, and every
// fix in that session had to be applied twice by hand (handoff v3 § 4.2). That
// is closed — edit here, never there.
//
// Pure: takes THREE as an argument, touches no DOM, reads no globals. That is
// what lets tools/verify-controller-body.js drive it under Node.
//
// ⚠ Read controller-handoff-v3.md § 3 before touching rotation, curvature or
// the ear geometry. Three non-obvious bugs are already fixed in here and the
// sign conventions are not guessable.
// ═══════════════════════════════════════════════════════════════════════════

\`;
const footer=\`

window.ControllerBody = { buildBody, buildControls, buildEars, buildShoulder, smoothNormals };
\`;
fs.writeFileSync('js/lib/controller-body.js', header+body+footer);
console.log('written', (header+body+footer).length, 'bytes');
"
```

- [ ] **Step 4: Write the failing test**

Create `tools/verify-controller-body.js`:

```js
// ═══════════════════════════════════════════════════════════════════════════
// verify-controller-body.js — proves the vendored Three and the de-duplicated
// geometry module both load and produce the geometry the atlas painter assumes.
//
//   node tools/verify-controller-body.js        (exits 1 on any failure)
//
// This is a LOAD and CONTRACT check, not a rendering check. It exists because
// js/controller.js reads geo.userData fields by name — minx/maxx/miny/maxy for
// the atlas map, poly for the faceplate outline — and a silently-renamed field
// would surface as a controller painted with its faceplate in the wrong place,
// which no other check in this project would catch.
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
const CB = global.window.ControllerBody;

console.log('── Three.js vendored build ──');
ok(!!THREE, 'THREE loads under Node');
ok(THREE.REVISION === '128', 'revision is r128, got ' + THREE.REVISION);

console.log('── ControllerBody namespace ──');
['buildBody', 'buildControls', 'buildEars', 'buildShoulder', 'smoothNormals']
  .forEach(fn => ok(typeof CB[fn] === 'function', 'ControllerBody.' + fn + ' is a function'));

console.log('── Geometry contract ──');
const t0 = Date.now();
const geo = CB.buildBody(THREE, {});
const buildMs = Date.now() - t0;
console.log('  buildBody took ' + buildMs + ' ms under Node');

ok(!!geo && !!geo.attributes && !!geo.attributes.position, 'buildBody returns a geometry with positions');
const U = geo.userData;
['minx', 'maxx', 'miny', 'maxy', 'poly', 'RIM', 'FRONT_H', 'BACK_H', 'roll']
  .forEach(k => ok(U[k] !== undefined, 'geo.userData.' + k + ' is present'));
ok(U.maxx > U.minx && U.maxy > U.miny, 'the body bounding box is non-degenerate');
ok(Array.isArray(U.poly) && U.poly.length > 32,
   'geo.userData.poly is a polyline of real length, got ' + (U.poly && U.poly.length));
ok(U.poly.every(p => typeof p.x === 'number' && typeof p.y === 'number'),
   'every poly point is {x, y}');

console.log('── Controls contract ──');
const controls = CB.buildControls(THREE, geo);
ok(!!controls && !!controls.group, 'buildControls returns a group');
ok(Array.isArray(controls.pressables) && controls.pressables.length > 0,
   'buildControls returns a non-empty pressables list');

// The Konami adapter in js/controller.js switches on these exact mesh names.
// Renaming one in body.js would silently stop the code from being enterable.
const names = [];
controls.group.traverse(o => { if (o.name) names.push(o.name); });
['D-pad', 'Face A', 'Face B', 'Start', 'Select']
  .forEach(n => ok(names.indexOf(n) >= 0, 'a mesh named "' + n + '" exists'));

const dpad = [];
controls.group.traverse(o => { if (o.name === 'D-pad') dpad.push(o); });
ok(dpad.length === 1 && dpad[0].userData.rocker === true,
   'the D-pad is flagged userData.rocker (the four cardinals depend on it)');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
```

- [ ] **Step 5: Run it to make sure it fails for the right reason**

Run: `node tools/verify-controller-body.js`

If Steps 1–3 were done correctly it will PASS. To confirm the harness has teeth rather than assuming it, temporarily rename `buildBody` to `buildBodyX` in `js/lib/controller-body.js`'s export line, re-run, and expect `FAIL ControllerBody.buildBody is a function`. Then undo.

- [ ] **Step 6: Add the script tags**

In `index.html`, after line 4003 (`<script src="js/lib/art.js"></script>`), insert:

```html
  <script src="js/lib/three.min.js"></script>
  <script src="js/lib/controller-body.js"></script>
```

This is a single localised insert — the `Edit` tool is fine here.

- [ ] **Step 7: Add the precache entries**

In `sw.js`, in `PRECACHE_URLS`, immediately after `'js/lib/physics.js',`:

```js
  'js/lib/three.min.js',
  'js/lib/controller-body.js',
```

Do **not** bump `CACHE_NAME` yet — Task 8 does that once for the whole release.

- [ ] **Step 8: Verify the app still boots**

Open `index.html` in a browser, open DevTools console. Expected: no errors, and `THREE.REVISION` returns `"128"`, `Object.keys(ControllerBody)` returns the five builders. The lobby is unchanged at this point — nothing renders yet.

- [ ] **Step 9: Commit**

```bash
git add js/lib/three.min.js js/lib/controller-body.js tools/verify-controller-body.js index.html sw.js
git commit -m "feat(controller): vendor Three.js r128 and de-duplicate the geometry module

Three.js becomes the third vendored first-party library, on the same terms as
local Tailwind and the Firebase SDK: a local file in js/lib/, precached, never
fetched from a CDN. The app keeps its zero-runtime-third-party-dependency
property.

body.js now lives once, at js/lib/controller-body.js. The prototype carried it
duplicated inline and every fix had to be applied twice by hand (handoff § 4.2).

tools/verify-controller-body.js pins the geo.userData field names and the five
mesh names the Konami adapter switches on.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2: Colour state, palette derivation and persistence

Pure logic, no DOM, no Three. Built and tested first because the renderer consumes it.

**Files:**
- Create: `js/controller.js`
- Create: `tools/verify-controller-state.js`
- Modify: `index.html` (one script tag, before `js/secret-mode.js` at line 6987)
- Modify: `sw.js` `PRECACHE_URLS`

**Interfaces:**
- Consumes: `GAME_BRAND_HEX` and `LOBBY_COLOUR_ORDER` from `js/engine.js` (read at call time, never copied).
- Produces:
  - `CTL_DEFAULTS` — `{ shell, plate, ears, buttons }` of `#rrggbb` strings.
  - `ctlReadDesign()` → a complete design object, always. Never throws.
  - `ctlWriteDesign(design)` → void. Never throws.
  - `ctlPalette()` → `[{ id, hex }, …]` in hue-walk order.
  - `ctlDesign` — the live in-memory design object.

- [ ] **Step 1: Write the failing test**

Create `tools/verify-controller-state.js`:

```js
// ═══════════════════════════════════════════════════════════════════════════
// verify-controller-state.js — the controller customiser's PURE layer.
//
//   node tools/verify-controller-state.js        (exits 1 on any failure)
//
// Three things live here, and all three are the kind that fail silently:
//
//   1. THE TOTAL READ. ctlReadDesign() runs on the app's FRONT DOOR. Absent,
//      empty, malformed, wrong-typed, wrong-version and hostile input must all
//      resolve to the factory design without throwing — a throw here is a blank
//      lobby, not a missing controller.
//   2. PALETTE DERIVATION. The palette is READ from GAME_BRAND_HEX, never
//      copied, so a 21st game appears for free. This asserts the reading, and
//      that the order matches the lobby's own Colour sort — the two surfaces
//      have to agree about what "next to" means.
//   3. THE KONAMI MAPPING (added in Task 6). The one genuinely
//      correctness-shaped thing in the feature, and cheap to pin.
//
// js/controller.js is evaluated in a vm with a mock localStorage and the two
// engine palette globals injected. Nothing here needs a DOM, Three, or a canvas
// — the file is written so its pure half can be loaded without them.
// ═══════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT = path.join(__dirname, '..');
// CTL_SRC= points the checks at another copy of js/controller.js, so a pre-fix
// version can be driven through them — proving they fail before the fix passes.
const CTL_SRC = process.env.CTL_SRC
  ? path.resolve(process.env.CTL_SRC)
  : path.join(ROOT, 'js/controller.js');
const ENGINE = path.join(ROOT, 'js/engine.js');

let pass = 0, fail = 0;
function ok(cond, label) {
  if (cond) { pass++; }
  else { fail++; console.log('  FAIL  ' + label); }
}

// ── Pull the two palette globals out of engine.js the way verify-mp-configs
//    pulls MP_GAME_CONFIGS: evaluate the declarations alone, not the whole file
//    (which wants a DOM at parse time).
const engineSrc = fs.readFileSync(ENGINE, 'utf8');
function extract(startRe, endToken) {
  const i = engineSrc.search(startRe);
  if (i < 0) throw new Error('could not find ' + startRe + ' in js/engine.js');
  const j = engineSrc.indexOf(endToken, i);
  if (j < 0) throw new Error('could not find the end of ' + startRe);
  return engineSrc.slice(i, j + endToken.length);
}
const paletteSrc = [
  extract(/const GAME_BRAND_HEX = \{/, '};'),
  extract(/function lobbyHexToHSL\(hex\) \{/, '\n}'),
  extract(/const LOBBY_COLOUR_START_ID = /, ';'),
  extract(/const LOBBY_COLOUR_ORDER = \(\(\) => \{/, '})();'),
].join('\n');

// ── A localStorage that behaves like the real one, including throwing.
function makeStore(initial) {
  const map = Object.assign({}, initial);
  return {
    _map: map,
    throwOnGet: false,
    throwOnSet: false,
    getItem(k) { if (this.throwOnGet) throw new Error('SecurityError'); return k in map ? map[k] : null; },
    setItem(k, v) { if (this.throwOnSet) throw new Error('QuotaExceededError'); map[k] = String(v); },
    removeItem(k) { delete map[k]; },
  };
}

function load(storeInitial) {
  const store = makeStore(storeInitial);
  const sandbox = { localStorage: store, console, Math, JSON, Date };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(paletteSrc, sandbox, { filename: 'engine-palette' });
  // Only the pure half of controller.js is evaluated: everything below the
  // RENDERER marker needs THREE and a document, and none of it is under test.
  const full = fs.readFileSync(CTL_SRC, 'utf8');
  const cut  = full.indexOf('// ══ RENDERER ══');
  if (cut < 0) throw new Error('js/controller.js is missing its "// ══ RENDERER ══" marker');
  vm.runInContext(full.slice(0, cut), sandbox, { filename: 'controller-pure' });
  return { sandbox, store };
}

console.log('── 1. Persistence round-trip ──');
{
  const { sandbox, store } = load();
  const wanted = { shell: '#A855F7', plate: '#9333EA', ears: '#14B8A6', buttons: '#18181B' };
  sandbox.ctlWriteDesign(wanted);
  const raw = store._map['sylly_controller'];
  ok(typeof raw === 'string', 'ctlWriteDesign writes the sylly_controller key');
  const parsed = JSON.parse(raw);
  ok(parsed.v === 1, 'the stored payload is versioned v:1');
  ok(Object.keys(parsed).sort().join(',') === 'buttons,ears,plate,shell,v',
     'the payload carries exactly v + the four groups, got ' + Object.keys(parsed).sort().join(','));

  const back = load(store._map).sandbox.ctlReadDesign();
  ok(back.shell === wanted.shell && back.plate === wanted.plate &&
     back.ears === wanted.ears && back.buttons === wanted.buttons,
     'a saved design reads back identically');
}

console.log('── 2. The read is total ──');
{
  const cases = [
    ['absent',              undefined],
    ['empty string',        ''],
    ['malformed JSON',      '{"v":1,'],
    ['JSON null',           'null'],
    ['a bare array',        '[]'],
    ['a bare number',       '7'],
    ['unknown version',     '{"v":99,"shell":"#A855F7"}'],
    ['missing version',     '{"shell":"#A855F7"}'],
    ['wrong-typed fields',  '{"v":1,"shell":42,"plate":null,"ears":{},"buttons":[]}'],
    ['not a hex string',    '{"v":1,"shell":"rebeccapurple","plate":"#GGG","ears":"#12345","buttons":"A855F7"}'],
  ];
  for (const [label, value] of cases) {
    const init = value === undefined ? {} : { sylly_controller: value };
    let d = null, threw = null;
    try { d = load(init).sandbox.ctlReadDesign(); } catch (e) { threw = e; }
    ok(!threw, 'reading ' + label + ' does not throw');
    ok(d && d.shell && d.plate && d.ears && d.buttons,
       'reading ' + label + ' still yields a complete design');
  }

  // A partially valid payload keeps what is valid and defaults the rest — a
  // future field added by the sticker sub-project must not wipe the colours.
  const mixed = load({ sylly_controller: '{"v":1,"shell":"#A855F7","plate":"nope","stickers":[1,2]}' }).sandbox;
  const d = mixed.ctlReadDesign();
  ok(d.shell === '#A855F7', 'a valid field survives alongside an invalid one');
  ok(d.plate === mixed.CTL_DEFAULTS.plate, 'an invalid field falls back to its default');
  ok(d.ears === mixed.CTL_DEFAULTS.ears && d.buttons === mixed.CTL_DEFAULTS.buttons,
     'absent fields fall back to their defaults');

  // localStorage itself can throw (private mode, blocked site data).
  {
    const { sandbox, store } = load();
    store.throwOnGet = true;
    let threw = null, out = null;
    try { out = sandbox.ctlReadDesign(); } catch (e) { threw = e; }
    ok(!threw && out && out.shell, 'a throwing localStorage still yields the factory design');
    store.throwOnGet = false; store.throwOnSet = true;
    threw = null;
    try { sandbox.ctlWriteDesign(sandbox.CTL_DEFAULTS); } catch (e) { threw = e; }
    ok(!threw, 'a throwing localStorage does not break a save');
  }
}

console.log('── 3. The factory design ──');
{
  const { sandbox } = load();
  const D = sandbox.CTL_DEFAULTS;
  ['shell', 'plate', 'ears', 'buttons'].forEach(k =>
    ok(/^#[0-9a-fA-F]{6}$/.test(D[k]), 'CTL_DEFAULTS.' + k + ' is a #rrggbb string'));
  // Reset restores the factory look, which is deliberately NOT one of the
  // twenty — so it must survive a round-trip like any other value. This is why
  // the read validates hex SHAPE and not palette membership.
  const hexes = sandbox.ctlPalette().map(p => p.hex.toUpperCase());
  ok(hexes.indexOf(D.shell.toUpperCase()) < 0,
     'the factory shell colour is deliberately outside the twenty');
  const rt = load({ sylly_controller: JSON.stringify(Object.assign({ v: 1 }, D)) }).sandbox.ctlReadDesign();
  ok(rt.shell === D.shell && rt.buttons === D.buttons,
     'the factory design itself round-trips (an out-of-palette hex is valid input)');
}

console.log('── 4. Palette derivation ──');
{
  const { sandbox } = load();
  const pal = sandbox.ctlPalette();
  ok(Array.isArray(pal), 'ctlPalette returns an array');
  ok(pal.length === Object.keys(sandbox.GAME_BRAND_HEX).length,
     'every GAME_BRAND_HEX entry appears, got ' + pal.length +
     ' of ' + Object.keys(sandbox.GAME_BRAND_HEX).length);
  ok(pal.every(p => p.id && /^#[0-9a-fA-F]{6}$/.test(p.hex)), 'every swatch is {id, hex}');
  ok(new Set(pal.map(p => p.id)).size === pal.length, 'no id appears twice');
  ok(pal.map(p => p.id).join(',') === sandbox.LOBBY_COLOUR_ORDER.join(','),
     'the swatch order is the lobby Colour sort hue walk, exactly');
  ok(pal[0].id === 'btn-flw', 'the walk opens on btn-flw, like the lobby');

  // A 21st game must appear with no customiser edit. Prove it by adding one.
  sandbox.GAME_BRAND_HEX['btn-newgame'] = '#123456';
  const grown = sandbox.ctlPalette();
  ok(grown.length === pal.length + 1, 'a new brand colour appears with no edit here');
  ok(grown.some(p => p.id === 'btn-newgame'), 'the new colour is the one that appeared');
  delete sandbox.GAME_BRAND_HEX['btn-newgame'];
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node tools/verify-controller-state.js`

Expected: FAIL — `Error: ENOENT: no such file or directory, open '…/js/controller.js'`.

- [ ] **Step 3: Write the minimal implementation**

Create `js/controller.js`:

```js
// ═══════════════════════════════════════════════════════════════════════════
// controller.js — the 3D controller: the lobby ornament, the Workshop, and the
// Konami input surface. Prefix: ctl
//
// Depends on: js/lib/three.min.js (THREE), js/lib/controller-body.js
//             (ControllerBody), js/engine.js (GAME_BRAND_HEX,
//             LOBBY_COLOUR_ORDER, showScreen, isMuted, masterVolume,
//             sfxEnabled, getAudioCtx), js/secret-mode.js (smHandleButton —
//             forward reference, called only from a user gesture)
//
// Loaded immediately BEFORE secret-mode.js: it replaces DOM that secret-mode
// binds to at parse time.
//
// The file has two halves, split by the "══ RENDERER ══" marker below. The half
// above it is pure — no DOM, no THREE, no canvas — which is what lets
// tools/verify-controller-state.js evaluate it under Node.
// ═══════════════════════════════════════════════════════════════════════════

// ── Colour state ─────────────────────────────────────────────────────────────
/* The prototype's stand-in palette, kept deliberately: this is the FACTORY
   look, and it is not one of the twenty brand colours. Reset returns here, so
   the factory controller stays reachable and stays distinguishable from any
   design a player could have built out of the palette. */
const CTL_DEFAULTS = { shell: '#a97fd6', plate: '#9670c8', ears: '#a97fd6', buttons: '#8f66c4' };
const CTL_GROUPS = ['shell', 'plate', 'ears', 'buttons'];

const CTL_STORAGE_KEY   = 'sylly_controller';
const CTL_STATE_VERSION = 1;

let ctlDesign = Object.assign({}, CTL_DEFAULTS);

function ctlIsHex(v) { return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v); }

/* Total by construction. This runs on the app's front door, so every failure
   path — absent, malformed, wrong-typed, wrong-version, a localStorage that
   throws outright in private mode — resolves to the factory design rather than
   throwing. A field is validated for hex SHAPE, not for palette membership:
   the factory colours are themselves outside the twenty, and a 21st game's
   colour must be readable before this file has ever heard of it. */
function ctlReadDesign() {
  const out = Object.assign({}, CTL_DEFAULTS);
  try {
    const raw = localStorage.getItem(CTL_STORAGE_KEY);
    if (!raw) return out;
    const o = JSON.parse(raw);
    if (!o || typeof o !== 'object' || Array.isArray(o)) return out;
    if (o.v !== CTL_STATE_VERSION) return out;
    for (const k of CTL_GROUPS) if (ctlIsHex(o[k])) out[k] = o[k];
  } catch (_) { /* fall through to the factory design */ }
  return out;
}

function ctlWriteDesign(design) {
  try {
    localStorage.setItem(CTL_STORAGE_KEY, JSON.stringify({
      v: CTL_STATE_VERSION,
      shell:   design.shell,
      plate:   design.plate,
      ears:    design.ears,
      buttons: design.buttons,
    }));
  } catch (_) { /* storage unavailable — the session still works, it just won't persist */ }
}

// ── Palette ──────────────────────────────────────────────────────────────────
/* READ from GAME_BRAND_HEX, never copied. A 21st game appears in the Workshop
   with zero edits here, and a brand recolour propagates for free.
   Object.values() order carries no meaning, so the swatches follow
   LOBBY_COLOUR_ORDER — the same hue walk the lobby's Colour sort uses, so both
   surfaces agree about what "next to" means. */
function ctlPalette() {
  const src   = (typeof GAME_BRAND_HEX === 'object' && GAME_BRAND_HEX) ? GAME_BRAND_HEX : {};
  const ids   = Object.keys(src);
  const order = (typeof LOBBY_COLOUR_ORDER !== 'undefined' && Array.isArray(LOBBY_COLOUR_ORDER))
    ? LOBBY_COLOUR_ORDER.filter(id => src[id]).concat(ids.filter(id => LOBBY_COLOUR_ORDER.indexOf(id) < 0))
    : ids;
  return order.map(id => ({ id: id, hex: src[id] }));
}

// ══ RENDERER ══ everything below needs THREE, a document and a canvas ═══════
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node tools/verify-controller-state.js`

Expected: PASS, all sections green, `0 failed`.

- [ ] **Step 5: Prove the harness has teeth**

Copy the file, break it, and drive the copy through the same checks:

```bash
cd "d:/Coding Projects/Little-Sylly-Games"
cp js/controller.js /tmp/ctl-broken.js
node -e "const f='/tmp/ctl-broken.js',fs=require('fs');fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace('if (o.v !== CTL_STATE_VERSION) return out;',''))"
CTL_SRC=/tmp/ctl-broken.js node tools/verify-controller-state.js
```

Expected: FAIL on `reading unknown version still yields a complete design` (the wrong-version payload's fields now leak through). Delete the copy.

- [ ] **Step 6: Wire the file in**

`index.html` — insert before line 6987 (`<script src="js/secret-mode.js"></script>`):

```html
  <script src="js/controller.js"></script>
```

`sw.js` `PRECACHE_URLS` — after `'js/lib/controller-body.js',`:

```js
  'js/controller.js',
```

`CLAUDE.md` § Load Order — update the chain to:

```
… → art.js → js/lib/three.min.js → js/lib/controller-body.js → physics.js → …
… → comb.js → js/controller.js → secret-mode.js → app.js
```

- [ ] **Step 7: Commit**

```bash
git add js/controller.js tools/verify-controller-state.js index.html sw.js CLAUDE.md
git commit -m "feat(controller): colour state, palette derivation and persistence

The pure half of js/controller.js: the factory design, a total read that
resolves every malformed input to it without throwing, and a palette READ from
GAME_BRAND_HEX in the lobby's own hue-walk order — so a 21st game appears in the
Workshop with no edit here.

sylly_controller joins isMuted/masterVolume/sylly_nickname as the fourth
permitted localStorage key: a user preference, not game state.

tools/verify-controller-state.js covers the round-trip, ten malformed-input
cases, a localStorage that throws, and the palette contract. Accepts CTL_SRC=.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: The renderer core

Port the prototype's scene and atlas painter into the second half of `js/controller.js`. No mounting yet — this task ends with a controller that can be built and painted, proven from the console.

**Files:**
- Modify: `js/controller.js` (append below the `// ══ RENDERER ══` marker)

**Interfaces:**
- Consumes: `ControllerBody`, `THREE`, `ctlDesign`, `CTL_DEFAULTS` (Task 2).
- Produces:
  - `ctlEnsureBuilt()` → builds the scene once, idempotent; returns `true` when ready.
  - `ctlApplyDesign(design)` → repaints the atlases and sets the button materials.
  - `ctlMount(containerEl)` / `ctlUnmount()` → moves the single renderer canvas.
  - `ctlWake()` / `ctlStop()` → the rAF handle, `ctlRaf`.
  - `ctlReducedMotion()` → bool.
  - `ctlOnPress` — a hook, `null` by default; Task 6 assigns the Konami adapter. Called as `ctlOnPress(meshName, dir)`.

- [ ] **Step 1: Port the scene, lights and rig**

Append to `js/controller.js`. This is `standalone-stickerless.html` lines 1558–1600 with four deliberate changes, each marked:

```js
let ctlBuilt = false;
let ctlScene, ctlCamera, ctlRenderer, ctlRig, ctlBody, ctlControls, ctlEars;
let ctlCanvas, ctlCtx, ctlTex, ctlEarCanvas, ctlEarCtx, ctlEarTex;
let ctlShellMat, ctlEarMat;
const CTL_BUTTON_MATS = new Set();
let ctlMountEl = null;

/* CHANGE FROM THE PROTOTYPE (1): 1024, not 2048.
   The prototype's atlas is sized for stickers rasterised in surface space. A
   colour-only atlas holds a flat fill and one inset polygon, and a 2048 square
   canvas is 16 MB of memory per atlas on a phone for no visible gain. The
   faceplate map is expressed in fractions of ATLAS, so this scales cleanly.
   The sticker sub-project restores 2048 when it needs the resolution. */
const CTL_ATLAS = 1024;
const CTL_EAR_ATLAS = 512;

function ctlReducedMotion() {
  try {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (_) { return false; }
}

function ctlBuildScene() {
  ctlScene = new THREE.Scene();
  ctlScene.background = null;          // CHANGE (2): transparent, so the stone-50 page shows through
  ctlCamera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  ctlRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  ctlRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  // r128 renders washed-out without this: the canvas texture and the output
  // buffer both have to be told they're sRGB, or every colour is lifted.
  ctlRenderer.outputEncoding = THREE.sRGBEncoding;
  ctlRenderer.physicallyCorrectLights = false;
  // ACES rolls the highlights off instead of clipping them, and the exposure
  // lift keeps the mid purples from going muddy once the curve is applied.
  ctlRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  ctlRenderer.toneMappingExposure = 1.05;
  ctlRenderer.shadowMap.enabled = true;
  ctlRenderer.shadowMap.type = THREE.PCFSoftShadowMap;

  /* Three-point rig, the prototype's intensities and colours unchanged. The RIM
     light is a warm pink from BEHIND the body: it lights no surface the camera
     sees head-on, only the rolled edge, which is what separates the silhouette
     from the background and makes the shell read as a solid object. */
  ctlScene.add(new THREE.HemisphereLight(0xFFF6EE, 0x4A3F63, .75));
  const key = new THREE.DirectionalLight(0xFFFFFF, 1.5);
  key.position.set(-3.2, 5.4, 5.2); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1; key.shadow.camera.far = 22;
  key.shadow.camera.left = -7; key.shadow.camera.right = 7;
  key.shadow.camera.top = 7; key.shadow.camera.bottom = -7;
  key.shadow.radius = 3; key.shadow.bias = -.0012;
  ctlScene.add(key);
  const fill = new THREE.DirectionalLight(0xC9B6FF, .5); fill.position.set(4.5, -1.2, 3.5); ctlScene.add(fill);
  const rim  = new THREE.DirectionalLight(0xFF9AD0, .75); rim.position.set(1.6, 2.2, -5); ctlScene.add(rim);

  /* ShadowMaterial is invisible except where something shadows it, so the page
     background still shows through the catcher plane. */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), new THREE.ShadowMaterial({ opacity: .16 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -3.0; floor.receiveShadow = true;
  ctlScene.add(floor);

  ctlRig = new THREE.Group();
  ctlScene.add(ctlRig);
}
```

- [ ] **Step 2: Port the atlases and the faceplate map — without `sticker-surface.js`**

This is the step the whole "no stickers in this sub-project" decision rests on. Read the comment; it is not obvious.

```js
/* ── The faceplate outline, without StickerSurface ──────────────────────────
   The prototype's buildPlateUV() maps the plate polygon through
   SURF.toAtlas(), which LOOKS like a hard dependency on sticker-surface.js.
   It is not. toAtlas is:

       toAtlas(x,y,back) = WARP_D <= 0 || !U.warpXY
                           ? plainAtlas(x,y,back)
                           : plainAtlas(U.warpXY(x,y,back))

   and `warpXY` is never defined — body.js's geo.userData carries
   { minx,maxx,miny,maxy,N,M,sdf,heightF,heightB,poly,RIM,FRONT_H,BACK_H,roll }
   and nothing else. sticker-surface.js only ever READS warpXY. So in the
   shipped prototype toAtlas IS plainAtlas, and plainAtlas is the eight lines
   below, over geo.userData alone. This port is bit-identical to the prototype's
   current output — the prototype's own comment about "the same warped map the
   geometry uses" describes an intent that was never wired up.

   The second apparent dependency, padEdges(), bleeds colour across the atlas
   seam so a sticker wrapping the rim shows no crease. With no stickers the
   atlas is a uniform fill at the rim on both sides, so the bleed is a copy of a
   colour onto itself. Dropped. The sticker sub-project brings both back. */
function ctlPlainAtlas(U, x, y, back) {
  const u = (x - U.minx) / (U.maxx - U.minx);
  const v = (y - U.miny) / (U.maxy - U.miny);
  return [((back ? 1 - u : u) * 0.98 + 0.01) * CTL_ATLAS,
          ((1 - v) * 0.48 + (back ? 0.01 : 0.51)) * CTL_ATLAS];
}

let ctlPlateUV = null;
function ctlBuildPlateUV(geo) {
  const U = geo.userData, P = U.poly;
  const cx = (U.minx + U.maxx) / 2, cy = (U.miny + U.maxy) / 2;
  ctlPlateUV = P.map(p => {
    const x = cx + (p.x - cx) * 0.88, y = cy + (p.y - cy) * 0.87;
    return ctlPlainAtlas(U, x, y, false);
  });
}

function ctlShade(hex, amt) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = v => Math.max(0, Math.min(255, Math.round(v * (1 + amt))));
  return '#' + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1);
}

/* CHANGE FROM THE PROTOTYPE (3): no bump atlas.
   The prototype pairs each colour atlas with a greyscale height atlas so the
   renderer lights a sticker's edge as a raised lip. A bare shell is height zero
   everywhere, so that atlas would be uniformly black — a no-op costing two more
   full-size canvases. bumpMap/bumpScale come off the materials with it. The
   sticker sub-project restores both; the comment block at
   standalone-stickerless.html:1601 explains why it matters then. */
function ctlBuildAtlases() {
  ctlCanvas = document.createElement('canvas');
  ctlCanvas.width = ctlCanvas.height = CTL_ATLAS;
  ctlCtx = ctlCanvas.getContext('2d');
  ctlTex = new THREE.CanvasTexture(ctlCanvas);
  ctlTex.flipY = false; ctlTex.anisotropy = 8; ctlTex.encoding = THREE.sRGBEncoding;

  ctlEarCanvas = document.createElement('canvas');
  ctlEarCanvas.width = ctlEarCanvas.height = CTL_EAR_ATLAS;
  ctlEarCtx = ctlEarCanvas.getContext('2d');
  ctlEarTex = new THREE.CanvasTexture(ctlEarCanvas);
  ctlEarTex.flipY = false; ctlEarTex.anisotropy = 8; ctlEarTex.encoding = THREE.sRGBEncoding;
}

/* Recolouring repaints what the atlas is FILLED with, never material.color: the
   shell material's colour multiplies its whole map, so tinting it would tint
   every sticker placed on it later too. The buttons are the opposite case —
   solid untextured materials sharing no painted surface — so they take
   material.color directly. */
function ctlRedrawShell() {
  ctlCtx.fillStyle = ctlDesign.shell;
  ctlCtx.fillRect(0, 0, CTL_ATLAS, CTL_ATLAS);
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
  ctlTex.needsUpdate = true;
}

function ctlRedrawEars() {
  ctlEarCtx.fillStyle = ctlDesign.ears;
  ctlEarCtx.fillRect(0, 0, CTL_EAR_ATLAS, CTL_EAR_ATLAS);
  ctlEarTex.needsUpdate = true;
}

function ctlSetButtonColour(hex) {
  CTL_BUTTON_MATS.forEach(m => {
    m.color.setHex(parseInt(hex.slice(1), 16)).convertSRGBToLinear();
  });
}

function ctlApplyDesign(design) {
  if (design) ctlDesign = Object.assign({}, ctlDesign, design);
  if (!ctlBuilt) return;
  ctlRedrawShell();
  ctlRedrawEars();
  ctlSetButtonColour(ctlDesign.buttons);
  ctlWake();
}
```

- [ ] **Step 3: Port the build — body, ears, controls**

```js
function ctlEnsureBuilt() {
  if (ctlBuilt) return true;
  if (typeof THREE === 'undefined' || !window.ControllerBody) return false;

  ctlBuildScene();
  ctlBuildAtlases();

  const geo = ControllerBody.buildBody(THREE, {});
  ctlBuildPlateUV(geo);

  ctlShellMat = new THREE.MeshStandardMaterial({ map: ctlTex, roughness: .52, metalness: .06 });
  ctlBody = new THREE.Mesh(geo, ctlShellMat);
  ctlBody.castShadow = true; ctlBody.receiveShadow = true;
  ctlRig.add(ctlBody);

  ctlEarMat = new THREE.MeshStandardMaterial({ map: ctlEarTex, roughness: .52, metalness: .06 });
  ctlEars = ControllerBody.buildEars(THREE, ctlEarMat);
  ctlEars.forEach(m => ctlRig.add(m));

  ctlControls = ControllerBody.buildControls(THREE, geo);
  ctlRig.add(ctlControls.group);

  /* The customisable "buttons" group: both sticks, both stick wells, the whole
     d-pad including its hub, and both shoulders. The four face buttons and
     Select/Start keep their own fixed accent colours and are deliberately NOT
     customisable — same as the prototype. */
  ctlControls.group.traverse(o => {
    if (!o.isMesh || !o.material) return;
    const parentIsDpad = o.parent && o.parent.name === 'D-pad';
    if (o.name === 'L button' || o.name === 'R button' || o.name === 'D-pad' || parentIsDpad
        || / stick$/.test(o.name) || / well$/.test(o.name)) {
      CTL_BUTTON_MATS.add(o.material);
    }
  });

  ctlBuilt = true;
  ctlDesign = ctlReadDesign();
  ctlApplyDesign(null);
  return true;
}
```

- [ ] **Step 4: Port the on-demand render loop**

The prototype runs an unconditional `requestAnimationFrame` forever. That is not acceptable on the app's front door, so the loop starts on demand and stops itself when everything is at rest.

```js
const CTL_TILT_MAX = 0.30;    // radians a stick can lean before it stops
const CTL_TILT_RATE = 0.005;  // radians per pixel dragged
const CTL_ROCK = 0.13;        // radians the D-pad plate leans on a full press

let ctlRotX = 0, ctlRotY = 0, ctlVelY = 0;
let ctlRaf = null;
const _ctlE = new THREE.Euler(), _ctlQ = new THREE.Quaternion();

function ctlApplyTilt(m) {
  const d = m.userData;
  _ctlE.set(d.tiltX || 0, 0, d.tiltZ || 0);
  m.quaternion.copy(d.baseQuat).multiply(_ctlQ.setFromEuler(_ctlE));
}

/* Is anything still moving? The loop reschedules only while this is true, so a
   controller sitting still on the lobby costs nothing. */
function ctlBusy() {
  if (ctlDragging || ctlHeldStick) return true;
  if (Math.abs(ctlVelY) > 0.0005) return true;
  for (const m of ctlControls.pressables) {
    const d = m.userData;
    if ((d.t || 0) > 0.002) return true;
    if (d.tiltX || d.tiltZ || d.vTiltX || d.vTiltZ) return true;
  }
  return false;
}

function ctlWake() { if (ctlRaf === null && ctlBuilt) ctlRaf = requestAnimationFrame(ctlTick); }

// Cancelled in the Workshop ✕, on the Konami success path, and in
// resetToLobby() — logic-engine.md § Timer Lifecycle applies to a rAF handle
// exactly as it does to a setInterval.
function ctlStop() { if (ctlRaf !== null) { cancelAnimationFrame(ctlRaf); ctlRaf = null; } }

function ctlTick() {
  ctlRaf = null;
  if (!ctlDragging) { ctlRotY += ctlVelY; ctlVelY *= 0.94; }
  for (const m of ctlControls.pressables) {
    const t = m.userData.t || 0;
    if (t > 0.002) {
      m.userData.t = t * 0.84;
      m.position.copy(m.userData.rest).addScaledVector(m.userData.axis, -m.userData.press * t);
    } else if (t) { m.userData.t = 0; m.position.copy(m.userData.rest); }
    /* Pre-multiplying the tilt onto baseQuat applies it in the PARENT's frame,
       so the pivot lands on the seated origin — the centre of the cross, where
       the real pivot post sits. Post-multiplying would pivot about the plate's
       own tilted frame and the centre would wander. */
    if (m.userData.rocker && m.userData.baseQuat) {
      const a = CTL_ROCK * (m.userData.t || 0);
      _ctlE.set(-a * (m.userData.dirY || 0), a * (m.userData.dirX || 0), 0);
      m.quaternion.copy(_ctlQ.setFromEuler(_ctlE)).multiply(m.userData.baseQuat);
    }
    /* A released stick eases back on a velocity spring rather than an
       exponential decay, so it overshoots centre slightly and settles — the
       prototype's .34 / .62 constants, which give the sprung-gimbal feel. */
    const d = m.userData;
    if (m !== ctlHeldStick && d.baseQuat && (d.tiltX || d.tiltZ || d.vTiltX || d.vTiltZ)) {
      d.vTiltX = ((d.vTiltX || 0) - (d.tiltX || 0) * 0.34) * 0.62;
      d.vTiltZ = ((d.vTiltZ || 0) - (d.tiltZ || 0) * 0.34) * 0.62;
      d.tiltX = (d.tiltX || 0) + d.vTiltX; d.tiltZ = (d.tiltZ || 0) + d.vTiltZ;
      if (Math.abs(d.tiltX) < 1e-4 && Math.abs(d.tiltZ) < 1e-4 &&
          Math.abs(d.vTiltX) < 1e-4 && Math.abs(d.vTiltZ) < 1e-4) {
        d.tiltX = d.tiltZ = d.vTiltX = d.vTiltZ = 0;
      }
      ctlApplyTilt(m);
    }
  }
  ctlRig.rotation.set(ctlRotX, ctlRotY, 0);
  ctlRenderer.render(ctlScene, ctlCamera);
  if (ctlBusy()) ctlRaf = requestAnimationFrame(ctlTick);
}
```

- [ ] **Step 5: Port mounting and sizing**

One renderer, one WebGL context, re-parented between the two mounts — a second context is both unnecessary (only one is ever visible) and a real risk on phones, which cap live contexts.

```js
function ctlMount(el) {
  if (!el || !ctlEnsureBuilt()) return false;
  ctlMountEl = el;
  el.appendChild(ctlRenderer.domElement);
  ctlResize();
  ctlWake();
  return true;
}

function ctlUnmount() {
  ctlStop();
  if (ctlRenderer && ctlRenderer.domElement && ctlRenderer.domElement.parentElement) {
    ctlRenderer.domElement.parentElement.removeChild(ctlRenderer.domElement);
  }
  ctlMountEl = null;
}

function ctlResize() {
  if (!ctlMountEl || !ctlBuilt) return;
  const w = ctlMountEl.clientWidth, h = ctlMountEl.clientHeight;
  if (!w || !h) return;
  ctlRenderer.setSize(w, h, false);
  ctlCamera.aspect = w / h;
  ctlCamera.position.set(0, 0.4, w / h < 0.9 ? 12 : 9.5);
  ctlCamera.lookAt(0, -0.2, 0);
  ctlCamera.updateProjectionMatrix();
  ctlWake();
}
window.addEventListener('resize', ctlResize);
```

- [ ] **Step 6: Port press and drag**

```js
const CTL_CLICK_MOVE_MAX = 6;    // px — beyond this a pointer-up is a drag, not a tap
const CTL_CLICK_TIME_MAX = 400;  // ms

let ctlDragging = false, ctlHeldStick = null;
let ctlLast = null, ctlStickLast = null, ctlDownPos = null, ctlDownTime = 0;
const _ctlPtr = new THREE.Vector2(), _ctlRay = new THREE.Raycaster();

/* Assigned by the Konami adapter (Task 6). Called as ctlOnPress(name, dir)
   where dir is 'Up'|'Down'|'Left'|'Right' for the d-pad and undefined
   otherwise. Left null on the lobby mount: the lobby's single tap opens the
   Workshop, and the code is only live where the buttons are big enough to
   press deliberately. */
let ctlOnPress = null;

function ctlTryPress(ev) {
  const r = ctlRenderer.domElement.getBoundingClientRect();
  _ctlPtr.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
  _ctlPtr.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
  _ctlRay.setFromCamera(_ctlPtr, ctlCamera);
  const h = _ctlRay.intersectObjects(ctlControls.pressables, true);
  if (!h.length) return false;
  /* Buttons raycast against their own list alone, so nothing stopped a front
     button's ray reaching it through empty space while the controller was
     rotated to show the back. Check the shell along the same ray and refuse
     whenever it sits closer: a real button can't be pressed through the case. */
  const hb = _ctlRay.intersectObject(ctlBody, false);
  if (hb.length && hb[0].distance < h[0].distance - 1e-4) return false;
  let o = h[0].object;
  while (o && !o.userData.rest) o = o.parent;
  if (!o) return false;
  o.userData.t = 1;
  /* One cross, four directions: which arm was pressed comes from WHERE on the
     plate the ray landed. dgeo was rotated so its thickness runs along local Y,
     which maps the shape's own +y to local -z — hence the sign flip. Dominant
     axis wins, so a diagonal still resolves to a single cardinal, the way a
     real pivot forces it to. */
  if (o.userData.rocker) {
    const lp = o.worldToLocal(h[0].point.clone());
    if (Math.abs(lp.x) > Math.abs(lp.z)) { o.userData.dirX = Math.sign(lp.x); o.userData.dirY = 0; }
    else { o.userData.dirY = Math.sign(-lp.z); o.userData.dirX = 0; }
    o.userData.dir = (o.userData.dirY > 0 ? 'Up' : o.userData.dirY < 0 ? 'Down' :
                      o.userData.dirX > 0 ? 'Right' : 'Left');
  }
  if (!o.userData.pressed) {
    o.userData.pressed = true;
    ctlVoiceFor(o.name);
    if (typeof ctlOnPress === 'function') ctlOnPress(o.name, o.userData.dir);
  }
  if (o.name && o.name.indexOf('stick') >= 0) {
    ctlHeldStick = o;
    ctlStickLast = { x: ev.clientX, y: ev.clientY };
    ctlMountEl.setPointerCapture(ev.pointerId);
  }
  ctlWake();
  return true;
}

function ctlBindPointer(el) {
  if (el.dataset.ctlBound === '1') return;
  el.dataset.ctlBound = '1';

  el.addEventListener('pointerdown', ev => {
    ctlDownPos = { x: ev.clientX, y: ev.clientY };
    ctlDownTime = performance.now();
    if (ctlPressEnabled && ctlTryPress(ev)) return;
    ctlDragging = true;
    ctlLast = { x: ev.clientX, y: ev.clientY };
    el.setPointerCapture(ev.pointerId);
    ctlWake();
  });

  el.addEventListener('pointermove', ev => {
    if (ctlHeldStick) {
      const d = ctlHeldStick.userData;
      d.tiltZ = Math.max(-CTL_TILT_MAX, Math.min(CTL_TILT_MAX, (d.tiltZ || 0) - (ev.clientX - ctlStickLast.x) * CTL_TILT_RATE));
      d.tiltX = Math.max(-CTL_TILT_MAX, Math.min(CTL_TILT_MAX, (d.tiltX || 0) + (ev.clientY - ctlStickLast.y) * CTL_TILT_RATE));
      d.vTiltX = d.vTiltZ = 0;
      ctlStickLast = { x: ev.clientX, y: ev.clientY };
      ctlApplyTilt(ctlHeldStick);
      ctlWake();
      return;
    }
    if (!ctlDragging) return;
    const dx = ev.clientX - ctlLast.x, dy = ev.clientY - ctlLast.y;
    ctlRotY += dx * 0.008; ctlRotX += dy * 0.006; ctlVelY = dx * 0.008;
    ctlRotX = Math.max(-1.2, Math.min(1.2, ctlRotX));
    ctlLast = { x: ev.clientX, y: ev.clientY };
    ctlWake();
  });

  el.addEventListener('pointerup', ev => {
    const dx = ev.clientX - (ctlDownPos ? ctlDownPos.x : ev.clientX);
    const dy = ev.clientY - (ctlDownPos ? ctlDownPos.y : ev.clientY);
    const wasTap = ctlDownPos && Math.hypot(dx, dy) < CTL_CLICK_MOVE_MAX
                   && (performance.now() - ctlDownTime) < CTL_CLICK_TIME_MAX;
    const wasStick = !!ctlHeldStick;
    ctlDragging = false; ctlHeldStick = null; ctlDownPos = null;
    /* The spin-down is JS-driven, so the global prefers-reduced-motion CSS
       block cannot reach it (ui-style.md § Motion Standard). Under reduced
       motion the controller settles where it was let go rather than coasting —
       it still shows every face, it just skips the journey. */
    if (ctlReducedMotion()) ctlVelY = 0;
    for (const m of ctlControls.pressables) {
      if (m.userData.pressed) { m.userData.pressed = false; ctlVoiceRelease(); }
    }
    if (wasTap && !wasStick && typeof ctlOnTap === 'function') ctlOnTap(ev);
    ctlWake();
  });
}

let ctlPressEnabled = false;   // the lobby mount leaves the buttons inert
let ctlOnTap = null;           // assigned per mount
```

- [ ] **Step 7: Port the button voices onto the engine's audio**

The prototype opens its own `AudioContext` and ignores mute. Rewire to the engine's context and the standard guard. Port `standalone-stickerless.html` lines 1522–1556 (`noiseBuffer`, `thock`, `blip`, `voiceFor`) with these substitutions:

| Prototype | Replace with |
|-----------|--------------|
| `actx()` | `getAudioCtx()` (engine.js) |
| bare gain values | the same value `* masterVolume` |
| no mute check | `if (isMuted \|\| !sfxEnabled) return;` at the top of `ctlVoiceFor` and `ctlVoiceRelease` |
| `VOICE.release()` | `ctlVoiceRelease()` |

The guard shape is the suite's (`logic-engine.md` § Audio). `playSecretBeep` in `secret-mode.js` is the precedent for a non-engine file carrying its own synth — this is not a new pattern and does not belong in `engine.js`'s catalogue.

- [ ] **Step 8: Verify from the console**

Add a temporary mount point to test with, then remove it. In DevTools on the lobby:

```js
const d = document.createElement('div');
d.style.cssText = 'position:fixed;inset:auto 10px 10px auto;width:300px;height:300px;z-index:9999';
document.body.appendChild(d);
console.time('build'); ctlEnsureBuilt(); console.timeEnd('build');
ctlMount(d); ctlBindPointer(d);
```

Expected: a controller appears and can be dragged to rotate; it coasts briefly and stops; the rAF stops when it settles (confirm with `ctlRaf === null` a second after release). **Record the `build` figure** — Task 4 needs it to decide whether the lobby build must be deferred. Then:

```js
ctlApplyDesign({ shell:'#14B8A6', plate:'#0E7490', ears:'#F59E0B', buttons:'#18181B' });
```

Expected: shell, faceplate, ears and the sticks/d-pad/shoulders all recolour independently; the four face buttons and Select/Start keep their own accents. Remove the test div when done.

- [ ] **Step 9: Check it on a throttled profile**

DevTools → Performance → CPU 4× slowdown, reload, repeat Step 8's build timing. This is the measurement spec § 4.1 defers to implementation. If the build exceeds ~400 ms here, Task 4's deferral is mandatory rather than optional.

- [ ] **Step 10: Commit**

```bash
git add js/controller.js
git commit -m "feat(controller): the renderer core — scene, atlas painter, on-demand loop

Ports the prototype's scene, three-point rig, press logic and stick springs into
js/controller.js. Four deliberate departures, each commented at the code:

- 1024/512 atlases instead of 2048, and no bump atlas at all: a bare shell is
  height zero everywhere, so the height map would be uniformly black. Four
  full-size canvases saved on a phone; the sticker sub-project restores both.
- Transparent scene background, so the stone-50 page shows through.
- One renderer re-parented between mounts rather than one per mount — phones
  cap live WebGL contexts, and only one mount is ever visible.
- The rAF loop starts on demand and stops itself when nothing is moving; the
  prototype's ran forever, which is not acceptable on the app's front door.

sticker-surface.js is NOT needed and is not vendored: the prototype's
SURF.toAtlas resolves to plainAtlas (geo.userData carries no warpXY, which the
warped branch requires), so the faceplate map is eight lines over the geometry's
own bounding box — bit-identical output. padEdges bleeds colour across the atlas
seam and is a no-op on a uniform fill.

Button voices route through getAudioCtx() and respect isMuted/sfxEnabled.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: The lobby mount and the header icon row

**Files:**
- Modify: `index.html` lines 28–30 (the lobby section)
- Modify: `js/controller.js` (append the lobby wiring)
- Modify: `js/secret-mode.js` (`smShowArcadeTile`, ~line 494; delete the 7-tap listener, ~lines 950–966)
- Modify: `js/engine.js` `resetToLobby()`
- Modify: `css/styles.css`

**Interfaces:**
- Consumes: `ctlMount`, `ctlBindPointer`, `ctlApplyDesign`, `ctlReadDesign`, `ctlStop` (Task 3).
- Produces: `ctlMountLobby()`, `ctlTeardown()`. DOM ids `#lobby-controller` and `#lobby-header-icons`.

- [ ] **Step 1: Replace the lobby emoji**

`index.html` — replace line 29:

```html
    <div id="lobby-icon" class="text-6xl" role="img" aria-label="Game controller">🎮</div>
```

with:

```html
    <div id="lobby-controller" class="ctl-lobby-mount" role="button" tabindex="0"
      aria-label="Your controller — tap to customise"></div>
```

Note the departure from the spec's § 6.1 markup: there is no inner `<canvas>`. `WebGLRenderer` creates and owns its own canvas, and Task 3 re-parents that single canvas between the two mounts; supplying a pre-existing one would force a second context.

And replace line 28's speaker button with the icon row:

```html
    <div id="lobby-header-icons" class="absolute top-4 right-4 flex items-center gap-3">
      <button class="btn-open-sound text-xl text-stone-400 active:scale-90 transition-transform duration-100">🔊</button>
    </div>
```

- [ ] **Step 2: Add the mount's CSS**

`css/styles.css`:

```css
/* ── 3D controller: the lobby mount ──────────────────────────────────────────
   Roughly 2.5× the 🎮 emoji's old footprint (text-6xl ≈ 60 px): big enough that
   the ears, d-pad and sticks read at a glance and the object announces itself
   as interactive, small enough that the wordmark below stays the hero. Tune
   against a real render with the visual-check skill — this is a starting point,
   not a measured value. */
.ctl-lobby-mount {
  width: 150px;
  height: 150px;
  margin-inline: auto;
  cursor: grab;
  touch-action: none;        /* a rotate-drag must not scroll the lobby */
}
.ctl-lobby-mount canvas { display: block; width: 100%; height: 100%; }
```

- [ ] **Step 3: Wire the lobby mount**

Append to `js/controller.js`:

```js
// ── The lobby mount ──────────────────────────────────────────────────────────
/* Deferred one frame past first paint. buildBody walks a distance field over a
   grid and is the single most expensive thing this feature does; running it
   inline would stall the app's front door on exactly the devices least able to
   afford it. The mount is empty until it lands — a placeholder that flashes and
   is replaced reads worse than the object simply arriving. */
function ctlMountLobby() {
  const el = document.getElementById('lobby-controller');
  if (!el) return;
  const start = () => {
    if (!ctlEnsureBuilt()) return;
    ctlPressEnabled = false;         // the lobby's buttons are scenery
    ctlOnPress = null;
    ctlOnTap = () => { playLaunch(); ctlOpenWorkshop(); };
    ctlMount(el);
    ctlBindPointer(el);
  };
  if (window.requestIdleCallback) requestIdleCallback(start, { timeout: 1200 });
  else setTimeout(start, 0);
}

// Keyboard equivalence for the tap — the mount is role="button".
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  if (document.activeElement && document.activeElement.id === 'lobby-controller') {
    e.preventDefault();
    playLaunch();
    ctlOpenWorkshop();
  }
});

/* Full teardown. Called from resetToLobby() and from the Workshop's ✕. The rAF
   handle is a timer under logic-engine.md § Timer Lifecycle; the scene itself
   is deliberately kept — rebuilding it is the expensive part and the lobby
   wants it back immediately. */
function ctlTeardown() {
  ctlStop();
  ctlHeldStick = null;
  ctlDragging = false;
  ctlDownPos = null;
  ctlOnPress = null;
  ctlPressEnabled = false;
  if (ctlBuilt) {
    for (const m of ctlControls.pressables) {
      const d = m.userData;
      d.t = 0; d.pressed = false;
      d.tiltX = d.tiltZ = d.vTiltX = d.vTiltZ = 0;
      if (d.rest) m.position.copy(d.rest);
      if (d.baseQuat) m.quaternion.copy(d.baseQuat);
    }
  }
}

document.addEventListener('DOMContentLoaded', ctlMountLobby);
```

- [ ] **Step 4: Retarget the arcade tile**

`js/secret-mode.js` — replace `smShowArcadeTile()` (line ~494) entirely:

```js
/* The 🕹️ sits in the lobby's header icon row, to the LEFT of the speaker —
   prepended, so it reads as the earlier of the two. It used to wrap the lobby's
   🎮 emoji in a flex row and sit beside it; that emoji is now the 3D
   controller, which is the hero of the screen and has no room for a sibling.
   Idempotent, and the sticky unlock across resetToLobby() is unchanged. */
function smShowArcadeTile() {
  if (document.getElementById('sm-arcade-tile')) return;
  const row = document.getElementById('lobby-header-icons');
  if (!row) return;
  const btn = document.createElement('button');
  btn.id = 'sm-arcade-tile';
  btn.className = 'text-xl active:scale-90 transition-transform duration-100 min-h-11 min-w-11';
  btn.setAttribute('aria-label', 'Arcade');
  btn.textContent = '🕹️';
  btn.addEventListener('click', () => { playSecretBeep(660); smOpenArcadeMenu(); });
  row.insertBefore(btn, row.firstChild);
}
```

- [ ] **Step 5: Delete the 7-tap listener**

`js/secret-mode.js` — delete lines ~950–966 entirely: the `smLobbyTapCount` / `smLobbyTapTimer` declarations and the whole `document.getElementById('lobby-icon').addEventListener('click', …)` block.

This is load-bearing beyond tidiness: `#lobby-icon` no longer exists, so leaving it would throw `Cannot read properties of null` at **parse time**, taking `secret-mode.js` down with it and with it the entire Secret Mode.

- [ ] **Step 6: Add the teardown call**

`js/engine.js` `resetToLobby()` — immediately before `showScreen('screen-lobby');` (line ~888):

```js
  if (typeof ctlTeardown === 'function') ctlTeardown();
```

- [ ] **Step 7: Verify**

Reload the lobby. Expected:
1. The 3D controller appears above the wordmark within a moment of load and can be rotated by dragging.
2. Dragging the lobby does not scroll the page.
3. A single tap does nothing yet (Task 5 adds `ctlOpenWorkshop`) — the console shows `ctlOpenWorkshop is not defined`. That is expected at this point.
4. No console error at load.
5. Enter the Konami on the keyboard (↑↑↓↓←→←→ B A Enter): 🕹️ appears **to the left of** 🔊 in the top-right row.
6. Enter a game, then "← Back to the Box": the controller is still there, the 🕹️ is still there, and nothing is spinning.

- [ ] **Step 8: Run the visual check**

Invoke the `visual-check` skill at 390 px. Confirm the controller reads as an object rather than a blob, the wordmark below is still the hero, and the icon row clears the controller. Adjust `.ctl-lobby-mount`'s size from what you see, not from the guess in Step 2.

- [ ] **Step 9: Commit**

```bash
git add index.html css/styles.css js/controller.js js/secret-mode.js js/engine.js
git commit -m "feat(controller): the lobby mount and the header icon row

The 🎮 emoji is replaced by the real controller, painted with the saved design
and rotatable in place. The build is deferred past first paint — buildBody is
the most expensive thing this feature does and the lobby is the app's front
door.

The 7-rapid-tap trigger is deleted. It is not tidying: #lobby-icon no longer
exists, and the listener would have thrown at parse time and taken all of
secret-mode.js with it.

smShowArcadeTile now prepends 🕹️ into #lobby-header-icons, left of 🔊, instead
of wrapping the old emoji. Idempotent and sticky as before.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5: The Workshop screen

**Files:**
- Modify: `index.html` (new `<section id="screen-workshop">` + a how-to overlay, placed immediately after the lobby section)
- Modify: `js/engine.js` (`allScreens[]`)
- Modify: `js/controller.js` (Workshop wiring)
- Modify: `css/styles.css`
- Modify: `ui-style.md` (the `h-screen` whitelist row)

**Interfaces:**
- Consumes: everything from Tasks 2–4.
- Produces: `ctlOpenWorkshop()`, `ctlCloseWorkshop()`, `ctlRenderPanel()`, `ctlSelectColour(group, hex)`.

- [ ] **Step 1: Add the screen markup**

`index.html`, immediately after `</section>` closing `#screen-lobby`. This is the sticky-footer pattern, not the Stack — decision § 4.3, on the same grounds as `screen-cld-floe`: a page-scroll during a rotate-drag would hijack the drag, and the controller has to stay visible while its colours change.

```html
  <!-- ② WORKSHOP — controller customiser. NOT a game: activeGameId stays null. -->
  <section id="screen-workshop" style="display:none"
    class="relative flex flex-col w-full max-w-sm mx-auto h-screen overflow-hidden">

    <!-- HEADER — fixed -->
    <div class="flex items-center justify-between px-5 pt-4 pb-2 flex-shrink-0">
      <h2 class="text-xl font-bold text-stone-800">Workshop</h2>
      <div class="flex items-center gap-2">
        <button id="btn-ctl-how-to" class="text-stone-400 font-bold text-sm min-h-11 min-w-11">[?]</button>
        <button class="btn-open-sound text-xl text-stone-400 active:scale-90 transition-transform duration-100 min-h-11 min-w-11">🔊</button>
        <button id="btn-ctl-exit" class="text-stone-500 font-bold text-xl active:scale-90 transition-transform duration-100 min-h-11 min-w-11">✕</button>
      </div>
    </div>

    <!-- STAGE — fixed, never scrolls -->
    <div class="flex-shrink-0 px-5">
      <div id="ctl-stage" class="ctl-workshop-stage"></div>
      <p class="text-stone-400 text-xs text-center mt-1">Drag to turn it around</p>
    </div>

    <!-- PANEL — scrolls independently -->
    <div id="ctl-panel" class="flex-1 min-h-0 overflow-y-auto px-5 py-4 flex flex-col gap-4"></div>

    <!-- CONTROLS — fixed -->
    <div class="flex-shrink-0 px-5 pb-5 pt-2 flex flex-col gap-2">
      <button id="btn-ctl-save"
        class="min-h-14 w-full rounded-2xl bg-purple-500 hover:bg-purple-600 text-white font-semibold text-lg active:scale-95 transition-all duration-150">Save</button>
      <button id="btn-ctl-reset"
        class="min-h-14 w-full rounded-2xl bg-stone-200 hover:bg-stone-300 text-stone-700 font-semibold text-lg active:scale-95 transition-all duration-150">Reset</button>
    </div>
  </section>
```

And the how-to overlay — the canonical structure, with **no Sylly Mode card**: the Workshop is not a game and that card's rule is scoped to games.

```html
  <div id="ctl-how-to-overlay" style="display:none"
    class="fixed inset-0 bg-black/40 z-[90] flex items-end justify-center">
    <div class="overlay-data-inner settings-slide-up bg-stone-50 w-full max-w-sm rounded-t-3xl flex flex-col">
      <div class="px-5 pt-5 pb-4 border-b border-stone-200 flex-shrink-0">
        <h2 class="text-xl font-bold text-stone-800">The Workshop 🎮</h2>
        <p class="text-xs text-stone-400 mt-1">Make the controller yours.</p>
      </div>
      <div class="overflow-y-auto flex flex-col gap-4 px-5 py-5">
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-purple-500">Step 1</p>
          <p class="font-bold text-stone-800">Have a look around</p>
          <p class="text-stone-500 text-sm">Drag the controller to spin it. Every side is paintable, so check the back before you settle.</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-purple-500">Step 2</p>
          <p class="font-bold text-stone-800">Pick your colours</p>
          <p class="text-stone-500 text-sm">Four parts, twenty colours — one for every game in the box. Tap a swatch and the controller changes straight away.</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-purple-500">Step 3</p>
          <p class="font-bold text-stone-800">Save it, or start again</p>
          <p class="text-stone-500 text-sm"><span class="font-semibold text-stone-700">Save</span> keeps your design for next time. <span class="font-semibold text-stone-700">Reset</span> puts it back to the colours it came in. Leaving without saving changes nothing.</p>
        </div>
        <button id="btn-ctl-howto-close"
          class="min-h-14 w-full rounded-2xl bg-purple-500 hover:bg-purple-600 active:scale-95 text-white text-xl font-semibold transition-all duration-150">Got it</button>
      </div>
    </div>
  </div>
```

- [ ] **Step 2: Register the screen**

`js/engine.js` `allScreens[]` — add after `'screen-lobby', 'screen-who-first',`:

```js
  'screen-workshop',
```

A screen missing from `allScreens[]` is a ghost that never hides.

- [ ] **Step 3: Add the Workshop CSS**

`css/styles.css`:

```css
/* ── 3D controller: the Workshop stage ───────────────────────────────────────
   A fixed stage, per the h-screen whitelist entry: a page-scroll during a
   rotate-drag would hijack the drag, and the preview has to stay visible while
   the colours under it change. */
.ctl-workshop-stage {
  width: 100%;
  height: 38vh;
  min-height: 200px;
  max-height: 340px;
  cursor: grab;
  touch-action: none;
}
.ctl-workshop-stage canvas { display: block; width: 100%; height: 100%; }

/* A swatch is a colour, so it carries no text — the ring and the tick are what
   say "this one". The tick is drawn in both inks so it survives over #FFE500
   and over #18181B alike. */
.ctl-swatch {
  aspect-ratio: 1;
  min-height: 2.75rem;            /* 44 px touch minimum */
  border-radius: 0.5rem;
  border: 2px solid rgba(0, 0, 0, 0.08);
  position: relative;
  transition: transform 120ms ease-out;
}
.ctl-swatch:active { transform: scale(0.92); }
.ctl-swatch-on {
  box-shadow: 0 0 0 3px #fafaf9, 0 0 0 5px #78716c;
}
.ctl-swatch-on::after {
  content: '✓';
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.75);
}
```

- [ ] **Step 4: Wire the Workshop**

Append to `js/controller.js`:

```js
// ── The Workshop ─────────────────────────────────────────────────────────────
const CTL_GROUP_LABELS = {
  shell:   { name: 'Shell',     hint: 'The body, front and back.' },
  plate:   { name: 'Faceplate', hint: 'The panel the sticks sit on.' },
  ears:    { name: 'Ears',      hint: 'The two grips either side.' },
  buttons: { name: 'Buttons',   hint: 'Sticks, D-pad and shoulders.' },
};

/* The design being edited. Unsaved changes are discarded on exit, so the lobby
   always reflects the last SAVED state — which is why this is a copy rather
   than a live pointer at ctlDesign. */
let ctlDraft = null;

function ctlOpenWorkshop() {
  ctlDraft = Object.assign({}, ctlReadDesign());
  showScreen('screen-workshop');
  const stage = document.getElementById('ctl-stage');
  if (!ctlEnsureBuilt()) return;
  ctlPressEnabled = true;          // the Konami is live HERE and nowhere else
  // Task 6 defines ctlKonamiPress. The typeof guard is what keeps this task
  // independently shippable: between the two commits the Workshop opens and the
  // buttons press, they just feed no code yet.
  ctlOnPress = (typeof ctlKonamiPress === 'function') ? ctlKonamiPress : null;
  ctlOnTap = null;
  ctlApplyDesign(ctlDraft);
  ctlMount(stage);
  ctlBindPointer(stage);
  ctlRenderPanel();
}

function ctlCloseWorkshop() {
  ctlTeardown();
  ctlDraft = null;
  ctlDesign = ctlReadDesign();     // discard unsaved changes
  showScreen('screen-lobby');
  ctlMountLobby();
}

function ctlRenderPanel() {
  const panel = document.getElementById('ctl-panel');
  if (!panel) return;
  panel.innerHTML = '';
  const palette = ctlPalette();
  for (const group of CTL_GROUPS) {
    const meta = CTL_GROUP_LABELS[group];
    const card = document.createElement('div');
    card.className = 'bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3';

    const head = document.createElement('div');
    const title = document.createElement('p');
    title.className = 'text-stone-800 font-semibold';
    title.textContent = meta.name;
    const hint = document.createElement('p');
    hint.className = 'text-stone-400 text-sm mt-0.5';
    hint.textContent = meta.hint;
    head.appendChild(title); head.appendChild(hint);
    card.appendChild(head);

    /* Six columns: 6 × 44 px + 5 × 6 px of gap = 294 px, inside the 312 px a
       max-w-sm card leaves once its own padding is taken. Twenty swatches land
       as 6/6/6/2. */
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-6 gap-1.5';
    for (const sw of palette) {
      const b = document.createElement('button');
      b.className = 'ctl-swatch' + (ctlDraft[group].toUpperCase() === sw.hex.toUpperCase() ? ' ctl-swatch-on' : '');
      b.style.backgroundColor = sw.hex;
      b.setAttribute('aria-label', meta.name + ' — ' + sw.hex);
      b.addEventListener('click', () => ctlSelectColour(group, sw.hex));
      grid.appendChild(b);
    }
    card.appendChild(grid);
    panel.appendChild(card);
  }
}

function ctlSelectColour(group, hex) {
  playPillClick();
  ctlDraft[group] = hex;
  ctlApplyDesign(ctlDraft);
  ctlRenderPanel();
}

document.getElementById('btn-ctl-save').addEventListener('click', () => {
  playDone();
  ctlWriteDesign(ctlDraft);
  ctlDesign = Object.assign({}, ctlDraft);
  ctlCloseWorkshop();
});

document.getElementById('btn-ctl-reset').addEventListener('click', () => {
  playWhoosh();
  ctlDraft = Object.assign({}, CTL_DEFAULTS);
  ctlApplyDesign(ctlDraft);
  ctlRenderPanel();
});

/* No quit-confirm overlay: nothing is mid-round, and an unsaved colour change
   is two taps from being remade. */
document.getElementById('btn-ctl-exit').addEventListener('click', () => {
  playExit();
  ctlCloseWorkshop();
});

document.getElementById('btn-ctl-how-to').addEventListener('click', () => {
  const ov = document.getElementById('ctl-how-to-overlay');
  ov.querySelector('.overlay-data-inner').scrollTop = 0;
  ov.style.display = 'flex';
});
document.getElementById('btn-ctl-howto-close').addEventListener('click', () => {
  playDone();
  document.getElementById('ctl-how-to-overlay').style.display = 'none';
});
```

- [ ] **Step 5: Add the overlay to teardown**

`js/engine.js` `resetToLobby()` — add `'ctl-how-to-overlay'` to the existing overlay-hiding list (the array at line ~876).

- [ ] **Step 6: Record the whitelist exception**

`ui-style.md` § "Legacy `h-screen` whitelist" — add a row:

```markdown
| `screen-workshop` | The 3D controller stage. A page-scroll during a rotate-drag would hijack the drag (the same ground as `screen-cld-floe`), and the preview must stay visible while the colour panel under it is scrolled and tapped — the choice depends on what the Stage is showing. |
```

- [ ] **Step 7: Verify**

1. Tap the lobby controller → the Workshop opens with the controller on its stage.
2. Drag on the stage → it rotates; the panel does not scroll under the drag.
3. Scroll the panel → the stage stays put, the header and buttons stay put.
4. Tap a Shell swatch → the shell recolours immediately; the tick moves.
5. Recolour all four groups; confirm the face buttons and Select/Start keep their own accents.
6. **Save** → back to the lobby, showing the new design. Reload the page → still there.
7. Reopen, change a colour, press **✕** → back to the lobby with the *saved* design, not the changed one.
8. **Reset** → the factory purple returns. Save, reload, confirm.
9. `[?]` opens the how-to; the backdrop tap and "Got it" both close it.
10. 🔊 opens the sound overlay on neutral stone (not a brand colour) — `activeGameId` stayed `null`.
11. Lobby music keeps playing throughout; it does not restart on entering the Workshop.

- [ ] **Step 8: Run the visual check**

Invoke `visual-check` at 390 px: band geometry, the stage never scrolling, the panel scrolling, swatches ≥ 44 px, and the two controls matching in size and weight.

- [ ] **Step 9: Commit**

```bash
git add index.html css/styles.css js/controller.js js/engine.js ui-style.md
git commit -m "feat(controller): the Workshop screen

A four-band fixed-stage screen: header, the 3D preview, a scrolling panel of
four colour cards, and Save/Reset. Twenty swatches per card, read live from
GAME_BRAND_HEX in the lobby's hue-walk order, so a 21st game appears with no
edit here.

screen-workshop joins the h-screen whitelist with its reason recorded, on the
same grounds as screen-cld-floe: a page-scroll during a rotate-drag would hijack
the drag, and the preview has to stay visible while the colours change.

Not a game — activeGameId stays null, so the lobby music keeps playing and the
sound overlay stays neutral. No Sylly Mode card in its how-to: that rule is
scoped to games.

Unsaved changes are discarded on exit; the lobby always shows the last saved
design.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 6: The Konami adapter

**Files:**
- Modify: `js/controller.js` (the adapter)
- Modify: `tools/verify-controller-state.js` (a fifth section)

**Interfaces:**
- Consumes: `ctlOnPress` (Task 3), `smHandleButton` (`secret-mode.js`, forward reference).
- Produces: `ctlKonamiCode(name, dir)` → `'U'|'D'|'L'|'R'|'A'|'B'|'S'|null`; `ctlKonamiPress(name, dir)`.

- [ ] **Step 1: Write the failing test**

Append a fifth section to `tools/verify-controller-state.js`, before the summary lines:

```js
console.log('── 5. The Konami adapter ──');
{
  const { sandbox } = load();
  const code = sandbox.ctlKonamiCode;

  // The four cardinals come off ONE mesh — the d-pad is a single rocker plate,
  // and tryPress resolves which arm was hit from the raycast point.
  ok(code('D-pad', 'Up')    === 'U', 'D-pad Up maps to U');
  ok(code('D-pad', 'Down')  === 'D', 'D-pad Down maps to D');
  ok(code('D-pad', 'Left')  === 'L', 'D-pad Left maps to L');
  ok(code('D-pad', 'Right') === 'R', 'D-pad Right maps to R');
  ok(code('Face A') === 'A', 'Face A maps to A');
  ok(code('Face B') === 'B', 'Face B maps to B');
  ok(code('Start')  === 'S', 'Start maps to S');

  // Everything else presses and sounds normally but feeds no code.
  ['Face X', 'Face Y', 'Select', 'L button', 'R button',
   'Left stick', 'Right stick', 'Left well', 'Right well']
    .forEach(n => ok(code(n) === null, n + ' contributes no code'));
  ok(code('D-pad', undefined) === null, 'a d-pad press with no resolved direction contributes nothing');
  ok(code('D-pad', 'Diagonal') === null, 'an unrecognised direction contributes nothing');

  // The whole sequence, in order, is exactly what SM_KONAMI expects.
  const presses = [
    ['D-pad', 'Up'], ['D-pad', 'Up'], ['D-pad', 'Down'], ['D-pad', 'Down'],
    ['D-pad', 'Left'], ['D-pad', 'Right'], ['D-pad', 'Left'], ['D-pad', 'Right'],
    ['Face B'], ['Face A'], ['Start'],
  ];
  const got = presses.map(p => code(p[0], p[1])).join('');
  ok(got === 'UUDDLRLRBAS', 'the full press order produces U U D D L R L R B A S, got ' + got);

  // A stray unmapped press mid-sequence must not break it — it contributes
  // nothing rather than a wrong code, so the buffer is untouched.
  const withNoise = [
    ['D-pad', 'Up'], ['Face X'], ['D-pad', 'Up'], ['Select'], ['D-pad', 'Down'], ['D-pad', 'Down'],
    ['D-pad', 'Left'], ['D-pad', 'Right'], ['Left stick'], ['D-pad', 'Left'], ['D-pad', 'Right'],
    ['Face B'], ['Face A'], ['Start'],
  ];
  const noisy = withNoise.map(p => code(p[0], p[1])).filter(c => c !== null).join('');
  ok(noisy === 'UUDDLRLRBAS', 'unmapped presses interleaved through the sequence change nothing');
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node tools/verify-controller-state.js`

Expected: FAIL — `TypeError: code is not a function` (`ctlKonamiCode` does not exist yet).

- [ ] **Step 3: Move the adapter above the RENDERER marker and implement it**

`ctlKonamiCode` is pure, so it belongs in the half the harness can load. Insert it in `js/controller.js` immediately **before** the `// ══ RENDERER ══` line:

```js
// ── Konami adapter ───────────────────────────────────────────────────────────
/* The Konami sequence is entered on the REAL buttons. This is a mapping and
   nothing else: the buffer, the retro beeps, the arcade unlock and the hand-off
   to the terminal all stay in secret-mode.js, untouched.
   It is this small only because the prototype already resolves which d-pad arm
   was pressed from the raycast hit point — one rocker mesh, four cardinals,
   with a diagonal forced to a single axis the way a real pivot forces it.
   No geometry and no press logic changes. */
const CTL_KONAMI_DIRS = { Up: 'U', Down: 'D', Left: 'L', Right: 'R' };
const CTL_KONAMI_BUTTONS = { 'Face A': 'A', 'Face B': 'B', 'Start': 'S' };

function ctlKonamiCode(name, dir) {
  if (name === 'D-pad') return CTL_KONAMI_DIRS[dir] || null;
  return CTL_KONAMI_BUTTONS[name] || null;
}
```

And below the marker, with the rest of the renderer wiring:

```js
/* Live on the Workshop screen only. The lobby's single tap opens the Workshop;
   the Workshop is where the buttons are big enough to press deliberately.
   No progress indicator — it is a secret, and the beeps are the feedback. */
function ctlKonamiPress(name, dir) {
  const code = ctlKonamiCode(name, dir);
  if (!code) return;
  if (typeof smHandleButton === 'function') smHandleButton(code);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node tools/verify-controller-state.js`

Expected: PASS, all five sections, `0 failed`.

- [ ] **Step 5: Verify in the browser**

Open the Workshop and press, on the 3D controller: up, up, down, down, left, right, left, right, B, A, Start.

Expected: each press sounds its button voice **and** the retro beep, then the victory arpeggio fires and the screen changes. At this point it navigates to the old `screen-secret-controller` — Task 7 replaces that. Also confirm pressing X, Y, Select and the shoulders sounds normally and does not disturb a sequence in progress.

- [ ] **Step 6: Commit**

```bash
git add js/controller.js tools/verify-controller-state.js
git commit -m "feat(controller): enter the Konami sequence on the real buttons

A mapping and nothing else — the buffer, the beeps, the arcade unlock and the
terminal hand-off all stay in secret-mode.js untouched. It is this small only
because the prototype already resolves which d-pad arm was pressed from the
raycast hit point, forcing a diagonal to one cardinal the way a real pivot does.

Live on the Workshop only: the lobby's tap opens the Workshop, and that is where
the buttons are big enough to press deliberately. Unmapped buttons press and
sound but feed no code.

The harness pins the mapping, the full press order, and that interleaved
unmapped presses change nothing.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 7: The Sylly Gateway

**Files:**
- Modify: `index.html` lines 2110, 2115–2183 (`screen-secret-controller` → `screen-secret-gateway`)
- Modify: `js/engine.js` (`allScreens[]`)
- Modify: `js/secret-mode.js` (the success path, the eight button listeners, the exit handler, the keyboard path, `sm-terminal-back`)
- Modify: `css/styles.css`

**Interfaces:**
- Consumes: `smHandleButton`'s success path, `smTypewriterTimers`, `smOpenTerminal`.
- Produces: `smOpenGateway()`, `smGatewayStream()`, `smGatewayFinish()`. Screen id `screen-secret-gateway`.

- [ ] **Step 1: Replace the screen markup**

`index.html` — replace the whole `<section id="screen-secret-controller">` block (lines 2115–2183) with:

```html
  <section id="screen-secret-gateway" style="display:none"
    class="relative flex flex-col items-center justify-center w-full min-h-screen bg-black px-4 py-8 font-mono">

    <!-- Exit -->
    <button id="sm-btn-exit"
      class="absolute top-4 right-4 text-green-400 text-xl active:scale-90 transition-transform duration-100 min-h-11 min-w-11">✕</button>

    <!-- Header -->
    <div class="text-green-400 text-center mb-5 select-none">
      <div class="text-xs tracking-widest mb-1 opacity-60">SYLLY-OS v1.0 // CLASSIFIED</div>
      <div class="text-lg font-bold tracking-widest">[ SYLLY GATEWAY ]</div>
    </div>

    <!-- The loadout stream -->
    <div id="sm-gateway-log"
      class="sm-gateway-blur w-full max-w-sm h-64 overflow-hidden text-green-400/90 text-[10px] leading-[1.35] tracking-wide select-none"></div>

    <!-- Resolution + tap-to-continue. Waits for a tap rather than auto-advancing:
         a slow phone must not let the payoff scroll past before it is read. -->
    <div id="sm-gateway-granted" style="display:none"
      class="mt-5 flex flex-col items-center gap-3">
      <div class="text-green-400 text-base font-bold tracking-[0.2em]">[ ACCESS GRANTED ]</div>
      <button id="sm-gateway-continue"
        class="text-xs font-mono px-4 py-3 border-2 border-green-400 text-green-400 rounded active:scale-95 transition-transform duration-75 min-h-11">TAP TO CONTINUE</button>
    </div>
  </section>
```

Also update the screen-inventory comment at line 2110: `#screen-secret-controller` → `#screen-secret-gateway`.

**Use the `Edit` tool for this one block only.** It is a single contiguous replacement, not a systematic pass — the encoding rule bites on repeated edits across the file.

- [ ] **Step 2: Add the static blur**

`css/styles.css`:

```css
/* ── Sylly Gateway loadout ───────────────────────────────────────────────────
   The blur is STATIC and stays static. `filter` is neither transform nor
   opacity, so animating it would break the Motion Standard and janks on a
   mid-range phone. It is here to make the stream read as something executing
   rather than something to be read — the legibility loss is the point. */
.sm-gateway-blur {
  filter: blur(0.7px);
  white-space: pre;
  word-break: break-all;
}
```

- [ ] **Step 3: Rename the screen registration**

`js/engine.js` `allScreens[]` — `'screen-secret-controller',` → `'screen-secret-gateway',`.

- [ ] **Step 4: Write the gateway**

`js/secret-mode.js` — add above the Terminal section:

```js
// ═══════════════════════════════════════════════════════════════════════════
// ── The Sylly Gateway — the loadout between the code and the terminal ─────
// ═══════════════════════════════════════════════════════════════════════════

/* Plausible-looking nonsense. It is meant to be scanned, not read — the blur
   is doing half the work — so the shapes matter more than the words: hex
   addresses, symbol names, sizes, the vocabulary of something linking. */
const SM_GATEWAY_TOKENS = [
  'SEG', 'REL', 'PLT', 'GOT', 'BSS', 'TEXT', 'RODATA', 'SYM', 'DWARF', 'VMA',
  'sylly_core', 'pack_registry', 'arcade_rom', 'vault_key', 'brand_lut',
  'atlas_blit', 'shader_cache', 'audio_graph', 'wake_lock', 'sw_scope',
];
const SM_GATEWAY_VERBS = [
  'LINK', 'MAP', 'PATCH', 'VERIFY', 'INFLATE', 'SEED', 'BIND', 'RESOLVE', 'MOUNT', 'ARM',
];

function smGatewayHex(n) {
  let s = '';
  for (let i = 0; i < n; i++) s += '0123456789ABCDEF'[Math.floor(Math.random() * 16)];
  return s;
}

function smGatewayLine() {
  const v = SM_GATEWAY_VERBS[Math.floor(Math.random() * SM_GATEWAY_VERBS.length)];
  const t = SM_GATEWAY_TOKENS[Math.floor(Math.random() * SM_GATEWAY_TOKENS.length)];
  return '0x' + smGatewayHex(8) + '  ' + v.padEnd(8) + t.padEnd(16) +
         '+' + smGatewayHex(4) + '  ' + (1 + Math.floor(Math.random() * 4096)) + 'b  OK';
}

const SM_GATEWAY_LINES = 26;
const SM_GATEWAY_GAP   = 55;   // ms — ~1.4 s of stream, then the payoff

function smOpenGateway() {
  /* The Workshop's rAF is a timer and this is an early transition out of that
     screen — logic-engine.md § Timer Lifecycle's third required clear site. */
  if (typeof ctlTeardown === 'function') ctlTeardown();
  showScreen('screen-secret-gateway');
  smGatewayStream();
}

function smGatewayStream() {
  smTypewriterTimers.forEach(clearTimeout);
  smTypewriterTimers = [];
  const log = document.getElementById('sm-gateway-log');
  const granted = document.getElementById('sm-gateway-granted');
  if (!log || !granted) return;
  log.innerHTML = '';
  granted.style.display = 'none';

  /* The stream is driven by timers, and the global prefers-reduced-motion CSS
     block only zeroes animation/transition durations — it cannot reach a
     setTimeout writing text. Under reduced motion the screen renders its
     finished state at once: the whole loadout is there to read, and the payoff
     is there to tap. Reduced motion, not reduced information. */
  if (smReducedMotion()) {
    const all = [];
    for (let i = 0; i < SM_GATEWAY_LINES; i++) all.push(smGatewayLine());
    log.textContent = all.join('\n');
    smGatewayFinish();
    return;
  }

  for (let i = 0; i < SM_GATEWAY_LINES; i++) {
    const t = setTimeout(() => {
      const p = document.createElement('div');
      p.textContent = smGatewayLine();
      log.appendChild(p);
      log.scrollTop = log.scrollHeight;
      if (i % 4 === 0) playSecretBeep(180 + i * 12);
    }, i * SM_GATEWAY_GAP);
    smTypewriterTimers.push(t);
  }
  const done = setTimeout(smGatewayFinish, SM_GATEWAY_LINES * SM_GATEWAY_GAP + 120);
  smTypewriterTimers.push(done);
}

function smGatewayFinish() {
  const granted = document.getElementById('sm-gateway-granted');
  if (granted) granted.style.display = 'flex';
  playSecretBeep(523);
  setTimeout(() => playSecretBeep(659), 100);
  setTimeout(() => playSecretBeep(784), 200);
}

function smReducedMotion() {
  try {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (_) { return false; }
}
```

- [ ] **Step 5: Rewrite the success path**

`js/secret-mode.js` `smHandleButton()` — replace the tail of the match branch (the two `setTimeout`s writing `sm-controller-status` and opening the terminal, lines ~245–250) with:

```js
    smOpenGateway();
```

Keep everything above it — the buffer clear, `smArcadeUnlocked = true`, `smShowArcadeTile()`. Remove only the three victory-arpeggio beeps there, since `smGatewayFinish()` now sounds them at the payoff instead of at the press.

- [ ] **Step 6: Delete the 2D button listeners and fix the exit handler**

`js/secret-mode.js` lines ~934–948 — delete all seven `sm-btn-up/down/left/right/b/a/start` listeners. Those elements no longer exist; left in place they throw at parse time.

Replace the exit handler with:

```js
document.getElementById('sm-btn-exit').addEventListener('click', () => {
  smTypewriterTimers.forEach(clearTimeout);
  smTypewriterTimers = [];
  smKonamiBuffer = [];
  smUpdateProgress();
  showScreen('screen-lobby');
  if (typeof ctlMountLobby === 'function') ctlMountLobby();
});
```

And wire tap-to-continue:

```js
document.getElementById('sm-gateway-continue').addEventListener('click', () => {
  smTypewriterTimers.forEach(clearTimeout);
  smTypewriterTimers = [];
  playSecretBeep(880);
  smOpenTerminal();
});
```

`smUpdateProgress()` already returns early when `#sm-konami-progress` is absent, so the buffer machinery needs no change at all.

- [ ] **Step 7: Complete the unlock from the keyboard**

`js/secret-mode.js`, the keyboard handler (~line 970). Change the guard's screen id and make the success path run the same path the controller does:

```js
  if (document.getElementById('screen-secret-gateway').style.display !== 'none') return;
```

and in the match branch, replace `showScreen('screen-secret-controller');` with:

```js
    smArcadeUnlocked = true;
    smShowArcadeTile();
    smOpenGateway();
```

Today the keyboard merely opens a screen where the sequence must be entered a second time. The Asherplane guard above it is unchanged.

- [ ] **Step 8: Re-point the Terminal's back button**

`js/secret-mode.js` line ~918. Replace the handler with:

```js
/* ← BACK returns to the LOBBY, not to the gateway. The gateway is now a
   one-shot boot animation: sending the player back there would either replay
   the whole hack sequence at them or strand them on a screen already reading
   ACCESS GRANTED with nothing to do but tap forward again.
   What that costs is worth being precise about. smArcadeUnlocked is sticky, so
   🕹️ stays in the lobby header for the rest of the session — but it calls
   smOpenArcadeMenu(), which lists CABINETS only (and skips smLoadPacks, so the
   arcade still opens on a cold offline start). The arcade is therefore one tap
   away; the pack/skin terminal costs a fresh Konami. Confirmed with the owner
   at spec review. */
document.getElementById('sm-terminal-back').addEventListener('click', () => {
  smTypewriterTimers.forEach(clearTimeout);
  smTypewriterTimers = [];
  smSelectedExpansion = null;
  smSelectedGame      = null;
  showScreen('screen-lobby');
  if (typeof ctlMountLobby === 'function') ctlMountLobby();
});
```

The two `sm-controller-status` writes are dropped — that element no longer exists.

- [ ] **Step 9: Sweep the remaining references**

```bash
cd "d:/Coding Projects/Little-Sylly-Games"
grep -rn "screen-secret-controller\|sm-controller-status\|sm-konami-progress\|lobby-icon" \
  --include=*.js --include=*.html --include=*.css .
```

Expected: **no hits in `index.html`, `js/engine.js` or `js/secret-mode.js`.** Hits in `docs/` are Task 8's job. Any hit in code is a parse-time crash waiting to happen.

- [ ] **Step 10: Verify the whole path**

1. Lobby → tap the controller → Workshop → press the sequence on the 3D buttons.
2. The gateway opens; lines stream in, lightly blurred, with a low ticking beep.
3. It resolves to `[ ACCESS GRANTED ]` with a TAP TO CONTINUE button — and **waits**.
4. Tap → the Secret Terminal, packs and skins listed as before.
5. ← BACK → the lobby, with the controller mounted and rotatable.
6. 🕹️ → the arcade cabinets.
7. Enter the gateway again and press ✕ mid-stream → the lobby, nothing left ticking (check the console: no stray beeps).
8. Desktop keyboard ↑↑↓↓←→←→ B A Enter from the lobby → straight to the gateway, 🕹️ appears. Confirm it does **not** fire while the gateway is showing, and does not fire inside Asherplane.
9. DevTools → Rendering → emulate `prefers-reduced-motion: reduce`. Re-enter: the full loadout and the tap affordance appear at once, nothing travels, nothing is lost.
10. Start a game, quit via "← Back to the Box": no stray timers, the controller is back.

- [ ] **Step 11: Commit**

```bash
git add index.html css/styles.css js/engine.js js/secret-mode.js
git commit -m "feat(secret): rebuild the gateway as an animated loadout

screen-secret-controller becomes screen-secret-gateway — the element is no
longer a controller, and leaving a misleading id behind is how sylly-signals and
btn-dstw happened. The 2D d-pad, face buttons, SEL/STA pair, progress dots and
their eight listeners are deleted; the Konami is entered on the real controller
now.

The gateway streams plausible link-loader gibberish under a STATIC blur (filter
is neither transform nor opacity, so it is never animated), resolves to ACCESS
GRANTED, and WAITS for a tap — a slow phone must not let the payoff scroll past
before it is read. The stream is a timer, so it carries its own
prefers-reduced-motion check: reduced motion shows the finished state at once
rather than showing less.

The keyboard Konami now completes the unlock instead of opening a screen that
asks for the sequence a second time.

sm-terminal-back returns to the lobby. Owner-confirmed at spec review, with the
cost stated at the code: 🕹️ reaches the arcade cabinets only, so re-entering the
pack/skin terminal is what costs a fresh sequence.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 8: PWA, verification sweep and documentation closure

**Files:**
- Modify: `sw.js` (`CACHE_NAME`)
- Modify: `docs/code-map.md`, `CLAUDE.md`, `docs/sw-changelog.md`, `logic-engine.md`, `ui-style.md`, `docs/design-brief-lobby.md`, `docs/controller-prototype/controller-handoff-v3.md`
- Create/modify: `docs/implementation-notes/shared-implementation-notes.md`, `docs/decision-log.md`

- [ ] **Step 1: Verify every precached path exists**

`cache.addAll()` rejects wholesale if a single URL 404s — one wrong path means every install fails silently and the app has no offline mode at all. (Not hypothetical: `assets/logo.png` was found deleted while still listed, during the design session for this very feature.)

```bash
cd "d:/Coding Projects/Little-Sylly-Games"
node -e "
const fs=require('fs');
const src=fs.readFileSync('sw.js','utf8');
const list=src.slice(src.indexOf('PRECACHE_URLS'), src.indexOf('];', src.indexOf('PRECACHE_URLS')));
const urls=[...list.matchAll(/'([^']+)'/g)].map(m=>m[1]).filter(u=>u!=='./');
let bad=0;
for(const u of urls){ if(!fs.existsSync(u)){ console.log('MISSING', u); bad++; } }
console.log(urls.length+' precached paths, '+bad+' missing');
process.exit(bad?1:0);
"
```

Expected: `0 missing`.

- [ ] **Step 2: Bump the cache version**

`sw.js` line 4: `const CACHE_NAME = 'sylly-games-v227';` → `'sylly-games-v228'`.
Line 1's comment header too.

- [ ] **Step 3: Run every affected harness**

```bash
node tools/verify-controller-body.js
node tools/verify-controller-state.js
node tools/verify-mp-configs.js
node tools/verify-identity-docs.js
```

Expected: all four green. The last two are unaffected by this work and must stay that way — no identity doc was touched.

- [ ] **Step 4: Test the offline install from cold**

DevTools → Application → Storage → **Clear site data**. Reload (online) to install. Then DevTools → Network → **Offline**, and reload.

Expected: the lobby loads, the controller renders, the Workshop opens and recolours, Save persists, the gateway runs and the arcade opens. **Record the Cache Storage size** before and after — the delta is the vendored Three, and it goes in the SW note.

- [ ] **Step 5: Test on a real phone**

`docs/controller-prototype/controller-handoff-v3.md` § 4.2 flags that touch was never tested on a real device or emulator — this is the first time it will be. Check: rotate-drag, that the page does not scroll under the drag, that a tap on a button presses it rather than starting a rotate, swatch targets, and that the Konami is enterable without mis-hits.

- [ ] **Step 6: Update `docs/code-map.md`**

Grep for the lobby and secret-mode sections rather than reading the file (~132 KB). Record:
- New screens `screen-workshop`, `screen-secret-gateway`; removed `screen-secret-controller`.
- New ids: `lobby-controller`, `lobby-header-icons`, `ctl-stage`, `ctl-panel`, `ctl-how-to-overlay`, `btn-ctl-save`, `btn-ctl-reset`, `btn-ctl-exit`, `btn-ctl-how-to`, `sm-gateway-log`, `sm-gateway-granted`, `sm-gateway-continue`.
- Removed ids: `lobby-icon`, `sm-btn-up/down/left/right/b/a/select/start`, `sm-konami-progress`, `sm-controller-status`.
- The `ctl*` function and state inventory, and `js/controller.js` as a new file.

- [ ] **Step 7: Update `CLAUDE.md`**

1. Move the **entire** outgoing `**SW v227 — …**` paragraph **verbatim** to the top of `docs/sw-changelog.md` first. A second `**SW v…**` paragraph left in Current Focus means this step did not happen.
2. Write the v228 entry (≤6 lines) covering: the 3D controller replacing the lobby emoji, the Workshop, the Konami moving onto it, the rebuilt gateway, Three.js vendored (**with the measured install delta from Step 4**), and the harnesses.
3. § Load Order — confirm the three new entries are in (added in Tasks 1–2).
4. § Anti-Patterns — the two exceptions:
   - "Do NOT add external JS libraries" → "The only **three** are vendored: local Tailwind, the Firebase SDK, and Three.js r128 (`js/lib/three.min.js`, precached, never fetched from a CDN)."
   - The localStorage exception line gains `sylly_controller`.

- [ ] **Step 8: Update the rule files**

`logic-engine.md`:
- § Shared Library Modules — add `js/lib/controller-body.js` (`ControllerBody`) and `js/controller.js` (`ctl*`) rows.
- § Timer Lifecycle — a line naming `ctlRaf` and the gateway's `smTypewriterTimers` reuse as rAF/timer handles with their three clear sites.
- § PWA Guardian — Three.js listed among the precached vendored libraries.

`ui-style.md`: the `h-screen` whitelist row for `screen-workshop` (added in Task 5 — confirm it is there).

- [ ] **Step 9: Amend the two documents this work makes false**

`docs/design-brief-lobby.md`:
- § 4.1 — the 7-rapid-tap trigger and the requirement that 🎮 stay a tappable element with that id are both gone. Replace with the controller tap → Workshop → sequence path.
- § 4.2 — `smShowArcadeTile()` prepends into `#lobby-header-icons` now.

`docs/controller-prototype/controller-handoff-v3.md` — a header note: `body.js` now lives at `js/lib/controller-body.js`, the standalone prototypes are frozen reference artefacts, and § 4.2's duplication item is closed.

- [ ] **Step 10: Write the implementation notes**

`docs/implementation-notes/shared-implementation-notes.md` — the root cause of everything here is engine/lib code, not any one game, so it goes in this file and not a per-game one. Entries in **What happened → Root cause → Lesson** shape, at minimum:

- **The faceplate's phantom dependency.** `redraw()` appeared to need `sticker-surface.js` via `SURF.toAtlas`. Root cause: `toAtlas` falls back to `plainAtlas` whenever `geo.userData.warpXY` is absent, and `body.js` never defines it — the warped branch has never once executed. Lesson: trace a dependency to the branch that actually runs before planning around it; an eight-line port replaced a 40 KB module and a multi-hundred-millisecond build.
- **The bump atlas that was always black.** Lesson: a data texture whose data is uniform is not a texture, it is a constant — four full-size canvases on a phone for nothing.
- **Deleting `#lobby-icon` is a parse-time hazard.** `secret-mode.js` binds to it at top level, so removing the element without removing the listener takes the entire Secret Mode down before any of it runs. Lesson: an element with a top-level `getElementById(...).addEventListener` is load-bearing; grep every id before deleting its markup.
- **A rAF loop needs its own reduced-motion check** — the global CSS block reaches neither the spin-down nor the gateway stream.

- [ ] **Step 11: Add the decision-log entries**

`docs/decision-log.md`, newest on top, ~4 lines each, pointers not deep docs:
1. **Three.js as the third vendored library** — local, precached, never a CDN; the zero-runtime-third-party-dependency property is preserved; install cost recorded.
2. **`sylly_controller` as the fourth permitted localStorage key** — a user preference like `sylly_nickname`, not game state.
3. **The Konami moves onto the real controller and the gateway becomes a loadout** — one door instead of two; the terminal's ← BACK re-pointed at the lobby.

- [ ] **Step 12: Final sweep and commit**

```bash
cd "d:/Coding Projects/Little-Sylly-Games"
grep -rn "screen-secret-controller\|lobby-icon" --include=*.js --include=*.html --include=*.md . | grep -v docs/controller-prototype
node tools/verify-controller-body.js && node tools/verify-controller-state.js && node tools/verify-mp-configs.js && node tools/verify-identity-docs.js
```

Expected: no stale references outside the frozen prototype, four green harnesses.

```bash
git add -A
git commit -m "chore: ship the controller integration — SW v228

Precache gains js/lib/three.min.js, js/lib/controller-body.js and
js/controller.js; CACHE_NAME bumps to v228. Every precached path verified
against the filesystem before the bump — cache.addAll() rejects wholesale on a
single 404, which is an install that fails silently and an app with no offline
mode.

Documentation Integrity Protocol closed in order: code-map (two new screens, the
new and deleted ids, the ctl inventory), CLAUDE.md (v227 moved verbatim to the
changelog first, v228 written, load order, and the two anti-pattern exceptions),
logic-engine.md + ui-style.md, shared-implementation-notes, decision-log (three
entries). design-brief-lobby § 4 and the prototype handoff both amended where
this work made them false. No identity doc touched.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage** — every § 3 scope item maps to a task:

| Spec scope item | Task |
|---|---|
| 1. Three.js vendored and precached | 1 |
| 2. `body.js` de-duplicated, prototype frozen | 1 (+ 8 for the handoff note) |
| 3. Lobby mini controller replacing the emoji | 4 |
| 4. `screen-workshop` | 5 |
| 5. Four colour groups over the twenty brand hexes | 2 (derivation) + 3 (application) + 5 (UI) |
| 6. Persistence via the fourth key | 2 |
| 7. Konami on the real buttons; 7-tap deleted; keyboard completes the unlock | 6 (adapter), 4 (7-tap), 7 (keyboard) |
| 8. `smShowArcadeTile()` retargeted to the header row | 4 |
| 9. Gateway rebuilt; `sm-terminal-back` re-pointed | 7 |
| 10. SW precache + bump | 1, 2 (entries), 8 (bump) |
| 11. Documentation | 8 |

§ 11.1's four harness areas: persistence round-trip (Task 2 § 1), total read (§ 2), palette derivation (§ 4), Konami adapter (Task 6 § 5). § 11.2 `visual-check`: Tasks 4 and 5. § 11.3 manual: Task 8 Steps 4–5. § 11.4 regression: Task 8 Step 3.

**Three deliberate deviations from the spec**, each flagged at the code:

1. **§ 5.2's stated reason for excluding `sticker-surface.js` is wrong; its conclusion is right.** The spec says `redraw()` has "no reference to `StickerSurface` at all". It has two — `buildPlateUV` → `SURF.toAtlas` and `padEdges` → `SURF.padPairs`. Both dissolve on inspection (Task 3 Step 2): `toAtlas` resolves to `plainAtlas` because `warpXY` is never defined, and the seam bleed is a no-op on a uniform fill. The outcome the spec wanted — no sticker module, no surface build cost — holds, and is now proven rather than assumed.
2. **§ 11.1 says out-of-palette hex values resolve to defaults.** Taken literally the factory design could not round-trip, since § 8.3 makes the defaults deliberately *not* among the twenty. The read validates hex **shape** instead, and the harness pins the factory design's round-trip as the reason. A 21st game's colour is also readable before this file has heard of it.
3. **§ 6.1's markup carries an inner `<canvas>`; Task 4 drops it.** `WebGLRenderer` creates and owns its canvas, and one renderer is re-parented between the two mounts; a supplied canvas would force a second WebGL context, which phones cap.

**Placeholder scan:** no TBDs. Every code step carries real code; every verification step names the command and the expected output. The two "tune against the real render" values (`.ctl-lobby-mount` size, `.ctl-workshop-stage` height) ship as working numbers with a `visual-check` step to correct them — that is the spec's § 6.1 instruction, not a placeholder.

**Type consistency:** `ctlDesign`/`ctlDraft` are `{shell, plate, ears, buttons}` throughout; `ctlPalette()` returns `{id, hex}` in Tasks 2, 5 and the harness; `ctlOnPress(name, dir)` is declared in Task 3 and assigned in Tasks 4 (null) and 5 (`ctlKonamiPress`); `ctlKonamiCode(name, dir)` has one signature in Task 6's implementation and its test; `ctlTeardown()` is defined in Task 4 and called from Tasks 5, 7 and `resetToLobby()`; `ctlMountLobby()` is defined in Task 4 and called from Tasks 5 and 7.

**Task ordering:** Task 5's `ctlOpenWorkshop` reaches for `ctlKonamiPress`, which Task 6 defines. A `typeof` guard at that assignment keeps Task 5 shippable on its own — between the two commits the Workshop opens and the buttons press, they just feed no code — so neither task depends on the other having landed.
