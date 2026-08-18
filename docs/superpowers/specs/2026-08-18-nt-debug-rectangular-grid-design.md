# NT Debug Mode: Independent Width × Height Matrix Sizing — Design

**Status:** Rev 2 — revised 18 Aug 2026 after an Opus review pass against the actual code.
Rev 1's decisions all survived; its *blast radius* was materially understated and one central
technical claim ("no further CSS change") was wrong. Ready for implementation planning.
**Branch context:** Follows the Debug/Sandbox Mode feature (SW v198, `nt-implementation-notes.md`
D36–D42).
**Verified baseline:** `node tools/verify-nt-loopback.js` = **242 checks**, green on seeds 1–3
(and the 8-seed suite). CLAUDE.md's "239" is stale — the plan's regression gate is 242.

## Problem

NT's node is hard-square: `ntMatrixScale` (16/18/20, a Settings pill) is the single `n` used as
both width and height everywhere a node is generated, rendered, path-checked or port-placed.
Debug/Sandbox Mode's hand-authored node inherits the constraint. The owner wants Debug Mode to let
the player pick width and height independently (16–20 each), so a 16×20 rectangle is a real,
playable node — not two equal numbers typed into two boxes.

## Scope decisions (confirmed with owner)

1. **One node shape, everywhere.** `ntNode.n` → `ntNode.w` / `ntNode.h` across the whole file, for
   generated (Standard/DNP) and authored (Debug) nodes alike. Generated nodes always set
   `w = h = ntMatrixScale`; only Debug's configure screen can produce `w !== h`.
2. **New screen, every Debug entry point** — solo, PTP, MDLM host. It does **not** reappear on the
   existing "Author New Node" loop-back (D36's "one authoring entry point, reached twice" holds;
   the loop-back reuses the last-picked dimensions).
3. **Settings overlay unchanged.** Matrix Scale still exists as-is; it only seeds both defaults.
4. **Input control: raw number boxes** — `<input type="number" min="16" max="20">` ×2, clamped to
   [16,20] on submit.
5. **MDLM: host-only**, matching `logic-engine.md` § Host-gate screens before timed phases. Clients
   keep the existing `ntShowStandby('Authoring node…')`. No new packet — `NT_GENERATE` already
   carries the fully-sized node verbatim (D36).

## Screen: `screen-nt-debug-config`

