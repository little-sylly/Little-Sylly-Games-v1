# LTTP (Late to the Party) — Implementation Notes

## Design Decisions

**Small Talk Helper — always routes through confirm overlay**
The guided path (Small Talk Helper ON) opens `lttp-smalltalk-overlay` first. Selecting a prompt pre-fills `lttp-confirm-overlay` and closes the smalltalk overlay. `lttp-confirm-overlay` is always the final step regardless of mode. The "Other" tab opens the confirm modal with an empty input — typed reminder text in the Other tab is not transferred.

**History schema uses `messageText` only**
`lttpPendingTag` was removed. History records are `{ asker, asked, plan, messageText: "string" }` — the final typed message only, regardless of guided/free-text mode.

**Contacts — local only, never synced**
Map annotations and Contacts status/notes are local to each device in Lobby Mode. They are intentionally not synced — each player maintains their own suspicion tracking. This is a deliberate privacy/UX decision, not a gap.

**Rotating folder hints — global index, not per-player**
The hint index increments globally each time any folder is opened (6 phrases per role, cycles via modulo). This means the same device cycling through multiple players' folders will show sequential hints, not the same hint repeated.

---

## Bug Index

*(No bugs logged. Add entries here as issues are found and resolved.)*

---

## Multiplayer Lessons

**Message interrupt fires on ALL devices simultaneously**
`mp-lttp-message-interrupt-overlay` (z-[105]) is shown on every device when any player sends a message. Passive devices (not the active player) have `.lttp-send-trigger` and `#btn-lttp-confirm-send` locked.

---

## Template Gaps

*(No gaps logged. Add entries here when patterns emerge that should fold into the tech template.)*
