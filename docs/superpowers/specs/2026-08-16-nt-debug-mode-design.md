# Net-Trace — Debug / Sandbox Mode: design spec

**Status:** APPROVED DESIGN — ready for an implementation plan. Not yet built.
**Date:** 16 Aug 2026 · **Game:** Net-Trace (`nt`, game 13) · **Tier:** 2 (architectural)
**Supersedes:** `docs/net-trace-debug-mode-brief.md` (raw owner brief — all 7 of its open questions are
resolved below; keep the brief for provenance, read this for truth).
**Baseline:** SW v197. `node tools/verify-nt-loopback.js` = 146 checks, green on 8 seeds.

---

## 1. What this is, in one paragraph

Debug Mode turns Net-Trace into a **free-build sandbox**. Instead of the engine rolling a random
relay-leg node, one person **authors** the node by hand — drawing bad sectors, dropping native
honeypots, positioning the ingress and egress ports, and setting the firewall/honeypot budget every
player will have. They lock it in; everyone then hardens that node and may **submit as many
attempts as they like**, watching their own trace after each one, until they choose to finish. When
everyone has finished, the normal Diagnostic Summary runs over each player's **best** attempt.

**Why it is cheap to build:** the thing being authored is *shape-identical* to the thing
`ntGenerateNode()` already returns. Structurally this feature replaces one function call with a
human, and leaves everything downstream — path validity, timeline simulation, playback, SER
scoring, the summary — completely untouched.

```js
// What ntGenerateNode() returns today, and exactly what the Node Editor will produce:
node        = { n, ingress, egress, badSectors: [{ax,ay}], nativeHoneypots: [{ax,ay}] }
ntInventory = { firewall, honeypot }
```

---

## 2. Decisions — the brief's open questions, resolved

Every one of these was confirmed with the project owner on 16 Aug 2026. They are settled; an
implementation session should not reopen them.

| # | Question | **Decision** |
|---|----------|--------------|
| 1 | What exactly is authored? | The existing **Generated (terrain) tier** — Bad Sectors + Native Honeypots — plus the ports and the **Budget** (`ntInventory`). *No new tier is invented.* The brief's "native firewalls" was a slip, corrected by the owner: it means **bad sectors**. |
| 2 | Retry-loop end condition | **Unlimited retries; Finish is final.** After each trace: `Run Again` / `Finish Testing`. No un-finishing. Others see a live roster of who is still testing, with attempt counts. |
| 3 | Does the author also play? | **Yes.** They author, lock in, then enter the same retry loop as everyone else. (Required for solo, and avoids leaving one of two players idle.) |
| 4 | What carries over between retries? | **The previous attempt's placements stay**, plus a `Clear All`. Tweak-one-wall-and-re-run is the point of the mode. |
| 5 | Is DNP in scope? | **No.** Debug and Sylly disable each other, so Debug is always **Standard, single node**. None of the allocation-hub machinery applies. |
| 6 | Scoring | **Per attempt:** raw latency + delta against your own best. **Summary:** the normal SER formula over everyone's **best** attempt, captioned "best of N attempts". |
| 7 | Where does the authored maze live? | **Memory only, for the session.** `CLAUDE.md` § Anti-Patterns rules out `localStorage` for game state. A shareable seed-string is out of scope — see § 12. |
| + | Hardening Window | **Forced to ∞** in Debug (stored setting untouched, superseded). |
| + | Randomise | **Two independent buttons** — `Randomise Terrain`, `Randomise Budget`. |
| + | Modes supported | **Solo, PTP and MDLM.** (DNP excluded by rule 5.) |

---

## 3. Terminology

Reuses NT's existing three-tier glossary (`nt-implementation-notes.md` D35) without adding to it.
New user-facing names only:

| Term | Meaning |
|------|---------|
| **Debug Mode** | The setting. Subtitle: *Staging Environment*. |
| **Node Editor** | The authoring screen. Header reads `NODE EDITOR — STAGING`. |
| **Deploy Node** | The lock-in CTA. Commits the authored node and starts the round. |
| **Attempt** | One build→submit→trace cycle. Displayed as `ATTEMPT 3` in the build header. |
| **Best Trace** | A player's lowest-latency attempt; what the summary scores. |

