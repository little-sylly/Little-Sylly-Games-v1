# UI Style Rules — Little Sylly Games

## Global UI Protocol
Every screen must have:

1. **Speaker icon** (`.btn-open-sound`) — opens `#sound-overlay`. Two official positions:
   - **Full-screen menus:** `absolute top-4 right-4` within a `relative` screen container
   - **Gameplay flow screens:** header row — `flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0`, speaker + ✕ right-aligned in the same row
2. **Help icon `[?]`** — every game's main gameplay screen header must include a `[?]` button alongside the speaker icon and ✕. It opens the game's How to Play overlay (`[abbr]-how-to-overlay`). Position: left of speaker, same `flex items-center gap-2` group. Style: `text-stone-400 font-bold text-sm`. Always visible — no `hidden` class. Never opens a role-help or context-specific overlay — that role belongs to inline `[?]` buttons (see Contextual Tip Icons below).
3. **Exit button** (✕) — logical destination (formalised):
   - Mid-game ✕ → quit confirm overlay → **game menu screen** (NOT lobby)
   - Post-game ✕ → `resetToLobby()` directly (game is over, no state to preserve)
   - "← Back to the Box" on game menu → `resetToLobby()` — the **only** path to lobby from within a game
4. **Active play exception:** `#btn-mute` stays as instant tap-to-mute (no overlay — timer running). Pixel-exact rule applies to `.btn-open-sound` only.
5. **Interstitial exception:** A screen that **auto-advances** AND has **no interactive element** is exempt from 1–3 — chrome there is tappable for less time than it takes to aim at it. Both conditions required; "it's brief" alone is not a licence. If it ever becomes dismissible or user-paced, the full chrome returns. Reference: `screen-pko-unchallenged`/`screen-pko-event` and `screen-cjar-raid-intro`/`screen-cjar-busted` — all **5 s** (`PKO_INTERSTITIAL_MS`/`CJAR_INTERSTITIAL_MS`). **Duration is not the test** — the two conditions are, and ~5 s is the practical ceiling: past that a player with no ✕ and no 🔊 is genuinely stuck.

---

## Round/Night Intro Screen (default for the start of every match round, added 12 Aug 2026 — SHP; CJAR is the precedent)

**Every game where the same phase (a Night, a Raid, a Round) repeats several times per match should
show a short, auto-advancing intro screen at the start of each repetition — not jump the player
straight from "deal" into an already-live table.** This is the interstitial exception (rule 5 above)
used as a *beat*, not just a result flash: `screen-cjar-raid-intro` was the first instance; SHP's
`screen-shp-night-intro` is the second and what generalises it into a named pattern.

**Job of the screen — flavour AND orientation, not just flavour.** The text should do two things in
one or two short lines: set the scene in the game's voice, and restate — lightly, not a rules dump —
what the player is about to do or watch for. SHP's line does both in one sentence: *"Don't go over 99
or you might really just fall asleep"* is flavour and the core rule in the same breath. A pure mood
line with no practical content is a missed second use of the same five seconds.

