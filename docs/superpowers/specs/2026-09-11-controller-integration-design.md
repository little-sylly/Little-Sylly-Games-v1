# Design — Controller integration: lobby mount, Workshop, and the Secret Mode gateway

**Date:** 11 Sep 2026
**Status:** Approved design, pending implementation plan
**Tier:** 2 — Architectural (new surface, cross-cutting, new vendored dependency)
**Amends:** `docs/design-brief-lobby.md` § 4 (see § 12).

---

## 1. Summary

The 3D controller prototype built in `assets/controller/` becomes a real part of the app. It
replaces the lobby's 🎮 emoji, opens a **Workshop** screen where its four colour groups are painted
from the suite's own twenty brand colours, and becomes the **input surface for the Konami code** —
which now leads to a rebuilt, animated Sylly Gateway and on to the unchanged Secret Terminal.

This is the first of two sub-projects. **Stickers and achievements are deliberately not in it** —
see § 13.

The one-line version: *the controller becomes both the app's front door ornament and its secret
entrance, and it remembers what you did to it.*

---

## 2. Context and current state

### 2.1 What exists

`assets/controller/` holds a working prototype:

| File | What it is |
|------|-----------|
| `body.js` | Geometry — the shell height field, ears, sticks, d-pad, face buttons, shoulders. Pure; takes `THREE` as an argument. |
| `sticker-surface.js` | Sticker placement mathematics. No Three dependency. **Not needed by this spec.** |
| `standalone-stickerless.html` | The working prototype. Carries `body.js` and `sticker-surface.js` **duplicated inline** as its first two script blocks, plus ~800 lines of scene/app code that exists nowhere else. |
| `controller-handoff-v3.md` | Session handoff. § 3 documents three non-obvious bugs already fixed; § 4 lists outstanding work; § 5 is gotchas. Read § 3 before touching rotation, distortion or the live preview. |

### 2.2 What is being replaced

- `#lobby-icon` — the 🎮 emoji at `index.html:29`, carrying a 7-rapid-tap listener that opens the
  Secret gateway.
- `screen-secret-controller` — a 2D CSS/emoji controller (d-pad, B/A, SEL/STA, progress dots) on
  which the Konami sequence is currently entered.
- `smShowArcadeTile()` — injects the 🕹️ arcade shortcut beside `#lobby-icon`, an element that
  ceases to exist.

### 2.3 The flow today

```
lobby: 7 rapid taps on 🎮   ─┐
desktop: ↑↑↓↓←→←→BA Enter   ─┴→ screen-secret-controller
                                  ↓ enter the sequence AGAIN on 2D buttons
                                [ ACCESS GRANTED ], auto-advance at 1.4 s
                                  ↓
                                screen-secret-terminal  (packs · skins · arcade)
```

Two doors, one lock, and the lock is behind the door.

### 2.4 The flow after this work

```
lobby: tap the 3D controller
  ↓
screen-workshop            press ↑↑↓↓←→←→ B A Start on the real buttons
  ↓
screen-secret-gateway      gibberish boot stream, lightly blurred
                           ends on [ ACCESS GRANTED ] — waits for a tap
  ↓
screen-secret-terminal     unchanged
```

One door, and the lock is the thing you were already playing with.

---

## 3. Scope

### In

1. Three.js vendored locally and precached.
2. `body.js` de-duplicated into `js/lib/`; the standalone prototype frozen as reference.
3. A lobby mini controller replacing the 🎮 emoji, rendering on demand, painted with the saved design.
4. `screen-workshop` — a new screen with a fixed 3D stage and a scrolling colour panel.
5. Four colour groups over the twenty brand hexes, read live from `GAME_BRAND_HEX`.
6. Persistence via a fourth permitted `localStorage` key.
7. Konami entered on the real 3D buttons; the 7-tap trigger deleted; keyboard Konami completing the unlock.
8. `smShowArcadeTile()` retargeted to a lobby header icon row, 🕹️ left of 🔊.
9. `screen-secret-controller` rebuilt as `screen-secret-gateway` — an animated boot/loadout screen,
   and the Secret Terminal's ← BACK re-pointed at the lobby (§ 9.5).
