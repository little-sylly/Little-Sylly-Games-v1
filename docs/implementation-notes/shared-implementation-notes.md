# Shared / Engine — Implementation Notes

**Scope:** Anything not owned by a single game — `engine.js`, `engine-multiplayer.js`,
`secret-mode.js` (Konami/Terminal), `js/lib/art.js`, `js/lib/cards.js`,
`js/lib/canvas-draw.js`, `sw.js`, and cross-cutting rules in `ui-style.md`/`logic-engine.md`
themselves. If a bug or design decision's root cause lives in one of these files — even if
it was *found* while testing a specific game — it belongs here, not in that game's
`[abbr]-implementation-notes.md`. A fix that touches both (e.g. a shared function PLUS a
game's own call site) can get a short cross-reference in the game's file pointing here,
but the actual root-cause writeup lives in exactly one place.

**Not in scope:** per-game bugs, design decisions, or lessons — even ones about a shared
*pattern* (MP sync, the render seam, etc.) — where the bug itself was in the game's own
code. Those stay in the game's own notes file, which is where the recurring-pattern lessons
already get elevated into `logic-engine.md`/`ui-style.md` from (see e.g. the private-hand-sync
and MDLM readiness-gate lessons already in `logic-engine.md`, both elevated from a specific
game's notes). This file is for bugs that were never a specific game's to own in the first
place.

---

## Design Decisions

**DD-47 — MDLM client reconnect: a drop is not a quit, and reconnect is an opt-in hook.
[27 Sep 2026, SW v236]**
**What happened.** A client whose phone locked or lost signal mid-match was simply gone. Its
`onDisconnect` quietly deleted its `/players` entry, but the host had stopped watching `/players` at
`mpConfirmRoster()`, so nobody noticed; the reloaded phone booted into the lobby with no memory of the
room, and every other device waited on a turn that never came. Honeycomb Hills made it acute: a Full
Season is ~50 minutes of permanent private hands. The deferred note (Q20) assumed the fix would
rewrite the Mid-Game Quit Contract and `verify-mp-configs.js` § 6 across all 20 games.
**Root cause.** Two different events shared one missing code path. A *quit* sends `MP_PLAYER_LEFT` and
has always dissolved the session correctly; a *drop* sends nothing, and had no behaviour at all — so
the contract never needed rewriting, only a second path added beside it.
**Decisions:**
- **Seats freeze at `GAME_START`** (`rooms/{code}/seats`) and the host watches **per-connection
  presence** (`rooms/{code}/presence/{uid}/{pushId}`) for the match. A seat empty for 3 s is Away —
  the debounce stops a sub-second blip cancelling a trade, and absorbs the instant before a client's
  first presence write lands, so no "seen" gate is needed (a seen-gate would have made a phone that
  drops right at match start never go Away: the old forever-hang, back).
- **Reconnect is an opt-in hook**, `MP_GAME_CONFIGS[abbr].reconnect = { sendState, pause, resume }`.
  Every game gets *detection*; only an adopter gets *rescue*. A non-adopter ends after a 20 s grace
  with a reason, rather than hanging. Honeycomb Hills is the only adopter; § 7 of
  `verify-mp-configs.js` pins the list so the next adopter is a reviewed change.
- **One packet, the whole set** — `MP_AWAY_STATE { seats, graceEndsAt }` instead of an away/back
  pair, so a dropped packet self-corrects on the next one (the private-repair rule, § MDLM Patterns).
- **The host is skipped by uid**, not index: a `'teams'` roster reorders `mpPlayerSlots`.
- **`mpApplySettings()` extracted verbatim** from `SETTINGS_SYNC`, so a rejoiner applies the room's
  settings through exactly the code every other device ran.
- **`sylly_rejoin`** — a session *pointer* `{ code, game, ts }`, the fourth localStorage exception.
  Written only for adopters (for anything else a prompt would promise a rescue that can't happen).
- **`lobbyLeaveForGame()`** — a rejoin enters a game with no lobby button, so `lobbyLaunch()`'s
  teardown was factored out and now also stops the Lounge's room.
**Lesson.** Before rewriting a contract to make room for new behaviour, check whether the new case
ever reached the contract at all. Q20's "redefines the quit contract" was the expensive reading; the
true one — a drop never sends the quit packet — kept 19 games out of the blast radius. Plan +
spec: `docs/superpowers/{specs,plans}/2026-09-27-mp-client-reconnect*.md`. Harness:
`tools/verify-mp-reconnect.js` (117) + `tools/mutate-mp-reconnect.js` (11/11). Lessons from the build:
ML-07, ML-08.

**DD-46 — the Workshop's phone tier: Tool Belt, and a reversible layout swap.
[26 Sep 2026, SW v235]**
**What happened.** DD-45 shipped the widescreen room and left the phone tier (<860 px) running a
stand-in: the stage pinned on top, paint and stickers scrolling under it, the sticker card docked at
the foot of a long sheet. Three candidates — P1 · Pocket (fixed split + tabs), P2 · Drawer (full
stage + pull-up sheet), P3 · Tool Belt (no tabs, swipe strips) — were built against the REAL shipped
partial in `wip/workshop-lab/` (the lab rebased on the v234 port; the earlier three widescreen
designs moved to `widescreen-round/`) and reviewed against the owner's own device, an iPhone SE (2nd
gen), at three sizes: full screen (375×667), inside a browser (375×548), and with iOS Display
Zoom on (320×452) — the last of which found a real bug in Belt's first pass (the sticker strip ran
entirely under the footer) before the owner ever saw it. The owner picked **P3 · Tool Belt** —
it is the only one that keeps B's own rule (both jobs on screen, no tabs) rather than trading it away.

**Decisions:**
- **No live DOM restructuring turned out to be needed for sizing** — the port's own to-do list
  (a ResizeObserver on `#ctl-stage`, a width-fitting camera for tall stages) assumed Belt's boxes
  would resize with state, the way Drawer's pull-up sheet did. They don't: Belt's tray/sheet/footer
  heights are all viewport-sized constants, never state-sized, so the stage's box only ever changes
  on a real window resize — already covered by the engine's existing `window.resize` → `ctlResize()`
  listener. Checked by computing every measured aspect ratio across all three SE sizes plus 390/360:
  none fell below the shipped formula's 0.9 threshold, so the formula already fits them.
- **Four elements DO need a real DOM move, because CSS cannot put one element in a different flex
  parent than its own DOM parent:** Randomise All + the palette (into `.wks-strip`, one scrolling
  row); Paint + the sticker card (into `.wks-tray`, one visible at a time via a new `data-st`
  attribute `ctlRenderPanel()` now writes to `#screen-workshop`); the sheet's kicker + running line +
  Undo (into `.wks-belt-head` — Undo needed its OWN home, separate from the card, because the design
  wants it reachable even while the card is hidden entirely, which the card's own widescreen rule
  "outlives the selection" doesn't give on a phone where the card is Paint's tray-mate); Reset/Save
  (into a `.wks-foot` footer, under the thumb, rather than overlaid on the stage).
- **The move is reversible, not one-shot.** The first version applied only once, at Workshop-open,
  gated by a breakpoint check — cheaper, but wrong the moment a session crosses the breakpoint live
  (a resizable window, a folding phone): the DOM stayed phone-shaped forever after. `ctlLayoutWide()`
  undoes `ctlLayoutPhone()`'s five moves in the exact opposite order, and a single
  `matchMedia('(max-width: 859px)')` listener plus one call at boot is the **only** mechanism —
  `ctlOpenWorkshop()` needs no breakpoint check of its own, because the DOM is already correct by the
  time it runs. Both directions are idempotent-guarded by `ws.dataset.phoneLayout`.
- **The static HTML never changed.** `_shell.html`'s Workshop markup is always the widescreen shape;
  the phone layout exists **only** as a JS-built transformation of it, verified by having a real
  browser cross the breakpoint mid-session and checking the reverse restores every original parent.

**Lessons:**
- **"Will this need to resize live?" is a real question with a checkable answer, not a default
  yes.** The Drawer prototype's sheet genuinely changed height with sticker state (needing a
  ResizeObserver + a camera refit); Belt's tray does not (same height, different **content**,
  swapped via `display`). Copying Drawer's port checklist onto Belt would have added two
  mechanisms that never do anything — measure the actual boxes before assuming the harder sibling's
  problems apply.
- **A one-way toggle is a trap disguised as a simplification.** "Apply once, at open, never revert"
  reads like a reasonable scope-cut for a device whose width never changes — until the very
  harness written to prove the port correct does exactly the thing being waved away (resizing the
  same page from 390 to 1440 mid-test), and fails on it. If a test can trivially do the thing you
  decided not to support, a real device eventually will too.
- **Test the owner's actual device, not a round number.** 390 px is this suite's reference width
  and a fine default, but it is not what shipped on the owner's phone: Display Zoom put their own
  layout at 320 px wide with roughly 452 px visible, and that specific size is what surfaced the
  footer-overlap bug the 390 px pass never would have. `tools/visual-controller-stickers.js` now
  carries all three of the owner's real sizes for this reason.

---

**DD-45 — the Workshop becomes a room: design B · Paint Shop, no tabs.
[26 Sep 2026, SW v234]**
**What happened.** With the jukebox and the stickerbook both full screens in the plum room, the
Workshop was the one lobby door still opening a narrow light-stone column with a Colours | Stickers
tab bar. Three widescreen designs were built in `wip/workshop-lab/` over the REAL `_shell.html` +
`controller.js` (the live elements moved into each layout, listeners and all). The owner picked
**B · Paint Shop** — paint | the controller | the sticker sheet side by side, no tabs — and, in the
same review, scrapped the SW v230 rainbow Randomise All. Ported to `#screen-workshop` +
`css/workshop.css`; `ctlRenderPanel()` now repaints static regions instead of building a card.

**Decisions:**
- **No tabs on widescreen.** Both jobs are visible at once; the old tab state (`ctlActiveTab`,
  `ctlOpenStickersTab`) is gone. The sticker card docks at the foot of the sheet — the lab floated it
  over the stage first, and it hid the very spot being stuck on.
- **The sticker surface is paid on the first pick-up, not on open.** The sheet is on screen from the
  first frame, so opening the Workshop fetches the manifest — and stops there. `ctlStickerPickUp()`
  builds the surface (339 ms desktop, the 2048 atlas) behind one painted frame of "Peeling it off the
  sheet…". A recolour-only visit still never builds it, which is the guarantee the old tab gave.
- **Randomise All is a glass key**: a die (chance) and four dots previewing the parts' current colours
  (what it changes), which pop on the roll. `ctlRainbowGradientStops()` and its § Action Button
  Standard exception are retired with it.
- **No floor shadow in the Workshop.** The 340 px stage cropped the contact shadow; the full room showed
  all of it, cut off by the key light's shadow frustum into a hard-edged blotch on the plum. The CSS
  plinth grounds the model instead (`ctlMount(stage, { floor: false })`).
- **Colour names come from `GAMES`** (`lobby-games.js`, matched by `brandHex`), so a swatch reads
  "Cold Shoulder", not a hex — never copied into `controller.js`.
- **Three widths, one of them a stand-in.** ≥1100 px: B as designed. 860–1099: the three columns
  squeezed the stage to 180 px at 900, so the stage pins across the top and paint | stickers sit
  beneath. <860: all stacked. Below 1100 the stage is `position: sticky` — without it, picking a
  sticker low in the sheet scrolled the controller away from the tap that places it (the old phone
  Workshop's fixed stage did this job). The real phone design is still owed (`deferred-work.md`).

**Lessons:**
- **A control that was hidden is a control that was never synced — moving it on screen changes what
  a harness measured.** The old Size slider only synced to the selected placement while the Stickers
  tab showed; the harness's rig never opened that tab, so its fold-refusal click was always measured
  at the default size 18. With the slider always live it held 8 from an earlier selection, a smaller
  sticker fit the fold, and the "refused" click placed a sticker. The check now pins the size it was
  measured at. When a layout change makes hidden UI visible, look for tests that leaned on it staying
  stale.
- **Re-check the in-between widths when a design is widescreen-first.** B was signed off at 1280 and
  1440; the harness's 900 px rig found the 180 px stage. A three-column layout needs a named tier
  between "wide" and "phone", not just a phone breakpoint.

**DD-44 — the jukebox ships: a screen behind the cat, and `Music.hold()`.
[26 Sep 2026, SW v233]**
**What happened.** The signed-off sandbox (`wip/jukebox-lab/`, the owner's "picked" design —
Records by default, List with search one tap away) became `screen-jukebox`, opened by tapping the
cat in the Lounge (a push-in on the cat, then the screen). `js/lobby/jukebox.js` is the port;
`css/jukebox.css` its styles, scoped under `#screen-jukebox`. The catalogue moved to
`data/music/jukebox/manifest.json`, beside the 26 songs and covers `tools/encode-music.js` made, so
`sw.js`'s existing `/data/music/` branch runtime-caches all of it with no fetch-handler change. The
Lounge's record carousel became "next record" (it plays from the room, no screen needed).

**Decisions:**
- **One player, and it is Music's.** `Music.hold(track)` / `release()` / `heldKey()` / `deck()` /
  `scope()`. The jukebox never owns an `<audio>`. A held song is kept through lobby navigation
  (`playFor(null)` is a no-op while held) and let go the moment a **game** asks for music
  (`playFor(gameId)`), so the game's theme always wins. `nowPlaying()` reports a held song only
  while it plays, which is what lights the Lounge's cat.
- **A held song plays through a media element, not a decoded buffer.** The loop tracks decode into
  an `AudioBufferSourceNode` for a gapless wrap; a 6-minute song decoded is ~130 MB of PCM. The
  element is routed through the shared AudioContext (gain → AnalyserNode → destination), so global
  mute and the equaliser both reach it.
- **The element is fed a Blob, not a URL.** A media element streams with Range requests; the 206
  replies are ones the Cache API refuses to `put`, so a streamed song would never have worked
  offline, however often it was heard online. `hold()` fetches the whole file (a plain GET the SW
  caches cache-first) and plays an object URL. Cost: a song starts after its download (1.2–5.7 MB),
  shown as "Finding the record…".
- **Mute All silences it; the Music toggle does not.** A held song was asked for by name. The
  jukebox's −/+ keys move the same music level the sound overlay's slider does (one level, not two).
- **✕ keeps a playing song, and lets go of a paused one.** Close with a song on and it plays on
  in the lobby; close with it paused (or nothing on) and the house music comes back.
- **A screen, not an overlay, with the stickerbook's router shape.** `jukeboxOpen` (a door) /
  `jukeboxClose` (the page's ✕) keep the room built but stopped; `home` closes it. The jukebox's
  own stage is the Lounge's real `LOU_BUILDERS.jukebox`, built once and kept, rendered only while
  the Lounge's RAF is stopped.

**Lessons:**
- **An AnalyserNode is a routing decision, not a read-only tap.** `createMediaElementSource`
  takes the element's output over: if its context is suspended, the song is silent, not just the
  bars. `hold()` only ever runs from a tap, and both `hold()` and `deck()` resume the context.
- **The Lounge prop reads Music only when told.** The scene called `syncJukebox()` at mount and
  after its own record tap; a song the page changes (the screen, a song ending, a game letting go)
  now reaches it through `scene.syncMusic()`, called from `jbxConfigure`'s `onChange` and on every
  return to the room. `wake()` already refuses a stopped room, so a sync behind the screen is free.

Open (owner): the artist is a stand-in ("Sylly House Band"); the Eerie Night Sky and Harmonium Hums
covers look like stand-ins; the soft-lock flag is carried and drawn but wired to nothing; songs are
1.2–5.7 MB against music's ~1.5 MB ceiling; phones cannot reach the Lounge, so cannot reach the
jukebox. Harnesses: `verify-lobby-router` 212 → 228, `verify-lounge-props` 1368 → 1371,
`visual-lobby` 76 → 94 (§ 15: the door, the stage-vs-room RAF split, Records default, Find a song,
a held song through ✕ / Shelves / a game, pause-then-✕, `resetToLobby` with it up). Two older
sections flaked under software GL this round, neither on the jukebox's path: § 9's "both offline:
the room says why" once (its status line clears after 4 s), and § 14's Konami 2 runs in 5 — **0
voices, 0 beeps**, i.e. the whole beat dropped by the prop's own stopped-scene rule (a frame gap
> 1.5 s), not a routing fault. § 14 now re-runs a beat that was dropped whole, once; it still asserts
the route and the absence of an unlock.

**DD-43 — the controller animation round: the ornament comes home, the Lounge's controller idles.
[26 Sep 2026, SW v232]**
**What happened.** The owner asked for Shelves and TV to "adopt" Classic's idle nudge, and for the
Lounge's controller to get idle animations of its own (rumble, rolling sticks, a rare Konami whose
*sounds* hint at the secret without unlocking it, and one of our choosing). A real-Chromium probe
showed the nudge **already fired on all three ornament layouts** — `ctlOrnamentIsLive()` was true
throughout. What was missing was a way home: each nudge is a random-signed coast, so the yaw
random-walked (−2.1 rad within a minute, reached through the Lounge's own doors), and in the small
Shelves/TV slots an edge-on or back-facing controller read as "no animation here". Fix: a home
spring in `ctlTick` (`CTL_HOME_SPRING`, ornament mounts only), making every nudge an out-and-back
wiggle. The Lounge prop got `louControllerIdle` — four beats, scheduled off the scene's frame time,
with a fourth pick of ours: a **pairing light chase** round the face buttons (silent, nothing
travels, so it never competes with the Konami for attention). "Original" now displays as "Classic".

**Root causes / lessons:**
- **"It doesn't run there" was a pose bug, not a gate bug.** The report described a missing
  behaviour; the code had the behaviour and lacked a bound. Probe before editing — the fix the
  report implied (re-wiring the nudge into Shelves/TV) would have changed nothing.
- **A "scene was stopped" detector must not trip on a slow frame.** The first threshold (500 ms)
  dropped a live Konami after one press under SwiftShader's ~400–600 ms frames — exactly what a
  low-end device's hitch does. Raised to 1.5 s, and a press whose whole window falls inside one
  frame is now skipped *silently*, so a hitch can never fire a burst of beeps. The pure harness
  pins both (a 600 ms-frame mutant of the old threshold goes red).
- **True-to-scale is invisible at room distance.** 2 mm of key travel and the Workshop's 0.13 rad
  D-pad rock could not be seen from the couch camera, so the beeps seemed to come from nowhere.
  Each Konami key now also lights with its press; the travel stays true.
- **Presentation jitter stays off the injected RNG.** The rumble's per-frame jitter uses
  `Math.random`, so the scheduler's draws (and the harness's control of them) never depend on
  frame rate.
- **The hint cannot become an unlock by construction.** The prop only NAMES sounds; the host routes
  `controllerPress:*`/`controllerRelease`/`konamiBeep` to the Workshop's own voices
  (`lobbyPlaySfx`) and nothing on that path calls `smHandleButton`. `visual-lobby` § 14 spies on
  `smHandleButton`/`smOpenGateway` and the buffer through the real host.

Harnesses: `verify-lounge-props` 1338 → 1368 (idle beats: every beat returns exactly to rest incl.
emissives, the Konami's order and D-pad rock direction, reduced motion, the stopped-scene drop, slow
frames); `visual-lobby` 69 → 76 (§ 7 now samples the window and bounds the wiggle; § 14 the hint).

**DD-42 — the lobby goes production: four layouts, the Lounge first, one router seam.
[25 Sep 2026, SW v231 — shipped]**
**What happened.** The sandbox (`wip/lobby-lab/` + `wip/premium/`) moved into `js/lounge/` (the 3D
room, `prm` → `lou`) and `js/lobby/` (layouts, router, doors, host) by a one-off scripted copy with a
collision check, and the harnesses were proved unmoved by reproducing their sandbox counts exactly
(1322 · 182 · 919 · 75 · 29) before anything else changed. Then: `lobbyShow()` became the only way
back into the lobby (`resetToLobby()`, both `secret-mode.js` returns, the idle nudge), `controller.js`
split its model from its renderer so the Lounge's controller wears the Workshop's painted atlas
without a second `buildBody`, the one ornament canvas moves between Original/Shelves/TV, and
`tools/visual-lobby.js` (69) drives it all over the real `index.html`. A mutation pass reverted each
seam site in turn; three turned the harness red at once, and the fourth (`sm-terminal-back`) stayed
**green** — its only check started from Original, where the reverted `showScreen('screen-lobby')`
lands anyway. A check from Shelves was added and the revert went red. Install +770 KB (12.24 MB). Plan:
`docs/superpowers/plans/2026-09-25-lobby-production-wiring.md`.

**Root causes of what the round found:**
- **Renames are scoped per file group, on purpose.** The TV attract screen prints "LITTLE SYLLY'S
  LOUNGE" and the jukebox has locals named `shellL`/`shellIn` — one global `LOUNGE`→`TV_STATE` or
  `shell`→`lobby` rule would have rewritten both. The collision check also false-flagged `lounge` and
  `tv` inside *path strings* (`tools/fixtures/lounge.html`); it now checks the text after the
  identifier rules and before the literal path rewrites.
- **The sandbox fetched both manifests with one `Promise.all`** — with both on the runtime cache, a
  cold offline first launch would have taken down the whole Lounge. Production fetches each alone;
  each failure path is a `visual-lobby` scenario.
- **`prm-hud.css` carried a global `html, body { overflow: hidden }`.** Shipped in the app's
  stylesheet, it would have stopped every game screen scrolling. It lives in the harness fixture now;
  `css/lobby.css` styles nothing global.
- **The sandbox router closed the Workshop and the stickerbook "to the Lounge"** because the sandbox
  only ever opened them there. Production opens the Workshop from four places: both now close to the
  layout they were opened from, and a new `home` action is what every outside exit dispatches.
- **TV's Play button was half-covered by the rail.** The rail's 46 px headroom (for breakout
  stickers) sits over the columns by design, and at 1280×800 it covered the lower half of "Start
  Serving": `elementFromPoint` at Play's centre returned the rail, identically in the sandbox. Fixed
  with `pointer-events: none` on the rail's own box, children re-enabled.
- **The dial guessed `<id>.png` for games not in the sticker manifest** — a 404 for `bld.png` on every
  Lounge load. It asks only for what the manifest lists; the label looks the same (white).
- **Dead controls in the sandbox layouts** — TV's 🏆/🔊 and its "You" button had no handlers. Each got
  one production answer (spec § 6.1): 🔊 → `openSoundOverlay()`, 🏆 removed, "You" opens the nickname
  popover.
- **The plan's host missed three lifecycle cases**: the phone's lean arrival room is now disposed
  after the handoff (spec § 4.3 — a WebGL context and the room's GPU memory on the weakest
  hardware), and TV's RAF/clock now stop on `lobbyLaunch` **and** on opening the Workshop from TV's
  ornament — both keep `view === 'tv'`, so "stop when another layout is presented" never fired. The
  Workshop case was found in the final review; `#tv-app.__tv` absent is the observable.

**Lessons:**
- **A browser harness must never sleep a fixed time for work that completes on rendered frames.**
  Software GL renders the room slowly; three checks (the telly door's push-in, the resize hand-off,
  a timestamp snapshot) passed or failed on machine load until they waited for the state instead.
- **A harness that drives something outside the router must also do what the router would.** The
  controller harness opens the Workshop directly; nothing stopped the Lounge behind it, and a full
  room in software GL starved the next page (37 s to load, never mounted). It now stops the room —
  and waits for a phone's beat to land before opening anything, because the beat's handoff correctly
  takes the screen back from a Workshop no player could have opened.
- **A mutant that stays green names a check that cannot see the difference.** When the seam's
  destination and the old hard-coded destination coincide (Original is `screen-lobby`), a test
  starting there passes either way — start from a layout the old code could never reach.
- **Measure a motion claim over the interval it is about.** "Nothing travels under reduced motion"
  is a claim about the *beat*; counting camera matrices from mount recorded the cut into the beat's
  still pose as a second matrix.
- **Baseline before anything moves, and say what was already red.** `verify-jec-loopback` (163/1) is
  red on committed code, untouched by this round. `visual-controller-stickers`' "paints BEFORE the
  sticker build" check was red at baseline too — a race reading in-page timestamps before the
  surface could land — and is fixed here.

**DD-41 — the room pass, item 15: the shelf dressing, books and toys on the top two boards.
[25 Sep 2026, `wip/premium/` — SANDBOX only, nothing shipped, no SW bump]**
The owner's brief: *"fill out the top two shelves … fun stuff, along with the books: a dinosaur toy, a
toy rocket, some animal figures. No people or characters, and nothing that is a light or a lamp. Easter
eggs can wait."* No reference render. The round-1 contents (ten grey-tinted book boxes and five trinket
slots, one of them a mini lamp) are gone.

*What happened.*

- **The middle bay (on `S.ys[1]`):** ten hardbacks with dressed spines, then one leaning onto the run.
  After them come a cream-and-coral **rocket** (three fins, a porthole turned to the room), a stack of
  three books lying flat with a **brontosaurus** on top, and three **shape blocks** (star, heart and
  moon, raised on the face and the top), one stacked on the other two.
- **The top bay (on `S.ys[2]`, 14.75 cm clear):** six short paperbacks, an **elephant** (pink inside
  its ears), a **desk globe** on a brass meridian, a **rubber duck**, a **penguin** and a **turtle**.
  The camera looks up into this bay, so everything in it stands 2.5–4.5 cm forward. At the back, the
  turtle hid behind the board's edge. At 1280 wide the bay is out of frame; at 1920 it peeks in along
  the top.
- **Two meshes, `shelfBooks` and `shelfToys`.** They use two new materials, `mats.shelfBooks` (matte)
  and `mats.shelfToys` (plastic, roughness .38). Both are vertex-coloured, so the only shader work is
  the room grade (`patchGrade`, prm-scene). The round-1 contents were ~25 unmerged meshes on plain
  materials that never took the grade.
