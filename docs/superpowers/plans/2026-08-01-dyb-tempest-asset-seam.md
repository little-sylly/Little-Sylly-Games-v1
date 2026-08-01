# DYB Tempest Asset Seam Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an asset pack restyle The Bluff's five Tempest special die types without ever making the type illegible or leaking a concealed phantom's face.

**Architecture:** Add one optional `specials` block to the shared asset manifest, resolved by two new functions in `js/lib/art.js` alongside `assetFace`. Rework `dybDieHTML` so special dice draw pack art *inside* the engine's existing type frame (border + tint + glow), with a per-type opt-out that only applies when special art actually resolved. A new headless harness drives the real shipped functions in a `vm` sandbox with fixture manifests.

**Tech Stack:** Vanilla ES6 browser globals (no modules, no build step, no npm). Node's built-in `fs` / `path` / `vm` for the harness. Tailwind utility classes plus hand-written CSS in `css/styles.css`.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-08-01-dyb-tempest-asset-seam-design.md`. Read it before Task 1. Section references below (§ 3, § 5…) point into it.
- **No build tools.** No `npm`, no webpack, no external JS libraries. Harnesses are plain `node tools/verify-*.js`.
- **All symbols are global.** No ES modules. Forward references work at runtime.
- **Australian English** in all comments, docs and UI copy. Metric units only.
- **Never full-read `index.html`** (~515 KB) or `docs/code-map.md` (~132 KB) or `docs/rules/game-identities.md` (~135 KB). Grep for the identifier, then offset-Read that slice.
- **`index.html` is NOT modified by this plan.** No markup change is needed. Do not edit it — it carries a known UTF-8 mojibake hazard with the Edit tool.
- **No rules change.** `dybGenerateRoll`'s type-assignment odds, `dybComputeRealCount`'s arithmetic and the Chaos-level slider are untouched.
- **No core art.** `data/art/` is not created or modified for `dyb`.
- **Comment style:** file header `// ═══…`, section header `// ── Label ───…`, inline rationale as a trailing `//` comment.
- **`CACHE_NAME` in `sw.js` is currently `'sylly-games-v154'`** → becomes `'sylly-games-v155'` in Task 8, not before.

---

### Task 1: Harness skeleton + characterisation of today's output

Builds the safety net first. No production file changes — this task locks in current behaviour so every later task can prove it changed only what it meant to.

**Files:**
- Create: `tools/verify-dyb-dice.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `tools/verify-dyb-dice.js` exporting nothing, but establishing helpers later tasks extend — `setSkin(assets)`, `setCore(assets)`, `noArt()`, `check(label, actual, expected)`, `section(title)`, `classesOf(html)`, `hasClass(html, cls)`, `imgUrl(html)`, `glyphText(html)`, and the fixture constant `FACES`.

- [ ] **Step 1: Write the harness with characterisation assertions**

Create `tools/verify-dyb-dice.js`:

```js
// ═══════════════════════════════════════════════════════════════════════════
// verify-dyb-dice.js — asserts The Bluff's die render seam.
//
//   node tools/verify-dyb-dice.js        (exits 1 on any failure)
//
// Covers the Tempest asset seam (spec docs/superpowers/specs/2026-08-01-dyb-
// tempest-asset-seam-design.md): the `specials` manifest block, the engine frame
// contract and its per-type opt-out, the reserved `blank` key, and the leak guard
// that stops a concealed phantom's real face reaching the DOM.
//
// It re-implements NOTHING: js/lib/art.js and js/games/dyb.js are evaluated in a
// vm sandbox, so these run against the real shipped resolver and the real render
// seam. The two art tiers are supplied as fixture manifests, exactly as a real
// pack would supply them.
// ═══════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT = path.join(__dirname, '..');

// ── Sandbox ────────────────────────────────────────────────────────────────
// A permissive element stub: every property read returns the stub itself and it
// is callable, so dyb.js's top-level DOM wiring chains without throwing.
const elStub = new Proxy(function () {}, {
  get(_t, k) { return k === Symbol.toPrimitive ? () => '' : elStub; },
  set() { return true; },
  apply() { return elStub; },
});

const sandbox = {
  console,
  document: {
    addEventListener() {},
    getElementById:   () => elStub,
    querySelector:    () => elStub,
    querySelectorAll: () => [],
    createElement:    () => elStub,
    body: elStub,
  },
  window: {},
  setTimeout, clearTimeout, setInterval, clearInterval,
  requestAnimationFrame: () => 0,
  cancelAnimationFrame() {},
  // art.js calls this at load; an empty registry leaves window.coreArt = {}.
  fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }),
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

function load(rel) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  // Function declarations are hoisted and bound before any statement runs, so the
  // functions under test exist even if top-level DOM wiring throws under stubs.
  try {
    vm.runInContext(src, sandbox, { filename: rel });
  } catch (err) {
    console.log(`  note: ${rel} threw at top level under stubs (${err.message}) —`
      + ' hoisted function declarations are still bound');
  }
}
load('js/lib/art.js');
load('js/games/dyb.js');

for (const fn of ['assetFace', 'dybDieHTML']) {
  if (typeof sandbox[fn] !== 'function') {
    console.error(`FATAL: ${fn} is not defined after load — the harness cannot run.`);
    process.exit(1);
  }
}
const { dybDieHTML } = sandbox;

// ── Fixtures — set the two art tiers exactly as the loaders would ──────────
function setSkin(assets) { sandbox.window.activeAssetPack = assets ? { id: 'testskin', assets } : null; }
function setCore(assets) { sandbox.window.coreArt = assets ? { dyb: { id: 'dyb', assets } } : {}; }
function noArt() { setSkin(null); setCore(null); }

const FACES = {
  kind: 'dyb', basePath: 'img/',
  faces: { '1': '1.svg', '2': '2.svg', '3': '3.svg', '4': '4.svg', '5': '5.svg', '6': '6.svg' },
  back: 'back.svg',
};

// ── Tiny assertion harness ────────────────────────────────────────────────
let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}`
    + (ok ? '' : `\n          expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`));
}
const section = t => console.log(`\n${t}`);

// Class list of the OUTER die div (the first class attribute in the string).
function classesOf(html) {
  const m = html.match(/class="([^"]*)"/);
  return m ? m[1].split(/\s+/).filter(Boolean).sort() : [];
}
function hasClass(html, cls) { return classesOf(html).includes(cls); }
function imgUrl(html) {
  const m = html.match(/background-image:url\('([^']*)'\)/);
  return m ? m[1] : null;
}
// The glyph span's text. Excludes pip spans (empty) and the framed-art span
// (which carries a style attribute straight after its class).
function glyphText(html) {
  const m = html.match(/<span class="(?!dyb-pip|dyb-die-art)[^"]*">([^<]+)<\/span>/);
  return m ? m[1] : null;
}

// ═══ Characterisation — today's behaviour, locked in before anything changes ═══
// NOTE: these calls use the CURRENT 7-parameter signature
//   dybDieHTML(val, type, slickFace, visible, dieIdx, isSlickAssigned, phantomSecondary)
// Task 3 drops the dead `visible` parameter and updates every call below.

section('Characterisation — no art pack loaded');
noArt();
check('standard 4 → pip grid, no image',
  [hasClass(dybDieHTML(4, 'standard', -1, true), 'dyb-die'), imgUrl(dybDieHTML(4, 'standard', -1, true))],
  [true, null]);
check('standard 4 → 4 pips',
  (dybDieHTML(4, 'standard', -1, true).match(/dyb-pip/g) || []).length, 4);
check('loaded 3 → amber glow class + amber pips',
  [hasClass(dybDieHTML(3, 'loaded', -1, true), 'dyb-die-loaded'),
   dybDieHTML(3, 'loaded', -1, true).includes('bg-amber-700')],
  [true, true]);
check('snake 2 → snake classes',
  [hasClass(dybDieHTML(2, 'snake', -1, true), 'dyb-die-snake'),
   dybDieHTML(2, 'snake', -1, true).includes('dyb-pip-snake')],
  [true, true]);
check('cracked → ✕ glyph', glyphText(dybDieHTML(5, 'cracked', -1, true)), '✕');
check('phantom in hand → ? glyph (real face never rendered)',
  [glyphText(dybDieHTML(6, 'phantom', -1, true, 0)),
   dybDieHTML(6, 'phantom', -1, true, 0).includes('dyb-pip')],
  ['?', false]);
check('phantom spectator (dieIdx -2) → ? glyph',
  glyphText(dybDieHTML(6, 'phantom', -1, true, -2)), '?');
check('phantom revealed pure → indigo pips, no glyph',
  [glyphText(dybDieHTML(6, 'phantom', -1, true, -1)),
   dybDieHTML(6, 'phantom', -1, true, -1).includes('bg-indigo-400')],
  [null, true]);
check('phantom + loaded compound → both loaded class and ring',
  [hasClass(dybDieHTML(3, 'phantom', -1, true, -1, true, 'loaded'), 'dyb-die-loaded'),
   hasClass(dybDieHTML(3, 'phantom', -1, true, -1, true, 'loaded'), 'dyb-die-phantom-ring')],
  [true, true]);
check('slick unassigned → "4*" glyph + cursor-pointer',
  [glyphText(dybDieHTML(9, 'slick', 4, true, 0, false)),
   hasClass(dybDieHTML(9, 'slick', 4, true, 0, false), 'cursor-pointer')],
  ['4*', true]);
check('slick assigned → pips at the ASSIGNED face, not the roll',
  (dybDieHTML(9, 'slick', 2, true, 0, true).match(/dyb-pip/g) || []).length, 2);

section('Characterisation — skin with faces only (the shipped seam)');
setSkin(FACES);
check('standard 4 → skin image, edge-to-edge asset class',
  [imgUrl(dybDieHTML(4, 'standard', -1, true)),
   hasClass(dybDieHTML(4, 'standard', -1, true), 'dyb-die-asset')],
  ['data/packs/testskin/img/4.svg', true]);
check('loaded 3 → still pips today (this is what the plan changes)',
  imgUrl(dybDieHTML(3, 'loaded', -1, true)), null);
check('cup back → skin back image',
  imgUrl(sandbox.dybDieBackHTML()), 'data/packs/testskin/img/back.svg');

section('Characterisation — id attribute and replace-prefix contracts');
check('dieIdx >= 0 emits an id attribute',
  dybDieHTML(4, 'standard', -1, true, 2).startsWith('<div id="dyb-die-2" class="dyb-die '), true);
check('dieIdx -1 emits the bare prefix dyb.js:1025 string-replaces on',
  dybDieHTML(4, 'standard', -1, true, -1).startsWith('<div class="dyb-die '), true);
check('dybDieHTMLSm injects the sm class via that same prefix',
  hasClass(sandbox.dybDieHTMLSm(4), 'dyb-die-sm'), true);

// ── Result ────────────────────────────────────────────────────────────────
console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
```

