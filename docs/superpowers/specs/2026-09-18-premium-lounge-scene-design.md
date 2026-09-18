# Design — Premium: the cinematic lounge scene

**Date:** 18 Sep 2026 · **Status:** built as greybox (`wip/premium/`), owner-reviewed 19 Sep 2026 — **amended by `2026-09-19-premium-lounge-reblock-design.md`** (overrides §§ 3, 6, 7.1, 7.2, 7.6, § 12 framing) —
`wip/premium/OWNER-REVIEW.md` · **Tier:** 2 (architectural)
**Supersedes:** `wip/premium/premium-nanobanana-brief.md` § 6 (the six containers) and § 7 (the
"twenty readable games" tension) — Premium no longer selects games. §§ 1–4, 8–12 of that brief
still apply and are not repeated here.
**Context:** `docs/lobby-redesign-brief.md` (the four lobby layouts) ·
`wip/lobby-lab/OWNER-REVIEW.md` § 6 (Premium slot decided, built after TV mode) ·
`docs/superpowers/specs/2026-09-11-controller-integration-design.md` (the shipped 3D controller,
this scene's hero prop) · `docs/cost-envelope.md` (what a scene may cost)
**Visual references (not repo-readable by a fresh session — open the files):**
`wip/premium/LSG-premium layout-180926-014238.pdf` (the owner's 23-page board),
`wip/premium/Gemini_Generated_Image_*.jpg` (composition, the TV/jukebox/controller family, the
prop sheet, the lamp).

---

## 1. What Premium is

**You are a guest in Little Sylly's lounge room on game night.** Premium is the fourth lobby
layout (Premium ✨ · Shelves 🗂️ · TV 🖥️ · Original), and it is the only one that is *not* a
game selector. It is a hub. The room's objects are the doors:

| Door | Leads to |
|---|---|
| The **TV** | TV mode (the widescreen layout, `wip/tv-mode-design/`) |
| The **phone** on the table | Shelves (the mobile layout) |
| The **controller** on the couch arm | The Workshop (`ctlOpenWorkshop`) |
| The **cartridge dial** | TV mode with one game already selected (Random Game made physical) |
| The **jukebox** | The sound overlay; its record flips background tracks |

Everything else is flavour that moves when touched (the lamp, the stickerbook) or does not move
at all (the bookshelf, the trinkets, the furniture). **Nothing is selected in the room**, with the
single deliberate exception of the dial, which hands *one random game* to TV mode — the same job
the suite's existing Random Game button does, made into an object.

**Whose room it is** is decided: Sylly's, and the player is visiting. The trinkets are the
studio's, the controller is the player's and has been handed to them. Player achievements do
not exist yet; when they do, they live in the **stickerbook** (§ 7.7 — earned stickers, which the
Workshop then lets you put on the controller), never on the shelf.

### 1.1 Not this spec

- **Scene B** (a portrait composition for phones) — designed in § 12, built in its own round.
- **The stickerbook feature / achievements** — the binder's `openStickerbook()` callback is the
  door (§ 7.7) and the shelf's slot list is a secondary hook (§ 7.9); neither feature is built.
- **Production wiring** into `src/screens/lobby.html`, `sw.js` and the layout switcher — a
  later round, after the sandbox has been seen. This spec builds under `wip/premium/` only.
- **Depth-of-field, bloom or any post-processing pass** — Three's example passes are not
  vendored, and vendoring them is a cost-envelope conversation this scene does not need to open.

---

## 2. Decisions locked in the brainstorm (18 Sep 2026)

| # | Decision | Chosen over |
|---|---|---|
| D1 | **Fully procedural.** Room shell *and* props are Three.js primitives with PBR materials; surface pattern (wood grain, wallpaper, rug weave) is drawn by 2D canvas code at mount and used as tiled textures. No model files, no painted image assets. | A baked backdrop plate + 3D props (camera frozen, shelf can't be dynamic, ~1 MB re-rendered on every room change); layered parallax plates (every layer an authored cut-out, still no push-in). |
| D2 | **Per-element escape hatch, never a per-scene one.** Any single object that will not read (candidates: the couch, the lamp's brass cage at distance, the wallpaper) may become a plane carrying a pre-rendered PNG, runtime-cached like `data/stickers/`. The camera, the lighting and every other object are unaffected. | Deciding "plate vs procedural" for the whole room up front. |
| D3 | **Retro direction, in the controller's material language.** Pastel CRT with two dials, cassette-era flip phone, a jukebox with a record, a cartridge caddy. No flat panel, no soundbar. The TV keeps a CRT *silhouette* but the family's *materials*: the same matte soft-touch shell, the same bevel radius, dials that are the controller's candy buttons at ~3×, ears from `buildEars` scaled up and stood upright. | The eared flat panel showing the Shelves UI (page 22 of the board): modern-toy rather than retro, and a legible UI on the screen invites taps the scene cannot honour. |
| D4 | **The dial is Random Game made physical.** Idle drift like the TV-mode rail; tap → ~1.8 s ease-out spin → one cartridge rises → push-in to the TV → TV mode opens on that game. | Decoration only (tap = go to TV, nothing selected); a real flick-through browser (a fourth game-selection layout competing with TV mode's rail). |
| D5 | **Widescreen only for v1**, with the honest "wants a bigger screen" card below the floor. Scene B is designed now (§ 12) so the room can host it, and tracked in `docs/deferred-work.md` so it is not forgotten. | Building the portrait composition before the room has been seen once. |
| D6 | **TV and jukebox inherit the player's controller design** — `{ shell, plate, ears, buttons }` read live from `sylly_controller` — and each has its own distinct ears. The dial and the phone take the palette too; furniture, binder and lamp stay fixed warm neutrals. | Monochrome props (rejected in the review: the controller must never render monochrome). |
| D7 | **The dial's neon is gone.** One soft warm ring, emissive in the player's `buttons` colour at low intensity, is all that remains of the RGB under-glow. Generic cartridges with the games' die-cut stickers as labels — no Nintendo Switch branding. | The prop-sheet render as drawn. |
| D8 | **The lamp's panels are the nine Sylly mood portraits, loaded from a manifest** (§ 7.6) so the set can be swapped later with a folder drop. Runtime-cached, zero install delta. | Canvas-drawn placeholder polaroids; a hard-coded file list. |
| D9 | **The stickerbook is the soft-yellow quilted binder holding stickers, with a dormant door.** Prop-only in v1 (cover flips), but its `openStickerbook()` callback is in the host contract now, because it is the planned door to the stickerbook feature (collection + record + progress + achievements; earned stickers customise the controller). | Chocolate brown, discs, and "a prop, not a door" with no seam for later. |

---

## 3. The stage

### 3.1 Composition

One fixed camera, 16:9, ~35° vertical FOV, eye height a little above the coffee table, looking
at the TV wall. The brief's three planes hold, and the brief's "corner" cure (§ 7) is applied:
the table props sit large in the lower two-thirds and the room recedes behind them.

| Plane | Contents | Treatment |
|---|---|---|
| **Back** | Wall with arch wallpaper, TV bench with the cassette deck, **TV**, **jukebox** on the bench beside it, bookshelf with books + trinket slots, side table with the **photo-carousel lamp**, floor lamp, curtain + window, two small framed prints | Lower-contrast materials + fog; recognisable, never the focus |
| **Mid** | Coffee table on the rug: **dial**, **stickerbook binder**, **phone** | Sharp, key-lit, where the eye lands |
| **Front** | The **controller** on the couch arm, bottom-left, partly out of frame | Near and soft; it reads as *yours*, within reach — never centred, never hero |

### 3.2 Light is the mood

The geometry is only what the light lands on. Three *visible* sources do the atmospheric work,
each with a real light behind it:

| Source | Light | What it does |
|---|---|---|
| The floor lamp (upper left, warm) | The one shadow-casting light, a `SpotLight` at the shade's position, warm (~2700 K feel), PCF soft shadows | Pools warm light on the wall and side table; every prop's contact shadow on the rug |
| The window behind the curtain (right, cool) | A cool `HemisphereLight` (sky cool, ground warm), no shadow | The blue-grey fill from the brief's lighting brief |
| The TV screen | A small `PointLight`/`RectAreaLight`-like emitter tinted by the attract screen | Blue-green spill on the bench and the jukebox |
| The dial's ring, the lamp bulb | Emissive materials + a faint point light each | "Things are on" |

Plus: `ACESFilmicToneMapping` (already the controller's setting), a scene `Fog` from mid-plane to
back wall, a CSS vignette over the canvas, and — new to this codebase — a **procedural
environment map**: a handful of emissive planes (warm above-left, cool right, dark floor) rendered
once through `THREE.PMREMGenerator` (built into r128) and set as `scene.environment`. The
controller has no env map; that is the likeliest reason its matte plastic reads flat in the
Workshop, and it is the cheapest single upgrade this scene makes. Zero assets.

### 3.3 The honest look

A rendered plate would look richer on day one — an offline render bakes global illumination.
The procedural room will look like a **well-lit toy diorama**: moulded pastel plastic, birch,
warm lamp, soft shadows. That *is* the brand (the brief's Animal Crossing / Astro's Playroom
touchstones), not the photoreal Gemini look. Judge the greybox against § 12 of the brief (frozen
test, ninety seconds, same family), not against the JPEGs.

---

## 4. Build approach — how far primitives go

**"Fully procedural" means every object is described by code**: a rounded-rectangle `Shape`
extruded with a bevel, a `CylinderGeometry`, a `LatheGeometry`, a `PlaneGeometry`. The shipped
lampshade (`wip/premium/lampshade-hero.html`) is exactly this — eight cylinders, two tori, two
planes, one extrude — and it looks right.

**Why the controller was hard, and why that does not apply here.** Two things cost the effort
in `controller-body.js`: an *organic* silhouette (a hand-drawn bezier outline extruded with
bevels, with three non-obvious rotation/curvature bugs) and *mapping stickers onto that curved
surface* (`controller-sticker-surface.js`). Both are done and reused as-is — the scene mounts
the shipped geometry. Every other object in this room is boxy or turned.

**The one helper that makes ~80% of the props:**

```
prmMoulded(THREE, w, h, d, r, opt) → BufferGeometry
  rounded-rect Shape(w, h, r) → ExtrudeGeometry(depth d, bevel on, bevelSize ≈ r/3)
  → ControllerBody.smoothNormals(geo, 35°) → centred
```

with the controller's shell material (`MeshStandardMaterial`, roughness ~.52, metalness ~.06)
on top. A CRT, a bench, a drawer front, a binder, a phone half, a rug and a couch arm are all
this call at different numbers.

**Canvas textures, not image files.** Wood grain, the arch wallpaper, the rug's weave and the
couch's boucle are each a 256–1024 px canvas drawn once by a small function at mount, wrapped in
a `CanvasTexture` with `RepeatWrapping`. Where it helps, the same canvas feeds a `roughnessMap`
or `bumpMap`. Change a wall colour → re-run one function. The TV's attract screen (§ 8) is the
same mechanism, animated.

**The escape hatch is per element (D2).** A prop or a room element that will not read becomes a
`PlaneGeometry` with a PNG (`wip/premium/plates/<id>.png` in the sandbox; `data/lounge/` and
runtime-cached in production). It keeps its world position, so the camera, Scene B and picking
are unaffected. The decision is taken in the polish pass, per object, with the real lighting on
— never pre-emptively.

---

## 5. Files and module boundaries (sandbox)

All under `wip/premium/`. Naming prefix **`prm`** (checked against the 20 plugin prefixes in
`definitions.md` and `ctl`/`lg`/`lb`/`sm` — no collision).

| File | Owns | Depends on |
|---|---|---|
| `index.html` | The sandbox page: canvas, HUD layer, the honest card, wiring of the five host callbacks (§ 9.3) to sandbox stubs | `../../js/lib/three.min.js`, `../../js/lib/controller-body.js`, `../lobby-lab/games.js` (the verified 20-game table), the four files below |
| `prm-lib.js` | The moulded-plastic helper (`moulded`/`extrude`/`roundedRect`), the canvas-drawn surface patterns (`tex.*`), the shared material set (`mats.*`), `role()` and `prmApplyDesign` (§ 10) | `THREE`, an injected canvas factory, `ControllerBody.smoothNormals` |
| `prm-room.js` | The room shell (§ 6): walls, floor, rug, furniture, curtain, floor lamp, prints. Fixed neutrals; nothing in it is a pick target | `prm-lib.js` |
| `prm-props.js` | One builder per prop: `prmBuildTV`, `prmBuildJukebox`, `prmBuildDial`, `prmBuildPhone`, `prmBuildBinder`, `prmBuildLamp`, `prmBuildShelf`, `prmBuildController`, plus the action/placement data (`PRM_ACTIONS`, `PRM_PLACES`, `PRM_TAB_ORDER`) and the attract-screen drawer. **Pure: each builder is `prmBuildX(lib, …data) → Group`, where `lib` carries `THREE`, the moulded helper, the canvas textures and the material set, injected by the scene (or by the harness)** — touches no DOM, reads no globals, returns a `Group` with named children and an `api` for its animations | `prm-lib.js`, `ControllerBody.smoothNormals` / `buildEars` |
| `prm-scene.js` | Renderer, lights, env map, fog, camera rig + presets, picking, the render-on-demand loop, the motion contract (§ 11), the host contract (§ 9.3), design read/re-read (§ 10) | `THREE`, `ControllerBody`, `prm-lib.js`, `prm-room.js`, `prm-props.js` |
| `prm-hud.css` | The 2D chrome: heading, keycap, switcher, the honest card, the vignette | — (handed to Claude Design, § 16) |
| `verify-prm-props.js` | Node harness (§ 14) | `three.min.js` under Node, the same shim as `tools/verify-controller-body.js` |

**Boundary rule:** `prm-props.js` never knows what a tap *does*. It exposes `group.userData.prmId`
and an `api` (`spin()`, `rise(i)`, `openCover()`, `flick(v)`, `setLabel(text)`); `prm-scene.js`
maps ids to actions and calls the host callbacks. That is what lets the harness drive every
builder without a DOM and what keeps production routing out of the scene.

---

## 6. The room shell

Every element is geometry; every patterned surface is a canvas texture. Colours are the brief's
palette (warm off-white `#FAFAF9` ground, peach-cream wall, pale birch, plum ink for anything
printed) and are **never the player's colours** — the room is neutral so the props pop.

| Element | Geometry | Surface / mood |
|---|---|---|
| Walls | Two boxes meeting in the back-left corner; a skirting board and a cornice (thin boxes) for scale | Peach-cream; the board's arch wallpaper as a low-contrast tiled canvas (two tones of the wall colour, ~4% contrast); the lamp's pool and the TV's spill land here |
| Floor | One plane | Canvas planks: pale birch, slight per-plank hue variation, fine grain lines; the same canvas as a `roughnessMap` so boards catch the lamp |
| Rug | `prmMoulded` flat box + a slightly darker rounded edge | Off-white; canvas cross-hatch weave as a `bumpMap`; **`receiveShadow`** — every table prop's contact shadow lands here, which is where "things have weight" comes from |
| Coffee table | Rounded top + four rounded legs | Birch material (shared) |
| TV bench | Rounded box, two inset drawer fronts, cylinder knobs, short legs; the cassette deck is a fixed prop on its shelf (rounded box, cream, a few thin boxes for buttons) | Birch; the deck says "cassette era" without a door |
| Bookshelf | Sides, three shelves, back panel (boxes) | A row of leaning books (thin boxes in *muted* brand tones, a few tilted) fills it with colour cheaply; the top shelf holds the trinket slots (§ 7.9) |
| Side table | Cylinder top, three angled cylinder legs (the board's render) | Birch; carries the photo-carousel lamp |
| Couch arm (front plane) | One large `prmMoulded` box, partly out of frame, bottom-left | High-roughness fabric, canvas boucle bump, deliberately soft and dark at the edge; carries the controller |
| Curtain + window | A sine-wave profile `Shape` extruded vertically; an emissive plane behind it | Cream, slightly translucent (`transparent`, opacity ~.9); the visual source of the cool fill |
| Floor lamp | Cylinder stand, open-ended cone shade (`CylinderGeometry` open), emissive inner face | The visual source of the warm key |
| Framed prints ×2 | Box frames + a plane each with a canvas-drawn pastel abstract | On the shelf wall, like the renders |

---

## 7. The props

Each prop: geometry, colour mapping (§ 10), idle, hover, activate, reduced-motion behaviour.
Hover is universal — the group lifts ~3 mm over 150 ms ease-out (transform only), cursor
`pointer`, and a keyboard focus outline drawn in the HUD layer over the prop's projected bounds.

### 7.1 TV (CRT with ears) — the door to TV mode

- **Geometry.** Deep `prmMoulded` body (shell); a chamfered front bezel (plate) with a large
  rounded window; the **screen** is a shallow spherical section (a `SphereGeometry` with narrow
  `phiLength`/`thetaLength`, large radius) so it curves like glass; a right-hand control strip holding
  **two dials** (short `CylinderGeometry` + a torus rim, the controller's button material);
  a speaker grille (thin horizontal boxes); **ears** = `ControllerBody.buildEars` geometry
  cloned, scaled ~1.6×, rotated upright as bunny ears; four short feet.
- **Screen.** A `CanvasTexture` from the attract loop (§ 8) on an emissive material, plus a
  second, slightly larger additive plane at low opacity for a cheap bloom.
- **Idle.** Attract loop runs; the screen's light flickers by ±5% very slowly.
- **Activate (screen).** Push-in (§ 11) → `enterTV(null)`.
- **Activate (channel dial).** Turns 30° with a click → `openSwitcher()`.
- **Activate (volume dial).** Turns 30° → `openSound()`.
- **Reduced motion.** Attract loop shows one static frame; push-in is a fade cut.

### 7.2 Jukebox — the sound door, and a real jukebox

- **Geometry.** Arched cabinet: a `Shape` (rounded rectangle whose top edge is a semicircle)
  extruded (shell); an inset front panel (plate) carrying a horizontal grille, two knobs and
  four small candy buttons in a diamond (buttons — the controller's face-button colours are
  *not* copied; all four take the design's `buttons` colour); a **record**: a flat black
  cylinder with a label disc in the plate colour and a canvas-drawn title; a small brass
  antenna with an emissive bead; **ears** = a rounder, shorter ellipse than the TV's, angled
  outward ~25° — distinct at a glance.
- **Idle.** While `Music` reports a track, the record turns at ~33 rpm; the label reads
  `Music.nowPlaying().title` (or the game's name when title is `null`), redrawn on change.
- **Activate (knob).** `openSound()`.
- **Activate (record).** Next track: the scene keeps the `Music` manifest's track keys in game
  order and calls `Music.playFor(nextKey)`; the label updates. In the sandbox `Music` is
  stubbed; in production this rides the existing module — no new audio surface, no new overlay.
- **Reduced motion.** The record does not turn; label still updates.

### 7.3 The dial — Random Game made physical

- **Geometry.** Base `CylinderGeometry` (shell) with a raised top plate (plate) and a wedge
  housing on one side (a `Shape` extrude) holding a small canvas "display"; a central boss with
  the studio star; **20 cartridge slots** on a ring; each **cartridge** a small `prmMoulded` box
  in that game's `brandHex` with the game's sticker PNG (`data/stickers/<id>.png`, runtime-cached)
  on a white label plane; one **ring** (`TorusGeometry`, emissive `buttons` at intensity ~.35,
  `transparent`) under the rim. No ears. No ports, no vents, no RGB.
- **Idle.** Rotates at the TV-mode rail's drift feel (~4°/s), pausing on hover and for ~2 s
  after any interaction, then easing back.
- **Activate.** `spin()`: 1800 ms ease-out cubic to a game drawn uniformly from all 20 (the
  sandbox has no filters), the winning cartridge `rise(i)` 12 mm with a 200 ms overshoot, the
  display shows its name, a `playWhoosh`-class cue in production; then the camera pushes into the
  TV (§ 11) and `enterTV(gameId)`. A second tap during the spin is ignored (guarded flag — the
  rail's own lesson).
- **Reduced motion.** No drift; a tap shows the result instantly with the cartridge already
  risen for 600 ms, then a fade cut.

### 7.4 Phone (flip, cassette-era) — the door to Shelves

- **Geometry.** Two `prmMoulded` halves on a hinge cylinder, open ~110°; a small emissive screen
  plane (canvas: the Shelves wordmark, faint) and a keypad grid of tiny boxes (buttons). Body =
  shell, screen surround = plate.
- **Idle.** Screen glows faintly and pulses ±3% every ~4 s.
- **Activate.** Fade → `enterShelves()`. No push-in: the phone is small and a camera dive into
  it reads as a joke the second time.

### 7.5 Controller — the player's, already built

- **Geometry.** `ControllerBody.buildBody/buildControls/buildEars/buildShoulder` exactly as
  `js/controller.js` mounts them; the scene calls the same construction path with the same
  design so it is pixel-consistent with the lobby ornament and the Workshop. Stickers render
  through the same atlas path (`ctlStampShell`) — **never monochrome** — in **production**. The sandbox mounts the shipped geometry with the design's four flat colours (no plate outline, no stickers), because the atlas painter lives in `js/controller.js` and is wired in the production round.
- **Placement.** Resting on the couch arm, bottom-left, ~30% out of frame, yaw ~-20°.
- **Idle.** None beyond the ornament's existing behaviour; it is resting, not floating.
- **Activate.** `openWorkshop()`. On return, the scene re-reads the design (§ 10) and repaints
  every recolourable material.

### 7.6 Photo-carousel lamp — a trinket that spins

- **Geometry.** Ported from `lampshade-hero.html`: birch base, brass posts and hoops, a
  translucent tube with the bulb, panels around the ring.
- **Panel images — a manifest, not a code change (owner, 18 Sep 2026).** The panels carry the
  nine illustrated **Sylly mood portraits** in `wip/premium/lamp images/` (`laughing`, `victory`,
  `focused`, `confused`, `startled`, `bored`, `meh`, `sad`, `frustrated` — the brand character
  with her purple controller, ~35 KB each). The lamp builder takes a **manifest**, never a file
  list in code:

  ```json
  { "schema": 1, "rows": 1,
    "panels": [ { "id": "laughing", "image": "laughing.jpg" }, … ] }
  ```

  Ring slots = `panels.length` (the lampshade page's 6–14 range); `rows` stacks them; fewer
  images than slots repeat in order. Swapping the set later is a folder drop plus a manifest
  edit — no JS, no `sw.js`, no version bump — exactly the `data/stickers/` contract. Sandbox path
  `wip/premium/lamp images/manifest.json`; production `data/lounge/lamp/`, **runtime-cached**
  (manifest network-first, images cache-first), never precached, so the install delta stays zero.
  Per-image ceiling **40 KB**, already met. The brief's § 9 photo warning is moot: these are
  brand illustrations, not the owner's photos. The stickers are still the dial's job, not the
  lamp's.
- **Idle.** Slow rotation (~2 rpm); the bulb is a warm emissive with a faint point light,
  and the portraits are lit from inside — `emissive` at low intensity with the image as
  `emissiveMap`, so the faces read even when the panel is turned away from the key.
- **Activate.** `flick(v)`: an angular impulse in the drag direction with friction, the
  lampshade page's own drag-to-spin behaviour.
- **Reduced motion.** Does not rotate; a tap does nothing visible.

### 7.7 Stickerbook — a prop today, the door to a feature tomorrow

- **Look (owner, 18 Sep 2026 — `wip/premium/stickerbook.png`).** The padded mini-disc binder's
  *cover*, in **soft yellow** (fixed, `#F3E2A0`-ish, never the player's colour — it reads more
  playful than the brown of the lounge renders): a `prmMoulded` book with a canvas-drawn
  **diamond quilt** as `bumpMap`, a piped edge (a thin torus-section trim), and an embossed
  "Little Sylly" star (a shallow extrude in a slightly darker yellow). Inside, **stickers, not
  discs**: two pages, each a 2×5 grid of the game sticker PNGs on clear sleeves (white planes at
  ~.85 opacity with a specular highlight).
- **Activate — two-stage, wired by the host.** The scene calls `openStickerbook()` if the host
  provided one; **in v1 the host passes nothing**, and the prop falls back to `openCover()` — the
  cover lifts and flops back over 400 ms ease-out, the next tap or 6 s closes it, nothing
  navigates. When the stickerbook feature exists the host wires the callback and the prop
  becomes its door, with no scene change. The pick target, hover lift and keyboard tab stop are
  built now so the door is already in the room.
- **The vision this leaves room for (recorded, not built).** The stickerbook is planned as the
  suite's **collection + record + progress + achievements** surface: players earn stickers by
  playing; earned stickers are the ones the Workshop's Stickers tab lets them put on the
  controller (the sticker manifest's `unlocked` flag is already that seam). It will get its own
  icon among the layout modes later, so the lounge's binder is *a* door to it, not the only
  one. Nothing about the binder's geometry or `api` should assume the book is only decorative:
  the page grid is built from the sticker list it is given, so a future "earned vs locked"
  rendering (greyed sleeves) is a data change.
- **Reduced motion.** Cover state cuts.

### 7.8 Cassette deck, books, prints — fixed, non-interactive

No pick target, no hover.

### 7.9 Trinket slots — data now, achievements later

`prmBuildShelf(THREE, trinkets)` takes a list:

```js
[ { id: 'mini-controller', builder: 'controller', unlocked: true },
  { id: 'mini-lamp',       builder: 'lamp',       unlocked: true },
  { id: 'plant',           builder: 'plant',      unlocked: true },
  { id: 'studio-print',    builder: 'print',      unlocked: true },
  { id: 'game-stack',      builder: 'stack',      unlocked: true } ]
```

v1 ships five studio pieces, all `unlocked: true`, all non-interactive. **Trinkets are easter
eggs** (owner, 18 Sep 2026): looks and atmosphere only, never a pick target, never a door.
Some may later be *earned* — by achievements or some other system, undecided — which is what
the `unlocked` flag is for; the shelf leaves an empty slot's width for a locked one so the row
does not reflow. That is the entire hook — no more is built.

---

## 8. The TV's attract screen

A 512×384 canvas → `CanvasTexture`, redrawn at ~10 fps **only while the TV is on screen and the
tab is visible**:

1. "LITTLE SYLLY'S LOUNGE" in Fredoka, plum on the screen's pale phosphor tint, the star mark.
2. A slow carousel of the 20 stickers drifting right-to-left (one every ~3 s).
3. One line, small, rotating from a short array in the Sylly voice — the first is
   *"Tap the telly to browse the box."*

Scanlines are drawn into the canvas at ~6% alpha; the curve comes from the glass geometry; the
"bloom" is the additive plane in § 7.1. No post-processing. The phosphor tint and the screen's
point light share one colour so the spill matches the picture.

---

## 9. Input, picking and the host contract

### 9.1 Pointer

A `Raycaster` against the pick targets only (each prop group's `userData.prmId`; the room shell
is excluded). `pointermove` → hover; `pointerdown`+`pointerup` within 6 px and 400 ms → activate;
a drag on the lamp → `flick`. Pointer parallax: the camera yaws/pitches ±2° toward the pointer,
eased, and returns to rest on leave.

### 9.2 Keyboard and remote

Props are one tab stop each in reading order (TV, jukebox, dial, binder, phone, controller,
lamp); ←/→ move between them, Enter/Space activates. This is also how a TV remote drives the
room, consistent with the TV-mode rail's contract. The focus outline is a HUD-layer rectangle
over the focused prop's projected bounds, 3 px `#2B1B45`.

### 9.3 Host callbacks — the whole routing surface

```js
prmMount(canvasEl, {
  games, stickers: { base, list }, design, lampPanels: { base, manifest },   // data in
  enterTV(gameId | null),           // TV screen / dial
  enterShelves(),                   // phone
  openWorkshop(),                   // controller
  openSound(),                      // jukebox knob / TV volume dial
  openSwitcher(),                   // TV channel dial
  openStickerbook,                  // binder — OPTIONAL; absent in v1 → the cover just flips
  music: { nowPlaying(), playFor(key), keys: [] }   // jukebox; stubbed in the sandbox
}) → { setDesign(design), setPreset('wide' | 'portrait'), dispose() }
```

`openStickerbook` is the one optional callback; every other one is required and the scene
throws at mount if it is missing, so a mis-wired host fails loudly at dev time rather than with a
dead prop on a player's screen.

The scene never calls `showScreen`, never reads `localStorage`, never touches `Music` directly.
`index.html` (sandbox) and, later, the production lobby wire these. `dispose()` cancels the RAF
(§ 11) and frees GPU resources — the same `ctlTeardown` discipline.

---

## 10. Colour inheritance contract

`design = { shell, plate, ears, buttons }` — the shape `ctlReadDesign()` returns, defaults
`CTL_DEFAULTS` (`#a97fd6 / #9670c8 / #a97fd6 / #8f66c4`). The host passes it at mount and again
via `setDesign()` after the Workshop closes; the scene **never copies a hex**.

| Object | `shell` | `plate` | `ears` | `buttons` |
|---|---|---|---|---|
| Controller | as shipped (`ctlApplyDesign`) | | | |
| TV | body | front bezel | bunny ears | both dials |
| Jukebox | cabinet | front panel + record label | round ears | knobs, four candy buttons |
| Dial | base | top plate + wedge | — | ring glow (emissive, low) |
| Phone | body | screen surround | — | keypad |

Cartridges: each game's `brandHex` + its sticker. Everything else: fixed neutrals (§ 6).
Every recolourable `Material` is registered in a `prmPaint` map keyed by role so `setDesign()`
is one loop, and the harness can assert that changing `design.ears` changes exactly the ear
materials and nothing else.

---

## 11. Motion contract

| Beat | Duration / easing | Notes |
|---|---|---|
| Hover lift | 150 ms ease-out, transform only | § Motion Standard's small-element band |
| Dial click on TV dials | 120 ms | button-press band |
| Dial spin | 1800 ms ease-out cubic | a blocking choreography beat, sanctioned by `ui-style.md` § Motion Standard (the player cannot act through it) |
| Cartridge rise | 200 ms with overshoot | |
| Push-in | 600 ms ease-out camera tween toward the screen; the DOM layer fades in over the last 200 ms | Return to Premium is a **cut** — no reverse push, no motion tax on the way back |
| Binder cover | 400 ms ease-out | |
| Drift / rotation | continuous, RAF | dial ~4°/s, lamp ~2 rpm, record ~33 rpm |

**Render on demand.** The RAF runs only while something animates (an idle rotation, a tween, the
attract loop's tick) or the pointer moved this frame; otherwise the scene renders once and
stops. Shadow maps use `renderer.shadowMap.autoUpdate = false` and set `needsUpdate` only when a
prop moves — the room's shadows are static.

**Reduced motion, checked in JS.** The global CSS block cannot see a RAF loop. `prmReducedMotion()`
mirrors `combReducedMotion()` and is consulted by every beat above: no drift, no parallax, no
lamp or record rotation, the attract loop frozen on one frame, push-ins and cover state become
fade cuts, the dial shows its result instantly with the cartridge already risen. The standard
asks that *nothing travels*, not that information is lost — the dial still tells you the game.

**Timer lifecycle.** The RAF handle, the attract tick, the binder auto-close and the drift-resume
timeout are all cleared in `dispose()`, per `logic-engine.md` § Timer Lifecycle.

---

## 12. Scene B (portrait) — designed now, built later

**One scene graph, two camera presets.** Props keep their world positions; Scene B is
`setPreset('portrait')` plus a HUD layout, not a second room.

- **Framing.** The coffee table from above-front; the **controller is the hero** in the bottom
  third (the brief's finding: a single centred object survives the crop); the dial and phone
  above it; the TV a distant glow at the top. The bookshelf and lamp fall out of frame.
- **HUD.** A single column: heading at the top, the scene filling the middle two thirds, one
  glossy keycap at the bottom in thumb reach.
- **No push-ins in portrait.** A layout switch on a phone is a fade — thumb reach beats
  choreography, and the frame rate budget is smaller.
- **Transition requirement (owner, 18 Sep 2026).** A phone arriving at Premium must have a real
  path: Scene B when built, the honest card until then. Switching between Scene B and Shelves is
  a fade, both directions.
- **Tracked** in `docs/deferred-work.md` under the lobby-redesign entry so it is not lost.

---

## 13. Eligibility and the honest card

Premium is offered when **all** hold: `innerWidth ≥ 900 && innerHeight ≥ 500` (TV mode's
`LB_TV_MIN_W/H`, reused, no device sniffing), a WebGL context can be created, and
`prefers-reduced-data` is not set. Otherwise the switcher slot shows the card, in the Sylly voice:
*"The lounge wants a bigger screen. Cast it, or open it on a laptop — the Shelves are right
here."* with one keycap to Shelves. A window that shrinks below the floor mid-session drops to
the card the same way TV mode does.

---

## 14. Verification

**`wip/premium/verify-prm-props.js` (Node, `three.min.js` under the controller-body shim):**

1. Every builder returns a `Group` with the expected named children (`screen`, `dialL`, `dialR`,
   `earL`, `earR` …) and a bounding box inside its footprint (table, bench, shelf, arm).
2. `setDesign` purity: change one key of the design → exactly that role's materials change,
   every other material's colour is byte-identical.
3. No builder touches `window`, `document` or `localStorage` (the shim throws on access).
4. The dial holds exactly 20 cartridges, one per `games.js` id, each labelled with that game's
   sticker path and coloured with its `brandHex`.
5. The interaction registry maps every pick id to exactly one action, every required callback
   in § 9.3 is reachable from at least one prop, and the binder routes to `openStickerbook` when
   it is supplied and to `openCover` when it is not.
6. `spin()` is idempotent while running (a second call is a no-op) and always resolves to an id
   in the table.
7. The lamp builder fills exactly `manifest.panels.length` slots in manifest order, repeats when
   given fewer images than slots, and reads no path that is not in the manifest.

**Headless Chromium (the `visual-check` skill's pattern):** a screenshot at 1280×720 and
1920×1080 for the composition; a run with `prefers-reduced-motion: reduce` emulated asserting the
camera matrix never changes across 2 s and the dial's rotation is constant; a run asserting the
RAF is idle (no frame in 500 ms) once nothing animates.

**Playtest:** the brief's § 12 questions, on the greybox, before any polish.

---

## 15. Performance and cost envelope

- Pixel ratio capped at 1.5; one 1024² shadow map; ~40 meshes; every material `MeshStandard`
  (no `MeshPhysical` clearcoat — the env map does that job more cheaply).
- **Install delta: four JS files** (`prm-lib.js`, `prm-room.js`, `prm-props.js`, `prm-scene.js`) plus a stylesheet, once
  promoted to production. No new precached binary. Sticker PNGs and music are
  already runtime-cached; the nine lamp portraits (§ 7.6, ~320 KB total) and any § 4
  escape-hatch PNG are runtime-cached the same way, never precached — the `data/music/` split. This sits in the cost envelope's *already-paid-for* tier; a decision to
  vendor a post-processing pass would not, and is out of scope (§ 1.1).
- The scene is built lazily on first entry to the Premium layout and disposed on leaving it, so
  players who never open Premium pay nothing at runtime.

---

## 16. Build order (the greybox plan)

Each step ends in a screenshot the owner can react to. Polish is a single pass at the end, not
per step.

1. **Shell + light.** Walls, floor, rug, tables, shelf, couch arm, curtain, floor lamp; the three
   lights, env map, fog, vignette; camera at the wide preset; HUD placeholder. *Proves the
   diorama look before a single prop exists.*
2. **Controller** mounted from the shipped geometry on the couch arm, reading the design.
3. **TV**: the moulded helper proves itself; attract canvas; push-in; the two dials.
4. **Dial**: 20 cartridges from `games.js`, drift, spin, rise, hand-off to `enterTV(id)`.
5. **Jukebox** with the `music` stub; **phone**; **binder**.
6. **Lamp** ported from the lampshade page, reading the portrait manifest; **shelf** with the
   five trinket slots and the books.
7. **Polish pass**: materials, shadow tuning, fog distance, the per-element escape-hatch calls
   (§ 4), with the real lighting on. Then the § 14 harness and screenshots.
8. **Claude Design handoff** for the 2D chrome (§ 17).

The writing-plans skill turns this into the task-level plan; this list is the spine, not the plan.

---

## 17. Claude Design handoff (after step 7)

Claude Design gets a greybox screenshot at both sizes and owns the **2D layer only**: the
heading and keycap, the four-slot switcher's Premium state, the honest card (§ 13), the focus
outline, the vignette, and the attract screen's typography and sticker carousel layout as a flat
composition the canvas code then follows. It does **not** own the 3D scene, the composition, the
lighting or any prop — those live in code here. Same shape as the TV-mode handoff
(`wip/lobby-lab/OWNER-REVIEW.md` § "handed to Claude Design").

---

## 18. Doc updates when the greybox lands

Per the Documentation Integrity Protocol: `docs/code-map.md` gains a § Premium lounge entry only
when the scene reaches production (sandbox files are not mapped); `shared-implementation-notes.md`
takes the lessons (the env-map finding for the controller is one already); `docs/decision-log.md`
has the direction entry (written with this spec); `docs/deferred-work.md` carries Scene B (written
with this spec) and, after the greybox, any escape-hatch element that was taken.
