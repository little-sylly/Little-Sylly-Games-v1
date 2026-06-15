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