10. Service-worker precache additions and a version bump.
11. Documentation per the Documentation Integrity Protocol.

### Out

Stickers of any kind (no inventory, no book, no placement, no `sticker-surface.js`), textures and
patterns, achievements, unlock gating, player profiles, any change to the Secret Terminal's pack /
skin / arcade behaviour, and any change to the lobby's game list or sort.

---

## 4. Decisions

Each of these is a deliberate exception to a standing project rule and must reach
`docs/decision-log.md`.

### 4.1 Three.js is vendored as a third first-party library

`CLAUDE.md` § Anti-Patterns forbids external JS libraries; the two existing exceptions (local
Tailwind, the Firebase SDK) are both vendored and precached. Three.js r128 becomes the third, on the
same terms: **a local file in `js/lib/`, listed in `PRECACHE_URLS`, never fetched from a CDN.** The
app's "zero runtime third-party dependencies" property is preserved — nothing is fetched from
anywhere at runtime.

**Cost:** approximately 600 KB raw (~150 KB gzipped over the wire; Cache Storage holds the raw
copy). For scale, all nine core art packs together are ~682 KB. This roughly doubles the install.

**Alternatives rejected:** CDN (breaks offline and the zero-dependency property); runtime-caching it
like `data/music` (a cold offline install would have no controller, requiring an emoji fallback path
to build and maintain forever); rewriting the renderer without Three (discards a working prototype
and months of fixed bugs for no user-visible gain).

**Boot cost is a tuning decision, not a re-litigation.** The vendored file's real size and its parse
cost at boot are measured during implementation on a throttled mobile profile. If lobby paint
visibly suffers, the `<script>` becomes a deferred injection on the Firebase pattern, with the lobby
canvas showing a placeholder until ready. The precache contract is identical either way.

### 4.2 `sylly_controller` is a fourth permitted localStorage key

`CLAUDE.md` permits exactly three keys (`isMuted`, `masterVolume`, `sylly_nickname`). The saved
controller design is a **user preference, not game state** — the same category `sylly_nickname`
occupies — and the rule's purpose (no mid-round game state in storage) is untouched.

Without it, nothing a player makes survives a reload, which the handoff itself flags (§ 4.1) as the
reason most other integration work is hard to usefully test.

### 4.3 The Workshop joins the legacy `h-screen` whitelist

`ui-style.md` makes the Stack the single layout law and deprecates the sticky-footer pattern, but
maintains a whitelist of screens that keep it for a stated reason. The Workshop qualifies on exactly
the grounds `screen-cld-floe` already does: **a page-scroll during a rotate-drag would hijack the
drag.** The controller must also stay visible while its colours are being changed — `ui-style.md`
§ "A control used while reading the Stage belongs IN the Stack, not over it" is the governing
principle, and an overlay would take the preview away at the exact moment it matters.

This is added to the whitelist table as a row with its reason, so it never reads as drift.

### 4.4 The gateway rework ships in this spec, not a later one

Originally planned as a separate sub-project. Pulled forward because the alternative is shipping a
gateway screen whose d-pad and face buttons are visibly present and do nothing — a worse artefact
than the work it defers. The cost is a text-animation screen, not new architecture.

### 4.5 No tab bar in the Workshop

The Workshop's panel band is colour-only. A tab bar with one live tab and one inert "Stickers" tab
is a control that does nothing, and the project already holds that an honest absence beats a dead
control (`ui-style.md`, the COMB no-Sylly-Mode form). The band is reserved by the layout; the
sticker sub-project adds two real tabs and nothing reflows.

---

## 5. Architecture — files and modules

### 5.1 New files

