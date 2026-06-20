# Net-Trace — Build/Playback UX + Styling Pass (P3-R polish)

## Context

Net-Trace (Game 13, `js/games/nt.js`) had its maze/path/scoring engine **re-architected to the
single-grid model and validated (34/34 headless checks)** in the prior session. That core is DONE —
do not touch the engine model. This plan is the agreed **UX + styling pass** that sits on top of it:
fix how placement *feels*, where the inventory *lives*, and how the playback *reads*. Every item
below was discussed and explicitly agreed with the user. **Nothing here changes the mechanics math**
(grid, pathfinding, AoE, scoring) except one small, agreed pathing tweak (orthogonal bias) and the
0.5 hitbox stays.

Why: in playtest the user found (a) tap→reject placement clunky and the inventory counter out of
their focus cone, (b) the runner's angles "unnatural", (c) ports confusing (cyan/emerald too alike),
(d) the honeypot pulse weak/ambiguous, (e) build + playback screens not vertically centred
(whitespace, detached commit button — a recurring layout bug in this project).

## Engine substrate already in place (read `js/games/nt.js` first)

Single uniform **N×N tile grid** (`ntMatrixScale` = 16/18/20, default 18). Key facts a fresh
session needs:

- **Blocks** are 2×2 tiles, anchor `{ax,ay}` = top-left tile, **1-tile placement resolution,
  STRICT zero-overlap**. Placements: `ntMyPlacements = [{ax,ay,type:'firewall'|'honeypot'}]`.
- **Node shape:** `ntNode = { n, ingress:{edge,idx}, egress:{edge,idx}, badSectors:[{ax,ay}], nativeHoneypots:[{ax,ay}] }`. Ports are border openings (`edge`∈top/right/bottom/left, `idx`= tile index along the edge), never same edge.
- **Coordinate convention:** continuous **tile-space** (tile `t` spans `[t,t+1]`; centre `t+0.5`).
  Playback renders at `px = canvas.width / ntNode.n`; a position `x` in tiles → pixel `x*px` (NO +px/2 offset). Block footprint draws `fillRect(ax*px, ay*px, 2*px, 2*px)`. Honeypot dead centre = `(ax+1, ay+1)`.
- **Runner** = 0.5-tile **square** body. Pathing on a ¼-tile config lattice (`NT_LATTICE_K=4`),
  every solid inflated by one sub-cell (0.25). Functions: `ntConfigGrid`, `ntPathExists` (BFS,
  validity gate), `ntDijkstraSub`, `ntStringPull`, `ntShortestPath` (→ taut tile polyline with
  off-board entry/exit stubs), `ntComputeTimeline` (fixed-dt tick; pure-latency; per-tick AoE
  `dx*dx+dy*dy <= NT_HONEYPOT_RADIUS_SQ` (=18); slow 0.5× for `NT_HONEYPOT_DURATION`, per-pot
  `NT_HONEYPOT_COOLDOWN`, non-stacking). Returns `{polyline, fires:[{x,y,atMs}], slowSpans:[[s,e]], samples:[{t,x,y}], latencyMs}`.
- **Build grid:** `ntRenderBuildGrid` builds an N×N DOM grid; cell refs cached in `ntBuildCells[ty][tx]`.
  `ntBlockAt(tx,ty)` → owning block or null. `ntCellType`, `ntPaintCell`, `ntRepaintFootprint`,
  `ntIsMouthTile`, `ntAttemptPlace(tx,ty,asHoneypot)` (clamps anchor, vacancy + connectivity gate),
  `ntRemoveBlock(ax,ay)`, `ntUpgradeToHoneypot(ax,ay)`, `ntFlashReject`, `ntSetRouting`.
- **Renderer:** `ntDrawMaze`, `ntSampleAt(simMs)`, `ntRenderFrame(simMs,updateScrubber)`,
  `ntStartPlayback`/`ntStopPlayback`. Palette consts `NT_TRAIL_BLUE/SLOW`, `NT_PING_CORE/SLOW`,
  `NT_COLOR_*`. Trail already fades blue→violet; ping head already core+pulse.

## Locked decisions (agreed with user — do not re-litigate)

1. **Hitbox stays 0.5** (diameter-1 would make 1-tile corridors impassable). Fix "weird angles" via
   **(a) a small diagonal-cost bump** (orthogonal bias: diagonal step costs slightly MORE than √2 so
   the path only goes diagonal when it genuinely saves distance — it's a *distance* weight, not a
   turn timer) **and (b) corner easing in the renderer only**.
2. **STATUS wording while slowed = `THROTTLED`** (build line stays `ROUTING`).
3. **Honeypot signature = draining-AoE-disc cooldown gauge** (fills on hit, drains over the cooldown).
4. **Inventory → folded into the terminal HUD** (see Group A). Decorative `● ● ●` / `◀ ▶ ▣` removed.
5. Ports: **ingress green + inward arrow, egress grey (bad-sector grey) + outward arrow**.
6. Title homage: `SYS_INIT // BOUBOU-6D617A65 // NT-NODE-NN`, `NT-NODE-NN` token in emerald, rest grey.
7. Placement becomes **pointer-driven ghost preview** (true hover on desktop, **press-drag on
   touch**); validity shown at preview time, not on a rejected click.

