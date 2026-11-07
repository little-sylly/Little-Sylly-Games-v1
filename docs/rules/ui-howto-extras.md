# UI reference — How-to extras

> On-demand (not auto-loaded). Art viewer, How-to tab bar, Tap-Hold, Practice tab. The core How-to Overlay Standard stays in `ui-style.md`. Moved verbatim on 4 Nov 2026; each source file keeps a stub with the headline rule.

---

### Pattern 2a — Art Viewer (engine-owned, global)

**Not a third pattern.** It is Pattern 2's geometry (`overlay-modal-backdrop`, centred, one
interactive element) with an image where the card would be. Documented separately only because it
is the one overlay that is **deliberately unbranded** — it belongs to `engine.js` and is opened
from six games' galleries, so any one game's colour would be wrong five times out of six.

**Never build a per-game copy of this.** `#art-viewer-overlay` is the only one.

```js
openArtViewer(src, caption)   // no-ops when src is falsy — see below
closeArtViewer()
artMakeZoomable(el, src, caption)   // returns el, for use inline
```

- **`src` is a resolved URL from `assetFace`/`assetBack`/`assetExtra`** (`js/lib/art.js`). A game
  still on its emoji/CSS fallback resolves to `null`, and both functions no-op — so a tile with no
  artwork behind it gets **neither the zoom cursor nor a handler**. The affordance and the artwork
  appear together or not at all. That is also what keeps the offline install check honest: if the
  art didn't precache, the gallery visibly stops offering to enlarge it.
- **Resolve the URL at the call site, not inside the render seam.** The seam returns an element;
  the gallery needs the URL separately to decide whether the tile is zoomable at all.
- Closes on the ✕ and on the **backdrop only** (`e.target === backdrop`) — a tap landing on the
  image or caption must not dismiss, or a pinch/pan loses the picture mid-gesture.
- Backdrop is `bg-black/80`, darker than the standard `bg-black/40`: the point is to take the lit
  surface away from the UI and give it to the artwork.
- Teardown is already in `resetToLobby()` via `closeArtViewer()` — a new game needs nothing.

---

### Optional tab bar — N tabs

A game with **reference content that is itself part of learning the game** — every card in the
deck, a chain diagram, a role roster — may add a tab bar rather than pushing that content into a
second overlay. No cap at two: PKO runs three (Rules | Diagram | Animals). Sits directly under the
sticky title block, sticky with it, never scrolling:

```html
<div class="px-5 pt-3 pb-3 border-b border-stone-200 flex-shrink-0 flex gap-2">
  <button class="pill pill-active-[colour]" data-[abbr]-howto-tab="rules">The Rules</button>
  <button class="pill" data-[abbr]-howto-tab="cards">The Cards</button>
  <!-- a third (or Nth) tab is the same button + body pair, no structural change -->
</div>
```

**Rollout:** seven games carry one — CJAR, PKO, FRT, SHP, FLW, DYB, CLD. **PASS** is deliberately open (54 faces make a tile grid a poster, not a reference — `docs/deferred-work.md`). CLD's is **The Rules | Practice | The Cast**; DYB's gallery shows its five Tempest forms. **Procedural galleries (CLD, DYB) are not `artMakeZoomable` and are not an install check** — nothing precached backs them. DYB and CLD also carry a **Practice** tab (below).

**A gallery tab must render through the game's own render seam** (`[abbr]RenderCard`, `dybDieHTML`),
never hand-built markup. Two load-bearing consequences: the gallery can never drift from the live
deck, and it is **skinnable**, which is what makes it double as the offline install check
(`docs/art-authoring-guide.md` § 7). Hand-built markup silently locks skins out of the gallery.

**Every gallery tile is tappable-to-enlarge** via `artMakeZoomable` — see § Pattern 2a above.

**Rules:**
- The **first tab is always the Step cards** — the canonical How-to structure above is unchanged
  and still mandatory. A tab bar adds sibling bodies; it never reorders or removes the Steps.
- Each tab body is its **own** `overflow-y-auto` region with its **own** close button, so each
  scrolls independently and "Got it" is always reachable from the bottom of what you are reading.
- Bodies are **siblings toggled by display**, not one body repainted — flicking across and back
  must not lose another tab's scroll position.
- Tab buttons use the standard `.pill` / `pill-active-[colour]` classes and the same toggle rule
  (never remove `.pill`).
- **Reference content that is part of learning the game belongs in the tab bar — including a
  mid-play reference a player returns to later.** A tab is not disqualified for *also* being useful
  mid-round (PKO's Diagram/Animals tabs open from How to Play *and* from the table's `[?] The Chain`
  and a tap-held card — same overlay, pre-selected via `pkoOpenHowTo(tab, highlightId)`). Excluded
  is content that is **not** teaching material at all — Settings, a match/score log, or any *live*
  running state a static tab can't represent. Not a licence to fold those into How to Play.

**Why:** a separate reference overlay is one overlay further away than the thing it explains, plus
a z-index entry and a `resetToLobby()` teardown entry — and the real cost is duplicating content
across two overlays instead of giving one overlay more entry points. Knowing what cards exist *is*
learning the game. Full rationale: `docs/decision-log.md` 2026-08-03.

---

### Tap-Hold Reference (default for a card's long-press, added 12 Aug 2026 — SHP, generalising PKO)

