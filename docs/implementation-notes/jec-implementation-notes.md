# JEC (Just Enough Cooks) — Implementation Notes

## Design Decisions

**Naming collision — `applyExpansionOverrides`**
JEC uses `jecApplyExpansionOverrides()` with the `jec` prefix deliberately. The generic name `applyExpansionOverrides()` is already defined globally by `li5.js` (DSTW) and would be silently overwritten if reused. Always prefix game-specific expansion override functions.

**Sous Chef Oversight — ghost merge guard**
`jecApplyMerge(normA, normB)` checks that at least one norm exists in the frequency map before applying. If neither is present (ghost merge), it returns early with no effect. This prevents phantom merges when a player taps two items that both got normalised to the same key.

**The rework's unifying idea: modify the prompt, don't punish the answer. [27 Aug 2026]**
JEC's standard game was a single guess repeated N times, and every earlier attempt to add depth had
attacked the same axis — Menu Complexity made the *word* harder, the Poison Word made *other
players* costly. Neither changed what a Chef decides. Special Instructions instead bend the Order
itself (*Pizza …on a $5 budget*), which flattens the obvious answer at its source: with the twist
attached, "cheese" stops being everyone's automatic first write, so the Chef's Kiss band widens
without the tier table changing at all. Signature Dish and The Crutch then add two decisions *about*
the guess rather than more guessing. Everything punitive is retired.

**Sous Chef's Check is blind, and that is the whole mechanic. [27 Aug 2026]**
The merge used to run on a scored board — every count and badge already visible. A Chef could
therefore see that merging "Prosciutto" into "Persciutto" would lift their own ingredient from Table
for One to Chef's Kiss, and push for it. The fix was not a rule against self-interested merges but a
sub-state that hasn't revealed anything yet: The Sifting now opens on an alphabetical, count-free
list, and only once the table has finished merging does The Tasting reveal what any of it was worth.
**Blindness removes the incentive rather than policing it** — there is nothing to enforce, so nothing
to get wrong. The setting OFF skips the sub-state whole.

**The Crutch never enters the pot. [27 Aug 2026]**
A prediction that also counted would be a submission, and a Chef could manufacture their own
Crowd-Pleaser by "predicting" a word they had already written. Two things enforce it: the input
rejects any of your own three at submit time, and `jecBuildFrequency()` reads `jecInputs` **alone**
by construction. The harness asserts the resulting count directly rather than trusting the comment —
a comment saying "we only read one source" is not a test that we only read one source.

**Every bonus is one number. [27 Aug 2026]**
Called It! and On the Menu! both pay `jecBonusValue()` — half The Sweet Spot. The game therefore
carries one bonus magnitude that scales with the jackpot setting, rather than three constants that
would each need re-balancing when the setting moves.

**Poisoned status overrides all other statuses** — *retired 27 Aug 2026 with Kitchen Nightmares; kept for history.*
Kitchen Nightmares (Sylly Mode): Poisoned = 0 pts, overrides Golden/Spoilt/Rotten. This is evaluated first in the scoring function. Signature Dish (ingredient slot 0) is the only exception — it can still double if Golden and not Poisoned.

**Inverse proportional scoring (Phase 28 and earlier)**
Replaced in Phase 29. Was: `Math.round(jecGoldenScore * (goldenMax - count + 2) / goldenMax)`. Caused "scoring seems off" feedback — players felt punished for being almost-right.

**Tiered positive scoring (Phase 29 — current)**
New `jecCalcPoints(count, N)`: count=2 = full `jecGoldenScore` jackpot; count 3 to N−1 = half; count=N = 15% token reward; count=1 = 0 pts. No negatives by default — penalties (−5 unmatched, −2×count all-matched) are opt-in toggles defaulting OFF. Default `jecGoldenScore` raised from 20 → 30. This flips the philosophy from punitive to reward-driven: players chase jackpots rather than avoid mistakes. *Badge labels were renamed again in the 27 Aug 2026 rework — the current four are Table for One 🍽️, Chef's Kiss ✨, Crowd-Pleaser 👌, Too Many Cooks! 🍲.*

