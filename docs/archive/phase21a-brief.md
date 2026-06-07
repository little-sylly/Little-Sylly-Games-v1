# Phase 21a — Pre-Multiplayer Fix & Documentation Integrity Brief
**Scope:** Natural Selection (NAT) fixes · Late to the Party (LTTP) fixes · Code-map & documentation audit
**Status:** Pre-implementation brief — confirm before coding begins
**Prerequisite:** Phase 20 gold master confirmed (SW v78, all Protocol A audits complete)
**Follows:** Phase 20 snapshot (`docs/phase20-snapshot.md`)
**Precedes:** Phase 21b — Multiplayer implementation (MFS v1.4)

---

## Ground Rules for Claude Code

- **Surgical coding protocol applies.** One function or one UI component per response.
- **Confidence rule.** Do not write code until 95% confident. Ask if unclear.
- **NAT and LTTP only for JS changes.** Do not touch any other plugin or `engine.js`.
- **Shared file exceptions:** `css/styles.css` (one addition — §3), `docs/code-map.md` (full update — §4), `game-identities.md` (targeted additions — §5).
- **Complete §4 and §5 before beginning any JS work.** Documentation must be accurate before code is written against it.
- **Protocol A audit** of all modified screens before marking phase complete.
- **Phase snapshot** required before Phase 21b begins.

---

## §1 — Natural Selection (NAT) Fixes

### Role Architecture Reference (read before touching any role logic)

Three roles exist. Their information and responsibilities differ fundamentally. The descriptions below are the authoritative source — confirm any discrepancy with `game-identities.md` before coding.

| Role | Internal variable | Display name | What they receive | Their objective |
|------|------------------|--------------|-------------------|-----------------|
| The Mole | `natMoleIdx` | "🕵️ The Mole" | `nono_list[0]` — The Grouping (e.g., "Sea Creature") | Give plausible clues without revealing they only know the category. Blend in. At Last Stand, guess the specimen correctly to score bonus points. |
| Field Researcher | (all others) | "📋 Field Researcher" | One word from `nono_list[1–9]` — a specific trait | Give one clue per day based solely on their assigned word. Help the group identify the specimen without naming it. |
| Lead Biologist | `natBiologistIdx` | "🔬 Lead Biologist" | `natSpecimen.word` — the exact animal name | Already knows the answer. Guide Field Researchers toward the specimen without making it so obvious The Mole can follow along and guess correctly at Last Stand. Not present in Sylly Mode. |

---

### 1.1 Default Category Display — Confirm & Enforce

**Current code behaviour:** `natGetWordForPlayer(pIdx)` returns `natAssignedWords[pIdx]` in standard mode. Each player sees only their own assigned word. The Mole's word IS the category. Field Researchers see a trait word only — the category is not explicitly shown to them.

**Required change:** Every player must also see the animal's Documentary Label (The Grouping) displayed as a secondary label on `screen-nat-observation`, below their assigned word.

- Label format: `Category: [grouping word]` — e.g., "Category: Sea Creature"
- Style: muted small text matching `nat-obs-word-label` (`text-stone-400 text-xs uppercase tracking-widest`)
- Source: `natSpecimen.nono_list[0]` — always available after `natStartMatch()`
- For The Mole: their primary word IS the category. Display the category label anyway for consistency, OR omit it only for The Mole since it would be redundant. Either is acceptable — confirm the cleaner option before implementing.
- For Lead Biologist: show the category label. They know the full animal, so this adds no meaningful information.
- **This is a display-only change.** Do not modify `natAssignedWords`, `natGetWordForPlayer()`, or any data assignment logic.

**First action:** Check whether the category is already surfaced anywhere on the observation screen UI. If it is, document the finding and skip this change.

---

### 1.2 New Setting: Cumulative Clues ("Field Notes")