**Do not** call the authored terrain anything new — it is Bad Sectors and Native Honeypots, the
names already in use. The whole reason Q1 needed resolving was to avoid minting a fourth tier.

---

## 4. State flow

```
NT MENU (Debug ON)
   ├─ host / admin-0 ──→ NODE EDITOR ──"Deploy Node"──┐
   └─ everyone else  ──→ standby "Authoring node…"    │
                                                      │
   ┌──────────────────────────────────────────────────┘
   ▼
CYCLE GATE (existing boot terminal, unchanged)
   ▼
BUILD ──submit──→ PLAYBACK (your own trace — resolved LOCALLY, no packet)
   ▲                   │
   │            ┌──────▼──────┐
   └─Run Again──┤ retry modal │
                └──────┬──────┘
                Finish │
                       ▼
       STANDBY (live roster: ✓ finished / ⋯ testing, attempt counts)
                       │ all finished
                       ▼
       DIAGNOSTIC SUMMARY — scores everyone's BEST attempt
                       │
          host: "Author New Node" ──→ NODE EDITOR (fresh)
```

`ntCycle` stays **0** for the whole session. There is no cycle counter, no rolling average, and no
match-wide gameover ranking — the summary is terminal, and the loop back to the Node Editor starts a
completely fresh sandbox.

**The loop back is symmetric with the opening.** When the host taps `Author New Node`, every other
device returns to the same standby + "Authoring node…" state it saw at the start, and all Debug
state (`ntDebugMyAttempt`, `ntDebugBest`, `ntDebugFinished`, `ntDebugAttemptCounts`) is re-zeroed on
every device. Implement it by calling the same entry function the opening uses, rather than a second
"restart" path — one authoring entry point, reached twice.

### 4.1 Plain English — why each attempt needs no network round-trip

`ntComputeTimeline_local()` is a **pure function**: same node + same placements ⇒ same timeline,
every time, on every device. So a player's own device can simulate its own attempt and show the
result immediately. Nothing needs the host's permission until the player says "this is my answer".

The practical consequence is that **retrying is free**. A player on their eleventh attempt has sent
exactly as many packets as a player on their first: zero. The network is touched only twice all
round — the host publishing the node, and each player declaring Finish.

---

## 5. New state

```js
// ── Debug / Sandbox Mode ────────────────────────────────────────────────────
let ntDebugMode         = false; // the setting (persists between play-agains, like other settings)
let ntDebugBrush        = 'bad'; // Node Editor: 'bad' | 'native' | 'ingress' | 'egress'
let ntDebugMyAttempt    = 0;     // MY attempt number on the current node (1-based when displayed)
let ntDebugBest         = null;  // MY best so far — { latencyMs, placements, timeline } | null
let ntDebugFinished     = [];    // [playerIdx] = bool — host authority, the readiness gate
let ntDebugAttemptCounts= [];    // [playerIdx] = int  — display only, drives the standby roster
```

