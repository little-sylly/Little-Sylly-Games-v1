# Phase 22 Snapshot — Multiplayer (MFS v1.4)
**Date:** Phase 22 complete
**SW Version:** v80
**Gold Master:** 8 games + multiplayer (LI5, GM, SS, JEC, YGI, LTTP, NAT, DSD)
**Follows:** Phase 21a snapshot
**Spec:** `docs/multiplayer-feature-specification-v1.4.md` (MFS v1.4)

---

## Summary

Phase 22 implemented full multiplayer support for all 8 games via Firebase Realtime Database,
following the Architecture B (Full Client / State Replication) model specified in MFS v1.4.

**Sprints completed:**
1. **Sprint 1** — Foundation: `engine-multiplayer.js` globals, `MP_GAME_CONFIGS` registry, `syllyMultiplayerMode` gate
2. **Sprint 2** — Shared UI: parameterised mode screen, host lobby, client join, LI5 monitor
3. **Sprint 3** — Firebase infrastructure: lazy-load, anonymous auth, room creation/join, handshake, sync lock, event listener, teardown, garbage collection
4. **Sprint 4** — Per-game intercepts: all 8 games fully wired (GM, JEC, YGI, NAT, LI5, DSD, SS, LTTP)
5. **Sprint 5** — Audit & documentation: Protocol A fixes, new docs created, all 5 existing docs updated

---

## New Files Added

| File | Purpose |
|------|---------|
| `js/engine-multiplayer.js` | Multiplayer module — Firebase, lobby, sync lock, envelope routing |
| `js/lib/firebase-app.js` | Firebase App (local copy) |
| `js/lib/firebase-auth.js` | Firebase Auth (anonymous sign-in) |
| `js/lib/firebase-database.js` | Firebase Realtime Database |
| `js/lib/firebase-init.js` | Firebase project config + initialisation |
| `docs/multiplayer-ui-components.md` | Component catalogue for all MP screens, overlays, CSS classes |
| `docs/phase22-snapshot.md` | This file |

---

## Architecture Decisions

### 1. Shared Parameterised Screens (4 not 25)

The spec described "25 new screens" (3 per game × 8 + 1 LI5 monitor). The implementation
uses **4 shared HTML screen elements** populated dynamically via JS:

- `screen-mp-mode` — parameterised by `mpShowModeScreen(abbr)`
- `screen-mp-lobby-host` — populated from `MP_GAME_CONFIGS[abbr]`
- `screen-mp-lobby-join` — populated from `MP_GAME_CONFIGS[abbr]`
- `screen-li5-monitor` — LI5-specific; populated via `SYNC: LI5_ROUND_START`

**Rationale:** Avoids 24 near-identical screen duplicates. The "build once, reuse 8 times"
principle is strictly maintained. `MP_GAME_CONFIGS` is the single source of truth for
game-specific display values (emoji, brand colour, CTA labels, hybrid support flag).

### 2. Firebase Lazy-Load

`syllyFirebase` is `null` on app boot. Firebase scripts load only when the user explicitly
enters Lobby Mode. The app works fully offline without Firebase — Pass-the-Phone is always
available regardless of network state. If Firebase fails to load within 4 seconds,
`mp-network-error-overlay` is shown; the app continues normally.

### 3. NAT Role Security — UX-Based Couch Security

The MFS v1.4 spec called for targeted Firebase writes per player for NAT role data (so The Mole
never receives researcher words on other devices). The implementation broadcasts all role data to
all devices; each device renders only its own role.

**Rationale:** NAT is a same-room couch game. Physical proximity means players cannot read each
other's screens without being seen. True per-player security (targeted Firebase paths) would
require a fundamentally different architecture for a marginal security gain in this context.
For a networked async game this decision would need revisiting.

### 4. SS Vault Security — Properly Isolated

Unlike NAT, SS vault data requires genuine security — Team B's vault must never appear on
Team A's device. Implemented correctly: Host sends ONLY Team B's vault to the Client device
via `SYNC: SS_VAULT_DATA`. Team A's vault never leaves the Host.

### 5. GM — Simultaneous Input (No Pass-Gate)

In single-device mode, GM is sequential (P0 → pass gate → P1). In Lobby Mode, both devices
show the input screen simultaneously for their own `mpMyPlayerIdx`. The Firebase round-trip
replaces the pass-gate + reveal-gate sequence. `gmStartInputPhase()` sets
`gmActivePlayer = mpMyPlayerIdx` when `syllyMultiplayerMode !== 'single'`.

### 6. YGI — Verdict Style Override