**What it does:** When enabled, Field Researchers accumulate their previous rounds' assigned clue words across days. On Day 2 they see both their Day 1 word and their Day 2 word. On Day 3, all three. The Mole's word never changes — accumulation has no effect on them. The Lead Biologist already knows the answer — accumulation does not change their information.

**Existing infrastructure:** `natCluesByRound[round][playerIdx]` already stores submitted clues per day. The observation screen already has `nat-obs-journal` which renders previous days' clues. The new setting affects the *word card* area (what the player is told to base their clue on), not the journal.

**Implementation:**
- New boolean: `natCumulativeClues = false` (default OFF)
- When ON: the word display area (`nat-obs-word`) shows a stacked list — all previous assigned words plus today's, labelled by day. E.g., "Day 1: spotted · Day 2: stripe". Only Field Researchers are affected — check role before rendering.
- When OFF: existing behaviour unchanged — one word shown at a time.
- Add `natCumulativeClues` to `natResetState()` reset block.
- Add to `applyExpansionOverrides()` read block.

**Setting card:**
- Name: **Field Notes**
- Description: *"Researchers keep all previous clues each round."*
- Type: toggle (ON / OFF), default OFF
- Position: after Days Per Habitat setting, before Sylly Mode
- Follows standard settings card pattern: white card, toggle with `shrink-0` in both active and inactive class strings
- Add to `game-identities.md` settings table (§5 below)

---

### 1.3 Tie-Breaker — Audit & Document

**Current code (`nat.js` lines 617–624):**
```javascript
let tied = counts.reduce((acc, v, i) => v === max ? [...acc, i] : acc, []);
if (tied.length === 1) {
  natEvictedIdx = tied[0];                           // clean winner
} else {
  const minScore = Math.min(...tied.map(i => natScores[i]));
  tied = tied.filter(i => natScores[i] === minScore);
  natEvictedIdx = tied.length === 1 ? tied[0] : -1; // -1 = unresolved
}
```

Two-tier logic: highest vote count → if tied, lowest Credibility breaks it → if still tied, `natEvictedIdx = -1`.

**`game-identities.md` already documents this correctly** (line 471): "Still tied → `natEvictedIdx = -1` (Mole wins by default)."

**The gap:** Trace the `-1` path from `natResolveVotes()` through to `natShowLastStand()`. Confirm whether `natEvictedIdx === -1` is handled gracefully in every screen that references it (player name display, "caught" logic, scoring). If any reference produces `undefined`, a blank name, or a JS error: fix it. The fix should surface a clear in-game message: e.g., "No consensus — The Mole escapes by default."

**Do not change the tie-break logic itself.** Only fix the `-1` UI path if it is broken. Document the finding either way in `game-identities.md` under Special Mechanics.

---

### 1.4 Role Clarity & Turn Instructions

**Current state:** `natGetRoleLabel(pIdx)` returns `'🕵️ The Mole'`, `'🔬 Lead Biologist'`, or `'📋 Field Researcher'`. This is rendered into `#nat-obs-role` on the observation screen. No description line or turn instruction currently exists.

**Required changes:**

**A — Role description line (new element below `#nat-obs-role`):**
Add a new element directly below the role label. Renders a one-line plain-English description of what this player does right now. Style: `text-stone-400 text-xs` — muted, small, does not compete with the word card.

| Role | Description |
|------|-------------|
| The Mole | *"Blend in. Give a clue without revealing you don't know the specimen."* |
| Field Researcher | *"Give one clue based on your word. Don't name the specimen."* |
| Lead Biologist | *"You know the specimen. Guide the researchers — but don't tip off The Mole."* |

Populate inside `natShowObservation()` using a new helper `natGetRoleDescription(pIdx)`.

**B — Turn instruction line (new element below clue input):**
Add a brief contextual instruction below `nat-obs-input`. Tells the active player exactly what action to take. Visually secondary — small, stone-palette.

All three roles: *"Say your clue aloud, then submit."*

This is a guardrail for new players. It should feel like a whisper, not a label.

---

### 1.5 Single-Word Clue Enforcement

