# NT Rectangular Grid (Debug Mode W×H) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Debug/Sandbox Mode author a node with independent width and height (16–20 each), by converting NT's node from a square `n` to a rectangular `w`/`h` throughout.

**Architecture:** A five-task **dual-write refactor** comes first: node creators emit `{n, w, h}` together so every intermediate commit stays green, readers migrate tier by tier, and the `n` key is dropped last. Only then does the new configure screen arrive. Nothing is rectangular until the rename is proven behaviour-neutral on the existing suite.

**Tech Stack:** Vanilla ES6 globals, no build step. Verification via `node tools/verify-nt-loopback.js` (a Firebase-shaped wire + a render-executing mock DOM). Layout via the `visual-check` skill.

**Spec:** `docs/superpowers/specs/2026-08-18-nt-debug-rectangular-grid-design.md` — read it before Task 1.

## Global Constraints

- **Australian English** in all UI copy; metric units only.
- **Never full-read `index.html`** (~515 KB) or `js/games/nt.js` (~4,100 lines). Grep, then offset-Read.
- **`index.html` edits:** this plan requires exactly **one** insertion (Task 8). Do not sweep or bulk-edit the file — see the encoding warning in project memory. Verify no mojibake after editing.
- **No new npm/build tooling.** No external libraries.
- **Regression gate is 242 checks**, green on seeds 0–7. CLAUDE.md's "239" is stale; do not "fix" the count downward.
- **Higher latency is BETTER in NT** — the player is the defender. Any comparison that treats lower latency as better is a bug.
- **Debug Mode is mutually exclusive with Sylly Mode** and supersedes Iterations/Hardening Window. Do not disturb that wiring.
- **Bounds convention, used verbatim throughout this plan:** `w` bounds `tx`/columns/`ax` and the **top**/**bottom** edges' `idx`; `h` bounds `ty`/rows/`ay` and the **left**/**right** edges' `idx`. Getting this backwards is the single most likely defect in Tasks 2–5.

---

## Phase 1 — Rename and axis split (Tasks 1–5)

No rectangles, no new screen. Every task ends green on the existing suite.

### Task 1: Dual-write `{n, w, h}` + single-source the slot count

Node creators emit all three keys. Nothing reads `w`/`h` yet, so this is provably inert.

**Files:**
- Modify: `js/games/nt.js` — `ntGenerateNode` (~:1751), `ntAuthBlankNode` (~:2393), `ntAuthMaxFirewall` (~:2555)
- Test: `tools/verify-nt-loopback.js`

**Interfaces:**
- Produces: `ntSlotCount(w, h) → number` — the 2×2 block-slot capacity of a `w × h` tile grid. Used by `ntGenerateNode` and `ntAuthMaxFirewall`.
- Produces: every node object now carries `w` and `h` alongside `n` (all equal until Task 8).

- [ ] **Step 1: Add the shared slot-count helper**

Insert immediately above `ntRandomEdgePort` (~:1742) in `js/games/nt.js`:

```js
// 2×2 block-slot capacity of a w×h tile grid. ONE definition — ntGenerateNode's budget roll
// and ntAuthMaxFirewall's ceiling were the same expression written twice (logic-engine.md
// § single-source board arithmetic). Reduces to the old Math.pow(floor(n/NT_BLOCK), 2) when w === h.
function ntSlotCount(w, h) {
  return Math.floor(w / NT_BLOCK) * Math.floor(h / NT_BLOCK);
}
```

- [ ] **Step 2: Use it in `ntGenerateNode` and emit `w`/`h`**

In `ntGenerateNode` (~:1752), replace the opening two lines:

```js
  const n = ntMatrixScale;
  const slots = Math.pow(Math.floor(n / NT_BLOCK), 2);
```

with:

```js
  const n = ntMatrixScale;
  const w = n, h = n;              // generated nodes are always square — only Debug authors rectangles
  const slots = ntSlotCount(w, h);
```

Then add `w, h` to **both** emitted objects. The candidate (~:1786):

```js
    const candidate = { n, w, h, ingress, egress, badSectors, nativeHoneypots: [] };
```

And the pathological fallback (~:1797) — keep the rest of the line byte-identical, adding only `w, h` after `n`:

```js
    node = { n, w, h, ingress: { edge: 'left', idx: (forcedIngressIdx != null ? forcedIngressIdx : (n >> 1)) }, egress: { edge: 'right', idx: (n >> 1) }, badSectors: [], nativeHoneypots: [] };
```

- [ ] **Step 3: Emit `w`/`h` from `ntAuthBlankNode`**

Replace the body of `ntAuthBlankNode` (~:2393):

```js
function ntAuthBlankNode() {
  const n = ntMatrixScale;
  return {
    n, w: n, h: n,
    ingress: { edge: 'left',  idx: n >> 1 },
    egress:  { edge: 'right', idx: n >> 1 },
    badSectors: [],
    nativeHoneypots: [],
  };
}
```

- [ ] **Step 4: Point `ntAuthMaxFirewall` at the shared helper**

Replace `ntAuthMaxFirewall` (~:2555):

```js
function ntAuthMaxFirewall() {
  const w = ntNode ? ntNode.w : ntMatrixScale;
  const h = ntNode ? ntNode.h : ntMatrixScale;
  return ntSlotCount(w, h);
}
```

- [ ] **Step 5: Run the suite — must be unchanged**

Run: `node tools/verify-nt-loopback.js`
Expected: `ALL CHECKS PASSED`, 242 checks. This task adds keys nothing reads and swaps one arithmetic expression for an equal one, so any failure here is a typo, not a design problem.

- [ ] **Step 6: Commit**

```bash
git add js/games/nt.js
git commit -m "refactor(nt): dual-write w/h on nodes + single-source ntSlotCount"
```

---

### Task 2: Migrate the config lattice to `w`/`h`

The tier that actually holds the square assumption. `ntPortSub` carries a real latent bug, not just a rename.

**Files:**
- Modify: `js/games/nt.js` — `ntSolidGrid` (~:1545), `ntConfigGrid` (~:1560), `ntPortSub` (~:1621), `ntPathExists` (~:1635), `ntDijkstraSub` (~:1657)

**Interfaces:**
- Consumes: `node.w` / `node.h` from Task 1.
- Produces: lattice grids sized `h·k` rows × `w·k` columns. Downstream tiers rely on that row/column order.

