# New Game Technical Spec — Bailed
**Document type:** Phase 2 — Technical Specification
**Who fills this in:** Claude Code, after reading the Phase 1 brief and all rule files
**Status:** DRAFT — awaiting confirmation before implementation begins

---

## Consistency Audit

| Check | Finding |
|-------|---------|
| Terminology collisions with existing 8 games? | None. "The Plan", "The Group", "The Planner", "The Itinerary", "The Patience Meter", "The Pot-Stirrer", "The Big Flake", "The Aftermath", "I'm In", "I Bailed", "Not Them" — all clear. |
| Brand colour `pill-active-yellow` exists in `css/styles.css`? | **NO** — `pill-active-yellow` and `game-toggle-on-yellow` are both missing. Must be added before implementation. |
| Abbreviation `bld` conflicts with any existing prefix? | No. Existing prefixes: `li5`, `gm`, `ss`, `jec`, `ygi`, `lttp`, `nat`, `dsd`. `bld` is clear. |
| Screen IDs conflict with existing `allScreens[]`? | No `screen-bld-*` entries exist. All clear. |
| New data file needed? | No — all phrase content is hardcoded constants in the plugin. First Little Sylly game with no data file dependency. |
| Engine functions reusable? | `normaliseWord()` — not needed (no text matching). `showWhoFirst()` — not used (no competing teams at game start; first Planner assigned randomly within `bldStartGame()`). No other engine reuse. |

**Flags:**
- `pill-active-yellow` and `game-toggle-on-yellow` must be added to `css/styles.css` before first screen can be verified
- Play CTA label needs confirmation — see §16 Clarification #1

---

## §1 — Identity

