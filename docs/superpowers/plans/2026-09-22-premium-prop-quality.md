# Premium lounge — prop quality rounds (outline)

**Status:** rounds 1 (TV), 2 (dial), 3 (jukebox), 4 (phone) and 5 (binder) done · **Created:** 22 Sep 2026 · **Sandbox only** (`wip/premium/`), nothing
shipped, no SW bump expected from any round here.

**What this is.** The running order for lifting the lounge's props from greybox to finished, one
prop per round, plus the standing rules every round inherits. It is an **outline, not a spec** —
no per-prop design decisions are recorded here on purpose. Open it at the start of a prop session
to find out what is next and what the bar is; close it by ticking a box and adding a one-line
result.

**The mockups are NOT in this repo's control.** The owner re-provides that prop's rendered mockup
**inside the session it is worked on**. The `Gemini_Generated_Image_*.jpg` files in `wip/premium/`
may be stale — **do not treat them as the reference**, and do not start a prop round without the
current one in hand.

---

## 1. The bar — "controller quality", fully procedural

The finished controller is the reference for *quality*, not for *shape*. "Fully procedural" here
means **drawn at runtime, never an image file**: zero install bytes, nothing in `PRECACHE_URLS`,
nothing to runtime-cache. Measured 22 Sep 2026.

**The materials are already the same.** Side by side:

```js
// js/controller.js — the finished prop
new THREE.MeshStandardMaterial({ map: ctlTex, roughness: .52, metalness: .06,
                                 bumpMap: ctlBumpTex, bumpScale: 0.035 })

// wip/premium/prm-lib.js role() — every lounge prop today
new THREE.MeshStandardMaterial({ color: hex, roughness: .52, metalness: .06 })
```

Identical `roughness` and `metalness`. The whole difference is `map` + `bumpMap`, and both of the
controller's are **canvas elements drawn with 2D calls** (`ctlCanvas`, `ctlBumpCanvas`).

`prm-lib.js` already has this machinery and already uses it — `tex.wood()`, `tex.wallpaper()`,
`tex.braid()`, `tex.braidBump()`, `tex.boucle()`. It is on the room's **surfaces**. It is not on
the **props**. `smoothNormals` is likewise already injected into `prmExtrude`.

**So the gap is two things, and neither costs a byte:** geometry density, and a procedurally-drawn
bump map.

### Measured baseline (22 Sep 2026, widescreen mount)

Re-measure after each round; this is the progress instrument.

| prop | meshes | triangles | materials w/ bump |
|---|---|---|---|
| **controller** *(finished, for scale)* | 17 | **53,700** | — |
| ~~dial~~ *(greybox, 22 Sep)* | ~~47~~ | ~~14,976~~ | ~~0~~ |
| **dial** *(round 2 done, 23 Sep)* | **107** | **72,886** | **60** |
| ~~tv~~ *(greybox, 22 Sep)* | ~~26~~ | ~~10,502~~ | ~~0~~ |
| **tv** *(round 1 done, 23 Sep)* | **31** | **63,898** | **12** |
| ~~jukebox~~ *(greybox, 22 Sep)* | ~~19~~ | ~~3,520~~ | ~~0~~ |
| ~~jukebox~~ *(round 3, 23 Sep)* | ~~48~~ | ~~102,402~~ | ~~19~~ |
| **jukebox** *(round 3b done, 23 Sep)* | **72** | **116,238** | **19** |
| ~~phone~~ *(greybox, 22 Sep)* | ~~16~~ | ~~3,254~~ | ~~0~~ |
| **phone** *(round 4 done, 23 Sep)* | **61** | **67,738** | **5** |
| ~~binder~~ *(greybox, 22 Sep)* | ~~44~~ | ~~2,360~~ | ~~2~~ |
| **binder** *(round 5 done, 23 Sep)* | **37** | **73,442** | **3** |
| ~~lamp~~ *(greybox, 22 Sep)* | ~~28~~ | ~~2,038~~ | ~~0~~ |
| **lamp** *(round 6 done, 24 Sep)* | **16** | **13,342** | **1** |

**Review every prop with a SUPERSAMPLED close-up before calling it done.** Render at pixelRatio 2
with a tight fov and look at the silhouette. The telly's worst defects — a profile that was a run
of straight segments, a corner at the tip, a decal spiking through, fins at the ear roots — were all
invisible at room framing and obvious in one such render. It also settles "is this geometry or is
it just the render resolution?" in a single turn.

**When a silhouette has to be a NAMED shape, write the shape down — do not approximate it with
control points.** Any keyframed profile has to guess the curve between its points, and on a
silhouette every guess shows. The telly's ear went smoothstep → monotone cubic → denser sampling
across three passes before the answer turned out to be `opt.ellipse = { at, half, n }`: an analytic
superellipse, C-infinity, no control points to guess between — and it closes its own tip and pinches
its own root, deleting two hand-built features that had each been subtly wrong. If a profile is
genuinely freeform, interpolate it with a **monotone cubic** (Fritsch–Carlson), never `smoothstep`:
smoothstep has zero slope at both ends of a span, so the profile goes FLAT at every key, which on a
swept solid is a parallel-sided silhouette with a corner either side of it. Smoothstep stays right
for fading between two CONSTANT regions, which is what `scoopAt` does.

**Get the difference NAMED before iterating again.** The telly's ear took three review passes of
"still not quite right" and then one pass of four precisely-worded findings — stretched not chunky,
a seam at the root, a stamped recess not a sculpted one, a stiff oval not a teardrop — each of which
mapped to a single parameter or one missing idea. When a reviewer can only say it looks off, the
next move is to get it articulated, not to tweak.

