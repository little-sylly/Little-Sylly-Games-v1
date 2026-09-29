# Cold Shoulder — the fun pass (plays fun, then looks fun)

**Date:** 29 September 2026 · **Game:** Cold Shoulder (`cld`, game 19) · **Tier:** 2 (architectural)
**Status:** design approved in conversation (29 Sep 2026); this document awaits owner review.
**Builds on:** SW v244 (`docs/superpowers/specs/2026-09-28-cld-cue-arena-design.md`, `cld-implementation-notes.md` DD-16…DD-18).
**Style prototype (approved):** https://claude.ai/artifact/SXiWaCTCfMSMXyXCC5aVae — its `cld-art.js` is the draft of § 4's module.

---

## 1. What the owner asked for, and what "done" means

The owner's review of SW v244 (29 Sep 2026), in their words, then as outcomes:

| # | Owner | Outcome |
|---|-------|---------|
| 1 | "the 3 bot actions should apply to both of the bots — one of the penguins currently doesn't do anything" | Each drill is a **plan** both Sylvia and Sam follow every Slide. |
| 2 | "it should just last until a natural end, i.e. a winner arises … the bots continue to follow their instructions" | A Practice round is a **real Floe-Off** that ends when one player is left (Ice Bath included). No per-step scripting. |
| 3 | "a drowned penguin floats on the outer rim/edge in the water and not at the inner rim" | A plug floats **in the Drink**, touching the floe's edge from outside, still sealing its gap. |
| 4 | "the target cursor for throwing is white against white, just make it the player's colour" | Every aim and target mark is drawn in **your colour**. |
| 5 | "the resurface and practice again buttons are visually ugly … only our main CTA buttons and pills fall under our styling guide" | Secondary in-game buttons get the game's own material. CTA buttons and pills stay on the suite standard. |
| 6 | "enough room to be having fun (and the balance to larger space would be stronger force of the slide) … we can use auto zoom, pinch zooming" | A **bigger floe** with a **stronger shove**, penguins the same size, and a **camera** that no longer has to hold the whole floe. |
| 7 | "a huge asset overhaul … use the game's sticker as reference … the cue stick needs to go" | A procedural art rewrite in the sticker's look, a new aim control, and every Cold Shoulder screen drawn in it. |

**Success is** the owner opening the game on their iPhone SE and finding it looks and plays fun: roomy ice, penguins with faces, shoves that read, plugs bobbing in the water, and a Practice round that plays out to a winner.

**Delivery:** two phases, each its own release.
- **Phase 1 — plays fun** (items 1, 2, 3, 6) → SW **v245**, `MP_PROTOCOL_VERSION` **`'v245'`**.
- **Phase 2 — looks fun** (items 4, 5, 7) → SW **v246**. No packet change is expected (§ 4.4 names the one thing to check).

---

## 2. Hard constraints (unchanged by this pass)

- **Suite standard, untouched:** the CTA buttons (`cld-cta`: glacier fill, white ink, `min-h-14`), the pills (`.pill` + `pill-active-cld`), the ON/OFF toggles, the menu's four `gel-btn` buttons, the shared overlay frames (Settings, How to Play's title and tab bar, the quit and play-again Decision Modals), the z-index stack, and the engine chrome's behaviour (🔊, ✕, `[?]`).
- **Zero bytes of art.** Everything is drawn at runtime. No image, font or audio file is added. No library is added.
- **Rules stay host-authoritative and deterministic.** `js/lib/physics.js` keeps its API. The only rule changes are § 3.1 and § 3.2.
- **Privacy contract holds:** commits travel on the private channel, and the tally shows counts, never who.
- **Reduced motion is honoured in JS** for every requestAnimationFrame loop: nothing travels, and the end state shows.
- **Australian English**, and `docs/game-identities/cld.md` T7b stays machine-verified (every changed line of copy is a paired change).
- **Markup is edited in `src/screens/cld.html`**, never `index.html`.