**Shape:**
```html
<section id="screen-[abbr]-[phase]-intro" style="display:none"
  class="flex items-center justify-center w-full min-h-screen px-5 py-8 overflow-y-auto">
  <div class="flex flex-col w-full max-w-sm gap-4 text-center">
    <div class="text-6xl" role="img" aria-label="...">[emoji]</div>
    <h2 id="[abbr]-intro-heading" class="text-3xl font-bold text-stone-800"></h2>
    <p id="[abbr]-intro-sub" class="text-stone-500 text-base"></p>
    <!-- optional third element: a Sylly-Mode-only note, a per-player private hint (CJAR's
         Favourite/Watcher box), anything conditional — style="display:none" until populated -->
  </div>
</section>
```
No `[?]`/🔊/✕ — the rule-5 interstitial exemption applies (nothing is tappable for the ~5 s it's up).
Emoji should differ from the game's main menu emoji where reasonable, so the intro reads as its own
beat rather than a repeat of the menu (SHP uses 🌙 for "Night begins", distinct from the menu's 🐑).

**Rotate the flavour line if the phase repeats many times a match.** A Raid/Night can redeal a
handful of times in one sitting; the same sentence every time reads as filler by the third showing.
Keep a small array (`SHP_NIGHT_FLAVOUR`, 4–6 lines) and pick one per repetition — **host-picked and
synced** in MDLM (ride the index in whatever SYNC packet already carries the deal), never picked
independently per device, or players sitting together see different text for the same moment.

**Wire it in at the SAME point on host and client.** The function that shows this screen must be
called from **both** the host's deal path and the client's `SYNC` handler for that deal — not just
one. SHP's version (`shpShowNightIntro()`) replaced a direct `shpShowTable()` call in both
`shpDealNight()` (host) and the `SHP_DEAL` applier (client); missing either half means one class of
device skips straight past the intro. Auto-advance via `setTimeout` to the real table-show function,
clearing any prior handle first (a rapid-fire redeal loop must never stack two pending timers) and
clearing it in the game's teardown (`resetToLobby()` path) per § Timer Lifecycle (`logic-engine.md`).

**Deferred — sweep the rest of the suite.** Not retrofitted onto any existing game outside CJAR/SHP
this round. `docs/deferred-work.md` carries a tracked item to audit every game with a repeating
Round/Raid/Night/Encounter structure and add this screen where the "deal happens, but nothing marks
it" gap exists — see PKO and other multi-round games first, since they're the closest structural
match to what CJAR and SHP already have.

---

## Sound Overlay — Positioning & Theming

### Sound button positioning (game menus)

Game menu sections that use `absolute top-4 right-4` for the sound button MUST NOT have `min-h-screen` on the `<section>` element. If `min-h-screen` is present, the section fills the full viewport and the button anchors to the very top of it — visually detached from the centred emoji/title.

**Correct pattern** (all game menus):
```html
<section id="screen-[abbr]-menu" style="display:none"
  class="relative flex flex-col items-center justify-center px-6 py-12 w-full max-w-sm mx-auto text-center gap-6">
  <button class="btn-open-sound absolute top-4 right-4 ...">🔊</button>
  <!-- content naturally sized — section height = content height -->
</section>
```

The section is content-height (no `min-h-screen`, no `h-screen`) so `absolute top-4 right-4` lands just above the emoji rather than at the viewport top.

### Slider theming

The sound overlay volume slider (`#global-sound-volume`) uses a CSS class set by `updateSliderTheme(gameId)` in `engine.js`. As of Phase 31 Round 3, this is called inside `openSoundOverlay()` automatically — no plugin needs to call it.

**How it works:**
- `openSoundOverlay()` calls `updateSliderTheme(activeGameId)` before showing the overlay — the slider always reflects the current game at the moment it's opened
- `activeGameId` is set by each plugin's lobby button listener on game entry
- `resetToLobby()` calls `updateSliderTheme(null)` → fallback `stone-range` (neutral grey)
- Initial HTML class on the slider is `stone-range`

**Adding a new game:**
1. Add a CSS range class to `css/styles.css` — three rules: base, `::-webkit-slider-thumb`, `::-moz-range-thumb` (see `.gth-range` / `.bld-range` for the pattern)
2. Add `'[abbr]': '[abbr]-range'` to the `map` in `updateSliderTheme()` in `engine.js`
3. Ensure `activeGameId = '[abbr]'` is set in the lobby button listener — nothing else needed

**Range class reference:**

See **§ Per-Game Reference → Table A** at the end of this file. (Gradient values live in `css/styles.css` on each `.[abbr]-range` rule — read them there.)

### Mute toggle theming

The sound overlay mute toggle (`#global-mute-toggle`) shows the current game's brand colour when ON, via `getMuteToggleOnClass(gameId)` in `engine.js` (added June 2026).

**How it works:**
- `getMuteToggleOnClass(activeGameId)` maps the active game to its `game-toggle-on-[colour]` class — fallback `game-toggle-on-stone` for the lobby / unknown games
- Called by `toggleMute()`, `openSoundOverlay()`, the audio-init block at boot, and `resetToLobby()` (which passes `null` → neutral stone if muted)
- OFF state is always the neutral class — see toggle class rules below

**Toggle class rules:**
- **ON (active):** `game-toggle-on-[colour]` — one class per game, defined in `css/styles.css`. This applies to ALL ON/OFF toggles in the app (settings toggles, Sylly Mode toggles, the global mute toggle).
- **OFF (inactive):** `game-toggle-off` is the canonical class; `sylly-toggle-off` is a legacy alias sharing the same CSS rule — both render identically and both remain valid.
- **`sylly-toggle-on` is DEPRECATED** — zero usages remain in `index.html` or any JS file (verified June 2026 audit). The class definition still exists in `css/styles.css` as dead code. Never use it in new code.

**Per-game toggle class map** (matches `getMuteToggleOnClass()` in `engine.js`):

See **§ Per-Game Reference → Table A** at the end of this file.

**Adding a new game:**
1. Add a `game-toggle-on-[colour]` class to `css/styles.css` (copy an existing rule, swap the background colour)
2. Add `'[abbr]': 'game-toggle-on-[colour]'` to the `map` in `getMuteToggleOnClass()` in `engine.js`

---

## Contextual Tip Icons `[?]`

**Use for:** Inline help anchored to a specific mechanic — Planner role, scoring currency, group selection, voting, and role-specific decisions. Not for general rules (that's the How to Play overlay via the header `[?]`).

**Pattern:** Small `[?]` button placed inline next to the label it explains. Tapping opens the shared `[abbr]-tip-overlay` (Decision Modal, z-[90]) with dynamic content set by `[abbr]ShowTip(emoji, heading, lines[])`.

```html
<!-- Inline placement example — next to a mechanic label -->
<div class="flex items-center gap-1.5">
  <p class="text-stone-400 text-xs font-semibold">Mechanic Name</p>
  <button id="btn-[abbr]-tip-[context]" class="text-stone-300 font-bold text-xs leading-none active:scale-90 transition-transform duration-100">[?]</button>
</div>
```

**Tip overlay** (one per game, reused for all contextual tips):
```html
<div id="[abbr]-tip-overlay" style="display:none"
  class="fixed inset-0 z-[90] overlay-modal-backdrop flex items-center justify-center px-6">
  <div class="overlay-modal-inner bg-stone-50 w-full max-w-sm rounded-3xl px-6 pt-6 pb-8 flex flex-col gap-4 text-center border border-[brand]-300">
    <div class="flex flex-col gap-2">
      <p id="[abbr]-tip-emoji" class="text-3xl"></p>
      <h3 id="[abbr]-tip-heading" class="text-lg font-bold text-stone-800"></h3>
      <div id="[abbr]-tip-body" class="text-stone-500 text-sm text-left flex flex-col gap-1.5"></div>
    </div>
    <button id="btn-[abbr]-tip-close" class="min-h-11 w-full rounded-2xl bg-stone-200 hover:bg-stone-300 active:scale-95 text-stone-700 font-semibold text-sm transition-all duration-100">Got it</button>
  </div>
</div>
```

**Tip content rules:**
- **Concise and helpful** — one clear sentence per bullet point. No multi-sentence tips.
- **Role-specific when relevant** — inject different content for different roles at call time (e.g. Friend vs Flake tips for group selection).
- **3 bullets maximum** — resist the urge to explain everything.
- Hidden by default when tip is only relevant to certain roles (e.g. Flake-only tip hidden until `bldRenderMission()` confirms the player is a Flake).
- Add `[abbr]-tip-overlay` to `resetToLobby()` teardown in `engine.js`.

---

## Two-Pattern Overlay Library
Classes live in `css/styles.css`. Do NOT invent a third pattern.

### Pattern 1 — Data Overlay
Use for: settings, how-to, word lists, history — scrollable content or keyboard input.
```html
<!-- backdrop -->
<div class="... overlay-data-backdrop">
  <!-- align-items:flex-end; justify-content:center -->
  <div class="overlay-data-inner ... rounded-t-3xl settings-slide-up">
    <!-- height:80vh; overflow-y:auto -->
  </div>
</div>
```

### Pattern 2 — Decision Modal
Use for: confirmations, short prompts, ≤3 interactive elements. No slide-up animation.
```html
<!-- backdrop -->
<div class="... overlay-modal-backdrop">
  <!-- align-items:center; justify-content:center; px-6 -->
  <div class="overlay-modal-inner ...">
    <!-- border-radius:1.5rem; auto height -->
  </div>
</div>
```

**Border rule:** All decision modals (`overlay-modal-inner`) must include a subtle brand-accented border: `border border-[brand]-300`. This is a deliberate visual anchor that separates the modal from the backdrop without being a loud frame. Use the game's own brand colour — see Per-game brand reference table. Data slide-up overlays (Pattern 1, `overlay-data-inner`) do NOT get this treatment.

**Exact inner div class string — use verbatim (with correct `[brand]` substituted):**
```html
<div class="overlay-modal-inner bg-stone-50 w-full max-w-sm rounded-3xl px-6 pt-6 pb-8 flex flex-col gap-4 text-center border border-[brand]-300">
```
Not `bg-white`, not `shadow-xl`, not `p-8`, not `rounded-2xl`, not `border-2`.

### Pattern 2a — Art Viewer (engine-owned, global)

**Not a third pattern.** It is Pattern 2's geometry (`overlay-modal-backdrop`, centred, one
interactive element) with an image where the card would be. Documented separately only because it
is the one overlay that is **deliberately unbranded** — it belongs to `engine.js` and is opened
from six games' galleries, so any one game's colour would be wrong five times out of six.

**Never build a per-game copy of this.** `#art-viewer-overlay` is the only one.

```js
openArtViewer(src, caption)   // no-ops when src is falsy — see below
closeArtViewer()
artMakeZoomable(el, src, caption)   // returns el, for use inline
```

- **`src` is a resolved URL from `assetFace`/`assetBack`/`assetExtra`** (`js/lib/art.js`). A game
  still on its emoji/CSS fallback resolves to `null`, and both functions no-op — so a tile with no
  artwork behind it gets **neither the zoom cursor nor a handler**. The affordance and the artwork
  appear together or not at all. That is also what keeps the offline install check honest: if the
  art didn't precache, the gallery visibly stops offering to enlarge it.
- **Resolve the URL at the call site, not inside the render seam.** The seam returns an element;
  the gallery needs the URL separately to decide whether the tile is zoomable at all.
- Closes on the ✕ and on the **backdrop only** (`e.target === backdrop`) — a tap landing on the
  image or caption must not dismiss, or a pinch/pan loses the picture mid-gesture.
- Backdrop is `bg-black/80`, darker than the standard `bg-black/40`: the point is to take the lit
  surface away from the UI and give it to the artwork.
- Teardown is already in `resetToLobby()` via `closeArtViewer()` — a new game needs nothing.

### Backdrop tap-to-dismiss (universal, engine-owned, added 14 Aug 2026)

Every overlay closes when the backdrop dead space is tapped — one delegated listener in
`engine.js` finds the overlay's own neutral button (an `id` matching
`cancel|close|done|ok|dismiss` as a whole segment, e.g. `btn-[abbr]-howto-close`,
`btn-[abbr]-quit-cancel`) and `.click()`s it, so a new overlay gets this for free as long as
its dismiss button's `id` follows that convention — no new wiring needed. **Exception:** an
overlay whose only buttons are a real decision (no neutral dismiss exists — e.g. accept/
reject, a pass-the-phone reveal confirm) is correctly left non-dismissible by omission, per
the Pass-the-Phone Safety Gate below — don't add a neutral-looking id to one of those buttons
just to make it participate.

### Z-Index Stack
| z-index | Used for |
|---------|----------|
| z-[80] | Quit confirm, settings slide-up overlays |
| z-[90] | How-to, history, review overlays |
| z-[95] | gm-boost, gm-near-sync, gm-override, gm-new-frequency; ss-intel overlays |
| z-[100] | gm-neural-library, deck panels |
| z-[105] | `#art-viewer-overlay` — global; above the how-to sheets it opens from |
| z-[110] | `#sound-overlay` — global, always on top |

---

## The Stack — Canonical Screen Layout (read this before building ANY screen)

Every screen in every game is built from **the Stack**: three zones stacked in one vertical column, held together and floated in the middle of the viewport. This is the *single* layout standard — there is no per-screen "which pattern?" decision to make. Pick the Stack. Always.

### Terminology (use these exact words in code comments, specs, and audits)

| Term | What it is |
|------|-----------|
| **The Stack** | The whole screen — the three zones as one unit, centred in the viewport |
| **Header** (zone 1) | Title / round-info (e.g. "Round 1 of 2", the screen name) on the left or centre; `[?]` + 🔊 + ✕ on the right |
| **Stage** (zone 2) | The central play/info area — cards, board, prompt, inputs, the thing the player looks at |
| **Controls** (zone 3) | The proceed/action buttons that move the game forward |

### The one pattern

```html
<section id="screen-[abbr]-foo" style="display:none"
  class="flex items-center justify-center w-full min-h-screen px-5 py-8 overflow-y-auto">

  <!-- THE STACK — Header, Stage, Controls are ALL siblings in this one column -->
  <div class="flex flex-col w-full max-w-sm gap-4">

    <!-- HEADER -->
    <div class="flex items-center justify-between">
      <div><!-- title / round label --></div>
      <div class="flex items-center gap-2">
        <button id="btn-[abbr]-how-to" class="...">[?]</button>
        <button class="btn-open-sound ...">🔊</button>
        <button class="btn-[abbr]-quit-open ...">✕</button>
      </div>
    </div>

    <!-- STAGE -->
    <div><!-- cards, board, prompt, inputs --></div>

    <!-- CONTROLS -->
    <button class="min-h-14 w-full ...">Primary Action</button>
  </div>
</section>
```

**Why this gives "tight + centred" automatically:**
- `flex items-center justify-center` on the `<section>` (default flex-direction `row`, single child) centres the whole Stack **both axes** when it's shorter than the screen.
- `min-h-screen overflow-y-auto` fills the viewport and, when the Stack is taller than the screen, scrolls the **whole Stack as a unit** — Header, Stage and Controls stay locked together; nothing pins to a screen edge.
- `gap-4` on the inner column is the *only* thing setting spacing between zones — so the Stack is tight by construction.
- The Controls sit directly under the Stage. A button does **not** need to be glued to the bottom of the glass — it needs to be *reachable*, and in a scrolling column it always is.

### The four rules that keep the Stack from breaking

These are the only ways the Stack has ever broken in this codebase. The first three are the same mistake — **splitting the column** — wearing different clothes; the fourth is a sibling failure mode for a screen with more than one render function:

1. **One column, no exceptions.** Header + Stage + Controls are *siblings inside the single `max-w-sm` inner div*. Never render the content into one wrapper and the buttons into a separate footer wrapper — the moment they're in different parents, the footer detaches to the bottom and the header detaches to the top, and the Stack stops reading as one unit. (FRT BUG-02.)

2. **Never use `my-auto` to centre.** `my-auto` distributes *free space*, and inside an `overflow-y-auto` column there is none (the column's height equals its content). It is a silent no-op. Centring is the `<section>`'s job via `items-center justify-center` — never the child's. (FRT BUG-02.)

3. **No `h-screen` / `flex-1` / `flex-shrink-0` split.** That trio is the old "sticky-footer" pattern — it deliberately inflates the Stage (`flex-1`) to eat all leftover space and shoves Header to the top edge and Controls to the bottom edge. That is the *opposite* of the Stack. Do not use it for new screens. (See the legacy note below.)

4. **A screen repainted by more than one render function must have each of them own every element it cares about.** Repainting only `#body`/`#footer` of a shared screen is not "leaving the rest alone" — it's "showing whatever the previous renderer last wrote" to every element you didn't touch, header included. SHP's table screen has two renderers, `shpRenderTable` and `shpRenderNightEnd`, and only the first set `#shp-table-status`; the Night-End summary therefore inherited whatever the table wrote there last, which on a screen reached from a Plunge would have shown "THE PLUNGE 🔻" in red above a Night-won summary. When adding a second (or third) render function for one screen, list every element the *other* renderer(s) touch and set them explicitly, even to a value that looks like a no-op today. *[Elevated from shp-impl-notes Template Gaps, chunk 9, Aug 2026.]*

### Transient animations must float, never sit in the flow

Any repeating, transient animation inside a Stack — a card lifting out of a hand, a token flying to a pile, a creature crossing the screen, a score popping — must live in an **absolutely-positioned layer over a `position: relative` parent**, never as an inline child of the column.

An in-flow animated element changes the column's height while it plays, and because the Stack is centred by the `<section>`, that height change re-centres the *entire* Stack — Header and Controls visibly bounce on every play. SHP's first sheep parade was an inline child of the herd column and did exactly this; the fix was a `position:absolute` `.shp-sheep-layer` over a `relative` counter.

```html
<div class="relative">           <!-- anchor -->
  <div><!-- the real, layout-owning content --></div>
  <div class="absolute inset-0 pointer-events-none">
    <!-- animation layer: floats, contributes zero height -->
  </div>
</div>
```

Add `pointer-events-none` to the layer unless the animation is interactive. *[Elevated from shp-impl-notes Template Gaps, June 2026.]*

### Motion Standard — timing, easing, and what may be animated

Applies to every transition and `@keyframes` in `css/styles.css` and every inline Tailwind transition. The reference skill is `.claude/skills/emil-design-eng/` (on-demand — invoke it for a deeper animation review; it is not auto-loaded).

**Duration — match the distance travelled.** A small thing moving a short way should be quick; only a full-width panel earns the long end.

| Element | Duration |
|---------|----------|
| Button press / tap feedback | 100–160 ms |
| Contextual tip, small popover | 125–200 ms |
| Dropdown, pill group, inline reveal | 150–250 ms |
| Decision modal, data slide-up overlay | 200–500 ms |
| Stagger between list items | 30–80 ms |

**Hard ceiling: 300 ms** for anything that is not a full overlay. Past that a phone UI feels laggy rather than smooth. The Stack's overlays (`settings-slide-up`) are the documented exception at up to 500 ms.

**A second, narrow exception: a blocking choreography beat.** A sequenced animation that the player cannot act through — where the duration itself *is* the pacing budget, not decoration on top of an already-actionable UI — may exceed 300 ms, provided it still animates only `transform`/`opacity` per the rule below. This is different from ordinary chrome feedback (a button press, a pill toggle): those are what the 300 ms ceiling protects, because input is available the whole time. Reference: CJAR's reveal choreography (`CJAR_FLIP_ANIM_MS`, `js/games/cjar.js`) — flip/hold/payout is a single blocking 3200 ms beat because no decision can be made until the card's outcome is seen.

**Easing — pick by what the element is doing, not by taste:**
- Entering or exiting the screen → `ease-out`
- Moving around on-screen → `ease-in-out`
- Hover / colour change → `ease`
- Continuous motion (a spinner, a timer sweep) → `linear`
- **Never `ease-in` for UI.** It starts slow and reads as unresponsive — the tap feels dropped.

**Only animate `transform` and `opacity`.** Both are GPU-composited; anything else (width, height, top/left, margin, padding) triggers layout on every frame and janks on a mid-range phone — which is most of this suite's audience.
- Never scale from `scale(0)` — it pops. Use `scale(0.95)` plus an opacity fade.
- Use `translateY(100%)` to move an element by its own height rather than a hardcoded pixel value.
- Tap feedback is `transform: scale(0.97)` on `:active` — this is what `active:scale-95` already gives us across the suite.

**`transition-all` is known debt — do not add more.** `index.html` carries ~487 uses of it. `transition-all` animates *every* animatable property including layout ones, so it is the transform-only rule's blind spot. Existing uses are left alone (a sweep of `index.html` is off-limits — see the encoding warning). For new markup, name the property: `transition-transform`, `transition-opacity`, `transition-colors`.

**Reduced motion is mandatory and already global.** `css/styles.css` ends with a `@media (prefers-reduced-motion: reduce)` block that collapses every duration to `0.01ms`. Two rules follow from *how* it is written:
- It sets `animation-duration`/`transition-duration` to near-zero — **never `animation: none`**. `js/games/li5.js` has four `animationend` listeners (`card-enter`, `streak-fire-shake`, and two `hype-pop`) that do the *cleanup*; killing the animation outright means the event never fires and the class and its text stay stranded on screen. Any new `animationend`-driven cleanup inherits this protection for free — but only while the block stays duration-based.
- Because it is global, a new animation needs no per-feature reduced-motion handling. Do not add a second `prefers-reduced-motion` block.

**Test it:** DevTools → Rendering → Emulate `prefers-reduced-motion: reduce`, then exercise the animation. Nothing should travel, and nothing should be left behind.

### Legacy sticky-footer pattern — do NOT use for new screens

A handful of older screens across the suite use `h-screen overflow-hidden` with a `flex-1 overflow-y-auto min-h-0` Stage between `flex-shrink-0` Header/Controls. This was previously documented as a second valid pattern. **It is now deprecated for new work** — it is the single largest source of "not together, not centred" screens, because a screen can be technically correct (button visible, content reachable) while looking sparse and edge-pinned. New games use the Stack for *every* screen, including the main gameplay screen. Existing sticky-footer screens are migrated to the Stack opportunistically; log each migration in the game's implementation notes.

If you ever think a screen *needs* the legacy pattern, you almost certainly don't: the only real trigger is a Stage that must scroll **independently** while the Controls stay frozen, and the project decision (June 2026) is to prefer whole-Stack scrolling over that even for long card hands. When in genuine doubt, use the Stack.

### Legacy `h-screen` whitelist (baseline sweep, 26 June 2026)

A suite-wide Stack sweep migrated every content/results screen off `h-screen`. The screens below are the **only** remaining legacy sticky-footer screens — each is a deliberate, justified exception. If one of these looks sparse/edge-pinned, that's expected; if any **other** screen does, it's a new bug, not this one.

| Screen(s) | Why it keeps the sticky footer |
|-----------|-------------------------------|
| `screen-gth-canvas` | Freehand drawing surface — the canvas must **not** scroll while drawing (a page-scroll would hijack the stroke). Fixed Stage is mandatory. |
| `screen-gth-case` | Rendered drawing + answer cards + live countdown — fixed Stage with the diagnosis action always visible. |
| `screen-dsd-captain`, `screen-dsd-crew`, `screen-dsd-execution`, `screen-dsd-sabotage`, `screen-dsd-spectator` | 5×5 grid + legend with an always-visible Sonar/sequence/disarm CTA while tapping tiles. |
| `screen-nt-allocation` | DNP captain huddle — cluster bridge + rebalance controls + Lock CTA + huddle timer; controls must stay put while scanning legs. |
| `screen-mp-mode`, `screen-mp-lobby-host`, `screen-mp-lobby-join`, `screen-mp-roster` | Shared multiplayer infrastructure (all 4 MDLM games) — roster lists with a frozen primary CTA. High blast radius; migrate only if visibly broken. |

Every other content/results screen in the suite has already been migrated to the Stack — a few carry a residual nested wrapper or uneven per-zone padding from the scoped class-transform used to do it; polish opportunistically, don't re-sweep.

---

## How-to Overlay Standard

### Canonical overlay structure

```html
<div id="[abbr]-how-to-overlay" style="display:none"
  class="fixed inset-0 bg-black/40 z-[90] flex items-end justify-center">
  <div class="overlay-data-inner settings-slide-up bg-stone-50 w-full max-w-sm rounded-t-3xl flex flex-col">

    <!-- Left-aligned title block — sticky, never scrolls -->
    <div class="px-5 pt-5 pb-4 border-b border-stone-200 flex-shrink-0">
      <h2 class="text-xl font-bold text-stone-800">How to Play [emoji]</h2>
      <p class="text-xs text-stone-400 mt-1">[Short description — NOT the tagline]</p>
    </div>

    <!-- Scrollable body -->
    <div class="overflow-y-auto flex flex-col gap-4 px-5 py-5">

      <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
        <p class="text-xs font-semibold uppercase tracking-widest text-[brand]">Step N</p>
        <p class="font-bold text-stone-800">Step heading — no emoji here</p>
        <p class="text-stone-500 text-sm">Body text. Use <span class="font-semibold text-stone-700">Key Terms</span> bold. Emojis 🎯 in body OK.</p>
      </div>

      <!-- Second-to-last card is always "Winning and Scoring" -->
      <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
        <p class="text-xs font-semibold uppercase tracking-widest text-[brand]">Winning and Scoring</p>
        <p class="font-bold text-stone-800">Heading</p>
        <ul class="list-disc pl-5 flex flex-col gap-1 text-stone-500 text-sm">
          <li><span class="font-semibold text-stone-700">Outcome</span> — result.</li>
        </ul>
      </div>

      <!-- Last card — every game has a Sylly Mode; see § Per-Game Reference → Table B for the name -->
      <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
        <p class="text-xs font-semibold uppercase tracking-widest text-[brand]">✨ Sylly Mode</p>
        <p class="font-bold text-stone-800">[Thematic Name]</p>
        <p class="text-stone-500 text-sm">Description. Use <span class="font-semibold text-stone-700">Key Terms</span> bold.</p>
      </div>

      <button id="btn-[abbr]-howto-close"
        class="min-h-14 w-full rounded-2xl bg-[brand] hover:bg-[brand-dark] active:scale-95 text-white text-xl font-semibold transition-all duration-150">
        Got it
      </button>
    </div>
  </div>
</div>
```

### Rules

- **Title:** `"How to Play [emoji]"` in h2 — emoji inline, never in a separate div. Never use the game's internal name.
- **Subtitle:** short plain-English description of what the game *is* — not the marketing tagline.
- **Step label:** `text-[brand]`, no emoji, just `"Step N"` or `"Winning and Scoring"`.
- **Step heading:** `font-bold text-stone-800`, **no emoji**.
- **Body text:** `text-stone-500 text-sm`; keywords as `font-semibold text-stone-700`; emojis in body are OK.
- **Card ordering:** Steps → Winning and Scoring → ✨ Sylly Mode → close button. **Sanctioned
  exception:** a setting that is Sylly Mode's mutually-exclusive or superseded partner (§ Settings
  Layout Standard) may sit immediately **above** the Sylly Mode card, mirroring the settings
  overlay's order — the two read as a pair because the player is choosing between them. Nothing
  else may take that slot. The underlying settings-overlay pattern's first instance is FRT's
  Pear-Off card, but FRT never mirrored it into its How to Play overlay — NT's Debug Mode card is
  the first instance of *this* how-to mirror specifically.
- **Winning and Scoring:** always this exact label — never just "Winning" or "Scoring".
- **Sylly Mode card:** present for every game. Label is `✨ Sylly Mode` (literal — the `✨` is part of the label text, styled with `text-[brand]`). Heading is the thematic name (e.g. "Wild Words", "Silent Running").
- **Close button:** game brand primary colour (`bg-[brand] hover:bg-[brand-dark]`).
- **Inner div:** must include `flex flex-col` — title block is `flex-shrink-0`, body is `overflow-y-auto`.

### Optional tab bar — N tabs (added Aug 2026, CJAR; generalised to 3 Aug 2026, PKO)

A game with **reference content that is itself part of learning the game** — every card in the
deck, a chain diagram, a role roster — may add a tab bar rather than pushing that content into a
second overlay. There is no cap at two: PKO runs three (Rules | Diagram | Animals). Sits directly
under the sticky title block, sticky with it, never scrolling:

```html
<div class="px-5 pt-3 pb-3 border-b border-stone-200 flex-shrink-0 flex gap-2">
  <button class="pill pill-active-[colour]" data-[abbr]-howto-tab="rules">The Rules</button>
  <button class="pill" data-[abbr]-howto-tab="cards">The Cards</button>
  <!-- a third (or Nth) tab is the same button + body pair, no structural change -->
</div>
```

**Rollout (10 Aug 2026):** six games now carry a tab bar — **CJAR** (`The Rules | The Cards`),
**PKO** (`The Rules | Diagram | Animals`), **FRT** (`The Rules | The Fruit`), **SHP**
(`The Rules | The Cards`), **FLW** (`The Rules | The Gems`) and **DYB** (`The Rules | The Dice`).
That is every game with a card/dice render seam except **PASS**, whose 54 faces make a tile grid a
poster rather than a reference — deliberately still open, see `docs/deferred-work.md`.

**A gallery tab must render through the game's own render seam** (`[abbr]RenderCard`, `dybDieHTML`),
never hand-built markup. Two things follow from that and both are load-bearing: the gallery can
never drift from the live deck, and it is **skinnable**, which is what makes it double as the
offline install check (`docs/art-authoring-guide.md` § 7). FLW's Gem Manifest was the counter-example
— it drew its own colour-swatch circles, so no skin could reach it and the Vault's real artwork was
invisible outside a live Showing; folding it into How to Play converted it to `flwRenderCard`.

**Every gallery tile is tappable-to-enlarge** via `artMakeZoomable` — see § Pattern 2a above.

**Rules:**
- The **first tab is always the Step cards** — the canonical How-to structure above is unchanged
  and still mandatory. A tab bar adds sibling bodies; it never reorders or removes the Steps.
- Each tab body is its **own** `overflow-y-auto` region with its **own** close button, so each
  scrolls independently and "Got it" is always reachable from the bottom of what you are reading.
- Bodies are **siblings toggled by display**, not one body repainted — flicking across and back
  must not lose another tab's scroll position.
- Tab buttons use the standard `.pill` / `pill-active-[colour]` classes and the same toggle rule
  (never remove `.pill`).
- **Reference content that is part of learning the game belongs in the tab bar — including a
  mid-play reference a player returns to later.** A tab is not disqualified just because it is
  *also* useful mid-round (PKO's Diagram/Animals tabs are opened both from How to Play and from
  the table's `[?] The Chain` and a tap-held card — same overlay, opened pre-selected on the
  relevant tab via `pkoOpenHowTo(tab, highlightId)`). What stays excluded is content that is
  **not** teaching material at all — Settings, a match/score log, or any *live* running state a
  static tab can't represent. This is not a licence to fold those into How to Play.

**Why:** cjar's card gallery began as its own overlay opened by a button at the bottom of How to
Play — one overlay further away than the thing it explains, plus a z-index stack and an extra
entry in the `resetToLobby()` teardown list. Knowing what cards exist *is* learning the game. PKO
originally kept its Diagram/Animals pair (`pko-chain-overlay`) separate on the reasoning that a
mid-play reference isn't a teaching aid — that distinction didn't survive contact with a second
example: the two are the same thing seen at different times, and duplicating the content across
two overlays (rather than one overlay with more entry points) was the actual cost. Folded into
`pko-how-to-overlay` as tabs 2–3 Aug 2026; see `docs/decision-log.md`.

### Tap-Hold Reference (default for a card's long-press, added 12 Aug 2026 — SHP, generalising PKO)

**When a game has a How-to gallery tab (above), tap-and-hold on any real card — in a hand, on the
table, in a locked-slot placeholder — jumps to that card's row in the gallery: the tab opens (or
switches) to The Cards, scrolls it into view, and rings it briefly.** This is the *default*
long-press behaviour for any card with real artwork. Build a standalone inspect popup only if the
game has a specific reason a shared gallery entry can't serve (none has needed one yet).

