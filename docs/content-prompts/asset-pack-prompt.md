# Prompt: Create a Custom Asset (Skin) Pack
**Use with:** any image-generation AI (for the art) + this checklist (for the pack)
**Output goes into:** `data/packs/<id>/` (manifest + `img/`)

A skin is **device-local cosmetic** — it only changes how *your* device draws a game's ids. Zero
multiplayer impact; missing ids fall back to default art. Full authoring reference (id cheat-sheets,
manifest schema, install steps): `docs/expansion-guide.md` § Add an asset (skin) pack.

---

## Step 1 — Decide what you're skinning

Pick ONE game and its render family (`kind`). You need one image per **id** you want to skin
(partial is fine) plus one face-down `back` image.

| Game | `kind` | How many faces (full set) | Id keys |
|------|--------|---------------------------|---------|
| Fruit Salad | `frt` | 8 | `0`–`7` (banana…apple) |
| Counting Sheep | `shp` | 16 | `0`–`12`, `14`–`16` (id 13 not skinnable) |
| Flawless | `flw` | 10 | `0`–`9` (gem id = carat) |
| PASS | `cards` | 54 | `rank`+suit-letter (`AH`,`10S`,`KD`,…) + `Joker` |
| The Bluff | `dyb` | 6 | `1`–`6` (standard die faces) |

(Exact id→meaning and card aspect ratios are in `docs/expansion-guide.md`.)

---

## Step 2 — Generate the art (image-AI prompt template)

Copy the block below into an image generator. Run it once per face, swapping the **subject** line.
Keep a consistent style across every face so the deck/set looks unified.

<!-- START IMAGE PROMPT -->

A single game [card / die face] illustration, portrait orientation, aspect ratio **[CARD ASPECT — e.g. 3:4]**,
subject: **[THIS FACE — e.g. "the Ace of Hearts", "a smug cartoon banana", "a die showing 5"]**.
Style: **[YOUR THEME — e.g. "neon synthwave on near-black", "hand-painted watercolour", "1980s arcade pixel art"]**.
Centred subject, clean flat background, strong silhouette, high contrast, no text unless the face is
a rank/number, no border frame (the app rounds the corners). Readable as a thumbnail on a phone.

<!-- END IMAGE PROMPT -->

**Art rules:**
- **Format:** PNG (raster art) or SVG (vector/text art). Both work as `background-image`.
- **Size:** ≤ ~100 KB per image (these load on phones). Square-ish for dice; card-shaped for cards.
- **Aspect:** match the game (drawn `cover`, so wrong aspect just crops — keep the subject centred).
- **Consistency:** same palette, lighting, and framing across all faces in the pack.
- **Australian English** in any text. No real brands/logos/trademarked characters.

---

## Step 3 — Name the files by id

Save each image as `<id>.<ext>` (or any name you map in the manifest). Suggested: `0.png`,
`AH.png`, `Joker.png`, `1.svg`, plus `back.png`. Place them in `data/packs/<id>/img/`.

---

## Step 4 — Write `pack.json` and register

```json
{
  "id": "my-skin",
  "label": "MY SKIN",
  "locked": false,
  "games": ["frt"],
  "assets": {
    "kind": "frt",
    "basePath": "img/",
    "faces": { "0": "0.png", "1": "1.png" },
    "back": "back.png"
  }
}
```
Then add `"my-skin"` to `data/packs/registry.json`. Open the Konami terminal →
`GAME SKINS` → your game → your skin. **No code edits, no service-worker bump.**

---

## Tips
- **Start partial.** Skin 2–3 faces, register, and check in-game before committing to a full set —
  the rest stay default until you add them.
- **Copy a `neon-*` sample.** The bundled `neon-fruit` / `neon-sheep` / `neon-gems` / `neon-deck` /
  `neon-dice` packs are working SVG references — duplicate one and replace files image-by-image.
- **The Bluff:** only standard die faces (1–6) skin; the special Tempest dice keep their pip styling
  on purpose so players can still read the die type.
- **Hand it to Claude Code** to sanity-check the manifest (ids match the cheat-sheet, filenames exist)
  before you commit.
