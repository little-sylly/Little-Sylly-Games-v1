# Design Spec — NT Two-Unit Ingress/Egress with Single-Unit Corner Ports

**Date:** 18 August 2026
**Game:** Net-Trace (`nt`, game 13)
**Status:** Approved design — implementation plan to follow
**Motivation:** Debug Mode fidelity with maze.game. A node's ingress and egress are one tile
wide; maze.game's are two. This closes that gap for every node in the game, not just Debug
Mode's, because the port geometry lives in the shared geometry core.

**Predecessor:** `docs/superpowers/specs/2026-08-18-nt-debug-rectangular-grid-design.md`
(SW v199 — the `n` → `w`/`h` axis split). That round is why this one is tractable: port
length is already known per-axis, and the harness already carries rectangular coverage.

---

## 1. Summary

A port's **mouth** — the tile(s) just inside the border that the runner passes through —
becomes **two tiles wide**, except at the two ends of an edge where it stays **one tile**.

The mouth is **derived** from the existing `{ edge, idx }` port record. No new field, no
schema change, no wire change. `idx` keeps its current roll range of `0 … len-1`.

| `port.idx` | Mouth span | Name |
|---|---|---|
| `0` | `[0]` | corner port |
| `len - 1` | `[len - 1]` | corner port |
| `1 … len - 2` | `[idx, idx + 1]` | standard port |

`len` is the port's own edge length: `w` for `top`/`bottom`, `h` for `left`/`right`.

Two consequences follow, and both are intended:

- A standard port can be **narrowed to one unit** by a placement covering one half. This is
  new tactical depth — a player can constrict their OWN door (previously the whole mouth was
  reserved and unbuildable) without sealing it. Every placement acts on the placing player's own
  node only; there is no cross-player interaction here, even in DNP.
- A corner port **cannot be narrowed at all** (§5.3).

---

## 2. Non-goals

- **No change to the port record.** `{ edge, idx }` is unchanged on the wire and in every
  payload. Anything that persists, transmits or compares a port is untouched.
- **No change to `idx`'s roll range.** Still `0 … len-1`. Corner rolls are legal and produce
  corner ports; that is the feature, not an edge case to design around.
- **No new UI.** The Node Editor's ingress/egress brushes are unchanged. An author picks a
  tile; the mouth follows from the resulting `idx` exactly as it does for a rolled port.
- **No `index.html` change.** Port marker geometry is inline-styled from JS — the D45
  pattern (an inline `style` overrides a Tailwind utility class at the cascade level).
- **`ntStringPull`, `ntLineOfSight`, `ntConfigGrid`, `ntStepLegal` are untouched.** They
  operate on the config lattice below the port abstraction and never see a port.

---

## 3. Architecture — the resolved port

### 3.1 The primitive

```js
// Mouth span along the port's own edge. Corner idx → 1 unit; else 2.
// The <= / >= (rather than ===) also harden against an out-of-range authored idx.
function ntMouthIdxs(port, w, h) {
  const len = (port.edge === 'top' || port.edge === 'bottom') ? w : h;
  if (port.idx <= 0)       return [0];
  if (port.idx >= len - 1) return [len - 1];
  return [port.idx, port.idx + 1];
}
```

### 3.2 The idea that contains the blast radius

A **resolved port** is the *same* `{ edge, idx }` shape as a logical port, with `idx` pinned
to one specific mouth half:

```js
function ntPortHalves(port, w, h) {
  return ntMouthIdxs(port, w, h).map(i => ({ edge: port.edge, idx: i }));
}
```

Because a resolved port is shape-identical to a logical one, **all five existing point
functions are unchanged in both body and signature**:

| Function | Change |
|---|---|
| `ntPortMouth(port, w, h)` | none — now called with a resolved port |
| `ntPortInterior(node, port)` | none |
| `ntPortBorder(port, w, h)` | none |
| `ntPortOutside(port, w, h)` | none |
| `ntPortSub(node, port)` | none |

This is the single most important structural decision in this spec. The alternative —
teaching each of those five functions to return arrays — would have multiplied the change
across every one of their call sites and every downstream consumer. Instead exactly one new
concept ("which half?") is introduced, resolved once per query, and everything past that
point is existing code running unmodified.

### 3.3 Derived helpers

Three thin wrappers, all pure functions of the above:

```js
function ntMouthTiles(port, w, h)      // → [[tx,ty], …]  (1 or 2)
function ntPortSubs(node, port)        // → [{sx,sy}, …]  (1 or 2)
function ntMouthsIntersect(a, b, w, h) // → bool — the two TILE SETS share a tile
```