**Current state:** `nat-obs-input` has `maxlength="30"`. No space validation exists. Multi-word clues are accepted.

**Required change:** On submit in `natSubmitClue()`, validate that `input.value.trim()` contains no space characters.

- Block condition: `input.value.trim().includes(' ')`
- Error message (into `#nat-obs-error`): *"One word only."*
- Shake animation re-trigger (existing project pattern):
  ```javascript
  el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
  ```
- **Hyphens are permitted.** "duck-billed" is a valid single clue.
- Numbers and special characters other than spaces are permitted.
- The existing blocks (animal name, own clue word) remain unchanged. Add the space check alongside them — do not replace them.

---

## §2 — Late to the Party (LTTP) Fixes

### Role Architecture Reference (read before touching any role logic)

Three roles. Internal variable names differ from display names — use display names in all UI text.

| Internal | Display name | Their objective |
|----------|-------------|-----------------|
| `lttpStrayIdx` | **Friend of a Friend** | Blend in. Message your way to the correct location exit without being caught. |
| IC (all others) | **The Gang** | Find the Friend of a Friend before they disappear into the crowd. |
| `lttpJokerIdx` | **The Troublemaker** | Lead The Gang to a fake location. Don't blow your cover. (Joker Mode ON only.) |

These display names are confirmed correct in `lttp.js` line 500 and in `game-identities.md`. Any prior brief or document using "Stray", "IC", or "Joker" as display names was wrong — those are internal variable names only.

---

### 2.1 Active Player Turn — Instructions & Contacts Tab Highlight

**Current state:** `lttpShowChat()` sets the screen and snaps to the map pane by default (`lttpSnapToPane('map')` line 509). No turn instructions exist on the screen.

**Required changes:**

**A — Instruction strip:**
Add a persistent instruction strip below the map grid (map pane only — not the contacts pane). Static text, does not change mid-turn.

Copy: *"1. Check the map.  2. Tap Contacts to choose who to message."*

Style: `text-xs text-stone-400 text-center`. Sits between the map grid and the chatlog preview. Hidden when the contacts pane is active.

**B — Contacts tab pulse badge:**
When `lttpShowChat()` fires and the screen opens on the map pane, add a pulsing indicator to `#btn-lttp-tab-contacts` to draw the player's eye.

Implementation: toggle a CSS class `lttp-tab-badge` on the Contacts tab button inside `lttpShowChat()`. Add a `::after` pseudo-element in `css/styles.css`:
```css
.lttp-tab-badge::after {
  content: '';
  position: absolute;
  top: 2px; right: 2px;
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #ef4444;
  animation: pulse 1.5s infinite;
}
```
Remove `lttp-tab-badge` inside the `#btn-lttp-tab-contacts` click listener (first tap resolves the badge). The badge reappears each time `lttpShowChat()` is called for a new active player.

---

### 2.2 Active Player Role Clarity

**Current state:** `lttpShowChat()` sets `#lttp-chat-role-label` using `roleLabel` (line 500/504). This element already exists. Confirm its current visual prominence on the screen before adding anything.

**Required change:** Below the existing role label, add a one-line role objective reminder. Populate it in `lttpShowChat()` alongside the existing role label.

| Display role | Objective line |
|-------------|----------------|
| Friend of a Friend | *"Blend in. Message your way to the exit without being caught."* |
| The Gang | *"Find the Friend of a Friend before they disappear."* |
| The Troublemaker | *"Cause chaos. Lead The Gang to a fake location."* |

Style: `text-xs text-stone-400` — subtitle level, not a prominent block.

---

### 2.3 Contacts Pane — Visual Clarity

**Current state (from `lttp.js` lines ~556–592):** Each contact row is a three-column flex div: name span (1/4 width, tappable → opens message flow), notes span (1/2 width, tappable → opens folder), status chip (1/4 width, tappable → cycles). Row styling: `bg-white rounded-2xl shadow-sm px-3 py-3`.

