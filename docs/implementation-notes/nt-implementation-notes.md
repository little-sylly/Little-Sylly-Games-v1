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

### Cleanup — dead skeleton stubs removed (Phase-audit Protocol A, 30 June 2026)
**What:** Two skeleton-build stubs survived to ship with stale `TODO` comments and zero references anywhere in the codebase — `ntComputePlayback()` (empty body) and `ntValidateTeams()` (`return true`). The real DNP implementations landed elsewhere (`ntComputeTimeline`, the allocation/SYNC path), leaving these orphaned. **Fix:** deleted both. **Lesson:** Protocol B skeleton stubs that get superseded by differently-named real functions don't error and don't get caught at ship — grep for self-references on every scaffold function name before the phase snapshot.

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

### BUG-09 — DNP "one captain controls both teams" + "stuck once allocations locked" (reported 21 June 2026, RESOLVED with 4-player repro)
**What:** Repro = 4 players, 2 per team. Symptoms: (1) the captain anchor appeared on *every* player on the Assign Spots roster; (2) only the host (seat 1) had a populated allocation hub, and it drove its own team only — the other three devices showed an empty "MY TEAM — ALLOCATION HUB" with the full untouched pool; (3) because the second team's captain was never recognised, `ntCheckBothTeamsLocked()` never fired and the huddle hung after the host locked.
**Root cause (the real bug):** NT's `onPassThePhone` (`engine-multiplayer.js`) populated `ntTeamIdx` / `ntCaptainSlots` / `ntTeamNames` / `ntPlayerNames` / `ntPlayerCount` **only on the host**. The `'client'` branch was an empty comment ("waits for SYNCs"). Clients DO receive the confirmed roster — `GAME_START` sets `window.mpLobbyRoster` immediately before `onPassThePhone()` fires (line ~873) — but NT never read it on clients. So on every client `ntTeamIdx` stayed `[]` and `ntCaptainSlots` `[-1,-1]`. In the `NT_HUDDLE_START` handler `myTeam = ntTeamIdx[mpMyPlayerIdx]` was `undefined` → `ntMyTeamMembers()` returned `[]` (empty hub), the team-name fell back to "My Team", and `isCap = mpMyPlayerIdx === ntCaptainSlots[undefined]` was always `false` (no client could be its team's captain). The earlier static trace assumed both code paths shared the population logic — they did not. **Lesson: when a host derives per-device state from the lobby roster, the client branch of `onPassThePhone` must derive the SAME state — the roster is on `window.mpLobbyRoster` for both. An empty client branch is the tell.**
**Fix (3 parts):**
1. **Client roster population** — refactored NT's `onPassThePhone` so host *and* client both read `window.mpLobbyRoster` (team idx, captain slots, team names) and set `ntPlayerCount`/`ntPlayerNames` from `mpPlayerSlots`; only the screen navigation differs (host → into game, client → waits for SYNCs). This alone fixes the empty hubs, the missing second captain, and the stuck-on-lock. *(Round 2: the captain-marker styling was generalised and the bridge reworked — see BUG-10.)*
2. **Captain marker legibility (generic, all `hasCaptain` games)** — the roster captain button highlighted the captain via `text-cyan-700` vs `text-stone-300`, but **colour-emoji glyphs (⚓/⚡) ignore CSS `color`**, so every marker rendered identical system-blue → "everyone is a captain". Switched the active/inactive state to `opacity` + a `bg-emerald-100 ring` pill (both DO affect emoji). Also made the icon per-game via a new `rosterConfig.captainIcon` (NT = `⚡`; default `⚓` preserves SS's naval anchor).
3. **Cluster bridge preview (supersedes BUG-08 per-leg maze)** — replaced the per-leg `ntDrawNodePreview` thumbnails with `ntDrawBridgePreview(canvas, nodes, cell)`: the team's full end-to-end bridge, all legs chained left→right (ingress ▸ egress) with green ingress / amber egress port bars + connector lines + leg-number badges. Rendered as one inline `w-full` strip at the top of the hub; tapping it opens `nt-bridge-preview-overlay` (a larger redraw, tap-to-close) so captains can eyeball at a glance or strategise in detail. Overlay torn down in `resetToLobby()` + `ntResetState()`. *(Superseded by BUG-10 — single-canvas connector-line approach replaced by chained per-leg canvases with seam walls.)*
**SW → v107.**

### BUG-10 — DNP round 2: post-lobby routing, bridge snaking, rebalance allocation, build-commit freeze (reported 21 June 2026, RESOLVED)
Five issues from the next DNP test pass, fixed together. **SW → v108.**
1. **Host stuck on the menu after readying the lobby.** NT's `onPassThePhone` host branch called `showScreen('screen-nt-menu')`, so the host had to tap Play a second time. Other MDLM games (FRT/GTH) go straight in. Fix: host branch now calls `ntStartSession()` directly (handshake → match). *Lesson: post-lobby `onPassThePhone` should enter the game, not re-show the menu — the menu's pre-lobby visit already held Settings/How-to.*
2. **Captain anchor on everyone (round-1 carry-over, now generalised).** The marker styling was switched from text-colour to opacity + emerald pill (colour-emoji ignore CSS `color`), and the icon made per-game via `rosterConfig.captainIcon` (NT `⚡`, default `⚓`).
3. **Bridge didn't actually connect (yellow fudge line).** Reworked: DNP node generation now **chains ports** — `ntGenerateNode(keepInventory, forcedIngressIdx)` pins each leg's left ingress row to the previous leg's egress row, generated per-team in member order (`ntStartMatch`). Rendering replaced `ntDrawBridgePreview` (one wide canvas + connector line) with `ntDrawLegCanvas` (one canvas per leg) laid edge-to-edge by `ntBuildBridgeInto` inside an `overflow-x-auto` scroll row. Neighbouring legs connect only through the green-ingress▸amber-egress channel; the rest of each **shared** edge is walled in bad-sector grey (`wallLeft`/`wallRight` opts), making it visually obvious you can't cross elsewhere. Junction rows vary per seam (each leg's egress is free) so the path snakes. Player **names sit above each maze as HTML** (crisp — replaced the blurry canvas-drawn leg numbers). Bridge is shown to captains AND non-captains; tap opens the enlarged overlay (now a scrollable `nt-bridge-preview-host` of the same per-leg columns).
4. **Allocation reframed as rebalance + non-captain declutter.** Every leg now **defaults to its base inventory** (sum = pool, transfer pool starts at 0) instead of zero; captains shift FW/HP between legs (the +/- bounds logic was already conserved — only the init changed from 0 → base). Doing nothing plays every leg at base, so the strategic layer is fully skippable and never taxes the flow. The transfer-pool counter moved out of the top banner into a captain-only "Rebalance Cluster" card grouped with the controls. **Non-captains no longer see allocation rows at all** (clutter; they can't see live updates) — just the bridge + a "study your relay-leg" note.
5. **Build-commit freeze — host "waiting for team…" forever, clients "submitted".** Three real bugs in the commit path: (a) `ntResolveCycleMdlm` broadcast `NT_PLAYBACK` but never navigated the **host** (host never receives its own SYNC) — it now mirrors the NT_PLAYBACK nav locally after broadcasting; (b) a lost `NT_COMMIT` could hang the round permanently — added a host-only **resolve-guard** (`ntForceResolveCycle` via `ntResolveGuard`, scheduled in `ntStartBuildTimer` for `endTimestamp + 4s`) that resolves with whatever placements arrived (missing → empty leg), plus a `ntCycleResolved` double-resolve guard, and made client `NT_COMMIT` fire-and-forget (dropped `mpLockSync` so a residual lock can't silently drop it; `ntCommitted` guards double-send); (c) the grid stayed editable after commit — `ntCommit` now sets `pointer-events:none` on `#nt-build-grid` (reset in `ntShowBuild`). Also pre-sized `ntPtpPlacements` to `ntPlayerCount` (no holes) and removed the `ntShowBuild` double-timer-start by passing `endTimestamp` through `ntShowBuild(endTimestamp)`. *Lesson: every host resolve/broadcast path must also drive the host's own UI, and any all-players readyCheck needs a timer-anchored fallback so one lost packet can't strand the round.*

### BUG-11 — DNP legs were NOT paired across teams (every player a different node) (reported 22 June 2026, RESOLVED)
**What:** With 4 players (2v2) every player received a *different* randomly-generated node. The Cluster Ceiling scoring (`ceiling_leg_k = max(teamA_leg_k_latency, teamB_leg_k_latency)`) is only meaningful if leg *k* is the **same** geometry for both teams — otherwise it compares latencies across unrelated mazes. Symptom chain reported by the owner: "nodes don't match the preview", "every player a different node — should be 2 pairs across the teams", and playback that didn't line up leg-to-leg.
**Root cause:** BUG-10's node-gen rewrite chained legs **per team independently** (`[0,1].forEach(team => …)`), producing `legCount × 2` distinct nodes. The correct DNP model is `legCount` nodes total, each shared by the cross-team pair at that leg position.
**Fix:** `ntStartMatch` now generates ONE shared chain of `legCount` nodes (chained egress→ingress) and assigns each node to BOTH `ntTeamNodes[teamA[k]]` and `ntTeamNodes[teamB[k]]`. Both teams harden identical geometry per leg; both teams' bridges render identically; the ceiling comparison is now like-for-like. Node objects are read-only geometry (hardening lives in per-device `ntMyPlacements`), so the shared reference is safe — and Firebase serialises the two indices to equal copies for clients. **SW → v109.**
*Lesson: when a scoring rule compares matched units across two groups, those units must be the SAME generated artefact, not independently-generated ones — generate once, assign to both.*
**Follow-up — allocation UI redesign (owner chose "Map Hero + Tap-a-Leg", DONE, SW → v110):** the old all-legs stepper stack (corporate-form feel, tiny map) was replaced. The allocation screen is now a vertical stack of relay-leg **lanes**: the selected lane expands to a hero maze (cell 10, 160px), the rest stay compact thumbnails (cell 4, 52px). Tapping a lane (`ntSelectAllocLeg`) makes it the target of a single **morphing control hub** (`ntRenderAllocControlHub`) docked above the Lock button — it shows `MODIFYING ▸ LEG_NN · NAME`, the shared `BANK n FW · m HP`, and a draw(+)/return(−) stepper per asset (scale-invariant — one panel regardless of leg count). The device's own leg auto-expands on entry. Non-captains see read-only lanes, no hub. Header consolidated to a single terminal banner (`SYS_PARTITION // SHARED_ALLOCATION_HUB`, `#nt-alloc-header`, timer overwrites with `SYS_PARTITION // HUB · MM:SS`) + a console directive line; the repeated team-name/"Allocation Hub" subheads were dropped. New state `ntAllocSelectedLeg`. `ntBuildBridgeInto`/`ntOpenBridgePreview` (the horizontal snake bridge) are now unused on the allocation screen — **reserved for the playback rework**.
**Layout polish (SW → v111):** the first cut scrolled and left a big white gap (flex-1 body pushed content to the top, footer to the bottom). Reworked to a **fixed viewport** (`screen-nt-allocation` is `h-screen overflow-hidden`; body is `flex flex-col flex-1 min-h-0` with **no scroll**): directive (shrink-0) → a tight **horizontal mini-card row of the non-selected legs** (shrink-0, the row that scales to 3v3/4v4 without pushing the Lock button under the fold) → the selected leg as a **centre-stage hero** (`flex-1 min-h-0`, canvas `max-w-full max-h-full` so it fills/scales to the remaining space) → control hub + Lock in the fixed footer. Pruned the redundant per-lane progress bars (numbers now live only in the mini-cards + control hub). Stepper helper text → **`− RECALL · + DEPLOY`** (unambiguous direction). Added faint structural gridlines (one per 2×2 block unit, `rgba(100,116,139,0.28)`) in `ntDrawLegCanvas` so the corridor layout is readable. `ntAllocBar` removed (dead).
**Follow-up — playback "continuous bridge flow" (owner spec, DONE, SW → v112):** DNP playback no longer shows each device its own single leg — it now plays the **team bridge as one continuous journey**, identical on every teammate's screen. `ntBuildJourney(team)` lays the team's legs end-to-end (each leg's timeline `offset` by the cumulative latency so far; timelines normalised against Firebase array-stripping). A single sim clock (0…`journey.total`) drives `ntStartJourneyPlayback`'s RAF; each frame `ntRenderJourneyFrame(simMs)` finds the active leg (`ntJourneyLegAt`), **repoints the shared renderer globals** (`ntNode`/`ntPlaybackTimeline`/`ntMyPlacements`) at that leg and calls the existing `ntRenderFrame(simMs − leg.offset)` — so the single-node renderer (trail, honeypots, head, status) is reused unchanged per leg. On a leg boundary the canvas does a quick CSS slide-in (`ntJourneySlide`, the owner's viewport-slider — not a mega-canvas). Top bar shows `NT-NODE-0k · NAME` + cumulative latency. **Macro Team A/B tabs** (`ntRenderJourneyTabs` → `ntSwitchJourneyTeam`) rebuild the journey for the other team (data for both teams is in the full `ntPtpTimelines`/`ntPtpPlacements`/`ntTeamNodes`) and restart from ingress; default tab = own team. **Segmented scrubber** (`ntRenderJourneySegments`) renders one width-∝-latency labelled section per leg above the range handle. The pause/scrub/skip-end handlers branch on `ntIsDNP()` to journey-aware variants (`ntToggleJourneyPlayback`/`ntResumeJourneyAfterScrub`) using `journey.total` as the duration. New state `ntPbTeam`/`ntPbJourney`/`ntPbActiveLeg`; new screen elements `#nt-journey-tabs` + `#nt-journey-segwrap`/`#nt-journey-segments` (hidden in non-DNP, torn down in `ntResetState` along with the canvas transform). *Lesson: a multi-segment animation can reuse a single-segment renderer untouched by repointing its input globals per segment and feeding it segment-local time — no renderer fork needed.*

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

---

## Bug Index (post-Phase-D fixes — June 2026)

### BUG-12 — Sound buttons inert on all NT screens (June 2026, RESOLVED)
**What:** The 🔊 button on every NT screen did nothing when tapped.
**Root cause:** `engine.js` attaches `openSoundOverlay` to all `.btn-open-sound` elements at parse time via a top-level `querySelectorAll`. NT's HTML section sits at ~line 7174 in `index.html`, well **after** the `<script>` tags (~line 6771). The querySelectorAll runs before that HTML exists, so NT's sound buttons are never captured.
**Fix:** Added explicit re-wiring inside NT's `DOMContentLoaded` callback (bottom of `nt.js`), scoped to NT screen IDs: `document.querySelectorAll('#screen-nt-menu .btn-open-sound, #screen-nt-setup .btn-open-sound, …').forEach(btn => btn.addEventListener('click', openSoundOverlay))`.
**Lesson:** Any game whose HTML section in `index.html` appears after the `<script>` block must re-wire its `.btn-open-sound` buttons inside a `DOMContentLoaded` callback. FRT is the established reference implementation. The pattern is safe to add to all future late-HTML games at scaffolding time. See also SHP BUG-03 and FLW BUG-02 (same bug, same fix).

### TG-06 — `keepInventory` batch-node pattern (Phase D — candidate for new-game-technical-template.md)
DNP generates N nodes sharing one inventory pool using `ntGenerateNode({keepInventory: true})` for N-1 subsequent calls. This pattern (one shared resource distributed across N individually-generated elements) is novel to NT. If a future game has shared team resources distributed across per-player elements, this pattern applies. Consider a note in `new-game-technical-template.md` § Word Bank & Data.

---

## Bug Index / Design Decisions (polish round — 15 Aug 2026)

### BUG-13 — Diagnostic Summary's 🔊/✕ used the full-screen-menu absolute position on a content screen (RESOLVED)
**What:** `screen-nt-summary` used `absolute top-4 right-4` for its sound/exit icons — the pattern reserved for full-screen menus with no header row (ui-style.md Global UI Protocol item 1) — even though it's a content/results screen with a real heading and scoreboard. Visually the icons floated disconnected from the title.
**Fix:** Rebuilt the top of the screen as a proper header row (`flex items-start justify-between`, title+subtitle left, icons right), matching the CJAR/FLW gameover reference shape.
**Lesson:** "Full-screen menu" in the Global UI Protocol means an emoji+title splash with no other content — a results/summary screen with a scoreboard is a content screen and should use the header-row pattern, not absolute positioning.

### BUG-14 — Diagnostic Summary's ✕ always did a bare `resetToLobby()`, even mid-match (RESOLVED)
**What:** `screen-nt-summary` serves double duty — the per-cycle summary (more cycles to come) and the final match summary (game over) — but its ✕ handler always called `resetToLobby()` directly with no confirmation, which is only correct for the final case (Global UI Protocol rule 3: "Post-game ✕ → resetToLobby() directly"). Exiting from a mid-match cycle summary skipped the quit-confirm gate entirely and silently dropped the match.
**Fix:** Branch on `ntSummaryMode`: `'match'` still does `resetToLobby()` directly; `'cycle'` now opens the existing `nt-quit-overlay` (same mid-game quit-confirm gate every other NT screen uses).
**Lesson:** A screen reused for both a mid-game and a post-game moment needs its ✕ handler to check which moment it's actually in — don't assume a screen's exit behaviour from its *name* alone.

### D17 — Merged the boot flavour screen into the cycle gate (`screen-nt-handshake` retired); one continuous screen, two named contexts (revised three times — 15 Aug 2026)
**What happened:** Every cycle briefly flashed a separate `screen-nt-handshake` ("INITIALISING OS…" + a Continue button) before landing on `screen-nt-gate`'s actual readiness prompt — two taps/screens for what is really one beat, and for MDLM the handshake was usually invisible anyway (overwritten synchronously the instant the host's `NT_GENERATE` fired).
**Decision (final shape, after three owner-feedback passes):** Deleted `screen-nt-handshake`. `screen-nt-gate` is one `<section>` used for two named contexts, chosen by which function shows it:
- **"Cycle Initialisation Gate"** (`ntShowGate`/`ntShowMdlmGate`/`ntBeginPtpTurn`/DNP's allocation hand-off): heading + sub show immediately, the terminal boot log (`NT_BOOT_LINES` + a caller-supplied final line, e.g. `LOGIN: ADMIN-2`) types out underneath at a slow, readable pace (200ms lead-in, 550ms/line, 600ms read-pause on the final line), and the ready button is the *only* thing that reveals once typing finishes — it appears right under the still-visible log, not as a second block swapping in under a second heading. `ntPlayGateBoot(lastLine, onDone)` is the entry point; `onDone` (used only by DNP) runs instead of revealing the button, for the hand-off into `screen-nt-allocation`.
- **"Cycle Diagnostic Gate"** (`ntShowGatherGate`, the post-build "gather to watch playback" moment): no boot log at all — `ntShowGateNow()` shows heading/sub/button immediately. This isn't a login moment, so playing the AMAZE INC flavour there was pointless.
**Two earlier passes got the scope wrong, in different ways — both from mis-reading "combine X into Y":**
1. First pass only played the boot at true cycle-start and skipped PTP multi-admin turns entirely, using a `ntGateBootActive`/`ntGateBootPending` queue to reconcile the host's synchronous path against the client's async receipt. Corrected once every gate entry needed the boot: made every caller self-contained (configure text, then call `ntPlayGateBoot`), which also made the pending-queue unneeded — removed.
2. Second pass played the boot on *every* gate entry including the gather gate, and kept the heading+sub+button as a single `#nt-gate-ready-wrap` div that stayed hidden until the boot finished — which still *looked* like two screens (an unnamed boot, then a second block with its own heading). Corrected by hoisting heading/sub out of the wrap to always-visible, removing the wrap entirely, and toggling only the button; and by giving the gather gate its own name + no-boot path instead of reusing the login boot for a non-login moment.
**Header-icon placement was also wrong on the first pass:** `screen-nt-gate` kept the "full-screen menu" `absolute top-4 right-4` position for 🔊/✕ from before the merge, but a screen with real, changing content is a gameplay-flow screen per `ui-style.md`'s Global UI Protocol, which calls for a header row. Fixed to match `screen-nt-setup`/`screen-nt-build`/`screen-nt-allocation`'s existing header-row shape ("System Access" eyebrow + icons right-aligned).
**Bonus fix:** `ntShowMdlmGate()` had always written a per-cycle heading (`"VS-01 — Initialising"`) to `document.getElementById('nt-gate-heading')` — an id that never existed in the HTML, so the write silently no-opped. Folded the cycle tag into the sub-text instead (the heading is now the fixed context name, "Cycle Initialisation Gate").
**Lesson:** "Merge screen A into screen B" can mean at least three different things — combine at one call site, apply everywhere, or *visually* read as one screen instead of a hide/reveal swap between two internal blocks — and they produce meaningfully different code. Confirming which reading is meant before implementing is cheaper than three consecutive rounds of "still not it." A concrete tell for the third case specifically: if a "merged" screen has one block that's entirely invisible until another block finishes and disappears, that's still two screens wearing one `<section>` tag — the fix is to hoist whatever should persist (a title) out of the toggle and shrink the toggle to only the thing that's actually new (a button).

### D18 — Removed the "BOUBOU-" fragment from the play terminal; added a computer-style player prompt
**What happened:** The build screen's node-name line baked in a fixed `BOUBOU-6D617A65` token that's no longer wanted, and the screen had nowhere showing *whose* turn it currently was (relevant in PTP and MDLM, where the builder differs per device/turn).
**Decision:** Dropped the token (`SYS_INIT // NT-NODE-01` only). Added a `user:\[admin-name]` prompt-style label (`#nt-build-player`) to the top-left of the VM window's status row, pushing the firewall/honeypot inventory counters to the middle of that row and leaving the countdown timer on the right. The name resolves per mode: PTP uses the active `ntPtpTurn`, MDLM uses the device's own `mpMyPlayerIdx`, solo is always seat 0.
**Also renamed:** the PTP setup screen's "Assemble Cluster" heading to "Provision Admins" — actual IT/sysadmin terminology for creating the operator accounts the screen is really collecting names for, keeping the "System Access" eyebrow above it meaningful rather than redundant.

### D19 — Solo folded into the PTP-turn machinery (`ntShowGate`/`ntResolveCycle` retired)
**What happened:** solo (1 admin) had its own fully parallel code path alongside PTP's — separate gate entry (`ntShowGate` vs `ntBeginPtpTurn`), separate commit/resolve (`ntResolveCycle` vs `ntResolveCyclePtp`), and separate playback display (`ntShowPlayback` direct vs `ntShowComparisonPlayback`). Two visible consequences: the solo ready button never carried a player name (`ntShowGate` didn't do what `ntBeginPtpTurn` already did), and the System Logs button never appeared for solo matches, because `ntResolveCycle()` never wrote to `ntAllCycleTimelines`/`ntAllCyclePlacements`/`ntAllCycleNodes` the way `ntResolveCyclePtp()` does.
**Decision:** deleted the solo-only path entirely. `ntBeginCycle()` now always calls `ntBeginPtpTurn()`; `ntCommit()`'s single-device branch now always calls `ntCommitPtp()`. Solo is PTP with `ntPlayerCount === 1`: `ntComitPtp()`'s `ntPtpTurn++ === ntPlayerCount` check already skips the gather gate for a single player and goes straight to `ntShowComparisonPlayback()`, which already hides the comparison panel when `ntPlayerCount <= 1` — both were already correct for the N=1 case, just never exercised by solo before. `ntShowGate()` and `ntResolveCycle()` were dead code after the swap and were removed.
**Lesson:** when two code paths differ only in *how many players there are*, check whether the "multi" path already degrades correctly at N=1 before assuming a dedicated N=1 path is needed — here it already did (both the turn-advance and the panel-visibility checks were already `> 1` conditionals), so the separate solo path was pure duplication that had quietly drifted (missing the name on the button, missing the log population) rather than a deliberate design difference.

### D20 — Diagnostic Summary's "Next Cycle" was a genuine client no-op; added a readyCheck gate matching the Cycle Initialisation Gate
**What happened:** live-testing MDLM with 3 players surfaced that clients tapping "Next Cycle" on the per-cycle Diagnostic Summary did *nothing at all* — the handler was `if (mode === 'client') return;` with a comment claiming "client waits for NT_GENERATE," and the host advanced everyone unilaterally on its own click with no confirmation from anyone else.
**Decision:** added `ntSummaryReadyCheck` (a per-player matrix, same shape as `ntGateReadyCheck`/`ntCommitReadyCheck`) and a new `NT_SUMMARY_READY` ACTION, and replaced the single hard-coded click handler with a swappable `ntSummaryCallback` — the same pattern `ntGateCallback` already uses for the Cycle Initialisation Gate. `ntShowSummary()` now configures the button per role: client sees "Ready ▶" → tap sends `NT_SUMMARY_READY` and disables to "Waiting for host…"; host self-marks its own slot on reaching the screen (mirrors the gate's host-readyCheck rule — host is already implicitly ready, doesn't need to tap anything to count itself) and "Next Cycle ▶" stays disabled until every slot is true.
**Not itself the fix for:** the separately-observed bug where clients were seen stuck on a bare "Submitted…" build-screen state (never even reaching the summary screen at all) — that's upstream of this gate and wasn't closed this round; see BUG-15 below, which found and closed it.

---

## Bug Index (MDLM desync — root-caused and harnessed, 15 Aug 2026)

The three defects below were all found by static analysis after a live 3-device session, then
**reproduced deterministically** by the new `tools/verify-nt-loopback.js` (which went red on 20
checks before the fix and is green on 119 after). All three are client-only: the host never
round-trips its own state through the wire, which is why a host-side playtest looks perfect.

### BUG-15 — `node.nativeHoneypots: []` is erased in flight; two unguarded render reads then throw per grid cell (RESOLVED)
**What:** in a 3-player MDLM match, both clients rendered a completely blank build grid (correct
header, timer and counters, but zero tiles — "a black terminal") on cycles 1, 3, 4 and 5 but not 2.
Each affected client was then stuck: the build timer never started, and it sat on "Submitted…"
while the host played on.
**Root cause:** `ntGenerateNode` rolls `convertN = ntRandInt(0, min(ntNativeHoneypots, badSectors.length))`
to decide how many bad sectors become Native Honeypots. **That roll can be 0** — and is *always* 0
under the shipped **"Native Honeypots: 0"** setting — leaving `nativeHoneypots: []`. Firebase
deletes empty arrays, so the client's `payload.node.nativeHoneypots` arrives `undefined`. Five of
the seven read sites in `nt.js` guard with `|| []` (1159, 1160, 1426, 2072, 2073 — hardened in the
Aug 2026 BUG-06 sweep); the two **render** sites did not: `ntBlockAt` (`n.badSectors.find` /
`n.nativeHoneypots.find`, called once per grid cell) and `ntDrawMaze`. `ntRenderBuildGrid` clears
the grid *before* painting, so the throw left it empty, and because it escaped through the
`NT_BUILD_BEGIN` applier the rest of that applier — including `ntStartBuildTimer` — never ran.
**Why it looked intermittent:** `convertN` is re-rolled every cycle, so whether a given cycle broke
was a coin flip. The harness reproduces the exact reported pattern — a 5-cycle trace of
`[[324,0,0], [324,324,324], [324,0,0], [324,0,0], [324,0,0]]`.
**Fix:** `ntNormaliseNode()` applied at every point a node arrives from a packet (`NT_GENERATE`
both branches, `NT_HUDDLE_START`), **plus** `|| []` at the two render sites so solo/PTP paths (where
the node never crosses a wire) are defended by the same shape as the other five.

### BUG-16 — `timeline.fires: []` erased the same way; `ntRenderFrame` throws on the playback path (RESOLVED)
**What:** after all three players committed, only the host reached playback. Both clients stayed on
"Submitted…".
**Root cause:** identical class, one level deeper. A player who places **no honeypots** produces a
timeline with `fires: []` and `slowSpans: []`. The `NT_PLAYBACK` applier rebuilds `allPlacements`
per-seat (the existing BUG-06 fix) but assigned `payload.timelines` **raw**. `slowSpans` is guarded
at its three read sites and `ntBuildJourney` guards all three fields — but `tl.fires.forEach(...)`
in `ntRenderFrame` (two sites) was not, so the frame threw. Note the guard immediately above it
checks `tl.samples && tl.samples.length`, which does **not** protect `fires`.
**Fix:** `ntNormaliseTimeline()` mapped over `payload.timelines` in the `NT_PLAYBACK` applier,
mirroring the `Array.from` rebuild `allPlacements` already gets one line below; plus `|| []` at both
`ntRenderFrame` sites.

### BUG-17 — the MDLM Diagnostic Summary rendered nothing at all (RESOLVED)
**What:** the summary showed `--.--%` with no scoreboard. Reported as "by round 4 the SER is
broken", but it was never working in MDLM at all — the placeholder is the static HTML default, and
nothing ever overwrote it.
**Root cause:** `ntRenderSummary`'s multi-player leaderboard was gated behind
`ntPlayerCount > 1 && window.syllyMultiplayerMode === 'single'`, so MDLM fell straight through to a
one-line stub commented *"MDLM multiplayer rendering arrives with host-authoritative scoring (MP
step)"* — a TODO that was never completed. Found by the harness, not by inspection: the check
"summary board has a row per player" returned 0 rows on all three devices.
**Fix:** dropped the mode condition. The branch reads `ntOverallSER` / `ntCycleSERs` /
`ntPlayerNames`, all of which the `NT_PLAYBACK` applier already populates on every client from the
host's own numbers, so the identical render is correct in both modes — no MDLM-specific code needed.
**Lesson:** a `mode === 'single'` condition on a *render* function is worth treating as suspicious
by default. Rendering is the same job regardless of who computed the numbers; the mode check is only
justified when the data genuinely isn't there, and here it was.

### D21 — `tools/verify-nt-loopback.js`
**What happened:** NT was the last game with both a render seam and MDLM and **no**
`tools/verify-*.js` coverage of any kind. All three defects above are structurally invisible to the
`'single'`-mode harness style (`getElementById: () => null` short-circuits every render guard, so
no render code executes) and to a host-side playtest (the host never round-trips its own state).
**Decision:** built on `verify-cjar-loopback.js` for the wire and assertion style, with two upgrades
taken from `verify-shp-loopback.js` that NT specifically needed: an **N-client `makeRoom`** (the bug
was reported at 3 players and presents as "one client is fine and the other is not" — a 2-device
harness cannot express that) and a **seeded mulberry32 `Math.random`** (`ntGenerateNode` is unseeded
and its randomness *is* the trigger). 119 checks, `NT_SRC=` and `NT_SEED=` env hooks.
**DOM mock is a superset of CJAR's** and each addition is load-bearing: `parentNode`/`replaceChild`/
`cloneNode` (`ntRenderBuildGrid` swaps the grid for a shallow clone to strip listeners), a complete
no-op canvas 2D context, `offsetWidth`/`clientWidth`, a real `classList`, and — the biggest delta —
an `innerHTML` setter that **parses out id/class children** so the DNP allocation hub's
`getElementById('nt-lane-maze-N')` and `querySelectorAll('.nt-alloc-lane')` resolve. With CJAR's
store-the-string-only setter the entire DNP render path is skipped in silence.
**Two lessons worth keeping:**
1. **A precondition you wait for is a check that quietly stops testing.** Defect 2's trigger (a
   timeline with no fires) occurs naturally on some seeds and not others; the first version asserted
   `timelines.some(t => !t.fires.length)` and passed on seed 0 while silently testing nothing on
   seed 12345. Replaced with a hand-built fires-free timeline pushed through the real wire — the
   `stackDeck` idiom. **Run a new harness across several `*_SEED=` values before trusting it.**
2. **`drain()` needs a time window.** NT's host arms `ntResolveGuard` at `endTimestamp + 4 s`; a
   drain-everything pump fires it instantly and force-resolves the cycle before anyone has built,
   which looked like a game bug until traced to the harness. `step()` now ignores timers due beyond
   5 s.

---

## Design Decisions (DNP Sylly-Mode round — 16 Aug 2026, SW v191)

Four items shipped as one batch. Design record: `docs/net-trace-dnp-mode-update.md` (the
owner↔Claude transcript that settled it, kept verbatim because the session that produced it was
lost before any doc was written — see the note under D22).

### D22 — DNP allocation: free-rebalance → tally-deposit (brush + tap a leg)
**What happened:** the shipped allocation hub was a bank-mediated *transfer* with a selection step.
Moving 2 firewalls from P1 to P2 was six interactions (tap P1's lane, −, −, tap P2's lane, +, +),
and the single-target control hub meant the captain could never see two legs' numbers at once. Two
deeper problems underneath: the captain had **no latency feedback** to judge a trade with (higher
latency is *better* in NT — you're defending — and nothing on screen said which leg converted a
firewall into the most delay), and "take from P1 to give P2" only reads naturally at 2v2.
**Decision:** every leg keeps its base inventory **untouchably**; the team gets a **surplus**
(`NT_SURPLUS_FIREWALL = 3`, `NT_SURPLUS_HONEYPOT = 1`, **per team member**) and the captain arms a
resource and taps a leg to deposit one unit. Undo (pops the last deposit) and Reset All sit beside
the brush pills; long-press a leg withdraws one unit as a bonus affordance, not the primary one.
**Why this shape rather than the "Priority Leg" first proposal** (one tap choosing a single leg to
receive the whole surplus): the owner's counter-proposal removed a *concept* rather than adding
one — in Priority Leg a leg tap meant "select", here it means "deposit", so there is no mode split
at all, and it scales past one leg without adding taps. Per-member scaling keeps the per-leg average
constant, so 4v4 doesn't feel starved relative to 2v2.
**Why the model is purely additive:** a captain who does nothing plays exactly the node everyone
else would have. That is what killed the transfer confusion — there is no "who lost resources"
question, only "who got extra".
**Architecturally it is derivation-only:** `ntAllocations` keeps its exact array shape, so
`NT_ALLOCATION_UPDATE` / `NT_ALLOCATION_LOCK` / `NT_HUDDLE_START` / `ntTeamWorkingAllocs` and the
loopback harness all survive untouched. Retired: `ntAllocSelectedLeg`, `ntSelectAllocLeg`,
`ntAdjustAllocation`, `ntRenderAllocControlHub`. Added: `ntAllocBrush`, `ntAllocDeposits` (a
**captain-local** Undo stack, never synced), `ntDepositAlloc`, `ntWithdrawAlloc`, `ntUndoDeposit`,
`ntResetDeposits`, `ntPushAllocationChange`, `ntAllocBank`, `ntLegHoneypotCap`, `ntAllocRefuse`.
**Three copies of the surplus formula exist and all three had to move together** — the host's own
pool, the `allPools` payload every client reads, and the host's validation ceiling. The first two
being one line apart is why they were caught; the third lives ~2,300 lines away in
`ntHandleEnvelope` and would have rejected *every* legitimate deposit from a client captain.
**Emergent consequence, deliberately not pre-solved:** the hardening window is fixed per player
(45/60/90/120 s), so dumping all 9 firewalls on one leg at 3v3 gives that player ~23 blocks to place
in the time everyone else places ~14 — they may physically run out of clock. That is a real cost on
concentration and it forces the captain to *talk to* the player rather than decide at them. Worth
watching in the first live session; the receiving player never consented to the workload.

### D22a — the honeypot ceiling conflict, caught before implementation
**What happened:** costing out the numbers surfaced that `NT_ALLOC_HONEYPOT_CAP = 2` would make the
honeypot half of the surplus mostly undeliverable — base honeypot already rolls 0–2, so a leg whose
base rolled 2 could accept **zero** surplus, and at 3v3 the captain would hold 3 honeypots with
almost nowhere legal to put them. That reads as broken, not strategic.
**Decision:** in DNP the per-leg ceiling is `NT_HONEYPOT_CAP − node.nativeHoneypots.length`
(`ntLegHoneypotCap`) — up to 4 when natives are 0, which is the shipped default setting.
**Why that is not "raising a cap to make the feature work":** `ntGenerateNode` *already* computes its
random roll as `min(NT_ALLOC_HONEYPOT_CAP, NT_HONEYPOT_CAP − natives)`. `NT_ALLOC_HONEYPOT_CAP` sizes
a **per-cycle random roll**; `NT_HONEYPOT_CAP` is the node's real physical ceiling. A deliberate team
investment is not a random roll, so it is bounded by the latter. Both constants now carry comments
saying which job they do, because the names alone do not distinguish them.
**Two bounds now apply to a honeypot deposit and either can bind first** — the node's ceiling and the
surplus actually in hand. The harness asserts the fill stops at `min(ceiling, base + surplus)`;
hard-coding either one alone passes only on the seeds where that one happens to be smaller.
**Feedback for a refused tap:** `ntSetRouting()` targets the **build** screen's `#nt-routing-status`
and silently no-ops on the allocation screen, so a new `#nt-alloc-status` line carries both the live
surplus readout and the refusal message, with `playBoing()`. It uses **no timer** — the next
successful action re-renders and restores the readout — so there is no handle to add to teardown.
Each leg also shows its own live ceiling (`HP 1/3`, amber when full), which is what makes a refusal
predictable rather than surprising.

### D22b — the host's authority check was bypassable via LOCK
**What happened:** found while adding the ceiling. `NT_ALLOCATION_UPDATE` validated a client
captain's proposal against the team pool, but `NT_ALLOCATION_LOCK` → `ntApplyAllocationLock` took
whatever it was handed and committed it straight into `ntAllPlayerAllocations`. A client could skip
the validated path entirely and lock in anything it liked.
**Decision:** extracted `ntValidateTeamAllocations(teamIdx, proposed)` — returns a sanitised copy or
`null` — and routed **both** paths through it. A rejected LOCK still locks (a captain who tapped Lock
has locked) but falls back to the team's last valid working state rather than committing the
proposal.
**Lesson:** validating "the path the UI uses" is not validating the rule. Two packets could mutate
the same authoritative state and only the one the client normally sends was checked; the other was
one line of `.map()` with no gate at all. When adding a constraint, grep for **every** writer of the
state it constrains, not just the one you are currently editing.

### D23 — the DNP summary now reads the team layer that was already being computed
**What happened:** `ntTeamCycleSERs` has been computed, stored, broadcast in `NT_PLAYBACK` and
applied on every client since DNP shipped — and read by **no render function at all**.
`ntRenderSummary` showed the same flat per-player leaderboard in both modes, so a team-vs-team mode
never once displayed a team result. The entire team-scoring layer was calculated, synced and thrown
away.
**Decision:** an `ntIsDNP()` branch in `ntRenderSummary` — headline names the leading **team**, board
is two team cards each listing its members' own contributions underneath (the per-player number is
what a player recognises as "how I did"). Match summaries use a new `ntTeamOverallSER()`, the rolling
team average across cycles, **derived on demand** from `ntTeamCycleSERs` rather than accumulated into
new state — so nothing extra has to be broadcast, reset, or normalised on receipt.
**Also corrected:** `ntOverallSER`'s comment claimed "per player (Standard) / team (DNP)". It has
always been per player in both modes; the team rollup simply did not exist.
**Lesson:** state that is computed, broadcast and applied but never *read* is invisible to every
check the suite has — the loopback harness verified `ntTeamCycleSERs` matched across all four
devices while nothing displayed it. A grep for reads of a state variable that finds only writes is
the tell.

### D24 — journey slide: the bug was the missing clip, not the direction
**What happened:** at a leg boundary `ntJourneySlide()` sets `translateX(16%)` on
`#nt-playback-canvas` and settles to 0, but the canvas's parent had no `overflow-hidden`, so the
canvas visibly slid outside the terminal frame.
**Decision:** wrapped the canvas in `<div class="w-full overflow-hidden rounded">`. The slide
direction was **left as-is after re-deriving it** — a first reading called it backwards, but for a
journey running left→right the next leg is to your right and correctly enters *from* the right,
which is what `+16% → 0` does. Reversing it would have made each new leg enter from behind.
**The real direction bug was next door:** the slide fired on *any* boundary cross with a fixed
direction, including scrubbing **backwards**. `ntJourneySlide(dir)` now takes ±1 from
`legIdx > ntPbActiveLeg`, so reverse-scrubbing reads as reverse for the first time.
**Lesson:** "this animation feels wrong" localises the *symptom* to an element, not the cause to a
property. Here two different defects lived on the same four lines and only one of them was the one
originally named — re-deriving the intended motion from the geometry (which way is the journey
travelling?) separated them.

### D25 — leg preview: `ntBuildBridgeInto` revived as the picker itself
**What happened:** the allocation screen drew non-selected legs into **44×44 px** canvases (cell 4,
CSS-downscaled) — at that size a maze is a grey smudge and you cannot read a corridor, let alone
judge which leg needs help. Meanwhile `ntBuildBridgeInto` / `ntOpenBridgePreview` — the chained
edge-to-edge bridge with seam walls, built during BUG-10 — were **defined and never called**, dead
since the map-hero redesign landed.
**Decision:** revived `ntBuildBridgeInto` as the allocation screen's whole stage, with three optional
callbacks (`footer`, `onTap`, `onHold`) that turn the same display strip into the picker. **One
builder, deliberately:** the picker and the enlarged preview overlay must never drift into two
different pictures of the same bridge. Read-only callers pass no options and get the original strip.
**Sizing:** cell is fitted to the panel width (`avail / legs / n`, clamped 5–12) so the *whole* bridge
is visible at once — seeing every leg together is the point when choosing between them — and the
canvas renders at `n × cell` with no CSS downscale, so it is real resolution rather than a stretched
thumbnail. Measured via `visual-check`: **162 px** per leg at 2v2 and **108 px** at 3v3, versus 44 px
before, with no horizontal overflow at either size.
**Lesson:** good visualisation code going dead is a *silent* regression — nothing errors, nothing
fails a check, the screen just gets worse. `ntOpenBridgePreview` had been unreachable for a whole
redesign cycle. A periodic grep for defined-but-never-called `[abbr]*` functions would have found it
in seconds; it took a complaint about the thing it was built to solve.

### D26 — allocation screen: side-by-side → windowed leg viewer (owner feedback, SW v192)
**What happened:** D25's "fit the whole bridge across the panel" sizing (`avail / legs / n`, clamped
5–12) was legible at 2v2 (cell 9) but degraded fast — cell 6 at 3v3, and the clamp floor (5) at 4v4
overflowed the 336 px panel into horizontal scroll on top of being unreadable. A live-session
screenshot at 2v2 (cell 9, cramped) is what surfaced it.
**Decision:** one leg shown large (`cell: 18`, real 324×324 px, no clamp) with ‹ › to switch, still
built through `ntBuildBridgeInto` (unchanged — the "one builder" rule from D25 holds; the viewport
just clips the same strip to one leg's width, so neighbours peek at the edges and the seam-wall joins
stay intact). A chip row under the viewer restores the "whole team readable at once" property a
single-leg view would otherwise lose — every leg's live FW/HP always visible, tap-to-deposit /
hold-to-withdraw with the same verbs as the maze, so an out-of-view leg never needs a navigate step
to receive a deposit.
**Caught before shipping (visual-check):** the first draft put the active leg's name between the nav
arrows styled `text-stone-300` — correct against the dark canvas strip the per-column labels sit on,
wrong against the page's white background the nav row actually sits on, and nearly invisible in the
screenshot. It also duplicated the column's own label one line below. Replaced with `LEG N/M` in
`text-stone-500` — real nav information instead of a repeated, wrongly-styled name.
**State:** `ntAllocViewLeg` (captain-local, never synced — same shape as `ntAllocDeposits`) resets at
huddle start on host and on receipt on the client, and in `resetToLobby()` teardown. Deliberately
**not** reset by "Reset All" (`ntResetDeposits`) — that clears deposits, not which leg you're looking
at, and jumping the view mid-edit would be disorienting.
**Lesson:** a sizing formula that degrades gracefully in the middle of its range (2v2 fine, 3v3
noticeably worse) can still be a design failure at the top of its range (4v4 unreadable and
overflowing) — check the formula's own worst case, not just the case in front of you when you write
it. Also: a colour class copied from a component that renders on a *different* background than
the one it's being reused on is worth an explicit contrast check, not just visual similarity —
`visual-check` caught this one in a screenshot, not by reasoning about it.

### D27 — hardening window vs surplus concentration: closed as intended, not a bug (SW v193)
**Question:** could a captain dumping the whole team surplus onto one leg (up to +12 firewall at
4v4) make that leg impossible to finish inside the shortest hardening window (45 s), since every
placement must also keep `ntPathExists` satisfied — a constrained puzzle, not a tap race, that gets
harder as the maze fills?
**Decision:** closed, no code change. Owner testimony from repeated live play: 45 s is tight but
sufficient for a competent player at base inventory; a captain who overallocates past what that
player can place in the window is committing an inefficiency (unplaced blocks are wasted surplus,
and it puts avoidable pressure on one player) rather than triggering a broken state — the same
inefficiency exists independent of DNP whenever a cycle's random inventory roll is already near the
top of `NT_FIREWALL_MAX_PCT`. This is deliberately a skill/judgement axis of the mode, not a ceiling
that needs enforcing in code.
**Not verified by code or harness — verified by the owner's own repeated play.** No `verify-nt-
loopback.js` check exists for "is this humanly finishable," and none is being added; it isn't a
rules/packet/state question the harness tier can answer.

### D28 — allocation viewer polish: the shifting bug, surplus clarity, dead space (owner feedback, SW v193)
**What happened (three items from one live 3-device session, D26's actual first playtest):**
1. **"Shifting" on every tap.** `ntCenterAllocViewport()` added `transition-transform` to the
   bridge's inner `row` *before* reading `col.offsetLeft` (a forced reflow) and *then* setting
   `transform` — so the browser saw a real style checkpoint between "transition added" and
   "transform changed" and animated from `translateX(0)` on every single repaint. Since deposit,
   withdraw, undo, reset, and brush-toggle all trigger a full `ntRenderAllocationScreen` repaint
   (which tears down and rebuilds the bridge DOM from scratch via `ntBuildBridgeInto`), this fired
   on nearly every tap, not just ‹›-navigation — reading as the maze "shifting" or "doing something"
   on its own.
2. **Chip/footer numbers read as ambiguous.** `ntAllocations[leg]` is the leg's TOTAL (base +
   deposited) but rendered with no indication of how much of that total came from the surplus just
   deposited — a captain couldn't tell "this leg naturally rolled high" from "I just dumped surplus
   here" at a glance.
3. **~30–44 px of dead space** between the chip row and the status/brush-bar/Lock block at 1v1/2v2
   (collapses to ~16 px, i.e. normal padding, at 4v4 where the taller chip row fills more of the
   flex-1 stage) — a smaller remainder of the D26/deferred-work dead-space item than before, but
   still visible in a screenshot.
**Decision:**
1. Removed the transition entirely. A full-DOM-rebuild-per-tap architecture cannot deliver a
   genuine continuous slide anyway (there's no "previous position" to animate from — the element is
   new every time); an instant, correctly-positioned jump is the honest fix rather than a transition
   that fires when nothing conceptually moved. A true animated slide would need the bridge DOM kept
   alive across repaints (patch values in place instead of rebuilding) — not done this round, noted
   below as a candidate follow-up if the instant-jump reads as too abrupt in practice.
2. New shared `ntAllocLegDisplay(legIdx, pIdx)` returns each leg's FW/HP strings with a `(+N)`
   qualifier appended whenever that leg's total exceeds base inventory — derived from `ntAllocations`
   vs `ntInventory` (the identical per-leg arithmetic `ntAllocBank` already sums across all legs),
   **not** from `ntAllocDeposits` — that stack is captain-local and never synced, so it can't be the
   source for a read-only teammate's view. Used by both the maze footer and the chip row so the two
   never show different numbers for the same leg.
3. Added `justify-center` to `#nt-alloc-body` — splits the leftover flex space above and below the
   content block instead of leaving it all beneath the chips, which reads as intentional rather than
   sparse. Measured via `visual-check`: 44 px → 30 px total gap at 1v1/2v2 (unchanged at 4v4, where
   there was near-zero to begin with).
**Also raised, not yet actioned:** the maze preview canvas (`ntDrawLegCanvas`) is visually cruder
than the real build screen's DOM-based grid — flat rect fills, no rounded port markers, no glow, no
directional arrows — because they are two different renderers for what is conceptually "the same
maze." Reusing a read-only variant of the real build-grid renderer (scaled via CSS) at allocation
time would fix this **and** guarantee the preview can never visually drift from what the player
actually builds on — but it's a bigger change than this round's scope, and the screenshot meant to
confirm the exact defect didn't attach to the session, so it's deferred pending visual confirmation
rather than built blind. Tracked in `deferred-work.md`.
**Lesson:** a CSS transition added programmatically to a freshly-created element, with a forced
reflow (any `offsetLeft`/`offsetWidth` read) sitting between the class-add and the property-set, is
not a no-op on first paint — it animates from the implicit initial value. This is easy to miss
because the code reads as "set up a transition, then move it," which is correct intent but wrong
when the element performing the transition doesn't survive to a second frame.

### D29 — allocation viewer, round 3: the deferred D28 items, all confirmed by screenshot (SW v194)
**What happened:** the owner sent an actual screenshot of D28's build. Two D28 items were confirmed
real from it: **(1)** the maze preview canvas genuinely looks cruder than the real build screen's
grid — still deferred, unchanged from D28's writeup, tracked in `deferred-work.md`. **(2)** a THIRD
instance of the same contrast bug as D28's nav-label fix: `ntBuildBridgeInto`'s own per-column name
label (`text-stone-300`) was assumed to sit on the dark canvas backdrop but actually sits on the
page's white background too — the column div carries no background, only the canvas below the
label does. Fixed to `text-stone-500`, matching the nav label.
**New requests, all shipped:**
1. **Terminal-styled directive.** The `> ALERT: CLUSTER SURPLUS...` line moved into the same
   bordered dark-panel chrome as the Gate's boot log (`border-emerald-700/40 bg-slate-900
   font-mono text-emerald-400`) — printed straight, no typewriter reveal (that's the Gate's own
   effect; this line changes with huddle state and shouldn't re-animate on every render).
2. **Chip clarity, take 2.** D28's inline `(+N)` qualifier is gone. `ntAllocLegDisplay()` now
   returns the leg's TOTAL on one line and, separately, the surplus-deposited-to-this-leg as a
   `deposited/pool-total` fraction (e.g. `FW 2/6`) in **orange**, on its own line — both the maze
   footer and the chip use the same shared formatter, so they can't drift. Chip width is now a
   fixed `w-28` (was auto-width) specifically because the D28 inline suffix visibly popped the
   pill's size on every deposit as digit count changed; a fixed box means only the text updates.
3. **Status/warning merged.** `#nt-alloc-warning` moved directly under `#nt-alloc-status`, above
   the controls, and switched from show/hide to an always-rendered text-and-colour swap
   (`UNALLOCATED SURPLUS` amber / `SURPLUS ALLOCATED` green) — reserves its own space always, so
   the buttons below it never shift vertically as the state changes. No longer captain-gated either
   (it reflects the team's shared bank, same as the status line above it).

### D30 — the chip-row scroll/clip conflict found verifying D29's own build
**What happened:** verifying D29 surfaced a genuine new defect the owner hadn't reported — at 4
legs, the taller 3-line chips wrap to 2 rows and `#nt-alloc-chips` was the one element in that
column without `shrink-0` (its siblings all have it), so the flex layout compressed it below its
own content height inside a parent (`overflow-hidden`) with no scroll possible at all. Chips 3 and
4 existed in the DOM but were **permanently unreachable**, not just wrapped off-screen.
**Decision:** the outer stage wrapper (between header and footer) changed from `overflow-hidden` to
`overflow-y-auto` — exactly the sticky-footer pattern's own stated purpose ("a Stage that must
scroll independently while Controls stay frozen," `ui-style.md`) — and `#nt-alloc-chips` gained
`shrink-0` so it's never compressed. Verified via direct DOM measurement (not just a screenshot):
`chips.scrollHeight === chips.clientHeight` (no internal clip) and all 4 chip rects land within the
viewport after a forced scroll, footer/Lock button unmoved throughout.
**A `justify-center` compaction added in this same round (closing D28's residual 1v1/2v2 dead
space) actively broke this fix** — centering an element taller than its container pushes half the
overflow ABOVE the visible top with no way to scroll back up to it (scrollTop cannot go negative),
so the page loaded pre-scrolled and clipped the new terminal box's own top border. Reverted to
top-anchored (`flex-start`); 1v1/2v2 dead space returns to its D28-era size (~28 px) rather than the
attempted ~14 px, which is the correct trade against a broken load state at 4 legs.
**Lesson:** a raw, un-visually-confirmed "negative gap" measurement between two rects **on either
side of an overflow-clipped boundary** is not proof of a real defect — `getBoundingClientRect()`
returns an element's true unclipped layout position regardless of an ancestor's `overflow`, so
comparing it against a rect outside that clipped region can read as "overlapping" when the browser
is in fact cleanly clipping it. Confirm visually (or via `scrollHeight`/`clientHeight` on the
clipping element itself) before trusting a raw rect delta as a bug signal.

### D31 — viewport alignment bug + matrix-scale overflow (owner screenshot, SW v194)
**What happened:** the owner's screenshot of a middle leg (both `wallLeft` and `wallRight`) showed
a visible gap on one edge and clipped content — including the port marker — on the other.
**Root cause:** `ntCenterAllocViewport()` used `col.offsetLeft`/`col.offsetWidth` to compute the
column's centre. `offsetLeft` resolves against the nearest **positioned** ancestor — nothing in the
`row`/`bridge`/`viewport` chain sets `position`, so it silently walked past all three to some
unrelated ancestor further up the page, mixing page-relative and viewport-relative coordinates in
the same subtraction. Leg 0 happened to render correctly anyway (the resulting math landed inside
the `Math.min(0, …)` clamp region by coincidence); any other leg did not — measured ~24 px off
centre for a 3-leg team's middle leg.
**Decision:** switched to `getBoundingClientRect()` for both the viewport and the column.
`getBoundingClientRect()` is always viewport-relative regardless of how deep an element sits in the
page or whether any ancestor is positioned, so the two sides of the centring subtraction are
guaranteed to share a coordinate frame. Verified: 6 px / 6 px symmetric margins at every leg
position, all three grid-size settings.
**Second, unrelated defect found investigating the owner's third question ("does matrix scale
break the preview?"):** the fixed `cell: 18` assumed an 18×18 node (324 px, fits the ~336 px
viewport). At the "large map" setting (n=20) that's 360 px — wider than the viewport itself, so
even the ACTIVE leg rendered permanently clipped with no way to ever see its far edge, regardless
of navigation. Fixed by capping cell size to what the viewport can actually hold:
`Math.min(18, Math.floor(viewportWidth / n))` — n=16/18 unchanged (already fit), n=20 now renders
at 16 px/tile (320 px, fits with margin). Verified no overflow at n=16/18/20.
**Lesson:** `offsetLeft`/`offsetTop` are relative to `offsetParent`, which is **not** "the nearest
DOM ancestor" — it's the nearest ancestor with `position` other than `static`, falling back
arbitrarily far up the tree if none exists. Any centring/alignment math mixing an `offsetLeft` read
with a `getBoundingClientRect()`-based viewport width (as this code did) is a coordinate-frame bug
waiting to happen the moment page structure changes upstream. Prefer `getBoundingClientRect()` for
both sides of any such comparison — it has no ambiguous reference point.

### D32 — honeypot per-leg allocation ceiling removed (owner decision, SW v194)
**What happened:** the owner asked what the DNP honeypot ceiling (`ntLegHoneypotCap`, D22a) was
actually protecting against, given firewall has no ceiling at all and D27 already established that
overallocating firewall is just an efficiency choice, never a broken state. Investigation found the
two resources are **not** symmetric the way that reasoning assumes: `ntAttemptPlace` (the real
build-phase placement check) only checks inventory count against itself — there is no independent
check anywhere against the node's physical capacity. Firewall excess is self-limiting (a maze
genuinely runs out of valid empty cells eventually); honeypot excess is **not** — every deposited
honeypot beyond the old cap would actually be placeable during build, limited only by available
cells, of which there are plenty. So the cap was the ONLY thing bounding honeypot concentration.
**Decision (owner, informed):** remove it anyway, treating the same team-wide pool ceiling that
already governs firewall as the only remaining bound for both resources. Removed the leg-level
check from `ntDepositAlloc` (DNP-time deposit guard) and `ntValidateTeamAllocations` (host-side
authority check on both UPDATE and LOCK), deleted the now-fully-unused `ntLegHoneypotCap()`, and
corrected `NT_HONEYPOT_CAP`'s own comment (it now only sizes the natural per-cycle roll, nothing
else). Chip/footer HP display dropped its `/cap` fraction and the amber "full" highlight — both
were cap-relative and no longer meaningful.
**Verified:** `verify-nt-loopback.js`'s honeypot-ceiling section was rewritten (not just patched) —
natives forced to 4 so the OLD ceiling would have been zero, then depositing past that number
proves no leg-level bound survived, on every seed rather than relying on a natural roll to happen
to exceed it. Green on 8 separate seeds after one self-inflicted test bug (the LOCK test's expected
value assumed the proposal payload was base+surplus; the existing firewall-rebalance test's own
convention — copied without re-deriving — sends the raw claimed total instead, unrelated to my
change but caught by the multi-seed run).
**Lesson:** "the same reasoning that justified removing firewall's cap" does not automatically
transfer to a different resource — the actual enforcement mechanism (or lack of one) at every other
point in the pipeline has to be checked per-resource, not inferred by analogy. It happened to hold
here, but only because the owner explicitly accepted the consequence once it was surfaced, not
because the analogy was self-evidently safe.