Same terminal chrome as `screen-nt-gate`'s boot-log context (`border-emerald-700/40 bg-slate-900
font-mono text-emerald-400`, same `ntTypeLines` typewriter), but its own screen and ids — not a
third branch on `screen-nt-gate`, whose post-typing reveal is one button, not two inputs plus a
button.

Flavour lines (debug-voiced, distinct from `NT_BOOT_LINES`):
```
OPENING SANDBOX SHELL…
NO CLUSTER CONNECTION REQUIRED…
AWAITING OPERATOR DIMENSIONS…
```
Revealed after typing (mirroring `ntPlayGateBoot`'s read-pause-then-reveal): Width input, Height
input (pre-filled per § State lifecycle below), and `btn-nt-debug-config-deploy` ("Deploy Sandbox ▶")
which clamps both fields, writes `ntDebugLastW`/`ntDebugLastH`, then calls `ntShowAuthoring()`.

Header row matches `screen-nt-gate`'s (System Access label, 🔊, ✕), same quit routing. Register the
screen in `allScreens[]` (`engine.js`) per § Screen Routing.

**Entry wiring:** the three sites that currently call `ntShowAuthoring()` on first entry —
`ntStartSolo` ([nt.js:238](../../js/games/nt.js)), `ntStartPTP` (:268), `ntStartSession`'s host
branch (:582) — call `ntShowDebugConfig()` instead. The loop-back site
(`ntSummaryCallback = () => ntShowAuthoring()`, :1449) is **untouched**.

## Data model conversion — by tier

`ntNode.n` → `ntNode.w`, `ntNode.h`. Rev 1 listed four call sites; the real work is four tiers.

### Tier 1 — the config lattice (the actual home of the square assumption)

Rev 1 named only `ntPathExists`. The ¼-tile lattice underneath it is five functions:

| Site | What must change |
|---|---|
| `ntSolidGrid` (:1545) | allocates `[n][n]`; bounds `tx<n && ty<n` → `tx<w && ty<h` |
| `ntConfigGrid` (:1560) | `W=n*k, H=n*k`; double loop on `n` → `w`/`h` |
| `ntPortSub` (:1621) | **one clamp `m = node.n*k-1` used for BOTH `sx` and `sy`** — must split into `mx = w*k-1`, `my = h*k-1`. A real latent bug for rectangles, not a rename. |
| `ntPathExists` (:1635) | `W`/`H` both from `n` (the two vars already exist separately) |
| `ntDijkstraSub` (:1657) | same |

**Deliberately NOT touched:** `ntInBounds` (:1587) and `ntStepLegal` (:1591) derive their bounds
from `g.length` / `g[0].length` and are already dimension-agnostic. Leave them byte-identical.

### Tier 2 — ports and geometry

`ntPortMouth`, `ntPortBorder`, `ntPortOutside` (:1599–1620) each take a single `n` but use it for
the bottom edge (needs `h`) *and* the right edge (needs `w`) — all three take both dimensions, as
do their callers `ntPortInterior` (:1605) and `ntIsMouthTile` (:1625). `ntAuthSetPort`'s
nearest-edge distances (:2528) split the same way: `bottom → h-1-ty`, `right → w-1-tx`.
`ntBlockTiles` (:1539) is offset-only and needs no change; its *callers'* bounds checks do.
`ntHoneypotCentres` (:1816) is dimension-agnostic — no change.

### Tier 3 — generation (emits squares, must still be written correctly)

`ntGenerateNode` (:1751) only ever produces `w === h` under this scope, so none of these change
behaviour — but leaving them square-shaped half-keeps the "one shape" promise and seeds silent bugs
for any future change:
- `ntRandomEdgePort(n)` (:1742) — top/bottom idx ranges over `w`, left/right over `h`
- `occupied[n][n]` and `tryMark`'s `tx>=n||ty>=n` (:1771, :1774)
- `ntRandInt(0, n-2)` for `ax`/`ay` (:1782) → `w-2` / `h-2`
- pathological fallback `n>>1` (:1797) — left/right ports, so a **row** index → `h>>1`
- the emitted object `{ n, … }` → `{ w, h, … }`

`ntAuthBlankNode` (:2393) has the same trap: its default left/right ports use `idx: n>>1`, a row
index → `h>>1`.

**Slot budget — single-source it.** `ntAuthMaxFirewall` (:2555) and `ntGenerateNode` (:1753) carry
the *identical* `Math.pow(Math.floor(n/NT_BLOCK), 2)`. Both become one shared
`ntSlotCount(w, h) = Math.floor(w/NT_BLOCK) * Math.floor(h/NT_BLOCK)`, per `logic-engine.md`
§ single-source board arithmetic — two parallel edits is how D22/D22b's "formula lived in three
places" repeats.

### Tier 4 — rendering (where Rev 1 was wrong)

**All three render surfaces are hard-coded square in the markup** and must take a JS-set
`aspect-ratio: w/h`:
- `#nt-build-grid` — [index.html:7455](../../index.html), `w-full aspect-square`
- `#nt-auth-grid` — :7491, `w-full aspect-square`
- `#nt-playback-canvas` — :7552, `w-full aspect-square`

Rev 1 claimed the rectangle "falls out for free" from per-cell `aspect-ratio:1`. It does not: with
`repeat(w,1fr)` columns and `h` rows, natural content height is `(h/w) × width`, which will not
match a forced-square container — overflow when `h>w`, dead space when `h<w`.

