# Deferred Work

**On-demand — not auto-loaded.** The running list of known-but-not-yet-done work: code divergences,
retest backlogs, and audit items that are deliberately parked rather than forgotten. Newest section on top.
Tick items off here; promote anything architectural into `decision-log.md`.

**Only OPEN work lives here** (split 28 Sep 2026). When an item is done, mark it `RESOLVED [date]`
with a one-line note, then **move it to `docs/deferred-work-log.md`** under the same section heading —
the discovery record is kept there, not deleted. A section with nothing left open moves whole.

> Replaces `docs/fable-fix-plan.md`, which `logic-engine.md` pointed at but which no longer exists in the repo.

---

## Bots — shipped for Cold Shoulder, what is left (29 Sep 2026, SW v247)

Spec: `docs/superpowers/specs/2026-09-29-bots-design.md`. Engine: `shared-implementation-notes.md` DD-52;
brain: `cld-implementation-notes.md` DD-21.

1. **The owner's real-device pass** (spec § 6, "beyond every harness"): a **Solo** match on a cold offline
   install, and a **two-phone top-up** session (two humans + a bot). Judge whether Easy feels beatable and
   Hard feels fair, and time Hard's decide on the SE (desktop: ~5 ms). Above 3 seats Easy and Medium trade
   places in `simulate-cld-bots.js` — decide there whether Medium needs to feel stronger.
2. **Bot personalities** — parked by the owner (29 Sep 2026).
3. **Next adopters: PKO, PASS, DYB** (NT for training at most; COMB not planned). Each needs a `view` that
   strips like its `reconnect.sendState`, a pure `decide`, `submit` through its host record path, one
   `mpBotsPrompt`, and a fairness harness — `logic-engine.md` § Bots.
4. **Bots for games whose roster type is not `'none'`** (team/assigned seating) — out of scope; the
   schema check refuses it today.
5. **The host lobby CTA is stone, not the game's brand**, on both the room and Solo paths — only the mode
   screen's CTA takes `brandBtnClass`. Pre-existing; seen in the Task 11 layout pass.
6. **`visual-lobby.js`'s Konami audio check flakes** ("0 press voices, 0 beeps", 2 runs in 3 during this
   build; the harness's own comment records 2 in 5 on 26 Sep 2026). Unrelated to bots.

---

## Found during the DYB dice/table/Practice build (28 Sep 2026, SW v241)

Spec § 10's deliberate outs — each is its own later piece of work, none blocks anything.

