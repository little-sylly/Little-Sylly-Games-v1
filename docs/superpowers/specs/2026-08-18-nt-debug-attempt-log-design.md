# NT Debug Mode — Attempt Log (replacing the post-Finish playback)

**Status:** Scoped, not started. Owner-requested 18 Aug 2026 during the two-unit-ports round;
written up separately because it is independent of that work and had no record outside the chat.

**Depends on:** nothing. Independent of the rectangular-grid (v199) and two-unit-ports (v200)
rounds — those touched geometry, this touches the Debug summary flow.

**Baseline at time of writing:** SW v200, `node tools/verify-nt-loopback.js` = **342** checks,
green on seeds 0–7.

---

## 1. Problem

Debug/Sandbox Mode exists so the owner can hand-author a maze, then iterate on it. The retry loop
is right, but the **end** of a session is wrong in two ways:

1. **Finishing auto-plays your best trace.** After Finish Testing, `ntResolveCycleMdlm` (MDLM) or
   the solo/PTP tail of `ntDebugFinish` sends everyone to the playback screen to watch the winning
   run before they can reach the summary. In a sandbox that run has already been watched — it was
   watched when it was run. It is a forced replay of something you just saw.
2. **There is no way back to any earlier attempt.** Only `ntDebugBest` survives; attempts 1..N-1
   are discarded as they happen. If attempt 7 was interesting and attempt 12 was the slowest, 7 is
   gone. For a playtesting tool that is the wrong thing to throw away.

Meanwhile the standard game already has exactly the viewer this needs — System Logs
(`nt-logs-overlay`) — and Debug **explicitly hides it**: `js/games/nt.js` in `ntShowSummary`,
`if (logsBtn) logsBtn.style.display = 'none';`.

## 2. Goals

- Finish Testing goes **straight to the Diagnostic Summary**. No playback hop.
- The summary offers a log of **every attempt**, replayable on demand.
- In multiplayer, the summary shows a per-player table (tries + best), and a row opens that
  player's log.
- No regression to the standard (non-Debug) game's summary or playback flow.

## 3. Non-goals

- **Per-attempt playback inside the retry loop stays exactly as it is.** `ntDebugRunAttempt` →
  `ntShowPlayback` → retry overlay is the iteration loop and is not in scope. Only the
  *post-Finish* playback is removed.
- No change to how attempts are scored (best = highest latency, unchanged).
- No syncing of other players' full attempt histories — see § 6.

## 4. Design

### 4.1 Skip the playback hop

Two call sites navigate to playback after Finish, and **both halves of the MP pair must be
changed together**:

| Path | Site | Today | Becomes |
|------|------|-------|---------|
| Solo / PTP | tail of `ntDebugFinish` | `ntShowComparisonPlayback()` | `ntShowSummary('match')` |
| MDLM host | tail of `ntResolveCycleMdlm` | `ntShowPlayback()` | `ntShowSummary('match')` when `ntDebugMode` |
| MDLM client | the `NT_PLAYBACK` applier | navigates to playback unconditionally | same Debug branch |

**The client half is the one that will be missed.** `ntResolveCycleMdlm` is shared with the
standard game, so the Debug branch has to be `if (ntDebugMode)` guarded there *and* in the
`NT_PLAYBACK` applier. Change only the host and the host sits on the summary while every client
sits on playback — a split-brain that a host-side playtest cannot see, by construction (NT's own
recurring lesson: the host never round-trips its own state).

`ntShowSummary`'s Debug branch already exists and already does the right thing (STAGING heading,
Author New Node, reboot). The only edit inside it is un-hiding the logs button.

### 4.2 The attempt log

New session state, alongside the existing Debug block:

```js
let ntDebugAttempts = [];   // [{ latencyMs, placements }] in attempt order, index 0 = attempt 1
```

**Store placements and latency only — never a timeline.** `ntComputeTimeline_local()` is a pure
function of node + placements, so the timeline for any attempt is recomputed on demand when it is
opened. Caching one timeline (`ntDebugBest`) is fine; caching thousands is a memory leak with a
`samples` array in each.

`ntDebugRunAttempt` pushes one entry per run. That is the only writer.

**Lifecycle — three reset points, and the third is the trap:**

1. `ntResetState()` — `ntDebugAttempts = []` alongside `ntDebugBest`/`ntDebugMyAttempt`.
2. `ntShowAuthoring()` — a fresh sandbox clears it, same place the other Debug state is zeroed.
3. **The PTP hand-over inside `ntDebugFinish`.** The solo/PTP tail already resets
   `ntDebugMyAttempt` and `ntDebugBest` before `ntBeginPtpTurn()` for the next player. Miss the
   attempt log there and player 2 opens the log to find player 1's attempts listed as their own.

### 4.3 The viewer

Reuse `nt-logs-overlay` — it is already a Pattern 1 data slide-up and already in `resetToLobby`'s
teardown list (`js/engine.js`), so reusing it costs no new overlay, no new z-index entry, no new
teardown line.

