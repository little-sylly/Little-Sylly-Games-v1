# Deferred Work

**On-demand — not auto-loaded.** The running list of known-but-not-yet-done work: code divergences,
retest backlogs, and audit items that are deliberately parked rather than forgotten. Newest section on top.
Tick items off here; promote anything architectural into `decision-log.md`.

> Replaces `docs/fable-fix-plan.md`, which `logic-engine.md` pointed at but which no longer exists in the repo.

---

## Bookshelf easter eggs — deferred by the owner (25 Sep 2026, sandbox)

The room pass's item 15 dressed the lounge bookshelf's top two boards with books and toys. The owner
said: *"we can worry about easter eggs down the line"*. The spec's trinket seam (§ 7.9,
`PRM_TRINKETS_V1` with an `unlocked` flag) was removed with the round-1 trinkets it gated. When earned
or hidden pieces come back, they are items in `prmBuildShelf` (`wip/premium/prm-props.js`). They could
come from achievements, the stickerbook, or something else, all undecided. Decide the earning source
first, then whether a locked piece leaves a gap or the row reflows. Detail:
`shared-implementation-notes.md` DD-41 § 4.

---

## Stickerbook achievements — prototype built, owner answered (23 Sep 2026, sandbox)

The binder is the stickerbook and a prototype achievements loop runs behind its door in
`wip/lobby-lab/shell.html` (spec `docs/superpowers/specs/2026-09-23-stickerbook-achievements-design.md`,
`shared-implementation-notes.md` DD-24). The owner answered the four open questions the same day:

- **The loop is the point:** play → earn/collect → customise. Earned stickers are the ones the
  Workshop offers. **Short term, everything stays unlocked** in the Workshop (as shipped today —
  every `data/stickers/manifest.json` entry is `unlocked: true`); gating waits for progress storage.
- **A "play" = a match finished to its end screen**, not a Play-CTA press. Production seam: one
  engine-side hook on each game's gameover screen (the same shape as `showScreen` → `Music.playFor`),
  not a call in 20 plugins.
- **Sticker finishes** (glossy / holo / gold / …), each earned by a different achievement beyond
  play counts. Needs its own design pass. Data shape to leave room for: a sticker is `id + finish`.
- **Player profiles** (name + controller design + progress). The owner's worry was that this needs
  a stored-data backend. Split it: **on one device it needs none** — `sylly_nickname` and
  `sylly_controller` are already a profile; progress is one more permitted key (e.g.
  `sylly_progress`). **Following a player across devices** is the part that needs Firebase Auth
  beyond anonymous, per-user security rules and a privacy position. Firebase's free tier is not the
  constraint (a profile is ~1–2 KB). Open design question first: in pass-the-phone play one device
  serves several people — whose progress is it?
- **The 2D book has no spine** — it does not read as a book. Polish later; middle ground for now.
- **The open binder's fold** ("D" vs the mockup's "Sticker Tray" flap) — still open.
- **Bailed** has no sticker (badge pending), so no achievement — `achDefine` simply has 19. **RESOLVED [27 Sep 2026]** — the badge landed; the book now has 20.

### Prop rooms — Workshop, Jukebox, Stickerbook (owner, 23 Sep 2026)

The Workshop (a plain full screen), the stickerbook (a full-screen purple scene) and the Jukebox
don't share a look. Owner's direction: each should work **full-screen on wide and on mobile**, at a
middle-ground polish level — a working feature first. Recommendation on record: **one responsive
layout per feature** (the stickerbook already does this at 720 px), not two separate builds, and a
**shared "prop room" frame** (header, ✕/🔊, backdrop, entry/exit) that all three sit in, so they
match through the frame and differ only inside it. Remaining work: Workshop wide layout, Jukebox
room, stickerbook spine/book feel. Sequencing: after the lounge ships and is wired.

## Lobby redesign — production shipped, what's left is polish and a few owner decisions

**The initiative (Shelves → TV mode → Premium/Lounge → production wiring) is DONE**, shipped across
SW v231–v235 (25–26 Sep 2026). Full design/build history — the Shelves and TV sandbox rounds, the
Premium greybox and two re-blocks, Scene B's redefinition to a one-way phone handoff, the prop
quality rounds, the production-wiring plan and its bug fixes (BUG-19, DD-14/16/18/19/42/43/44/46) —
lives in the specs/plans under `docs/superpowers/{specs,plans}/2026-09-*-premium-*` and
`shared-implementation-notes.md`; not repeated here. What remains open:

