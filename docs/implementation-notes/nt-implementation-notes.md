# Implementation Notes — Net-Trace (NT)
**Game 13 | Abbr:** `nt` | **Plugin:** `js/games/nt.js`
**Solo build completed:** June 2026 | **Multiplayer:** not yet built (Phases A–D outstanding)

> Backfilled June 2026 from `docs/new-ideas/net-trace-issues.md`,
> `docs/new-ideas/net-trace-issues-2.md`, and the shipped `js/games/nt.js`.
> Those files were informal playtesting scratch docs — this is the canonical record.

---

## Design Decisions

### D1 — Grid size: 16/18/20 (not 8/9/10 as specced)
**What happened:** The original tech spec proposed grid sizes of 8/9/10. During build it became clear these were too small for maze.game-style layouts — blocks are 2×2 tiles so an 8-grid gives only a 4×4 anchor space with almost no meaningful path differentiation.
**Decision:** Use 16/18/20 (`NT_GRID_DEFAULT = 18`), matching the maze.game model. `ntMatrixScale` setting maps to these values.
**Why:** Faithful to the reference game. Produces the range of sparse-to-dense mazes the mechanic needs.

### D2 — Block placement: 2×2 footprint at 1-tile resolution (not 1-tile blocks)
**What happened:** The spec described single-tile blocks. Playtesting the reference confirmed every block in maze.game is a 2×2-tile structure, with 1-tile placement resolution — blocks can be anchored at any integer tile coordinate, staggered to create 1-tile-wide corridors.
**Decision:** All placed structures (Firewalls, Honeypots) are 2×2 tiles, anchored at a top-left integer tile `(ax, ay)`. `ntBlockTiles(ax, ay)` returns the 4 occupied tiles. `ntSolidGrid()` marks them all solid.
**Why:** This is what produces the 1-tile corridor mechanics — the whole point of the puzzle. The original spec missed the dual role of placement resolution vs block footprint.

### D3 — Runner geometry: continuous vector pathing with ¼-tile config-space lattice (not BFS tile-time)
**What happened:** The spec proposed a BFS pathfinder operating at tile granularity with a turn-timer for corners. This produced unnatural, snapping movement.
**Decision:** The runner has a physical 0.5-tile hitbox. All pathfinding runs on a ¼-tile (k=4) config-space lattice where each solid tile is inflated by 0.25 tiles (exactly 1 sub-cell in each direction). This means the runner must geometrically clear corners before turning — no artificial timer needed.
**Why:** The inflated lattice gives natural turn-rate delay from geometry alone. Corners feel physical, not procedural. The `ntConfigGrid()` function handles the inflation: solid tile `[tx,ty]` blocks sub-cells `[tx·k-1 … tx·k+k]`.
**Key values:** `NT_LATTICE_K = 4`, `NT_RUNNER_HALF = 0.25`, `NT_BLOCK = 2`, pathfinder uses 8-direction steps with `NT_STEPS[]` (diagonals carry their orthogonal pair for no-corner-cut checking).

### D4 — Port (Ingress/Egress) proximity: Manhattan distance constraint (not random different-edge)
**What happened:** Early generation allowed two ports on adjacent edges near a corner. In degenerate cases the egress was 1–2 tiles from the ingress and no blocking strategy mattered.
**Decision:** The generator enforces a minimum Manhattan perimeter distance between ports (6–8 steps). If the roll comes in under the threshold, the egress is re-rolled. This keeps them far enough apart that meaningful maze building is always possible while still allowing adjacent-wall spawns when the path is deep.
**Bug this fixed:** A specific playtest case had ingress at top edge column 0 and egress at left edge row 1 — effectively corner-adjacent; the runner exited before any block could intercept.

