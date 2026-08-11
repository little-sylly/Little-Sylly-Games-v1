# Decision Log — Little Sylly Games

**What this is:** A single, skimmable index of the *big* decisions — architectural, strategic, or process-level — so they can be reviewed, referenced, and revisited when something major changes. Newest entry on top.

**What this is NOT:** A deep record. Per-game bug detail lives in `docs/implementation-notes/`; full phase records (`phase[N]-snapshot.md`, **1 Aug 2026 onward: `docs/`**; earlier phases up to and including phase36: the **external archive folder, out-of-repo** — ask the owner for access); multiplayer detail in `docs/multiplayer-feature-specification-v1.4.md`. Each entry below is ~4 lines and *points* to the canonical detail — never re-explains it. "Detail:" pointers below that name a `docs/archive/…snapshot.md` path refer to that external archive; pointers to `docs/phase[N]-snapshot.md` (N ≥ 37) are in-repo.

**Canonical home:** This file (repo). Mirror to Confluence for browsing; the repo copy is the source of truth.

**Categories:** `Architecture` (how the app is built) · `Strategy` (goals / direction / brand) · `Process` (how we work).

**How to add an entry (do this whenever a change is architectural, strategic, or process-level):**
```
## YYYY-MM-DD (or Phase N) — Short title
Category: Architecture | Strategy | Process
Decision: One sentence — what was decided.
Why: One sentence — the reason.
Changed: Files/systems touched. Deferred/superseded: anything left open.
Detail: pointer to the canonical doc (snapshot / impl note / spec / memory).
```

---

## 2026-08-11 — Counting Sheep: Sleepwalkers folded into Sylly Mode
**Category:** Strategy
**Decision:** The ghost/Nightmare-Meter (Sleepwalkers) system is no longer an independent settings toggle — it now only activates when Sylly Mode (Night Terrors) is on, gated directly off `shpSyllyMode`.
**Why:** Owner playtest feedback: base-rules Counting Sheep shouldn't have eliminated players haunting the table via the Nightmare Meter — that belongs to the "advanced rules" tier alongside the Climb⇄Plunge inversion, not sitting next to it as a separate ON-by-default toggle.
**Changed:** `js/games/shp.js` (`shpSleepwalkers` deleted, all call sites read `shpSyllyMode`); `index.html` (standalone settings card + How-to step removed, folded into the Sylly Mode cards); `game-identities.md`. **Deferred:** none — clean removal, no packet/precache change.
**Detail:** `docs/implementation-notes/shp-implementation-notes.md` (2026-08-11 entry).

