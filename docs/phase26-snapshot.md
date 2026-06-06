# Phase 26 Snapshot — Studio Audit: Retrograde Fix + Polish Pass

**Date:** 2026-06-06
**SW Version:** v93
**Status:** Complete

---

## What This Phase Was

A retrograde standards pass applied to all 8 existing games (LI5, Great Minds, Secret Signals, JEC, YGI, LTTP, NAT, DSD). BLD development established several new project-wide standards that post-dated the original 8 game builds. Phase 26 backfills those standards across the entire suite to leave every game in a clean, consistent state for individual polish testing.

---

## Changes Applied

### 1. Decision Modal Borders (`index.html`)
Every `overlay-modal-inner` div across all 8 games now has `border border-[brand]-300`. This was a BLD-era standard that older games lacked.

Additionally, structural fixes for pre-standard modals:
- **LI5:** `li5-skip-turn-overlay` converted from old pattern (`bg-white rounded-2xl p-8 shadow-xl`) to standard `overlay-modal-inner bg-stone-50 w-full max-w-sm rounded-3xl px-6 pt-6 pb-8`; `li5-play-again-overlay` `bg-white` → `bg-stone-50`
- **GM:** `gm-boost-overlay`, `gm-neural-library-overlay`, `gm-new-frequency-overlay` — added missing `rounded-3xl` + `border border-purple-300`
- **SS:** `ss-override-overlay`, `ss-quit-overlay`, `ss-play-again-overlay` — full conversion from old pattern to standard
- **JEC:** `jec-oversight-overlay` — converted from `bg-white rounded-3xl shadow-xl` to standard
- **Global MP overlays (5):** `border border-stone-300` added

**Verified:** grep for `overlay-modal-inner` without `border border-` returns 0 matches. All 44 modal-inner divs across the codebase have the correct border class.

---

### 2. `[?]` Header Button Standardisation (`index.html` + JS files)

All 8 games' main gameplay screens now have `btn-[abbr]-how-to` wired to open the how-to overlay.

**Games that already opened how-to via class (added ID only):**
- GM: `btn-gm-how-to` added to `.btn-gm-help-open` button on `screen-gm-input`
- LTTP: `btn-lttp-how-to` added to `.btn-lttp-help-open` button on `screen-lttp-chat`
- NAT: `btn-nat-how-to` added to `.btn-nat-help-open` button on `screen-nat-observation`
- DSD: `btn-dsd-how-to` added to `.btn-dsd-help-open` button on `screen-dsd-captain`

**Games with contextual tip buttons (rewired to how-to):**
- LI5: `btn-li5-active-tip` → `btn-li5-how-to`; JS rewired to open `#how-to-overlay`
- SS: `btn-ss-encrypt-tip` → `btn-ss-how-to`; JS rewired to open `#ss-how-to-overlay`
- JEC: `btn-jec-prep-tip` → `btn-jec-how-to`; JS rewired to open `#jec-how-to-overlay`
- YGI: `btn-ygi-input-tip` → `btn-ygi-how-to`; JS rewired to open `#ygi-how-to-overlay`

**DSD crew screen:** `[?]` button added (was completely missing) — `btn-dsd-help-open` class, opens `dsd-how-to-overlay` via class handler.

**Note:** The `[abbr]ShowHelpTip()` functions and `[abbr]-help-tip-overlay` overlays in LI5/SS/JEC/YGI remain in the code but are no longer triggered from the gameplay screen header. They are inert dead code.

---

### 3. LI5 Scroll Reset Bug (`js/games/li5.js`)
`openSettings()` used `.overflow-y-auto` selector for scroll reset — this returns `null` silently since `.overlay-data-inner` has `overflow-y: auto` applied via CSS class, not Tailwind utility. Fixed to `.overlay-data-inner`.

---

### 4. Multiplayer `window.` Prefix Audit
Confirmed `window.syllyMultiplayerMode`, `window.syllySyncLocked`, and `window.mpLobbyStyle` are correctly `window.`-assigned in `engine-multiplayer.js` lines 9–13. Using `window.` prefix on these IS correct. `mpMyPlayerIdx` and `mpPlayerSlots` are `let`-declared (lines 26/30) — all game files access these bare (no `window.`) — confirmed correct.

---

## Files Modified
- `index.html` — modal borders, `[?]` button IDs, DSD crew `[?]` added
- `js/games/li5.js` — scroll reset selector fix + `btn-li5-how-to` rewire
- `js/games/secret-signals.js` — `btn-ss-how-to` rewire
- `js/games/jec.js` — `btn-jec-how-to` rewire
- `js/games/ygi.js` — `btn-ygi-how-to` rewire
- `sw.js` — v92 → v93
- `CLAUDE.md` — SW version + current focus updated

---

## What Was NOT Changed
- Toggle class audit (`sylly-toggle-on` → `game-toggle-on-[colour]`) — this was listed in the original plan but grep results showed no `sylly-toggle-on` usage across the 8 game files. The class may exist in CSS only, with no active HTML references to replace.
- Play-again confirmation modal audit — all 8 games already route through decision modals (NAT/DSD established in Phase 20; others confirmed).
- Multiplayer ACTION handler completeness — confirmed as a read-only review pass; no gaps found.

---

## State Going Forward
Every game in the suite now passes the Phase Gate protocol checks for:
- Decision modal visual standard
- `[?]` header button on main gameplay screen
- Settings scroll reset selector

Games are ready for individual polish testing sessions.
