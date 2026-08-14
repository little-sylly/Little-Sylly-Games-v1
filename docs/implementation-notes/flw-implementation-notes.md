# Implementation Notes — Flawless (FLW)

**Game:** Flawless
**Abbreviation:** `flw`
**Phase:** 36
**Shipped:** 2026-06-29
**Plugin:** `js/games/flw.js`
**Technical spec:** `docs/new-game-tech-flawless.md`

---

## Design Decisions

**True Network Privacy instead of couch security (Phase 36)**
All previous MDLM games used couch-security: hands broadcast to all devices, each rendering only its own. Flawless's core mechanic — bluffing on gem identity — is undermined if any player can inspect Firebase and see the true hand. Decision: introduce `mpSendPrivate(targetUid, envelope)` (writes to `rooms/{code}/private/{uid}`) + `mpStartPrivateListener()` (`onChildAdded` on own private queue). The public `/events` channel carries no card content. Trade-off: one more Firebase path per device per dealt card; acceptable for 3–4 player games with small hands.

**10-gem fixed deck, no `words.json`**
Flawless uses a fixed `FLW_GEMS` array (10 entries, ids 0–9). Exempt from the word-difficulty setting per the non-word-bank carve-out (`logic-engine.md`). Smoke & Mirrors (1/3/5 face-down burns per Showing) is the velocity dial.

**Asset-pack render seam via `flwRenderCard(gemId, opts)`**
All gem card DOM passes through this single function — same pattern as `frtRenderCard` (FRT) and `shpRenderCard` (SHP). Game logic and packets use integer `gemId` only. A future skin swap changes only this function's body.

**Counterfeit Run scope: gems 1–7 only**
Diamond (gem 0), Pearl (gem 8), and Onyx (gem 9) are excluded from Counterfeit forgery — their special effects fire on-play or on-deal (Emerald/Pearl/Onyx), meaning a counterfeit of those cards would require resolving a special effect that doesn't match the real card in hand. Scope 1–7 covers all the "regular" gems whose only mechanic is on-challenge reveal.

**Single-Showing Counterfeit token (not per-player)**
One token resets per Showing (not per player per Showing). This keeps The Counterfeit Run a rare, memorable event rather than a constant threat. 2 audit charges also reset per Showing, giving players a real counter without making audits trivial.

**`flwUnderGlass` clears at turn start, not at audit resolution**
`flwUnderGlass` is set by `FLW_AUDIT` and cleared in `flwBeginTurn()` (broadcast via `FLW_TURN_START.underGlass = -1`). This means a player stays Under Glass through the next revelation and into the next turn entry, giving table time to observe the audit result before the state resets.

**Host-as-participant pattern (FRT/SHP reference)**
Host never sends ACTION to itself (dedup guard). All host-side submit paths (`flwHostProcessServe`, `flwHostResolveChallenge`, `flwHostAudit`, `flwHostEmeraldOffer`) run directly when `syllyMultiplayerMode === 'host'`, branching before the client ACTION dispatch.

**`flwNorm2D` Firebase empty-array guard**
Same pattern as FRT (`frtNorm2D`) and SHP — Firebase strips trailing empty arrays from 2D structures. Applied to all received `hands`/`stashes` 2D arrays in every SYNC handler.

**Brand colour: `#E879A8` (rose-pink), not LI5 pink-500 (`#EC4899`)**
First colour choice (`#D6336C` deep rose-crimson) was too dark and too close to LI5. Lightened to `#E879A8` — light rose-pink, close to `oklch(82.3% 0.12 346.018)` / Tailwind `pink-300`. Hover: `#CF5A8D`. Custom CSS classes required (no Tailwind utility class at this lightness): `.flw-cta`, `.flw-label`, `pill-active-flw`, `game-toggle-on-flw`, `flw-range`. Exhibition gold `#C9A227` used for section/step labels in How to Play + settings overlay.

**Invisible lobby button — root cause**
Old SW cache served stale `css/styles.css` before `.flw-cta` was defined → transparent background + white text = invisible button. Two fixes applied: SW bumped to v132 (forces fresh cache) + `color: #ffffff` added directly to `.flw-cta` as belt-and-suspenders (some Tailwind utility class conflicts can strip inherited text colour).

**Menu button sizing**
Initial HTML used `min-h-12` with no explicit text size for How to Play and Settings buttons. Fixed to suite standard: How to Play + Settings → `min-h-14 text-xl font-semibold`; Back to the Box → `min-h-11 text-base font-medium`. Node.js script used (not the Edit tool) to avoid UTF-8 mojibake on `index.html`.

---

## Bug Index

