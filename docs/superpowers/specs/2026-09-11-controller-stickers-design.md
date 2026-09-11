# Design — Controller integration part 2: stickers

**Date:** 11 Sep 2026
**Status:** Draft, reviewed against the real geometry 12 Sep 2026 (§ 5.2b, § 6 and § 12 are outputs
of that review; § 12.4's legibility fix is the one item still open to the owner)
**Tier:** 2 — Architectural (new storage schema, new overlay UI, a substantial geometry component
not yet live in the app)
**Amends:** `docs/superpowers/specs/2026-09-11-controller-integration-design.md` § 13 (this is the
"sticker sub-project" that section named and deferred).

---

## 1. Summary

The Workshop's colour customiser gains a second real editing mode: stickers. A player picks a design
from a small book, taps the controller to place it — wrapped correctly over the curved shell, or
flat on an ear cap — and can then select, move, rotate, scale, delete, and undo any placement, all
through the tap-only interaction the Workshop already uses for colour swatches. Each design can be
on the controller **at most once**; how many designs exist (and, later, which are unlocked) is a
content question the sticker inventory answers, not a count the UI enforces.

The one-line version: *the controller becomes something a player actually decorates, not just
recolours.*

---

## 2. Context and current state

### 2.1 What exists

- **`data/stickers/`** — the real dump folder, seeded with three test images (`banana`, `computer`,
  `pan`). No manifest, loader, or caching rule yet — this spec writes all three.
- **`docs/controller-prototype/sticker-surface.js`** — the frozen prototype's placement mathematics.
  Pure (takes `U`/`ATLAS` as arguments, no DOM), untouched since the parent spec explicitly left it
  in `docs/controller-prototype/` rather than porting it. Exposes `field, point, normal, blocked,
  padPairs, outlineAt, plainAtlas, toAtlas, fromAtlas, makeChart, plan, …` — `plan(x, y, back, want)`
  is the placement-legality probe (returns `{ok, chart, x, y, size, distortion}` or `{ok:false,
  reason}`), `makeChart`/`toAtlas` are what the shell's per-texel rasteriser uses to paint a sticker
  correctly onto a doubly-curved surface.
- **`docs/controller-prototype/standalone.html`** (the full prototype, distinct from the frozen
  `standalone-stickerless.html` the parent spec ported from) — has a **working** drop-only placement
  flow: tap → raycast → `SURF.plan()` → push into `placed[]`/`earPlaced[]` → `redraw()` stamps it.
  No select, move, rotate, scale, delete, or undo of an *existing* placement — confirmed against
  `controller-handoff-v3.md` § 4.1, which lists all of those as still open.
- **The Workshop panel band is already reserved for this.** Parent spec § 4.5: today's four colour
  cards ship with no tab bar specifically so "the sticker sub-project adds two real tabs and nothing
  reflows."
- **The persisted schema is already forward-compatible.** `sylly_controller`'s v1 read/write
  (`js/controller.js`) is tested against a payload carrying an untouched `"stickers":[1,2]` field
  alongside valid colours, asserting the colours still survive — see § 4 below for what that
  contract actually commits to.

### 2.2 What this spec adds

`js/lib/controller-sticker-surface.js` (the port of `sticker-surface.js`), a Stickers tab in the
Workshop panel, the full placement lifecycle, a sticker manifest + registry contract, and the
`stickers` field in persisted `ctlDesign`.

---

## 3. Scope

**In this spec:**
- The sticker inventory: manifest, runtime-cached loading contract, the three existing test images.
- Porting `sticker-surface.js` and both paint paths (shell rasteriser, ear flat-paste).
- The full placement lifecycle: place, select, relocate, rotate, scale, delete, undo.
- The Stickers tab UI, including selecting a placement from the book (not just from the 3D view).
- Persistence of placements, extending the existing `sylly_controller` v1 object.

**Explicitly deferred, unchanged from the parent spec's § 13:**
- **Textures and patterns** (the `redraw()` checker-pattern branch already half exists — a note for
  whoever picks that up next, not this pass).
- **Achievements and unlock gating.** Every sticker in this pass is free to everyone, same as every
  colour. The manifest schema reserves a field for this (§ 5) so the gating pass changes a default,
  not a shape — but the gating logic itself is not built here.
- **Player profiles / cross-device sync.** Placements persist to `localStorage` only, same ceiling
  the colour design already accepted.

---

## 4. Decisions

**D1 — Caching contract: packs-style, not art-style.** Manifest network-first, images cache-first,
no `sw.js` version bump to add a sticker. Chosen because the owner's own workflow for this content is
"adds more as they are drawn" — the same shape `data/packs/` and `data/music/` already exist to
serve, and the opposite of what `data/art/`'s precached-and-version-bumped contract is for (default,
app-versioned art). See § 5 for why the *file shape* is closer to `data/music/`'s flat manifest than
to `data/packs/`'s one-folder-per-item structure, even though the *caching behaviour* matches packs.

