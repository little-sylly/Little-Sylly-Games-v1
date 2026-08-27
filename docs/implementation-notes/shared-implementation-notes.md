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

**DD-04 — Fredoka self-hosted; the "deliberate offline exception" is deleted, not documented (SW v205, 19 Aug 2026).**
The brand font had loaded from Google Fonts since the start, with a ~5-line paragraph in **two**
always-loaded rule files explaining why that was acceptable ("self-hosting would require woff2
files, a local `@font-face`, and precache entries"). The stated cost turned out to be almost
nothing: Fredoka is a **variable** font on Google's `css2` endpoint, so `wght@400;600;700` all
resolve to the *same* woff2 per subset — **one 29 KB latin file + one 4.6 KB latin-ext file covers
the whole 300–700 range**, versus the three separate static files the paragraph assumed.
**What changed:** `fonts/` (2 files), `@font-face` × 2 with the original `unicode-range` values
copied verbatim from Google's stylesheet (so the subset split and lazy latin-ext fetch behave
identically), the three `<link>` tags deleted from `index.html`'s head, both files added to
`PRECACHE_URLS`, `CACHE_NAME` → `sylly-games-v205`.
**Lesson — an "acceptable exception" is worth re-costing before you document it a second time.**
The paragraph was written once and then maintained forever in two auto-loaded files; the actual fix
took one download and four edits, and it *removed* a runtime third-party dependency rather than
adding weight. When a doc paragraph exists purely to justify a limitation, that is a signal to
re-check the limitation, not to polish the paragraph.
**Verification worth copying for any future asset-caching change:** `document.fonts.check()` alone
proves nothing about offline. The real test is (1) load once so the SW precaches, (2) `setOffline`,
(3) **prove the network is actually dead** — `fetch()` a deliberately un-precached URL and require
it to throw — then (4) reload and re-check. Without step 3 a "passing" offline test may just be a
test where offline mode never engaged. Confirmed here: cache `sylly-games-v205` holds both files,
un-precached fetch throws, Fredoka still renders, zero requests to `fonts.g*.com`.

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

