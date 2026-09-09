# Art Authoring Guide — making your own artwork for Little Sylly Games

**Who this is for:** you, on your own, with a folder of pictures. Everything here can be done
without touching a line of code. Ctrl-F your game in § Per-game inventory and start there.

**Last updated:** 10 August 2026 · **Companion tool:** `tools/make-skin-pack.ps1`

---

## 1. Two kinds of artwork — pick the right one first

Both use the **same** manifest format and the same folder shape. They differ in one thing: whether
the art is part of the app install. That single difference drives the size budget, so decide before
you draw.

| | **Skin pack** (what you probably want) | **Core art pack** |
|---|---|---|
| What it is | An optional alternative look you switch on in Secret Mode | The game's *default* artwork |
| Lives in | `data/packs/<your-id>/` | `data/art/<kind>/` |
| Listed in | `data/packs/registry.json` | `data/art/registry.json` |
| Appears in the Terminal | Yes, under `GAME SKINS` | **Never** |
| Caching | Runtime — downloaded the first time you use it online | **Precached** — part of every install |
| Budget per image | **~100 KB** (generous) | **~40 KB** (tight) |
| To add/change it you must edit `sw.js` | **No** | **Yes** — plus a `CACHE_NAME` bump |
| Build it with | `tools/make-skin-pack.ps1` | `tools/convert-core-art.ps1` |

**Almost everything you make should be a skin pack.** It is two actions to install (drop a folder,
add one registry line), it costs nothing to anyone who doesn't use it, and deleting the folder
removes all its weight. Promote a skin to core art only when you want it to become the game's
shipped default — see § 7.

**Skins are device-local and never sync.** Two players in the same match can run different skins,
or none. Game logic and multiplayer packets carry ids only, never image paths, so there is no
multiplayer impact of any kind.

---

## 2. Before you draw — the four things that matter

### Aspect ratio
Images are drawn `background-size: cover`, which means **the wrong aspect is silently cropped**, not
squashed. Draw to the game's ratio from § 5 and nothing is lost. The converter resizes to the exact
ratio for you, so if your source is already close you will not notice the difference.

### Size
Draw **big**, then let the converter shrink it. Source art at 1024 px wide or more is ideal — the
tool downscales cleanly, but it cannot invent detail that was never there.

The tool's default output is **800 px wide**. That is deliberately much larger than the card, which
renders between 52 px and 240 px depending on the game, for one reason: **tapping any card in How to
Play now opens the full artwork at screen size** (added Aug 2026). At 800 px a picture still looks
good filling a phone; at the old 360 px core-art width it looks noticeably soft when enlarged.

