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

---

# TV Mode — Owner Checklist (16 Sep 2026; terminology + T8–T11 settled same day)

**Terms, settled 16 Sep 2026.** The technical term for a TV-eligible device that runs the room
but takes no seat is a **seatless host** — one flag beside the engine's existing host/client
modes, not a new mode. The friendly, player-facing term is **Big Screen**: "Host on the Big
Screen"; the choice at lobby creation reads "I'll play too" vs "Big Screen only". "Host-spectate"
remains fine as design-doc shorthand for the same thing.

**To run it:** same server; Pane 3 of `http://localhost:8791/wip/lobby-lab/index.html`. Try
`#folder=cards&sel=pko`, `#count=4&onephone`, then `#tv=host&roster=ready&sel=pko`,
`roster=full&sel=bld`, `roster=table` for the Big Screen display (no longer reachable by click —
see T1/T8). **For the real, unframed result — read this before judging scale or squishing** —
open `wip/lobby-lab/tv.html` directly (not through index.html) and resize the browser window, or
drive it on an actual wide screen. Rationale: `DESIGN-NOTES.md` § 4.

### T1. Which device is the host? ✅ DECIDED
**Answer:** Both, and the device chooses. A TV-eligible device is first of all an ordinary
device — it can host, join and play with the wide layout and no other difference. It can *also*
become a **seatless host / Big Screen**: it runs the room (room code as today) but takes no seat,
players join on phones, and the game's host-only screens (not yet developed) run on it. The
choice is made **once, at lobby creation** — not repeatedly from the browse pane (see T8) — and
should not be split into a separate "join as spectator only" mode; it is always "hosting, with or
without a seat." Engine note: a host with no seat is new in `engine-multiplayer.js` — a
build-spec item, not a lobby one.

### T2. What should tapping TV on a phone do? ✅ DECIDED
**Answer:** The mockup's card — *"TV mode wants a wider screen. Cast the game or open it on a
tablet… On a phone it stays on the Shelves."* with **Back to the Shelves**. Shipped:
`lbRenderTVHandoff()`, in the shell's own placeholder card style. The same card now also covers
a wide-enough window that shrinks below the eligibility floor (T9) — `tv.html` shows it live.

### T3. Browse games on the TV ✅ DECIDED — built
**Answer:** That *is* TV mode: shelves + game selection + info sheet on one screen (2b), and
from there a seatless Big Screen or an ordinary host/join, as normal. Shipped: `lbRenderTV()` —
rail · field · pane, every piece the phone's own component. It replaces the first pass as the
default of Pane 3 and of `tv.html`.

### T4. Room code: plum, with the brand woven in ✅ DECIDED
**Answer:** Plum is fine; find an elegant, non-distracting way in for the brand if one exists
(highlights, card background etc. are too strong). Tried: the **keycap's side** — the 5 px 3-D
drop under each plum key is the game's colour, a two-tone keycap; the glyph face stays
plum/white. It is deliberately quiet. **Look at:** `#tv=host&sel=pko` vs `sel=cld` — keep, or
drop back to plain plum (one `box-shadow` line in `lobby.css`, `.lb-tv-key`).

### T5. Join instructions — URL / QR ✅ DECIDED
**Answer:** Keep the room-code system as is; the seatless host is hosting with a room code, the
device just doesn't play. No URL or QR added.

### T6. Sound on the big screen ✅ DECIDED
**Answer:** Music on the Big Screen; each phone plays its own effects. Effects for the seatless
host revisited when its screens are built. Shipped: the 🔊 on the host display is labelled *Music*.

### T7. Old TV browsers ✅ DECIDED (delegated)
**Answer:** Owner's call was "you decide / check the standard". Decided: container queries drive
the sandbox; the real app's TV mode fills the viewport, so the same rules are duplicated as
`@media` under `@supports not (container-type: inline-size)`, and the `cqi` unit has a `1vw`
fallback. An old smart-TV browser gets the same layout, scaled by the viewport. Detail:
`DESIGN-NOTES.md` § 4 "T7, decided here".