**BUG-02 — Sound buttons inert on all FLW screens (June 2026, RESOLVED)**
What happened: The 🔊 button on every FLW screen did nothing when tapped.
Root cause: `engine.js` attaches `openSoundOverlay` to all `.btn-open-sound` elements at parse time via a top-level `querySelectorAll`. FLW's HTML section sits at ~line 8179 in `index.html`, well after the `<script>` block (~line 6774). The querySelectorAll runs before that HTML exists, so FLW's sound buttons are never captured.
Fix: Added explicit re-wiring inside FLW's `DOMContentLoaded` callback (bottom of `flw.js`): `document.querySelectorAll('#screen-flw-menu .btn-open-sound, #screen-flw-table .btn-open-sound, #screen-flw-showing-result .btn-open-sound, #screen-flw-gameover .btn-open-sound').forEach(btn => btn.addEventListener('click', openSoundOverlay))`.
Lesson: Any game whose HTML section in `index.html` appears after the `<script>` block must re-wire its `.btn-open-sound` buttons inside `DOMContentLoaded`. FRT is the established reference. See also NT BUG-12 and SHP BUG-03 (same root cause, same fix pattern).

**BUG-01 — `flwPublicLog` not reset on clients at Showing start (2026-06-29)**
What happened: The action log on client devices showed entries from the previous Showing at the start of a new one. The log correctly reset to `[]` on the host inside `flwDealShowing()`, but the `FLW_SHOWING_START` client SYNC handler did not apply that reset.
Root cause: `flwPublicLog` was not included in the `FLW_SHOWING_START` payload, so clients never received the reset value.
Fix: Added `log: flwPublicLog` (which is `[]` at reset time in `flwDealShowing`) to the payload; added `flwPublicLog = p.log || [];` in the client SYNC handler.
Lesson: Any host-side state that resets between rounds must be included in the round-start SYNC payload or clients will carry stale state. Applies to any accumulator array (log, history, tally) reset mid-session.

---

## Multiplayer Lessons

**`mpSendPrivate` + `mpStartPrivateListener` — first True Network Privacy model in the suite**
The public envelope pattern (`mpSendEnvelope` → `/events`) is unsuitable for hand distribution when game mechanics depend on genuine secrecy. The private channel pattern is validated as the correct approach for any future game where the host must distribute data that must not reach other players at the network layer. Checklist for future private-channel games:
1. Call `mpStartPrivateListener()` in `mpHostCreateRoom()` and `mpClientJoinRoom()` (already done engine-wide as of Phase 36)
2. Host sends hand packets via `await mpSendPrivate(slots[i].uid, { type:'SYNC', payload:{action:'GAME_HAND', ...} })`
3. The public channel NEVER carries hand/private data
4. Teardown: `mpStopListeners()` already clears `mpPrivateListener` — no extra teardown needed per game

**Host self-send still drops on private channel too**
`mpSendPrivate` is async and awaited before the host's own hand is displayed. However, the dedup guard in `mpHandleEnvelope` (`originId === syllyDeviceUid`) would also drop the host's own private packet if it came back through Firebase. Solution: host populates its own `flwMyHand` directly in `flwDealHands()` (sets `flwMyHand = flwHands[mpMyPlayerIdx].slice()`) — never sends itself a private packet. Same self-send bypass pattern as the readyCheck convention.

**Cross-suite engine fix: MP lobby duplicate-slot bug (June 2026)**
A client already in a joined lobby could change their nickname in the `<input>`, which re-enabled the "Enter Room →" join button via `mpUpdateJoinCta()`. Clicking it again called `mpClientJoinRoom()` a second time — allocating a fresh `/players/{newSlotIdx}` Firebase entry with the new name while the old entry remained. The host saw the player appear twice. Root cause: `mpClientJoinRoom()` had no guard for the already-connected state. Fix: added an early-return block at the top of `mpClientJoinRoom()` — if `window.mpClientPlayerRef` is set (already have a slot), `syllyMultiplayerMode === 'client'` (already joined), and `mpActiveRoomCode === code` (same room) — do an in-place `syllyFirebase.set(mpClientPlayerRef, { uid, nickname })` to update the nickname, then return without creating a new slot. Changed in `engine-multiplayer.js`. Affects all MDLM games.

---

## Playtest Polish (post-ship, 2026-06-29)

The following UI improvements were made during first playtest session (SW v133):

**Gem Manifest overlay (`flw-gems-overlay`):** Added a dedicated `[?] Gem Manifest` button alongside the Appraiser's Ledger (distinct from the header `[?]` which opens the full How to Play). Opens a slide-up overlay listing all 10 gems with coloured circular swatches (carat number as label), gem name, and a one-line ability description. Content is lazily rendered on first open (`flw-gems-list` only built once). Closed via `btn-flw-gems-close`.

