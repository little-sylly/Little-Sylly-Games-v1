# Premium Lounge — Owner Review, round 2 (the re-block)

**19 Sep 2026. The re-block is built and screenshot-verified; nothing here is shipped.** Still
sandbox-only: everything lives in `wip/premium/`, and no `index.html`, `sw.js`, `src/screens/`
or `js/` file was touched. No SW bump. Your round-1 answers are recorded inline in
`OWNER-REVIEW.md`; this round asks one question.

**To run it:**

```
npx http-server -p 8791 "D:\Coding Projects\Little-Sylly-Games"
```

then open `http://localhost:8791/wip/premium/index.html` on a laptop or landscape tablet.

---

## The one question — does it pass the ninety-second test now?

**Look at:** `shots/wide-1920.png`, next to `Gemini_Generated_Image_9nolcp9nolcp9nol.jpg` for
*scale* and the warm-room injection render for *mood*.

**What changed since round 1:**

- The room is a corner, not a hall. We are sitting on the couch with the table against our knees.
- The window is the light, on the left, curtains drawn with a slit, cattails on the sill. The floor
  lamp is gone.
- Saturday afternoon: darker, not dark, with the couch dark in the foreground framing the shot.
- The telly is centred and the jukebox moved left, per your note.
- The couch is a U wrapping the table left, front and right; the controller sits on the left run.
- The bookshelf is a low floor-standing unit with the photo lamp on its lowest board, books above,
  trinket easter eggs on top.
- The phone sits in the middle of the table.
- Droopy-ear telly, cat-jar jukebox, round braided-jute rug.
- Unchanged from round 1: the clamshell phone, the dial's drift speed, and the four procedural
  elements you said to keep.

**Answer:** _(yes → production wiring starts; no → name which of scale / mood / a specific prop,
and I re-tune that alone rather than everything)_

> **ANSWERED 25 Sep 2026 — YES**, after room-pass items 1–15 (`docs/superpowers/plans/2026-09-22-premium-prop-quality.md`).
> Production wiring starts. The owner has a few smaller touches still unsettled; they are
> post-production polish and do not gate the ship. `docs/decision-log.md` 2026-09-25.

**Round 3 nudges, all in:** the couch is now a **U** wrapping the table left, front and right, so
the wall-less right side is closed by the furniture itself; every back panel shares a face with its
seat and drops below its top (they were detached slabs before); the sill is narrower with the curtains drawn further back
and the cattails standing in the gap where the sun reaches them; the two prints moved above the
jukebox; and the bookshelf has a visible gap from the TV bench.

---

## Measured, so you do not have to take my word for it

| Check | Result |
|---|---|
| `node wip/premium/verify-prm-props.js` | **389 passed, 0 failed** |
| `NODE_PATH="$HOME/.claude-tooling/playwright/node_modules" node wip/premium/visual-prm.js` | **18 passed, 0 failed** |
| Mean frame brightness | 126 (the "darker, not dark" band is 60–150; round 1 was 178) |
| Brightest patch ÷ darkest | 2.3× (round 1 was 1.66; the floor is 2.2×) |
| Photo lamp on screen | 71 px tall at 1280×720 (a tap target needs ≥ 48) |
| Shadow-casting lights | exactly 1, positioned outside the left wall |

Two of those checks are new and worth knowing about. "Warmer" and "darker" are exactly the claims a
screenshot lets you fool yourself about, so the driver now reads the real render buffer and measures
the frame's mean brightness and its brightest-to-darkest ratio. They caught three separate attempts
at "darker" that had barely moved the contrast at all.

---

## Three calls I made that you may want to overrule

1. **Cattails, not the fly-trap.** The left side is read as a *silhouette* against a backlit
   curtain. Three tall spikes survive that; a fly-trap's blobby mass becomes a smudge at this size.
   Swapping is one small edit if you disagree.
2. **The couch fabric went darker than planned.** It was reading as a cream slab across the bottom
   of frame. Darkening it is what gives the shot its foreground frame, and it is where most of the
   new contrast comes from.
3. **The plant's colours are warm and sage, not the mock-up's lavender.** The room is deliberately
   neutral so that the only saturated things in frame are the props in *your* controller's colours.
   A lavender plant competes with them.

## One thing I could not resolve, and did not want to hide

**Scene B's framing no longer matches its spec.** The original spec says the controller is the hero
of the portrait view. At 9:16 the frame spans only about 0.7 m across at that distance, and the
controller now lives on the couch a metre to the left of the table, so the portrait view cannot hold
both it and the game props. The preset currently centres on the table. That is a real Scene B design
question and Scene B's HUD is its own later round, so I have flagged it rather than quietly picking
an answer.

---

## Still deliberately not here

Production wiring · Scene B's HUD and eligibility switch · the stickerbook feature · the 2D chrome ·
surface polish (bouclé weave detail, keypad keys, individual rope fibres, a clear-coat on the jar).