### T8. Where the Big Screen choice lives ✅ DECIDED — recommendation, not yet built
**Answer (owner, 16 Sep 2026):** a pill toggle, not a second pane button — both Play and Host
already go to the same place (the game's menu, for its CTA/Settings/How to Play), so a second
button duplicated that path for no reason. The pill reads **"I'll play too" / "Big Screen
only"**, default *I'll play too*. Placement: at lobby creation — where `screen-mp-mode`'s Host
card sits today — shown only when `lbTvEligible()` is true (a phone never sees it). **Shipped in
this sandbox:** the pane's "Host on this screen" button is removed; the pane's only CTA is
**Play**. **Not shipped:** the actual pill, because `screen-mp-mode` has no widescreen layout of
its own yet — that's real app work, not a sandbox layout question. The Big Screen display
(`lbRenderTVHost`) is still fully built and reachable via the `#tv=host` hash for review.

### T9. What makes a device "TV-eligible"? ✅ DECIDED
**Answer:** Width **and** height, no device sniffing — **width ≥ 900 px and height ≥ 500 px**,
re-checked live on resize (a landscape phone is wide enough but too short, and stays excluded).
Shipped: `lbTvEligible()` / `LB_TV_MIN_W` / `LB_TV_MIN_H` in `lobby.js`, wired into the new
**`tv.html`** full-window mount (see below) — resize the window across the floor and the page
swaps between the wide lobby and the phone's hand-off card with no reload.
**On the "squished" preview (owner's question):** that wasn't resolution — CSS pixels already
account for pixel density, so a 4K and a 1080p screen of the same physical size render
identically. It was Pane 3 itself: a **fixed 900×506 frame** sitting beside two other panes in
one page, with the rail and pane scrolling *inside* that frame by design (a cast screen can't
scroll the whole page). `tv.html` removes that frame entirely — it's the real result, not a
frame around it. Use it, not Pane 3, to judge scale and squishing from here on.

### T10. The big-screen scale ✅ DECIDED (same numbers, now verifiable for real)
**Answer:** kept as shipped — the browse layout scales whole via `zoom` (1.2× from a 1200 px
container, 1.5× from 1600 px) rather than re-tuning every size, so a 1080p screen shows the
mockup's own 1024-wide layout at 1.5×. **Verified live in `tv.html`** at 1024×576 (the mockup's
own size, unscaled — it now matches `2b-tv-widescreen` closely), 1280×720 and 1920×1080 — no
overflow, no undersized controls, at every step. If it still reads too big or small once you've
looked at the real full-window version, the fix is the two `zoom` numbers in `lobby.css`.

### T11. The rail and pane scroll inside the frame — held for now
**Owner:** not sure how to observe this cleanly yet, same underlying issue as T9/T10.
**Answer:** `tv.html` is the way to observe it — open it, shrink the window height until the rail
or pane genuinely need to scroll, and see whether reaching for a mouse wheel / trackpad (or a
touchscreen swipe) feels normal there. What it does **not** yet let you judge is a remote's
up/down d-pad driving that same scroll — that depends on T12 below (keyboard-equivalent nav),
which is now in place enough to Tab through, but nothing arrow-keys a list yet. Revisit once
you've used `tv.html` for real; no code change made this round.

### T12. Input model — decided, cheap floor laid now
**Owner:** assumed a laptop/browser (mouse + keyboard, or a tablet touchscreen) driving it;
hadn't considered smart-TV or console browsers, and asked whether leaving that for later would
be harder to retrofit.
**Answer:** Assuming mouse/keyboard/touch for now is fine and doesn't box anything in, provided
one cheap thing holds from the start: **everything reachable by Tab, in a sensible order, with a
visible focus ring** — because a remote-control browser (smart-TV, console) drives pages exactly
that way, arrow-keys-and-Enter mapped from the remote onto the page's own Tab order. A page built
keyboard-accessible today mostly already works on a remote later; a page that only works by
mouse/hover needs a real rebuild. **Already true in this sandbox, confirmed this round:** every
clickable surface in TV mode (rail rows, tiles, the switcher, Play, the seat strip's buttons) is
a real `<button>` — none are `<div onclick>` — so Tab order and Enter/Space activation already
work, and `.lb-tv button:focus-visible` already rings the focus. Nothing added, nothing missing
at this floor. **Left for later, on purpose:** arrow-key grid navigation within the tile field
(nice-to-have, not required for the floor above) and gamepad input (a separate API entirely).

## New this round — the real full-window mount
**`wip/lobby-lab/tv.html`** — two script tags and a `<div id="tv-app">`, nothing else. It's what
answers T9/T10/T11: no lab chrome, no fixed 900×506 frame, the wide lobby (or, below the
eligibility floor, the hand-off card) filling exactly the window it's given, live on resize.
Same renderer as Pane 3 (`lbRenderTV()`/`lbRenderTVHost()`) — `lbMountTVFull()` in `lobby.js` is
the only new plumbing, and it degrades to a no-op inside `index.html` (which has no `#tv-app`),
so nothing about the three-pane sandbox changed. **Open this file directly to judge scale,
squishing, or eligibility from now on — not Pane 3, which was never meant to show that.**

## Data notes (no decision)
- **Secret Signals' id is `ss` in `games.js`**, not the app's legacy `sylly-signals` — the
  sandbox's `sel=` hash and `tvSel` use `ss`. Worth one line in `games.js`'s header so the next
  round doesn't trip on it.
- **Cold Shoulder's min is 2 only with Peck Off on** (`playerRangeDisplay: '2 (Peck Off) or
  3–8'`). The host display's status math uses `minPlayers: 2`; the real engine reads the
  pre-lobby `cldPeckOff` setting and would show the right one live.
- The shipped `gel-btn` gloss and drop are fixed px, so at 1920 the room-code keycaps read
  flatter than the phone tiles. Left untouched.

## Already verified — don't re-test unless it looks wrong
Wide lobby and all five Big Screen states at 900, 1280 and 1920 through Pane 3 (16:9, nothing
overflows the frame), reduced motion, no horizontal overflow, no button under 44 px, zero
console errors, stickers load, Fredoka loaded. Shell at 390 and 430 for `#view=tv`.
**New this round, via `tv.html` directly:** the eligibility gate at 800×600 (too narrow),
1000×420 (too short), 900×500 (exact floor, eligible), 1024×576, 1280×720 and 1920×1080; a live
resize crossing the floor in both directions with no reload; a click-through (shelf → tile →
pane updates) with zero console errors.

---

# TV Mode — handed to Claude Design (16 Sep 2026)

**Status change.** TV-mode *layout* is no longer being iterated in this sandbox. The bundle at
**`wip/tv-design-handoff/`** (zip: `wip/tv-design-handoff.zip`, 3.25 MB) is the brief for a Claude
Design round asking for **3–4 genuinely different directions**, each a real layout at 1280×720.
Rationale: `DESIGN-NOTES.md` § 6.

**What is NOT up for redesign**, and is stated as settled in the brief: the six shelves and their
names, the two filters and their dim-and-say-why behaviour, the no-invented-durations rule, all
verified copy, the visual vocabulary (keycap, badge disc, plum ink, Fredoka), and the **Big Screen
/ seatless-host display**, which is finished. Only the browse lobby is open.

### The art position in the brief (owner-corrected, 16 Sep 2026)

An earlier draft framed the sticker art as a placeholder and full-bleed key art as the real
destination. **Corrected on your note:** the stickers *are* the art layer — they came from the
controller decals, they replaced the emoji, and they are a decent middle ground rather than a
stopgap. Full art is genuinely undecided and may never be needed. The brief now says that, and
adds the point none of the three attempts used: the stickers are **transparent die-cuts**, so
they can break out of a container, tilt, overlap and cast their own shadow — which a rectangular
image can never do, and which is probably the cheapest route to "alive" available. Shipped with
the bundle: `reference/sticker-art/` (all 19 PNGs + manifest) and
`screenshots/art-sticker-contact-sheet.png`, all 20 at size on their brand colours, with the
Bailed gap visible. The brief also notes the set is live and improving (Bailed outstanding, some
reworks coming), not frozen.

**The wordmark** is recorded the same way: sticker art → game lockup, and **horizontal / compact
/ simplified variants can be made on request**, so Design is told not to contort a header around
the stacked lockup's proportions.

### Two data defects found while assembling the bundle — worth fixing at the source

1. **`wip/lobby-lab/games.js`'s header is wrong.** It lists `playCtaLabel` and `howToStepsRaw`
   among the machine-verified fields, but neither is present on the game objects — both live only
   in `games.raw.json`. Either restore them or correct the header.
2. **The original `2b` mockup's copy is invented throughout** — expected, given that round ran
   with barely more than names and colours. Confirmed example: Secret Signals' button reads
   *"Go Dark"*; the live app says **"Start Mission"**. Anything treating those screenshots as a
   copy source inherits it. The bundle now carries a verbatim table of all 20 real Play CTA labels
   and tells Design to use the mockups for layout only.

### When the directions come back
Pick one, and it gets built here for real — `tv.html` already gives a true full-window mount at
any width, and the eligibility gate, the filter logic, the data and the Big Screen display all
carry over untouched. Only the middle of the page changes shape.
