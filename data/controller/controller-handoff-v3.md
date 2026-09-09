# Controller rebuild — session handoff (v3)

**Project:** Little Sylly Games — 3D controller icon / sticker customiser for the title page
**Status:** Sticker placement, thickness, keep-outs, and a first-pass Controller
Customiser (colour picker) are all working in the prototype. Rotation and
distortion had real, now-fixed bugs — read §3 before touching either again.
**Next step: PWA integration**, being done directly against the project
folder rather than continuing in this prototype.

This supersedes v2. Section 1 gives the short version. Section 2 covers what's
still true from v2 unchanged. Section 3 is everything that changed this
session — the largest part of this document, because most of it was bug
fixing, and the reasoning behind each fix matters if the symptom ever comes
back. Section 4 is what's still outstanding, including things v2 asked for
that were **not** built this session. Section 5 is gotchas. Section 6 is
where to start.

---

## 1. Short version

- Placement now works end to end for a single sticker: pick one from the
  tray, tap the shell to place it, hold and drag to rotate the view instead.
  A live preview shows where/how big/valid before you commit.
- Sizing is now honest: the slider value is always the size you get, or the
  placement is refused outright. Nothing silently shrinks anymore.
- A real, longstanding rotation bug was found and fixed this session:
  stickers were landing a quarter-turn off from upright, on **every**
  placement, not just some. It was probably always there; it only became
  visible once an earlier fix made rotation *consistent* across the surface,
  so the one systematic error stopped hiding inside noise.
- A real, longstanding curvature-measurement bug was found and fixed:
  finite-differencing the surface's Gaussian curvature right at the crest
  (which has a genuine sharp edge) produced erratic, wildly inflated noise,
  not a stable number. This was likely responsible for a meaningful chunk of
  "why is this sticker distorting, the surface looks smooth" confusion.
- Ears now accept stickers on **both** faces (front and back cap), not just
  one.
- There's a first-pass colour customiser: Controller / Faceplate / Ears /
  Buttons, each with a preset swatch palette. Explicitly a placeholder —
  real brand colours are a PWA-integration task.
- **What v2's §4.1 asked for and this session did NOT build:** select an
  already-placed sticker, move/rotate/scale/delete it, undo, persistence,
  a sticker-count cap, layering UI for overlaps. All still open. See §4.

---

## 2. Unchanged from v2 — still true

- Files: `standalone.html` (the working prototype, with `body.js` and
  `sticker-surface.js` **still duplicated inline** as its first two
  `<script>` blocks — this was never cleaned up this session either;
  removing it is still explicitly a PWA-integration task), `body.js`
  (geometry), `sticker-surface.js` (sticker math, no Three dependency),
  `controller-three.html` (old build, reference only).
- The body is a height field over a signed distance field, two sheets
  (front/back) meeting at `z=0` along the crest. `roll(d) = sqrt(1 - (1 -
  d/RIM)^2)` — a genuine quarter-circle profile with infinite slope at
  `d=0`. **This detail matters more now than it did in v2** — see §3's
  `gaussK` fix, which exists specifically because of that infinite slope.
- Atlas layout, warp, and padding are unchanged: two islands (front `v`
  0.51–0.99, back `v` 0.01–0.49), arc-length warp over the outer `WARP_D`
  band, `padPairs()` bleeding the seam. Nothing this session touched any of
  that.
- The two-chart split (tangent for one sheet, rim for wraps crossing the
  crest) is unchanged in concept. What changed is what feeds the tangent
  chart's own basis and how `plan()` decides between them — see §3.
- Ears are still their own mesh with their own 1024² texture and plain
  canvas 2D drawing, not the surface rasteriser. What changed: which parts
  of that geometry count as stickerable, and a real bug in how sticker
  height stacks there. See §3.

---

## 3. What changed this session

### 3.1 Placement UI got built

v2 left this at "raycast → `plan()` → stamp, no selection, no undo." This
session added the actual interaction:

- Selecting a sticker from the tray **arms** it (button highlights). While
  armed, a tap places it; a press-and-hold-and-drag of any length rotates
  the view instead, at any point, without needing to toggle a mode. This
  replaced an earlier "Place mode" checkbox that made dragging to look
  around impossible while it was on — that was the whole original
  complaint and this is the fix.
- Click-vs-drag is a simple movement/time threshold
  (`CLICK_MOVE_MAX=6`px, `CLICK_TIME_MAX=350`ms) checked between
  `pointerdown` and `pointerup`.
- A live preview shows position, size, and validity before committing —
  see §3.5 for its history, because it broke three separate ways before
  landing on something worth keeping.
- **Not built:** selecting an *already-placed* sticker, moving it, deleting
  it, undo, or persisting `placed`/`earPlaced` to anything. Placing is a
  one-way append to an array that lives only in memory. This is the
  single biggest gap between what exists now and what a real game needs —
  see §4.1.

### 3.2 Sizing and distortion: the philosophy changed

v2's `plan()` used to shrink a requested size until it fit, then cap it
again against local curvature — the result always looked equally crisp, but
the same slider value came out a different real size depending on where you
clicked, with no visible reason why. That's gone.

`plan()` now returns `{ok, reason, chart, size, x, y, distortion}`
instead of `null` or an object with no validity flag:

- `ok: true` → `size` is **always exactly what was asked for**. Never
  shrunk. `distortion` is a reported *estimate* (see below), never used to
  change the size.
- `ok: false` → `reason` is one of `'off'` (off the body), `'ring'` (a hard
  keep-out disc — see §3.6), `'edge'` (reaches the crest, can't wrap
  cleanly at this size), or `'curve'` (measured distortion exceeds
  `maxDistort`, currently **0.14**).

This matches how a real sticker actually behaves: it doesn't shrink itself
to stay crisp, it distorts, and now so does this one — visibly, which is
the honest version of what was happening anyway.

`flatDistortion()` (the estimate feeding the `'curve'` refusal) was also
rewritten for stability, independent of the philosophy change: it used to
sample 8 probes and take the outright max, which aliased — moving the
cursor a hair could swing a probe on or off a sharp feature and flip the
verdict, which is what "it refuses, I nudge, now it works" felt like. Now
it's 37 probes across three rings, reduced by the mean of the worst
quarter, which rises properly for a genuinely curved region but ignores a
lone spike.

### 3.3 Rotation: a real, longstanding bug, found and fixed