**Why the default, not a per-game choice:** a standalone popup (SHP's original `shp-card-info-overlay`
Decision Modal) is a second place a card's rules text can drift from the gallery's, a second
overlay in the z-index stack, and a second `resetToLobby()` teardown entry — for information the
gallery already has to hold anyway. Retired in favour of this pattern 12 Aug 2026; see
`docs/implementation-notes/shp-implementation-notes.md`.

**Shape — the touch/mouse mechanics and the scroll-and-ring are shared `engine.js` globals, not a
per-game copy.** `bindCardHold(el, onHold, ms=500)` and `refHighlightRow(box, attr, id, pingClass,
ms=1600)` were extracted from the original per-game `[abbr]BindCardHold` implementations during
FLW's gem-seam round (task 4, Aug 2026) — see `logic-engine.md` § Shared Library Modules. A game's
own bind function is now a one-line wrapper:
```js
function [abbr]BindCardHold(el, cardId) { bindCardHold(el, () => [abbr]OpenHowTo('[gallery-tab]', cardId)); }
```
`shpBindCardHold`, `pkoBindChainHold` and `flwBindCardHold` are the three reference call sites.
`[gallery-tab]` is whatever this game already calls its card-gallery tab (`'cards'` for SHP/FLW,
`'animals'` for PKO — not a new naming convention). `[abbr]OpenHowTo(tab, highlightId)` forces that
tab whenever `highlightId` is set (skip the "open to Rules" default), and the gallery's render
function tags each row/tile with `data-[abbr]-card-id` (FLW: `data-flw-gem-id`) and calls
`refHighlightRow(box, 'data-[abbr]-card-id', highlightId, '[abbr]-ref-row-ping')` when a
`highlightId` is passed. The ring class is a `box-shadow` transition, never `animation`
(reduced-motion already zeroes transition durations globally — see § Motion Standard — so this
needs no separate guard).

