# Phase 20 Snapshot — Little Sylly Games
**Gold Master:** 8 games complete (no new games added)
**Date:** May 2026
**SW Version:** v78

---

## What Changed in Phase 20

### Part 1 — DSD Phase 20 UX Rework

Post-ship corrections to Deep-Sea Deploy surfaced during pre-audit review:

| Area | Change |
|------|--------|
| Audio | Added `playLaunch()` on `dsdShowMenu()` entry; `playPillClick()` on settings/how-to open |
| Grid composition | 9/8/6/1/1 (with bystander) → **9/8/4/4** (no bystander — was a Codenames leftover, not an intentional DSD mechanic) |
| Word curation | Runtime filter excludes `aussie_slang`, `pop_culture`, `people`, `brands` categories + space-containing entries |
| Deep Trench palette | Kraken=`bg-cyan-700`, Leviathan=`bg-indigo-800`, Urchin=`bg-slate-400`, Mine=`bg-red-600`/`bg-red-900` |
| Captain legend | Colour legend strip between grid and footer; active team name bold |
| Jammer colour | Now shows placing team's colour + `?` badge (was amber — wrong team association) |
| Setup flow | Split into 2 screens: `screen-dsd-setup` (team names) + `screen-dsd-players` (player names + captain) — matches SS pattern |
| Pass-gate | `screen-dsd-pass-gate` + `dsdShowPassGate()` added; fires before every Captain screen and before Crew screen |
| Execution | Live 5×5 on-grid reveal with 400ms pre-reveal + 300ms post-resolve per tile; outcome log builds inline |
| Gameover | Final grid snapshot, per-deployment history carousel (`dsdTurnLog[]`, `dsdRenderTurnLog()`), "New Operation?" modal |
| New overlay | `dsd-new-op-overlay` (Decision modal z-[90]) — play-again confirmation |

---

### Part 2 — Two Universal Rules Codified

Both rules emerged from DSD's implementation and are now permanent project standards, documented in `logic-engine.md` § and `phase-audit.md` §2:

**1. Pass-the-Phone Safety Gate**
Any screen showing private role information (Captain grid, role reveal, team-specific content) must be preceded by a named gate screen confirming the right player is holding the phone. The gate names who the phone is being passed to and requires an explicit "I'm ready" tap. No back button on the gate.

**2. Play-Again Confirmation**
No "Play Again" / "New [Game]" button on a gameover screen may reset state directly. Must go through a Decision Modal (z-[90]) first. Applied retroactively to all games:
- DSD: `dsd-new-op-overlay` ("New Operation?")
- NAT: `nat-new-expedition-overlay` ("New Expedition?") — retrofitted
- LI5: `li5-play-again-overlay` ("New Playgroup?") — retrofitted

---

### Part 3 — Protocol A Audit Pass (7 games)

First full rolling Protocol A audit across all non-DSD games. **50 flags found, 50 fixed.**

| Game | Flags | Key issues |
|------|-------|-----------|
| Like I'm Five | 2 | Play-again modal (new rule); active play ✕ was `text-red-500` → `text-stone-500` |
| Great Minds | 11 | 5 toggle `shrink-0` missing; scroll selector; 2 title blocks; quit overlay pattern; z-index on 2 overlays; speaker/✕ on 3 screens (pair-reveal, victory state, concede) |
| Secret Signals | 5 | 3 `setTimeout` missing WHY comments; ✕ missing on setup screen 2 + intel summary |
| Just Enough Cooks | 9 | Settings table docs (2 missing rows); 2 toggle `shrink-0`; scroll selector; 2 title blocks; 2 modal patterns; washup ✕ |
| You Get It? | 9 | Default Verdict Style mismatch; section comment stale; 2 title blocks; 2 modal patterns; gameover ✕; SD intro + input missing controls |
| Late to the Party | 9 | Guess-map overlay undocumented; 2 title blocks; 2 modal patterns; role-reveal/smalltalk/guess/group-guess all missing speaker+✕ |
| Natural Selection | 5 | 2 scroll selectors (`.overflow-y-auto`); 2 modal patterns; gameover header ✕ missing |

Full per-game entries with flag details in `docs/audit-log.md`.

---

### Part 4 — Cross-Game Consolidation

Fixes applied after the audit pass, based on patterns that appeared across multiple games:

**`text-center` on title block wrappers — removed from GM, JEC, YGI**
The `ui-style.md` standard never included `text-center`. LTTP and NAT (the most recently built games) were always left-aligned and correct. The centering was accidentally introduced during earlier audit fixes when we corrected the wrapper structure on GM, JEC, and YGI. Settings card content below the title is left-aligned — the centred title created a visual inconsistency within the overlay.

**Toggle `shrink-0` on LI5 (3 toggles) and SS (4 toggles)**
All other games were fixed during their individual audits. LI5 and SS were the last remaining. SS had one toggle using the legacy `flex-shrink-0` class name (functionally equivalent but inconsistent) — standardised to `shrink-0`.

