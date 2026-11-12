# Multiplayer Rules — Little Sylly Games

> **On-demand.** Moved out of `.claude/rules/logic-engine.md` on 12 Nov 2026 to cut the always-loaded
> baseline (~25 KB). The headline rules stay in `logic-engine.md` § Multiplayer Sync Module. **Read this
> file whole** before touching any MP send site or applier, `MP_GAME_CONFIGS`, a quit-confirm handler,
> `engine-multiplayer.js` or `engine-intro.js`. Full protocol reference:
> `docs/multiplayer-feature-specification-v1.4.md`.

## Multiplayer Sync Module

**JS file:** `js/engine-multiplayer.js` — loaded after `engine.js`, before `secret-mode.js`.
**Full reference:** `docs/multiplayer-ui-components.md` | `docs/code-map.md` (Multiplayer Module section)

### Globals

| Variable | Type | Default | Rule |
|----------|------|---------|------|
| `syllyMultiplayerMode` | string | `'single'` | `'single'` / `'host'` / `'client'` — every plugin branches on this |
| `syllySyncLocked` | bool | `false` | True while awaiting Firebase; blocks resubmission |
| `syllyDeviceUid` | string | `null` | Anonymous UID; set by `firebase-init.js` after `signInAnonymously`; memory-only (not localStorage) |
| `syllyFirebase` | object | `null` | Lazy-loaded — null on app boot; loaded when user taps "Host Lobby" or "Join Lobby" |
| `mpLobbyStyle` | string | `'individual'` | `'team'` (TLM — teams share a device) / `'individual'` (MDLM — each player own device); set at mode selection; broadcast in `GAME_START`; reset in `resetToLobby()` |
| `mpPlayersListener` | function\|null | `null` | `onValue` unsubscribe for `/players` node; active during host lobby only; cancelled in `mpStopListeners()` and before GAME_START in `mpConfirmRoster()` |
| `window.mpClientPlayerRef` | Firebase ref\|null | `null` | Reference to client's own `/players/{uid}` node; used for explicit removal on leave/cancel; set in `mpClientJoinRoom()`, cleared in `resetToLobby()` and cancel handler |
| `mpPrivateListener` | function\|null | `null` | `onChildAdded` unsubscribe for this device's own `/private/{uid}` queue node; started via `mpStartPrivateListener()` after room create/join; cleared in `mpStopListeners()` |