The name and notes columns are visually similar — it is not obvious they are separate tap targets with different actions.

**Required changes:**

**A — Name column:** Add a visible bordered pill treatment to the name span to signal it is a distinct tappable element. Suggested: `border border-stone-300 rounded-full px-2 py-0.5`. Do not restructure the row layout.

**B — Notes column:** Add a faint background tint or a small "Notes" eyebrow label to distinguish the notes area from the name. Suggested: `bg-stone-50 rounded-lg px-1` on the notes span, or a `text-stone-400 text-xs` "Notes" label above the notes content within the span.

**C — "No notes yet" placeholder:** Confirm `<em>No notes yet</em>` remains legible after styling changes.

Do not introduce new layout patterns. Extend the existing stone-palette card style.

---

### 2.4 Message Flow — Free-Text Input Replacement

**Current system:** Two modes controlled by `lttpSmallTalk`:
- **Guided (ON):** Tapping a contact opens `lttp-smalltalk-overlay` — tabbed topic picker → sub-option → Send. Stores `lttpPendingTag = {root, emoji, label}`.
- **Pro (OFF):** Tapping a contact opens `lttp-confirm-overlay` → `screen-lttp-smalltalk` (verbal ask + root stamp).

Both systems store a `tag` object in `lttpHistory`. Both are replaced by the new free-text flow.

**Scope confirmation before coding:** Both Guided and Pro modes are replaced. The `lttpSmallTalk` setting toggle becomes redundant and must be removed from the settings overlay. Flag if any other logic depends on `lttpSmallTalk` before removing it.

**New flow:**

1. Player taps a contact name → `lttpOpenConfirmModal(targetIdx)` is called as before
2. Instead of branching to SmallTalk overlay or the verbal screen, the confirm overlay is updated to contain a **free-text message input** directly:
   - Header: *"Message to [Player Name]"*
   - Text input, placeholder: *"Type your message..."*
   - Live character counter: *"0 / 80"* — updates on `input` event; turns `text-red-500` at ≤ 10 characters remaining
   - Send button: disabled until input non-empty; on empty submit attempt: shake + `border-red-400`
   - Cancel button: closes overlay, no action, returns to contacts pane
3. On Send: `lttpSelectPlayer(targetIdx, { messageText: inputValue.trim() })`

**Data schema change:** `lttpHistory` entries change from:
```javascript
{ asker, asked, plan, tag: { root, emoji, label } }
```
to:
```javascript
{ asker, asked, plan, messageText: "string" }
```

Update all history display references that read `entry.tag`:
- Chatlog preview builder (~line 604): replace tag string construction with `entry.messageText`
- Full history overlay builder (~line 797): same replacement
- Any other reference to `lttpPendingTag` or `entry.tag` in the file

**Handover screen update:**
`screen-lttp-handover` shows recipient name + "Don't peek" sub-line. When `lttpHandoverMode === 'chat'`, also show the message:

```
[Recipient Name]'s turn

"[message text]"

Read this message aloud, then hand over the phone.
```

- Message text: `bg-stone-100 rounded-2xl px-4 py-3 text-stone-800 text-base italic`
- "Read this message aloud" instruction: visually prominent, required — resolves the core UX ambiguity about what happens after a message is sent
- When `lttpHandoverMode === 'role'` (role reveals): message block hidden — only name and "Don't peek" show

**Variables to clean up:** `lttpSmallTalk`, `lttpPendingTag`, `lttpPendingTarget` (if no longer needed after the confirm overlay is replaced). Confirm each before removing.

**Multiplayer implication (no action in Phase 21a):** MFS v1.4 §7 LTTP references `messageTag: { root, emoji, label }` in the SYNC packet. This must be updated to `messageText: "string"` when Phase 21b begins. Document in the phase snapshot.

---

## §3 — Shared CSS Fix (`css/styles.css`)

**Two additions. No other existing rules may be modified.**

