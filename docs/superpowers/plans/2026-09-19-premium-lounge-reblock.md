# Premium Lounge Re-block Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-block the Premium lounge greybox so it reads as a cosy, lamp-lit toy diorama: a compressed room seen from the couch, lit by late sun through a drawn curtain on the left, with three reshaped props.

**Architecture:** Everything stays in the `wip/premium/` sandbox and stays procedural. The room shell (`prm-room.js`) gets a smaller box, a seat, a left-wall window with two curtain halves, a sill and a plant; the scene (`prm-scene.js`) gets a seated camera, a window key light and a darker exposure; the lib (`prm-lib.js`) gets the deeper palette, a braid texture and a droopy-ear helper; two builders in `prm-props.js` are reshaped (TV ears, cat-jar jukebox) and the lamp moves to the shelf. Every step is asserted by the existing Node harness (`verify-prm-props.js`, sections above `dial`) and the Playwright driver (`visual-prm.js`), which gains pixel probes.

**Tech Stack:** Vanilla JS, Three.js r128 (vendored, `js/lib/three.min.js`), canvas textures, Node harness, Playwright headless Chromium under SwiftShader.

**Spec:** `docs/superpowers/specs/2026-09-19-premium-lounge-reblock-design.md` (amends `2026-09-18-premium-lounge-scene-design.md`).

## Global Constraints

- **Sandbox only.** Nothing in `index.html`, `sw.js`, `src/screens/` or `js/`. No SW bump.
- **Builders are pure.** Every builder takes `lib` (never `THREE` directly, never `window`), touches no `document`, loads no image — the harness arms a throwing trap on `document` and `localStorage` after Three loads.
- **New harness sections go ABOVE the `dial` section** in `verify-prm-props.js`; `dial` ends with an async `finish()`.
- **Headless SwiftShader renders at ~3.5 fps** — in `visual-prm.js` poll with `waitForFunction`, never assert on a fixed sleep.
- **Colour inheritance contract (original spec § 10) unchanged**: only `shell / plate / ears / buttons` are roles; the room and the plant are fixed neutrals with no `prmRole`.
- **`MeshStandardMaterial` only** (original § 15) — no `MeshPhysicalMaterial`, no transmission.
- **One shadow-casting light.**
- **Reduced motion:** nothing travels; the existing checks in `visual-prm.js` must keep passing.
- **Australian English** in every comment and doc.
- **Commit per task**, staging only the files the task touched (the tree carries unrelated uncommitted `wip/` work — never `git add -A`).
- Run the harness from the repo root: `node wip/premium/verify-prm-props.js`. Run the visual driver: `NODE_PATH="$HOME/.claude-tooling/playwright/node_modules" node wip/premium/visual-prm.js` (Git Bash).
- **Numbers are targets, ratios are the contract.** Every position below is a starting value the spec says to tune by eye against the shots. Tune freely; keep the harness regions in step.

---

## File map

| File | Responsibility | Tasks |
|---|---|---|
| `wip/premium/prm-room.js` | The shell: box, seat, window/curtain/sill/plant, rug, furniture | 1, 2, 3 |
| `wip/premium/prm-scene.js` | Presets, lights, env map, exposure, fog, `prmDebug` probes | 1, 2, 6 |
| `wip/premium/prm-lib.js` | Materials, textures (`braid`), `droopEar` helper | 2, 3, 4 |
| `wip/premium/prm-props.js` | `PRM_PLACES`, TV ears, cat jar, shelf layout | 1, 3, 4, 5 |
| `wip/premium/prm-hud.css` | Vignette strength | 2 |
| `wip/premium/verify-prm-props.js` | Pure-tier assertions | 1–5 |
| `wip/premium/visual-prm.js` | Shots + pixel probes + lamp size | 2, 6 |
| `wip/premium/OWNER-REVIEW-2.md` | Round-2 review | 7 |
| `docs/…` | Closure | 7 |

---

### Task 1: The box and the seat

Compress the room, seat the camera, add the seat cushion, move every prop to the new surfaces. **Judge scale alone after this task** — reshoot before touching the light.

**Files:**
- Modify: `wip/premium/prm-room.js` (the `R` constants, walls, table, bench, deck, couch arm; add `seat`)
- Modify: `wip/premium/prm-scene.js:11-14` (`PRM_PRESETS`), `:63` (fog)
- Modify: `wip/premium/prm-props.js:28-37` (`PRM_PLACES`)
- Modify: `wip/premium/verify-prm-props.js` (`room` section names/constants; `contracts` REGIONS)

**Interfaces:**
- Produces: `room.userData.prmRoom = { floorY, backZ, leftX, benchZ, benchTopY, tableTopY, tableX, tableZ, armTopY, seatTopY, sideTableTopY }` — `tableX/tableZ/seatTopY` are new; `sideTableTopY` is kept this task (removed in Task 3 with the side table). Later tasks read positions from here, never literals.

- [ ] **Step 1: Write the failing assertions**

In `verify-prm-props.js`, `room` section, replace the `prmRoom.*` key list and add the seat/table checks. Replace this block:

```js
  ['floorY', 'backZ', 'leftX', 'benchZ', 'benchTopY', 'tableTopY', 'armTopY', 'sideTableTopY'].forEach(k => ok(typeof R[k] === 'number', `prmRoom.${k} is a number`));
  near(R.benchTopY, 0.52, 0.001, 'bench top height'); near(R.tableTopY, 0.44, 0.001, 'table top height');
```

with:

```js
  ['floorY', 'backZ', 'leftX', 'benchZ', 'benchTopY', 'tableTopY', 'tableX', 'tableZ', 'armTopY', 'seatTopY'].forEach(k => ok(typeof R[k] === 'number', `prmRoom.${k} is a number`));
  near(R.benchTopY, 0.52, 0.001, 'bench top height'); near(R.tableTopY, 0.44, 0.001, 'table top height');
  // the re-block (spec 2026-09-19 § 3.1): a corner, not a hall
  ok(R.backZ > -1.8 && R.backZ < -1.3, `back wall is close (backZ ${R.backZ})`);
  ok(R.leftX > -1.9 && R.leftX < -1.3, `left wall is close (leftX ${R.leftX})`);
  ok(R.benchZ - R.tableZ > -1.3 && R.benchZ - R.tableZ < -0.7, `bench sits about a metre behind the table (${(R.tableZ - R.benchZ).toFixed(2)} m)`);
  ok(R.tableX > 0.2, `table is right of centre (tableX ${R.tableX})`);
  ok(R.seatTopY > R.tableTopY && R.seatTopY < R.armTopY, 'seat cushion sits between table top and arm top');
```

In the same section, add `'seat'` to the room-name list (the array beginning `['wallBack', 'wallLeft', …`), and after the `couchArm` check add:

```js
  const seat = new THREE.Box3().setFromObject(room.getObjectByName('seat'));
  near(seat.max.y, R.seatTopY, 0.002, 'seat top equals prmRoom.seatTopY');
  ok(seat.min.z > R.tableZ + 0.31 - 0.02, 'seat front does not run under the table');
  ok(arm.min.z < seat.min.z, 'the arm reaches ahead of the seat (a real couch arm)');
```

In the `contracts` section replace the `REGIONS` object with regions derived from `R`:

```js
  const REGIONS = {
    tv:        { x: [R.tableX - 1.30, R.tableX - 0.50], z: [R.benchZ - 0.30, R.benchZ + 0.30], y: [R.benchTopY, 1.5] },
    jukebox:   { x: [R.tableX - 0.30, R.tableX + 0.30], z: [R.benchZ - 0.30, R.benchZ + 0.30], y: [R.benchTopY, 1.5] },
    dial:      { x: [R.tableX - 0.57, R.tableX + 0.57], z: [R.tableZ - 0.33, R.tableZ + 0.33], y: [R.tableTopY, 0.8] },
    binder:    { x: [R.tableX - 0.57, R.tableX + 0.57], z: [R.tableZ - 0.33, R.tableZ + 0.33], y: [R.tableTopY, 0.8] },
    phone:     { x: [R.tableX - 0.57, R.tableX + 0.57], z: [R.tableZ - 0.33, R.tableZ + 0.33], y: [R.tableTopY, 0.8] },
    controller:{ x: [-1.05, -0.35], z: [ 0.30,  1.10], y: [R.armTopY, 1.0] },
    lamp:      { x: [-1.95, -1.45], z: [-2.35, -1.85], y: [R.sideTableTopY, 1.0] },
  };
```

(The `lamp` region is replaced in Task 3 when the lamp moves to the shelf; the side table and `sideTableTopY` survive until then, so leave that line and the `sideTableTop`/`sideTableLeg2` names in place this task.)