- [ ] **Step 2: Run it and confirm every check passes against unmodified code**

Run: `node tools/verify-dyb-dice.js`
Expected: `ALL CHECKS PASSED`, exit 0.

If any check FAILs here, the assertion is wrong, not the code — this task changes no production file. Fix the assertion to match reality before continuing; a characterisation test that lies is worse than none.

If the run aborts with `FATAL: dybDieHTML is not defined`, the `elStub` proxy was not permissive enough for something `dyb.js` does at top level. Read the `note:` line printed just above it for the real error and widen the stub.

- [ ] **Step 3: Commit**

```bash
git add tools/verify-dyb-dice.js
git commit -m "test(dyb): characterise the die render seam before reworking it

Locks in today's output for all five Tempest types across in-hand, Overlook and
spectator views, plus the two string-replace prefix contracts dyb.js:1025 and
dybDieHTMLSm depend on. No production change.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: `assetSpecial` + `assetSpecialFrame` in `art.js`

**Files:**
- Modify: `js/lib/art.js` (append after `assetExtra`, which ends at line 104; also update the file header comment at lines 1–24)
- Test: `tools/verify-dyb-dice.js`

**Interfaces:**
- Consumes: `artSkin(kind)`, `artResolve(baseDir, assets, file)`, `window.coreArt` — all existing in `art.js`.
- Produces:
  - `assetSpecial(kind, type, id)` → `string | null`. `type` is a `specials` key (`'loaded'`, `'phantom'`, `'slick'`, `'cracked'`, `'snake'`). `id` is a face value (number or numeric string) or the reserved string `'blank'`.
  - `assetSpecialFrame(kind, type)` → `boolean`. `true` unless a tier sets `"frame": false`.

- [ ] **Step 1: Write the failing tests**

In `tools/verify-dyb-dice.js`, add these fixtures immediately after the `FACES` constant:

```js
// A skin that also covers special dice. Deliberately partial: loaded has 3 but
// not 4, snake opts out of the engine frame, phantom has `blank` but no faces.
const FACES_PLUS_SPECIALS = {
  kind: 'dyb', basePath: 'img/',
  faces: { '1': '1.svg', '2': '2.svg', '3': '3.svg', '4': '4.svg', '5': '5.svg', '6': '6.svg' },
  back: 'back.svg',
  specials: {
    loaded:  { '3': 'l3.svg' },
    snake:   { '2': 's2.svg', frame: false },
    slick:   { '5': 'k5.svg' },
    phantom: { blank: 'ghost.svg' },
    cracked: { blank: 'broken.svg' },
  },
};

// A core-art tier used to prove per-key fallthrough from the skin.
const CORE_SPECIALS = {
  kind: 'dyb', basePath: 'img/',
  faces: { '4': 'core4.svg' },
  specials: { loaded: { '4': 'coreL4.svg' } },
};
```

Add this section immediately before the `// ── Result ──` block, and add `assetSpecial` and `assetSpecialFrame` to the `for (const fn of [...])` guard list near the top:

```js
section('Resolver — assetSpecial / assetSpecialFrame');
const { assetSpecial, assetSpecialFrame } = sandbox;

noArt();
check('no tiers → null', assetSpecial('dyb', 'loaded', 3), null);
check('no tiers → frame defaults true', assetSpecialFrame('dyb', 'loaded'), true);

setSkin(FACES);
check('skin without a specials block → null', assetSpecial('dyb', 'loaded', 3), null);
check('skin without a specials block → frame true', assetSpecialFrame('dyb', 'loaded'), true);

setSkin(FACES_PLUS_SPECIALS);
check('skin covers loaded 3', assetSpecial('dyb', 'loaded', 3), 'data/packs/testskin/img/l3.svg');
check('skin does not cover loaded 4', assetSpecial('dyb', 'loaded', 4), null);
check('skin covers the blank key', assetSpecial('dyb', 'phantom', 'blank'), 'data/packs/testskin/img/ghost.svg');
check('unknown type → null', assetSpecial('dyb', 'nosuchtype', 3), null);
check('"frame" is not addressable as an id', assetSpecial('dyb', 'snake', 'frame'), null);
check('frame defaults true when unset', assetSpecialFrame('dyb', 'loaded'), true);
check('frame false when the type opts out', assetSpecialFrame('dyb', 'snake'), false);
check('opt-out does not leak to other types', assetSpecialFrame('dyb', 'slick'), true);

setSkin(FACES_PLUS_SPECIALS); setCore(CORE_SPECIALS);
check('skin wins over core for a covered key', assetSpecial('dyb', 'loaded', 3), 'data/packs/testskin/img/l3.svg');
check('per-key fallthrough to core for an uncovered key', assetSpecial('dyb', 'loaded', 4), 'data/art/dyb/img/coreL4.svg');

setSkin(null); setCore(CORE_SPECIALS);
check('core tier alone resolves', assetSpecial('dyb', 'loaded', 4), 'data/art/dyb/img/coreL4.svg');
check('core tier, uncovered key → null', assetSpecial('dyb', 'snake', 4), null);
check('wrong kind → null', assetSpecial('frt', 'loaded', 4), null);
```

- [ ] **Step 2: Run to verify it fails**

Run: `node tools/verify-dyb-dice.js`
Expected: aborts with `FATAL: assetSpecial is not defined after load — the harness cannot run.`, exit 1.

- [ ] **Step 3: Implement the two resolvers**

Append to `js/lib/art.js`, after `assetExtra` (the file currently ends at line 104):

```js

// The image for a MODIFIED face — a face that carries a type on top of its value.
// First user: DYB's Tempest dice (loaded / phantom / slick / cracked / snake).
// `id` is a face value, or the reserved string 'blank' for a variant that shows no
// face at all (a concealed phantom, a cracked die).
// Same skin → core → null chain as assetFace, resolved per key, so a partial
// specials block falls through rather than falling off.
function assetSpecial(kind, type, id) {
  const skin = artSkin(kind);
  if (skin) {
    const t = skin.assets.specials && skin.assets.specials[type];
    const url = t && artResolve(`data/packs/${skin.id}/`, skin.assets, t[id]);
    if (url) return url;
  }
  const core = window.coreArt[kind];
  if (core) {
    const t = core.assets.specials && core.assets.specials[type];
    if (t) return artResolve(`data/art/${core.id}/`, core.assets, t[id]);
  }
  return null;
}

// Whether the engine draws its own type chrome (border + tint + glow) around that
// art. False only where a tier explicitly opts out with "frame": false — a pack
// author taking responsibility for keeping the type legible themselves.
function assetSpecialFrame(kind, type) {
  const skin = artSkin(kind);
  if (skin) {
    const t = skin.assets.specials && skin.assets.specials[type];
    if (t && typeof t.frame === 'boolean') return t.frame;
  }
  const core = window.coreArt[kind];
  if (core) {
    const t = core.assets.specials && core.assets.specials[type];
    if (t && typeof t.frame === 'boolean') return t.frame;
  }
  return true;
}
```

