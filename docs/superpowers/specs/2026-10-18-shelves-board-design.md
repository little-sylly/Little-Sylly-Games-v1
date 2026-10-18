# Shelves → Board — the phone lobby rework

**Date:** 18 Oct 2026 · **Tier:** 2 (lobby layout, 3+ files under the router seam) · **SW:** ships as v250
**Visual reference:** `wip/shelves-mockups/hybrid.html` (local, git-ignored) and the review page
https://claude.ai/artifact/1W2NRPvY3rnBU45Gvjvmoe. The mockups are a reference for look and motion,
not code to copy: they are inline, single-file and skip the router, the ornament and the timer rules.

## 0. Confluence Snapshot

- **Decision:** replace the Shelves layout's list-of-shelves with **the Board** — the 20 die-cut
  stickers on one sheet, washi-tape shelf tabs, a peel-off **held card** you swipe between, and a
  glass **dock** for the doors, Random, Sound and Layout.
- **Rationale:** Shelves showed no game by name on its first screen, took three taps to reach a game
  and had no Random. TV and the Lounge now set a much higher bar. The owner wanted the phone layout
  to have its own identity rather than a portrait copy of TV's rail; the sticker sheet is that
  identity, and it is the suite's existing language (controller stickers, the Sticker Book).
- **Technical impact:** new `js/lobby/board.js` (prefix `bd`) as a patch-in-place renderer like
  `tv.js`; new `css/board.css`; `lobby.js` loses the Shelves render path but keeps the shared
  helpers; `lobby-host.js` mounts/drops the Board; display label `Shelves` → `Board` (id stays
  `shelves`). No packet, no MP, no localStorage, no new asset.

## 1. Owner decisions (this session)