- [ ] **Step 2: Run the harness, confirm it fails**

Run: `node wip/premium/verify-prm-props.js`
Expected: FAILs naming `prmRoom.tableX is a number`, `room has seat`, `back wall is close`, and several `sits inside its surface region`.

- [ ] **Step 3: Rewrite the room constants, walls, table, bench, arm; add the seat**

In `prm-room.js` replace the `R` line with:

```js
    /* The re-block (spec 2026-09-19 § 3.1): a corner about 3.2 m wide and 1.9 m
       deep, the bench a metre behind a table that sits right of centre, and a
       seat we are sitting on. Every prop reads its surface from here. */
    const R = { floorY: 0, backZ: -1.55, leftX: -1.6, benchZ: -1.15, benchTopY: 0.52, tableTopY: 0.44, tableX: 0.35, tableZ: 0.24, armTopY: 0.58, seatTopY: 0.47, sideTableTopY: 0.565 };
```

Replace the walls + trim block with (planes wide enough to overhang a 50° frame at 3 m):

```js
    // walls + trim — the planes overhang the frame; the cornice is the one line that says "room" at the top
    add('wallBack', new THREE.PlaneGeometry(5.6, 3.2), mats.wall, [0.0, 1.6, R.backZ]);
    add('wallLeft', new THREE.PlaneGeometry(4.0, 3.2), mats.wall, [R.leftX, 1.6, 0.0], [0, Math.PI / 2, 0]);
    add('skirtingBack', new THREE.BoxGeometry(5.6, 0.1, 0.02), mats.skirting, [0.0, 0.05, R.backZ + 0.01]);
    add('skirtingLeft', new THREE.BoxGeometry(0.02, 0.1, 4.0), mats.skirting, [R.leftX + 0.01, 0.05, 0.0]);
    add('cornice', new THREE.BoxGeometry(5.6, 0.06, 0.04), mats.skirting, [0.0, 3.17, R.backZ + 0.02]);
    add('floor', new THREE.PlaneGeometry(9, 9), mats.floor, [0.5, 0, 0.5], FLAT);
```

Replace the rug line (still rectangular this task — Task 3 makes it round) and the coffee table block with:

```js
    // rug — receives every table prop's contact shadow (round in Task 3)
    add('rug', moulded(2.3, 1.7, 0.012, 0.08, { bevel: 0.004 }), mats.rug, [R.tableX, 0.006, R.tableZ], FLAT);

    // coffee table (top surface = tableTopY), right of centre so it is not stacked under the telly
    add('tableTop', moulded(1.1, 0.62, 0.04, 0.05), mats.birch, [R.tableX, R.tableTopY - 0.02, R.tableZ], FLAT, { cast: true });
    [[-0.48, 0.22], [0.48, 0.22], [-0.48, -0.22], [0.48, -0.22]].forEach(([x, z], i) =>
      add('tableLeg' + i, new THREE.CylinderGeometry(0.02, 0.025, 0.4, 16), mats.birchDark, [R.tableX + x, 0.2, R.tableZ + z], null, { cast: true }));
```

Replace the TV bench block (bench centred at `BX`, everything on it offset from `BX`):

```js
    // TV bench: body spans y 0.08..0.52 on two short legs; the deck lives in the open middle. Slightly LEFT of centre (the table is right)
    const BX = -0.15;
    add('bench', moulded(1.9, 0.44, 0.46, 0.05), mats.birch, [BX, 0.30, R.benchZ], null, { cast: true });
    add('benchDrawerL', moulded(0.5, 0.16, 0.02, 0.02), mats.birchDark, [BX - 0.65, 0.30, R.benchZ + 0.235]);
    add('benchDrawerR', moulded(0.5, 0.16, 0.02, 0.02), mats.birchDark, [BX + 0.65, 0.30, R.benchZ + 0.235]);
    add('benchKnobL', new THREE.CylinderGeometry(0.015, 0.015, 0.02, 16), mats.brass, [BX - 0.65, 0.30, R.benchZ + 0.255], [Math.PI / 2, 0, 0]);
    add('benchKnobR', new THREE.CylinderGeometry(0.015, 0.015, 0.02, 16), mats.brass, [BX + 0.65, 0.30, R.benchZ + 0.255], [Math.PI / 2, 0, 0]);
    [BX - 0.85, BX + 0.85].forEach((x, i) => add('benchLeg' + i, new THREE.CylinderGeometry(0.02, 0.02, 0.08, 12), mats.birchDark, [x, 0.04, R.benchZ]));
    add('deck', moulded(0.42, 0.1, 0.3, 0.015), mats.cream, [BX, 0.30, R.benchZ + 0.06], null, { cast: true });
    for (let i = 0; i < 4; i++) add('deckKey' + i, new THREE.BoxGeometry(0.03, 0.012, 0.02), mats.plum, [BX - 0.12 + i * 0.045, 0.315, R.benchZ + 0.215]);
```

Replace the couch arm line with the arm + seat:

```js
    // the couch we are sitting on: a seat cushion along the bottom of frame (top = seatTopY) and the arm
    // it belongs to, left of the table, reaching ahead of the seat so its front shows bottom-left
    add('seat', moulded(1.3, 0.47, 1.0, 0.09), mats.fabric, [0.07, R.seatTopY - 0.235, 1.08], null, { cast: true });
    add('couchArm', moulded(0.4, 0.58, 0.95, 0.09), mats.fabric, [-0.62, R.armTopY - 0.29, 0.925], null, { cast: true });
```

Leave the bookshelf, side table, window, curtain, floor lamp and prints exactly as they are this task (their old positions are now outside the frame; Tasks 2 and 3 move them).

- [ ] **Step 4: Move the props and the camera**

In `prm-props.js` replace `PRM_PLACES` with:

```js
  /* World placement per prop group. y values sit on the room's surfaces
     (prm-room.js prmRoom): bench top 0.52, table top 0.44, arm top 0.58,
     side table top 0.565. x/z mirror prmRoom's tableX/tableZ/benchZ — keep
     them in step by hand; the harness footprint check is what catches drift. */
  const PRM_PLACES = {
    tv:            { pos: [-0.55, 0.52, -1.10] },
    jukebox:       { pos: [ 0.35, 0.52, -1.10] },
    dial:          { pos: [ 0.60, 0.44,  0.20] },
    binder:        { pos: [ 0.05, 0.44,  0.12], rot: [0, 0.18, 0] },
    phone:         { pos: [ 0.78, 0.44,  0.45], rot: [0, -0.5, 0] },
    controller:    { pos: [-0.62, 0.58,  0.62], rot: [0, -0.35, 0] },
    lamp:          { pos: [-1.70, 0.565, -2.10] },
    shelfContents: { pos: [0, 0, 0] },
  };
```

In `prm-scene.js` replace `PRM_PRESETS` with:

```js
  /* Seated on the couch, the table pushed up to our knees: eye height just
     behind the table's near edge, which is the bottom of frame. Portrait is
     re-aimed in Task 6. */
  const PRM_PRESETS = {
    wide:     { pos: [-0.05, 1.05, 1.45], look: [0.05, 0.45, -1.15], fov: 50 },
    portrait: { pos: [0.00, 1.55, 1.75], look: [0.00, 0.45,  0.25], fov: 52 },
  };
```

and the fog line (`scene.fog = …`) with a fog that actually reaches the back wall (3 m from the eye) without washing it:

```js
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#efe6dc'); scene.fog = new THREE.Fog('#b59a80', 2.8, 6.5);
```

- [ ] **Step 5: Run the harness, confirm it passes**

Run: `node wip/premium/verify-prm-props.js`
Expected: `N passed, 0 failed` with N ≥ 304 (297 + the new room/seat checks). If a footprint check fails, adjust the failing entry in `PRM_PLACES` (the region is derived from `R` and is right; the place is the thing to move).

- [ ] **Step 6: Reshoot and look**

Run: `NODE_PATH="$HOME/.claude-tooling/playwright/node_modules" node wip/premium/visual-prm.js`
Expected: 12 passed. Open `wip/premium/shots/wide-1280.png` with the Read tool. Check by eye: the table's near edge is at or just above the bottom of frame; the bench and telly fill the middle band; the arm and controller show bottom-left; a strip of seat cushion may show along the bottom. The old lamp, side table, curtain and shelf will be off-frame or badly placed — expected until Tasks 2–3. If the controller is out of frame, move `PRM_PLACES.controller` inboard (x toward 0) and the arm with it, not the camera.

- [ ] **Step 7: Commit**

