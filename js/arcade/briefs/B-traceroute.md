# Arcade Brief B — TRACE ROUTE (Net-Trace's world)

> **How to use:** paste `arcade-cabinet-prompt.md` first, then this brief. This brief answers Step 1
> of the prompt, so go straight to Step 2. The prompt's rules win any conflict; this brief owns the
> design.

| | |
|---|---|
| Title (`TRC_TITLE`) | TRACE ROUTE |
| id / file / screen | `traceroute` · `js/arcade/traceroute.js` · `screen-arcade-traceroute` |
| Prefix | `trc` / `TRC_` |
| Terminal label | TRACE ROUTE |
| Ancestor | Snake / Nibbles (grid snake with a level exit) |
| World | Net-Trace (`nt`, game 13) |
| Target run | 1.5–3 minutes, about 4–6 Nodes |

**Reserved by sibling briefs being built in parallel:** `csh riu wic fwk`. Don't take them.

---

## 1. Pitch

**For once, you're the breach.** In Net-Trace you build the maze that slows the signal. Here you *are*
the signal. You snake through a live node, grab Data Packets, and slip out the Egress before the
admin finishes hardening it around you. Your own trace gets longer with every packet, so it becomes
your biggest obstacle.

## 2. Why it belongs in Net-Trace's world

Net-Trace's whole fiction is a signal crawling a grid from Ingress to Egress through Firewalls,
Honeypots and Bad Sectors. TRACE ROUTE keeps every one of those pieces and just hands you the
signal. It also keeps Net-Trace's one hard rule: **the system can never seal the Egress off.**

---

## 3. The world: borrow exactly this

**Palette** (emerald on slate: this replaces the house CRT green):

```js
const TRC_BG      = '#0F172A',  // slate-900
      TRC_GRID    = '#1E293B',  // slate-800 grid dots / panel
      TRC_DIM     = '#64748B',  // slate-500 labels
      TRC_EMERALD = '#10B981',  // emerald-500, brand
      TRC_EM_DK   = '#059669',  // emerald-600, Firewall Segments
      TRC_EM_HI   = '#34D399',  // emerald-400, your trace glow
      TRC_HEAD    = '#E2E8F0',  // the signal head: white-hot
      TRC_VIOLET  = '#8B5CF6',  // native/system components: Honeypots
      TRC_SECTOR  = '#475569',  // Bad Sectors (hatched)
      TRC_PACKET  = '#FDE68A',  // Data Packets
      TRC_RED     = '#F87171';  // terminated / warnings
```

If the chat can see Net-Trace's Symbol Legend in the repo, match its Honeypot and Bad Sector glyphs.
Otherwise use the colours above.

**Type.** Monospace only. Headers read like real terminal output.

**Vocabulary:**

| Term | In this cabinet |
|---|---|
| **Node** | one level: a fresh grid |
| **Ingress / Egress** | where you enter / the exit port that opens once you've got the packets |
| **Firewall Segment** | a solid wall the admin drops while you play |
| **Honeypot** | a violet trap with a radius that slows you while you're in it |
| **Bad Sector** | fixed, unbuildable terrain baked into the node |
| **Hardening Window** | the node's countdown. When it hits zero the admin locks the node |
| **Trace** | you: the signal and the trail behind it |

**Voice.** Dry, procedural and confident. **It never breaks the terminal register and never addresses
the player in a chatty way.** No cartoon chrome. This is the suite's most "serious" world, and the
cabinet keeps that restraint while still being a kid-friendly snake.

**The easter egg.** Net-Trace's node identifier hides the hex for "maze" (`6D617A65`). Print it the
same way, unexplained: `SYS_INIT // 6D617A65 // NT-NODE-04`.

---

## 4. How it plays

### The grid

- **18 columns × 24 rows of 20 px cells** = a 360 × 480 play field at y = 96–576. The HUD sits
  above it and a status line below it.
- **Ingress** is on the left edge, mid-height (vary it per node). You start there heading right,
  trail length 4.
- **Bad Sectors:** seeded clusters of 2–5 cells. After placing them, run a **BFS check** that the
  Ingress can reach every packet spawn and every possible Egress cell. Reroll if it can't.

