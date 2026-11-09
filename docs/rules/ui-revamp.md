# UI Revamp — the standard for one game's pass

**On-demand — not auto-loaded.** Read it whole (it is ≤11 KB) when starting or resuming a game's
revamp pass, or when touching the Intro (`js/engine-intro.js`, `screen-game-intro`). The tracker is
`docs/ui-revamp-rollout.md`; the programme spec is
`docs/superpowers/specs/2026-11-08-ui-revamp-design.md` (§ 17 = the Directions step).

**Goal:** new players find each game much easier to play, and the visuals catch up with what we can
build — every game a **world** (`CLAUDE.md` § North Star). One family, carried by shared templates and
a shared scene kit; each game's flavour by its own world, narrator and words.

---

## 1. One pass — R1 → R16, with the Directions step

**One game per fresh session.** Opus runs R1–R3 (world, directions, plan); Sonnet builds R4–R14 from
the board and the plan. The owner signs off twice: the world brief, then the direction.

| # | Item | Done when |
|---|------|-----------|
| **R1** | Intake | Identity doc read whole; impl-notes Template Gaps; a **before** set (`node tools/capture-screens.js [abbr] before`); the owner's pain points on the tracker card |
| **R2** | World brief — **signed off** | Narrator role · scene concept · 3 mood words · Intro copy (lines + per-role brief) · Line-up (teams / none) · round-intro concept. **No code before sign-off** |
| **R2b** | **Directions** — **owner picks** | **Three** directions for the action screens on a Design canvas (375×667 boards, tweakable states, every value inline), one game only. The owner picks or mixes. A strong world **may reopen** brand colour, terminology, Intro copy or the brief — **in scope for this pass**; changes land in the identity doc (paired sections) before building |
| **R2c** | Build plan | Short: the chosen board mapped onto the screen inventory (R3), states, motion |
| **R3** | Screen inventory | Every screen and overlay with a fate (keep / restyle / rebuild / merge / delete) and a TV label (public / private) |
| **R4** | Intro | `intro` config + `<template id="intro-[abbr]">` + scene (§ 3); Line-up if the game has teams |
| **R5** | Mood beats | Round/Night intros and interstitials carry the world |
| **R6** | Gameplay screens | On the first turn the next action is obvious **without reading** |
| **R7** | Gameover | The podium and the play-again moment |
| **R8** | Menu + Settings content | Inside the frozen shells |
| **R9** | How to Play — Rules + gallery | Inside the frozen shell |
| **R10** | How to Play — Practice | `docs/practice-rollout.md` D1–D7 (§§ 1, 3, 5 + the game's § 6 card), built on the **new** screens |
| **R11** | Impeccable | `/impeccable critique` → `audit` → `polish` over the revamped screens; findings fixed or logged |
| **R12** | TV labels | Every `<section id="screen-…">` in the game's partial(s) carries `data-tv="public\|private"`; a `**TV public state (abbr):**` line in the game's `code-map.md` section (§ 5) |
| **R13** | Departures | Each logged on the tracker (§ 6) |
| **R14** | Harnesses green | The game's own (its loopback especially) + `verify-mp-configs` + `verify-identity-docs` + `verify-build-fresh` + `verify-tv-labels` + `verify-game-intro` if the config changed; then `visual-check` 320×452 → 375×548 → 375×667 + a reduced-motion pass |
| **R15** | Owner hardware pass | A real MDLM session (≥3 phones where the game allows); `?fps` noted; the **after** set captured and the before/after artifact published |
| **R16** | Closure | Documentation Integrity Protocol; SW bump; commit |

A game gaining a **new mode** (LI5's MDLM) is pilot scope, scoped at its R2 — not a checklist item.
**New games** take the same world-first route before their tech spec (`new-game-process.md` § Stage 1b).

## 2. The rules during the revamp

**Frozen** (suite constants): the chrome (🔊 / ✕ / `[?]`); button shapes and sizes, `gel-btn` on menu
buttons only, brand fill + white ink, no emoji on action labels, Decision Modal sizing; Fredoka
(animating its weight axis counts); the four-button menu; the How to Play shell (title block, tab bar
**Rules | Practice | gallery**, "Got it", Sylly Mode last); the Settings shell. **The one-brand rule,
reworded:** *brand-coded controls (CTA, active pill, ON toggle, focus border) use only this game's
brand colour. Scene art uses whatever palette its world needs.*

**Loosened — defaults, depart and log it (§ 6):** the Stack and its four rules; transient-animation
layering; Round/Night intro, Team Setup and the `h-screen` whitelist; how-to and settings card
*content*; the Motion Standard's timing caps (compositor-only stays as performance guidance); the
interstitial chrome exemption's ~5 s ceiling.

**Still binding:** every multiplayer rule in `logic-engine.md`; reduced motion in CSS **and** in JS for
every RAF/scene loop; 44 px targets (`.pill` exempt); Australian English, metric; the three test sizes;
no new precached binary without an agreed ceiling (`cost-envelope.md`); edit `src/screens/`, never
`index.html`; timer/RAF lifecycle.

## 3. The Intro — how a game adopts it

`players join → host starts → Intro (narrator beats → brief → Line-up → Ready) → the game`.
Engine-owned: `screen-game-intro` (`_shell.html`), `js/engine-intro.js`, entered through
**`mpEnterGame(cfg)`** (`engine-multiplayer.js`) — the one seam every route takes (host after the
roster, a client on `GAME_START`, Pass-the-Phone, Solo, rejoin). **A game with no `intro` runs exactly
as before** — `verify-game-intro.js` § 2.

**Config** — `MP_GAME_CONFIGS[abbr].intro`:

```js
intro: {
  template: 'intro-li5',                       // <template id> in the game's own partial
  scene:    () => Li5Scene,                    // optional — { mount(el, opts), stop() }, game-owned
  brief:    (seatIdx, teamIdx) => 'describer', // optional — which brief variant; teamIdx -1 = not picked
  lineup:   { type: 'teams', teamNames: ['Crayon Crew', 'Glue Stick Gang'], minPerTeam: 2, balanced: false },
}
```

**Template** — plain text nodes only (the identity doc's T7b `# intro-[abbr]` copy block reads them;
no verifier change). The engine clones nothing else from it:

```html
<template id="intro-li5">
  <p data-intro-narrator>Ms Pip</p>   <p data-intro-role>The teacher</p>
  <p data-intro-line>Eyes up here, class.</p>  <!-- one per beat -->
  <ul data-intro-brief="default"><li>…</li><li>…</li><li>…</li></ul>  <!-- ≤3 shown -->
  <ul data-intro-brief="describer"><li>…</li></ul>
  <p data-intro-lineup>Into your groups, please.</p>
</template>
```

**What the engine does.** Beats are local (tap or 5 s) — the host may **Skip** for every device. Then
the brief (re-picked when the seat's team changes), the Line-up or a roll call, and **Ready**: a
client sends `MP_INTRO_READY`; the host marks its own slot directly; bots are pre-ready. **Start**
needs everyone ready **and** a valid Line-up; **Start anyway** appears for the host 20 s after the
Intro opens and waives readiness only. Start is refused while a seat is Away. Pass-the-Phone is one
tap — **Let's go**, no readiness, no Line-up.

**The Line-up** (`type: 'teams'` — the only type until a `'seats'` beat is designed at its first
adopter's R2): columns per team plus **Unassigned**; players switch freely until Start; the host
moves anyone (a tap cycles the chip), shuffles, renames. Unassigned players are placed into the
smallest team at Start, and the gate (`minPerTeam`, `balanced`) is judged on the placed teams. On
Start it writes **the shapes the lobby writes today** — `mpPlayerSlots` in team order and
`window.mpLobbyRoster = { teamNames, playerTeamIdx, captainSlots: null }` — so **no game re-reads
anything**. A game with `intro.lineup` **must** have `rosterConfig.type: 'none'` (asserted).

**Packets** (engine-generic, routed before per-game code — the game needs no handler):

| Packet | Dir | Payload |
|---|---|---|
| `MP_INTRO_READY` | client → host | `{}` — seat from `originId` |
| `MP_LINEUP_PICK` | client → host | `{ team }`, `-1` = Unassigned |
| `MP_INTRO_STATE` | host → all | `{ ready[], team[], names[], skipped }` — per-seat arrays (never empty), rebuilt on receipt |
| `MP_INTRO_DONE` | host → all | `{ order[uid], roster }` — once, after the whole transition is settled |

**Seats.** `mpSeats` still freezes at `GAME_START` (presence starts there, so Away works mid-Intro);
a Line-up that reorders seats **re-freezes** them at `MP_INTRO_DONE` (`mpIntroRefreeze`, re-keying the
Away/released sets by uid). **Rejoin mid-Intro:** the host answers `MP_REJOIN_ACCEPT { intro: true }`
then sends `MP_INTRO_STATE` privately — no game snapshot, no `pause()`/`resume()` (there is no game
yet). **Quit mid-Intro:** the ✕ is the Mid-Game Quit Contract. **Play again** (`mpReturnToLobby`)
sets `mpIntroSeen`; the next start skips the beats and keeps last match's teams by player, but the
Line-up and Ready still run — a game with no Line-up goes straight in. Exit and re-host plays it
normally (`resetToLobby` clears the flag).

**Teardown.** Every Intro timer is in `mpIntroTimers`; `mpIntroStop()` (from `mpEndMatchLocal`, on
DONE, on Let's go) clears it and calls the scene's `stop()`; `mpIntroTeardown()` (from
`resetToLobby`) also clears the Play-again flag. Tab-away stops the scene; return re-mounts it.

## 4. Scenes

Code-built, quality pushed: CSS/HTML layers, SVG, WAAPI, kinetic type, Canvas 2D, Three.js where 3D
earns it (vendored — zero added download). Gameplay screens share the Intro's visual language. A
scene is **game-owned and pure** (`[abbr]-scene.js`: inputs in, DOM out, no game state) until a second
game needs a piece — then it moves to `js/lib/scene-kit.js` (after pilot 2, never pre-built).

`mount(el, { reducedMotion, seat, mode })` / `stop()`. **No new binaries.** 60 fps on the iPhone SE,
with an **automatic static tier** after ~1 s of slow frames; reduced motion → static always; **one
WebGL context at a time**; timer lifecycle; sound = engine `play*()`. A new scene file goes in `sw.js`,
the `CLAUDE.md` load order and `_scripts-*.html`, with a `CACHE_NAME` bump. No size caps yet.

## 5. TV labels (R12)

TV host-spectator mode does not exist yet; each pass leaves it a foothold. **Public = safe for anyone
in the room to see** (LI5: the guessers' view, never the word). Each `<section id="screen-…">` in the
game's partial(s) carries `data-tv="public"` or `"private"`, and the game's `code-map.md` section gets
one line `**TV public state (abbr):** field, field, …`. `node tools/verify-tv-labels.js` checks every
game whose tracker row is ✅, plus the engine's `screen-game-intro` (private: a brief can name a role).

## 6. Departures

During the revamp a design rule is a default, not a gate. Depart when the world needs it, then log one
line in the tracker's departures log: **game · rule departed · what instead · why**. At every batch
boundary each entry is **promoted** (the rule changes in `ui-style.md`/`DESIGN.md`, and the skill
learns it), **kept** as a per-game exception, or **rolled back**.

## 7. Tools

| Tool | Use |
|---|---|
| `?fps` on the URL | Dev-only frame-time meter, bottom-left, `pointer-events: none` — R15 |
| `node tools/capture-screens.js [abbr] before\|after` | Every screen in the game's partial at 375×667 into git-ignored `wip/revamp/[abbr]/…`; an optional `wip/revamp/[abbr]/seed.js` seeds state per screen |
| `node tools/verify-game-intro.js` (+ `mutate-game-intro.js`) | The Intro loopback — run after touching `engine-intro.js`, `mpEnterGame`, or any game's `intro` |
| `node tools/verify-tv-labels.js` | R12 |