**Exaggerating a SILHOUETTE and exaggerating a VOLUME are different edits.** A single scale factor
driving both axes of a swept section can only do one of them — it makes a part thinnest exactly
where its outline narrows, which for the telly's ear was the tip, which is where it folds.
`prmBunnyEar`'s `thickBias` is the separation; anything aiming at chibi proportions needs it.

**Review a deformable part in the pose that EXPOSES it, not the pose it rests in.** The telly's ear
was thinned to a 15 mm sheet across three passes of deepening its bowl, because the front-on view
everyone reviews looks better the deeper you go and hides the cost entirely. Only an edge-on view of
the flop showed it. For a scooped lobe the material left at the centre is `thick · (2 − scoop)` —
worth computing rather than eyeballing.

**A seam is often a COLOUR boundary before it is a geometry problem.** The telly's ear roots read as
bolted on largely because a role change ran along the junction. Putting the lobe and its boss on the
same role did more than any amount of extra burial had. Check which one you are actually looking at.

**When one feature has to follow another, DERIVE it from that feature.** The telly's inner ear was
an independent curve tuned to look close, and it drifted into an egg that ignored the lobe. Defined
as a constant-margin inset of the lobe's own outline (`innerMargin`), it follows by construction and
needs no parameters of its own.

**Judge a bump map on the BEVEL, never on the flat face.** `ExtrudeGeometry`'s default UVs are raw
x/y in metres on the caps and a compressed contour/depth pair on the bevel and side walls, so a fine
repeat smears into streaks exactly where the light catches the moulding — and reads as faceting
rather than texture. The telly settled at repeat 11/m and `bumpScale: 0.0005`; start there.

**A cover is a cheaper answer than a smaller list.** The dial's brief was "it shouldn't be obvious
how many cartridges are in circulation", and the obvious readings — fewer cartridges, or the same
twenty spread thinner — both fight the carousel's contract (one per game, `prmSpinPlan(n)`, the
harness's "exactly 20"). The mockup's own answer was a lid, which changes nothing underneath and
costs two extruded annular sectors. When a brief is about what the player can SEE, look for the
occluder before touching the data.

**A lid needs a wall, and only a pure side view will tell you it hasn't got one.** The dial's first
pass built the lid and the mouth correctly and left a 32 mm band of open air right round between the
base's rim and the lid's underside — every cartridge the lid existed to hide was in plain sight
through it. The hero three-quarter and the top-down both looked finished. This is the plan's
"review it in the pose that exposes it" again, in its cheapest form: for anything with a horizontal
gap, the exposing view is orthographic-ish and edge-on.

**A decal laid flat mirrors, and a half-turn is where it bites.** `rotateX(−π/2)` sends a shape's
local +y to world −z, which reads correctly from a camera in front of the prop — so a wordmark at
rotation 0 is fine. Add `rotation.z = π` to point a star's spike away from the viewer and the
lettering comes out inside out AND upside down, and a five-point star is not symmetric under a half
turn, so the badge and its text cannot be rotated independently to undo it. Tilt (±15°) instead of
turning, or draw the canvas mirrored — but check a close-up either way, because at prop scale the
mirroring is invisible until you zoom.

**Clearance is a SUM, and the term you forget is the one that is not in the constant's name.** The
dial's cards were sized so `CART_H` cleared the lid, and shipped with 1 mm: the card also sits 3 mm
up its holder, a number that lived in an inline offset rather than in the clearance arithmetic. Give
every term a name (`CART_SEAT`) and write the sum down in the comment, or the check becomes
"is the constant big enough" instead of "does the part fit".

**No harness in this project had ever measured a MOVING part against a FIXED one** — and the
dial's display housing had been a solid wedge standing across 60° of the carousel since the
greybox, with every cartridge sweeping straight through it. Nothing caught it for two rounds:
render-only defects are invisible to the pure harnesses, and it is invisible to the eye too,
because the offending part is opaque and the cards are behind it. Any prop with a part that
travels wants one check of this shape — sweep the travelling part's path and assert what is
allowed to be in it.

**A vertex sweep cannot see the middle of a triangle; fire a ray.** The first version of that
corridor check read every fixed mesh's vertices and missed the housing entirely, because
`ExtrudeGeometry` puts vertices only on the OUTLINE: an annular wedge from r 0.096 to 0.205 has
nothing at all at 0.130, and the intruding material is the interior of two very large triangles.
The check passed, on the buggy build, while naming the exact thing it was looking for. Rays hit
triangles — and `THREE.Raycaster` is pure maths, so it runs under Node like everything else
(120 angles × 9 origins costs ~2 s).

**"Derive it from the feature" bit twice in the SAME prop, one round apart.** `COLLAR_Y` was
written as the literal 0.050 when the base's rim happened to top out at 54.5 mm. Flattening the
base to 44 mm left the collar starting 6 mm ABOVE the rim — a band of open air right round with
the cartridges showing through it, which is the exact defect the collar had been added to fix, and
it came back the moment an unrelated number moved. A literal that was derived once, by hand, in
someone's head, is a literal that will be wrong later. `Y_RIM − 0.005` cannot drift.

**A geometric assertion should measure the GEOMETRY, not re-derive it.** The lid's coverage check
first re-computed the mouth from the same angles the builder uses — it agreed with itself, and would
have passed a mouth widened to 300°. Firing a ray straight up from each cartridge and asking whether
the lid is actually overhead is the same three lines and is a claim about the thing the player sees.
Plant the drift and watch it fail before believing any of it.