### D33 — maze-preview polish round: wall colour, real-scale grid, conditional centring (SW v195)
**What happened:** four small owner-flagged items, three shipped, one confirmed already correct.
1. **Wall/seam colour blended into bad sectors.** `ntDrawLegCanvas`'s connecting wall used
   `NT_COLOR_BAD_SECTOR` — identical to the hazard colour it's drawn flat (no glow) beside, so a
   team-connection boundary read as just another obstacle square. Recoloured to `#64748b`
   (slate-500, lighter than bad-sector's slate-700) — scoped to the wall fill only, not the shared
   constant, which stays correct for its other two uses (bad sectors, the real build/playback
   screen's glowing egress port bar, where the glow already carries the distinction this preview
   doesn't have).
2. **Grid lines were per-2×2-block, not per-tile.** Compared directly against the playback screen's
   own grid (`ntRenderFrame`, which draws one line per tile), the preview's coarser spacing gave a
   2×2 obstacle nothing to visually anchor its scale against, reading as an ambiguous size rather
   than a real block. Switched to per-tile, lighter (`rgba(148,163,184,0.18)`, roughly half the
   opacity of the old per-block lines since there are now 2× as many).
3. **Non-captain's shorter content sat pinned to the top.** A read-only viewer has no brush bar and
   no Lock button, so their content is genuinely shorter than a captain's — but the D28 revert to
   top-anchored (D30's centring/scroll conflict) applied to everyone, leaving non-captains with a
   large unfilled gap below their content. Fixed with a **conditional** centre: `justify-center` is
   now toggled per-render based on whether `body.scrollHeight` actually fits `stage.clientHeight` —
   never centred if it doesn't (that's exactly the D30 bug), applied whenever it does, regardless of
   captain status. Verified: captain-1v1/2v2 and non-captain-1v1/2v2/4v4 all correctly centre;
   captain-4v4 (genuinely taller than the stage, brush bar + Lock button included) correctly stays
   top-anchored.
4. **Auto-lock + auto-proceed at the huddle timer's expiry — already implemented, not a gap.**
   Traced the full path: `ntStartHuddleTimer` calls `ntCommitAllocation()` on timer expiry (on
   every device, not just the captain's — a pre-existing looseness the "KNOWN GAP: a non-captain
   can drive their team allocation" harness check already documents, harmless here since every team
   member's mirrored state is identical). `ntCommitAllocation` locks the team and, on the host path,
   calls `ntCheckBothTeamsLocked()`, which auto-broadcasts `NT_BUILD_BEGIN` the moment both teams
   are locked — no separate action needed. Confirmed present in the code rather than assumed; no
   change made. If this doesn't fire correctly in a live session, that's a different, not-yet-found
   bug — worth a live retest rather than more code reading.
**A second, self-inflicted bug found verifying item 3:** the conditional-centring check initially
read `body.scrollHeight`/`stage.clientHeight` while the section was still `display:none` — both
report `0` on a hidden element, and `0 <= 0` is always true, so every first-open of the screen
centred regardless of whether the content actually fit. Root cause: `ntShowAllocationScreen`
rendered content BEFORE calling `showScreen()`, so the very first render of every huddle measured
against an invisible box. Fixed by swapping the order (`showScreen()` then render) — both are
synchronous so there's no visible-flash cost either way, but only one order gives the centring
check a real box to measure. Caught via a temporary `console.log` at the toggle line after a
Playwright measurement showed a value pair (0, 0) that a 150 ms-later re-measurement (563, 553)
directly contradicted — the decision had been made against stale (pre-paint) layout.
**Lesson:** any layout measurement (`scrollHeight`, `clientHeight`, `getBoundingClientRect`) taken
inside a render function has an implicit precondition — the element must already be part of a
visible, laid-out document — that the function's own call sites don't obviously guarantee. The bug
was invisible in every case where `ntRenderAllocationScreen` runs on an *already-shown* screen
(every deposit, nav click, brush toggle) and only reachable on the very first render per huddle,
which is exactly the kind of narrow window a full test run can still miss without deliberately
comparing an in-render measurement against a later one.

### D34 — allocation viewer round 6: budget-vs-total display, and the header rejoins the Stack (SW v196)
**What happened:** two more owner items, both from a live-play screenshot pair.
1. **"The chip's values are wrong."** They weren't arithmetically wrong — cross-checking both
   screenshots, every number was internally self-consistent (leg totals matched budget+deposited,
   bank drained to exactly the pool total). What was wrong was the SHAPE: `ntAllocLegDisplay`'s line
   2 showed the TOTAL (budget + deposited, D28), so a captain who'd already deposited surplus saw a
   merged number they had to mentally subtract to recover "what's actually my budget here" —
   reading as incorrect rather than just unhelpfully combined. Changed line 2 to show `ntInventory`
   (the build BUDGET) directly — identical on every leg by design, since inventory is the same for
   all players a cycle — leaving line 3 (already `deposited/pool`) as the only place surplus
   appears. Two clearly separated facts instead of one number requiring arithmetic.
2. **"The header isn't part of the compacted stack."** D33's conditional centring only applied to
   `#nt-alloc-body` within its own `flex-1` stage slot — correct as far as it went, but left the
   header pinned to the very top edge with the (now centred) content floating below it in the
   middle of a lot of empty space, reading as disconnected rather than one compact unit.
**Decision:** added a SECOND, outer level of the same pattern. `ntRenderAllocationScreen` now
measures whether header + body + footer TOGETHER fit within the whole section's height and, if so,
switches the section itself to THE STACK — `justify-center` on the section, `flex-1` removed from
the stage wrapper (so it becomes content-sized rather than force-filling all remaining space) —
which centres header/stage/footer as one block, exactly the suite-wide default pattern
(`ui-style.md` § The Stack) this screen is normally exempted from. When it DOESN'T fit (the
sticky-footer whitelist's actual reason to exist — e.g. captain view at 4 legs with the brush bar
and Lock button), it falls back to the original pinned-header/scrolling-stage/pinned-footer split
untouched. The existing body-level centring (D33) still runs nested inside whichever mode wins,
governing whether body's own content additionally centres within its box. Reset-before-measure
applies at this level too — the section's classes are cleared before each measurement so a stale
Stack-mode class from a PRIOR render can't hide real overflow from itself, same defensive shape as
D33's own fix.
**Verified:** header genuinely moves — `getBoundingClientRect()` showed the header at `y≈80` for a
short (non-captain) render vs `y≈0` for a captain render with brush bar + Lock button, and `y≈0`
again for 4v4 (genuine overflow, correctly falls back to pinned). Confirmed the budget-inventory
number stays constant across repeated deposits in the same test session, only the surplus line
moves.
**Lesson:** a fix that's correct at one DOM level (centring the stage's content within the stage)
can still leave the wrong VISUAL unit — the level a viewer actually perceives as "the screen's
content" doesn't necessarily match the level the code was scoped to. When a centring/compaction
request keeps resurfacing after a technically-correct fix, check whether it's being asked one level
higher than where it was applied, rather than assuming the request changed.

### D35 — terminology cleanup: "native" collided with `nativeHoneypots` (owner-caught, SW v197)
**What happened:** D34 labelled the budget line "native/locked base inventory." The owner, reading
the live screen against a real node (8 Bad Sectors, 1 Native Honeypot visible), reasonably asked
whether the displayed `FW 18 · HP 0` was supposed to equal those terrain counts — it isn't and
never was; `ntInventory` (the build BUDGET) is an independently-randomised per-cycle roll,
unconnected to how many obstacles happen to be on that node. The confusion traces to one word:
"native" already means something specific and different in this codebase (`nativeHoneypots`, the
map's own pre-placed hazard), and D34 reused it loosely to mean "not yet modified by a deposit."
**Decision:** no behaviour change — the display was already correct, only the word was wrong.
Corrected every "native" reference describing the budget line (in `nt.js` and this file) to
"budget," and wrote down the full three-tier glossary once, in `game-identities.md` § Shared
Allocation Hub, so the next session doesn't have to re-derive it from a live screenshot:
- **Generated** (terrain, never player-controlled): Bad Sector, Native Honeypot.
- **Budget** (`ntInventory`, your build allowance, rolled per cycle): Firewall Segment, Honeypot.
- **Surplus** (DNP only, `ntAllocationPool`): FW/HP deposits a captain moves between legs.
**The real trap, worth keeping visible:** "Honeypot" names TWO unrelated things — the terrain
hazard (Native Honeypot, generated) and the buildable component (Honeypot, part of Budget/Surplus).
Bad Sector doesn't have this problem ("Native Firewall" isn't a term); Honeypot does, purely
because both tiers happened to reuse the same noun.
**Lesson:** a display can be 100% correct and still get reported as a bug if the WORD used to
describe it collides with an existing, differently-scoped term elsewhere in the same domain. The
fix here was documentation, not code — but only because the confusion was caught and asked about
rather than "fixed" by changing the (already correct) numbers to match a wrong assumption.

---

## Template Gaps (this round)

- **TG-08 — `.pill` is 39 px tall, under the suite's own 44 px touch minimum.** `.pill`'s
  `padding: 0.5rem 0` lands at 39 px, while `ui-style.md` § Thumb-Friendly UI mandates 44×44. Added
  `min-h-11` to NT's brush pills only, on the grounds that a settings pill is tapped once whereas
  this one is a mid-huddle tool hit repeatedly against a running clock. **Not swept suite-wide** —
  every pill in every game has this measurement, so it is either a deliberate accepted exception or
  a suite-wide gap, and that is a call for a phase gate rather than a game round. Flagged in
  `deferred-work.md`. **Extended, Task 10 (17 Aug 2026):** the Node Editor's four brush pills
  (`data-nt-brush`, `screen-nt-authoring`) shipped in Task 4 without `min-h-11` and measured 39 px
  in `visual-check` — the same gap, on a control that's brushed even more often than the allocation
  hub's. Added `min-h-11` for consistency with the existing precedent; now 44 px at all three
  Matrix Scale settings, confirmed via `getBoundingClientRect`.
- **A refusal helper is per-screen, not per-game.** `ntSetRouting()` looks like NT's general "reject
  that input" feedback but is bound to one screen's status element and no-ops everywhere else —
  silently, via `if (!el) return`. When adding refusal feedback to a *new* screen, check which
  element the existing helper writes to before reusing it; the guard clause means a wrong reuse
  produces no error and no feedback.
- **Deferred polish:** the allocation screen still has ~350 px of empty space between the bridge
  strip and the footer controls (the screen is on the legacy `h-screen` sticky-footer whitelist).
  Consolidated into one gap below the strip rather than split above and below, which reads more
  deliberate, but the huddle countdown — currently a small eyebrow in the header — is the obvious
  candidate to fill it. Not done this round; out of scope for the four items.

---

## Design Decisions (Debug Mode round — 17 Aug 2026, SW v198)

Tasks 1–9 shipped Debug/Sandbox Mode: the host hand-authors a Node in a Node Editor
(`screen-nt-authoring`) instead of the system rolling one, deploys it over the existing
`NT_GENERATE` packet, and every player retries it locally an unlimited number of times (zero
packets per attempt) before finishing independently through a sized readiness gate, scored on
their **best** attempt. Task 10 closed the feature out — layout check, doc pass, SW bump. These
entries capture what's worth carrying forward.

### D36 — An authored node is shape-identical to a generated one, and that's the whole feature
`ntAuthBlankNode()` returns `{ n, ingress, egress, badSectors: [], nativeHoneypots: [] }` —
exactly the fields `ntGenerateNode()` populates. Every downstream consumer (`ntPathExists`,
`ntComputeTimeline_local`, `ntResolveCycleMdlm`, the playback canvas, the SER summary) reads a
node by shape, never by provenance, so none of them needed a single line changed. The entire
feature is: a second producer of the same shape (`screen-nt-authoring`, hand-driven instead of
`ntRandInt`-driven), plus a retry loop bolted onto the existing build→playback cycle. `NT_GENERATE`
carries the authored node verbatim with one added field, `debug: true`, purely for UI branching
(e.g. "no timer" / "unlimited attempts" copy) — the resolution path underneath never inspects it.

### D37 — Why a new screen, not a mode branch on `ntRenderBuildGrid`
The Node Editor (`ntRenderAuthGrid`) is a **second renderer**, not a parameterised version of the
existing build grid. `ntRenderBuildGrid`'s pointer handlers are saturated with build-phase
semantics that have no authoring equivalent and would all need a mode guard: live-inventory
tap-cycling, the firewall→honeypot long-press upgrade, right-click honeypots, and
`ntUpdateBuildCounters` firing on every path. Threading `if (ntDebugMode) …` through each of those
would have put conditional logic on the single render path `verify-nt-loopback.js` actually
exercises for every non-Debug player, every game — the one place a subtle regression would be
most expensive and least visible. The two renderers instead share everything **stateless** —
`ntPaintCell`, `ntBlockAt`, `ntRepaintFootprint`, `ntPathExists`, `ntFlashReject`,
`ntDrawPortMarker` — and diverge only in their pointer handler, which is a brush-model
(`ntAuthTap`) rather than an inventory-model. `ntRenderBuildGrid` is left byte-identical; the
existing 146 pre-branch checks staying green was the test for that claim, not an assertion added
this round.

### D38 — Correction C1: the spec's "best" was inverted, and why it matters for the next reader
NT's own scoring rule is `SER = latency / maxLatency × 100` — the **longest** delay each cycle
scores 100%, because the player is the *defender*: a signal that takes longer to traverse the
maze means the hardening worked. The feature's spec drafted "best attempt" the intuitive way
round — lowest latency — which is backwards for this specific game and would have scored a
player's *worst* trace as their best. Caught before shipping and corrected in `ntDebugRunAttempt`
(`js/games/nt.js`): `isBest = prevBest === null || latency > prevBest`, with an inline comment
spelling out why. **Worth its own paragraph because a reviewer reading only the spec later, with
no memory of this correction, will reach the intuitive-but-wrong direction independently** — the
contradiction isn't visible from the code alone unless the comment survives every future edit.
The test-construction side of this correction (a comparison that can be inverted without a check
noticing) is its own lesson — see D40 below.

### D39 — Correction C2: a settings-flag feature needs the settings-sync payload in both directions, not just the toggle
`ntDebugMode` is a **setting** — it persists like `ntHardeningWin` or `ntNativeHoneypots` — but
the first draft of the plan added the toggle and its UI wiring without adding it to
`engine-multiplayer.js`'s `SETTINGS_SYNC` payload (host→client) or its intake (client applying a
host's settings). A setting that isn't synced silently diverges the moment a client's local
default differs from the host's choice — invisible in solo/PTP testing, where there's only one
device to disagree with itself. Fixed at `engine-multiplayer.js:857` and `:1031`. **The general
lesson for the next mode-flag feature:** treat "add a setting" and "wire its sync" as one
checklist item, not two — a spec section titled "Settings" that doesn't cross-reference
`SETTINGS_SYNC` is incomplete by construction, not just by omission.

### D40 — The `ntResolveGuard` hazard, fixed for free by the accessor's own early return
The build timer's host-side safety net (`ntResolveGuard`, a `setTimeout` that force-resolves a
cycle a few seconds after the hardening window closes, in case a commit packet was lost) is armed
unconditionally on every call to `ntStartBuildTimer` in the pre-Debug code. Debug Mode has no
window to close — a player may sit on one attempt for as long as they like — so an unmodified
`ntResolveGuard` would fire a few seconds after `ntHardeningWin` regardless, evicting an
in-progress retry session out from under the player. The fix needed no Debug-specific carve-out:
`ntEffectiveHardeningWin()` returns `0` when `ntDebugMode` is on, and `ntStartBuildTimer` already
`return`s immediately on a `0` reading (to show "∞" instead of a countdown) — **before** reaching
the block that arms `ntResolveGuard`. The hazard is closed as a side effect of the accessor
existing at all, not a second guard clause. Worth noting as a pattern: when a superseding setting
short-circuits a function early for an unrelated reason, check what else lives after that early
return before assuming a new guard is needed.

