# Phase Snapshot — Phase 45: Hide and Shogun built, polished and gated (11–12 Nov 2026, SW v278→v289)

**Type:** Phase gate — `docs/rules/phase-audit.md` Protocol A for game 22, Hide and Shogun (`hsg`).
**Follows:** Phase 44 (E.T.A., SW v272→v277). The UI revamp's LI5 pilot ran between them under its own tracker.
**Gold Master:** 20 games + multiplayer, unchanged. **Hide and Shogun passes Protocol A; phase 45 stays OPEN on one
item** — a live two-phone session (§ What keeps it open).

---

## Confluence Snapshot

**Decision:** Hide and Shogun, the suite's second new game built world-first and its first two-player duel, passes
its phase gate at SW v289. The gate found no code-vs-docs drift in screens, overlays, timers or settings. It found
one documentation gap: `code-map.md` had no HSG section at all, `definitions.md` still listed `hsg` as reserved, and
`per-game-classes.md` and `CLAUDE.md`'s Quick Index had no HSG row. All are closed. No gameplay changed in S13.

**Rationale:** the build ran as thirteen small stages (S1–S13) each of which updated its own impl notes, tracker line
and harness doc, so the cross-cutting references (code-map, class tables, roster, collision list) were nobody's stage
until closure. Phase 44 found the same gap for E.T.A. The phase stays open because a green harness is not a played
game: the Castle, the two-tap door and the moments have been measured at three phone sizes and played against bots,
but not on two real phones over real Firebase.

**Technical Impact:** no runtime code. `sw.js` `CACHE_NAME` v288 → v289 (the identity doc and snapshot are not
precached; the bump keeps the one-version-per-deploy rule). New: `docs/game-identities/hsg.md`,
`docs/phase45-snapshot.md`. Updated: `docs/code-map.md` (offset-map row + a full HSG section), `per-game-classes.md`
(Tables A–C), `.claude/rules/definitions.md` (22 games; `hsg` active), `new-game-brief-template.md` (roster + taken
list), `CLAUDE.md`, `sw-changelog.md`, the impl notes (DD-15), `deferred-work.md`, `decision-log.md`.
`MP_PROTOCOL_VERSION` stays v265.

---

## What shipped in the phase, version by version

| SW | What | Detail |
|----|------|--------|
| v278 | **S3 — registration + shells:** game 22 in the box (`allScreens[]`, `resetToLobby()`, slider/toggle maps, lobby button), the menu, the War Council, the Rules tab. S1 (rules lift, `verify-hsg-rules`) and S2 (the state machine, headless) are the commits before it | `hsg-implementation-notes` — |
| v279 | **S4 — the Castle on one phone:** a Pass-the-Phone Battle start to finish; fixed-height board, tap-tap, the two-tap door, drag | DD-01–DD-03, BUG-01, TG-01, TG-02 |
| v280 | **S5 — the Storyteller:** the Intro scene and the Battle intro (fan toss) | DD-04, DD-05, TG-03 |
| v281 | **S6 — the War Chronicle:** both end screens from one painter | DD-06 |
| v282 | **S7 — multi-device:** the five packets, the client path, standby, the quit contract | ML-01–ML-03, BUG-02 |
| v283 | **S8 — bots and Solo:** Easy / Medium / Hard over the masked view | DD-07, ML-04 |
| v284 | **S9 — reconnect and the moments:** `reconnect` adopted; the door slide, banners, fox stamp, cracking Guard ring, lanterns, strike, Found you!; `playPaperSlide()` | DD-08, DD-09, ML-05, ML-06 |
| v285 | **S10 — the Household** gallery tab, Honour Seals carry their clan | DD-10, DD-11 |
| v286–v287 | **S11 — Practice:** nine lessons; then the Shogun wears Guarded / Exposed on his tile | DD-12, DD-13 |
| v288 | **S12 — polish and measure:** three phone sizes, the 7 px flag floor, short-phone How-to sheet, critique fixes (28/36) | DD-14 |
| v289 | **S13 — this closure** | DD-15 |


---

## Protocol A — results

### 1. Drift check — code vs docs
| Check | Result |
|---|---|
| Screen IDs (plugin ↔ markup ↔ identity doc T7a ↔ `allScreens[]`) | ✅ the same seven `screen-hsg-*` in all four |
| Overlay IDs | ✅ all four `hsg-*-overlay` in markup, the identity doc and `resetToLobby()` |
| Settings (T6 ↔ `let hsg*` defaults) | ✅ Campaign First to 3, Foxes A Skulk, no Sylly toggle |
| Rules (T2 / T3 ↔ `hsg-rules.js`) | ✅ 13 pieces per clan, 4 foxes, 30 doors, Last Lantern 12, `verify-hsg-rules` pins them |
| Class tables / roster | ❌ → ✅ **fixed:** no HSG row in Tables A–C or the Quick Index; the brief-template roster was still "in design" |
| Collision list (`definitions.md`) | ❌ → ✅ **fixed:** `hsg` was "reserved"; now active, count 22 |
| `code-map.md` | ❌ → ✅ **fixed:** no HSG section; now screens, overlays, state, key functions, packets, the TV public-state line, tools |
| Identity doc | ❌ → ✅ **written** (first draft claimed a sticker and a music track that do not exist; corrected) |
| SW precache | ✅ `hsg-rules.js`, `hsg-scene.js`, `hsg.js`, `css/hsg.css`; `CACHE_NAME` v289 |
| Lobby registries | ✅ `GAMES` entry, `GAME_BRAND_HEX`, slider and toggle maps; `hsg` in `LB_NO_STICKER` (no sticker yet) |

