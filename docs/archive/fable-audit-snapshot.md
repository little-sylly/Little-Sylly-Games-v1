# Fable Studio Audit — Fix Campaign Snapshot
**Date:** June 2026
**Phases absorbed:** Studio Audit (Phases 1–6), plus PASS ship (Phase 32) and LI5/GM/SS retrograde polish (Phase 27) context
**Status:** All 71 audit items resolved; deferred items complete (15–16 June 2026)

---

## What This Snapshot Covers

This document records the completion of the Fable studio audit fix campaign — the most comprehensive code and documentation sweep since the studio was founded. It also absorbs:

- **Phase 27** (no standalone snapshot was written): LI5/GM/SS polish pass — retrograde fixes to the three oldest games. Work bracketed by Phase 26 (studio retrograde, all 8 games) and Phase 28 (JEC/YGI/LTTP/NAT/DSD audit).
- **Phase 32** (PASS ship, no standalone snapshot): Pass (Gan Deng Yan climbing card game) shipped as an MDLM-only multiplayer game. Settings: hand size (5/6/7), chip stack (50/100/150), match length (5/10/endless), bomb rules (standard/heavy), min sequence length (3/4/5), jokers (none/2/4), mid-game draw, sky joker variant. Sylly Mode: The Abyss (face-up central pool; grows on every Pass; detonates on winning Detonation Combo). Tech spec archived at `docs/archive/new-game-tech-pass.md`.

---

## Audit Summary (71 Items)

The Fable audit was structured in 6 phases:
- **Phase 1A/1B:** CLAUDE.md + rule file reality-sync
- **Phase 2:** Code-map audit, multiplayer config audit, engine-multiplayer review
- **Phase 3:** Per-game deep-dive (12 games × 4 protocols)
- **Phase 4:** Data audit (words.json, secret_words.json, ygi-data.json, gth-data.json)
- **Phase 5A/5B/5C:** Implementation notes harvest, cross-game lessons elevation, rule file final pass
- **Phase 6:** Summary + fix plan generation

**Item breakdown at campaign start:**
- 1 critical | 27 bugs | 32 polish | 11 doc
- 4 resolved in-audit (Phases 1–6)
- 67 scheduled for the fix campaign

**All 71 items resolved. 2 doc items permanently skipped (Phase 27 + Phase 32 snapshots — absorbed here).**

---

## Critical Fix

**BLD — `applyExpansionOverrides()` clobbers LI5** (`bld.js` line ~1273)
BLD declared a bare `applyExpansionOverrides()` identical to LI5's global. BLD's later-loaded declaration silently overwrote LI5's on `window`. In Secret Mode, LI5's `startGame()` then called BLD's no-op instead of its own function.
Fix: renamed to `bldApplyExpansionOverrides()`.

---

## Key Bug Fixes

**Engine / Suite-wide:**
- 17 overlays not hidden by any reset path — added to `resetToLobby()` and per-game reset functions
- `mpLockSync()` — sync lock now gates ACTION sends in `mpSendEnvelope()` directly, fixing double-submission for all 12 games regardless of `btn-mp-action` class presence

**BLD:**
- Missing `getMinPlayers: () => 5` in `MP_GAME_CONFIGS` (lobby allowed 2-player start; `BLD_ROLE_TABLE` starts at 5)
- Two dead SYNC handlers (`BLD_VOTE_PENDING`, `BLD_MISSION_PENDING`) removed
- How-to Step 2 vote labels fixed ("I'm In / Not Them" → "Sounds Good / No Way")
- Dead `filled` variable and no-op ternary removed from patience meter

**PASS:**
- Missing display fields in `MP_GAME_CONFIGS.pass` (mode screen rendered "undefined")
- Abyss detonation gated on combo class: only Detonation Combos (Triplet/Quad/Double Joker/Sequence/Double Sequence) detonate — Standard Combos (Single/Pair) never detonate
- Client `passRoundsWon` reset each round via `PASS_GAME_START` reuse — fixed via `PASS_ROUND_END` `roundsWon` payload
- Two dead SYNC handlers (`PASS_NEXT_ROUND`, `PASS_GAMEOVER`) removed
- Round-wrap and seating screens missing ✕ exit button

