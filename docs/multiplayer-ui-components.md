# Multiplayer UI Components — Little Sylly Games
**Purpose:** Reference catalogue for all reusable multiplayer components.
**Updated:** Phase 22 (MFS v1.4 complete)

---

## Design Principle — Build Once, Reuse Eight Times

All multiplayer UI is **shared and parameterised** — not cloned per game. Three screen elements
serve all 8 games by being populated dynamically via JS before display. This avoids 24 near-
identical screen duplicates in `index.html`.

The spec described "25 new screens" (3 per game × 8 + 1 LI5 monitor). The actual implementation
has **4 screen elements** total:

| Screen ID | Serves | Parameterised by |
|-----------|--------|-----------------|
| `screen-mp-mode` | All 8 games | `mpShowModeScreen(abbr)` |
| `screen-mp-lobby-host` | All 8 games | `mpShowLobbyHost()` + `MP_GAME_CONFIGS[abbr]` |
| `screen-mp-lobby-join` | All 8 games | `mpShowLobbyJoin()` + `MP_GAME_CONFIGS[abbr]` |
| `screen-li5-monitor` | LI5 only | `LI5_ROUND_START` SYNC payload |

---

## Shared Screen 1 — Mode Selection (`screen-mp-mode`)

**Trigger:** "Let's Play!" on any game's menu screen → `mpShowModeScreen(abbr)` → `showScreen('screen-mp-mode')`

**Layout:** `h-screen overflow-hidden` (sticky-footer pattern)

**Dynamic elements populated by `mpShowModeScreen(abbr)`:**

| Element ID | Populated with |
|------------|---------------|
| `#mp-mode-emoji` | `MP_GAME_CONFIGS[abbr].emoji` |
| `#mp-mode-game-name` | `MP_GAME_CONFIGS[abbr].gameName` |
| `#btn-mp-mode-cta` text | `MP_GAME_CONFIGS[abbr].lobbyCtaLabel` |
| `#mp-mode-ptp-section` visibility | Hidden if `MP_GAME_CONFIGS[abbr].multiplayerOnly` |
| `#mp-mode-offline-notice` visibility | Shown if no internet detected |
| `#mp-mode-section-lobby` opacity | Faded if no internet detected |

**Mode selection cards** (`mp-mode-select-host`, `mp-mode-select-join`, `mp-mode-select-ptp`):
- Each card has a `.mp-mode-dot` radio indicator
- `mpSetModeSelection(mode)` activates the correct dot and enables the CTA

**Protocol A:** Has `btn-open-sound` ✓ | Has ✕ (`btn-mp-mode-exit`) ✓

---

## Shared Screen 2 — Host Lobby (`screen-mp-lobby-host`)

**Trigger:** Host selects "Host Lobby" → pre-lobby nickname overlay → `mpHostCreateRoom()` → `mpShowLobbyHost()`

**Layout:** `h-screen overflow-hidden` (three-zone: header / player dock / footer)

**Dynamic elements:**

| Element ID | Purpose |
|------------|---------|
| `#mp-lobby-host-room-code` | Displays generated 4-char room code; tap to copy |
| `#mp-lobby-players-list` | Populated by `mpRenderHostPlayerList()` as clients join |
| `#mp-lobby-host-waiting` | "Waiting for players…" — hidden when ≥1 player in dock |
| `#mp-lobby-zone2` | Session mode pills (2-Device Teams / Individual) — hidden for non-hybrid games |
| `#btn-mp-lobby-host-cta` | Disabled until ≥1 player joined; label from `MP_GAME_CONFIGS[abbr].lobbyCtaLabel` |

**Zone 2 visibility:** Hidden for all games except SS and DSD (`supportsHybrid: true` in config).

**CTA tap:** Sends `SETTINGS_SYNC` packet (serialised via `mpSerialiseSettings(abbr)`) then `GAME_START` packet → calls `MP_GAME_CONFIGS[abbr].onPassThePhone()`.

**Protocol A:** Has `btn-open-sound` ✓ | Has `← Cancel` (`btn-mp-lobby-host-cancel`) ✓

---

## Shared Screen 3 — Client Join (`screen-mp-lobby-join`)

**Trigger:** Client selects "Join Lobby" → `mpShowLobbyJoin()`

**Layout:** `h-screen overflow-hidden`

**Input elements:**