### Format
| Situation | Use |
|---|---|
| Full-bleed art, no transparency (nearly all cards) | **JPEG** — the tool's default |
| You need transparency (a die that isn't a full square, a cut-out token) | **PNG** — run the tool with `-Png` |
| Flat vector/text art | **SVG** — hand-authored, skip the converter (see § 6) |

There is no WebP: the build machine has no encoder and the project forbids `npm`.

### Don't paint in text the game already draws
Some games draw a number, label or frame *on top of* your art at render time. Painting the same
thing into the picture double-prints it. The per-game notes in § 5 call out every case — the big
ones are **Cookie Jar** (the cookie value is a text overlay, and three tier images cover all 15
values) and **The Bluff** (the engine draws the coloured type frame around Tempest dice).

---

## 3. Make a skin pack — the whole process

### Step 1 — See exactly what art your game needs

```powershell
& "tools\make-skin-pack.ps1" -Game frt -List
```

It prints the recommended pixel dimensions and every filename to supply. `-Game` is one of
`frt` `shp` `flw` `pko` `cjar` `cards` `dyb`.

### Step 2 — Draw it, and name each file after its id

Put every image in one folder. **The filename is the only thing connecting your art to the game**,
so `0.png`, `back.png`, `elephant.png`, `treat-brownies.png`. Any file whose name isn't a valid id
is reported and skipped — a typo can never quietly ship as a missing card.

**Partial packs are completely fine.** Skin three cards, look at it in game, add more later. Any id
you leave out falls back to the default art rather than breaking.

### Step 3 — Run the tool

```powershell
& "tools\make-skin-pack.ps1" -Game frt -Source "C:\art\my-fruit" -Id my-fruit -Label "MY FRUIT" -Register
```

| Flag | What it does |
|---|---|
| `-Game` | Which game. Sets the aspect ratio and the valid ids. |
| `-Source` | Folder holding your art. |
| `-Id` | The pack's folder name and registry entry. Lowercase, digits and hyphens. |
| `-Label` | What shows in the Terminal. Defaults to the id, uppercased. |
| `-Register` | Also adds the pack to `data/packs/registry.json`. Without it you add that one line yourself. |
| `-Png` | Keep transparency. Output is PNG instead of JPEG. |
| `-Width` | Output width in px. Default `800`. |
| `-CapKB` | Per-file ceiling. Default `100`. |

It resizes and compresses everything, writes `data/packs/<id>/pack.json`, and prints a table. Every
row should say `ok`. A row saying `OVER CAP` means that image is too detailed for the budget — lower
`-Width` or simplify the art.

### Step 4 — Look at it

Open the app, enter the Konami terminal, then **`GAME SKINS` → your game → your skin → launch**.

> Developing online, hard-refresh to pick up a new or changed manifest — pack config is
> network-first. To force a changed *image* to re-fetch, rename it or clear the SW cache in DevTools
> (images are cache-first, so an overwritten file keeps serving the old copy).

**To remove a skin:** delete the folder and its id from `data/packs/registry.json`. Nothing else.

### Step 5 — Check the art in How to Play

Every game with a gallery lists its cards under **How to Play → the second tab**. Tap any card to
see the full artwork. This is the fastest way to review a whole pack at once, and it works with no
match running and no other players.

---

## 4. What you have to update afterwards

**For a skin pack: nothing.** That is the whole point of the format. No `.js` edit, no `sw.js` edit,
no service-worker version bump, no documentation.

The only optional courtesy is adding a row to the pack table in `docs/expansion-guide.md` § Current
packs, so a future reader knows the pack exists.

**For core art, it is different** — see § 7.

---

## 5. Per-game inventory

`Card renders at` is the real on-screen size from `css/styles.css`. `Draw at` is what the tool
outputs by default and what you should author to or above.

---

### Fruit Salad — `-Game frt`

**Card renders at** 72 × 96 px · **aspect 0.750 (3:4)** · **Draw at 800 × 1067**

| id | Fruit | | id | Fruit |
|---|---|---|---|---|
| `0` | Smug Banana | | `4` | Chill Watermelon |
| `1` | Sour Lemon | | `5` | Sus Pear |
| `2` | Charming Peach | | `6` | Panicked Strawberry |
| `3` | Dramatic Grape | | `7` | Angry Apple |

Plus `back` — the face-down card, seen constantly (every serve is face-down).

**8 faces + back = 9 images.** Each fruit has a personality in Sylly Mode, so give them faces if you
want; the names above are the game's own.

---

### Counting Sheep — `-Game shp`

**Card renders at** 64 × 88 px · **aspect 0.727** · **Draw at 800 × 1100**

| id | Card | Family | | id | Card | Family |
|---|---|---|---|---|---|---|
| `0` | +1 | Pasture | | `8` | 1, 2, Skip a Few… | Alarm |
| `1` | +2 | Pasture | | `9` | The Black Sheep | Alarm |
| `2` | +5 | Pasture | | `10` | Wide Awake | Alarm |
| `3` | +10 | Pasture | | `11` | Heavy Eyelids | Alarm |
| `4` | Doze | Pillow | | `12` | The Big Bad Wolf | Trap |
| `5` | Toss & Turn | Pillow | | `14` | −1 | Pillow |
| `6` | −10 | Pillow | | `15` | −2 | Pillow |
| `7` | Lullaby | Pillow | | `16` | −5 | Pillow |

Plus `back`.

**17 faces + back = 18 images** (id 13 included since 11 Aug 2026 — see note below).

> **id 13 is the Fogged Dream** — its *resolved* value (2–12) is hidden from every player
> *including the person holding it*, but that roll happens at play time via `shpRandInt`, entirely
> independent of what face art is shown. A static `13.jpg`/`13.png` doesn't leak anything the card
> is trying to hide, so it's a normal skinnable face like any other — supply it if you want your
> pack to cover it, or omit it and the game falls back to the built-in cursed "?" placeholder for
> that one card (same three-tier resolution as everything else).

The four families have their own colours in the default art (Pasture, Pillow, Alarm, Trap) — worth
keeping some visual grouping, because reading your hand fast is the whole skill of the game.

---

### Flawless — `-Game flw`

**Card renders at** 88 × 88 px (`.flw-card-lg`, the largest on-table size) · **aspect 1.000
(square)** · **Draw at 800 × 800** · core art ceiling **60 KB/file**

**Square art with NO text and NO border baked in.** The display-case frame, the carat placard and
every interaction state (dimmed / selected / fallback) are drawn entirely by CSS (`.flw-card*`,
`.flw-carat` in `css/styles.css`) — this is the one game in the suite where baking the carat number
into the art is actively *wrong*, not just redundant: it would sit underneath the real CSS placard,
doubled. Draw the gem itself, centred, on a plain or softly-graded ground, and stop there.

**The on-table card is not the size to author for.** FLW's largest real consumer is the full-width
art viewer (~340 CSS px, ~1020 device px at 3× DPR on a typical phone) — 88 px is 5.8× smaller.
512 × 512 masters (this game's core art ships at 512 px, above the usual 360 px core-art width)
serve the viewer at a reasonable quality without breaching the 60 KB/file ceiling — see
`tools/convert-core-art.ps1`'s FLW CONFIG block for the actual run.

| id | Gem | In the Vault | | id | Gem | In the Vault |
|---|---|---|---|---|---|---|
| `0` | Raw Obsidian | 2 | | `5` | Yellow Topaz | 2 |
| `1` | Clear Quartz | 6 | | `6` | Green Emerald | 2 |
| `2` | Purple Amethyst | 2 | | `7` | Blue Sapphire | 1 |
| `3` | Black Opal | 2 | | `8` | Blood Ruby | 1 |
| `4` | Imperial Jade | 2 | | `9` | Pink Diamond | 1 |

Plus `back`. **10 faces + back = 11 images**, 21 cards total in the deck.

---

### Pecking Order — `-Game pko`

**Card renders at** 68 × 92 px · **aspect 0.739** · **Draw at 800 × 1082**

| id | Animal | | id | Animal | | id | Animal |
|---|---|---|---|---|---|---|
| `mouse` | Mouse | | `bee` | Bee | | `polar_bear` | Polar Bear |
| `mongoose` | Mongoose | | `fish` | Fish | | `orca` | Orca |
| `leopard` | Leopard | | `octopus` | Octopus | | `stingray` | Stingray |
| `eagle` | Eagle | | `seal` | Seal | | `human` | **The Poacher** |
| `bear` | Bear | | `elephant` | Elephant | | `mimic` | **Invasive Mimicry** |

Plus `back`, and one **extra**: `chain` — the food-chain reference diagram.

**15 faces + back + 1 extra = 17 images.**

- `human` is **the Poacher**, not a generic person — it beats any single Mark outright and is
  deliberately drawn as out-of-place in the ecosystem.
- `mimic` is **Invasive Mimicry** (a Sylly Mode card) — it copies whatever it is played with.
- `chain` is **not card-shaped.** It is a wide diagram read at full width, and it is the single most
  zoomed image in the suite (tapping it in How to Play opens it full screen). The tool preserves its
  own aspect rather than forcing the card ratio. Draw it wide and make the text large.

---

### Cookie Jar — `-Game cjar`

**Card renders at** 240 × 330 px (hero) · **aspect 0.728** · **Draw at 800 × 1099**

CJAR shows the **largest card in the suite** — a 15 rem hero card, front and centre for the whole
flip. Its art is looked *at*, not glanced at, so this is the game where drawing quality pays off most.

| id | Card | | id | Card |
|---|---|---|---|---|
| `cookie-handful` | Cookies, low tier | | `family-grandma` | Grandma |
| `cookie-batch` | Cookies, mid tier | | `family-pet` | The Pet |
| `cookie-mountain` | Cookies, high tier | | `treat-shortbread` | Shortbread (5 pts) |
| `family-mum` | Mum | | `treat-redvelvet` | Red Velvet (5 pts) |
| `family-dad` | Dad | | `treat-macadamia` | Macadamia (5 pts) |
| `family-big` | Big Brother | | `treat-macarons` | Macarons (10 pts) |
| | | | `treat-brownies` | Brownies (10 pts) |

Plus `back`. **13 faces + back = 14 images.**

> **Three cookie images cover all 15 cookie values.** The number is drawn as a **text overlay** on
> top of your art at render time — so do **not** paint a number onto a cookie card. Draw
> `handful` / `batch` / `mountain` as visibly different *quantities* and let the game print the value.
> The same overlay prints a Treat's points, so don't paint those either.

---

### Honeycomb Hills — `-Game comb`

**The biggest art job in the suite — four render seams plus four extras.** Read this whole entry
before drawing anything: the board is a **2.5D hex grid**, and that imposes constraints no other
game in the suite has.

#### The four seams

| Seam | `kind` | Renders at | Aspect | **Draw at** | Ids |
|---|---|---|---|---|---|
| **Hex tile** | `comb-hex` | **72 × 97 px** | **0.74** | **224 × 304** | `grove` `blossom` `clover` `rock` `nursery` `smoke` |
| **Resource** | `comb-res` | 32 × 32 px | 1.00 | 96 × 96 | `resin` `wax` `pollen` `nectar` `jelly` |
| **Instinct card** | `comb-instinct` | 160 × 220 px | **1.00 (square)** | **600 × 600** | `guard` `golden` `rush` `bloom` `pheromone` + `back` |
| **Structure — board** | `comb-piece` | ~30 × 30 px (wall 41 × 7) | 1.00 | 96 × 96 (wall 112 × 40) | `wall-0..3` `cell-0..3` `dome-0..3` |
| **Structure — gallery** | `comb-piece-hero` | ~80–100 px | 1.00 | **300 × 300** | same ids — ornate; How-to only |

Player index → colour: **0 gold · 1 blue · 2 green · 3 red**.

**6 hexes + 5 resources + 6 cards + 12 board pieces + 12 hero pieces = 41 images**, plus the extras
below.

> **Instinct cards and `back` are square** (600 × 600), not portrait — the delivered masters are
> square and `.comb-card` is set to `aspect-ratio: 1`. **The two piece sets share ids**
> (`wall-0`…`dome-3`); `combRenderPiece(kind, playerIdx, { hero })` picks the set. The board wall
> art is landscape (stretched along a hex edge); the hero wall art is square (a 3/4 view). Give
> `.comb-piece-hero` its own square box — it must override `.comb-piece-wall`'s wide thin board box.

#### ⚠️ The hex tiles are the hard part — read this twice

The board draws hexes as **2.5D slabs**: a flat pointy-top hex **top face**, plus a **side wall**
extruded below it. Back-to-front painter's order means each hex's wall is hidden by the row in
front, so only the front row's wall is fully visible.

**One image contains both** — top face *and* wall — at **224 × 304**. The top face occupies the
upper **224 × 259**; the wall is the bottom **45 px**.

Four rules, and breaking any one of them stops the board tiling:

1. **Identical viewing angle, wall depth and width on all six.** They tessellate. One hex drawn at
   a slightly different angle shows as a seam across the whole board.
2. **Decoration may overhang the TOP edge by ≤15% of hex height (~39 px of the 259). Never left,
   right or bottom.** Top overhang is *good* — a tree breaking the top edge draws over the hex
   behind it and reads correctly. Left/right overhang breaks tiling; bottom overhang covers the wall.
3. **Each kind needs its own base tone.** In the first mockup pass, grove, blossom and clover all
   sat on green. At 72 px that is unreadable, and production is resolved *by hex kind* — misreading
   one costs a player resources they were owed. Keep Sapling Grove green; move Pollen Meadow and
   Sunflower Patch onto their own bases. **Sunflower Patch's "base" is blue *sky* behind upright
   flowers, not blue ground** (`docs/content-prompts/comb-art-prompts.md` §3c) — the one hex
   painted as a scene with a horizon rather than pure top-down; its slab outline and angle still
   match the others, so it still tessellates.
4. **No label tags, no drop shadows onto the background.** The mockups' hanging name tags are
   preview furniture. The game draws its own labels.

**Draw at 224 × 304 (aspect 0.74), not square.** A 1024 × 1024 master `cover`-cropped into this
throws away ~26% of every byte — the CJAR TG-02b trap.

#### The four extras (`assetExtra`)

| `kind` | key(s) | Renders at | Draw at | Notes |
|---|---|---|---|---|
| `comb-blossom` | `generic` `resin` `wax` `pollen` `nectar` `jelly` | 34 × 34 px | 112 × 112 | Trade Blossoms — 6 images |
| `comb-wasp` | `wasp` | 34 × 34 px | 112 × 112 | Sits on `combWaspHex` |
| `comb-pog` | `blank` `hot` | 30 × 30 px | 96 × 96 | **2 images only — see below** |
| `comb-die` | `die` `die-numbered` | ~120–160 px | **512 × 512** | **The Sun Compass** — the 2d6 die, a faceted golden orb spun each turn. `die` ships (blank, number drawn in canvas); `die-numbered` is for the How-to tile. **NOT** the turn-order dots (`#comb-turn-order` — renamed from the mislabelled `comb-compass` 9 Sep 2026). The die roll animation/seam itself is a separate, not-yet-built chunk. See `docs/content-prompts/comb-art-prompts.md` § 5d |

**The two achievements — Largest Comb / Fiercest Guard — carry NO art.** They render as a text
status (medal emoji + name) on the holder's player row and on the gameover screen. There is no
`comb-badge` seam — `combLargestHolder` / `combFiercestHolder` drive the label directly.

> **Bloom Marker pogs are TWO images, not eleven.** One blank pog and one "hot" (red, for 6 and 8).
> **The number is drawn in canvas on top** — so do not paint 2…12 onto eleven pogs. Ten numbered
> bitmaps would cost ~40 KB more *and* look worse: a downscaled image of "12" at 30 px is softer
> than canvas text rendered at the device's own pixel ratio. Same rule as CJAR's cookie values and
> PASS's ranks — **don't paint in text the game already draws** (§ 2).

#### What must read at size — and what doesn't

The board is ~358 × 345 px on a typical phone. That means:

- A **Queen Dome is 30 px.** Its **crown notch** must read, because that is the only thing
  separating it from a Drone Cell. The filigree will not survive and does not need to.
- A **Comb Wall is 41 × 7 px.** Only its **player colour** matters. There can be 60 on screen.
- **Every piece needs a dark contour and a light top rim.** Player *green* on a green hex and
  player *gold* on Sunlit Rock's amber both vanish without it. One outline rule separates all four
  player colours from all six hex kinds at once — a per-colour fix cannot.

#### Resource shapes are load-bearing, not decoration

Colour alone fails under the most common form of colour blindness, so **each resource carries a
distinct silhouette**:

| Resource | Shape | Colour |
|---|---|---|
| Resin | **angular shard** — *not a droplet* | dark amber |
| Pollen | sphere / cluster | pink |
| Nectar | droplet | bright gold |
| Wax | hexagon | pale cream |
| Royal Jelly | pudding dome | purple |

> The first mockup pass drew **Resin and Nectar as the same droplet in adjacent hues**. They sit
> side by side in the hand, every cost line and every trade offer. **Resin becoming an angular
> shard is the single change that fixes it** — with five distinct shapes, Nectar keeps its gold and
> Wax's cream is fine against it (hexagon vs droplet, and cream is far lighter in value).

#### Precache budget

**3.64 MB total, actually achieved (10 Sep 2026 conversion, second pass).** Ceilings: hex **350 KB**
(340×460) · resource **150 KB** (260×260) · Instinct card **40 KB** (600×600, unchanged) · board
piece **6 KB** (unchanged — never zoomed, canvas-only at ~30 px) · hero piece **130 KB** (280×280) ·
Trade Blossom **8 KB** (unchanged — canvas-only) · Wasp **10 KB** (unchanged — canvas-only) · pog
**4 KB** (unchanged — canvas-only) · die **150 KB** (260×260). This is *core art*, so it is precached
and **needs an `sw.js` `CACHE_NAME` bump** (§ 7) — that is the whole difference from a skin pack. (No
badge art — the two achievements are a text status; see the extras note above.)

> **Hex/resource/hero-piece/die ceilings went through two rounds, and the second is a different kind
> of decision than the first.** Round one (9 Sep) raised only hero piece and die (14→27 KB, 12→26 KB)
> against the *pre-art* estimate — a modest correction once real art existed to measure against.
> Round two (10 Sep, owner review of the shipped gallery) raised all four **gallery/viewer-facing**
> kinds by roughly 4× resolution, because the art viewer's own fix that same day (`ui-style.md` §
> Pattern 2a note on `.art-viewer-img`) started scaling these small masters UP to fill its
> ~342–390 px box — a master sized for a 30–100 px on-board render looks fine AT that size and
> visibly soft once stretched 4× into a viewer. **The owner's call was explicit: KB/MB cost is not
> the constraint for gallery-facing art.** Board pieces, Trade Blossoms, the Wasp and the pogs are
> UNCHANGED — none of them render in a how-to gallery or the art viewer, only ever on the small
> canvas board, so their original small-render sizing is still correct and untouched.
> `tools/convert-comb-art.ps1` is the converter (all nine `comb-*` core art packs); see
> `comb-implementation-notes.md` DD-19/DD-23 for both rounds. Generalises past `cjar-impl-notes`
> TG-02b's "measure the quality a cap forces": the render size that matters is whichever CONSUMER is
> largest, and that can change later (a viewer fix can retroactively make an earlier cap wrong without
> the art itself changing) — re-measure when a new consumer appears, not just once at launch.

---

### PASS — `-Game cards`

**Card renders at** 56 × 80 px · **aspect 0.700** · **Draw at 800 × 1143**

**Id = rank + suit letter.** Ranks in PASS's own power order: `3 4 5 6 7 8 9 10 J Q K A 2`
(a 2 is the highest card). Suits: `H` `D` `C` `S`. So `3H`, `10S`, `KD`, `AC`. Plus `Joker`.

Plus `back`. **53 faces + back = 54 images** — by far the biggest pack in the suite.

> **Start partial.** 54 images at 100 KB is ~5 MB. That is acceptable for a runtime-cached skin you
> chose to install, but it is a lot of drawing before you see anything. Do one suit first, look at
> it, then continue. It is also why PASS still has no core art: as a *precached* default that
> budget would land in every install.

---

### The Bluff — `-Game dyb`

**Die renders at** 52 × 52 px · **aspect 1.000 (square)** · **Draw at 800 × 800**

Ids are the face values `1` `2` `3` `4` `5` `6`, plus `back` (a die in the cup, face down).

**6 faces + back = 7 images.**

> **Dice are square, and probably need transparency.** If your die art is not a full square tile —
> a rounded die on a plain background, a cut-out — run the tool with **`-Png`**. JPEG has no alpha
> and will fill the corners with solid colour.

**Optional: the five Tempest die types.** The Bluff's Sylly Mode turns dice into `loaded`,
`phantom`, `slick`, `cracked` or `snake`. These are skinnable via a `specials` block, which the tool
does **not** write — add it to `pack.json` by hand:

```json
"assets": {
  "kind": "dyb", "basePath": "img/",
  "faces": { "1": "1.png", "6": "6.png" },
  "back":  "back.png",
  "specials": {
    "loaded":  { "1": "l1.png", "6": "l6.png" },
    "snake":   { "3": "s3.png", "frame": false },
    "phantom": { "blank": "ghost.png" },
    "cracked": { "blank": "broken.png" }
  }
}
```

Three things to know:
- **The frame is the type; the image is the face.** By default the engine draws its own coloured
  border, tint and glow *around* your art, so a Loaded die stays unmistakably loaded however you
  paint it. Set `"frame": false` on a type when your art carries that identity itself — but then
  you own keeping it distinguishable from the other four, and the opt-out is ignored for any face
  you didn't supply.
- **`"blank"` is the type showing no value at all** — a concealed phantom, a cracked die. It never
  falls back to a face image, because that would leak the hidden value to the whole table.
- **Not everything is skinnable.** An unassigned Slick keeps the engine's `4*` glyph: that digit is
  live state the player needs in order to choose, not decoration.

`data/packs/deep-ocean-dice/` is a complete worked example (per-type faces, the frame opt-out, both
`blank` keys, one deliberately omitted type). `data/packs/sea-cliff-dice/` is faces-only, so you can
see the fallback behaviour.

Verify any change to this seam with `node tools/verify-dyb-dice.js`.

---

### Renaming, not just re-skinning — the optional `names` block

A skin can reflavour a card's **art without touching its name** (the default — a Dinosaur-skinned
Elephant still says "Elephant"), or override the name too. The tool never writes this — add it to
`pack.json` by hand, same as DYB's `specials` block above:

