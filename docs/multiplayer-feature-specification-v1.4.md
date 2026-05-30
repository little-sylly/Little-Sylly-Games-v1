# Little Sylly Games: Multiplayer Feature Specification (v1.4)
**Status:** Pre-Implementation Gold Master — Phase 21
**Supersedes:** v1.3
**Date:** May 2026
**Project State at Handoff:** Phase 21a complete, SW v80, 8 games, all Protocol A audits done

---

## Preamble — Architectural Decision Record

This section documents the permanent decisions made during the v1.3 → v1.4 review. Claude Code must not relitigate these decisions. If a constraint appears to conflict with an implementation detail, flag it for human review rather than resolving it independently.

| Decision | Rationale |
|----------|-----------|
| **Firebase Realtime Database** over WebRTC/PeerJS | Firebase's architecture is a direct stepping stone to a future native app backend. PeerJS would require a full networking rewrite at that transition. Firebase free tier is sufficient for all foreseeable usage. |
| **Architecture B — Full Client / State Replication** | Each device runs the complete game plugin locally. The sync layer replicates state-change triggers, not rendered output. This requires minimal changes to existing plugin files, consistent with the "minimal code churn" mandate. |
| **Lazy-loading for Firebase SDK** | The core offline-first single-device loop must remain 100% independent of Google code. Firebase scripts load only when a user explicitly enters Lobby Mode. |
| **Anonymous Firebase Auth** | Zero user-facing login UI. Firebase Anonymous Authentication assigns each device a temporary `auth.uid` used exclusively for database security rules. Not for identity — nicknames handle that. |
| **4-character alphanumeric room codes** | Easy to read aloud across a couch. Character set excludes visually ambiguous characters. Numbers included to expand the pool. |
| **Host-only settings** | Whatever settings the Host has configured when they create the lobby are the session settings. Client settings panels are read-only. |
| **No join-by-URL feature in Phase 21** | Code entry is sufficient for the couch use case. URL-based joining adds complexity for minimal gain at this stage. Can be revisited. |

### Confluence Snapshot — Mode Selection Screen Insertion
**Decision:** Insert `screen-[game]-mode` between each game's menu screen and its setup/lobby screens for all 8 games.
**Rationale:** Multiplayer requires a mode-selection step before setup can proceed. The game menu is the natural gateway — it already exists, it already has a "Let's Play!" button, and inserting here requires changing exactly one navigation target per game.
**Technical Impact:**
- Each game's "Let's Play!" button in its menu now navigates to `screen-[game]-mode` instead of directly to `screen-[game]-setup`
- `screen-[game]-mode` back arrow navigates to the game's menu screen
- Pass-the-Phone path navigates to the existing `screen-[game]-setup` (zero change to setup flow or anything beyond it)
- Host Lobby path navigates to `screen-[game]-lobby-host`
- Join Lobby path navigates to `screen-[game]-lobby-join`
- All new screen IDs added to `allScreens[]` in `engine.js` and to `resetToLobby()` teardown

---

## §1 — Core Objectives

- **Vision:** Enable a premium "Lobby Mode" (multi-device via Firebase) while preserving the rock-solid "Pass-the-Phone" (single-device) architecture unchanged.
- **Philosophy:** "Offline-first, Online-enabled." The single-device experience is the gold master. Multiplayer is an enhancement layer. If no network is detected, or if Firebase fails to load, the app presents only the Pass-the-Phone option and operates identically to Phase 20.
- **Design Mandates:** $0 operational cost. Zero changes to existing game plugin files except where a per-game multiplayer intercept is explicitly specified in §7. No external scripts loaded during single-device play. Firebase is the sole external dependency for Lobby Mode.

---

## §2 — Technical Architecture

### 2.1 The Sync Module

Introduce `js/engine-multiplayer.js` as a new file loaded after `engine.js` in the script order. It exposes three global variables accessible to all plugins:

```
window.syllyMultiplayerMode   — 'single' | 'host' | 'client'
window.syllySyncLocked        — boolean, default false
window.syllyFirebase          — null | Firebase app instance (set after lazy load)
```

`syllyMultiplayerMode` defaults to `'single'` on page load. It is set to `'host'` or `'client'` when a Lobby Mode session is established, and reset to `'single'` by `resetToLobby()`.

### 2.2 The Interceptor Pattern

All standard user action dispatches are evaluated by the Sync Module first.

- If `syllyMultiplayerMode === 'single'`: execute locally and instantly. Zero change from Phase 20 behaviour.
- If `syllyMultiplayerMode === 'host'` or `'client'`: serialise the action payload into an Envelope (§3) and write it to the Firebase session path. The Host's local game logic remains the source of truth.

### 2.3 Firebase Lazy-Loading Injector

Firebase SDK scripts are **never** loaded on app start. They are injected dynamically only when a user taps "Host Lobby" or "Join Lobby" on the Mode Selection screen.

```javascript
// Pseudocode — implementation in engine-multiplayer.js
function syllyLoadFirebase(onReady) {
  if (window.syllyFirebase) { onReady(); return; }
  const initScript = document.createElement('script');
  initScript.type = 'module';
  initScript.src = 'js/lib/firebase-init.js';
  // firebase-init.js imports from the three Firebase SDK files, initialises the app,
  // writes window.syllyFirebase = { app, db, auth }, then dispatches 'sylly-firebase-ready'
  document.addEventListener('sylly-firebase-ready', onReady, { once: true });
  initScript.onerror = () => syllyShowNetworkError();
  document.head.appendChild(initScript);
}
```

`js/lib/firebase-init.js` is a thin ES-module wrapper (the only ES-module file in the project). It `import`s from `firebase-app.js`, `firebase-database.js`, and `firebase-auth.js` (modular SDK), calls `initializeApp(FIREBASE_CONFIG)`, `getDatabase()`, and `getAuth()`, then writes `window.syllyFirebase = { app, db, auth }` and dispatches `new CustomEvent('sylly-firebase-ready')` on `document`. This is the single boundary between the module world and the global world — nothing else in the project uses ES modules.

The `FIREBASE_CONFIG` object lives inside `firebase-init.js`, not in `engine-multiplayer.js`. Paste the real Firebase config values there after creating the Firebase project.

If `initScript.onerror` fires (no network, Firebase blocked), display a toast: "Lobby Mode requires an internet connection" and return the user to the Mode Selection screen. Pass-the-Phone remains available.

