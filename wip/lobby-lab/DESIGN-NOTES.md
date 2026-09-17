# Lobby Redesign — Design Notes

**Fable 5.1, 15 Sep 2026.** What's in `wip/lobby-lab/` and why. Companion to
`docs/lobby-redesign-brief.md`; read that first for the settled decisions this builds to.

**Files:** `index.html` (canvas, three panes) · `tv.html` (the real, unframed TV-mode mount — § 5) ·
`lobby.css` (the language; § TV mode, then § 2a "The Lounge", at the end) · `lobby.js` (the phone
renderer, shared state and helpers, hash-seeded states for screenshots; `lbRenderTVHost` for the
Big Screen § 4, `lbTvEligible`/`lbMountTV`/`lbMountTVFull` for the mounts § 5) · **`lounge.js`**
(TV mode's browse layout — artboard `2a`, its own patch-in-place renderer and the rail runtime;
§ 7) · `verify-lounge.js` (the Lounge's zero-dependency Node harness) · `games.js` (data —
`supportedModes` and `playCtaLabel` filled for all 20 from the verified extraction).

**Load order:** `games.js` → `lounge.js` → `lobby.js`. `lounge.js` goes first because `lobby.js`'s
boot block runs at parse time; it only touches `lbState`/`lbWhyOut`/etc. from inside function
bodies, so the forward reference resolves at call time.

**Verified:** every state at 390 and 430, reduced motion emulated, no horizontal overflow, no
button under 44 px, zero console errors, Fredoka confirmed loaded. Hash states: `#folder=talk`
`#sheet=cld` `#unlock` `#count=4` `#onephone` `#view=original`; TV/Lounge adds `#sel=<gameId>`,
`#tv=host`, `#roster=…` and `#plaincta`. **A fragment-only reload does not re-seed** — `lbBoot()`
runs once at parse time, so a hash change needs a real navigation (add `?n=1`) to take effect.
For the Lounge's own verification see § 7.5.

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

## 4. TV mode — the wide layout (16 Sep 2026; corrected the same day)

> **Superseded by § 7 for the BROWSE layout only (17 Sep 2026).** The rail · field · pane
> arrangement this section describes was replaced by artboard `2a` "The Lounge"; `lbRenderTV()`'s
> browse half is gone and lives in `lounge.js` now. Everything else here still holds and is still
> the reference: what TV mode *is* (any device wide enough, never a phone), the eligibility floor,
> the Big Screen / seatless-host display, the hand-off card, and the Play-opens-the-game's-own-menu
> decision. Read this for the *why*, § 7 for the *what*.

**What it is — and what it isn't.** The first pass built a *host-only display* on a misreading of
the brief. The owner's correction: **TV mode is the layout for any device wide enough to hold the
whole lobby at once** — a laptop browser, a tablet, a cast to the telly — the fuller browse
experience the mockup drew (`wip/Game box UI mockups.zip` → `2b-tv-widescreen`): shelf rail, tile
field and info sheet on one screen. Phones never get it. Such a device plays exactly as any other
would; *or*, being TV-eligible, it can **host on this screen** — run the room without taking a
seat, the Jackbox shape — which is where the first pass now lives, as a sub-state. "TV" is the
design-canvas label the owner kept; it means *wide*, not *television*.

**Built.** `lbRenderTV()` — the wide lobby; `lbRenderTVHost()` — host-spectate; `lbRenderTVHandoff()`
— the phone's TV slot; `lbSheetBodyInner(g)` — the sheet body, extracted so the phone drawer and
the wide pane are one function. § TV mode in `lobby.css`. Pane 3 mounts the wide lobby in a 16:9
`.lb-tv-host` frame via `lbMountTV()`. Hash: `#folder=<shelf>` `sel=<gameId>` `#count=4 #onephone`
`#tv=host roster=empty|room|ready|full|table`; in the shell, `#view=tv`.