### Movement and input

- The trace moves **one cell per step** at `speed` cells/s (see the tuning table).
- **Swipe** (≥ 24 logical px) sets a direction. **Buffer up to 2 turns**, so a quick double-swipe
  makes a U-bend. A 180° reversal is ignored.
- Arrow keys and WASD as a desktop bonus.
- **Kind turn rule:** if a turn arrives within 90 ms *after* a step that would have crashed, apply it
  retroactively and don't crash. It's forgiving without feeling like cheating.

### The loop in a Node

1. Collect **Data Packets**, one on the grid at a time, spawned on a free cell reachable from your
   head. Each one grows the trace by **+2 cells**.
2. After `packets` collected, the **Egress opens** on a random edge cell: a pulsing emerald port with
   `EGRESS` printed beside it and a small arrow on the screen edge pointing to it.
3. Slide into the Egress: **NODE BREACHED** → bonus count-up → the node-identifier line → next Node.

### Hazards

- **Firewall Segments (the admin hardening live).** From Node 2, every `fwEvery` seconds the admin
  drops one 1–3-cell Firewall Segment.
  - It **flickers for 1.2 s** (dashed outline, two warning beeps) before it goes solid.
  - **It never lands within 4 cells ahead of your head on your current heading.**
  - **It never seals anything:** before committing a drop, BFS from your head to the current packet
    and to the Egress (or to every edge cell, if the Egress isn't open yet). If either becomes
    unreachable, pick another spot. This is Net-Trace's "can't seal the Egress" rule.
- **Honeypots (violet, native).** A ring with radius 1.5 cells. While your head is inside it you move
  at **half speed**. That's harmless in itself, but the Hardening Window keeps counting down. Show
  `HONEYPOT` in violet on the status line.
- **Crash:** hitting a wall, a Bad Sector, a solid Firewall or your own trace. **CONNECTION
  TERMINATED**: a red glitch flash, the trail shatters into pixels, you lose a Retry and **the Node
  restarts** (new packet sequence, timer reset, the same Bad Sectors).
- **Timeout:** the Hardening Window hits zero. **TRACE TIMEOUT**: the admin locks the node. You lose
  a Retry and the Node restarts.

### Retries

**3 Retries**, shown as `[■■■]` in the HUD. At 0: **SESSION TERMINATED** → the run is over.

---

## 5. Tuning table (starting values)

| Node | `speed` (cells/s) | `packets` | Hardening Window | `fwEvery` | Honeypots | Bad Sector clusters |
|---|---|---|---|---|---|---|
| 1 | 6 | 4 | 45 s | none (no admin) | 0 | 3 |
| 2 | 6.6 | 5 | 45 s | 6 s | 1 | 4 |
| 3 | 7.2 | 5 | 45 s | 5 s | 1 | 5 |
| 4 | 7.8 | 5 | 40 s | 4 s | 2 | 5 |
| 5+ | +0.6 per Node, max 12 | 6 | 40 s, min 30 | −0.5 s per Node, min 2.5 s | 2 | 6 |

**Node 1 has no admin at all.** It's pure snake, so a kid learns swipe-to-turn safely.

---

## 6. Scoring: data extracted, in KB

| Event | KB |
|---|---|
| Data Packet | `64 × node number` |
| Node breached | `+16 × whole seconds left` |
| **CLEAN TRACE** (Node breached without touching a Honeypot) | +128 |

The HUD shows `DATA: 1,344 KB`. The leaderboard heading is `// EXTRACTION LOG` and its rows read
`user:\ABC  …  1,344 KB`.

---

## 7. Screens and states

The prompt's state machine applies. Within `playing`: `boot` (Node start, 1.2 s) → `tracing` →
`breached` (count-up, 1.8 s) or `terminated` (1.2 s).

- **Attract: the boot log.** Type it out line by line on the game clock (fast; a tap skips to the
  end):
  ```
  BOOTING AMAZE INC. OS v1.2…
  INITIALISING OS…
  CONNECTING TO CLUSTER…
  ROUTING VIA PENDER SECURITIES…
  SECURING INGRESS…

  > ROLE REVERSED. YOU ARE THE BREACH.
  ```
  Then the title **TRACE ROUTE**, big. The button is **INITIALISE ▶**. Behind it, a demo trace
  snakes around a dim grid on its own.
- **HUD** (a VM-window strip at the top): `user:\breach` on the left; `NODE 03` and the countdown in
  the centre; `[■■■]` and `DATA: … KB` on the right. The status line below the grid reads
  `ROUTING: VALID` normally, `HONEYPOT` in violet while slowed, and `EGRESS OPEN ▸` once it opens.
- **Between Nodes:** `NODE BREACHED`, then the bonus count-up, then the identifier line
  `SYS_INIT // 6D617A65 // NT-NODE-0N`.

---

## 8. Art: draw it, don't load it

- **Grid:** faint slate dots at cell corners, with a 1 px emerald frame round the field.
- **Your trace:** a white-hot head cell with an emerald glow (`shadowBlur` about 8, or draw the glow
  yourself). The body fades from `TRC_EM_HI` to `TRC_EM_DK` along its length. Moving through cells
  leaves a faint 0.3 s afterimage.
- **Data Packets:** small yellow diamonds that pulse, with a 6-particle burst when collected.
- **Firewall Segments:** solid `TRC_EM_DK` blocks with a bright top edge and a slow scanline. While
  warning: a dashed outline that flickers.
- **Honeypots:** a violet ring with a soft fill and a slow rotating dash.
- **Bad Sectors:** slate blocks with diagonal hatching.
- **Egress:** an edge port with two emerald brackets that pulse open.
- **Crash:** a red glitch: the screen splits into 3 horizontal slices that offset for 150 ms, and the
  trail cells scatter as pixels.

---

## 9. Sound map (`TRC_SOUND`)

| Moment | Beeps |
|---|---|
| `select` | 660 |
| `highScore` | 1046 |
| `turn` | 440 (very short; skip it if it gets noisy) |
| `packet` | 988 |
| `egressOpen` | 523, 659, 784 |
| `fwWarn` | 1200, 1200 |
| `fwLand` | 330 |
| `honeypot` (on entry) | 220, 233 alternating twice |
| `tick` (last 5 s of the window, once per second) | 880 |
| `breached` (jingle) | 523, 784, 1046, 1318 |
| `terminated` | 147, 110, 82 |

---

## 10. Copy deck

```
TRACE ROUTE
> ROLE REVERSED. YOU ARE THE BREACH.
INITIALISE ▶
Swipe to route the signal.            ← attract hint, small

NODE 0N                               ← boot beat
ROUTING: VALID · HONEYPOT · EGRESS OPEN ▸
NODE BREACHED
CLEAN TRACE +128 KB
SYS_INIT // 6D617A65 // NT-NODE-0N
CONNECTION TERMINATED
TRACE TIMEOUT — NODE LOCKED
SESSION TERMINATED                    ← run over
// EXTRACTION LOG                     ← leaderboard
ENTER CALLSIGN                        ← name entry (3 initials)
REBOOT ▶  /  LOG OFF                  ← again / menu
```

---

## 11. Build order

1. Grid, trace movement, swipe with a 2-turn buffer, wall and self crashes. Pure snake in the bench.
2. Packets, growth, Egress opening, Node breached → next Node.
3. Bad Sector generation with the BFS reachability check.
4. Hardening Window timer, Retries, run over.
5. The admin's Firewall drops (warning, the not-ahead rule, the BFS never-seal rule), then Honeypots.
6. Scoring, HUD, boot-log attract, art and sound pass.
7. The leaderboard skin, then a full play-test of every state as the prompt requires.

## 12. Done when

- Node 1 is pure snake and a first-time kid clears it.
- A fast double-swipe U-turn works on a phone every time.
- In 20 runs, **no Firewall drop ever makes the packet or the Egress unreachable**, and none ever
  lands right in front of you.
- The terminal register never breaks: no exclamation-mark chatter and no emoji.
- The `6D617A65` line shows between Nodes and nothing explains it.
