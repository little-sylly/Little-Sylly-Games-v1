# UI Style Rules — Little Sylly Games

**Scope during a UI revamp pass:** the layout, motion-cap and screen-pattern rules below are defaults, not
gates — depart when the game's world needs it, and log the departure (`docs/rules/ui-revamp.md` § 2).
Brand-coded controls, the speaker/exit protocol and the touch-target minimum still bind.

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

## Round/Night Intro Screen (default for the start of every match round)

> **Moved (4 Nov 2026) → `docs/rules/ui-screen-patterns.md`** — read it when adding or retrofitting a per-round intro screen.
> **Headline rule:** A repeated phase (Night, Raid, Round) opens with a short auto-advancing interstitial that sets the scene AND restates what to do; flavour line host-picked and synced in MDLM.
> **The match-start Intro** (narrator, brief, Line-up, Ready) is engine-owned — `screen-game-intro`; a game brings a template + scene, never its own screen. `docs/rules/ui-revamp.md` § 3.

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

See **Table A** in `docs/rules/per-game-classes.md`. (Gradient values live in `css/styles.css` on each `.[abbr]-range` rule — read them there.)

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

See **Table A** in `docs/rules/per-game-classes.md`.

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

> **Moved (4 Nov 2026) → `docs/rules/ui-howto-extras.md`** — read it when building or editing a How-to gallery tile or zoomable art.
> **Headline rule:** `#art-viewer-overlay` is the only art viewer (engine-owned, unbranded) — never build a per-game copy; `openArtViewer(src, caption)` no-ops on a falsy src.

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
| z-[90] | How-to, history, review overlays; `#lobby-switcher-overlay`, `#stickerbook-overlay` |
| z-[95] | gm-boost, gm-near-sync, gm-override, gm-new-frequency; ss-intel overlays |
| z-[100] | gm-neural-library, deck panels |
| z-[105] | `#art-viewer-overlay` — global; above the how-to sheets it opens from |
| z-[110] | `#sound-overlay` — global, always on top |

---

## The Stack — Canonical Screen Layout (read this before building ANY screen)

Every screen in every game is built from **the Stack**: three zones stacked in one vertical column, held together and floated in the middle of the viewport. This is the *single* layout standard — there is no per-screen "which pattern?" decision to make. Pick the Stack (outside a revamp pass, always).

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

4. **A screen repainted by more than one render function must have each of them own every element it cares about.** Repainting only `#body`/`#footer` means showing whatever the previous renderer last wrote to every element you didn't touch, header included (SHP's Night-End summary inherited the table's "THE PLUNGE 🔻" status). When adding a second render function for one screen, list every element the *other* renderers touch and set them explicitly, even to a no-op value. Detail: `shp-impl-notes` Template Gaps.

### A control used while reading the Stage belongs IN the Stack, not over it

The overlay registry is the default answer to "where does this picker live?", and for most pickers it
is the right one. It is the wrong one whenever **the choice depends on what the Stage is showing** —
the player then needs both at once, and an overlay takes the Stage away at exactly the wrong moment.
Such a control goes in the **Controls zone as a mutually exclusive sibling**: one of picker / action
bar / confirm bar shown at a time, toggled by a plain boolean, costing no z-index entry and no
`resetToLobby()` teardown line.

Reference: COMB's `#comb-build-picker` — step 1 of a build (*which piece*, with its cost) sits beside
`#comb-action-bar` and `#comb-place-bar` rather than over the board, because *what* you can afford
and *where* it could legally go are read together. Detail: `comb-implementation-notes` DD-12 / TG-10.

**A disabled control here dims but stays tappable.** `pointer-events: none` is the suite's default for
a disabled button and it is right when a *phase* disabled the control; it is wrong when a *rule* did,
because the reason is the thing worth saying. Same principle as a dimmed board target that answers
when tapped — decide deliberately between "inert" and "inert but answerable".

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

