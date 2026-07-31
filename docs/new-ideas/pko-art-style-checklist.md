# Pecking Order — Art Style Checklist & NanoBanana Prompts
**Purpose:** Working doc for generating the full ~53-asset default v1 art set.
**Status:** Style locked — Option B, Painterly Gouache / Earthy Naturalist. See §4 for decisions log.
**Companion to:** `new-game-brief-pko.md` §9A, §16

---

## 0. Constants — apply to every asset regardless of type

- **Tone:** raw nature, predator/prey drama. NOT a children's animal-matching game, NOT documentary/field-notes cute (that's Natural Selection's register).
- **Brand colour:** deep amber-brown (earthy, savanna) — should read in backgrounds and accents, not fight the illustration.
- **Format:** card faces at **3:4 portrait**, no border frame (the app rounds corners), no text baked into the art.
- **Style line (locked):** *"hand-painted gouache illustration, visible brush texture, warm earthy palette (ochre, rust, deep umber, moss), dramatic single-source lighting, painterly not photographic"*
- **Composition rule:** the leftmost 25–30% of each card must contain a strong identifying visual element — a distinctive silhouette detail or dominant colour specific to that animal. This is the only portion visible when a card is in the Hoard fan (60–70% overlap). Players read the fan by scanning left-edge slivers; a mid-card detail that bleeds to the right doesn't help them.
- **Consistency:** same lighting direction, palette logic, and framing across all 15 faces. A player must be able to tell at a glance all cards belong to the same set.
- **Readability:** test every asset at actual mobile card size — not full-screen. Strong silhouette, high contrast.
- **Australian English** in any generated text. No real brands, logos, or trademarked characters.

---

## 1. Per-Card Prompt Template

Copy once per card, swap the `[ANIMAL]` field only. Do not vary the style line between cards.

<!-- START IMAGE PROMPT -->

A single animal trading card illustration, portrait orientation, aspect ratio 3:4, subject: **[ANIMAL — e.g. "an elephant, three-quarter view, mid-stride, facing slightly left"]**. Style: hand-painted gouache illustration, visible brush texture, warm earthy palette (ochre, rust, deep umber, moss), dramatic single-source lighting, painterly not photographic. The animal's most distinctive identifying feature (silhouette, colouring, or body part) should be prominent in the left third of the composition. Clean muted background that doesn't compete with the subject. Strong silhouette, high contrast, no text, no border frame. Mood: raw nature, predator/prey tension — not cute, not documentary.

<!-- END IMAGE PROMPT -->

---

## 2. Card List & Notes

Work through this in chain order — apex animals first, since those are the ones players stare at most.

### Land chain (7 cards)

| Card | id | Fan-sliver hint | Pose suggestion |
|---|---|---|---|
| Elephant | `elephant` | Trunk + tusks, grey mass | Three-quarter view, mid-stride or rearing slightly — Land Apex, must feel imposing |
| Bear | `bear` | Brown bulk, shoulder hump | Upright or front-on, direct gaze |
| Leopard | `leopard` | Spot pattern on left flank | Stalking low, body angled left |
| Eagle | `eagle` | Wing leading edge, white head | Wings spread, diving — dead-end branch, should feel powerful but exposed |
| Mongoose | `mongoose` | Banded fur, alert ears | Alert stance, slight crouch |
| Mouse | `mouse` | Round ear, tiny silhouette | Low to ground, furtive — bottom of chain, should feel small |
| Bee | `bee` | Yellow-black striping, wing edge | Close crop, mid-flight — Giant-Killer, should feel disproportionately threatening |

### Sea chain (6 cards)

| Card | id | Fan-sliver hint | Pose suggestion |
|---|---|---|---|
| Orca | `orca` | Black dorsal fin + white patch | Breaching or angled upward — Sea Apex |
| Polar Bear | `polar_bear` | White mass against dark water | Front-on or mid-paddle, cold blue-grey water bg |
| Seal | `seal` | Dark rounded body, whiskered face | Rearing up or twisting |
| Octopus | `octopus` | Tentacle curl, deep red-purple | Arms reaching left, eye prominent |
| Fish | `fish` | Scales catching light | School or single fish, vulnerable |
| Stingray | `stingray` | Wing edge, barbed tail | Gliding from left — Giant-Killer, underside slightly visible |

### Wildcard & Special (2 cards)

| Card | id | Notes |
|---|---|---|
| Poacher (Human) | `human` | Dark/charcoal background. Subject as silhouette or shadowed figure — deliberately out-of-ecosystem. No warm earthy palette here; cold and apart. "Answers to no one." |
| Mimic | `mimic` | Fractured or overlapping multi-species silhouette rather than a single clean subject. Signals "wildcard/unstable." FoN-only, but must still fit the set visually. |

### Card back (1 asset)

Pattern-only, no animal. Must immediately read as "face-down" from across a table. Repeat the gouache texture + amber-brown palette — earthy geometric or natural-pattern motif (feathers, scales, leaf veining). No single species identifiable.

---

## 3. Game-Level Assets (non-card)