| Element ID | Purpose |
|------------|---------|
| `#mp-join-c1` – `#mp-join-c4` | 4-char room code — one character per box; auto-advances on input |
| `#mp-join-nickname-input` | Player nickname (max 12 chars, stored in `localStorage` via `mpSaveNickname`) |
| `#mp-join-status` | Join status feedback ("Joining…", "Room not found", etc.) |
| `#btn-mp-join-enter` | Disabled until all 4 code boxes filled; calls `mpClientJoinRoom()` |

**Protocol A:** Has `btn-open-sound` ✓ | Has `← Cancel` (`btn-mp-join-cancel`) ✓

---

## Game-Specific Screen — LI5 Monitor (`screen-li5-monitor`)

**Purpose:** Opposing team's device in a LI5 Lobby Mode session. Shows the current word + No-No
List so the passive team can watch for rule breaks. Populated via Firebase SYNC.

**Layout:** `min-h-screen overflow-y-auto` (centred content — no sticky footer)

**Dynamic elements:**

| Element ID | Populated by |
|------------|-------------|
| `#li5-monitor-word` | `SYNC: LI5_ROUND_START` → `payload.word` |
| `#li5-monitor-nono-list` | `SYNC: LI5_ROUND_START` → `payload.nonoList` (rendered as `<li>` items) |

**CATCH! button:** `#btn-li5-catch` — sends `ACTION: LI5_CATCH` to Host device. No automatic scoring change — Host receives alert as a visual pulse.

**Protocol A:** Has `btn-open-sound` ✓ | Has ✕ (`btn-li5-monitor-exit`) ✓
- ✕ calls `playExit(); mpTeardown(); resetToLobby()` — direct teardown (passive spectator, no confirm overlay needed)

---

## Global Overlays

All four global overlays use the **Decision Modal** pattern (Pattern 2).
Inner class (exact — never deviate): `overlay-modal-inner bg-stone-50 w-full max-w-sm rounded-3xl px-6 pt-6 pb-8 flex flex-col gap-4 text-center`

---

### `mp-network-error-overlay` — Firebase Load Failure

| Property | Value |
|----------|-------|
| z-index | z-[90] |
| Emoji | 📶 |
| Heading | "Lobby Mode Unavailable" |
| Body | "Couldn't connect to the server…" |
| Button ID | `btn-mp-network-error-ok` |
| Button label | "OK" |
| Triggered by | Firebase lazy-load timeout in `mpShowModeScreen()` |
| On dismiss | Hides overlay; user can still use Pass-the-Phone |

---

### `mp-version-mismatch-overlay` — SW Version Mismatch

| Property | Value |
|----------|-------|
| z-index | z-[90] |
| Emoji | ⚠️ |
| Heading | "Version Mismatch" |
| Body | "A player is on an older version…" |
| Button ID | `btn-mp-version-mismatch-ok` |
| Button label | "Got it" |
| Triggered by | Handshake: client `swVersion` !== host `swVersion` |
| Shown on | Host device only |

---

### `mp-host-disconnected-overlay` — Host Disconnect

| Property | Value |
|----------|-------|
| z-index | z-[100] |
| Emoji | 📡 |
| Heading | "Host Disconnected" |
| Body | "The host left the session…" |
| Button ID | `btn-mp-host-disconnected-ok` |
| Button label | "Back to Lobby" |
| Triggered by | Firebase `.onDisconnect()` sentinel on host room node |
| Shown on | All client devices |
| On dismiss | `mpStopListeners(); resetToLobby()` |

---

### `mp-lttp-message-interrupt-overlay` — LTTP Message Broadcast

| Property | Value |
|----------|-------|
| z-index | z-[105] |
| Emoji | 💬 |
| Heading | `#mp-lttp-interrupt-heading` — populated with "From [Name] → [Name]" |
| Body | `#mp-lttp-interrupt-body` — populated with the message text |
| Button ID | `btn-mp-lttp-interrupt-ok` |
| Button label | "OK" |
| Triggered by | `SYNC: LTTP_MESSAGE_INTERRUPT` — fires on ALL devices simultaneously |
| On dismiss (active) | `lttpShowChat(lttpActiveIdx)` |
| On dismiss (passive) | Returns to whatever screen the device was on |

Note: z-[105] is the highest non-sound overlay z-index (sound overlay is z-[110]). The
LTTP interrupt must appear above all other game overlays.

---

### `mp-host-prelobby-overlay` — Nickname Entry (Host)

