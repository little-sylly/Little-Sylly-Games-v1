---
name: sylly-fable-brief
description: "Little Sylly Games repo ONLY. Use when the owner wants to spend Fable 5.2 usage on this repo: triage, pick the mode, and write paste-ready Fable/Opus prompts with exact read lists for this codebase. Extends the account-level fable-brief skill; run it on Opus or Sonnet, never on Fable."
---

# Sylly Fable Brief

This adds repo detail to the account-level **`fable-brief`** skill. Use that skill's flow, modes (Sandwich
by default), bar rules and prompt templates as they are. This file supplies four things it can't know:
what a Fable session here costs before it starts, where Fable is worth using in this repo, the exact read
list for each area, and the override block every Fable prompt here needs.

## 1. What a session costs before it starts

Every session here auto-loads `CLAUDE.md` plus the three `.claude/rules/` files, about **150 KB, or ~38k
tokens** (measured 12 Nov 2026: CLAUDE.md 34 KB, ui-style 55 KB, logic-engine 51 KB, definitions 13 KB).
A Fable session pays that at Fable rates before reading a single task file. Two consequences:

- **One Fable session should cover a batch of work.** A batch of three review questions costs one baseline. Three separate sessions cost three.
- **Shrink the baseline before a run of Fable sessions** (instruction-file review, on Opus). Each KB cut is saved in every later session.

Check `.claude/settings.json` before the first run. If it pins `"model"`, every new session in the repo starts on that model.

## 2. Where Fable is worth using in this repo (ranked)

| Rank | Area | Mode | Why Fable here |
|---|---|---|---|
| 1 | **UI revamp pipeline**: review the standard after the LI5 pilot, before 21 more games go through it | Review, then Plan | The pipeline gets reused 21 times, so one fix to it saves 21 repeats of the same fix. Short output, lots of reading: the shape Fable suits best |
| 2 | **R2b Directions for a flagship game** (the three visual directions) | Build (the directions only) | This is taste work, where Fable's lead is biggest. A plan can't carry taste to a builder. Use it for 1–2 games, not all 21 |
| 3 | **Lounge baked set-piece (Blender → glTF)** | Plan, then a one-prop Build pilot | Taste matters and the pipeline is new. But it is a **cost-envelope change first** (see area card C) |
| 4 | **Shared-code / multiplayer audit** (Spark tier, sync, leave/rejoin) | Review | One bug here hits 22 games, and getting it exactly right matters |
| — | Instruction-file review, general optimisation, doc closure, single-game bugs | **Not Fable**: Opus or Sonnet | Every step can be described in advance |
| — | Security on its own | **Fold into area card D** | The only real attack surface is the Firebase rules plus client trust. One section of the audit covers it |

## 3. Facts a chat-written brief gets wrong (correct them in every prompt)

- Hosting is **Cloudflare Pages**, deployed from `main` with no build step. GitHub Pages is a second copy.
- **22 games**, not 20. Newest: `hsg` (Hide and Shogun) and `eta`.
- "No external libraries" is wrong. The rule is **no runtime CDN**: a library may be *vendored* (copied into `js/lib/`, precached) after a cost-envelope proposal. Vendored today: Tailwind, the Firebase SDK, Three.js **r128**. r128's `three.min.js` has **no GLTFLoader**.
- Fonts: Fredoka is the suite font, but a game's world may bring its own self-hosted fonts (ETA ships four). The main menus' typography is open.
- Asset sizes are **targets, not gates** (owner, 12 Nov 2026). Keep precached images lean; music and other runtime-cached content may run larger.
- Sessions open on **Opus 5.5** by default; Fable is rare and opt-in.
- UI revamp: Stage 0 is built and the **LI5 pilot is complete** (SW v264–v269). GM is next. Status lives in `docs/ui-revamp-rollout.md`.
- `CLAUDE-OFFLINE.md` doesn't exist. Arcade standing prompts: `js/arcade/arcade-cabinet-prompt.md` and `js/arcade/arcade-roster.md`.
- The Firebase rules live in `docs/multiplayer-feature-specification-v1.4.md` §2.7. Room cleanup: §5.

## 4. Where Fable writes its output

Write `PLAN.md` / `REVIEW.md` / `AUDIT.md` / `HANDOFF.md` to **`wip/fable/`**. That folder is git-ignored. **Never put them at the repo root.**
The site deploys straight from `main`, so a committed root `AUDIT.md` would be publicly served, weak
spots included. The Opus session that follows reads the files locally. If a finding should be kept,
the Opus fix session records it in the normal docs (impl-notes / decision-log).

