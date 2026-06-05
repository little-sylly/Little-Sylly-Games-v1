# GM (Great Minds) — Implementation Notes

## Design Decisions

**Individual devices in multiplayer — no pass-gate**
Both players submit simultaneously on their own device. `gmStartInputPhase()` sets `gmActivePlayer = mpMyPlayerIdx` in Lobby Mode so both devices show the input screen at the same time. Firebase round-trip replaces the pass-gate + reveal-gate entirely.

**Social Override is host-only**
`btn-gm-override` is a no-op for clients — they wait for `GM_RESULT` SYNC from the host. The override overlay is shown only on the host device. The host broadcasts `GM_RESULT` with `isMatch: true`, `isOverride: true`, `overridePhrase`. Clients handle via `gmMpDisplayResult()`.

**Play-again in Lobby Mode — asymmetric**
Host confirm → `mpReturnToLobby()` (returns all devices to same-code lobby). Client confirm → `resetToLobby()` (leaves the session). This is the standard play-again pattern for all MDLM/PTP games.

**Name Persistence across games**
`gmPlayerNames[2]` survives between games (not reset by play-again). Settings and roster state persist; round state resets.

---

## Bug Index

*(No bugs logged. Add entries here as issues are found and resolved.)*

---

## Multiplayer Lessons

*(No lessons logged beyond what is in the multiplayer subsection of game-identities.md.)*

---

## Template Gaps

*(No gaps logged. Add entries here when patterns emerge that should fold into the tech template.)*
