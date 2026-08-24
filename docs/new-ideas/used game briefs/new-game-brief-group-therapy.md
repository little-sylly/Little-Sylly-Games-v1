# New Game Brief — Group Therapy
**Document type:** Phase 1 — Design Brief
**Version:** v0.5 — updated June 2026. Phase 30 active — technical spec written.
**Template:** Follows `new-game-brief-template.md`
**Status:** Phase 30 Active. Technical spec: `docs/new-game-tech-group-therapy.md`

> ✅ **Multiplayer: confirmed in production (Phase 29)**
> All 8 games are live with Firebase multiplayer as of Phase 29. The readyCheck matrix, finish-then-push writes, Firebase RTDB, individual device lobby, and room code patterns are all proven and stable. When writing the technical spec, reference BLD as the nearest comparable implementation — simultaneous individual-device input, finish-then-push draws, readyCheck matrix for phase transitions.

> ✅ **Drawing Module Dependency — resolved**
> `js/lib/canvas-draw.js` is specced and built as part of Phase 30. Group Therapy is the first consumer — the module is designed as shared infrastructure from day one. Technical spec §2 covers the full API.

> ✅ **Big Reveal control — confirmed**
> Host-controlled. Host taps "Next Case →" to advance each drawing in the reveal sequence. All devices advance simultaneously via `GTH_REVEAL_NEXT` SYNC broadcast. Rationale: gives the group time to react, laugh, and argue before moving on — the social payoff of the reveal.

---

## 1. Identity

| Field | Answer |
|-------|--------|
| **Full game name** | Group Therapy |
| **Short ID / abbreviation** | `gth` |
| **One-sentence tagline** | *"We've all got issues. Now draw them."* |
| **Thematic universe** | A chaotic therapy waiting room where everyone is a patient, everyone is also a therapist, and nobody is qualified. Warm, absurdist, self-aware. Emotionally honest but never dark — funny before it's clinical. |
| **Emoji / icon** | 🛋️ |
| **Brand colour** | **`#B1BCA0` — Muted Sage.** Dry, low-stakes, institutionally funny. Nails the sterile waiting-room atmosphere before the visual chaos of the drawings breaks out. Must be implemented as a **custom CSS variable `--color-gth-sage`** — not a Tailwind utility class, not a `pill-active-[colour]` reference. This keeps the custom value isolated and prevents it from cluttering the Tailwind setup. Flag in technical spec: add `--color-gth-sage: #B1BCA0;` to the `:root` block in `css/styles.css`. |

---

## 2. The Players

| Field | Answer |
|-------|--------|
| **Player count range** | 4–8 (minimum 4 — the pool needs enough drawings to make guessing interesting) |
| **Teams or individuals?** | Individuals — everyone competes for their own score |
| **Different roles?** | Two sequential roles: everyone is a **Patient** in Phase 1, everyone becomes a **Shrink** in Phase 2. No one is both simultaneously. |
| **Hidden information?** | Yes — assigned disorders are private per player in Phase 1. Drawing attribution is anonymous throughout Phase 2 until the Big Reveal. |
| **Minimum meaningful count** | 4. Below this the drawing pool is too thin. 5–6 is the sweet spot. |

### Roles

| Role | Phase | What they know | What they do | Goal |
|------|-------|---------------|--------------|------|
| **Patient** | Phase 1 | Their 3 assigned disorders + a definition + a drawable tip for each | Draw each disorder under a countdown (default 30s), one at a time | Produce drawings clear enough for Shrinks to diagnose |
| **Shrink** | Phase 2 | Nothing until a drawing appears on their screen | Work through a queue of other players' anonymous drawings — select Diagnostic Cards (standard) or type a diagnosis (Deep Dive / Hard Mode) | Correctly diagnose as many drawings as possible within the shared time window |

**Notes:**
Both phases are fully simultaneous — all players draw at the same time in Phase 1, all diagnose at the same time in Phase 2. No player is ever a passive observer mid-phase.

---

## 3. The Core Loop

**In one sentence:** Everyone privately sketches their assigned disorders under a countdown, then the drawings enter a shared anonymous pool that everyone races to diagnose before time runs out.

**The central tension:** Two different tensions in the same game. Phase 1: the 30-second clock while staring at "Existential Dread" trying to figure out what to draw. Phase 2: the dawning realisation that the scribble you confidently diagnosed as "Insomnia" was meant to be "Road Rage."

