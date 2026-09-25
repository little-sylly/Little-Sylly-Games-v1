# TV Mode — Design Brief

**For: Claude Design. Little Sylly Games, 16 Sep 2026.**
**This bundle is everything you need. You should not need to open the app's source.**

---

## 1. The ask, in one paragraph

Little Sylly Games is a suite of 20 party games that runs in a browser. It is phone-first and
finished. **TV mode is the layout it wears on any screen wide enough to hold the whole lobby at
once** — a laptop browser, a tablet, a browser cast to a television. It is not a separate
product and not a separate app: same 20 games, same data, same visual language, laid out wide.
Three attempts at it exist (§ 5) and none has landed. **Give us three or four genuinely
different directions for it.** Treat this as a blank canvas that happens to come with a finished
vocabulary — not as a revision of what's already there.

**Deliverable:** 3–4 artboards, each a real layout at **1280×720**, each with one short note on
what it is betting on and what it costs. Breadth first. The owner picks one, and it gets built
for real in the code sandbox afterwards — so these need to be honest layouts, not mood boards.

---

## 2. What the product actually is

Twenty games for people in the same room. Some are played by **passing one phone around**; most
need **a phone each** (the phones are the controllers, the shared screen is the table). It is an
offline-capable web app with no backend, no build step, and no paid services. The tone is warm,
playful, tactile — moulded plastic toys, not flat minimalism. Australian English.

Nine games can be played on a single passed phone; eleven require a phone each. That split is
why the lobby asks two questions before anything else: **how many of you, and how many phones.**

## 3. What TV mode is, and the one sub-mode inside it

**TV mode = the wide layout.** A device showing it is an ordinary device: it can host, join and
play exactly like a phone, just with the room to show everything at once.

**Inside it sits one extra option, "Big Screen".** The device runs the room but **takes no
seat** — everyone else joins on their phones, the big screen shows the room code, who's joined,
whose turn it is. (Technically a *seatless host*; "Big Screen" is what a player sees.) This is
the Jackbox shape. The choice is made once, at lobby creation, as a pill: *"I'll play too"* vs
*"Big Screen only"*. **It is already designed** — see `screenshots/tv-bigscreen-1280.png` — and
is **not** part of this round. Design the browse lobby; the Big Screen display already works.

**Eligibility:** width ≥ 900px **and** height ≥ 500px, no device sniffing. Below that the phone
layout stays and a card explains why (`screenshots/tv-below-floor-800.png`).

## 4. The space, and the rules of that space

| | |
|---|---|
| **Floor** | 900×500 — the layout must survive here |
| **Typical** | 1280×720 — design at this size |
| **Target** | 1920×1080 — must look deliberate, not stretched |
| **The page never scrolls** | A cast screen can't be scrolled. Interior regions may scroll; the page may not. |
| **Reduced motion** | A global rule kills every animation. **Every design must read as finished with all motion removed.** |
| **Keyboard-reachable** | Everything interactive should be Tab-reachable in a sensible order — that is also how a TV remote drives a browser page. Don't rely on hover to reveal anything. |

---

## 5. What has already been tried — and why we're still looking

Read this section before designing. Three attempts, all reasonable, none landed.

**A. The original mockup** — `screenshots/mockup-2b-tv-widescreen.png`
Shelf rail on the left, tile field in the middle, detail pane on the right. Handsome, and it is
where the pattern came from. **Important context:** that round was run with almost none of what
you now have — no code, no data table, little more than the games' names and colours — so a great
deal of it had to be invented, and some of what it invented is wrong (§ `ADJOINING.md`). Judge
the layout, ignore the content, and note that this bundle exists precisely so this round does not
start from the same place.

**B. The same thing, built for real** — `screenshots/tv-current-1024.png`, `tv-current-1920.png`
Fully working, verified at every width. The owner's verdict: *"correct but it doesn't feel
alive."* Specifically: the header wastes its space; the two filters stack into two awkward rows
and shove the shelves down; the tiles are large squares with small art floating in them, so the
middle column is the emptiest part of the screen; and the player's controller — the app's most
distinctive object — has nowhere to stand.

**C. "Spotlight" — a console/streaming pattern** (proposed, not built)
One big hero for the selected game with a brand-colour wash, and horizontal rows of games
underneath. Owner's verdict: *"some good elements but still doesn't come as an easy pick,
which means there are potentially even better layouts out there."*

