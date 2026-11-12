# Task 3 — Shared-code / multiplayer audit, then fix

**Mode:** Review (override block on), then fix · **Tier:** review none; each fix is sized on its own
(usually 1, 2 when it changes the engine contract) · **Needs:** nothing, so it's good work while task 2
waits on the owner · **Sessions:** 1 for the audit, 1–2 for fixes
**Summary below written 12 Nov 2026 (SW v291).** Check it against the sources before relying on it.

> **Security handling:** findings go only to `wip/fable/MP-AUDIT.md` (git-ignored). This brief's Progress
> log records *that* the audit happened and which commits fixed what, never the weak spots themselves.
> The site is served straight from the repo.

## Why this

One bug in `engine-multiplayer.js` hits all 22 games, and it shows up at a party table with no way to
debug it. The code has grown by accretion (reconnect, presence, seats, the Intro, bots) and has never
had one end-to-end read. The free Firebase tier is also a hard ceiling nobody has measured against.

## Where things stand

- **Backend:** Firebase Realtime Database, anonymous auth, the free **Spark** plan. The SDK is vendored
  and lazy-loaded (`js/lib/firebase-init.js`). The rules are **recorded** in
  `docs/multiplayer-feature-specification-v1.4.md` §2.7 and **live in the Firebase console**, which no
  session can see.
- **Engine:** `js/engine-multiplayer.js` (202 KB: the envelope router, `mpSendEnvelope`, sync lock,
  seats, presence, Away, rejoin, room teardown) and `js/engine-intro.js` (38 KB). `MP_PROTOCOL_VERSION`
  v265.
- **The host is authoritative.** A client sends `ACTION`, the host broadcasts `SYNC`, and the engine drops
  your own `originId`. **A host drop deletes the room** (`onDisconnect(mpRoomRef).remove()`). There's no
  host migration.
- **Reconnect** (SW v236+): adopters `li5`, `flw`, `pko`, `cjar`, `hsg`, `comb`. Every other MDLM game gets
  a 60 s grace, then the host's Keep waiting / End.
- **Room cleanup:** explicit teardown plus timestamp recycling (spec §5).
- **Harnesses:** `verify-mp-configs.js`, `verify-mp-reconnect.js`, `verify-game-intro.js`, and per-game
  loopbacks on `mp-world` (`docs/rules/harnesses.md`).

## Pain points (known, already logged, so confirm or close them, don't rediscover)

From `docs/deferred-work.md` § Reconnect adoption, "Minor follow-ups":
- a rejoiner writes presence before its ACCEPT, so a refused rejoin briefly marks the seat back;
- "Not now" can't cancel an in-flight `mpRejoinRoom` (needs a generation token);
- `mpWatchRoomGone` doesn't call `mpEndMatchLocal()`, so Away can sit over "Host Disconnected";
- `graceEndsAt` is a host-clock timestamp;
- **a rejoin downloads the room's whole `/events` log** (`onChildAdded` without a query);
- the version refusal uses the rejoin modal's copy;
- GM and NT are missing from `MP_END_SCREENS`.

Also: the **BUG-06 class** (Firebase erases `null` / `{}` / `[]`; nested leaves are the blind spot, see
`shared-implementation-notes.md` BUG-06 addendum). GTH and DSD have no harness. The reconnect
**real-device pass** has never happened (owner-only).

**Unknown, which is the point of the audit:** Spark exposure (simultaneous connections, monthly download,
`/events` growth inside a long match and rooms that never get deleted); rules that let a client write
what only the host should; quit / drop / tab-away paths that strand a device; `sw.js` offline and update
risks for a phone mid-session.

## Read first (Grep first, then slices; nothing big whole)

1. `docs/rules/multiplayer.md` (32 KB): Grep the section list, then read Globals, Envelope Schema,
   Mid-Game Quit Contract and Client Reconnect.
2. `docs/multiplayer-feature-specification-v1.4.md`: §2.7 (rules), §3 (envelope), §5 (cleanup).
3. `js/engine-multiplayer.js`: the router, `mpSendEnvelope`, presence/Away, `mpRejoinRoom`,
   `mpEndMatchLocal`, `mpWatchRoomGone`, `resetToLobby` additions, room create/teardown. Grep each name.
4. `js/engine-intro.js`: the packet handlers and `mpIntroStop` / `mpIntroTeardown`.
5. `js/lib/firebase-init.js` (2 KB), plus the `sw.js` fetch/install/activate handlers.
6. `docs/rules/mp-bots-reconnect.md` (7 KB, whole).
7. Sample games, slices only: `js/games/hsg.js` (newest, a reconnect adopter) and `js/games/bld.js` (an
   older MDLM game, hidden roles, no reconnect). Grep `HandleEnvelope` and `syllyMultiplayerMode`.
8. `shared-implementation-notes.md` (434 KB, **never whole**): Grep `DD-47`, `BUG-06`, `DD-54`.

**Optional owner input:** ask the owner to paste the **live** rules from the Firebase console into
`wip/fable/firebase-rules-live.json`. The audit is much stronger if the deployed rules can be compared
with §2.7.

## The result we want

**Step 1 — audit.** `wip/fable/MP-AUDIT.md`: **the top 5 issues plus up to 15 more**, ranked by harm at a
real table. Each one: `file:line` evidence, the trigger in plain words, who it hurts, a fix sketch, its
tier, and the harness that would catch it. Mark every guess as a guess. Add a short Spark-tier section
with numbers (or the measurement that would give them), and close the logged follow-ups above as
confirmed, already fixed, or not real.

**Owner gate:** the owner picks which to fix. A rules change is pasted into the console **by the owner**.
Write it to `wip/fable/` ready to paste, and update §2.7 in the spec once the owner confirms it's live.

**Step 2 — fix.** One concern per commit. Prove each packet-shaped fix with a loopback before a live
session, and add a mutant when a harness gains a check. Neutral impl-notes entries in
`shared-implementation-notes.md` ("rejoin now queries `/events` from the seat's cutoff"), no exploit
detail. Move resolved deferred-work items to `deferred-work-log.md`. An `MP_PROTOCOL_VERSION` bump only if
a packet shape changes.

## Verification

`verify-mp-configs` · `verify-mp-reconnect` · `verify-game-intro` + `mutate-game-intro` · every adopter's
loopback (`docs/rules/harnesses.md`) · `verify-build-fresh` if markup changed. The owner's real-device
pass stays open, so write its checklist if a fix touches rejoin.

## Progress log

*(append: date · what was done · commits · where it stopped · next concrete step — no findings here)*
