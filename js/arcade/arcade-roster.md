# Little Sylly Arcade — Roster

**What this is:** the running list of every arcade cabinet, whether it's an idea, a brief, built in
the workshop, or live in the real game, plus every prefix that's already taken. It's a log, not a
how-to. How to design and build a cabinet lives in `arcade-cabinet-prompt.md`.

**Why it exists:** cabinets often get built in chats that can't see this folder or the live
codebase. This file is the one place that says what exists and where it's up to.

**How to use it:**
- **Starting a new cabinet in an offline chat:** paste `arcade-cabinet-prompt.md` first, then this
  file, then the idea or brief. The chat needs this file for the taken prefixes and to avoid
  repeating a genre or world.
- **Update it whenever a status changes:** a brief is written or a build chat hands off (add the row
  as **Built** and reserve the prefix in the same edit). Claude Code's `tools/add-cabinet.js` then flips
  the row to **Shipped**, gives it its number and adds the code-map row. Hand-off blocks live in each
  cabinet file's header comment, not here.

**Status key:** Idea → Brief → Built (workshop; not in the real game yet) → Shipped (in production,
with the SW version) · Parked.

**Numbering:** a cabinet gets its number when it ships, in shipping order. A built cabinet holds a
provisional number (marked `*`) that can still change.

---

## The cabinets

| # | Cabinet | File | Prefix | Genre (ancestor) | World | Status |
|---|---------|------|--------|------------------|-------|--------|
| 01 | ASHERPLANE | `asherplane.js` | `ap` | vertical shmup | its own (toy planes over a sea of islands) | Shipped (SW v249) |
| 02 | DEEP-SEA SWEEP | `minesweeper.js` | `ms` | Minesweeper | Deep-Sea Deploy (`dsd`) | Shipped (SW v249) |
| 03 | OTHER SIDE | `chicken.js` | `ck` | endless lane-hopper (Frogger / Crossy Road) | its own (the chicken crossing the road) | Shipped (SW v249) |
| 04 | CHOP SALAD | `slice.js` | `sl` | swipe-to-slice (Fruit Ninja) | Fruit Salad (`frt`) | Shipped (SW v249) |
| 05 | HAND IN THE COOKIE JAR | `cookiejar.js` | `hj` | hold-to-grab push-your-luck | Cookie Jar (`cjar`) | Shipped (SW v249) |
| 06 | STACKING ORDER | `stacking.js` | `sto` | Stack / Tower Bloxx | Pecking Order (`pko`) | Shipped (SW v249) |
| 07 | BEYOND THE BLUFF | `bluff.js` | `bb` | auto-hop climber (Doodle Jump) | The Bluff (`dyb`) | Shipped (SW v249) |
| 08 | COLD SHOT | `coldshot.js` | `csh` | slingshot target-clearing score chase, with waves and power-ups | Cold Shoulder (`cld`) | Shipped (SW v255) |
| 09 | TRACE ROUTE | `traceroute.js` | `trc` | Snake / Nibbles, with a new threat each Node and exploit power-ups | Net-Trace (`nt`) | Shipped (SW v255) |
| — | RUN IT UP | `runitup.js` | `riu` | TriPeaks / Golf solitaire | Pass (`pass`) | Brief: `briefs/C-runitup.md` |
| — | WALK-IN CLINIC | `walkin.js` | `wic` | Whack-a-Mole | Group Therapy (`gth`) | Brief: `briefs/D-walkinclinic.md` |
| — | FORTY WINKS | `fortywinks.js` | `fwk` | one-tap timing (Chrome dino) | Counting Sheep (`shp`) | Brief: `briefs/E-fortywinks.md` |
| — | Music game | — | — | rhythm | — | Parked |

### One-line summaries

- **ASHERPLANE**: drag to fly a chunky prop fighter with auto-fire through five skies, each ending in
  a boss. Parachute crates carry power-ups and a STAR CHAIN multiplier builds the score.