**When a game has a How-to gallery tab (above), tap-and-hold on any real card — in a hand, on the
table, in a locked-slot placeholder — jumps to that card's row in the gallery: the tab opens (or
switches) to The Cards, scrolls it into view, and rings it briefly.** This is the *default*
long-press behaviour for any card with real artwork. Build a standalone inspect popup only if the
game has a specific reason a shared gallery entry can't serve (none has needed one yet).

**Why the default, not a per-game choice:** a standalone popup is a second place a card's rules text
can drift from the gallery's, a second z-index entry and a second `resetToLobby()` teardown entry —
for information the gallery already holds. Detail: `shp-implementation-notes.md`.

**Shape — the touch/mouse mechanics and the scroll-and-ring are shared `engine.js` globals, not a
per-game copy.** `bindCardHold(el, onHold, ms=500)` and `refHighlightRow(box, attr, id, pingClass,
ms=1600)` — see `logic-engine.md` § Shared Library Modules. A game's own bind function is a
one-line wrapper:
```js
function [abbr]BindCardHold(el, cardId) { bindCardHold(el, () => [abbr]OpenHowTo('[gallery-tab]', cardId)); }
```
`shpBindCardHold`, `pkoBindChainHold` and `flwBindCardHold` are the three reference call sites.
`[gallery-tab]` is whatever this game already calls its card-gallery tab (`'cards'` for SHP/FLW,
`'animals'` for PKO — not a new naming convention). `[abbr]OpenHowTo(tab, highlightId)` forces that
tab whenever `highlightId` is set (skip the "open to Rules" default), and the gallery's render
function tags each row/tile with `data-[abbr]-card-id` (FLW: `data-flw-gem-id`) and calls
`refHighlightRow(box, 'data-[abbr]-card-id', highlightId, '[abbr]-ref-row-ping')` when a
`highlightId` is passed. The ring class is a `box-shadow` transition, never `animation`
(reduced-motion already zeroes transition durations globally — see § Motion Standard — so this
needs no separate guard).

**A placeholder with no card id of its own points at the real card that explains it.** SHP's
Big Bad Wolf hand-slot (a locked-slot indicator, not the Wolf card itself — see § Pattern 2a's
sibling rule for `assetFace`) has no `cardId`; its hold targets card **12** (The Big Bad Wolf),
whose gallery row is what actually explains the locked slot. Generalise this whenever a game has
a non-card placeholder standing in for a mechanic that a real card's row already documents —
point the hold at that card's id rather than inventing a third explanation surface.

**Exception — don't apply this where tap-hold already does something else.** PASS's 54-face grid
(the documented exception to the gallery tab itself) and any game where a long-press is bound to a
drag-start, a multi-select, or another mechanic keeps its own behaviour; this default only fills
the gap when tap-hold is otherwise idle.

---

### Practice tab — the suite's tutorial standard (SW v241, DYB is the reference)

A How to Play overlay may carry a **Practice** tab: a hand the player plays with the real controls
before a real game. It is the named pattern for every game's future tutorial rework
(`docs/practice-rollout.md` tracks the retrofit — priority, effort and a definition of done per game).

- **Pick the form that fits the game** (owner, 28 Sep 2026):
  - **Scripted hand** (the default; DYB) — deterministic, 60–90 s, fixed hands so every coach line is
    true, **both branches** at the key decision.
  - **Arena** (CLD) — a sandbox for games whose skill is *feel*, not rules: the other players' moves
    are fixed (CLD: each target's aim and strength), the player's are free, and the player practises
    counters against moves they know are coming. The coach sets up the drill; it does not script the result. Reference: CLD (SW v244) — three drills, the rivals' shoves drawn before you move. A game whose rules read module globals may run them through a **swap** (`cldArenaRun`) rather than threading state, provided a harness classifies every top-level `let` and proves the live state untouched.
  - **Lessons** — a game too big for 90 s (COMB, LTTP) gets a **lesson picker**, one short lesson per
    key action a player takes. The fallback, if a lesson can't be interactive, is a step-through slideshow.
  - **Autopilot** — for typed input (LI5, GM, SS, JEC, NAT, YGI): the answers type themselves and the
    other players' responses are scripted (LI5: the call-out when a No-No word is said), or the game uses
    lesson cards instead. Decided per game.
- **Role games:** "You" take the role with the most to learn; other roles get a short explanation.
- Built from the game's **real renderers fed a model** (`dybRenderTable` / `dybPlayThrow` /
  `dybPlayReveal`), never a hand-built imitation. Build a new game's renderers model-fed from day one.
- **Beats gated on the player doing the thing**, with a coach caption, a step counter ("3 / 7") and a
  soft ring (a `box-shadow` transition) on the control being taught. A new coach line scrolls back into view.
- Ends with **Practice again** / **Got it**.
- **The Practice cast:** scripted players are drawn, in order, from **Sylvia, Sam, Shirley, Jeff**;
  the player is always "You".
- **No multiplayer** (never `mpSendEnvelope`, never live match state); its timers live in their own
  bag, stopped on tab-away, on close and in `resetToLobby()`; reduced motion checked **in JS**.
- Tab order: **Rules | Practice | gallery** — or just **Rules | Practice** for a game with no gallery.
  Don't invent a gallery to fill the slot.