```json
"assets": {
  "kind": "pko", "basePath": "img/",
  "faces": { "elephant": "elephant.jpg" },
  "back":  "back.jpg",
  "names": { "elephant": "Titanosaur", "mouse": "Compsognathus" }
}
```

- Keyed by the same id as `faces` — omit any id you don't want renamed, it keeps the game's default
  name.
- Text only, resolved wherever the game shows a card's name (`assetName(kind, id, fallback)` in
  `js/lib/art.js`) — it does not touch multiplayer packets, which carry ids only, never names.
- No core-art tier for names, unlike art: a game's *default* names are canonical and only a skin
  can override them.

---

### Full remap packs (a different creature/character per id) — supply a mapping list

**A reskin keeps the same cast** — a Dinosaur-skinned Elephant is still conceptually "the elephant",
just drawn differently, so renaming each file to its id (§3 Step 2) is a mechanical, obvious task
you do yourself. **A remap swaps the cast** — a Monster Hunter pack doesn't have an elephant, it has
Deviljho standing in the elephant slot — and your source art almost never arrives pre-named after the
game's ids. It arrives named after *itself* (`rathalos.jpg`, `zoh shia.jpg`), because that's what the
art actually is. Renaming 15 files by hand from a name that means nothing to you (`eagle`) to a name
that does (`rathalos`) is exactly the step someone else needs written down to do correctly, and doing
it *for* PKO specifically means also knowing the game's own tier structure — nothing in a folder of
loose portraits tells anyone that on its own.

