# Little Sylly Games: Multiplayer Spec Review & Gap Analysis
## For: Phase 21 Implementation Handoff to Claude Code
**Review of:** `multiplayer-feature-specification.md` v1.3
**Project Status:** Phase 20 complete — 8 games, SW v78, gold master confirmed
**Purpose:** Identify gaps, conflicts, and missing detail before implementation begins

---

## Executive Summary

The v1.3 spec is a solid architectural foundation and clearly authored with deep knowledge of the codebase. The interceptor pattern, envelope schema, and per-game configurations are well-considered. However, the document has **three categories of gaps** that must be resolved before handing to Claude Code:

1. **Project discipline conflicts** — items that contradict `CLAUDE.md`, `logic-engine.md`, or the audit standards
2. **Under-specified mechanics** — things described at concept level but not yet at implementation level
3. **Missing sections entirely** — areas the spec doesn't address that Claude Code will need answers for

Each gap is rated **[BLOCKER]**, **[REQUIRED]**, or **[RECOMMENDED]** based on whether it would stop implementation, produce incorrect code, or simply improve quality.

---

## Part 1 — Project Discipline Conflicts

### 1.1 `localStorage` for Nickname — Rule Clarification Needed [REQUIRED]

**Spec says:** `localStorage.setItem('sylly_nickname', value)` for nickname persistence.

**Conflict:** `CLAUDE.md` anti-patterns state "Do NOT use `localStorage` for game state mid-round (memory only; settings may persist)."

**Resolution:** A nickname is a user preference, not game state — this is permissible under the "settings may persist" carve-out. However, this needs to be **explicitly declared as an intentional exception** in the spec so Claude Code doesn't second-guess it or flag it as a violation.

> **Action:** Add a note to §5: *"Nickname persistence via `localStorage.setItem('sylly_nickname', value)` is an intentional exception to the no-localStorage rule — it is a user preference, not game state, and is consistent with the 'settings may persist' provision in `CLAUDE.md`."*

---

### 1.2 `engine-multiplayer.js` — PWA Guardian Not Triggered [BLOCKER]

**Spec says:** Introduce `js/engine-multiplayer.js` as a new file.

**Missing:** The spec never addresses the Service Worker implications of this new file.

Per the PWA Guardian skill in `CLAUDE.md`, any new file that changes app state must answer:
- Will this work offline? (Multiplayer fundamentally requires network — but the file itself must still be cached)
- Does `sw.js` need updating?

**The new file must be precached or it won't load on subsequent PWA visits after the SW has cached the old asset list.**

> **Action:** Add a §9 (PWA & Service Worker) to the spec:
> - `js/engine-multiplayer.js` must be added to the precache list in `sw.js`
> - SW version must bump from v78 to **v79**
> - PeerJS library (if loaded from a CDN) requires a network connection — this is acceptable and expected, but the app must degrade gracefully if the library fails to load (show "Multiplayer unavailable offline" on the Mode Selection screen rather than a silent JS error)
> - PeerJS should be sourced from a **local file** at `js/lib/peerjs.min.js` (consistent with the existing `js/lib/tailwind-play.js` pattern and the zero-CDN constraint stated in §1)

---

### 1.3 New Screen IDs — Not Registered in `allScreens[]` [BLOCKER]

**Spec says:** New screens `screen-[game]-mode`, `screen-[game]-lobby-host`, `screen-[game]-lobby-join` will be created.

**Missing:** Every screen ID in this SPA must be registered in `allScreens[]` inside `engine.js`. An unregistered screen never gets hidden by `showScreen()` — it becomes a ghost screen that persists over everything else. This is the single most common audit failure in the project.

> **Action:** Add a §10 (New Screen Registry) listing every new screen ID explicitly. For the 8 games, that is 24 new screens minimum:

| Screen ID | Game | Purpose |
|-----------|------|---------|
| `screen-li5-mode` | LI5 | Mode selection (Pass-the-Phone / Host / Join) |
| `screen-li5-lobby-host` | LI5 | Host lobby — slot assignment |
| `screen-li5-lobby-join` | LI5 | Client join — room code entry |
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

All 24 IDs must be added to `allScreens[]` in `engine.js` and to the teardown logic in `resetToLobby()`.

---

### 1.4 Mode Selection Screen — Permanent Architectural Change Requires Documentation Pause [REQUIRED]