**Private channel (Phase 36 — True Network Privacy):**
`mpSendPrivate(targetUid, envelope)` — writes an envelope to `rooms/{code}/private/{targetUid}` in Firebase instead of the public `/events` channel. Used for hand distribution when card content must not be visible to other devices at the network level. First use: FLW (`FLW_HAND`, `FLW_DRAW`, `FLW_PEEK`, `FLW_LEAK`, `FLW_EMERALD_OFFER`). This is a stronger privacy model than the couch-security broadcast-and-render-own pattern (NAT/FRT/BLD/SHP) — appropriate when any game mechanic depends on opponents not knowing a player's hand even if they inspect Firebase. **Host → seat is covered by the room's host `.write`; client → host (CLD's `CLD_COMMIT`, the only one) needs the `private/$uid/$msg` rule** — the live rules are `multiplayer-feature-specification-v1.4.md` §2.7 verbatim; a new writer on any path updates that file and the console together (`shared-implementation-notes.md` BUG-26).

**Private hands need a private REPAIR packet, not just a private deal.** Any state a game keeps privately per device (a hand, a rack, a secret tile set) has a host-side mirror, and **every** operation that mutates the mirror — deal, draw, **play**, discard, steal — needs its own private packet to that state's owner. The public SYNC cannot carry the repair: the whole point of the model is that the public channel carries *counts*, never contents. Two rules that make this reliable: (1) send the **whole** collection, not a delta, so a dropped packet self-corrects on the next mutation; (2) put the send inside the **single function where cards leave the collection**, never once per applier — a new applier added later then inherits it for free. Reference: `PKO_HAND_SYNC` in `js/games/pko.js`. Detail: `pko-impl-notes` ML-06.

`mpStartPrivateListener()` — attaches `onChildAdded` to `rooms/{code}/private/{syllyDeviceUid}`. Events are ts-filtered (ignores events before join time) and self-origin-filtered (drops own writes that also appear via indexing). Routes all received packets through `mpHandleEnvelope`. Called in both `mpHostCreateRoom()` and `mpClientJoinRoom()` immediately after `mpStartEventListener()`. **Rule:** any game using `mpSendPrivate` for any phase must call `mpStartPrivateListener()` in its `onPassThePhone` — the engine already calls it globally, but if a game adds private-channel phase handling after the fact, verify the listener is active.

**`window.` prefix rule — split declaration types:**
- `window.syllyMultiplayerMode`, `window.syllySyncLocked`, `window.syllyFirebase`, `window.syllyDeviceUid`, `window.mpLobbyStyle`, `window.mpClientPlayerRef`, `window.mpLobbyRoster`, `window.mpLobbyRosterTeamNames`, `window.mpLobbyRosterCaptainNames` — declared with `window.` explicitly at the top of `engine-multiplayer.js`. These ARE on `window` and must be accessed with the `window.` prefix. All game plugin files use `window.syllyMultiplayerMode` etc. — this is correct.
- `mpMyPlayerIdx`, `mpPlayerSlots`, `mpActiveGame`, `mpActiveGameConfig`, `mpActiveRoomCode`, `mpRoomRef`, `mpEventsListener`, `mpRoomListener`, `mpPlayersListener`, `mpPrivateListener`, `mpSyncLockTimer`, `mpJoinListenFrom` — declared with `let` at script top-level. These are NOT on `window`. Always access these directly — never `window.mpMyPlayerIdx`. That returns `undefined` silently. BLD Bug 8 was caused by this. Reference implementations for correct access: NAT.js, DSD.js.

### MP_GAME_CONFIGS Entry Schema

Every game registers one entry in `MP_GAME_CONFIGS` (`engine-multiplayer.js`). The
mode/lobby screens read these fields directly — **a missing display field renders the
literal string `undefined` on `screen-mp-mode`**, and a missing player-count getter
lets the lobby start a game outside its real bounds.

Required fields for every entry (grounded in the `li5` entry, `engine-multiplayer.js`):

| Field | Type | Purpose / failure mode |
|-------|------|------------------------|
| `gameName` | string | Title on the mode/lobby screens — missing → "undefined" |
| `emoji` | string | Icon on the mode/lobby screens |
| `brandBtnClass` | string | `bg-[brand] hover:bg-[brand-dark]` for the primary lobby CTA |
| `ptpLabel` / `lobbyCtaLabel` | string | CTA labels — missing → "undefined" on the button |
| `menuScreen` | string | Screen the game returns to from the lobby |
| `onPassThePhone` | function | Post-lobby entry — populates names + starts the game (host) / shows standby (client) |
| `recommendedMode` | string | `'ptp'` / `'tlm'` / `'mdlm'` |
| `supportedModes` | string[] | The modes offered on `screen-mp-mode`; an MDLM-only game lists `['mdlm']` |
| `multiplayerOnly` | bool | Informational only — enforcement comes from `supportedModes` (see § MDLM Patterns) |
| `ctaTextClass` | string (optional) | Overrides the `screen-mp-mode` CTA's text colour — defaults to `text-white`. **No game sets it as of 10 Sep 2026** (suite-wide brand-fill + white-ink rule — even the light-fill brands FRT/YGI/COMB/CLD take white; see `ui-style.md` § Action Button Standard → "Locked per-game button scheme"). Left in the schema for a future genuine need; don't re-add it as a contrast fix on those four. |
| `rosterConfig` | object | `{ type, ... }` — use `type: 'none'` for automatic/random seating |
| `getMaxPlayers` | () => int | Upper bound enforced by the lobby |
| `getMinPlayers` | () => int | Lower bound — **mandatory for any game with a minimum above 2** (role-table games, e.g. BLD min 5). Omitting it let BLD start under-strength. Defaults to the engine minimum when absent. |
| `bots` | object (optional) | Bot seats (SW v247): `{ names, pillClass, view(idx), decide(view, difficulty, rng), submit(idx, move, tag), thinkMs? }`, all host-only arrow wrappers. Requires `rosterConfig.type: 'none'`; `'solo'` in `supportedModes` requires it. See § Bots |
| `intro` | object (optional) | The match-start Intro (SW v264): `{ template, scene?, brief?, lineup? }`. A `lineup` requires `rosterConfig.type: 'none'`. See § Entry seam |

**A lobby bound may read NOTHING that a post-lobby screen sets.** `getMaxPlayers`/`getMinPlayers`
are consulted at exactly two moments — `mpRenderHostPlayerList()` while the room fills, and the room
node's `maxPlayers` at create time — both of them *before* any of the game's own screens have been
shown. So a bound reading a game-local setup variable (`ssPlayerCount`, `jecPlayerCount`,
`ygiPlayerCount`, `lttpPlayerCount`, `dsdPlayersPerTeam`) resolves against that variable's
**declared default**, permanently: the Pass-the-Phone screen that moves it is skipped entirely in
Lobby Mode, and the game's own `onPassThePhone` overwrites it from the roster far too late to
matter. All five capped their rooms at 4 while their Pass-the-Phone setup offered 6, with nothing
anywhere explaining why a 5th join bounced. **Return the game's true range as constants.**

The one legitimate input beyond a constant is `window.mpLobbyStyle` (a TLM room is 2 devices where
an MDLM room is N). A **pre-lobby setting** — chosen in the settings overlay on the game menu, so
the host has already made the choice before creating the room — is also fine; FRT's `frtPearOff` is
the only instance. Anything set on a setup or roster screen is not.

**`rosterConfig.requiresBalancedTeams: true`** (optional) — for a team game whose two teams must be
the same size. SS and DSD both derive per-team size from **team A's length alone**
(`ssPlayerCount = ssPlayerNamesA.length`), so a 3v2 silently mis-sizes team B. The flag gates two
things: the host lobby CTA rejects an odd roster, and `mpRosterCheckConfirm` requires `|A| === |B|`
("everyone assigned" previously allowed 3v2 — and, before the min-players fix, 4v0). A game
carrying it must have **even** min and max, or a bound is unreachable.

Run this check when adding a game: every display field present (no "undefined" on the mode screen),
both player-count getters returning the game's real bounds, and those bounds reading nothing but
constants + `window.mpLobbyStyle`. **`node tools/verify-mp-configs.js` asserts all of it** — schema,
bounds sanity, bound purity, agreement with the Pass-the-Phone count pills in `index.html`, and the
quit contract, across every game.

### Envelope Schema

All Firebase messages follow this shape:
```js
{ type: 'ACTION' | 'SYNC' | 'LOBBY', payload: { action: 'EVENT_NAME', ...data }, originId, timestamp }
```
- `ACTION` — Client → Host: player submits; Host processes, responds with SYNC
- `SYNC` — Host → All: resolved state; all devices apply and navigate
- `LOBBY` — session management: `SETTINGS_SYNC`, `GAME_START`, `HOST_END_GAME`, `LOBBY_RESET`

### Sync Lock

`mpLockSync()` — sets `window.syllySyncLocked = true` and adds the `mp-sync-locked` class to
`document.body`. Two layers of protection:
1. **Correctness (universal, class-independent):** while locked, `mpSendEnvelope()` drops every
   `type: 'ACTION'` envelope except the single one authorised by the `mpLockSync()` that opened
   the lock (`mpActionAuthorised`). A double-tap re-enters `mpLockSync()` — a **no-op while
   already locked**, so it does not re-authorise — and the duplicate ACTION is dropped at the
   send choke point. This is what prevents a double-tap from running the host's resolve twice
   (e.g. two `SS_DECODE_SUBMIT` → `ssResolve()` twice). It works whether or not the button
   carries `.btn-mp-action`.
2. **Visual (opt-in per button):** the CSS rule greys and disables all `.btn-mp-action` buttons
   while `mp-sync-locked` is on `document.body`. Apply `btn-mp-action` to every submittable MP
   button for the grey-out feedback — but it is no longer the correctness mechanism. (The four
   MDLM games carry it; the eight Phase-22 games do not yet — cosmetic gap only.)

An 8-second timeout auto-releases to prevent a permanent lock on dropped packets.

**Important:** the correctness layer only blocks ACTIONs sent *while the lock is held*. Fire-and-forget
ACTIONs that intentionally never call `mpLockSync()` (e.g. NAT votes/disputes/guesses, YGI
takes/votes, JEC prep, LTTP messages) see `syllySyncLocked === false` and pass through normally —
do **not** add a blanket "drop all ACTIONs while locked" guard, and do not lock those flows unless
single-submission is actually required.

`mpUnlockSync()` — clears `syllySyncLocked` + `mpActionAuthorised` and removes `mp-sync-locked`.
Called by every SYNC handler after applying state.

### Firebase Lazy-Load

`syllyFirebase` is `null` on app boot. Firebase scripts are loaded only when the user enters
Lobby Mode (taps Host or Join). This keeps the app fully functional offline without Firebase.
If the load times out (4 seconds), `mp-network-error-overlay` is shown.
The Firebase lib files are still listed in the `sw.js` precache — lazy-load refers to *when*
the scripts are injected, not whether they are cached.

### Interceptor Pattern (per-plugin)

Every submittable action in a plugin branches on `syllyMultiplayerMode`:

```js
// In a plugin's submit handler:
if (window.syllyMultiplayerMode !== 'single') {
  if (window.syllyMultiplayerMode === 'client') {
    mpLockSync();
    mpSendEnvelope({ type: 'ACTION', payload: { action: 'GAME_EVENT', ...data } });
    return; // wait for HOST SYNC
  }
  // Host path: run logic locally, then broadcast
  mpSendEnvelope({ type: 'SYNC', payload: { action: 'GAME_EVENT', ...resolvedState } });
}
// Single-device path falls through
```

**Missing handler audit (before shipping):** For every phase in the game's state flow, ask "can a non-host device submit something here?" Every "yes" is a required ACTION handler in `[abbr]HandleEnvelope`. Missing handlers silently drop submissions — they do not error or warn. Run this audit during Stage 2 (tech spec), not during testing. **Cover phases reached AFTER the core MP loop** — voting, tie-breaks, sudden-death, intel/guess phases, endgame resolution. These are the ones repeatedly built pass-the-phone-only and never given packets (SS Intel Phase, YGI Sudden Death, LTTP guess/gameover, NAT voting/Last Stand — four games). A synced *reveal* screen does not make the interactive *resolution* on the same screen synced: check each button on the screen, not just the screen entry. *[Elevated from ss/ygi/lttp/nat-impl-notes — recurring across 4 games.]*

### MDLM Patterns

**Name population from lobby:** In MDLM, `mpPlayerSlots[i].nickname` is already populated when `onPassThePhone` fires for the game. The game's own name-entry setup screen is redundant — skip it by populating the name array directly from `mpPlayerSlots` and calling the game's start function. BLD is the reference implementation. **Field name:** the slot object is `{ uid, nickname }` (built at `engine-multiplayer.js` ~line 624) — read `.nickname`, never `.name` (`.name` returns `undefined` silently). The engine's own `onPassThePhone` populators already use `mpPlayerSlots.map(p => p.nickname)`. Detail: `pass-impl-notes`.

**A readiness gate that reads a per-seat array must be checked in the mode where that array is EMPTY.** `[].every()` is `true`. A gate written for a game with departed-seat tracking (`arr.every((a,i) => !a || readyCheck[i])`) is vacuously open in a mode with no such array — the host resolves on the first tap while later seats never chose. Both forms are wrong in the other mode, so branch: the mode with no departures uses plain `readyCheck.every(Boolean)`. Assert **per mode**, not once. Detail: `cjar-impl-notes` BUG-05.

**Prove the packet contract with a two-device loopback before the real multi-device session — with a WIRE and a real DOM.** Every headless harness runs in `'single'` mode, which blinds it to packets. A second `vm` as a client, with the host's `mpSendEnvelope` routed into its `[abbr]HandleEnvelope`, catches absent payload fields, host/client divergence, stale-tag rejection, private-channel delivery and the quit contract (it has found defects that passed 200+ single-mode checks). It must have both, or it passes while the game is broken:

- **A wire.** Piping `mpSendEnvelope` directly into the handler passes live JS references, so empty collections survive a trip Firebase would not allow. Put a `fbWrite`/`fbRead` pair between and assert the wire's own behaviour first.
- **A DOM of real mock elements.** `getElementById: () => null` short-circuits every `if (!el) return` guard, so no render code runs; a render throw in a SYNC applier then strands the device unseen.

Reference: `tools/verify-cjar-loopback.js` (takes `CJAR_SRC=` so a broken copy proves the test fails first). Not a substitute for the three-device session (clock skew, Firebase ordering, dropped packets, visuals) — run it first. Detail: `cjar-impl-notes` ML-01/ML-03.

**Host readyCheck — process the host's own submission directly:** For any phase with a `[abbr]ReadyCheck[]` matrix where all players submit simultaneously, the host must mark its own slot in its local submit function — NOT by sending its own ACTION envelope. `engine-multiplayer.js` drops every envelope where `originId === syllyDeviceUid` (the dedup guard), so a host that submits via `mpSendEnvelope` never has its slot set and `.every(Boolean)` never fires (the round hangs). Pattern: when `syllyMultiplayerMode === 'host'`, set `[abbr]ReadyCheck[mpMyPlayerIdx] = true`, check `.every(Boolean)`, and broadcast the resolving SYNC directly. Detail: `jec-impl-notes` J1, `ygi-impl-notes` Y1/Y2.

**Generalisation — the dedup guard drops ALL self-sent ACTIONs, not just readyCheck submissions:** the same `originId === syllyDeviceUid` guard means **any** phase where the host is also an active *submitting* participant must use the direct-update-then-broadcast pattern, never a self-sent ACTION. This extends beyond readyCheck matrices to live-adjustment phases (e.g. a host sending a live allocation update to itself). Rule: if the host can submit an ACTION in a phase, branch on `syllyMultiplayerMode === 'host'` and mutate host state + broadcast the resulting SYNC directly; reserve `mpSendEnvelope({type:'ACTION'})` for clients only. Detail: `nt-impl-notes` BUG-05 / TG-05.

**Firebase erases every EMPTY value — so a payload's reset values are exactly the ones that never arrive.** Firebase RTDB stores no `null`, no `{}` and no `[]`: a key holding any of them is **deleted**, and the reader gets `undefined`. An array whose entries are all `null` vanishes whole; a half-dense one comes back as an **object keyed by index**, not an array. `false`, `0` and `''` are legitimate stored values and are never at risk — **only emptiness is erased**. This collides head-on with the accumulator rule below: doing that rule correctly means broadcasting `seen: {}`, `trail: []`, `choices: [null,…]`, `counterTreat: null` — and every one of those is erased in flight. **You need both halves: send the reset value explicitly AND rebuild it on receipt.** Never assign a raw `p.x` collection field. The suite's idiom is `p.x || []` (PKO, FLW, SHP); where seat-length or null-holes matter, use a normaliser that takes the count and a fill and reads `v[i]` — `cjarWireArr`/`cjarWireList`/`cjarWireObj` in `js/games/cjar.js` are the reference. Detail: `cjar-impl-notes` BUG-06.

**Accumulator arrays must be reset *in the SYNC payload*, not just locally:** any state that resets between rounds/sessions — log arrays, tally arrays, history lists, per-round matrices — must be included in the round-start SYNC payload **even when its value is `[]` or all-`false`**. The host resets it locally when it builds the new round; clients never do, so they carry the previous round's values forward until a payload field overwrites them. The symptom is a client showing a stale log or a readyCheck that fires instantly. Rule: when writing a round-start SYNC, list every accumulator the round touches and include each one at its reset value. Detail: `flw-impl-notes` BUG-01.

**A packet is a snapshot of state AFTER the move — settle the whole transition, then send once.** A broadcast between two halves of a state change ships a position that never existed on the sender, and the host cannot see it (it advances a line later and plays on). Finish every mutation (advance the turn, decide if the phase ended, reset accumulators), *then* build the payload. Detail: `comb-impl-notes` BUG-07.

**A send site written without a receiver is a draft, not a feature.** A send site cannot be wrong in a way one device can detect, so nothing verifies it until `[abbr]HandleEnvelope` exists. The chunk that adds the receive half re-reads every send site through the loopback and **expects to find at least one wrong**. Detail: `comb-impl-notes` ML-01.

**A seeded deal is a privacy decision, not only a bandwidth one.** Whatever the seed reconstructs, the receiver now *knows* (COMB's `boardSeed` also rebuilt the whole Instinct deck order on every client). **Enumerate everything the seed reconstructs and mask what the receiver may not see** — COMB keeps the deck's public *length* and drops its *order*, one line in the `MATCH_START` applier. Detail: `comb-impl-notes` BUG-06.

**The host takes a submitter's seat from the envelope's `originId`, not the payload.** A payload naming its own `playerIdx` is fine where a seat can only act for itself, but not once a seat holds something worth stealing. Resolve `originId` against `mpPlayerSlots` (`combSeatOf`); drop a uid absent from the roster. Keep `playerIdx` in the payload for the log — just don't trust it. Detail: `comb-impl-notes` DD-09.

**A `catch (_) {}` on a path a harness watches needs an observable side effect.** Every per-game envelope router must swallow throws (§ Firebase callback crash safety), which means a loopback's "no exception" check can never fire. Make the swallow `console.warn` and give each mock device a console whose `warn` lands in its error list. Detail: `comb-impl-notes` ML-05.

**Single-source card/board arithmetic:** when a game has any rule-mutating mode (a Sylly Mode that inverts scoring, reverses a chain, or changes what beats what), route **resolution, legality checking, and any simulation/preview** through one shared function rather than duplicating the comparison at each call site — a shared `[abbr]Beats(a, b)`-style predicate makes a mode's inversion a one-line change instead of an edit at every call site. Duplicated comparisons are where mode-mutations silently miss a path. Detail: `shp-impl-notes` Template Gaps.

**Roster type `'none'`:** For games with automatic or random seating, use `rosterConfig.type: 'none'`. The `'individual'` type requires every player (including the host) to be manually assigned in the Assign Spots lobby UI — any player left unassigned produces `reordered[-1]` (a non-standard array property), corrupting the slot array. If the game handles seat labels internally, `'none'` is always safer.

**Multiplayer-only game routing (`multiplayerOnly: true`):** The `multiplayerOnly` field in `MP_GAME_CONFIGS` is **informational only** — no engine code reads it to gate or enforce anything. The actual enforcement comes from `supportedModes` (a game with only `['mdlm']` has no single-device path in `mpShowModeScreen`) and the game's lobby button listener (which calls `mpShowModeScreen` directly, bypassing any single-device setup flow). The lobby-entry button on `screen-lobby` STILL routes to the game menu (`showScreen('screen-[abbr]-menu')`), not directly to `mpShowModeScreen()`. The game menu is always required — it holds Settings and How to Play before the host commits to a session.

The game menu's Play CTA has **dual context** and must branch on `syllyMultiplayerMode`:
```js
document.getElementById('btn-[abbr]-menu-play').addEventListener('click', () => {
  playLaunch();
  if (syllyMultiplayerMode !== 'single') {
    [abbr]StartSession(); // post-lobby: onPassThePhone fired, players ready
  } else {
    mpShowModeScreen('[abbr]'); // pre-lobby: create/join lobby first
  }
});
```
This branching is required because `onPassThePhone` calls the game's menu-show function after lobby setup, so the Play CTA appears in two contexts: once before the lobby exists, and once after it's fully configured. GTH is the reference implementation (Phase 31).

**Firebase callback crash safety:** A crash inside a Firebase `onValue` callback (inside `mpHandleEnvelope`) has a cascade failure mode: the SYNC that would advance all devices is never sent; Firebase may re-deliver buffered events against partially-reset state, triggering spurious double-resolutions. Treat every function called from `mpHandleEnvelope` as safety-critical. Grep to confirm every function called from it exists before shipping.

**Host-gate screens before timed phases:** Any screen that gates entry into a timed gameplay phase (e.g. diagnosis timer, drawing timer) must be host-only in MDLM. The host computes `endTimestamp` at the moment they click through the gate — not at queue-build time earlier in the flow. Clients show a "Waiting for the host…" message with no action button. Pattern: host click → `endTimestamp = Date.now() + window * 1000` → broadcast `SYNC: [ABBR]_PHASE_BEGIN { endTimestamp }` → all devices `startTimer(endTimestamp)` + navigate to gameplay screen. Reference implementation: `GTH_PHASE2_BEGIN` in `js/games/gth.js`.

### `resetToLobby()` Multiplayer Additions

`resetToLobby()` (`engine.js`) also tears down multiplayer: the host broadcasts `HOST_END_GAME` and calls
`syllyTeardownRoom()`; a client removes its own `/players` entry; every `window.mp*` / `sylly*` global resets;
every MP overlay hides; the slider and mute toggle return to neutral. Read the function itself — a copy
here drifts from the code.

### Entry seam + the Intro (SW v264)

**`mpEnterGame(cfg)` is the ONLY way into a game** — host after the roster, client on `GAME_START`,
Pass-the-Phone, Solo, rejoin. Never call `cfg.onPassThePhone()` directly (`verify-game-intro.js` § 16
counts the call sites). With no `cfg.intro` it is exactly `onPassThePhone()`. A game that opts in gets
the engine-owned Intro (`js/engine-intro.js`); its four packets (`MP_INTRO_READY`, `MP_LINEUP_PICK`,
`MP_INTRO_STATE`, `MP_INTRO_DONE`) route before per-game code, so the game needs no handler, and a
Line-up writes the same `mpPlayerSlots` / `window.mpLobbyRoster` shapes the lobby roster does — and
re-freezes `mpSeats` at `MP_INTRO_DONE`. Detail: `docs/rules/ui-revamp.md` § 3.

### Play-Again Return Pattern (`mpReturnToLobby`)

**Rule:** Every game's play-again confirm handler MUST call `mpReturnToLobby()` instead of navigating to setup or game menu when `syllyMultiplayerMode !== 'single'`.

```js
// Pattern: in every game's play-again confirm listener
if (window.syllyMultiplayerMode !== 'single') {
  mpReturnToLobby();
  return;
}
// single-device path unchanged
```

**Behaviour:**
- **Host:** broadcasts `LOBBY_RESET` envelope → all clients navigate to `screen-mp-lobby-join` in a "waiting" state (code pre-filled, CTA disabled) → host navigates to `screen-mp-lobby-host` with same room code → `mpStartPlayersWatcher()` re-subscribed
- **Client:** calls `resetToLobby()` directly (they leave the session)

**Confirm button label** on the play-again overlay should update dynamically when the overlay is opened:
- Host: `'Restart in Lobby 🔄'`
- Client: `'Leave Session'`
- Single: original thematic label (e.g. `'New Expedition 🦁'`)

### Bots (SW v247)

> **Moved (4 Nov 2026) → `docs/rules/mp-bots-reconnect.md`** — read it when adopting or changing bot seats, Solo mode, or the reconnect hook.
> **Headline rule:** A bot is an `mpPlayerSlots` entry held only in host memory (never written to `/players`); `view()` strips like `sendState`, `decide` is pure, `submit` goes through the host's own record path.

### Mid-Game Quit Contract

**Applies to EVERY lobby session — MDLM *and* TLM.** This was written MDLM-only until 23 Aug 2026,
and that wording is exactly what let LI5 and DSD (both TLM) ship without it: neither reads as an
"MDLM game", so the rule looked like someone else's problem. The failure is identical in both. The
mode label never mattered — only that a Firebase room exists and another device is waiting on it.

**A drop is not a quit — see § Client Reconnect.** This contract covers *deliberate* exits only; a
phone that locks or loses signal never sends `MP_PLAYER_LEFT`.

**The contract:** one device leaving mid-game dissolves the session for everyone.
- **Host quits:** `resetToLobby()` broadcasts `HOST_END_GAME` (standard engine behaviour), tears
  down the Firebase room, and returns to the lobby. All clients get the disconnect overlay.
- **Client quits:** tell the host *before* tearing down locally. The host then calls
  `resetToLobby()`, which broadcasts `HOST_END_GAME` to everyone else.

**Why it cannot be skipped:** `resetToLobby()` alone only tears down the quitting device. The host
has no `/players` listener mid-game, so without the notification the leaver keeps its Firebase slot
and every other device waits on a turn that never comes. It is invisible in single-device play and
invisible to every `'single'`-mode harness — which is why eight games shipped without it.

**How to satisfy it — call the engine helper.** `mpNotifyPlayerLeft()` (`engine-multiplayer.js`)
sends the generic `MP_PLAYER_LEFT` ACTION when this device is a client, and is a no-op otherwise.
`mpHandleEnvelope` handles it generically **before any per-game routing**, so a game needs no
handler of its own. One line in the quit-confirm handler:

```js
document.getElementById('btn-[abbr]-quit-confirm').addEventListener('click', () => {
  playExit();
  document.getElementById('[abbr]-quit-overlay').style.display = 'none';
  if (window.syllyMultiplayerMode !== 'single') { mpNotifyPlayerLeft(); resetToLobby(); return; }
  [abbr]ResetToMenu();   // single-device path unchanged
});
```

**Never navigate to the game menu in a lobby session.** `showScreen('screen-[abbr]-menu')`,
`[abbr]ResetForNewGame()` and friends leave the room intact — that was the whole bug in all eight.
`resetToLobby()` is the only correct destination.

**The ten games that predate the helper** (PASS, GTH, DYB, BLD, NT, FRT, SHP, FLW, PKO, CJAR) each
ship an identical per-game `[ABBR]_PLAYER_LEFT` packet plus a handler that does nothing
game-specific. Those still work and are not being swept — but that ten-fold duplication is why the
generic path now exists. **New work uses `mpNotifyPlayerLeft()`**; don't add an eleventh per-game
packet.

**Enforced:** `node tools/verify-mp-configs.js` § 6 asserts every game satisfies this one way or the
other. A new game that forgets it fails that check.

### Client Reconnect (SW v236)

> **Moved (4 Nov 2026) → `docs/rules/mp-bots-reconnect.md`** — read it when touching seats, presence, Away, rejoin, `MP_END_SCREENS` or a `reconnect` hook.
> **Headline rule:** A drop is not a quit: seats freeze at `GAME_START`, presence is per connection, a new game adds its final screen to `MP_END_SCREENS`; adopters are pinned in `verify-mp-configs.js` § 7.

### localStorage Exception

`sylly_nickname` is stored in `localStorage` via `mpGetNickname()` / `mpSaveNickname(v)`. It is one of the permitted keys listed in CLAUDE.md § Anti-Patterns — it is a user
preference (not game state) that survives across sessions.

`sylly_rejoin` (SW v236) is the other multiplayer one: `{ code, game, ts }`, a *pointer* to a live
session for the reconnect prompt, never game state. Written only by a client of a game that adopts
`reconnect`; cleared by `resetToLobby()`, any refusal, `HOST_END_GAME`, `LOBBY_RESET` and **Not now**;
expires after 2 h. Every read/write is `try/catch` — a blocked store must never stop boot.

