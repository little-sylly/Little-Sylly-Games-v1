# Shared / Engine — Implementation Notes

**Scope:** Anything not owned by a single game — `engine.js`, `engine-multiplayer.js`,
`secret-mode.js` (Konami/Terminal), `js/lib/art.js`, `js/lib/cards.js`,
`js/lib/canvas-draw.js`, `sw.js`, and cross-cutting rules in `ui-style.md`/`logic-engine.md`
themselves. If a bug or design decision's root cause lives in one of these files — even if
it was *found* while testing a specific game — it belongs here, not in that game's
`[abbr]-implementation-notes.md`. A fix that touches both (e.g. a shared function PLUS a
game's own call site) can get a short cross-reference in the game's file pointing here,
but the actual root-cause writeup lives in exactly one place.

**Not in scope:** per-game bugs, design decisions, or lessons — even ones about a shared
*pattern* (MP sync, the render seam, etc.) — where the bug itself was in the game's own
code. Those stay in the game's own notes file, which is where the recurring-pattern lessons
already get elevated into `logic-engine.md`/`ui-style.md` from (see e.g. the private-hand-sync
and MDLM readiness-gate lessons already in `logic-engine.md`, both elevated from a specific
game's notes). This file is for bugs that were never a specific game's to own in the first
place.

---

## Design Decisions

**DD-03 — `bindCardHold` / `refHighlightRow` extracted to `engine.js` (FLW gem-seam plan Task 4, 14 Aug 2026).**
Tap-hold-to-gallery (`ui-style.md` § Tap-Hold Reference) had shipped twice already — `pkoBindChainHold`
and `shpBindCardHold` were near-identical hand-rolled `touchstart`/`mousedown` timers with their own
`scrollIntoView` + ping-class blocks. A third user (FLW) earned the extraction: `bindCardHold(el,
onHold, ms=500)` and `refHighlightRow(box, attr, id, pingClass, ms=1600)` now live in `engine.js`,
and all three games' own bind functions are one-line delegates (`[abbr]BindCardHold(el, id) =>
bindCardHold(el, () => [abbr]OpenHowTo('[tab]', id))`).
**PKO gained a real fix as a side effect of the extraction — `touchmove` was never wired to cancel
the hold.** SHP's original implementation cancelled on `touchmove` (a scroll starting on a card
correctly aborts the hold-timer); PKO's did not, so a scroll gesture that happened to start on a
card could fire the gallery open mid-scroll. Extracting to one shared function meant picking ONE
behaviour — SHP's (the correct one) — so PKO inherited the fix for free rather than needing its own
patch. Root cause is engine-level (the shared function's own listener set), which is why this entry
lives here and not in `pko-implementation-notes.md` (one-line pointer left there).

**DD-02 — Universal click-outside-to-dismiss for every overlay (14 Aug 2026).**
Every overlay in the app needed a scroll-to-the-bottom tap to close — a single delegated
`click` listener in `engine.js` now closes any overlay when the tap lands on its backdrop
dead space (`e.target === el`, matching the art viewer's pre-existing pattern). Rather than
hiding the overlay directly, it finds and `.click()`s the overlay's own neutral button
(id matching `/(?:^|-)(cancel|close|done|ok|dismiss)(?:$|-)/i`, visible via `offsetParent`)
so every overlay's existing cleanup (LI5's turn-timer resume on quit-cancel, tab-scoped
close buttons, scroll resets) runs unchanged — nothing duplicates that logic. Overlays are
found generically via `[id$="-overlay"].fixed`, which covers all 134 overlays in the app
(old and new markup alike) with one exception (`pause-overlay`, not a real backdrop, excluded
automatically since it isn't `.fixed`) — no per-overlay wiring or `index.html` edits needed
except one: `dyb-slick-picker-overlay`'s Cancel button used an inline `onclick=` with no
`id`, so it got one (`btn-dyb-slick-picker-cancel`) to participate.
**Deliberately excluded by construction, not a denylist:** any overlay whose only buttons are
a real decision — GM's `gm-near-sync-overlay` (Accept/Reject a proposed match), `gm-boost-overlay`
(Confirm a Boost), `bld-pass-reveal-overlay`/`flw-emerald-overlay`/`pko-carrion-overlay` (pass-
the-phone reveal confirms), `review-overlay` (Next) — has no neutral cancel/close/done/ok
button, so the generic handler no-ops there. This is required by the Pass-the-Phone Safety
Gate (`logic-engine.md`) — those overlays must not be dismissible by an accidental outside tap.
A `bg-stone-200`-class fallback was considered and rejected: `gm-near-sync-overlay`'s "Reject"
button is styled neutral-stone (the *secondary* choice) but is itself a real game decision, not
a harmless dismiss — a class-based heuristic would have fired it on an accidental outside tap.
Verified live via `visual-check` (Playwright): sound overlay, LI5 How to Play, and LI5 quit-confirm
all close on backdrop tap with their normal cleanup; `gm-near-sync-overlay` correctly stays open.
**Changed:** `js/engine.js` (removed the art viewer's now-redundant dedicated backdrop handler,
folded into the generic one), `index.html` (one `id` added to `dyb-slick-picker-overlay`'s Cancel
button, no other markup changes).

**DD-01 — Skin packs can override display text, not just art (`assetName`).**
Card *art* and card *names* were always separate skinning concerns by construction (`js/lib/art.js`'s three-tier `assetFace`/`assetBack`/`assetExtra` resolve images only), but text had no equivalent — a full re-skin (PKO's Dinosaurs pack wanting "Titanosaur" instead of "Elephant") had no way to reach the name without editing the game's own data file, which would have renamed the animal for every skin and the base game too. `assetName(kind, id, fallback)` fills the gap: skin-tier only (no core-art tier — a game's default names are canonical and only a skin opts out), text not a path. First adopter: PKO's `pkoCardName(id)`, already every animal-name display site's single choke point, now routes through it with one function change.
**Changed:** `js/lib/art.js`. **Deferred:** every other skinnable game (FRT/SHP/FLW/PASS/DYB) can adopt `names` for free by routing its own name-display call sites through `assetName` — none have yet, PKO is the only user so far.

---

## Bug Index

**BUG-01 — The Secret Mode Terminal never ran a game's own lobby-entry side effects, leaving lazily-loaded game data (and `activeGameId`) unset. [11 Aug 2026, found testing PKO's Dinosaurs skin]**
*What happened:* selecting a PKO skin pack in the Konami Terminal and navigating straight to How to Play → Animals showed no rows at all — not even the mode-note text.
*Root cause:* PKO's chain data (`data/pko-data.json`) is fetched lazily, deliberately deferred to lobby entry rather than boot (see `pko-implementation-notes.md` DD-07) — the fetch fires from the `#btn-pko` click handler, which also sets `activeGameId`. The Terminal's launch path in `secret-mode.js` navigates straight to `game.screen` via `showScreen()` and never runs any per-game entry handler, so `pkoChain` stayed `null` and `pkoRenderChain()`'s `if (!body || !pkoChain) return;` guard fired silently. `activeGameId` was also left unset on this path for **every** game launched via the Terminal, not just PKO — a second, quieter bug (wrong sound-overlay theming) riding the same gap.
*Fix:* the Terminal's launch block now sets `activeGameId = game.id` and calls `pkoLoadChain()` when `game.id === 'pko'`, mirroring what `#btn-pko` does. No other terminal-listed game (li5, gm, ss, jec, nat, frt, shp, flw, pass, dyb) has an equivalent lazy per-game loader today, so no other game needs a call here yet.
*Lesson:* any lobby-entry side effect gated behind a game's own `#btn-[abbr]` handler is invisible to the Terminal, which is a second, independent entry point into the same screens. A game adding a new lazy loader in the `#btn-pko` pattern must also add itself to this same Terminal launch block — worth a `game.onEnter` hook if a third such loader ever appears (still ad-hoc at one).

**BUG-02 — The Terminal's ← BACK button was silently unreachable once the page scrolled past it; deeper navigation levels had no back button at all; and going back re-appended breadcrumb lines instead of removing them, so the log grew without bound. [11 Aug 2026, found testing PKO's Dinosaurs skin]**
*What happened:* testing the Dinosaurs skin via Konami Terminal → GAME SKINS → PKO → skin selection → the launch-armed ("ARMED") screen, there was no way back except closing the app. A first attempted fix (`position: sticky` on the header) made no visible difference. After adding proper back buttons, wandering forward/back/forward a few times made the log grow indefinitely (the same "SELECT GAME:" line appearing three times after two round trips).
*Root cause, three compounding bugs:*
1. `smRenderSkins()` (Select Skin) and the launch-armed view never got a "[←] BACK" list entry — only the *first* drill-down level under a category (Select Game/Select Pack, via `smAppendBackButton`) had one; everything deeper relied solely on the header's ← BACK.
2. That header button's own `sticky top-0` fix didn't work either: `#screen-secret-terminal` carried `overflow-y-auto` while also being `min-h-screen` (a floor, not a ceiling) — its content simply grows the box rather than ever overflowing it internally (`scrollHeight === clientHeight`, always, verified in a real headless browser). `overflow-y: auto` still establishes a CSS scroll container regardless of whether anything is currently overflowing it, and `position: sticky` binds to the *nearest* such container — so the header stuck relative to a scrollport that never itself moved, while the actual visible motion was happening one level further out, at the real page/viewport scroll.
3. Every forward-navigation function (`smSelectCategory`, `smSelectSkinGroup`, `smSelectSkin`) only ever **appended** its own "SELECTED"/"ARMED" breadcrumb lines to `#sm-terminal-log`, and every "return" function appended its own line on top rather than removing what the forward step had written — so the log grew on every round trip, however many times the player wandered back and forth.
*Fix:* `smAppendBackButton(wrap, handler)` now takes an optional one-step-back handler instead of always jumping to categories; `smRenderSkins()` gets `smReturnToSkinGames()`, and the launch-armed view gets a new `[←] BACK` button (positioned *above* `[ LAUNCH SEQUENCE ]`, matching every other level) wired to `smReturnFromLaunch()` — shared by both the skin and word-pack flows since they share one `#sm-terminal-launch-wrap`, branching on whether the active expansion `isAsset`. Dropped the inert `overflow-y-auto` from `#screen-secret-terminal` entirely, letting `position: sticky` bind to the real page scroll. Log growth fixed with a small LIFO checkpoint stack — `smLogCheckpoint()`/`smLogRewind()` — a forward step pushes the log's current length before writing, a return pops and truncates back to it instead of appending, so the log always shows only the current path.
*Verification:* driven in a real headless Chromium session (not a `tools/verify-*.js` harness — none of them touch the Terminal or do layout), asserting `getBoundingClientRect()` after an actual `mouse.wheel` scroll, confirming a genuine Playwright pointer `.click()` (which fails if the target isn't actually visible/actionable, unlike a programmatic `el.click()`) lands on the header button post-scroll, and walking a multi-step wander-forward-and-back sequence to confirm the log stays at a fixed length.
*Lesson:* a `position: sticky` fix that "looks right" in markup can be silently inert if an ancestor's `overflow` property establishes a scroll container that itself never scrolls — the visible motion the user sees can be happening on a *different* ancestor than the one sticky is bound to. Confirming a CSS fix like this needs a real scroll (`mouse.wheel`, not a programmatic click that bypasses visibility) and a `getBoundingClientRect()` check, not just visual inspection of the class list. Separately: any UI that writes an append-only log/breadcrumb as the user navigates needs an explicit undo mechanism for "back," not just a forward-only writer — the growth is invisible in a quick test and only shows up after genuine wandering, which is exactly how a real user (not a scripted test) behaves.

**BUG-06 (suite-wide sweep) — three games had an unguarded SYNC applier that Firebase's empty-collection erasure could break; two more had lower-risk instances hardened while auditing. [13 Aug 2026, `deferred-work.md` "BUG-06 class audit"]**
*What happened:* an Explore-agent audit of every game's `HandleEnvelope`/`mpHandleEnvelope` SYNC appliers (the class of bug CJAR's own BUG-06 established, `logic-engine.md` § "Firebase erases every EMPTY value") for direct payload-to-collection assignments with no `|| []`/`|| {}` fallback.
*Confirmed live risks:*
1. **LTTP** — `lttpDecoys` is set to `[]` by `lttpNarrowHighlights()` at Plan 2 (`js/games/lttp.js`), which is a step **every** match reaches, then broadcast and applied unguarded (`lttpDecoys = [...p.decoys]`) at both `LTTP_GAME_START` and `LTTP_PLAN_UPDATE` in `engine-multiplayer.js`. `[...undefined]` throws — guaranteed crash on a client mid-match, not an edge case.
2. **GTH** — `gthAllDiagnoses[payload.playerIdx] = payload.diagnoses` (`gth.js` `GTH_DIAGNOSES_SUBMIT` applier): a player who runs out of time before diagnosing a single case sends `diagnoses:[]`, which Firebase erases; the slot was set to `undefined` instead of `[]`, breaking `gthResolveScores`'s iteration over it.
3. **NT** — `ntPtpPlacements = payload.allPlacements` (`nt.js` `NT_PLAYBACK` applier): a player who spends no build inventory in a cycle submits `placements:[]`; Firebase drops that one array entry, turning the whole `allPlacements` array into a hole-having object keyed by index rather than a plain array, and the very next line's `.map()` throws.
*Also hardened (lower risk, no live-play trigger found, but same unguarded shape and one-line to fix):* DSD's `dsdSequence = env.payload.sequence` (crew's tap sequence — currently gated non-empty by its own submit-button UI, but the applier itself had no fallback), JEC's `jecInputs = p.jecInputs.map(...)` (per-seat `[v1,v2,v3]` arrays, structurally near-impossible to be empty but unguarded). PASS's `PASS_GAME_START` applier carried a stray **second, unguarded** `passChips = payload.chips.map(c => c)` immediately after an already-correctly-guarded `passChips = (payload.chips || []).map(...)` one line above — deleted the redundant line rather than guard it twice.
*Not touched:* GM, BLD, SS, and DYB's remaining unguarded assigns — audited and judged structurally non-empty at every broadcast point (fixed player-count arrays, or collections that can't be zero-length by the time the round state that carries them resolves). FRT/SHP/FLW/PKO already use per-seat normaliser helpers matching the CJAR reference pattern and needed no changes.
*Fix:* `[...(p.field || [])]` / `Array.from({length: N}, (_,i) => (p.field && p.field[i]) || [])` at each confirmed site — same idiom `logic-engine.md` already documents, just applied where it was missing. NT's fix rebuilds per-seat (`Array.from`) rather than a flat `|| []`, since the risk there is a *hole inside* the array, not the whole field being absent.
*Verification:* syntax-checked all five touched files (`node -c`); re-ran `verify-cjar-dd.js` (47) and `verify-cjar-loop.js` to confirm the CJAR-adjacent edit in the same sweep didn't regress. **LTTP/GTH/NT/DSD/JEC/PASS have no `tools/verify-*.js` harness** (only CJAR/PKO/DYB/SHP do — see `CLAUDE.md` § Verification harnesses), so these fixes are unverified by any automated MP-shaped check; they haven't been played live either. Flag for the retest backlog when each game comes up.
*Lesson:* the audit only found live risk in games whose collection field can legitimately be **empty at the moment it's broadcast** — a player who does nothing (times out, spends no inventory, narrows to zero decoys) is the trigger, not player *count* going to zero. When auditing a new game's SYNC appliers for this class, ask "can a participating player's contribution to this field legitimately be empty?" before "is this array ever unguarded?" — the latter is true almost everywhere and isn't itself the signal.

---

## Multiplayer Lessons

*(none yet — this section exists so the four-section shape matches every per-game file; see the Implementation Notes skill in `CLAUDE.md`)*

---

## Template Gaps

*(none yet)*
