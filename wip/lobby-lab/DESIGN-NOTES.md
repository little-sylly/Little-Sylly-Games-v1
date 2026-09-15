# Lobby Redesign — Design Notes

**Fable 5.1, 15 Sep 2026.** What's in `wip/lobby-lab/` and why. Companion to
`docs/lobby-redesign-brief.md`; read that first for the settled decisions this builds to.

**Files:** `index.html` (canvas) · `lobby.css` (the language) · `lobby.js` (the renderer,
state, hash-seeded states for screenshots) · `games.js` (data — `supportedModes` now filled for
all 20 from the verified extraction).

**Verified:** every state at 390 and 430, reduced motion emulated, no horizontal overflow, no
button under 44 px, zero console errors, Fredoka confirmed loaded. Hash states: `#folder=talk`
`#sheet=cld` `#unlock` `#count=4` `#onephone` `#view=original`.

---

## 1. What changed from the mockup, and why

**The device question is on the front page.** The mockup's "one phone passed around" premise
fails for 11 of 20 games, so the lobby's first control after the wordmark is *Who's here?* — a
headcount stepper and a **One phone only** toggle. Shelf counts become "3 of 6 fit", excluded
tiles dim and say *why* ("needs 3+", "needs a phone each") instead of vanishing. Every tile's
meta line carries the device fact ("3–8 · phone each"). This replaces the dock's search icon:
twenty games on six shelves never needed search; a deciding group needs those two questions.
**Owner decision (OWNER-REVIEW.md item 2):** the filters were right as-is, plus a live reshuffle
— fitting games float to the front, excluded ones bump to the end, in both the shelf-row mini
stacks and the folder grid (`lbSortByFit()`). The existing 30 ms stagger rise on the folder grid
already sells the reordering as a reshuffle rather than a jump-cut, so no new animation was
needed for it.

**No marquee.** The shelf row's right side is a static, overlapped stack of *all* the shelf's
tiles (six fit at 390), edge-masked. Six rows of continuous compositing bought nothing a static
stack doesn't already say — and under reduced motion the design has to work static anyway, so
the static version *is* the design. Nothing on the page loops. Total motion inventory: press
scale, a 180 ms rise on view swap, a 30 ms-step stagger on the folder grid, and the sheet's
drawer curve (280 ms in, 200 ms out, transitions not keyframes, so tap-tap-tap is interruptible).
All `transform`/`opacity`; no RAF; the global reduced-motion block covers all of it.

**The keycap, not the flat stripe.** The mockup's tiles were flat colour + diagonal stripes.
The suite already has a signature — the moulded `gel-btn` keycap on every lobby button and
menu — so the folder tiles and sheet header reuse it verbatim (Tier 1, zero bytes), and the
shelf minis use a lighter cut of the same recipe. The lobby stays one family with the 20 menus.

**Emoji, decided knowingly — and a cheap sticker upgrade on top.** Every emoji sits in a white
domed badge disc. The disc is the tile's identity anchor — same footprint, same ground on iOS,
Android and Windows — and the emoji is a passenger on it; platform variance shrinks to "which
drawing is in the circle". The brand colour + name carry recognition. **Owner decision
(OWNER-REVIEW.md item 3):** the placeholder reads as finished, keep it — but for the 19 games
that already have a controller sticker (`data/stickers/<id>.png`; Bailed is still waiting on its
own), that sticker now fills the disc over the emoji (`lbBadge(g)`, `.lb-badge-art`), emoji as
the fallback if the image is missing. This is *not* the full-face art upgrade — real art
(runtime-cached, per § 7 of the brief) still replaces the whole face later via the reserved
`img.lb-art` slot, which stays untouched; the placeholder disc is a finished treatment either
way, so art is an upgrade, not a rescue.

