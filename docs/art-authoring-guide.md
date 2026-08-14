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
