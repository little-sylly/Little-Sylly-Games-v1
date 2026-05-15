# Protocol A Audit Log — Little Sylly Games

Living document. Update after every completed Protocol A run.

---

## Audit Status

| Game | Abbr | Status | Date | Flags Found | Flags Fixed |
|------|------|--------|------|-------------|-------------|
| Like I'm Five | LI5 | ✅ Clean | 2026-05-15 | 2 | 2 |
| Great Minds | GM | ✅ Clean | 2026-05-15 | 11 | 11 |
| Secret Signals | SS | ✅ Clean | 2026-05-15 | 5 | 5 |
| Just Enough Cooks | JEC | ✅ Clean | 2026-05-15 | 9 | 9 |
| You Get It? | YGI | ✅ Clean | 2026-05-15 | 9 | 9 |
| Late to the Party | LTTP | ✅ Clean | 2026-05-15 | 9 | 9 |
| Natural Selection | NAT | ✅ Clean | 2026-05-15 | 5 | 5 |
| Deep-Sea Deploy | DSD | 🔧 Phase 20 rework | 2026-05-15 | Multiple | All fixed |

---

## Phase 20 — DSD UX + Universal Rules (2026-05-15)

Post-playtest fixes applied across DSD and NAT, plus two new universal rules codified for all games.

### Universal Rules Established

**Rule 1 — Pass-the-Phone Safety Gate**
Any screen showing private role information (Captain grid, role reveal, team-specific content) must be preceded by a named gate screen confirming the right player is holding the phone. Gate screen names who to pass to and requires an explicit "I'm ready" tap. No back button permitted on the gate (cannot be skipped mid-game).
- Implemented in DSD: `screen-dsd-pass-gate` + `dsdShowPassGate()` — fires before every Captain screen and before Crew sequence screen
- Rule documented in: `logic-engine.md` § Pass-the-Phone Safety Gate, `phase-audit.md` § Protocol A §2

**Rule 2 — Play-Again Confirmation**
"Play again" actions that reset round state must go through a Decision Modal (z-[90]) before executing. Direct-restart buttons with no confirmation are not permitted.
- Implemented in DSD: `dsd-new-op-overlay` ("New Operation?") — wired to `btn-dsd-new-operation` on gameover
- Implemented in NAT: `nat-new-expedition-overlay` ("New Expedition?") — wired to `btn-nat-go-new` on gameover
- Rule documented in: `logic-engine.md` § Play-Again Confirmation, `phase-audit.md` § Protocol A §2

### DSD Fixes Applied

| Area | Change |
|------|--------|
| Audio | Added `playLaunch()` on `dsdShowMenu()` entry; `playPillClick()` on settings/how-to open |
| Grid composition | Changed from 9/8/6/1/1 (with bystander) to **9/8/4/4** (no bystander) — bystander was a Codenames leftover, not an intentional DSD mechanic |
| Word curation | Added runtime filter: excludes `aussie_slang`, `pop_culture`, `people`, `brands` categories + multi-word entries with spaces |
| Colour palette | Deep Trench: Kraken=`bg-cyan-700`, Leviathan=`bg-indigo-800`, Urchin=`bg-slate-400`, Mine=`bg-red-600`/`bg-red-900` |
| Captain legend | Added colour legend strip between grid and Transmit footer; active team bold |
| Jammer colour | Jammer now shows placing team's colour + `?` overlay (was amber) |
| Setup flow | Split into 2 screens: team names (`screen-dsd-setup`) → player names + captain (`screen-dsd-players`) — matches SS pattern |
| Pass gates | `screen-dsd-pass-gate` + `dsdShowPassGate()` added; wired before Captain screen and before Crew screen |
| Execution | On-grid execution: `#dsd-execution-grid` shows live 5×5 with reveal animation; outcome log builds per resolved tile |
| Gameover | Added final grid (`#dsd-gameover-grid`), per-deployment history carousel (`dsdTurnLog[]`, `dsdRenderTurnLog()`), "New Operation?" modal |

### NAT Fix Applied

| Area | Change |
|------|--------|
| Play-again | `nat-new-expedition-overlay` Decision Modal added; `btn-nat-go-new` now shows modal instead of directly restarting |

---

## Completed Audits

### Late to the Party (LTTP) — 2026-05-15 (first full audit)

**Files read:** `js/games/lttp.js`, `index.html` (LTTP section), `js/engine.js` (`allScreens[]`), `sw.js`, `game-identities.md`

**Flags:**

1. **`game-identities.md` — `lttp-guess-map-overlay` missing from Overlay Types table** — The map overlay (z-[95]) exists in code and HTML but was absent from the LTTP Overlay Types table. It uses a custom full-width panel pattern, not the standard data slide-up.
   - Fix: Added row — `lttp-guess-map-overlay | Custom (full-width map panel) z-[95] | Guess phase — Stray pins the address`.

