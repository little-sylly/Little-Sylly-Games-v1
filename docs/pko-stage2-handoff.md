# Pecking Order — Stage 2 Handoff
**Purpose:** Unblock the Stage 2 gate. Five open questions + nine deviations need the project owner's answers before any code is written.
**Written:** 31 July 2026
**For:** a fresh session with no prior context.

> **To start the new session, paste:**
> *"Read `docs/pko-stage2-handoff.md`. I've filled in the Answer Block at the bottom — apply my answers to the Pecking Order tech spec and then start Stage 3."*

---

## 1. Where things stand

Pecking Order (`pko`) is game **17** for Little Sylly Games — an adjacency-based climbing/shedding card game. Same family as Big Two or the suite's own PASS, but "who eats whom" replaces numeric rank: a Leopard beats a Mongoose because Leopard is Mongoose's actual predator, not because it's higher.

`docs/rules/new-game-process.md` defines three stages with hard gates.

| Stage | Status |
|---|---|
| **1 — Design Brief** | ✅ Complete. `docs/new-ideas/new-game-brief-pko.md` at **v7**. |
| **2 — Technical Spec** | 🟡 **Written, awaiting your sign-off.** `docs/new-game-tech-pecking-order.md`. |
| **3 — Implementation** | ⛔ Blocked. Not one line of game code until Stage 2 is confirmed. |

Also done: **Protocol C** (pre-game studio sweep) passed. Its Part 1 harvest found three lessons flagged "candidate for elevation" that had never been actioned, and all three landed on PKO, so they were elevated into the rule files:
- Accumulator arrays must reset **in the SYNC payload**, not just locally → `.claude/rules/logic-engine.md`
- Single-source card/board arithmetic for any rule-mutating mode → `.claude/rules/logic-engine.md`
- Transient animations must float in an absolute layer, never sit in the flow → `.claude/rules/ui-style.md`

**What's left:** §16 Questions **1, 4, 5, 6, 7** (numbering has gaps — 2 and 3 were resolved already) and confirmation of §17's nine deviations **D1–D9**.

---

## 2. Vocabulary — enough to answer the questions

| Term | Meaning |
|---|---|
| **Hoard** | Your hand of cards. Private. |
| **Clash** | One round. Ends when a player empties their Hoard; that player scores 1 point. |
| **Match** | First to the target Clash wins (default 3). |
| **Encounter** | One trick/exchange within a Clash. |
| **Stake** | The opening play of an Encounter. One species only; each card becomes its own Mark. |
| **Mark** | One card on the table that must be answered. **Always exactly one card — never a stack.** |
| **Challenge** | A response. Must beat *every* Mark, one card per Mark, or you can't play at all. |
| **Stampede** | The only same-species mechanic. When every Mark is the same species, play N+1 of that species to take the whole board. Result: N+1 *separate* single-card Marks. |
| **Retreat** | Pass. Not a lock-out — you can rejoin later in the same Encounter when the board changes. |
| **Unchallenged** | Everyone else Retreated. You win the Encounter and lead the next. |
| **Poacher** | The Human wildcard. Wins any one Mark outright. That's all it does. |
| **Watering Hole** | The discard pile. |
| **The Trail** | Match log. **The Hierarchy** — the game-over screen. |

**The chain** (this *is* the whole rules engine — X is beaten by Y, nothing else touches X except a Poacher or a Stampede):

| Card | Beaten by | | Card | Beaten by |
|---|---|---|---|---|
| Mouse | Mongoose, Eagle | | Fish | Mongoose, Octopus, Eagle |
| Mongoose | Eagle, Leopard | | Octopus | Seal |
| Leopard | Bear | | Seal | Polar Bear |
| **Eagle** | **nothing** | | Polar Bear | Orca |
| Bear | Elephant | | Orca | Stingray |
| Elephant | Bee | | Stingray | Orca |
| Bee | Bear | | Poacher | nothing |

Four things that look like bugs and aren't: **Eagle has no predator** (dead-end branch, not an apex); **Eagle and Leopard are siblings** (both beat Mongoose, neither beats the other); **Orca↔Stingray is a closed pair**; **Mongoose and Eagle are the only cross-track reach** (both beat Fish) — so track-locking is emergent, never a coded rule.