### D5 — Tap-cycle controls: Empty → Firewall → Honeypot → Empty (not long-press-only)
**What happened:** The original spec used long-press as the primary placement mechanic. Mobile playtesting showed it was unintuitive — users tapped expecting placement and nothing happened.
**Decision:** Primary action is a tap-cycle: empty tile → place Firewall segment → tap again → upgrade to Honeypot → tap again → remove. Long-press and right-click (desktop) bypass the cycle and place a Honeypot directly. Tapping a placed block removes it and refunds to inventory. Native (map-generated) blocks cannot be tapped, cycled, or removed.
**Inventory safety net:** If a player cycles to a type they have 0 of (e.g. 0 honeypots left), the cycle skips that step and flashes the STORAGE: INSUFFICIENT HUD warning.

### D6 — Honeypot debounce: 7,000ms lockout matching slow duration (not per-frame AoE)
**What happened:** The first implementation checked `(dx² + dy²) <= 18` every RAF frame. A single runner pass through the AoE triggered the slow 3+ times, each firing its own animation ring.
**Decision:** The moment the runner enters the AoE, the honeypot enters `INACTIVE_COOLDOWN` for 7,000ms (matching `NT_HONEYPOT_DURATION`). The collision check is completely disabled during the lockout. A single animation cycle is bound to the exact 7,000ms duration — one trigger, one animation, one slow. `NT_HONEYPOT_COOLDOWN = 35000` in latency units (= ~7s real at 5× playback speed).
**Why the units:** All timing in nt.js is in abstract latency units, not wall-clock ms. The playback engine compresses time by `NT_PLAYBACK_SPEED = 5×`. So 35,000 latency units = 7,000 ms wall-clock at 5× playback.

### D7 — Honeypot visual: radial recharge sweep (clockwise arc from top, fills over cooldown)
**What happened:** The expansion ring alone didn't communicate when the honeypot would re-arm. Players had no read on the trap's state.
**Decision:** The honeypot tile shows a clockwise radial fill (canvas arc clip from -90° to 270°) that sweeps to completion over the 7,000ms cooldown. At trigger: tile flashes white-hot fuchsia, inner glyph vanishes. During cooldown: fuchsia wedge fills clockwise. At re-arm: glyph snaps back with a pixel-pop. The formula is `progress = remainingCooldownMs / 7000`.

### D8 — Native honeypots: violet-800 (#5b21b6) vs player fuchsia-500 (#d946ef)
**What happened:** Native (map-generated) honeypots were visually identical to player-placed ones, causing confusion about what was movable.
**Decision:** Native honeypots render in deep violet-800 (`NT_COLOR_NATIVE_HONEYPOT = '#5b21b6'`) with a static boundary ring. They look like permanent structural architecture. Player honeypots stay high-vis fuchsia-500 (`NT_COLOR_HONEYPOT = '#d946ef'`). Native blocks cannot be tapped/cycled/removed.

### D9 — Playback HUD: integrated media player layout (not floating elements)
**What happened:** The spec proposed separate display elements for latency, node ID, and a basic scrubber. During build these were scattered across three rows, making the playback screen feel disjointed.
**Decision:** Integrated single-frame terminal layout:
- **Top bar:** STATUS pill | LATENCY: Nms | NT-NODE-NN (clean node token only — no easter egg string during playback; easter egg kept on build screen only)
- **Middle:** canvas fills the frame
- **Bottom:** `[▶/❚❚]` play/pause + scrubber bar + `[►|]` skip-to-end + timestamp `00:42 / 01:30`
The scrubber pauses physics on drag; releases resume from that exact millisecond.

### D10 — Canvas trail: solid rounded polyline with gradient fade (not geometric-distance dots)
**What happened:** The first trail used individual dot circles plotted at path positions, producing a dotted/noisy look.
**Decision:** `lineCap = 'round'`, `lineJoin = 'round'` on the canvas context, solid stroke, progressive alpha gradient fade from 100% (runner head) to ~20% (tail). Gridlines rendered at 15% opacity emerald (increased from initial 5% which was invisible on some panels). Fading uses a canvas overfill approach: each frame draws a semi-transparent base rectangle (`NT_TRAIL_ALPHA = 0.20`) over the canvas before repainting the runner, causing old path segments to gradually fade.