**Spec says:** The entry loop changes to: Title → Game Selection → Mode Selection Screen → Setup.

**Current flow:** Lobby → Game Menu → Setup.

Inserting a Mode Selection screen between Game Menu and Setup affects:
- The back-button chain for every game (8 games × new routing)
- `showScreen()` navigation calls in every plugin's lobby button listener
- `resetToLobby()` teardown (must also hide new screens)

This is a **permanent architectural change** that triggers the Documentation Pause Rule in `CLAUDE.md`. The Confluence Snapshot must be written and confirmed before implementation.

> **Action:** Add the following Confluence Snapshot to §2 or a new preamble section:
>
> **Decision:** Insert `screen-[game]-mode` between each game's menu screen and its setup/lobby screens.
>
> **Rationale:** Multiplayer requires a mode-selection step (Pass-the-Phone / Host Lobby / Join Lobby) before setup can proceed. This is the least-churn insertion point — the menu already exists as the natural gateway.
>
> **Technical Impact:**
> - Each game's "Let's Play!" button in its menu screen now navigates to `screen-[game]-mode` instead of directly to `screen-[game]-setup`
> - `screen-[game]-mode` back button navigates to the game's menu screen
> - Pass-the-Phone path on `screen-[game]-mode` navigates to the existing `screen-[game]-setup` (no change to setup or beyond)
> - Host path navigates to `screen-[game]-lobby-host`
> - Join path navigates to `screen-[game]-lobby-join`
> - All 24 new screen IDs added to `allScreens[]` and `resetToLobby()`

---

### 1.5 YGI "Hardcode" Instruction — Too Vague for Surgical Coding [REQUIRED]

**Spec says:** *"Claude must hardcode this behaviour explicitly into the unified rule files."*

**Problem:** This violates the Surgical Coding Protocol — logic must be described in plain English before code is written. "Unified rule files" is ambiguous (does it mean `game-identities.md`? A new constant in `ygi.js`?). The instruction also doesn't describe how the intercept triggers.

> **Action:** Replace the vague instruction with this explicit description:
>
> **YGI Multiplayer Mode Override (explicit logic):**
> When `ygiInitGame()` is called and `window.syllyMultiplayerMode !== 'single'`, the following must be forced regardless of the settings panel state:
> - `ygiVerdictStyle = 'secret-ballot'` (Your Call — individual voting)
> - The Verdict Style pill toggle in settings must be **disabled** (pointer events killed, visually greyed) on all non-Host devices so clients cannot override it
> - The Host settings panel may still display the toggle but it is locked to `secret-ballot` and cannot be changed while in Lobby Mode
> - This override is removed when `resetToLobby()` is called and `window.syllyMultiplayerMode` returns to `'single'`
>
> *Reasoning: The Consensus voting requires a single shared phone. In Lobby Mode, each device votes independently by definition, making Consensus physically impossible and "Your Call" the only valid mode.*

---

## Part 2 — Under-Specified Mechanics

### 2.1 PeerJS Library — Source & Load Order Unspecified [BLOCKER]

**Spec says:** "WebRTC via PeerJS utilizing the free, public cloud signaling server."

**Missing:** Where does PeerJS come from? The project has a hard constraint — zero external CDN dependencies (`CLAUDE.md`: "Local Tailwind (no CDN — fully offline)"). The load order in `CLAUDE.md` specifies `engine.js` loads first — where does `engine-multiplayer.js` sit?

> **Action:** Specify in §2:
> - PeerJS must be downloaded and hosted locally at `js/lib/peerjs.min.js`
> - Current stable version: PeerJS 1.5.x (as of Phase 21 planning — verify latest before implementation)
> - Load order becomes: `engine.js` → `engine-multiplayer.js` → `li5.js` → ... → `app.js`
> - `peerjs.min.js` loads **before** `engine-multiplayer.js`: `js/lib/tailwind-play.js` → `js/lib/peerjs.min.js` → `engine.js` → `engine-multiplayer.js` → [game plugins] → `secret-mode.js` → `app.js`
> - Both `peerjs.min.js` and `engine-multiplayer.js` added to `sw.js` precache list

---

### 2.2 Room Code Generation — Algorithm Unspecified [REQUIRED]

**Spec says:** A 4-character alphanumeric room code (e.g., `KRAK`) is displayed in Zone 1 of the Host Lobby.

**Missing:** How is it generated? What characters are allowed? How does a client use it to connect?

