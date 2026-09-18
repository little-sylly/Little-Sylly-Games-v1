# Design — Premium lounge: the re-block (greybox round 2)

**Date:** 19 Sep 2026 · **Status:** approved by the owner in conversation, plan not yet written ·
**Tier:** 2 (architectural — it restructures the stage, the light and three props)
**Amends:** `docs/superpowers/specs/2026-09-18-premium-lounge-scene-design.md`. Where this
document and that one disagree, **this one wins**. It overrides §§ 3.1, 3.2, 6, 7.1, 7.2, 7.6 and
the framing half of § 12 there. Everything else in the original — the host contract (§ 9), the
colour inheritance contract (§ 10), the motion contract (§ 11), eligibility (§ 13), the cost
envelope (§ 15) — is untouched and still binding.
**Why it exists:** the owner's answers to `wip/premium/OWNER-REVIEW.md` (19 Sep 2026). The
greybox answered its own question honestly: the room does **not** yet read as the cosy toy
diorama the brief asked for. Production wiring is deferred until it does — see § 9.
**Visual references (open the files; not repo-readable by a fresh session):**
`wip/premium/Gemini_Generated_Image_9nolcp9nolcp9nol.jpg` — the *original* tight composition,
the scale target; the owner's four review-round Gemini images (the warm-room injection, the
four jukebox animals, the two bunny TVs, the phone portfolio) — sent in chat 19 Sep 2026, saved
to `wip/premium/` by the owner when convenient.

---

## 1. What the greybox got wrong, in numbers

The owner's diagnosis was "too spacious, props small and insignificant, too light". Both halves
are measurable against the original Gemini composition, and both are composition-and-light
problems — exactly what a greybox is for, not next-stage polish.

| Distance | Greybox (`PRM_PRESETS.wide`, `prm-room.js`) | Gemini original (estimated) |
|---|---|---|
| Camera to the table's near edge | ~2.7 m | ~0.3 m (the edge is the bottom of frame) |
| Table to TV bench | ~2.9 m | ~1.0 m |
| Wall width | 8 m | ~3 m |
| Fog | starts at 6.8 m — never reaches the back wall | n/a — the wall simply falls to shadow |
| Wallpaper contrast | ~4 % | ~15 % |
| Dark corner anywhere in frame | none | the whole left-back corner |

Pulling the camera in alone leaves the bench tiny in the distance; compressing the room alone
leaves everything small. **Both change together.** Likewise the palette is not wrong so much as
lit flat: a hemisphere fill at 0.30, a pale background and an even wall leave the warm key with
nothing to pool against.

---

## 2. Decisions locked with the owner (19 Sep 2026)

| # | Decision | Owner's words |
|---|---|---|
| D1 | The four escape hatches stay procedural | "keep the four, the problem isn't with these elements" |
| D2 | Dial drift speed stays | "on point" |
| D3 | Room compresses; camera sits on the couch, table pushed against us | "the tight space felt cozy" |
| D4 | The **window is the key light**, on the **left**; the floor lamp is **dropped** | "drop the floor lamp, have the window on the left" |
| D5 | Curtains **drawn**, a **slit of light** through | "keep the curtains drawn but maybe let a slither of light through" |
| D6 | A **potted plant** on the window sill | "to add a bit of flair and stop that left side from feeling empty" |
| D7 | Mood is **Saturday afternoon**: darker, not dark | "a darker (not dark, just darker) room has more fun ambience … vs a quiet morning sunlit feel" |
| D8 | Photo-carousel lamp moves to the **shelves** | "move our photo lampshade to the shelves" |
| D9 | Coffee table **off-centre right**, breathing room from the TV | "moved a bit to the right so it's not in a visible line to the tv" |
| D10 | TV gets **droopy bunny ears** | "droopy ears nudges it out" |
| D11 | Jukebox becomes the **cat jar** | "cat jukebox (top right)" |
| D12 | Phone stays the **clamshell** | "legacy clamshell or swift slider" — clamshell chosen: already built, era-correct beside the deck |
| D13 | Rug: **round, braided jute, darker oat** | "darker, circular, thick-threaded, ropey" |
| D14 | Colours match the controller/TV/jukebox — no label chrome for the phone | "as long as the colors match … intuitive as a door" |

---