### 2.4 Firebase SDK Files

Download and host locally to maintain the zero-CDN constraint:
- `js/lib/firebase-app.js` — Firebase core (modular SDK)
- `js/lib/firebase-database.js` — Realtime Database module
- `js/lib/firebase-auth.js` — Anonymous Authentication module
- `js/lib/firebase-init.js` — ES-module bootstrap wrapper (project-authored; see §2.3)

All four files added to `sw.js` precache. SW version bumps from **v80 → v81**.

### 2.5 Firebase Configuration

The Firebase config object (API keys) is embedded directly in `js/lib/firebase-init.js`. This is standard and expected Firebase practice — these keys are not secrets. Security is enforced by Firebase Security Rules (§2.7), not by hiding config values. Claude Code must not attempt to obscure or environment-variable the config object.

```javascript
// In js/lib/firebase-init.js
const FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "...",
  databaseURL: "...",
  projectId: "...",
  // etc.
};
```

*Note: The actual config values are filled in by the project owner after creating the Firebase project. Claude Code should use placeholder strings and document where to paste the real values.*

### 2.6 Anonymous Authentication

On Firebase load, immediately call `signInAnonymously(getAuth(app))`. This runs silently — no UI, no prompt. On success, `auth.currentUser.uid` is stored as `window.syllyDeviceUid`. This UID is used exclusively for database security rules. It is not displayed to users and has no relationship to their nickname.

If `signInAnonymously` fails (network issue, auth service down), treat identically to a Firebase load failure — show the network error toast and fall back to Pass-the-Phone.

### 2.7 Firebase Security Rules

The database is structured as `/rooms/{roomCode}/`. Security rules enforce:

- Any authenticated device can **read** any room path (needed to join)
- Only the device whose `uid` matches `hostUid` can **write** to `/rooms/{roomCode}/settings`, `/rooms/{roomCode}/state`, and `/rooms/{roomCode}/lifecycle`
- Any authenticated device can write to its own player slot: `/rooms/{roomCode}/players/{playerIndex}` — but only if its `uid` matches the `uid` stored in that slot (set at join time)
- Unauthenticated requests are denied entirely

```json
{
  "rules": {
    "rooms": {
      "$roomCode": {
        ".read": "auth != null",
        "settings": { ".write": "auth != null && data.parent().child('hostUid').val() === auth.uid" },
        "state":    { ".write": "auth != null && data.parent().child('hostUid').val() === auth.uid" },
        "lifecycle":{ ".write": "auth != null && data.parent().child('hostUid').val() === auth.uid" },
        "players": {
          "$playerIndex": {
            ".write": "auth != null && (data.parent().parent().child('hostUid').val() === auth.uid || data.child('uid').val() === auth.uid || !data.exists())"
          }
        }
      }
    }
  }
}
```

### 2.8 Sync Lock

`window.syllySyncLocked` is a boolean that prevents duplicate inputs during Host round-trips.

When `syllySyncLocked = true`, the CSS class `mp-sync-locked` is toggled on `document.body`. A single CSS rule handles all interactive elements universally:

```css
/* In css/styles.css */
.mp-sync-locked .btn-mp-action {
  pointer-events: none;
  opacity: 0.6;
}
```

Every submittable action button in multiplayer-aware screens carries the class `btn-mp-action`. This is the only new class required on game plugin UI elements.

**Lock lifecycle:**
1. User submits an action → `syllySyncLocked = true` immediately
2. The Host writes state to Firebase → Firebase broadcasts to all clients → clients apply state locally
3. On confirmed state receipt: `syllySyncLocked = false`
4. **Timeout fallback:** if no state confirmation within 8 seconds, `syllySyncLocked = false` and a brief "Connection slow..." toast appears. Prevents permanent soft-lock on packet loss.

### 2.9 Client Architecture (Full Client / State Replication)

Client devices run the complete game plugin locally. The Sync Module's role is not to relay game logic — it is to ensure that every state-changing user action is replicated identically across all devices.

- The Host's local game logic executes first and is the source of truth
- When the Host's plugin produces a state change, the Sync Module writes the resulting state delta or trigger to Firebase
- All connected clients (including the Host itself via the Firebase listener) receive the update and execute the identical state transition locally
- Clients do not compute outcomes independently — they receive a trigger and execute locally
- This means: if a plugin function is `jecAdvanceRound()`, the Host calls it locally, then writes `{ action: "JEC_ADVANCE_ROUND", payload: { ... } }` to Firebase. All clients receive this and call `jecAdvanceRound()` locally with the same payload. State stays in sync without rewriting plugin logic.

---

## §3 — Communication Protocol (The Envelope)

All Firebase writes conform to this schema. Written to `/rooms/{roomCode}/events/` as a push-appended list.

```json
{
  "type": "HANDSHAKE | ACTION | SYNC | LOBBY",
  "payload": { },
  "originId": "firebase-auth-uid-string",
  "timestamp": 1234567890
}
```

**Type definitions:**

| Type | Direction | Purpose |
|------|-----------|---------|
| `HANDSHAKE` | Client → Host | Sent immediately on join; declares app version and nickname |
| `ACTION` | Client → Host | A state-changing user input (e.g., word submitted, vote cast) |
| `SYNC` | Host → All | A state update broadcast after Host logic resolves an action |
| `LOBBY` | Host → All | Session lifecycle events (settings sync, game start, end game) |

**Timestamp note:** The `timestamp` field is for debugging and data hygiene only. It is never used to order events or resolve conflicts. The Host's processing order is always authoritative.

---

## §4 — Operational Protocols

### 4.1 The Handshake Protocol

1. Client joins a room → Firebase connection established
2. Client immediately writes a `HANDSHAKE` envelope: `{ type: "HANDSHAKE", payload: { version: "v81", nickname: "Dave" }, originId: clientUid, timestamp: ... }`
3. Host reads the handshake via Firebase listener
4. **Version match:** Host writes client into the player slot array; broadcasts updated lobby state to all devices
5. **Version mismatch:** Host writes a `LOBBY` envelope with `{ action: "VERSION_MISMATCH", targetUid: clientUid }`. The `mp-version-mismatch-overlay` is shown on the Host device. The client who failed the handshake receives no confirmation and sees a timeout state — their lobby join screen shows "Couldn't connect — please refresh and try again."