This overlay appears before the Host Lobby screen. It is **not a global error overlay** — it is
part of the host setup flow. Included here for completeness.

| Property | Value |
|----------|-------|
| z-index | z-[90] |
| Emoji | 🖥 |
| Heading | "Host a Lobby" |
| Input | `#mp-host-nickname` — pre-filled from `localStorage` if previously set |
| Button | `#btn-mp-host-generate` — disabled until nickname non-empty |
| Cancel | `#btn-mp-host-prelobby-cancel` |
| Triggered by | User selects "Host Lobby" mode + taps CTA |

---

## CSS Behaviour — Sync Lock

**Class:** `btn-mp-action` — added to every submittable button in multiplayer-aware screens.

**On `mpLockSync()`:**
1. `document.body.classList.add('mp-sync-locked')`
2. CSS rule: `.mp-sync-locked .btn-mp-action { opacity: 0.5; pointer-events: none; }`
3. All `btn-mp-action` buttons across all screens grey out and become non-interactive
4. Auto-release timeout: 8 seconds (prevents permanent lock on dropped packets)

**On `mpUnlockSync()`:**
1. `document.body.classList.remove('mp-sync-locked')`
2. All `btn-mp-action` buttons restore to interactive

This mechanism prevents double-submission during Firebase round-trip latency.

---

## `MP_GAME_CONFIGS` — Per-Game Reference

The central config registry in `engine-multiplayer.js`. Drives dynamic parameterisation of all shared screens.

| Key | LI5 | GM | SS | JEC | YGI | LTTP | NAT | DSD |
|-----|-----|----|----|-----|-----|------|-----|-----|
| `gameName` | "Like I'm Five" | "Great Minds" | "Secret Signals" | "Just Enough Cooks" | "You Get It?" | "Late to the Party" | "Natural Selection" | "Deep-Sea Deploy" |
| `emoji` | 🧒 | 🧠 | 📡 | 🍳 | 🃏 | 🎉 | 🦁 | ⚓ |
| `brandBtnClass` | pink-500 | purple-500 | teal-500 | amber-500 | orange-500 | red-500 | lime-600 | cyan-700 |
| `lobbyCtaLabel` | "Play Time!" | "Let's Play!" | "Let's Play!" | "Let's Cook!" | "Show Your Take 🃏" | "Find The Location!" | "Begin Observation" | "Let's Sail!" |
| `supportsHybrid` | false | false | true | false | false | false | false | true |

---

## Key Functions Reference

| Function | Location | Purpose |
|----------|----------|---------|
| `mpShowModeScreen(abbr)` | engine-multiplayer.js | Parameterises + shows `screen-mp-mode` |
| `mpShowLobbyHost()` | engine-multiplayer.js | Shows `screen-mp-lobby-host` |
| `mpShowLobbyJoin()` | engine-multiplayer.js | Shows `screen-mp-lobby-join` |
| `mpSetModeSelection(mode)` | engine-multiplayer.js | Updates mode card radio state + enables CTA |
| `mpLockSync()` | engine-multiplayer.js | Activates sync lock — greys `btn-mp-action` buttons |
| `mpUnlockSync()` | engine-multiplayer.js | Releases sync lock |
| `mpSendEnvelope(env)` | engine-multiplayer.js | Async Firebase write with envelope schema |
| `mpHandleEnvelope(env)` | engine-multiplayer.js | Routes incoming envelopes to game-specific handlers |
| `mpSerialiseSettings(abbr)` | engine-multiplayer.js | Serialises host's current game settings for `SETTINGS_SYNC` |
| `mpRenderHostPlayerList()` | engine-multiplayer.js | Renders joined player chips in host lobby |
| `mpHostCreateRoom()` | engine-multiplayer.js | Async — creates Firebase room, starts listener |
| `mpClientJoinRoom()` | engine-multiplayer.js | Async — joins Firebase room by code |
| `mpStartEventListener()` | engine-multiplayer.js | Attaches Firebase `onValue` listener |
| `mpStopListeners()` | engine-multiplayer.js | Detaches all Firebase listeners |
| `mpGetNickname()` / `mpSaveNickname(v)` | engine-multiplayer.js | `localStorage` helpers for `sylly_nickname` |
| `mpGenerateRoomCode()` | engine-multiplayer.js | Returns a random 4-char uppercase alphanumeric code |
