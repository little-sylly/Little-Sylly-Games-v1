# Premium Shell Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Join the Premium lounge sandbox (`wip/premium/`) to the lobby-lab sandbox (`wip/lobby-lab/`) behind a new full-window `shell.html` that hosts all four lobby layouts, with the room's props as real doors — and, under a `?live` URL flag, the controller prop reaching the real shipped `ctlOpenWorkshop()`.

**Architecture:** A pure state machine (`shell-router.js`) owns the shell's view/room/workshop state. A pure factory (`shell-host.js`) builds the object that satisfies `wip/premium/prm-scene.js`'s host contract, translating each door into a router action. `shell.html` is the only file that touches the DOM: it mounts the Premium canvas, the Lounge (TV) and the phone layouts into the three ids `lobby.js` already targets, applies router state to the page, and — under `?live` — injects the shipped `_shell.html`/`_sound.html` partials plus `engine.js` and `controller.js`.

**Tech Stack:** Vanilla ES6+ globals, no build step, no new dependencies. Three.js r128 (already vendored, shared by the room and the Workshop). Node for the two pure harnesses; Playwright (from `~/.claude-tooling/playwright`) for the browser harness.

**Spec:** `docs/superpowers/specs/2026-09-19-premium-shell-wiring-design.md`

---

## Global Constraints

Every task's requirements implicitly include this section.

- **Sandbox only.** Nothing outside `wip/` may be edited. `index.html`, `sw.js`, `src/screens/*` and `js/*` are **read** by the shell at runtime and **never** modified. No `CACHE_NAME` bump; nothing ships.
- **No build step, no new dependencies.** Plain `<script>` tags and `window` globals, matching every other file in `wip/lobby-lab/` and `wip/premium/`.
- **Dual export idiom**, used by every sandbox module: `if (typeof module !== 'undefined') module.exports = api;` and `if (typeof window !== 'undefined') window.<Name> = api;` — both guarded, so one file serves Node and the browser.
- **Pure modules stay pure.** `shell-router.js` and `shell-host.js` touch no DOM, no `window`, no timers, no `Date.now()`, no `Math.random()` — the same contract as `js/lib/physics.js` and `wip/lobby-lab/lounge.js`'s pure half.
- **Node harnesses are zero-dependency** and exit 1 on any failure: `let pass = 0, fail = 0;` with `ok`/`eq` helpers, exactly as `wip/lobby-lab/verify-lounge.js` does.
- **Poll, never sleep, in Playwright.** Headless SwiftShader renders at ~3.5 fps; every wait is a `waitForFunction` on a real condition, never a fixed `waitForTimeout` standing in for one.
- **Australian English** in all comments and copy: colour, behaviour, organise. Metric units.
- **Existing harnesses must keep passing unchanged**: `node wip/premium/verify-prm-props.js` (389 checks before this round) and `node wip/premium/visual-prm.js` (18 checks). Neither `wip/premium/index.html` nor `wip/lobby-lab/index.html` nor `wip/lobby-lab/tv.html` is edited.
- **Eligibility floor:** `prmEligible(w, h, webgl)` is `w >= 900 && h >= 500 && !!webgl` — TV mode's floor (`LB_TV_MIN_W`/`LB_TV_MIN_H`), reused. Never device-sniff.
- **Commit after every task.** Commit messages end with:
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

### Two corrections to the spec, carried into this plan

Both were found by reading the code the spec describes. Neither changes a decision (W1–W7); both add work the spec's file table omits.

1. **W5 needs a `stop()`/`resume()` pair that does not exist.** The spec asserts (§ 7.3) that leaving Premium "stops its RAF — read via `window.prmDebug.isRunning()`". It cannot today: `prm-scene.js:248` runs a 10 fps attract-texture `setInterval` whose only guard is `document.hidden`, and it calls `wake()` on every tick. Hiding the canvas with CSS leaves the render loop running forever. Task 1 adds `api.stop()` / `api.resume()` and a `paused` flag that gates `wake()`, the frame re-schedule and the attract interval. This is a **fourth** edit to `prm-scene.js`, beyond the three in spec § 3.

2. **The existing `contracts` section hard-codes "exactly one optional action".** `wip/premium/verify-prm-props.js:379` asserts `Object.values(A).filter(a => a.optional).length === 1`, and its `HOST` set (line 376) does not contain `openJukebox`. Making `jukebox-knob` optional breaks both. Task 1 updates them — they are pre-existing assertions, not new ones, so the section count moves rather than the file gaining a new section for them.

Two deliberate refinements of spec § 5.2, both documented in code comments:

- `enterTV`, `enterShelves` and `workshopOpen` set `room` via `room === 'absent' ? 'absent' : 'idle'` rather than a flat `'idle'`. A flat `'idle'` claims a room exists when none was ever built, which the applier would then have to defend against. `go` keeps the spec's literal form (`premium ? 'running' : …`) because § 7.1 explicitly wants a `go` to premium from `'absent'` to read as `'running'` — `room` is the shell's *intent* ("should this be rendering?"), and mounting is the page's job.
- `workshopClose` sets `room` to `'running'` only when a room exists (`room === 'absent' ? 'absent' : 'running'`), for the same reason.

---

## File Structure

**Five new files, all in `wip/lobby-lab/`:**

| File | Responsibility |
|---|---|
| `shell-router.js` | The pure state machine. Exports `SHELL_INIT`, `SHELL_VIEWS`, `shellReduce(state, action)`. No DOM, no `window`, no timers. |
| `shell-host.js` | Exports `shellCreateHost(deps)` → the object satisfying `PRM_REQUIRED`, and `SHELL_DOORS` — the door→action map, as data the harness can read. No DOM. |
| `shell.html` | The page. The only file here that touches the DOM: mount areas, the applier, the summonable dock, the `?live` loader, the `lbSet` and `ctlCloseWorkshop` wrappers. Chrome CSS inline. |
| `verify-shell.js` | Node harness over the router and the door map. Zero deps. |
| `visual-shell.js` | Playwright harness. Created in Task 4, extended in Tasks 5 and 6. |

**Three edited files, all in `wip/premium/`:**

| File | Change |
|---|---|
| `prm-props.js` | One line: `jukebox-knob` moves off `openSound` onto `openJukebox`. |
| `prm-scene.js` | Generalise the optional-callback branch; add `PRM_OPTIONAL_FUNCS`; extend `prmValidateHost`; export `PRM_FUNCS` + `PRM_OPTIONAL_FUNCS`; add `stop()`/`resume()`. |
| `verify-prm-props.js` | One new section above `dial`; two updates to the existing `contracts` section. |

**Why `visual-shell.js` is created in Task 4, not Task 6 (spec § 8 step 6):** `shell.html` has no pure surface, so a task that builds it with no automated check is a task a reviewer cannot gate. Creating the harness alongside the page keeps every task independently testable, and the file still reaches its full § 7.3 scope by Task 6. Spec § 8's review points are unchanged: Task 4 is the first owner walkthrough, Task 5 is the one that earns the round.

---

## Task 1: The dormant jukebox door, the generalised optional branch, and the room's stop switch

**Files:**
- Modify: `wip/premium/prm-props.js:18`
- Modify: `wip/premium/prm-scene.js:23`, `:26-34`, `:169-192`, `:255-273`, `:281-293`, `:323`
- Modify: `wip/premium/verify-prm-props.js:376`, `:379`, and a new section above `:429`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `PrmScene.PRM_FUNCS` — `['enterTV','enterShelves','openWorkshop','openSound','openSwitcher']` (newly exported; Tasks 2–3 read it).
  - `PrmScene.PRM_OPTIONAL_FUNCS` — `['openStickerbook','openJukebox']` (new).
  - `api.stop()` → `undefined`. Cancels the pending RAF, sets `paused`, and silences the attract interval. Idempotent.
  - `api.resume()` → `undefined`. Clears `paused`, re-reads the canvas size, and wakes the loop. Idempotent.
  - `window.prmDebug.isRunning()` — unchanged signature (`() => boolean`), now false after `stop()`.

- [ ] **Step 1: Write the failing assertions**

Open `wip/premium/verify-prm-props.js`. Insert this **whole section immediately above** the line `section('dial');` (currently line 429). It must go above that section because `dial` ends in an async `finish()` that exits the process.

```js
section('shell-doors');
{
  const A = PrmProps.PRM_ACTIONS;
  const S = require(path.join(ROOT, 'wip/premium/prm-scene.js'));

  // W4 — the knob is a dormant door to the undecided karaoke/jukebox feature,
  // not the sound overlay it was wrongly pointed at.
  eq(A['jukebox-knob'].callback, 'openJukebox', 'the jukebox knob names openJukebox');
  ok(A['jukebox-knob'].optional === true, 'the jukebox knob is optional');
  ok(A['jukebox-knob'].turn === true, 'the jukebox knob turns — a dormant door still feels alive');
  ok(!A['jukebox-knob'].fallback, 'the knob needs no named fallback: the turn IS the response');
  eq(Object.values(A).filter(a => a.callback === 'openSound').length, 1, 'openSound survives at exactly one site');
  eq(A['tv-volume'].callback, 'openSound', "and that site is the telly's volume dial");

  // A dormant door may never be silent.
  Object.entries(A).filter(([, a]) => a.optional).forEach(([id, a]) => {
    ok(a.turn || a.spin || a.pushIn || a.fallback,
       `optional door "${id}" answers a tap (turn/spin/pushIn or a named fallback)`);
  });

  // The optional-function contract, generalised off the hardcoded openStickerbook name.
  ok(Array.isArray(S.PRM_OPTIONAL_FUNCS), 'prm-scene exports PRM_OPTIONAL_FUNCS');
  ok(S.PRM_OPTIONAL_FUNCS.includes('openStickerbook'), 'openStickerbook is optional');
  ok(S.PRM_OPTIONAL_FUNCS.includes('openJukebox'), 'openJukebox is optional');
  ok(Array.isArray(S.PRM_FUNCS) && S.PRM_FUNCS.length === 5, 'prm-scene exports PRM_FUNCS (5 callables)');
  S.PRM_OPTIONAL_FUNCS.forEach(k => ok(!S.PRM_REQUIRED.includes(k), `PRM_REQUIRED does not contain ${k}`));

  const base = { games: GAMES, stickers: {}, design: {}, lampPanels: {}, music: {},
                 enterTV() {}, enterShelves() {}, openWorkshop() {}, openSound() {}, openSwitcher() {} };
  S.PRM_OPTIONAL_FUNCS.forEach(k => {
    ok(S.prmValidateHost(Object.assign({}, base)) === true, `a host with no ${k} is accepted`);
    ok(S.prmValidateHost(Object.assign({}, base, { [k]: () => {} })) === true, `a host with ${k} as a function is accepted`);
    let threw = false;
    try { S.prmValidateHost(Object.assign({}, base, { [k]: 'nope' })); } catch (_) { threw = true; }
    ok(threw, `a host with ${k} as a non-function is rejected`);
  });
}
```

Then fix the two pre-existing assertions this change invalidates.

`wip/premium/verify-prm-props.js:376` — add `openJukebox` to the `HOST` set:

```js
  const HOST = new Set(['enterTV', 'enterShelves', 'openWorkshop', 'openSound', 'openSwitcher', 'openStickerbook', 'openJukebox', 'music.next']);
```

`wip/premium/verify-prm-props.js:379` — two optional actions now, not one:

```js
  eq(Object.values(A).filter(a => a.optional).length, 2, 'exactly two optional actions (the binder and the jukebox knob)');
```

- [ ] **Step 2: Run the harness to verify it fails**

Run: `node wip/premium/verify-prm-props.js`

Expected: FAIL. Roughly a dozen failures naming `[shell-doors]` and `[contracts]` — `the jukebox knob names openJukebox — got "openSound", want "openJukebox"`, `prm-scene exports PRM_OPTIONAL_FUNCS`, `prm-scene exports PRM_FUNCS (5 callables)`, and `exactly two optional actions … got 1, want 2`. Exit code 1.

- [ ] **Step 3: Point the jukebox knob at its own door**

In `wip/premium/prm-props.js`, replace line 18:

```js
    'jukebox-knob':   { callback: 'openSound' },
```

with:

```js
    /* W4 — a dormant door to the undecided karaoke/jukebox feature, NOT the
       sound overlay (that is the telly's volume dial). Nobody supplies
       openJukebox this round, so the turn is the whole response: tweenTurn
       writes node.rotation.y, and the knob is a CylinderGeometry whose local
       Y is its axis — Three's default XYZ Euler applies Ry before the mesh's
       own x = PI/2 tilt, so it spins about itself and the tilt faces it at
       the camera. Deliberately absent from PRM_TAB_ORDER: a tab stop on a
       door that goes nowhere is a question for the round that builds it. */
    'jukebox-knob':   { callback: 'openJukebox', optional: true, turn: true },
```

- [ ] **Step 4: Name the optional callbacks once, and validate them as a set**

In `wip/premium/prm-scene.js`, after line 23 (`const PRM_FUNCS = …`), add:

```js
  /* Optional host callbacks: absent is fine (the door is dormant), present
     must be a function. Adding a third dormant door means adding it here and
     flagging its action `optional: true` — no third hardcoded name. */
  const PRM_OPTIONAL_FUNCS = ['openStickerbook', 'openJukebox'];
```

Then in `prmValidateHost`, replace the single `openStickerbook` line (line 31):

```js
    if (host.openStickerbook !== undefined && typeof host.openStickerbook !== 'function') throw new Error('prmMount: host.openStickerbook must be a function when given');
```

with:

```js
    PRM_OPTIONAL_FUNCS.forEach(k => { if (host[k] !== undefined && typeof host[k] !== 'function') throw new Error('prmMount: host.' + k + ' must be a function when given'); });
```

- [ ] **Step 5: Generalise the optional branch in `activate()`**

In `wip/premium/prm-scene.js`, replace the hardcoded branch (lines 180-184):

```js
      if (a.callback === 'openStickerbook') {
        if (typeof host.openStickerbook === 'function') host.openStickerbook();
        else built.binder.userData.api[a.fallback](reduced());
        wake(); return;
      }
```

with:

```js
      /* A dormant door: call the host callback if this host supplies one,
         otherwise fall back to the prop's own api when the action names one.
         a.turn has already fired above, which is the jukebox knob's whole
         response. Flag-driven, so a third dormant door needs no third name. */
      if (a.optional) {
        if (typeof host[a.callback] === 'function') host[a.callback]();
        else if (a.fallback && built[id] && built[id].userData.api) built[id].userData.api[a.fallback](reduced());
        wake(); return;
      }
```

- [ ] **Step 6: Export `PRM_FUNCS` and `PRM_OPTIONAL_FUNCS`**

In `wip/premium/prm-scene.js`, replace line 323:

```js
  const api = { prmMount, prmValidateHost, prmEligible, prmReducedMotion, prmBuildEnvMap, PRM_PRESETS, PRM_REQUIRED };
```

with:

```js
  const api = { prmMount, prmValidateHost, prmEligible, prmReducedMotion, prmBuildEnvMap, PRM_PRESETS, PRM_REQUIRED, PRM_FUNCS, PRM_OPTIONAL_FUNCS };
```

- [ ] **Step 7: Run the harness to verify the door checks pass**

Run: `node wip/premium/verify-prm-props.js`

Expected: PASS, and the count risen from 389. Exit code 0. The `stop()`/`resume()` assertions come next — they belong to the browser tier, so nothing here covers them yet.

- [ ] **Step 8: Add `stop()` and `resume()` to the scene api**

This is the spec correction from Global Constraints. Three edits in `wip/premium/prm-scene.js`.

**8a.** Replace line 255-257:

```js
    // render on demand: run while something animates, then stop
    let last = 0, frames = 0;
    function wake() { if (timers.raf === null) timers.raf = requestAnimationFrame(frame); }
```

with:

```js
    // render on demand: run while something animates, then stop
    /* `paused` is the shell's stop switch (W5): a hidden room must cost
       nothing, and CSS alone cannot do it — the attract interval below calls
       wake() ten times a second whatever the canvas's display is. Stopping is
       NOT disposing: rebuilding re-runs every procedural texture and the PMREM
       pass, which is the whole reason the room is kept. */
    let last = 0, frames = 0, paused = false;
    function wake() { if (!paused && timers.raf === null) timers.raf = requestAnimationFrame(frame); }
```

**8b.** In `frame()`, replace line 273:

```js
      if (active) timers.raf = requestAnimationFrame(frame); else last = 0;
```

with:

```js
      if (active && !paused) timers.raf = requestAnimationFrame(frame); else last = 0;
```

**8c.** In the attract `setInterval` (line 248), add `paused` to the existing skip guard. Replace:

```js
      if (document.hidden) return;
```

with:

```js
      if (document.hidden || paused) return;
```

Note `paused` is declared *after* this interval in source order but is only read inside the callback, which first runs 100 ms later — by then the `let` is initialised.

**8d.** Add the two methods to the `api` object (line 281-293), immediately after `resetView, activate, focus, built, nodes,`:

```js
      stop() { paused = true; if (timers.raf !== null) cancelAnimationFrame(timers.raf); timers.raf = null; last = 0; },
      resume() { paused = false; resize(); },
```

`resize()` already sets `shadowDirty` and calls `wake()`, so a room that was hidden at a different window size comes back correctly sized in one call.

- [ ] **Step 9: Prove `stop()` under Node — a smoke check, not a harness assertion**

`prmMount` needs a WebGL context, so `verify-prm-props.js` cannot reach `stop()`; `visual-shell.js` asserts it for real in Task 6. Confirm here only that the module still parses and still exports cleanly:

Run: `node -e "const S=require('./wip/premium/prm-scene.js'); console.log(S.PRM_FUNCS.join(','), '|', S.PRM_OPTIONAL_FUNCS.join(','));"`

Expected: `enterTV,enterShelves,openWorkshop,openSound,openSwitcher | openStickerbook,openJukebox`

- [ ] **Step 10: Confirm nothing regressed in the prop lab**

Run: `node wip/premium/verify-prm-props.js`
Expected: PASS, 0 failed.

Run: `NODE_PATH="$HOME/.claude-tooling/playwright/node_modules" node wip/premium/visual-prm.js`
Expected: PASS, 18 passed, 0 failed. `wip/premium/index.html` supplies no `openJukebox`, so the knob is dormant there and nothing on that page changes.

- [ ] **Step 11: Commit**

```bash
git add wip/premium/prm-props.js wip/premium/prm-scene.js wip/premium/verify-prm-props.js
git commit -m "feat(premium): the jukebox knob becomes a dormant door, and the room learns to stop

The knob pointed at openSound, which was simply wrong — the sound overlay is
the telly's volume dial. It becomes openJukebox: optional, dormant, and
answering a tap with its own turn, following the openStickerbook precedent.
activate()'s optional branch is now flag-driven rather than matching that one
callback by name, so a third dormant door needs no third hardcoded name.

Also adds api.stop()/resume(). The shell hides the room when you leave Premium
and must stop it too — CSS alone cannot: the 10 fps attract interval wakes the
render loop whatever the canvas's display is. Stopping is not disposing.

Sandbox only. No SW bump.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2: The router

**Files:**
- Create: `wip/lobby-lab/shell-router.js`
- Create: `wip/lobby-lab/verify-shell.js`

**Interfaces:**
- Consumes: nothing. (`verify-shell.js` requires `./games.js` and `../premium/prm-scene.js`, both of which exist and are unchanged by this task.)
- Produces:
  - `ShellRouter.SHELL_VIEWS` — `['premium', 'tv', 'shelves', 'original']`
  - `ShellRouter.SHELL_INIT` — the frozen initial state object (shape below)
  - `ShellRouter.shellReduce(state, action)` → a **new** state object, or the same reference when the action is unknown or invalid. Never mutates `state`.
  - `ShellRouter.SHELL_PAGE_ACTIONS` — `['go', 'roomMounted', 'workshopClose', 'designSaved', 'leaveShell']`, the actions `shell.html` dispatches itself rather than receiving from a door. Task 3's harness reads it.

- [ ] **Step 1: Write the failing harness**

Create `wip/lobby-lab/verify-shell.js`:

```js
// verify-shell.js — the pure tier of the shell (wip/lobby-lab/shell.html): the
// router and the door map. Zero dependencies, no DOM stubbing — prm-scene.js
// requires cleanly under plain Node (its window assignment is guarded).
// Run: node wip/lobby-lab/verify-shell.js
const { GAMES } = require('./games.js');
const R = require('./shell-router.js');
const PrmScene = require('../premium/prm-scene.js');