- **Stickerbook earning** — the earn loop, the toast, placement, and the **localStorage key** it
  will need (a new permitted key — `CLAUDE.md` § Anti-Patterns; an owner decision). The pure reducer
  ships and is harnessed (`tools/verify-achievements.js`), waiting. Put its data source behind one
  module (cost-envelope § 4, the Tier 3 seam). See also the **Stickerbook achievements** section
  above, where the owner already answered most of the design questions (23 Sep 2026).
- **RESOLVED 27 Sep 2026 (SW v238) for Shelves and Classic — Phone entry point for the jukebox AND the stickerbook — the next lobby round.** Both are
  reachable only through a Lounge door, and phones never keep the Lounge. One answer for both: an
  entry in Shelves (the old 🏆 dock slot) and TV's header. Each must go through a router action
  (never a direct `showScreen`), and `jukeboxClose`/`stickerbookClose` must still return to the
  layout they were opened from — today both assume the Lounge in practice. `css/jukebox.css`
  already has a <860 px single-column layout, never tested on a real phone. Read first: DD-44 +
  DD-42 in `shared-implementation-notes.md`, `lobby-host.js` (Grep `lobbyOpenJukebox`,
  `lobbyOpenStickerbook`). Opus, high.
  **Shipped:** a 🎵 Jukebox / 📒 Stickers places row in Shelves (its own row under the brand row, not
  the dock) and Classic (under the wordmark), through the router, each closing back to its opener
  (`visual-lobby` § 17). **RESOLVED [27 Sep 2026] for TV too** — a compact `.lb-lg-tool` icon pair in
  its own tools pill (`tvBuildHeader()`/`tvApply()`, `js/lobby/tv.js`), same `data-lobby-place` +
  `lobbyOpenPlace()` wiring, proved at TV's own widescreen floor (`visual-lobby` § 17). TV's own
  `assets/logo.png` question — **RESOLVED [27 Sep 2026]**: TV's header now carries the live-text
  `.sylly-wordmark` like Shelves and Classic (DD-50), so no horizontal asset is needed. The jukebox's <860 px layout
  was checked at 375×667 in headless Chromium only; a real phone is still the owner's pass. DD-49.
