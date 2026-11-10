# UI Revamp Rollout — the tracker

**On-demand — not auto-loaded.** The worklist for revamping every game's UI, **one game per fresh
session**. Started 9 Nov 2026 (Stage 0, SW v264). 20 games: **0 revamped, Stage 0 foundations built.**

It **absorbs `docs/practice-rollout.md` as a tracker**: Practice is R10 of each pass, built on the new
screens. That file keeps §§ 1, 3, 5 (purpose, D1–D12, the four forms) **and its § 6 game cards** as
R10's reference — each card below points at its Practice card rather than copying it (a copy drifts).

---

## 1. Purpose

New players find each game much easier to play, and every game becomes a **world** whose visuals
catch up with what we can now build. One family: shared templates (the Intro, the frozen shells) and,
from Stage 2, a shared scene kit. Spec: `docs/superpowers/specs/2026-11-08-ui-revamp-design.md`.

## 2. How to run one pass

1. Read **`docs/rules/ui-revamp.md` whole** — the R1–R16 checklist (with the **R2b Directions** step),
   the frozen / loosened / binding rules, and how a game adopts the Intro.
2. Read this game's card (§ 5), then its identity doc whole, then its impl-notes Template Gaps.
3. Walk R1 → R16. **Two owner sign-offs**: the world brief (R2) and the direction (R2b). Nothing is
   built before both.
4. From Stage 3: invoke the **`sylly-ui-pass`** skill with the abbreviation instead (written at Stage 2).

**Model:** Opus, high for R1–R3 (world, directions, plan) and for both pilots; Sonnet, medium builds
R4–R14 from Stage 3. **Tier:** 2 for a pilot; a batch game is sized at its R2.

## 3. The tracker

Status: ✅ revamped · 🔨 in progress · ⏳ up next · ☐ not started. **`verify-tv-labels.js` reads the
Status column** — a row turns ✅ only when R12 is really done. The Game cell starts `**ABBR**`.

| Order | Game | Stage | Status | R1–R16 | Practice (R10) | Next action |
|---:|------|------|:---:|------|------|------|
| 1 | **LI5** Like I'm Five | 1 · pilot | 🔨 | 3/16 | ☐ | R1, R2, R2b, R2c + § 5 signed off 9 Nov (`specs/2026-11-09-li5-pilot-design.md`). **S0 (scene `beat` hook) + S1 (MDLM network, `verify-li5-loopback` 182 + 5/5 mutants) built 9 Nov.** Next S2 (world kit + Intro scene) → S9 (§ 5.12) |
| 2 | **GM** Great Minds | 2 · pilot | ☐ | 0/16 | ☐ | After LI5 — thought bubbles + word-cloud history (spec § 17.3); then extract `scene-kit.js`, write `sylly-ui-pass` |
| 3 | *TBD* — an N-player MDLM game | 3 · Sonnet proof | ☐ | — | — | Chosen at Stage 2's end; not a heavily-iterated one (not CJAR) |
| — | **SS** Secret Signals | batch | ☐ | 0/16 | ☐ | Line-up candidate (`teams`, balanced) — retires a lobby-roster user |
| — | **JEC** Just Enough Cooks | batch | ☐ | 0/16 | ☐ | — |
| — | **YGI** You Get It? | batch | ☐ | 0/16 | ☐ | — |
| — | **LTTP** Late to the Party | batch | ☐ | 0/16 | ☐ | — |
| — | **NAT** Natural Selection | batch | ☐ | 0/16 | ☐ | — |
| — | **DSD** Deep-Sea Deploy | batch | ☐ | 0/16 | ☐ | Line-up candidate (`teams`, balanced) |
| — | **BLD** Bailed | batch | ☐ | 0/16 | ☐ | — |
| — | **GTH** Group Therapy | batch | ☐ | 0/16 | ☐ | — |
| — | **DYB** The Bluff | batch | ☐ | 0/16 | ✅ carried over | Practice exists (SW v241) — R10 is a check, not a build |
| — | **PASS** Pass | batch | ☐ | 0/16 | ☐ | — |
| — | **NT** Net-Trace | batch | ☐ | 0/16 | ☐ | Line-up candidate (`teams` when not 1v1) |
| — | **FRT** Fruit Salad | batch | ☐ | 0/16 | ☐ | — |
| — | **SHP** Counting Sheep | batch | ☐ | 0/16 | ☐ | Markup lives in `src/screens/frt.html` |
| — | **FLW** Flawless | batch | ☐ | 0/16 | ☐ | Reconnect adopter — rejoin mid-Intro is live from here |
| — | **PKO** Pecking Order | batch | ☐ | 0/16 | ☐ | Reconnect adopter |
| — | **CJAR** Cookie Jar | batch | ☐ | 0/16 | ☐ | Reconnect adopter |
| — | **CLD** Cold Shoulder | batch | ☐ | 0/16 | ✅ carried over | Bots + Solo — the Intro's bot pre-ready is live from here |
| — | **COMB** Honeycomb Hills | batch | ☐ | 0/16 | ☐ | Reconnect adopter; no Sylly Mode |

