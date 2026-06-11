# Phase 31 Snapshot — Dicey Bluffs (DYB) shipped

**Date:** 2026-06-11
**Phase:** 31 — Dicey Bluffs (DYB) implementation + Protocol A closeout
**Status:** Complete — Protocol A clean, all doc updates done

---

## What was built

**Game 11: Dicey Bluffs (DYB)** — Liar's Dice with Chaos Mode. MDLM-only multiplayer, 3–8 players, pass-the-phone private rolls, escalating bids, Call Bluff! showdowns. New game added to the suite as `js/games/dyb.js`.

### Core mechanics
- Each player rolls a private hand of 3–5 dice (configurable). All rolls hidden until a Showdown.
- Players take turns making escalating Allegations — claims about how many of a given face exist across ALL dice on the table.
- Any player can Call Bluff! on the previous bid. Showdown reveals all hands; real count vs claimed count determines the loser.
- Loser loses 1 die. Reach 0 dice = eliminated. Last player standing wins.
- **Wildcards Style:** Strict (1s are just 1s) / Classic (1s count toward any bid) / Volatile (1s wild until someone bids 1s directly).
- **Chaos Mode (✨ Sylly Mode):** Each die has a `dybSyllyIntensity` % chance of becoming Slick — owner assigns its face privately via a picker overlay. Face is concealed from all other players until Showdown.

### Showdown animation
`dybRenderShowdownScreen(data, onDone)` — animated count-up (0 → real at 400ms/tick, `playTick()` per step), then `playBoing()` + verdict reveal + `onDone()` callback. Gameover flows are driven by the callback (1500ms post-reveal pause → gameover), not a fixed `setTimeout` from Showdown entry.

---

## Bugs resolved during Phase 31

**BUG-01:** `dybPlayerCount` not populated on client devices — `DYB_GAME_START` handler didn't assign it. Fixed: `dybPlayerCount = payload.playerNames.length` added to SYNC handler.

**BUG-02:** `DYB_SHAKE_ACTIVE` SYNC rerouted eliminated players back to the table immediately after `DYB_SPIRIT_SHAKE` sent them to the Spirit Board. Fixed: guard `if (!dybActivePlayers.includes(mpMyPlayerIdx)) return;` added to `DYB_SHAKE_ACTIVE` case.

**BUG-03 (Critical):** `dybResolveShowdown()` used `dybCurrentBidderIdx` as the last bidder, but that variable had already advanced to the challenger at call-bluff time — making bidderIdx === challengerIdx, so the challenger always lost regardless of the bid's accuracy. Fixed: last bidder read from `dybAllegationHistory[last].playerIdx` instead.

**BUG-04:** `dybStartSession()` called `showScreen('screen-dyb-seating')` directly without rendering the list (blank screen), and had no client guard. Fixed: replaced with `if (client) return; dybShowSeating()`.

**BUG-05:** Sound button and Settings button unresponsive on DYB menu after quitting mid-game. Root cause: `dyb-slick-picker-overlay` (z-[100], `fixed inset-0`) persisted after quit — invisible full-screen tap interceptor. Fixed: (1) added to `resetToLobby()` DYB teardown in `engine.js`; (2) added explicit hide in `btn-dyb-quit-confirm` handler in `dyb.js`.

---

## Technical notes

- **`dybWildcardsStyle: 'volatile'`** — `dybOnesStripped` flag resets per-Shake; set to `true` when any allegation names face = 1. `dybComputeRealCount()` branches on this flag.
- **Opener rotation** — after each Showdown, next opener = loser (if still alive) or `dybActivePlayers[0]` (if eliminated).
- **Roll privacy model** — rolls never leave the device until Showdown. `DYB_ROLL_SUBMIT` ACTION only signals readiness; actual dice values sent in the `DYB_SHOWDOWN` SYNC payload from host.
- **Slick picker z-[100]** — treated as safety-critical for overlay teardown. Pattern documented in BUG-05 notes and propagated to Protocol A audit checklist pattern (fixed inset-0 overlays must be cleared in both `resetToLobby()` and every "return to menu" exit path).
- **Slider audio scaling** — `playSliderTick()` expects 0–100. DYB Chaos Level slider is range 5–10. Fix: `(parseInt(v) - 5) * 20` maps 5→0, 10→100 for full audio sweep matching LI5 Wild Words.

---

## Documentation updated

- `docs/code-map.md` — DYB section added (7 screens, 5 overlays, key functions, ACTION/SYNC packet table)
- `.claude/rules/game-identities.md` — Game 11 DYB entry added (theme, state flow, terminology, settings, scoring, overlays, screens, multiplayer config)
- `docs/implementation-notes/dyb-implementation-notes.md` — BUG-01 through BUG-05 logged
- `js/engine.js` — `dyb-slick-picker-overlay` added to `resetToLobby()` teardown; `dyb` added to `updateSliderTheme()` map
- `sw.js` — v99, `js/games/dyb.js` precached

---

## Gold Master status

**10 games complete + multiplayer:** LI5, Great Minds, Secret Signals, JEC, YGI, LTTP, Natural Selection, Deep-Sea Deploy, Group Therapy, Dicey Bluffs.

**Next:** Protocol C Studio Sweep before any new Phase 1 brief.