**Step 0 — before any art gets touched, write `mapping.txt` and drop it in the source folder**
(`data/pending/<name>/mapping.txt`, alongside the images). One line per id, exactly as you want it —
this is the part only you can supply, because it's a creative call, not something derivable from the
files:

```
mouse = kulu yaku
mongoose = barroth
leopard = nargacuga
eagle = rathalos
bear = rajang
elephant = deviljho
bee = najarala
fish = royal ludroth
octopus = plesioth
seal = mizutsune
polar_bear = lagiacrus
orca = ceadeus
stingray = nakarkos
human = hunter
mimic = zoh shia
```

**Two things that make this list reliable:**

- **Cover every id, including the ones that feel awkward.** `mh-pko`'s first hand-off missed the
  `eagle` line — plausibly because it's the one id that doesn't map to a monster's *type* so much as
  its *role* ("things in the sky"), so it's easy to skip when running down a mental list rather than
  the game's actual id set. Copy the id list from `-List` (Step 1 below) into the mapping file first
  and fill every line, rather than writing rows from memory.
- **For PKO, ground creature-to-id choices in the game's real food-chain tiers**
  (`PKO_PREY_RANK` in `js/games/pko.js`) — land ladder `mouse < mongoose < leopard < bear < elephant`,
  sea ladder `fish < octopus < seal < polar_bear < orca`, both weakest to strongest — so a themed
  creature lands at roughly its own in-universe power level instead of a random slot in the chain.
  `eagle`, `bee`, `stingray`, `human` and `mimic` sit outside both ladders (see the comment above
  `PKO_PREY_RANK`) and can take whatever's left over.