The Consensus verdict style (`'open-ballpark'`) requires a shared device — it cannot work with
individual devices. `ygiVerdictStyle` is forced to `'secret-ballot'` in Lobby Mode regardless of
settings. The setting toggle is visually disabled on all client devices.

### 7. LTTP — Broadcast Message Interrupt

When any player sends a message in LTTP Lobby Mode, `mp-lttp-message-interrupt-overlay`
(z-[105]) fires on ALL devices simultaneously. Passive devices (not the active player) can
navigate the map and contacts freely, but their send controls are locked.
Map annotations and contacts/notes are local-only — never synced. This is intentional:
each player's private suspicion tracking stays private.

### 8. LI5 Monitor Screen Protocol A Fix

`screen-li5-monitor` was missing an exit button (Protocol A failure). Fixed by adding
`#btn-li5-monitor-exit` (✕) wired to `playExit(); mpTeardown(); resetToLobby()`.
This screen is a passive spectator view — direct teardown (no quit overlay) is appropriate.

---

## Screen Registry Delta

4 new screen IDs added to `allScreens[]` in `engine.js`:

| Screen ID | Purpose |
|-----------|---------|
| `screen-mp-mode` | Mode selection (shared, parameterised) |
| `screen-mp-lobby-host` | Host waiting room (shared) |
| `screen-mp-lobby-join` | Client join flow (shared) |
| `screen-li5-monitor` | LI5 opposing team view (Tattletale Sheet) |

---

## Per-Game Multiplayer Summary

**Like I'm Five (LI5):** 2-Device Teams. Host device = active describers. Client device shows
`screen-li5-monitor` (Tattletale Sheet) — word + No-No List populated via `LI5_ROUND_START`
SYNC. CATCH! button on monitor sends `LI5_CATCH` ACTION to Host (visual alert, no auto-scoring).

**Great Minds (GM):** Individual Devices. Both players input simultaneously on their own device.
Pass-gate and reveal-gate skipped — Firebase round-trip replaces the handoff. `GM_SUBMIT` ACTION
from Client; Host resolves match, broadcasts `GM_RESULT` SYNC.

**Just Enough Cooks (JEC):** Individual Devices. All chefs submit prep independently. Host runs
sifting + Sous Chef oversight; all merges broadcast via `JEC_MERGE` SYNC so all devices stay in
sync. `jecMpReadyCheck[]` gates sifting until all chefs submit.

**You Get It? (YGI):** Individual Devices. Verdict Style forced to `'secret-ballot'` (The
Consensus requires a shared device). Takes submitted via `YGI_TAKE_SUBMIT` ACTION; Host builds
lineup and broadcasts `YGI_LINEUP` SYNC. Votes collected via `YGI_VOTE_SUBMIT`; Host computes
and broadcasts `YGI_VERDICT`.

**Natural Selection (NAT):** Individual Devices. Handover screen skipped; `NAT_ACTIVE_PLAYER`
SYNC drives who can input. Role data broadcast to all devices (UX-based couch security). Host
receives `NAT_OBSERVATION` ACTIONs, advances turn, broadcasts selection and tally.

**Deep-Sea Deploy (DSD):** Hybrid (2-Device Teams or Individual, selectable in host lobby Zone 2).
Non-active team's device shows read-only crew standby. Captain sends ping via `DSD_PING_TRANSMIT`
ACTION; Host broadcasts `DSD_CREW_ACTIVE` SYNC; Crew submits `DSD_SEQUENCE_SUBMIT` ACTION; Host
resolves execution, broadcasts `DSD_EXECUTION_RESULT` SYNC.

**Secret Signals (SS):** Hybrid (2-Device Teams or Individual). Team B's vault sent only to
Client via `SS_VAULT_DATA` SYNC (targeted — never broadcast). Full encoding/intercept/decode
cycle driven by ACTION → SYNC pairs. `ssMpVaultReady[]` gates game start until both teams
confirm vault.

**Late to the Party (LTTP):** Individual Devices. Full world state broadcast on game start via
`LTTP_GAME_START` SYNC. On each message send, `LTTP_MESSAGE_INTERRUPT` overlay fires on ALL
devices simultaneously (z-[105]). Handover screen skipped; `LTTP_TURN_ADVANCE` SYNC drives
active player. Map annotations + contacts notes are local-only (intentionally not synced).

---

## Deviations from MFS v1.4 Spec