| # | Decision |
|---|----------|
| D1 | Direction: the Sticker Board is home; tapping a sticker peels it into a held card with a swipe rail. Flat cards, no 3D coverflow (it must not read as TV's rail). |
| D2 | The **dock** (bottom glass bar) stays exactly as mocked. |
| D3 | **No Play again.** If it comes, it is suite-wide, built with saved state / profiles / sticker achievements. |
| D4 | Random: **middle-ground loud** — visual impact, but sensible (owner deferred the exact level to design). |
| D5 | Display name **"Board"**. |
| D6 | Games that don't fit the filters are **left out of the swipe rail** — the filter gains value as the box grows. |
| D7 | The card's back **replaces the bottom sheet** (How it goes, players, phones, Sylly Mode). |

**Assumptions — confirm or correct at spec approval:**
- **A1** On the **board** (not the rail), non-fitting stickers stay visible as dashed kiss-cut ghosts
  after the fitting ones, with their reason. Tapping one wobbles it ("inert but answerable",
  `ui-style.md` § The Stack, the disabled-control note) — it never opens a card. Rationale: the board is the overview and says
  *why* something is missing; D6 is about the swipe. If the owner wants them hidden on the board too,
  it is one line in `bdOrder`.
- **A2** Random draws from the **fitting games on the current tab** (on *All 20*, every fitting game).
- **A3** Switcher icon for Board: 🏷️ (was 🗂️).
- **A4** TV's own "← Shelves" back button is untouched — it names TV's shelf picker, not this layout.

## 2. The experience

### 2.1 The Board (home)
Top to bottom, one scroller (`#screen-shelves` stays a full-window column, not an `h-screen` exception):
1. **Header** — one-line `.sylly-wordmark` (row form, as TV's `.lb-lg-mark`) left; right, the live
   ornament in `#shelves-controller` (~88×64) with **You ▾** under it (the existing nickname popover,
   `lbRenderProfilePop`/`lbWireProfilePop`). When `smArcadeUnlocked`, a 🕹️ key sits left of the ornament
   (today it lives in Shelves' icon row, which goes).
2. **"What are we playing today?"** — `font 700 26px`, "playing" in the accent pink.
3. **Who's playing** — TV's keycaps as a players stepper (Any → 2 … 9 → 10+) and a **📱 One phone**
   key, then the shared `lbFitLine()` sentence (`aria-live="polite"`) with a **Clear** link when filtered.
   Same `lbState.count` / `lbState.onePhone` TV reads — one filter state for both layouts, as today.
4. **Washi-tape tabs** — *All 20* + the six `LB_SHELVES` in order; each carries its count, or
   `fit/total` when filtered. Pastel tape colours that never collide with a brand colour. `aria-pressed`.
5. **The sheet** — a 3-column grid of stickers (art from `data/stickers/<id>.png`, deterministic tilt
   via `tvTilt`), each with a brand-colour name tape. Order: fitting games first in `GAMES` order, then
   ghosts (A1). A filter or tab change reorders with a FLIP (transform only). Stickers slap on once on
   first mount (staggered, from a visible state).
6. **Empty states** — a tab with no fitting game: a taped note "Nothing on this tab fits your group"
   + Clear. Nothing fits anywhere: the same note on *All 20*, and the die is disabled.

### 2.2 The held card
- **Open:** tapping a fitting sticker peels it: a flying copy lifts off the slot (slight `rotateX`
  curl), the slot keeps only its dashed outline, and the copy lands in the card's sticker spot as the
  card scales up from 0.9. The board stays visible behind a scrim tinted
  `color-mix(current brand 16%, paper)`; no `backdrop-filter` (cost on low-end phones).
- **Rail:** horizontal `scroll-snap-type: x mandatory`, cards `min(80vw, 320px)`, neighbours peek both
  sides. Order = the board's **fitting** games on the current tab, same order (D6). Cards follow the
  scroll with a flat transform only (`rotate(d·4°) translateY(|d|·12px) scale(1 − |d|·0.08)`), written
  only for cards within ±2 of centre.
- **Top bar:** **← Board** pill, "Swipe down to put it back" hint, `n of N` count. Colour dots under the
  rail (each a jump button). Below 600 px tall: no dots, no hint, smaller sticker, pitch clamped to two
  lines, minutes chip dropped — the card always takes the height the rail has (`calc(100% − …)`), so
  **Play is never under the dock** (owner's SE incl. 320×452 Display Zoom).
- **Card front:** sticker breaking out of the top, shelf eyebrow, name, pitch, chips (players short,
  phone short, minutes when known), **Play CTA** labelled with the game's own `playCtaLabel` →
  `lobbyLaunch(id)`, and **How it goes ↻**.
- **Card back** (D7): the sticker's backing paper in the game's colour, the empty kiss-cut outline,
  the name, "Tap to turn ↻", then **`lbSheetBodyInner(g)`** — the same function TV's pane renders, so
  the two can never drift. Board-scoped CSS restyles it. Tapping the back turns it over. Swiping away
  turns a flipped card back.
- **Put back:** ← Board, a downward swipe on the rail (> 100 px; `touch-action: pan-x` so vertical
  drags reach us), a tap on the rail's empty space, or Escape. The sticker you are **holding now**
  (not the one you opened) flies back to its own slot; the board scrolls that slot into view first,
  invisibly behind the scrim.
- Arrow keys move the rail. Focus moves to the current card's Play on open and back to the sticker on
  close. The layer is `role="dialog" aria-modal="true"`; flipped faces swap `aria-hidden`.

### 2.3 The dock
Fixed glass bar at the bottom of `#screen-shelves`, safe-area aware, above the held layer:
**🎵 Jukebox · 📒 Stickers · [die] · 🔊 Sound · 🏷️ Layout.**
- Jukebox / Stickers: `data-lobby-place` → `lobbyOpenPlace()`; **absent, not dimmed** until
  `lobbyPlaceOffered()` (the dock reflows to four).
- Sound: the icon span carries `.btn-open-sound` **only so `toggleMute()` keeps its emoji in sync**;
  the button wires tap (`playPillClick` + `openSoundOverlay`) and 500 ms hold (`toggleMute` +
  `playSliderTick`) itself with `bindCardHold`, mirroring `engine.js`'s boot binding, which never sees a
  button rendered after boot. The label sits outside that span (`toggleMute` rewrites its textContent).
- Layout: `lobbyDispatch({ t: 'openSwitcher' })` — the existing `#lobby-switcher-overlay`, which already
  renders from `LOBBY_LAYOUTS` and hides what this device may not use. The in-phone `.lb-switch` goes.
- **Capacity:** four doors + the die is the limit. A future door (the dice selector,
  `deferred-work.md`) needs a decision then — a "More" sheet or a swap — not a sixth slot.

### 2.4 Random (D4 — the middle ground)
- **From the board:** the board scrolls the pick's slot into view while every fitting sticker jiggles
  and a pink ring hops between them — 9 hops, 100 → 244 ms apart, landing on the pick (~1.5 s). Then
  the pick peels into the held card and lands with a slap and a 14-piece brand-colour burst.
- **Already holding a card:** the rail riffles out to the far end and eases back onto the pick
  (1.3 s), then the same slap + burst.
- Pool per A2; the pick is made **before** the show (the choreography is decoration on a decided
  result). Disabled (dimmed, `aria-disabled`) when the pool is empty. No full-screen effects.
- **Reduced motion:** no hops, no riffle, no flight, no burst — the card simply opens on the pick.

### 2.5 Sound (existing functions only — `BD_SOUND` map, the CJAR/DYB pattern)
`peel → playWhoosh`, `putBack → playPillClick`, `flip → playPillClick`, `tab → playPillClick`,
`hop → playTick`, `land → playSuccess`. Play itself makes no Board sound — the game's own lobby button
(clicked by `lobbyLaunch`) already does.

## 3. Architecture

### 3.1 `js/lobby/board.js` — prefix `bd` (new, load after `tv.js`)
A **patch-in-place** renderer, for the reason `tv.js`'s header gives: `lbSet()`'s rebuild-everything
would destroy the FLIP, the rail's `scrollLeft` and any in-flight flight on every keycap tap. Built once
per mount; afterwards only `bdPaint()` touches it.

| Symbol | Kind | Job |
|--------|------|-----|
| `BD_STATE` | state | `{ tab: 'all', held: null \| id, rolling: false }` — memory only, reset on mount |
| `bdOrder(games, tab, whyOut)` | **pure** | `{ fit: [...], out: [...] }` — tab membership, `GAMES` order kept, fitters first (A1) |
| `bdRail(games, tab, whyOut)` | **pure** | `bdOrder(...).fit` — the swipe never holds a non-fitting game (D6) |
| `bdPick(pool, rand)` | **pure** | a game from the pool, or `null` when empty; `rand` injected |
| `bdTabCount(games, tab, whyOut, filtered)` | **pure** | the tape's label text |
| `bdMount(root)` | DOM | builds header, filters, tapes, board, held layer, dock; calls `lobbyAfterLayoutRender()` once |
| `bdPaint()` | DOM | filters/tab changed: counts, ghosts, reasons, FLIP reorder, empty note, die state; if a card is held and is no longer in the rail, put it back |
| `bdHold(id, { fromRandom })` | DOM | the peel + open (§ 2.2) |
| `bdPutBack({ instant })` | DOM | the flight home (§ 2.2) |
| `bdRandom()` | DOM | § 2.4 |
| `bdDrop()` | DOM | stop everything: clear `bdTimers`, cancel `bdRaf`, cancel running WAAPI flights, close the held layer instantly, clear `rolling` |
| `bdTimers` / `bdRaf` | handles | the Board's own timer bag + rAF (scroll follow, riffle) |
| `BD_SOUND` | map | § 2.5 |

Pure helpers are exported (`module.exports`) like `tv.js`'s, for `tools/verify-board.js`.
Sticker art goes through one helper that falls back to the emoji on a brand disc when the image is
missing or fails (`LB_NO_STICKER` or `onerror`) — the runtime-cached `data/stickers/` contract: offline
before the first fetch means a disc, never a broken image.

### 3.2 `js/lobby/lobby.js`
- **Remove** the Shelves render path: `lbRender`, `lbRenderBrand`, `lbRenderPlaces`, `lbRenderDock`,
  `lbRenderBody`, `lbRenderWho`, `lbRenderShelves`, `lbRenderFolder`, `lbRenderSheet`, and
  `lbState.folder` / `.sheet`. Grep for each before deleting — anything TV or the Lounge reads stays.
- **Keep** the shared helpers: `lbState` (`count`, `onePhone`, `profileOpen`), `lbWhyOut`,
  `lbPlayersText/Long`, `lbPhoneText/Long`, `lbFitLine`, `lbSheetBodyInner`, `lbBadgeInner`,
  `LB_NO_STICKER`, `LB_SHELVES`, `lbRenderProfilePop`/`lbWireProfilePop`, `lbEsc`, the TV gate.
- `lbSet(patch)` keeps its contract for TV's keycaps but no longer rebuilds Shelves: assign, then
  `bdPaint()` if the Board is up, then the existing TV/ornament after-render.
- TV hand-off card copy: "…On a phone it stays on the **Board**." / "Back to the **Board**".

### 3.3 `js/lobby/lobby-host.js`
- `lobbyPresent('shelves')`: `bdMount` (idempotent) instead of `lbRender`; any other view → `bdDrop()`.
- `lobbyPaintPlaces()`: `bdPaint()` instead of `lbRender()` (the dock's Stickers door appears in place).
- `lobbyLeaveForGame()`: + `bdDrop()`. A game launched from a held card returns to a **closed** Board
  (`resetToLobby` → `lobbyShow` → `lobbyPresent` → mount).

### 3.4 Small edits elsewhere
- `lobby-router.js`: `LOBBY_LAYOUTS` `shelves` → `label: 'Board', ico: '🏷️'` (id, `enterShelves`,
  views unchanged). Fix the stale `// the phone's own .lb-switch takes over` comment.
- `lounge-props.js`: `LOU_PHONE_MENU` `'Shelves'` → `'Board'` (the phone prop's LCD; check
  `verify-lounge-props.js` for an asserted string).
- `src/screens/_head.html`: link `css/board.css`. `#screen-shelves`, `#shelves-canvas` and
  `#shelves-controller` keep their ids (harness maps, ornament slot table).
- `sw.js`: precache `js/lobby/board.js` + `css/board.css`; `CACHE_NAME` → v250.
- `css/board.css` (new) — everything scoped under `#screen-shelves`, the `css/lobby.css` rule (never
  `html`, `body` or a bare element). Then remove Shelves-only rules from `css/lobby.css` (`.lb-dock`,
  `.lb-switch`, `.lb-seg`, `.lb-row*`, `.lb-grid`, `.lb-tile`, `.lb-folder*`, `.lb-sheet*`, `.lb-who`,
  `.lb-step*` stepper, `.lb-brand`, `.lb-you-*` unless TV uses them) — **each one grepped across
  `js/` and `src/` first**; TV shares `.lb-phone`/`.lb-tv` palette and `lbSheetBodyInner`'s classes.

### 3.5 Rules this must keep
- **Router seam:** nothing here calls `showScreen` on a layout; a game launch is `lobbyLaunch`.
- **Timer Lifecycle:** `bdTimers`/`bdRaf` cleared by `bdDrop()` on leaving the layout, on a game launch,
  and (via `lobbyShow`'s re-present) after `resetToLobby()`. Add the Board to DD-54's clear-site list.
- **Reduced motion is checked in JS** for every WAAPI flight, FLIP, rAF follow and the riffle — the CSS
  block does not reach them (`ui-style.md` § Motion Standard). Nothing travels; nothing is stranded.
- **Motion:** transform/opacity only. FLIP 280 ms; the peel (480 ms), put-back (420 ms) and flip
  (460 ms) are the held layer's entrance/exit — overlay-class, under the 500 ms ceiling. Random's
  ~1.5 s is a blocking choreography beat (a decided pick being shown), the sanctioned exception.
- **No `transition-all`**, `.pill`-free (tapes are their own control), 44 px targets everywhere.
- **White ink on brand fills** (locked scheme) — name tapes and card fronts included.
- **Absent, not dimmed** for doors and layouts this device may not use.

## 4. Verification (named up front)

**Existing harnesses to re-run, and the edits they need:**
| Harness | Why / edit |
|---------|------------|
| `node tools/verify-lobby-router.js` | label change only; ids asserted, should stay green untouched |
| `node tools/verify-tv.js` | shared helpers kept; must stay green untouched |
| `node tools/verify-lounge-props.js` | the phone menu string, if asserted |
| `node tools/visual-lobby.js` **+ its seam mutation pass** | **edit:** the Shelves launch path (`lbSet({folder, sheet})` + `#lb-play`) becomes `bdHold('frt')` + the current card's Play; the handed-out check moves from `.lb-switch .lb-seg` to `#lobby-switcher-overlay` opened from the dock; § 17 places row → the dock's `[data-lobby-place]` |
| `node tools/visual-controller-stickers.js` | the ornament still mounts in `#shelves-controller` at its new size |
| `node tools/verify-build-fresh.js` | `_head.html` changed |

**New — `tools/verify-board.js` (pure tier, Node), rules and state only:**
- `bdOrder`: tab membership, `GAMES` order preserved, fitters before ghosts, every game exactly once on *All*.
- `bdRail` **never contains a game `lbWhyOut` rejects** (D6) — across every count 2–10 × one-phone × tab.
- `bdPick`: always from the pool, `null` on an empty pool, deterministic under a seeded `rand`.
- `bdTabCount`: counts match `bdOrder` in both filtered and unfiltered form.
- Takes `BOARD_SRC=` so a broken copy proves it fails first.

**New checks in `tools/visual-lobby.js` (routing/state, real Chromium):**
- Board → hold → Play launches the game; quitting returns to the Board with **no held layer** up.
- Random from the Board lands on a game in the pool and opens its card; with a filter that empties
  the pool, the die does nothing.
- Dock Layout opens the switcher; on a handed-out device it has no Lounge entry.
- Dock Sound: tap opens `#sound-overlay`; hold mutes and the dock icon reads 🔇.
- After a launch mid-Random, nothing of the Board's is still running (`bdTimers` empty, `bdRaf` null).
- Offline before the sticker fetch: the board shows brand discs, no broken images.

**Mutations that must go red:** let `bdRail` return `bdOrder().fit.concat(out)` → `verify-board`;
drop `bdDrop()` from `lobbyLeaveForGame` → `visual-lobby`.

**Presentation — `visual-check` skill, throwaway, no new assertions (Harness rule):** 390×844,
375×667, 375×548, 320×452: the first screen shows six named stickers; the held card's Play clears the
dock; the card back fits or scrolls inside itself; no horizontal overflow; reduced motion — nothing
travels, nothing left behind.

**Not covered by any of the above — the owner's real-phone pass:** swipe-down feel, rail feel, the
peel's timing, scroll-follow smoothness on the SE.

## 5. Build stages (each ends with its harnesses green)

1. **Pure core** — `board.js` skeleton with the four pure helpers + `verify-board.js` (mutation proven).
2. **The Board** — header, filters, tapes, sticker grid, ghosts, FLIP, empty notes; the dock (places,
   Sound, Layout, die present but inert); `lobby.js`/`lobby-host.js` wiring and the old path removed;
   `board.css`; labels renamed; `visual-lobby` edits for launch path/switcher/places. *Checkpoint:
   every layout → game → quit lands where it left; the seam mutation pass is red→green.*
3. **The held card** — peel, rail, flip, put back (all four ways), keyboard and focus, short-screen
   rules, Play → `lobbyLaunch`. `visual-check` at the four sizes.
4. **Random + sound + motion audit** — both choreographies, `BD_SOUND`, the JS reduced-motion pass,
   the `bdDrop` timer audit; the new `visual-lobby` checks.
5. **Close-out** — dead `.lb-*` CSS removed (grepped), `sw.js` precache + v250, `MP_PROTOCOL_VERSION`
   untouched (no packet), then the Documentation Integrity Protocol: `code-map.md` § Lobby layouts
   (files, screens, slot table, `board.js` API), `ui-style.md` § Lobby layouts (Board + dock),
   `definitions.md` reserved prefixes (+`bd`), `logic-engine.md` § Timer Lifecycle list, `CLAUDE.md`
   (load order, SW entry), `shared-implementation-notes.md` (one DD for the Board), `deferred-work.md`
   (dock capacity note; a dock for Classic as an open idea), `docs/decision-log.md`.

## 6. Risks

- **Scroll-snap re-snaps after a reorder.** Found in the mockup: Chrome keeps the previously snapped
  child in view when children move, so a row "doesn't reorder". Reset `scrollLeft` on any reorder; the
  rail is rebuilt (not reordered) when the held set changes.
- **A held card leaving the rail** (a filter change while holding) — `bdPaint()` puts it back first.
- **iOS Safari features** — `color-mix()` (16.2+) and the individual `translate`/`scale` properties
  (14.5+). If the owner's SE runs older iOS, fall back to precomputed rgba tints and `transform`.
- **The ornament slot** is now built once per mount rather than every render — the stale-attach guard
  in `ctlMountOrnament` already covers a mount that lands after the Board is gone.
- **Install:** ~+25 KB precached JS/CSS; no new asset (stickers are already runtime-cached).

## 7. Out of scope

Play again and filter persistence (D3 — suite-wide, with profiles); the dock on Classic or TV; any TV
change beyond the hand-off copy; renaming the internal id `shelves`, `enterShelves` or the screen ids;
the dice selector's door (§ 2.3 capacity note).