**Step 1 — see the id list, and cross-check the mapping against it:**

```powershell
& "tools\make-skin-pack.ps1" -Game pko -List
```

Every id it prints should have exactly one line in `mapping.txt`. If the two don't match 1:1, stop
and fix the mapping before touching any images — a mismatch caught here is one line edit; caught
after building, it's a file-content swap (see the worked example below).

**Step 2 — stage the art, renamed per the mapping, into a scratch folder** (never rename the
originals in place — keep the source names, in case the mapping changes):

```powershell
$stage = "$env:TEMP\mh-pko-stage"
New-Item -ItemType Directory -Force $stage | Out-Null
Copy-Item "data\pending\mh-pko\kulu yaku.jpg"  "$stage\mouse.jpg"
Copy-Item "data\pending\mh-pko\barroth.jpg"    "$stage\mongoose.jpg"
# ... one Copy-Item per mapping.txt line ...
Copy-Item "data\pending\mh-pko\back.jpg"       "$stage\back.jpg"
Copy-Item "data\pending\mh-pko\chain.png"      "$stage\chain.png"
```

**Step 3 — run the tool against the staged folder, same as any other pack** (§3 Step 3). If any row
comes back `OVER CAP` even at the tool's lowest JPEG quality step, re-run with a lower `-Width` —
`mh-pko` needed `-Width 640` (down from the 800 default) before all 17 rows read `ok`:

```powershell
& "tools\make-skin-pack.ps1" -Game pko -Source $stage -Id mh-pko -Label "MONSTER HUNTER" -Width 640 -Register
```

**Step 4 — add the `names` block by hand**, same mapping, this time keyed id → display name (the
tool never writes this — see the "Renaming" section above):

```json
"names": { "mouse": "Kulu-Ya-Ku", "mongoose": "Barroth", "eagle": "Rathalos", "...": "..." }
```

**If the mapping changes after the pack is already built** (this happened on `mh-pko`'s first pass —
two pairs came back swapped once the real mapping arrived), you don't need to re-run the whole tool.
The images in `data/packs/<id>/img/` are already resized and compressed; only their *id assignment*
is wrong. Swap the two files directly, then fix the two `names` entries to match:

```powershell
Move-Item fish.jpg fish_tmp.jpg
Move-Item octopus.jpg fish.jpg
Move-Item fish_tmp.jpg octopus.jpg
```

**Don't leave `mapping.txt` in the shipped pack.** It's a working note for whoever builds the pack,
not part of the manifest format — `data/packs/<id>/img/` is served at runtime, so anything dropped
there is fetched like an asset even though nothing references it. Once its contents are folded into
`pack.json`'s `names` block, delete it.

Reference: `data/packs/mh-pko/` (Monster Hunter remap of PKO, 29 Aug 2026) — a complete worked
example of every step above, `pack.json`'s `names` block included.