**Game type:** ☑ Creative / lateral thinking (drawing) + deduction (guessing)

### Full game flow, step by step:

**Setup**
1. Host confirms settings: disorders per patient, drawing time, diagnosis window, difficulty mix, Deep Dive (Hard Mode), Stroke or Genius (Sylly Mode). Players join via lobby.

**Phase 1 — The Patient Phase (all players simultaneously)**
2. Each player's device privately shows their first disorder: name, definition, and a drawable tip.
3. Player taps "Ready to Draw" — the countdown begins. All players draw simultaneously on their own canvas. Nobody can see anyone else's drawing.
4. On timer expiry (or early "Done" tap), the drawing locks and submits to the pool. The next disorder appears immediately.
5. Steps 2–4 repeat for each disorder (default 3). When a player finishes all 3, they see the Waiting Room screen with live progress.
6. Once all players have submitted all drawings, Phase 1 ends.

**Phase 2 — The Shrink Phase (all players simultaneously)**
7. Pool is shuffled. Each player's queue loads with drawings from other players only — never their own.
8. A shared countdown begins (default 90 seconds). All players work through their queue simultaneously.
9. Each drawing appears anonymously. Shrinks select from 4–6 Diagnostic Cards (standard), or in Hard Mode, type their diagnosis into a text field. Tapping a card or submitting text advances immediately — no result revealed until the Big Reveal.
10. Players cycle through as many drawings as possible before the timer expires.
11. If a player exhausts their queue before the timer, they see the **Case Report** screen — a live stats view showing room progress with waiting-room flavour copy. No re-dealing.
12. Shared timer expires — Phase 2 ends for everyone simultaneously.

**The Big Reveal**
13. All drawings revealed one by one. For each: real disorder name shown, artist named, correct Shrinks named. Attribution is hidden until this moment — the collective reveal is the social payoff.

**Game over**
14. Final leaderboard. Combined Patient + Shrink scores. Winner announced. Play-again confirmation modal.

**Phone handling:** Individual devices throughout. Multiplayer-only — no pass-the-phone mode.

---

## 4. Winning

| Field | Answer |
|-------|--------|
| **How does a game end?** | Phase 2 shared timer expires |
| **How is the winner determined?** | Highest combined Patient + Shrink score |
| **Ties possible?** | Yes — tiebreak by most correct Shrink diagnoses |
| **Session length** | 10–20 minutes. Patient Phase: ~2–3 min. Shrink Phase: 90–120 sec. Reveal: ~2 min. |

---

## 5. Scoring

Dual scoring rewards both drawing clarity and guessing skill. Neither role dominates.

| What happened | Who scores | Points | Notes |
|--------------|-----------|--------|-------|
| A Shrink correctly diagnoses your drawing | You (Patient/artist) | +2 | **Per-diagnosis model.** Awarded each time *any* Shrink correctly diagnoses your drawing. Clear drawings seen by 3 Shrinks = up to +6. Rewards communicative clarity proportionally. |
| You correctly diagnose a drawing | You (Shrink) | +2 | Base correct diagnosis |
| You correctly diagnose AND were the fastest Shrink for that drawing | You | +1 bonus | Speed bonus — one player per drawing only |
| You correctly diagnose a Tier 3 drawing | You | +1 bonus | Difficulty bonus, stacks with base +2 |
| Your drawing is never correctly diagnosed | Nobody | 0 | — |
| Timer expires before queue exhausted | No penalty | 0 | Undiagnosed drawings simply don't score |

**Balance note:** A player who draws clearly AND guesses well scores roughly twice as much as someone who only excels at one. The speed bonus rewards engagement without punishing slower guessers — additive, not multiplicative.

---

## 6. Settings

| Setting | What it changes | Options | Default |
|---------|----------------|---------|---------|
| **Disorders per Patient** | Drawings made in Phase 1 | 2 / 3 / 4 | 3 |
| **Drawing Time** | Seconds per disorder countdown | 20s / 30s / 45s | 30s |
| **Diagnosis Window** | Total seconds for Phase 2 | 60s / 90s / 120s | 90s |
| **Difficulty Mix** | Which tiers appear in the draw pool | Everyday only / Everyday + Phobias / All tiers | Everyday + Phobias |
| **Deep Dive (Hard Mode)** | Removes Diagnostic Cards — Shrinks must type their diagnosis | OFF / ON | OFF |
| ✨ **Sylly Mode — "Stroke or Genius"** | Adds canvas tremor (Phase 1) + blur clarification (Phase 2) | OFF / ON | OFF |