**Naming note:** `ntDebugMyAttempt` (my scalar) and `ntDebugAttemptCounts` (everyone's array) are
deliberately *not* singular/plural of the same word. An earlier draft had `ntDebugAttempt` /
`ntDebugAttempts`, one letter apart with completely different meanings and scopes — a trap.

**`ntDebugMode` lives with the settings block** (`nt.js` ~line 85–90), directly above `ntSyllyMode`,
matching the settings-card order. The remaining five live with the cycle/node state and are cleared
by `ntResetState()`.

**Sizing rule — load-bearing.** `ntDebugFinished` and `ntDebugAttemptCounts` are set to
`new Array(ntPlayerCount).fill(false)` / `.fill(0)` at node-lock time. They are **never left as
`[]`**. See § 9.1.

---

## 6. The mutually-exclusive settings pattern (new, suite-wide)

The owner asked for this as a **rule**, not a one-off. Two distinct behaviours are needed here and
both should be named:

| Pattern | Behaviour | Instance |
|---------|-----------|----------|
| **Mutually exclusive** | A ON forces B OFF, reciprocally. Both remain reachable — turning either on turns the other off. | Debug ↔ Sylly (DNP) |
| **Superseded** | A ON makes B irrelevant. **B's stored value is not modified** and returns intact when A goes OFF. | Debug ⇒ Routing Cycles, Hardening Window |

### 6.1 Visual contract (goes into `ui-style.md` § Settings Layout Standard)

- The affected card's **controls** get `opacity-50 pointer-events-none`.
- The card's **title stays at full contrast** — the player must still be able to read what is
  unavailable. Dimming the whole card makes it look like a rendering bug.
- A **reason line is mandatory**: `text-amber-600 text-xs`, directly under the controls.
  - *"Unavailable while Debug Mode is on"* (mutually exclusive)
  - *"Debug Mode has no time limit"* / *"Debug Mode runs a single node"* (superseded)

**Amber, not `text-stone-400`** — stone-400 is already taken by the dynamic-value-line pattern
(what you have *picked*). Amber means *unavailable*. The two must not look alike.

**Why the reason line is not optional:** a control that is dimmed and dead with no explanation is
indistinguishable from a bug, and the player has no way to discover that a *different* setting is
the cause. Silent conflict is the exact failure this pattern exists to prevent.

### 6.2 Card order

The settings overlay ends `… → Debug Mode → ✨ Sylly Mode`. This is a sanctioned exception to
`ui-style.md`'s "Sylly Mode is always the last card": **an exclusivity partner may sit immediately
above it.** Nothing else may.

### 6.3 Implemented locally, for now

Implement the toggling and dimming **inside `nt.js`** — no engine helper yet. This is the first
instance in the suite, and the project's own precedent is explicit about waiting for the second
(`logic-engine.md`: dice logic stays in `dyb.js`, "extract into a shared module only if a second
dice game appears"). **The rule goes into `ui-style.md` immediately** so instance two is
consistent; the shared helper is extracted when instance two actually arrives.

### 6.4 Wiring

- `ntSyncSettingsUI()` gains the Debug toggle and repaints the dimmed state of the Cycles,
  Hardening Window and Sylly cards on every open.
- The Debug toggle handler sets `ntDebugMode`, forces `ntSyllyMode = false` when turning on, and
  re-runs `ntSyncSettingsUI()`.
- The Sylly toggle handler gains the reciprocal: turning Sylly on forces `ntDebugMode = false`.
- **`getLockedModes()` needs no change.** It currently locks PTP when DNP is on; Debug forces DNP
  off, and Debug supports all three modes, so it locks nothing.
- **`rosterConfig.type` needs no change.** It is a function returning `'teams'` when DNP is on, else
  `'none'`. Debug ⇒ DNP off ⇒ `'none'`, which is correct.

---

## 7. The Node Editor — `screen-nt-authoring`

### 7.1 Architecture decision: a new screen with its own thin grid controller

**Chosen over** reusing `screen-nt-build` behind a flag, and over parameterising
`ntRenderBuildGrid()`.

The brief suggested reusing `ntAttemptPlace` "rather than build a second placement surface". That is
half right, and the half that is wrong drove this decision. Reading `ntRenderBuildGrid`
(`nt.js:2068–2210`), its **pointer handlers are saturated with build semantics**:

- tap-cycling that consults live inventory (`ntFirewallUsed < ntInventory.firewall`)
- long-press firewall→honeypot *upgrade*
- right-click places a honeypot
- `ntUpdateBuildCounters()` on every path
- ports drawn as `pointer-events: none` decorations

Authoring needs a **brush** model with different tap meanings and **interactive ports**. Threading a
mode branch through every one of those handlers would put conditional logic on the single render
path `verify-nt-loopback.js` actually executes — the highest-value proven code in the game.

**But the primitives underneath are already mode-agnostic and need zero changes.** `ntBlockAt`
(`nt.js:1950`) reads `ntNode.badSectors`, `ntNode.nativeHoneypots` and `ntMyPlacements`. So if the
editor writes **directly into `ntNode`** with `ntMyPlacements = []`, then `ntPaintCell`,
`ntCellType`, `ntRepaintFootprint`, `ntBlockTiles`, `ntPathExists`, `ntFlashReject` and the ghost
preview all work untouched — and the editor becomes **WYSIWYG for free**: a bad sector looks in the
editor exactly as it will look in play.

**Net effect:** ~80 lines of new pointer handling, every expensive/subtle primitive reused, and
`ntRenderBuildGrid` left byte-identical.

**One extraction required:** `portBar` is currently a closure inside `ntRenderBuildGrid`
(`nt.js:2191`). Lift it to module scope as `ntDrawPortMarker(grid, port, colour, inward, n)` and
call it from both grids, so the two never drift into drawing different port markers.

### 7.2 Layout — THE STACK

Per `ui-style.md`, this is a new screen and uses **the Stack**, not the legacy sticky-footer pattern.
`screen-nt-allocation` is on the legacy whitelist; `screen-nt-authoring` is **not** and must not be
added to it.

```
HEADER   NODE EDITOR — STAGING            [?] 🔊 ✕
STAGE    ┌──────────────────────────────┐
         │  the grid (ntNode, WYSIWYG)  │
         └──────────────────────────────┘
         Brush:  [Bad Sector] [Native Honeypot] [Ingress] [Egress]
         Budget: Firewall ⟨ − 12 + ⟩   Honeypot ⟨ − 2 + ⟩
         [Randomise Terrain]  [Randomise Budget]
CONTROLS [ Deploy Node ]
```

- Brush buttons are standard `.pill` / `.pill-active-emerald` — never remove the base `.pill` class.
- `Randomise Terrain` / `Randomise Budget` are secondary; `Deploy Node` is the brand CTA.
- **No emoji on `Deploy Node`** — Action Button Standard.
- `ROUTING: VALID / EXCEPTION` status line reused verbatim from the build screen (`ntSetRouting`).

### 7.3 Authoring rules

All of these reuse constraints already shipped in `ntGenerateNode`:

| Rule | Source |
|------|--------|
| Native honeypots capped at `ntNativeHoneypots` (0/1/2) | The owner's "matching the honeypot limit settings" |
| Honeypot budget capped at `NT_HONEYPOT_CAP − nativeHoneypots.length` | Exactly `ntGenerateNode`'s own rule, `nt.js:1731` |
| Firewall budget 0 … `slots` (`(n/2)²`) | Bounds of the existing roll |
| Bad sectors uncapped | Validity is the only real constraint |
| `ntPathExists(node, [])` must hold | Checked live on every edit; violation → existing `ntFlashReject` |
| Ingress mouth ≠ egress mouth | Genuine geometric requirement |

**Two generation heuristics are deliberately NOT enforced on a human author:**

1. The **corner-proximity re-roll** (`|imx−emx| + |imy−emy| < 8`, `nt.js:1695`).
2. The **different-edges constraint** (`while (egress.edge === ingress.edge)`, `nt.js:1692`).

Both exist to keep *randomly rolled* nodes varied. An author placing two ports close together, or
on the same edge, is making a choice. Blocking it would be the tool second-guessing its user.

**An entirely empty maze is legal** — `badSectors: []` *and* `nativeHoneypots: []`, no terrain at
all. This is how you measure baseline latency, it is a legitimate thing to want, and it is
**impossible to produce today** because `ntGenerateNode` has a density floor. It is also the single
most dangerous case on the wire — see § 9.2.

### 7.4 Port placement

Arm the `Ingress` or `Egress` brush, then tap any **border-adjacent** tile. The tapped tile's edge
and index become the port. Reuses the existing `getTile()` maths — no drag interaction is needed.
Re-validate with `ntPathExists` after every move.

### 7.5 Randomise

- **`Randomise Terrain`** — call **`ntGenerateNode(true)`**. The `keepInventory = true` argument
  already means exactly "re-roll the geometry, leave the budget alone" (`nt.js:1728`) — this button
  is a existing-parameter reuse, not new logic.
- **`Randomise Budget`** — re-roll `ntInventory.firewall` / `.honeypot` only, using the two
  expressions at `nt.js:1730–1731` verbatim, so the sandbox's random budgets sit in exactly the same
  range a real match would deal.

Independent by design: you will often want to keep a maze you like and retune its budget, or the
reverse. Both produce an **editable starting point**, exactly as the brief asked — nothing is
committed until `Deploy Node`.

---

## 8. The retry loop

### 8.1 The retry modal — `nt-debug-retry-overlay`

Decision Modal (Pattern 2), `z-[90]`, over the playback screen.

```
                        ⚡
                  Trace Complete
              14,203 ms · NEW BEST −1,240 ms

              [    Run Again     ]   ← brand
              [  Finish Testing  ]   ← neutral stone
```

- Both buttons `min-h-14 w-full rounded-2xl … font-semibold text-lg active:scale-95` per the
  Decision Modal button-sizing rule. `min-h-11 / text-sm` is **not** valid here.
- Inner div carries `border border-emerald-300`.
- Subtext when it is not a new best: `14,203 ms · best remains 12,900 ms`.

**⚠ This overlay must be non-dismissible, and that requires a naming constraint.** `engine.js` has a
delegated backdrop-tap handler that finds an overlay's neutral button by matching its `id` against
`cancel|close|done|ok|dismiss` as a whole segment, and clicks it. Both buttons here are real
decisions, so per `ui-style.md`'s documented exception the overlay is correctly left
non-dismissible — **but only if neither id matches that pattern.** Use
`btn-nt-debug-again` / `btn-nt-debug-finish`. Naming the second one `btn-nt-debug-done` would
silently make a backdrop tap finish the player's session.

### 8.2 Run Again

Returns to `screen-nt-build` with **`ntMyPlacements` intact**, `ntDebugMyAttempt++`, and the build
header showing `ATTEMPT n`. A `Clear All` button on the build screen (Debug only) empties
`ntMyPlacements` and repaints.

### 8.3 Finish, per mode

| Mode | Behaviour |
|------|-----------|
| **Solo** | Straight to the summary. No gate exists. |
| **PTP** | Advances `ntPtpTurn` through the existing handover gate. Sequential — **no simultaneous-finish problem exists at all.** |
| **MDLM** | Sets one slot in `ntDebugFinished`. Host resolves on `.every(Boolean)`. The only genuinely new readiness shape. |

### 8.4 The standby roster

`screen-nt-standby` gains a roster block: one row per player, `✓ ADMIN-2 — finished (7 attempts)` /
`⋯ ADMIN-3 — testing (4 attempts)`.

**⚠ `ui-style.md` rule 4 applies.** `ntShowStandby(msg)` currently sets only the message element.
Adding a roster means a second thing on the same screen, and **every path that shows the standby
screen must set both** — otherwise the roster shows whatever the previous caller last wrote. The
clean fix is one renderer, `ntShowStandby(msg, roster)`, with `roster` defaulting to hidden, so
non-Debug callers explicitly blank it rather than leaving it alone.

---

## 9. Packets, appliers, and where this will break

Only **two new packets**, because an authored node is shape-identical to a generated one.

| Packet | Direction | Status |
|--------|-----------|--------|
| `NT_GENERATE` | SYNC host→all | **Reused verbatim.** Carries the authored node instead of a rolled one. Its applier already calls `ntNormaliseNode`. |
| `NT_DEBUG_FINISH` | ACTION client→host | **New** — `{ bestPlacements, bestLatencyMs, attempts }` |
| `NT_DEBUG_ROSTER` | SYNC host→all | **New** — `{ finished: [bool], attempts: [int] }`, drives § 8.4 |
| `NT_PLAYBACK` / `NT_RESULTS` | SYNC host→all | **Reused verbatim** — `ntResolveCycleMdlm(bestPlacements)` needs no change |

Reusing `NT_GENERATE` is the reason this feature is small. `ntResolveCycleMdlm` already accepts an
array of per-player placement arrays and does everything else; feeding it best-attempts instead of
only-attempts is not a change to it.

### 9.1 The vacuous-gate trap

`[].every(Boolean)` is **`true`**. If `ntDebugFinished` is left as `[]`, the host's readiness check
passes on the very first tap and the round resolves while everyone else is still building.

This is **CJAR's BUG-05** exactly, and `logic-engine.md` § MDLM Patterns records it as a
suite-wide hazard. (⚠ NT has its *own*, unrelated BUG-05 — see § 9.3. The two games number their
bugs independently and these two share a number by coincidence.) The mitigation is one line and
must not be skipped:

```js
ntDebugFinished      = new Array(ntPlayerCount).fill(false);
ntDebugAttemptCounts = new Array(ntPlayerCount).fill(0);
```

set at **node-lock time**, and asserted by the harness (§ 10).

### 9.2 The Firebase empty-erasure hazard — materially worse here than anywhere else in NT

Firebase RTDB stores no `[]`, no `{}` and no `null` — a key holding one is **deleted**, and the
reader gets `undefined`. Two collections in this feature are empty in *ordinary* use:

1. **`bestPlacements: []`** — a player finishing with an empty build is **normal** in a sandbox
   ("what is the baseline latency with no hardening at all?"). Erased in flight, the host reads
   `undefined`, and `ntResolveCycleMdlm` maps over it and throws — stranding the whole room.
   **Fix:** `payload.bestPlacements || []` at the applier.

2. **An authored node with `badSectors: []` and `nativeHoneypots: []`** — see § 7.3. `ntNormaliseNode`
   (`nt.js:194`) already repairs both, and the `NT_GENERATE` applier already calls it. The
   requirement is that this stays true and is **asserted**, not assumed.

**Why this is worse in Debug than in Standard:** `ntGenerateNode` has a bad-sector density floor,
so a terrain-free node is unreachable today. Debug makes it a one-tap authoring choice. The class of
bug is NT's own **BUG-15/16** (`nativeHoneypots: []` erased, render throwing per grid cell, blank
grids on clients) — a bug that survived a completely clean host-side playtest, because *the host
never round-trips its own state*. Any Debug testing done solely by the person hosting proves
nothing about what the clients see.

### 9.3 Host self-send

The host marks its own `ntDebugFinished` slot **directly** and never sends itself an ACTION. The
`engine-multiplayer.js` dedup guard drops every envelope where `originId === syllyDeviceUid`. NT
already has this on record as **NT's own BUG-05** (`NT_ALLOCATION_UPDATE` silently dropped, leaving
working state at zero — *not* the CJAR BUG-05 cited in § 9.1); `logic-engine.md` generalises it to
*any* phase where the host is a submitting participant.