```bash
git add wip/premium/prm-room.js wip/premium/prm-scene.js wip/premium/prm-props.js wip/premium/verify-prm-props.js wip/premium/shots/
git commit -m "feat(premium): re-block step 1 — compress the room, seat the camera, add the couch seat"
```

---

### Task 2: The light — window as key, Saturday afternoon

Move the window and curtain to the left wall (two halves, a slit), add the sill, remove the floor lamp, replace the lighting rig, deepen the palette, strengthen the vignette, and give the visual driver pixel probes. **Ship the shots to the owner after this task** (spec § 10).

**Files:**
- Modify: `wip/premium/prm-room.js` (window, curtain halves, sill; delete floor lamp; delete side table only in Task 3)
- Modify: `wip/premium/prm-scene.js` (lights, env map, exposure, background, `prmDebug` probes)
- Modify: `wip/premium/prm-lib.js` (`wallpaper` defaults, `floor`, `fabric`, `curtain`, `window` mats; remove `shade`)
- Modify: `wip/premium/prm-hud.css:6-7` (vignette)
- Modify: `wip/premium/verify-prm-props.js` (`lib` mats list; `room` section)
- Modify: `wip/premium/visual-prm.js` (probes)

**Interfaces:**
- Produces: `room.userData.prmRoom.sillTopY` (number), room meshes `window`, `curtainL`, `curtainR`, `sill`; `window.prmDebug.lights()` → `[{ name, type, castShadow, position: [x,y,z] }]`; `window.prmDebug.lumaGrid(cols, rows)` → `number[]` of patch mean lumas (0–255) after a fresh render; `window.prmDebug.screenBox(id)` → `{ w, h }` in CSS px.

- [ ] **Step 1: Write the failing assertions (Node harness)**

In `verify-prm-props.js` `lib` section, change the mats list: remove `'shade'`, keep the rest (Task 3 adds more). In the `room` section: in the room-name list remove `'curtain'`, `'floorLampBase'`, `'floorLampStem'`, `'floorLampShade'` and add `'window'` (already there), `'curtainL'`, `'curtainR'`, `'sill'`. Replace the old curtain check (`const cur = room.getObjectByName('curtain'); …`) with:

```js
  // the window is on the LEFT wall, drawn, with a slit (spec 2026-09-19 § 3.2, D4/D5)
  ok(typeof R.sillTopY === 'number', 'prmRoom.sillTopY is a number');
  ok(!roomNames.has('floorLampShade') && !roomNames.has('floorLampStem'), 'the floor lamp is gone');
  const win = new THREE.Box3().setFromObject(room.getObjectByName('window'));
  ok(win.max.x - win.min.x < 0.05 && win.min.x < R.leftX + 0.05, 'window plane lies in the left wall');
  const cl = new THREE.Box3().setFromObject(room.getObjectByName('curtainL')), cr = new THREE.Box3().setFromObject(room.getObjectByName('curtainR'));
  ok(cl.max.y - cl.min.y > 1.8 && cr.max.y - cr.min.y > 1.8, 'both curtain halves stand tall');
  const gap = Math.max(cl.min.z, cr.min.z) - Math.min(cl.max.z, cr.max.z);
  ok(gap > 0.06 && gap < 0.14, `the two halves leave a hand-width slit (${gap.toFixed(3)} m)`);
  ok(cl.max.x < R.leftX + 0.3 && cr.max.x < R.leftX + 0.3, 'curtain hangs against the left wall');
  const sill = new THREE.Box3().setFromObject(room.getObjectByName('sill'));
  near(sill.max.y, R.sillTopY, 0.002, 'sill top equals prmRoom.sillTopY');
  ok(!room.getObjectByName('curtainL').castShadow, 'curtain halves do not cast (the sun must reach the room through them)');
```

- [ ] **Step 2: Run the harness, confirm it fails**

Run: `node wip/premium/verify-prm-props.js`
Expected: FAILs on `room has curtainL`, `room has sill`, `mats.shade exists` no longer listed (that one simply stops being checked), `prmRoom.sillTopY`.

- [ ] **Step 3: Move the window, split the curtain, add the sill, drop the floor lamp**

In `prm-room.js`, add `sillTopY: 0.68` to `R`. Replace the window + curtain block and delete the floor lamp block, so those lines read:

```js
    // window on the LEFT wall — the visible source of the key. Centre sits toward the back so the
    // whole opening is in frame from the couch. Sill = a birch ledge the plant sits on (Task 3).
    const WZ = -0.90, WY = 1.25, WW = 0.75, WH = 1.1;
    add('window', new THREE.PlaneGeometry(WW, WH), mats.window, [R.leftX + 0.005, WY, WZ], [0, Math.PI / 2, 0]);
    add('sill', new THREE.BoxGeometry(0.16, 0.03, 0.9), mats.birch, [R.leftX + 0.08, R.sillTopY - 0.015, WZ], null, { cast: true });
    /* Drawn, in two halves, a 0.10 m slit at about 40 % of the width (spec D5). The halves do NOT
       cast: the sun light passes through the curtain as a real drawn curtain glows and diffuses —
       the slit's bright stripe is its own narrow light in prm-scene.js, not a shadow cut-out. */
    const CUR_W = 1.0, GAP = 0.10, halfW = (CUR_W - GAP) / 2, gapAt = WZ - CUR_W / 2 + CUR_W * 0.40;
    add('curtainL', prmCurtainGeometry(lib, halfW, 2.2, 4), mats.curtain, [R.leftX + 0.12, 1.15, gapAt - GAP / 2 - halfW / 2], [0, Math.PI / 2, 0], { cast: false });
    add('curtainR', prmCurtainGeometry(lib, halfW, 2.2, 4), mats.curtain, [R.leftX + 0.12, 1.15, gapAt + GAP / 2 + halfW / 2], [0, Math.PI / 2, 0], { cast: false });
```

Delete the three `floorLamp*` lines entirely. Leave the side table and prints for Task 3.

- [ ] **Step 4: Replace the lighting rig and the exposure**

In `prm-scene.js` replace the renderer/scene/env/lights lines (from `renderer.toneMapping = …` through `const dialLight = …`) with:

```js
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.68;   // Saturday afternoon: darker, not dark (spec D7)
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#d9c7b4'); scene.fog = new THREE.Fog('#b59a80', 2.8, 6.5);
    scene.environment = prmBuildEnvMap(THREE, renderer);
    const camera = new THREE.PerspectiveCamera(35, 16 / 9, 0.05, 30);
    const lookAt = new THREE.Vector3();
    const room = window.PrmRoom.prmBuildRoom(lib); scene.add(room);
    const RM = room.userData.prmRoom;

    // lights — spec 2026-09-19 § 3.2: the window is the light. One shadow-casting sun outside the left
    // wall, wide and warm, plus a narrow bright spot for the slit's stripe; a low fill; the telly's spill.
    const sun = new THREE.SpotLight('#ffcf9a', 2.2, 12, 0.95, 0.55, 1); sun.name = 'sun';
    sun.position.set(RM.leftX - 0.9, 2.0, -0.9); sun.target.position.set(0.7, 0.35, -0.4);
    sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.0004; sun.shadow.radius = 3;
    scene.add(sun, sun.target);
    const slit = new THREE.SpotLight('#ffd9ae', 3.0, 9, 0.16, 0.7, 1); slit.name = 'slit';
    slit.position.set(RM.leftX - 0.3, 1.7, -0.62); slit.target.position.set(0.9, 0.4, -1.0);
    scene.add(slit, slit.target);
    const fill = new THREE.HemisphereLight('#b9c4cf', '#c9a98a', 0.10); fill.name = 'fill'; scene.add(fill);
    const tvLight = new THREE.PointLight('#bfe6d0', 0.6, 2.5, 2); tvLight.name = 'tvLight'; tvLight.position.set(-0.55, 0.9, -0.85); scene.add(tvLight);
    const glow = new THREE.PointLight('#ffd0a0', 0.6, 1.4, 2); glow.name = 'windowGlow'; glow.position.set(RM.leftX + 0.25, 1.2, -0.9); scene.add(glow);
    const dialLight = new THREE.PointLight(design.buttons || '#ffffff', 0.25, 0.6, 2); dialLight.name = 'dialLight'; dialLight.position.set(0.60, 0.5, 0.2); scene.add(dialLight);
```

Then delete the later duplicate `const room = window.PrmRoom.prmBuildRoom(lib); scene.add(room);` line (the room is now built before the lights so the lights can read `RM`).

In `prmBuildEnvMap` darken the ambient and the cool side so plastic still rims warm from the left:

```js
    const env = new THREE.Scene(); env.background = new THREE.Color('#8f8378');
    …
    plane(6, 3, [-3, 3, 0], [0, Math.PI / 2, 0], '#e8c9a2');    // warm, above-left (the window side)
    plane(4, 4, [3, 2, 0], [0, -Math.PI / 2, 0], '#9fb0bf');    // cool, right, dimmer than before
```