> **Action:** Add to §6 under Zone 1:
> - Room code = 4 uppercase alpha characters only (A–Z, no numbers, no ambiguous chars like O/0/I/1)
> - Generated by Host via: `Array.from({length:4}, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random()*23)]).join('')`
> - The room code IS the PeerJS peer ID suffix — Host's PeerJS ID is formatted as `sylly-[ROOMCODE]` (e.g., `sylly-KRAK`) to keep it memorable and human-typeable
> - Client constructs the host peer ID as `sylly-` + entered code.toUpperCase() and calls `peer.connect('sylly-KRAK')`
> - The "tap to copy" action in Zone 1 copies the full join URL: `[current URL]?join=KRAK` to the clipboard — enabling link-based joining as an alternative to manual code entry

---

### 2.3 VERSION_MISMATCH Overlay — Unregistered [REQUIRED]

**Spec says:** On version mismatch during handshake, the Host signals a `VERSION_MISMATCH` overlay.

**Missing:** This overlay is mentioned but has no HTML spec, no ID, no pattern classification (data overlay or decision modal?), and is not in any screen registry.

> **Action:** Specify in §4 or §10:
> - Overlay ID: `mp-version-mismatch-overlay`
> - Pattern: Decision modal (z-[90]) — global, not game-specific, lives in a new `<!-- ════ MULTIPLAYER ENGINE ════ -->` section of `index.html`
> - Content: "⚠️ Version Mismatch" heading + "A device is running an older version. Ask them to refresh their browser." subtext + single "Got it" dismiss button
> - Triggered on Host only; shown to Host via `engine-multiplayer.js`
> - Must be added to `resetToLobby()` teardown

---

### 2.4 "Session Ended: Host Disconnected" Overlay — Unregistered [REQUIRED]

**Spec says:** If the Host disconnects, all clients drop to a "Session Ended: Host Disconnected" overlay.

**Missing:** Same as above — no HTML spec, no ID, no z-index.

> **Action:** Specify:
> - Overlay ID: `mp-host-disconnected-overlay`
> - Pattern: Decision modal (z-[100]) — highest z to override any in-game state
> - Content: "📡 Session Ended" heading + "The Host has left the game." subtext + "Back to Menu" button
> - "Back to Menu" calls `resetToLobby()` which clears all state and returns to the title/lobby
> - Must be added to `resetToLobby()` teardown

---

### 2.5 Sync Lock — Location and API Unspecified [REQUIRED]

**Spec says:** "Implementation of a lightweight global state variable that toggles input responsiveness while awaiting Host data round-trips."

**Missing:** What is the variable name? Where does it live? What does toggling it actually do to the UI?

> **Action:** Specify in §2:
> - Variable: `window.syllySyncLocked = false` — lives in `engine-multiplayer.js`, exposed globally
> - When `syllySyncLocked = true`: all `.btn-mp-action` elements (a new CSS class applied to every submittable action in multiplayer-aware screens) get `pointer-events: none` and `opacity-60` applied via a CSS class `mp-sync-locked` toggled on `document.body`
> - CSS rule in `styles.css`: `.mp-sync-locked .btn-mp-action { pointer-events: none; opacity: 0.6; }`
> - Lock is set by the Sync Module immediately before dispatching an action to the Host
> - Lock is released when the Host's response SYNC packet arrives and state is applied
> - Timeout fallback: if no SYNC response within 8 seconds, lock releases and shows a brief "Connection slow..." toast — prevents permanent soft-lock on packet loss

---

### 2.6 "End Game" Host Capability — Mechanics Unspecified [REQUIRED]

**Spec says:** "The Host device retains ultimate administrative priority, including an explicit 'End Game' mechanism."

**Missing:** Where does the End Game button appear? What packet does it broadcast? What do clients see?

> **Action:** Specify in §5:
> - The Host's in-game screens display a small "End Session" option inside the existing settings/sound overlay footer (not a new button on every screen — too much UI churn)
> - Alternatively: accessible via a long-press (500ms) on the existing ✕ quit button — the quit overlay gains an additional "End for Everyone" option below the standard "Quit to Menu" when in Host mode
> - On confirm: Host broadcasts `{ type: "LOBBY", payload: { action: "HOST_END_GAME" }, originId: hostId, timestamp: ... }`
> - All clients receiving this packet immediately call `resetToLobby()` locally
> - Client screens show the `mp-host-disconnected-overlay` (reuses the disconnect overlay) before `resetToLobby()` clears it