### D11 — RAF used as both game clock and render loop (novel pattern for this suite)
**What happened:** NT is the first game that needs a continuous physics simulation (runner movement, AoE checks, slow timers). All previous games use `setInterval` for discrete timers.
**Decision:** `ntRafHandle` stores the `requestAnimationFrame` return value. The RAF loop advances the simulation timeline by fixed-distance substeps (`NT_SUBSTEP = 0.25 tiles per tick`) and repaints on each frame. **This handle is a timer** — must be cancelled in the quit-confirm handler, in `resetToLobby()`, AND on any early phase transition (build phase exit, summary screen entry). Leaving it running fires against the next screen's state.
**Reference:** `ntStopPlayback()` clears `ntRafHandle`. The `resetToLobby()` teardown must call this.

### D12 — Inventory generation: lowered floors for scarcity nodes
**What happened:** Default inventory was too generous — players rarely made meaningful tradeoffs.
**Decision:** `NT_BADSECTOR_MIN_PCT = 0.02` (down from 8%), `NT_FIREWALL_MIN_PCT = 0.06` (allows ~5-firewall scarcity nodes on an 18-grid). `NT_HONEYPOT_CAP = 4` total per node (≤2 native + ≤2 allocated). This introduces rare open/sparse mazes and low-budget nodes.

---

## Bug Index

### BUG-01 — Node 02 Build Freeze (state leakage on cycle transition)
**What:** After Node 01 completed, the Node 02 build grid was unresponsive. Blocks appeared but clicks did nothing.
**Root cause:** Grid event handlers and the pathfinding coordinate cache remained bound to Node 01 instance data. On Node 02, the old listeners fired against stale tile dimensions.
**Fix:** Hard lifecycle reset on every cycle transition. `ntBeginCycle()` completely destroys and re-initialises the build grid from scratch: `ntBuildCells = []`, grid DOM is cleared and re-rendered, all event handlers rebound fresh. No state is carried between cycles except `ntMyPlacements` (which is reset per cycle by design).
**Lesson:** Any screen that is visited multiple times with different data must completely detach and re-attach its listeners. Incremental DOM mutation is not safe.

### BUG-02 — Honeypot multi-hit (per-frame AoE without debounce)
**What:** A single honeypot triggered 3+ slow events as the runner passed through its AoE. Visual animation rings stacked. Latency score was inflated.
**Root cause:** `(dx² + dy²) <= NT_HONEYPOT_RADIUS_SQ` was checked every RAF frame, not gated by a cooldown state.
**Fix:** Honeypot enters `INACTIVE_COOLDOWN` on first trigger. Collision check is skipped entirely during lockout. Single animation bound to cooldown duration. See D6.

### BUG-03 — Right-click still placed Firewall instead of Honeypot (pointer event routing)
**What:** `contextmenu` event was being suppressed (preventing browser menu) but the underlying click was still routing to the tap-cycle path, placing a Firewall.
**Root cause:** The `button === 2` check was not intercepting before the cycle logic ran.
**Fix:** Explicit `if (e.button === 2)` early-return in the pointer event handler, routing directly to honeypot placement and skipping the cycle entirely.

### BUG-04 — Easter egg string cut off node ID during playback
**What:** The build screen header `SYS_INIT // BOUBOU-6D617A65 // NT-NODE-01` is intentional. The playback top bar showed the same string, but on mobile the easter egg portion cut off `NT-NODE-01` — the most important identifier.
**Fix:** Playback top bar shows `NT-NODE-NN` only. Easter egg string kept on build screen exclusively. See D9.

---

## Design Decisions (Phase D additions — DNP Multiplayer)

