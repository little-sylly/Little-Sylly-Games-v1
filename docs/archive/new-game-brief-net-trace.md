# New Game Brief — Net-Trace

**Document type:** Phase 1 — Design Brief (non-technical, consolidated)
**Game ID:** `nt`
**Who fills this in:** Project owner + AI design assistant, before any technical work
**What happens next:** Hand to Claude Code alongside `new-game-technical-template.md` and the rule files. Claude Code reviews this brief against the real codebase, resolves any stack-specific details, fills in the technical template, and presents it for confirmation **before writing a single line of game code.**

> **Note on code suggestions in this brief:** Any code, file names (e.g. `canvas-draw.js`), or implementation specifics mentioned here are **reference/intent only** — they were drafted without access to the real codebase. Treat them as "what we're trying to achieve," not "how it must be built." Claude Code has final say on implementation against the actual stack.

---

## 0. Design North Star (read first)

Net-Trace is our spin on the **Warcraft 3 "Mazing Contest"** custom map (by pender) and its spiritual successor **maze.game**. The goal is to **carry that legacy** — the core mechanics and their small intricacies should stay the same or very close. We are **not reinventing the wheel** on gameplay.

Two things are genuinely ours:
1. **Theme & visuals** — the "Net-Trace / Amaze Inc." security-terminal aesthetic and the red signal-line breach vector.
2. **Sylly Mode (DNP)** — the cooperative team relay, which is new.

Everything else should feel familiar to a veteran mazer. Priorities, in order: (1) faithful mechanics, (2) lightweight offline-first PWA, (3) push the premium look as far as the lightweight constraint allows.

---

## 1. Identity (REQUIRED)

| Field | Your answer |
|---|---|
| Full game name | Net-Trace |
| Short nickname / abbreviation | `nt` |
| One-sentence tagline | Out-engineer the automated breach before your system data is extracted. |
| Thematic universe | Operating-system terminal security suite (`AMAZE_INC` / `AMAZE_OS`). A clean, corporate VM/console aesthetic — no heavy lore dump. |
| Emoji / icon | ⚡ |
| Brand colour | **Terminal Green** (`emerald-500`, `#10b981`) — used for **UI chrome only** (menus, CTAs, pills, toggles, range slider). The **in-Node playfield palette is unchanged**: firewall = cyan-500 (`#06b6d4`), honeypot = fuchsia-500, breach = red-500, bad sector = slate-700. (Cyan was reassigned from brand to firewall-only to avoid colliding with Deep-Sea Deploy, which already owns the cyan UI classes.) |

**The naming easter egg:** "Amaze Inc." reads phonetically as "a-mazing" — a nod to the original Mazing Contest and the owner's long-time player handle "aMazing." This is a subtle inside joke, never stated outright in-game.

---

## 2. The Players (REQUIRED)

| Field | Your answer |
|---|---|
| Player count range | 1–8 players |
| Teams or individuals? | Individuals (Standard Mode), or corporate clusters (Sylly Mode / DNP) |
| Are there different roles? | Only in Sylly Mode (Lead Systems Engineer vs Infrastructure Specialist). No roles in Standard Mode. |
| Is any information hidden? | No information is hidden, but each player builds on their own independent Node simultaneously; placements aren't visible to others until playback. |
| Minimum meaningful player count | 1 (plays perfectly as a solo passthrough — see Solo Mode note in §5). |

### Roles (Sylly Mode / DNP only)

| Role | What they know | What they do | Restrictions |
|---|---|---|---|
| **Lead Systems Engineer** (Captain) | Sees the allocation pool and the full roster during pre-planning | Distributes the shared resource pool to teammates via `[+]`/`[-]` adjusters; locks assignments before the huddle timer ends | Must lock before timer expires |
| **Infrastructure Specialist** (Teammate) | Sees their own Node + a read-only static snapshot of the team pool | Builds the best delay possible with assigned resources; verbally lobbies the Captain for more | Cannot touch the shared pool counters directly |

---

## 3. The Core Loop (REQUIRED)

**In one sentence:** Players deploy a randomised allocation of Firewall Segments and Honeypots onto a grid to force an automated malicious signal (the Breach Vector) to take the longest possible path from the Ingress Port to the Egress Port.

**Central tension / fun moment:** Watching the synchronised playback as your red Breach Vector hits a custom-built bottleneck and repeatedly trips a Honeypot exactly as its cooldown clears — while a rival's vector slips through an open gap and escapes early.

**Closest game type:** Deterministic grid routing / mazing / spatial optimisation puzzle.

**One complete round, plain English:**
1. **Generation** — The **host** generates one Node and **broadcasts it to every device**: grid size, random Ingress/Egress on the edges, randomly placed Bad Sectors, and a randomised identical inventory of Firewall Segments + Honeypots. (Host-authoritative — no per-device seed parity to maintain; matches every existing MDLM game.)
2. **Network Hardening (build)** — All players build simultaneously on their own device. Placement validity is checked instantly; placements that would seal off the Egress are blocked outright. **No path line is shown during build.**
3. **Commit** — Players hit Commit Runtime, or the timer expires. Layouts lock.
4. **Signal Trace (playback)** — The Breach Vector spawns at the Ingress and follows the shortest path to the Egress, accruing delay from turns and Honeypot slows. Everyone watches the synchronised reveal.
5. **Diagnostics** — Times are scored rank-relative (see §5), points awarded, next round's seed generated.

**Simultaneous vs sequential:** Build is 100% simultaneous and private per device. Playback is a shared, synchronised reveal.

**Device model:** Multi-Device Lobby Mode (MDLM) — each player on their own device, optionally a host/TV acting as the shared spectator screen.

---

## 4. Winning (REQUIRED)

| Field | Your answer |
|---|---|
| How does a game end? | After a set number of rounds (default: 5). |
| How is the winner determined? | Highest overall SER (rolling average across all rounds). |
| Are ties possible? | Yes. Tied players/teams share the rank equally. |
| Roughly how long? | ~10–15 min for a full multiplayer match. |

---

## 5. Scoring (REQUIRED)

**Model: System Efficiency Rating (SER) — percentage-based, rolling average.** This replaces all earlier cumulative/point-based scoring. The score is a percentage, not a point total — it fits the terminal diagnostic aesthetic and scales cleanly.

### Per-Node SER (single round)

The player with the **longest delay** in any given Vulnerability Simulation sets the ceiling and is awarded a clean **100.00%**. Every other player is scored relative to that ceiling:

```
Cycle SER = ( your_latency_ms / ceiling_latency_ms ) × 100
```

Displayed to two decimal places (e.g. `87.42%`). Terminal output: `[SYS_STAT: SER 87.42%]`

### Overall SER (match result)

Instead of cumulative addition, the scoreboard shows a **rolling average** across all completed cycles. The player with the highest averaged SER at the end of the match wins.

