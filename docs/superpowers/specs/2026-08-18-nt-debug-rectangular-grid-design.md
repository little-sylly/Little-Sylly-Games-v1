# NT Debug Mode: Independent Width × Height Matrix Sizing — Design

**Status:** Approved by owner, 18 Aug 2026. Ready for implementation planning.
**Branch context:** Follows directly from the Debug/Sandbox Mode feature (SW v198,
`nt-implementation-notes.md` D36–D42).

## Problem

NT's node is currently hard-square: `ntMatrixScale` (16/18/20, a Settings pill) is the single
`n` used as both width and height everywhere a node's grid is generated, rendered, path-checked,
or port-placed. Debug/Sandbox Mode's hand-authored node inherits the same constraint. The owner
wants Debug Mode to let the player pick width and height independently (16–20 each), so a
16×20 rectangle is a real, playable node — not just two equal numbers typed into two boxes.

## Scope decisions (confirmed with owner)

1. **One node shape, everywhere.** `ntNode.n` → `ntNode.w` / `ntNode.h` across the whole file —
   generated (Standard/DNP) nodes AND authored (Debug) nodes. Generated nodes always set
   `w = h = ntMatrixScale`; only Debug's new configure screen can produce `w !== h`. This means
   most non-Debug call sites are a straight rename (since `w === h` there always) — the genuine
   rectangular-math work is confined to path validation, port placement, terrain-footprint bounds,
   and rendering (grid + canvas), all of which must work for *any* `w`/`h` in [16,20] whether or
   not they're equal.
2. **New screen, every Debug entry point.** A terminal-flavoured configure screen
   (`screen-nt-debug-config`) appears before every *first* `ntShowAuthoring()` call this session —
   solo, PTP, and MDLM's host. It does NOT reappear on the existing "Author New Node" loop-back
   from the summary screen (D36's "one authoring entry point, reached twice" stays true — the
   loop-back reuses the last-picked width/height, matching that it already reuses everything else
   about the entry ritual).
3. **Settings overlay unchanged.** Matrix Scale (16/18/20 pills) still exists exactly as today; its
   value only seeds both the Width and Height defaults on the new configure screen. No relabeling.
4. **Input control: raw number boxes.** Two `<input type="number" min="16" max="20">` fields
   (Width, Height), not pills, not steppers — clamped on blur/submit to [16,20].
5. **MDLM visibility:** host-only, matching every other host-gate screen before a timed/generative
   phase (`logic-engine.md` § Host-gate screens before timed phases). Clients see the existing
   `ntShowStandby('Authoring node…')` line unchanged — no new packet needed, because the eventual
   `NT_GENERATE` already carries the fully-sized node object verbatim (D36).

## Screen: `screen-nt-debug-config`

Visually identical in shape to `screen-nt-gate`'s boot-log context (same terminal chrome:
`border-emerald-700/40 bg-slate-900 font-mono text-emerald-400`, same `ntTypeLines` typewriter),
but its own screen/ids — not a third branch bolted onto `screen-nt-gate`, since its post-typing
reveal is fundamentally different content (two number inputs + a button, not one button).

