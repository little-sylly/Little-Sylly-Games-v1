# Bots — design spec (29 Sep 2026)

**Status:** design approved in conversation, section by section (owner + Claude, brainstorming skill,
architectural path). The decisions that fed it: `2026-09-29-bots-brainstorm-decisions.md`.
**First adopter:** Cold Shoulder (`cld`). **Engine:** opt-in, so later games can adopt with one config
entry and a brain.

---

## 1. The job

Bots do two things:

1. **Top up a small lobby.** Two friends are below Cold Shoulder's minimum of 3, or a lone host
   wants a real match. The host adds bots by hand in the lobby.
2. **Solo.** One person, one phone, a full match against bots, with no internet needed.

**Success looks like this:** a lone player on a cold offline install can open Cold Shoulder, pick Solo,
and play a full match to the podium against bots of a chosen difficulty. A host with two friends can
add a bot and start. Neither case needs any Solo- or bot-specific branch inside the game's rules. No
bot can see what its seat couldn't see, and a harness proves it.

**Not in scope:**
- Bot personalities (parked by the owner).
- Bots in any game but CLD. Likely next adopters are PKO, PASS and DYB; NT gets training use at most,
  and COMB is not planned.
- Bots in Pass-the-Phone.
- Bots in a game whose roster type is not `'none'`.
- Per-bot difficulty.
- Persisting the bot setup across app reloads.

## 2. Build order

This is one spec with three phases, each ending green. The whole thing ships as **one** release (SW v247).

1. **Engine bot seats.** Slots, lobby controls, the game hook, timers, Away and reconnect
   exclusion. Proven against a stub game config.
2. **Cold Shoulder's brain.** CLD adopts the hook: the view, the three difficulties, the prompt sites,
   and 🤖 names.
3. **Solo.** The fourth mode, the Solo lobby, and the null wire.

---

## 3. Engine bot seats (`js/engine-multiplayer.js`, a new `// ── Bots ──` section)

### 3.1 What a bot is
- A bot is an entry in `mpPlayerSlots` held **only in the host's memory**:
  `{ uid: 'bot:0', nickname: 'Sylvia', bot: { difficulty: 'medium' } }`.
- **Bot uids** are `'bot:' + n`, with a counter that increases per room. A Firebase uid never contains
  a colon.
- **`mpIsBotUid(uid)`** is the only test anything uses.
- **Never in `/players`.** That node is keyed by slot index (`Object.keys(players).length`), and the
  players watcher rebuilds `mpPlayerSlots` from it when anyone leaves. A bot written there would clash
  with those keys, and the rebuild would erase the bots held in memory.

### 3.2 Seat order and capacity
- **Canonical order:** humans in join order, then bots in the order they were added. The HANDSHAKE
  handler inserts a new human **before the first bot**.
- `mpStartPlayersWatcher`'s rebuild becomes `[...humans from Firebase, ...mpPlayerSlots.filter(bot)]`,
  so a human leaving no longer erases the bots.
- **A human always outranks a bot.** The room node's `maxPlayers` and the joiner's own capacity check
  count humans only; neither changes. If a HANDSHAKE would take humans + bots past `getMaxPlayers()`,
  the host **removes the most recently added bot**, then seats the human.

### 3.3 Names
- Pool: `cfg.bots.names`, drawn in order.
- A bot takes the next name that no human and no other bot in the room already has, compared
  case-insensitively. If the pool is exhausted it becomes `'Bot N'`.
- If a human joins with a bot's name, **that bot renames** to the next free name and the list re-renders.

### 3.4 Host lobby controls (only when `cfg.bots` exists)
- **"+ Add bot"** under the player list. It is dimmed at `getMaxPlayers()`, which also covers Peck
  Off's fixed 2.
- **Bot chips:** the nickname with a 🤖 marker and a **✕** that removes that bot. The seat label reads
  `BOT`, where humans read `HOST` / `P2`.