**Diagnosis Window note:** Display a plain-English recommendation alongside each option — e.g. *"90 seconds — enough to diagnose roughly half the pool in a 6-player game."*

**The brutal stack:** Deep Dive (Hard Mode) ON + Stroke or Genius ON = the artist has a Stroke (tremor), the Shrinks must be a Genius (blur), AND they have to type the diagnosis with no Diagnostic Cards. Fully intentional. Hilarious.

### Deep Dive (Hard Mode) — Implementation Notes

*These notes are for the technical spec author. The feature is confirmed for v1 but requires the following implementation steps:*

**1. Data schema prerequisite:** The `aliases[]` field in `data/gth-data.json` must be populated for every entry before Deep Dive is usable. This is included in the schema from day one (see §9) — content creators must fill it in during the initial content build pass.

**2. Input component:** When Deep Dive is ON, the Diagnostic Cards grid on the Case screen (`screen-gth-case`) is replaced with a text input field and a "Submit" button. The Diagnostic Cards component is shown/hidden based on the `gthDeepDive` setting state at Shrink Phase initialisation — not a separate screen.

**3. Matching logic:** On submission, the input string is normalised (`normaliseWord()` from `engine.js` — lowercase, trim, strip punctuation) and checked against:
- The entry's `name` field (normalised)
- Every string in the entry's `aliases[]` array (each normalised)
- A match on any of these = correct diagnosis

**4. No fuzzy matching in v1:** Exact normalised-string match only. "fear of spiders" matches `aliases: ["fear of spiders"]` — "spiders" alone does not. Fuzzy matching (Levenshtein distance etc.) is out of scope for v1 and would require a new utility function. Note this explicitly so Claude Code doesn't attempt to implement it.

**5. Keyboard handling:** On mobile, the text input triggers the soft keyboard, pushing the canvas area up. The layout must account for this — the drawing should scroll above the keyboard, not be obscured by it. Flag as a known mobile-keyboard layout issue for the technical spec.

---

## 7. Sylly Mode — "Stroke or Genius"

| Field | Answer |
|-------|--------|
| **Thematic name** | Stroke or Genius |
| **In one sentence** | The artist has a Stroke (tremor), the Shrinks need to be Geniuses (blur) — a perfectly paired torment for both sides. |
| **What changes** | Two simultaneous CSS effects: a gentle canvas tremor during Phase 1, and a blur-to-clear animation on each drawing during Phase 2. |
| **New screens?** | No — same screens with additional CSS effects layered on. Zero database schema changes. |
| **Changes scoring?** | No — same points, harder to earn them. |
| **Changes win condition?** | No. |

### Effect 1 — Patient Phase: The Stroke (Low-Frequency Canvas Tremor)

The drawing canvas container shifts by ±5px on a randomised CSS translation loop every 1.5 seconds. Mimics a hand shaking from caffeine overconsumption — slightly chaotic strokes, not violent enough to ruin the drawing. Intentionally tuned so the drawings remain legible but imperfect.

**Tuning values:** `±5px` max offset, `1.5s` loop interval. Implemented as CSS custom properties so they can be adjusted without touching logic.

**⚠️ Critical implementation note — canvas wrapper requirement (see §12):**
The ±5px CSS `transform: translate()` must be applied to a **wrapper `<div>` around the `<canvas>` element**, never to the `<canvas>` element itself. This is non-negotiable. If the transform is applied to `<canvas>` directly, pointer events register against the element's transformed visual position — stroke coordinates become offset from the canvas coordinate system, corrupting the delta-encoded data. The tremor is cosmetic only; the drawing data must be pixel-accurate.

### Effect 2 — Shrink Phase: The Genius Test (Rapid Blur Clarification)

When an anonymous drawing arrives on a Shrink's screen, it renders at `filter: blur(5px)`. The blur decays linearly to `blur(0px)` over exactly half of the average case viewing window — approximately 3–4 seconds at normal pace. Full clarity is available to anyone patient enough to wait.

**The risk/reward:** Shrinks who can read a shaky drawing through 5px of fog can guess immediately for the speed bonus. Slower Shrinks wait for clarity but risk losing the speed bonus to a faster guesser.