- **Dice selector + a Lounge dice-tower prop.** Players pick a dice set; the `diceSet` skin packs
  (Deep Ocean, Sea Cliff, Classic) are the catalogue. When it lands, `js/games/dyb-dice.js` moves to
  `js/lib/` (it already reads no `dyb*` state). Design notes from the DYB build, so the brainstorm
  doesn't start cold:
  - **The Lounge is not the only door needed.** Most players never see it (wide-screen only; a phone
    gets Shelves/Classic/TV). Give the selector a places-row entry too, the same way the jukebox and
    stickerbook got phone doors at SW v238 — plus probably a "Dice" entry in DYB's own menu/settings.
  - **A second dice game already exists.** COMB (Honeycomb Hills) rolls 2d6 (`combRollDice`,
    `js/games/comb.js`) — but only as arithmetic; it shows the summed number as text, no physical die
    tiles. `dyb-dice.js` is still the only *visual* dice render seam, and the YAGNI note in
    `logic-engine.md` § Shared Library Modules ("extract only if a second dice game appears") should
    be revisited once COMB's roll gets a visual, or once the selector needs to offer a d6 pair.
  - **`dybActiveSet()` is the one place to plug the choice in** — today it reads a Terminal skin pack,
    else Rocky; the selector becomes another source there, ranked however the design decides.
  - **The preview is largely built.** `tools/dyb-dice-review.js` already draws every set × tint ×
    Tempest form + the cup; the in-game dice and the rolling cube draw anywhere as plain HTML, so a
    selector's preview can be exactly what's played with, including a real test roll.
  - **Pack checks exist** (`dybValidateDiceSet` + the dice harness's pip-contrast checks). Fix first:
    a set with unnamed tints shows "undefined" in the gallery caption (deferred-work-log.md, SW v241
    closure pass).
  - **The Workshop (SW v234) is the room to copy** — a Lounge prop opening a room, a live preview, a
    save, a one-way return through the router; `js/lounge/lounge-props.js` has the prop pattern
    (idle animation, reduced motion).
  - **Whose dice you see is a real design decision, not a detail.** Simplest: your device always
    draws every die in your own chosen set (no MP change). Spec §3.1's original idea — each seat's
    dice drawn in *their* owner's set — needs the set id sent at game start (a packet change, a
    protocol version bump); the drawing code already takes a set per die, so it's plumbing, not a
    rewrite. Ship the simple version first.
  - **Set is not colour.** The selector picks the material; colour stays seat identity
    (`dybTintFor()`, `tint = seat − 1` today) until seat/colour picking (below) exists. The preview
    can show all eight tints with "your colour comes from your seat" until then.
  - **Remembering the pick needs a new permitted `localStorage` key** (e.g. `sylly_dice`) — same
    owner call as the view-toggle entry below; the saved controller design is the precedent.
  - **Gotchas from this build:** moving `dyb-dice.js` to `js/lib/` needs a `PRECACHE_URLS` update and
    a version bump — make sure `sw.js`'s `cache: 'reload'` precache fix (BUG-25,
    `shared-implementation-notes.md`) ships first, or the new file can land stale on some devices.
    Any screenshot/visual-check work on the Lounge must wait for `lobbyReady` + ~6 s and call
    `lobbyScene.stop()` before driving a screen (headless Chromium stalls otherwise), and use
    viewport screenshots, not `fullPage`, while anything loops. Test at the owner's iPhone SE sizes
    (320×452 first), not just 375×667 — DYB's stage-overflow bug only showed at 320.
  - **Footnote — a playing-card selector, same shape.** PASS (`cards`, the standard 54-card deck) is
    the only other game on a shared, swappable-in-principle render seam (`js/lib/cards.js` /
    `Cards.buildEl`) with no selector of its own. A card-back/face-style picker would follow the same
    prop-in-the-Lounge-plus-places-row shape as the dice selector; not scoped, just noted so it isn't
    rediscovered from scratch.
- **Seat and colour picking in the waiting lobby — suite-wide.** Today a DYB tint is `seat − 1`;
  `dybTintFor(playerIdx)` is the one function a colour pick replaces. Other games would need their own hook.
- **Practice tab retrofit — the 19 remaining games.** Moved to its own tracker,
  **`docs/practice-rollout.md`** (28 Sep 2026): priority + effort, the per-game definition of done,
  and a card per game. Track it there, not here.
- **Persisting the stage view toggle** (Close-up | Whole table) across sessions — needs a new
  permitted `localStorage` key (CLAUDE.md § Anti-Patterns lists the permitted ones). Owner call;
  today it is memory-only (`dybStageView`).

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
- **The owner's real-device pass** — desktop browser confirmed clean (26 Sep 2026); a phone and the
  TV are still outstanding, owner's call to pick up later. No harness sees a real GPU, touch, or how
  the Lounge feels — any issue that pass turns up gets logged here when it happens. This also
  includes the controller idle animations' feel (cadence, rumble loudness, whether the pairing glow
  reads — DD-43) and the Workshop's Tool Belt phone layout (DD-46), both code-complete and
  harness-green but never felt on hardware.
- **Prop quality rounds** — TV, dial and jukebox shape passes are done (23 Sep 2026); remaining
  owner-set order: **phone → binder → lamp → shelf contents**, then the room itself. One prop per
  round; plan: `2026-09-22-premium-prop-quality.md` § 2 checklist, now in `Documents archive/2026-09-28 cleanup/superpowers-plans/`.

## Controller Workshop — rotate-to-sticker's ear precision (14 Sep 2026, SW v230)

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

## Controller stickers — the on-device pass is OUTSTANDING (14 Sep 2026, SW v229)

