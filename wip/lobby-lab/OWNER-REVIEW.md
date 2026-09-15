# Shelves Lobby — Owner Playtest Checklist

**15 Sep 2026, answered same day.** The sandbox is built and screenshot-verified. Every item
below is now decided — answers are inline under each, and items 1–3 (taxonomy rename, live
reshuffle, sticker badges) are already shipped in the sandbox. Item 4 (sheet-before-menu) and
item 6 (Premium/TV slots) keep current behaviour. Item 5 (controller/profile) is a leaning, not
a firm call, flagged for the future spec. Item 7 (Bailed) is a standing flag, already tracked
elsewhere.

**To run it:** serve the repo root and open
`http://localhost:8791/wip/lobby-lab/index.html` on your phone (or a 390 px window).

```
npx http-server -p 8791 "D:\Coding Projects\Little-Sylly-Games"
```

Try it as a player would first — pick a game for "4 of us, one phone" — before reading the list.

---

## Decisions waiting on you

### 1. The six-shelf taxonomy — especially "Guess + Draw" and "Board" ✅ DECIDED
**Look at:** the main page, then `#folder=guess-draw`.
- *Guess + Draw* is the only shelf label that wraps to two lines at 390. "Guess" alone fixes
  it — and YGI is arguably a judging game, not a guessing one. Rename, move YGI, or live with
  the wrap? Your taxonomy call.
- **Board** 🗺️ is a new sixth shelf invented for Cold Shoulder + Honeycomb Hills (the only two
  persistent shared arenas). Real category or forced pair?

**Answer:** Rename to **"Guess"** — drawing (GTH) still fits under it; a separate Draw shelf can
come back if more drawing games join the box. YGI stays put, no move. Rename the sixth shelf to
**"Strategy"** (both CLD and COMB genuinely reward it, "Board" only names the object they're
played on) — real category, not a forced pair. Shipped: `LB_SHELVES` in `lobby.js`, ♟️ emoji,
`shelves: ['board']` now set directly on cld/comb in `games.js` (was a hardcoded id list).

### 2. Who's here? on the front page ✅ DECIDED
**Look at:** `#count=4` and `#onephone`.
- Excluded games dim and say why ("needs 3+", "needs a phone each") instead of vanishing.
- Is the headcount stepper + One-phone toggle the right first control, or too much furniture
  before the shelves?

**Answer:** Count/phone filters are good as-is. Also do a **live reshuffle** — bump excluded
games to the end of the list and float the fitting ones to the front, not just dim them in
place. Shipped: `lbSortByFit()` in `lobby.js`, applied to both the shelf-row mini stacks and the
folder grid; the existing 30 ms stagger rise (`.lb-grid.is-fresh`) already sells the reshuffle on
every re-render, no new animation needed.

### 3. The emoji-in-a-disc tile face ✅ DECIDED
**Look at:** any shelf row and `#folder=talk`.
- Decided knowingly: white domed badge disc anchors every tile until real art (the reserved
  `img.lb-art` slot) replaces the face. Does the placeholder read as finished to you?

**Answer:** Placeholder reads fine, keep it — full art (the `img.lb-art` slot) is further down
the road. Cheap win taken now: for the 19 games with a controller sticker
(`data/stickers/<id>.png` — Bailed is the one still waiting on its own badge), the sticker sits
inside the disc over the emoji instead of the bare emoji alone; the emoji stays as the fallback
if the image is ever missing. Shipped: `lbBadge(g)`/`lbBadgeInner(g)` in `lobby.js`,
`.lb-badge-art` in `lobby.css`. This is separate from the `img.lb-art` full-face slot, which is
still reserved for the later real-art upgrade.

**Round-2 follow-up (same day):** two things were wrong with the first pass, both fixed.

1. The stickers are irregular die-cut crops (checked all 19: heights 350–512 px against a fixed
   512 px axis, none square), so `object-fit: cover` chopped them. Changed to an inset (14%) +
   `object-fit: contain` box — the whole sticker shows now, nothing cropped.
