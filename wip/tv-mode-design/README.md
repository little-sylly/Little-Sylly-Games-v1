# Handoff: TV mode — "The Lounge" (`2a`)

**For the engineer implementing this in the Little Sylly Games codebase. 17 Sep 2026.**

The owner has picked **2a "The Lounge"** out of the TV-mode design round. This folder is the
spec for building it for real. Everything else in `TV Mode.dc.html` (`1a`–`1d`) is context only —
**do not build those.**

---

## 1. What this is

TV mode is the **wide layout** of the existing lobby: same 20 games, same data, same visual
language, laid out for a screen wide enough to hold the whole room's decision at once
(≥900×500). It is not a separate app. Eligibility, the Big Screen sub-mode, the game menu behind
Play, and the Workshop all already exist — this screen replaces only the **browse lobby** at wide
widths.

**The design in one line:** your controller sits on the left and asks the two questions; the
middle is a soft white speech-bubble panel holding *how many of you* / *phones* and the six
shelves as tilted sticker pills; the right column is always reserved for one detail pane; and a
full-width rail of game boxes drifts along the bottom edge.

## 2. What's in this folder

| Path | What it is |
|---|---|
| `TV Mode.dc.html` | The design reference. Open in a browser. **`2a`, the top option, is the one to build.** |
| `support.js` | Runtime needed only to open the HTML. Nothing to port. |
| `tv/controller.png` | The stand-in controller render (see § 8 — replace with the live 3D object). |
| `tv/stickers/` | The 19 die-cut game stickers used by the design, as referenced. |
| `screenshots/01-lounge-default.png` | Landing state: nothing selected, boxed-set stack in the pane. |
| `screenshots/02-shelf-open-game-selected.png` | Cards shelf open, Cookie Jar in the pane. |
| `screenshots/03-filtered-5-one-phone.png` | Both filters applied — dim + reason, fitting games first. |

This is a **design reference written in HTML, not production code.** Markup is inline-styled and
driven by a small prototype runtime; read it as a spec and rebuild it in the app's own patterns.
Numbers below are the real values — lift them verbatim rather than measuring the screenshots.

## 3. Frame and grid

- Design size **1280×720**. Must survive **900×500** and look deliberate at **1920×1080**.
- **The page never scrolls.** Interior regions may (the detail-pane body, the rail).
- Root: `#FAFAF9`, `display:flex; flex-direction:column; overflow:hidden`.
- **Header** `height:64px`, `padding:0 28px`, three groups `space-between`:
  - Left: wordmark — "Little Sylly" `700 23px` `#2B1B45`, letter-spacing `-.01em`, then "Games"
    `700 13px` white on `#E9408E`, `padding:6px 10px`, `border-radius:999px`.
    **This wants the horizontal wordmark variant**, not the shipped stacked lockup.
  - Centre: date + time, `600 15px` `#2B1B45`, `letter-spacing:.02em`, `white-space:nowrap`
    (format `Thu, Sep 17 · 10:09 AM`; re-render every 30s).
  - Right: one white pill — `border 1px #E7E5E4`, `radius 28px`, `padding 6px`, `gap 8px`,
    `shadow 0 1px 2px rgba(0,0,0,.04)`. Inside: Achievements 🏆 and Sound 🔊 as 44×44 circles
    (`#F5F5F4`; Sound `#FDE7F1`), then the mode switcher — a `#F5F5F4` track, `radius 22px`,
    `padding 4px`, holding four 36px-high pills in this order: **✨ Premium · 🗂️ Shelf · 🖥️ TV ·
    📋 Original**. Selected (TV) is white with ink `#2B1B45` and `0 1px 3px rgba(0,0,0,.14)`;
    unselected are transparent, icon-only, `padding 0 9px`. **Premium and Original are display
    only in the mock** — wire them to whatever those modes actually are, or drop them.
- **Body** `flex:1`, `grid-template-columns: 300px minmax(0,1fr) 300px`, `gap 20px`,
  `padding 0 28px`, `min-height:0`. The column template is animated
  (`transition .25s cubic-bezier(.23,1,.32,1)`) so future width changes don't jump.
- **Rail** is the last flex child, full bleed, `position:relative; z-index:50; isolation:isolate`.
  It deliberately **overlaps the bottom of the middle and right columns** — the selected box's
  jump animation renders in front of them. Keep the isolation/z-index or the jump clips.

### At other sizes
- **900×500:** the three columns are the load-bearing thing; shrink the controller column first
  (it may drop to ~200px), then the rail's box height. The sticker-pill field already wraps.
- **1920:** do **not** scale up uniformly. Widen the middle column and let the rail show more
  boxes; the controller and pane grow only modestly. The pill field gets a third column naturally.

## 4. Left column — the controller