The version string checked is the SW cache version (e.g., `"v81"`). This is stored as a constant `SYLLY_VERSION` in `engine.js` and read by `engine-multiplayer.js` at handshake time. Sprint 1 adds this constant explicitly: `const SYLLY_VERSION = 'v81';` — it must be kept in sync with `CACHE_NAME` in `sw.js` on every future deploy.

### 4.2 Session Integrity

- One session = one closed group. The room path `/rooms/{roomCode}/` is created by the Host and destroyed by the Host.
- Players who disconnect are removed from the player slot array via Firebase's `onDisconnect()` hook, which is registered at join time.
- Players who disconnect are not permitted to rejoin the same session.
- **iOS PWA backgrounding:** When a mobile OS backgrounds the PWA, the Firebase connection may drop. From the session's perspective this is indistinguishable from a disconnect. This is by design and is a documented limitation. A brief "Lost Connection" toast on the affected device is the only UX response needed — no automatic rejoin attempt.

### 4.3 Synchronisation Strategy

- **Submit-only:** Data writes to Firebase only trigger on definitive submission actions (button taps, confirmed votes). No continuous sync.
- **No real-time jitter:** Character-by-character text field syncing is prohibited.
- **Settings sync:** When the Host taps "Let's Sail!" to launch the game, a `LOBBY` envelope is written first: `{ action: "SETTINGS_SYNC", gameSettings: { ...full serialised settings object... } }`. All clients apply these settings locally before their plugin initialises. Client settings panels are rendered as read-only (pointer events killed, visually dimmed) for the duration of the session.

### 4.4 End Game (Host Capability)

The Host retains ultimate administrative priority. End Game is not a new button — it is a behaviour change on the existing quit flow when in Host mode.

**Host quit flow in Lobby Mode:**
- Host taps ✕ → existing quit overlay appears
- The quit overlay gains one additional option in Host mode: **"End for Everyone"** button, below the standard "Quit to Menu" confirm
- Tapping "End for Everyone": Host writes `{ type: "LOBBY", payload: { action: "HOST_END_GAME" }, ... }` to Firebase, then calls `resetToLobby()` locally
- All clients receive `HOST_END_GAME`, display `mp-host-disconnected-overlay` briefly, then call `resetToLobby()` locally
- The quit overlay's standard "Quit to Menu" path in Host mode also broadcasts `HOST_END_GAME` before executing — a Host cannot silently abandon a session

**Client quit flow:** Clients use the standard ✕ → quit overlay → confirm path. On confirm, their player slot is removed from Firebase (triggering the `onDisconnect()` path). The Host's lobby view updates to show the departed player.

---

## §5 — Data Hygiene (Firebase Garbage Collection)

Ghost room nodes are the primary risk to staying within Firebase free tier limits. Two cleanup mechanisms are mandatory.

### 5.1 Explicit Teardown (Primary)

When `resetToLobby()` is called on the Host device:
1. Write `{ lifecycle: "closed", closedAt: timestamp }` to `/rooms/{roomCode}/lifecycle/`
2. Then delete the entire `/rooms/{roomCode}/` node
3. Then destroy the Firebase listeners

This covers all normal session endings: Host quits, Host ends game, game completes naturally.

### 5.2 Timestamp-Based Recycling (Safety Net)

Every room node stores a `createdAt` timestamp written by the Host at room creation.

A cleanup check runs once per app load (in `engine-multiplayer.js` initialisation, before any room is created or joined):
- Query all `/rooms/` nodes where `createdAt` is older than **2 hours**
- Delete any matching nodes regardless of their state

2 hours is generous for a couch game session. Any room older than that is definitively abandoned.

**Firebase Security Rules addendum:** The cleanup query requires read access to all rooms. This is already permitted by the rules in §2.7. Deletion of expired rooms is permitted for any authenticated device (not just the original host — the original host may be gone).

```json
"rooms": {
  "$roomCode": {
    "lifecycle": {
      ".write": "auth != null && (data.parent().child('hostUid').val() === auth.uid || data.parent().child('createdAt').val() < (now - 7200000))"
    }
  }
}
```

---

## §6 — Global UI/UX Specifications

### 6.1 The Entry Loop

```
Game Menu → screen-[game]-mode → screen-[game]-lobby-host (Host path)
                               → screen-[game]-lobby-join  (Join path)
                               → screen-[game]-setup        (Pass-the-Phone path — unchanged)
```

### 6.2 Nickname Entry & Persistence

The Mode Selection screen (`screen-[game]-mode`) contains a mandatory nickname input field, styled inside a stone-palette card frame consistent with existing settings cards.

- **Persistence:** `localStorage.setItem('sylly_nickname', value)` on successful entry. This is an intentional exception to the no-localStorage rule — a nickname is a user preference, not game state, and is consistent with the "settings may persist" provision in `CLAUDE.md`.
- **Auto-population:** On screen load, `localStorage.getItem('sylly_nickname')` pre-fills the field if a value exists.
- **Validation:** Max 12 characters. Non-empty required for Host/Join paths. If empty when Host or Join is tapped: field border flashes `border-red-400`, CSS shake animation plays. Validation is bypassed entirely for Pass-the-Phone.
- **Pass-the-Phone path:** Tapping Pass-the-Phone navigates directly to `screen-[game]-setup` with no nickname validation. Nickname field is visible but optional.

### 6.3 Design Token Enforcement

All new screens must comply with existing project standards:
- Left-aligned layout headers (no `text-center` on title blocks)
- `overlay-modal-inner bg-stone-50 w-full max-w-sm rounded-3xl px-6 pt-6 pb-8 flex flex-col gap-4 text-center` for all decision modal inners
- `.btn-open-sound` + ✕ on every new screen
- Settings and how-to overlays: thematic title block as first child of `overlay-data-inner`; `scrollTop = 0` on open
- All toggle buttons must include `shrink-0` in both active and inactive class strings

### 6.4 Host Lobby Screen — `screen-[game]-lobby-host`

```
+------------------------------------------+
|  ← Cancel          [ ROOM: K7R2 ]        |  ZONE 1: Connection Header
+------------------------------------------+
|  MODE: ( ) 2-Device Teams  (*) Indiv.    |  ZONE 2: Session Configuration
+------------------------------------------+
|  UNASSIGNED PLAYERS (tap to select)      |
|  [ Dave ]  [ Sarah ]                     |  ZONE 3: Interactive Dock
|                                          |
|  TEAM 1: [Team Name]                     |
|  [ Slot 1: Host Name ]                   |
|  [ Slot 2: Tap to assign Dave ]          |
|                                          |
|  TEAM 2: [Team Name]                     |
|  [ Slot 1: Tap to assign Sarah ]         |
+------------------------------------------+
|           [ Let's Sail! → ]              |  CTA — disabled until valid
+------------------------------------------+
```