---

## 10. Lifecycle hazards created by the retry loop

Three pieces of existing machinery assume "one build phase, one commit, one deadline". All three
break under unlimited retries, and none of them fail loudly.

| # | Hazard | Fix |
|---|--------|-----|
| 1 | **`ntResolveGuard`** — the host-side force-resolve fallback armed at `endTimestamp + 4 s`. With the timer at ∞ there is no deadline, and leaving it armed would force-resolve the room out from under players mid-retry. | Do not arm it in Debug. |
| 2 | **`ntCommitted`** — "one commit per build phase" (`nt.js:2378`). Blocks every retry after the first. | Reset per attempt. |
| 3 | **`ntDebugFinished` sizing** | § 9.1 |

### 10.1 Hardening Window — a single-source accessor

`ntHardeningWin` is read at **9 sites**, but only **4 are reachable in Debug**:

- `nt.js:1295`, `nt.js:1330` — `endTimestamp` computation
- `nt.js:2338`, `nt.js:2344` — `ntStartBuildTimer`

The other five are DNP-only (`658`, `667`, `3263` — unreachable, Debug forces DNP off) or the
settings UI itself (`3440`, `3514` — **must keep reading the raw stored value**, so the player's
choice is still displayed and survives Debug being turned off again).

Add one accessor and use it at those four sites only:

```js
function ntEffectiveHardeningWin() { return ntDebugMode ? 0 : ntHardeningWin; }
```

`0` already means "no limit" throughout NT — `ntStartBuildTimer` early-returns and renders `∞` at
`nt.js:2338`. So the ∞ behaviour is **not new code**, just a new way of reaching shipped code.

This follows `logic-engine.md`'s single-source rule: a mode that mutates a value routes every reader
through one function, rather than repeating the `ntDebugMode ? … : …` branch at four call sites
where the fifth one added later will be missed.

### 10.2 Engine registration — the two lines that are always forgotten

- **`allScreens[]`** (`engine.js:71`) must gain `'screen-nt-authoring'`. A screen missing from this
  array is a **ghost screen that never hides** (`logic-engine.md` § Screen Routing).
- **`resetToLobby()` overlay teardown** (`engine.js:698`) must gain `'nt-debug-retry-overlay'`.

### 10.3 `ntResetState()`

Must clear `ntDebugBrush`, `ntDebugMyAttempt`, `ntDebugBest`, `ntDebugFinished`,
`ntDebugAttemptCounts`.
**`ntDebugMode` is a setting and must survive** a play-again / Reboot, like every other setting.

---

## 11. Verification

### 11.1 Extend `tools/verify-nt-loopback.js`

