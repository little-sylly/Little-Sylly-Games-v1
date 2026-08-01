# Phase Snapshot — Phase 38: Force of Nature (PKO Sylly Mode) (1 Aug 2026, SW v150)

**Type:** Sylly Mode build for an existing game (Phase 2 of Pecking Order) + three-device playtest gate.
**Follows:** Phase 37 (Pecking Order, game 17 — core loop shipped inert Sylly Mode toggle, D02).
**Gold Master:** unchanged at 17 games + multiplayer — this phase completes game 17 rather than adding a new one.

---

## Confluence Snapshot

**Decision:** Force of Nature ships as Pecking Order's Sylly Mode — nine events (fixed opener Invasive Mimicry + eight drawn per Encounter: The Culling, The Great Reversal, The Deluge, The Dry Season, Extinction Event, Migration, Alpha, Carrion), the Mimic as a 15th chain entry, and a multi-winner `pkoResolveClash(winnerIdxs)`. Dark Forest was cut before build (D26). Built across SW v149 → v150, with round 4 raising the interstitial dwell to 5 s and adding the event-roster overlay, and round 5 — the deferred three-device pass — running clean with no code changes required.

**Rationale:** the brief's own §7 known-issues banner (Carrion/Clash-win ordering, the Deluge/Dry-Season skip loop, Extinction Event scoring, Dark Forest's cost, stale Hoard-size arithmetic, Mimic-as-sole-wild) was mostly solvable by *placement* rather than new rules — an empty-Hoard check that runs before Carrion opens, a draw gate that deletes the skip loop instead of capping it (D34), a Mimic resolved at play time so the core data structures never learn it exists (D33). Round 4 found that a mechanic changing the rules for a whole Encounter needs to stay visible for the whole Encounter, not just the 2.5 s it was announced in — hence the header + roster overlay.

**Technical Impact:** `js/games/pko.js` grew by the event registry, the Mimic resolution seam (`pkoResolveGroup`), Carrion's deferred-resolution window, and the private-hand repair pattern (`pkoSyncHand`/`pkoSyncAllHands`) that closes BUG-02. New screens/overlays: `screen-pko-event`, `pko-carrion-overlay`, `pko-events-overlay`. New harness `tools/verify-pko-events.js` (148 checks) alongside chain (68) and loop (132) — all three green throughout. SW `v148 → v150`.

---

## Playtest Rounds 4–5 Results

| Round | What ran | Result |
|---|---|---|
| 4 | 3-player session, non-host moving first, first live exposure to Force of Nature | No blocking bug. Found: 2.5 s interstitial dwell too short for event name + blurb; event identity invisible after the interstitial closed |
| 5 | 3-player session, SW v150, non-host moving first, the deferred multi-device pass (plan Task 12) | **Clean.** Several Encounters played — Stake, Challenge, Retreat, event interstitials at 5 s — no mirror desync, no frozen fan, no dead button |

**What round 5 confirms:** the exact failure class BUG-02 was (a client's Hoard never repairing after it played its own cards) did not recur under the shape of session most likely to surface it — non-host acting first, several turns played. That is the check TG-07 said no headless harness could give, closed by the only thing that can close it.

**What round 5 does not independently confirm:** `PKO_CARRION_OPEN` (spec gap C5) opening the Carrion overlay on a client's device. No Challenge in the played Encounters happened to beat a Mark on a client's turn, so this stays verified by static code audit rather than a live overlay open — every Hoard-mutation site is confirmed paired with a repair call, and the SYNC is confirmed sent unconditionally and handled unconditionally on receipt. See D38.

---

## Changes Shipped (v149 → v150, this phase)

1. **One dwell constant for both interstitials.** `PKO_EVENT_SCREEN_MS` (2.5 s) replaced by `PKO_INTERSTITIAL_MS = 5000`, shared by `screen-pko-event` and `screen-pko-unchallenged`, deliberately equal to `PKO_CARRION_WINDOW_MS` (D35).
2. **The live event stays on screen for the whole Encounter.** Table header reads `Clash X · Encounter Y · [emoji] [Event]`; `[?]` opens the new `pko-events-overlay` — the full nine-event roster rendered from `PKO_EVENTS` with rules copy in `PKO_EVENT_DETAIL` (D36). Header gated on synced event state, not the Sylly Mode flag (D37).
3. **Events harness extended** to 148 checks — registry↔`PKO_EVENT_DETAIL`↔`PKO_EVENT_SOUND` coverage, dwell-equality assertion.
4. **Three-device pass (Task 12) run and confirmed clean** — no code change resulted; this is the D38 entry.

---

## Files Touched (this phase)

| File | Change |
|---|---|
| `js/games/pko.js` | event registry + appliers, Mimic resolution seam, Carrion window, `pkoSyncHand`/`pkoSyncAllHands` private-hand repair, `pkoRenderEvents`, `PKO_INTERSTITIAL_MS` |
| `index.html` | `screen-pko-event`, `pko-carrion-overlay`, `pko-events-overlay`, table header event span + `[?]` |
| `data/pko-data.json` | +Mimic entry (15th chain id) |
| `css/styles.css` | `.pko-event-live` and Force of Nature card/overlay styles |
| `js/engine.js` | teardown for the three new overlays |
| `sw.js` | `CACHE_NAME` v148 → v150 |
| `tools/verify-pko-events.js` | new — 148 checks, extended to 148 at v150 |
| `docs/new-game-tech-pecking-order-fon.md` | Stage 2 spec (confirmed) |
| `docs/rules/game-identities.md` | § Game 17 → Force of Nature section |
| `docs/code-map.md` | new screens/overlays/functions |
| `docs/implementation-notes/pko-implementation-notes.md` | D25–D38, TG-08/09/10 |
| `docs/decision-log.md` | three entries (v149 build, v150 registry pattern, phase gate closed) |
| `CLAUDE.md` | Current Focus |

---

## Deferred / Not Yet Done

- **`PKO_CARRION_OPEN` on a client device** was not independently exercised live in round 5 — stays on code-audit confidence, not a witnessed overlay open. Worth confirming opportunistically next time Carrion comes up in a session, no dedicated re-test scheduled.
- Nothing else outstanding from the Force of Nature build — spec, harnesses, and both playtest rounds are closed out.

---

## Verification

- `tools/verify-pko-chain.js` — 68/68 PASS (both Appetites, plus the Mimic's data-layer checks).
- `tools/verify-pko-loop.js` — 132/132 PASS (core loop, Swarm, table-fan mixed answers, joint Clash resolution).
- `tools/verify-pko-events.js` — 148/148 PASS (registry, Mimic resolution, Carrion, Alpha, all nine events).
- Live: playtest rounds 4 and 5 (3 players each, non-host moving first), round 5 on SW v150 with no bugs found.

---
