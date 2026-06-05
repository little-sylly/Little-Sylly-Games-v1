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

*(No bugs logged. Add entries here as issues are found and resolved.)*

---

## Multiplayer Lessons

*(No lessons logged beyond what is in the multiplayer subsection of game-identities.md.)*

---

## Template Gaps

*(No gaps logged. Add entries here when patterns emerge that should fold into the tech template.)*