let pass = 0, fail = 0, current = '';
const section = (name) => { current = name; console.log('── ' + name + ' ──'); };
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log('  FAIL [' + current + '] ' + msg); } };
const eq = (a, b, msg) => ok(a === b, `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);

const start = (patch) => Object.assign({}, R.SHELL_INIT, patch || {});

section('shape');
eq(R.SHELL_INIT.view, 'premium', 'the shell opens on Premium');
eq(R.SHELL_INIT.room, 'absent', 'nothing is built yet');
eq(R.SHELL_INIT.workshop, false, 'the Workshop is shut');
eq(R.SHELL_INIT.switcher, false, 'the dock is hidden on Premium (W6)');
eq(R.SHELL_INIT.design, null, 'no design has been read');
eq(R.SHELL_INIT.live, false, '?live is off by default');
ok(GAMES.some(g => g.id === R.SHELL_INIT.tvSel), `the default tvSel "${R.SHELL_INIT.tvSel}" is a real game id`);
eq(R.SHELL_VIEWS.length, 4, 'four views');
R.SHELL_VIEWS.forEach(v => ok(typeof v === 'string', `view "${v}" is a string`));

section('purity');
{
  const before = start();
  const snapshot = JSON.stringify(before);
  const after = R.shellReduce(before, { t: 'enterTV', gameId: 'cjar' });
  eq(JSON.stringify(before), snapshot, 'shellReduce does not mutate the state it is given');
  ok(after !== before, 'shellReduce returns a new object');
  eq(R.shellReduce(before, { t: 'nonsense' }), before, 'an unknown action returns the same reference');
  eq(R.shellReduce(before, null), before, 'a null action returns the same reference');
  eq(R.shellReduce(before, { t: 'go', view: 'nowhere' }), before, 'a go to an unknown view is refused');
}

section('claim 1 — the return path');
// Spec § 1.1.1: ctlCloseWorkshop hardcodes showScreen('screen-lobby'). The
// shell's way out of the Workshop is the lounge, from wherever you started.
R.SHELL_VIEWS.forEach(v => {
  const s = R.shellReduce(start({ view: v, room: 'idle', workshop: true }), { t: 'workshopClose' });
  eq(s.view, 'premium', `workshopClose from "${v}" lands on premium, never lobby or shelves`);
  eq(s.workshop, false, `workshopClose from "${v}" clears the workshop flag`);
  eq(s.switcher, false, `workshopClose from "${v}" re-hides the dock`);
  eq(s.room, 'running', `workshopClose from "${v}" restarts the room`);
});
eq(R.shellReduce(start({ workshop: true, room: 'absent' }), { t: 'workshopClose' }).room, 'absent',
   'workshopClose does not claim a room that was never built');

section('claim 2 — the design round-trip');
{
  const d1 = { shell: '#FFE500', plate: '#5C3A21', ears: '#E879A8', buttons: '#10B981' };
  const a = R.shellReduce(start(), { t: 'designSaved', design: d1 });
  eq(a.design, d1, 'designSaved stores the design');
  const b = R.shellReduce(a, { t: 'designSaved', design: d1 });
  eq(b.design, d1, 'a second identical designSaved leaves the same design');
  eq(b, a, 'and returns the SAME state object — one change to apply, not two');
  const c = R.shellReduce(a, { t: 'designSaved', design: { shell: '#8ECAE6' } });
  ok(c !== a && c.design.shell === '#8ECAE6', 'a different design is a new state');
  // The pure tier asserts the state change only. That the room actually
  // repaints is visual-shell.js's job — api.setDesign lives behind a WebGL
  // context no Node harness has.
}

section('claim 3 — the lifecycle (W5)');
{
  const mounted = start({ room: 'running' });
  const leaving = [
    { t: 'go', view: 'tv' }, { t: 'go', view: 'shelves' }, { t: 'go', view: 'original' },
    { t: 'enterTV', gameId: 'cjar' }, { t: 'enterShelves' }, { t: 'workshopOpen' },
  ];
  leaving.forEach(a => {
    const s = R.shellReduce(mounted, a);
    eq(s.room, 'idle', `${a.t}${a.view ? ':' + a.view : ''} stops the room, it never disposes it`);
  });
  eq(R.shellReduce(mounted, { t: 'leaveShell' }).room, 'absent', 'only leaveShell disposes');
  // Nothing may invent a room that was never built.
  const cold = start({ room: 'absent' });
  [{ t: 'go', view: 'tv' }, { t: 'enterTV' }, { t: 'enterShelves' }, { t: 'workshopOpen' }].forEach(a => {
    eq(R.shellReduce(cold, a).room, 'absent', `${a.t} from absent stays absent — there is nothing to stop yet`);
  });
  eq(R.shellReduce(cold, { t: 'go', view: 'premium' }).room, 'running',
     'a go to premium asks for a running room; the page mounts it');
  eq(R.shellReduce(start({ room: 'idle' }), { t: 'go', view: 'premium' }).room, 'running', 'returning to premium restarts it');
  eq(R.shellReduce(start({ room: 'idle' }), { t: 'roomMounted' }).room, 'running', 'roomMounted confirms the fact');
}

section('views and the seeded telly');
{
  const s = R.shellReduce(start({ tvSel: 'ss' }), { t: 'enterTV' });
  eq(s.view, 'tv', 'enterTV enters the TV layout');
  eq(s.tvSel, 'ss', 'enterTV with no gameId keeps the previous selection — the telly screen is a door, not a picker');
  eq(R.shellReduce(start({ tvSel: 'ss' }), { t: 'enterTV', gameId: null }).tvSel, 'ss', 'an explicit null keeps it too');
  eq(R.shellReduce(start({ tvSel: 'ss' }), { t: 'enterTV', gameId: 'comb' }).tvSel, 'comb', 'the dial seeds it');
  GAMES.forEach(g => eq(R.shellReduce(start(), { t: 'enterTV', gameId: g.id }).tvSel, g.id,
                        `every id the dial can produce is routable (${g.id})`));
  eq(R.shellReduce(start(), { t: 'enterShelves' }).view, 'shelves', 'enterShelves enters the phone layout');
}

section('the dock (W6)');
{
  R.SHELL_VIEWS.forEach(v => {
    const s = R.shellReduce(start({ switcher: true }), { t: 'go', view: v });
    eq(s.switcher, v !== 'premium', `the dock is ${v === 'premium' ? 'hidden' : 'shown'} in the ${v} view`);
  });
  eq(R.shellReduce(start(), { t: 'openSwitcher' }).switcher, true,
     "the telly's channel dial is the only way to see the dock while on Premium");
  eq(R.shellReduce(start(), { t: 'openSwitcher' }).view, 'premium', 'and summoning it does not leave the room');
  eq(R.shellReduce(start({ switcher: true }), { t: 'enterTV' }).switcher, true, 'a door out of the room shows the dock');
  eq(R.shellReduce(start(), { t: 'enterShelves' }).switcher, true, 'both doors do');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node wip/lobby-lab/verify-shell.js`

Expected: FAIL immediately with `Error: Cannot find module './shell-router.js'`. Exit code 1.

- [ ] **Step 3: Write the router**

Create `wip/lobby-lab/shell-router.js`:

```js
// ═══════════════════════════════════════════════════════════════════════════
// shell-router.js — the pure state machine behind wip/lobby-lab/shell.html.
//
// Pure and total: no DOM, no window, no timers, no Date.now, no Math.random.
// Same contract as js/lib/physics.js and the pure half of lounge.js — which is
// what lets verify-shell.js drive every transition under Node before a pixel
// exists. The page owns every effect; this file owns only what is true.
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  const SHELL_VIEWS = ['premium', 'tv', 'shelves', 'original'];

  /* `room` is three states, not a boolean, because "built but stopped" is the
     whole point of W5 and a boolean cannot say it. Read it as the shell's
     INTENT — should the room be rendering? — not as the fact of whether a
     WebGL context exists. Mounting is the page's job; roomMounted is how the
     page reports back. */
  const SHELL_INIT = {
    view:     'premium',      // 'premium' | 'tv' | 'shelves' | 'original'
    tvSel:    'ss',           // which game the TV layout is showing
    room:     'absent',       // 'absent' | 'running' | 'idle'
    workshop: false,          // the real Workshop screen is up
    switcher: false,          // the dock is visible (always true off premium — W6)
    design:   null,           // the last-read sylly_controller design
    live:     false,          // ?live
  };

  /* The five actions the PAGE dispatches for itself. Everything else arrives
     from a door in the room — see SHELL_DOORS in shell-host.js. Keeping the
     split as data is what lets verify-shell.js prove no action is unreachable. */
  const SHELL_PAGE_ACTIONS = ['go', 'roomMounted', 'workshopClose', 'designSaved', 'leaveShell'];

  function shellReduce(state, action) {
    const a = action || {};
    const s = Object.assign({}, state);
    /* Leaving the room stops it; it never disposes it. From 'absent' there is
       nothing to stop, and claiming otherwise would have the page calling
       stop() on a room it never built. (A deliberate refinement of spec § 5.2's
       flat `room := 'idle'`.) */
    const keep = () => (state.room === 'absent' ? 'absent' : 'idle');

    switch (a.t) {
      case 'go':
        if (SHELL_VIEWS.indexOf(a.view) === -1) return state;
        s.view = a.view;
        s.room = a.view === 'premium' ? 'running' : keep();
        s.switcher = a.view !== 'premium';
        return s;

      case 'enterTV':
        s.view = 'tv';
        if (a.gameId) s.tvSel = a.gameId;   // falsy keeps the previous pick: the telly screen is a door, only the dial picks
        s.room = keep();
        s.switcher = true;
        return s;

      case 'enterShelves':
        s.view = 'shelves';
        s.room = keep();
        s.switcher = true;
        return s;

      case 'openSwitcher':
        if (state.switcher) return state;
        s.switcher = true;
        return s;

      case 'roomMounted':
        if (state.room === 'running') return state;
        s.room = 'running';
        return s;

      case 'workshopOpen':
        s.workshop = true;
        s.room = keep();
        return s;

      /* The finding of spec § 1.1.1, made assertable: the way out of the
         Workshop is the lounge, not screen-lobby. */
      case 'workshopClose':
        s.workshop = false;
        s.view = 'premium';
        s.room = state.room === 'absent' ? 'absent' : 'running';
        s.switcher = false;
        return s;

      case 'designSaved': {
        const d = a.design || null;
        if (d === state.design) return state;   // same reference: one change to apply, not two
        s.design = d;
        return s;
      }

      case 'leaveShell':
        if (state.room === 'absent') return state;
        s.room = 'absent';
        return s;

      default:
        return state;
    }
  }

  const api = { SHELL_VIEWS, SHELL_INIT, SHELL_PAGE_ACTIONS, shellReduce };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.ShellRouter = api;
})();
```

- [ ] **Step 4: Run the harness to verify it passes**

Run: `node wip/lobby-lab/verify-shell.js`

Expected: PASS, 0 failed, exit code 0. The three claims of spec § 1.1 are now green before a pixel exists.

- [ ] **Step 5: Confirm the no-shim claim holds**

The harness requires `../premium/prm-scene.js` with no `global.window` shim. If that ever breaks, the failure is a thrown `ReferenceError: window is not defined` at require time, not a failed assertion — so check it explicitly:

Run: `node -e "require('./wip/premium/prm-scene.js'); console.log('no shim needed');"`
Expected: `no shim needed`

- [ ] **Step 6: Commit**

```bash
git add wip/lobby-lab/shell-router.js wip/lobby-lab/verify-shell.js
git commit -m "feat(shell): the pure router, and the three claims made assertable

shell-router.js is the state machine the shell page applies: view, the room's
three-state lifecycle, the Workshop flag, the dock and the saved design. Pure
and total — no DOM, no window, no timers — so verify-shell.js drives every
transition under Node.

The three questions a stub could not answer are now checks: workshopClose
lands on premium from any starting view; a repeated designSaved is one change,
not two; and nothing but leaveShell ever takes the room to absent.

Sandbox only. No SW bump.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: The host factory and the door map

**Files:**
- Create: `wip/lobby-lab/shell-host.js`
- Modify: `wip/lobby-lab/verify-shell.js` (one new section above the summary)

**Interfaces:**
- Consumes: `ShellRouter.shellReduce`, `ShellRouter.SHELL_PAGE_ACTIONS` (Task 2); `PrmScene.PRM_FUNCS`, `PrmScene.prmValidateHost` (Task 1).
- Produces:
  - `ShellHost.shellCreateHost(deps)` → host object. `deps` is `{ games, stickers, design, lampPanels, music, dispatch, openSound, debug?, reducedMotion?, rand? }`. Throws `Error` when `dispatch` or `openSound` is not a function.
  - `ShellHost.SHELL_DOORS` — `{ enterTV:'enterTV', enterShelves:'enterShelves', openWorkshop:'workshopOpen', openSwitcher:'openSwitcher', openSound:null }`. A `null` value means "an effect the page performs, not a router action".

- [ ] **Step 1: Write the failing assertions**

In `wip/lobby-lab/verify-shell.js`, add `const H = require('./shell-host.js');` under the existing requires, and insert this section immediately **above** the final `console.log` summary lines:

```js
section('the door map');
{
  const seen = [];
  const deps = {
    games: GAMES, stickers: { base: 'x/', list: [] }, design: { shell: '#a97fd6' },
    lampPanels: { base: 'y/', manifest: {} }, music: { keys: [], nowPlaying: () => null, playFor() {} },
    dispatch: (a) => seen.push(a),
    openSound: () => seen.push({ t: '@openSound' }),
  };
  const host = H.shellCreateHost(deps);

  ok(PrmScene.prmValidateHost(host) === true, 'the shell host satisfies prmValidateHost');
  PrmScene.PRM_REQUIRED.forEach(k => ok(host[k] !== undefined, `host supplies the required key "${k}"`));
  PrmScene.PRM_OPTIONAL_FUNCS.forEach(k => eq(host[k], undefined, `host supplies no ${k} — the door stays dormant`));

  // Every callable the room can reach has exactly one destination, and the
  // destination table covers exactly the callables — no orphans either way.
  PrmScene.PRM_FUNCS.forEach(k => ok(k in H.SHELL_DOORS, `PRM_FUNCS name "${k}" has a destination`));
  Object.keys(H.SHELL_DOORS).forEach(k => ok(PrmScene.PRM_FUNCS.indexOf(k) !== -1, `door "${k}" is a real PRM_FUNCS name`));

  // Each door actually dispatches the action the table promises.
  Object.entries(H.SHELL_DOORS).forEach(([fn, action]) => {
    seen.length = 0;
    host[fn]();
    eq(seen.length, 1, `${fn}() produces exactly one effect`);
    eq(seen[0].t, action || '@openSound', `${fn}() ${action ? 'dispatches ' + action : 'calls the injected openSound effect'}`);
  });

  // No router action is unreachable: every one is either a door's destination
  // or on the page's own list.
  const reachable = new Set(Object.values(H.SHELL_DOORS).filter(Boolean).concat(R.SHELL_PAGE_ACTIONS));
  ['go', 'enterTV', 'enterShelves', 'openSwitcher', 'roomMounted', 'workshopOpen', 'workshopClose', 'designSaved', 'leaveShell']
    .forEach(t => ok(reachable.has(t), `router action "${t}" is reachable`));

  // The dial's game id rides through untouched; the telly screen sends nothing.
  seen.length = 0; host.enterTV('comb');
  eq(seen[0].gameId, 'comb', 'the dial hands its game id to the router');
  seen.length = 0; host.enterTV();
  eq(seen[0].gameId, null, 'the telly screen hands null, which keeps the previous pick');

  // Refuse to build a host that cannot reach anything.
  let threw = 0;
  try { H.shellCreateHost(Object.assign({}, deps, { dispatch: null })); } catch (_) { threw++; }
  try { H.shellCreateHost(Object.assign({}, deps, { openSound: null })); } catch (_) { threw++; }
  eq(threw, 2, 'a host with no dispatch or no openSound is refused at build time');

  // Optional passthroughs are absent unless asked for, so prmMount's own
  // defaults (real prefers-reduced-motion, Math.random) stay in charge.
  eq(host.reducedMotion, undefined, 'reducedMotion is absent unless supplied');
  eq(host.rand, undefined, 'rand is absent unless supplied');
  const seeded = H.shellCreateHost(Object.assign({}, deps, { reducedMotion: true, rand: () => 0.5 }));
  eq(seeded.reducedMotion, true, 'reducedMotion passes through when supplied');
  eq(typeof seeded.rand, 'function', 'rand passes through when supplied');
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node wip/lobby-lab/verify-shell.js`
Expected: FAIL with `Error: Cannot find module './shell-host.js'`. Exit code 1.

- [ ] **Step 3: Write the host factory**

Create `wip/lobby-lab/shell-host.js`:

```js
// ═══════════════════════════════════════════════════════════════════════════
// shell-host.js — builds the object wip/premium/prm-scene.js validates, and
// holds the one door→destination map. Pure: no DOM, no window, no timers.
//
// Four of the five callables become router actions. openSound is the odd one:
// it is an EFFECT (the shipped openSoundOverlay under ?live, a status line
// otherwise) and changes nothing about the shell's state, so it is injected
// rather than routed. SHELL_DOORS says which is which, as data, so the harness
// can prove there are no orphans in either direction.
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  const SHELL_DOORS = {
    enterTV:      'enterTV',
    enterShelves: 'enterShelves',
    openWorkshop: 'workshopOpen',
    openSwitcher: 'openSwitcher',
    openSound:    null,            // an effect, not one of the router's nine actions
  };

  function shellCreateHost(deps) {
    if (!deps || typeof deps.dispatch !== 'function') throw new Error('shellCreateHost: deps.dispatch must be a function');
    if (typeof deps.openSound !== 'function') throw new Error('shellCreateHost: deps.openSound must be a function');
    const dispatch = deps.dispatch;

    const host = {
      games:      deps.games,
      stickers:   deps.stickers,
      design:     deps.design,
      lampPanels: deps.lampPanels,
      music:      deps.music,

      /* A falsy gameId is passed along as null on purpose: the router keeps
         the previous pick for it. The telly screen is a door to the layout;
         only the dial picks a game. */
      enterTV(gameId) { dispatch({ t: 'enterTV', gameId: gameId || null }); },
      enterShelves()  { dispatch({ t: 'enterShelves' }); },
      /* The room only ever says "the Workshop was asked for". Whether that
         means the real ctlOpenWorkshop or a status line is the page's call,
         because it depends on ?live — which this file must not know about. */
      openWorkshop()  { dispatch({ t: 'workshopOpen' }); },
      openSwitcher()  { dispatch({ t: 'openSwitcher' }); },
      openSound()     { deps.openSound(); },

      debug: deps.debug !== false,
    };

    /* Absent, not undefined-valued: prmMount reads `host.reducedMotion !== undefined`
       to decide whether to trust the host over the real media query, and
       `host.rand || Math.random` for the dial. An explicit undefined would be
       the same thing here, but leaving the keys off keeps the host object a
       true picture of what was asked for. */
    if (deps.reducedMotion !== undefined) host.reducedMotion = deps.reducedMotion;
    if (deps.rand) host.rand = deps.rand;

    /* openStickerbook and openJukebox are deliberately NOT supplied. Both are
       dormant doors this round (the binder flips its cover, the knob turns). */
    return host;
  }

  const api = { SHELL_DOORS, shellCreateHost };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.ShellHost = api;
})();
```

- [ ] **Step 4: Run the harness to verify it passes**

Run: `node wip/lobby-lab/verify-shell.js`
Expected: PASS, 0 failed, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add wip/lobby-lab/shell-host.js wip/lobby-lab/verify-shell.js
git commit -m "feat(shell): the host factory and the door map

shellCreateHost builds the object prmValidateHost accepts, and SHELL_DOORS is
the one place a prop's callback is paired with where it goes — as data, so the
harness can prove every PRM_FUNCS name has a destination and every destination
is a real name.

openSound is the one door that is an effect rather than a router action: under
?live it is the shipped openSoundOverlay, otherwise a status line, and neither
changes the shell's state. It is injected, and the map says so with a null.

Sandbox only. No SW bump.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: `shell.html` — all four layouts, every door but the Workshop

**Files:**
- Create: `wip/lobby-lab/shell.html`
- Create: `wip/lobby-lab/visual-shell.js`

**Interfaces:**
- Consumes: `ShellRouter.*` (Task 2), `ShellHost.shellCreateHost` (Task 3), `PrmScene.prmMount`/`prmEligible` and `api.stop`/`api.resume` (Task 1), plus the untouched `games.js`, `lounge.js`, `lobby.js`, `prm-lib.js`, `prm-room.js`, `prm-props.js`.
- Produces (read by `visual-shell.js` and by Task 5):
  - `window.shellDispatch(action)` → `undefined`. The page's single write path.
  - `window.shellState()` → the current state object (a read-only view; never mutate it).
  - `window.shellReady` → `true` once boot has finished, however it finished.
  - `window.prmApi` → the mounted scene api, or `null`.
  - `window.prmDebug` → set by `prmMount` because the host carries `debug: true`.

**This is spec § 8's first review point.** At the end of this task the owner can walk all four layouts.

- [ ] **Step 1: Write the failing browser harness**

Create `wip/lobby-lab/visual-shell.js`:

```js
// visual-shell.js — real headless Chromium over wip/lobby-lab/shell.html: the
// tier neither pure harness reaches. Serves the repo root, as visual-prm.js
// does. Run from the repo root:
//   NODE_PATH="$HOME/.claude-tooling/playwright/node_modules" node wip/lobby-lab/visual-shell.js
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
  const base = `http://127.0.0.1:${port}/wip/lobby-lab/shell.html`;
  const settle = (page) => page.waitForFunction(() => window.shellReady === true, null, { timeout: 30000 });
  const shown = (page, id) => page.evaluate(i => { const el = document.getElementById(i); return !!el && !el.hidden && el.offsetParent !== null; }, id);

  // ── the four views ────────────────────────────────────────────────────────
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${base}?seed=7`); await settle(page);
  await page.waitForFunction(() => window.prmApi !== null, null, { timeout: 30000 });

  ok(await shown(page, 'shell-premium'), 'the shell opens on Premium');
  ok(!(await shown(page, 'shell-tv')), 'the TV pane is hidden on Premium');
  ok(!(await shown(page, 'shell-phone')), 'the phone pane is hidden on Premium');
  ok(!(await shown(page, 'shell-dock')), 'the dock is hidden on Premium (W6)');
  await page.screenshot({ path: path.join(SHOTS, 'shell-premium-1280.png') });

  // W6 — the telly's channel dial summons the dock without leaving the room
  await page.evaluate(() => window.prmApi.activate('tv-channel'));
  await page.waitForFunction(() => window.shellState().switcher === true, null, { timeout: 15000 });
  ok(await shown(page, 'shell-dock'), 'the channel dial summons the dock');
  ok(await shown(page, 'shell-premium'), 'and summoning it does not leave the room');

  for (const [view, pane] of [['tv', 'shell-tv'], ['shelves', 'shell-phone'], ['original', 'shell-phone'], ['premium', 'shell-premium']]) {
    await page.evaluate(v => window.shellDispatch({ t: 'go', view: v }), view);
    await page.waitForFunction(v => window.shellState().view === v, view, { timeout: 15000 });
    ok(await shown(page, pane), `the ${view} view mounts ${pane}`);
    const others = ['shell-premium', 'shell-tv', 'shell-phone'].filter(p => p !== pane);
    for (const o of others) ok(!(await shown(page, o)), `the ${view} view hides ${o}`);
    if (view !== 'premium') await page.screenshot({ path: path.join(SHOTS, `shell-${view}-1280.png`) });
  }

  // The real layouts actually rendered, not just empty boxes.
  await page.evaluate(() => window.shellDispatch({ t: 'go', view: 'tv' }));
  await page.waitForFunction(() => document.querySelector('#tv-app .lb-tv-full') !== null, null, { timeout: 15000 });
  ok(true, 'the TV view mounts the real Lounge renderer');
  await page.evaluate(() => window.shellDispatch({ t: 'go', view: 'shelves' }));
  await page.waitForFunction(() => document.querySelector('#shelves-canvas .lb-phone') !== null, null, { timeout: 15000 });
  ok(true, 'the shelves view mounts the real phone renderer');

  // The dock and the phone's own switcher are one path — both go through lbSet.
  await page.evaluate(() => { document.querySelectorAll('#shell-dock .lb-seg')[2].click(); });
  await page.waitForFunction(() => window.shellState().view === 'tv', null, { timeout: 15000 });
  ok(true, "the dock's TV button routes through the router");

  ok(errors.length === 0, `no uncaught page errors (${errors.slice(0, 2).join(' | ') || 'none'})`);
  await page.close();

  // ── the honest card below the floor ───────────────────────────────────────
  const small = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await small.goto(base); await settle(small);
  ok(await small.evaluate(() => document.getElementById('prm-card').classList.contains('on')), 'below the floor, the lounge shows the honest card');
  ok(await small.evaluate(() => window.prmApi === null), 'and no WebGL room is built at all');
  ok(await shown(small, 'shell-dock'), 'the dock is forced visible below the floor, so the other three are reachable');
  ok(await small.evaluate(() => document.querySelector('#shell-dock [data-shell-view="premium"]').hidden === true), 'and Premium is not offered');
  await small.screenshot({ path: path.join(SHOTS, 'shell-gate-390.png') });
  await small.close();

  await browser.close(); server.close();
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `NODE_PATH="$HOME/.claude-tooling/playwright/node_modules" node wip/lobby-lab/visual-shell.js`

Expected: FAIL. The page 404s, so `settle()` times out and the run exits 1 with a Playwright `TimeoutError`.

- [ ] **Step 3: Write the page**

Create `wip/lobby-lab/shell.html`:

```html
<!DOCTYPE html>
<html lang="en-AU">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Little Sylly Games — the shell (sandbox)</title>

  <!-- The same real files index.html loads. ../../ from here, as tv.html
       already documents. -->
  <script src="../../js/lib/tailwind-play.js"></script>
  <link rel="stylesheet" href="../../css/styles.css" />
  <link rel="stylesheet" href="lobby.css" />
  <link rel="stylesheet" href="../premium/prm-hud.css" />

  <style>
    /* This page IS the result, not a frame around it — no lab chrome, no
       fixed panes. It is the only place all four layouts live together, which
       is what makes the room's props real doors rather than status lines. */
    html, body { margin: 0; height: 100%; background: #FAFAF9; overflow: hidden; }
    .shell-view { position: absolute; inset: 0; }
    .shell-view[hidden] { display: none; }
    #tv-app { height: 100vh; width: 100vw; }
    /* The phone layouts test true at a real 390px width, centred on the page
       rather than stretched — same as index.html's phone pane. */
    #shell-phone { display: flex; justify-content: center; overflow-y: auto; }
    #shelves-canvas { width: 390px; min-height: 100vh; position: relative; background: #FAFAF9; }

    /* The dock (W6): hidden in the Premium view, summoned by the telly's
       channel dial. Off Premium it is the normal fixed strip. */
    #shell-dock {
      position: fixed; left: 50%; bottom: 18px; transform: translateX(-50%);
      z-index: 40; display: flex; gap: 8px; padding: 8px;
      background: rgba(250,250,249,.92); border-radius: 16px;
      box-shadow: 0 6px 24px rgba(0,0,0,.18); backdrop-filter: blur(6px);
    }
    #shell-dock[hidden] { display: none; }
    #shell-dock .lb-seg[aria-selected="true"] { background: #2B1B45; color: #fff; }
    #shell-dock .lb-seg[hidden] { display: none; }

    /* The ?live container. Everything the shipped engine needs lives in here,
       out of the way until a real overlay or screen is asked for. */
    #live-screens { position: fixed; inset: 0; z-index: 1000; overflow-y: auto; background: #FAFAF9; }
    #live-screens[hidden] { display: none; }
  </style>