### D41 — The retry overlay's button-id naming constraint, and why it's a total-but-invisible failure mode
`engine.js` has one delegated backdrop-tap-to-dismiss handler for every overlay in the suite: it
finds a button whose `id` matches `cancel|close|done|ok|dismiss` as a whole segment and clicks it
when the backdrop (not the card) is tapped. `nt-debug-retry-overlay` has two buttons and both are
real decisions (Run Again / Finish Testing) — per `ui-style.md`'s documented exception this
overlay is correctly left non-dismissible, but **only** if neither button id matches that pattern.
The ids shipped are `btn-nt-debug-again` and `btn-nt-debug-finish` — neither collides. Had the
second one been named `btn-nt-debug-done` (a completely natural name for "the player is done"), a
stray backdrop tap during a Node Editor session would have silently finished that player's Debug
attempt, dropping them out of the retry loop with no confirmation and no error — a **total**
failure (wrong outcome, not a degraded one) that is **invisible in code review** (nothing about
`btn-nt-debug-done` looks wrong in isolation; the danger only exists in relation to a generic
handler defined in a different file). This is the same class of hazard as a naming convention
enforced by grep rather than by the type system — worth remembering whenever a new Decision Modal
with two real (non-cancel) choices is added anywhere in the suite: check both ids against the
`engine.js` pattern before shipping, not after a report of an inexplicably-skipped step.