**A placeholder with no card id of its own points at the real card that explains it.** SHP's
Big Bad Wolf hand-slot (a locked-slot indicator, not the Wolf card itself — see § Pattern 2a's
sibling rule for `assetFace`) has no `cardId`; its hold targets card **12** (The Big Bad Wolf),
whose gallery row is what actually explains the locked slot. Generalise this whenever a game has
a non-card placeholder standing in for a mechanic that a real card's row already documents —
point the hold at that card's id rather than inventing a third explanation surface.

**Exception — don't apply this where tap-hold already does something else.** PASS's 54-face grid
(the documented exception to the gallery tab itself) and any game where a long-press is bound to a
drag-start, a multi-select, or another mechanic keeps its own behaviour; this default only fills
the gap when tap-hold is otherwise idle.

### Per-game reference

See **§ Per-Game Reference** at the end of this file — **Table B** for emoji + Sylly Mode name, **Table C** for the step-label and close-button classes.

---

## Settings Layout Standard
Every game's settings overlay must follow this order:
1. **Thematic title block** — first child of `overlay-data-inner`:
   ```html
   <div class="px-5 pt-5 pb-4 border-b border-stone-200 flex-shrink-0">
     <h2 class="text-xl font-bold text-stone-800">Game Name 🎮</h2>
     <p class="text-xs text-stone-400 mt-1">One-line game-voiced subtitle.</p>
   </div>
   ```