Batch order and grouping (by shape) are set at Stage 2's departures review.

## 4. Programme line items

| Item | Status | Trigger |
|---|---|---|
| **Stage 0 — foundations** | ✅ SW v264 | The Intro + readiness + Line-up (`js/engine-intro.js`), the `mpEnterGame` seam, packets, seat re-freeze, `verify-game-intro.js` (+ mutation runner), `verify-mp-configs` § 9, `verify-tv-labels.js`, `?fps`, `capture-screens.js`. **No game has an intro yet** |
| Lobby roster screen retirement | ☐ | When the last `teams`/`individual` roster game (SS, DSD, NT · GM, JEC, YGI, LTTP, NAT) has migrated to a Line-up or to `'none'` — then `mpShowRosterScreen` / `mpConfirmRoster`'s roster branches / `mpRosterCheckConfirm` go |
| `'seats'` Line-up type | ☐ | Designed at the first `individual` game's R2 (GM is the likely first) — or that game switches to random (`'none'`) |
| Settings Card Standard → on-demand | ☐ | After the revamp has reworked it (`ui-style.md` § Settings Layout Standard) |
| TV host-spectator mode | ☐ | Its own spec, once enough games carry R12 labels |
| Scene / per-game size caps | ☐ | After both pilots are measured |
| Friendlier Intro drop (remove the leaver, don't dissolve) | ☐ | Deferred — not now |
| PTP-specific gates revamp | ☐ | After the MDLM pass |

## 5. Game cards

Each card: **shape** (modes · players · roster today) · **Line-up** (the R2 candidate) · **Practice**
(the `practice-rollout.md` card R10 builds from) · **pain points** (filled at R1) · **notes**.

### LI5 — Like I'm Five · Stage 1 pilot · 🔨
- **Pilot spec:** `docs/superpowers/specs/2026-11-09-li5-pilot-design.md` — R1 intake, R2 world brief
  (Show-and-tell; narrator *Miss*; pink kept as the pink chalk), then R2b/R2c/MDLM network stubs.
- **Shape:** PTP + TLM today, 2 devices, `'none'` (pre-lobby team names). **Pilot adds an MDLM mode,
  4–12 players, two teams, min 2 per team, no bots** (spec § 10).
- **Line-up:** `teams` — Crayon Crew / Glue Stick Gang (names under review, § 17.2), `minPerTeam: 2`.
- **World (picked, § 17.2):** B · Chalkboard, with A's passed-note buzz (single → folded note; crowd →
  stacked notes + wiggle). Tap the clock to pause; buzz names the word and lights it; Nay / Wave off.
- **Scope added at R2:** brand colour (pink was never chosen against a world — chalkboard green is a
  candidate; touches every brand surface) and terminology (T5–T7b, paired copy).