## 3. The stage (overrides original § 3.1 and § 3.2)

### 3.1 The box and the seat

The room is a **corner about 3.2 m wide and 1.9 m deep** at the back wall, not 8 × 3. The
bench sits **about 1.0 m behind the table**. All positions below are targets to be tuned by eye
against the shots — the *ratios* are the contract, not the third decimal.

| Thing | Greybox | Re-block target |
|---|---|---|
| Back wall `backZ` | −3.0 | −1.55 |
| Left wall `leftX` | −3.0 | −1.6 |
| Wall plane width | 8 | 3.6 (still overhangs the frame) |
| Bench `benchZ` | −2.55 | −1.15, centred x ≈ −0.15 |
| Table centre | (0.1, 0.35) | (0.35, 0.30) — right of centre (D9) |
| Camera `wide.pos` | (−0.20, 1.30, 3.40) | (0.05, 0.95, 1.55) — seated eye height, just behind the table edge |
| Camera `wide.look` | (−0.05, 0.50, −1.55) | (0.00, 0.55, −1.15) — the TV |
| FOV | 40 | 42 |
| Fog | 6.8 → 15 | 2.2 → 4.5 — engages on the back wall |

**We are sitting on the couch.** A **seat cushion**: one `prmMoulded` slab in the fabric
material, ~1.4 m wide, running along the bottom-left of frame at `armTopY − 0.12`, mostly out
of frame. The existing **arm** stays and now rests on it; the controller stays on the arm. The
arm no longer floats.

The table's near edge is the **bottom of frame**; its top surface is visible, the dial, binder
and phone sit large on it. This is the "corner cure" the brief asked for, actually applied.

### 3.2 Light — Saturday afternoon

One idea replaces three: **the window is the light**. Late sun through a drawn curtain, one
hand-width gap, warm and directional. Everything else is fill.

| Source | Light | What it does |
|---|---|---|
| **The window slit** (left wall) | The one shadow-casting `SpotLight`, `#ffcf9a`, positioned outside the wall at the slit, aimed low across the room toward the table and the right half of the back wall. Angle narrow (~0.5 rad), penumbra ~0.5, `castShadow`, 1024² map | A bright warm **diagonal** on the back wall, a pool on the rug and the table, long soft shadows to the right — the Gemini corner |
| **The curtain glow** | The window plane behind the curtain stays emissive (dimmer, `~0.9`); a small warm `PointLight` just inside the slit, radius ~1.2 | The curtain reads back-lit; the sill and the plant rim-light |
| Room fill | `HemisphereLight` down to **0.10** (from 0.30), sky `#b9c4cf`, ground `#c9a98a` | Enough to see into the corners; never enough to flatten the key |
| TV screen | `PointLight` `#bfe6d0`, 0.6, as today | The only **cool** note left in the room |
| Dial ring | As today | "Things are on" |
| ~~Floor lamp~~ | **Removed** (D4) — mesh, material `shade`, `bulb` light and env-map plane all go | — |

Global: `toneMappingExposure` **0.80 → 0.68**; `scene.background` **`#efe6dc` → `#d9c7b4`**; the
CSS vignette (`#prm-vignette`) about 40 % stronger. The env map's warm plane moves to the left
wall's position and darkens slightly so plastic still picks up a warm rim from the correct side.

**The two big neutrals deepen one rung each** (original § 6 said "never the player's colours" —
still true; these are room colours):

| Surface | Greybox | Re-block |
|---|---|---|
| Wallpaper base / tone | `#f3dccb` / `#eccfb9` (~4 %) | `#e9c4a6` / `#d9ad8c` (~15 %) — arches read in the shadowed half |
| Floor planks | `#e6d2b4` / `#c6a882` pale birch | `#c99a6b` / `#a87a4e` mid honey |
| Rug | `#ddd0bb` flat oat | `#b89d78` braided jute (§ 5.3) |
| Fabric (couch) | `#8d7f74` | `#8a7566`, a touch warmer |
| Birch furniture | unchanged | unchanged — it now reads *lighter* than the floor, which is the Gemini look |

**Test for "darker, not dark":** every prop's silhouette is still readable without the key
(hemisphere alone at 0.10 must show the room), and the brightest wall patch sits below clipping
at exposure 0.68. Both are eyeball checks on the shots plus one harness pixel probe (§ 7).