---

## 3. Settled — do not reopen

These cost a full session each to settle. They are **not** open for reconsideration unless you explicitly say so.

**Core rules (brief v6):**
- **One card per Mark, always.** A Mark is a card id, not an array. No stacking anywhere, ever.
- **Per-slot Swarm and the "Mob" concept are CUT — removed, not deferred.** Earlier drafts had them; they're gone. If you see "Swarm" anywhere outside a struck-through note, it's stale.
- **Stampede is the sole same-species mechanic**, and produces N+1 separate single-card Marks.
- **Poacher is solo-only.** Wins one Mark. Cannot be Staked as an animal, cannot pad a Stampede threshold.
- **Eagle's dead end is accepted by design.** On a mixed board only a Poacher answers an Eagle.
- **First Leader of a Match is random.** (The old "whoever holds a Giant-Killer opens" rule from `docs/new-ideas/concepts-only/pecking-order-ruleset.md` is dropped — it required inspecting private Hoards before play.)

**Balance (brief v7):**
- Eagle `1.5n` → **5 / 6 / 8 / 9** copies at n=3/4/5/6 (`Math.ceil`, not `Math.round`)
- Poacher default `n` — one per player
- Hoard Size **12**, options 10 / 12 / 15
- Pool totals **110 / 146 / 183 / 219**; dealt ratio ~33%, constant across table sizes
- Match length **~25–35 min** at 3 Clashes, 4 players

**Scope:**
- **MDLM only** (every player on their own device). No pass-the-phone, no single-device mode.
- **Force of Nature — the entire Sylly Mode, all 10 events, the Mimic card — is Phase 2.** v1 is the core loop only.
- Challenge builder: **two tap-based input methods, no drag.** Tap-hold is reserved for the chain diagram.

**⚠️ Winner-leads-next is deliberately KEPT.** `pecking-order-ruleset.md` flags it as "the one rule most likely to get revisited," and a cold session reading that file will probably surface it as a snowball risk. It was analysed and rejected: a Challenge sheds *exactly* as many cards as the Stake did, so shedding throughput is symmetric between Leader and responders. The Leader's edge is only *selection* (which species leaves your hand) and *width control*. See spec §18.

---

## 4. The open questions

### 🔴 Q1 — What is a Poacher once it's on the board? **(BLOCKING)**

**The situation.** You Challenge a three-Mark board with `[Bear, Poacher, Polar Bear]`. The Poacher wins its Mark outright — fine, that's its job. But your three cards are now the new Marks, so **there is a Poacher sitting on the table as a Mark**. Its `beaten_by` list is empty. As the rules currently read, nobody can ever beat it except with another Poacher.

**Why it matters.** It effectively ends the Encounter — you go Unchallenged, you lead the next Encounter, and leading is how you dump your unplayable bottom-tier cards. So a Poacher is worth roughly "win this Encounter plus dump your Mice." At ~1.3 Poachers in play per Clash, that's a once-a-game moment rather than a strategy, which is why it may be fine.

This surfaced late — while replaying the §14 sample Encounters against the finalised rules — so unlike the other questions it has no prior discussion behind it.

| | Option | Consequence |
|---|---|---|
| **(a)** | **Stays as an unbeatable Mark** | Thematic — "The Poacher answers to no one." Playing one is close to a guaranteed Unchallenged. Board size unchanged. |
| **(b)** | **Goes to the Watering Hole; its slot is removed** | The board *shrinks* by one Mark — the only shrinking mechanic in the game. Makes the Poacher a board-control tool rather than a win button. Adds a second board-mutation path to build and test. |
| **(c)** | **Stays as a Mark, beatable by anything** | Weakest option. The Poacher becomes a one-shot removal with a downside, and "answers to no one" stops being true the moment it lands. |

**Recommendation: (a).** It's the only reading where the card's own tagline stays true, it's the simplest to implement (no special-case board mutation), and the scarcity does the balancing. If playtest shows Poachers deciding too many Encounters, the Poacher Cards setting already has a `None` option and a `Three` option to dial it back — you don't need a rules change.

**Downstream:** §7 validation rules, and §11's board-state packets if (b).

---

### Q4 — Sound

