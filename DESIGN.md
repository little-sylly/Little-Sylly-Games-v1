---
name: Little Sylly Games
description: Twenty colour-coded party word games on one warm, tactile shelf.
colors:
  page-stone: "#fafaf9"
  card-white: "#ffffff"
  track-stone: "#e7e5e4"
  hush-stone: "#78716c"
  faint-stone: "#a8a29e"
  ink-stone: "#292524"
  howto-stone: "#44403c"
  li5-pink: "#ec4899"
  gm-violet: "#8b5cf6"
  gm-purple: "#a855f7"
  ss-teal: "#14b8a6"
  jec-steel: "#475569"
  ygi-bulb: "#f59e0b"
  lttp-red: "#ef4444"
  nat-lime: "#65a30d"
  dsd-deep-cyan: "#0e7490"
  gth-sage: "#B1BCA0"
  dyb-rock: "#6B5744"
  bld-brick: "#991b1b"
  pass-zinc: "#18181b"
  nt-emerald: "#059669"
  frt-lemon: "#FFE500"
  shp-midnight: "#3A3D52"
  flw-rose: "#E879A8"
  pko-rust: "#9A3412"
  cjar-cocoa: "#5C3A21"
  cld-glacier: "#8ECAE6"
  comb-honey: "#F0A500"
typography:
  display:
    fontFamily: "Fredoka, ui-rounded, Nunito, 'Varela Round', system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1.25
  headline:
    fontFamily: "Fredoka, ui-rounded, Nunito, 'Varela Round', system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "Fredoka, ui-rounded, Nunito, 'Varela Round', system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: "Fredoka, ui-rounded, Nunito, 'Varela Round', system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Fredoka, ui-rounded, Nunito, 'Varela Round', system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.1em"
rounded:
  pill: "9999px"
  card: "24px"
  button: "16px"
  input: "12px"
spacing:
  gap: "16px"
  gutter: "20px"
  modal: "24px"
components:
  button-menu-how-to:
    backgroundColor: "{colors.howto-stone}"
    textColor: "{colors.card-white}"
    rounded: "{rounded.button}"
    height: "56px"
  button-menu-back:
    backgroundColor: "{colors.track-stone}"
    textColor: "{colors.hush-stone}"
    rounded: "{rounded.button}"
    height: "56px"
  button-play-gm:
    backgroundColor: "{colors.gm-violet}"
    textColor: "{colors.card-white}"
    rounded: "{rounded.button}"
    height: "56px"
  pill:
    backgroundColor: "{colors.track-stone}"
    textColor: "{colors.hush-stone}"
    rounded: "{rounded.pill}"
    padding: "8px 0"
  pill-active-purple:
    backgroundColor: "{colors.gm-purple}"
    textColor: "{colors.card-white}"
    rounded: "{rounded.pill}"
  modal-card:
    backgroundColor: "{colors.page-stone}"
    textColor: "{colors.ink-stone}"
    rounded: "{rounded.card}"
    padding: "24px"
  settings-card:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink-stone}"
    rounded: "{rounded.button}"
    padding: "16px"
---

# Design System: Little Sylly Games

## Overview

**Creative North Star: "The Toy Shelf"**

Twenty tactile, brightly coloured toys sitting on one warm shelf. The shelf is the shared neutral: a soft stone page, one rounded typeface, generous corners. Each toy (game) carries exactly one saturated brand colour and its own voice. A player should feel the family resemblance before they read a word, and feel the individual game the moment its colour fills the Play button.

The system is phone-first and Operate-mode: the job is to get a group into a round in seconds and keep every control reachable with one thumb, often under a timer. Personality lives in the details, not in decoration: cheeky labels, chunky rounded shapes, and a moulded gel finish on the menu buttons that makes the shelf feel like something you could pick up. Gameplay surfaces (cards, boards, modals, overlays) stay flat and calm so the play itself is the loud part.

Confirmed visual rejections: not corporate or SaaS-clean (no sterile dashboards, thin grey type, or generic card grids), and not dark-mode neon gaming.

**Key Characteristics:**
- One warm-neutral page (stone), one accent per game, never two brands on a screen.
- Fredoka everywhere: rounded, friendly, bold headings, comfortable body.
- Big rounded shapes: pills, 16 px buttons, 24 px modals.
- Menus tactile (gel keycaps), play flat.
- One centred column (the Stack), `max-w-sm`, scrolling as a unit.

## Colors

A warm stone neutral shelf carrying twenty saturated brand accents, one per game. Brand colour means "yes, proceed" and accent; navigation chrome stays neutral.

