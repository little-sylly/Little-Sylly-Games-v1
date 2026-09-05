# Deferred Work

**On-demand — not auto-loaded.** The running list of known-but-not-yet-done work: code divergences,
retest backlogs, and audit items that are deliberately parked rather than forgotten. Newest section on top.
Tick items off here; promote anything architectural into `decision-log.md`.

> Replaces `docs/fable-fix-plan.md`, which `logic-engine.md` pointed at but which no longer exists in the repo.

---

## ⬆ HIGH PRIORITY — MDLM client reconnect (Honeycomb Hills Q20, 6 Sep 2026)

**Status:** owner-approved deferral. Raised as **Q20** in `docs/new-game-tech-honeycomb-hills.md` §16;
the owner's answer was *"fine with you folding it into the build **unless you need to touch other games
or a big part of the core code**, otherwise place it in deferred work high priority."*

**The exclusion applies, so it is deferred.** Reconnect **Option 1** (a client that drops rejoins its
seat) is not per-game work: its change #3 redefines the **Mid-Game Quit Contract**, which
`tools/verify-mp-configs.js` §6 asserts across **all 20 games**. Today that contract says one device
leaving dissolves the session for everyone — which is precisely the behaviour reconnect has to stop
being unconditional. Folding it into a new game's build would make a suite-wide engine change wear a
new game's clothes, and would put every other game's quit path in the blast radius of game 20.

**Why it is high priority and not "someday":** every MDLM game already carries this exposure, and
Honeycomb Hills makes it materially worse. A Full Season is **60–80 turns / ~50 minutes** with
**permanent private hands**. Every other MDLM game's worst case is losing a short round; this one's is
losing three-quarters of an hour of four people's evening to one phone locking or one tab being
backgrounded too long.

**Groundwork already shipping in the game 20 build — do not redo it:**
- `combSerialiseState()` / `combApplyState()` are **written in v1** (spec §11), even though nothing calls
  them for reconnect. They exist for the loopback harness and the late-join path, and they are exactly
  the state-transfer half reconnect needs.
- `COMB_FULL_STATE` is already in the private-packet table as the late-join carrier.
- The brief's Appendix A4 investigation found **stable device identity is already free** (`syllyDeviceUid`),
  which was the piece expected to be hard.

**Explicitly still open (the engine half):** re-attaching `mpStartEventListener` /
`mpStartPrivateListener` on rejoin, the host recognising a returning `uid` as its existing seat rather
than a new join, a grace window before the quit contract fires, and the `verify-mp-configs.js` §6
assertion being rewritten to accept the new contract. **Host migration is a separate, larger question**
— Appendix A4 found it blocked by a single line, but reopening it has consequences and it is not part
of this item.

**When picked up:** it is an *engine* task (`js/engine-multiplayer.js` + the harness), not a game task.
Model + effort: **Opus, high** — it is a cross-cutting contract change.

## ⬆ HIGH PRIORITY — JEC and CJAR brand colours vs the new Honeycomb Hills gold (Q22, 6 Sep 2026)

**Status:** owner-approved, logged at the owner's explicit request (*"yes log it in deferred work also
high priority"*). Raised as **Q22** in `docs/new-game-tech-honeycomb-hills.md` §16.

**The problem.** The lobby sorts its keycaps by hue (`LOBBY_COLOUR_ORDER`, `js/engine.js`). Game 20
inserts a third warm gold into a span barely 6° wide:

| Slot | Game | Colour | Hue |
|---|---|---|---|
| n | **JEC** (Just Enough Cooks) | amber-500 `#f59e0b` | **37.7°** |
| n+1 | **COMB** (Honeycomb Hills) — new | `#F0A500` | **41.3°** |
| n+2 | **CJAR** (Cookie Jar) | `#D4A017` | **43.5°** |
| n+3 | FRT (Fruit Salad) | `#FFE500` | 53.9° |

Three adjacent keycaps within **5.8°** of each other. Individually each is a good colour; stacked in
the lobby they read as one smear rather than three games, which defeats the point of sorting by colour
at all.

**The brief's proposal (Q3): move JEC off amber-500, and move CJAR to chocolate.** Neither is decided —
CJAR's honey-gold in particular is tied to its identity (a *cookie jar*), so "chocolate" needs to be
weighed as an identity change, not just a hue nudge. That is the call this item is holding open.

**Not blocking, and explicitly not game 20's job to fix.** COMB ships `#F0A500` and takes its
`LOBBY_COLOUR_ORDER` slot between `btn-jec` and `btn-cjar` as specced. Logged so the crowding is a known
decision rather than something re-discovered later as drift.

**Blast radius if actioned** — per game, and this is why it is not a two-line change: brand hex in
`css/styles.css` (CTA + hover, `pill-active-*`, `game-toggle-on-*`, `*-range` gradient ×3, label tone,
modal border, settings light tint), the `MP_GAME_CONFIGS` `brandBtnClass`/`ctaTextClass`, the identity
doc, `docs/rules/per-game-classes.md` Tables A/C, and `LOBBY_COLOUR_ORDER` if the hue moves far enough
to change the sort position. **Also check ink:** `#f59e0b` and `#D4A017` are light fills using dark ink,
and a darker replacement may flip that — which collides with the **open FRT + CJAR ink-mismatch item
below** (2 Sep 2026). **Do these two together**; fixing one without the other means touching CJAR's
palette twice.

**When picked up:** decide the *identities* first (does CJAR want to be chocolate?), then do JEC and
CJAR in one pass with the ink item. Model + effort: **Sonnet, medium** for the mechanical sweep once
the colours are chosen; the choice itself is an owner call, not a model call.

---

## Cold Shoulder (CLD) — phase 40 gate still OPEN + two presentation follow-ons (4 Sep 2026, SW v219 → v221)

Game 19 shipped through Stage 6 (documentation closure). Every headless harness and the two-client
loopback pass. **Not yet done:**

1. **Live multi-device session** — host + ≥2 real devices, a full Match including a plunge, a rim
   Snowball, a Dive, a Washout, and The Thaw on. Closes the phase gate along with item 2. Also
   check **How to Play → The Floe** on a real device: Shove/Resurface, the six-pose cast, and the
   practice RAF stopping on tab-switch / close (v221; `visual-check` clean but never on hardware).
2. **Offline install check** — unregister the SW, go offline, cold-boot, confirm
   `js/lib/physics.js` and `js/games/cld.js` precached. The Floe tab (v221) is a *procedural*
   reference, not asset-backed, so it does not double as a gallery check — run this directly.
3. **TG-13 — The Thaw's shrink is visually inaudible in playback. DONE, SW v220 (4 Sep 2026).**
   `cldBeginPlayback` rewinds `cldFloeRadius` to the first `thaw` beat's `fromRadius`; the `thaw`
   aftermath beat sets it to `newRadius` as it plays. Two lines in shared functions, no timeline
   field. All headless harnesses still green; real-device readability of the shrink now rides check 1
   (the live session with The Thaw on). `cld-implementation-notes` TG-13 (RESOLVED).
4. **Recorded intent, not a bug** — the owner intends to demote The Thaw to a normal setting later
   and give CLD a Sylly Mode that changes what the game *is*, not how fast it runs. Ships as-is.
5. **Peck Off (2-player) balance** got lighter attention than the mid sizes in
   `simulate-cld-balance.js`.

Snapshot: `docs/phase40-snapshot.md`.

## FRT + CJAR in-game CTAs still use dark ink while their lobby keycaps use white (2 Sep 2026)

**Status:** approved by the owner, deliberately deferred — it is not the two-button change it looks like.

**What's inconsistent.** SW v216 gave FRT and CJAR white labels on their **lobby keycaps** only —
`#btn-frt` carries `text-white`, and `#btn-cjar` gets `#btn-cjar { color: #ffffff }` overriding
`.cjar-cta`'s near-black. The comment at `css/styles.css:2105` is explicit that this is "Lobby
keycap only… without touching in-game CTAs." Every other brand-fill button in both games is still
dark ink, so each game now reads two ways depending on which screen you are on.

**The owner has confirmed white as visually acceptable on both fills** and wants them brought into
line. This was raised while settling Cold Shoulder's own brand (`#8ECAE6`, white everywhere —
`new-game-brief-cold-shoulder.md` §1), which set the precedent this would align to.

**Why it is deferred: the scope is ~10 sites, not 2.** FRT alone has eight dark-ink brand-fill
buttons:

| File | Site |
|---|---|
| `index.html:8042` | `btn-frt-menu-play` |
| `index.html:8094` | `btn-frt-go-again` |
| `index.html:8167` | `btn-frt-settings-done` |
| `index.html:8223` | `btn-frt-howto-close` |
| `index.html:8233` | `btn-frt-howto-close-cards` |
| `index.html:8246` | `btn-frt-quit-confirm` |
| `index.html:8260` | `btn-frt-new-confirm` |
| `index.html:8341` | `btn-frt-personalities-close` |
| `css/styles.css:2103` | `.cjar-cta { color: #292524 }` — covers every CJAR in-game CTA at once |
| `js/engine-multiplayer.js:352` | FRT `ctaTextClass: 'text-stone-800'` |
| `js/engine-multiplayer.js:444` | CJAR `ctaTextClass: 'text-stone-800'` |

**Three things to respect when picking this up:**

1. **All or nothing per game.** Changing only the Play CTA leaves FRT with white on one button and
   dark on seven — visibly worse than either extreme. This is the reason it wasn't done as a quick fix.
2. **Use a Node script, not Edit calls.** Eight `index.html` sites is a systematic change, and the
   standing encoding rule applies — Edit-tool sweeps of `index.html` have produced UTF-8 mojibake before.
3. **A measurement is being overridden, knowingly.** `engine-multiplayer.js:442` records "#D4A017
   measures 2.38:1 against white — below the 3:1 floor", and white on FRT's `#FFE500` is worse still.
   The owner's visual confirmation supersedes it, but **replace that comment rather than deleting it** —
   the next reader needs to know the number was considered, not missed. Both games' fills sit behind
   `.gel-btn`'s dark base gradient and label text-shadow on the surfaces that matter, which is what
   makes it legible in practice; any *flat* brand-fill surface should gain a matching text-shadow.

