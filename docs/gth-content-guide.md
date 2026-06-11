# Content Guide — Group Therapy (GTH)
**File:** `data/gth-data.json`
**Modelled on:** `docs/ygi-content-guide.md`

---

## Purpose

This guide defines what makes a good Group Therapy disorder entry and how to write one. Every entry in `gth-data.json` must be drawable in 30 seconds by someone who has never studied psychology.

The game is not a psychology quiz. It is a party game about the gap between what you intended to draw and what everyone else thinks it looks like. Content must serve that gap.

---

## Entry Schema

```json
{
  "id": "gth-001",
  "name": "Insomnia",
  "display": "Insomnia",
  "definition": "The inability to fall or stay asleep, usually at the worst possible time.",
  "tip": "Draw a stick figure wide awake in bed, a clock showing 3am, and sheep bouncing off the ceiling.",
  "category": "neurosis",
  "difficulty": 1,
  "cluster": "sleep",
  "aliases": ["cant sleep", "sleeplessness", "no sleep", "sleep deprivation"]
}
```

| Field | Purpose | Rule |
|-------|---------|------|
| `id` | Unique ID | Format: `gth-NNN` (zero-padded to 3 digits). Sequential. Never reuse. |
| `name` | Canonical answer | Shown at Big Reveal and in Diagnostic Cards. Title-case. |
| `display` | Patient-facing label | What appears on the disorder-reveal screen. Usually identical to `name`. Simplify if the clinical term is impenetrable (e.g. "Trypophobia" → "Trypophobia (hole patterns)"). |
| `definition` | Plain-English explanation | One sentence. The patient reads this before drawing. Warm and slightly absurdist — never clinical. |
| `tip` | Drawable suggestion | One concrete visual metaphor. Must be drawable as a stick figure or simple shapes in 30 seconds. This is the most important field — it defines what the drawing will look like and sets the tone. |
| `difficulty` | Difficulty tier | `1`, `2`, or `3` — see Tiers below. (Field was called `tier` in early drafts; the data file uses `difficulty`.) |
| `category` | Content grouping | Used for Diagnostic Card decoy selection — same-category items fill the base decoy pool. See Categories below. |
| `cluster` | Tight thematic grouping | **Optional.** A string label for a narrow subgroup within a category (e.g. `"sleep"`). When set, 2 of the 4 decoy cards are drawn from the same cluster — making correct diagnosis harder. Omit if no natural tight grouping exists for the entry. See Clusters below. |
| `aliases` | Deep Dive accepted answers | Comma-separated normalised-lowercase strings. At least 3 per entry. Populated from day one — the schema supports Deep Dive on launch. |

---

## Tiers

### Tier 1 — Everyday Neuroses

**Difficulty:** Easy  
**Difficulty bonus:** +0  
**Vibe:** Relatable to anyone. No specialist knowledge needed. Comedy-forward.

The artist draws it from their own life experience. The Shrink guesses it because they've felt it too.

**Good examples:** Insomnia, Road Rage, Caffeine Addiction, Procrastination, FOMO, Phone Addiction, Workspace Anxiety, Sunday Scaries, Social Media Anxiety, Imposter Syndrome (simplified).

**Test:** Could a 15-year-old draw this and have a 40-year-old correctly guess it? Yes → Tier 1.

---

### Tier 2 — Classic Phobias

**Difficulty:** Medium  
**Difficulty bonus:** +0  
**Vibe:** Named phobias with a strong, obvious visual element. The clinical name is the answer; the definition and tip bridge the gap.

The tip does the heavy lifting here. "Arachnophobia" is just "fear of spiders" with a better word — the tip makes it drawable.

**Good examples:** Arachnophobia (spiders), Acrophobia (heights), Claustrophobia (enclosed spaces), Trypophobia (patterns/holes), Nyctophobia (the dark), Aquaphobia (water), Aviophobia (flying), Ophidiophobia (snakes).

**Test:** Is there a single clear visual metaphor? Can you describe it in one tip sentence? Yes → Tier 2.

---

### Tier 3 — Complex Conditions

**Difficulty:** Hard  
**Difficulty bonus:** +1 per correct Shrink diagnosis  
**Vibe:** Abstract, existential, or nuanced. Harder to draw. Higher reward. Still warm and relatable — not clinical.

These entries live or die by the tip. "Existential Dread" is abstract; the tip turns it into a tiny stick figure looking at the universe and crying.

**Good examples:** Existential Dread, Déjà Vu, Dissociation, Hypochondria, Catastrophising, Intrusive Thoughts, Analysis Paralysis, Burnout, Imposter Syndrome (full), Hypervigilance.

**Test:** Does the tip provide a concrete, drawable visual? Is it still funny rather than clinical? Yes → Tier 3.

---

## Categories

Categories are used for Diagnostic Card decoy selection — the game pulls thematically adjacent wrong answers from the same category. Choose the category that best describes the entry's thematic home.

