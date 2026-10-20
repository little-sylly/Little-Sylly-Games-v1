# The Arcade leaves Secret Mode — its own room (design)

**Status:** approved 19 Oct 2026 (A–D as written) · Stage 1 shipped SW v254 · Stage 2 (§ 3.1 Arcade Floor) shipped SW v257 · Stage 3 (Lounge prop) open, target SW v258 · **Tier 2** · 18 Oct 2026

## 1. Outcome

The arcade stops being a Secret Mode category and becomes a **place in the house**, like the jukebox:
always open, no Konami, no unlock. Secret Mode keeps Konami and becomes packs + skins only.

**Owner decisions (fixed):**
1. **Board dock:** 🔊 leaves the dock and goes to the Board's header, at the far right, after the
   controller ornament. 🕹️ Arcade takes its dock slot → dock = Jukebox · Stickers · die · **Arcade** ·
   Layout (still four doors + the die, so the "dock is full" rule holds).
2. **A room of its own**, quality on par with the jukebox and Workshop rooms. Style: **a modern take on
   an old arcade cabinet's game-select screen**. The list will grow, so the room must scale past 7.
3. **No unlock.** May return one day; not now.

**Assumptions (correct these before approving):**
- **A.** A cabinet's ✕ returns to the **arcade room**, not the lobby (like walking back to the select
  screen). The room's ✕ returns to the lobby layout you came from (router, as the jukebox does).
- **B.** The cabinets' session leaderboards and their in-cabinet behaviour are untouched — this is a
  move, not a cabinet rework.
- **C.** The room uses the lobby music (the same track as the layout you came from). It doesn't get its
  own track yet; adding one later is a manifest line plus a `lobbyMusicKey()` case.
- **D.** The Lounge prop is **Stage 3**, a separate session. Until then the Lounge has no arcade door.
  A device that keeps the Lounge reaches the arcade by switching layout.

## 2. Architecture