### 2. Technical-debt harvest
| Check | Result |
|---|---|
| Naked `setTimeout` | ✅ the only two are inside the named bags `hsgLater` and `hsgPracLater` |
| Timers cleared on every exit | ✅ `hsgTeardown()` (from `resetToLobby()`); `hsgStopTimers()` also clears the moments layer (ML-05) |
| `TODO` / `FIXME` | ✅ none in the plugin, rules, scene, CSS or partial |
| `window.` on `let`-declared MP globals | ✅ none |
| Host-only controls | ✅ the host applies its own Command directly; a client's Next Battle is an ACTION the host may refuse and repair |
| Overlays torn down | ✅ all four |
| Team-game / pass-gate / who-first items | n/a — two individuals, nothing private to one player, so no pass gates; the Battle 1 fan toss is the game's own |

### 3. Linguistic integrity
✅ No generic strings (Game Over / Score / Points). No retired term in code or markup (Vault, Exposed, Long Night,
Daimyo, Geisha, …). No US spelling in copy. `verify-identity-docs` asserts 100 strings in the identity doc.

### 4. Mobile-first layout
✅ Measured at S12 (375×667, 375×548, 320×452): the Castle fits with no scroll, tiles 58 / 54 / 38 px; no sideways scroll.
The Battle intro is fixed-height; the Chronicles are Stacks. 🔊 / ✕ / `[?]` are 44×44. One known overshoot: Practice
lesson 9 at 320×452 (~16 px). Departures from the Stack and the motion cap are logged on `docs/ui-revamp-rollout.md`.

### 5. Close out — archive
Not done at this gate, deliberately: the brief (`docs/new-game-brief-hide-and-shogun.md`) and tech spec
(`docs/new-game-tech-hsg.md`) stay in the repo until the live session has run, as E.T.A.'s did until its own
gate. The owner moves them to the external archive when the phase closes (`phase-audit.md` § 5).

---

## Documentation Integrity Protocol — closure

| Step | Doc | Status |
|---|---|---|
| 1 | `docs/code-map.md` | ✅ offset-map row + HSG section |
| 2 | `docs/game-identities/hsg.md` | ✅ T1–T10 |
| 3 | `CLAUDE.md` | ✅ SW v289; v288 moved verbatim to `sw-changelog.md`; suite line 22 games; Quick Index row 22; phase 45 |
| 4 | `logic-engine.md` / `ui-style.md` | ✅ no new universal rule (the candidate lines TG-01 / TG-03 / TG-04 wait for a second game to repeat them). `definitions.md` and `per-game-classes.md` updated |
| 5 | `hsg-implementation-notes.md` | ✅ DD-15 |
| 6 | `docs/deferred-work.md` | ✅ a Hide and Shogun section; no older entry named HSG, so none to resolve |
| 7 | `docs/decision-log.md` | ✅ 2026-11-12 (Phase 45) |

---

## What keeps it open

**A live two-phone session** of the current build, plus the offline install check. Watch: the Open? two-tap on a
thumb, the Battle intro's length with real names, whether the Last Lantern's count is understood, the moments over
real Firebase ordering, and a Hard bot Battle. Close the phase when that has run and its findings are triaged; a
finding is not a reopen.

## Deferred / not done

Carried forward, all deliberate — `docs/deferred-work.md` § Hide and Shogun: the lobby sticker, the music track,
Sylly Mode, the Forfeit Chronicle variant, Practice lesson 9 at 320×452, and the balance log from human Battles.

---

## Verification

Run at SW v289, after the last edit:

| Command | Result |
|---|---|
| `node tools/verify-hsg-rules.js` | 35 ✅ |
| `node tools/verify-hsg.js` | 180 ✅ |
| `node tools/verify-hsg-loopback.js` | 221 ✅ |
| `node tools/verify-hsg-bots.js` | 155 ✅ |
| `node tools/verify-hsg-practice.js` | 66 ✅ |
| `node tools/verify-game-intro.js` | 178 ✅ |
| `node tools/verify-mp-configs.js` | ✅ |
| `node tools/verify-mp-reconnect.js` | 152 ✅ |
| `node tools/verify-tv-labels.js` | 9 ✅ |
| `node tools/verify-identity-docs.js` | ✅ (hsg: 100 strings) |
| `node tools/verify-build-fresh.js` | ✅ |

**Phase gates:** 37, 38, 39 and 41 closed; **40 (Cold Shoulder) open**; **44 (E.T.A.) open on R15**; **45 (Hide and
Shogun) passed, open on the live session**.

**What none of this reaches.** Real Firebase ordering, real thumbs, and whether a fox win feels like a comeback or a
coin toss. That is the live session's job.