Flavour lines (debug-voiced, distinct from `NT_BOOT_LINES`):
```
OPENING SANDBOX SHELL…
NO CLUSTER CONNECTION REQUIRED…
AWAITING OPERATOR DIMENSIONS…
```
Reveal, once typing finishes (mirrors `ntPlayGateBoot`'s read-pause-then-reveal):
- Width input, Height input (pre-filled from `ntMatrixScale`, both editable independently)
- "Deploy Sandbox ▶" button (`btn-nt-debug-config-deploy`) — clamps both fields to [16,20] on tap,
  writes `ntDebugLastW`/`ntDebugLastH`, then calls `ntShowAuthoring()`.

Header row matches `screen-nt-gate`'s (System Access label, 🔊, ✕) — same quit-overlay routing.

**Entry wiring:** the three call sites that currently do `if (ntDebugMode) { ntShowAuthoring(); return; }` /
`if (ntDebugMode) ntShowAuthoring();` (`ntStartSolo`, `ntStartPTP`, `ntStartSession`'s host branch)
instead call a new `ntShowDebugConfig()` on **first entry only**; the existing loop-back call site
(`ntSummaryCallback = () => ntShowAuthoring()`) is untouched.

## Data model conversion

`ntNode.n` (scalar) → `ntNode.w`, `ntNode.h`:

- **`ntGenerateNode`** — sets `w = h = ntMatrixScale`. No behavioural change for Standard/DNP.
- **`ntAuthBlankNode`** — takes `ntDebugLastW`/`ntDebugLastH` (set by the configure screen).
- **Bounds/axis split** — every function currently checking `tx/ty` against one `n`, or deriving a
  port's "nearest edge" index range from one `n`, splits by axis: `tx` bounds and the top/bottom
  edges' index range use `w`; `ty` bounds and the left/right edges' index range use `h`. Applies to
  `ntPathExists`, `ntAuthSetPort`, `ntPortMouth`, `ntBlockTiles`/footprint bounds, `ntAuthTap`'s
  clamp-to-grid.
- **Firewall slot budget** (`ntAuthMaxFirewall`, today `Math.pow(Math.floor(n/NT_BLOCK), 2)`) →
  `Math.floor(w/NT_BLOCK) * Math.floor(h/NT_BLOCK)` — the direct rectangular generalisation.
- **CSS grid rendering** (`ntRenderBuildGrid`, `ntRenderAuthGrid`) — `grid-template-columns:
  repeat(w, 1fr)`; row count falls out of `h` cells with `aspect-ratio:1` per cell already applied,
  so cells stay square and the grid becomes a genuine w×h rectangle with no further CSS change.
- **Canvas rendering** (`ntDrawMaze`, `ntRenderFrame`, the comparison-view thumbnails) — keep a
  single uniform pixels-per-tile (`px`), but size the canvas itself to `w*px` × `h*px` instead of a
  fixed square. `ntDrawMaze`'s grid-line loop needs two bounds (`li <= w` for vertical lines drawn
  across `canvas.height`, `li <= h` for horizontal lines across `canvas.width`) instead of one
  shared `n`. Port bar placement (`bar()`) already reads `canvas.width`/`canvas.height` directly —
  no change needed there once the canvas itself is sized correctly.
- **DNP allocation-viewer preview** (`ntBuildBridgeInto`'s `previewN`, `nt.js:898`) — reads
  `node.n`; becomes `node.w` (DNP nodes are always generated, so `w === h` always holds there in
  practice — this is a rename, not new rectangular logic, per scope decision 1).

## Sync

No new packet type. `NT_GENERATE` already carries the node object verbatim; a node with `w`/`h`
instead of `n` rides the existing wire path unchanged (D36's "consumers read the node by shape"
argument applies identically here). `ntNormaliseNode` needs no change — `w`/`h` are always
non-zero numbers, never a Firebase-erasable empty collection.

Two new plain state vars, `ntDebugLastW` / `ntDebugLastH`, hold the most recently confirmed
width/height for the loop-back path (scope decision 2) and for pre-filling the configure screen on
a later fresh entry within the same session.

## Testing

- `tools/verify-nt-loopback.js`: add at least one non-square Debug seed. **Owner-specified:
  16w × 18h is mandatory.** I'll add a second, more extreme ratio (16×20) to stress the axis-split
  logic at its widest gap.
- `visual-check` pass on `screen-nt-debug-config` and both grid renderers (build screen playing a
  deployed 16×18 debug node; the Node Editor authoring one) — the harness's mock DOM can't see
  layout, so this is the only way to catch a stray square assumption in CSS/canvas sizing.
- Existing 8-seed square-node suite must stay green throughout (no regression to Standard/DNP,
  which never produce `w !== h`).

## Out of scope

- Standard/DNP node generation gains no new player-facing control — `ntMatrixScale` remains the
  only lever there, always producing `w === h`.
- The DNP allocation-viewer's bridge strip is not made genuinely rectangular-aware beyond the
  rename above, since it can never receive a `w !== h` node under this scope.