### D42 — Four checks that couldn't fail against the bug they existed to catch
Across the branch's review cycles, four separate assertions were found to be non-discriminating —
each passed identically whether the code underneath was correct or broken. None were caught by
reading the assertion; all four were caught by deliberately breaking the code they were meant to
protect and confirming the check stayed green. **The transferable lesson: capture a test's
expected value independently of the machinery under test, and prove a check can fail before
trusting that it can.**
- **The C1 retry-loop test (Task 7).** The original comparison was non-strict (`debugBest >=
  first`) and its "attempt 3" expectation was read out of the same live `ntDebugBest` state the
  bug under test would corrupt — so an inverted comparison and a frozen (never-updated) best both
  satisfied it. A reviewer flipped `nt.js`'s sole `>` to `<`, ran the full harness, and got ALL
  CHECKS PASSED — proof, not argument. Fixed by tightening to strict `>` and capturing the
  expected value via a direct `ntComputeTimeline_local()` call that never passes through the
  `isBest` bookkeeping under test, so the expectation cannot be poisoned by the same mutation that
  breaks the code.
- **The "swept to playback" gate check (Task 8).** Written as `includes('screen-nt-playback')`,
  which is unconditionally true because `ntDebugRunAttempt` calls `ntShowPlayback()` on *every*
  attempt, not just a premature resolve. Replaced with a before/after screen-push-count delta,
  which does discriminate.
