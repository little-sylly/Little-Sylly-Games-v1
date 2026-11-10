# G — WAVELINK (v3 of TUNE IN)

**Cabinet:** WAVELINK · `arcade/wavelink.js` · prefix `syn` (kept) · Great Minds (`gm`) · accent #8B5CF6
**Status:** Built (workshop). Not in the real game yet. v2 stays beside it: `arcade/tunein.js`,
`arcade/tunein-bench.html`, `briefs/G-tunein-v2.md` are untouched.
**Bench:** `arcade/wavelink-bench.html` (stand-in shell; screen `screen-arcade-wavelink`).

Order of work, as Sam asked: balance first, then the rename, then visuals and energy.
Gameplay is unchanged from v2.

---

## 1. Balance pass

Goal: shorter runs, smoother early ramp. Everything lives in `SYN_TUNE` (v2 values in comments) plus
smooth curves in `synParams(r)`.

| Dial | v2 | v3 |
|------|----|----|
| Link time | 5 s | 4 s |
| Start signal | 70 | 60 |
| Recover (core) | 6 | 3 |
| Halo drain | 0 | 4 |
| Off drain | 16 | 20 |
| Grace | 0.25 s | 0.15 s |
| Link bonus | 20 | 7 |
| First hazard lands | 3 s | 2 s |
| Bleed from round | 20 | 4 |
| `bleedSlope` (the one dial) | 0.45 | 0.13 |
| Shuffle from round | 11 | 9 |

Curves: look-ahead = 3.3 x 0.955^(r-1), floor 1.2 s; core = max(8.5, 16 - 0.5(r-1));
halo = max(core + 7.5, 34 - 0.9(r-1)). Unlocks: Boost r2, leaps r3, fog r5, saw/noise r7, storm r9.
Mediocre play now loses signal from Link 1, so the run can no longer be coasted.