The suite is **Web Audio synthesis only — no audio files, ever** (hard constraint in `CLAUDE.md`). Brief §19 lists 20 sound moments, and several can't be built as written.

**Buildable, spec'd as four new engine functions** (game-specific `play*()` in `engine.js` is precedented — DSD has `playSonarPing`, `playHullThud`, `playAbyssThud`):

| Function | Moment | Sound |
|---|---|---|
| `playStampede()` | Stampede confirmed | Sub-bass swell + rising filtered noise, ~1.2 s |
| `playUnchallenged()` | Winning an Encounter | Rising three-note sting |
| `playPoacher()` | Poacher played | Dry mechanical click + metallic ring — deliberately out-of-ecosystem |
| `playClashWin()` | Emptying your Hoard | Deepened `playSuccess()` |

**Not buildable as briefed** — these are sample-based and have no honest synth equivalent: *triumphant animal call*, *apex predator roar*, *night insects*, *herd thunder*, *scavenge crunch*. The four functions above are my re-briefs toward abstract textures. The rest of §19's moments map to existing engine functions (`playWhoosh` for Retreat, `playBoing` for invalid taps, and so on).

**Recommendation:** build the four, accept the re-briefs, drop the rest. Say so if any specific moment matters more than the others.

---

### Q5 — The Hierarchy screen's buttons

Brief §18 gives the game-over screen two CTAs: **"Enter the Wild"** (play again) and **"Abandon Territory?"** (quit). Two problems with the second: "Abandon Territory" is the game's *quit-mid-game* vocabulary being reused for a game that's already over, and it has a question mark on a button.

House rules: post-game ✕ routes to `resetToLobby()`, and every play-again must go through a decision modal — never restart directly.

**Recommendation:** keep "Enter the Wild" for play-again (with its confirm modal), and make the quit CTA a plain **"Leave"**.

---

### Q6 — Art delivery

Brief §9A specifies ~53 illustrated assets (15 card faces × 3 crops + game-level art), shipped as **core precached files** rather than an optional skin pack, per `docs/new-ideas/pko-art-style-checklist.md` (style locked: painterly gouache, earthy naturalist).

Two things to settle:

**(a) Emoji fallback.** §9A says "no emoji fallback at launch." Fine as a *shipping* statement — but the render seam should still fall back to emoji when art is missing, so implementation isn't blocked on ~53 NanoBanana generations. It costs one `||` branch and the art drops in later with a SW bump.

**(b) Byte budget.** PKO would be the **first game in the suite to precache bitmap art**. Worth a ceiling before generation starts, not after: WebP at ~30–40 KB/card → ~2 MB install.

**Recommendation:** emoji fallback yes; WebP with a 40 KB/card ceiling.

---

### Q7 — The Sylly Mode settings card in v1

Force of Nature is Phase 2, so a Sylly Mode toggle in v1 would be a **visible control that does nothing**.

But `ui-style.md` mandates a `✨ Sylly Mode` card as the last card in every game's settings overlay, and the how-to overlay standard wants a Sylly Mode step card too. Whichever way this goes, it's a documented exception needing a Phase-Gate audit note.

| Option | Trade-off |
|---|---|
| **Omit the card entirely** *(recommended)* | Nothing misleading ships. `pkoSyllyMode` stays in state and in `mpSerialiseSettings`, so Phase 2 is a pure addition. Breaks the "every game has one" standard. |
| **Show it disabled with "Coming soon"** | Keeps the standard's shape and signposts the roadmap. But a greyed dead control in a shipped game reads as a bug to anyone who doesn't know the roadmap. |

**Recommendation:** omit it. A visible dead toggle is worse than an absent one.

---

## 5. The nine deviations — confirm or reject

These are places the spec departs from the brief. All are already applied in the spec; confirming is the default.