**Zone 1 — Connection Header:**
- Room code displayed as a high-contrast alphanumeric badge
- Tapping the badge copies the room code to clipboard (not a full URL — code only)
- Left-aligned back arrow (← Cancel): tears down the Firebase room node (calls explicit teardown from §5.1), destroys Firebase listeners, returns to `screen-[game]-mode`
- No back-button navigation using the browser back gesture — the cancel arrow is the only exit

**Zone 2 — Session Configuration:**
- Pill toggle: `[ 2-Device Teams ]` / `[ Individual Devices ]`
- Only shown for games that support both modes (SS, DSD). For games with a fixed mode, Zone 2 is hidden entirely.
- Toggling `2-Device Teams` collapses the roster to a binary two-slot layout

**Zone 3 — Interactive Dock:**
- Connected clients who have passed the handshake appear as floating chips in the Unassigned pool
- Tap a chip → it highlights (selected state)
- Tap an empty slot → selected chip moves into that slot
- Tap an occupied slot → returns that player to the Unassigned pool
- Host's own name is pre-assigned to Slot 1 of Team 1 (or Slot 1 for individual mode) and cannot be moved — they are always Player 1

**CTA — Let's Sail! (game-specific label):**
- Disabled (greyed, pointer events killed) until all slots are filled
- On tap: broadcasts `SETTINGS_SYNC` LOBBY packet then `GAME_START` LOBBY packet, then navigates locally to setup/first game screen

### 6.5 Client Join Screen — `screen-[game]-lobby-join`

```
+------------------------------------------+
|  ← Cancel          [ JOIN LOBBY ]        |  ZONE 1: Back Navigation
+------------------------------------------+
|  ENTER THE 4-CHARACTER ROOM CODE:        |
|                                          |
|  [ K ] [ 7 ] [ R ] [ 2 ]                 |  ZONE 2: Code Input Blocks
|                                          |
+------------------------------------------+
|  Connecting as: Dave                     |
|  (Tap to change nickname)                |  ZONE 3: Identity Confirmation
+------------------------------------------+
|           [ Enter Room → ]              |  CTA — disabled until 4 chars entered
+------------------------------------------+
```

- Each of the 4 input blocks accepts one character (auto-advances focus on entry)
- Characters are uppercased automatically
- CTA enabled only when all 4 blocks are filled
- "Tap to change nickname" navigates back to the mode screen nickname field
- ← Cancel returns to `screen-[game]-mode` with no Firebase action (no room was joined yet)

### 6.6 Room Code Generation

- **Format:** 4 characters. Character set: `A-Z` excluding `I`, `O` (ambiguous with 1, 0) + digits `2-9` (excluding `0`, `1`). Total: 24 letters + 8 digits = 32 characters → 32⁴ = 1,048,576 combinations.
- **Generation:** `Array.from({length:4}, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random()*32)]).join('')`
- **Firebase path:** `/rooms/{roomCode}/` — the room code IS the database key
- **Collision handling:** When Host creates a room, check if `/rooms/{roomCode}/` already exists in Firebase. If it does and `createdAt` is less than 2 hours old (active session): silently regenerate and retry once. If second attempt also collides: show "Couldn't create room — please try again" toast, remain on mode screen. If it exists but is older than 2 hours (abandoned): overwrite it.

### 6.7 Graceful Session Drops

- **Client disconnects:** Removed from player slot array via `onDisconnect()`. Host's lobby view updates. If mid-game, Host's active player list shrinks. Game continues with remaining players (game-specific handling noted in §7).
- **Host disconnects:** All clients receive Firebase `onDisconnect()` trigger for the host's lifecycle node → `mp-host-disconnected-overlay` displays on all client devices → on dismiss, `resetToLobby()` is called locally on each device.

---

## §7 — Per-Game Engine Configurations

> **Universal rule — Host identity:** For all games, the Host is always the device that created the room (tapped "Host Lobby"). Host authority does not transfer during the session regardless of whose turn it is or which team is currently active. If the Host disconnects, all clients receive `mp-host-disconnected-overlay` and return to the lobby.

### Game 1: Like I'm Five (LI5) — 2-Device Team Mode

**Multiplayer mode:** 2-Device Teams (Team A phone vs Team B phone)

**Host identity:** The device that creates the room is always the Host for the session. The Host runs all round logic and broadcasts the active word + No-No List to both devices at round start. This is independent of which team is currently describing — the Host role does not rotate.

**The Active Speaker's device:** Renders the target word and the No-No List exactly as in single-device play. No change to existing screens.

**The Opposing Team's device — `screen-li5-monitor` (new screen):**
- Receives the current word and No-No List via a `SYNC` envelope broadcast by the Host at round start
- Displays the word prominently with the No-No List below, styled as a "Tattletale Sheet" — playful, child-like language consistent with LI5 tone (pink palette, crayon-style framing)
- Contains a single **CATCH!** button styled in the game's brand colour
- **CATCH! mechanic:** Tapping CATCH! plays a thematic sound (`playBoing()` or game-specific equivalent) and sends an `ACTION` envelope: `{ action: "LI5_CATCH_ALERT", originId: ... }`. This triggers a brief visual pulse/flash on the Active Speaker's device — a social nudge, not an automatic scoring action. No state changes.
- **No automatic scoring:** The CATCH! is purely a social alert. The active team reviews it themselves and taps Nay on the relevant word if they agree.
- **Pinky Swear Mode fallback:** If Pinky Swear Mode is ON (existing LI5 setting: "Tap words to flip outcome after the round"), the opposing team can flip words on their own monitoring view post-round, and those flips are broadcast via `SYNC` to reconcile with the active team's Report Card. Both devices must show the same final state before the round closes.

**Session drop mid-round:** If a team's device disconnects mid-round, the round is abandoned and the Host returns both devices to the word selection screen.

---

### Game 2: Great Minds — Individual Device Mode

**Multiplayer mode:** Individual Devices (each player has their own device)