The sticker sub-project is code-complete and every harness is green — `verify-controller-stickers.js`
(157), `visual-controller-stickers.js` (48), `verify-controller-state.js` (63),
`verify-controller-body.js` (28). One thing is genuinely not done, and it is not a harness's job (Bailed's missing sticker, the second, is in the log).

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
(CLD's How-to practice RAF — the third on this rule — is RESOLVED at SW v244: The Floe tab is gone
and the Practice Arena's Slide checks reduced motion in JS; see `docs/deferred-work-log.md`. The live
floe's replay is still unswept, and so is the ambient idle sway + swell rings on both canvases.)

---

## Reconnect adoption, per game (27 Sep 2026)

The engine half of client reconnect shipped at SW v236 (`shared-implementation-notes.md` DD-47) with
Honeycomb Hills as the first adopter; **FLW, PKO and CJAR followed at SW v237**. Every other MDLM game
gets drop *detection* — a 60 s "Waiting for …" grace, then the host chooses Keep waiting or End session
(SW v240) — but not *rescue*. Adopting is per-game work, **longest matches
first**, and each game needs three things:
- a **serialiser** and a full-state applier that takes a client from standby to the live screen
  (idempotent), with its client `onPassThePhone` safe to re-run;
- a **strip** — `sendState(idx)` sends that seat's own private state and nobody else's;
- **pause/resume** for every clock and auto-resolving timer the game runs.
**Next candidates:** the remaining MDLM games, longest matches first. Adding one is a reviewed change: `verify-mp-configs.js` § 7 pins
the adopter list. Model + effort per game: **Opus, high**.

**Minor follow-ups from the review (deferred, none blocking):** a rejoiner writes presence before its
ACCEPT, so a refused/timed-out rejoin briefly marks the seat back; "Not now" during an in-flight
rejoin cannot cancel the pending `mpRejoinRoom` (needs a generation token); `mpWatchRoomGone` does not
call `mpEndMatchLocal()`, so the away overlay can sit over "Host Disconnected"; `graceEndsAt` is a
host-clock timestamp (send remaining ms); the
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

## Cold Shoulder (CLD) — phase 40 gate still OPEN + two presentation follow-ons (4 Sep 2026, SW v219 → v221)

Game 19 shipped through Stage 6 (documentation closure). Every headless harness and the two-client
loopback pass. **Not yet done:**

1. **Live multi-device session** — host + ≥2 real devices, a full Match including a plunge that
   **plugs** a gap, a plug **knocked back**, a displacement, a rim Snowball, a **Dive** (Throw · Dive
   switch, tap-to-dive onto a dashed free seat — SW v243), a Washout that starts an **Ice Bath**, and
   The Thaw on. **Every device must be on SW v247** (`MP_PROTOCOL_VERSION` `'v247'`). The Throw · Dive
   row and the canvas re-fit have had `visual-check` only (375×667 / 375×548 / 320×452). Closes the
   phase gate along with item 2. Also
   check **How to Play → Practice** on a real device: all three drills' plans, a round played to a
   winner, the camera (pinch, double-tap, the mini-map) and the cue's feel (96 px, the dead zone)
   (SW v245). The SE `visual-check` pass (`cld-impl-notes` DD-19) measured the Practice stage at
   291 / 269 / 173 px — judge the 320×452 one in the hand. And judge **Hunger** in the hand (SW v245 —
   the HUNGRY! beat every 4 Slides, the 🐟❗ bubbles, and — SW v246 — the face ladder; is the step felt?). The
   provisional-balance note (Thaw-off ~30% long) is RESOLVED 29 Sep 2026 by Hunger — see
   `deferred-work-log.md`.
   **SW v246 ("looks fun", DD-20):** every device on v246 (`MP_PROTOCOL_VERSION` still `'v245'`). Judge
   the new art in the hand: the faces at play size, the Hunger ladder's rungs, the floe screen on the
   shelf (at 320 px the header wraps to two lines), the ice-block buttons, **and the SE's frame rate**
   (spec § 4.7's 60 fps target; a crowded frame is ~1,030 fill/stroke calls; mitigations ready: cache
   chunk sprites, halve the wavelets, drop the grain). At 320×452 the Practice coach bubble covers most
   of the 169 px stage — the spec § 8 "fold the drill pills below ~220 px" call is still open.
   **First attempt 28 Sep 2026 (3 players) stalled at the first non-host Lock In** — the live
   Firebase rules had no `private` block (`cld-impl-notes` BUG-12 → `shared` BUG-26). Re-run once
   the owner has pasted the §2.7 `private` rule into the console. The same session's feel notes
   (ring too sparse, drag clunky, art) are a design round of their own, not gate items: the ring
   was answered at SW v242 and the Drowned at SW v243 (DD-16 / DD-17); the pool-style drag + the
   Practice Arena shipped at SW v244 (DD-18); the procedural art pass shipped at SW v246 (DD-20).
2. **Offline install check** — unregister the SW, go offline, cold-boot, confirm
   `js/lib/physics.js`, `js/games/cld-art.js` (SW v246) and `js/games/cld.js` precached. The Cast and Practice tabs (SW v244) are
   *procedural*, not asset-backed, so neither doubles as a gallery check — run this directly.
3. **TG-13 — The Thaw's shrink is visually inaudible in playback. DONE, SW v220 (4 Sep 2026).**
   `cldBeginPlayback` rewinds `cldFloeRadius` to the first `thaw` beat's `fromRadius`; the `thaw`
   aftermath beat sets it to `newRadius` as it plays. Two lines in shared functions, no timeline
   field. All headless harnesses still green; real-device readability of the shrink now rides check 1
   (the live session with The Thaw on). `cld-implementation-notes` TG-13 (RESOLVED).
4. **Recorded intent, not a bug** — the owner intends to demote The Thaw to a normal setting later
   and give CLD a Sylly Mode that changes what the game *is*, not how fast it runs. Ships as-is.
5. **Peck Off (2-player) balance** got lighter attention than the mid sizes in
   `simulate-cld-balance.js`.
6. **SW v244 final-review minors (29 Sep 2026) — deferred, none blocking** (`cld-impl-notes` DD-18):
   - a touch-down *on* the penguin has no direction until the finger leaves the 22-unit dead zone,
     so its first armable power is already ~0.21 — a very soft shot needs pull-out-then-push-back.
     Fix if wanted after the hardware pass: baseline `max(|D−P|, CLD_CUE_DEAD)` (departs from spec
     § 2.1's formula — owner call);
   - (five more resolved 29 Sep 2026, SW v245 — moved to `deferred-work-log.md`);
   - the loopback does not execute `cldDraw` (its `requestAnimationFrame` returns 0) — the renderer is
     covered on one device by `verify-cld-practice.js`, not on three as spec § 7.2 hoped. The loopback
     now loads `cld-art.js` (SW v246), so chrome art (the result, scoreboard and podium) runs on 3 devices.

Snapshot: `docs/phase40-snapshot.md`.

## Music — the architecture shipped, the Sylly wiring is now DONE (28 Aug 2026 → 27 Sep 2026)

`js/lib/music.js` and the `data/music/` contract are live and verified. **All three Sylly Mode
tracks steps are DONE as of 27 Sep 2026** — SHP, PKO and FRT's matches now play their own Sylly
track. What is parked:

- **The SS jukebox duplicate is resolved (26 Sep 2026).** "A Night Out" and "The Stakeout" were the
  same song generated twice (near-identical file size, distinct hashes — a re-export, not a
  coincidence). "The Stakeout" kept (fits the espionage theme; already the id baked into
  `visual-lobby.js`'s jukebox test), "A Night Out" and its mp3/cover deleted.
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
- **No credits surface.** `Music.nowPlaying()` returns `{ key, title, artist }` and nothing consumes
  it yet. The manifest already carries per-track attribution.

---

## LI5 gaps found while writing its identity doc (23 Aug 2026)

**Found, not fixed.** An identity pass records the game as it shipped; fixing what it reveals is a
separate task (spec § 15).

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

---

## JEC gaps found while writing its identity doc (23 Aug 2026)

**Found, not fixed.** An identity pass records the game as it shipped; fixing what it reveals is a
separate task (spec § 15).

`docs/game-identities/jec.md` T7c already carries both of these; fixing either means updating that
section in the same change.

---

## YGI gaps found while writing its identity doc (23 Aug 2026)

**Found, not fixed.** An identity pass records the game as it shipped; fixing what it reveals is a
separate task (spec § 15).

`docs/game-identities/ygi.md` T7c already carries both of these; fixing either means updating that
section in the same change.

---

## LTTP gaps found while writing its identity doc (23 Aug 2026)

**Found, not fixed.** An identity pass records the game as it shipped; fixing what it reveals is a
separate task (spec § 15).

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

- **Still open: the Waiting Room and Case Report screens carry no rotating flavour line.** Both are
  held-beats a player can sit in for a while depending on how slow the table is, and both show one
  fixed line every session, unlike the suite's Round/Night Intro standard (a small rotating pool,
  per `ui-style.md`). Lower priority — CJAR carries the identical open item for its own Raid
  Summary screen.

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

**GTH and DSD have no harness — both fixes are `node -c` only, not played live. Add to the retest
backlog.**

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

