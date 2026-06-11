# Prompt: Generate Group Therapy Disorder Entries
**Use with:** Gemini, ChatGPT, Claude, or any capable language model
**Output goes into:** `data/gth-data.json`

---

## How to use this prompt

Copy everything below the line marked START PROMPT, paste it into your AI, and fill in the bracketed fields before sending.

---

<!-- START PROMPT -->

You are writing entries for a party game called "Group Therapy." Players are assigned psychological disorders and must draw them in 30 seconds. Other players then race to diagnose each other's anonymous scribbles. The game is warm and absurdist — it is NOT a psychology quiz. Every entry must be drawable by someone who cannot draw and guessable by someone who's never studied psychology.

## What I need

Generate **[NUMBER]** entries for **Difficulty [1 / 2 / 3]**.

Difficulty guide:
- **Difficulty 1 — Everyday Neuroses:** Relatable to anyone. No clinical knowledge needed. Easy to draw and guess. E.g. Insomnia, Road Rage, Procrastination.
- **Difficulty 2 — Classic Phobias:** Named phobias (usually ending in -phobia) with a strong single visual. The clinical name is the answer; the tip evokes it memorably. E.g. Arachnophobia, Acrophobia, Claustrophobia.
- **Difficulty 3 — Complex Conditions:** Abstract, existential, or nuanced. Harder to draw and guess. Higher reward. Still warm and funny — not clinical. E.g. Existential Dread, Déjà Vu, Burnout, Analysis Paralysis.

## Output format

One JSON object per line — compact format:

```
{"id":"gth-[NNN]","name":"[Name]","display":"[Display]","definition":"[One sentence]","tip":"[Evocative one-liner]","category":"[neurosis|phobia|condition]","difficulty":[1|2|3],"cluster":"[value]","aliases":["[alias1]","[alias2]","[alias3]"]}
```