**D2 — One design, one placement.** A sticker `id` can be placed at most once across the whole
controller (shell + both ears combined). This is not a total-count cap — the practical ceiling is
just inventory size (3 today, an eventual ~1 per game as more are drawn). Enforced on both write
(the UI won't let an already-placed design be armed again) and read (a corrupted/hand-edited
`localStorage` value with a duplicate `id` keeps only the first occurrence on load).

**D3 — No unlock gating yet, but the schema reserves the field.** Every manifest entry carries
`unlocked: true` from day one. The achievement sub-project, whenever it lands, changes what sets that
field per-player; it does not need to migrate a schema that didn't anticipate it. Mirrors how
`ctlDesign`'s own persistence was already versioned before stickers existed.

**D4 — Workshop panel gains exactly two tabs: Colours and Stickers.** Not three. The placed-sticker
list lives *inside* the Stickers tab (as the book itself, showing placed vs. unplaced state) rather
than as a separate "Placed" tab — one surface to scan, not two.

**D5 — Both shell and ears get stickers in this pass.** The prototype's ear placement math
(UV-space, capped radius, side/bevel excluded) is already built and tested; porting it alongside the
shell path is not meaningfully more work than porting the shell path alone, and shipping ears bare
would leave the controller's most distinctive feature undecorated.

**D6 — Editing is tap-only; dragging the canvas always rotates the view, unchanged from today.**
Placing, selecting, and relocating a sticker are all the same gesture (a tap that resolves through
`SURF.plan()`), matching exactly what "place" already does in the prototype — relocating just
overwrites an existing entry instead of pushing a new one. This was chosen over true drag-to-move
specifically to avoid touching the click-vs-drag disambiguation logic `controller-handoff-v3.md`
§ 3.1 flags as fragile and asks to be read before touching. Rotate/scale reuse the prototype's
existing sliders, retargeted to whichever placement is currently armed or selected.

**D7 — The persisted-state contract does not bump `CTL_STATE_VERSION`.** The existing test in
`docs/superpowers/plans/2026-09-11-controller-integration.md` already loads a `"v":1"` payload
carrying an untouched `"stickers"` field and asserts the colours survive — that test is only
meaningful if the sticker sub-project adds its field to the *same* v1 object rather than bumping the
version, which would silently reset every existing player's saved colours (not just their stickers)
to factory defaults on next load. `ctlWriteDesign` starts serializing `stickers` alongside the four
colour fields; `ctlReadDesign` gains its own independently-validated read of that field, same
defensive shape as the hex validator.

---

## 5. Architecture — files and modules

### 5.1 New files

