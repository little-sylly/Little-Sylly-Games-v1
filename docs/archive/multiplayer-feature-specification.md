# Little Sylly Games: Multiplayer Feature Specification (v1.3)

## 1. Core Objectives
* **Vision:** Enable a premium "Lobby Mode" (Multi-device) while preserving the rock-solid "Pass-the-Phone" (Single-device) architecture.
* **Philosophy:** "Offline-first, Online-enabled." The application must gracefully fallback to offline play patterns if no network is detected.
* **Design Mandates:** $0 operational cost, zero external framework dependencies (beyond local script hosting), and minimal code churn to existing plugin files.

---

## 2. Technical Architecture & Constraints
* **Network Foundation:** WebRTC via PeerJS utilizing the free, public cloud signaling server as an initial handshake switchboard.
* **The Sync Module:** Introduce `js/engine-multiplayer.js` as an architecture-wide interceptor exposing the global tracking state: `window.syllyMultiplayerMode = 'single' | 'host' | 'client';`.
* **Interceptor Pattern:** All standard user action dispatches are evaluated by the Sync Module first. If Mode == Single, it executes instantly. If Mode == Lobby, it serialises the action data payload into JSON format and broadcasts it via the P2P data channel.
* **UI Hardening:** Standardise `overscroll-behavior-y: none;` across the entire application shell to fundamentally prevent accidental pull-to-refresh data losses.
* **Sync Lock:** Implementation of a lightweight global state variable that toggles input responsiveness while awaiting Host data round-trips to prevent race conditions.

---

## 3. Communication Protocol (The Envelope)
To ensure the parsing mechanics remain cleanly unified across all current and future games, all network transactions must strictly conform to this object schema:

```json
{ 
  "type": "HANDSHAKE|ACTION|SYNC|LOBBY", 
  "payload": { ... }, 
  "originId": "String", 
  "timestamp": 12345 
}


4. Operational Protocols

The Handshake Protocol: Upon establishing a physical connection, a Client device must immediately transmit a HANDSHAKE packet declaring its active software version.

Match: Proceed to sync layout.

Mismatch: If the version string doesn't match the Host's version (e.g., v78), the Host forcefully terminates the link and signals a VERSION_MISMATCH overlay, prompting the Client to refresh their browser cache.

Session Integrity: One session constitutes exactly one closed group. Due to local state evaluation complexities, players who intentionally disconnect or accidentally exit are removed from the active loop and are not permitted to rejoin the same session.

Synchronization Strategy:

Submit-Only: Data transactions only trigger upon definitive submission actions.

No Real-Time Jitter: Character-by-character text field syncing is prohibited to preserve performance and local bandwidth.

5. Global UI/UX Specifications

The Entry Loop: Title Screen -> Game Selection -> Mode Selection Screen (screen-[game]-mode) -> Setup Phase / Host Lobby View (screen-[game]-lobby-host).

Nickname Entry & Persistence: The intermediate Mode Selection Screen contains a mandatory text input element styled inside our stone-palette frame: [ Enter Nickname... ].

To eliminate friction, successful names must persist inside localStorage.setItem('sylly_nickname', value). Future session initialisations must auto-populate this field layout.

If a user selects [Pass-the-Phone], validation is bypassed and they proceed directly to the legacy local setup screen.

If a user selects [Host Lobby] or [Join Lobby], the engine validates the field string. If empty, the box flashes stone-red and executes a gentle CSS shake animation to block navigation.

Design Token Enforcement: All new screens must employ left-aligned layout headers (no text-center). Error or decision messaging layouts must use the verified overlay-modal-inner bg-stone-50 w-full max-w-sm rounded-3xl template standard.

Host Capabilities: The Host device retains ultimate administrative priority, including an explicit "End Game" mechanism that instantly terminates the session and returns all clients safely to the main menu with a clean state.

Graceful Session Drops: If a Client disconnects, they are parsed out of the slot architecture. If the Host disconnects, all clients immediately drop to a uniform "Session Ended: Host Disconnected" overlay.

6. Engine Solutions & Friction Mitigations

The Input Barrier Pattern: For games featuring simultaneous input generation, the Host evaluates inputs against a readyCheck matrix. To maintain a minimalist UI, no distinct waiting screen will be rendered. Instead, submitting an action natively greys out and disables that player's interactive input zone while displaying a subtle pending state. Once all flags return true, the Host advances the state.

Lobby Slotting & Assignment Compromise: To avoid asynchronous race conditions during device slotting, players will verbally coordinate positions at the couch. The Host handles manual assignment layout configurations cleanly inline.

Unified Host Lobby Layout Engine (screen-[game]-lobby-host):

Plaintext

+------------------------------------------+
|  <- Cancel          [ ROOM: KRAK ]       |  <- ZONE 1: Connection Header
+------------------------------------------+
|  MODE: ( ) 2-Device Teams  (*) Indiv.    |  <- ZONE 2: Session Configuration
+------------------------------------------+
|  UNASSIGNED PLAYERS (Tap to select)      |
|  [ Dave ]  [ Sarah ]                     |  <- ZONE 3: The Interactive Dock
|                                          |
|  TEAM 1: ALPHA ECHO                      |
|  [ Slot 1: Host Name ]                   |  (Mirrors your Phase 20 layouts
|  [ Slot 2: Click to assign Dave ]        |   like image_bbe3c1.png dynamically!)
|                                          |
|  TEAM 2: BRAVO ZULU                      |
|  [ Slot 1: Click to assign Sarah ]       |
+------------------------------------------+
|              [ Let's Sail! -> ]          |  <- Core CTA (Disabled until valid)
+------------------------------------------+


Zone 1: Connection Header: Displays a high-contrast alphanumeric room code badge. Tapping it automatically copies the join URL to the clipboard. Includes a standard left-aligned back arrow to drop the signaling connection immediately.

Zone 2: Session Configuration Switch: A horizontal thematic pill-toggle: [ 2-Device Teams ] or [ Individual Devices ]. Toggling 2-Device Teams instantly collapses target roster containers down to a binary phone-vs-phone structural layout.

Zone 3: Interactive Matching Dock: Connected client devices passing the handshake appear inside an "Unassigned Players" pool as floating choice chips. The Host distributes names into the preexisting Phase 20 game-specific team/player slots using a tap-to-select pattern (tap nickname chip -> tap empty slot). Tapping an assigned slot clears it and returns that player back up to the unassigned pool.

Unified Client Join Layout Engine (screen-[game]-lobby-join):

Plaintext

+------------------------------------------+
|  <- Cancel          [ JOIN LOBBY ]       |  <- ZONE 1: Back Navigation
+------------------------------------------+
|                                          |
|  ENTER THE 4-CHARACTER ROOM CODE:        |
|                                          |
|         [  K  ] [  R  ] [  A  ] [  K  ]  |  <- ZONE 2: Capitalised Input Blocks
|                                          |
+------------------------------------------+
|                                          |
|  Connecting as: [ Dave ]                 |  <- ZONE 3: Identity Confirmation
|  (Tap to change nickname)                |
|                                          |
+------------------------------------------+
|              [ Enter Room -> ]           |  <- Core CTA (Disabled until valid)
+------------------------------------------+


7. Per-Game Engine Configurations

Like I'm Five (LI5) — 2-Device Team Mode

The Mechanics: Tailored for a clean dual-device setup (Team A Phone vs. Team B Phone).

The Intercept: The Active Speaker's UI renders the targeted prompt word and restricted list entries. Concurrently, the opposing team's device mirrors this exact dataset hidden inside a highly thematic tracking layout to check against slip ups from the active team. Wording and phrasing inside this monitoring view must strictly maintain the game's unique established thematic tone.

Great Minds — Individual Device Mode

The Mechanics: Both players interact simultaneously on standalone form interfaces. The network infrastructure opens up the capacity to scale this loop beyond the legacy two-player limit in future iterations.

The Intercept: Local submission immediately freezes and greys out the active input element, dispatching the text payload to the Host. The Host calculates matches once both payloads resolve, throwing the unified results data back to the UI. To confirm a manual match, both players must confirm sync.

Secret Signals — Hybrid Mode

Full Individual: The Active Player interfaces directly with the clue input view. Active teammates display the Vault interface along with the historical log. The opposing team is isolated on a defensive Intercept screen showcasing only their historical word text log, tracking past structural codes to optimize interception strategies.

2-Device Team: Behaves as a team-alternating pass loop where the standby terminal is locked out from inputs until the structural simultaneous response phase occurs.

Just Enough Cooks (JEC) — Individual Device Mode

The Mechanics: Parallel input loop for all active chefs.

The Intercept: Inputs are immediately locked upon user submission, awaiting a true flag matrix across all terminals. The "Sous Chef Oversight" toggle configuration is accessible only to the Host terminal; client devices render this component as explicitly disabled with all pointer events completely killed to prevent local interference.

You Get It? (YGI) — Individual Device Mode

The Mechanics: Simultaneous answer formulation followed directly by an immediate individual voting loop.

The Override: When initializing in Lobby Mode, the game rules document must ensure the configuration automatically overrides its default single-device "Consensus" rule. It dynamically switches to an independent "Your Call" voting configuration where each connected client locks in their individual vote privately. The Host aggregates the results flag matrix before broadcasting the unified verdict layout. Claude must hardcode this behaviour explicitly into the unified rule files.

Late to the Party (LTTP) — Individual Device Mode

The Mechanics: Active Player maintains native tab navigation across Maps and Contacts. Passive users navigate their respective layouts safely without interrupting the primary state matrix. They are allowed to input their notes into relevant notes sections.

The Interstitial Message Loop: When a message is dispatched from Player X, an explicit alert overlay interrupts all connected screens stating: "Player X received a message from Player Y: [Message]". Passive players select "OK/Done" to cycle back to standby, while the targeted receiver's terminal automatically updates to the active player workflow.

Natural Selection (NAT) — Individual Device Mode

The Mechanics: The sequential turn matrix remains intact, bypassing physical transfers.

The Intercept: Non-active players are not blocked by full-screen elements. Instead, they keep their normal screen (view role, clues, history etc) but only their active entry spaces are dynamically greyed out, rendering contextual thematic phrases like "Waiting for Player X's observation...".

Deep-Sea Deploy (DSD) — Hybrid Mode

The Mechanics: Grid data presentation remains exposed to all connected devices on the couch, preserving standard spatial awareness.

The Intercept: Captain screens are structurally obfuscated from the crew. Passive crew layouts display read-only operational updates of the grid parameters and the history arrays (dsdTurnLog[]). To maintain processing clarity and prevent multi-device data collision during tactical choice selection, the actionable input privilege cycles sequentially through individual crew members while teammates coordinate intentions verbally.

8. Test Cases (The "Audit" Checklist)

Scenario A (Happy Path Local): Host and Clients processing state transactions over an identical local Wi-Fi router.

Scenario B (Fallback WAN): Host on Wi-Fi connecting to a Client running isolated 4G/5G mobile infrastructure to evaluate PeerJS data routing.

Scenario C (Navigation Shielding): Forcing harsh scroll drop-downs during heavy usage to verify that overscroll-behavior-y blocks unintended interface reloads.

Scenario d (Jitter Handling): Artificially throttling network packets to verify that the "Sync Lock" grey-out states properly prevent duplicate input dispatches.