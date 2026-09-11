# Design — Controller integration part 2: stickers

**Date:** 11 Sep 2026
**Status:** Draft — pending owner + implementation review
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
| `ctlEnsureStickerSurface()` | idempotent lazy build of `ctlStickerSurface` from the existing body `geo.userData` — **only called on first Stickers-tab open**, so colour-only Workshop use never pays this cost (preserving the parent spec's explicit guarantee) |
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
  { "id": "banana", "surface": "shell", "x": 0.42, "y": -0.10, "back": false, "rot": 0.3, "size": 0.18 },
  { "id": "pan",     "surface": "earL", "u": 0.5, "v": 0.6, "r": 0.2, "rot": 0.0 }
]
```

`surface` is `'shell' | 'earL' | 'earR'`. Shell entries carry the fields `SURF.plan()` already
returns (`x`, `y`, `back`, `size` — `chart` is **not** persisted, it's re-derived on load); ear
entries carry the fields `dropEar()` already produces (`u`, `v`, `r`).

**Load validation — total, never throws, same defensive shape `ctlReadDesign` already uses for
colours:**
1. Not an array, or an entry missing `id`/`surface` → drop the entry.
2. `id` not present in the loaded manifest → drop (a design removed from the manifest since the
   player placed it).
3. Non-finite numeric fields → drop.
4. Duplicate `id` across entries → keep only the first occurrence (enforces D2 on read, not just on
   write — never trust that stored data obeys a rule the UI enforces).
5. A `surface:'shell'` entry is re-run through `SURF.plan(x, y, back, size)` on load. A spot that's
   no longer legal (only possible if the body geometry itself changes in a future release) is
   dropped rather than rendered at a stale/invalid position. This also re-derives `chart`, which is
   why it isn't stored.
6. An ear entry has `r` re-clamped to the ear's max, same as a fresh placement.

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
  edge, over-curved all refuse; a normal flat spot and a gentle-edge wrap both succeed).
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

## 12. Risks

| Risk | Mitigation |
|------|-----------|
| `StickerSurface`'s ~0.8s build cost (handoff-flagged for re-measurement) regresses Workshop-open time if triggered eagerly | Built lazily, only on first Stickers-tab open (§ 5.2) — colour-only use is unaffected, and the number is re-measured during implementation per the handoff's own ask |
| The shell rasteriser (`stamp()`/`makeChart`) has never been ported or seen outside the prototype in this app's real DOM/WebGL context | `verify-controller-stickers.js` pins the pure legality/chart logic under Node before any rendering is trusted; `visual-check` and a real-device pass (§ 9.3) catch anything the pure layer can't |
| A future body-geometry change could silently orphan saved placements | § 6's load-time re-validation via `SURF.plan()` drops anything no longer legal rather than rendering it wrong or crashing |
| Bumping `CTL_STATE_VERSION` by habit (it's the obvious-looking move when adding a field) would reset every player's saved colours | Called out explicitly as D7, with the exact existing test that would catch it named |