**The diagnosis worth carrying forward:** A, B and C are all **desktop-tool or
streaming-catalogue patterns**. Twenty games is not a catalogue — it's a shelf of boxes in
someone's lounge room. Nobody is browsing this for forty minutes; they are picking something in
ninety seconds with four mates talking over them. **The layout that wins is probably the one
that best fits that ninety seconds**, and it may not look like any media app.

**What "alive" means here** (the owner's word, and the thing all three attempts missed): not
necessarily animation. It means the screen looks like a *place* rather than a form — it has
depth, objects, a sense that something is happening even when nothing is. Motion helps but is
not the requirement; a static screenshot of the right design should already feel alive.

---

## 6. What is settled — please do not re-open

These are decided, verified against the real app, and re-litigating them costs the round.

- **The six shelves and their names.** Talk (5) · Bluff (6) · Guess (3) · Cards (6) · Luck (3) ·
  Strategy (2). Five games sit on two shelves, so the numbers total more than 20. Counts are
  small and uneven **on purpose** — do not design a grid that assumes an even spread.
- **The two filters: headcount and "one phone only."** Games that don't fit dim and state
  *why* ("needs 3+", "needs a phone each") rather than vanishing, and fitting games float to the
  front. See `screenshots/tv-current-filtered-1280.png`. Keep the behaviour; re-place it freely.
- **Length is unknown for 14 of 20 games.** Only 6 state a duration. Nothing was invented and
  nothing may be. **Do not design a layout that structurally needs a duration on every tile.**
- **Copy is final and verified.** Game names, pitches, the three "how it goes" steps, Sylly Mode
  names — all in `reference/games.js`, all quoted from the live app. Use them verbatim. Engine
  jargon never reaches a player: say "one phone" / "phone each", never "PTP" / "MDLM".
- **The visual vocabulary** (§ 8). The keycap, the disc, the plum ink, Fredoka.
- **Australian English**, metric, and no emoji on action-button labels.

## 7. What is open — this is the whole job

Everything else. The arrangement, the hierarchy, what's big, what's a list versus a grid versus
something else, where the player's controller lives, whether there's a hero, whether shelves are
a rail or rows or tabs or something none of us has thought of, what the header is for, and what
the screen looks like **before** anything is selected. That last one matters: the first frame a
room full of people sees is the one that has to work.

---

## 8. The visual language (real values in `reference/tokens.css`)

Paste `tokens.css` into an artboard and these are exact, not approximations.

**The keycap (`.gel-btn`).** The suite's strongest signature — a moulded, glossy, slightly
inflated key. Every lobby button and all four buttons on all 20 game menus wear it. It is
**colour-agnostic** (translucent white/black layers over any fill), so it works on any of the 20
brand colours. See it real in `screenshots/real-01-lobby-controller.png` and
`real-02-game-menu-pko.png`. Use it for anything that should feel pressable.

**The badge disc.** A white domed pin that every game's icon sits on. It gives all 20 games the
same footprint and the same ground.

**Ink.** Lobby-only plum `#2B1B45` for headings (pulled from the wordmark's outline — warm stone
beside the real logo read as two systems), `#6B6480` secondary, `#A39DB0` meta. Ground `#FAFAF9`,
surfaces white, accent the wordmark's pink `#E9408E`. Each game additionally owns one brand hex
(`brandHex` in `games.js`) used for its fills and accents.

**Type.** Fredoka throughout — rounded, friendly, one family, no second face.

**The wordmark.** The logo followed the same path as the game art — sticker illustration first,
then the game's own lockup — and it is **not fixed at one shape**. What ships today is the tall
stacked version you can see in `screenshots/real-01-lobby-controller.png` and
`phone-shelves-390.png`. **Horizontal, compact or simplified variants can be made on request**
if a layout needs different proportions, so do not contort a header around the stacked lockup's
aspect ratio. If your direction wants a wide wordmark in a thin top bar, design it that way and
note what you need.

**Motion.** Transform and opacity only, ≤300ms, never `ease-in`. Full table in `tokens.css`.

### The art — you have more to work with than you might assume

**Look at `screenshots/art-sticker-contact-sheet.png` before designing anything.** That is the
real art layer, all 20 games, at size.

Each game has a **die-cut sticker**: a watercolour illustration with a white cut border, on a
**transparent background**, irregular, none of them square. They began as decals for the
controller and now double as the games' artwork — a real step up from the emoji they replaced,
and a decent middle ground rather than a placeholder. Files are in `reference/sticker-art/`
if you want to place the actual images.

**The affordance worth noticing:** because they are transparent die-cuts rather than rectangular
images, a sticker can sit on any fill, **overlap or break out of its container, tilt, overlap a
neighbour, or cast its own drop shadow**. A rectangular hero image can only ever sit in a box.
Three previous attempts all put these inside a small white disc inside a square — which is the
shipped phone treatment and perfectly fine there, but on a wide screen it is the least
interesting thing you could do with them. This may be the cheapest route to "alive" in the whole
brief.

**The state of it, honestly:** 19 of 20 exist — **Bailed has none yet** and some of the others
are due a rework, so treat the set as live and improving rather than frozen. Whether these are
ever replaced by full-bleed key art is **genuinely undecided**; a reserved full-face slot exists
in the code, but nothing is commissioned and it may never be needed. So: **design with the
stickers as the art**, not around a gap, and not in anticipation of hero images that may not
arrive. If a direction would be transformed by full-bleed art, say so as a note — that is useful
input to a decision that hasn't been made.

### The controller — the strongest object we own, currently homeless

Look at `screenshots/real-01-lobby-controller.png` and `real-04-workshop.png`. That is a **live
3D object**, not an illustration: a soft, inflated, pastel game controller with bear ears,
rendered in the page.

- Every player **customises their own** — shell, face plate, ears and buttons each take any
  colour, and unlocked stickers can be placed anywhere on the shell and ears in a free-rotating
  workshop. Factory default is purple; the one in the screenshot was recoloured to show the range.
- In the lobby it renders small **and nudges itself every few seconds**, so it is already the one
  thing on screen that moves on its own.
- It is the player's avatar, their identity, and the door to the Workshop.
- **In the lobby sandbox it is drawn as a flat SVG stand-in** — ignore that; the real thing is
  the screenshot.

Three layouts have now failed to find it a home. **Giving this object a proper stage may be the
single biggest lever on making TV mode feel alive** — a wide screen finally has room for it. But
it is a *lever*, not a requirement: if your direction is better without it prominent, say so.

---

## 9. What's behind every click

See **`ADJOINING.md`** — the game menu that opens after Play, the Workshop, the Big Screen
display, the profile popover, the secret Terminal. Read it before deciding how much a TV-mode
screen should carry: several things a wide layout might be tempted to absorb already have a
home, and some of them are load-bearing.

## 10. What's in this bundle

| Path | What it is |
|---|---|
| `README.md` | This brief |
| `ADJOINING.md` | What every click leads to, and what already exists |
| `reference/games.js` | **The verified 20-game data table.** Machine-extracted from the live app; the header says exactly which fields are verified and which are editorial. Drop it straight into an artboard |
| `reference/tokens.css` | The real keycap, disc, palette and motion rules, extracted verbatim |
| `reference/sticker-art/` | **The actual game art** — 19 die-cut PNGs + the manifest. Place them directly |
| `screenshots/art-sticker-contact-sheet.png` | All 20 games' art at size, on their brand colours. **Look at this early** |
| `screenshots/real-01-lobby-controller.png` | The **live** lobby: real controller, real keycap buttons, real discs |
| `screenshots/real-02-game-menu-pko.png`, `real-03-game-menu-cld.png` | What Play opens — two games, two brand colours |
| `screenshots/real-04-workshop.png` | The controller's own screen |
| `screenshots/tv-current-1024.png`, `-1920.png` | Attempt B, built and working |
| `screenshots/tv-current-filtered-1280.png` | The filter behaviour, live |
| `screenshots/tv-bigscreen-1280.png` | The Big Screen display — **done, not this round** |
| `screenshots/tv-below-floor-800.png` | Below the eligibility floor |
| `screenshots/phone-shelves-390.png`, `phone-folder-390.png`, `phone-sheet-390.png` | The finished **phone** layout: shelf list, opened shelf, info sheet |
| `screenshots/mockup-2b-tv-widescreen.png`, `mockup-2a-shelves-phone.png` | The original mockups this all started from |

## 11. How this will be judged

1. **The ninety seconds.** Five people, one deciding, four talking. Does this get them into a
   game faster and more happily than a list would?
2. **Alive when frozen.** Screenshot it, remove every animation. Does it still feel like a place?
3. **Honest about art.** Does it work with discs today?
4. **Same family.** Could this sit beside `real-02-game-menu-pko.png` without looking like a
   different app?
5. **Real at 1280, deliberate at 1920, survives 900×500.**
6. **Different from each other.** Four variations on a sidebar is one direction, not four.

One more thing worth knowing: the phone layout (`phone-*.png`) is **finished and liked**. TV mode
should feel like the same product with room to breathe — not like a second design language that
happens to share a logo. But "the phone layout, wider" has now been tried three times. The room
to breathe is the point.
