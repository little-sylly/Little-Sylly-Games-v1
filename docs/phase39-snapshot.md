# Phase Snapshot — Phase 39: Cookie Jar (CJAR) (3 Aug 2026, SW v160)

**Type:** New game (game 18) — base game + Sylly Mode built in a single phase.
**Follows:** Phase 38 (Force of Nature — PKO Sylly Mode, three-device session confirmed clean).
**Gold Master:** was 17 games + multiplayer; this phase adds an 18th — **but the phase gate is NOT closed** (see § Deferred below). Do not treat this snapshot as a "shipped and verified" record the way phase37/38 are.

---

## Confluence Snapshot

**Decision:** Cookie Jar ships as game 18 — a simultaneous-choice push-your-luck card game, MDLM-only, 3–8 players, host-authoritative, host-as-participant. Base mode is Incan Gold 1:1 (reveal → resolve → choose about the next, unseen card). Sylly Mode is Dibber Dobber — three actions (Take / Play Innocent / Dob), no bust, nobody leaves, choices commit blind and the card reveals at resolve (Delta 7), so both modes share one mental model despite opposite implementations. Built in one phase rather than PKO-style staging, accepting that the Sylly balance numbers were simulated at a 16-card deck and ship at ~11 (mitigated by `tools/simulate-cjar-dd.js`).

**Rationale:** the confirmed spec (`docs/new-game-tech-cookie-jar.md`) and the 17-task build plan (`docs/superpowers/plans/2026-08-02-cookie-jar.md`) both treated base game and Sylly Mode as one coherent design — unlike PKO, where Force of Nature was deliberately deferred to prove the core loop first. Five headless tools (deck, loop, dd, loopback, simulate) gave every task an objective gate, and playtest round 1 — the first live exposure — found one severe bug (BUG-06, every client frozen from flip 1) that all 222 prior harness checks had missed, which is exactly the class of defect a two-device loopback with a **real wire** and a **real DOM** exists to catch, and which the ML-01 loopback (built without either) had already proven insufficient for.