**LI5:**
- Toy Box deck panel `z-[60]` (rendered behind settings overlay at `z-[80]`) → `z-[100]`
- Quit from gatekeeper screen started phantom turn timer (guard added)
- Pinky Swear flip score delta desync at 0 points (clamp applied)
- Settings overlay: legacy centred title → standard title block
- Play-again modal inner: non-canonical class string fixed

**GM:**
- Lobby Mode near-sync round silently discarded (now calls `gmHandleMismatch()`)
- Quit overlay border was teal (SS brand) → `border-purple-300`
- Mismatch phrase diverged between host/client — now sent in payload and re-used
- Frequency Tuner toggle missing `shrink-0`

**SS:**
- Client double-applied resolution (`ssResolve()` split into resolve/render halves)
- Lobby Mode device-routing rewired for 3+ devices; capped to 2 devices per `getMaxPlayers`
- Intel Phase (Sylly Mode) disabled in Lobby Mode (host-authoritative full MP implementation added — `SS_INTEL_SYNC` packet)
- Vault ready device routing and per-team broadcaster assignment rebuilt
- Settings overlay: legacy bare divs → Settings Card Standard
- Gameover screen "Game Over" eyebrow → "Mission Debrief"
- Customise toggle missing `shrink-0`
- Header `[?]` → How to Play added to encrypt/intercept screens
- Round numbering lopsided when Team B encrypts first (half-tracking fix)

**JEC:**
- Client-side Sous Chef merge taps unguarded → early-return added for clients
- Sifting/tally CTAs unguarded → host-gated with "Waiting for the Head Chef…" fallback; `JEC_NEXT_ROUND` made a no-op
- How-to Rotten penalty corrected (−10 → −5); Spoilt description clarified
- New Shift overlay z-[80] → z-[90]

**YGI:**
- Round log double-push in MP (malformed host push removed; SYNC handler no longer re-pushes)
- Sudden Death forced to `'close-enough'` (Split Take) in MDLM (pass-the-phone SD unplayable on multiple devices)
- `btn-ygi-results-next` not host-gated → client early-return added
- Duplicate `ygiShowHelpTip()` definition removed
- Legacy `sylly-toggle-off` aliases swapped to `game-toggle-off`

**LTTP:**
- MDLM plan narrowing/advancement never synced after lap 1 → host-authoritative `LTTP_PLAN_UPDATE` SYNC added
- MDLM guess phase + gameover had zero packets → host-driven with ACTION submissions + `LTTP_GAMEOVER` SYNC
- Orphaned `screen-lttp-smalltalk` section removed
- Dead `lttpShowRoleReveal()` / `screen-lttp-role-reveal` / implicit-global `lttpRoleRevealIdx` removed
- `lttp-confirm-overlay` inner non-canonical class string fixed

**NAT:**
- Selection voting + Last Stand not MP-distributed → full per-device vote collection via `NAT_VOTE` ACTION; host aggregates and drives `NAT_LAST_STAND`, `NAT_BIO_PHASE`, `NAT_BIO_VERDICT`
- Settings table corrected: pill labels are Common/Rare/Exotic (not Shallow/Mixed/All), vote card title is "The Classification", escape card is "Mole Escape Bonus"

**DSD:**
- Nuclear Mine bypassed `DSD_GAMEOVER` broadcast → host now broadcasts alongside local `setTimeout`

**GTH:**
- Case-screen `[?]` button (`btn-gth-how-to-case`) had no listener → wired to `gth-how-to-overlay`
- `gth-case-report-progress` empty div populated with per-player progress dots
- Play CTA emoji removed ("Start the Session 🛋️" → "Start the Session")
- How-to renamed from "The Disclaimer" to "How to Play 🛋️" (standard title)

