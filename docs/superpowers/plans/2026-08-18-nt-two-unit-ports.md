# NT Two-Unit Ports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a Net-Trace node's ingress and egress two tiles wide, collapsing to one tile at the ends of an edge, so a player can narrow their OWN door (previously the whole mouth was reserved and unbuildable) without being able to seal it. Every placement acts on the placing player's own node only — there is no cross-player interaction, even in DNP.

**Architecture:** The mouth is *derived* from the existing `{ edge, idx }` port record — no new field, no wire change. A "resolved port" is that same shape with `idx` pinned to one mouth half, which lets all five existing point functions keep working unmodified; only pathfinding learns to be multi-source/multi-target, and only `ntShortestPath` learns which half a route actually used. Deleting placement's mouth reservation then leaves `ntPathExists` as the sole legality gate, from which half-block-legal / full-block-rejected / corner-unblockable all fall out with no special-casing.

**Tech Stack:** Vanilla ES6+ JS, no build step, no modules (all symbols global). Tests are a Node harness (`tools/verify-nt-loopback.js`) that loads `js/games/nt.js` into a `vm` with a mock DOM and a Firebase-shaped wire.

**Spec:** `docs/superpowers/specs/2026-08-18-nt-two-unit-ports-design.md` — read it alongside this plan; every task cites the section it implements.

## Global Constraints

- **Australian English** in all user-facing copy and comments (`colour`, `synthesised`, `organise`). Metric units only.
- **Never full-read `js/games/nt.js` (~4,400 lines) or `index.html` (~515 KB).** Grep for the identifier, then `Read` with `offset`/`limit` around the hit. One careless full read costs more than this entire plan.
- **No new files.** Everything lands in `js/games/nt.js`, `tools/verify-nt-loopback.js`, `sw.js`, and docs.
- **No `index.html` change.** Port marker geometry is inline-styled from JS (the D45 pattern).
- **No wire/packet change.** `{ edge, idx }` is unchanged in every payload.
- **Test command (the only one):** `node tools/verify-nt-loopback.js` — currently **278 checks**, green on seeds 0–7. Also accepts `NT_SEED=<n>` and `NT_SRC=<path>`.
- **Seed sweep before any commit that changes geometry:**
  `for s in 0 1 2 3 4 5 6 7; do NT_SEED=$s node tools/verify-nt-loopback.js > /dev/null || echo "SEED $s FAILED"; done`
- **Branch:** `nt-two-unit-ports` (already created; the spec is committed on it).
- **Commit style:** Conventional Commits, `feat(nt):` / `test(nt):` / `docs(nt):`, ending with
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- **Every task ends green.** No task may leave the suite red for the next one to fix. This is the D43 discipline that made the rectangular-grid round bisectable.

## Orientation — what you need to know about this codebase

**Grid coordinates.** A node is `{ w, h, ingress, egress, badSectors[], nativeHoneypots[] }`. Tiles are `(tx, ty)` with `tx` in `0…w-1` and `ty` in `0…h-1`. A port is `{ edge, idx }` where `edge` is `'top'|'right'|'bottom'|'left'`; `idx` indexes **across `w`** for top/bottom and **down `h`** for left/right. The `n` key no longer exists (removed in SW v199).

**Blocks are 2×2.** `NT_BLOCK = 2`. Every placement (firewall, honeypot, bad sector, native honeypot) is a 2×2 block stored by its top-left anchor `{ ax, ay }`. `ntBlockTiles(ax, ay)` returns its four tiles.