```
Overall SER = sum_of_all_cycle_SERs / number_of_cycles
```

**Why rolling average, not cumulative sum:** It means a bad round doesn't permanently bury you — your average can recover. It also produces a clean, readable final number (e.g. `SER 87.40%`) rather than an arbitrary large point total, and it fits the "system efficiency diagnostic" theme perfectly.

### Worked example (5 rounds, Standard Mode)

| Cycle | Analyser | kimi | aMazing |
|---|---|---|---|
| VS-1 | 100.00% (best) | 98.81% | 73.19% |
| VS-2 | 100.00% (best) | 99.49% | 73.19% |
| VS-3 | 82.00% | 100.00% (best) | 80.00% |
| VS-4 | 80.00% | 95.00% | 100.00% (best) |
| VS-5 | 75.00% | 88.00% | 92.00% |
| **Overall SER** | **(100+100+82+80+75) ÷ 5 = 87.40%** | **96.26%** | **83.68%** |

Winner: **kimi** with 96.26% SER.

### Scoring events

| What happened | Who scores | How much |
|---|---|---|
| Breach Vector reaches Egress | The player who built the Node | SER relative to cycle ceiling (top = 100.00%) |
| Path technically impossible | N/A | Can't happen — isolating placements are blocked at build time, so a valid path always exists |

**Solo Mode:** No separate scoring system. Solo is just a lobby of one — play the rounds normally with chosen settings. **Because the only player is always the cycle ceiling, solo SER is trivially 100.00% every round** — so in solo the **raw accumulated latency (ms) is the headline result** (the number that actually carries information), with SER shown as a quiet subtitle or omitted entirely. No personal-best tracking, no ghost, no special-casing beyond surfacing raw ms.

**Live display — all modes:** During playback every mode shows a **live raw-ms latency counter** ticking up in real time (honest, always-climbing, keeps spectator energy high). It only **resolves to the final SER %** on the Diagnostic Summary once all results are known. In multiplayer Standard, show both on the summary (raw ms + SER, with SER as the headline). This generalises the DNP live-counter behaviour (§7) to every mode so playback feels consistent throughout.

**DNP Mode scoring:** See §7 (uses the Cumulative Cluster Ceiling method).

---

## 6. Settings (REQUIRED)

| Setting | What it changes | Options | Default |
|---|---|---|---|
| Matrix Scale (grid size) | Node dimensions | `8x8`, `9x9`, `10x10` | `9x9` |
| Simulation Iterations | Rounds per match | `5`, `7`, `10` | `5` |
| Hardening Window | Build timer length | `45s`, `60s`, `90s`, `120s` | `90s` |
| Native Honeypots | Max Honeypots the seed can bake into the Node layout | `0`, `1`, `2` | `2` |

**Notes:**
- **9×9 default** aligns with maze.game's 8×9 proportions on mobile. `16x16` and `12x12` were dropped — too dense for mobile touch targets. (May return later, out for v1.)
- Inventory (number of Firewall Segments + Allocated Honeypots) is **randomised per round**, not a fixed setting. It is **not tied to grid size** — sparse maps (few Bad Sectors + low resources) are often the most creative. Over-allocation is naturally capped by available grid space, so it becomes an optimisation-of-positioning problem either way.

### Bad Sector density (map generation)

Bad Sector count is randomised per round within a **scaling density band** tied to grid size. Rather than a flat minimum, density is expressed as a percentage of total tiles so that all three grid sizes feel proportionally consistent:

- **Minimum: ~8% of tiles** — guarantees at least a few obstacles to maze around and always leaves enough Bad Sectors for honeypot conversion to draw from.
- **Maximum: ~18% of tiles** — keeps the grid open enough for creative routing at all inventory levels.

This gives approximate ranges:

| Grid | Tiles | Min Bad Sectors | Max Bad Sectors |
|---|---|---|---|
| 8×8 | 64 | ~5 | ~11 |
| 9×9 | 81 | ~6 | ~14 |
| 10×10 | 100 | ~8 | ~18 |

**Honeypot headroom clause:** The effective minimum Bad Sectors for any round must satisfy `max(density_floor, NATIVE_HONEYPOTS_setting + 2)`. This ensures the Native Honeypot conversion always has candidates to draw from and never starves the pool — e.g. if `NATIVE_HONEYPOTS = 2`, there must always be at least 4 Bad Sectors before conversion (2 to convert + 2 remaining as terrain). If the seed rolls below this floor, re-roll.

### Map generation pipeline (the "upgrade/replace" model)

This is the canonical order of operations Claude Code must follow. **The entire pipeline runs on the host**, which then broadcasts the finished Node to all devices. **Do not deviate from this sequence:**

```
[Step 1: Matrix init] → [Step 2: Place Bad Sectors + Ingress/Egress]
→ [Step 3: Path validation gate] → [Step 4: Convert N Bad Sectors → Native Honeypots]
→ [Step 5: Load player inventory] → [Step 6: Start Hardening timer]
```

1. **Matrix initialization** — create an empty grid at the active `MATRIX_SCALE`.
2. **Bad Sector placement + port placement** — scatter Bad Sectors (within the density band) and place Ingress/Egress on random edges (Standard) or left/right edges (DNP). Generated **host-side**.
3. **Path validation gate** — run a BFS connectivity check from Ingress to Egress. **If no valid path exists: discard this seed, re-roll from Step 2.** This happens behind the loading screen and should resolve in milliseconds. Critically, validation gates *Bad Sector placement* — not honeypot conversion, which is next.
4. **Native Honeypot conversion** — check the `NATIVE_HONEYPOTS` setting. Roll a random count from `0` to `min(N, available Bad Sectors)`. Randomly select that many existing Bad Sector coordinates and convert them to Native Honeypots. **This step cannot break path validity** — a Native Honeypot is a solid obstacle identical to a Bad Sector for pathfinding purposes; converting one never opens or closes a route that Step 3 already validated.
5. **Inventory generation** — generate the randomised Allocated inventory (Firewall Segments + Allocated Honeypots) for this round. All players get the same inventory.
6. **Hand off to build phase** — the validated Node loads on all devices; the Hardening timer starts.

**Why this order matters:** By treating Bad Sectors and Native Honeypots as a single terrain pass at a consistent total density, the board never becomes accidentally cluttered. Native Honeypots inherit the Bad Sector's natural spatial spacing (lanes, canyons, choke points), so they slot into the terrain as logical traps rather than random noise. Total unmovable obstacle count stays constant regardless of honeypot settings.

### Honeypot nomenclature: Native vs Allocated

To maintain the terminal/OS aesthetic and avoid generic words like "generated" or "built":