Centred vertically, `gap 6px`. `controller.png` at `width:250px`, drop shadow
`0 20px 18px rgba(43,27,69,.22)`, and the **`nudge`** animation: `7s ease-in-out infinite`,
keyframes `0/100% rotate(-3deg) translateY(0)` · `18% rotate(-1deg) translateY(-6px)` ·
`36% rotate(-4deg) translateY(0)`. Under it, a **"YOU ▾"** button — `600 12px`, uppercase,
`letter-spacing .14em`, `#A39DB0` — which should open the existing profile popover.

## 5. Middle column — the speech-bubble panel

One white card: `border 1px #E7E5E4`, `radius 28px`, `padding 14px 16px`,
`shadow 0 1px 3px rgba(0,0,0,.05), 0 14px 30px -18px rgba(43,27,69,.25)`, and a **tail** — a
24×24 white square rotated 45°, `left:-13px`, vertically centred, with only its left and bottom
borders, so it reads as the controller speaking. The panel has **two states**:

### 5a. Shelf picker (default)
1. Heading **"What are we playing today?"** `700 26px` `#2B1B45`, centred.
2. **Filters** in one row, `gap 14px`:
   - *How many of you* — label `600 10.5px` uppercase `letter-spacing .14em` `#A39DB0`; below it a
     `repeat(4,1fr)` grid, `gap 6px`, of eight keycaps: **Any · 2 · 3 · 4 · 5 · 6 · 7 · 8+**.
   - *Phones* — fixed `156px` column; two stacked keycaps: **One phone** / **A phone each**.
   - Keycaps are the existing `.gel-btn` treatment: `height 42px`, `radius 13px`, `700 16px`
     (phones `600 14px`), selected = plum `#2B1B45` fill with white ink, unselected = white with
     `#2B1B45` ink, `:active { transform: translateY(3px) }` over the standard inset/4px-drop
     shadow stack. **Use the real keycap component; don't re-derive it.**
3. A live count line, `400 13.5px` `#6B6480`, centred — "All 20 games in the box." / "12 games fit
   5 players on one phone." Wording follows the current filter copy.
4. **Six sticker pills**, `flex-wrap`, `gap 8px 12px`, centred: each `172×70`, `radius 22px`,
   `background #F3F0F7`, `shadow 0 3px 0 rgba(43,27,69,.07)`, a 48px white disc holding the shelf
   emoji, then name `700 17px` `#2B1B45` over "N games" `400 12px` `#6B6480`.
   Each pill is **pre-tilted and offset** so the field reads as slapped-on stickers —
   rotations `[-3, 2.5, -2, 3, -2.5, 2]deg`, vertical offsets `[0, 7, -5, 5, -3, 6]px`, by index.
   Emoji has a slow `floaty` animation. Hover/focus straightens and lifts:
   `rotate(0) translateY(-5px) scale(1.05)`, `.2s cubic-bezier(.23,1,.32,1)`.
   **The field wraps, so a seventh shelf costs nothing** — do not hand-place these.

### 5b. Shelf open
Replaces the picker in the same card (no new surface):
- Row: **"← Shelves"** button (`36px`, `radius 18px`, `#F3F0F7`, `600 13px` `#6B6480`), then
  centred `emoji + name 700 26px` + "N games" `400 14px` `#A39DB0`.
- Below: a `#F3F0F7` well, `radius 20px`, `padding 14px`, wrapping centred grid of the shelf's
  games. Each game is a **126px free-standing sticker** — no tile, no frame — over a soft
  brand-colour blob (112px circle at the game's `brandHex`, low opacity, brighter on
  hover/selected), with the game's name as a **pill tag** pinned at the bottom in the game's
  brand colour. Stickers are per-game tilted (deterministic hash of the id, ±7deg) and carry a
  slow `sway`.
- The **2-shelf games appear on both shelves**, as on the phone. Counts total >20 on purpose.

## 6. Right column — the detail pane

Always reserved (300px), never appears/disappears — only its contents swap.

**Empty:** `#F3F0F7` card, `radius 28px`, `1px #E7E5E4`, holding a stack of three tilted boxed-set
lids (purple/pink/amber, `radius 12px 12px 8px 8px`, glossy gradient + `0 4px 0` drop), then
"20 games in the box" `700 20px` and "Pick a shelf, or take one off the rail below — it lands
here." `400 13.5px` `#6B6480`.

**Selected:** white card, same radius/shadow as the middle panel.
- A 60px band in the game's `brandHex` with the glossy overlay, a 36px ✕ close at top-right, and
  the game's **sticker hanging 26px below the band's edge** (76px, tilted, own drop shadow).
- Scrolling body (`padding 34px 20px 6px`, scrollbar hidden): title `700 25px` centred — second
  word in the game's label colour; pitch `400 14.5px` `#6B6480`; player/mode chips; **"HOW IT
  GOES"** label in the game's label colour with three numbered steps (20px brand-colour discs,
  step text `400 13px` `#2B1B45`); then the Sylly Mode line.
