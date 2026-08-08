# Consistent Word Expansion — data/words.json rules

**Read this (on-demand) when adding or editing words in `data/words.json`, or any pack manifest's
inline `words` array.** Moved out of `CLAUDE.md` (9 Aug 2026) so it stops loading into every
session — it applies only to content authoring. Schema itself: `definitions.md` § Data Schema.

## The rules
- **Vibe Check:** High-imagery, widely understood. No niche jargon.
- **Difficulty 1 (Standard):** Concrete nouns — e.g., Mountain, Pizza, Bicycle
- **Difficulty 2 (Wild):** Verbs or specific adjectives — e.g., Sparkling, Sprinting
- **Difficulty 3 (Wilder):** Abstract concepts or tricky pairs — e.g., Nostalgia, Gravity
- **Units:** Metric only (Australian audience)
- **Legal:** All words must be original. `nono_list` field name is deliberate (not `taboo_list`)
- **Great Minds curated categories:** `animals, food, places, objects, nature, sports, activities, emotions, jobs, actions` — no `pop_culture`, `brands`, or `aussie_slang` (dead-end pairs)

#### 🐾 Animals Category — Hierarchical nono_list Protocol
- **nono_list[0] (The Broad Shield):** Must be a Documentary Label — a natural-language Common Grouping (e.g., "Sea Creature", "Furry Animal", "Ground Bird"). NOT a scientific class (not "Mammalia", "Aves", etc.)
- **nono_list[1–9] (The Details):** Standard associative words — same rules as all other categories
- **Design Conflict Rule:** If a Broad Shield covers >15% of the animal bank, it is too broad. Split into narrower Documentary Labels (e.g., "Bird" → "Ground Bird", "Wading Bird", "Tropical Bird") to preserve game tension.
- **Bank size:** 100 animals as of Phase 20.

#### 🐾 nono_list Dual-Use Contract
The animals category is shared by both Like I'm Five and Natural Selection. Every slot serves a different role in each game:

| Slot | Like I'm Five | Natural Selection |
|------|--------------|-------------------|
| `nono_list[0]` | Broad Shield — the describer cannot hint at the animal's category | The Mole's Grouping — the only information The Mole receives |
| `nono_list[1–9]` | Forbidden words — the describer cannot say these | Field Researcher clues — each Researcher receives exactly ONE of these words and must give one clue based on it |

**nono_list[1–9] quality rules (for Natural Selection playability):**
- **Distinctive:** The word must clearly narrow down this specific animal (or a small group), not apply to dozens of animals. "ivory" ✓, "big" ✗
- **Non-redundant:** No 3+ synonyms for the same trait in one list. Cheetah had "fast", "run", "speed", "sprint" — a researcher assigned any one of those has a useless clue. Keep at most 2 movement/speed words; replace the rest with different trait types
- **Standalone:** Must work as a single spoken word or hyphenated compound. A researcher receives it cold and says it aloud to the group. "duck-billed" ✓, prefer "eggs" over "lay eggs"
- **Specific over vague:** When two words cover the same trait, keep the more specific one. "purr" beats a second "fast"; "acacia" beats "height" when "tall" is already present
