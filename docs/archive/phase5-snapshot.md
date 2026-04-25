# Phase 5 Confluence Snapshot — "Don't Say Those Words" Gold Master
_Recorded before transition to Gamebox architecture._

---

## Section 1 — Final Feature Set

### Word Bank
- **~358 words** across **16 categories** (verified count; not 450+)
- Categories: Animals, Food, Places, Objects, Sports, Nature, Vehicles, Jobs, Activities, Music, Pop Culture, People, Brands, Emotions, Actions, Aussie Slang
- Schema: `{ id, word, nono_list, category, difficulty }` — `nono_list` (renamed from `taboo_list` for legal safety); difficulty 1–3
- `isSylly` is **not stored** — computed at runtime: `word.difficulty === 3`

### Hype Engine
- `HYPE_PHRASES[]` — pool of short celebration strings
- `lastHypeIdx` — prevents consecutive repeats (do-while pick)
- Triggers on every correct answer once team has 3+ streak (`currentStreak >= 3`)
- `animationend { once: true }` clears text after 1.4s `hypePop` animation
- Streak visual: `streak-fire-active` (orange glow) + `streak-fire-shake` (2× rattle)

### Justice Toggle (Post-Round Review)
- `settingCorrections` gate — review interactivity only if enabled in Settings
- `flipEntry(idx)`: triple-state for skips (`skip → correct → nono → skip`), binary for correct/nono
- `scoreBeforeTurn` snapshot used for recalculation after flip
- Visual cue: 🔄 badge + `row-edited` CSS class (`outline: 2px solid #f472b6`) — outline not border, avoids layout shift

### Onboarding
- `#how-to-overlay` — slide-up sheet, reuses `settings-slide-up` CSS class
- 3 content cards: Goal / Rules / Scoring
- Entry point: "How to Play" button between Let's Play and Settings in menu

### Deck Guard System
- Zero decks → blocked with sassy error message
- 1–2 decks → soft warning (amber), proceeds on second tap (`deckFewWarned` flag)
- `startGame()` has a defensive guard: `if (!settingPlayAllDecks && settingCategories.size === 0) return`

---

## Section 2 — Technical Specs

### PWA
- Service Worker: **v32** (`CACHE_NAME = 'sylly-games-v32'`)
- Strategy: cache-first for all same-origin requests
- Precached: `/, /index.html, /css/styles.css, /js/app.js, /js/lib/tailwind-play.js, /data/words.json, /manifest.json`
- Tailwind is a **local file** (`/js/lib/tailwind-play.js`) — no external CDN dependency, fully offline

### UX Safety
- `isProcessing` flag — 100ms debounce on all action buttons (correct/nono/skip)
- `#screen-active-play` — `padding-top: max(0.75rem, env(safe-area-inset-top))` for notch support
- `#active-word-card { min-height: 14rem }` — stability floor prevents button jump between words
- Screen Wake Lock API — active during ACTIVE_PLAY state

### Audio (Web Audio API — zero external assets)
| Event | Sound |
|---|---|
| Timer tick | Soft click, 1 Hz |
| Time warning (≤10s) | Faster ticks |
| Correct | Rising chime |
| No-No violation | Buzzer |
| Round end | Fanfare or deflate |
| Sylly ON/OFF | Distinct tones |
| Pill/button click | Short tap |

### File Structure (Actual — as of Phase 5)
```
/
├── index.html              # Single entry point
├── css/styles.css          # Custom styles (Tailwind overrides + animations)
├── js/app.js               # Entire game logic — state, UI, events, audio all in one file
├── js/lib/tailwind-play.js # Local Tailwind CDN (no network dependency)
├── data/words.json         # ~358 words, 16 categories
├── sw.js                   # Service Worker v32
├── manifest.json           # PWA manifest
└── docs/                   # (new) Architecture documentation
```
**Note:** `state.js`, `ui.js`, `audio.js` listed in CLAUDE.md are aspirational — everything is currently in `app.js`. Gamebox phase will split these properly.

---

## Section 3 — State Management

### Runtime State Variables (key ones)
```js
// Game flow
let currentScreen = 'screen-menu';
let gameWords = [];          // shuffled pool for this game
let currentWordIdx = 0;
let timeLeft = 60;
let currentRound = 1;
let totalRounds = 5;
let activeTeam = 0;          // 0 or 1

// Scoring
let scores = [0, 0];
let currentStreak = 0;
let scoreBeforeTurn;         // snapshot before applyAndAdvance, used by flipEntry

// Logging
let roundLog = [];   // [{ word, action, originalAction, isSylly, points }] — current turn
let matchLog = [];   // [{ round, team, teamName, entries }] — full game history

// Settings (persist across rounds)
let settingTimer, settingRounds, settingPenaltyMode, settingTimePenalty
let settingSkipFree, settingTabooCount, settingSylly, settingSyllyLevel
let settingCategories (Set), settingPlayAllDecks, settingCorrections
```

### Log Schema
```js
// roundLog entry (one per word attempted in a turn)
{ word: "Elephant", action: "correct", originalAction: "correct", isSylly: false, points: 1 }

// matchLog entry (one per completed turn)
{ round: 2, team: 1, teamName: "Team Chaos", entries: [ ...roundLog ] }
```

### How matchLog enables Match History screen
After each turn ends (`showRoundSummary()`), the current `roundLog` is pushed into `matchLog` with round/team metadata. The Match History screen (`#screen-history`) iterates `matchLog` to render per-turn cards — each card shows the team, words attempted, actions, and points. The Justice Toggle edits `roundLog` entries in-place; `matchLog` references the same objects so history auto-reflects corrections.

---

## Section 4 — Architectural Seam (Critical for Gamebox)

The current `app.js` contains two conceptually distinct layers that need splitting in Phase 6:

**Engine (game-agnostic — reusable across future word games):**
- Timer logic (`startTimer`, `stopTimer`, `timeLeft`)
- Score tracking (`scores[]`, `applyAndAdvance`)
- State machine (`showScreen`, screen transitions)
- Round/team cycling (`currentRound`, `activeTeam`, `totalRounds`)
- Audio primitives (`playCorrect`, `playBuzzer`, `playTick`)
- Settings persistence (all `setting*` variables)

**Content Layer (specific to "Don't Say Those Words"):**
- `gameWords[]` pool and `renderCurrentWord()`
- `nono_list` display and taboo-count setting
- `isSylly` multiplier logic
- `words.json` loading and category filtering
- Deck panel UI and category management

When building the Gamebox: the Engine becomes a shared parent. Each game "plugin" owns its Content Layer and calls Engine APIs.

---

## Offline Testing Checklist
- [ ] Load app in browser, confirm SW v32 registers (DevTools → Application → Service Workers)
- [ ] Verify all assets appear in Cache Storage under `sylly-games-v32`
- [ ] Disable network. Close and reopen tab. Confirm full load including category emojis
- [ ] Play a full round offline. Confirm audio fires, timer runs, streak animation triggers
- [ ] Confirm no console errors referencing external URLs