**Bots** (the cabinet's own sim run headless in a Node vm; 60 runs each, final build):

| Profile | v3 mean run | v2 notes | Rounds mean / max |
|---------|-------------|----------|-------------------|
| kid | 57 s | ~2.6 min | 8.6 / 12 |
| teen | 80 s | ~4 min | 12.8 / 15 |
| pro | 174 s | ~4.5 min | 30.6 / 38 |
| kid (human: lapses, growing wobble) | 53 s | | 8.0 / 11 |
| pro (human) | 169 s | | 29.6 / 36 |

Time in core / halo / off: kid 49/29/22 %, teen 54/25/21 %, pro 64/21/15 %.
Fairness audit: 0 violations over 19,432 hazards (hazard gap, first-hazard grace, fog near hazard,
spark near hazard, look-ahead floor). Per-edge difference in the wave: 0.0 %.

## 2. Rename

TUNE IN became **WAVELINK**. Sam wanted "wavelength" (great minds think alike, same wavelength);
Wavelink keeps that pun, is one word, and says what you do (hold the link). The code prefix `syn`
and the Neural Link term stay. The attract dish boot line still reads "Finding Wavelength" as a nod.
Renamed: file, screen id (`screen-arcade-wavelink`), teardown (`resetArcadeWavelink()`), title card.

## 3. Visuals and energy

The four reference images were inspiration only; palette and identity are ours (violet signal,
green bead, Great Minds colours plus magenta, pink, mint, teal, gold, ice).

- **Signal ribbon:** smoothed Path2D ribbons, halo and core bands, three braided strands, soft bloom,
  hairline, dotted future outline, hot spot at the bead. Beat pulse at 2.5 Hz.
- **Energy (one `synCharge` 0..1)** builds with held sync and streak and drives: braided strands, orbiting
  sparks on the bead, energy packets running up the ribbon, star speed-lines, aurora pools, bloom,
  HUD shake and glitch dashes. This is the "effects scale with Link duration" item from the v3 feedback.
- **Status bar:** neon capsule with slanted cells, glitch dashes and a tell mark at 75 %.
- **Thumb strip:** neon rail with charge fill, partner marker, speed streak, handle pill, end caps.
- **Desync (edge turn):** 0.75 s with an overshoot ease, stars rotating with the scope, zoom lurch,
  RGB split and tear, Psychic Echo ghost afterimages, dial arc.
- **Per power-up:** RESONANT = spreading ripples and a swelled halo. HIGH FIDELITY = gold gem,
  counter-rotating diamonds, gold tint. ENTANGLED = finger-ghost tied to the bead by a rope of light.
  Each has its own audio motif.
- **Per interference:** Mental Fog = snow plus vapour with cue beeps. Neural Storm = lightning from the
  screen sides and arcs off the bead. Leap = ice-blue gate lines. Snap = pink gate lines.
- **Post chain:** bloom (1/5-size additive copy), boost tint, danger pulse, flash, tear.

Dial-back candidates if it is too much on a real phone: bloom alpha, hot-core strength, star lines,
braided strands (all noted in `wl-2-draw` tone-downs; already toned down once after the ribbon
blew out to white at high charge).

## 4. Cabinet contract checks

Wordless, no assets or libraries, pixel budget 1.4e6 (nine viewports from 320x568 to 2560x1440 pass,
max 1,398,799), no scrollbars, full band sweep, core at least 12.8 CSS px, no `setTimeout`, engine calls
limited to `showScreen` / `resetToLobby` / `playSecretBeep` / `arcExitCabinet`.
`synLowFx` degrade rule: found not tripping under 12x CPU throttle (the frame-time guard ignored slow
frames). Fixed: average now follows frames up to 250 ms and only a gap over 1 s (tab-away) is ignored.
Retested: trips at avg 117 ms.

## 4b. v3.1 polish (Sam's notes, 2026-11-08)

1. **Supplementary waves.** 3 to 7 thin fluctuating filaments play around the matched signal (converging at the
   bead, as in the references). Strength = `synMatch` (core, smoothed) x `synAura` (unbroken Link: streak time,
   0..1): the longer the unbroken Link, the bigger, faster and wilder they get. Visual only and clipped to the
   scope; the halo and core bands are unchanged. The main ribbon is also thicker.
2. **Static interference.** Mental Fog is about twice as long (1.7 to 2.7 s; it rides on a longer sine), shows
   two decoy traces inside the bank, fills the whole screen with static while NOW is inside it, and hits on
   entry and exit. Neural Storm gets a surge every 2.6 to 4.4 s: white-out, a blink of dark, three bolts, a rumble.
3. **Tips and flash.** First-sight tips (once per RUN: every new run clears the list, so they return after a pass or a break; with a pictogram) fire when each element first
   appears on the scope: spark, each Boost kind on pickup, Leap, Phase Slip, Fog, Storm, gold zone, low signal,
   the turn tell. Boost pickups have per-kind bursts (RESONANT shockwave rings, HIGH FIDELITY lens flare and
   gold rain, ENTANGLED collapse then lightning) with a tinted screen flash; Leap and Phase Slip landings send
   shockwave lines up the scope; the gate lines glow harder as they near.
4. **Face removed.** The transmitter is now a lock-on core: a 24-segment ring meter plus a live wave glyph
   (clean when locked, torn when not) driven by `synLock`, a continuous smoothed value, so it glides instead of
   flipping between three moods.
5. **Out-of-sync screen** has a CONTINUE button (and Enter/Space) that goes on to the high score or board.
   An early tap fast-forwards to the stats. Nothing auto-advances (40 s safety net only).

Retest after v3.1: bots kid ~58 s, teen ~80 s, pro ~171 s (fog is longer, so pro is a few seconds shorter);
fairness 0 violations over 20,397 hazards; nine viewports pass; the low-performance fallback trips under throttle.

## 5. Open

- Real-phone play-test: left-edge thumb comfort, iPad travel cap, whether skilled humans outlast the bots,
  and whether the visuals need dialling back on low-end phones.
- `SYN_TUNE.bleedSlope` (0.13) is the one dial if runs feel too short or long.
- The wave filaments at full wildness are busy by design ("go all out, dial back later"); the dials are `wm` and `nW` in the wave block of `synDrawScope`.
- Tips now repeat on every new run (Sam's call, because of passing the phone around and breaks). If they ever feel naggy for experts, the cheapest change is to show each tip only on the first two runs of a session.