**Verified:** wide lobby and all five host-spectate states at 900×506, 1280×720 and 1920×1080 —
nothing overflows the frame, no horizontal overflow, no console errors, every button ≥ 44 px,
stickers and Fredoka load, reduced motion emulated. Shell at 390 and 430 for `#view=tv`. Bugs the
screenshots caught, all fixed: the pane fell back to Bailed because Secret Signals' id in
`games.js` is `ss`, not the app's legacy `sylly-signals`; the rail's first mini clipped on the
left (an override tying the phone's `:first-child` rule — see the comment in `lobby.css`); one
tile per row at 900 (columns re-cut to 232 / 1fr / 276); the long player-range chip clipping in
the pane (chips wrap there); and, from the first pass, open seats vanishing under the stagger
(open seats never animate).

**The wide lobby is the phone's components, re-seated.** Rail = the phone's `.lb-row` shelf rows
(mini stacks, fit counts) with *Who's here* above them; field = the phone's `.lb-grid`/`.lb-tile`
folder grid; pane = the phone's sheet head + body + foot, standing open. `lbRenderDock()` and
`lbRenderWho()` are called as-is. Every rule in `lobby.css` § wide lobby is a placement override
under `.lb-tv-browse`; no component is restyled — the README's "one design, two layouts" is now
literally one set of classes. Rail and field selection are separate, as in the mockup: a rail
row opens a shelf and keeps the pane's game if it's on that shelf (else the first that fits); a
tile only changes the pane. The selected tile's ring is an `outline`, so `.gel-btn`'s moulding
(a `box-shadow` stack) is untouched. The pane's foot holds **Play** (this device plays, like any
other → the game's own menu) and **Host on this screen** (→ host-spectate). When the group filter
excludes the selected game the pane says so in amber and Play stays live — the filter is advice.

**Scaling.** The browse layout is designed in plain px at ~900–1200 and scaled whole with a
container-query `zoom` (1.2× from 1200, 1.5× from 1600), so a 1080p telly shows the mockup's own
1024-wide layout at 1.5× — rather than every number re-tuned for a couch. Host-spectate keeps its
`cqi`-based sizing because that screen *is* read from 3 m. Under 900 the layout is never shown.

**The phone's TV slot** is a hand-off in the shell's own placeholder card — the mockup's copy:
*"TV mode wants a wider screen. Cast the game, or open it on a tablet or laptop, and this same
lobby lays out as a shelf rail with a detail pane. On a phone it stays on the Shelves."* with a
*Back to the Shelves* button. Nothing is crammed.

**Host-spectate (the first pass, re-seated).** Three questions, three zones, read from ~3 m:
header (the game), stage (room code as four keycaps + three join steps), a seat strip (one slot
per seat to the game's max, open ones dashed), and a status bar carrying the engine's own strings
(`Waiting for players to join…`, `Need 1 more player to start (min 3)`) and its real CTA
(`Let's Go! →`, inert until the minimum). Changes from the first pass: the roster has **no HOST
seat** (the host is this screen, and it isn't a seat); the pill reads *Hosting*; *Cancel* and
*End session* return to the wide lobby; the 🔊 is the music toggle (owner: music on the big
screen, effects stay on the phones); and, the owner's T4 wish, the game's colour is woven in
exactly once — the **keycap's side** (`.gel-btn`'s 5 px drop) is the brand under a plum top, a
two-tone keycap, with the glyph face still plum/white for the far-couch read. `#tv=host&roster=table`
is the honest seam for in-game host content: header and seats stay, only the stage swaps into a
labelled dashed panel. The status dot's 2 s opacity pulse stays — one sign of life on a screen
that waits — and goes green and still when the room can start.

**T7, decided here.** Container queries drive the sandbox (two panes at different widths in one
viewport). In the real app TV mode fills the viewport, so viewport and container are the same
number — the wide rules are duplicated under `@supports not (container-type: inline-size)` as
`@media` rules, and `--u` is declared `1vw` with `1cqi` layered on inside `@supports`. Declaring
`1cqi` directly would *not* degrade: an unsupporting browser stores the custom property as text,
every `calc()` using it fails at computed-value time, and the whole declaration is dropped. With
the fallback, an old smart-TV browser gets the same layout scaled by the viewport instead.

**Two `:where()`-class lessons this round.** The wide pane's reset is `:where(.lb-tv button)` —
whole selector inside, per the brief's trap. And the mirror image: an *intended* scoped override
(`.lb-tv-rail .lb-mini`) ties any single-class-plus-pseudo rule on the same component
(`.lb-mini:first-child`) and wins on source order, silently. When overriding a component's
property in a scope, grep the component's *other* rules for that property first.

**Where I'd still push back.**
- *"Host on this screen" in the pane* is the shortest route to show the sub-mode, but the real
  app already has a place for "how will this device take part" — `screen-mp-mode`. Host-spectate
  is a third mode there (beside "play here" / "host a lobby"), gated on TV-eligibility. Kept in
  the pane for the sandbox; flagged in OWNER-REVIEW.
- *Host-spectate is an engine change, not a lobby change.* Today's host is a seat with a hand.
  A host that takes no seat is new in `engine-multiplayer.js`, and every game's host-side
  screens are unbuilt. The lobby layout is done; the mode is a build-spec item.

## 5. Terminology, the pane's second button, and a real full-window mount (16 Sep 2026)

**Terms.** *Seatless host* is the technical term for a TV-eligible device that runs a room but
holds no seat — one flag beside the engine's existing host/client modes, not a new mode. *Big
Screen* is the player-facing name: "Host on the Big Screen"; the choice is "I'll play too" vs
"Big Screen only". Applied wherever the sandbox surfaces this to a player — the Big Screen
display's pill (was "Hosting", now "Big Screen") and its code comments.

**The pane's "Host on this screen" button is removed.** Owner correction: Play and that button
went to the same place — the game's own menu, for its CTA/Settings/How to Play — so a second
pane button duplicated the real decision point for no reason. The choice of seat vs seatless
belongs at lobby creation, as a pill on `screen-mp-mode`'s Host card, gated on TV-eligibility and
defaulting to "I'll play too". That pill isn't built (this sandbox has no widescreen mode
screen) — the pane now has one CTA, Play, and the Big Screen display (`lbRenderTVHost`) is kept
fully built, reachable via the `#tv=host` hash for review. OWNER-REVIEW.md T8.

**`wip/lobby-lab/tv.html` — the real, unframed mount.** Pane 3's fixed 900×506 frame answered
"does the layout work" but not "what does this actually look like", and the owner's own
screenshot of the VS Code live-preview version read as squished for exactly that reason: three
panes sharing one page forces a frame around each. `tv.html` is two script tags and one empty
div — no lab chrome, no aspect-ratio lock — mounting the same `lbRenderTV()`/`lbRenderTVHost()`
into whatever window or screen it's given. New plumbing, all in `lobby.js`: `lbTvEligible()`
(width ≥ 900, height ≥ 500, re-checked on `resize`) and `lbMountTVFull()`, which shows the wide
lobby when eligible and `lbRenderTVHandoff()` — the same "wants a wider screen" card the phone's
TV tab shows — when it isn't. Both `lbSet()` and boot call it alongside the existing
`lbMountTV()`; `lbMountTVFull()` no-ops when `#tv-app` doesn't exist, so `index.html`'s three-pane
sandbox is untouched. `lbRender()` gained the same `if (!root) return;` guard `lbMountTV()`
already had, since `tv.html` has no `#shelves-canvas` either. `.lb-tv-full`/`.lb-tv-full-gate`
in `lobby.css` are the two new rules — no other CSS moved.

**Verified in `tv.html`:** the eligibility gate at every boundary — 800×600 (too narrow, gated),
1000×420 (too short, gated), 900×500 (exact floor, eligible), 1024×576 (the owner's own mockup
size — the layout now visibly matches `2b-tv-widescreen`), 1280×720, 1920×1080; a live resize
crossing the floor in both directions with no reload; a full click-through (rail row → tile →
pane updates) with zero console errors. A first screenshot at 1280 briefly caught a mid-animation
frame with two seats missing — a screenshot-timing fluke, not a layout bug; a slower capture and
a fresh DOM inspection both confirmed all six seats render at the correct position and size.

**Keyboard/remote floor.** Confirmed, no code needed: every interactive element in TV mode (rail
rows, tiles, the switcher, Play, the seat strip) is a real `<button>`, so Tab order and Enter/
Space activation already work, and `.lb-tv button:focus-visible` already rings the focus. This
is the floor a remote-driven smart-TV or console browser needs (arrow-keys-and-Enter mapped onto
the page's own Tab order) — nothing added this round because nothing was missing. Arrow-key grid
navigation and gamepad input are explicitly left for later. OWNER-REVIEW.md T12.

**Not resolution — the frame.** The owner asked whether a squished-looking preview meant the
sandbox wasn't showing the true result. It wasn't resolution (CSS pixels already normalise for
pixel density) — it was Pane 3's fixed frame, exactly as above. `tv.html` is the fix and the
answer, and OWNER-REVIEW.md T9 says so directly so it doesn't get re-asked.

## 6. TV mode handed back to Claude Design (16 Sep 2026)

**Why.** Three layouts have now been proposed for TV mode — the original `2b` mockup, the built
rail·field·pane version in this sandbox, and an unbuilt "Spotlight" (hero + rows). The owner's
verdict on the built one was *"correct but it doesn't feel alive"*, and on Spotlight *"some good
elements but still not an easy pick, which means there are potentially even better layouts out
there."* That is a divergence problem, not a convergence one, and this sandbox is a convergence
tool: it is excellent at proving one layout works at every width and useless at showing four
layouts side by side. So the round goes back to Claude Design for breadth, and comes back here to
be built for real.

**The bundle: `wip/tv-design-handoff/`** (+ `wip/tv-design-handoff.zip`, 3.25 MB, for upload).
`README.md` is the brief — the ask, the space, what's settled, what's open, the three attempts
and why each fell short, the visual language, and how it will be judged. `ADJOINING.md` covers
what every click leads to, so a wide layout doesn't re-invent Settings, How to Play, the Workshop
or the join flow — all of which exist and are liked. `reference/games.js` is the verified data
table, copied unchanged. `reference/tokens.css` is the real `.gel-btn` keycap, the real badge
disc and the real palette, **extracted verbatim from `css/styles.css` and `lobby.css`** rather
than described, so a Design artboard can look like the app instead of approximating it.

**What went in as screenshots, and the judgement behind it.** The sandbox's own states (current
TV build at 1024 and 1920, filtered, Big Screen, below-floor) and the finished phone layout. Plus
— the part worth the effort — **four captures of the real running app**: the lobby with the
**live 3D controller**, two game menus in different brands, and the Workshop. The controller is
the object three layouts have failed to place, and this sandbox draws it as a flat SVG stand-in;
a designer shown only that stand-in would be designing a stage for the wrong object. The real one
is a soft, inflated, pastel, ear-having 3D toy that recolours per player and nudges itself every
few seconds. That screenshot is the single most load-bearing thing in the bundle.

**Two decisions the owner delegated — one of which I got wrong and the owner corrected.**
(1) *Controller:* handed over as a screenshot plus a written brief (four colourable groups,
sticker placement, the idle nudge, the Workshop behind it), not as code — Design needs to know
what it looks like and what it means, not how Three.js draws it. (2) *Art:* my first draft framed
the sticker art as a placeholder awaiting "real" full-bleed key art. **That was wrong.** The
stickers came from the controller decals, replaced the emoji, and now double as the games'
artwork — a genuine middle ground, and whether full art ever replaces them is undecided. The
brief was rewritten to say so, and to add the observation none of the three attempts had used:
these are **transparent die-cuts**, so they can break their container, tilt, overlap and cast
their own shadow, where a rectangular image can only sit in a box. All 19 PNGs now ship in the
bundle (`reference/sticker-art/`) with a contact sheet showing all 20 at size on their brand
colours — Bailed's gap included, since the set is live and improving rather than frozen. The
**wordmark** is recorded the same way: variants (horizontal, compact, simplified) can be made on
request, so no header need be contorted around the stacked lockup's aspect ratio.

**One real defect, and one piece of context that reframes it.** `games.js`'s header lists
`playCtaLabel` and `howToStepsRaw` among its machine-verified fields, but both were trimmed from
the curated file and survive only in `games.raw.json` — **worth fixing at the source**, either by
restoring the fields or correcting the header. Separately, the `2b` mockup shows Secret Signals'
button as *"Go Dark"* where the live app says **"Start Mission"**. The owner's context explains
it: that round was handed almost nothing — no code, no data, roughly names and colours — so its
copy is invented throughout rather than wrong in one spot. That is not a criticism of it; it is
the reason this bundle exists. `ADJOINING.md` now says plainly that the mockups are a layout
reference and never a copy source, and carries a verbatim table of all 20 real Play CTA labels.

---

## 7. TV mode rebuilt as `2a` "The Lounge" (17 Sep 2026)

The owner picked **`2a` The Lounge** out of the design round, and
`wip/tv-mode-design/README.md` is its spec. This round replaced TV mode's browse layout with it.
Plan: `docs/superpowers/plans/2026-09-17-tv-lounge-2a.md`.

What shipped: the 64px header (horizontal wordmark, clock, tools pill, four-mode switcher); three
columns at `300px / 1fr / 300px` — controller, speech-bubble panel, always-reserved detail pane;
and a full-width rail of game boxes drifting along the bottom edge. `1a`–`1d` were context and
were not built.

### 7.1 It lives in its own file, and renders itself

**`wip/lobby-lab/lounge.js`, loaded before `lobby.js`.** `lbRenderTV()` is now two lines — only the
fork to the Big Screen host display, which is otherwise untouched.

The reason is not file size. `lbSet()` rebuilds every mount with `innerHTML = ''`, which is fine
for the phone: it has no state below the DOM. **The rail does** — a `scrollLeft`, a rAF handle, an
in-flight smooth scroll and possibly a drag. Rebuilding it on every keycap tap would snap it back
to position zero mid-drift. So the Lounge builds its DOM **once per mount** and patches in place
after (`lgApply`), and `lbMountTV`/`lbMountTVFull` became **idempotent** to suit: they call
`lgMount()`, which returns the live instance if its root is still connected.

Instances are tracked in `LG_INSTANCES` and hang off their container, because Pane 3's
`#wide-canvas` and `tv.html`'s `#tv-app` can both be up and each needs its own scroll and rAF.
`lgDrop()` cancels both rAFs, the clock interval and the two timeouts — § Timer Lifecycle applied
to a rAF, the same rule `nt.js` follows for `ntRafHandle`. It is not theoretical: crossing the
eligibility floor tears the Lounge down and rebuilds it, and the probe checks the rebuilt rail
still drifts.

**The filters are not a second copy.** They write `lbState.count` / `lbState.onePhone` — the
phone's own two questions — and `lbRenderWho`'s count sentence moved into `lbFitLine()` so the two
layouts cannot disagree about how many games fit. The probe asserts both surfaces print the same
string.

The root class is **`.lb-lounge`, never `.lb-tv-browse`**, so the older
`@container tv (min-width:1200px) { zoom: 1.2 }` rules do not apply. README § 3 wants 1920 to
widen the middle column and show more boxes, not scale the whole thing up.

### 7.2 The extended tab — the lid lifts

Not in the spec; the owner asked for it directly, to carry the players/phones facts that the
detail pane's chips used to hold before they were cut. Lid-lift was the first thing to try and it
won on evidence, so the sideways-slide fallback was not needed.

It is **the box's own interior**, not a floating badge: always in the layout at the bottom of the
`150×112` wrap, behind the lid at `z-index: 0`, at `opacity: 0` until the lid rises 22 px off it.
Two decisions carry the weight:

- **It lives inside `.lb-lg-item`, the transform group `jumpIn`/`reBounce` ride.** Measured across
  a full 2.8 s cycle the lid hops 10.4 px and the lid-to-tab offset varies by **0.00 px** — they
  move as one object. Positioned against the rail, or against the item's parent, it would visibly
  detach on every bounce.
- **Card stock (`#F3F0F7` + plum ink), not the brand fill.** A brand-filled strip would need the
  same luminance ink-switch the pane's CTA does, and would read as a second box rather than the
  inside of this one.

### 7.3 Three things the build forced that the spec does not mention

- **Rail headroom 34 px → 46 px.** The 22 px lift plus `jumpIn`'s 26 px peak clips the breakout
  sticker against the rail's `overflow-y: hidden`. The extra is pure negative margin; nothing
  moves.
- **The shelf well scrolls, `align-content: safe center`.** At 900×500 a six-game shelf is taller
  than the panel can give it, and `overflow: hidden` there did not compress the field — it made
  two games unreachable. **`safe` is load-bearing:** plain `center` centres the overflow too,
  stranding the first row above the scroll origin where it cannot be scrolled back to. Verified
  per shelf: overflowing ones fall back to flex-start (first row at offset 10, reachable), the
  two-game shelf still centres.
- **The controller's resting `rotate(-3deg)` moved into its base rule.** It lived only in
  `lb-nudge`'s `0%/100%` frame. The global reduced-motion block collapses `animation-duration` to
  0.01 ms with `iteration-count: 1` and **no fill-mode**, so a pose that exists only inside
  keyframes snaps back to identity the instant it is frozen — the controller stood bolt upright.
  That is precisely README § 8's "must read as finished" clause failing, and it is a **general
  trap**: any ambient loop whose resting frame is not identity needs that pose in the rule, not
  just the keyframes. Everything else here was already safe because the pose was in a base rule
  (pill tilts, sticker rotations, the selected lid's lift).

### 7.4 The reduced-motion contract has a JS half

`css/styles.css`'s global block reaches **none** of: the rail's rAF drift,
`scrollTo({behavior:'smooth'})` (an explicit JS option that overrides the CSS property), or Random
Game's own 1800 ms tween. Each checks `lgReduced()` itself — the `combReducedMotion()` shape from
`js/games/comb.js`. `lgWatchMotion()` adds one document-level `change` listener so toggling the
preference takes effect without a reload.

Frozen, the screen is a **design state, not a degraded one**: the rail is completely still, the
pick is still lifted with its tab out and still centred, selections land instantly, and Random
Game still picks and centres a game — it just arrives instead of travelling.

### 7.5 What was verified, and how

`node wip/lobby-lab/verify-lounge.js` — **919 checks, zero dependencies**, over the pure tier:
`LG_ORDER` against `games.js` both ways, the ink/label luminance split, per-game tilt determinism
and bounds, the loop wrap, and the nearest-copy pick. It earned its keep immediately: at
`scrollLeft = 2W` the nearest copy of index 19 is the copy **behind**, one box back — not the one
you are standing in, nineteen forward. That is the rule working, and it is the thing that stops
wrap-edge games yanking the rail.

Layout and behaviour went through real headless Chromium (the `visual-check` skill), as throwaway
scratchpad drivers rather than committed files — they need Playwright, which lives outside the
repo. What they asserted, so it can be redone:

| Probe | Covers |
| --- | --- |
| rail | drift + hover-pause + resume, the wrap in both directions, click-to-centre within 4 px, the anti-yank bound, the pane opening, the tab's text, the lid lift, `jumpIn`+`reBounce` on the item, drift freezing on selection, Random Game respecting the filters, and the whole reduced-motion contract — **35 checks** |
| bounce | lid-to-tab offset variance across a 2.8 s cycle (must be ~0) |
| edge | luminance ink on all six extremes (FRT/COMB/CLD/YGI plum, PASS/BLD white), Bailed's domed-disc fallback in **all three** surfaces, COMB's no-Sylly line answering rather than vanishing, `#plaincta`, the dim+reason state and fitting-first sort, and phone-vs-Lounge count-line agreement — **26 checks** |
| size | 900×500 / 1280×720 / 1920×1080 — no page scroll, `zoom: 1`, the 166 px pitch holding at every size, boxes visible 7 → 9 → 13, plus both eligibility-floor edges (899×500, 900×499) |
| regression | Pane 1's phone lobby, Pane 3's framed mount, the Big Screen, and — the one that matters — **a filter tap repaints the boxes without resetting the rail** — **17 checks** |

### 7.6 Still open

- **The horizontal wordmark is text, not an asset.** README § 9 flags it; the stacked
  `assets/logo.png` does not fit a 64 px bar, so the header draws "Little Sylly" + a pink "Games"
  pill directly.
- **The controller is still a flat render** (`wip/tv-mode-design/tv/controller.png`, with the
  sandbox's existing inline SVG as an `onerror` fallback) rather than the live 3D object. When it
  is replaced, drop the `lb-nudge` animation and the base `rotate(-3deg)` with it.
- **Bailed still has no sticker**, so its domed-disc fallback path stays live. That path is now
  exercised in three surfaces and is checked.
- The clock is pinned to **en-AU** ("Thu, 17 Sep · 11:46 am"). The mock's `Sep 17 · 10:09 AM` is a
  US machine's rendering of the same shape, and Australian English is a project rule.

This is a sandbox round: nothing here ships, so it does not trigger the Documentation Integrity
Protocol — no `code-map.md` entry, no identity doc, no SW bump, no decision-log entry. **If the
owner adopts the Lounge into the app, that adoption is the change that does.**