- **Native Honeypots** (map-generated): inherent to the Node layout seed. Converted from existing Bad Sectors during generation. Players treat them as part of the fixed landscape — they must route around or through them.
- **Allocated Honeypots** (player-deployed): tactical resources granted to the player's build budget from the inventory pool. These are what the player places during Network Hardening.

A Node can have **up to 4 total Honeypots** (up to 2 Native + up to 2 Allocated). This cap is adjustable via settings if needed later.

---

## 7. Sylly Mode — Distributed Network Protocol (DNP)

The cooperative team mode. **It changes how the game is played, not the core engine rules.** Built on "simultaneous relay + shared resource pool."

> **Implementation note (multiplayer infra — RESOLVED):** DNP needs *teams of individuals* (each player on their own device, grouped into teams, with one captain per team). This is **not** new lobby infrastructure — it reuses the existing roster system (`rosterConfig: { type: 'teams', hasCaptain: true }`), the same machinery Secret Signals uses for MDLM-teams and Deep-Sea Deploy uses for teams-with-captain, combined. The captain "top slot / badge" maps to the roster's `captainSlots`. **Constraint: the existing roster supports exactly 2 teams, so DNP is 2-team for v1** (which matches the Amaze Inc. / Pender Securities defaults and the cluster-ceiling example). 3+ "clusters" would require new infra — out of scope for v1. The genuinely-new DNP work is **game-specific only**: the Shared Allocation Hub (huddle), the continuous relay playback with camera pan, cross-Bridge velocity/slow-state carry, and Cluster Ceiling scoring.

**Thematic name:** Distributed Network Protocol (DNP). The link between one player's Egress and the next player's Ingress is called a **Bridge**.

**Default team names** (used when no custom name is entered):
- Team 1: **Amaze Inc.**
- Team 2: **Pender Securities** (a nod to pender, the original WC3 Mazing Contest creator)

**The flow:**

1. **Lobby / team formation** — Selecting DNP reconfigures the lobby into Team Cards. Players drag into a team or randomise. The top slot of each card is the **Lead Systems Engineer** (Captain), marked with a badge.