---

### 2.7 Client State — What Does a Client Device Actually Run? [REQUIRED]

**Spec says:** The Sync Module intercepts actions, serialises them, and broadcasts via P2P. Clients "mirror" state.

**Missing:** This is the most critical under-specified area. There are two viable architectures and the spec doesn't commit to either:

**Architecture A — Thin Client:** Client devices only send inputs and render whatever state the Host broadcasts. They run no game logic locally. The Host runs all game logic and pushes state snapshots.

**Architecture B — Full Client:** Client devices run the full game plugin locally. The Sync Module ensures that when a state-changing action occurs, it is replicated to all peers so everyone's local state stays in sync.

These have very different implications for the codebase. Architecture B (Full Client) is far easier to implement without touching plugin files — which aligns with the spec's "minimal code churn" mandate. Architecture A requires plugins to be split into logic and render layers, which is major surgery.

> **Action:** Explicitly commit to Architecture B (Full Client / State Replication) in §2:
>
> *"Client devices run the complete game plugin locally. The Sync Module's role is not to relay game logic — it is to ensure that every state-changing user action is replicated identically across all devices. The Host's local execution is the source of truth. When the Host's game logic produces a state change (e.g., advances a round, resolves a match), the resulting state delta or trigger is broadcast to all clients so their local plugin executes the identical state transition. Clients do not compute outcomes independently — they receive a trigger from the Host and execute it locally."*

---

### 2.8 LI5 Opposing Team View — "Thematic Tracking Layout" Unspecified [REQUIRED]

**Spec says:** The opposing team's device "mirrors this exact dataset hidden inside a highly thematic tracking layout."

**Missing:** LI5 has a strong established thematic tone (Crayon Crew / Glue Stick Gang — child-like, playful). "Highly thematic" is mentioned but the layout is not described. Claude Code cannot build this without a spec.

