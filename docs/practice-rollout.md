# Practice Rollout — the tutorial tracker

**On-demand — not auto-loaded.** The worklist for giving every game a **Practice** tab
(`ui-style.md` § Practice tab). We work through it **one game at a time**, top of the tracker
down, ticking the checklist as we go. The Bluff (DYB) is the reference and is backfilled below.

Started 28 Sep 2026, SW v241. 20 games: **2 done, 18 to go.**

---

## 1. What a Practice tab is for

The one 60–90 second demo does **two jobs**:

1. **Makes the game easy to pick up** — the player plays a real hand before a real game.
2. **Shows the controls and the UI** — the player uses the real buttons on the real stage, so they
   are not lost the first time it is their turn.

Practice is drawn by the game's **own renderers**, so each game's pass is also the natural moment to
**improve the action stage.** The renderer is open anyway, and we look at it with a newcomer's eyes
(checklist item **D3**).

**The standard** (from `ui-style.md` — read it there, don't re-derive it here): one of four
**forms** — *Scripted hand* (default), *Arena*, *Lessons*, *Autopilot* (§ 5) · the game's real
renderers fed a model · beats gated on the player doing the thing · coach caption + step counter +
soft ring · ends **Practice again / Got it** · cast **Sylvia, Sam, Shirley, Jeff**, the player is
"You" · no multiplayer · own timer bag · reduced motion checked in JS · tabs **Rules | Practice |
gallery**, or **Rules | Practice** for a game with no gallery.

---

## 2. How to run one game's pass

1. **Intake.** Read this game's card (§ 6), then its identity doc **whole**
   (`docs/game-identities/[abbr].md`), then its impl-notes Template Gaps.
2. **Form + script.** Confirm the form (the card suggests one), then write it down: a beat table for
   a Scripted hand (the shape of DYB spec § 7.2: #, beat, coach line, what the player does — the fixed
   deal, both branches); the fixed opponent moves and the drills for an Arena; the lesson list, one
   beat table each, for Lessons; the pre-typed answers and scripted replies for Autopilot.
   **The owner signs it off before any code.**
   For an **S/M** game the script plus its card here *is* the spec. An **L/XL** game gets a short spec
   in `docs/superpowers/specs/`.
3. **Plan → build → verify → close**, against the checklist in § 3.

**Tier:** every pass is **Tier 2** (it touches the render seam and adds a harness), but sized to the
game — an S game does not need a 4,000-line plan.
**Model:** S/M → Sonnet, high · L/XL → Opus or Fable, high.
**Session:** one game per **fresh session**, pointed at this file and the game's card.

---

## 3. Definition of done — the per-game checklist

| # | Item | Done when |
|---|------|-----------|
| **D1** | **Form + script signed off** | Form chosen and written down (§ 2 step 2), owner-approved: coach lines, which cast members play, and — per form — the fixed deal and both branches / the fixed opponent moves / the lesson list / the auto-typed answers |
| **D2** | **Stage renderers take a model** | The live game renders through `[abbr]TableModel()` → renderer; Practice through `[abbr]PracticeModel(s)` → the *same* renderer. Nothing hand-built to look like the game |
| **D3** | **Stage review** | The action stage looked at fresh while its renderer is open; changes made, or logged in `deferred-work.md` with a reason |
| **D4** | **Tab built** | Rules \| Practice \| gallery; coach caption + "n / N" + soft ring on the taught control; beats gated; a new coach line scrolls into view; Practice again / Got it; cast in order |
| **D5** | **Isolation** | Own timer bag, stopped on tab-away, on close and in `resetToLobby()`; never `mpSendEnvelope`; never reads or writes live match state; opening it mid-game from the table's `[?]` disturbs nothing |
| **D6** | **Reduced motion in JS** | Nothing travels with the setting on; end states still shown |
| **D7** | **Practice harness** | `tools/verify-[abbr]-practice.js`: the coach's claims are true for the fixed setup (an Arena: the fixed opponent moves really are fixed, round after round); every branch or lesson reaches its end; gated controls stay gated; nothing is sent |
| **D8** | **No regressions** | The game's existing harnesses (the **loopback** especially — the live stage now renders through a model) + `verify-mp-configs` + `verify-identity-docs` + `verify-build-fresh` all green |
| **D9** | **visual-check** | **320×452 first**, then 375×548 and 375×667; a reduced-motion pass; Practice opened mid-game |
| **D10** | **Owner hardware pass** | On a real phone, Practice end to end down **both** branches — plus whatever real-device testing the game's card says it still owes |
| **D11** | **Docs closure** | Identity doc T7 copy blocks for every new coach line (a *paired* change) + verifier; `code-map.md`; impl-notes; the harness row in `CLAUDE.md`; this tracker; `deferred-work.md` grep |
| **D12** | **Shipped** | SW bump, the `CLAUDE.md` SW entry, commit |

---

## 4. The tracker

Status: ✅ done · 🔨 in progress · ⏳ up next · ☐ not started. **Order** is the suggested build order —
priority first, then cheaper before harder within a band, so lessons from one game carry into the next.

**Form**: ✔ = decided by the owner; ? = the suggestion, confirmed at the game's intake (D1).

| Order | Game | Pri | Effort | Form | Status | D1–D12 | Next action |
|---:|------|:---:|:---:|------|:---:|--------|-------------|
| — | **DYB** The Bluff | ref | — | Scripted hand ✔ | ✅ | 11/12 — D10 open | Owner: confirm the hardware pass (§ 6.0) |
| 1 | **CLD** Cold Shoulder | P1 | M | Arena ✔ | ✅ | 11/12 — D10 open | Owner: hardware pass (all three drills, both branches) + the phase-40 live session |
| 2 | **COMB** Honeycomb Hills | P1 | XL | Lessons ✔ | ☐ | 0/12 | Pick the lesson list (§ 6.2) |
| 3 | **SS** Secret Signals | P2 | L | Scripted + Autopilot ? | ☐ | 0/12 | — |
| 4 | **PKO** Pecking Order | P2 | L | Scripted hand ? | ☐ | 0/12 | — |
| 5 | **DSD** Deep-Sea Deploy | P2 | L | Scripted + Autopilot ? | ☐ | 0/12 | — |
| 6 | **GTH** Group Therapy | P2 | M | Scripted hand ? | ☐ | 0/12 | — |
| 7 | **NT** Net-Trace | P2 | L | Arena ? | ☐ | 0/12 | — |
| 8 | **LTTP** Late to the Party | P2 | XL | Lessons ✔ + Autopilot | ☐ | 0/12 | Last in P2 — reuses COMB's picker and SS's autopilot |
| 9 | **CJAR** Cookie Jar | P3 | M | Scripted hand ? | ☐ | 0/12 | — |
| 10 | **FRT** Fruit Salad | P3 | M | Scripted hand ? | ☐ | 0/12 | — |
| 11 | **SHP** Counting Sheep | P3 | M | Scripted hand ? | ☐ | 0/12 | — |
| 12 | **FLW** Flawless | P3 | M | Scripted hand ? | ☐ | 0/12 | — |
| 13 | **PASS** Pass | P3 | M | Scripted hand ? | ☐ | 0/12 | — |
| 14 | **BLD** Bailed | P3 | M | Scripted hand ? | ☐ | 0/12 | — |
| 15 | **NAT** Natural Selection | P3 | M | Autopilot ? | ☐ | 0/12 | — |
| 16 | **JEC** Just Enough Cooks | P3 | M | Autopilot ? | ☐ | 0/12 | — |
| 17 | **YGI** You Get It? | P4 | S | Autopilot ? | ☐ | 0/12 | — |
| 18 | **GM** Great Minds | P4 | S | Autopilot ✔ | ☐ | 0/12 | — |
| 19 | **LI5** Like I'm Five | P4 | S | Autopilot ✔ | ☐ | 0/12 | — |

### How priority and effort were scored

**Priority** = how lost a new player gets, plus what the owner gains from the pass.
- **P1** — a mechanic unlike anything else in the suite *and* real-device testing still owed. The owner's picks.
- **P2** — a legacy game that is hard to learn: hidden roles, several phases, an unfamiliar gesture, or a
  thin How to Play (SS has 3 step cards for a Decrypto-shaped game).
- **P3** — a moderate curve: a familiar shape (Love Letter, Resistance, Cockroach Poker…) with its own twists.
- **P4** — a format most players already know. Practice there is mostly a controls tour.

**Effort** = the renderer work plus how complicated the script is.
- **S** — one simple stage, a short linear script.
- **M** — one or two stage renderers to convert to take a model; one decision.
- **L** — several renderers that read globals, or a multi-phase or role-split script.
- **XL** — several phases, canvas, overlays or interrupts, *and* a script that won't fit 90 s without a design call.

---

## 5. The forms, and the questions they settled (owner, 28 Sep 2026)

The form **depends on the game** — there is no one shape. All of this is written into `ui-style.md`
§ Practice tab.

| Question | Decision |
|----------|----------|
| **Free aim / free gesture** — a scripted result can't survive a free drag | **Don't script the result — build an Arena.** The opponents' moves are fixed (CLD: aim and strength), the player's are free, and the player practises counters against moves they know are coming. CLD is the first; NT is the likely second. GTH is different: its drawing is never scored, so it stays a Scripted hand and any stroke counts |
| **Too big for 90 s** | **Lessons** — a picker with one lesson per key action a player takes (COMB, LTTP). A lesson that can't be interactive falls back to a step-through slideshow |
| **Free-text input** | **Autopilot** — the answers are pre-typed or taken from an example, and the other players' replies are scripted (LI5: play a card, a scripted clue, a scripted call-out on a No-No word; GM: fully scripted). Per game: the full experience on autopilot, **or** lesson cards |
| **Role games — which seat is "You"?** | The role with the most to learn; the other roles get a short explanation. Revisit only if a game badly needs something else |
| **No gallery tab** | Keep it that way: **Rules \| Practice**. Don't invent a gallery just to fill the slot |

---

## 6. Game cards

Each card: **why** (priority) · **teaches** (the controls to walk through) · **key decision** (the one
that needs both branches — a *candidate*; the script decides) · **stage renderers today** (what D2
converts) · **stage review** (D3 prompts) · **fold in** (open work and testing owed that the pass should
pick up) · **gotchas**.

### 6.0 DYB — The Bluff · ✅ reference (backfilled)

Shipped **SW v241**, 28 Sep 2026 (commits `915dcac` → `0b7ee46`, SE layout fixes `b32e795`).

| Item | Evidence |
|------|----------|
| D1 Script | Spec `docs/superpowers/specs/2026-09-28-dyb-dice-table-practice-design.md` § 7.2 — 7 beats, You + Sylvia + Sam, Classic Wilds, Tempest off; branch at beat 5 (Call / Climb) |
| D2 Model-fed | `dybTableModel()` / `dybPracticeModel(s)` → `dybRenderTable(root, m, onAct)`, `dybPlayThrow`, `dybPlayReveal` |
| D3 Stage | The whole table was rebuilt in the same release — the counting stage, hold-to-shake, The Overlook |
| D4 Tab | `dyb-how-to-overlay`: The Rules \| Practice \| The Dice |
| D5 Isolation | `dybPrTimers` / `dybPracticeStop()` — separate from `dybAnimTimers`, so Practice opens mid-Shake safely |
| D6 Reduced motion | Checked in JS |
| D7 Harness | `tools/verify-dyb-practice.js` — 34 checks |
| D8 Regression | rules 105 · dice 93 · loopback 41–45 · mp-configs · identity-docs · build-fresh |
| D9 Visual | SE pass (320×452 / 375×548 / 375×667); found the stage-width bug no harness could |
| **D10 Hardware** | **☐ Owner to confirm** — the spec asked for a playtest after the build; not recorded anywhere |
| D11 Docs | impl-notes § SW v241; `ui-style.md` § Practice tab; decision-log 2026-09-28 |
| D12 Shipped | SW v241 |

**Lessons that carry into every game:** converting the renderers to take a model *is* most of the
cost (`dyb-impl-notes` Template Gaps). A render that sizes itself must take its width from a stable
parent, never from its own previous render. Two named timer bags let Practice and a live game
coexist.

### 6.1 CLD — Cold Shoulder · P1 · M · ✅ (SW v244)

Shipped **SW v244**, 29 Sep 2026, with the pool-style cue built alongside it (branch `cld-cue-arena`).

| Item | Evidence |
|------|----------|
| D1 Script | Spec `docs/superpowers/specs/2026-09-28-cld-cue-arena-design.md` § 6 — three drills (Head-on · Crossfire · Edge), You + Sylvia + Sam, main line 5 steps + the Berth branch B1–B3 |
| D2 Model-fed | `cldFloeModel()` / `cldArenaModel()` → `cldDraw(view, m)`; DD-12's `cldHowtoDrawFloe` copy retired |
| D3 Stage | SE pass: power hint and tally one line at 320; the aim guide was invisible on the ice — re-inked (`cld-impl-notes` DD-18) |
| D4 Tab | `cld-how-to-overlay`: The Rules \| Practice \| The Cast |
| D5 Isolation | `cldPrRaf` / `cldPracticeStop()`; the real rules run through `cldArenaRun` (a synchronous swap) — 20 Arena Slides between live replay steps leave the live game byte-identical |
| D6 Reduced motion | `cldReducedMotion()` — a Slide steps straight to its end state |
| D7 Harness | `tools/verify-cld-practice.js` — 141 checks (`--tune` re-derives the drills' ring seeds) |
| D8 Regression | physics · loop · loopback · mutate 33/33 · mp-configs · identity-docs · build-fresh |
| D9 Visual | SE pass (320×452 / 375×548 / 375×667, both motion settings); found the 0 px stage no harness could |
| **D10 Hardware** | **☐ Owner** — the cue's feel (96 px, the dead zone) and all three drills down both branches, on the iPhone SE |
| D11 Docs | `cld-impl-notes` DD-18; identity doc T3/T6/T7/T9; `ui-style.md` § Practice tab; decision-log 2026-09-29 |
| D12 Shipped | SW v244 |

**Superseded by the build:** the card below said the Arena would read and write none of
`cldPenguins`/`cldCommits`/`cldTimeline`. It does — through the swap, for one synchronous call,
restored in `finally` (owner decision, spec § 1). DD-12's intent stands; its wording does not.

- **Why:** the suite's only physics-and-aim game. The drag-back shove, every penguin sliding at once,
  and the Berth afterlife (bumper, Snowball, Dive) are unlike anything else in the suite. The pass also
  catches up on its **phase-40 testing**.
- **Form: Arena ✔** (owner). Not scripted — a practice arena. **Three penguins: You + two targets
  (Sylvia, Sam)** whose aim and strength are **pre-set**. You see their shoves coming and try
  counters: full power back at one, a slight angle to deflect, or getting out of the way entirely. You
  choose; they don't. Round after round the targets do the same thing, so a counter can be tried,
  adjusted and tried again.
- **Teaches:** drag back from your penguin (further = harder) · release to arm, re-drag freely · **Lock
  It In** (final) · watching the simultaneous Slide · going in the Drink → the Berth: bumper, Snowball,
  Dive.
- **To write at D1:** each target's fixed aim + strength (one set, or a few drills to cycle through?);
  the coach line that frames each counter; how to reset the floe (Resurface); whether the Berth
  (Snowball / Dive) gets its own drill or appears only after you go in.
- **Stage renderers today:** `cldDraw(dt)` reads `cldCtx`, `cldPenguins`, `cldFloeRadius`, `cldView*`,
  `cldClock`; `cldDrawAim`/`cldDrawOneAim`. The penguin seam `cldRenderPenguin` and `Physics.simulate`
  are already pure.
- **The Floe tab is the drift the standard forbids.** `cldHowtoDrawFloe` hand-copies ~25 lines of
  `cldDraw`'s backdrop (`cld-impl-notes` DD-12). D2 makes `cldDraw` take a model and retires the copy.
  The Arena is the grown-up version of The Floe's Shove/Resurface sandbox, so it absorbs it.
  **Owner call at D1:** does **The Cast** stay as the gallery → *Rules | Practice | The Cast*?
- **Stage review:** aim readability and the power bar at 320 px; the commit tally; whether The Thaw's
  shrink reads on a real phone.
- **Fold in:** phase-40 gate — **live multi-device session + offline install check**
  (`deferred-work.md` § Cold Shoulder, items 1–2); **RAF and reduced motion** for the floe sim
  (`deferred-work.md` § RAF animations — D6 makes this decision anyway, and the rule is "show the end
  state": here the resting position *is* the result).
- **Gotchas:** the targets' impulses are fixed, so the **only** variable is the player's drag, and
  `Physics.simulate` is deterministic: the same counter always gives the same result, which is what
  makes it practice. D7 asserts that (fixed impulses → identical outcome across runs). The Arena reads
  and writes none of `cldPenguins`/`cldCommits`/`cldTimeline` — the DD-12 "state island" rule stands.
  `screen-cld-floe` is on the `h-screen` whitelist (drag must not scroll).

### 6.2 COMB — Honeycomb Hills · P1 · XL

- **Why:** the suite's biggest game (25–50 min, 15 overlays, five render seams), built on a
  Catan-shaped economy most party players have never met. You place on the corners and edges of a hex
  board, you collect on other players' turns, and the build picker is an inline two-step.
- **Teaches:** the opening snake — a Drone Cell on a corner, then a Comb Wall on an edge · the second
  cell paying out · the Scout Flight (automatic roll, no button) · collecting when *anyone* rolls ·
  the build picker (which piece → where) · a trade · the Wasp.
- **Form: Lessons ✔** (owner) — a picker with one lesson per key action. **Candidate list:** Place your
  opening · The roll and collecting · Build (picker → where) · Trade · The Wasp · Instinct cards.
  Settle the list at D1; any lesson that can't be interactive becomes a step-through slideshow.
- **Stage renderers today:** `combDrawBoard(canvasEl, viewport)` + `combDrawStructure`/`Targets`/`Wall`
  read the board and ownership globals; `combRenderMeadow`, `PlayerPanel`, `RollResult`,
  `BuildPicker`, `Trade`, `InstinctList` too — about ten. The art seams (`combRenderHex`, `Resource`,
  `Instinct`, `Piece`, `Die`) already take arguments.
- **The lesson picker is built here first** — LTTP reuses it, so keep it game-agnostic in shape.
- **Stage review:** `deferred-work.md` § COMB gaps — **#2** the Season Log (one small 📜, not surfaced
  at gameover) and **#4** client standby shows no roster.
- **Fold in:** the **reconnect real-device pass** (`deferred-work.md` § Reconnect — the Short Summer
  lock/rejoin script, recorded in `comb-impl-notes` DD-30). **#5** Short Summer balance needs real
  play, so run it in the same device session.
- **Gotchas:** Practice deals a fixed board from a fixed seed through the deal function, **never**
  through `MATCH_START`. `combReducedMotion()` already exists — reuse it. The tab bar becomes four:
  The Rules | Practice | The Comb | The Instinct Deck.

### 6.3 SS — Secret Signals · P2 · L

- **Why:** Decrypto-shaped — encoding, intercepting and decoding in every round, plus a Vault to
  memorise and a growing Archive. Notoriously hard to explain, and its How to Play has 3 step cards.
- **Teaches:** memorising your Vault · reading your secret code · one clue per digit (Encoder) ·
  Intercepting the other team's code using the Archive · Decoding your own team's.
- **Key decision (candidate):** the Intercept — commit a code guess (right → token, wrong → none).
- **Stage renderers today:** `ssRenderArchive(containerEl, team, showWords)`,
  `ssRenderCurrentClues(containerEl)`, `ssRenderCodeGuessUI(containerEl, guessArr, onSelect)` already
  take a container, but read their data from globals — halfway there. `ssRenderScoreboard`,
  `ssRenderResolution`.
- **Form: Scripted hand + Autopilot ?** — the first Autopilot game, so the auto-typing is built here,
  reusable by DSD, LTTP and the word games. "You" are the Encoder's team (the role with the most to
  learn); the Intercept is the key decision.
- **Fold in:** `deferred-work.md` § SS gaps.
- **Gotchas:** the internal id is `sylly-signals`, and the file is `secret-signals.js`.

### 6.4 PKO — Pecking Order · P2 · L

- **Why:** four moves (Challenge · Swarm · Stampede · Retreat), a Poacher wildcard, a predator chain
  and Force of Nature events. The chain alone is a learning curve.
- **Teaches:** Staking · reading the chain · Challenge (all-or-nothing, one predator per Mark) · Swarm ·
  Stampede · Retreat and its forgiveness · going Unchallenged.
- **Key decision (candidate):** Challenge or Swarm (or Retreat).
- **Stage renderers today:** `pkoRenderCard(id, opts)` / `pkoRenderFan(el, opts)` take arguments;
  `pkoRenderTable`, `PlayerStrip`, `MyHoard`, `Challenge`, `Trail`, `Events`, `WateringHole`, `Stampede`
  read globals.
- **Fold in:** the reconnect real-device line for PKO (reload the Challenger during a Carrion window);
  the unplayed **Stragglers** mode can share the same device session.
- **Gotchas:** four tabs — Rules | Practice | Diagram | Animals. Tap-hold to the gallery already works
  (`pkoBindChainHold`); Practice's cards should keep it.

### 6.5 DSD — Deep-Sea Deploy · P2 · L

- **Why:** Codenames-shaped, but with Captain and Crew, a pass gate, four tile roles and no neutral,
  and Console settings that decide per hazard whether a hit ends the turn.
- **Teaches:** the Captain's colour-coded grid · sending a Sonar Ping (one word + a number) · the pass
  gate · the Crew tapping a sequence in order and confirming it · each tile resolving.
- **Key decision (candidate):** the Crew stops at the number, or takes the +1 guess.
- **Stage renderers today:** `dsdRenderCaptainGrid`, `CrewGrid`, `ExecutionGrid(pendingIdx)`,
  `SabotageGrid(placingTeam)` — globals.
- **Stage review:** five DSD screens are on the legacy `h-screen` whitelist. Decide whether they still
  need the sticky footer, or can move to the Stack while the renderers are open.
- **Fold in:** `deferred-work.md` § DSD gaps.
- **Gotchas:** the Sonar Ping is typed (§ 5).

### 6.6 GTH — Group Therapy · P2 · M

- **Why:** own-phone only, two phases (draw against a clock, then diagnose other people's drawings),
  and the freehand canvas is a control used nowhere else in the suite.
- **Teaches:** the disorder, its definition and the drawing tip · drawing on the canvas · the timer ·
  the Waiting Room · diagnosing from four cards.
- **Key decision (candidate):** the diagnosis — right card or decoy.
- **Stage renderers today:** `CanvasDraw` is already pure (`render(canvasEl, data)`), so a pre-drawn
  scripted "patient drawing" costs nothing. The case screen reads globals.
- **Stage review:** `screen-gth-canvas` / `screen-gth-case` are whitelisted `h-screen` — check them at 320 px.
- **Fold in:** `deferred-work.md` § GTH gaps.
- **Gotchas:** the player's own drawing is never scored in Practice, so gate the beat on "drew
  something". `CanvasDraw.setTremor` goes on the wrapper, never the canvas.

### 6.7 NT — Net-Trace · P2 · L

- **Why:** building uses gestures nobody would guess (long-press for a Honeypot, long-press to
  upgrade, a seal you're not allowed to make), and relative SER scoring isn't obvious.
- **Teaches:** tap for a Firewall · long-press for a Honeypot · upgrade · tap to remove and refund · a
  placement that would seal the exit getting blocked · watching playback · reading SER.
- **Form: Arena ?** — the skill is feel, like CLD's: build freely on a fixed node, run the trace,
  read your latency, change one block and run it again.
- **Key decision (if scripted instead):** a Firewall (longer path) or a Honeypot (slow trap) in the same spot.
- **Stage renderers today:** `ntRenderBuildGrid`, `ntRenderFrame(simMs)`, `ntRenderJourneyFrame(simMs)`
  and friends read globals; playback is a RAF.
- **Stage review:** `deferred-work.md` — the allocation preview looks cruder than the build grid, and
  the allocation screen has dead space.
- **Fold in:** **RAF and reduced motion** for playback (`deferred-work.md` § RAF animations). Practice
  skips DNP; one coach line mentions it.
- **Gotchas:** long-press in Practice must be the same binding as the live grid, not a copy.

### 6.8 LTTP — Late to the Party · P2 · XL

- **Why:** a hidden role, free-typed messages that interrupt every device, a map that narrows,
  Contacts with tags and notes, and an endgame where the vote and the pin happen at once. It has more
  surfaces than any other legacy game.
- **Teaches:** messaging a player (and the interrupt everyone sees) · the Map narrowing · Contacts ·
  Last Drinks — the vote (the Gang) and the pin (the Friend of a Friend).
- **Key decision (candidate):** the Last Drinks vote — the right suspect or the wrong one.
- **Stage renderers today:** `lttpRenderPaneB`, `SmallTalkTabs`, `MapPane`, `PinGrid`, `VoteList`,
  `PlanLog` — all globals; the interrupts are overlays.
- **Form: Lessons ✔ + Autopilot** — COMB's picker, with messages typing themselves. "You" are the
  Gang (the common seat); the Friend of a Friend gets a short explanation, or a lesson of its own if
  the pin needs one.
- **Why last in P2:** it reuses COMB's lesson picker and SS's autopilot, so it comes after both.
- **Fold in:** `deferred-work.md` § LTTP gaps.

### 6.9 CJAR — Cookie Jar · P3 · M

- **Why:** the choose-together Reach In / Sneak Out loop is simple, but the rule that pays out, "sneak
  out *alone* and take every crumb", isn't obvious.
- **Key decision:** the game *is* this decision — Reach In Again or Sneak Out, so both branches come
  naturally. The script should show one bust.
- **Stage renderers today:** `cjarRenderCard(card, opts)` takes arguments; `cjarRenderStage`, `Table`,
  `Controls`, `WarningStrip`, `TrailStrip`, `PrivateStrip` read globals.
- **Fold in:** the reconnect real-device line for CJAR; **DD-06** balance flag (real play).
- **Gotchas:** the flip beat is a 3.2 s blocking choreography — run it through the same timer bag.

### 6.10 FRT — Fruit Salad · P3 · M

- **Why:** Cockroach Poker-shaped. Peek & Pass is the move new players miss.
- **Key decision:** Call True or Call False (Peek & Pass gets one gated beat of its own).
- **Stage renderers today:** `frtRenderCard(fruitId, opts)` takes arguments; `frtRenderTableBody`,
  `Opponents`, `Serving`, `Await`, `Reveal` read globals.
- **Gotchas:** white ink on `#FFE500` is the locked scheme — don't "fix" the coach ring's contrast
  by changing the ink.

### 6.11 SHP — Counting Sheep · P3 · M

- **Why:** a 99-count with Pillows, Alarms, the Wolf's locked slot, and Nod Off.
- **Key decision (candidate):** the card that keeps you under 99, or a Pillow that saves it for later.
- **Stage renderers today:** `shpRenderCard(cardId, opts)` takes arguments; `shpRenderTable` and
  `shpRenderNightEnd` share one screen (`ui-style.md` rule 4) — **both** must take the model.
- **Gotchas:** **SHP's markup lives in `src/screens/frt.html`** (`shp-how-to-overlay`), not in a file
  of its own. Keep the Night-intro beat.

### 6.12 FLW — Flawless · P3 · M

- **Why:** Love Letter-shaped — draw two, play one, keep one — with ten gem effects to learn.
- **Key decision (candidate):** which gem to play and which to keep.
- **Stage renderers today:** `flwRenderCard(gemId, opts)` takes arguments; `flwRenderTable`,
  `RivalStrip(me)`, `Hand(me)`, `Ledger` read globals.
- **Gotchas:** Practice's hands never touch the private channel (no `FLW_HAND`). Tabs: Rules |
  Practice | Gems.

### 6.13 PASS — Pass · P3 · M

- **Why:** a climbing card game whose vocabulary (Sequence, Double Sequence, Bomb) is the learning
  curve, and its 54-card deck has no gallery tab by design.
- **Key decision (candidate):** play a combo, or Pass and wait for the table to clear.
- **Stage renderers today:** `Cards.buildEl` is already pure; `passRenderHand`, `Table`, `Arena` read globals.
- **Gotchas:** Practice can teach the combo vocabulary that a gallery would otherwise show — which
  could close the "How-to gallery for PASS" sweep in `deferred-work.md`.

### 6.14 BLD — Bailed · P3 · M

- **Why:** Resistance-shaped — Nominate, Vote, Mission — with hidden Flakes.
- **Key decision (candidate):** as a Flake, **Bail** or play **I'm In** to stay hidden.
- **Stage renderers today:** `bldRenderPhase`, `Nominating`, `Voting`, `Mission`, `PatienceMeter` — globals.
- **Gotchas:** role choice (§ 5) — the Flake seat has more to learn.

### 6.15 NAT — Natural Selection · P3 · M

- **Why:** three tiers of knowledge (Lead, Field Researcher, Mole), one-word notes, then a vote.
- **Key decision (candidate):** the Selection vote.
- **Stage renderers today:** `natRenderObservationScreen`, `Journal`, `SelectionScreen`, `VoterTurn` — globals.
- **Gotchas:** typed input (§ 5). The `nono_list[0]` Broad Shield is the Mole's only clue — use a
  real animal entry so the coach line is true.

### 6.16 JEC — Just Enough Cooks · P3 · M

- **Why:** three ingredients, a ⭐ Signature, a Crutch, then a two-half Sifting where merges happen
  with the counts hidden. The merge step is the part nobody expects.
- **Key decision (candidate):** which ingredient to back with the ⭐.
- **Stage renderers today:** `jecRenderCheckList`, `Tasting`, `Callouts`, `Ballot`, `Tally` — globals.
- **Gotchas:** typed input (§ 5).

### 6.17 YGI — You Get It? · P4 · S

- **Why:** a known party format; what's new is that a Take is a **Number + Metric**, plus the anonymous
  Lineup and the top-three vote.
- **Key decision (candidate):** your top-three picks in The Nod.
- **Gotchas:** typed input (§ 5).

### 6.18 GM — Great Minds · P4 · S

- **Why:** two players converge on one word. The format is simple, and the controls are few.
- **Form: Autopilot ✔ — fully scripted** (owner): both words type themselves; the player watches a
  pair miss, become the new pair, and then match.
- **Gotchas:** a two-player game: the cast is You + Sam.

### 6.19 LI5 — Like I'm Five · P4 · S

- **Why:** Taboo, which everyone knows. What's worth showing is **Yay / Nay / Skip** under a
  running timer, and the Report Card.
- **Form: Autopilot ✔** (owner's example): an example card with its No-No list, a scripted clue and
  scripted guesses, the player tapping **Yay** / **Skip**, and a scripted call-out when a banned word
  slips — the player taps **Nay**. Then the Report Card.
- **Gotchas:** LI5's state is unprefixed (legacy) — name the Practice state `li5Pr*` anyway.
