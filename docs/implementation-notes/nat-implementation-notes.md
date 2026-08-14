# NAT (Natural Selection) — Implementation Notes

## Design Decisions

**Three-tier information model — nono_list dual-use**
Lead Biologist → full animal name. Field Researchers → one word each from `nono_list[1–9]` (shuffled, non-repeating). The Mole → `nono_list[0]` only (the Documentary Label / Broad Shield). This dual-use contract means every animal's `nono_list[0]` must be a Documentary Label (e.g. "Sea Creature"), never a scientific class name, and `nono_list[1–9]` must be distinctive and non-redundant (no 3+ synonyms for the same trait). Changes to any animal affect both LI5 and NAT.

**Sylly Mode — no Lead Biologist**
In Survival of the Fittest mode, all players (including the position normally assigned Biologist) receive detail words from `nono_list[1–9]`. The Mole still receives `nono_list[0]`. The Daily Review screen (`screen-nat-daily-review`) is a full screen (not an overlay) shown between the last Observation Day and The Selection.

**Eviction tie-break — `-1` path**
When `natEvictedIdx === -1` (unresolved tie), no player name is shown in The Last Stand. Instead: "No consensus reached — The Mole escapes." is displayed and the Mole is not forced to guess. Scoring proceeds normally (Mole gets escape points).

**Handover skipped in Lobby Mode**
`screen-nat-handover` is skipped in multiplayer. `SYNC: NAT_ACTIVE_PLAYER` drives who can input and who sees a standby placeholder. Each device renders only its own role (couch security — same pattern as BLD).

**Centred content layout — reference implementation**
NAT's observation screen is the canonical example of the `min-h-screen overflow-y-auto flex items-center justify-center` centred layout pattern. BLD adopted this pattern in Round 4b. Future games with content-first screens (no sticky CTA) should reference NAT.

