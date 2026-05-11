# Phase 16b Architecture Snapshot — Little Sylly Games
**Phase:** Game 6 (Late to the Party — full build + Small Talk overlay redesign) | **Date:** May 2026 | **SW Version:** v74

This is the current gold master. Phase 13 snapshot remains at `docs/phase13-snapshot.md` for games 1–5.

**What changed from Phase 13:**
- **Game 6 (LTTP)** fully built: `js/games/lttp.js`, 9 screens, 7+ overlays
- **Small Talk Guided mode** redesigned (Phase 16b): `lttp-smalltalk-overlay` (tabbed slide-up) replaces linear full-screen flow
- `screen-lttp-smalltalk` now Pro-mode-only holding screen (ask phase + stamp row)
- **SW bumped** to v74 (`js/games/lttp.js` added to precache)

**Unchanged from Phase 13:** Engine, LI5, Great Minds, Secret Signals, JEC, YGI, Secret Mode. See `docs/phase13-snapshot.md` §2–13 for those sections. This snapshot only documents additions.

---

## 1. File Structure (updated)

```
js/engine.js                — Global engine (audio, navigation, reset, normaliseWord, sound overlay)
js/games/li5.js             — LI5 plugin (Like I'm Five — all state, logic, listeners)
js/games/great-minds.js     — Great Minds plugin (all state, logic, listeners)
js/games/secret-signals.js  — Secret Signals plugin (all state, logic, listeners)
js/games/jec.js             — Just Enough Cooks plugin (all state, logic, listeners)
js/games/ygi.js             — You Get It? plugin (all state, logic, listeners)
js/games/lttp.js            — Late to the Party plugin (all state, logic, listeners)  ← NEW
js/secret-mode.js           — Secret Mode: Konami gateway, Terminal, expansion proxy state
js/app.js                   — Bootstrapper (3 lines, no logic)
js/lib/tailwind-play.js     — Local Tailwind (offline)
css/styles.css              — Custom styles + overlay library classes
data/words.json             — ~433 words, 16 categories
data/secret_words.json      — Dota 2 expansion, 35 words, 5 categories
data/ygi-data.json          — You Get It? prompts, 55+ entries, {id, text, ringers[5]}
docs/code-map.md            — Surgical ID reference: all screens, overlays, buttons, functions per game
docs/phase16b-snapshot.md   — This file (current gold master)
docs/phase13-snapshot.md    — Phase 13 gold master (games 1–5 detail)
docs/expansion-guide.md     — Template + checklist for adding new expansion packs
docs/ygi-content-guide.md   — Content creation guide for You Get It? prompts + ringers
```

**Load order in `index.html`:**
```html
<script src="js/engine.js"></script>
<script src="js/games/li5.js"></script>
<script src="js/games/great-minds.js"></script>
<script src="js/games/secret-signals.js"></script>
<script src="js/games/jec.js"></script>
<script src="js/games/ygi.js"></script>
<script src="js/games/lttp.js"></script>
<script src="js/secret-mode.js"></script>
<script src="js/app.js"></script>
```

---

## 5. Universal Menu Standard (updated)

| Button        | LI5                | Great Minds        | Secret Signals     | JEC                | YGI                  | LTTP                  |
|---------------|--------------------|--------------------|--------------------|--------------------|----------------------|-----------------------|
| Play CTA      | Let's Play!        | Let's Play!        | Let's Play!        | Let's Cook!        | Show Your Take 🃏    | Find The Location!    |
| How to Play   | How to Play        | How to Play        | How to Play        | How to Play        | How to Play          | How to Play           |
| Settings      | Settings           | Settings           | Settings           | Settings           | Settings             | Settings              |
| Back to lobby | ← Back to the Box  | ← Back to the Box  | ← Back to the Box  | ← Back to the Box  | ← Back to the Box    | ← Back to the Box     |

---

## 14. PWA / Service Worker (updated)

**Current version:** v74 (`CACHE_NAME = 'sylly-games-v74'`)