**Implementation:** CSS `transition` on `filter`, triggered by a vanilla JS timer when the drawing renders. Entirely client-side — zero Firebase involvement.

### The Stack

Deep Dive (Hard Mode) ON + Stroke or Genius ON simultaneously:
- Artist draws with a trembling canvas
- Shrinks receive blurry drawings
- Shrinks must type the diagnosis — no Diagnostic Cards

Intended, confirmed, and absolutely brutal.

---

## 8. Thematic Vocabulary

| Generic term | Group Therapy calls it |
|---|---|
| Phase 1 (drawing) | **The Patient Phase** |
| Phase 2 (guessing) | **The Shrink Phase** |
| A disorder prompt | **Your Issue** / **Your Disorder** |
| Drawing time countdown | **The Clock** |
| Waiting between phases | **The Waiting Room** |
| Queue exhausted — waiting | **Case Report** (live progress screen) |
| The pool of all drawings | **The Case Files** |
| A single drawing to diagnose | **A Case** |
| Multiple-choice options | **Diagnostic Cards** |
| Hard Mode text input setting | **Deep Dive** |
| Correct diagnosis | **Diagnosed ✓** |
| Wrong diagnosis | **Misdiagnosed ✗** |
| Score / points | **Sessions** (e.g. "14 Sessions") |
| Game over / results screen | **The Final Report** |
| Attribution reveal moment | **Case Files Unsealed** |
| Play again | **New Session** |
| Quit | **Walk Out?** |
| Settings overlay title | **Intake Form 📋** |
| How to Play overlay title | **The Disclaimer 🛋️** |
| Sylly Mode label | **✨ Stroke or Genius** |

---

## 9. Word Bank & Content

| Field | Answer |
|-------|--------|
| **Uses `words.json`?** | No — prompt structure requires fields not present in `words.json` |
| **New data file?** | Yes — `data/gth-data.json` |

### Data schema — one entry per disorder

```json
{
  "id": "gth-042",
  "name": "Arachnophobia",
  "display": "Arachnophobia",
  "definition": "An intense, irrational fear of spiders and other arachnids.",
  "tip": "Draw a huge spider looming over a tiny, terrified stick figure.",
  "tier": 2,
  "category": "phobia",
  "aliases": ["fear of spiders", "spider fear", "scared of spiders", "spider phobia"]
}
```

| Field | Purpose |
|-------|---------|
| `id` | Unique ID for deduplication and pool management |
| `name` | Canonical term shown at reveal and on Diagnostic Cards |
| `display` | What appears on the Patient's screen — may simplify long clinical names |
| `definition` | Plain-English explanation shown before drawing begins |
| `tip` | Drawable suggestion — always one concrete, visual element. The primary tone guardrail: steers artists toward absurdist visual metaphor, never clinical imagery |
| `tier` | `1` = Everyday Neuroses, `2` = Classic Phobias, `3` = Complex Conditions |
| `category` | Used for Diagnostic Card decoy selection — pulls thematically adjacent decoys |
| `aliases` | Accepted text inputs for Deep Dive (Hard Mode). Populated during initial content build even for v1 — schema is ready for the feature on day one |

### Content tiers

**Tier 1 — Everyday Neuroses (Easy, +0 difficulty bonus)**
Relatable, widely understood, drawable without specialist knowledge. Comedy-forward.
*Examples:* Insomnia, Road Rage, Caffeine Addiction, Workspace Anxiety, FOMO, Procrastination, Phone Addiction, Social Media Anxiety, Sunday Scaries, Imposter Syndrome (simplified).

**Tier 2 — Classic Phobias (Medium, +0 difficulty bonus)**
Named phobias with a strong visual element. Clinical name is the answer; definition and tip bridge the gap.
*Examples:* Arachnophobia (spiders), Acrophobia (heights), Claustrophobia (enclosed spaces), Trypophobia (patterns/holes), Nyctophobia (dark), Aquaphobia (water), Aviophobia (flying).

**Tier 3 — Complex Conditions (Hard, +1 difficulty bonus)**
Abstract, existential, or nuanced conditions. Harder to draw, higher reward. Warm and relatable — not a clinical DSM list.
*Examples:* Existential Dread, Déjà Vu, Dissociation, Hypochondria, Catastrophising, Intrusive Thoughts, Analysis Paralysis, Burnout.

### Content tone guardrails — the "Syllified" border