---

## 6. Hand-writing a manifest (SVG packs, or fine control)

The tool is a convenience, not a requirement. The manifest is the real contract, and it is small:

```json
{
  "id": "neon-fruit",
  "label": "NEON FRUIT",
  "locked": false,
  "games": ["frt"],
  "assets": {
    "kind": "frt",
    "basePath": "img/",
    "faces": { "0": "banana.svg", "1": "lemon.svg", "7": "apple.svg" },
    "back": "back.svg"
  }
}
```

- `id` must equal the folder name and the registry entry.
- `games` is the single game this skin targets.
- `assets.kind` is the render-seam family: `frt` · `shp` · `flw` · `pko` · `cjar` · `cards` · `dyb`.
- **The manifest owns the id → filename mapping**, so your files can be named anything. PKO's core
  art serves the id `human` from a file called `poacher.jpg`.

The bundled `neon-*` packs are working SVG references — copy one and replace the images.

---

## 7. Promoting a skin to core art (making it the default)

Only do this when you want the art to *ship* as the game's default look. It costs install weight for
everyone, so the budget drops from ~100 KB to **~40 KB** per image.

1. Re-run the conversion with `tools/convert-core-art.ps1` (edit its CONFIG block) into
   `data/art/<kind>/img/`.
2. Write `data/art/<kind>/pack.json` — same `assets` block, plus `"core": true`.
3. Add the kind to `data/art/registry.json`.
4. **Add the manifest *and every image* to `PRECACHE_URLS` in `sw.js`, then bump `CACHE_NAME`.**
5. Tick the game's row in the rollout tracker in `docs/expansion-guide.md` § Core art packs.