**Do NOT touch `ntInBounds` (~:1587) or `ntStepLegal` (~:1591)** — they derive bounds from `g.length` / `g[0].length` and are already dimension-agnostic. Leaving them byte-identical is deliberate.

- [ ] **Step 1: `ntSolidGrid` — rows from `h`, columns from `w`**

Replace the first three lines of the body (~:1546):

```js
  const w = node.w, h = node.h, g = [];
  for (let y = 0; y < h; y++) g.push(new Array(w).fill(false));
  const mark = (ax, ay) => ntBlockTiles(ax, ay).forEach(([tx, ty]) => {
    if (tx >= 0 && tx < w && ty >= 0 && ty < h) g[ty][tx] = true;
  });
```

- [ ] **Step 2: `ntConfigGrid` — split both the lattice size and the tile loops**

Replace (~:1561):

```js
  const n = node.n, k = NT_LATTICE_K, W = n * k, H = n * k;
```

with:

```js
  const k = NT_LATTICE_K, W = node.w * k, H = node.h * k;
```

and the tile loop (~:1565):

```js
  for (let ty = 0; ty < node.h; ty++) for (let tx = 0; tx < node.w; tx++) {
```

The inner inflation loops already clamp against `H`/`W`, so they need no change.

- [ ] **Step 3: `ntPortSub` — split the clamp bound (the latent bug)**

Replace the body (~:1621):

```js
function ntPortSub(node, port) {             // config-lattice sub-cell of the mouth interior
  const k = NT_LATTICE_K, p = ntPortInterior(node, port);
  // One clamp per AXIS. A single shared bound silently mis-clamps the longer axis on any
  // non-square node — it was correct only because w === h everywhere before this change.
  const mx = node.w * k - 1, my = node.h * k - 1;
  return { sx: Math.max(0, Math.min(mx, Math.floor(p.x * k))), sy: Math.max(0, Math.min(my, Math.floor(p.y * k))) };
}
```

- [ ] **Step 4: `ntPathExists` and `ntDijkstraSub` — lattice dimensions**

In **both** functions (~:1636 and ~:1658), replace the identical opening fragment:

```js
  const k = NT_LATTICE_K, g = ntConfigGrid(node, placements), W = node.n * k, H = node.n * k;
```

with:

```js
  const k = NT_LATTICE_K, g = ntConfigGrid(node, placements), W = node.w * k, H = node.h * k;
```

Both already use `W` for row-stride arithmetic (`u % W`, `y * W + x`) and never use `H` except for array sizing, so no further change is needed in either body.

- [ ] **Step 5: Run the suite**

Run: `node tools/verify-nt-loopback.js`
Expected: `ALL CHECKS PASSED`, 242 checks. Still square everywhere, so any pathfinding change is a bug.

- [ ] **Step 6: Commit**

```bash
git add js/games/nt.js
git commit -m "refactor(nt): config lattice reads w/h; split ntPortSub's per-axis clamp"
```

---

### Task 3: Migrate ports, geometry, and footprint clamps

**Files:**
- Modify: `js/games/nt.js` — `ntPortMouth`/`ntPortBorder`/`ntPortOutside`/`ntPortInterior`/`ntIsMouthTile` (~:1599–1628), `ntShortestPath` (~:1731–1734), `ntUpdateGhostAt` (~:2113), `ntAttemptPlace` (~:2325), `ntAuthPlaceTerrain` (~:2483), `ntAuthSetPort` (~:2528)

**Interfaces:**
- Produces: `ntPortMouth(port, w, h)`, `ntPortBorder(port, w, h)`, `ntPortOutside(port, w, h)` — all three now take **both** dimensions. Every caller in the file must pass both.

- [ ] **Step 1: The three port functions take `w, h`**

Replace all three (~:1599–1620). Note which dimension each edge uses — this is the bounds convention from Global Constraints:

```js
// ── Perimeter ports — edge + tile index along it (rectangle straddling the border)
// Both dimensions are required: top/bottom sit on row 0 / h-1 and index across w;
// left/right sit on column 0 / w-1 and index down h.
function ntPortMouth(port, w, h) {           // the tile just inside the border (must stay open)
  if (port.edge === 'top')    return [port.idx, 0];
  if (port.edge === 'bottom') return [port.idx, h - 1];
  if (port.edge === 'left')   return [0, port.idx];
  return [w - 1, port.idx];                  // right
}
function ntPortInterior(node, port) {        // tile-space centre of the mouth tile (path endpoint)
  const [tx, ty] = ntPortMouth(port, node.w, node.h);
  return { x: tx + 0.5, y: ty + 0.5 };
}
function ntPortBorder(port, w, h) {          // the point ON the border line
  if (port.edge === 'top')    return { x: port.idx + 0.5, y: 0 };
  if (port.edge === 'bottom') return { x: port.idx + 0.5, y: h };
  if (port.edge === 'left')   return { x: 0, y: port.idx + 0.5 };
  return { x: w, y: port.idx + 0.5 };        // right
}
function ntPortOutside(port, w, h) {         // a point just OFF the board (visual entry/exit stub)
  if (port.edge === 'top')    return { x: port.idx + 0.5, y: -0.6 };
  if (port.edge === 'bottom') return { x: port.idx + 0.5, y: h + 0.6 };
  if (port.edge === 'left')   return { x: -0.6, y: port.idx + 0.5 };
  return { x: w + 0.6, y: port.idx + 0.5 };  // right
}
```

- [ ] **Step 2: `ntIsMouthTile`**

Replace (~:1625):

```js
function ntIsMouthTile(tx, ty) {
  const [ix, iy] = ntPortMouth(ntNode.ingress, ntNode.w, ntNode.h);
  const [ex, ey] = ntPortMouth(ntNode.egress,  ntNode.w, ntNode.h);
  return (tx === ix && ty === iy) || (tx === ex && ty === ey);
}
```

- [ ] **Step 3: `ntShortestPath`'s four snap calls**

Replace the four lines (~:1731–1734):

```js
  poly.unshift(ntPortBorder(node.ingress, node.w, node.h));
  poly.unshift(ntPortOutside(node.ingress, node.w, node.h));
  poly.push(ntPortBorder(node.egress, node.w, node.h));
  poly.push(ntPortOutside(node.egress, node.w, node.h));
```