2. Game-specific options (timer, rounds, categories, word pools, etc.)
3. **✨ Sylly Mode** — always last; the "advanced rules" signature

**Settings button on the game menu:** always labelled **"Settings"** exactly. Thematic flair lives inside the overlay as the title block — not on the button.

**Scroll reset on open:** call `el.querySelector('.overlay-data-inner').scrollTop = 0` before `style.display = 'flex'` so the thematic title is always the first thing seen. `overlay-data-inner` gets `overflow-y: auto` from its CSS class — NOT from a Tailwind utility. Using `.overflow-y-auto` returns `null` silently and the scroll is never reset.

**How-to overlays** follow the same structure: thematic title block at top, same `.overlay-data-inner` scroll reset on open.

All multi-choice settings use the **Pill Button** style:
- Inactive: `.pill` | Active: `pill-active-[game-colour]` (see table below)
- Group targeting via `data-group` or `data-*` attributes
- No sliders for discrete choices

### Settings Card Standard
Every individual setting is wrapped in a white card. Do NOT use bare divs or `<hr>` separators.

**Emoji rule — only Sylly Mode gets one:** Setting card titles carry **no emoji prefix**. The single exception is the `✨ Sylly Mode` card, whose label is literally `✨ Sylly Mode` (the `✨` is part of the label). Do not prefix any other setting name with an emoji — it dilutes the signal that `✨` marks the advanced/last card. (Fixed June 2026: SS "⏱ Broadcaster Timer" → "Broadcaster Timer".)

**Pill-group card** (timer, rounds, difficulty, etc.):
```html
<div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3">
  <div>
    <p class="text-stone-800 font-semibold">Setting Name</p>
    <p class="text-stone-400 text-sm mt-0.5">Plain English description of what this controls.</p>
  </div>
  <div class="flex gap-2">
    <!-- pill buttons -->
  </div>
</div>
```

**Dynamic value line (added Aug 2026 — CJAR is the reference).** A pill label carries the
**thematic name and nothing else**. When the option also encodes a concrete value the player
needs — a duration, a count, a threshold, a percentage — that value goes on its own live line
**below** the pill row, never inside the label:

```html
<div class="flex flex-col gap-2">
  <div class="flex gap-2"><!-- pills, thematic names only --></div>
  <p id="[abbr]-val-[group]" class="text-stone-400 text-xs"></p>
</div>
```

- **Required** when the option encodes a concrete value not visible in its label. **Optional**
  otherwise — an ON/OFF toggle whose description already says what it does does not need one.
- The **static description above the pills stays**, and keeps its own job: it says what the
  setting *controls*, and it is the only thing there to read before a choice has been made.
  The dynamic line says what you have just *picked*. Collapsing the two loses the first.
- Repaint it from the game's `[abbr]SyncSettingsUI()` **and** from the pill click handler.
- This is the same shape as the Sylly intensity slider's live descriptor below — same class
  (`text-stone-400 text-xs`), same job — generalised from sliders to pill groups.

**Why the rule exists:** cjar shipped Decision Time as `Blitz / Standard / No Rush` with the
actual seconds written nowhere in the app, while Match Length baked its values into the labels
(`Quick Snack (3)`), which lengthens pills unevenly and breaks the row's alignment. Both are the
same gap. Keeping values off the labels is also what protects thematic setting names, which are
close to a suite signature.

**Pill toggle rule:** `.pill` base class must ALWAYS remain on every pill button. Never remove it. Only add/remove `.pill-active-[colour]`. The `pill-active-*` classes only define background-color and color — all structural styles (border-radius, padding, flex, font-size) live in `.pill`. Removing `.pill` leaves an unstyled box.

Correct toggle pattern:
```js
document.querySelectorAll(`[data-group="${group}"]`).forEach(p => {
  p.classList.remove('pill-active-[colour]');
});
pill.classList.add('pill-active-[colour]');
```
Never: `p.classList.toggle('pill', !isActive)` — this strips base styles from the active pill.

**Toggle card** (on/off setting) — description sits *below* the title+toggle row, never nested inside it:
```html
<div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
  <div class="flex items-center justify-between">
    <p class="text-stone-800 font-semibold">Setting Name</p>
    <button id="btn-xxx-toggle" class="sylly-toggle-off shrink-0">OFF</button>
  </div>
  <p class="text-stone-400 text-sm">Plain English description.</p>
</div>
```

**Slider sub-option (intensity / level)** — used inside the Sylly Mode card when the game has a tuneable intensity. Shown only when the toggle is ON. The slider colour comes from the game's `[abbr]-range` CSS class; the label above it is always neutral stone.
```html
<!-- Sub-option container — shown only when toggle is ON -->
<div id="[abbr]-sylly-sub-options" style="display:none" class="flex flex-col gap-2 mt-1">
  <p class="text-stone-500 text-sm font-semibold">[Level Name]</p>
  <input id="[abbr]-sylly-intensity-slider" type="range" min="[N]" max="[N]" step="[N]" value="[N]"
    class="[abbr]-range w-full" />
  <p id="[abbr]-sylly-intensity-label" class="text-stone-400 text-xs">[N]% [game-voiced noun]</p>
</div>
```
Rules:
- Container: `flex flex-col gap-2 mt-1`, `style="display:none"` — toggled via JS when Sylly Mode turns ON/OFF
- Level name label: `text-stone-500 text-sm font-semibold` — no game colour, no uppercase, no tracking
- Slider: `[abbr]-range w-full` — colour lives in CSS, not in the label
- Descriptor below slider: `text-stone-400 text-xs`, format `N% [game-voiced noun]` (e.g. `30% wild cards`, `5% chaos per die`) — updated live on `input` event
- No special-case emoji at max value
- JS update pattern: `el.textContent = \`${val}% [noun]\`` — simple string, no branches
- Reference implementations: LI5 (`sylly-pct-row` / "Extra Credit Level"), DYB (`dyb-sylly-sub-options` / "Chaos Level")

**Sylly Mode card** — always the last card in every settings overlay:
```html
<div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
  <div class="flex items-center justify-between">
    <p class="text-stone-800 font-semibold">✨ Sylly Mode</p>
    <button id="btn-[abbr]-sylly-toggle" class="game-toggle-off shrink-0">OFF</button>
  </div>
  <p class="text-stone-600 text-sm font-semibold">[Thematic Name]</p>
  <p class="text-stone-400 text-sm">[Full description in one paragraph.]</p>
  <!-- Slider sub-option — use pattern above if the game has a tuneable level -->
</div>
```
Rules:
- Subtitle (`text-stone-600 text-sm font-semibold`): thematic name only, no emoji, always visible
- Description (`text-stone-400 text-sm`): one paragraph, always visible — even when toggle is OFF
- Sub-options (pills, sliders): wrapped in a separate `style="display:none"` div, shown only when toggle is ON — only used when there is a meaningful sub-choice (e.g. GM intensity)
- CTA start-game buttons (game menu) must not contain emoji — one case of the broader § Action Button Standard
- LI5: subtitle is "Extra Credit"; intensity slider (`#sylly-pct-row`) is revealed on toggle ON (same sub-options pattern as GM)

**Mutually-exclusive / superseded settings (named Aug 2026 — the pattern itself shipped earlier,
unnamed).** Two settings can interact in one of two ways once a game has both a Sylly Mode and
another toggle that can't sensibly run alongside it:

| Pattern | Behaviour |
|---------|-----------|
| **Mutually exclusive** | A ON forces B OFF, reciprocally. Both stay reachable. |
| **Superseded** | A ON makes B irrelevant. **B's stored value is not modified** and returns intact when A goes OFF. |

**Instances, in shipped order:** FRT's **Pear-Off ↔ Sylly Mode** (Mutually exclusive; shipped SW
v167, 10 Aug 2026 — `js/games/frt.js` `frtPearOff`/`frtSyllyMode`, reciprocal lock in both toggle
handlers, `frt-pearoff-locked-note`/`frt-sylly-locked-note` in `index.html`) is the **first**
instance. NT's **Debug Mode ↔ Sylly Mode** (both patterns at once — Mutually exclusive with Sylly,
and Superseded over Iterations/Hardening Window; shipped this branch, 17 Aug 2026) is the
**second**. FRT's pattern went undocumented until this entry named it — worth noting, since that is
presumably why it read as novel when NT shipped the same shape a week later.