(keep the floor and ceiling planes as they are).

- [ ] **Step 5: Deepen the palette**

In `prm-lib.js`:
- `wallpaper(base = '#e9c4a6', tone = '#d9ad8c', rx = 6, ry = 4)` — the arches now sit at ~15 % contrast.
- `floor: std({ map: tex.wood('#c99a6b', '#a87a4e', 6, 6), roughness: .5 })`.
- `fabric: std({ color: '#8a7566', bumpMap: tex.boucle(), bumpScale: .006, roughness: 1 })`.
- `window: std({ color: '#f4dcc0', emissive: '#f4dcc0', emissiveIntensity: 0.9, roughness: .8 })` — warm sun behind a curtain, not sky.
- Delete the `shade:` line.

In `prm-hud.css` line 6–7:

```css
#prm-vignette { position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 48%, rgba(43,27,69,0.40) 100%); }
```

- [ ] **Step 6: Run the harness, confirm it passes**

Run: `node wip/premium/verify-prm-props.js`
Expected: `0 failed`.

- [ ] **Step 7: Add the probes to `prmDebug` and the visual assertions**

In `prm-scene.js` replace the `if (host.debug) window.prmDebug = …` line with:

```js
    if (host.debug) window.prmDebug = {
      cameraMatrix: () => camera.matrixWorld.elements.slice(), frames: () => frames, isRunning: () => timers.raf !== null, nodes: () => Object.keys(nodes), api,
      lights() { const out = []; scene.traverse(o => { if (o.isLight) out.push({ name: o.name, type: o.type, castShadow: !!o.castShadow, position: o.position.toArray() }); }); return out; },
      /* Mean luma (0–255) of a cols×rows grid of patches, read straight off the GL buffer after a fresh
         render — same task, so no preserveDrawingBuffer needed. Row 0 is the TOP of the frame. */
      lumaGrid(cols = 8, rows = 5) {
        renderer.render(scene, camera); const gl = renderer.getContext(), W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
        const px = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
        const out = []; const pw = Math.floor(W / cols), ph = Math.floor(H / rows);
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          let sum = 0, n = 0;
          for (let y = (rows - 1 - r) * ph; y < (rows - r) * ph; y += 4) for (let x = c * pw; x < (c + 1) * pw; x += 4) { const i = (y * W + x) * 4; sum += 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]; n++; }
          out.push(sum / n);
        }
        return out;
      },
      screenBox(id) {
        const node = nodes[id]; if (!node) return null; const box = new THREE.Box3().setFromObject(node); const r = canvasEl.getBoundingClientRect();
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        for (let i = 0; i < 8; i++) { const v = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(camera);
          const sx = (v.x + 1) / 2 * r.width, sy = (1 - v.y) / 2 * r.height; x0 = Math.min(x0, sx); y0 = Math.min(y0, sy); x1 = Math.max(x1, sx); y1 = Math.max(y1, sy); }
        return { w: x1 - x0, h: y1 - y0 };
      },
    };
```

In `visual-prm.js`, inside the `for (const [w, h] of …)` loop's `if (w === 1280)` block, before the portrait preset switch, add:

```js
      // spec 2026-09-19 § 7 items 6 and 8 — the light rig and the mood, measured
      const lights = await page.evaluate(() => window.prmDebug.lights());
      const casters = lights.filter(l => l.castShadow);
      ok(casters.length === 1, `exactly one shadow-casting light (${casters.map(l => l.name).join(',') || 'none'})`);
      ok(casters[0] && casters[0].position[0] < -1.6, 'the caster sits outside the left wall (the window is the light)');
      ok(!lights.some(l => l.name === 'bulb'), 'no floor-lamp bulb light remains');
      const grid = await page.evaluate(() => window.prmDebug.lumaGrid(8, 5));
      const mean = grid.reduce((a, b) => a + b, 0) / grid.length, lo = Math.min(...grid), hi = Math.max(...grid);
      ok(mean > 60 && mean < 150, `frame is darker, not dark (mean luma ${mean.toFixed(0)}, want 60–150)`);
      ok(hi / Math.max(lo, 1) >= 2.2, `there is a lit wall and a dark corner (patch range ${lo.toFixed(0)}–${hi.toFixed(0)})`);
```

- [ ] **Step 8: Run the visual driver, then look**

Run: `NODE_PATH="$HOME/.claude-tooling/playwright/node_modules" node wip/premium/visual-prm.js`
Expected: 17 passed (12 + 5). Read `wip/premium/shots/wide-1920.png`. Look for: a warm diagonal on the back wall, the left corner in shadow, the curtain glowing with a brighter stripe from the slit, arches visible in the shadowed half, birch furniture reading lighter than the floor. If the room is muddy, raise `sun` intensity before touching exposure; if flat, lower `fill` before touching the palette. Keep the mean-luma window; it is the owner's "darker, not dark".

- [ ] **Step 9: Commit and hand the owner the shots**

```bash
git add wip/premium/prm-room.js wip/premium/prm-scene.js wip/premium/prm-lib.js wip/premium/prm-hud.css wip/premium/verify-prm-props.js wip/premium/visual-prm.js wip/premium/shots/
git commit -m "feat(premium): re-block step 2 — window as key on the left, drawn curtain with a slit, Saturday-afternoon exposure"
```

Then tell the owner where `shots/wide-1920.png` is and ask the one question: does the *scale and mood* now read? (Steps 1–2 are the whole bet, spec § 10.) Continue with Task 3 while waiting unless they say stop.

---

### Task 3: Round rug, sill plant, shelf lowered, lamp to the shelf, prints

**Files:**
- Modify: `wip/premium/prm-lib.js` (`tex.braid`, `tex.braidBump`; mats `rug`, `rugEdge`, `terracotta`, `leaf`)
- Modify: `wip/premium/prm-room.js` (rug, bookshelf `S`, remove side table, prints, add `prmBuildPlant`, remove `sideTableTopY`)
- Modify: `wip/premium/prm-props.js` (`PRM_PLACES.lamp`; `prmBuildShelf` board assignment)
- Modify: `wip/premium/verify-prm-props.js` (`lib`, `room`, `lamp-shelf`, `contracts`)

**Interfaces:**
- Consumes: `R.tableX`, `R.tableZ`, `R.sillTopY`, `R.backZ` from Task 1–2.
- Produces: `PrmRoom.prmBuildPlant(lib)` → `Group` named `plant` with children `pot`, `soil`, `stem0..`, `leaf0..`; `room.userData.prmShelf = { x: 1.05, w: 0.85, d: 0.22, ys: [0.78, 1.10, 1.42], side: 0.02, z }`; books on `ys[0]`, trinkets on `ys[1]`, the lamp on `ys[2]`.

- [ ] **Step 1: Write the failing assertions**

`lib` section: add `'braid', 'braidBump'` to the texture loop (they return flat textures, so assert `isTexture` only — split the loop):

```js
['wood', 'wallpaper', 'weave', 'boucle', 'quilt'].forEach(k => { const t = lib.tex[k](); ok(t && t.isTexture && t.wrapS === THREE.RepeatWrapping, `tex.${k} returns a repeating texture`); });
['braid', 'braidBump'].forEach(k => ok(lib.tex[k]().isTexture, `tex.${k} returns a texture`));
```

and add `'rugEdge', 'terracotta', 'leaf'` to the mats list.

`room` section: remove `'sideTableTop'`, `'sideTableLeg2'` from the name list; add `'rugEdge'`, `'plant'`; remove `'sideTableTopY'` from the `R` key list (Task 1 already did — confirm). Add:

```js
  // round braided rug under the table; a plant on the sill; nothing from the side table remains
  const rugM = room.getObjectByName('rug'); ok(rugM.geometry.type === 'CylinderGeometry', 'rug is round');
  const rb = new THREE.Box3().setFromObject(rugM); near((rb.min.x + rb.max.x) / 2, R.tableX, 0.02, 'rug is centred under the table');
  ok(!roomNames.has('sideTableTop'), 'the side table is gone');
  const plant = room.getObjectByName('plant'); ok(plant && plant.isGroup, 'plant is a group on the shell');
  let leaves = 0; plant.traverse(o => { if (/^leaf\d+$/.test(o.name)) leaves++; }); ok(leaves >= 5, `plant has at least five leaves (${leaves})`);
  ok(plant.getObjectByName('pot') && plant.getObjectByName('soil'), 'plant has a pot and soil');
  const pb = new THREE.Box3().setFromObject(plant); near(pb.min.y, R.sillTopY, 0.01, 'plant rests on the sill');
  ok(pb.min.x > R.leftX && pb.max.x < R.leftX + 0.3, 'plant sits on the sill, not in the wall');
  let painted = 0; plant.traverse(o => { if (o.isMesh && o.material.userData.prmRole) painted++; }); eq(painted, 0, 'the plant is furniture — no design role');
  const S2 = room.userData.prmShelf; ok(S2.ys[2] < 1.6 && S2.ys[0] > 0.6, 'bookshelf is low, within reach of the bench');
```