**Technical Impact:** `js/games/cjar.js` (1777 lines, zero stubs), `data/cjar-data.json`, `data/art/cjar/` (14 JPEGs, 492 KB precached), six screens, seven overlays (the gallery, DD-09, was added mid-build), 79 functions, nine ACTION/SYNC/private packet types. Five verification tools: `verify-cjar-deck.js` (73), `verify-cjar-loop.js` (102), `verify-cjar-dd.js` (47), `verify-cjar-loopback.js` (108), `simulate-cjar-dd.js` (balance instrument). SW v137 → v159 across the whole phase (most of that range is pre-existing v156 work already on the branch when cjar's build began).

---

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

## Playtest Round 2 Results (3 Aug 2026, SW v159 → v160)

| What ran | Result |
|---|---|
| **Offline install check** — unregister SW → hard reload → Offline → menu → "See the Cards" | **PASSED.** Illustrated cards rendered, so the 14 core-art JPEGs and the manifest are precached. **This deferred item is now closed.** |
| Single-device review of the table, settings and end screen | Five changes, all owner-raised, all shipped at v160 |

**The headline finding was a diagnosis, not a fix.** The reported "card stuck under the next one" was **the Treat**, not a render leak: `cjarRenderStage` appended the deck's face-down card *and* `cjarCounterTreat` into the same 56 px column, so the unclaimed Treat drew as an unlabelled thumbnail wedged under the deck in the slot that means "next". Different each Raid because the Treat is scheduled per Raid; persistent across flips because that is its rule. Every harness was right to pass — the mechanic worked, the object had no home (BUG-08).

**The five changes:**
1. **DD-12 — the stage became three bands**, superseding DD-11's single row in part. The row had left the history 142 px (~2.6 thumbs of a 10+ flip Raid) and `strip.onclick` fought the swipe that would scroll it. Now: table state → the decision → full-width scrollable history, with `.cjar-card-next` sizing the deck near the live card rather than near the spent ones.
2. **Crumbs moved out of the private strip** onto the stage — it is shared table state, and sitting it between two personal numbers is what made all three unreadable. The two that remain are told apart by shape (filled = banked, outlined = at risk).
3. **DD-13 — settings pills carry the thematic name; the value is a live line below the row.** Decision Time had shipped with its seconds written nowhere; Match Length baked them into labels. Now a `ui-style.md` rule.
4. **DD-14 — the card gallery became a How to Play tab**, `cjar-cards-overlay` deleted. `ui-style.md`'s How-to Overlay Standard gained an optional tab bar with the line drawn: teaching material earns a tab, a mid-play reference keeps its own overlay.
5. **Gameover gained a title — The Haul 🍪**, matching the suite's "The [Noun]" shape.

**One question raised and deliberately not acted on.** In Dibber Dobber the first decision of every Raid is made on an empty stage, and `cjarBuildDeck`'s Sylly branch returns before `cjarFloatCookies` — so **Snack Friendly does nothing in Sylly** (its card is hidden, so this is honest rather than a lie). Floating a cookie to the front would keep the commit blind while making it unpunishable. Left alone: it is a rules change to an economy whose balance baseline (DD-06) was measured without it, and the standing discipline is not to retune pre-playtest. **Owner call.**

---

## Changes Shipped (v156 → v160, this phase)

1. **The whole Cookie Jar plugin** — base game (Incan Gold 1:1) + Dibber Dobber Sylly Mode, both built against the confirmed spec in one 17-task phase.
2. **BUG-06 fix and the wire/DOM upgrade to the loopback harness** — the standard fifth MP tool gained the two properties (`fbWrite`/`fbRead`, real mock elements) that make it able to catch a render-time throw, elevated to `logic-engine.md` § MDLM Patterns as a universal rule.
3. **Five playtest-round-1 fixes** — BUG-07 (lobby routing), DD-11 (one-row stage + persistent standings), DD-10 (Decision Time setting), DD-09 (card gallery), plus DD-08/DD-07 (min players, menu type scale).
4. **Two Task-17 documentation gaps closed in passing** — DD-01 (Grandma archetype, art didn't match the spec's "Little Brother") and Delta 6/DD-04 (High Alert's escalation-pool exclusion), both recorded in the decision log alongside the round-1 items.
5. **The pre-existing FRT `getMuteToggleOnClass()` gap found and logged, not fixed** — an unrelated game's bug, deliberately left for its own commit.

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

**This phase gate is explicitly NOT closed.** Following the same discipline as PKO's `PKO_CARRION_OPEN` (recording an unverified path honestly rather than implying coverage):

1. **The three-device session (plan Task 15 Step 10) has never been run — and is now the ONLY blocking item.** Playtest round 1 was the first live multi-device exposure and never got past flip 1 (BUG-06); round 2 was single-device. Nothing downstream of the decision window — the reveal, a bust, a Sneak-Out, a full Raid, a full match, Dibber Dobber live — has been observed across real devices. No harness substitutes for this.
2. ~~The offline install check~~ — **DONE and PASSED, 3 Aug 2026 (round 2).** See above.
3. **A suite-wide sweep for the BUG-06 class is not done.** cjar is fixed; whether any of the other 17 games assigns a raw payload collection Firebase could erase has not been audited. Worth a Protocol A pass.
4. **DD-06 (Play Innocent wins ~52–53% at both table sizes) is flagged, not retuned** — deliberate, so playtest has a stable baseline to compare against. If a lever is ever needed, the candidates are the scare-off's unconditional full-pool sweep and the Dob backfire severity, not the Treat rule (a mechanism probe disconfirmed that).
5. **3-player balance is unsimulated** — `simulate-cjar-dd.js` only ran at 5 and 8 players; the min-player drop to 3 (DD-08) is an owner call not yet checked against the solo-Sneak-Out jackpot's higher hit rate at small tables.
6. **The FRT `getMuteToggleOnClass()` gap** is logged (`frt-implementation-notes.md`) but deliberately not fixed in this phase — a separate, unrelated commit.
7. **Two sweeps opened by round 2, both deferred on purpose.** The DD-13 settings dynamic-value line across the other 17 games, and a card gallery / How-to tab for the other core-art games (FLW, SHP, FRT, PKO) — those four still have DD-09's original problem, where the offline check for their art needs a running match.
8. **The Dibber Dobber blind-first-flip question** (Snack Friendly is inert in Sylly) — diagnosed, one-line fix available, deliberately unactioned because it changes an economy whose baseline was measured without it. Owner call.

---

## Verification

- `node tools/verify-cjar-deck.js` — 73/73 PASS.
- `node tools/verify-cjar-loop.js` — 102/102 PASS.
- `node tools/verify-cjar-dd.js` — 47/47 PASS.
- `node tools/verify-cjar-loopback.js` — 110/110 PASS (gained the How-to tab-switch assertions in round 2).
- Live: playtest round 1 (4 devices, unplayable as found, five fixes applied) and round 2 (single device — the offline install check **passed**, plus five UI changes). **No clean MULTI-DEVICE session has been recorded for Cookie Jar.**
