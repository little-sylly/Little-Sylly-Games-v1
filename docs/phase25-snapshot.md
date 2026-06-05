# Phase 25 Snapshot — Documentation, Play-Again Lobby Return, Host-Only Audit

**Date:** 2026-06-03
**SW Version:** v82 (no new assets — no bump required)
**Gold Master:** 8 games + multiplayer — stable

---

## What Was Done

### Part A — Phase 24 Documentation (previously unwritten)

Phase 24 (Round 2) introduced four multiplayer changes that weren't documented at the time. This phase closes that gap:

**`docs/code-map.md`:**
- Added `mpPlayersListener` and `window.mpClientPlayerRef` to the Multiplayer Globals table
- Added `mpStartPlayersWatcher()` and `mpReturnToLobby()` to Key Functions
- Added `LOBBY_RESET` to the LOBBY envelope actions table (with full direction/trigger/effect description)
- Updated `GM_RESULT` SYNC entry to note `isOverride: bool` and `overridePhrase: string` payload fields
- Updated "Updated:" header to Phase 25

**`.claude/rules/game-identities.md`:**
- GM Multiplayer section updated from "Phase 22" to "Phase 22 + Phase 24–25"
- `GM_RESULT` SYNC entry updated with `isOverride` and `overridePhrase` fields
- Client guards documented: `btn-gm-override` and `btn-gm-next-round` are no-ops for clients
- Social Override broadcast mechanism documented
- Play-again routing documented (host → `mpReturnToLobby()`, client → `resetToLobby()`)

**`.claude/rules/logic-engine.md`:**
- Added `mpPlayersListener` and `window.mpClientPlayerRef` to the Globals table
- Updated LOBBY envelope list to include `LOBBY_RESET`
- Added new section "Play-Again Return Pattern (`mpReturnToLobby`)" — describes the universal pattern, host/client behaviour, and the confirm button label update convention

**`CLAUDE.md`:**
- Phase updated: "25 complete — Documentation, play-again lobby return (all games), host-only audit"
- `docs/phase25-snapshot.md` added to key references

---

### Part B — `mpReturnToLobby()` Wired Into All 7 Remaining Games

All 7 non-GM games' play-again confirm handlers now call `mpReturnToLobby()` when `syllyMultiplayerMode !== 'single'`. Each also updates the confirm button label dynamically when the overlay opens (Host: "Restart in Lobby 🔄", Client: "Leave Session", Single: original thematic label).

| Game | File | Overlay open button | Confirm button | Change |
|------|------|---------------------|----------------|--------|
| LI5 | `js/games/li5.js` | `btn-play-again` | `btn-li5-confirm-new-game` | Dynamic label + MP branch |
| SS | `js/games/secret-signals.js` | `btn-ss-play-again` | `btn-ss-play-again-confirm` | Dynamic label + MP branch (intercepts before `startSyllySignals()`) |
| JEC | `js/games/jec.js` | `btn-jec-new-game` | `btn-jec-new-shift-start` | Dynamic label + MP branch |
| YGI | `js/games/ygi.js` | `btn-ygi-play-again` | `btn-ygi-run-confirm` | Dynamic label + MP branch (intercepts before `ygiStartGame()`) |
| LTTP | `js/games/lttp.js` | *(no overlay)* | `btn-lttp-new-plans` | Inline MP check (no overlay — LTTP predates the play-again overlay rule) |
| NAT | `js/games/nat.js` | `btn-nat-go-new` | `btn-nat-expedition-confirm` | Dynamic label + MP branch |
| DSD | `js/games/dsd.js` | `btn-dsd-new-operation` | `btn-dsd-new-op-confirm` | Dynamic label + MP branch |

GM was already wired in Phase 24 (`btn-gm-new-game-confirm`).

---

### Part C — Host-Only In-Game Action Audit

Full scan of all 8 game files for host-only in-game actions that modify shared game state without broadcasting. **No gaps found.** Summary:

| Game | Candidate | Status |
|------|-----------|--------|
| LI5 | None | ✅ Clean |
| GM | Social Override (`btn-gm-override-confirm`) | ✅ Fixed Phase 24 — broadcasts `GM_RESULT` with `isOverride: true` |
| GM | Near-sync overlay (`btn-gm-near-sync-accept/reject`) | ✅ Verified unreachable in Lobby Mode — `gmMpResolveRound()` bypasses it and broadcasts `GM_RESULT` directly with `isNearSync: true`. Comment at line 536: "Near-sync: treat as mismatch for now (social override stays Host-only in Lobby Mode)" |
| SS | None | ✅ Clean |
| JEC | Sous Chef merge (`btn-jec-oversight-merge`) | ✅ Already broadcasts `JEC_MERGE` SYNC inside `jecApplyMerge()` |
| YGI | None | ✅ Clean |
| LTTP | Map/suspicion annotations | ✅ Local-only by design — not shared state |
| NAT | Peer review disputes (`natDispute()`) | ✅ Applied before broadcast; penalties included in `NAT_TALLY` SYNC |
| DSD | Jammer/sabotage | ✅ Host-only by design; resolved in `DSD_EXECUTION_RESULT` |

**Audit rule for future games:** Any host-only action that changes shared game state (scores, progression, word state) must broadcast a SYNC envelope before calling `showScreen()`. The Social Override pattern (Phase 24) is the canonical example of how to retrofit this.

---

## Files Changed

| File | Change |
|------|--------|
| `js/games/li5.js` | `mpReturnToLobby()` wired into play-again confirm |
| `js/games/secret-signals.js` | `mpReturnToLobby()` wired into play-again confirm |
| `js/games/jec.js` | `mpReturnToLobby()` wired into play-again confirm |
| `js/games/ygi.js` | `mpReturnToLobby()` wired into play-again confirm |
| `js/games/lttp.js` | `mpReturnToLobby()` inline check on `btn-lttp-new-plans` |
| `js/games/nat.js` | `mpReturnToLobby()` wired into play-again confirm |
| `js/games/dsd.js` | `mpReturnToLobby()` wired into play-again confirm |
| `docs/code-map.md` | Phase 24 globals, functions, LOBBY_RESET, GM_RESULT fields |
| `.claude/rules/game-identities.md` | GM multiplayer section updated |
| `.claude/rules/logic-engine.md` | Globals table + `mpReturnToLobby()` pattern section |
| `CLAUDE.md` | Phase + key references updated |

---

## Verification Checklist

- [ ] **Play-again host (any game):** Finish game → open play-again overlay → confirm button shows "Restart in Lobby 🔄" → tap → host lands on `screen-mp-lobby-host` with same room code
- [ ] **Play-again client (any game):** Client taps confirm (label: "Leave Session") → returns to main lobby
- [ ] **Play-again single device:** Play-again confirm → navigates to game's setup/menu as before (no regression)
- [ ] **LTTP multiplayer play-again:** "New Plans" button in MP → `mpReturnToLobby()` correctly (no overlay — inline check)
- [ ] **GM near-sync in Lobby Mode:** Words that near-match display as a mismatch on the result screen — no overlay shown, no stuck state

---

## Known Deferred Items

- **In-game disconnect handling:** Not implemented. Players who disconnect mid-game currently cause the remaining device to get stuck. Would require per-game HTML overlays. Deferred to a future phase.
- **Rejoin system:** Not feasible — `syllyDeviceUid` is memory-only by design (no localStorage persistence). Cannot rejoin an active session after app reload.
- **LTTP play-again overlay:** LTTP predates the play-again overlay rule (introduced Phase 20). The inline MP check covers the multiplayer case but single-device play-again has no confirmation step. Retrofitting an overlay is a future UX polish item.
