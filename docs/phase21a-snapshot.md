# Phase 21a Snapshot — Pre-Multiplayer Fix & Documentation Integrity
**Date:** Phase 21a complete
**SW Version:** v78 (no new precached assets this phase)
**Gold Master:** 8 games (unchanged set — LI5, GM, SS, JEC, YGI, LTTP, NAT, DSD)
**Follows:** Phase 20 snapshot
**Precedes:** Phase 21b — Multiplayer (MFS v1.4)

---

## Summary

Phase 21a had three sources of work:
1. **Brief-defined:** NAT fixes + LTTP fixes + documentation audit
2. **User-added:** DSD enhancements (Strategic Planning + dynamic legend)
3. **User-added:** Global [?] help element (all 8 games)

---

## Natural Selection (NAT) — Changes

### 1.1 Category Label on Observation Screen
Added `#nat-obs-category-label` to the role card (right column, below the word). Populated in `natRenderObservationScreen()` with `nono_list[0]` for all roles except The Mole (omitted — their word IS the category). Style: `text-stone-400 text-xs uppercase tracking-widest`. **Display-only change — no data modified.**

### 1.2 Research Log Setting (formerly "Field Notes")
**Naming decision:** Brief proposed "Field Notes" but it collided with "The Field Notes" (tally screen label). Renamed to **Research Log**.

- New state: `natCumulativeClues = false` (settings persist lifecycle)
- New state: `natWordsByDay = []` (`[dayIdx][playerIdx]` — populated at start of each day)
- Settings card added after Days Per Habitat, before Sylly Mode (toggle, `game-toggle-off shrink-0`)
- When ON: `natStartClueRound()` draws a fresh nono_list word for each Field Researcher on day 1+. `natWordsByDay` records each day's words.
- When ON, day 1+: `natRenderObservationScreen()` shows stacked history "Day 1: spotted · Day 2: stripe" for Field Researchers instead of single word. Mole and Biologist unaffected.
- Added to `natApplySettings()`, `natResetState()`, `natApplyExpansionOverrides()`

### 1.3 Tie-Breaker Audit
**Finding:** The `-1` path (`natEvictedIdx === -1`) is fully safe. `natShowLastStand()` uses `natPlayerNames[natMoleIdx]` (always valid), not `natPlayerNames[natEvictedIdx]`. `natBiologistVerdict()` evaluates `natEvictedIdx === natMoleIdx` which returns `false` — correct (Mole not caught).

**Improvement added:** `natShowTally()` now shows "No consensus reached — [MoleName] escapes by default." when `noConsensus` is detected (entry.evictedIdx === -1 && !entry.caught).

### 1.4 Role Clarity
- New helper `natGetRoleDescription(pIdx)` returns a one-line role description per role
- New helper `natWordIsResearcher(pIdx)` reusable predicate
- `#nat-obs-role-desc` element added to role card (left column, below role label). Style: `text-stone-400 text-xs`
- Turn instruction "Say your clue aloud, then submit." added below the error element (all roles)

### 1.5 Single-Word Enforcement
Space check added to `natSubmitObservation()` before all other validation. Block: `inputEl.value.trim().includes(' ')`. Error: "One word only." Shake animation. Hyphens remain permitted.

---

## Late to the Party (LTTP) — Changes

### 2.1 Instruction Strip + Contacts Tab Badge
- `#lttp-map-instruction` added inside `lttp-pane-map` below the grid: "1. Check the map. 2. Tap Contacts to choose who to message."
- `#btn-lttp-chat-tip` (contextual [?] button) added alongside the instruction strip
- `#lttp-chat-role-objective` element added to the red header bar below `#lttp-chat-role-label`
- Badge: `lttp-tab-badge` CSS class added to Contacts tab in `lttpShowChat()`, removed on first tap

### 2.2 Role Objective Line
Added `#lttp-chat-role-objective` populated in `lttpShowChat()`:
- Friend of a Friend: "Blend in. Message your way to the exit without being caught."
- The Gang: "Find the Friend of a Friend before they disappear."
- The Troublemaker: "Cause chaos. Lead The Gang to a fake location."