- [ ] **Step 4: The four footprint clamps**

A 2×2 block anchor clamps to `w-2` on x and `h-2` on y. Apply at all four sites:

`ntUpdateGhostAt` (~:2113):

```js
  const w = ntNode.w, h = ntNode.h;
  const ax = Math.max(0, Math.min(tx, w - 2));
  const ay = Math.max(0, Math.min(ty, h - 2));
```

`ntAttemptPlace` (~:2325):

```js
  const w = ntNode.w, h = ntNode.h;
  const ax = Math.max(0, Math.min(tx, w - 2)), ay = Math.max(0, Math.min(ty, h - 2));
```

`ntAuthPlaceTerrain` (~:2482) — same replacement as `ntAttemptPlace`, replacing its `const n = ntNode.n;` line and the `ax`/`ay` line beneath it.

The fourth is inside `ntRenderBuildGrid`'s pointer handler (~:2294) — leave it for Task 5, which rewrites that function wholesale.

- [ ] **Step 5: `ntAuthSetPort`'s nearest-edge distances**

Replace the `nearest` computation (~:2528). Distance to the bottom edge is measured in rows (`h`), to the right edge in columns (`w`):

```js
  const w = ntNode.w, h = ntNode.h;
  const nearest = [
    { edge: 'top',    d: ty,         idx: tx },
    { edge: 'bottom', d: h - 1 - ty, idx: tx },
    { edge: 'left',   d: tx,         idx: ty },
    { edge: 'right',  d: w - 1 - tx, idx: ty },
  ].sort((a, b) => a.d - b.d)[0];
```

Leave the rest of the function unchanged.

- [ ] **Step 6: Run the suite**

Run: `node tools/verify-nt-loopback.js`
Expected: `ALL CHECKS PASSED`, 242 checks. The existing "Port markers" and "Node Editor" sections exercise these paths directly.

- [ ] **Step 7: Commit**

```bash
git add js/games/nt.js
git commit -m "refactor(nt): ports, path snapping and footprint clamps take w/h"
```

---

### Task 4: Migrate rendering + set a real aspect ratio

Nine render sites, three of which force a square pixel buffer.

**Files:**
- Modify: `js/games/nt.js` — comparison thumbnails (~:397), summary thumbnails (~:474), DNP preview (~:892–900), `ntDrawPortMarker` (~:2162), bridge canvas (~:2941), `ntDrawMaze` (~:3043), `ntRenderFrame` (~:3091), playback canvas sizing (~:3244, ~:3384)

**Interfaces:**
- Produces: `ntDrawPortMarker(grid, port, color, inward, w, h)` — signature gains a dimension. Callers in Task 5 pass both.

**No `index.html` edit is needed.** The three containers carry Tailwind's `aspect-square`, but an **inline** `style.aspectRatio` overrides a utility class, so JS sets the true ratio and the markup is left alone. This deliberately avoids touching `index.html` at all in this task.

- [ ] **Step 1: `ntDrawPortMarker` takes both dimensions**

The span of a marker is one tile along its own edge: top/bottom span `1/w` of the width, left/right span `1/h` of the height. Replace (~:2162–2172):

```js
function ntDrawPortMarker(grid, port, color, inward, w, h) {
  if (!grid || !port) return null;
  const m = document.createElement('div');
  m.className = 'absolute pointer-events-none rounded-sm flex items-center justify-center';
  m.style.background = color;
  m.style.boxShadow = `0 0 6px ${color}`;
  // A marker spans ONE tile along its own edge — horizontal edges divide by w, vertical by h.
  const spanX = `calc(${100 / w}%)`, spanY = `calc(${100 / h}%)`, off = '-3px', thick = '6px';
  if (port.edge === 'top')         { m.style.left = `${(port.idx / w) * 100}%`; m.style.width = spanX; m.style.top = off; m.style.height = thick; }
  else if (port.edge === 'bottom') { m.style.left = `${(port.idx / w) * 100}%`; m.style.width = spanX; m.style.bottom = off; m.style.height = thick; }
  else if (port.edge === 'left')   { m.style.top = `${(port.idx / h) * 100}%`; m.style.height = spanY; m.style.left = off; m.style.width = thick; }
  else                             { m.style.top = `${(port.idx / h) * 100}%`; m.style.height = spanY; m.style.right = off; m.style.width = thick; }
  const a = document.createElement('span');
  a.style.cssText = 'font-size:5px;line-height:1;color:#fff;pointer-events:none';
  a.textContent = NT_PORT_ARROWS[port.edge][inward ? 'in' : 'out'];
  m.appendChild(a);
  grid.appendChild(m);
  return m;
}
```

- [ ] **Step 2: `ntDrawMaze` — split the grid-line loops**

Replace the first line of the body (~:3044) and the grid-line drawing. `ntDrawMaze` receives `px` and reads `ctx.canvas` for extents, so only the loop bounds and the `n` lookup change:

```js
function ntDrawMaze(ctx, px) {
  const w = ntNode.w, h = ntNode.h;
```

The function's remaining body uses `canvas.width` / `canvas.height` for the port bars and needs no further edit. If the local `n` is referenced anywhere else in the body, replace each use with `w` or `h` per the bounds convention.

- [ ] **Step 3: `ntRenderFrame` — derive px from width, split the grid lines**

Replace (~:3095):

```js
  const px = canvas.width / ntNode.w;
```

and the grid-line loop (~:3103):

```js
  for (let li = 0; li <= ntNode.w; li++) {
    ctx.beginPath(); ctx.moveTo(li * px, 0); ctx.lineTo(li * px, canvas.height); ctx.stroke();
  }
  for (let li = 0; li <= ntNode.h; li++) {
    ctx.beginPath(); ctx.moveTo(0, li * px); ctx.lineTo(canvas.width, li * px); ctx.stroke();
  }
```

- [ ] **Step 4: Stop forcing a square pixel buffer (two sites)**

At **both** ~:3244 and ~:3384, the canvas buffer is forced square. Replace each:

```js
  const size = canvas.clientWidth || 320;
  canvas.width = size; canvas.height = size;
```

with:

```js
  // Buffer follows the node's aspect — a forced square distorts every non-square node.
  const size = canvas.clientWidth || 320;
  const ar = ntNode ? (ntNode.h / ntNode.w) : 1;
  canvas.width  = size;
  canvas.height = Math.round(size * ar);
  canvas.style.aspectRatio = ntNode ? `${ntNode.w} / ${ntNode.h}` : '1 / 1';
```

The inline `aspectRatio` overrides the element's `aspect-square` class so the CSS box matches the buffer.

- [ ] **Step 5: The DNP bridge canvas (~:2941)**

Replace:

```js
  canvas.width  = n * c;
  canvas.height = n * c;
```

with:

```js
  canvas.width  = node.w * c;
  canvas.height = node.h * c;
```

Use whatever local name that function already holds the node in; if it only has `n`, read `ntNode.w`/`ntNode.h`. Confirm by reading the ~20 lines around the site before editing.

- [ ] **Step 6: Both thumbnail renderers (~:397 and ~:474)**

Both set a square `THUMB` buffer and loop one bound. At **each** site, replace the sizing and grid-line block. For the first (~:386–405), using `ntNode`:

```js
    const tw = ntNode.w, th = ntNode.h;
    const px = THUMB / Math.max(tw, th);         // longest side fills THUMB; the other scales
    canvas.width  = Math.round(tw * px);
    canvas.height = Math.round(th * px);
    canvas.style.cssText = 'width:' + canvas.width + 'px;height:' + canvas.height + 'px;border:2px solid ' +
      (idx === ntViewingPlayerIdx ? '#10b981' : '#334155') + ';display:block';
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = NT_COLOR_BASE;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.strokeStyle = 'rgba(52,211,153,0.12)';
    ctx.lineWidth = 0.3;
    for (let li = 0; li <= tw; li++) { ctx.beginPath(); ctx.moveTo(li * px, 0); ctx.lineTo(li * px, canvas.height); ctx.stroke(); }
    for (let li = 0; li <= th; li++) { ctx.beginPath(); ctx.moveTo(0, li * px); ctx.lineTo(canvas.width, li * px); ctx.stroke(); }
    ctx.restore();
    ntDrawMaze(ctx, px);
```

Apply the same shape at the second site (~:466–485), which uses the local `node` and `winnerIdx` — keep its own border-colour expression and label code unchanged.

- [ ] **Step 7: DNP preview `previewN` + its stale comment**

At ~:898 replace `.n` with `.w`:

```js
  const previewN = (ntTeamNodes[members[ntAllocViewLeg]] && ntTeamNodes[members[ntAllocViewLeg]].w) || NT_GRID_DEFAULT;
```

Then update the comment block directly above it (~:892–897), which reasons in "18×18 node (324px)" terms. Rewrite that sentence to say the cap is measured against the node's **width**, and note DNP nodes are always square under the current scope.

- [ ] **Step 8: Run the suite**

Run: `node tools/verify-nt-loopback.js`
Expected: `ALL CHECKS PASSED`, 242 checks. The mock DOM executes all of this, so a thrown error surfaces here — but note a wrong-but-finite number will not. That gap is closed in Task 7.

- [ ] **Step 9: Commit**

```bash
git add js/games/nt.js
git commit -m "refactor(nt): rendering reads w/h; canvas buffers follow node aspect"
```

---

### Task 5: Migrate both grid renderers, drop the `n` key, update the harness

The last readers, then the key itself. After this, any missed site is `undefined`, not a plausible square.

**Files:**
- Modify: `js/games/nt.js` — `ntRenderBuildGrid` (~:2181), `ntRenderAuthGrid` (~:2427), `ntGenerateNode` (~:1751), `ntAuthBlankNode` (~:2393)
- Modify: `tools/verify-nt-loopback.js` — `bareNode` (~:556), port-marker section (~:1031), Node Editor cell count (~:1051)

- [ ] **Step 1: `ntRenderBuildGrid` — columns, cell loops, hit-testing**

In `ntRenderBuildGrid` (~:2189) replace `const n = ntNode.n;` with `const w = ntNode.w, h = ntNode.h;`, then:

```js
  grid.style.gridTemplateColumns = `repeat(${w}, 1fr)`;
  grid.style.aspectRatio = `${w} / ${h}`;   // overrides the element's aspect-square class
```

Cell loops become `for (let ty = 0; ty < h; ty++)` / `for (let tx = 0; tx < w; tx++)`. The `getTile` helper (~:2213) splits per axis:

```js
      tx: Math.max(0, Math.min(w - 1, Math.floor((e.clientX - rect.left) / rect.width  * w))),
      ty: Math.max(0, Math.min(h - 1, Math.floor((e.clientY - rect.top)  / rect.height * h))),
```

The anchor clamp inside the handler (~:2294) becomes `Math.min(tx, w - 2)` / `Math.min(ty, h - 2)`. The two `ntDrawPortMarker` calls (~:2301–2302) pass `w, h` instead of `n`.

- [ ] **Step 2: `ntRenderAuthGrid` — the same six changes**

Apply the identical set in `ntRenderAuthGrid` (~:2434): `const w = ntNode.w, h = ntNode.h;`, `repeat(${w}, 1fr)`, `grid.style.aspectRatio = `${w} / ${h}``, both cell loops, the `getTile` split, and both `ntDrawPortMarker` calls (~:2470–2471) taking `w, h`.

- [ ] **Step 3: Drop the `n` key from both creators**

In `ntGenerateNode`, remove `n,` from the candidate object (~:1786) and from the fallback object (~:1797) — leaving `{ w, h, ingress, … }`. In `ntAuthBlankNode`, remove `n,` leaving `w: n, h: n,`. The local `const n = ntMatrixScale;` stays in both; only the emitted key goes.

- [ ] **Step 4: Prove no reader is left**

Run: `grep -nE '\.n\b' js/games/nt.js | grep -vE '\.name|\.nickname|\.nativeHoneypots|\.now'`
Expected: **no lines referencing a node's `.n`.** Any hit on `ntNode.n`, `node.n`, or `candidate.n` is an unmigrated reader — fix it before continuing. Unrelated `.n` matches on other objects are fine; read each hit rather than assuming.

- [ ] **Step 5: Update the harness's own node literal and reads**

In `tools/verify-nt-loopback.js`, `bareNode` (~:556) becomes:

```js
const bareNode = {
  w: 18, h: 18,
  ingress: { edge: 'left', idx: 4 }, egress: { edge: 'right', idx: 9 },
  badSectors: [{ ax: 2, ay: 3 }],
  nativeHoneypots: [],
};
```

In the port-marker section (~:1031–1033), replace `const n = d.__nt.node.n;` with `const { w, h } = d.__nt.node;` and pass `w, h` to both `d.__nt.drawPort(...)` calls in place of `n`. If the `drawPort` probe forwards a fixed arity, widen it to forward both.

The Node Editor cell-count check (~:1051) reads `18 * 18`; leave the expected value but re-express it as `d.__nt.node.w * d.__nt.node.h` **only if** the probe exposes them — otherwise leave `18 * 18`, which is still correct while everything is square.

- [ ] **Step 6: Run the suite**

Run: `node tools/verify-nt-loopback.js`
Expected: `ALL CHECKS PASSED`, 242 checks.

- [ ] **Step 7: Commit**

```bash
git add js/games/nt.js tools/verify-nt-loopback.js
git commit -m "refactor(nt): both grid renderers read w/h; drop the node's n key"
```

---

## Phase 2 — The gate (Task 6)

### Task 6: Prove the rename is behaviour-neutral, and that the suite can fail

A rename touching the shipped game's geometry core deserves more than one green run. This task produces no product change — it produces evidence.

**Files:**
- Modify: none (verification only, plus a scratch copy that is deleted)

- [ ] **Step 1: Sweep all eight seeds**

```bash
for s in 0 1 2 3 4 5 6 7; do NT_SEED=$s node tools/verify-nt-loopback.js >/dev/null 2>&1 && echo "seed $s OK" || echo "seed $s FAIL"; done
```

Expected: eight `OK` lines. Any `FAIL` is a rename bug — bisect against the Task 1–5 commits rather than patching forward.

- [ ] **Step 2: Confirm the check count is still 242**

```bash
node tools/verify-nt-loopback.js 2>&1 | grep -ciE "^\s*(PASS|FAIL)"
```

Expected: `242`. A **lower** number means a section stopped running (silently skipped), which a green run alone would not reveal.