**DYB:**
- Gameover standings double-reverse bug fixed (first-eliminated was showing as runner-up)
- Phantom die now reveals its real face at the showdown
- Eliminated players were pulled to Shake screen each round — `DYB_NEXT_SHAKE` handler now routes them to Spirit Board
- Dead ternary in slick-face initialisation replaced with `Array(roll.length).fill(-1)`
- Gameover H2 "GAME OVER" → "The Clean Out" (thematic)
- Brand colour corrected in docs: `stone-700` → `stone-400` (the muted brand DYB uses everywhere)
- Sylly Mode documented as "Devil's Luck" with all five die types (not "Chaos Mode" / Slick-only)

**Data:**
- `words.json`: duplicate `id` "objects-053" (Stapler vs Walkie-Talkie) — Stapler re-keyed to `objects-039`
- `secret_words.json`: 11-word `nono_list` on `world-001` trimmed to 10
- `secret_words.json`: 10 entries missing `category: "World"` key — added

**CSS:**
- Dead `.pill.pill-active` rule removed
- Dead `.sylly-toggle-on` rule removed

---

## Deferred Items (all resolved as of 16 June 2026)

| Item | Resolution |
|------|-----------|
| SW bump v102 → v103 | Done (SW is v103) |
| Temp scripts at root | Deleted (`fix-secret-words-category.js`, `fix-gm-brand-violet.js`, `fix-section-headers.js`) |
| GTH/DYB/BLD mid-game quit → `resetToLobby()` | Done — all three quit confirm handlers now call `resetToLobby()` instead of navigating to game menu (PASS contract, 16 June 2026) |
| `btn-mp-action` on Phase-22 games | Done — 16 buttons patched across LI5/GM/SS/JEC/YGI/LTTP/NAT/DSD (visual grey-out only; correctness already in `mpSendEnvelope()`) |
| Section header diff verification | Done — zero unclaimed IDs (verified by script, 16 June 2026) |
| Campaign snapshot | This document |

---

## Phase 27 Context (absorbed)

Phase 27 covered a retrograde polish pass on the three oldest Phase-22 games (LI5, GM, SS):
- LI5: settings overlay title block, Report Card delta clamp, Toy Box z-index
- GM: quit overlay border colour, mismatch phrase sync, toggle shrink-0
- SS: settings card standard, gameover eyebrow, shrink-0, round numbering

These were logged and fixed during the Fable campaign fix run. No Phase 27 standalone snapshot exists; the work is covered by the Phase 26 → Phase 28 git history.

---

## Phase 32 Context (absorbed — PASS ship)

**Pass** shipped as the 12th game. Key design decisions:
- Climbing card game (Gan Deng Yan variant) — shed cards by playing combos one rank higher
- MDLM-only, 3–6 players, no team roles, automatic seat order (join order = seat order)
- Sylly Mode: **The Abyss** — face-up pool grows on every Pass; detonates (distributes) when a **Detonation Combo** (Triplet/Quad/Double Joker/Sequence/Double Sequence) wins a trick, empties a hand, or causes a Fracture (13 cards). Standard Combos (Single/Pair) never detonate.
- Mid-game quit dissolves the room for everyone (PASS contract — tightest teardown in the suite)
- Key packets: `PASS_GAME_START` (rebroadcast each round), `PASS_TURN_RESULT` (with optional `abyssDraft`), `PASS_ABYSS_DRAFT`, `PASS_ROUND_END` (carries `matchOver`/`roundsWon` — drives gameover transition directly)

---

## Studio State at Snapshot

- **12 games shipped:** LI5, Great Minds, Secret Signals, JEC, YGI, LTTP, Natural Selection, Deep-Sea Deploy, Group Therapy, Dicey Bluffs, Bailed, Pass
- **Multiplayer:** All 12 games multiplayer-capable; BLD + GTH + DYB + PASS are MDLM-only
- **SW version:** v103
- **Gold master:** All 12 games pass Protocol A (Phase Gate) as of the Fable audit fix campaign
- **Next gate:** Protocol C Studio Sweep (or directly Protocol B if a new game brief is ready)