**Step 4 is the whole difference from a skin pack, and it is the one that gets missed.** Skip it and
the art is simply absent on a cold offline install — the game silently falls back to emoji.

### The offline install check

The check that step 4 actually worked. Single device, no lobby, no second phone:

> DevTools → Application → **unregister the service worker** → hard reload → tick **Offline** →
> open the game → **How to Play → the gallery tab**.

**Illustrated cards mean the manifest and every image precached. Emoji means it did not** — the
third fallback tier fired, and step 4 is incomplete. A card that shows art but doesn't respond to a
tap is the same signal: the gallery only offers to enlarge art it actually resolved.

Firebase is irrelevant here and lazy-loaded; the app stays fully functional offline right up to
tapping Host/Join, which shows `mp-network-error-overlay`. **That overlay appearing offline is
correct behaviour, not a failure of this check.**

---

## 8. Troubleshooting

| What you see | What it means |
|---|---|
| `SKIPPED - filename does not match any id` | Your file is named something the game doesn't have an id for. Run `-List` and rename. |
| `OVER CAP` on a row | That image is too detailed for the byte budget. Lower `-Width`, or simplify the art. |
| Cards still show emoji in game | The skin isn't active (check the Terminal), or the manifest's `kind` is wrong for that game. |
| Some cards skinned, some not | Working as intended — a partial pack falls back per id. Check the `PARTIAL PACK` list the tool printed. |
| The art looks cropped | Wrong aspect ratio. Images are drawn `cover`. Redraw to the ratio in § 5. |
| Changed an image but the old one still shows | Images are cache-first. Rename the file, or clear the SW cache in DevTools. |
| Added a pack but the Terminal doesn't list it | Config is network-first — you must be online once, then hard-refresh. Also check the id is in `data/packs/registry.json`. |
| Tapping a card in How to Play does nothing | There is no artwork resolved behind it — that tile is on its emoji fallback. |
| Die corners are filled with solid colour | JPEG has no transparency. Re-run with `-Png`. |

---

## 9. Related documents

| Doc | What it covers |
|---|---|
| `docs/expansion-guide.md` | Word packs, the pack/registry system, the core-art rollout tracker |
| `docs/rules/word-expansion.md` | Content rules for word banks (not art) |
| `js/lib/art.js` | The three-tier resolution seam — skin → core art → emoji |
| `tools/make-skin-pack.ps1` | This guide's companion tool (`-List` prints any game's inventory) |
| `tools/convert-core-art.ps1` | The core-art converter (step 1 of § 7) |