**Closing it needs:** the ~10 edits, an SW bump (with the outgoing entry moved verbatim to
`sw-changelog.md`), and updates to `docs/rules/per-game-classes.md:105` and `logic-engine.md`'s
`ctaTextClass` row, both of which currently cite FRT and CJAR as the examples of dark-ink fills.

---

## Music — the architecture shipped, the content has not (28 Aug 2026, SW v212)

`js/lib/music.js` and the `data/music/` contract are live and verified. What is parked:

- **3 of 18 games now have a track of their own — LI5, Great Minds, Secret Signals (30 Aug 2026).**
  The other 15 still fall back to the lobby theme, which is the designed behaviour, not a bug.
  Prompts for all 18 are written and ready to generate: `docs/music-prompts.md`. Shipping one is:
  generate → trim to a loop → drop `data/music/<activeGameId>.mp3` in → add one manifest line. No
  code, no SW bump.
- **All four shipped tracks are well over the ~1.5 MB per-track ceiling** (`lobby.mp3` 5.46 MB,
  `li5.mp3` 4.32 MB, `gm.mp3` 3.52 MB, `ss.mp3` 6.04 MB — ~19.3 MB combined). Shipped as-is
  deliberately so there is something playing today. Needs a trim to 60–120 s loops at ~128 kbps
  before the track count grows further — cache-first means the cost is a one-off download per
  device per game played, but it compounds as more tracks ship untrimmed.
- **`li5.mp3` / `gm.mp3` / `ss.mp3` carry no title/artist in the manifest** (`null`/`null` — the
  generator used didn't hand back metadata the way the lobby track's did). Cosmetic only —
  `Music.nowPlaying()` already handles `null` — but worth filling in before a credits surface is
  built. Edit the relevant `data/music/manifest.json` entry directly; no code change needed.
