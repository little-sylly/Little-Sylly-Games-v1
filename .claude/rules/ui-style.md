# UI Style Rules — Little Sylly Games

## Global UI Protocol
Every screen must have:

1. **Speaker icon** (`.btn-open-sound`) — opens `#sound-overlay`. Absolute top-right on full screens; inline in header rows on setup/input screens.
2. **Exit button** (✕) — logical destination:
   - Pre-game screens → game's own menu screen
   - Mid-game screens → quit confirmation overlay
   - Post-game screens → `resetToLobby()`
3. **Active play exception:** `#btn-mute` stays as instant tap-to-mute (no overlay — timer running).

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
1. Game-specific options (timer, rounds, categories, word pools, etc.)
2. **✨ Sylly Mode** — always last; the "advanced rules" signature

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

| Button         | DSTW (Like I'm 5)    | Great Minds          | Sylly Signals        | Just Enough Cooks    |
|----------------|----------------------|----------------------|----------------------|----------------------|
| Play CTA       | Let's Play!          | Let's Play!          | Let's Play!          | Let's Cook!          |
| How to Play    | How to Play          | How to Play          | How to Play          | How to Play          |
| Settings       | Settings             | Settings             | Settings             | The Pantry Cabinet   |
| Back to lobby  | ← Back to the Box    | ← Back to the Box    | ← Back to the Box    | ← Back to the Box    |

**Rules:**
- "← Back to the Box" is always identical — never game-themed.
- "How to Play" label is always identical — opens a data overlay (Pattern 1).
- Settings label may be game-themed (see table); opens a data overlay (Pattern 1).
- Play CTA is the primary action — largest button, top of the stack.