**Visual contract, both patterns:** the disabled setting's controls get `opacity-50
pointer-events-none`; the card's **title stays at full contrast** (only the controls dim — a reader
scanning card titles must still see every setting exists); a reason line is **mandatory** directly
under the controls, styled `text-amber-600 text-xs`. This documents an existing but previously
unwritten convention — FRT's locked-notes already use `text-amber-600` — rather than introducing a
new colour. It is a primitive **new to this rule file**, not new to the codebase: **never
`text-stone-400`**, which already means something else on this exact screen (the § Dynamic Value
Line's *picked* colour, e.g. "45s" under a Hardening Window pill row). Amber means *unavailable*
(disabled by the exclusivity partner); stone-400 means *not picked*. The two must never look alike,
or a player can't tell "I haven't chosen this" from "I can't choose this."

**The sanctioned card-order exception:** an exclusivity partner may sit immediately **above** the
`✨ Sylly Mode` card in the settings overlay — this is the one and only exception to "Sylly Mode is
always last" there; nothing else may take that slot. The two read as a pair because they are one:
Sylly and its exclusivity partner are the two settings a player must choose between, so the eye
finds them adjacent. FRT's Pear-Off card (`index.html`, `frt-settings-overlay`) is the reference
for the settings-overlay ordering — it precedes NT's by a week. **Mirroring the same ordering into
the How to Play overlay is NT's own addition, not established prior art:** FRT's how-to overlay
(`frt-how-to-overlay`) does not document Pear-Off at all — only Fruity Personalities (Sylly) gets a
card there. NT's Debug Mode card (`nt-how-to-overlay`) is the first instance of the how-to mirror;
treat it, not FRT, as the reference if a future game needs that half of the pattern.

**Implementation note:** both instances implement this locally rather than through a shared helper —
FRT toggles `.disabled`/inline `style.opacity` directly at each of its two toggle handlers;
NT centralises the same idea in one function, `ntSetCardDisabled(ctlId, reasonId, disabled, reason)`
in `js/games/nt.js`. **A shared `bindExclusiveSettings()` engine helper is deliberately still not
being built**, even though this is now confirmed as the pattern's *second* instance (which is
usually this project's own extraction trigger — dice logic stayed in `dyb.js` only until a second
dice game existed). Overridden here on scope grounds: building it now would mean touching FRT, a
shipped game unrelated to the branch that surfaced this, at the tail end of a documentation-only
task. Tracked as a deferred extraction in `docs/deferred-work.md` — build it when a third instance
appears, or the next time either FRT's or NT's settings code is touched for an unrelated reason.

**Outer scrollable body** between cards: `flex flex-col gap-5` — keep consistent across all games.

**Rules:**
- Setting name (`text-stone-800 font-semibold`): thematic name is fine here — this is where personality lives
- Description (`text-stone-400 text-sm`): plain English only — no thematic language; always full-width below, never next to the toggle
- Toggle buttons always get `shrink-0` to prevent flex squeeze
- Toggle OFF state: `game-toggle-off` (canonical) — `sylly-toggle-off` is a legacy alias sharing the same CSS rule; `sylly-toggle-on` is deprecated (see Mute toggle theming § Toggle class rules)
- Active pill colour is game-specific:

See **§ Per-Game Reference → Table A** at the end of this file.

---

## Game Brand Colour — Scope

**Rule:** Game brand colour = "yes, proceed" actions and accents only. Navigation chrome (exit, back) is always neutral.

### Applies — game colour:
| Element | Implementation |
|---------|---------------|
| Primary CTA buttons | `bg-[brand] hover:bg-[brand-dark] text-white` |
| Active pill state | `pill-active-[colour]` |
| Input focus border | `focus:border-[brand]` |
| Team labels on players screen | `text-[brand]` |
| `screen-who-first` primary CTA + confirm label | `accentBtnClass` / `accentTextClass` keys in `showWhoFirst()` config |
| ALL ON/OFF toggles (active) | `game-toggle-on-[colour]` — applies to every toggle including Sylly Mode |
| Settings button (game menu) | `bg-[brand-100] hover:bg-[brand-200] text-[brand-700]` — light brand tint, distinct from full CTA |

### Never applies — always neutral:
| Element | Style |
|---------|-------|
| Exit button (✕) | `text-stone-500 font-bold` |
| Back arrow (←) | `text-stone-500 font-bold` |
| "← Back to the Box" | `bg-stone-200 hover:bg-stone-300 text-stone-500` |
| How to Play button | `bg-stone-700 hover:bg-stone-800 text-white` |

### Per-game brand reference:
See **§ Per-Game Reference → Table A** (brand colour) and **Table C** (the class strings) at the end of this file.

**Notes:**
- **GTH:** Muted Sage (`#B1BCA0`) has no Tailwind utility class — GTH brand colours are applied via inline `style` attributes throughout its markup, hence the `—` entries.
- **DYB:** Ocean blue `#1E4D8C` — custom colour like GTH sage and FRT banana. All brand surfaces use custom CSS classes: `dyb-cta` (CTAs + hover `#183d70`), `dyb-label` (section/step labels), `pill-active-dyb`, `game-toggle-on-dyb`. Range gradient `#dce8f7 → #1E4D8C`. Settings button light tint: `bg-[#dce8f7] hover:bg-[#c8daf0] text-[#1E4D8C]`. Modal border: `border-[#9db8d9]`. `game-toggle-on-stone` is now the neutral lobby fallback only (not DYB's brand).
- **GM:** brand is **split** — `violet-500/600` for all primary CTAs and accents, `purple-*` for pills/toggles/settings tint/modal borders/how-to labels (the values in this table). This is a documented inconsistency, not drift — see `game-identities.md` § Great Minds and the fix plan (unify-or-document item).
- `accentBtnClass`/`accentTextClass` only take effect when a game calls `showWhoFirst()` (team games). GTH, DYB, BLD, and PASS never call it; their values are derived from each game's primary CTA buttons and are listed for consistency should a future mechanic need them.

---

## Action Button Standard — No Emoji, Correct Colour

**Trigger:** Any new button, or edit to an existing one, that fits the definition below.

**Applies to ("action buttons"):**
- The game menu **Play CTA**
- **Decision Modal confirm/cancel buttons** — quit-confirm, quit-cancel, play-again/new-game confirm, play-again cancel
- Any **primary in-game submit/decision button** the player taps to commit an action — "Lock In", "Submit Guess", "Deal Me In", ready-check/vote/confirm buttons, etc.

**Does NOT apply to** (emoji stays, these are identity/flavour, not calls-to-action):
- Icon-only utility buttons — 🔊 sound, ✕ exit, `[?]` help/tip, ⏸/⏭ pause/end-turn, ← back arrow
- Pill buttons and ON/OFF toggle buttons
- "← Back to the Box" / "← Back" navigation
- Tip overlay "Got it" close buttons
- Card/body text, screen headings, the `✨ Sylly Mode` card label (not a button)

**Rule 1 — no emoji on the label.** An action button's text is read at a glance mid-round; an emoji competes
with the words for the same half-second read and adds nothing the label doesn't already say. Thematic voice
belongs in the words ("Let's Cook!", "Deal Me In"), not a glyph tacked on the end.

**Rule 2 — colour must be one of exactly three things:**
1. The game's own brand colour (`bg-[brand] hover:bg-[brand-dark]`, the game's custom `[abbr]-cta` class, or a
   matching inline `style="background-color:#HEX"`) — the default for any confirm/submit/Play CTA.
2. Neutral stone (`bg-stone-200`/`bg-stone-700`) — always correct for a Decision Modal **cancel**, exit, or back
   button; also an accepted "safe" choice for a confirm button where a full brand fill would read as reckless.
3. Semantic **destructive red** (`bg-red-500`/`bg-red-600`) on a confirm button only, when the action is
   irreversible within the game (quitting, restarting) — this is a deliberate exception already documented in
   § Quit Overlay Checklist, not a bug.

A fourth, narrower exception: an **interrupt/alert screen** (a splash announcing something urgent, not a normal
CTA advancing a round) may use red to reinforce the alert framing in its own copy — e.g. SS's
`btn-ss-splash-phase2` ("Urgent mission received: Phase 2 incoming"). This is judged case-by-case against the
button's own copy, not applied by default — don't reach for it to avoid picking a brand colour.

Any other colour on an action button (a different game's brand bleeding in via copy-paste, a legend-swatch
colour reused by accident) is a bug — e.g. a game's confirm button shipping in another game's brand colour,
or a plain "proceed" CTA shipping in neutral stone despite having no cancel/destructive framing.

**Watch for JS-built buttons, not just static HTML.** A button whose label is set via `.textContent =`,
`createElement('button')`, or a shared helper's config object (`showWhoFirst({ confirmLabel })`,
`dsdShowPassGate({ ctaLabel })`) never shows up in an `index.html`-only grep — the label lives in
`js/games/[abbr].js` instead. The suite-wide "Restart in Lobby 🔄" play-again confirm label was exactly this:
every MDLM game sets it dynamically per multiplayer mode, so a static-HTML sweep missed all 13 instances of it
in one pass. When auditing action buttons, grep both `index.html` **and** `js/games/*.js` for `.textContent`,
`createElement('button')`, and any button-building helper.

**Suite-wide sweep completed 7 Aug 2026, all 18 games, no violations outstanding.** Detail and root-cause
lessons: `docs/decision-log.md` 2026-08-07. **Lesson worth keeping visible:** a button's label can be assigned
more than once in the same file (initial render + a later open-the-modal call) — grepping for a known bad
string only finds sites that still contain it, not every assignment site for that button's id. Audit both
`index.html` (static markup) and an exhaustive `[Bb]tn.*textContent =` / `createElement('button')` regex pass
over `js/games/*.js` (JS-built labels), not an id-list-driven pass.

---

## Thumb-Friendly UI
**Trigger:** Any new button, link, or interactive element.

1. Minimum touch target: 44×44px (`min-h-11 min-w-11` in Tailwind)
2. Buttons in Active Play must be in the bottom 60% of screen (thumb zone)
3. No two destructive actions adjacent without spacing

Test: Mentally simulate one-handed phone use before shipping.

---

## Sylly Tone
**Trigger:** Any user-facing text, loading state, or empty state.

Look for ONE opportunity to inject playfulness — cheeky button labels, Australian slang where natural, micro-copy that sounds like a friend.

**Constraint:** Never force it. If it feels cringe, keep it neutral.

**Australian English is mandatory across all games:** colour, flavour, organise, recognise, chilli. Metric units only (°C, kg, km). Applies to all UI copy, system messages, and doc writing.