- **A Music & Sound section in the Phase 1 brief template** (`docs/rules/new-game-brief-template.md`).
  Three fields, no more: the register in one line, tempo/energy, and anything the music must *not*
  do (Deep-Sea Deploy's "no sonar pings" is the model). The fallback rule means it can be left blank
  without blocking a build — which is exactly why it hasn't been added yet.
- **Sylly Mode variant tracks** — five games flip register hard enough to justify a second take at
  the same tempo and key (SHP → Night Terrors, PKO → Force of Nature, FLW → The Counterfeit Run,
  NT → Devil's Network Protocol, GM → Static Interference). Would need a second resolution tier
  (`<gameId>-sylly`) in `Music.playFor` — deliberately not built for a hypothetical.
- **No credits surface.** `Music.nowPlaying()` returns `{ key, title, artist }` and nothing consumes
  it yet. The manifest already carries per-track attribution.

---

## CLOSED — both recurring MP bugs from the identity-doc pass, plus three games it missed (23 Aug 2026)

**SW v210.** The nine bullets marked RESOLVED in the sections below are fixed. Two bug classes, both
cross-cutting, both invisible to every existing harness.

**Bug class 1 — lobby bounds read single-device setup state (5 games: SS, JEC, YGI, LTTP, DSD).**
`getMaxPlayers`/`getMinPlayers` are consulted at exactly two moments, and both are *before* the game
has shown a screen of its own: `mpRenderHostPlayerList()` while the room fills, and the room node's
`maxPlayers` at create time. So a bound reading `ssPlayerCount` / `jecPlayerCount` /
`ygiPlayerCount` / `lttpPlayerCount` / `dsdPlayersPerTeam` resolved against that variable's
**declared default**, permanently — the Pass-the-Phone screen that moves it is skipped entirely in
Lobby Mode, and the game's own `onPassThePhone` overwrites it from the roster far too late to
matter. All five capped their rooms at 4 while their Pass-the-Phone setup offered 6, with nothing
anywhere explaining why a 5th join bounced. LTTP was worst: min *and* max both pinned, so an MDLM
room could only ever be exactly 4.

**Fix:** the bounds are constants now (SS/DSD 4–6 MDLM, 2 TLM · JEC/YGI 3–6 · LTTP 4–6). Worth
recording that **this list's own proposed fix was wrong** — it read "reading the roster's live size
during lobby-fill, not a game-local variable", repeated across four sections. A *cap* cannot be the
roster's size; the roster is what the cap constrains. The real rule is narrower and easier: a lobby
bound must not read game-local state at all.

**Raising SS's and DSD's caps exposed an older hole, closed in the same change.**
`mpRosterCheckConfirm` only ever validated that every player was *assigned*, never that the two
teams matched — so 3v2 confirmed fine, and before the min-players fix so did 4v0. Both games derive
per-team size from **team A alone** (`ssPlayerCount = ssPlayerNamesA.length`,
`dsdPlayersPerTeam = dsdPlayerNames[0].length`), so an uneven roster silently mis-sizes team B. New
`rosterConfig.requiresBalancedTeams: true` gates both ends: the host lobby CTA rejects an odd
roster, and the roster screen requires `|A| === |B|`, with a new amber reason line
`#mp-roster-hint`.

**Bug class 2 — the Mid-Game Quit Contract was never wired up (8 games).** The identity pass flagged
five (LI5, GM, SS, JEC, YGI). Grepping the suite for the shape found **three more nobody had
recorded — LTTP, NAT and DSD** — with the identical unconditional handler. All eight now call the new
engine helper `mpNotifyPlayerLeft()` (generic `MP_PLAYER_LEFT`, handled in `mpHandleEnvelope`
before any per-game routing), and the rule in `logic-engine.md` is **widened past MDLM to every
lobby session** — it was written MDLM-only, which is exactly why the two TLM games (LI5, DSD)
slipped past it. The ten games that already had a per-game `[ABBR]_PLAYER_LEFT` are untouched.

**Enforced from here on: `node tools/verify-mp-configs.js`** — entry schema, bounds sanity, bound
purity, agreement with each game's own Pass-the-Phone count pills in `index.html`, the
balanced-teams invariant, and the quit contract, across all 18 games. It fails on pre-fix `main`
(`MP_SRC=` drives another copy of `engine-multiplayer.js` through the same checks) and passes on
the fix.

**Deliberately left open**, and still listed below: **NAT's Pass-the-Phone floor** — `getMinPlayers()`
is 3 but the Researcher pills offer 4–8, and whether that PTP floor is intentional is still
unrecorded. The harness prints it as a documented `note`, not a failure; resolving it means deciding
whether a 3-player expedition should exist at all, which is a design call, not a bug fix.

**Detail:** `shared-implementation-notes.md` § Multiplayer Lessons, `docs/decision-log.md`
23 Aug 2026, and each game's `docs/game-identities/[abbr].md` T7c.

---

## LI5 gaps found while writing its identity doc (23 Aug 2026)

**Found, not fixed.** An identity pass records the game as it shipped; fixing what it reveals is a
separate task (spec § 15).

- **RESOLVED 23 Aug 2026 (SW v210)** — see the closure section at the top of this file. **Mid-game quit doesn't dissolve the session for the other device — and this is the first
  instance found in TLM rather than MDLM.** `btn-quit-confirm` calls the shared engine
  `resetToMenu()` (`js/engine.js`), which stops the timer, clears the team-name inputs and navigates
  to `screen-menu` — no `syllyMultiplayerMode` branch and no MP teardown of any kind, since it's a
  plain engine helper rather than a per-game handler. In Team Lobby Mode this leaves the Firebase
  room and the other team's device stranded. Same shape as the MDLM Mid-Game Quit Contract gap
  logged below for GM, SS, YGI and JEC (and fixed long ago in GTH/DYB/BLD/PASS via
  `[ABBR]_PLAYER_LEFT`) — **but note the contract in `logic-engine.md` is written for MDLM only**,
  so a fix pass should widen the rule to cover TLM rather than just patching LI5. LI5 and DSD are
  the games this affects (SS supports TLM too but has its own separate MDLM entry below).
- **Minor, documentation-only:** `li5-implementation-notes.md` lists L6 (deck panel behind its own
  opener), L7 (phantom timer on quit-cancel) and L8 (Pinky Swear score desync) as open. All three
  are fixed in shipped code — `deck-panel` is now `z-[100]`, `hideQuitConfirm()` guards on the
  active-play screen being visible, and `flipEntry()` re-clamps every entry sequentially from
  `scoreBeforeTurn`. Same stale-Bug-Index pattern as GM (below); the generalised lesson is in
  `shared-implementation-notes.md` § Template Gaps.

`docs/game-identities/li5.md` T7c already carries both of these; fixing either means updating that
section in the same change.

---

## GM gaps found while writing its identity doc (23 Aug 2026)

**Found, not fixed.** An identity pass records the game as it shipped; fixing what it reveals is a
separate task (spec § 15).

- **RESOLVED 23 Aug 2026 (SW v210)** — see the closure section at the top of this file. **Mid-game quit doesn't dissolve the Lobby Mode session for the other device.**
  `btn-gm-quit-confirm` resets local round state and calls `showScreen('screen-gm-menu')`
  unconditionally — no `syllyMultiplayerMode` branch, no `GM_PLAYER_LEFT` notification, no
  `resetToLobby()`/`mpReturnToLobby()` call. Same MDLM Mid-Game Quit Contract gap as SS, YGI and JEC
  (all logged below), GTH, DYB, BLD and PASS all needed dedicated `[ABBR]_PLAYER_LEFT` fixes for —
  the **fourth** game found missing it during this identity-doc pass alone. GM's player count is a
  fixed 2 (`getMaxPlayers()` for `gm` is a hardcoded `2`), so there's no player-count-cap
  counterpart bug to also flag here, unlike SS/YGI/JEC/LTTP.
- **Minor, documentation-only:** `gm-implementation-notes.md`'s Bug Index lists G4 (Lobby Mode
  near-sync silently discarding the round), G5 (host/client showing different mismatch phrases) and
  G6 (quit overlay border colour copy-pasted from SS's teal instead of GM's purple) as open. All
  three are actually fixed in the shipped code — `gmMpResolveRound()` now runs `gmHandleMismatch()`
  on the near-sync path (with an inline comment describing the exact fix the notes call for) and
  overrides the result heading with the broadcast phrase; `gm-quit-overlay` now carries
  `border-purple-300`. Only **G3** (a reported, unreproduced screen-refresh-on-the-other-device bug)
  is still genuinely open. Worth a pass through `gm-implementation-notes.md` to close G4/G5/G6 and
  either action or drop G3 — not urgent enough for its own task, just noise for anyone reading the
  Bug Index cold.

`docs/game-identities/gm.md` T7c already carries both of these; fixing either means updating that
section in the same change.

---

## SS gaps found while writing its identity doc (23 Aug 2026)

**Found, not fixed.** An identity pass records the game as it shipped; fixing what it reveals is a
separate task (spec § 15).

- **RESOLVED 23 Aug 2026 (SW v210)** — see the closure section at the top of this file. **MDLM's player-count cap is pinned to a value only the single-device screen ever changes — a
  fourth confirmed instance of this exact bug shape.** `getMaxPlayers()` for `ss` in
  `engine-multiplayer.js` resolves to `window.mpLobbyStyle === 'team' ? 2 : ssPlayerCount * 2`. The
  2-device TLM branch is correct by design. But the MDLM branch reads `ssPlayerCount`, a game-local
  variable defaulting to `2` that only otherwise moves via the Pass-the-Phone "Team size" pills on
  `screen-ss-players` — a screen MDLM never shows — or, too late to matter, inside
  `startSyllySignals()` itself after the Lobby Mode roster has already filled. Result: **a Lobby
  Mode room can only ever fill to 4 devices (2v2), never the 3v3 Pass-the-Phone/TLM support.** This
  is the **fourth** game found with this exact architecture, after Late to the Party, You Get It?
  and Just Enough Cooks (all logged below) — strong enough of a pattern that one shared fix (reading
  the roster's live size during lobby-fill, not a game-local variable) would close all four at once.
- **RESOLVED 23 Aug 2026 (SW v210)** — see the closure section at the top of this file. **Mid-game quit doesn't dissolve the Lobby Mode session for the rest of the group.**
  `btn-ss-quit-confirm` calls `ssResetToMenu()` unconditionally — no `syllyMultiplayerMode` branch,
  no `SS_PLAYER_LEFT` notification, no `resetToLobby()`/`mpReturnToLobby()` call. Same MDLM Mid-Game
  Quit Contract gap as YGI and JEC (both logged below), GTH, DYB, BLD and PASS all needed dedicated
  `[ABBR]_PLAYER_LEFT` fixes for — the **third** game found missing it during this identity-doc pass
  alone. `docs/code-map.md`'s SS Key Buttons table now flags this inline.
- **Minor, cosmetic:** `ss-implementation-notes.md` S16 records "no header `[?]` → How to Play on
  gameplay screens" as an open gap; the encrypt screen now has `btn-ss-how-to-game` wired to the full
  How to Play overlay (in addition to its separate contextual-tip `?`), so that note is stale for at
  least this one screen — the broadcast/intercept screens still lack it. Worth a note update next
  time `ss-implementation-notes.md` is touched, not urgent enough for its own pass.

`docs/game-identities/ss.md` T7c already carries all three; fixing any of them means updating that
section in the same change.

---

## JEC — open after the 27 Aug 2026 rework (SW v211)

- **Special Instructions × Fusion Cuisine stacking — flagged for playtest, deliberately NOT made
  exclusive.** With both on, a Chef prepping is holding three constraints at once: two Orders to
  fuse, a Special Instruction bending them, and the usual hunt for a narrow band of agreement. That
  may be the best thing in the game or one constraint too many, and there is no way to tell from a
  harness — it is a feel question. If it proves too much, making the two mutually exclusive is a
  small, well-patterned change (`ui-style.md` § Mutually-exclusive / superseded settings — FRT's
  Pear-Off ↔ Sylly Mode is the reference, and NT's Debug Mode is the how-to-overlay mirror).
  **Do not pre-emptively make them exclusive** — the stack was designed to be tried.
- **JEC has no How-to gallery tab, and correctly should not.** Recorded so a future gallery-tab
  sweep does not reopen it: a gallery tab renders a game's deck *through its own render seam*, and
  JEC has neither deck nor seam — every visual is emoji or text (identity doc T9). The only game
  with a seam still missing a tab is PASS, logged separately.
- **CLOSED 27 Aug 2026** — `jec-new-shift-overlay`'s z-index. The June 2026 audit logged it as
  z-[80] where the Play-Again Confirmation rule wants z-[90]; the shipped markup already reads
  z-[90]. Fixed at some point without the note being updated. Verified by reading `index.html`, not
  by re-fixing.

---

## JEC gaps found while writing its identity doc (23 Aug 2026)

**Found, not fixed.** An identity pass records the game as it shipped; fixing what it reveals is a
separate task (spec § 15).

- **RESOLVED 23 Aug 2026 (SW v210)** — see the closure section at the top of this file. **MDLM's player-count bounds are pinned to a value only the single-device roster screen ever
  changes.** `getMaxPlayers()` for `jec` in `engine-multiplayer.js` resolves to `jecPlayerCount`,
  which only moves when the Pass-the-Phone roster screen's count pills are tapped, or (too late to
  matter) when `jecInitRoster()` overwrites it with the roster size *after* the lobby has already
  filled. The roster screen is skipped entirely in Lobby Mode, so `jecPlayerCount` never leaves its
  default of 4 during the roster-filling phase — a Lobby Mode room can only ever fill to 4 players
  (`getMinPlayers()` is a fixed 3), never the 5–6 Pass-the-Phone supports. **This is the third game
  found with this exact bug shape**, after Late to the Party and You Get It? (both logged above) —
  the same architecture independently repeated three times strongly suggests one shared fix (reading
  the roster's live player count during lobby-fill, rather than a game-local variable set too late)
  would close all three at once. Worth checking whether DSD's near-identical
  `getMaxPlayers`/`dsdPlayersPerTeam` pattern (also logged above) is a fourth instance before
  scoping the fix.
- **RESOLVED 23 Aug 2026 (SW v210)** — see the closure section at the top of this file. **Mid-game quit doesn't dissolve the Lobby Mode session for the rest of the group.** The
  quit-confirm handler calls `jecResetForNewGame()`, which unconditionally ends in
  `showScreen('screen-jec-menu')` — no `syllyMultiplayerMode` branch, no
  `resetToLobby()`/`mpReturnToLobby()` call. Same MDLM Mid-Game Quit Contract gap as YGI (logged
  above), GTH, DYB, BLD and PASS all needed dedicated `[ABBR]_PLAYER_LEFT` fixes for — this is the
  **second** game in this identity-doc pass alone found with it. `docs/code-map.md`'s JEC Key
  Buttons table now flags this inline.

`docs/game-identities/jec.md` T7c already carries both of these; fixing either means updating that
section in the same change.

---

## YGI gaps found while writing its identity doc (23 Aug 2026)

**Found, not fixed.** An identity pass records the game as it shipped; fixing what it reveals is a
separate task (spec § 15).

- **RESOLVED 23 Aug 2026 (SW v210)** — see the closure section at the top of this file. **MDLM's player-count bounds are pinned to a value only the single-device setup screen ever
  changes.** `getMaxPlayers()` for `ygi` in `engine-multiplayer.js` resolves to `ygiPlayerCount`,
  which only moves when the Pass-the-Phone setup screen's count pills are tapped, or (too late to
  matter) when `ygiShowSetup()` overwrites it with the roster size *after* the lobby has already
  filled. The setup screen is skipped entirely in Lobby Mode, so `ygiPlayerCount` never leaves its
  default of 4 during the roster-filling phase — a Lobby Mode room can only ever fill to 4 players
  (`getMinPlayers()` is a fixed 3), never the 5–6 that Pass-the-Phone supports. This is the same
  shape of gap as LTTP's `lttpPlayerCount` issue (logged above), in a different game — worth a
  combined fix pass across both games rather than two separate ones.
- **RESOLVED 23 Aug 2026 (SW v210)** — see the closure section at the top of this file. **Mid-game quit doesn't dissolve the Lobby Mode session for the rest of the group.**
  `btn-ygi-quit-confirm`'s handler (`js/games/ygi.js`) is unconditional —
  `showScreen('screen-ygi-menu')` with no `syllyMultiplayerMode` branch and no call to
  `resetToLobby()`/`mpReturnToLobby()`. In MDLM this strands the quitting player on the local menu
  while still occupying a Firebase room slot, and leaves every other device waiting on a turn that
  will never come — the exact failure class the MDLM Mid-Game Quit Contract (`logic-engine.md`) was
  written to close, which GTH, DYB, BLD and PASS all needed a dedicated `[ABBR]_PLAYER_LEFT` fix
  for. YGI was never given the same fix. `docs/code-map.md`'s YGI Key Buttons table now flags this
  inline.

`docs/game-identities/ygi.md` T7c already carries both of these; fixing either means updating that
section in the same change.

---

## LTTP gaps found while writing its identity doc (23 Aug 2026)

**Found, not fixed.** An identity pass records the game as it shipped; fixing what it reveals is a
separate task (spec § 15).

- **RESOLVED 23 Aug 2026 (SW v210)** — see the closure section at the top of this file. **MDLM's player-count bounds are pinned to a value only the single-device setup screen ever
  changes.** `getMinPlayers()` and `getMaxPlayers()` for `lttp` in `engine-multiplayer.js` both
  resolve to `lttpPlayerCount`, which only changes when the Pass-the-Phone setup screen's count
  pills are tapped. That screen is skipped entirely in Lobby Mode (`onPassThePhone` goes straight
  to `lttpStartGame()`), so `lttpPlayerCount` never leaves its default of 4 — an MDLM room can only
  ever be exactly 4 players, not the 4–6 range Pass-the-Phone supports, with no visible setting
  anywhere in Lobby Mode explaining why a 5th join is rejected. `code-map.md`'s LTTP section didn't
  previously record this — worth checking whether it's an intentional MDLM floor or a genuine gap.
- **`#screen-lttp-role-reveal` is dead code that still ships.** It's registered in `allScreens[]`
  with a complete Stack-migrated layout, and `index.html`'s own LTTP section-header comment lists it
  as part of the screen inventory — but `lttpShowRoleReveal()` no longer exists in `lttp.js` at all
  (it was apparently removed at some point after the Phase 3 audit flagged it as dead-but-present),
  and nothing else calls `showScreen('screen-lttp-role-reveal')`. Role info is folded into the Chat
  screen's own header instead. `docs/code-map.md`'s LTTP Screens table previously described this
  screen as live ("shown after pass-gate handover") — corrected in the same pass as this entry.
- **Three contextual-help surfaces with unclear boundaries.** The header `[?]` opens the full How to
  Play overlay; a second inline `?` next to the map instructions opens `lttp-tip-overlay`; the
  message composer has its own `[?]` opening `lttp-help-tip-overlay` (a legacy single-string
  variant, shaped differently from every other tip overlay in the suite). A player can't tell which
  of the two non-header `?` icons goes where before tapping one.

`docs/game-identities/lttp.md` T7c already carries the first and second of these; fixing any of them
means updating that section (and `code-map.md`, already partially corrected) in the same change.

---

## NAT gaps found while writing its identity doc (23 Aug 2026)

**Found, not fixed.** An identity pass records the game as it shipped; fixing what it reveals is a
separate task (spec § 15).

- **Pass-the-Phone can't reach the Lobby Mode floor.** `getMinPlayers()` for `nat` in
  `engine-multiplayer.js` returns 3, but the Researcher-count pills on `screen-nat-setup`
  (`index.html`) only offer 4 through 8 — there's no way to start a 3-player expedition in
  Pass-the-Phone even though Lobby Mode allows it. Unrecorded whether this is an intentional PTP
  floor (three roles at three players leaves no spare Field Researcher) or a pill row that never
  got updated to match the engine minimum.
- **`screen-nat-daily-review` (Sylly Mode only) has no `[?]`.** Every other Interactive screen in
  the loop carries a help button; the one screen unique to Survival of the Fittest doesn't.
- **The Suspicion Log (`nat-tally-suspicion`) only renders for one outcome.** It shows who voted
  for whom, but only when The Mole was caught and then guessed the Specimen incorrectly — every
  other outcome (Mole escapes, Mole caught and guesses correctly) tallies silently. Whether that's
  deliberate ("only show the receipts when it mattered") or an oversight isn't recorded.

`docs/game-identities/nat.md` T7c already carries these; fixing any of them means updating that
section in the same change.

---

## DSD gaps found while writing its identity doc (23 Aug 2026)

**Found, not fixed.** An identity pass records the game as it shipped; fixing what it reveals is a
separate task (spec § 15).

- **`screen-dsd-sabotage` has no `[?]`.** Every other Interactive screen in DSD's loop carries a
  help button, but Sabotage — the one screen unique to Silent Running, and the first place a player
  meets the Jammer mechanic — doesn't. The only in-line explanation is the single instruction line
  above the grid; there's no way to reach the fuller how-to from that screen.
- **The Spectator screen carries no `[?]` or ✕**, only 🔊. Defensible (it's read-only, nothing to
  confirm or protect by gating an exit) but it means a waiting spectator has no way to reach a rules
  refresher without waiting for their own team's turn.
- **Two different help surfaces exist with no cross-link.** The Captain's inline `?` next to the
  ping-word input opens `dsd-help-tip-overlay` (a short, dynamically-set single tip); the header
  `[?]` opens the full `dsd-how-to-overlay`. A player who's only ever used the inline tip may not
  know the fuller how-to exists.

`docs/game-identities/dsd.md` T7c already carries these; fixing any of them means updating that
section in the same change.

---

## GTH gaps found while writing its identity doc (23 Aug 2026)

**Found, not fixed.** An identity pass records the game as it shipped; fixing what it reveals is a
separate task (spec § 15).

- **`gth-case-report-progress` is a reserved, empty container.** `screen-gth-case-report` reserves a
  div for per-player progress dots (the comment reads "Per-player progress dots"), but nothing in
  `gth.js` ever writes to it — `gthShowCaseReport()` only populates `gth-case-report-stats` and
  `gth-case-report-time`. A player waiting there sees only static text, no sense of how close the
  rest of the group is. Already logged in `gth-implementation-notes.md`'s Bug Index (June 2026
  audit) as "logged, not yet fixed" — carried forward here as part of the identity-doc migration
  rather than newly found.
- **The Waiting Room and Case Report screens carry no rotating flavour line.** Both are held-beats a
  player can sit in for a while depending on how slow the table is, and both show one fixed line
  every session, unlike the suite's Round/Night Intro standard (a small rotating pool, per
  `ui-style.md`).

