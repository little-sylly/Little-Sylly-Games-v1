# Prompt: Generate words.json Entries
**Use with:** Gemini, ChatGPT, Claude, or any capable language model
**Output goes into:** `data/words.json`

---

## How to use this prompt

Copy everything below the line marked START PROMPT, paste it into your AI, and fill in the bracketed fields before sending.

---

<!-- START PROMPT -->

You are generating word entries for a party game word bank. Each entry is used by multiple games simultaneously, so every field has a specific purpose. Follow every rule exactly.

## What I need

Generate **[NUMBER]** entries for the **[CATEGORY]** category at **difficulty [1 / 2 / 3]**.

Categories available: animals, food, places, objects, sports, nature, vehicles, jobs, activities, music, pop_culture, people, brands, emotions, actions, aussie_slang

Difficulty guide:
- **1 (Standard):** Concrete, widely-known nouns. Easy to describe. E.g. Mountain, Pizza, Bicycle.
- **2 (Wild):** Verbs or specific adjectives. Harder to describe. E.g. Sparkling, Sprinting.
- **3 (Wilder):** Abstract concepts or tricky pairs. E.g. Nostalgia, Gravity.

## Output format

One JSON object per line — compact, no line breaks inside an entry. Use this exact schema:

```
{"id":"[category]-[NNN]","word":"[Word]","nono_list":["[slot0]","[slot1]","[slot2]","[slot3]","[slot4]","[slot5]","[slot6]","[slot7]","[slot8]","[slot9]"],"category":"[category]","difficulty":[1|2|3]}
```

The `nono_list` must always have exactly 10 strings. Every slot matters.

## nono_list rules — READ CAREFULLY

The nono_list serves two games at once:

**Slot 0 — The Broad Shield (animals category ONLY)**
For the animals category, slot 0 must be a Documentary Label: a natural-language common grouping as used in wildlife documentaries. E.g. "Sea Creature", "Furry Animal", "Ground Bird". NOT a scientific class name (not "Mammalia", "Aves"). For all other categories, slot 0 is just another associative forbidden word like slots 1–9.

**Slots 1–9 — Forbidden / Detail words**
Words a describer cannot say. Also used as individual clue words given to players in another game (Natural Selection) — each player receives exactly ONE of these words and must give a single-word clue based on it.

**Quality rules for slots 1–9:**
- **Distinctive:** Must clearly narrow down this specific word, not apply to dozens of similar things. "ivory" ✓, "big" ✗
- **Specific over vague:** When two words cover the same trait, keep the more specific. "purr" beats a second "fast".
- **Non-redundant:** No 3+ synonyms for the same trait in one list. Max 2 movement/speed words; fill remaining slots with different trait types (appearance, habitat, behaviour, sound, etc.).
- **Standalone:** Must work as a single spoken word or hyphenated compound. A player receives it cold and says it aloud. "duck-billed" ✓, prefer "eggs" over "lay eggs".
- **Widely understood:** No niche jargon. If a 15-year-old wouldn't recognise the word, replace it.

## Additional rules

- Australian English only: colour, flavour, organise, metre, °C, kg, km. No American spellings.
- No brands, trademarked terms, or people's names in the `word` field.
- The `word` itself must not appear in its own `nono_list`.
- For the animals category: if the Broad Shield (slot 0) covers more than roughly 15% of all possible animals, it is too broad. Use a narrower Documentary Label (e.g. "Bird" is too broad → use "Ground Bird", "Wading Bird", "Tropical Bird" instead).
- For Great Minds compatibility (if category is animals, food, places, objects, nature, sports, activities, emotions, jobs, or actions): avoid dead-end nono_list entries that make the game unplayable. Words should be associative, not obscure.

## Example — correct entry

```
{"id":"animals-001","word":"Elephant","nono_list":["Large Land Animal","trunk","ivory","savanna","herd","grey","wrinkled","trumpet","memory","Kenya"],"category":"animals","difficulty":1}
```

Note how slot 0 is a Documentary Label, slots 1–9 cover different trait types (body part, material, habitat, social, colour, texture, sound, trait, location), and none are redundant synonyms.

## Now generate [NUMBER] entries for category "[CATEGORY]" at difficulty [1/2/3].

Output only the JSON lines — no commentary, no numbering, no markdown fences.

<!-- END PROMPT -->

---

## Tips for best results

- **Batch size:** 5–10 entries per request gives the AI enough context to maintain quality without drifting.
- **Check slot 0 for animals:** AI models tend to reach for scientific class names (Mammalia, Aves). Reject these and ask for a Documentary Label instead.
- **Redundancy check:** AI often fills nono_list slots 5–9 with synonyms. Ask it to use different trait types if you see duplication.
- **Verify with Claude Code:** Paste generated entries into a conversation with Claude Code and ask it to run the nono_list dual-use quality check before committing to `words.json`.

## Pasting into words.json

The file uses one entry per line, one blank line between category groups. Do NOT use a JSON pretty-printer — it will corrupt the format. Claude Code has a Node.js script to append entries safely.