**Habitat Intro screen added, second item of the deferred Round/Night Intro sweep. [13 Aug 2026]**
`deferred-work.md` named "NAT expeditions" as a candidate for `ui-style.md` § Round/Night Intro
Screen (CJAR Raid / SHP Night / PKO Clash were the precedent). The Habitat is NAT's repeating
match-round unit — a new Specimen and role assignment every time `natCurrentMatch` advances — so
`screen-nat-habitat-intro` sits between `natAssignRoles()` and the first clue round, shown by
`natShowHabitatIntro(onDone)`. Unlike PKO (both sides self-time), NAT follows the
screen-pko-unchallenged shape: only host/single times its own advance into `natStartClueRound()`
(a host decision — the clue order and Day 1 role reveal aren't computed yet), while the client
applier (`NAT_MATCH_START` in `engine-multiplayer.js`) calls it with no `onDone` and just displays
the beat while it waits for the `NAT_ACTIVE_PLAYER` SYNC that already followed this moment before
the screen existed — so this doubles as a small UX fix for clients, who previously sat on whatever
screen they were last on (Setup or the previous Tally) with no visual acknowledgement that a new
Habitat had begun. Flavour text (`NAT_HABITAT_FLAVOUR`) is host-picked and rides in `flavourIdx`
inside `NAT_MATCH_START`, never chosen locally. A Sylly Mode note (no Lead Biologist this Habitat)
shows only when `natSyllyMode` is on.
**Changed:** `js/games/nat.js`, `js/engine-multiplayer.js`, `index.html`, `js/engine.js`
(`allScreens[]`). SW bumped v179 → v180. **Verification:** syntax-checked only — **NAT has no
`tools/verify-*.js` harness**, so this is unverified beyond `node -c` and has not been played live.
**Ruled out in the same pass:** GTH was also named in the deferred item but does not actually fit
the pattern — its Session runs once per match (not repeated), Patient Phase already announces each
disorder via `screen-gth-disorder-reveal` before every drawing, and Shrink Phase's Case-to-Case
transition happens inside one continuous countdown timer, where a forced pause would eat into the
player's decision budget. No change made to GTH; noted in `deferred-work.md` so it isn't
re-investigated.
**Deferred:** DYB/PASS hands still need the same treatment.

**Field Difficulty DD-13 value line added. [13 Aug 2026]** Found during the suite-wide DD-13 sweep
(`ui-style.md` § Settings Card Standard) — Common/Rare/Exotic gave no indication of the actual
tier cutoff each pulls from. Added `#nat-val-diff`, populated by a new `natUpdateDiffVal()`
(`js/games/nat.js`) from `natDifficulty` (`d1` = difficulty ≤1, `d1+d2` = difficulty ≤2, `all` =
difficulty ≤3 — see `natDrawSpecimen()`). NAT's pill state is read lazily from the DOM's active
pill class rather than kept live in `natDifficulty` until `natApplySettings()` runs (a different
architecture than most games' immediate-state-update pill handlers), so `natUpdateDiffVal()`
reads `document.querySelector('#nat-diff-group .pill-active-lime')` directly rather than trusting
the state var. Called on settings-overlay open and on every difficulty pill click. **Not verified
beyond syntax checks** — no `visual-check`, no live play.

---

## Bug Index

**N1 — MDLM: all devices show Lead Biologist role**
What happened: In MDLM, every device displays Lead Biologist's role information regardless of actual assignment. User reported "everyone was the same player (Lead Biologist)".
Root cause: The role reveal (handover screen) is skipped in MDLM. The replacement mechanism — each device displaying its own role based on `mpMyPlayerIdx` — is not implemented or is misrouted. All devices appear to render the Biologist's role unconditionally rather than filtering by `mpMyPlayerIdx`.
Fix: In the `NAT_MATCH_START` handler, after receiving all role assignments, each device must derive its own role from `mpMyPlayerIdx` and render only that role's information. A per-device role reveal state (brief screen showing "You are [role] — [your word]") is needed before the first observation.
Status: Fixed Phase 28.

**N2 — Selection voting + Last Stand not MP-distributed (audit June 2026)**
What happened: In Lobby Mode, the observation loop is fully synced (`NAT_ACTIVE_PLAYER` gates who inputs), the clue reveal is broadcast (`NAT_SELECTION`), and the final scores are authoritative (`NAT_TALLY`). But the voting phase in between carries **no packets** — `btn-nat-sel-start` (→ `natStartVoting`), the consensus/independent vote controls (`natSubmitConsensusVote` / `natSubmitVote`), the mole guess (`natSubmitMoleGuess`), and the Biologist verdict (`natBiologistVerdict`) have no `syllyMultiplayerMode` branch and no host gate. Every device runs its own local vote → eviction → Last Stand. `natStartVoting()` also applies the peer-review −5 deductions locally on whichever device taps it.
Root cause: `natMpVoteReadyCheck` is declared (`nat.js` line 58) and reset in two handlers (`NAT_MATCH_START`, `NAT_SELECTION`) but **read nowhere** — the intended per-device single-vote collection (each device submits its own player's vote, host aggregates) was scaffolded but never implemented. The Selection screen was treated as a synced reveal, but the vote that follows was left as the single-device pass-the-phone flow.
Impact: End state converges because the host's `NAT_TALLY` overwrites client scores, but the voting UX is broken in MDLM — the host device would have to enter votes for all (remote) players via pass-the-phone, and ungated clients can run divergent local votes/Last-Stands until the tally lands.
Lesson: Same class as SS Intel-Phase (S12), YGI Sudden Death (Y4), LTTP guess/gameover (L6) — a phase reachable after the core MP loop that was never given the MDLM missing-handler audit. Recurring across 4 games now → elevate as a rule (every phase including votes/tie-breaks/endgames needs the audit, not just the main loop).
Fix (RESOLVED, June 2026 — Group B, host-authoritative model): MDLM is always Independent voting (consensus is forced off), so only the independent path was built out. New packets: `NAT_DISPUTE` (ACTION+SYNC — peer-review disputes are host-authoritative so the −5 deductions stay consistent), `NAT_VOTE_START` (SYNC — host opens voting with peer-review-adjusted scores; clients never re-deduct), `NAT_VOTE` (ACTION — each device submits its own player's vote; host aggregates via `natMpVoteReadyCheck.every(Boolean)` — now actually read), `NAT_LAST_STAND` (SYNC — host broadcasts the eviction result; all devices enter the Last Stand together), `NAT_MOLE_GUESS` (ACTION — only the Mole's device guesses) → `NAT_BIO_PHASE` (SYNC), `NAT_BIO_VERDICT` (ACTION — only the Biologist's device rules; in Sylly the host adjudicates the group verdict), `NAT_GAMEOVER` (SYNC — host broadcasts the final report). `btn-nat-sel-start` and `btn-nat-tally-next` are host-only; non-active devices show standby states (vote recorded / Mole guessing / awaiting verdict / waiting for host) reusing existing screen elements plus one new `#nat-ls-standby` paragraph. Verified: `node --check` clean; all engine-called NAT functions resolve; `natMpVoteReadyCheck` now read in `natRenderVoterTurn`/`natSubmitVote`/`NAT_VOTE`. Needs live MDLM browser confirmation.

---

## Multiplayer Lessons

**Per-device role reveal must be explicitly implemented when handover is skipped**
In MDLM, any game that skips the handover screen (where private role info is shown) must have an explicit per-device role reveal mechanism driven by `mpMyPlayerIdx`. NAT's GAME_START handler broadcast all role data correctly, but there was no per-device render step. Each device must read its own slot from the payload using `mpMyPlayerIdx` and display only its own role.

**A synced reveal does not make the following vote synced (N2)**
`NAT_SELECTION` correctly broadcasts the clue reveal, which made the Selection screen *look* multiplayer-aware. But the vote, eviction, mole guess, and Biologist verdict that follow on the same screen had no packets and no host gate — so the "shared moment" was actually N independent local votes. When auditing any game where a synced screen is followed by interactive resolution, check each button on that screen for a `syllyMultiplayerMode` branch, not just the screen entry. The presence of a `*ReadyCheck` array that is reset but never read is a reliable tell that a per-device collection was scaffolded and abandoned.

---

## Template Gaps

**How-to overlay format consistency (Phase 28)**
NAT how-to was missing step numbering and detail paragraphs. Applied the 3-level standard: Step N tag → bold heading → detail paragraph. See ui-style.md How-to Overlay Style Standard added in Phase 28.

**Research log display — omit day labels (Phase 28)**
When Research Log is ON, clues were displayed with "Day 1 — clue / Day 2 — clue" labels. Changed to horizontal left-to-right clue display with no day labels — players can infer order. Applies to any game with a cumulative clue log.