**The Intercept:**
1. Each player's input screen is identical to single-device play
2. On submission: local input element freezes and greys out (`btn-mp-action` disabled). Player's text payload dispatched to Host via `ACTION` envelope.
3. Host collects all payloads. When all players have submitted (readyCheck matrix all true): Host runs match logic locally, then broadcasts result via `SYNC` envelope to all devices.
4. All devices render the pair-reveal screen simultaneously from the SYNC payload.
5. Manual match confirmation: both players must confirm sync (existing mechanic) — each confirmation is an `ACTION` envelope; Host resolves when both arrive.

**Scaling note:** The spec notes this architecture supports more than 2 players in future iterations. No action required now — the readyCheck matrix already accommodates N players.

---

### Game 3: Secret Signals (SS) — Hybrid Mode

**Multiplayer mode:** Full Individual OR 2-Device Teams (selectable in Host Lobby Zone 2)

**Full Individual Mode:**
- Active Encoder's device: clue input view, normal play
- Active Encoder's teammates: their devices display the Vault interface + historical log (Vault data is broadcast to all teammates via `SYNC` at round start — this is intentional; in the physical game teammates always see the Vault)
- Opposing team devices: isolated on a defensive Intercept screen showing only the historical word text log. No Vault data is ever sent to opposing team devices.
- Decode submission: opposing team submits their 3-number code via `ACTION` envelope. Host resolves after both sides submit.

**2-Device Team Mode:**
- Device A = one team, Device B = opposing team
- During Team A's encoding turn: Device A is fully active (Encoder input + Vault). Device B displays a locked standby state — historical log visible, all inputs disabled.
- "Simultaneous response phase" = the Intercept phase. Device B becomes active for decode submission. Device A is locked during this phase.
- Vault reveal: remains pass-the-phone within each team. 2-Device mode eliminates inter-team passing only.
- Pass-gate screens (`screen-ss-pass-gate`) still apply within a team for any private role reveal.

---

### Game 4: Just Enough Cooks (JEC) — Individual Device Mode

**Multiplayer mode:** Individual Devices

**The Intercept:**
1. All chefs receive the Order (food word) simultaneously via `SYNC` at round start
2. Each chef's prep input screen is active; all inputs function normally
3. On submission: that chef's input zone locks (`btn-mp-action` disabled, greyed), `ACTION` envelope dispatched
4. Host maintains readyCheck matrix — all `true` when all chefs have submitted
5. Host runs sifting logic locally, then broadcasts full sifting results via `SYNC`
6. All devices render the Sifting screen simultaneously from the SYNC payload

**Sous Chef Oversight in Lobby Mode:**
- The Sous Chef Oversight toggle is accessible only on the Host's device
- Client devices render this component as explicitly disabled: toggle greyed out, `pointer-events: none`, label appended with "(Host only)"
- Any merge the Host applies via `jecApplyMerge()` is broadcast as a `SYNC` envelope so all devices update their sifting view in real time

**Session drop mid-round:** Missing chef's slot is removed from the round. Sifting proceeds with remaining submissions. Host's readyCheck matrix updates to exclude the disconnected player's slot.

---

### Game 5: You Get It? (YGI) — Individual Device Mode

**Multiplayer mode:** Individual Devices

**Mandatory Verdict Style Override:**
When `window.syllyMultiplayerMode !== 'single'`, the following is enforced unconditionally at game initialisation (`ygiStartGame()`):
- `ygiVerdictStyle = 'secret-ballot'` (Your Call — individual voting), regardless of settings panel state
- The Verdict Style pill toggle is disabled on all devices (pointer events killed, visually greyed)
- The Host's settings panel shows the toggle locked to "Your Call" with a label "(Required in Lobby Mode)"
- This override lifts when `resetToLobby()` resets `syllyMultiplayerMode` to `'single'`

*Reasoning: The Consensus voting requires a single shared phone. In Lobby Mode each device votes independently, making Consensus physically impossible.*

**The Intercept:**
1. All players receive the Situation prompt simultaneously via `SYNC`
2. Each player formulates their Take (number + metric) independently on their own device
3. On submission: input freezes, `ACTION` envelope dispatched
4. Host collects all Takes → broadcasts full Lineup via `SYNC` to all devices
5. Voting: each player submits their individual Nod via `ACTION` envelope
6. Host aggregates votes → broadcasts Verdict via `SYNC`

---

### Game 6: Late to the Party (LTTP) — Individual Device Mode

**Multiplayer mode:** Individual Devices

**Turn structure:** Active Player's device is fully interactive. Passive player devices display their own role screens (Map, Contacts) in a navigation-permitted but input-locked state. Passive players may input notes into their notes sections.

**The Interstitial Message Loop:**
When Player X sends a message to Player Y:
1. Host broadcasts `{ type: "SYNC", payload: { action: "LTTP_MESSAGE_INTERRUPT", fromName: "Alex", toName: "Dave", messageText: "How did you get there?" } }` to all devices
2. All devices display `mp-lttp-message-interrupt-overlay` (z-[105]) immediately
3. Any currently open LTTP overlays on that device are closed before the interrupt displays
4. Overlay content: "[From] sent a message to [To]: [messageText]"
5. Passive players tap "OK" → overlay closes, they return to their standby screen. Closed overlays are not re-opened.
6. Target receiver's device: on "OK" → overlay closes, device auto-navigates to the active player message workflow

**Session drop mid-plan:** Disconnected player's turn is skipped for the remainder of the plan. Host's active player list is updated; the plan lap count adjusts accordingly.

---

### Game 7: Natural Selection (NAT) — Individual Device Mode

**Multiplayer mode:** Individual Devices

**Pass-gate replacement:** The Handover screen (`screen-nat-handover`) is skipped in Lobby Mode — it exists solely for pass-the-phone. A `SYNC` envelope replaces it:

`{ action: "NAT_ACTIVE_PLAYER", playerIdx: N, playerName: "Dave", role: "field-researcher" }`

Each device checks if its assigned `playerIdx` matches:
- **Match (active):** Observation input enabled, normal UI
- **No match (passive):** Input element `disabled` + `opacity-60`. Placeholder text replaced with a thematic NAT phrase: *"Field Researcher [Name] is recording their observation..."* or *"Awaiting Lead Biologist [Name]'s report..."* depending on the active player's role

**Role information:** Role assignments are broadcast via `SYNC` at match start to each player's own device only — using targeted writes to `/rooms/{roomCode}/players/{playerIndex}/roleData` rather than a global broadcast, ensuring The Mole never receives field researcher clues.