</head>
<body>

<!-- ── Premium: the lounge ─────────────────────────────────────────────────── -->
<div id="shell-premium" class="shell-view">
  <div id="prm-stage">
    <canvas id="prm-canvas" tabindex="0" aria-label="Little Sylly's lounge. Tab through the room, Enter to use a thing."></canvas>
    <div id="prm-vignette"></div>
    <div id="prm-hud">
      <h1 id="prm-heading">Little Sylly's Lounge</h1>
      <div id="prm-status"></div>
      <div id="prm-focus"></div>
    </div>
    <div id="prm-fade"></div>
  </div>
</div>

<!-- ── TV: the Lounge layout, unframed ─────────────────────────────────────── -->
<div id="shell-tv" class="shell-view" hidden><div id="tv-app"></div></div>

<!-- ── Shelves / Original: the phone layouts ───────────────────────────────── -->
<div id="shell-phone" class="shell-view" hidden><div id="shelves-canvas"></div></div>

<!-- Below the eligibility floor the lounge says so honestly, and the dock
     stays up so the other three layouts are still reachable. -->
<div id="prm-card"><div>
  <h2>The lounge wants a bigger screen.</h2>
  <p>Cast it, or open it on a laptop — the Shelves are right here.</p>
  <button id="btn-shell-to-shelves" class="prm-keycap">Open the Shelves</button>
