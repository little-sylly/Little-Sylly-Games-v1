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

---

## Multiplayer Lessons

**Per-device role reveal must be explicitly implemented when handover is skipped**
In MDLM, any game that skips the handover screen (where private role info is shown) must have an explicit per-device role reveal mechanism driven by `mpMyPlayerIdx`. NAT's GAME_START handler broadcast all role data correctly, but there was no per-device render step. Each device must read its own slot from the payload using `mpMyPlayerIdx` and display only its own role.

---

## Template Gaps

**How-to overlay format consistency (Phase 28)**
NAT how-to was missing step numbering and detail paragraphs. Applied the 3-level standard: Step N tag → bold heading → detail paragraph. See ui-style.md How-to Overlay Style Standard added in Phase 28.

**Research log display — omit day labels (Phase 28)**
When Research Log is ON, clues were displayed with "Day 1 — clue / Day 2 — clue" labels. Changed to horizontal left-to-right clue display with no day labels — players can infer order. Applies to any game with a cumulative clue log.
