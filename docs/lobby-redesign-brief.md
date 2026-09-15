# Lobby Redesign — Design Brief

**For: Claude Fable 5.1, working in Claude Code. 15 Sep 2026.**
**This document plus `wip/lobby-lab/` is everything you need. You should not need to read
anything else, and several things you must not read — see § 1.**

---

## 1. Read this, and almost nothing else

Your work happens in **one file**: `wip/lobby-lab/index.html`. Everything factual you need has
already been extracted, verified and put in front of you.

**Do not read these — they will cost a lot and tell you nothing you need:**

| File | Why not |
|---|---|
| `index.html` (repo root) | **763 KB / ~190k tokens.** Several dollars and most of your context in one call. The only part that matters (the lobby) is reproduced for you in the sandbox |
| `docs/code-map.md` | ~132 KB. Screen/overlay plumbing — irrelevant to this round |
| `docs/game-identities/*.md` | 20 docs, ~500 KB total. **Everything you'd want from them is already in `games.js`**, verified |
| Any `js/games/*.js` | Game logic. Not this round |

**Do read:** this brief, `wip/lobby-lab/games.js` (the data, with its header comments), and
`docs/cost-envelope.md` §§ 2a, 4, 5 (what things cost). That's it.

**One skill worth invoking:** `emil-design-eng` — Emil Kowalski's philosophy on UI polish and
animation judgement. It's already in this project and it is directly on-topic.

---

## 2. The job

Little Sylly Games is a box of **20 local party games** that runs as an offline PWA. The lobby
today is a vertical stack of 20 brand-coloured buttons. It works, and at 20 games it has stopped
scaling.

**Your remit this round is the visual language of the phone lobby, and only that.** Specifically:
the shell (dock, wordmark, view switcher), the shelf row, the game tile, the folder-open grid,
and the info sheet. Take those from "assembled" to "designed".

**Explicitly not this round:** the TV/widescreen layout, the Premium cabinet, the game screens
themselves, and anything behind a dock icon other than Sound and Controller.

**The budget is real and small** (see § 9). One layout done excellently beats four done thinly.

---

## 3. What exists today

The current lobby is `#screen-lobby`, reproduced faithfully for you as the **"Today (Original)"**
pane in the sandbox — same classes, same font, same colours, generated from the same data. Look at
it there rather than in `index.html`.

| Thing | What it is |
|---|---|
| **20 game buttons** | `gel-btn lobby-btn` — a moulded keycap treatment (SW v218). Brand fill, white ink, emoji badge in a light circle. Defined in `css/styles.css`, grep `.gel-btn` |
| **The logo** | `assets/logo.png`, a real lockup — **not** the type-only wordmark the mockup assumed. (It is also 479 KB, which is a known issue and *not* yours to fix) |
| **A sort toggle** | `#btn-lobby-sort` — cycles Release ↔ Colour, relabelling itself in place. `js/engine.js:1065` |
| **The 3D controller** | A live Three.js object on the lobby (`#lobby-controller`). Tapping it opens the Workshop — colour, and a sticker book you place stickers with. It is also **the Konami input surface** |
| **The arcade tile** | 🕹️ injected into `#lobby-header-icons` *only after* the Konami code is entered. Session-only; re-locks on reload. `js/secret-mode.js:680` |

**Fredoka is self-hosted** (`fonts/`, two woff2, 33 KB total), not Google Fonts.

---

## 4. The mockup you're building on — and where it is now wrong

`wip/Game box UI mockups.zip` (extract it if you want to look; the screenshots are the fast way)
contains a strong earlier design pass: five verb shelves, a utility dock, tiles with looping art
strips, an info sheet. **Its direction is good and you should build on it.** But it was drafted
against a different app, and it inherits several facts that are no longer true.

| The mockup assumes | Actually |
|---|---|
| 18 games | **20.** CLD and COMB are on no shelf; every shelf count is wrong |
| **"Phone is the product — one phone passed around"** | **11 of 20 games are multi-device only** — every player needs their own phone. Only 9 support pass-the-phone. **More than half the box cannot be played the way the mockup assumes.** This is the biggest correction in this document |
| Controller = "a 7-tap easter-egg trigger" | A real 3D object, a full customiser, and the Konami surface |
| Wordmark is "type-only, awaiting the real lockup" | `assets/logo.png` exists and ships |
| Fredoka from Google Fonts | Self-hosted. Zero third-party requests, by design |
| Skins / Word Packs / Arcade are normal dock icons | All three live **behind the Konami wall** today |
| A search icon in the dock | 20 games across 5 shelves. Ask whether search earns its slot — a **device filter** ("can we play this with one phone?") would serve a deciding group far better |

