# Phase Snapshot — Phase 40: Cold Shoulder (CLD) (4 Sep 2026, SW v219; follow-ons: v220 TG-13, v221 "The Floe" how-to tab)

**Type:** New game (game 19) — the suite's first physics game, built in six staged passes
(sim → rules → balance → UI → multiplayer → documentation).
**Follows:** Phase 39 (Cookie Jar — game 18, gold master).
**Gold Master:** 19 games + multiplayer. **The phase gate is OPEN** — every headless harness and the
two-client loopback pass, but the two closing checks (a live multi-device session; the offline boot
with the SW unregistered) have not been run. Everything below the "Verification" line is what a
`fresh session` needs to close it.

---

## Confluence Snapshot

**Decision.** Cold Shoulder ships as game 19 — a physics slingshot-shove game, MDLM-only, 3–8
players (Peck Off forces 2), host-authoritative — built on a **new game-agnostic
`js/lib/physics.js`**: one pure, total `Physics.simulate()` with no DOM, no canvas, no `window`, no
`Date.now()`, no bare `Math.random()`, verified under Node before a single pixel existed. Resolution
is **host-authoritative timeline playback** — the host runs the one true sim and broadcasts sampled
keyframes plus a discrete event list; clients replay and never simulate; the host replays its own
broadcast samples too, so every device sees pixel-identical playback. Committed aims travel to the
host over the **private channel** (`mpSendPrivate`) — the first time that packet direction has been
client → host. The penguin is drawn **entirely in procedural canvas code**, in play and in chrome —
no art files at all. Sylly Mode is **The Thaw** (the floe shrinks a step per Slide).

**Rationale.** Four constraints drove nearly every choice. The sim had to be pure and testable,
because a physics bug found through a canvas is found the expensive way. The aims had to be private
at the *network* level, because a game whose entire tension is blind commit is silently broken by a
rival reading Firebase. The resolution had to be replayed rather than re-simulated, because lockstep
desync shows players different outcomes with no way to detect it. And the art had to earn its bytes
at the size it is actually seen — at ~24 px a painted sprite's detail does not survive, so a
zero-byte procedural draw was *proven* (a working proof rendered and compared against the brief's
own mockup at true scale, owner review 2 Sep 2026) to look as good in-engine, and the brief's
planned nine-file, ~360 KB core art pack was dropped.

**Technical impact.** New: `js/lib/physics.js`, `js/games/cld.js`, 6 screens, 4 overlays, 4 CSS
classes (`cld-cta` / `pill-active-cld` / `game-toggle-on-cld` / `cld-range`), `playSplash()`,
`tools/verify-cld-physics.js` (122), `tools/verify-cld-loop.js` (163),
`tools/verify-cld-loopback.js` (168), `tools/mutate-cld.js` (26/26), `tools/simulate-cld-balance.js`
(instrument). Modified: `engine.js` (`allScreens`, `resetToLobby`, two theme maps,
`LOBBY_COLOUR_ORDER`, `playSplash`), `engine-multiplayer.js` (`MP_GAME_CONFIGS.cld`,
`mpSerialiseSettings`), `index.html`, `css/styles.css`, `sw.js`
(`js/lib/physics.js` + `js/games/cld.js` precached, `CACHE_NAME` v218 → v219),
`tools/verify-mp-configs.js` (`ALLOWED_SETTINGS.cldPeckOff`). No new data file, no new external
dependency, no build step.

---

## Deviations from the Phase 1 brief

Full table in `docs/new-game-tech-cold-shoulder.md` §17. The load-bearing ones:

1. **Procedural canvas art, everywhere — no PNG core art pack** (brief planned nine greyscale
   masters tinted per player). Decided at spec review after a true-scale proof. §17 deviation 8.
2. **`screen-cld-floe` keeps the legacy `h-screen` sticky-footer** (checklist item 35 says new
   screens use the Stack) — brief-sanctioned, same reason as `screen-gth-canvas`: the stage must not
   scroll during a drag. Whitelist row added to `ui-style.md`. §17 deviation 4.
3. **The canvas render seam draws to a context and returns nothing** — `cldRenderPenguin(ctx, state,
   colourIdx, x, y, r, opts)`, not the checklist's `[abbr]RenderX(id, opts) → DOM node`. A canvas
   game has no node to return; the *rule* the seam serves (every pixel in one place) is unchanged.
   First canvas render seam in the suite. §17 deviation 3.
4. **Peck Off is always visible and forces the room bounds to 2** (brief wanted it hidden above 2
   players) — in MDLM the host opens Settings before the room exists, so there is no count to hide
   against. The `frtPearOff` precedent; `cldPeckOff` is in `verify-mp-configs.js` `ALLOWED_SETTINGS`.
   §17 deviation 1.
5. **Five SYNC packets in spec §11 shipped as three** — `CLD_FLOEOFF_END` and `CLD_GAME_OVER` fold
   into `CLD_SLIDE_RESOLVE`, because the Fish award and the match-over decision both happen inside
   `cldResolveSlide()` in the same call that produces the timeline. `cld-implementation-notes` DD-10.

---

## Packets as shipped

| Packet | Type | Channel |
|--------|------|---------|
| `CLD_COMMIT` | ACTION | **private** — the only client → host packet; host rejects a second commit, never overwrites |
| `CLD_FLOEOFF_START` | SYNC | public — every accumulator at its reset value, rebuilt client-side through `cldWire*` (Firebase erases `[]`/`{}`/`null`) |
| `CLD_SLIDE_TALLY` | SYNC | public — `{locked, total}`, a count only |
| `CLD_SLIDE_RESOLVE` | SYNC | public — the whole timeline + `aftermath[]` + `floeOffOver` / `winnerIdx` / `matchOver` / `fish[]` / `stats[]` |
| mid-game quit | ACTION | public — generic `mpNotifyPlayerLeft()`, no per-game packet |