</div></div>

<div id="shell-dock" role="tablist" aria-label="Lobby layout" hidden></div>
<div id="live-screens" hidden></div>

<script src="../../js/lib/three.min.js"></script>
<script src="../../js/lib/controller-body.js"></script>
<script src="games.js"></script>
<!-- lounge.js before lobby.js: lobby.js's lbMountTVFull delegates to lgMount. -->
<script src="lounge.js"></script>
<!-- lobby.js's own lbBoot runs on load: it renders into #shelves-canvas and
     mounts #tv-app, and no-ops on #wide-canvas, which this page deliberately
     does not have (that is index.html's 900x506 review frame, not a result). -->
<script src="lobby.js"></script>
<script src="../premium/prm-lib.js"></script>
<script src="../premium/prm-room.js"></script>
<script src="../premium/prm-props.js"></script>
<script src="../premium/prm-scene.js"></script>
<script src="shell-router.js"></script>
<script src="shell-host.js"></script>
<script>
(async function shellBoot() {
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const LIVE = params.has('live');

  let state = Object.assign({}, ShellRouter.SHELL_INIT, { live: LIVE });
  let api = null;                       // the premium scene api, once mounted
  window.prmApi = null;                 // null, not undefined — the harness reads it before any mount
  const realLbSet = window.lbSet;       // captured before the wrapper replaces it

  const status = (t) => { $('prm-status').textContent = t; };
  const webgl = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (_) { return false; } })();
  const eligible = () => PrmScene.prmEligible(window.innerWidth, window.innerHeight, webgl);

  // ── The one write path ────────────────────────────────────────────────────
  function dispatch(action) {
    const prev = state;
    state = ShellRouter.shellReduce(prev, action);
    if (state !== prev) apply(prev, state);
  }
  window.shellDispatch = dispatch;
  window.shellState = () => state;

  // ── The room ──────────────────────────────────────────────────────────────
  // Mounting is a FACT, not an intent, so it writes state directly rather than
  // re-entering dispatch from inside apply.
  function ensureRoom(host) {
    if (api || !eligible()) return;
    api = PrmScene.prmMount($('prm-canvas'), host);
    window.prmApi = api;
    state = ShellRouter.shellReduce(state, { t: 'roomMounted' });
  }

  // ── The dock (W6) ─────────────────────────────────────────────────────────
  // Its buttons call lbSet, exactly as lobby.js's own in-phone switcher does,
  // so both go through one path — the wrapper below.
  function buildDock() {
    const dock = $('shell-dock');
    dock.innerHTML = '';
    for (const v of LB_VIEWS) {
      const b = document.createElement('button');
      b.className = 'lb-seg';
      b.dataset.shellView = v.id;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-label', v.label);
      b.innerHTML = `<span class="lb-seg-ico" aria-hidden="true">${v.ico}</span><span class="lb-seg-lbl">${v.label}</span>`;
      b.addEventListener('click', () => window.lbSet({ view: v.id, folder: null, sheet: null }));
      dock.appendChild(b);
    }
  }

  // ── State to page ─────────────────────────────────────────────────────────
  function apply(prev, next) {
    const ok = eligible();
    const phone = next.view === 'shelves' || next.view === 'original';

    $('shell-premium').hidden = next.view !== 'premium';
    $('shell-tv').hidden      = next.view !== 'tv';
    $('shell-phone').hidden   = !phone;
    $('prm-card').classList.toggle('on', next.view === 'premium' && !ok);

    // W5 — hide and stop, never dispose. Dispose fires once, on leaving.
    if (next.room === 'absent') {
      if (api) { api.dispose(); api = null; window.prmApi = null; }
    } else if (next.view === 'premium' && next.room === 'running') {
      if (api) api.resume(); else ensureRoom(host);
    } else if (api) {
      api.stop();
    }

    if (api && next.design && next.design !== prev.design) api.setDesign(next.design);

    // lbState.view is a PROJECTION of the router's view, never a second source
    // of truth. The three lobby.js mount functions each no-op when their target
    // is hidden or absent, so re-rendering all of them costs nothing.
    if (phone || next.view === 'tv') {
      window.lbState.view = next.view;
      window.lbState.tvSel = next.tvSel;
      window.LOUNGE.sel = next.tvSel;
      realLbSet({});
    }

    $('shell-dock').hidden = !(next.switcher || !ok);
    $('shell-dock').querySelectorAll('.lb-seg').forEach(b => {
      b.hidden = b.dataset.shellView === 'premium' && !ok;
      b.setAttribute('aria-selected', String(b.dataset.shellView === next.view));
    });

    // The Workshop. Task 5 replaces the else branch with the real thing.
    if (next.workshop && !prev.workshop) openWorkshopEffect();
  }

  function openWorkshopEffect() {
    status('The Workshop would open (ctlOpenWorkshop). Add ?live to reach the real one.');
    // A fact correction, not an intent: nothing opened, so nothing is open.
    state = ShellRouter.shellReduce(state, { t: 'workshopClose' });
  }

  function openSoundEffect() {
    status('The sound overlay would open. Add ?live to reach the real one.');
  }

  // ── lbSet wrapper ─────────────────────────────────────────────────────────
  // lobby.js's in-phone dock calls lbSet({ view }) directly (lobby.js:281).
  // Routing those through the router is what keeps lbState.view a projection.
  window.lbSet = function (patch) {
    const p = Object.assign({}, patch || {});
    if (p.view) {
      const v = p.view; delete p.view;
      if (Object.keys(p).length) Object.assign(window.lbState, p);
      dispatch({ t: 'go', view: v });
      return;
    }
    realLbSet(p);
  };

  // ── Boot ──────────────────────────────────────────────────────────────────
  buildDock();
  $('btn-shell-to-shelves').addEventListener('click', () => window.lbSet({ view: 'shelves', folder: null, sheet: null }));
  window.addEventListener('resize', () => apply(state, state));
  window.addEventListener('beforeunload', () => dispatch({ t: 'leaveShell' }));

  let host = null;
  try {
    const [stickerManifest, lampManifest] = await Promise.all([
      fetch('../../data/stickers/manifest.json').then(r => r.json()),
      fetch('../premium/lamp images/manifest.json').then(r => r.json()),
    ]);

    const DESIGN_DEFAULT = { shell: '#a97fd6', plate: '#9670c8', ears: '#a97fd6', buttons: '#8f66c4' };
    let saved = null; try { saved = JSON.parse(localStorage.getItem('sylly_controller') || 'null'); } catch (_) {}
    const design = Object.assign({}, DESIGN_DEFAULT, saved && saved.shell
      ? { shell: saved.shell, plate: saved.plate, ears: saved.ears, buttons: saved.buttons } : {});

    const music = { keys: window.GAMES.map(g => g.id), current: null,
      nowPlaying() { if (!this.current) return null; const g = window.GAMES.find(x => x.id === this.current); return { key: this.current, title: null, artist: null, game: g && g.gameName }; },
      playFor(k) { this.current = k; } };

    const deps = {
      games: window.GAMES,
      /* Asset bases move with the page, and every URL comes from here — which
         is why no prm-* module needed editing for the new home. Both sandboxes
         sit at wip/<dir>/, so the sticker path is unchanged. */
      stickers: { base: '../../data/stickers/', list: stickerManifest.stickers },
      lampPanels: { base: '../premium/lamp images/', manifest: lampManifest },
      design, music, dispatch,
      openSound: () => openSoundEffect(),
      debug: true,
      reducedMotion: params.has('reduced') ? true : undefined,
    };
    if (params.has('seed')) { let s = +params.get('seed') || 1; deps.rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

    host = ShellHost.shellCreateHost(deps);
    if (LIVE) await shellLoadLive();   // Task 5 defines it; absent until then
    apply(state, state);
    if (state.view === 'premium' && eligible()) ensureRoom(host);
  } finally {
    // However boot ended — no WebGL, a missing manifest, an ineligible window —
    // the page is in a state the harness can read.
    apply(state, state);
    window.shellReady = true;
  }
})();
</script>
</body>
</html>
```

Two notes for the implementer:

- `shellLoadLive` does not exist yet. `LIVE` is false in this task's harness runs, so the call is never reached. Task 5 defines it. Do **not** add a `typeof` guard — a `?live` run that silently skipped the loader would be worse than a loud `ReferenceError`.
- `LB_VIEWS` is a `const` at `lobby.js:27` and is a plain script-scope global, so `buildDock` reads it directly — no `window.` prefix (the same split `logic-engine.md` documents for `mp*` variables).

- [ ] **Step 4: Run the harness to verify it passes**

Run: `NODE_PATH="$HOME/.claude-tooling/playwright/node_modules" node wip/lobby-lab/visual-shell.js`

Expected: PASS, 0 failed. Screenshots land in `wip/lobby-lab/shots/`.

If `no uncaught page errors` fails, read the reported message before anything else — the most likely causes are a missing `lamp images/manifest.json` at the new relative depth, or `lobby.css` not covering `.lb-seg` outside `.lb-phone`.

- [ ] **Step 5: Confirm nothing else regressed**

Run: `node wip/lobby-lab/verify-shell.js`
Expected: PASS, 0 failed.

Run: `node wip/lobby-lab/verify-lounge.js`
Expected: PASS, 0 failed — `lounge.js` is untouched, and this proves the new page did not tempt anyone into editing it.

Run: `node wip/premium/verify-prm-props.js`
Expected: PASS, 0 failed.

- [ ] **Step 6: Owner review point**

Serve the repo root and walk it by hand — this is the first thing the owner can look at:

```bash
python -m http.server 8080
```

Then open `http://127.0.0.1:8080/wip/lobby-lab/shell.html` and check, in order:

1. The lounge opens with no dock.
2. Tapping the **telly's channel dial** summons the dock without leaving the room.
3. Tapping the **telly screen** enters the TV layout with the dock up.
4. The dial spins and enters the TV layout **on the game it landed on**.
5. The **clamshell phone** enters the Shelves layout.
6. The dock's four buttons move between all four layouts, and the phone's own in-app switcher does the same.
7. The **jukebox knob** turns and does nothing else — the dormant door (W4).
8. The **controller** and the **telly's volume dial** write status lines naming what `?live` would do.
9. Narrow the window below 900×500: the honest card appears and Premium leaves the dock.

- [ ] **Step 7: Commit**

```bash
git add wip/lobby-lab/shell.html wip/lobby-lab/visual-shell.js
git commit -m "feat(shell): shell.html hosts all four layouts, with the room's props as doors

One full-window page: the Premium lounge, the Lounge (TV) layout, and both
phone layouts, with the router deciding which is up. The room's props are real
doors now — the telly screen and the dial enter TV mode (the dial seeding the
game it landed on), the clamshell phone enters the Shelves, and the telly's
channel dial summons the dock that is otherwise hidden in the room (W6).

Leaving Premium hides and stops the room; it never disposes it. lbState.view
is a projection of the router's view, kept honest by wrapping lbSet, because
the phone's own switcher calls it directly.

The Workshop and the sound overlay still write status lines — ?live is next.

Sandbox only. No SW bump.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5: `?live` — the real Workshop and the design round-trip

**Files:**
- Modify: `wip/lobby-lab/shell.html` (add `shellLoadLive`, replace the two effect functions)
- Modify: `wip/lobby-lab/visual-shell.js` (one new `?live` block above the summary)

**Interfaces:**
- Consumes: everything Task 4 produced.
- Produces:
  - `shellLoadLive()` → `Promise<void>`. Injects `_shell.html` + `_sound.html` + a `#btn-mute` stub into `#live-screens`, then loads `js/lib/music.js`, `js/engine.js`, `js/lib/controller-sticker-surface.js`, `js/controller.js` in that order, then installs the `ctlCloseWorkshop` wrapper.
  - `window.shellLive` → `true` once the shipped scripts are in and wrapped; absent otherwise. `visual-shell.js` waits on it.

**This is spec § 8's step that earns the round.**

- [ ] **Step 1: Write the failing assertions**

In `wip/lobby-lab/visual-shell.js`, insert this block immediately above `await browser.close(); server.close();`:

```js
  // ── ?live: the real Workshop, and the design round-trip ───────────────────
  {
    const lp = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const liveErrors = []; lp.on('pageerror', e => liveErrors.push(String(e)));
    await lp.goto(`${base}?live&seed=7`);
    await lp.waitForFunction(() => window.shellReady === true && window.shellLive === true, null, { timeout: 40000 });
    await lp.waitForFunction(() => window.prmApi !== null, null, { timeout: 30000 });

    ok(await lp.evaluate(() => typeof window.ctlOpenWorkshop === 'function'), 'the shipped controller.js loaded');
    ok(await lp.evaluate(() => typeof window.openSoundOverlay === 'function'), 'the shipped engine.js loaded');
    ok(await lp.evaluate(() => document.getElementById('screen-workshop') !== null), '_shell.html supplied screen-workshop');
    ok(await lp.evaluate(() => document.getElementById('sound-overlay') !== null), '_sound.html supplied the sound overlay');
    ok(await lp.evaluate(() => document.getElementById('live-screens').hidden === true), 'and all of it starts out of the way');
    ok(liveErrors.length === 0, `no uncaught page errors while loading the shipped engine (${liveErrors.slice(0, 2).join(' | ') || 'none'})`);

    // Three.js is shared — the Workshop costs no extra library bytes on top of
    // the room. Worth banking for the production round's install maths.
    ok(await lp.evaluate(() => document.querySelectorAll('script[src*="three.min.js"]').length === 1),
       'one vendored Three serves both the room and the Workshop');

    // The controller prop opens the real Workshop.
    await lp.evaluate(() => window.prmApi.activate('controller'));
    await lp.waitForFunction(() => document.getElementById('screen-workshop').style.display === 'flex', null, { timeout: 20000 });
    ok(true, 'the controller prop opens the real screen-workshop');
    ok(await lp.evaluate(() => window.shellState().workshop === true), 'and the router knows it');
    ok(await lp.evaluate(() => window.prmDebug.isRunning() === false), 'the room stopped while the Workshop is up (W5)');
    await lp.screenshot({ path: path.join(SHOTS, 'shell-live-workshop-1280.png') });

    // Save a changed shell colour and come back.
    await lp.evaluate(() => { window.ctlDraft.shell = '#10B981'; window.ctlApplyDesign(window.ctlDraft); });
    await lp.click('#btn-ctl-save');
    await lp.waitForFunction(() => window.shellState().workshop === false, null, { timeout: 20000 });

    ok(await lp.evaluate(() => window.shellState().view === 'premium'),
       'saving returns to the lounge, NOT to screen-lobby (spec § 1.1.1)');
    ok(await lp.evaluate(() => document.getElementById('live-screens').hidden === true), 'and the shipped screens go back out of the way');
    ok(await lp.evaluate(() => window.shellState().design.shell === '#10B981'), 'the saved design reached the router');
    ok(await lp.evaluate(() => JSON.parse(localStorage.getItem('sylly_controller')).shell === '#10B981'), 'and sylly_controller holds it');

    // The room repainted — the half no pure harness can reach.
    await lp.waitForFunction(() => window.prmDebug.isRunning() === true, null, { timeout: 20000 });
    ok(true, 'the room restarted on the way back');
    const repainted = await lp.evaluate(() => {
      let hit = false;
      window.prmApi.built.controller.traverse(o => {
        if (o.isMesh && o.material && o.material.userData.prmRole === 'shell' && o.material.color.getHexString() === '10b981') hit = true;
      });
      return hit;
    });
    ok(repainted, "the controller prop's shell repainted in the saved colour — the round-trip, closed");
    await lp.screenshot({ path: path.join(SHOTS, 'shell-live-return-1280.png') });

    // The ✕ path: discards, and still lands on the lounge.
    await lp.evaluate(() => window.prmApi.activate('controller'));
    await lp.waitForFunction(() => window.shellState().workshop === true, null, { timeout: 20000 });
    await lp.evaluate(() => { window.ctlDraft.shell = '#FFE500'; window.ctlApplyDesign(window.ctlDraft); });
    await lp.click('#btn-ctl-exit');
    await lp.waitForFunction(() => window.shellState().workshop === false, null, { timeout: 20000 });
    ok(await lp.evaluate(() => window.shellState().view === 'premium'), 'the exit path lands on the lounge too');
    ok(await lp.evaluate(() => window.shellState().design.shell === '#10B981'), 'and the unsaved edit is discarded — one wrapper covers both exits');

    // The telly's volume dial reaches the real overlay.
    await lp.evaluate(() => window.prmApi.activate('tv-volume'));
    await lp.waitForFunction(() => document.getElementById('sound-overlay').style.display === 'flex', null, { timeout: 20000 });
    ok(true, "the telly's volume dial opens the real sound overlay");
    await lp.click('#btn-sound-overlay-done');
    await lp.waitForFunction(() => document.getElementById('live-screens').hidden === true, null, { timeout: 20000 });
    ok(true, 'and closing it puts the shipped screens away again');

    // W4 — the jukebox knob is NOT the sound overlay, even with the engine loaded.
    await lp.evaluate(() => window.prmApi.activate('jukebox-knob'));
    await lp.waitForTimeout(400);
    ok(await lp.evaluate(() => document.getElementById('live-screens').hidden === true),
       'the jukebox knob opens nothing — a dormant door, not the sound overlay (W4)');

    await lp.close();
  }
```

