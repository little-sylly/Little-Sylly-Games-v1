# Pass (PASS) — Implementation Notes

## Design Decisions

**Seat order = join order (no shuffle)**
Pass has no hidden roles — all players see the same information about rank structure. Join order is therefore fair and predictable without a shuffle. Deviation from DYB/BLD random seat allocation, which was necessary there because those games have secret role assignments. Logged in tech spec §17.

**Abyss as inline strip, not overlay**
The Sylly Mode Abyss pool is rendered as a horizontal-scroll strip on `screen-pass-table`, not as a slide-up overlay or decision modal. Lesson from DYB BUG-05: overlays that fire mid-gameplay create ghost interceptors — taps intended for game controls hit the overlay backdrop instead. Inline keeps the Abyss visible without interrupting gameplay.

**`window.Cards` module (`js/lib/cards.js`)**
Introduced as the first suite-wide card rendering library, following the `canvas-draw.js → window.CanvasDraw` precedent. Public API: `Cards.buildEl(cardData)` / `Cards.buildBackEl(deckIdx)`. The data model `{ rank, suit, deckIdx }` is rendering-agnostic — any future swap from SVG to image assets changes only the internals of `Cards.buildEl()`, not any calling code.

**Joker `suit` field = `''` not `null`**
Firebase Realtime Database strips `null` fields from objects on write. A Joker stored as `{ rank: 'Joker', suit: null }` arrives at clients as `{ rank: 'Joker' }`, breaking `suit` checks. Stored as `''` (empty string) throughout. This is the same null-stripping constraint documented for GTH delta encoding.

**`PASS_ABYSS_DRAFT` unified packet**
A single SYNC packet covers all three Abyss draft triggers (detonation, round-win, fracture) via a `trigger` field. Originally three separate packet types were specced — collapsed to avoid redundant handler branching. Trigger values: `'detonation'` | `'round-win'` | `'fracture'`.

**Round-end trigger: `hand.length === 0` only**
A full-circuit pass (everyone passes) clears the table but does NOT end the round — it's a table-clear only. The round ends solely when a player's hand reaches length 0. This distinction is critical: the early spec draft incorrectly described full-circle-pass as a potential round-end trigger.

---

## Bug Index

*(No bugs logged yet — Phase 32 implementation.)*

---

## Multiplayer Lessons

**`mpPlayerSlots[i].nickname` not `.name`**
The correct field name for player display names in the lobby roster is `.nickname` — `.name` does not exist and returns `undefined` silently. Reference: `engine-multiplayer.js` line 601 where slots are built. Same lesson as BLD Bug 8 (wrong `window.` prefix) — always grep the engine file to confirm field names before writing name-array code.

**Host-only seating screen**
`passShowSeating()` is called only on the host path in `onPassThePhone`. Clients skip directly to waiting for `PASS_GAME_START` SYNC. Standard MDLM pattern (DYB/GTH reference), but worth restating: any pre-game screen showing roster state is always host-only; clients should never render it independently.

---

## Template Gaps

**Card CSS scoping**
Card CSS classes (`.pass-card`, `.pass-hand-card`, `.pass-card-selected`, etc.) are Pass-specific despite living in `cards.js`. If a second card game is added, these styles will need to be reviewed for cross-game compatibility — the `pass-` prefix is intentional but future games may need their own visual variants (different card sizes, colours). Recommend keeping `pass-card` as the base class and adding game-specific modifier classes for future variants.

**No difficulty setting for card games**
The `logic-engine.md` checklist item "include a difficulty setting" assumes word bank games. Card games using a standard deck have no equivalent difficulty tier. The template should note this exception for non-word-bank games. Currently waived for Pass — no word bank used.
