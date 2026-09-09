# Honeycomb Hills — art generation prompts (Gemini / Nano Banana)

**Written 7 Sep 2026**, updated 9 Sep 2026. Against `docs/new-game-tech-honeycomb-hills.md` §10 and
`docs/art-authoring-guide.md` § Honeycomb Hills. Those two hold the *ids and dimensions*; this file
holds the *prompts*. If they disagree, the spec wins.

**Source mockups:** `data/art/pending/bee/` — nine contact sheets. Most of the game's art is already
in them and only needs cutting out.

**➡ Current status is § 8. All art is delivered** into `data/art/pending/comb/` (52 files, 9 Sep).
The achievements are a text status — **no badge art** (decision 9 Sep). What is left is the
`convert-core-art` rename map (§ 8) and a batch of non-art code/CSS fixes. Every prompt below is
kept for the record.

---

## 1. How to use these

Nano Banana is an **image editor** as much as a generator, and that is the whole trick here: style
consistency across 40+ assets is the thing that will make or break this pack.

**Always attach a reference image and say "match this style exactly."** Use
`Gemini_Generated_Image_krefgpkrefgpkref.jpg` (the resource/hex sheet) as the style anchor for
everything — it is the cleanest read of the intended look.

Work **one asset per generation**. Batch sheets look efficient but give you six things you cannot
use at 224 × 304 each.

**For the six hex tiles, attach TWO or THREE references:** (1) the style anchor above; (2) the
pointy-top slab silhouette `comb-hex-silhouette.svg` (in this folder — rasterise to PNG first, see
§3; the first batch kept coming back flat-top and tilted); and (3), where a strong earlier version
of *that specific hex* exists, the
hex itself, with "match this hex's finish, layout and cell count". The standalone Sunlit Rock and
Nursery Cell hexes are the best we have — the Nursery Cell one is the polish benchmark for the
whole pack.

### The session primer

You do **not** need a separate warm-up generation — attaching the reference image *is* the warm-up.
But if you run several assets in one Gemini thread (the natural way to work, since Nano Banana edits
as much as it generates), paste this as the **first message**, with the style anchor attached, so
the rules are set once:

```
I'm building an art pack for a mobile game. I need assets generated one at a time in a single
consistent style.

ATTACHED is the master style reference for this whole session. Every asset must match its finish
exactly: wet high-gloss surfaces; a hard bright specular hotspot at the upper-left of each rounded
form plus a soft bounce highlight lower down; a warm upper-left rim light; translucent parts
glowing from within; a crisp dark outline on every shape; rich saturated colour. Never matte,
flat, dull, chalky, pastel or muddy.

Standing rules for EVERY generation this session unless I say otherwise:
- A single centred object on a FULLY TRANSPARENT background, output as PNG.
- The object is complete and fully inside the frame, not cropped at any edge.
- NO text, letters, numbers, labels, name tags, hanging paper tags, captions, banners or
  watermarks. NO desk, table, wood surface or background scenery. NO cast shadow on the ground.
  NO border, frame or card edge. NO grids, contact sheets or colour swatches.

I'll give you one asset per message: its subject, its framing, and sometimes a second reference
image for that specific item. Apply the standing rules and the reference style every time.

Reply "ready" and I'll send the first asset.
```

After the primer, each per-asset prompt below can either carry its full `[PREAMBLE]` /
`[FINISH BLOCK]` / `[GEOMETRY BLOCK]` as written (safest — Nano Banana drifts over a long thread),
or, for the simpler icons, just the `CONTENT:` and framing lines since the primer covers the rest.
**For the six hex tiles always paste the full `[GEOMETRY BLOCK]`** — the pointy-top / flat-slab
geometry is too load-bearing to leave to conversational memory.

**One thread per family** — all six hexes, then all resources, then the pogs. Start a fresh thread
(re-pasting the primer, re-attaching the anchor) when you switch families or when output quality
visibly degrades; long threads compound artefacts.

---

## 2. The shared style preamble

**Prepend this to every prompt in this file.** It is doing most of the work — especially the
negatives, which are what stop Nano Banana adding the label tags, desk surfaces and drop shadows
that are all over the mockup sheets.

```
Mobile game asset, glossy hand-painted cartoon style — the polished, juicy look of a premium
match-3 game. Rounded forms. A strong warm rim light from the upper left. Every raised surface
has a WET, HIGH-GLOSS finish: one small bright hard specular hotspot where the upper-left light
strikes it, plus a broad soft bounce highlight lower down. Translucent forms glow gently from
within. Shadows stay coloured and saturated, never grey mud. A crisp dark outline around every
shape. Colour rich and juicy — never pale, matte, washed-out or pastel.

Copy the surface finish, gloss level, rim-light strength, internal glow and outline weight of
the attached reference image EXACTLY. Only the subject matter changes.

Output on a FULLY TRANSPARENT background.

Do NOT include: any text, letters, numbers, words, labels, name tags, hanging paper tags,
captions, titles, banners, or watermarks. No desk, table, wood surface, keyboard, or any
background scenery. No cast shadow on the ground. No border, frame, or card edge around
the object. No multiple objects, no grid or contact sheet layout, no colour swatches.
No matte, flat-shaded, dull, chalky or soft-focus rendering. No muddy or desaturated colour.

A single centred object, complete and fully inside the frame, not cropped at any edge.
```