**Log scoping fix + rename:** `flwPublicLog` carry-over between Showings on clients fixed (see BUG-01). Log renamed from the generic "Action Log" label to "The Showroom Journal". Log container restructured in HTML — static label above the `flw-log` div; `slice(-6)` cap removed so full current Showing log is always visible.

**Showing Result screen redesign:** `flwShowShowingResult()` rewritten to use DOM manipulation (not innerHTML). Now shows: result heading, final Showpieces as actual gem cards via `flwRenderCard()` (one per surviving player), Obsidian bonus line, Diamond tally in a white card, and full Showing log under "The Showroom Journal" label. The Next Showing button is host-only (hidden on clients).

**Appraiser's Ledger redesign:** `flwRenderLedger()` rewritten with explicit 4-column CSS Grid (`grid-template-columns: 1.1rem 1fr auto auto` → carat | name | count | /total). Gem colour applied only to the carat number (col 1) and the seen count (col 3); gem name and `/total` stay neutral stone. Completed gems fade with `opacity:0.3` + strikethrough. Label moved to static HTML.

---

## Core Art (2026-08-01, SW v152)

**What happened:** FLW became the second game (after PKO) to ship a **core art pack** — the default gem faces are now real bitmap art (`data/art/flw/`) instead of the gold-framed carat/swatch/name CSS token. Zero JS changed: `flwRenderCard` already resolved `assetFace('flw', gemId)` / `assetBack('flw')` through `js/lib/art.js`, so this was art + manifest + registry + precache only, exactly as `docs/expansion-guide.md` § Core art packs promises.

**Where the art came from:** it was already in the repo as the **`prismatic-gems` skin pack**. Promoting it meant three things, not one:

1. `tools/convert-core-art.ps1` re-encoded `data/packs/prismatic-gems/img/*.png` → `data/art/flw/img/*.jpg`. **1.1 MB → 217 KB**, all 11 files landing at the top quality step (q88) without the walk-down ever engaging.
2. `data/art/registry.json` → `["pko","flw"]`, and the manifest **plus all 11 images** added to `PRECACHE_URLS` with `CACHE_NAME` bumped v151 → v152. This is the step with no skin-pack equivalent — miss it and the art is simply absent on a cold offline install.
3. `prismatic-gems` was **removed from `data/packs/registry.json`**, so it no longer appears under `GAME SKINS`. The folder stays on disk as the masters; unlisted means never fetched.

**Lesson — check the masters' aspect before setting a target width.** The converter's default is to downscale (PKO: 896×1200 → 360 px). The gem masters were already 338×488, which is *exactly* the 4.5rem × 6.5rem card ratio and ~4.7× a 1× render. Feeding it PKO's `$cardWidth = 360` would have **upscaled** them — more bytes, no more detail. Holding the width at the source width and letting only the JPEG quality walk do the work is what produced 19 KB average files at full quality. Read the masters' dimensions first; the target width is a decision, not a constant.

**Known non-issue — the boot race.** `artLoadCore()` is async and kicked off at script load, so `window.coreArt` is briefly empty. PKO guards this with `await artReady` inside `pkoLoadChain()`, which FLW has no equivalent of. Deliberately not added: FLW's first card render is several screens deep (lobby → menu → MP lobby → roster → deal), which is orders of magnitude longer than two local `fetch`es. If a gem ever renders as the CSS token on a cold first load, that assumption is what broke — the fix is an `await artReady` at FLW's entry point, not a change to the seam.

---

## Gem Manifest folded into How to Play (2026-08-10, SW v167)

**What happened:** FLW's standalone `flw-gems-overlay` ("Gem Manifest 💎", opened by the in-game
`[?] Gem Manifest` button beside the Ledger) was retired and its content became **tab 2 of
`flw-how-to-overlay`** — `The Rules | The Gems`. Both entry points now route through
`flwOpenHowTo('gems')`. Same fold PKO's chain overlay made the same week (decision-log 2026-08-10);
the tab-bar pattern is now on six games.

**Root cause of doing it at all — the manifest was unskinnable, and nobody had noticed.** The old
`flwOpenGemManifest()` built its own markup: a `2.4rem` coloured `border-radius:9999px` swatch with
the carat number in it, straight from `FLW_DECK[].colour`. It never called `flwRenderCard`. Three
consequences, none obvious from reading the function:

1. **A skin pack could never reach it.** `data/packs/prismatic-gems` (and any future FLW skin) has
   ten gem images that simply did not appear in the one screen whose entire job is "here is every
   gem in the Vault".
2. **The core art was invisible outside a live Showing.** FLW got core art at v152, but the only
   place it rendered was a dealt hand — so the offline install check needed a running MDLM match on
   a real device to answer a pure service-worker question.