> **Moved (4 Nov 2026) → `docs/rules/ui-motion.md`** — read it when writing or reviewing any transition, @keyframes or RAF animation.
> **Headline rule:** Animate only `transform`/`opacity`; ≤300 ms unless a full overlay or a blocking choreography beat; never `ease-in`; no new `transition-all`; reduced motion is global for CSS but a RAF loop must check it itself in JS.

### Legacy sticky-footer pattern — do NOT use for new screens

> **Moved (4 Nov 2026) → `docs/rules/ui-screen-patterns.md`** — read it when touching a screen on the `h-screen` whitelist, or tempted to use the sticky-footer layout.
> **Headline rule:** New screens use the Stack; the `h-screen` sticky-footer is legacy and only the whitelisted screens keep it.

### Legacy `h-screen` whitelist (baseline sweep, 26 June 2026)

> **Moved (4 Nov 2026) → `docs/rules/ui-screen-patterns.md`** — read it when checking whether a screen is a sanctioned `h-screen` exception.
> **Headline rule:** If a screen NOT on the whitelist looks edge-pinned or sparse, that is a new bug.

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

      <!-- Last card — every game has a Sylly Mode; see Table B in docs/rules/per-game-classes.md -->
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
- **Sylly Mode card:** present in every game's How to Play, **including the games that have none** (COMB, HSG). Label is `✨ Sylly Mode` (literal — the `✨` is part of the label text, styled with `text-[brand]`). Heading is the thematic name (e.g. "Wild Words", "Silent Running").
  - **The no-Sylly-Mode form (COMB SW v225, then HSG).** A game may ship without a Sylly Mode when its ordinary settings already own the difficulty axis and an eighth "advanced rules" switch would be decoration. When it does, **the how-to card stays in its usual last slot** with a heading saying so plainly (COMB: *"Not this one"*) and a line pointing at the setting that does the job. A player scanning for the card must get an **answer**, not a gap. The **settings overlay then carries no Sylly Mode card at all** — a dead toggle is worse than an honest sentence, and on a settings screen a dimmed control already means *unavailable* (§ Mutually-exclusive / superseded settings). Do not reach for this: it is an exception earned by having seven rule-bearing settings, not a licence to skip the work.
- **Close button:** game brand primary colour (`bg-[brand] hover:bg-[brand-dark]`).
- **Inner div:** must include `flex flex-col` — title block is `flex-shrink-0`, body is `overflow-y-auto`.

### Optional tab bar — N tabs

> **Moved (4 Nov 2026) → `docs/rules/ui-howto-extras.md`** — read it when adding or editing a How-to tab bar (Rules | Practice | gallery).
> **Headline rule:** First tab is always the Step cards; each tab body is its own scroll region with its own "Got it"; gallery tiles render through the game's own render seam, never hand-built markup.

### Tap-Hold Reference (default for a card's long-press, added 12 Aug 2026 — SHP, generalising PKO)

> **Moved (4 Nov 2026) → `docs/rules/ui-howto-extras.md`** — read it when wiring a card long-press to the How-to gallery.
> **Headline rule:** Default long-press on a real card jumps to its row in the gallery via the shared `bindCardHold` + `refHighlightRow` — no standalone inspect popup.

### Practice tab — the suite's tutorial standard (SW v241, DYB is the reference)

> **Moved (4 Nov 2026) → `docs/rules/ui-howto-extras.md`** — read it when building or retrofitting a Practice tab / tutorial.
> **Headline rule:** Built from the game's real renderers fed a model, beats gated on the player acting, no multiplayer, JS reduced-motion check; see docs/practice-rollout.md for the tracker.

### Per-game reference