**Session drop mid-match:** Disconnected player's turns are skipped. If The Mole disconnects, the match is abandoned and Host returns all devices to the setup screen.

---

### Game 8: Deep-Sea Deploy (DSD) — Hybrid Mode

**Multiplayer mode:** Full Individual OR 2-Device Teams (selectable in Host Lobby Zone 2)

**Grid visibility:** The grid's revealed/unrevealed cell state is visible to all connected devices at all times. Only the Captain's colour-coded Deep Trench view is obfuscated.

**Captain screen obfuscation:**
When the Host broadcasts `{ action: "DSD_CAPTAIN_ACTIVE", captainPlayerIdx: N, captainName: "Dave", teamIdx: 0 }`:
- The device whose assigned `playerIdx` matches: shows `screen-dsd-captain` normally with full colour coding
- All other devices: show a read-only crew standby view — the public grid (revealed/unrevealed only, no colour codes) + `dsdTurnLog[]` history. All tactical input elements disabled.

**Captain pass-gate:** `screen-dsd-pass-gate` is retained in multiplayer for the Captain's own device — they still need to confirm they're ready before their private grid is displayed. All other devices go directly to crew standby view without a gate.

**Input cycling:** Actionable input privilege cycles sequentially through crew members as per the existing turn structure. The `DSD_ACTIVE_CREW` SYNC packet drives this, identical in structure to `NAT_ACTIVE_PLAYER`.

**2-Device Team Mode:** Device A = one team, Device B = opposing team. Behaves as a team-alternating loop. The standby team's device is locked out from inputs until the simultaneous response phase.

---

## §8 — Test Cases

| # | Scenario | Pass Criteria |
|---|----------|--------------|
| A | Happy Path Local | Host + 2 clients on same Wi-Fi. Full game loop completes. All SYNC packets arrive within 1 second. |
| B | Fallback WAN | Host on Wi-Fi, one client on 4G/5G. Connection establishes. Sync latency tolerable. |
| C | Offline Launch | User opens PWA with no internet. Lobby Mode option absent or disabled on mode screen. Pass-the-Phone works normally. |
| D | Firebase Load Failure | Network present but Firebase scripts fail to load (simulate by blocking domain). Network error toast appears. App does not crash. Pass-the-Phone available. |
| E | Navigation Shielding | Force scroll-down during active multiplayer session. `overscroll-behavior-y: none` prevents pull-to-refresh. |
| F | Sync Lock | Artificially throttle network. Verify grey-out state activates on submission and releases on SYNC receipt or 8-second timeout. No duplicate submissions. |
| G | Host Disconnect | Host kills PWA mid-game. All client devices display `mp-host-disconnected-overlay` within 5 seconds. Clients can return to menu cleanly. |
| H | Client Disconnect | One client kills PWA mid-game. Their slot is removed. Host's game continues with remaining players. |
| I | Version Mismatch | Client on old SW version attempts handshake. `mp-version-mismatch-overlay` on Host. Client sees "couldn't connect" message. |
| J | Room Collision | Force same room code generation twice simultaneously. Second session silently gets new code. No crash. |
| K | Garbage Collection | Create room, abandon without closing. Reopen app 2+ hours later. Stale room node is deleted on next app load. |
| L | YGI Override | Launch YGI in Lobby Mode with Consensus pre-selected in settings. Confirm Verdict Style forces to "Your Call". Toggle is disabled on all devices. |

---

## §9 — PWA & Service Worker

**SW version bump:** v80 → **v81**

**New files to add to precache list in `sw.js`:**
```
js/engine-multiplayer.js
js/lib/firebase-app.js
js/lib/firebase-database.js
js/lib/firebase-auth.js
js/lib/firebase-init.js
```

**Offline behaviour:** Firebase SDK files are cached by the SW after first load in Lobby Mode. On subsequent offline launches, the Firebase scripts are available in cache — however, Firebase itself requires a live network connection to function. The app must detect network availability before attempting Firebase initialisation and present only the Pass-the-Phone option when offline.

Network check: `navigator.onLine` at mode screen load. If `false`, Host/Join buttons are replaced with a single "No internet connection — Pass-the-Phone only" notice. The check re-runs if the user remains on the screen and connectivity is restored.

---

## §10 — New Screen Registry

All IDs below must be added to `allScreens[]` in `engine.js` and to the teardown logic in `resetToLobby()`.

| Screen ID | Game | Purpose |
|-----------|------|---------|
| `screen-li5-mode` | LI5 | Mode selection |
| `screen-li5-lobby-host` | LI5 | Host lobby |
| `screen-li5-lobby-join` | LI5 | Client join |
| `screen-li5-monitor` | LI5 | Opposing team monitoring view |
| `screen-gm-mode` | Great Minds | Mode selection |
| `screen-gm-lobby-host` | Great Minds | Host lobby |
| `screen-gm-lobby-join` | Great Minds | Client join |
| `screen-ss-mode` | Secret Signals | Mode selection |
| `screen-ss-lobby-host` | Secret Signals | Host lobby |
| `screen-ss-lobby-join` | Secret Signals | Client join |
| `screen-jec-mode` | JEC | Mode selection |
| `screen-jec-lobby-host` | JEC | Host lobby |
| `screen-jec-lobby-join` | JEC | Client join |
| `screen-ygi-mode` | YGI | Mode selection |
| `screen-ygi-lobby-host` | YGI | Host lobby |
| `screen-ygi-lobby-join` | YGI | Client join |
| `screen-lttp-mode` | LTTP | Mode selection |
| `screen-lttp-lobby-host` | LTTP | Host lobby |
| `screen-lttp-lobby-join` | LTTP | Client join |
| `screen-nat-mode` | NAT | Mode selection |
| `screen-nat-lobby-host` | NAT | Host lobby |
| `screen-nat-lobby-join` | NAT | Client join |
| `screen-dsd-mode` | DSD | Mode selection |
| `screen-dsd-lobby-host` | DSD | Host lobby |
| `screen-dsd-lobby-join` | DSD | Client join |

**Total new screens:** 25 (24 standard + `screen-li5-monitor`)

**New global overlays** (not game-specific — live in the Multiplayer Engine section of `index.html`):

