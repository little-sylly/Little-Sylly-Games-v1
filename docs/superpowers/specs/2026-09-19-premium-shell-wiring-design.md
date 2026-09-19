# Premium Lounge — the sandbox wiring round (shell.html)

**Status:** design agreed 19 Sep 2026, not built. Follows
`2026-09-19-premium-lounge-reblock-design.md`, whose § 9 deferred this. **Sandbox only** —
nothing in `index.html`, `sw.js`, `src/screens/` or `js/`. No SW bump.

---

## 1. What this round is

The Premium lounge is built and screenshot-verified, but every one of its doors is a stub writing
to a status line. `wip/lobby-lab/` holds four lobby layouts, one of which (`premium`) renders the
placeholder *"Not this round — the shell is ready for it."* The two sandboxes have never met.

This round joins them: a full-window shell that hosts all four layouts, with the room's props as
real doors between them. It also — and this is the part worth doing now rather than at production
time — wires the **controller prop to the real shipped `ctlOpenWorkshop()`**, behind a URL flag.

### 1.1 Why the Workshop now, and not at production wiring

The owner asked whether trialling it early was worth anything. Three things it settles that a stub
structurally cannot:

1. **The return path is already wrong in shipped code.** `js/controller.js:2044` —
   `ctlCloseWorkshop()` hardcodes `showScreen('screen-lobby')`. In a Premium world the way out of
   the Workshop is back to the lounge. Either Premium becomes a screen id in `allScreens[]`, or
   `controller.js` learns a return destination — a decision that shapes the production round and is
   invisible from behind a stub.
2. **The design round-trip has never been exercised.** The room paints the TV, jukebox, dial and
   phone from `sylly_controller`; the Workshop writes that key on Save. `api.setDesign()` exists,
   but nothing has ever done save → return → repaint. That loop is the controller-in-the-room's
   entire reason for being there.
3. **Two Three.js scenes, two RAF loops.** `prmMount`'s renderer plus `ctlRaf` and its own. Whether
   the room must dispose or may merely stop is a real answer, cheap now and expensive to find on a
   mid-range phone later.

The sound overlay rides along because it costs one line once the engine is loaded, not because it
proves anything: `openSoundOverlay()` is a display toggle whose only Premium-specific behaviour is
`updateSliderTheme(null)` → neutral stone, already the documented fallback.

### 1.2 What this round is NOT

- **Not production wiring.** `src/screens/lobby.html`, `sw.js` precache and the real layout
  switcher still wait. Original spec § 1.1's round is unchanged.
- **Not a `js/` patch.** The `ctlCloseWorkshop` return-destination problem is *recorded*, not
  fixed (§ 6.3).
- **Not the stickerbook or the jukebox feature.** Both stay dormant doors.
- **Not Scene B's HUD, not the 2D chrome, not surface polish.** Unchanged from the re-block's list.
- **Scene B's framing question stays open.** `OWNER-REVIEW-2.md` flagged it; nothing here answers it.

---

## 2. Decisions locked with the owner (19 Sep 2026)

