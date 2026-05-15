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
- **Genre/Inspiration:** [e.g. deduction, word association, bluffing — or name similar games that inspired it]
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
  - Verify this class exists in `css/styles.css` — add it if missing. No SW bump required (styles.css is already precached).
- **Play CTA label:** e.g. "Begin Observation" (shown on menu screen, 1–3 words + optional emoji)
- **Menu screen tagline:** [one line of flavour text under the game title]

## 4. State Flow
Map every screen in sequence. Use screen IDs (`screen-[abbr]-*`) from the start.

```
LOBBY → [ABBR] MENU → [ABBR] SETUP
→ [loop description]
→ [ABBR] GAMEOVER
```

> **Team games:** Must call `showWhoFirst(config)` from engine.js for pre-game order selection. `screen-who-first` is already registered in `allScreens[]`. Do NOT create a custom initiative screen.
>
> **Team setup screens (2-screen pattern):** Screen 1 (`screen-[abbr]-setup`) = team names only. Screen 2 (`screen-[abbr]-players`) = team size pills + player name inputs + captain assignment. See `@ui-style.md` § Team Setup Screen Standard for the exact required structure (labels, placeholders, hint subtext).

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

> **Team games:** Also include `[abbr]TeamNames`, `[abbr]PlayerNames[team][]` (or equivalent per-team arrays), `[abbr]CurrentTeam` (0/1 index), and a captain/turn tracker if needed.

## 7. Scoring Logic
Define the complete scoring formula before writing any code.

| Outcome | Who scores | Points | Turn End? |
|---|---|---|---|
| [e.g. Mole not caught] | [e.g. The Mole] | [e.g. +natEscapePoints] | [Yes / No / conditional] |
| [outcome 2] | | | |
| [tie-break rule] | | | |

**Zero-sum check:** In a full game with N players, does the total points pool feel balanced? [Describe briefly]

## 8. Overlay Types
Only two patterns are allowed — data slide-up or decision modal. No exceptions.

| Overlay ID | Pattern | z-index | Opened by | Notes |
|---|---|---|---|---|
| `[abbr]-settings-overlay` | Data (slide-up) | z-[80] | `#btn-[abbr]-menu-settings` | |
| `[abbr]-how-to-overlay` | Data (slide-up) | z-[90] | `#btn-[abbr]-menu-how-to` | |
| `[abbr]-quit-overlay` | Decision modal | z-[80] | `.btn-[abbr]-quit-open` | |
| `[abbr]-new-[game]-overlay` | Decision modal | z-[90] | `#btn-[abbr]-go-new` on gameover | Required — no direct restart permitted |
| [other overlays] | | | | |

**Exact inner div class strings — copy these, do not improvise:**

Pattern 1 (data slide-up):
```html
<div class="overlay-data-inner settings-slide-up bg-stone-50 w-full max-w-sm rounded-t-3xl flex flex-col">
```

Pattern 2 (decision modal):
```html
<div class="overlay-modal-inner bg-stone-50 w-full max-w-sm rounded-3xl px-6 pt-6 pb-8 flex flex-col gap-4 text-center">
```
**Not** `bg-white`, **not** `shadow-xl`, **not** `p-8`, **not** `rounded-2xl` — all will fail the audit.

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

## 10. Design Notes
Capture anything that doesn't fit neatly into the sections above. Common candidates:

- Pass-the-phone flow (how the device physically moves between screens)
- Grid or board generation logic
- Validation rules (blocking inputs, guards, edge cases)
- Animation or audio notes (specific timings, new sounds needed)
- UI feedback during sequences or reveals
- Any mechanic that needs plain-English walkthrough before code

## 11. New Game Checklist
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
- [ ] `pill-active-[colour]` exists in `css/styles.css` — add if missing
- [ ] Both overlay patterns used correctly; thematic title block + `scrollTop = 0` on open
  - [ ] Scroll reset: `el.querySelector('.overlay-data-inner').scrollTop = 0` — never `.overflow-y-auto`
  - [ ] Title block: `<div class="px-5 pt-5 pb-4 border-b border-stone-200 flex-shrink-0">` — no `text-center`, `<h2>` not `<h3>`, subtitle `text-xs` not `text-sm`
  - [ ] Decision modal inner div: `overlay-modal-inner bg-stone-50 w-full max-w-sm rounded-3xl px-6 pt-6 pb-8 flex flex-col gap-4 text-center` — no `bg-white`, no `shadow-xl`
- [ ] Quit overlay matches Quit Overlay Checklist in `ui-style.md`
- [ ] Exit routing: mid-game ✕ → quit overlay → menu; post-game ✕ → `resetToLobby()`
  - [ ] Post-game ✕: unique ID `btn-[abbr]-gameover-exit` + listener `playExit(); resetToLobby()`
  - [ ] Play-again button shows `[abbr]-new-[game]-overlay` (z-[90]) — never resets state directly
  - [ ] `[abbr]-new-[game]-overlay` teardown added to `resetToLobby()` in `engine.js`