| File | Origin | Global | Precached |
|------|--------|--------|-----------|
| `js/lib/three.min.js` | Vendored Three r128, unmodified | `THREE` | yes |
| `js/lib/controller-body.js` | `assets/controller/body.js`, wrapped | `ControllerBody` | yes |
| `js/controller.js` | **New** — extracted from `standalone-stickerless.html`'s scene/app script blocks | `ctl*` functions | yes |

`controller-body.js` exposes its builders on one namespace object rather than as bare globals:
`window.ControllerBody = { buildBody, buildControls, buildEars, smoothNormals }`. The functions
themselves are unchanged — they already take `THREE` as a parameter, so nothing about their
internals moves.

`js/controller.js` owns: scene/camera/renderer setup, materials, the shell and ear atlas canvases
and their `redraw()`, the drag/press pointer handling, the lobby mini mount, the Workshop wiring,
persistence, and the Konami adapter. Prefix `ctl` — verified free against all twenty game prefixes
in `definitions.md`.

### 5.2 The duplication problem, resolved

`controller-handoff-v3.md` § 4.2 and § 6.3 both flag that `body.js` and `sticker-surface.js` are
duplicated inline in the standalone prototype, and that every fix in that session had to be applied
twice by hand. **This spec ends that:** `body.js` lives once, at `js/lib/controller-body.js`, and
`assets/controller/standalone-stickerless.html` becomes a **frozen reference artefact** — kept for
its documentation value, explicitly never edited again. A note to that effect goes at the top of the
handoff document.

`sticker-surface.js` is untouched by this spec and stays in `assets/` until the sticker sub-project
brings it in. This matters for more than tidiness: `redraw()` paints the shell and faceplate colours
directly onto the atlas canvas from `geo.userData`, with no reference to `StickerSurface` at all.
**The colour-only Workshop therefore never pays `StickerSurface`'s construction cost** — the ~0.8 s
desktop build the handoff flags for re-measurement — and neither does the lobby.

### 5.3 Load order

`CLAUDE.md` § Load Order gains three entries:

```
… → art.js → js/lib/three.min.js → js/lib/controller-body.js → physics.js → …
… → cld.js → js/controller.js → secret-mode.js → app.js
```

`js/controller.js` sits immediately before `secret-mode.js` because it replaces DOM that
`secret-mode.js` binds to at parse time. All symbols remain global; forward references still work at
runtime.

---

## 6. The lobby mount

### 6.1 Markup

`#lobby-icon` is replaced by:

```html
<div id="lobby-controller" role="img" aria-label="Your controller — tap to customise">
  <canvas id="lobby-controller-canvas"></canvas>
</div>
```

Sized at roughly 2–2.5× the emoji's previous footprint — large enough that the ears, d-pad and
sticks read at a glance and the object announces itself as interactive, small enough that the logo
below it remains the hero. **The exact size is tuned against the real render via the `visual-check`
skill, not guessed at spec time.**

### 6.2 Rendering

Renders **on demand only**: one frame at mount, frames only while a drag is in progress, plus a
short eased spin-down after release. No idle `requestAnimationFrame` on the app's front door.

The spin-down is a JS-driven animation, so the global `prefers-reduced-motion` CSS block does not
reach it (`ui-style.md` is explicit that a rAF loop is the one place a per-feature check is
required). Under reduced motion the controller settles immediately on release rather than coasting.

It paints the **saved** design, so a returning player's own controller is the first thing they see.

### 6.3 Interaction

A tap opens the Workshop. Tap-versus-drag uses the prototype's existing displacement/time
discrimination, unchanged. There is no tap-counting on the lobby.

### 6.4 The header icon row

The lobby's `.btn-open-sound` moves into a static container:

```html
<div id="lobby-header-icons" class="absolute top-4 right-4 flex items-center gap-3">
  <button class="btn-open-sound …">🔊</button>
</div>
```