2. **`index.html` — `lttp-settings-overlay` title block missing `px-5 pt-5`** — Title block used `pb-4 border-b border-stone-200 flex-shrink-0` without `px-5 pt-5`, so the title text was not indented or padded from the overlay edge.
   - Fix: Added `px-5 pt-5` to the wrapper class.

3. **`index.html` — `lttp-how-to-overlay` title block missing `px-5 pt-5`** — Same issue as Flag 2.
   - Fix: Same correction.

4. **`index.html` — `lttp-quit-overlay` not using `overlay-modal-inner` pattern** — Inner div used `bg-white rounded-2xl p-8 ... shadow-xl` directly. Also used `<h3>` (should be `<h2>`).
   - Fix: Replaced inner div with `overlay-modal-inner bg-stone-50 w-full max-w-sm rounded-3xl px-6 pt-6 pb-8 flex flex-col gap-4 text-center`. Changed `<h3>` → `<h2>`.

5. **`index.html` — `lttp-confirm-overlay` not using `overlay-modal-inner` pattern** — Pro mode "Send a message to [Name]?" modal used `bg-white rounded-2xl p-8 ... shadow-xl` directly.
   - Fix: Same `overlay-modal-inner` standard fix.

6. **`index.html` — `screen-lttp-role-reveal` missing both speaker and ✕** — Role-reveal is a pass-the-phone mid-game screen. No header row existed — neither speaker nor ✕ were reachable during this screen.
   - Fix: Added `flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0` header row before the `flex-1 overflow-y-auto` body div, with `.btn-open-sound` on the right and `.btn-lttp-quit-open ✕` on the left. No JS needed — `.btn-lttp-quit-open` is handled by existing event delegation.

7. **`index.html` — `screen-lttp-smalltalk` missing both speaker and ✕** — Pro mode ask phase screen had no controls. Section already had `relative` class.
   - Fix: Added `absolute top-4 right-4 flex items-center gap-2` div with `.btn-open-sound` + `.btn-lttp-quit-open ✕` as first child of the section.

8. **`index.html` — `screen-lttp-guess` missing ✕ in both sub-states**
   - Pass gate state: no controls. Added `relative` to `#lttp-guess-pass-gate`; added `absolute top-4 right-4` header cluster with `.btn-open-sound` + `.btn-lttp-quit-open ✕`.
   - Action state header: had map button + speaker but no ✕. Added `.btn-lttp-quit-open ✕` to the existing `flex items-center gap-2` right cluster.

9. **`index.html` — `screen-lttp-group-guess` missing ✕** — Group vote header had plan label on left and bare speaker on right — no ✕. Wrapped right side in `flex items-center gap-2` containing speaker + `.btn-lttp-quit-open ✕`.

**Passed clean:** All screen IDs and `allScreens[]` registration, all settings variables match table (`lttpPlayerCount`, `lttpDifficulty`, `lttpJokerMode`, `lttpGroupVote`, `lttpSmallTalk`), SW precache (`js/games/lttp.js` v78), `lttp-settings-overlay` already uses `.overlay-data-inner` scroll reset ✅, all toggles have `shrink-0` ✅, no `setTimeout` calls, no TODO/FIXME, no engine duplication, not a team game, no play-again (LTTP is always a one-shot game), z-index stack (settings/quit z-[80], how-to/history z-[90], map overlay z-[95]), quit overlay thematic ("Cancel the plans?" / "Yeah, staying in." / "Not yet!"), Australian English, touch targets, `screen-lttp-gameover` already has ✕ (`btn-lttp-gameover-exit`) ✅.

---

### Natural Selection (NAT) — 2026-05-15 (first full audit)

**Files read:** `js/games/nat.js`, `index.html` (NAT section), `js/engine.js` (`allScreens[]`), `sw.js`, `game-identities.md`

**Flags:**

1. **`nat.js` line 67 — Settings scroll reset uses `.overflow-y-auto`** — `natOpenSettings()` queried `.overflow-y-auto` but `overlay-data-inner` gets `overflow-y: auto` from the CSS class, not as a Tailwind utility. Query returned `null` silently — settings scroll was never reset on open.
   - Fix: Changed `.overflow-y-auto` → `.overlay-data-inner`.

2. **`nat.js` line 98 — How-to scroll reset uses `.overflow-y-auto`** — Same bug as Flag 1 in `natOpenHowTo()`.
   - Fix: Same selector fix.