**Every prop should be asked what it does when it is bored.** The telly's geometry took it from
greybox to finished; its three shuffled idle beats — ear flop, sway, hop — took it from finished to
*alive*, for about eighty lines and no measurable frame cost. The pattern is reusable as it stands:
a two-pose CPU morph for deformation (`lib.bunnyEar`'s `opt.flop`), an inner `rig` group for
whole-prop motion so the group origin stays put, and a seeded shuffle that never repeats a beat
back to back. The § 4 shadow fix is what lets any of it cast correctly.

**Crop the mockup yourself before trusting any description of it.** The jukebox's second-opinion
report called its records "a vertical stack"; a 2× crop showed spokes round a column, and that the
back of the record band is solid wall, not glass. Both were structural.

**Never earcut a part you are going to bend.** `lib.bend` has to split wide triangles first, the
cost is about the SQUARE of a triangle's span, and earcut fills a long band with fans: the jukebox's
first build was 1.1 M triangles, 786 k of them in one wall. Use `lib.ribbon` for a band along an
outline and `lib.holedBand` for a wall with a hole, and measure the count at every build.

**A planted drift has to exceed the tolerance you designed in.** A frame nudged 6 mm left no gap,
because it overlaps its cut by 7 mm. The check stayed quiet and was right to; the plant was wrong.

**Build the review sheet with the tool**, not a one-off:
`node wip/premium/review/review-prop.js <prop> [mock|factory|coded]` →
`wip/premium/shots/review-<prop>-<palette>.png` (room angle ×3, pure side, pure front, back ¾).
`coded` paints every role its own colour, the fastest check of a colour mapping.

| lamp | 28 | 2,038 | 0 |
| shelfContents | 25 | 3,154 | 0 |

The controller is ~5× the TV and ~15× the jukebox. Every prop but the binder has **no bump map at
all**.

**Stickers are out of scope for every prop except the controller.** That removes the 2048² atlas
upgrade, `StickerSurface`, the placement state machine and the measured 339 ms build from all of
this work. These rounds are simpler than the controller was, not equal to it.

---

## 2. The order

Owner-set, 22 Sep 2026. Rationale is theirs; tick and annotate as rounds land.

- [x] **1 · TV** — done 22 Sep 2026. Reshaped to the mockup: two masses with a real seam (proud
      `plate` face over a smaller `shell`), a heavy-bevel squircle, screen aperture + dark inner
      bezel, the mockup's control strip (oval tuner, two pips, remote eye, round volume knob), vents
      on the left flank only, four low feet, and **new ears** — `lib.droopEar`'s circular tube
      replaced by `lib.bunnyEar`, a hand-built crescent-section sweep. Both ears stand straight, on a
      spoon silhouette with a proud inner panel; the **inner ear takes the `shell` role**, which is
      what makes that colour visible from the couch at all. It also has an **idle**: three shuffled
      beats — ear flop, a curious sway left, a small hop with the feet splaying — never the same one
      twice running. Plus the § 4 shadow fix and the first prop bump map.
      **10,502 → 63,898 tris, 0 → 12 bumped materials** — past the controller, which is the bar.
      Harness 432 → **477**.
      Detail: `shared-implementation-notes.md` DD-20.
- [x] **2 · Dial** — done 23 Sep 2026. Reshaped to the mockup plus the owner's six in-session
      amendments. **The lid is the round**: a fixed cover over 70% of the deck with one 108° mouth,
      standing on a `collar` wall that closes the ring, so five or six games are out at a time and
      the other fourteen are simply somewhere under there — the owner's "it shouldn't be obvious how
      many are in circulation", solved by hiding them rather than by shortening the list (all 20
      cartridges are still on the carousel). Plus a **centre button** — circle, soft blob star,
      "Little Sylly" in bump-map relief — that presses in as the spin's first beat; the **neon rim
      strip kept and filled with all twenty brand hexes** (`lib.tex.spectrum`), brightening for the
      length of a spin; a **blank-until-loaded** readout on a raised housing; the mockup's **stamped
      skirt band**; and no rear ports. Colour sections re-mapped to the owner's four: shell = base /
      lid / collar / ribs / hood / button cap, plate = deck / hub / card holders, ears = skirt band
      + display housing, buttons = the star. The neon belongs to no role, deliberately.
      A new optional host effect `sfx(name)` carries the button's click
      (`wip/premium/prm-sfx.js`, synthesised, zero bytes).
      **Owner round 2b, same day:** slot mouths at BOTH ends of the opening so a
      cartridge visibly enters something instead of a solid block; the whole prop
      **24% flatter** (124 → 94 mm on an unchanged 394 mm span) with shorter cards
      seated a third of their height into taller rails; the spin hum cut, click
      kept; and the colour sections re-mapped a second time from a colour-coded
      render — shell = the body, plate = the lid's raised bumps + the readout's
      wedge, ears = the spinning disc and its slots, buttons = the star + the
      readout's bump. That round also turned up a **latent greybox bug**: the
      display housing had always been a solid wedge standing across 60° of the
      carousel, with every cartridge passing through it.
      **14,976 → 72,886 tris, 0 → 60 bumped materials.** Harnesses 477 → **538** and
      visual-prm 20 → **21** (the new one proves the audio hook actually fires).
      Detail: `shared-implementation-notes.md` DD-21.
