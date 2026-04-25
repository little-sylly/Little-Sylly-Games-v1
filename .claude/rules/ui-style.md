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

**Scroll reset on open:** call `el.querySelector('.overflow-y-auto').scrollTop = 0` (or `.overlay-data-inner` for whole-panel-scroll overlays) before `style.display = 'flex'` so the thematic title is always the first thing seen.

**How-to overlays** follow the same structure: thematic title block at top, `scrollTop = 0` on open.

All multi-choice settings use the **Pill Button** style:
- Inactive: `.pill` | Active: `.pill-active-purple`
- Group targeting via `data-group` or `data-*` attributes
- No sliders for discrete choices

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

| Button         | LI5 (Like I'm Five)  | Great Minds          | Secret Signals       | Just Enough Cooks    |
|----------------|----------------------|----------------------|----------------------|----------------------|
| Play CTA       | Let's Play!          | Let's Play!          | Let's Play!          | Let's Cook!          |
| How to Play    | How to Play          | How to Play          | How to Play          | How to Play          |
| Settings       | Settings             | Settings             | Settings             | Settings             |
| Back to lobby  | ← Back to the Box    | ← Back to the Box    | ← Back to the Box    | ← Back to the Box    |

**Rules:**
- "← Back to the Box" is always identical — never game-themed.
- "How to Play" label is always identical — opens a data overlay (Pattern 1).
- Settings button label is always **"Settings"** — no exceptions. Thematic name lives inside the overlay as the title block.
- Play CTA is the primary action — largest button, top of the stack.

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