Start IDs from gth-[NEXT_ID] (I'll tell you the next available number).

Omit the `cluster` field entirely if no tight subgroup applies — do not write `"cluster":""`.

## Field rules

**`name`** — The canonical answer shown at reveal. Title-case. Use the clinical name for phobias (e.g. "Arachnophobia"), a plain name for everyday conditions (e.g. "Road Rage").

**`display`** — What the patient sees on their screen before drawing. Usually identical to `name`. For impenetrable clinical terms, add a plain-English note: `"Trypophobia (hole patterns)"`.

**`definition`** — One sentence. Plain English. Warm and slightly absurdist — never clinical. The patient reads this to understand what they're drawing.

Bad: "A pervasive pattern of excessive anxiety and worry."
Good: "The nagging feeling that something is definitely about to go wrong, even when everything is completely fine."

**`tip`** — THE MOST IMPORTANT FIELD. One punchy sentence — occasionally two very short ones that work as a pair — that captures the defining irony, inconvenience, or emotional truth of the condition.

This is NOT a drawing instruction. It is an evocative tagline. The player reads it and finds their own visual. This is intentional — no two drawings should look identical.

Rules for the tip:
1. One sentence. Occasionally two short ones that work as a pair. Never a list.
2. Evocative, not instructional. Does NOT use the words "draw", "picture", "imagine", or "scene".
3. Wry distance — understatement, dry absurdism, and dark humour work well.
4. Specific enough that a reader immediately knows what to draw, without prescribing the exact image.
5. Short — aim for under 60 characters. If you need more words, the insight isn't sharp enough yet.
6. Never clinical. No medical settings, procedures, or anatomical references.

| Disorder | Prescriptive (old style — don't do this) | Evocative (correct style) |
|----------|------------------------------------------|--------------------------|
| Road Rage | "Draw a furious stick figure behind a wheel, lightning bolts shooting from their head, honking at a car that's just sitting there." | "The car does something to people." |
| Insomnia | "Draw a stick figure wide awake in bed, a clock showing 3am, and sheep bouncing off the ceiling." | "It's 3am again." |
| Procrastination | "Draw someone at a desk surrounded by 47 browser tabs and a coffee gone cold." | "Tomorrow is a perfect day for it." |
| Perfectionism | "Draw a stick figure erasing and redrawing the same circle over and over, frustrated." | "Nearly right is still wrong." |

**Test:** Can you immediately picture what to draw after reading this? Is it specific to THIS condition and not five others? Yes to both → good tip.

**`category`** — Choose the best fit: `neurosis`, `phobia`, or `condition`. This drives the base decoy pool on Diagnostic Cards.

| Category | What belongs here |
|----------|------------------|
| `neurosis` | Everyday anxieties, habits, and compulsions — no clinical diagnosis required |
| `phobia` | Named phobias (clinical -phobia suffix or equivalent) |
| `condition` | Clinical or neurological conditions, personality-adjacent, or complex syndromes |

When choosing between two categories, prefer the one that produces the most competitive wrong-answer decoys.

**`difficulty`** — Integer: 1, 2, or 3. Match the difficulty you were asked to generate.

**`cluster`** — Optional. A short lowercase label for a tight thematic subgroup (e.g. `"sleep"`, `"creatures"`, `"existential"`). When set, 2 of the 4 Diagnostic Card decoys will be pulled from the same cluster — making correct diagnosis harder. Omit this field if no natural tight grouping exists.

**Current clusters and their members:**
| Cluster | Members |
|---------|---------|
| `creatures` | Arachnophobia, Cynophobia, Entomophobia, Ophidiophobia |
| `environments` | Acrophobia, Aerophobia, Agoraphobia, Aquaphobia, Astrapophobia, Claustrophobia, Heliophobia, Megalophobia, Sciophobia, Submechanophobia, Thalassophobia |
| `existential` | Alice in Wonderland Syndrome, Amnesia, Capgras Delusion, Chronophobia, Cotard's Syndrome, Deja Vu, Depersonalisation, Dissociation, Existential Dread, Main Character Syndrome, Mandela Effect, Paris Syndrome, Phobophobia, Split Personality, Stendhal Syndrome, Synesthesia, Thanatophobia, Triskaidekaphobia, Truman Show Delusion |
| `impulses` | Bibliomania, Burnout, Buyer's Remorse, Caffeine Addiction, Compulsive Lying, Doomscrolling, Hanger, Impulse Shopping, Kleptomania, Procrastination, Road Rage, Workaholism |
| `loops` | ADHD, Analysis Paralysis, Brain Fog, Catastrophising, Cryptomnesia, Decision Fatigue, Earworm, Ghost Vibration Syndrome, Intrusive Thoughts, Misophonia, Nail Biting, Nomophobia, Notification Fatigue, OCD, Overthinking, Perfectionism, Superstition, Technophobia |
| `medical` | Emetophobia, Hemophobia, Hypochondria, Mysophobia, Trypanophobia, White Coat Syndrome |
| `sleep` | Alarm Dread, Insomnia, Narcolepsy, Nyctophobia, Seasonal Affective Disorder, Sleepwalking, Somniphobia, Sunday Scaries |
| `social` | Athazagoraphobia, Coulrophobia, Deipnophobia, Dunning-Kruger Effect, FOMO, Face Blindness, Gelotophobia, Glossophobia, Imposter Syndrome, People Pleasing, Social Hangover, Texting Anxiety |
| `transit` | Airport Mode, Amaxophobia, Commuter Amnesia, Escalaphobia, GPS Distrust, Hodophobia, Misplaced Keys Panic, Parallel Parking Anxiety, Phantom Destination Syndrome, Seat Guilt |

**`aliases`** — At least 3 accepted answers for the text-input (Deep Dive) mode. Write as lowercase strings representing what a non-clinician would type if they knew the answer but not the exact term.

Rules:
- Think like a guesser, not a textbook.
- "fear of spiders" ✓, "spiders" alone ✗ (too vague).
- Include the plain-English expansion of any clinical term.
- Do NOT include the `name` itself — the game already checks that first.

Example for Arachnophobia: `["fear of spiders", "spider fear", "scared of spiders", "spider phobia", "spider anxiety"]`

## Content guardrails

**Include:**
- Relatable everyday struggles anyone can relate to
- Named phobias with clear visual metaphors (fear, not cause)
- Abstract concepts made funny by the drawing constraint
- Things that make players laugh at themselves, not at a condition

**Exclude — hard rules:**
- Personality disorders with stigma risk (BPD, NPD, antisocial PD, etc.)
- Trauma-adjacent content — anything that could surface real pain at a party
- Anything requiring clinical sensitivity to handle correctly
- Disorders where the drawable tip would be disturbing rather than absurd
- Content that functions as a psychology quiz (naming DSM-5 criteria)

**Guardrail test:** If the tip would make someone in the room uncomfortable rather than amused, cut it. Err on the side of warmth.

## Existing entries (do not duplicate)

**Difficulty 1 — Everyday Neuroses (25):**
Alarm Dread, Bibliomania, Brain Fog, Buyer's Remorse, Caffeine Addiction, Decision Fatigue, Doomscrolling, Earworm, FOMO, GPS Distrust, Hanger, Hypochondria, Impulse Shopping, Misplaced Keys Panic, Nail Biting, Notification Fatigue, Parallel Parking Anxiety, Road Rage, Seat Guilt, Social Hangover, Sunday Scaries, Superstition, Texting Anxiety, White Coat Syndrome, Workaholism

**Difficulty 2 — Phobias + Conditions (42):**
ADHD, Acrophobia, Aerophobia, Agoraphobia, Amaxophobia, Aquaphobia, Arachnophobia, Astrapophobia, Claustrophobia, Coulrophobia, Cynophobia, Deipnophobia, Emetophobia, Entomophobia, Escalaphobia, Face Blindness, Ghost Vibration Syndrome, Glossophobia, Heliophobia, Hemophobia, Hodophobia, Insomnia, Megalophobia, Misophonia, Mysophobia, Nomophobia, Nyctophobia, OCD, Ophidiophobia, Overthinking, People Pleasing, Perfectionism, Procrastination, Sciophobia, Seasonal Affective Disorder, Somniphobia, Split Personality, Submechanophobia, Technophobia, Thalassophobia, Triskaidekaphobia, Trypanophobia

**Difficulty 3 — Complex Conditions (33):**
Airport Mode, Alice in Wonderland Syndrome, Amnesia, Analysis Paralysis, Athazagoraphobia, Burnout, Capgras Delusion, Catastrophising, Chronophobia, Commuter Amnesia, Compulsive Lying, Cotard's Syndrome, Cryptomnesia, Deja Vu, Depersonalisation, Dissociation, Dunning-Kruger Effect, Existential Dread, Gelotophobia, Imposter Syndrome, Intrusive Thoughts, Kleptomania, Main Character Syndrome, Mandela Effect, Narcolepsy, Paris Syndrome, Phantom Destination Syndrome, Phobophobia, Sleepwalking, Stendhal Syndrome, Synesthesia, Thanatophobia, Truman Show Delusion

## Now generate [NUMBER] Difficulty [1/2/3] entries. Start IDs from gth-[NEXT_ID].

**Note:** The bank is currently at 100 entries (gth-001 through gth-105, with gaps at gth-064/096/099/100/101 which were skipped). Next available ID is **gth-106**.

Output only the JSON lines. No commentary, no numbering, no markdown fences.

<!-- END PROMPT -->

---

## Tips for best results

- **Tell the AI the next available ID** before generating — check the last `gth-NNN` entry in `data/gth-data.json` and add 1.
- **The tip is the deliverable.** If the tip is a drawing instruction ("Draw a..."), reject the entry and ask for an evocative one-liner instead.
- **Guardrail check:** AI models often suggest entries that cross the stigma line (BPD, NPD, trauma-adjacent). Reject these.
- **Aliases check:** AI often writes only 2 aliases. Ask for at least 3 and make sure none are too vague.
- **Cluster check:** If a new entry belongs to an existing cluster, include the `cluster` field. If it would form a NEW cluster, only add it when 3+ entries share the same tight subgroup.
- **Verify with Claude Code:** Paste entries in and ask for a tip quality check + guardrail review before committing.

## Pasting into gth-data.json

Entries are ordered: Difficulty 1 → Difficulty 2 → Difficulty 3, then alphabetically within difficulty. The file is a single JSON array, one entry per line. Claude Code can write a script to insert entries in the correct position.
