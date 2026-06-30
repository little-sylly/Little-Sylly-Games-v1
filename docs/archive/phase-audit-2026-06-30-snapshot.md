# Phase Snapshot — Protocol A Audit & Polish Sweep (30 June 2026, SW v141)

**Type:** Maintenance gate (Phase Gate — Studio Audit, Protocol A). Not a new-game phase.
**Follows:** Cartridge System Phase B (asset/skin packs) + Phase 36 (Flawless).
**Gold Master:** unchanged — 16 games + multiplayer.

---

## Confluence Snapshot

**Decision:** Ran Protocol A across the suite after the recent burst of work (Cartridge Phase A/B + SHP + FLW); swept the easy-to-spot inconsistency/polish items and shipped three confident fixes, deferring nothing new beyond items already tracked elsewhere.

**Rationale:** A lot landed recently (asset-pack seams touched five plugins; two new games shipped). Protocol A is the gate that confirms the recent work didn't introduce the recurring cross-suite regressions before the next thing begins. The headline polish item was the Counting Sheep sheep animation reading as a straight angled vector rather than the intended graceful fence-jump arc.

**Technical Impact:** CSS-only animation rework (no JS logic change), dead-code/stale-comment cleanup in two plugins, SW cache bump v140 → **v141**, and the mandated doc updates. No architectural change → no new decision-log entry (per Documentation Integrity Protocol step 6, routine polish is skipped).

---

## Protocol A — Checklist Results

The mechanical drift/debt checks came back **clean across all 16 games** — the recent Phase B + SHP/FLW work did not introduce the usual regressions.

| Check | Result |
|---|---|
| Deprecated `sylly-toggle-on` usage | ✅ none (JS/HTML) |
| Forbidden `classList.remove('pill')` / `classList.toggle('pill')` | ✅ none |
| `window.` prefix on `let`-declared MP globals (`mpMyPlayerIdx`/`mpPlayerSlots`/`mpActiveGame`/`mpActiveRoomCode`/`mpActiveGameConfig`) | ✅ none |
| American spelling in UI copy | ✅ none (all `color:` hits are legitimate CSS properties) |
| `[?]` how-to button present + wired on every game | ✅ all 16 (`btn-[abbr]-how-to`) |
| Decision-modal `border border-[brand]` | ✅ consistent (incl. FLW `#E9A8C0`, SHP `indigo-300`) |
| Newest-game sound-button re-wiring (post-`<script>`-block gap) | ✅ SHP + FLW both re-wire `.btn-open-sound` in `DOMContentLoaded` |
| Generic placeholder strings (`Game Over`, bare `Score`/`Points`/`Player`/`Vote`) in newest games | ✅ none |
| Surviving `TODO` / `FIXME` in plugins | ⚠️ 4 found → all resolved (see below) |

**Audit depth note:** checks were run via targeted Grep across the suite + close reads of the two freshest games (SHP, FLW). A full per-screen Stack/edge-pinning read of all ~515 KB of `index.html` was **not** performed — deferred as optional follow-up.

---

## Changes Shipped

1. **Counting Sheep — sheep fence-jump arc.** `css/styles.css` `@keyframes shpSheepArcIn` / `shpSheepArcOut` rebuilt from a single 55% midpoint (which under `ease-in-out` rendered as two straight legs — the "angled vector") into a proper parabola: horizontal travel evenly spaced (25/50/75% → −97/−65/−33px), vertical apex at 50% (−52px). `.shp-sheep-fly` timing-function changed `ease-in-out` → `linear` so the parabolic keyframes supply the natural gravity feel (fast launch → hang at apex → fast descent). CSS-only; the data-driven direction logic in `shpStartSheepAnim()` is untouched.

2. **Stale `TODO` scaffold markers removed (SHP).** Two section headers (`// Overlays — TODO`, `// Multiplayer — TODO (§11)`) sat above fully-implemented, shipped code in `js/games/shp.js` — markers dropped.

3. **Dead NT stubs deleted.** `ntComputePlayback()` (empty body) and `ntValidateTeams()` (`return true`) in `js/games/nt.js` — orphaned skeleton functions with zero references anywhere in the codebase; the real DNP work landed under differently-named functions. Removed.

---

## Files Touched

| File | Change |
|---|---|
| `css/styles.css` | sheep arc keyframes + `.shp-sheep-fly` timing-function |
| `js/games/shp.js` | removed 2 stale `TODO` section-header markers |
| `js/games/nt.js` | deleted 2 dead stub functions |
| `sw.js` | `CACHE_NAME` v140 → v141 (precached CSS/plugins changed) |
| `CLAUDE.md` | SW version + focus line |
| `.claude/rules/logic-engine.md` | Current SW version v141 |
| `docs/implementation-notes/shp-implementation-notes.md` | arc-rework polish entry |
| `docs/implementation-notes/nt-implementation-notes.md` | dead-stub cleanup entry |

---

## Deferred (already tracked — no new action created)

- **MDLM mid-game quit divergence** (GTH / DYB / BLD navigate to game-menu instead of `resetToLobby()`) — logged in `docs/fable-fix-plan.md` Deferred Items; left as-is.
- **GTH Play-CTA contains an emoji** ("Start the Session 🛋️") — violates the "no emoji on menu CTAs" rule; already AUDIT-FLAGGED in `ui-style.md` for the Phase 3 GTH audit.

Both pre-existing and intentionally not re-touched to avoid duplicate churn.

---

## Verification

- Greps re-run post-edit: no `TODO`/`FIXME` remain in `js/games/`; the two NT stub names return zero matches repo-wide.
- Sheep arc change is CSS-only and self-contained to `.shp-sheep-fly` + its two keyframes (class used nowhere else).
- Static audit only — not run in a live browser. Recommend a quick visual check of the Counting Sheep Climb-phase sheep flight on next playtest to confirm the arc reads as intended.

---

## What's Next

Suite is at a clean Protocol A gate. Options from here: (a) a deeper per-screen Stack/edge-pinning read of SHP + FLW (the freshest games), or (b) proceed to the next game's Protocol C pre-game sweep when a new game is queued.
