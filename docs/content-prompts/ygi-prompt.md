# Prompt: Generate You Get It? Prompts
**Use with:** Gemini, ChatGPT, Claude, or any capable language model
**Output goes into:** `data/ygi-data.json`

---

## How to use this prompt

Copy everything below the line marked START PROMPT, paste it into your AI, and fill in the bracketed field before sending.

---

<!-- START PROMPT -->

You are writing prompts for a party game called "You Get It?" Players see a fill-in-the-blank statement, then each writes their own number and a metric phrase to complete it. The group votes on the answer they relate to most. Think of it like a social version of a poll, where the funniest and most relatable answer wins.

## What I need

Generate **[NUMBER]** new prompt entries. Each entry needs a neutral fill-in-the-blank statement and 5 pre-written "ringer" answers that inject humour when Sylly Mode is on.

## Output format

One JSON object per line — compact format:

```
{"id":"ce-[NNN]","text":"[Prompt text with [ ] placeholder]","ringers":[{"number":[int],"metric":"[string]"},{"number":[int],"metric":"[string]"},{"number":[int],"metric":"[string]"},{"number":[int],"metric":"[string]"},{"number":[int],"metric":"[string]"}]}
```

The `id` should be sequential starting from where I tell you (I'll provide the next available number). Use format `ce-NNN` zero-padded to 3 digits.

## The prompt text rules

**Rule 1 — Modular Glue**
The text must use a connector that works with any unit: time, percentage, dollar amount, or a count of things. Gold-standard connectors:
- `…consists of [ ].`
- `…results in [ ].`
- `…is essentially [ ].`
- `…involves [ ].`
- `…lasts for [ ].`
- `…requires [ ].`

**Rule 2 — Straight Man only**
The prompt is the setup. The ringers are the punchlines. Strip out any jokes from the prompt itself. If the prompt is funny on its own, rewrite it as a flat statement.

Bad: `"Reading the news is enough to make me want to move to the bush."` (punchline in the prompt)
Good: `"My daily news intake usually lasts for [ ]."` (neutral — ringers deliver the funny)

**Rule 3 — Relatable situations**
Aim for universal experiences: morning routines, grocery shopping, group chats, overthinking, admin tasks, screens, eating habits. Avoid anything niche, political, or relationship-specific.

## The ringer rules

**Rule 4 — Taxonomy mix**
Every set of 5 ringers should cover a mix of these types. Don't write 5 of the same kind:

| Type | What it is | Example |
|------|-----------|---------|
| The Relatable Procrastinator | Absurd but recognisable delay | `12 months of a 'closing down' sale` |
| The Brutal Statistic | A cold precise number that stings | `0 percent chance of success if someone is watching` |
| The Escalating Time-Suck | Time lost in a spiral | `90 minutes of mindless scrolling` |
| The Sylly Visual | Specific absurd physical image | `3 escaped oranges rolling down the driveway` |
| The Financial Regret | Money spent on something silly | `47 dollars on a candle that smells like 'expensive dirt'` |

**Rule 5 — Tense test**
Read every ringer aloud as a complete sentence by inserting the number + metric into the prompt. It must parse. Common failures:
- `"contains 3 trips to the hardware store"` — number implies a container, metric describes a process. Doesn't work.
- Metric has embedded commas and extra numbers — these confuse the display. Keep metric as a single clean unit.
- Tense mismatch between prompt (present) and ringer (past).

**Rule 6 — No embedded numbers in metrics**
The `number` field is always a plain integer. The `metric` string should not contain additional numbers or commas creating sub-lists. Bad: `"0 kids at home, 2 annoyed grandparents, 1 quiet house"`. Good: `"0 actual tasks completed before falling asleep"`.

## Tone and language

- Australian English: colour, flavour, organise, °C, kg, km. No American spellings.
- Persona: the Intelligent Beginner — smart enough to know the math of the situation, silly enough to do it anyway.
- Local flavour where natural (Tim Tams, shopping centre, boot of the car, kerb) — never force it.
- Neutral if unsure. Don't try too hard.

## Example — correct entry

```
{"id":"ce-051","text":"My morning routine consists of exactly [ ].","ringers":[{"number":0,"metric":"minutes of anything I actually planned to do"},{"number":12,"metric":"snooze cycles that were definitely just 'resting my eyes'"},{"number":100,"metric":"percent chance the coffee is already cold"},{"number":1,"metric":"chaotic sprint that somehow gets me out the door on time"},{"number":47,"metric":"seconds of standing in front of the fridge achieving nothing"}]}
```

## Now generate [NUMBER] entries. Start IDs from ce-[NEXT_ID].

Output only the JSON lines. No commentary, no numbering, no markdown fences.

<!-- END PROMPT -->

---

## Tips for best results

- **Tell the AI the next available ID** before generating — check the last entry in `data/ygi-data.json` and add 1.
- **Read the ringers aloud** as full sentences before committing. This catches grammar failures the AI misses.
- **Taxonomy check:** AI tends to write 5 "time lost in a spiral" ringers. Push back and ask for variety.
- **Verify with Claude Code:** Paste entries in and ask for a tense test + taxonomy review before committing.

## Pasting into ygi-data.json

The file is a single JSON array. Append new entries inside the closing `]`. Claude Code can write a script to do this safely.