**Opt-in penalty priority in scoring loop**
When both penalties are ON, they override the tier reward for that count (not added on top). If the Table for One Penalty is ON and count=1, deduct 5 and skip the tier calc. If the Crowded Kitchen Tax is ON and count=N, deduct count×2 and skip the token reward. This prevents double-counting (e.g. token reward + penalty simultaneously).

**Menu Complexity's static description named the wrong tiers — DD-13 value line added. [13 Aug 2026]**
Found during the suite-wide DD-13 sweep (`ui-style.md` § Settings Card Standard): the Menu
Complexity card's description read "Family Dinner · Bistro Night · The Michelin Star" while the
pills actually say "Home Cook / Sous Chef / Head Chef" — three different tier names than the ones
on the buttons, a real copy bug (probably a stale draft from before the pills were renamed), not
just a missing value line. Fixed the description to describe what the setting controls generically
and added `#jec-val-difficulty` beneath the pills, populated by `jecUpdateFoodDifficultyVal()` —
**renamed `jecUpdateMenuVal()` on 27 Aug 2026 along with the setting itself (Menu Complexity → The
Menu, pills Everyday / Restaurant / Fine Dining)** — from the actual filter in
`jecBuildFoodPool` (`easy` = difficulty 1 only, `mixed` = difficulty ≤2, `hard` = difficulty 3
only). Called on load and on every pill click.

---

## Bug Index

**J1 — MDLM: game does not advance to sifting after all players submit**
What happened: In MDLM, all players see "Ingredients submitted — waiting for the other chefs…" but the sifting phase never begins.
Root cause: The host sends its own JEC_PREP_SUBMIT via `mpSendEnvelope`. However, `engine-multiplayer.js` silently drops all envelopes where `env.originId === window.syllyDeviceUid` (deduplication guard). So the host's own ACTION is never processed by `mpHandleEnvelope`. `jecMpReadyCheck[mpMyPlayerIdx]` is never set to `true`. `jecMpReadyCheck.every(Boolean)` never fires.
Fix: In `js/games/jec.js` `jecSubmitIngredients()`, when `syllyMultiplayerMode === 'host'`, process the host's own submission directly (mark readycheck, check all-ready, broadcast JEC_SIFTING if complete) instead of sending via envelope.
Status: Fixed Phase 28. The 27 Aug 2026 rework extracted the shared tail into `jecHostResolveSifting()`, called from *both* the host's own submit path and the `JEC_PREP_SUBMIT` handler, so the two can no longer drift — and applied the identical pattern to the new name-vote matrix.

**J2 — The penalty numbers disagreed across three surfaces (June 2026 audit, RESOLVED 27 Aug 2026)**
What happened: The How to Play overlay's "Winning and Scoring" card said "A Bit Pongy — (penalty on:
−10 pts)" where the code and the settings copy both said −5, and its Too Many Cooks line said "−2 per
extra Chef" where the formula is −2 per Chef who picked it **including you**.
Root cause: How-to copy written against the pre-Phase-29 penalty values and never re-synced after the
scoring redesign.
Resolution: all three sites corrected — the how-to card, the settings overlay's two penalty
descriptions, and `js/secret-mode.js`, which carries its own copy of the JEC settings strings for the
Terminal. The rewritten how-to also lists all **six** scoring outcomes rather than three, and the tax
line now says "including you" in both places it appears.
Lesson: **a value stated in copy has as many sites as the app has surfaces.** The third site was in
`secret-mode.js`, which no amount of reading `index.html` would have surfaced — and the spec that
opened this bug named only one site. **Grep for the number, not the sentence**: searching `−10` found
in seconds what re-reading the prose had missed twice.

**J3 — Client-side Sous Chef merges are unguarded in Lobby Mode (June 2026 audit, RESOLVED)**
What happened: The Multiplayer Lessons section below claims "Clients cannot initiate merges" — but nothing enforced it. `jecHandleOversightTap()` is wired on every device whenever the setting is on, and `jecApplyMerge()` only *broadcasts* when host — a client tapping two cards merges locally with no ACTION sent, silently diverging from the table until the next Host SYNC overwrites (or never).
Root cause: The host-only contract existed in documentation, not in code.
Resolution (June 2026): Added a `jecCanOversee()` helper and routed every oversight affordance through it — the hint, the card cursor styling, and their click listeners. Clients now render a fully read-only board; merges arrive only via the `JEC_MERGE` SYNC. Added a belt-and-braces `if (window.syllyMultiplayerMode === 'client') return;` at the top of `jecHandleOversightTap()`. Host + single-device behaviour unchanged.
Lesson: Every "host-only" interaction needs a `syllyMultiplayerMode === 'client'` early-return, not just an absent broadcast branch — and the interactive *affordance* (cursor/listener/hint) should be suppressed too, so a client never sees a tappable-looking control that does nothing.