| # | Change | Why |
|---|---|---|
| D1 | Challenge builder is a **full screen**, not an overlay | Needs Marks row + slot row + full Hoard fan at once; an overlay caps at 80vh |
| D2 | **No player-setup screen** | MDLM: names already populated from the lobby. Building it creates a dead screen |
| D3 | No `skin` parameter — seam calls `assetFace('pko', id)` | The shipped cartridge system already does exactly what the brief asked for |
| D4 | **7 new screens**, not the 14 listed | 4 are shared MP templates, 1 is D2, 1 is Phase 2, 1 is an overlay |
| D5 | Force of Nature → Phase 2 | Your decision, 31 July |
| D6 | Trail fully public in v1 | Dark Forest (which needed redaction) is Phase 2 |
| D7 | 4 new synth functions instead of 20 sound moments | No audio files in the suite — see Q4 |
| D8 | **14** card entries, not 15 | Mimic is Force-of-Nature-only → Phase 2 |
| **D9** ⚠️ | Hoard Size options `10 / 15 / 20` → **`10 / 12 / 15`** | **The one change you didn't ask for.** Dropping 20 removes the ~2-hour Match that Hoard 20 + Clashes-to-Win 7 allowed. Say the word and 20 comes back. |

---

## 6. What happens after you answer

1. Spec §16/§17 updated with your answers; §7 validation rules finalised against the Q1 ruling
2. **Protocol B** (`docs/rules/phase-audit.md`) Steps 1–4: skeleton → scaffold → flow verification → exit routing, *before* any game logic
3. Spec §15 implementation checklist, in order

Three items already flagged as the highest-risk parts of the build, so a fresh session doesn't have to rediscover them:

- **🔴 Host self-submission.** The host is a full player here and can Stake, Challenge, Stampede, Retreat, and confirm ready. `engine-multiplayer.js` silently **drops every envelope where `originId === syllyDeviceUid`**, so a host submitting via `mpSendEnvelope({type:'ACTION'})` is ignored and the game hangs. All five host actions must mutate state directly and broadcast the SYNC. This exact bug has already shipped in NT, JEC and YGI.
- **`pkoBeats(markId, cardId)` must be the only place legality is decided** — builder highlighting, confirm gating, host re-validation, Stampede availability. Phase 2's Great Reversal then becomes a one-line inversion instead of an edit at every call site.
- **Sound-button re-wiring.** PKO's HTML goes at the end of `index.html`, *after* the `<script>` block, so `engine.js`'s parse-time `querySelectorAll` can't reach it. Needs explicit re-wiring in `DOMContentLoaded`. NT, SHP and FLW all shipped this bug first; FRT is the reference fix.

---

## 7. Answer Block — fill this in

*Fill in below, save the file, then start the new session with the prompt at the top. Answering here rather than in chat means nothing gets lost in transcription.*

```
Q1 — Poacher on the board:        [ a / b / c ]
     Notes:

Q4 — Sound:                       [ build the four + drop the rest / other ]
     Notes:

Q5 — Hierarchy CTAs:              [ "Enter the Wild" + "Leave" / other ]
     Notes:

Q6 — Art delivery:
     (a) emoji fallback:          [ yes / no ]
     (b) byte budget:             [ 40 KB per card WebP / other ]
     Notes:

Q7 — Sylly Mode card in v1:       [ omit / show disabled ]
     Notes:

D1–D8 deviations:                 [ all confirmed / exceptions below ]
D9 (Hoard Size 20 dropped):       [ confirmed / put 20 back ]
     Notes:
```

---

## 8. File map

| File | What it is |
|---|---|
| `docs/new-game-tech-pecking-order.md` | **The spec.** §16 questions, §17 deviations, §18 balance model |
| `docs/new-ideas/new-game-brief-pko.md` | **The brief, v7.** Design intent, vocabulary, sample Encounters, How to Play copy |
| `docs/new-ideas/pko-art-style-checklist.md` | Art pipeline — style locked, per-card prompts, production checklist |
| `docs/new-ideas/concepts-only/pecking-order-ruleset.md` | ⚠️ **Superseded.** The original concept doc. Contains cut mechanics (Swarm, Status Ladder, Giant-Killer first-lead). Historical only — the brief wins |
| `docs/rules/new-game-process.md` | The three-stage protocol and its gates |
| `docs/rules/phase-audit.md` | Protocols A/B/C |
| `js/games/flw.js` | Reference implementation — MDLM private hands, card render seam |
| `js/engine-multiplayer.js` | `mpSendPrivate`, `mpStartPrivateListener`, `MP_GAME_CONFIGS` |
| `js/secret-mode.js` | `assetFace` / `assetBack` / `SM_GAMES` — the skin seam to reuse |
