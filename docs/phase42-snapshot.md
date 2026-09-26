# Phase Snapshot — Phase 42: the lobby's four layouts (26 Sep 2026, SW v231)

**Type:** Architectural round (lobby redesign, production wiring) + phase gate.
**Follows:** Phase 41 (Honeycomb Hills, game 20) + the stickerbook achievements design round.
**Gold Master:** unchanged — 20 games + multiplayer. This phase touched the lobby shell, not a game.

---

## Confluence Snapshot

**Decision:** The lobby ships with four layouts — **the Lounge** (a 3D room, first on launch), **TV**,
**Shelves**, and **Original** (today's `screen-lobby`, kept verbatim) — switchable at any time, with
`lobbyShow()` as the single seam every exit from outside the lobby goes through. `wip/lobby-lab/` and
`wip/premium/` moved into `js/lounge/`, `js/lobby/` and `css/lobby.css` by a one-off scripted copy that
reproduced the sandbox's own harness counts exactly before anything else changed.

**Rationale:** The sandbox (`wip/premium/` → `wip/lobby-lab/`) had already answered the owner's design
questions — room read, controller integration, the switcher — across several review rounds; this phase
was the wiring round, converting a proven sandbox into the one thing a sandbox can never itself be: the
actual return path for all 20 games. The router-seam constraint (`lobbyShow()` only) is what keeps a
21st game from ever needing to know the lobby has more than one face.

**Technical Impact:** New `js/lounge/*` (the 3D room, `prm` prefix → `lou`) and `js/lobby/*` (layouts,
router, doors, host, `lb`/`tv`/`lobby` prefixes) modules, `css/lobby.css`. `lobbyShow()` replaces direct
`showScreen('screen-lobby')` at all four call sites that reach the lobby from outside it —
`resetToLobby()` (all 20 games' exits), both `secret-mode.js` returns, and the controller's idle nudge.
`controller.js` split its model from its renderer so the Lounge's controller shares the Workshop's
painted atlas without a second `buildBody`. SW `v230 → v231`, install **+770 KB (12.24 MB)**. Full
record: `shared-implementation-notes.md` DD-42.

---

## What shipped

Four ways to view the lobby, one router (`LobbyRouter.LOBBY_LAYOUTS`) that every switcher renders from
and every layout-unaware game launch (`lobbyLaunch(id)`) clicks through. Phones and no-WebGL devices
boot straight into Shelves; a phone plays the arrival beat once, then the Lounge is closed to it for the
session (it "was handed out"). Every "back to the lobby" — a game's ✕, the Terminal, the Workshop, the
stickerbook — returns to the layout the player left from, never a fixed screen. Stickerbook v1 ships
all-unlocked with nothing saved yet (the earning loop is deferred, see below); lamp photos are
runtime-cached, following the `data/packs/` split.

---

## Documentation Integrity Protocol — closure

Run in order per `CLAUDE.md`. All six confirmed current as of this phase.

| Step | Doc | Status |
|---|---|---|
| 1 | `docs/code-map.md` § Lobby layouts | ✅ already current — screen/state/function inventory written as part of DD-42 |
| 2 | Game identity docs | n/a — the lobby is not a game, no identity doc owns it |
| 3 | `CLAUDE.md` SW version + Current Focus + Per-Game Quick Index | ✅ already read v231 at session start; harness count for `visual-controller-stickers` corrected **48 → 52** (this session — the count had drifted since the sticker-race fix landed in the same round) |
| 4 | `logic-engine.md` / `ui-style.md` | ✅ Lobby Router Seam, the lobby's timers, the `screen-lounge`/`screen-tv` `h-screen` whitelist entries, and the Lobby layouts section header are all already in place from the shipping session |
| 5 | `docs/implementation-notes/shared-implementation-notes.md` | ✅ DD-42 present — what happened, root causes, lessons |
| 6 | `docs/decision-log.md` | Architectural decision — the lobby's routing seam and four-layout model — **already carries an entry** from the shipping session (25 Sep 2026); nothing further needed this pass |

**One doc updated this session:** `docs/deferred-work.md` § Lobby redesign — the owner's real-device pass
line, previously listed as fully outstanding, now reads: desktop browser confirmed clean (26 Sep 2026);
phone and TV still outstanding, picked up later, issues logged there as found.

---

## Files touched (this phase gate — doc-only; no code changed)

| File | Change |
|---|---|
| `docs/deferred-work.md` | Real-device pass line updated: desktop clean, phone/TV outstanding |
| `CLAUDE.md` | `visual-controller-stickers` harness count corrected 48 → 52 |
| `docs/phase42-snapshot.md` | This file |

The lobby redesign's actual code shipped in the prior session (commit `830ccba`, SW v231) — this phase
gate is the closure pass: verification re-run, docs confirmed current, and the one open finding (harness
count drift) fixed.

---

## Deferred / not done

Full list and detail: `docs/deferred-work.md` § Lobby redesign. Carried forward, all deliberate:

- **Controller animation round** — owner-prioritised next. Ornament and Lounge prop are both idle-static
  in v1.
- **Stickerbook earning** — the earn loop, toast, placement, and the localStorage key it needs (an owner
  decision — a new permitted key per `CLAUDE.md` § Anti-Patterns). The pure reducer ships and is
  harnessed (`tools/verify-achievements.js`), waiting on the data-source seam.
- **Stickerbook on phones** — unreachable in v1; planned via Shelves' dock and TV's header.
- **The fourth layout's label** — "Original" until renamed; one string in `LOBBY_LAYOUTS`.
- **Jukebox feature** — the owner's next round; v1's jukebox lights with real music but picks nothing.
- **The owner's real-device pass** — desktop browser confirmed clean (26 Sep 2026). Phone and TV still
  outstanding; the owner will pick this up later and any issue gets logged in `deferred-work.md` when it
  surfaces.
- **Archive `wip/lobby-lab/` + `wip/premium/`** out of the repo — safe (nothing in `js/`, `css/`, `src/`,
  `data/`, `sw.js` or `tools/` loads from `wip/`), just not yet done.

---

## Verification

Re-run this session, all at baseline (no regressions since the shipping commit):

| Command | Result |
|---|---|
| `node tools/visual-lobby.js` | ✅ 69/69 — real Chromium over the real `index.html`: boot tiering, every layout → game → quit, Workshop/gateway/Terminal returns, idle nudge, stickerbook, offline per source, stale mount, fade, resize floor |
| `node tools/verify-lobby-router.js` | ✅ 210/210 — pure router tier: layouts, every action incl. `home`/`closeSwitcher`, close-to-opener, the one-way rule, door map + `controllerParts` passthrough |
| `node tools/verify-lounge-props.js` | ✅ 1338/1338 — room and props under Node (vendored Three, stub canvas): every builder, host contract, painted-controller path, empty world |
| `node tools/visual-controller-stickers.js` | ✅ 52/52 — the tab, the book, texel painting, ornament repaint; **count corrected in CLAUDE.md (was 48)** |

**Known pre-existing red, unrelated to this phase:** `tools/verify-jec-loopback.js` (163/1) — red on
committed code before v231, untouched by the lobby round. Not investigated here; out of scope for this
gate.

**What none of this reaches.** No harness sees a real GPU, real touch, or how the Lounge actually feels
on a phone or a TV — that is exactly the gap the outstanding real-device pass exists to close.

---