`ntMouthsIntersect` compares **tile sets**, not idx spans on a shared edge. Two corner ports
on *different* edges can meet at the same physical tile — ingress `left/0` and egress `top/0`
both resolve to tile `(0,0)` — and an idx-span comparison would miss it entirely, because the
edges differ and the indices index different axes. §7.5 depends on this being caught.

`ntIsMouthTile(tx, ty)` is **retained**, widened to test both ports' full tile sets. Its
only surviving consumer is the render classification in §6.1 — every placement-reservation
consumer is deleted (§5.1).

---

## 4. Pathfinding — multi-source, multi-target

### 4.1 `ntPathExists`

- **Sources:** `ntPortSubs(node, node.ingress)`, filtered to open (`!g[sy][sx]`).
- **Goals:** the same for `node.egress`, held as a `Set` of flat indices.
- Return `false` if **either** list is empty after filtering. This replaces today's
  `if (g[s.sy][s.sx] || g[t.sy][t.sx]) return false`.
- Seed the BFS queue with **every** open source; return `true` on reaching **any** goal.

A mouth tile's centre sub-cell is blocked if and only if that tile itself is solid: the
config lattice inflates a solid tile by one sub-cell in each direction, which reaches
`tx*k` from a neighbour at `tx-1`, while the centre sits at `tx*k + 2`. So "open half" is
exactly "that mouth tile is not solid" — no additional clearance subtlety is introduced.

### 4.2 `ntDijkstraSub`

Same source/goal derivation. `dist = 0` at every open source. Terminate when the settled
node `u` is in the goal set.

**The return shape does not change.** It still returns the sub-cell path. `ntShortestPath`
recovers which half was used from the path's own endpoints, so no new contract is introduced
between the two functions — one fewer thing that can break.

### 4.3 `ntShortestPath` — resolving the ends

The fiddliest part of the change, and deliberately confined to this one function.

```js
const usedIn  = ntResolveHalf(node, node.ingress, sub[0]);
const usedOut = ntResolveHalf(node, node.egress,  sub[sub.length - 1]);
poly[0]               = ntPortInterior(node, usedIn);
poly[poly.length - 1] = ntPortInterior(node, usedOut);
poly.unshift(ntPortBorder(usedIn,  node.w, node.h));
poly.unshift(ntPortOutside(usedIn, node.w, node.h));
poly.push(ntPortBorder(usedOut,  node.w, node.h));
poly.push(ntPortOutside(usedOut, node.w, node.h));
```

`ntResolveHalf(node, port, subCell)` maps the sub-cell to its tile (`Math.floor(sx / k)`,
`Math.floor(sy / k)`), finds the matching half, and **falls back to the first half** if the
lookup misses.

That fallback is not defensive padding — it is D46 applied at the source. An unmatched
lookup would otherwise yield `undefined`, `undefined` arithmetic yields `NaN`, and `NaN`
throws nothing: it is assigned to a canvas coordinate and renders as garbage while every
call still "succeeds." The fallback converts an impossible-but-unproven state into a
wrong-but-finite point, which the finite-geometry assertions (§8.2) can actually catch.

### 4.4 Why the stubs track the used half

The off-board stub and the border point use the **used half's** idx, not the span midpoint.

A midpoint stub would sit on the tile boundary *between* the two halves. The runner would
enter at the seam and immediately jog sideways to reach a half-centre — a visible kink at
the door, on every single run, for the whole match. Tracking the used half makes entry and
exit perpendicular to the border and straight.

---

## 5. Placement — deleting the reservation

### 5.1 The deletions

Seven sites drop their mouth check. `ntPathExists` becomes the **only** gate on whether a
placement may touch a port.

| Site | Context |
|---|---|
| `nt.js:2140` | ghost preview blocked-check |
| `nt.js:2311` | drag handler, tile guard |
| `nt.js:2314` | drag handler, footprint guard |
| `nt.js:2328` | `ntHandleTap` |
| `nt.js:2336` | `ntHandleLongPress` |
| `nt.js:2347` | `ntAttemptPlace` footprint guard |
| `nt.js:2542` | Node Editor place path |

The eighth consumer, `ntCellType` (`nt.js:2065`), is **retained and widened** — see §6.1.

### 5.2 The emergent behaviour

Nothing below is special-cased. All of it falls out of `ntPathExists` alone:

| Mouth | Coverage | Outcome |
|---|---|---|
| 2-tile | one half | **accepted** — the door narrows to one unit |
| 2-tile | both halves | **rejected** — no open source remains |
| 1-tile corner | any | **rejected** |