Note the `waitForTimeout(400)` in the last check: it is asserting that **nothing** happened, so there is no condition to poll for. That is the one legitimate use of a fixed wait, and 400 ms is comfortably longer than the 120 ms turn tween.

- [ ] **Step 2: Run it to verify it fails**

Run: `NODE_PATH="$HOME/.claude-tooling/playwright/node_modules" node wip/lobby-lab/visual-shell.js`

Expected: FAIL. The `?live` page throws `ReferenceError: shellLoadLive is not defined`, `window.shellLive` never becomes true, and the first `waitForFunction` in the new block times out. The Task 4 assertions above it still pass.

- [ ] **Step 3: Write the loader**

In `wip/lobby-lab/shell.html`, add these two functions inside the boot IIFE, immediately above the `// ── lbSet wrapper ──` comment:

```js
  // ── ?live: the shipped engine, loaded into the sandbox ────────────────────
  // Three.js and controller-body.js are deliberately NOT in this list: the
  // room already loaded them and both halves use the same vendored copy, so
  // the Workshop costs no extra library bytes on top of the room. That is a
  // real number for the production round's install maths.
  function shellLoadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = () => reject(new Error('shell: failed to load ' + src));
      document.body.appendChild(s);
    });
  }

  async function shellLoadLive() {
    const wrap = $('live-screens');
    const [shellHtml, soundHtml] = await Promise.all([
      fetch('../../src/screens/_shell.html').then(r => r.text()),
      fetch('../../src/screens/_sound.html').then(r => r.text()),
    ]);
    /* #btn-mute is the one engine-required id that lives in a GAME partial
       (src/screens/li5.html:109) rather than the shell, and engine.js wires it
       unguarded at boot (js/engine.js:903 and :912). A hidden stub is the whole
       cost of that asymmetry. */
    wrap.innerHTML = shellHtml + soundHtml + '<button id="btn-mute" hidden aria-hidden="true">\u{1F50A}</button>';

    // Shipped load order. music.js before engine.js: the engine's boot block
    // calls Music.init() at parse time.
    await shellLoadScript('../../js/lib/music.js');
    await shellLoadScript('../../js/engine.js');
    await shellLoadScript('../../js/lib/controller-sticker-surface.js');
    await shellLoadScript('../../js/controller.js');

    /* THE FINDING (spec § 1.1.1): ctlCloseWorkshop hardcodes
       showScreen('screen-lobby') at js/controller.js:2044 — the SHIPPED lobby,
       not the lounge — so this wrapper's job is to hide it again. That is the
       evidence shipped controller.js needs a return-destination variable
       (ctlReturnScreen, or Premium registered in allScreens[]). Recorded here
       and in shared-implementation-notes.md, deliberately NOT patched: nothing
       under js/ is touched this round.

       One path covers both exits. Save (controller.js:2287) calls
       ctlWriteDesign(ctlDraft) then ctlCloseWorkshop(); the X calls
       ctlCloseWorkshop() directly, and line 2043 restores the saved design on
       the way out. So reading ctlReadDesign() AFTER close is correct for both,
       with no branch. */
    const realClose = window.ctlCloseWorkshop;
    window.ctlCloseWorkshop = function () {
      realClose();
      wrap.hidden = true;
      dispatch({ t: 'designSaved', design: window.ctlReadDesign() });
      dispatch({ t: 'workshopClose' });
    };

    // The sound overlay has no close hook of its own, so put the screens away
    // when its Done button fires.
    const done = $('btn-sound-overlay-done');
    if (done) done.addEventListener('click', () => { wrap.hidden = true; });

    window.shellLive = true;
  }
```

- [ ] **Step 4: Point the two effects at the real thing**

In `wip/lobby-lab/shell.html`, replace `openWorkshopEffect` and `openSoundEffect`:

```js
  function openWorkshopEffect() {
    if (state.live && typeof window.ctlOpenWorkshop === 'function') {
      $('live-screens').hidden = false;
      window.ctlOpenWorkshop();
      return;
    }
    status('The Workshop would open (ctlOpenWorkshop). Add ?live to reach the real one.');
    // A fact correction, not an intent: nothing opened, so nothing is open.
    state = ShellRouter.shellReduce(state, { t: 'workshopClose' });
  }

  function openSoundEffect() {
    if (state.live && typeof window.openSoundOverlay === 'function') {
      $('live-screens').hidden = false;
      window.openSoundOverlay();
      return;
    }
    status('The sound overlay would open. Add ?live to reach the real one.');
  }
```

- [ ] **Step 5: Run the harness to verify it passes**

Run: `NODE_PATH="$HOME/.claude-tooling/playwright/node_modules" node wip/lobby-lab/visual-shell.js`

Expected: PASS, 0 failed.

The likeliest failure is `no uncaught page errors while loading the shipped engine`. If it fires, read the message: it names the unguarded `getElementById(...)` that `_shell.html` + `_sound.html` + the `#btn-mute` stub did not cover, and the fix is one more stub element in the `wrap.innerHTML` string — **not** an edit under `src/screens/` or `js/`.

- [ ] **Step 6: Confirm nothing else regressed**

Run: `node wip/lobby-lab/verify-shell.js && node wip/lobby-lab/verify-lounge.js && node wip/premium/verify-prm-props.js`
Expected: three PASS lines, all 0 failed.

Run: `NODE_PATH="$HOME/.claude-tooling/playwright/node_modules" node wip/premium/visual-prm.js`
Expected: 18 passed, 0 failed. `wip/premium/index.html` never loads the engine and is unchanged.

- [ ] **Step 7: Owner review point — the round-trip by hand**

Open `http://127.0.0.1:8080/wip/lobby-lab/shell.html?live` and:

1. Tap the **controller** on the couch — the real Workshop opens.
2. Change the shell colour, tap **Save** — you land back in the **lounge**, and the controller, the TV's trim, the jukebox and the dial all repaint in the new colour.
3. Tap the controller again, change the colour, tap **✕** — you land in the lounge and the change is gone.
4. Tap the **telly's volume dial** — the real sound overlay opens, on neutral stone. **Done** puts it away.
5. Tap the **jukebox knob** — it turns, and nothing opens.

- [ ] **Step 8: Commit**

```bash
git add wip/lobby-lab/shell.html wip/lobby-lab/visual-shell.js
git commit -m "feat(shell): ?live reaches the real Workshop, and the design round-trip closes

Under ?live the shell injects the shipped _shell.html and _sound.html, stubs
the one engine-required id that lives in a game partial (#btn-mute), and loads
music.js, engine.js, the sticker surface and controller.js in shipped order.
Three.js is not in that list — the room already loaded it and both halves share
the vendored copy, so the Workshop costs no extra library bytes.

This settles the three questions a stub could not. The Workshop's return path:
ctlCloseWorkshop hardcodes showScreen('screen-lobby'), so the wrapper has to
hide the shipped lobby again — recorded as the evidence that controller.js
needs a return destination, not patched. The design round-trip: save, return,
and the room's props repaint, asserted through prmDebug rather than by eye. And
two Three.js scenes: the room stops while the Workshop is up, and restarts on
the way back.

One wrapper covers Save and the X both, because line 2043 already restores the
saved design on the way out.

Sandbox only. No SW bump.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 6: The browser harness, completed

**Files:**
- Modify: `wip/lobby-lab/visual-shell.js` (a reduced-motion context and a lifecycle block)

**Interfaces:**
- Consumes: everything Tasks 4 and 5 produced.
- Produces: nothing other code reads.

This closes spec § 7.3's remaining claims — the ones about W5's lifecycle and about reduced motion, neither of which the four-view or the `?live` block covers.

- [ ] **Step 1: Write the failing assertions**

In `wip/lobby-lab/visual-shell.js`, insert this block immediately above `await browser.close(); server.close();`:

```js
  // ── W5: the room is kept, stopped, and disposed exactly once ──────────────
  {
    const lc = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await lc.goto(`${base}?seed=7`); await settle(lc);
    await lc.waitForFunction(() => window.prmApi !== null, null, { timeout: 30000 });
    await lc.waitForFunction(() => window.prmDebug.isRunning() === true, null, { timeout: 20000 });

    await lc.evaluate(() => window.shellDispatch({ t: 'go', view: 'shelves' }));
    await lc.waitForFunction(() => window.shellState().room === 'idle', null, { timeout: 15000 });
    ok(await lc.evaluate(() => document.getElementById('prm-canvas') !== null), 'leaving Premium leaves the canvas in the DOM (W5)');
    ok(await lc.evaluate(() => window.prmApi !== null), 'and the scene is kept, not disposed');
    await lc.waitForFunction(() => window.prmDebug.isRunning() === false, null, { timeout: 20000 });
    ok(true, 'and the RAF is stopped — a hidden room costs nothing');

    // The attract interval must not wake it back up. It ticks every 100 ms.
    const f0 = await lc.evaluate(() => window.prmDebug.frames());
    await lc.waitForTimeout(1200);
    const f1 = await lc.evaluate(() => window.prmDebug.frames());
    ok(f1 === f0, `a stopped room renders no frames at all (advanced ${f1 - f0} over 1.2 s, want 0)`);

    await lc.evaluate(() => window.shellDispatch({ t: 'go', view: 'premium' }));
    await lc.waitForFunction(() => window.prmDebug.isRunning() === true, null, { timeout: 20000 });
    ok(true, 'returning to Premium restarts the same scene');
    ok(await lc.evaluate(() => window.prmDebug.frames()) > f1, 'and it renders again');

    // A round trip through every view never rebuilds it.
    const built0 = await lc.evaluate(() => window.prmDebug.nodes().length);
    for (const v of ['tv', 'shelves', 'original', 'premium']) {
      await lc.evaluate(x => window.shellDispatch({ t: 'go', view: x }), v);
      await lc.waitForFunction(x => window.shellState().view === x, v, { timeout: 15000 });
    }
    ok(await lc.evaluate(() => window.prmDebug.nodes().length) === built0, 'four view switches later it is still the same scene');
    await lc.close();
  }

  // ── reduced motion: the room is still honest inside the shell ─────────────
  {
    const rctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
    const rp = await rctx.newPage();
    await rp.goto(`${base}?seed=7`); await settle(rp);
    await rp.waitForFunction(() => window.prmApi !== null, null, { timeout: 30000 });
    await rp.waitForTimeout(1500);

    const m0 = await rp.evaluate(() => window.prmDebug.cameraMatrix());
    await rp.mouse.move(400, 300); await rp.mouse.move(900, 500); await rp.waitForTimeout(1200);
    const m1 = await rp.evaluate(() => window.prmDebug.cameraMatrix());
    ok(JSON.stringify(m0) === JSON.stringify(m1), 'reduced motion: the camera never moves inside the shell either');
    ok(await rp.evaluate(() => window.prmDebug.isRunning() === false), 'reduced motion: the loop settles idle');

    // The doors still work, they just do not travel.
    await rp.evaluate(() => window.prmApi.activate('phone'));
    await rp.waitForFunction(() => window.shellState().view === 'shelves', null, { timeout: 20000 });
    ok(true, 'reduced motion: the clamshell phone still reaches the Shelves');
    await rp.screenshot({ path: path.join(SHOTS, 'shell-reduced-1280.png') });
    await rp.close(); await rctx.close();
  }