- **"…and the caption is visible" (Task 9).** Passes even with the entire caption-writing block
  deleted, because the mock DOM auto-vivifies `nt-summary-caption`'s `style.display` to a default
  that already reads as "shown" before any application code touches it. Flagged rather than
  silently patched — fixing it would touch test infrastructure outside that task's scope — and
  left in place because it still has value as a *paired* assertion (it would catch a regression
  that hid the caption via `display:none` while leaving the text itself set).
- **"Brush back to default" (Task 9).** Nothing in the test path ever moved `ntDebugBrush` off
  its post-`ntShowAuthoring` default of `'bad'` before calling `ntResetState()`, so the check
  passed identically with or without the reset line it was meant to verify. Fixed with one line
  (`setBrushDbg('native')` before the reset call) so the assertion is actually exercising the
  code path it names.

## Design Decisions (Rectangular Grid round — 18 Aug 2026, SW v199)

### D43 — The dual-write refactor order, and why every intermediate commit stayed green

Converting the node's geometry from a single `n` (square side) to independent `w`/`h` touched the
shipped game's geometry core — pathfinding, ports, rendering, all of it — not just the Debug-only
feature that motivated it. Rather than one large rename, the five-task Phase 1 sequence emitted
`w`/`h` **alongside** `n` first (Task 1), migrated every reader tier-by-tier while `n` still existed
as a safety net (Tasks 2–4), and only dropped the `n` key once a grep confirmed no reader remained
(Task 5). Every one of those five commits ran the full 242-check suite green before the next task
began. The payoff: a bisect against any of the five commits would land on a small, single-tier
diff, and the shipped square-node behaviour was never in a state where some code read `w`/`h` and
other code still read `n` for the same node. **Lesson:** a rename across a system's core deserves
the same incremental discipline as a behaviour change — "just a rename" is not a licence to do it
in one commit when the renamed field is read in a dozen places across four different concerns
(pathfinding, ports, rendering, footprint clamping).

