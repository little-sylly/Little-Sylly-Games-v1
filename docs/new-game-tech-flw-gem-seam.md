# Technical Spec — Flawless: Gem Render Seam, Round-End Reveal & Table Reference

**Game:** Flawless (`flw`, game 16)
**Type:** Change spec (not a new game) — render seam, art contract, three screens, one synced accumulator
**Tier:** 2 — Architectural (render seam + art contract + cross-cutting `bindCardHold` extraction)
**Date:** 14 Aug 2026
**Target SW:** v183
**Status:** Confirmed — ready for task plan

---

## 1. Summary

FLW's gem art currently carries its own carat number, name and border baked into each JPEG.
That single decision is upstream of five separate reported problems: the How-to gallery's
artwork and descriptions read as misaligned, thumbnail borders clip, the art viewer's border
doesn't match the card's, a reskin can't rename a gem without redrawing all ten images, and a
round-end reveal shows pictures a player can't reliably read.

This spec moves **all text and all chrome out of the artwork and into CSS**, in the shape CJAR
already proved (`cjar.js:1986-2008`). The art becomes a plain square gem; the card frame, the
carat placard and every interaction state are drawn by the seam. Everything else in this spec
either depends on that change or was found alongside it.

### The nine tasks

| # | Task | Why it's here |
|---|------|---------------|
| 1 | Render seam — square art, CSS display-case frame, carat placard, size variants | Root fix |
| 2 | Round-end reveal on **both** result and gameover screens | Reported bug + a real gap |
| 3 | Shared `bindCardHold` in `engine.js`; wire FLW, migrate PKO + SHP | FLW missing a suite standard |
| 4 | Gem placards flanking the hand; Counterfeit token to its own row | Mid-round readability |
| 5 | Ledger to two columns; discard strip; setting → Tally / Discards / Off | Vertical space + new view |
| 6 | "Collectors" copy pass | No player noun exists today |
| 7 | Art contract — dimensions, ceiling, authoring guide, `sw.js`, `CACHE_NAME` | Art must be regenerated |
| 8 | Delete the duplicated gem list in the How-to Rules tab | Rename drift risk |
| 9 | Rewrite `game-identities.md` § Game 16 | Documents a different game |

---