**Include:** Relatable everyday struggles, named phobias with clear visual metaphors, abstract concepts made funny by the drawing constraint.

**Exclude:** Personality disorders with stigma risk, trauma-adjacent content, anything requiring clinical sensitivity to handle correctly. If in doubt, cut it. The `tip` field steers every entry toward absurdism.

### Decoy selection logic

Diagnostic Cards pull 3–5 decoys from the same `tier` and `category` as the correct answer. Thematically adjacent, meaningfully competitive — not randomly off-theme. Decoy selection runs on the Host device and is included in the queue data written to each player's Firebase slot at Phase 2 start.

---

## 10. Multiplayer Classification

| Field | Answer |
|-------|--------|
| **Primary mode** | Individual devices throughout — multiplayer-only. No pass-the-phone mode. |
| **Private information** | (1) Assigned disorders in Phase 1. (2) Drawing attribution throughout Phase 2 — anonymous until Big Reveal. |
| **Simultaneous actions** | Yes — both phases. readyCheck matrix for Phase 1→2 transition (all drawings submitted). Shared timer for Phase 2 end. |
| **Locked devices** | Phase 1 finishers: Waiting Room (passive). Phase 2 queue-exhausted: Case Report (passive + live stats). |
| **Pass-the-phone fallback** | Not viable. Individual devices only. |

**Firebase data model sketch (for technical spec reference):**
- Phase 1 writes: each player writes to `/rooms/{code}/players/{idx}/drawings[]`. Delta-encoded strings, ~1–2 KB each. 6p × 3 disorders = ~36 KB total — well within RTDB limits.
- Queue assignment: Host builds queues after Phase 1 readyCheck fires. Writes to `/rooms/{code}/players/{idx}/queue[]` (drawing refs + decoy sets per entry).
- Phase 2 writes: player accumulates diagnoses locally, writes full array at timer expiry to `/rooms/{code}/players/{idx}/diagnoses[]`. Finish-then-push.
- Stroke or Genius effects: entirely client-side CSS. Zero Firebase involvement.

> 📋 **Technical spec note:** The simultaneous Phase 1 write pattern (all players writing ~6 KB of drawing data within seconds of each other) should be validated against RTDB concurrent-write behaviour during the technical spec. BLD's simultaneous submission pattern is the closest existing reference — check whether its Phase 1 write volume is comparable and whether any throttling was needed.

---

## 11. Screens — Plain English List

1. **Game menu** — title, tagline, The Disclaimer (how to play), Intake Form (settings), Stroke or Genius toggle, Back to the Box
2. **Lobby** — players join, ready states, host starts when all ready (standard multiplayer lobby — same pattern as all 8 live games)
3. **Disorder reveal** — each player privately sees their next disorder: name, definition, tip. Tap "Ready to Draw" to start clock.
4. **The Canvas** — drawing screen. Disorder name at top, countdown, drawing canvas. "Done" to submit early; timer auto-submits. In Stroke or Genius: wrapper div receives tremor CSS.
5. **Between disorders** — brief transition showing "Issue 2 of 3" + next disorder name and tip. Tap to start next countdown.
6. **The Waiting Room** — all drawings submitted, waiting for remaining players. Static therapy-room aesthetic, progress indicator, flavour copy. Passive.
7. **Shrink Phase intro** — brief simultaneous screen announcing Phase 2 and showing timer length. All players see this at once. Tap to enter.
8. **The Case** — main Shrink Phase screen. Anonymous drawing displayed. Standard: 4–6 Diagnostic Cards below. Hard Mode (Deep Dive ON): text input field + Submit button instead. In Stroke or Genius: blur-to-clear CSS animation starts on render. Tapping/submitting immediately advances. Shared timer visible.
9. **Case Report** — shown when queue exhausted before timer expires. Live progress stats ("3/6 Shrinks still reviewing case files"). Waiting-room flavour copy. No re-dealing.
10. **The Big Reveal** — drawings revealed one by one: disorder name, artist name, correct Shrinks shown. Attribution hidden until this screen.
11. **The Final Report** — game over leaderboard. Patient pts + Shrink pts = total. Winner named. "New Session" → confirmation modal.

---

## 12. Design Notes & Technical Flags

### Canvas wrapper — non-negotiable implementation requirement

The Stroke or Genius canvas tremor applies `transform: translate(±5px, ±5px)` on a 1.5s loop. This **must** be applied to a `<div>` wrapper around the `<canvas>` element, never to `<canvas>` itself.