`ntRenderLogs` gains a Debug branch. The standard branch iterates cycles; the Debug branch
iterates **attempts** for one player. Row content per attempt: attempt number, latency, a
"BEST" tag on the winner, and the same 64px `ntDrawMaze` thumbnail the cycle cards already use.

`ntOpenLogAttempt(playerIdx, attemptIdx)` is a sibling of the existing `ntOpenLogRound`, which is
already the exact pattern needed — stash the live globals, load the historical ones, play back,
restore on Continue, re-open the overlay. Copy its shape; the difference is that it recomputes the
timeline rather than reading a stored one.

### 4.4 The multiplayer table

The summary in Debug MDLM shows one row per player: **name · tries · best latency**, with the row
tappable to open that player's log. Wide rosters scroll **inside the table's own
`overflow-x: auto` container** — never the body (`ui-style.md` § The Stack).

**This needs no packet change.** Everything is already on the wire:

| Column | Source | Already synced by |
|--------|--------|-------------------|
| name | `ntPlayerNames` | lobby roster |
| tries | `ntDebugAttemptCounts` | `ntDebugBroadcastRoster` |
| best latency | `ntCycleLatencies[ntCycle]` | `NT_PLAYBACK`'s `cycleLatencies` |
| best placements | `ntPtpPlacements` | `NT_PLAYBACK`'s `allPlacements` |

Note the SYNC that carries the last two is `NT_PLAYBACK` — which still fires; only the
*navigation* it triggers changes. Do not remove the broadcast while removing the screen hop.

## 5. Asymmetric access (decided)

- **Your own row** opens your full local attempt log, every attempt replayable.
- **Another player's row** opens their **best** trace only — you hold their `bestPlacements`, so it
  replays perfectly, but you never had their intermediate attempts.

This is a deliberate decision, not a limitation to fix later without thought. See § 6.

## 6. Why other players' full logs are not synced

The owner asked directly whether thousands of tries could break anything. Measured against the
current design:

| Concern | Answer |
|---|---|
| **Wire, as-is** | Zero risk. Debug sends **no packet per attempt** — that is the mode's defining property. `NT_DEBUG_FINISH` carries `bestPlacements` + `attempts` only. 10,000 tries costs exactly what 1 costs. |
| **Wire, if every attempt were synced** | ~25 placements × ~30 B × 1,000 attempts ≈ **750 KB per player**, ~6 MB at 8 players, in a single write. Do not. |
| **Memory** | placements-only, ~25 small objects per attempt → tens of KB at 1,000 attempts. Fine. |
| **DOM / scrolling** | The real limit. 1,000+ rows makes the overlay sludgy. Render **newest first**, cap at ~200, and show "latest 200 of 1,432". No virtualisation. |
| **Counters** | `ntDebugMyAttempt` is an int. No overflow concern. |

**Cheap upgrade path if it is ever wanted:** a latency-only history (`[1234, 1456, …]`) is ~8 KB
per player at 1,000 attempts — affordable, and enough to show another player's progression as a
list of numbers, with only their best replayable. Deliberately not in v1.

## 7. Failure modes to test

1. **Host/client split-brain** — host on summary, clients on playback (§ 4.1). The loopback
   harness covers this: assert *every* device's last screen after the final Finish.
2. **PTP attempt-log bleed** — player 2's log showing player 1's attempts (§ 4.2).
3. **Empty log** — finishing with zero attempts (possible: Finish is reachable without ever
   running). The overlay must render an empty state, not throw.
4. **Standard game untouched** — the non-Debug summary still hops through playback and still shows
   cycle logs. This is the regression the Debug branches could plausibly cause.

## 8. Testing

`tools/verify-nt-loopback.js` (currently 342 checks). Add:

- Finish in Debug MDLM → **all three devices** land on `screen-nt-summary`, none on playback.
- `ntDebugAttempts` accumulates one entry per `ntDebugRunAttempt`, and each entry's `latencyMs`
  matches an independently computed `ntComputeTimeline_local()` — **capture the expected value
  outside the machinery under test** (D42: four assertions in the Debug round could not fail
  against the bug they existed to catch).
- The log resets at all three lifecycle points, PTP hand-over included.
- Standard (non-Debug) mode still reaches playback after resolve — the regression guard.
- One deliberate-break step that goes **RED** before the fix makes it green.

Layout (the table's horizontal scroll, the capped list) is beyond every harness — use the
`visual-check` skill at 2 and 8 players, and assert `bodyScrollsSideways === false`.

## 9. Sizing

**Tier 1–2.** One game, one flow, an existing overlay and an existing playback-restore pattern to
copy, no packet change. The only genuinely cross-cutting part is the host/client navigation pair in
§ 4.1, which is what pulls it above a plain Tier 1.

Suggested: `docs/templates/task-bug-polish.md` intake inline, **Sonnet, medium effort**, one
session. It does not need the brainstorm → spec → plan pipeline — this document is the design.