Both halves of a 2-tile mouth are reachable by a **single** 2×2 block: mouth `[4,5]` on the
left edge is fully covered by a block anchored at `(0,4)`, which occupies `(0,4) (1,4) (0,5)
(1,5)`. So the "full block" case is a live scenario a player can attempt, not a theoretical
one — and it is correctly refused.

### 5.3 Corner ports are unblockable — intended

A corner mouth is one tile. Any 2×2 covering it removes the only source or goal, so
`ntPathExists` refuses the placement. A corner port therefore can never be narrowed, at all.

**This is the mechanic, not a gap.** A standard port has a second half to give up, so it can
be constricted; a corner port has none, so it trades tactical vulnerability for geometric
certainty. A node rolled with a corner ingress is meaningfully different to play against
than one rolled mid-edge, in a way the player can read straight off the board.

Recorded here affirmatively so a future reader does not "fix" it.

---

## 6. Rendering

### 6.1 Cell classification — `ntCellType` (`nt.js:2065`)

Retained, widened to the span. `ntBlockAt` is evaluated first in `ntCellType`, so a firewall
placed on one half **shadows** the port paint on that tile:

```
vacant mouth  →  ░◦░◦░     two door tiles
half-blocked  →  ░◦░█░     one door tile + firewall
```

That shadowing is the whole point: it is the only thing on the grid itself that shows a door
has been narrowed. The 6 px border marker is too thin to carry it.

### 6.2 Port markers — `ntDrawPortMarker`

The marker spans the mouth: length `idxs.length × (100 / len)%`, offset from `idxs[0]`. The
border straddle (`off: '-3px'`, `thick: '6px'`) is unchanged.

Both the build grid and the Node Editor grid get this for free — the function was lifted out
of `ntRenderBuildGrid` precisely so the two could never drift into drawing different
markers. That decision pays off here.

### 6.3 The DNP seam — `ntDrawLegCanvas`

**This is the site most likely to be missed.** Two edits:

1. The seam wall loop currently opens exactly one row (`if (row === node.ingress.idx)
   continue;`). It must skip **every row in the mouth span**.
2. The port channel bar (`fillRect(0, idx * c, t, c)`) must span the mouth:
   `fillRect(0, idxs[0] * c, t, c * idxs.length)`.

Miss either and every check stays green — the maths is correct, `ntPathExists` is happy, the
route resolves — while the bridge preview shows a door walled off across half its width.
There is no assertion that would catch it short of the one added in §8.2.

### 6.4 Fix in passing — `ntDrawLegCanvas`'s square assumption

`nt.js:2997` does `const n = node.w`, then uses `n * c` on **both** axes for the gridlines
and the base `fillRect`, while correctly setting `canvas.height = node.h * c`.

Currently harmless: DNP legs are always square, and Debug Mode is single-player so its
rectangular nodes never reach this renderer. That is exactly the D44 condition — a single
shared bound standing in for two conceptually distinct measurements, invisible until the two
diverge. Fixed in passing while the function is already open, alongside `ntRandomEdgePort`
(§7.1), which is the same class of latent.

---

## 7. Generation and authoring

### 7.1 `ntRandomEdgePort` — the D44-class latent

Today it takes a single `n` and bounds `idx` with it for all four edges. Correct only
because generated nodes are square.

```js
function ntRandomEdgePort(w, h) {
  const edge = ['top', 'right', 'bottom', 'left'][ntRandInt(0, 3)];
  const len  = (edge === 'top' || edge === 'bottom') ? w : h;
  return { edge, idx: ntRandInt(0, len - 1) };
}
```

Call site `nt.js:1780` updates to `ntRandomEdgePort(w, h)`.

### 7.2 Generation reserves the full span

`ntGenerateNode`'s local `isMouth` closure (distinct from `ntIsMouthTile`) widens to both
ports' full spans, so bad sectors and native honeypots can never generate on a mouth tile.

Every generated node therefore opens with a **clean full-width door**, and any narrowing is
player-caused. That is what makes the new mechanic legible: a constricted door means the owning
player chose to build there — never another player's doing.

### 7.3 The corner-proximity guard is left alone

`nt.js:1783`'s re-roll guard (`|imx-emx| + |imy-emy| < 8`) keeps measuring from the primary
mouth tile. It is a variety heuristic with an 8-tile threshold; a one-tile shift is noise
against it. Stated explicitly so it does not read as an oversight.

### 7.4 DNP chaining is preserved automatically

Leg N+1's ingress `idx` is pinned to leg N's egress `idx` so the cluster bridge lines up
edge-to-edge. The mouth span is a **pure function of `idx`**, both edges index the same axis
(`h`), and DNP legs are square — so pinning the idx pins the span identically. No change is
required to `forcedIngressIdx` or its call path.