| Overlay ID | z-index | Pattern | Purpose |
|------------|---------|---------|---------|
| `mp-version-mismatch-overlay` | z-[90] | Decision modal | Shown on Host when client version doesn't match |
| `mp-host-disconnected-overlay` | z-[100] | Decision modal | Shown on all clients when Host disconnects |
| `mp-lttp-message-interrupt-overlay` | z-[105] | Decision modal | Interrupts all LTTP devices on message send |
| `mp-network-error-overlay` | z-[90] | Decision modal | Firebase load failure — shown on mode screen |

*Note: z-[110] is reserved exclusively for `#sound-overlay` per `ui-style.md` — always highest. The interrupt overlay is z-[105] to ensure sound remains accessible during an interrupt.*

All 4 overlays must be added to `resetToLobby()` teardown.

---

## §11 — Engine Teardown Additions (`resetToLobby()`)

The following must be added to `resetToLobby()` in `engine.js` for multiplayer cleanup. These run after all existing teardown logic:

```javascript
// Multiplayer teardown
if (window.syllyFirebase && window.syllyMultiplayerMode === 'host') {
  syllyTeardownRoom(); // explicit Firebase room deletion (§5.1)
}
window.syllyMultiplayerMode = 'single';
window.syllySyncLocked = false;
document.body.classList.remove('mp-sync-locked');

// Hide all multiplayer overlays
['mp-version-mismatch-overlay','mp-host-disconnected-overlay',
 'mp-lttp-message-interrupt-overlay','mp-network-error-overlay'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
});

// Hide all multiplayer screens
['screen-li5-mode','screen-li5-lobby-host','screen-li5-lobby-join','screen-li5-monitor',
 'screen-gm-mode','screen-gm-lobby-host','screen-gm-lobby-join',
 'screen-ss-mode','screen-ss-lobby-host','screen-ss-lobby-join',
 'screen-jec-mode','screen-jec-lobby-host','screen-jec-lobby-join',
 'screen-ygi-mode','screen-ygi-lobby-host','screen-ygi-lobby-join',
 'screen-lttp-mode','screen-lttp-lobby-host','screen-lttp-lobby-join',
 'screen-nat-mode','screen-nat-lobby-host','screen-nat-lobby-join',
 'screen-dsd-mode','screen-dsd-lobby-host','screen-dsd-lobby-join'
].forEach(id => showScreen calls handle these via allScreens[]);
```

*Note: The screen hiding is handled automatically by `showScreen()` reading `allScreens[]` — the teardown only needs to explicitly hide overlays. The screen list above is documented here for reference, not as literal teardown code.*

---

## §12 — Multiplayer UI Components (Reuse Reference)

All multiplayer-specific UI components must be built once as reusable templates and parameterised per game. This ensures the multiplayer experience feels like a single unified gamebox feature, not 8 separate implementations.

| Component | Template approach | Parameters |
|-----------|------------------|------------|
| Mode Selection screen | One HTML structure, cloned/parameterised per game | Game name, brand colour class, game CTA label (see table below) |
| Host Lobby screen | One HTML structure | Team names, slot count, game CTA label |
| Client Join screen | One HTML structure | Game name, brand colour class |
| Room code badge | Shared CSS component `.mp-room-code-badge` | Code string only |
| Player chip (unassigned) | Shared CSS component `.mp-player-chip` | Nickname string |
| Occupied slot | Shared CSS component `.mp-slot-filled` | Nickname string |
| Empty slot | Shared CSS component `.mp-slot-empty` | Slot label |
| Sync pending state | CSS class `btn-mp-action` + body class `mp-sync-locked` | None — automatic |
| CATCH! button | Shared CSS component `.mp-catch-btn` | Brand colour only |

**Per-game mode screen CTA label** (used as the Pass-the-Phone button label on `screen-[game]-mode`):

| Game | CTA label |
|------|-----------|
| LI5 | "Play Time!" |
| GM | "Let's Play!" |
| SS | "Let's Play!" |
| JEC | "Let's Cook!" |
| YGI | "Show Your Take 🃏" |
| LTTP | "Find The Location!" |
| NAT | "Begin Observation" |
| DSD | "Let's Sail!" |

These components are documented in `docs/multiplayer-ui-components.md` (created as part of Phase 21 implementation). All class names prefixed `mp-` to namespace them from game-specific styles.

**Consistency rule:** If a multiplayer UI component exists (room code badge, player chip, etc.), it must be reused. No game may implement its own visual version of a shared multiplayer component.

---

## §13 — Implementation Order for Claude Code

Implement strictly in sprint order. Do not begin a sprint until the previous sprint's test cases pass.

### Sprint 1 — Foundation (no game logic, no Firebase calls yet)
1. Download Firebase modular SDK files → `js/lib/firebase-app.js`, `js/lib/firebase-database.js`, `js/lib/firebase-auth.js`
2. Create `js/engine-multiplayer.js` skeleton: global variable declarations only (`syllyMultiplayerMode`, `syllySyncLocked`, `syllyFirebase`, `syllyDeviceUid`). No logic yet.
3. Add `engine-multiplayer.js` + 4 Firebase files (including `firebase-init.js`) to `sw.js` precache → bump to v81. Also add `const SYLLY_VERSION = 'v81';` to `engine.js` global constants block — must stay in sync with `CACHE_NAME` in `sw.js` on every future deploy.
4. Add all 25 new screen IDs + 4 overlay IDs to `allScreens[]` in `engine.js`
5. Add multiplayer teardown block to `resetToLobby()` in `engine.js`
6. Add `<!-- ════ MULTIPLAYER ENGINE ════ -->` section stub to `index.html`
7. Add `mp-sync-locked` CSS rule to `css/styles.css`
8. Verify `overscroll-behavior-y: none` is present in `css/styles.css` — added in Phase 21a. No action if already present.

*Sprint 1 complete when: app loads, passes PWA audit, all existing games play identically to Phase 20.*

### Sprint 2 — Shared UI Screens
9. Build `screen-[game]-mode` as a single parameterisable template; wire up for all 8 games
10. Build `screen-[game]-lobby-host` as a single parameterisable template; wire up for all 8 games
11. Build `screen-[game]-lobby-join` as a single parameterisable template; wire up for all 8 games
12. Build all 4 global MP overlays (HTML only, no Firebase logic yet)
13. Implement nickname persistence (`localStorage`)
14. Implement room code generator function
15. Wire each game's Play CTA button → `screen-[game]-mode` (replaces direct-to-setup navigation; labels vary per game — see §12 per-game CTA table)