`smShowArcadeTile()` changes from "wrap `#lobby-icon` in a new flex row and append a sibling" to
"**prepend** into `#lobby-header-icons`", placing 🕹️ to the left of 🔊. It remains idempotent, and
its sticky-unlock behaviour across `resetToLobby()` is unchanged.

---

## 7. The Workshop screen

### 7.1 Identity

`screen-workshop`, registered in `allScreens[]` in `engine.js`. Not a game: `activeGameId` stays
`null`, so `showScreen()` keeps the lobby music playing and the sound overlay stays on neutral stone
via the existing `updateSliderTheme(null)` fallback. No music, slider-theme or mute-toggle work is
needed.

### 7.2 Layout

Four bands, per § 4.3:

| Band | Behaviour | Contents |
|------|-----------|----------|
| Header | fixed | "Workshop" (`text-stone-800`, bold) · `[?]` · 🔊 · ✕ |
| Stage | **fixed, never scrolls** | The 3D canvas, ~40% of viewport height, with a `text-stone-400` hint line: "Drag to turn it around" |
| Panel | scrolls independently | Four white `rounded-2xl shadow-sm` cards |
| Controls | fixed | **Save** (primary, brand fill, white ink) · **Reset** (neutral stone) |

Both controls are `min-h-14 rounded-2xl … font-semibold`, matching size and weight per the type
scale rule. The `[?]` opens a short How-to overlay explaining drag-to-rotate and Save/Reset; it
follows the canonical How-to structure but carries **no Sylly Mode card** — the Workshop is not a
game, and that card's rule is scoped to games.

The `✕` returns to the lobby directly. There is no quit-confirm overlay: nothing is mid-round, and
unsaved colour changes are recoverable in two taps. Unsaved changes are **discarded** on exit; the
lobby mini controller always reflects the last *saved* state.

### 7.3 Lifecycle

The Workshop's render loop is a timer under `logic-engine.md` § Timer Lifecycle and is cancelled
with `cancelAnimationFrame` in all three required places: the ✕ handler, any early transition out of
the screen (including the Konami success path), and `resetToLobby()`.

---

## 8. Colour model and persistence

### 8.1 The four groups

Exactly the prototype's four, unchanged:

| Group | What it recolours | How |
|-------|-------------------|-----|
| **Shell** | The shell atlas base fill (`shellColor` in `redraw()`) | Repaints the canvas fill. **Not** `material.color` — that would multiply the whole map and tint every sticker placed on it later. |
| **Faceplate** | The painted deck-plate inset (`plateColor`) | Texture region only; no geometry, no physical edge. A documented pre-existing trade-off. |
| **Ears** | The ear atlas base fill (`earColor`) | As Shell, on the ear atlas. |
| **Buttons** | Both sticks, both stick wells, the whole d-pad including its hub, both shoulder buttons | Direct `material.color.setHex(…).convertSRGBToLinear()` — safe because these are solid untextured materials sharing no sticker paint. |

The four face buttons and Select/Start keep their fixed individual accent colours and are **not**
customisable, as in the prototype.

### 8.2 The palette

Derived at runtime from `GAME_BRAND_HEX` in `js/engine.js` — **read, never copied**. Consequences: a
twenty-first game appears in the Workshop palette with zero customiser edits, and a brand recolour
propagates for free.

`Object.values()` order carries no meaning, so swatches are sorted by the existing `lobbyHexToHSL`
hue walk — the same ordering the lobby's Colour sort already uses, so the two surfaces agree about
what "next to" means.

Twenty swatches per card, laid out to fit 384 px with a 44 px touch minimum. The selected swatch
carries a ring and a tick.

### 8.3 Storage

```js
localStorage['sylly_controller'] =
  '{"v":1,"shell":"#A855F7","plate":"#9333EA","ears":"#A855F7","buttons":"#7E22CE"}'
```

Versioned from the first release so the sticker sub-project can add a `stickers: […]` field without
guessing at a migration. Read is total: absent, unparseable, wrong-typed or wrong-version input all
fall back to the prototype defaults, silently — never a thrown error on the app's front door.