### Alpha overlay
Crown + glow effect on **transparent background** — generated once, applied universally via `opts.alpha = true`. Do not bake the crown into any individual card art. The overlay must read clearly on top of any of the 15 card styles including the dark Poacher treatment.

Generate two versions to test: (A) illustrated/painterly crown, (B) CSS/SVG glow-only with a simple icon crown. Either works; whichever integrates more cleanly with the gouache backgrounds at card size wins.

### Track pip icons
Three icons: 🌿 Land / 🌊 Sea / ⚡ Wild (Poacher/Mimic).
These sit in the top-left corner of the card at small size. Test as: (A) simple styled emoji/icon — probably fine given the size, (B) small painted badge matching the gouache style. Start with A; only go to B if A looks jarring against the card art.

### Chain diagram
Reuse the Gemini mockup prompt from `new-game-brief-pko.md` §16 for layout. Style: render in the gouache aesthetic — illustrated animal nodes rather than emoji, same palette. Two vertical columns (Land left, Sea right), arrows prey→predator (upward), Bee/Stingray curved Ambush loops back up, Eagle as dead-end side branch, cross-track dashed arrows from Mongoose and Eagle to Fish, Poacher floating above both columns. Mobile portrait format, readable at small size.

### Force of Nature event banners (10 total)
One illustrated scene per event: The Culling, The Great Reversal, The Deluge, The Dry Season, Extinction Event, Migration, Dark Forest, Alpha, Carrion, Invasive Mimicry (fixed opener). Gouache style, landscape or wide-format banner crop, evocative scene rather than literal illustration. **Lowest priority** — these are shown once per Encounter, not held/studied repeatedly. Generate card faces and the chain diagram first; defer banners to styled text/CSS if time runs short.

---

## 4. Production Checklist

- [x] Style locked: Option B, Painterly Gouache / Earthy Naturalist
- [ ] **Byte budget: 40 KB/card WebP ceiling (confirmed 31 July 2026 — tech spec §16 Q6).** Export/resize every asset to hit this before delivery — PKO is the first game in the suite to precache bitmap art, so the whole set (~53 assets) needs to land near ~2 MB total install weight. Confirm each exported file against the ceiling, not just the final composite.
- [ ] Generate Elephant test card — review at actual mobile card size
- [ ] Generate Orca test card — review at actual mobile card size
- [ ] Confirm style line is holding consistently across both apexes before full run
- [ ] Generate remaining 13 card faces (work Land chain top→bottom, then Sea chain top→bottom, then Poacher, then Mimic)
- [ ] Generate card back
- [ ] Generate Alpha overlay (test illustrated vs CSS/SVG versions)
- [ ] Generate track pip icons (test emoji/icon vs painted badge)
- [ ] Generate chain diagram
- [ ] Generate Force of Nature banners (or defer to styled text/CSS)
- [ ] Deliver full set to Claude Code — confirm filenames match card id cheat-sheet before wiring into `pkoRenderCard()`

---

## 5. Decisions Log

| Decision | Outcome | Rationale |
|---|---|---|
| Style choice | **Option B locked** — Painterly Gouache / Earthy Naturalist | Strongest match to "raw nature" brief and amber-brown brand colour; feels premium without being photoreal. Tested against Options A (Bold Flat) and C (Woodcut) on Elephant + Orca. |
| Option A (Bold Flat) | **Dropped** | Clean but reads "safe" and doesn't serve the raw-nature tone. |
| Option C (Woodcut/Linocut) | **Dropped** | Too stylistically loud for v1 default; Poacher/Mimic treatments would be awkward in a reduced palette. |
| Option D (Photoreal) | **Parked — possible future skin pack** | Would work technically and looks great in isolation, but too "expensive" a register for the suite's existing visual language. Does not set a precedent alongside other games. Good candidate for a post-v1 cartridge skin pack if there's appetite for it. |
| Hoard fan readability | **Composition rule added** (§0) — left 25–30% of each card must carry a strong identifying element | Cards are 60–70% overlapped in the Hoard fan; the only visible portion is a left-edge sliver. Middle-of-card detail is invisible in fan view. NanoBanana prompt updated to enforce this. Single-tap to expand (already spec'd) handles "I want to read this card properly." Pop-on-hover/swipe not pursued — adds gesture complexity against three already-spec'd input methods. |
| Card layout | Top scrim with "Beaten by" icons + track pip top-left + Alpha crown top-right + bottom scrim with name | Full card visible for Marks in play area; Hoard fan relies on left-sliver readability per above. Scrims (gradient, not solid bars) keep the painterly art visible. |
| Default art pipeline | Illustrated art ships as **core precached asset** (not cartridge pack) | Default art is always-on; belongs in PRECACHE_URLS like any other game asset. Cartridge system is for optional/swappable/removable skins — Aussie Fauna and Monsters post-v1. |
| Byte budget | **40 KB/card WebP ceiling, confirmed 31 July 2026** | Owner confirmed the tech spec's recommendation (§16 Q6) when signing off Stage 2. Emoji fallback also confirmed yes, so implementation isn't blocked on this art run. |
