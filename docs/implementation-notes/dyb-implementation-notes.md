# DYB Implementation Notes — Dicey Bluffs

## Design Decisions

**Seating screen is host-only.**
`screen-dyb-seating` is shown exclusively to the host after `onPassThePhone` fires. Clients remain on `screen-mp-lobby-join` until `DYB_GAME_START` is received, at which point they navigate directly to the Shake screen. The seating screen is purely a pre-game waiting room and player-count confirmation — no mechanics depend on it.

**Seat numbers are not shown on the seating screen.**
Random seat assignment happens in `dybStartGame()` and is distributed via `DYB_GAME_START`. Showing sequential placeholder numbers (1, 2, 3…) before randomisation would be misleading. The seating list just shows who's in the game with a neutral "ready" label.

**`DYB_SPIRIT_SHAKE` and `DYB_SHAKE_ACTIVE` are sent back-to-back from the same function.**
Both are fire-and-forget writes to Firebase. All devices receive both. The Spirit Board routing relies on `dybActivePlayers.includes(mpMyPlayerIdx)` to distinguish eliminated vs active devices at the point of receipt. This is sufficient because `dybActivePlayers` is updated from `DYB_SHOWDOWN` before the next shake begins.

---

## Bug Index

**BUG-01: `dybPlayerCount` not set in `DYB_GAME_START` client handler**
- **What happened:** `dybPlayerCount` is only assigned in `onPassThePhone`, which only runs on the host. Clients kept `dybPlayerCount = 0` (default).
- **Root cause:** `dybRenderAllHandsOnShowdown()` iterates `for (let i = 0; i < dybPlayerCount; i++)`. With `dybPlayerCount = 0` on clients, the showdown screen rendered zero hands — blank reveal.
- **Fix:** Added `dybPlayerCount = payload.playerNames.length;` to the `DYB_GAME_START` SYNC handler, immediately before the `dybActivePlayers` assignment.
- **Found during:** Protocol B Step 3 routing trace (pre-first-run).

**BUG-02: `DYB_SHAKE_ACTIVE` SYNC overrides Spirit Board navigation for eliminated devices**
- **What happened:** `dybBroadcastShakeActive()` sends `DYB_SPIRIT_SHAKE` then `DYB_SHAKE_ACTIVE` to all devices sequentially. Eliminated devices correctly navigate to the Spirit Board on `DYB_SPIRIT_SHAKE`, then immediately get rerouted to the table by `DYB_SHAKE_ACTIVE`.
- **Root cause:** The `DYB_SHAKE_ACTIVE` handler had no guard for eliminated players.
- **Fix:** Added `if (!dybActivePlayers.includes(mpMyPlayerIdx)) return;` at the top of the `DYB_SHAKE_ACTIVE` SYNC case.
- **Found during:** Protocol B Step 3 routing trace (pre-first-run).

**BUG-03 (Critical): Wrong `bidderIdx` in `dybResolveShowdown()` — challenger penalised instead of last bidder**
- **What happened:** `dybProcessAllegation()` advances `dybCurrentBidderIdx` to the next player after each bid. When player B calls bluff, `dybCurrentBidderIdx` has already been updated to B. `dybResolveShowdown()` used `dybCurrentBidderIdx` as the bidder, making bidderIdx and challengerIdx the same person (B). When `real < claimed` (A's bid was a lie), `loserIdx = bidderIdx = B` — the challenger incorrectly loses a die.
- **Root cause:** `dybCurrentBidderIdx` tracks whose turn it is next, not who made the last bid. The variable is updated before `dybChallengerIdx` is set.
- **Fix:** Read the last bidder from `dybAllegationHistory[dybAllegationHistory.length - 1].playerIdx` instead. Safe because `Call Bluff!` is disabled when no bid exists, so the history array is never empty at resolution.
- **Found during:** Protocol B Step 5 code trace.

**BUG-04 (Minor): `dybStartSession()` skipped seating render; clients incorrectly routed to seating screen**
- **What happened:** `dybStartSession()` called `showScreen('screen-dyb-seating')` directly without calling `dybRenderSeatingList()`, leaving the seating list blank. Additionally, clients who had the post-lobby Play CTA available would navigate to the seating screen instead of waiting for `DYB_GAME_START`.
- **Root cause:** `dybStartSession()` was written before `dybShowSeating()` existed as a combined helper, and no client guard was added.
- **Fix:** Replaced the body with `if (window.syllyMultiplayerMode === 'client') return;` then `dybShowSeating()`.
- **Found during:** Protocol B Step 5 code trace.

**BUG-05: Sound button and Settings button unresponsive on DYB menu**
- **What happened:** After quitting a game mid-session (via the ✕ → quit overlay → confirm path), the sound button and Settings button on the DYB menu were completely unresponsive — taps did nothing.
- **Root cause:** `dyb-slick-picker-overlay` is `fixed inset-0 z-[100]`. It can only be dismissed from within the table screen. Neither the quit-confirm handler nor `resetToLobby()` hid it, so it persisted over the game menu as an invisible but full-screen tap interceptor. All taps went to the overlay, which had no open handler from the menu context.
- **Fix:** (1) Added `document.getElementById('dyb-slick-picker-overlay').style.display = 'none';` to the `resetToLobby()` DYB teardown block in `engine.js`. (2) Added the same hide call to the `btn-dyb-quit-confirm` click handler in `dyb.js`, before `showScreen('screen-dyb-menu')`.
- **Prior art:** Same pattern as GTH canvas wrapper and LTTP message interrupt overlay — any `fixed inset-0` overlay that can be opened mid-game must be explicitly cleared in both `resetToLobby()` and every "return to menu" path.
- **Found during:** Live testing post-Phase Gate audit.

---

## Multiplayer Lessons

*(to be filled during testing)*

---

## Template Gaps

**Sound button listeners — engine.js global covers all games (June 2026)**
Investigated a report that the DYB menu sound button wasn't working. Found that `engine.js` attaches `openSoundOverlay` to all `.btn-open-sound` elements globally at script execution time (top-level `querySelectorAll`). Since all HTML is parsed before any script runs, every game's sound buttons are covered automatically — no per-game listener is needed. DYB and several newer games (NAT, DSD, GTH, BLD, PASS) have explicit plugin-level listeners too, which are harmless duplicates. Phase-audit Protocol C cross-game check updated to document this. Lesson: when investigating a sound button report, first confirm whether an old SW cache might be serving stale JS before assuming a wiring gap.