3. **`index.html` — `nat-quit-overlay` inner div partially incorrect** — Had `overlay-modal-inner` ✅ but used `bg-white p-8 ... gap-3 shadow-xl` instead of the standard `bg-stone-50 ... rounded-3xl px-6 pt-6 pb-8 gap-4`.
   - Fix: Replaced inner div with `overlay-modal-inner bg-stone-50 w-full max-w-sm rounded-3xl px-6 pt-6 pb-8 flex flex-col gap-4 text-center`.

4. **`index.html` — `nat-new-expedition-overlay` inner div using `bg-white p-6`** — Had `overlay-modal-inner` + `rounded-3xl` ✅ but `bg-white` (should be `bg-stone-50`) and `p-6` (should be `px-6 pt-6 pb-8`).
   - Fix: Replaced inner div with `overlay-modal-inner bg-stone-50 w-full max-w-sm rounded-3xl px-6 pt-6 pb-8 flex flex-col gap-4 text-center`.

5. **`index.html` + `nat.js` — `screen-nat-gameover` missing header ✕** — "Final Report" header had label + speaker only — no ✕. Post-game exit should route directly to `resetToLobby()`. The `btn-nat-go-exit` footer button ("← Back to the Box") already did this, but the header ✕ was absent entirely.
   - HTML fix: Added `#btn-nat-gameover-exit` ✕ button on the left of the header row (alongside "Final Report" label and speaker).
   - JS fix: Added listener in `nat.js` → `playExit(); resetToLobby()`.

**Passed clean:** All screen IDs and `allScreens[]` registration (9 NAT screens), all settings variables match table, SW precache (`js/games/nat.js` v78), `screen-nat-gameover` already had "← Back to the Box" exit ✅, all toggles have `shrink-0` (Sylly Mode only toggle) ✅, no `setTimeout` calls, no TODO/FIXME, no engine duplication, not a team game, play-again uses `nat-new-expedition-overlay` modal ✅, settings title block `px-5 pt-5 pb-4` ✅, how-to title block same ✅, quit overlay thematic ("Abandon the expedition?" / "Yeah, pack up." / "Keep watching."), Australian English, z-index stack, touch targets, Speaker + ✕ present on all other mid-game screens.

---

### Just Enough Cooks (JEC) — 2026-05-15 (first full audit)

**Files read:** `js/games/jec.js`, `index.html` (JEC section, lines ~2079–2514), `js/engine.js` (`allScreens[]`), `sw.js`, `game-identities.md`

**Flags:**

1. **`game-identities.md` — Menu Complexity and Specials Board missing from Settings table** — `jecFoodDifficulty` (Menu Complexity: Home Cook / Sous Chef / Head Chef) and `jecSpecialsBoard` are fully implemented in code and the settings overlay but were absent from the JEC Settings table in docs. The table also lacked an "Internal value" column present in other games' tables.
   - Fix: Added both rows with options, defaults, and internal values. Expanded table to 4 columns for consistency.

2. **`jec.js` line 117 — `btn-jec-oversight-toggle` missing `shrink-0`** — Toggle handler overwrote the full class list via `btn.className = ...`, silently dropping `shrink-0`. Sous Chef Oversight label is long enough to cause flex compression when toggled ON.
   - Fix: Added `shrink-0` to both values.

3. **`jec.js` line 132 — `btn-jec-sylly-toggle` missing `shrink-0`** — Same pattern as Flag 2. `btn-jec-specials-toggle` already had `shrink-0` ✅.
   - Fix: Added `shrink-0` to both values.

4. **`jec.js` line 63 — Settings overlay scroll reset uses wrong selector** — Handler queried `.overflow-y-auto` (Tailwind class) but `overlay-data-inner` gets `overflow-y: auto` from CSS. Query returned `null` silently — settings scroll position was never reset on open. How-to overlay correctly used `.overlay-data-inner` ✅.
   - Fix: Changed `.overflow-y-auto` → `.overlay-data-inner`.

5. **`index.html` — `jec-settings-overlay` title block missing standard wrapper, wrong heading tag, subtitle size** — Used bare `<div class="text-center">` without `px-5 pt-5 pb-4 border-b border-stone-200 flex-shrink-0`, used `<h3>` (should be `<h2>`), and `text-sm` subtitle (should be `text-xs`). No visual separator between title and settings cards.
   - Fix: Applied standard title block wrapper, corrected heading tag and subtitle size.

6. **`index.html` — `jec-how-to-overlay` title block same three issues** — Same wrapper/heading/subtitle problems.
   - Fix: Same corrections as Flag 5.

7. **`index.html` — `jec-quit-overlay` not using `overlay-modal-inner` pattern** — Inner div used `bg-white rounded-2xl p-8` directly, giving a bright white background and smaller border radius instead of the standard warm `stone-50` and `rounded-3xl`.
   - Fix: Replaced inner div classes with `overlay-modal-inner bg-stone-50 w-full max-w-sm rounded-3xl px-6 pt-6 pb-8 flex flex-col gap-4 text-center`.

