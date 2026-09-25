# Lobby Redesign — Production Wiring (design spec)

**Date:** 25 Sep 2026 · **Tier:** 2 (architectural) · **Status:** awaiting owner review
**Supersedes for production:** the sandbox shell (`wip/lobby-lab/shell.html`) and its spec
`2026-09-19-premium-shell-wiring-design.md` — that spec stays as the record of how the sandbox was
proved; this one says what ships.
**Gate passed:** OWNER-REVIEW-2 (the ninety-second test), 25 Sep 2026.
**Ships as:** one SW bump (v230 → **v231**), one Documentation Integrity pass, one phase snapshot —
the initiative's single combined ship (`docs/deferred-work.md` § Lobby redesign, item 3).

---

## 0. Owner decisions this spec is built on

| # | Decision | Date |
|---|----------|------|
| O1 | All four layouts ship, as new screens beside `screen-lobby`; today's lobby survives as the fourth layout | 21 Sep |
| O2 | **"Premium" is officially called the Lounge** — in UI copy, docs, file names and code | 25 Sep |
| O3 | The Lounge is the **first view** on launch. A phone / low-end device plays the arrival beat and lands in **Shelves**; a device with no WebGL lands in Shelves directly | 21–25 Sep |
| O4 | **Leaving a game returns to the layout it was launched from.** The Lounge is the front door, not a hub; it is always reachable from a switcher | 25 Sep |
| O5 | **Stickerbook ships in v1, everything unlocked, nothing saved** — a finished book to browse | 25 Sep |
| O6 | Jukebox stays decorative (its feature is the owner's next round after this ships) | 25 Sep |
| O7 | A cheap live controller replaces the SVG/PNG stand-in in Shelves and TV, **and** the Lounge's 3D controller shows the player's stickers + plate outline. **No new animation** — the controller animation round is deferred, owner-prioritised | 25 Sep |
| O8 | Lamp photos take the **runtime-cached** contract (owner: "go with your recommendation") | 25 Sep |
| O9 | Only what production needs leaves `wip/`. `wip/lobby-lab/` and `wip/premium/` are **archived out of the repo** by the owner once this ships | 25 Sep |
| O10 | The owner's small unsettled visual touches are post-production polish and **not in scope** | 25 Sep |

The fourth layout's **display label** stays "Original" for now; the owner may rename it later
("Classic" and "The List" were floated). It is one string in `LOBBY_LAYOUTS` (§ 3) — **the internal
id stays `original` whatever the label becomes.**

---

## 1. Scope

**In:** four layout screens · the `lobbyShow()` router seam and every site that must use it · boot
tiering · game launch from the new layouts · the switcher · the controller ornament in every
layout + the Lounge prop's painted textures · the stickerbook (all-unlocked) · lamp photos on the
runtime cache · the file moves and renames out of `wip/` · harnesses ported to `tools/` and one new
production visual harness · SW v231 · the documentation pass.

**Out:** earning stickers / achievements storage (deferred, § 13) · the jukebox feature · controller
idle animation · the owner's polish list · any change to the 20 game plugins · any change to
`screen-lobby`'s content beyond one switcher button.

---

## 2. Terms

| Term | Meaning |
|------|---------|
| **Layout** | One of four ways to view the lobby: `lounge`, `tv`, `shelves`, `original`. Exactly one is on screen whenever the lobby is |
| **The Lounge** | The 3D room (was "Premium"). A layout, and the only one that is not a menu |
| **Home layout** | The router's `view` — the last layout that was on screen. A game launch never changes it, so it is already where `lobbyShow()` lands. Memory only |
| **Tier** | `lounge` (widescreen + WebGL) · `arrival` (WebGL, below the eligibility floor — the one-way beat) · `none` (no WebGL / `prefers-reduced-data`). Tiers `arrival` and `none` both end in Shelves |
| **Handed out** | A device whose arrival beat has played. The Lounge is closed to it for the session (the one-way rule, DD-19) |
| **Ornament** | The live 3D controller shown in a layout (today: `#lobby-controller` on Original) |

---

## 3. Screens and markup

| Layout | Screen id | Content | Source |
|--------|-----------|---------|--------|
| Lounge | `screen-lounge` (new) | room canvas, HUD, vignette, fade | `shell.html` `#shell-premium` + `prm-hud.css` |
| TV | `screen-tv` (new) | `#tv-app`, full window | `shell.html` `#shell-tv` + sandbox `lounge.js` |
| Shelves | `screen-shelves` (new) | 390 px column, centred, scrolls | `shell.html` `#shell-phone` + `lobby.js` Shelves view |
| Original | `screen-lobby` (existing) | **unchanged** + one switcher button | `src/screens/_shell.html` |

- All three new ids join `allScreens[]` in `engine.js` (hiding) — a separate requirement from the
  Workshop's return destination (DD-18).
- **Visibility is `showScreen()`'s inline `style.display` and nothing else.** No `hidden` attribute
  on any screen or pane (BUG-19). The one place `hidden` survives is inside a layout's own switcher
  segments, which keep the sandbox's `.lb-seg[hidden] { display:none !important }` guard.
- New markup lives in a new partial **`src/screens/lobby.html`**, listed in `src/manifest.txt`
  directly after `_shell.html`. It holds the three new screens plus two overlays:
  - `#lobby-switcher-overlay` — the dock (DD-17): summoned, never automatic. Opened by the
    Lounge's channel dial and by Original's new button. Decision-Modal geometry, z-[90].
  - `#stickerbook-overlay` — full-window, over the Lounge, z-[90].
  Both are closed by the router's `home` action, which `resetToLobby()` reaches through `lobbyShow()` —
  **not** by an entry in `resetToLobby()`'s generic `style.display='none'` list, which would strand
  the stickerbook (it toggles its own `hidden`, guarded by an `!important` rule, BUG-19).
- **Original's switcher button:** one icon button in `screen-lobby`'s header beside
  `#btn-lobby-sort`, `aria-label="Change layout"`, opening `#lobby-switcher-overlay`. Without it
  Original is a dead end.
- `LOBBY_LAYOUTS` — one table (id, label, icon, screen id) that the dock, Shelves' `.lb-switch` and
  TV's mode buttons all render from. Today three separate lists exist; production has one.
- **The Stack exemption:** `screen-lounge` and `screen-tv` are full-window stages (a page-scroll
  would hijack a drag in the room; TV is a fixed rail). Both join the `ui-style.md` legacy/fixed-stage
  whitelist beside `screen-workshop`. `screen-shelves` scrolls as a column and needs no exemption.
- `lobby.js`'s own `lb-original` rendering is **deleted** — production's Original is the real
  `screen-lobby`, not a copy of it.
- **TV has a size floor of its own** (`lbTvEligible()`, 900×500 — the same numbers as the Lounge's).
  Every switcher hides the TV option below it and `lobbyGo('tv')` refuses. The existing "TV wants a
  wider screen" hand-off card is **kept** for one case only: a window resized below the floor while
  TV is up. Its button goes to Shelves via `lobbyGo('shelves')`.

---

## 4. The router seam — `lobbyShow()`

**Rule: nothing outside `js/lobby/` may call `showScreen()` with a layout's screen id.** Every
"go back to the lobby" in the app goes through `lobbyShow()`. Same shape as `showScreen()` being the
one music seam: fix it once, all 20 games inherit it.

### 4.1 Two layers (the sandbox's proven split)

- **`js/lobby/lobby-router.js`** — the pure reducer, ported from `shell-router.js`. No DOM, no
  window, no timers. State:
  `{ view, tvSel, room, workshop, stickerbook, switcher, arrival }` — **no new field**: `view`
  already is the home layout, because nothing the router sees changes it while a game is up. Actions carry over (`go`, `enterTV`, `enterShelves`,
  `openSwitcher`, `roomMounted`, `workshopOpen`, `workshopClose`, `stickerbookOpen`,
  `stickerbookClose`, `designSaved`, `arrivalBegin`, `arrivalReset`, `leaveShell` → renamed
  `leaveLobby`), plus one new: **`home`** — "return to the lobby from outside it": closes the
  stickerbook/switcher/workshop flags and keeps `view` (a handed-out device on `lounge` goes to
  `shelves`). Two more new actions: **`closeSwitcher`** (the dock dismissed without a pick), and
  `workshopClose`/`stickerbookClose` now return to the **current** `view` rather than always to the
  Lounge — the sandbox only ever opened the Workshop from the Lounge; production opens it from four
  places.
  It also holds `LOBBY_LAYOUTS` (§ 3). Its pure sibling **`js/lobby/lobby-doors.js`** (was
  `shell-host.js`) holds the door map and the scene-host builder (`LOBBY_DOORS`,
  `lobbyCreateHost`). Both are Node-driven by the same harness.
- **`js/lobby/lobby-host.js`** — every effect: `showScreen`, mounting/stopping the room, moving the
  ornament, opening the Workshop, the stickerbook, the switcher. Owns the public API:

| Function | Purpose |
|----------|---------|
| `lobbyBoot()` | Once, at parse time: detect tier, dispatch the first view. § 5 |
| `lobbyShow()` | Dispatch `home`, then apply. **The only entry into the lobby from anywhere else** |
| `lobbyGo(layoutId)` | A switcher picked a layout. Refused (no-op) for `lounge` on a handed-out or `none`-tier device |
| `lobbyLaunch(gameId)` | Start a game from a layout. § 6 |

Because `view` only changes on a layout pick, every exit path — including the Workshop → Konami →
gateway hop — lands where the player last was.

### 4.2 The four shipped sites that change

| Site | Today | Becomes |
|------|-------|---------|
| `engine.js` `resetToLobby()` (called by all 20 games' exits) | `showScreen('screen-lobby')` | `lobbyShow()` |
| `secret-mode.js` `sm-terminal-back` | `showScreen('screen-lobby')` + `ctlMountLobby()` | `lobbyShow()` |
| `secret-mode.js` `sm-btn-exit` | same | `lobbyShow()` |
| `controller.js` `ctlScheduleIdleNudge()` | "is `screen-lobby` visible, is the canvas in `#lobby-controller`" | `ctlOrnamentIsLive()` (controller-owned, § 7.1) |

The `ctlMountLobby()` calls disappear from secret-mode because `lobbyShow()` re-mounts the ornament
for whichever layout it lands on (§ 7.1). `DOMContentLoaded → ctlMountLobby` is replaced by
`lobbyBoot()`.

A grep for `'screen-lobby'` outside `js/lobby/` and `CTL_RETURN_DEFAULT` must come back empty after
this change — the plan's verification step.

### 4.3 Room lifecycle

Carried from the sandbox unchanged: the room is built on first entry to the Lounge, **stopped, never
disposed**, when any other layout, the Workshop, the stickerbook or a game takes the screen; resumed
on return. During a game the Lounge costs an idle WebGL context and zero frames. The arrival tier's
lean room (no controller prop) is disposed after the handoff, and on `arrivalReset`.

---

## 5. Boot and tiering

`lobbyBoot()` runs **synchronously at parse time** — invoked from the last line of `app.js`, the
last script in the body — not on `DOMContentLoaded`. And `screen-lobby` gains `style="display:none"`
in markup: a browser may paint between script downloads, so a screen visible in markup would flash
Original
before the Lounge. It:

1. Probes the tier (the sandbox's `eligible()` + WebGL probe + `prefers-reduced-data`).
2. `lounge` → `showScreen('screen-lounge')`, mount the full room.
   `arrival` → `showScreen('screen-lounge')`, mount lean, play the beat, hand to Shelves.
   `none` → `showScreen('screen-shelves')`.
3. Fetches the two runtime-cached manifests **independently** (§ 9) — the room never waits on both.

Resize across the eligibility floor keeps the sandbox's behaviour (`arrivalReset` + `leaveLobby`,
DD-19). Reduced motion keeps the sandbox's behaviour (the beat's camera does not travel; 1 distinct
camera matrix).

---

## 6. Launching a game

Every layout's Play press calls `lobbyLaunch(gameId)`, which **clicks the game's existing lobby
button** (`document.getElementById(btnId).click()`). Each plugin's own entry listener — sets
`activeGameId`, `showScreen(menu)` — runs untouched. **No plugin file is edited.**

The lobby data uses short ids; three buttons use legacy ids. The map lives in `lobby-host.js`:

| games.js id | button |
|-------------|--------|
| `li5` | `btn-dstw` |
| `gm` | `btn-great-minds` |
| `ss` | `btn-sylly-signals` |
| every other id | `btn-[id]` |

A launch with no matching button logs a `console.warn` and does nothing (never throws). The
production harness asserts all 20 resolve.

The sandbox's `sylly:play` CustomEvent is **not** shipped (it existed to feed the earn loop, O5).

### 6.1 Every other control in the layouts

The sandbox layouts carry controls that were stubs (a `console.log`, or no handler at all). Each one
gets exactly one production answer:

| Control | Where | Production |
|---------|-------|------------|
| Layout switch (`.lb-switch`, TV's `.lb-lg-mode` buttons) | Shelves, TV | `lobbyGo(id)`, rendered from `LOBBY_LAYOUTS`; Lounge hidden when closed to the device, TV hidden below its floor |
| Play (`#lb-play`, `.lb-lg-play`) | Shelves sheet, TV card | `lobbyLaunch(gameId)` |
| The controller (`#lb-you-controller`, `.lb-lg-ctl`) | Shelves, TV | the ornament slot (§ 7.1) |
| 🔊 dock icon | Shelves | `openSoundOverlay()` |
| 🕹️ Arcade dock icon | Shelves | shown only when `smArcadeUnlocked`; calls `smOpenArcadeMenu()` — the same rule as Original's header tile |
| 🎨 Skins / 📦 Word Packs dock icons | Shelves | **removed** — the pack/skin terminal costs a fresh Konami (`secret-mode.js`), so a lobby icon for it would be a lie |
| 🏆 Achievements dock icon | Shelves | **removed in v1** — the stickerbook's own layout icon is deferred (§ 13) |
| "You" profile popover | Shelves, TV | **nickname field ships** (`sylly_nickname`, already permitted); the placeholder stats block and its "Placeholder stats" note are **removed** |
| TV host pane (`tvHost`, the made-up roster, `#lb-tv-go`) | TV | **deleted** — a mockup of hosting on the telly, not a feature |
| `lbMountTV` (`#wide-canvas`), `lbRenderOriginal`, the `lb-later` placeholder, the URL-hash seeding in `lbBoot` | lobby.js | **deleted** — sandbox review frames |

---

## 7. The controller

### 7.1 One ornament renderer, moved between layouts

`ctlMountLobby()` becomes **`ctlMountOrnament(slotEl)`**: the same body (deferred build, lobby tap →
Workshop, zoom reset, idle-nudge chain) with the slot passed in. Slots:

| Layout | Slot |
|--------|------|
| Original | `#lobby-controller` (existing) |
| Shelves | `#shelves-controller` — replaces `lbControllerSVG()` in the header |
| TV | `#tv-controller` — replaces `controller.png` / `lbControllerSVG()` in `.lb-lg-left` |
| Lounge | none — the room has its own 3D prop (§ 7.2) |

`lobbyShow()`/`lobbyGo()` call `ctlMountOrnament(slot)` for the layout they land on. `ctlMount()`
already re-parents the single canvas. **Still one WebGL context for the ornament, on-demand frames,
no new animation.**

Tapping an ornament opens the Workshop with
`ctlOpenWorkshop({ returnScreen: <that layout's screen>, onReturn: () => ctlMountOrnament(slot) })`
— DD-18's hook, now used by four callers. The Lounge's controller prop passes
`returnScreen: 'screen-lounge'` and an `onReturn` that repaints the prop (§ 7.2).

The keyboard equivalence (`controller.js`, Enter/Space on `#lobby-controller`) generalises to any
of the three slots — each slot carries `role="button"` and `tabindex="0"` as Original's does.

`ctlOrnamentIsLive()` (in `controller.js`, so the nudge needs nothing from the lobby files) = the canvas is in the current ornament slot **and** that slot has a box
(`getClientRects().length`), plus the existing drag/reduced-motion guards in the nudge itself.

### 7.2 The Lounge's controller shows stickers and the plate outline

The prop already builds the shipped geometry (`ControllerBody.buildBody(THREE, {})`), so the
Workshop's atlases map onto it. The constraint: on the `lounge` tier the ornament renderer has not
been built at launch, and building it only to borrow its canvases would double `buildBody`, the most
expensive step at the front door.

**So `controller.js` splits the model from the renderer.** Everything `ctlEnsureBuilt()` does
except `ctlBuildScene()` and adding meshes to the rig is renderer-free in Three: atlases, the body
geometry, plate UVs, materials, the ear meshes and their UVs, the controls, the design repaint and
the deferred sticker surface. That half becomes **`ctlEnsureModel()`** (sets `ctlModelBuilt`), and
`ctlEnsureBuilt()` becomes `ctlEnsureModel()` + `ctlBuildScene()` + rig assembly. Everything that
gated on `ctlBuilt` only to paint (`ctlApplyDesign`, `ctlEnsureStickerSurface`) gates on
`ctlModelBuilt` instead; `ctlWake`/`ctlResize`/`ctlTeardown` keep `ctlBuilt`.

**`ctlModelParts()`** returns `{ geo, tex, bumpTex, earTex, earBumpTex, ears }` (`ears` = the two
ear meshes, whose geometry carries the ear UVs). The Lounge's controller prop, on the `lounge` tier:
- calls `ctlEnsureModel()` — **one** `buildBody` for the whole app, paid here instead of later;
- builds its body mesh on `parts.geo` and its ears on each `parts.ears[i].geometry` (copying
  position/rotation/scale), with **its own** room materials (`lib.role`) whose `map`/`bumpMap` are
  the shared textures and whose colour is white. Materials are never shared: the room patches its
  materials (`onBeforeCompile`, the contact shade, the grade) and those patches must not reach the
  Workshop's render;
- keeps building its own controls (untextured, recoloured from `design.buttons` as today);
- tags every borrowed geometry/texture `userData.louShared = true`, and the scene's `dispose()`
  **skips** anything so tagged. Disposing a borrowed texture would free the ornament's GPU copy too.

A Workshop save repaints the shared canvases in place and sets `needsUpdate`; the room re-uploads
them on its next frame after it resumes, so its `onReturn` only has to call `api.setDesign(design)`
for the buttons. If `ctlEnsureModel()` returns false the prop falls back to today's flat-colour
build — never an error, never a monochrome controller.

**This is the one `controller.js` change that is not a no-op.** It rides the combined bump with the
DD-18 change already held. The four controller harnesses (157 · 63 · 28 · 50) must stay green and
gain the painted-without-renderer path.

---

## 8. The stickerbook (v1, everything unlocked)

- Opened only from the Lounge's binder door. Room stopped while open; ✕ returns to a running
  Lounge (unchanged from the sandbox).
- `achievements.js` gains **one** constructor, `achAllPlaced(book)` — every sticker in the manifest
  on its sleeve with **every tier complete** (plays = the last tier), so the book shows no progress
  hint that could never advance. `stickerbook.js` renders it; the tray is empty.
- **Nothing is stored. No localStorage key is added** — `CLAUDE.md`'s permitted list is untouched.
- Removed from the shipped copy: the `sylly:play` listener, the earn toast (`#shell-toast`), the
  `lsg_sandbox_achievements` key, the reducer's earn/place actions' wiring (the pure reducer and its
  75-check harness move over intact, ready for the achievements round).
- No manifest (cold offline, never fetched) → the binder door answers "the sticker book could not
  load" (the sandbox's existing path) and the book does not open.
- **Phones never see the Lounge, so phones cannot reach the stickerbook in v1.** Recorded in
  deferred work with its planned layout icon (§ 13).

---

## 9. Runtime-cached content and failure paths

### 9.1 Lamp photos → `data/lamp/`

`wip/premium/lamp images/` (manifest + 9 JPEGs, **~317 KB**) moves to `data/lamp/`. `sw.js`'s fetch
handler gains a `data/lamp/` branch identical to `data/stickers/`: **manifest network-first, images
cache-first**. Not in `PRECACHE_URLS`. Adding a photo later = a file drop + one manifest line, no
version bump.

### 9.2 Each content source fails alone

The sandbox fetches the sticker and lamp manifests with one `Promise.all` — **either failing takes
down the whole Lounge.** With both on the runtime cache, that is exactly what a cold offline first
launch would do. Production fetches each independently:

| Missing | Result |
|---------|--------|
| lamp manifest | lamp builds with `{ panels: [] }` — already supported (18 bare rods, no cards) |
| a lamp photo | that card shows its plain frame |
| sticker manifest | Lounge mounts; binder answers "could not load"; layout badges fall back to emoji (existing `lbBadgeInner` path) |
| both | Lounge still mounts |

**No failure on this path may throw or block the room.** The production harness drives each row.

### 9.3 Music and sound

- The scene's `music` host key gets a thin adapter over the real `Music`: `nowPlaying()` →
  `Music.nowPlaying()`, `playFor()` → no-op (the jukebox is decorative; music stays driven by
  `showScreen()`, and the Lounge has `activeGameId === null`, so the lobby theme plays).
- `openSound` → `openSoundOverlay()`.
- `lounge-sfx.js` (was `prm-sfx.js`) is synthesised Web Audio, no files. Its effects obey
  `isMuted || !sfxEnabled` like every `play*()`. It **stays a lobby-owned module** rather than
  moving into `engine.js` — its voices belong to the room.

---

## 10. Install cost and SW (cost-envelope Tier 2 proposal)

**Measured 25 Sep 2026, runtime files only, harnesses excluded:**

| Bucket | Files | Size |
|--------|-------|------|
| Lounge scene | lib, room, props, scene, sfx + HUD css | **~556 KB** |
| Layouts + lobby layer | games data, lobby, tv, router, host (incl. the shell's effect half), achievements, stickerbook + their css | **~245 KB** |
| **Precache delta** | | **~0.80 MB on 11.49 MB (+7%)** |
| Lamp photos | runtime-cached (§ 9.1) | **0** (~317 KB on first Lounge visit) |
| Three.js | already precached (DD-16) | 0 |

**Proposal: accept +0.80 MB.** Why it is bigger than the ~581 KB recorded on 21 Sep: the fifteen
prop and room-pass rounds grew the scene modules from ~90 KB to ~556 KB. It is all code
(cost-envelope § 3, finding 2: "code-driven richness is nearly free") and one-time, not per-game.
For scale, all 20 games' plugins are 1.98 MB. There is no minification to reach for — a build step
is an anti-pattern — so this is the real number. The files are comment-dense by house style; the
plan may trim dead sandbox-only code (debug hooks, `?live`/`?seed` plumbing, the retired honest
card) and report the delta, but it does not strip comments.

**SW v231:** `CACHE_NAME` bump; `PRECACHE_URLS` gains every `js/lobby/*`, `js/lounge/*` file and
`css/lobby.css`; the `data/lamp/` runtime branch. `docs/cost-envelope.md` § 3 gets the new install
total.

---

## 11. What leaves `wip/`, and where it lands

### 11.1 Runtime code (precached)

| Sandbox | Production | Rename |
|---------|------------|--------|
| `wip/premium/prm-lib.js` | `js/lounge/lounge-lib.js` | `prm`/`PRM_` → `lou`/`LOU_` |
| `wip/premium/prm-room.js` | `js/lounge/lounge-room.js` | same |
| `wip/premium/prm-props.js` | `js/lounge/lounge-props.js` | same |
| `wip/premium/prm-scene.js` | `js/lounge/lounge-scene.js` | same |
| `wip/premium/prm-sfx.js` | `js/lounge/lounge-sfx.js` | same |
| `wip/lobby-lab/games.js` | `js/lobby/lobby-games.js` | — |
| `wip/lobby-lab/lobby.js` | `js/lobby/lobby.js` | `lb` kept (shared layout helpers); `lb-original` + hand-off card deleted |
| `wip/lobby-lab/lounge.js` | **`js/lobby/tv.js`** | `lg`/`LG_` → `tv`/`TV_` — the TV layout was *called* "the Lounge" in the sandbox; that name now belongs to the room |
| `wip/lobby-lab/shell-router.js` | `js/lobby/lobby-router.js` | `shell` → `lobby`; view id `premium` → `lounge` |
| `wip/lobby-lab/shell-host.js` | `js/lobby/lobby-doors.js` | `shell` → `lobby` |
| `shell.html`'s inline script (the effects) | `js/lobby/lobby-host.js` | `shell` → `lobby`; `?live`, `?seed`, `?reduced`, the status line and the earn loop removed; `?lobbydebug` keeps the scene's debug hooks for the harness only |
| `wip/lobby-lab/achievements.js` | `js/lobby/achievements.js` | `ach` kept |
| `wip/lobby-lab/stickerbook.js` | `js/lobby/stickerbook.js` | `sb` kept |
| `lobby.css` + `prm-hud.css` + `stickerbook.css` | **`css/lobby.css`** (one file) | `#prm-*` ids → `#lou-*` |
| `wip/premium/lamp images/` | `data/lamp/` | runtime-cached |

**Renames are scripted, not hand-edited**, with a word-boundary regex and a **collision check run
first** (the target prefix must match nothing already in `js/`, `css/`, `src/screens/`). CSS class
names (`lb-lg-*`, `lb-*`, `sb-*`) are **not** renamed — internal, collision-prone (`lb-tv-*`
already exists) and low value. The harnesses at their current counts are the proof that the rename
changed nothing: each must pass before and after with an identical count. `definitions.md` gains
the prefixes `lou`, `tv`, `lb`, `lobby`, `ach`, `sb`.

**Load order** (`CLAUDE.md` § Load Order): after `controller.js`, before `secret-mode.js` —
`lounge-lib → lounge-room → lounge-props → lounge-scene → lounge-sfx → lobby-games → lobby → tv →
achievements → stickerbook → lobby-router → lobby-doors → lobby-host`. `lobbyBoot()` is invoked from the last
line of `app.js`'s boot, after every symbol exists.

### 11.2 Dev tooling (not precached)

| Sandbox | Production |
|---------|------------|
| `wip/premium/verify-prm-props.js` (1322) | `tools/verify-lounge-props.js` |
| `wip/premium/visual-prm.js` (29) | `tools/visual-lounge.js` + fixture `tools/fixtures/lounge.html` (the standalone scene page it drives) |
| `wip/lobby-lab/verify-shell.js` (182) | `tools/verify-lobby-router.js` |
| `wip/lobby-lab/verify-lounge.js` (919) | `tools/verify-tv.js` (it tests the TV layout's pure half) |
| `wip/lobby-lab/verify-achievements.js` (75) | `tools/verify-achievements.js` (+ `achAllPlaced`) |
| `wip/lobby-lab/visual-shell.js` (117) | **retired** — superseded by `tools/visual-lobby.js` (§ 12) |
| `wip/lobby-lab/build-games.js` + `games.raw.json` | `tools/build-games.js` + `tools/data/games.raw.json` |

### 11.3 Archive checklist (the owner's step, after v231 is green)

Before `wip/lobby-lab/` and `wip/premium/` are moved out, the plan's last task confirms: no file in
`js/`, `css/`, `src/`, `data/`, `tools/`, `sw.js` or the three always-loaded rule files references a
`wip/` path (grep); every harness in § 11.2 runs from `tools/` with `wip/` renamed away. The specs
and plans under `docs/superpowers/` keep their historical `wip/` references — they are records.

---

## 12. Verification

**Existing harnesses must stay green, unchanged in count:** `verify-build-fresh`,
`verify-mp-configs` (20 games), `verify-identity-docs`, all four controller harnesses, and every
per-game suite in `CLAUDE.md`'s table (no plugin is touched — running them proves it).

**Ported harnesses** (§ 11.2): identical counts before and after the move + rename, then growth:
- `verify-lobby-router.js` gains `home` and `closeSwitcher`: every exit lands on the current layout;
  Workshop/stickerbook close to the layout they opened from;
  `home` on a handed-out device never lands in the Lounge; `home` closes stickerbook/switcher/workshop.
- `verify-achievements.js` gains `achAllPlaced`.
- `verify-lounge-props.js` gains the painted-texture path and the empty-lamp-manifest path.

**New: `tools/visual-lobby.js`** — real headless Chromium against the **real `index.html`** (the
tier no pure harness reaches; BUG-19's lesson: every visibility assertion measures a box, never an
attribute or a style property the code under test wrote):
1. Boot at 1280×800 → the Lounge has a box, `screen-lobby` has none, no flash of Original on the
   first painted frame.
2. Boot at 390×844 → the arrival beat plays (distinct camera matrices, 1 under reduced motion) and
   lands in Shelves; the Lounge is refused by every switcher afterwards.
3. Boot with WebGL disabled → Shelves directly.
4. **Every layout → launch a game → quit → lands on that same layout.** All four layouts, via the
   real `resetToLobby()`. Plus all 20 `lobbyLaunch` ids resolve to a button.
5. Workshop from each ornament → Save → back in that layout with the canvas in that slot; from the
   Lounge prop → back in a running Lounge, prop textures repainted.
6. Konami → gateway → exit → lands on the last layout (both `secret-mode.js` returns).
7. The idle nudge fires in Shelves/TV/Original and not during a game.
8. Stickerbook: opens from the binder full, tray empty, ✕ returns to a running room; nothing written
   to localStorage.
9. Offline: each row of § 9.2's table.
10. The ornament is one canvas: exactly one controller `<canvas>` in the document at every step.

**Mutation pass on the seam:** revert each of the four § 4.2 sites to `showScreen('screen-lobby')`
one at a time; `visual-lobby.js` must go red for each. A site whose revert stays green is not tested.

**Not a substitute for** a real-device pass: the owner opens v231 on a desktop, a phone and the TV
before the phase snapshot.

---

## 13. Deferred work this spec adds (to `docs/deferred-work.md`)

- **Controller animation round** — the ornament and the Lounge prop both idle-static in v1.
  **Owner-prioritised.**
- **Stickerbook earning** — the earn loop, the toast, placement, and the localStorage key it will
  need (a new permitted key; `CLAUDE.md` § Anti-Patterns). The pure reducer is shipped and
  harnessed, waiting. Its data source should sit behind one module (cost-envelope § 4, Tier 3 seam).
- **Stickerbook on phones** — its own layout-mode icon; until then phones cannot reach the book.
- **The fourth layout's label** — "Original" pending the owner's rename.
- **Jukebox feature** (owner's next round) — `openJukebox` door, `jukebox-knob` tab order.
- **The owner's polish list** — kept by the owner.

---

## 14. Documentation Integrity pass (at ship)

`docs/code-map.md` (new § Lobby layouts: screens, overlays, `lobby*` API, the ornament slots) ·
`CLAUDE.md` (SW v231 Current Focus entry, load order, harness table rows for the five moved + one
new harness, pointers) · `logic-engine.md` (the `lobbyShow()` seam rule; `data/lamp/` runtime-cache
contract; `js/lounge/` + `js/lobby/` in Shared Library Modules) · `ui-style.md` (the four layouts;
`screen-lounge`/`screen-tv` fixed-stage whitelist; switcher overlay in the z-stack) ·
`definitions.md` (prefixes) · `docs/cost-envelope.md` § 3 · `shared-implementation-notes.md` (one
DD for the ship) · `docs/decision-log.md` (Lounge naming, return-to-launching-layout, all-unlocked
stickerbook) · `docs/sw-changelog.md` (v230 entry moved verbatim).
