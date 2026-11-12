# Hide and Shogun — lobby sticker + music prompts

Written 12 Nov 2026. Sources: `docs/game-identities/hsg.md` (the look, palette, mood words) and the
existing stickers (`data/stickers/eta.png` is the style reference — attach it, or any two of
`comb.png` / `cld.png` / `cjar.png`, when you generate).

**Delivery.** Drop `hsg.png` into `data/stickers/` and the track (mp3) into `data/music/jukebox/`.
Tell Claude Code "sticker and/or music for hsg are in" — it removes `hsg` from `LB_NO_STICKER`, adds the
`stickers/manifest.json` and `music/manifest.json` entries, runs `node tools/build-games.js`, bumps the SW.

---

## 1. The lobby sticker (Gemini / Nano Banana — image)

**Spec.** One transparent-background PNG, **about 512 px on the long edge** (existing ones are 445–512),
**under ~100 KB** (existing are 55–80 KB; run it through a PNG squeezer such as squoosh/TinyPNG if bigger).
A **die-cut sticker**: the subject has a thick, even, off-white border (about 5% of the width) and a faint
soft shadow, sitting on transparency. No text except what is on the object. No background.

**Attach** `eta.png` (and one more existing sticker) and say: *"Match the style of these stickers exactly —
hand-painted watercolour and ink, visible paper grain, slightly wobbly outline, the same white die-cut
border, same size of subject in the frame."*

**Prompt.**

> A die-cut sticker of a Japanese paper-screen castle door (a shoji door) pulled halfway open on a warm
> lamplit room. Behind the gap, a small sumi-ink shadow-puppet silhouette of a samurai in a tall helmet is
> caught mid-peek, with a little fox's pointed ears just behind it. The door frame is dark lacquer red-brown
> with gold-leaf corners; the paper glows lamp amber. A single round paper lantern hangs at the top. In one
> corner, a small round red sun crest; in the other, a small indigo crescent-moon crest. Cheeky and sneaky,
> not solemn. Hand-painted watercolour and ink, visible paper texture, slightly wobbly outlines, a thick
> even off-white die-cut border, soft drop shadow, transparent background. Palette: paper cream #F3EAD7,
> sumi ink #2B2620, lamp amber #F2B45A, dark lacquer #3A1F1A, gold leaf #C9A14A, crimson #B3261E, indigo
> #2B3A67. Square-ish composition, subject fills the frame. No text, no kanji, no cherry blossom, no
> katana, no blood, no masks.

**Do not** put "Hide and Shogun" on it (the Board prints the name). Foxes have ears and a tail, never masks
(that is The Masked Court's look). If the first result is too grim or too "Japan pastiche", re-prompt:
*"funnier, more storybook, like a children's picture book about a castle game of hide and seek."*

---

## 2. The music track (Suno / Udio — audio)

**Spec.** One looping background track, **60–120 s, 128 kbps mp3, under ~1.5 MB**, no fade-in/out that
breaks the loop (it is decoded and looped sample-accurately; a clean tail that returns to the opening
works best). Title and artist for the jukebox: *artist* **Sylly House Band**, *title* your pick.

**Style prompt (paste into the style/genre box).**

> playful Japanese folk-inspired instrumental, plucked koto and shamisen, light woodblock taps, soft
> bamboo flute counter-melody, sparse and bouncy, major-pentatonic, mid-tempo about 96 BPM, cheeky and
> sneaky like tiptoeing past paper doors, children's-storybook feel, warm and lamplit, gentle, no drums
> kit, no taiko, no war drums, no ticking or clock-like pulse, no vocals, no cinematic or epic build,
> loops cleanly, instrumental only

**Lyrics / structure box (instrumental).**

> [Instrumental]
> [Intro: solo koto, two bars]
> [Theme: shamisen and koto trade a hopping four-bar tune, woodblock on the off-beats]
> [Variation: flute takes the tune, koto plucks underneath]
> [Theme returns, ends on the same open chord it began on]

**Must not.** A war film (no taiko thunder, no solemn strings), a ticking clock (the clock is the Last
Lantern — no countdown feel), a samurai-movie trailer. The mood words are **sneaky, lamplit, cheeky**.

**Check before sending it back.** Listen for the seam: play the end into the start. If the join clicks or
the energy jumps, ask the tool for "same track, ending resolves to the opening chord", or trim in
Audacity to a bar line.

---

## 3. Optional

A 400×400 JPG jukebox cover (`data/music/jukebox/covers/<track-slug>.jpg`) — reuse the sticker artwork
cropped square. Skippable; the jukebox copes without one.