---

## 4. The room shell (overrides original § 6)

| Element | Change |
|---|---|
| Walls, skirting, cornice | Same geometry, new box (§ 3.1). Cornice stays — it is the one line that says "room" at the top of frame |
| Floor | Same, mid honey |
| Rug | **Round.** `CylinderGeometry` r ≈ 1.05, h 0.012, 48 segments; a concentric-ring canvas as `bumpMap` (§ 5.3). Centred under the table, `receiveShadow` |
| Coffee table | Same, moved right (D9) |
| TV bench | Same, moved in and slightly left |
| Bookshelf | **Lower and nearer**: three boards from y ≈ 0.78 to 1.40, right of the bench, x ≈ 1.05. The top board carries the photo lamp (§ 5.4) and the trinket slots |
| Side table | **Removed** — it existed to carry the lamp |
| Couch arm | Same; now sits on the new **seat slab** (§ 3.1) |
| Window + curtain | **Moved to the left wall** at x = `leftX + 0.02`, z ≈ −0.55, y centre 1.45. The window plane 0.75 × 1.3; a **sill**: a birch box 0.9 × 0.03 × 0.16 at y ≈ 0.80 protruding into the room. The curtain is the same sine-wave extrusion in **two halves** with a **0.10 m gap** at about 40 % of the width, both halves drawn; opacity 0.92 as today |
| Potted plant | **New, on the sill** (D6). A rounded terracotta pot (`prmMoulded` cylinder-ish or `LatheGeometry`, fixed neutral `#b8674a`), a soil disc, five or six leaves: flattened ellipsoid discs (`SphereGeometry` scaled) on thin bent cylinder stems, leaf green a fixed neutral `#6f8f5a`. Roughness high. Placed in the slit's light so it rims. **Not interactive, not a pick target, not recolourable** — it is furniture |
| Floor lamp | **Removed** (D4) |
| Framed prints ×2 | Kept, on the back wall above the bookshelf |

---

## 5. Props that change (overrides original §§ 7.1, 7.2, 7.6; adds the rug)

### 5.1 TV — droopy bunny ears (D10)

Ears are the only change; the CRT body, the attract screen and the push-in are as built.

- **Geometry.** Each ear is a **`TubeGeometry` along a `CatmullRomCurve3`** that rises from the
  top of the cabinet, leans outward, then folds forward and down past the cabinet's front top
  edge — four or five control points. Radius ~0.055 at the cabinet scale, 12 radial segments,
  then the whole ear **scaled 0.55 in its local x** so the tube is a flattened lobe, and a
  `SphereGeometry` cap at the tip with the same flattening. Inner-ear: a second, thinner tube
  along the same curve in the `plate` colour, offset forward, so the fold shows a paler inside.
- **Colour.** `ears` (outer), `plate` (inner) — inheritance contract unchanged.
- **Names.** `earL`, `earR` remain the group names the harness looks for; `earL.inner`,
  `earR.inner` added.
- **Idle.** None. The push-in is unchanged.
- **Why not a bent `LatheGeometry`.** A lathe cannot bend. The tube-plus-flatten is ~30 lines
  in `prm-lib` as `lib.droopEar(curvePts, r, flatten)` and is reusable if a fourth prop ever
  wants one.

### 5.2 Jukebox — the cat jar (D11)

Replaces the arched cabinet wholesale. Same pick ids, same actions.

- **Geometry.** A **transparent cylinder body** (r ≈ 0.11, h ≈ 0.16, `MeshStandardMaterial`
  `transparent: true, opacity: 0.32`, `roughness: 0.15`, `side: DoubleSide`; **no
  `MeshPhysical` transmission** — original § 15 rules it out, and opacity reads fine at this
  size). Inside: **two records** standing near-upright, slightly fanned — flat black cylinders
  r ≈ 0.075 with a label disc in the `plate` colour and the canvas-drawn title on the front one.
  A **base ring** in the `shell` colour under the glass. A **dome lid** in the `shell` colour
  (`SphereGeometry` half, r ≈ 0.115) with a **rim** and **two triangular cat ears**: `ConeGeometry`
  4-sided, scaled flat, in the `ears` colour with a `plate`-coloured inner triangle. Two small
  emissive dots on the lid front as eyes (`buttons` colour, low emissive). A **front control
  strip** on the base ring: one knob and four candy buttons in the `buttons` colour.