**Reset** restores the prototype defaults, which are deliberately *not* among the twenty. That is
the factory look, and it stays reachable.

---

## 9. The Konami rework and the gateway

### 9.1 The adapter

A thin mapping in `js/controller.js`, called from the existing press handler:

| Pressed | Code |
|---------|------|
| D-pad, `userData.dir === 'Up' / 'Down' / 'Left' / 'Right'` | `U` / `D` / `L` / `R` |
| `Face A` | `A` |
| `Face B` | `B` |
| `Start` | `S` |

Everything else (`Face X`, `Face Y`, `Select`, sticks, shoulders) presses and sounds normally but
feeds no code. Each mapped press calls the existing `smHandleButton(code)`; the buffer, the retro
beeps, the arcade unlock and the terminal hand-off are **entirely unchanged**.

This is only possible because the prototype already resolves d-pad direction from the raycast hit
point — `tryPress()` sets `userData.dir` to a cardinal, forcing a diagonal to one axis the way a real
pivot does. No geometry or press logic changes.

The Konami is live **only on the Workshop screen**, not on the lobby mini controller. The lobby's
single tap opens the Workshop; the Workshop is where the buttons are big enough to press
deliberately.

No progress indicator. It is a secret; the beeps are the feedback.

### 9.2 Changes in `secret-mode.js`

1. **The 7-tap listener is deleted.** It is replaced by the real sequence on real buttons.
2. **Keyboard Konami now completes the unlock** rather than merely opening the gateway. Today it
   navigates to a screen where the player must enter the sequence a second time; after this change
   it runs the same success path as the controller. Its two existing guards (suppressed while the
   gateway or the Asherplane cabinet is showing) are preserved.
3. **`smShowArcadeTile()` is retargeted** per § 6.4.

### 9.3 `screen-secret-controller` → `screen-secret-gateway`

Renamed. The element is no longer a controller, and leaving a misleading id behind is how
`sylly-signals` and `btn-dstw` happened. The id appears **nine times across six files**:

| File | Occurrences |
|------|-------------|
| `index.html` | 2 — the `<section>` id and a screen-inventory comment |
| `js/engine.js` | 1 — the `allScreens[]` entry |
| `js/secret-mode.js` | 4 — the terminal's back handler, the 7-tap trigger, the keyboard guard, the keyboard success path |
| `docs/code-map.md` | 1 |
| `docs/design-brief-lobby.md` | 1 |

Two of those (the 7-tap trigger, the keyboard success path) are deleted or rewritten anyway; the
rest are a straight rename.

**Deleted:** the d-pad cluster, the four face/menu buttons, the SEL/STA pair, the progress-dot block,
and their eight click listeners. `smUpdateProgress()` already returns early when its element is
absent, so the buffer machinery needs no change and the desktop keyboard path keeps working.

**Added:** the boot/loadout animation.

### 9.4 The loadout

Visual language is the Secret Terminal's existing CRT green-on-black (`font-mono`, green on black) —
the same language the arcade cabinets use. Not the Stack, not the brand palette.

Behaviour: lines of plausible-looking gibberish stream in rapidly, lightly blurred, as though a
process is executing. The stream resolves into `[ ACCESS GRANTED ]`, at which point a
**tap-to-continue** affordance appears and the screen waits. Tapping calls `smOpenTerminal()`.

Three implementation constraints that are easy to get wrong:

- **The blur is static, never animated.** `filter` is neither `transform` nor `opacity`; animating it
  would break `ui-style.md`'s Motion Standard and janks on a mid-range phone.
- **The stream needs its own `prefers-reduced-motion` check in JS.** It is driven by a timer, and the
  global CSS block only zeroes `animation-duration` / `transition-duration` — it cannot reach a
  `setInterval` writing text. Under reduced motion the screen renders its finished state
  immediately, showing `[ ACCESS GRANTED ]` and the tap affordance. Reduced motion must not become
  reduced information.
