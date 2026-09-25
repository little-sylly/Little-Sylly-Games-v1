# Stickerbook achievements — implementation plan

> **For agentic workers:** executed inline (superpowers:executing-plans) — owner approved "plan then
> build" in-session, 23 Sep 2026. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** the binder becomes the stickerbook: plays earn tiered stickers, the binder's door flips it
open and pushes in to a flat book where earned stickers are peeled from a tray onto their sleeves.

**Architecture:** a pure rules module (`achievements.js`, the `shell-router.js` contract) owns every
fact; a DOM view (`stickerbook.js`) renders them and reports intents; `shell.html` owns storage,
the play hook and the room. The binder door reuses the phone's open → push-in path, generalised.

**Tech Stack:** vanilla JS globals, Node harnesses, Playwright (visual tier). Sandbox only.

**Spec:** `docs/superpowers/specs/2026-09-23-stickerbook-achievements-design.md`

## Global Constraints

- Nothing under `js/`, `src/screens/`, `index.html` or `sw.js`. No SW bump. No image assets.
- `achievements.js` pure and total: no DOM, storage, timers, `Date.now`, `Math.random`.
- Tiers `[1, 5, 10]`; one entry per manifest sticker, fixed slot = manifest order; 4 slots a page.
- Storage key `lsg_sandbox_achievements`, every read/write in try/catch.
- Motion: transform/opacity only; reduced motion checked in JS; nothing travels under it.
- Australian English in copy. Action buttons carry no emoji.

## Review Focus

1. **Stored junk / a newer schema** — a hand-edited or future-version blob must load as empty, never throw (`achRevive`; Task 1).
2. **Double place / place while locked** — a fast double tap or a drop on the wrong sleeve must not mark anything twice or place a locked sticker (reducer refusals; Task 1, view guard; Task 4).
3. **Play for a game with no sticker (Bailed)** — ignored, no entry created, no toast (Task 1).
4. **Binder tapped mid-transition / room reset mid-flip** — the door must not fire late into a lounge already walked back into (abandoned promise; Task 2).
5. **Closing the book returns a shut binder and a running room** — never the pushed-in camera or a lit fade pane (Task 5 + visual check Task 6).

---

### Task 1: The rules — `wip/lobby-lab/achievements.js`

**Files:** Create `wip/lobby-lab/achievements.js`, `wip/lobby-lab/verify-achievements.js`.

**Produces (window.Achievements / module.exports):**
- `ACH_TIERS = [1, 5, 10]`, `ACH_PER_PAGE = 4`, `ACH_EMPTY = { v: 1, plays: {}, placed: {} }`
- `achDefine(stickers, tiers?) → { entries: [{ id, label, image, slot, tiers }], byId, pages }`
- `achReduce(book, state, action) → state` — `play {id}`, `devAdd {id, n}`, `place {id}`, `reset`; unknown/refused → same reference
- `achPlays(state, id)`, `achStatus(book, state, id) → 'locked'|'tray'|'placed'|null`, `achTiers(book, state, id) → [{ need, done }]`,
  `achComplete(book, state, id)`, `achTray(book, state) → ids`, `achProgress(book, state) → { done, total }`,
  `achNewTiers(book, before, after) → [{ id, tier, need }]`, `achHint(book, state, id) → string`, `achRevive(raw, book) → state`

- [ ] Write `verify-achievements.js` first: define shape (19 → 5 pages, slots 0..18), every reducer branch
  and refusal, purity (input not mutated; forbidden globals throw), tier boundaries 0/1/4/5/9/10/11,
  tray order, progress 57 total, `achNewTiers` across 0→1 and 4→6 (two tiers), hints ("once",
  "N more plays"), revive on `null`, a string, `{v:2}`, negative plays, unknown ids, non-boolean placed.
- [ ] Run → fails (module missing). Implement. Run → green. Commit.

### Task 2: The binder door — scene + props