2. Emoji and sticker were showing at once. Root cause: the `<img>` sat over the emoji with
   `onerror` removing itself, but nothing hid the emoji while the image WAS loading fine —
   transparent corners on the PNG let the emoji bleed through underneath. Fixed by hiding the
   emoji by default whenever a sticker exists, and only unhiding it from the image's own
   `onerror`.
Also applied to the **Original layout** as a trial (see item 5's sibling note below) — real
`.lobby-btn-badge` class, reused as-is, nothing new added to the shipped `css/styles.css`.
Surfaced and fixed a real (pre-existing, not something this round introduced) CSS bug while
doing that: `.lb-phone :where(button)` and `.lobby-btn` tie in specificity (the `.lb-phone`
outside `:where()` still counts), and lobby.css loading after styles.css let the reset silently
win that tie and zero `.lobby-btn`'s padding — the badge sat on top of the label text with
nothing visibly wrong in this file. Fixed by moving the WHOLE selector inside `:where()`
(`:where(.lb-phone button)`), which always loses ties regardless of load order.

**Round-3 follow-up (same day): the trial missed one of the two "Original" renderers.** There
are two independent places building this badge markup: `lobby.js`'s own `lbRenderOriginal()`
(inside the Shelves switcher's "Original" tab — fixed in round 2) and a second, separate copy
hand-rolled directly in `index.html` for **Pane 1** ("Today — Original (fallback layout)"),
which the lab-note explicitly calls a real layout option, not just a reference. That second copy
had its own `${g.emoji}` literal and never got the sticker fix. Both now call the same
`lbBadgeInner(g)` — one function, no drift between the two, which is the whole reason Pane 1's
generator was rewritten in the first place ("generated from `games.js` rather than hand-copied").
Confirmed clean with Playwright: 19 sticker images load in Pane 1, no overflow, no console
errors.

### 4. Sheet-before-menu costs repeat players a tap ✅ DECIDED
**Look at:** `#sheet=cld`.
- Every tile opens the info sheet first; the menu is behind its CTA. Proposed cheap fix: a
  local "played before" memory that skips the sheet for known games. Want it? (It leans on the
  profile seam below, so it's a yes/no now, build later.)

**Answer:** Keep sheet-before-menu for Shelves — this layout is for browsing/deciding, the
Original layout already goes straight into a game's menu for players who know what they want.
No sandbox change needed. Noted for the future build spec (not this round): layouts get a
**"last used"** memory — everyone starts on Shelves; switching to Original (or Premium/TV once
real) updates that memory going forward, so it's per-player, not a one-time global default.

### 5. Controller = avatar, not profile door (pushback on brief § 5)
**Look at:** the controller beside the wordmark, captioned YOU.
- Design-notes § 2 argues: tap controller → Workshop (as today); the **Profile** surface lives
  behind 🏆 or a long-press, with the controller rendered live *on* it as the hero. One object,
  two entry points. Agree, or do you want the controller itself to open Profile?

**Answer:** Agreed on the split (controller → Workshop, unchanged), with a correction: the
Profile door is **not** 🏆 — it's a clickable **"You"** popup anchored under the controller,
its own button next to (not part of) the controller's. Shipped: `lobby.js`
(`lbRenderProfilePop`/`lbWireProfilePop`/`lbGetNickname`/`lbSetNickname`), `.lb-you-pop` in
`lobby.css`. Contents for now: an editable **name** field, backed by `sylly_nickname` —
the real app's own localStorage key (`logic-engine.md` § localStorage Exception) — so it's
not just copy that says "carries into every lobby", it actually would; and three **placeholder
stats** (matches played, games tried of 20, favourite shelf) shown "for show", clearly labelled
as placeholder pending `profile.js`. Open question still standing: whether **Controller
Workshop and Player Profile should eventually be the same screen** rather than two — naming
your controller doubling as your profile, room for stats/favourite games/friends later.
Leaning toward combining; not built here (no full Profile screen exists yet, this is a
popover, not that screen) — flagged for the DESIGN-NOTES.md § 3 blueprint before that spec is
written.

Two bugs found and fixed while wiring the popover up (both general lessons, not one-offs):
- **A later stylesheet can silently outrank an earlier one at tied specificity.** `.lb-body`'s
  own entry-rise animation (it animates `opacity`/`transform`) makes it create a CSS stacking
  context regardless of its `position: static`, and because it comes after `.lb-brand` in the
  DOM, it was painting on top of the popover wherever the two overlapped, even though the
  popover is `position: absolute`. A `z-index:auto` popover can lose to a *later, non-positioned
  sibling* if that sibling happens to trigger its own stacking context — animating
  opacity/transform is one common, easy-to-miss trigger. Fixed with an explicit `z-index: 4` on
  `.lb-you-pop`, which always wins regardless of DOM order.
- **Editable inputs must not save on every keystroke** when the whole subtree re-renders via
  `innerHTML` on state change (as this sandbox always does) — an `input`-event save would
  trigger a re-render mid-keystroke and drop focus/cursor. Saves on `change`/`blur` only.

**Round-3 clarifications (same day):**
- **Controller and "You" were already two separate elements code-wise before this round too** —
  worded confusingly in the round-2 summary as "split... in two", which read as if they'd been
  one clickable thing. They weren't: even the very first pass wrapped both in a single `<button>`
  (so one click handler covered both), which is the "split" that happened — into two real,
  independently-clickable buttons. Visually/behaviourally nothing about the controller's own
  role changed. The controller tap logs `→ Workshop (ctlOpenWorkshop)` to the console rather
  than navigating anywhere, because there's no Workshop screen in this static sandbox to
  navigate to — that's the intended real-app behaviour being stood in for, not a live link here.
- **The "You" button now shows the saved name once one is set**, swapping live the moment the
  name field is blurred — no need to close and reopen the popover to see it, and the popover
  stays open while it happens (`#lb-you-label-text` is patched directly, not through a full
  re-render, so the input never loses focus). Confirmed: reload the page and the name is still
  there (reads `sylly_nickname` fresh). Long names truncate with an ellipsis rather than
  stretching the 104 px column.

### 6. Premium and TV switcher slots ✅ DECIDED
**Look at:** the four-slot switcher (top).
- Original and Shelves are real; Premium ✨ and TV 🖥️ are honest placeholders. Keep the slots
  visible now, or hide them until they exist?

**Answer:** Keep both slots visible — no sandbox change needed, already the current behaviour.
Priority order for building them out: **TV mode first** (owner wants to get to it soon), Premium
later, in parallel with further game development.

### 7. Bailed — needs a review soon
Not a sheet/tile decision, just a flag: Bailed (`bld`) is due for a proper pass soon (owner's
words: "will definitely need a review soon") — covers at least its missing sticker badge and the
"pass the phone" how-to copy noted below. The sticker gap is already tracked in
`docs/deferred-work.md`; no new doc entry added here, just recorded as confirmed owner intent.

## Data notes (no decision, just so you've seen them)
- **Bailed's own how-to says "pass the phone" but it's multi-device only.** That's the game's
  copy, not the lobby's — worth a Tier-0 copy fix in BLD's overlay someday. See item 7 above.
- The ⏱️ length chip is simply absent for the 13 games whose length was never stated. Nothing
  was invented.

## Already verified — don't re-test unless it looks wrong
Every hash state at 390 and 430, reduced motion, no horizontal overflow, no target under
44 px, zero console errors, Fredoka loaded. Hash states: `#folder=talk` `#sheet=cld` `#unlock`
`#count=4` `#onephone` `#view=original`.
