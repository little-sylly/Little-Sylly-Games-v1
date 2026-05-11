# New Game Template — Little Sylly Games
**Purpose:** Fill this in completely before writing any code. A completed brief = 95% confidence threshold met = ready to implement.
**Reference:** `.claude/rules/logic-engine.md` § Checklist: Adding a New Game — tick each item as you build.

---

## How to Use

1. Copy this template to `docs/new-game-brief-[game-name].md`
2. Fill out every section — leave nothing blank; use "None" or "TBD" only if genuinely unknown
3. Review against `.claude/rules/game-identities.md` for tone + pattern consistency
4. Review against `.claude/rules/ui-style.md` for overlay pattern, menu structure, pill colour
5. Once complete, treat the brief as the spec — the implementation plan can reference it directly

---

# New Game Brief: [GAME NAME]

## 1. Mechanical Core
- **One-sentence hook:** [What do players do? What makes it tense/fun in one line?]
- **Player count:** [e.g. 3–8]
- **Round structure:** [e.g. 5 rounds, each with 2 phases]
- **Win condition:** [e.g. most Credibility at the end; or first to X points]
- **Session length:** [e.g. 15–30 min]

## 2. Thematic Vocabulary
Replace every generic term with a game-voiced equivalent. Plain English descriptions go in settings overlays.

| Generic term | Game term | Screen/context |
|---|---|---|
| Round | [e.g. "Habitat"] | shown on screen labels |
| Game over | [e.g. "Final Report"] | screen heading |
| Score | [e.g. "Credibility"] | tally + gameover |
| Play again | [e.g. "New Expedition"] | gameover button |
| Quit | [e.g. "Abandon the expedition?"] | quit overlay heading |
| Settings overlay title | [e.g. "The Permit Office 🦁"] | first child of overlay-data-inner |
| [add rows as needed] | | |

## 3. Lobby & Menu
- **Lobby button ID:** `#btn-[abbr]` (e.g. `#btn-nat`)
- **Brand colour (Tailwind):** e.g. `lime-600`
- **Active pill class:** `pill-active-[colour]` (e.g. `pill-active-lime`)
- **Play CTA label:** e.g. "Begin Observation" (shown on menu screen, 1–3 words + optional emoji)
- **Menu screen tagline:** [one line of flavour text under the game title]

## 4. State Flow
Map every screen in sequence. Use screen IDs (`screen-[abbr]-*`) from the start.

```
LOBBY → [ABBR] MENU → [ABBR] SETUP
→ [loop description]
→ [ABBR] GAMEOVER
```

**Screens to define** (add/remove as needed):
| Screen ID | Purpose |
|---|---|
| `screen-[abbr]-menu` | |
| `screen-[abbr]-setup` | |
| `screen-[abbr]-handover` | pass-the-phone gate (if needed) |
| `screen-[abbr]-[main-play]` | |
| `screen-[abbr]-[result]` | per-round score reveal |
| `screen-[abbr]-gameover` | |

## 5. Settings
Every setting needs: a thematic name (card heading), a plain-English description (card body), options, default, and internal variable.

| Setting | Options | Default | Internal value | Notes |
|---|---|---|---|---|
| [Difficulty — required] | Easy / Mixed / All | Mixed | `'d1'` / `'d1+d2'` / `'all'` | controls word tier |
| [Rounds / Length] | | | `[abbr]RoundsSetting` int | |
| [Other settings...] | | | | |
| ✨ Sylly Mode ([Theme Name]) | OFF / ON | OFF | `[abbr]SyllyMode` bool | always last |

## 6. State Variables
All variables must use the `[abbr]` prefix. List every variable with its type and default.

```js
// Settings (persist between games)
let [abbr]RoundsSetting = 3;
let [abbr]Difficulty    = 'd1+d2';
let [abbr]SyllyMode     = false;
// ... other settings

// Roster
let [abbr]PlayerCount = 4;
let [abbr]PlayerNames = [];

// Round state (reset each round)
let [abbr]CurrentRound = 0;
// ... etc
```

## 7. Scoring Logic
Define the complete scoring formula before writing any code.

| Outcome | Who scores | Points |
|---|---|---|
| [e.g. Mole not caught] | [e.g. The Mole] | [e.g. +natEscapePoints] |
| [outcome 2] | | |
| [tie-break rule] | | |

**Zero-sum check:** In a full game with N players, does the total points pool feel balanced? [Describe briefly]

## 8. Overlay Types
Only two patterns are allowed — data slide-up or decision modal. No exceptions.

| Overlay ID | Pattern | z-index | Opened by | Notes |
|---|---|---|---|---|
| `[abbr]-settings-overlay` | Data (slide-up) | z-[80] | `#btn-[abbr]-menu-settings` | |
| `[abbr]-how-to-overlay` | Data (slide-up) | z-[90] | `#btn-[abbr]-menu-how-to` | |
| `[abbr]-quit-overlay` | Decision modal | z-[80] | `.btn-[abbr]-quit-open` | |
| [other overlays] | | | | |

**Quit overlay copy:**
- Emoji: [game-themed emoji]
- Heading: [game-voiced heading, not "Quit game?"]
- Subtext: [what will be lost]
- Confirm: [themed confirm, e.g. "Yeah, pack up!"]
- Cancel: "Not yet!" or "Keep going!"

## 9. Sylly Mode Variant
If none, write "None" and skip.

**Name:** [e.g. "Survival of the Fittest"]
**Mechanic:** [Plain English description — what changes from normal play?]
**Screens added/changed:** [list any new screens or modified flows]
**Scoring impact:** [does Sylly Mode change how points work?]

## 10. New Game Checklist
Reference: `.claude/rules/logic-engine.md` § Checklist: Adding a New Game

- [ ] `js/games/[game-name].js` created
- [ ] `<script>` tag added to `index.html` (after `engine.js`, before `secret-mode.js`)
- [ ] All screen IDs added to `allScreens[]` in `engine.js`
- [ ] All overlay HTML added to `index.html` before `<script>` tags
- [ ] `.btn-open-sound` + ✕ on every screen
- [ ] `activeGameId = '[abbr]'` set in lobby button listener
- [ ] Game teardown added to `resetToLobby()` in `engine.js`
- [ ] Lobby button → game menu screen (not directly into setup)
- [ ] Game menu: Play CTA, How to Play, Settings, ← Back to the Box
- [ ] Settings: difficulty first, ✨ Sylly Mode last; every setting in a white card
- [ ] Both overlay patterns used correctly; thematic title block + scrollTop = 0 on open
- [ ] Quit overlay matches Quit Overlay Checklist in `ui-style.md`
- [ ] Exit routing: mid-game ✕ → quit overlay → menu; post-game ✕ → `resetToLobby()`
- [ ] `applyExpansionOverrides()` hook added at settings-apply point
- [ ] Secret Mode word pool substitution in `startGame()` and pool-refill path
- [ ] `sw.js` precache updated + SW version bumped
- [ ] Section header comment block added to `index.html`
- [ ] `docs/code-map.md` updated with new game section
- [ ] `docs/phase[N]-snapshot.md` written at phase completion
