# Phase Snapshot — Phase 43: the rooms finished, reconnect adopted, one cache bug fixed (28 Sep 2026, SW v232→v239)

**Type:** Architectural round (lobby polish + MP reconnect rollout) + a bug-fix release + a process cleanup. Not a phase gate — no game shipped or closed this round.
**Follows:** Phase 42 (the lobby's four layouts ship, SW v231).
**Gold Master:** unchanged — 20 games + multiplayer. This phase touched the lobby shell, the reconnect layer, and the service worker — no game code.

---

## Confluence Snapshot

**Decision:** Eight SW bumps (v232→v239) finished what Phase 42 opened. The lobby's three "flat" layouts
(Shelves, Classic, TV) were brought up to full rooms — a jukebox and a stickerbook each reachable through
a phone-friendly door, live idle animation on every controller, TV redesigned end to end. Client MP
reconnect shipped as a new capability (a drop is no longer indistinguishable from a quit) and three games
adopted it. One SW cache bug that could poison an offline install was found and fixed. A cleanup pass then
moved `wip/` out of git and archived shipped design material out of the repo.

**Rationale:** Phase 42 shipped the routing seam and the Lounge; the three other layouts and the
lobby's two "doors" (music, stickers) were still stand-ins. This round closed that gap layout by layout,
while a parallel thread (client reconnect) answered the multiplayer gap Phase 42 had explicitly deferred —
a dropped phone previously had no path back into a live match. The cache bug (BUG-23) was found while
explaining an unrelated missing sticker, not from a report — worth recording because it's the kind of
defect no harness in the suite is positioned to catch (a cache-write correctness issue, not a rules/packet
one).

**Technical Impact:** `js/lobby/*`, `js/controller.js`, `js/lounge/*`, `css/lobby.css`, `css/workshop.css`,
`css/jukebox.css` for the room work; `js/engine-multiplayer.js`, `js/engine.js`, `js/games/{comb,flw,pko,cjar}.js`,
`MP_GAME_CONFIGS` for reconnect; `sw.js` for both the jukebox/stickerbook precache additions and the v239
`swKeep()` fix. SW `v231 → v239`. Full record: `shared-implementation-notes.md` DD-43 through DD-50, ML-09,
BUG-23; `decision-log.md` 2026-09-25 through 2026-09-28.

---

## What shipped, version by version

| SW | What | Detail |
|----|------|--------|
| v232 | Controller animation round — the ornament's idle nudge springs home instead of random-walking edge-on; the Lounge's controller gets four idle beats (rumble, stick roll, pairing-light chase, a rare Konami hint that never unlocks). "Original" → **Classic** display label. No install change. | `shared-implementation-notes.md` DD-43 |
| v233 | The jukebox ships — tapping the Lounge's cat opens `screen-jukebox`. Songs play through `Music.hold()`, Music's one media element, kept through lobby navigation and let go the moment a game asks for its own track. Code precached (+~60 KB); the 26 songs + covers (~68 MB) are runtime-cached. | DD-44 |
| v234 | The Workshop becomes a room — paint \| controller \| sticker sheet side by side in the jukebox's plum room, no tabs (owner's pick of three lab designs). Randomise All becomes a glass die key. Sticker surface now paid on first pick-up, not on open. | DD-45 |
| v235 | The Workshop's phone tier: **Tool Belt** — below 860 px, Paint and Stickers become horizontal strips under the controller, reversibly swapped via `ctlLayoutPhone()`/`ctlLayoutWide()` (a `matchMedia`-driven pair, since CSS alone can't relocate an element across flex parents). Tested against the owner's own iPhone SE at three sizes. | DD-46 |
| v236 | **MDLM client reconnect** ships as a capability — the host freezes `rooms/{code}/seats` at `GAME_START` and watches per-connection presence; a seat gone 3 s is **Away**. A game opting in via the `reconnect` hook (`sendState`/`pause`/`resume`) pauses and the dropped phone gets a one-tap **Rejoin** prompt (`sylly_rejoin`); every other game still ends after a 20 s grace. Honeycomb Hills is the first adopter. | DD-47 |
| v237 | Reconnect adopted by **Flawless, Pecking Order, Cookie Jar** — each pauses only what acts *for* a seat (FLW's Appraisal Clock, CJAR's decision window + flip loop, PKO's Carrion window), never every timer. PKO gets its first loopback harness. | ML-09 |
| v238 | Shelves, Classic and TV brought up to the rooms — all three gain 🎵 Jukebox / 📒 Stickers doors (router `jukeboxOpen`/`stickerbookOpen`, closing back to whichever opened them) and live word-art text (`.sylly-wordmark`) replacing the fixed-aspect PNG lockup, which moves to the stickerbook's own header. TV redesigned: white ink on every brand fill, Bailed's sticker, a flip clock naming the game of the hour, a big idle controller with beats and a glance, sticker-fan shelf tiles, a hero pane, a swelling/hopping/waving rail. | DD-49, DD-50 |
| v239 | **Bug fix, not a feature** — all six `sw.js` runtime-cache writes (packs, music, stickers, lamp — manifest and file each) stored any response including a 404, so a file requested before it was pushed live could poison the cache for the whole SW version. Fixed with one helper, `swKeep()`, storing `status === 200` only. `CACHE_NAME` bumped so every device drops anything already poisoned. No game code touched. | `shared-implementation-notes.md` BUG-23 |

---

## Documentation Integrity Protocol — closure

| Step | Doc | Status |
|---|---|---|
| 1 | `docs/code-map.md` | ✅ current — each round's screen/state/function additions were written as part of its own DD entry (DD-43 through DD-50) |
| 2 | Game identity docs | n/a — no game touched this round |
| 3 | `CLAUDE.md` SW version + Current Focus | ✅ v239 entry present; the outgoing v231 entry was moved to `sw-changelog.md` at the time of each bump — no drift found |
| 4 | `logic-engine.md` / `ui-style.md` | ✅ Client Reconnect section, the Workshop's phone-tier note, and the Lobby layouts section (jukebox/stickerbook doors, TV redesign) are already in place from each shipping session |
| 5 | `docs/implementation-notes/shared-implementation-notes.md` | ✅ DD-43 through DD-50, ML-09 and BUG-23 all present with What happened → Root cause → Lesson |
| 6 | `docs/decision-log.md` | ✅ one entry per architectural round, 2026-09-25 through 2026-09-28 (reconnect, each room, the cleanup round) — already written at ship time, nothing added this pass |

**No doc updates were needed in this snapshot pass** — every round in this window closed its own
documentation at ship time; this snapshot is a rollup, not a catch-up.

---

## Files touched (this snapshot — doc-only)

| File | Change |
|---|---|
| `docs/phase43-snapshot.md` | This file |

All code for v232–v239 shipped across the sessions this rolls up (commits `88b1482`, `f0f1544`, `3d6ba74`,
`8f5de79`), plus the docs-only cleanup commit `7a1b37f`. Nothing in this snapshot pass changed code.

---

## Deferred / not done

Carried forward, all deliberate — full list: `docs/deferred-work.md`.

- **The owner's real-device pass** — a live multi-device MP session and phone/TV real-hardware checks for
  the lobby rooms are still outstanding; nothing here substitutes for them.
- **Reconnect's remaining adopters** — only Honeycomb Hills, Flawless, Pecking Order and Cookie Jar have
  the `reconnect` hook; every other MDLM game still ends a drop after the 20 s grace rather than offering
  rejoin.
- **Jukebox owner calls** — stand-in artist + covers, the soft-lock flag, song sizes — still open.
- **Stickerbook earning** — the earn loop, toast, placement, and its storage key remain deferred from
  Phase 42; unaffected by this round's door-wiring work.
- **`tools/verify-jec-loopback.js`** — pre-existing red (163/1), unrelated to this window, not
  investigated here.

---

## Verification

Harness counts as reported by each round's own shipping session (not re-run in this snapshot pass, which
is docs-only):

