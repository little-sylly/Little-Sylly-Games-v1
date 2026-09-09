# Phase Snapshot — Phase 41: Honeycomb Hills (COMB) (10 Sep 2026, SW v225)

**Game 20.** `activeGameId: comb` · `js/games/comb.js` · brand honey gold `#F0A500`, dark ink.
MDLM-only, 3–4 players. Spec: `docs/new-game-tech-honeycomb-hills.md` (CONFIRMED 6 Sep 2026).
Identity doc: `docs/game-identities/comb.md`. Impl notes:
`docs/implementation-notes/comb-implementation-notes.md`.

**This snapshot closes the gate, it does not discover it.** Protocol A was run first; what it found
is in § Protocol A below.

---

## Confluence Snapshot

**Decision.** Honeycomb Hills ships. `js/games/comb.js` joins `PRECACHE_URLS` and `CACHE_NAME` goes
to `sylly-games-v225` — the single code change of this phase gate, and the line the whole build was
deliberately held short of. Alongside it: COMB's identity document is written (the last of 20), the
suite's first **no-Sylly-Mode** game is promoted from a per-game decision into a named form in
`ui-style.md`, and `definitions.md`'s plugin-prefix list — the naming-collision check's own source —
is brought from 15 entries to 20.

**Rationale.** Three SW versions shipped COMB's *art* (v223) and its *animation* (v224) while the
plugin itself stayed out of the cache, so an offline install had nine core art packs and no game.
That was the intended arrangement: art landing early is harmless, a half-built plugin sitting in a
returning device's cache is not. Because the omission was written down in `sw.js`'s own comment, in
`code-map.md` and in `CLAUDE.md` § Current Focus, nobody had to remember it, and the closing change
was one array entry — **every other finding at this gate was documentation drift**, which is the
right ratio for a game that had been harness-green for days.

**Technical Impact.** One line in `sw.js` plus a version string. Four stale future-tense comments
corrected in `comb.js` (no behaviour change — all four harnesses re-run green after). New
`docs/game-identities/comb.md` (194 machine-checked copy strings, green on first run). Rule-file
amendments in `ui-style.md` and `definitions.md`. Doc updates in `code-map.md`,
`new-game-brief-prompt.md`, `sw-changelog.md`, `CLAUDE.md`, `decision-log.md`, and this snapshot.

---

## What Honeycomb Hills is

A hex-and-resource engine-builder on a 19-hex meadow. One 2d6 **Scout Flight** at the head of every
turn pays **every player at once**, so nobody is ever idle; you spend the yield on Comb Walls, Drone
Cells and Queen Domes, and negotiate the rest through the **Waggle Dance**. First to 7 Hive Points
(Short Summer) or 10 (Full Season), checked **only on your own turn**.

It is the largest game in the suite by every measure that matters — 4,900 lines of plugin, five
render seams, nine core art packs, seven settings, 25 Instinct cards, and 25–50 minutes a match —
and structurally the strangest: **four screens and fifteen overlays**, because the board never goes
away and everything else is a layer over it.

---

## Protocol A — what the gate found

**All four checks run. Nothing blocking; six drift items, all fixed in this pass.**

### 1. Drift Check — code vs docs

| Check | Result |
|---|---|
| Screen IDs vs identity doc T7a | ✅ 4 screens, all present and registered |
| Settings table vs the plugin's `let comb*` variables | ✅ all seven match label, options and default |
| Scoring values vs the resolve/score functions | ✅ target 7/10, carry limit ∞/7/9, Daylight 0/90s/60s, both achievements 2 pts at minimums 5 and 3 |
| State variables in `code-map.md` | ✅ complete, including the private/public split |
| `allScreens[]` current | ✅ all four registered in `engine.js` |
| **SW precache current** | ❌ → ✅ **the gate's own job.** `comb.js` added, `CACHE_NAME` v224→v225 |
| Implementation notes current | ✅ exists; DD-26, DD-27 and TG-14 added by this pass |

**Drift fixed:**

