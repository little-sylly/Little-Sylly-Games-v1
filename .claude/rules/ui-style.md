# UI Style Rules — Little Sylly Games

## Global UI Protocol
Every screen must have:

1. **Speaker icon** (`.btn-open-sound`) — opens `#sound-overlay`. Two official positions:
   - **Full-screen menus:** `absolute top-4 right-4` within a `relative` screen container
   - **Gameplay flow screens:** header row — `flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0`, speaker + ✕ right-aligned in the same row
2. **Exit button** (✕) — logical destination (formalised):
   - Mid-game ✕ → quit confirm overlay → **game menu screen** (NOT lobby)
   - Post-game ✕ → `resetToLobby()` directly (game is over, no state to preserve)
   - "← Back to the Box" on game menu → `resetToLobby()` — the **only** path to lobby from within a game
3. **Active play exception:** `#btn-mute` stays as instant tap-to-mute (no overlay — timer running). Pixel-exact rule applies to `.btn-open-sound` only.

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

### Z-Index Stack
| z-index | Used for |
|---------|----------|
| z-[80] | Quit confirm, settings slide-up overlays |
| z-[90] | How-to, history, review overlays |
| z-[95] | gm-boost, gm-near-sync, gm-override, gm-new-frequency; ss-intel overlays |
| z-[100] | gm-neural-library, deck panels |
| z-[110] | `#sound-overlay` — global, always on top |

---

## Centered Content Layout (Default — Phone Screens)

**Trigger:** Any gameplay flow screen where content flows naturally without a required sticky footer.

This is the **default pattern** for new screens. Use it for: setup, observation, handover, tally, gameover, last stand, review screens — any screen where the button can sit below the content.

```html
<section id="screen-game-foo" style="display:none"
  class="flex items-center justify-center w-full min-h-screen px-5 py-8 overflow-y-auto">
  <div class="flex flex-col w-full max-w-sm gap-4">
    <!-- header row, cards, inputs, button — all flow naturally -->
  </div>
</section>
```

**Rules:**
- `flex items-center justify-center` on section — centers the content block when short; has no effect when content overflows
- `min-h-screen overflow-y-auto` on section — fills the viewport; scrolls when content is taller than screen
- `px-5 py-8` on section — outer breathing room; `px-5` safely handles narrow screens
- Inner `div.max-w-sm.w-full.gap-4` — constrains and spaces content; no separate header/body/footer wrappers needed
- **NOT for:** screens that need a footer button visible at all times regardless of content (e.g. LTTP chat flow) — use the sticky-footer pattern below instead

---

## Gameplay Screen Layout — Header / Body / Footer (Sticky Footer)

**Trigger:** Screens where the primary action button MUST remain visible at all times, independent of content height (e.g. a long scrollable list with a persistent "Submit" button).

Every gameplay screen must use `h-screen` (not `min-h-screen`) on the section so the flex container is viewport-capped and the scroll body actually constrains:

```html
<section id="screen-game-foo" style="display:none"
  class="flex flex-col w-full max-w-sm mx-auto h-screen overflow-hidden">

  <!-- HEADER — always visible, never shrinks -->
  <div class="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
    <!-- round label | speaker + ✕ -->
  </div>

  <!-- Optional fixed subheader (prompt text, section title, etc.) -->
  <div class="px-6 pt-2 pb-3 flex-shrink-0 text-center">...</div>

  <!-- BODY — scrolls when content overflows -->
  <div class="flex-1 overflow-y-auto flex flex-col min-h-0">
    <!-- cards, lists, etc. -->
  </div>

  <!-- FOOTER — always visible, sticks to bottom -->
  <div class="px-6 pb-8 pt-2 flex-shrink-0">
    <button class="min-h-14 w-full ...">Primary Action</button>
  </div>
</section>
```

**Rules:**
- `h-screen overflow-hidden` on the `<section>` — `h-screen` sets the cap; `overflow-hidden` tells the browser the container cannot grow past it
- `flex-shrink-0` on header and footer — they never compress
- `flex-1 overflow-y-auto min-h-0` on the body — `min-h-0` is the critical line; without it, flex items default to `min-height: auto` and the body still expands to fit its content instead of scrolling
- For centering short content inside the body: add `flex flex-col` on the body and `my-auto` on the inner content wrapper (collapses to 0 when overflowing — safe for both short and long content)
- `min-h-screen` is only correct for lobby/menu screens that don't need a sticky footer

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