## Constraints (critical — repeated project gotchas)

- **`index.html` edits MUST go through a throwaway Node UTF-8 script**, never the Edit tool — the
  Edit tool corrupts `index.html` with mojibake (see memory `feedback_indexhtml_encoding`). Pattern:
  write `nt-html-patch.js` doing `fs.readFileSync(f,'utf8')` → `.replace(...)` → `fs.writeFileSync(f,h,'utf8')`,
  run with `node`, then delete it. Use `×` / explicit chars for `×`, em-dash, arrows. `nt.js`
  is plain JS — edit it normally.
- **Layout pattern** (`@ui-style.md` § Centered Content Layout): centred screens use
  `min-h-screen … flex items-center justify-center` on the `<section>` with an inner
  `flex flex-col w-full max-w-sm` wrapper. (Current build/playback use `h-screen overflow-hidden`
  sticky-footer — convert both to centred since content is bounded and fits.)
- **SW stays un-bumped** during dev — the user hard-refreshes a fresh tab to test. (Bump `sw.js`
  v103→v104 only at final P5, not in this pass.)
- Use the project's `play*()` audio + existing `ntSetRouting` patterns; don't invent new helpers
  where one exists.
- Run all PowerShell, not Bash (Bash output is swallowed in this environment).

## Tasks

### A. Build screen — centre + terminal HUD  (`index.html` via Node script; `screen-nt-build` ≈ index.html:7120-7154)
- Convert `#screen-nt-build` to the centred pattern (inner `flex flex-col max-w-sm w-full` wrapper:
  header row → terminal frame → commit).
- **Delete** the standalone inventory row (index.html:7130-7134) and the decorative `● ● ●` /
  `◀ ▶ ▣` spans in `#nt-vm-window` (7138, 7140).
- **Terminal top bar** = inventory chips left + timer right: `■×N` cyan (firewall) `■×N` fuchsia
  (honeypot) … `⏱ <span id="nt-build-timer">`. Keep ids `nt-fw-counter`/`nt-hp-counter` (re-style as
  coloured-square chips) so `ntUpdateBuildCounters` keeps working; restyle that fn to show remaining
  count + brief flash on change.
- **Terminal bottom bar** = homage left (`#nt-node-name` becomes the SYS_INIT string, grey + emerald
  node token) … status right (`#nt-routing-status`). Replace the `AMAZE_INC_v1.2` version string slot
  with the homage (or repurpose `#nt-node-name`).

### B. Playback screen — centre + bring back terminal frame  (`index.html`; `screen-nt-playback` ≈ index.html:7157-7179)
- Convert to centred pattern.
- Wrap `#nt-playback-canvas` in a terminal frame mirroring build: top bar = latency readout
  (`#nt-playback-latency`) + node id; bottom bar = **`STATUS: NORMAL`** (new id e.g.
  `#nt-playback-status`, green) + the homage. Keep scrubber under the canvas, Continue in the wrapper.

### C. Pointer-driven ghost preview  (`nt.js` — `ntRenderBuildGrid` handlers + new ghost fns)
- Replace tap→place with: pointerdown/move shows a 2×2 emerald ghost (tint the 4 footprint cells via
  `ntBuildCells`) following finger/cursor; pointerup commits. Tap = firewall, hold-still = honeypot,
  drag = reposition. (Reuse the existing long-press timer logic.)
- **3-state validity** at preview time: placeable empty → emerald ghost + `ROUTING: VALID`;
  would-seal-egress (run `ntPathExists` on candidate) → red ghost + `ROUTING: EXCEPTION`;
  occupied/reserved/port → no ghost, silent. Out-of-stock → greyed ghost + transient
  `STORAGE: INSUFFICIENT` (NOT exception).
- **Throttle** the `ntPathExists` flood to fire only when the hovered **anchor tile changes** (cache
  last anchor) — it's a ~5k-cell BFS, must not run every pointermove pixel.
- Clear the ghost on pointerup/leave and on screen exit.

### D. Status state machine  (`nt.js`)
- Build (`ntSetRouting` extended): `VALID` (emerald) / `EXCEPTION` (red, transient) /
  `STORAGE: INSUFFICIENT` (amber, transient).
- Playback: new `ntSetStatus(simMs)` driven by `slowSpans` — `STATUS: NORMAL` (green) when not in a
  slow span at `simMs`, `STATUS: THROTTLED` (red) when in one. Call it from `ntRenderFrame` so it is
  correct during scrubbing. Reuse the `isSlowAt` helper already in `ntRenderFrame`.