**Registry moves out of Secret Mode.** `SM_ARCADE` → `ARC_CABINETS` in a new `js/lobby/arcade.js`
(prefix `arc`; check it against the `definitions.md` collision list at build time). Same entry shape
(`id, label, screen, start, stop`) plus two fields the select screen needs: `blurb` (one line) and
`accent` (hex for that row's marquee glow). **It stays the whole registration**: every consumer
iterates it:
- the room's list (`arcRender`)
- `engine.js` `resetToLobby()` teardown (`ARC_CABINETS.forEach(c => c.stop())`)
- the Konami keydown guard in `secret-mode.js`, which now **also** skips while `screen-arcade` is up,
  so arrow keys or Enter typed in the room never feed the Konami buffer

**The room is a lobby place, not a layout** (jukebox pattern, `logic-engine.md` § Lobby Router Seam):
- Router: `state.arcade` + `arcadeOpen` / `arcadeClose`; `home` clears it. Pure, like `jukebox`.
- `lobby-host.js`: `lobbyPlaceOffered('arcade') → true`; `lobbyOpenPlace` dispatches `arcadeOpen`;
  **every condition that reads `next.jukebox` / `prev.jukebox` also reads `arcade`** (grep `jukebox` in
  the file, about 8 sites: present, arrival beat, resetView). Missing one = the Lounge arrival plays
  behind the arcade.
- Doors: one `data-lobby-place="arcade"` button in Classic's places row, the Board's dock and TV's
  tools pill. The places mechanism paints all three.
- Launch: `arcLaunch(id)` = the old `smLaunchArcade()` without `isSecretMode = true`. The router keeps
  `arcade: true` while a cabinet runs (the room is "behind" it).
- Cabinet exit: each cabinet's ✕ handler (7 one-line edits) calls `arcExitCabinet()`: stop every
  cabinet, show the room again. Nothing outside `js/lobby/` shows a layout screen.

**Removed from Secret Mode:** the ARCADE category, `smRenderArcade`, `smLaunchArcade`,
`smOpenArcadeMenu`, `smArcadeUnlocked`, `smShowArcadeTile` (Classic's injected 🕹️), the Board's header
`.bd-arcade`, `smArcadeLastId`, and the gateway line "THE ARCADE NEEDS NO NETWORK…". Konami success
just opens the gateway.

**Markup / files:** the room went into `src/screens/lobby.html` beside the jukebox. *Deviation (Stage 1):* the seven
cabinet screens stay in `_secret.html` for now — moving them is churn with no behaviour; do it in Stage 2. `css/arcade.css` scoped under
`#screen-arcade`. `screen-arcade` joins `allScreens[]` and the `h-screen` whitelist only if the room is
a fixed full-window stage. New JS + CSS → `PRECACHE_URLS` + `CACHE_NAME` bump; load order: after
`jukebox.js`.

**Offline:** the room needs no fetch. Cabinets are code, so it opens on a cold offline start (the old
"skip `smLoadPacks`" guarantee carries over unchanged).

## 3. The room (Stage 2 — the design pass)

A cabinet you are standing in front of: a **marquee** (lit title), a **bezel** framing a CRT-like
screen, and inside it the **select list**. Modern take: crisp type, soft phosphor glow and light
scanlines rather than heavy pixel cosplay; one cabinet highlighted at a time with its `accent` glow
and `blurb`; **INSERT COIN / PRESS START** as the launch beat. Scales by scrolling the list inside
the screen, never the page. Input: tap a row to select, tap again (or PRESS START) to play; ↑↓ +
Enter on desktop. Motion follows the § Motion Standard. Reduced motion is checked in JS if there is a
RAF attract loop. Test at 375×667, 375×548 and 320×452. Detailed direction gets fixed with
`/impeccable shape` at the start of Stage 2, not here.

### 3.1 Direction contract (shape pass, 20 Oct 2026 — owner-confirmed)

**One idea:** the room's little cabinets *are* the Lounge prop. Tap the bear cabinet on the shelf, the camera pushes into its CRT, and you stand at a row of the same cabinet, one per game. *Supersedes the "phosphor glow / green-on-black" wording above:* owner chose a **classic black CRT** (light scanlines, each game's `accent` as its glow) set in the prop's lilac bezel. The room (and cabinets) are a scoped exception to DESIGN.md's "no dark-mode neon gaming" — record that one line at closing.

**Room = "Arcade Floor" (fixed `100dvh`; only the row moves).**
- Top: marquee title (the bear's round ears on it) + 🔊 ✕.
- Centre: one large lit cabinet — marquee in the game's accent, screen showing name + `blurb`; neighbours peek in dark at both edges; swipe the row (scroll-snap).
- Below: position strip (ticks + `03 / 09`, tap a tick to jump; becomes a scrubber past ~12 games) — this is what keeps 20+ games from feeling endless.
- Thumb zone: **PRESS START**. Tap a side cabinet to centre it; tap the centred one (or START) to play. Desktop: ←/→ (and ↑/↓) move, Enter plays, Esc leaves.
- Launch beat: screen flashes INSERT COIN, the two-note coin, then the cabinet takes over.
- DOM/CSS cabinets, no WebGL and no RAF loop (the global reduced-motion block covers it). Cabinet colours follow the Workshop palette (the shelf prop's `shell / plate / ears / buttons` roles).
- Test at 375×667, 375×548, 320×452. Move the cabinet screens out of `_secret.html` while touching markup.

**Prop = bear ears on the panda's one-piece body**, built as `LOU_BUILDERS.arcade` in `lounge-props.js`: hood + inset faceplate + CRT + joystick + buttons, coin door, side grille, lit marquee. Roles: body `shell`, faceplate and marquee frame `plate`, ears `ears`, stick ball and buttons `buttons`; glass fixed black. ~13 cm W × 20 cm H (23 to ear tips) × 14 cm D; modest triangle budget so it never needs `skipProps`.
- **Placement:** the **bottom bay** under the lamp's board (floor of bay = base board top, y = 0.10; bay ~31 cm tall, 22 cm deep, 78 cm wide), **left of centre — x ≈ 1.28** (the lamp is centred at 1.52; ~8 cm clear of the left wall), set forward so the screen shows, turned a few degrees toward the camera. Tune x, z and turn on the first render. Add a footprint entry for the bay to the harness. The dim baked bay shading is wanted: the lit CRT glows there.
- **Door:** pick id `arcade` → `openArcade` (optional; fallback `bop`), push-in on the CRT; tab order between `controller` and `lamp`.
- **Idle:** the CRT cycles the real cabinet names in their accents with INSERT COIN blinking (~10 fps). Beats on a 9–15 s gap: `ghost` (stick rocks, buttons light, score ticks; ~1.6 s, w .35), `twitch` (one ear flicks; ~0.6 s, w .30), `flicker` (marquee stutters; ~0.7 s, w .25), `hiscore` (HI-SCORE flash, coin lamp, tiny hop; ~1.4 s, w .10). Tap: START flashes, stick snaps, push-in. Reduced motion: nothing moves, one title card. One new synthesised name through the sfx seam (`arcadeCoin`).

**Open:** renumber stages (v255/v256 are taken): room = SW v257, prop = SW v258. Room first.

## 4. Stages

| Stage | Contents | Ships as |
|---|---|---|
| **1. Rewire** | Registry move, router place, doors in all three layouts, Board sound → header, Secret Mode cleanup, cabinet exits, a **plain but correct** room (list + launch + ✕), harnesses, docs | SW v254 — the arcade works everywhere, looking basic |
| **2. The room** | The cabinet/select-screen design to jukebox quality | SW v257 (shipped) |
| **3. Lounge prop** | 3D cabinet in `lounge-props.js`, hotspot `arcade` → `openArcade` (optional, with fallback), `lobby-doors.js` door | SW v258 |

Each stage ships on its own; Stage 1 alone is a complete, shippable change.

## 5. Verification (named up front)

**Re-run:** `verify-arcade.js` + `mutate-arcade.js` (re-pointed at `ARC_CABINETS` / `arcLaunch`),
`verify-lobby-router.js`, `visual-lobby.js` (+ its mutation pass), `verify-build-fresh.js`.

**New checks earned (rules and state, not presentation):**
- Router: `arcadeOpen` / `arcadeClose` / `home` reducer cases; `arcade` blocks the arrival beat like
  `jukebox`.
- Registry: no `SM_ARCADE` / `smArcade*` / `smLaunchArcade` left anywhere in `js/`; every cabinet's
  screen is in `allScreens[]`; `resetToLobby()` stops every cabinet; the Konami guard skips
  `screen-arcade` (mutation: drop that clause → red).
- Doors: the arcade place is offered in Classic, Board and TV (`visual-lobby.js`).

**`visual-check`:** the room at the three iPhone SE sizes (Stage 1 lightly, Stage 2 properly); the
Board header with 🔊 beside the controller.

**Not covered:** a real phone pass of the cabinets (already open in `docs/deferred-work.md`).

## 6. Docs closure (Stage 1)

`code-map.md` § Arcade Cabinets (out of Secret Mode; room ids) · `CLAUDE.md` Current Focus Arcade
paragraph, SW entry, load order · `logic-engine.md` § Lobby Router Seam (arcade beside the jukebox) ·
`ui-style.md` § Lobby layouts (dock contents, the room) · **`js/arcade/arcade-cabinet-prompt.md`**
(its integration contract names `SM_ARCADE`; the offline cabinet builder must get the new one) ·
`shared-implementation-notes.md` DD entry · `decision-log.md` (arcade leaves Secret Mode) ·
`deferred-work.md` grep "arcade".
