# Phase Snapshot — Phase 44: E.T.A. built, played, rebuilt and gated (10–11 Nov 2026, SW v272→v277)

**Type:** Phase gate — `docs/rules/phase-audit.md` Protocol A for game 21, E.T.A. (`eta`).
**Follows:** Phase 43 (the rooms finished, reconnect adopted, SW v232→v239). The UI revamp's Stage 0 and the
LI5 pilot (SW v264–v269) ran in between under their own tracker, `docs/ui-revamp-rollout.md`.
**Gold Master:** 20 games + multiplayer, unchanged. **E.T.A. passes Protocol A; phase 44 stays OPEN on one item,
R15** — the ≥ 3-phone re-play of the current build (§ What keeps it open).

---

## Confluence Snapshot

**Decision:** E.T.A., the suite's first new game built world-first, passes its phase gate at SW v277. The gate
found no code-vs-docs drift in the rules, packets or settings. It found one layout defect: 🔊 and ✕ under 44 px
on every game screen, fixed in the gate itself. It also found documentation gaps: code-map had no State table and
a stale header, and the impl notes didn't carry the spec's decisions. Those are closed. The brief, spec, boards
and maths round are archived.

**Rationale:** the game was built, played once on three phones, reworked twice, and had its content replaced
wholesale inside two days. A gate at that speed is where the docs fall behind the code. In practice, code-map's
ETA header still described the SW v273 build, and the spec's §16–17 decisions lived only in the file about to
be archived. The phase stays open for the same reason phase 40 did: a green harness is not a played game. Only
round 1 has met a real table. The 130 Routes, the redrawn Dotty and the KM / MI chip have not.

**Technical Impact:** `src/screens/eta.html` (10 buttons get `min-h-11 min-w-11`, two headers `gap-1`) and
`css/eta.css` (the desk title steps to 20 px under 360 px). `docs/code-map.md` gains an ETA State table and the
Community Vote toggle. The identity doc, the impl notes (§ Changes from spec, BUG-09 / BUG-10, ML-04),
`deferred-work{,-log}.md`, `ui-revamp-rollout.md`, `decision-log.md` and `CLAUDE.md` are updated. Two archive paths
are corrected (`CLAUDE.md`, `phase-audit.md` § 5), and one stale grace period is fixed in `definitions.md`. SW
`v276 → v277`; `MP_PROTOCOL_VERSION` stays v265.

---

## What shipped in the phase, version by version