| Category | What belongs here | Example entries |
|----------|------------------|----------------|
| `everyday` | Relatable modern neuroses; no clinical label needed | Insomnia, Road Rage, FOMO |
| `phobia` | Named phobias (clinical "-phobia" suffix) | Arachnophobia, Acrophobia |
| `social` | Anxiety, shame, or performance in social contexts | Social Anxiety, Imposter Syndrome |
| `compulsive` | Repetitive, driven, or obsessive behaviours | OCD (simplified), Perfectionism |
| `existential` | Identity, meaning, or reality-bending themes | Existential Dread, Dissociation, Déjà Vu |
| `physical` | Anxiety expressed through body or health | Hypochondria, Somatic Anxiety |

> **Rule:** When choosing between two categories, prefer the one that would produce the most competitive Diagnostic Card decoys. A confused Shrink is funnier than a confident one.

---

## Clusters

**What clusters are for:** The `cluster` field marks entries that belong to a tight thematic subgroup within a category. When a disorder has a `cluster`, the decoy algorithm fills 2 of the 4 Diagnostic Card decoy slots from the same cluster — making those two wrong answers harder to rule out at a glance. This raises the difficulty of correct diagnosis without requiring a tier change.

**When to assign a cluster:**
- 3+ entries exist in the same narrow subgroup (fewer than 3 = the cluster can't fill 2 decoy slots reliably; don't create it yet)
- The subgroup members would be genuinely confusable with each other when drawn
- The entries aren't already well-separated by category

**When NOT to assign a cluster:**
- The only shared trait is loose/incidental (e.g. "both involve anxiety" — too broad)
- There are only 2 entries in the group — wait until a third is added
- The entries are from completely different categories — clusters should reinforce the existing category structure, not cut across it

**Current clusters:**

| Cluster value | Members | Count |
|---------------|---------|-------|
| `"creatures"` | Arachnophobia, Cynophobia, Entomophobia, Ophidiophobia | 4 |
| `"environments"` | Acrophobia, Aerophobia, Agoraphobia, Aquaphobia, Astrapophobia, Claustrophobia, Heliophobia, Megalophobia, Sciophobia, Submechanophobia, Thalassophobia | 11 |
| `"existential"` | Alice in Wonderland Syndrome, Amnesia, Capgras Delusion, Chronophobia, Cotard's Syndrome, Deja Vu, Depersonalisation, Dissociation, Existential Dread, Main Character Syndrome, Mandela Effect, Paris Syndrome, Phobophobia, Split Personality, Stendhal Syndrome, Synesthesia, Thanatophobia, Triskaidekaphobia, Truman Show Delusion | 19 |
| `"impulses"` | Bibliomania, Burnout, Buyer's Remorse, Caffeine Addiction, Compulsive Lying, Doomscrolling, Hanger, Impulse Shopping, Kleptomania, Procrastination, Road Rage, Workaholism | 12 |
| `"loops"` | ADHD, Analysis Paralysis, Brain Fog, Catastrophising, Cryptomnesia, Decision Fatigue, Earworm, Ghost Vibration Syndrome, Intrusive Thoughts, Misophonia, Nail Biting, Nomophobia, Notification Fatigue, OCD, Overthinking, Perfectionism, Superstition, Technophobia | 18 |
| `"medical"` | Emetophobia, Hemophobia, Hypochondria, Mysophobia, Trypanophobia, White Coat Syndrome | 6 |
| `"sleep"` | Alarm Dread, Insomnia, Narcolepsy, Nyctophobia, Seasonal Affective Disorder, Sleepwalking, Somniphobia, Sunday Scaries | 8 |
| `"social"` | Athazagoraphobia, Coulrophobia, Deipnophobia, Dunning-Kruger Effect, FOMO, Face Blindness, Gelotophobia, Glossophobia, Imposter Syndrome, People Pleasing, Social Hangover, Texting Anxiety | 12 |
| `"transit"` | Airport Mode, Amaxophobia, Commuter Amnesia, Escalaphobia, GPS Distrust, Hodophobia, Misplaced Keys Panic, Parallel Parking Anxiety, Phantom Destination Syndrome, Seat Guilt | 10 |

**Adding a new cluster:** Pick a concise lowercase label (e.g. `"appetite"`, `"memory"`, `"social-anxiety"`). Add `"cluster": "label"` to every member. Update this table.

---

## Writing the `tip` Field

The tip is the most important field. It determines what the drawing looks like. A bad tip produces unguessable scribbles; a good tip produces scribbles that are *almost* right, which is the whole game.

**Rules:**

1. **One concrete scene.** Not "draw something related to X" — draw the specific thing: "Draw a stick figure wide awake in bed, a 3am clock on the wall, and sheep bouncing off the ceiling."