**Precached assets:**
```
./, index.html, css/styles.css,
js/engine.js, js/games/li5.js, js/games/great-minds.js,
js/games/secret-signals.js, js/games/jec.js, js/games/ygi.js,
js/games/lttp.js, js/secret-mode.js, js/app.js,
js/lib/tailwind-play.js, data/words.json, data/secret_words.json,
data/ygi-data.json, manifest.json
```

---

## 15. Late to the Party Gold Master (`js/games/lttp.js`)

### Theme & Concept
Social deduction — the Inner Circle knows a secret address; the Stray doesn't. Players question each other over 4 Plans, narrowing locations and identities. The Stray must identify the address by the end of Plan 4.

**Brand colour:** `red-500`

### State Flow
```
LOBBY → LTTP MENU → LTTP SETUP
  → ROLE REVEAL (pass-gate handover, private per-player)
  → BRIEFING
  → [Plan loop (×4):
      HANDOVER → CHAT (active player's turn)
        → (Guided: lttp-smalltalk-overlay | Pro: lttp-confirm-overlay → screen-lttp-smalltalk)
        → lttpSelectPlayer() → MAP (auto-opens after selection)
        → repeat until lap complete (all players had one turn)
      → PLAN UPDATE (lttpNarrowHighlights, IC map narrows)]
  → GUESS PHASE (Plan 4):
      GUESS HANDOVER → per-player: [Stray = pin grid | IC/Joker = vote list]
      → GROUP GUESS (lttpGroupVote ON)
  → GAMEOVER (full reveal + Friendship Points)
```