Either populate the progress container (mirror `gthUpdateWaitingProgress()` using
`gthDiagnosesReady`) or remove the dead div; either way `docs/game-identities/gth.md` T7c needs the
matching update in the same change. The flavour-rotation gap is lower priority — CJAR carries the
identical open item for its own Raid Summary screen.

---

## `verify-cjar-loopback.js` is FLAKY — intermittent Dibber Dobber payout-beat failure (22 Aug 2026)

**Found during identity-doc pass 1, which changed no application code at all** (docs + one new tool
only; `git diff main` over `js/`, `index.html`, `sw.js`, `css/`, `data/` is empty). The harness still
fails at **~20-25%**. Measured over 20 trials each: **pristine `main` 4/20, the branch 5/20** — statistically indistinguishable, so this is not something the pass introduced. (An initial 8-run sample came back 8/8 clean on `main` and was misleading; at this rate that has ~10% probability. Use 20+ trials when judging this one.)

```
Dibber Dobber payout beat: the actual split, not cjarPlayerCount (DD-20 review fix)
  FAIL  host2 threw the exact split token count
          expected 3, got 4
  FAIL  client2 threw the exact split token count
```

**Likely cause.** This is the one CJAR harness with a **real shuffle** (the other three stub identity
— TG-03). The assertion expects a fixed token count of 3, but the number of players who Reach In on
the flip under test depends on the deal, so a different shuffle legitimately produces 4. The
assertion looks over-specified rather than the game being wrong — but that is a hypothesis, not a
diagnosis, and it has not been confirmed.

**Why it matters more than a normal flake.** `CLAUDE.md` and `docs/code-map.md` both publish this
harness at **177 checks** as a pass/fail gate, and `logic-engine.md` names the loopback pattern as
the thing to reach for on anything MP-shaped. A gate that fails ~17% of the time for no reason
trains people to re-run until green, which is exactly how a real regression gets waved through.

**Next step:** reproduce with a fixed seed. The harness accepts `CJAR_SRC=` but has no documented
seed variable — SHP's `SHP_SEED=` is the pattern to copy. Not attempted here; out of scope for a
documentation pass.

---

## DYB Phantom-die reveal gap found while writing its identity doc (23 Aug 2026)

**Found, not fixed.** An identity pass records the game as it shipped; fixing what it reveals is a
separate task (spec § 15).

- **The How to Play copy promises a Phantom-die reveal at The Overlook that the game doesn't
  currently deliver.** `dyb-how-to-overlay`'s Sylly Mode card reads *"Phantom hide their face until
  The Overlook"* — implying the "?" resolves to the real value once hands are revealed. Per
  `docs/rules/game-identities.md`'s outgoing DYB section (Special Mechanics § The Tempest), the "?"
  glyph currently **persists through the showdown reveal** instead of resolving — a gap already
  flagged in `dyb-implementation-notes.md`'s own bug index, just never carried into the how-to copy
  or fixed in `dybRenderShowdownScreen`.

Fixing it means either making the Phantom's real face actually resolve at `screen-dyb-showdown`
(matching the promised copy), or rewriting the how-to line to match what currently ships (a Phantom
that never confirms its face even at reveal) — a design call for the owner, not a doc-only fix.

---

## SHP dead overlay found while writing its identity doc (23 Aug 2026)

**Found, not fixed.** An identity pass records the game as it shipped; fixing what it reveals is a
separate task (spec § 15).

- **`shp-tip-overlay` is fully built and never opened.** The markup (`shp-tip-emoji`,
  `shp-tip-heading`, `shp-tip-body`, `btn-shp-tip-close`) and its renderer
  (`shpShowTip(emoji, heading, lines)` in `js/games/shp.js`) both exist, but nothing in `shp.js` or
  `index.html` ever calls `shpShowTip` — no inline `[?]` button anywhere on `screen-shp-table` opens
  it. It's listed live in the game's overlay inventory (`index.html`'s own header comment,
  `code-map.md`) as though it were a working contextual-tip surface. Counting Sheep instead solved
  the "explain this card" need with the tap-hold-to-gallery pattern (long-press jumps to the card's
  row in How to Play → The Cards), which may be exactly why this overlay was scaffolded and then
  abandoned mid-build.

Either wire a real trigger to it (there's no obvious mechanic left needing one, per the tap-hold
coverage above) or remove the overlay, its renderer, and its `resetToLobby()` teardown entry —
whichever the owner decides, `docs/game-identities/shp.md` T7a/T7c and `docs/code-map.md`'s SHP
overlay table need the matching update in the same change.

---

## PKO copy drift found while writing its identity doc (23 Aug 2026)

**Found, not fixed.** An identity pass records the game as it shipped; fixing what it reveals is a
separate task (spec § 15).

- **The Culling's interstitial blurb describes Extinction Event's effect, not its own.**
  `PKO_EVENTS` in `js/games/pko.js` gives The Culling the blurb *"The season takes the rarest species
  from every Hoard"* — that is a global, single-species wipe, which is what Extinction Event actually
  does. The Culling's real rule (`pkoFireCulling`, `PKO_EVENT_DETAIL['culling']`) is per-player: each
  player individually discards their own fewest-held species. The 5-second event interstitial
  (`screen-pko-event`) is the only place a player reads this text before their Hoard visibly changes,
  so a first-time Force of Nature player is briefly told the wrong mechanic for what just happened to
  their own hand. The correct explanation already exists one overlay away, in `PKO_EVENT_DETAIL`
  (read from the `[?]` events roster) — only the interstitial's own `blurb` field is wrong.

Fixing it means editing the `blurb` string on `PKO_EVENTS`'s `'culling'` entry in `js/games/pko.js`
**and** the matching copy note in `docs/game-identities/pko.md` T7c in the same change.

---

## CJAR copy drift found while writing its identity doc (22 Aug 2026)

**Found, not fixed.** An identity pass records the game as it shipped; fixing what it reveals is a
separate task (spec § 15). Three items, all cosmetic, none affecting rules or packets:

- **The Dibber Dobber action button reads `Reach In`, but every place that *explains* the mode calls
  it "Take"** — the settings overlay's Sylly Mode card, the How to Play Sylly Mode card, and
  `docs/code-map.md`'s CJAR summary line. The rename away from "Take a Cookie" (DD-21) is documented
  in `js/games/cjar.js` beside the button itself, but the three explanations never followed. A player
  reads "Take grabs cookies" and looks for a Take button that does not exist. **Most worth fixing.**
- **How to Play step 7 is headed "Five Raids, one jar"** — hardcoded to the Full Feast default. On
  Quick Snack it is three.
- **Two case variants of the same caption** ship side by side: `Sneak Out alone and you take the lot.`
  and `Sneak out alone and you take the lot.`

Fixing any of these means editing `index.html` / `js/games/cjar.js` **and** the matching copy block in
`docs/game-identities/cjar.md` in the same change — they are **paired** under the change contract.
`node tools/verify-identity-docs.js` will fail until both halves land.

---

## NT slow model: 111378 and 64472 CLOSED — the transcription tool had ingress/egress backwards (20 Aug 2026)

**The two boards flagged "genuinely open" since D45, and left untouched by both v209 fixes below, are
closed.** Not a movement-model gap, not a route-length gap — `nt-maze-transcribe.js` was silently
writing some boards' start/finish the wrong way round. Full writeup: `nt-implementation-notes` D48.

The owner rebuilt the 111378 board independently in Debug Mode and got 111,659ms — a near-exact
match to target (111,378) — while the shipped `111378.json` still scored 99,869 (−10.3%) through
`nt-slow-fit.js`. Exporting the live `ntNode` and diffing it against the shipped file found every
block and the honeypot identical; only `ingress`/`egress` were swapped. The tool never actually read
which on-screen marker means start vs finish — it just took whichever port its edge-scan found first
(top before bottom before left before right). For 111378 the finish (orange/checker "flag") happens
to be on the top edge, so the tool wrote the route backwards.

**Fixed properly, not just patched.** `nt-maze-transcribe.js` now classifies each port by its marker
kind and assigns **flag = always egress**, falling back to scan order (with a loud warning) only when
the flag can't be found unambiguously. Every board with a recorded target was re-transcribed and
checked:

| board | corrected? | effect |
|---|---|---|
| 111378 | yes | −10.3% → **+0.25%** |
| 64472 (+ `-empty`) | yes | −20.2% → **+0.67%** |
| 37236, 38472 (×2) | yes | no score effect — no honeypot, direction can't affect the fit |
| 155255, 97877, 48154, 67886, 191490 | already correct | unchanged |
| 72000 | **left alone — see below** | — |
| 34000 | left alone (poor grid residual, no honeypot, no impact) | — |

**Corpus-wide worst `|err|`: 20.80% → 2.81%.** All 6 hard-constraint boards still MATCH. Every board
in the corpus is now within ~3% of target. The AoE radius, cooldown gate and movement model in v209
did not need further tuning — the two "still open" boards were being scored against a start and
finish line that were swapped.

**72000 is a deliberate exception — do not flip it without new evidence.** Its top marker also reads
unambiguously as `'flag'` (628px, same confidence as every corrected board), but reversing its
direction made the fit *worse* (+2.67% → +10–12%), the opposite of every other board tested. Left on
its original (better-fitting) direction pending an actual explanation, not because the marker read is
in doubt.

