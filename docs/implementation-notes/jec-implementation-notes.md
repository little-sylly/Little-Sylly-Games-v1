# JEC (Just Enough Cooks) — Implementation Notes

## Design Decisions

**Naming collision — `applyExpansionOverrides`**
JEC uses `jecApplyExpansionOverrides()` with the `jec` prefix deliberately. The generic name `applyExpansionOverrides()` is already defined globally by `li5.js` (DSTW) and would be silently overwritten if reused. Always prefix game-specific expansion override functions.

**Sous Chef Oversight — ghost merge guard**
`jecApplyMerge(normA, normB)` checks that at least one norm exists in the frequency map before applying. If neither is present (ghost merge), it returns early with no effect. This prevents phantom merges when a player taps two items that both got normalised to the same key.

**Poisoned status overrides all other statuses**
Kitchen Nightmares (Sylly Mode): Poisoned = 0 pts, overrides Golden/Spoilt/Rotten. This is evaluated first in the scoring function. Signature Dish (ingredient slot 0) is the only exception — it can still double if Golden and not Poisoned.

**Inverse proportional scoring (Phase 28 and earlier)**
Replaced in Phase 29. Was: `Math.round(jecGoldenScore * (goldenMax - count + 2) / goldenMax)`. Caused "scoring seems off" feedback — players felt punished for being almost-right.

**Tiered positive scoring (Phase 29 — current)**
New `jecCalcPoints(count, N)`: count=2 = full `jecGoldenScore` jackpot; count 3 to N−1 = half; count=N = 15% token reward; count=1 = 0 pts. No negatives by default — penalties (Rotten −5, Spoilt −count×2) are opt-in toggles defaulting OFF. Default `jecGoldenScore` raised from 20 → 30. This flips the philosophy from punitive to reward-driven: players chase jackpots rather than avoid mistakes. Sifting badge labels updated: "Chef's Kiss! ✨" (count=2), "Nice Match! 👌" (count 3+, Golden range), "Too Many Cooks! 🍲" (all-N), "A Bit Pongy! 🤢" (unique).

**Opt-in penalty priority in scoring loop**
When both Rotten or Spoilt penalties are ON, they override the tier reward for that count (not added on top). If Rotten penalty is ON and count=1, deduct 5 and skip the tier calc. If Spoilt penalty is ON and count=N, deduct count×2 and skip the token reward. This prevents double-counting (e.g. token reward + penalty simultaneously).

---

## Bug Index

**J1 — MDLM: game does not advance to sifting after all players submit**
What happened: In MDLM, all players see "Ingredients submitted — waiting for the other chefs…" but the sifting phase never begins.
Root cause: The host sends its own JEC_PREP_SUBMIT via `mpSendEnvelope`. However, `engine-multiplayer.js` line 486 silently drops all envelopes where `env.originId === window.syllyDeviceUid` (deduplication guard). So the host's own ACTION is never processed by `mpHandleEnvelope`. `jecMpReadyCheck[mpMyPlayerIdx]` is never set to `true`. `jecMpReadyCheck.every(Boolean)` never fires.
Fix: In `js/games/jec.js` `jecSubmitIngredients()`, when `syllyMultiplayerMode === 'host'`, process the host's own submission directly (mark readycheck, check all-ready, broadcast JEC_SIFTING if complete) instead of sending via envelope.
Status: Fixed Phase 28.

**J2 — How-to overlay states the wrong Rotten penalty (June 2026 audit, open)**
What happened: The "Winning and Scoring" card says "A Bit Pongy — (penalty on: −10 pts)". The actual Rotten penalty is −5 (code `roundScores[p] -= 5` and the settings-card copy both say −5). The same card's Too Many Cooks line says "−2 per extra Chef" where the formula is −2 per Chef who picked it (including you).
Root cause: How-to copy written against the pre-Phase-29 penalty values and never re-synced after the scoring redesign.
Lesson: A scoring redesign must sweep every place the numbers appear — code, settings copy, how-to copy, game-identities.