`lamp-shelf` section: after the `books`/`trinkets` count line, add:

```js
  const bookBox = new THREE.Box3().setFromObject(shelf.getObjectByName('book0')), trinketBox = new THREE.Box3().setFromObject(shelf.getObjectByName('trinket-mini-controller'));
  near(bookBox.min.y, room.userData.prmShelf.ys[0] + 0.01, 0.01, 'books stand on the bottom board');
  near(trinketBox.min.y, room.userData.prmShelf.ys[1] + 0.01, 0.02, 'trinkets sit on the middle board');
```

`contracts` section: replace the `lamp` region line with:

```js
    lamp:      { x: [S.x - 0.25, S.x + 0.25], z: [R.backZ, R.backZ + 0.3], y: [S.ys[2], 2.0] },
```

and add `const S = room.userData.prmShelf;` beside `const R = …`.

- [ ] **Step 2: Run the harness, confirm it fails**

Run: `node wip/premium/verify-prm-props.js`
Expected: FAILs on `tex.braid`, `mats.rugEdge`, `rug is round`, `plant is a group`, `lamp sits inside its surface region`.

- [ ] **Step 3: Add the braid textures and the fixed materials**

In `prm-lib.js` `prmTextures`, after `quilt`, add:

```js
      /* A round braided rug: concentric rope rings with a diagonal twist hatch. Drawn once on a
         square canvas; the cylinder cap's UVs are planar so the centre lands under the table. */
      braid(base = '#b89d78', tone = '#a68a66', size = 512, rings = 22) {
        const c = makeCanvas(size, size), x = c.getContext('2d'), cx = size / 2, step = (size / 2) / rings;
        x.fillStyle = base; x.fillRect(0, 0, size, size);
        for (let i = 0; i < rings; i++) {
          x.strokeStyle = i % 2 ? tone : base; x.lineWidth = step * 0.9; x.beginPath(); x.arc(cx, cx, (i + 0.5) * step, 0, Math.PI * 2); x.stroke();
          x.strokeStyle = 'rgba(0,0,0,0.10)'; x.lineWidth = 1.5; const r = (i + 0.5) * step, n = Math.max(24, Math.round(r / 3));
          for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; x.beginPath(); x.moveTo(cx + Math.cos(a) * (r - step * 0.4), cx + Math.sin(a) * (r - step * 0.4)); x.lineTo(cx + Math.cos(a + 0.06) * (r + step * 0.4), cx + Math.sin(a + 0.06) * (r + step * 0.4)); x.stroke(); }
        }
        return flat(c);
      },
      braidBump(size = 512, rings = 22) {
        const c = makeCanvas(size, size), x = c.getContext('2d'), cx = size / 2, step = (size / 2) / rings;
        x.fillStyle = '#808080'; x.fillRect(0, 0, size, size);
        for (let i = 0; i < rings; i++) { x.strokeStyle = i % 2 ? '#a8a8a8' : '#585858'; x.lineWidth = step * 0.5; x.beginPath(); x.arc(cx, cx, (i + 0.5) * step, 0, Math.PI * 2); x.stroke(); }
        const t = new THREE.CanvasTexture(c); t.encoding = THREE.LinearEncoding; return t;
      },
```

In `prmMaterials` replace the `rug:` line (and its comment) with, and add three fixed neutrals:

```js
      /* Round braided jute, darker oat (spec D13): the map carries the rings, the bump the rope. */
      rug:        std({ map: tex.braid(), bumpMap: tex.braidBump(), bumpScale: .006, roughness: .95 }),
      rugEdge:    std({ color: '#9d8262', roughness: .95 }),
      terracotta: std({ color: '#b8674a', roughness: .85 }),
      leaf:       std({ color: '#6f8f5a', roughness: .9, side: THREE.DoubleSide }),
```

- [ ] **Step 4: Round rug, lower shelf, plant, prints; remove the side table**

In `prm-room.js`:

Remove `sideTableTopY` from `R`. Replace the rug line with:

```js
    // rug — round braided jute under the table; receives every table prop's contact shadow
    add('rug', new THREE.CylinderGeometry(1.05, 1.05, 0.012, 48), mats.rug, [R.tableX, 0.006, R.tableZ]);
    add('rugEdge', new THREE.TorusGeometry(1.05, 0.012, 8, 64), mats.rugEdge, [R.tableX, 0.008, R.tableZ], FLAT);
```

Replace the bookshelf `S` line with a low unit right of the bench:

```js
    // bookshelf unit, wall-mounted right of the bench and LOW — the photo lamp lives on its top board
    // and must stay a reachable target. Books on the bottom board, trinkets middle, lamp top (prm-props).
    const S = { x: 1.05, w: 0.85, d: 0.22, ys: [0.78, 1.10, 1.42], side: 0.02 }; S.z = R.backZ + S.d / 2;
    add('shelfBack', new THREE.BoxGeometry(S.w, 0.9, 0.01), mats.birchDark, [S.x, 1.10, R.backZ + 0.005]);
    add('shelfSideL', new THREE.BoxGeometry(S.side, 0.9, S.d), mats.birch, [S.x - S.w / 2, 1.10, S.z], null, { cast: true });
    add('shelfSideR', new THREE.BoxGeometry(S.side, 0.9, S.d), mats.birch, [S.x + S.w / 2, 1.10, S.z], null, { cast: true });
    S.ys.forEach((y, i) => add('shelfBoard' + i, new THREE.BoxGeometry(S.w, 0.02, S.d), mats.birch, [S.x, y, S.z], null, { cast: true }));
```

Delete the side table block (`sideTableTop` + the three legs). After the curtain block add the plant:

```js
    // the potted plant on the sill (spec D6) — furniture: no pick id, no design role
    const plant = prmBuildPlant(lib); plant.position.set(R.leftX + 0.08, R.sillTopY, WZ + 0.28); g.add(plant);
```

Replace the two `print(...)` calls with positions above the low shelf, inside a 50° frame:

```js
    print('A', 0.95, 1.66, 1); print('B', 1.30, 1.60, 5);
```

Add the builder above `prmCurtainGeometry` and export it:

```js
  /* A rounded terracotta pot, a soil disc, six flattened leaf discs on thin bent stems.
     Fixed neutrals — it is furniture. Group origin = the pot's base. */
  function prmBuildPlant(lib) {
    const { THREE, mats } = lib; const g = new THREE.Group(); g.name = 'plant';
    const mesh = (name, geo, mat, pos, rot, cast = true) => { const m = new THREE.Mesh(geo, mat); m.name = name; m.position.set(pos[0], pos[1], pos[2]); if (rot) m.rotation.set(rot[0], rot[1], rot[2]); m.castShadow = cast; m.receiveShadow = true; g.add(m); return m; };
    const PH = 0.09;
    mesh('pot', new THREE.CylinderGeometry(0.055, 0.042, PH, 24), mats.terracotta, [0, PH / 2, 0]);
    mesh('potRim', new THREE.TorusGeometry(0.055, 0.007, 8, 24), mats.terracotta, [0, PH, 0], [Math.PI / 2, 0, 0]);
    mesh('soil', new THREE.CylinderGeometry(0.05, 0.05, 0.01, 20), mats.plum, [0, PH - 0.004, 0], null, false);
    const leafGeo = new THREE.SphereGeometry(0.032, 14, 10); leafGeo.scale(1, 0.32, 0.6);
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 + 0.4, lean = 0.55 + (i % 3) * 0.15, len = 0.09 + (i % 2) * 0.03;
      const stem = mesh('stem' + i, new THREE.CylinderGeometry(0.003, 0.004, len, 6), mats.leaf, [Math.cos(a) * 0.015, PH, Math.sin(a) * 0.015], [Math.sin(a) * lean, 0, -Math.cos(a) * lean], false);
      stem.geometry.translate(0, len / 2, 0);
      const tip = new THREE.Vector3(0, len, 0).applyEuler(stem.rotation).add(stem.position);
      mesh('leaf' + i, leafGeo, mats.leaf, [tip.x, tip.y, tip.z], [0, -a, 0.25]);
    }
    return g;
  }
```