**J4 — Sifting/tally CTAs not host-gated in Lobby Mode (June 2026 audit, RESOLVED)**
What happened: The Sifting's advance CTA and "Next Course" had no client guard. A client tapping the first ran `jecCalcRoundScores()` locally (mutating `jecScores` + pushing a duplicate `jecRoundLog` entry) and self-navigated to tally; tapping Next Course ran `jecStartRound()` locally, popping the client's own divergent word pool and flashing a wrong order word until `JEC_ORDER` arrived. The `JEC_NEXT_ROUND` SYNC handler itself caused the same transient on well-behaved clients.
Root cause: Phase-22 JEC relied on players not tapping; no host-only CTA pattern existed yet (the GTH host-gate pattern came later, Phase 30).
Resolution (June 2026): Added `if (window.syllyMultiplayerMode === 'client') return;` to both listeners (mirroring the J3 guard), plus a `jecSetAdvanceCta(btnId, liveLabel)` helper rendering a disabled "Waiting for the Head Chef…" label on clients. Dropped the redundant `JEC_NEXT_ROUND` broadcast — the Host's `jecStartRound()` already broadcasts `JEC_ORDER`, which fully drives clients into the next round; the `JEC_NEXT_ROUND` handler is now a defensive no-op. The 27 Aug 2026 rework applies the same gate to the two new advance CTAs (`btn-jec-check-proceed`, `btn-jec-name-vote-next`).
Lesson: A SYNC packet that fully drives a phase makes any *second* packet for the same transition not just redundant but harmful — it ran ahead with the client's own state. Prefer one authoritative packet per transition; gate every round-advance CTA host-only with a visible waiting state.

**J5 — The Signature double fired outside the Golden range (27 Aug 2026, RESOLVED)**
What happened: the identity doc had always said a Signature Dish doubles "if it lands Golden", and
the code doubled any ingredient whose points were positive — which silently includes the Too Many
Cooks token. A Chef backing the table's most obvious word got a doubled token instead of nothing
extra, exactly inverting the mechanic's intent.
Root cause: the badge helper returned a status string with no way to *express* "the Golden range", so
the implementation reached for the nearest available proxy, `pts > 0`. It agreed with the doc for two
of the four tiers, which is why it survived review.
Lesson: **when a rule names a range, the code needs a predicate for that range.** `jecIsGolden(key)`
now exists and is the only test; a proxy that happens to agree today is a bug waiting for the tier
table to change.

**J6 — The contextual tip overlay had no opener at all (27 Aug 2026, RESOLVED)**
What happened: `jec-help-tip-overlay`, its injector `jecShowHelpTip()`, its close-button listener and
its `resetToLobby()` teardown entry all shipped and all worked. Nothing anywhere called the injector.
The overlay had been unreachable since the day it landed.
Root cause: the opener was lost or never written, and **no tier of verification can see this**. The
rules harnesses run with `getElementById: () => null`, so absent DOM is indistinguishable from present
DOM; the loopback executes render but only along paths a packet drives; `visual-check` only looks at
screens it is told to open. Nothing asserts that a built overlay is reachable.
Resolution: three inline `[?]` icons on the Prep screen (Signature, Crutch, Fusion name) now open it,
and the injector takes three bullets per `ui-style.md` § Contextual Tip Icons rather than one string.
Lesson: dead UI is invisible by construction. The cheap check is a grep at closure time — for each
overlay id in a game, confirm at least one `style.display = 'flex'` **and** at least one listener that
leads to it.

---

## Multiplayer Lessons

**Sous Chef's Check in MDLM**
Host runs all sifting and all merges. Merges are broadcast via `JEC_MERGE` so every device repaints the
blind Check list. Clients cannot initiate merges — enforced via `jecCanOversee()` plus a client
early-return in `jecHandleOversightTap()` (see J3). `JEC_TASTING` then carries the final board **once
more** on the way into The Tasting, so a client that dropped a `JEC_MERGE` is repaired before a single
point is scored.