## 2026-08-11 — Skin packs can override card names (`assetName`), plus three Terminal navigation fixes
**Category:** Architecture
**Decision:** Skin packs gain an optional `names` block (id → display name), resolved by a new `assetName(kind, id, fallback)` in `js/lib/art.js` — text-only, skin-tier only (no core-art tier: default names are canonical). PKO's `pkoCardName(id)` — already the single choke point for every animal-name display site — now routes through it, so a Dinosaur skin can say "Titanosaur" instead of "Elephant" everywhere the name appears: Hoard labels, chain hints, log trail, Challenge rejection reasons, the Force of Nature event detail overlay, and the How to Play Animals tab — all previously had at least one literal `'Poacher'`/`'Eagle'`/`'Elephant'` string bypassing `pkoCardName` that a skin's rename couldn't reach. Also fixed three Secret Mode Terminal bugs found while testing this pack end-to-end: (1) the Terminal's launch path never ran a game's own lobby-entry side effects (`activeGameId`, PKO's lazy `pkoLoadChain()`), leaving How to Play's Animals/Diagram tabs empty until a match was started; (2) only the *first* drill-down level under a category (Select Game, Select Pack) got a "[←] BACK" list entry — the levels below it (Select Skin, the launch-armed view) had none, leaving only the header's ← BACK, which exits the Terminal entirely rather than stepping back one level; (3) that header ← BACK was *also* silently unreachable once the page scrolled far enough to reveal the Launch button — `#screen-secret-terminal` carried `overflow-y-auto` despite being `min-h-screen` (no max-height), so it never actually scrolled internally (`scrollHeight === clientHeight` always) while still establishing a CSS scroll container that `position: sticky` bound to instead of the real, page-level scroll that was actually moving content past the header.
**Why:** Art and text are separate skinning concerns — a re-skin project wanting full reflavouring (art + name) shouldn't require a game-data edit that renames the animal for every skin and the base game too. The Terminal's inert `overflow-y-auto` is the kind of bug that is invisible to code review (nothing about the class looks wrong) and invisible to every harness (none of them touch the Terminal or do layout) — it only surfaced by driving a real headless browser through the actual flow and measuring `getBoundingClientRect` against real scroll, which is what caught that a first sticky-header attempt (this same session, superseded here) fixed nothing because it fought the wrong scroll container.
**Changed:** `js/lib/art.js` (`assetName`); `js/games/pko.js` (`pkoCardName`, `pkoRenderCard`, `pkoRenderChain`, `pkoRejectionReason`, `pkoTrackReason`, `PKO_EVENT_DETAIL` — now functions, not strings, so they can resolve names at render time); `js/secret-mode.js` (launch block sets `activeGameId` + calls `pkoLoadChain()`; `smAppendBackButton` takes an optional handler; new `smReturnToSkinGames`/`smReturnFromLaunch`, the latter shared by both the skin and word-pack flows since they share one launch-armed view; a `smLogCheckpoint()`/`smLogRewind()` stack so the breadcrumb log shows only the current path instead of growing on every round trip); `index.html` (dropped the inert `overflow-y-auto`, kept the header `sticky top-0`; the launch-armed view's back button sits above Launch, matching every other level). Also created `docs/implementation-notes/shared-implementation-notes.md` — the first non-game-specific bugs/decisions had been getting logged under whichever game exposed them (PKO here), so this session's Terminal bugs became the first entries in a proper home for engine/secret-mode/art.js work; the Implementation Notes skill (`CLAUDE.md`) now routes there by root cause, not by which game was being tested. **Deferred:** the identical missing-back-button gap exists one level deeper in the word-pack flow (Select Generation, Select Game after a sub-category) — not fixed here since it wasn't reported and needs its own verification; `names` is currently PKO-only in practice (first user) — any other skinnable game can adopt it by routing its own name-display call sites through `assetName`.
**Detail:** `docs/implementation-notes/shared-implementation-notes.md` BUG-01/BUG-02, DD-01; `docs/implementation-notes/pko-implementation-notes.md` (PKO's own `pkoCardName` call sites).

## 2026-08-10 — A global art viewer, galleries for the last four seams, and a standalone art-authoring guide
**Category:** Architecture
**Decision:** Three things. (1) A single engine-owned **art viewer** — `openArtViewer(src, caption)` / `artMakeZoomable(el, src, caption)` + `#art-viewer-overlay` (z-[105]) — makes every gallery tile in every game tappable-to-enlarge; it is Pattern 2 geometry with an image body and is deliberately **unbranded**, because six games open it. (2) The How-to tab bar rolled out to **FRT, SHP, FLW and DYB**, closing the deferred gallery item; FLW's was a *fold* of its standalone `flw-gems-overlay`, not a new build. (3) Skin authoring became a first-class, Claude-Code-free workflow: `docs/art-authoring-guide.md` + `tools/make-skin-pack.ps1`.
**Why:** A card tile is 3–4.5 rem — a token, not a picture — so shipped artwork was effectively unviewable, and the owner had no way to author a skin without reverse-engineering dimensions from CSS. The `src` guard is the load-bearing detail: a tile with no resolved art gets neither the zoom cursor nor a handler, which turns the art viewer into a second, sharper signal for the offline install check.
**Changed:** `js/engine.js` (viewer + helper + `resetToLobby` teardown + a drive-by `getMuteToggleOnClass` fix — `frt` was missing, silently falling back to stone); `css/styles.css`; `index.html` (art viewer, 4 tab bars + bodies, `flw-gems-overlay` removed); `frt/shp/flw/dyb/pko/cjar.js`; `tools/verify-cjar-loopback.js` (stubs the two new engine functions — it caught the missing symbol by executing real render code, exactly the blind spot it exists for); `sw.js` **v166 → v167**. **Deferred:** PASS's gallery (54 faces), and DYB's five Tempest `specials` types are documented but not shown in its gallery — their identity is live per-die state a static tile would misrepresent.
**Detail:** `docs/art-authoring-guide.md`; `docs/implementation-notes/flw-implementation-notes.md`.

## 2026-08-10 — How-to tab bar generalised to N tabs; PKO's Chain folded in
**Category:** Architecture
**Decision:** `ui-style.md`'s optional How-to tab bar (CJAR, Aug 2026) is no longer capped at two tabs, and its "stays separate because it's a mid-play reference" carve-out is retired — reference content that is part of learning the game belongs in the tab bar even when it's also opened mid-play. PKO's `pko-chain-overlay` (Diagram | Animals) is folded into `pko-how-to-overlay` as tabs 2–3, opened pre-selected from the table's `[?] The Chain` and a tap-held card.
**Why:** The carve-out didn't survive a second example — PKO's Diagram/Animals content is the same reference at different times, and keeping it in two overlays duplicated the content and cost an extra overlay + teardown entry for no real benefit.
**Changed:** `index.html`/`js/games/pko.js` (`pkoOpenHowTo(tab, highlightId)` replaces `pkoOpenChain`'s own overlay; `pkoSetHowToTab` replaces `pkoSetChainTab`); `js/engine.js` `resetToLobby()` teardown list. Also fixed PKO's Active Marks row centring (a hidden spacer balancing the Watering Hole button) and surfaced the "Watering Hole" name in its caption. Deferred: same tab-bar treatment for FLW/SHP/FRT/DYB's own gallery-style reference content — `docs/deferred-work.md`.
**Detail:** `docs/implementation-notes/pko-implementation-notes.md`.

## 2026-08-09 — DD-31 button-parity rule rolled out suite-wide
**Category:** Process
**Decision:** The size/weight-parity rule below is now applied to all 18 games, not just CJAR — every game menu's "← Back to the Box" and every gameover screen's secondary exit/leave button now match their screen's primary CTA in height, text size, and weight.
**Why:** Closes the rollout gap the 8 Aug decision left open; no design change, same rule, same target shape as `btn-cjar-go-leave`/`btn-cjar-menu-back`.
**Changed:** `index.html` — 26 buttons across 18 games (17 menu-back + 9 gameover-secondary; PKO's pair matches its own screen's `text-lg` primary rather than the universal `text-xl`). Applied via a scoped Node script, id-targeted, not a broad Edit. Deferred/superseded: none — this closes the `docs/deferred-work.md` item.
**Detail:** `docs/deferred-work.md` (item removed); see the 8 Aug entry below for the rule's origin.

## 2026-08-08 — Same-screen action buttons must match in size and weight, no exceptions
**Category:** Architecture
**Decision:** `ui-style.md` § Universal Menu Standard's carve-out for "← Back to the Box" (smaller/lighter because "it's navigation, not an action") is retired — any two buttons offering real, distinct choices on the same screen must now match in size and weight, with no exceptions, for the game menu and every other same-screen pairing (gameover, Decision Modals).
**Why:** CJAR's stage-polish round (DD-31) surfaced the carve-out as itself the bug — the visual-weight difference didn't read as "this one is navigation," it just read as unfinished.
**Changed:** `.claude/rules/ui-style.md` § Universal Menu Standard; CJAR's own `btn-cjar-go-leave`/`btn-cjar-menu-back` conformed now. Deferred/superseded: the other 17 games' menu/gameover screens are not yet swept — logged in `docs/deferred-work.md`.
**Detail:** Spec `docs/superpowers/specs/2026-08-08-cjar-stage-polish-design.md` DD-31; `docs/implementation-notes/cjar-implementation-notes.md` DD-31/TG-10.

## 2026-08-07 — Cookie Jar action stage: the centre slot inverts, and the payout gets a beat
**Category:** Architecture
**Decision:** The stage's centre slot now holds the face-down card the buttons are about to act on, not the one that just resolved (DD-18); a 2100 ms choreography (`CJAR_FLIP_ANIM_MS`) flips it, pays it out, and settles it, paid for mostly out of `CJAR_REVEAL_MS` (3000 → 1200 ms).
**Why:** Three playtest rounds called the action stage "off," and two rounds of pure layout work (DD-11, DD-12) didn't fix it — root cause was that the base game's payout mutated state with no on-screen beat at all (TG-08), which a layout fix can never solve.
**Changed:** `js/games/cjar.js` (stage render, controls, the new `cjarBeginFlipAnim`/`cjarFlyTokens`), `css/styles.css`, `sw.js` v163→v164. Deferred/superseded: DD-06's balance flag untouched (presentational-only change, confirmed by an unchanged `simulate-cjar-dd.js` band).
**Detail:** Spec `docs/superpowers/specs/2026-08-07-cjar-action-stage-design.md`; DD-18…DD-24 + TG-08/TG-09 in `docs/implementation-notes/cjar-implementation-notes.md`.

## 2026-08-07 — Action Button Standard: no emoji, colour must be brand/neutral/destructive-red
**Category:** Process
**Decision:** New suite-wide rule in `ui-style.md` § Action Button Standard — Play CTAs, Decision Modal confirm/cancel buttons, and primary in-game submit/decision buttons may not carry an emoji in their label, and their background colour must be one of exactly three things: the game's own brand colour, neutral stone (cancel/exit, or a "safe" confirm), or semantic destructive red on a confirm button for an irreversible action. A narrow fourth exception allows red on an interrupt/alert screen when the copy itself signals urgency. Icon-only utility buttons, pills, toggles, and non-button text (headings, the `✨ Sylly Mode` label) are explicitly out of scope and keep their emoji.
**Why:** Owner-requested full sweep — action-button emoji had drifted in across most games with no rule against it, and two buttons (DSD's sabotage-confirm, SS's intercept-gate) had picked up the wrong game's brand colour or defaulted to neutral where brand was called for, most likely via copy-paste from another game's markup.
**Changed:** Three passes — `index.html` (~80 static action buttons had emoji stripped), then `js/games/*.js`
id-list-driven (46 more string sites across 14 files, after CJAR's dynamically-built Take/Play Innocent/Dob/
Sneak Out buttons turned up as a gap the static-HTML pass couldn't see; the "Restart in Lobby 🔄" play-again
confirm label, set per multiplayer mode in every MDLM game's JS, accounted for most of it), then an exhaustive
regex pass over every `[Bb]tn.textContent =` in `js/games/` (4 more: CJAR's play-again button had a *second*
assignment overwriting the fix when the modal opens, SS's `btn-ss-vault-done`, NT's lock-allocations button,
YGI's results-next button) — the id-list pass had only checked strings it already knew were bad, not every
assignment site. DSD's `btn-dsd-sabotage-confirm`
recoloured amber→cyan and SS's `btn-ss-to-intercept` recoloured stone→teal to match their own brand. Also
folded in three smaller fixes from the same session: Decision Modal button sizing conformed in FLW/PASS/GTH/
BLD, FLW's how-to step labels moved from inline style to a new `.flw-step-label` class, and two stale
`deferred-work.md` items (GTH CTA emoji, `docs/archive/` claim) were confirmed already resolved and closed.
**Detail:** `ui-style.md` § Action Button Standard (the rule); `docs/deferred-work.md` (sweep history + what was already-stale before this pass).

---

## 2026-08-03 — Arcade Mode added behind Secret Mode; cabinets are not Sylly Games
**Category:** Architecture
**Decision:** Secret Mode gains a third content type — **arcade cabinets**, small standalone canvas games listed under a new `ARCADE` category placed **first**, ahead of WORD PACKS and GAME SKINS. Cabinets are neither packs (they modify no host game, so they get `smLaunchArcade()` beside an untouched `smLaunch()`) nor Sylly Games (no MP config, no `game-identities.md` section, no Sylly Mode, no `new-game-checklist.md`, not the Stack). First cabinet: **Asherplane**, `js/arcade/asherplane.js`.
**Why:** Secret Mode was already the backdoor for content the lobby does not advertise, and a cabinet is exactly that — but modelling one as a pack would have forced it through `smLaunch()`'s host-game plumbing, and modelling it as a Sylly Game would have dragged in the entire new-game checklist for something with no multiplayer, no settings and no shared UI. A separate content type keeps both paths honest.
**Changed:** `js/secret-mode.js` (`SM_ARCADE`, `smLaunchArcade()`, `smOpenArcadeMenu()`, `smShowArcadeTile()`), new `js/arcade/asherplane.js`, `index.html` (arcade screen + stage), `js/engine.js` (`allScreens` entry + a `resetArcade()` forward ref in `resetToLobby()`), `sw.js` precache + `CACHE_NAME` v163. A session-sticky unlock puts a `🕹️` tile on the lobby which routes through `smOpenArcadeMenu()` — deliberately never awaiting `smLoadPacks()`, so the arcade opens on a cold offline start.
**Detail:** `docs/superpowers/specs/2026-08-03-arcade-asherplane-design.md`.

## 2026-08-03 — Dibber Dobber's first flip is guaranteed safe, without weakening the blind commit
**Category:** Architecture
**Decision:** `cjarBuildDeck()`'s Sylly branch now floats one cookie to position 0 of the built deck — via `cjarFloatCookies(deck, 1)`, applied after the branch's own final shuffle so it can't be undone by it. The blind commit (Delta 7) is untouched: nothing is revealed before the choice, only which card is guaranteed to sit at the position that gets revealed first.
**Why:** the base game's flip 1 auto-resolves before any choice is offered, and Snack Friendly protects the cards you do see; Dibber Dobber had neither — its first decision every Raid was made on an empty stage with no protection, so a new player's first move could cost 4 of 5 starting cookies with zero information to act on. Re-measured against the DD-06/Delta-7 baseline (`simulate-cjar-dd.js`, 20,000 matches/table size): 5p spread 34.3 → 31.4 pts, Innocent-leaning win rate 53.5% → 51.4%; 8p spread 37.4 → 37.6 pts, Innocent 52.9% → 52.3% — all within the noise band the same tool already established for Delta 7. The flagged imbalance (DD-06) is untouched, as expected: this targets a single-flip fairness gap, not the scare-off economics.
**Changed:** `js/games/cjar.js` (`cjarBuildDeck`), `tools/verify-cjar-loopback.js` (new assertion — the only harness with a real shuffle, so the only one that can prove the float landed rather than a false pass from the other three's identity-shuffle stub; 111 → 112).
**Detail:** `docs/implementation-notes/cjar-implementation-notes.md` DD-17.

## 2026-08-03 — Cookie Jar's stage becomes a 3-column grid; the private strip drops two redundant chips
**Category:** Architecture
**Decision:** The Stage's decision area moves from a flex row (DD-12) to a CSS `grid grid-cols-3`, which stretches columns 1 and 3 to column 2's (the hero's) height automatically. Col 1 ("on the table") is the Treat slot — now ALWAYS rendered at a fixed footprint, a dashed placeholder when empty, the real card at the same size once one exists — over the Crumbs value. Col 3 (the deck) is sized up again (6.5 → 7.2rem) with a bolder count. The history strip gets the same fixed-footprint placeholder before the first flip. Separately, the private strip loses **Cookie Stash and This Raid entirely** — the standings table already shows both for the viewer's own seat at every Open Book setting, so the chips were pure duplication — and the screen reorders to Stage → standings → Sylly-only chips → timer → buttons, with the action buttons fixed at the floor.
**Why:** the owner's own read on both: "with all 3 of different sizes it's causing a visual disconnect" (the stage), and "since moving the Crumbs, the rest of this information doesn't need to be stated again — it shows the same info as the score table" (the private strip). Both were cases of recognising that something already worked (`cjarStashVisible()` is unconditionally true for the viewer's own row) rather than needing something new built.
**Changed:** `index.html` (stage markup, screen reorder), `js/games/cjar.js` (`cjarRenderStage`, `cjarRenderTrailStrip`, `cjarRenderPrivateStrip`), `css/styles.css` (`.cjar-card-next` bump, new `.cjar-placeholder-dashed`), `tools/verify-cjar-loopback.js` (110 → 111, `stageThumbs()` now filters to real cards, new `stagePlaceholder()` check). Also this pass: the game menu's own "See the Cards" button removed (cjar's menu is back to the Universal Menu Standard's canonical 4 buttons) and the gallery grid switched `flex-wrap` → `grid-cols-3` so 5-tile sections (Family, Treats) wrap a deliberate 3-then-2 rather than whatever fit per row. SW v160 → v161.
**Detail:** `docs/implementation-notes/cjar-implementation-notes.md` DD-15 + DD-16 + DD-14 addendum.

## 2026-08-03 — Teaching material becomes a How to Play TAB; mid-play references keep their own overlay
**Category:** Architecture
**Decision:** The How-to Overlay Standard gains an **optional tab bar**, sticky under the title block. Cookie Jar's card gallery moves out of `cjar-cards-overlay` (deleted) and into a second tab of How to Play. The line drawn in the standard: **content that teaches the game gets a tab; content you consult mid-turn keeps its own overlay.** PKO's two-tabbed `pko-chain-overlay` is the precedent for the tab *mechanics* and stays a separate overlay under that same rule.
**Why:** knowing what cards exist *is* learning the game, so parking it one overlay further away than the rules that explain it was backwards. Folding it in removes an overlay, a z-index stack and a `resetToLobby()` teardown entry. Three sub-rules earn their place: the first tab is always the Step cards (canonical structure untouched), each tab body is its own scroll region with its **own** close button, and the bodies are siblings toggled by display so scroll position survives a flick across and back.
**Changed:** `.claude/rules/ui-style.md` § How-to Overlay Standard (new Optional tab bar section), `index.html` (tab bar + moved gallery body, `cjar-cards-overlay` deleted), `js/games/cjar.js` (`cjarSetHowToTab`/`cjarOpenHowTo`, entry points rewired), `js/engine.js` teardown, `tools/verify-cjar-loopback.js` (drives the real entry point and asserts the tab, 108 → 110). **Deferred:** FLW/SHP/FRT/PKO galleries — still none, and the offline check for those four still has DD-09's original problem.
**Detail:** `docs/implementation-notes/cjar-implementation-notes.md` DD-14.

## 2026-08-03 — Settings pills carry the thematic name; the value gets its own live line
**Category:** Architecture
**Decision:** A pill label carries the setting's **thematic name and nothing else**. When the option also encodes a concrete value the player needs — a duration, count, threshold or percentage — that value goes on a live `text-stone-400 text-xs` line **below** the pill row. Required when the value is not visible in the label; optional otherwise. The static description above the pills stays and keeps its own job (what the setting *controls*, readable before any choice is made).
**Why:** Cookie Jar shipped Decision Time as `Blitz / Standard / No Rush` with the actual seconds written nowhere in the app, while Match Length baked its values into the labels (`Quick Snack (3)`) — the same gap answered two different wrong ways. Appending values to labels lengthens pills unevenly, wrecks row alignment, and forces thematic names (close to a suite signature) to double as documentation. The pattern already existed for **sliders only** — the Sylly intensity descriptor — so this generalises it rather than inventing anything.
**Changed:** `.claude/rules/ui-style.md` § Settings Card Standard (new Dynamic value line rule), `index.html` (cjar's four pill groups restructured, `(3)`/`(5)` stripped from Match Length), `js/games/cjar.js` (`cjarSyncSettingsUI` populates four value lines; the pill handler repaints). **Deferred:** the other 17 games are **not** swept — a separate pass, deliberately not folded into a playtest-fix batch.
**Detail:** `docs/implementation-notes/cjar-implementation-notes.md` DD-13.

## 2026-08-03 — Cookie Jar's stage rebuilt again, as three bands
**Category:** Architecture
**Decision:** The one-row stage (DD-11) becomes three bands, each with one job: **table state** (Crumbs) → **the decision** (just revealed + next + any Treat, each labelled) → **the history** (full width, horizontally scrollable). The Treat gets its own labelled slot; the deck column renders the deck and nothing else; new `.cjar-card-next` (6.5rem) sizes the face-down deck near the live card rather than near the spent ones.
**Why:** DD-11 fixed the duplication it was built to fix but still did not read, and the arithmetic says why — on a 390px phone the row left the history **142px, about 2.6 thumbs of a 10+ flip Raid**, and a `strip.onclick` handler competed with the swipe that would scroll it, so a technically-scrollable strip was functionally not. The size order was also backwards: the *next* card, the actual object of the bet, rendered nearer to the spent thumbs than to the live card. Crumbs moved to band 1 because it is shared table state and sitting it between two personal numbers is what made all three unreadable (BUG-08's sibling finding).
**Changed:** `index.html` (stage markup), `js/games/cjar.js` (`cjarRenderStage`, `cjarRenderTrailStrip` loses its click handler, `cjarRenderPrivateStrip` loses Crumbs and gains a filled-vs-outlined distinction), `css/styles.css` (`.cjar-card-next`). Gameover screen also gained a title, **The Haul 🍪**, matching the suite's "The [Noun]" shape (PKO's The Hierarchy, FLW's The Vault). SW v159 → v160.
**Detail:** `docs/implementation-notes/cjar-implementation-notes.md` DD-12 + BUG-08.

## 2026-08-03 — Cookie Jar's stage was drawing the same card twice; rebuilt as one row
**Category:** Architecture
**Decision:** The table stage is now a single row read left→right: trail → just-revealed card → face-down deck. The newest revealed card *is* the trail strip's rightmost entry at a new, smaller `cjar-card-stage` size (15rem → 8.5rem) — never rendered a second time as a separate hero above it. Standings became persistent in the same pass: they now render in every table phase, not only during reveal, so Open Book is visible while deciding.
**Why:** playtest round 1 found the hero card confusing — it looked like the card under decision, when it was in fact the card that had already resolved, because the strip's rightmost thumb was the same card drawn a second time, larger. The size drop is also a quality win: at the smaller render size the same 360 px art goes from ~1.1× to ~2.6× effective resolution (TG-02b), so the "clean but soft" complaint improved for free.
**Changed:** `js/games/cjar.js` (`cjarRenderStage`, `cjarRenderTrailStrip` now slices off the last card whenever one is face-up, `cjarRenderRevealRows` runs every phase), `css/styles.css` (`cjar-card-stage`, `cjar-card-flipin`, `cjar-trail-settle` — transform/opacity only, fire only on a real card-key change).
**Detail:** `docs/implementation-notes/cjar-implementation-notes.md` DD-11.

## 2026-08-03 — Decision Time becomes a setting, and "No Rush" removes the clock entirely
**Category:** Architecture
**Decision:** The old fixed 15 s decision window is now a pill setting: Blitz (10 s) / Standard (20 s) / No Rush (none). Standard is deliberately set *above* the old value rather than at it. `cjarDecisionMs()` returns `null` for No Rush instead of a large number, so a caller that forgets to branch fails loudly instead of silently re-arming the auto-resolve.
**Why:** 15 s measured too short at a real table in playtest round 1. Keeping 15 s as the "middle" option would have shipped the same complaint with more choices around it, so the whole scale moved.
**Changed:** `js/games/cjar.js` (`CJAR_DECISION_TIMES`, `cjarDecisionMs()`, `windowMs` now travels **per flip** on `CJAR_FLIP_START` rather than being read from the local setting), settings overlay. Nothing structural changed in the gate itself — `cjarAllIn()` was already the sole resolve condition, the host timeout was only ever a safety net.
**Detail:** `docs/implementation-notes/cjar-implementation-notes.md` DD-10.

## 2026-08-03 — The lobby bounced Cookie Jar's host back to its own menu instead of into Raid 1
**Category:** Process
**Decision:** `onPassThePhone` now calls `cjarStartMatch()` directly instead of `cjarShowMenu()`.
**Why:** cjar was the only MDLM game that routed post-lobby back through its own game menu — GTH, FRT, SHP, FLW and PKO all go straight into play once the lobby closes. The build had read `logic-engine.md`'s note that the menu's Play CTA has "dual context" (pre-lobby opens the mode screen, post-lobby starts the match) as a routing recommendation, when it only describes what the *CTA* itself must handle defensively; the *reference implementation it named, GTH, does not route through the menu post-lobby at all*.
**Changed:** `js/games/cjar.js` (`onPassThePhone`). The dual-context branch on `btn-cjar-menu-play` stays as the same defensive fallback every other MDLM game keeps.
**Detail:** `docs/implementation-notes/cjar-implementation-notes.md` BUG-07.

## 2026-08-03 — Cookie Jar's lobby minimum drops from 4 to 3
**Category:** Strategy
**Decision:** `getMinPlayers: () => 3` in `MP_GAME_CONFIGS`, matching the range Incan Gold itself supports rather than the spec's fixed 4–8.
**Why:** owner call. Every player-count-independent mechanic (deck composition, bust odds, `cjarSplit`, both Treat schedules, the Dibber Dobber affinity draw) is unaffected — the loopback now covers a full 3-player match on both modes. **What is not measured:** the solo-Sneak-Out jackpot (sweeping the whole Crumb pool) lands more often at 3 seats than at the 5/8 the balance simulator actually ran. 3-player balance is carried as an explicit unsimulated watch item, not pre-emptively tuned.
**Changed:** `js/engine-multiplayer.js` (`MP_GAME_CONFIGS.cjar.getMinPlayers`).
**Detail:** `docs/implementation-notes/cjar-implementation-notes.md` DD-08.

## 2026-08-03 — The Universal Menu Standard gained an explicit type scale, after Cookie Jar shipped without one
**Category:** Process
**Decision:** `ui-style.md` § Universal Menu Standard now states the exact Tailwind classes for all four game-menu buttons (Play CTA / How to Play / Settings at `text-xl font-semibold`; Back to the Box steps down to `text-base font-medium`) — previously the standard specified button order and colour but not size.
**Why:** Cookie Jar shipped How to Play/Settings at `text-base` and Back to the Box at `text-sm font-semibold`, invisible in isolation but obviously wrong beside any other shipped game menu (checked unanimous across PKO, FLW, SHP, FRT, NT, PASS). The gap in the written standard is exactly why a build that was otherwise following it could still drift.
**Changed:** `.claude/rules/ui-style.md` § Universal Menu Standard (new type-scale table), `index.html` (cjar's menu buttons corrected).
**Detail:** `docs/implementation-notes/cjar-implementation-notes.md` DD-07.

## 2026-08-03 — A game's default art needs a way to be SEEN outside a running match
**Category:** Architecture
**Decision:** Cookie Jar gains `cjar-cards-overlay`, a gallery built from `CJAR_DATA` on every open with every tile rendered through `cjarRenderCard`. Reachable from the game menu and from inside How to Play. Scoped to cjar for now; FLW/SHP/FRT/PKO have the same need and the same seam, deferred until the shape is proven.
**Why:** the owner went to run the offline install check — the one that confirms the 14 core-art JPEGs precached — and found cjar's art only renders *inside a running Raid*. On an MDLM-only game that turns a pure service-worker question into a four-phone, live-Firebase exercise, and the documented procedure ("open Settings and How to Play") was simply wrong because those overlays are text. The gallery makes the check single-device. It is also the thing players asked for on its own merits.
**Changed:** `index.html` (`cjar-cards-overlay`, menu + how-to entry points), `js/games/cjar.js` (`cjarOpenCards`), `js/engine.js` teardown, `CLAUDE.md` § Offline procedure rewritten. `tools/verify-cjar-loopback.js` asserts **14 tiles = 14 shipped art files**, so adding a manifest key without a gallery tile breaks the build rather than quietly breaking the offline check. **Deferred:** the generic multi-game version.
**Detail:** `docs/implementation-notes/cjar-implementation-notes.md` DD-09.

## 2026-08-03 — A SYNC applier must rebuild every collection, because Firebase erases empty values
**Category:** Architecture
**Decision:** Payload collections are **never** assigned raw from an envelope. Firebase RTDB stores no `null`, no `{}` and no `[]` — a key holding any of them is deleted and arrives as `undefined`, an all-null array vanishes whole, and a half-dense one comes back as an object keyed by index. That collides directly with the existing (correct) rule to broadcast reset values explicitly: the reset values *are* the erasable shapes. Both halves are now required — send the reset value **and** rebuild it on receipt. `false`, `0` and `''` are never at risk; only emptiness is erased.
**Why:** Cookie Jar's playtest round 1 was unplayable — every client threw inside a render one line before `showScreen` and froze on the Raid intro for the whole match while the host played alone. The other MDLM games had reached the same protection informally via `p.x || []`; cjar had zero, and nothing in the rules said why the idiom existed.
**Changed:** `logic-engine.md` § MDLM Patterns gains the rule + upgrades the two-device-loopback rule (it must have a **wire** and a **real-element DOM**, or it passes while the game is broken). `js/games/cjar.js` — `cjarWireArr`/`cjarWireList`/`cjarWireObj` applied across all five SYNC appliers. New `tools/verify-cjar-loopback.js` (87 checks, `CJAR_SRC=` overridable). SW v157 → v158. **Deferred:** no suite-wide audit of the other 17 games for the same class — scoped out deliberately; worth a Protocol A pass.
**Detail:** `docs/implementation-notes/cjar-implementation-notes.md` BUG-06 + ML-03.

## 2026-08-02 — Dibber Dobber commits BLIND, so both Cookie Jar modes share one mental model
**Category:** Architecture
**Decision:** Cookie Jar's Sylly Mode resolves its choices against the **next, unseen** card, not the face-up one. The confirmed spec (§6.3) had Dibber Dobber resolve against the card already revealed — you could read "it's Mum" off the table and then choose. The owner's call is that a mode which turns a push-your-luck gamble into an informed reaction is a *different game*, and both modes must feel the same. Because every DD outcome is choice-driven it cannot resolve a card before choices exist, so it inverts the base game's order instead: **choose blind → reveal → resolve**. Base mode is unchanged and remains Incan Gold 1:1 (verified against the published rules: reveal → resolve → decide about the next card).
**Why:** the mental model is the product. A Sylly Mode is meant to change the *rules*, not the kind of decision the player is making — and an informed risk-free option is strictly stronger than a gamble, which is a balance problem as well as a feel problem.
**Changed:** `js/games/cjar.js` — `cjarApplyCardEffect` became base-game-only (guarded before the pop); new `cjarOpenBlindWindow()` / `cjarRevealSyllyCard()`; `cjarHostNextFlip`/`cjarHostResolveFlip` re-ordered; the shared tail factored into `cjarOpenDecisionWindow()` so the two paths cannot drift; `CJAR_FLIP_RESOLVE` gained a `card` field (Sylly's `FLIP_START` carries `card: null`, so without it a client's hero stayed face-down through the whole reveal). **`cjarResolveFlipDD` and the entire ledger are byte-identical** — only *when* `cjarCard`/`cjarChoices` are populated moved. Fixed BUG-04 on the way past (DD's Crumb Trail had been empty for a whole match, because trail logging was coupled to the reveal-time effect Sylly doesn't have). **Balance baseline survived**: the simulator's agents were always card-blind, so it had been measuring this model all along — spread 33.1 → 34.3 pts, Innocent 52.4% → 53.5%, all within noise. **Deferred:** spec §6.3 and Delta 3's DD carve-out still need reconciling at Task 17.
**Detail:** `docs/superpowers/plans/2026-08-02-cookie-jar.md` § Spec deltas (Delta 7); `docs/implementation-notes/cjar-implementation-notes.md` DD-06 + BUG-04.

## 2026-08-02 — A two-device loopback becomes the standard fifth MP tool
**Category:** Process
**Decision:** Before the real multi-device session, prove an MDLM game's packet contract with a **second `vm` acting as a client**, piping the host's `mpSendEnvelope` straight into its `[abbr]HandleEnvelope`. Adopted after it found two defects in Cookie Jar that had passed **222 green harness checks** — including BUG-05, where `cjarAllIn()` was vacuously `true` in Dibber Dobber (`[].every()` is `true`, and Sylly deliberately has no `cjarActive`), so the host resolved on the **first** player's tap and seats 2..N never chose at all.
**Why:** every headless harness in this project runs in `'single'` mode — that is precisely what lets one process drive all N seats, and precisely what blinds it to the packet layer. The loopback closes that gap for ~40 lines and catches the class of bug where a payload field is simply absent, plus host/client divergence, stale-tag rejection, private-channel delivery and the mid-game-quit contract. It is **not** a substitute for the three-device session (no clock skew, no Firebase ordering, nothing visual) — it runs first, not instead.
**Changed:** `.claude/rules/logic-engine.md` § MDLM Patterns gains the loopback rule and the `[].every()` gate rule (both lean pointers; detail stays in the impl notes). No shipped-code change beyond the BUG-05 fix in `js/games/cjar.js` and its per-mode regression test in `tools/verify-cjar-loop.js`, which was verified to fail against the pre-fix implementation.
**Detail:** `docs/implementation-notes/cjar-implementation-notes.md` ML-01 + ML-02 + BUG-05.

## 2026-08-02 — Cookie Jar (cjar) shipped as game 18, base + Sylly in one phase
**Category:** Strategy
**Decision:** Owner chose a single build phase over PKO-style staging (base game, then a separate Sylly Mode phase), accepting that the Dibber Dobber balance numbers were simulated at a 16-card deck and ship at ~11 cards.
**Why:** `tools/simulate-cjar-dd.js` is the agreed mitigation for that gap and produced a pre-playtest baseline (spec §17 D-11); card effects resolve at reveal rather than after the decision window (Delta 3) because the spec's literal reading made the base-game choice degenerate.
**Changed:** `js/games/cjar.js` (new, 1777 lines), `data/cjar-data.json`, `data/art/cjar/` (core art), six screens, six-then-seven overlays, five headless tools.
**Detail:** `docs/new-game-tech-cookie-jar.md`, `docs/superpowers/plans/2026-08-02-cookie-jar.md`, `docs/phase39-snapshot.md`.

## 2026-08-02 — Cookie Jar's fifth family archetype is Grandma, not the spec's Little Brother
**Category:** Strategy
**Decision:** The shipped fifth family archetype is `id: "grandma"`, name "Grandma", emoji 👵 — not the confirmed spec's `little` / "Little Brother" 🧒.
**Why:** the delivered core art contained `grandma.png` and no younger-child card — the owner could not get usable art generations of young children, and shipping a card whose name contradicts its art was rejected. The archetype is a pure data key with no mechanic attached to its identity: `copies` stays 3, deck composition, bust odds and the Snack Friendly float are all untouched. What did cost real work was re-voicing all eight flavour lines — Grandma's register (delighted to see you, going to make this take much longer) is genuinely different from a younger sibling's.
**Changed:** `data/cjar-data.json` (family entry + flavour lines), `docs/cjar-content-guide.md`, `docs/rules/game-identities.md` § Game 18. Swept everywhere the spec's `little` id appeared before any code was written against it.
**Detail:** `docs/implementation-notes/cjar-implementation-notes.md` DD-01.

## 2026-08-02 — High Alert no longer re-picks the family that just busted
**Category:** Architecture
**Decision:** `cjarResolveBust`'s High Alert escalation pool excludes the busting family (`id !== familyId`), plus an empty-pool guard.
**Why:** the spec's own `cjarResolveBust` block allowed re-picking the just-burnt family, sending it 3→2 on the burn and back 2→3 on the escalation — cancelling out so nothing burns and nothing escalates, contradicting the setting's own description ("escalated to 4 copies", "more likely"). Found by re-running `verify-cjar-loop.js` across five seeds: only seed 0 exposed it, because `pool[0]` happened to be the busting family at every other seed — a green run at the default seed was a property of the seed, not the rule.
**Changed:** `js/games/cjar.js` (`cjarResolveBust`), `tools/verify-cjar-loop.js` (new assertion: escalation never re-picks the busting family, run across six seeds).
**Detail:** `docs/implementation-notes/cjar-implementation-notes.md` DD-04 (plan Delta 6).

## 2026-08-02 — BLD and FRT recoloured off yellow ahead of Cookie Jar
**Category:** Strategy
**Decision:** BLD moved yellow-500 → dark red `#991b1b` (red-800); FRT moved banana `#FFC700` → electric lemon `#FFE500` with dark ink (stone-800) replacing white. Both were flagged in the Cookie Jar design review (`docs/new-ideas/new-game-brief-cookie-jar.md` §1/§19): the amber/cookie-brown space needed to be clear of collision with PKO's `#854D0E` brand and with Cookie Jar's own incoming honey-gold, and both games' white-on-yellow toggle/pill combos were failing WCAG contrast (1.92:1 and 1.57:1 against the 3:1 floor).
**Why:** a colour clash discovered after a new game ships is much more expensive to fix (skins, docs, muscle memory) than clearing the space before it exists; the WCAG failures were real bugs independent of Cookie Jar and worth fixing regardless.
**Changed:** `css/styles.css` (new `pill-active-bld`/`game-toggle-on-bld`/`bld-cta`/`bld-label`; recoloured `pill-active-frt`/`game-toggle-on-frt`/`.frt-range`/`.frt-card-back`; deleted the now-orphaned generic `.pill-active-yellow`/`.game-toggle-on-yellow`), `js/engine.js`, `js/engine-multiplayer.js`, `js/games/bld.js` (`yellow-*` → `red-*` throughout), `js/games/frt.js` (`FRT_FILL`/`FRT_INK` + the `mk()` button helper's hardcoded white ink), `index.html` (~49 occurrences via a scoped Node script, never Edit — see the encoding-corruption rule), `.claude/rules/ui-style.md` Tables A/C, `docs/rules/game-identities.md`, `docs/code-map.md`. Deliberately left unchanged: FRT's card-name/settings-button ink `#854d0e` (coincidentally equals PKO's hex but isn't FRT's brand identity, and isn't a contrast failure). SW v155 → v156.
**Detail:** `docs/implementation-notes/bld-implementation-notes.md` § Design Decisions (recolour entry); `docs/implementation-notes/frt-implementation-notes.md` § Design Decisions (recolour entry).

## 2026-08-02 — Shared asset manifest gains an optional `specials` block
**Category:** Architecture
**Decision:** A face that carries a *type* on top of its value (DYB's five Tempest dice — loaded/phantom/slick/cracked/snake) can now be skinned, via a new `specials` block in the existing asset manifest and two new resolvers, `assetSpecial`/`assetSpecialFrame`, in `js/lib/art.js`. Engine chrome (border/tint/glow) stays the type signal by default; a pack can opt a type out with `"frame": false`, but only for a die whose special art actually resolved — the opt-out is provenance-gated so a missing face can never ship unmarked. A reserved `blank` key covers faceless dice (concealed phantom, cracked) through its own fallback branch, never the ordinary face chain — merging the two would leak a concealed phantom's real value.
**Why:** the seam was previously gated to `type === 'standard'` because `.dyb-die-asset` discards the border/tint/glow channels that carry type identity; special dice under a skin fell back to raw CSS pips, and there was no way to skin them without risking illegibility or a hidden-information leak.
**Changed:** `js/lib/art.js` (+2 resolvers), `js/games/dyb.js` (`dybDieHTML` reworked, dead `visible` param dropped), `css/styles.css` (`.dyb-die-framed`/`.dyb-die-art`), `data/packs/deep-ocean-dice/` (reference pack — full `specials` block, 16 new SVGs), `tools/verify-dyb-dice.js` (new, 90+ checks incl. the leak guard). Additive and optional — no existing pack or game is affected; `sea-cliff-dice` stays faces-only on purpose as the fallback path's live test. SW v154 → v155.
**Detail:** `docs/superpowers/specs/2026-08-01-dyb-tempest-asset-seam-design.md`; `docs/implementation-notes/dyb-implementation-notes.md` § Design Decisions (continued — August 2026, Tempest asset seam).

## 2026-08-01 — Core art rollout begins: FLW's default gems, and a promoted skin leaves the Terminal
**Category:** Architecture
**Decision:** Flawless is the second game to ship a **core art pack** (`data/art/flw/` — 10 gem faces + back, 217 KB precached, SW v152), converting the art that shipped as the `prismatic-gems` skin. That skin was simultaneously **unlisted from `data/packs/registry.json`**: once a pack's art *is* the default, offering it under `GAME SKINS` is a selectable option that changes nothing and re-downloads ~1.1 MB of PNG to do it. Standing rule for the rest of the rollout — **promoting a skin to core art unlists the skin.**
**Why:** proves the July architecture claim that a conversion is "art + manifest + registry + precache, no JS edit" — this one touched zero lines of `js/games/flw.js`. FRT, SHP, DYB and PASS follow the same route, and each has candidate masters sitting in `data/packs/` already (`fruity-fruits`, `plush-sheeps`, `sea-cliff-dice`/`deep-ocean-dice`, `joker`).
**Changed:** `data/art/flw/` (new), `data/art/registry.json`, `data/packs/registry.json` (prismatic-gems removed), `sw.js` (+12 precache entries, v151 → v152), `tools/convert-core-art.ps1` (CONFIG re-pointed at FLW), rollout tracker in `docs/expansion-guide.md`, `code-map.md`, `logic-engine.md`, `game-identities.md` § Game 16. Deferred: FRT/SHP/DYB/PASS — PASS's 54 faces still need a precache budget agreed before art is generated.
**Detail:** `docs/implementation-notes/flw-implementation-notes.md` § Core Art (incl. the "don't upscale the masters" lesson); `docs/expansion-guide.md` § Core art packs.

## 2026-08-01 — GTH/DYB/BLD quit contract: the documented divergence was stale; the real gap was one level deeper
**Category:** Process
**Decision:** `deferred-work.md` and `logic-engine.md` claimed GTH/DYB/BLD navigated to the game menu on quit, unlike PASS's `resetToLobby()`. Checked against the shipped code: all three already called `resetToLobby()` unconditionally — an earlier undocumented fix. The real remaining gap was PASS's *other* contract half: `resetToLobby()` only tears down the calling device (a client removes its own `/players` node); the host has no listener on that node mid-game, so a client quitting left the host and remaining clients stranded. Fixed by adding a client→host `[ABBR]_PLAYER_LEFT` ACTION to all three, mirroring PASS's `PASS_PLAYER_LEFT`, without replicating PASS's custom "X walked away" banner — the generic `mp-host-disconnected-overlay` (triggered by the host's own `resetToLobby()` → `HOST_END_GAME`) already covers it.
**Why:** same shape as TG-06/TG-09 in the PKO notes — a doc describing a past audit's *intent* was never re-verified against the code it described, and the real defect (no host-facing notification) was one layer beneath the one being tracked.
**Changed:** `js/games/gth.js`, `js/games/dyb.js`, `js/games/bld.js` (quit-confirm + `HandleEnvelope`); `sw.js` v150 → v151 (header comment also corrected from a stale v149); `docs/deferred-work.md` (item closed), `logic-engine.md` § MDLM Mid-Game Quit Contract (corrected), implementation notes for all three games.
**Detail:** `docs/implementation-notes/gth-implementation-notes.md` § Multiplayer Lessons (full root cause); equivalent entries in `dyb-`/`bld-implementation-notes.md`.

## 2026-08-01 — Phase 38 gate closed: Force of Nature confirmed on a three-device pass
**Category:** Process
**Decision:** The multi-device pass deferred by both v149 and v150 entries below ran clean — 3 players, SW v150, non-host moving first, several Encounters played with no mirror desync, no frozen fan, no dead button. TG-07's "no harness can prove this" gap is now closed by the one thing that can close it: a live session shaped to hit exactly the case a single-process harness aliases away.
**Why:** BUG-02 (a client's Hoard never repairing after it played) was only ever going to surface this way — this session is that check, run and passed. Carrion's `PKO_CARRION_OPEN` path wasn't independently forced open in this particular session (no client Challenge happened to beat a Mark), so it stays verified by code audit — every Hoard-mutation site confirmed paired with its repair, the SYNC confirmed sent and handled unconditionally — rather than by a live overlay open; that distinction is recorded rather than glossed over.
**Changed:** No code. `docs/implementation-notes/pko-implementation-notes.md` (D38); `docs/phase38-snapshot.md` (new); `CLAUDE.md` § Current Focus.
**Detail:** `docs/implementation-notes/pko-implementation-notes.md` D38, TG-07; `docs/phase38-snapshot.md`.

## 2026-08-01 — Per-item UI copy renders from its registry, not from `index.html` (PKO events), SW v150
**Category:** Architecture
**Decision:** PKO's Force of Nature roster overlay (`pko-events-overlay`) is **rendered from `PKO_EVENTS`** at open time, with its rules copy in `PKO_EVENT_DETAIL` beside the registry — no per-event markup in `index.html` — and the events harness now asserts that `PKO_EVENT_DETAIL` and `PKO_EVENT_SOUND` cover the registry exactly. Also: both PKO interstitials collapse to one `PKO_INTERSTITIAL_MS = 5000`, held equal to `PKO_CARRION_WINDOW_MS` (D35).
**Why:** copy written into `index.html` per item is a second registry that drifts silently — a tenth event would ship with a blank `[?]` and no failing check. This generalises past PKO: FRT's Fruity Personalities overlay is hand-written markup for the same shape of data, and is the pattern this replaces for any game that already has a data registry.
**Changed:** `js/games/pko.js` (`pkoRenderEvents`/`PKO_EVENT_DETAIL`/`PKO_INTERSTITIAL_MS`), `index.html` (overlay shell + 3 entry points + table header), `css/styles.css` (`.pko-event-live`), `js/engine.js` (teardown), `tools/verify-pko-events.js` (143→148), `sw.js` v150. **Deferred:** the multi-device pass is still open; FRT's overlay is not retrofitted.
**Detail:** `docs/implementation-notes/pko-implementation-notes.md` D35–D37; `docs/code-map.md` § PKO overlays.

## 2026-08-01 — Phase 38: Force of Nature ships (PKO Sylly Mode), SW v149
**Category:** Architecture
**Decision:** PKO's Sylly Mode is built — nine events (fixed opener Invasive Mimicry + eight drawn per Encounter), the Mimic as a 15th chain entry, `screen-pko-event` and `pko-carrion-overlay`. **Dark Forest cut** (D26). Three structural calls: `pkoResolveClash(winnerIdxs)` now takes an **array** because Extinction Event can empty several Hoards at once; the **Mimic is resolved at play time** in one function (`pkoResolveGroup`) so `pkoBeats()` and `pkoMarks` were never touched (D33); events are **plain data** read through `pkoEventFlag(key)`, so adding one never edits a seam.
**Why:** the brief's §7 known-issues banner was mostly solvable by placement rather than new rules — Carrion can't un-win a Clash because the empty-Hoard check runs first, and the Deluge/Dry Season skip loop was *deleted* by gating the draw with `canFire()` instead of capping retries (D34).
**Changed:** `js/games/pko.js`, `data/pko-data.json` (+Mimic), `index.html`, `css/styles.css`, `js/engine.js`, `sw.js` v149; new harness `tools/verify-pko-events.js` (143 checks) alongside chain (68) and loop (132). **Deferred:** the three-device playtest (plan Task 12) — TG-07 means no harness can prove per-device sync, and `PKO_CARRION_WINDOW_MS` (5 s) is the first playtest dial.
**Detail:** `docs/new-game-tech-pecking-order-fon.md`; plan `docs/superpowers/plans/2026-08-01-pko-force-of-nature.md`; `docs/implementation-notes/pko-implementation-notes.md` D25–D34 + TG-08/09/10.

## 2026-08-01 — Phase 37 gate: Pecking Order ships; phase snapshots move back in-repo
**Category:** Process
**Decision:** Phase 37 (Pecking Order, game 17) passed its Protocol A phase gate — one blocking finding (How to Play never taught Swarm) and four minor findings fixed same-session. Separately: phase snapshots (`phase[N]-snapshot.md`) now write to **`docs/`**, not the external archive, from N ≥ 37 onward.
**Why:** the "external archive" move was housekeeping to keep old files out of in-repo sweeps, not a standing rule — the owner keeps their own running Confluence separately, so an in-repo snapshot is Claude Code's own reference and belongs in the repo it describes. `CLAUDE.md`'s prior wording read as a permanent policy; corrected.
**Changed:** `docs/phase37-snapshot.md` (new); `CLAUDE.md` § Current Focus (snapshot-location paragraph rewritten); this file's header note. Also: How to Play overlay (Swarm coverage), `sw.js` header comment, dead `#pko-fon-label` div, PKO decision-modal border colour (`#C9A227` → `#E4CFA3`), three sub-44px touch targets, `docs/rules/phase-audit.md` drift-check item repointed at `code-map.md`.
**Detail:** `docs/phase37-snapshot.md`; `docs/implementation-notes/pko-implementation-notes.md` BUG-06.

## 2026-07-31 — Toolchain: adopt `/doctor` + `/goal` and Emil's motion rules; reject Impeccable
**Category:** Process
**Decision:** Updated Claude Code **v2.1.114 → v2.1.220**, unlocking `/doctor` (needs v2.1.205+) and `/goal` (needs v2.1.139+). Adopted **`emil-design-eng`** as an on-demand skill in `.claude/skills/` and folded its load-bearing rules into `ui-style.md` § Motion Standard. **Rejected `impeccable`** outright. "taste" is not a separate skill — it is a section inside `emil-design-eng`.
**Why:** `/doctor` is now a fix-capable checkup that rightsizes `CLAUDE.md` and prices unused skills/MCP servers against their context cost — pointed straight at this project's known baseline problem (~144 KB / ~36k tokens auto-loaded every turn). `/goal` fits exactly one shape here: harness-green loops over `tools/verify-pko-*.js`, which exit non-zero and surface their result in the transcript for the evaluator to read; it cannot help with device playtests, and its evaluator never runs commands. **Impeccable was rejected because it is a design *language* that wants to own the aesthetic** (OKLCH palettes, its own `PRODUCT.md`/`DESIGN.md`, brand-vs-product modes) and would fight a mature, documented system — The Stack, the two-pattern overlay library, 16 per-game brand tables, Fredoka, Sylly Tone — while adding another always-on doc set to a context budget we have already fought once.
**Changed:** `.claude/skills/emil-design-eng/SKILL.md` (new); `.claude/rules/ui-style.md` (§ Motion Standard — timing/easing tables, transform-only rule, `transition-all` debt note); `css/styles.css` (global `prefers-reduced-motion` block — the suite had **zero** reduced-motion support against 27 `@keyframes` and 487 `transition-all`); `sw.js` v147 → **v148**. **Deferred:** running `/doctor` itself (needs a session restart on the new version); the `transition-all` sweep of `index.html` (blocked by the encoding rule — new markup only).
**Detail:** `.claude/rules/ui-style.md` § Motion Standard; `docs/token-budget-handoff.md`; plan `~/.claude/plans/a-little-side-track-lovely-rabbit.md`.

## 2026-07-31 — A cut mechanic can be restored by changing its shape; record the *ambiguity*, not the verdict
**Category:** Process
**Decision:** PKO's per-slot **Swarm** — cut outright in brief v6 — is **restored**, in a form where a Swarm's two cards immediately become **one Mark each**. **Mob** (cards answering one Mark and *staying* stacked) stays cut.
**Why:** v6 cut Swarm over `pko_log1.md` blocker #1 — *"a slot holds Mongoose ×2; does one Leopard beat it, or two?"* — a genuine, unresolvable-by-fiat ambiguity. But it only exists **if a slot can hold depth**. The restored shape removes it by construction: `pkoMarks` stays flat, a slot always holds exactly one card, and the question cannot be asked. The cut had also silently removed one of only two outlets `pko_log1.md` item F named for shedding Mouse/Fish (*"a Stake or a Swarm"*) — item F was explicitly deferred to playtest, and round 2 returned the verdict that one outlet is not enough. **The process lesson:** the brief carried *"Swarm is cut"* but not *"because slots would gain depth"*, so the cut read as a judgement about the mechanic rather than about one implementation of it — and Swarm and Mob got conflated. Record the ambiguity, not just the verdict.
**Changed:** `js/games/pko.js` (`pkoDraft` → array-of-arrays; new `pkoAnswers` / `pkoSlotAccepts` predicates; `PKO_CHALLENGE.assignments` is now one id array per slot); `tools/verify-pko-loop.js` (+19 Swarm checks incl. every rejection path); tech spec §7/§17 D10; brief §12 corrected. Also shipped: **Appetite** (Sated/Ravenous two-tier chain) defaulting to **Sated** so round 3 can attribute which lever fixed the stall — Appetite is a table-side A/B, Swarm is the core change. Spec §5, §10, §17 D11.
**Detail:** `docs/implementation-notes/pko-implementation-notes.md` — DD-21…DD-24, BUG-03, BUG-04.

## 2026-07-31 — Private-hand games need a private *repair* packet, not just a private deal
**Category:** Architecture
**Decision:** In any game using the True Network Privacy model (`mpSendPrivate`), **every** mutation of the host's mirror of a player's hand must send that player a private packet — not just the deal. PKO now sends `PKO_HAND_SYNC` (the player's *whole* authoritative Hoard, not a delta) from the single function where cards leave a Hoard, whenever the actor isn't the host's own seat.
**Why:** The first three-device PKO playtest surfaced BUG-02 — a client Staked 2 × Mouse, the cards left the host's mirror, and the client was never told. Its fan froze at the deal, its own count chip disagreed with it, and re-playing those ghost cards failed the host's `pkoHoldsAll` re-validation, which drops silently by design — so it presented as a dead button, not a desync. The public board packet *cannot* carry the repair: the whole point of the model is that it carries counts, never contents. FLW never hit this because a Showing replaces the hand wholesale; PKO's Hoard persists across a Clash, so a missed repair compounds.
**Changed:** `js/games/pko.js` (`pkoRemoveFromHoard` sends, new `PKO_HAND_SYNC` handler that deliberately does *not* unlock sync — the paired `PKO_BOARD` owns that); `docs/code-map.md` packet table. **Also exposed a harness boundary:** the loop harness runs in `'single'` mode where `pkoMyHoard` is an *alias* of `pkoHoards[0]`, so per-device mirror bugs are invisible to it by construction — 75 checks were green. Added a **card-conservation census** (`Σ hoards + marks + reserve + wateringHole` invariant across every applier) as the general guard for the adjacent bug family. **Elevated:** `logic-engine.md` § Multiplayer Sync Module now carries *Private hands need a private REPAIR packet, not just a private deal* — including the two rules that make it reliable (send the whole collection, not a delta; put the send in the single function where cards leave the collection, never once per applier).
**Detail:** `docs/implementation-notes/pko-implementation-notes.md` — BUG-02, ML-06, TG-07.

## 2026-07-31 — Overlapping card fans, and the species group as the tap target
**Category:** Architecture
**Decision:** A hand of cards is laid out as a **measured overlap fan** rather than a scrolling row: heavy stride within a species, light between, both shrinking toward a floor so the hand always fits the column. The direct consequence is adopted deliberately — **the species group becomes the tap target**, and a tap cycles how many of that species are selected (0 → 1 → … → N → 0) rather than picking an individual card.
**Why:** PKO's 15-card Hoard was ~1000px inside a ~310px column, so the hand could never be seen at once. Overlap fixes that but leaves ~7px of a single card exposed at the tightest stride — far under a thumb — so per-card tapping had to go. Duplicates in a hand are genuinely interchangeable, so counting loses nothing; the Stake button already read `Stake 2 × Mouse`, so the feedback for a counting model was in place. Applies to any future game with a hand large enough to overflow the Stack.
**Changed:** `js/games/pko.js` (`pkoGroupHoard`, `pkoLayoutFan`, `pkoCycleStakeGroup` replacing `pkoToggleStakeCard`; `pkoShakeFan` now queries `[data-pos]` since a fan position is no longer a DOM index); `css/styles.css` `.pko-fan`; the three PKO fan containers in `index.html`. Two non-obvious constraints are load-bearing: card width is read from the **rendered DOM** (not the CSS constant) so a stylesheet change can't desync the maths, and every card needs an explicit `z-index` because a dimmed card's `opacity` creates its own stacking context. **Deferred:** not yet generalised into a shared helper — extract if a second game needs it (YAGNI, per the dice precedent).
**Detail:** `docs/implementation-notes/pko-implementation-notes.md` — DD-22, DD-23.

## 2026-07-31 — MDLM rules engines get a headless loop harness in `tools/`, not just a data-layer one
**Category:** Process
**Decision:** An MDLM-only game's *turn loop* — not merely its deck/chain arithmetic — is verified by a committed Node `vm` harness that plays every seat through the real shipped appliers. `tools/verify-pko-loop.js` (75 checks) joins `tools/verify-pko-chain.js` (34) as the pattern; both evaluate `js/games/pko.js` itself, re-implementing no rules, and exit non-zero on failure. The enabling architectural property is now explicit and load-bearing: **host appliers take an explicit `playerIdx` and skip every broadcast in `'single'` mode**, so one process can be all N players.
**Why:** In an MDLM-only game the rules engine is unreachable from a single browser — without a harness, the first Challenge ever played is also the first time the code runs, and defects surface as intermittent multi-device symptoms that are the hardest possible thing to diagnose. It paid for itself immediately: the loop harness found PKO BUG-01 on its first run (the Encounter's board outlived the Encounter by 2.5 s, so a client's in-flight Retreat resolved it a second time — an intermittent "the interstitial flashed twice" in playtest). It also exposed that spec §11's missing-handler audit table was fully ticked while two ACTION handlers were genuinely absent from the code.
**Changed:** new `tools/verify-pko-loop.js`; `js/games/pko.js` `pkoEndEncounter()` now clears `pkoMarks` synchronously; `docs/code-map.md` § Verification tools; `CLAUDE.md`. **Elevated to a standing rule (owner call, 31 July):** `logic-engine.md` § Checklist: Adding a New Game gained a *Rules-engine verification harness* item — required for any game with a deck, chain, or scoring table, **mandatory for MDLM-only games** — with the method and sandbox gotchas in `docs/rules/new-game-process.md` § Stage 3 (kept out of the always-loaded rule file to protect the baseline context budget). The checklist item states the architectural precondition as a *requirement*, since it constrains how appliers are written, not just how they are tested. **Deferred:** the Stage 2 tech template still doesn't ask for a harness in its §15 checklist.
**Detail:** `docs/implementation-notes/pko-implementation-notes.md` — DD-20 (harness design + the two sandbox rules: capture `setTimeout`, make `mpSendEnvelope` *throw*), BUG-01, ML-04/ML-05, TG-05 (strengthened) and TG-06.

## 2026-07-31 — Default game art becomes a precached "core art" pack (`data/art/`)
**Category:** Architecture
**Decision:** A game's *default* artwork now ships as a manifest-driven pack in `data/art/<kind>/`, using the same `assets` manifest format as a Secret Mode skin pack but with the opposite caching contract — precached in `sw.js`, never listed in `data/packs/registry.json`, never shown in the Terminal. `assetFace`/`assetBack` moved out of `secret-mode.js` into a new always-loaded `js/lib/art.js` and now resolve **skin pack → core art → emoji fallback**; `assetExtra(kind, key)` added for non-card game art (e.g. PKO's chain diagram).
**Why:** Owner wanted default art to be a folder they can edit/replace/re-point without touching JS, and one art pipeline across default and skins. Keeping it out of `data/packs/` preserves two incompatible contracts: skins stay "drop a folder, no version bump" (runtime-cached), core art stays "present on a cold offline install" (precached, version-bumped). Resolution had to leave `secret-mode.js` because that file loads last and lazily — default art can't depend on Secret Mode being initialised.
**Changed:** new `js/lib/art.js` + `<script>` after `engine.js`; `assetFace`/`assetBack` deleted from `secret-mode.js` (which now only *assigns* `window.activeAssetPack`); `data/art/registry.json` + `data/art/pko/`; `sw.js` precache + v142→v143; `logic-engine.md` (precache list, PWA Guardian asset-weight question, asset-readiness checklist), `docs/expansion-guide.md` § Core art packs, `CLAUDE.md`. **Rollout is game-by-game** — FRT/SHP/FLW/PASS/DYB keep emoji defaults until individually converted. Deferred: no WebP encoder on the build machine (no npm allowed), so core art is JPEG; the manifest makes the format swappable.
**Detail:** `docs/expansion-guide.md` § Core art packs — **including the per-game rollout tracker** (which games still run emoji defaults, the exact 4 steps, and the two things to decide *before* generating art). Converter: `tools/convert-core-art.ps1`. Build notes: `docs/implementation-notes/pko-implementation-notes.md` DD-05/TG-02.

## 2026-07-31 — Pecking Order (PKO) Stage 2 signed off
**Category:** Process
**Decision:** All five open questions (§16 Q1, Q4–Q7) resolved and all nine deviations (§17 D1–D9) confirmed — Stage 2 gate cleared, Stage 3 unblocked pending Protocol B.
**Why:** Owner review surfaced two changes from the spec's draft: the Challenge builder reverses from a full screen to an overlay (`pko-challenge-overlay`, D1) for easier back-out; the `✨ Sylly Mode` settings card ships live in v1 (Q7) rather than omitted, since the app isn't live yet and Force of Nature (Phase 2) is expected shortly after. Q1 confirmed no new Poacher mechanic is needed — a Poacher already beats a Poacher-Mark under its existing wildcard ability.
**Changed:** `docs/new-game-tech-pecking-order.md` (§§1,2,3,7,8,11,12,13,14,15,16,17,18), `docs/new-ideas/pko-art-style-checklist.md` (40 KB/card WebP ceiling confirmed). Deferred: Stage 3 Protocol B skeleton-first, its own phase gate.
**Detail:** `docs/pko-stage2-handoff.md`, `docs/new-game-tech-pecking-order.md` §16/§17.

## 2026-06-30 — DSD Sylly Mode renamed Mission Abyss → Silent Running
**Category:** Strategy
**Decision:** Resolved the "Abyss" vocab clash between DSD's Sylly Mode (Mission Abyss) and PASS's Sylly Mode (The Abyss) by renaming DSD, not PASS.
**Why:** In PASS, "the Abyss" is a load-bearing mechanic (`passAbyss` pool, `abyss-draft` phase, the "abyss gazes back" flavour, 65 sites); in DSD it was a cosmetic display string only (~4 sites) — the cheap, lower-risk side to move. "Silent Running" (a submarine stealth tactic) fits the secretly-sabotaging Captain better than "Battleships".
**Changed:** `index.html` (DSD sabotage header / settings / how-to), `dsd.js` pass-gate subtext + section comment, SW v141 → v142; docs synced (game-identities, code-map, ui-style, brief prompt/template). Internal `playAbyssThud()` audio left unchanged (deep-ocean reference, not the Sylly name).
**Detail:** `docs/implementation-notes/dsd-implementation-notes.md` § Design Decisions.

## 2026-06-30 — Cartridge system Phase B shipped (asset/skin packs)
**Category:** Architecture
**Decision:** Asset (skin) packs use the same manifest/registry format with an `assets` block instead of `words`. Render seams call `assetFace(kind,id)`/`assetBack(kind)` (in `secret-mode.js`) and fall back to default art; guards added to all five seams — `frtRenderCard`, `shpRenderCard`, `flwRenderCard`, `Cards.buildEl/buildBackEl` (id scheme `rank`+suit-letter via `cardAssetId`), and `dybDieHTML` standard faces + new `dybDieBackHTML` (fixed the old `dyb.js` cup-die seam bypass). Terminal restructured to **nested categories** (`WORD PACKS` theme→game; `GAME SKINS` game→skin) so pulling IP word packs at go-live cleanly drops a category. Five sample SVG skins shipped (`neon-fruit/sheep/gems/deck/dice`).
**Why:** Swappable custom art on the same drop-a-folder + one-registry-line model; device-local cosmetic (ids-only packets → no MP sync); base app stays lean (skins runtime-cached, never precached).
**Scope/limits:** DYB skins keyed by face value 1–6 only (no per-die-type art — YAGNI); SHP cursed card (id 13) not skinnable. Templates + content-prompt updated so future games declare asset expectations and stay seam-ready.
**Changed:** `js/secret-mode.js`, `js/lib/cards.js`, `js/games/{frt,shp,flw,dyb}.js`, `css/styles.css`, `data/packs/*`, `docs/expansion-guide.md` §C.2, code-map, brief/tech templates, `docs/content-prompts/asset-pack-prompt.md`. Detail: `docs/cartridge-system-plan.md` Part B + `docs/expansion-guide.md`.

## 2026-06-30 — Cartridge system Phase A shipped (word packs runtime-loaded)
**Category:** Architecture
**Decision:** The three existing expansions (dota2/monsterhunter/pokemon) are now `data/packs/<id>/pack.json` manifests with inline `words`, listed in `data/packs/registry.json`. `secret-mode.js` builds `SM_TERMINAL_CONFIG.expansions`/`SM_EXPANSION_OVERRIDES`/`SM_PACK_WORDS` at runtime via `smLoadPacks()` (`await`ed in `smOpenTerminal()`); `sw.js` runtime-caches `data/packs/` (network-first JSON, cache-first images); legacy `data/secret*_words.json` deleted. `Infinity` settings stored as the string `"Infinity"` and revived by `smReviveSettings()`.
**Why:** Adding/removing a word pack is now a folder + one registry line — no JS/SW edit, no version bump (this refactor itself shipped once as SW v140).
**Deferred:** Phase B (asset packs — `assets` block + render-seam guards). Open decisions resolved as defaults: inline words, terminal selector, single-purpose packs.
**Changed:** `js/secret-mode.js`, `sw.js` (v139→v140), `data/packs/*`, `docs/expansion-guide.md`, code-map/logic-engine/definitions. Detail: `docs/cartridge-system-plan.md` Part A + `docs/expansion-guide.md`.

## 2026-06-30 — Cartridge system adopted (expansion + asset packs); lobby min-players hint
**Category:** Architecture / Strategy
**Decision:** Word expansions and future custom-art skins both become drop-in **cartridges** — one `data/packs/<id>/pack.json` manifest + a shared `data/packs/registry.json`; the Secret Mode consts (`SM_TERMINAL_CONFIG`/`SM_EXPANSION_OVERRIDES`) become runtime-built from manifests. Asset packs add an optional `assets` block read by the existing per-game render seams (`flwRenderCard`/`shpRenderCard`/`frtRenderCard`/`dybDieHTML`/`Cards`). Also shipped: host-lobby min-players hint (SW v139).
**Why:** Make packs add/remove with zero JS/SW edits (just a folder + one registry line); keep the base app lean by runtime-caching everything under `data/packs/` instead of precaching, so heavy art never bloats the install and is removable without friction.
**Deferred:** Implementation not started — plan only. Asset packs are device-local cosmetic (ids-only packets → no MP sync). Open decisions: inline-words default, terminal-vs-Settings selector, single- vs combined-purpose packs.
**Changed (shipped):** lobby hint — `js/engine-multiplayer.js`, `index.html`, `sw.js` v139. Detail: `docs/cartridge-system-plan.md` (full spec + swap-in/out user guide).

## 2026-06-30 — PASS playtest fixes; reusable MP stray-packet lesson
**Category:** Architecture (MP) / minor game-design
**Decision:** Fixed PASS multiplayer round-end (clients stuck on the play screen) by gating stray/late `PASS_TURN_RESULT` packets behind a `passPhase === 'round-over'` check; added gameplay rules (3♦ lowest leads round 1 + must include that card in the opening combo; Open Climbing Mode setting) plus round-wrap / Joker-order / modal polish.
**Why:** The host navigates to round-wrap *locally* and the engine drops its own re-delivered SYNCs, so only clients (SYNC-driven) were bounced back to the table by a buffered turn packet — the "Firebase re-delivers buffered events" failure class already flagged in the MDLM patterns.
**Reusable lesson:** Any host-authoritative game whose terminal screen is reached via a broadcast SYNC should gate its per-turn SYNC handlers behind a terminal-phase flag, so a re-delivered mid-round packet cannot navigate a client backwards. Candidate to elevate to `logic-engine.md` if a second game hits it.
**Changed:** `js/games/pass.js`, `js/engine-multiplayer.js` (settings serialiser), `index.html` (settings card, how-to, modal), `sw.js` v137. Detail: `docs/implementation-notes/pass-implementation-notes.md` (Playtest Fixes, 30 June 2026).

## 2026-06-30 — No-build constraint reviewed; dev-only assembly build deferred (with trigger)
**Category:** Architecture / Strategy
**Decision:** Keep the current constraints — $0/free-tier, vanilla JS, offline PWA, GitHub Pages, single-file `index.html`. The "no build tools" rule was reviewed and **kept**; the proposed *dev-only assembly build* (per-game HTML partials concatenated into the shipped `index.html` by a Node script that is NOT part of the runtime — register Lever A) is **deferred, not rejected**. Custom asset packs proceed now via the runtime render seam (`[abbr]RenderCard` etc.) — they need no build. Near-term focus is polish/fix of the 16 existing games, then asset exploration; new games are much later.
**Why:** "$0" and "no build" are independent (a build costs nothing) — so the only thing the no-build rule actually costs is the 540 KB `index.html` token pain, which is now managed by cheaper means (relocation + read-discipline + subagent-hunt). A build adds owner-facing fragility (non-coder owner: a broken build leaves them stuck), not justified while the pain is mitigated and no new games are imminent.
**Revisit trigger:** Adopt the dev-only assembly build when `index.html` crosses **~750 KB / ~20 games**, OR when subagent-hunting stops keeping testing/edits under the context ceiling — whichever comes first. Spec it as its own task then (partial structure + Node concat script + SW/offline integrity).
**Changed:** No code change. `docs/templates/testing-session-protocol.md` (added earlier this session) covers the interim discipline. Frameworks / webpack / a real backend explicitly out of scope.
**Detail:** `docs/token-budget-register.md` § 5 Lever A (the build option) and § 7 (hard constraints); memory `project_asset_pack_direction` (render seam).

## 2026-06-30 — Token-budget register (canonical token-burn record)
**Category:** Process
**Decision:** Created `docs/token-budget-register.md` — the single canonical record of token/context-burn incidents, findings, actions, foreseeable concerns, and the ranked action plan. Distils the raw transcript (`token-efficiency-lessons-learnt.md`) and the post-fix handoff (`docs/token-budget-handoff.md`) into one living, structured doc.
**Why:** The token-burn history was scattered across a raw chat dump and a handoff brief; a non-coder owner (and a fresh session) needs one findable place to see what caused the spirals, what's fixed, and what's left.
**Changed:** `docs/token-budget-register.md` (new). Companion docs kept, not superseded. Memory `project_context_budget` pointer added.
**Detail:** `docs/token-budget-register.md` is canonical; mirror to Confluence.

## 2026-06-30 — Settings-label emoji convention (only Sylly Mode)
**Category:** Process (UI)
**Decision:** Setting card titles carry no emoji prefix; the sole exception is the `✨ Sylly Mode` card. Codified in `ui-style.md` § Settings Card Standard. (Surfaced during a Secret Signals playtest pass that also added round-1 interception immunity and collapsed SS "Vault Rotations" to an ON/OFF toggle — those two are routine balance/polish, logged in `ss-implementation-notes.md` S13–S15.)
**Why:** `✨` should be the unambiguous marker for the advanced/last card; other emoji on labels dilute that signal.
**Changed:** `ui-style.md` (§ Settings Card Standard); `index.html` (SS "⏱ Broadcaster Timer" → "Broadcaster Timer"). SW v136.
**Detail:** `docs/implementation-notes/ss-implementation-notes.md` S13–S15.

## 2026-06-29 — Phase 36: Flawless (FLW) — private-hand multiplayer model
**Category:** Architecture
**Decision:** Introduced `mpSendPrivate(targetUid, envelope)` + `mpStartPrivateListener()` in `engine-multiplayer.js` — writes to `rooms/{code}/private/{uid}` so each device receives only its own hand data; the public `/events` channel never carries card content. Suite's first True Network Privacy model.
**Why:** Flawless requires each player's Showpiece hand to stay invisible to others; the existing public SYNC channel would expose all hands to all devices, defeating the core bluffing mechanic.
**Changed:** `engine-multiplayer.js` (`mpSendPrivate`, `mpStartPrivateListener`, `mpPrivateListener` handle + `mpStopListeners()` teardown); `js/games/flw.js` (all hand distribution via private channel). `MP_GAME_CONFIGS.flw`, `mpSerialiseSettings` case, `mpHandleEnvelope` FLW block added.
**Detail:** `docs/archive/phase36-snapshot.md`; `docs/implementation-notes/flw-implementation-notes.md`.

## 2026-06-29 — Decision log + task-playbook system
**Category:** Process
**Decision:** Added this repo-canonical decision log, a bug/polish intake template (`docs/templates/task-bug-polish.md`), and a "Task Playbooks" front-door map in CLAUDE.md.
**Why:** Decisions and habits were scattered across phase snapshots, impl notes, and memory; the (non-coder) owner needs one findable place to recall *what/why* and *how to start a task* as the library grows. Consistency is the goal.
**Changed:** `docs/decision-log.md` (new), `docs/templates/task-bug-polish.md` (new), CLAUDE.md (Task Playbooks section + Documentation Integrity Protocol step 6). Existing new-game and audit workflows left untouched (single source of truth — only the bug/polish gap was filled).
**Detail:** this file is canonical; mirror to Confluence.

## 2026-06-29 — Context-budget reduction
**Category:** Process
**Decision:** Stopped auto-loading `game-identities.md` + the new-game/audit docs into every session (~48k tokens off the always-on baseline, ~75k → ~28k).
**Why:** Token burn was within-session, driven by forced reads (huge baseline + full `index.html` reads during bug fixing).
**Changed:** CLAUDE.md rule-file list (split always-on vs on-demand) + Per-Game Quick Index; `docs/code-map.md` Per-Game Offset Map + "never full-read index.html" rule. **Deferred:** de-`@`-ing `ui-style.md`/`logic-engine.md` (kept loaded — apply-on-every-edit pattern rules, drift risk > saving).
**Detail:** memory `project_context_budget`; this log entry is the canonical record.

## 2026-06 (Phase 26+) — Fable Studio Audit fix campaign
**Category:** Process
**Decision:** Ran a studio-wide audit across all games (71 tracked items + deferred), fixing drift, MDLM gaps, and UI inconsistencies, and elevating recurring bugs into rule files.
**Why:** As the library grew, the same bug classes recurred across games; one-off fixes weren't preventing repeats.
**Changed:** Many plugins + `logic-engine.md`/`ui-style.md`/`phase-audit.md` (recurring-bug rules elevated). 
**Detail:** `docs/archive/fable-audit-snapshot.md`, `docs/fable-audit-plan.md`.

## 2026-06 — The Stack: single canonical screen layout
**Category:** Architecture (UI)
**Decision:** Every screen is built as "the Stack" (Header → Stage → Controls in one centred `max-w-sm` column); the legacy `h-screen` sticky-footer pattern is deprecated for new screens.
**Why:** The sticky-footer split was the largest source of sparse, edge-pinned screens; a single pattern removes the per-screen decision and enforces consistency.
**Changed:** `ui-style.md` (§ The Stack); suite-wide migration of content/results screens (whitelist of justified exceptions retained).
**Detail:** `ui-style.md` § The Stack + legacy whitelist.

## 2026-06 — Thematic rebrand (incl. The Bluff)
**Category:** Strategy (Brand)
**Decision:** Renamed games/modes thematically — e.g. Dicey Bluffs → "The Bluff" (climb/cliff metaphor), Sylly Mode renames — while keeping ALL internal code identifiers unchanged (view-layer strings only).
**Why:** Stronger, more consistent brand voice without risking a code-wide identifier churn.
**Changed:** `index.html` display strings + `game-identities.md`. Internal `dyb` prefix, packet names, screen IDs unchanged.
**Detail:** `game-identities.md` § The Bluff (DYB).

## Phase 32 — MDLM mid-game quit contract (PASS reference)
**Category:** Architecture
**Decision:** In MDLM, a mid-game quit dissolves the whole match (host `HOST_END_GAME`; client `[ABBR]_PLAYER_LEFT` → host `[ABBR]_MATCH_DISSOLVED` → all `resetToLobby()`). One leaver ends it for everyone.
**Why:** Prevents ghost Firebase rooms and stranded devices; the correct teardown for same-room couch games.
**Changed:** PASS/NT/FRT/SHP quit handlers + `logic-engine.md` (§ MDLM Mid-Game Quit Contract). **Deferred:** GTH/DYB/BLD still navigate to game menu (logged divergence).
**Detail:** `logic-engine.md` § MDLM Mid-Game Quit Contract.

## (Ongoing) — Asset-pack render-seam direction
**Category:** Strategy / Architecture
**Decision:** Build every visual primitive (cards/dice/fruit/etc.) through a single id-based render seam now (e.g. `frtRenderCard`, `shpRenderCard`, `Cards` module); defer the actual skin/asset-pack loader.
**Why:** Long-term goal of swappable custom art packs; doing the seam now means zero packet/logic churn when the loader arrives later.
**Changed:** Per-game render functions route all card/asset DOM through one function. **Deferred:** the loader itself.
**Detail:** memory `project_asset_pack_direction`.

## Phase 22 — Multiplayer (MFS v1.4)
**Category:** Architecture
**Decision:** Added Firebase-backed Lobby Mode with three styles (PTP single-device, TLM 2-device teams, MDLM individual devices) on a universal Envelope (ACTION/SYNC/LOBBY) model; host-authoritative.
**Why:** Enable remote/multi-device play at zero hosting cost while keeping the offline-first PWA.
**Changed:** `engine-multiplayer.js`, per-game interceptors + `MP_GAME_CONFIGS`, all game-identities multiplayer subsections.
**Detail:** `docs/multiplayer-feature-specification-v1.4.md`; `docs/archive/phase22-snapshot.md`.

## (Established) — Three-stage new-game process
**Category:** Process
**Decision:** Every new game goes Brief → Technical Spec → Implementation, each with a hard gate; no game code until the spec is confirmed.
**Why:** Implementation starting before design was locked caused documentation drift; gates prevent it.
**Changed:** `docs/rules/new-game-process.md` + brief/technical templates.
**Detail:** `docs/rules/new-game-process.md`.

## (Established) — Secret Mode expansion proxy architecture
**Category:** Architecture
**Decision:** Expansion word packs are added via a proxy/override system (`applyExpansionOverrides()` hook); plugin files are never patched per-expansion.
**Why:** Adding a new themed word bank should be a 4-step content task, not a code change to every game.
**Changed:** `js/secret-mode.js` + per-game override hooks.
**Detail:** `docs/expansion-guide.md`.