> **Why so many negatives:** every mockup sheet has hanging name tags, a wooden desk, and a drop
> shadow. Left unstated, those come back. The tags in particular are the single most common thing
> to have to re-roll.

---

## 2a. The finish block — paste into every prompt in §3, §4 and §6

The biggest miss in the first batch was *polish*: everything came back flat and matte next to the
reference icons. This block is the fix. Paste it verbatim right after `[PREAMBLE]`.

```
FINISH — match the polish of the attached reference exactly:
- Wet, high-gloss surfaces. Nothing matte, chalky or flat-shaded.
- Each rounded form: ONE small bright hard specular hotspot at its upper-left, plus a broad
  soft bounce-light lower down.
- A warm rim light traces the upper-left silhouette of every raised element.
- Translucent or glassy parts (sap, honey, jelly, pollen glow, resin) light up from within.
- A clean confident dark outline around every shape — thicker on the outer silhouette, finer
  on internal detail.
- Colour stays saturated and juicy into the shadows. No grey, no wash-out, no pastel.
```

**Not for §5 (board pieces)** — those are deliberately flattened for 30 px legibility and carry
their own SIMPLIFICATION block instead. §3f (Smoke Zone) *does* use it, under a "desaturate,
don't flatten" caveat — the grey palette carries the dead read, not matte shading; see that entry.

---

## 3. The hex tiles — all six ✅ DELIVERED (prompts kept for the record)

**Status 9 Sep 2026:** all six are cut into `data/art/pending/comb/` (`grove` `blossom`
`sunflower`→`clover` `rock` `nursery` `smoke`), measured, and pass — silhouettes identical to
within 2 px, wall bands 21.1–22.0 % of height, all pointy-top with a V bottom vertex. No
regeneration needed. The rewrite below is left intact as the record of what the final pass asked
for.

**This is the batch that matters most, and the one where the mockups cannot be reused.**

Three things have to change from the mockup hexes:

1. **The 3/4 isometric angle must flatten.** The board is a real hex grid with exact geometry. The
   top face is seen **straight on from directly above**, and the tile extrudes **straight down**.
   Think "thick sticker" or "slab of wax", not "tile photographed at an angle". A tile drawn at a
   3/4 angle will not tessellate, and the drawn hex would stop matching the tap target.
2. **Pointy-top orientation** — a sharp vertex at the top and bottom, flat vertical edges left and
   right. (The topology puts corners at ±90°; this is not a style choice.)
3. **Each kind gets its own base tone.** Three of the mockup hexes sit on green. Production is
   resolved *by hex kind*, so misreading one costs a player resources they were owed.

### The six base tones

Chosen for maximum mutual separation at 72 px — green, pink, teal, amber, lavender, grey:

| id | Name | Base tone | Decoration |
|---|---|---|---|
| `grove` | Sapling Grove | **deep forest green** | round glossy trees + amber sap |
| `blossom` | Pollen Meadow | **warm rose / dusty magenta** | pink five-petal flowers |
| `clover` | Sunflower Patch | **bright blue SKY** — behind the flowers, not the ground (§3c) | yellow sunflowers against sky |
| `rock` | Sunlit Rock | **honey amber** | glossy honey-gold boulders |
| `nursery` | Nursery Cell | **pearl lavender** | iridescent capped comb cells |
| `smoke` | The Smoke Zone | **greyed grey-brown wax** (NOT amber — see §3d caution) | abandoned smoked-out honeycomb + grey smoke |

