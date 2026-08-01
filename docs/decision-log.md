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