```

- [ ] **Step 2: Run it to verify it fails**

Run: `NODE_PATH="$HOME/.claude-tooling/playwright/node_modules" node wip/lobby-lab/visual-shell.js`

Expected: it should **pass** if Task 1's `stop()`/`resume()` and Task 4's applier are both correct. That is the point of writing it last: this block is a regression net over work already done, and a failure here means one of them is wrong.

If `a stopped room renders no frames at all` fails, the attract `setInterval` guard from Task 1 step 8c was not applied. If `returning to Premium restarts the same scene` fails, `api.resume()` is not being called from the applier's `next.room === 'running'` branch.

- [ ] **Step 3: Run the whole verification set**

```bash
node wip/lobby-lab/verify-shell.js
node wip/lobby-lab/verify-lounge.js
node wip/premium/verify-prm-props.js
NODE_PATH="$HOME/.claude-tooling/playwright/node_modules" node wip/premium/visual-prm.js
NODE_PATH="$HOME/.claude-tooling/playwright/node_modules" node wip/lobby-lab/visual-shell.js
```

Expected: five PASS summaries, every one `0 failed`. Record the five counts — they go into `CLAUDE.md` in Task 7.

- [ ] **Step 4: Commit**

```bash
git add wip/lobby-lab/visual-shell.js
git commit -m "test(shell): prove the room is kept and stopped, not rebuilt

W5's claim measured rather than asserted: leaving Premium leaves the canvas in
the DOM and the scene alive, stops the RAF, and renders exactly zero frames
over the following 1.2 s — which is the check that would have caught the
attract interval waking a hidden room ten times a second. Four view switches
later it is still the same scene.

Plus reduced motion inside the shell: the camera never moves, the loop settles
idle, and the doors still work.

Sandbox only. No SW bump.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 7: Documentation closure

**Files:**
- Modify: `docs/implementation-notes/shared-implementation-notes.md`
- Modify: `docs/deferred-work.md`
- Modify: `docs/lobby-redesign-brief.md`
- Modify: `docs/decision-log.md`
- Modify: `CLAUDE.md` (§ Verification harnesses only)

**Interfaces:** none.

This is the Documentation Integrity Protocol pass for the round, run **once** at the end as the batching rule requires. `docs/code-map.md` and the identity docs are **not** touched — nothing shipped and no game changed.

- [ ] **Step 1: Record the two findings in shared implementation notes**

Open `docs/implementation-notes/shared-implementation-notes.md`, find the highest existing `DD-` number in the Design Decisions section, and add the next one. Follow the file's existing entry shape (**What happened → Root cause → Lesson**). Content to record:

- **The `ctlCloseWorkshop` return destination.** `js/controller.js:2044` hardcodes `showScreen('screen-lobby')`. Wiring the Premium lounge to the real Workshop meant the only way out landed on the shipped lobby, and the sandbox had to wrap `ctlCloseWorkshop` purely to hide it again. The lesson: a teardown function that also *navigates* has baked a caller's destination into a shared routine; shipped `controller.js` needs a return-destination variable (`ctlReturnScreen`) or Premium registered in `allScreens[]`, and the decision belongs to the production wiring round. Name `wip/lobby-lab/shell.html`'s `shellLoadLive()` as where the evidence lives.
- **One vendored Three serves both scenes.** The Premium room and the Workshop both read `window.THREE` from the single precached `js/lib/three.min.js`, so putting a 3D lounge in front of the Workshop adds **no library bytes** to the install. Record it as a real number for the production round's install maths (`docs/cost-envelope.md` is the doc that would care).

Also add the W5 measurement as a Bug Index or Template Gaps entry, whichever the file's existing shape fits: **a render-on-demand loop with a wake-on-interval companion cannot be stopped by hiding its canvas.** `prm-scene.js`'s attract `setInterval` guarded only on `document.hidden` and called `wake()` every 100 ms, so a CSS-hidden room kept rendering forever. The lesson generalises to any `wake()`/RAF pair in this suite (`ctlRaf`, `ntRafHandle`): if something *else* can wake the loop, `display:none` is not a stop — the api needs an explicit one.

- [ ] **Step 2: Update the deferred-work entry**

In `docs/deferred-work.md`, find the lobby-redesign entry and update it to say, in the file's existing style:

- Sandbox wiring is **done** — `wip/lobby-lab/shell.html` joins the two sandboxes.
- **Production** wiring is still deferred: `src/screens/lobby.html`, the `sw.js` precache, and the real layout switcher.
- `ctlReturnScreen` (or Premium in `allScreens[]`) is a **known prerequisite** for production wiring — see the new shared impl-notes DD.
- `jukebox-knob` is deliberately absent from `PRM_TAB_ORDER`: keyboard reach is a question for the round that builds the karaoke/jukebox feature.
- The jukebox/karaoke feature itself is undecided — the door exists (`openJukebox`, optional), nothing supplies it.

- [ ] **Step 3: Point the brief at the shell**

In `docs/lobby-redesign-brief.md`, add `wip/lobby-lab/shell.html` to whatever list that file uses to name the sandbox's pages, described as: the one page that shows all four layouts at once, with the Premium room's props as real doors between them, and `?live` for the shipped Workshop and sound overlay. Keep it to two or three sentences — that file is self-contained by design.

- [ ] **Step 4: Add the decision-log entry**

In `docs/decision-log.md`, add **one** entry at the **top** (newest first), matching the file's existing ~4-line shape. It should say: the Premium sandbox joins the lobby-lab sandbox behind a new `wip/lobby-lab/shell.html`, with the controller prop reaching the shipped `ctlOpenWorkshop()` under a `?live` flag so the Workshop return path, the design round-trip and two live Three.js scenes get settled before production wiring; and the jukebox knob is corrected from `openSound` to `openJukebox`, a dormant door to an undecided feature. Point at `docs/superpowers/specs/2026-09-19-premium-shell-wiring-design.md`. Note it is sandbox only — nothing shipped, no SW bump.

- [ ] **Step 5: Register the two harnesses**

In `CLAUDE.md` § Verification harnesses, add two rows to the table, using the counts recorded in Task 6 step 3. Follow the existing row format exactly (the `Controller` rows are the closest model — they are also "not a game"):

```markdown
| Shell | `node wip/lobby-lab/verify-shell.js` — the sandbox shell's pure tier: the router's three claims (the Workshop return path, the design round-trip, the room's keep-and-stop lifecycle) and the door map against `PRM_FUNCS`. **Not a game** — sandbox only | N |
| Shell | `node wip/lobby-lab/visual-shell.js` — real headless Chromium over `wip/lobby-lab/shell.html`: the four layouts, W6's summonable dock, the eligibility floor, and — under `?live` — the real Workshop, the save-return-repaint round-trip and the room stopping while it is up | N |
```

Replace each `N` with the real count. **Do not touch § Current Focus and do not change the SW version line** — nothing shipped.

- [ ] **Step 6: Verify the docs are current**

Run: `node tools/verify-build-fresh.js`
Expected: PASS — `index.html` is untouched, so this proves it.

Run: `git status --short`
Expected: only the five doc files from this task are modified, plus whatever was already dirty before the round began (`wip/lobby-lab/OWNER-REVIEW.md`, `games.js`, `lobby.css` and the untracked `wip/tv-*` directories were dirty at the start and are **not** this round's to stage).

- [ ] **Step 7: Commit**

```bash
git add docs/implementation-notes/shared-implementation-notes.md docs/deferred-work.md docs/lobby-redesign-brief.md docs/decision-log.md CLAUDE.md
git commit -m "docs(shell): close the sandbox wiring round

Records the two findings the round exists to bank: ctlCloseWorkshop hardcodes
showScreen('screen-lobby'), so production wiring needs a return destination
before Premium can host the Workshop; and one vendored Three serves both the
room and the Workshop, so the lounge adds no library bytes to the install.
Also the W5 lesson — a render-on-demand loop with a wake-on-interval companion
cannot be stopped by hiding its canvas.

Registers verify-shell.js and visual-shell.js. No SW version line changes:
nothing shipped.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage.** Every section maps to a task:

| Spec § | Task |
|---|---|
| § 2 W1 (new `shell.html`) | 4 |
| § 2 W2, W3 (`?live` on the shell, not the prop lab) | 5 |
| § 2 W4 (the jukebox knob) | 1 |
| § 2 W5 (hide and stop, never dispose) | 1 (`stop`/`resume`), 4 (the applier), 6 (the proof) |
| § 2 W6 (the summonable dock) | 2 (`switcher`), 4 (the dock) |
| § 2 W7 (`visual-shell.js` in scope) | 4, 5, 6 |
| § 3 file table | all — plus the fourth `prm-scene.js` edit, flagged in Global Constraints |
| § 4 the door map | 3 (`SHELL_DOORS`), 4 (the page) |
| § 4.1 the knob change | 1 |
| § 4.2 the generalised optional branch | 1 |
| § 5 the router | 2 |
| § 6.1 mount areas + asset bases | 4 |
| § 6.2 two sources of truth | 4 (the `lbSet` wrapper) |
| § 6.3 the loader + the wrapper | 5 |
| § 7.1 `verify-shell.js` | 2, 3 |
| § 7.2 `verify-prm-props.js` section | 1 |
| § 7.3 `visual-shell.js` | 4, 5, 6 |
| § 8 build order | task order; § 8's steps 1–7 map to Tasks 1–7 |
| § 9 doc updates | 7 |

**Placeholder scan.** No `TBD`/`TODO` in any step. Every code step carries the actual code. The one genuinely open value is the two harness counts in Task 7 step 5, which cannot be known until Task 6 runs — Task 6 step 3 explicitly instructs recording them.

**Type consistency.** `shellReduce(state, action)`, `shellCreateHost(deps)`, `SHELL_DOORS`, `SHELL_PAGE_ACTIONS`, `api.stop()`, `api.resume()`, `PRM_FUNCS`, `PRM_OPTIONAL_FUNCS`, `window.shellDispatch`, `window.shellState`, `window.shellReady`, `window.shellLive` are each defined once and used with the same name and shape everywhere after.