8. **`index.html` — `jec-new-shift-overlay` not using `overlay-modal-inner` pattern** — Same issue as Flag 7.
   - Fix: Same fix as Flag 7.

9. **`index.html` + `jec.js` — `screen-jec-washup` missing ✕ exit button** — Post-game screen header had a spacer div on the left, label in centre, speaker on right — no ✕. Protocol requires a post-game ✕ routing directly to `resetToLobby()`.
   - Fix: Replaced left spacer with `#btn-jec-washup-exit` ✕ button. Wired in `jec.js` → `playExit(); resetToLobby()`.

**Passed clean:** All screen IDs and `allScreens[]` registration (7 screens), SW precache (`js/games/jec.js` v78), no `setTimeout` calls, no hardcoded scoring shadows, no TODO/FIXME, no engine duplication, not a team game (`showWhoFirst()` N/A), play-again uses `jec-new-shift-overlay` confirmation, pass-gate on all per-player prep phases, z-index stack (settings z-[80], how-to z-[90], oversight z-[90], new-shift z-[80]), quit overlay thematic ("Kitchen Closed?" / "Yeah, close the kitchen." / "Back to the stove!"), no generic strings, Australian English, touch targets.

---

### You Get It? (YGI) — 2026-05-15 (first full audit)

**Files read:** `js/games/ygi.js`, `index.html` (YGI section, lines ~2516–2996), `js/engine.js` (`allScreens[]`), `sw.js`, `game-identities.md`

**Flags:**

1. **`ygi.js` line 12 — `ygiVerdictStyle` default mismatches docs** — Code defaulted to `'open-ballpark'` (The Consensus) but `game-identities.md` specifies `'secret-ballot'` (Your Call) as the default. The Verdict Style pill in the HTML was also pre-highlighting The Consensus.
   - Fix: Changed code default to `'secret-ballot'`. Swapped active pill class in HTML to highlight "Your Call" instead.

2. **`index.html` lines 2516–2522 — Section comment still says "CLOSE ENOUGH (CE)"** — The game was renamed to "You Get It? (YGI)" but the HTML section header block retained the old name. Also, `screen-ygi-sd-intro` and `screen-ygi-sd-input` were missing from the screen list in the comment.
   - Fix: Updated to `YOU GET IT? (YGI)` and added both SD screens to the screen list.

3. **`index.html` — `ygi-settings-overlay` title block missing standard wrapper, wrong heading tag, subtitle size** — Same three issues as JEC Flag 5: bare `<div class="text-center">` wrapper, `<h3>` tag, `text-sm` subtitle.
   - Fix: Same standard title block correction.

4. **`index.html` — `ygi-how-to-overlay` title block same three issues** — Same corrections.

5. **`index.html` — `ygi-quit-overlay` not using `overlay-modal-inner` pattern** — Same issue as JEC Flag 7: `bg-white rounded-2xl p-8` instead of standard `overlay-modal-inner bg-stone-50 rounded-3xl` pattern.
   - Fix: Same fix as JEC Flag 7.

6. **`index.html` — `ygi-run-it-back-overlay` not using `overlay-modal-inner` pattern** — Same issue.
   - Fix: Same fix.

7. **`index.html` + `ygi.js` — `screen-ygi-gameover` missing ✕ exit button** — Header had only a speaker button (`justify-end`) — no ✕. Post-game exit should route to `resetToLobby()`.
   - Fix: Changed header to `justify-between`, added `#btn-ygi-gameover-exit` on the left. Wired in `ygi.js` → `playExit(); resetToLobby()`.

8. **`index.html` — `screen-ygi-sd-intro` missing both speaker and ✕** — Sudden Death intro screen (Only One mode) was a bare centred block with no header at all.
   - Fix: Added `relative` to section class; added `absolute top-4 right-4` header row with `.btn-open-sound` + `✕` button using class `.btn-ygi-quit-open` (automatically wired by existing event delegation).

9. **`index.html` — `screen-ygi-sd-input` missing ✕ exit button** — Sudden Death input screen had speaker but no ✕. Left spacer was a bare `<span class="w-8">`.
   - Fix: Replaced spacer with `✕` button using class `.btn-ygi-quit-open` (same event delegation pattern as Flag 8).

**Passed clean:** All screen IDs and `allScreens[]` registration (11 screens incl. SD screens), SW precache (`js/games/ygi.js` v78), scroll reset uses `.overlay-data-inner` ✅, both toggles have `shrink-0` ✅, no `setTimeout` calls, no hardcoded shadows, no TODO/FIXME, no engine duplication, not a team game, play-again uses `ygi-run-it-back-overlay` confirmation, z-index stack (settings z-[80], how-to z-[90], quit z-[80], run-it-back z-[80]), quit overlay thematic ("Not Feeling It?" / "Yeah, I'm out." / "Keep guessing!"), no generic strings, Australian English, touch targets.