Its own stated open questions are still open and still good — particularly *"does the info sheet
slow down repeat players?"* and *"should touching a strip pause it?"*

---

## 5. Settled — do not re-litigate

These are the owner's decisions. Build to them.

**The lobby has four layouts, not three.** Premium ✨ · Shelves 🗂️ · TV 🖥️ · **Original**. Original
is today's stack — it stays as the fallback and the mobile default for now. The mockup's switcher
has three slots; you need four, at 390px, without truncating labels into mush. A segmented control
is one answer; the existing `#btn-lobby-sort` cycling-button is a precedent in this very lobby; a
picker sheet is a third. **Your call.** Only Shelves needs to work this round.

**Tap a tile → info sheet → Play → the game's existing menu.** The sheet is the browse-and-learn
surface. The game menu (Play / How to Play / Settings / Back to the Box) survives untouched behind
it — it is where Settings live and rewiring it is a separate project. The sheet costs repeat
players one extra tap; that is accepted for now.

**The dock unlocks progressively.** Always visible: **You** (profile) · **Achievements** ·
**Sound**. Appearing *only after* the Konami code: **Skins** · **Word Packs** · **Arcade**. No
greyed-out placeholders — a dimmed icon tells every player a secret exists, which is the thing the
Konami beat is built to withhold. Maximum six icons.

**The controller is the player's avatar.** This collapses "Profile" and "the 3D controller" into
one object: it *is* you in this box. Stickers already go on it; achievements would attach to it
naturally; customising it is already the personalisation layer.
**Flagged as an early call** — no profile or account system exists yet, and the owner made it
because it feels right rather than because anything depends on it. **If you see a better direction
for how the player is represented, say so** — that feedback is wanted, and this is the one settled
item explicitly open to challenge.

**Profile and Achievements are icons only.** They open nothing this round. But see § 8 — you owe a
short written blueprint for each.

---

## 6. Genuinely open — these are yours

**The visual language itself.** Type scale, colour, spacing, radii, motion, the tile treatment,
the dock's shape, how a shelf row reads. The mockup's warm-stone-and-hot-pink is a **default, not a
constraint** — depart from it if you have a better answer, and say why.

**Where the controller lives.** It is the most distinctive thing on the screen and the only route
to Konami, so it needs a real home with a real footprint. Hero? Anchored in the dock? Something
else? Design *around* a live 3D object rather than treating it as an icon.