- **The bay's darkness is the shelf's own function.** prm-room.js now publishes `S.cav` (the
  `shelfCav` that bakes the unit) and `S.topUnder` (the top bay's ceiling). Every dressing vertex is
  multiplied by `S.cav` at its placed position, so a book darkens toward the back and under the board
  above, exactly as the bay around it does. A 1.2 cm contact band where anything meets a board adds to
  that. The shelf's own contact box skips everything inside it, so nothing else could have done this.
- **Books are painted by face.** A `BoxGeometry` has its own four vertices per face, so the spine and
  boards take the cover colour and the edges take the pages, with no seam. The spine dressing is flat
  planes 0.4 mm proud: gilt bands, a pale title label, or a darker band. The spines carry no text: at
  the room's distance it is noise (DD-40).
- **Measured.**
  - `verify-prm-props` 1260 → **1322**. The shelf block was rewritten: every item sits inside its
    bay's width and the board's depth, on its board and under the one above; no two items on a board
    overlap; the brontosaurus stands on the stack; the bay term is baked; there are two meshes and no
    light; nothing is a pick target; a mount with no room (the review sheet) builds an empty shelf.
  - Triangles: 11.6k at first, trimmed to **8.3k** by cutting segment counts on 3–8 cm figures (eyes
    6×4, heads 12×9, the globe 24×16).
  - Held-state cost: see § 3.

*Root cause / the decisions worth keeping.*

**1. A bay's contents take the bay's shading from the bay's own function, not a second model.** Any
object placed inside a contact box's own volume is skipped by that box. The only way its contents
can darken the way the shelf does is to evaluate the same term per vertex. Publishing the function on
`S` keeps one definition. A tuned `shelfCav` moves the books with it.

**2. A turned object's box is not the object's box.** `Box3.applyMatrix4` on a part's bounding box
returns the box of a turned box, and at 30–35° that was up to 1.5 cm too wide. The harness then
flagged an elephant/globe overlap that wasn't there. The records now expand by each transformed
vertex (DD-25's lesson about `setFromObject`, the other way round).

**3. Cost: nothing measurable.** Held-state on the live scene (SwiftShader, 1280×720, reduced
motion so only the probe draws). The round-1 contents were rebuilt from `HEAD` beside the new
dressing, and new, old and none were interleaved ×12:

| Run | New vs old | New vs none |
| --- | --- | --- |
| 1 | −1.2% | −0.1% |
| 2 | +0.1% | +0.1% |

Both runs are noise. 8.3k triangles in two draw calls costs no more than ~2k triangles in ~25 did.

**4. The trinket seam (spec § 7.9) is dropped, not kept empty.** The owner deferred easter eggs, and
an `unlocked` flag over studio pieces that no longer exist would be a seam with nothing behind it.
When earned pieces come, they are items like these, added to the list. Recorded in
`docs/deferred-work.md`.

**DD-40 — the room pass, item 14: the TV stand's bay, the Play-Max 2000 and a floppy-disk box.
[25 Sep 2026, `wip/premium/` — SANDBOX only, nothing shipped, no SW bump]**
Item 14 of the room pass (plan `2026-09-22-premium-prop-quality.md` § 2). The owner gave two renders in
`wip/premium/lounge props/lounge/`: `play max.png` for the deck on the shelf (the round-5 deck,
polished) and `floppy disc box.png` for the floor of the bay. The disk box replaces the game-box
stack, which read as the bookshelf's books.

*What happened.*

- **Both renders were inventoried and sampled first (DD-38 § 5).** A scratch sampler read the mean
  colour at named points. The deck's features were placed on the render's measured fractions of the
  front face:
  - the panel spans 22–53% across and 22–81% up;
  - the slot sits at 80% up;
  - the LED and the five keys (43% up) are pulled in 1.5% so none sits on the 13 mm edge round.
- **The Play-Max** (`prmCubbyGeometry`, prm-room.js; sizes in `PRM_DECK`). The cream body's edge
  radius went from 8 to 13 mm. The tape window and reels are gone. In their place is a mauve label
  panel with "PLAY-MAX 2000" in cream, then a pale-gold slot, a green LED, and five pastel keys: play,
  rewind, fast forward, record and power. The keys' printed names are left off, because at the room's
  distance they are noise.
- **The disk box** (sizes in `PRM_DISKBOX`) is built in its own frame and turned −40°, so the room
  sees it three-quarter on, as the render does: its front end and one long side. It has:
  - a mint base, a raised back and a hinge knuckle;
  - a lid whose front slopes back 2.2 cm;
  - nine pastel disks (plain boxes, not pillows, since 3.3 mm edges need no rounding) leaning back 7°,
    each 1 mm taller than the one in front, with a label near the top;
  - a lilac star on the lid.
- **Text without a second mesh.** `mats.cubby` now has a 512×256 atlas, `tex.cubbyAtlas()`. It holds
  only text: the deck's name and eight disk labels. Every other vertex samples the atlas's white
  block, so the map changes nothing there. The panel's colour is written once, as the atlas's label
  ground in sRGB (`prmAtlas.panel`); the panel converts it to linear-as-given, so the decal and the
  panel meet without a seam. `lib.merge` keeps no UVs, so the builder carries them beside the colours.
- **The lid** is a second mesh, `cubbyLid`, in `mats.diskLid`. It is transparent, two-sided (r128
  draws a transparent DoubleSide back faces first), writes no depth and casts nothing. It takes the
  wood's contact boxes and the room grade, like the cubby.
- **Contact** is baked into the cubby's vertex colours: the last centimetre above the bay floor and
  the shelf top is darkened 35%.
- **Filler, after owner review.** The owner asked for something plain in the space right of the box,
  nothing that draws the eye. It is three pastel sticky-note pads stacked askew, 76 mm square and
  short, so they don't read as the bookshelf's books. A muted-yellow hex pencil lies in front of them.
  Both are in the same cubby mesh, about 450 more triangles. The pencil's first yellow, full strength,
  was the one thing in the bay that caught the eye, so it was muted and shortened.
- **Measured.** `verify-prm-props` 1251 → **1260**. The new checks: the deck stands on the shelf; the
  lid clears the shelf by 2 cm; the lid is see-through, writes no depth and casts nothing; only the
  name and the nine labels sample text; every label is under the lid; and the white texel sits well
  inside its block. Held-state on the live scene, interleaved ×12, against the old contents rebuilt
  beside it:

  | Run | New vs old | Lid alone |
  | --- | --- | --- |
  | 1 | +1.1% | +0.8% |
  | 2 | −0.0% | −0.4% |

  Both are noise. The bay went from 1.9k to 2.8k triangles, 300 of them the lid's.

*Root cause / the decisions worth keeping.*

**1. Text in a vertex-coloured mesh costs one atlas and a white block, not a second mesh.** Give the
material a map and point every non-decal vertex at a texel in a plain white block. That texel must sit
well inside the block: UVs that are constant across a face have zero derivatives, so they sample
level 0, but a texel near a region's edge would bleed at a mip. The harness pins it.

**2. A canvas colour and a vertex colour are the same colour only through the sRGB conversion.** Hex
here is linear-as-given, but a canvas is sRGB. Keep one value, in sRGB where the canvas needs it, and
convert it for the vertex (`new THREE.Color(hex).convertSRGBToLinear()`). Two literals would drift.

**3. A builder touches no DOM, so a font-dependent canvas is repainted by the host.** The atlas is
drawn before Fredoka may have loaded, and `verify-prm-props` forbids `document` in a builder. The
texture exposes `userData.prmRepaint`, and `prm-scene.js` calls it after `document.fonts.load`, then
wakes the loop. The first try put the `fonts.load` in the lib, and the harness's `forbid('document')`
caught it at once.

**4. The room's warm light moves a mauve toward brown.** The render's panel, `#836b67`, came out
brick-brown under the fill and grade. `#8c7682`, a step cooler, lands as the render's mauve. Judge
colour in the room, not against the reference's hex.

**DD-39 — the room pass, item 13: the ledge plant, to the owner's render.
[25 Sep 2026, `wip/premium/` — SANDBOX only, nothing shipped, no SW bump]**
Item 13 of the room pass (plan `2026-09-22-premium-prop-quality.md` § 2). The owner gave a render,
`wip/premium/lounge props/lounge/plant.png`.

*What happened.*

- **The render, inventoried and measured first (DD-38 § 5).** It was sampled with a scratch PNG
  decoder: the silhouette's extent per row, and the colours at named points. Against the pot
  (100 px = 8 cm):
  - The pot is 1.55× as tall as it is wide, including a mint rim of about 17% of its height, flush
    with the pot.
  - The plant is 3.26 pot widths tall.
  - The heads are 0.28 pot widths thick and about 0.8 long.
  - The leaves reach about 0.15 pot widths past the pot's edge.
  - The right head hooks out 0.35 pot widths past the pot.
- **The build** (`prmBuildPlant`, prm-room.js). There are four meshes:
  - `pot`: a lathe with a 9 mm rounded foot.
  - `soil`: a disc.
  - `plantGreen`: one merged mesh of the rim (a lathe lipped over and down the inside), six channelled
    strap leaves (three vertices across), three stems and two spike tips.
  - `cattails`: the three heads, merged.

  Stems, heads and spikes use one local `tube()`. It is a `TubeGeometry` whose rings are rescaled by
  `rad(t)`, so a radius of 0 at an end closes it with no cap. The seam's normals are averaged across
  the wrap. Each head is an ellipse at each end over four `|sin|` lumps, soft enough to read as
  segments, not beads. `userData.prmPlant` carries the counts the harness used to read from names.
- **Materials.** The colours follow the render (hex given linear, as everywhere here): butter pot
  `#d6c25e`, mint `#5f9a70`, lilac `#a482b4`, and a new `mats.soil`. The heads take `prmSheen`
  (0.7), because at ~15 px fuzz is an edge that brightens, not fibres.
- **Size and ledge.** It is built at the render's proportions and set **1.2×** in the room: at 1:1 it
  read smaller than in the lounge mockup. The ledge is now `lib.pillow` (6 mm round) in
  `mats.birchGrain`, with a flat white colour attribute. It is the shelf's finish, since nothing of
  it sits in a bay.
- **Measured.** `verify-prm-props` 1244 → **1251**: the plant is four meshes, the pot's and the
  plant's proportions, the hook, lilac, and the sheen. Held-state on the live scene against the old
  plant and box ledge rebuilt beside it, interleaved ×12, two runs:
  - new vs old: **−1.1% / +0.8%**;
  - new geometry on the old flat materials: −1.6% / +2.8%;
  - no-cast: −1.4% / −1.1%.

  All of it is noise. The new plant is 3.9k triangles, against the old 1.6k, in 5 draw calls against
  about 17.

*Root cause / the decisions worth keeping.*

**1. A harness that measures a part's box after the parent is re-scaled must update the world
matrices first.** `Box3.setFromObject(child)` updates the child's own matrix from the parent's
**stale** `matrixWorld`. The first run measured the pot unscaled and the plant scaled, which read
3.96 pot widths tall, not 3.3. `plant.updateMatrixWorld(true)` before measuring fixes it.

**2. A leaf that starts inside the pot's circle reads as a spike.** The first leaves rose inside the
rim before turning out. At 4× they were grass blades standing up. Starting them at the rim, heading
outward, gave the render's fan with the same reach.

**DD-38 — the room pass, item 12: the bookshelf unit, to the room's finish.
[25 Sep 2026, `wip/premium/` — SANDBOX only, nothing shipped, no SW bump]**
Item 12 of the room pass (plan `2026-09-22-premium-prop-quality.md` § 2). The owner split it: this
round is the **unit only**, no new objects on it. It should match the *quality*, not the design, of the
table, stand and window, and polish without drawing the eye (it sits to the right, out of focus). The
contents (`shelfContents`) are unchanged and moved to item 15. The owner also added items 13 (the ledge
plant) and 14 (the stand's bay contents).

*What happened.*

- **The wood.** The shelf is `mats.birchGrain`, the room's third `prmGrain` wood. The plain `birch`
  map now covers only the ledge, the frames and the mini-lamp. It is paler and finer than the bench's
  oak (`tex.grain('#d9c09c', '#b48e66', 512, 30)`), satin and vertex-coloured.
  - Its config is the oak's (std + vertexColors + PRM_GRAIN), so the two share one program. The
    harness pins that.
- **The geometry.** It is still eight named meshes, and `S` is unchanged, so the contents, the contact
  pass and the lamp still line up.
  - **Sides, boards and top** are `lib.pillow` with every edge rounded, and the top has a 9 mm
    bullnose. The sides are built lying along x and stood up by their mesh, as the bench's legs are,
    so the grain runs up them.
  - **The back** is one plain panel with the grain running vertically, built as a grid so its rows
    and columns fall where the bays' gradients turn. Its face is held at `backZ + 0.01`, where the lamp
    draws its pool.
  - **The base, to the owner's mockup.**
    - A new **base board**, `shelfBoardBase`, top at 10 cm (`prmShelf.baseY`), sits under the lamp's
      board, so the lamp is second from the bottom.
    - Under the base there is **no apron**. The sides stand as legs, and between them an **8 cm gap**
      runs to the floor, backed by the back panel. The mockup's proportions put its gap at 8–9 cm.
    - The gap is kept **open and empty on purpose**. `prmShelf.under` is its world-space box (as
      `B.open` is the bench's bay), and the harness holds it empty.
    - `S.ys` still names only the three boards the props use.
  - **The gap is shadowed like the mockup's near-black one.**
    - Its vertex colours bake deeper, to a floor of 0.16 against the bays' 0.3.
    - The floor under it gets one extra occluder in the floor bake only: the gap itself, lifted 40% of
      its height. That floor lies inside the shelf's own contact box, which skips it, so it had baked
      fully lit, and at the wide shot a lit floor between the legs read as another board.
  - **The back skirting now stops at the shelf's sides** (`skirtingBack` is two runs, one mesh). Its
    face is 1 cm proud of the shelf's back, so it had always run through the unit. The gap showed it
    as a white band.
- **Owner review, same day — four passes. Three of them were mine misreading one mockup.**
  1. The first build had an eight-plank V-groove back and a toe-kick set 3 cm back. The owner asked for
     a one-piece back ("too distracting"). They also asked to "take out the pole". That was no part: it
     was the back's last plank, a shade lighter than its neighbour between two grooves, reading as a
     post in the corner. The one-piece back removed it.
  2. I read the mockup's bottom as a low board on a flush apron.
  3. The owner said the black section is a gap, and I removed the bottom board entirely. That left a
     41 cm "gap" under the lamp's board, far too tall for the shadow they meant.
  4. The mockup shows a bottom board carrying books, the lamp on the board above it, and a short dark
     gap under the bottom board.
- **The bays are baked into the vertex colours.** Every inner face of an open shelf lies inside the
  shelf's own contact box, and the contact shade skips its own box (DD-30). The colours darken toward
  the back, under the board above, into the corners, and on the undersides.
- **`prmPillow`'s `mid` may now be `[x, y, z]`.** Before, one count applied to every axis, so a 1.3 m
  side paid the same rows across its 2 cm edge as along its length.
- **Measured.** `verify-prm-props` 1206 → **1244** (a new `bookshelf` section); the other five
  harnesses are green and unchanged. Held-state, on the live scene against the old six boxes rebuilt
  beside it, interleaved ×12: **+1.8%** at 4.5k triangles, as shipped (+2.7% at 5.6k, the eight-plank build).

*Root cause / the decisions worth keeping.*

**1. On this scene, triangles cost, and the probe can split the cost.** The first build was 13.3k
triangles and cost **+4.6–5.1%**. The probe had three arms:

| Arm | Cost |
| --- | --- |
| New geometry, *old flat material* | +3.4–3.7% |
| Shadow casting off | unchanged |
| The grain shader | under 2% |

Halving the rows gave +2.7%, and at 2× the two builds are indistinguishable. This is the opposite of
DD-33, where halving the curtains' triangles moved nothing: those faces are lit by fragments, this
shelf is cheap per fragment. **Probe the arms before deciding which to cut.** Per-part shown/hidden at
×6 was pure noise (one part read −5%). Whole-unit arms at ×12 were stable across runs.

**2. Vertex colours need rows only where a gradient turns.** The back grid takes a row every 6 cm,
plus one at each board face, where the under-board shadow is sharpest. That is enough; the extra rows
bought nothing visible.

**3. Variation that reads at 2× can read as an object at 1×.** Per-board tone steps were meant as
quiet texture. At the wide shot's distance, one lighter board between two dark grooves became a
vertical post. For a background piece, prefer the plainer surface.

**4. A test of "untinted" must name the face.** The first check said the top was outside the bays.
Its underside is the upper bay's ceiling, and dark at the back (0.30) is correct. The check now reads
the upper face (exactly 1) and the underside (dark) separately.

**5. Read a reference image as an inventory, and measure it, before building from a word in the
brief.** Three of the four review passes came from interpreting "the black section is the gap" instead
of reading the picture. The picture said it plainly:

- count the boards (four, and a gap);
- find which board the lamp stands on (the second);
- scale the gap against a bay (about a quarter of one).

That takes a minute, and it would have landed the base board on the first try.

**DD-37 — the room pass, item 11: the braided rug, recoloured.
[25 Sep 2026, `wip/premium/` — SANDBOX only, nothing shipped, no SW bump]**
Item 11 of the room pass (plan `2026-09-22-premium-prop-quality.md` § 2): "multi-ring, a `tex.braid`
parameter". The mockup's rug is many thin ropes in bands of rust, ochre and cream. Ours was 22 wide
rings alternating two browns, with a hatch, and in the wide shot it read as a bullseye.

*What happened.*

- **`tex.braid(o)`** is rewritten as a pixel field (putImageData only), 1024². There are 34 rings,
  each a flat three-strand braid seen from above: two columns of slanted lumps leaning opposite ways.
  Every lump is one strand, and one in three is the band's accent, which gives each rope a tweedy mix.
  - The lump count per ring is a whole number, so the braid closes at the atan2 seam.
  - Each ring starts at a random phase, so neighbouring rings' lumps never line up into spokes.
- **The bands** run from the outside in as `[dominant, accent, rings]`: rust, ochre, cream,
  terracotta, brown, a dusty rose-brown. The first pass had a plum band and full-strength shading. It
  was loud, and its purple competed with the lilac props. Now it has no purple.
- **Softened after owner review** ("the texture, material and pattern are good, just softer, so it's a
  background item"). There are two parameters, and neither changes the pattern:
  - `soft: 0.6` (0.45 first, then a tad softer at owner request) pulls every band colour 60% toward the palette's own mean, in linear light;
  - `relief: 0.32` makes the lump shade run 0.68–1.0 (it was 0.55–1.0), so the grooves are shallower.

  The mean is still gained to `#966b4c`, so softening moved nothing but contrast.
- **The bump is the same height field**, 2×2-averaged to 512² and linear. `tex.braidBump()` returns
  it, and both calls hit one memoised build.
- **The rope edge** (`rugEdge`) takes the outer ring's colour at the same gain, shaded ×0.62 for the
  roll. It is written as a LINEAR hex (`userData.prmEdge`) because r128 takes a material colour as
  linear.
- **Measured.** `verify-prm-props` 1200 → **1206** (a new `rug` section). The other five harnesses are
  unchanged and green. The build takes 163 ms under Node. Held-state, the new rug against a rebuild of
  the old one swapped on the live material, interleaved ×12: **+0.8%**, below the probe's resolution.

*Root cause / the decisions worth keeping.*

**1. Hold the tone by construction, not by tuning.** The grade (DD-26) was tuned on the old rug. Its
disc averaged about `#966b4c`. The new builder measures its own disc mean in linear light and gains
each channel to land on that mean, so the palette sets the hues and the mean is kept. The harness holds
the result within 3/255. This is DD-31's rule without the trial and error: re-picking the palette
cannot move the grade.

**2. Measure the disc, not the square.** The canvas corners fall outside the cylinder cap and are never
seen. A mean over the whole tile would weight colours the camera can't reach.

**3. The slippers still read.** They stand on the rug and read by contrast: cream plush and a dark sole.
The mid-value bands keep that contrast. Cream is the dominant colour in only 2 of every 16 rings, so
the slippers stay the palest thing on the rug. Checked by eye in the wide and portrait shots; no
harness asserts it.

**DD-36 — the room pass, item 10: the puppy slippers.
[25 Sep 2026, `wip/premium/` — SANDBOX only, nothing shipped, no SW bump]**
Item 10 of the room pass (plan `2026-09-22-premium-prop-quality.md` § 2): "slippers (a merged pair)".
The mockup's are bunny/cat, by the couch. The owner offered bears or dogs; **dogs**, because a bear's
round ears would repeat the koala mug's, and floppy ears are a silhouette nothing else in the room has.

*What happened.*

- **`prmBuildSlippers(lib, pose)`** (`prm-room.js`, room furniture like the mug: no pick id, no design
  role). Each slipper is ONE star-shaped surface over a superellipse footprint, wider at the ball than
  the heel. Round the outline, each profile runs across the sole, round a bead, up a welted sole band,
  and in over a top whose height is one function (`prmSlipperShape().top`):
  - a toe **bun**: an across root times an along root, so it falls to its rim on the whole outline and
    stands vertical there;
  - behind the **throat**, an open heel: a collar with a quarter-round edge, dropping to a footbed.
- **The dog:** bent floppy ears (a flattened teardrop at constant curvature, so it tips up, rolls over
  and hangs clear of the side), a muzzle sunk into the bun, a lolling tongue, a nose and eyes, and on
  one slipper a chocolate patch round the eye.
- **Vertex colours** carry the sole band, the lining (darker the deeper it sits), the contact at the
  foot and the patch. The pair merges, in room coordinates, into **two meshes**: the plush (one
  vertex-coloured material under the cushions' sheen) and the glossy nose and eyes. 17.6k tris.
- **Placed** (after owner review, § 5): a child's pair (the pose's `scale: 0.86`, 21.5 cm), stepped
  out of on the left couch. They sit side by side, heels level 12 mm off its base, toes pointing
  away into the room, turned toward the camera and splayed 7°.
- **Contact:** the floor bake takes **one box per slipper**, from the builder's record. The mesh is
  merged, so `cs.box` can't split it, and one box round a diagonal pair would shade the gap between
  them (DD-32 § 7c's lesson). Both materials take the room grade only.
- **Cost:** held-state, shown vs hidden, interleaved ×12 on the live scene: **+1.5%**, about the
  probe's resolution.
- **Harness:** `verify-prm-props` 1158 → **1200**, a new `slippers` section:
  - two meshes, on the rug and 3 cm inside its edge;
  - the footprints 1 cm apart, clear of every table leg by 1 cm;
  - stepped out of: each heel 4–30 mm off the couch base, toes within ~32° of square to it, the
    pair near parallel, the heels level, and the centres under 15 cm apart;
  - no ear over the other slipper, and the inner ears apart (by the builder's recorded ear ranges);
  - the sole's underside faces down;
  - a dark sole under a pale plush, a lining in the heel, ears that fall 3+ cm;
  - both noses and all four eyes **raycast-visible from the wide preset**;
  - the floor bake +2 boxes, and the rug measurably darker under each foot.

*Root cause / the decisions worth keeping.*

**1. The strip that shows is 20 cm wide, and the first pose missed it.** The left couch's base is at
x −0.42. The table top overhangs to −0.20. The front seat hides the floor past z ≈ 0.05. The
hand-placed first pose put the right slipper at x −0.23. Measured by raycast from the preset, only 37%
of its top and 70% of its face were visible: the table's front-left leg and overhang ate the rest. A
Node grid search over the pose found the pocket (x ≈ −0.27). **For anything placed near the frame's
occluders, measure what the preset sees; don't judge by a crop.** The harness now holds the face to
100% seen, so a later room change that buries it fails loudly.

**2. A fillet before a steep function is a crease.** The first top was a `(1−r²)^0.6` dome with a
radius-9 mm fillet arc joining it to the side. The dome is near-vertical exactly where the arc ends,
so the join creased: a zig-zag across the toe. It also left a flat shelf at the toe, because the
dome's ellipse reached its rim before the footprint's superellipse did. The fix removes the fillet and
lets the function round itself: a product of roots, each vertical at zero, zero on the whole outline.
The collar keeps an explicit quarter-round, also vertical where it meets the side.

**3. Sample where the function moves, per ray.** Even polar steps stepped the heel's drop *across*
rays: the throat is a line in z, and each ray met it between different samples, so its edge came out
jagged. Three changes fixed it:

- the first samples crowd quadratically onto the rim (the root's vertical tangent);
- the rest follow a density with a bump where *this* ray crosses the throat;
- the angles are spaced by arc length round the outline, since even angles about a forward centre
  left the far heel faceted.

**4. Vertex colours are authored like material colours here — dark.** r128 takes a hex as linear
everywhere in this scene: no conversion, `outputEncoding` sRGB. A `#5f4a42` sole rendered pale taupe,
the same way a material colour would. The palette (`PRM_SLIPPER_COL`) is authored to that rule, and a
comment by it says so.

**5. Place a thing the way it got there (owner review).** The first pass optimised for *seen*: toes to
the camera, one a step ahead. The owner's objection was about *story*, not visibility. You step out of
slippers sitting on a couch, so they land together, heels at its base, toes pointing away. The
staggered pair read as walked, not left. The re-search pinned both heels to the couch and searched
only turn, splay, spacing and depth.

- **Full size could not tell that story here.** 25 cm from the base at x −0.42 puts the toes under
  the table's overhang (−0.20). The poses that fitted sat in the frame's bottom corner, the near
  slipper against the edge.
- **So they are Little Sylly's,** at 0.86 scale (21.5 cm). This is honest to the room, and it lifted the
  pair into view whole.
- **The harness now holds the story, not just the pixels:** heels level at the couch, toes out, side by
  side.

**6. Three slips on the way, two of them the DD-35 kind.**

- **`const k` inside a `(p, k) =>` callback.** That is a SyntaxError at parse, and it took the whole
  sandbox shell down.
- **A trailing `//` comment on a line that carried on** with `g.translate(…); return g;`. The comment
  swallowed the return, so every ear was `undefined` and the room failed to build.
- **`node --check` passed the second.** It caught the first and missed this one, so "fixed" was
  reported twice. After any edit to `prm-room.js`, the smoke test is **building the room**
  (`verify-prm-props`), not parsing it.
- **Separately, identify parts by their recorded vertex ranges, not by colour.** The eye patch is
  painted in the ear's colour, and the colour-matched "ears" included it. That made the ear-clash check
  fail on a pair whose ears were 8 mm apart. The builder now records each ear's range
  (`userData.prmSlippers.ears`).

---

**DD-35 — the room pass, item 9: the window light, and a light that had been off since round 1.
[25 Sep 2026, `wip/premium/` — SANDBOX only, nothing shipped, no SW bump]**
Item 9 of the room pass (plan `2026-09-22-premium-prop-quality.md` § 2): "2–3 fake shafts and a glow
sprite", taken from the sun the garden paints (DD-34). Neither of the owner's renders has visible
shafts; both have the window as the room's brightest thing, bleeding warm light over its frame and
the curtains' edges. That glow is the bar, with the shafts kept faint.

*What happened.*

- **`windowBloom`**: a plane standing 20 cm in front of the wall, clear of the curtains. Each fragment
  follows its own view ray back to the glass plane, so the halo sits on the opening from any angle,
  whatever the plane's offset. It draws a warm rim (falling off over ~7 cm) across the casing, the
  curtains' edges and the wall, and a flare where the painted sun hides behind the frame. The flare is
  weighted by how far the sun's ray from this eye lands outside the opening: the wide shot's sun lands
  2.5 cm behind the near casing, so it flares there, as in the owner's render. The portrait's lands
  37 cm behind the far side and gets almost none.
- **`windowShafts`**: one box sheared along the light, from the opening to `R.sunPool`, the point the
  sun spot aims at. `prm-scene` now reads that pool rather than repeating the numbers. Each fragment
  integrates its ray through the box in 8 steps; three soft bands give the streaks, and nothing below
  the floor counts. There is no depth texture, so a shaft is haze in front of whatever it crosses,
  never cut by it, which is why it stays faint.
- **The measurements.** Held-state, shown vs hidden ×12, live scene: shafts **+2.2%**, bloom within
  the noise. Wide shot: saturation 0.378 → **0.416**, luma 129 → 134. The portrait doesn't see the
  window and is unchanged.
- **Harnesses.** `verify-prm-props` 1149 → **1158**: the new mesh names, plus the window section's
  new checks:
  - both pieces are additive with no depth write, no shadows and no pick id;
  - the box's winding holds;
  - the beam starts on the opening corner for corner, and its axis passes through the pool;
  - the bloom's sun is the garden's.

  `visual-prm` 27 → **29**: the light rig by name, and the sun aims at the pool.

*Root cause / the decisions worth keeping.*

**1. A comment ran over its own statement, and a light was off for seven rounds.** Round 1 (DD-26)
widened the window's glow point light. The edit put a `//` comment in the middle of the line:
`const glow = new THREE.PointLight(…);   // … this is that wash glow.name = …; scene.add(glow);`. The
light was built and never added, and nothing threw. No harness named a light: `visual-prm` counted
casters and banned `bulb`, so a missing light passed. Every round since, 2 through 8c, was tuned and
approved without it. It was found only because item 9 read the rig line by line.

- **Kept off, not revived.** Revived at its intended strength it costs +3.2%, the dearest option. It
  lifts the wide frame's luma to 141 against a mockup that measures 113, and it changes every approved
  look near the window. The bloom and the shafts do the job it was meant for, for ~2%. The line is
  gone, with a note in its place.
- `visual-prm` now holds the rig as an exact list of names, which is also the one place the rig is
  written down. A light added or lost fails there.

**2. A mirrored transform flips winding, and on a volume that swaps which faces draw.** The shaft box
is a unit cube baked through a matrix whose columns are the opening's width, its height and the
beam. Taken in the obvious order, its determinant is negative, so every triangle's winding flips. The
near faces cull and the far ones draw; with the depth test on, the beam is then cut wherever an
object stands inside it. The width now runs z1 → z0, and the harness checks that the determinant is
positive.

**3. Band a volume across the axis the camera looks along, and the bands merge.** The first shafts were
banded across the opening's width (z). The presets look roughly down −z, so every ray crossed all
three bands and they summed into one haze. Banded up the opening's height, each band is a sheet
containing z, which the camera sees edge-on as a streak.

Five plants, each caught by its own check, every file restored byte-clean:

- a mirrored box;
- shafts aimed off the pool;
- a second sun in the bloom;
- a light swallowed by a comment;
- the sun spot aimed off the pool.

*Open (owner):*

- **The wash.** The revived point light is one line if the owner wants the warmer, brighter corner
  (+3.2%).
- **Shaft strength.** The gain is `uK` 1.2. At 2 the streaks read boldly; at 0.6 they are gone.

**DD-34 — the room pass, round 8b: a garden through the window, and joinery to the polished bar.
[24 Sep 2026, `wip/premium/` — SANDBOX only, nothing shipped, no SW bump]**
Owner review of round 8: the glass "is not showing anything, it's just a solid grey/white". And the
new pieces, other than the curtains, sit below the room's polished bar: the frame, the rod, the sill
nose. The plant and ledge are deferred to a later pass. Asked "an image, or slightly out-of-focus
scenery?", Claude recommended procedural scenery (no install bytes, one style with the room). The
owner went ahead and supplied a Gemini render of the idea as a reference
(`wip/premium/lounge props/lounge/window.png`); it matched the proposal closely.

*What happened.*

- **The view is looked up by DIRECTION, not UV** (`prmWindowView` + `tex.garden`, prm-lib). The
  glass samples the texture by each view ray's azimuth off the wall's normal and the tangent of its
  elevation. The garden is therefore at infinity: its perspective holds from any angle, and it slides
  past the frame as the camera drifts. A decal would read as a sticker at the presets' 45–61°.
  `MeshBasicMaterial`, `toneMapped: false`: the painted colours are the daylight. One atan per
  fragment of glass.
- **The garden** is a 1024×512 pixel field in view space: a warm sky rising to blue, the sun low at
  a tree's edge, a hazy treeline, a hedge of clipped crowns, a lawn, then one separable blur (the
  lens), then bokeh stamped on top.
  - It is composed for what each preset actually sees, which is a narrow slice. The wide shot sees
    about 4° at −60° azimuth, and only elevations −0.19..+0.02. So the horizon sits low and the
    tree's trunk stands in that slice. The couch and portrait angles (−0.7..−0.9) get the sun's
    glow and the canopy's lit edge.
- **The joinery**, to the owner's render. Everything is swept (`prmRibbon`), turned (a lathe) or a
  rounded box (`prmPillow`):
  - a moulded **casing** 5.5 cm deep (arris, face, cove, round-over), standing in for the wall's
    thickness;
  - a **sash** with a bead, a step and rounded inner corners, running on under the casing and sill
    so no corner shows a gap;
  - an oak **sill** with a bullnose. It is the reveal's floor, and `sillTopY` rises 0.68 → 0.70, the
    glass's foot;
  - two brass **pulls**.
  - The **rod** is a 12 mm oak pole with a ball finial, two brackets (plate, arm, cradle) and a
    socket plate on the back wall at the corner. Twelve rings sit at the curtains' pleats.
  - The rod moves out 8 → 10.5 cm to clear the casing. The curtain's harness checks are all relative
    and held.
  - The **tie-backs** are oatmeal (was dusty rose) on brass wall hooks.
- **Measured.**
  - Held-state, shown vs hidden ×12, live scene: glass +0.7%, joinery +1.5%, all of 8b together
    **+1.4%**.
  - The texture builds in ~100–170 ms under Node, against the wallpaper's ~170.
  - `verify-prm-props` 1131 → **1149**: a new `window` section, plus the cloth-edge walk below.

*Root cause / the decisions worth keeping.*

**1. r128 uploads `cameraPosition` only to lit, shader or env-mapped materials.** The first build
read `normalize(worldPos − cameraPosition)` on a `MeshBasicMaterial`, and the uniform stayed
(0,0,0). Every ray looked out from the floor's centre, up into the sky: the window showed only blue.
There was no error, because the uniform is declared in the prefix either way. The ray now comes
from the view matrix: the view-space position turned back by the transpose of its rotation, which is
linear across the plane, so the varying is exact. The harness pins three things:

- the vertex formula;
- that nothing in the fragment reads `cameraPosition`;
- in JS, that the transposed rotation returns `worldPos − eye` for an arbitrary camera.

**2. The harness's canvas is a Proxy, so a per-byte ImageData write is a trap call.** The first
garden took 1.5 s under Node. Scalars, per-row and per-column precompute, bounded stamping and
hashed-once noise lattices brought it to ~450 ms. The last 350 ms was ~2M
`img.data[i] = v` writes, each through the shim's `set` trap. `tex.linen` already avoided this by
filling its own `Uint8ClampedArray` and calling `.set()` once. Every pixel-field builder should do
the same. It costs the browser nothing, and a slow harness is the one that stops being run.

**3. A vertex-in-box check is blind to a THIN solid.** Round 8's curtain check walked every cloth
vertex against each solid's Box3. Planting an 11 cm sill in round 8b passed: away from the tie the
cloth's rows are 4 cm apart, and the 2.8 cm board fit between two rows. The check now also walks
every vertical cloth edge, row to row, through each box (a ray's slab test). Both the 11 cm plant and
round 8's 28 cm one fail it; the clean build passes.

Seven plants in all, each firing its own check, every file restored byte-clean:

- the `cameraPosition` read;
- a view box too narrow for the wide shot;
- a view box too short for the portrait;
- the glass cut flush to the sash;
- a sill inside the casing (it also caught the casing pushed into the curtains);
- the socket plate through the back wall;
- the deeper sill.

**4. Round 8c (owner, 25 Sep): "it doesn't make sense for it to be that out of focus".** Both of the
owner's renders are soft only round the sun; the scenery itself stays legible. Two changes:

- **Resolution.** 8b painted 2.2 rad of azimuth, and each preset's glass got ~110 texels across it,
  so it was a blur however it was drawn. The painted range is now only what the presets can see
  (az −1.22..−0.52, el −0.32..0.34; the harness holds it to `PRM_PRESETS` with the parallax). That
  is ~2.5× the texels at the same 1024×512. Past the edge, the clamp repeats a column that is itself
  sky over hedge over lawn, so a stray camera sees plain bands, not streaks.
- **Structure, drawn back to front:**
  - clouds;
  - a treeline of separate crowns;
  - trees whose crown is an elliptical envelope filled with blobs (the first try, loose blobs, read
    as balloons);
  - leaf clumps from cellular noise at two sizes (one size tiled like fish scales), each lit on its
    sun side, with sky between them;
  - limbs, and a trunk lit on its sun side;
  - a hedge textured leaf by leaf with clipped, top-lit crowns;
  - a bed of flower clumps;
  - a lawn with perspective mowing stripes and the hedge's shadow.

  Then only a [1 2 1] softening, then the sun's glare (tabled over distance), then bokeh.
- **Cost:** the per-frame cost is unchanged: the same shader, the same texture size. The build is the
  price. It is ~350 ms in the headless browser against ~130 for 8b's version (the wallpaper there is
  ~250, and the whole library ~2–3 s). A 768×384 build is ~130 ms if that ever matters more than
  detail; nothing else changes.

*Open (owner):*

- **The plant and ledge**: deferred by the owner to a later pass.
- **Done in DD-35.** The view's brightness drives item 9 (window light): the sun is painted at azimuth −0.95,
  elevation 0.075, low, at the tree's edge. The fake shafts and the glow should come from there.
- The painted range covers the two presets and the parallax, not a free orbit. The harness checks
  it against `PRM_PRESETS`, so a new preset that looks past it fails there first.

**DD-33 — the room pass, round 8: the curtains, drawn open, and a sill they ran through.
[24 Sep 2026, `wip/premium/` — SANDBOX only, nothing shipped, no SW bump]**
Item 8 of the room pass (plan `2026-09-22-premium-prop-quality.md` § 2), to the lounge mockup: linen
weave, paw prints, tie-backs, a gathered pinch. The owner added a defect: the window's deep sill
"breaks physics" (the curtains went through it). The owner offered two fixes, a short sill with the
plant at its end or a ledge on the back wall and no sill, and left the choice to Claude. The owner
also left open, partly open or drawn to Claude, noting the linen is thin enough that light comes in
either way.

*What happened.*

- **Drawn OPEN, tied back, a half to each side**, as in the mockup. This **supersedes spec D5**
  (2026-09-19 re-block: "curtains drawn, a slit of light"), which recorded the owner's own words;
  the spec row now says so. The **light rig is unchanged**: the drawn curtain never cast either, so
  the sun already came "through" the cloth. The slit spot now reads as the beam through an open
  window.
- **The sill: option B.** The 28 cm birch sill is gone. The window has a painted frame (jambs, head,
  centre mullion) and a shallow sill nose, 4 cm proud and only as wide as the frame. The curtains
  hang in front of the nose. The cattails moved to a small birch **ledge on the back wall**
  (`R.ledgeTopY` 0.74), just past the back curtain's stack, where the mockup has them. Option A (a
  short sill with the plant at its end) was rejected because the back half's tie-back stacks exactly
  where that end would be, and the wide shot sees only that end.
- **The cloth** (`prm-room.js` `prmCurtainGeometry` / `prmTiebackGeometry`):
  - a grid over the FLAT cloth, so the UVs are metres of fabric and a fold never stretches a paw;
  - laid onto a span curve: 30 cm stacked on a rod, a swag down to a 7.5 cm bundle at the tie
    (0.95 m, the lower third of the glass), then a bell to the floor;
  - five folds, each as deep as the cloth must fold to fit the span, jittered so none is stamped;
  - at the tie, every point is squeezed inside the band's ellipse, and the cloth bellies out just
    above and below;
  - the tie-back is a tube along that ellipse, scaled in y into a 3.4 cm band.
- **The linen** (`tex.linen`, prm-lib): a 0.42 m pixel-field tile. It has row and column tones, and a
  slub now and then along each weft pair. 14 paw prints are scattered over it (a pad and four toes,
  each an ellipse), rejection-sampled with wrapped distances. The folds' cavity is baked into
  vertex colours, the cushions' method. The cloth takes `prmSheen` and the room grade
  (`patchGrade`), and is opaque now (it was 0.92 transparent).
- **Measured.**
  - `verify-prm-props` 1089 → **1131** (a new `curtains` section; the room section's sill/gap checks
    rewritten). The other five are unchanged and green.
  - Room: +6 meshes (two halves, two bands, the rod, the frame, the ledge; the old two halves went),
    16.5k triangles for the cloth and bands.

*Root cause / the decisions worth keeping.*

**1. Check what the cloth TOUCHES, vertex by vertex.** The old harness had "the curtains hang against
the left wall" and "the plant stands in front of the curtain" as bounding-box claims. Both passed
while every vertex below 0.68 m sat inside the sill. The new check walks every curtain and band
vertex against the Box3 of each solid nearby: the sill, the frame, the ledge, the rod, the plant,
the walls and the floor. Six plants, and each fails its own check. The first is the owner's defect,
the old 28 cm sill back, which fires exactly "no curtain vertex passes through the sill". The others:
no slope cap; the band squeezed past the cloth; the ledge slid into the stack; drawn to a slit; hung
flat on the wall. Every file restored byte-clean.

**2. A cloth sheen draws hairlines on steep folds.** The first build showed thin bright streaks down
every fold. Switching terms on the live material showed where they came from: sheen off, gone;
front faces only, still there. So the cause was the sheen, not back faces. `(1 − N·V)²` peaks
edge-on, and a sine fold as deep as its cloth allows has flanks at a slope of ~5, edge-on to the
camera. That is fine on a cushion, which is gently curved, but on a fold it made a hairline. The
fold depth is now capped at a slope of 3, and lifted under the band so the pinch stays a round
bundle. The harness holds the steepest flank away from the tie under 3.6.

**3. Cost tracked fragments, and the biggest term was a lookup that could only say "lit".**
Measured held-state, shown against hidden, interleaved ×12 on the live scene (SwiftShader, 1280×720):

- the first build cost **+3.7–4.6%**;
- halving the triangles (31k → 16.5k) moved it by noise, so the cost is not in the vertices;
- dropping **shadow receiving** brought it to **+2.7–2.9%**.

The sun is the room's one caster, it stands outside behind the cloth, and nothing that casts stands
between them (the walls don't). So the curtains' VSM lookup could only ever return "lit". Neither
the curtains nor the bands cast or receive now, and the harness pins both.

*Open (owner):*

- **Spec D5 reversed**: open, not drawn. It was the owner's word, so it is flagged, not assumed.
- **The glass is now seen**, and it is a flat warm-white plane (`mats.window`). It read fine behind
  a drawn curtain. Open, it is the obvious next gap, and it is item 9's ground (window light).
  → **Done in round 8b, DD-34.**
- The tie-back is a plain dusty-rose band. The mockup's is cream with a wall hook. The colour is
  a one-line change. → Oatmeal on brass hooks, DD-34.

**DD-32 — the room pass, round 7: the cushions. Sewn, handled, then settled against what they touch.
[24 Sep 2026, `wip/premium/` — SANDBOX only, nothing shipped, no SW bump]**
Item 7 of the room pass (plan `2026-09-22-premium-prop-quality.md` § 2), to the lounge mockup. The
owner's brief: the print matters less than shape and placement. Cushions should overlap, lean on the
sofa, and bend and crease. A round one belongs in the mix; the mockup's head pillow does not (no face).

*What happened.*

- **Where.** The camera decides. The portrait preset sees no couch at all. The wide one sees exactly
  two couch places, the corners where each side run's back meets its arm. Each corner gets a pair,
  set diagonally so the pair faces the camera:
  - left: a plum velvet **star** square, and a dusty-rose **round** in front of it, gathered to a
    covered button (*§ 7c moved the round to the near end of the left run, half out of frame, so the
    star now sits in its corner alone*);
  - right: a cream **ditsy print** square, and an ochre **ticking lumbar** slumped across its foot.

  The jukebox's sightline caps the left pair's height. A fifth cushion on the front run was tried
  and dropped: it would only peek in at the bottom edge, under the player's own seat, beside the
  controller.
- **How** (`prm-room.js` `prmCushionShape` / `prmCushionPose` / `prmCushionPress` / `prmBuildCushions`):
  - *Sewn.* Two faces meet at a rim, plump in the middle and pinched to nothing at the seam. The
    sides are drawn in, so the corners stand out as ears. A piping cord runs round the seam.
  - *Handled.* Creases fan in from each corner, and a fold sits where the cushion bends. The bend
    is a real spine curve (the inside bunches, the outside stretches), so the top slumps forward.
  - *Settled.* Each cushion is pressed against the seat, the back, the arm (bounded to the arm's
    height) and its neighbour. Whatever lies past a plane is eased back onto it with a soft max,
    and part of what it lost is pushed sideways: the bulge. A leaning cushion is slid onto the one
    behind, then both are pressed to a plane halfway through the bite, bounded to that spot. So
    the rear one is dented only where the front one leans.
- **Shade.**
  - The contact term comes from the same planes, baked into vertex colours along with the creases'
    cavity and a soft falloff toward the seam (the form). It costs nothing per frame and spends
    nothing from the 12-box budget.
  - ~~The fabric gains two boxes, one per cluster, with their floors lifted 2 cm so the seat under a
    cushion's foot is shaded: 9 → 11 of 12.~~ *Removed in § 7c: they were the owner's "indents".*
  - ~~The cushion material takes the six side-run boxes and the room grade.~~ *§ 7c: the room grade
    only (`patchGrade`); its contact is baked.*
- **One mesh, one atlas.** `tex.cushions()` is a 1024² pixel field in 2×2 cells. The margin holds
  the piping colour, and the piping's UVs point into it. The round's pleats are geometry, not print.
- **Measured.**
  - `verify-prm-props` 1025 → **1070** (a new `cushions` section). The other five are unchanged and green.
  - Room: +1 mesh, +22.5k triangles.
  - The frame: luma 124, saturation 0.380.

*Root cause / the decisions worth keeping.*

**1. Settle where they touch, not by their extremes.** The first settle measured this cushion's
rearmost point and the other's frontmost, then closed the distance. Those two can sit at different
places across the face, where the rear cushion has already curved away. Every pair was left 1.7 cm
apart, and nothing looked obviously wrong. The fix bins both cushions into 2 cm patches across the
line joining them, closes the gap in the nearest patch, and presses there. (Before that, the settle
also carried a sign error that parked the front cushion a bite *short* of the other. Harness checks
now measure the actual vertex-to-vertex distance.)

**2. A check that can't fail proves nothing.** The first plant (settle switched off) passed.
The hand placements already overlapped, and the contact press alone brings both to one plane. The
plant that proves the settle also opens an 8 cm gap first. A 90 cm star passed the door-sightline
check too, for the honest reason that nothing sits behind that corner. The plant that proves it
grows the round, which does stand in the jukebox's line. Eight plants in all. Each fails its own
check, and each file restores byte-clean.

**3. Look along the axis before fixing a "geometry bug".** From above, the round's pleats seemed to
converge 4 cm below its button. A vertex dump put the button exactly on the pleats' centre, and a
render straight down the axis showed them radiating from it. It was parallax in a deep dimple seen
steeply. The dimple was made shallower, and the pleats now start clear of the button's slope,
because at a steep angle they read as thin slivers.

**4. Cost, held state, interleaved ×12 on the live scene** (SwiftShader, 1280×720):

- **Cushions:** shown 945 against hidden 910 ms (+34 ms, ~3.7%), 22.5k triangles.
- **Fabric's two cluster boxes:** 874 against 864 ms (+9.5 ms, ~1%), toggled by the live material's
  box count, not a clone.
- **Drawing the cushions first** (`renderOrder` −1) gained nothing measurable. The cost is the
  cushions' own shading, not overdraw of the couch behind them, so it was not taken.
- ~~**Checked before keeping** (DD-31): the two fabric boxes shade 6% of the frame by ~15 levels,
  all of it round the cushions' feet. That is the "sitting in" cue, so they stay.~~ **Wrong, and
  corrected in § 7c.** I measured *how much* they changed, never *where*. "Round the cushions'
  feet" was an assumption. A per-box probe and an amplified difference image later showed a
  hard-edged rectangle on the back panel.

*Lesson.* **A prop that rests against things should be pressed against them, not placed near them.**
Hand-placed cushions float or clip at every contact. The furniture's own surfaces, with a soft max
and a bulge, settle them into it. The same surfaces then give the contact shade for free. (The
first build used flat planes, which was not enough: see 7b.)

*7b — the owner's review, same day.* The owner flagged three problems in the first build:

- the cushions read as paper, not fabric, especially at the edges;
- the round one's button looked wrong, and from above you couldn't tell puffed from sunk;
- the lumbar dug into the sofa.

Each had its own cause.

- **Paper.** The faces tapered to a knife edge at the seam, and a contrasting cord ran round that
  thin edge. A real cushion is stuffed to the seam. The fix:
  - the cross-section is now a square-root profile near the rim, so the faces turn vertical and meet
    in a round bead, with a gentle crown in the middle;
  - the piping is tone-on-tone and a little fuller;
  - the cotton cells carry a faint plain weave (the velvet does not; it has pile);
  - a cloth **sheen** (`prmSheen`, prm-lib) lifts the diffuse light a fragment already gets by
    (1 − N·V)², so a cushion in shadow stays in shadow. It hooks `aomap_fragment` like the bouclé's
    rim, and the contact shade chains on before it.
- **The round was wound INSIDE OUT.** Its polar grid's triangles gave the front face a −z normal, so
  the front was culled. What showed was the inside of its back face, with the button (wound correctly)
  on the true front. Hence "sucked in or puffed out?" and a button that looked detached. Nothing
  caught it until a check asked each cushion for its **volume**, which came out negative. Now fixed.
  The round also became a plump disc with a side band, a shallow wide dish, a larger button that sits
  proud, and pleats that start at the button.
- **The lumbar dug in because the planes were flat.** The couch's back swells by up to 3.5 cm in
  the middle of the panel, and a plane set at the corner let a cushion further along sink 1.7 cm into
  it.
  - Cushions now settle against the couch's REAL surfaces. `prmPillowFace` mirrors `prmPillow`'s
    rounded box and its puff, as a function of the point, and every press and the baked shade read it.
  - Just off a piece's footprint, the surface carries on from the rounded edge and falls away at
    45°, so a drape has something to follow.
  - Pressing only pushes out, so a cushion now **rests** (drops until it meets the seat), then
    **drapes**: its undersides close their gap to the seat below them, fully at the foot and fading
    out 12 cm up.
  - The settle slides level. Sliding along the tilted line between the centres lifted the front
    cushion off the seat.

*Cost after 7b*, held state on the live scene: cushions shown 928 against hidden 886 ms, +42 ms,
~4.7% (was ~3.7%). The sheen and the fuller geometry account for it: 24.2k triangles, was 22.5k. The
fabric's two cluster boxes are unchanged at ~1%, so the round is ~5.7% in all: the dearest item in
the room pass so far.

*Harness, 1070 → 1088.* Every seat and back check is now a raycast against the real mesh:

- each cushion touches the seat somewhere and sinks nowhere past 2.2 cm;
- no point digs past 1.2 cm into the back;
- no downward-facing underside near the foot hangs more than 1.5 cm over the seat;
- each keeps at least 80% of its posed volume, which also catches inside-out winding;
- the sheen survives the contact shade's chaining.

Plants:

- **Real firings.** Each of these checks fails on its own defect: no drape, the old winding, no sheen.
  A flat back plane *with the print moved into the back's swell* digs 2.0 cm and fails. The same
  move with the real surface passes.
- **Two plants that proved nothing.** A flat back plane at *today's* placement passes: the cushions
  no longer reach the swell. And "drape every low point, not just undersides" passes too. The
  see-through round I blamed on that drape was really the inside-out winding. The undersides-only
  rule stays because it is right (a front face carries no weight), but it is presentation, and no
  check pins it.
- **The lesson.** A check measuring a cushion's *lowest point* is not measuring its *contact*: a
  leaning cushion's lowest vertex can hang over a crease while it sits firmly elsewhere.

*7c — the owner's second review, same day.* The owner had two findings on the left pair, and a cost
concern. Each claim was reviewed against a render or a measurement before anything changed.

- **The "indents" were my cluster box.** The owner saw darkening beside the star, on the couch where
  no cushion is. With the cushions hidden AND the two cluster boxes off, the couch is clean. A
  per-box probe (each box's strength zeroed in turn, over the owner's region) put the left cluster
  box at −5.7 levels against −1.7 for the seat's own box. An amplified difference image showed a
  hard-edged rectangle on the back panel. One axis-aligned box round a diagonal pair is far bigger
  than the cushions, and a surface inside a box is never shaded by it. Hence the hard edge.
  **Removed both boxes:** the fabric is back to 9. The cushion material also dropped its six-box
  loop for a new grade-only patch (`prmContactShade().patchGrade`), because their contact is baked.
  - **The trap, recorded:** a "cushions hidden" render still showed the rectangle, because hiding a
    mesh does not remove the box it contributed to another material's shader. Isolate a contact
    term by switching the term, not the mesh.
- **The round's "trailing bit" was the sag, over-applied.** Pulling undersides onto the seat
  (fading out 12 cm up, 6 cm cap) turned a disc leaning back 54° into a skirt below its own front
  face. The sag is now 6 cm and 3 cm.
- **Cost, and where the round went.**
  - The owner guessed the round was most of the budget. By on-screen pixels it was not: star 70k,
    print 52k, round 46k, lumbar 29k of 1920×1080. Cost here tracks pixels.
  - Half-cropping the round would have saved ~0.3%, and at its first proposed spot it would have
    been seen *steeper*, not flatter (30° against 26°). I said so.
  - The owner's real intent, clarified: the round **lies flat on the seat**, face up, a cushion to
    sit on. It leans on nothing, so there is no angle to read wrong and nothing to overlap. It sits
    at the near end of the left run, across its seam with the front run, half out of frame, and
    13 cm thick, not 20: at 20 cm it read as a bun.
  - The left seat surface is now the higher of the left and front runs' cushions.
  - The controller check now casts 25 rays over the pad's whole top, not one at its centre. At an
    intermediate spot the round covered one of them, which the single ray had passed.
- **Checks re-thought, not loosened.** "Hangs in the air" became "hangs over a DROP": under any
  downward-facing point near the foot, the seat is never more than 1.5 cm below the cushion's
  lowest point. A round resting on its rim rises away from its lowest point by its own shape, and
  the old form flagged that. The lumbar-over-the-roll defect it exists for still fails it (planted:
  1.8 cm). A band of 8.5 cm (the seat cushions' 7 cm edge radius plus the gap) either side of the
  seam is exempt, since a cushion bridges that dip. "Lies flat" is new (planted: 28 cm tall when
  leaned). `verify-prm-props` 1088 → **1089**.
- **Cost now:** cushions shown 867 against hidden 839 ms, **+3.3% held-state, the whole of it**.
  There are no couch boxes left, and the cushions carry no box loop. That is below every earlier
  cushion figure (5.7% at 7b).

*Open (owner):*

- the palette (dusty-mauve star — toned down from plum at the owner's word, 24 Sep — dusty-rose round, cream ditsy print, ochre ticking);
- the right pair is cropped by the frame edge, deliberately, as the mockup crops its own;
- a throw blanket over an arm is the next step up in "lived-in", and it is not in the plan.

**DD-31 — the room pass, round 6: the wallpaper, a tile in metres, and a bump that nearly did nothing.
[24 Sep 2026, `wip/premium/` — SANDBOX only, nothing shipped, no SW bump]**
Item 6 of the room pass (plan `2026-09-22-premium-prop-quality.md` § 2): scattered stars, a paper-grain
bump, and softer rainbow arcs, to the lounge mockup (`lounge props/lounge/lounge.jpg`).

*What happened.*

- **The print.** `tex.wallpaper()` is rewritten as a pixel field (like `tex.grain`, written with
  `putImageData` only, so it still runs under the harness's no-readback canvas). Each tile holds:
  - two half-dropped rainbows of four thin bands with soft edges. Each band is a slightly different
    muted tint (terracotta, rose, apricot, clay), and the legs fade out into the paper;
  - eleven small, rounded five-point stars, rejection-sampled clear of the rainbows and of each other;
  - paper: a slow mottle and a fibre grain in the colour, and the same fibre in a linear bump tile
    (`userData.prmBump`), with the ink a hair proud.

  The old print was 256 px of four thick arcs, stacked in columns on a 6×4 repeat.
- **The tile is in METRES** (1.8 × 1.6 m, 1024 px). The walls' UVs are metres too (`metreUV` in
  `prm-room.js`), so `repeat` is 1/tile. This fixed a bug nobody had flagged: both walls shared a 6×4
  repeat over 0..1 UVs, so the 4 m side wall printed the pattern 30% narrower than the 5.6 m back
  wall. The side wall's u also carries on from the back wall's, so a rainbow can straddle the corner
  and stay whole.
- **The tone is held.** The room's grade and fill (DD-26) were tuned on the old paper, whose mean was
  `#f6cdaf`. The new tile comes out at `#f7ceb1` (3.4% of it is under ink), and the harness holds it
  within 3/255.
- **Measured.**
  - `verify-prm-props` 1008 → **1025** (a new `wallpaper` section). The other five are unchanged and green.
  - Build time: 175 ms under Node, down from 360 ms before the per-texel `pow` calls and hashes became
    tables; `tex.grain` at 512² is 75 ms.
  - Held-state (DD-28 method, 1280×720, 12 reps interleaved): new print with bump 842 ms, without bump
    844 ms, old print 854 ms. That is **no measurable cost**.

*Root cause / the decisions worth keeping.*

**1. A bump on a fill-lit wall does almost nothing.** At the first `bumpScale` (0.003, i.e. 3 mm of
relief) a full-frame readback, bump on against bump off, moved pixels by **under one level** on
average, and none by more than 4. The paper texture visible in the close-ups was entirely the colour
tile's fibre and mottle. The walls are lit mostly by the soft fill, not the sun (which lands on the
floor), so a small relief has no direct light to catch. At 0.012 it reads as embossed paper; at 0.03
it becomes plaster. It ships at **0.008**. Measure a bump's contribution before keeping it: an extra
texture that moves nothing is dead weight, and a screenshot can't show it isn't there.

**2. A cloned material is not the material.** The first cost probe compared the wall against a
`material.clone()` with the bump removed, and reported the bump at +4%. The pixel diff between the two
was 43–69 levels on 92% of the frame, which no 3 mm bump could produce. The clone had lost the room's
shader patch, so the probe was comparing two different pipelines. Toggle the property **on the live
material** (`needsUpdate`); three caches both programs, so switching back and forth is cheap. DD-30's
probes swapped between the scene's own materials and were not affected.

**3. A shared repeat on planes of different sizes is a silent squash.** Nothing checked that a metre
of wall was a metre of print. The harness now fits u and v against world position on both walls: one
unit per metre along and up, v = 0 at the floor, and equal u at the corner. Five plants were all
caught and the files restored byte-clean: the side wall back on 0..1 UVs, metre UVs not aligned to the
corner, the paper tone drifting, the wall losing its bump, and the star sampler running out of room.

**DD-30 — the room pass, round 5: an oak media unit, acorn pulls, and a deck no camera could see.
[24 Sep 2026, `wip/premium/` — SANDBOX only, nothing shipped, no SW bump]**
Item 5 of the room pass (plan `2026-09-22-premium-prop-quality.md` § 2): oak grain, and the mockup's
bunny drawer pull. The owner flagged that a bunny pull repeats the telly sitting on the same bench,
said the pull should draw no focus, and left the design to Claude. A first pass followed the lounge
mockup's soft single block. The owner called it dull and pointed at a real mid-century oak media unit
(`lounge props/lounge/LITVOTISOAK18_1__10933.webp`), with the open space's contents Claude's call.
This entry describes the revision.

*What happened.*

- **The unit, to the reference.** A thin crisp top (2.5 cm, 1.2 cm overhang, 5 mm edges), two
  full-height drawer fronts with a 3 mm reveal all round, an **open centre bay** (0.62 m) with a
  shelf, all on a rail frame whose tapered corner legs splay out and back, with plain legs under
  each side of the bay. The top stays at `benchTopY` 0.52.
- **Meshes:**
  - `bench`: the carcass (top, two drawer carcasses, and the bay's floor, back and shelf), one merge;
  - `benchDrawerL`/`R`;
  - `benchBase`: rails and eight legs, lifted so its lowest point is exactly the floor;
  - `benchKnobL`/`R`;
  - `cubby`.

  The contact pass treats `bench` and `benchBase` as one occluder.
- **Oak.** `mats.oak` is a second `prmGrain` (DD-28's machinery, unchanged): a warm light oak
  (mean `#d6b085`), satin rather than lacquered, and still well clear of the table's darker honey.
  **34 rings** across a 0.45 m tile. With that many rings the fixed warp moves each one only a
  little, so the figure runs long and nearly straight, as flatsawn oak's does. The first pass's 12
  and then 16 rings read as bold wavy bands, which was half of what made it dull. The tile runs
  **2 m along the grain**, so the 1.9 m front never shows its cathedral twice. The left front is
  built off a shifted origin, so the two fronts show different boards.
- **The bay: the cassette deck, back.** Spec § 6's deck ("says cassette era") sits on the shelf:
  a cream body, a smoked tape window with two reels, keys and a level meter. Under it is a stack of
  three board-game boxes in muted rose, sage and straw (this is a game suite's lounge). Both are
  one mesh (`cubby`) in vertex colours.
- **The pull: a brass acorn** (`prmAcornGeometry`), oak's own seed and not another animal. The room
  already has the bunny telly, the cat jukebox and the koala mug. At the wide camera it is a knob; up
  close it is an acorn: a lathe nut, a cap rippled into scale rings, a stub stem, on a neck and a
  backplate. One mesh, with the polished nut and bronze cap in vertex colours. `lib.merge` keeps
  only position and normal, so colours are written after the merge by lathe profile index.
- **Measured.**
  - `verify-prm-props` 973 → **1008** (a new `bench` section). The other five are unchanged and green.
  - The stand is 7 meshes and 11.3k tris (the first cut was 18.9k; the base's flat rails and linear
    tapers carried grid lines they didn't need).
  - Held-state (DD-28 method, 1280×720): the stand 812–825 ms, the same geometry in flat birch
    798–806 ms, stand hidden 731–740 ms. The grain is ~1.6%. The stand costs ~80 ms against the old
    solid block's ~50: the extra ~4% is new visible surface (the bay, the shelf, the deck and games,
    and the legs), not a new shader or caster.

*Root cause / the decisions worth keeping.*

**1. The contact shade can't darken the inside of its own occluder.** `prmContact()` skips any point
where the distance to a box is ~0, so a point *inside* the bench's box gets nothing. That is correct
for a solid box and wrong for an open bay: the first render lit the bay as brightly as the fronts.
The bay's darkness is baked into the carcass's **vertex colours** instead (1 at the mouth, 0.32 at
the back), and the bay's contents take the same function. This forces `mats.oak` to be
`vertexColors`, so **every** oak geometry must carry a colour attribute. A missing one reads as
WebGL's default (0,0,0), which is black. The harness asserts both.

**2. Geometry nobody can see still costs.** The re-block's solid `moulded` body had closed spec
§ 6's shelf, and the deck (a cream box and four keys) sat entirely inside it, 5 mm behind the face:
five draw calls, shadow-map work, no pixel. Nothing flagged it because every name the harness
checked still existed. The `bench` section now asserts that **any mesh within the carcass's box lies
within the open bay**, which is a claim about visibility, not names. A deck planted in a drawer
carcass fails it.

**3. A self-referential check proves nothing.** In the first pass, a plinth assertion measured the
recess against the very constant that set it, so a flush plinth agreed with itself and passed.
Planting caught it. The revision's four plants were all caught first time: a base with no colour
attribute, the cavity not baked, the base 1 cm off the floor, and the deck pushed into a carcass.

*Open for the owner:* whether the acorn stays or the fronts go handle-less like the reference.

**DD-29 — the room pass, round 4: a koala mug, and steam that never asks for a frame.
[24 Sep 2026, `wip/premium/` — SANDBOX only, nothing shipped, no SW bump]**
Item 4 of the room pass (plan `2026-09-22-premium-prop-quality.md` § 2), plus the owner's answer (d):
a tiny steam animation, if it's cheap. The plan said cat ears. The owner asked for a different cute
animal instead (panda or koala, Claude's pick), because the jukebox is already the cat.

*What happened.*

- **Koala, not panda.** The ears *are* the animal: big, round and fluffy, a silhouette nothing else
  has, so it reads at the wide shot's ~40 px, where the face is a few pixels. A panda needs its
  black patches, which would be the darkest thing in the room and pull the eye off the props.
  Koala is also the Australian one. The glaze is a cool lilac-grey (`#827e96`), a cousin of the
  props' lavender, set against the honey table.
- **Where.** On the table's front-left corner (x 0.04, z 0.21), the one free patch of the hero zone.
  It sits in front of the binder, whose cover opens toward −x (away from the mug), and left of the
  phone. The face looks at the couch and the handle stands in profile on the right, as in the mockup.
- **What.** `prmBuildMug` in `prm-room.js`, beside the plant. It is furniture: no pick id, no design
  role. Five meshes:
  - `mug`: the lathe body (foot ring, a barrel belly ~3 mm past the rim, a rolled lip, inner wall
    and floor), a flattened-tube D handle, and both ears, merged into one glaze;
  - `mugFace`: the nose and eyes;
  - `mugBlush`: the inner ears and cheeks;
  - `mugCoffee`: a disc with a vertex-colour crema;
  - `mugSteam`.

  An ear is a flattened sphere whose rim is scalloped (`1 + 0.06·cos 9φ`), which is the fluff. It
  sits on the lip at ±54°, turned half way back toward the front and splayed out. ~11.7k tris.
- **Steam.** A cylindrical billboard (width faces the eye, up stays world up, so a push-in that
  swings round the table never sees it edge-on). Two swaying, widening, breaking wisps are drawn in
  its fragment shader: no texture, no depth write, no shadow.
- **Contact.** The mug is an occluder on the table (the wood's box list is 10 of 12). Its own four
  materials take the room grade and **one** tight box, the table top with a 3.5 cm reach.
- **Measured.** `verify-prm-props` 928 → **973** (a new `mug` section, plus clearance in
  `contracts`). The other five are unchanged and green.

*Root cause / the decisions worth keeping.*

**1. New motion can ride the frames that are already coming.** The scene renders on demand, and
the telly's attract wakes it at 10 fps (the dial's drift keeps it running anyway). The steam's
tick (`room.userData.prmTick`, called once per frame by `prm-scene.js`) sets a time uniform and
**returns nothing**. It never keeps the loop alive, so it adds shader work but no frames. If it
asked for frames, the whole room would redraw at 60 fps for the sake of a wisp. The harness pins
the `undefined` return. Nothing to clear on teardown either: no timer and no RAF of its own, so
§ Timer Lifecycle has nothing to add.

**2. Reduced motion freezes the pose; it doesn't remove the steam.** Under reduced motion the tick
holds `uTime` at `PRM_MUG_STILL_T` (1.7, a pose where both wisps are up and apart). Nothing
travels and nothing is lost, the same rule as `combReducedMotion`.

**3. The first steam was invisible, not broken.** At 0.34 opacity, white on the peach wall and the
pale binder, it rendered correctly and could not be seen. Painting it magenta found it straight
away, exactly where it should be. It is now 0.62. **Before debugging a transparent effect, give it
a colour that cannot blend in.**

**4. The first glaze read as a white mug.** A mid lilac-grey (`#aaa5b8`) went near-white under the
warm key and the room grade. It took two steps darker to read as koala grey.

**5. Cost, held state, interleaved ×6 in one page** (SwiftShader, 1280×720, ms/frame, reps 1–2
cold and dropped):

| State | ms/frame |
| ----- | -------- |
| mug + steam | 745–759 |
| mug, steam hidden | 748–754 |
| mug hidden | 742–763 |

All three overlap: the mug and its steam are below what this probe can resolve (~1–2%). The
table's grain was ~4%. The steam covers ~40×60 px of the wide shot, so its two-wisp shader is a
rounding error next to the room's full-screen passes.

*Lesson.* **A motion that only decorates must never be what draws a frame.** Tie it to the frame
clock and return nothing. Then its cost is its shader alone, and "cheap" can be proven rather than
hoped for. Plants, each caught and restored byte-clean:

- the inner wall's profile reversed;
- the tick returning `true`;
- the steam running under reduced motion;
- the mug parked by the phone (caught at rest and open);
- the mug left out of the contact pass;
- the coffee 1 mm short of the wall.

*Open (owner):* the glaze tone (grey-lilac, or the mockup's pink?), and whether the wide-shot steam
wants to be stronger. It is deliberately faint.

**DD-28 — the room pass, round 3: the coffee table. Grain in object space, a lacquer coat, and
the owner's honey kept.
[24 Sep 2026, `wip/premium/` — SANDBOX only, nothing shipped, no SW bump]**
Item 3 of the room pass (plan `2026-09-22-premium-prop-quality.md` § 2). The plan said "walnut".
The owner overruled it at the start of the round: the table *renders* honey-orange, and that should
stay, because the mockup's woods all run together and honey keeps the table apart from the bench's
pale oak. So the round is craft, not colour. The old table was a 4 cm extruded slab with stripes
too faint to read, on round pencil legs.

*What happened.*

- **Wood.** `prm-lib` `prmGrain` patches `mats.walnut` (the key keeps its round-1 name), now a
  `MeshPhysicalMaterial` with clearcoat 0.6. It samples `tex.grain` in **object space**, the
  bouclé's method. The tile is 512 px covering 1.2 m along the grain and 0.6 m across it. It is a
  pixel field: 17 rings per tile, gentle low-frequency drift, one cathedral, pores, fibre streaks.
  One sample drives the albedo (sRGB, decoded in the shader), a slight relief (latewood 0.4 mm low)
  and roughness (darker than the mean reads rougher).
- **Shape.** The top is a 5 cm `lib.pillow` with every edge rounded (r 18 mm). It is merged with a
  four-rail apron, so it stays one `tableTop` mesh. The legs are rounded-square, 48 mm under the top
  and tapering to 30 mm at the floor. Names unchanged; 69 meshes; room 49k → 56k tris.
- **Measured.** Table-top mean in the room shot: RGB 201/136/72 → **203/140/75** (held). Its
  variation, sd, went from ~5 to ~12–19 (the grain now reads). `verify-prm-props` 905 → **928** (a
  new `grain` section). `visual-prm` 27, with its frame-loop check made time-robust (below). The
  other four are unchanged and green.

*Root cause / the decisions worth keeping.*

**1. One grain axis, and the parts are built to it.** Triplanar wood needs a direction, which
bouclé never did. The convention is that **grain runs along object x**: the top face samples (x,z),
the long edges (x,y), the ends (z,y). The top and long rails already lie that way, and the end rails'
outer faces sample (z,y), so their grain runs along them too. A leg is *built lying along x* and
stood up by its mesh's rotation, so no per-material axis or second material is needed. The harness
checks each leg is long along object x and tall in the world.

**2. Solve the colour; don't eyeball it.** The owner asked for the tone to stay, so the texture
solves its earlywood colour so the tile's **linear** mean lands on a target, and reports what it
actually quantised to (`userData.prmMean`, pinned within 2/255). The first target was the old flat
wood's mean, but the lacquer's neutral highlight lifted blue by ~11/255 in the room shot. The
default is set a touch warmer to compensate, and the shot now lands within 3/255.

**3. The first grain read as sand ripples.** 26 rings, warp terms up to 23 cycles per tile, and
0.0012 m of relief made every line a wiggling ridge. What fixed it: long lines, integer frequencies
≤ 2, one Gaussian-ridge cathedral (it fades before the tile's v wrap), latewood weight 0.62 → 0.4,
and a third of the relief. **Polished wood is nearly flat**; the grain is mostly colour.

**4. The clearcoat is lacquer for free.** r128 lights the clearcoat lobe with `geometryNormal`,
captured before `normal_fragment_maps`. The coat stays glassy over grain that is bumped underneath,
which is how lacquer on wood actually looks.

**5. Cost, held state, interleaved ×4, SwiftShader 1280×720, ms/frame** (reps 1–2 are cold and
dropped):

| State | ms/frame |
| ----- | -------- |
| grain + lacquer, 4× anisotropic filtering | 748–800 |
| grain + lacquer, no anisotropic filtering | 724–808 |
| grain, no clearcoat | 753–790 |
| same geometry, plain contact-shaded standard | 707–754 |
| table hidden | 671–714 |

The grain's 9 fetches cost ~25–30 ms (~4%). The clearcoat is lost in the noise. Anisotropic
filtering was **dropped**: the room shot matched to 0.1/255 with it on or off (the camera looks down
too steeply for it to matter). It measured ~20 ms more in software, though free on a real GPU.

**6. A harness timing window has to outlast a frame.** `visual-prm`'s "the loop keeps rendering"
waited a fixed 600 ms. A SwiftShader frame is now ~770 ms, so a live loop could fail it. It now waits
for the counter to move, up to 5 s, and a stopped loop still fails. It is the same class as the
screenshot-timeout note at the top of that file: **a fixed wait measures the host.**

*Lesson.* **A texture that has to hold a colour should report the colour it made.** Under Node the
canvas can't be read back (the mock refuses `getImageData`), but the generator owns its own pixel
buffer, so it can publish the mean and the harness can hold it. Plants, each caught and restored
byte-clean:

- the grain replacing the hook (caught only by the **reverse-order** chain check, which was added
  for exactly this; the forward order is guarded by DD-27's contact chain);
- the earlywood not solved;
- a UV map kept;
- legs built standing (grain across them);
- legs untapered.

*Open:* none for the owner. The apron and legs could take a darker end-grain tone on the
x-facing caps; not worth a second tile at this camera.

**DD-27 — the room pass, round 2: the couch. Bouclé sampled triplanar, and upholstery instead
of moulding.
[24 Sep 2026, `wip/premium/` — SANDBOX only, nothing shipped, no SW bump]**
Item 2 of the room pass (plan `2026-09-22-premium-prop-quality.md` § 2), judged against the couch
in `lounge props/lounge/lounge.jpg`. The mockup has ~1 cm loops with dark gaps, rolled arms, crowned
seat cushions, a tight back with a rolled top, and piping. Ours had eight moulded slabs, and its
bump read as sand that streaked sideways on the backs' faces.

*What happened.*

- **Fabric.** `prm-lib` `prmBoucle` patches `mats.fabric`. It samples a new 256 px loop tile
  (`tex.boucle`) triplanar in **object space**, at `PRM_BOUCLE_TILE` 7.8 tiles/m. The one height
  field drives three things: relief (r128's `perturbNormalArb`, copied under its own name), cavity
  (darker colour in the gaps, so the loops still read in fill light), and a warm fresnel **rim**
  weighted toward the window. The UV `bumpMap` is gone.
- **Shape.** `lib.pillow` is a rounded box with every edge rounded and faces that swell.
  `lib.merge` joins parts; `lib.seam` is a round cord on the 45° line of a pillow's edge, a
  `prmRibbon` with a circular profile. Each seat run is now a base on a recessed plinth with
  separate crowned cushions (3 / 1 / 1). The backs are one stuffed panel each, floor to rolled top.
  The arms are fat rolls wide enough to cap the back's thickness. Piping runs round the cushion
  tops and the arms' ends.
- **Kept.** All eight names stay (`prmContactPass`'s box list is unchanged), plus one
  `couchPiping` mesh. The couch is 9 meshes; the room is 69 meshes (was 68) and 49k tris (was 18k).
- **Measured.** Saturation 0.34 → 0.357, luma 126. `verify-prm-props` 866 → **905** (a new
  `upholstery` section). The other five are unchanged and green.

*Root cause / the decisions worth keeping.*

**1. A UV bump on an extruded part is wrong on every face that isn't a cap.** ExtrudeGeometry's
side walls map metres along one axis and the extrusion along the other, so the loops smeared into
streaks. Triplanar has no UVs to smear. The derivatives use the same forward difference as r128's
`dHdxy_fwd`: the height at p, p + dFdx(p) and p + dFdy(p), three planes each, so 9 fetches.
`height` is the loops' depth in metres, which is what `bumpScale` means in that function.

**2. Two `onBeforeCompile` patches must chain, and the harness now says so.** The contact shade's
`inject` used to *assign* `onBeforeCompile`. Patching the fabric after the bouclé would have
dropped the bouclé silently: no error, just a plain couch. `inject` now calls the previous hook
first. `PRM_BOUCLE` is a define because r128 keys programs on `onBeforeCompile.toString()` plus
defines, and the chained arrow's text is the same for every contact-shaded material.

**3. `moulded` can't make a cushion.** An extrusion rounds its profile's corners but only bevels
its two ends, so whichever way a cushion is extruded, one visible edge comes out square. The pillow
crowds a BoxGeometry grid into its rounded bands and pushes each vertex out from its clamped core
point, so no triangles are spent on the flats. The harness pins that every vertex lies on the
rounded box's SDF.

**4. A crowned cushion must still top out at `seatTopY`.** The puff adds height at the centre, and
that is exactly where the controller sits. `topAt()` subtracts the puff. A raycast under
`PRM_PLACES.controller` pins the cushion there to within 12 mm of seat height.

**5. Test the seam's winding; don't reason about it.** Mapping the ribbon's (u, v, height) onto a
face's axes is a rotation for some faces and a mirror for others. The guess was that `+y` would
flip; the plant shows **±x and ±z** flip. The guard checks the profile's top ring's normal, and the
harness checks each face's signed volume.

**6. Merge per named piece.** Thirty parts as meshes would have been thirty draw calls. Merged into
their named pieces, they keep every name the contact pass and the harness key on. The fabric's box
list is still 9 of the 12 cap. The backs carry no seam, because a closed loop round a panel drew
long vertical lines down it.

**7. Cost, held state, interleaved ×4 in one page** (SwiftShader, 1280×720, ms/frame):

| State | ms/frame |
| ----- | -------- |
| bouclé | 718–752 |
| the same geometry, contact-shade-only fabric | 692–716 |
| couch hidden | 607–625 |

The bouclé shader costs ~20 ms (~3%), in line with DD-26's contact loop. The rim, A/B'd, is a soft
warm edge on the arm rolls and the back's top: subtle, and kept at 0.4.

*Lesson.* **A lib patch that owns a hook must compose.** The failure mode is silence, so the harness
compiles both patches into one program and checks that both survive. Plants: `inject` replacing
the hook, no seam winding guard, a UV `bumpMap` kept, no crown compensation, squared pillow edges.
Each fails its check, and each restores green.

*Open (owner):* the arms sit at `armTopY` 0.58, only 11 cm above the seat; the mockup's stand
higher (no prop reads `armTopY`, so it is free to move). The back is tight, like the mockup's;
loose back cushions are the other option. The couch's cushions (star, patterned; no face) are
item 7.

**DD-26 — the room pass, round 1: light and grade. "Flat" was colour, not brightness.
[24 Sep 2026, `wip/premium/` — SANDBOX only, nothing shipped, no SW bump]**
First round of the room's environment pass (plan `2026-09-22-premium-prop-quality.md` § 2, "The
room pass"), against the owner's Gemini render `wip/premium/lounge props/lounge/lounge.jpg`. Owner
lifted re-block spec D7 ("darker, not dark") and the rule that only the player's colours saturate.

*What happened.* Measured the mockup on the same 8×5 luma grid the harness uses before touching
anything: **mean 113 against our 121**, so the mockup is not brighter. Its HSL saturation is
**0.47 against our 0.23**, and every big surface in our room (couch, table, bench, shelf, walls)
shared one pale value. Round 1 therefore changed colour and contrast, not exposure alone:

- the fill went warm and to 0.2 (it was cool and 0.035, so anything the sun missed was brown-black);
- exposure went 0.56 → 0.66, and the window glow widened (it never lit: a comment swallowed it, DD-35);
- the big surfaces separate by material: a mauve-taupe couch, a new `walnut` table against the
  pale-oak bench, a peach wall, a rust-brown rug;
- the room's materials only get a post-tone-map saturation lift (`uPrmSat` 1.22). The props are
  the player's colours and are never graded;
- contact shade, `prm-lib` `prmContactShade`, wired by `prm-scene` `prmContactPass`. It is one
  occlusion function over axis-aligned boxes. The floor, rug and walls are **baked** once at mount
  into small DataTextures (192×160) read by world position. The couch and wood evaluate ≤ 12 boxes
  in-shader. It adds no light, no draw call and no shadow caster;
- the sun moved from PCFSoft to VSM.

Saturation **0.23 → 0.34**, luma 128 (72–167). Harnesses: `verify-prm-props` 840 → **866** (a
`contact-shade` section, two plants caught), `visual-prm` 26 → **27** (a saturation floor ≥ 0.30),
`visual-shell` 117 (one cap widened, § 5). The other three are unchanged.

*Root cause / the decisions worth keeping.*

**1. Measure the reference on your own instrument before deciding what "flat" means.** The
assessment's first guess was "brighter", and the first sweep followed it (fill + exposure → mean
170). The frame went pastel and the patch range *compressed*. `prmDebug.saturation()` now sits
beside `lumaGrid`, and the mockup's two numbers are the bar.

**2. r128's PCFSoft never reads `shadow.radius` for a spot light.** The sun's `radius = 3` had been
a no-op since the lounge was built (checked in the vendored shader chunk). VSM honours it. Held-state
render timing (SwiftShader, 1280×720): VSM and PCFSoft cost the **same** as built (725 vs 723 ms). VSM's
blur is dearer, its per-pixel lookup cheaper. r128 does not reliably change shadow type at runtime,
so compare the two across page loads, never by flipping `shadowMap.type` live.

**3. A box that "never shades itself" also never shades what it rests ON.** A prop's AABB bottom
face is exactly the surface it sits on, so the first render showed a pale footprint inside a dark
halo under every prop. Occluders now carry `lift` (4 mm). Rounding a flat prop's box in **3D** then
reached below the seat and made pale ovals, so rounding is in **plan only** (`k`, x/z), with the
height kept exact. Both are pinned in `verify-prm-props` § contact-shade.

**4. Bake what is big, evaluate what is small.** A full-screen plane running a 25-box loop is
roughly 40% of a low-end phone GPU's budget at 60 fps. The same plane reading a baked texture costs
one fetch. The in-shader loop is kept for the furniture, where a crease needs per-pixel detail, and
it costs about 25–45 ms of a ~700 ms SwiftShader frame (4–6%). The bake is ~31k texels × ~30 boxes,
once.

**5. Cold start confounds any A/B in a fresh browser, so interleave the modes and repeat.** The
first comparison of the walk-back beat blamed "contact shade + VSM together" (5.4 s against 2.2 s).
Repeated and interleaved, the first page of every browser is slow whatever its mode. The honest
numbers are 5.0–6.5 s for pane-clear after this round against 3.8–5.8 s before it. `visual-shell`'s
4 s cap was already failing on today's host without the round. It guards a pane that NEVER
clears, so it is 12 s now, and cost belongs to the held-state probe (DD-25 § 3).

**6. Don't trust a counter your own probe feeds.** An early probe reported "the shadow map
re-renders every frame". It was counting frames where the probe itself had set `needsUpdate`.
Wrapping each prop's `tick()` showed about 8 dirty frames in 26 at rest. No fix was needed.

**DD-25 — the photo lamp: a brass cage of polaroids, and a light that is drawn, not cast.
[23–24 Sep 2026, `wip/premium/` — SANDBOX only, nothing shipped, no SW bump]**
Prop-quality round 6 against the owner's mockup (`wip/premium/lounge props/photoshade/lamp.jpg`),
photos still from `lamp images/` and its manifest. Owner's brief for the motion: keep the slow
default spin, and replace the beats with (1) a jiggle that moves every photo and (2) the lamp
briefly switching on, throwing shadows on the bookshelf wall.

*What happened.* The greybox (a birch disc, a lit stick, one ring of flat cards: 28 meshes, 2,038
triangles) is now the mockup's lamp: a turned honey-oak puck with its own grain canvas and a groove
the cage's foot hoop sits in; a frosted tube on a brass sleeve with a brass rim; a brass cage (a
double top hoop, the foot hoop, 2n rods); and **two tiers of polaroids**, each hung from a brass
clip (jaw, spring, wire to its rod). The tiers are staggered half a pitch, and the lower one hangs
inside the upper and is turned a further half-turn, so no portrait hangs straight under itself.
Two tiers always: `prmLampSlots` is called with rows ≥ `PRM_LAMP_TIERS`. Only the cage turns. Fixed
colours, no roles (the binder's precedent). **16 meshes, 13,342 triangles, 1 bumped material.**
Beats: **jiggle** 60% (the cage shakes, then each photo swings on its clip, outward only, a beat
after the last) and **light** 40%, never twice running (a flicker, a warm hold, a fade; the tube,
the portraits and the paper glow through; a light pool with the cage's shadows in it on the
shelf's back panel). The lamp moved 15 mm forward (`PRM_PLACES.lamp` z −1.44 → −1.425) so a
swinging back photo clears the panel. The door (`flick`) is unchanged. `verify-prm-props`
765 → **840**; the other five unchanged and green.

*Root cause / the decisions worth keeping.*

**1. A second shadow-casting light costs every frame, lit or not.** The first light beat was a
`SpotLight` with `castShadow`, its map rendered only while lit (r128 honours a per-light
`shadow.autoUpdate = false`). It looked right. It also failed `visual-prm`'s two frame-rate checks,
which pass with `castShadow` off: a second caster puts a second shadow lookup into every lit
material's shader, whatever the light's intensity. Toggling `castShadow` per beat would recompile
every material twice a beat. So **the room keeps its one caster, the sun**, and the lamp draws its
own light: `drawPool()` projects the actual rods, hoops and back photos from the bulb onto the wall
plane (clipped to the half behind the bulb) and cuts them out of a warm radial pool on a canvas. Its
plane sits on the panel's face, found from `roomData.prmRoom` (`prmLampWallZ`), and is blended
**dst × (1 + src)** (`CustomBlending`, `DstColorFactor`/`OneFactor`). That is light on the wood in the
wood's own colour; additive light would white the panel out (DD-24).

**2. Custom blending reads colour, never alpha, so premultiply the canvas.** The pool's first
render was a flat orange disc with a hard edge and no shadows at all. The canvas uploads
un-premultiplied, so every pixel with any alpha carried full colour, and `destination-out` only
lowered alpha. `poolT.premultiplyAlpha = true` puts the fade and the cut-outs into the colour.

**3. Find the cost by holding the state, not by averaging over a schedule.** With the pool in,
`visual-shell`'s walk-back-in check failed every run (the greybox lamp swapped back in: 117/117).
File-swap fps runs (greybox ~1.5, new ~1.1) were too noisy to bisect, because a 15 s window
catches a different number of beats each time. Holding each state in one page settled it in one
run: at rest the lamp costs nothing (held-at-rest = lamp hidden); **lit, the room fell to 0.67 fps**.
The canvas was 512 px with a `ctx.filter` blur on every shape, and Chrome rasterises a 2D canvas
on the GPU and copies it into the WebGL texture each frame. A JS timer on `drawPool` read 0.7 ms,
because the cost lands at the upload, inside `render()`. Now the canvas is 256 px with no filter
(bilinear magnification *is* the soft edge), on a `willReadFrequently` (CPU) context whose upload
is a memory copy. Lit is now 1.33 fps against 1.47 at rest, inside the noise.

**4. Draw calls are the budget, and a prop that moves can still be merged.** The first build was 66
meshes. The photos swing one by one, so they looked unmergeable, but each photo is now an invisible
pivot, and what's drawn is one mesh of card frames (the only caster), one of clips, and one per
portrait carrying both tiers' copies (one material per image, since the scene loads one url per
material). `pose()` rewrites their vertices from the pivots, relative to `spinGroup`, so the idle
spin (a parent transform) never re-poses. Only the build, `rest()` and the jiggle's frames do. The
static brass merges at build (`merge()`). 66 → 16 meshes, and the harness now holds a budget:
never more drawn than the greybox's 28. Measured, this alone didn't fix the fps (§ 3 did), but it's
the same class of cost and now it's guarded.

**5. A merged ring's `Box3` lies about where its cards are.** The back-panel clearance check sweeps
the cards' vertices in world space. A box around the whole ring, turned with the cage, reports a
corner no card reaches (DD-24 § 3), and would have failed a lamp that clears the panel.

**6. `hold(beat, ms)` is the instrument for posing a live room.** DD-24's "`withProp` + frozen
`tick`" doesn't survive the scene's own loop, which calls `tick` again with real time on the next
frame. `hold` freezes a beat at one moment with the cage still. The review sheet now also loads the
real manifest for the lamp (it used to review an empty ring), and sets `emissiveMap` as the scene
does.

*Lesson.* **Measure a light effect's cost in the state it's in, not averaged over the schedule that
produces it.** Every averaged measurement here was right about *whether* and wrong about *what*;
the held-state probe named the culprit in one run, and it was the one part a JS timer said was
free. Plants: inward swing, the lamp 20 mm back, the light twice running, the halo or the pool
resting unshrunk, additive blending, the pool projecting the front half, the pool off the panel,
`rest()` not re-posing, and a blown draw budget. Each fails its check, and each restores green.
Shots: `wip/premium/shots/lounge-lamp-{rest,light,jiggle}.png`, `review-lamp-coded{,-jiggle,-light}.png`.

*Open (owner):* whether a tap should also switch the light on (today a tap is the `flick`, which
is a routing call, so not changed); the beat odds (60/40) and the jiggle's size; the mini lamp
trinket on the top shelf is still the greybox (shelf contents are round 7's).

---

**DD-24 — the binder becomes the stickerbook: a quilted book that opens onto the table, and a
prototype achievements loop behind its door.
[23 Sep 2026, `wip/premium/` + `wip/lobby-lab/` — SANDBOX only, nothing shipped, no SW bump]**
Prop-quality round 5 against the owner's mockup (`wip/premium/lounge props/binder/binder.jpg`, three
states: closed, open with a sticker tray, a spread of pages with locked slots), plus the owner's ask
for a prototype achievement feature tied to the stickerbook — production stickers, "play game X"
achievements, refine later. Spec `docs/superpowers/specs/2026-09-23-stickerbook-achievements-design.md`,
plan `docs/superpowers/plans/2026-09-23-stickerbook-achievements.md`.

*What happened.* The binder was a greybox slab with a flat star: 44 meshes, 2,360 triangles. It is
now a butter-yellow quilted binder — displaced diamond puffs, stitched creases and a debossed
ring-star-"Little Sylly" badge on the cover, braided cord piping round both covers and the spine
ends, a round spine and a striped block of sleeve pages. Open, the inside cover is a rimmed sticker
tray and the top page four clear sleeves, and both show the player's real collection
(`api.setCollection`). **37 meshes, 73,442 triangles, 3 bumped materials.** Behind its door sits the
prototype: `wip/lobby-lab/achievements.js` (pure rules: 19 stickers × tiers 1/5/10 = 57
achievements, derived earned-ness, a tolerant `achRevive`), `stickerbook.js` + `.css` (the flat book:
tray, 2×2 sleeves, peel-to-place by drag or tap, tier card, hints, dev panel, toast), and the shell
wiring (`stickerbookOpen/Close`, a `sylly:play` event from both Play CTAs, the
`lsg_sandbox_achievements` key). `verify-prm-props` 650 → **716**, `verify-shell` 165 → **182**,
`visual-shell` 87 → **117**, new `verify-achievements` **75**; `verify-lounge` 919 and
`visual-prm` 26 unchanged and green.

*Root cause / the decisions worth keeping.*

**1. Hinge a book about its own spine, and it opens onto the table for free.** The front cover
turns about the spine's axis by θ and the spine's round by θ/2. At θ = π the cover lands at table
height on the left and the spine bulges down to just touch it — no separate "lower it" move.

**2. But the cover lands on its QUILTED face.** Rotating about the bare axis sank the puffs 3 mm
(and the piping 2.6 mm) into the table. The hinge now rises by `LIFT·(1 − cos θ)/2`, which is
linear in cos θ, so the lowest point over the whole swing is at an end stop and never below zero.
Planted `LIFT = 0` fails both swing checks.

**3. `Box3.setFromObject` in r128 measures a BOX, not the mesh.** It transforms each mesh's
bounding box, so a half-disc turned 45° reports its box corner, R(√2 − 1) = 9.5 mm under the
table, while the real geometry never went below it. The lowest point of a mesh is always a
vertex, so the "never below the table" checks sweep vertices. (The inverse of plan § 1's "a vertex
sweep cannot see the middle of a triangle": for an extremum, vertices are exact.)

**4. One height function drives the quilt's geometry AND both of its canvases,** so the creases
drawn on the texture are exactly the creases in the surface, and the badge's flat plateau and the
unquilted badge area on the canvas cannot drift apart.

**5. A face-down decal that turns over with its cover must be built pre-turned.** The tray's
stickers face −y in the hinge's frame; a quarter-turn alone reads upside down once the cover is
over. They are built at `[π/2, 0, π + tilt]`, and the harness asserts each one's normal is up and
its image-up points away from the couch — the plan's mirrored-decal lesson, asserted rather than
eyeballed.

**6. A ribbon carries no normals** — the tray rim rendered black until `computeVertexNormals()`,
exactly as the phone's camera ring already did.

**7. The door is the phone's, generalised.** `openPhone` became `openProp(id)` with per-prop
timing (`PRM_OPEN_TIMING`) and a sound named `<id>Open`; an OPTIONAL door whose host supplies the
callback and whose action has `open` now runs flip → push-in → callback, and one without keeps its
fallback. The shell resets the view on the way back from the book (the phone/dial "walk back in"
trap again — planted, it leaves the binder open under a lit fade pane). Scene B is untouched.

**8. The quilt casts no shadow.** Under SwiftShader a lounge screenshot takes ~17 s and the binder
added ~15%; `visual-prm` timed out twice on its first shot. The board under the quilt casts the
same silhouette.

**9. The rules are the router's contract.** `achievements.js` is pure and total, and the harness
forbids `window`/`document`/`localStorage`/timers/`Date.now`/`Math.random` before it loads — which is
why its export is `module` first and `window` only when there is no module.

**10. A re-render under a gesture orphans the element the gesture started on** (final review).
Turning the book to a sticker's page rebuilt the tray, so a drag of any sticker whose sleeve was not
on the open spread (11 of 19 on desktop) measured a detached node — a 0×0 ghost — and lost pointer
capture with it: nothing placed, nothing sprang back. The ghost is now cut from the live item BEFORE
the turn, the item is looked up again by id afterwards, and move/up/cancel listen on `window`. The
same review found a second finger stranding the first finger's ghost (one gesture at a time now), the
flump playing 700 ms before the cover landed (`PRM_OPEN_TIMING` names when a door's sound plays), and
`touch-action: none` making the phone's tray strip unscrollable. All four RED→GREEN in `visual-shell`.

*Lesson.* **When a DOM view has no Node harness, plant the bug in the page, not in the test.** The
view's checks were written after the view (the project's harness rule puts layout in the visual
tier); removing the one `resetView` line from `shell.html` is what proved the two checks that
matter can fail.

*Answered (owner, same day):* earned stickers are the Workshop's, but everything stays unlocked until
progress storage exists; a "play" is a match finished to its end screen; profiles and sticker
finishes are their own later designs. `docs/deferred-work.md`.

*Follow-up — the binder's idle (owner, 23 Sep 2026).* Two beats, **weighted 75 / 25, not shuffled**:
a **peek** (the cover lifts 18°, a small gold glow leaks from the gap and the page lights from
within) and a rare **reveal** (it opens right up; god-rays stand out of the spread, gold sparkles
and bokeh drift up — the owner's `open-book-with-shining-pages` reference — then it shuts). The
cover's path, the glow and every mote are closed-form in the beat's time, so the review sheet
poses any moment exactly. A beat never sets `isOpen` (that is the door's), and a tap mid-beat
hands the cover to the door from wherever it is while the beat's light fades over 300 ms.
Two things the first pass got wrong:
- **Additive light cannot be gold on a light table.** Gold added to birch and cream saturates to
  white — the first reveal was a white trapezoid with invisible sparkles. The glow and the rays stay
  additive (they are light); the motes are **alpha-blended with alpha per point** (r128's
  `material.vertexAlpha` + a 4-component colour attribute), which reads gold on light and dark. And
  the review sheet's pale backdrop lies about it both ways: judge light effects in the real lounge
  (the instrument that poses a beat there is a `withProp` + frozen `tick`).
- **One seeded LCG must not feed both a schedule and a particle burst.** Each reveal drew ~500
  values for its motes from the scheduler's stream, so the next pick was a stride-506 sample of the
  LCG — and those correlate. A planted 45/55 split still measured 35% reveals, in streaks, and the
  odds check passed it. The motes now have their own generator (mulberry32, seeded per reveal).

*Lesson.* **Plant the bug before trusting a green statistical check.** The odds check was green at
the real odds *and* at the wrong ones; only the plant showed it measured the generator, not the
code. verify-prm-props 716 → **765**. Separately, `visual-prm` went flaky on its portrait screenshot
(pass and fail on identical code): SwiftShader shots of the never-idle room take 13–20 s against
Playwright's 30 s default, so its screenshots now carry an explicit 120 s timeout — a timeout there
measured the host, not the scene. Shots: `wip/premium/shots/lounge-binder-{peek,reveal}.png`.

*Open (owner):* the binder's open "D" at the fold where the mockup has a "Sticker Tray" flap;
Bailed has no sticker, so no achievement.

---

**DD-23 — the flip phone: it rests closed, the door is a flip and a dive, and a lib floor
quietly ate the clearance.
[23 Sep 2026, `wip/premium/` — SANDBOX only, nothing shipped, no SW bump]** Prop-quality round 4
against the owner's mockup (`wip/premium/lounge props/mobile/phone.jpg`) and their brief: closed by
default, a click pops it open, lights the screen and goes to the Shelves via a zoom-in (so it has
to hold up close); inherit the four colour sections, mapping left to me; idle beats of a message
buzz, a camera click, and an open-and-shut clap.

*What happened.* The greybox was two slabs frozen open at 110°, box keys, no hinge: 16 meshes,
3,254 triangles. It is now a closed clamshell with camera, flash and a bubbly S badge on the lid,
that flips open onto a pink control deck (soft keys, call/end, a D-pad ring round a lavender OK
button), twelve pill keys with legends, and a bezelled LCD whose menu highlights *Shelves* over a
mouse mascot drawn in the ears colour. **61 meshes, 67,738 triangles, 5 bumped materials, 94 ms to
build.** `verify-prm-props` 591 → **650**, `visual-prm` 22 → **26**; `verify-shell` 165,
`verify-lounge` 919, `visual-shell` 87 unchanged and green — including Scene B, whose ending moved.

*Root cause / the decisions worth keeping.*

**1. Design the hinge; don't place it.** The lid turns about one axis through a barrel on the lower
half and two knuckles on the lid. Closed, the whole lid lies above the deck, so every point of it
only *rises* as it turns; the only lid parts behind the axis are the knuckles, which are cylinders
on it and turn in place. The lid's body starts `DZ0 = RB + 0.6 mm` from the axis: that is the notch
the barrel turns in. `RB = G + TU/2` puts the barrel exactly on the deck, no gap and no overlap.
Designed like this, the harness only has to confirm it.

**2. `lib.extrude` floors the straight run at 0.5 mm, so thin moulded parts came out thicker than
their names.** The deck was 0.75 mm where 0.5 was written, the keys 1.3 not 1.2, the bezel 0.94 not
0.6, and the clearance sum in the builder's header lost half its margin without any constant
changing. The harness's measured clearance (0.18 mm against a designed 0.4) is what named it. The
fix is `thin(w, h, d, r)`, which picks the bevel so the floor never applies. This is plan § 1's
"clearance is a SUM" again, and this time the forgotten term was inside the library.

**3. One ray check was really two claims.** The flip sweep fires rays up from under the lower half
at every 2° from shut to 10° past open. First written as "no lid surface below the deck's top", it
failed 380 times, all of them correctly: the knuckles *sit on* the lower half at the sides. It
became two claims: the lid never enters the lower half anywhere, and over the deck's own footprint
it never dips below the keys. Plus radial rays out of the barrel. Two planted drifts (the axis
sunk 3 mm, the lid slid 4 mm along) each fire the claim meant to catch them.

**4. A prop can tell the scene where to look.** `pushIn` aimed at a bounding-box centre, and an open
clamshell's box is mostly air. The phone's api gains `focusPose()`: the screen's world centre, its
outward normal and its size. `pushIn` then stops on that normal at the distance where the screen
fills 80% of the view in its tighter dimension, computed from the live camera's fov and aspect,
so the 1280 widescreen and the 390-wide portrait both land on a filled screen. Other props are
untouched: no `focusPose` means the old box-centre path.

**5. The door is a new action field, and it reverses a spec line.** `PRM_ACTIONS.phone` is now
`{ callback: 'enterShelves', open: 'open', pushIn: 'phone' }`. `open` names the prop api that the
scene calls and waits on, and one scene function, `openPhone`, serves both a tap and Scene B. Spec
§ 7.4's "no push-in … a camera dive reads as a joke the second time" is superseded by the owner and
amended in place. The dive is aimed at a lit screen that says where it goes, but the second-time
risk is real and can only be judged in a live session.

**6. Scene B's new ending fits the old budget.** Hold 380, pan 1100 (a pan still), the flip starting
220 ms before the pan settles, backlight, then a 600 ms push-in: **2.40 s**, inside the 2.5 s line
both harnesses hold `prmArriveMs` to. No sound on the arrival, since nobody has touched anything
yet. Under reduced motion the room is framed on the phone already **open** (the end state; the flip
is the journey) and cut, still exactly one camera matrix.

**7. A door can leave a prop changed, so walking back in has to undo it.** The phone's door leaves
it open. `resetView` (which the shell calls on the way back in) now calls `reset()` on any prop api
that has one, and the phone's `close()` abandons a flip still in progress. That flip's promise then
never resolves, so a transition the scene gave up on cannot fire its door later. Similarly,
`setDesign` calls an optional `onDesign`, because the mascot's colour lives in a canvas, not in a
material. It repaints only on an ears change.

**8. The idle follows the telly's pattern (DD-20), seeded, closed only.** Buzz: two vibration
bursts on a `shake` group about the phone's own centre, the flash pulsing as a notification light,
and an envelope floating up. Snap: it rears up 23° on the near bottom edge's **fillet centre**
(the jukebox's DD-22 § 10), fires the flash with a jolt and a flare, and settles back; the lowest
point stays above the table. Clap: it half-opens to 70° and slams shut with a hop. The transients
rest shrunk to nothing inside the phone, because `Box3.setFromObject` counts invisible meshes and
the arrival beat aims at that box.

*Lesson.* **Film a transition under a fake clock, not with sleeps.** Under SwiftShader a screenshot
took longer than the whole flip, so the first "film" had the phone shut in frame 0 and the Shelves
in frame 1. Playwright's `page.clock.install()` / `pauseAt()` / `runFor(ms)` step rAF, timeouts and
`performance.now()` together, so a sequence can be shot one step at a time at any speed. And the
general one, which the harness caught before any eye did: **a library default can sit inside a sum
you wrote down** — check the finished size, not the argument.

---

**DD-22 — the cat jukebox: read the mockup yourself, derive the frame from the hole, and never
earcut a part you are going to bend.
[23 Sep 2026, `wip/premium/` — SANDBOX only, nothing shipped, no SW bump]** Prop-quality round 3
against the owner's rendered mockup (`wip/premium/lounge props/jukebox/jukebox.jpg`), their colour
mapping, and a second-opinion drift report from Gemini that the owner flagged as partly wrong.

*What happened.* The jukebox was the most wrong-shaped prop left: a see-through cylinder on a thin
ring, one 144 mm record, cone ears, 19 meshes / 3,520 triangles / no bump map. It is now an opaque
lavender tub with a framed front **window**, ten records standing as **spokes** round a fixed
column on a turning carousel, a superellipse head with lens eyes and a nose, chunky scooped cat ears
(`lib.bunnyEar`) on pads that follow the head, and a separate control faceplate carrying the screen
and five transport buttons. **48 meshes, 102,402 triangles, 19 bumped materials.** `verify-prm-props`
538 → **572**, `visual-prm` 21 → **22**; `verify-shell` 165, `verify-lounge` 919, `visual-shell` 87
unchanged and green.

*Root cause / the decisions worth keeping.*

**1. Crop and zoom the mockup before trusting any description of it — including a model's.** The
Gemini report called the records "a vertical stack on a spindle". A 2× crop of the window shows
records standing on edge round a central column, like a real jukebox magazine; the tell is the one
dead ahead, which is a thin sliver because it sits in the plane of its own radius. The same crop
showed that only the FRONT of the record band is glass: the back is solid lavender wall. Both were
structural, and both would have been built wrong from the text alone.

**2. The doors follow the owner's model, not the old parts.** "Clicking the jukebox itself
(anywhere) will be the door to the feature" — so `jukebox-knob` keeps its id (the harness and the
shell both name it) but now tags the whole **body**. It can no longer `turn`, because `tweenTurn`
would spin the entire cabinet, so it answers with the prop's own `bop` through a new action field,
`prop`: the pick id is not the prop id, and the scene's fallback lookup used to assume it was
(`built[a.prop || id]`, one line). `jukebox-record` (`music.next`) stays on the carousel, which sits
**inside** the body so a hover lifts both together. The **glass is deliberately outside both**: were
it pickable, every tap on a record would land on the pane in front of it and open the wrong door.
The owner will rethink the whole door at production (plan § 5).

**3. One corner list, three offsets.** The window's hole, the frame round it and the faceplate
tucked under that frame are all `WIN` run through `lib.roundPoly` at different offsets. An offset
grows a convex corner's radius and shrinks a concave one's, so the frame's band is even all the way
round **by construction**, including where the window steps up round the screen tab. That is plan
§ 1's "derive it from the feature", applied before it had a chance to bite a third time.

**4. Never earcut a part you are going to bend.** The first build was **1.1 million triangles**. A
flat part bent round a cylinder has to be cut into narrow pieces first (`lib.bend` splits every edge
wider than 10 mm in x), and earcut fills a long band with **fans** whose triangles span half the
part. Splitting a triangle that wide costs roughly the square of its span, so the wall alone came to
786,000 triangles. The fixes are two new lib shapes that never earcut: a **ribbon** (`lib.ribbon`),
a cross-section swept along the outline as matched contours stitched into strips, for the frame;
and a **column-cut band** (`lib.holedBand`), for a wall with a hole, which runs each column up to
where it meets the hole and on past it. 113k, then 102k once a barely-visible holder was thinned.
The ribbon's section is also a true round-over rather than an extrude bevel.

**5. Twenty records read as a solid fan; ten read as records.** One per game was the first build
and the obvious meaning. The mockup has gaps between its records, and the gaps are what let each
one be seen *as* a record. The labels walk the games list evenly, so the colours still span the
box. Separately, glossy black at roughness .32 came out mid grey under the room's environment:
`roughness .42`, `envMapIntensity .35`.

**6. A planted drift has to exceed the tolerance you designed in, or it proves nothing.** The new
frame-gap check fires rays straight in on a 4 mm grid and fails if an opening ever sits next to bare
wall. Its first plant nudged the frame 6 mm and the check stayed quiet, **correctly**: the frame
overlaps the cut by 7 mm, so a 6 mm nudge leaves no gap. The check was right and the plant was
wrong. Planted at 10 mm, it fires. Alongside it, the dial's corridor raycast is ported to the
records (13 points across each disc, rays along the circle each one travels, every fixed mesh
including the glass and the column), plus a solid-back-wall check and a records-visible-from-the-
couch check. The corridor and frame-gap checks both run once against planted drift first.

**7. A flat line reads as a dead screen.** The screen is a placeholder by the owner's word (the real
content comes with the jukebox/karaoke feature), but the first "nothing playing" state drew a flat
line, and from the couch that read as broken. It now always shows a waveform, just a low one at rest.

*Owner round 3b, same day — the cat, and the idle.* Notes: ears closer together; a real cat's
nose, more pronounced; a better waveform (owner's pick from a reference sheet); three idle loops (a
smiling slow blink, notes as if singing, a roll round the bottom rim); and "just like our
cartridges, as long as it keeps spinning it can have the illusion of all the games". Now 72 meshes,
116,238 triangles. `verify-prm-props` 572 → **591**; the other four unchanged.

**8. Every game, on ten records — relabel behind the wall.** Each record takes the next game from
the list whenever its azimuth passes the BACK of the bay (a per-record lap counter on
`carousel.rotation.y + holder.rotation.y − π`), so the ten labels are a sliding window over the
games and a new game needs no edit. The harness claim is the player's: at every relabel over two
full turns, a ray from the couch to that label must be blocked. Planted at the front instead, 20
relabels were exposed.

**9. The smile is a squash, then a swap.** The reference's closed eyes are ∩ arcs with the inner
end dipping toward the nose. Morphing a glowing lens into a line is not a vertex lerp, so the lens
squashes to 6% height and an arc tube (same material) pops in with an ease-out-back. That is the
cartoon blink, and it reads from the couch where a lid sliding down would not. The open eyes also
gained two white glints, which is most of what makes them look wet rather than like buttons. The
face moved up 6 mm to make room for an ω mouth over the bezel ring.

**10. Every tilt pivots on the contact point.** Smile, sing and roll all lean the prop, and one
function owns the rig: a tilt toward `d` rotates about `up × d` through the point of the base's
FILLET touching the bench, not the rim's corner and not the origin. The roll sweeps `d` once round
the circle. The harness measures the base's own lowest VERTEX at every 50 ms of the roll (a
transformed bounding box over-reaches on a tilted cylinder), and pivoting about the origin instead
sent it 15 mm into the bench.

**11. An animated screen repaints one canvas.** `lib.tex.drawWave(canvas, title, playing, t)` paints
in place and the builder flips `needsUpdate` at ~10 fps while music plays: one texture, re-uploaded,
never one minted per frame. Asserted both ways: it repaints while playing and does not upload once
while quiet.

*Lesson.* **The review sheet is now a tool** (`wip/premium/review/review-prop.js <prop> <palette>`,
writing `shots/review-<prop>-<palette>.png`): the room's own angle three ways, a pure side view, a
pure front view and a back three-quarter, framed off the prop's own bounding box so rounds 4–7 get
it for free. The `coded` palette gives every role its own colour, which is the fastest way to check
a colour mapping. And the general one: **in any construction that subdivides, the input's
triangulation decides the cost**, and a mesh that looks fine can be a thousand times heavier than it
needs to be. Measure the triangle count at every build, not only at the end.

---

**DD-21 — the dial's lid: hide the count, don't shorten the list. Plus a decal that mirrors, a
clearance that was a sum, and the room's first sound.
[23 Sep 2026, `wip/premium/` — SANDBOX only, nothing shipped, no SW bump]** Prop-quality round 2
(the cartridge dial) against the owner's rendered mockup and six in-session amendments to it.

*What happened.* The dial was the prop furthest from its reference: 47 meshes, 14,976 triangles, no
bump map, and shaped as an open cake with all twenty cartridges standing shoulder to shoulder in a
ring. The owner's brief had six parts — a star button carrying a "Little Sylly" wordmark that
presses in and spins the carousel; roughly two thirds of the deck covered "so it's not as obvious
how many cartridges are in circulation"; the neon side strip kept (an earlier round had cut it) and
the rear ports dropped; a much simpler readout, blank until a game loads; the four colour sections
re-mapped; and the strip noticeably stronger during a spin, with a click and a low hum.

A second owner round the same day (2b) then asked for slot mouths at both ends, a much flatter
body, the hum cut, and a re-mapped colour scheme off a colour-coded render — see § 10-13 below.

Result: **107 meshes, 72,886 triangles, 60 bumped materials**; `verify-prm-props` 477 → 538,
`visual-prm` 20 → 21. The other three (`verify-shell` 165, `verify-lounge` 919, `visual-shell` 87)
unchanged and green.

*Root cause / the decisions worth keeping.*

**1. "Don't make the count obvious" is an occlusion problem, not a data problem.** The two readings
that came to mind first — fewer cartridges, or the same twenty spread thinner — both fight the
carousel's contract: one cartridge per game, `prmSpinPlan(n)` tested against `n`, the harness's
"exactly 20". Neither was needed. The mockup's own answer is a **lid**: a fixed cover over ~70% of
the deck with one 108° mouth, so five or six games are out at a time and the other fourteen are
simply somewhere under there. Nothing underneath changed. When a brief is about what the player can
*see*, look for the occluder before touching the data.

**2. A lid needs a wall, and only a pure side view says whether it has one.** The first pass built
the lid and the mouth correctly and still failed completely: a 32 mm band of open air ran right
round between the base's rim and the lid's underside, and every cartridge the lid existed to hide
was in plain sight through it from any seat in the room. The hero three-quarter looked finished. The
top-down looked finished. One orthographic side view showed it instantly. The fix is `collar` — an
annular-sector wall over exactly the covered arc, which is also what turns the mouth from a gap in a
disc into an opening cut in a shell. It runs 6° past the lid at the mouth's leading edge so there is
solid wall under the `hood`, which without it read as a snapped-off tab. **Generalised:** for any
part with a horizontal gap, the exposing view is edge-on — plan § 1's "review it in the pose that
exposes it", in its cheapest form.

**3. A decal laid flat mirrors, and a half-turn is where it bites.** `rotateX(−π/2)` sends a shape's
local +y to world −z, which still reads correctly from a camera in front of the prop — so the
wordmark at rotation 0 is fine. Adding `rotation.z = π` to point a star spike away from the viewer
made the lettering come out inside out *and* upside down. A five-point star is not symmetric under a
half turn, so badge and text cannot be rotated independently to undo it. Settled at a −12° **tilt**,
which the mockup has anyway. It was invisible at prop scale and obvious in one supersampled close-up.

**4. Clearance is a SUM, and the term you forget is the one not named in the constant.** The cards
were sized so `CART_H` cleared the lid and shipped with 1.0 mm, because a card also sits 3 mm up its
holder — a number living in an inline offset rather than in the arithmetic. Naming it (`CART_SEAT`)
and writing the sum in the comment took it to 4.0 mm. A constant that is "big enough" is not the
same claim as "the part fits".

**5. The wordmark is RELIEF, not ink.** The star takes the `buttons` role, so a colour map on it
would fight the owner's fourth colour section — pick a new star colour and the text would stay put.
A **bump map** (`lib.tex.textBump`) leaves the role in charge and lets the light do the reading,
which is also exactly what "even if it can't be read at that font size" asks for. It needed
`lib.uvFit`, because `ShapeGeometry` and `ExtrudeGeometry` both hand out raw x/y UVs **in metres** —
right for a repeating speckle, and it puts a wordmark inside a single texel.

**6. The neon belongs to no colour role.** The owner's "our game colours will eventually fill it
out" rules out painting the strip from `design.buttons`: one role colour there throws away the whole
idea. It is `lib.tex.spectrum(games.map(g => g.brandHex))` used as **both** `map` and `emissiveMap`
over a white `emissive`, plus a per-slot light in each cartridge's own hex. Two tuning notes:
`emissiveIntensity` 0.8 clipped the middle of the strip to flat white and the twenty colours only
survived at its ends — 0.55 is the resting level, and the owner's "noticeably stronger" is the *gap*
to 1.9, not the absolute. And a per-material `prmDim` multiplier is what keeps the hub stack below
the rim through the boost instead of catching up to it the first time anything brightens.

**7. A geometric assertion should measure the geometry, not re-derive it.** The lid-coverage check
first recomputed the mouth from the same angles the builder uses. It agreed with itself, and would
have passed a mouth widened to 300°. Firing a ray straight up from each cartridge and asking whether
the lid is actually overhead is the same three lines and is a claim about what the player sees. All
three of the round's new geometric checks were then run against planted drift (no boost, a 268°
mouth, a 60 mm card) and all three fired.

**8. The room learned to make a sound, without the scene learning to.** The owner wants a click on
the button press and a low hum for the length of the spin. `prm-scene.js` is Node-drivable and must
stay so, so it **names moments** — `sfx('dialPress')`, `sfx('dialSpin')`, `sfx('dialStop')` — through
a new optional host function, and the two sandbox pages decide what they sound like
(`wip/premium/prm-sfx.js`, synthesised Web Audio: a bandpassed noise thock over a falling triangle,
and two detuned saws through a wobbling lowpass). Kept in its **own** list, `PRM_EFFECT_FUNCS`,
rather than added to `PRM_OPTIONAL_FUNCS`: that list means *dormant door*, and the harness's "an
optional door must answer a tap" rightly does not apply to an effect — the same split `shell-host.js`
already draws for `openSound`. The AudioContext is built lazily on the first play (a browser refuses
audio before a gesture, and a context made at load time stays suspended for the session), and the hum
is stopped by `dialStop` **and** by `dispose()` — a looping oscillator is a timer for the purposes of
`logic-engine.md` § Timer Lifecycle.

**9. The centre is a button, not a second door.** The owner's wording is "when the dial is mouse
clicked, the button indents further", so the press is a *response*, not a new pick target.
`PRM_ACTIONS.dial`, the host contract and `prmSpinPlan` are all untouched; `api.press()` is a y tween
on a `button` group, fired as `spin()`'s first beat, skipped outright under reduced motion (nothing
travels) and asserted to return to **exactly** zero — a button that creeps ends up inside the lid
after a few spins.

**10. A cartridge has to enter SOMETHING.** Round 2's carousel rotated into the flat radial cut
where the lid and collar ended — a cover with a gap in it, not a machine with a slot. Each end of
the opening now carries a `jamb`: a doorway the card visibly passes through, which is what the
reference has. Two things about it are worth keeping. It is sized off the card's **swept
cross-section**, not its outline — a cartridge travels tangentially, so what must fit through is
its 6.5 mm depth by its height, and the widest thing on the sled is the glow plate's 19 mm of
*radial* spread, never the card's 30 mm of width, which runs along the direction of travel. And it
is an **arch, not a rectangle with a hole**: the rail and its light sit on the spinning deck and
sweep through at deck level, so any bottom rail on a fixed wall would be a part the carousel grinds
against (`prmSlotJamb`). Placing them cost two tries — two degrees into the opening left each wall
standing in open air with no lid above it, reading as a loose panel; two degrees *under* the lid
reads as a mouth cut into the cabinet, and a card still comes to rest halfway through one.

**11. The display housing had been standing in the carousel's path since the greybox.** A solid
annular wedge from r 0.096 to 0.202, across 60° of a ring whose cartridges live at r 0.130: every
card swept straight through it, and the far slot mouth was buried inside it. Nobody saw it for two
rounds, and the reason is structural — **no harness in this project has ever measured a moving part
against a fixed one**. It is also invisible to the eye, because the wedge is opaque and the cards
are behind it. The fix is that the housing is part of the cabinet WALL and so starts where the wall
starts (`R_COLLAR_IN`); the real deliverable is the check. *Its first version was wrong in an
instructive way:* it read every fixed mesh's vertices and asked whether any sat in the band, and it
passed on the buggy build — `ExtrudeGeometry` puts vertices only on the outline, so a wedge
spanning 0.096 to 0.205 has none at 0.130 and the intruding material is the interior of two very
large triangles. Rewritten as 120 tangential raycasts it names `housingBase` immediately. **A
vertex sweep cannot see the middle of a triangle.**

**12. `COLLAR_Y` was a hardcoded literal, and flattening the prop broke the collar.** Round 2b
lowered the base's rim from 54.5 to 44 mm; the collar still started at the literal 0.050 it had been
given when 54.5 was true, so it began 6 mm ABOVE the rim and reopened a band of open air right round
— the cartridges visible through it, which is the *exact* defect § 2 above added the collar to fix.
One round apart, in the same part, with the lesson already written down. `Y_RIM − 0.005` cannot
drift. Treat a literal that was derived once by hand as a bug that has not fired yet.

**13. The hum was built, shipped in a review, and cut.** The owner's brief asked for a low motor
drone under the spin; seeing it in the room, they took it out and kept the click. Nothing is lost —
the `sfx(name)` seam was never about how many names go through it, and `prm-sfx.js` keeps a note
about what a sustained voice costs (a lifecycle; a one-shot stops itself) for whichever prop asks
next. Worth recording as a normal outcome rather than a mistake: a sound is one of the things that
genuinely cannot be judged before it exists.

*Lesson.* Two that generalise past this prop. **Read a brief for what it is about**: "the count
shouldn't be obvious" is about sight lines, and the cheapest fix was a part the reference already
had. And **the review sheet has to include a view that can embarrass you** — the side view is what
found the missing wall, the close-up is what found the mirrored text, and neither defect was visible
in the framing the prop actually lives in.

---

**DD-20 — the ear's scoop is geometry, not shading; and shadows were specified but never wired.
[22 Sep 2026, `wip/premium/` — SANDBOX only, nothing shipped, no SW bump]** Prop-quality round 1
(the telly) against the owner's rendered "Bunny Beats" mockup, plus the shadow-map bug the plan
parked there.

*What happened.* The lounge's telly was greybox: 26 meshes, 10,502 triangles, no bump map anywhere,
against the finished controller's 53,700. The owner's mockup sheet showed a chunky rounded CRT with
two clubbed bunny ears, and the ears were the worst of the mismatch — they read as antennae. The
round reshaped the builder against the sheet, added the prop half of the missing surface pass, and
folded in the frozen-shadow fix. Result: 29 meshes, **30,810** triangles, **10** bump-mapped
materials, all harnesses green (`verify-prm-props` 432 → **443**).

*Root cause — the ears.* `lib.droopEar` swept a **circle** along the bent curve, because
`THREE.TubeGeometry` can only sweep a circle. No amount of tuning the curve fixes that: a real ear
is a rounded **back** with a scooped-out **front**, and the scoop is most of what identifies it. A
circular tube plus a flattening scale is a sausage, and scaling it thinner only makes it a flatter
sausage. The replacement, `lib.bunnyEar`, hand-builds the sweep so the cross-section can be a
crescent — `through = sin θ · (1 − scoop · sin θ)` on the front half only, which puts the valley
behind the spine and leaves two ridges standing proud, and which rejoins the ellipse by itself at
θ = 0 and π so there is no seam to hide.

*Three things that shape learned the hard way, all of them non-obvious:*
- **The frame must not be Frenet.** `computeFrenetFrames` rolls its normal at an inflection, which
  would twist the scoop around the ear mid-length. The curve is planar by construction (it lives in
  y–z; the caller leans and splays the finished mesh), so the stable frame is a **constant world X**
  across the ear and `N = X × T` through it.
- **The tip closure is an identity, not a taper.** Fade the girth to zero over exactly one
  radius-worth of *arc length* (`getPointAt`, never `getPoint`) and the closure is a true hemisphere
  that samples correctly right up to the pole. Get that length wrong and every sampling density
  leaves a flat disc where the tip should be — the first attempt chased the ring count for that,
  which was never the problem.
- **The scoop has to fade out before the tip**, or the closing hemisphere keeps a dent and the ear
  ends on a concave crescent edge. Visible immediately in a side view, invisible to every assertion.

*Root cause — the shadows.* `shadowDirty` in `prm-scene.js` was set at init, on a texture load, on
hover, on resize and on `setDesign`, and **by nothing in `frame()`**. Spec § 11 already said "set
`needsUpdate` only when a prop moves"; it was simply never implemented, so every animated prop ran
against a frozen map and caught up only on the next unrelated hover — the visible lag when the
binder opens. The fix separates the frame loop's two tween lists: a **camera** tween is deliberately
*not* a reason to redraw (the map is rendered from the light, so moving the eye cannot change it),
while the hover/turn tweens and every prop `tick()` are.

*Lesson.* **When a prop reads wrong, ask whether the primitive can express the shape at all before
tuning its parameters.** Two rounds of curve tuning on `droopEar` could not have produced an ear,
because the defect was in the cross-section, and the cross-section was not a parameter. The same
test applies to the props still queued: if the mockup's read depends on a concavity, a crease or a
varying section, a lathe/tube/extrude will not get there and the sweep needs to be hand-built.
**Corollary for the harnesses:** the checks that survived this reshape unchanged were the ones about
*contracts* (pick ids, roles, the raycast that proves you can see the glass); the ones that had to be
rewritten were the ones that had quietly encoded the **old wrong shape** as a requirement ("the ear
droops: its tip is below its crown", "the left ear leans outward past the cabinet"). Assert what the
reference claims, not what the current build happens to do.

*Also settled this round, so the plan's § 5 can drop it:* the mockup **has knobs**. `tv-channel`
(the only route to the dock, W6) and `tv-volume` (the only route to the sound overlay) keep their
doors, and no re-homing is needed.

*Second pass, same session, on owner review of the six-view sheet.* Three corrections, and the
third is the one worth remembering:

- **Both ears stand STRAIGHT.** The forward hook was still wrong; the owner's ear reference is a
  long upright almond. The life comes from motion instead — see below.
- **The inner ear takes the `shell` role, not `plate`.** Not a colour preference: from the couch the
  rear cabinet is a sliver of one flank, so `shell` was effectively a quarter of the palette the
  player could not see themselves choosing. Tying the ear's inner to it puts that colour at the top
  of the silhouette. **Generalisable:** when a customisation role lands almost entirely on hidden
  geometry, the fix is to give it a *second, visible* home rather than to accept a dead swatch —
  and the prop's own "which surface is this?" grouping is not automatically the right grouping for
  "which colour does the player pick?".
- **The right ear flops every 3–5 s and comes back.** Implemented as a **CPU morph between two
  poses of the same sweep**: `bunnyEar(points, { flop: secondSpine })` builds both through the same
  `pose()`, so they are compatible vertex-for-vertex, and `flop.apply(k)` lerps positions *and*
  normals (renormalising) over ~3,000 vertices in about 0.05 ms.

*Why a CPU morph and not the obvious alternatives.* Three's own morph targets would push it to the
GPU, but in r128 that is fixed attribute slots plus material flags, and — decisively — a shader
cannot be driven or asserted under Node, so the beat would have had no pure tier at all. Rebuilding
the geometry per frame was the other option and is the trap: the positions are cheap, but the
**normals** are not — `computeVertexNormals` plus `smoothNormals`' position-welding pass is
milliseconds, every frame, for a decorative idle. Precomputing *both* poses' smoothed normals once
and lerping between them costs nothing and shades the fold correctly the whole way over.

*Two constraints the shape imposes, both easy to get wrong:*
- **The second spine must have the same ARC LENGTH as the first** — an ear folds, it does not
  stretch — and the straight-line distance from the root is *supposed* to shorten, so that is not
  the thing to measure. `bunnyEar` now reports `length` and `lengthFlop` precisely so a caller can
  assert the right quantity; the first version of that assertion compared tip distances and failed
  for being true.
- **Bounds must span both poses.** `Box3.setFromObject` trusts a `boundingBox` that is already
  there, so a geometry bounded on the upright pose alone gets frustum-culled mid-flop.

*Reduced motion:* the ear simply stays up, and that is the correct reading of the standard here, not
a shortcut. The beat is a **loop** whose end state is the upright ear, so freezing it loses no
information — unlike `combReducedMotion()`, where the end state carries a number and therefore had
to still be shown.

*Third pass, same session — polish, and the idle became a personality.* The ear gained a **spoon
silhouette** (narrow where it leaves the shell, bellying to 1.14× through the middle, drawing back
to a rounded tip — a near-parallel profile is what made it read as a stalk), a **deeper bowl**
(scoop 1.42 → 1.60), and a **proud inner panel**: `bunnyEar` now takes `innerScoop`, and giving the
inner sheet a *shallower* scoop than the lobe lifts it off the bowl's floor so it meets it on a
small lip. **That lip is the point** — it gives the inner ear an edge that reads as a separate
piece even when the two roles happen to carry the same colour, which the default lounge design
does. A colour-only distinction is invisible to exactly the palette a player has not customised yet.

The single flop became **three shuffled beats** — flop, a curious *sway* left (the cabinet rocks
about its left feet, so the right side lifts), and a small *hop* (the feet splay outward and down
while it is airborne, from a pivot at each foot's top). Three points worth carrying to the other
props:

- **A rock needs a pivot, not just a rotation.** Rotating the group about its own origin drives the
  downhill feet through the bench. The lean is `rig.rotation.z = a` plus a compensating
  `rig.position.y = FOOT_SPAN · sin(a)`, which plants the left feet and lifts the right — the
  visible half of the gesture, and the half a bare rotation loses.
- **Everything rides an inner `rig` group**, so the *group* origin stays exactly where
  `PRM_PLACES` rests it. The cheap way to retrofit that is to build as before and then move the
  children: `while (g.children.length) rig.add(g.children[0])`.
- **The shuffle is the feature, so assert it.** Beats are picked from a seeded LCG (never
  `Math.random` — two devices should not differ, and the harness needs the order reproducible) with
  a random gap and **never the same beat twice running**; a fixed cycle is precisely what makes an
  idle read as a machine. The harness drives 60 s and checks all three fire, none repeats back to
  back, the gaps genuinely vary, and the rig and feet return to exact rest between beats — a beat
  that leaks a few thousandths each cycle is a prop that creeps across the bench over an evening.

*Lesson.* **An idle beat is the cheapest thing in this round and the one that changed the prop the
most.** The geometry work took the telly from greybox to finished; the three beats took it from
finished to *alive*, for about eighty lines and no measurable frame cost. Every remaining prop
should be asked what it would do if it were bored.

*Fourth pass — owner review at close range, and two of the three findings were not what they
looked like.*

- **"The edges look jagged."** Half of it was real: the dark screen bezel was extruded at
  `curveSegments: 16` and its corners were visibly polygonal. The other half was **the bump map**.
  `ExtrudeGeometry`'s default UVs are raw x/y in metres on the *caps* but a compressed
  contour/depth pair on the *bevel and side walls*, so a fine repeat (25/m) smeared into vertical
  streaks exactly where the light catches the moulding — which reads as faceting, not as texture.
  Fixed by coarsening to 11/m and dropping `bumpScale` from 0.0016 to 0.0005, plus a general
  density lift (body 22→32 curve / 7→10 bevel segments, face 20→30 / 6→9, bezel 16→30,
  glass 48×36→56×42, ear 64×32→76×40). **10,502 → 52,842 tris**, now level with the
  controller. **Rule of thumb: on an extruded solid, judge a bump map on the BEVEL, never on the
  flat face — the flat face is the one place its UVs are well behaved.**
- **"The feet point inward when it hops."** The pivot rotation was the right magnitude and the
  wrong sign, and the reason it was easy to miss is that it moves two things at once: rotating the
  pad's hanging position *outward* about a pivot at its top tilts the pad's *sole* inward. Position
  and slant read opposite. A toe pushing off wants the sole down-and-out, so the sign is
  `-side * tuck`, and the magnitude came down (0.55 → 0.34 rad) because a wide flat pad rotated 31°
  reads as a flipped tile rather than a pointed toe. **Watch for this on any hinged flat part:
  check where the SURFACE faces, not just where the part ends up.**
- **"The inner ear should look hollowed out."** Two real mistakes. First, the previous pass had the
  inner sheet sit *proud* of the bowl floor to give it a lip — which is the opposite of hollow. It
  now sits almost on the floor (`innerScoop` only a hair shallower, just enough to win the depth
  test) with a deeper lobe scoop (1.60 → 1.72), so the ear colour reads as a wall rising around it.
  Second, and more telling: the sheet was a **constant-width band cut off flat at both ends**. It
  now tapers to a closed point at the base and again below the tip — an almond. *A flat diagonal
  cut across the end of a swept patch is the single most obvious tell that it is a swept band and
  not part of the thing it sits on*, and no amount of depth or colour fixes it.

*And the colour lesson has a sequel.* Last pass, tying the inner ear to `shell` made a hidden role
visible. But the default design paints shell and ears the SAME purple, so the distinction was still
invisible where it mattered — on the palette nobody has customised. `prmApplyDesign` now honours an
optional **`prmShade`** multiplier on a material (`lib.role(role, hex, extra, shade)`), so one role
can paint two related tones; the inner ear is `shell` at 0.78. **A role is not a colour — a surface
that needs to read as recessed needs its own shade of the role, not just membership in it.**

*Fifth pass — "is a smooth curve a limitation?"* No. The owner zoomed a lounge shot and the ear's
outline was visibly a run of straight segments; the first instinct was that it was the 1280×720
render upscaled, so the check was a **supersampled close-up** (pixelRatio 2, tight fov), which
settled it in one render: the faceting survived, so it was geometry. **Make that render before
arguing about resolution** — it costs one turn and it is the difference between fixing the defect
and explaining it away.

The cause was **`smoothstep` interpolating the girth keyframes**. Smoothstep has ZERO SLOPE AT BOTH
ENDS of every span, so the profile went flat at every key — and a flat girth is a parallel-sided
silhouette, i.e. a straight run — then bent hard in between. Straight, corner, straight, corner.
Replaced with **Fritsch–Carlson monotone-cubic tangents**, which flow through a keyframe and zero
only at a genuine local extremum (the waist and the belly), which is exactly where the outline
*should* be momentarily parallel. **The general rule: smoothstep is right for joining two CONSTANT
regions and wrong for interpolating a curve's control points.** `scoopAt` still uses it, correctly,
because that is a fade between constants.

Three more defects the same close-up exposed, each with a transferable shape:
- **A corner where the taper met the tip.** The closure *switched* from the profile to
  `sqrt(1-u^2)`; the falloff's slope is zero at the join while the shaft's is not. Making it a
  **product** rather than a branch is C1 by construction.
- **A dark spike through the lobe near the tip.** Up there the scoop has faded out, so the inner
  sheet and the lobe coincide and the sheet's own anti-z-fight lift surfaces. **Any offset decal
  surface must stop before the feature it is offset from disappears.**
- **Thin fins either side of each root.** A leaning tube meeting a FLAT plane is near-tangent on
  its downhill side, and that intersection reads as a blade no matter how deep the root is buried —
  burying it further does not help, which cost two attempts to learn. The fix is a **boss**: give
  the tube a mound to come out of. The controller's ears carry one for the same reason, which is
  the note that should have been read first.

Also settled here: the bump map needed **its own instance for the ears**. The swept lobe's UVs run
0–1 over its whole length where the extruded parts' run in metres, so a single repeat value cannot
serve both — shared, the speckle came out three times finer on the ears than on the cabinet.
**Check the UV UNITS of every geometry a texture is shared across; a repeat is only meaningful
against them.** Final: **31 meshes, 63,370 tris, 12 bumped materials.**

*Sixth pass — the owner traced an ellipse over the ear in Krita and asked whether a smooth curve
was a limitation of the approach.* It was not; it was still the profile, one level further down.

**Monotone cubic fixed the flat spots and still was not smooth enough, because ANY keyframed
profile has to guess the curve between its control points — and on a silhouette every guess shows.**
The answer was to stop interpolating and state the curve: `opt.ellipse = { at, half, n }` makes the
girth **analytic**, C-infinity in its interior, with no control points to guess between. `at` is
where the lobe is widest along the spine, `half` its reach, `n` a superellipse exponent (2 is a true
ellipse; ~2.15 keeps a little more width through the middle; past ~2.3 the tip visibly flattens).

Two things fall out of it for free, and both had been hand-built and slightly wrong before:
- **The tip closes itself.** Near `at + half` the profile behaves as sqrt(2d), which IS a sphere —
  of radius W²/(half·L), about 30 mm on a 150 mm-wide ear. The separate circular closure, its TIP
  constant and the C1 join that took two attempts to get right are all deleted.
- **The root needs no flare.** The ellipse's lower end pinches out under the boss, which is where
  the fillet keyframe used to be doing its work badly.

*And the inner ear was a shape of its own rather than a copy of the lobe's.* It had its own taper
formula, which is why it came out an egg that ignored the ear it sat in. It is now a **concentric
inset**: `innerMargin` in metres, and `sin(a) = 1 − margin/(W·girth)` places the sheet's edge exactly
that far inside the silhouette at every t. The margin also decides where the sheet starts and stops
— there is simply no sheet where the lobe is narrower than the margin — so it closes into an almond
at both ends with no taper curve to tune, and the band of ear colour is even all the way round.

*Lesson, and it is the one worth keeping from this whole round.* **When a silhouette has to be a
named shape, do not approximate it with control points — write the shape down.** Three passes went
into interpolating a profile better (smoothstep → monotone cubic → denser sampling) when the shape
being approximated was an ellipse the whole time. And when one feature has to follow another,
**derive it from that feature** rather than giving it parameters of its own that happen to look
close: the inner ear stopped drifting the moment it was defined as an offset of the lobe instead of
a curve beside it.

*For the record, since it came up:* the controller uses no Catmull-Rom at all — it is an SDF height
field. The Catmull-Rom in this code is the ear's **spine**, and the spine was never the problem.

*Seventh pass — the owner had the difference articulated properly, and the articulation was worth
more than another round of guessing.* Four findings, each naming a cause rather than a symptom:
"stretched and flat rather than chunky", "a hard seam and dark crease at the root junction", "the
recess reads as a stamped impression, not a sculpted cavity", "the inlay is a stiff oval cut off
above the root instead of an organic teardrop". Every one of those mapped to a single parameter or
a single missing idea. **A precise complaint is cheaper than another iteration; when a reviewer
can only say "it looks off", the next move is to get the difference named, not to tweak again.**

- **Chunky, not stretched.** Shorter spine (tip 0.300 → 0.272) and a thicker section
  (half-thickness 0.080 → 0.095, half-width 0.076 → 0.083, superellipse n 2.15 → 2.25). The ear was
  never too *narrow* — measured against the reference the widths already matched — it was too
  **thin front-to-back**, which is what made a lobe read as a plate.
- **The root junction, and a colour flip that is really a geometry fix.** The outer lobe now takes
  **`shell`**, the same role as its boss and the cabinet, and **`ears` is the INLAY**. Most of what
  made the junction read as a bolted-on part was a colour change running along it; with the lobe
  and the boss on one role the eye reads one continuous form, and a broader, lower boss plus a
  gentler lean finishes it. **Worth generalising: a seam is often a colour boundary before it is a
  geometry problem — check which one you are actually looking at.** The inlay keeps a mild shade
  (0.86) so it still reads on a default palette that paints both roles the same.
- **A sculpted cavity, not a stamp.** The bowl went deeper (scoop 1.72 → 1.84) on a thicker
  section, so the rims stand well proud and the dish self-shades. Depth relative to the ear's
  *width* is what decides whether a recess reads as sculpted; a shallow scoop on a thin lobe reads
  as a texture impression however dark you make it.
- **A teardrop, not an oval.** `opt.innerRoot = { from, to }`: below `to` the inlay narrows on its
  own curve to a rounded point instead of being clamped flat above the root. The 0.6 power is what
  rounds that point — it gives the boundary infinite slope at the bottom, so the outline turns
  rather than meeting in a cusp.

Final: **31 meshes, 63,898 tris, 12 bumped materials**; harness 432 → **477**.

*Eighth pass — slimmer, longer, and genuinely thicker.* Owner: the ear was still reading wide and,
more damningly, "almost paper thin when it flops". The second half of that is the one worth
recording, because it is a trap built into the cross-section:

**The material left at the centre of a scooped lobe is `thick · (2 − scoop)`, and it collapses fast.**
At `thick: 0.095, scoop: 1.84` that is 15 mm on a 166 mm-wide ear — a sheet, which the flop shows
edge-on and the upright pose hides completely. Every earlier pass had been *deepening* the bowl to
make the cavity read, and each one thinned the lobe further without anything catching it: the
front-on view, which is what everyone reviews, looks better the deeper you go. The fix is not less
bowl but more stock: `thick: 0.087, scoop: 1.66` gives **30 mm** of material and still an 80 mm-deep
dish. **A deep bowl and a thin lobe are not the same trade — `scoop` decides which one you get, and
only an edge-on view of the flop tells you which one you have.** That view is now part of the
review sheet.

Alongside it: slimmer across (half-width 0.083 → 0.070) and longer (tip 0.272 → 0.310), with the
superellipse's `at` pushed to 0.58 so its widest point sits higher and the base joint narrows; and
the inlay's margin widened (0.018 → 0.024) so the band of ear colour around it is broad enough for
a customised colour to read as a deliberate inlay rather than a tint.

*Ninth pass — "the thickness is still not there", and it was two problems, only one of which I had
been touching.* Worth recording in full, because the first is a trap the construction sets and the
second is a habit of thought.

**1. The lobe was 70% HOLLOW, and the number is computable.** For a scooped section the material
left at the centre is `thick · (2 − scoop)`. At `0.087 / 1.66` that was **30 mm in a 100 mm
section** — a shell. And the trap is directional: every earlier pass had *deepened the bowl* to make
the cavity read, and each one thinned the lobe further, because the front-on view everyone reviews
looks **better** the deeper you go and shows none of the cost. Only the flop, seen edge-on, exposes
it. Now `0.118 / 1.36` — **76 mm in a 140 mm section**, two and a half times the stock, with the dish
still 66 mm deep because the section grew along with it. **Compute `thick · (2 − scoop)` rather than
eyeballing a front view; a deep bowl and a thick lobe are not in tension unless you hold `thick`
fixed.**

**2. Thickness must not taper at the same rate as width.** One `girth` scaling both axes is the
obvious construction and it is wrong for anything cartoon: it makes the lobe thinnest exactly where
it is seen most — up near the tip, which is where the fold happens. A cartoon ear narrows in
**outline** while keeping its **volume**. `opt.thickBias` runs the through-axis on `girth^p`, p < 1,
with the exponent easing back to 1 as girth → 0 — without that easing the tip closes to a chisel
edge (thin across, still thick through) instead of a point. **Generalisable to every prop in this
plan: exaggerating a silhouette and exaggerating a volume are different edits, and a single scale
factor can only do one of them.**

Final: **31 meshes, 63,898 tris, 12 bumped materials**; harness 432 → **477**.

**DD-19 — the question was not "live scene or pre-rendered", it was "which prop". [22 Sep 2026,
`wip/lobby-lab/` + `wip/premium/` — SANDBOX only, nothing shipped, no SW bump]** Builds Scene B, the
phone tier's one-way arrival beat, and retires the honest card from the shell.

*What happened.* The round opened on an owner-flagged design question left over from the 21 Sep
redefinition: is the live 3D scene worth building on a low-end phone for a ~2 s transition, or
should the beat be pre-rendered? Both answers were defensible in the abstract — a pre-render is
guaranteed smooth; the live scene costs no bytes because `three.min.js` is already precached — so
the question looked like a taste call about smoothness versus install size.

*Root cause of the confusion.* Nobody had measured it, so "the lounge is heavy on a weak phone" was
being treated as a property of the lounge. Under CDP CPU throttling (4–6×, roughly a low-end phone's
single core) `prmMount`'s synchronous cost was 1,350–2,530 ms — genuinely a stall, not a beat. But
broken down per builder at 4× it was not the room at all:

| builder | ms | share |
|---|---|---|
| controller | 859 | **87%** |
| dial | 53 | 5% |
| tv | 38 | 4% |
| phone / binder / shelf / jukebox / lamp | 40 | 4% |

The shipped `ControllerBody` geometry plus `smoothNormals` **is** the low-end cost. Everything else
in the room totals ~131 ms. PMREM, the renderer and the lights came to ~110 ms between them — the
thing that looks expensive was not.

*The lesson.* **A per-phase measurement turned a taste question into an arithmetic one.** The
controller is also the one prop that is out of frame in the portrait preset — whose own comment
already recorded that the controller "no longer fits that framing" — so omitting it costs the beat
nothing it was going to show. `prmBuildAll` now honours `ctx.skipProps`, and the arrival tier mounts
without the controller: measured **1,674 → 593 ms at 4× (−65%)** and **2,506 → 767 ms at 6×
(−69%)**. Zero new assets, no pre-render to re-render on every future art pass, and the beat still
carries the player's own controller design everywhere it is actually visible. Reach for the
breakdown before the trade-off: "is X too slow" is very often "one thing inside X is".

*A second lesson, about the harness.* The same probe also produced frame-rate numbers, and they
were **inverted** — 2 fps at 390×844 against 9 fps at 1280×720. Headless Chromium runs a software
rasteriser (swiftshader), so its GPU figures describe the harness, not any device. They were
discarded rather than dressed up. **A measurement harness can be authoritative about one tier and
worthless about another in the same run**; the CPU-side mount cost was real because it is CPU-side.

*What the two-outcome rule changed.* The 21 Sep entry described three tiers; the owner's correction
(22 Sep) is that a player may only ever see **two** outcomes — the interactive lounge, or the
Shelves. A device with no WebGL is not a third kind of player, it is the same player arriving
without the journey. That collapses the third tier into a code path rather than a screen, and it
**retires the honest card from the shell entirely**: the card existed because a phone had nowhere to
go, and now it does. It survives only in `wip/premium/index.html`, the standalone scene page, which
genuinely has nothing to hand anyone to.

*Where the one-way rule had to live.* Not in a hidden button. `lobby.js` renders all four views in
its in-phone switcher unconditionally and the shell does not own that markup, so the rule is a
**refused transition** in the router (`go premium` returns the same state once `arrival === 'done'`)
and the hiding is a courtesy on top. Hiding it alone would also have failed silently: `.lb-seg
{ display: flex }` is an author rule and beats the user agent's `[hidden]`, which is BUG-19's trap
in new clothing — caught by reading the CSS before writing the check, and asserted as a **box**, not
as `.hidden`.

*Two smaller things worth keeping.* (1) `SHELL_INIT.room` is `'absent'` and `apply()`'s premium
branch only fires for `'running'`, so the explicit boot mount is load-bearing — removing it on the
assumption that `apply()` would cover both paths left the room never built at all, on every tier.
(2) The parallax block needed `!busy` as well as its existing tween guard: a push-in was always safe
because its tween exists immediately, but the arrival beat holds `busy` for 420 ms *before* its
tween does, and a touch in that window would have steered the camera off the opening framing. No
transition should be steerable.

*Verification.* `verify-shell.js` 134 → **165** (claim 4: idempotent start, the beat ending on the
clamshell door it actually is, the refusal from both `go` and `workshopClose`, the tier table, the
beat's budget) — mutation-tested against three planted defects, all caught. `verify-prm-props.js`
409 → **432** (`skipProps` is a real absence, the pan target survives it, no-skip is unchanged).
`visual-shell.js` 69 → **87**, including the only tier that can see the pan at all: counting
**distinct camera matrices across the beat — 14 normally, exactly 1 under reduced motion**. That one
instrument proves both that the camera travels and that, with the setting on, nothing does while the
player still sees the room and what it is handing them to.

**DD-18 — a teardown that also navigates has baked one caller's destination into a shared routine;
the opener should name its own way back. [21 Sep 2026, `js/controller.js` — SHIPPED code, no SW bump
yet (see below)]** Resolves the prerequisite DD-16 recorded and deliberately left unpatched.

*The decision, and why it is not the either/or DD-16 framed it as.* DD-16 offered two options —
a return-destination variable, **or** Premium registered in `allScreens[]`. They are not
alternatives, and reading them as one would have shipped half a fix. `allScreens[]` governs
**hiding**: `showScreen(x)` hides every id in that array, so any new screen must join it or it
becomes a ghost that never hides (`logic-engine.md` § Screen Routing). The hardcoded
`showScreen('screen-lobby')` inside `ctlCloseWorkshop()` is about the **return**, and registering a
new screen changes nothing about that line. A production Premium screen will need **both**, for two
unrelated reasons. Only the return half is built here; the `allScreens[]` half belongs to whatever
round actually creates `screen-premium`.

*The shape.* `ctlOpenWorkshop(opts)` takes `{ returnScreen, onReturn }` and writes
`ctlReturnScreen`/`ctlReturnMount` on **every** entry, so the bare call every shipped site already
makes is byte-for-byte the old behaviour. Two values, not one, because **a destination is a screen
AND a mount element** — the lounge's canvas is not the lobby's, and `showScreen()` alone would land
on a screen with no controller in it. That second half is the part that is easy to miss: the old
`ctlCloseWorkshop` did `showScreen(...)` *and* `ctlMountLobby()`, and only the first looks like
navigation.

*One hook covers both exits.* Save writes the design then closes; the ✕ closes and the restore two
lines up puts the saved design back. Either way `ctlDesign` at the point `onReturn(design)` fires is
the design that survived, so a caller repainting a controller elsewhere needs no branch and no
second `ctlReadDesign()`.

*The payoff, and the proof.* `wip/lobby-lab/shell.html` existed only to monkey-patch
`window.ctlCloseWorkshop` and undo the navigation it had just done; that wrapper is now deleted and
the sandbox passes `onReturn` instead. `visual-shell.js` went 63 → 69 and its **existing** round-trip
assertions now run through the new path — driving the pre-fix `js/controller.js` through them
doesn't merely fail, it times out at the close, because the sandbox can no longer be told the
Workshop shut.

*Lesson — and the mutation result behind it.* Two mechanisms defend "a destination does not outlive
its session": the unconditional write in `ctlOpenWorkshop` and a clear in `ctlTeardown`. **Mutating
either one alone left all 69 checks green**; only removing both turned three of them red. That is
worth stating in the code rather than leaving a reader to assume each line is load-bearing — the
`ctlTeardown` clear survives for a smaller, honest reason (releasing the `onReturn` closure when a
session ends), not because it makes the default correct. A redundancy nobody has measured reads
exactly like a redundancy that is doing something.

*Not bumped.* `js/controller.js` is precached, so this normally demands a `CACHE_NAME` bump. It is
deliberately held for the lobby-redesign initiative's single combined ship (`docs/deferred-work.md`
§ 3, "One combined ship"). Safe to hold **only because the change is a behavioural no-op for every
shipped call site** — a stale cached copy behaves identically to the new one. That property is the
whole justification; a future change here that alters what the lobby does must not ride the same
exemption.

**DD-17 — a shell-level switcher and a layout's own switcher are one control, and only one of them
should be on screen. [21 Sep 2026, lobby-lab shell — sandbox only]**

W6 as specced raised the dock in every non-Premium view. That reads as a defect in practice: the
phone layouts already carry `lobby.js`'s in-phone `.lb-switch` and TV carries the Lounge's own mode
buttons, and **each of those offers all four views**, so the dock was a second copy of a control
already on screen — and in TV it sat underneath the rail, half-visible. Premium is the only layout
with no switcher of its own, and deliberately so: it is a room, not a menu. So the dock's real job
is to be the way out of the *room*, which makes it a summon (`openSwitcher`, the telly's channel
dial), not an arrival default. Below the eligibility floor it is still shown unconditionally —
there it is the only way out.

**The general shape, for the production round:** when a shell and the thing it hosts can each offer
the same navigation, decide which one owns it *per surface* rather than having the shell always add
its own. A shell control that duplicates a hosted one is not neutral — it competes for the same tap
and lands wherever the host's layout did not expect it. Recorded in `docs/decision-log.md`
2026-09-21; supersedes W6 in the wiring spec.

**DD-16 — `ctlCloseWorkshop` hardcodes its return screen, and one vendored Three now serves two
live scenes (19 Sep 2026, `wip/lobby-lab/shell.html` sandbox wiring round).** Joining the Premium
lounge sandbox to the lobby-lab sandbox behind a new full-window shell, with the controller prop
reaching the real `ctlOpenWorkshop()` under a `?live` flag, surfaced two findings worth carrying
into the production wiring round.

*The `ctlCloseWorkshop` return destination.* `js/controller.js:2044` hardcodes
`showScreen('screen-lobby')` — the shipped lobby, not wherever the Workshop was opened from. Wiring
Premium to the real Workshop meant the only way out landed on the shipped lobby underneath the
sandbox's own screens, so `shellLoadLive()` in `wip/lobby-lab/shell.html` had to wrap
`ctlCloseWorkshop` purely to hide it again and route the shell back to the lounge. The lesson: a
teardown function that also *navigates* has baked a caller's destination into a shared routine.
Shipped `controller.js` needs a return-destination variable (`ctlReturnScreen`) or Premium
registered in `allScreens[]` before production wiring can drop the wrapper — that decision belongs
to the production round, not this sandbox one.

> **Resolved 21 Sep 2026 — and the "or" above is wrong.** The two are not alternatives: `allScreens[]`
> governs hiding, `ctlReturnScreen` governs the return, and a production Premium screen needs both
> for unrelated reasons. The return half shipped as `ctlOpenWorkshop({ returnScreen, onReturn })`
> and the sandbox wrapper is deleted. See **DD-18**.

*One vendored Three serves both scenes.* The Premium room and the Workshop both read `window.THREE`
from the single precached `js/lib/three.min.js`, so putting a 3D lounge in front of the Workshop
adds **no library bytes** to the install — confirmed in `wip/lobby-lab/visual-shell.js` by counting
`<script src*="three.min.js">` tags on the `?live` page (exactly one). A real number for
`docs/cost-envelope.md` to draw on when the production round's install maths gets written.

**DD-15 — judge a greybox's first shots against the reference at matched camera distance, and
measure the two claims a screenshot lets you fool yourself about (19 Sep 2026, `wip/premium/`
re-block).** The Premium lounge greybox passed 297 checks and 12 visual checks and still failed
its own question: a toy diorama, but not a cosy one.

*What happened.* The owner's verdict was "too spacious, props small and insignificant, too light".
Every instinct said to polish the props. The answer was in the room's numbers: an 8 m wall with the
camera 2.7 m from the table, and no dark corner anywhere in frame. Compressing the room to a corner
and seating the camera on the couch changed the read completely — before a single prop was touched.

*Root cause.* A greybox is judged by eye against a reference, and the eye is very bad at absolute
scale in isolation. Both images look like rooms. What differs is measurable and was never measured:
camera-to-subject distance, subject-to-background distance, and the ratio between the brightest and
darkest parts of the frame. Pulling the camera in alone leaves the background tiny; compressing the
room alone leaves everything small. The two only work together, which is exactly the kind of
coupled change that eyeballing one screenshot at a time will not find.

*The second half is worse, because it is invisible.* "Warmer" and "darker" felt done after each of
three separate attempts. Measuring the real render buffer showed the first attempt moved the mean
brightness from 178 to 169 and the contrast ratio from 1.66 to 1.61 — i.e. the contrast got slightly
*worse* while looking better. The flattener was the ambient environment map, which lights every
surface equally and therefore cannot produce a shadow; no amount of adjusting the key would have
fixed it. (Note the tension with DD-14: an env map is what makes plastic read as plastic **and**
what erases a room's contrast. Both are true; it needs a level, not an on/off.)

*Lesson.* Before polishing anything in a 3D scene: measure camera-to-subject and
subject-to-background against the reference, and add a numeric contract for any claim about light —
mean frame brightness in a band, and a floor on the brightest-to-darkest patch ratio, read off the
GL buffer rather than judged from a PNG. `window.prmDebug.lumaGrid()` in `wip/premium/prm-scene.js`
is ~12 lines and is the check that ended three rounds of guessing. A second, smaller instance of the
same lesson in the same round: the frame's top edge crossed the back wall at only 1.37 m, so a
planned shelf position sat outside the shot — a two-line frustum calculation would have caught it
before the geometry was written.

*Also found, and unrelated to the above.* Moving the camera put a prop under the visual harness's
first pointer position, and that revealed the hover **out** tween was never guarded by reduced
motion — only the hover-in lift was. Under `prefers-reduced-motion` the drop back still travelled.
It had been shipping since the greybox and no check could see it, because no check had ever hovered
anything. A motion contract needs asserting on both edges of a transition, not just the entry.

**DD-14 — matte plastic needs an environment map, not more lights; the shipped controller has
none (19 Sep 2026, `wip/premium/` greybox).** Building the Premium lounge's props in the
controller's own material language made a long-standing look problem legible for the first time.

*What happened.* The lounge's props are `MeshStandardMaterial` at the same roughness as the
Workshop's controller, lit by a comparable three-source rig. In the lounge they read as moulded
plastic; in the Workshop the same geometry has always read slightly flat, and no amount of
adjusting the three lights fixed it. The difference is one line: `prm-scene.js` sets
`scene.environment` and `ctlBuildScene()` (`js/controller.js`, ~line 359) does not.

*Root cause.* A rough metal-free surface gets almost all of its character from what it
**reflects**, not from what shines on it. A `DirectionalLight` contributes a single specular
highlight; an environment map contributes a whole surrounding, so the shell picks up a warm
side, a cool side, a dark floor and a pale ceiling and the eye reads curvature. Without one,
`MeshStandardMaterial` has nothing to reflect and the roughness parameter has almost nothing to
act on — lights alone cannot substitute, which is why adding and re-aiming them never worked.

*Lesson.* It costs no asset. `prmBuildEnvMap()` builds four `MeshBasicMaterial` planes in a
throwaway `THREE.Scene` and runs them through `PMREMGenerator` — about fifteen lines, zero bytes
of install, one generation at mount. **The production round should apply the same to
`ctlBuildScene()`**, where it is a strictly larger win than in the lounge: the Workshop shows one
object, full-frame, that the player is deliberately studying. Two things the lounge's tuning also
established, both likely to transfer: the env map is the dominant *ambient* source once present,
so the existing `HemisphereLight` wants cutting rather than keeping, and the key light is what
blows a pale surface out — exposure barely touches something already clipping well past white.

**DD-13 — `index.html` decomposed into `src/screens/` partials; three lessons the
migration surfaced (15 Sep 2026).** Lever A (the dev-only assembly build deferred 2026-06-30)
was adopted once its revisit trigger fired: `tools/build-index.js` now assembles
`index.html` from 29 per-game partials in `src/screens/`. Full design and migration
record: `docs/superpowers/specs/2026-09-15-index-decomposition-design.md` and
`docs/superpowers/plans/2026-09-15-index-decomposition.md`. Three lessons worth keeping.

*What happened (1) — a silent CRLF/LF mismatch would have broken the safety check for a reason
unrelated to any bad cut.* The migration's entire safety property is a byte-identical build:
assemble `index.html` from the partials and diff it against the committed file. Before that
check could be trusted, `git ls-files --eol index.html` turned up `i/lf w/crlf` — the local
working tree was CRLF (one extra byte per line, 763,121 bytes total) while the committed blob
GitHub Pages actually serves was LF (751,825 bytes). An assembler writing LF would have left
`git diff` clean regardless (git normalises line endings on staging), while silently rewriting
11,296 bytes on disk — so a working-tree hash check would have failed later, for a reason that
had nothing to do with a mis-cut, exactly when trust in the check mattered most. *Root cause:*
`core.autocrlf=true` with no `.gitattributes` to override it for this specific file, combined with
the file carrying a UTF-8 BOM (`ef bb bf`) that the same mismatch could also have corrupted.
*Lesson:* before trusting any byte-identical or hash-based safety check on a Windows repo, run
`git ls-files --eol <file>` and compare it against the actual committed blob size
(`git cat-file -s $(git rev-parse HEAD:<file>)`), not just the working-tree `wc -c`. The two can
silently disagree, and a check that only ever compares two views of the SAME broken assumption
proves nothing.

*What happened (2) — the codebase already tolerated the thing the migration seemed to need
fixing.* The original 2026 decision assumed any HTML decomposition would need every plugin
converted off parse-time DOM access first (a real boot-ordering problem: partials must exist
before scripts that read them run). An audit of all 23 plugin/shared files before cutting anything
found this was already mostly done: **14 of 23 already bind entirely inside `DOMContentLoaded`**,
and **4,130 lines of markup already sat after the last `<script>` tag** in the pre-migration file —
twelve games have been parsing their JS before their own markup existed in the DOM all along.
`js/games/cld.js` documents the contract explicitly ("parse time except constant declarations
and the DOMContentLoaded binding"). *Root cause:* the boot-ordering objection was never re-checked
against the current codebase before being treated as a hard blocker in planning. *Lesson:* a
multi-year-old architectural objection is a hypothesis, not a fact — a 20-minute audit of the
actual code can retire it (or confirm it) before it shapes a design. Here it meant option A
(dev-only build, output byte-identical, no boot-order work required at all) was strictly safer
than the runtime-assembly alternative the objection was originally raised against.

*What happened (3) — one section mixed ownership, and it mattered less than expected.* Every
other section header cleanly named one game or one shared concern. One did not: the block
literally titled "GLOBAL + GM SUPPLEMENTARY OVERLAYS" held the global `#sound-overlay` *inside*
a Great Minds-titled block. *Root cause:* historical — the comment inside the section itself
calls GM's how-to overlay's placement there "for historical reasons". *Lesson:* it split cleanly
once inspected (the global overlays came first, GM's own overlays after, not interleaved) into
`_sound.html` and `gm-overlays.html` — but the split left GM's markup in two non-adjacent
partials with `ss.html` between them in manifest order, preserved exactly rather than tidied,
because reordering would have broken the byte-identical guarantee. A generated-code migration
should preserve an ugly-but-correct structure over a tidy-but-reordered one; tidying is a
separate, later, deliberately-reviewed change, never a side effect of a mechanical split.
**DD-12 — Workshop polish: randomise/zoom/drag-to-reposition, and the real cause of the slider lag
(SW v230, 14 Sep 2026).** Owner playtesting flagged three things at once: no quick way to try random
colour combos, no way to get closer to the model, and the rotate/size sliders feeling "clunky" —
plus a couple of seconds of visible stutter while the lobby ornament's stickers popped in on a cold
load. The first two were straightforward additions (`ctlRandomiseAll()`; wheel + pinch `ctlZoom`,
view-only, clamped, resets on Workshop close). The slider lag was the one worth tracing before
touching anything: `ctlStickerDispatch()` called `ctlRenderPanel()` — a full rebuild of the
19-tile sticker gallery **and** the colour card — on *every* `'adjust'` dispatch, and both sliders
fire `input` many times a second. Fixed by skipping the panel rebuild entirely for `'adjust'`
(selection and the sticker list never change on an adjust, so nothing there needs to repaint).

That fix also explained the ornament's load-in stutter, which turned out to be the *same* mistake
wearing different clothes: `ctlStickerImage()`'s `onload` called `ctlRedrawShell()`/`ctlRedrawEars()`
directly, and each of those sets `needsUpdate = true` on both the colour and bump textures — a real
GPU re-upload of the full 2048² atlas, not a cheap operation. N stickers finishing async decode in
quick succession meant N full re-uploads stacking on top of each other. `ctlScheduleRedraw()`
collapses any such burst — sliders, a live sticker drag, or several images arriving together — into
one `requestAnimationFrame`-scheduled redraw, however many callers ask for one first.

Drag-to-reposition (press the *selected* placement to move it live; anywhere else still rotates)
needed no reducer changes: it reuses the existing `'adjust'` action to patch position, the same way
the sliders patch size/rotation, so a whole drag is one undo step rather than one per pixel — an
existing pattern applied to a new gesture, not a new one invented. The one real trap: patching only
`{surface, u, v}` when a drag crosses from the shell onto an ear silently drops `r` (a shell
placement carries no radius field under that name), leaving the merged sticker with `r: undefined`
and NaN ear hit-testing. Any cross-surface position patch must carry the radius explicitly.
**Lesson:** before adding a feature to fix "it feels slow", find what a `dispatch`/`setState` call
actually triggers on every tick — a burst-frequency event path silently doing the same expensive
work as its single-shot sibling is the recurring shape (§ CJAR/COMB packet lessons apply just as
much to a purely local render loop as to a multiplayer one).
**Changed:** `js/controller.js` only. No new harness — presentation/interaction, not rules/packets/
state; verified with a throwaway `visual-check` driver instead (`docs/code-map.md` § 3D Controller /
Workshop has the specifics). All existing controller harnesses (157+63+28+48 checks) still pass
unmodified.

**Two follow-on bugs, same owner-playtesting pass:**
1. **Zoom survived a Konami/gateway round-trip.** Zoom was reset in `ctlOpenWorkshop()` and
   `ctlCloseWorkshop()`, but the Konami→Sylly Gateway exit calls `ctlTeardown()` directly and later
   remounts the lobby via `ctlMountLobby()` — it never calls `ctlCloseWorkshop()` at all, so that
   reset was simply skipped on that path. Moved the reset into `ctlMountLobby()` itself instead: it
   is the one choke point every return to the lobby ornament actually passes through, so "the lobby
   is never zoomed" is now enforced where the invariant actually lives, not at one of several
   possible exits. **Lesson:** when a value must be reset "on the way back to X", reset it at X's
   own entry point, not at every exit you can currently think of — an exit you didn't know about
   (or add later) inherits the fix for free.
2. **A button press with nothing selected was also arming/placing a sticker sitting under it.**
   `ctlOnTap` (`= ctlStickerTap` in the Workshop) fires on pointerup whenever the gesture reads as a
   tap, with no awareness that `ctlTryPress` had already consumed the matching pointerdown as a real
   button press — `ctlStickerTap`'s raycast hits the shell mesh underneath the button regardless.
   Fixed with `ctlButtonPressSuppressesTap`, set at pointerdown only when the press both hit a
   button AND sticker mode was `'idle'`, read at the matching pointerup to skip `ctlOnTap`. Owner's
   spec for the fix, preserved deliberately: a button press with something **already** armed/
   selected is still allowed to place it at the button's spot — same as any other point on the
   shell — so the guard only ever applies to the idle case, never a blanket "buttons are off-limits
   to stickers" rule.
**Changed:** `js/controller.js` only (both fixes). Re-verified with the same throwaway
`visual-check` driver pattern; all existing harnesses still pass unmodified.

**Three more requests, same round:**
1. **Gradient Randomise All, tied to the colour inventory, not copied.** Owner asked for bright
   pink -> purple specifically, reading from the suite's own colours rather than a literal hex
   pair, so a future brand recolour of either game carries the gradient with it for free — the
   same intent as `ctlPalette()`'s own "read `GAME_BRAND_HEX` live" rule. `GAME_BRAND_HEX['btn-
   dstw']` (li5) and `['btn-great-minds']` are read at render time in `ctlRenderColourCard()`.
   This is a deliberate exception to § Action Button Standard's brand/neutral/destructive colour
   rule — the same shape as FRT's literal-hex heading exception — because the ask was for a
   specific two-colour gradient, not "make this button brand-coloured."
2. **Tapping a placed sticker now jumps to the Stickers tab and rings its book tile.** Selecting
   a sticker via a tap on the 3D model previously changed `ctlStickerState` with **zero** visible
   feedback if the player happened to be viewing the Colours tab (the controls row lives inside
   `#ctl-panel-stickers`, hidden the whole time) — a selection nothing shows is not really a
   selection to the player. `ctlStickerSelect()`/`ctlStickerGoToBook()` reuse the suite's existing
   Tap-Hold Reference pattern (`ui-style.md`) for a plain tap rather than inventing a new
   feedback mechanism: switch tab, `refHighlightRow()` against a new `data-ctl-sticker-id`
   attribute on each book tile.
3. **Tapping a different placed sticker while one is selected now re-selects it, instead of
   relocating the selected one onto it.** The reducer/tap logic before this made no distinction
   between an empty spot and one already carrying another sticker — any tap in `'selected'` mode
   relocated the current selection there, which is surprising the moment two stickers sit close
   together (the owner's example: a sticker near the D-pad kept getting bumped by taps meant to
   select or re-examine a different one). `ctlStickerTap` now checks the tapped spot's existing
   placement index first; a hit on a DIFFERENT index re-selects rather than relocates. Moving a
   sticker deliberately on top of another is still possible — just via drag (`ctlStickerDragTo`
   has no such guard, since a live drag is already an intentional, visible act), never a plain tap.
**Changed:** `js/controller.js`, `css/styles.css` (two new `.ctl-sticker-ref-row*` rules, same
shape as `.flw-ref-row*`/`.pko-ref-row-ping`). No new harness — same reasoning as above; verified
with another throwaway `visual-check` driver, including a live `GAME_BRAND_HEX` mutation to prove
the gradient isn't a copied literal. All existing harnesses still pass unmodified.

**Three more requests, same round again:**
1. **The rainbow was meant to be literal — all 20 games, not just the two endpoints.** The
   2-colour pink->purple gradient from the previous chunk was a misread of "bright pink starting,
   purple ending" as *only* two stops; the owner meant a full rainbow across every live game
   colour with those two pinned at the ends. `ctlRainbowGradientStops()` pins li5 first and
   great-minds last and fills the middle from `LOBBY_COLOUR_ORDER` — the suite's own hue walk,
   already used for the lobby's own Colour sort — rather than inventing a second ordering. Same
   "read `GAME_BRAND_HEX` live" guarantee as before, now proven against the full set (a 21st game
   changes the stop *count*, not just a colour).
2. **Removed the die-cut border's dark ring on a light shell/ear.** `ctlStampShell`'s border
   branch picked `28` (near-black) or `242` (near-white) per texel from the luminance already
   underneath — light shell, dark ring; dark shell, light ring — same rule `ctlRedrawEars` used for
   the ear cap. Owner's read, confirmed correct: on a light shell the sticker's own near-white
   die-cut edge already provides the padding, so the added dark ring was padding on padding. The
   fix keeps the height/bump lip (`hgt`/`hv`) unconditional in both cases — the raised-edge lighting
   cue survives — and only skips the *colour* ring when `lum > 0.5`. This changes what the harness
   measures, not just presentation dressing on top of unchanged output, so
   `tools/visual-controller-stickers.js` needed real updates: both border assertions rewritten
   (light case now asserts "no meaningful change from bare shell colour" instead of "goes dark"),
   plus new `shellYellow`/`shellBlack` bare-luminance captures added for the ear the same way the
   shell already had them. One knock-on: the harness's own "tapping a placed sticker with nothing
   armed selects it" check placed its test sticker at a body coordinate that — coincidence, unrelated
   to this chunk — turned out to sit on a real button, so the *previous* chunk's
   `ctlButtonPressSuppressesTap` guard (correctly) started refusing it. Fixed by relocating that
   one test's sticker to a coordinate already proven clear of every button, rather than touching the
   guard — the test was asserting the select path, not the button-guard path, and needed a click
   that exercises only the one it claims to.
3. **Drag-to-reposition was still laggy — because "coalesced to one redraw per frame" is still one
   real redraw+GPU-upload every ~16ms while a finger is moving, and that alone is enough to feel
   clunky on a mid-range phone.** Reworked to defer the real move entirely: `ctlStickerDragTo` now
   only re-plans the legality (cheap — pure geometry, no rasterisation) and repositions a flat DOM
   ghost (`.ctl-drag-ghost`, green/red border for legal/refused) directly from the pointer event's
   own screen coordinates — no raycast-to-screen projection needed. The real sticker's dispatch,
   redraw and texture upload happen exactly ONCE, in `ctlStickerDragCommit()` on release (still via
   `'adjust'`, so still one undo step). Measured with a throwaway driver instrumenting
   `ctlStickerDispatch`: zero dispatches during a multi-move drag, exactly one after release. This is
   a stronger fix than the previous chunk's coalescing, not a duplicate of it — coalescing bounds the
   redraw rate to once per frame; the ghost removes the redraw from the drag entirely.
   **Lesson, generalised:** "batch the expensive operation to once per frame" is the right fix when
   the operation must reflect every frame's state (an animation, a physics step). It is the *wrong*
   fix when the expensive operation only needs to reflect the FINAL state and every intermediate one
   is disposable — there, skip the operation during the interaction and run it once at the end,
   which is strictly cheaper than any per-frame rate. The tell is whether anything downstream reads
   the intermediate values; here nothing did.
**Changed:** `js/controller.js`, `css/styles.css` (`.ctl-drag-ghost`, `position: relative` on
`.ctl-workshop-stage`), `tools/visual-controller-stickers.js` (border assertions rewritten, 48 ->
50 checks — the only chunk this round that touched a harness, per the reasoning in item 2). Verified
with more throwaway `visual-check` drivers: the gradient's stop count and order, and
`ctlStickerDispatch` call counts during vs. after a live drag.

**One more request, same round: the reverse of tap-to-book.** Tapping a sticker on the model already
jumps to its book tile; picking it from the book should equally rotate the model to face it, rather
than leaving the player to hunt for it by dragging (a real need — the book is deliberately how you
reach a sticker that's currently on the back or an ear, out of view). `ctlStickerGoToModel(s)` eases
`ctlRotY` toward `ctlStickerAimYaw(ctlStickerAimPoint(s))` over several `ctlTick` frames (shortest
way round, `prefers-reduced-motion`-aware per `ui-style.md` § Motion Standard's RAF-animation
carve-out). The aim math is general rather than a four-way (shell front/back, earL/earR) table of
hardcoded angles: `atan2(-point[0], point[2])` is three.js's own Y-rotation matrix solved for "what
yaw puts this local point directly in front of the camera" — any local point, any starting
rotation, one formula. Verified by placing a sticker on all four surfaces, selecting each from the
book, letting the tween settle, and re-projecting that sticker's own point through the camera: all
four land within rounding of dead-centre. Ears have no `ctlStickerSurface.point()` (that API is
shell-only), so `ctlStickerAimPoint` reuses the same shell-atlas coordinate `CTL_STICKER_OPT`
already has for that ear's own boss keep-out — an approximation, but the goal is "bring it into
view," not a placement, so exactness isn't the bar.

**Caught by the same verification pass, not by the owner:** the tween-cancel only lived in the
rotate-view branch of `pointerdown` (`ctlDragging = true; ctlRotYTarget = null;`), on the reasoning
that grabbing to rotate is what conflicts with an auto-rotate. It doesn't cover every way a
`pointerdown` can go — a press landing on the sticker mid-tween takes the drag-to-reposition branch
instead (a real scenario: the tween had already carried the sticker close to centre, i.e. close to
where the player's next tap naturally lands), and that branch never touched `ctlRotYTarget` at all,
leaving the tween fighting the drag on every subsequent frame. A throwaway driver that grabbed
mid-tween caught it immediately; the fix moved the cancel to the top of `pointerdown`, before any
branch, since ANY manual touch on the stage — button, sticker-drag, or rotate — is the player taking
control and should win. **Lesson:** a "cancel X on manual override" fix that reads correct for the
one path being actively tested (here: view-rotate) still needs checking against every OTHER way the
same handler can branch, not just the one the current feature happens to add.
**Changed:** `js/controller.js` only. No new harness — same reasoning as the rest of this round.
Verified with a throwaway driver covering all four surface combinations, plus reduced-motion and
manual-interrupt as separate cases; all existing harnesses (including the 50-check visual one from
the border chunk) still pass.

**Owner caught a real defect in the above: "it's trying to get it at an angle, not face-on."**
The verification I'd actually run only checked that the sticker's projected screen X landed at
canvas centre after the tween — true for all four surfaces, and wrong test. Centred-on-screen and
facing-the-camera are different claims; the first says nothing about which way the surface itself
is turned. Diagnosing it directly (`ctlStickerSurface.point()` vs `.normal()` at a spread of shell
coordinates) showed why: `point()`'s x/y ARE the unwarped atlas x/y (see the module's own comment on
`point()`), so the front/back faces are parameterised nearly FLAT — a sticker at x=1.2 on an
ordinary front placement measured a 70° point-based yaw purely from being off to one side, and a
back placement measured 109°, both wildly over-rotating a sticker that was already reasonably
face-on. The surface NORMAL doesn't have this problem — it directly encodes "which way does this
patch point," independent of how far sideways the parameterisation happens to put it — and switching
`ctlStickerAimYaw`'s input from `point()` to `normal()` took those same cases to 0° and 12°
respectively. Re-verified with a driver that checks the actual claim this time: transform the local
normal by the settled rig rotation and take its dot product with the camera's forward axis — shell
placements now land at 0.99-1.00 (near-perfect), ears at 0.7-0.8 (yaw alone can't fully square a
corner-mounted cap that also needs pitch to face dead-on; a known limit of the ear approximation
already documented above, not a new one this introduced).
**Lesson:** when "rotate/move something to face/reach X" is the ask, the thing to aim at is
whatever encodes ORIENTATION (a normal, a forward vector, a tangent) — not a POSITION, even though
a position is very often more directly available and a position-based formula will frequently look
correct in casual testing (it visibly moves the target toward the right general area). The tell that
should have caught this before shipping: verify the actual property being claimed (here, "faces the
camera") rather than a correlated but different one (here, "is horizontally centred") that happens
to also improve when the real fix would.
**Changed:** `js/controller.js` only (`ctlStickerAimYaw`'s parameter and both call sites in
`ctlStickerAimNormal`/`ctlStickerGoToModel`). No new harness — verified with another throwaway
driver measuring the world-space facing dot product directly; all existing harnesses still pass.

**Owner caught a second, sharper defect on the very same feature: "mainly snaps to the front...
placed a sticker at the back, viewing the back, click to snap and it takes me to the front."**
The normal-based fix above was directionally correct but had one more hole: `ctlStickerSurface
.normal(x, y, back)`'s own formula is `n = [-zx, -zy, 1]` — the z-component is HARDCODED to +1
before normalising, for both `back: true` and `back: false` alike. That's the right outward
direction for the front sheet (`point()`'s z is `heightF`, bulging toward +Z) and exactly backwards
for the back sheet (z is `-heightB`, bulging toward -Z): measured directly, `normal(0,0,true)`
returns the identical `[0,0,1]` that `normal(0,0,false)` does, when the back's true outward
direction is `[0,0,-1]`. So a back-placed sticker's aim yaw always came out near 0° — "front" — no
matter where on the back it actually sat, which matches the report exactly ("mainly snaps to the
front... most of the others it will not"), since only front placements were ever getting the right
answer. This is a real quirk of the shared, already-verified `js/lib/controller-sticker-surface.js`
module, not a fresh bug in it: every EXISTING caller of `normal()` (`makeChart`'s `tangentFrame`)
only uses the vector to build a self-consistent local tangent/bitangent basis for texture
projection, where the absolute sign of the normal never mattered — it just needs to be perpendicular
to the tangent plane, which it is either way. `ctlStickerGoToModel` is the first caller that needs
the true facing direction, so the fix stays caller-side in `controller.js` rather than touching the
frozen, separately-harnessed module: `ctlStickerAimNormal` now negates the whole vector whenever
`back` is true. Re-measured properly (world-normal-dot-camera after the tween settles, for front AND
back on both a shell placement and an ear cap, run as SEPARATE sequential cases with the sticker
state fully reset between each — an earlier version of this same verification script reused one
sticker id across cases without resetting `selected`, which silently toggled the book tap OFF
instead of re-arming it and made the second case look like it hadn't rotated at all when the
product code was already correct): shell front 1.00, shell back 0.99, earL front cap 0.71, earL back
cap 0.82 — all four now land close to face-on, front and back alike.
**Lesson, on top of the previous chunk's:** a fix can correctly identify the right CONCEPT (aim at
the normal, not the point) while still inheriting a wrong ASSUMPTION about a helper it calls (that
`normal()` returns an unambiguous absolute direction, when its own docstring-equivalent — the
`n = [-zx,-zy,1]` line — only promises "perpendicular," a weaker contract existing callers never
needed more than). When reusing a shared function outside the pattern its existing callers use it
for, checking what it actually promises (read the implementation, not just the name) matters more
than confirming the new caller's own logic is sound.
**Changed:** `js/controller.js` only (`ctlStickerAimNormal`). No new harness — same reasoning as
the rest of this round. Verified with a throwaway driver running front/back/ear cases sequentially
with a full state reset between each; all existing harnesses still pass.

**DD-11 — Gel moulding extracted to `.gel-btn`, rolled out to all 72 game-menu buttons (SW v218,
1 Sep 2026).** Owner asked for the lobby's keycap/gel look on every game menu's four buttons (Play
CTA, How to Play, Settings, ← Back to the Box). The four gloss layers built for `.lobby-btn` in
DD-10 were already colour-agnostic, so the work was extraction, not redesign:

- **`.gel-btn`** = DD-10's four layers, badge-free. `.lobby-btn` keeps *only* the left-badge
  layout (`display:flex; gap; padding-left:3.9rem; text-align:left`); lobby markup went
  `key-cap lobby-btn` → `gel-btn lobby-btn`. `.key-cap` (the SW v214 precursor) and the duplicate
  `.lobby-btn::before/::after/:active` are **deleted** — one canonical copy now, no fork.
- **Text-over-gloss without a label span.** Menu buttons have bare text nodes, not a
  `.lobby-btn-label` span, so DD-10's `label { z-index:2 }` trick doesn't apply. Instead `.gel-btn`
  sets `isolation: isolate` (own stacking context) and paints `::before`/`::after` at
  **`z-index: -1`** — CSS paint order puts a negative-z child *after* the element's own background
  but *before* its in-flow text. Gloss over the fill, under the text, zero markup. (Lobby's label
  span still carries `z-index:2` — now redundant but harmless, and its `text-shadow` still earns
  its place over FRT lemon.)
- **`.gel-btn-light`** for the two pale buttons (Settings' light brand tint, ← Back's
  `bg-stone-200`): keeps the colour-agnostic bezel/drop `box-shadow`, swaps the body gradient +
  `::before` cap for a low-alpha version. At full strength the `rgba(255,255,255,0.52)` cap blows
  a pale fill to near-white and the `rgba(0,0,0,0.28)` base gradient muddies it. Verified in
  `visual-check` on LI5 / CJAR / FRT / GTH menus — pale buttons read as moulded keys, still clearly
  subordinate to the Play CTA.
- **Menu buttons lose `active:scale-95` + `transition-all duration-150`.** `.gel-btn:active` is the
  press now (`translateY(3px)` + collapsed drop shadow), and `.gel-btn` transitions `transform`
  only — matches the lobby and the Motion Standard's transform-only rule.

*Lessons.*

- **`isolation: isolate` + `z-index: -1` is the no-markup way to slip a pseudo-element between an
  element's background and its text.** Reach for it before wrapping text in a span. The span is
  only needed when the child also has to sit *above* the text (a badge) or carry its own style
  (the label's text-shadow).
- **The `.gel-btn:active` full-`box-shadow` redeclare is load-bearing and travels with the
  extraction** — `.key-cap:active` is gone but any equal-specificity `:active` earlier in the file
  would still strip the bezel mid-press. DD-10's note now attaches to `.gel-btn`.
- **72-button `index.html` pass via Node, section-scoped positional.** Menu button ids are
  inconsistent (`btn-play`, `btn-ss-play`, `btn-nat-menu-howto`, `btn-*-menu-*`), so the script
  keyed off the 18 `#screen-*-menu` section ids and took the 4 id'd buttons in document order =
  play, how-to, settings, back. Asserted exactly 4 per section and 72 total before writing. Pure
  glyph/attribute edits, no inserted newlines → CRLF-safe (DD-10's Node/CRLF caveat).

**DD-10 — Lobby buttons: left emoji badge + glossy moulded fill; three emoji corrections (SW v216,
30 Aug 2026).** Tier-1 visual polish, `#screen-lobby` only (game menus' own Play CTAs untouched).
Each of the 18 game buttons carries `.lobby-btn`: a white circular `.lobby-btn-badge` span (game
emoji) on the **left**, the `.lobby-btn-label` span left-aligned after it (moved from centred — the
badge on the left is why the game name now has the whole width), and a colour-agnostic **classic
gel moulding** in four layers over the button's own flat brand `background-color`. Reference: a
Frutiger-Aero / Web-2.0 glossy-gel button set the owner supplied, plus their steer that Little
Sylly Games should feel **light and upbeat**.

*The four layers.* (1) body gradient — faint crown light, deepening to the base; (2) **`::before`
specular cap**; (3) `::after` bounce-light off the base; (4) `box-shadow` — outer bezel + inner
rims + the keycap 3-D drop. Every value is translucent white/black, so the whole thing is
colour-agnostic with **zero per-game values** — same philosophy as `.key-cap`, and it works
identically over a Tailwind class, a `bg-[#hex]`, a custom `*-cta` class or GTH's inline `style`.

**The load-bearing insight — a gradient stop cannot make a 3-D object.** Three attempts failed
before this one, and all three failed for the *same* reason: they painted the gloss as a gradient
across the whole button face. A gradient stop is a straight edge-to-edge line, so the best it can
ever produce is a flat horizontal **stripe**. Classic gel buttons don't work that way: the
highlight is *its own shape* — inset from the sides, with an **elliptical bottom edge**
(`border-radius: 13px 13px 50% 50% / 11px 11px 18px 18px` — the asymmetric two-value radius is what
curves it). That needs a real pseudo-element, which `::before`/`::after` were free for once the
peel was removed. **When a CSS surface reads flat despite lots of gradient stops, the fix is
usually to promote the highlight from a gradient band to a positioned element with its own
geometry.** No library, canvas, SVG or build step is needed for any of this — the owner asked
whether an external tool was the missing piece; it wasn't, the technique was.

*The path — four iterations, the first three dropped on the owner's feedback.*

- **Peeled-corner.** Two `::before`/`::after` flaps of the button's colour (`background-color:
  inherit`) curling over the badge. Colour-agnostic and verified across all 18 fills, but the
  verdict was *"not visible"* — even punched up it read as a small detail, not a treatment.
- **Diagonal black darken.** A `linear-gradient(142deg, …, rgba(0,0,0,.26))` wash toward the
  lower-right, standing in for the (impossible) "fade to the settings-pill colour" — *impossible*
  because every game's `pill-active-[colour]` value **is** its brand colour (checked all 18:
  `.pill-active-pink` is `#ec4899` = `bg-pink-500`; even GM's lobby button is `bg-purple-500` =
  `.pill-active-purple`). There is no distinct "alternate colour" in the system. Verdict: *"a bit
  dark"* — a large translucent-black wash greys and muddies a saturated fill.
- **Gradient-band gloss.** Inverted to highlight-led (bright white top half, semi-hard waterline,
  thin dark base). Much brighter and the right *direction*, but still flat — see the insight above.
- **Gel with a full-height specular cap.** Correct technique, but tuned too bright: cap `height:46%`
  at `rgba(255,255,255,.86)` washed the top half toward white and the brand colour stopped reading
  (worst on the light fills — FRT lemon, FLW pale pink).
- **Gel, dialled back (shipped).** Same four layers, restrained: cap `height:36%` /
  `rgba(255,255,255,.52)`, body-gradient crown `.10`, crown rim `.40`, bounce `.20`. Now a sheen
  near the crown, not a dome — the game's brand colour stays dominant, the moulding (bezel, base
  refraction, elliptical cap) is all still there. **The cap's *shape* is what sells the 3-D read;
  its *opacity* is free to be low.**

*Two follow-on touches (same SW bump).* The emoji **badge** became a convex domed disc — a
`radial-gradient(circle at 34% 28%, #fff → #dcdce2)` plus a `box-shadow` stack (top rim catch-light,
lower inner shade, hairline bezel, a real drop) — so it reads as a 3-D pin, not a flat sticker; the
gradient stays in the white→pale-grey range so the emoji on top is untouched. The lobby **wordmark**
got `.lobby-title h1 { text-shadow: 0 1px 0 …, 0 2px 0 …, 0 4px 6px … }` — a 2 px extrude + soft
ambient shadow, one colour-agnostic rule for both `<h1>` lines so their Tailwind `stone-800` /
`pink-500` fills are kept. Needed one HTML hook: `class="lobby-title"` on the wrapping `<div>`.

*Lessons.*

- **A gradient can only paint a stripe; a pseudo-element can paint a shape.** Above — the general
  rule worth carrying to any future skeuomorphic surface in this suite.
- **"Feels dark" on a coloured surface means the treatment is shadow-led — invert it.** A big
  translucent-black gradient over a saturated fill always greys it. The 3-D read should come from a
  *white* highlight up top, with darkening confined to a thin band at the base.
- **An outer `0 0 0 1.5px rgba(0,0,0,.22)` ring reads as "a darker moulding of this button's own
  hue"** over any fill — the colour-agnostic way to get a bezel without computing a darker shade
  per game (which would need `color-mix()` and a per-game custom property).
- **`.lobby-btn:active` must be redeclared.** `.key-cap:active` and `.lobby-btn:active` have equal
  specificity (0,2,0), so the later rule wins — but if `.lobby-btn` doesn't declare a press state at
  all, `.key-cap:active`'s much simpler `box-shadow` strips the bezel and rims mid-press and the
  button visibly falls apart on tap. Any future class layered onto `.key-cap` that overrides
  `box-shadow` inherits this obligation.
- **Stacking order is explicit and must stay so:** cap/bounce `z-index: 1` → label `2` → badge `3`.
  The label also needs `position: relative` for its `z-index` to apply at all, or the specular cap
  paints straight over the game name.
- **The `text-shadow` on the label is functional, not decorative** — it is what keeps white legible
  where the cap brightens the fill beneath it (FRT lemon, FLW pale pink). It is also period-correct
  for the style, so it costs nothing aesthetically.
- **Stale harness assertions silently pass.** The 18-button check carried
  `labelOverlapsBadge: label.right - badge.left > 0` from when the badge was on the right; with the
  badge moved left that is trivially true for every button and had stopped testing anything.
  Rewrote it direction-aware (`label.left < badge.right`) plus a `labelGap` readout — now a
  consistent 10.8 px across all 18. *When a layout changes direction, re-read the assertions that
  encoded the old direction.*
- **Scripting `index.html` with Node: the file is CRLF.** An earlier pass wrote `\n` in inserted
  markup → lone-LF lines mixed into CRLF, git flagged the whole file. Inserted newlines must be
  `\r\n`; a pure in-place glyph swap (this round's emoji script) inserts no newlines and is safe.
  Always back up to the scratchpad first and assert 0 lone-LF after write.

*Emoji corrections (same SW bump).* The lobby badge forced an audit of each game's emoji across its
menu hero, how-to title and settings title:

- **YGI 🃏 → 💡** on the how-to title (`ygi-how-to-overlay`) + Table B + `ygi.md` header/copy. The
  menu hero and the `House Rules 💡` settings title were *already* 💡; only the how-to lagged. 🃏
  stays on the in-game card labels (*The Lineup*, *The Ringer*). Also de-collides the badge from
  Pass's 🃏.
- **NT ⚡ → 💻** on the menu hero, how-to title, lobby badge, Table B, `nt.md` header/copy. The
  `SYS.CONFIG ⚡` settings title **keeps ⚡** — a deliberate terminal-theme flourish, not the game's
  identity emoji.
- **BLD 💬 → 📋** on the menu hero (`aria-label` "Chat bubble" → "Clipboard"). The how-to was
  already 📋; the `Bailed 💬` settings title keeps 💬. (Last round also fixed `bld.md`'s header,
  which was a stray copy of LI5's 💬.)
- `node tools/verify-identity-docs.js` green after — the how-to copy blocks in `ygi.md`/`nt.md` were
  updated in lockstep with `index.html`.

**DD-09 — Lobby title-page polish (SW v216, 30 Aug 2026).** Three Tier-0 tweaks to `#screen-lobby`.
(1) The sort-toggle row read as "a tad high" against "What are we playing today?" — but
`getBoundingClientRect` showed both centres at the same y (perfect `items-center`). The misread is
optical: "RELEASE ✨" is uppercase + emoji (visual mass rides above the box centre) next to a
lowercase sentence (mass rides below). Fix was `items-baseline` on the row — a small text label
beside a sentence should share its baseline, not its box centre. *Lesson: when two things measure as
aligned but don't look it, the fix is baseline/optical alignment, not a pixel nudge.*
(2) `LOBBY_COLOUR_ORDER` now leads `btn-flw` (Flawless pale pink) then `btn-dstw` (pink-500) — a
light→dark pink start the owner preferred over opening on LI5.
(3) FRT + CJAR game-name labels made white to match the other 16. FRT is an inline `text-white`
swap; CJAR needed a scoped `#btn-cjar { color:#fff }` rule because `.cjar-cta` hard-sets near-black
(`#292524`) and that class is shared with every in-game CJAR CTA — an ID selector beats it without
`!important` and without touching the game. White-on-`#FFE500` (FRT) is ~1.3:1 and barely legible;
kept at the owner's explicit call for cross-button consistency.

**DD-08 — The lobby Colour sort now fails safe for an unlisted game (SW v215, 30 Aug 2026).**
DD-07 shipped `LOBBY_COLOUR_ORDER` as a hand-maintained list of 18 button ids parallel to the lobby
DOM, with no guard and no entry in `docs/rules/new-game-checklist.md`. Game 19 would therefore have
been added to the lobby and *not* to the list — and the failure mode was the worst available one:
CSS `order` defaults to **0**, so the unlisted button would have tied with `LOBBY_COLOUR_ORDER`'s
own index-0 entry and rendered **second from the top** of Colour mode. Confirmed in headless
Chromium against the v214 function verbatim: an appended 19th button rendered at position 2, computed
`order: 0`.

*Fix:* `lobbyApplySort()` now parks **every** child of the new `#lobby-game-list` container at
`order = LOBBY_COLOUR_ORDER.length` first, then pulls the listed ones back to their index. An
unlisted button lands at the bottom in DOM order instead of the top. Release mode likewise clears
`order` on every child rather than only on listed ids. Added the missing checklist line so the list
still gets maintained — the guard degrades the symptom, it doesn't remove the step.

*Lesson — a hand-maintained list parallel to the DOM needs a defined failure direction, and `order: 0`
is not a neutral default.* The instinct when adding one is to check that today's entries are all
correct (they were: 18/18 ids matched). That check says nothing about what happens to the first
element that *isn't* in it. Whenever a list enumerates DOM ids for positioning, ask what an
unenumerated element does — with CSS `order`, `flex-order`, `tabindex` and `z-index` alike, the
unset value is `0` or `auto`, which sorts to the **front or the top**, never politely to the end.
Park the whole set past the end first, then place the known ones.

*Verification:* 13 assertions in real headless Chromium (`visual-check`), reading paint order from
`getBoundingClientRect().top` rather than `style.order` — the resolved order is the thing under
test. Covers Release = DOM order, Colour = `LOBBY_COLOUR_ORDER` exactly, an exact round-trip
restore, the 19th-button case, both label states, and no horizontal scroll. The pre-fix function was
re-run through the same case first to confirm it genuinely failed.

**DD-07 — Lobby keycap treatment + Release/Colour sort toggle (SW v214, 30 Aug 2026).** Tier-0/1
polish pass on `#screen-lobby` — no game logic touched. Two pieces:

- **Keycap tactile treatment.** One colour-agnostic `.key-cap` class (`css/styles.css`) layered as
  translucent black/white over whatever background each of the 18 lobby buttons already sets —
  Tailwind utility, custom `*-cta` class, or GTH's inline `style="background-color:..."`. Needed no
  per-game CSS. Press animates `transform` only (the shadow snaps rather than eases, same as a real
  key), satisfying § Motion Standard's transform/opacity rule without a `transition-all`. Each
  button's `active:scale-95 transition-all duration-150` was removed — a keycap sinks, it doesn't
  shrink.
- **Sort toggle (`#btn-lobby-sort`, ✨).** Release order (default — the shipped DOM order, so this
  mode is just clearing `style.order`) vs Colour order (`LOBBY_COLOUR_ORDER`, a hand-picked hue-wheel
  walk starting at LI5 pink — hue sort wasn't used because three brand colours are
  near-achromatic — Pass zinc-900, SHP midnight, GTH sage — and a computed sort would scatter them
  arbitrarily). **Reorders via `style.order`, never a re-render**, because each of the 18 lobby
  buttons is bound by its own plugin at parse time (`on('btn-cjar', ...)` etc.) — rebuilding the
  button DOM would silently drop all 18 listeners. `lobbySortMode` is memory-only (not
  localStorage) — a cosmetic sort preference doesn't earn a 4th key against the documented
  three (`sylly_nickname`, `isMuted`, `masterVolume`).

**Why it matters beyond this screen:** the `style.order` + parse-time-bound-buttons pattern is the
reusable answer for "reorder a list of elements each owned by a different module without touching
any of them" — reach for it before a re-render if the same shape recurs.

**Not done here, deliberately parked:** the 4-mode lobby redesign (Original / Shelves / TV /
Premium) discussed alongside this — needs its own foundation spec (game registry + metadata
extraction from `docs/game-identities/`, an entry-point refactor off `btn-[abbr]` ids, and lobby art
for the 13 games `data/art/` doesn't yet cover) before any of the four layouts can be built. Waiting
on art direction (logo, controller, artwork) per the owner.

Verified in headless Chromium (`visual-check` skill): all 18 buttons render `.key-cap` with valid
box-shadow, no layout break; subtitle/sort row don't overlap; colour sort produces 18 distinct
`order` values and toggling back restores the exact original order; `:active` genuinely sinks
`translateY(3px)`; no horizontal scroll introduced.

**DD-06 — System Sounds gets its own toggle; tap-hold mutes without the overlay (SW v213, 28 Aug 2026).**
Once Music had its own ON/OFF and its own slider (DD-05), the effects "Volume" block was the odd one
out — silencable only through Mute All, which also kills music. Gave it the identical shape: a
`#btn-global-sfx-toggle` + `#global-sfx-slider-row` mirroring Music's markup exactly, backed by a new
`sfxEnabled` global. The only code-wide consequence was mechanical: all 19 `if (isMuted) return;`
guards across `engine.js`'s `play*()` functions became `if (isMuted || !sfxEnabled) return;` — a
single `sed` pass, verified by count (19 in, 19 out) rather than eyeballing each site.
`playSliderTick` was deliberately left alone; its own comment already says it bypasses `isMuted` so
slider feedback is always audible, and the same reasoning extends to the new flag.

**Tap-hold to Mute All** rides the existing `bindCardHold` (ui-style.md § Tap-Hold Reference) rather
than a new gesture primitive. The one wrinkle: `bindCardHold`'s own listeners don't suppress the
`click` that still fires after a held touch/mouse is released, so without extra state a 500 ms hold
would toggle mute *and* pop the sound overlay open on release. Fixed with a per-button closure flag
set by the hold callback and consumed (once) by the click handler — a pattern worth reusing anywhere
else a hold and a click share one element, since `bindCardHold` itself has no opinion about it.

**Verification note.** A headless-Chromium check that only inspects DOM text/classes cannot prove
SFX-off actually silences anything — the guard could be wired to the wrong flag and still *look*
right. Patched `AudioContext.prototype.createOscillator` for one call to `playSuccess()` and
confirmed zero oscillators were created with the toggle off, then confirmed one was created with it
back on. Cheap, and it is the only way this class of bug is visible without real audio hardware.

**DD-05 — Background music: files, but on the packs contract, with a fallback instead of silence (SW v212, 28 Aug 2026).**
The suite shipped eighteen games under a flat "no audio files" rule. That rule was never really
about files — it was about the **install size** and the **offline guarantee**, and both survive
intact if music is runtime-cached rather than precached. So `data/music/` took the `data/packs/`
contract verbatim: manifest network-first, audio cache-first, nothing in `PRECACHE_URLS` (the
*module* is precached — code is part of the app version; the tracks are not). The consequence worth
naming is the authoring workflow: **a new track ships by dropping an mp3 in a folder and adding one
manifest line** — no `sw.js` edit, no `CACHE_NAME` bump, no JS change.

Three decisions inside it that could each have gone the other way:

1. **Two-tier fallback, not per-game silence.** `tracks[activeGameId]` else `tracks['lobby']`. The
   alternative — a game with no track plays nothing — makes the feature feel broken for seventeen
   of eighteen games until every track exists, and makes *every future game* a music task. With the
   fallback, game 19 inherits a theme for free and only stops using it when someone writes it one.
2. **One seam in `showScreen()`, not eighteen plugin calls.** Every plugin already sets
   `activeGameId` before navigating, and `resetToLobby()` clears it before its own `showScreen` —
   so both directions are covered by a single line in the engine. Eighteen call sites would have
   been eighteen chances to forget one, and a nineteenth for the next game.
3. **Its own toggle and its own level, not a share of `masterVolume`.** The common request is
   "keep the cues, lose the soundtrack", and a shared slider cannot express it. Global Mute All
   still outranks both — one switch silences the app.

**Two implementation details that are load-bearing:** tracks are decoded into an
`AudioBufferSourceNode` with `loop = true` rather than played through `<audio loop>` (which inserts
an audible gap at the wrap point on every engine); and **nothing starts before a user gesture** —
browsers refuse audio until then, so `init()` queues the lobby theme and starts it on the first
`pointerdown`/`keydown`. Verified in headless Chromium: no boot errors, the fallback resolves (a
click that landed on the Late to the Party button proved it — LTTP has no track and got the lobby
theme), the overlay renders at 16 px gaps with no horizontal overflow, and Mute All collapses both
control groups.

**Lesson.** An anti-pattern is worth re-reading for its *reason* before treating it as a wall. "No
audio files" protected two properties; a caching contract that already existed in this codebase
preserved both, and the rule turned out to be narrower than its wording.

**DD-04 — Fredoka self-hosted; the "deliberate offline exception" is deleted, not documented (SW v205, 19 Aug 2026).**
The brand font had loaded from Google Fonts since the start, with a ~5-line paragraph in **two**
always-loaded rule files explaining why that was acceptable ("self-hosting would require woff2
files, a local `@font-face`, and precache entries"). The stated cost turned out to be almost
nothing: Fredoka is a **variable** font on Google's `css2` endpoint, so `wght@400;600;700` all
resolve to the *same* woff2 per subset — **one 29 KB latin file + one 4.6 KB latin-ext file covers
the whole 300–700 range**, versus the three separate static files the paragraph assumed.
**What changed:** `fonts/` (2 files), `@font-face` × 2 with the original `unicode-range` values
copied verbatim from Google's stylesheet (so the subset split and lazy latin-ext fetch behave
identically), the three `<link>` tags deleted from `index.html`'s head, both files added to
`PRECACHE_URLS`, `CACHE_NAME` → `sylly-games-v205`.
**Lesson — an "acceptable exception" is worth re-costing before you document it a second time.**
The paragraph was written once and then maintained forever in two auto-loaded files; the actual fix
took one download and four edits, and it *removed* a runtime third-party dependency rather than
adding weight. When a doc paragraph exists purely to justify a limitation, that is a signal to
re-check the limitation, not to polish the paragraph.
**Verification worth copying for any future asset-caching change:** `document.fonts.check()` alone
proves nothing about offline. The real test is (1) load once so the SW precaches, (2) `setOffline`,
(3) **prove the network is actually dead** — `fetch()` a deliberately un-precached URL and require
it to throw — then (4) reload and re-check. Without step 3 a "passing" offline test may just be a
test where offline mode never engaged. Confirmed here: cache `sylly-games-v205` holds both files,
un-precached fetch throws, Fredoka still renders, zero requests to `fonts.g*.com`.

**DD-03 — `bindCardHold` / `refHighlightRow` extracted to `engine.js` (FLW gem-seam plan Task 4, 14 Aug 2026).**
Tap-hold-to-gallery (`ui-style.md` § Tap-Hold Reference) had shipped twice already — `pkoBindChainHold`
and `shpBindCardHold` were near-identical hand-rolled `touchstart`/`mousedown` timers with their own
`scrollIntoView` + ping-class blocks. A third user (FLW) earned the extraction: `bindCardHold(el,
onHold, ms=500)` and `refHighlightRow(box, attr, id, pingClass, ms=1600)` now live in `engine.js`,
and all three games' own bind functions are one-line delegates (`[abbr]BindCardHold(el, id) =>
bindCardHold(el, () => [abbr]OpenHowTo('[tab]', id))`).
**PKO gained a real fix as a side effect of the extraction — `touchmove` was never wired to cancel
the hold.** SHP's original implementation cancelled on `touchmove` (a scroll starting on a card
correctly aborts the hold-timer); PKO's did not, so a scroll gesture that happened to start on a
card could fire the gallery open mid-scroll. Extracting to one shared function meant picking ONE
behaviour — SHP's (the correct one) — so PKO inherited the fix for free rather than needing its own
patch. Root cause is engine-level (the shared function's own listener set), which is why this entry
lives here and not in `pko-implementation-notes.md` (one-line pointer left there).

**DD-02 — Universal click-outside-to-dismiss for every overlay (14 Aug 2026).**
Every overlay in the app needed a scroll-to-the-bottom tap to close — a single delegated
`click` listener in `engine.js` now closes any overlay when the tap lands on its backdrop
dead space (`e.target === el`, matching the art viewer's pre-existing pattern). Rather than
hiding the overlay directly, it finds and `.click()`s the overlay's own neutral button
(id matching `/(?:^|-)(cancel|close|done|ok|dismiss)(?:$|-)/i`, visible via `offsetParent`)
so every overlay's existing cleanup (LI5's turn-timer resume on quit-cancel, tab-scoped
close buttons, scroll resets) runs unchanged — nothing duplicates that logic. Overlays are
found generically via `[id$="-overlay"].fixed`, which covers all 134 overlays in the app
(old and new markup alike) with one exception (`pause-overlay`, not a real backdrop, excluded
automatically since it isn't `.fixed`) — no per-overlay wiring or `index.html` edits needed
except one: `dyb-slick-picker-overlay`'s Cancel button used an inline `onclick=` with no
`id`, so it got one (`btn-dyb-slick-picker-cancel`) to participate.
**Deliberately excluded by construction, not a denylist:** any overlay whose only buttons are
a real decision — GM's `gm-near-sync-overlay` (Accept/Reject a proposed match), `gm-boost-overlay`
(Confirm a Boost), `bld-pass-reveal-overlay`/`flw-emerald-overlay`/`pko-carrion-overlay` (pass-
the-phone reveal confirms), `review-overlay` (Next) — has no neutral cancel/close/done/ok
button, so the generic handler no-ops there. This is required by the Pass-the-Phone Safety
Gate (`logic-engine.md`) — those overlays must not be dismissible by an accidental outside tap.
A `bg-stone-200`-class fallback was considered and rejected: `gm-near-sync-overlay`'s "Reject"
button is styled neutral-stone (the *secondary* choice) but is itself a real game decision, not
a harmless dismiss — a class-based heuristic would have fired it on an accidental outside tap.
Verified live via `visual-check` (Playwright): sound overlay, LI5 How to Play, and LI5 quit-confirm
all close on backdrop tap with their normal cleanup; `gm-near-sync-overlay` correctly stays open.
**Changed:** `js/engine.js` (removed the art viewer's now-redundant dedicated backdrop handler,
folded into the generic one), `index.html` (one `id` added to `dyb-slick-picker-overlay`'s Cancel
button, no other markup changes).

**DD-01 — Skin packs can override display text, not just art (`assetName`).**
Card *art* and card *names* were always separate skinning concerns by construction (`js/lib/art.js`'s three-tier `assetFace`/`assetBack`/`assetExtra` resolve images only), but text had no equivalent — a full re-skin (PKO's Dinosaurs pack wanting "Titanosaur" instead of "Elephant") had no way to reach the name without editing the game's own data file, which would have renamed the animal for every skin and the base game too. `assetName(kind, id, fallback)` fills the gap: skin-tier only (no core-art tier — a game's default names are canonical and only a skin opts out), text not a path. First adopter: PKO's `pkoCardName(id)`, already every animal-name display site's single choke point, now routes through it with one function change.
**Changed:** `js/lib/art.js`. **Deferred:** every other skinnable game (FRT/SHP/FLW/PASS/DYB) can adopt `names` for free by routing its own name-display call sites through `assetName` — none have yet, PKO is the only user so far.

---

## Bug Index

**BUG-20 — the room's own doors leave the fade lit, and nothing cleared it on the way back in.
[21 Sep 2026, lobby-lab shell + premium scene — sandbox only, nothing shipped]**

*What happened:* owner review: "switching out of the lounge — switching back in leaves the screen
blank." Every harness was green, and it would not reproduce under `shellDispatch` or the dock — the
lounge repainted perfectly every time.

*Root cause:* `#prm-fade` is a full-bleed `#FAFAF9` pane at `opacity: 0`, lit by `.on`. Both of the
room's real exits light it **on purpose**, so the handoff to the next layout is seamless: the phone
prop runs `fadeOut()`, and the dial/telly run `pushIn()`, which schedules the same class through
`later()` at `PRM_FADE_AT_MS`. The only thing that ever clears it is `resetView()`, and re-entering
Premium called `resume()` and nothing else. The lounge came back **underneath an opaque pane**, with
the camera still pushed in. Leaving by a door was the one exit no check and no probe of mine ever
took — `shellDispatch` and the dock skip the transition entirely, which is exactly why
`visual-shell.js`'s "returning to Premium restarts the same scene" passed throughout.

*Second, separate defect found while fixing the first:* a door transition has **two** halves — a
camera tween and one or more `later()` timeouts — and `resetView()` cleared only `camTweens`. A
reset taken *during* a push-in therefore left the fade timeout armed, and the room faded itself out
~400 ms later with no door taken. That is reachable, not theoretical: `#prm-reset` ("Reset view") is
the documented way back, and `#prm-hud` sits above `#prm-fade` specifically "so Reset view stays
reachable". Fixed by having `resetView()` cancel `timers.timeouts` as well.

*Fix:* `shell.html`'s `apply()` calls `api.resetView()` on a transition **into** Premium
(`prev.view !== 'premium'`), which clears the pane and the pushed-in camera together; the guard
matters because `apply()` also runs on every window resize, and an unguarded reset would snap the
camera mid-drag. Plus the `timers.timeouts` cancel in `prm-scene.js`'s `resetView()`. Both were
proven by backing each one out and watching its own assertion go red.

*Lessons.* **(1) Go out the way a player goes out.** A transition is state, and a check that leaves
by the side door never creates it. Every existing check left Premium by `shellDispatch` or the dock
— neither of which is a door — so an entire class of transition state was untested while reading as
thoroughly covered. When a surface has a scripted exit and a human exit, assert the human one.
**(2) Abandoning a transition means abandoning every half of it.** Timer-driven and tween-driven
halves of one animation get written at different times and cancelled in different places; a reset
that knows about one of them is a reset that half-works. Enumerate what a transition schedules, and
cancel the list. **(3) Assert the fact, not its rendering.** Both fixed tests first passed for the
wrong reason by reading `getComputedStyle().opacity` — a 200 ms transition the compositor starts
when it likes, which read `'0'` for a second while the class was already back on. The class is the
state; the opacity is a consequence. Where the rendered value really is the point, poll for it with
a bound rather than sleeping a fixed span. **(4) A harness-wide context option can quietly void a
single check** — `visual-prm.js` runs `reducedMotion: 'reduce'` throughout, which collapses the fade
to `later(..., 0)` and made the first version of the new check pass against the unfixed code. A
race only exists at full motion; the check that tests one has to ask for its own context.

**BUG-19 — the sandbox shell hid every pane by `hidden`, and one id-level rule quietly won.
[21 Sep 2026, lobby-lab shell — sandbox only, nothing shipped]**

*What happened:* owner review of `wip/lobby-lab/shell.html` found the Shelves painted over the lounge
on load, the "TV mode wants a wider screen" hand-off card painted over the real TV layout, and
whichever phone layout was last open painted over the lounge on the way back. TV was the only view
that hid cleanly. Every one of the five shell harnesses was green at the time — `visual-shell.js`
included, at 57/57.

*Root cause:* one specificity loss. The panes hide via `.shell-view[hidden] { display: none }`
(0,2,0) while `#shell-phone { display: flex }` (1,0,0) sets the phone pane's own layout. The id rule
wins, so `hidden` on that pane changed nothing at all: the router set the attribute correctly every
single time and the box stayed a full 1280x800. `#shell-tv` and `#shell-premium` have no id-level
`display`, which is exactly why TV looked fine and hid the pattern. Ordering cannot fix this — it is
specificity, not cascade position.

*Why no harness saw it:* `visual-shell.js`'s `shown()` helper short-circuited on `el.hidden` **before**
it measured the bounding box. That check reads the `hidden` IDL property — the thing the router sets —
so it could only ever confirm the router agreed with itself. The one failure mode available here is
precisely "attribute set, CSS ignores it", and the helper was structurally blind to it. Three
assertions that existed to catch this (`the phone pane is hidden on Premium` and two siblings) were
passing on a page that was visibly wrong.

*Fix:* `.shell-view[hidden] { display: none !important; }` — the `!important` is load-bearing against
any per-pane id rule, present or future — and `shown()` now measures the box and nothing else.
Dropping the short-circuit turned the three assertions red first, then green: 57/57 -> 54/57 -> 57/57.
`verify-shell.js` 134/134 unchanged.

*Lesson — for the production wiring round, where this pattern is about to be reused:* **`hidden` is an
attribute, not a guarantee.** Its `display: none` comes from an ordinary, beatable CSS rule, so any
visibility scheme built on it is one id selector away from silently not hiding. And **a visibility
check that consults the same property the code under test writes is not a check.** Geometry is the
only honest answer — if an assertion can be satisfied by the renderer agreeing with itself, it is
documentation, not verification. This is the presentation-tier twin of the loopback lesson in
`logic-engine.md` § MDLM Patterns: `getElementById: () => null` blinds a harness to render code the
same way `el.hidden` blinds one to the cascade.

*Note for production:* shipped `showScreen()` does **not** use `hidden` — it sets
`style.display` inline, which no stylesheet rule can lose to. The trap is specific to the sandbox's
attribute-based scheme, and is a reason for the production layout switcher to follow `showScreen()`'s
inline-style shape rather than port the sandbox's `hidden` toggling across.

**BUG-18 — `buildEars` shipped ExtrudeGeometry's default UVs, and nothing read them for a whole
release. [13 Sep 2026, controller stickers Task 7]**

*What happened:* the first ear sticker rendered as a smear of a few texels stretched across the whole
ear, in the wrong place, on both ears at once. The shell rasteriser it shares a code path with was
already correct.

*Root cause:* `ControllerBody.buildEars` builds each ear with `THREE.ExtrudeGeometry` and never sets a
`uv` attribute, so the ears carried the extruder's own default parameterisation — which maps the
shape's world-ish X/Y onto the cap and gives the side wall whatever falls out of the extrusion. That
had been true since SW v228 and had never mattered: the colour-only Workshop flood-fills the ear atlas
with one flat colour, and a flat fill looks identical under any UVs whatsoever. The attribute was
wrong from the day it shipped and the renderer simply never asked it a question that could tell.

*Fix:* `ctlBuildEarUV()` computes planar cap UVs itself — two bands in one atlas (front `v` 0.26, back
`v` 0.74), each ear its own column (`u` 0.25 / 0.75), scaled by the ear's measured half-extent. Which
local cap faces the controller's front is **read off the mesh's own rotation quaternion** rather than
assumed, so it survives a change to `buildEars`' tilt numbers. Every triangle whose three normals do
not agree on a side — i.e. the side wall — is parked on a single known texel (`0.998, 0.004`) instead
of being given a plausible-looking wrong answer; that parked texel is what makes `earSide` ("that is
the side of the ear") a refusal the player can be told about rather than a silent misplacement.

*Lesson:* **"the renderer has never read this attribute" is not the same as "this attribute is
right".** A buffer attribute with no consumer is untested by construction, and a flat fill is exactly
the consumer that cannot fail. When a new feature becomes the first real reader of existing data,
treat that data as unverified — the release history behind it is evidence about the old consumers,
not about the value.

**BUG-17 — The bump lip exists only inside the sticker's own alpha, so on a matching shell the relief
outlined a blank plateau. [13 Sep 2026, controller stickers Task 6]**

*What happened:* a sticker placed on a shell close to its own art colour all but disappeared. The
depth cue was working — the light caught a raised outline — but what it outlined was a flat blank
shape, because the art inside it was the same colour as the shell around it.

*Root cause:* the stamp's `if (al <= 0.004) continue;` guard confines every write, colour **and**
height, to texels the sticker's own alpha covers. That is the right rule for colour and the wrong one
for relief: a real die-cut sticker's edge is visible because the vinyl stands proud of the surface
*outside* the printed art, and there was no such band. Measured over the nineteen shipped designs,
every one is near-white dominant, and the worst pairing the spec names — `flw` on FRT's `#FFE500` —
contrasts at **1.01:1**. Six shells measure 1.01–1.16:1 (FRT, COMB, CLD, FLW, GTH, YGI). The bump map
could never rescue any of them on its own.

*Fix:* an adaptive die-cut border (spec D8). The art is inset by `CTL_BORDER` (0.055) so the border
always has somewhere to go, and the guard widens to `al <= 0.004 && hgt <= 0.004`, where `hgt` is a
five-tap average of the alpha around the texel — so height is written in a band *outside* the
artwork and the border stands proud **with** it, as one piece of vinyl. The border's colour is chosen
**per texel from the atlas pixel already underneath**: a light shell gets a dark border and a dark
shell a light one, a sticker straddling the faceplate edge needs no special case, and because a
recolour re-enters `ctlRedrawShell()` and re-stamps from scratch, every border re-derives against the
new shell colour for free. `CTL_BORDER_FIRM` (3.2) is how hard the ring fills its band — it saturates
rather than thickens, because the width is `CTL_BORDER` and only the opacity moves. The ears get the
same treatment done in 2D (`ctlEarSilhouette`), a ring of eight offset silhouette draws rather than a
blur: a blur fades, and a die cut does not.

*Lesson:* **a depth cue is not a contrast cue, and "it reads well" is a claim about a palette, not
about a design.** The relief looked convincing on every shell colour it was developed against and
failed on six of twenty. Check legibility against the **actual** palette the feature will meet —
here, nineteen fixed designs against twenty fixed shells, which is a 380-cell grid small enough to
measure exactly rather than sample.

**BUG-16 — Re-deriving a saved anchor on every load walked it across the shell, monotonically.
[12 Sep 2026, controller stickers Task 3]**

*What happened:* caught at design time rather than in the wild, which is the only reason it is cheap.
The natural shape for the load path — re-run `plan()` on each saved placement, keep what it returns —
moves a rim-wrapped sticker a fraction of a texel per load, **always in the same direction**. Measured
at up to **5.75 atlas texels over 200 loads**. A sticker that creeps across the shell over months, and
only for the players who use it most, is close to undiagnosable after the fact.

*Root cause:* `plan()`'s rim branch snaps an anchor to the crest, and that snap is **not idempotent** —
`plan(plan(x))` is not `plan(x)`. Nothing about that is a defect in `plan()`; it is a defect in asking
it a question it was not built to answer twice. The load path needed one bit from it (is this
placement still legal?) and helped itself to the rest of the return value because it was there.

*Fix:* `ctlValidateStickers`' rule 6 consults the injected `legal` probe **for its `ok` flag only** and
throws the coordinates away; the stored `x`/`y`/`size`/`chart` are what the renderer uses. `chart` is
stored rather than re-derived for the same reason (rule 4 — never guessed).

*Verification:* `verify-controller-stickers.js` § 10 round-trips a rim placement through 500 load
cycles and asserts it comes back **byte-identical**, then — the half that makes the first half mean
anything — runs the re-deriving version alongside it and asserts that one **does** move.

*Lesson:* **a load path that recomputes what it could have stored is a slow-drift bug generator.**
Store the derived value; re-run the derivation only for its *validity* flag, and discard the rest of
what it hands back. The general form: when a function's output is fed back into its own input, the
question to ask before shipping is whether it is idempotent — and a snap, a clamp or a round almost
never is.

**BUG-15 — A pure module's tuned constants all lived at its call site, so porting the module alone
left it silently mis-configured. [12 Sep 2026, controller stickers Tasks 1 and 5]**

*What happened:* `js/lib/controller-sticker-surface.js` was ported from the frozen prototype
unchanged, as `controller-body.js` had been before it. It compiled, it ran, it planned and stamped
stickers — and it accepted placements **inside the stick wells and the ear bosses**, because the
keep-out discs are not in the module.

*Root cause:* the module takes everything tuned as `opt`: `opt.exclude` is every keep-out disc
(`const EXCL = opt.exclude || []`) and `opt.maxDistort` is the distortion tolerance
(`opt.maxDistort || 0.10`, **not** the tuned 0.14). Constructed with `{}` it has no keep-outs at all
and a tighter curvature budget, and neither shows up as an error — it shows up as a sticker painted
over a hole. A pure module is the easiest kind to port and, for exactly that reason, the easiest to
port half of: the file is self-contained, so the part that is *not* in the file is invisible while
you are reading it.

*Fix:* the call site is a **named constant next to the module's user**, `CTL_STICKER_OPT` in
`js/controller.js`, carrying the four discs and `maxDistort: 0.14` with the reasoning for each
beside it. A file-head comment in the module points at it in capitals, because the module is where
someone will look first.

*Verification:* `verify-controller-stickers.js` § 2 asserts each of the four keep-out centres refuses
with `ring` — **and then builds a second surface with `{}` and asserts it accepts all four**. Without
that second assertion the first four pass trivially against a surface that has no keep-outs, which is
the precise failure being guarded. The check tests the *config*, not the geometry.

*Lesson:* **when porting a module that takes an options object, port the call site in the same commit,
as a named constant — and write the assertion that fails when the options are absent.** A default that
is merely *different* from the tuned value (0.10 vs 0.14) rather than absent is worse again: there is
no throw, no warning, and the feature works, slightly wrong, forever. The general test for any
`opt.x || default` is "what does this do when nobody passes x?" — if the answer is "something
plausible", that line needs a harness.
**BUG-14 — A deferred lobby mount could land on top of a reopened Workshop, leaving it showing an
empty 0×0 stage whose every tap reopened the Workshop again. [14 Sep 2026, found while verifying the
Stickers tab]**

*What happened:* `tools/visual-controller-stickers.js` began failing intermittently — three runs in
four, six checks at a time, all of them the Task 8 real-click ones. The same six passed on other runs
of a byte-identical tree, which is what marked it as a race rather than a regression. It was not new:
the committed Task 8 tree failed two runs in three the same way, so the harness had been shipped green
by luck.

*Root cause:* `ctlMountLobby()` defers its real work through
`requestIdleCallback(start, { timeout: 1200 })`, and `ctlCloseWorkshop()` calls `ctlMountLobby()` on
its way out. A Workshop reopened inside that window therefore gets the **stale** callback landing on
top of it: `start` runs `ctlMount(el, …)` and moves the shared canvas back to `#lobby-controller`,
sets `ctlPressEnabled = false`, replaces `ctlOnTap` with the lobby's open-the-Workshop handler, and
rebinds the pointer to the lobby element — while `screen-workshop` is still the screen on show. The
stage measures 0×0 from then on. Reachable by a player, not just a harness: close the Workshop and tap
the ornament again straight away (the previous `ctlBindPointer` is still attached, so the tap lands).

*Fix:* one guard at the top of `start` — `if (!el.offsetParent && !el.getClientRects().length)
return;`. If the lobby mount is not on screen the callback is simply out of date. Same test
`ctlScheduleIdleNudge` already applies to its own deferred `fire`, which is the precedent this one
should have followed from the start.

*Verification:* a permanent check in `tools/visual-controller-stickers.js` closes the Workshop,
reopens it immediately, waits 1600 ms past the idle callback's own timeout and asserts the rig is
still in `#ctl-stage` at a non-zero size. Removing the guard turns exactly that one check red; with it
in place the harness ran five consecutive times at 44/0, against three-in-four failing before.

*Lesson:* **a deferred callback is a claim about the future, and by the time it runs the thing it was
written for may not be true any more.** Every `requestIdleCallback`/`setTimeout` that mounts, moves or
rebinds shared state needs a re-check of its own precondition at fire time — scheduling it is not the
same as being allowed to do it. The suite already had the right shape one function away and did not
reuse it.

*Second lesson — an intermittent harness is worse than a missing one, and it hides its own cause.*
The six failing checks were about clicks, so they read as click flakiness; the actual fault was that
the canvas had been moved out from under them, which no click-shaped hypothesis would ever reach. Two
wrong guesses (the 400 ms tap/drag threshold, a font-metric layout settle) were both killed by
measurement — the threshold logged 1–65 ms, and the decisive number was the mount point, not any
timing. **When a check fails intermittently, run the same tree several times and instrument the
environment the check depends on, not the assertion it makes.**

**BUG-13 — The Sylly Gateway's ASCII rule lines were counted characters, so they didn't reliably reach the frame's edge; the dashed side rails only wrapped the header, not the stream below it. [11 Sep 2026, owner playtest]**
*What happened:* the `////`, `====` and `----` header rules stopped visibly short of the right-hand dashed rail on the owner's device, and the green dashed side rails appeared to end where the header did — the loadout stream below had no visible frame at all.
*Root cause:* the rules were fixed-length strings of `/`/`=`/`-` characters at three different font-sizes/tracking values, each one a guess at how many characters happen to span the container's width at one specific viewport+font combination — correct nowhere in general. Separately, the `border-l-2 border-r-2 border-dashed` rails were applied only to the header's own wrapper div, which closed before the `#sm-gateway-log` stream div — so the rails never extended down through the stream despite the header comment's own claim that they "run the full height."
*Fix:* the three counted-character rules became CSS-drawn: a `repeating-linear-gradient` diagonal hash (`.sm-gw-rule-hash`, `css/styles.css`) for the `////` line, and native `border-top: double`/`border-top: dashed` for the `====`/`----` lines — all three span exactly 100% of their container at any width, by construction, with no character-counting involved. The header and the stream were merged into one `border-l-2 border-r-2 border-dashed` frame (header content wrapped in an inner `px-2` div, stream kept as a sibling inside the same frame) so the rails run the full height for real.
*Verification:* driven in a real headless Chromium session (Playwright, `visual-check` pattern), mid-stream and at the ACCESS GRANTED payoff, `getBoundingClientRect()` confirming the rule elements and the frame share the same left/right edges.
*Lesson:* an ASCII rule line built from a fixed character count is a per-viewport guess dressed as a horizontal line — it will look right on whatever device it was eyeballed on and wrong everywhere else. Where CSS can draw the same effect (a border, a gradient), it always spans the true container width; reach for that before counting characters. Applies to any future terminal/ASCII-styled screen — the pattern is already flagged as reusable if a second one is built.

**BUG-01 — The Secret Mode Terminal never ran a game's own lobby-entry side effects, leaving lazily-loaded game data (and `activeGameId`) unset. [11 Aug 2026, found testing PKO's Dinosaurs skin]**
*What happened:* selecting a PKO skin pack in the Konami Terminal and navigating straight to How to Play → Animals showed no rows at all — not even the mode-note text.
*Root cause:* PKO's chain data (`data/pko-data.json`) is fetched lazily, deliberately deferred to lobby entry rather than boot (see `pko-implementation-notes.md` DD-07) — the fetch fires from the `#btn-pko` click handler, which also sets `activeGameId`. The Terminal's launch path in `secret-mode.js` navigates straight to `game.screen` via `showScreen()` and never runs any per-game entry handler, so `pkoChain` stayed `null` and `pkoRenderChain()`'s `if (!body || !pkoChain) return;` guard fired silently. `activeGameId` was also left unset on this path for **every** game launched via the Terminal, not just PKO — a second, quieter bug (wrong sound-overlay theming) riding the same gap.
*Fix:* the Terminal's launch block now sets `activeGameId = game.id` and calls `pkoLoadChain()` when `game.id === 'pko'`, mirroring what `#btn-pko` does. No other terminal-listed game (li5, gm, ss, jec, nat, frt, shp, flw, pass, dyb) has an equivalent lazy per-game loader today, so no other game needs a call here yet.
*Lesson:* any lobby-entry side effect gated behind a game's own `#btn-[abbr]` handler is invisible to the Terminal, which is a second, independent entry point into the same screens. A game adding a new lazy loader in the `#btn-pko` pattern must also add itself to this same Terminal launch block — worth a `game.onEnter` hook if a third such loader ever appears (still ad-hoc at one).

**BUG-02 — The Terminal's ← BACK button was silently unreachable once the page scrolled past it; deeper navigation levels had no back button at all; and going back re-appended breadcrumb lines instead of removing them, so the log grew without bound. [11 Aug 2026, found testing PKO's Dinosaurs skin]**
*What happened:* testing the Dinosaurs skin via Konami Terminal → GAME SKINS → PKO → skin selection → the launch-armed ("ARMED") screen, there was no way back except closing the app. A first attempted fix (`position: sticky` on the header) made no visible difference. After adding proper back buttons, wandering forward/back/forward a few times made the log grow indefinitely (the same "SELECT GAME:" line appearing three times after two round trips).
*Root cause, three compounding bugs:*
1. `smRenderSkins()` (Select Skin) and the launch-armed view never got a "[←] BACK" list entry — only the *first* drill-down level under a category (Select Game/Select Pack, via `smAppendBackButton`) had one; everything deeper relied solely on the header's ← BACK.
2. That header button's own `sticky top-0` fix didn't work either: `#screen-secret-terminal` carried `overflow-y-auto` while also being `min-h-screen` (a floor, not a ceiling) — its content simply grows the box rather than ever overflowing it internally (`scrollHeight === clientHeight`, always, verified in a real headless browser). `overflow-y: auto` still establishes a CSS scroll container regardless of whether anything is currently overflowing it, and `position: sticky` binds to the *nearest* such container — so the header stuck relative to a scrollport that never itself moved, while the actual visible motion was happening one level further out, at the real page/viewport scroll.
3. Every forward-navigation function (`smSelectCategory`, `smSelectSkinGroup`, `smSelectSkin`) only ever **appended** its own "SELECTED"/"ARMED" breadcrumb lines to `#sm-terminal-log`, and every "return" function appended its own line on top rather than removing what the forward step had written — so the log grew on every round trip, however many times the player wandered back and forth.
*Fix:* `smAppendBackButton(wrap, handler)` now takes an optional one-step-back handler instead of always jumping to categories; `smRenderSkins()` gets `smReturnToSkinGames()`, and the launch-armed view gets a new `[←] BACK` button (positioned *above* `[ LAUNCH SEQUENCE ]`, matching every other level) wired to `smReturnFromLaunch()` — shared by both the skin and word-pack flows since they share one `#sm-terminal-launch-wrap`, branching on whether the active expansion `isAsset`. Dropped the inert `overflow-y-auto` from `#screen-secret-terminal` entirely, letting `position: sticky` bind to the real page scroll. Log growth fixed with a small LIFO checkpoint stack — `smLogCheckpoint()`/`smLogRewind()` — a forward step pushes the log's current length before writing, a return pops and truncates back to it instead of appending, so the log always shows only the current path.
*Verification:* driven in a real headless Chromium session (not a `tools/verify-*.js` harness — none of them touch the Terminal or do layout), asserting `getBoundingClientRect()` after an actual `mouse.wheel` scroll, confirming a genuine Playwright pointer `.click()` (which fails if the target isn't actually visible/actionable, unlike a programmatic `el.click()`) lands on the header button post-scroll, and walking a multi-step wander-forward-and-back sequence to confirm the log stays at a fixed length.
*Lesson:* a `position: sticky` fix that "looks right" in markup can be silently inert if an ancestor's `overflow` property establishes a scroll container that itself never scrolls — the visible motion the user sees can be happening on a *different* ancestor than the one sticky is bound to. Confirming a CSS fix like this needs a real scroll (`mouse.wheel`, not a programmatic click that bypasses visibility) and a `getBoundingClientRect()` check, not just visual inspection of the class list. Separately: any UI that writes an append-only log/breadcrumb as the user navigates needs an explicit undo mechanism for "back," not just a forward-only writer — the growth is invisible in a quick test and only shows up after genuine wandering, which is exactly how a real user (not a scripted test) behaves.

**BUG-06 (suite-wide sweep) — three games had an unguarded SYNC applier that Firebase's empty-collection erasure could break; two more had lower-risk instances hardened while auditing. [13 Aug 2026, `deferred-work.md` "BUG-06 class audit"]**
*What happened:* an Explore-agent audit of every game's `HandleEnvelope`/`mpHandleEnvelope` SYNC appliers (the class of bug CJAR's own BUG-06 established, `logic-engine.md` § "Firebase erases every EMPTY value") for direct payload-to-collection assignments with no `|| []`/`|| {}` fallback.
*Confirmed live risks:*
1. **LTTP** — `lttpDecoys` is set to `[]` by `lttpNarrowHighlights()` at Plan 2 (`js/games/lttp.js`), which is a step **every** match reaches, then broadcast and applied unguarded (`lttpDecoys = [...p.decoys]`) at both `LTTP_GAME_START` and `LTTP_PLAN_UPDATE` in `engine-multiplayer.js`. `[...undefined]` throws — guaranteed crash on a client mid-match, not an edge case.
2. **GTH** — `gthAllDiagnoses[payload.playerIdx] = payload.diagnoses` (`gth.js` `GTH_DIAGNOSES_SUBMIT` applier): a player who runs out of time before diagnosing a single case sends `diagnoses:[]`, which Firebase erases; the slot was set to `undefined` instead of `[]`, breaking `gthResolveScores`'s iteration over it.
3. **NT** — `ntPtpPlacements = payload.allPlacements` (`nt.js` `NT_PLAYBACK` applier): a player who spends no build inventory in a cycle submits `placements:[]`; Firebase drops that one array entry, turning the whole `allPlacements` array into a hole-having object keyed by index rather than a plain array, and the very next line's `.map()` throws.
*Also hardened (lower risk, no live-play trigger found, but same unguarded shape and one-line to fix):* DSD's `dsdSequence = env.payload.sequence` (crew's tap sequence — currently gated non-empty by its own submit-button UI, but the applier itself had no fallback), JEC's `jecInputs = p.jecInputs.map(...)` (per-seat `[v1,v2,v3]` arrays, structurally near-impossible to be empty but unguarded). PASS's `PASS_GAME_START` applier carried a stray **second, unguarded** `passChips = payload.chips.map(c => c)` immediately after an already-correctly-guarded `passChips = (payload.chips || []).map(...)` one line above — deleted the redundant line rather than guard it twice.
*Not touched:* GM, BLD, SS, and DYB's remaining unguarded assigns — audited and judged structurally non-empty at every broadcast point (fixed player-count arrays, or collections that can't be zero-length by the time the round state that carries them resolves). FRT/SHP/FLW/PKO already use per-seat normaliser helpers matching the CJAR reference pattern and needed no changes.
*Fix:* `[...(p.field || [])]` / `Array.from({length: N}, (_,i) => (p.field && p.field[i]) || [])` at each confirmed site — same idiom `logic-engine.md` already documents, just applied where it was missing. NT's fix rebuilds per-seat (`Array.from`) rather than a flat `|| []`, since the risk there is a *hole inside* the array, not the whole field being absent.
*Verification:* syntax-checked all five touched files (`node -c`); re-ran `verify-cjar-dd.js` (47) and `verify-cjar-loop.js` to confirm the CJAR-adjacent edit in the same sweep didn't regress. **LTTP/GTH/NT/DSD/JEC/PASS have no `tools/verify-*.js` harness** (only CJAR/PKO/DYB/SHP do — see `CLAUDE.md` § Verification harnesses), so these fixes are unverified by any automated MP-shaped check; they haven't been played live either. Flag for the retest backlog when each game comes up.
*Lesson:* the audit only found live risk in games whose collection field can legitimately be **empty at the moment it's broadcast** — a player who does nothing (times out, spends no inventory, narrows to zero decoys) is the trigger, not player *count* going to zero. When auditing a new game's SYNC appliers for this class, ask "can a participating player's contribution to this field legitimately be empty?" before "is this array ever unguarded?" — the latter is true almost everywhere and isn't itself the signal.

**BUG-07 — A client whose HANDSHAKE hadn't been processed into the host's roster snapshot before `GAME_START` fired got `mpMyPlayerIdx = -1`, silently corrupting shared state instead of failing visibly. [15 Aug 2026, found live-testing NT MDLM with 3 players — 1 host, 2 clients]**
*What happened:* host + 2 clients in an NT lobby; host clicked "Start Game" while (it's believed) the third player's join was still completing. That device ended up showing itself as **"ADMIN-0"** — the literal string `'ADMIN-' + (mpMyPlayerIdx + 1)` produces with `mpMyPlayerIdx = -1` — while the other two devices proceeded as if only 2 players existed. The affected device stayed visually "tied to" the host (each of its actions appeared to route through/require the host), the build screen went blank ("black terminal") for the two non-host devices for one round, self-corrected the round after, and the final System Logs showed only 2 of 3 players for the first 4 rounds before showing all 3 on the last.
*Root cause:* `engine-multiplayer.js`'s `GAME_START` client-side applier (`mpHandleEnvelope`, `env.payload.action === 'GAME_START'`) computed `mpMyPlayerIdx = slots.findIndex(p => p.uid === window.syllyDeviceUid)` with **no fallback for `-1`** — unlike the *host's* equivalent computation in `mpConfirmRoster()`, which already guards this with `if (mpMyPlayerIdx < 0) mpMyPlayerIdx = 0;`. A `-1` index left every array this device later touched (`ntGateReadyCheck[mpMyPlayerIdx]`, `ntPtpPlacements[mpMyPlayerIdx]`, `ntPlayerNames[mpMyPlayerIdx]`, and the equivalents in every other MDLM game — this is generic engine code, not NT-specific) silently writing to a non-index object property instead of a real array slot, which every array method (`.every`, `.map`, `.forEach`) then skips over.
*Why "assume seat 0" (the host's own fallback) is wrong for a client:* the host's fallback is defensible only because the host, by construction, always **is** slot 0 — it's genuinely "assume I'm the host," which is trivially true when it's the host's own code running. Copying that same fallback onto the client side would have been actively harmful, not protective: it would make a late-joining client's device *impersonate the host's own seat*, which is a very plausible explanation for the "tied to the host" symptom actually observed.
*Fix:* the client-side applier now checks `myIdx < 0` explicitly and, on a miss, shows a new dedicated overlay (`mp-roster-mismatch-overlay` — "Match Already Started") and returns *without* calling `mpActiveGameConfig.onPassThePhone()`, instead of silently proceeding into the game with a broken index. The overlay's only button calls `resetToLobby()`. Added to `resetToLobby()`'s overlay-teardown list in `engine.js` alongside the other `mp-*-overlay`s.
*Not yet fixed — the actual race:* this closes the silent-corruption failure mode (a device can no longer end up playing with a broken index), but does **not** address *why* the host's `mpPlayerSlots` snapshot could be missing a player who believed they'd already joined and named themselves. `mpConfirmRoster()` reads `mpPlayerSlots` synchronously at click-time; a `HANDSHAKE` envelope for a very-recent joiner is processed asynchronously via the events channel (`mpHandleEnvelope`, `env.type === 'HANDSHAKE'`, which does `mpPlayerSlots.push(...)`) and there's no synchronisation between "did every currently-connected client's HANDSHAKE actually land before I read this array." A tighter fix would re-read the live `/rooms/{code}/players` node at confirm time rather than trusting the host's in-memory snapshot — not implemented here since it's unverified without live reproduction and touches the same host-side confirm path every MDLM game depends on. Flagged for the deferred-work retest backlog.
*Verification:* syntax-checked (`node -c`) only — this is unverified by any live multi-device session or by any `tools/verify-*.js` harness (all of which run in `'single'` mode and can't reach this code path at all, since it only fires on a real client receiving a real Firebase envelope — see `logic-engine.md` § Verification harnesses "blind spot"). Needs a genuine 3-device retest, ideally with a deliberately-delayed third join, before this can be called closed.
*Lesson:* when a codebase already has a defensive fallback for a failure mode in one place (here, the host's `if (idx < 0) idx = 0`), check whether the *parallel* code path (the client's mirror-image computation) has the same guard before assuming symmetry — and check whether the same fallback value is even correct on both sides. It wasn't here: "assume slot 0" is safe reasoning for code that only ever runs as the host, and unsafe reasoning for code that runs as a client.

**BUG-06 addendum — the sweep's method is structurally blind to collections NESTED inside an assigned object, and NT was carrying two of them. [15 Aug 2026, found root-causing an NT MDLM 3-player desync]**
*What happened:* the 13 Aug BUG-06 audit swept every game's SYNC appliers and declared NT clean after one fix (`ntPtpPlacements = payload.allPlacements`). A live 3-device NT session two days later produced blank build grids and unreachable playback on clients — **two more instances of the identical class**, in the same file, that the sweep had walked straight past.
*Root cause of the MISS (the part worth keeping):* the audit's search shape was "find appliers that assign a payload field directly to a state collection without `|| []`". Both NT defects pass that test cleanly:
- `ntNode = payload.node` — assigns an **object**, not a collection. The erased field is `node.nativeHoneypots`, one level down.
- `ntPtpTimelines = payload.timelines` — assigns an array **of objects**, and the array itself is never empty. The erased fields are `timelines[i].fires` / `.slowSpans`, **two** levels down.

An applier-level scan cannot see either. The erasure lands wherever a *leaf* collection sits in the payload tree, and the assignment at the top of that tree looks entirely healthy.
*Why they survived so long anyway:* both are **client-only and probabilistic**. The host never round-trips its own state through the wire, so a host-side playtest is clean by construction; and both triggers are ordinary-but-not-constant (`convertN` rolling 0 for the node, a player placing no honeypots for the timeline), so they present as random intermittency rather than a reproducible bug. NT also had **no** `tools/verify-*.js` coverage at all, and even the harnesses that do exist elsewhere run `'single'` mode with `getElementById: () => null`, which executes no render code — and both defects throw *inside render functions*.
*Fix:* per-shape normalisers applied where the object arrives (`ntNormaliseNode`, `ntNormaliseTimeline` in `js/games/nt.js`) plus `|| []` at the previously-unguarded read sites. Detail: `nt-implementation-notes.md` BUG-15/BUG-16.
*Lesson — how to run this audit properly next time:* scan by **payload shape, not by applier line**. For every SYNC packet, walk the payload tree the *producer* builds and list every leaf array/object, then ask of each one "can this legitimately be empty at the moment it is sent?" — that finds nested leaves an applier-level grep never will. Two concrete tells that a nested leaf is at risk: (1) its length is decided by a random roll or a player doing nothing, and (2) the same field is guarded with `|| []` somewhere else in the file — an inconsistent guard is direct evidence that someone already hit the empty case on one path and patched only that one. NT had `|| []` on five of seven reads of the same two fields, which in hindsight was the loudest possible signal.
*Re-sweep done — PKO, FLW, SHP, CJAR all clean [30 Aug 2026].* Walked every SYNC producer's
payload tree in the four plugins and listed each leaf array/object. **No nested-leaf erasure
defects.** Every leaf collection — including the two genuine nested cases, SHP's `hands` (an
array of per-seat hands, empty `[]` for an eliminated seat) and CJAR's `raidHistory` (an array
of per-Raid rows) — is rebuilt on receipt by a length-aware normaliser that indexes rather than
trusting the wire shape: `shpNorm2D` / `shpNormBool` (SHP), `cjarWireArr` / `cjarWireList` /
`cjarWireObj` (CJAR, incl. `cjarWireList(p.raidHistory).map(r => cjarWireArr(r, n, 0))` for the
nested rows), and consistent `p.x || []` / `p.x || state` at every read site (PKO, FLW). PKO and
FLW broadcast **no** nested per-seat objects at all — their private hand packets (`PKO_HAND`,
`FLW_HAND`) carry a flat `cards`/`gemId` guarded `|| []` in every applier. One harmless
inconsistency noted, not fixed: SHP_DEAL assigns `shpMoonsHeld`/`shpEliminated` raw where
SHP_DOZE/SHP_NIGHT_END guard the same fields `|| state` — safe because both are always sent as
fully-dense arrays of `0`/`false`, which Firebase never erases (only `null`/`{}`/`[]` are).

*Re-sweep done — GTH/DSD/JEC/LTTP; one confirmed client crash in GTH, one low DSD hardening [30 Aug 2026].*
Same method — walked every SYNC producer's payload tree in the four plugins.

- **GTH — CONFIRMED, fixed.** `GTH_FINAL_SCORES` sends `revealItems: revealItems` raw; each item's
  `correctShrinks` is built as `[]` and pushed to only when a shrink diagnosed that drawing
  correctly, so a drawing nobody cracked carries `correctShrinks: []`. Firebase erases the nested
  `[]`; the applier (`gthHandleEnvelope`) assigned `gthRevealItems = payload.revealItems` raw, and
  `gthShowBigReveal()` then does `item.correctShrinks.length` → TypeError on the client, inside a
  render function, stranding it on the Big Reveal. Client-only (host sets `gthRevealItems` locally
  before any round-trip) and near-certain to fire — across ~6 drawings P(≥1 all-zero) is >80% even
  at 50% per-shrink accuracy, higher under blur / Deep Dive. Almost certainly means MDLM GTH's Big
  Reveal has never worked (no harness, never played live — see the 13 Aug entry). *Fix:*
  `gthRevealItems = (payload.revealItems || []).map(it => ({ ...it, correctShrinks: it.correctShrinks || [] }))`
  plus `gthScores = payload.scores || []`. Nested-leaf erasure, exactly this addendum's class —
  the applier-level assignment looked healthy.
- **DSD — low, hardened.** `DSD_GAMEOVER` broadcasts `turnLog: dsdTurnLog` **raw**, where
  `DSD_EXECUTION_RESULT` maps the same structure through `outcomes: [...(e.outcomes || [])]` — the
  addendum's "inconsistent guard" tell. `dsdRenderDeploymentHistory` (dsd.js ~1074) then does
  `t.outcomes.map(...)` unguarded (with an `|| 'No outcomes recorded.'` fallback *after* the throw
  point). No confirmed path makes a logged turn's `outcomes` empty — every executed turn reveals
  ≥1 tile and pushes ≥1 outcome — so latent, not live. Guarded the read `(t.outcomes || []).map`.
- **JEC — clean.** Thoroughly hardened already: `jecWireArr` / `jecWireObj` / `jecWireList` at every
  read site, nested-aware (`jecWireArr(p.jecInputs, n, null).map(a => jecWireArr(a, 3, ''))`,
  `bonus` rebuilt field-by-field), with explicit in-code comments about the erasure. The
  `jecInputs` inner `[...a]` the 13 Aug sweep flagged as "unguarded but structurally near-empty"
  is now fully covered on receipt.
- **LTTP — clean.** The 13 Aug `lttpDecoys` fix is confirmed in place (`[...(p.decoys || [])]` at
  both `LTTP_GAME_START` and `LTTP_PLAN_UPDATE`) and it also covered the sibling `lttpFakeTargets`.
  `lttpVotes` is guarded `|| {}` with a matching object type. Remaining unguarded reads
  (`new Set(p.highlights)`, `snap.highlights.length` in the plan-log carousel) have **no path to
  empty** — `lttpHighlights` always retains `lttpAddressIdx`, so every `[...lttpHighlights]`
  snapshot is ≥1. One cosmetic inconsistency: `LTTP_PLAN_UPDATE` reads `new Set(p.lapAnswered)`
  without the `|| []` that `LTTP_TURN_ADVANCE` uses — harmless because `new Set(undefined)` is the
  intended empty Set.

*Verification:* `node -c` on the two touched files only. GTH and DSD have **no** `tools/verify-*.js`
harness and neither fix is played live — flag for the retest backlog. `docs/deferred-work.md` updated.

**BUG-08 — The faceplate's phantom dependency on `sticker-surface.js`. [11 Sep 2026, controller integration Task 3]**
*What happened:* the prototype's `redraw()` looked like it needed `sticker-surface.js` (a 40 KB
module) via `buildPlateUV()` → `SURF.toAtlas()`, which the integration plan initially assumed had
to be vendored or reimplemented for the colour-only Workshop.
*Root cause:* `toAtlas(x,y,back)` is `WARP_D <= 0 || !U.warpXY ? plainAtlas(x,y,back) :
plainAtlas(U.warpXY(x,y,back))` — and `warpXY` is never assigned onto `geo.userData` anywhere in
`body.js`. `sticker-surface.js` only ever *reads* `warpXY`; nothing ever writes it. So in the
shipped prototype, `toAtlas` **always** resolves to `plainAtlas`, and the warped branch has never
once executed. The same reasoning kills the second apparent dependency, `padEdges()` (seam-bleed for
a sticker wrapping the rim) — with no stickers the atlas is a uniform fill on both sides of the rim,
so the bleed is a copy of a colour onto itself.
*Fix:* ported the eight-line `plainAtlas` computation directly (`ctlPlainAtlas` in
`js/controller.js`), bit-identical to the prototype's actual (not intended) output. No sticker
module, no `StickerSurface` build cost (multi-hundred-ms on desktop per the prototype's own
`design brief`), zero behaviour change.
*Lesson:* trace a dependency to the branch that **actually executes** before planning around it — a
`.warpXY`-shaped conditional reads as "this is wired up" from the call site alone, and only tracing
where the property would be *set* reveals it never is. An eight-line port replaced a 40 KB module.

**BUG-09 — A bump/height atlas whose data is always zero is not a texture, it's four wasted canvases. [11 Sep 2026, controller integration Task 3]**
*What happened:* the prototype pairs every colour atlas with a same-size greyscale height atlas so
a sticker's edge lights as a raised lip (`bumpMap`/`bumpScale` on the shell/ear materials).
*Root cause:* a bare, colour-only shell has height **zero everywhere** — there is no sticker to
raise a lip for. The height atlas would be a uniformly black canvas: real memory (two more full-size
canvases beyond the two colour atlases, on a phone) buying literally nothing to look at.
*Fix:* dropped both height atlases and the `bumpMap`/`bumpScale` material properties entirely for
this colour-only feature; the sticker sub-project restores both when it has real height data to
encode.
*Lesson:* a data texture whose data is provably uniform is a constant, not a texture — check whether
a planned resource's *content* could vary at all before allocating it, not just whether the upstream
code path supports it.

**BUG-10 — Deleting `#lobby-icon` is a parse-time hazard, not a tidy-up. [11 Sep 2026, controller integration Task 4]**
*What happened:* replacing the lobby's 🎮 emoji div (`#lobby-icon`) with the new 3D controller mount
looked like a pure markup swap.
*Root cause:* `secret-mode.js` bound a 7-rapid-tap listener to `#lobby-icon` at the file's **top
level** — `document.getElementById('lobby-icon').addEventListener(...)`, executed at parse time, not
inside a function. Removing the element without also removing that listener means
`getElementById` returns `null` and `.addEventListener` throws **immediately on script load**,
which would have taken the entire `secret-mode.js` file down (every function declared below the
throw point, including `smShowArcadeTile`, `smHandleButton`, the whole Terminal) before any of it
ran — with no error surfaced anywhere near the actual markup change.
*Fix:* the listener block and its two supporting `let`s (`smLobbyTapCount`/`smLobbyTapTimer`) were
deleted in the same commit as the markup change, never left to be cleaned up "later."
*Lesson:* an element with a top-level (non-function-scoped) `getElementById(...).addEventListener`
anywhere in the codebase is load-bearing for that entire script file's ability to parse and run —
grep every id being deleted from markup against the whole codebase, not just the game/screen that
visibly uses it, before deleting it.

**BUG-11 — A rAF loop and a timer-driven stream both need their own reduced-motion check; the global CSS block reaches neither. [11 Sep 2026, controller integration Tasks 3 and 7]**
*What happened:* two independent pieces of this feature — the controller's spin-down-and-settle
physics (`ctlTick`, a `requestAnimationFrame` loop) and the Sylly Gateway's streaming loadout log
(`smGatewayStream`, a chain of `setTimeout`s) — both animate by writing JS state/DOM directly, frame
by frame or line by line.
*Root cause:* the suite's global `@media (prefers-reduced-motion: reduce)` block (`css/styles.css`)
works by collapsing `animation-duration`/`transition-duration` to near-zero. That reaches every CSS
`transition`/`@keyframes` in the app for free, but it cannot reach a `requestAnimationFrame` callback
or a `setTimeout` chain — neither is a CSS animation, so the block has nothing to zero.
*Fix:* both files carry their own `matchMedia('(prefers-reduced-motion: reduce)')` check
(`ctlReducedMotion()` in `js/controller.js`, `smReducedMotion()` in `js/secret-mode.js`) and honour
what the standard actually asks — **nothing travels**, not "the feature is skipped." A released
controller stops coasting instead of spinning down (§ ui-style.md § Motion Standard's rule already
named this pattern; `combReducedMotion()` was the first instance). A reduced-motion gateway writes
the whole 26-line loadout via `textContent` in one frame and reveals ACCESS GRANTED immediately —
the same information, no journey.
*Lesson:* any hand-rolled animation loop (rAF or chained timers) is invisible to the global
reduced-motion CSS block by construction and needs its own JS-side check — this is not a one-off for
this feature, it is a standing requirement (already documented in `ui-style.md` § Motion Standard)
that a new rAF/timer-driven feature must re-derive rather than inherit for free.

**BUG-12 — A single raycast against a small curved button misses exactly at the edges a fingertip is
least precise about. [11 Sep 2026, controller integration polish]**
*What happened:* owner playtest on the real page found the D-pad and the four face buttons hard to
press at their edges — a cursor that looked like it was over the button often registered nothing,
worse the further the controller had been spun off dead-centre (a rotated button's screen-space
footprint foreshortens).
*Root cause:* `ctlTryPress` cast exactly one ray per pointer event, through the literal pixel the
event reported. A phone touch is never that precise, and the button meshes themselves (ported,
load-bearing geometry shared with the Konami direction read) were never a candidate for padding —
enlarging them would also change what a press *looks* like, not just where it lands.
*Fix:* `ctlTryPress` now tries the exact point first, then a small ring of 8 screen-space offsets
around it (`CTL_PRESS_FUDGE_PX`, ±6px cardinal / ±5,5px diagonal), taking the first that hits a
pressable and isn't occluded by the shell. Measured against a real mount: a single ray misses past
~10–11px from a button's screen centre; with the fudge ring that extends to ~16–17px — roughly 60%
more effective radius — with zero vertices touched.
*Lesson:* when a hit-test problem is really "the input is imprecise, not the target is wrong", widen
the *search*, not the geometry. This generalises to any small raycast-against-a-3D-mesh hit target on
a touch surface — padding the mesh changes its appearance; padding the ray does not.

**TG-13 — Three hand-drawn attempts at the how-to diagram's controller silhouette all failed; the
real outline was extractable under Node the whole time. [11 Sep 2026, controller integration polish]**
*What happened:* the Step 1 how-to diagram (`#ctl-how-to-overlay`, `index.html`) needs a flat 2D
silhouette of the controller's front. Three attempts — a plain rounded rect, two ellipses glued
behind a pill, then a Catmull-Rom curve through 8 hand-estimated landmark points read off a
screenshot — all shipped and all were visibly wrong against the real render, because every attempt
was a guess at the shape rather than a measurement of it.
*Root cause:* the real shape was never actually unreachable — it was sitting in
`js/lib/controller-body.js` the whole time. `buildBody()`'s shell is a `THREE.Shape` whose
`extractPoints(64).shape` becomes `geo.userData.poly` (641 points, in the same local units the SDF
and every button `seat()` call already use) — a load-bearing field `ctlBuildPlateUV` already reads
for the faceplate map. `buildEars()` is even simpler: two full ellipses, `rx=.36, ry=.52`, seated at
`x=±0.84, y=0.80, z=-0.44` with `rotation.x=-0.30, rotation.z=∓0.12` — hard-coded literals, not
derived at runtime. None of this requires a browser: `tools/verify-controller-body.js`'s own loader
(`global.window=global; require('three.min.js'); require('controller-body.js')`) is enough to call
`CB.buildBody(THREE,{}).userData.poly` and `CB.buildEars` and read the real numbers back under plain
Node — proven working, see the command below.
*Fix (APPLIED 11 Sep 2026):* the diagram is now **generated, not drawn** —
`tools/gen-controller-diagram.js` projects the shell's `poly` (x,y direct, no z; this is a flat
schematic, not a 3D render — flip y for SVG's downward axis), both ear ellipses (`ry *= cos(0.30)`
for the `rotation.x` foreshortening, and `rotation.z` becomes a `+side*.12`-radian SVG `rotate()`
once y flips), the two shoulder bands (the real `buildShoulder` arc `s=1.35..2.34` with its radial
span, which is why they read as bumpers standing proud of the rim) and every control position,
through **one uniform map** into the viewBox, then Douglas-Peucker's the 641-point outline down to
~70 for the markup. Re-run it and paste the block over the one in `index.html`; do not hand-edit
the numbers. Extraction command, if you only want the raw numbers (confirmed working):

```bash
node -e "global.window=global; const THREE=require('./js/lib/three.min.js'); require('./js/lib/controller-body.js'); const U=global.window.ControllerBody.buildBody(THREE,{}).userData; console.log(U.poly.length, U.minx, U.maxx, U.miny, U.maxy);"
```

*The second thing the measurement exposed, which none of the three hand-drawn attempts could have
seen:* the diagram's **button positions were wrong too** — and "wrong" in a way that looked fine.
Fitting an affine map from the real control coordinates to the drawn ones gives a clean x fit
(51.0 px/unit, residuals ≤ 11 px across nine controls) and a hopeless y one: the drawn layout runs
at **125.6 px/unit vertically, 2.46× its own horizontal scale**. Select/Start had been drawn *below*
the D-pad when they really sit above it, and the face cluster was drawn at 1.8× its true radius. At
the drawn y-scale the real body would be 568×414 px in a 440×320 viewBox — so **no affine map of the
true outline could ever have contained those buttons**, at any scale. The silhouette had been
repeatedly redrawn to fit a button layout that was itself the thing out of true. Every position is
now projected through the same map as the outline, and the leaders re-routed to match.

*Verification:* the check that actually settles it is an **overlay**, not a side-by-side. Drive the
Workshop in Playwright, set `ctlRotX`/`ctlRotY` to 0 (**bare** assignment — they are top-level `let`
bindings, see the `window.` prefix rule), push the camera to `fov 5` at `z 60` for a
near-orthographic square-on view, hide `ctlFloor` so the ground shadow can't pollute the scan, and
**call `ctlRenderer.render()` by hand** — the tick loop is on-demand and idles, so setting the
rotation alone changes nothing on screen. Then find the shell's bbox by colour (blue clearly above
green separates purple shell from grey shadow) and stroke the generated path over it at that bbox.
Aspect agreed to 2.8% and the outline tracked the rendered edge all the way round.

*Lesson:* before hand-authoring a 2D approximation of something that already exists as real geometry
in the codebase, check whether the geometry itself is reachable under Node first — a pure-function
extraction of the real numbers is strictly cheaper and strictly more accurate than any number of
screenshot-and-eyeball iterations, and this project's whole "pure half above the RENDERER marker"
split (see the file header of `js/controller.js`) exists specifically to make that kind of headless
extraction possible.

*Second lesson — when one element keeps coming out wrong, measure the things around it too.* Three
attempts treated the silhouette as the defect because the silhouette was what looked wrong. It was
being redrawn each time to sit around a button layout that was itself 2.46× out of true, so no
correct silhouette could ever have looked right there. A hand-drawn neighbour is not a fixed point
to fit against — the moment real numbers are available for *one* element of a composition, check
them for **all** of it, or you calibrate the measured part against the unmeasured error.

---

**BUG-21 — a deferred-work priority pass, batched (26 Sep 2026, Tier-0/1, one closure pass).**
Reviewing `docs/deferred-work.md` for priority/effort/value surfaced a batch of small, independent
items; fixed together as one round per the Task Triage Gate's batching rule rather than one cycle
each. All harness-verified; full context for each lives in the (now-resolved) `deferred-work.md`
entry it replaces.

- **`verify-cjar-loopback.js`'s ~20–25% flake was a test bug, not RNG variance.** The Dibber Dobber
  payout-beat scenario (3 takers, 1 innocent, 0 dobbers) hits `cjarBeginFlipAnim`'s "takers +
  innocents, no dobbers" branch (heads = takers.length + innocents.length, remainder always 0), but
  the test computed its expected count from the *pure takers-only* formula instead — the two only
  agreed when the random card's value happened not to be a multiple of 3, which is exactly the
  ~20–25% failure rate both prior investigations measured without finding the cause. Fixed by
  deriving the expected count from the branch the game actually takes. 30/30 clean runs after the
  fix; no seeding was needed. *Lesson: when a real-shuffle harness fails at a rate that lines up
  with a simple modular fraction (1/3, 1/4…), suspect the assertion's own arithmetic before reaching
  for a seed — a seed hides a wrong formula's dependence on the random input instead of fixing it.*
- **`ntRoutingTimer`** (`js/games/nt.js`) was the one timer handle missing from `ntResetState()` —
  added next to `ntLongPressTimer`/`ntResolveGuard` (§ Timer Lifecycle, `logic-engine.md`).
- **`screen-mp-mode`'s offline notice** promised Pass-the-Phone to the 11 MDLM-only games that have
  none. `mpShowModeScreen()` (`js/engine-multiplayer.js`) now branches the copy on
  `cfg.supportedModes.includes('ptp')`. The Host/Join buttons were already correctly dimmed by
  `mpBuildModeSection`'s pre-existing `dimmed = isLobby && !online` — only the copy was wrong.
- **The 3D controller had no environment map (DD-14)** — `ctlBuildScene()` set no
  `scene.environment`, so `ctlShellMat`'s matte plastic (roughness .52, metalness .06) had nothing to
  reflect but the three point lights, reading flatter than the same material in `wip/premium/`.
  Fixed with a ~15-line port of `prmBuildEnvMap()` (four emissive planes through
  `THREE.PMREMGenerator`, zero assets) into `ctlBuildScene()`, retuned to the controller's own
  three-point rig. `visual-controller-stickers.js` (59 checks, real Chromium/WebGL) confirms no
  regressions.
- **Two dead screens removed**, both confirmed unreachable before deletion (no caller, no `[?]`, no
  button anywhere): SHP's `shp-tip-overlay` (Counting Sheep's tap-hold-to-gallery pattern already
  covers the "explain this card" need it was scaffolded for) and LTTP's `screen-lttp-role-reveal`
  (role info was already folded into the Chat screen's own header). Each removal took its markup,
  renderer/handler, `allScreens[]` or `resetToLobby()` teardown entry, and doc references together.
- **Two copy-drift fixes, paired with their identity docs** (`node tools/verify-identity-docs.js`
  green): PKO's Culling interstitial blurb described Extinction Event's effect, not its own — now
  matches `pkoFireCulling()`/`PKO_EVENT_DETAIL`. CJAR had three: "Take" vs the renamed "Reach In"
  button, a hardcoded "Five Raids" heading (wrong on Quick Snack), and two case variants of the same
  caption.
- **CLAUDE.md's Current Focus claimed all phase gates were closed** while `docs/phase40-snapshot.md`
  itself says Cold Shoulder's is still open — corrected to name phase 40 as the open one.

---

**BUG-22 — `encodeURIComponent` on a whole relative path also encodes its own `/`, silently 404ing
any manifest entry that points into a subfolder (26 Sep 2026, `js/lib/music.js`).**

*What happened.* Promoting jukebox songs into `data/music/manifest.json` (deferred-work.md's Sylly
Mode tracks job, step 2) reused the existing files under `data/music/jukebox/` rather than
duplicating ~40 MB of audio — 16 games' entries got `"file": "jukebox/<id>.mp3"`. `loadBuffer()`
built the fetch URL as `TRACK_DIR + encodeURIComponent(entry.file)`, and `encodeURIComponent` treats
`/` as a character to escape, not a path separator: `"jukebox/ready-set-cook.mp3"` became
`"jukebox%2Fready-set-cook.mp3"`, which does not exist. Every one of the 16 promoted tracks would
have silently failed to load.

*Why it was never hit before.* Every `file` value in every manifest this suite has shipped —
`data/music/manifest.json`'s original four, `data/music/jukebox/manifest.json`'s 25, every skin/word
pack — has always been a bare filename with no subpath, because each manifest lives next to its own
files. This is the first `file` value to ever point *across* a folder boundary, and the encoding bug
was there from the day the module shipped (28 Aug 2026); nothing had ever exercised the branch.

*Why it stayed invisible even after landing.* `loadBuffer()`'s `catch (_) { return null; }` is
correct and deliberate — a truncated/corrupt/absent track must never break a game screen — but the
same guard that makes a missing file harmless also makes a *wrong URL* harmless. The failure mode is
identical to "no music generated yet": the game plays the lobby fallback, nothing throws, nothing
logs. Caught here only because the URL was worked out by hand and inspected before trusting it, not
by any harness — no headless check calls `Music.playFor` and asserts a real fetch succeeded, because
`js/lib/music.js` predates the loopback/mock-DOM pattern and nothing has needed one since.

*Fix.* Encode each `/`-separated segment individually and rejoin with the literal separator:
`entry.file.split('/').map(encodeURIComponent).join('/')`. A plain filename (no `/`) is unaffected;
a subpath now survives. One call site, one line.

*Lesson.* **A "never breaks the screen" catch block hides a broken URL exactly as well as it hides a
genuinely missing file — silent-by-design failure paths need to be tested by inspecting the request,
not just by confirming nothing crashes.** And: the first time a data shape is used in a new way (a
`file` field crossing a folder boundary, here), re-read the function that consumes it rather than
assuming a value written correctly is read correctly — `encodeURIComponent` is right for a filename
and wrong for a path, and nothing about the manifest's own schema said which one `file` was.

---

## Multiplayer Lessons

### ML-01 — A lobby bound that reads game state reads it before the game has run [23 Aug 2026, SW v210]

*What happened:* five games (SS, JEC, YGI, LTTP, DSD) capped their Lobby Mode rooms below what
their own Pass-the-Phone setup offered — JEC/YGI at 4 instead of 6, LTTP at *exactly* 4, SS and DSD
at 2v2 instead of 3v3. A 5th player's join was rejected with nothing anywhere explaining why.

*Root cause:* `getMaxPlayers`/`getMinPlayers` in `MP_GAME_CONFIGS` resolved against a game-local
setup variable — `ssPlayerCount`, `jecPlayerCount`, `ygiPlayerCount`, `lttpPlayerCount`,
`dsdPlayersPerTeam`. Every one of those variables is moved by count pills on a **setup screen that
Lobby Mode skips entirely**, so at the two moments a bound is actually read —
`mpRenderHostPlayerList()` while the room fills, and the room node's `maxPlayers` at create time —
the variable is still sitting at its declared default. Each game's `onPassThePhone` *does* overwrite
it from the roster, but that runs after the lobby has already filled, which is exactly why the bug
looked fine in code review: the assignment is right there, just at the wrong end of the timeline.

*Lesson:* **a lobby bound is not a game setting; it is a property of the game.** Return the true
range as a constant. The only extra input that can be correct is `window.mpLobbyStyle` (a TLM room
is 2 devices where an MDLM room is N) or a **pre-lobby** setting chosen on the game menu before the
room exists (FRT's `frtPearOff` — the sole legitimate instance, and it is on the allow-list in
`tools/verify-mp-configs.js` § 3 with its reason). Anything a *setup or roster* screen sets is not.

*Second lesson, about the deferred list itself:* four separate `deferred-work.md` entries proposed
the same fix — "read the roster's live size during lobby-fill rather than a game-local variable" —
and it was **wrong**. A cap cannot be the roster's size; the roster is the thing the cap constrains.
Four independent write-ups converging on a plausible-sounding fix is not evidence the fix is right:
each one was copied from the last. When an entry repeats across games, re-derive the fix once at the
top rather than inheriting it.

---

### ML-02 — "Everyone is assigned" is not "the teams are valid" [23 Aug 2026, SW v210]

*What happened:* found while raising SS's and DSD's caps to 6. `mpRosterCheckConfirm` enabled Start
Game as soon as `mpRosterPendingTeamIdx.every(t => t >= 0)` — every player assigned *somewhere*. It
never compared the two teams' sizes, so a host could confirm 3v2. With the old max of 4 it could
confirm **4v0**.

*Root cause:* both games derive their per-team size from **team A alone** —
`ssPlayerCount = ssPlayerNamesA.length`, `dsdPlayersPerTeam = dsdPlayerNames[0].length`. Team B
inherits that number and is silently mis-sized. Nothing errors; the game just deals wrong.

*Lesson:* a completeness check (`every`, `.length === n`, `.every(Boolean)`) is not a validity
check. Where a game's arithmetic depends on a *relationship* between two collections, assert the
relationship, not the fill. This is the same failure family as the `[].every()` vacuous-truth gate
in `cjar-impl-notes` BUG-05: the predicate was true, and true meant nothing.

*Fix:* `rosterConfig.requiresBalancedTeams: true` on the two balanced-team games, gating both ends —
the host lobby CTA rejects an odd roster before the roster screen is ever reached, and
`mpRosterCheckConfirm` requires `|A| === |B|`, with an amber reason line in `#mp-roster-hint`. Both
gates read one shared predicate, `mpRosterNeedsBalance()`, so a third team game opts in with one
config key.

---

### ML-03 — A rule scoped to one mode gets read as "not my problem" by every other mode [23 Aug 2026, SW v210]

*What happened:* eight of the 18 games had no mid-game quit teardown at all — a leaver kept its
Firebase slot and every other device waited on a turn that never came. Ten games had been fixed
individually over the preceding months.

*Root cause of the *recurrence*, which is the interesting half:* the rule in `logic-engine.md` was
titled **MDLM** Mid-Game Quit Contract. LI5 and DSD are TLM games. Neither reads as "an MDLM game",
so the rule looked like someone else's section — yet the failure is identical, because the mode
label was never what mattered. What matters is only that a Firebase room exists and another device
is waiting on it.

*Lesson:* **scope a rule to the condition that causes the failure, not to the mode where it was
first observed.** The section is now § Mid-Game Quit Contract and covers every lobby session. Any
rule named after a mode deserves the same question: is the mode load-bearing, or just where someone
happened to be standing?

*Second lesson, about how the remaining three were found:* the identity-doc pass flagged five games
(LI5, GM, SS, JEC, YGI) by reading each doc in turn. LTTP, NAT and DSD had the identical
unconditional handler and were flagged by **none** of them. Reading eight documents one at a time
finds a bug class; it does not find the class's full membership. Once a pattern is named, grep the
suite for its *shape* before scoping the fix — that is what turned "5 games" into "8 games, and 5
not 4 for the bounds bug" before any code was written.

*Fix:* one generic engine helper, `mpNotifyPlayerLeft()` → `MP_PLAYER_LEFT`, handled in
`mpHandleEnvelope` **before any per-game routing** so a game needs no handler of its own. The ten
per-game `[ABBR]_PLAYER_LEFT` implementations that predate it each do exactly what the generic path
does; they still work and were deliberately not swept, but that ten-fold duplication is precisely
what let the eleventh through eighteenth games forget it entirely. **When the same handler is written
identically for the third time, it belongs in the engine.**

---

### ML-04 — The declarations layer had no harness at all [23 Aug 2026, SW v210]

*What happened:* both bugs above were live in shipped code while 14 verification harnesses passed.

*Root cause:* every `tools/verify-*.js` drives one game's *rules*. Nothing tested the layer above
them — `MP_GAME_CONFIGS`, which the mode and lobby screens read directly for all 18 games. A wrong
declaration there is wrong before a packet is ever sent, so even a loopback would not have caught
it: the loopbacks construct their own seats and never consult the lobby bounds.

*Lesson:* **a harness that runs the game cannot check the contract that decides whether the game can
start.** `tools/verify-mp-configs.js` fills the gap: entry schema, bounds sanity, **bound purity**
(source-level — a bound may name nothing but `window.mpLobbyStyle`), agreement with each game's own
Pass-the-Phone count pills in `index.html`, the balanced-teams invariant, and the quit contract,
across all 18. It runs no game logic and sends no packets by design.

Two details worth copying into the next harness of this kind. **(1)** It takes `MP_SRC=`, following
`CJAR_SRC=`/`NT_SRC=`, so pre-fix `engine-multiplayer.js` can be driven through the same checks —
it fails on `git show HEAD:` and passes on the fix, which is the only way to know an assertion is
load-bearing rather than tautological. **(2)** Where a real divergence is deliberate it is an
explicit named exception with its reason inline (`ALLOWED_SETTINGS.frtPearOff`,
`PILL_EXCEPTIONS.nat`) and prints as a `note`, never a silent skip. A harness that ships red trains
people to ignore it; a harness that quietly skips is lying.

---

### ML-05 — Two team-assignment mechanisms drifting apart is a UX bug config checks can't see [25 Aug 2026]

*What happened:* a 3-device MDLM playtest of SS reported "MDLM only accepts 2 devices" — but
`getMaxPlayers()` was already correctly returning 6 (verified via `verify-mp-configs.js`, all green).
The real bug was upstream of any config value: SS's `rosterConfig.type` was
`ls => ls === 'team' ? 'none' : 'teams'`, so TLM (`mpLobbyStyle === 'team'`) skipped the Assign Spots
roster screen entirely and relied instead on `mp-host-prelobby-overlay`'s "This device / Other
device" swap block — a device-based, exactly-2 team-assignment mechanism baked into the *pre-lobby*
markup, shown unconditionally for every game with `showTeamNamesInPreLobby: true` regardless of
`mpLobbyStyle`. Testing TLM (which genuinely does cap at 2) right next to MDLM under a UI that never
distinguished the two read as "MDLM is capped at 2" even though the config layer was never wrong.

*Root cause, the sharper version:* the codebase had **two independent team-assignment systems** —
the device-swap block (pre-lobby, 2-device-only, TLM-shaped) and the Assign Spots roster screen
(post-lobby, N-device, drag-into-zone, already used by every MDLM team game). DSD's
`rosterConfig.type` was already unconditionally `'teams'`, so DSD's device-swap block and its
`mp-prelobby-captain-names` text inputs were **already fully dead** — captains there are decided by
the roster screen's ⚓ picker (`mpRosterPendingCaptain`, applied in `mpConfirmRoster`'s `'teams'`
branch), and `window.mpLobbyRosterCaptainNames` was written but never read outside the `'none'`
branch, which DSD's config never reaches. A shared prelobby overlay had accreted a second, unused
input surface with no harness or grep pattern that would ever flag "these fields are typed into and
silently discarded."

*Fix:* SS's `rosterConfig.type` → `'teams'` unconditionally, matching DSD — TLM's 2 devices now go
through the same Assign Spots screen as MDLM's N devices (trivial for 2, but one mechanism instead
of two). Removed the device-swap block and the captain-name text inputs from
`mp-host-prelobby-overlay` entirely (`mpUpdatePrelobbyDeviceLabels`, `btn-mp-prelobby-swap`,
`mp-prelobby-captain-*`, and the `window.mpLobbyRosterCaptainNames` population at room creation) —
team assignment is a single global mechanism for both lobby styles now. The prelobby overlay keeps
only nickname entry and the Team A/B *name* text inputs (still legitimate — they seed the roster
screen's own name inputs via `window.mpLobbyRosterTeamNames`).

*Lesson:* **when two mechanisms do the same job for different subsets of games, a report that reads
like a hard cap can actually be a framing/consistency bug the config layer is blind to.**
`verify-mp-configs.js` proved the *numbers* were right; it has no way to know a screen shown to the
host implies a different (wrong) mental model of which mode is running. The generalisable check
before trusting a config-level harness's all-green result: **grep for a second implementation of the
same concept** (here, "team assignment") rather than assuming the number that's wrong must live
where the report points.

### ML-06 — A Phase-22 game's inline packet handlers are unreachable from a harness [27 Aug 2026, SW v211]

*What happened:* JEC's rework needed a two-device loopback (`tools/verify-jec-loopback.js`), and
there was nothing to call. The eight Phase-22 games keep their packet handlers as an **inline
`if (mpActiveGame === 'x') { … }` block** inside `mpHandleEnvelope` in `js/engine-multiplayer.js`,
rather than as a named function. A harness can load the file and drive the game's own logic, but it
cannot reach a block that only exists partway down a 200-line conditional.

*Root cause:* the inline shape predates loopback harnesses entirely. Nothing was wrong with it while
the only verification was single-mode; it became a blocker the moment "prove the packet contract"
turned into a real requirement.

*Resolution:* the JEC block was extracted to `function jecHandleEnvelope(env)`, still **in
`engine-multiplayer.js`** — the Phase-22 file layout is deliberately preserved — with the inline
block reduced to a one-line call. That is the whole change, and it is what made 164 loopback checks
possible.

*Lesson:* **the other seven Phase-22 games (LI5, GM, SS, YGI, LTTP, NAT, DSD) are one extraction each
away from being loopback-testable.** Do that extraction as the *first* step of any rework touching
one of them, not as a discovery midway through. It costs a function declaration and a call, changes
no behaviour, and turns the tier of verification that catches host/client divergence from
"unavailable" into "available". Do **not** move the handlers into the game's own plugin file — the
extraction is about reachability, not relocation.

---

### ML-07 — Presence must be per CONNECTION, or a stale socket evicts a live player [27 Sep 2026, SW v236]
**What happened.** The obvious presence write — `presence/{uid} = true` with `onDisconnect().remove()`
— fails on exactly the event reconnect exists for. A locked phone's socket can take up to a minute to
be declared dead by the server. If the player reloads first, the new connection writes
`presence/{uid} = true`, and then the OLD socket's late `onDisconnect` fires and deletes it: a player
who is sitting right there, back in the game, is marked Away.
**Root cause.** `onDisconnect` belongs to a *socket*, but the node it removes belonged to a *uid* —
and one uid can own two sockets for a while.
**Lesson.** Firebase's own presence pattern: `push()` one child per connection under the uid, each
with its own `onDisconnect().remove()`, and count a seat present while ANY child exists. Re-push on
every `.info/connected === true` and a blip heals itself. The harness models the race directly
(`drop({ late: true })` returns the server's delayed notice; § 8), and the mutation pass reverts to a
shared node to prove the harness notices.

### ML-08 — A public packet can beat a private one to the same device [27 Sep 2026, SW v236]
**What happened.** A rejoining client needs two things from the host: the session context
(`MP_REJOIN_ACCEPT`, private) and the live Daylight deadline. The spec first had the deadline ride
`resume()`'s public `COMB_DAYLIGHT` broadcast. But the public `/events` and private `/private/{uid}`
queues are separate listeners with no ordering between them, and the rejoiner routes no game packet
until the ACCEPT has told it which game is running — so a public packet that arrives first is
dropped, and the rejoiner sits with no clock.
**Root cause.** Ordering holds *within* a Firebase queue, never *across* two.
**Lesson.** Anything a late device must not miss rides the SAME queue as the thing that makes it able
to read it. The host now runs `mpMarkBack()` → `resume()` **before** `sendState()`, so the private
snapshot (`COMB_FULL_STATE`, which gained `endTimestamp`) carries the live clock. The rejoiner
keeps `mpActiveGame = null` until the ACCEPT, so the early public packet routes to nothing rather
than to a half-initialised applier (`verify-mp-reconnect.js` § 19; `verify-comb-loopback.js` § 26b).

## Template Gaps

### A render-on-demand loop with a wake-on-interval companion cannot be stopped by hiding its canvas

**What happened.** `wip/premium/prm-scene.js`'s render loop is on-demand: `wake()` schedules a RAF
only while something is animating, and the loop goes idle once nothing is. Alongside it, a 10 fps
attract `setInterval` redraws the jukebox's idle texture and calls `wake()` every tick, guarded only
on `document.hidden`. Joining the Premium room to the sandbox shell (19 Sep 2026) meant leaving the
room's view for good the first time — the shell hides the canvas with CSS rather than navigating
away from the page — and the room kept rendering forever underneath the hidden view.

**Root cause.** `document.hidden` is a page-level signal (tab switched, window minimised); it says
nothing about whether *this element* is currently on screen. CSS visibility is invisible to the
interval, so the one thing standing between "hidden" and "still costing a GPU frame ten times a
second" was a guard that could never see the difference.

**Lesson.** Added `api.stop()` / `api.resume()` and a `paused` flag that gates `wake()`, the
`frame()` re-schedule, and the attract interval's own tick — an explicit switch, not a CSS
inference. Generalises to any `wake()`/RAF pair in this suite (`ctlRaf`, `ntRafHandle`): if
something *else* — an interval, a second listener, a retained closure — can call the loop's own wake
function, then `display:none` on its canvas is not a stop. `wip/lobby-lab/visual-shell.js`'s W5
block measures rather than asserts this: it counts frames rendered over 1.2 s of a stopped room and
requires exactly zero, which is the check that would have caught the interval waking a hidden room.

### A doc-verification harness must require a BOUNDED match, not a substring

**What happened.** `tools/verify-identity-docs.js` (identity-doc pass 1) checked each quoted UI
string with `hay.includes(needle)`. Its `--self-test` passed, and all 102 strings in the first real
document passed on the first run. Adversarially corrupting three real strings then showed it caught
only one: changing `Raid the Jar!` to `Raid the Jar` sailed through, because the truncation is a
substring of the truth.

**Root cause.** Two separate gaps, and the second is the interesting one. (1) Substring semantics
accept every truncation. (2) The self-test planted **invented** strings — "Grab The Biscuit Tin" —
which only proves the checker is not blind. It says nothing about whether the checker is *precise*,
because an invented string fails under both correct and sloppy matching.

**Lesson.** For any checker that asserts "X still exists in the source", assert a **bounded** match:
every occurrence must have whitespace, a tag bracket, or a quote on both sides, and at least one
occurrence must be clean (scan all of them — "Dob" is unbounded inside "Dobbed." and bounded as its
own button label). And build the self-test from **corrupted real strings**, not invented ones —
truncation, changed case and the wrong apostrophe are the errors that actually happen. Invented
strings test the floor; corrupted real ones test the ceiling.

**Residual, measured and documented in the tool's header rather than chased:** a truncation landing
on a word boundary whose shorter form is itself a bounded prefix of another real string still
passes (`Waiting for the host` survives because `Waiting for the host to open the jar…` contains it).
Closing that needs a real HTML/JS parser, which this tool deliberately does not carry.

### "Free to reword" is not "free to be wrong"

**What happened.** The identity-doc change contract classifies each section **free** (no code reads
it), **paired** (doc and code must change together) or **derived** (code first). The first draft of
CJAR's T1 Pitch — a **free** section — described players choosing about the card they had just seen.
That contradicts `cjarApplyCardEffect` ("applies its OWN effect — before anyone chooses… the
ordering is load-bearing") and contradicted the same document's own T3 two sections later. The owner
caught it; no tool could have.

**Root cause.** "Free" was written to mean *safe to edit* and was read as *low-stakes*. But the free
sections are exactly the ones with **no mechanical guard**: the harness covers quoted copy, and
derived facts are checkable against source. Prose about how a game plays is checked by nobody.

**Lesson.** State the truth constraint explicitly in any tiering scheme like this — free means free
of *coupling*, never free of *accuracy*. Practically: when a free section makes a claim about how
the game works, verify it against the code the same way a derived fact would be, and check it
against the document's own other sections, which is where this contradiction was visible.

### A bug index with no closure step rots into fiction — in the safe direction, which is why nobody notices

**What happened.** The identity-doc migration read every game's impl-notes as source material. Two
games' Bug Indexes turned out to be substantially wrong. **GM:** G4 (Lobby Mode near-sync silently
discarding the round), G5 (host/client mismatch phrases diverging) and G6 (quit overlay in the wrong
brand colour) all read "(open)" — all three are fixed in shipped code, and G4's fix even carries an
inline comment describing precisely the remedy its note proposes. **LI5:** L6 (deck panel behind its
own opener), L7 (phantom timer on quit-cancel) and L8 (Pinky Swear score desync) likewise read
"(open)" and are likewise all fixed, L7 with an explanatory comment and L8 with the exact sequential
re-clamp its note asks for. Six stale entries across two files.

**Root cause.** Entries are written at *discovery* time, when the finding is fresh and the writeup is
cheap. The fix lands later — often in a different session, sometimes as a drive-by inside unrelated
work — and by then the note is out of context and nothing prompts a return trip. The Documentation
Integrity Protocol has a step for *adding* an impl-notes entry; it has no step for *closing* one.

**Why it stayed invisible.** This decays in the direction that never causes a failure: a fixed bug
described as open costs nothing at runtime. It surfaces only when someone reads the index cold —
which, before the identity docs existed, essentially nobody did. The cost is paid later and by
someone else: a future session budgets time to investigate six bugs that do not exist, or worse,
"re-fixes" one and perturbs working code.

**Lesson.** When you fix something already logged in a Bug Index, close the entry in the same
response that ships the fix — the existing "same response" rule for *writing* an entry applies just
as much to *resolving* one. Mark it `RESOLVED [date]` with a one-line note on what closed it rather
than deleting it; the discovery record is the valuable half and the resolution line is what stops
the next reader re-opening the investigation. And treat any doc that only gets **appended to** as
structurally prone to this — a document nobody ever reads back is a document nobody ever corrects.

**`js/lib/physics.js` (new, Cold Shoulder Stage 1–2) — its design decisions and bug log live in
`cld-implementation-notes.md`, not here**, because the module and its harness were built as one
piece of that game's Stage 1. The one entry worth knowing about from outside: **BUG-03** —
`Physics.rng(seed)` returned a near-zero first draw for every small seed, so any caller that seeds
a stream and immediately takes one draw got the same answer from all of them. Fixed with a warm-up
inside `rng()`. If a second game ever adopts `Physics`, read that entry first.