---

## Universal Menu Standard (All Games)
Every game's main menu screen must have exactly these 4 buttons, in this order: **Play CTA** → **How to Play** → **Settings** → **← Back to the Box**. Only the Play CTA label is game-voiced — the other three are identical across all games (see Rules below).

**Play CTA labels** (as shipped in `index.html`):

See **§ Per-Game Reference → Table B** at the end of this file.

**Type scale rule (DD-31):** same-screen buttons representing real, distinct choices match in
size and weight, no exceptions — a screen with a primary CTA and a secondary exit/back option is
still two real choices being offered, not one action and one non-action. ("← Back to the Box" is
not a smaller/quieter button than the Play CTA.)

| Button | Classes |
|--------|---------|
| Play CTA | `min-h-14 w-full rounded-2xl [brand] text-xl font-semibold` |
| How to Play | `min-h-14 w-full rounded-2xl bg-stone-700 hover:bg-stone-800 text-white text-xl font-semibold` |
| Settings | `min-h-14 w-full rounded-2xl [light brand tint] text-xl font-semibold` |
| ← Back to the Box | `min-h-14 w-full rounded-2xl bg-stone-200 hover:bg-stone-300 text-stone-500 text-xl font-semibold` |

All four carry `active:scale-95 transition-all duration-150`. **This same rule applies to any
other same-screen button pair** — a gameover screen's primary "Play Again" alongside its
secondary "Leave", a Decision Modal's confirm/cancel (already conforming — see § Quit Overlay
Checklist), or any future pairing: match size and weight, and pick colour per § Game Brand
Colour — Scope (brand for the primary action, neutral stone for a secondary one).

**Rollout status:** applied suite-wide, all 18 games (9 Aug 2026).

**Rules:**
- "← Back to the Box" is always identical — never game-themed.
- "How to Play" label is always identical — opens a data overlay (Pattern 1). Always `bg-stone-700 hover:bg-stone-800 text-white`.
- Settings button label is always **"Settings"** — no exceptions. Thematic name lives inside the overlay as the title block. Button uses a **light brand tint** (`bg-[brand-100] hover:bg-[brand-200] text-[brand-700]`) — see Game Brand Colour — Scope § Per-game brand reference for per-game classes.
- Play CTA is the primary action — largest button, top of the stack, full brand colour.

---

## Team Setup Screen Standard
**Applies to:** Any game where two teams compete (2-team games only). Single-player or co-op games skip this.

### Screen count
- **Single-screen** (team names only, no individual player tracking): Screen 1 only. Example: LI5.
- **Two-screen** (team names + individual player names / captain assignment): both screens. Example: SS, DSD.

---

### Screen 1 — Team Names (`screen-[abbr]-setup`)

**Section class:**
```
relative flex flex-col items-center justify-center px-6 py-12 w-full max-w-sm mx-auto text-center gap-6
```

**Required structure:**
```
[absolute top-4 right-4 flex items-center gap-2: btn-open-sound 🔊 + ✕ exit button]
[div.text-5xl role="img": game emoji]
[div: h2.text-3xl.font-bold.text-stone-800 + p.text-stone-400.text-base.mt-1 hint]
[div.flex.flex-col.gap-4.w-full.text-left:
  [div: label + input]
  [div: label + input]
]
[CTA button]
```

**Label style:** `text-stone-500 text-sm font-semibold uppercase tracking-widest block mb-1`
Label text is game-specific ("Team 1", "Team A name", etc.) — structure matters, not exact wording.

**Input style:**
```
w-full rounded-xl border-2 border-stone-200 bg-white px-4 py-3 text-lg text-stone-800
placeholder-stone-300 focus:border-[brand-colour] focus:outline-none transition-colors
```

**Rules:**
- No card wrapper around the inputs — bare `div.flex.flex-col.gap-4` only
- Hint subtext MUST name the actual defaults — e.g. "Leave blank to use Alpha Echo & Bravo Zulu"
- Placeholder text = the default name (e.g. `placeholder="e.g. Crayon Crew"`)
- No team size pills on this screen
- **Pre-fill rule:** only pre-fill if the user previously set a *custom* name — leave blank (show placeholder) if the value is still the default. Check: `value = teamNames[0] !== 'DefaultA' ? teamNames[0] : ''`

---

### Screen 2 — Player Names (`screen-[abbr]-players`)
**Only for games with individual player name inputs.** Omit entirely for games like LI5 that don't track per-player names.

**Section class:**
```
relative flex flex-col items-start px-6 py-10 w-full max-w-sm mx-auto gap-5
```

**Required structure:**
```
[div.flex.justify-between.items-center.w-full: ← back / eyebrow label / btn-open-sound 🔊]
[div: h2.text-2xl.font-bold.text-stone-800 heading + p.text-stone-400.text-sm.mt-1 subtitle]
[div.w-full: "Team size" label + pills — NO card wrapper]
[div.w-full: team-A coloured label + input container]
[div.w-full: team-B coloured label + input container]
[p error text — hidden by default]
[CTA button]
```

**Team size label style:** `text-stone-600 text-sm font-semibold mb-2` (no card wrapper)
**Team label style:** `text-xs font-semibold uppercase tracking-widest text-[brand-colour] mb-2`
**Player input style:** same as Screen 1 input style above (use `text-base` instead of `text-lg`)

**Rule:** Team size pills belong on Screen 2 — NOT on Screen 1.

---

### Per-game reference
| Game | Screen 1 heading | Default names | Input focus colour | Screen 2? |
|------|-----------------|--------------|-------------------|-----------|
| LI5 | "Name your Playgroups!" | Crayon Crew / Glue Stick Gang | `focus:border-pink-400` | No |
| SS | "Establish Cover Identities" | Alpha Echo / Bravo Zulu | `focus:border-teal-400` | Yes |
| DSD | "Name Your Task Forces" | SS Kraken / SS Leviathan | `focus:border-cyan-600` | Yes |

---