### Screen IDs
| ID | Purpose |
|----|---------|
| `#screen-lttp-menu` | Title card + "Find The Location!" CTA |
| `#screen-lttp-setup` | Player count + names |
| `#screen-lttp-role-reveal` | Private role check — shown after pass-gate handover |
| `#screen-lttp-handover` | Pass gate between turns + plan-end transitions |
| `#screen-lttp-chat` | Main interrogation hub (active player's turn) |
| `#screen-lttp-smalltalk` | **Pro mode only** — "Ask your question!" holding screen + root stamp row |
| `#screen-lttp-guess` | Plan 4 vote + pin phase (pass-the-phone) |
| `#screen-lttp-group-guess` | Group Vote mode — shared guess reveal screen |
| `#screen-lttp-gameover` | Full reveal + Friendship Points tally |

### Overlays
| ID | Pattern | Notes |
|----|---------|-------|
| `#lttp-settings-overlay` | Data (slide-up) z-[80] | Settings |
| `#lttp-how-to-overlay` | Data (slide-up) z-[90] | How to Play |
| `#lttp-suspicion-overlay` | Data (slide-up) z-[80] | Dual-view: roster → folder (Contacts) |
| `#lttp-history-overlay` | Data (slide-up) z-[90] | Full chat history log |
| `#lttp-smalltalk-overlay` | Data (slide-up) z-[80] | **Guided mode only** — tabbed topic picker |
| `#lttp-confirm-overlay` | Decision modal z-[80] | **Pro mode only** — "Send a message to [Name]?" |
| `#lttp-quit-overlay` | Decision modal z-[80] | Quit confirm |

### Settings
| Setting | Options | Default | Internal value |
|---------|---------|---------|----------------|
| Players | 3–6 | 4 | `lttpPlayerCount` |
| Difficulty | Local / Secret | Local | `'local'` / `'secret'` |
| Joker Mode | OFF / ON | OFF | `lttpJokerMode` bool |
| Group Vote | OFF / ON | ON | `lttpGroupVote` bool |
| Small Talk | Guided / Pro | Guided | `lttpSmallTalk` bool (true = Guided) |

### Key State Variables
```js
// Roles & grid
let lttpPlayerNames   = [];
let lttpStrayIdx      = -1;
let lttpJokerIdx      = -1;        // -1 when Joker Mode off
let lttpGridLocations = [];        // [string × 16] all map cells
let lttpAddressIdx    = -1;        // index of the real address
let lttpHighlights    = new Set(); // grid indices currently shown to IC
let lttpFadedCells    = new Set(); // ruled-out from previous plans
let lttpFakeTargets   = [];        // [idx, idx] — Joker's 2 decoy targets

// Round / lap
let lttpPlan          = 0;         // 1–4
let lttpActiveIdx     = -1;        // who holds the phone right now
let lttpLapAnswered   = new Set(); // player indices who've had the phone this lap
let lttpHandoverMode  = 'chat';    // 'role' during reveals | 'chat' during play

// Per-session
let lttpHistory      = [];         // [{asker, asked, plan, tag}]
let lttpNotes        = {};         // {playerIdx: string} — scratchpad
let lttpSuspicionMap = {};         // {playerIdx: 'none'|'safe'|'sus'|'joker'}
let lttpAnnotations  = {};         // {gridIdx: 'none'|'green'|'red'} — Stray only

// Vote / endgame
let lttpGuessOrder   = [];
let lttpGuessStep    = 0;
let lttpVotes        = {};         // {voterIdx: guessPlayerIdx}
let lttpStrayPin     = -1;         // grid index pinned by Stray
let lttpPlanLog      = [];         // [{plan, highlights: [...]}] for gameover carousel
let lttpPlanLogIdx   = 0;

// Small Talk turn state
let lttpPendingTarget  = -1;       // player index awaiting confirm/send
let lttpPendingTag     = null;     // {root, emoji, label} | null
let lttpFolderPlayerIdx = -1;      // currently open folder
let lttpFolderHintIdx  = 0;        // cycles placeholder hints
```

### Small Talk Mechanic

Controlled by the **Small Talk** setting (`lttpSmallTalk`). Two modes:

**Guided (ON) — `lttpSmallTalk === true`:**
- Tapping a player name opens `lttp-smalltalk-overlay` directly via `lttpOpenSmallTalkOverlay(targetIdx)`
- Tab bar: What? / When? / How? / Why? (rendered from `LTTP_SMALL_TALK` keys)
- Each tab shows 3 sub-topic pill buttons (emoji + label)
- Selecting a sub-pill highlights it red and activates "Send it 📨"
- Player can switch tabs freely — selection persists as `lttpPendingTag = {root, emoji, label}` until send or cancel
- ✕ closes overlay, clears `lttpPendingTag` + `lttpPendingTarget`, no turn advance
- On "Send it 📨": `lttpSelectPlayer(lttpPendingTarget, lttpPendingTag)`
- History feed shows: `· What → 👔 Wear` (root + emoji + label)

**Pro (OFF) — `lttpSmallTalk === false`:**
- Tapping a player name opens `lttp-confirm-overlay` ("Send a message to [Name]?")
- On confirm: `screen-lttp-smalltalk` shows (ask phase: "Ask your question!" + stamp row)
- Player stamps which root they asked (What/When/How/Why) then confirms done
- History feed shows: `· How` (root only, no sub-topic detail)
- `lttpSelectPlayer(targetIdx, { root })` called after stamp

**`LTTP_SMALL_TALK` constant:**
```js
const LTTP_SMALL_TALK = {
  What: [{ emoji: '👔', label: 'Wear'      }, { emoji: '🎒', label: 'Items'     }, { emoji: '🎨', label: 'Sights'   }],
  When: [{ emoji: '⌚', label: 'Arrival'   }, { emoji: '🚪', label: 'Departure' }, { emoji: '⏳', label: 'Duration' }],
  How:  [{ emoji: '🚗', label: 'Travel'    }, { emoji: '💰', label: 'Price'     }, { emoji: '🎟️', label: 'Access'   }],
  Why:  [{ emoji: '🍰', label: 'Vibe'      }, { emoji: '🎯', label: 'Reason'    }, { emoji: '👥', label: 'Crowd'    }],
};
```

### Role-Specific Map Behaviour
- **Stray:** All cells visible; tap to annotate Safe (green) / Dead End (red)
- **IC:** Red highlight cells narrowing each plan: 6→3→1
- **Joker:** Gold cell (real address) + purple cell (current decoy being planted)

### Contacts / Folder System
The 🕵️ button opens `lttp-suspicion-overlay` — dual-view panel: roster → individual folder.

**Status chips (per active player's role):**
- IC: None → ✅ Safe → ❓ Sus → 🃏 Joker → None
- Joker: None → ✅ Safe → ❓ Sus → None
- Stray (Joker Mode ON): None → 🃏 Joker → None
- Stray (Joker Mode OFF): status section hidden

Status colour chips also appear inline on the chat player list — no need to open Contacts to see current assessments.

**Rotating folder hints:** 6 phrases per role, `lttpFolderHintIdx` cycles via modulo on each folder open.

### Map Narrowing (`lttpNarrowHighlights`)
- Plan 1 → Plan 2: 6 highlighted cells → 3 (remove 3 random non-address cells)
- Plan 2 → Plan 3: 3 → 1 (remove 2 more, leaving only the real address)
- Plan 3 → Plan 4: 1 remains (no further narrowing)
- `lttpFadedCells` accumulates all removed indices for greyed-out display

### Win Condition Priority Cascade
1. **Joker Prank** — Stray pins a fake target → Joker wins (+20 Friendship Points)
2. **Stray Pin** — Stray pins correct address → Stray wins (+10 FP)
3. **Confusion Bonus** — more wrong IC votes than correct → Stray auto-wins
4. **IC wins** — Stray missed, no confusion → IC win (+5 FP each)

### Key Functions
| Function | Purpose |
|----------|---------|
| `lttpBuildGrid(allWords)` | Selects 16 places, sets address, seeds 6 highlights + Joker fake targets |
| `lttpAssignRoles()` | Random Stray + optional Joker assignment |
| `lttpStartGame()` | Full state reset → fetch words → build grid → assign roles → role-reveal |
| `lttpShowRoleReveal(idx)` | Role-aware private reveal screen |
| `lttpShowHandover(toIdx, msg)` | Pass gate — `msg` non-null triggers plan-transition text |
| `lttpShowChat(playerIdx)` | Main turn screen — renders player list + history feed + notes |
| `lttpOpenConfirmModal(targetIdx)` | Branches: Guided → `lttpOpenSmallTalkOverlay()`, Pro → `lttp-confirm-overlay` |
| `lttpOpenSmallTalkOverlay(targetIdx)` | Opens tabbed overlay, resets `lttpPendingTag`, renders tabs + first tab |
| `lttpRenderSmallTalkTabs()` | Renders tab bar from `LTTP_SMALL_TALK` keys |
| `lttpSnapToSmallTalkTab(root)` | Switches active tab (active/inactive class toggle), re-renders sub-pills |
| `lttpRenderSmallTalkSubs(root)` | Renders 3 sub-pill buttons; restores red highlight if `lttpPendingTag` matches |
| `lttpSelectPlayer(targetIdx, tag)` | Core lap logic — logs history, checks lap complete, routes; `tag` = `{root,emoji,label}` or `{root}` or null |
| `lttpNarrowHighlights()` | Narrows IC map each plan + logs snapshot to `lttpPlanLog` |
| `lttpOpenMapOverlay()` | Opens role-aware 4×4 map grid |
| `lttpOpenPlayerFolder(idx)` | Opens suspicion overlay at a specific player's folder |
| `lttpStartGuessPhase()` | Begins Plan 4 pass-the-phone vote/pin sequence |
| `lttpShowGuess(playerIdx)` | Role-aware — Stray renders pin grid, IC/Joker renders vote list |
| `lttpComputeAndShowGameover()` | Scores via priority cascade → gameover |
| `lttpRenderPlanLog()` | Plan log carousel (prev/next) on gameover screen |
| `lttpShowSmallTalk()` | Pro mode only — shows ask-phase screen + stamp row |
| `lttpShowSmallTalkAskPhase(tag)` | Pro mode only — renders prompt + stamp row |
| `lttpRenderStampRow()` | Renders 4 root stamp buttons (What/When/How/Why) |
| `resetLateToTheParty()` | Full teardown; called by `resetToLobby()` |

### Exit Routing
- Mid-game ✕ → `lttp-quit-overlay` → `screen-lttp-menu` (preserves names + settings)
- Post-game ✕ + "← Back to the Box" → `resetToLobby()`