**The shelves.** My assignment is in `games.js` and it is a proposal, not a decision:
Talk (5) · Bluff (6) · Guess+Draw (3) · Cards (6) · Luck (3), with FLW/FRT/DYB/SHP/CJAR each on two
shelves (the README's own pattern). It places **18 of 20 games cleanly.**

> **CLD and COMB fit none of the five.** All five shelves describe how you *communicate* or what you
> *hold*; neither describes Cold Shoulder's simultaneous physical shove or Honeycomb Hills' hex-board
> economy. **My recommendation: a sixth shelf for games with a shared spatial board.** The floe and
> the meadow are the only persistent shared arenas in the box — everything else is cards, words,
> dice or drawings. It's a real category rather than a dumping ground, and it extends. Name it in
> the game's voice. **Propose better if you see better** — `SHELF_NOTES` in `games.js` has the full
> reasoning and the alternatives considered.

**Guess + Draw is thin at three games.** That may be fine, or it may mean the taxonomy wants
rebalancing. Worth a look.

**The marquee.** The mockup loops art strips on five shelf rows simultaneously, 22s, infinite, no
pause. That is five continuously-compositing animations on a phone. It may well be fine — it is
`transform`-only — but it is the single most expensive motion decision in the design and deserves a
deliberate answer, including what it does under reduced motion.

**Emoji.** Every tile in the mockup is an emoji, and the screenshots show *Windows'* emoji set.
The same tiles look substantially different on iOS and Android — different shapes, different
colours, different visual weight. For a phone-first product that is a real risk to the tile
treatment. Decide knowingly.

---

## 7. Constraints

### Hard — these are physics, not taste. They apply at every tier.

- **44px minimum touch target.**
- **Animate `transform` and `opacity` only.** Anything else triggers layout per frame and janks on
  a mid-range phone, which is most of this audience.
- **`prefers-reduced-motion` is honoured globally for CSS** — `css/styles.css` ends with a block
  zeroing every duration. **A `requestAnimationFrame` loop is NOT covered by it** and must check the
  media query itself. Honour what the standard asks: show the end state, skip the journey. Never
  drop the information.
- **No horizontal page scroll at 390px.**
- **Offline-first. No new runtime dependency, no build step, no external request.** Everything is
  vanilla JS with global symbols — no modules, no framework.
- **Australian English. Metric.**

### Cost — what you may spend, from `docs/cost-envelope.md`

**The install today is 11.49 MB.** The shape of it should steer you:

| | |
|---|---|
| `data/art/` — **six games'** artwork | **6.03 MB — over half the install** |
| `js/lib/` — Three.js, Firebase, Tailwind, physics | 1.50 MB |
| Fredoka, both woff2 | **0.03 MB** |

**Tier 1 — free, already paid for. Push here first.** Three.js (vendored and shipping), canvas,
inline SVG, CSS, the existing component vocabulary. **Visual ambition expressed in code costs
essentially nothing** — Three.js is a sixth of one game's artwork. The 3D controller already proves
the suite carries this comfortably.

**Tier 2 — costs something; propose it with the number.** A new typeface is only ~30–100 KB (the
real cost is restyling 20 games, which is labour, not bytes — so it is *allowed*, just expensive in
a way the file size hides). Lobby tile artwork at a 40 KB/tile ceiling is ~0.8 MB.

> **If you design real tile art, design it onto the runtime-cached contract** (the one
> `data/packs/`, `data/music/` and `data/stickers/` already use) rather than the precached one.
> Twenty tiles then cost **zero** install, need no version bump to change, and become skinnable.
> The trade is that a cold offline first-run shows the placeholder — **which is exactly why the
> placeholder must be a finished-looking treatment in its own right, not a stand-in.** A lobby whose
> placeholder already looks designed can treat real art as an upgrade. One whose placeholder looks
> unfinished is hostage to an art project nobody has commissioned.

**Tier 3 — out of scope to build.** Anything needing a server or an account. But the owner's stated
direction *is* eventual accounts, so where a surface would one day need one, **design it so
local-now / server-later is a data-source swap rather than a redesign**, and say where the seam sits.

---

## 8. The sandbox, and how to see your own work

`wip/lobby-lab/` contains:

| File | What it is |
|---|---|
| **`index.html`** | **Your canvas.** Real Fredoka, real `css/styles.css`, real Tailwind. Three panes: a working **Today (Original)** render, an empty **Shelves** canvas (yours), and an empty wide canvas (not this round) |
| **`games.js`** | The verified 20-game table — `window.GAMES`, `window.SHELVES`, `window.SHELF_NOTES`. **Read its header comments**; they say exactly which fields are machine-verified and which are editorial |
| `games.raw.json` | The unedited extraction, for traceability |
| `build-games.js` | Regenerates the raw extraction from the shipped app |

**`minutes` is `null` for 13 of the 20 games, deliberately.** It is filled only where a game's own
copy states a number outright. The mockup guessed these and flagged its own guessing as a problem.
**Do not invent them, and do not design a layout that structurally requires them** — the sheet and
tile must both read correctly when a game's length is simply unknown.

**You can see your work.** Invoke the **`visual-check`** skill — it serves the repo and drives real
headless Chromium. Your page is at `http://localhost:8791/wip/lobby-lab/index.html`. Screenshot at
**390px** (baseline) and **430px** (large phone), assert no horizontal overflow, and check it with
`prefers-reduced-motion` emulated. This loop is the single biggest lever on the quality of what you
produce — use it deliberately, in batches, rather than after every tweak.

---

## 9. Deliverables, and what "done" looks like

**Done means:** `wip/lobby-lab/index.html` renders a complete phone lobby at 390×844 — dock,
wordmark, four-slot view switcher, shelf rows, folder-open grid, info sheet — with every state
reachable, screenshot-verified at 390 and 430, no horizontal overflow, reduced-motion clean, and
zero console errors.

**Plus `wip/lobby-lab/DESIGN-NOTES.md`**, short:

1. **What you changed from the mockup, and why.** Especially anything in § 6 you decided.
2. **Anything in § 5 you think is wrong** — particularly controller-as-avatar.
3. **Two blueprint paragraphs: Profile, and Achievements/Stickerbook.** Not designs — written
   specs. What's on the screen, what data it needs, and **where the local-now/server-later seam
   sits.** This is what lets the owner build them later without paying for a design model again.

### Working within the budget

The budget is **~USD 100 of Fable credits, total.** Two things follow.

**Thinking and writing are the expensive part; reading is cheap.** Your output is billed at
$50/MTok and your thinking counts as output. So the thing to ration is **turns and full-file
rewrites**, not what you look at. Edit surgically rather than regenerating the whole sandbox.

**Work in vertical slices, not horizontally.** Take lobby → one folder → one sheet to medium
fidelity *first*, and prove the visual language across a transition. Then deepen. A language is
mostly revealed in how one surface becomes the next — and if the budget runs out, a complete rough
flow is far more useful than a perfect lobby and two unknowns.

**Ask before departing from a settled decision in § 5.** Propose freely within § 6 — that is what
you are here for.