> **Sunflower Patch is the one hex not painted as top-down ground.** The first batch put teal on
> the *soil*, which read as blue dirt. Instead (§3c) the flowers stand upright against a bright
> blue summer SKY that fills most of the top face — so the tile's identifying colour is blue,
> drawn for a reason. Yellow sunflower heads pop hard against it, and it quietly reclaims the
> brief's original "Nectar is sky blue" instinct. The slab geometry stays identical to the other
> five (see §3c's safeguard line) — only the painted scene differs.

### The geometry block

**Attach `comb-hex-silhouette.svg` (this folder) as a reference image for every one of the six hex
prompts.** The first batch kept coming back FLAT-TOP (a horizontal edge across the top, points at
left and right) and tilted at a random 3/4 angle. A flat-top or tilted tile will not tessellate on
the board grid, and its drawn edge stops matching the tap target. A silhouette reference fixes this
far more reliably than words.

> **Rasterise it first — Gemini wants a bitmap.** Any one of: open the `.svg` in a browser and
> screenshot it; drag it into an online SVG-to-PNG converter; or, with Inkscape installed,
> `inkscape comb-hex-silhouette.svg --export-type=png -w 448`. It is a flat two-tone shape, so a
> rough export is fine — it only has to show the orientation.

**Paste this into every one of the six hex prompts, unchanged:**

```
GEOMETRY — critical, follow exactly; match the attached hexagon silhouette for shape and angle:
A single hexagonal terrain tile for a hex-grid board game.
The hexagon is POINTY-TOP: one sharp vertex at the very TOP centre, one sharp vertex at the
very BOTTOM centre, and one flat vertical edge on the left and one on the right. There is NO
horizontal edge across the top — it is not flat-top.
The top face is drawn FLAT and mirror-symmetric left-to-right, viewed straight from overhead
with NO foreshortening. NOT tilted, NOT isometric, NOT 3/4, NOT in perspective, NOT rotated.
"FLAT" here means the VIEWING ANGLE only — never the shading. The top face is a rich
HAND-PAINTED surface, never a single flat colour fill: give it visible texture (short grass
strokes, mottled colour variation, a scatter of tiny tufts, pebbles or ground detail) and a
soft darker vignette toward the hexagon's edges so the centre glows warmer.
Directly below the hexagon's lower edge, a straight band of even height represents the tile's
thickness (its side wall). Draw it as a simple flat darker band — a shaded version of the
top-face colour — glued under the hexagon. Do NOT render it as a receding 3D face and do NOT
add perspective to it.
FRAMING: portrait, 224 x 304 aspect ratio. The hexagon top face fills the upper 85% of the
frame. The side-wall band occupies the bottom 15%.
COVERAGE: the decoration fills the central ~75% of the top face — generous, clearly the tile's
subject, spread across the whole area INCLUDING the centre, NOT a small cluster adrift in empty
ground. Keep a clean inset margin: nothing touches the left, right or bottom edges. Decoration
may break above the top vertex by at most 15% of the tile height, and never past the left,
right or bottom edges.
Small contact shadows where decoration meets the top face are good; there is still NO shadow
outside the hexagon.
```

### 3a. `grove` — Sapling Grove

```
[PREAMBLE] [FINISH BLOCK] [GEOMETRY BLOCK]
CONTENT: The top face is textured deep forest green grass — visible grass strokes, mottled
green variation, small tufts. Growing from it, a generous stand of five or six rounded,
glossy, stylised cartoon trees with fat spherical canopies in bright and deep greens, spread
across the central top face, each canopy catching a hard highlight and a warm upper-left rim
light. A thick amber-orange bead of translucent tree sap glows from within as it runs down
one trunk and pools glossily on the grass with a bright wet highlight. This tile means RESIN.
Base tone of the top face: deep forest green.
```

### 3b. `blossom` — Pollen Meadow

```
[PREAMBLE] [FINISH BLOCK] [GEOMETRY BLOCK]
CONTENT: The top face is a warm rose and dusty-magenta meadow — the GROUND ITSELF is pink,
not green — with visible painted texture: soft grass strokes, mottled rose variation, tiny
tufts. Covering most of the central top face, INCLUDING the centre (not an empty-middle
ring), a full scattering of small five-petal cartoon flowers in bright pink and white with
golden pollen centres, each petal glossy with a soft highlight, each dusted with fine golden
pollen specks that glow against the pink. This tile means POLLEN.
Base tone of the top face: warm rose / dusty magenta. Do NOT make the ground green.
```

### 3c. `clover` — Sunflower Patch

**Reframed 7 Sep 2026 — paint blue SKY, not blue ground.** The first batch put teal on the soil
and it read as blue dirt. Instead, frame the flowers standing upright and facing the viewer with
a bright blue sky behind them: blue enters the tile naturally, as sky, and stays this hex's
identifying colour.

```
[PREAMBLE] [FINISH BLOCK] [GEOMETRY BLOCK]
CONTENT: The scene painted on the top face is a patch of tall cartoon sunflowers standing
upright and facing the viewer, seen against a BRIGHT BLUE SUMMER SKY. The sky is the backdrop
and fills roughly the upper two-thirds of the hexagon's top face — softly textured with a few
light painted clouds and a gentle gradient, not a flat fill. Only a thin strip of warm sunlit
earth sits at the base of the stems along the bottom of the top face — no wide green field,
no green ground plane. Six or seven big cheerful sunflowers spanning the full width of the
central top face: bright golden-yellow petals, rich dark-brown seed centres, glossy green
stems and a few leaves, all carrying the wet gloss and upper-left rim light from the FINISH
block. This tile means NECTAR.
The tile's dominant, identifying colour is SKY BLUE.
SAFEGUARD: despite the sky backdrop, the hexagon slab itself is NOT tilted or in perspective.
Its outline, thickness, pointy-top orientation and straight side-wall band are identical to a
plain flat top-down hex tile — it is a flat slab whose top surface happens to be painted as a
little scene with sky. Follow the GEOMETRY block exactly for the slab.
```

### 3d. `rock` — Sunlit Rock

```
[PREAMBLE] [FINISH BLOCK] [GEOMETRY BLOCK]
CONTENT: The top face is warm honey-amber stone with painted texture — subtle cracks, mottled
amber variation, a few small pebbles. Sitting on it, filling the central top face, a generous
pile of three or four rounded boulders the colour of set honey and golden beeswax —
wet-looking and slightly translucent, glowing from within, each with a hard bright specular
hotspot and a warm upper-left rim light. A pale cream drip of melted wax runs thickly down
one side with its own glossy highlight. This tile means WAX.
Base tone of the top face: honey amber.
```

### 3e. `nursery` — Nursery Cell

**The first batch missed this one badly** — it returned a rough purple lump with a few vague
blobs. The target is the standalone pearl-lavender Nursery Cell reference hex: **attach that
image** and copy its cell shape, count, arrangement and dome gloss exactly.

```
[PREAMBLE] [FINISH BLOCK] [GEOMETRY BLOCK]
CONTENT: The top face is smooth pale pearl-lavender wax with a high-gloss porcelain finish and
a soft darker vignette toward the edges. Set into it and filling the central top face, SEVEN
raised hexagonal honeycomb brood cells in a tight flower-of-life cluster — one cell in the
centre, six evenly around it. Each cell is a raised hexagonal ring of lavender
wax with a crisp darker-lavender outline, topped by a clear glass-like DOMED LID bulging up
above the surface. Each dome carries one big bright white specular hotspot near its top-left
and a strong iridescent pearlescent rainbow sheen — soft pink, mint, gold and lilac playing
across the glass like a soap bubble. Milky-white royal jelly glows faintly inside each dome.
This tile means ROYAL JELLY.
Base tone of the top face: pearl lavender. The domes must look glassy, wet and iridescent —
match the attached Nursery Cell reference exactly.
```

### 3f. `smoke` — The Smoke Zone ⚠️ regenerate (owner reference exists)

The Wasp's home tile, and the only hex that produces nothing. It must read as **dead and
deliberately unwelcoming** — a player has to see at a glance that nothing grows here.

**Concept revised 7 Sep 2026**, from an owner tweak that landed the look but broke the shared
rules (it came back isometric, square-framed, with a honeycomb-textured side wall, an outside
drop shadow, and smoke spilling past the edges). Not scorched earth any more — an **abandoned,
smoked-out honeycomb**: old greyed wax comb, most cells dark and empty, choked with grey smoke.
Attach the owner reference and copy the *composition* (comb grid + curling smoke body) while
this prompt pulls it back inside the tiling rules.

> **Palette caution — keep it well away from Sunlit Rock (§3d).** Rock is clean bright
> honey-amber. This comb must stay **greyed, dusty and desaturated** — old abandoned wax, not
> fresh gold — or the two tiles collide at 72 px and a player misreads which resource a hex owes
> them. The grey is the point; the honeycomb is only the texture under it.

```
[PREAMBLE] [FINISH BLOCK] [GEOMETRY BLOCK]
DESATURATE, DON'T FLATTEN: keep every bit of the pack's rendering craft — glossy hand-painted
wax with soft highlights and a warm upper-left rim light, smoke with real volume and soft
internal sheen, a crisp dark outline. What makes this tile read as dead is the COLOUR ONLY:
greyed, dusty, low-saturation grey-brown instead of gold, plus the hollow empty cells. Do NOT
render it matte, chalky or flat-shaded.
CONTENT: The top face is an old, abandoned honeycomb slab — a full grid of glossy wax hexagon
cells covering the whole top face, each cell rim catching a soft highlight — but the wax is
greyed grey-brown and dusty, NOT golden: bleached, weathered, low saturation, like comb left
empty for years. Most cells are dark, hollow and empty; a few still hold a little dried amber
honey that keeps a genuine wet sheen. Choking the tile, a thick body of pale grey-white smoke
with soft internal highlights drifts and curls across the top face, INCLUDING over the centre —
not a hollow ring around an empty middle. A few thin wisps rise just past the top vertex (no
more than 15% of the tile height); the smoke NEVER spills past the left, right or bottom edges
of the hexagon.
The tile reads as scorched, smoked out and abandoned through its DESATURATED grey palette, not
through flat shading. This tile produces nothing.
Base tone of the top face: greyed grey-brown wax, low saturation (NOT amber, NOT gold).
GEOMETRY REMINDER: straight-on flat top face matching the silhouette — NOT tilted, NOT
isometric, portrait 224 x 304. The side wall is a plain flat darker grey-brown band with NO
honeycomb texture on it. NO cast shadow outside the hexagon.
```

---

## 4. Resin — ✅ DONE (redrawn as the angular shard)

**Status 9 Sep 2026:** `resin.png` is now a faceted angular amber crystal — distinct silhouette
from Nectar's droplet. Prompt kept below for the record.

**The problem:** the mockups draw **Resin** and **Nectar** as the *same droplet shape* in *adjacent
hues* (amber and gold). They sit side by side in the hand, in every cost line, in every trade offer
and in the discard picker. Under the most common form of colour blindness they are nearly
identical — and `docs/new-game-tech-honeycomb-hills.md` §10 makes distinct icon **shape** a hard
rule for exactly this reason.

**Resin becoming angular is the single change that fixes it.** With five distinct silhouettes,
Nectar keeps its gold and Wax's cream is fine against it.

| Resource | Shape | Status |
|---|---|---|
| **Resin** | **angular shard** | ⚠️ **regenerate — currently a droplet** |
| Pollen | sphere / cluster | ✅ cut from mockup |
| Nectar | droplet | ✅ cut from mockup |
| Wax | hexagon | ✅ cut from mockup |
| Royal Jelly | pudding dome | ✅ cut from mockup |

```
[PREAMBLE] [FINISH BLOCK]
CONTENT: A single angular faceted crystal shard of hardened tree resin — like a piece of
amber gemstone or a shard of set tree sap. SHARP GEOMETRIC FACETS with clean straight edges
and crisp corners, each facet catching its own hard highlight. Deep warm amber-brown, glowing
from within like the Nectar and Royal Jelly icons in the reference, with a bright specular
hotspot on one facet.
IMPORTANT: it must be ANGULAR and CRYSTALLINE. It must NOT be a rounded droplet, teardrop,
blob, or liquid drop of any kind — its silhouette has to be instantly distinguishable from a
smooth round droplet.
Square 1:1 framing, object centred, filling about 80% of the frame.
```

> **Keep the chip container.** In the mockups each resource sits on a rounded rectangular tile with
> a coloured background. Draw the shard as a bare object on transparency — the game's
> `combRenderResource` seam draws the chip container.

---

## 5. Board pieces — the one place you need TWO versions ⚠️

This is the only asset family where the gallery version and the board version genuinely cannot be
the same file. Same **ids** in both sets (`wall-0..3` `cell-0..3` `dome-0..3`) — the seam
(`combRenderPiece(kind, playerIdx, { hero })`) picks the set, so the gallery and the board can
never disagree about *what* a piece is, only how much detail it shows.

| | `kind` | Renders at | **Draw at** | Detail that survives |
|---|---|---|---|---|
| **Gallery** | `comb-piece-hero` | ~80–100 px | **300 × 300 square** | filigree, gems, crown jewels — the mockups as drawn |
| **Board** | `comb-piece` | ~30 px (wall 41 × 7) | 96 × 96 (wall 112 × 40) | silhouette and player colour, nothing else |

Player index → colour: **0 gold · 1 blue · 2 green · 3 red**. **12 hero + 12 board = 24 images.**

### 5·0. The 12 gallery (hero) images — dimensions + how to fix the ones you cut ⚠️

You have already cut all 12 from `Gemini_Generated_Image_bdec3bdec3bdec3b.jpg` into
`data/art/pending/comb/<piece> <n> gallery.png`. They are **close but not shippable yet** — two
fixes, both by hand, no regeneration:

1. **Crop the name tag off every one.** Each has a hanging paper label baked in — `COMB WALL`,
   `DRONE CELL`, `QUEEN DOME`. The gallery row draws its own text label, so the baked one is
   duplicate *and* it is the thing making every crop a different size (the tag juts out a
   different amount on each). Erase the tag and its little string.
2. **Re-centre each on a 300 × 300 transparent square.** After the tag is gone the piece itself is
   roughly square (walls, cells) or gently portrait (domes — the crown adds height). Put the piece
   dead centre, scaled so its **longest dimension is ~85 % of the canvas (~255 px)**, with even
   transparent padding all round. Exact pixel size does **not** matter; *consistent framing across
   the 12* does — the gallery renders them in one `background-size: contain` box, so a piece cut
   tight on one file and loose on the next will jump around the row.

Result: 12 files, each 300 × 300, transparent, tag-free, centred. On import they take the seam
ids `wall-0`…`dome-3` — your `<piece> 1..4` numbering maps **1→0 gold · 2→1 blue · 3→2 green ·
4→3 red** (the `convert-core-art` step does the rename). That is the whole job for the hero set —
the ornate art itself is good.

> **Domes will read slightly taller-and-narrower than cells in the row. That is correct** — a
> Queen Dome *is* taller than a Drone Cell. Don't squash them to match.

### 5·1. The board (30 px) set — generate fresh

The board needs a separate, brutally simplified set (your `wall 1..4` / `cell 1..4` / `dome 1..4`
without "gallery" in the name are this set and are already good — this stays here for the record).

**Generate each piece type as a row of four colour variants in one image**, so the four players
stay consistent with each other. Player index → colour: **0 gold · 1 blue · 2 green · 3 red**.

### The simplification block

**Paste into all three piece prompts:**

```
CRITICAL — this asset renders at only 30 pixels on a phone screen:
Bold, chunky, simplified silhouette. A THICK dark brown outline around the entire shape.
A single flat body colour with ONE soft light highlight along the top edge.
NO fine detail, NO filigree, NO scrollwork, NO gemstones, NO small ornaments, NO texture,
NO engraved patterns. Everything must stay readable when shrunk to 30x30 pixels.
The thick dark outline is mandatory — it is what keeps the piece visible against both green
and amber board tiles.
```

### 5a. `wall-0..3` — Comb Wall

```
[PREAMBLE] [SIMPLIFICATION BLOCK]
CONTENT: Four versions of the same simple game piece, in a single horizontal row, evenly
spaced, on a transparent background.
The piece: a short, thick, rounded horizontal bar of honeycomb wax — like a chunky brick or
a stubby capsule lying on its side. Slightly wider than it is tall. A faint hexagon pattern
may be embossed on it but must stay extremely subtle.
The four versions, left to right: GOLD, BLUE, GREEN, RED. Identical shape, only the colour
changes. Each keeps the thick dark brown outline and the light top highlight.
```

### 5b. `cell-0..3` — Drone Cell

```
[PREAMBLE] [SIMPLIFICATION BLOCK]
CONTENT: Four versions of the same simple game piece, in a single horizontal row, evenly
spaced, on a transparent background.
The piece: a small rounded pot or squat jar with a plain open circular mouth at the top —
like a simple honey pot. Smooth, glossy, no handles, no decoration, no lid.
The four versions, left to right: GOLD, BLUE, GREEN, RED. Identical shape, only the colour
changes. Each keeps the thick dark brown outline and the light top highlight.
```

### 5c. `dome-0..3` — Queen Dome

**The one rule for this piece:** the **crown** is the only thing separating a Queen Dome from a
Drone Cell at 30 px. It must be exaggerated well past what looks right at full size.

```
[PREAMBLE] [SIMPLIFICATION BLOCK]
CONTENT: Four versions of the same simple game piece, in a single horizontal row, evenly
spaced, on a transparent background.
The piece: a smooth rounded dome or beehive shape, topped by a BOLD, SIMPLE CROWN with three
clear pointed spikes. The crown must be LARGE and EXAGGERATED — roughly one third of the
total height of the piece — because the crown silhouette is the only thing that distinguishes
this piece from a plain pot. Make the three crown points obvious and widely spaced.
No jewels, no scrollwork, no lattice, no windows — just the dome and the bold crown.
The four versions, left to right: GOLD, BLUE, GREEN, RED. Identical shape, only the colour
changes. Each keeps the thick dark brown outline and the light top highlight.
```

---

### 5d. The Sun Compass die — ✅ DELIVERED (grouped here for the same two-version rationale)

**Status 9 Sep 2026:** `die.png` (numbered) and `die unnumbered.png` (blank) are in the folder at
1024², both a faceted near-spherical orb per this spec. Ship the **blank** one (id `die`); the
numbered one (id `die-numbered`) is the How-to candidate. Prompts kept below for the record.

**Terminology fixed 9 Sep 2026.** "The Sun Compass" is the **die** the game casts each turn — a
glowing golden orb flung into the sky, `transform: rotate()`-spun and eased to a stop, with the
result read off it. It is **not** the little row of turn-order dots at the top-left of the board
(that markup was mislabelled and is being renamed `comb-turn-order`). Your current
`data/art/pending/comb/sun compass.png` is a numbered d20 with garbled faces — **not usable as-is**;
regenerate against it as the subject/style reference.

**What it represents — 2d6, exactly.** The roll is `1d6 + 1d6` → **2 to 12 on a bell curve**, and a
fair **36-face die** *is* 2d6 (not an approximation): 36 equally likely faces distributed

| sum | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| faces | 1 | 2 | 3 | 4 | 5 | 6 | 5 | 4 | 3 | 2 | 1 |

Geometrically that is an **18-gonal trapezohedron** (36 kite faces) or **18-gonal bipyramid**
(36 triangles) — both are real, face-transitive (genuinely fair) solids with a **near-spherical
silhouette**, which is what lets it tumble smoothly when spun. Think "faceted golden ball", not
"chunky polyhedron with big flat sides".

#### Dimensions — all variants identical, so they can be swapped freely

| | value |
|---|---|
| **Draw at** | **512 × 512 square**, transparent PNG |
| Renders at | ~120–160 px (cast above the board, briefly, ~60–80× a match) |
| `kind` / ids | `comb-die` — id `die` (ships) and `die-numbered` (comparison / How-to) |
| Aspect | 1.000 — the orb centred, filling ~90 % of the frame, even padding |
| Precache ceiling | **12 KB** per image (JPEG-quality gloss at 512 is cheap; it is one file, spun) |

Because the number is **drawn in canvas on top as the die settles** (same rule as the pogs and
CJAR's cookie values — `art-authoring-guide.md` § "Don't paint in text the game already draws"),
the shipping die carries **no digits**. Generate **both** and we pick after seeing them tumble:

#### 5d-i. `die` — unnumbered (the one that ships in the roll)

```
[PREAMBLE] [FINISH BLOCK]
CONTENT: A single faceted spherical die — an 18-sided trapezohedron with 36 small kite-shaped
facets wrapping a ball, so its outline is very nearly a circle. Solid warm gold and set honey,
wet and slightly translucent, glowing softly from within like the Nectar and Royal Jelly icons.
Every facet catches its own crisp edge and a small hard specular hotspot at the upper left; a
broad soft bounce-light lower down; a warm rim light along the upper-left silhouette; a clean
dark outline around the whole ball and a finer line along each facet seam.
The facets are SMOOTH and BLANK — no numbers, no digits, no pips, no letters, no engraved
symbols of any kind on any face. Just the faceted golden sphere.
Square 1:1 framing, the die centred and filling about 90% of the frame, nothing cropped.
```

#### 5d-ii. `die-numbered` — numbered (for the side-by-side, and possible How-to use)

```
[PREAMBLE] [FINISH BLOCK]
CONTENT: A single faceted spherical die — an 18-sided trapezohedron with 36 small kite-shaped
facets wrapping a ball, so its outline is very nearly a circle. Solid warm gold and set honey,
wet and slightly translucent, glowing softly from within, with the same finish as its blank
twin: hard upper-left specular hotspot per facet, soft bounce-light below, warm upper-left rim
light, a clean dark outline on the ball and a finer line along each facet seam.
Each facet that faces the viewer carries ONE number from 2 to 12, deeply engraved and filled
with dark bronze so it reads against the gold. Lower numbers (2, 3, 11, 12) appear rarely;
middling numbers (6, 7, 8) appear on several facets each — the numbers are NOT in order around
the ball, they are scattered like a real many-sided die. One facet near the top-centre reads 7.
Numbers only — no other symbols, no suit marks, no letters.
Square 1:1 framing, the die centred and filling about 90% of the frame, nothing cropped.
```

> **Gallery use:** if the numbered die reads well it can double as the How-to "The Compass"
> reference tile with no extra art. If neither reads cleanly at ~120 px, the fallback is a flat
> canvas-drawn frequency strip (the table above, as bars) — but try the art first.

---

## 6. Bloom Marker pogs — exactly two, with NO numbers ⚠️

**Do not draw eleven numbered pogs.** The game prints the number in canvas at the device's own
pixel ratio, which is sharper than a downscaled bitmap of "12" at 30 px — the same rule as CJAR's
cookie values and PASS's card ranks (`art-authoring-guide.md` § Don't paint in text the game
already draws).

You need **two**: a normal pog and a red "hot" pog for the 6 and the 8.

### 6a. `blank`

```
[PREAMBLE] [FINISH BLOCK]
CONTENT: A single round game token or counter chip, seen straight on from directly above,
perfectly circular and flat. A polished golden-tan wooden disc with a raised bevelled rim in
warm brushed gold, and a smooth slightly recessed flat centre.
The centre must be COMPLETELY EMPTY AND BLANK — no number, no digit, no letter, no symbol,
no dots, no pattern, no engraving of any kind. It is a blank disc.
Square 1:1 framing, the disc filling about 90% of the frame.
```

### 6b. `hot`

```
[PREAMBLE] [FINISH BLOCK]
CONTENT: A single round game token or counter chip, seen straight on from directly above,
perfectly circular and flat. A deep glowing red disc with a raised bevelled rim in warm
brushed gold, and a smooth slightly recessed flat centre that glows softly red from within,
like hot embers. It should read as dangerous and high-value.
The centre must be COMPLETELY EMPTY AND BLANK — no number, no digit, no letter, no symbol,
no dots, no pattern, no engraving of any kind. It is a blank disc.
Square 1:1 framing, the disc filling about 90% of the frame.
```

---

## 7. Cut, don't generate — most of the pack is already drawn

These are all good as-is. Cut them out, drop the background to transparency, square/trim the
framing, and remove any hanging name tag.

| From this sheet | Cut these | ids | status |
|---|---|---|---|
| `Gemini_Generated_Image_evjpdxevjpdxevjp.jpg` | 5 Instinct faces + the card back | `guard` `bloom` `pheromone` `rush` `golden` `back` | ✅ all cut, incl. `back` (square, see § 8) |
| `Gemini_Generated_Image_xon12zxon12zxon1.jpg` | 6 Trade Blossoms | `generic` `resin` `wax` `pollen` `nectar` `jelly` | ✅ cut — `generic` keeps a baked shadow; judge on a real board before stripping |
| `Gemini_Generated_Image_bdec3bdec3bdec3b.jpg` | 12 ornate pieces → **gallery only** (`comb-piece-hero`) | `wall-0..3` `cell-0..3` `dome-0..3` | ⚠️ cut — now **re-crop per § 5·0** (tags off, 300 × 300) |
| `Gemini_Generated_Image_yblk3oyblk3oyblk.jpg` | The Wasp | `wasp` | ✅ cut. The "Sun Compass" is **not** a cut — regenerate per § 5d |
| `Gemini_Generated_Image_kcjrphkcjrphkcjr.jpg` | ~~2 achievement badges~~ | ~~`largest` `fiercest`~~ | ❌ **not used — decision 9 Sep: achievements are a text status (emoji + name), no art, no `comb-badge` seam** |
| `Gemini_Generated_Image_krefgpkrefgpkref.jpg` | 4 resource icons (**not** Resin) | `wax` `pollen` `nectar` `jelly` | ✅ cut. Resin is the angular shard (§ 4) ✅ |

**Two notes on the cuts:**

- **The Instinct sheet has six tiles for five card kinds.** The one labelled "STOR TROT" is a
  garbled duplicate — discard it, or keep it as alternate `bloom` art. The deck has exactly five
  kinds.
- **The pogs on the misc sheet sit on tan hexagon backgrounds.** Those hexagons are preview
  furniture, not part of the asset — and you only need the two blank pogs from §6 anyway, so it is
  usually faster to generate those clean than to retouch numbers off eleven.

---

## 8. Status — art COMPLETE (9 Sep 2026)

**All art is in** — 52 files in `data/art/pending/comb/`: 6 hex tiles, 5 resources (Resin as the
shard), 6 Instinct faces + `back`, 12 board pieces, 12 hero pieces (regenerated tag-free), 6 Trade
Blossoms, the Wasp, 2 pogs, 2 dice. Nothing left to draw. What remains is a rename map and a batch
of non-art fixes.

| Item | Kind | What |
|---|---|---|
| **`largest` / `fiercest` achievements** | ✅ **no art — by decision (9 Sep)** | Text status only: medal emoji + holder name on the player row and the gameover screen. **No `comb-badge` seam** — delete that row from `art-authoring-guide.md` (done) and don't build the seam. |
| **Sun Compass die** | ✅ delivered | `die.png` (numbered) + `die unnumbered.png` (blank), 1024² — downscale to 512². **Names are inverted vs the ids:** `die unnumbered.png` → id `die` (ships), `die.png` → id `die-numbered`. |
| **12 gallery pieces** | ✅ delivered | Regenerated clean at 1024², no tags. Convert step downscales to 300². |

**Rename map for the `convert-core-art` step** (nothing here is blocking, but it must map right):

| Pending file | Seam id |
|---|---|
| `sunflower.png` | `clover` (hex) |
| `royal jelly.png` | `jelly` (resource) |
| `<piece> 1..4.png` | `<piece>-0..3` — board set, **1→0 gold · 2→1 blue · 3→2 green · 4→3 red** |
| `<piece> N gallery.png` | same `<piece>-0..3` ids, hero set |
| `generic/resin/wax/pollen/nectar/jelly trade.png` | `comb-blossom` keys `generic` `resin` `wax` `pollen` `nectar` `jelly` |
| `die unnumbered.png` / `die.png` | `die` / `die-numbered` |
| everything else | filename already = id (`grove` `guard` `back` `blank` `hot` `wasp` …) |

**Non-art (code/CSS/doc) fixes batched with this pass — not art work:**

- **`back` and the hero set are square.** `back.png` and all 12 hero crops are square masters, so
  `.comb-card` moves `aspect-ratio: 0.727 → 1` and a new `.comb-piece-hero` class gives the hero
  set its own ~5 rem **square** box (it must override `.comb-piece-wall`'s wide thin board box).
- **Rename the mislabelled "Sun Compass" markup** (`#comb-compass` / `.comb-compass-*` → turn-order)
  so the name is free for the die. ~7 lines across `index.html`, `js/games/comb.js`, `css/styles.css`.
- **Wire the two unused seams to consumers:** `combRenderPiece(…, { hero:true })` needs a How-to
  piece-gallery section (none renders it today); `combRenderInstinct({ faceDown:true })` +
  `assetBack('comb-instinct')` need a face-down draw pile or gallery back to call them.
- **Achievements → live text status.** Holders are computed correctly (`combRecomputeAchievements`)
  but only shown on the gameover screen — surface them on the current holder's player row during
  play as **medal emoji + name** (🥇 Largest Comb / 🛡️ Fiercest Guard, or a single 🏆). No icon
  asset, no `comb-badge` seam.
- **`hot` pog number colour.** `comb.js` draws it in `#B3261E` on a deep-red disc — low contrast
  once the red art is behind it; the number should go cream/white on the hot pog.

**Order:** do the die first (it is the only true regeneration and it unblocks the roll animation);
the 12 re-crops are quick and can happen any time; the code/CSS fixes are one implementation pass
once `back` + the hero crops are final.

---

## 9. Related

- `docs/art-authoring-guide.md` § Honeycomb Hills — ids, exact dimensions, precache ceilings
- `docs/new-game-tech-honeycomb-hills.md` §10 — the render stack, the 2.5D rule, the seams
- `docs/expansion-guide.md` § Core art packs — how to promote these to precached defaults