- [x] **3 · Jukebox** — done 23 Sep 2026, **shape pass** (animation is the next pass — § 5).
      Reshaped to the mockup: an opaque lavender tub with a framed front WINDOW (the back of the
      record band is solid wall), ten records standing as spokes round a fixed column on a turning
      carousel, labels in the games' brand colours, a superellipse head with lens eyes and a nose,
      scooped cat ears (`lib.bunnyEar`) on pads that follow the head, and a separate faceplate with
      a placeholder waveform screen and five pastel transport buttons (play/pause, back, next, vol
      down, vol up — decorative until the full-size view). Colour sections, owner-mapped:
      shell = body, plate = window frame + bezel ring + eyes + nose, ears = ears + pads,
      buttons = the faceplate; the transport buttons and screen keep their own colours.
      **Door change (owner):** "clicking the jukebox anywhere is the door", so `jukebox-knob` now
      tags the whole body and answers with a bop (new action field `prop`); `jukebox-record`
      (`music.next`) stays on the carousel; the glass is never a pick target.
      Three new lib shapes: `roundPoly` (one corner list → hole, frame and faceplate, concentric by
      construction), `bend`, and the earcut-free `ribbon` + `holedBand`.
      **3,520 → 102,402 tris, 0 → 19 bumped materials.** Harnesses 538 → **572** and visual-prm
      21 → **22** (the new one proves the `prop` routing is live).
      **Owner round 3b, same day:** ears pulled in toward the crown; a real cat nose, puffy and
      proud, over an ω mouth; eyes with glints; a mirrored rainbow waveform that moves while music
      plays; the ten records **relabelled behind the back wall** as the carousel turns, so they
      carry every game with no per-game upkeep (the dial's trick); and a **three-beat idle** — a
      smiling slow blink, notes floating out as it sings and rocks, a roll round its bottom rim.
      72 meshes / 116,238 tris; harness 572 → **591**.
      Detail: `shared-implementation-notes.md` DD-22 (§§ 8–11 for 3b).
- [x] **4 · Phone** — done 23 Sep 2026, to the owner's mockup (`lounge props/mobile/phone.jpg`).
      **It rests CLOSED** — camera + flash near the hinge and a bubbly S badge on the lid — and a tap
      flips it open (a hinge clack, `prm-sfx` `phoneOpen`), lights an LCD menu whose highlighted
      row is *Shelves*, and **pushes the camera in on the screen** before the Shelves (new action
      field `open`, and a prop may now say where to look: `api.focusPose`). Rebuilt around a
      designed hinge — barrel on the lower half, knuckles on the lid, every lid point rising as it
      turns — with a pink control deck (soft keys, call/end, D-pad + OK), twelve pill keys with
      atlas legends, bezel, earpiece, speaker, port, side slot, volume rocker. Colour sections,
      owner-delegated: shell = body + hinge, plate = bezel / OK / soft keys / camera surround,
      ears = the S + volume rocker (+ the screen's mascot, drawn in it), buttons = keys + deck +
      D-pad ring. **Idle:** buzz (vibrates, flash pulses, an envelope floats up), snap (rears up on
      its near edge and fires the flash), clap (half-opens and snaps shut with a hop).
      **Scene B re-tuned** (owner's call, same brief): pan to the closed phone → flip → push-in,
      2.40 s, inside the 2.5 s line. `resetView` now resets any prop with `reset`, so a room
      walked back into has the phone shut.
      **3,254 → 67,738 tris, 0 → 5 bumped materials.** verify-prm-props 591 → **650**,
      visual-prm 22 → **26**; the other three unchanged.
      Detail: `shared-implementation-notes.md` DD-23.
- [x] **5 · Binder** — done 23 Sep 2026, to the owner's mockup (`lounge props/binder/binder.jpg`),
      together with a **prototype achievements feature** behind its door (owner's ask, same session).
      A butter-yellow quilted binder: displaced diamond puffs driven by one height function that
      also draws both canvases, a debossed ring-star-"Little Sylly" badge, braided cord piping round
      both covers and the spine ends, a round spine, a striped page block. **It opens onto the table
      for free** — cover about the spine axis by θ, spine by θ/2 — with a lift so it rests on its
      quilt rather than through it. Open: a rimmed sticker tray on the inside cover and four clear
      sleeves, both showing the real collection (`setCollection`). **Door change (owner-approved):**
      `binder` is `{ openStickerbook, optional, open, pushIn, fallback: 'openCover' }` — flip, push in,
      the stickerbook — via the phone's path generalised to `openProp(id)`; a `binderOpen` flump.
      Fixed colours; no roles. **Idle added the same day (owner):** a common peek (75%) and a rare
      reveal with god-rays and gold sparkles (25%) — DD-24 follow-up; verify-prm-props → **765**.
      **2,360 → 73,442 tris, 2 → 3 bumped materials.** verify-prm-props 650 → **716**,
      verify-shell 165 → **182**, visual-shell 87 → **117**, new verify-achievements **75**.
      Detail: `shared-implementation-notes.md` DD-24; spec/plan `2026-09-23-stickerbook-achievements*`.
- [x] **6 · Lamp shade** — done 24 Sep 2026, to the owner's mockup (`lounge props/photoshade/lamp.jpg`).
      Oak puck, frosted tube on a brass sleeve, a brass cage and **two staggered tiers of polaroids**
      on clips (photos still from `lamp images/`). Idle: the slow spin, plus a **jiggle** (every photo
      swings on its clip) and a **light** beat that throws the cage's shadows on the shelf's back
      panel. That shadow is **drawn, not cast**: a second shadow caster cost every frame even while
      dark, so the room keeps its one caster, the sun. Door unchanged.
      **2,038 → 13,342 tris, 28 → 16 meshes, 0 → 1 bumped material.** verify-prm-props 765 → **840**.
      Detail: `shared-implementation-notes.md` DD-25.
- [ ] **7 · Shelf contents** — contents undecided and not integral. **May be left entirely**,
      including past shipping the lounge to production.

**The room itself comes after the props** — couch, table, rug, window/curtain, plant. Owner's call:
see how the room reads against finished props before deciding how far to take it. Do not start room
work as part of a prop round.

**Owner's order to shipping (23 Sep 2026):** round 6 (lamp shade) → the room's environment assets →
ship and wire the lounge to production. **Deferred past wiring:** the dial's matching idle beats
(the dial is the one door prop without them — polish, not blocking) and the controller prop's
round (its design follows the Workshop, which waits on the prop-rooms pass in
`docs/deferred-work.md`). Profiles, sticker finishes and the prop rooms themselves come after too.

### The room pass — assessment and priority order (24 Sep 2026)

Reference: `wip/premium/lounge props/lounge/lounge.jpg` (owner's Gemini render) against
`shots/wide-1920.png`. **The gap is mostly light, not objects.** The mockup is lit high-key and
warm, with soft contact shadows everywhere. Ours has almost no ambient (`fill` hemisphere 0.035, exposure 0.56), so
everything the sun misses drops to brown-black, and nothing darkens where two surfaces meet, so
furniture floats. After light, the next gap is **texture scale**: the couch's bouclé bump reads as sand.
The mockup's reads as chunky loops about 1 cm across. Poly count and draw calls are not what's missing.

Room today (Node count): **68 meshes, 18,028 tris, 38 casters, 9 canvases ≤512²**. The props total
~240 meshes and ~407k tris. So the room has headroom in triangles; draw calls stay the budget (DD-25).

**Found:** `sun.shadow.radius = 3` is a no-op. r128's PCFSoft path for a spot light never reads
`shadowRadius` (checked in the vendored `three.min.js`). The shadow map only re-renders when dirty,
so a VSM blur costs something only on those rare updates.

Priority order. Each item is value per cost, at **our** camera (the couch is the frame's border and about 30% of
its pixels). All of it is Tier 1, procedural, **0 install bytes**:

1. ~~**Light and grade.**~~ **DONE 24 Sep 2026.** Warm fill and exposure lift, material-value
   separation (mauve couch, walnut table, peach wall, rust rug), a room-only saturation grade,
   contact shade (baked planes + in-shader box lists), and VSM sun shadows. Saturation
   0.23 → 0.34, no new draw call or caster. `verify-prm-props` → 866, `visual-prm` → 27.
   Detail: `shared-implementation-notes.md` DD-26.
2. ~~**Couch.**~~ **DONE 24 Sep 2026.** Bouclé loops ~1 cm across, sampled triplanar in object
   space (relief, cavity, and a warm window rim), and upholstered geometry (`lib.pillow`/`merge`/`seam`):
   crowned separate cushions on a plinthed base, a tight rolled back, fat arms, piping. It is 9 meshes
   and keeps the 8 names. The bouclé costs ~3% held-state. `verify-prm-props` → 905. Open: the arm
   height (0.58), and tight vs loose back cushions. Detail: `shared-implementation-notes.md` DD-27.
3. ~~**Coffee table.**~~ **DONE 24 Sep 2026.** The owner kept the honey tone rather than walnut: it
   keeps the table apart from the bench, where the mockup's woods blur together. The grain is in
   object space and drives colour, a slight relief and roughness, under a lacquer clearcoat. The top
   is 5 cm and fully rounded, over an apron, on tapered rounded-square legs. The tone is held within
   3/255 in the room shot. The grain costs ~4% held-state. `verify-prm-props` → 928. Detail:
   `shared-implementation-notes.md` DD-28.
4. ~~**Mug**~~ **DONE 24 Sep 2026.** A **koala**, not a cat (the owner offered panda or koala; a
   cat would repeat the jukebox, and a panda's black would be the darkest thing in the room). It
   sits on the table's free front-left corner and is room furniture (`prmBuildMug`, no pick id). It
   has a lathe body, a D handle, fluffy scalloped ears, a nose, eyes and cheeks, and coffee with a
   vertex-colour crema. Answer (d), the steam, is in: a shader billboard that rides frames already
   being drawn and stands still under reduced motion. Five meshes, ~11.7k tris. `verify-prm-props`
   → 973. Detail: `shared-implementation-notes.md` DD-29.
5. ~~**TV stand.**~~ **DONE 24 Sep 2026.** A mid-century oak media unit, to the owner's reference
   (`lounge props/lounge/LITVOTISOAK18_1__10933.webp`), which replaced a first, duller soft-block pass.
   It has a crisp top, two drawer fronts with a reveal, and an open centre bay with a shelf, on splayed
   tapered legs. The oak is a second `prmGrain`: warm light, satin, with fine straight rings. The bay
   holds the cassette deck (it had been sealed inside the old solid body) and a stack of game boxes,
   and its darkness is baked into vertex colours. The pull is a brass **acorn**, not the bunny,
   because the telly is already the bunny. `verify-prm-props` → 1008. Detail:
   `shared-implementation-notes.md` DD-30.
6. ~~**Wallpaper.**~~ **DONE 24 Sep 2026.** Scattered stars, a paper grain (in the colour and a light
   bump), and softer rainbow arcs: thin, soft-edged, muted tints, half-dropped. The tile is measured in
   metres and so are the walls' UVs, which fixed the side wall printing 30% narrower than the back. The
   paper's mean tone is held to the one the grade was tuned on. There is no measurable cost.
   `verify-prm-props` → 1025. Detail: `shared-implementation-notes.md` DD-31.
7. ~~**Cushions.**~~ **DONE 24 Sep 2026.** Four cushions, no face cushion:
   - a plum star square alone in the left corner;
   - a dusty-rose round, pleated to a button, lying flat on the seat at the near end of the left run,
     half out of frame;
   - on the right, a cream ditsy print with an ochre ticking lumbar leaning on it.

   Each is sewn (a stuffed bead edge, ears, tone-on-tone piping), creased and slumped, with a cloth
   sheen. Each is then settled on the couch's real curved surfaces, so it bulges and dents where it
   touches. The contact shade is baked from those same surfaces. It is one mesh on one 2×2 atlas
   (+1 mesh, +24.2k tris), and it adds no box to the couch and no box loop of its own. The owner
   reviewed it twice (7b, 7c). Cost: **~3.3% held-state in all**. `verify-prm-props` → 1089. Detail:
   `shared-implementation-notes.md` DD-32.
8. **Curtains.** ✅ Done 24 Sep 2026: linen weave, paw prints, tie-backs and a gathered pinch.
   - **Drawn OPEN**, a half tied back to each side, as in the mockup. This supersedes spec D5; the owner
     left the choice to Claude. The light rig is unchanged.
   - **The deep sill is gone.** The curtains ran through it (owner). The window has a painted frame
     and a 4 cm sill nose, with the cloth hanging in front. The cattails stand on a ledge on the back
     wall, past the back curtain.
   - **Cost:** ~2.8% held-state. Neither the cloth nor the bands receive shadow, which was a third of
     their cost for a lookup that could only say "lit".
   - `verify-prm-props` → 1131. The harness walks every curtain vertex against every solid nearby.
     Detail: `shared-implementation-notes.md` DD-33.
   - **8b, after owner review (24 Sep 2026):** ✅
     - The glass shows a soft-focus **garden**: a procedural texture looked up by view direction, so
       it sits at infinity beyond the wall.
     - The frame, rod and sill are rebuilt to the polished bar, to the owner's render: a moulded
       casing, a sash with brass pulls, an oak bullnose sill, a turned rod with a finial, brackets and
       rings, and brass tie-back hooks.
     - The plant and ledge are deferred (owner).
     - **Cost:** +1.4% held-state. `verify-prm-props` → 1149.
     - Detail: `shared-implementation-notes.md` DD-34.
   - **8c (owner, 25 Sep 2026):** ✅ The garden was too blurred. It is now painted only over the range
     the presets see, at ~2.5× the detail, with real structure (leaf clumps, a trunk, a clipped
     hedge, a flower bed, clouds). Only the sun's glare softens it. The frame cost is unchanged;
     the build is ~350 ms in the headless browser (DD-34 § 4).
9. ~~**Window light.**~~ **DONE 25 Sep 2026.**
   - A **bloom** sheet: a warm rim over the frame and the curtains' edges, and a flare where the painted
     sun hides behind the casing.
   - **Shafts**: three faint streaks from the opening to `R.sunPool`, which the sun spot now reads too.
   - Both are additive and static. Cost: +2.2% held-state for the shafts, the bloom within the noise.
     Saturation 0.378 → 0.416.
   - **Found:** round 1's window-glow point light had been swallowed by a comment on its own line and
     never lit. It is kept off: +3.2% and a changed look for every approved round. The rig is now
     asserted by name.
   - `verify-prm-props` → 1158, `visual-prm` → 29. Detail: `shared-implementation-notes.md` DD-35.
10. ~~**Slippers**~~ **DONE 25 Sep 2026.** **Puppy** slippers (the owner offered bears or dogs; a
    bear's round ears would repeat the koala). A merged pair, two meshes, 17.6k tris:
    - a cream plush bun toe, an open heel with a pink lining, and a dark welted sole;
    - floppy chocolate ears, a muzzle, a tongue, and an eye patch on one;
    - a child's pair (21.5 cm), stepped out of on the left couch: side by side, heels at its base,
      toes pointing away into the room (owner review, 25 Sep 2026: staggered toes-to-camera read as
      walked, not left).

    Placed by raycast from the wide preset: the visible strip is ~20 cm wide. Cost +1.5% held-state.
    `verify-prm-props` → 1200. Detail: `shared-implementation-notes.md` DD-36.
11. ~~**Rug recolour**~~ **DONE 25 Sep 2026.** `tex.braid` is now a pixel field: 34 three-strand ropes
    in muted bands (rust, ochre, cream, terracotta, brown; no purple, which belongs to the props), a
    chevron lump per strand, and the same height field as its bump. Softened after owner review
    (`soft`/`relief`: less band contrast and shallower grooves) so it sits back as a background item. The disc's tone is held to the
    old rug's mean (`#966b4c`), so the grade is untouched. Cost +0.8% held-state. `verify-prm-props`
    → 1206. Detail: `shared-implementation-notes.md` DD-37.
12. ~~**The bookshelf unit**~~ **DONE 25 Sep 2026.** The owner split the item: this round is the unit
    itself, to the table's and the stand's finish, with nothing new on it. Its birch is grained in
    object space (`mats.birchGrain`), paler than the bench's oak and in the same program as it. Every
    edge is rounded and the top has a bullnose. The back is one plain panel (the owner found planks too
    busy) with the grain running up it. As in the owner's mockup, a base board sits under the lamp's board,
    so the lamp is second from the bottom. It has no apron: the sides stand as legs, and under the base
    a short (8 cm) shadowed gap runs to the floor, kept EMPTY on purpose (`prmShelf.under`). The back skirting now stops at the sides. Each bay's darkness is baked
    into the vertex colours, as the bench's bay is. The first build had 13.3k triangles and cost +4.6%
    held-state; trimmed to 4.5k, **+1.8%**, with no visible difference at 2×. `verify-prm-props` → 1244. Detail: `shared-implementation-notes.md` DD-38.
13. ~~**The ledge plant**~~ **DONE 25 Sep 2026.** Built to the owner's render (`lounge props/lounge/plant.png`),
    measured against its pot (100 px = 8 cm): a butter-yellow pot 1.55× as tall as it is wide, with a
    rounded foot and a flush mint rim; six broad, channelled mint strap leaves; three lilac heads,
    each four soft lumps. The centre head has a green spike, the left leans out and the right hooks over. The
    whole plant is 3.3 pot widths tall, set 1.2× in the room to match the lounge mockup's size.
    Four meshes (pot, soil, the green merged, the heads merged), down from ~17; the heads take the
    cushions' cloth sheen as their fuzz. The ledge is now `lib.pillow` in `mats.birchGrain`, the
    shelf's finish. 3.9k triangles; held-state within noise (−1.1% / +0.8%). `verify-prm-props` →
    1251. Detail: `shared-implementation-notes.md` DD-39.
14. ~~**The TV stand's bay contents**~~ **DONE 25 Sep 2026**, to the owner's two renders
    (`lounge props/lounge/play max.png`, `floppy disc box.png`).
    - The shelf holds the **Play-Max 2000**: the round-5 deck polished to the render, with softer
      edges, a mauve label panel reading "PLAY-MAX 2000", a gold slot, a green LED and five pastel keys.
    - The bay floor holds a **floppy-disk box** instead of the game-box stack, which read as the
      shelf's books. It has a mint base and hinge knuckle, a smoked acrylic lid (`cubbyLid`, its own
      transparent mesh), and nine pastel labelled disks leaning back. It is turned three-quarter on.
    - Beside it, at owner request, is plain filler: three sticky-note pads and a pencil.
    - The text comes from one small atlas on `mats.cubby` (`tex.cubbyAtlas`), so the cubby is still
      one mesh.
    - It went from 1.9k to 2.8k triangles; held-state was +1.1% / −0.0% (noise).
    - `verify-prm-props` → 1260. Detail: `shared-implementation-notes.md` DD-40.
15. **Shelf dressing.** **Done (25 Sep 2026)**, to the owner's brief rather than a render: "fill out
    the top two shelves" with books and fun things, and no people, characters, lights or lamps.
    - The middle bay holds hardbacks, a rocket, a brontosaurus on a book stack, and shape blocks.
    - The top bay holds paperbacks, an elephant, a desk globe, a duck, a penguin and a turtle.
    - The round-1 boxes and the trinket seam are gone; easter eggs are deferred.
    - It is two merged meshes that take the room grade, with the bay's darkness baked per vertex
      from the shelf's own `S.cav`. That comes to 8.3k triangles.
    - `verify-prm-props` → 1322. Detail: `shared-implementation-notes.md` DD-41.

Out of reach procedurally: true bounce light and colour bleed, pairwise contact shadowing between
every object, fibre detail at close range, window bokeh (omitted by the owner). The only real path to
the first two is a Blender-baked lightmap: Tier 2, ~0.3–0.6 MB runtime-cached, and it must be
re-baked on every room change. Not recommended.

**Owner's answers (24 Sep 2026):** (a) yes, lift D7 and the saturation rule, because the room
reads flat. (b) Procedural-only, as long as it gets close. (c) **No face cushion.** Star cushions,
or a better design; the point is that the couch shouldn't feel empty. (d) **A tiny steam animation
on the mug**, if it's cheap: the goal is a room that feels alive and welcoming. It is new motion, so
reduced motion and timer lifecycle apply.

---

## 3. The shape of one round

Repeatable. Each round is one prop, one session.

1. **Take the reference.** The owner supplies the current mockup in-session. Read it against the
   built prop and write down, in one short list, what is *wrong-shaped* versus what is *thin* —
   they are different fixes (a builder rewrite versus a density-and-bump pass).
2. **Ask before reshaping anything that is a door.** A prop's pick ids are wired into
   `PRM_ACTIONS`, the host contract and the harness. If the mockup implies removing or moving one,
   that is a routing decision and it is the owner's, not a silent casualty of the shape work.
3. **Shape.** Rewrite the builder in `wip/premium/prm-props.js`. Stay inside `prm-lib`'s vocabulary
   (`moulded`, `extrude`, `roundedRect`, `smoothNormals`). Density is expected to rise a lot —
   the baseline table is the yardstick.
4. **Surface.** Add a procedurally-drawn bump map (and a colour map only where one earns it) using
   `prm-lib`'s existing canvas-texture helpers. Keep `roughness: .52, metalness: .06` unless the
   prop is genuinely a different material.
5. **Grow that prop's section in `wip/premium/verify-prm-props.js`.** Named children, footprint,
   `setDesign` purity. Harnesses cover structure and contracts, **not** how it looks —
   don't assert prettiness.
6. **Screenshot gate.** Fresh shots at 1280 and 1920 via `visual-prm.js`, plus the shell at
   `wip/lobby-lab/shell.html` so the prop is seen in the room it lives in, not in isolation.
7. **Close the round.** Re-run the full set (§ 4), re-measure the baseline row, tick the box above
   with a one-line result, and write the round up per the Implementation Notes skill —
   `shared-implementation-notes.md`, since these are `wip/` and engine-adjacent, not one game's code.

---

## 4. Standing constraints every round inherits

- **No image assets.** Procedural only. If a prop genuinely cannot be reached procedurally, that is
  a cost-envelope conversation (`docs/cost-envelope.md`), raised as its own decision — not absorbed
  quietly into a round.
- **Nothing under `js/`, `src/screens/`, `index.html` or `sw.js`.** These rounds are sandbox work.
  Production wiring is a separate, later initiative and is gated behind
  `wip/premium/OWNER-REVIEW-2.md`.
- **Reduced motion is checked in JS, not CSS.** Any new animated beat must honour
  `prefers-reduced-motion` itself — show the end state, skip the journey
  (`ui-style.md` § Motion Standard; `prmReducedMotion()` is already wired).
- **Timer lifecycle.** Any new RAF, interval or timeout is cleared in `dispose()`
  (`logic-engine.md` § Timer Lifecycle).
- ~~**⚠️ Shadows: a known bug, fix it in round 1.**~~ **FIXED in round 1, 22 Sep 2026** — `frame()`
  now sets `shadowDirty` whenever a prop moves (the hover/turn tweens and any prop `tick()`), and
  deliberately not for a camera tween. Kept below for the record:
- **⚠️ Shadows: a known bug, fix it in round 1.** `shadowDirty` in `wip/premium/prm-scene.js` is set
  in only five places — init, texture load, hover, resize, `setDesign` — and **never by any prop's
  `tick()`**. So every animated prop (the binder's cover, the lamp's spin, the record, the dial)
  animates against a frozen shadow map and only catches up on the next unrelated hover. That is the
  visible delay when the binder opens. Spec § 11 already specifies the right behaviour — *"set
  `needsUpdate` only when a prop moves"* — it was simply not implemented. Roughly a one-line fix in
  `frame()`; fold it into the TV round rather than leaving it behind four other props.

**Verification set for closing any round:**

```
node wip/premium/verify-prm-props.js          # 1200 after room item 10; 1089 after room round 7; 928 after room round 3 (905 after round 2, 866 after round 1, 840 after round 6 (765 after the binder idle, 716 after round 5, 650 after 4, 591 after 3b, 572 after 3, 538 after 2, 477 after 1))
node wip/lobby-lab/verify-shell.js            # 182 (165 before round 5)
node wip/lobby-lab/verify-achievements.js     # 75 (new in round 5)
node wip/lobby-lab/verify-lounge.js           # 919
NODE_PATH="$HOME/.claude-tooling/playwright/node_modules" node wip/premium/visual-prm.js      # 27 (26 before room round 1)
NODE_PATH="$HOME/.claude-tooling/playwright/node_modules" node wip/lobby-lab/visual-shell.js  # 117 (87 before round 5)
```

---

## 5. Recorded, deliberately not decided

These are known and parked. Each belongs to the round named, and is the owner's call when it
arrives — not something to resolve in advance.

- ~~**The TV's dials may be doors the mockup does not have.**~~ **CLOSED, 22 Sep 2026** — the
  reference has knobs. `tv-channel` and `tv-volume` keep their doors unchanged; nothing to re-home.
  (Open question for a later round: the mockup's four front controls are four *different* colours,
  where the `buttons` role paints one. Round 1 gave the two **dials** the role and left the two
  decorative pips as fixed pastel trim — an owner call if they'd rather all four were customisable.)
- ~~**Scene B may need a re-tune after the phone round.**~~ **CLOSED, 23 Sep 2026** — the owner's
  round-4 brief settled it ("this changes how scene B plays out"): pan → flip → push-in, 2.40 s.
  Kept below for the record:
- **Scene B may need a re-tune after the phone round.** The arrival beat pans to the clamshell and
  its end framing reads because the screen is open and says "Shelves". A phone that starts closed
  changes the target, and `PRM_ACTIONS.phone` currently fades straight out where a flip-then-fade
  would be a new choreography beat. **Owner's call (22 Sep): finish the phone touch-up first, then
  decide whether a re-tune is needed.** Do not pre-emptively re-aim the beat.
- ~~**No phone mockup has been located.**~~ **CLOSED** — supplied in-session as
  `wip/premium/lounge props/mobile/phone.jpg`.
- **No phone mockup has been located.** It may be in `wip/premium/LSG-premium layout-180926-014238.pdf`.
  Ask before round 4.
- **The jukebox door, at production (owner, 23 Sep).** The owner's picture: tapping the jukebox
  anywhere opens a **full-size jukebox** view inside the lounge (widescreen gives the room for it),
  consistent with how the Workshop opens from the controller. That view is where the five faceplate
  buttons come alive. Whether `jukebox-record` (`music.next`) survives as a separate door, or folds
  into that view, is part of the same rethink. Sandbox today: body = `openJukebox` (dormant, bops),
  carousel = `music.next`.
- ~~**The jukebox's animation pass.**~~ **DONE in round 3b**: smile, sing, roll, the moving
  waveform, and every game carried on ten records by relabelling behind the wall. Still open if
  wanted: a SOUND for the song (a new `prm-sfx.js` voice, never an AudioContext in the builder; the
  owner cut the dial's hum, so ask first), and turning the now-playing game's record to the front.
- **The phone's size in the room (owner, open).** It is built at real size (56 × 100 mm). Open, the
  greybox stood its screen up and read from the couch; closed, it is ~30 × 50 px at 1280 — it reads
  as a closed flip phone, but it is the smallest door in the room. The other props are chibi-scaled
  (the telly is 58 cm wide). A `scale` on `PRM_PLACES.phone` would be the one-line lever; not
  pulled without the owner, since it is room composition, not the prop.
- **The jukebox screen** is a placeholder waveform plus the now-playing title by the owner's word;
  its real content arrives with the jukebox/karaoke feature.

---

## 6. Where this sits

Scene B (the phone tier's one-way arrival beat) is built and green as of 22 Sep 2026 —
`shared-implementation-notes.md` DD-19. These prop rounds are quality work on the same sandbox and
block nothing. **Production wiring remains gated behind `wip/premium/OWNER-REVIEW-2.md`**, whose one
question — does the room pass the ninety-second test — is still unanswered; it is reasonable for
that answer to wait until the props are worth judging.
