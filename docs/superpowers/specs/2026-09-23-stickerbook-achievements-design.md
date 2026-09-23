# Stickerbook achievements — prototype design

**Status:** approved in-session 23 Sep 2026 (owner) · **Sandbox only** (`wip/`) · no SW bump ·
companion to prop round 5 (the binder) in `docs/superpowers/plans/2026-09-22-premium-prop-quality.md`.

## 1. Intent

The owner wants the lounge's binder to *be* the stickerbook: a place where stickers earned by
playing collect, get peeled out of a tray and placed on a page. This round is a **prototype** —
"we can refine it later when it's all hooked up". Success = the loop can be walked end to end in
`wip/lobby-lab/shell.html`: press Play on a game → its sticker lands in the tray → tap the binder →
it flips open, the camera pushes in, the book opens → peel the sticker onto its sleeve → the 3D
binder shows it placed next time it opens.

**Said by the owner:** production stickers fill the book; achievements are simple ("play game X
times"); binder door = flip, push in, 2D book; one sticker per game, tiered; count game picks plus a
dev panel; persist under a sandbox-only key.
**Assumed (correct me):** tiers are 1 / 5 / 10 plays; "a play" is a press of a Play CTA (a dial spin
lands on the TV, whose Play then counts — so the dial path counts once, not twice); fixed slots.

## 2. The rules — `wip/lobby-lab/achievements.js`

Pure and total — no DOM, no storage, no timers, no `Date.now`, no `Math.random` — the
`shell-router.js` contract, so `verify-achievements.js` drives it under Node.

- `achDefine(stickers, tiers = [1, 5, 10])` → the book: one **entry per sticker** in manifest order
  (`{ id, label, image, slot, tiers }`), `slot` = its fixed sleeve index. 19 production stickers →
  19 slots on 4-slot pages → 5 pages, shown as 3 spreads (page 5 carries one sticker and three empty sleeves; the last spread's right page is blank).
- State: `{ v: 1, plays: { [id]: n }, placed: { [id]: true } }`. Earned-ness is **derived** from
  `plays`, never stored, so it cannot disagree with the count.
- `achReduce(book, state, action)`:
  - `play { id }` — +1 play. An id not in the book is ignored (Bailed has no sticker yet).
  - `devAdd { id, n }` — +n plays (the dev panel). Clamped ≥ 0.
  - `place { id }` — marks placed; **refused** unless the sticker is earned and not yet placed.
  - `reset` — back to empty.
- Selectors: `achStatus(book, state, id)` → `'locked' | 'tray' | 'placed'`; `achTiers(...)` →
  `[{ need, done }]`; `achComplete(...)` (all tiers done → the 🏆 "100% Complete" tag);
  `achTray(book, state)` (earned, unplaced, manifest order); `achProgress(book, state)` →
  `{ done, total }` over all 57 tier achievements; `achNewTiers(book, before, after)` → the tiers a
  transition just completed (drives the toast); `achHint(book, state, id)` → the locked/next-tier
  line ("Play Cookie Jar once to unlock", "3 more plays for the next star").
- `achRevive(raw)` — tolerant load: anything malformed becomes the empty state, unknown ids are
  dropped. Storage itself is the page's job.

## 3. The view — `wip/lobby-lab/stickerbook.js` + `stickerbook.css`

A DOM overlay over the stopped room (Workshop precedent), drawn as the mockup's flat spread:
quilted butter-yellow frame, **tray** on the inside-left cover, **two pages of 2×2 clear sleeves**,
page arrows + "Pages N & N+1", a progress bar ("Progress: 12 / 57").
Phone width (< 720 px): tray becomes a strip above **one** page.

- **Sleeve states:** *placed* — full sticker + label, 🏆 tag when complete, tap → tier card
  (three stars with progress); *earned, in tray* — empty sleeve with a faint dashed outline of its
  sticker, "Ready to place"; *locked* — greyed, low-opacity ghost + label, tap → hint bubble.
  Empty (no sticker) — clear sleeve.
- **Peel to place:** drag a tray sticker; its own sleeve glows; drop on it → placed with a peel +
  settle (transform/opacity only); dropped anywhere else → springs back. **Tap** a tray sticker →
  the book turns to its page and it flies in (the accessible path; drag is never required).
- **Toast** when a play completes a tier ("New sticker! Cookie Jar" / "★★ Cookie Jar").
- **Dev panel** (collapsed, bottom): a game select, +1 / +5 plays, Reset all.
- Motion: transform/opacity only; reduced motion checked in JS — placing still happens, nothing
  travels. Closing: ✕ and backdrop-less (it is a full view) → back to the lounge.

## 4. The shell wiring

- **Door** (`wip/premium/prm-props.js`): `binder: { callback: 'openStickerbook', optional: true,
  open: 'open', pushIn: 'binder', fallback: 'openCover' }`. `prm-scene.js`'s `openPhone` becomes
  `openProp(id, done, sound)`; an optional door whose host supplies the callback and whose action
  has `open` runs flip → push-in → callback. A host without `openStickerbook` keeps the cover flip.
- **Router** (`shell-router.js`): `stickerbook: false`; `openStickerbook` (a door) → true, room kept
  (stopped); `stickerbookClose` (page action) → false, back to the lounge (Shelves if the lounge is
  closed to this device, mirroring `workshopClose`).
- **Host** (`shell-host.js`): supplies `openStickerbook` → dispatch. `SHELL_DOORS` gains it.
- **Plays:** `lobby.js` and `lounge.js` Play CTAs dispatch `window` `CustomEvent('sylly:play',
  { detail: { gameId } })` beside their existing console line; `shell.html` listens → `play`.
- **3D reflects the collection:** the binder api gains `setCollection({ tray: [ids], placed: [ids] })`
  (show/hide the sticker meshes already built); the shell calls it on mount and on every change.
- **Storage:** `localStorage['lsg_sandbox_achievements']`, try/catch both ways, revived with
  `achRevive`. **Production storage is an open owner decision** — the project permits only named
  localStorage keys (CLAUDE.md § Anti-Patterns); recorded in `docs/deferred-work.md`, not decided.

## 5. Out of scope

Gating the Workshop's controller stickers on achievements (production `js/controller.js`); a
Bailed sticker (badge pending); any non-play achievement; any production wiring.

## 6. Verification

- `wip/lobby-lab/verify-achievements.js` — definition shape, every reducer branch incl. refusals,
  derived-earned, tier boundaries (0/1/4/5/9/10/11), tray order, progress totals, `achNewTiers`,
  `achRevive` on junk, purity (no DOM/storage touched).
- `verify-prm-props.js` — binder: named parts, `open`/`reset`/`focusPose`/`setCollection`, action shape.
- `verify-shell.js` — the two new transitions + door map.
- `visual-shell.js` — binder door → book visible → a tray sticker placed → ✕ → room running.