### E. Title homage  (`nt.js` `ntShowBuild` + index.html)
- Set `#nt-node-name` (or its replacement) to `SYS_INIT // BOUBOU-6D617A65 // NT-NODE-NN` with the
  `NT-NODE-NN` token wrapped in an emerald span, rest grey. `NN = String(ntCycle+1).padStart(2,'0')`.
  Keep it small monospace; allow graceful wrap/truncate on narrow phones. Mirror on playback frame.

### F. Renderer polish  (`nt.js` — `ntDrawMaze`, `ntRenderFrame`)
- Honeypot block → plain fuchsia **square** (already a square fill; just ensure no ❄/dot glyph
  anywhere — build `ntPaintCell` honeypot/native styles currently carry `❄`, drop it).
- **Draining AoE disc on hit:** for each `fires[]` entry, while `simMs-atMs` < `NT_HONEYPOT_COOLDOWN`,
  fill the AoE disc (centre `(f.x,f.y)*px`, radius `NT_HONEYPOT_RADIUS*px`) translucent fuchsia whose
  alpha/inner-radius drains to empty over the cooldown (= recharge gauge); flash the honeypot square
  bright on the hit frame. Keep the faint static threat ring always-on. Animation lifetime tied to
  `NT_HONEYPOT_COOLDOWN` in **sim-time** (scrub-correct), replacing the current 2600ms ring.
- **Ports:** ingress bar green `#34d399` + small inward arrow (▸ pointing into the board), egress bar
  bad-sector grey (`NT_COLOR_BAD_SECTOR` / slate-600) + small outward arrow — on both the build grid
  (`ntRenderBuildGrid` port bars) and playback (`ntDrawMaze` port bars). Replace current cyan/emerald.
- **Orthogonal bias:** in `NT_STEPS`, bump diagonal `cost` from `NT_DIAG` (√2) to a small factor
  above it (e.g. `NT_DIAG * 1.05`, tune by feel) so open-area paths resolve to clean straight+turn
  rather than jagged shallow diagonals. (Keeps no-corner-cut; still distance-based, no turn timer.)
- **Corner easing:** render the trail polyline with short rounded/quadratic bends (visual only) so
  motion reads smooth. (`ntRenderFrame` trail drawing — round the joints between segments.)

### G. Validate
- Headless harness (vm sandbox, append accessor fns since top-level `let`/`const` aren't vm context
  props — see prior `nt-test.js` pattern): re-confirm the engine still passes after the diagonal-cost
  bump (path found, zig-zag > straight, slow fires, seal rejected). Status/validity/ghost are
  DOM-driven → verify in browser.
- Browser pass (user, hard-refresh fresh tab): ghost preview on touch (press-drag) + desktop hover;
  3-state validity; STORAGE flash; inventory chips in focus + tick/flash; centred build + playback;
  homage title; green-in/grey-out ports + arrows; honeypot draining-disc + STATUS THROTTLED; smoother
  angles. Then tune `NT_STEPS` diagonal factor / easing by feel.

## Files
- `js/games/nt.js` — Groups C, D, E (JS side), F, G. Edit normally.
- `index.html` — Groups A, B, E (markup). **Node UTF-8 script only**, then delete the script.
- (No `sw.js`, no docs in this pass — those are P5.)

## Model + effort recommendation

The user asked: "Sonnet on medium ok?" — Honest take:

- **index.html Groups A/B/E (layout + HUD markup via Node script):** mechanical, well-specified →
  **Sonnet, medium is fine.** The only real risk is the mojibake rule and the centred-layout pattern;
  both are spelled out above.
- **nt.js Groups C/F (pointer-ghost state machine + canvas renderer: draining disc, easing, port
  arrows, orthogonal bias):** the fiddliest part — pointer/touch event interplay, canvas math in
  tile-space, and sim-time-correct animation that must scrub. **Recommend Sonnet on HIGH (or Opus on
  medium)** for these two. Sonnet-medium can do it but is more likely to slip on the touch press-drag
  vs long-press interplay, the scrub-correct cooldown animation, and the `×`/arrow encoding.

**Suggested split if conserving budget:** do A/B/D/E on **Sonnet medium**, and C/F on **Sonnet high**.
If running it all in one pass, use **Sonnet high** (or Opus medium) to be safe — the canvas/pointer
work is where quality matters and a re-do costs more than the upgrade. Always re-read `js/games/nt.js`
and this plan at the start; verify each `index.html` edit didn't introduce mojibake (grep the changed
lines for the literal `×`, `▸`, `—`).

## Verification (end-to-end)
1. `node --check js/games/nt.js` (PowerShell: `node --check "js/games/nt.js"; if ($?){"OK"}`).
2. Headless harness re-run after the diagonal-cost bump (Group G).
3. Grep `index.html` changed lines for intact `×`/arrows/em-dash (no `Ã—`/`â–¸` mojibake).
4. Browser: hard-refresh fresh tab → Net-Trace → solo. Walk build (ghost preview, validity, STORAGE,
   inventory chips, centred, homage) and playback (centred, terminal frame, STATUS NORMAL↔THROTTLED,
   green-in/grey-out ports + arrows, honeypot draining disc, smoother run). Tune by feel.