**Round 2 (same day): fit and legibility fixes, plus a trial on the Original layout.** The
stickers are irregular die-cut crops — none of the 19 is square (heights 350–512 px on a fixed
512 px axis) — so `object-fit: cover` chopped them; switched to inset (14%) + `object-fit:
contain`, so the whole sticker shows. Also fixed a double-render: the emoji was visible
*underneath* a successfully-loaded sticker wherever the PNG had transparent corners, because
nothing hid it while the image was fine — only `onerror` removed the image, nothing hid the
emoji by default. Now the emoji starts hidden whenever a sticker exists, and only the image's
own `onerror` reveals it. Also tried the same treatment on the **Original layout**'s real
`.lobby-btn-badge` (reused as-is; no shipped CSS touched) per the owner's "let's see if we adopt
this project-wide" — which surfaced a real, pre-existing CSS bug: `.lb-phone :where(button)`
and `.lobby-btn` tie in specificity (`.lb-phone` sits outside the `:where()`, so it still
counts), and lobby.css loading after styles.css let the reset win that tie, silently zeroing
`.lobby-btn`'s padding and sitting the badge on top of the label text. Fixed by moving the whole
selector inside `:where()` — `:where(.lb-phone button)` — which always loses ties regardless of
load order. Worth carrying that specific fix (not necessarily the sticker trial itself) back to
the real lobby whenever this becomes a live build, since the same tie would exist there too.

**Round 3 (same day): a second "Original" renderer was missed.** `index.html`'s Pane 1
("Today — Original (fallback layout)") is a *third*, independent badge generator — not the
Shelves switcher's own "Original" tab that round 2 fixed. It had its own `${g.emoji}` literal
inline in `index.html`, so it never got the sticker or the `:where()` fix. Rewired to call the
same `lbBadgeInner(g)` as everywhere else — one function, so the two "Original" renderers (and
any future third) can't quietly drift apart from each other, which is the exact property Pane
1's own lab-note already promises ("generated from `games.js` rather than hand-copied").

**Four-slot switcher.** A segmented control where inactive slots are icon-only (44 px) and the
selected one expands to show its word — at every width, so 390 and 430 are the same control.
Original and Shelves both render inside the new shell; Premium and TV are honest placeholders.
**Owner decision (OWNER-REVIEW.md item 6):** keep both slots visible, no change — the owner
wants to build TV mode first (before their Fable window closes), Premium later, in parallel with
further game development.

**Six shelves.** The five verb shelves plus a sixth for Cold Shoulder and Honeycomb Hills — the
only two games built around planning moves on a persistent shared board rather than a hand or a
clue. **Owner decision (OWNER-REVIEW.md item 1, 15 Sep 2026):** the shelf is named **Strategy**
♟️, not Board — the thing worth naming is the kind of decision the game asks for, not the object
it's played on. Real category, extends the same way the other five do. *Guess + Draw* is
renamed to **Guess** (same call) — drawing (GTH) still fits under it, and YGI stays put; a
separate Draw shelf can return if more drawing games join the box.

**Ink.** Warm stone neutrals kept (the games use them); headings pulled to a plum ink
(`#2B1B45`) from the lockup's outline, lobby only, because stone-800 beside the real logo read
as two systems. Accent is the lockup's "Games" pink. Numbers/labels in each game's own hex.

**Copy.** The engine's mode jargon never reaches the player: tiles show "one phone" / "phone
each"; the sheet spells out "2 (one phone per team) or 4–6 (a phone each)". The ⏱️ chip is
simply absent for the 13 games whose length isn't stated — nothing is invented and nothing
structurally needs it. One data note for the owner: Bailed's own how-to says "pass the phone"
but it is multi-device only; that's the game's copy, not the lobby's.

## 2. Where I think § 5 is wrong

**Controller-as-avatar: keep it, but it is the *avatar*, not the *profile*.** The controller
has a real home here — 96 px beside the wordmark, captioned YOU, the figurine on the box lid.
That works because it already carries personalisation (colour, stickers). What it should *not*
become is the door to a stats screen: a 3D object that opens a settings page breaks the
"this is me" reading. Suggested split: tap the controller → Workshop (as today); Profile as a
surface lives *behind* the 🏆 icon or a long-press, and the controller appears *on* that
surface as the hero, rendered live. One object, two entry points, no icon pretending to be it.
Nothing else in § 5 fought back: the sheet-before-menu costs a tap and repeat players will
feel it — a "skip the sheet for games I've played" memory is the cheap fix, local-first.

**Owner decisions (OWNER-REVIEW.md, 15 Sep 2026):**

