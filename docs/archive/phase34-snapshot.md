# Phase 34 Snapshot — Fruit Salad (FRT) shipped

**Date:** 2026-06-21
**Phase:** 34 — Fruit Salad (FRT) implementation + Protocol A closeout
**Status:** Complete — MDLM tested, all doc updates done, phase snapshot written

---

## What was built

**Game 14: Fruit Salad (FRT)** — Cockroach Poker-style bluffing. MDLM-only multiplayer, 2–8 players. Players pass a face-down fruit card and declare a fruit name; the receiver must call True or False, or peek and pass the card on. Accumulate 4 of the same fruit in your Bowl (Fruit Loop) to be eliminated. New game added as `js/games/frt.js`.

### Core mechanics
- 8 fruit types form the deck (`FRT_FRUITS[]`): Smug Banana 🍌, Sour Lemon 🍋, Charming Peach 🍑, Dramatic Grape 🍇, Chill Watermelon 🍉, Sus Pear 🍐, Panicked Strawberry 🍓, Angry Apple 🍎.
- Each player starts with 6 hidden cards (the Stash). Cards pass face-down with a declaration; the receiver calls True (I believe you) or False (you're bluffing), or peeks and passes on.
- Losing a challenge sends the card face-up into the loser's Bowl. 4 of the same fruit = Fruit Loop = elimination.
- **Fruit Tokens:** Pristine (0 bowl cards) +10, Survived (≥1 bowl) +5, Fruit Looped 0. Silver Lining +2 to the player(s) with the most correct True/False calls across the session.
- **Pear-Off duel:** auto-engaged at exactly 2 players — 5-card elimination threshold, no Peek & Pass, Sylly mutually exclusive.
- **Fruity Personalities (✨ Sylly Mode):** each fruit gains a rule-breaking ability. Category A (resolution-trigger): Banana (server keeps initiative on wrong call), Lemon (loser's challenger flips a stash card), Peach (Bowl landing triggers a peach cascade), Grape (most-hidden-grapes holder flips one). Category B (passive): Watermelon (public hidden-count display). Category C (interaction): Pear (peek-and-pocket + stash swap), Strawberry (25% auto-panic on serve), Apple (vendetta lock — loser must serve winner next, no peek).

### Render seam
`frtRenderCard(fruitId, opts)` — all card DOM goes through this function. Game logic and packets deal only in `fruitId` (0–7 stable ints). `FRT_FRUITS[id].emoji` is the v1 skin. A future image pack changes only this function's body.

### Banana-leaf palette (three-token custom colour system, owner-confirmed)
| Token | Hex | Where |
|-------|-----|-------|
| Banana fill | `#FFC700` | CTA backgrounds, pill active, toggle ON, slider, close button |
| White ink | `#ffffff` | Text on banana fill |
| Leaf accent | `#047857` | Text-on-white (how-to step labels, eyebrows) |

Custom CSS classes added: `pill-active-frt`, `game-toggle-on-frt`, `frt-range`. Inline `style` for primary CTAs (mirrors GTH sage pattern).

---

## Bugs resolved during Phase 34

**Mode-screen CTA black text (found in live test, June 2026)**
`MP_GAME_CONFIGS.frt.brandBtnClass` still carried the old dark-ink value from the initial palette. Fixed: updated to `bg-[#FFC700] hover:bg-[#E6B400] text-white`. Lesson: `brandBtnClass` must be updated in lockstep with in-game button colours.

**Post-lobby returned to game menu instead of into play (found in live test, June 2026)**
`onPassThePhone` (host) called `showScreen('screen-frt-menu')` instead of `frtStartSession()`. Fixed: `onPassThePhone` now calls `frtStartSession()` directly. Lesson: for MDLM games where settings are configured on the menu before the lobby, `onPassThePhone` should go directly into the session.

**Disconnection — non-host players dropping mid-game (found in live test, June 2026)**
Root cause unconfirmed (uncaught JS exception in Firebase callback suspected). Defensive fix: `frtHandleEnvelope` wrapped in a top-level try-catch so crashes are logged (`console.error('[FRT]')`) rather than silently detaching the listener. Open until a crash log is captured in a live session.

**Peek-then-call bug — True/False active after peeking (found in MDLM test, June 2026)**
After tapping "Peek & Pass", both the "Pass it on →" button and the True/False buttons rendered simultaneously. Root cause: True/False were unconditionally appended before the peek conditional block. Fixed: restructured `frtRenderAwait()` into a single `if (frtPeeked && canPeek) … else …` gate. Edge-case handled: if peek is impossible after peeking (all targets handled), falls back to True/False.

**Centering — `flex-1 justify-center` does not work inside `overflow-y-auto` containers (found in MDLM test, June 2026)**
Await/reveal/round-end state wrappers used `flex-1 justify-center` inside `frt-table-body` (`overflow-y-auto flex flex-col min-h-0`). Content pinned to top. Fixed: replaced with `my-auto py-4` on each content wrapper; `frtRenderSpectator()` given a centering wrapper div. Confirms the YGI lesson: use `my-auto` on content blocks inside overflow containers, never `flex-1 justify-center`.

---

## Technical notes

**Host-authoritative sequential (no readyCheck matrix)**
Only one actor is active at a time (server → receiver). Host owns all transitions. Non-active devices render a spectator standby sub-state inside `screen-frt-table`. No simultaneous-submit matrix required.

**Firebase empty-array guard (`frtNorm2D`)**
Bowls are all-empty at deal; Firebase strips empty arrays. `frtNorm2D(raw, n)` rebuilds length-n 2D arrays with `[]` for missing entries. `FRT_DEAL` skips bowls entirely (reconstructed empty client-side). Same trap as GTH/PASS.

**Single-pass Sylly resolver**
`frtSyllyResolve` dispatches on `fruit.cat`; isolated functions per Category-A ability. The invariant: one primary flip fires once → forced secondary flips push to bowls but fire nothing → one `frtComputeEliminated()` call after. Cascades structurally impossible.

**Wall-clock turn timer (GTH pattern)**
Host computes `endTimestamp` at each timed-phase entry; value rides in every SYNC packet (`FRT_DEAL`/`FRT_SERVED`/`FRT_CONTINUE`). All devices call `frtStartTurnTimer(endTimestamp)` — no drift. Host-only on expiry.

**Carry cross-phase flags in the crossing packet**
Apple vendetta lock (`frtAppleLockTarget`) set at resolve but consumed at the next serve. Carried in `FRT_CONTINUE.appleLock` so the client next-server gets it correctly.

**Mid-game quit dissolves the room (PASS/NT contract)**
Host quit: `resetToLobby()` sends `HOST_END_GAME`, tears down Firebase room. Client quit: sends `FRT_PLAYER_LEFT` → host broadcasts `FRT_MATCH_DISSOLVED` → all `resetToLobby()`. One client leaving dissolves the entire match.

---

## Documentation updated

- `docs/implementation-notes/frt-implementation-notes.md` — all bugs + design decisions logged
- `docs/code-map.md` — FRT section added (screens, overlays, state variables, key functions, packet types)
- `.claude/rules/game-identities.md` — Game 14 FRT full entry added
- `CLAUDE.md` — Current Focus updated, Gold Master count updated, FRT key refs added, project structure map updated
- `.claude/rules/logic-engine.md` — SW version updated v104 → v105; `frt.js` added to precache list
- `.claude/rules/definitions.md` — Active plugin prefixes updated 12 → 14 games (added `nt`, `frt`)
- `docs/content-prompts/new-game-brief-prompt.md` — FRT added to roster table, taken abbreviations, Sylly Mode name list

---

## Gold Master at end of Phase 34

**14 games complete:** Like I'm Five (LI5), Great Minds (GM), Secret Signals (SS), Just Enough Cooks (JEC), You Get It? (YGI), Late to the Party (LTTP), Natural Selection (NAT), Deep-Sea Deploy (DSD), Bailed (BLD), Group Therapy (GTH), Dicey Bluffs (DYB), Pass (PASS), Net-Trace (NT), Fruit Salad (FRT).

**SW version:** v105
