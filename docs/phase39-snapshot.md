# Phase Snapshot — Phase 39: Cookie Jar (CJAR) (3 Aug 2026, SW v162)

**Type:** New game (game 18) — base game + Sylly Mode built in a single phase.
**Follows:** Phase 38 (Force of Nature — PKO Sylly Mode, three-device session confirmed clean).
**Gold Master:** 18 games + multiplayer. **The phase gate is CLOSED** — both required checks (multi-device play, offline install) have been satisfied; what remains is deliberately deferred suite-wide sweeps, listed below, none of which block Cookie Jar itself.

---

## Confluence Snapshot

**Decision:** Cookie Jar ships as game 18 — a simultaneous-choice push-your-luck card game, MDLM-only, 3–8 players, host-authoritative, host-as-participant. Base mode is Incan Gold 1:1 (reveal → resolve → choose about the next, unseen card). Sylly Mode is Dibber Dobber — three actions (Take / Play Innocent / Dob), no bust, nobody leaves, choices commit blind and the card reveals at resolve (Delta 7), so both modes share one mental model despite opposite implementations. Built in one phase rather than PKO-style staging, accepting that the Sylly balance numbers were simulated at a 16-card deck and ship at ~11 (mitigated by `tools/simulate-cjar-dd.js`).

**Rationale:** the confirmed spec (`docs/new-game-tech-cookie-jar.md`) and the 17-task build plan (`docs/superpowers/plans/2026-08-02-cookie-jar.md`) both treated base game and Sylly Mode as one coherent design — unlike PKO, where Force of Nature was deliberately deferred to prove the core loop first. Five headless tools (deck, loop, dd, loopback, simulate) gave every task an objective gate, and playtest round 1 — the first live exposure — found one severe bug (BUG-06, every client frozen from flip 1) that all 222 prior harness checks had missed, which is exactly the class of defect a two-device loopback with a **real wire** and a **real DOM** exists to catch, and which the ML-01 loopback (built without either) had already proven insufficient for.