**Why:** If the transform goes on `<canvas>`, the browser's pointer event coordinates register against the element's *transformed* visual position. The canvas internal coordinate system does not move — so every recorded stroke point is offset from where the user actually drew. The delta-encoded payload becomes corrupted. This produces drawings that render correctly locally but are shifted/wrong on all other devices.

**The fix is one line:** wrap `<canvas>` in `<div id="gth-canvas-wrapper">` and apply the tremor class to the wrapper. The pointer events hit the visual canvas position correctly, the canvas coordinate system is unaffected, and the stroke data is pixel-accurate.

Claude Code must confirm this implementation pattern explicitly in the technical spec before writing any canvas code.

### Custom CSS variable

`--color-gth-sage: #B1BCA0;` added to `:root` in `css/styles.css`. All game-branded colour references (progress indicators, pill selections, borders, highlights) use `var(--color-gth-sage)` — never the raw hex. This keeps the custom value isolated, easy to adjust, and consistent with the box's approach of using CSS variables for dynamic theming.

### Deep Dive mobile keyboard layout

When Hard Mode is ON and the text input receives focus on a mobile device, the soft keyboard pushes the viewport up. The Case screen layout must account for this — the drawing must remain visible above the keyboard, not obscured by it. This is a known mobile web layout challenge. Flag in technical spec as a required layout constraint: the drawing canvas area and the text input must both remain accessible when the keyboard is open.

### Queue balancing

6p × 3 disorders = 18 drawings. Minimum 2-queue coverage = 36 slots across 6 queues = 6 drawings per queue. At ~7s average, 6 drawings ≈ 42s under the 90s window — players will exhaust their queue. Adjust queue cap or coverage minimum based on playtesting. Algorithm runs on Host device after Phase 1 readyCheck.

### Waiting Room and Case Report as designed screens

Both idle screens must feel designed, not like loading spinners. Waiting Room: static therapy-room imagery, flavour copy ("Your case file has been submitted. A therapist will see you shortly."). Case Report: live Firebase-backed progress + flavour copy ("The consulting room is still busy."). Being stuck in the waiting room is part of the joke.

---

## 13. Confirmed Decisions — Full Record

| Decision | Answer |
|----------|--------|
| Patient scoring | Per-diagnosis — +2 each time any Shrink correctly diagnoses. Multiple Shrinks = multiple points. |
| Drawing attribution | Saved for Big Reveal only. No mid-Phase-2 micro-reveals. |
| Brand colour | `#B1BCA0` Muted Sage, custom CSS variable `--color-gth-sage`. |
| Queue exhaustion | Case Report screen — live progress + flavour copy. No re-dealing. |
| Sylly Mode name | **Stroke or Genius** |
| Sylly Mode mechanic | Canvas tremor (Phase 1) + blur clarification (Phase 2). Applied to wrapper div. |
| Deep Dive | Settings dial (Hard Mode) — not Sylly Mode. Stackable with Stroke or Genius. |
| Deep Dive matching | `normaliseWord()` + alias array check. Exact normalised match only in v1. No fuzzy matching. |
| Canvas wrapper | Mandatory — tremor on `<div>` wrapper, never on `<canvas>` element. |

**Out of scope for v1:**
- Canvas playback animation during Big Reveal (data supports it — v1.1)
- Drawing tools beyond single brush (colour picker, eraser, stroke width)
- Custom disorder entry by host
- Fuzzy/Levenshtein matching for Deep Dive
- Spectator mode
- Saving or sharing drawings post-game
- Any content with stigma risk, trauma-adjacent diagnoses, or clinical personality disorders

---

## 14. Mood & References

| Field | Answer |
|-------|--------|
| **Real-world games** | Telestrations, Drawful/Jackbox, Quiplash (simultaneous-input structure) |
| **Tone** | Warm, absurdist, self-aware. Nobody laughs at real anxieties — they laugh at the 30-second stick figure of Existential Dread that somehow looks like a potato staring at a clock. |
| **Should NOT feel like** | A clinical psychology exercise. Anything that requires mental health knowledge to play well. |
| **Shrinking connection** | Named as a nod to *Shrinking*. Warm-comedy-therapy tone is the shared DNA. No characters, no IP, no legal risk. |
| **Example UI copy** | "Your issues have been assigned." / "The clock starts when you're ready." / "The Case Files are in." / "3/6 patients still on the clock." / "Your diagnoses have been submitted." / "Case Files unsealed." |