and `const api = { prmBuildRoom, prmCurtainGeometry, prmBuildPlant };`.

- [ ] **Step 5: Lamp to the shelf's top board; books and trinkets one board down**

In `prm-props.js`:
- `PRM_PLACES.lamp` → `{ pos: [1.05, 1.43, -1.44] }` (S.x, S.ys[2] + 0.01, S.z — mirrors prmRoom's shelf; the footprint check keeps it honest).
- In `prmBuildShelf`: books `const y = S.ys[0] + 0.01;` (was `ys[1]`); trinkets `const pitch = S.w / 5, y2 = S.ys[1] + 0.01;` (was `ys[2]`).
- Update the `PRM_PLACES` comment's surface list: "bench top 0.52, table top 0.44, arm top 0.58, shelf top board 1.42".

- [ ] **Step 6: Run the harness, confirm it passes**

Run: `node wip/premium/verify-prm-props.js`
Expected: `0 failed`. If `plant sits on the sill, not in the wall` fails, the plant's x is the thing to move (it must clear `R.leftX`).

- [ ] **Step 7: Reshoot and look**

Run the visual driver. Expected: 17 passed. Read `shots/wide-1280.png`: a round darker rug, a plant silhouette against the glowing curtain, the shelf low and right with the photo lamp on top, prints above it inside the frame. If the lamp looks tiny, lower `S.ys` (bring the top board down) or move `S.x` toward the bench — Task 6 asserts its on-screen size.

- [ ] **Step 8: Commit**

```bash
git add wip/premium/prm-lib.js wip/premium/prm-room.js wip/premium/prm-props.js wip/premium/verify-prm-props.js wip/premium/shots/
git commit -m "feat(premium): re-block step 3 — round jute rug, sill plant, low shelf with the photo lamp"
```

---

### Task 4: The TV's droopy bunny ears

**Files:**
- Modify: `wip/premium/prm-lib.js` (`droopEar` helper on the lib object)
- Modify: `wip/premium/prm-props.js:139-190` (`prmBuildTV` ears; `prmBuildAll` `shared`)
- Modify: `wip/premium/verify-prm-props.js` (`lib`, `tv` sections)

**Interfaces:**
- Produces: `lib.droopEar(points, radius, flatten)` → `{ outer: BufferGeometry, inner: BufferGeometry, tip: Vector3 }` — `points` is an array of `[x, y, z]` in the ear's local frame (root at origin, rising +y, folding toward +z), `outer` a flattened `TubeGeometry`, `inner` a thinner tube along the same curve pushed +z, `tip` the last point. TV children: `earL`, `earR` (role `ears`), each with children `inner` (role `plate`) and `tip` (a flattened sphere cap, role `ears`).

- [ ] **Step 1: Write the failing assertions**

`lib` section, after the `role()` block:

```js
{
  const e = lib.droopEar([[0, 0, 0], [0, 0.14, 0], [0, 0.24, 0.03], [0, 0.27, 0.10], [0, 0.22, 0.17]], 0.055, 0.55);
  ok(e.outer && e.outer.isBufferGeometry && e.inner && e.inner.isBufferGeometry, 'droopEar returns outer + inner geometries');
  e.outer.computeBoundingBox(); const s = new THREE.Vector3(); e.outer.boundingBox.getSize(s);
  ok(s.x < s.z * 0.8, `droopEar is flattened in x (x ${s.x.toFixed(3)} vs z ${s.z.toFixed(3)})`);
  ok(e.tip.y < e.outer.boundingBox.max.y - 0.03, 'the tip hangs below the ear\'s crown (it droops)');
}
```

`tv` section, replace `ok(tv.getObjectByName('earL') && tv.getObjectByName('earR'), 'tv has two ears');` with:

```js
  const eL = tv.getObjectByName('earL'), eR = tv.getObjectByName('earR'); ok(eL && eR, 'tv has two ears');
  ok(eL.getObjectByName('inner') && eL.getObjectByName('inner').material.userData.prmRole === 'plate', 'ear inner takes the plate role');
  ok(eL.getObjectByName('tip') && eL.getObjectByName('tip').material === eL.material, 'ear tip shares the ear material');
  tv.updateMatrixWorld(true);
  const tipW = new THREE.Vector3(); eL.getObjectByName('tip').getWorldPosition(tipW);
  const earBox = new THREE.Box3().setFromObject(eL), bodyBox = new THREE.Box3().setFromObject(tv.getObjectByName('body'));
  ok(tipW.y < earBox.max.y - 0.03, 'the ear droops: its tip is below its crown');
  ok(tipW.z > bodyBox.max.z - 0.12, 'the ear folds forward toward the viewer');
  ok(earBox.min.x < bodyBox.min.x + 0.02, 'the left ear leans outward past the cabinet');
```

Keep the existing ear-colour line (`ears take design.ears`).

- [ ] **Step 2: Run the harness, confirm it fails**

Run: `node wip/premium/verify-prm-props.js`
Expected: `lib.droopEar is not a function` (TypeError aborts the run — that is the failing state).

- [ ] **Step 3: Add the helper**

In `prm-lib.js` `prmCreateLib`, after `extrude:`, add:

```js
      /* A droopy ear: a tube swept along a bent curve (rise, lean, fold forward and down), flattened
         in x so it reads as a lobe not a sausage; an inner tube along the same curve pushed forward
         so the fold shows a paler inside. Local frame: root at the origin, +y up, +z toward the viewer.
         The caller rotates the mesh about z to lean it outward. ~30 lines, reusable (spec § 5.1). */
      droopEar(points, r, flatten = 0.55) {
        const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], p[1], p[2])));
        const outer = new THREE.TubeGeometry(curve, 28, r, 12, false); outer.scale(flatten, 1, 1);
        const inner = new THREE.TubeGeometry(curve, 28, r * 0.5, 10, false); inner.scale(flatten * 0.8, 1, 1); inner.translate(0, 0, r * 0.62);
        const last = points[points.length - 1];
        return { outer, inner, tip: new THREE.Vector3(last[0], last[1], last[2]) };
      },
```

- [ ] **Step 4: Rebuild the TV's ears**

In `prm-props.js` `prmBuildTV`, replace the `if (opts.earGeometry) [-1, 1].forEach(…)` block with:

```js
    /* Droopy bunny ears (spec D10): each ear rises from the cabinet top, leans outward and folds
       forward-down past the front top edge. The tip is a flattened sphere cap in the ear colour. */
    const EAR_R = 0.055, EAR_PTS = [[0, 0, 0], [0, 0.14, 0], [0, 0.24, 0.03], [0, 0.27, 0.10], [0, 0.22, 0.17]];
    [-1, 1].forEach(side => {
      const ear = lib.droopEar(EAR_PTS, EAR_R, 0.55);
      const e = new THREE.Mesh(ear.outer, ears); e.name = side < 0 ? 'earL' : 'earR'; e.castShadow = e.receiveShadow = true;
      e.position.set(side * 0.19, cy + H / 2 - 0.01, -0.06); e.rotation.set(0, 0, -side * 0.42);
      const inner = new THREE.Mesh(ear.inner, plate); inner.name = 'inner'; inner.receiveShadow = true; e.add(inner);
      const tipGeo = new THREE.SphereGeometry(EAR_R, 14, 10); tipGeo.scale(0.55, 1, 1);
      const tip = new THREE.Mesh(tipGeo, ears); tip.name = 'tip'; tip.position.copy(ear.tip); tip.castShadow = true; e.add(tip);
      g.add(e);
    });
```

Remove the `opts.earGeometry` from the TV's `PRM_BUILDERS.tv` registration (`(ctx, shared) => prmBuildTV(ctx.lib, ctx.design, { attractTexture: ctx.attractTexture })`). Leave `prmBuildAll`'s `shared.earGeometry` in place for the jukebox until Task 5 removes it.

- [ ] **Step 5: Run the harness, confirm it passes**

Run: `node wip/premium/verify-prm-props.js`
Expected: `0 failed`. The tv-height check (`tv with ears is … tall`, 0.6–0.9) must still hold; if the ears push past 0.9, shorten `EAR_PTS`' y values, not the check.

- [ ] **Step 6: Reshoot and look**

Run the visual driver; read `shots/wide-1280.png`. The ears should read as the Bunny Beats reference: two soft lobes flopping forward over the cabinet's front. If they look like antennae, raise `flatten` toward 0.7; if like slugs, lower toward 0.45.

- [ ] **Step 7: Commit**

```bash
git add wip/premium/prm-lib.js wip/premium/prm-props.js wip/premium/verify-prm-props.js wip/premium/shots/
git commit -m "feat(premium): re-block step 4 — droopy bunny ears on the telly"
```

---

### Task 5: The cat-jar jukebox

**Files:**
- Modify: `wip/premium/prm-lib.js` (`glass` material)
- Modify: `wip/premium/prm-props.js:272-310` (`prmBuildJukebox`), `prmBuildAll` (drop `shared.earGeometry`)
- Modify: `wip/premium/verify-prm-props.js` (`lib`, `jukebox-phone-binder`)

**Interfaces:**
- Consumes: nothing new.
- Produces: jukebox children `base`, `jar`, `record` (pick id `jukebox-record`), `recordBack`, `recordLabel`, `lid`, `lidRim`, `earL`, `earR` (each with child `inner`), `eyeL`, `eyeR`, `jukebox-knob` (pick id), `button0..3`; `userData.api` unchanged (`setLabel`, `setPlaying`, `tick`).

- [ ] **Step 1: Write the failing assertions**

`lib` mats list: add `'glass'`.

`jukebox-phone-binder` section: replace the two ear lines (`jukebox has ears` and `jukebox ears are shorter…`) with:

```js
  // the cat jar (spec D11): see-through body, records inside, a dome lid with triangular cat ears
  const jar = built.jukebox.getObjectByName('jar'); ok(jar && jar.material.transparent && jar.material.opacity > 0.2 && jar.material.opacity < 0.5, 'jar is a see-through cylinder');
  ok(jar.geometry.type === 'CylinderGeometry' && !jar.castShadow, 'jar is a cylinder that casts no shadow');
  ok(built.jukebox.getObjectByName('lid') && built.jukebox.getObjectByName('lid').material.userData.prmRole === 'shell', 'lid takes the shell role');
  const jEL = built.jukebox.getObjectByName('earL'), jER = built.jukebox.getObjectByName('earR'); ok(jEL && jER, 'cat jar has two ears');
  ok(jEL.geometry.type === 'ConeGeometry' && jEL.material.userData.prmRole === 'ears', 'cat ears are cones in the ears role');
  ok(jEL.getObjectByName('inner') && jEL.getObjectByName('inner').material.userData.prmRole === 'plate', 'cat ear inner takes the plate role');
  ok(built.jukebox.getObjectByName('recordBack'), 'a second record stands behind the first');
  const jarBox = new THREE.Box3().setFromObject(jar), recBox = new THREE.Box3().setFromObject(ids['jukebox-record']);
  ok(jarBox.containsBox(recBox), 'the front record is inside the jar');
  ok(built.jukebox.getObjectByName('eyeL').material.userData.prmRole === 'buttons', 'eyes take the buttons role');
  let btns = 0; built.jukebox.traverse(o => { if (/^button\d$/.test(o.name)) btns++; }); eq(btns, 4, 'four candy buttons on the base');
```

Keep every existing record-spin / label / reduced-motion line — the api contract is unchanged.

- [ ] **Step 2: Run the harness, confirm it fails**

Run: `node wip/premium/verify-prm-props.js`
Expected: FAILs on `mats.glass exists`, `jar is a see-through cylinder`, `cat jar has two ears`.

- [ ] **Step 3: Add the glass material**

In `prm-lib.js` `prmMaterials`, after `sleeve:`:

```js
      /* The cat jar's body. Plain opacity, not physical transmission (original spec § 15). */
      glass:      std({ color: '#dfeef5', roughness: .15, metalness: 0, transparent: true, opacity: .32, side: THREE.DoubleSide, depthWrite: false }),
```

- [ ] **Step 4: Rebuild the jukebox as the cat jar**

Replace the whole `prmBuildJukebox` function and its registration with:

```js
  /* The cat jar (spec D11): a see-through cylinder with two records standing inside, on a base ring
     that carries the knob and four candy buttons; a dome lid with a rim, two triangular cat ears and
     two emissive eyes. shell → lid, base; plate → record labels, inner ears; ears → cat ears;
     buttons → knob, buttons, eyes. Same pick ids and api as the cabinet it replaces. */
  function prmBuildJukebox(lib, design) {
    const { THREE, mats } = lib; const g = new THREE.Group();
    const shell = lib.role('shell', design.shell), plate = lib.role('plate', design.plate);
    const ears = lib.role('ears', design.ears), buttons = lib.role('buttons', design.buttons, { roughness: .34 });
    const eyes = lib.role('buttons', design.buttons, { emissive: design.buttons, emissiveIntensity: .6, roughness: .3 }); eyes.userData.prmEmissive = true;
    const JR = 0.11, JH = 0.16, BASE_H = 0.035, LID_R = 0.118;
    const jarBottom = BASE_H, jarTop = BASE_H + JH, recY = jarBottom + JH / 2;
    g.add(prmMesh(THREE, new THREE.CylinderGeometry(LID_R, LID_R + 0.005, BASE_H, 32), shell, 'base', [0, BASE_H / 2, 0]));
    const jar = prmMesh(THREE, new THREE.CylinderGeometry(JR, JR, JH, 48, 1, true), mats.glass, 'jar', [0, jarBottom + JH / 2, 0], null, false); g.add(jar);
    const recGeo = new THREE.CylinderGeometry(0.072, 0.072, 0.005, 48);
    const record = prmMesh(THREE, recGeo, mats.black, 'jukebox-record', [0, recY, 0.025], [Math.PI / 2, 0, 0]); prmTag(record, 'jukebox-record'); g.add(record);
    const labelMat = new THREE.MeshStandardMaterial({ map: lib.tex.label('', '#2B1B45', '#ffffff', 256, 256), roughness: .6 });
    const label = prmMesh(THREE, new THREE.CircleGeometry(0.028, 32), labelMat, 'recordLabel', [0, recY, 0.0281], null, false); g.add(label);
    const back = prmMesh(THREE, recGeo, mats.black, 'recordBack', [0.01, recY, -0.03], [Math.PI / 2, 0.18, 0]); g.add(back);
    back.add(prmMesh(THREE, new THREE.CircleGeometry(0.028, 32), plate, 'recordBackLabel', [0, 0.0031, 0], [-Math.PI / 2, 0, 0], false));
    // the control strip on the base's front: one knob (the sound door) and four candy buttons
    const knob = prmMesh(THREE, new THREE.CylinderGeometry(0.014, 0.016, 0.018, 24), buttons, 'jukebox-knob', [-0.06, BASE_H / 2, LID_R + 0.008], [Math.PI / 2, 0, 0]); prmTag(knob, 'jukebox-knob'); g.add(knob);
    const capGeo = new THREE.CylinderGeometry(0.008, 0.009, 0.008, 20);
    [-0.02, 0.0, 0.02, 0.04].forEach((x, i) => g.add(prmMesh(THREE, capGeo, buttons, 'button' + i, [x + 0.01, BASE_H / 2, LID_R + 0.003], [Math.PI / 2, 0, 0])));
    // the lid: a dome with a rim, cat ears, eyes
    g.add(prmMesh(THREE, new THREE.SphereGeometry(LID_R, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), shell, 'lid', [0, jarTop, 0]));
    g.add(prmMesh(THREE, new THREE.TorusGeometry(LID_R, 0.009, 10, 48), shell, 'lidRim', [0, jarTop, 0], [Math.PI / 2, 0, 0]));
    const earGeo = new THREE.ConeGeometry(0.036, 0.075, 4); earGeo.scale(1, 1, 0.55); earGeo.rotateY(Math.PI / 4);
    const innerGeo = new THREE.ConeGeometry(0.02, 0.045, 4); innerGeo.scale(1, 1, 0.55); innerGeo.rotateY(Math.PI / 4);
    [-1, 1].forEach(side => {
      const e = prmMesh(THREE, earGeo, ears, side < 0 ? 'earL' : 'earR', [side * 0.068, jarTop + 0.105, -0.005], [0, 0, -side * 0.32]);
      e.add(prmMesh(THREE, innerGeo, plate, 'inner', [0, -0.008, 0.014], null, false)); g.add(e);
    });
    [-1, 1].forEach(side => g.add(prmMesh(THREE, new THREE.SphereGeometry(0.009, 12, 10), eyes, side < 0 ? 'eyeL' : 'eyeR', [side * 0.035, jarTop + 0.06, 0.095], null, false)));
    let playing = false;
    g.userData.api = {
      setLabel(text) { const old = labelMat.map; labelMat.map = lib.tex.label(text, '#2B1B45', '#ffffff', 256, 256); labelMat.needsUpdate = true; if (old) old.dispose(); },
      setPlaying(b) { playing = !!b; },
      tick(now, dt, reduced) { if (!playing || reduced) return false; const d = dt * 3.49; record.rotateY(d); label.rotation.z += d; return true; },   // 33 rpm, seen through the glass
    };
    return g;
  }
  PRM_BUILDERS.jukebox = (ctx) => prmBuildJukebox(ctx.lib, ctx.design);
```

In `prmBuildAll` replace the `shared` line with `const shared = {};` (no prop reads the controller's ear geometry any more) — keep the parameter so builder signatures are untouched.

- [ ] **Step 5: Run the harness, confirm it passes**

Run: `node wip/premium/verify-prm-props.js`
Expected: `0 failed`. The `contracts` purity check counts ear materials — the cat ears carry the `ears` role, so `three props carry ears` still holds. `jukebox sits inside its surface region` uses a ±0.30 band around `R.tableX`: the jar is 0.25 wide, fine.

- [ ] **Step 6: Reshoot and look**

Run the visual driver; read `shots/wide-1280.png`. The jar should read as glass with two records inside and a purple cat-head lid; the label spins when a track is playing (the sandbox host's music stub reports nothing, so it is still — expected). If the glass reads as a solid pale cylinder, lower `opacity` toward 0.22; if invisible, raise toward 0.4.

- [ ] **Step 7: Commit**

```bash
git add wip/premium/prm-lib.js wip/premium/prm-props.js wip/premium/verify-prm-props.js wip/premium/shots/
git commit -m "feat(premium): re-block step 5 — the cat-jar jukebox"
```

---

### Task 6: Portrait re-aim and the lamp's on-screen size

**Files:**
- Modify: `wip/premium/prm-scene.js:11-14` (`PRM_PRESETS.portrait`)
- Modify: `wip/premium/visual-prm.js` (lamp size probe)

- [ ] **Step 1: Write the failing visual assertion**

In `visual-prm.js`, inside the `if (w === 1280)` block after the luma checks, add:

```js
      const lampBox = await page.evaluate(() => window.prmDebug.screenBox('lamp'));
      ok(lampBox && lampBox.h >= 48, `the photo lamp is a reachable target on the shelf (${lampBox ? lampBox.h.toFixed(0) : '?'} px tall at 1280×720, want ≥ 48)`);
```

- [ ] **Step 2: Run the visual driver, note the lamp's size**

Run the driver. Expected: 18 checks; the lamp line may pass or fail depending on Task 3's tuning. If it fails, in `prm-room.js` lower `S.ys` by 0.1 across all three boards **and** move `PRM_PLACES.lamp[1]` with it, or bring `S.x` in toward 0.95; re-run the Node harness after either.

- [ ] **Step 3: Re-aim the portrait preset**

In `prm-scene.js`:

```js
    portrait: { pos: [0.30, 1.35, 1.05], look: [0.30, 0.40, -0.30], fov: 54 },
```

- [ ] **Step 4: Run both harnesses; look at the portrait shot**

Run: `node wip/premium/verify-prm-props.js` (expects `0 failed`) and the visual driver (expects 18 passed). Read `shots/portrait-preset-1280.png`: the controller in the bottom third, dial and phone above it, the telly a glow at the top. Tune `pos`/`look` by eye; the HUD is not this round.

- [ ] **Step 5: Commit**

```bash
git add wip/premium/prm-scene.js wip/premium/visual-prm.js wip/premium/shots/
git commit -m "feat(premium): re-block step 6 — portrait preset re-aimed, lamp size asserted"
```

---

### Task 7: Owner review round 2 and doc closure

**Files:**
- Create: `wip/premium/OWNER-REVIEW-2.md`
- Modify: `docs/superpowers/specs/2026-09-19-premium-lounge-reblock-design.md` (Status line)
- Modify: `docs/deferred-work.md` (the greybox entry)
- Modify: `docs/implementation-notes/shared-implementation-notes.md` (DD-14 addendum)
- Modify: `docs/decision-log.md` (one line, newest on top)

- [ ] **Step 1: Write the review doc**

Create `wip/premium/OWNER-REVIEW-2.md`:

```markdown
# Premium Lounge — Owner Review, round 2 (the re-block)

**[date]. The re-block is built and screenshot-verified; nothing here is shipped.** Still sandbox-only:
`wip/premium/`, nothing in `index.html`, `sw.js`, `src/screens/` or `js/`. Your round-1 answers are
recorded inline in `OWNER-REVIEW.md`; this round is one question.

**To run it:** `npx http-server -p 8791 "D:\Coding Projects\Little-Sylly-Games"` then open
`http://localhost:8791/wip/premium/index.html` on a laptop.

## The one question — does it pass the ninety-second test now?

**Look at:** `shots/wide-1920.png`, next to `Gemini_Generated_Image_9nolcp9nolcp9nol.jpg` for *scale*
and the warm-room injection render for *mood*.

What changed since round 1, in your words from the review:
- the room is a corner, we are sitting on the couch, the table is against our knees, off-centre right;
- the window is the light, on the left, curtains drawn with a slit, a plant on the sill, the floor lamp gone;
- Saturday afternoon: darker, not dark;
- droopy-ear telly, cat-jar jukebox, round braided jute rug, the photo lamp on the low shelf;
- the clamshell phone, the dial's drift and the four procedural elements are as they were.

**Answer:** (yes → production wiring starts; no → say which of scale / mood / a prop, and I re-tune that alone)

## Measured, so you don't have to guess
| Check | Result |
|---|---|
| `node wip/premium/verify-prm-props.js` | [N] passed |
| `visual-prm.js` | [N] passed — incl. mean frame luma [x] (window 60–150), lit/dark patch ratio [x] (≥ 2.2), one shadow-casting light outside the left wall, photo lamp [x] px tall |

## Still deliberately not here
Production wiring · Scene B's HUD and eligibility switch · the stickerbook feature · the 2D chrome · surface polish (bouclé weave, keypad keys, rope fibres).
```

Fill every `[…]` from the real harness output.

- [ ] **Step 2: Close the docs**

- Spec Status line → `built as re-block (wip/premium/), owner review round 2 pending — wip/premium/OWNER-REVIEW-2.md`.
- `docs/deferred-work.md`: under the "re-block SPECCED" bullet add "**Re-block BUILT ([date])** — steps 1–6 shipped in `wip/premium/`, [N] Node + [N] visual checks green; `OWNER-REVIEW-2.md` is the gate; wiring still behind it."
- `shared-implementation-notes.md` DD-14: append a paragraph — *A greybox's first shots must be judged against the reference at matched camera distance before any prop is polished.* The round-1 greybox put the camera 2.7 m from the table in an 8 m room and every prop read as small; the answer was in the room's numbers (§ 1 of the re-block spec), not in the props.
- `docs/decision-log.md`: one line, newest on top: `[date] — Premium lounge re-block: window-as-key on the left, floor lamp dropped, room compressed to a corner, camera seated; production wiring deferred behind owner round 2. → docs/superpowers/specs/2026-09-19-premium-lounge-reblock-design.md`.

- [ ] **Step 3: Verify everything is green, then commit**

Run both harnesses one last time; paste the counts into the review doc.

```bash
git add wip/premium/OWNER-REVIEW-2.md docs/superpowers/specs/2026-09-19-premium-lounge-reblock-design.md docs/deferred-work.md docs/implementation-notes/shared-implementation-notes.md docs/decision-log.md
git commit -m "docs(premium): re-block closure — owner review round 2, deferred-work, DD-14, decision log"
```

---

## Self-review against the spec

- § 3.1 box/seat/camera → Task 1. § 3.2 light, exposure, palette, env map, vignette → Task 2. § 4 room shell (rug, shelf, side table removed, window/sill/plant, prints) → Tasks 2–3. § 5.1 ears → Task 4. § 5.2 cat jar → Task 5. § 5.3 rug → Task 3. § 5.4 lamp → Task 3 + Task 6 size check. § 6 layout → Tasks 1, 3. § 7 verification items 1–5 → Tasks 1–5; item 6 (lights) and 8 (luma) → Task 2; item 7 (four shots) → every task's reshoot; item 9 (reduced motion) → the existing checks, unchanged. § 8 Scene B → Task 6. § 9 (not wiring) → no task, by design. § 10 build order → the task order. § 11 doc updates → Task 7.
- One resolution the spec left ambiguous: § 4 said the top board carries "the lamp and the trinket slots", § 5.4 said the trinkets "move down one board". The plan does the latter — lamp top, trinkets middle, books bottom — so the lamp has the board to itself and stays a clean target.
- Names used across tasks: `R.tableX/tableZ/seatTopY/sillTopY` (Tasks 1–3), `lib.droopEar` (Task 4), `mats.glass/rugEdge/terracotta/leaf` (Tasks 3, 5), `prmDebug.lights/lumaGrid/screenBox` (Tasks 2, 6). Consistent.
