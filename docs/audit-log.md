# Protocol A Audit Log — Little Sylly Games

Living document. Update after every completed Protocol A run.

---

## Audit Status

| Game | Abbr | Status | Date | Flags Found | Flags Fixed |
|------|------|--------|------|-------------|-------------|
| Like I'm Five | LI5 | ⏳ Pending | — | — | — |
| Great Minds | GM | ⏳ Pending | — | — | — |
| Secret Signals | SS | ⏳ Pending | — | — | — |
| Just Enough Cooks | JEC | ⏳ Pending | — | — | — |
| You Get It? | YGI | ⏳ Pending | — | — | — |
| Late to the Party | LTTP | ⏳ Pending | — | — | — |
| Natural Selection | NAT | ✅ Clean | 2026-05-11 | 3 | 3 |

---

## Completed Audits

### Natural Selection (NAT) — 2026-05-11

**Files read:** `js/games/nat.js`, `index.html` (NAT section, lines ~3547–4052), `js/engine.js`, `sw.js`, `game-identities.md`

**Flags:**

1. **`index.html` section comment** — `screen-nat-daily-review` missing from the header comment block listing all NAT screens. Cosmetic only — the screen was correctly implemented and registered.
   - Fix: Added `screen-nat-daily-review` to the comment between `screen-nat-observation` and `screen-nat-selection`.

2. **`nat.js` line ~781 — hardcoded escape points + stale `r.stole` reference** — The gameover round-log template used the literal `+20` for Mole escape points and branched on `r.stole` (a property from the original spec that was never stored in `natRoundLog`). The `r.stole` branch was always falsy — dead code. The `+20` was wrong for players using the 10pt or 15pt Escape Points setting.
   - Fix: Changed to `` `+${natEscapePoints}` `` and removed the dead `r.stole` ternary branch.

3. **`game-identities.md` — "The Eviction" vs "The Selection"** — The Terminology table and one cross-reference note used "The Eviction" (original spec name). All code, button copy, and function names use "The Selection".
   - Fix: Updated both occurrences in `game-identities.md`.

**Passed clean:** All screen IDs, settings defaults, state vars, `allScreens[]`, SW precache, event listener scope, setTimeout usage, engine duplication, quit overlay copy, z-index stack, layout patterns, touch targets.

---

## Process Notes

Tips accumulated from real audit runs. Add to this section after each completed audit.

---

### Drift Check

- **Fastest screen ID enumeration:** `grep 'showScreen(' js/games/[abbr].js` — lists every transition call. Cross-check the IDs against `game-identities.md` State Flow and `allScreens[]` in `engine.js`. This is quicker than reading the whole file.
- **`allScreens[]` is in `engine.js`** — look for the array declaration near the top of the file.
- **SW precache:** `sw.js` — `CACHE_NAME` version and the `urlsToCache` array. `logic-engine.md` has the canonical list — compare both.

### Debt Harvest

- **Most likely location for hardcoded shadows:** The scoring/resolve function (e.g., `natResolveRound`, `jecComputeScores`). Any literal point number inside score calculations should reference a setting variable instead.
- **setTimeout:** Grep `setTimeout` — if there are 0 results, the check passes immediately. If any exist, verify each has an inline comment explaining *why* a delay is necessary.
- **Global-scope listeners:** All `addEventListener` calls for a game plugin should be inside a `DOMContentLoaded` callback or a named init function. If the file wraps everything in one `document.addEventListener('DOMContentLoaded', ...)` block, all listeners inside are scoped correctly.

### Linguistic Sweep

- **Most likely location for stale spec text:** The gameover screen's round-log/history template. These are often written early against the original spec and not updated when point values become configurable. Check every literal number in a UI string.
- **Generic string grep targets:** `"Game Over"`, `"Round"`, `"Score"`, `"Points"`, `"Vote"`, `"Level"`, `"Player"` (bare, lowercase). Search the JS file and the game's HTML section in `index.html`.
- **Quit overlay:** Read the `[abbr]-quit-overlay` block in `index.html` — check emoji, heading, subtext, confirm button, cancel button against `game-identities.md` Quit Overlay entry.
- **Settings overlay title:** First child of `overlay-data-inner` should be the thematic title block — compare against the Settings overlay title row in the Terminology table.

### Layout Audit

- **Where docs drift hides first:** `index.html` section header comments (the `<!-- ════ GAME NAME ════ -->` blocks listing screen IDs). These go stale whenever a screen is added late in development.
- **Where docs drift hides second:** `game-identities.md` Terminology table — especially mechanics that were renamed during build (e.g., "The Eviction" → "The Selection"). The JS source and `allScreens[]` are almost always correct; work backwards from code to docs.
- **`min-h-0` check:** Only relevant for `h-screen overflow-hidden` layouts (sticky-footer pattern). If a game's gameplay screens use the default `min-h-screen overflow-y-auto` pattern, this item is N/A for most screens.
- **Z-index:** Quit overlays `z-[80]`, how-to overlays `z-[90]`, sound overlay `z-[110]`. Can be confirmed by reading the `class=` attribute of each overlay backdrop div in `index.html`.