**Outer scrollable body** between cards: `flex flex-col gap-5` — keep consistent across all games.

**Rules:**
- Setting name (`text-stone-800 font-semibold`): thematic name is fine here — this is where personality lives
- Description (`text-stone-400 text-sm`): plain English only — no thematic language; always full-width below, never next to the toggle
- Toggle buttons always get `shrink-0` to prevent flex squeeze
- Active pill colour is game-specific:

| Game | Active pill class |
|------|------------------|
| Like I'm Five | `pill-active-pink` |
| Great Minds | `pill-active-purple` |
| Secret Signals | `pill-active-teal` |
| Just Enough Cooks | `pill-active-amber` |
| You Get It? | `pill-active-orange` |
| Late to the Party | `pill-active-red` |
| Natural Selection | `pill-active-lime` |

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
| Game | Brand colour | `accentBtnClass` | `accentTextClass` | Toggle class | Settings button |
|------|-------------|-----------------|------------------|-------------|----------------|
| LI5 | pink-500 | `bg-pink-500 hover:bg-pink-600` | `text-pink-600` | `game-toggle-on-pink` | `bg-pink-100 hover:bg-pink-200 text-pink-700` |
| SS | teal-500 | `bg-teal-500 hover:bg-teal-600` | `text-teal-600` | `game-toggle-on-teal` | `bg-teal-100 hover:bg-teal-200 text-teal-700` |
| DSD | cyan-700 | `bg-cyan-700 hover:bg-cyan-800` | `text-cyan-700` | `game-toggle-on-cyan` | `bg-cyan-100 hover:bg-cyan-200 text-cyan-700` |
| GM | purple-500 | `bg-purple-500 hover:bg-purple-600` | `text-purple-600` | `game-toggle-on-purple` | `bg-purple-100 hover:bg-purple-200 text-purple-700` |
| JEC | amber-500 | `bg-amber-500 hover:bg-amber-600` | `text-amber-600` | `game-toggle-on-amber` | `bg-amber-100 hover:bg-amber-200 text-amber-700` |
| YGI | orange-500 | `bg-orange-500 hover:bg-orange-600` | `text-orange-600` | `game-toggle-on-orange` | `bg-orange-100 hover:bg-orange-200 text-orange-700` |
| LTTP | red-500 | `bg-red-500 hover:bg-red-600` | `text-red-600` | `game-toggle-on-red` | `bg-red-100 hover:bg-red-200 text-red-700` |
| NAT | lime-600 | `bg-lime-600 hover:bg-lime-700` | `text-lime-700` | `game-toggle-on-lime` | `bg-lime-100 hover:bg-lime-200 text-lime-700` |

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
Every game's main menu screen must have exactly these 4 buttons, in this order:

| Button         | LI5 (Like I'm Five)  | Great Minds          | Secret Signals       | Just Enough Cooks    | You Get It?          | Late to the Party    | Natural Selection    |
|----------------|----------------------|----------------------|----------------------|----------------------|----------------------|----------------------|----------------------|
| Play CTA       | Let's Play!          | Let's Play!          | Let's Play!          | Let's Cook!          | Show Your Take 🃏    | Find The Location!   | Begin Observation    |
| How to Play    | How to Play          | How to Play          | How to Play          | How to Play          | How to Play          | How to Play          | How to Play          |
| Settings       | Settings             | Settings             | Settings             | Settings             | Settings             | Settings             | Settings             |
| Back to lobby  | ← Back to the Box    | ← Back to the Box    | ← Back to the Box    | ← Back to the Box    | ← Back to the Box    | ← Back to the Box    | ← Back to the Box    |

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

---

## Vocab Lock Reuse Pattern
The vocab lock is game-agnostic and available to any future game:
- **Vocabulary check:** `window.activeExpansionData.vocab.has(normaliseWord(input))`  — covers primary words AND all `nono_list` terms
- **Open vocab overlay:** `smOpenVocabOverlay()` — opens the terminal-style `#gm-vocab-overlay`
- **"VIEW WORD LIST" button:** show `#gm-vocab-list-btn` reactively on vocab-lock failure; reset (hide) at the start of each turn's input setup
- Any future game can wire a "VIEW WORD LIST" button to `smOpenVocabOverlay()` with zero changes to `secret-mode.js`
