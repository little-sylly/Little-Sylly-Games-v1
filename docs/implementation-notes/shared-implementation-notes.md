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

---

## Multiplayer Lessons

*(none yet — this section exists so the four-section shape matches every per-game file; see the Implementation Notes skill in `CLAUDE.md`)*

---

## Template Gaps

*(none yet)*