## 2. Confirmed design decisions

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | Art carries **no text and no border** — carat and frame are CSS | One art set survives any rename or reskin; borders can't clip because they aren't in the bitmap |
| D2 | Art is **square**, not card-aspect | A square master against a portrait card loses ~27% of every byte to `cover` (CJAR TG-02b). Square art in a square image region wastes nothing |
| D3 | The card **keeps a frame** — "display case", gold `#C9A227` with a platinum inner hairline | The frame carries `selectable` / `dimmed` / `selected` state. A bare image has nowhere to hang them. `#C9A227` is already FLW's documented Exhibition gold, and the settings overlay is already titled *The Display Case 💎* |
| D4 | The carat sits on a **placard**, not directly on the artwork | `#A02050` on Raw Obsidian `#14141C` or Black Opal `#2B2B3A` is unreadable, and a future skin could put anything under the numeral. A light chip guarantees contrast against any art forever — and a display case has an engraved plaque |
| D5 | Carat ink is `#A02050`, **not** the brand `#E879A8` | `#A02050` is already FLW's separate darkened ink; lightening the brand later leaves it untouched by construction |
| D6 | The gem **name is not on the card** | The placard beside it and the gallery row both carry the name. Removing it is what makes a square region viable |
| D7 | Hand layout is `placard │ gem │ gem │ placard` | Two cards side by side matches the physical hand; that region has free horizontal space and no free vertical space |
| D8 | Placard copy is compressed to ~30 chars | Full effect copy stays in the gallery. At ~94px per placard, anything longer wraps past three lines |
| D9 | Ledger tally is **kept**, discard strip is **added**, setting becomes tri-state | "What's left" is the deduction engine of a Love-Letter-shaped game. The pure-memory option already existed as OFF; it stays |
| D10 | No "last played" centre-piece (CJAR's shape) | CJAR has one shared play per beat. FLW has up to six players discarding every turn, so "the last one" changes constantly and belongs to whoever just went — a weak focal point here |
| D11 | Players are **Collectors** | No noun existed — copy said "rivals" and "survivor". Fits Showpiece / Under Glass / Best in Show / The Showing |

---

## 3. Task 1 — Render seam

### 3.1 Current state

`flwRenderCard(gemId, opts)` (`flw.js:108-148`) writes everything inline via `el.style.cssText`
and has **no CSS classes at all** — `.flw-card` and `.flw-card-back` are referenced in JS but
defined nowhere in `css/styles.css`. Critically, the asset branch (`flw.js:127-133`) returns a
bare background-image div: the carat and name elements are built **only** in the emoji-fallback
branch below it. That is the defect.

Five call sites:

| Line | Context | New size |
|------|---------|----------|
| `flw.js:364` | Gallery row (How-to → The Gems) | `sm` |
| `flw.js:446` | Hand row | `md` |
| `flw.js:908` | Green Emerald keep-one-of-three overlay | `lg` |
| `flw.js:1007` | Showing-result reveal | `md` |
| `flw.js:1409` | Peek Guard (Amethyst) reveal | `lg` |

Plus two new consumers from this spec: the discard strip (`sm`) and the gameover reveal (`md`).

### 3.2 New signature

```js
flwRenderCard(gemId, opts)
// opts: { size: 'sm'|'md'|'lg'  (default 'md')
//         faceDown: bool
//         dimmed:   bool        → .flw-card-dim
//         selectable: bool      → cursor:pointer
//         selected: bool }      → .flw-card-sel   (replaces the inline outline at :447 and :917)
```

`selected` is new: selection is currently set by the **caller** writing
`card.style.outline = '3px solid #D6336C'` in two places. Both move into the seam.

### 3.3 CSS — new block in `css/styles.css`

Modelled on `.cjar-card` (`styles.css:2006-2099`). All sizes are square.

```css
/* ── FLW gem cards — display-case frame, CSS chrome over plain square art ──
   Art carries NO text and NO border (spec §2 D1/D2). Everything visible that
   is not the gem itself is drawn here, so a skin or a rename needs no new art. */
.flw-card {
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: 0.6rem;
  overflow: hidden;                 /* clips art to the frame's radius */
  background: #FBFAF7;
  border: 2px solid #C9A227;        /* Exhibition gold */
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.6),   /* platinum hairline */
              0 1px 4px rgba(0,0,0,0.18);
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
}
.flw-card-sm { width: 3rem;    }
.flw-card-md { width: 4.25rem; }
.flw-card-lg { width: 5.5rem;  }

.flw-card-dim { opacity: 0.35; }
.flw-card-sel { outline: 3px solid #D6336C; outline-offset: 2px; }

/* The placard — a light engraved chip holding the carat. Never sits directly on
   the artwork: #A02050 over Raw Obsidian (#14141C) would be unreadable, and a
   skin can put anything under it (spec §2 D4). */
.flw-carat {
  position: absolute; top: 0.2rem; left: 0.2rem;
  min-width: 1.15rem; padding: 0 0.18rem;
  border-radius: 0.22rem;
  background: #F7F4EC; border: 1px solid #C9A227;
  color: #A02050; font-weight: 800; font-size: 0.8rem;
  line-height: 1.35; text-align: center;
}
.flw-card-sm .flw-carat { font-size: 0.6rem;  min-width: 0.9rem; }
.flw-card-lg .flw-carat { font-size: 0.95rem; min-width: 1.35rem; }

/* Fallback face when no art has resolved — colour + carat is enough to identify
   a gem. The seam must never depend on art having loaded. */
.flw-card-fallback { background: var(--flw-gem, #ccc); }

.flw-card-back { /* same frame, gradient fill — see §3.5 */ }
```

`aspect-ratio: 1/1` means each size rule sets `width` only; height follows.

### 3.4 New `flwRenderCard` body

```
if faceDown:
    div.flw-card.flw-card-back.flw-card-{size}
    assetBack('flw') → background-image; else gradient fill + 💎
    return                                    (no placard on a back)

el = div.flw-card.flw-card-{size}
el.dataset.gemId = gemId
faceUrl = assetFace('flw', gemId)
if faceUrl: el.style.backgroundImage = url(faceUrl)
else:       el.classList.add('flw-card-fallback');
            el.style.setProperty('--flw-gem', FLW_GEM[gemId].colour)

el.appendChild(placard)                       ← ALWAYS, both branches
if dimmed     → classList.add('flw-card-dim')
if selected   → classList.add('flw-card-sel')
if selectable → style.cursor = 'pointer'
return el
```

**The placard is appended outside the art branch.** That is the whole fix — the current code
returns early at `flw.js:132` before any text is built.

### 3.5 Back face

The back becomes square too (D2). Until new art lands, the gradient fallback at `flw.js:121`
keeps its colours but takes the square frame. `data/art/flw/img/back.jpg` is regenerated square
under task 7.

### 3.6 Art viewer

`artMakeZoomable` (`flw.js:364`) is passed the resolved URL and renders the **raw image** with
no frame. Since the frame is no longer in the bitmap, the "viewer border doesn't match the card
border" mismatch disappears by construction rather than by tuning — there is only one border
in the app and the viewer deliberately doesn't draw it.

---

## 4. Task 2 — Round-end reveal

### 4.1 The reported bug

`flwShowShowingResult` (`flw.js:996-1014`) **already** renders every survivor's final Showpiece.
The gap is that `flwShowGameover` (`flw.js:1059-1073`) renders nothing but the medal table — so
when the Showing that ends the match is also the one that locks the Vault, the reveal screen is
skipped entirely and the gems are never seen. Contributing: with baked-in art at `md` size and
no placard, a card that *was* rendered was hard to read.

### 4.2 Changes

**`flwEndShowing` (`flw.js:937-971`)** — build `reveal` for both end reasons:

```js
// Was: reveal only for 'vaultlock'; null for 'laststanding' (flw.js:951)
reveal = survivors.map(i => ({ idx: i, gemId: flwHands[i] }));
```

For `laststanding` that is a single-entry array — the last Collector's gem, which is worth
showing. Non-empty in both cases, so no Firebase erasure risk; readers still use `d.reveal || []`
defensively per the erasure rule.

**Extract `flwBuildReveal(reveal)`** → returns the label + card row DOM currently inlined at
`flw.js:997-1014`. Called by both `flwShowShowingResult` and `flwShowGameover`.

**`flwShowGameover`** — insert the reveal block above the medal table. Also: it is currently
built as an HTML string with `'·'` for 4th place and no fixed-width medal slot, which violates
the podium rank-icon rule (`ui-style.md` § Gameover podium rank icons). Since it's being touched
anyway — the documented trigger for that rule — give it the `1.4rem` fixed slot so unmedalled
rows align with medalled ones.

---

## 5. Task 3 — Shared `bindCardHold`

### 5.1 Current state

Tap-hold-to-gallery is a documented suite standard (`ui-style.md` § Tap-Hold Reference) shipped
twice with near-identical code: `pkoBindChainHold` (`pko.js:981-988`) and `shpBindCardHold`
(`shp.js:1488-1498`). FLW never got it. A third copy is the trigger to extract.

The two differ in one real way: SHP cancels on `touchmove`, PKO does not. SHP's is correct — a
scroll gesture that starts on a card must not open the gallery. **The shared version takes SHP's
behaviour**, which is a small live fix for PKO.

### 5.2 New in `engine.js`

```js
// Long-press a card to jump to its row in that game's How-to gallery tab.
// Suite standard — ui-style.md § Tap-Hold Reference. Third user (FLW) earned the extraction.
function bindCardHold(el, onHold, ms = 500) {
  let timer = null;
  const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
  const start  = () => { cancel(); timer = setTimeout(() => { timer = null; onHold(); }, ms); };
  el.addEventListener('touchstart', start, { passive: true });
  el.addEventListener('touchmove',  cancel, { passive: true });   // a scroll is not a hold
  ['touchend','touchcancel','mouseup','mouseleave'].forEach(e => el.addEventListener(e, cancel));
  el.addEventListener('mousedown', start);
}

// Scroll a gallery row into view and ring it briefly. `pingClass` is per-game
// (the ring takes the game's colour); the mechanics are not.
function refHighlightRow(box, attr, id, pingClass, ms = 1600) {
  const target = box && box.querySelector('[' + attr + '="' + id + '"]');
  if (!target) return;
  requestAnimationFrame(() => {
    target.scrollIntoView({ block: 'center' });
    target.classList.add(pingClass);
    setTimeout(() => target.classList.remove(pingClass), ms);
  });
}
```

`refHighlightRow` uses a `box_shadow` transition class, never `animation` — global reduced-motion
already zeroes transition durations (`ui-style.md` § Motion Standard), so no separate guard.

### 5.3 Migration

- `pkoBindChainHold` and `shpBindCardHold` become one-line wrappers delegating to `bindCardHold`.
  Call sites (`pko.js:965,1201,1254`; SHP's) are untouched.
- SHP's inline highlight block (`shp.js:2064-2069`) delegates to `refHighlightRow`.
- `.shp-ref-row-ping` (`styles.css:1164`) stays; add `.flw-ref-row-ping` and `.pko-ref-row-ping`
  in the same shape with each game's colour.

### 5.4 FLW wiring

- `flwOpenHowTo(tab, highlightId)` — gains the second parameter; forces `'gems'` whenever
  `highlightId` is set. `flwOpenGemManifest()` (`flw.js:329`) is unchanged.
- `flwRenderGems` (`flw.js:360-380`) — tag each row `data-flw-gem-id="{id}"`; when a
  `highlightId` is passed, call `refHighlightRow`.
- `flwBindCardHold(el, gemId)` → `bindCardHold(el, () => flwOpenHowTo('gems', gemId))`.
- **Bind on:** hand-row cards, reveal cards (both screens), discard-strip cards, Emerald
  keep-one-of-three cards, the Peek Guard reveal. **Not** on gallery rows themselves.
- The header `[?]` and the `[?] Gem Manifest` button are unchanged — this is **additive**.

---

## 6. Task 4 — Gem placards in the hand row

### 6.1 Layout

DOM order in `#flw-hand-row`, built by `flwRenderHand` (`flw.js:425-462`):

```
[placard 0] [card 0] [card 1] [placard 1]      ← your turn (two gems)
            [placard 0] [card 0]               ← off-turn (Showpiece only), centred
```

Descriptions sit on the outside edges; the two cards stay adjacent in the middle.

### 6.2 Geometry — starting point, to be confirmed by measurement

Stack inner width is 344px (`max-w-sm` 384px less the section's `px-5`).

| Element | Width |
|---------|-------|
| 2 × `.flw-card-md` (4.25rem + 4px border) | 144px |
| 3 × gap `0.25rem` | 12px |
| 2 × placard | **94px each** |

At `text-[0.55rem]` a placard fits ~18 chars/line, so a 15-char name plus a ~30-char effect line
lands at three lines. These numbers are a starting point — task 4 is not complete until a
`visual-check` pass measures the real row at 360px and 390px viewports (§11).

### 6.3 Placard markup

```html
<div class="flw-placard flex flex-col gap-0.5 rounded-xl bg-white px-2 py-1.5 shadow-sm">
  <p class="text-[0.58rem] font-bold text-stone-700 leading-tight">Purple Amethyst</p>
  <p class="text-[0.55rem] text-stone-500 leading-tight">Secretly view a Showpiece</p>
</div>
```

`.flw-placard` gets `flex: 1 1 0; min-width: 0;` so the two share leftover width evenly.

### 6.4 State mirroring

The placard mirrors its card's state — this is the point of pairing them:

| Card state | Placard |
|-----------|---------|
| `selected` (`flwSelSlot === slot`) | `.flw-placard-sel` — same `#D6336C` ring |
| `dimmed` (Ruby forced lock) | `opacity: 0.35` |
| Counterfeit mode (`flwCfMode`) | Shows the **real** gem — you are choosing which real gem to keep |

Tapping a placard selects its card (same handler) — it is a bigger touch target than the card.

### 6.5 New copy constant

```js
// Glanceable effect copy for the hand placards — capped at ~30 chars so it wraps to
// two lines at ~94px. Full copy lives in FLW_GEM_EFFECT and the gallery; two deliberate
// losses at this width: Topaz's "(or you)" self-target, and the effect names
// (The Trade, The Loupe) in favour of what the gem does.
const FLW_GEM_SHORT = {
  9: 'Out if forced to discard',
  8: 'Must play if held with 7 or 5',
  7: 'Swap Showpieces with a rival',
  6: 'Draw 2, keep best of 3',
  5: 'Force a discard and redraw',
  4: 'Untargetable until your turn',
  3: 'Lower carat is Exposed',
  2: 'Secretly view a Showpiece',
  1: 'Name a gem to Expose',
  0: 'Bonus if sole Collector with one',
};
```

### 6.6 Counterfeit token

`flwRenderCounterfeitToken` is currently appended as a fifth element of `#flw-hand-row`
(`flw.js:454-461`), which overflows once placards are added. It moves to a **new
`#flw-counterfeit-row`** directly below the hand row. It isn't a Showpiece — it's an action — so
separating it is more correct regardless of width. It also becomes square (`.flw-card-lg`
geometry) to match the new cards.

---

## 7. Task 5 — Ledger, discard strip, tri-state setting

### 7.1 Ledger → two columns

`flwRenderLedger` (`flw.js:395-414`) draws a 10-row single-column grid, ~160px plus card padding
— roughly a fifth of a phone viewport for a static reference table, and the strip needs room.

Change the grid to two columns of five (9→5 left, 4→0 right), keeping the descending read down
each column:

```
grid-template-columns: 1.1rem 1fr auto auto  1.1rem 1fr auto auto;
```

Rows are emitted in the order `9,4 / 8,3 / 7,2 / 6,1 / 5,0` so each visual column reads
descending. Fade/strikethrough behaviour for exhausted gems is unchanged.

### 7.2 Setting: `flwLedgerOn` → `flwLedgerMode`

| Old | New |
|-----|-----|
| `let flwLedgerOn = true` (bool) | `let flwLedgerMode = 'tally'` — `'tally'` \| `'discards'` \| `'off'` |
| Toggle `#btn-flw-ledger-toggle` | Three pills, `data-flw-ledger`, `pill-active-flw` |

All three values are non-empty strings, so none is at risk from Firebase's empty-value erasure.

**Both halves of the settings sync must change** (`engine-multiplayer.js`):
- `mpSerialiseSettings` `case 'flw'` (`:863-865`)
- the `SETTINGS_SYNC` deserialiser `case 'flw'` (`:1052-1059`)

Missing the second half is the documented CJAR failure — the client's settings overlay silently
shows its own defaults.

Pill labels are literal (`Tally` / `Discards` / `Off`), so no DD-13 dynamic value line is needed;
the static description above the pills is rewritten to cover all three.

### 7.3 The discard feed

The strip needs a **chronological** list. `flwDiscards` is per-player and unordered across
players; `flwPublicLog` is text. So a new public accumulator:

```js
let flwDiscardFeed = [];   // [{ g: gemId, p: playerIdx }] — chronological, newest last
```

**One choke point, not five.** There are five sites that push to `flwDiscards`
(`flw.js:501, 749, 779, 790, 804`). Rather than adding a feed push to each — where a sixth site
added later would silently miss it — introduce:

```js
function flwDiscard(idx, gemId) {
  flwDiscards[idx].push(gemId);
  flwDiscardFeed.push({ g: gemId, p: idx });
}
```

and convert all five. This is the same discipline the private-hand repair rule states in
`logic-engine.md`: put the side effect inside the single function where cards leave the
collection, so a new caller inherits it for free.

Note site `:779` deliberately pushes the **claimed** id for a forged Counterfeit, not the real
one — the Ledger sees the claim. The feed inherits that unchanged, which is correct: the strip
is a public record and shows what was publicly claimed.

### 7.4 Packet impact

`flwDiscardFeed` is an accumulator that resets per Showing, so both halves of the erasure rule
apply — **send the reset value explicitly and rebuild it on receipt**:

| Packet | Change |
|--------|--------|
| `FLW_SHOWING_START` (`flw.js:196-204`) | add `discardFeed: []` — an empty array is erased in flight, so the client must not be left carrying the previous Showing's feed |
| `FLW_RESOLVE` (`flw.js:872-880`) | add `discardFeed: flwDiscardFeed` |
| `FLW_SHOWING_END` (`flw.js:967-968`) | add `discardFeed: flwDiscardFeed` |
| Every applier | `flwDiscardFeed = d.discardFeed \|\| [];` — never assign the raw field |

`flwDealShowing` resets it locally alongside `flwPublicLog` (`flw.js:182`).

### 7.5 Strip render

New `flwRenderDiscardStrip()`, shown when `flwLedgerMode === 'discards'`:

- Horizontal `overflow-x: auto` row of `.flw-card-sm` faces, newest **last**.
- After render, `el.scrollLeft = el.scrollWidth` so the newest is visible — same idiom as
  `flwRenderLog`'s `scrollTop` (`flw.js:422`).
- The newest entry takes `.flw-card-sel` so the eye lands on the most recent play.
- Each card gets `bindCardHold` → gallery (§5.4).
- A tiny owner initial under each card, `text-[0.5rem] text-stone-400`.
- Empty state: `<p class="text-stone-400 text-xs">Nothing discarded yet.</p>`

The `[?] Gem Manifest` button in the ledger card header (`index.html:8358`) stays in place for
all three modes.

---

## 8. Task 6 — "Collectors" copy pass

No player noun exists. Shipped copy says "rivals", "survivor", "last one standing"
(`flw.js:343`, `index.html:8498,8503`).

| Site | Change |
|------|--------|
| `FLW_GEM_EFFECT[0]` (`flw.js:343`) | "sole survivor" → "sole Collector" |
| `FLW_GEM_SHORT[0]` | already written as "Bonus if sole Collector with one" |
| How-to Step 2/3 (`index.html:8498,8503`) | "rivals" → "rival Collectors"; "every survivor reveals" → "every Collector still in reveals" |
| Reveal label (`flw.js:1000`) | "Final Showpieces" — unchanged, already correct |
| `game-identities.md` § Game 16 Terminology | add a **Collector** row (task 9) |

Australian English throughout, per the Sylly Tone rule.

---

## 9. Task 7 — Art contract

### 9.1 What changes for the artist

| | Before | After |
|---|--------|-------|
| Aspect | Portrait card (rendered `4.5rem × 6.5rem`) | **Square** |
| Master size | — | **512 × 512** JPEG |
| Per-file ceiling | — | **60 KB** |
| Text in the image | Carat number + gem name baked in | **None** — CSS draws both |
| Border in the image | Gold card border baked in | **None** — CSS draws it |
| Content | A card | The gem itself, centred, on a plain or softly-graded ground |

**All ten faces plus the back must be regenerated.** The existing files are portrait and carry
text, so none survives the change.

### 9.2 Why 512 px and 60 KB

`logic-engine.md` § PWA Guardian requires the ceiling be set against the **render** size, and
warns against inheriting another game's number. FLW's largest consumer is not a card on the
table — it is the **art viewer**, which fills the width of a phone (~340 CSS px, ~1020 device px
at 3× DPR). The on-table sizes are far smaller (`lg` = 88 CSS px).

512 px serves the viewer at a reasonable quality while staying 5.8× the largest in-table render.
At 60 KB × 11 files the FLW art set is **~660 KB**, in line with PKO's 682 KB — a precache
budget already accepted as installable on mobile data.

### 9.3 Files to touch

| File | Change |
|------|--------|
| `data/art/flw/img/{0..9}.jpg`, `back.jpg` | Regenerated square (owner authors; `tools/convert-core-art.ps1` converts) |
| `data/art/flw/pack.json` | **No change** — same keys, same filenames |
| `sw.js` `PRECACHE_URLS` | **No change** — same paths (`sw.js:82-93`) |
| `sw.js` `CACHE_NAME` | **v182 → v183** — mandatory; the bytes changed even though the paths didn't |
| `docs/art-authoring-guide.md` | FLW row: square, 512 px, 60 KB, "no text or border baked in" |

The `CACHE_NAME` bump is the entire difference between core art and a skin pack. Without it the
old portrait JPEGs stay served from cache on every installed device.

---

## 10. Tasks 8 & 9 — Documentation

### 10.1 Task 8 — the duplicated gem list

`index.html:8506-8518` (How-to → The Rules, "The Gems" card) hardcodes all ten gem names and
effects — a full duplicate of `FLW_DECK` + `FLW_GEM_EFFECT`, and now a third copy alongside
`FLW_GEM_SHORT`. A rename would fix the art, the placards and the gallery and leave this stale.

**Delete the card.** The Gems tab already carries the same information rendered from the deck,
with artwork, and is one tab away. This is the same reasoning that folded the Gem Manifest into
How to Play in the first place (`flw.js:325-328`).

### 10.2 Task 9 — `game-identities.md` § Game 16

The section (line 1675 onward) documents a **different game**: a pass-and-declare bluffing loop,
gems named Diamond / Ruby / Sapphire / Emerald / Amethyst / Topaz / Obsidian / Opal / Pearl /
Onyx with unrelated effects, and settings `flwLedger` / `flwDiamondsToWin` / `flwSmokeMirrors` /
`flwAppraisalClock`. The shipped game is a Love-Letter-shaped draw-and-place with Pink Diamond /
Blood Ruby / Blue Sapphire / Green Emerald / Yellow Topaz / Imperial Jade / Black Opal / Purple
Amethyst / Clear Quartz / Raw Obsidian and `flwLedgerMode` / `flwTokenMode` / `flwCustomTarget` /
`flwBurnSetting` / `flwTurnTimer`. It is a spec-era document that was never updated after the
build pivoted.

This matters here specifically: it is the reference a reskin author would read to rename gems —
the exact workflow tasks 1 and 8 exist to enable.

**Full rewrite** of Terminology, the gem table, Settings, State flow and Special Mechanics
against the shipped code. This is the Documentation Integrity Protocol's Enforcement clause
operating as designed.

---

## 11. Verification

### 11.1 New harness — `tools/verify-flw-loopback.js`

FLW has **no harness at all** today. This change adds a synced accumulator (`flwDiscardFeed`)
and moves render code that executes inside SYNC appliers — precisely CJAR BUG-06's shape, where
a client threw inside a render one line before `showScreen` and froze for a whole match while
the host played on.

Build it on `tools/verify-cjar-loopback.js`, which is the only harness in the suite with the two
properties that matter here:

- **A real wire** — `fbWrite`/`fbRead` that strips empty values the way Firebase does, so
  `discardFeed: []` is actually erased in transit and the `|| []` rebuild is genuinely tested.
- **A render-executing mock DOM** — the three `'single'`-mode harnesses use
  `getElementById: () => null`, which short-circuits every `if (!el) return` guard so **no render
  code runs at all**. A throw in `flwRenderDiscardStrip` would be invisible to them.

It should accept `FLW_SRC=` so a deliberately-broken copy proves the test fails before the fix
makes it pass.

Scenarios: deal → discard feed empty on both devices; several plays → feed order identical
host/client; Showing end → reveal present for both `vaultlock` and `laststanding`; new Showing →
feed reset on the client (the erasure case); settings sync of all three `flwLedgerMode` values.

### 11.2 `visual-check`

No harness reaches layout — a mock element has no box. Required passes:

1. **Hand row** at 360px and 390px viewports — placard/card/card/placard fits without horizontal
   overflow; placard copy wraps to no more than three lines; the longest string
   (`Bonus if sole Collector with one`) is the test case. This is what confirms or corrects §6.2.
2. **Ledger two-column + strip + hand row** on one Stack — measure total height, confirm the
   Stack still reads as one unit and the primary CTA is reachable.
3. **Gallery rows** — artwork, name and description aligned; no clipped frames at `sm`.
4. **Art viewer** — the raw square image, and the card it opened from, side by side.

### 11.3 Not covered by any of the above

Multi-device feel, clock skew, Firebase ordering, dropped packets. A real session is still
required before this is called done.

---

## 12. Risks

| Risk | Mitigation |
|------|-----------|
| **`index.html` encoding corruption** | This spec touches `index.html` at ≥4 sites (hand row container, counterfeit row, ledger setting pills, how-to gem card deletion, Collectors copy). Multi-site `index.html` edits must go through a **Node.js script**, never the Edit tool — the documented mojibake hazard |
| Placard copy doesn't fit at 360px | §11.2 pass 1 gates task 4; fallback is dropping the name line on the placard (the card's placard carries the carat, and hold-to-gallery gives the name) |
| Art regeneration blocks the build | Tasks 1–6 ship against the **existing** art. It will look wrong (baked text under a CSS placard) but nothing breaks — the seam works identically with both. Task 7 is the last task, gated on the owner's new artwork |
| PKO regression from the `touchmove` cancel | It is a fix, not a regression — a scroll starting on a card currently opens PKO's gallery. Confirm by hand on the PKO table |
| `flwLedgerMode` half-migrated | Both `engine-multiplayer.js` sites are listed explicitly in §7.2; the loopback harness asserts all three values round-trip |

---

## 13. Sequencing

```
1 (seam) ──┬── 2 (reveal)        ← both consume flwRenderCard
           ├── 3 (bindCardHold)  ← independent of 1, but binds to cards from 1
           ├── 4 (placards)
           └── 5 (ledger + strip)
                    │
6 (Collectors copy) ┤   ← touches strings introduced by 4 and 5
8 (delete gem card) ┤
                    ↓
              11.1 harness + 11.2 visual-check
                    ↓
9 (game-identities) + 7 (art contract, gated on new artwork)
```

Tasks 2–5 are independent of each other once 1 lands. Task 7 is last because it is the only one
that needs the owner to produce something.

---

## 14. Documentation closure

Per the Documentation Integrity Protocol, before any snapshot:

1. `docs/code-map.md` — `#flw-counterfeit-row`, `#flw-discard-strip`, `flwDiscard`,
   `flwDiscardFeed`, `flwLedgerMode`, `flwBuildReveal`, `bindCardHold`, `refHighlightRow`
2. `docs/rules/game-identities.md` — § Game 16 full rewrite (task 9)
3. `CLAUDE.md` — SW v183, Current Focus
4. `.claude/rules/logic-engine.md` — `bindCardHold` / `refHighlightRow` in § Shared Library
   Modules; `.claude/rules/ui-style.md` — § Tap-Hold Reference points at the shared helper
5. `docs/implementation-notes/flw-implementation-notes.md` — the baked-text root cause, the
   placard contrast decision, the `flwDiscard` choke point;
   `shared-implementation-notes.md` — the `bindCardHold` extraction
6. `docs/decision-log.md` — one line: art carries no text or chrome; square masters; FLW's
   § Game 16 drift found and corrected
7. `docs/deferred-work.md` — close the FLW entries this round covers