---

### Great Minds (GM) — 2026-05-15 (first full audit)

**Files read:** `js/games/great-minds.js`, `index.html` (GM section, lines ~619–1139, 1899–1947), `js/engine.js` (`allScreens[]`, `resetToLobby()`), `sw.js`, `game-identities.md`

**Flags:**

1. **`game-identities.md` — `screen-gm-concede` missing from State Flow** — Code and `allScreens[]` correctly implement the concede path (Secret Mode Sever Link, accessible from round 11). The State Flow entry in docs ended at `GM RESULT` with no mention of the concede branch.
   - Fix: Added `→ GM CONCEDE (Secret Mode only: Sever Link path from round 11)` to the State Flow in `game-identities.md`.

2. **`great-minds.js` — Toggle `className` overwrite loses `shrink-0` on five toggles** — Memory Guard, Infinite Resync, Customise Words, Signal Boost, and Sylly Mode toggle handlers used `btn.className = ... ? 'game-toggle-on-purple' : 'sylly-toggle-off'` which replaces the full class list, silently dropping the Tailwind `shrink-0` that was in the HTML. The CSS toggle classes do not include `flex-shrink: 0`. Buttons could compress under flex pressure when toggled ON.
   - Fix: Added `shrink-0` to both values in all five handlers: `... ? 'game-toggle-on-purple shrink-0' : 'sylly-toggle-off shrink-0'`.

3. **`index.html` — Settings overlay title block missing standard wrapper** — `gm-settings-overlay` used a bare `<div class="text-center">` without the `px-5 pt-5 pb-4 border-b border-stone-200 flex-shrink-0` wrapper. Also used `<h3>` (should be `<h2>`) and `text-sm` (should be `text-xs`) on the subtitle.
   - Fix: Replaced wrapper, corrected heading tag and subtitle size.

4. **`index.html` — How-to overlay title block missing standard wrapper** — Same `border-b border-stone-200 flex-shrink-0` wrapper absent on `gm-how-to-overlay`.
   - Fix: Same wrapper fix as Flag 3.

5. **`great-minds.js` line 674 — Settings overlay scroll reset uses wrong selector** — Handler queried `.overflow-y-auto` but `overlay-data-inner` gets `overflow-y: auto` from CSS, not the Tailwind class. Query returned `null` silently — scroll was never reset on open. How-to overlay correctly used `.overlay-data-inner` ✅.
   - Fix: Changed `el.querySelector('.overflow-y-auto')` → `el.querySelector('.overlay-data-inner')`.

6. **`game-identities.md` — Static block message terminology stale** — Terminology table listed "Signal Interrupted!" as the static block message. Code shows the more informative "⚡ Static Interference! Letter [X] is banned this round." (shows the banned letter). Docs were stale from an earlier spec.
   - Fix: Updated the Terminology table value to match the code.

7. **`index.html` — `gm-quit-overlay` not using `overlay-modal-inner` class** — Used `bg-white rounded-2xl p-8 shadow-xl` directly instead of the standard `overlay-modal-inner bg-stone-50 rounded-3xl`. All other GM decision modals use `overlay-modal-inner`. Minor pattern deviation causing bright white background instead of `stone-50` and `rounded-2xl` instead of `rounded-3xl`.
   - Fix: Replaced inner div classes with `overlay-modal-inner bg-stone-50 w-full max-w-sm rounded-3xl px-6 pt-6 pb-8 flex flex-col gap-4 text-center`.

8. **`index.html` — `gm-near-sync-overlay` wrong z-index** — Had `z-[90]`; both `game-identities.md` and `ui-style.md` specify `z-[95]` for this overlay.
   - Fix: `z-[90]` → `z-[95]`.

9. **`index.html` — `gm-override-overlay` wrong z-index** — Same issue as Flag 8.
   - Fix: `z-[90]` → `z-[95]`.

10. **`index.html` — Speaker/✕ missing on pair-reveal phase of `screen-gm-setup`** — The setup screen has two phases (`gm-setup-names` and `gm-setup-pair`). The speaker and ✕ buttons only existed inside `gm-setup-names`, which is hidden during the pair-reveal phase. No controls were visible once names were submitted.
    - Fix: Added a `flex justify-end gap-2 w-full` header row at the top of `#gm-setup-pair` with `.btn-open-sound` and `#btn-gm-setup-pair-exit`. Wired `btn-gm-setup-pair-exit` to `gmShowQuitOverlay` in `great-minds.js`.

