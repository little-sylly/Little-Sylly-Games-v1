# LI5 (Like I'm Five) — Implementation Notes

## Design Decisions

**Single-screen setup — no player name tracking**
LI5 tracks teams (Crayon Crew / Glue Stick Gang), not individual players. No Screen 2 for player names. The simplest team game in the suite.

**nono_list dual-use — Broad Shield + Natural Selection**
`nono_list[0]` serves as the Broad Shield in LI5 (describer cannot hint at the category) AND as The Mole's Grouping in NAT. Any edit to an animal's `nono_list[0]` affects both games. See Dual-Use Contract in `CLAUDE.md`.

**Sylly Mode — difficulty 3 words + intensity slider**
`isSylly` is derived at runtime as `difficulty === 3` — never stored. The intensity slider (`#sylly-pct-row`) is shown only when Sylly Mode is toggled ON. Uses the sub-options pattern (hidden div revealed on toggle).

---

## Bug Index

*(No bugs logged. Add entries here as issues are found and resolved.)*

---

## Multiplayer Lessons

**Mode: 2-Device Teams**
Host device = active describer team. Client device = `screen-li5-monitor` (Tattletale Sheet — shows current word + No-No List with CATCH! button).
`LI5_CATCH` is client → host; no auto score change — it alerts the host only.
`LI5_ROUND_START` syncs word + nonoList to client on each new card.

---

## Template Gaps

*(No gaps logged. Add entries here when patterns emerge that should fold into the tech template.)*
