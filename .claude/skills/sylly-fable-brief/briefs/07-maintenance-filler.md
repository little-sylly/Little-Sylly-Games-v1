# Task 7 — Maintenance filler

**Mode:** Fix · **Tier:** 0/1 each (escalate on evidence) · **Needs:** only when nothing above can move,
either because every open task is ⏸ on the owner or because a session has room left after its main stage
**Summary below written 12 Nov 2026 (SW v291).** Check it against the sources before relying on it.

## Why this

Fable shouldn't sit idle while the owner signs things off, and a session that finishes its stage early
has already paid its ~31k-token baseline. These items are real, small, need no phone, and are already
diagnosed in `docs/deferred-work.md`. They aren't the reason for a Fable run. They fill its gaps.

## How to work it

- **Re-check each item in `docs/deferred-work.md` before starting.** Items get resolved and moved to
  `deferred-work-log.md`, and this list will drift.
- Take a batch of 2–4 items into one pass: the `docs/templates/task-bug-polish.md` intake per item, one
  implementation pass, **one** closure pass at the end (CLAUDE.md § Batching rule).
- Skip anything already taken by task 3 (multiplayer) or a game whose revamp pass is open (do it there).

## The pick order

1. **E.T.A.: the Ride `reveal` lines are sent but never shown.** `ETA_PROOF.reveal` carries each Ride's
   fact, but the Proof note builds its own line. Show it as the note's second line or drop it from the
   packet. That's paired copy in `docs/game-identities/eta.md`. Run the ETA loopback.
2. **HSG Practice lesson 9 overflows by ~16 px at 320×452** (the lantern beam; `hsg-implementation-notes`
   DD-14). Measure first (lessons L7).
3. **`visual-lounge.js`'s keyboard dial check is stale** (27/29 on committed code). Step to
   `LOU_TAB_ORDER.indexOf('dial')` read from the page, and clear `__sfx` after the presses.
4. **Reduced motion in RAF loops: NT's playback and CLD's floe replay + idle sway.** This is a design call
   per animation ("show the end state, skip the journey"). CLD's resting position *is* the result, so
   decide what its end state is before coding it. Probably a Tier 1 each.
5. **GM Bug Index noise:** close G4/G5/G6 in `gm-implementation-notes.md` (fixed in code) unless task 2
   already did.
6. **Reconnect adoption for the next MDLM game**, longest matches first (`docs/deferred-work.md`
   § Reconnect adoption: a serialiser, a strip, pause/resume; `verify-mp-configs.js` § 7 pins the list).
   This is Tier 2, so only take it with a whole session free. Prefer a game whose revamp is far down the
   batch order.

**Not filler, even though it's listed in deferred-work:** anything that needs a phone or a live table
(the retest backlog, the balance flags, the controller stickers' on-device pass), anything waiting on an
owner decision (HSG Sylly Mode, PKO Stragglers), and the lobby redesign's remainder (owner decisions
pending).

## Progress log

*(one line per item: date · item · commit · resolved / escalated / dropped)*