**J3 — Client-side Sous Chef merges are unguarded in Lobby Mode (June 2026 audit, RESOLVED)**
What happened: The Multiplayer Lessons section below claims "Clients cannot initiate merges" — but nothing enforced it. `jecHandleOversightTap()` is wired on every device whenever `jecSousChefOversight` is on, and `jecApplyMerge()` only *broadcasts* when host — a client tapping two cards merges locally with no ACTION sent, silently diverging from the table until the next Host SYNC overwrites (or never).
Root cause: The host-only contract existed in documentation, not in code.
Resolution (June 2026): Added a `jecCanOversee()` helper (`jecSousChefOversight && window.syllyMultiplayerMode !== 'client'`) and routed every oversight affordance through it — the oversight hint, the sift-card + poison-chip cursor styling, and their click listeners. Clients now render a fully read-only sifting board; merges arrive only via the `JEC_MERGE` SYNC (which re-renders via the pure `jecRenderSifting`). Added a belt-and-braces `if (window.syllyMultiplayerMode === 'client') return;` at the top of `jecHandleOversightTap()`. Host + single-device behaviour unchanged.
Lesson: Every "host-only" interaction needs a `syllyMultiplayerMode === 'client'` early-return, not just an absent broadcast branch — and the interactive *affordance* (cursor/listener/hint) should be suppressed too, so a client never sees a tappable-looking control that does nothing.

**J4 — Sifting/tally CTAs not host-gated in Lobby Mode (June 2026 audit, RESOLVED)**
What happened: "The Taste Test!" and "Next Course" have no client guard. A client tapping Taste Test runs `jecCalcRoundScores()` locally (mutating `jecScores` + pushing a duplicate `jecRoundLog` entry) and self-navigates to tally; tapping Next Course runs `jecStartRound()` locally, popping the client's own divergent word pool and flashing a wrong order word until `JEC_ORDER` arrives. The `JEC_NEXT_ROUND` SYNC handler itself causes the same transient on well-behaved clients (it calls full `jecStartRound()` instead of waiting for `JEC_ORDER`).
Root cause: Phase-22 JEC relied on players not tapping; no host-only CTA pattern existed yet (the GTH host-gate pattern came later, Phase 30).
Resolution (June 2026): Added `if (window.syllyMultiplayerMode === 'client') return;` to both the `btn-jec-sifting-proceed` and `btn-jec-tally-next` listeners (mirroring the J3 oversight guard). Added a `jecSetAdvanceCta(btnId, liveLabel)` helper that renders a disabled "Waiting for the Head Chef…" label on clients (`disabled = true`, `opacity = 0.5` — the GTH host-gate visual) and the live label on host/single-device; called from `jecStartSifting()` (proceed CTA) and `jecRenderTally()` (next CTA). Dropped the redundant `JEC_NEXT_ROUND` broadcast from the host tally-next path — the Host's `jecStartRound()` already broadcasts `JEC_ORDER`, which fully drives clients into the next round; the `JEC_NEXT_ROUND` SYNC handler is now a defensive no-op. Host + single-device behaviour unchanged.
Lesson: A SYNC packet that fully drives a phase (JEC_ORDER resets word/round/inputs and shows the screen) makes any *second* packet for the same transition (JEC_NEXT_ROUND) not just redundant but harmful — it ran ahead with the client's own state. Prefer one authoritative packet per transition; gate every round-advance CTA host-only with a visible waiting state.

---

## Multiplayer Lessons

**Sous Chef Oversight in MDLM**
Host runs all sifting + Sous Chef oversight. All merges are broadcast via `JEC_MERGE` so all devices stay in sync. Clients cannot initiate merges — enforced in code via `jecCanOversee()` (oversight affordances are host/single-device only) plus a client early-return in `jecHandleOversightTap()` (see Bug J3, RESOLVED June 2026).

**Polish (June 2026 audit): `jec-new-shift-overlay` is z-[80]** — play-again confirmation modals are z-[90] per `logic-engine.md` § Play-Again Confirmation.

**MDLM host readycheck pattern (applies to all games with a readyCheck matrix)**
`engine-multiplayer.js` line 486 drops all envelopes where `originId === syllyDeviceUid` as a deduplication guard. This means the host's own ACTION envelopes are NEVER processed by `mpHandleEnvelope`. Any readyCheck update that relies on the ACTION handler will silently skip the host's slot. Fix pattern: when `syllyMultiplayerMode === 'host'`, process the host's own submission directly in the game's submit function (mark readycheck, check `.every(Boolean)`, broadcast SYNC if all ready). Do NOT send via envelope for host-owned submissions in readyCheck games.

---

## Template Gaps

**Future design: Options A and B (Phase 29)**
Option A (Secret Sous-Chef): Device secretly pairs each player with one other chef; big bonus for matching your assigned partner. Adds social dynamics and cross-table groans. Requires Firebase targeted write for pairing or a shared-state derivation. Good for MDLM.
Option B (Kitchen Chaos Roles): Each round assigns a hidden agenda (Head Chef wants popular words, Fusion Chef wants exact 2-match, Health Inspector sabotages). Adds bluffing/deduction. Significantly changes game structure. Review design separately before implementing either option.