---

## 15. Sample Round

**Setup:** 5 players — Mia (host), Jake, Sophie, Tom, Priya. 3 disorders each, 30s per drawing, 90s Shrink Phase, Everyday + Phobias, Stroke or Genius ON.

**Assigned disorders (private):**
- Mia: Insomnia / Arachnophobia / Road Rage
- Jake: Caffeine Addiction / Claustrophobia / FOMO
- Sophie: Workspace Anxiety / Acrophobia / Procrastination
- Tom: Social Anxiety / Nyctophobia / Phone Addiction
- Priya: Insomnia / Trypophobia / Sunday Scaries

---

**Phase 1 — The Patient Phase (Stroke or Genius active)**

All 5 devices show Disorder 1. Each player reads definition + tip, taps Ready. 30-second clock fires on all devices simultaneously.

*Mia (Insomnia):* Canvas wrapper begins its ±5px tremor. She draws a stick figure wide-eyed in bed, a 3am clock on the wall, sheep on fire above it. The tremor makes the sheep slightly wobbly. Submits with 4 seconds left.

*Jake (Caffeine Addiction):* Wild-haired figure clutching an enormous coffee cup. The tremor makes the steam lines look frantic — oddly thematic. Submits early.

*Tom (Social Anxiety):* Stares at the tip ("Draw a crowd of eyes all staring at one small figure") for 8 seconds. Starts drawing. Timer expires before he finishes the crowd. Auto-submitted.

After all 5 complete 3 disorders, Mia sees: *"Your case file has been submitted. Waiting for the other patients... 4/5 done."* Tom finishes last. Shrink Phase intro fires on all devices.

---

**Phase 2 — The Shrink Phase (blur clarification active)**

15 drawings in pool. Each player's queue: 6 drawings, none their own. 90-second shared timer.

**Mia's first two cases:**

*Case 1:* Drawing arrives at `blur(5px)`, immediately beginning to clear. Wild-haired figure strangling a coffee cup.
Cards: `FOMO` / `Caffeine Addiction` / `Workspace Anxiety` / `Phone Addiction`.
Mia doesn't wait for full clarity — taps **Caffeine Addiction** at 2 seconds. ✓ Correct + speed bonus.

*Case 2:* Blur clears to reveal a tiny figure on a cliff edge, arms flailing.
Cards: `Acrophobia` / `Claustrophobia` / `Aviophobia` / `Arachnophobia`.
Full clarity by decision time. **Acrophobia**. ✓ Correct.

*[Mia finishes 6 cases in ~55 seconds. Queue exhausted. Case Report: "You've submitted your diagnoses. 2/5 Shrinks still reviewing case files."]*

Timer expires. Big Reveal begins.

---

**The Big Reveal — Case Files Unsealed**

🛋️ *Jake's Caffeine Addiction:* 4 of 5 Shrinks correct. Jake: +8 Patient pts.

🛋️ *Tom's Social Anxiety:* A crowd of misshapen blobs with dot-eyes staring at a very small circle. 2 Shrinks correct, 3 chose "Workspace Anxiety."
*"Tom. Those are supposed to be eyes?"* / *"I was shaking!"*

🛋️ *Tom's Nyctophobia:* Just darkness. A completely black canvas with a tiny figure in one corner. 1 correct. 4 misdiagnosed.
*"That's kind of good actually."* / *"He drew the dark."* / *"...to be fair, that IS the dark."*

---

**The Final Report:**

| Player | Patient pts | Shrink pts | Total |
|--------|-------------|------------|-------|
| Mia | 12 | 15 | **27** |
| Jake | 16 | 11 | **27** |
| Sophie | 10 | 13 | **23** |
| Tom | 6 | 12 | **18** |
| Priya | 14 | 10 | **24** |

Tie: Mia vs Jake → correct Shrink diagnoses tiebreak. Jake: 5. Mia: 7. **Mia wins.**

---

*What this round illustrates: nobody waited. The Stroke or Genius tremor made Phase 1 chaotic-funny without corrupting the data. The blur created genuine risk/reward in Phase 2 — guess immediately through the fog for the speed bonus, or wait for clarity and risk losing it. Tom's all-black Nyctophobia was technically correct and completely useless. The gap between intent and execution is the whole game.*