2. **Stick figures and simple shapes only.** The tip must be achievable in 30 seconds by someone who cannot draw. No perspective, no realistic anatomy, no complex backgrounds.

3. **One strong visual metaphor.** Pick the most absurd or relatable visual element and lean into it. "Road Rage" → furious driver, speed lines, another car. Not a legal flowchart about aggressive driving.

4. **Steer toward absurdism.** The tip sets the tone. "Draw someone surrounded by giant clocks melting off the wall" (Procrastination) is funnier than "Draw someone sitting at a desk not working."

5. **Never clinical.** No medical imagery, no anatomical references, no clinical setting. A hospital bed is not funny. A tiny person buried under a mountain of worry bubbles is.

**Good tip template:** "Draw [a subject] [doing/experiencing something] [with one absurd visual detail]."

| Disorder | Bad tip | Good tip |
|----------|---------|---------|
| Road Rage | "Draw someone who is angry while driving." | "Draw a furious stick figure behind a wheel, lightning bolts shooting from their head, honking at a car that's just sitting there." |
| Procrastination | "Draw someone who is avoiding work." | "Draw someone sitting at a desk with a tiny to-do list, surrounded by 47 browser tabs and a cup of coffee that's gone cold." |
| Nyctophobia | "Draw the fear of the dark." | "Draw a tiny stick figure surrounded by total blackness, with only their wide-open eyes visible." |

---

## Writing `aliases`

Aliases are the accepted Deep Dive answers. They are normalised at match time (`normaliseWord()` — lowercase, trim, plural stemming). Write them as lowercase strings representing what a reasonable person might type.

**Rules:**

1. **At least 3 per entry.** Cover the most obvious paraphrases.
2. **Think like a guesser, not a clinician.** What would someone type if they knew what the disorder was but not the technical name?
3. **No fuzzy entries.** "spiders" alone is not an alias for Arachnophobia — a player must type enough to be clearly correct. "fear of spiders" ✓, "spiders" ✗.
4. **Include the plain-English expansion.** The clinical term is the `name`; the alias should cover how a non-clinician would say it.
5. **Do NOT include the `name` itself** as an alias — the engine already checks `name` first.

**Example — Arachnophobia:**
```json
"aliases": ["fear of spiders", "spider fear", "scared of spiders", "spider phobia", "spider anxiety"]
```

**Example — Procrastination:**
```json
"aliases": ["putting things off", "avoiding work", "delaying", "leaving things to the last minute"]
```

---

## Tone Guardrails — The "Syllified" Border

**Include:**
- Relatable everyday struggles, universally understood without clinical knowledge
- Named phobias with clear visual metaphors — the fear, not the cause
- Abstract concepts made funny by the drawing constraint
- Anything that makes the player laugh *at themselves*, not *at a condition*

**Exclude:**
- Personality disorders with stigma risk (BPD, NPD, etc.)
- Trauma-adjacent content — anything that could surface real pain in a party context
- Anything requiring clinical sensitivity to handle correctly
- Disorders where the "drawable tip" would be disturbing rather than absurd
- Content that functions as a quiz ("name this DSM-5 criterion")

**The guardrail test:** If the tip would make someone in the room uncomfortable rather than amused, cut the entry. Err on the side of warmth.

---

## Content Minimum (v1 Launch)

**Required before testing begins: 15 entries per tier = 45 total minimum.**

Recommended target for launch: 20 per tier = 60 total. This gives the pool enough variety for multiple sessions without repetition.

### Starter bank (confirmed entries from the brief)

**Tier 1 — Everyday Neuroses:**
Insomnia, Road Rage, Caffeine Addiction, Workspace Anxiety, FOMO, Procrastination, Phone Addiction, Social Media Anxiety, Sunday Scaries, Imposter Syndrome (simplified)

**Tier 2 — Classic Phobias:**
Arachnophobia, Acrophobia, Claustrophobia, Trypophobia, Nyctophobia, Aquaphobia, Aviophobia

**Tier 3 — Complex Conditions:**
Existential Dread, Déjà Vu, Dissociation, Hypochondria, Catastrophising, Intrusive Thoughts, Analysis Paralysis, Burnout

**Status:** 10 + 7 + 8 = 25 entries confirmed. Need at least 5 more per tier (20 more total) before v1 testing.

---

## File Format

One entry per line. Single JSON array. No blank lines between entries.

```json
[
{"id":"gth-001","name":"Insomnia","display":"Insomnia","definition":"...","tip":"...","tier":1,"category":"everyday","aliases":["..."]},
{"id":"gth-002","name":"Road Rage","display":"Road Rage","definition":"...","tip":"...","tier":1,"category":"everyday","aliases":["..."]}
]
```

Entries are ordered by tier (1 → 2 → 3), then alphabetically within tier. When adding entries, maintain this order.

ID numbering: `gth-001` through `gth-NNN`, sequential, no gaps. If an entry is removed, do not reuse its ID.