- **DEEP-SEA SWEEP**: a Minesweeper dive. Sea mines, marker buoys and a sonar PING; sweep a sector
  and dive 100 m deeper onto a bigger board. Three hull plates, and one new thing per sector (pearls,
  an air gauge, sonar charges, the reef, jammers), then the Trench.
- **OTHER SIDE**: "Why did the chicken cross the road?" An endless hop across traffic lanes. Cars
  honk, near misses squawk, Speed Demon lanes and Rush Hour arrive as you go.
- **CHOP SALAD**: swipe to slice fruit, never the broccoli. Each course is one salad (one of every
  fruit in the bowl, then a Fruit Frenzy), and each course wakes one Fruity Personality's quirk. A
  start-screen toggle swaps plain fruit for the Personalities' art.
- **HAND IN THE COOKIE JAR**: hold to reach in and grab cookies, and let go before a family member
  looks. Five visitors each have their own tell; a countdown to dinner that only brave escapes push back.
- **STACKING ORDER**: drop swinging animals onto a tower. PERFECT landings keep it straight (three in
  a row is a Feeding Frenzy), predator on prey earns a bonus, and high winds arrive at floor 15.
- **BEYOND THE BLUFF**: auto-hop up a sea cliff built from giant dice, where the pips are the holds.
  A ledge every 100 m, one new hazard per pitch (bluffs, slick holds, loaded dice, rockslides, the
  Tempest, snake eyes), two power-ups, and The Depths rising from below.
- **COLD SHOT**: you're the penguin in the Drink, snowballing smug penguins off a floe that sinks
  if too many pile on. It has waves of new penguin types (Sliders, Chonks, Frosties, Jumpies, conga
  lines), fish that bunch them up, and seagulls carrying timed power-ups (Double, Spread, Blizzard,
  Snowboulder).
- **TRACE ROUTE**: for once you're the breach. Swipe a signal through a live Net-Trace Node, grab
  Data Packets and slip out the Egress while the admin hardens the Node around you. Your trace
  carries over from Node to Node, so the run closes in. Each Node brings one new thing
  (Firewalls, Honeypots, a patrol Daemon, Exploit chips, LOCKDOWN, a Hunter Daemon), and the
  chips are timed power-ups (ROOTKIT, FREEZE, COMPRESS).

### Built, waiting to go into the real game

*Nothing waiting.* COLD SHOT and TRACE ROUTE shipped in SW v255; their decisions and balance notes live in
each file's header comment and in `briefs/A-coldshot.md` / `briefs/B-traceroute.md`.
Still open on both: a real-phone play-test (COLD SHOT's wave pacing and gull frequency).

---

## Which games have a cabinet

- **Have one:** Deep-Sea Deploy (`dsd`), Fruit Salad (`frt`), Cookie Jar (`cjar`), Pecking Order
  (`pko`), The Bluff (`dyb`), Cold Shoulder (`cld`), Net-Trace (`nt`).
- **Briefed:** Pass (`pass`), Group Therapy (`gth`), Counting Sheep (`shp`).
- **Not yet:** `li5` `gm` `ss` `jec` `ygi` `lttp` `nat` `bld` `flw` `comb`.

---

## Prefixes already taken

Everything in a cabinet is a global, so a new prefix must collide with **none** of these.

| Taken by | Prefixes |
|----------|----------|
| **Arcade cabinets** | `ap` `ms` `ck` `sl` `hj` `sto` `bb` `csh` `trc` |
| **Reserved by briefs** | `riu` `wic` `fwk` |
| **The 20 Sylly Games** | `li5` `gm` `ss` `jec` `ygi` `lttp` `nat` `dsd` `gth` `dyb` `bld` `pass` `nt` `frt` `shp` `flw` `pko` `cjar` `cld` `comb` |
| **Lobby / shared modules** | `lou` `tv` `lb` `lobby` `ach` `sb` `jbx` `ctl` `mp` `sm` |
| **Other reserved** | `rtr` `gon` `pas` `hsg` `fyfi` |

Sub-namespaces under your own prefix are fine (Chop Salad keeps its Fruity Personalities in
`SLC_*` / `slc*` beneath `sl`).