| SW | What | Detail |
|----|------|--------|
| v272 | **E.T.A. ships** — game 21, MDLM 3–8. A private Ride, the Time Dial, the Run Sheet, Talk Me Through It, Stamps of Approval, Proof of Delivery, the Odometer, End of Shift; Backseat Drivers (Sylly). The engine Intro gains two roll-call skin hooks. Content was a flagged provisional set. | `eta-implementation-notes` DD-01–DD-08, BUG-01–06; shared DD-69 |
| v273 | **Playtest round 1** (the owner's 3-phone session): the game takes the company's name, **E.T.A.**; Dot becomes **Dotty, Head of Dispatch**; the docket becomes a form with **bold** Briefing key words; the reveal says SAID / TRUE in words, stamps 1st–3rd, gives Your result. R11 `/impeccable` pass. | DD-09–DD-12, BUG-07–08 |
| v274 | **Playtest round 2:** tidier Run Sheet rows, Range → Local / Everywhere, **Community Vote**, the lobby sticker and the music track. | DD-13 |
| v275 | **Content rebuild**, owner-signed: 100 real Routes + 30 Off the Map, 35 + 14 Rides; `provisional` cleared. | DD-14 |
| v276 | **Dotty redrawn** (one-hand clipboard, fist pump, headset, the sticker's crate) and the per-phone **KM / MI chip**, the suite's one exception to metric-only. | DD-15, BUG-09 |
| v277 | **This gate.** 44 px chrome, the docs closed, the design history archived. | BUG-10, ML-04, § Changes from spec |

---

## Protocol A — results

### 1. Drift check — code vs docs
| Check | Result |
|---|---|
| Screen IDs (plugin ↔ markup ↔ identity doc T7a ↔ `allScreens[]`) | ✅ the same seven `screen-eta-*` in all four |
| Settings (T6 ↔ `let eta*` defaults) | ✅ Range Everywhere, Shift 5, GPS on, Community Vote on, Off the Map off, Sylly off |
| Scoring values (T3 / T8 ↔ constants) | ✅ Insurance 3,000 per ×10, cap 4,000; Hazard Pay 4,000; Navigation Assist 80 %; Detour 40 %; banner swing 3,000; Back on Course within ×1.25 |
| State variables in `code-map.md` | ❌ → ✅ **fixed:** the ETA section had grouped functions but no state; a State table now lists all 49 `let eta*` variables by owner (public / private / host-only / local) |
| SW precache | ✅ `eta.js`, `eta-scene.js`, `css/eta.css`, `data/eta-data.json`, four `fonts/eta-*.woff2`; `CACHE_NAME` v277 |
| Implementation notes | ✅ DD-01–15 current. Fixed: the SW v276 bug was unnumbered above BUG-01 (now **BUG-09**); added **ML-04** and **§ Changes from spec** |
| Deferred work | ✅ the 🔊 / ✕ item and the "phase gate" item resolved and moved to the log; the "nothing has met a real Firebase" line corrected (round 1 did); the maths-round pointer now names its archive path |

Also corrected: code-map's ETA header (it said v273, `LB_NO_STICKER`, and pointed at the in-repo brief and spec);
the settings-overlay row was missing `#btn-eta-vote-toggle`; and T4's "never miles" now names the KM / MI chip.

### 2. Technical-debt harvest
| Check | Result |
|---|---|
| Naked `setTimeout` | ✅ every timer carries a `WHY:` or lives in a named bag (`etaLater` → `etaTimers`, the board's `B.timers`, the scene's `later`) |
| Timers cleared on every exit | ✅ `etaTeardown()` (called from `resetToLobby()`) clears the choreography bag, both stall timers, the tick interval, the board, the scene and Practice |
| `TODO` / `FIXME` | ✅ none |
| Engine duplication | ✅ none; `etaEsc` is a per-game escaper (the engine has none; DYB carries its own) |
| `window.` on `let`-declared MP globals | ✅ none |
| Host-only controls | ✅ `etaHostNext` and Call Proof of Delivery return early on a client; host phase guards on open / resolve; the loopback asserts host-only Next job |
| Overlays torn down | ✅ all five `eta-*-overlay` in `resetToLobby()` |
| Team-game / pass-gate / who-first items | n/a — no teams, MDLM only, every device private by packet |

### 3. Linguistic integrity
✅ No generic strings (Game Over / Round / Score / Points / Vote / Level / Player). No retired term ("love",
"radio", Dispatch Board, Depot Manager, ETA?) in code, markup or content. No US spelling. `verify-identity-docs`
asserts every T7b copy block.

### 4. Mobile-first layout
| Check | Result |
|---|---|
| The Stack — one centred column, no split, no `h-screen`, no `my-auto` | ✅ every game section is `eta-desk flex items-center justify-center w-full min-h-screen … overflow-y-auto` with one `max-w-sm` column |
| Z-index | ✅ settings / quit z-80; how-to / Double-Take / Next Shift z-90 |
| `.focus()` on show | ✅ none |
| **Touch targets ≥ 44×44** | ❌ → ✅ **fixed (BUG-10):** 🔊 measured 27×28 and ✕ 16×28 on all five game screens. All now 44×44; at 320 and 375 px, no sideways scroll |
| `[?]` on gameplay headers | ✅ Log, Run Sheet, Odometer |
| Decision-modal borders | ✅ all three `border-[#FDBA74]` (orange-300) |

### 5. Close out — archived
To `D:\Coding Projects\archive\Documents archive\2026-11-11 eta-gate\` (with a `MANIFEST.md`), byte-checked
before removal:
- the tech spec
- brief v4
- the whole `docs/new-ideas/eta/` folder: brief v3, both handoffs, the maths round + `eta_sim.py`, the world boards and the reveal mockups.

There was no plan file and no `wip/` lab. Code comments citing these paths are history and were left as written.

---

## Documentation Integrity Protocol — closure

| Step | Doc | Status |
|---|---|---|
| 1 | `docs/code-map.md` | ✅ State table, header, Community Vote toggle |
| 2 | `docs/game-identities/eta.md` | ✅ status line, design-history pointer, T4 units note |
| 3 | `CLAUDE.md` | ✅ SW v277; v276 moved verbatim to `sw-changelog.md`; suite line; snapshot template + archive path |
| 4 | `logic-engine.md` / `ui-style.md` | ✅ no new universal rule. `definitions.md`'s reconnect row said a drop ends a session "after 20 s"; corrected to the engine's 60 s grace, then the host's call |
| 5 | `eta-implementation-notes.md` | ✅ BUG-09, BUG-10, ML-04, § Changes from spec |
| 6 | `docs/deferred-work.md` | ✅ two resolved, one corrected, one pointer moved |
| 7 | `docs/decision-log.md` | ✅ 2026-11-11 (Phase 44) entry |

---

## What keeps it open

**R15 — the re-play on ≥ 3 phones** of the current build. Round 1 was real (SW v272, three phones); everything since
is not: Dotty's redraw, the rebuilt content, the KM / MI chip and the 44 px chrome. Watch Talk Me Through It's
length (no clock), the 30 s / 60 s stall countdowns, the Run Sheet's reading time on an iPhone SE and `?fps` on
the time-lapse.

**Close the phase** when that session has run and its findings are triaged. Note that a finding is not a reopen:
the next owner round fixes it and the gate stays closed.

## Deferred / not done

Carried forward, all deliberate — `docs/deferred-work.md` § E.T.A.:
- **The playtest data log:** every Logged ETA vs truth by Range, every Stamp and Correction. After it, refit the `[MATHS]` numbers and the `[UNTESTED]` Spin-out / Back on Course thresholds.
- **The Ride `reveal` lines:** they are sent in `ETA_PROOF` but never shown.
- **The extreme Sylly docket:** it spills 51 px at 320×452 (BUG-08).
- **Phone look:** the sticker and music track are still to be checked on a phone.
- **No reconnect hook, by design (v1):** a drop gets the engine's 60 s grace, then the host's call.

---

## Verification

Run at SW v277, after the fix and every doc edit:

| Command | Result |
|---|---|
| `node tools/verify-eta-content.js` | 1,443 ✅ |
| `node tools/verify-eta-rules.js` | 423 ✅ |
| `node tools/verify-eta-loopback.js` | 190 ✅ |
| `node tools/verify-game-intro.js` | 178 ✅ |
| `node tools/verify-mp-configs.js` | ✅ |
| `node tools/verify-mp-reconnect.js` | 152 ✅ |
| `node tools/verify-identity-docs.js` | ✅ |
| `node tools/verify-build-fresh.js` | ✅ |
| Headless measure of the five game-screen headers, 320 + 375 px | every 🔊 / ✕ / `[?]` / KM 44×44; `scrollWidth` = viewport; END OF SHIFT 🏁 on one line at 320 |

**Phase gates:** 37, 38, 39 and 41 closed; **40 (Cold Shoulder) open**, needing a live multi-device session and the
offline install check; **44 (E.T.A.) passed, open on R15**.

**What none of this reaches.** Real Firebase ordering, real thumbs, real banter, and whether a container ship to
Mars starts the right argument. That is R15's job.