### 2.3 Contacts Visual Clarity
In `lttpRenderPaneB()`, the contact row rendering updated:
- **Name column:** wrapped in border pill (`border border-stone-300 rounded-full px-2 py-0.5`) to signal tappability
- **Notes column:** added "Notes" eyebrow label + `bg-stone-50 rounded-lg` tint

### 2.4 Message Flow (SmallTalk Replacement — Major)
**Both Guided and Pro modes replaced by a single free-text modal.**

- `lttpSmallTalk`, `lttpPendingTag` state variables removed
- `LTTP_SMALL_TALK` constant removed
- `lttp-smalltalk-overlay` and `screen-lttp-smalltalk` removed from `allScreens[]` (HTML preserved as dead code)
- `lttp-confirm-overlay` rebuilt: "Message to [Name]" heading + 80-char `<textarea>` + live character counter + Send/Cancel buttons
- `lttpOpenConfirmModal(targetIdx)` simplified — just shows the free-text overlay
- `lttpSelectPlayer(targetIdx, tag)` → `lttpSelectPlayer(targetIdx, messageText)`
- `lttpHistory` schema changed: `{asker, asked, plan, tag}` → `{asker, asked, plan, messageText}`
- Chatlog preview and full history overlay updated to render `entry.messageText`
- `lttpShowHandover()` now shows message block when `lttpHandoverMode === 'chat'` and last history entry has `messageText`: italic quote + "Read this message aloud, then hand over the phone."
- Small Talk setting removed from `lttp-settings-overlay`
- `btn-lttp-smalltalk-toggle` listener removed

**Multiplayer note (Phase 21b):** MFS v1.4 LTTP SYNC packet references `messageTag: {root, emoji, label}`. This must be updated to `messageText: "string"` when Phase 21b begins.

---

## Deep-Sea Deploy (DSD) — Changes (User-Added)

### A: Dynamic Legend with Penalties
`dsdUpdateLegend()` added — called from `dsdShowCaptain()` `onConfirm` handler. Populates five legend value spans dynamically:
- Friendly payload: "+10"
- Enemy payload: "+10 to [name]" + "(ends turn)" if `dsdHazardControl.enemy`
- Urchin: "−5 · ends turn" or "−5 · continues" based on `dsdHazardControl.urchin`
- Mine: "−20 · ends turn" (pressure) or "−1000 ☠️ GAME OVER" (nuclear) based on `dsdDangerLevel`
- Jammer: "−5 · ends turn" (always)

Legend HTML updated to include value `<span>` elements with stable IDs.

### B: Strategic Planning / Word Reroll
New setting + new screen.

- New state: `dsdStrategicPlanning = false` (settings persist), `dsdRerollsRemaining = 3` (resets each game)
- Settings card added after Sea State card (toggle, `game-toggle-off shrink-0`)
- New screen `screen-dsd-briefing` registered in `allScreens[]` and teardown cleanup
- `dsdLaunchWhoFirst()` now branches: if `dsdStrategicPlanning`, routes to `dsdShowBriefing()` instead of `dsdShowCaptain()`
- `dsdShowBriefing()`: renders 25 neutral word tiles (no role colours), counter, Reroll + Deploy buttons
- `dsdRerollBoard()`: decrements counter, calls `dsdBuildGame()`, re-renders grid
- Deploy button: calls `dsdShowCaptain()` (which shows the pass-gate before the captain grid)
- **Design note:** No ✕ quit button on briefing screen — game hasn't started yet; Reroll/Deploy are the only actions. This is a deliberate choice since the who-first decision is already committed.

---

## Global [?] Help Element — All 8 Games

Two patterns implemented:

### Pattern A — Header [?] → opens game's How to Play overlay
Added `.btn-[abbr]-help-open` button in header rows of key gameplay screens. Each game's plugin wires `querySelectorAll('.btn-[abbr]-help-open')` to open its existing how-to overlay.

**Screens with header [?] added:**
- NAT: handover, observation
- LTTP: chat (red header bar)
- DSD: captain
- LI5: active-play (between 🔊 and ✕)
- GM: input