### 7.5 Node Editor — overlap rejected

`ntAuthSetPort` (`nt.js:2594`) currently rejects only exact equality
(`pick.edge === other.edge && pick.idx === other.idx`). Two-tile mouths make near-misses
overlap: ingress `left/3` spans `[3,4]` and egress `left/4` spans `[4,5]`, sharing tile 4.

Widened to `ntMouthsIntersect`. An overlapping mouth would make one sub-cell simultaneously a
BFS source and a goal — a zero-length route rendering as stub-to-stub with no path.

This is not a new restriction. The function's own comment already states the surviving
constraints as *"the mouths must differ, and the node must route"*; span-intersection is that
rule correctly generalised now that a mouth can be wider than one tile. The deliberately
permissive parts of that comment — ports may share an edge, ports may sit close together —
are unaffected.

---

## 8. Verification

### 8.1 Fixtures to revisit (one pass)

| Fixture | Action |
|---|---|
| `bareNode` (`verify-nt-loopback.js:559`) | `left/4` → `[4,5]`, `right/9` → `[9,10]` on 18×18. Both non-corner, both still valid. Confirm the `NT_GENERATE` wire checks at :568. |
| Port-marker section (:1024–1055) | Marker **count** is unchanged at 2. **Add width assertions** — a standard 2-span marker vs a corner 1-span marker. |
| Editor section (:1082–1122) | The `left/5` → `left/10` re-authoring dance exists *because* the mouth tile was reserved (see its comment at :1096). With the reservation deleted that reasoning no longer holds — **re-derive it, do not preserve it**. |
| Rectangular cases (:1237) | Add per-axis mouth-span assertions: a `top` port spans against `w`, a `left` port against `h`. |

### 8.2 New sections

1. **Mouth derivation** — `idx 0` → 1 tile; `idx len-1` → 1 tile; `idx 1…len-2` → 2 tiles;
   per-edge length resolves against the correct axis on a rectangle.
2. **Half-block legal / full-block rejected** — a 2×2 covering one half of a 2-tile mouth is
   accepted; covering both is rejected.
3. **Corner unblockable** — any 2×2 covering a corner mouth is rejected.
4. **Endpoint snapping** — with one half blocked, the polyline's first and last interior
   points are the **open** half's centre, and the border/outside stubs carry the *same* idx
   (proving §4.4's no-kink property). Plus `Number.isFinite` on every point, reusing D46's
   tripwire.
5. **Editor overlap rejected** — authoring an egress whose span intersects the ingress's is
   refused and leaves the node unchanged.

### 8.3 Deliberate-break step (D42)

Three injections. Each must turn **one named section red and nothing else** — a break that
reddens everything proves only that the harness runs.

| Injection | Must redden |
|---|---|
| `ntPathExists` reverted to single-source | §8.2 (2) half-block-accepted |
| `ntMouthIdxs(port, h, w)` argument swap | §8.2 (1) rectangular per-axis |
| Corner collapse removed (always `[idx, idx+1]`, clamped) | §8.2 (3) corner-unblockable |

The second mirrors D46's proven discriminator: a W/H swap is numerically invisible on a
square node, so only the rectangular case can catch it.

Run across seeds 0–7, as established.

---

## 9. Scope and risk

**Files touched:**

- `js/games/nt.js` — geometry core, pathfinding, placement, both renderers, generation
- `tools/verify-nt-loopback.js` — fixtures (§8.1) + five new sections (§8.2)
- `sw.js` — `CACHE_NAME` → **v200**
- Docs per the Documentation Integrity Protocol: `nt-implementation-notes.md`,
  `docs/code-map.md`, `game-identities.md` § 13, `CLAUDE.md` § Current Focus,
  `docs/decision-log.md`

**Not touched:** `index.html` (§2), `engine-multiplayer.js`, any packet applier.

**Version-skew risk — stated, not mitigated.** This is a **behaviour** change with **no
payload change**. A v199 device and a v200 device exchange structurally valid packets while
disagreeing on which placements are legal and where the route runs. The existing
`mp-version-mismatch-overlay` is the guard and it is sufficient — but the absence of a schema
change means nothing *else* would catch a skewed session, so the SW bump is load-bearing
rather than routine.

**Blast-radius note.** The port geometry is shared, so this changes every node in every mode
— Standard, DNP and Debug — not only Debug Mode's authored nodes. That is intended
(maze.game fidelity is a property of the game, not of the sandbox), and it is why the change
warrants a full spec rather than a Debug-scoped patch.
