# UI Revamp — programme + Stage 0 design

**Date:** 8 Nov 2026 · **Tier:** 2 (process-level, suite-wide; Stage 0 touches the engine's MP entry path)
**Status:** awaiting owner approval (the hard gate) · **Brainstormed:** this session, sections 1–6 approved in turn
**Supersedes as a tracker:** `docs/practice-rollout.md` (absorbed — § 8)

---

## 1. Goal

Revamp every game's UI so that:

1. **New players find it much easier to play**, and
2. **the visuals catch up with what we can now build** — the games feel *alive* and enjoyable.

Not uniqueness for its own sake: the twenty games stay one family. The family is carried by shared
templates and a shared scene kit; each game's flavour by its own world, narrator and words.

**Multiplayer first (MDLM — every player on their own device).** The target flow:

> players join room → host starts → **Intro** (the world, a narrator, what you'll be doing, pick your side) → game starts

Pass-the-Phone gets the same Intro as a single tap; PTP-specific gates are revisited after the MDLM
pass. Later games are mostly MDLM-shaped anyway.

**Token-efficiency is a design goal.** The kit, the checklist and a project skill must make a
per-game pass something **Sonnet, medium** can run comfortably. Opus builds the kit and the two
pilots; Sonnet runs the batches. Consistency across the family falls out of the same reuse.

---

## 2. The standard — frozen, loosened, still binding

Lives in a new on-demand rule file **`docs/rules/ui-revamp.md`** (Stage 0). During the revamp the
design rules are **defaults, not gates** — a pass may depart, and every departure is logged (§ 8).

### 2.1 Frozen (suite constants — unchanged for now)

- **Chrome:** speaker / ✕ / `[?]` — positions, styles, behaviour (`ui-style.md` § Global UI Protocol).
- **Button style:** shapes and sizes, `gel-btn` on menu buttons only, brand fill + white ink, no emoji
  on action labels, Decision Modal button sizing (§ Action Button Standard, § Quit Overlay Checklist).
- **Font:** Fredoka. *(Animating Fredoka's variable weight axis counts as Fredoka — allowed.)*
- **Brand colours** and the **one-brand rule**, reworded: *brand-coded controls (CTA, active pill, ON
  toggle, focus border) use only this game's brand colour. Scene art uses whatever palette its world
  needs.*
- **The four-button menu** (Play → How to Play → Settings → ← Back to the Box).
- **The How to Play shell:** data overlay, title block, tab bar (**Rules | Practice | gallery**),
  "Got it", Sylly Mode card last on Rules. **Content inside is loosened.**
- **The Settings shell:** title block, cards, ✨ Sylly Mode last. **Content inside is loosened.**

### 2.2 Loosened (defaults — depart, then log it)

- The Stack and its four rules; transient-animation layering.
- Screen patterns: Round/Night intro, Team Setup, legacy `h-screen` whitelist (`ui-screen-patterns.md`).
- How-to step-card and settings-card visual treatment (inside the frozen shells).
- The Motion Standard's timing caps. *Compositor-only (`transform`/`opacity`) stays as performance
  guidance, not a ban.*
- The interstitial chrome exemption's ~5 s ceiling.

### 2.3 Still binding (not style — correctness, access, platform)

- Every multiplayer rule in `logic-engine.md` (MDLM Patterns, quit contract, reconnect, Firebase
  empty-value erasure, accumulator reset, originId seat resolution…).
- Reduced motion honoured — CSS globally, **and in JS for every RAF/scene loop**.
- 44 px touch targets (`.pill` 39 px exemption stands).
- Australian English; metric.
- Test at 320×452, 375×548, 375×667 (owner's iPhone SE).
- No new precached **binary** without an agreed per-file ceiling (`cost-envelope.md`).
- Edit `src/screens/*.html`, never `index.html`; timer/RAF lifecycle rules.

### 2.4 Rule-file housekeeping (from the handoff)

- **Settings Card Standard** moves out of `ui-style.md` to on-demand **after** the revamp has
  reworked it (moving it now would move it twice). Logged in `deferred-work.md`.
- **MDLM Patterns** stays always-loaded — correctness rules every MP edit needs.

---

## 3. Programme shape — extract on the second use

| Stage | Model | Scope |
|---|---|---|
| **0 — Foundations** | Opus, high | § 5–§ 9 below: the standard, the tracker, the engine Intro + readiness + Line-up, verification, `?fps`, before/after tool, TV-label check |
| **1 — LI5 pilot** | Opus, high | R1–R16 **plus** a new MDLM mode (§ 10). Scene code game-local |
| **2 — GM pilot** | Opus, high | R1–R16. **Extract** what both pilots used into `js/lib/scene-kit.js`. **Write `sylly-ui-pass`.** First departures review |
| **3 — Sonnet proof** | Sonnet, medium | One N-player MDLM game run from the skill alone (chosen then — not a heavily-iterated one like CJAR). Where Sonnet struggles, fix the **skill/kit**, not the game |
| **4+ — Batches** | Sonnet, medium | 3–4 games per batch, grouped by shape; departures review at each boundary |
| **Later — TV mode** | own spec | Assembled from the R12 labels (§ 7) |

**Why LI5 then GM** (owner): the oldest games, low stakes, biggest visible improvement — and both are
well understood, so the pilots measure what works rather than debugging an unplaytested game (GTH)
or re-litigating a layout that took many iterations (CJAR).

**What the pilots do not exercise** (both cap at 2 players today): N-player readiness, bots, rejoin
mid-Intro. Stage 0's loopback (§ 12) proves those on a stub game; LI5's new MDLM mode (4–12) then
exercises N-player readiness and the Line-up for real; Stage 3 is an N-player MDLM game by design.

**One game per fresh session**, briefed by the skill (Stages 3+) or by this spec + the tracker card
(Stages 1–2).

---

## 4. The per-game checklist (definition of done)

| # | Item | Done when |
|---|------|-----------|
| **R1** | **Intake** | Identity doc read whole; impl-notes Template Gaps; a **before** screenshot set (§ 9.2); the owner's pain points noted on the tracker card |
| **R2** | **World brief — signed off** | Narrator role · scene concept · 3 mood words · Intro copy (lines + per-role brief) · Line-up (teams / seats / none) · round-intro concept. **Owner signs off before any code** |
| **R3** | **Screen inventory** | Every screen and overlay listed with a fate (keep / restyle / rebuild / merge / delete) and a TV label (public / private) |
| **R4** | **Intro** | Config + template + scene built; Line-up if the game has one |
| **R5** | **Mood beats** | Round/Night intros and interstitials reworked to carry the world |
| **R6** | **Gameplay screens** | Revamped; on the first turn the next action is obvious **without reading** |
| **R7** | **Gameover** | Revamped — the podium and the "play again" moment |
| **R8** | **Menu + Settings content** | Menu title area; settings card content inside the frozen shell |
| **R9** | **How to Play — Rules + gallery** | Rewritten inside the frozen shell |
| **R10** | **How to Play — Practice** | `practice-rollout` D1–D7, built on the new screens (§ 8.2) |
| **R11** | **Impeccable** | `/impeccable critique` → `audit` → `polish` over the revamped screens; findings fixed or logged |
| **R12** | **TV labels** | Every `<section id="screen-…">` in the partial carries `data-tv="public\|private"`; the public state fields named in `code-map.md` |
| **R13** | **Departures** | Each one logged on the tracker (§ 8.3) |
| **R14** | **Harnesses green** | The game's harnesses (its loopback especially) + `verify-mp-configs` + `verify-identity-docs` + `verify-build-fresh` + `verify-tv-labels` + `verify-game-intro` if the config changed; then `visual-check` 320×452 → 375×548 → 375×667 + a reduced-motion pass |
| **R15** | **Owner hardware pass** | A real MDLM session (≥3 phones where the game allows); `?fps` noted; the **after** set captured and the before/after artifact published |
| **R16** | **Closure** | Documentation Integrity Protocol; SW bump; commit |

A game gaining a **new mode** (LI5) is pilot scope, not a checklist item — scoped at that game's R2.

---

## 5. Engine — the Intro, readiness and the Line-up (Stage 0)

### 5.1 One entry seam

Today every route into a game calls `cfg.onPassThePhone()` directly — host after `mpConfirmRoster()`
(`engine-multiplayer.js` ~3232), client on `GAME_START` (~1921), PTP/TLM from the mode screen (~3740),
and rejoin (~1489). Stage 0 adds **`mpEnterGame(cfg, { rejoin })`** and routes the non-rejoin sites
through it (Grep `onPassThePhone(` at build time — the list above is from 8 Nov and may have grown, e.g.
`mpEnterSolo`):

```
mpEnterGame(cfg):
  if no cfg.intro                    → cfg.onPassThePhone()          (every unrevamped game, unchanged)
  if rejoin                          → (see § 5.7)
  if Play-again in this session      → Intro in "returning" form     (§ 5.6)
  else                               → showGameIntro(cfg)  … then cfg.onPassThePhone()
```

A game with no `intro` behaves exactly as today — that is what makes the rollout incremental.

### 5.2 The Intro screen

One engine-owned screen, **`screen-game-intro`** (registered in `allScreens[]`, in `_shell.html`), with
three slots filled per game:

- **Scene** — the game's code-built scene mounts into `#game-intro-scene` (§ 6).
- **Narrator** — lines shown one beat at a time, tap to advance, kinetic type.
- **Brief** — up to 3 "what you'll be doing" points; **may vary by role/seat** (LI5: describer vs
  tattletale).
- **Line-up** (optional, § 5.4) and **Ready** (§ 5.3).
- Chrome: 🔊 and ✕ (✕ = the normal mid-game quit contract — the Intro is part of the match).

**Content lives in the game's partial** as `<template id="intro-[abbr]">` — narrator name/role, lines,
brief, labels. The engine clones it. This keeps UI copy where `verify-identity-docs.js` already looks
(`index.html` + the plugin), so the identity doc's T7b gains an `# intro-[abbr]` copy block (**paired**)
with no verifier change.

**Config** — a new optional field on `MP_GAME_CONFIGS[abbr]`:

```js
intro: {
  template: 'intro-li5',
  scene:    () => Li5Scene,                 // { mount(el, opts), stop() } — game-owned (§ 6)
  brief:    (seatIdx) => 'describer' | …,   // optional: which brief variant this seat reads
  lineup:   { type: 'teams', teamNames: [...], balanced: true, minPerTeam: 2 } | { type: 'seats' } | null,
}
```

### 5.3 Readiness

| Mode | Behaviour |
|---|---|
| **MDLM / Solo** | Each device taps **Ready**. A client sends `MP_INTRO_READY`; the **host marks its own slot directly** (the dedup guard drops self-sent ACTIONs). Bots are pre-ready. The host sees "3 / 5 ready" with per-player ticks |
| **TLM** | Same, one tap per device |
| **PTP** | One tap — **"Let's go"**. No readiness, no Line-up (PTP team naming stays in the game's own setup) |

**Start.** The host's **Start** enables when everyone is ready **and** the Line-up is valid.
**Start anyway** appears for the host **20 s** after the Intro opens if some are still not ready — it
waives *readiness*, never a Line-up rule (a lopsided team is still blocked). Unassigned players at
Start are auto-placed to balance.

**Host skip.** The host may skip the narrator beats; every device jumps straight to Line-up/Ready.

### 5.4 The Line-up beat (owner idea — team selection becomes world-building)

The team/seat picking that today happens on the lobby roster screen moves into the Intro, voiced by
the narrator (the teacher calls the class into groups; mission command assigns crews).

- **Columns:** each team, plus **Unassigned**. Players **switch freely** — including back to
  Unassigned — until the host starts.
- **Host powers:** move anyone, randomise, rename teams.
- **Gate:** `balanced` / `minPerTeam` rules block Start (and Start anyway).
- **No game re-reads anything.** On Start the Line-up writes the **same shapes the lobby writes today**
  — `window.mpLobbyRoster` (+ team names) and the `mpPlayerSlots` order — then `onPassThePhone()` runs.
- **`type: 'seats'`** (the `individual` roster games) — at each game's R2 the pass chooses a seat-order
  beat or switching to random (`'none'`).
- **A game with `intro.lineup` must have `rosterConfig.type: 'none'`** — the lobby roster step is
  skipped. Asserted by `verify-mp-configs`.

**Migration — no big bang.** Unrevamped `teams` games (SS, DSD, NT) and `individual` games (GM, JEC,
YGI, LTTP, NAT) keep the lobby roster screen until their own pass. The lobby roster screen
(`mpShowRosterScreen` / `mpConfirmRoster` / `mpRosterCheckConfirm`) is **retired when the last of them
migrates** — tracked as a tracker line item.

### 5.5 Packets (engine-generic, handled before per-game routing — like `MP_PLAYER_LEFT`)

| Packet | Dir | Payload | Notes |
|---|---|---|---|
| `MP_INTRO_READY` | client → host | `{}` | Seat from `originId` (never the payload) |
| `MP_LINEUP_PICK` | client → host | `{ team }` (`-1` = Unassigned) | Host validates, applies, broadcasts state |
| `MP_INTRO_STATE` | host → all | `{ ready[], lineup{ teams[][], unassigned[], names[] }, skipped }` | Sent on every change. **Empty arrays are erased by Firebase** — rebuild on receipt with a seat-count normaliser (the `cjarWireArr` pattern); never assign a raw `p.x` |
| `MP_INTRO_DONE` | host → all | `{ order[], roster }` | Full snapshot **after** the whole transition is settled. All devices apply, fix seats, run `onPassThePhone()` |

**Missing-handler audit (Stage 0):** every interactive control on `screen-game-intro` — narrator
advance (local only), Ready, team pick, host move/randomise/rename (host-local + state), Start, Start
anyway, Skip, ✕ — is either local-only or has a row above.

### 5.6 Play again — the "returning" form

Owner rule: **only Play again skips the Intro; exit and re-host plays it normally.**
`mpReturnToLobby()` sets a session-memory flag `mpIntroSeen = abbr`; `resetToLobby()` clears it.
On the next start with the flag set, the narrator beats are skipped — but the **Line-up and Ready
still run** (a new player may have joined, teams may want reshuffling). A game with no Line-up goes
straight in.

### 5.7 Seats, drops and rejoin

- **Seat freeze moves.** Today `mpSeats` and `rooms/{code}/seats` freeze at `GAME_START`
  (~1128–1133). For a game with a Line-up the seat order is decided in the Intro, so the freeze is
  **rewritten at `MP_INTRO_DONE`** (presence still starts at `GAME_START`, so Away works during the
  Intro). Games without an intro are untouched.
- **Drop / quit during the Intro** — the existing contracts apply unchanged (quit dissolves; a drop is
  Away). *Friendlier "just remove the leaver" behaviour is deferred — logged, not built.*
- **Rejoin during the Intro** — only reconnect-hook games can rejoin, and none adopts an intro before
  Stage 3. Stage 0 still routes it: the host answers a rejoin while in the Intro by sending
  `MP_INTRO_STATE` to that seat and the device re-enters the Intro. Covered by the loopback.

### 5.8 Teardown

All Intro timers (beat auto-advance, the 20 s Start-anyway, scene RAF) live in one bag
**`mpIntroTimers`**, cleared in `resetToLobby()`, `mpEndMatchLocal()`, on `MP_INTRO_DONE`, and on
tab-away (scene RAF only). The scene's `stop()` is always called on leaving the screen.

---

## 6. Scenes and performance

- **Built from code, pushed for quality** — layered CSS/HTML, SVG, the Web Animations API, kinetic
  typography, Canvas 2D, and **Three.js where 3D earns it** (already vendored + precached — zero
  added download). The gameplay screens use the same visual language; the Intro must match the action.
- **Pilot 1:** `js/games/li5-scene.js` — game-owned and **pure** in the `dyb-dice.js` / `cld-art.js`
  sense (inputs in, DOM out, reads no `li5*` game state). **After pilot 2:** whatever both pilots used
  moves to **`js/lib/scene-kit.js`** (`SceneKit`). Expected candidates — to be confirmed, not
  pre-built: layered/parallax stage, narrator line renderer, ambient particles, entrance choreography,
  a small Three.js helper.
- **No size caps yet** (owner): measure the pilots, settle a number later, compact to fit.
- **Rules that do apply:** **no new binary files**; target 60 fps on the iPhone SE, with an
  **automatic static tier** when frames run slow for ~1 s; reduced motion → the static tier always;
  **one WebGL context at a time** (iOS caps them; the Lounge/controller already hold some — a scene
  borrows or disposes, never leaks); every loop obeys the timer lifecycle; sound stays synthesised
  `play*()` in `engine.js` (new ambience = a new engine function, `docs/rules/audio.md`).
- **Each new scene file** is added to `sw.js` `PRECACHE_URLS`, the load order in `CLAUDE.md`, and
  `index.html`'s script list — with a `CACHE_NAME` bump.

---

## 7. TV labels (R12)

TV host-spectator mode does **not** exist (the lobby wiring spec deleted a mockup "TV host pane",
`2026-09-25-lobby-production-wiring-design.md:216`). It is a **later, separate task**. Each pass leaves
it a cheap foothold:

- `data-tv="public"` / `data-tv="private"` on every screen `<section>` in the partial.
- **Public means "safe for anyone in the room to see"** — for LI5 that is the *guessers'* view, so the
  word is never public.
- The public state fields are named in that game's `code-map.md` section.
- `tools/verify-tv-labels.js` asserts every screen of every **revamped** game carries the attribute
  (the revamped list is read from the tracker's ✅ rows or held in the script — decided at build).

---

## 8. Tracker, Practice, departures

### 8.1 The tracker — `docs/ui-revamp-rollout.md`

Shape copied from `practice-rollout.md`: purpose · how to run one pass · the R1–R16 checklist (pointer
to `docs/rules/ui-revamp.md`) · the tracker table (order, game, stage/batch, status, R-count, next
action) · one card per game · the departures log · programme-level line items (lobby roster retirement,
the Settings Card Standard move, TV mode, size caps).

### 8.2 Practice folds in

The revamp comes first, and Practice is part of How to Play (R10), built on the new screens.
`practice-rollout.md` keeps its §§ 1, 3 and 5 (purpose, D1–D12, the four forms) as R10's reference;
its tracker and per-game cards migrate into the new tracker. DYB and CLD carry over with Practice ✅.
The old file gets a header pointer.

### 8.3 Departures log

One line each: **game · rule departed · what instead · why**. At every batch boundary each entry is
**promoted** (the rule changes in `ui-style.md`/`DESIGN.md`, and the skill learns it), **kept** as a
per-game exception, or **rolled back**. Promotions are how the standard catches up with what works.

---

## 9. Tooling (Stage 0)

### 9.1 `?fps` meter

A dev-only frame-time readout, on only when the URL carries `?fps`. Tiny, corner-pinned,
`pointer-events: none`, one self-contained block that can be deleted whole. Off by default — never seen
by a normal player.

### 9.2 Before/after

`tools/capture-screens.js [abbr] before|after` drives the `visual-check` renderer through the game's
screens at 375×667 into git-ignored `wip/revamp/[abbr]/{before,after}/`. At R15 the pair becomes a
published **before/after artifact** per game.

---

## 10. Pilot 1 — LI5 (outline; its own Stage 1 spec owns the detail)

**New MDLM mode, 4–12 players, two teams, min 2 per team, no bots** (a spoken game). PTP and TLM keep
working and are revamped too. The identity doc's T10 judgement ("MDLM doesn't map") is rewritten.

| Seat this turn | Sees | TV |
|---|---|---|
| **Describer** (rotates within the describing team) | Word, No-No List, timer, Yay / Nay / Skip, pause, **incoming buzzes** — its own polish | private |
| **Guessers** (describer's teammates) | **Live feed** — timer, score, streak, Yay flashes, buzz moments. **Never the word or the list** | **public** |
| **Tattletales** (opposing team) | The live feed **plus** word + No-No List + **Buzz** | private |

**Buzz — "as today, but revamped"** (owner): a buzz is an **alert, not an automatic penalty** — an
instant penalty can't be taken back and can ruin a turn on an accidental tap. Each buzz appears on the
**describer's screen** naming the word; when **more tattletales buzz the same word** the alert
**escalates** (count + intensity), so consensus demands attention. The describer addresses it — **Nay**
(accept) or wave it off. Per-player cooldown, not today's shared 10 s.

**Network shape (to be proved in the Stage 1 spec):** host owns clock + score (an `endTimestamp`, the
`GTH_PHASE2_BEGIN` pattern); the describer's turn words go privately (`mpSendPrivate`) so the next word
is instant; tattletales receive each word privately; **guessers' payloads never contain the word**.
LI5's MP code moves out of `engine-multiplayer.js` (~2272–2312, ~3878–3924) into
**`li5HandleEnvelope`** in `js/games/li5.js`, the suite's shape. **Intro:** the teacher; **Line-up:**
Crayon Crew / Glue Stick Gang.

**Stage 1 spec:** `docs/superpowers/specs/YYYY-MM-DD-li5-mdlm-design.md` — packet table, the
missing-handler audit, and a new `tools/verify-li5-loopback.js` (wire + real-DOM mocks + a broken-copy
run). LI5 has no harness today.

## 11. Pilot 2 — GM (outline)

R1–R16 on a 2-player MDLM game; its Line-up is `type: 'seats'` or none (decided at R2). GM has no
harness today — if the pass touches its packets, it earns a loopback. Then: extract `scene-kit.js`,
write `sylly-ui-pass`, run the first departures review.

---

## 12. Verification — named up front

**Stage 0**

| Check | Why |
|---|---|
| **New `tools/verify-game-intro.js`** — a loopback: stub game with an `intro`, **3 devices + 1 bot**, a `fbWrite`/`fbRead` **wire** (asserts empty-array erasure first), **real mock DOM**, console `warn` → error list | Readiness, Start / Start-anyway at 20 s (fake clock), host self-ready, Line-up pick / switch / back to Unassigned / host override / balance gate / auto-place, `MP_INTRO_DONE` order + seat freeze, Play-again returning form vs re-host, Skip, drop + quit mid-Intro, rejoin into the Intro, PTP one-tap, no-intro passthrough |
| `INTRO_SRC=` **broken-copy run** | Proves the loopback fails red first (`verify-cjar-loopback.js` pattern) |
| `verify-mp-configs.js` extended | `intro` schema; `lineup` ⇒ `rosterConfig.type === 'none'`; template id exists in `index.html` |
| **New `tools/verify-tv-labels.js`** | `data-tv` on every screen of revamped games |
| **Every existing loopback** (cjar, cld, comb, dyb, flw, jec, nt, pko, shp) + `verify-mp-reconnect.js` + `verify-bots.js` | The entry seam now sits in every game's start path — no-intro games must pass through byte-identically |
| `verify-build-fresh.js`, `verify-identity-docs.js`, `tools/visual-lobby.js` | Markup + the lobby router seam |
| `visual-check` on `screen-game-intro` at the three sizes + reduced motion | Layout only — no presentation assertions (Harness rule) |

**Each pass** — R14 above. LI5 adds `verify-li5-loopback.js`. Cosmetic work earns no new assertions.

**Not covered by any harness:** a real multi-device session, GPU/frame rate, how a scene *feels* —
that is R15, with `?fps`.

---

## 13. Skills

- **`sylly-ui-pass`** (project skill, written at Stage 2 from the two pilots): invoked with a game
  abbreviation; loads `docs/rules/ui-revamp.md`, the tracker card and the identity doc; walks R1–R16;
  **stops at R2 for owner sign-off**; points at the `SceneKit` API and the Intro config; lists what not
  to touch. Prefixed `sylly-` because account skills win over same-named project skills.
- **External skills reviewed (8 Nov):** *UI UX Pro Max* (`nextlevelbuilder/ui-ux-pro-max-skill`) —
  generates a design system from a style/palette/font database; we already have one and font + colour
  are frozen → **skip**. *Taste* (`Leonxlnx/taste-skill`) — premium-web anti-generic rules, overlapping
  Impeccable, which already reads `PRODUCT.md`/`DESIGN.md` → **not installed**; its `redesign-skill`
  may be tried read-only as a second opinion on a pilot, its files read first. The gap neither fills
  — game feel, at-a-glance table reading — is what `sylly-ui-pass` captures from the pilots.

---

## 14. Files touched (Stage 0)

`js/engine-multiplayer.js` (entry seam, Intro/readiness/Line-up, packets, seat-freeze move, teardown) ·
`js/engine.js` (`allScreens[]`, `resetToLobby()` additions, `?fps`) · `src/screens/_shell.html`
(`screen-game-intro`) · `css/styles.css` (Intro + Line-up base styles) · `tools/verify-game-intro.js`,
`tools/verify-tv-labels.js`, `tools/capture-screens.js` (new) · `tools/verify-mp-configs.js` ·
`sw.js` (bump) · docs: `docs/rules/ui-revamp.md` (new), `docs/ui-revamp-rollout.md` (new),
`practice-rollout.md` (pointer), `code-map.md`, `logic-engine.md` (the entry seam + Intro packets as a
universal rule; seats-freeze wording), `ui-style.md` (one-brand rewording; stubs pointing at
`ui-revamp.md`), `CLAUDE.md` (SW, Current Focus, on-demand list), `shared-implementation-notes.md`,
`deferred-work.md`, `decision-log.md`.

---

## 15. Deferred / open

- Per-game and kit **size caps** — set after the pilots are measured.
- **TV host-spectator mode** — its own spec once enough games carry R12 labels.
- **PTP-specific gates** revamp — after the MDLM pass.
- **Friendlier Intro drop** (remove the leaver instead of dissolving) — not now.
- **Lobby roster screen retirement** — when the last `teams`/`individual` game migrates.
- **Settings Card Standard → on-demand** — after the revamp reworks it.
- **Recurring characters / mascots** across games — not now; per-game worlds first.

## 17. Addendum (9 Nov 2026) — the Directions step, and the first two picks

### 17.1 Process change — world first, then directions, then build

Each game's pass gains a **Directions** step between R2 and R4, and the model split changes:

1. **Opus** writes the world brief (R2) and produces **three directions** for the action screens as a
   Design canvas (phone-size 375×667 boards, tweakable states, inline values). **One game per
   session** — doing LI5 and GM together (9 Nov) left neither room to explore.
2. **Owner picks** (or mixes). A strong world can **reopen identity decisions**: brand colour,
   terminology, Intro copy, even the brief. That review is **in scope** for the pass, not a
   follow-up; changes land in the identity doc (paired sections) before building.
3. **Opus** writes a short build plan from the chosen board (screen inventory mapping, states, motion).
4. **Sonnet** builds R4–R10 from board + plan.

Same rule for a **new game**: a visual-world/directions step before the tech spec, so a game is never
built on a day-1 identity the design later outgrows (`docs/rules/new-game-process.md` § Stage 1b).

Canvases: LI5 https://claude.ai/artifact/8YuBcu4fLveMY4XtF9RbJz ·
GM https://claude.ai/artifact/XbfGxB5hXCRPbJU7z4b9x6 · local copies (git-ignored)
`wip/revamp/mockups/{li5,gm}/` — `.dc.html` boards, every value inline.

### 17.2 LI5 — picked: **B · Chalkboard**, with **A's passed-note buzz**

- The chalkboard establishes classroom + teacher on its own; the Intro's teacher lives in the same room.
- Keep from the shared moves: tap the clock to pause (End turn inside Time Out); buzz names the word
  and lights it in the list; describer answers Nay / Wave off; numbered first-turn coaching.
- Buzz = A's folded note (single → note; crowd → stacked notes + wiggle), not B's pinned slip.
- **Scope added at R2:** (1) **brand colour** — pink was never chosen against a world; chalkboard
  green (or a classroom palette) is a candidate. Changing it touches every brand surface (CSS
  classes, `per-game-classes.md`, `DESIGN.md`, `getMuteToggleOnClass`/`updateSliderTheme` maps).
  (2) **terminology** — re-voice the game's terms to the stronger classroom world (identity doc T5–T7b,
  paired copy; `verify-identity-docs.js`).

### 17.3 GM — picked: **B's concept, re-skinned as thought bubbles**; C's history as a **word cloud**

- Each word is a **thought bubble**; your clue goes in the **overlap**; a sync **merges** the bubbles.
  Replaces the radio/frequency look (A was lovely but drifted from the concept).
- History: not a ladder — a **word cloud** of every earlier word, the current pair largest and
  "loudest", older words smaller and fainter, placed loosely. Hard to mock statically — prototype it.
- **Terminology:** drop radio/frequency/station language; keep **mind / wavelength / sync /
  connection** (Neural Link, Mind Meld stay candidates). Settings title, gates, Sever Link, Session
  Terminal etc. all reviewed at R2.
- Brand colour: purple stays (mind-reading fits); a better purple shade may be chosen, and the
  violet/purple split (gm.md T7c) is resolved in the same move.

## 16. Owner decisions (this brainstorm, 8 Nov 2026)

Revamp before Practice; Practice folds into How to Play · structure C (extract on the second use) ·
pilots LI5 → GM · scenes code-built, quality pushed, Three.js allowed · generic role narrator per game ·
MDLM first · Start anyway after 20 s · only Play again skips the Intro · How-to + Settings shells frozen,
content loosened · Line-up moves into the Intro; free switching incl. Unassigned; unrevamped games keep
the lobby screen until migrated · no size caps yet · `?fps` (unobtrusive, removable) + before/after
artifact · LI5 MDLM in the pilot: buzz is an escalating alert the describer addresses, guessers never
see the word or list, 4–12 players.