- **Colour.** `shell` → lid, base ring · `plate` → record labels, inner ears · `ears` → cat ears
  · `buttons` → knob, four buttons, eye dots. The harness's purity check (original § 14 item 2)
  still applies per role.
- **Idle.** The **front record turns at ~33 rpm** while `Music` reports a track — the same rule,
  now visible through the glass. Label reads `Music.nowPlaying().title` as before.
- **Activate.** Knob → `openSound()`. Record (either) → next track. Unchanged.
- **Reduced motion.** Record does not turn; label still updates.
- **Names.** `knob`, `record` keep their names for the registry; `lid`, `jar`, `earL`, `earR`,
  `recordBack` added.

### 5.3 The rug — round braided jute (D13)

- **Geometry.** Cylinder r ≈ 1.05, 48 segments, 0.012 thick, plus a slightly darker outer ring
  (the braid's edge) as a `TorusGeometry` r 1.05, tube 0.012 lying flat.
- **Texture.** A new `tex.braid(rings)` canvas in `prm-lib`: concentric rings of alternating
  tone with a fine diagonal hatch inside each ring (the twist of the rope), used as `map` at
  low contrast **and** as `bumpMap` at `bumpScale ~0.006`. Colour `#b89d78` base, ring tone
  `#a68a66`.
- **Why round.** A round rug under an off-centre table breaks the rectangle-in-rectangle stack
  of table-on-rug-on-frame that made the greybox's lower third a flat field.

### 5.4 The photo-carousel lamp — moves to the shelf (D8)

Builder unchanged. It sits on the bookshelf's **top board** (§ 4), centred, replacing the
trinket slots there; the trinket slots move down one board. It remains a pick target: spin on
tap, drag to turn, as built. **Scale check in the harness:** its projected height at the wide
preset must be ≥ 48 px at 1280×720, or it is too small to be a target and the shelf comes
nearer still.

### 5.5 Unchanged props

Dial, binder, phone (D12 — the clamshell stays exactly as built; its screen still says
"Shelves"), controller, cassette deck, books, prints, trinket slots (relocated only).

---

## 6. Layout (overrides original § 3.1's plane table)

| Plane | Contents | Notes |
|---|---|---|
| **Back** | Back wall; bench (left of centre) with deck, TV, cat jar; bookshelf (right, low) with the photo lamp, books, trinkets; two prints above | The key's diagonal lands here |
| **Left** | Left wall; window with drawn curtain, the slit, the sill, the potted plant | The visible light source |
| **Mid** | Round rug; coffee table (right of centre): dial, binder, phone | Key-lit, where the eye lands |
| **Front** | Seat cushion along the bottom-left, the arm on it, the controller on the arm | Ours, in reach, out of the light's centre |

The TV and the dial are in **different columns** of the frame (D9). The photo lamp is the
right-hand accent that balances the plant on the left.

---

## 7. Verification (extends original § 14)

`wip/premium/verify-prm-props.js` — same file, same rules (builders take `lib`, never touch
`document`; new sections go **above** the `dial` section, which ends in the async `finish()`):

1. **Existing 297** keep passing with position/footprint updates for the moved props. Footprints
   in the harness read the new `roomData` (`benchZ`, `tableTopY`, the new `sillY`, `seatTopY`,
   shelf `S`) — never literal numbers.
2. **Plant:** `prmBuildPlant` returns a `Group` with `pot`, `soil`, ≥ 5 `leaf*` children, bounding
   box inside the sill footprint, **no pick id** registered, **no** entry in `prmPaint` (it is
   not recolourable: changing every design key leaves every plant material byte-identical).
3. **Cat jar:** children `jar`, `lid`, `earL`, `earR`, `record`, `recordBack`, `knob`, four
   `button*`; the `jar` material is transparent with opacity in (0.2, 0.5); purity per role as
   item 2 of the original; `record` still routes to next-track and `knob` to `openSound`.
4. **Droopy ears:** `earL`/`earR` exist with `inner` children; each ear's bounding box extends
   **below** the ear's root y (it droops) and **outside** the cabinet's half-width (it leans);
   both take the `ears` colour and their inners the `plate` colour.
5. **Room:** no mesh named `floorLamp*` or `sideTable*`; `window`, `curtainL`, `curtainR`,
   `sill`, `seat` exist; the curtain halves leave a gap (their bounding boxes do not overlap in
   z and the gap is between 0.06 and 0.14).
6. **Lights (scene-level, in `visual-prm.js` since it needs a renderer):** exactly one
   shadow-casting light; its position is outside the left wall (`x < leftX`); no light named
   `bulb`.

`wip/premium/visual-prm.js` — real headless Chromium (SwiftShader, ~3.5 fps: **poll, never
sleep**):

7. Re-shoot all four: `wide-1920`, `wide-1280`, `portrait-preset-1280`, `reduced-1280`.
8. **Pixel probes on `wide-1280`:** the mean luminance of the frame is *below* the greybox's
   (darker) and the mean luminance of a 40×40 patch at the top-left corner is *below* the mean of
   a patch on the sunlit back wall by at least 25 % (there is a dark corner and a lit wall). The
   photo lamp's projected height ≥ 48 px (§ 5.4).
9. Reduced-motion run: camera matrix constant over 2 s; dial rotation constant; record still.

**Playtest, the real gate:** the brief's § 12 ninety-second test on the new shots, judged by the
owner against `Gemini_Generated_Image_9nolcp9nolcp9nol.jpg` for *scale* and the warm-room
injection render for *mood*. Nothing here proves it feels right.

---

## 8. Scene B (amends original § 12, framing only)

The portrait preset is **re-aimed for the smaller box in this pass** so it stays a truthful
preview: camera above-front of the table, controller in the bottom third, dial and phone above
it, the TV a glow at the top. Its HUD, the eligibility switch and the transitions are still their
own later round. `PRM_PRESETS.portrait` target ≈ `pos (0.20, 1.35, 1.05)`, `look (0.20, 0.40,
−0.30)`, `fov 54` — tune by eye on `portrait-preset-1280.png`.

---

## 9. What this round is not

- **Not production wiring.** Original § 1.1's wiring round (`src/screens/lobby.html`, `sw.js`
  precache, `ctlOpenWorkshop`) waits until the owner passes the ninety-second test on the
  re-blocked room. Wiring does not depend on composition, but building on a room that does not
  read yet is the wrong order.