### D13 — Cluster Ceiling scoring formula (DNP)
Standard SER divides by `maxLatency` across all players. DNP uses a per-leg ceiling: for each matched leg n, `ceiling_n = max(teamA_leg_n.latency, teamB_leg_n.latency)`; `clusterCeiling = Σ ceiling_n`. Both player and team SERs divide by `clusterCeiling`. This keeps SER in the 0–100 range regardless of team composition asymmetry, and preserves the competitive framing: the slower team on any given leg sets the ceiling for that leg.

### D14 — `ntTeamWorkingAllocs` vs `ntAllPlayerAllocations` (two host-only structures)
Two separate host-only objects serve different purposes during the DNP allocation phase:
- `ntTeamWorkingAllocs[team][legIdx]` — live working state synced to all devices via `NT_ALLOCATION_SYNC` on every captain adjustment. Populated from zeroes at huddle start.
- `ntAllPlayerAllocations[playerIdx]` — final per-player inventory after both teams lock. Migrated in `ntApplyAllocationLock()`. Carried in `NT_BUILD_BEGIN` as `assignedInventory`.
Keeping them separate avoids reading partially-committed state during live sync.

### D15 — Wall-clock `endTimestamp` for build timer (GTH pattern)
Host computes `endTimestamp = Date.now() + (ntHardeningWin * 1000)` at the moment both teams lock (in `ntCheckBothTeamsLocked()`). `NT_BUILD_BEGIN` carries this value. All devices call `ntStartBuildTimer(endTimestamp)` from it. Avoids drift caused by the network gap between host broadcast and client receipt.

### D16 — Unallocated pool warning: flash then commit anyway
If the captain taps "Lock Allocation" with unspent budget, `#nt-alloc-warning` flashes via `nt-flash-warning` CSS animation (amber → red → amber, 0.4s). The allocation still commits. Forcing full allocation would create frustration; the warning is informational only.

---

## Multiplayer Lessons

*(Phases A–C completed June 2026. Phase D — DNP multiplayer — completed June 2026.)*

### ML-01 — Host captain `NT_ALLOCATION_UPDATE` dropped by dedup guard (Phase D, RESOLVED → BUG-05)
See BUG-05.

### ML-02 — `NT_ALLOCATION_SYNC` renders on all devices, host resolves
The SYNC handler for `NT_ALLOCATION_SYNC` only calls `ntRenderAllocationScreen(captainMode)` — it does NOT call any resolve or score function. Allocation resolution happens once, host-side, in `ntApplyAllocationLock()`. Follows the "SYNC handlers render, never re-resolve" rule.

### ML-03 — Secondary-phase missing-handler audit: DNP allocation is fully covered
The allocation phase (after `NT_HUDDLE_START`, before `NT_BUILD_BEGIN`) has two interactive client submissions: `NT_ALLOCATION_UPDATE` (live adjust) and `NT_ALLOCATION_LOCK` (commit). Both have ACTION handlers in `ntHandleEnvelope`. Non-captain devices have read-only UI — no submission required. Verified before implementation.

---

## Bug Index (Phase D additions)

### BUG-05 — Host captain `NT_ALLOCATION_UPDATE` dropped by dedup guard (Phase D, RESOLVED)
**What:** Host captain's `ntAdjustAllocation()` sent `NT_ALLOCATION_UPDATE` ACTION via `mpSendEnvelope()`. `engine-multiplayer.js` drops any envelope where `originId === syllyDeviceUid`. The host's own ACTION never arrived in `ntHandleEnvelope`. Working allocation remained zeroes; `ntBroadcastAllocationSync()` repeatedly re-broadcast stale state.
**Fix:** Branch `ntAdjustAllocation` on `syllyMultiplayerMode`. Host path: update `ntTeamWorkingAllocs[myTeam][legIdx]` directly, then call `ntBroadcastAllocationSync()`. Client path: send `NT_ALLOCATION_UPDATE` ACTION.
**Lesson:** The dedup guard applies to ALL ACTION types. Any phase where the host is an active participant must use the direct-update pattern, not a self-sent ACTION. See also `logic-engine.md` § MDLM Patterns → Host readyCheck self-submission.