- **The stream's handle is a timer** under § Timer Lifecycle: cleared on the ✕, on tap-to-continue,
  and in `resetToLobby()`. The existing `smTypewriterTimers` array is the established pattern in this
  file and should be reused rather than a new handle invented.

Waiting for a tap rather than auto-advancing at 1.4 s is a deliberate change: a slow phone must not
let the payoff scroll past before it is read.

The exit ✕ still clears the buffer and returns to the lobby.

### 9.5 The Secret Terminal's back button must be re-pointed

**Found during spec review, and easy to miss.** `sm-terminal-back` — the Terminal's ← BACK —
currently calls `showScreen('screen-secret-controller')`, which today is sensible: the gateway is a
re-enterable input surface, so backing out of the Terminal leaves the player one sequence away from
returning.

Once the gateway is a **one-shot boot animation**, that destination is wrong in both possible
readings: either the player is dropped into a replaying hack sequence they must sit through, or onto
a stranded screen already reading `[ ACCESS GRANTED ]` with nothing to do but tap forward again.

**Decision: `sm-terminal-back` returns to the lobby.** Re-entry costs a fresh Konami on the
controller. That is more friction than today, and it is the right amount — entering the sequence is
now the enjoyable part rather than a toll gate, and a secret that stays one tap away stops feeling
like one. The arcade's sticky unlock (`smArcadeUnlocked`) is unaffected: once found, 🕹️ remains in
the lobby header for the rest of the session and reaches the cabinets without the Terminal.

The handler's existing cleanup (clearing typewriter timers and the selected expansion/game) is
retained; only its `showScreen` target and the two now-absent `sm-controller-status` writes change.

---

## 10. PWA

`PRECACHE_URLS` gains `js/lib/three.min.js`, `js/lib/controller-body.js` and `js/controller.js`.
`CACHE_NAME` bumps to `sylly-games-v228`.

No new binary assets, so the per-file art ceiling does not apply. The install grows by the vendored
Three file; the figure is measured and recorded in the SW note rather than estimated.

`cache.addAll()` rejects wholesale if any listed URL 404s, so the precache list is verified against
the filesystem before the bump ships. (This is not hypothetical: `assets/logo.png` was found deleted
from the working tree during this design session while still listed in `sw.js` and referenced by the
lobby — a state in which every service-worker install fails silently. Restored.)

---

## 11. Verification

### 11.1 New harness — `tools/verify-controller-state.js`

Pure, Node-runnable, no DOM. Asserts:

- **Persistence round-trip** — a saved state reads back identically.
- **Total read** — absent, empty, malformed JSON, wrong-typed fields, unknown version and
  out-of-palette hex values all resolve to defaults without throwing.
- **Palette derivation** — all twenty `GAME_BRAND_HEX` entries present, ordering stable and matching
  the `lobbyHexToHSL` hue walk.
- **Konami adapter** — the button-name/direction to code mapping produces exactly
  `U U D D L R L R B A S` for the correct press order, and unmapped presses contribute nothing.

The adapter mapping is the one genuinely correctness-shaped thing in this spec and is cheap to pin.

### 11.2 `visual-check`

The Workshop and the lobby at 390 px: band geometry, that the Stage never scrolls, that the panel
does, swatch touch targets ≥ 44 px, and the lobby controller's size against the logo. Layout is the
tier no `tools/verify-*.js` harness reaches.

### 11.3 Manual

Real phone: rotate, recolour, Save, reload, confirm the lobby shows the saved design. Offline
install from cold, confirming the controller renders with no network. Konami through to the terminal.
Reduced-motion enabled, confirming nothing travels and nothing is lost.

### 11.4 Regression

`node tools/verify-mp-configs.js` is unaffected but is re-run, as is `verify-identity-docs.js` — no
identity doc changes, so it must stay green.

**No new assertions are added for presentation**, per `CLAUDE.md`'s harness rule.

