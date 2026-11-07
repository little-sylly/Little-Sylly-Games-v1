# UI reference — menu extras

> On-demand (not auto-loaded). Menu Title Treatment and the Gel Button treatment. The Universal Menu Standard itself stays in `ui-style.md`. Moved verbatim on 4 Nov 2026; each source file keeps a stub with the headline rule.

---

### Menu Title Treatment (all 20 games, 8 Sep 2026)

The game-name heading above the emoji/subtitle is `text-5xl font-bold leading-tight`, split into
a neutral (`text-stone-800`) part and a brand-coloured part — never one flat-coloured string.
Eight games shipped this from the start; the other twelve (BLD, GTH, DYB, PASS, NT, FRT, SHP, FLW,
PKO, CJAR, CLD, COMB) were smaller and single-toned until this pass brought them level.

**Multi-word titles** stack as two sibling `<h1>` lines inside the same wrapper `<div>` — first
word(s) neutral, last word coloured (`Pecking` / `Order`, `Honeycomb` / `Hills`, `Cold` /
`Shoulder`). A hyphenated compound with no second word (`Net-Trace`) does **not** split across two
lines — a mid-word line break reads as a hyphenation accident, not a design choice. Keep it on one
line instead (see single-word treatment below).

**Single-word titles (and hyphenated one-word titles) split inline, same line, at the natural
suffix** — two `<span>`s inside one `<h1>`, root neutral and suffix coloured: `Flaw` + `less`,
`Bail` + `ed`, `Net-` + `Trace`. For a short word with no real suffix, split wherever reads most
natural (`Pa` + `ss`). This is a judgement call per title, not a formula — there is no algorithm
for "natural suffix", just read the word.

**The coloured half is usually the game's already-established *label/accent* colour, not its raw
CTA fill hex** — a brand fill chosen for a solid button background is frequently unreadable as thin
text on the page's off-white ground. Several custom-hex brands already carry a separate darkened
`-label` class for exactly this reason — reuse it: `bld-label`, `dyb-label`, `shp-label`,
`flw-step-label`, `pko-label`, `cjar-label`, `cld-label`, `comb-label`. Games on stock Tailwind
colours use a **darkened** shade of the same hue, not the literal button shade — YGI's CTA is
`amber-500` but its heading half is plain `amber-500` text (already borderline on contrast,
consistent with its pre-existing How-to step-label convention).

**FRT is the one sanctioned exception:** its heading half (and `FRT_ACCENT = FRT_FILL`, used for its
How-to label, "Call TRUE" and selection outline too) is the literal brand fill `#FFE500`, at owner
insistence, contrast cost accepted. **Don't read it as "the fill hex is always right"** — the default for
every other game is the darkened label colour above. Two traps to avoid: reaching for an existing accent
constant without checking it is actually the game's colour, and trusting hue-angle + contrast without
looking at the swatch (darkened yellow reads as brown). Story: `frt-implementation-notes.md`.

> This section is about **heading and label _text_** on the off-white page — where a darkened
> rung is still the default. **Button and pill _ink_** is a separate axis, settled 10 Sep 2026:
> every game's standard buttons + settings pills use **brand fill + white ink**, matching that
> game's locked menu Play CTA, contrast cost accepted suite-wide. See § Action Button Standard
> → "Locked per-game button scheme" below. FRT/YGI/COMB/CLD went from dark ink to white in that
> pass; their `-label` text colours were untouched.

**A colour needs *some* legible resting shade before it can be text** — CTA, heading or label. Reach for the darkened partner (CJAR honey-gold, CLD `#123B4C`); FRT is the one place that default was knowingly traded away.

---

## Gel Button Treatment (`.gel-btn` / `.gel-btn-light`)

The moulded "keycap / Frutiger-Aero gel pill" look. Shipped for the lobby buttons (SW v214 →
v216), then extracted into a badge-agnostic pair (SW v218) so the **game menus' four buttons**
share it. Classes live in `css/styles.css` (grep `.gel-btn`).

**Where it is used — and only here:**
- The 18 lobby game buttons (`gel-btn lobby-btn` — `.lobby-btn` now adds *only* the left-badge
  layout; all the moulding is `.gel-btn`).
- Every game menu's four buttons: Play CTA + How to Play take `gel-btn`; Settings + ← Back to the
  Box take `gel-btn gel-btn-light`.

**Do NOT extend it further.** Gameover buttons, Decision Modal confirm/cancel, in-game submit
buttons, pills and toggles stay flat. The gel is the *menu shelf* signature — putting it on
gameplay chrome dilutes that and fights the Motion Standard's transform-only tap feedback.

**How it works (all four layers colour-AGNOSTIC — translucent white/black only, zero per-game
values, so it sits over any Tailwind fill, `bg-[#hex]`, custom `*-cta` class or inline style):**
1. body `background-image` gradient — crown light, deepening to the base
2. `::before` — the specular cap: an inset pseudo-element with an elliptical bottom edge (a
   gradient *stop* can only paint a flat stripe; the curved cap is what reads as a dome)
3. `::after` — bounce-light off the base
4. `box-shadow` — outer bezel + inner rims + the keycap 3-D drop

`.gel-btn` sets `isolation: isolate` and paints `::before`/`::after` at `z-index: -1`, so the
gloss sits **over the fill but under the button's own text** — menu buttons need no label-span
wrapper (lobby buttons keep their `.lobby-btn-label` span for the badge layout + text-shadow).

**`:active`** sinks `translateY(3px)` and **redeclares the full `box-shadow`** — an
equal-specificity `:active` rule earlier in the file would otherwise strip the bezel mid-press.
Press animates `transform` only (composited), so it needs no `transition-all` and nothing for the
reduced-motion block to catch.

**`.gel-btn-light`** overrides the body gradient + `::before` to a low-alpha gloss, keeping the
colour-agnostic bezel/drop. Use it wherever a `gel-btn` sits on a **pale fill** (light brand tint,
`bg-stone-200`) — at full strength the white cap blows the button out and the dark base gradient
muddies it.