### BUG-06 — `ntShowAllocationScreen()` called without `captainMode` arg (Phase D, RESOLVED)
**What:** `ntStartMatch()` called `ntShowAllocationScreen()` with no argument; `captainMode` defaulted to `undefined` (falsy); all players saw read-only view.
**Fix:** Compute `isCaptain = mpMyPlayerIdx === ntCaptainSlots[myTeamForCap]` and pass as argument.
**Lesson:** Boolean flags controlling interactive vs read-only modes must be computed at the call site.

### BUG-07 — `ntTeamWorkingAllocs` not initialised at `ntStartMatch()` time (Phase D, RESOLVED)
**What:** `ntTeamWorkingAllocs` was declared at file top but not initialised to per-team arrays at match start. First `ntApplyAllocationLock` call indexed into empty outer arrays.
**Fix:** Added initialisation in `ntStartMatch()` after team sizes are computed: `ntTeamWorkingAllocs = [0,1].map(team => members.map(() => ({firewall:0,honeypot:0})))`.
**Lesson:** Any state var sized to player count must be initialised at the point where player count is first known, not at declaration time.

### BUG-08 — Handshake layout + DNP allocation legibility (post-Phase-34 backlog testing, 21 June 2026, RESOLVED)
**What:** Three reported during backlog testing. (1) `screen-nt-handshake` ("INITIALISING OS…") used the `h-screen` split header/body/footer pattern, so the speaker pinned to the very top and Continue to the very bottom with a large empty gap — the stack was not grouped/centred. (2) On the DNP allocation screen the "Pool remaining: N FW · N HP" numbers were `text-white` sitting on the light page background → invisible. (3) Captains had no view of each leg's maze, so they were allocating blind.
**Fix:** (1) Converted the handshake to the centred single-wrapper pattern (`min-h-screen … flex items-center justify-center`, speaker `absolute top-4 right-4`, emoji + boot text + Continue all siblings in one `max-w-sm` wrapper) — the FRT BUG-02 lesson (split body/footer breaks centring). (2) Pool-remaining numbers → `text-stone-800 font-bold`; banner team label → `text-emerald-600`. (3) Added a self-contained `ntDrawNodePreview(canvas, node)` (draws bad sectors / native honeypots / ingress+egress bars for an *arbitrary* node — never reads `ntNode`/`ntMyPlacements`) and a `w-24 h-24` canvas per leg card, fed from `ntTeamNodes[pIdx]` (already present on every device via `NT_HUDDLE_START.allPlayerNodes`). SW → v106.
**Lesson:** Transient boot/gate screens default to the centred layout, never `h-screen`. White-on-light text is a recurring legibility trap when a screen mixes dark cards on the app's light page — colour-check every `text-white` that is not inside a dark container.

### OPEN — DNP "one captain controls both teams" + "stuck once allocations locked" (reported 21 June 2026, NOT yet reproduced)
**Reported:** In DNP, allocation appeared to be driven by a single player for both teams, and after locking the huddle seemed to hang.
**Investigation:** Static trace of the captain/team routing looks correct: `ntCaptainSlots = [capTeam0, capTeam1]` from `mpLobbyRoster.captainSlots` (remapped to post-reorder absolute indices in `mpConfirmRoster`), `ntTeamIdx = mpLobbyRoster.playerTeamIdx`; both the host (`ntStartMatch`) and clients (`NT_HUDDLE_START` handler) compute `isCap = mpMyPlayerIdx === ntCaptainSlots[myTeam]` per device, and `ntRenderAllocationScreen` renders only `ntMyTeamMembers()`. `ntCheckBothTeamsLocked()` requires **both** `ntTeamAllocLocked[0]` and `[1]` → if one team has no recognised captain (or all players landed on one team), that team never locks and the huddle hangs — which would also make one captain appear to own every leg. Most likely a team/captain *assignment* problem (everyone on one team, or captains not distinctly assigned in the Assign Spots roster), not the per-device routing. **Needs MP repro:** player count, how teams + captains were assigned in the lobby, and whether the second team had a distinct captain. Do not ship a speculative routing change until reproduced.