- **Network — BUILT (S1, 9 Nov):** LI5's MP code moved out of `engine-multiplayer.js` into
  `li5.js` § Lobby Mode / `li5HandleEnvelope`; TLM folded into the MDLM path; `reconnect` adopted;
  the monitor deleted. `tools/verify-li5-loopback.js` (182, on `mp-world`) + `mutate-li5-loopback.js`
  (5/5). S3 gatekeeper (SW v266), S4 describer (v267) and S5 tattle + guess (v268) and S6 Report Card / gameover / history / play-again (v269) built — the LI5 pilot is complete bar the owner phone pass. Found + fixed on the way: PTP turn order when the
  second group won the toss (L9), the describer's optimistic advance (L10).
- **Lessons:** `docs/ui-revamp-lessons.md` — read at R1, add at R13 (team-game Start rules, hunting old styling, copy, overlays, layout measuring).
- **Engine (S0, 9 Nov):** the scene `beat(i, text)` hook, `data-intro-unassigned`, no Line-up in TLM
  (`shared-implementation-notes.md` DD-67). The `<template id="intro-li5">` copy is in; the scene is S2.
- **Practice:** `practice-rollout.md` § 6.19 (Autopilot ✔).
- **Boards:** https://claude.ai/artifact/8YuBcu4fLveMY4XtF9RbJz · `wip/revamp/mockups/li5/`.
- **Pain points:** none (owner, 9 Nov).

### GM — Great Minds · Stage 2 pilot · ☐
- **Shape:** PTP + MDLM, 2 players, `individual` roster.
- **Line-up:** `'seats'` beat or switch to `'none'` — decided at R2.
- **World (picked, § 17.3):** thought bubbles (a sync **merges** them); history as a **word cloud**,
  current pair loudest. Drop radio / frequency / station language; keep mind / wavelength / sync /
  connection. Purple stays; the violet/purple split (gm.md T7c) resolves in the same move.
- **Practice:** § 6.18 (Autopilot ✔). No harness today — touching packets earns a loopback.
- **Boards:** https://claude.ai/artifact/XbfGxB5hXCRPbJU7z4b9x6 · `wip/revamp/mockups/gm/`.
- **Pain points:** —

### The batch games

| Game | Shape (modes · players · roster) | Line-up candidate | Practice card |
|---|---|---|---|
| SS | PTP/TLM/MDLM · 4–6 · `teams`, balanced | `teams`, balanced | § 6.3 |
| JEC | PTP/MDLM · 3–6 · `individual` | `seats` or none | § 6.16 |
| YGI | PTP/MDLM · 3–6 · `individual` | `seats` or none | § 6.17 |
| LTTP | PTP/MDLM · 4–6 · `individual` | `seats` or none | § 6.8 |
| NAT | PTP/MDLM · 4–8 · `individual` | `seats` or none | § 6.15 |
| DSD | PTP/TLM/MDLM · 4–6 · `teams`, balanced | `teams`, balanced | § 6.5 |
| BLD | MDLM · 5–10 · none | none (hidden roles) | § 6.14 |
| GTH | MDLM · 4–8 · none | none | § 6.6 |
| DYB | MDLM · 3–8 · none | none | § 6.0 ✅ |
| PASS | MDLM · 3–6 · none | none | § 6.13 |
| NT | PTP/MDLM · 2–8 · `teams`/none | `teams` | § 6.7 |
| FRT | MDLM · 3–8 · none | none | § 6.10 |
| SHP | MDLM · 3–8 · none | none | § 6.11 |
| FLW | MDLM · 3–4 · none · reconnect | none | § 6.12 |
| PKO | MDLM · 3–6 · none · reconnect | none | § 6.4 |
| CJAR | MDLM · 3–8 · none · reconnect | none | § 6.9 |
| CLD | MDLM/Solo · 3–8 · none · bots | none | § 6.1 ✅ |
| COMB | MDLM · 3–4 · none · reconnect | none | § 6.2 |

A batch game graduates to its own card here at its R1.

## 6. Departures log

One line each: **game · rule departed · what instead · why**. Reviewed at every batch boundary:
promoted (the rule changes; the skill learns it), kept (a per-game exception), or rolled back.

| Game | Rule departed | What instead | Why | Review |
|---|---|---|---|---|
| — | *none yet* | | | |