- **Jukebox open items (owner calls):** the artist is a stand-in ("Sylly House Band", every track) —
  tracks are generated with **HappyShrimp**; whether to credit it in place of the stand-in for a
  publicly distributed app is still open, pending a check of its terms (owner call, not something
  this session can verify). **RESOLVED 27 Sep 2026 — soft-lock stays off for now.** The `locked`
  flag is deliberately `false` on every track (already was); achievement-gated unlocking (the
  stickerbook's earn loop + its storage key) is a later feature and nothing needs building for it
  yet. The Lounge's cat shows a song's title on its little screen — whether it should also show
  "paused" is a feel call for the real-device pass. **Songs are provisional** — the owner generates
  a few a day, so the catalogue will keep churning; replacing one is the master file +
  `node tools/encode-music.js` + one manifest line, no `sw.js` edit either way. **Masters are no
  longer kept in git** (27 Sep 2026) — the old `data/music/New folder/` archive is gone;
  `data/music/pending/` is the live staging spot (`jukebox/manifest.json`'s `masterDir`), cleared
  after each track is processed. The owner keeps an archive of masters outside git, so nothing is
  actually lost — only the git-tracked copy.
- **RESOLVED 27 Sep 2026 — cover art regenerated for Eerie Night Sky, Harmonium Hums and Dinner
  Dinner Radio Cha-Cha.** New illustrations (HappyShrimp, 1024×1024, matching the
  illustrated-vignette style of `clown-s-alibi`/`fruity-fun`) resized to the catalogue's 400×400
  spec and dropped into `data/music/jukebox/covers/<id>.jpg`, replacing the three generic
  photo/texture stand-ins. Prompts used are in `docs/music-prompts.md` § Cover art prompts.
- **The owner's real-device pass** — desktop browser confirmed clean (26 Sep 2026); a phone and the
  TV are still outstanding, owner's call to pick up later. No harness sees a real GPU, touch, or how
  the Lounge feels — any issue that pass turns up gets logged here when it happens. This also
  includes the controller idle animations' feel (cadence, rumble loudness, whether the pairing glow
  reads — DD-43) and the Workshop's Tool Belt phone layout (DD-46), both code-complete and
  harness-green but never felt on hardware.
- **Prop quality rounds** — TV, dial and jukebox shape passes are done (23 Sep 2026); remaining
  owner-set order: **phone → binder → lamp → shelf contents**, then the room itself. One prop per
  round; plan: `docs/superpowers/plans/2026-09-22-premium-prop-quality.md` § 2 checklist.
- **Archive `wip/lobby-lab/`, `wip/premium/`, `wip/jukebox-lab/` and `wip/workshop-lab/` out of the
  repo** (spec § 11.3). Safe: nothing in `js/`, `css/`, `src/`, `data/`, `sw.js` or `tools/` loads
  from `wip/`, and the ported harnesses were re-run green, identical counts, in a `wip/`-free copy
  of the app.
## Controller Workshop — rotate-to-sticker's ear precision (14 Sep 2026, SW v230)

**RESOLVED 26 Sep 2026 (DD-14).** `ctlBuildScene()` set no `scene.environment`, which is why the
Workshop's matte plastic read flatter than the same materials do in `wip/premium/`. Fixed with a
~15-line port of `prmBuildEnvMap()` (four emissive planes through `THREE.PMREMGenerator`, zero
assets) into `ctlBuildScene()` itself, tuned to the controller's own three-point light rig rather
than the Lounge's palette. `visual-controller-stickers.js` (59 checks, real Chromium/WebGL) confirms
no page errors and the ornament still paints correctly.

Picking a placed sticker from the book now rotates the model to face it (`ctlStickerGoToModel` in
`js/controller.js`) — general `atan2` aim math against the local surface normal, not a per-surface
angle table. Shell placements land essentially dead-on (~0.99-1.00 facing-alignment, measured as
the dot product of the world-space normal against the camera's forward axis). **Ears land around
0.71-0.82 — noticeably better than the two defects fixed en route (see `shared-implementation-notes
.md` DD-12), but not perfect, and the owner has flagged it as an accepted "good enough for now."**

**Why it's capped there:** `ctlStickerAimNormal` only has yaw to work with (the player's own tilt,
`ctlRotX`, is deliberately left alone), and a corner-mounted ear cap needs BOTH yaw and pitch to
square up to the camera — yaw alone gets it partway. The aim direction itself is also an
approximation (there is no `ctlStickerSurface.normal()` for an ear; it reads the shell's own normal
at that ear's boss keep-out coordinate, `CTL_STICKER_OPT`'s `x = ∓0.84, y = 0.84`, as a stand-in).

**If revisited:** the real fix is likely easing `ctlRotX` toward a computed pitch alongside
`ctlRotY`, using the same normal (its Y-component already carries the tilt information the yaw-only
version discards) — `ctlTick`'s existing `ctlRotYTarget` easing block generalises to a second
`ctlRotXTarget` with minimal new code. Not attempted this round: the shell case (the common one) was
already fixed, and going further into ear-specific pitch math was judged not worth it against the
"might revisit later" bar. No harness gap here — this is presentation, per the project's harness-
scope rule; a fix would be verified the same throwaway `visual-check` way this round's was.

---

## Controller stickers — the on-device pass is OUTSTANDING, and Bailed has no badge (14 Sep 2026, SW v229)

The sticker sub-project is code-complete and every harness is green — `verify-controller-stickers.js`
(157), `visual-controller-stickers.js` (48), `verify-controller-state.js` (63),
`verify-controller-body.js` (28). Two things are genuinely not done, and neither is a harness's job.

**1. The manual pass on a real phone (spec § 9.3) has not been run.** No harness reaches any of it:
headless Chromium has no touch, no GPU of the kind a phone has, and no opinion about whether a warped
sticker looks acceptable. The checklist, verbatim from the plan's Task 11 Step 2:

1. Place a sticker wrapped over an edge — it must continue onto the back sheet, not stop at the crest.
2. Place one flat on an ear.
3. Rotate the controller so a placement is out of view, then **select it from the book** and relocate it.
4. Remove one; undo it; undo a relocate.
5. **Look hard at the annulus just outside the ear bosses, `y ~ 0.57-0.78` on the back sheet, and the
   saddle between them** — spec § 12.2 measured the body's worst distortion there, and it is the
   concrete version of the owner's "around the ears was problematic" report. If it looks too warped the
   only lever is `maxDistort` in `CTL_STICKER_OPT` (`js/controller.js`): 0.05-0.06 is the useful range,
   and spec § 12.1 tabulates what each value costs. It is an inert dial — nothing else reads it.
6. **Superseded by SW v230:** the die-cut border no longer paints on any LIGHT shell/ear at all
   (`lum > 0.5` skips the ring entirely — the sticker's own near-white edge was found to already
   read fine there), so the six shells below no longer have a border to contrast-check. What's
   worth eyeballing now instead is that the bump lip alone (no colour ring) still reads as a raised
   edge on FRT `#FFE500`, COMB `#F0A500`, CLD `#8ECAE6`, FLW `#F9A8D4`, GTH `#B1BCA0`, YGI `#F59E0B`
   — and that a DARK shell/ear still gets a visibly light ring, unchanged.
7. Save, kill the app, reopen: every placement survives, in the same place.
8. Offline install from cold — the manifest and images fetched while online are still there; a design
   never fetched simply does not appear (not an error).

Record the result in `shared-implementation-notes.md`. Items 5 and 6 are the two that could still
change shipped values; 1-4, 7 and 8 are confirmations of behaviour the harnesses already assert
headlessly.

**2. Bailed (`bld`) has no sticker.** **RESOLVED [27 Sep 2026]** — `bld.png` + its manifest line landed (owner), and `LB_NO_STICKER` (`js/lobby/lobby.js`) was emptied so Shelves and TV draw it too. `verify-controller-stickers` 158, `verify-achievements` 81 (DD-50 follow-up 3). `data/stickers/manifest.json` carries nineteen designs and
deliberately omits Bailed until the owner supplies `bld.png`. This is not a bug and needs no code
change: dropping the PNG in and adding one manifest line is the whole job, with no `sw.js` edit and no
`CACHE_NAME` bump (D1's runtime-cached contract). `verify-controller-stickers.js` § 7 checks manifest
against folder **both ways**, so it will flag the file the moment it lands without the manifest line —
leave the harness as it is.

---

## COMB gaps found while writing its identity doc (10 Sep 2026, phase-41 gate)

Same shape as the eighteen sections below: writing `docs/game-identities/comb.md` end to end
surfaced things a build never looks at, because the build reads one screen at a time and the doc
reads the whole journey. None blocking; the game shipped at SW v225 with all of these open.

**1. There is no turn-handover beat. — ✅ ADDRESSED (SW v226).** The meadow's new player panel lights
the active seat's row (`combRenderPlayerPanel`), so on a board identical on every phone the handover
now has a visible signal beyond the header line and the action bar. A dedicated animated beat on the
active device was considered and not built — the lit row covers the need.

**2. The Season Log is the most under-used surface in the game.** Complete, privacy-correct by
construction, reachable from exactly one small 📜 in the board header, pointed at by nothing. In Out
Loud trading — the default — it is the only record of what was agreed. It is also **not surfaced at
gameover**, which is where a 50-minute season most wants to be looked back over.

**3. The gameover screen is short for the length of the match.** Standings, the Golden Nectar reveal,
two achievement lines and a Scout Flight count. The reveal is the beat it must land and it does; the
rest is thin for fifty minutes of play.

**4. Client standby shows no roster.** `#comb-standby-roster` exists and is never populated. A
player waiting on a host who is still reading Settings sees one line of text and no evidence anything
is happening.

**5. Balance — Short Summer's achievement weight, untuned by decision.** At a 7-point target the two
achievements are 4 of 7 (57%, against Catan's 40%), so a win on three Drone Cells plus both
achievements is reachable. Both fallbacks are one-line edits: `COMB_ACHIEVEMENT` holds the points
and both minimums keyed by Season. **Needs real play, not a harness** — `tools/simulate-*` would
answer the arithmetic and not the question.

**6. No `data/music/comb.mp3`.** Inherits the lobby fallback. A 25–50 minute match earns a track
more than most games in the box, and adding one needs no code change, no `sw.js` edit and no version
bump.

---

## RAF animations and `prefers-reduced-motion` — NT and CLD unswept (10 Sep 2026)

**What.** `ui-style.md` § Motion Standard now says a `requestAnimationFrame` loop must check
`prefers-reduced-motion` itself, because the global CSS block reaches nothing that writes
`transform` by hand (decision-log 2026-09-10; `comb-impl-notes` TG-13). **COMB complies**
(`combReducedMotion()`). **NT's playback loop (`ntStopPlayback`/`ntRafHandle`) and CLD's floe sim
do not** — both were written before the rule existed and both still travel at full speed with the
setting on.

**Why parked.** Neither is broken for the default user, and the right treatment is per-animation
judgement rather than a mechanical sweep: the rule is *show the end state, skip the journey*, and
what "the end state" means differs for a maze path being retraced (NT) versus a penguin sliding to
rest (CLD) — CLD's is arguably the harder call, since the position it stops at **is** the result.
Doing it properly is a design pass on two games, not a find-and-replace.

**Trigger.** The next time either game is opened for other work, or a phase gate touching motion.
Also worth checking CLD's How-to "The Floe" practice sim, which is a third RAF on the same rule.

---

## ⬆ HIGH PRIORITY — MDLM client reconnect (Honeycomb Hills Q20, 6 Sep 2026) — RESOLVED 27 Sep 2026 (engine half + COMB, SW v236)

**RESOLVED 27 Sep 2026 (SW v236).** The engine half shipped as an opt-in `reconnect` hook, with
Honeycomb Hills its first adopter: frozen seats, per-connection presence, the Away overlay, a 20 s
grace for every non-adopter, and reload → one-tap rejoin (`sylly_rejoin`). **The premise below was
wrong in one respect:** a drop never sends `MP_PLAYER_LEFT`, so the Mid-Game Quit Contract and
`verify-mp-configs.js` § 6 were **not** rewritten — deliberate quits still dissolve. Detail:
`shared-implementation-notes.md` DD-47. What is left moved to § Reconnect adoption, per game (below).
The original entry is kept as the discovery record.


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

## Reconnect adoption, per game (27 Sep 2026)

The engine half of client reconnect shipped at SW v236 (`shared-implementation-notes.md` DD-47) with
**Honeycomb Hills the only adopter**. Every other MDLM game gets drop *detection* — a 20 s "Waiting
for …" grace, then a reasoned end — but not *rescue*. Adopting is per-game work, **longest matches
first**, and each game needs three things:
- a **serialiser** and a full-state applier that takes a client from standby to the live screen
  (idempotent), with its client `onPassThePhone` safe to re-run;
- a **strip** — `sendState(idx)` sends that seat's own private state and nobody else's;
- **pause/resume** for every clock and auto-resolving timer the game runs.
**First candidates: PKO, FLW, CJAR.** Adding one is a reviewed change: `verify-mp-configs.js` § 7 pins
the adopter list. Model + effort per game: **Opus, high**.
**RESOLVED 27 Sep 2026 (SW v237)** for all three — `shared-implementation-notes.md` ML-09, plus each
game's own entry (PKO DD-27, CJAR DD-34, FLW "Client reconnect adopted"). Adopters are now
`flw`/`pko`/`cjar`/`comb`. **Next:** the remaining MDLM games, longest matches first — not yet ranked;
rank them before picking one (NT's per-round result screen is not in `MP_END_SCREENS`, see below). Each
needs its own loopback Reconnect section and an `*_SRC=` mutation pass — ML-09 lists the four traps.

**Owner call — the 20 s grace for non-adopters (review I4).** Before SW v236 a phone away for longer
than a phone call simply stalled the table, and one that came back with memory intact carried on;
now a non-adopting game ends for everyone after ~23 s (3 s debounce + 20 s). The spec chose that on
purpose (a clean end beats a forever-hang), but the host's own **End session** already covers the
hang, so the options are a longer grace (60–90 s), a host "Keep waiting" choice, or no automatic
end at all. Shipped as specified; one constant (`MP_AWAY_GRACE_MS`) either way.

**Minor follow-ups from the review (deferred, none blocking):** a rejoiner writes presence before its
ACCEPT, so a refused/timed-out rejoin briefly marks the seat back; "Not now" during an in-flight
rejoin cannot cancel the pending `mpRejoinRoom` (needs a generation token); `mpWatchRoomGone` does not
call `mpEndMatchLocal()`, so the away overlay can sit over "Host Disconnected"; `graceEndsAt` is a
host-clock timestamp (send remaining ms); the host itself gets no reason when the grace ends; the
debounce starts before `GAME_START` goes out; a mid-match stranger's refusal can be filtered by its
own post-HANDSHAKE cutoff (only before `seats` lands); a rejoin downloads the room's whole `/events`
log (`onChildAdded` without a query); a version refusal uses the rejoin modal's copy, not
`mp-version-mismatch-overlay`. GM and NT are not in `MP_END_SCREENS` (per-round result screens), so
a phone locked at their podium still reads as a drop.

**Host migration** — still separate and larger (a host drop deletes the room: `onDisconnect(mpRoomRef)
.remove()`). The brief's Appendix A Option 2; not started.

**⚠️ Outstanding — the real-device pass (no harness replaces it).** A session on at least two phones,
one of them the owner's iPhone SE: start a Short Summer; lock the SE for a minute mid-turn and check
the other phone shows "Waiting for …" and the clock froze; unlock (or reload) and tap **Rejoin**, then
check the seat, the hand and the time left; do it once with a trade open. Record the outcome in
`comb-implementation-notes.md` DD-30 and close this line.
**Same pass, SW v237 adopters** (one reload each is enough): FLW on a 30 s Appraisal Clock — drop a
*non*-active phone and check the active player's clock froze; CJAR on Standard — reload mid-window
after another seat has chosen, and check the rejoiner can still choose and sees nobody else's pick;
PKO with Force of Nature — reload the Challenger during a Carrion window.

## Found during the reconnect build (27 Sep 2026)

- **`verify-jec-loopback.js` fails 1 of 164** — *"a Chef with no bonus gets no line"* (expected 3,
  got 0). It fails identically with the reconnect changes stashed, so it predates them and is not
  engine-related. Untriaged.
- **CRLF working copies break the mutation harnesses.** `.gitattributes` pins `*.js` to LF and the
  committed blobs are LF, but the working copies of `js/games/cjar.js` and `js/games/pko.js` (and,
  until SW v236, `comb.js`) carry CRLF. `mutate-comb.js` reported **19 of 71 mutants as PATCH-MISS**
  for exactly this reason — multi-line anchors never matched, so those mutants never ran, and the
  summary read as "survivors". Fix: re-write the working copy with LF (no content change), or make each
  mutator normalise on read as `mutate-mp-reconnect.js` does.
  **RESOLVED 27 Sep 2026 for `pko.js` and `cjar.js`** — both working copies re-written as LF during the
  reconnect adoption (git saw no diff). The mutator-side fix is still open: with `core.autocrlf=true` a
  fresh checkout can bring CRLF back, so normalising on read is the durable half.

## JEC and CJAR brand colours vs Honeycomb Hills gold (Q22, 6 Sep 2026) — RESOLVED

**Confirmed 26 Sep 2026.** The three-way hue crowding this item flagged (JEC amber-500 37.7° / COMB
`#F0A500` 41.3° / CJAR `#D4A017` 43.5°, all within 5.8° of each other) no longer exists: JEC is now
slate-600 (steel) and CJAR is chocolate-brown `#5C3A21`. Both moves happened as part of other work
without this note being closed. No action needed.

---

## `screen-mp-mode`'s offline warning — RESOLVED 26 Sep 2026

For an MDLM-only game, the offline notice on `screen-mp-mode` used to say *"No internet connection —
Pass-the-Phone only"* even though `supportedModes` is `['mdlm']` and there is no Pass-the-Phone path
to fall back to. `mpShowModeScreen()` (`js/engine-multiplayer.js`) now branches the copy on
`cfg.supportedModes.includes('ptp')`: a game with a PTP path keeps the original wording, one without
gets *"This one needs everyone online. Reconnect and try again."* The Host/Join buttons were already
correctly dimmed by `mpBuildModeSection`'s existing `dimmed = isLobby && !online` — only the copy
needed fixing.

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

## FRT + CJAR in-game CTAs vs lobby keycap ink — RESOLVED

**Confirmed 26 Sep 2026.** The 10 Sep 2026 suite-wide white-ink sweep (`ui-style.md` § Action Button
Standard → "Locked per-game button scheme") closed this: no game sets `ctaTextClass` any more, and
every brand fill — including FRT and CJAR's — carries white ink consistently across lobby keycap
and in-game CTAs. No action needed.

---

## Music — the architecture shipped, the Sylly wiring is now DONE (28 Aug 2026 → 27 Sep 2026)

`js/lib/music.js` and the `data/music/` contract are live and verified. **All three Sylly Mode
tracks steps are DONE as of 27 Sep 2026** — SHP, PKO and FRT's matches now play their own Sylly
track. What is parked:

- **RESOLVED 27 Sep 2026 — all 20 games + the lobby now point at jukebox files, zero original
  encodes left.** `lobby.mp3`/`li5.mp3`/`gm.mp3`/`ss.mp3` (the four tracks over the ~1.5 MB
  ceiling — 5.46/4.32/3.52/6.04 MB) turned out to already have jukebox-processed twins: the
  lobby track's title was literally "旧玩具箱" (Old Toy Box), and LI5/GM/SS each had exactly one
  jukebox entry tagged to their game (`teacher-s-out`, `psychic-waves`, `the-stakeout`). Repointed
  `data/music/manifest.json`'s four entries at those jukebox files and deleted the four originals.
  This also fixes the `null`/`null` title/artist gap those three carried — they inherit the
  jukebox entries' real titles now.
- **RESOLVED 27 Sep 2026 — The Bluff (`dyb`) has a base track.** "Endless Rise" — DYB was the one
  game still on the lobby fallback; no longer.
- **The SS jukebox duplicate is resolved (26 Sep 2026).** "A Night Out" and "The Stakeout" were the
  same song generated twice (near-identical file size, distinct hashes — a re-export, not a
  coincidence). "The Stakeout" kept (fits the espionage theme; already the id baked into
  `visual-lobby.js`'s jukebox test), "A Night Out" and its mp3/cover deleted.
- **RESOLVED 27 Sep 2026 — PKO's second base song, renamed and kept.** "A Force of Nature" shared
  its name with PKO's own Sylly Mode ("Force of Nature"), so it's renamed **"Wild Instinct"**
  (`data/music/jukebox/wild-instinct.mp3`) and kept as a jukebox-only bonus track — the owner's
  call was to keep both, not drop one. `pko:sylly` still points at "Weather Turned"; the in-game
  base track is still "Quiet Hunting".
- **A Music & Sound section in the Phase 1 brief template** (`docs/rules/new-game-brief-template.md`).
  Three fields, no more: the register in one line, tempo/energy, and anything the music must *not*
  do (Deep-Sea Deploy's "no sonar pings" is the model). The fallback rule means it can be left blank
  without blocking a build — which is exactly why it hasn't been added yet.
- **Sylly Mode tracks — RESOLVED except two optional games and CLD.**
  1. **Generation (owner, ongoing — a few per day).** Shipped 27 Sep 2026: FLW *The Counterfeit
     Run* → track "The Wrong Piece"; DYB's **base** track "Endless Rise"; DYB *The Tempest* → track
     "Perilous Gambit"; GM *Static Interference* → track "Two Radios"; NT *Distributed Network
     Protocol* → track "Relay Handoff". Each new variant needed one `js/engine.js` line too —
     `isGameSyllyOn`'s getter map now covers `flw`/`nt`/`dyb`/`great-minds` alongside the original
     `frt`/`shp`/`pko`; the deferred-work note that this step was manifest-only was wrong, the
     getter map needs a line per game and always did. **Still open, both optional:** CJAR
     (*Dibber Dobber*) and GTH (*Stroke or Genius*) — prompts written 27 Sep 2026, generation not
     yet done. CLD waits for its replacement Sylly Mode.
  2. **RESOLVED 26 Sep 2026 — promote jukebox songs into the in-game manifest.**
  3. **RESOLVED 27 Sep 2026 — the Sylly wiring.** `resolveKey(gameId, isSylly)` in
     `js/lib/music.js` tries `"<gameId>:sylly"` first (falling back to the base track, then the
     lobby), and `isGameSyllyOn(gameId)` in `js/engine.js` is the one place that reads across the
     engine/plugin boundary — a small per-game getter map, same shape as `getMuteToggleOnClass`.
     `showScreen()`'s existing one-seam call (`Music.playFor(activeGameId,
     isGameSyllyOn(activeGameId))`) is the only call site touched — no plugin needs a line of code,
     then or now. SHP/PKO/FRT all verified in a real browser: the actual settings toggle correctly
     switches the track on the next screen transition (settings overlays toggle by `style.display`,
     not `showScreen()`, so the retheme happens at the natural moment — starting the match — not
     mid-settings). **A real bug was caught and fixed along the way**: `js/lib/music.js` encoded a
     manifest `file` path with `encodeURIComponent()` on the whole string, which also escapes a
     subfolder's own `/` — every jukebox-sourced in-game track would have silently 404'd. Detail:
     `shared-implementation-notes.md` BUG-22.
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
- **RESOLVED 26 Sep 2026** — `#screen-lttp-role-reveal` was dead code that still shipped (registered
  in `allScreens[]`, fully built, never shown — role info was already folded into the Chat screen's
  own header). Removed: markup, its `allScreens[]` entry, and the section-header comment reference
  are all gone.
- **Three contextual-help surfaces with unclear boundaries.** The header `[?]` opens the full How to
  Play overlay; a second inline `?` next to the map instructions opens `lttp-tip-overlay`; the
  message composer has its own `[?]` opening `lttp-help-tip-overlay` (a legacy single-string
  variant, shaped differently from every other tip overlay in the suite). A player can't tell which
  of the two non-header `?` icons goes where before tapping one.

`docs/game-identities/lttp.md` T7c already carries the remaining bound question and the help-surface
overlap; fixing either means updating that section in the same change.

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

**One of two RESOLVED (stale), confirmed 26 Sep 2026** — `gth-case-report-progress` is populated:
`gthUpdateCaseReportProgress()` exists and is called from both `gthShowCaseReport()` and the
diagnosis-ready path. Whatever fixed it did so without updating this note; no action needed.

- **Still open: the Waiting Room and Case Report screens carry no rotating flavour line.** Both are
  held-beats a player can sit in for a while depending on how slow the table is, and both show one
  fixed line every session, unlike the suite's Round/Night Intro standard (a small rotating pool,
  per `ui-style.md`). Lower priority — CJAR carries the identical open item for its own Raid
  Summary screen.

---

## `verify-cjar-loopback.js` flakiness — RESOLVED 26 Sep 2026

Logged twice (15 Aug, then 22 Aug) as a Dibber Dobber payout-beat check that failed ~20–25% of runs
(`host2 threw the exact split token count`, `expected 3, got 4`). Both entries guessed it was RNG
variance from the harness's real (unseeded) shuffle and proposed adding a `CJAR_SEED=` env var.

**The real cause was a test bug, not a shuffle-driven flake.** The scenario sets up 3 takers + 1
innocent + 0 dobbers, which the *actual* game code (`cjarBeginFlipAnim`, `js/games/cjar.js`) resolves
through its "takers + innocents, no dobbers" branch — heads = takers.length + innocents.length = 4,
remainder always 0. The test's `ddExpected` was instead computed from the pure takers-only formula
(heads=3, remainder = value % 3), which only happened to match the real branch's answer (4) when the
random card's value wasn't a multiple of 3 — exactly the ~20–25% split observed. Fixed by deriving
`ddExpected` from the branch the game actually takes (`tools/verify-cjar-loopback.js`, "Dibber Dobber
payout beat" section) rather than reimplementing a different one. **30/30 clean runs after the fix**,
no seeding needed.

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

## SHP dead overlay — RESOLVED 26 Sep 2026

`shp-tip-overlay` was fully built and never opened (Counting Sheep's tap-hold-to-gallery pattern
covered the same need). Removed rather than wired: markup, `shpShowTip()`, its close handler, and
its `resetToLobby()` teardown entry are all gone. `docs/game-identities/shp.md` and
`docs/code-map.md`'s SHP overlay table updated in the same change.

---

## PKO copy drift — RESOLVED 26 Sep 2026

The Culling's interstitial blurb described Extinction Event's effect (a global wipe), not its own
per-player one. `PKO_EVENTS`'s `'culling'` blurb (`js/games/pko.js`) now reads *"Every Hoard
discards the species it holds fewest of"*, matching `pkoFireCulling()` and `PKO_EVENT_DETAIL`.
`docs/game-identities/pko.md` T7c updated in the same change.

---

## CJAR copy drift — RESOLVED 26 Sep 2026

All three items fixed in `src/screens/cjar.html` / `js/games/cjar.js`, paired with
`docs/game-identities/cjar.md` (`node tools/verify-identity-docs.js` green):

- "Take grabs cookies" → "Reach In grabs cookies" (settings + how-to Sylly Mode cards), matching
  the DD-21 rename the button itself already carried.
- "Five Raids, one jar" → "Every Raid, one jar" — no longer hardcoded to the Full Feast default.
- The two case variants of the crumbs caption unified on "Sneak Out alone…" (capital O), matching
  the button's own label.

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

**Two smaller items surfaced while building the harness:**
- **RESOLVED 26 Sep 2026** — `ntRoutingTimer` was the one timer handle missing from `ntResetState()`;
  added next to `ntLongPressTimer`/`ntResolveGuard` (§ Timer Lifecycle).
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
- Sylly Mode reachable and working (19 of 20 games have one — COMB is the sole exception, by design).

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