**BUG-07 — A client whose HANDSHAKE hadn't been processed into the host's roster snapshot before `GAME_START` fired got `mpMyPlayerIdx = -1`, silently corrupting shared state instead of failing visibly. [15 Aug 2026, found live-testing NT MDLM with 3 players — 1 host, 2 clients]**
*What happened:* host + 2 clients in an NT lobby; host clicked "Start Game" while (it's believed) the third player's join was still completing. That device ended up showing itself as **"ADMIN-0"** — the literal string `'ADMIN-' + (mpMyPlayerIdx + 1)` produces with `mpMyPlayerIdx = -1` — while the other two devices proceeded as if only 2 players existed. The affected device stayed visually "tied to" the host (each of its actions appeared to route through/require the host), the build screen went blank ("black terminal") for the two non-host devices for one round, self-corrected the round after, and the final System Logs showed only 2 of 3 players for the first 4 rounds before showing all 3 on the last.
*Root cause:* `engine-multiplayer.js`'s `GAME_START` client-side applier (`mpHandleEnvelope`, `env.payload.action === 'GAME_START'`) computed `mpMyPlayerIdx = slots.findIndex(p => p.uid === window.syllyDeviceUid)` with **no fallback for `-1`** — unlike the *host's* equivalent computation in `mpConfirmRoster()`, which already guards this with `if (mpMyPlayerIdx < 0) mpMyPlayerIdx = 0;`. A `-1` index left every array this device later touched (`ntGateReadyCheck[mpMyPlayerIdx]`, `ntPtpPlacements[mpMyPlayerIdx]`, `ntPlayerNames[mpMyPlayerIdx]`, and the equivalents in every other MDLM game — this is generic engine code, not NT-specific) silently writing to a non-index object property instead of a real array slot, which every array method (`.every`, `.map`, `.forEach`) then skips over.
*Why "assume seat 0" (the host's own fallback) is wrong for a client:* the host's fallback is defensible only because the host, by construction, always **is** slot 0 — it's genuinely "assume I'm the host," which is trivially true when it's the host's own code running. Copying that same fallback onto the client side would have been actively harmful, not protective: it would make a late-joining client's device *impersonate the host's own seat*, which is a very plausible explanation for the "tied to the host" symptom actually observed.
*Fix:* the client-side applier now checks `myIdx < 0` explicitly and, on a miss, shows a new dedicated overlay (`mp-roster-mismatch-overlay` — "Match Already Started") and returns *without* calling `mpActiveGameConfig.onPassThePhone()`, instead of silently proceeding into the game with a broken index. The overlay's only button calls `resetToLobby()`. Added to `resetToLobby()`'s overlay-teardown list in `engine.js` alongside the other `mp-*-overlay`s.
*Not yet fixed — the actual race:* this closes the silent-corruption failure mode (a device can no longer end up playing with a broken index), but does **not** address *why* the host's `mpPlayerSlots` snapshot could be missing a player who believed they'd already joined and named themselves. `mpConfirmRoster()` reads `mpPlayerSlots` synchronously at click-time; a `HANDSHAKE` envelope for a very-recent joiner is processed asynchronously via the events channel (`mpHandleEnvelope`, `env.type === 'HANDSHAKE'`, which does `mpPlayerSlots.push(...)`) and there's no synchronisation between "did every currently-connected client's HANDSHAKE actually land before I read this array." A tighter fix would re-read the live `/rooms/{code}/players` node at confirm time rather than trusting the host's in-memory snapshot — not implemented here since it's unverified without live reproduction and touches the same host-side confirm path every MDLM game depends on. Flagged for the deferred-work retest backlog.
*Verification:* syntax-checked (`node -c`) only — this is unverified by any live multi-device session or by any `tools/verify-*.js` harness (all of which run in `'single'` mode and can't reach this code path at all, since it only fires on a real client receiving a real Firebase envelope — see `logic-engine.md` § Verification harnesses "blind spot"). Needs a genuine 3-device retest, ideally with a deliberately-delayed third join, before this can be called closed.
*Lesson:* when a codebase already has a defensive fallback for a failure mode in one place (here, the host's `if (idx < 0) idx = 0`), check whether the *parallel* code path (the client's mirror-image computation) has the same guard before assuming symmetry — and check whether the same fallback value is even correct on both sides. It wasn't here: "assume slot 0" is safe reasoning for code that only ever runs as the host, and unsafe reasoning for code that runs as a client.

**BUG-06 addendum — the sweep's method is structurally blind to collections NESTED inside an assigned object, and NT was carrying two of them. [15 Aug 2026, found root-causing an NT MDLM 3-player desync]**
*What happened:* the 13 Aug BUG-06 audit swept every game's SYNC appliers and declared NT clean after one fix (`ntPtpPlacements = payload.allPlacements`). A live 3-device NT session two days later produced blank build grids and unreachable playback on clients — **two more instances of the identical class**, in the same file, that the sweep had walked straight past.
*Root cause of the MISS (the part worth keeping):* the audit's search shape was "find appliers that assign a payload field directly to a state collection without `|| []`". Both NT defects pass that test cleanly:
- `ntNode = payload.node` — assigns an **object**, not a collection. The erased field is `node.nativeHoneypots`, one level down.
- `ntPtpTimelines = payload.timelines` — assigns an array **of objects**, and the array itself is never empty. The erased fields are `timelines[i].fires` / `.slowSpans`, **two** levels down.

An applier-level scan cannot see either. The erasure lands wherever a *leaf* collection sits in the payload tree, and the assignment at the top of that tree looks entirely healthy.
*Why they survived so long anyway:* both are **client-only and probabilistic**. The host never round-trips its own state through the wire, so a host-side playtest is clean by construction; and both triggers are ordinary-but-not-constant (`convertN` rolling 0 for the node, a player placing no honeypots for the timeline), so they present as random intermittency rather than a reproducible bug. NT also had **no** `tools/verify-*.js` coverage at all, and even the harnesses that do exist elsewhere run `'single'` mode with `getElementById: () => null`, which executes no render code — and both defects throw *inside render functions*.
*Fix:* per-shape normalisers applied where the object arrives (`ntNormaliseNode`, `ntNormaliseTimeline` in `js/games/nt.js`) plus `|| []` at the previously-unguarded read sites. Detail: `nt-implementation-notes.md` BUG-15/BUG-16.
*Lesson — how to run this audit properly next time:* scan by **payload shape, not by applier line**. For every SYNC packet, walk the payload tree the *producer* builds and list every leaf array/object, then ask of each one "can this legitimately be empty at the moment it is sent?" — that finds nested leaves an applier-level grep never will. Two concrete tells that a nested leaf is at risk: (1) its length is decided by a random roll or a player doing nothing, and (2) the same field is guarded with `|| []` somewhere else in the file — an inconsistent guard is direct evidence that someone already hit the empty case on one path and patched only that one. NT had `|| []` on five of seven reads of the same two fields, which in hindsight was the loudest possible signal.
*Not yet done:* the other games' SYNC payloads have **not** been re-swept under this shape-based method. PKO, FLW, SHP and CJAR all broadcast nested per-seat objects and are the obvious candidates. Tracked in `docs/deferred-work.md`.

---

## Multiplayer Lessons

### ML-01 — A lobby bound that reads game state reads it before the game has run [23 Aug 2026, SW v210]

*What happened:* five games (SS, JEC, YGI, LTTP, DSD) capped their Lobby Mode rooms below what
their own Pass-the-Phone setup offered — JEC/YGI at 4 instead of 6, LTTP at *exactly* 4, SS and DSD
at 2v2 instead of 3v3. A 5th player's join was rejected with nothing anywhere explaining why.

*Root cause:* `getMaxPlayers`/`getMinPlayers` in `MP_GAME_CONFIGS` resolved against a game-local
setup variable — `ssPlayerCount`, `jecPlayerCount`, `ygiPlayerCount`, `lttpPlayerCount`,
`dsdPlayersPerTeam`. Every one of those variables is moved by count pills on a **setup screen that
Lobby Mode skips entirely**, so at the two moments a bound is actually read —
`mpRenderHostPlayerList()` while the room fills, and the room node's `maxPlayers` at create time —
the variable is still sitting at its declared default. Each game's `onPassThePhone` *does* overwrite
it from the roster, but that runs after the lobby has already filled, which is exactly why the bug
looked fine in code review: the assignment is right there, just at the wrong end of the timeline.

*Lesson:* **a lobby bound is not a game setting; it is a property of the game.** Return the true
range as a constant. The only extra input that can be correct is `window.mpLobbyStyle` (a TLM room
is 2 devices where an MDLM room is N) or a **pre-lobby** setting chosen on the game menu before the
room exists (FRT's `frtPearOff` — the sole legitimate instance, and it is on the allow-list in
`tools/verify-mp-configs.js` § 3 with its reason). Anything a *setup or roster* screen sets is not.

*Second lesson, about the deferred list itself:* four separate `deferred-work.md` entries proposed
the same fix — "read the roster's live size during lobby-fill rather than a game-local variable" —
and it was **wrong**. A cap cannot be the roster's size; the roster is the thing the cap constrains.
Four independent write-ups converging on a plausible-sounding fix is not evidence the fix is right:
each one was copied from the last. When an entry repeats across games, re-derive the fix once at the
top rather than inheriting it.

---

### ML-02 — "Everyone is assigned" is not "the teams are valid" [23 Aug 2026, SW v210]

*What happened:* found while raising SS's and DSD's caps to 6. `mpRosterCheckConfirm` enabled Start
Game as soon as `mpRosterPendingTeamIdx.every(t => t >= 0)` — every player assigned *somewhere*. It
never compared the two teams' sizes, so a host could confirm 3v2. With the old max of 4 it could
confirm **4v0**.

*Root cause:* both games derive their per-team size from **team A alone** —
`ssPlayerCount = ssPlayerNamesA.length`, `dsdPlayersPerTeam = dsdPlayerNames[0].length`. Team B
inherits that number and is silently mis-sized. Nothing errors; the game just deals wrong.

*Lesson:* a completeness check (`every`, `.length === n`, `.every(Boolean)`) is not a validity
check. Where a game's arithmetic depends on a *relationship* between two collections, assert the
relationship, not the fill. This is the same failure family as the `[].every()` vacuous-truth gate
in `cjar-impl-notes` BUG-05: the predicate was true, and true meant nothing.

*Fix:* `rosterConfig.requiresBalancedTeams: true` on the two balanced-team games, gating both ends —
the host lobby CTA rejects an odd roster before the roster screen is ever reached, and
`mpRosterCheckConfirm` requires `|A| === |B|`, with an amber reason line in `#mp-roster-hint`. Both
gates read one shared predicate, `mpRosterNeedsBalance()`, so a third team game opts in with one
config key.

---

### ML-03 — A rule scoped to one mode gets read as "not my problem" by every other mode [23 Aug 2026, SW v210]

*What happened:* eight of the 18 games had no mid-game quit teardown at all — a leaver kept its
Firebase slot and every other device waited on a turn that never came. Ten games had been fixed
individually over the preceding months.

*Root cause of the *recurrence*, which is the interesting half:* the rule in `logic-engine.md` was
titled **MDLM** Mid-Game Quit Contract. LI5 and DSD are TLM games. Neither reads as "an MDLM game",
so the rule looked like someone else's section — yet the failure is identical, because the mode
label was never what mattered. What matters is only that a Firebase room exists and another device
is waiting on it.

*Lesson:* **scope a rule to the condition that causes the failure, not to the mode where it was
first observed.** The section is now § Mid-Game Quit Contract and covers every lobby session. Any
rule named after a mode deserves the same question: is the mode load-bearing, or just where someone
happened to be standing?

*Second lesson, about how the remaining three were found:* the identity-doc pass flagged five games
(LI5, GM, SS, JEC, YGI) by reading each doc in turn. LTTP, NAT and DSD had the identical
unconditional handler and were flagged by **none** of them. Reading eight documents one at a time
finds a bug class; it does not find the class's full membership. Once a pattern is named, grep the
suite for its *shape* before scoping the fix — that is what turned "5 games" into "8 games, and 5
not 4 for the bounds bug" before any code was written.

*Fix:* one generic engine helper, `mpNotifyPlayerLeft()` → `MP_PLAYER_LEFT`, handled in
`mpHandleEnvelope` **before any per-game routing** so a game needs no handler of its own. The ten
per-game `[ABBR]_PLAYER_LEFT` implementations that predate it each do exactly what the generic path
does; they still work and were deliberately not swept, but that ten-fold duplication is precisely
what let the eleventh through eighteenth games forget it entirely. **When the same handler is written
identically for the third time, it belongs in the engine.**

---

### ML-04 — The declarations layer had no harness at all [23 Aug 2026, SW v210]

*What happened:* both bugs above were live in shipped code while 14 verification harnesses passed.

*Root cause:* every `tools/verify-*.js` drives one game's *rules*. Nothing tested the layer above
them — `MP_GAME_CONFIGS`, which the mode and lobby screens read directly for all 18 games. A wrong
declaration there is wrong before a packet is ever sent, so even a loopback would not have caught
it: the loopbacks construct their own seats and never consult the lobby bounds.

*Lesson:* **a harness that runs the game cannot check the contract that decides whether the game can
start.** `tools/verify-mp-configs.js` fills the gap: entry schema, bounds sanity, **bound purity**
(source-level — a bound may name nothing but `window.mpLobbyStyle`), agreement with each game's own
Pass-the-Phone count pills in `index.html`, the balanced-teams invariant, and the quit contract,
across all 18. It runs no game logic and sends no packets by design.

Two details worth copying into the next harness of this kind. **(1)** It takes `MP_SRC=`, following
`CJAR_SRC=`/`NT_SRC=`, so pre-fix `engine-multiplayer.js` can be driven through the same checks —
it fails on `git show HEAD:` and passes on the fix, which is the only way to know an assertion is
load-bearing rather than tautological. **(2)** Where a real divergence is deliberate it is an
explicit named exception with its reason inline (`ALLOWED_SETTINGS.frtPearOff`,
`PILL_EXCEPTIONS.nat`) and prints as a `note`, never a silent skip. A harness that ships red trains
people to ignore it; a harness that quietly skips is lying.

---

### ML-05 — Two team-assignment mechanisms drifting apart is a UX bug config checks can't see [25 Aug 2026]

*What happened:* a 3-device MDLM playtest of SS reported "MDLM only accepts 2 devices" — but
`getMaxPlayers()` was already correctly returning 6 (verified via `verify-mp-configs.js`, all green).
The real bug was upstream of any config value: SS's `rosterConfig.type` was
`ls => ls === 'team' ? 'none' : 'teams'`, so TLM (`mpLobbyStyle === 'team'`) skipped the Assign Spots
roster screen entirely and relied instead on `mp-host-prelobby-overlay`'s "This device / Other
device" swap block — a device-based, exactly-2 team-assignment mechanism baked into the *pre-lobby*
markup, shown unconditionally for every game with `showTeamNamesInPreLobby: true` regardless of
`mpLobbyStyle`. Testing TLM (which genuinely does cap at 2) right next to MDLM under a UI that never
distinguished the two read as "MDLM is capped at 2" even though the config layer was never wrong.

*Root cause, the sharper version:* the codebase had **two independent team-assignment systems** —
the device-swap block (pre-lobby, 2-device-only, TLM-shaped) and the Assign Spots roster screen
(post-lobby, N-device, drag-into-zone, already used by every MDLM team game). DSD's
`rosterConfig.type` was already unconditionally `'teams'`, so DSD's device-swap block and its
`mp-prelobby-captain-names` text inputs were **already fully dead** — captains there are decided by
the roster screen's ⚓ picker (`mpRosterPendingCaptain`, applied in `mpConfirmRoster`'s `'teams'`
branch), and `window.mpLobbyRosterCaptainNames` was written but never read outside the `'none'`
branch, which DSD's config never reaches. A shared prelobby overlay had accreted a second, unused
input surface with no harness or grep pattern that would ever flag "these fields are typed into and
silently discarded."

*Fix:* SS's `rosterConfig.type` → `'teams'` unconditionally, matching DSD — TLM's 2 devices now go
through the same Assign Spots screen as MDLM's N devices (trivial for 2, but one mechanism instead
of two). Removed the device-swap block and the captain-name text inputs from
`mp-host-prelobby-overlay` entirely (`mpUpdatePrelobbyDeviceLabels`, `btn-mp-prelobby-swap`,
`mp-prelobby-captain-*`, and the `window.mpLobbyRosterCaptainNames` population at room creation) —
team assignment is a single global mechanism for both lobby styles now. The prelobby overlay keeps
only nickname entry and the Team A/B *name* text inputs (still legitimate — they seed the roster
screen's own name inputs via `window.mpLobbyRosterTeamNames`).

*Lesson:* **when two mechanisms do the same job for different subsets of games, a report that reads
like a hard cap can actually be a framing/consistency bug the config layer is blind to.**
`verify-mp-configs.js` proved the *numbers* were right; it has no way to know a screen shown to the
host implies a different (wrong) mental model of which mode is running. The generalisable check
before trusting a config-level harness's all-green result: **grep for a second implementation of the
same concept** (here, "team assignment") rather than assuming the number that's wrong must live
where the report points.

### ML-06 — A Phase-22 game's inline packet handlers are unreachable from a harness [27 Aug 2026, SW v211]

*What happened:* JEC's rework needed a two-device loopback (`tools/verify-jec-loopback.js`), and
there was nothing to call. The eight Phase-22 games keep their packet handlers as an **inline
`if (mpActiveGame === 'x') { … }` block** inside `mpHandleEnvelope` in `js/engine-multiplayer.js`,
rather than as a named function. A harness can load the file and drive the game's own logic, but it
cannot reach a block that only exists partway down a 200-line conditional.

*Root cause:* the inline shape predates loopback harnesses entirely. Nothing was wrong with it while
the only verification was single-mode; it became a blocker the moment "prove the packet contract"
turned into a real requirement.

*Resolution:* the JEC block was extracted to `function jecHandleEnvelope(env)`, still **in
`engine-multiplayer.js`** — the Phase-22 file layout is deliberately preserved — with the inline
block reduced to a one-line call. That is the whole change, and it is what made 164 loopback checks
possible.

*Lesson:* **the other seven Phase-22 games (LI5, GM, SS, YGI, LTTP, NAT, DSD) are one extraction each
away from being loopback-testable.** Do that extraction as the *first* step of any rework touching
one of them, not as a discovery midway through. It costs a function declaration and a call, changes
no behaviour, and turns the tier of verification that catches host/client divergence from
"unavailable" into "available". Do **not** move the handlers into the game's own plugin file — the
extraction is about reachability, not relocation.

---

## Template Gaps

### A doc-verification harness must require a BOUNDED match, not a substring

**What happened.** `tools/verify-identity-docs.js` (identity-doc pass 1) checked each quoted UI
string with `hay.includes(needle)`. Its `--self-test` passed, and all 102 strings in the first real
document passed on the first run. Adversarially corrupting three real strings then showed it caught
only one: changing `Raid the Jar!` to `Raid the Jar` sailed through, because the truncation is a
substring of the truth.

**Root cause.** Two separate gaps, and the second is the interesting one. (1) Substring semantics
accept every truncation. (2) The self-test planted **invented** strings — "Grab The Biscuit Tin" —
which only proves the checker is not blind. It says nothing about whether the checker is *precise*,
because an invented string fails under both correct and sloppy matching.

**Lesson.** For any checker that asserts "X still exists in the source", assert a **bounded** match:
every occurrence must have whitespace, a tag bracket, or a quote on both sides, and at least one
occurrence must be clean (scan all of them — "Dob" is unbounded inside "Dobbed." and bounded as its
own button label). And build the self-test from **corrupted real strings**, not invented ones —
truncation, changed case and the wrong apostrophe are the errors that actually happen. Invented
strings test the floor; corrupted real ones test the ceiling.

**Residual, measured and documented in the tool's header rather than chased:** a truncation landing
on a word boundary whose shorter form is itself a bounded prefix of another real string still
passes (`Waiting for the host` survives because `Waiting for the host to open the jar…` contains it).
Closing that needs a real HTML/JS parser, which this tool deliberately does not carry.

### "Free to reword" is not "free to be wrong"

**What happened.** The identity-doc change contract classifies each section **free** (no code reads
it), **paired** (doc and code must change together) or **derived** (code first). The first draft of
CJAR's T1 Pitch — a **free** section — described players choosing about the card they had just seen.
That contradicts `cjarApplyCardEffect` ("applies its OWN effect — before anyone chooses… the
ordering is load-bearing") and contradicted the same document's own T3 two sections later. The owner
caught it; no tool could have.

**Root cause.** "Free" was written to mean *safe to edit* and was read as *low-stakes*. But the free
sections are exactly the ones with **no mechanical guard**: the harness covers quoted copy, and
derived facts are checkable against source. Prose about how a game plays is checked by nobody.

**Lesson.** State the truth constraint explicitly in any tiering scheme like this — free means free
of *coupling*, never free of *accuracy*. Practically: when a free section makes a claim about how
the game works, verify it against the code the same way a derived fact would be, and check it
against the document's own other sections, which is where this contradiction was visible.

### A bug index with no closure step rots into fiction — in the safe direction, which is why nobody notices

**What happened.** The identity-doc migration read every game's impl-notes as source material. Two
games' Bug Indexes turned out to be substantially wrong. **GM:** G4 (Lobby Mode near-sync silently
discarding the round), G5 (host/client mismatch phrases diverging) and G6 (quit overlay in the wrong
brand colour) all read "(open)" — all three are fixed in shipped code, and G4's fix even carries an
inline comment describing precisely the remedy its note proposes. **LI5:** L6 (deck panel behind its
own opener), L7 (phantom timer on quit-cancel) and L8 (Pinky Swear score desync) likewise read
"(open)" and are likewise all fixed, L7 with an explanatory comment and L8 with the exact sequential
re-clamp its note asks for. Six stale entries across two files.

**Root cause.** Entries are written at *discovery* time, when the finding is fresh and the writeup is
cheap. The fix lands later — often in a different session, sometimes as a drive-by inside unrelated
work — and by then the note is out of context and nothing prompts a return trip. The Documentation
Integrity Protocol has a step for *adding* an impl-notes entry; it has no step for *closing* one.

**Why it stayed invisible.** This decays in the direction that never causes a failure: a fixed bug
described as open costs nothing at runtime. It surfaces only when someone reads the index cold —
which, before the identity docs existed, essentially nobody did. The cost is paid later and by
someone else: a future session budgets time to investigate six bugs that do not exist, or worse,
"re-fixes" one and perturbs working code.

**Lesson.** When you fix something already logged in a Bug Index, close the entry in the same
response that ships the fix — the existing "same response" rule for *writing* an entry applies just
as much to *resolving* one. Mark it `RESOLVED [date]` with a one-line note on what closed it rather
than deleting it; the discovery record is the valuable half and the resolution line is what stops
the next reader re-opening the investigation. And treat any doc that only gets **appended to** as
structurally prone to this — a document nobody ever reads back is a document nobody ever corrects.