`t[id]` cannot accidentally resolve `'frame'` to a URL: `artResolve` returns `null` for anything falsy, and `frame` is a boolean, so `artResolve(..., false)` → `null` and `artResolve(..., true)` → `null` as well since only a string filename produces a path. The `"frame" is not addressable as an id` check above proves it.

- [ ] **Step 4: Update the `art.js` header comment**

In the box comment at the top of `js/lib/art.js`, change the `Read by:` line (currently line 21–22) to name the new resolver:

```js
// Read by: pkoRenderCard, frtRenderCard, shpRenderCard, flwRenderCard,
//          Cards.buildEl/buildBackEl, dybDieHTML/dybDieBackHTML.
//          dybDieHTML additionally reads assetSpecial/assetSpecialFrame — the
//          `specials` block, for faces that carry a type as well as a value.
```

- [ ] **Step 5: Run to verify it passes**

Run: `node tools/verify-dyb-dice.js`
Expected: `ALL CHECKS PASSED`, exit 0. The Task 1 characterisation checks must still all pass — `art.js` gained functions but changed none.

- [ ] **Step 6: Commit**

```bash
git add js/lib/art.js tools/verify-dyb-dice.js
git commit -m "feat(art): assetSpecial/assetSpecialFrame — the specials manifest block

Resolves art for a face that carries a type on top of its value, through the
same skin -> core -> null chain as assetFace and with the same per-key
fallthrough. assetSpecialFrame reports whether the engine still draws its own
type chrome; true unless a tier opts out.

No caller yet.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Drop the dead `visible` parameter

Pure refactor, isolated so the Task 4 diff is only about the seam. `dybDieHTML`'s 4th parameter is declared and never read.

**Files:**
- Modify: `js/games/dyb.js` — signature at line 1390, call sites at lines 1025, 1141, 1219, 1350, 1489, 1492
- Test: `tools/verify-dyb-dice.js`

**Interfaces:**
- Consumes: `dybDieHTML` from Task 1's characterisation.
- Produces: `dybDieHTML(val, type, slickFace, dieIdx = -1, isSlickAssigned = true, phantomSecondary = null)` — six parameters. Every later task uses this signature.

- [ ] **Step 1: Confirm the parameter really is dead**

Run: `grep -n "visible" js/games/dyb.js`
Expected: exactly three hits — a comment at line 974, a trailing comment at line 1350, and the parameter declaration at line 1390. **No read of the identifier inside the function body.** If a real read appears, stop: the parameter is live and this task must be abandoned.

- [ ] **Step 2: Update the harness to the new signature**

In `tools/verify-dyb-dice.js`, remove the 4th argument from every `dybDieHTML(...)` call and update the NOTE comment above the characterisation block. The calls become:

```js
// NOTE: the signature is
//   dybDieHTML(val, type, slickFace, dieIdx, isSlickAssigned, phantomSecondary)
dybDieHTML(4, 'standard', -1)                          // was (4, 'standard', -1, true)
dybDieHTML(3, 'loaded', -1)                            // was (3, 'loaded', -1, true)
dybDieHTML(2, 'snake', -1)                             // was (2, 'snake', -1, true)
dybDieHTML(5, 'cracked', -1)                           // was (5, 'cracked', -1, true)
dybDieHTML(6, 'phantom', -1, 0)                        // was (6, 'phantom', -1, true, 0)
dybDieHTML(6, 'phantom', -1, -2)                       // was (6, 'phantom', -1, true, -2)
dybDieHTML(6, 'phantom', -1, -1)                       // was (6, 'phantom', -1, true, -1)
dybDieHTML(3, 'phantom', -1, -1, true, 'loaded')       // was (3, 'phantom', -1, true, -1, true, 'loaded')
dybDieHTML(9, 'slick', 4, 0, false)                    // was (9, 'slick', 4, true, 0, false)
dybDieHTML(9, 'slick', 2, 0, true)                     // was (9, 'slick', 2, true, 0, true)
dybDieHTML(4, 'standard', -1, 2)                       // was (4, 'standard', -1, true, 2)
dybDieHTML(4, 'standard', -1, -1)                      // was (4, 'standard', -1, true, -1)
```

- [ ] **Step 3: Run to verify it fails**

Run: `node tools/verify-dyb-dice.js`
Expected: FAIL. With the old 7-parameter signature still in place, `dybDieHTML(6, 'phantom', -1, 0)` binds `0` to `visible` and leaves `dieIdx` at its `-1` default, so the phantom renders *revealed* — the `? glyph` checks fail and the `phantom revealed pure` check now sees a glyph. Several other checks shift the same way. This failure is the proof the harness is genuinely exercising the signature.

- [ ] **Step 4: Change the signature**

In `js/games/dyb.js` line 1390:

```js
function dybDieHTML(val, type, slickFace, dieIdx = -1, isSlickAssigned = true, phantomSecondary = null) {
```

- [ ] **Step 5: Update all six call sites**

`js/games/dyb.js:1025`:
```js
      return dybDieHTML(val, type, slicks[j] !== undefined ? slicks[j] : -1, -1, true, phantoms[j] || null)
```

`js/games/dyb.js:1141`:
```js
        const miniPips = dybDieHTML(bestFace, 'standard', -1);
```

`js/games/dyb.js:1219`:
```js
    const diceHtml = roll.map((val, j) => dybDieHTML(val, types[j] || 'standard', -1, -2)).join('');
```

`js/games/dyb.js:1350`:
```js
    return dybDieHTML(val, type, slick, i, assigned); // always visible — MDLM, own device
```

`js/games/dyb.js:1489` and `:1492`:
```js
function dybDieHTMLSm(face) {
  return dybDieHTML(face, 'standard', -1).replace('class="dyb-die ', 'class="dyb-die dyb-die-sm ');
}
function dybDieHTMLXs(face) {
  return dybDieHTML(face, 'standard', -1).replace('class="dyb-die ', 'class="dyb-die dyb-die-xs ');
}
```

- [ ] **Step 6: Verify no call site was missed**

Run: `grep -n "dybDieHTML(" js/games/dyb.js`
Expected: 7 hits — the declaration at 1390 plus the six calls above. Read each call and confirm none passes a bare `true` in the 4th position.

- [ ] **Step 7: Run to verify it passes**

Run: `node tools/verify-dyb-dice.js`
Expected: `ALL CHECKS PASSED`, exit 0. Every characterisation assertion from Task 1 passes unchanged — this refactor altered no output.

- [ ] **Step 8: Commit**

```bash
git add js/games/dyb.js tools/verify-dyb-dice.js
git commit -m "refactor(dyb): drop dybDieHTML's dead \`visible\` parameter

Declared and never read; all six call sites passed a literal true. Removing it
before the seam rework keeps that diff about the seam.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Framed-asset CSS + special faces through the seam

The core change. Special dice with a *face value* (loaded, snake, assigned slick, revealed pure phantom) now draw pack art inside the engine's type frame.

**Files:**
- Modify: `css/styles.css` (insert after the `.dyb-die-asset` rule, which ends at line 1160)
- Modify: `js/games/dyb.js:1390-1486` (`dybDieHTML`)
- Test: `tools/verify-dyb-dice.js`

**Interfaces:**
- Consumes: `assetSpecial(kind, type, id)`, `assetSpecialFrame(kind, type)` from Task 2; the six-parameter `dybDieHTML` from Task 3.
- Produces: two CSS classes — `.dyb-die-framed` on the outer die div, `.dyb-die-art` on an inner `<span>` carrying the image. Task 5 and Task 6 extend the same `artType` / `artKey` mechanism this task introduces.

- [ ] **Step 1: Write the failing tests**

Add to `tools/verify-dyb-dice.js`, before the `// ── Result ──` block:

```js
section('Seam — special faces draw pack art inside the engine frame');
setSkin(FACES_PLUS_SPECIALS); setCore(null);

const loaded3 = dybDieHTML(3, 'loaded', -1);
check('loaded 3, skin covers it → framed art, not pips',
  [imgUrl(loaded3), hasClass(loaded3, 'dyb-die-framed'), loaded3.includes('dyb-pip')],
  ['data/packs/testskin/img/l3.svg', true, false]);
check('loaded 3 keeps its amber type class', hasClass(loaded3, 'dyb-die-loaded'), true);
check('framed art lives in an inner span', loaded3.includes('<span class="dyb-die-art"'), true);
check('framed dice never use the edge-to-edge asset class',
  hasClass(loaded3, 'dyb-die-asset'), false);

const loaded4 = dybDieHTML(4, 'loaded', -1);
check('loaded 4, skin lacks it → falls back to the STANDARD face art',
  imgUrl(loaded4), 'data/packs/testskin/img/4.svg');
check('...and is still framed, so the type stays legible',
  [hasClass(loaded4, 'dyb-die-framed'), hasClass(loaded4, 'dyb-die-loaded')],
  [true, true]);

const snake2 = dybDieHTML(2, 'snake', -1);
check('snake opted out of the frame → edge-to-edge asset class',
  [imgUrl(snake2), hasClass(snake2, 'dyb-die-asset'), hasClass(snake2, 'dyb-die-framed')],
  ['data/packs/testskin/img/s2.svg', true, false]);
check('opted-out die drops the engine type chrome',
  hasClass(snake2, 'dyb-die-snake'), false);

const snake5 = dybDieHTML(5, 'snake', -1);
check('SAFETY RULE — opt-out + uncovered face → frame draws anyway',
  [imgUrl(snake5), hasClass(snake5, 'dyb-die-framed'), hasClass(snake5, 'dyb-die-snake')],
  ['data/packs/testskin/img/5.svg', true, true]);

const slick5 = dybDieHTML(9, 'slick', 5, 0, true);
check('assigned slick resolves on the ASSIGNED face, not the roll',
  imgUrl(slick5), 'data/packs/testskin/img/k5.svg');

const phantomRevealed = dybDieHTML(1, 'phantom', -1, -1);
check('revealed pure phantom falls back to the standard face, framed',
  [imgUrl(phantomRevealed), hasClass(phantomRevealed, 'dyb-die-framed')],
  ['data/packs/testskin/img/1.svg', true]);

section('Seam — standard faces and the cup back are unchanged');
check('standard 4 still edge-to-edge, never framed',
  [hasClass(dybDieHTML(4, 'standard', -1), 'dyb-die-asset'),
   hasClass(dybDieHTML(4, 'standard', -1), 'dyb-die-framed')],
  [true, false]);
check('cup back still edge-to-edge',
  [imgUrl(sandbox.dybDieBackHTML()), hasClass(sandbox.dybDieBackHTML(), 'dyb-die-asset')],
  ['data/packs/testskin/img/back.svg', true]);

section('Seam — a pack with no art at all still renders pips');
noArt();
check('loaded 3 with no tiers → pips, amber, no image',
  [imgUrl(dybDieHTML(3, 'loaded', -1)),
   dybDieHTML(3, 'loaded', -1).includes('bg-amber-700'),
   hasClass(dybDieHTML(3, 'loaded', -1), 'dyb-die-framed')],
  [null, true, false]);
```

- [ ] **Step 2: Run to verify it fails**

Run: `node tools/verify-dyb-dice.js`
Expected: FAIL on the new section — `loaded 3, skin covers it → framed art, not pips` reports `[null, false, true]`, because the seam is still gated to `type === 'standard'`.

- [ ] **Step 3: Add the CSS**

In `css/styles.css`, insert immediately after the `.dyb-die-asset` rule (which closes at line 1160):

```css
/* Framed asset die — pack art for a SPECIAL die, drawn inside the engine's own
   type chrome so loaded/snake/slick/phantom stay legible under any skin. The
   frame is the type; the image is the face. A pack may opt out per type with
   "frame": false, which routes it back through .dyb-die-asset above. */
.dyb-die.dyb-die-framed {
  display: block;
  padding: 3px;
}
.dyb-die-art {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 6px;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}
```

`.dyb-die-framed` never co-occurs with `.dyb-die-sm` / `.dyb-die-xs` — those come only from `dybDieHTMLSm` / `dybDieHTMLXs`, which always pass `type: 'standard'`, and standard faces are never framed. Their `padding` overrides therefore cannot conflict.

- [ ] **Step 4: Rework `dybDieHTML`**

Replace `js/games/dyb.js:1390-1486` in full. Three changes from the current body: a new `ringCls` variable split out of `extraCls`; new `artType` / `artKey` assignments inside the existing `switch`; and a new resolution block that runs **before** the `textLabel` early-return.

```js
function dybDieHTML(val, type, slickFace, dieIdx = -1, isSlickAssigned = true, phantomSecondary = null) {
  const idAttr = dieIdx >= 0 ? ` id="dyb-die-${dieIdx}"` : '';

  let borderCls = 'border-stone-200';
  let bgCls     = 'bg-stone-50';
  let pipCls    = 'bg-stone-700';
  let extraCls  = '';
  let ringCls   = ''; // phantom's additive ring — held OUT of extraCls so a secondary
                      // type's "frame": false can never suppress phantom's own identity
  let textLabel  = null;
  let textStyle  = 'text-stone-500 font-bold text-base';

  // Which `specials` entry this die wants, if any.
  // artKey is a face value, or 'blank' for a die that shows no face at all.
  let artType = null;
  let artKey  = null;

  switch (type) {
    case 'loaded':
      extraCls = 'dyb-die-loaded'; // amber glow breathing pulse via CSS compound class
      pipCls   = 'bg-amber-700';
      artType  = 'loaded'; artKey = val;
      break;
    case 'phantom':
      extraCls = 'dyb-die-phantom'; // purple tint + lavender border via CSS compound class
      if (dieIdx !== -1) {
        // Owner's live hand OR spectator view — face stays hidden
        textLabel = '?';
        textStyle = 'dyb-phantom-glyph'; // indigo ? with glow text-shadow
        artType   = 'phantom'; artKey = 'blank';
      } else {
        // Showdown reveal — unmask: pure phantom shows real face; compound shows secondary type with ring
        if (!phantomSecondary) {
          pipCls  = 'bg-indigo-400'; // pure phantom — indigo pips
          artType = 'phantom'; artKey = val;
        } else if (phantomSecondary === 'loaded') {
          extraCls = 'dyb-die-loaded'; ringCls = 'dyb-die-phantom-ring'; // amber glow + indigo ring
          pipCls   = 'bg-amber-700';
          artType  = 'loaded'; artKey = val;
        } else if (phantomSecondary === 'snake') {
          extraCls = 'dyb-die-snake'; ringCls = 'dyb-die-phantom-ring'; // dark green + indigo ring
          pipCls   = 'dyb-pip-snake';
          artType  = 'snake'; artKey = val;
        } else if (phantomSecondary === 'cracked') {
          ringCls   = 'dyb-die-phantom-ring'; // indigo ring only; cracked styling below
          bgCls     = 'bg-stone-100';
          borderCls = 'border-stone-200';
          textLabel = '✕';
          textStyle = 'text-stone-300 font-bold text-xl';
          artType   = 'cracked'; artKey = 'blank';
        } else if (phantomSecondary === 'slick') {
          ringCls   = 'dyb-die-phantom-ring'; // indigo ring + cyan styling
          borderCls = 'border-cyan-400';
          bgCls     = 'bg-cyan-50';
          pipCls    = 'bg-cyan-600';
          // Use locked slick face (assigned at generation time)
          if (slickFace > 0) val = slickFace;
          artType   = 'slick'; artKey = val;
        }
      }
      break;
    case 'slick':
      borderCls = 'border-cyan-400';
      bgCls     = 'bg-cyan-50';
      if (!isSlickAssigned) {
        // Pre-assignment: show auto-rolled face as X* with cyan text (tappable).
        // Deliberately NOT skinnable — the digit is live information the player
        // needs in order to choose, not decoration.
        extraCls  = 'cursor-pointer';
        textLabel = `${slickFace > 0 ? slickFace : '?'}*`;
        textStyle = 'text-cyan-600 font-bold text-sm';
      } else if (slickFace > 0) {
        // Committed — show assigned face
        val     = slickFace;
        pipCls  = 'bg-cyan-600';
        artType = 'slick'; artKey = val;
      } else {
        // Fallback (shouldn't occur post-redesign): unassigned with no auto-face
        textLabel = '~';
        textStyle = 'dyb-tilde-breathe';
      }
      break;
    case 'cracked':
      bgCls     = 'bg-stone-100';
      borderCls = 'border-stone-200';
      textLabel = '✕';
      textStyle = 'text-stone-300 font-bold text-xl'; // muted cross signals zero value
      artType   = 'cracked'; artKey = 'blank';
      break;
    case 'snake':
      extraCls = 'dyb-die-snake'; // sinister dark green; overrides default border/bg via specificity
      pipCls   = 'dyb-pip-snake'; // dark green diamond pip
      artType  = 'snake'; artKey = val;
      break;
  }

  // ── Asset seam ────────────────────────────────────────────────────────────
  // Standard faces keep the shipped edge-to-edge look. A SPECIAL die draws the
  // pack's art inside the engine's type frame, so the type stays legible under
  // any skin — unless the pack opts that type out, and then only for a die whose
  // special art actually resolved (otherwise a missing face silently ships an
  // unmarked die). A 'blank' key NEVER falls back to assetFace: for a concealed
  // phantom that would render its real value and leak it.
  let url = null, framed = false;
  if (artType) {
    const special = (typeof assetSpecial === 'function') && assetSpecial('dyb', artType, artKey);
    if (special) {
      url    = special;
      framed = !((typeof assetSpecialFrame === 'function') && assetSpecialFrame('dyb', artType) === false);
    } else if (artKey !== 'blank') {
      url    = (typeof assetFace === 'function') && assetFace('dyb', artKey);
      framed = !!url;
    }
  } else if (type === 'standard') {
    url = (typeof assetFace === 'function') && assetFace('dyb', val);
  }

  if (url) {
    return framed
      ? `<div${idAttr} class="dyb-die ${borderCls} ${bgCls} ${extraCls} ${ringCls} dyb-die-framed select-none"><span class="dyb-die-art" style="background-image:url('${url}')"></span></div>`
      : `<div${idAttr} class="dyb-die dyb-die-asset ${ringCls} select-none" style="background-image:url('${url}')"></div>`;
  }

  if (textLabel !== null) {
    return `<div${idAttr} class="dyb-die ${borderCls} ${bgCls} ${extraCls} ${ringCls} select-none" style="display:flex;align-items:center;justify-content:center;padding:0;"><span class="${textStyle}">${textLabel}</span></div>`;
  }

  const pips = DYB_PIP_LAYOUTS[val] || [];
  let cells = '';
  for (let i = 1; i <= 9; i++) {
    cells += pips.includes(i) ? `<span class="dyb-pip ${pipCls}"></span>` : '<span></span>';
  }
  return `<div${idAttr} class="dyb-die ${borderCls} ${bgCls} ${extraCls} ${ringCls} select-none">${cells}</div>`;
}
```

Every returned string still begins `<div${idAttr} class="dyb-die ` — that prefix is what `dyb.js:1025` and `dybDieHTMLSm` / `dybDieHTMLXs` string-replace on. Do not reorder it.

- [ ] **Step 5: Run to verify it passes**

Run: `node tools/verify-dyb-dice.js`
Expected: `ALL CHECKS PASSED`, exit 0. The Task 1 characterisation checks still pass — with no art pack loaded, every branch falls through to the identical glyph or pip output.

- [ ] **Step 6: Commit**

```bash
git add css/styles.css js/games/dyb.js tools/verify-dyb-dice.js
git commit -m "feat(dyb): draw special-die pack art inside the engine type frame

Tempest dice with a face value (loaded, snake, assigned slick, revealed pure
phantom) now resolve through assetSpecial, falling back to the standard face
art, and render inside the engine's border+tint+glow rather than replacing it.
A pack may opt a type out with \"frame\": false, but only for a die whose special
art actually resolved — otherwise an uncovered face would ship unmarked.

Splits phantom's ring out of extraCls so a secondary type's opt-out cannot
suppress it.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: The `blank` key and the leak guard

Faceless dice — a concealed phantom and a cracked die — get skinnable art, and the fallback chain that would have leaked a hidden face is proven closed.

**Files:**
- Test: `tools/verify-dyb-dice.js`

No production change: Task 4's resolution block already implements this. This task exists because the leak is the highest-consequence behaviour in the change and needs its own gate and its own commit in the history.

**Interfaces:**
- Consumes: the resolution block from Task 4.
- Produces: nothing new.

- [ ] **Step 1: Write the tests**

Add to `tools/verify-dyb-dice.js`, before the `// ── Result ──` block:

```js
section('Blank keys — faceless dice, and the leak guard');
setSkin(FACES_PLUS_SPECIALS); setCore(null);

const ghost = dybDieHTML(6, 'phantom', -1, 0);
check('concealed phantom uses the blank image, not the ? glyph',
  [imgUrl(ghost), glyphText(ghost)],
  ['data/packs/testskin/img/ghost.svg', null]);
check('concealed phantom art is framed and keeps its type class',
  [hasClass(ghost, 'dyb-die-framed'), hasClass(ghost, 'dyb-die-phantom')],
  [true, true]);
check('concealed phantom leaks no face: no pips, no digit',
  [ghost.includes('dyb-pip'), /[1-6]\.svg/.test(ghost)],
  [false, false]);

const ghostSpec = dybDieHTML(6, 'phantom', -1, -2);
check('spectator view is concealed the same way',
  [imgUrl(ghostSpec), glyphText(ghostSpec)],
  ['data/packs/testskin/img/ghost.svg', null]);

const crackedArt = dybDieHTML(5, 'cracked', -1);
check('cracked uses its blank image instead of the ✕ glyph',
  [imgUrl(crackedArt), glyphText(crackedArt)],
  ['data/packs/testskin/img/broken.svg', null]);

// ── THE LEAK GUARD ────────────────────────────────────────────────────────
// A pack that supplies phantom FACE art but no `blank` must fall back to the
// ? glyph — never to assetFace(val), which would render the concealed value.
// If anyone ever "simplifies" the two fallback chains in dybDieHTML into one,
// this is the check that fails.
const LEAKY = {
  kind: 'dyb', basePath: 'img/',
  faces: { '1': '1.svg', '2': '2.svg', '3': '3.svg', '4': '4.svg', '5': '5.svg', '6': '6.svg' },
  specials: { phantom: { '6': 'ph6.svg' }, cracked: { '5': 'cr5.svg' } },
};
setSkin(LEAKY);
const noLeak = dybDieHTML(6, 'phantom', -1, 0);
check('LEAK GUARD — phantom face art but no blank → ? glyph, no image',
  [glyphText(noLeak), imgUrl(noLeak)], ['?', null]);
check('LEAK GUARD — the concealed value 6 appears nowhere in the markup',
  /6/.test(noLeak.replace(/dyb-die-\d+/g, '')), false);
check('LEAK GUARD — cracked with no blank → ✕ glyph, no image',
  [glyphText(dybDieHTML(5, 'cracked', -1)), imgUrl(dybDieHTML(5, 'cracked', -1))],
  ['✕', null]);

section('Unassigned slick is never skinnable');
setSkin(FACES_PLUS_SPECIALS);
const unassigned = dybDieHTML(9, 'slick', 4, 0, false);
check('unassigned slick keeps its live "4*" glyph and takes no art',
  [glyphText(unassigned), imgUrl(unassigned), hasClass(unassigned, 'cursor-pointer')],
  ['4*', null, true]);
```

- [ ] **Step 2: Run to verify they pass**

Run: `node tools/verify-dyb-dice.js`
Expected: `ALL CHECKS PASSED`, exit 0.

These should pass immediately — Task 4 implemented the behaviour. **If the leak-guard checks FAIL, stop and fix `dybDieHTML`**, not the test: the `else if (artKey !== 'blank')` guard in the resolution block is the whole mechanism, and a failure here means a concealed phantom's face is reaching the DOM.

- [ ] **Step 3: Commit**

```bash
git add tools/verify-dyb-dice.js
git commit -m "test(dyb): gate the blank key and the phantom leak guard

Faceless dice (concealed phantom, cracked) resolve through the reserved blank
key. A pack supplying phantom FACE art but no blank must fall back to the ?
glyph and never to assetFace — asserted explicitly, because merging the two
fallback chains would silently reveal the concealed value.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Compound phantom at the Overlook

The hardest branch: a revealed phantom takes the *secondary* type's art and keeps its own indigo ring.

**Files:**
- Test: `tools/verify-dyb-dice.js`

No production change expected — Task 4's `switch` already routes all four secondaries. This task proves it, including that a secondary's `frame: false` cannot suppress phantom's ring.

**Interfaces:**
- Consumes: the `switch` and resolution block from Task 4.
- Produces: nothing new.

- [ ] **Step 1: Write the tests**

Add to `tools/verify-dyb-dice.js`, before the `// ── Result ──` block:

```js
section('Compound phantom — secondary art, phantom keeps its ring');
setSkin(FACES_PLUS_SPECIALS); setCore(null);

const pLoaded = dybDieHTML(3, 'phantom', -1, -1, true, 'loaded');
check('phantom+loaded resolves the LOADED art',
  imgUrl(pLoaded), 'data/packs/testskin/img/l3.svg');
check('phantom+loaded keeps the ring and the loaded chrome',
  [hasClass(pLoaded, 'dyb-die-phantom-ring'), hasClass(pLoaded, 'dyb-die-loaded'),
   hasClass(pLoaded, 'dyb-die-framed')],
  [true, true, true]);

const pSlick = dybDieHTML(9, 'phantom', 5, -1, true, 'slick');
check('phantom+slick resolves on the ASSIGNED face, not the roll',
  imgUrl(pSlick), 'data/packs/testskin/img/k5.svg');
check('phantom+slick keeps the ring', hasClass(pSlick, 'dyb-die-phantom-ring'), true);

const pCracked = dybDieHTML(4, 'phantom', -1, -1, true, 'cracked');
check('phantom+cracked resolves the cracked blank image, no face leaked',
  [imgUrl(pCracked), pCracked.includes('4.svg')],
  ['data/packs/testskin/img/broken.svg', false]);
check('phantom+cracked keeps the ring', hasClass(pCracked, 'dyb-die-phantom-ring'), true);

// snake opted out of its frame in FACES_PLUS_SPECIALS — the ring must survive it.
const pSnake = dybDieHTML(2, 'phantom', -1, -1, true, 'snake');
check('phantom+snake resolves the SNAKE art', imgUrl(pSnake), 'data/packs/testskin/img/s2.svg');
check('RING SURVIVES OPT-OUT — secondary frame:false does not suppress phantom\'s ring',
  [hasClass(pSnake, 'dyb-die-phantom-ring'), hasClass(pSnake, 'dyb-die-framed'),
   hasClass(pSnake, 'dyb-die-snake')],
  [true, false, false]);

section('Compound phantom — no art pack, chrome unchanged');
noArt();
const bareSnake = dybDieHTML(2, 'phantom', -1, -1, true, 'snake');
check('phantom+snake with no art → snake chrome, ring, diamond pips',
  [hasClass(bareSnake, 'dyb-die-snake'), hasClass(bareSnake, 'dyb-die-phantom-ring'),
   bareSnake.includes('dyb-pip-snake')],
  [true, true, true]);
const bareCracked = dybDieHTML(4, 'phantom', -1, -1, true, 'cracked');
check('phantom+cracked with no art → ✕ glyph plus the ring',
  [glyphText(bareCracked), hasClass(bareCracked, 'dyb-die-phantom-ring')],
  ['✕', true]);
```

- [ ] **Step 2: Run to verify they pass**

Run: `node tools/verify-dyb-dice.js`
Expected: `ALL CHECKS PASSED`, exit 0.

If `RING SURVIVES OPT-OUT` fails, `ringCls` was not carried into the unframed `.dyb-die-asset` return branch in Task 4 Step 4. Re-check that branch reads `class="dyb-die dyb-die-asset ${ringCls} select-none"`.

- [ ] **Step 3: Commit**

```bash
git add tools/verify-dyb-dice.js
git commit -m "test(dyb): gate compound phantom art resolution at the Overlook

All four secondaries resolve through the secondary type's art (slick on its
assigned face, cracked on its blank key), and phantom's indigo ring survives a
secondary type's frame opt-out.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: `deep-ocean-dice` gains a `specials` block

The live authoring reference. `deep-ocean-dice` is SVG, so its special dice are hand-written in-repo with no image pipeline.

**Files:**
- Modify: `data/packs/deep-ocean-dice/pack.json`
- Create: `data/packs/deep-ocean-dice/img/loaded-1.svg` … `loaded-6.svg`, `snake-1.svg` … `snake-6.svg`, `ghost.svg`, `broken.svg`

**Interfaces:**
- Consumes: the `specials` schema from Task 2.
- Produces: a working reference pack. `sea-cliff-dice` is deliberately left faces-only as the fallback path's live test.

- [ ] **Step 1: Read the existing art to match its visual language**

Run: `cat data/packs/deep-ocean-dice/img/4.svg`

Note the shared idiom every new file must follow: a `600×600` viewBox, a `rect` at `x=20 y=20 width=560 height=560 rx=80` filled from a `radialGradient`, an inner border glow, and pips as `circle r=52` with `filter="url(#pipGlow)"`. Pip centres come from the same 3×3 grid the CSS uses: columns/rows at `195`, `300`, `405`.

Pip positions per face (matching `DYB_PIP_LAYOUTS` in `js/games/dyb.js:1385`):

| Face | Pip centres (cx, cy) |
|------|----------------------|
| 1 | (300,300) |
| 2 | (405,195) (195,405) |
| 3 | (405,195) (300,300) (195,405) |
| 4 | (195,195) (405,195) (195,405) (405,405) |
| 5 | (195,195) (405,195) (300,300) (195,405) (405,405) |
| 6 | (195,195) (405,195) (195,300) (405,300) (195,405) (405,405) |

- [ ] **Step 2: Author the twelve special face SVGs**

For each face 1–6, copy `img/<n>.svg` to `img/loaded-<n>.svg` and change only the two `faceGrad` stops to amber and the two `pipGrad` stops to a hot core:

```xml
    <radialGradient id="faceGrad" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#B4801E"/>
      <stop offset="100%" stop-color="#5A3C08"/>
    </radialGradient>
    <radialGradient id="pipGrad" cx="35%" cy="30%" r="65%">
      <stop offset="0%" stop-color="#FFF0C0"/>
      <stop offset="100%" stop-color="#F59E0B"/>
    </radialGradient>
```

Then copy each to `img/snake-<n>.svg` with toxic-green stops, and swap every pip `<circle cx="X" cy="Y" r="52" .../>` for a rotated diamond so the shape reads as Snake even in monochrome:

```xml
    <radialGradient id="faceGrad" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#12704F"/>
      <stop offset="100%" stop-color="#042A20"/>
    </radialGradient>
    <radialGradient id="pipGrad" cx="35%" cy="30%" r="65%">
      <stop offset="0%" stop-color="#B8F5CE"/>
      <stop offset="100%" stop-color="#064E3B"/>
    </radialGradient>
```

```xml
  <!-- Pip: a diamond, not a circle — Snake reads by shape as well as by colour -->
  <rect x="-44" y="-44" width="88" height="88" rx="10" fill="url(#pipGrad)"
        filter="url(#pipGlow)" transform="translate(195 195) rotate(45)"/>
```

- [ ] **Step 3: Author the two blank SVGs**

`img/ghost.svg` — the concealed phantom. It must show **no pip pattern at all**; the whole point is that the value is unknown:

```xml
<svg viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="faceGrad" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#4C3D9E"/>
      <stop offset="100%" stop-color="#1A1140"/>
    </radialGradient>
    <radialGradient id="glyphGrad" cx="35%" cy="30%" r="65%">
      <stop offset="0%" stop-color="#E0DBFF"/>
      <stop offset="100%" stop-color="#8B7BE8"/>
    </radialGradient>
    <filter id="glyphGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect x="20" y="20" width="560" height="560" rx="80" ry="80" fill="url(#faceGrad)"/>
  <rect x="20" y="20" width="560" height="560" rx="80" ry="80"
        fill="none" stroke="#7C6BD8" stroke-width="3" opacity="0.6"/>
  <text x="300" y="300" text-anchor="middle" dominant-baseline="central"
        font-family="Fredoka, sans-serif" font-size="300" font-weight="700"
        fill="url(#glyphGrad)" filter="url(#glyphGlow)">?</text>
</svg>
```

`img/broken.svg` — the cracked die. Drained of colour, with a fracture:

```xml
<svg viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="faceGrad" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#4A4A48"/>
      <stop offset="100%" stop-color="#232322"/>
    </radialGradient>
  </defs>
  <rect x="20" y="20" width="560" height="560" rx="80" ry="80" fill="url(#faceGrad)"/>
  <rect x="20" y="20" width="560" height="560" rx="80" ry="80"
        fill="none" stroke="#5C5C5A" stroke-width="3" opacity="0.5"/>
  <path d="M180 90 L300 250 L240 300 L360 520" fill="none"
        stroke="#8A8A88" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M300 250 L430 210" fill="none"
        stroke="#8A8A88" stroke-width="10" stroke-linecap="round"/>
</svg>
```

- [ ] **Step 4: Add the `specials` block to the manifest**

Replace `data/packs/deep-ocean-dice/pack.json` in full:

```json
{
  "id": "deep-ocean-dice",
  "label": "DEEP OCEAN DICE",
  "locked": false,
  "games": [
    "dyb"
  ],
  "assets": {
    "kind": "dyb",
    "basePath": "img/",
    "faces": {
      "1": "1.svg",
      "2": "2.svg",
      "3": "3.svg",
      "4": "4.svg",
      "5": "5.svg",
      "6": "6.svg"
    },
    "back": "back.svg",
    "specials": {
      "loaded": {
        "1": "loaded-1.svg",
        "2": "loaded-2.svg",
        "3": "loaded-3.svg",
        "4": "loaded-4.svg",
        "5": "loaded-5.svg",
        "6": "loaded-6.svg"
      },
      "snake": {
        "frame": false,
        "1": "snake-1.svg",
        "2": "snake-2.svg",
        "3": "snake-3.svg",
        "4": "snake-4.svg",
        "5": "snake-5.svg",
        "6": "snake-6.svg"
      },
      "phantom": {
        "blank": "ghost.svg"
      },
      "cracked": {
        "blank": "broken.svg"
      }
    }
  }
}
```

This deliberately exercises every key shape: per-type faces (`loaded`), the frame opt-out (`snake` — its art carries its own colour and diamond pips, so it needs no engine chrome), the reserved `blank` key (`phantom`, `cracked`), and an omitted type (`slick`, which therefore falls back to the standard face art inside a cyan engine frame — the Option-A path, live).

- [ ] **Step 5: Verify the manifest parses and every referenced file exists**

Run:
```bash
node -e "
const m=require('./data/packs/deep-ocean-dice/pack.json'), fs=require('fs');
const a=m.assets, base='data/packs/deep-ocean-dice/'+(a.basePath||'');
let miss=0;
const want=[a.back, ...Object.values(a.faces||{})];
for (const [t,e] of Object.entries(a.specials||{}))
  for (const [k,v] of Object.entries(e)) if (k!=='frame') want.push(v);
want.forEach(f=>{ if(!fs.existsSync(base+f)){ console.log('MISSING '+base+f); miss++; } });
console.log(miss? miss+' missing' : 'all '+want.length+' files present');
process.exit(miss?1:0);"
```
Expected: `all 21 files present`, exit 0.

- [ ] **Step 6: Run the harness**

Run: `node tools/verify-dyb-dice.js`
Expected: `ALL CHECKS PASSED`, exit 0. The harness uses its own fixtures, so this only proves nothing regressed.

- [ ] **Step 7: Commit**

```bash
git add data/packs/deep-ocean-dice/
git commit -m "feat(packs): deep-ocean-dice gains special Tempest dice

Hand-authored SVG loaded and snake faces, plus blank art for the concealed
phantom and the cracked die. Exercises every key shape in the new specials
block: per-type faces, the frame opt-out (snake carries its own colour and
diamond pips), the reserved blank key, and an omitted type (slick falls back to
the standard face inside a cyan engine frame).

sea-cliff-dice stays faces-only on purpose — it is the fallback path's live test.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: SW bump, manual pass, and documentation closure

**Files:**
- Modify: `sw.js:4`
- Modify: `docs/expansion-guide.md`, `docs/code-map.md`, `docs/rules/game-identities.md`, `docs/implementation-notes/dyb-implementation-notes.md`, `docs/decision-log.md`, `docs/deferred-work.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: everything above.
- Produces: a shippable version.

- [ ] **Step 1: Bump the service worker cache version**

`js/lib/art.js`, `js/games/dyb.js` and `css/styles.css` are all in `PRECACHE_URLS` (lines 29, 21, 9), so the change is invisible to an installed device without a bump. `data/packs/` is runtime-cached and needs no entry — do **not** add the new SVGs to `PRECACHE_URLS`.

In `sw.js` line 4:
```js
const CACHE_NAME = 'sylly-games-v155';
```

- [ ] **Step 2: Run the full harness suite**

Run:
```bash
node tools/verify-dyb-dice.js && node tools/verify-pko-chain.js && node tools/verify-pko-loop.js && node tools/verify-pko-events.js
```
Expected: all four print their pass line and exit 0. The three PKO harnesses are unrelated to this change and must be untouched — if any fails, `art.js` broke a shared resolver.

- [ ] **Step 3: Manual pass in the browser**

Serve the app and check, in this order:

1. Konami terminal → `GAME SKINS` → The Bluff → **DEEP OCEAN DICE** → launch.
2. The Bluff → Settings → **Sylly Mode ON**, Chaos level **10** (maximum special density).
3. Play a Shake. Confirm on your own hand: loaded dice show amber art *inside* the pulsing amber frame; snake dice show green diamond-pip art with **no** engine border; a concealed phantom shows the `?` ghost art; a cracked die shows the fracture art; an unassigned Slick still shows its tappable `4*` digit.
4. Assign a Slick face — it should become the **standard** deep-ocean face art inside a cyan frame (slick is omitted from the manifest on purpose).
5. Call the Bluff and reach the Overlook. Confirm compound phantoms show the secondary type's art with the indigo ring around it.
6. Switch to **SEA CLIFF DICE** and repeat step 3. Every special die should show standard face art inside its engine type frame — this is the fallback path.

- [ ] **Step 4: Update `docs/expansion-guide.md`**

Two edits.

First, in the `faces` id cheat-sheet, replace the DYB row (line 219) — it currently claims special dice cannot be skinned:

```markdown
| The Bluff | `dyb` | die face value `1`–`6`, plus an optional `specials` block for the five Tempest die types — see below | square |
```

Second, add a new subsection immediately after the cheat-sheet table and its `> **Tip:**` paragraph (which ends at line 223), before the `---` separator:

````markdown
### Optional: `specials` — art for a face that carries a *type*

Some games modify a face without changing its value. The Bluff's Sylly Mode
(**The Tempest**) turns dice into one of five types — `loaded`, `phantom`, `slick`,
`cracked`, `snake` — and the type has to stay readable at a glance no matter what
art you supply. The optional `specials` block is how you skin those.

```json
"assets": {
  "kind": "dyb", "basePath": "img/",
  "faces": { "1": "1.svg", "…": "…", "6": "6.svg" },
  "back":  "back.svg",
  "specials": {
    "loaded":  { "1": "l1.svg", "…": "…", "6": "l6.svg" },
    "snake":   { "3": "s3.svg", "frame": false },
    "phantom": { "blank": "ghost.svg" },
    "cracked": { "blank": "broken.svg" }
  }
}
```

Three key shapes inside a type:

| Key | Meaning |
|-----|---------|
| `"1"`–`"6"` | That type showing that face value |
| `"blank"` | That type when it shows **no** face value — a concealed phantom, a cracked die |
| `"frame"` | Boolean, default `true` — see below |

**The frame is the type; the image is the face.** By default the engine still draws
its own coloured border, tint and glow *around* your art, so a Loaded die is
unmistakably loaded however you paint it. Anything you leave out falls back to the
plain face from `faces`, still framed — so a `specials`-less pack already looks
right, and a partial one degrades instead of breaking.

Set `"frame": false` on a type when your art already carries that identity itself
and the engine border would just double it up. Two things you should know before you
do: the opt-out is **ignored** for any face you didn't supply (otherwise a missing
face would quietly ship an unmarked die), and you are taking responsibility for
keeping that type distinguishable from the other four.

**`"blank"` never falls back to a face image.** If you supply phantom face art but no
`blank`, a concealed phantom draws the engine's `?` glyph — it will not fall back to
`faces`, because that would render the hidden value and leak it to the whole table.

**Not everything is skinnable.** An unassigned Slick keeps its engine `4*` glyph: the
digit is the live auto-rolled face the player needs in order to choose, not decoration.

`data/packs/deep-ocean-dice/` is a complete working example — it uses per-type faces,
the frame opt-out, both `blank` keys, and one deliberately omitted type.
`data/packs/sea-cliff-dice/` is deliberately faces-only, so you can see the fallback.

Verify any change to this seam with `node tools/verify-dyb-dice.js`.
````

- [ ] **Step 5: Update `docs/code-map.md`**

Grep for the art seam table (`grep -n "assetExtra\|assetFace" docs/code-map.md`), then offset-Read that slice and add `assetSpecial(kind, type, id)` and `assetSpecialFrame(kind, type)` beside the existing three resolvers, plus a note that `dybDieHTML` now has three output shapes (framed asset, edge-to-edge asset, glyph/pips). Do **not** read the file whole — it is ~132 KB.

- [ ] **Step 6: Update `docs/rules/game-identities.md` § Game 10**

Grep for `The Tempest — five special die types`, offset-Read that slice (around line 979), and append after the five-bullet type list:

```markdown
**Skinning the Tempest dice:** all five types are skinnable via the asset manifest's
optional `specials` block — face keys `1`–`6`, the reserved `blank` key for the
faceless dice (concealed phantom, cracked), and `"frame": false` to opt a type out of
the engine's border/tint/glow. The engine frame is the type signal by default, so a
skin cannot make a type illegible by accident. An unassigned Slick is deliberately
never skinned — its `4*` glyph carries the live auto-rolled face. See
`docs/expansion-guide.md` § `specials`.
```

- [ ] **Step 7: Update `docs/implementation-notes/dyb-implementation-notes.md`**

The file already carries three `## Design Decisions` blocks (lines 3, 195, 309), each appended as
a dated continuation rather than merged. Follow that pattern — append a **new** section at the end
of the file:

```markdown
## Design Decisions (continued — August 2026, Tempest asset seam)

### The frame is the type, the image is the face

**What happened:** DYB's asset seam was gated to `type === 'standard'` because
`.dyb-die-asset` sets `border-color: transparent; padding: 0`, discarding every
channel the type `switch` had just computed. A skinned hand mixed real art with raw
CSS pips.

**Root cause:** the seam replaced the whole die rather than its face. Type identity
lived in four channels (border, tint, glow, pip colour) and three of them are things
an image covers.

**Lesson:** when a render seam has to preserve a signal, give the signal its own DOM
layer instead of asking the art to carry it. `.dyb-die-framed` keeps the frame on the
outer div and insets the art in a child — so the engine keeps every channel that
lives outside the image, and the pack owns everything inside it.

### A skin opt-out must be provenance-gated

`"frame": false` lets a pack suppress the engine chrome for a type. It applies **only**
to a die whose special art actually resolved. Without that gate, a pack that opts out
and then omits one face ships a die that is neither marked by the engine nor by the
art — the exact failure the frame exists to prevent.

### `blank` keys must not share the face fallback chain

**What happened:** the first draft of the resolver was one chain,
`assetSpecial(...) || assetFace(val)`. For a concealed phantom that is a
hidden-information leak: the real rolled value *is* passed to `dybDieHTML` as `val`
and only the `?` glyph hides it, so a pack with phantom face art but no `blank` would
have rendered the true face to its owner and to every spectator on the Depths screen.

**Root cause:** treating "no art for this key" as one situation when it is two —
"draw the plain face instead" and "draw nothing that reveals anything".

**Lesson:** a fallback chain crossing a privacy boundary needs its own branch, and a
test that names the leak. `tools/verify-dyb-dice.js` asserts the concealed value
appears nowhere in the markup, so a future tidy-up that merges the chains fails loudly.
```

- [ ] **Step 8: Update `docs/decision-log.md`**

The file's own stated format is `## YYYY-MM-DD — Short title` followed by a `Category:` line and
~4 lines that *point* rather than re-explain. Read the top existing entry first to copy its exact
shape, then insert this directly above it (newest on top):

```markdown
## 2026-08-01 — Shared asset manifest gains an optional `specials` block
Category: Architecture
A face that carries a *type* on top of its value (DYB's five Tempest dice) can now be skinned.
Engine chrome stays the type signal by default, the per-type opt-out is provenance-gated, and a
reserved `blank` key covers faceless dice without sharing the face fallback chain — which would
have leaked a concealed phantom's real value. Additive and optional; no existing pack or game is
affected.
Detail: `docs/superpowers/specs/2026-08-01-dyb-tempest-asset-seam-design.md`.
```

- [ ] **Step 9: Check `docs/deferred-work.md` — expect nothing to close**

Run: `grep -n -i "dyb\|dice\|tempest" docs/deferred-work.md`
Expected: **no hits.** The DYB special-dice limitation was never recorded there — it lived only as
the caveat in the `expansion-guide.md` cheat-sheet, which Step 4 rewrites. If this grep *does*
return a hit, mark that item **Closed** citing SW v155 and the spec path rather than deleting it;
the list is a history as well as a queue.

- [ ] **Step 10: Update `CLAUDE.md`**

Three edits:
1. `**SW Version:**` → v155, with a short parenthetical describing this change; move the outgoing v154 notes to `docs/sw-changelog.md`, per the file's own standing rule.
2. In the **Core art tier** paragraph, correct the stale claim that a bundled `neon-dice` pack exists — the two live DYB skins are `sea-cliff-dice` and `deep-ocean-dice`. (`neon-dice` is also named in the Cartridge Phase B paragraph; fix both.)
3. Add `node tools/verify-dyb-dice.js` to the harness list so future sessions know to re-run it.

Also update the **Current SW version** line in `.claude/rules/logic-engine.md` (it currently reads v152 and is already stale — set it to v155).

- [ ] **Step 11: Final verification**

Run:
```bash
node tools/verify-dyb-dice.js && node tools/verify-pko-chain.js && node tools/verify-pko-loop.js && node tools/verify-pko-events.js && grep -n "CACHE_NAME" sw.js | head -1
```
Expected: four pass lines, then `4:const CACHE_NAME = 'sylly-games-v155';`.

- [ ] **Step 12: Commit**

```bash
git add sw.js docs/ CLAUDE.md .claude/rules/logic-engine.md
git commit -m "docs(dyb): close the Tempest asset seam — SW v155

Documents the specials block in the expansion guide (authoring steps, the three
key shapes, the frame contract and the blank-key rule), records the three design
decisions in dyb-implementation-notes, logs the schema addition in the decision
log, and closes the deferred-work item.

Also corrects two stale CLAUDE.md references to a neon-dice pack that does not
exist, and the stale SW version in logic-engine.md.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage**

| Spec section | Task |
|---|---|
| § 3 schema (`specials`, three key shapes, `blank` naming) | 2, 7, 8 |
| § 4 resolvers, per-key fallthrough, split fallback chains | 2, 4, 5 |
| § 5 frame contract, provenance gate, ring always draws, slick not skinnable | 4, 5, 6 |
| § 6a `artType`/`artKey` table incl. all four compounds | 4, 6 |
| § 6b art check above the glyph return | 4, 5 |
| § 6c framed DOM + CSS + `.dyb-die-asset` untouched | 4 |
| § 6d `visible` param dropped, 6 call sites | 3 |
| § 7 harness matrix incl. leak guard and regression guards | 1, 2, 4, 5, 6 |
| § 8 demo art on `deep-ocean-dice`, `sea-cliff-dice` left faces-only, `neon-dice` correction | 7, 8 |
| § 9 files touched, `index.html` untouched, SW bump | 4, 7, 8 + Global Constraints |
| § 10 all seven doc updates | 8 |

No gaps.

**2. Placeholder scan**

No TBD/TODO, no "add error handling", no "similar to Task N". Every code step carries the real content.

Three Task 8 targets were checked against the repo rather than assumed, and two were wrong in the
first draft: `dyb-implementation-notes.md` appends dated `## Design Decisions (continued — …)`
sections rather than one merged block (Step 7 now matches), and `decision-log.md` uses
`## YYYY-MM-DD — Title` plus a `Category:` line, not `###` (Step 8 now matches). The third —
`deferred-work.md` — turned out to hold **no** DYB item at all despite the spec implying one, so
Step 9 is now a confirming grep rather than an edit.

**3. Type consistency**

`assetSpecial(kind, type, id)` and `assetSpecialFrame(kind, type)` keep those exact names and argument orders in Tasks 2, 4 and the docs. `artType` / `artKey` / `ringCls` / `framed` / `url` are named identically in Task 4's code and in Tasks 5–6's failure diagnostics. Harness helpers (`setSkin`, `setCore`, `noArt`, `check`, `section`, `classesOf`, `hasClass`, `imgUrl`, `glyphText`) are defined once in Task 1 and used with those names throughout. Fixture constants `FACES`, `FACES_PLUS_SPECIALS`, `CORE_SPECIALS`, `LEAKY` are each defined once. The six-parameter `dybDieHTML` signature introduced in Task 3 is used consistently in Tasks 4–6.

One deliberate inconsistency: Task 1's calls use the **old** seven-parameter signature and Task 3 Step 2 rewrites them. Tasks executed out of order would break here — Task 3 must not be skipped or reordered.