---

## 12. Documentation obligations

Per the Documentation Integrity Protocol, in order:

1. **`docs/code-map.md`** — `screen-workshop` and `screen-secret-gateway`, the new ids
   (`lobby-controller`, `lobby-header-icons`, the panel and swatch ids), the `ctl*` functions and
   state, and the removal of the deleted gateway button ids.
2. **Identity docs** — none. No game is touched.
3. **`CLAUDE.md`** — SW v228 entry in Current Focus (with the outgoing v227 entry moved **verbatim**
   to `docs/sw-changelog.md` first), the load-order line, and the `sylly_controller` localStorage
   exception in § Anti-Patterns.
4. **`logic-engine.md`** — the vendored-library exception, `js/controller.js` in the shared-module
   table, and the Workshop and loadout entries under § Timer Lifecycle.
   **`ui-style.md`** — the `h-screen` whitelist row for `screen-workshop` with its reason.
5. **`docs/implementation-notes/shared-implementation-notes.md`** — the root cause lives in
   engine/lib code, not in any one game, so this file and not a per-game one.
6. **`docs/decision-log.md`** — three entries: Three.js as the third vendored library,
   `sylly_controller` as the fourth permitted key, and the Konami gateway rework.

**Two amendments outside the protocol's list, both of which become false on merge:**

- `docs/design-brief-lobby.md` § 4.1 states that 7 rapid taps on `#lobby-icon` must be preserved and
  that the 🎮 must stay a real tappable element with that exact id. Both cease to be true. § 4.2's
  description of `smShowArcadeTile()` wrapping the icon also changes.
- `assets/controller/controller-handoff-v3.md` gains a header note recording that `body.js` now lives
  at `js/lib/controller-body.js`, that the standalone prototype is frozen, and that § 4.2's
  duplication item is closed.

---

## 13. Out of scope — what the sticker sub-project inherits

Deliberately deferred, with nothing in this spec foreclosing them:

- **Stickers**: inventory, manifest and caching contract, the sticker book overlay, and the full
  placement lifecycle. The last of these is substantial and still unbuilt — `controller-handoff-v3.md`
  § 4.1 lists select-placed-sticker, move, rotate, scale, delete, undo, overlap layering and a
  sticker-count cap as all open. `sticker-surface.js` enters the project then, not now.
- **Textures and patterns.** Note for whoever picks this up: `redraw()` already contains a working
  checker-pattern branch, so this is closer than it looks.
- **Achievements and unlock gating.** The current design is free customisation: every colour is
  available to everyone. Nothing here assumes otherwise, and the storage schema is versioned so a
  gated model can be layered on.
- **Player profiles.** Requires a database; out of reach on the current zero-cost constraints.

Also noted for that work: `assets/stickers/logo.png` is a 490 KB copy of the full lobby wordmark and
is unlikely to be a usable sticker source at sticker dimensions.

---

## 14. Risks

| Risk | Mitigation |
|------|-----------|
| The vendored Three parse cost hurts lobby paint on a low-end phone | Measured on a throttled profile during implementation; fallback is deferred injection on the Firebase pattern (§ 4.1) |
| The prototype's rotation and distortion fixes have **never been seen by a human** — the handoff says so explicitly | `controller-handoff-v3.md` § 6.2 isolates each to one function and gives the sign convention to check against. Reviewed on the first real render. |
| Touch handling was never tested on a real device or emulator (handoff § 4.2) | Real-phone testing is a named acceptance step, not an afterthought (§ 11.3) |
| `index.html` edits corrupting UTF-8 | The edits here are localised (one lobby block, one new section, one rebuilt section), but the project's standing rule against systematic `Edit`-tool passes over `index.html` applies — scripted edits for anything repetitive |
| Deleting the 7-tap trigger strands a player mid-migration | The keyboard path is preserved throughout and the new path ships in the same release; there is no window in which Secret Mode is unreachable |