11. **`index.html` — Speaker/✕ missing on victory state and concede screen (two locations)** —
    - `gm-result-match` (victory): speaker + ✕ lived inside `gm-result-nomatch`, which is hidden on a win. Victory state had no controls at all.
      - Fix: Added header row with `.btn-open-sound` + `#btn-gm-victory-exit` to `gm-result-match`. Wired to `playExit(); resetToLobby()` (post-game exit).
    - `screen-gm-concede`: entirely missing speaker and ✕. Also, "← Back to the Box" label was misleading (button navigates to GM menu, not lobby).
      - Fix: Added `relative` to section, added `absolute top-4 right-4` header with `.btn-open-sound` + `#btn-gm-concede-exit` (wired to `playExit(); resetToLobby()`). Renamed "← Back to the Box" → "← Back to Menu".

**Passed clean:** `allScreens[]` current (8 GM screens incl. concede), all settings vars match table, no scoring values to check (round-count game), SW precache (`js/games/great-minds.js` at v78), no `setTimeout` calls, no hardcoded shadows, no TODO/FIXME, no engine duplication, not a team game (`showWhoFirst()` N/A), pass-gates correct (P1→P2 and P2→reveal), play-again uses Session Terminal modal, no focus-on-show calls, touch targets ✅, quit overlay copy thematic ("Cut the signal?" / "Yeah, disconnect." / "Stay on frequency."), Australian English, all other z-indexes correct (settings z-[80], how-to z-[90], boost z-[95], neural library z-[100], sound z-[110]).

---

### Like I'm Five (LI5) — 2026-05-15 (Phase 20 fresh audit)

**Files read:** `js/games/li5.js`, `index.html` (LI5 section), `js/engine.js` (`allScreens[]`), `sw.js`

**Flags:**

1. **`index.html` — Play-again button calls `resetToMenu()` directly** — No confirmation modal. Phase 20 established the rule that "play again" actions must go through a Decision Modal before resetting state. LI5 predated this rule.
   - Fix: Added `#li5-play-again-overlay` Decision Modal (z-[90]) — "New Playgroup?" with "Let's do it! 🎉" / "Not yet!". Confirm resets state and navigates to `screen-setup`. Teardown added to `resetToLobby()` in `engine.js`.

2. **`index.html` line 213 — Active play ✕ button uses `text-red-500`** — Inconsistent with the Game Brand Colour rule: exit buttons are always neutral (`text-stone-500`). The red ✕ was a leftover from LI5's original design. Red creates false urgency and competes with error/penalty feedback.
   - Fix: Changed `text-red-500` → `text-stone-500` on `#btn-stop`.

**Passed clean:** All screen IDs and `allScreens[]` registration, settings variables, scoring logic, SW precache (v78), setTimeout comments (all 7 have inline WHY rationale), no hardcoded shadows, no global-scope listener issues, no TODO/FIXME, no engine duplication, `showWhoFirst()` wired with pink accent, toggles correct (`game-toggle-on-pink` / `sylly-toggle-on`), team setup standard, quit overlay thematic ("Done explaining already?" / "Your stars will disappear!"), settings title block ("Learning Plan 📝"), no generic strings, Australian English, z-index stack, touch targets.

**Context:** This audit runs post Phase 20 universal rule updates (game colour scope, Settings button tint, play-again modal requirement). LI5's prior audit (2026-05-14) caught z-index, setTimeout, and settings title block issues — all already fixed. This audit closes two new failures against the freshly codified rules.

---

### Secret Signals (SS) — 2026-05-15 (first full audit)

**Files read:** `js/games/secret-signals.js`, `index.html` (SS section), `js/engine.js` (`allScreens[]`), `sw.js`

**Flags:**

1. **`secret-signals.js` line 570 — `setTimeout` missing inline comment** — `input.focus()` called after 100ms delay with no explanation. Rule requires inline WHY comment on every `setTimeout`.
   - Fix: Added comment — "brief delay ensures DOM render is complete before focus, preventing keyboard-snap on iOS"

2. **`secret-signals.js` line ~1242 — `setTimeout` missing inline comment** — 2s delay before showing the action button on the endgame splash screen.
   - Fix: Added comment — "give player 2s to absorb the win/loss state before the continue button appears"

3. **`secret-signals.js` line 1941 — `setTimeout` missing inline comment** — 600ms before removing the shake CSS class.
   - Fix: Added comment — "600ms matches the shake animation duration in CSS before clearing the class for re-trigger"