2. **Pre-Planning huddle (gated)** — Before building, all devices enter a collaborative huddle. Timer scales with team size:

   ```
   Huddle Time = Hardening Window setting × players per team
   ```

   (e.g. 90s setting × 3 players = 4.5 min huddle.)

   **All players** (Captains AND Specialists) see:
   - The **Allocated resource pool** (team's total Firewall Segments + Honeypots).
   - The **entire set of bridged Nodes** — all the Node layouts their team will be building on, so they have the full picture to make allocation decisions.

   **Only the Lead Systems Engineer** (Captain) can actually manipulate the `[+]`/`[-]` allocation adjusters to distribute resources to teammates. **Specialists** see the same information but cannot adjust — coordination happens verbally. Captain locks assignments before the timer ends.

3. **Network Hardening (gated start, simultaneous)** — All players un-gate at once and build their own Node with only the resources assigned to them. **In DNP, Ingress is pinned to the LEFT edge and Egress to the RIGHT edge** so Nodes chain horizontally into a relay. (Standard mode does NOT do this — see §17.)

4. **Signal Trace playback (continuous relay)** — One continuous Breach Vector. It spawns at Player 1's Ingress, runs their Node, crosses the **Bridge** into Player 2's Ingress carrying its exact velocity/slow state, and so on. **Status is preserved across the Bridge** — if it exits Player 1 still slowed, it enters Player 2 still slowed until that effect's timer clears.

   **Mobile presentation:** Do **NOT** render all Nodes side-by-side (messy on mobile). Instead, **the camera transitions/pans from one Node to the next** as the vector crosses each Bridge. Each player has already only ever seen their own Node — they mentally piece the relay together through discussion, and the playback transition is the payoff reveal.

   **Live score display during DNP playback:** Because the Cluster Ceiling SER can only be finalized once *all* legs from *all* teams have run, the live playback screen shows a **raw accumulated latency counter (ms)** ticking up in real time as the vector traverses each Node. This keeps the spectator energy high without lying about a percentage that can't yet be calculated. The counter is honest, always-increasing, and creates genuine hype ("we're at 47,000ms and still going…"). The **final SER %** is only resolved and displayed on the Diagnostic Summary after all teams' totals exist.

**Unallocated inventory warning (DNP huddle):** If the Captain attempts to advance past the Pre-Planning phase while resources remain in the `UNALLOCATED` pool, display a **pulsing orange `UNALLOCATED INVENTORY` counter** as a warning. This is a *warning only* — do not block the start, as a Captain may deliberately hold back reserve or simply be out of time. In this game unused inventory is already self-punishing (unused blocks = less delay = lower SER), so the warning is a clarity nudge, not a balance mechanic.

### DNP Scoring — Cumulative Cluster Ceiling

DNP uses the **Cumulative Cluster Ceiling** method to produce a fair team SER. This avoids the mathematical trap of "averaging percentages from different denominators."

**How it works:**

1. **Establish Node Ceilings** — for each Node position in the relay, take the **best latency achieved by any team** at that position:

   ```
   Ceiling_1 = max(Team A Node 1 latency, Team B Node 1 latency)
   Ceiling_2 = max(Team A Node 2 latency, Team B Node 2 latency)
   Ceiling_3 = max(Team A Node 3 latency, Team B Node 3 latency)
   ```

2. **Compile the Cluster Ceiling** — sum those position ceilings into the theoretical "perfect pipeline":

   ```
   Total Cluster Ceiling = Ceiling_1 + Ceiling_2 + Ceiling_3
   ```

3. **Compute Team SER** — each team's actual total latency vs the cluster ceiling:

   ```
   Team SER = ( actual_total_team_latency / total_cluster_ceiling ) × 100
   ```

The team with the longest actual pipeline gets 100.00% SER. The losing team gets a proportional SER.

**Per-leg breakdown:** The Diagnostic Summary also shows each Node's individual latency contribution so players can compare who carried which "leg of the relay." (Team SER decides the rank; per-leg is the social payoff.)

**Worked example (2 teams, 3 Nodes each):**

| Node position | Team Amaze Inc. | Team Pender Sec. | Node Ceiling (best) |
|---|---|---|---|
| Node 1 | 32,000 ms | 28,000 ms | 32,000 |
| Node 2 | 25,000 ms | 30,000 ms | 30,000 |
| Node 3 | 18,000 ms | 22,000 ms | 22,000 |
| **Team Total** | **75,000 ms** | **80,000 ms** | **Cluster Ceiling: 84,000** |
| **Team SER** | **(75000/84000)×100 = 89.29%** | **(80000/84000)×100 = 95.24%** | |

Winner: **Pender Securities** with 95.24% SER.

| DNP question | Answer |
|---|---|
| New screens/phases? | Yes — adds the Pre-Planning / Shared Allocation huddle. |
| Changes scoring? | Yes — uses Cumulative Cluster Ceiling SER between teams, with per-leg breakdown. |
| Changes win condition? | No — highest SER still wins. |

---

## 8. Thematic Vocabulary (REQUIRED)

| Generic term | Net-Trace term |
|---|---|
| Grid / map / field | The Node |
| Round | Vulnerability Simulation (a.k.a. Simulation Cycle) |
| Build phase | Network Hardening |
| Wall / standard block | Firewall Segment |
| Slow trap | Honeypot |
| Fixed obstacle | Bad Sector |
| Empty/open tile | Null Sector |
| Spawn / start | Ingress Port |
| Goal / exit | Egress Port |
| Pathfinding runner | Breach Vector (rendered as a red signal stream) |
| Inter-Node connection (DNP) | Bridge |
| Score / points | System Efficiency Rating (SER) — displayed as `XX.XX%` |
| Placement error | Routing Exception |
| Submit / lock-in | Commit Runtime |
| Game-over screen | Diagnostic Summary |
| Play again | Reboot System |
| Quit | Terminate Session |
| Settings overlay | `SYS.CONFIG` |
| Player role | Systems Engineer |

**Tone:** Strategic, clean, quantitative, professional, mechanical. **Should NOT feel like** a chaotic casual game with random item drops or unpredictable mechanics. The vocabulary should read like a security engineer's console — legible in two seconds, with just enough threat to generate table energy.

---

## 9. Word Bank & Content (REQUIRED)

| Field | Answer |
|---|---|
| Uses existing `words.json`? | No. |
| What content does it need? | A procedural, math-driven map generator (host-side) that places grid size, Ingress/Egress, Bad Sectors, and the inventory budget, then broadcasts the finished Node to all devices. |
| Needs a new data file? | No — maps are generated algorithmically at runtime from the seed. |
| Words/topics to exclude | N/A |

---

## 10. Multiplayer Classification (REQUIRED)

| Field | Answer |
|---|---|
| Each player own device, or shared? | Own device (MDLM), optional host/TV spectator screen. |
| Info that must stay private? | No info is secret, but local placements don't sync to others until Commit. |
| Simultaneous moments? | Yes — Pre-Planning huddle (DNP) and Network Hardening build are simultaneous. |
| One device locked while another active? | No. |
| Phases that don't work multi-device? | None — designed natively for multi-device. |

**Mode reality:** Standard = MDLM (individual devices). DNP = MDLM grouped into **2 teams with a per-team captain**, reusing the existing roster infra (`rosterConfig: { type: 'teams', hasCaptain: true }`) — see §7 implementation note. No new lobby topology required.

---

## 11. Screens — Plain English List (REQUIRED)

1. **System Core Menu** — title, branding, configuration options.
2. **Lobby Assignment Console** — player profiling; team/captain clustering (DNP).
3. **Shared Allocation Hub** *(DNP only)* — pre-planning resource balancing dashboard.
4. **System Flavour Handshake** — boot animation that syncs players (`INITIALISING OS… CONNECTING TO CLUSTER… SECURING INGRESS`). Play it **full only at match start**; **between rounds run an abbreviated, skippable** version so it doesn't grate by round 7–10.
5. **Cycle Initialization Gate** — click-to-start readiness confirmation before the build phase.
6. **Network Hardening Field** — the hyper-focused, maximised build screen (see §17 for exact layout).
7. **Signal Trace Playback Panel** — synchronised playback (see §16 for the full layout). **Standard mode** follows the maze.game layout: your own Node as the primary panel, a ranked player/score list to select whose maze to view alongside, a scrubber bar, and comparison panels below. **DNP** uses one continuous vector with the camera panning Node-to-Node across each Bridge.
8. **Diagnostic Summary Console** — end-of-round/match scores; per-leg breakdown in DNP; Reboot/Terminate buttons.

---

## 12. Open Questions & Notes for Claude Code (REQUIRED)

**Recommendations are given throughout; Claude Code validates them against the real codebase.** Key items to confirm/decide:

- **Rendering stack — RESOLVED:** The hybrid is confirmed sound — DOM/CSS grid for the build screen (better touch targets) + a single HTML5 2D Canvas overlay for playback (the trace/effects). **`canvas-draw.js` exists but is NOT reusable here** — it is a freehand stroke-capture module (pointer capture → delta-encoded strokes) built for Group Therapy's drawing, not an animation-loop renderer. NT gets its **own game-local animation-loop canvas renderer** (kept in the plugin / a game-specific file, not promoted to a shared `js/lib/` module — YAGNI until a second game needs it). The `requestAnimationFrame` handle is a timer: it **must be cancelled in the quit-confirm handler, in `resetToLobby()`, and on any early exit from playback** (Timer Lifecycle rule) or it ticks against the next screen.
- **UI CSS classes (build-time note):** Terminal-green brand classes don't exist yet — `pill-active-*`, `game-toggle-on-*`, and a `*-range` slider class for emerald will need adding to `css/styles.css` during implementation.
- **Pathfinder:** A vanilla BFS on a ≤100-node grid runs in well under a millisecond. Recommended for both the build-time validity check (flood-fill: is Egress still reachable?) and the commit-time shortest-path computation. A* is unnecessary here.
- **Deterministic tie-breaking:** When two shortest paths are equal length, evaluate neighbours in a fixed clock order (North, East, South, West) so the same Node always produces the same path. This lets advanced players manipulate "path flipping" predictably. **The host computes the shortest path + playback timeline at Commit and broadcasts it**; devices replay the broadcast timeline (so determinism is for reproducibility/advanced play, not cross-device parity).
- **Two-stage logic (important clarification):** There is **no real-time pathfinding during build.** Build phase = validity/connectivity check only (placements that isolate the Egress are blocked). Shortest-path is computed **only at Commit**, for playback. (The discussion history contains an incorrect version where these were conflated — this is the correct model.)
- **DNP cross-Bridge state:** Carrying velocity + remaining slow-duration accurately across independent Node array boundaries at a Bridge is the trickiest implementation bit — flagged for care.
- **Map generation — canonical pipeline (see §6 for full detail):** Runs **host-side**, in this order: (1) matrix init, (2) Bad Sectors + port placement, (3) **path validation gate — re-roll Step 2 if no valid path**, (4) Native Honeypot conversion (upgrade subset of Bad Sectors), (5) inventory generation, (6) broadcast the finished Node + start build phase. The validation gate catches Bad Sector placement, NOT honeypot conversion — conversion cannot break path validity since Native Honeypots are solid obstacles identical to Bad Sectors for pathfinding purposes.
- **Bad Sector density band:** Generate Bad Sector count within 8–18% of total tiles. Effective minimum per round = `max(ceil(0.08 × total_tiles), NATIVE_HONEYPOTS_setting + 2)`. The `+2` clause ensures the conversion pool always has enough candidates. If the seed rolls below this floor, re-roll.
- **Native Honeypot conversion count:** `random(0, min(NATIVE_HONEYPOTS_setting, available_bad_sectors))`. Never generate more Native Honeypots than there are Bad Sectors to convert.
- **Live display (all modes):** show a raw accumulated ms counter (ticking live during playback); only resolve to final SER % on the Diagnostic Summary. In **solo** this raw-ms counter is the headline result (solo SER is always 100%). In **DNP** the team SER can only be finalised once all teams' totals are known — so the live ms counter is essential there.
- **Easter egg touch target:** apply a minimum 44×44px invisible hit-box over `AMAZE_INC_v1.2` in the VM status bar for reliable mobile triple-tap detection.

**Out of scope for v1:** upgradable trap tiers (e.g. level-2 freeze); interactive placement or path rewriting while the trace is mid-run; any random mid-run chaos modifiers.

---

## 13. Mood & References (REQUIRED)

| Field | Answer |
|---|---|
| Most similar to | Mazing Contest (WC3 custom map), maze.game |
| Tone | Strategic, clean, quantitative, hyper-focused, professional |
| Should NOT feel like | A chaotic casual game with random drops or unexpected mechanics |
| Example copy | `[ROUTING: EXCEPTION DETECTED]` |

Visual references: the maze.game playback screenshots/GIFs (red signal head with fading trail, blue/cyan segment blocks, snowflake-style slow pulse, side-by-side multi-player playback) and two neon-circuit reference images. We are emulating that *feel* with pure code, not copying assets.

**Neon-circuit reference description (images not committed — zero-asset constraint):**
The two reference images establish a shared visual mood: a **deep navy/slate base** (near-black, very dark blue), scattered with **glowing cyan squares at varied sizes and opacities** — some bright-filled, some faint-outline — arranged in loose grid-like clusters and connected by **thin, crisp cyan circuit traces**. The sense of depth comes from brightness tiers: foreground elements are vivid and fully lit; background elements recede to near-invisible whispers of the same shape. The second image layers in **warm amber accent nodes and junction dots** at key intersections, making the amber feel like "active current" against the cool-cyan structure. Together: cyan lattice on dark navy + amber energy accent = the ambient mood. This drives the **ambient and chrome layers only** (menu backgrounds, faint drifting circuit layer, playback glow, terminal chrome bezel) — the **in-Node playfield palette is unaffected** (cyan firewall / fuchsia honeypot / red breach / slate bad sector must stay clearly distinct as gameplay elements).

---

## 14. Sample Round (REQUIRED)

**Standard Mode, 3 players (Alex, Blake, Cameron), 9x9, inventory this seed: 20 Firewall Segments, 2 Allocated Honeypots + 1 Native Honeypot on the map.**

1. **Generation:** Ingress spawns on the west edge at `(0,2)`, Egress on the south edge at `(6,8)` (random edges — not forced opposite). 4 Bad Sectors and 1 Native Honeypot scatter across the interior. All three players get this identical Node + identical inventory.
2. **Hardening:** Alex builds a long horizontal snake, dropping his 2 Allocated Honeypots on his tightest corners. Blake accidentally drags a line that would seal the Egress — the cell flashes red and the placement is simply blocked, keeping her layout legal. Cameron routes the path through the Native Honeypot *and* clusters his 2 Allocated ones nearby, aiming for a triple-clap.
3. **Commit:** Timer ends; layouts lock; shortest paths computed.
4. **Signal Trace:** Blake's loose layout lets the vector escape early (low delay). Alex's corners rack up turn-delay (mid). Cameron's cluster catches the vector repeatedly as cooldowns clear (high delay).
5. **Diagnostics:** Cameron is the cycle's best → **SER 100.00%**. Alex scores e.g. `(alex_time / cameron_time) × 100 = 85.71%`. Blake scores e.g. `45.00%`. Rolling averages update; next seed generates.

---

## 15. Engine Constants (NEW SECTION — calibration baseline)

All tuning values live as **clearly-labelled global constants at the top of the plugin file** so the owner can eyeball and live-adjust them during prototyping. The values below are a **starting point derived from the WC3 / maze.game references**, not gospel — expect to tune by feel. The original mechanics may be slightly outdated, so Claude Code may refine, but the *behaviour* (especially quad-clap) is the ground truth.

```javascript
// ============================================================
// NET-TRACE (NT) — ENGINE BALANCING CONSTANTS (tune by feel)
// ============================================================
const NT_GRID_BOUNDS        = 9;        // default Node size (8/9/10 selectable)

// NOTE: brand/UI-chrome colour is Terminal Green (emerald-500, #10b981) — applied via
//   UI classes (pills, toggles, CTAs, range slider), NOT part of this canvas palette.
//   The canvas/playfield colours below are unchanged (firewall stays cyan).

// TIMING & MOVEMENT (milliseconds)
const NT_BASE_TILE_TIME     = 240;      // time to cross one tile in a straight line
const NT_TURN_DELAY         = 120;      // EXTRA time added per 90° direction change
                                        //   (see §16 — this ADDS delay = ADDS score; it is a REWARD, not a penalty)

// HONEYPOT (slow trap)
const NT_HONEYPOT_RADIUS    = 1.45;     // Euclidean AoE radius — see calibration note below
const NT_HONEYPOT_SLOW      = 0.50;     // speed multiplier while slowed (50% slower)
const NT_HONEYPOT_DURATION  = 1800;     // how long a single slow effect lasts (ms)
const NT_HONEYPOT_COOLDOWN  = 2400;     // recharge before the same Honeypot can fire again (ms)

// VISUAL THEME (Tailwind-aligned hex)
const NT_COLOR_FIREWALL     = '#06b6d4';  // cyan — user-built firewall segments (theme colour)
const NT_COLOR_BAD_SECTOR   = '#334155';  // dead slate — fixed obstacles (no glow)
const NT_COLOR_HONEYPOT     = '#d946ef';  // fuchsia — slow traps
const NT_COLOR_BREACH       = '#ef4444';  // red — the breach vector signal head
const NT_TRAIL_ALPHA        = 0.20;       // canvas overfill alpha for the fading neon trail
```

**Honeypot stacking rule (IMPORTANT — must be explicit):** Slows do **NOT** stack or compound. Each Honeypot hit applies the 50% slow independently and expires on its own timer. Two or more simultaneous hits do **not** reduce speed further than 50% — the slow is governed by "is at least one slow active," not by how many. Stacking 3–4 Honeypots is about **coverage and re-trigger frequency**, not deeper slowing. Do not implement compounding/multiplicative slows.

**AoE radius calibration:** Tile centres are 1.0 apart orthogonally and √2 ≈ 1.414 apart diagonally. A radius of 1.0 only reaches orthogonal neighbours; 1.45 cleanly reaches diagonal neighbours (enabling corner-clapping) without over-reaching into wide loops. **The canonical "quad structure" (a 2×2 Honeypot cluster that the vector circuits four times) is the calibration anchor** — it existed in WC3 and still works in maze.game. Tune `NT_HONEYPOT_RADIUS`, `NT_HONEYPOT_COOLDOWN`, and `NT_BASE_TILE_TIME` together so that a correctly-built quad reliably claps four times: the cooldown should clear at roughly the moment the slowed vector circuits back into the trap's radius on the next quadrant. Use the quad as the live test fixture.

---

## 16. Playback, Camera & the Turn Model (NEW SECTION)

**Turn mechanic framing — corrected.** In WC3 the turn-rate was a "penalty" because there longer paths *hurt* your defence. In Net-Trace the goal is **maximum delay**, so a turn **adds time = adds score**. It is a **reward**, not a penalty. All design language should reflect this: "corners *earn* you time," not "corners cost you." Mechanically it's a flat time addition per 90° change of axis (`NT_TURN_DELAY`).

**Visual feel of turns — the light-redirect model.** The Breach Vector should *not* snap robotically around corners. Picture light traveling along the grid: it moves straight, and at a corner it **redirects** cleanly onto the new axis and continues — not an angled physics bounce, a crisp grid-aligned pivot. Visually: a brief ease-in deceleration into the corner, a sharp redirect, then ease-out acceleration along the new axis. The *scored* delay stays discrete and deterministic (`NT_TURN_DELAY`); the easing is purely cosmetic and is a big part of the premium feel.

**Honeypot trigger visual:** when the vector head enters a Honeypot's radius, fire an expanding concentric-ring shockwave (radar-style pulse, fuchsia), drop the vector to the slow speed, and visibly thin/pulse the trail. Independent cooldown per Honeypot.

**Time compression:** Real-time playback of a 70-second maze is far too long for a fast party game. **Speed up playback** to a reasonable, watchable pace (tune to feel — fast enough to keep momentum, slow enough to read the corner-claps).

**Standard-mode playback layout (maze.game-faithful).** Each device shows:
- **Primary panel** — the local player's *own* Node trace, large, with their name + the **live raw-ms counter** ticking up.
- **Player / score list panel** — right-hand column on wide screens, a slide-in overlay on mobile. Lists all players ranked by live ms (→ SER on the summary), the local player highlighted. **Tap a player to load their maze** into a comparison slot. This panel also holds the advance control: **CONTINUE** (wide) / **SKIP** (mobile).
- **Scrubber bar** — a single timeline between the primary panel and the comparison row; it drives **synchronised** playback across *every* maze currently on screen, with scrub + skip-to-end.
- **Comparison panels** — below the primary, the selected players' Nodes play alongside it for side-by-side viewing.
- **Mobile stack order:** primary maze (top, with score) → scores/player-list overlay (with SKIP) → scrubber → other selected mazes below.

**Scrubber / skip:** Provide a time-slider / skip-to-end control (like maze.game) so viewers can scrub or jump to the result. The scrubber governs all mazes shown at once (one shared timeline).

**Advancing to the next Node — confirmation gated.** Do **not** auto-advance on a timer. After playback ends, players confirm to continue (some will want to review/discuss the maze). A gated "continue" keeps control with the table.

**DNP camera:** One continuous vector; the camera **pans/transitions between Nodes** at each Bridge crossing rather than showing all Nodes at once. This is the mobile-friendly substitute for side-by-side multi-grid views.

---

## 17. Build Screen Layout (NEW SECTION — "VM window" aesthetic)

The build screen (Network Hardening Field) is structured as three separated zones so the playfield gets maximum touch area. The action area is framed like an **embedded VM / device window** running inside Amaze Inc. OS.

> **Layout note:** In the diagram below, the arrows and labels on the right (`← App header`, etc.) are **annotations for this document only**. They are NOT rendered in the UI. The VM window contains ONLY its chrome title bar, the grid, and the status bar — nothing else eats playfield space.

```
┌───────────────────────────────────────────────────┐
│  VULNERABILITY SIMULATION  1/3       🔊  [?]  ✕    │  ← App header: title / sound / help / exit
├───────────────────────────────────────────────────┤
│  ▓▓ FIREWALL  3/5      ❄ HONEYPOT  1/2      ⏱ 0:59 │  ← Passive counters + build timer
├───────────────────────────────────────────────────┤
│ ╔═══════════════════════════════════════════════╗ │
│ ║ ● ● ●          NT-NODE-04           ◀ ▶ ▣      ║ │  ← VM window chrome (title bar)
│ ╟───────────────────────────────────────────────╢ │
│ ║   ·  ·  ·  ▩  ·  ·  ·  ·  ·  ·  ▩  ·  ·  ·   ║ │
│ ║   ·  ▓  ·  ·  ·  ·  · · ·   ▓  ·  ·  ·    ▶   ║ │  (Egress on a random edge — Standard mode)
│ ║   ·  ▓  ·  ·  ❄  ·  ▩  ·  ▓  ·  ·   ·  ·      ║ │
│ ║   ·  ▓  ▓  ▓  ·  ·  ·  · ▓   ▓ ▓  ·  · ▓ ▓     ║ │      THE NODE
│ ║   ·  ·  ·  ▓  ·  ·  ·  ·  ·  ·  ·  ▓  ·  ·     ║ │   (maximum touch area)
│ ║   ▩  ·  ·  ▓  ·  ·  ❄  · ▩  ·  ·     ▓  ·   ║ │
│ ║ ▶ ·  ·  ·  ·  ·  ·  ·  ·    ▓  ·    ·   ·  ·   ║ │  (Ingress on a random edge — Standard mode)
│ ║   ·  ·  ·  ▓ ·  ·  ·  · ·  ·  ·  ▩  ·   ·  · ║ │
│ ╟───────────────────────────────────────────────╢ │
│ ║ AMAZE_INC_v1.2  [ROUTING: EXCEPTION DETECTED] ║ │  ← VM status bar (easter egg) [ROUNTING: VALID]
│ ╚═══════════════════════════════════════════════╝ │
├───────────────────────────────────────────────────┤
│              [  COMMIT  RUNTIME  ▶  ]              │  ← Submit — its own zone, below everything
└───────────────────────────────────────────────────┘
```

**Zone breakdown:**

- **App header** (separate from the VM window): title + round counter on the left; sound toggle, `[?]` help, and `✕` exit on the right. **No back button** — active play can't go back; exit leaves entirely.
- **Inventory + timer strip:** `FIREWALL x/y` and `HONEYPOT x/y` are **passive counters** (not tool toggles — see controls below); build timer on the right. Show `x` as **remaining / total** (remaining is the live decision the player is making) and label it so there's no ambiguity — e.g. `FIREWALL 3 left / 5`.
- **The VM window** (the only thing that scales with grid size): a chrome title bar (`● ● ●`, the Node name, window buttons), the grid itself, and a thin status bar. This frame is where premium styling lives — subtle bezel, inner glow, faint scanline — without intruding on the playfield.
  - **Title bar** shows the Node name. In DNP it shows the relay leg, e.g. `NT-NODE-02 // CORE`. The decorative chrome (`● ● ●` and any `◀ ▶ ▣` window buttons) must be rendered **inert / low-contrast** so they don't read as tappable — or drop `◀ ▶ ▣` entirely. Nothing in the chrome is interactive except the status-bar version-string easter egg.
  - **Status bar** shows the easter egg `AMAZE_INC_v1.2`. (Callback to the original Mazing Contest version / owner's handle.) Tapping the version string is the secret hook for the monochrome/overclock theme (see §19). Routing: Valid (in green) is the default when path is valid. When the player tries to input a invalid placement (it won't be allowed) the VALID will flash EXCEPTION DETECTED (in red), only a brief flash to indicate (maybe include a small warning sound too).
- **Commit Runtime button:** its own zone, below the window, so it can't be fat-fingered mid-build.

**Legend lives in `[?]` help, not on the grid:** the symbol legend (`▶ Ingress · ▩ Bad Sector · ▓ Firewall · ❄ Honeypot · · Null Sector`) and the controls reference open from the header `[?]` button. The playfield stays clean. Help should also include instructions for those that need help.

**Validity feedback — preventive, not a status readout:** Validity is checked **instantly on every attempted placement**. Invalid placements (anything that would isolate the Egress) are simply **blocked** — they don't get placed. The feedback is a **red flash on the attempted cell** and the Status bar mentioned above. The player never has to check path validity themselves.

**Ingress / Egress placement (mode-dependent — important):**
- **Standard mode:** Ingress and Egress spawn on **random edges** (same seed for all players). No left/right constraint; they can be on adjacent or opposite edges.
- **DNP / Sylly mode only:** Ingress pinned to the **LEFT** edge, Egress to the **RIGHT** edge, so Nodes chain horizontally into the relay.

**Grid scaling:** the VM frame stays fixed; grid cells resize to fill it. Square grids in a portrait viewport leave natural room for the header/inventory strip above and the Commit button below. **Caution:** at `10x10` on a narrow phone, cells fall to ~36px — below the 44px touch ideal (grids get some latitude, like Sudoku, but confirm `10x10` feels OK on a real device before committing it; `8x8`/`9x9` are comfortable).

### Controls (match maze.game exactly)

| Action | Mobile | Browser |
|---|---|---|
| Place Firewall Segment | Tap empty cell | Left-click empty cell |
| Place Honeypot (on empty) | Long-press empty cell | Right-click empty cell |
| Upgrade Firewall → Honeypot | Long-press the existing Firewall | Right-click the existing Firewall |
| Remove any block | Tap the block | Left-click the block |

There is **no persistent tool selection** — the gesture is contextual to what's under the finger/cursor. The inventory counters are passive displays, not toggles. Long-press is gesture-contextual: on empty it places a Honeypot, on a Firewall it upgrades to a Honeypot.

**Touch handling (mobile — important):** the grid needs `touch-action: none` plus suppression of the iOS callout / context menu and text-selection magnifier on cells, and a tuned long-press threshold — otherwise page scroll and the selection magnifier fight the contextual gestures. Honeypots are scarce (max 2 allocated), and long-press is the one non-obvious gesture, so make sure the `[?]` help teaches it clearly.

---

## 18. Visual Rendering Strategy (NEW SECTION — premium on a budget)

Goal: push a premium, neon-terminal feel while staying **offline-first, zero-asset, lightweight**. The premium feel lives almost entirely in **playback**, not the build screen.

**Dual-layer approach (recommended; Claude Code to validate):**
1. **Background grid layer (CSS/DOM):** static grid drawn with CSS (gradient/tiling), no per-frame redraw. Rigid container, near-zero JS cost. Firewall/Honeypot/Bad Sector tiles are styled DOM cells during build (great for tap targets).
2. **Vector trace layer (single HTML5 2D Canvas):** one canvas pinned over the grid box, used only during playback for the moving signal, the fading trail, and the shockwave rings.

**Ambient / chrome layer — neon-circuit direction (from visual references):**
The received reference images establish the ambient and chrome aesthetic: **deep navy/slate base** (near-black); scattered **glowing cyan squares at varied sizes and opacities** (bright-filled foreground → faint-outline background, creating depth via brightness tiers) connected by **thin crisp cyan circuit traces**; **warm amber accent nodes** at key junctions (active-current feel). Applied as:
- **Menu background:** a faint, slowly-drifting ambient circuit layer (canvas or CSS animation) — too subtle to distract but immediately establishes the terminal world.
- **VM window chrome / bezel:** subtle inner glow in the cyan trace palette; amber as a selective accent (e.g. the easter-egg version string dot, a junction highlight).
- **Playback wake / trail:** the fading neon wake behind the breach vector inherits the same neon-on-dark quality naturally.
- **Does NOT affect playfield tile colours:** cyan firewall / fuchsia honeypot / red breach / slate bad sector are fixed for gameplay legibility and must remain clearly distinguishable regardless of the ambient layer beneath them.

**Cheap effects that read as expensive:**
- **Fading neon trail:** instead of `clearRect` each frame, overfill the canvas with a low-alpha dark rect (`NT_TRAIL_ALPHA ≈ 0.20`). This leaves an automatic fading wake behind the red head — no GPU filters needed.
- **Glow:** modest `shadowBlur` + `shadowColor` on the firewall borders and the signal head. Use sparingly to protect mobile framerate.
- **Shockwave:** expanding concentric `arc()` rings over ~5–12 frames, thinning to zero opacity — the Honeypot "clap."
- **Corner easing:** ease-in/ease-out through redirects (the light-redirect model, §16).

**Avoid on mobile:** hundreds of independent DOM elements with heavy `backdrop-filter: blur` or multi-layer box-shadows — these tank framerate. Keep the heavy motion on the single canvas.

**Colour palette (playfield):** This is the *in-Node* palette only. The **UI chrome** (menus, CTAs, pills, toggles, headers) uses the brand colour **Terminal Green (emerald-500, `#10b981`)** — kept deliberately separate from the playfield so the grid reads as cyan-firewall/red-breach while the surrounding app reads as green-terminal.

| Element | Colour | Tailwind |
|---|---|---|
| Canvas base | `#0f172a` | slate-900 |
| Firewall Segment (theme) | `#06b6d4` | cyan-500 |
| Bad Sector | `#334155` | slate-700 (flat, no glow) |
| Honeypot | `#d946ef` | fuchsia-500 |
| Breach Vector | `#ef4444` | red-500 |

Colour-coding requirement: Bad Sectors and Firewall Segments must be **clearly distinguishable** — Bad Sectors are flat dead slate with zero glow (unmovable hardware failure); Firewalls glow in the cyan playfield colour (your built defences).

---

## 19. Easter Eggs & Flavour (NEW SECTION)

Bake the Amaze Inc. corporate-terminal lore into UI styling and hidden commands rather than dialogue. All optional, all low-cheese.

- **`AMAZE_INC_v1.2`** in the VM status bar — the core callback (original Mazing Contest version / owner's "aMazing" handle). Tapping the version string rapidly (3×) triggers a brief glitch transition into an **ultra-sparse monochrome / amber "overclock" theme**.
- **Corporate copy** on system text (keep it terse):
  - Build phase header: `NETWORK HARDENING`
  - Commit success / playback: `TRACING SIMULATION…`
  - Invalid placement flash: `ROUTING: EXCEPTION DETECTED`
  - Settings overlay header: `root@amaze_inc:~# ./sys.config`


Keep all easter eggs **visible but non-distracting** — they live in the frame border / status bar, never in the playfield.

**Mobile touch target for the version string:** The `AMAZE_INC_v1.2` text in the VM status bar is small by design. On mobile, define a **minimum 44×44px invisible hit-box** (Apple HIG standard) centred over the text so the triple-tap trigger fires cleanly without misfiring into the build grid adjacent to it. This is a standard mobile PWA practice — Claude Code should apply it automatically to any small interactive text element.

---

## Appendix — Decisions Log (so context isn't lost)

Quick reference of resolved decisions that the earlier AI discussion kept drifting on:

- **Brand colour:** Terminal Green (emerald-500, `#10b981`) for **UI chrome only**; cyan reassigned to **firewall tiles** to avoid colliding with Deep-Sea Deploy's existing cyan UI classes. ✓ *(resolved in Claude Code review, June 2026)*
- **Generation model:** host-authoritative — the **host generates the Node once and broadcasts it** (and computes the shortest path + playback timeline). The "shared seed generates identical Node on every device" framing is dropped (no cross-device RNG parity to maintain; matches every existing MDLM game). ✓ *(resolved June 2026)*
- **Renderer:** NT uses its **own game-local animation-loop 2D canvas** for playback — `canvas-draw.js` is a freehand stroke-capture module and is NOT reused; the renderer is not promoted to a shared `js/lib/` module (YAGNI). Hybrid: DOM/CSS grid for build + single canvas overlay for playback. ✓ *(resolved June 2026)*
- **DNP multiplayer infra:** reuses the **existing MDLM-teams + per-team-captain roster** (`rosterConfig: { type: 'teams', hasCaptain: true }`) — no new lobby topology. **2 teams only for v1** (roster is hardwired to 2 teams). ✓ *(resolved June 2026)*
- **Live score display:** **all modes** show a live raw-ms counter during playback, resolving to final SER % on the Diagnostic Summary. **Solo headline = raw ms** (SER is trivially 100% solo). ✓ *(resolved June 2026)*
- **Ambient/chrome visual direction:** dark navy/slate base + glowing cyan circuit traces + scattered cyan squares (varied size/opacity for depth tiers) + warm amber accent nodes/junction dots. These drive **ambient layer, menu backgrounds, chrome bezel, playback glow only** — functional playfield tile palette is unchanged. ✓ *(resolved June 2026)*

- **Scoring:** SER percentage model (top = 100.00%), **rolling average** across rounds. NOT cumulative points, NOT inventory-weighted, NOT 100,000-point model. ✓
- **DNP scoring:** Cumulative Cluster Ceiling method — build theoretical best pipeline from per-node ceilings, measure each team's total against it. ✓
- **DNP live playback display:** raw accumulated ms counter (ticking live); final SER % only resolved on Diagnostic Summary after all teams' totals exist. ✓
- **DNP unallocated inventory warning:** pulsing orange warning if Captain advances with reserve remaining; warning only, does NOT block start. ✓
- **Score term:** System Efficiency Rating (SER), displayed as `XX.XX%`. Terminal output: `[SYS_STAT: SER 87.42%]` ✓
- **Checkpoint mechanic:** removed entirely (not in the original the owner loves). ✓
- **Inventory-drain penalty:** removed (inefficient block use is its own penalty). ✓
- **Inventory:** randomised per round, not grid-dependent, identical for all players. ✓
- **Honeypot terminology:** Native (converted from Bad Sectors during generation) vs Allocated (player-deployed from inventory). ✓
- **Honeypot cap:** 4 total (up to 2 Native + up to 2 Allocated). ✓
- **Honeypot slows do NOT stack/compound.** ✓
- **Bad Sector density:** scaling band 8–18% of tiles (not a flat count). Effective minimum = `max(density_floor, NATIVE_HONEYPOTS_setting + 2)` to guarantee honeypot conversion always has candidates. ✓
- **Map generation pipeline:** Bad Sectors → path validation gate → Native Honeypot conversion (upgrade/replace). Validation gates Bad Sectors, NOT conversion. ✓
- **Grid sizes:** 8/9/10 only (**9 default**, aligns with maze.game). 12/16 dropped for mobile. ✓
- **Simulation iterations:** 5/7/10 (5 default). ✓
- **Hardening window:** 45/60/90/120s (90s default). ✓
- **Turn = reward (adds delay/score), not penalty.** Light-redirect visual model. ✓
- **Two-stage logic:** build = validity check only; shortest-path computed at Commit only. ✓
- **Deterministic tie-break:** N/E/S/W neighbour order. ✓
- **Ingress/Egress:** random edges in Standard; pinned left/right in DNP only. ✓
- **Controls:** tap=Firewall, long-press=Honeypot (on empty) or upgrade (on Firewall), tap=remove (mobile); L-click/R-click (browser). Counters are passive, no tool toggle. ✓
- **Solo:** no special system — lobby of one, normal scoring, no PB tracking. ✓
- **Playback:** time-compressed, scrubber + skip, confirmation-gated advance. ✓
- **DNP default team names:** Amaze Inc. / Pender Securities. ✓
- **DNP huddle:** ALL players see both resources AND all bridged Node layouts; only Captain can allocate. ✓
- **DNP:** simultaneous relay + shared allocation pool + Captain; team SER via Cluster Ceiling; per-leg breakdown; camera transitions, no side-by-side. ✓
- **Build screen:** separated header / inventory strip / VM window / Commit zone; legend in `[?]`; no back button; preventive red-flash validity. ✓
- **Easter egg hit-box:** minimum 44×44px invisible touch target over `AMAZE_INC_v1.2` version string. ✓
- **Out of scope v1:** trap tiers, mid-run editing, random chaos modifiers. ✓
```