- **Bot difficulty:** a pill row (Easy / Medium / Hard), shown only while at least one bot is seated.
  - It sets `mpBotDifficulty`: `'easy' | 'medium' | 'hard'`, defaulting to `'medium'`, memory only.
  - `resetToLobby()` resets it; Play Again keeps it.
  - It uses the suite pill standard (`.pill` + the game's `pill-active-*`).
- **Counts and hints count bots.** The minimum hint gains a way out: *"Need 1 more player to start
  (min 3) — or add a bot."*
- **Stamping:** `mpConfirmRoster` writes `bot.difficulty` onto every bot slot before `GAME_START`.

### 3.5 Through the match
- **Seats:** `mpSeats` includes bot uids and nothing special-cases them. They are skipped by:
  - the presence watcher
  - `mpMarkAway`
  - the grace and host-ask
  - `mpHostHandleRejoin`
  - `reconnect.sendState` iteration
- **`mpSendPrivate(botUid, …)` is a no-op.**
- **`GAME_START` already carries `playerSlots`,** so clients learn which seats are bots with no new
  packet. The rejoin ACCEPT carries the same context.
- **`mpSeatLabel(idx)`** returns `nickname + ' 🤖'` for a bot seat and the plain nickname otherwise.
  It works on every device.
- **`MP_PROTOCOL_VERSION` → `'v247'`.** The slot shape gains a field.
- **Play Again** (`mpReturnToLobby`, host) keeps the bots seated.

### 3.6 The game hook — `MP_GAME_CONFIGS[abbr].bots` (host-only)

```js
bots: {
  names:   ['Sylvia', 'Sam', …],            // the game's own pool, drawn in order
  view:    seatIdx => snapshot,             // ONLY what that seat's device would be shown
  decide:  (view, difficulty, rng) => move, // pure in effect: no DOM, no clock, no Math.random
  submit:  (seatIdx, move, tag) => bool,    // the host's own record path; false = stale/rejected
  thinkMs: (difficulty, rng) => ms,         // optional; default 1000–4000 ms, +1000 on hard
}
```

The functions are arrow wrappers, like `reconnect`, because this object is built before the game file
loads.

**The game decides when bots act** (the engine knows no phases):

- **`mpBotsPrompt(tag, seatIdxs?)`**: for each named bot seat (all bot seats if none are named):
  1. **Captures `view(seatIdx)` now**, before any bot move has landed.
  2. Waits `thinkMs(difficulty, rng)`.
  3. Calls `decide(view, difficulty, rng)`, then `submit(seatIdx, move, tag)`.

  A throw in `view`, `decide` or `submit` is `console.warn`ed and that seat submits nothing. This is
  the observable-swallow rule (logic-engine.md § MDLM Patterns).
- **`mpBotsCancel()`**: drops every pending bot move. Called by a game on any early phase end, and by
  the engine in `mpEndMatchLocal()` and `resetToLobby()`.
- **Timers** live in one bag, `mpBotTimers` (seat → `{ handle, due, remaining }`).
  - While **any human seat is Away**, the bag is paused (each timer keeps its remaining time) and it
    resumes when the last seat returns, exactly once each. Nobody can act, so neither do the bots.
  - This holds with or without a `reconnect` hook.
  - It follows § Timer Lifecycle: three clear sites (a game's quit-confirm via `resetToLobby`,
    `resetToLobby`, `mpEndMatchLocal`).
- **`rng`** is a small seeded xorshift stream owned by the engine, reseeded per match from `Date.now()`.
  A harness pins it through `mpBotSeed`. `decide` never calls `Math.random`.

### 3.7 The fairness contract
- A bot is fair because **`view(seatIdx)` holds only what that seat's own device would be shown**:
  the same stripping rule as `reconnect.sendState(idx)`.
- `decide` is pure over the view, so fairness reduces to the view.
- Every adopting game's bots harness must prove it: fill every other seat's hidden state with random
  junk; the view and the decision must come out byte-identical.

### 3.8 Schema (`tools/verify-mp-configs.js`)
When a config has `bots`:
- all four required functions are present
- `names.length >= getMaxPlayers() - 1`
- `rosterConfig.type === 'none'`

Also, `'solo'` in `supportedModes` requires `bots`.

---

## 4. Solo

### 4.1 Where it lives
- **`MODE_INFO.solo`:** `{ label: 'Solo', desc: 'Just you and the bots, on this phone. No internet
  needed.', icon: '🤖' }`.
- It is offered only when `supportedModes` includes `'solo'`. CLD becomes `['mdlm', 'solo']`, and
  `recommendedMode` stays `'mdlm'`.
- `mpBuildModeSection` gives Solo a single selectable row (the PTP row's shape), selected via
  `mpSetModeSelection('solo', null)`.
- **Offline:** the lobby rows dim as today and Solo stays live. For a game with Solo, the offline
  notice reads *"No internet — Solo still works."*

### 4.2 The Solo lobby is the host lobby, dressed
Solo is **a lobby nobody can join**. It reuses §3.4's controls rather than building a second setup
screen.
- **`mpEnterSolo()`** (the mode CTA with Solo selected) sets:
  - `window.syllyMultiplayerMode = 'host'`
  - `mpSolo = true`
  - `mpActiveRoomCode = null`
  - `window.mpLobbyStyle = 'individual'`

  It skips the pre-lobby overlay and **never loads Firebase**.
- **Seat 0:** `{ uid: window.syllyDeviceUid || 'local:host', nickname: mpGetNickname() || 'You' }`.
  When the uid was null, `'local:host'` is **borrowed** into `window.syllyDeviceUid` and
  `mpSoloBorrowedUid = true` is set.
- **Pre-filled** with bots up to `getMinPlayers()` (CLD: 2, or 1 under Peck Off), so the start CTA is
  live at once.
- **Dress:**
  - the room-code panel shows *"Solo — just you and the bots"*
  - the "waiting for players" line and the capacity line's *joined* wording are hidden
  - the CTA keeps `lobbyCtaLabel` (*Hit the Ice →*)

### 4.3 The null wire
- `mpConfirmRoster` runs **unchanged**:
  - `mpSendEnvelope` / `mpSendPrivate` already return when `mpActiveRoomCode` is null
  - `mpBeginMatchSeats` sets `mpSeats` and returns before Firebase
  - `mpMyPlayerIdx` resolves to 0
  - `onPassThePhone` starts the match on the host path
- **The game has no Solo branch.** It plays exactly as it does hosting a room.

### 4.4 The only `mpSolo` branches
- **Lobby render:** the dress in §4.2.
- **`mpReturnToLobby`:** skip the Firebase removes and `mpStartPlayersWatcher`, and show the Solo lobby
  with the bots still seated.
- **`resetToLobby`:** clear `mpSolo`. If `mpSoloBorrowedUid`, put `window.syllyDeviceUid` back to
  `null`, so a later real room signs in cleanly.

### 4.5 Quit
- A mid-match ✕ goes through the game's quit-confirm and then `resetToLobby()`.
- `mpNotifyPlayerLeft()` is already a no-op on a host, and `syllyTeardownRoom()` returns when there is
  no room.

### 4.6 Install
- **No new files.** Changes are to `engine-multiplayer.js`, `cld.js` and one screen partial
  (`src/screens/` for the lobby markup, then `node tools/build-index.js`).
- **Nothing added to `PRECACHE_URLS`.** `CACHE_NAME` is bumped as usual for a code change.
- **Solo works on a cold offline install.**

---

## 5. Cold Shoulder's brain (`js/games/cld.js`)

### 5.1 Wiring
- **`view` = `cldBotView(i)`:** a deep-cloned rules record in the `cldSwapOut()` shape (penguins,
  bergs, `floeRadius`, `slideNo` — which carries Hunger — Fish, `peckOff`, `syllyMode`, `inBath`,
  `seatSeq`, `playerCount`). It has **`commits` blanked** to `new Array(n).fill(null)` and
  `timeline: null`, plus `me: i`. Other seats' commits are the only hidden state in CLD.
- **`submit` = `cldBotSubmit(i, move, tag)`:** the body of the `CLD_COMMIT` handler is lifted into
  **`cldHostTakeCommit(idx, commit, slideNo)`** (apply → tally → `cldSyncFloeUI` → resolve if every seat
  is in). The client packet and the bot now share it, and `cldApplyCommit`'s stale-tag and
  no-overwrite guards apply to both.
- **Prompt:** one helper, `cldPromptBots()`, which calls `mpBotsPrompt(cldSlideNo)` when
  `syllyMultiplayerMode === 'host'`. It is called at every site where a Slide opens for aiming on the
  host: Floe-Off start, Ice Bath start, and the end of playback (`cldPhase = 'aiming'` then
  `cldShowFloe()`). There is no aiming clock, so there is no early phase end to cancel on.
- **Names:** `onPassThePhone` builds `cldPlayerNames` from `mpSeatLabel(i)`. 🤖 then appears
  everywhere a name is printed (scoreboard, podium, barks), carried by the `playerNames` already in
  `CLD_FLOEOFF_START`.
- **`cldPlayerNames` is display-only.** Nothing uses a name as an identity; the plan's first task
  verifies this by Grep.
- **Pool:** `['Sylvia', 'Sam', 'Shirley', 'Jeff', 'Chillbert', 'Waddles', 'Fishstick', 'Flipper',
  'Slushie']`. "Snowball" was rejected because it collides with the thrown Snowball.

### 5.2 Look-ahead without leaking
- Hard runs the **real `cldResolveSlide`** on its view through **`cldRulesRun(record, fn)`**: the
  Arena's `cldArenaRun` swap generalised to take any record. `cldArenaRun` becomes a thin wrapper over
  it, and its behaviour is unchanged.
- The Practice harness's classification of every top-level `let` (`CLD_SWAP_EXEMPT`) already covers the
  swap. The new harness adds live-state byte-identity after Hard decisions mid-match.
- Each simulated candidate runs on a fresh clone of the view with a fixed seed.

### 5.3 What each penguin decides
A move is a commit in today's shape: `{ aims: [{ penguinId, dx, dy, power }], dive, snowball }`.

- **Standing** — shove.
- **Knocked back** — Throw *or* Dive (`dive: { penguinId, angle }` into a free gap).
- **Drowned** (a plug) — Throw.

| | Easy | Medium | Hard |
|---|---|---|---|
| **Target** | A random standing rival | The standing rival nearest the rim | The best candidate, simulated |
| **Shove** | Straight only; power 0.5–1.0 at random; aim noise ±15° | Edge cut (`cldPrBotCommit`'s ghost-ball rule, ≤ `CLD_PR_CUT_MAX`) else straight; power 0.85–1.0 divided down by `cldHungerMult`; noise ±4° | Per rival: straight + cut × power {0.7, 0.85, 1.0}, plus one dodge (a sidestep across the likeliest incoming line) and a hold; **≤ 24 candidates per penguin** |
| **Knocked back** | Dives into a random free gap half the time, otherwise throws | Dives into the nearest free gap if there is one, otherwise throws at its target | Simulates each free gap against each Snowball target |
| **Drowned** | Throws at a random standing rival | Throws at the standing rival nearest the rim | Simulated |
| **Other seats assumed to** | not considered | not considered | play their **Medium** move, worked out from the same public view |
| **Think time** | 1.0–2.5 s | 1.5–3.5 s | 2.0–4.5 s |
| **Quirk** | Holds still about 1 Slide in 5 | — | — |

- **Hard's score:** +1 for each rival penguin in the Drink after the Slide; −1.5 if its own penguin
  goes in; plus a tiebreak of 0.1 × (its own distance from the rim − the mean of the rivals'), in floe
  radii.
- **Peck Off** (two penguins each): Hard makes one coordinate pass. Each penguin is chosen with its
  partner on its Medium move.
- The **Ice Bath and the Thaw** need nothing special, because the view carries `inBath` and the live
  radius.
- **Practice's drill bots are unchanged.** Their scripts are the point of the Arena. The shared maths
  (the straight and cut aim) is factored so that both call it.

---

## 6. Testing

| Harness | New / extended | Covers |
|---------|----------------|--------|
| `tools/verify-bots.js` | **new** (engine, stub game) | slot shape and order; `mpIsBotUid`; the name draw (pool order, skipping human and bot names case-insensitively, the `Bot N` fallback, a rename when a human joins with a bot's name); humans outranking bots (a full-room HANDSHAKE drops the newest bot); the watcher keeping bots; `mpBotsPrompt` (view captured at prompt, `decide` only after `thinkMs`, the tag passed through, a throw warned, not escaping); the timer bag (cleared by `mpEndMatchLocal`, `resetToLobby` and Play Again; paused on Away, resumed with the remaining time, once each); bots skipped by presence, Away, rejoin and `sendState`; `mpSendPrivate` to a bot is a no-op; **Solo** (Firebase never loaded, no send reaches the wire, `local:host` borrowed and returned, Play Again back to the Solo lobby) |
| `tools/verify-mp-reconnect.js` | extended | a room with a bot seat: a human drops and rejoins; the bot is never Away; its timers pause and resume |
| `tools/verify-mp-configs.js` | extended | the §3.8 schema |
| `tools/verify-cld-bots.js` | **new** (game) | **fairness** (every difficulty × Standing / Knocked-back / Drowned × Peck Off: junk in other seats' `cldCommits` gives a byte-identical view and decision); **legality** (own penguin ids only, Throw *or* Dive, the dive angle a real free gap, power 0–1, accepted by `cldApplyCommit`); **swap safety** (50 Hard decisions mid-match leave the live state byte-identical); **whole matches** (bot-only, seeded, 3–8 seats, Peck Off, Thaw, Ice Bath, Hunger — nothing throws, every Slide resolves, every match ends); **ordering** (at a 3-seat table with one bot of each difficulty, win share Hard > Medium > Easy over a fixed seed set); reports Hard's `decide` ms per penguin and **warns** above 250 ms |
| `tools/verify-cld-loopback.js` | extended | host + 1 client + **2 bot seats** over the Firebase-shaped wire: the client sees 🤖 names from `GAME_START`, the tally counts bot commits, host and client timelines identical; a **Solo** match on a null wire with a real mock DOM, run to the podium |
| `tools/mutate-cld.js` | extended | mutants: a rival's commit leaked into the view; the prompt dropped from one Slide-open site; the Away pause dropped; a bot answering before its think time — each must turn a harness red |
| `tools/simulate-cld-bots.js` | **new** instrument | seeded bot-only matches; prints win shares by difficulty and seat count; asserts nothing, exits 0 |
| `visual-check` | layout pass | the host lobby (bot chips, + Add bot, difficulty pills) and the Solo lobby at 375×667, 375×548 and 320×452 |

**Beyond every harness:** a real-device Solo match, and a two-phone top-up session. Nothing here judges
whether Easy feels beatable or Hard feels unfair.

---

## 7. Documentation closure (at the release)
1. **`docs/code-map.md`:** the Bots section (engine functions and state), CLD's `cldBotView` /
   `cldBotSubmit` / `cldHostTakeCommit` / `cldRulesRun` / `cldPromptBots`, and the Solo lobby dress.
2. **`docs/game-identities/cld.md`:**
   - **paired:** Solo and "+ Add bot" in the player's journey, with every new UI string
   - **free:** bot names and "bot" in terminology
3. **`CLAUDE.md`:** the SW v247 entry; the harness table gains `verify-bots.js`, `verify-cld-bots.js`
   and the instrument.
4. **`logic-engine.md`:** a new § Bots (the hook, the prompt/timer contract, the fairness contract, bots
   never in `/players`, humans outrank bots, Solo = the host path on a null wire, a new adopter's
   checklist). The `MP_GAME_CONFIGS` schema table gains `bots`.
5. **Implementation notes:**
   - `shared-implementation-notes.md`: the engine design decision
   - `cld-implementation-notes.md`: the brain
6. **`docs/deferred-work.md`:** personalities; the next adopters (PKO, PASS, DYB); bots for
   non-`'none'` roster games.
7. **`docs/decision-log.md`:** one entry (host-side bot seats; Solo on the null wire).

## 8. Risks to watch
- **Hard's cost on a phone.** Up to 24 simulations per penguin, and two penguins under Peck Off. The
  250 ms warning is the tripwire. The fallback is fewer power steps, not a different design.
- **"Hard > Medium > Easy" is asserted on fixed seeds.** It proves the ordering, not the feel. The owner
  tunes the feel on the real-device pass.
- **3-player balance is still unsimulated for humans** (the `getMinPlayers` note). Solo at 3 seats will
  be the most common table, so watch it.