4. **`index.html` `screen-ss-players` — missing ✕ exit button** — Setup Screen 2 (player names + captain assignment) had no exit button. Protocol requires Speaker + ✕ on every screen. Mid-setup ✕ should open the quit overlay → game menu.
   - Fix: Added `<button class="btn-ss-quit-open">✕</button>` to the header row. The `.btn-ss-quit-open` class was already wired via event delegation — no JS changes needed.

5. **`index.html` `screen-ss-intel-summary` — missing ✕ exit button** — The Intel Phase summary screen (Sylly Mode only) had only a speaker button with no exit. This is a post-game screen — the main winner was already determined before the Intel Phase.
   - Fix: Added `#btn-ss-intel-summary-exit` ✕ button to the header. Handler wired in `secret-signals.js` → `playExit(); resetToLobby()` (post-game direct exit, no quit overlay needed).

**Passed clean:** All screen IDs and `allScreens[]` registration, all 7 settings variables, scoring constants (no hardcoded shadows), SW precache (v78), no TODO/FIXME, no engine duplication, `showWhoFirst()` with correct teal accent (`bg-teal-500 hover:bg-teal-600` / `text-teal-600`), vault pass-gates correct (`ssShowVaultGate()` fires before every team's private vault view), play-again modal present (`#ss-play-again-overlay`), team setup screens match standard (both Screen 1 and Screen 2), toggles correct (`game-toggle-on-teal` for timer/customise, `sylly-toggle-on` for Sylly Mode), quit overlay thematic ("Abort the mission?" / "Yeah, pull out" / "Stay in the field"), settings title block ("Operations Briefing 🔐"), no generic strings, Australian English, z-index stack (settings z-[80], how-to z-[90], intel z-[95], sound z-[110]), touch targets, Speaker + ✕ present on all other screens.

---

### Like I'm Five (LI5) — 2026-05-14

**Files read:** `js/games/li5.js` (full), `index.html` (LI5 section, lines ~219–512), `js/engine.js` (`allScreens[]`), `game-identities.md`

**Flags:**

1. **`index.html` line 219 — `settings-overlay` z-index `z-50` should be `z-[80]`** — Inconsistent with the Z-Index Stack standard (settings overlays share `z-[80]` with quit overlays). Risk: if any other `z-[80]` overlay were active when settings opened, settings would render behind it. LI5 predates the standard — this was never caught.
   - Fix: Changed `z-50` → `z-[80]` on `#settings-overlay`.

2. **`li5.js` lines 91, 392, 817, 823, 829 — `setTimeout` calls missing inline comments** — Debt Harvest protocol requires every `setTimeout` to have a comment explaining *why* the delay is necessary (not just what it does).
   - Fix: Added inline comments to all five: flash animation duration (91), card-exit animation wait (392), and double-tap debounce for the three action buttons (817/823/829).

3. **`index.html` lines 220–224 — Settings title block missing `border-b` wrapper** — The thematic title (`<h3>Learning Plan 📝</h3>`) is a bare `h3`/`p` pair inside `overlay-data-inner` without the standard `px-5 pt-5 pb-4 border-b border-stone-200 flex-shrink-0` wrapper div. LI5 predates this standard. Cosmetic conformance issue only — title is present and readable.
   - Fix: Wrapped title in the standard divider card.

**Passed clean:** All screen IDs and `allScreens[]` registration, settings defaults and variable names, exit routing (mid-game/post-game/setup back), engine duplication check, `applyExpansionOverrides()` hook, Secret Mode word pool substitution, quit overlay copy, Australian English, no TODO/FIXME, no hardcoded score shadows, no engine-level duplication.

**Post-audit flag (2026-05-14):**

4. **`li5.js` — `showWhoFirst()` not implemented; Team 1 always goes first** — LI5 is a two-team game. The engine provides `showWhoFirst(config)` for exactly this purpose (coin-flip or RPS). LI5 predates this utility and currently hard-defaults to Team 1 starting every game, giving them a consistent first-turn advantage. Rule: all team games must use `showWhoFirst()` — no plugin may silently default team order.
   - Fix required: Wire `showWhoFirst()` into the LI5 setup flow before the first round begins. Remove any hardcoded `currentTeam = 0` or equivalent that assumes Team 1 always starts.

---

### Natural Selection (NAT) — 2026-05-11

**Files read:** `js/games/nat.js`, `index.html` (NAT section, lines ~3547–4052), `js/engine.js`, `sw.js`, `game-identities.md`

**Flags:**

1. **`index.html` section comment** — `screen-nat-daily-review` missing from the header comment block listing all NAT screens. Cosmetic only — the screen was correctly implemented and registered.
   - Fix: Added `screen-nat-daily-review` to the comment between `screen-nat-observation` and `screen-nat-selection`.

2. **`nat.js` line ~781 — hardcoded escape points + stale `r.stole` reference** — The gameover round-log template used the literal `+20` for Mole escape points and branched on `r.stole` (a property from the original spec that was never stored in `natRoundLog`). The `r.stole` branch was always falsy — dead code. The `+20` was wrong for players using the 10pt or 15pt Escape Points setting.
   - Fix: Changed to `` `+${natEscapePoints}` `` and removed the dead `r.stole` ternary branch.

3. **`game-identities.md` — "The Eviction" vs "The Selection"** — The Terminology table and one cross-reference note used "The Eviction" (original spec name). All code, button copy, and function names use "The Selection".
   - Fix: Updated both occurrences in `game-identities.md`.

**Passed clean:** All screen IDs, settings defaults, state vars, `allScreens[]`, SW precache, event listener scope, setTimeout usage, engine duplication, quit overlay copy, z-index stack, layout patterns, touch targets.

---

## Process Notes

Tips accumulated from real audit runs. Add to this section after each completed audit.

---

### Drift Check

- **Fastest screen ID enumeration:** `grep 'showScreen(' js/games/[abbr].js` — lists every transition call. Cross-check the IDs against `game-identities.md` State Flow and `allScreens[]` in `engine.js`. This is quicker than reading the whole file.
- **`allScreens[]` is in `engine.js`** — look for the array declaration near the top of the file.
- **SW precache:** `sw.js` — `CACHE_NAME` version and the `urlsToCache` array. `logic-engine.md` has the canonical list — compare both.

### Debt Harvest

- **Most likely location for hardcoded shadows:** The scoring/resolve function (e.g., `natResolveRound`, `jecComputeScores`). Any literal point number inside score calculations should reference a setting variable instead.
- **setTimeout:** Grep `setTimeout` — if there are 0 results, the check passes immediately. If any exist, verify each has an inline comment explaining *why* a delay is necessary.
- **Global-scope listeners:** All `addEventListener` calls for a game plugin should be inside a `DOMContentLoaded` callback or a named init function. If the file wraps everything in one `document.addEventListener('DOMContentLoaded', ...)` block, all listeners inside are scoped correctly.

### Linguistic Sweep

- **Most likely location for stale spec text:** The gameover screen's round-log/history template. These are often written early against the original spec and not updated when point values become configurable. Check every literal number in a UI string.
- **Generic string grep targets:** `"Game Over"`, `"Round"`, `"Score"`, `"Points"`, `"Vote"`, `"Level"`, `"Player"` (bare, lowercase). Search the JS file and the game's HTML section in `index.html`.
- **Quit overlay:** Read the `[abbr]-quit-overlay` block in `index.html` — check emoji, heading, subtext, confirm button, cancel button against `game-identities.md` Quit Overlay entry.
- **Settings overlay title:** First child of `overlay-data-inner` should be the thematic title block — compare against the Settings overlay title row in the Terminology table.

### Layout Audit

- **Where docs drift hides first:** `index.html` section header comments (the `<!-- ════ GAME NAME ════ -->` blocks listing screen IDs). These go stale whenever a screen is added late in development.
- **Where docs drift hides second:** `game-identities.md` Terminology table — especially mechanics that were renamed during build (e.g., "The Eviction" → "The Selection"). The JS source and `allScreens[]` are almost always correct; work backwards from code to docs.
- **`min-h-0` check:** Only relevant for `h-screen overflow-hidden` layouts (sticky-footer pattern). If a game's gameplay screens use the default `min-h-screen overflow-y-auto` pattern, this item is N/A for most screens.
- **Z-index:** Quit overlays `z-[80]`, how-to overlays `z-[90]`, sound overlay `z-[110]`. Can be confirmed by reading the `class=` attribute of each overlay backdrop div in `index.html`.

### Who Goes First (Team Games)

**Rule:** Every game where two teams compete must use `showWhoFirst(config)` from `engine.js` before the first round begins. No plugin may implement its own first-team screen or silently default team order (e.g. `encryptingTeam = 0`).

**How to detect the debt during an audit:**
- Grep the plugin for `showWhoFirst` — if absent and the game is two-team, it's missing.
- Grep for `= 0` assignments on any "current team" / "encrypting team" / "active team" state var — if set at game-start with no `showWhoFirst` call, it's hardcoded.
- Check the setup flow: `showWhoFirst()` must fire after player names are confirmed and before any gameplay screen.

**Known debt:**

| Game | Status | Notes |
|------|--------|-------|
| Like I'm Five (LI5) | ❌ Not implemented | Currently defaults to Team 1. Needs `showWhoFirst()` wired into setup flow. |
| Secret Signals (SS) | ✅ Implemented | Added Phase 18 — fires after Players screen, before first vault gate. |
| Any future team game | — | Must use `showWhoFirst()` from day one — see checklist in `logic-engine.md`. |