| Field | Value |
|-------|-------|
| Full name | Bailed |
| Short ID / abbreviation | `bld` |
| Plugin file | `js/games/bld.js` |
| Brand colour (Tailwind class) | `yellow-500` |
| Active pill class | `pill-active-yellow` — **does not exist, must be added to `css/styles.css`** |
| Game toggle class | `game-toggle-on-yellow` — **does not exist, must be added to `css/styles.css`** |
| Lobby button ID | `#btn-bld` |
| Play CTA label | **[CLARIFICATION NEEDED — see §16 #1]** — recommend "Make the Plans 💬" |
| Menu screen tagline | *"Making plans is easy. Showing up is hard."* |

---

## §2 — State Flow

```
LOBBY → BLD MENU
→ BLD SETUP (PTP only — MDLM uses shared lobby → role reveal direct)
→ BLD PASS GATE (PTP: before each player's role reveal; fires N times)
→ BLD ROLE REVEAL (PTP: one player at a time; MDLM: simultaneous on each device)
→ BLD MAIN [game loop sub-states: see below]
→ BLD AFTERMATH [sub-states: drama-identification (Drama Mode only) → roles-revealed]
```

**Sub-states within `screen-bld-main`** (driven by `bldGamePhase`):

| Sub-state | Description |
|-----------|-------------|
| `'nominating'` | Planner selects group; others see waiting state |
| `'voting'` | All players submit vote privately |
| `'vote-pending'` | All devices covered/dimmed; waiting for readyCheck |
| `'vote-result'` | Per-player votes revealed by name; Planner or Patience Meter updates |
| `'mission'` | Nominated players submit cards; others see waiting state |
| `'mission-pending'` | Nominated devices dimmed; waiting for readyCheck |
| `'plan-result'` | Bail count + rotating phrase + Itinerary update |
| `'drama-lock'` | Drama Mode only: all devices locked "The Flakes are plotting…"; Big Flake sees identification grid |

**Sub-states within `screen-bld-aftermath`** (driven by `bldAftermathPhase`):

| Sub-state | Description |
|-----------|-------------|
| `'drama-identification'` | Drama Mode only — shown before roles reveal; Big Flake's guess result displayed |
| `'roles-revealed'` | All roles shown; team result declared; play-again and exit options visible |

**Pass-the-phone gate points:**

| Transition | Gate type | Screen / Overlay |
|-----------|-----------|-----------------|
| Before each player's role reveal (PTP only) | Full-screen gate | `screen-bld-pass-gate` → `screen-bld-role-reveal` |
| Before each player's vote submission (PTP only) | Decision modal overlay on main screen | `bld-pass-reveal-overlay` |
| Before each nominated player's mission card (PTP only) | Decision modal overlay on main screen | `bld-pass-reveal-overlay` (same overlay, different heading) |

**`showWhoFirst()` — NOT used.** Bailed has no competing teams at game start. First Planner is randomly selected in `bldStartGame()`.

---

## §3 — Screen Registry

All IDs must be added to `allScreens[]` in `engine.js`.

| Screen ID | Purpose | Notes |
|-----------|---------|-------|
| `screen-bld-menu` | Game menu | Standard 4-button layout |
| `screen-bld-setup` | Player name entry | PTP mode only; MDLM uses shared lobby |
| `screen-bld-pass-gate` | Full-screen pass-gate | PTP only — before role reveal at game start |
| `screen-bld-role-reveal` | Private role card display | PTP: shown one player at a time; MDLM: simultaneous on each device |
| `screen-bld-main` | Persistent game board | Entire game loop runs here via `bldGamePhase` sub-states |
| `screen-bld-aftermath` | End-of-game screen | Result + role reveal; Drama Mode identification first |

**Total new screens: 6** — add all to `allScreens[]` in `engine.js`.

No team setup screens — Bailed has individual players with hidden roles, not named competing teams.

---

## §4 — State Variables

```javascript
// ── Settings (persist between play-agains) ──────────────────────────────────
let bldDramaMode = false; // Drama Mode (Sylly Mode) — the only setting

// ── Roster (set in setup, persist across play-agains) ──────────────────────
let bldPlayerCount = 5;   // 5–10
let bldPlayerNames = [];  // string[], length = bldPlayerCount

// ── Game state (reset each play-again in bldResetState()) ─────────────────
let bldPlanTrack    = [null, null, null, null, null]; // null | 'success' | 'fail'
let bldSuccessCount = 0;
let bldFailCount    = 0;
let bldCurrentPlanIdx          = 0; // 0–4
let bldCurrentNominationAttempt = 0; // 1–5 (Patience Meter count for current plan)
let bldCurrentPlannerIdx       = 0; // index into bldPlayerNames
let bldFirstPlannerIdx         = 0; // randomly chosen at game start
let bldGameResult              = null; // null | 'friends' | 'flakes'
let bldDramaGuessResult        = null; // null | 'correct' | 'wrong' — Drama Mode only
let bldPlanHistory             = []; // array of plan attempt records (Plan Detail panel)

// ── Role assignment (set once at bldStartGame(), never mutated) ────────────
let bldFlakeIndices  = []; // player indices assigned as Flakes
let bldPotStirrerIdx = -1; // index of Pot-Stirrer player (-1 if Drama Mode off)
let bldBigFlakeIdx   = -1; // index of Big Flake player (-1 if Drama Mode off)

// ── Nomination / round state (reset each nomination attempt) ───────────────
let bldNominatedGroup = []; // player indices currently nominated
let bldVotes          = {}; // { playerIdx: "I'm In" | "Not Them" }
let bldVoteReady      = []; // N booleans — readyCheck for voting phase
let bldMissionCards   = {}; // { playerIdx: "I'm In" | "I Bailed" }
let bldMissionReady   = []; // sized to bldNominatedGroup.length — readyCheck

// ── PTP-only state ─────────────────────────────────────────────────────────
let bldPtpPhase       = null; // 'vote' | 'mission' — which PTP pass-gate is active
let bldPtpQueue       = []; // ordered player indices for current PTP phase

// ── UI / phase state ───────────────────────────────────────────────────────
let bldGamePhase     = null; // see sub-states in §2
let bldAftermathPhase = null; // 'drama-identification' | 'roles-revealed'

// ── MDLM: this device's player identity ───────────────────────────────────
let bldMyPlayerIdx = -1; // set from mpMyPlayerIdx at game start in Lobby Mode
let bldMyRoleData  = null; // { role, flakeNames?, isBigFlake? } — from Firebase roleData
```

**Variables derived at runtime (never stored):**
- `bldFlakeCount` — from `BLD_ROLE_TABLE[bldPlayerCount].flakes`
- `bldGroupSize` — from `BLD_GROUP_TABLE[bldPlayerCount][bldCurrentPlanIdx]`
- `bldBailsRequired` — `1`, except Plan 4 (`bldCurrentPlanIdx === 3`) at `bldPlayerCount >= 7`: `2`
- `bldIsPlannerMe` — MDLM: `bldCurrentPlannerIdx === bldMyPlayerIdx`
- `bldIsNominatedMe` — MDLM: `bldNominatedGroup.includes(bldMyPlayerIdx)`
- `bldAmFlake` — MDLM: derived from `bldMyRoleData.role === 'Flake'`

**Hardcoded constants (top of plugin file):**

```javascript
const BLD_ROLE_TABLE = {
  5: { friends: 3, flakes: 2 },
  6: { friends: 4, flakes: 2 },
  7: { friends: 4, flakes: 3 },
  8: { friends: 5, flakes: 3 },
  9: { friends: 6, flakes: 3 },
  10: { friends: 6, flakes: 4 },
};

const BLD_GROUP_TABLE = {
  5:  [2, 3, 2, 3, 3],
  6:  [2, 3, 4, 3, 4],
  7:  [2, 3, 3, 4, 4],
  8:  [3, 4, 4, 5, 5],
  9:  [3, 4, 4, 5, 5],
  10: [3, 4, 4, 5, 5],
};

const BLD_PLANS = [
  { name: 'The Takeaway Run', emoji: '🍕' },
  { name: 'The Supply Run',   emoji: '🛒' },
  { name: 'The Setup Crew',   emoji: '🎂' },
  { name: 'The Booking',      emoji: '🏠' },
  { name: 'The Big Night',    emoji: '🎉' },
];

const BLD_FAIL_PHRASES = [
  // Plan 1
  ["Slept through my alarm 🙈","Not feeling it today, sorry","Stuck in traffic, don't wait","My phone died, just saw this","Running late... maybe 20 mins?","Just got out of the shower lol"],
  // Plan 2
  ["Something came up at work","My mum needs me rn","Forgot I had plans tonight 😬","Car's making a weird noise","Running 45 mins late... maybe an hour","Actually not sure I can make it"],
  // Plan 3
  ["My cat got stuck in a tree","Lost my keys, can't find them anywhere","Grabbing coffee with someone, might be a while 👀","There's a situation at home, can't explain","My neighbour locked themselves out and now I'm involved somehow","Long story but I'm stuck at my ex's","Was up late playing games, couldn't wake up on time"],
  // Plan 4
  ["There's a bird in my apartment and I genuinely cannot catch it","Accidentally booked the wrong suburb on my Uber","My dog ate my shoes. Both of them.","There's a possum on my balcony and I'm a little scared honestly","Long story but I'm somehow at the airport","I'm being very honest when I say I have no idea where I am right now","I accidentally took my sleeping pill instead of my vitamin.","Paint spill on the highway, there's green everywhere"],
  // Plan 5
  ["There was something in my building's elevator I cannot explain","My neighbour's pet fish had an emergency. Yes really.","I got accidentally locked inside a shopping centre","I genuinely cannot legally explain what happened","You wouldn't believe me if I told you","Okay so there was an elephant. At the bottle shop. I'm serious.","I'm not trying to be dramatic but I am currently trapped in a storage unit."],
];

const BLD_SUCCESS_PHRASES = [
  "A modern miracle. We actually went.",
  "Everyone showed up. Frame this moment.",
  "The group chat survived another day.",
  "Against all odds, the vibes were immaculate.",
  "No one flaked! Check the group's temperature.",
  "Somehow, it all came together.",
  "The Itinerary thanks you for your service.",
];
```

---

## §5 — Settings

**Settings overlay title block:**
```html
<h2 class="text-xl font-bold text-stone-800">Bailed 💬</h2>
<p class="text-xs text-stone-400 mt-1">Toggle Drama Mode on or off before play.</p>
```

**Settings table:**

| Setting (display) | Options | Default | Variable | Internal values |
|-------------------|---------|---------|----------|-----------------|
| ✨ Drama Mode — "Someone Always Knows" | OFF / ON | OFF | `bldDramaMode` | `bool` |

Drama Mode is both the Sylly Mode **and** the only setting. The settings overlay contains a single toggle card. No pill-group settings exist for this game.

**Plain-English description (shown on the toggle card):**
> "One Friend secretly knows all the Flakes — but can only hint, never name names. And if the Flakes figure out who they are, they win anyway."

**Locked/disabled settings in multiplayer:** None — Drama Mode works identically in both PTP and MDLM modes.

---

## §6 — Scoring Logic

No points. No individual scoring. Binary team result only.

**`bldGameResult` is set to `'friends'` or `'flakes'` by `bldCheckWinCondition()`.**

Win conditions (checked after each plan result and each nomination vote):

| Trigger | Result |
|---------|--------|
| `bldSuccessCount === 3` (and Drama Mode off, or Drama Mode guess resolved wrong) | `'friends'` |
| `bldFailCount === 3` | `'flakes'` |
| `bldCurrentNominationAttempt === 5` (5 consecutive rejections on one plan) | `'flakes'` — immediate, no plan executed |
| Drama Mode: `bldSuccessCount === 3` | Trigger Drama identification sequence before setting result |
| Drama Mode: Big Flake's guess matches `bldPlayerNames[bldPotStirrerIdx]` | `'flakes'` |
| Drama Mode: Big Flake's guess does NOT match | `'friends'` |

**Plan 4 Double-Bail rule:**
```javascript
function bldBailsRequired() {
  return (bldCurrentPlanIdx === 3 && bldPlayerCount >= 7) ? 2 : 1;
}
```

When exactly 1 bail on Plan 4 at 7+ players: plan survives. UI must show distinct intermediate state: *"Someone bailed, but the plan survived (1/2 bails)"* before waiting for the second card.

**Plan history record** (appended to `bldPlanHistory` after each nomination attempt resolves):
```javascript
{
  planNumber: 1,           // 1-indexed
  attemptNumber: 1,        // 1-indexed within the plan
  planner: "Mia",
  nominatedGroup: ["Mia", "Jake", "Sophie"],
  votes: { "Mia": "I'm In", "Jake": "I'm In", "Tom": "Not Them", ... },
  status: "Approved" | "Rejected"
  // missionResult only present when status === "Approved":
  bailCount: 1,            // number of "I Bailed" cards
  planOutcome: "success" | "fail" | "survived-one-bail"
}
```

---

## §7 — Validation Rules

All inputs are discrete button choices — no free-text validation required.

| Input | Block condition | Error message | Animation |
|-------|----------------|---------------|-----------|
| Nomination confirm | `bldNominatedGroup.length !== bldGroupSize` | "Pick exactly [N] people for this plan." | Shake on confirm button |
| Mission card (Friends) | Friend attempts to submit "I Bailed" | Not possible — "I Bailed" button is not rendered for Friends | N/A |

**Note:** The `bldGroupSize` must be shown clearly on the nomination screen so the Planner knows how many taps are needed.

---

## §8 — Overlay Registry

| Overlay ID | Pattern | z-index | Trigger | Notes |
|------------|---------|---------|---------|-------|
| `bld-settings-overlay` | Data (slide-up) | z-[80] | `#btn-bld-menu-settings` | Single toggle card (Drama Mode) |
| `bld-how-to-overlay` | Data (slide-up) | z-[90] | `#btn-bld-menu-how-to` | "The Group Rules 📋" |
| `bld-quit-overlay` | Decision modal | z-[80] | `.btn-bld-quit-open` | Mid-game ✕ only |
| `bld-second-chances-overlay` | Decision modal | z-[90] | `#btn-bld-go-again` on aftermath | Required — no direct restart |
| `bld-plan-detail-overlay` | Data (slide-up) | z-[80] | Tap any Itinerary plan box | "The Receipts" — most critical UI; see §12 |
| `bld-pass-reveal-overlay` | Decision modal | z-[90] | Fired programmatically (PTP only) | Voting and mission pass-gates during gameplay |

**Exact inner div class strings — use verbatim:**

Pattern 1 (data slide-up):
```html
<div class="overlay-data-inner settings-slide-up bg-stone-50 w-full max-w-sm rounded-t-3xl flex flex-col">
```

Pattern 2 (decision modal):
```html
<div class="overlay-modal-inner bg-stone-50 w-full max-w-sm rounded-3xl px-6 pt-6 pb-8 flex flex-col gap-4 text-center">
```

**Quit overlay copy:**
- Emoji: 💬
- Heading: "Leave the Chat?"
- Subtext: "The group will keep planning without you."
- Confirm: "Let's Bail"
- Cancel: "Not yet!"

**Play-again overlay copy:**
- Emoji: 💬
- Heading: "Second Chances?"
- Subtext: "Roles will be reshuffled. The group chat starts fresh."
- Confirm (single): "Second Chances 💬"
- Confirm (host): "Restart in Lobby 🔄"
- Confirm (client): "Leave Session"
- Cancel: "Stay here"

**Pass-reveal overlay copy (voting phase):**
- Heading: "[Player Name]'s turn."
- Subtext: "Don't look until it's yours."
- Button: "Tap to Vote"

**Pass-reveal overlay copy (mission phase):**
- Heading: "[Player Name]'s turn."
- Subtext: "Don't look until it's yours."
- Button: "Tap to Submit"

---

## §9 — Audio Map

| Game moment | Audio function |
|-------------|---------------|
| Game entry / play CTA tap | `playLaunch()` |
| Settings toggle | `playPillClick()` |
| Close overlay / confirm | `playDone()` |
| Destructive confirm (quit, leave) | `playExit()` |
| Nomination confirmed | `playLaunch()` |
| Vote submitted | `playDone()` |
| Mission card submitted | `playDone()` |
| Plan succeeds | `playSuccess()` |
| Plan fails | `playBoing()` |
| Patience Meter dot added (nomination rejected) | `playTick()` |
| 5th rejection — Flakes win immediately | `playAlarm()` |
| Role reveal card shown (tap to reveal in PTP) | `playWhoosh()` |
| Drama Mode lock triggers | `playExit()` |

No timer sounds — this game has no countdown timer.

---

## §10 — Word Bank & Data

**Source:** None. All content is hardcoded constants in `bld.js` (see `BLD_FAIL_PHRASES`, `BLD_SUCCESS_PHRASES`, `BLD_PLANS`, `BLD_ROLE_TABLE`, `BLD_GROUP_TABLE` in §4).

No data files. No Secret Mode word bank substitution required.

**`applyExpansionOverrides()` hook:** Must still be added at the settings-apply point (required by the new-game checklist). For Bailed, there are no overrideable word bank fields — the hook body can be a no-op but must be present for forward compatibility.

---

## §11 — Multiplayer Configuration

**Mode:** Individual Devices (MDLM recommended; PTP fallback)

**`MP_GAME_CONFIGS.bld` entry:**
```javascript
bld: {
  gameName:        'Bailed',
  emoji:           '💬',
  brandBtnClass:   'bg-yellow-500 hover:bg-yellow-600',
  ptpLabel:        '[PLAY CTA LABEL — see §16 #1]',
  menuScreen:      'screen-bld-menu',
  onPassThePhone:  () => bldShowSetup(),
  recommendedMode: 'mdlm',
  supportedModes:  ['ptp', 'mdlm'],
  multiplayerOnly: false,
  lobbyCtaLabel:   '[PLAY CTA LABEL — see §16 #1]',
  rosterConfig: { type: 'individual', showTeamNamesInPreLobby: false, defaultTeamNames: null, hasCaptain: false },
  getMaxPlayers: () => 10,
},
```

**Per-phase intercept points:**

| Game phase | Single-device behaviour | Multiplayer intercept |
|-----------|------------------------|----------------------|
| Game start | Host assigns roles; PTP pass-gate sequence begins | Host writes role data to `/rooms/{code}/players/{idx}/roleData` per player (targeted write); broadcasts `BLD_GAME_START` SYNC; all devices navigate to `screen-bld-role-reveal` and read their own role from Firebase |
| Nomination | Planner taps player list; others wait | Planner device renders nomination UI (`bldIsPlannerMe`); others show "Waiting for [Planner] to build the group..."; Planner confirms → `ACTION: BLD_NOMINATION_CONFIRMED`; Host validates group size + broadcasts `SYNC: BLD_NOMINATION_CONFIRMED` |
| Voting | PTP: `bld-pass-reveal-overlay` fires sequentially; players vote one at a time | All devices simultaneously show vote buttons; each player submits `ACTION: BLD_VOTE_SUBMIT`; `bldVoteReady[]` readyCheck; Host broadcasts `SYNC: BLD_VOTE_RESULT` when all submitted |
| Mission cards | PTP: `bld-pass-reveal-overlay` for nominated only; sequential | Nominated devices show "I'm In" / "I Bailed"; non-nominated show waiting; each nominated player submits `ACTION: BLD_MISSION_SUBMIT`; `bldMissionReady[]` readyCheck; Host broadcasts `SYNC: BLD_MISSION_RESULT` with bail count + plan outcome |
| Drama Mode endgame | Handled locally on single device | Host broadcasts `SYNC: BLD_DRAMA_IDENTIFICATION`; all devices show lock state; Big Flake device (`bldMyPlayerIdx === bldBigFlakeIdx`) shows identification grid; Big Flake submits `ACTION: BLD_DRAMA_GUESS`; Host resolves + broadcasts `SYNC: BLD_AFTERMATH` |
| Game over | Navigate to `screen-bld-aftermath` locally | `SYNC: BLD_AFTERMATH` payload carries `{ result, dramaGuessResult, planHistory }`; all devices navigate to aftermath screen |

**Private information routing:**

| Information | Written to |
|------------|-----------|
| Friend: role name only | `/rooms/{code}/players/{idx}/roleData: { role: 'Friend' }` |
| Flake: role + fellow Flake names | `/rooms/{code}/players/{idx}/roleData: { role: 'Flake', flakeNames: [...] }` |
| Pot-Stirrer: role + all Flake names | `/rooms/{code}/players/{idx}/roleData: { role: 'Pot-Stirrer', flakeNames: [...] }` |
| Big Flake: role + fellow Flake names + designation | `/rooms/{code}/players/{idx}/roleData: { role: 'Flake', flakeNames: [...], isBigFlake: true }` |

Each write targets only the matching player's Firebase slot. Other players cannot read other slots.

**readyCheck matrices (reset at start of each phase):**
```javascript
bldVoteReady   = new Array(bldPlayerCount).fill(false);          // voting phase
bldMissionReady = new Array(bldNominatedGroup.length).fill(false); // mission phase
```

Host advances when `.every(Boolean)`.

**Settings override in Lobby Mode:** None — Drama Mode works identically in both modes.

**`mpSerialiseSettings` entry:**
```javascript
case 'bld': return { bldDramaMode };
```

---

## §12 — Drama Mode Technical Spec

**Internal variable:** `bldDramaMode = false`

**What changes from standard play:**

1. **Role assignment:** `bldAssignRoles()` additionally assigns `bldPotStirrerIdx` (one Friend randomly upgraded to Pot-Stirrer) and `bldBigFlakeIdx` (one Flake randomly designated as Big Flake). Both indices are set at game start and never mutated.

2. **Role reveal card — Pot-Stirrer:** Shows role name "The Pot-Stirrer" + all Flake names (same discreet display as Flake cards). Note: *"You know who the Flakes are. Steer the group — without getting caught."*

3. **Role reveal card — Big Flake:** Shows role name "The Flake" + fellow Flake names + a secondary label: *"You're the Big Flake — if the Friends win, you get to name the Pot-Stirrer."*

4. **Win condition intercept:** In `bldCheckWinCondition()`, when `bldSuccessCount === 3 && bldDramaMode`, do NOT navigate to aftermath. Instead: set `bldGamePhase = 'drama-lock'` and trigger drama identification sequence.

5. **Drama lock state (main screen):** All action areas replace with "The Flakes are plotting..." locked state. Big Flake's device (`bldMyPlayerIdx === bldBigFlakeIdx`, or PTP: the device) renders a selectable player grid (all player names except Flakes themselves). All other devices are non-interactive.

6. **Big Flake submits guess:** In MDLM: `ACTION: BLD_DRAMA_GUESS { guessIdx: number }`; Host evaluates `guessIdx === bldPotStirrerIdx`; sets `bldDramaGuessResult`; broadcasts `SYNC: BLD_AFTERMATH`. In PTP: handled locally.

7. **Aftermath screen — Drama Mode:** Opens in `bldAftermathPhase = 'drama-identification'`. Shows guess result (correct / wrong) with dramatic reveal of who The Pot-Stirrer was. Then transitions to `'roles-revealed'`.

**Modified functions:** `bldAssignRoles()`, `bldCheckWinCondition()`, `bldShowAftermath()`, `bldStartNextPlan()`

**Edge cases:**
- 5-player Drama Mode: 2 Flakes (1 regular + 1 Big Flake) + 3 Friends (1 Pot-Stirrer + 2 regular). Minimum viable. ✓
- Flakes win before 3 successes: Drama Mode identification never triggers; `bldPotStirrerIdx` and `bldBigFlakeIdx` are unused but harmless.

---

## §13 — `resetToLobby()` Additions

```javascript
// Bailed teardown
document.getElementById('bld-quit-overlay').style.display            = 'none';
document.getElementById('bld-settings-overlay').style.display        = 'none';
document.getElementById('bld-how-to-overlay').style.display          = 'none';
document.getElementById('bld-second-chances-overlay').style.display  = 'none';
document.getElementById('bld-plan-detail-overlay').style.display     = 'none';
document.getElementById('bld-pass-reveal-overlay').style.display     = 'none';
if (typeof bldResetState === 'function') bldResetState();
```

---

## §14 — `index.html` Section Header

```html
<!-- ════ BAILED ════
     Screens : screen-bld-menu, screen-bld-setup, screen-bld-pass-gate,
               screen-bld-role-reveal, screen-bld-main, screen-bld-aftermath
     Overlays: bld-settings-overlay, bld-how-to-overlay, bld-quit-overlay,
               bld-second-chances-overlay, bld-plan-detail-overlay, bld-pass-reveal-overlay
  ════════════════════════════════════════════════════════════════════════════════════ -->
```

---

## §15 — Implementation Checklist

### CSS Prerequisites
- [ ] `pill-active-yellow` added to `css/styles.css` (match pattern of `pill-active-lime`)
- [ ] `game-toggle-on-yellow` added to `css/styles.css` (match pattern of `game-toggle-on-lime`)

### Foundation
- [ ] `js/games/bld.js` created with dependency comment + all constants (§4) at top
- [ ] `<script>` tag added to `index.html` after `dsd.js`, before `secret-mode.js`
- [ ] All 6 screen IDs added to `allScreens[]` in `engine.js`
- [ ] All overlay teardown added to `resetToLobby()` in `engine.js` (§13)
- [ ] Section header comment added to `index.html` (§14)
- [ ] `activeGameId = 'bld'` set in lobby button listener
- [ ] Lobby button (`#btn-bld`) → `screen-bld-menu`

### Game Menu
- [ ] Play CTA, How to Play, Settings, ← Back to the Box — all four present
- [ ] `playLaunch()` on play CTA

### Settings Overlay
- [ ] Single Drama Mode toggle card — no other settings
- [ ] Thematic title block as first child of `overlay-data-inner`
- [ ] `scrollTop = 0` on open (selector: `.overlay-data-inner`)
- [ ] Toggle uses `game-toggle-on-yellow` / `game-toggle-off`; `shrink-0` on button
- [ ] `applyExpansionOverrides()` hook present (no-op for this game)

### How-to Overlay
- [ ] "The Group Rules 📋" thematic title block + `scrollTop = 0` on open
- [ ] Plan team size table (§12 of brief) included
- [ ] Friends/Flakes count table (§2 of brief) included

### Screens — Menu / Setup
- [ ] `.btn-open-sound` + ✕ on every screen
- [ ] `screen-bld-setup` — player name inputs + live "X Flakes will be assigned" counter + [?] tap for role table
- [ ] `screen-bld-pass-gate` — "Don't look until it's yours" + "Tap to Reveal" button only
- [ ] `screen-bld-role-reveal` — role card display; CTA proceeds to next player or starts game

### Role Assignment (`bldAssignRoles()`)
- [ ] Shuffle player indices; assign Flake slots from `BLD_ROLE_TABLE`
- [ ] Remaining indices = Friends; first Friend in shuffled order becomes Pot-Stirrer if Drama Mode on
- [ ] First Flake in shuffled order becomes Big Flake if Drama Mode on
- [ ] First Planner = `bldFirstPlannerIdx = Math.floor(Math.random() * bldPlayerCount)`

### Main Screen
- [ ] Always-visible: Name & Role tag (top), Itinerary (5 plan boxes), Patience Meter (5 dots)
- [ ] Each Itinerary box is tappable → opens `bld-plan-detail-overlay`
- [ ] Context-sensitive action area updates per `bldGamePhase`
- [ ] Nomination: Planner sees tappable player list + group size indicator + confirm; others see waiting
- [ ] Nomination confirm: validates `bldNominatedGroup.length === bldGroupSize`; shake animation on fail
- [ ] Voting phase: all players see "I'm In" / "Not Them" buttons (PTP: behind pass-gate overlay first)
- [ ] Vote-pending: action area covered/dimmed for all players
- [ ] Vote result: per-player votes shown by name (not tallied) — e.g. "Tom: Not Them, Priya: I'm In"
- [ ] Vote result: if rejected, add Patience Meter dot + pass Planner; if 5 dots → Flakes win
- [ ] Mission phase: nominated see "I'm In" + (Flakes only) "I Bailed"; non-nominated see waiting
- [ ] Mission-pending: covered/dimmed for nominated players
- [ ] Plan result: bail count shown; Plan 4 at 7+ with 1 bail shows intermediate state; rotating phrase drawn from correct tier; Itinerary updates
- [ ] `bldCheckWinCondition()` called after every plan result and every 5th rejection
- [ ] Drama-lock state: all action areas replaced with "The Flakes are plotting…"; Big Flake sees player grid

### Plan Detail Overlay (`bld-plan-detail-overlay`)
- [ ] Shows all attempts for the tapped plan in sequence
- [ ] Each attempt shows: planner name, nominated group, per-player votes by name, status (Approved/Rejected), bail count + outcome if executed
- [ ] Clean, scannable layout — this is the most-referenced UI in the game

### PTP Pass-Reveal Overlay
- [ ] `bld-pass-reveal-overlay` fires before each player's vote in PTP voting phase
- [ ] Same overlay fires before each nominated player's mission card in PTP mission phase
- [ ] Heading and button label update per phase (§8)

### Aftermath Screen
- [ ] Shows complete Itinerary (all 5 plan boxes with ✅/❌)
- [ ] Shows team result: "The Friends pulled it off." / "The Flakes got away with it."
- [ ] Drama Mode: opens in `drama-identification` phase; shows Big Flake's guess + whether it was correct; then transitions to `roles-revealed` phase
- [ ] Roles revealed: all players listed with their role; Flakes in `text-yellow-500`; Pot-Stirrer highlighted if Drama Mode
- [ ] Play-again button (`#btn-bld-go-again`) → `bld-second-chances-overlay`
- [ ] Post-game ✕ → `playExit(); resetToLobby()`

### Overlays — Quit and Play-Again
- [ ] Quit overlay copy matches §8 (game-voiced)
- [ ] `bld-second-chances-overlay` — confirm fires `bldResetAndSetup()` (single) or `mpReturnToLobby()` (host) or `resetToLobby()` (client)
- [ ] Confirm button label updates dynamically on overlay open per multiplayer mode

### Multiplayer
- [ ] `bld` entry added to `MP_GAME_CONFIGS` in `engine-multiplayer.js`
- [ ] `case 'bld'` added to `mpSerialiseSettings()`
- [ ] All ACTION/SYNC packet handlers added to `mpHandleEnvelope()`:
  - `SYNC: BLD_GAME_START` — navigate to role reveal, read `roleData` from Firebase
  - `SYNC: BLD_NOMINATION_CONFIRMED` — update nominated group display on all devices
  - `ACTION: BLD_VOTE_SUBMIT` — host collects votes via `bldVoteReady[]`
  - `SYNC: BLD_VOTE_RESULT` — reveal all votes; update Patience Meter / advance plan
  - `ACTION: BLD_MISSION_SUBMIT` — host collects cards via `bldMissionReady[]`
  - `SYNC: BLD_MISSION_RESULT` — reveal bail count; update Itinerary
  - `SYNC: BLD_DRAMA_IDENTIFICATION` — all-device lock; Big Flake identification UI
  - `ACTION: BLD_DRAMA_GUESS` — host resolves guess
  - `SYNC: BLD_AFTERMATH` — navigate all devices to aftermath with result payload
- [ ] `btn-mp-action` class on all submittable action buttons
- [ ] Targeted Firebase writes for role data at game start (one write per player to their own slot)

### Service Worker
- [ ] `sw.js` precache updated — `js/games/bld.js` added
- [ ] SW version bumped

### Documentation
- [ ] `docs/code-map.md` updated with Bailed section (screens, overlays, key functions, ACTION/SYNC packet types)
- [ ] `game-identities.md` updated with full Bailed entry
- [ ] `CLAUDE.md` project structure map and current focus updated
- [ ] Phase snapshot written (`docs/phase26-snapshot.md`)

---

## §16 — Clarifications Required Before Implementation

| # | Question | Section affected | Default assumption if unanswered |
|---|----------|-----------------|----------------------------------|
| 1 | **Play CTA label.** Brief §11 uses "Let's Play!" generically. The project standard requires a game-voiced CTA. "Let's Bail" is already taken by the quit confirm button. Recommendation: **"Make the Plans 💬"**. Confirm or provide alternative before implementing the menu screen. | §1, §11, `MP_GAME_CONFIGS` | Use "Make the Plans 💬" |

---

## §17 — Deviations from Phase 1 Brief

| # | Brief said | Spec does instead | Reason |
|---|-----------|------------------|--------|
| 1 | §11 lists 6 "screens" with item 6 as "Role reveal at end" | Spec has 6 actual screens; end-of-game role reveal is a sub-state of `screen-bld-aftermath`, not a separate screen | A separate screen for this single moment would require extra `allScreens[]` registration and navigation logic for no user-visible benefit |
| 2 | §11 uses "Let's Play!" as the menu CTA | Flagged as clarification needed — see §16 #1 | "Let's Play!" is generic and conflicts tonally with a game where "Let's Bail" is the quit button |
| 3 | Brief implies `showWhoFirst()` might be used | Not used | Bailed has no competing teams requiring a pre-game order decision; first Planner is randomly assigned internally |
| 4 | Brief says "✨ Drama Mode toggle" on the game menu directly | Settings overlay (Pattern 1 data slide-up) with Drama Mode as sole toggle | Confirmed with user — follows project standard; Settings button on menu |