**The bug:** in the tangent chart, the sticker's own "up" was wired to the
world surface's *sideways* tangent, and the world's *up* tangent was wired
to the sticker's *right* edge — every placement at rotation 0° landed a
quarter-turn off. Verified numerically on the actual geometry (not just by
inspection): at a representative flat-deck point, `T` (meant to be "up")
measured `(0, 0.998, -0.069)` — correctly pointing up — while `Bv = N×T`
(what was being fed to the image's vertical axis) measured `(-1, 0, 0)` —
world *left*.

**Why it was invisible until now:** this bug almost certainly predates this
session. Before an earlier fix in this same session (§3.4, `tangentFrame`),
the reference direction used to build the local rotation basis was computed
by projecting a fixed world vector onto the tangent plane at each anchor —
which rotates unpredictably as the surface normal changes, i.e. differently
at almost every point on a doubly-curved shell. That randomness scattered
this systematic error into what looked like noise — never clean enough to
notice as *one* consistent mistake. Once rotation became position-
independent, the single fixed error stopped hiding and showed up as an
entire column of identical stickers all facing the same wrong way.

**The fix**, in `makeChart`'s tangent branch (`sticker-surface.js`):
swapped which vector feeds which axis, with a sign flip to keep it a
rotation rather than a mirror:

```js
// before:
let a = dv·T;   let b = dv·Bv;
// after:
let a = -(dv·Bv);  let b = dv·T;
```

Smoke-tested clean across 2,000+ synthetic placements at non-zero rotation.
**Not independently verified by eye** — I cannot render this environment.
If it's still not quite upright when you look at it, the fix is in exactly
one place (`makeChart`'s tangent branch) and the sign is the thing to try
flipping first.

### 3.4 Rotation consistency (earlier in the session, prerequisite to 3.3)

Before the bug above was found, rotation *varied* by position in the first
place: the old tangent-plane basis was built by projecting a fixed world
"up" vector `(0,1,0)` onto the local tangent plane, falling back to
`(1,0,0)` once the normal tipped past a threshold. That projection rotates
every time the surface normal does — which is continuously, on a
doubly-curved shell — so the same rotation slider value pointed a visibly
different way in different spots.

Replaced with `tangentFrame(x, y, back)`, exported from
`sticker-surface.js`, using the **analytic surface tangent** (`∂P/∂y`,
via finite difference of `point()`) instead of a projected reference
vector. This is already *in* the tangent plane by construction — no
projection, no arbitrary fallback — and turns smoothly with the surface,
the same way a UV tangent basis works for normal-mapping in any other
engine. Both `makeChart` and the live preview now read from this one
function, so they cannot independently drift from each other again.

### 3.5 The live preview — three bugs, then a redesign, then restored

History, because the sequence matters if something in this area looks
wrong again:

1. **Off-centre.** The preview mesh is a child of `rig` (the group that
   carries the model's own rotation), but was being positioned with
   world-space coordinates — so `rig`'s rotation got applied a second time
   on top of coordinates that already included it. Fixed by converting the
   raycast hit into rig-local space before use (`toRig()`).
2. **Purple shapes chewing into the preview.** The preview is a flat plane
   sitting on a curved shell; wherever the shell bulged up inside the
   plane's footprint, the shell won the depth test and poked through. Not
   an invisible keep-out zone — the controller itself, in front of the
   preview. Fixed with `depthTest:false, depthWrite:false`, drawn last
   (`renderOrder:999`) — it's UI, not part of the scene.
3. **A visible jump right at the wrap boundary.** The preview always used
   the flat-surface `tangentFrame` basis, even for a placement about to
   become a wrap — but a real wrap orients along the **outline's own
   tangent**, a different basis entirely (see `outlineAt()`-based
   construction in `updateGhost`). Fixed by giving wrap previews their own
   basis, built the same way the real rim chart is.
4. **A reported cursor/preview position mismatch.** At this point, three
   different bug mechanisms in the same subsystem was a signal, so the
   oriented plane was **replaced with a plain, rotation-invariant circle
   marker** for one round — position, size, and valid/invalid, nothing
   else, so there was no orientation left to get wrong.
5. **Restored to the oriented plane** once §3.3's rotation bug was found
   and fixed. The insight: the plane's matching logic in points 1–3 was
   never actually wrong on its own terms — it was faithfully matching a
   target (the tangent chart's rotation convention) that was itself
   broken. Fixing the target made the oriented preview worth trying again.
   The current version keeps everything from 1–3 (rig-local space, no
   depth test, its own wrap-case basis) and updates the tangent-case
   formula to match §3.3's fix exactly:

```js
// image-right direction:  T*sin(rot) - Bv*cos(rot)
// image-up direction:     T*cos(rot) + Bv*sin(rot)
```

**Not independently verified by eye**, same caveat as 3.3 — they're the
same underlying fix, so if one is right the other should be too, but
neither has been rendered and looked at by me.

### 3.6 Keep-outs: grips were added, then explicitly rolled back

Mid-session, a hard keep-out zone plus a painted rubber texture was added
for the grip swells (an "Option A: make genuinely-too-curved areas
off-limits and look the part" approach). **This was deliberately rolled
back** at Sam's request — it produced too many spots that felt like they
should be placeable but weren't. Curvature alone decides now; there is no
grip-specific exclusion in the current code.

What **does** remain as a hard `ring` exclusion (unchanged from v2, just
confirmed current): both stick wells (`r=0.33`, front only, at
`(-1.25, 0.20)` and `(1.25, -0.85)`), and both ear bosses (`r=0.45`, back
only, at `(±0.84, 0.84)`).

### 3.7 Curvature measurement had two real, separate numerical bugs

Both were found by walking the actual measured numbers, not by inspection —
worth doing the same before touching either of these functions again.

**a) The outline's curvature table (`OUT.kap`, feeding `wrapCap` and the
rim chart's along-edge "fan" correction) had a spurious single-sample
spike.** Measured directly: two isolated points, one near each ear, reading
around **-2.9** against neighbouring values around **+0.45** — a
near-degenerate triple in the 256-sample resampled outline throwing a
curvature reading from floating-point noise, not real geometry. This was
very likely the cause of "sometimes wraps fine, sometimes cuts the sticker
in half" near the ears, since it depended on exactly which sample an
anchor's own arc position landed near.

First attempt at a fix — a 9-tap moving average plus a hard clamp to ±1.5 —
was **wrong**, and it's worth understanding why: a second scan across the
*whole* outline (not just near the ears) found a ~170-sample-wide stretch
also pinned at that clamp, which turned out to be the grip corner — a
genuine, sharp, legitimate feature this code already treats as a real hard
limit. The clamp had quietly softened it.

Fixed properly with a **5-tap median filter** instead of a mean or a clamp:
a median survives exactly this distinction. The ear spike is one sample out
of five in its window, so the window's median is one of the four normal
neighbours and the spike disappears regardless of its magnitude. The grip
corner is the same value across many consecutive samples, so its own
median is itself — a wide real feature passes through unchanged. Verified:
ear region is now smooth with no spike, and the grip corner's true peak
(1.80) is restored, not flattened.

**b) `gaussK()` — the per-point Gaussian curvature used by
`flatDistortion` — is numerically unstable near the crest.** `roll(d)` has
a genuine vertical tangent at `d=0` (a real rounded edge, correct by
design), but a fixed `h=0.03` finite-difference stencil sampling across
that kink doesn't converge toward "very curved" as you approach it — it
goes unstable. Walking one point from `d=0.20` down to `d=0.005` measured
`1.8, 1.0, 5.4, 1.7, 14.6, 2.2, 6.0` — no trend, just noise. This directly
inflated distortion estimates and refusals anywhere near an edge,
independent of the outline bug above (different code path entirely: this
is the surface's own Hessian, not the outline's resampled curve).

Fixed with a value clamp at **8** — chosen because every value measured
elsewhere on the shell, including genuinely curved spots (grip bulges, near
the ears away from the exact crest), topped out around 5.5; the clamp sits
comfortably above every real feature and well below where the instability
starts. Verified concretely: the ear-side strip that had been flagged as
distorting dropped to a worst-case of 3% after this fix.

**Read together, a) and b) were very likely the concrete, fixable core of
the recurring "why does the image warp, the surface looks smooth" reports**
— not purely the physical fact that a doubly-curved surface (the shell,
almost everywhere, since it's not a simple cylinder) can't take a flat
sticker without *some* real distortion. Some real distortion is still
physically correct and will remain in the tightest spots; these two fixes
remove the part of it that was numerical noise rather than geometry.

### 3.8 Ears: both caps now, plus a real "puffy" bug

**Both faces stickerable.** Previously only one ellipse cap (called the
crown) accepted stickers; the opposite cap was parked as bevel/side. Now
both do. Which local cap (`+Z`/`-Z` in the ellipse's own space) is "front"
vs "back" is read off **the mesh's own actual rotation** at build time
(`m.userData.earQ`), not assumed — this self-corrects if `buildEars`'
tilt constants ever change. UV layout is a 2×2 grid per the 1024² ear
canvas: columns are left/right ear, rows are front/back cap.

**The "puffy, blown-out" look was a real bug**, not just an inherent
property of the flat-cap technique: ear sticker height was composited with
canvas blend mode `'lighter'` (additive), which **sums** every overlapping
sticker's contribution — a stack of a few overlapping stickers saturated to
solid white over a spreading area. Switched to `'lighten'` (per-pixel
**max**), which is the correct "tallest wins" semantics and cannot blow
out regardless of overlap count.

**Ear brightness ("faded/too light")** was investigated but not fully
resolved. Ruled out: material parameters (`roughness .52, metalness .06,
bumpScale .035`) are identical between the shell and ear materials — not a
material bug. Best remaining explanation, not independently verified by
render: the ears sit tilted at a different angle than the surrounding
shell, so the single scene `DirectionalLight` legitimately hits them more
directly — expected, not a stray light. The Ears colour swatch (§3.9) is
available as a practical lever regardless of root cause.

### 3.9 Controller Customiser (new this session)

A first-pass colour picker with four independently-recolourable groups,
each a swatch row against a shared preset `PALETTE` array (8 hex colours).
**Explicitly a placeholder** — Sam will supply real brand colours during
PWA integration.

- **Controller** → the shell atlas's base fill (`shellColor`, in
  `redraw()`). Recolouring repaints the canvas fill rather than setting
  `material.color` — the shell material's colour would multiply its whole
  map, stickers included, tinting every placed sticker to match.
- **Faceplate** → the painted deck-plate inset (`plateColor`). Confirmed
  this is **purely a texture region**, not real geometry — a scaled-down
  copy of the outline polygon (0.88/0.87 toward centre), drawn before
  stickers so they can still land on top of it. No physical edge, no step,
  no self-shadow; that's an intentional, documented trade-off from
  wherever this was originally built (the comment in the code says as
  much), not something introduced this session.
- **Ears** → the ear atlas's base fill (`earColor`, in `earRedraw()`).
- **Buttons** → both sticks, both stick wells, the whole d-pad **including
  its hub** (a separate, unnamed material found via its parent mesh rather
  than by name, since the hub itself was never given one), and both
  shoulder buttons. Found by the `.name` values `body.js` already assigns
  for its own press logic (`'L button'`, `'R button'`, `'D-pad'`, `/
  stick$/`, `/ well$/`), not by changing `buildControls`'s return value.
  Recoloured via direct `material.color.setHex(...).convertSRGBToLinear()`
  — safe here because these are solid, untextured materials with no
  sticker paint sharing them, unlike the shell/plate/ear atlases.
  Deliberately excluded: Select/Start (`MENU` material) and the four face
  buttons (their own individual accent colours are presumably intentional
  and weren't asked to change).

### 3.10 Sticker thickness / "puffiness" — final approach

This went through several complete redesigns before landing; the final one
is a genuine height (bump) map, not baked shading:

- A second canvas/texture pair (`bumpCanvas`/`bumpTex` for the shell,
  `earBump`/`earBumpTex` for the ears) is fed to each material as
  `bumpMap`, alongside the existing colour map. Colours themselves are
  painted **completely flat** now — no baked highlight, shadow, or bevel
  of any kind survives in the colour atlas. All apparent thickness comes
  from the renderer lighting the height map's slope, which is why it
  responds correctly to the actual light as the model turns, unlike every
  earlier baked-shading attempt.
- Shell: per-texel, in `stamp()` — height is the sticker's own alpha,
  averaged over a small ring (`LIP = 0.055`, a fraction of the sticker
  radius) to turn the cut edge into a short ramp rather than a one-texel
  cliff. Overlaps combine via **max** ("tallest wins"), correctly, from
  the start.
- Ears: 2D canvas blur approximation of the same idea (§3.8's fix applies
  here — must stay `'lighten'`, not `'lighter'`).
- `bumpScale: 0.035` on both materials is the single number to turn if the
  thickness reads too strong or too subtle once actually rendered.
- **Not implemented, and explicitly discussed with Sam:** true
  *accumulating* height where overlapping stickers read as physically
  stacked layers (two overlaps = twice as tall). The current system is
  "tallest sticker at each point wins," not "heights add." Sam's
  clarification was that natural stacking height was the actual ask —
  this remains a genuine gap between what was requested and what's built,
  flagged but not resolved this session. Changing `stamp()`'s height
  combine from `max` to a bounded sum is the likely fix, if picked back
  up; ceiling it to avoid the same kind of blow-out fixed in §3.8 for
  ears.

### 3.11 A crash, found and fixed: `d0 is not defined`

Introduced when `tangentFrame` (§3.4) was factored out of `makeChart`: the
folding guard inside `makeChart`'s returned closure still referenced `d0`
(the anchor's own depth), which had moved into `tangentFrame`'s scope and
was never returned. Every sticker whose footprint touched the rim hit this
and threw, which is also why placement was refused in many spots that
weren't actually curvature problems. Fixed by having `tangentFrame` return
`d0` alongside `P0, N, T, Bv`. Verified by exercising `makeChart` across
1,000+ points with zero exceptions.

### 3.12 Button presses reachable through the back of the shell

`tryPress()` raycast only against `controls.pressables`, with nothing
checking whether the shell itself was in the way — so a front button's
ray could be hit through empty space while the controller was rotated to
show the back, since the shell was never actually between the camera and
*that specific ray*, only between the camera and the view of it. Fixed:
the same ray is also cast against `body`, and the press is refused if the
shell hit is closer than the button hit.

---

## 4. Outstanding work

### 4.1 The full placement lifecycle — still not built

v2 asked for this and it's still open, effectively unchanged:

- Select an already-placed sticker, move it, rotate/scale it in place,
  delete it.
- Undo/redo.
- **Persistence** — `placed` and `earPlaced` are in-memory arrays with no
  save/load of any kind. This is almost certainly required before PWA
  integration is meaningful, since a page reload currently loses
  everything.
- A picker driven by an actual earned-sticker inventory, rather than the
  fixed `SRC` object of test images.
- Overlap layering UI (bring-to-front/send-to-back) — overlap itself is
  still allowed by design (v2's reasoning holds: testing curved-surface
  intersection is fiddly and would reject placements inconsistently right
  where players find it most interesting), but nothing lets a player
  manage the resulting stack.
- A sticker-count cap — with overlap allowed, this is the only thing
  bounding how busy a controller gets. Still an open design lever, not a
  number anyone has picked.

### 4.2 PWA integration — the actual next step

Per v2, still true, nothing resolved this session:

- Decide: Three.js from CDN vs. vendoring
  (`npm install three@0.128.0` matches the exact version this whole
  session's testing harness used).
- Decide: base64 sticker images vs. the generate-everything convention.
- **Remove the `body.js`/`sticker-surface.js` duplication** in
  `standalone.html` — still duplicated, still a real risk of silently
  running stale code if only one copy gets edited. This session hit that
  risk directly: every single fix in §3 had to be applied to both copies
  by hand, twice, every time.
- Mobile: touch handling was not specifically tested or tuned this
  session. The click-vs-drag logic (§3.1) uses standard Pointer Events,
  which do fire on touch, but nothing was verified on an actual mobile
  device or emulator.
- Re-measure `StickerSurface`'s startup build time — v2 measured ~0.8s on
  desktop; this session added the median-filtered outline curvature pass
  and the clamped `gaussK` (no expensive new work, but worth confirming
  the number hasn't moved before assuming it's still fine on low-end
  mobile).
- Hosting/budget constraints (GitHub Pages, Firebase Spark free tier) are
  unchanged from v2 and now more directly relevant once persistence
  (§4.1) is built.

---

## 5. Gotchas worth carrying forward

From this session, specifically:

- **Second derivatives amplify numerical instability far more than first
  derivatives do.** `normal()` (first-derivative) has never shown this
  problem; `gaussK()` (second-derivative, same underlying height field)
  did, badly, right where the height field has a real but sharp feature
  (the crest). If another curvature-like quantity gets added later, expect
  the same failure mode near any sharp feature and test for it the same
  way: walk a single point toward the feature and look for a trend vs.
  noise, not just a scan for "is anything above some threshold."
- **A moving average is not the same fix as a median, and picking the
  wrong one is a real, verifiable mistake** (§3.7a) — a mean still blends
  in a bad sample's full weight; a wide genuine feature and a narrow noise
  spike can sit at the same clamped magnitude and be indistinguishable to
  a magnitude-only check. Always re-scan the *whole* signal, not just the
  spot the bug report pointed at, before trusting a smoothing fix.
- **A single systematic bug can hide inside an unrelated bug that adds
  randomness.** §3.3's rotation-swap bug was very likely always present
  but was masked by §3.4's inconsistent-basis bug for however long both
  existed — fixing the "noisy" bug is what made the "systematic" one
  visible. Worth remembering the next time a fix makes something *look*
  newly broken: it may be un-hiding something, not introducing it.
- **A UI subsystem breaking three different ways in a row is itself a
  signal.** The live preview (§3.5) got fixed three times for three
  genuinely different mechanisms before it became clear the simplest move
  was to drop the failure-prone design (an oriented plane) for something
  structurally immune to that whole bug class (a circle), at least
  temporarily. It was worth reintroducing the richer version once its
  actual target turned out to be fixable — but that was a real judgment
  call, not an obvious one, and is worth remembering as a pattern:
  sometimes the right fourth fix is changing the design, not patching it
  again.
- **When two things look wrong together and one fix is offered for both,
  check they're actually the same bug before shipping one fix.** The
  ear-region cut stickers and the "some areas near the ears refuse" report
  looked related; the numeric check (§3.7a) showed the underlying shell
  geometry is symmetric between the two ears, and the apparent asymmetry
  was about which side a given anchor's arc position happened to land
  near the spurious spike — worth confirming with actual sampled numbers
  rather than assuming a visual asymmetry implies a geometric one.

From v2, still true and still relevant, unchanged:

- Texel bounds must be integers.
- The back sheet is not a pure roll (`earBoss` warps the terrain ratio).
- Size caps must hold over the sticker's footprint, not just its anchor —
  though this specific concern is now moot for the *cap* itself, since
  caps no longer shrink anything (§3.2); it still matters for the
  `flatDistortion` probe placement, which samples the footprint for
  exactly this reason.
- The fold guard only fires near the rim (`d < 0.20`), for cost reasons.
- `LatheGeometry` profiles must be bottom-to-top or winding reverses.
- r128 needs `.convertSRGBToLinear()` on untextured material colours.
- Pre-multiply a tilt onto `baseQuat`, don't post-multiply.

---

## 6. Suggested first move

1. **Read §3 of this document before touching rotation, distortion, or the
   live preview again** — three separate, real, non-obvious bugs were
   found and fixed in those areas this session, each confirmed by
   measuring actual numbers rather than by inspection, and the reasoning
   for each is the part worth not relearning.
2. If anything in §3.3 (rotation) or §3.5 (the restored oriented preview)
   still looks wrong once actually rendered — genuinely possible, since
   none of it has been seen by a human yet — the fix is isolated to one
   function each (`makeChart`'s tangent branch; `updateGhost`'s tangent-
   case basis, which mirrors it deliberately) and the first thing to try
   is checking the sign convention against §3.3's worked derivation.
3. Before PWA integration proper: resolve the `body.js` /
   `sticker-surface.js` duplication (§4.2) first, since every fix from
   here on will otherwise need to be applied twice by hand the way this
   whole session's fixes had to be.
4. Persistence (§4.1) is very likely the highest-leverage next feature —
   without it, nothing placed survives a reload, which makes most other
   PWA-integration work hard to usefully test.