---

## Files touched (this phase)

| File | Change |
|---|---|
| `js/lib/physics.js` | new — the shared sim module, pure and total |
| `js/games/cld.js` | new — rules layer, canvas, render seam, UI, settings, overlays, MP |
| `index.html` | 6 screens, 4 overlays, `js/lib/physics.js` + `js/games/cld.js` script tags, `#btn-cld` lobby button, section header |
| `js/engine.js` | `allScreens[]`, `updateSliderTheme` map, `getMuteToggleOnClass` map, `LOBBY_COLOUR_ORDER`, `resetToLobby()` teardown, `playSplash()` |
| `js/engine-multiplayer.js` | `MP_GAME_CONFIGS.cld` (`getMin/MaxPlayers` read only `cldPeckOff`), `mpSerialiseSettings` `case 'cld'` |
| `js/secret-mode.js` | `SM_GAMES` entry (no default art to override in v1) |
| `css/styles.css` | `cld-cta` (white ink + baked text-shadow) / `pill-active-cld` / `game-toggle-on-cld` / `cld-range`, `.cld-medal-slot`, `.cld-power-*` |
| `sw.js` | `js/lib/physics.js` + `js/games/cld.js` in `PRECACHE_URLS`; `CACHE_NAME` v218 → v219 |
| `tools/verify-cld-physics.js` / `-loop.js` / `-loopback.js` / `mutate-cld.js` / `simulate-cld-balance.js` | new — 122 / 163 / 168 / 26-mutant / instrument |
| `tools/verify-mp-configs.js` | `ALLOWED_SETTINGS.cldPeckOff` |
| `docs/new-game-tech-cold-shoulder.md` | confirmed Stage 2 spec (+ §16 clarifications, §17 deviations) |
| `docs/implementation-notes/cld-implementation-notes.md` | new — Design Decisions / Bug Index / Multiplayer Lessons / Template Gaps |
| `docs/game-identities/cld.md` | new — T1–T10; 96 `copy` strings verified by `verify-identity-docs.js` |
| `docs/code-map.md` | Cold Shoulder section + offset map row |
| `docs/decision-log.md` | one entry (first physics game, first shared sim module, first client → host private channel) |
| `docs/rules/per-game-classes.md` | three rows (Tables A/B/C) + the white-ink note |
| `docs/content-prompts/new-game-brief-prompt.md` | roster row, taken abbreviation, Sylly Mode name |
| `.claude/rules/ui-style.md` | `h-screen` whitelist row (`screen-cld-floe`) |
| `.claude/rules/logic-engine.md` | `js/lib/physics.js` in Shared Library Modules; `playSplash` in the Audio Function Catalogue |
| `CLAUDE.md` | Per-Game Quick Index row 19, Load Order, SW v219 entry (v218 moved verbatim to `docs/sw-changelog.md`), harness table rows, suite-stands paragraph |

---

## Deferred / Not Yet Done

**The phase gate is OPEN.** Two checks remain:

1. **A live multi-device session** (host + ≥2 real devices) — a full Match, incl. a plunge, a rim
   Snowball, a Dive, a Washout, and The Thaw on. No headless harness sees clock skew, Firebase
   ordering, dropped packets, or how the resolve *feels*.
2. **The offline install check** — unregister the SW, go offline, cold-boot: confirm
   `js/lib/physics.js` and `js/games/cld.js` precached. How to Play's **The Floe** tab (SW v221)
   is a *procedural* reference, not asset-backed, so it still does not double as this check — run
   it directly. (It does, however, break visibly offline if either file failed to cache.)

Also verify while doing check 1: **How to Play → The Floe** — Shove/Resurface work, the six-pose
cast renders, and the practice RAF stops on tab-switch / close (already confirmed in `visual-check`,
but it has never run on a real device).

Carried into `docs/deferred-work.md`:

3. **TG-13 — The Thaw's shrink is visually inaudible in playback. FIXED, SW v220 (4 Sep 2026).**
   `cldBeginPlayback` now rewinds `cldFloeRadius` to the first `thaw` beat's `fromRadius`, and the
   `thaw` aftermath beat sets it to `newRadius` as it plays — two lines in shared functions, no
   timeline field, no packet/sim/rules change. All headless harnesses still green. The shrink's
   real-device *readability* is now folded into check 1 (the live session with The Thaw on).
   `cld-implementation-notes` TG-13 (RESOLVED).
4. **Recorded intent — demote The Thaw to a normal setting** and give Cold Shoulder a Sylly Mode
   that changes what the game *is* rather than how fast it runs. Ships as-is for v1.
5. **Peck Off (2-player) balance is lighter than the mid sizes'** — the balance instrument's focus
   was 5 and 8 players.

---

## Verification

- `node tools/verify-cld-physics.js` — 122/122 PASS.
- `node tools/verify-cld-loop.js` — 163/163 PASS.
- `node tools/verify-cld-loopback.js` — 168/168 PASS (host ↔ 2 clients over a Firebase-shaped wire
  with a real mock DOM; `CLD_SRC=` supported).
- `node tools/mutate-cld.js` — 26/26 mutants caught.
- `node tools/simulate-cld-balance.js` — runs clean, exits 0.
- `node tools/verify-mp-configs.js` — 19 games PASS.
- `node tools/verify-identity-docs.js` — all docs PASS, `cld.md` 96 strings checked.
- Regression: `verify-cjar-loopback.js`, `verify-shp-loopback.js`, `verify-flw-loopback.js`,
  `verify-jec-loopback.js` still PASS.
- **Live multi-device play: NOT YET RUN.** Offline install check: NOT YET RUN.