**Addition 1 — Overscroll prevention:**
Add to the `:root` selector (create if it does not exist; if it exists, add the property to it — no duplicate `:root` blocks):

```css
:root {
  overscroll-behavior-y: none;
}
```

Disables pull-to-refresh across the entire PWA. Specified in MFS v1.4 Sprint 1 as a multiplayer prerequisite — implementing here means it does not need to be repeated in Phase 21b.

**Addition 2 — LTTP contacts tab pulse badge:**
```css
#btn-lttp-tab-contacts.lttp-tab-badge {
  position: relative;
}
#btn-lttp-tab-contacts.lttp-tab-badge::after {
  content: '';
  position: absolute;
  top: 2px;
  right: 2px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
  animation: pulse 1.5s cubic-bezier(0.4,0,0.6,1) infinite;
}
```

---

## §4 — Documentation Audit: `docs/code-map.md`

**Complete this section before writing any JS.** The code-map is a surgical reference document — if it is wrong, future Claude Code sessions will make errors against it.

The code-map was last updated at Phase 17. A drift audit against `index.html`, `lttp.js`, `nat.js`, and `game-identities.md` has identified the following gaps. Correct all of them.

### 4.1 Header
Update: `**Updated:** Phase 17 (7-game gold master)` → `**Updated:** Phase 21a (8 games, post-audit)`

### 4.2 Global / Engine — Key Buttons
Add the DSD lobby button (currently missing from the table header context):
- Confirm `#btn-dsd` exists in `index.html` as the DSD lobby entry point. If so, it is already in the table — no change needed. If the table says `#btn-nat` is the last entry and DSD is absent, add it.

### 4.3 Like I'm Five (LI5) — Overlays
Add missing Phase 20 entry:
| `#li5-play-again-overlay` | Decision modal z-[90] | "New Playgroup?" play-again confirmation — `#btn-li5-play-again` |

### 4.4 Late to the Party (LTTP) — Role display names
The LTTP section uses internal variable names as display names throughout. Update every instance:

| Current (wrong) | Correct |
|----------------|---------|
| "Stray" / "The Stray" (as display name) | "Friend of a Friend" |
| "IC" (as display name) | "The Gang" |
| "Joker" (as display name) | "The Troublemaker" |

Note: `lttpStrayIdx`, `lttpJokerIdx` as *variable names* in the Key State Variables table are correct and must not change — only the *purpose/description* column display names need updating.

Specific lines to update:
- `lttpAssignRoles()` purpose: "Random Stray + Joker assignment" → "Random Friend of a Friend + Troublemaker assignment"
- `lttpShowRoleReveal(idx)` purpose: "Role-aware private reveal screen" — fine as-is
- `lttpOpenMapOverlay()` purpose: "IC red, Joker gold+purple, Stray annotatable" → "The Gang: red, The Troublemaker: gold+purple, Friend of a Friend: annotatable"
- `lttpSelectPlayer` purpose: `tag = {root,emoji,label}` — update to `messageText: "string"` after Phase 21a message rewrite is complete (do at end of phase)
- Small Talk state table: `lttpPendingTag` description — update or remove after message rewrite

### 4.5 LTTP — Screens: Add Missing Screen
| `#screen-lttp-briefing` | Game start summary + plan-transition screen — shown after setup and after each plan narrowing |

### 4.6 Natural Selection (NAT) — Overlays
Add missing Phase 20 entry:
| `#nat-new-expedition-overlay` | Decision modal z-[90] | "New Expedition?" play-again confirmation |

### 4.7 Natural Selection (NAT) — Key State Variables
Add new Phase 21a entry after implementation:
| `natCumulativeClues` | `false` | bool — Field Notes setting |

### 4.8 Deep-Sea Deploy (DSD) — Screens
The current entry for `screen-dsd-setup` says "Team names, players per team, Captain designation." This was split into two screens in Phase 20. Update:

| ID | Purpose |
|----|---------|
| `screen-dsd-setup` | **Team names only** (Phase 20 split) |
| `screen-dsd-players` | Player names + Captain designation (Phase 20 — new screen) |
| `screen-dsd-pass-gate` | Pass-the-phone gate — before every Captain screen and before every Crew screen |

### 4.9 Deep-Sea Deploy (DSD) — Overlays
Add missing Phase 20 entry:
| `dsd-new-op-overlay` | Decision modal z-[90] | "New Operation?" play-again confirmation |

---

## §5 — Documentation Audit: `game-identities.md`

**Complete this section before writing any JS.**

### 5.1 LTTP — Role display names
Same correction as §4.4 — `game-identities.md` is already correct on the display names (uses "Friend of a Friend", "The Gang", "The Troublemaker" throughout). Verify this is the case. If any section still uses "Stray", "IC", or "Joker" as display names, correct them.

### 5.2 LTTP — Add Missing Screen
Add `screen-lttp-briefing` to the Screens table:
| `#screen-lttp-briefing` | Plan start/transition — session summary (Tonight's Plans / Plans Updated), first active player named |

### 5.3 LTTP — Settings Table
After Phase 21a message rewrite, remove or update the `Small Talk` setting row:
| ~~Small Talk~~ | ~~Guided / Pro~~ | ~~Guided~~ | ~~`lttpSmallTalk` bool~~ |

Replace with a note: *"Small Talk setting removed in Phase 21a — replaced by free-text message input."*

### 5.4 LTTP — Small Talk Mechanic Section
After Phase 21a message rewrite, replace the entire "Small Talk Mechanic" section with a "Message Flow" section describing the new free-text input model, the `messageText` field in `lttpHistory`, and the handover screen display pattern.

### 5.5 NAT — Overlays Table
Add missing Phase 20 entry:
| `nat-new-expedition-overlay` | Decision modal z-[90] | "New Expedition?" play-again confirmation |

### 5.6 NAT — Settings Table
After Phase 21a implementation, add new row:
| Field Notes | OFF / ON | OFF | `natCumulativeClues` bool |

Position: after Days Per Habitat, before Sylly Mode.

### 5.7 NAT — Terminology Table
"The Field Notes" is listed as the screen name for `screen-nat-tally`. This conflicts with the new setting name "Field Notes" being added in §1.2. Resolve the naming collision before implementing:

**Option A:** Rename the new setting. Suggest: **"Research Log"** — *"Researchers keep all previous clues each round."*
**Option B:** Rename the tally screen terminology entry in `game-identities.md` to something distinct from "Field Notes" (e.g., "The Tally Sheet" or "The Expedition Log").

**Confirm with project owner before coding §1.2.** Do not proceed with the Field Notes setting until the naming collision is resolved.

### 5.8 LI5 — Overlays Table
Add missing Phase 20 entry:
| `li5-play-again-overlay` | Decision modal z-[90] | "New Playgroup?" play-again confirmation |

---

## §6 — New Protocol: Documentation Integrity Rule

The drift found in this audit (code-map 3 phases out of date, role names wrong across documents, missing screens and overlays) occurred because there was no enforced requirement to update documentation alongside code changes.

**Add the following rule to `CLAUDE.md` under the 📝 Documentation Pause Rule section:**

---
**Documentation Integrity Protocol**
**Trigger:** After any completed phase, game addition, or permanent architectural change.
**Mandatory updates (in this order, before the phase snapshot is written):**
1. `docs/code-map.md` — add/update all new screen IDs, overlay IDs, key functions, and state variables introduced in the phase
2. `game-identities.md` — add/update all new settings, terminology, overlay types, and screen entries for affected games
3. `CLAUDE.md` — update SW version, current focus, and key references
4. `logic-engine.md` — update any new universal rules, audio functions, or engine patterns introduced

**Rule:** No phase snapshot may be written until all four documents are verified current. The snapshot itself is the final deliverable — not the starting point for cleanup.

**Enforcement:** At the start of every new phase, Claude Code must read `docs/code-map.md` and `game-identities.md` for all games it will touch and cross-reference against the actual `index.html` section headers and JS file. Any discrepancy found must be flagged and resolved before implementation begins.
---

This rule is retroactive. Phase 21a is the first phase it applies to — the §4 and §5 corrections above are the first execution of it.

---

## §7 — Protocol A Audit Checklist (Post-Implementation)

Before marking Phase 21a complete, run Protocol A on all modified screens.

**NAT:**
- [ ] Field Notes (or renamed equivalent) toggle has `shrink-0` in both active and inactive class strings
- [ ] Field Notes setting added to `game-identities.md` settings table
- [ ] Category label displays correctly for all three roles on observation screen
- [ ] Role description line renders correct text for all three roles
- [ ] Turn instruction line present below clue input
- [ ] Single-word validation fires on space input; shake animation replays correctly on repeat attempt
- [ ] Hyphenated clues (e.g., "duck-billed") are accepted
- [ ] Animal name and own-word blocks still fire correctly alongside space validation
- [ ] Tie-breaker `-1` path traced, documented, and fixed if broken
- [ ] Cumulative clues display correctly on Day 2+ when Field Notes ON
- [ ] Cumulative clues display unchanged when Field Notes OFF
- [ ] `natCumulativeClues` resets correctly in `natResetState()`

**LTTP:**
- [ ] Instruction strip visible on map pane; not visible on contacts pane
- [ ] Contacts tab pulse badge appears on `lttpShowChat()` load
- [ ] Contacts tab pulse badge disappears on first Contacts tab tap
- [ ] Role objective line renders correct text for all three roles
- [ ] Contact name column visually distinct from notes column
- [ ] Notes column has label or tint treatment; "No notes yet" placeholder still legible
- [ ] Free-text message input: Send disabled until non-empty
- [ ] Free-text message input: shake + red border on empty submit attempt
- [ ] Character counter increments live; turns red at ≤ 10 characters remaining
- [ ] Message text appears on handover screen in quotes
- [ ] "Read this message aloud, then hand over the phone." instruction present on handover screen
- [ ] Handover screen message block hidden during `lttpHandoverMode === 'role'`
- [ ] `lttpHistory` entries display correctly with `messageText` in chatlog preview and full history overlay
- [ ] `lttpSmallTalk` toggle removed from settings — no dead UI paths remain
- [ ] `lttpPendingTag`, `lttpSmallTalk` variables removed if no longer referenced

**Both games:**
- [ ] All modified screens retain `.btn-open-sound` + ✕
- [ ] No `text-center` on title block wrappers
- [ ] No new overlay deviates from the two established patterns (data slide-up or decision modal)
- [ ] `overscroll-behavior-y: none` in `:root` — pull-to-refresh no longer triggers

**Documentation:**
- [ ] `docs/code-map.md` updated per §4 (all 9 sub-items)
- [ ] `game-identities.md` updated per §5 (all 8 sub-items, excluding §5.7 pending name collision resolution)
- [ ] `CLAUDE.md` updated with Documentation Integrity Protocol per §6
- [ ] Naming collision from §5.7 resolved and confirmed with project owner before Field Notes implementation

---

## §8 — Phase 21a Documentation Deliverable

**`docs/phase21a-snapshot.md`** (new file, created at phase end)
- Format: identical to `docs/phase20-snapshot.md`
- Must document: all NAT changes, all LTTP changes, tie-breaker finding and resolution, message flow migration (tag → messageText), SmallTalk toggle removal decision, naming collision resolution, all code-map and game-identities corrections, any deviations from this brief with rationale
- This snapshot is the handoff document for Phase 21b

---

*Phase 21a complete when: all Protocol A checks pass, all documentation checks pass, `docs/phase21a-snapshot.md` is written and confirmed, and the project owner has play-tested updated NAT and LTTP.*

*Phase 21b (Multiplayer) begins immediately after.*
