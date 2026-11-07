# Multiplayer reference — bots and reconnect

> On-demand (not auto-loaded). Bot seats / Solo and Client Reconnect. The core multiplayer rules (schema, MDLM patterns, quit contract) stay in `logic-engine.md`. Moved verbatim on 4 Nov 2026; each source file keeps a stub with the headline rule.

---

### Bots (SW v247)

**A bot is an `mpPlayerSlots` entry held only in the host's memory** — `{ uid: 'bot:N', nickname, bot:
{ difficulty } }` — and **never written to `/players`** (keyed by slot index; the watcher rebuilds from
it). `mpIsBotUid` is the only test. Humans first, bots after; **a human always outranks a bot** for the
last seat (the newest bot steps aside) and a bot gives up a name a human arrives with. Presence, Away,
rejoin and `mpSendPrivate` all skip bots. Print names through **`mpSeatLabel(idx)`** (a bot's carries 🤖).

**The game says when; the engine owns the timers.** Call `mpBotsPrompt(tag)` as bot seats must act: each
bot's **view is captured at once**, `decide` runs after `thinkMs`, then `submit(idx, move, tag)` through
the game's own host record path — never a self-sent ACTION. `mpBotTimers` pauses while any human is Away
and is cleared by `mpEndMatchLocal()` and `resetToLobby()`.

**Fairness is the view.** `view(idx)` holds only what that seat's device would see (the
`reconnect.sendState` stripping rule); `decide` is pure in effect and takes randomness only from `rng`.
Every adopter's bots harness proves it: junk in the other seats' hidden state → byte-identical view and
decision.

**Solo** is the host path on a null wire: `mpSolo`, `mpActiveRoomCode = null` (every send already
no-ops), Firebase never loaded, `'local:host'` borrowed as the uid when there is none and handed back by
`resetToLobby()`. Its setup is the host lobby itself. A game needs no Solo branch.

**Adopting bots in a new game:** a `bots` entry; a `view` that strips like `sendState`; a pure `decide`;
`submit` through the host's own record function (lift it out of the envelope handler, as CLD's
`cldHostTakeCommit`); one `mpBotsPrompt` at the single place a phase opens on the host; names through
`mpSeatLabel`; a bots harness with the fairness check; `'solo'` in `supportedModes` if a lone phone can
play. Reference: CLD. Detail: `shared-implementation-notes.md` DD-52.

---

### Client Reconnect (SW v236)

**A drop is not a quit.** At `GAME_START`, `mpConfirmRoster()` freezes `rooms/{code}/seats` (uids in
seat order) and the host watches `rooms/{code}/presence` for the length of the match. Each **client**
writes **one presence child per connection** (`push` + its own `onDisconnect().remove()`), re-written
on every `.info/connected === true` — so a blip heals itself, and a stale socket's LATE onDisconnect
after a fast reload removes only its own child, never the new one. A seat with no children for
`MP_AWAY_DEBOUNCE_MS` (3 s) is **Away**: one `LOBBY MP_AWAY_STATE { seats, graceEndsAt }` carries the
whole set (`seats: []` is Firebase-erased — rebuild with `|| []`), and every device shows
`#mp-away-overlay`. The host is skipped **by uid**, never by index (a `'teams'` roster reorders slots).
**Only a match is watched, and only drops count.** A client leaving on purpose after the game (the
podium ✕, "Leave Session") sends `MP_SEAT_RELEASED` from `mpReconnectTeardown()` and its seat is
never Away; and reaching a game's final screen (`MP_END_SCREENS`, via `mpNoteScreen()` in
`showScreen()`) ends the match for reconnect — the room lives on for Play Again. **A new game adds
its final screen to `MP_END_SCREENS`** (GM and NT are absent on purpose: per-round result screens).

**The opt-in hook** — `MP_GAME_CONFIGS[abbr].reconnect = { sendState(idx), pause(), resume() }`, all
host-only; `verify-mp-configs.js` § 7 pins the adopter list (`['flw', 'pko', 'cjar', 'comb']`). `pause()` runs on the FIRST
seat to go and `resume()` on the LAST back, never twice. An adopter's client `onPassThePhone` must be
safe to re-run on a rejoining device (standby, never a new match) **and must start any data load the
game's lobby button would have** — a rejoiner never tapped it (`cjarLoadData()`, `pkoLoadChain()`); the
applier waits for it. The full-state applier must take
standby → live and be idempotent — **re-arming phase-scoped UI** (COMB: the Overflow, the Wasp; FLW: the Deep Vault; PKO: Carrion), since that is never carried; `sendState` strips every other seat's private state — including anything that *implies* it (FLW's spent Counterfeit token, CJAR's mid-window choices).
**Pause scope:** the Away overlay covers every device, so nobody can act — pause stops only what acts
**for** a seat: a clock that auto-plays (FLW's, even when a *non*-active seat drops), an auto-resolve
(CJAR's window, PKO's Carrion), and anything that would open the next one (CJAR holds its flip loop).
Resume re-arms through a **clock-only** packet (`COMB_DAYLIGHT`, `FLW_CLOCK`, `CJAR_CLOCK`), never the
phase-start packet, whose applier resets half-made input. In a loopback, build the rejoining device
**after** resume — that public broadcast may be lost to it in reality. **A game
without the hook** still gets detection: a 60 s grace (`MP_AWAY_GRACE_MS`), then the **host is asked**
— Keep waiting (another grace) or End session (`HOST_END_GAME { reason: 'dropped', name }`). **Nothing
ends on its own** (owner, SW v240). `MP_AWAY_STATE` carries `asking` so clients read "the host is deciding".

**`MP_PROTOCOL_VERSION`** (`engine.js`, SW v240 — was `SYLLY_VERSION`) gates `HANDSHAKE` and `MP_REJOIN`.
It is the **wire** version, not the app version: bump it only when a packet changes shape or meaning,
to the SW version that ships the change. A release that touches no packet leaves it alone.

**Rejoin.** A client of an adopting game writes `sylly_rejoin` at `GAME_START`; on reload the boot
prompt (`#mp-rejoin-overlay`) sends `ACTION MP_REJOIN { version }`, checked by `originId` against
`seats`; it carries a **nonce** the host echoes, so the reply passes the rejoiner's timestamp filter
however far its clock runs ahead (the ACCEPT then rebases `mpJoinListenFrom` to the host's stamp).
The host answers privately — `MP_REJOIN_ACCEPT` (the `GAME_START` + settings context,
applied through the shared `mpApplySettings()`), then **`mpMarkBack()` → `resume()` BEFORE
`sendState()`**, so the snapshot carries the live clock: a public resume SYNC can beat the private
ACCEPT to the rejoiner and is dropped there (no game is routed until the ACCEPT). A mid-match stranger
is refused. Harness: `tools/verify-mp-reconnect.js` (+ `mutate-mp-reconnect.js`). Detail:
`shared-implementation-notes.md` DD-47.