- Pinned footer: full-width keycap, `height 54px`, `radius 16px`, brand fill, `600 19px` — and it
  uses **the game's own menu words** ("Raid the Jar!", "Play Time!"), matching the existing game
  menus. A `playCta` switch flips all 20 to a plain "Play" if you'd rather not carry the table.
- Ink on brand fills is chosen by luminance (`>0.3` → `#2B1B45`, else white); label colours are
  the brand hex darkened toward plum when too pale for white ground. Both helpers are in the
  reference file — port them, don't eyeball per game.

**Dim/reason state:** when a game doesn't fit the current filters it dims and states *why*
("needs 3+", "needs a phone each") rather than vanishing — same behaviour as today, both in the
shelf well and under the rail boxes. Fitting games sort to the front.

## 7. The rail — the part with the most behaviour

Full-width, bottom-aligned, horizontally scrolling strip of **game boxes**: `150×112`,
`radius 14px 14px 10px 10px`, brand fill with the glossy gradient + `0 4px 0` drop, name
`600 14px` at the bottom in contrast ink, and the game's **sticker breaking out of the lid**
(100px, tilted, sitting 34px above the box top). `gap 16px`, so the item pitch is **166px**.
Edges are masked (`linear-gradient(90deg, transparent, #000 22%, #000 78%, transparent)`).
Padding is `calc(50% - 75px)` left and right so **item centres line up with the frame centre**.

Behaviour, in order of importance:

1. **Continuous drift.** ~`0.38px` per frame to the right, via rAF on `scrollLeft`.
2. **Infinite loop.** The list is rendered **5× concatenated** (`ORDER` × 5, 20 games each) and
   `scrollLeft` is wrapped into the middle copies (`+W` below 1.5W, `−W` above 3.5W, where
   `W = 20 × 166`). Five copies rather than three so a 1920-wide viewport never shows the seam.
3. **Drift pauses** on hover, on pointer-down, while dragging, while the Random spin runs, and
   **whenever a game is selected**; it resumes ~1.4–2.6s after the interaction, and on pane close.
4. **Snap to centre.** Wheel (vertical wheel maps to horizontal, ×1.4), drag (pointer, with a
   4px move threshold that suppresses the click), and arrow keys all end in a snap:
   `scrollTo({ left: round(scrollLeft / 166) * 166, behavior: 'smooth' })`, debounced 140ms.
5. **Click any box, or any sticker in an open shelf → that game snaps to the rail's centre** and
   lands in the pane. Picking the target copy matters: choose the copy (of 5) whose position is
   **nearest the current scroll offset**, otherwise wrap-edge games visibly yank the rail.
6. **The selected box jumps:** `jumpIn .5s cubic-bezier(.2,1.5,.4,1)` once, then
   `reBounce 2.8s ease-in-out .6s infinite` — a small re-bounce every ~2.8s so the pick stays
   findable. This is what needs the rail's `z-index:50`.
7. **Random Game** — a small white keycap pinned above the rail's left edge (`left 28px`,
   `height 38px`, 🎲 + label). It spins the rail 1800ms on an ease-out cubic to a game drawn from
   **the games that fit the current filters** (falls back to all 20 if none fit), then selects it.
   Guard the spin flag so a mid-animation reload can't leave the rail frozen.
8. **Keyboard:** the rail is one tab stop (`tabindex=0`); ←/→ move the focused item, Enter/Space
   selects. Focus ring `3px #2B1B45`, offset 3px. This is also how a TV remote drives it.

## 8. Motion, and the reduced-motion contract

All motion is transform/opacity, ≤300ms for state changes; the ambient loops (`nudge`, `floaty`,
`sway`, `reBounce`, rail drift) are long and slow. Every one of them must be **killable by the
global reduced-motion rule**, including the rail's rAF drift and the auto-snap — the design is
built to read as finished when frozen: the pills are pre-tilted in CSS, the stickers are
pre-rotated, the controller's resting pose is `rotate(-3deg)`.

## 9. Known substitutions and open items

- **The controller is a flat cut-out of the Workshop render.** Replace it with the live 3D object
  at ~250px; it already nudges itself, so drop the `nudge` keyframes when you do.
- **The wordmark needs a horizontal/compact variant** for the 64px bar. Flagged in the round.
- **Bailed has no sticker.** It falls back to a domed white disc + emoji, which is the shipped
  phone treatment — that path is in the reference and must stay until art exists.
- **Premium and Original modes** in the switcher are display-only here.
- **No durations are shown anywhere**, deliberately — 14 of 20 have none, and nothing was invented.
- Open questions the owner may still want to move on: whether opening a shelf should land on its
  *first* game rather than a random one; whether the centre box should show players · phones under
  the game name; and whether the rail should hold all 20 or only the fitting games.