### Pattern B — Contextual [?] → game-specific one-liner tip
8 `[abbr]-help-tip-overlay` overlays added (decision modal, z-[90]). Each game has `[abbr]ShowHelpTip(emoji, heading, tip)` helper.

**Contextual tip buttons and copy:**
| Screen | Tip copy |
|--------|----------|
| NAT observation | "Give one word based on your clue. No spaces — hyphens OK." |
| LTTP chat | "Tap a contact name to send them a message. Use the map to track your suspicions." |
| DSD captain ping | "Enter one word clue + a number (how many payloads it covers, 1–9)." |
| LI5 active-play | "Describe the word without saying any word on the No-No List." |
| GM input | "Enter one word that connects both displayed words." |
| SS encrypt | "Pick one keyword from your vault that your partner will recognise." |
| JEC prep | "Enter words you think others will also write. The Sweet Spot is matching — not too many, not too few." |
| YGI input | "Enter a number and a unit for the situation — e.g. 47 tabs, 3 hours, 12 messages." |

Help-tip overlays added to `resetToLobby()` cleanup via a forEach loop.

---

## CSS Additions

- `:root { overscroll-behavior-y: none; }` — disables pull-to-refresh PWA-wide (multiplayer prerequisite from MFS v1.4)
- `.game-toggle-off` added as canonical OFF-state toggle class (`.sylly-toggle-off` retained as legacy alias, both reference same rules)
- `#btn-lttp-tab-contacts.lttp-tab-badge::after` — pulsing red dot on the Contacts tab
- `dsdGrid` roles corrected in code-map: no 'bystander' — roles are `0 | 1 | 'urchin' | 'mine'`

---

## Documentation Updates

### `docs/code-map.md`
- Header updated to "Phase 21a (8 games, post-audit)"
- `#btn-dsd` added to Global Key Buttons
- `#li5-play-again-overlay` added to LI5 overlays
- LTTP section: all Stray/IC/Joker display name references corrected to Friend of a Friend/The Gang/The Troublemaker; SmallTalk section replaced with Message Flow; `screen-lttp-smalltalk` removed; `screen-lttp-briefing` added; confirm overlay description updated
- NAT: `#nat-new-expedition-overlay` added; `natCumulativeClues` state variable added
- DSD: screens split (setup + players + briefing + pass-gate); overlays updated (added `dsd-new-op-overlay`); state vars corrected; `dsdStrategicPlanning`, `dsdRerollsRemaining` added; `dsdShowBriefing`, `dsdRerollBoard`, `dsdUpdateLegend` functions added

### `game-identities.md`
- LI5: Overlay Types table added (with `li5-play-again-overlay`)
- LTTP: State flow updated (SmallTalk → Message Modal); Terminology/Map Behaviour/Contacts/Folder Hints updated to use correct display names; SmallTalk Mechanic section replaced with Message Flow section; Small Talk setting removed; `screen-lttp-briefing` added; overlays table updated
- NAT: Research Log setting added to settings table; `nat-new-expedition-overlay` added; tie-breaker `-1` path documented; eviction tie-break documentation updated
- DSD: Strategic Planning setting added; `screen-dsd-briefing` added; Dynamic Legend section added

### `CLAUDE.md`
- Documentation Integrity Protocol added under 📝 Documentation Pause Rule (§6 from brief)
- Current Focus updated to Phase 21a

---

## Tie-Breaker Finding (§1.3)

**Finding:** The `-1` path was already safe. No code produced `undefined`, blank names, or JS errors. No structural fix was required. A UI improvement was added to the tally screen to surface "No consensus reached" text when applicable.

**Documented in `game-identities.md`** under NAT Special Mechanics.

---

## Deviations from Phase 21a Brief