### Primary (per-game brand)
Each game owns one brand colour used for its Play CTA, active pills, ON toggles, focus borders and title accent. The set (all in the frontmatter): Pink (Like I'm Five), Violet/Purple (Great Minds, CTAs violet, pills purple), Teal (Secret Signals), Steel (Just Enough Cooks), Bulb Gold (You Get It?), Red (Late to the Party), Lime (Natural Selection), Deep Cyan (Deep-Sea Deploy), Sage (Group Therapy), Rock Brown (The Bluff), Brick (Bailed), Zinc (Pass), Emerald (Net-Trace), Lemon (Fruit Salad), Midnight (Counting Sheep), Rose (Flawless), Rust (Pecking Order), Cocoa (Cookie Jar), Glacier (Cold Shoulder), Honey (Honeycomb Hills).

### Neutral
- **Warm Page Stone** (#fafaf9, stone-50): the page and every modal card.
- **Card White** (#ffffff): settings cards and how-to step cards sitting on the stone.
- **Track Stone** (#e7e5e4, stone-200): inactive pills, OFF toggles, "Back to the Box" fill.
- **Hush Stone** (#78716c, stone-500): secondary text, inactive pill text.
- **Faint Stone** (#a8a29e, stone-400): descriptions, hints, `[?]` icons.
- **Ink Stone** (#292524, stone-800): headings and primary text.
- **How-to Stone** (#44403c, stone-700): the constant How to Play button.

### Named Rules
**The One Brand Rule.** A screen shows one game's brand colour, never a neighbour's. A confirm button in another game's colour is a bug.
**The White Ink Rule.** Brand fill takes white ink for every game, including the four light fills (Lemon, Bulb Gold, Honey, Glacier). The contrast cost is a knowing owner decision; heading and label text on the page uses each brand's darker `-label` rung instead.
**The Neutral Chrome Rule.** Exit, back and How to Play never take a brand colour.

## Typography

**Display / Body Font:** Fredoka (self-hosted variable woff2, weights 300–700), falling back to `ui-rounded`, Nunito, Varela Round, then system-ui.

**Character:** One rounded voice at every size. Weight does the hierarchy: 700 for titles and headings, 600 for buttons and labels, 400 for reading text.

### Hierarchy
- **Display** (700, 3rem / `text-5xl`, leading tight): the menu game title, split into a neutral half and a brand half (`Cold` / `Shoulder`, `Flaw` + `less`).
- **Headline** (700, 1.875rem): screen headings.
- **Title** (700, 1.25rem): overlay titles ("How to Play 🎮").
- **Body** (400, 0.875rem, `text-stone-500`): descriptions, how-to copy; key terms in 600 `text-stone-700`.
- **Label** (600, 0.75rem, 0.1em tracking, uppercase): step labels in the game's darkened brand colour.

### Named Rules
**The Split Title Rule.** A menu title is never one flat colour: neutral half plus brand half.
**The No Emoji On Actions Rule.** Action button labels carry no emoji; personality goes in the words.

## Layout

The Stack: one `max-w-sm` column holding Header, Stage and Controls as siblings, centred on both axes by the section, scrolling as one unit with `gap-4` between zones. Side gutter 20 px (`px-5`). Never split the column, never `my-auto`, never pin to screen edges. A short list of full-window exceptions keep a fixed Stage (drawing canvas, DSD grids, the lobby rooms). Touch targets 44 px minimum (`min-h-11`), primary buttons 56 px (`min-h-14`); settings pills are 39 px by owner decision. Tested at 375×667, 375×548 and 320×452.

## Elevation & Depth

Hybrid, by surface. Menu buttons are moulded gel keycaps: a crown light, a specular cap, a refraction at the base, a dark outer bezel and a 5 px keycap drop; pressing sinks 3 px. Everything else is flat: stone page, white cards with a faint `shadow-sm`, modals separated from the backdrop by a 1 px brand-tinted border rather than a shadow. Overlay backdrops are `bg-black/40` (art viewer `bg-black/80`).

### Named Rules
**The Gel Stays On The Shelf Rule.** `gel-btn` belongs to the four menu buttons and the lobby buttons only. Gameover buttons, modal buttons, in-game submits, pills and toggles stay flat.
**The Compositor Rule.** Animate only `transform` and `opacity`. Motion: press 100–160 ms, small reveals 150–250 ms, overlays 200–500 ms, `ease-out` in, never `ease-in`, and no CSS-only reliance for RAF loops (check reduced motion in JS).

## Shapes

Round and soft: full pills for choices (9999 px), 16 px for buttons and cards (`rounded-2xl`), 24 px for modals (`rounded-3xl`), 12 px for inputs, sheets slide up with `rounded-t-3xl`. No sharp corners, no hairline-only boxes.

## Components

### Buttons
- **Shape:** rounded 16 px, full width in a stack, 56 px tall.
- **Play CTA:** the game's brand fill, white ink, gel finish, game-voiced label ("Let's Cook!").
- **How to Play:** stone-700 with white ink, identical on every game. **Settings:** light brand tint. **Back to the Box:** stone-200 with hush ink.
- **Decision modal:** confirm in brand (or destructive red for quit), cancel neutral stone; same 56 px size, `active:scale-95`.

### Pills and Toggles
- **Pill:** stone-200 fill, hush text, full radius; the active pill takes the game colour with white ink. The `.pill` class is never removed.
- **Toggle:** OFF stone-200 pill, ON the game's brand fill.

### Overlays
- **Data overlay:** bottom sheet, 80vh, `rounded-t-3xl`, stone-50, sticky left-aligned title block, cards of white on scroll.
- **Decision modal:** centred, stone-50, `rounded-3xl`, `border-[brand]-300`, ≤3 interactive elements.

### Cards
White `rounded-2xl`, `p-4`, `shadow-sm`; settings cards have a semibold title, a `text-stone-400` description below it, and no emoji in the title (only the ✨ Sylly Mode card gets one).

### Sylly Mode card
The last settings card, a toggle plus thematic name; the signature "advanced rules" marker.

## Do's and Don'ts

### Do:
- **Do** use the game's single brand colour for Play, active pills, ON toggles and focus.
- **Do** keep Header, Stage and Controls in one `max-w-sm` column.
- **Do** use `.gel-btn` on menu buttons only, with `.gel-btn-light` on pale fills.
- **Do** animate `transform` and `opacity` only, and honour reduced motion in JS loops.
- **Do** write UK/Australian spelling and let personality live in the words.

### Don't:
- **Don't** make it corporate or SaaS-clean: no sterile dashboards, thin grey type or generic card grids.
- **Don't** go dark-mode neon gaming.
- **Don't** put emoji on action button labels or in setting-card titles.
- **Don't** put a brand colour on exit, back or How to Play.
- **Don't** add `transition-all`, `ease-in`, or a third overlay pattern.