See `docs/rules/per-game-classes.md` — **Table B** for emoji + Sylly Mode name, **Table C** for the step-label and close-button classes.

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
3. **✨ Sylly Mode** — always last; the "advanced rules" signature. **Omitted entirely by a game that has none** (COMB and HSG — see § How-to Overlay Standard's no-Sylly-Mode form); never shipped as a toggle that does nothing

**Settings button on the game menu:** always labelled **"Settings"** exactly. Thematic flair lives inside the overlay as the title block — not on the button.

**Scroll reset on open:** call `el.querySelector('.overlay-data-inner').scrollTop = 0` before `style.display = 'flex'` so the thematic title is always the first thing seen. `overlay-data-inner` gets `overflow-y: auto` from its CSS class — NOT from a Tailwind utility. Using `.overflow-y-auto` returns `null` silently and the scroll is never reset.

**How-to overlays** follow the same structure: thematic title block at top, same `.overlay-data-inner` scroll reset on open.

All multi-choice settings use the **Pill Button** style:
- Inactive: `.pill` | Active: `pill-active-[game-colour]` (see table below)
- Group targeting via `data-group` or `data-*` attributes
- No sliders for discrete choices
- **Active-pill fill + ink = the game's locked button scheme: brand fill + white ink**, no
  per-game contrast carve-out (incl. FRT/YGI/COMB/CLD). Same for `game-toggle-on-*` ON states.
  See § Action Button Standard → "Locked per-game button scheme".

### Settings Card Standard
Every individual setting is wrapped in a white card. Do NOT use bare divs or `<hr>` separators.

**Emoji rule — only Sylly Mode gets one:** Setting card titles carry **no emoji prefix**. The single exception is the `✨ Sylly Mode` card, whose label is literally `✨ Sylly Mode` (the `✨` is part of the label). Do not prefix any other setting name with an emoji — it dilutes the signal that `✨` marks the advanced/last card.

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

**Why:** a value written nowhere (`Blitz / Standard / No Rush`) and a value baked into the label
(`Quick Snack (3)`, which lengthens pills unevenly and breaks the row's alignment) are the same
gap. Keeping values off labels is also what protects thematic setting names, a suite signature.

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

**Visual contract, both patterns:** the disabled setting's controls get `opacity-50
pointer-events-none`; the card's **title stays at full contrast** (only the controls dim — a reader
scanning card titles must still see that every setting exists); a reason line is **mandatory**
directly under the controls, styled `text-amber-600 text-xs`. **Never `text-stone-400`** — that
already means something else on this exact screen (§ Dynamic Value Line's *picked* colour, e.g.
"45s" under a pill row). Amber means *unavailable*; stone-400 means *not picked*. If the two look
alike a player can't tell "I haven't chosen this" from "I can't choose this."

**The sanctioned card-order exception:** an exclusivity partner may sit immediately **above** the
`✨ Sylly Mode` card in the settings overlay — the one and only exception to "Sylly Mode is always
last"; nothing else may take that slot. The two read as a pair because the player is choosing
between them. Reference: FRT's Pear-Off card (`frt-settings-overlay`). **Mirroring that order into
the How to Play overlay** is a separate, newer move — NT's Debug Mode card (`nt-how-to-overlay`) is
the only instance and the reference for that half.

**Instances and implementation:** FRT's Pear-Off ↔ Sylly Mode (mutually exclusive, inline in
`js/games/frt.js`'s two toggle handlers) and NT's Debug Mode ↔ Sylly Mode (both patterns at once,
centralised in `ntSetCardDisabled` in `js/games/nt.js`). A shared `bindExclusiveSettings()` helper
is deliberately **not** built yet — rationale and trigger in `docs/deferred-work.md`.

**Outer scrollable body** between cards: `flex flex-col gap-5` — keep consistent across all games.

**Rules:**
- Setting name (`text-stone-800 font-semibold`): thematic name is fine here — this is where personality lives
- Description (`text-stone-400 text-sm`): plain English only — no thematic language; always full-width below, never next to the toggle
- Toggle buttons always get `shrink-0` to prevent flex squeeze
- Toggle OFF state: `game-toggle-off` (canonical) — `sylly-toggle-off` is a legacy alias sharing the same CSS rule; `sylly-toggle-on` is deprecated (see Mute toggle theming § Toggle class rules)
- Active pill colour is game-specific:

See **Table A** in `docs/rules/per-game-classes.md`.

---

## Game Brand Colour — Scope

**Rule:** Game brand colour = "yes, proceed" actions and accents only. Navigation chrome (exit, back) is always neutral.
**UI revamp wording (SW v264):** *brand-coded controls (CTA, active pill, ON toggle, focus border) use only this
game's brand colour. Scene art uses whatever palette its world needs.* During the revamp the layout, motion-cap and
screen-pattern rules in this file are **defaults, not gates** — depart and log it (`docs/rules/ui-revamp.md` § 2).

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
See `docs/rules/per-game-classes.md` — **Table A** (brand colour) and **Table C** (the class strings).

**Notes:**
- **GTH:** Muted Sage (`#B1BCA0`) has no Tailwind utility class — GTH brand colours are applied via inline `style` attributes throughout its markup, hence the `—` entries.
- **DYB:** Warm rock/clay grey `#6B5744` (moved off ocean blue `#1E4D8C` 5 Sep 2026 — rocks/bluff/grey-zone theme, and it pulls DYB out of the suite's blue cluster) — custom colour like GTH sage and FRT banana. All brand surfaces use custom CSS classes: `dyb-cta` (CTAs + hover `#54432F`), `dyb-label` (section/step labels), `pill-active-dyb`, `game-toggle-on-dyb`. Range gradient `#e8e1d8 → #6B5744`. Settings button light tint: `bg-[#e8e1d8] hover:bg-[#ddd4c4] text-[#6B5744]`. Modal border: `border-[#c2b09d]`. `game-toggle-on-stone` is now the neutral lobby fallback only (not DYB's brand). Deliberately more saturated than a flat neutral grey so it doesn't blend into the app's own stone-toned chrome.
- **GM:** brand is **split** — `violet-500/600` for all primary CTAs and accents, `purple-*` for pills/toggles/settings tint/modal borders/how-to labels (the values in this table). This is a documented inconsistency, not drift — see `docs/game-identities/gm.md` T7c and the fix plan (unify-or-document item).
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

**Locked per-game button scheme (10 Sep 2026).** When a game's **menu Play CTA** colour scheme is
set, that fill **and its ink** are locked for the game: every *standard* button and every *settings
pill* uses the same **brand fill + white ink**. This is the top of the hierarchy — if the menu CTA
scheme changes, the in-game buttons follow.

- **White ink, suite-wide, no per-game contrast carve-out.** The four light-fill brands — FRT
  `#FFE500` (~1.1:1), YGI `amber-500` (~2.1:1), COMB `#F0A500` (~1.9:1), CLD `#8ECAE6` (~1.8:1) —
  take white ink too. The contrast cost is **accepted at owner direction** in exchange for one
  legible-or-not *consistent* scheme per game. Do not re-introduce `text-stone-800` /
  `ctaTextClass` "contrast fixes" on these — that drift was swept out in this pass. (`.pill-active-*`,
  `.game-toggle-on-*`, `.[abbr]-cta` all carry `color:#fff` for these four; `MP_GAME_CONFIGS` has
  no `ctaTextClass` for any game.)
- **`-label` / accent *text* colours are a different axis and were NOT changed** — text on the
  off-white page still uses each brand's darkened rung (`comb-label`, `cld-label`, `flw-step-label`,
  …). See § Menu Title Treatment.
- **Exceptions that stay off-scheme** (unchanged by this rule): Decision-Modal **cancel** / exit /
  back / "← Back to the Box" (neutral stone); **"How to Play"** (`bg-stone-700`, suite constant);
  **quit-confirm / restart-confirm** (may be `bg-red-*` per § Quit Overlay Checklist);
  **interrupt/alert splashes** (may be red per the fourth exception above); and **genuinely special
  in-game decision pairs** where one side carries semantic weight — BLD vote in/out,
  PASS play/pass, PKO Stampede/Retreat, trade Accept/Decline. A `*-go-leave` secondary next to a
  brand `*-go-new` primary is a normal neutral-secondary, not an exception.
- **Engine-shared screens** (`btn-who-first-*`, `screen-mp-*` CTAs) keep their stone static
  defaults — they are recoloured at runtime from each game's `brandBtnClass`.

A game may give its **secondary** in-game buttons its own material (CLD's `.cld-ice-btn`, SW v246); CTAs,
pills and Decision Modal buttons stay on the suite standard, and a secondary beside a primary still
matches its size (DD-31).

**Auditing rule — watch for JS-built buttons, not just static HTML.** A label set via `.textContent =`,
`createElement('button')`, or a helper's config object (`showWhoFirst({ confirmLabel })`,
`dsdShowPassGate({ ctaLabel })`) never appears in an `index.html`-only grep. And a button's label can be
assigned **more than once** in one file (initial render + a later open-the-modal call), so grepping for a
known bad string finds only the sites that still contain it. Audit both `index.html` **and** an exhaustive
`[Bb]tn.*textContent =` / `createElement('button')` pass over `js/games/*.js` — never an id-list-driven pass.

---

## Thumb-Friendly UI
**Trigger:** Any new button, link, or interactive element.

1. Minimum touch target: 44×44px (`min-h-11 min-w-11` in Tailwind). **Exemption: `.pill` (39 px,
   owner call 28 Sep 2026)** — settings pills and how-to tab bars are tapped once, not under a clock,
   and raising the shared class would re-space every settings overlay in 20 games for 5 px. A pill
   tapped **repeatedly or against a running timer** still takes `min-h-11` (NT's allocation brushes).
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

## Lobby layouts (SW v231)

> **Moved (4 Nov 2026) → `docs/rules/ui-lobby-layouts.md`** — read it when touching any lobby layout (Lounge, TV, Board, Classic), the Arcade room or the switcher.
> **Headline rule:** Every switcher renders from `LobbyRouter.LOBBY_LAYOUTS`; only `js/lobby/` may show a layout screen (logic-engine.md § Lobby Router Seam).

## Universal Menu Standard (All Games)
Every game's main menu screen must have exactly these 4 buttons, in this order: **Play CTA** → **How to Play** → **Settings** → **← Back to the Box**. Only the Play CTA label is game-voiced — the other three are identical across all games (see Rules below).

**Play CTA labels** (as shipped in `index.html`):

See **Table B** in `docs/rules/per-game-classes.md`.

**Type scale rule (DD-31):** same-screen buttons representing real, distinct choices match in
size and weight, no exceptions — a screen with a primary CTA and a secondary exit/back option is
still two real choices being offered, not one action and one non-action. ("← Back to the Box" is
not a smaller/quieter button than the Play CTA.)

| Button | Classes |
|--------|---------|
| Play CTA | `gel-btn min-h-14 w-full rounded-2xl [brand] text-xl font-semibold` |
| How to Play | `gel-btn min-h-14 w-full rounded-2xl bg-stone-700 hover:bg-stone-800 text-white text-xl font-semibold` |
| Settings | `gel-btn gel-btn-light min-h-14 w-full rounded-2xl [light brand tint] text-xl font-semibold` |
| ← Back to the Box | `gel-btn gel-btn-light min-h-14 w-full rounded-2xl bg-stone-200 hover:bg-stone-300 text-stone-500 text-xl font-semibold` |

**All four carry `gel-btn` — the moulded keycap treatment (SW v218), shared with the lobby
buttons. See § Gel Button Treatment below.** They do **not** carry `active:scale-95` /
`transition-all duration-150`: `.gel-btn:active` supplies its own `translateY(3px)` press, and
`.gel-btn` sets `transition: transform` only (no `transition-all`). Settings and ← Back to the Box
add `gel-btn-light` — same moulded bezel, softened gloss so their pale fills don't blow out.

The **size-and-weight parity** rule still holds. **This applies to any other same-screen button
pair** — a gameover screen's primary "Play Again" alongside its secondary "Leave", a Decision
Modal's confirm/cancel (already conforming — see § Quit Overlay Checklist), or any future pairing:
match size and weight, and pick colour per § Game Brand Colour — Scope (brand for the primary
action, neutral stone for a secondary one). The gel treatment is menu-only — do **not** put
`gel-btn` on gameover / Decision Modal buttons.

**Rules:**
- "← Back to the Box" is always identical — never game-themed.
- "How to Play" label is always identical — opens a data overlay (Pattern 1). Always `bg-stone-700 hover:bg-stone-800 text-white`.
- Settings button label is always **"Settings"** — no exceptions. Thematic name lives inside the overlay as the title block. Button uses a **light brand tint** (`bg-[brand-100] hover:bg-[brand-200] text-[brand-700]`) — see Game Brand Colour — Scope § Per-game brand reference for per-game classes.
- Play CTA is the primary action — largest button, top of the stack, full brand colour.

### Menu Title Treatment (every game, 8 Sep 2026)

> **Moved (4 Nov 2026) → `docs/rules/ui-menu-extras.md`** — read it when editing a game menu's title heading.
> **Headline rule:** Title is `text-5xl font-bold`, split into a neutral `text-stone-800` part and a brand-coloured part (usually the darkened `-label` colour, FRT excepted).

---

## Gel Button Treatment (`.gel-btn` / `.gel-btn-light`)

> **Moved (4 Nov 2026) → `docs/rules/ui-menu-extras.md`** — read it when editing the four game-menu buttons.
> **Headline rule:** `.gel-btn` (+ `.gel-btn-light` on pale fills) is for the menu shelf ONLY — never on gameover, Decision Modal or in-game buttons.

---

## Team Setup Screen Standard

> **Moved (4 Nov 2026) → `docs/rules/ui-screen-patterns.md`** — read it when building or editing a two-team game's setup / players screens.
> **Headline rule:** Screen 1 = team names (no size pills); Screen 2 = player names (size pills live here); defaults named in the hint; pre-fill only custom names.

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

---

## Vocab Lock Reuse Pattern

> **Moved (4 Nov 2026) → `docs/rules/ui-screen-patterns.md`** — read it when wiring a vocab lock or word-list button in a game.
> **Headline rule:** Check `window.activeExpansionData.vocab.has(normaliseWord(input))`; open the list with `smOpenVocabOverlay()` — no `secret-mode.js` change needed.

---
## Per-Game Reference

**Moved to `docs/rules/per-game-classes.md` (on-demand, 19 Aug 2026)** — Table A (brand colour,
range, toggle-ON, active pill), Table B (Play CTA, how-to emoji, Sylly Mode name) and Table C
(`accentBtnClass`, `accentTextClass`, step label, Settings tint) plus their ‡ § ¶ exception notes.
It was ~2.3k tokens of per-game lookup loaded on every turn, including turns touching no UI.

**Read it when** you need a specific game's exact class strings. Every `see § Per-Game Reference →
Table X` pointer in this file now means that file. For brand colour + active pill alone,
`CLAUDE.md` § Per-Game Quick Index has every game and is always loaded.

**Adding a game:** three rows there, plus the CSS/engine-map steps in § Sound Overlay above.

### Gameover podium rank icons

Any gameover podium that shows a rank icon (not every game does — plenty just show a number) uses
**🥇🥈🥉 in a fixed-width leading slot present on every row**, blank past 3rd place:

```html
<span class="cjar-medal-slot">🥇</span>  <!-- or 🥈 / 🥉 / '' for 4th+ -->
```

`width: 1.4rem; text-align: center; flex-shrink: 0` is the load-bearing part — a row with **no**
medal must still reserve the slot's width, or its text starts further left than a medalled row's
and the podium reads as misaligned. **Prospective, not retroactive:** new or touched-anyway games
follow this shape; the existing FRT/GTH/JEC/NAT/PASS/YGI podiums are not being swept.