---

## 3. Phase 1 — plays fun

### 3.1 Plugs in the Drink (item 3)

**Owner call:** fully in the water, touching the edge. Recorded trade-off: the widest slip gap drops from 2.4 to **1.8** penguin diameters, because that is the widest gap one floating plug can seal on every floe size.

**Geometry.** Chunks stay where they are, centred on the chunk circle `cldChunkR() = cldFloeRadius − CLD_BERG_R` (today's `cldBergInset()`). Two new radii:

| Radius | Value | What sits there |
|---|---|---|
| `cldSeatR()` | `cldFloeRadius + CLD_PLUG_OUT` (`CLD_PLUG_OUT = CLD_PENGUIN_R`) | A **Plugged** penguin: its body lies wholly in the water, just touching the edge. |
| knocked back | `cldFloeRadius + CLD_BACK_OFFSET` (`CLD_BACK_OFFSET = 2.2 × CLD_PENGUIN_R`, was 1.4) | A **Knocked-back** penguin, drifted clear of the plug circle. Not a body. |

**The seat rule.** `cldSeatSpotFrom(anchors, angle)` keeps its contract (free seat nearest `angle`, or `null`), with two changes:
- Each anchor's ban is taken **at the anchor's own distance from the centre**: `half = 2·asin((q.r + r) / (2·|q|))`. For a chunk that is "a penguin could pass the ring here"; for a plug it is "no two plugs overlap". So a seat can only open where a penguin could actually get through, and **never behind a chunk**.
- Seats are placed on `cldSeatR()`. The "narrower than 2 diameters → sit at its centre" test measures the open angle at `cldChunkR()`.

`cldRingR()` is retired. Every caller names the radius it means: dive distances and seat spacing use `cldSeatR()`, the Thaw's calving uses both. `cldSeatOnPlunge` stays pure and needs no change beyond using the new function.

**What follows from it, all through the existing code paths:** a plunge seats in the water at its gap mid-Slide; a Dive, a displacement and a Thaw-drop all land on `cldSeatR()`; the Ice Bath re-seats its rim on `cldSeatR()` of the bath floe; the Thaw carries plugs and knocked-back penguins inward at their angle; a chunk squeezed into a plug calves as before. The aim guide's `plug` contact works unchanged, since a plug is still a body within reach.

**Slip gaps:** `CLD_SLIP_GAP_WIDTH = [1.6, 1.8]` (was `[1.6, 2.4]`). The count and ring cover are re-tuned in § 3.2.

**Proof (harness):** `verify-cld-loop.js`'s seal section is re-run on the new geometry:
- A centred plug holds the widest generated gap (1.8 diameters) against a full-power shove at every lateral offset and every approach angle within ±60°, on Roomy, Standard and Cramped (an Ice Bath has no ring, so no gap to seal).
- Two penguins arriving at one gap in the same Slide: the second rebounds off the first's plug.
- Every seat any path produces passes the chunk-passability test, and no two plugs overlap.

`mutate-cld.js` gains mutants for the seat radius and for taking a ban at the wrong radius.

**Wire.** No field changes. Host and phones must agree on the geometry, and the `x`/`y` of a plug now means "in the water", so `MP_PROTOCOL_VERSION` → `'v245'`.

### 3.2 A bigger floe, a stronger shove (item 6)

The floe grows about 1.3×. Penguins, chunks and snowballs keep their size, so there is roughly **2× the ice per penguin** on every floe size. Everything derived from the floe scales with it, which keeps the setting wording true: on Slush a full pull still carries you about half the floe.

| Constant | v244 | v245 | Why |
|---|---|---|---|
| `CLD_R_STD` / `CLD_FLOE_SIZE` | 130 / 150 · 130 · 110 | **170** / **195 · 170 · 143** | the room |
| `CLD_V_MAX` | 150 | **195** | shove reach grows with the floe, and a Slide still plays in the same time |
| `CLD_SNOWBALL_SPEED` | 600 | **780** | arrival stays the same fraction of a Slide (DD-13's race) |
| `CLD_THAW_STEP` | 8 | **10** | the melt keeps its pace per Slide |
| `cldMinRadius()` | 0.5·D | unchanged formula | scales on its own |
| `CLD_W` / `CLD_H` | 360 | **360** (centre stays 180, 180) | the camera, not a fixed fit, decides what shows; a Roomy rim bobber may sit at a small negative x/y, which neither the sim nor the wire minds. Moving the centre would break every harness that places bodies around (180, 180) |
| `CLD_PENGUIN_R`, `CLD_BERG_R`, `CLD_SNOWBALL_R` | 11, 16, 8 | unchanged | the room comes from the floe, not smaller bodies |

The chunk count is derived from the circumference, so a bigger ring simply gets more chunks.

**Balance target.** Mean Slides per Floe-Off within **±15% of v244** at 3 and 5 players on Slush, Thaw on and off (DD-17's table), measured by `simulate-cld-balance.js`. The narrower gaps (§ 3.1) and the extra room both lengthen a Floe-Off, and two levers bring it back:
- `CLD_SLIP_GAPS`: start at `[3, 4]`, was `[2, 3]`.
- `CLD_RING_COVER`: 0.75–0.85, was 0.80.

The chosen values and the numbers behind them go into the implementation notes as DD-19. Powder is still the first place to look if a playtest drags (DD-16/17).

`CLD_ICE_MULT`, the Snowball force curve and `CLD_BATH_FLOOR_MULT` are all relative, so none of them changes.

### 3.3 The camera (item 6)

The view no longer has to hold the whole floe. Each canvas view (the live floe's `cldView`, the Arena's `cldPrView`) owns a camera `{ x, y, z, tx, ty, tz, manual, holdUntil }` in world units. The base scale fits the floe plus its outer margin (`R + CLD_BACK_OFFSET + r`) into the view's **box**: the stage minus anything floating over it (the Phase 2 header and ice shelf, the Practice coach bubble).

| Moment | Framing | Zoom |
|---|---|---|
| Start of every Slide | **Overview**: the whole floe, held 0.8 s | 1.0 |
| Aiming (Standing) | **Aim cam**: centre eased 32% from the floe's centre towards your penguin | 1.14 |
| Aiming (Drowned) | the whole floe (you're throwing at it) | 1.0 |
| The Slide | **Slide cam**: the moving bodies ∪ your penguin, 90-unit pad, after a 0.35 s hold | ≤ 1.25 |
| Washout, Ice Bath start, Floe-Off end | Overview (the bath re-fits to its own smaller floe) | 1.0 |

- **Easing:** `1 − e^(−3.2·dt)` per frame. Under reduced motion every target is applied at once, so the view cuts.
- **Never move the world under a finger.** While any aim, Snowball or Dive touch is down, the camera holds still. The prototype proved why: a camera that frames the aim feeds back into the aim.
- **Manual control:** one finger always aims; two fingers pinch (zoom 0.8–2.6) and pan. A pinch cancels an unfinished aim drag without arming it. Manual holds until the next Slide starts; a double-tap returns to auto.
- **Mini-map** (screen space, top-left of the box) whenever zoom > 1.18 or the camera is manual: the floe disc, a dot per penguin in its colour (yours ringed white), and the visible rectangle.
- **Power is still thumb travel in CSS px** (`CLD_CUE_PULL_PX`), so zoom never changes how hard a pull is. `cldToLogical(view, e)` inverts the camera's transform.
- **Pure helpers for the harness:** `cldCamFit(points, box, base) → { x, y, z }` and the world↔screen pair (round-trip exact).

### 3.4 Practice bots and rounds (items 1, 2)

`CLD_PR_DRILLS` becomes `{ name, ringSeed, place[3], plan, power }`. `cldPrBotCommit(i)` works out a bot's commit from the live Arena state (inside the swap), every Slide:

| Plan | A Standing bot… | A Drowned bot… |
|---|---|---|
| **Head-on** (`power 1.0`) | shoves straight at **You**'s current position, **even when you're Plugged or Knocked back** | throws a Snowball at You if you're Standing |
| **Crossfire** (`0.9`) | shoves straight at **the other bot**, whatever state it's in; You start in the middle | throws at the other bot if it's Standing |
| **Edge** (`0.85`) | **cuts** You toward the free gap nearest you, pool-style. It aims at the ghost-ball point `You − 2r·û`, where `û` points from You to that gap's edge. If the cut would be sharper than 70°, it shoves straight at You instead. | throws at You if you're Standing |

- Bots never Dive.
- Their next shoves (and throws) are computed at the start of each Slide and **drawn in their colours before you aim** (rival arrows and reticles).
- Each Slide's seed is `ringSeed × 1000 + slideNo`, so a counter you try always meets the same plan.

**A round is the real Floe-Off** on the Arena's record: Standard floe, Slush, Ice Breaker 2, no Thaw. It runs to one player Standing through `cldResolveSlide`. A Washout starts the real Ice Bath (`cldStartIceBath`) with an **ICE BATH!** float.
- **The end card** floats over the stage.
  - Your win: "**Last one dry — that's a Fish.**"
  - A bot's win: "**{Name}'s the last one dry.**"
  - Buttons: **Practice again** (same drill, fresh floe), the drill pills still live, and **Got it**.
- **Safety cap:** 40 Slides → "**Nobody's budging. Call it a draw.**" The harness proves no drill reaches it.
- **Start over** (renamed from Resurface) restarts the drill at any point.

**Proof:** `verify-cld-practice.js` gains:
- Both bots commit on every Slide they are able to.
- The plans' targeting holds across your states.
- Edge's cut sends you within 25° of a gap when you hold still.
- Every drill ends naturally, well inside the cap, against four scripted players: hold still, random, shove the nearest, head for the centre. Across several seeds.
- The swap's isolation proof holds with every new top-level `let` classified.
- `--tune` re-derives each drill's `ringSeed` so its opening reads right:
  - Head-on: holding still, you are hit on Slide 1 and in the Drink within three Slides.
  - Crossfire: their paths cross your start.
  - Edge: holding still gets you cut toward a gap by Slide 2.

### 3.5 Practice layout and coach (item 2)

- **Full height.** While Practice is the active tab, the How to Play sheet grows to the full viewport (the sheet's title and tab bar stay; its top corners tighten). Other tabs keep today's height.
- **Practice body,** a flex column:
  1. the drill pills;
  2. **the stage**, which takes every leftover pixel (`flex: 1; min-height: 0`, never squashed — DD-18's 0 px bug);
  3. the floe's controls (Throw · Dive, power, Lock It In);
  4. one bottom row: **Start over** (a secondary button; plain in Phase 1, the ice block of § 4.6 in Phase 2) beside **Got it** (`cld-cta`, sharing the row — the one departure from the How-to close button's full width, colour and ink unchanged).
- **The coach is a speech bubble floating in the water above the floe.** It takes no layout height, so the "coach card and stage can't both fit" problem from the SE pass disappears. The camera's box starts below the bubble. The step counter becomes **"Slide N"**.
- **The coach reacts to what happens.** `cldPrCoach(state, event)` stays a pure reducer. Events: `load`, `armed`, `locked`, `committed`, `slideDone { meIn, meKnocked, botIn, washout, bath, winner, draw }`. The first matching line wins, otherwise the last line stays. The ring on the taught control carries over from v244.

| Key | Line (copy — mirrored verbatim in `cld.md` T7b) |
|---|---|
| `intro.headon` | Sylvia and Sam are coming straight for you — every Slide, full power. Dodge them, or meet them. |
| `intro.crossfire` | Sylvia and Sam only want each other, and you’re in the middle. Get out of the way — or use it. |
| `intro.edge` | They’ll try to cut you into the nearest gap. Keep ice between you and the water. |
| `aim` | Touch anywhere and pull back — the shot goes the other way. Their next shoves are drawn in their colours. |
| `armed` | The dots show your first hit. Tap Power to lock it, then Lock It In. |
| `again` | Same plan every Slide. Read it, and counter it. |
| `meIn` | You’re in the Drink, plugging the gap you went through. The next penguin to hit you bounces off harder. Tap the ice to aim a Snowball. |
| `meKnocked` | Knocked back — now it’s Throw or Dive. Dive into a free gap to plug it again. |
| `botIn` | {Name}’s in the Drink — a plug now. Hit it and you bounce back harder. |
| `bath` | Everyone went in at once — into the Ice Bath. Last one dry still wins. |
| `win` | Last one dry — that’s a Fish. |
| `lose` | {Name}’s the last one dry. Practice again, or try another drill. |
| `draw` | Nobody’s budging. Call it a draw. |

**Folded in from `docs/deferred-work.md` § Cold Shoulder item 6** (the SW v244 minors that this rework touches):
- the Arena's Aim Assist is read on every Practice open;
- `setPointerCapture` is added to both pointer-down handlers (fixes the mouse `pointerleave` and backdrop-close notes);
- a drill change with no aim resets the coach;
- the Arena's idle motion honours reduced motion;
- Peck Off's selection ring hides outside `aiming`.

The touch-down-on-the-penguin power floor stays an owner call after the hardware pass.

---

## 4. Phase 2 — looks fun

### 4.1 The art module

`js/games/cld-art.js` → `window.CldArt`. It is **pure like `dyb-dice.js`**: every function takes what it draws as arguments and reads no `cld*` state. The only state lives in objects the caller creates and owns (a floe surface, a particle system), plus two lazily built texture tiles, which are assets rather than state.
- Loads **before `cld.js`** (`src/screens/_scripts-3.html`; the load-order line in `CLAUDE.md`).
- Precached (`sw.js` `PRECACHE_URLS` + `CACHE_NAME` bump). About 40–60 KB.
- **No DOM means no-op.** Every entry point returns cleanly when `document` or `Path2D` is missing, so the headless harnesses can load it.

**The render seam survives.** `cldRenderPenguin(ctx, state, colourIdx, x, y, r, opts)` is still the one door every penguin pixel goes through, in play and in chrome. It maps `state` + `opts` onto `CldArt.penguin(ctx, o)`, and the `cldSkinArt` stub stays. `cldPose` moves into the module as `posePars`. `cldDraw(view, m)` becomes the scene composer over `CldArt`, still fed only by the model (`cldFloeModel()` / `cldArenaModel()`).

### 4.2 The penguins

As approved in the prototype:
- **Shape and paint:** upright, chubby, inked watercolour: a tinted wash with pigment pooled at the edges, paper grain, and an ink outline.
- **Face and colour:** a cream belly, a pale face mask, blush, an orange beak and feet. The body wears the player's colour.
- **Anchoring:** each penguin stands on its **footprint**, the collision circle, with its body rising up the screen. It has a soft shadow and the owner ring on the ice. "Me" gets a white outer ring, and a bouncing marker on Slide 1.
- **Nine poses:**

  | Pose | When |
  |---|---|
  | idle | breathing, glancing about, blinking |
  | aim | leaning away from the shot, squatting into the power, straining at full |
  | slide | tobogganing flat on its belly, seen from behind, beak and feet poking out |
  | squash | a bump |
  | plunge | tipping over the lip |
  | bob | plugging a gap, grumpy, with a tinted collar on the water |
  | back | knocked back, dizzy, lower in the water, dimmed |
  | throw | a flipper raised with a snowball |
  | win | jumping, flippers up |

- **Six faces:** happy, focus, strain, shock, grumpy, dizzy.
- **Hunger escalates the face (owner, 29 Sep 2026).** SW v245 ships a placeholder: angry brows on every
  Standing penguin from the first HUNGRY! to the end of the Floe-Off. That reads as "angry for the rest
  of the game" from Slide 5, which is wrong. Phase 2 replaces it with a ladder, one rung per Hunger level
  (`cldHungerLevel`: a new level every 4 Slides). Each rung is a **mood over** whatever face the pose
  wears, not a seventh face:

  | Level | Slides | Mood |
  |---|---|---|
  | 0 | 1–4 | completely normal |
  | 1 | 5–8 | frowns every now and then (an idle glance sometimes lands as a frown) |
  | 2 | 9–12 | frowns all the time |
  | 3 | 13–16 | annoyed / frustrated (a huff, a stamp) |
  | 4 | 17–20 | angry |
  | 5 | 21–24 | fire in its eyes |
  | 6 | 25–28 | fire in its eyes + a glow in the player's colour |
  | 7+ | 29+ | the glow grows with every level until the Floe-Off ends |

  **Where games actually end** (×1.04, 120 runs, median / p90 Slides): Slush Thaw-off 11–17 / 21–27, so
  a typical game ends *annoyed* to *angry* and only a stalemate reaches fire. Powder Thaw-off 22–25 / 34–40,
  so the slow ice routinely reaches the glow. Black Ice 9–14 / 14–18. Any Thaw game 5–10 / 9–13, so it
  mostly stays at frowning. That is the intent: fire is for the long Floe-Offs that Hunger exists to
  end. **No filler rungs** are needed. Four Slides per rung spaces the ladder across the real game
  lengths, and a rung shorter than a Hunger level could not be announced by its HUNGRY! beat.

  Rules: a level up is shown at the HUNGRY! beat, never mid-Slide. It uses the same derived level on
  every device (no packet), and it resets with the count (Resurface, Ice Bath). Drowned penguins keep
  their own faces (grumpy / dizzy) with no mood. The glow is a static strength per level, so nothing
  pulses. Under reduced motion the fire is a still flame. The model carries a per-penguin `hunger`
  level (0 when Drowned) in place of v245's `hungry` bool.
- **Facing:** a penguin "turns" toward its aim. The face slides across the body, and the back view fades in as it turns away.
- **The model grows per-penguin fields,** all derived from the timeline or input, never sent: `pose`, `look`, `power`, `vel` (from the bracketing samples), `k` (plunge and squash progress), `splat` (a Snowball hit fades over ~3 s).

### 4.3 The world

- **The floe:** a thick snow slab. The surface is painted **once per floe** into an offscreen canvas that the view owns (`CldArt.makeFloe`, q = 3 px per unit, ≤ 1,200 px square on Roomy). It has lit snow mounds, wind drifts, carved cracks, frost speckle and a bevelled rim, over a darker lip. The floe keeps the **story of the Floe-Off**: every belly-slide leaves one continuous groove, and every open-ice Snowball a splat. A Thaw repaint replays the marks list.
- **The chunks:** ice-cube blocks, low (0.36–0.5 r tall) and irregular, with snow caps and a lit top edge. One crack per hit taken; the last hit tints the top.
- **The Drink:**
  - deep cold teal, lighter over the submerged ice skirt;
  - world-space wavelets that drift and glint;
  - a soft wavy foam collar at the edge;
  - small floes drifting far off (scenery, never bodies).
- **Draw order:** water → ground effects → floe → aim marks → **every chunk and penguin y-sorted** (the slight 3D read) → snowballs → air effects → reticle and markers → mini-map.

### 4.4 Effects

`CldArt.makeFx()`, one per view, capped at 420 particles:
- **Belly-slide:** snow spray.
- **Collision:** a puff and little stars.
- **Rebound off a plug:** a bigger puff and a "Boing!" bark.
- **Plunge:** splash droplets and two rings.
- **Knock-back:** a small splash.
- **Shatter:** shards.
- **Snowball landing:** a snow burst.

Timeline events reach the view through the existing `hooks` object that `cldStepPlayback` already takes (a new `fx(e)` hook beside `sfx` and `bark`), so the live replay and the Arena each feed their own view. Under reduced motion nothing that travels is spawned, and the rings stay.

**Snowballs arc through the air** over a shadow that travels straight across the ice. **The one thing to check at planning:** does `cldTimelinePayload` carry the `landing` event's `from`, `x`, `y`, `t` to clients? If it does, there is no packet change. If it doesn't, derive the thrower's position on the client rather than widen the packet.

### 4.5 Aiming and targets (item 4, and the cue's replacement)

All in the player's colour.
- **Shove:**
  - a dashed **tether** from the penguin back to your finger, with a grip ring;
  - a fat **arrow** ahead of the penguin: length and width are the power, chevrons flow toward the tip while you hold, and it pulses at full power;
  - a small lock nub when power is locked.
- **Aim Assist:** dotted **guide** dots to the first contact, a dashed **ghost** footprint there, and a white **deflection stub** off a struck penguin. The rules of `cldAimGuide` don't change.
- **Rival shoves** (Practice): the same arrow at half strength, dashed.
- **Snowball:** a **target ring** with four ticks and a centre dot, plus a dashed **throw arc** from your flipper, all in your colour.
- **Dive:** free seats appear as dashed rings bobbing in the water; the chosen one shows your ghost bobbing.

### 4.6 Chrome

**Floe screen:**
- The stage goes **edge to edge**.
- **The header** (Floe-Off · Slide, `[?]` 🔊 ✕) floats over the water in white.
- **The controls** sit on a frosted **ice shelf** with a snow lip.
- **The power bar** is an inset ice tube that fills in **your colour** with frost ticks, and shows a lock when locked.
- **The tally** is a row of penguin heads that fill as players lock in. Counts only, never who.
- **Barks** (WASHOUT!, ICE BATH!, the plunge lines, Boing!) are chunky white outlined text that pops and drifts.
- Lock It In and the Throw · Dive pills are unchanged, per § 2.
- `screen-cld-floe` stays the documented sticky-footer exception.

**Secondary buttons: "ice block"** (`.cld-ice-btn`, `css/styles.css`). A block of sea ice: a lit top, a snow cap, a glint, and a 4 px lip that sinks on press (transform only). Dark ink, `min-h-11`.
- **Used on:** Practice's Start over and Practice again, and the gameover's Waddle Off.
- **Not used on:** the Decision Modals' cancel buttons, which stay suite-standard (shared across 20 games).

**Other screens** use static canvases drawn once on show, with CSS motion (so the global reduced-motion block covers them and no new RAF appears):

| Screen | Change |
|---|---|
| Menu | a small floe with three penguins replaces the 🐧 emoji, bobbing gently |
| Floe-Off intro | a vignette: penguins in the players' colours on the fresh floe |
| Floe-Off result | the winner, big, jumping with a Fish; the plunge list gets penguin heads |
| Scoreboard | each row gets a penguin avatar in its colour, and drawn fish for the tally |
| The Final Floe | a podium: penguins on ice blocks of 1st/2nd/3rd height, the winner holding a Fish |
| How to Play → The Cast | the nine poses and six faces from the new module (its existing RAF) |

### 4.7 Motion and performance

- DPR is capped at 2.
- The floe surface is cached; chunks are drawn live (cached per damage state only if the SE pass shows jank).
- The particle cap is 420.
- Every RAF loop checks `prefers-reduced-motion` itself: the camera cuts, the foam and waves freeze, particles don't travel, and idle breathing stops.
- **Target:** a steady 60 fps with 16 penguins and 30 chunks on the owner's SE. This needs real-device confirmation; headless Chromium is not representative.

---

## 5. Files

| File | Phase | Change |
|---|---|---|
| `js/games/cld.js` | 1, 2 | geometry + constants (§ 3.1–3.2), the camera, bot plans + rounds + coach, then the scene composer over `CldArt` |
| `js/games/cld-art.js` | 2 | **new**: the art module (from the prototype) |
| `src/screens/cld.html` | 1, 2 | Practice full-height layout + coach bubble + end card; then the full-bleed floe screen, ice shelf, and the art canvases on the other screens |
| `src/screens/_scripts-3.html` | 2 | `cld-art.js` before `cld.js` |
| `css/styles.css` | 1, 2 | Practice full-height sheet; then `.cld-ice-btn`, the shelf, the power tube, the tally heads, the bark text |
| `js/engine.js` | 1 | `MP_PROTOCOL_VERSION` → `'v245'` |
| `sw.js` | 1, 2 | `CACHE_NAME` bumps; `cld-art.js` precached |
| `tools/verify-cld-loop.js`, `verify-cld-practice.js`, `mutate-cld.js`, `simulate-cld-balance.js` | 1, 2 | § 3.1, § 3.4, § 6 |

---

## 6. Verification

**Phase 1:**
- `verify-cld-physics.js`, `verify-cld-loop.js` (the new seal and seat-legality sections), `verify-cld-practice.js` (plans, rounds, coach, camera helpers, isolation, `--tune`), `verify-cld-loopback.js` (unchanged contract, new version), `mutate-cld.js` (+ the new mutants) and `verify-mp-configs.js` all green.
- `simulate-cld-balance.js` inside § 3.2's target.
- `verify-identity-docs.js` and `verify-build-fresh.js` green.
- A `visual-check` pass at **375×667, 375×548, 320×452**: the floe screen and Practice full-height, the stage never 0 px tall, the coach bubble never over the controls, and no sideways scroll.

**Phase 2:**
- `verify-cld-practice.js` gains render checks:
  - every penguin in a drawn frame goes through `cldRenderPenguin` (a spy);
  - `CldArt` loads and no-ops under Node;
  - the model carries `pose`, `vel`, `k` and `look` through a replay.
- Every Phase 1 harness still green.
- A `visual-check` pass over every CLD screen at the three SE sizes.

**Owner-only (hardware):** the live multi-device session and the offline install check. These are `docs/deferred-work.md` § Cold Shoulder items 1–2, and the install check now covers `cld-art.js` too. Also the SE's frame rate and the feel of the camera and aim.

## 7. Documentation closure (per phase, per the Integrity Protocol)

- **`docs/code-map.md`:** the CLD section, covering the new functions, camera state and `cld-art.js`.
- **`cld.md`:**
  - T3 and T5 (Plugged / Knocked back now in the water; Berth wording)
  - T7a (Practice)
  - T7b (the coach lines; the end card; *Start over*)
  - T9 (the new art: sizes, module, seam)
- **`CLAUDE.md`:** SW entry, load order.
- **`cld-implementation-notes.md`:** DD-19 (Phase 1: plug geometry, the balance numbers, the camera, the plans) and DD-20 (Phase 2: the art module).
- **`docs/deferred-work.md`:** item 6's folded minors → resolved.
- **`docs/decision-log.md`:** one entry each for the in-the-water plug model and for procedural art as a game-owned module.

## 8. Risks and open points

- **Frame rate on the SE** is the one unknown the prototype can't settle. The mitigations are ready: cache chunk sprites, halve the wavelets, drop the grain.
- **The balance numbers** are the instrument's to find. If ±15% can't be reached with slip-gap count and ring cover alone, stop and bring the trade to the owner rather than touch a third constant.
- **The camera's feel** (zoom levels, easing, the Slide cam) is tuned by hand after the owner plays it. Every number is a named constant.
- **The Practice sheet at 320×452:** if the stage drops below ~220 px tall, the drill pills fold into a compact selector. Decide at the visual-check pass.