3. **It could drift.** A swatch colour is a second copy of the gem's identity; the card is the first.

Rewriting the rows through `flwRenderCard(g.id)` fixed all three at once and cost fewer lines than
the markup it replaced.

**Lesson — a reference view that doesn't use the game's render seam is a bug, not a style choice.**
It looks harmless because it renders correctly today. The tell is the question "if someone skins
this game, does this screen change?" — if the answer is no, the screen has forked its own copy of
what a card looks like. This is now a standing rule in `ui-style.md` § How-to Overlay Standard:
**a gallery tab must render through the game's own render seam, never hand-built markup.**

**Also added:** every row is tappable-to-enlarge via the new engine-owned `artMakeZoomable` /
`openArtViewer` (`ui-style.md` § Pattern 2a). `FLW_GEM_EFFECT` now holds the per-carat rules copy as
a named const beside the renderer rather than a local inside the opener — it is presentation copy,
not deck data, so it deliberately does **not** live in `FLW_DECK`.

**Watch for:** `flw-gems-overlay` is gone from `index.html`, from `engine.js`'s `resetToLobby()`
teardown list, and from `game-identities.md`. `flw-gems-list` and `btn-flw-gems-close` no longer
exist — a stale reference to any of them is dead code, not a missing feature.

---

## Gem Seam Round — visual-check measurements (Task 11, 2026-08-14)

**Context:** the gem-seam round (`docs/new-game-tech-flw-gem-seam.md`, tasks 1–13, in progress)
reworked the render seam, the hand-row placards (task 6), the two-column Ledger + discard strip
(tasks 7/9), and How to Play → The Gems. Task 11 is the `visual-check` gate the plan puts on tasks
6/7/9 before task 12 (art) — real headless Chromium, seeded state (FLW is MDLM-only, no
single-device path, so state was assigned directly and `flwRenderTable()`/`flwOpenHowTo('gems')`
called rather than played to). Full method: `.claude/skills/visual-check/`. All four passes green;
no code changes resulted.

**Pass 1 — hand row, 360px and 390px, worst-case text (`FLW_GEM_SHORT[0]`, "Bonus if sole
Collector with one", the longest string):**

| Viewport | Placard width | Worst-case placard lines | Second placard lines | Horizontal overflow |
|---|---|---|---|---|
| 360px | 86px | **3** | 2 | none (body or row) |
| 390px | 101px | 2 | 2 | none |

Confirms §6.2's own framing: 3 lines is the documented **ceiling**, and 360px lands exactly on it,
not past it. **No fallback needed** — the spec's contingency (dropping the name line) does not
apply. §6.2's 94px-per-placard figure was a starting estimate; measured actual is 86px at 360px
(real card width + gap arithmetic differs slightly from the estimate, without changing the outcome).

**Pass 2 — full table Stack (390×844, `flwSyllyMode: true` so the Counterfeit row and Audit button
are both present — the tallest realistic configuration):**

- Stack height 713px inside an 844px viewport — the primary CTA's own bottom edge sits at ~778px,
  fully reachable with no scroll-to-find.
- Switching `flwLedgerMode` from `'tally'` to `'discards'` on the same seeded state visibly
  collapses the Ledger card from a 5-row two-column grid to a single row of `.flw-card-sm` faces —
  confirms the "roughly halves" claim by construction (10 single-column rows → 5 two-column rows
  was always going to roughly halve; `'discards'` mode is shorter again).
- No horizontal scroll on the `<body>` in either mode.

**Pass 3 — gallery rows (How to Play → The Gems):** all 10 rows render via `flwRenderCard`, none
clipped, every card carries its `.flw-carat` chip. This is the original reported bug (artwork/name/
description misalignment) — confirmed visually gone; artwork, name+count, and effect text all sit
on one aligned baseline per row.

**Pass 4 — art viewer beside the card it opened from:** `#art-viewer-img` carries no CSS border of
its own (`border-width: 0px`) — confirmed the viewer code adds no frame. The image shown is still
the **old** portrait, baked-text/baked-border asset (task 12 hasn't run yet), so the screenshot
itself still looks like a card, not a plain gem — expected per the plan's own "cards will look
wrong mid-plan" note, not a regression. The measurable claim (zero added border) is what actually
carries forward once task 12's frameless square art lands.

---

## Template Gaps

**Accumulator-array reset pattern (elevated from BUG-01):** Any game state that resets between rounds/sessions (log arrays, tally arrays, history lists) must be included in the round-start SYNC payload even if it's `[]`. The host resets it locally; clients will carry stale values unless the payload includes the reset state. Consider adding this to the MDLM section of `logic-engine.md` as a standing rule alongside the readyCheck pattern.