> **Action:** Specify the opposing team's monitoring view for LI5:
> - Screen ID: `screen-li5-monitor` (new, must be registered)
> - Displays: The target word (shown prominently) + the No-No List words in a grid (same data as the active team's screen)
> - Thematic framing: styled as a "Tattletale Sheet" or "Cheat Sheet" — playful, child-like language consistent with LI5 tone
> - Purpose: Opposing team watches and listens for forbidden words being slipped. They tap a "CATCH!" button if they hear a slip
> - "CATCH!" tap broadcasts `{ type: "ACTION", payload: { action: "LI5_CATCH", playerTeam: "B" }, ... }` to the Host
> - Host validates the catch against current game state and responds with SYNC packet
> - Note: The catch mechanic and its resolution need to be fully specced — does the opposing team get a point? Does the round end? This must match existing LI5 scoring rules

---

### 2.9 LTTP Interstitial Message Loop — Conflict with Existing Architecture [REQUIRED]

**Spec says:** "When a message is dispatched from Player X, an explicit alert overlay interrupts all connected screens."

**Problem:** LTTP already has a complex overlay stack (`lttp-suspicion-overlay`, `lttp-smalltalk-overlay`, `lttp-confirm-overlay`, `lttp-history-overlay`, `lttp-guess-map-overlay`). An interrupting overlay that fires on ALL devices simultaneously risks z-index and state conflicts — especially if a player already has an overlay open.

> **Action:** Specify the interrupt overlay:
> - Overlay ID: `mp-lttp-message-interrupt-overlay`
> - z-index: `z-[110]` — above all existing LTTP overlays (current max is z-[95] for `lttp-guess-map-overlay`)
> - Before showing the interrupt on a device, all currently open LTTP overlays on that device are closed first (to prevent stacking)
> - On dismiss ("OK"), closed overlays are NOT reopened — player returns to their base screen
> - The interrupt broadcasts as a SYNC packet — the Host sends it, all peers (including Host) receive and display it simultaneously

---

### 2.10 NAT Multiplayer — "Greyed Out Entry Spaces" Implementation [REQUIRED]

**Spec says:** Non-active players "keep their normal screen but only their active entry spaces are dynamically greyed out, rendering contextual thematic phrases like 'Waiting for Player X's observation...'"

**Missing:** NAT's observation screen (`screen-nat-observation`) currently shows a single-player clue input. In multiplayer, non-active players see this screen in a read-only state. How does the device know who is "active"?

> **Action:** Specify:
> - The Host broadcasts a SYNC packet `{ type: "SYNC", payload: { action: "NAT_ACTIVE_PLAYER", playerIdx: N, playerName: "Dave" }, ... }` at the start of each player's observation turn
> - Each client checks if their assigned `playerIdx` matches `payload.playerIdx`
> - Match: input enabled, normal UI
> - No match: input `disabled` + `opacity-60`, text replaced with "Waiting for [playerName]'s observation..." in NAT-themed language (e.g., "Field Researcher [Name] is recording their observation...")
> - The Handover screen (`screen-nat-handover`) is **skipped** in multiplayer — it exists only for pass-the-phone. The SYNC packet replacing it handles the device-to-device handoff

---

## Part 3 — Missing Sections Entirely

### 3.1 Missing: `resetToLobby()` Teardown Additions [BLOCKER]

`resetToLobby()` in `engine.js` is the cold-boot reset function. It must clear everything. For multiplayer, it additionally needs to:

> **Add to §2 or §9:**
> - Destroy active PeerJS connections: `if (window.syllyPeer) { window.syllyPeer.destroy(); window.syllyPeer = null; }`
> - Reset `window.syllyMultiplayerMode = 'single'`
> - Reset `window.syllySyncLocked = false`
> - Close and hide all multiplayer engine overlays: `mp-version-mismatch-overlay`, `mp-host-disconnected-overlay`, `mp-lttp-message-interrupt-overlay`
> - Remove `mp-sync-locked` class from `document.body`

---

### 3.2 Missing: `code-map.md` Update [REQUIRED]

The project maintains `docs/code-map.md` as a surgical reference for all game IDs, overlays, and key functions. The spec introduces a significant number of new symbols that must be documented there.

> **Add to spec as a post-implementation doc requirement:**
> After implementation, `docs/code-map.md` must be updated with:
> - All new screen IDs (24 game screens + any shared engine screens)
> - All new overlay IDs (at minimum: `mp-version-mismatch-overlay`, `mp-host-disconnected-overlay`, `mp-lttp-message-interrupt-overlay`)
> - `engine-multiplayer.js` function catalogue
> - New global variables: `syllyMultiplayerMode`, `syllySyncLocked`, `syllyPeer`, `syllyConnections[]`

---

### 3.3 Missing: `index.html` Section Header [REQUIRED]

Every game and major feature has a `<!-- ════ GAME NAME ════ -->` section header comment in `index.html`. The multiplayer screens need their own section.

> **Add to spec:**
> - A new `<!-- ════ MULTIPLAYER ENGINE ════ -->` section in `index.html` housing:
>   - All 24 `screen-[game]-mode`, `screen-[game]-lobby-host`, `screen-[game]-lobby-join` screens
>   - All shared multiplayer overlays (`mp-version-mismatch-overlay`, `mp-host-disconnected-overlay`)
>   - Placed after all game sections, before `<script>` tags

---

### 3.4 Missing: DSD Captain Obfuscation — How? [REQUIRED]

**Spec says:** "Captain screens are structurally obfuscated from the crew."

DSD already has a pass-gate pattern (`dsdShowPassGate`) that gates the Captain screen. In multiplayer, the Captain screen appears on ONE device only. But the spec doesn't explain the mechanism for making crew devices show a different view.

> **Action:** Specify:
> - When the Host broadcasts `{ type: "SYNC", payload: { action: "DSD_CAPTAIN_ACTIVE", captainName: "Dave", teamIdx: 0 }, ... }`:
>   - The device whose assigned player matches `captainName` (or whose `playerIdx` matches) shows `screen-dsd-captain` normally
>   - All other devices show a read-only "crew standby" view: the public grid (no colour coding, just the unrevealed/revealed state visible to all), plus `dsdTurnLog[]` history — no Captain-specific information
>   - The crew standby view can reuse or extend `screen-dsd-crew` with input elements disabled
> - The spec's statement "Grid data presentation remains exposed to all connected devices" means ALL devices can see WHICH cells have been revealed — but only the Captain device sees the colour-coded Deep Trench view

---

### 3.5 Missing: SS Hybrid Mode — 2-Device Team Specifics [REQUIRED]

**Spec says:** "2-Device Team: Behaves as a team-alternating pass loop where the standby terminal is locked out from inputs until the structural simultaneous response phase occurs."

Secret Signals is the most complex game in the roster. "Simultaneous response phase" is not defined for multiplayer.

> **Action:** Specify:
> - In 2-Device Team mode, Device A = Team Alpha Echo, Device B = Team Bravo Zulu
> - During Team A's encoding turn: Device A shows the active encoder's clue input; Device B shows a locked "Standby" state with the historical log visible (same content as `screen-ss-intercept` but locked)
> - The "simultaneous response phase" = the Intercept phase where Team B submits their decode attempt. In 2-Device mode, Team B (Device B) submits their 3-number code as normal; Device A is locked during this phase
> - Vault reveal remains pass-the-phone within each team (2-Device mode does not eliminate intra-team passing — only inter-team passing is eliminated)
> - The `screen-ss-decode-gate` pass-gate still applies within each device for any private role reveal

---

### 3.6 Missing: How Does "Join by URL" Work? [REQUIRED]

§6 mentions tapping the room code copies "the join URL to clipboard" but never explains what that URL does.

> **Action:** Specify in §6 Zone 1:
> - Join URL format: `https://[deployed-app-url]/?join=KRAK`
> - On page load, `engine-multiplayer.js` checks `new URLSearchParams(window.location.search).get('join')`
> - If a join code is found, the app navigates directly to the appropriate game's `screen-[game]-lobby-join` with the room code pre-filled
> - **Problem:** The join URL doesn't know which game is being played. Two options:
>   - Option A: URL includes game: `?join=KRAK&game=li5` — Host constructs this; simpler
>   - Option B: Client enters game independently on Mode Selection, then enters code — more friction
> - **Recommendation:** Option A. URL format: `?join=KRAK&game=li5`. Host's clipboard copy includes both params.

---

### 3.7 Missing: Phase Snapshot & Audit Gate [REQUIRED]

The `CLAUDE.md` Phase Gate skill requires: before writing the first line of code for a new phase, the Skeleton-First protocol (Steps 1–4 from `phase-audit.md`) must be confirmed.

The spec currently functions as the plan but not as the phase gate document.

> **Action:** The multiplayer spec (v1.4, incorporating all above changes) should be confirmed as the Phase 21 planning document. Before Claude Code writes a single line, it should:
> 1. Confirm SW version bump (v78 → v79)
> 2. Confirm `engine-multiplayer.js` skeleton (no logic, just file structure + global declarations)
> 3. Confirm `allScreens[]` additions in `engine.js` (24 new IDs)
> 4. Confirm `resetToLobby()` additions
> 5. Only then begin implementing screens and logic

---

## Part 4 — Minor Gaps & Clarifications

### 4.1 Nickname Validation Rules — Unspecified
The spec says an empty nickname triggers a shake animation. What other rules apply?
> Add: Max length (suggest 12 chars), no validation beyond non-empty (no special char restrictions — it's a party game).

### 4.2 Room Code — What Happens on Collision?
If two hosts generate the same 4-letter code simultaneously (rare but possible), PeerJS will throw a "peer ID taken" error.
> Add: On PeerJS ID-taken error, silently regenerate a new code and retry once. If second attempt also fails, show "Couldn't create room — try again" toast and remain on the mode screen.

### 4.3 Envelope `timestamp` — Client Clock Skew
Using `Date.now()` for timestamps across devices will produce inconsistent values due to clock skew.
> Add: The `timestamp` field is for logging/debugging only — not used for ordering or validation. The Host's receipt order is authoritative. Do not implement any logic that depends on comparing timestamps across devices.

### 4.4 Max Player Count in Lobby Mode
The spec doesn't state a maximum connected device count.
> Add: Maximum 6 devices in a single session (matching the highest player count game — JEC supports 6 chefs). The lobby CTA (`Let's Sail!` etc.) is disabled if connected device count exceeds the game's `maxPlayers` for that session.

### 4.5 `screen-li5-monitor` Missing from Screen Registry
Identified in §2.8 above — the LI5 opposing team monitoring screen is an entirely new screen not mentioned in the screen registry.
> Add `screen-li5-monitor` to the §10 screen registry table.

### 4.6 Audio in Multiplayer
The spec doesn't address audio. Each device has its own Web Audio API context. Correct behaviour:
> Add to §2: Audio plays locally on each device based on local state changes triggered by incoming SYNC packets. No audio is broadcast over the network. Each device's existing `play*()` functions fire normally when their local state updates.

### 4.7 Settings Sync — Does the Host Push Settings to Clients?
When the Host configures game settings before launching, client devices need to match those settings exactly (e.g., timer length, difficulty, etc.).
> Add to §4 Synchronization Strategy: During the lobby phase, before `Let's Sail!`, the Host broadcasts a `LOBBY` packet with `{ action: "SETTINGS_SYNC", gameSettings: { ... } }` containing the full serialised settings object. Clients apply these settings and disable their local settings panels (render as read-only). Only the Host can change settings.

---

## Part 5 — Recommended Spec Structure for v1.4

Based on all the above, the revised spec should have these sections:

```
§1  Core Objectives (unchanged)
§2  Technical Architecture & Constraints (+ PeerJS source, Sync Lock spec, Architecture B declaration, Confluence Snapshot)
§3  Communication Protocol — The Envelope (unchanged + timestamp caveat)
§4  Operational Protocols (+ Settings Sync, version mismatch overlay spec)
§5  Global UI/UX Specifications (+ End Game mechanic, localStorage note, max players)
§6  Engine Solutions & Friction Mitigations (+ Room Code algorithm, join URL format, collision handling)
§7  Per-Game Engine Configurations (+ LI5 monitor spec, YGI hardcode spec, DSD obfuscation spec, SS hybrid spec, NAT active player spec, LTTP interrupt overlay spec)
§8  Test Cases (unchanged)
§9  PWA & Service Worker (NEW — PeerJS local file, SW v79, precache additions)
§10 New Screen Registry (NEW — all 24+ screen IDs)
§11 Engine Teardown Additions (NEW — resetToLobby() additions)
§12 Implementation Order (NEW — see below)
```

---

## Part 6 — Recommended Implementation Order for Claude Code

To minimise risk and allow incremental testing, implement in this order:

**Sprint 1 — Foundation (no game logic yet)**
1. Download PeerJS → `js/lib/peerjs.min.js`
2. Create `js/engine-multiplayer.js` skeleton (globals only: `syllyMultiplayerMode`, `syllySyncLocked`, `syllyPeer`)
3. Add `engine-multiplayer.js` + `peerjs.min.js` to `sw.js` precache → bump to v79
4. Add all 24+ screen IDs to `allScreens[]` in `engine.js`
5. Add multiplayer overlay teardown to `resetToLobby()`
6. Add `<!-- ════ MULTIPLAYER ENGINE ════ -->` section stub to `index.html`

**Sprint 2 — Shared UI**
7. Build `screen-[game]-mode` (Mode Selection Screen) — one template, apply to all 8 games
8. Build `screen-[game]-lobby-host` (Host Lobby) — one template, parameterised per game
9. Build `screen-[game]-lobby-join` (Client Join) — one template, shared
10. Build global MP overlays (`mp-version-mismatch-overlay`, `mp-host-disconnected-overlay`)
11. Nickname persistence (`localStorage`)
12. CSS: `overscroll-behavior-y: none` + sync lock styles

**Sprint 3 — P2P Infrastructure**
13. PeerJS connection lifecycle in `engine-multiplayer.js` (Host create, Client join, handshake, disconnect handlers)
14. Envelope send/receive functions
15. Settings sync LOBBY packet
16. Sync Lock toggle
17. End Game mechanism

**Sprint 4 — Per-Game Intercepts (one game at a time, simplest first)**
18. Great Minds (simplest — 2 players, simultaneous input, clean intercept)
19. JEC (parallel inputs, readyCheck matrix)
20. YGI (simultaneous input + voting, mode override)
21. NAT (sequential turns, active player broadcast)
22. LI5 (2-device team, monitor screen)
23. DSD (hybrid, Captain obfuscation)
24. SS (most complex — hybrid mode, vault privacy)
25. LTTP (most complex — message interrupt, tab navigation preservation)

**Sprint 5 — Audit & Polish**
26. End-to-end test all 8 test scenarios from §8
27. Protocol A audit of all new screens (alignment, overlays, ✕ buttons, sound controls)
28. Update `docs/code-map.md`
29. Write Phase 21 snapshot

---

*Review complete. All items above should be incorporated into v1.4 of the spec before handing to Claude Code. Items marked [BLOCKER] must be resolved before implementation begins. Items marked [REQUIRED] must be resolved before that game's sprint begins.*