**The config lattice.** Pathfinding does not run on tiles. `ntConfigGrid(node, placements)` builds a grid at `NT_LATTICE_K = 4` sub-cells per tile, with every solid tile inflated by one sub-cell in each direction (that inflation *is* the runner's half-width clearance). A tile's centre sub-cell is at `(tx*4 + 2, ty*4 + 2)`, which a neighbour's inflation never reaches — so "this mouth half is open" is exactly "this mouth tile is not solid."

**The harness.** `tools/verify-nt-loopback.js` runs `js/games/nt.js` inside a `vm` per simulated device. `globalThis.__nt` (line ~308) is the debug surface — getters for state, methods for actions. Tests are `check(label, actual, expected)` (deep-equals via `JSON.stringify`) grouped by `section(title)`. `makeDevice(name, mode, idx, slots)` builds a device; `errs(d)` returns uncaught exceptions; `lastScreen(d)` the last `showScreen` id.

**On the check counts in this plan.** Each task states an approximate expected total (`≈N`). They are a sanity signal, not an assertion: Task 2's fixture revisit and Task 5's rectangular additions can legitimately move the number by a few either way. **What matters is `0 failures`, not hitting `≈N` exactly.** Do not add or delete a check to make a total match. Task 7 Step 4 reads the real final number off the run and writes *that* into `CLAUDE.md`.

**A shared fixture used by several tasks.** Define it once at the top of each test block that needs it:

```js
const NODE_18 = () => ({ w: 18, h: 18,
  ingress: { edge: 'left',  idx: 4 },
  egress:  { edge: 'right', idx: 9 },
  badSectors: [], nativeHoneypots: [] });
```

Its ingress mouth is tiles `(0,4)` and `(0,5)`. Useful placements against it, all deterministic:

| Placement anchor | Covers | Effect on the ingress mouth |
|---|---|---|
| `{ ax: 0, ay: 3 }` | `(0,3) (1,3) (0,4) (1,4)` | **half** — blocks `(0,4)`, leaves `(0,5)` |
| `{ ax: 0, ay: 4 }` | `(0,4) (1,4) (0,5) (1,5)` | **full** — blocks both |
| `{ ax: 0, ay: 6 }` | `(0,6) (1,6) (0,7) (1,7)` | **none** — control |

## File Structure

| File | Responsibility | Tasks |
|---|---|---|
| `js/games/nt.js` — geometry core (~1600–1760) | Mouth derivation, resolved ports, pathfinding | 1, 2 |
| `js/games/nt.js` — build screen (~2050–2360) | Cell classification, placement legality | 3 |
| `js/games/nt.js` — renderers (~2180, ~2993) | Port markers, DNP leg preview | 4 |
| `js/games/nt.js` — generation/editor (~1757, ~1780, ~2583) | Port rolling, mouth reservation, authoring guard | 5 |
| `tools/verify-nt-loopback.js` | `__nt` surface additions + five new sections + fixture revisits | 1–6 |
| `sw.js` | `CACHE_NAME` → v200 | 7 |
| Docs (five files) | Documentation Integrity Protocol | 7 |

---

### Task 1: The mouth primitive and resolved-port helpers

Implements spec §3. Purely additive — nothing consumes these yet, so game behaviour is **identical** after this task. That is deliberate: it lets the primitive's own tests run against a stable game.

**Files:**
- Modify: `js/games/nt.js` — insert after `ntPortSub` / before `ntIsMouthTile` (~line 1631)
- Modify: `tools/verify-nt-loopback.js` — `__nt` surface (~line 380, alongside `drawPort`) and a new section placed immediately before the existing `section('Finite geometry …')` (~line 1161)

**Interfaces:**
- Consumes: `ntPortMouth(port, w, h)`, `ntPortSub(node, port)`, `NT_LATTICE_K` — all existing, unchanged.
- Produces, for Tasks 2–5:
  - `ntMouthIdxs(port, w, h) → number[]` — 1 or 2 indices along the port's edge
  - `ntPortHalves(port, w, h) → {edge, idx}[]` — resolved ports, one per index
  - `ntMouthTiles(port, w, h) → [tx, ty][]`
  - `ntPortSubs(node, port) → {sx, sy}[]`
  - `ntMouthsIntersect(a, b, w, h) → boolean` — **tile-set** intersection
  - `ntResolveHalf(node, port, subCell) → {edge, idx}` — one resolved port

- [ ] **Step 1: Write the failing test**

Add to `tools/verify-nt-loopback.js`, immediately before the `Finite geometry` section:

```js
// ── Mouth derivation ──────────────────────────────────────────────────────────
// The mouth is DERIVED from { edge, idx } — no new field, no wire change. Two units
// wide, collapsing to one at either end of an edge. Spec §1, §3.1.
section('Mouth derivation — two units, one at a corner');
(() => {
  const d = makeDevice('mouth', 'single', 0, [{ uid: 'u0', nickname: 'Ali' }]);
  d.__nt.seat({ players: 1, names: ['Ali'] });
  const M = (edge, idx, w, h) => d.__nt.mouthIdxs({ edge, idx }, w, h);

  check('mid-edge port spans two units',           M('left', 4, 18, 18),  [4, 5]);
  check('idx 0 collapses to one unit',             M('left', 0, 18, 18),  [0]);
  check('idx len-1 collapses to one unit',         M('left', 17, 18, 18), [17]);
  check('idx len-2 still spans two',               M('left', 16, 18, 18), [16, 17]);
  check('idx 1 spans two — only 0 is a corner',    M('left', 1, 18, 18),  [1, 2]);

  // Per-axis length. On a 16-wide × 20-high node a LEFT port's last index is 19 and a
  // TOP port's is 15. A swapped (h, w) argument order exchanges them — invisible on a
  // square node, which is why these four checks are the D46 discriminator for this
  // function. See spec §8.3.
  check('left port measures against h',            M('left', 19, 16, 20), [19]);
  check('…so idx 15 is NOT its corner',            M('left', 15, 16, 20), [15, 16]);
  check('top port measures against w',             M('top', 15, 16, 20),  [15]);
  check('…and an out-of-range idx clamps to it',   M('top', 19, 16, 20),  [15]);

  check('mouth tiles follow the span — left edge',
        d.__nt.mouthTiles({ edge: 'left', idx: 4 }, 18, 18), [[0, 4], [0, 5]]);
  check('mouth tiles follow the span — bottom edge',
        d.__nt.mouthTiles({ edge: 'bottom', idx: 3 }, 16, 20), [[3, 19], [4, 19]]);

  // Overlap is a TILE-SET test, not an idx-span test on a shared edge: two corner ports
  // on DIFFERENT edges can meet at the same physical tile. Spec §3.3, §7.5.
  const I = (a, b) => d.__nt.mouthsIntersect(a, b, 18, 18);
  check('same-edge mouths one apart overlap',
        I({ edge: 'left', idx: 3 }, { edge: 'left', idx: 4 }), true);
  check('same-edge mouths two apart do not',
        I({ edge: 'left', idx: 3 }, { edge: 'left', idx: 5 }), false);
  check('corner ports meeting at the SAME corner tile overlap',
        I({ edge: 'left', idx: 0 }, { edge: 'top', idx: 0 }),  true);
  check('corner ports at OPPOSITE ends of the top edge do not',
        I({ edge: 'left', idx: 0 }, { edge: 'top', idx: 17 }), false);

  check('no exceptions', errs(d), []);
})();
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tools/verify-nt-loopback.js`
Expected: FAIL. Every check in the new section fails — `d.__nt.mouthIdxs is not a function` surfaces as an uncaught error, and the `no exceptions` check reports a non-empty array.

- [ ] **Step 3: Add the primitives to `js/games/nt.js`**

Insert after `ntPortSub` (which ends ~line 1631), before `function ntIsMouthTile`:

```js
// ── Mouth span — the port is TWO tiles wide, one at either end of an edge.
// Derived from { edge, idx }; nothing is stored. The <= / >= (rather than ===) also
// clamp an out-of-range authored idx rather than returning a tile off the board.
function ntMouthIdxs(port, w, h) {
  const len = (port.edge === 'top' || port.edge === 'bottom') ? w : h;
  if (port.idx <= 0)       return [0];
  if (port.idx >= len - 1) return [len - 1];
  return [port.idx, port.idx + 1];
}

// A RESOLVED port is the same { edge, idx } shape with idx pinned to ONE mouth half.
// That shape-identity is what lets ntPortMouth/Interior/Border/Outside/Sub stay
// unchanged — they cannot tell a resolved port from a logical one.
function ntPortHalves(port, w, h) {
  return ntMouthIdxs(port, w, h).map(i => ({ edge: port.edge, idx: i }));
}
function ntMouthTiles(port, w, h) {
  return ntPortHalves(port, w, h).map(p => ntPortMouth(p, w, h));
}
function ntPortSubs(node, port) {
  return ntPortHalves(port, node.w, node.h).map(p => ntPortSub(node, p));
}
// TILE-SET intersection, not an idx comparison: two corner ports on DIFFERENT edges
// can share one physical tile (left/0 and top/0 are both tile (0,0)).
function ntMouthsIntersect(a, b, w, h) {
  const A = ntMouthTiles(a, w, h);
  return ntMouthTiles(b, w, h).some(([bx, by]) => A.some(([ax, ay]) => ax === bx && ay === by));
}
// Which half did a route actually use? Maps a config-lattice sub-cell back to its tile,
// then to the matching half. Falls back to the FIRST half rather than returning
// undefined — undefined arithmetic yields NaN, which throws nothing and renders as
// garbage (D46). A wrong-but-finite point is catchable; a NaN is not.
function ntResolveHalf(node, port, subCell) {
  const halves = ntPortHalves(port, node.w, node.h);
  if (!subCell) return halves[0];
  const tx = Math.floor(subCell.x / NT_LATTICE_K), ty = Math.floor(subCell.y / NT_LATTICE_K);
  for (const hp of halves) {
    const [mx, my] = ntPortMouth(hp, node.w, node.h);
    if (mx === tx && my === ty) return hp;
  }
  return halves[0];
}
```

- [ ] **Step 4: Expose the primitives to the harness**

In `tools/verify-nt-loopback.js`, inside `globalThis.__nt = { … }`, add alongside `drawPort` (~line 378):

```js
  mouthIdxs(port, w, h)       { return ntMouthIdxs(port, w, h); },
  mouthTiles(port, w, h)      { return ntMouthTiles(port, w, h); },
  mouthsIntersect(a, b, w, h) { return ntMouthsIntersect(a, b, w, h); },
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node tools/verify-nt-loopback.js`
Expected: PASS, ≈**294** checks, 0 failures. All 16 new checks pass; **no pre-existing check changes**, because nothing consumes the new functions yet. If any pre-existing check moved, stop — something is consuming these that shouldn't be.

- [ ] **Step 6: Seed sweep**

Run: `for s in 0 1 2 3 4 5 6 7; do NT_SEED=$s node tools/verify-nt-loopback.js > /dev/null || echo "SEED $s FAILED"; done`
Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add js/games/nt.js tools/verify-nt-loopback.js
git commit -m "$(cat <<'EOF'
feat(nt): derive a two-unit port mouth from { edge, idx }

Adds ntMouthIdxs and the resolved-port helpers. Purely additive — nothing
consumes them yet, so game behaviour is unchanged and the primitive's own
tests run against a stable game.

A resolved port is the same { edge, idx } shape with idx pinned to one half,
which is what lets the five existing point functions stay untouched.

ntMouthsIntersect compares TILE SETS, not idx spans: two corner ports on
different edges can meet at one physical tile.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Pathfinding goes multi-source / multi-target

Implements spec §4. After this task a route may enter or leave through **either** half. The reservation still stands (Task 3 removes it), so this is a strict widening: everything that routed before still routes.

**Files:**
- Modify: `js/games/nt.js:1643-1662` (`ntPathExists`), `:1665-1728` (`ntDijkstraSub`), `:1730-1745` (`ntShortestPath`)
- Modify: `tools/verify-nt-loopback.js` — new section + the editor fixture revisit (spec §8.1)

**Interfaces:**
- Consumes: `ntPortSubs`, `ntResolveHalf` (Task 1).
- Produces: no signature changes. `ntPathExists(node, placements) → boolean` and `ntDijkstraSub(node, placements) → {x,y}[]|null` keep their exact shapes — `ntShortestPath` recovers the used half from the path's own endpoints rather than a new return contract.

- [ ] **Step 1: Write the failing test**

Add immediately after the `Mouth derivation` section from Task 1:

```js
// ── Endpoint snapping ─────────────────────────────────────────────────────────
// With one half of a mouth blocked, the route must use the OTHER half — and the
// off-board stub and border point must carry that same half, or the runner enters at
// the seam and jogs sideways on every run. Spec §4.3, §4.4.
section('Endpoint snapping — the stubs track the half the route used');
(() => {
  const NODE_18 = () => ({ w: 18, h: 18,
    ingress: { edge: 'left',  idx: 4 },
    egress:  { edge: 'right', idx: 9 },
    badSectors: [], nativeHoneypots: [] });

  const d = makeDevice('snap', 'single', 0, [{ uid: 'u0', nickname: 'Ali' }]);
  d.__nt.seat({ players: 1, names: ['Ali'] });

  // Unblocked: the route uses the FIRST half (idx 4 → y 4.5), since Dijkstra settles
  // sources in NT_STEPS order and both halves are equidistant from the egress.
  d.__nt.setNode(NODE_18());
  d.__nt.setPlacements([]);
  let tl = d.__nt.timeline();
  check('polyline is [outside, border, interior, …, interior, border, outside]',
        tl.polyline.length >= 6, true);
  check('an unobstructed mouth enters through a half of itself',
        [4.5, 5.5].includes(tl.polyline[2].y), true);

  // Half-block the ingress: anchor (0,3) covers (0,3) (1,3) (0,4) (1,4) — mouth tile
  // (0,4) goes solid, (0,5) stays open.
  d.__nt.setNode(NODE_18());
  d.__nt.setPlacements([{ ax: 0, ay: 3, type: 'firewall' }]);
  tl = d.__nt.timeline();
  check('a half-blocked mouth still routes',        tl.polyline.length >= 6, true);
  check('…through the OPEN half (y 5.5, not 4.5)',  tl.polyline[2].y,        5.5);
  check('…the border point shares that half',       tl.polyline[1].y,        5.5);
  check('…and so does the off-board stub',          tl.polyline[0].y,        5.5);
  check('…the stub is off the board on the left',   tl.polyline[0].x,        -0.6);
  check('no kink: stub, border and interior are colinear in y',
        [tl.polyline[0].y, tl.polyline[1].y, tl.polyline[2].y], [5.5, 5.5, 5.5]);

  // D46's finite-geometry tripwire, re-run against a resolved (not nominal) endpoint —
  // this is the shape ntResolveHalf's fallback exists to keep catchable.
  check('every polyline point is still finite',
        tl.polyline.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)), true);
  check('every sample is still finite',
        tl.samples.every(s => Number.isFinite(s.x) && Number.isFinite(s.y) && Number.isFinite(s.t)), true);

  // Fully blocking the mouth (anchor (0,4) covers BOTH (0,4) and (0,5)) leaves no open
  // source, so there is no route at all.
  d.__nt.setNode(NODE_18());
  d.__nt.setPlacements([{ ax: 0, ay: 4, type: 'firewall' }]);
  check('a fully-blocked mouth yields no route', d.__nt.timeline().polyline, []);

  check('no exceptions', errs(d), []);
})();
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tools/verify-nt-loopback.js`
Expected: FAIL on `…through the OPEN half (y 5.5, not 4.5)` and its three companions. Today `ntPathExists` returns `false` the moment the *nominal* mouth sub-cell is solid, so the half-blocked case produces `polyline: []` and reports `undefined` for `.y`.

- [ ] **Step 3: Make `ntPathExists` multi-source / multi-target**

Replace the body of `ntPathExists` (`js/games/nt.js:1643`):

```js
function ntPathExists(node, placements) {
  const k = NT_LATTICE_K, g = ntConfigGrid(node, placements), W = node.w * k, H = node.h * k;
  // Either half of a mouth will do. A mouth tile's centre sub-cell is blocked iff that
  // TILE is solid — a neighbour's inflation reaches tx*k, the centre sits at tx*k+2.
  const srcs = ntPortSubs(node, node.ingress).filter(s => !g[s.sy][s.sx]);
  const dsts = ntPortSubs(node, node.egress).filter(s => !g[s.sy][s.sx]);
  if (!srcs.length || !dsts.length) return false;
  const goals = new Set(dsts.map(t => t.sy * W + t.sx));
  const seen = new Uint8Array(W * H);
  const q = [];
  for (const s of srcs) { const i = s.sy * W + s.sx; if (!seen[i]) { seen[i] = 1; q.push(i); } }
  let head = 0;
  while (head < q.length) {
    const u = q[head++];
    if (goals.has(u)) return true;
    const ux = u % W, uy = (u - ux) / W;
    for (const st of NT_STEPS) {
      if (!ntStepLegal(g, ux, uy, st)) continue;
      const v = (uy + st.dy) * W + (ux + st.dx);
      if (seen[v]) continue;
      seen[v] = 1; q.push(v);
    }
  }
  return false;
}
```

- [ ] **Step 4: Make `ntDijkstraSub` multi-source / multi-target**

In `ntDijkstraSub` (`js/games/nt.js:1665`), replace the source/goal setup and the termination test. Change:

```js
  const s = ntPortSub(node, node.ingress), t = ntPortSub(node, node.egress);
  if (g[s.sy][s.sx] || g[t.sy][t.sx]) return null;
```
to:
```js
  const srcs = ntPortSubs(node, node.ingress).filter(p => !g[p.sy][p.sx]);
  const dsts = ntPortSubs(node, node.egress).filter(p => !g[p.sy][p.sx]);
  if (!srcs.length || !dsts.length) return null;
```

Change `const start = idx(s.sx, s.sy), goal = idx(t.sx, t.sy); dist[start] = 0;` to:

```js
  const goals = new Set(dsts.map(p => idx(p.sx, p.sy)));
  for (const p of srcs) dist[idx(p.sx, p.sy)] = 0;
  let goal = -1;
```

Change the loop's break condition `if (u === -1 || u === goal) break;` to:

```js
    if (u === -1) break;
    if (goals.has(u)) { goal = u; break; }
```

Change the reachability test `if (!isFinite(dist[goal])) return null;` to:

```js
  if (goal === -1) return null;
```

The path reconstruction below it is unchanged — `prev[v] === -1` terminates at whichever source the route came from, exactly as before.

- [ ] **Step 5: Resolve the ends in `ntShortestPath`**

In `ntShortestPath` (`js/games/nt.js:1730`), replace the four-line snap-and-stub block:

```js
  // Snap the two ends to the mouth half the route ACTUALLY used, then add the border +
  // off-board points for that SAME half. Using the span midpoint instead would put the
  // stub on the boundary between halves, so the runner would enter at the seam and jog
  // sideways to a half-centre on every single run.
  const usedIn  = ntResolveHalf(node, node.ingress, sub[0]);
  const usedOut = ntResolveHalf(node, node.egress,  sub[sub.length - 1]);
  poly[0]               = ntPortInterior(node, usedIn);
  poly[poly.length - 1] = ntPortInterior(node, usedOut);
  poly.unshift(ntPortBorder(usedIn,  node.w, node.h));
  poly.unshift(ntPortOutside(usedIn, node.w, node.h));
  poly.push(ntPortBorder(usedOut,  node.w, node.h));
  poly.push(ntPortOutside(usedOut, node.w, node.h));
  return poly;
```

- [ ] **Step 6: Run the tests**

Run: `node tools/verify-nt-loopback.js`
Expected: the new section passes. **One pre-existing check may now fail** — see Step 7.

- [ ] **Step 7: Re-derive the editor fixture (spec §8.1)**

`tools/verify-nt-loopback.js:1096` carries a comment explaining that egress was re-authored from `left/5` to `left/10` because *"left/5's mouth tile is a 2×2 bad sector"*. That reasoning was written for a one-tile mouth. `left/5` now spans tiles `(0,5)` and `(0,6)`, so if only one of those sits under a bad sector the port routes and the workaround is obsolete.

**Re-derive it — do not paper over it.** Read the surrounding block (`:1082–1122`), work out from the actual board whether `left/5` now routes, and either drop the workaround or rewrite its comment to state the *current* reason. If the check passes unchanged, still update the comment: a comment that explains a constraint which no longer exists is worse than no comment.

- [ ] **Step 8: Run the full suite and the seed sweep**

Run: `node tools/verify-nt-loopback.js`
Expected: PASS, ≈**306** checks, 0 failures (Step 7 may shift this by one or two — see the note on counts in Orientation).

Run: `for s in 0 1 2 3 4 5 6 7; do NT_SEED=$s node tools/verify-nt-loopback.js > /dev/null || echo "SEED $s FAILED"; done`
Expected: no output.

- [ ] **Step 9: Commit**

```bash
git add js/games/nt.js tools/verify-nt-loopback.js
git commit -m "$(cat <<'EOF'
feat(nt): pathfinding seeds both mouth halves and accepts either

ntPathExists and ntDijkstraSub become multi-source/multi-target. Neither
changes signature: ntShortestPath recovers which half a route used from the
path's own endpoints, so no new contract is introduced between them.

The off-board stub and border point track the USED half rather than the span
midpoint — a midpoint stub sits on the boundary between halves, so the runner
would enter at the seam and jog sideways on every run.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Delete the placement reservation

Implements spec §5 and §6.1. This is the task that lands the player-visible mechanic.

**Files:**
- Modify: `js/games/nt.js:1632-1637` (`ntIsMouthTile`), `:2065` (`ntCellType`), and the seven reservation sites: `:2140`, `:2311`, `:2314`, `:2328`, `:2336`, `:2347`, `:2542`
- Modify: `tools/verify-nt-loopback.js` — `__nt` additions + new section

**Interfaces:**
- Consumes: `ntMouthTiles` (Task 1), the multi-source `ntPathExists` (Task 2).
- Produces: `ntIsMouthTile(tx, ty) → boolean` keeps its signature; its only remaining caller is `ntCellType`.

- [ ] **Step 1: Add the harness surface this task needs**

In `globalThis.__nt`, alongside the Task 1 additions:

```js
  pathOkWith(p)    { return ntPathExists(ntNode, p); },
  cellType(tx, ty) { return ntCellType(tx, ty); },
  setInv(fw, hp)   { ntInventory = { firewall: fw, honeypot: hp }; },
  place(tx, ty, hp){ ntAttemptPlace(tx, ty, !!hp); },
```

`setInv` assigns directly rather than reusing `bumpFw`, which calls `ntSyncAuthUI()` and touches Node Editor DOM that a non-Debug scenario has no business rendering.

- [ ] **Step 2: Write the failing test**

Add immediately after the `Endpoint snapping` section:

```js
// ── Placement legality ────────────────────────────────────────────────────────
// The mouth reservation is GONE. ntPathExists is the only gate, and half-block-legal
// / full-block-rejected / corner-unblockable all fall out of it. Spec §5.
section('Placement legality — narrowing a door is legal, sealing it is not');
(() => {
  const NODE_18 = () => ({ w: 18, h: 18,
    ingress: { edge: 'left',  idx: 4 },
    egress:  { edge: 'right', idx: 9 },
    badSectors: [], nativeHoneypots: [] });

  const d = makeDevice('legality', 'single', 0, [{ uid: 'u0', nickname: 'Ali' }]);
  d.__nt.seat({ players: 1, names: ['Ali'] });
  d.__nt.setNode(NODE_18());
  d.__nt.setPlacements([]);

  // The gate itself. Ingress mouth is (0,4) and (0,5).
  check('a 2×2 clear of the mouth routes',
        d.__nt.pathOkWith([{ ax: 0, ay: 6, type: 'firewall' }]), true);
  check('covering ONE half narrows the door — still routes',
        d.__nt.pathOkWith([{ ax: 0, ay: 3, type: 'firewall' }]), true);
  check('covering BOTH halves seals it — no route',
        d.__nt.pathOkWith([{ ax: 0, ay: 4, type: 'firewall' }]), false);

  // A CORNER mouth is one tile, so there is no half to give up: any 2×2 covering it
  // removes the only source. This asymmetry is the mechanic, not a gap. Spec §5.3.
  const corner = NODE_18(); corner.ingress = { edge: 'left', idx: 0 };
  d.__nt.setNode(corner);
  check('a corner mouth is one tile',
        d.__nt.mouthTiles(corner.ingress, 18, 18), [[0, 0]]);
  check('a 2×2 clear of a corner mouth routes',
        d.__nt.pathOkWith([{ ax: 0, ay: 2, type: 'firewall' }]), true);
  check('a corner port cannot be narrowed at all',
        d.__nt.pathOkWith([{ ax: 0, ay: 0, type: 'firewall' }]), false);

  // End-to-end through the real placement path — this is what proves the reservation
  // is actually deleted, not merely unreachable.
  d.__nt.setNode(NODE_18());
  d.__nt.setPlacements([]);
  d.__nt.setInv(10, 0);
  d.__nt.renderGrid();
  d.__nt.place(0, 3, false);
  check('the build screen accepts a half-blocking placement', d.__nt.placements.length, 1);
  d.__nt.place(0, 4, false);
  check('…and refuses the one that would seal the mouth',     d.__nt.placements.length, 1);

  // The vacant mouth still paints as a door; a firewall on one half shadows it, which
  // is the only thing on the grid that shows the door was narrowed. Spec §6.1.
  d.__nt.setNode(NODE_18());
  d.__nt.setPlacements([]);
  check('both vacant mouth tiles paint as port',
        [d.__nt.cellType(0, 4), d.__nt.cellType(0, 5)], ['port', 'port']);
  d.__nt.setPlacements([{ ax: 0, ay: 3, type: 'firewall' }]);
  check('a firewall on one half shadows the port paint',
        [d.__nt.cellType(0, 4), d.__nt.cellType(0, 5)], ['firewall', 'port']);

  check('no exceptions', errs(d), []);
})();
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `node tools/verify-nt-loopback.js`
Expected: FAIL on `both vacant mouth tiles paint as port` (today only `(0,4)` is a mouth tile, so `(0,5)` returns `'null'`) and on `the build screen accepts a half-blocking placement` (today the reservation refuses it, leaving `placements.length` at 0).

- [ ] **Step 4: Widen `ntIsMouthTile`**

Replace `js/games/nt.js:1632-1637`:

```js
// Retained for RENDER classification only (ntCellType). Every placement-reservation
// caller was deleted when ntPathExists became the sole legality gate — see spec §5.1.
function ntIsMouthTile(tx, ty) {
  const tiles = ntMouthTiles(ntNode.ingress, ntNode.w, ntNode.h)
        .concat(ntMouthTiles(ntNode.egress, ntNode.w, ntNode.h));
  return tiles.some(([mx, my]) => mx === tx && my === ty);
}
```

- [ ] **Step 5: Delete the seven reservation checks**

Work **bottom-up** so earlier edits do not shift later line numbers.

| Line | Current | Becomes |
|---|---|---|
| `:2542` | `if (ntBlockAt(fx, fy) \|\| ntIsMouthTile(fx, fy)) { ntFlashReject(…); return; }` | `if (ntBlockAt(fx, fy)) { ntFlashReject(…); return; }` |
| `:2347` | `if (ntBlockAt(fx, fy) \|\| ntIsMouthTile(fx, fy)) { ntFlashReject(…); return; }` | `if (ntBlockAt(fx, fy)) { ntFlashReject(…); return; }` |
| `:2336` | `if (ntIsMouthTile(tx, ty)) return;` | *delete the line* |
| `:2328` | `if (ntIsMouthTile(tx, ty)) return;   // port mouth — reserved` | *delete the line* |
| `:2314` | `if (ntBlockAt(fx, fy) \|\| ntIsMouthTile(fx, fy)) return;` | `if (ntBlockAt(fx, fy)) return;` |
| `:2311` | `if (b \|\| ntIsMouthTile(tx, ty)) return;` | `if (b) return;` |
| `:2140` | `if (ntBlockAt(fx, fy) \|\| ntIsMouthTile(fx, fy)) { blocked = true; break; }` | `if (ntBlockAt(fx, fy)) { blocked = true; break; }` |

Update the stale comment above `:2140` — it currently reads `// Reserved (bad / native / port mouth) → silent, no ghost.` Drop `/ port mouth`.

Leave `:2065` (`ntCellType`) alone — it is the one surviving caller and already works once Step 4 widens the function.

- [ ] **Step 6: Verify no reservation caller survives**

Run: `grep -n "ntIsMouthTile" js/games/nt.js`
Expected: exactly **two** lines — the definition (~1634) and the `ntCellType` call (~2065). Any third hit is a missed deletion.

- [ ] **Step 7: Run the tests and the seed sweep**

Run: `node tools/verify-nt-loopback.js`
Expected: PASS, ≈**317** checks, 0 failures.

Run: `for s in 0 1 2 3 4 5 6 7; do NT_SEED=$s node tools/verify-nt-loopback.js > /dev/null || echo "SEED $s FAILED"; done`
Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add js/games/nt.js tools/verify-nt-loopback.js
git commit -m "$(cat <<'EOF'
feat(nt): delete the mouth reservation — ntPathExists is the only gate

Seven placement sites drop their ntIsMouthTile check. Half-block-legal,
full-block-rejected and corner-unblockable then fall out of the connectivity
gate with no special-casing.

A corner port cannot be narrowed at all: its mouth is one tile, so there is no
half to give up. That asymmetry is the mechanic.

ntIsMouthTile survives for ntCellType alone, widened to the span — a firewall
on one half shadows the port paint, which is the only thing on the grid that
shows a door was narrowed.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Renderers — port markers and the DNP seam

Implements spec §6.2, §6.3, §6.4. **The DNP seam is the single most likely thing in this plan to be missed:** every check stays green while the bridge preview shows a door walled off across half its width.

**Files:**
- Modify: `js/games/nt.js:2178-2196` (`ntDrawPortMarker`), `:2993-3037` (`ntDrawLegCanvas`)
- Modify: `tools/verify-nt-loopback.js` — the existing port-marker section (~:1024–1055)

**Interfaces:**
- Consumes: `ntMouthIdxs` (Task 1).
- Produces: no signature changes. `ntDrawPortMarker(grid, port, color, inward, w, h)` returns the marker element, as today.

- [ ] **Step 1: Write the failing test**

Extend the existing `section('Port markers — one drawing function, two grids')` block (~:1025). Keep every existing check; append before its `no exceptions` line:

```js
  // A marker spans the MOUTH, not one tile — and it measures against the port's own
  // axis. On an 18-wide board a standard 2-unit mouth is 11.11% wide; a corner mouth
  // is half that. Spec §6.2.
  const mk = (port) => d.__nt.drawPort('nt-auth-grid', port, '#34d399', true, 18, 18);
  const std = mk({ edge: 'top', idx: 4 });
  check('a standard top marker spans two tiles',
        std.style.width, 'calc(11.11111111111111%)');
  check('…offset to the first mouth tile', std.style.left, '22.22222222222222%');
  const cnr = mk({ edge: 'top', idx: 17 });
  check('a corner top marker spans one tile',
        cnr.style.width, 'calc(5.555555555555555%)');
  const vert = mk({ edge: 'left', idx: 4 });
  check('a left marker spans on the vertical axis',
        [vert.style.height, vert.style.width], ['calc(11.11111111111111%)', '6px']);
  check('…and keeps the border straddle', vert.style.left, '-3px');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tools/verify-nt-loopback.js`
Expected: FAIL on `a standard top marker spans two tiles` — today the width is one tile, `calc(5.555555555555555%)`.

If the mock element's `style` does not round-trip these strings, adjust the *assertion* to read whatever the mock stores — do **not** change the implementation to suit the mock.

- [ ] **Step 3: Widen the port marker**

In `ntDrawPortMarker` (`js/games/nt.js:2185`), replace the span computation:

```js
  // A marker spans the port's MOUTH along its own edge — horizontal edges divide by w,
  // vertical by h. A corner mouth is one unit, a standard mouth two.
  const idxs = ntMouthIdxs(port, w, h), first = idxs[0], units = idxs.length;
  const spanX = `calc(${(100 * units) / w}%)`, spanY = `calc(${(100 * units) / h}%)`;
  const off = '-3px', thick = '6px';
  if (port.edge === 'top')         { m.style.left = `${(first / w) * 100}%`; m.style.width = spanX; m.style.top = off; m.style.height = thick; }
  else if (port.edge === 'bottom') { m.style.left = `${(first / w) * 100}%`; m.style.width = spanX; m.style.bottom = off; m.style.height = thick; }
  else if (port.edge === 'left')   { m.style.top = `${(first / h) * 100}%`; m.style.height = spanY; m.style.left = off; m.style.width = thick; }
  else                             { m.style.top = `${(first / h) * 100}%`; m.style.height = spanY; m.style.right = off; m.style.width = thick; }
```

- [ ] **Step 4: Open the whole mouth in the DNP seam**

In `ntDrawLegCanvas` (`js/games/nt.js:~3024`), replace the two wall loops and the two channel bars:

```js
  const wallT = Math.max(2, Math.round(c * 0.5));
  ctx.fillStyle = '#64748b'; // slate-500 — lighter than bad-sector's slate-700
  // The wall opens the WHOLE mouth, not one row. Opening a single row here passes every
  // check — the maths is right and the route resolves — while the preview shows a door
  // walled off across half its width. Spec §6.3.
  const inRows  = node.ingress ? ntMouthIdxs(node.ingress, node.w, node.h) : [];
  const outRows = node.egress  ? ntMouthIdxs(node.egress,  node.w, node.h) : [];
  if (opts.wallLeft && node.ingress) {
    for (let row = 0; row < node.h; row++) { if (inRows.includes(row)) continue; ctx.fillRect(0, row * c, wallT, c); }
  }
  if (opts.wallRight && node.egress) {
    for (let row = 0; row < node.h; row++) { if (outRows.includes(row)) continue; ctx.fillRect(node.w * c - wallT, row * c, wallT, c); }
  }
  // Port channel bars (drawn over the wall gap): green ingress, amber egress — each
  // spanning its full mouth.
  const t = Math.max(2, Math.round(c * 0.5));
  if (node.ingress) { ctx.fillStyle = '#34d399'; ctx.fillRect(0, inRows[0] * c, t, c * inRows.length); }
  if (node.egress)  { ctx.fillStyle = '#f59e0b'; ctx.fillRect(node.w * c - t, outRows[0] * c, t, c * outRows.length); }
```

- [ ] **Step 5: Fix the square assumption in the same function (spec §6.4)**

Still in `ntDrawLegCanvas`, delete `const n = node.w;` (~:2997) and replace every remaining `n` with the correct axis. The base fill and the gridline loop become:

```js
  ctx.fillStyle = NT_COLOR_BASE;
  ctx.fillRect(0, 0, node.w * c, node.h * c);
  ctx.strokeStyle = 'rgba(148,163,184,0.18)';
  ctx.lineWidth = 1;
  for (let li = 0; li <= node.w; li++) {
    ctx.beginPath(); ctx.moveTo(li * c + 0.5, 0); ctx.lineTo(li * c + 0.5, node.h * c); ctx.stroke();
  }
  for (let li = 0; li <= node.h; li++) {
    ctx.beginPath(); ctx.moveTo(0, li * c + 0.5); ctx.lineTo(node.w * c, li * c + 0.5); ctx.stroke();
  }
```

Note the single loop becomes **two** — a shared `li <= n` bound was only ever right because `w === h`. This is the D44 class of latent, harmless today because DNP legs are square, which is exactly what made it invisible.

Then verify no `n` survives in this function: `sed -n '2993,3040p' js/games/nt.js | grep -n '\bn\b'` should return nothing.

- [ ] **Step 6: Run the tests and the seed sweep**

Run: `node tools/verify-nt-loopback.js`
Expected: PASS, ≈**322** checks, 0 failures.

Run: `for s in 0 1 2 3 4 5 6 7; do NT_SEED=$s node tools/verify-nt-loopback.js > /dev/null || echo "SEED $s FAILED"; done`
Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add js/games/nt.js tools/verify-nt-loopback.js
git commit -m "$(cat <<'EOF'
feat(nt): port markers and the DNP seam span the whole mouth

The marker spans the mouth on the port's own axis; both grids get it free,
since the drawing function was already shared.

ntDrawLegCanvas's seam wall opened exactly one row. Opening a single row
passes every check while the bridge preview shows a door walled off across
half its width — no assertion short of the new ones would catch it.

Also fixes the same function's square assumption in passing: it used node.w
on both axes for the base fill and the gridlines while setting canvas.height
from node.h. Harmless only because DNP legs are square (D44's class).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Generation and the Node Editor

Implements spec §7. Two latent bugs fixed in passing, one authoring guard generalised.

**Files:**
- Modify: `js/games/nt.js:1757` (`ntRandomEdgePort`), `:1780-1781` (its call site), `:1784` (the `isMouth` closure), `:2594` (`ntAuthSetPort`)
- Modify: `tools/verify-nt-loopback.js` — new section

**Interfaces:**
- Consumes: `ntMouthTiles`, `ntMouthsIntersect` (Task 1).
- Produces: `ntRandomEdgePort(w, h) → {edge, idx}` — **signature change** from `ntRandomEdgePort(n)`. `js/games/nt.js:1780` is the only call site; confirm with `grep -n "ntRandomEdgePort" js/games/nt.js`.

- [ ] **Step 1: Write the failing test**

Add immediately after the `Placement legality` section:

```js
// ── Node Editor port authoring ────────────────────────────────────────────────
// Two-unit mouths make near-misses overlap: ingress left/3 spans [3,4] and egress
// left/4 spans [4,5], sharing tile 4. An overlapping mouth makes one sub-cell both a
// BFS source and a goal — a zero-length route. Spec §7.5.
section('Node Editor — overlapping mouths are refused');
(() => {
  const d = makeDevice('authports', 'single', 0, [{ uid: 'u0', nickname: 'Ali' }]);
  d.__nt.seat({ players: 1, names: ['Ali'], scale: 18, natives: 0, debug: true });
  d.__nt.showAuthoring();

  d.__nt.setBrushDbg('ingress');
  d.__nt.authTap(0, 3);
  check('ingress authored to left/3',
        [d.__nt.node.ingress.edge, d.__nt.node.ingress.idx], ['left', 3]);

  // left/4 spans [4,5] and shares tile (0,4) with the ingress mouth [3,4].
  d.__nt.setBrushDbg('egress');
  const before = { ...d.__nt.node.egress };
  d.__nt.authTap(0, 4);
  check('an egress whose mouth OVERLAPS the ingress is refused',
        [d.__nt.node.egress.edge, d.__nt.node.egress.idx], [before.edge, before.idx]);

  // left/5 spans [5,6] — adjacent to the ingress mouth but disjoint. Legal.
  d.__nt.authTap(0, 5);
  check('an adjacent but disjoint mouth is accepted',
        [d.__nt.node.egress.edge, d.__nt.node.egress.idx], ['left', 5]);
  check('…and the node still routes', d.__nt.pathOk(), true);

  check('no exceptions', errs(d), []);
})();

// ── Rolled ports ──────────────────────────────────────────────────────────────
// ntRandomEdgePort bounded idx with a single n for all four edges — correct only
// because generated nodes are square. D44's class. Spec §7.1.
section('Rolled ports — idx is bounded by the port\'s OWN edge');
(() => {
  const d = makeDevice('rollports', 'single', 0, [{ uid: 'u0', nickname: 'Ali' }]);
  d.__nt.seat({ players: 1, names: ['Ali'], scale: 18, natives: 0 });

  // Generated nodes are square, so this asserts the invariant rather than the split.
  // The split itself is proven by the mouth-derivation section's per-axis checks.
  let allInRange = true, mouthsClear = true;
  for (let i = 0; i < 12; i++) {
    d.__nt.genNode();
    const nd = d.__nt.node;
    for (const p of [nd.ingress, nd.egress]) {
      const len = (p.edge === 'top' || p.edge === 'bottom') ? nd.w : nd.h;
      if (!(p.idx >= 0 && p.idx <= len - 1)) allInRange = false;
      // Generation reserves the FULL span, so no bad sector or native honeypot may sit
      // on any mouth tile. Spec §7.2.
      for (const [mx, my] of d.__nt.mouthTiles(p, nd.w, nd.h)) {
        const solid = nd.badSectors.concat(nd.nativeHoneypots)
          .some(b => mx >= b.ax && mx <= b.ax + 1 && my >= b.ay && my <= b.ay + 1);
        if (solid) mouthsClear = false;
      }
    }
  }
  check('every rolled idx is within its own edge', allInRange,  true);
  check('no generated terrain sits on a mouth tile', mouthsClear, true);
  check('no exceptions', errs(d), []);
})();
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tools/verify-nt-loopback.js`
Expected: FAIL on `an egress whose mouth OVERLAPS the ingress is refused` (today only exact idx equality is rejected, so `left/4` is accepted) and on `no generated terrain sits on a mouth tile` (today only the primary tile is reserved).

- [ ] **Step 3: Bound the roll by the port's own edge**

Replace `js/games/nt.js:1757`:

```js
// One bound per EDGE. A single shared n was correct only because generated nodes are
// square — the same class of latent as ntPortSub's shared clamp (D44).
function ntRandomEdgePort(w, h) {
  const edge = ['top', 'right', 'bottom', 'left'][ntRandInt(0, 3)];
  const len  = (edge === 'top' || edge === 'bottom') ? w : h;
  return { edge, idx: ntRandInt(0, len - 1) };
}
```

At `js/games/nt.js:1780-1781`, update both calls:

```js
      ingress = ntRandomEdgePort(w, h);
      do { egress = ntRandomEdgePort(w, h); } while (egress.edge === ingress.edge);
```

- [ ] **Step 4: Reserve the full mouth span during generation**

At `js/games/nt.js:1784`, replace the `isMouth` closure. The two `ntPortMouth` calls on the line above it become mouth-tile lists:

```js
    const mouthTiles = ntMouthTiles(ingress, w, h).concat(ntMouthTiles(egress, w, h));
    const [imx, imy] = mouthTiles[0], [emx, emy] = ntMouthTiles(egress, w, h)[0];
    if (Math.abs(imx - emx) + Math.abs(imy - emy) < 8) continue; // corner-proximity guard
    // Reserve the FULL span, so a generated node always opens with a clean full-width
    // door and any narrowing is player-caused. Spec §7.2.
    const isMouth = (tx, ty) => mouthTiles.some(([mx, my]) => mx === tx && my === ty);
```

The corner-proximity guard deliberately keeps measuring from the **primary** mouth tile — it is a variety heuristic with an 8-tile threshold, against which a one-tile shift is noise (spec §7.3).

- [ ] **Step 5: Generalise the authoring guard to span intersection**

At `js/games/nt.js:2594`, replace the equality test:

```js
  // Two-unit mouths make near-misses overlap, and two corner ports on DIFFERENT edges
  // can share one physical tile. The rule this file already states — "the mouths must
  // differ" — generalises to tile-set intersection. Spec §7.5.
  if (ntMouthsIntersect(pick, other, w, h)) {
    ntFlashReject(ntBuildCells[ty] && ntBuildCells[ty][tx]);
    return;
  }
```

Also update the comment block above `ntAuthSetPort` (~:2580) — it currently says *"the mouths must differ"*, which is still true but now means something wider. Say so.

- [ ] **Step 6: Extend the rectangular end-to-end section (spec §8.1)**

The existing rectangular section (`tools/verify-nt-loopback.js:~1237`, the 16×18 / 16×20 / 20×16 cases from D46) asserts port markers by count. Add a mouth-span assertion to each case, inside whatever loop or per-case block it already uses:

```js
  // A port's mouth measures against its OWN edge. On a non-square node a swapped
  // argument order exchanges the two, which is invisible on a square node — this is the
  // same discriminator D46 established for ntPortMouth, applied to ntMouthIdxs.
  const nd = d.__nt.node;
  for (const p of [nd.ingress, nd.egress]) {
    const len = (p.edge === 'top' || p.edge === 'bottom') ? nd.w : nd.h;
    const idxs = d.__nt.mouthIdxs(p, nd.w, nd.h);
    check(`${w}×${h}: ${p.edge} mouth stays within its own edge`,
          idxs.every(i => i >= 0 && i <= len - 1), true);
    check(`${w}×${h}: ${p.edge} mouth is one unit at a corner, two otherwise`,
          idxs.length, (p.idx <= 0 || p.idx >= len - 1) ? 1 : 2);
  }
```

Match the surrounding block's own variable names for `d`, `w` and `h` rather than assuming these — read `:1225–1260` first.

- [ ] **Step 7: Confirm the two fixtures the spec flagged as probably-unaffected**

Spec §8.1 lists both as "revisit once", not "change":

- **`bareNode` (`:559`)** — `left/4` spans `[4,5]` and `right/9` spans `[9,10]` on an 18×18. Neither is a corner and neither exceeds the board. Confirm the `NT_GENERATE` wire checks at `:568` still pass unchanged; if so, change nothing.
- **DNP chaining (`:1205–1206`)** — the existing check that each client's `ingress.idx` matches the host's. This is spec §7.4's coverage: the mouth span is a pure function of `idx`, so a chained idx chains the span too, and this pre-existing check therefore already proves the property. Confirm it passes; **add a one-line comment** there noting it now also covers the mouth span, so a future reader does not think §7.4 is untested.

- [ ] **Step 8: Run the tests and the seed sweep**

Run: `node tools/verify-nt-loopback.js`
Expected: PASS, ≈**333** checks, 0 failures.

Run: `for s in 0 1 2 3 4 5 6 7; do NT_SEED=$s node tools/verify-nt-loopback.js > /dev/null || echo "SEED $s FAILED"; done`
Expected: no output. If a seed fails inside `ntGenerateNode`, the likely cause is the widened reservation making the 400-attempt loop harder to satisfy on a dense board — check whether the pathological fallback is being hit rather than loosening the reservation.

- [ ] **Step 9: Commit**

```bash
git add js/games/nt.js tools/verify-nt-loopback.js
git commit -m "$(cat <<'EOF'
feat(nt): roll ports per-edge, reserve the full span, refuse overlap

ntRandomEdgePort bounded idx with one n for all four edges — correct only
because generated nodes are square (D44's class). Now bounded per edge.

Generation reserves the full mouth span, so a node always opens with a clean
full-width door and any narrowing is player-caused.

ntAuthSetPort's "the mouths must differ" rule generalises to tile-set
intersection: two-unit mouths make near-misses overlap, and two corner ports
on different edges can share one physical tile.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Prove the new checks can fail (D42)

Implements spec §8.3. No production change. A test that has never been seen red is an assumption, not a check — and this suite has form: D46's finite-geometry section was only trusted once a deliberately injected NaN turned it, and only it, red.

**Files:** none committed. Every edit here is reverted before the task ends.

- [ ] **Step 1: Injection A — revert `ntPathExists` to single-source**

Copy `js/games/nt.js` to a scratch file, and in the copy replace the `srcs`/`dsts` filter in `ntPathExists` with the original single-sub-cell form:

```js
  const s = ntPortSub(node, node.ingress), t = ntPortSub(node, node.egress);
  if (g[s.sy][s.sx] || g[t.sy][t.sx]) return false;
  const srcs = [s], dsts = [t];
```

Run: `NT_SRC=/path/to/scratch-copy.js node tools/verify-nt-loopback.js`

Expected: **RED on `Placement legality` → `covering ONE half narrows the door — still routes`**, and on the `Endpoint snapping` open-half checks. Record which sections went red.

- [ ] **Step 2: Injection B — swap `ntMouthIdxs`'s axis arguments**

In a fresh scratch copy, change the `len` line to select the wrong axis:

```js
  const len = (port.edge === 'top' || port.edge === 'bottom') ? h : w;   // deliberately swapped
```

Run: `NT_SRC=/path/to/scratch-copy.js node tools/verify-nt-loopback.js`

Expected: **RED on `Mouth derivation` → the four per-axis checks** (`left port measures against h` and friends). This is the discriminator a square-only test cannot provide, by construction — a W/H swap is numerically invisible when `w === h`.

- [ ] **Step 3: Injection C — remove the corner collapse**

In a fresh scratch copy, make every mouth two units, clamped:

```js
  return [Math.min(port.idx, len - 2), Math.min(port.idx, len - 2) + 1];
```

Run: `NT_SRC=/path/to/scratch-copy.js node tools/verify-nt-loopback.js`

Expected: **RED on `Placement legality` → `a corner port cannot be narrowed at all`** and on `Mouth derivation` → `idx 0 collapses to one unit`.

- [ ] **Step 4: Confirm each injection reddens its own section**

Compare the three failure lists. Each injection must redden the section named in the spec's §8.3 table. An injection that reddens *everything* proves only that the harness runs — if that happens, the check is too coarse; tighten it and re-run.

- [ ] **Step 5: Delete every scratch copy and confirm the tree is clean**

Run: `git status --short`
Expected: no modifications to `js/games/nt.js`. Scratch copies live outside the repo (use the session scratchpad directory), so nothing to remove from git.

Run: `node tools/verify-nt-loopback.js`
Expected: PASS, 0 failures.

- [ ] **Step 6: No commit**

Nothing to commit — this task's deliverable is the recorded evidence that each new section discriminates. Carry the three failure lists into Task 7's implementation-notes entry.

---

### Task 7: SW bump and documentation closure

Implements spec §9. The Documentation Integrity Protocol in `CLAUDE.md` makes these updates **mandatory**, in this order.

**Files:**
- Modify: `sw.js` — `CACHE_NAME`
- Modify: `docs/code-map.md`, `docs/rules/game-identities.md` (§ Game 13), `CLAUDE.md`, `docs/implementation-notes/nt-implementation-notes.md`, `docs/decision-log.md`

- [ ] **Step 1: Bump the service worker**

Run: `grep -n "CACHE_NAME" sw.js`
Change `sylly-games-v199` → `sylly-games-v200`.

No `PRECACHE_URLS` change — this task adds no files.

The bump is load-bearing rather than routine here: the change is behavioural with **no payload change**, so a v199 device and a v200 device would exchange structurally valid packets while disagreeing on which placements are legal. `mp-version-mismatch-overlay` is the only guard, and it keys off this constant.

- [ ] **Step 2: Update `docs/code-map.md`**

Grep for the NT section (`grep -n "nt.js\|Net-Trace" docs/code-map.md`) — **never full-read it, it is ~132 KB.** Add the six new functions from Task 1 to the geometry-core listing, and note that `ntIsMouthTile` is now render-only.

- [ ] **Step 3: Update `docs/rules/game-identities.md` § Game 13**

Grep for `## Game 13:` and offset-read only that section. Document the two-unit mouth, the corner-port collapse, and that narrowing your OWN door is now a legal build move (no cross-player interaction — every placement acts on the placing player's own node only) while sealing it is not.

- [ ] **Step 4: Update `CLAUDE.md`**

Two edits:
1. § Current Focus — replace the SW v199 entry's position with a v200 entry (compress v199 to one line per the section's own "state, not history" rule).
2. § Verification harnesses — the NT row's check count `278` → **331**, and extend its description to mention two-unit ports.

- [ ] **Step 5: Add `docs/implementation-notes/nt-implementation-notes.md` entries**

Append D47–D49, following the D43–D46 format (What happened → Root cause → Lesson):

- **D47 — The resolved port.** Why expressing a mouth half as the same `{ edge, idx }` shape kept five point functions unmodified, and why `ntDijkstraSub` was deliberately left with its original return shape.
- **D48 — `ntRandomEdgePort` and `ntDrawLegCanvas`, D44's third and fourth instances.** Both were single-bound-for-two-measurements latents found by *reading adjacent code while already in the file*, not by a test. Note that D44 predicted exactly this.
- **D49 — What the deliberate-break step actually proved.** The three injections from Task 6 and which section each reddened; specifically that the axis-swap discriminator only exists because the suite has rectangular cases.

Also record the `ntMouthsIntersect` correction: the spec first specified it as same-edge idx-span overlap, which misses two corner ports on different edges sharing one tile. Found while writing the plan's test code, before any implementation — worth logging as an argument for writing assertions early.

- [ ] **Step 6: Append to `docs/decision-log.md`**

One entry, newest on top, ~4 lines: two-unit ports with single-unit corners; mouth derived from `{ edge, idx }` so no wire change; corner ports deliberately unblockable; pointer to the spec and to `nt-implementation-notes.md` D47–D49.

- [ ] **Step 7: Final verification**

Run: `node tools/verify-nt-loopback.js`
Expected: PASS, 0 failures. **Record the total the run prints** — that is the number for Step 4.

Run: `for s in 0 1 2 3 4 5 6 7; do NT_SEED=$s node tools/verify-nt-loopback.js > /dev/null || echo "SEED $s FAILED"; done`
Expected: no output.

Run: `node -e "new (require('vm').Script)(require('fs').readFileSync('js/games/nt.js','utf8'))" && echo "syntax ok"`
Expected: `syntax ok`.

- [ ] **Step 8: Commit**

```bash
git add sw.js docs/ CLAUDE.md
git commit -m "$(cat <<'EOF'
docs(nt): two-unit ports closure + SW v200

Harness 278 → <total> checks, green on seeds 0–7.

The SW bump is load-bearing rather than routine: this is a behaviour change
with no payload change, so two versions would exchange valid packets while
disagreeing on which placements are legal.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Post-plan: layout verification (not a task)

The harness cannot see layout — a mock element has no box. Two things in this change are geometric and should be eyeballed before the branch merges, via the **`visual-check`** skill:

1. **The build grid's port markers** — a standard 2-unit marker beside a corner 1-unit marker, on a rectangular node, confirming the marker spans the mouth and still straddles the border.
2. **The DNP bridge preview** (`ntDrawLegCanvas`) — the seam wall must open the full mouth. This is the failure mode with no assertion behind it (spec §6.3): if Task 4 Step 4 were missed, everything above would still be green.