- **Not surface polish.** Bouclé weave detail, keypad keys, the rope's individual fibres, a
  clear-coat on the jar — next stage, once the shapes and the light are agreed.
- **Not the stickerbook feature, not the 2D chrome.** Unchanged from the greybox's "deliberately
  not here" list.
- **Sandbox only.** Nothing in `index.html`, `sw.js`, `src/screens/` or `js/`. No SW bump.

---

## 10. Build order (the plan's skeleton)

1. Room box + camera + fog + seat slab (§ 3.1, § 4) — reshoot, judge scale first, alone.
2. Light: window key, curtain halves + slit, remove floor lamp, exposure/background/fill,
   palette rungs (§ 3.2) — reshoot, judge mood.
3. Round rug (§ 5.3), table offset, bookshelf lowered, lamp to shelf, sill + plant (§ 4, § 5.4).
4. TV droopy ears (§ 5.1).
5. Cat jar (§ 5.2).
6. Portrait preset re-aim (§ 8).
7. Harness sections (§ 7) — each landed with its step, not batched at the end.
8. Owner review round 2: a short `OWNER-REVIEW-2.md` with the new shots and the one question
   that matters — does it pass the ninety-second test — then the wiring round (§ 9).

Steps 1 and 2 are the whole bet; if they do not land, steps 3–6 are decoration on the wrong
room. Ship the shots after step 2 before continuing.

---

## 11. Doc updates when it lands

- `docs/superpowers/specs/2026-09-18-premium-lounge-scene-design.md` Status line → "amended by
  2026-09-19 re-block".
- `docs/deferred-work.md` lobby-redesign entry: greybox → re-block status, wiring still deferred.
- `docs/implementation-notes/shared-implementation-notes.md` DD-14: the scale/light lesson — a
  greybox's first shots should be judged against the reference at matched camera distance
  before any prop is polished.
- `docs/decision-log.md`: one line — window-as-key, floor lamp dropped, room compressed.