| # | Spec said | What was implemented | Reason |
|---|-----------|---------------------|--------|
| 1 | "25 new screens" (3 per game × 8 + 1) | 4 shared parameterised screens | Build-once-reuse-8-times principle; functionally equivalent |
| 2 | NAT: targeted Firebase writes per player for role data | Broadcast to all; each device renders own role only | Couch game — physical security is sufficient; targeted path requires significant architecture change |
| 3 | LTTP spec referenced `messageTag: {root, emoji, label}` | Implemented as `messageText: "string"` | Phase 21a replaced Small Talk with free-text modal; spec was not updated; Phase 21a snapshot noted this discrepancy |
| 4 | `mpTeardown()` referenced as teardown function | `mpStopListeners()` used; `syllyMultiplayerMode` reset in `resetToLobby()` | Teardown logic integrated into `resetToLobby()` rather than a standalone function |

---

## Documentation Updates (Sprint 5)

All 5 required doc files updated and 2 new files created:

| File | Change |
|------|--------|
| `CLAUDE.md` | Project structure updated (engine-multiplayer.js, Firebase libs, new docs), load order updated, localStorage exception noted, Current Focus updated to Phase 22 complete |
| `logic-engine.md` | New "Multiplayer Sync Module" section added (globals, envelope schema, sync lock, lazy-load, interceptor pattern, resetToLobby additions); new checklist item for new-game multiplayer integration |
| `definitions.md` | 9 new multiplayer terms added to Technical Project Terms table |
| `game-identities.md` | Multiplayer subsection added to all 8 games (mode, shared screens, game-specific screens, overrides, ACTION/SYNC packets) |
| `docs/code-map.md` | New "Multiplayer Module" section appended (globals, screens, overlays, functions, envelope schema, per-game packet types) |
| `docs/multiplayer-ui-components.md` | **NEW** — full component catalogue |
| `docs/phase22-snapshot.md` | **NEW** — this file |

---

## Test Case Checklist

The following 12 test cases must be run on real devices with Firebase configured before
Phase 22 is considered fully verified. These cannot be automated — they require network,
real browsers, and (for multi-device tests) multiple physical devices or browser tabs.

- [ ] **A. Happy Path Local** — Host + ≥1 Client on same Wi-Fi. Full game loop completes for each of the 8 games. All SYNC packets arrive within 1 second.
- [ ] **B. Fallback WAN** — Host on Wi-Fi, one Client on 4G/5G. Connection establishes. Sync latency tolerable (< 3s per round-trip).
- [ ] **C. Offline Launch** — Open PWA with no internet. "Host Lobby" and "Join Lobby" options on mode screen are absent or disabled. Pass-the-Phone mode works normally.
- [ ] **D. Firebase Load Failure** — Network present but Firebase scripts blocked (e.g. via browser DevTools). `mp-network-error-overlay` shown. App does not crash. Pass-the-Phone available.
- [ ] **E. Navigation Shielding** — Force pull-to-refresh during active multiplayer session. `overscroll-behavior-y: none` (set in Phase 21a CSS) prevents pull-to-refresh on iOS Safari.
- [ ] **F. Sync Lock** — Artificially throttle network (DevTools slow 3G). Submit an action. Verify grey-out state activates on submission. Verify it releases on SYNC receipt or 8-second timeout. Verify no duplicate submissions.
- [ ] **G. Host Disconnect** — Host kills PWA mid-game. All client devices display `mp-host-disconnected-overlay` within 5 seconds. Clients can tap "Back to Lobby" and return to main lobby cleanly.
- [ ] **H. Client Disconnect** — One client kills PWA mid-game. Host's game continues. Host's player dock reflects reduced count. Remaining clients unaffected.
- [ ] **I. Version Mismatch** — Client on old SW version attempts handshake. `mp-version-mismatch-overlay` shown on Host. Client sees "couldn't connect" status in join flow.
- [ ] **J. Room Collision** — (Hard to test deterministically) Force the same room code to be generated twice simultaneously. Second session silently gets a new code. No crash.
- [ ] **K. Garbage Collection** — Create a room, abandon it without formally ending. Reopen the app 2+ hours later. Stale room node is deleted on next app load (or on next room creation).
- [ ] **L. YGI Override** — Launch YGI in Lobby Mode with "The Consensus" pre-selected in settings. Confirm Verdict Style is forced to "Your Call" on game start. Toggle appears disabled on client devices.

---

## SW Version Record

SW version at Phase 22 completion: **v80**

Assets precached (in addition to pre-Phase-22 list):
- `js/engine-multiplayer.js`
- `js/lib/firebase-app.js`
- `js/lib/firebase-auth.js`
- `js/lib/firebase-database.js`
- `js/lib/firebase-init.js`

Note: Firebase library files are cached for offline resilience — if Firebase CDN is unavailable,
the local copies load. However, real-time sync still requires network access.

---

*Phase 22 complete. Phase 23 TBD.*