**This also retires the route-length / no-measurable-slowdown finding as an explanation for these two
boards specifically** — the entry directly below and the "still open" bullet in the SW v209 entry
above both treated 111378/64472's shortfall as evidence of a routing-model gap. It wasn't; it was bad
input data. That finding may still be real for the 191490 board it was measured on (the speed-profile
trace hasn't been re-examined against this), but it should no longer be cited as the explanation for
111378 or 64472's old numbers — those numbers themselves were wrong.

---

## NT slow model: 191490 transcribed, two SW v209 fixes, still open: route length (20 Aug 2026)

**Resolved: the entry-triggered/refresh branch is gone (pure cooldown gate), and the AoE is now
footprint-based (D45's Minkowski rejection was measured at the wrong radius). Still open: a
route-length question neither fix touches.** Detail in `nt-implementation-notes` D46/D47; summary
here.

The owner supplied a screen recording of the maze.game profile page's "Best Round" replay scrubber
for the 191490 daily (`maze-puzzles/slow model/saturated board/maze.game - Google Chrome 2026-08-19
22-36-21.mp4`), captured by manually dragging the replay's seek bar across the whole run (not
real-time playback). ffmpeg (installed via winget for the session — not a project dependency) split
it into 1168 PNG frames.

- **191490 is now fully transcribed** — `maze-puzzles/boards/191490.json`. A profile-page replay
  frame (`--grid 708.0,240.06,31.36,16,18` at this capture's scale) reads all 36 blocks and all 3
  ice honeypots ([9,4], [3,13], [11,13]) cleanly, zero unpaired tiles — the dark "activated" ice
  glyph that defeated the classifier on `hit 4.png` isn't present on an inactive frame. Ingress
  top/4, egress right/9 — matches the geometry already measured from the hit screenshots.
- **The `hits:[2,2,2]` in that first transcription was wrong — the owner confirmed `[3,2,2]`.**
  That number was the entire evidentiary basis for D45's "refresh" branch (the 29,727/30,114/29,727ms
  spacing that motivated it doesn't exist against the corrected count — the model's real gaps are
  21.8s/25.1s/27.4s/128.3s). The owner's own Debug Mode session independently reproduced the same
  branch's failure mode live: a honeypot re-firing before its cooldown from an ordinary exit/
  re-entry. **Fixed** — `checkFires` is now a pure `elapsed >= lastFire[i] + NT_HONEYPOT_DURATION`
  gate, no entry/exit branch, `inside[]` deleted. 6/6 recorded trigger counts still reproduce;
  111378 and 155255 both fit *better* than before (−14.2%→−10.3%, −3.15%→−0.25%). Harness 417 green.
- **The owner also reported a corner-adjacent honeypot in Debug Mode that didn't fire despite the
  runner passing close by — eyeballed as "2 tiles from the corner."** D45's "Minkowski AoE rejected"
  verdict (below) tested footprint-distance at the CENTRE model's radius (4.243), which always
  reaches less far than the centre model at any shared radius — the wrong comparison. **Fixed** —
  distance test is now nearest-point-on-footprint, radius `2*Math.SQRT2` (≈2.828, exactly "2 tiles
  from the corner," and exactly what `3*Math.SQRT2 − Math.SQRT2` was always secretly encoding).
  Reproduces 48154 and 97877 too — D45's two casualties, now fixed rather than avoided. Debug Mode's
  AoE ring/disc redrawn as the real rounded-square shape (`ntAoEPath`) so what's on screen matches
  what `checkFires` tests. `tools/verify-nt-loopback.js`'s honeypot section had baked in both old
  assumptions (centre-distance verification, "must leave to refire") — rewritten to match v209.
  **The Minkowski rejection below is superseded, not still standing — do not cite it as closed.**
- **Still open, and NOT touched by either fix above:** a screen-recorded position trace of the 191490
  run (replay-slider thumb position calibrated against displayed score to recover a real elapsed-time
  axis — `score = 386.63·thumb_x − 275533`, residuals ≤338ms) measured the runner's actual pace
  **976–1131 ms/tile deep inside slow spans vs. 1016–1238 ms/tile in clean unslowed stretches — no
  separation**, against `NT_HONEYPOT_SLOW = 0.5` predicting roughly double. The same trace's total
  path length (~175.5 tiles) was ~66% longer than `ntShortestPath`'s distance for the same board
  (105.9 tiles). This may mean the honeypot's real effect is substantially a **longer route**, not a
  **slower pace along the same route** — which would make 111378/64472's shortfall a routing-model
  gap, not an AoE/duration one. Needs its own investigation before `ntShortestPath` or
  `NT_HONEYPOT_SLOW` gets touched; not acted on. The extraction scripts (thumb-position calibration,
  PNG blob tracker) live only in that session's scratchpad, not the repo — rebuildable from this
  entry if the analysis needs repeating or extending to another board.

---

## NT slow model: Minkowski AoE FALSIFIED — 64472 is now a ROUTE suspect (rewritten 19 Aug 2026)

**Superseded the "suspect the AoE's SHAPE" entry, whose hypothesis was tested and rejected.** State
after SW v208 (`nt-implementation-notes` D45):

- ~~The trigger rule gained a REFRESH half and is settled again.~~ **Superseded by SW v209** — this
  bullet's "six triggers, two per block, 29,727/30,114/29,727ms apart" was fitted against a
  191490 hit count that turned out to be wrong (`[2,2,2]`, corrected to `[3,2,2]`); against the real
  count those gaps don't exist. The entry/exit branch this motivated is gone — `checkFires` is now a
  pure cooldown gate. See the entry above this one and `nt-implementation-notes` D46.
- **`NT_HONEYPOT_DURATION = 30000`** still holds — that part didn't depend on the wrong count, only
  the *shape* of the re-fire rule did.
- ~~The Minkowski AoE is rejected.~~ **Superseded by SW v209 — this verdict was measured at the wrong
  radius and is WRONG.** Distance-to-footprint was only ever tested at the centre model's radius
  (4.243), which is not a like-for-like comparison — a footprint check reaches less far than a
  centre check at any *shared* radius, so of course it under-fired and broke counts. At its own
  correct radius (2×√2 ≈ 2.828 — "2 tiles from the block's corner," per the owner's own eyeballed
  rule and independently confirmed against 191490's recorded corner hit) it reproduces 48154 and
  97877 correctly. The AoE **is** now footprint-based. See the entry above and
  `nt-implementation-notes` D47. **The "do not re-open it" instruction that used to be here was
  itself the mistake — it closed off the fix on the strength of a wrongly-scoped test.**

**~~What is still open.~~ CLOSED — see the entry at the top of this file (20 Aug 2026).** Both boards
in the table below had `nt-maze-transcribe.js`'s ingress/egress backwards, not a routing or AoE gap.
111378 now scores +0.25%, 64472 +0.67%. The `--contact` analysis and the two "candidate causes" below
are kept for the historical record (they were reasonable given the data available at the time) but
**do not act on them** — the board data they were computed from was wrong.

**Superseded analysis below, kept for the record only — not actionable:**

| board | NT | maze.game | err (pre-v209) | fires | first contact | contact NEEDED |
|---|---|---|---|---|---|---|
| 111378 | 95,535 | 111,378 | −14.2% (now −10.3%) | 3 ✓ | 0.399 | 0.315 |
| 64472 | 51,434 | 64,472 | −20.2% (unchanged) | 2 (no recorded count) | 0.516 | 0.140 |

The last two columns are `node tools/nt-slow-fit.js --contact` — the fraction of the unslowed
journey already run at first AoE contact, against the fraction a slow-to-the-end model would need to
reach the target. **This is what splits the two boards apart, and it is why they should stop being
treated as one problem:**

- **111378 was an 8-point miss, now smaller post-v209** — the right order of magnitude for a
  geometry or radius effect, but every radius large enough to close it breaks a count somewhere else.
- **64472 is a 38-point miss, untouched by v209** (no honeypot re-entry occurs on this board within
  a cooldown window, so the fix changes nothing here). No AoE shape reaches 14% of the journey from
  52%; even radius 6 puts contact at 0.007, i.e. immediately, and over-fires. A gap that size is not
  an AoE property. Two candidate causes, both now sharpened by the 191490 speed-profile finding above
  (real pace ≈ unslowed throughout, real path ~66% longer than modelled): **(a)** maze.game's runner
  takes a longer route than NT's shortest path — no longer just a tiebreaker guess, there's now
  direct measurement pointing this way on a different board; **(b)** the board is mis-transcribed —
  64472 was already the board whose right-edge port sits under a placed piece. **Investigate the
  ROUTE first — do not spend another pass on the AoE.**

**Side tasks:**

- ~~Transcribe the 191490 board.~~ **Done** — see the entry above. `maze-puzzles/boards/191490.json`,
  from a profile-replay frame rather than an empty-puzzle screenshot. It also surfaced a wrong hit
  count (fixed, SW v209) and a still-open speed-profile question — read that entry before touching
  this one.
- **Re-transcribe 64247** (`maze-puzzles/slow model/64247 - 2hits (1 top right corner hit).png`).
  Its grid alignment puts the right-edge port under a placed piece, so the board seals and it is
  excluded. Its filename records **2 hits, one of them a corner hit** — it is the only reference
  board that exercises a corner mouth *and* a trigger count together, so it is worth the effort.
- **Get a trigger count for 64472 and 72000**, the two slow boards with none. 64472 is the worst
  outlier and its count would say immediately whether the shortfall is a missed entry or a late one.
- **Whether a corner should cost MORE while slowed** (carried over, still unresolved). The shipped
  code divides the braking cost by the slow multiplier along with travel time; physically a slower
  body needs *less* deceleration to take a bend. Worth ~50–100 ms per slowed board — inside the
  current ±3% noise, so it cannot be fitted until the two outliers are closed.

---

## NT Debug Mode final review — deferred Minors (added 18 Aug 2026)

The final pre-merge review of NT's Debug/Sandbox Mode (this branch) found five Minors beyond the
three fixed in the same pass (native-cap reject flash, the duplicated firewall-slots expression,
the dead `bestLatencyMs` payload field). These five each need a real behavioural decision, not a
mechanical fix, so they're parked rather than made a judgement call in an unreviewed tail pass:

- **Two honeypot ceilings on one screen** (`js/games/nt.js`: the authoring stepper caps at
  `NT_HONEYPOT_CAP` (4) minus natives; `ntAuthRandomiseBudget`'s roll caps at
  `NT_ALLOC_HONEYPOT_CAP` (2)). Both clamp correctly — not a defect — but picking ONE ceiling for
  both paths is a balance call, not a code fix.
- **The same-mouth guard compares `(edge, idx)` pairs, not mouth tiles** (`ntAuthSetPort`,
  `js/games/nt.js`) — `{edge:'top',idx:0}` and `{edge:'left',idx:0}` are the same corner tile but
  compare unequal. Currently unreachable via `ntAuthTap`, so no live bug, but the comparison is
  wrong in principle.
- **`ntSummaryCallback` fires unconditionally for clients** on the Debug summary screen — worth a
  look at whether a client should ever see an enabled "Author New Node" affordance it can't act on.
- **`pathOk()` re-assertions in `tools/verify-nt-loopback.js`** are tautological in a couple of
  spots (re-proving something an earlier check in the same section already established).
- **The client-is-last-finisher path in Debug MDLM now has NO automated coverage** (surfaced by the
  fix-wave re-review, 18 Aug 2026). Fixing the skip-standby issue meant reordering the Finish
  scenario so the HOST finishes last, because a client-as-last-finisher hits a harness-only artifact:
  `mpSendEnvelope` is a direct unqueued call, so the host's resolve nests inside the sending client's
  own call stack and its `NT_PLAYBACK` navigation gets stomped by that client's own following line.
  The harness cannot represent "SYNC not yet arrived" as distinct from "SYNC arrived instantly" —
  the same limit that makes the underlying fix untestable here. Consequence: `ntDebugFinished.every
  (Boolean)` is never true when either client's branch runs, so old and new code produce identical
  outcomes in this ordering and nothing anchors the fixed line's differentiating behaviour. Closing
  it needs an ASYNC wire in the loopback harness (a queued/deferred `mpSendEnvelope`), which is a
  harness-architecture change well beyond a Minor — and would pay off for every MDLM game, not just
  NT. **Until then this path is real-device-only:** cover it in the next 3-device NT session by
  having a CLIENT finish last.
- **The `const good = r.host.__nt.debugBest` consistency note** in the harness — flagged as worth a
  clearer comment or a small refactor, not a correctness issue.

**When picked up:** next time Debug Mode's authoring screen or the loopback harness is touched for
an unrelated reason, or at the next NT phase gate — whichever comes first.

---

## `bindExclusiveSettings()` — extract once a third instance appears (added 17 Aug 2026)

The mutually-exclusive/superseded settings pattern (`ui-style.md` § Settings Layout Standard) now
has **two** shipped instances: FRT's Pear-Off ↔ Sylly Mode (SW v167, 10 Aug 2026 — reciprocal lock,
inline in `js/games/frt.js`'s two toggle handlers) and NT's Debug Mode ↔ Sylly Mode (this branch —
both Mutually exclusive and Superseded, centralised in `ntSetCardDisabled`, `js/games/nt.js`). Both
still implement the toggle/disable/reason-line logic locally, not through a shared engine helper.

**Why not extracted now:** this is the project's usual second-instance extraction trigger (per the
`dyb.js` dice-logic precedent), but building it here would mean touching FRT — a shipped game
unrelated to the branch that surfaced this — at the tail end of a documentation-only task, with no
spec of its own. Deliberately overridden on scope grounds rather than missed.

**When picked up:** build `bindExclusiveSettings()` as a shared `engine.js` helper when a **third**
instance appears, or the next time either FRT's or NT's settings code is touched for an unrelated
reason — whichever comes first. Detail: `docs/decision-log.md` 2026-08-17.

---

## NT allocation preview: canvas renderer looks cruder than the real build grid (added 16 Aug 2026)

`ntDrawLegCanvas` (the allocation screen's maze preview) draws flat rect-fills with a plain 1px
port bar. The real build screen's grid (`nt-build-grid`) is a richer DOM renderer — rounded port
markers with a glow (`box-shadow`), directional arrow glyphs, percentage-positioned. They're two
different renderers for what's conceptually the same maze, and the preview one is visibly plainer.

**Candidate fix:** a read-only variant of the real build-grid renderer (no placement interaction,
since nothing is placed yet at allocation time — only bad sectors, native honeypots, and ports
exist), scaled down via CSS for the small chip-adjacent views. Would also guarantee the preview can
never visually drift from what the player actually builds on, since it'd be the same code path.

**Why not done yet:** raised alongside the D28 fixes (16 Aug 2026) but the screenshot meant to show
the exact defect didn't attach to that session — building a renderer swap without seeing what
"a mess" actually looked like risks solving the wrong problem. Re-raise once a screenshot confirms
whether D28's shifting-animation fix already resolved the visual complaint or whether the renderer
itself still needs replacing.

---

## `.pill` is 39 px tall — under the suite's own 44 px touch minimum (added 16 Aug 2026)

`ui-style.md` § Thumb-Friendly UI mandates a 44×44 px minimum touch target. `.pill` in
`css/styles.css` uses `padding: 0.5rem 0` with `font-size: 0.95rem`, which measures **39 px** —
verified by `visual-check` on NT's allocation screen. **Every pill in every game** has this
measurement: settings pills, how-to tab bars, brush selectors.

**Scoped fix already shipped:** NT's allocation brush pills carry `min-h-11` (NT is a mid-huddle
tool tapped repeatedly against a running clock, unlike a settings pill tapped once).

**Why it is not swept:** this is either a deliberate accepted exception for pills specifically, or a
suite-wide gap in a rule the project states plainly — and picking between those is a phase-gate call,
not something to decide inside a single game's round. Changing `.pill` itself alters the vertical
rhythm of every settings overlay and every how-to tab bar in 18 games, so it also wants a
`visual-check` pass rather than a blind CSS edit.

**When picked up:** decide the rule first (exempt pills, or raise `.pill` to 44 px), record it in
`ui-style.md` either way — the current state, where the rule says 44 and the shared class says 39,
is the actual problem.

---

## NT allocation screen — ~350 px of dead space (added 16 Aug 2026, mostly closed same day)

`screen-nt-allocation` is on the legacy `h-screen` sticky-footer whitelist (`ui-style.md`). The
original cause (the bridge strip fitting all legs at small cell, per `nt-implementation-notes.md`
D25) was superseded the same day by D26's windowed leg viewer — the maze now renders at a fixed
324×324 px regardless of team size, which absorbs most of the gap as a side effect of an unrelated
legibility fix (owner feedback on a live session, not a deliberate fix for this item).

**Still outstanding:** the huddle countdown is a small eyebrow in the header
(`#nt-alloc-header`, written by `ntStartHuddleTimer`) rather than using any of the space the maze
doesn't fill at 1v1/2v2. Low priority now that the screen reads as intentional rather than sparse.

---

## `verify-cjar-loopback.js` is FLAKY — fails ~1 run in 3 (added 15 Aug 2026)

**Not a regression.** Found incidentally while running the full harness suite after the NT work;
`git status` confirms neither `tools/verify-cjar-loopback.js` nor `js/games/cjar.js` was touched
that session. Reproduced by running it 6–8 times in a row.

**Symptom:** always the same two checks, in the Dibber Dobber payout-beat section:
`host2 threw the exact split token count` / `client2 threw the exact split token count`.

**Cause:** the harness stubs `shuffle` with the real Fisher–Yates over an **unseeded**
`Math.random()` (deliberately — an identity stub would deal a family-first deck that busts on flip
2 every time, per its own comment). So the deck order differs every run, and those two checks
assert an *exact* token count that depends on how many seats take vs. dob on that particular deal.

**Why it matters beyond CJAR:** a suite where one harness fails a third of the time trains everyone
to re-run until green, which is how a real regression gets waved through. It also means the "222
green checks" figure quoted in `CLAUDE.md` was never reliably 222.

**Fix shape (not done here — different game, and it changes what 177 checks exercise):** port the
seeded mulberry32 + `*_SEED=` env hook from `verify-shp-loopback.js` / `verify-nt-loopback.js`, then
run across several seeds to find which assertions were only ever passing by luck. Expect the two
failing checks to need rewriting as an invariant (`tokens === takers`, computed from the same deal)
rather than a literal — the NT harness hit exactly this and the fix was to *construct* the
precondition instead of hoping for it (`nt-implementation-notes.md` D21, lesson 1).

---

## BUG-06 re-sweep by payload SHAPE, not by applier line (added 15 Aug 2026)

The 13 Aug BUG-06 sweep declared NT clean; two days later NT turned out to be carrying **two more
instances of the same class**, both of which that sweep's method could not have found. Its search
shape was "appliers that assign a payload field straight to a state collection without `|| []`" —
which is blind to a collection **nested inside** an assigned object. `ntNode = payload.node` reads
as clean; the erased field was `node.nativeHoneypots`, one level down. `ntPtpTimelines =
payload.timelines` likewise; the erased fields were `timelines[i].fires` / `.slowSpans`, two levels
down. Detail + the corrected method: `shared-implementation-notes.md` BUG-06 addendum.

**What to do:** for each game, walk the payload tree the *producer* builds for every SYNC packet and
list every leaf array/object, then ask of each "can this legitimately be empty when it is sent?".
Two tells that a leaf is at risk: its length is decided by a random roll or by a player doing
nothing; and the same field is guarded with `|| []` *somewhere else in the file* — an inconsistent
guard means someone already hit the empty case on one path and patched only that one.

**Candidates, in priority order:** ~~PKO, FLW, SHP, CJAR~~ **— swept 30 Aug 2026, all clean**
(detail: `shared-implementation-notes.md` BUG-06 addendum). SHP's `hands` and CJAR's `raidHistory`
are the only genuine nested leaves and both are rebuilt by length-aware normalisers (`shpNorm2D`,
`cjarWireList(...).map(cjarWireArr)`); PKO/FLW broadcast no nested per-seat objects. Note that
CJAR/FLW/SHP each have a loopback harness that would catch a regression once written; PKO does not.

~~**Still to do: GTH / DSD / JEC / LTTP.**~~ **— swept 30 Aug 2026** (detail:
`shared-implementation-notes.md` BUG-06 addendum re-sweep). **JEC and LTTP clean** (JEC fully wire-
normalised; LTTP's 13 Aug `lttpDecoys` fix confirmed, covered `lttpFakeTargets` too, no other
reachable-empty leaf). **GTH — one CONFIRMED client crash, fixed**: `GTH_FINAL_SCORES` →
`revealItems[i].correctShrinks` (nested `[]` for any drawing nobody diagnosed right — >80% of
games), erased in flight, `gthShowBigReveal()` threw on the client; applier now rebuilds the list
and each nested leaf. **DSD — one low-risk hardening**: `DSD_GAMEOVER` broadcasts `turnLog` raw
where `DSD_EXECUTION_RESULT` normalises it; guarded `dsdRenderDeploymentHistory`'s `t.outcomes.map`.
**GTH and DSD have no harness — both fixes are `node -c` only, not played live. Add to the retest
backlog.**

---

## ~~NT (Net-Trace) MDLM 3-player desync~~ — **RESOLVED 15 Aug 2026**

Root-caused by static analysis, reproduced deterministically, fixed, and harnessed. All three
defects were client-only (the host never round-trips its own state through the wire, so the
host-side view was correct throughout — which is why it read as a mystery):

- **BUG-15** — blank build grid: `nativeHoneypots: []` erased in flight, two unguarded *render*
  reads throwing per grid cell. Intermittent because `convertN` is re-rolled each cycle;
  **deterministic** under the "Native Honeypots: 0" setting.
- **BUG-16** — playback never reached clients: `timeline.fires: []` erased, `ntRenderFrame`
  reading it unguarded.
- **BUG-17** — the `--.--%` summary: MDLM's leaderboard was gated behind
  `syllyMultiplayerMode === 'single'` and never rendered at all.

New harness `tools/verify-nt-loopback.js` (119 checks, host + 2 clients, Standard + DNP) reproduces
all three. Detail: `nt-implementation-notes.md` BUG-15/16/17, D21.

**Still open from that session, unchanged:** the `mpConfirmRoster` late-join race (BUG-07,
`shared-implementation-notes.md`) — the guard added there stops a mis-joined device corrupting
state, but does not close the race itself; and a **real 3-device retest** is still required, since
no harness models clock skew, Firebase ordering or dropped packets.

**Two smaller items surfaced while building the harness, neither fixed:**
- `ntRoutingTimer` is the one timer handle missing from `ntResetState()` — a pending 700/1200 ms
  `ntSetRouting('valid')` can fire against the next screen (§ Timer Lifecycle).
- The DNP allocation appliers (`NT_ALLOCATION_UPDATE` / `_LOCK`) validate the sender's **team** but
  never that the sender is that team's **captain**, so any client on a team can drive its
  allocation. Current behaviour is pinned by a check in the harness labelled `KNOWN GAP` so a
  future change is visible rather than silent.
- `NT_GAMEOVER`'s applier calls `ntShowMatchSummary()`, which does not exist anywhere in the repo.
  Nothing sends that packet so it is unreachable in play; also pinned as a `KNOWN GAP` check rather
  than "fixed" by inventing a function for dead code.

---

## NT (Net-Trace) MDLM 3-player desync — original symptom report (superseded by the entry above)

**What was observed, live-testing 1 host + 2 clients:** round 1's build screen ("Vulnerability
Simulation") rendered a completely empty grid for both clients (header/timer/counters all correct,
`#nt-build-grid` itself had zero tiles) while the host's rendered fine; round 2 was fine for all
three; after round 1 resolved, only the host reached the playback screen — both clients stayed
stuck on "Submitted…" until the host manually clicked "Next Cycle" (now readyCheck-gated, see
below — but this doesn't explain the earlier bare-"Submitted" hang; the bug is upstream of the gate
itself); one client's cycle-boot terminal log was missing its "LOADING SIMULATION N/M…" context
line entirely (present for the host and the other client, on the exact same code path — see
`ntShowMdlmGate()`) while its "LOGIN:" line still rendered, which by itself rules out the line
simply being absent from the array passed to `ntPlayGateBoot`; by round 4 the SER stopped
resolving (`--.--%`, no per-player scores) even though System Logs still had correct data; round 5
broke again for the two clients.

**Kept only as the symptom record** — every one of these is accounted for by BUG-15/16/17 above.
The session that logged this also fixed a genuine, separate defect found by inspection: the
Diagnostic Summary's "Next Cycle" was a client no-op (`if (mode === 'client') return;`) with no
readyCheck, so the host advanced everyone unilaterally; that is now `ntSummaryReadyCheck` +
`NT_SUMMARY_READY` (`nt-implementation-notes.md` D20).

**One symptom to re-check on the retest:** "one client's boot log was missing its LOADING
SIMULATION line while its LOGIN line rendered." The harness asserts all three devices type
identical boot lines bar `LOGIN:` and that passes on every seed, so this was **not** reproduced.
Most likely it was the blank-grid throw landing mid-typewriter on that device rather than a
separate defect — but it is the one reported symptom without a confirmed cause, so watch for it
specifically rather than assuming it went away with the rest.

---

## Retest backlog — the older games (added 1 Aug 2026)

**Owner's note:** the suite has picked up a lot of cross-cutting change since the early games shipped —
the Stack layout sweep, the Motion Standard + reduced-motion block (SW v148), and the asset-pack render seams
and core art tier. The early games were built before most of it and have not been replayed since.

**Scope:** every game shipped before the current phase, replayed on a real device — not a code audit, an
actual play. Priority order is roughly oldest-first, since they have accumulated the most drift:
LI5 → Great Minds → Secret Signals → JEC → YGI → LTTP → Natural Selection → Deep-Sea Deploy → Bailed →
Group Therapy → The Bluff → Pass → Net-Trace → Fruit Salad → Counting Sheep → Flawless.

**What to check per game** (beyond "does it still play"):
- Reduced motion — DevTools → Rendering → emulate `prefers-reduced-motion: reduce`; nothing should travel,
  and nothing should be left stranded on screen (the `animationend`-cleanup trap, see `ui-style.md` § Motion Standard).
- Stack compliance — any screen looking sparse or edge-pinned that is **not** on the legacy `h-screen`
  whitelist in `ui-style.md` is a new bug.
- The per-game values in `ui-style.md` § Per-Game Reference actually match what renders.
- Sylly Mode reachable and working (all 17 games have one).

**Log findings** in each game's `docs/implementation-notes/[abbr]-implementation-notes.md` as they surface,
not in a batch at the end.

---

## Smaller flagged items

**PKO's Stragglers scoring mode is shipped but unplayed** (open since v166; moved here from
  `CLAUDE.md` § Current Focus, 19 Aug 2026). Force of Nature can hand a player cards they did not
  choose (Deluge, Culling, Migration, Great Reversal), which is a straight penalty under Stragglers
  in a way it never was under Dominance — deliberately left un-special-cased pending a live session.
  **When picked up:** watch a Sylly + Stragglers session before changing anything. Detail:
  `pko-implementation-notes.md` D39/D40.