Then: `ntRenderBuildGrid` / `ntRenderAuthGrid` emit `repeat(w,1fr)` and `w*h` cells; `ntDrawMaze`
(:3043) and `ntRenderFrame` (:3091) keep one uniform px-per-tile but size the canvas `w*px × h*px`
and split the grid-line loops (`li<=w` vertical, `li<=h` horizontal); port bars already read
`canvas.width`/`height` and need nothing once the canvas is sized. Comparison thumbnails (:386–405)
set `width = height = THUMB` and loop `li <= ntNode.n` on both axes — `THUMB` becomes the longer
side with the other scaled, or a 16×20 node renders squashed. The DNP preview's `previewN` (:898)
becomes `node.w`; update the v194 cell-fit comment above it (:892–897), which reasons explicitly in
"18×18 = 324px" terms and goes stale with the rename.

## State lifecycle

`ntDebugLastW` / `ntDebugLastH` are **session state, not settings** — cleared by `ntResetState`
(unlike `ntDebugMode`, which is deliberately preserved as a setting, :3964). Invariant:

- Config screen open → inputs pre-fill from `ntDebugLastW/H` if set, else from `ntMatrixScale`.
- Deploy tapped → both written (clamped).
- Loop-back ("Author New Node") → reads them directly; never reads the previous node's `w`/`h`,
  which terrain edits may have left incidental.
- Return to lobby → cleared, so the next session re-seeds from the Matrix Scale setting.

This makes the loop-back and a menu-level restart both reuse the last choice, while a cold boot to
lobby resets to the setting. The config screen can never be reached with them unset *and* required.

## Sync

No new packet. `NT_GENERATE` carries the node verbatim, so `{w,h}` rides the existing path (D36's
"consumers read the node by shape"). `ntNormaliseNode` needs no change — `w`/`h` are non-zero
numbers, never Firebase-erasable empties. A new-code host sending `{w,h}` to an old-code client is
precisely what the existing MP version-mismatch gate covers; no extra handling.

## Testing

**The refactor's most likely defect is invisible to the current harness.** A missed `.n` → `.w`/`.h`
rename yields `undefined` → `NaN`, which propagates silently. The harness has a mock 2d context
([verify-nt-loopback.js:109,201](../../tools/verify-nt-loopback.js)) so canvas code *executes* — but
NaN arithmetic throws nothing and asserts nothing, so a 16×18 seed can pass while rendering garbage.
Same shape as D42's "checks that couldn't fail." Three gates, all required:

1. **Emit no `n` key at all** from `ntGenerateNode` / `ntAuthBlankNode`, so any stale reader gets
   `undefined` rather than a plausible-looking square value.
2. **Grep gate** — zero remaining node-`.n` reads in `js/games/nt.js`.
3. **Finite-value assertions** — the harness asserts `Number.isFinite()` on `latencyMs` and every
   polyline coordinate. This is the check that actually turns a silent NaN red; without it (1) and
   (2) are process, not tests.

Plus:
- **Owner-mandated seed: 16w × 18h.** Second seed 16×20 to stress the axis split at its widest gap.
- `visual-check` on `screen-nt-debug-config`, and on both grids plus playback with a deployed 16×18
  node — the only coverage for the Tier-4 aspect-ratio work, which no headless harness can see.
- The existing 8-seed square suite (242 checks) must stay green throughout.

## Implementation sequencing (load-bearing)

Converting the shared geometry core for a **sandbox-only** feature puts the blast radius on the
shipped Standard/DNP game. Mitigate by ordering, as explicit plan steps:

1. Pure rename + axis split, no new screen, no rectangles. `w === h` everywhere.
2. **Prove 242 checks green on all 8 seeds** — behaviour-neutral by construction, so any red here
   is a rename bug, isolated from any rectangle logic.
3. Add the finite-value assertions (gate 3) and re-prove green.
4. Then the config screen, `ntDebugLastW/H`, and the rectangular seeds.

## Out of scope

- Standard/DNP gain no new player-facing control; `ntMatrixScale` stays the only lever there.
- The DNP allocation bridge is not made rectangular-aware beyond the `previewN` rename — it can
  never receive a `w !== h` node under this scope.