*Sprint 2 complete when: Mode Selection, Host Lobby, and Client Join screens are navigable for all 8 games. No real connections yet — purely UI.*

### Sprint 3 — Firebase Infrastructure
16. Implement lazy-loading injector (`syllyLoadFirebase()`)
17. Implement Anonymous Auth flow
18. Implement room creation (Host path): code generation, Firebase write, `onDisconnect()` registration
19. Implement room joining (Client path): code entry, Firebase read, handshake packet
20. Implement version check and `mp-version-mismatch-overlay` logic
21. Implement Settings Sync LOBBY packet (Host → all clients on game start)
22. Implement Sync Lock toggle
23. Implement End Game (Host quit overlay "End for Everyone" option)
24. Implement `mp-host-disconnected-overlay` logic on clients
25. Implement data hygiene: explicit teardown + timestamp-based garbage collection
26. Write Firebase Security Rules

*Sprint 3 complete when: Two real devices can create and join a room, exchange handshake, and the Host can end the session cleanly.*

### Sprint 4 — Per-Game Intercepts (simplest → most complex)
27. Great Minds (2 players, simultaneous input, clean readyCheck → SYNC)
28. JEC (N players, parallel input, readyCheck matrix, Sous Chef Oversight lock)
29. YGI (simultaneous input + voting, Verdict Style override)
30. NAT (sequential turns, active player SYNC broadcast, Handover skip)
31. LI5 (2-device team, `screen-li5-monitor`, CATCH! button, Pinky Swear SYNC)
32. DSD (hybrid, Captain obfuscation, input cycling)
33. SS (most complex — hybrid mode, Vault targeted writes, Intercept screen isolation)
34. LTTP (most complex — message interrupt overlay, passive navigation preservation)

*Sprint 4 complete when: each game can be played end-to-end in Lobby Mode on two or more real devices.*

### Sprint 5 — Audit & Documentation
35. Protocol A audit of all 25 new screens (alignment, overlays, ✕ buttons, sound controls, toggle `shrink-0`)
36. Run all 12 test cases from §8
37. Create `docs/multiplayer-ui-components.md`
38. Update all documentation files (§14)
39. Write `docs/phase21-snapshot.md`

---

## §14 — Documentation Update Plan

The following files must be updated as part of Phase 21. This is a required deliverable, not optional cleanup.

### Files to Update

**`CLAUDE.md`**
- Add `js/engine-multiplayer.js` to project structure map
- Add `js/lib/firebase-app.js`, `firebase-database.js`, `firebase-auth.js`, `firebase-init.js` to project structure map
- Update SW version reference: v80 → v81
- Update "Current Focus" section to Phase 21 — Multiplayer
- Add `docs/multiplayer-feature-specification.md` and `docs/multiplayer-ui-components.md` to Key References
- Add `docs/multiplayer-architecture.md` to Key References
- Add explicit note: *"`localStorage` for `sylly_nickname` is a permitted exception to the no-localStorage rule — user preference, not game state."*
- Add `window.syllyMultiplayerMode`, `window.syllySyncLocked` to any relevant global variable documentation

**`logic-engine.md`**
- Add new section: **Multiplayer Sync Module** — document `syllyMultiplayerMode`, `syllySyncLocked`, `syllyFirebase`, `syllyDeviceUid`, the Envelope schema, the Interceptor Pattern, Firebase lazy-loading, and the `resetToLobby()` multiplayer additions
- Add new entry to the New Game Checklist: *"If game has a multiplayer configuration: add intercept logic per `docs/multiplayer-feature-specification.md §7`. Add game-specific SYNC/ACTION packet types to `docs/multiplayer-architecture.md`."*

**`definitions.md`**
- Add multiplayer terms to the Technical Project Terms table:

| Term | Meaning |
|------|---------|
| `syllyMultiplayerMode` | Global string: `'single'` \| `'host'` \| `'client'` |
| `syllySyncLocked` | Global bool: input lock during Host round-trip |
| `syllyDeviceUid` | Firebase Anonymous Auth UID for this device |
| `syllyFirebase` | Firebase app instance; `null` during single-device play |
| Envelope | The standardised JSON object wrapping all Firebase events |
| Room Code | 4-char alphanumeric session identifier; also the Firebase path key |
| Lobby Mode | Any `syllyMultiplayerMode !== 'single'` session |
| Host | The device that creates the room and owns game logic authority |
| Client | Any non-Host connected device |
| readyCheck matrix | Array of booleans tracking per-player submission state |
| `btn-mp-action` | CSS class on all submittable multiplayer buttons; toggled by Sync Lock |

**`game-identities.md`**
- Add a **Multiplayer Configuration** subsection to each of the 8 game entries:
  - Mode (Individual / 2-Device Teams / Hybrid)
  - Any multiplayer-specific mechanics or overrides
  - New screen IDs introduced for that game
  - Any new terminology introduced for multiplayer play

### New Files to Create

**`docs/multiplayer-feature-specification.md`**
- Move the final version of this spec from the project root into `docs/`
- This is the permanent feature spec reference

**`docs/multiplayer-architecture.md`**
- Created after Sprint 3 is complete
- Documents: Firebase project structure, database path schema, all SYNC/ACTION/LOBBY packet types used across all games, Security Rules (final version), Firebase config placeholder location, known limitations (iOS backgrounding, free tier limits)
- This is the operational reference for anyone touching multiplayer in future phases

**`docs/multiplayer-ui-components.md`**
- Created during Sprint 5
- Catalogues every reusable `mp-` prefixed component: exact class strings, HTML structure, parameters, which games use it
- The multiplayer equivalent of the overlay pattern documentation in `ui-style.md`

**`docs/phase21-snapshot.md`**
- Created at end of Sprint 5
- Follows identical format to `phase20-snapshot.md`
- Documents: what changed, all new screens, all new overlays, architecture decisions made during implementation (not just planned), any deviations from this spec with rationale

### `docs/code-map.md`
- Add `engine-multiplayer.js` function catalogue
- Add all 25 new screen IDs
- Add all 4 new global overlay IDs
- Add new global variables section for multiplayer globals

---

*End of Specification v1.4*
*Next action: Claude Code picks up at Sprint 1, Step 1.*
*Do not begin implementation until this document has been confirmed by the project owner.*