- [ ] All toggle handlers: both className values include `shrink-0` — `'game-toggle-on-[colour] shrink-0'` and `'sylly-toggle-off shrink-0'`
- [ ] All `setTimeout` calls have an inline WHY comment (not just what the callback does)
- [ ] `applyExpansionOverrides()` hook added at settings-apply point
- [ ] Secret Mode word pool substitution in `startGame()` and pool-refill path
- [ ] `sw.js` precache updated + SW version bumped
- [ ] Section header comment block added to `index.html`
- [ ] `docs/code-map.md` updated with new game section
- [ ] `docs/phase[N]-snapshot.md` written at phase completion

---

## 12. Implementation Patterns

Copy-paste-ready snippets for every pattern that caused repeated audit failures. Use these verbatim (substituting `[abbr]`/`[colour]` etc.) — do not improvise equivalents.

### 12.1 Toggle handler — `shrink-0` required in className
```js
const btn = document.getElementById('btn-[abbr]-[name]-toggle');
btn.textContent = isOn ? 'ON' : 'OFF';
btn.className   = isOn ? 'game-toggle-on-[colour] shrink-0' : 'sylly-toggle-off shrink-0';
```
**Why:** `className =` overwrites the entire class list — `shrink-0` in the HTML is gone the moment this runs. It must be in the assigned string or toggles will flex-compress when their label is long.

---

### 12.2 Settings / how-to open function
```js
function [abbr]OpenSettings() {
  const el = document.getElementById('[abbr]-settings-overlay');
  el.querySelector('.overlay-data-inner').scrollTop = 0; // reset scroll before show
  el.style.display = 'flex';
}
```
**Why:** `.overlay-data-inner` gets `overflow-y: auto` from its CSS class, not from a Tailwind utility. `.overflow-y-auto` returns `null` silently — the scroll never resets and the title block is not the first thing seen.

---

### 12.3 Speaker + ✕ on every screen

**Sticky-footer screen (h-screen layout) — header row:**
```html
<div class="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
  <button class="btn-[abbr]-quit-open w-10 h-10 flex items-center justify-center text-stone-500 font-bold text-xl active:scale-90 transition-transform duration-100">✕</button>
  <p class="text-stone-400 text-xs font-semibold uppercase tracking-widest">[Screen label]</p>
  <button class="btn-open-sound text-xl text-stone-400 active:scale-90 transition-transform duration-100">🔊</button>
</div>
```

**Centred-content screen (min-h-screen layout) — absolute positioned (add `relative` to section):**
```html
<div class="absolute top-4 right-4 flex items-center gap-2">
  <button class="btn-open-sound text-xl text-stone-400 active:scale-90 transition-transform duration-100">🔊</button>
  <button class="btn-[abbr]-quit-open w-10 h-10 flex items-center justify-center text-stone-500 font-bold text-xl active:scale-90 transition-transform duration-100">✕</button>
</div>
```

---

### 12.4 Post-game ✕ on gameover screen

```html
<!-- In gameover header — post-game ✕ goes directly to lobby, NOT via quit overlay -->
<button id="btn-[abbr]-gameover-exit"
  class="w-10 h-10 flex items-center justify-center text-stone-500 font-bold text-xl active:scale-90 transition-transform duration-100">✕</button>
```
```js
document.getElementById('btn-[abbr]-gameover-exit')?.addEventListener('click', () => {
  playExit(); resetToLobby();
});
```

---

### 12.5 Play-again modal — full HTML
```html
<div id="[abbr]-new-[game]-overlay" style="display:none"
  class="fixed inset-0 bg-black/40 z-[90] flex items-center justify-center px-6">
  <div class="overlay-modal-inner bg-stone-50 w-full max-w-sm rounded-3xl px-6 pt-6 pb-8 flex flex-col gap-4 text-center">
    <p class="text-5xl">[emoji]</p>
    <div>
      <h2 class="text-xl font-bold text-stone-800">New [Game]?</h2>
      <p class="text-stone-400 text-sm mt-1">[What resets — e.g. "Pack up camp and start fresh."]</p>
    </div>
    <div class="flex flex-col gap-2">
      <button id="btn-[abbr]-new-confirm"
        class="min-h-14 w-full rounded-2xl bg-[brand] hover:bg-[brand-dark] active:scale-95 text-white text-lg font-semibold transition-all duration-150">
        [Themed confirm label]
      </button>
      <button id="btn-[abbr]-new-cancel"
        class="min-h-11 w-full rounded-2xl bg-stone-200 hover:bg-stone-300 active:scale-95 text-stone-500 text-base font-medium transition-all duration-150">
        Stay here
      </button>
    </div>
  </div>
</div>
```
Also add to `resetToLobby()` in `engine.js`:
```js
document.getElementById('[abbr]-new-[game]-overlay').style.display = 'none';
```

---

### 12.6 setTimeout — WHY comment required
```js
// Every setTimeout must have an inline comment explaining WHY the delay is necessary:
setTimeout(() => { ... }, 300); // 300ms matches card-exit animation before new word loads

// NOT just "waits before doing X" — explain the constraint that forces the delay
```

---

### 12.7 Settings title block — exact HTML
```html
<div class="px-5 pt-5 pb-4 border-b border-stone-200 flex-shrink-0">
  <h2 class="text-xl font-bold text-stone-800">[Game Name] [emoji]</h2>
  <p class="text-xs text-stone-400 mt-1">[One-line game-voiced subtitle.]</p>
</div>
```
**Not** `text-center` (left-aligned matches card content below). **Not** `<h3>`. Subtitle **not** `text-sm` — must be `text-xs`.