| # | Decision | Chosen over |
|---|---|---|
| W1 | **A new full-window page, `wip/lobby-lab/shell.html`**, hosts all four layouts plus the switcher | Extending `tv.html` (dilutes the one page that exists to judge TV mode honestly); making `wip/premium/index.html` the host (the page both premium harnesses run against would then boot the whole lobby sandbox) |
| W2 | **The real Workshop and sound overlay load only under `?live`.** The default URL stays isolated | Always-on (drags full engine boot state into every run); never (leaves § 1.1's three questions open) |
| W3 | **`?live` is a `shell.html` flag, not a `premium/index.html` one.** `wip/premium/index.html` stays a pure prop lab | Flagging the prop lab — the Workshop needs the return-to-lounge path, which only the shell has |
| W4 | **The jukebox knob is NOT the sound overlay.** It becomes `openJukebox` — an optional, dormant door to the undecided karaoke/jukebox feature, exactly as `openStickerbook` already is | Leaving it pointed at `openSound`, which was simply wrong |
| W5 | **Leaving Premium hides and stops the room; it never disposes it.** Dispose fires once, on leaving the shell | Dispose-per-switch — rebuilding re-runs every procedural texture and the PMREM pass |
| W6 | **The switcher is hidden in the Premium view and summoned by the telly's channel dial.** The other three views carry the normal fixed dock | An always-visible dock — the room is meant to be immersive, and it leaves `openSwitcher` with no job |
| W7 | **A browser harness (`visual-shell.js`) is in scope**, because the Workshop round-trip cannot be proven by a pure one | Router harness only |

---

## 3. Files

Five new, three edited. All under `wip/`.

| File | Status | What it is |
|---|---|---|
| `wip/lobby-lab/shell-router.js` | **new** | The pure state machine. Zero deps, drivable under Node — same shape as `lounge.js` and `js/lib/physics.js`. |
| `wip/lobby-lab/shell-host.js` | **new** | `shellCreateHost(deps)` → the object satisfying `PRM_REQUIRED`. The one place the door→destination map lives. No DOM. |
| `wip/lobby-lab/shell.html` | **new** | The page: mount areas, the summonable dock, the applier, the `?live` loader. Chrome CSS inline, as `tv.html` and `index.html` already do. |
| `wip/lobby-lab/verify-shell.js` | **new** | Node harness over the router and the door map. |
| `wip/lobby-lab/visual-shell.js` | **new** | Playwright — the tier no pure harness reaches. |
| `wip/premium/prm-props.js` | edit | One line: `jukebox-knob` moves off `openSound`. |
| `wip/premium/prm-scene.js` | edit | Generalise the optional-callback branch; extend `prmValidateHost`; export `PRM_FUNCS` (§ 7.1). |
| `wip/premium/verify-prm-props.js` | edit | One new section, **above** the `dial` section (which ends in an async `finish()`). |

`wip/premium/index.html` is **not** edited, and neither is `visual-prm.js` or either existing
lobby-lab page. `verify-prm-props.js` (389) and `visual-prm.js` (18) keep running against an
unchanged prop lab.

---

## 4. The door map

| Prop | `PRM_ACTIONS` id | Destination |
|---|---|---|
| Telly screen | `tv-screen` | `enterTV(null)` → the TV/Lounge layout |
| The dial | `dial` | spin → `enterTV(gameId)` → the TV/Lounge layout, seeded to that game |
| Clamshell phone | `phone` | `enterShelves()` → the Shelves layout |
| Telly channel dial | `tv-channel` | `openSwitcher()` → summons the dock (W6) |
| Telly volume dial | `tv-volume` | `openSound()` → real `openSoundOverlay()` under `?live`, else a status line |
| **Jukebox knob** | `jukebox-knob` | **`openJukebox` — dormant (W4).** Optional; nobody supplies it this round |
| Jukebox record | `jukebox-record` | `music.next` — unchanged |
| **Controller** | `controller` | **`openWorkshop()` → real `ctlOpenWorkshop()` under `?live`** |
| Binder | `binder` | `openStickerbook` — dormant, unchanged |
| Lamp | `lamp` | `local: 'flick'` — unchanged |

### 4.1 The jukebox knob change

```js
// prm-props.js — was: { callback: 'openSound' }
'jukebox-knob': { callback: 'openJukebox', optional: true, turn: true },
```

**It needs no new prop API.** `tweenTurn()` (`prm-scene.js:159`) writes `node.rotation.y`, and the
knob is a `CylinderGeometry` whose local Y *is* its axis; Three's default XYZ Euler applies `Ry`
before the mesh's own `x = π/2` tilt, so `.y` spins it about its own axis and the tilt then faces it
at the camera. With no host supplying `openJukebox`, **that turn is the entire response** — a
dormant door that still feels alive. This is cleaner than the binder's named-`fallback` shape, which
exists only because a cover flip has no generic action flag.

`jukebox-knob` is deliberately **not** added to `PRM_TAB_ORDER`. Keyboard reach is a question for
the round that builds the feature; adding it now would put a tab stop on a door that goes nowhere.

### 4.2 The optional-callback branch, generalised

`prm-scene.js`'s `activate()` currently special-cases `openStickerbook` **by name** (line 180).
Replace that with a flag-driven branch, so a second dormant door needs no third hardcoded name:

```js
if (a.optional) {
  if (typeof host[a.callback] === 'function') host[a.callback]();
  else if (a.fallback) built[id].userData.api[a.fallback](reduced());
  wake(); return;                      // a.turn already fired above (line 173)
}
```

`prmValidateHost` gains `openJukebox` alongside `openStickerbook` in the
"optional, but must be a function when given" check. **`PRM_REQUIRED` does not change** — an
optional door is not required.

---

## 5. The router

`shell-router.js` exports `SHELL_INIT` and `shellReduce(state, action)`. Pure: no DOM, no
`window`, no timers. `module.exports` plus `window.ShellRouter`, as every other lobby-lab module does.

### 5.1 State

```js
SHELL_INIT = {
  view:     'premium',      // 'premium' | 'tv' | 'shelves' | 'original'
  tvSel:    'ss',           // which game the TV layout is showing
  room:     'absent',       // 'absent' | 'running' | 'idle'
  workshop: false,          // the real Workshop screen is up
  switcher: false,          // the dock is visible (always true off premium — see W6)
  design:   null,           // the last-read sylly_controller design
  live:     false,          // ?live
}
```

`room` is three states, not a boolean, because "built but stopped" is the whole point of W5 and a
boolean cannot express it.

### 5.2 Actions

| Action | Effect |
|---|---|
| `{ t:'go', view }` | `view := view`; `room := view === 'premium' ? 'running' : (room === 'absent' ? 'absent' : 'idle')`; `switcher := view !== 'premium'` |
| `{ t:'enterTV', gameId }` | `view := 'tv'`; `tvSel := gameId` or unchanged if falsy; `room := 'idle'`; `switcher := true` |
| `{ t:'enterShelves' }` | `view := 'shelves'`; `room := 'idle'`; `switcher := true` |
| `{ t:'openSwitcher' }` | `switcher := true` (the only way to see the dock while on premium) |
| `{ t:'roomMounted' }` | `room := 'running'` |
| `{ t:'workshopOpen' }` | `workshop := true`; `room := 'idle'` |
| `{ t:'workshopClose' }` | `workshop := false`; `view := 'premium'`; `room := 'running'`; `switcher := false` |
| `{ t:'designSaved', design }` | `design := design` |
| `{ t:'leaveShell' }` | `room := 'absent'` |

`enterTV` with no `gameId` keeps the previous selection — the telly screen is a door to the layout,
not a game picker; only the dial picks.

`workshopClose` returning to `'premium'` is the whole finding of § 1.1.1 made assertable.

---

## 6. The shell page

### 6.1 Mount areas — reuse, don't re-render

`lobby.js`'s renderers already target fixed ids and each no-ops when its target is absent. The shell
supplies three of `lobby.js`'s four mount targets:

| id | Rendered by | Shown when |
|---|---|---|
| `prm-canvas` | `PrmScene.prmMount` | `view === 'premium'` |
| `tv-app` | `lbMountTVFull()` → `lgMount` | `view === 'tv'` |
| `shelves-canvas` | `lbRender()` | `view === 'shelves'` or `'original'` (phone width, centred) |

`wide-canvas` is deliberately absent — that is `index.html`'s 900×506 review frame, not a real
result. All three mounts run on every `lbSet`; the applier shows one and hides the rest. This is
near-zero new rendering code.

Asset bases move with the page and are passed through the host, so no module needs editing
(`prm-props.js` takes every URL from `ctx.stickers.base` and the lamp manifest base):

```js
stickers.base    = '../../data/stickers/'     // same depth: both are wip/<dir>/
lampPanels.base  = '../premium/lamp images/'
```

### 6.2 Two sources of truth, one rule

The router owns `view`; `lbState.view` is a projection of it. The dock's switcher buttons call
`lbSet({ view })` directly (`lobby.js:281`), so the shell **wraps `window.lbSet`**: a patch
containing `view` is routed through `shellReduce` first, everything else passes straight through.
One pattern, used twice — the same move as the `ctlCloseWorkshop` wrapper below.

### 6.3 `?live` — the loader and the wrapper

In order, before any shipped script is injected:

1. Fetch `../../src/screens/_shell.html` and `../../src/screens/_sound.html`; inject both into a
   hidden `#live-screens` container.
2. Add a stub `<button id="btn-mute" hidden>`. It is the one engine-required id that lives in a
   *game* partial (`src/screens/li5.html:109`) rather than the shell, and `engine.js:912` wires it
   unguarded.
3. Load `../../js/lib/tailwind-play.js` — the Workshop's markup is Tailwind.
4. Load, in shipped order: `js/lib/music.js` → `js/engine.js` →
   `js/lib/controller-sticker-surface.js` → `js/controller.js`.

`three.min.js` and `controller-body.js` are **not** in that list: the shell already loads them for
the room, and both halves use the same vendored copy. **The Workshop therefore costs no extra
library bytes on top of the room** — worth carrying into the production round's install maths.

`ctlMountLobby` on `DOMContentLoaded` is safe: it guards on `#lobby-controller`
(`js/controller.js:1894`), which `_shell.html` supplies.

The return wrapper:

```js
const realClose = window.ctlCloseWorkshop;
window.ctlCloseWorkshop = function () {
  realClose();                                          // teardown + showScreen('screen-lobby')
  document.getElementById('live-screens').style.display = 'none';
  dispatch({ t: 'designSaved', design: ctlReadDesign() });
  dispatch({ t: 'workshopClose' });
};
```

**One path covers both exits.** Save (`controller.js:2287`) calls `ctlWriteDesign(ctlDraft)` then
`ctlCloseWorkshop()`; the ✕ calls `ctlCloseWorkshop()` directly, and line 2043 restores the saved
design on the way out. So reading `ctlReadDesign()` *after* close is correct for Save and for
cancel, with no branch.

**The finding this banks, for the production round:** `realClose()` navigates to `screen-lobby` —
the *shipped* lobby, not the lounge — and the wrapper's job is to hide it again. That wrapper is
the evidence that shipped `controller.js` needs a return-destination variable
(`ctlReturnScreen`, or Premium registered in `allScreens[]`). It is **recorded here and in
`shared-implementation-notes.md`, not patched.**

---

## 7. Verification

### 7.1 `verify-shell.js` — pure, Node, zero deps

Follows `verify-lounge.js`'s shape (`require('./shell-router.js')`, plain `ok`/`eq` counters).

It also `require`s `../premium/prm-scene.js` for `PRM_FUNCS` and `prmValidateHost`. **Verified:**
that file requires cleanly under plain Node with no `global.window` shim — its `window.PrmScene`
assignment is already guarded on `typeof window`, `prmReducedMotion` guards the same way, and
`window.THREE` is read lazily inside `prmMount`. Unlike `verify-prm-props.js`, this harness needs
no DOM stubbing at all.

**One export is missing.** `PRM_FUNCS` is declared at `prm-scene.js:23` but the module exports only
`PRM_REQUIRED` (line 323). Add `PRM_FUNCS` to that export object — it belongs in § 3's
`prm-scene.js` edit, alongside the § 4.2 change.

**The three claims of § 1.1, made assertable:**

- **Return path** — `workshopClose` from any starting view lands on `'premium'`, never `'lobby'`
  or `'shelves'`, and clears `workshop`.
- **Round-trip** — `designSaved` changes `design`, and two consecutive identical `designSaved`
  actions leave a single change to apply, not two. **The pure harness asserts the state change
  only**; that the room actually repaints is § 7.3's job, because `api.setDesign` lives behind a
  WebGL context no Node harness has.
- **Lifecycle (W5)** — no `go` / `enterTV` / `enterShelves` / `workshopOpen` ever takes `room` to
  `'absent'`; only `leaveShell` does. A `go` to a non-premium view from `'absent'` stays `'absent'`
  (nothing to stop yet).

**Plus, on the door map:**

- Every name in `PrmScene.PRM_FUNCS` maps to exactly one router action, and no action is unreachable.
- `shellCreateHost(fakeDeps)` passes `PrmScene.prmValidateHost`.
- `enterTV()` with no `gameId` keeps the previous `tvSel`; with one, sets it.
- Every `tvSel` the dial can produce is a real id in `games.js`.
- `switcher` is true in every non-premium view and false on entering premium (W6).

### 7.2 `verify-prm-props.js` — one new section, above `dial`

- `PRM_ACTIONS['jukebox-knob']` names `openJukebox`, carries `optional: true` and `turn: true`, and
  no longer names `openSound`.
- `openSound` survives at exactly one site (`tv-volume`).
- `prmValidateHost` **accepts** a host with no `openJukebox`, **accepts** one with a function, and
  **rejects** one with a non-function — the same three cases `openStickerbook` already gets.
- `PRM_REQUIRED` is unchanged and does not contain `openJukebox`.
- Every `optional: true` action either carries `turn`/`spin`/`pushIn` or names a `fallback` that
  exists on its prop's api — so a dormant door can never be silent.

Placed above the `dial` section, which ends in an async `finish()`.

### 7.3 `visual-shell.js` — Playwright

The tier neither pure harness reaches. Serves the repo root as `visual-prm.js` does.

- The shell boots at 1280×720; each of the four views mounts its own area and hides the others.
- Leaving Premium leaves the canvas in the DOM (W5) and stops its RAF — read via
  `window.prmDebug.isRunning()`.
- The dock is absent on Premium and present on the other three (W6); `openSwitcher` reveals it.
- Below the 900×500 floor, the "wants a bigger screen" card shows and Premium is not offered.
- **Under `?live`:** the controller prop opens `screen-workshop`; saving a changed shell colour
  returns to Premium, and the room's props repaint — asserted through `prmDebug`, not by eye.

**Poll, never sleep.** Headless SwiftShader renders at ~3.5 fps; every wait is a
`waitForFunction` on a real condition.

---

## 8. Build order

Each step ends somewhere the owner can look.

1. **`prm-props.js` + `prm-scene.js` + the harness section** (§ 4). Self-contained;
   `verify-prm-props.js` grows past 389 and `visual-prm.js` stays 18. Nothing else depends on it.
2. **`shell-router.js` + `verify-shell.js`** (§ 5, § 7.1). Pure, no page yet. The three claims are
   green before a pixel exists.
3. **`shell-host.js`** (§ 4) + its harness section.
4. **`shell.html`, default mode** (§ 6.1, § 6.2). All four layouts, all doors but Workshop/Sound.
   First thing the owner can walk through.
5. **`?live`** (§ 6.3). The loader, the wrapper, the design round-trip.
6. **`visual-shell.js`** (§ 7.3).
7. **Docs** (§ 9).

Step 4 is the first review point. Step 5 is the one that earns the round.

---

## 9. Doc updates when it lands

- `docs/implementation-notes/shared-implementation-notes.md` — a new DD: the `ctlCloseWorkshop`
  return-destination finding (§ 6.3), and the shared-vendored-Three observation (§ 6.3).
- `docs/deferred-work.md` — the lobby-redesign entry: sandbox wiring done, **production** wiring
  still deferred; add `ctlReturnScreen` as a known prerequisite; note `jukebox-knob`'s absence from
  `PRM_TAB_ORDER`.
- `docs/lobby-redesign-brief.md` — point at `shell.html` as the way to see all four layouts at once.
- `docs/decision-log.md` — one line: the Premium sandbox joins the lobby sandbox behind `?live`;
  the jukebox knob is a dormant door, not the sound overlay.
- `CLAUDE.md` § Verification harnesses — `verify-shell.js` and `visual-shell.js` rows. **No SW
  version line changes** — nothing shipped.