~~**DD-31's same-screen button-parity rule was applied only to CJAR**~~ — **RESOLVED, 9 Aug 2026.**
  All 18 games now conform: 17 game-menu "← Back to the Box" buttons and 9 gameover-screen
  secondary exit/leave buttons resized to match their screen's primary CTA (height, text size,
  weight). Applied via a scoped Node script, id-targeted. Detail: `docs/decision-log.md` 2026-08-09.

~~**Action buttons carried decorative emoji suite-wide, and two had drifted off-brand colour**~~ —
  **RESOLVED, 7 Aug 2026.** New rule: `ui-style.md` § Action Button Standard (Play CTA / Decision Modal
  confirm-cancel / primary in-game submit-decision buttons — no emoji, colour must be brand/neutral/destructive-
  red). Swept in **two passes**, because the first missed a whole class of buttons: pass 1 covered static
  `index.html` markup (~80 buttons); pass 2, triggered when CJAR's in-game Take/Play Innocent/Dob/Sneak Out
  buttons turned up still carrying emoji, covered `js/games/*.js` labels set via `.textContent`/
  `createElement('button')` (46 more sites across 14 files — mostly the "Restart in Lobby 🔄" play-again
  confirm, which every MDLM game sets dynamically per multiplayer mode, so it was invisible to a static-HTML-
  only grep). 2 colour mismatches also fixed — DSD's `btn-dsd-sabotage-confirm` (was JEC's amber, now DSD's
  cyan) and SS's `btn-ss-to-intercept` (was neutral stone, now SS's teal). SS's `btn-ss-splash-phase2` stays red
  deliberately — an interrupt/alert screen whose own copy ("Urgent mission received…") justifies it, the one
  documented exception to the colour rule. **Lesson folded into the rule itself:** any future action-button
  audit must grep both `index.html` and `js/games/*.js` — a JS-set label is exactly as much an "action button"
  as static markup. Detail: `decision-log.md` 2026-08-07.

