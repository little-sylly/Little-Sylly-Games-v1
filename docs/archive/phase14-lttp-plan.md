# Plan: Phase 14 — Game 6: Late To The Party (LTTP)

## Context
Phase 13 is complete with 5 stable games. Phase 14 adds Game 6: Late To The Party — a Spyfall-meets-Codenames social deduction game where one player (The Stray) must deduce the destination from a 4×4 grid by listening to the Inner Circle's evasive answers. The Inner Circle doesn't know the exact address until Plan 3 (highlights narrow 6→3→1 each lap), creating a three-way information asymmetry. Sylly Mode adds The Joker — a hidden traitor inside the Inner Circle with 2 fake targets.

**SW bump required:** v73 → v74 on deploy.

---

## Confirmed Design Decisions

| Decision | Choice |
|----------|--------|
| IC knowledge | **Subset only** — IC sees 6 highlighted locations in Plan 1; exact address revealed when highlights reach 1 in Plan 3 |
| Joker identity | **Hidden** from other IC members — secret traitor |
| Who votes | **Non-Stray players** vote for who they think is the Stray (excluding self); **Stray's "vote"** is their location pin — same pass-the-phone, role-aware action |
| Confusion Bonus | **Auto-win flag** — if `incorrectVotes > correctVotes`, Stray declared winner regardless of score |
| Map overlay pattern | Pattern 1 slide-up — more vertical space for 4×4 grid |
| Suspicion list | Pattern 2 modal — compact interactive list |
| Plan transition | Handover screen updated with "Plan X complete / The Pick narrows", no extra overlay |
| Pass mechanic | Active player asks → passes to that player |
| Notes | Private per-player scratchpad (`lttpNotes = {}` keyed by playerIdx) |
| Fake targets | Drawn from initial 6 highlights, excluding address index |
| +5 on Stray miss | Each Inner Circle player gets +5 |
| Plan 4 structure | Full questioning lap (same as Plans 1–3) THEN vote/pin phase (`screen-lttp-guess`) |
| Brand colour | red-500 (#ef4444) |
| Win condition priority | Joker Prank > Stray Pin > Confusion Bonus > IC wins |

---

## Files to Create / Modify

| File | Action |
|------|--------|
| `js/games/lttp.js` | **CREATE** — full game plugin |
| `index.html` | **MODIFY** — add 7 screens + 5 overlays + lobby button + `<script>` tag |
| `js/engine.js` | **MODIFY** — add 7 screen IDs to `allScreens[]`; add `resetLateToTheParty()` call in `resetToLobby()` |
| `css/styles.css` | **MODIFY** — add `.pill-active-red` |
| `sw.js` | **MODIFY** — add `js/games/lttp.js` to precache; bump `CACHE_NAME` → `'sylly-games-v74'` |
| `docs/code-map.md` | **MODIFY** — add LTTP section |

---

## Screens (7 new IDs → add to `allScreens[]`)

```
screen-lttp-menu         — title card + "Get the Address!" CTA
screen-lttp-setup        — player count + names
screen-lttp-role-reveal  — "Are you Late?" pass-the-phone role check (one per player)
screen-lttp-handover     — pass gate between turns + plan-end transitions
screen-lttp-chat         — main interrogation hub
screen-lttp-guess        — Plan 4 vote/pin: role-aware pass-the-phone action
screen-lttp-gameover     — full reveal + Friendship Points tally
```

## Overlays (5)

```
lttp-map-overlay          Pattern 1 slide-up  z-[95]  4×4 location grid (role-aware)
lttp-suspicion-overlay    Pattern 2 modal     z-[80]  player suspicion tracker
lttp-settings-overlay     Pattern 1 slide-up  z-[80]  game settings
lttp-how-to-overlay       Pattern 1 slide-up  z-[90]  how to play
lttp-quit-overlay         Pattern 2 modal     z-[80]  quit confirm
```

---

## Full Screen Flow

```
screen-lttp-menu
  ↓ "Get the Address!"
screen-lttp-setup  (player count + names)
  ↓ confirm
screen-lttp-role-reveal  [loop: 0 → N-1]
    Stray: "🚨 YOU ARE LATE." + plain grid
    IC:    "📍 Inner Circle." + 6 highlighted locations
    Joker: "🃏 You're The Joker." + 6 highlights + 2 fake targets (orange)
  ↓ all revealed → Plan 1
screen-lttp-handover  (pass gate, shows "Plan 1 — Pass to [Name]")
  ↓ I'm Ready
screen-lttp-chat  [loop: each player's turn in lap]
    header:       Plan N/4 · IT'S [NAME]'S TURN
    toolkit:      🗺️ (map modal)  🕵️ (suspicion modal)  🔊  ✕
    body:         player list (greyed = lttpLapAnswered)
    lower body:   📜 Group Chatlog + 📝 Notes
    tap a player → log to history → add to lttpLapAnswered
  ↓ lap complete (all others greyed)
    if Plan 1 or 2: lttpNarrowHighlights() → handover with "The Pick is narrowing..."
    if Plan 3:       handover with "Plan 3 complete → Final Plan begins"
    if Plan 4:       → screen-lttp-guess (vote/pin phase)
screen-lttp-guess  [loop: all N players in order from Player 0]
    Non-Stray:    "Who's Late?" + player list (excludes self) → tap to lock in vote
    Stray:        "Find the party." + 4×4 grid (annotations visible) → tap to pin
  ↓ all have acted
screen-lttp-gameover
    reveal: Stray's pin → real address → all votes → scores
    Plan log carousel (lttpPlanLog)
```

---

## State Variables (`lttp` prefix)

```javascript
// ── Settings (persists between games) ──────────────────────────────
let lttpPlayerCount  = 4;
let lttpDifficulty   = 'local';   // 'local' (d2 places) | 'secret' (d3 places)
let lttpJokerMode    = false;     // Sylly Mode

// ── Roles & Grid ────────────────────────────────────────────────────
let lttpPlayerNames   = [];        // [string × N]
let lttpStrayIdx      = -1;        // which player is The Stray
let lttpJokerIdx      = -1;        // which player is The Joker (-1 = none)
let lttpGridLocations = [];        // [string × 16] all map cells
let lttpAddressIdx    = -1;        // index of real address in lttpGridLocations
let lttpHighlights    = new Set(); // grid indices currently visible to IC
let lttpFakeTargets   = [];        // [idx, idx] Joker's 2 decoy indices
let lttpDecoys        = [];        // current non-address highlights

// ── Round / Lap ──────────────────────────────────────────────────────
let lttpPlan          = 0;         // 1–4
let lttpActiveIdx     = -1;        // who holds the phone
let lttpLapAnswered   = new Set(); // player indices who've had the phone this lap
let lttpHandoverMode  = 'chat';    // 'role' | 'chat' — controls handover screen routing

// ── Per-Session State ────────────────────────────────────────────────
let lttpHistory      = [];         // [{asker, asked, plan}]
let lttpNotes        = {};         // {playerIdx: string} — private per player
let lttpSuspicionMap = {};         // {playerIdx: 'none'|'safe'|'sus'|'joker'}
let lttpAnnotations  = {};         // {gridIdx: 'none'|'green'|'red'} — Stray only

// ── Vote / Endgame ───────────────────────────────────────────────────
let lttpGuessOrder    = [];        // player indices in guess phase order
let lttpGuessStep     = 0;         // current index into lttpGuessOrder
let lttpVotes         = {};        // {voterIdx: guessPlayerIdx} — non-Stray votes
let lttpStrayPin      = -1;        // grid index pinned by Stray
let lttpScores        = [];        // [number × N] final scores
let lttpPlanLog       = [];        // [{plan, highlights:[...]}] for gameover carousel
```

---

## Key Functions

### Setup
- `lttpBuildGrid()` — filter words.json places by difficulty, shuffle, take 16; set `lttpAddressIdx` (random); seed `lttpHighlights` (6 random including address); set `lttpFakeTargets` (2 random from `lttpHighlights` excluding address)
- `lttpAssignRoles()` — random `lttpStrayIdx`; if joker mode: random `lttpJokerIdx` (must differ from Stray)
- `lttpStartGame()` — call build + assign; reset round state; set `lttpHandoverMode = 'role'`; begin role reveal handover

### Role Reveal
- `lttpShowRoleReveal(idx)` — `screen-lttp-role-reveal`; role-aware content; "Got it →" calls `lttpShowHandover(next, "Everyone look away...")`; last player → sets `lttpHandoverMode = 'chat'`, shows Plan 1 handover

### Core Lap Loop
- `lttpShowHandover(toIdx, msg)` — `screen-lttp-handover`; `msg` is null (normal pass) or plan-transition string; "I'm Ready" routes to `lttpShowRoleReveal` or `lttpShowChat` based on `lttpHandoverMode`
- `lttpShowChat(playerIdx)` — `screen-lttp-chat`; update header, toolkit, player list, history, notes; bind tap-on-player → `lttpSelectPlayer(targetIdx)`
- `lttpSelectPlayer(targetIdx)` — push to history; add active to `lttpLapAnswered`; check lap complete (size === N-1):
  - Not complete: `lttpShowHandover(targetIdx, null)`
  - Complete + Plan < 4: `lttpNarrowHighlights()` → `lttpShowHandover(targetIdx, planMsg)`
  - Complete + Plan 4: `lttpStartGuessPhase()`
- `lttpNarrowHighlights()` — Plan 1→2: keep address + 2 random remaining decoys; Plan 2→3: keep address only; push snapshot to `lttpPlanLog`; increment `lttpPlan`; reset `lttpLapAnswered`

### Map Overlay (`lttp-map-overlay`)
- `lttpOpenMapOverlay()` — renders 4×4 grid role-aware for `lttpActiveIdx`; cell classes via `lttpCellClass(idx, role)`:
  - **Stray**: annotation-based (green/red/plain); tap cycles annotation
  - **IC**: `bg-red-100 text-red-800`; Plan 3 single → `bg-red-500 text-white font-bold ring-2 ring-red-700`
  - **Joker**: same as IC + address → gold (`bg-yellow-200 text-yellow-800 ring-2 ring-yellow-400`) + fakes → orange (`bg-orange-100 text-orange-700 ring-1 ring-orange-300`)

### Suspicion Modal (`lttp-suspicion-overlay`)
- `lttpOpenSuspicionOverlay()` — renders player list; tap cycles: `none` → `✅ safe` → `❓ sus` → `🃏 joker` → `none`; updates `lttpSuspicionMap`

### Guess Phase
- `lttpStartGuessPhase()` — build `lttpGuessOrder`; show first guess
- `lttpShowGuess(playerIdx)` — role-aware: Stray pins grid; non-Stray votes for a player; on submit advance `lttpGuessStep` or → `lttpComputeAndShowGameover()`

### Scoring (priority cascade)
```javascript
// 1. Joker Prank (highest priority)
if (jokerPrank) { scores[lttpJokerIdx] += 20; winner = 'joker'; }
// 2. Stray Pin
else if (pinCorrect) { scores[lttpStrayIdx] += 10; winner = 'stray'; }
// 3. Confusion Bonus
else if (confusionBonus) { winner = 'stray'; winReason = 'confusion-bonus'; }
// 4. IC wins
else { for IC: scores[i] += 5; winner = 'ic'; }

// Votes always apply regardless of winner
// correct vote: voter +2, Stray -2
// wrong vote:   voter -2, Stray +2
```

### Teardown
- `resetLateToTheParty()` — hide all 5 overlays; zero all state variables; preserve settings (`lttpPlayerCount`, `lttpDifficulty`, `lttpJokerMode`) + player names

---

## Settings

| Setting | Options | Default | CSS class |
|---------|---------|---------|-----------|
| Party Destination | Level 1 / Level 2 | Level 1 | `pill-active-red` |
| ✨ Sylly Mode (The Joker) | OFF / ON | OFF | toggle |

- **Level 1 ("The Local Hang")** — d2 places only
- **Level 2 ("The Secret Trip")** — d3 places only
- Settings overlay title: **"Frequency Configuration 🗺️"**; subtitle: *"Set the vibe before the Uber arrives."*

---

## Map Overlay Behaviour (Summary)

| Who | Plan 1 | Plan 2 | Plan 3 | Plan 4 |
|-----|--------|--------|--------|--------|
| Inner Circle | 6 cells red-100 | 3 cells red-100 | 1 cell red-500 + "DESTINATION CONFIRMED" | same as Plan 3 |
| Joker | IC highlights + gold address + 2 orange fakes | same (fakes may no longer be in IC subset) | 1 red-500 + 2 orange | same |
| Stray | 16 plain, annotatable | same | same | same |

---

## Verification Steps

1. Lobby → LTTP button visible; tap → LTTP menu
2. Settings: difficulty pill + Sylly Mode toggle fire correct audio
3. Setup: player count pill shows/hides name fields; names persist; confirm validates non-empty
4. Role reveal: sequential reveals with privacy handover between each; correct role shown per player; Joker sees gold address + orange fakes; last player → Plan 1 handover
5. Chat: active player labelled; greyed players non-tappable; tapping a player logs history + triggers handover; self is always greyed
6. Map overlay: IC sees correct count of highlights per plan; Plan 3 shows single bold-red "DESTINATION CONFIRMED" cell; Stray annotations persist across map opens; Joker sees gold address + orange fakes always
7. Suspicion modal: tap cycles status; persists across modal opens
8. Notes: textarea private per player (only visible to that player's active turn)
9. Plan transitions: after each lap, handover shows correct "Plan X complete" message; highlights correctly reduced; Plan 3 → Plan 4 correct message
10. Plan 4 guess phase: Stray sees grid; each IC player sees player list (self excluded); pin + votes all collected before gameover
11. Scoring: verify all outcomes (pin correct +10, pin wrong +5 IC each, correct vote ±2, wrong vote ±2, joker prank +20)
12. Confusion Bonus: if incorrectVotes > correctVotes, Stray declared winner on gameover
13. Quit from mid-game → quit overlay → game menu (not lobby); quit confirm does NOT call resetToLobby
14. resetToLobby from game menu → lobby; all overlays hidden; state zeroed; settings preserved
15. SW v74 served; full offline play after first load