**Files:** Modify `wip/premium/prm-props.js` (PRM_ACTIONS.binder), `wip/premium/prm-scene.js`
(`openPhone` → `openProp(id, done, sound)`; optional door with `open`), `wip/premium/prm-sfx.js`
(`binderOpen` voice), `wip/premium/verify-prm-props.js`.

**Produces:** `PRM_ACTIONS.binder = { callback: 'openStickerbook', optional: true, open: 'open', pushIn: 'binder', fallback: 'openCover' }`;
scene api `withProp(id, fn)` (call a prop api, then mark shadows dirty and wake).

- [ ] Harness: action shape; every `open` action names a real api on its prop; `sfx` has `binderOpen`.
- [ ] Scene: an optional door whose host supplies the callback runs flip → push-in → callback; with
  no callback, unchanged fallback. `resetView` already resets the binder (it has `reset`).
- [ ] `verify-prm-props` + `visual-prm` green (phone path unchanged). Commit.

### Task 3: Router + host

**Files:** Modify `wip/lobby-lab/shell-router.js`, `wip/lobby-lab/shell-host.js`, `wip/lobby-lab/verify-shell.js`.

**Produces:** `SHELL_INIT.stickerbook = false`; action `stickerbookOpen` (door; room kept) and page
action `stickerbookClose` (→ premium + running, or shelves + idle when the lounge is closed);
`SHELL_DOORS.openStickerbook = 'stickerbookOpen'`; host supplies `openStickerbook`.

- [ ] Harness first: both transitions, the one-way case, room intent in each, door map accepts
  optional names, openJukebox still dormant. Implement. Green. Commit.

### Task 4: The view — `wip/lobby-lab/stickerbook.js` + `stickerbook.css`

**Files:** Create both.

**Produces:** `Stickerbook.sbMount(root, { book, base, getState, onIntent, reduced }) → { render(state, info), open(), close(), isOpen(), dispose() }`
where `onIntent({ t: 'place'|'devAdd'|'reset'|'close', ... })`; `info.toast` optional.

- [ ] Spread (tray + two pages of 2×2), phone layout < 720 px (tray strip + one page), page arrows,
  progress bar, sleeve states (placed / ready / locked / empty), 🏆 tag, tier card, hint bubble.
- [ ] Peel to place: pointer drag with the target sleeve glowing, drop-on-own-sleeve places, else
  spring back; tap = turn to page + fly in. A second place of the same id is a no-op (guard + reducer).
- [ ] Dev panel; toast. Reduced motion: no fly, no peel. Commit.

### Task 5: Shell wiring

**Files:** Modify `wip/lobby-lab/shell.html`, `wip/lobby-lab/lobby.js`, `wip/lobby-lab/lounge.js`.

- [ ] Load/save achievements state (`achRevive` / try-catch); `sylly:play` listener → `play`, toast from `achNewTiers`.
- [ ] `stickerbook` flag → mount/open the view (room stopped); close intent → `stickerbookClose`
  (room resets: binder shut). Every state change → `api.withProp('binder', a => a.setCollection(...))`.
- [ ] lobby.js + lounge.js Play CTAs dispatch `CustomEvent('sylly:play', { detail: { gameId } })`.
- [ ] Manual smoke in the browser via Playwright. Commit.

### Task 6: Visual tier

**Files:** Modify `wip/lobby-lab/visual-shell.js`.

- [ ] Binder door → book visible, room stopped; a devAdd earns a tray sticker; a tap places it
  (status 'placed', persisted); ✕ → premium, room running, binder shut, fade pane clear.
- [ ] Screenshots: book spread at 1280 and 390. Full verification set green. Commit.

### Task 7: Close the round

- [ ] Plan `2026-09-22-premium-prop-quality.md`: tick round 5, baseline row. `shared-implementation-notes.md`
  DD-24. `docs/code-map.md` sandbox entry. `docs/deferred-work.md`: production storage key + Workshop
  gating decisions. `docs/decision-log.md` one line. CLAUDE.md Current Focus pointer + harness table rows.