| Command | Result | From |
|---|---|---|
| `node tools/verify-lounge-props.js` | 1368 → 1371 | v232, v233 |
| `node tools/visual-lobby.js` | 76 → 94 → 112/113 (§14 pre-existing, Lounge) | v232 → v235 → v238 |
| `node tools/verify-lobby-router.js` | 228 → 261 | v233 → v238 |
| `node tools/visual-controller-stickers.js` | 55 → 59 | v234 → v235 |
| `node tools/verify-mp-reconnect.js` + `mutate-mp-reconnect.js` | 141 · 11/11 | v236 |
| `node tools/verify-comb-loopback.js` | 294 | v236 |
| `node tools/verify-pko-loopback.js` (new) | 47 | v237 |
| `node tools/verify-flw-loopback.js` | 113 | v237 |
| `node tools/verify-cjar-loopback.js` | 213 | v237 |

**Phase gates: 37, 38, 39 and 41 remain CLOSED; phase 40 (Cold Shoulder) remains OPEN** — untouched by
this window, still named in `docs/phase40-snapshot.md` as needing a live multi-device session and the
offline install check.

**What none of this reaches.** No harness in the suite watches cache-write correctness (BUG-23's class of
bug) or real touch/GPU/clock-skew behaviour — the real-device pass above is what would have caught both
sooner.

---