---

### Part 5 — Docs + Template Improvements

| File | What changed |
|------|-------------|
| `docs/audit-log.md` | Created from scratch; full Protocol A entries for all 7 audited games; status table |
| `.claude/rules/game-identities.md` | GM: concede state flow added, static block terminology corrected. JEC: settings table expanded (2 missing rows + Internal value column). YGI: section rename. LTTP: guess-map overlay added to Overlay Types table |
| `.claude/rules/new-game-template.md` | §12 Implementation Patterns added (7 copy-paste snippets); §8 expanded with exact inner div class strings + play-again modal row; §11 checklist expanded with specific sub-items for every audit failure pattern |
| `.claude/rules/ui-style.md` | Scroll reset guidance corrected: `.overflow-y-auto` removed; `.overlay-data-inner` specified as the only correct selector, with explanation of why |

---

## Complete Game Roster

| # | Game | Plugin | Brand | Screens | Overlays |
|---|------|--------|-------|---------|----------|
| 1 | Like I'm Five | `js/games/li5.js` | `pink-500` | 5 | 8 |
| 2 | Great Minds | `js/games/great-minds.js` | `violet-500` | 8 | 11 |
| 3 | Secret Signals | `js/games/secret-signals.js` | `teal-500` | 17 | 6 |
| 4 | Just Enough Cooks | `js/games/jec.js` | `amber-500` | 7 | 5 |
| 5 | You Get It? | `js/games/ygi.js` | `orange-500` | 11 | 4 |
| 6 | Late to the Party | `js/games/lttp.js` | `red-500` | 10 | 8 |
| 7 | Natural Selection | `js/games/nat.js` | `lime-600` | 9 | 3 |
| 8 | Deep-Sea Deploy | `js/games/dsd.js` | `cyan-700` | 8 | 5 |

**Total screens:** ~75 (excluding shared engine screens)
**Total overlays:** ~50

---

## Architecture (unchanged from Phase 19)

- **SPA:** single `index.html`, all screens registered in `allScreens[]` in `engine.js`
- **Plugin split:** engine owns audio/routing/reset; each plugin owns its own state + listeners
- **Overlay patterns:** exactly 2 — Data slide-up (`overlay-data-backdrop`) + Decision modal (`overlay-modal-backdrop`)
- **Audio:** Web Audio API only — synthesised tones, no audio files
- **PWA:** Service Worker v78, cache-first strategy, all assets precached
- **Secret Mode:** Konami gateway → Terminal → expansion proxy; any game can read `window.activeExpansionOverrides`
- **Word bank:** `data/words.json` (~433 words, 16 categories); `data/secret_words.json` (Dota 2 expansion); `data/ygi-data.json` (55+ prompts)
- **Load order:** `engine.js` → `li5.js` → `great-minds.js` → `secret-signals.js` → `jec.js` → `ygi.js` → `lttp.js` → `nat.js` → `dsd.js` → `secret-mode.js` → `app.js`

---

## Key Design Decisions (Phase 20)

- **`.overlay-data-inner` scroll reset:** `overlay-data-inner` gets `overflow-y: auto` from its CSS class, not from a Tailwind utility. `.overflow-y-auto` is invisible to `querySelector` — it returns `null` silently and the scroll is never reset. This caused the settings-always-scrolled-mid-way bug in 3 games. The correct selector is always `.overlay-data-inner`. Corrected in `ui-style.md` and `new-game-template.md` §12.

- **Toggle `className` overwrite:** `btn.className = 'game-toggle-on-x'` replaces the entire class list. Any `shrink-0` set in the HTML is gone the moment this runs. Both the active and inactive class strings must include `shrink-0`. Codified in `new-game-template.md` §12.1 with explanation.

- **`overlay-modal-inner` exact standard:** The correct inner div class string is `overlay-modal-inner bg-stone-50 w-full max-w-sm rounded-3xl px-6 pt-6 pb-8 flex flex-col gap-4 text-center`. Earlier games used `bg-white rounded-2xl p-8 shadow-xl` directly — wrong background, wrong radius, wrong padding split. Now documented verbatim in `new-game-template.md` §8 and §12.5.

- **Title block alignment:** Left-aligned (no `text-center`). Settings cards below are all left-aligned — centering only the title created a visual break. The standard in `ui-style.md` was always left-aligned; `text-center` was a drift artefact from early audit sessions.

- **Cross-audit notes layer:** Introduced during this phase — a table in the audit plan tracking which issues appear across which games. Enables systematic sweeps rather than per-game fixes. Produced the consolidation pass in Part 4.

---

## Next Horizon (Phase 21+)

- **DSD Protocol A audit** — the only game not yet fully audited; pending
- **New game concept** — TBD; see `.claude/rules/new-game-template.md` for the brief format (now includes §12 implementation patterns)
- **Possible new expansion pack** for Secret Mode