### D44 — `ntPortSub`'s single-clamp latent bug, invisible until the axis split

`ntPortSub` clamped a port's config-lattice sub-cell to one shared bound (`node.n * k - 1`) used for
*both* x and y. This was correct only by coincidence — every node was square, so the one bound
happened to be right on both axes. Splitting it into `mx = node.w * k - 1` / `my = node.h * k - 1`
(Task 2) revealed the bug had been latent in the geometry core the whole time, undetectable until a
non-square node existed to expose the shared bound silently mis-clamping the longer axis. **Lesson:**
a single shared bound standing in for two conceptually distinct measurements (here: the x-axis and
y-axis extents) is a bug waiting for the day the two measurements diverge — worth flagging even when
current data can never trigger it, because "current data can never trigger it" is exactly the
condition that makes the bug invisible in code review and every existing test.

### D45 — The spec's "no `index.html` change" claim needed a correction, not a reversal

The Rev 1 design spec's Tier 4 implied the new aspect ratio would need `index.html` edits — three
render containers carry Tailwind's `aspect-square` utility class. The actual fix (Task 4) sets an
**inline** `style.aspectRatio` from JS, which overrides the utility class at the cascade level
without touching markup — so the plan's only `index.html` edit ended up being the wholly separate
Task 8 (the new Sandbox Initialisation screen). Confirmed by the visual check (Task 11 Step 1): a
16×18 grid measured aspect ≈0.889, not 1.0, proving the override actually fires rather than the
inline style being silently shadowed by the class.