---

## Template Gaps

---

## Template Gaps

These patterns are novel to NT and should be elevated to rule files before or during the MP build.

### TG-01 — RAF-as-timer pattern (candidate for logic-engine.md § Timer Lifecycle)
`ntRafHandle` is the first suite-wide use of `requestAnimationFrame` as a primary game clock (all other games use `setInterval`/`setTimeout`). The existing Timer Lifecycle rule covers setInterval/setTimeout but not RAF. The cancellation requirement is identical — cancel in quit-confirm, `resetToLobby()`, and any early-exit transition — but the handle type and cancel call differ (`cancelAnimationFrame(ntRafHandle)` not `clearInterval`). Elevate to logic-engine.md with a side-by-side note.

### TG-02 — Roster-by-setting architecture (candidate for logic-engine.md § MDLM Patterns)
NT's DNP mode gates the multiplayer roster type (2-cluster teams + captains) behind the `ntSyllyMode` setting toggle. The `rosterConfig.type` and `hasCaptain` fields in `MP_GAME_CONFIGS` will be functions that read `ntSyllyMode` at lobby-confirm time rather than static strings. This is a new pattern — no existing game has a lobby configuration that changes based on a game setting. Candidate for a named pattern in logic-engine.md once Phase D is built.

### TG-03 — Locked-mode-option hook (candidate for engine-multiplayer.js)
The symmetric-fade UI (mode screen always shows all three options; the unavailable one dims with a contextual hint, mirrored by the Sylly toggle state) requires a per-game hook in `mpBuildModeSection()`. Current `dimmed` logic is driven only by `isLobby && !online`. Need a generic extension point — e.g. `cfg.getLockedModes?.()`  returning `[{ mode, hint }]` — so any game can declare which modes are gated and why. Highest-uncertainty Phase B item (R1). Design before touching `engine-multiplayer.js`.

### TG-04 — PTP sequential build loop for N>1 players (new PTP sub-pattern)
All existing PTP games run players simultaneously on one device (JEC, YGI) or pass the phone only for role reveals. NT's PTP mode requires a sequential per-player build loop: each player builds in isolation behind a handover gate, then all playbacks are shown side-by-side for comparison. This is the first pass-the-phone game-loop pattern in the suite. Document the gate reuse (`ntGateReadyCheck`/`ntCommitReadyCheck` matrices) when Phase A is built.

### TG-05 — Host captain direct-update rule (Phase D — candidate for logic-engine.md)
The dedup guard in `engine-multiplayer.js` drops envelopes where `originId === syllyDeviceUid`. This already covers readyCheck self-submission (documented in logic-engine.md). Phase D revealed it also applies to ALL ACTION types where the host is an active participant. A host captain sending `NT_ALLOCATION_UPDATE` to itself is dropped. The general rule — "any phase where the host is also a submitting participant must use direct-update + broadcast rather than a self-sent ACTION" — should be added to `logic-engine.md` § MDLM Patterns as an explicit extension of the existing readyCheck rule.

### TG-06 — `keepInventory` batch-node pattern (Phase D — candidate for new-game-technical-template.md)
DNP generates N nodes sharing one inventory pool using `ntGenerateNode({keepInventory: true})` for N-1 subsequent calls. This pattern (one shared resource distributed across N individually-generated elements) is novel to NT. If a future game has shared team resources distributed across per-player elements, this pattern applies. Consider a note in `new-game-technical-template.md` § Word Bank & Data.