1. **`comb.js`'s file header described a different program.** It still opened *"This file currently
   holds the SCAFFOLD ONLY … There is deliberately NO game logic, NO DOM writing, NO canvas and NO
   multiplayer in it yet"* — above 4,900 lines of exactly those things. Rewritten.
2. **Three more future-tense build comments** claimed unbuilt work (*"Chunk 4 adds the RECEIVE
   half"*, *"Each will grow a render call in Step 5"*, *"Step 4 adds the exit paths"*). Rewritten.
   Historical section markers (`// ── The action layer (Step 5, chunk 5) ──`) were left alone —
   they say when something arrived, which is still true. Generalised as **TG-14**.
3. **`code-map.md` carried two wrong harness counts** — rules 116 (actual 122) and loop 223 (actual
   231, raised by v224's beat-budget checks). Fixed.
4. **`code-map.md`'s COMB header still read "IN BUILD"** and repeated the now-obsolete "comb.js is
   not yet in `PRECACHE_URLS` — the game does not ship until it is". Rewritten as SHIPPED (v225).
5. **`definitions.md`'s plugin-prefix list was five games behind** — 15 entries, stopping at `shp`,
   missing `flw`, `pko`, `cjar`, `cld` and `comb`. This is the list the Naming Collision Check reads,
   so a stale one is how a collision ships. Brought to 20, with a note that it must be extended in
   the same pass that registers a plugin.
6. **`ui-style.md` stated "Sylly Mode card: present for every game"** as an absolute, which COMB
   contradicts. Rewritten as the **no-Sylly-Mode form** (below).

### 2. Technical Debt Harvest

| Check | Result |
|---|---|
| No naked `setTimeout` | ✅ two only — the Scout Flight's blind-spin window and Full Dance's 10 s offer expiry — both with a why-comment above them |
| Timers cleared on every exit | ✅ quit-confirm clears Daylight, the flight and the offer explicitly; `resetToLobby()` calls `combResetState()`; `combStopFlight()` clears both halves of the beat, which reaches the RAF at all three § Timer Lifecycle sites |
| No hardcoded shadows | ✅ costs, limits, achievement points and both minimums are named constants; `COMB_ACHIEVEMENT` is keyed by Season |
| No surviving `TODO` / `FIXME` | ✅ zero |
| No engine duplication | ✅ reuses `Physics.rng`, `bindCardHold`, `refHighlightRow`, `assetFace`/`assetBack`/`assetExtra`, `mpNotifyPlayerLeft`, `mpSendPrivate` |
| No `window.` prefix on `let`-declared MP globals | ✅ zero hits |
| Team games use `showWhoFirst()` | n/a — no teams |
| Pass-gates on role/team transitions | n/a — MDLM, every player on their own device, nothing revealed by a handover |
| Play-again uses a confirmation modal | ✅ opens `comb-new-season-overlay` with the dynamic host/client/single label |
| Brand colour applied consistently | ✅ `comb-cta` on CTAs, `pill-active-comb`, `game-toggle-on-comb`, light-tint Settings button, neutral ✕ and ← |

**MDLM-specific:**

| Check | Result |
|---|---|
| Host-only interactions have an explicit client early-return | ✅ eight `syllyMultiplayerMode === 'client'` guards; the client path in `combAttemptPlace` / `combAttemptAction` sends and returns without mutating |
| Secondary-phase missing-handler audit | ✅ **mechanical** — `COMB_ACTION_ROUTES` + `COMB_ACTION_PENDING` cover every spec §11 ACTION between them, and the loopback asserts the partition. `COMB_ACTION_PENDING` is empty and stays in the file |
| SYNC handlers render, never re-resolve | ✅ appliers apply the payload; the log is appended from `COMB_LOG_APPEND` only |
| Mid-game overlays torn down in both reset paths | ✅ all fifteen listed in `resetToLobby()`; quit-confirm routes to `resetToLobby()` per the Mid-Game Quit Contract via `mpNotifyPlayerLeft()` |

### 3. Linguistic Integrity Sweep

- Terminology (T5) reflected in user-facing strings — ✅, and the T7b half is now harness-guarded.
- No legacy generic strings — ✅ the game says *Hive Points*, *Season*, *bloom*, *Scout Flight*; never
  "Game Over", "Points", "Score" or a bare "Round".
- Quit overlay copy thematic — ✅ 🐝 / *"Abandon the hive?"* / *"The comb comes apart and the season
  ends — for everyone at the table."* / *"Yeah, buzz off."* / *"Not yet!"*
- Settings title block matches T5 — ✅ *Honeycomb Hills 🐝* / *"How long the summer runs, and how mean
  the meadow gets."*
- Australian English, metric — ✅ (*colour*, *organise*; minutes and seconds only).

### 4. Mobile-First Layout Audit

| Check | Result |
|---|---|
| The Stack, by eye | ✅ menu, standby and gameover are the Stack |
| One column, no split | ✅ |
| No legacy sticky-footer in new games | ⚠️ **one, whitelisted and justified** — `screen-comb-meadow`. The board is permanently fit-to-view, the hand row and action bar must not move while it is read and tapped, and no page-scroll may carry a legal target off screen. On the `ui-style.md` whitelist, and named in the spec and the `index.html` header comment |
| No `my-auto` | ✅ zero |
| Z-index stack respected | ✅ settings/quit z-80, how-to/decision modals z-90, overflow/trade/instinct z-85, **map z-75 deliberately lowest** so pushed overlays land on top |
| No `.focus()` on load | ✅ zero |
| Touch targets ≥ 44 px | ✅ `min-h-11`/`min-h-14` throughout; the board's sub-44 px node spacing is handled by the **placement bar** (snap-then-confirm) rather than by tapping a small target |
| Speaker + ✕ on every screen | ✅ including standby, which is correctly **not** treated as an interstitial (it does not auto-advance and the player may leave) |
| `[?]` on the main gameplay screen | ✅ `btn-comb-how-to`, always visible, plus an inline `[?]` on the hand row deep-linking to The Comb tab |
| Decision-modal borders | ✅ all eleven `overlay-modal-inner` carry `border border-[#F5C55C]` |

---

## New-game checklist — closure sweep

All items pass. The ones worth recording:

- **Sound button re-wiring** — COMB's HTML sits at `index.html:10383`, well after the `<script>`
  block, so `engine.js`'s parse-time `querySelectorAll` never reaches it. The plugin re-wires all
  four screens' `.btn-open-sound` in its own `DOMContentLoaded`. ✅
- **`GAME_BRAND_HEX`** carries `'btn-comb': '#F0A500'`, so the lobby's Colour sort places it. ✅
- **Menu heading split** — `Honeycomb` neutral / `Hills` in `comb-label` (`#B87A00`, the darkened
  partner; the raw `#F0A500` measures ≈2.0:1 on `bg-stone-50` and fails small-text contrast). ✅
- **Gel treatment** on all four menu buttons, `gel-btn-light` on Settings and ← Back to the Box. ✅
- **Difficulty setting** — takes the documented non-word-bank exemption (PASS, DYB, GTH, CLD). **The
  Season** is the velocity dial and sits first. ✅
- **Render seams** — five (`combRenderHex`, `combRenderResource`, `combRenderInstinct`,
  `combRenderPiece`, `combRenderDie`), all backed by core art packs, all consumed by the How-to
  galleries so those double as the offline install check. ✅
- **Rules-engine harness** — five tools, not one. ✅
- **Closure: `new-game-brief-prompt.md` synced** — `comb` added to the games table and the taken
  abbreviations, and the Sylly Mode reference line **qualified** rather than extended, so a future
  brief no longer reads it as "every game has one". ✅

---

## The no-Sylly-Mode form (new rule)

COMB is the first game in the suite to ship without a Sylly Mode. Promoted at this gate from a
per-game decision into `ui-style.md` § How-to Overlay Standard:

- The **How to Play card stays** in its usual last slot, headed *"Not this one"*, pointing at the
  setting that does the job.
- The **settings overlay carries no Sylly Mode card at all** — never a toggle that does nothing.
- Earned by having seven rule-bearing settings that already own the difficulty axis; explicitly
  worded as an exception, not an option.

The reasoning is in `comb-implementation-notes` DD-27: a dead toggle reads as a setting the player
failed to unlock (dimming already means *unavailable* on that screen), and a deleted card reads as a
missing card. An absent feature and a broken feature look identical from outside.

---

## Files touched (this phase gate)

| File | Change |
|---|---|
| `sw.js` | `js/games/comb.js` → `PRECACHE_URLS`; `CACHE_NAME` v224→v225; the stale "not yet in this list" comment rewritten |
| `js/games/comb.js` | Four stale future-tense build comments rewritten. **No behaviour change** |
| `docs/game-identities/comb.md` | **New** — the twentieth and last identity doc |
| `.claude/rules/ui-style.md` | The no-Sylly-Mode form; the settings-order line qualified |
| `.claude/rules/definitions.md` | Plugin-prefix list 15→20, with a note on why it must not drift |
| `docs/code-map.md` | COMB header IN BUILD→SHIPPED; identity-doc pointer; two harness counts corrected |
| `docs/content-prompts/new-game-brief-prompt.md` | Games table, taken abbreviations, Sylly Mode line qualified |
| `docs/implementation-notes/comb-implementation-notes.md` | DD-26, DD-27, TG-14 |
| `docs/sw-changelog.md` | v224 entry moved in verbatim |
| `CLAUDE.md` | Current Focus → v225; quick index row; "20 games shipped"; core-art rollout list |
| `docs/decision-log.md` | One entry |
| `docs/phase41-snapshot.md` | This file |

---

## Deferred / not done

Deliberate, none blocking. Full list: `docs/deferred-work.md`.

- **MDLM client reconnect (Q20)** — high priority, suite-wide, not COMB-specific.
- **NT and CLD's RAF loops still ignore `prefers-reduced-motion`.** COMB's does honour it
  (`combReducedMotion()`), and TG-13 raised the general gap; the sweep of the two older loops is
  parked.
- **COMB's Short Summer balance caveat ships untuned by decision.** At a 7-point target the two
  achievements are 4 of 7 (57%, against Catan's 40%), so a win on three Drone Cells plus both
  achievements is reachable. Both fallbacks are one-line edits — `COMB_ACHIEVEMENT` holds the points
  and both minimums keyed by Season. Watch it in real play.
- **T7c's four thin spots** — no turn-handover beat, a short gameover for a 50-minute match, the
  Season Log reachable from one small 📜 and never surfaced at gameover, and an empty standby roster.
- **No `data/music/comb.mp3`.** COMB inherits the lobby fallback; a 25–50 minute match earns a track
  more than most, and adding one needs no code change and no version bump.
- **No skin pack.** Core art is the default tier; a skin would sit above it with no code change.
- **No real multi-device session yet.** Everything below is harness and headless-browser evidence.
  Three or four real phones remain the only thing that can judge clock skew, Firebase ordering,
  dropped packets, and how a 50-minute season actually *feels*.

---

## Verification

Re-run at the gate, after the comment edits, on the shipped files:

| Command | Result |
|---|---|
| `node tools/verify-comb-board.js` | ✅ 56 |
| `node tools/verify-comb-rules.js` | ✅ 122 |
| `node tools/verify-comb-loop.js` | ✅ 231 |
| `node tools/verify-comb-loopback.js` | ✅ 250 — host↔2 clients over a Firebase-shaped wire, real mock DOM |
| `node tools/mutate-comb.js` × 5 | ✅ 71/71 every run (ML-04: run it 3–5 times, not once) |
| `node tools/verify-mp-configs.js` | ✅ 20 games — schema, bounds, bound purity, balanced teams, quit contract |
| `node tools/verify-identity-docs.js` | ✅ all 20 docs; **comb.md 194 strings, green first run** |

**What none of this reaches.** No harness in this project does layout — that is `visual-check`'s
tier, and it is what caught COMB's BUG-03 and BUG-05 during the build. And nothing here is a
substitute for a real multi-device session.

---
