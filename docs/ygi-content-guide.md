# You Get It? — Content Creation Guide

Reference this when writing new prompts or ringer sets for `data/ygi-data.json`.

---

## How a prompt works in the game

Players see the prompt with `[ ]` rendered as `________`. Each player types their own **number** and a **metric** (the "Fill the gap…" input). The group then ranks all answers from best to worst.

When Sylly Mode (The Ringer) is ON, one player silently receives a pre-written ringer answer from the `ringers[]` array instead of entering their own — injected as an anonymous ghost card in The Lineup.

---

## Rule 1 — The Modular Glue Rule

The prompt text must act as a universal connector. Avoid verbs that only work with one type of thing.

**Gold standard connectors:**
- `…consists of [ ].`
- `…results in [ ].`
- `…is essentially [ ].`
- `…is code for [ ].`
- `…involves [ ].`
- `…lasts for [ ].`
- `…requires [ ].`

**Why it matters:** These connectors allow a ringer to be `47 minutes` OR `0 percent` OR `1 brave soul` without breaking the grammar of the sentence. Read every ringer aloud as a full sentence — if one breaks, the glue word is the problem, not the ringer.

---

## Rule 2 — The Straight Man / Comedian Split

The prompt is the straight man. The ringer is the comedian.

**The Trap:** writing a prompt that already has the punchline baked in.
> ✗ `"Reading the news is enough to make me move to the bush."` — punchline is in the prompt.

**The Fix:** strip the prompt back to a flat, neutral setup.
> ✓ `"My daily news intake usually lasts for [ ]."` — the ringer delivers the funny.

**Test:** if the prompt is funny on its own, rewrite it as a flat statement.

---

## Rule 3 — The Ringer Taxonomy

Every set of 5 ringers should cover a mix of these types. Avoid 5-of-one-kind.

| Type | Description | Example |
|------|-------------|---------|
| The Relatable Procrastinator | Absurd but recognisable delay | `12 months of a 'closing down' sale` |
| The Brutal Statistic | A cold, precise number that stings | `0 percent chance of success if someone is watching` |
| The Escalating Time-Suck | Time lost in a spiral | `90 minutes of mindless scrolling` |
| The Sylly Visual | A specific, absurd physical image | `3 escaped oranges rolling down the driveway` |
| The Financial Regret | Money spent on something stupid | `47 dollars on a candle that smells like 'expensive dirt'` |

---

## Rule 4 — The Tense Test

Before finalising an entry, read every ringer aloud as a complete sentence.

> `"[Prompt text with ringer number + metric inserted]"`

**Common failures:**
- Number implies a container but metric describes a process: `"contains 3 trips to the hardware store"` — doesn't parse.
- Metric has embedded commas + numbers: `"0 kids at home, 2 annoyed grandparents, 1 quiet house"` — the game renders `0` + the metric as a unit; extra numbers inside the metric break the illusion.
- Tense mismatch: prompt is present tense, ringer is past tense.

**Fix for metric-with-commas:** collapse to a single clean unit. `"0 actual tasks completed before falling asleep"` rather than a run-on with extra numbers.

---

## Rule 5 — Local Flavour & Tone

The game has an Australian heart. Use specific, low-jargon cultural markers that feel authentic globally.

| Prefer | Avoid |
|--------|-------|
| `boot` | `trunk` |
| `shopping centre` | `mall` |
| `kerb` | `curb` |
| `lounge` | `living room` |
| `Tim Tams`, `Zooper Doopers`, `Icy Poles` | generic brand references |
| `°C`, `km`, `kg` | `°F`, `miles`, `lbs` |

**Persona:** the Intelligent Beginner — smart enough to know the math of the situation, silly enough to do it anyway.

**Tone constraint:** never force it. If an Australianism feels cringe or shoehorned, use neutral English.

---

## Data Format

```json
{
  "id": "ce-051",
  "text": "My morning routine consists of exactly [ ].",
  "ringers": [
    { "number": 0,   "metric": "minutes of anything I actually planned to do" },
    { "number": 12,  "metric": "snooze cycles that were definitely just 'resting my eyes'" },
    { "number": 100, "metric": "percent chance the coffee is already cold" },
    { "number": 1,   "metric": "chaotic sprint that somehow gets me out the door on time" },
    { "number": 47,  "metric": "seconds of standing in front of the fridge achieving nothing" }
  ]
}
```

**Rules:**
- `id` format: `ce-NNN` (sequential, 3-digit zero-padded)
- `text` must include exactly one `[ ]` placeholder
- `ringers` must have exactly 5 entries
- Each ringer: `number` is a plain integer, `metric` is a plain string (no embedded numbers, no commas creating sub-lists)
- No `category`, `difficulty`, or top-level `metric` field — these are not used

---

## Final Checklist

Before committing a new entry:

- [ ] **Neutral setup?** Is the prompt a flat statement with no built-in punchline?
- [ ] **Glue word?** Does the connector allow both time, %, $, and count ringers without breaking grammar?
- [ ] **Taxonomy mix?** Do the 5 ringers cover at least 3 different types from the table above?
- [ ] **Zero embedded numbers in metrics?** Each `metric` string should read as a single unit, not a list.
- [ ] **Tense test?** Read all 5 combinations aloud as full sentences. Do they flow?
- [ ] **Typo pass?** Check for double punctuation, `noone`, `uavailable`, `door-kob`-style slips.
- [ ] **Australian English?** Spelling and terminology match the house style.