| # | Brief said | What was done | Reason |
|---|-----------|---------------|--------|
| 1 | NAT setting name "Field Notes" | Renamed to "Research Log" | Naming collision with "The Field Notes" (tally screen label) |
| 2 | Brief restricted JS changes to NAT/LTTP only | DSD and all-game [?] changes also made | User explicitly requested during planning |
| 3 | `screen-lttp-smalltalk` should be removed | HTML preserved as dead code | Low risk; JS no longer references it; removal would require finding its full HTML extent |
| 4 | DSD briefing screen has no ✕ quit button | Deliberate — no quit flow needed before game start | Game hasn't started; Reroll and Deploy are the only meaningful actions |

---

## Phase 21b Handoff Notes

- **LTTP multiplayer:** MFS v1.4 SYNC packet references `messageTag: {root, emoji, label}`. Update to `messageText: "string"` in Phase 21b.
- **[?] coverage:** Header ? buttons added to high-priority screens only. Full coverage (all 40 gameplay screens) can be completed in Phase 21b or a maintenance pass.
- **`sylly-toggle-off`** legacy class retained in CSS; `.game-toggle-off` is the canonical name going forward. Remaining games (GM, SS, JEC, YGI, LI5) still use `sylly-toggle-off` in some toggles — phase these out in Phase 21b.
- **SW version:** No new precached assets added this phase. SW remains at v78. Bump SW when Phase 21b adds multiplayer assets.

---

*Phase 21a complete. Phase 22 (Multiplayer — MFS v1.4) may begin.*

---

## Post-Snapshot Corrections (Rounds 2 & 3)

These fixes were made after the snapshot above was written. Documenting here for completeness.

### DSD

**Strategic Planning — unlimited swaps:** `dsdRerollsRemaining` removed entirely. The 3-swap budget was abandoned in favour of unlimited swaps. `dsdRerollWord()` draws from `dsdWordPool` freely; when `dsdWordPoolIdx >= dsdWordPool.length` the pool is rebuilt from all eligible words not currently on the board, then drawing continues. No counter UI. The "Reroll all" button (`btn-dsd-briefing-reroll`) that the original spec described was never implemented — per-word tap replaced it.

**Dead event listener (critical bug):** An `addEventListener` call targeting `btn-dsd-briefing-reroll` (calling undefined `dsdRerollBoard()`) was left in `dsd.js` after the HTML element was removed. `getElementById` returned `null`, and `.addEventListener()` on `null` threw a TypeError at script evaluation time, halting all subsequent event listener registration in the file — killing Deploy, Transmit Ping, Sound, and Exit. Removed.

**Captain default:** `dsdRenderPlayerInputs()` now pre-selects index 0 of each team as captain on render (`bg-cyan-100 text-cyan-700`). Manual ⚓ tap to reassign works as before.

**Grid word rendering:** All grid cells (briefing, captain, crew) now have `overflow-hidden whitespace-nowrap` + dynamic font sizing (`text-[8px]` / `text-[9px]` / `text-[10px]` by word length) to prevent long words (e.g. "Jack-in-the-box") wrapping to two rows and breaking adjacent cells' height.

### NAT

**Observation screen layout:** Reverted from sticky-footer (`h-screen overflow-hidden` + `flex-1 overflow-y-auto min-h-0` body) back to centred (`flex items-center justify-center w-full min-h-screen px-5 py-8 overflow-y-auto`). The sticky-footer caused content to anchor at the top on short screens. The journal no longer has `max-h-40` — it grows naturally; the full page scrolls when needed.

**Role card — 4-line right column:** Added `nat-obs-category-value` element below `nat-obs-category-label`. Right column now shows four distinct lines: label (`text-xs`) / word value (`text-sm font-bold`) / label (`text-xs`) / category value (`text-sm font-bold`). Both value lines are now equal size.

**Role card — left column size:** `nat-obs-role` and `nat-obs-role-desc` bumped from `text-xs` to `text-sm` for legibility against the right column.

### LTTP

**Small Talk "Other" tab — text transfer:** The "Other" tab textarea now has an `input` event listener that syncs `textarea.value` to `sendBtn.dataset.selected` on every keystroke. The existing `btn-lttp-st-overlay-send` handler already reads `dataset.selected` as the confirm modal pre-fill — no handler change needed. The "Your note won't be transferred" hint paragraph was removed.