~~**Decision Modal button sizing diverges in four games**~~ — **RESOLVED, 7 Aug 2026.** FLW, PASS, GTH, and
  BLD's quit/play-again buttons (8 total, PASS's new-deal confirm was already conforming) now all use
  `min-h-14 … text-lg` per `ui-style.md` § Quit Overlay Checklist. Applied via a scoped Node script (occurrence-
  count-asserted string replacements), never a broad Edit. GTH's and BLD's confirm buttons still use `bg-red-500`
  rather than their brand colour — that's a separate, deliberate "destructive action" colour choice, left for
  the action-button colour sweep (see below) to confirm or correct.
~~**A suite-wide audit for the BUG-06 class has not been done.**~~ — **RESOLVED, 13 Aug 2026.** Explore-agent
  swept every game's SYNC applier; found and fixed three live-risk unguarded collections — **LTTP**'s `lttpDecoys`
  (a guaranteed crash: every match reaches zero decoys), **GTH**'s `gthAllDiagnoses[i]` (a timed-out player sends
  `[]`), **NT**'s `ntPtpPlacements` (a zero-inventory cycle holes the array) — plus hardened DSD, JEC, and PASS
  (lower risk, no live-play trigger found, same unguarded shape). GM/BLD/SS/DYB's remaining unguarded assigns were
  judged structurally non-empty and left alone; FRT/SHP/FLW/PKO already had the CJAR-pattern normalisers. **None
  of the six touched games have a `tools/verify-*.js` harness**, so these fixes are syntax-checked only, not
  regression-tested or played live — flagged for the retest backlog. Detail: `shared-implementation-notes.md` BUG-06.
~~**PKO's Chain diagram/animals list kept its own overlay**~~ — **RESOLVED, 10 Aug 2026.** Folded into
  `pko-how-to-overlay` as tabs 2–3 (`The Rules | Diagram | Animals`); the old two-tab `pko-chain-overlay` is
  gone. This also retired the "mid-play reference keeps its own overlay" carve-out in `ui-style.md` — see
  `decision-log.md` 2026-08-10. Detail: `pko-implementation-notes.md`.
~~**A card/reference gallery exists only for CJAR and PKO.**~~ — **RESOLVED, 10 Aug 2026.** FRT
  (`The Rules | The Fruit`), SHP (`The Rules | The Cards`), FLW (`The Rules | The Gems`) and DYB
  (`The Rules | The Dice`) all gained one, so **six of the seven render seams now have a gallery** and the
  core-art offline install check is a single-device job everywhere it applies. FLW's was a *fold*, not a new
  build: its standalone `flw-gems-overlay` Gem Manifest became tab 2 and was retired, same move PKO's chain
  overlay made — and converting it to `flwRenderCard` fixed a real defect, since the old swatch-circle markup
  meant no skin could ever reach it. Every tile is now tappable-to-enlarge via the new engine-owned art viewer
  (`ui-style.md` § Pattern 2a). **PASS remains the one exception** — 54 playing cards make a tile grid a poster
  rather than a reference, and it has no core art to verify, so nothing is currently unverifiable. Detail:
  `docs/decision-log.md` 2026-08-10, `docs/art-authoring-guide.md`.
~~**Round/Night Intro Screen sweep**~~ — **RESOLVED, 13 Aug 2026.** `ui-style.md` § Round/Night
  Intro Screen (added 12 Aug 2026) says any game where the same phase repeats several times a match
  should show a short auto-advancing intro at the start of each repetition, rather than jumping
  straight from "deal" into an already-live table. Implemented where a genuine gap existed: CJAR
  (precedent) → SHP → **PKO** (`screen-pko-clash-intro`) → **NAT** (`screen-nat-habitat-intro`) →
  **PASS** (`screen-pass-intro`). Investigated and correctly ruled out where the pattern didn't
  apply: **GTH** (Session doesn't repeat within a match; Patient Phase and Shrink Phase already
  have their own equivalents or would be actively harmed by a forced pause) and **DYB**
  (`screen-dyb-shake` already shows "Shake #N" as the actual roll interaction — an interactive
  equivalent, not a gap). SW bumped v178 → v181 across the four additions. **None of PKO/NAT/PASS
  were verified beyond harness/syntax level** — no `visual-check` pass, no live play; NAT and PASS
  additionally have no `tools/verify-*.js` harness at all. Detail: `pko-implementation-notes.md`
  DD-26, `nat-implementation-notes.md`, `pass-implementation-notes.md`, `dyb-implementation-notes.md`.
~~**The settings dynamic-value line (DD-13) is implemented only in CJAR.**~~ — **SWEPT, 13 Aug
  2026.** Explore-agent audited every other game's settings overlay for pill groups encoding a
  concrete value not visible in the label. Found the gap was narrower than expected — only
  word-difficulty pills, and only 7 games: **JEC** (Menu Complexity — the static description also
  named three DIFFERENT tier names than the pills show, a real copy bug fixed in the same pass),
  **GTH** (Symptom Severity), **LI5** (Report Card), **NAT** (Field Difficulty), **DSD** (Sea
  State), **LTTP** (Party Destination), **SS** (Encryption Protocol). Every duration/count/
  threshold pill elsewhere in the suite already states its value on the pill itself or in the
  static description, or had already independently built the DD-13 shape under a different name
  (GM's `*-desc` elements, DYB's `dyb-wildcards-desc`, SHP's `shp-val-moons`, PKO's `pko-val-law`,
  GTH's own Diagnosis Window). BLD has no pill groups at all. **Not verified beyond syntax/encoding
  checks** — no `visual-check` pass, no live play. Detail: `shared-implementation-notes.md` DD-13
  sweep.
~~**FLW how-to step labels**~~ — **RESOLVED, 7 Aug 2026.** They used inline `style="color:#E879A8"` (rose-pink,
  FLW's primary brand) rather than a class. The pre-existing `.flw-label` class was **not** reusable here — it's
  already taken for FLW's secondary Exhibition-gold accent (`#C9A227`, used on the gem-vault count). Added a new
  `.flw-step-label { color: #E879A8; }` and swapped all 7 inline-style sites to it — no visual change, same
  colour, now class-based like every other custom-colour game.
~~**GTH Play CTA contains an emoji**~~ — **RESOLVED (stale), Aug 2026.** The code already reads "Start the
  Session" with no emoji; only `ui-style.md` Table B and an audit-flag note were out of date. Both corrected.
~~**`docs/archive/` is not empty**~~ — **RESOLVED (stale), Aug 2026.** `CLAUDE.md` § Current Focus already
  documents the one file it holds (`phase-audit-2026-06-30-snapshot.md`) — the "empty by design" claim this
  item pointed at no longer exists in the doc. No action needed.

~~**CJAR — the Dibber Dobber payout beat mis-narrates one branch**~~ — **RESOLVED, 13 Aug 2026.** Added
  the missing `takers.length && innocents.length` branch in `cjarBeginFlipAnim` (`js/games/cjar.js`),
  ahead of the plain takers-only branch it was previously falling into — takers and innocents both now
  fly a token down, none flies left, matching the scare-off's real behaviour (the pool never sits in the
  pile when a Dobber is absent). Presentational only; `verify-cjar-dd.js` (47 checks) and
  `verify-cjar-loop.js` re-run clean, confirming the resolver logic itself was never wrong.

**CJAR — Dibber Dobber's Innocent-leaning archetype wins ~52% (DD-06)** — *open balance flag, deliberately
  not acted on; moved here from `CLAUDE.md` § Current Focus 9 Aug 2026 to stop it loading every session.*
  `simulate-cjar-dd.js` measures ~52% at both 5 and 8 players, a 33–38 pt spread against a ~12 pt
  threshold. Diagnosed to the **scare-off**: Play Innocent never pays on a Caught! card *and* sweeps the
  whole Crumb pool whenever no Dobber is present, while Dob is punished hard enough to be under-played.
  Not retuned on purpose — changing a number pre-playtest leaves nothing to compare against, and DD-17's
  flip-1 float was re-measured against this exact baseline (5p 34.3 → 31.4 pts, Innocent 53.5% → 51.4%)
  and landed inside the noise band, so the flag is untouched. If a lever is ever needed the candidates
  are the scare-off's unconditional full-pool sweep and the Dob backfire severity — **not** the Treat
  rule, which a mechanism probe disconfirmed.