A new Debug scenario — host + **2 clients**, real wire, render-executing mock DOM — asserting:

1. An **empty authored node** (`badSectors: []`, `nativeHoneypots: []`) survives the wire and
   **renders on both clients** without throwing. (§ 9.2, hazard 2.)
2. A client finishing with **`bestPlacements: []`** does not strand the host. (§ 9.2, hazard 1.)
3. `ntDebugFinished` is length-N-all-false at lock, **not `[]`** — and the host does **not** resolve
   after the first Finish. (§ 9.1.)
4. The host's own Finish marks its slot **without a self-sent ACTION**. (§ 9.3.)
5. Resolution fires only after **all** players finish.
6. **Best, not last:** a player retries with a deliberately *worse* build; assert the summary scores
   the better earlier attempt.
7. **No forced resolution while players are still retrying.** Pump the timer well past what would
   have been the build deadline with one player mid-retry, and assert the round has *not* resolved.
   State this behaviourally, not as "the guard is unarmed" — the harness observes outcomes, and a
   behavioural assertion also catches any *other* route to a premature resolve. (§ 10, hazard 1.)

**Prove the new checks fail first** by running them against a reverted copy via `NT_SRC=` — the
harness already supports this and it is what distinguishes a real assertion from a green rubber
stamp. Run across several `NT_SEED=` values, per `nt-implementation-notes.md` D21.