### D46 — The NaN-not-throw failure mode, and the tripwire that closes it

A missed `.n` → `.w`/`.h` rename produces `undefined`, and `undefined` arithmetic produces `NaN` —
which throws nothing, gets happily assigned to a canvas coordinate or a CSS percentage, and renders
as garbage while every render call still "succeeds." None of the suite's existing checks would have
caught this: they assert screens, counts and state transitions, not that the numbers inside a
timeline are finite. Task 7 added a dedicated section asserting `Number.isFinite` on every point of
a computed timeline's polyline and samples — proven to actually fail (not just pass by construction)
by deliberately injecting a `node.n`-dependent NaN into `ntPortSub` and confirming the new checks,
and only the new checks, went red. Task 10's rectangular end-to-end section reuses the same
finite-geometry checks against real 16×18/16×20/20×16 nodes, plus a bounds check proven to
discriminate a swapped `ntPortMouth(port, h, w)` argument order — something the square-only Task 6
gate could not detect, by construction, since a W/H swap on a square node is numerically invisible.

**Harness growth this round:** 242 → 248 (Task 7, the NaN tripwire) → 254 (Task 9, Sandbox
Initialisation routing + clamp) → 278 (Task 10, three rectangular end-to-end cases). Final:
**278 checks**, green on seeds 0–7.