## 5. The override block (paste into every Fable Plan or Review prompt)

CLAUDE.md has standing procedures that a literal reader would run during a review session. Turn them off by name:

```
This is a [review / planning] session: write only to wip/fable/, and edit no other file. For this
session only, these CLAUDE.md procedures do not apply: the Documentation Integrity Protocol, the
sylly-implementation-notes skill, the Current Focus / SW-entry housekeeping, the deferred-work sweep
and the decision-log entry. The Opus session after you does those. Skip the Triage Gate statement.
Close with one plain "what's next" line, without the picker tables. Don't read docs/code-map.md or
index.html whole: Grep for the identifier, then read the slice. If you start a subagent, use Sonnet.
```

## 6. Area cards: read lists for each prompt

Give Fable **only** the files listed for its area. Do not list a game's plugin file whole. Sample one or
two games and say which ones.

**A. UI revamp pipeline review**
Read: `docs/rules/ui-revamp.md` (12 KB, whole) · `docs/ui-revamp-lessons.md` (whole) ·
`docs/ui-revamp-rollout.md` (whole) · `docs/game-identities/li5.md` (whole) · spec
`docs/superpowers/specs/2026-11-08-ui-revamp-design.md` (§ 17 and the R-step list; Grep for anything else).
Ask: which R-steps cost the most in the LI5 pilot and could be cut or merged; what will break on a game
LI5 doesn't resemble (one sample each: a team game like `ss`, a hidden-role game like `bld`, a 2-player
board game like `hsg`); the order for the remaining 21 games. Bar: the LI5 pilot as shipped, plus a
time-per-game number.

**B. R2b Directions (Build mode, one game)**
Read: that game's identity doc (whole) · `docs/rules/ui-revamp.md` § R2b · `DESIGN.md` · `PRODUCT.md`.
Bar: the LI5 world kit as shipped, plus one named outside reference the owner attaches. The output is
three directions only. Opus or Sonnet builds the chosen one.

**C. Lounge baked set-piece**
Step 0 is **on Opus**: a short `docs/cost-envelope.md` proposal (§ 4 tiers, § 5 caching lever). It
covers vendoring GLTFLoader, and the size target for the `.glb` file plus the lightmap, measured against
the Lounge's current ~560 KB of procedural JS (`js/lounge/lounge-{lib,room,props}.js`). The owner
approves before Fable starts. The Lounge is also **slow to load on phones** and is the boot layout
(`js/lobby/lobby-router.js:27`), so any Lounge plan must load in stages: the shell first, props later.
Fable reads: the cost-envelope proposal · `docs/superpowers/specs/2026-09-19-premium-lounge-reblock-design.md` ·
`js/lounge/lounge-scene.js` lines ~100–260 (the lighting and shadows: a VSM sun with `autoUpdate=false`,
already frozen once). Baking adds bounce light and AO, which real-time lights here can't do. It is a
quality gain, not a speed fix, so the brief should not sell it as a speed fix.
Scope the pilot to **one hero prop** (e.g. the bookshelf's arcade cabinet), not the room.
Measurable half: the iPhone SE at 375×667 holds 60 fps, and the install delta stays under the agreed ceiling.
Account skills that apply: `blender-scripted-modelling` (script as source of truth, web export).

**D. Shared-code / multiplayer audit**
Read in slices, Grep first: `js/engine-multiplayer.js` (202 KB: the envelope router, `mpSendEnvelope`,
presence/rejoin, room teardown) · `js/engine-intro.js` · `js/lib/firebase-init.js` ·
`docs/multiplayer-feature-specification-v1.4.md` §2.7 + §5 · `docs/rules/mp-bots-reconnect.md`.
Sample games: `hsg` (newest, `reconnect` adopter) and one pre-helper game (`bld`).
Ask: Spark-tier exposure (simultaneous connections, download per month, rooms or `/events` that are never
deleted); rules that let a client write what only the host should; leave/drop paths that strand a device;
phone memory/offline/SW risks in `sw.js`. At most 5 top issues plus 15 more, with file:line evidence
and guesses marked as guesses.

## 7. Settings line additions

On top of `fable-brief`'s settings block, add: `Output: wip/fable/<FILE>.md`, and for repo sessions,
`Override block: included`. Effort `high`. The Sandwich's Opus build session follows this repo's normal
rules again (Triage Gate, impl-notes, doc closure).