| File | Origin | Global | Cached |
|------|--------|--------|--------|
| `js/lib/controller-sticker-surface.js` | `docs/controller-prototype/sticker-surface.js`, wrapped | `window.StickerSurface` | precached (it's app code, like `controller-body.js`) |
| `data/stickers/manifest.json` | new | — | runtime, network-first |
| `data/stickers/*.png` | existing test images, moved into place | — | runtime, cache-first |

`sticker-surface.js`'s internals are unchanged — it already takes `U`/`ATLAS` as arguments and
touches no DOM, so wrapping it is the same shape as `controller-body.js`: `window.StickerSurface =
{ StickerSurface }`.

**Why a flat manifest, not a `data/packs/`-shaped folder-per-sticker + registry.json:** a pack
carries a full settings/word-list config; a sticker needs `id`/`label`/`image`/`unlocked` and
nothing else. `data/music/manifest.json`'s shape — one flat file — is the closer fit. The *caching
behaviour* (D1) still matches packs exactly; only the file structure is lighter, proportionate to
what a sticker actually is.

```json
{ "stickers": [
  { "id": "banana",   "label": "Banana",   "image": "banana.png",   "unlocked": true },
  { "id": "computer", "label": "Computer", "image": "computer.png", "unlocked": true },
  { "id": "pan",      "label": "Pan",      "image": "pan.png",      "unlocked": true }
] }
```

Loaded once via `ctlLoadStickerManifest()` (mirrors `Music.init()`'s manifest load), cached in a
module-level `ctlStickerManifest` array. `sw.js`'s existing fetch-handler split (network-first for
`.json` under `data/packs/`, cache-first for its images) gets one more matched prefix,
`data/stickers/`, rather than new logic.

### 5.2 `js/controller.js` additions

Prefix `ctl`, unchanged from the parent spec (verified free against all twenty game prefixes).

New state:

| Name | Purpose |
|------|---------|
| `ctlStickerManifest` | the loaded manifest array; `null` until `ctlLoadStickerManifest()` resolves |
| `ctlStickerImages` | `id → decoded Image`, populated lazily as each design is first drawn or armed |
| `ctlStickerSurface` | the lazily-built `StickerSurface` instance; `null` until the Stickers tab is first opened |
| `ctlStickerArmed` | the manifest `id` currently picked from the book but not yet placed, or `null` |
| `ctlStickerSelected` | index into `ctlDraft.stickers` of the currently-selected placement, or `-1` |
| `ctlStickerHistory` | in-memory undo stack (place/relocate/delete snapshots), Workshop-session-scoped — reset on open, discarded on close, exactly like `ctlDraft` itself never persists an unsaved edit |

New functions (names indicative, not binding):

| Function | Purpose |
|----------|---------|
| `ctlLoadStickerManifest()` | fetch + validate the manifest; total, never throws, same shape as `ctlReadDesign` |
| `ctlEnsureStickerSurface()` | idempotent lazy build of `ctlStickerSurface` from the existing body `geo.userData` — **only called on first Stickers-tab open**, so colour-only Workshop use never pays this cost (preserving the parent spec's explicit guarantee). **Must pass the caller-side config below** |
| `ctlArmSticker(id)` / `ctlDeselectSticker()` | book-tap handlers |
| `ctlPlaceOrRelocateSticker(x, y, back)` | shell tap handler — runs `SURF.plan()`, pushes a new entry or overwrites the selected one, pushes an undo snapshot first |
| `ctlPlaceOrRelocateEarSticker(uv)` | ear tap handler — the UV-space path, capped radius, side/bevel rejected |
| `ctlDeleteSelectedSticker()` | removes the selected entry, pushes an undo snapshot first |
| `ctlUndoSticker()` | pops the history stack |
| `ctlRenderStickerBook()` | repaints the book grid — placed vs. unplaced badge, armed/selected highlight |

**The placement/selection state machine (§ 7's Armed/Selected/Idle table) is written as pure
functions over a plain `{ stickers, armed, selected }` structure**, separate from the DOM-touching
render calls — the same separation `js/lib/physics.js` and `controller-body.js` already establish in
this codebase (pure logic, taking its inputs as arguments, callable and assertable under plain Node;
rendering as a thin layer on top). This is what makes the transition table in § 7 testable by
`tools/verify-controller-stickers.js` (§ 9) without a DOM at all.

### 5.2b The caller-side config — the part that is easy to lose in the port

**`sticker-surface.js` contains none of the tuned numbers.** Every keep-out is caller-supplied
(`const EXCL = opt.exclude || []`) and so is the distortion tolerance (`opt.maxDistort || 0.10`).
Porting the module alone and constructing it with `{}` compiles, runs, and is silently wrong:
stickers become placeable **inside the stick-well torus** (which is a ring standing on the deck —
anything painted inside shows straight through the hole) and on the **ear bosses**, and the
distortion tolerance drops from the tuned 0.14 to the module's stricter 0.10 default.

`ctlEnsureStickerSurface()` must construct it with exactly the prototype's call-site options
(`standalone.html:1691`), which are part of the port and belong in the new code as a named constant:

```js
const CTL_STICKER_OPT = {
  exclude: [{ x: -1.25, y:  0.20, r: 0.33, back: false },   // left stick well
            { x:  1.25, y: -0.85, r: 0.33, back: false },   // right stick well
            { x: -0.84, y:  0.84, r: 0.45, back: true  },   // left ear boss
            { x:  0.84, y:  0.84, r: 0.45, back: true  }],  // right ear boss
  maxDistort: 0.14,
};
```

**Grips are deliberately NOT a keep-out** — the prototype removed that at the owner's request
(handoff § 3.6) because it refused too many spots that felt placeable. Curvature alone governs
them. See § 12's measured note on what that actually means in practice.

`SURF.padPairs(4)` is likewise computed once at construction and used by `padEdges()`; it is what
stops a wrapped sticker reading as cut off along the crest, and must be carried across too.

**Measured build cost: 347 ms** on a desktop (2048 atlas, the options above) — the handoff § 4.2
asked for this to be re-measured before assuming it was still fine, and it has improved from the
~800 ms v2 recorded. It stays lazy regardless: a low-end phone is plausibly 3–5× that.

### 5.3 `redraw()` / ear-atlas additions

- **Shell**: after the existing shell/plate colour fill, for each `ctlDraft.stickers` entry with
  `surface:'shell'`, call the ported `stamp()` (via `ctlStickerSurface.makeChart` + the per-texel
  loop) — the prototype's real rasteriser, not the `stampFlat`/`OLD_WAY` debug path, which is not
  ported at all.
- **Ears**: for each entry with `surface:'earL'`/`'earR'`, the existing ear atlas redraw gains the
  prototype's flat `drawImage` + blurred-silhouette-lip pass, `lighten` compositing (not `lighter` —
  the prototype's own comment already documents why `lighter` blows out overlapping stickers).

---

## 6. Data model and persistence

Extends the existing `sylly_controller` v1 object (no version bump — see D7) with a new `stickers`
array:

```json
"stickers": [
  { "id": "banana", "surface": "shell", "x": 0.42, "y": -0.10, "back": false, "rot": 0.3, "size": 0.18, "chart": "tangent" },
  { "id": "pan",     "surface": "earL", "u": 0.5, "v": 0.6, "r": 0.2, "rot": 0.0 }
]
```

`surface` is `'shell' | 'earL' | 'earR'`. Shell entries carry the fields `SURF.plan()` already
returns (`x`, `y`, `back`, `size`, `chart`); ear entries carry the fields `dropEar()` already
produces (`u`, `v`, `r`).

**`chart` IS persisted, and the anchor is never re-derived on load.** This reverses an earlier draft
of this spec, which had `chart` re-derived by re-running `plan()` at load time. That is wrong, and
measurably so:

- `chart` is not metadata — both `makeChart(st)` and `boxes(st)` branch on `st.chart === 'rim'`, so
  it is load-bearing for rendering. It is a two-value enum; storing it costs nothing.
- **Re-running `plan()` moves the anchor, and the movement compounds.** `plan()`'s rim branch snaps a
  near-edge placement onto the crest (`ax = o[0] + o[2]*0.001`), and that snap is *not* exactly
  idempotent. Measured against the real geometry: of 7034 legal placements at r=0.18, 528 moved on a
  single re-plan (worst 2.95e-4 body units ≈ 0.13 atlas texels) — invisible once, but a saved design
  is re-planned on **every load**. Iterated 200 times, the worst case walks **5.75 atlas texels**,
  monotonically, at the body's widest point. A sticker that slowly creeps across the shell over
  months is close to undiagnosable after the fact.

So: validate the stored record, then use its `x`/`y`/`size`/`chart` **as-is**. `plan()` may still be
run as a pure legality *check* (guarding against a future `body.js` geometry change), but its
returned coordinates are discarded — only its `ok` flag is read.

**Load validation — total, never throws, same defensive shape `ctlReadDesign` already uses for
colours:**
1. Not an array, or an entry missing `id`/`surface` → drop the entry.
2. `id` not present in the loaded manifest → drop (a design removed from the manifest since the
   player placed it).
3. Non-finite numeric fields → drop.
4. A shell entry whose `chart` is neither `'rim'` nor `'tangent'` → drop (never guess it).
5. Duplicate `id` across entries → keep only the first occurrence (enforces D2 on read, not just on
   write — never trust that stored data obeys a rule the UI enforces).
6. A shell entry is passed through `SURF.plan(x, y, back, size)` **for its `ok` flag only** — a spot
   no longer legal (possible only if the body geometry changes in a future release) is dropped rather
   than rendered at an invalid position. **The returned `x`/`y`/`chart` are discarded**; see above.
7. An ear entry has `r` re-clamped to the ear's max, same as a fresh placement.

---

## 7. The Stickers tab — UI flow

Tab bar in the Workshop panel band (`.pill`/`pill-active-purple`, the same convention as the How-to
gallery tabs elsewhere in the suite): **Colours** (today's four cards, unchanged) and **Stickers**
(new).

**The book** is a grid, one tile per manifest entry — image, label, and a placed-badge on any tile
whose `id` is already in `ctlDraft.stickers`. A placed tile stays tappable: tapping it **selects**
that placement rather than re-arming it, which matters because a sticker on the shell's back face or
an ear might not be visible from the current camera angle — selecting from the book sidesteps having
to find it by sight or rotate to it first.

**Three states, one gesture throughout (tap — see D6). The book-tap rule is the same in every state,
so it's given once rather than per row: tapping an unplaced tile always goes to Armed on that design;
tapping a placed tile always goes to Selected on that placement — except tapping the tile that is
*already* the current Armed/Selected one, which deselects back to Idle instead. This means a book tap
can freely interrupt an in-progress Arm or Selection to jump to a different design with no dead
states.**

| State | Entered by | Tapping the controller |
|---|---|---|
| **Idle** | default; Done; Delete | selects a hit placement, else no-op |
| **Armed** (picked, not yet placed) | tapping an unplaced tile | legal spot → places it, becomes **Selected**; illegal → refusal message, stays Armed |
| **Selected** (an existing placement) | just placed, or tapping a placed tile/hit | legal spot → relocates it, stays Selected; illegal → refusal message, no change |

While Armed or Selected, the panel shows the prototype's existing rotate/size sliders (retargeted:
writing into the pending placement or the selected entry), a **Delete** button (Selected only), and a
**Done** button that deselects to Idle. **Undo** appears whenever `ctlStickerHistory` has an entry to
pop.

Legality refusals reuse the prototype's exact `REFUSAL` message set (off the edge / stick rings & the
bosses behind the ears / too tight an edge to wrap / too curved here) — no new copy.

---

## 8. PWA

`PRECACHE_URLS` gains `js/lib/controller-sticker-surface.js`. `CACHE_NAME` bumps.

`data/stickers/manifest.json` and its images are **not** precached — see D1. `sw.js`'s fetch handler
gains `data/stickers/` as a matched prefix for the existing packs-style network-first-json/
cache-first-image split; no new branch of logic, one more prefix on the existing one.

---

## 9. Verification

### 9.1 New harness — `tools/verify-controller-stickers.js`

Pure, Node-runnable (loads `three.min.js` + `controller-body.js` + `controller-sticker-surface.js`
the same way `verify-controller-body.js` already does). Asserts:

- **Manifest validation** — malformed/missing fields resolve to a dropped entry, never a throw.
- **Persistence round-trip** — a saved `stickers` array reads back identically; the colours-survive-
  alongside-stickers test (§ 4, D7) stays green with the field now actually read.
- **D2 enforcement on load** — a duplicate `id` in stored data keeps only the first occurrence.
- **Placement legality** — `SURF.plan()` results match known-good/known-bad spots the parent
  `sticker-surface.js` already exercises informally in the prototype (off-edge, stick-ring, tight-
  edge all refuse; a normal flat spot and a gentle-edge wrap both succeed).
- **The keep-outs are actually wired** (§ 5.2b) — a placement at each of the four excluded centres
  refuses with `reason: 'ring'`. This is the assertion that catches a port constructed with `{}`,
  which is otherwise silent.
- **Load round-trip is bit-stable** — a saved placement, put through the load path repeatedly
  (≥200 iterations), returns byte-identical `x`/`y`/`size`/`chart` every time. Guards § 6's
  no-re-derivation rule directly; a regression here is the slow-creep bug, which is close to
  undiagnosable in the wild.
- **`chart` is honoured, not guessed** — a stored `chart: 'rim'` still routes through the rim branch
  of `makeChart`/`boxes` after a load round-trip.
- **The state machine** (§ 7's table) as pure functions — every Idle/Armed/Selected transition, since
  § 5.2 specifically separates this logic from DOM rendering to make it testable here.
- **Undo** — push/pop parity across place, relocate, and delete.

### 9.2 `visual-check`

The Stickers tab at 390 px: book grid touch targets ≥ 44 px, the tab bar's geometry against the
existing Colours tab, the rotate/size sliders and Delete/Done/Undo row when a sticker is Armed or
Selected.

### 9.3 Manual

Real phone: place a sticker wrapped over an edge, place one flat on an ear, select one that's out of
current camera view via the book, relocate it, delete it, undo. Save, reload, confirm every placement
survives. Offline install from cold — confirm the manifest/images that were fetched online are still
available; confirm a design never fetched simply doesn't appear (not an error).

### 9.4 Regression

`node tools/verify-controller-body.js` and `verify-controller-state.js` stay green (D7's colours-
survive contract is exactly what the latter already tests). `node tools/verify-mp-configs.js` and
`verify-identity-docs.js` are unaffected but re-run.

**No new assertions for presentation** — the tab-bar layout, book grid, and slider positions are
`visual-check`'s job, per `CLAUDE.md`'s harness rule.

---

## 10. Documentation obligations

Per the Documentation Integrity Protocol, in order:

1. **`docs/code-map.md`** — the Stickers tab's ids, the new `ctl*` state and functions (§ 5.2), and
   the § 3D Controller / Workshop section's file table gaining `controller-sticker-surface.js`.
2. **Identity docs** — none. No game is touched.
3. **`CLAUDE.md`** — SW version entry in Current Focus (outgoing entry moved verbatim to
   `docs/sw-changelog.md` first).
4. **`logic-engine.md`** — `controller-sticker-surface.js` added to the Shared Library Modules table
   alongside `controller-body.js`.
5. **`docs/implementation-notes/shared-implementation-notes.md`** — root cause lives in engine/lib
   code, not a game, so this file.
6. **`docs/decision-log.md`** — one entry: the sticker sub-project ships, with D1–D7 summarised as a
   pointer back to this spec.

---

## 11. Out of scope (unchanged from the parent spec's § 13, restated for this pass's own boundary)

- **Textures and patterns.**
- **Achievements and unlock gating** — the `unlocked` field is reserved (D3); the gating logic is
  not built.
- **Player profiles / cross-device sync.**
- **A sticker-count cap as a number** — superseded by D2; there is no total cap to pick.

---

## 12. Measured behaviour of the limits — seam, grips, ears, and legibility

All numbers below were measured against the real geometry under Node (`buildBody` +
`sticker-surface.js` with § 5.2b's options), not estimated. They exist because the owner flagged the
seam, the grips and the area around the ears as "slightly problematic" in the prototype, and because
none of it can be settled by looking at the code.

### 12.1 The `curve` refusal never fires at the tuned tolerance

`maxDistort: 0.14`, but the **highest distortion measured anywhere on the body** is:

| sticker radius | median | p99 | max | spots refused at 0.14 |
|---|---|---|---|---|
| 0.18 | 0.0029 | 0.0356 | **0.0425** | 0 |
| 0.28 | 0.0076 | 0.0671 | **0.0864** | 0 |

So "the curvature test alone decides" for the grips (handoff § 3.6) is, in practice, **nothing
refuses**. The tolerance would have to come down to about **0.05** before it began to bite (at
r=0.28: 0.05 refuses 3.7% of flat placements, 0.06 refuses 1.7%, 0.08 refuses 0.24%; at r=0.18,
nothing is refused until ~0.04).

This is not a bug — the distortion genuinely is mild — but it means `maxDistort` is currently an
inert dial, and it is the **only** lever for the grip/ear distortion the owner is watching for.
Ship at 0.14 (preserving reviewed prototype behaviour); if visual review says the worst spots are
too warped, 0.05–0.06 is the useful range, and the table above says what it costs.

### 12.2 Where the distortion actually is — it matches the "around the ears" report

The worst spots are not spread evenly. At both radii the top of the distribution sits at
**y ≈ 0.57–0.78 on the back sheet** — an annulus immediately *outside* the `r=0.45` ear-boss
keep-outs, plus the saddle between the two bosses. Worst measured spots at r=0.28: `(-0.41, 0.64)`
0.0864, `(1.34, 0.61)` 0.0862, `(1.27, 0.64)` 0.0861.

The keep-out covers the boss dome itself; the skirt around it carries the sharpest curvature left on
the body. This is the concrete, located version of "around the ears was problematic" — worth
pointing a real-device check at first (§ 9.3).

### 12.3 The seam is `edge` refusals working as designed

`edge` refusals scale with sticker size — 400 → 946 → 2066 as radius goes 0.10 → 0.18 → 0.28. That
is `plan()` refusing a sticker that reaches the crest but cannot wrap cleanly, which the handoff
(§ 3.2) records as the deliberate fix for stickers being cut in half along the seam. The existing
refusal copy already tells the player what to do ("Too tight an edge to wrap around — try a smaller
sticker or move in a bit"). No change proposed; noted so it is not re-diagnosed as a bug.

### 12.4 Legibility — the open issue, and the biggest one

**Six of the twenty shell colours make the current test art effectively invisible.** All three test
stickers are near-white dominant (18–32% of their opaque pixels are ≈`rgb(240,240,239)`). Measured
WCAG contrast of each sticker's dominant band against each shell:

| sticker | worst shells | contrast |
|---|---|---|
| `banana` | FRT `#FFE500` | **1.06:1** |
| `computer` | FRT, CLD `#8ECAE6`, FLW `#F9A8D4` | **1.04–1.16:1** |
| `pan` | COMB `#F0A500`, YGI `#F59E0B` | **1.01–1.06:1** |

1.0:1 is literally the same colour. The affected shells are FRT, CLD, FLW, GTH, COMB and YGI — all
of them light, all freely selectable.

**The bump map does not rescue this.** In `stamp()`, `if (al <= 0.004) continue;` means the lip ramp
exists only *inside* the sticker's own alpha — there is no outward halo. On a matching shell the
result is a faint relief outline (at the deliberately subtle `bumpScale: 0.035`) around a flat blank
plateau where the artwork should be: shape visible at favourable light angles, image illegible.

**Recommended fix — an adaptive die-cut border.** Real vinyl stickers have one, so it is thematically
right as well as functional:
- In `stamp()`, compute the ring average `hgt` *before* the alpha early-out. Where `al` is low but
  `hgt > 0`, the texel is in the band just outside the artwork — paint the border there.
- Choose the border colour **per texel** from the atlas pixel already underneath (`D[o]`): light
  shell → dark border, dark shell → light border. Per-texel handles a sticker straddling the
  faceplate automatically, and because a recolour triggers a full `redraw()` that re-stamps every
  sticker, borders re-derive against the new shell colour for free.
- **Inset the art sampling** by the border width rather than requiring artwork to carry a
  transparent margin. Measured: all three test stickers are **full-bleed — zero transparent margin
  on all four edges** — so a border drawn within the existing `[-R, R]` square would clip. Insetting
  makes the border unconditional and needs no authoring discipline for future stickers.

This is the one item in this spec still open to the owner's judgement: it is a visible aesthetic
change (every sticker gains an outline), so it is called out rather than assumed.

---

## 13. Risks

| Risk | Mitigation |
|------|-----------|
| `StickerSurface`'s build cost regresses Workshop-open time if triggered eagerly | Built lazily, only on first Stickers-tab open (§ 5.2). **Re-measured at 347 ms** (§ 5.2b), down from the ~800 ms the handoff recorded — but it stays lazy, since a low-end phone is plausibly 3–5× that |
| The shell rasteriser (`stamp()`/`makeChart`) has never been ported or seen outside the prototype in this app's real DOM/WebGL context | `verify-controller-stickers.js` pins the pure legality/chart logic under Node before any rendering is trusted; `visual-check` and a real-device pass (§ 9.3) catch anything the pure layer can't |
| A future body-geometry change could silently orphan saved placements | § 6's load-time legality check via `SURF.plan()` drops anything no longer legal — reading its `ok` flag only, never its coordinates |
| **Porting the module without its caller-side config** — it compiles and runs while silently losing every keep-out, letting stickers paint inside the stick-well hole | § 5.2b makes the config a named constant that is part of the port, and § 9.1 asserts the four keep-out zones actually refuse |
| **Re-deriving the anchor on load walks saved stickers across the shell** — measured at 5.75 atlas texels over 200 loads | § 6 persists `chart` and uses stored coordinates as-is; § 9.1 asserts a load round-trip is bit-stable over many iterations |
| **Light stickers are invisible on 6 of the 20 shell colours** (down to 1.01:1), and the bump map does not rescue it | § 12.4 — adaptive die-cut border with inset art sampling. **Open to owner judgement**, since it changes how every sticker looks |
| Bumping `CTL_STATE_VERSION` by habit (it's the obvious-looking move when adding a field) would reset every player's saved colours | Called out explicitly as D7, with the exact existing test that would catch it named |