## Quit Overlay Checklist
Every game's quit overlay (Pattern 2 — Decision Modal) must have ALL of:
- Thematic emoji (e.g. 🏳️ for LI5, 📡 for GM, 🔐 for SS, 🍳 for JEC)
- Game-voiced heading (not the generic "Quit game?")
- Game-voiced subtext (what will be lost, in the game's voice)
- Themed confirm button (e.g. "Yeah, pack up!", "Yeah, disconnect.", "Yeah, close the kitchen.")
- Neutral cancel button ("Keep going!" or "Not yet!")

**Button sizing (added Aug 2026 — previously unstated, and the suite drifted into three variants because of it).** Both buttons in a Decision Modal — quit confirm/cancel, play-again confirm/cancel — use:

```
min-h-14 w-full rounded-2xl … font-semibold text-lg active:scale-95 transition-all duration-150
```

Confirm takes the game's `accentBtnClass` (or `bg-stone-700` where the brand fill would read as "safe"); cancel is always `bg-stone-200 hover:bg-stone-300 text-stone-700`. **`min-h-11` / `text-sm` is not a valid Decision Modal button** — it clears the 44 px touch minimum but reads as a dismissible toast rather than a decision you are being asked to make.

Note this is *different* from the **tip overlay's** close button, which is deliberately `min-h-11 … text-sm` (see § Contextual Tip Icons) — a tip has one acknowledging button and no decision in it.

All 18 games conform as of the 7 Aug 2026 sweep (`docs/deferred-work.md`).

---

## Vocab Lock Reuse Pattern
The vocab lock is game-agnostic and available to any future game:
- **Vocabulary check:** `window.activeExpansionData.vocab.has(normaliseWord(input))`  — covers primary words AND all `nono_list` terms
- **Open vocab overlay:** `smOpenVocabOverlay()` — opens the terminal-style `#gm-vocab-overlay`
- **"VIEW WORD LIST" button:** show `#gm-vocab-list-btn` reactively on vocab-lock failure; reset (hide) at the start of each turn's input setup
- Any future game can wire a "VIEW WORD LIST" button to `smOpenVocabOverlay()` with zero changes to `secret-mode.js`

---

## Per-Game Reference

**Single source of truth for every per-game value in this file** — six tables merged into three, so
**adding a game = three rows**, not six. Notes stay in their own sections above; not repeated here.

### Table A — Brand colour and the four themed classes

| Game | Brand colour | Range (`updateSliderTheme`) | Toggle ON (`getMuteToggleOnClass`) | Active pill |
|------|-------------|------------------------------|-------------------------------------|-------------|
| None / lobby | neutral stone | `stone-range` | `game-toggle-on-stone` | — |
| LI5 | pink-500 | `li5-range` | `game-toggle-on-pink` | `pill-active-pink` |
| GM | violet-500 CTAs / purple-* pills | `sylly-range` | `game-toggle-on-purple` | `pill-active-purple` |
| SS | teal-500 | `ss-range` | `game-toggle-on-teal` | `pill-active-teal` |
| JEC | amber-500 | `jec-range` | `game-toggle-on-amber` | `pill-active-amber` |
| YGI | orange-500 | `ygi-range` | `game-toggle-on-orange` | `pill-active-orange` |
| LTTP | red-500 | `lttp-range` | `game-toggle-on-red` | `pill-active-red` |
| NAT | lime-600 | `nat-range` | `game-toggle-on-lime` | `pill-active-lime` |
| DSD | cyan-700 | `dsd-range` | `game-toggle-on-cyan` | `pill-active-cyan` |
| GTH | `#B1BCA0` sage (custom) | `gth-range` | `game-toggle-on-sage` | `pill-active-sage` |
| DYB | `#1E4D8C` ocean (custom) | `dyb-range` | `game-toggle-on-dyb` | `pill-active-dyb` |
| BLD | `#991b1b` dark red (red-800, custom) | `bld-range` | `game-toggle-on-bld` | `pill-active-bld` |
| PASS | zinc-900 | `pass-range` | `game-toggle-on-zinc` | `pill-active-zinc` |
| NT | emerald-500 | `nt-range` | `game-toggle-on-emerald` | `pill-active-emerald` |
| FRT | `#FFE500` electric lemon (custom) | `frt-range` | `game-toggle-on-frt` | `pill-active-frt` |
| SHP | `#3A3D52` midnight (custom) | `shp-range` | `game-toggle-on-shp` | `pill-active-shp` |
| FLW | `#E879A8` rose-pink (custom) | `flw-range` | `game-toggle-on-flw` | `pill-active-flw` |
| PKO | `#854D0E` (custom) | `pko-range` | `game-toggle-on-pko` | `pill-active-pko` |
| CJAR | `#D4A017` honey-gold (custom) | `cjar-range` | `game-toggle-on-cjar` | `pill-active-cjar` |

`sylly-range` is GM's alone — it predates the `[abbr]-range` convention every other game follows. Never reuse it.
Gradient values live on each `.[abbr]-range` rule in `css/styles.css`.

### Table B — Game-voiced strings

| Game | Play CTA (menu) | How-to emoji | Sylly Mode name |
|------|-----------------|--------------|-----------------|
| LI5 | Play Time! | 💬 | Extra Credit |
| GM | Begin Link | 🧠 | Static Interference |
| SS | Start Mission | 📡 | Intel Phase |
| JEC | Let's Cook! | 🍳 | Kitchen Nightmares |
| YGI | Let's Get To It! | 🃏 | The Ringer |
| LTTP | Find The Location! | 🏃‍♂️ | The Troublemaker † |
| NAT | Begin Observation | 🦁 | Survival of the Fittest |
| DSD | Begin Deployment | ⚓ | Silent Running |
| GTH | Start the Session | 🛋️ | Stroke or Genius |
| DYB | Let's Play! | 🎲 | The Tempest |
| BLD | Make the Plans | 📋 | Drama Mode |
| PASS | Deal Me In | 🃏 | The Abyss |
| NT | Initialise System | ⚡ | Devil's Network Protocol |
| FRT | Start Serving | 🍌 | Fruity Personalities |
| SHP | Lights Out | 🐑 | Night Terrors |
| FLW | Enter the Exhibition | 💎 | The Counterfeit Run |
| PKO | Enter the Wild | 🐘 | Force of Nature |
| CJAR | Raid the Jar! | 🍪 | Dibber Dobber |

**†  Resolved 1 Aug 2026 — LTTP's Sylly Mode is real and shipped.** The How-to Standard's old parenthetical
("omit for LTTP which has none") was wrong and has been corrected. Verified in code: `lttpJokerMode`, the
`The Troublemaker` role with 2 decoys, and three-way scoring (`lttp.js`; settings + how-to cards in `index.html`).
**Every game in Table B has a Sylly Mode** — there is no exception.

### Gameover podium rank icons (added 8 Aug 2026, DD-30/DD-31)

Any gameover "podium" that wants a rank icon (not every game needs one — plenty just show a
rank number) uses **🥇🥈🥉 in a fixed-width leading slot present on every row**, blank past 3rd
place, so every row's text starts at the same x position regardless of rank. This is the
existing suite-wide medal convention (already shipped independently in FRT, GTH, JEC, NAT,
PASS, YGI) with the fixed-slot alignment fix CJAR needed formalised as the documented shape
going forward:

```html
<span class="cjar-medal-slot">🥇</span>  <!-- or 🥈 / 🥉 / '' for 4th+ -->
```

`width: 1.4rem; text-align: center; flex-shrink: 0` (or the equivalent for the game's own
prefix convention) is the load-bearing part — a row with NO medal must still reserve the slot's
width, or its text starts further left than a medalled row's and the podium reads as
misaligned (this was CJAR's actual bug: only 1st place carried a leading glyph at all, so it
was the only row indented past the others). **Prospective, not retroactive** — new or
touched-anyway games follow this shape; the existing FRT/GTH/JEC/NAT/PASS/YGI podiums are not
being swept to add a fixed slot unless one of them is independently touched.

### Table C — Brand class strings

The how-to **close button is always the game's `accentBtnClass`**, so it no longer has its own column. The
**step label** does keep one — it is usually the -500 shade where `accentTextClass` is -600.

| Game | `accentBtnClass` (= how-to close) | `accentTextClass` | How-to step label | Settings button (light tint) |
|------|-----------------------------------|-------------------|-------------------|------------------------------|
| LI5 | `bg-pink-500 hover:bg-pink-600` | `text-pink-600` | `text-pink-500` | `bg-pink-100 hover:bg-pink-200 text-pink-700` |
| GM | `bg-purple-500 hover:bg-purple-600` | `text-purple-600` | `text-purple-500` | `bg-purple-100 hover:bg-purple-200 text-purple-700` |
| SS | `bg-teal-500 hover:bg-teal-600` | `text-teal-600` | `text-teal-500` | `bg-teal-100 hover:bg-teal-200 text-teal-700` |
| JEC | `bg-amber-500 hover:bg-amber-600` | `text-amber-600` | `text-amber-500` | `bg-amber-100 hover:bg-amber-200 text-amber-700` |
| YGI | `bg-orange-500 hover:bg-orange-600` | `text-orange-600` | `text-orange-500` | `bg-orange-100 hover:bg-orange-200 text-orange-700` |
| LTTP | `bg-red-500 hover:bg-red-600` | `text-red-600` | `text-red-500` | `bg-red-100 hover:bg-red-200 text-red-700` |
| NAT | `bg-lime-600 hover:bg-lime-700` | `text-lime-700` | `text-lime-600` | `bg-lime-100 hover:bg-lime-200 text-lime-700` |
| DSD | `bg-cyan-700 hover:bg-cyan-800` | `text-cyan-700` | `text-cyan-700` | `bg-cyan-100 hover:bg-cyan-200 text-cyan-700` |
| GTH | inline `style="background-color:#B1BCA0"` | — | inline `style="color:#B1BCA0"` | inline `style="background-color:#e8ede3;color:#6b7a5f"` |
| DYB | `dyb-cta` | `dyb-label` | `dyb-label` | `bg-[#dce8f7] hover:bg-[#c8daf0] text-[#1E4D8C]` |
| BLD | `bld-cta` | `bld-label` | `bld-label` | `bg-red-100 hover:bg-red-200 text-red-700` |
| PASS | `bg-zinc-900 hover:bg-zinc-800` | `text-zinc-900` | `text-zinc-700` | `bg-zinc-100 hover:bg-zinc-200 text-zinc-700` |
| NT | `bg-emerald-500 hover:bg-emerald-600` | `text-emerald-600` | `text-emerald-600` | `bg-emerald-100 hover:bg-emerald-200 text-emerald-700` |
| FRT | inline `style="background:#FFE500"` § | inline `text-[#047857]` | inline `style="color:#047857"` | `bg-[#FFF4CC] hover:bg-[#FFF3A6] text-[#854d0e]` |
| SHP | `shp-cta` | — | `shp-label` | `bg-[#E6E7EE] hover:bg-[#C9CBDA] text-[#3A3D52]` |
| FLW | `flw-cta` | — | `flw-step-label` | `bg-[#A02050] hover:bg-[#7A1A3E] text-white` ¶ |
| PKO | `pko-cta` | — | `pko-label` | `bg-[#F5E6C8] hover:bg-[#EBD5A8] text-[#854D0E]` |
| CJAR | `cjar-cta` ‡ | — | `cjar-label` | `bg-[#F7E9C4] hover:bg-[#EFDCA8] text-[#7A5C0A]` |

**‡** CJAR is the second game after FRT whose fill takes **dark ink, never white** — `#D4A017` measures **2.38:1** against white (below the 3:1 large-text floor) and **6.39:1** against stone-800. `.cjar-cta` supplies `color:#292524` itself, so never add a Tailwind `text-white` alongside it; that is also why the `MP_GAME_CONFIGS` entry sets `ctaTextClass: 'text-stone-800'`. Labels use the darkened `#7A5C0A`, because raw `#D4A017` on `bg-stone-50` is itself under 3:1. Modal border `border-[#E5C97A]`.

**§** FRT’s how-to close button is the one exception — `bg-[#FFE500] hover:bg-[#E6D200] text-stone-800`, same colour as utilities (recoloured from banana `#FFC700` + white ink 2 Aug 2026 — the white text failed WCAG contrast on the brighter lemon fill; see decision-log).

**¶** FLW's Settings/Audit/readyCheck buttons are a deliberate **exception to the light-tint
convention itself** (not just a contrast fix) — owner-requested "flip" (15 Aug 2026, settled after
6 passes): rather than the usual `bg-[brand-100] text-[brand-700]` pastel tint, the fill inverts
FLW's own dark hex (`#A02050`, the same "dark ink" used for carat text) against WHITE text
(simplified from light-pink `#F9A8D4` text mid-round — same fill, cleaner text). The primary
CTA/pills/toggle-ON (and the lobby's own `#btn-flw` game tile) are `#F9A8D4` fill + WHITE text too
— confirmed live by the owner against the lobby tile as the reference combo; measured contrast is
low (~1.8:1) but this is a deliberate, twice-confirmed call, not an oversight to "fix". Don't
generalise the flip to other games' Settings buttons — it's FLW-specific.
A `—` in the `accentTextClass` column means the game never calls `showWhoFirst()` (GTH, FLW, PKO, SHP, CJAR). Don’t invent one.