- [ ] **Step 3: Prove the suite can still fail (D42's lesson)**

Break the axis split deliberately in a scratch copy and confirm red:

```bash
cp js/games/nt.js /tmp/nt-broken.js
sed -i 's/const k = NT_LATTICE_K, W = node.w \* k, H = node.h \* k;/const k = NT_LATTICE_K, W = node.h * k, H = node.w * k;/' /tmp/nt-broken.js
NT_SRC=/tmp/nt-broken.js node tools/verify-nt-loopback.js 2>&1 | tail -3
```

Expected: **failures reported.** If this stays green, the suite is not actually exercising the lattice and Task 7's assertions become the only real coverage — say so in the task report rather than proceeding quietly.

- [ ] **Step 4: Clean up**

```bash
rm -f /tmp/nt-broken.js
```

- [ ] **Step 5: Report, no commit**

Nothing to commit. Report the eight-seed result, the check count, and whether Step 3 went red.

---

## Phase 3 — Close the NaN blind spot (Task 7)

### Task 7: Assert computed geometry is finite

A missed rename yields `undefined` → `NaN`, which throws nothing and asserts nothing. Without this, a rectangular seed can pass while rendering garbage.

**Files:**
- Modify: `tools/verify-nt-loopback.js` — new section after the Node Editor section (~:1136)

**Interfaces:**
- Consumes: `d.__nt.timeline()` → `{ polyline, fires, slowSpans, samples, latencyMs }` (existing probe).

- [ ] **Step 1: Write the failing check first**

Insert a new section immediately before `// ── Deploying an authored node over the wire ───` (~:1138):

```js
// ── Finite geometry — the NaN tripwire ────────────────────────────────────────
// A missed .n → .w/.h rename yields undefined → NaN, which throws nothing and asserts
// nothing: every render call still "succeeds" while drawing garbage. These checks are the
// only thing standing between that and a green suite. (D42 — prove a check can fail.)
section('Finite geometry — no NaN reaches the timeline or the trace');
(() => {
  const d = makeDevice('finite', 'single', 0, [{ uid: 'u0', nickname: 'Ali' }]);
  d.__nt.seat({ players: 1, names: ['Ali'] });
  d.__nt.genNode();
  const tl = d.__nt.timeline();

  check('latency is a finite number', Number.isFinite(tl.latencyMs), true);
  check('latency is above zero',      tl.latencyMs > 0,              true);
  check('polyline is non-empty',      tl.polyline.length > 0,        true);
  check('every polyline point is finite',
        tl.polyline.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)), true);
  check('every sample is finite',
        tl.samples.every(s => Number.isFinite(s.x) && Number.isFinite(s.y) && Number.isFinite(s.t)), true);
  check('no exceptions', errs(d), []);
})();
```

- [ ] **Step 2: Prove the tripwire fires**

```bash
cp js/games/nt.js /tmp/nt-nan.js
sed -i 's/const k = NT_LATTICE_K, p = ntPortInterior(node, port);/const k = NT_LATTICE_K, p = ntPortInterior(node, port); p.x = node.n * 1;/' /tmp/nt-nan.js
NT_SRC=/tmp/nt-nan.js node tools/verify-nt-loopback.js 2>&1 | grep -c FAIL
```

Expected: a **non-zero** count. `node.n` no longer exists, so this injects exactly the `undefined`-arithmetic defect the section exists to catch. If the count is 0, the assertions are non-discriminating — fix them before proceeding, and do not treat a green run as coverage.

- [ ] **Step 3: Clean up and run for real**

```bash
rm -f /tmp/nt-nan.js
node tools/verify-nt-loopback.js
```

Expected: `ALL CHECKS PASSED`, now **248** checks (242 + 6).

- [ ] **Step 4: Commit**

```bash
git add tools/verify-nt-loopback.js
git commit -m "test(nt): assert timeline geometry is finite — the NaN tripwire"
```

---

## Phase 4 — The feature (Tasks 8–11)

### Task 8: The configure screen markup

**Files:**
- Modify: `index.html` — one `<section>` inserted immediately before `<section id="screen-nt-authoring"` (~:7473)
- Modify: `js/engine.js` — `allScreens[]` (~:71)

**This is the plan's only `index.html` edit.** Insert the one section; do not reformat or sweep anything else. After editing, confirm no mojibake: `grep -c 'â€' index.html` must return `0`.

- [ ] **Step 1: Insert the section**

Modelled on `screen-nt-gate`'s terminal chrome and the Stack layout (`ui-style.md` § The Stack — one column, Header/Stage/Controls as siblings):

```html
  <!-- NT DEBUG CONFIG — Sandbox dimensions, host-only. Terminal boot in the same chrome as
       screen-nt-gate, but its reveal is two number inputs rather than a single button. -->
  <section id="screen-nt-debug-config" style="display:none"
    class="flex items-center justify-center w-full min-h-screen px-5 py-8 overflow-y-auto">
    <div class="flex flex-col w-full max-w-sm gap-5">
      <div class="flex items-center justify-between">
        <p class="text-stone-400 text-xs font-semibold uppercase tracking-widest">System Access</p>
        <div class="flex items-center gap-2">
          <button class="btn-open-sound text-xl text-stone-400 active:scale-90 transition-transform duration-100">&#x1F50A;</button>
          <button class="btn-nt-quit-open text-stone-500 font-bold text-xl active:scale-90 transition-transform duration-100">&#x2715;</button>
        </div>
      </div>
      <div class="flex flex-col items-center gap-5 text-center">
        <div>
          <h2 class="text-2xl font-bold text-stone-800">Sandbox Initialisation</h2>
          <p class="text-stone-400 text-sm mt-1">Set the matrix dimensions before authoring.</p>
        </div>
        <div id="nt-debug-config-log"
          class="w-full min-h-[9rem] rounded-xl border border-emerald-700/40 bg-slate-900 px-4 py-4 text-left font-mono text-xs text-emerald-400 leading-relaxed"></div>
        <div id="nt-debug-config-fields" style="display:none" class="w-full flex flex-col gap-3">
          <div class="flex gap-3">
            <div class="flex-1 text-left">
              <label for="nt-debug-w" class="text-stone-500 text-xs font-semibold uppercase tracking-widest block mb-1">Width</label>
              <input id="nt-debug-w" type="number" min="16" max="20" inputmode="numeric"
                class="w-full rounded-xl border-2 border-stone-200 bg-white px-4 py-3 text-lg text-stone-800 focus:border-emerald-500 focus:outline-none transition-colors" />
            </div>
            <div class="flex-1 text-left">
              <label for="nt-debug-h" class="text-stone-500 text-xs font-semibold uppercase tracking-widest block mb-1">Height</label>
              <input id="nt-debug-h" type="number" min="16" max="20" inputmode="numeric"
                class="w-full rounded-xl border-2 border-stone-200 bg-white px-4 py-3 text-lg text-stone-800 focus:border-emerald-500 focus:outline-none transition-colors" />
            </div>
          </div>
          <p class="text-stone-400 text-xs">Anywhere from 16 to 20 on each side. They don't have to match.</p>
          <button id="btn-nt-debug-config-deploy"
            class="min-h-14 w-full rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xl font-semibold transition-all duration-150">
            Deploy Sandbox
          </button>
        </div>
      </div>
    </div>
  </section>

```

Note the CTA carries no emoji, per `ui-style.md` § Action Button Standard.

- [ ] **Step 2: Register the screen**

In `js/engine.js` (~:71–72), add the id to `allScreens[]` alongside the other NT screens:

```js
  'screen-nt-menu', 'screen-nt-setup', 'screen-nt-allocation', 'screen-nt-gate',
  'screen-nt-debug-config',
  'screen-nt-authoring', 'screen-nt-build', 'screen-nt-playback', 'screen-nt-summary',
```

An unregistered screen never hides — it becomes a ghost overlaying later screens.

- [ ] **Step 3: Verify the file is intact**

```bash
grep -c 'screen-nt-debug-config' index.html js/engine.js
grep -c 'â€' index.html
node -e "require('fs').readFileSync('index.html','utf8')" && echo "readable"
```

Expected: `1` in each of the first two files, `0` mojibake, `readable`.

- [ ] **Step 4: Commit**

```bash
git add index.html js/engine.js
git commit -m "feat(nt): add the Sandbox Initialisation screen markup"
```

---

### Task 9: Configure-screen logic, state lifecycle, and entry wiring

**Files:**
- Modify: `js/games/nt.js` — state declarations (~:149 block), `ntShowAuthoring` (~:2406), `ntAuthBlankNode` (~:2393), `ntStartSolo` (~:238), `ntStartPTP` (~:268), `ntStartSession` (~:582), `ntResetState` (~:3966), listener registration (~:4141 block)

**Interfaces:**
- Produces: `ntShowDebugConfig()` — plays the boot log, reveals the fields, wires Deploy. Called on first Debug entry only.
- Produces: `ntDebugLastW` / `ntDebugLastH` — `number|null`, session state cleared by `ntResetState`.

- [ ] **Step 1: Declare the state**

In the Debug session-state block (~:149), add:

```js
let ntDebugLastW = null;         // Sandbox dimensions chosen on screen-nt-debug-config.
let ntDebugLastH = null;         // Session state, NOT settings — cleared by ntResetState, so a
                                 // cold boot to lobby re-seeds from the Matrix Scale setting.
```

- [ ] **Step 2: Clear them on reset**

In `ntResetState` (~:3966), inside the Debug block that already resets `ntDebugBrush` etc., add:

```js
  ntDebugLastW         = null;
  ntDebugLastH         = null;
```

Do **not** move them next to `ntDebugMode`, which is deliberately preserved as a setting.

- [ ] **Step 3: Seed the authored node from the chosen dimensions**

Replace `ntAuthBlankNode` (~:2393) so it prefers the session choice and falls back to the setting:

```js
function ntAuthBlankNode() {
  const w = ntDebugLastW || ntMatrixScale;
  const h = ntDebugLastH || ntMatrixScale;
  return {
    w, h,
    ingress: { edge: 'left',  idx: h >> 1 },   // left/right index down h — a ROW, not a column
    egress:  { edge: 'right', idx: h >> 1 },
    badSectors: [],
    nativeHoneypots: [],
  };
}
```

- [ ] **Step 4: Write the configure screen**

Insert immediately above `ntShowAuthoring` (~:2404):

```js
// Sandbox Initialisation — the Debug-mode counterpart of the Cycle Initialisation Gate.
// Shown on the FIRST authoring entry of a session only; the "Author New Node" loop-back from
// the summary goes straight back to the editor, reusing ntDebugLastW/H (spec § State lifecycle).
const NT_DEBUG_CONFIG_LINES = [
  'OPENING SANDBOX SHELL…',
  '',
  'NO CLUSTER CONNECTION REQUIRED…',
  'SIMULATION ISOLATED…',
  '',
  'AWAITING OPERATOR DIMENSIONS…',
];

function ntShowDebugConfig() {
  showScreen('screen-nt-debug-config');
  const fields = document.getElementById('nt-debug-config-fields');
  const wIn    = document.getElementById('nt-debug-w');
  const hIn    = document.getElementById('nt-debug-h');
  if (fields) fields.style.display = 'none';
  // Pre-fill from the last choice this session, else from the Matrix Scale setting.
  if (wIn) wIn.value = String(ntDebugLastW || ntMatrixScale);
  if (hIn) hIn.value = String(ntDebugLastH || ntMatrixScale);
  ntTypeLines(document.getElementById('nt-debug-config-log'), NT_DEBUG_CONFIG_LINES, 100, 260, () => {
    const t = setTimeout(() => { if (fields) fields.style.display = 'flex'; }, 300);
    ntBootTimers.push(t);
  });
}

// Clamp to the supported range. A blank or non-numeric field falls back to the setting rather
// than to NaN — an input the player never touched must not be able to break the node.
function ntDebugReadDim(id) {
  const el = document.getElementById(id);
  const v  = el ? parseInt(el.value, 10) : NaN;
  if (!Number.isFinite(v)) return ntMatrixScale;
  return Math.max(16, Math.min(20, v));
}
```

Reusing `ntTypeLines` (not `ntPlayGateBoot`) is deliberate: the gate's helper targets `screen-nt-gate`'s own log and button, which this screen does not have.

- [ ] **Step 5: Wire the Deploy button**

In the Node Editor listener block (~:4141), alongside the existing `btn-nt-auth-*` registrations:

```js
  document.getElementById('btn-nt-debug-config-deploy').addEventListener('click', () => {
    playLaunch();
    ntDebugLastW = ntDebugReadDim('nt-debug-w');
    ntDebugLastH = ntDebugReadDim('nt-debug-h');
    ntShowAuthoring();
  });
```

- [ ] **Step 6: Route first entries through the configure screen**

Three sites change; the loop-back at ~:1449 does **not**.

`ntStartSolo` (~:238) and `ntStartPTP` (~:268) — replace each `if (ntDebugMode) { ntShowAuthoring(); return; }` with:

```js
  if (ntDebugMode) { ntShowDebugConfig(); return; }
```

`ntStartSession` (~:582) — replace `if (ntDebugMode) ntShowAuthoring();` with:

```js
    if (ntDebugMode) ntShowDebugConfig();
```

Leave the client branch's `ntShowStandby(...)` untouched — clients wait exactly as before.

- [ ] **Step 7: Add coverage for the routing and the clamp**

In `tools/verify-nt-loopback.js`, extend the Node Editor section. The probe needs `showDebugConfig()` and `deployDims(w, h)` accessors — add them next to `showAuthoring()` (~:393) as `showDebugConfig() { ntShowDebugConfig(); }` and `deployDims(w, h) { ntDebugLastW = w; ntDebugLastH = h; ntShowAuthoring(); }`:

```js
section('Sandbox Initialisation — dimensions gate the authored node');
(() => {
  const d = makeDevice('cfg', 'single', 0, [{ uid: 'u0', nickname: 'Ali' }]);
  d.__nt.seat({ players: 1, names: ['Ali'], scale: 18, debug: true });
  d.__nt.startSolo();
  check('Debug entry opens the config screen, not the editor',
        lastScreen(d), 'screen-nt-debug-config');

  d.__nt.deployDims(16, 18);
  check('…then the editor',            lastScreen(d), 'screen-nt-authoring');
  check('node takes the chosen w/h',   [d.__nt.node.w, d.__nt.node.h], [16, 18]);
  check('grid renders w×h cells',      d.__nt.authCells(), 16 * 18);
  check('…and still routes',           d.__nt.pathOk(), true);
  check('no exceptions',               errs(d), []);
})();
```

If the probe has no `startSolo()`, add `startSolo() { ntStartSolo(); }` beside the other entry helpers.

- [ ] **Step 8: Run the suite**

Run: `node tools/verify-nt-loopback.js`
Expected: `ALL CHECKS PASSED`. Check count rises to **254** (248 + 6).

- [ ] **Step 9: Commit**

```bash
git add js/games/nt.js tools/verify-nt-loopback.js
git commit -m "feat(nt): Sandbox Initialisation screen picks independent w/h"
```

---

### Task 10: Rectangular coverage

The owner-mandated ratio plus one wider stress case, driven end to end over the wire.

**Files:**
- Modify: `tools/verify-nt-loopback.js`

- [ ] **Step 1: Add an end-to-end rectangular section**

Insert after the "Deploying an authored node over the wire" section:

```js
// ── Rectangular nodes end to end ──────────────────────────────────────────────
// 16×18 is the owner-specified case; 16×20 is the widest gap the range allows, which is where
// an axis confusion (w used for a row bound, or vice versa) shows up most readily.
section('Rectangular nodes — authored, deployed, played');
[[16, 18], [16, 20], [20, 16]].forEach(([w, h]) => {
  const room = makeRoom(['Ali', 'Bo'], { scale: 18, debug: true });
  const host = room.host;
  host.__nt.startSolo();
  host.__nt.deployDims(w, h);

  check(`${w}×${h}: node carries both dimensions`, [host.__nt.node.w, host.__nt.node.h], [w, h]);
  check(`${w}×${h}: blank board routes`,           host.__nt.pathOk(), true);
  check(`${w}×${h}: grid renders w×h cells`,       host.__nt.authCells(), w * h);
  check(`${w}×${h}: two port markers`,             host.__nt.authPorts(), 2);

  const tl = host.__nt.timeline();
  check(`${w}×${h}: latency is finite and positive`,
        Number.isFinite(tl.latencyMs) && tl.latencyMs > 0, true);
  check(`${w}×${h}: every polyline point is finite`,
        tl.polyline.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)), true);
  check(`${w}×${h}: the trace stays inside the board`,
        tl.polyline.every(p => p.x >= -1 && p.x <= w + 1 && p.y >= -1 && p.y <= h + 1), true);
  check(`${w}×${h}: no exceptions`, errs(host), []);
});
```

`20×16` is included deliberately: it is `16×20` transposed, so a swapped-axis bug that happens to satisfy one will fail the other. Match `makeRoom`'s real signature — read it (~:471) before writing, and use the single-device `makeDevice` form instead if `makeRoom` does not accept a settings object.

- [ ] **Step 2: Prove the bounds check discriminates**

```bash
cp js/games/nt.js /tmp/nt-swap.js
sed -i 's/function ntPortMouth(port, w, h) {/function ntPortMouth(port, h, w) {/' /tmp/nt-swap.js
NT_SRC=/tmp/nt-swap.js node tools/verify-nt-loopback.js 2>&1 | grep -c FAIL
rm -f /tmp/nt-swap.js
```

Expected: a **non-zero** count, driven by the rectangular cases (the square seeds cannot detect a swap). If it is 0, the new section is not discriminating — strengthen it before continuing.

- [ ] **Step 3: Full sweep**

```bash
node tools/verify-nt-loopback.js
for s in 0 1 2 3 4 5 6 7; do NT_SEED=$s node tools/verify-nt-loopback.js >/dev/null 2>&1 && echo "seed $s OK" || echo "seed $s FAIL"; done
```

Expected: `ALL CHECKS PASSED` and eight `OK` lines.

- [ ] **Step 4: Commit**

```bash
git add tools/verify-nt-loopback.js
git commit -m "test(nt): rectangular nodes end to end at 16x18, 16x20, 20x16"
```

---

### Task 11: Layout verification and documentation closure

No harness can see a box. This is where the aspect-ratio work is actually confirmed.

**Files:**
- Modify: `docs/implementation-notes/nt-implementation-notes.md`, `docs/code-map.md`, `docs/rules/game-identities.md` (NT section), `CLAUDE.md`, `sw.js`, `docs/decision-log.md`

- [ ] **Step 1: Visual check**

Invoke the `visual-check` skill on:
1. `screen-nt-debug-config` — the terminal log, both inputs side by side, the CTA at ≥44 px.
2. `screen-nt-authoring` with a **16×18** node — grid taller than wide, port markers on the true edges, no overflow past the container.
3. `screen-nt-build` and `screen-nt-playback` with the same node — the canvas box matches the node's aspect and the maze is not stretched.

Record the measured aspect ratio of each grid; a 16×18 grid must measure ≈0.889 wide-to-tall, not 1.0. **A measured 1.0 means the inline `aspectRatio` is not overriding `aspect-square`** — fix before proceeding.

- [ ] **Step 2: Bump the service worker**

In `sw.js`, bump `CACHE_NAME` to `sylly-games-v199`. No new files were added, so `PRECACHE_URLS` is unchanged.

- [ ] **Step 3: Implementation notes**

Append to `docs/implementation-notes/nt-implementation-notes.md` (D43+), covering: the dual-write refactor order and why every intermediate commit stayed green; `ntPortSub`'s single-clamp latent bug; that the spec's Rev 1 "no CSS change" claim was wrong because three containers are `aspect-square` and inline style is what overrides them; and the NaN-not-throw failure mode with the tripwire that closes it.

- [ ] **Step 4: Code map and game identities**

Add `screen-nt-debug-config` and `ntShowDebugConfig` / `ntDebugReadDim` / `ntSlotCount` / `ntDebugLastW` / `ntDebugLastH` to `docs/code-map.md`'s NT section. Update the NT section of `docs/rules/game-identities.md` with the Sandbox Initialisation screen and the 16–20 per-axis range — Grep for `## Game 13:` and offset-Read that section only.

- [ ] **Step 5: CLAUDE.md**

Update § Current Focus with a v199 entry, and correct the harness table's NT row to the new check count (**254 + the rectangular section**; take the real number from a run, do not estimate).

- [ ] **Step 6: Decision log**

Append a one-line entry (newest on top) recording that NT's node became rectangular suite-wide for a Debug-only feature, and that the dual-write ordering was chosen so the shipped game's geometry core was never in a half-migrated state.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "docs(nt): rectangular grid closure + SW v199"
```

---

## Self-Review

**Spec coverage:** Tier 1 → Task 2. Tier 2 → Task 3. Tier 3 → Tasks 1 and 5. Tier 4 → Tasks 4 and 5. Configure screen → Tasks 8–9. State lifecycle → Task 9 Steps 1–3. Sync (no packet change) → no task required, correct by construction since `NT_GENERATE` sends the node verbatim. Testing gates 1–3 → Task 5 Step 3 (no `n` key), Task 5 Step 4 (grep gate), Task 7 (finite assertions). Owner-mandated 16×18 → Task 10. Sequencing → Phase order, with Task 6 as the gate. Docs → Task 11.

**Two spec gaps this plan closes:** the spec named one thumbnail renderer; there are two (`:397`, `:474`). The spec did not mention the three square-forced canvas buffers (`:2941`, `:3244`, `:3384`) — all are in Task 4.

**One spec claim corrected:** the spec's Tier 4 implies `index.html` edits for the aspect ratio. Inline `style.aspectRatio` overrides the Tailwind class, so the only `index.html` change in this plan is the Task 8 section insert.

**Type consistency:** `ntPortMouth`/`ntPortBorder`/`ntPortOutside` take `(port, w, h)` in Tasks 3, 5 and 10. `ntDrawPortMarker` takes `(grid, port, color, inward, w, h)` in Tasks 4 and 5. `ntSlotCount(w, h)` is defined in Task 1 and consumed there and in Task 1 Step 4. `ntDebugLastW`/`ntDebugLastH` are declared in Task 9 Step 1 and read in Steps 3, 4 and 5.

**Known soft spots, flagged rather than hidden:** the exact probe API in `tools/verify-nt-loopback.js` (`makeRoom`'s signature, whether `startSolo`/`drawPort` exist in the needed arity) was sampled, not exhaustively read — Tasks 9 and 10 say to read the real signature and adapt. Line numbers are approximate and drift as earlier tasks edit the file; every step names the function, which is the durable anchor.