**The existing 146 checks must stay green**, unchanged.

### 11.2 Layout

Invoke the **`visual-check`** skill on `screen-nt-authoring`. It is a new Stack carrying a grid, a
4-pill brush row, two steppers, two secondary buttons and a CTA — the most crowded single screen in
NT, and no `verify-*.js` harness can see spacing, alignment or overflow.

### 11.3 What none of this covers

A real **3-device MDLM session**. No harness has clock skew, Firebase ordering, dropped packets, or
any judgement about how the retry loop *feels*. NT's own BUG-15/16 are the standing reminder that a
host-side playtest is clean by construction.

---

## 12. Explicitly out of scope

- **DNP / Sylly interaction** — excluded by the mutual-exclusion rule, not deferred.
- **Saving or sharing an authored node** (seed strings, import/export). Memory-only this round.
  If it is ever wanted, a short encodable seed is the shape to reach for — *not* `localStorage`,
  which `CLAUDE.md` § Anti-Patterns forbids for game state.
- **Multi-cycle Debug matches.** One node per session; the loop back to the Node Editor covers the
  "let's try another" case without the cycle/rolling-average machinery.
- **A shared `bindExclusiveSettings()` engine helper** — § 6.3, waiting on instance two.
- **Spectator-only authoring.** Resolved: the author plays (§ 2, Q3).

---

