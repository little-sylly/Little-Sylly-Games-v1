# Premium Lounge — Owner Review

**19 Sep 2026. The greybox is built and screenshot-verified; nothing here is shipped.** **ANSWERED same day** — plus layout notes (compress the room, sit on the couch, window as key on the left with a plant on the sill, photo lamp to the shelves, table off-centre right, Saturday-afternoon mood). Outcome: `docs/superpowers/specs/2026-09-19-premium-lounge-reblock-design.md`; production wiring deferred behind it. The
lounge lives entirely in `wip/premium/` — no `index.html`, no `sw.js`, no `js/` file was
touched. Every question below is a judgement I could not make for you. Answer inline under
each; I have put my own leaning in *italics* so a "yes, that" is a complete answer.

**To run it:** serve the repo root and open `http://localhost:8791/wip/premium/index.html`
on a laptop or a landscape tablet (below 900×500 it shows the honest card instead).

```
npx http-server -p 8791 "D:\Coding Projects\Little-Sylly-Games"
```

Play with it before reading the list. Tap the telly, tap the dial, drag the little lamp, press
the three colour swatches. Then come back.

**What works, so you know what to poke at:** the telly pushes the camera in and hands off to
TV mode; the dial spins ~1.8 s and lands on a game; the phone fades out to the Shelves; the
controller opens the Workshop; the jukebox knob opens sound and its record steps the track;
the binder's cover flops open (its real door is dormant). Arrow keys walk the room, Enter
uses a thing, Escape drops focus. Everything obeys reduced motion.

---

## 1. Does it read as a toy diorama?

**Look at:** `shots/wide-1920.png` (and the same thing live, which is better).

This is the whole question the greybox exists to answer. Compare it against the Gemini renders
in this folder. The room is deliberately quieter than they are: fixed warm neutrals everywhere,
so the props in your controller's colours are the only saturated things in frame.

The lighting landed at a warm key from the left (the floor lamp), a cool fill from the right
(the window) and a small green spill off the telly. Contact shadows under the table legs and
the bench are the main thing selling "small objects on a real surface".

*My leaning: yes, but it is one notch brighter and one notch less contrasty than the renders.
That is deliberate — it is a menu you will look at every session, not a hero image.*

**Answer (owner, 19 Sep 2026):** Reads as a diorama but lacks its warmth. Colours not quite right; the Gemini warm-room injection is much closer. Root cause agreed as scale + light (room ~3x too deep, camera ~2.7 m from the table, no dark corner). -> re-block, `docs/superpowers/specs/2026-09-19-premium-lounge-reblock-design.md`.

---

## 2. The four escape-hatch calls — I kept all four procedural

**Look at:** `shots/wide-1920.png`, bottom-left corner, the right-hand window, the wall, the lamp.

The spec allowed any of these to be swapped for a flat plane with a painted PNG if geometry
could not carry them (spec D2). My calls, all "keep procedural":

| Element | Why it stays geometry |
|---|---|
| Couch arm | The bouclé bump reads as upholstery at the size it actually appears |
| Curtain | The sine-wave extrusion catches light as real pleats; a flat PNG would lose that |
| Wallpaper | The arc pattern is legible and charming, and it tiles for free |
| Floor lamp shade | An open cone lit from inside does the whole job |

*My leaning: keep all four. A plate costs an asset, a fetch and a runtime-cache entry, and none
of the four looked like it was fighting the geometry.*

**Answer (owner, 19 Sep 2026):** Keep the four. The problem is not these elements.

---

## 3. The dial's drift speed

**Look at:** the dial live, doing nothing.

It turns very slowly on its own (about one turn every thirty seconds) so the room is never
quite still. It pauses while you hover it, and after a spin it holds still for two seconds so
you can read the game it landed on before it drifts again.

Too slow to notice? Fast enough to be annoying in peripheral vision on a menu you sit on?

*My leaning: it is currently at the "you only notice it if you look" end, which I think is
right for a menu, but this is exactly the kind of thing that is different in a dark room at
night.*

**Answer (owner, 19 Sep 2026):** On point. Keep.

---

## 4. The ear shapes — the telly vs the jukebox

**Look at:** `shots/wide-1280.png`, the two props on the bench.

Both wear the controller's own ear geometry, so the family reads. To keep them from being
twins, the telly's ears are big, upright and round; the jukebox's are smaller, squatter and
angled outward.

Is that enough difference, or do they read as the same object twice on one shelf?

*My leaning: enough. The silhouettes differ more than the ears do — a wide CRT against a
narrow arched cabinet.*

**Answer (owner, 19 Sep 2026):** Not good for either. New shapes: cat-jar jukebox (Gemini "Lavender Cat"), droopy bunny ears on the TV (Gemini "Bunny Beats"). Re-block spec § 5.1 / § 5.2.

---

## 5. Does the phone read as the door to the Shelves?

**Look at:** the coffee table, right-hand side. Its little screen says "Shelves".

Nothing else in the room is labelled. The phone is the only prop whose meaning is not obvious
from its shape — a telly is obviously a telly, a dial is obviously a randomiser, but a flip
phone could be anything.

Does the word on the screen carry it, or does this prop need something else (a different
object entirely, a label on the table, a tooltip on hover)?

*My leaning: the word carries it, and I would not add chrome to the room to explain a prop.
If it does not carry it, the honest fix is a different object, not a caption.*

**Answer (owner, 19 Sep 2026):** Colour matching the controller/TV/jukebox is enough to make it read as a door. Keep the clamshell (Gemini "Legacy Clamshell"); no label chrome.

---

## 6. The rug colour — I changed it

**Look at:** the bottom third of `shots/wide-1280.png`.

The rug started near-white (`#f1ebe1`) on a pale floor, which made the bottom third of every
frame one featureless bright field. I moved it to a soft oat (`#ddd0bb`) so it separates from
the floor and takes the table's shadow visibly.

This is the one place I changed a colour rather than a light, so it is the one most likely to
be my taste rather than yours.

*My leaning: keep the separation, but the exact tone is yours — a dusty sage or a pale terracotta
would both work and would put one more colour in a very beige room.*

**Answer (owner, 19 Sep 2026):** Too light. Darker, round, thick-threaded braided jute like the Gemini render. Re-block spec § 5.3.

---

## What is deliberately NOT here

- **Scene B (portrait).** The `portrait` preset exists so you can judge the framing
  (`shots/portrait-preset-1280.png`), but the portrait HUD and the eligibility switch are their
  own round.
- **Production wiring.** Nothing routes to the real TV mode, Shelves, Workshop or Music — every
  door writes a line to the status bar instead. That is the next round.
- **The stickerbook feature.** The binder is a prop with a dormant door; tapping it flips the
  cover. When `openStickerbook` exists, it takes over with no change to the room.
- **The 2D chrome.** The heading, keycaps and the honest card are placeholders — they go to
  Claude Design with `HANDOFF-claude-design.md`.

## Screenshots in this folder

| File | What it is |
|---|---|
| `shots/wide-1920.png` | The composition, full size — judge question 1 on this one |
| `shots/wide-1280.png` | The same at laptop size |
| `shots/portrait-preset-1280.png` | Scene B's framing, for a later round |
| `shots/reduced-1280.png` | What someone with reduced motion sees (nothing travels) |