**A new interactive screen needs THREE packets, not two. [27 Aug 2026]**
The spec's § 7.1 table gave Name the Dish a client→host vote (`JEC_NAME_VOTE`) and a host→all result
(`JEC_NAME_RESULT`) — and nothing to put the clients on the ballot in the first place, or to give them
the same list of names to vote on. `JEC_NAME_VOTE_BEGIN` is the missing third. Generalise: **enter,
submit, resolve.** A missing-handler audit that walks *submissions* finds the middle one and misses the
other two, because the entry packet is nobody's submission. Fold this into the Stage 2 audit.

**A readiness gate must be checked in the mode where its array is EMPTY. [27 Aug 2026]**
`jecHostCheckVotes()` guards `jecMpVoteCheck.length !== jecPlayerCount` before `.every(Boolean)`,
because `[].every()` is `true` — a vacuously-open gate resolves the ballot on the first tap while
later seats never voted. This is the CJAR BUG-05 shape arriving in a second game; the matrix is now
sized in `jecStartRound()` *and* in the `JEC_ORDER` applier, and the guard makes that a stated
requirement rather than an assumption.

**MDLM host readycheck pattern (applies to all games with a readyCheck matrix)**
`engine-multiplayer.js` drops all envelopes where `originId === syllyDeviceUid` as a deduplication
guard. This means the host's own ACTION envelopes are NEVER processed by `mpHandleEnvelope`. Any
readyCheck update that relies on the ACTION handler will silently skip the host's slot. Fix pattern:
when `syllyMultiplayerMode === 'host'`, process the host's own submission directly in the game's submit
function (mark readycheck, check `.every(Boolean)`, broadcast SYNC if all ready). Do NOT send via
envelope for host-owned submissions in readyCheck games. JEC now does this in two places — prep
submission and the name vote.

**Polish (June 2026 audit): `jec-new-shift-overlay` is z-[80]** — **CLOSED 27 Aug 2026, verified already
z-[90]** in `index.html`. The item had been fixed at some point without the note being updated;
re-reading the markup was the whole check.

---

## Template Gaps

**Future design: Option A (Phase 29) — still parked**
Option A (Secret Sous-Chef): Device secretly pairs each player with one other chef; big bonus for
matching your assigned partner. Adds social dynamics and cross-table groans. Requires a Firebase
targeted write for pairing or a shared-state derivation. Good for MDLM.

**Option B (Kitchen Chaos Roles) — CLOSED 27 Aug 2026, superseded.** Hidden per-round agendas were the
same instinct the rework rejected: they make the game adversarial without making the central guess more
interesting. Special Instructions cover the "each round feels different" half at a fraction of the
structural cost, and The Crutch covers the "read the table" half. Do not reopen.

**A harness must be proven to go RED before it is trusted GREEN. [27 Aug 2026]**
Two sections of `verify-jec-loop.js` were first written as assertions that could not fail — comparing a
value against itself after both sides had been derived from the same call. They passed against a
deliberately broken build. Every section now has a recorded mutation that turns it red, and
`verify-jec-loopback.js` takes `JEC_SRC=` so a broken copy can be driven through the same wire.

**A defensive fallback can hide the defect it defends against. [27 Aug 2026]**
The Tally's bonus applier was first written as `(b && b.signature) || b0` — falling back to a plausible
default when a payload field was missing. That is exactly the shape that makes a dropped field
invisible: the screen renders, the number is wrong, nothing complains. The fallback is now `|| 0`,
which renders visibly empty if a field really is missing. **Defend against malformed input by failing
legibly, not by guessing.**

**A crash inside a SYNC applier strands the device, so every applier is safety-critical. [27 Aug 2026]**
Two appliers in this rework called a render function before the state it reads had been rebuilt. The
throw escapes through `mpHandleEnvelope`, the SYNC is never applied, and that device sits on the
previous screen forever while the rest of the table moves on. Both were invisible to the rules harness
(`getElementById: () => null` short-circuits every render guard) and were caught only because the
loopback runs a **real mock DOM**. A loopback without one proves nothing about render.
