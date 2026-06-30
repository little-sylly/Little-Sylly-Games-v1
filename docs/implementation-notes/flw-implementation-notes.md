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

## Template Gaps

**Accumulator-array reset pattern (elevated from BUG-01):** Any game state that resets between rounds/sessions (log arrays, tally arrays, history lists) must be included in the round-start SYNC payload even if it's `[]`. The host resets it locally; clients will carry stale values unless the payload includes the reset state. Consider adding this to the MDLM section of `logic-engine.md` as a standing rule alongside the readyCheck pattern.
