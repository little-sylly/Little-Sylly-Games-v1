# Premium Lounge — the 2D chrome, handed to Claude Design (19 Sep 2026)

**What this is.** Little Sylly Games is a browser suite of 20 party games for people in the same
room. "Premium" is its showpiece home screen: a real-time 3D lounge, rendered live, where the
games and the app's features are physical objects you tap. The room itself is built and is
**not** what this round is about.

**What you are designing: the flat layer that sits over the 3D canvas.** Everything in the
scene — the furniture, the telly, the lamp, the lighting, the framing — is finished and closed.
You are designing the HUD that floats on top of it, currently an unstyled placeholder.

---

## 1. What you own

Six things, all 2D, all over the canvas:

1. **The heading.** Currently "Little Sylly's Lounge", top-left, 28 px Fredoka bold in plum.
   It names the room. It may move, change weight, gain or lose a subtitle — or argue itself out
   of existing, if the room says its own name well enough.
2. **The keycap buttons.** Two today, top-right: *Reset view* and *Portrait preset*. In the real
   product this row is where "leave the lounge" and the layout switcher live. They must read as
   **moulded glossy keycaps** (§ 3), not flat rectangles.
3. **The layout switcher's Premium state.** The app has four home-screen layouts and a four-slot
   switcher for moving between them. Design what that switcher looks like sitting *on* the
   lounge — it has to stay legible over a photographic-looking 3D scene without becoming a
   toolbar that fights it.
4. **The honest card.** Shown instead of the lounge below 900×500. Copy is **fixed, use it
   verbatim**: heading *"The lounge wants a bigger screen."*, body *"Cast it, or open it on a
   laptop — the Shelves are right here."*, one button *"Open the Shelves"*. Full-screen, warm
   off-white, no 3D behind it.
5. **The focus ring.** A rectangle drawn around whichever prop has keyboard focus, tracking its
   projected bounds as the camera moves. Today a plain 3 px plum border, 10 px radius. It has to
   survive being over any part of the scene — a pale wall and a dark screen alike.
6. **The vignette.** A radial darkening at the frame's edge that pulls the eye to the middle of
   the room. Currently a soft plum at 28% in the corners. It is the one piece of chrome that is
   really a grade on the image.

**And one composition, not chrome:** the **attract screen** — the picture playing on the telly
inside the scene. It is drawn as a flat **512 × 384** canvas and mapped onto the curved glass, so
you design it as a flat image and it gets the curvature and the scanlines for free. It currently
holds a title line, a horizontally scrolling row of the 20 games' die-cut stickers, and a rotating
one-line invitation. Its typography and layout are yours; see § 5 for the return format.

## 2. What you must not touch

The 3D scene in any respect: the room, the furniture, the props, the camera framing, the
lighting, the materials, the colours of anything in the room, and the motion of anything in the
room. If a piece of chrome only works by changing the scene behind it, that is a note back to
me, not a change you make.

Also settled and not open: the honest card's copy (above), and the fact that the lounge is
widescreen-only for v1.

## 3. The visual language (fixed — from the product brief § 2)

- **Type is Fredoka.** One family, rounded and friendly. Headings deep plum `#2B1B45`.
- **Ground** is warm off-white `#FAFAF9`. **Accent** is hot bubblegum pink `#E9408E`.
- **Buttons are moulded glossy keycaps** — inflated and candy-like, with a bright specular crown,
  a darker moulded bezel and a 3D drop, like a premium keyboard key or a gel capsule. They press
  by sinking, not by fading. This is the app's signature and the lounge's chrome must share it.
- **Not** flat minimalism, and **not** a dark neon gamer aesthetic. Warm, playful, tactile.
- Each of the 20 games owns one saturated brand colour (hot pink, violet, teal, amber, red, lime,
  cyan, sage, chocolate brown, glacier blue, honey gold, rust orange, …). The room deliberately
  contains none of them — the props carry the *player's own* four chosen colours instead, so any
  chrome colour you introduce is competing with a scene built to stay quiet.

## 4. The canvas you are designing over

Use **`shots/wide-1920.png`** as the artboard and **`shots/wide-1280.png`** to check the small
end. Both are the real renderer, not mock-ups. `shots/reduced-1280.png` is the same scene for a
viewer with reduced motion, and `shots/portrait-preset-1280.png` is a later round's framing —
neither needs chrome from you now.

**Where the scene is busy, and where it is free.** Reading `shots/wide-1920.png` left to right:
the left third is a floor lamp against plain wall and is the emptiest area in frame; the middle
is the TV bench with the telly and the jukebox on it, and below it the coffee table with three
props — this is the busiest band and the part a player is actually looking at; the right third
holds a wall shelf and a bright curtained window, which is the lightest region in the image and
the worst place to put pale text. The bottom-left corner is occupied by a couch arm with the
player's controller resting on it, cropped by the frame.

**Safe areas, accordingly.** The top-left block (roughly the upper-left eighth) is clear wall and
holds the heading and a status line today. The top-right corner is clear enough for the tools
row, but sits directly over the brightest part of the window — anything there needs its own
ground, not raw text. The bottom-centre is open floor and rug, and is the natural home for a
future primary keycap; it is also the calmest large area in the frame. Avoid the middle band
entirely: that is the props, and they are the whole point.

## 5. What to send back

- **The chrome:** a `.dc.html` file, placed beside `TV Mode.dc.html` in `wip/tv-mode-design/`,
  following that file's existing conventions.
- **The attract screen:** a PNG at exactly **512 × 384**. Design it flat; the curved glass, the
  green tube tint and the scanlines are applied by the scene.

## 6. Motion rules (non-negotiable — the app's motion standard)

- Animate **`transform` and `opacity` only**. Anything that triggers layout (width, height, top,
  left, margin, padding) janks on the mid-range phones that are most of this audience.
- **Ceiling 300 ms** for any chrome transition. Button press and tap feedback is 100–160 ms.
- **Never `ease-in`** for UI — it starts slow and reads as a dropped tap. Entering or leaving the
  screen is `ease-out`; moving about on screen is `ease-in-out`.
- Tap feedback is a sink, not a fade: `transform: scale(0.97)` on `:active`, matching the keycap.
- **The fade that covers the camera's push-in is 200 ms** and is already built; if you restyle it,
  keep the duration.
- **Reduced motion is honoured globally** by collapsing durations to near-zero — so anything you
  do in CSS inherits it for free. Do not add a second `prefers-reduced-motion` block. What the
  standard asks is that *nothing travels*, while the information stays: show the end state, skip
  the journey. Never simply hide something because motion is reduced.

## 7. The one thing worth knowing about the room

Every prop in the lounge is a door. The telly opens TV mode; the little dial picks a random game
and hands it to the telly; the flip phone opens the Shelves; the controller opens the Workshop
where players customise it; the jukebox handles sound. Nothing in the room is labelled except the
phone, whose tiny screen reads "Shelves".

That is deliberate, and it is the tension your chrome has to respect: **the room explains itself
by being a room.** Chrome that starts captioning the props would undo the whole idea. Chrome that
tells you where you are, lets you leave, and gets out of the way is the brief.