**Technical Impact:** `js/games/cjar.js` (1777 lines, zero stubs), `data/cjar-data.json`, `data/art/cjar/` (14 JPEGs, 492 KB precached), six screens, seven overlays (the gallery, DD-09, was added mid-build), 79 functions, nine ACTION/SYNC/private packet types. Five verification tools: `verify-cjar-deck.js` (73), `verify-cjar-loop.js` (102), `verify-cjar-dd.js` (47), `verify-cjar-loopback.js` (108), `simulate-cjar-dd.js` (balance instrument). SW v137 → v159 across the whole phase (most of that range is pre-existing v156 work already on the branch when cjar's build began).

---

## A note on what "playtest" means here

This snapshot's first two drafts treated the plan's Task 15 Step 10 "three-device session" as a
separate, still-unrun gate, distinct from "playtest" — implying nobody had actually played a real
multi-device match yet. **That was wrong.** The owner confirmed directly: every gameplay round —
round 1's join/deal/first-flip session and both passes of round 2 — was live 3–4 device play, not
a desk check. Round 1 found BUG-06 there directly (it never got past flip 1); round 2's two passes
played full Raids, full matches, and Dibber Dobber live, and what came back was UI/UX findings, not
correctness bugs. **That is what closes the phase gate.** The one genuinely single-device step —
by design, since that's what makes it a valid test — is the *offline install check*: unregister the
SW, go offline, confirm the art precached. That one is intentionally single-device and is reported
as such below.

## Playtest Round 1 Results

| What ran | Result |
|---|---|
| Four devices joined a full match | **Unplayable as shipped.** Only the host progressed past the Raid 1 intro; every client threw inside `cjarRenderWarningStrip` one line before `showScreen`, so no client screen ever advanced for the whole match |

**Root cause (BUG-06):** Firebase RTDB erases `null`, `{}` and `[]` in flight. cjar's own reset values — `seen: {}`, `trail: []`, `choices: [null,…]`, `counterTreat: null`, `highAlertId: null` — are exactly those erasable shapes, and cjar had zero of the `p.x || []`-style normalisers every other MDLM game had already reached informally. Fixed with `cjarWireArr`/`cjarWireList`/`cjarWireObj` applied across all five SYNC appliers, found and proven by a rebuilt loopback (`verify-cjar-loopback.js`) with a real `fbWrite`/`fbRead` pair and a DOM of real mock elements — the two things the original ad-hoc loopback (ML-01) lacked, and precisely why it had missed BUG-06 despite 222 green checks plus its own run.

**Five further items came out of the same session, all owner-raised, all fixed at v158→v159:**
1. **BUG-07** — the lobby bounced the host back to its own menu instead of straight into Raid 1 (the only MDLM game that did — GTH/FRT/SHP/FLW/PKO all go straight into play).
2. **DD-11** — the stage drew the same card twice (a 15rem hero directly above a trail strip whose rightmost thumb was the identical card); rebuilt as one row (trail → just-revealed → deck) at 8.5rem, which also sharpened the art (~1.1× → ~2.6× effective resolution).
3. **Standings became persistent** — previously only rendered during `'revealing'`, so Open Book had nowhere to show while deciding.
4. **DD-10** — Decision Time became a setting (Blitz 10s / Standard 20s / No Rush), replacing a single fixed 15 s window that measured too short.
5. **DD-09** — the card gallery (`cjar-cards-overlay`) was added because cjar's art otherwise only renders inside a running Raid, which on an MDLM-only game made the offline install check a four-phone exercise instead of a single-device one.

Two further items were owner calls made during the same triage but not bugs: **DD-08** (lobby minimum dropped 4→3, 3-player balance left unsimulated) and **DD-07** (the game-menu buttons were the only ones in the suite at the wrong type scale — `ui-style.md` now states the type scale explicitly).

---

## Playtest Round 2 Results (3 Aug 2026, two passes, SW v159 → v161)

| What ran | Result |
|---|---|
| **Offline install check** — unregister SW → hard reload → Offline → How to Play → The Cards tab (single-device, by design) | **PASSED.** Illustrated cards rendered, so the 14 core-art JPEGs and the manifest are precached. **This deferred item is now closed.** |
| Live 3–4 device play across two passes — full Raids, full matches, Dibber Dobber | Ten changes total, all owner-raised, shipped across v160 → v161 |

**The headline finding, first pass, was a diagnosis, not a fix.** The reported "card stuck under the next one" was **the Treat**, not a render leak: `cjarRenderStage` appended the deck's face-down card *and* `cjarCounterTreat` into the same 56 px column, so the unclaimed Treat drew as an unlabelled thumbnail wedged under the deck in the slot that means "next". Different each Raid because the Treat is scheduled per Raid; persistent across flips because that is its rule. Every harness was right to pass — the mechanic worked, the object had no home (BUG-08).

**First pass — five changes, SW v160:**
1. **DD-12 — the stage became three bands**, superseding DD-11's single row in part. The row had left the history 142 px (~2.6 thumbs of a 10+ flip Raid) and `strip.onclick` fought the swipe that would scroll it. Now: table state → the decision → full-width scrollable history, with `.cjar-card-next` sizing the deck near the live card rather than near the spent ones.
2. **Crumbs moved out of the private strip** onto the stage — it is shared table state, and sitting it between two personal numbers is what made all three unreadable. The two that remain are told apart by shape (filled = banked, outlined = at risk).
3. **DD-13 — settings pills carry the thematic name; the value is a live line below the row.** Decision Time had shipped with its seconds written nowhere; Match Length baked them into labels. Now a `ui-style.md` rule.
4. **DD-14 — the card gallery became a How to Play tab**, `cjar-cards-overlay` deleted. `ui-style.md`'s How-to Overlay Standard gained an optional tab bar with the line drawn: teaching material earns a tab, a mid-play reference keeps its own overlay.
5. **Gameover gained a title — The Haul 🍪**, matching the suite's "The [Noun]" shape.

**Second pass, same day — five more changes, SW v161:**
1. **DD-15 — the stage became a THREE-COLUMN grid, superseding DD-12's bands.** The three elements in the decision band still read as visually disconnected — CSS `grid grid-cols-3 items-stretch` lets columns 1 and 3 stretch to column 2's (the hero's) height with no hardcoded height math. The Treat slot is now **always** rendered at a fixed footprint (a dashed placeholder when empty, the real card at the same size once one exists) — an art arriving fills the space rather than jumping the layout. The deck (col 3) bumped again (6.5 → 7.2rem) with a bolder count. The **history strip** got the same fixed-footprint idea: a single dashed placeholder before the first flip instead of dead space.
2. **DD-16 — the private strip dropped Cookie Stash and This Raid entirely.** The owner's own diagnosis was correct: `cjar-reveal-rows` (the standings, moved to sit directly above the buttons) already shows both for the viewer's own seat at every Open Book setting — `cjarStashVisible()` is unconditionally true for the viewer's own index. What remained was pure duplication. What's left in the strip is Sylly-only (Favourite/Watcher/Owes); it hides entirely in the base game.
3. **Screen order fixed**: Stage → standings → Sylly chips → timer → buttons, buttons fixed at the floor.
4. **The game menu's "See the Cards" button removed** — the gallery lives only in How to Play now, restoring cjar's menu to the Universal Menu Standard's canonical 4 buttons instead of a 5th deviation.
5. **The gallery grid switched `flex-wrap` → `grid-cols-3`** — Family and Treats (5 tiles each) now wrap a deliberate 3-then-2 instead of whatever `flex-wrap` happened to fit (previously 4-then-1).

**The blind-first-flip question is now resolved (DD-17).** Dibber Dobber's first decision of every Raid was made on an empty stage with no protection — `cjarBuildDeck`'s Sylly branch returned before `cjarFloatCookies` ran, so Snack Friendly's guarantee never applied there. Fixed: `cjarFloatCookies(deck, 1)` now runs at the end of the Sylly branch, after its own final shuffle, without weakening the blind commit (Delta 7) — nothing is revealed before the choice, only the guaranteed card at position 0 changed. Re-measured against the DD-06 baseline: 5p spread 34.3 → 31.4 pts, Innocent 53.5% → 51.4%; 8p spread 37.4 → 37.6 pts, Innocent 52.9% → 52.3% — within the noise band Delta 7 itself established. SW v161 → v162.

---

## Changes Shipped (v156 → v162, this phase)

1. **The whole Cookie Jar plugin** — base game (Incan Gold 1:1) + Dibber Dobber Sylly Mode, both built against the confirmed spec in one 17-task phase.
2. **BUG-06 fix and the wire/DOM upgrade to the loopback harness** — the standard fifth MP tool gained the two properties (`fbWrite`/`fbRead`, real mock elements) that make it able to catch a render-time throw, elevated to `logic-engine.md` § MDLM Patterns as a universal rule.
3. **Five playtest-round-1 fixes** — BUG-07 (lobby routing), DD-11 (one-row stage + persistent standings), DD-10 (Decision Time setting), DD-09 (card gallery), plus DD-08/DD-07 (min players, menu type scale).
4. **Playtest round 2, two passes.** First pass: BUG-08 (the "stuck card" was the Treat, not a leak — it had no labelled slot), DD-12 (stage → three bands), DD-13 (settings dynamic-value line, new suite standard), DD-14 (card gallery → How to Play tab, new suite standard), plus the gameover title ("The Haul 🍪"). Second pass, same day: DD-15 (stage → three-column CSS grid, superseding DD-12; fixed-footprint placeholders for both the Treat slot and the empty history strip), DD-16 (private strip drops Cookie Stash/This Raid entirely — the standings table already showed both for the viewer's own seat at every Open Book setting), the game menu's "See the Cards" button removed (back to the Universal Menu Standard's 4-button shape), and the gallery grid fixed to a deliberate 3-then-2 (`grid-cols-3`, not `flex-wrap`).
5. **Two Task-17 documentation gaps closed in passing** — DD-01 (Grandma archetype, art didn't match the spec's "Little Brother") and Delta 6/DD-04 (High Alert's escalation-pool exclusion), both recorded in the decision log alongside the round-1 items.
6. **The pre-existing FRT `getMuteToggleOnClass()` gap found and logged, not fixed** — an unrelated game's bug, deliberately left for its own commit.
7. **The repo's commit history was incomplete and has been closed.** `js/games/cjar.js` had been committed during Task 17, but `data/cjar-data.json`, the core art, and `js/engine-multiplayer.js`'s `MP_GAME_CONFIGS.cjar` entry (the lobby config — cjar is MDLM-only, so without it the game cannot be entered at all) had not. All committed now, along with the four verify tools, the simulator, the spec, the plan, and the content guide.
8. **DD-17 — Dibber Dobber's flip 1 is guaranteed a cookie, without weakening the blind commit.** `cjarFloatCookies(deck, 1)` now runs at the end of the Sylly branch's deck build, after its own final shuffle. Re-measured against the DD-06 baseline and confirmed noise-level movement only.

---

## Files Touched (this phase)

| File | Change |
|---|---|
| `js/games/cjar.js` | new — 1777 lines, 79 functions, zero stubs |
| `data/cjar-data.json` | new — 15 cookie values, 5 family archetypes, 5 treats, both schedules |
| `data/art/cjar/` | new — 14 JPEGs (492 KB) + manifest, core art from day one |
| `docs/cjar-content-guide.md` | new — flavour-line authoring rules |
| `index.html` | six screens, seven overlays, script tag, lobby button |
| `js/engine.js` | `allScreens[]`, slider map, toggle map, `resetToLobby()` teardown |
| `js/engine-multiplayer.js` | `MP_GAME_CONFIGS.cjar` (incl. `getMinPlayers: () => 3`, `ctaTextClass: 'text-stone-800'`) |
| `css/styles.css` | `cjar-*` brand classes, `cjar-card-stage`/`cjar-card-flipin`/`cjar-trail-settle`, timer `transform-origin` fix |
| `sw.js` | manifest + 14 images precached; `CACHE_NAME` v137 → v159 across the phase |
| `tools/verify-cjar-deck.js` / `-loop.js` / `-dd.js` / `-loopback.js` / `simulate-cjar-dd.js` | new — 73 / 102 / 47 / 108 / balance instrument |
| `docs/new-game-tech-cookie-jar.md` | confirmed Stage 2 spec |
| `docs/superpowers/plans/2026-08-02-cookie-jar.md` | 17-task build plan, 7 deltas recorded |
| `docs/implementation-notes/cjar-implementation-notes.md` | new — Design Decisions / Bug Index / Multiplayer Lessons / Template Gaps |
| `docs/implementation-notes/frt-implementation-notes.md` | FRT `getMuteToggleOnClass` gap logged (not fixed) |
| `docs/rules/game-identities.md` | § Game 18: Cookie Jar |
| `docs/code-map.md` | Cookie Jar section + offset map row |
| `docs/decision-log.md` | ten entries — ship summary, Grandma, High Alert, Delta 7, loopback-as-standard-tool, BUG-06/wire rule, DD-09 gallery, DD-11 stage rebuild, DD-10 Decision Time, BUG-07 lobby, DD-08 min players, DD-07 type scale |
| `docs/content-prompts/new-game-brief-prompt.md` | roster row, taken-abbreviation, Sylly Mode name list |
| `.claude/rules/ui-style.md` | Tables A/B/C rows, Universal Menu Standard type scale, interstitial exemption list |
| `.claude/rules/logic-engine.md` | MDLM Patterns rules (Firebase erasure, loopback wire+DOM, `[].every()` gate), `ctaTextClass` second consumer, SW version |
| `CLAUDE.md` | Per-Game Quick Index row 18, Load Order, SW Version, Current Focus |

---

## Deferred / Not Yet Done

**The phase gate is CLOSED** — both required checks (live multi-device play, offline install) are satisfied. What remains below is deliberately deferred suite-wide work, not a blocker on Cookie Jar itself:

1. **A suite-wide sweep for the BUG-06 class is not done.** cjar is fixed; whether any of the other 17 games assigns a raw payload collection Firebase could erase has not been audited. Worth a Protocol A pass.
2. **DD-06 (Play Innocent wins ~52–53% at both table sizes) is flagged, not retuned** — deliberate, so playtest has a stable baseline to compare against. If a lever is ever needed, the candidates are the scare-off's unconditional full-pool sweep and the Dob backfire severity, not the Treat rule (a mechanism probe disconfirmed that).
3. **3-player balance is unsimulated** — `simulate-cjar-dd.js` only ran at 5 and 8 players; the min-player drop to 3 (DD-08) is an owner call not yet checked against the solo-Sneak-Out jackpot's higher hit rate at small tables.
4. **The FRT `getMuteToggleOnClass()` gap** is logged (`frt-implementation-notes.md`) but deliberately not fixed in this phase — a separate, unrelated commit.
5. **Two sweeps opened by round 2, both deferred on purpose.** The DD-13 settings dynamic-value line across the other 17 games, and a card gallery / How-to tab for the other core-art games (FLW, SHP, FRT, PKO) — those four still have DD-09's original problem, where the offline check for their art needs a running match.
6. ~~The Dibber Dobber blind-first-flip question~~ — **RESOLVED, DD-17, SW v162.** See above.

---

## Verification

- `node tools/verify-cjar-deck.js` — 73/73 PASS.
- `node tools/verify-cjar-loop.js` — 102/102 PASS.
- `node tools/verify-cjar-dd.js` — 47/47 PASS.
- `node tools/verify-cjar-loopback.js` — 112/112 PASS (gained the How-to tab-switch, empty-trail-placeholder, real-card-only `stageThumbs()`, and DD-17's flip-1-is-a-cookie assertions).
- Live: playtest round 1 (4 devices, unplayable as found — BUG-06 — five fixes applied) and playtest round 2, two passes (3–4 devices, full Raids/matches/Dibber Dobber played live; offline install check passed single-device, by design; ten UI/UX fixes applied, zero correctness bugs found). **Multi-device play is confirmed across both rounds.**