## 13. Documentation pass required

Per `CLAUDE.md` § Documentation Integrity Protocol, before the phase snapshot:

1. **`docs/code-map.md`** — `screen-nt-authoring`, `nt-debug-retry-overlay`, the new state vars,
   `ntEffectiveHardeningWin`, `ntDrawPortMarker`.
2. **`docs/rules/game-identities.md` § Game 13** — Debug Mode setting, Node Editor screen, the two
   new packets, the new terminology in § 3.
3. **`CLAUDE.md`** — SW version bump + Current Focus.
4. **`ui-style.md`** — § 6's mutually-exclusive / superseded pattern, plus the sanctioned exception
   to "Sylly Mode is always the last card".
5. **`docs/implementation-notes/nt-implementation-notes.md`** — decisions and any bugs found.
6. **`docs/decision-log.md`** — one line: the new suite-wide settings pattern.
7. **`nt-how-to-overlay`** — one card explaining Debug Mode. It goes **before** the `✨ Sylly Mode`
   card, mirroring the settings order (`ui-style.md` mandates Steps → Winning and Scoring → Sylly
   Mode; a Debug card sits immediately before Sylly, the same sanctioned exception as § 6.2). Not
   a tab — Debug is a mode, not reference content.

### 13.1 ⚠ Pre-existing doc drift that must be fixed first

`CLAUDE.md`'s Enforcement clause requires discrepancies between the docs and shipped code to be
**resolved before implementation begins**. `game-identities.md` § Game 13's **Settings table is
wrong on four counts**:

| Doc says | Code actually has |
|----------|-------------------|
| `ntCycles` — "Routing Cycles", options 3/5, default 3 | **`ntIterations`** — options 5/7/10, default **5** (`nt.js:87`, `index.html:7601`) |
| `ntComponentDensity` — "Component Density", minimal/standard/heavy | **Does not exist.** 0 occurrences in the codebase. |
| *(absent)* | **`ntMatrixScale`** — 16/18/20, default 18 (`index.html:7589`) |
| *(absent)* | **`ntNativeHoneypots`** — 0/1/2, default 2 (`index.html:7626`) |

This matters directly: Debug **supersedes** the cycles setting, so an implementer working from the
doc would go looking for a variable that does not exist. Fix the table as step 0.

Minor, same file: `nt-reboot-overlay` and `nt-logs-overlay` are in `engine.js`'s teardown list
(`engine.js:698`) but missing from the § Game 13 Overlay Types table.

---

## 14. Risk register

| Risk | Severity | Mitigation |
|------|----------|------------|
| Empty-collection erasure on the wire (§ 9.2) | **High** — strands the room, invisible to a host-side test | Harness checks 1 & 2, run against `NT_SRC=` first |
| Vacuous readiness gate (§ 9.1) | **High** — resolves on the first Finish | Harness check 3 |
| `ntResolveGuard` force-resolving mid-retry (§ 10) | **Medium** — random mid-round eviction, hard to reproduce | Harness check 7 |
| Node Editor overflow at `n=20` on a small phone | **Medium** — busiest Stack in NT | `visual-check` at 16/18/20 |
| Backdrop-tap silently finishing a player (§ 8.1) | **Low** — but total, and invisible in review | Button-id naming constraint, stated in § 8.1 |
| Regression in `ntRenderBuildGrid` | **Low by design** — left byte-identical | Existing 146 checks stay green |

---

## 15. What "done" looks like

- Debug Mode toggles in settings, mutually exclusive with Sylly, superseding Cycles and Hardening
  Window, each with its amber reason line.
- A node can be authored from blank, or randomised then edited, and deployed.
- Every player can retry without limit, sees their latency and best-delta after each attempt, and
  finishes when they choose.
- The summary scores best attempts, captioned "best of N attempts".
- Works in solo, PTP and MDLM.
- `verify-nt-loopback.js` green — 146 existing checks plus the new Debug scenario — across several
  seeds, with the new checks proven to fail on a reverted copy.
- All six documentation targets in § 13 updated, and § 13.1's drift corrected.