- **Sheet-before-menu (item 4): keep it, no change.** Shelves is the browse-and-decide layout;
  Original already goes straight into a game's menu for players who know what they want. The
  "played before" skip isn't needed to solve a problem the layout split already solves. Added
  instead: layouts get a **"last used"** memory, per player — everyone starts on Shelves, and
  switching to another layout updates that memory going forward. Future build-spec item, not
  built in this sandbox.
- **Controller/Profile split (item 5): agreed on the split, corrected the door.** Controller
  still opens Workshop, unchanged. The Profile door is **not** 🏆 — it's a clickable **"You"**
  button next to the controller (not part of it), opening a small popover anchored underneath:
  an editable name (backed by `sylly_nickname`, the real app's own localStorage key, so
  "carries into every lobby" is literal here, not just copy) and three placeholder stats
  (matches played, games tried of 20, favourite shelf), clearly marked as placeholder pending
  `profile.js`. Shipped in `lobby.js`/`lobby.css` (`.lb-you-pop`). Open on the merge: the owner
  is leaning toward **Workshop and Profile eventually being one screen** rather than two —
  naming your controller doubling as claiming your profile, with room to grow into stats,
  favourite games, maybe friends. Worth designing that way from the start rather than building
  Profile as a second screen and merging later. Not decided firmly — the popover here is a
  lightweight preview, not that eventual screen — but the § 3 blueprint below should be read
  with this in mind before it becomes a real spec.
  - **Two lessons from building the popover, worth keeping for any future overlay work.**
    (1) A `z-index: auto` positioned element can still lose to a later, non-positioned sibling
    if that sibling triggers its own CSS stacking context — here, `.lb-body`'s entry-rise
    animation (animating `opacity`/`transform`) did exactly that, painting over the popover
    wherever the two overlapped despite the popover being `position: absolute`. Fixed with an
    explicit `z-index` on the popover, which always wins regardless of DOM order or animation
    side effects on other elements. (2) An editable input inside any UI that re-renders its
    whole subtree via `innerHTML` on state change must save on `change`/`blur`, never on every
    keystroke — an `input`-event save would trigger a re-render mid-keystroke and drop focus.
  - **Round-3 clarification:** the controller and "You" were already two separate, independently
    clickable elements as of round 2 — "split... in two" in that round's own notes read as if
    they'd been one thing before, which they weren't in practice (a single wrapping `<button>`
    covered both, but nothing about the controller's role changed by giving them separate
    buttons). Also added: the "You" label now shows the saved **name** once one is set, swapping
    live the instant the name field blurs (`#lb-you-label-text` patched directly, no full
    re-render, so the input keeps focus and the popover stays open) — the button no longer says
    "You" forever once a player has actually named themselves.

## 3. Blueprints

**Profile.** Screen: the controller rendered live at hero size; nickname (`sylly_nickname`,
already in localStorage); a small stat strip — matches played, games tried of 20, favourite
shelf; below it the sticker book (the Workshop's existing book, read-only here). Data needed:
`{ nickname, controllerDesign, matches: [{ gameId, at, seats }], stickers[] }`. **Seam:** one
module, `profile.js`, exposing `profileRead()` / `profileWrite(patch)` / `profileAppendMatch()`.
Local implementation writes one JSON blob to localStorage; the server-later implementation
keys the same blob by `syllyDeviceUid` (the anonymous Firebase UID the app already issues) and
merges. Every screen calls the module, never storage, so the swap touches one file. The lobby
sheet's "played before" memory reads `matches`.

**Achievements / Stickerbook.** Achievements *are* stickers: earning one puts a new sticker
design in the book, placeable on the controller — the reward is already the personalisation
layer. Screen: a grid of sticker slots, earned ones bright, unearned ones silhouetted with a
one-line hint ("Win a Night with the count at exactly 99"); tap an earned one → the Workshop's
placement flow. Data: an achievement registry (id, sticker image, hint, predicate over a match
record) that ships with the app, plus `earned: { [id]: timestamp }` in the profile blob above.
Predicates run locally at match end over `profileAppendMatch()` — the same seam — so a server
later only has to *sync* `earned`, never compute it. `data/stickers/` already has the
runtime-cached manifest contract, so achievement art costs zero install.
