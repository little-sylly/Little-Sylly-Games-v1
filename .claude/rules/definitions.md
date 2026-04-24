# Definitions & Naming Conventions — Little Sylly Games

## Variable Naming

| Scope | Pattern | Examples |
|-------|---------|---------|
| Global / engine | `camelCase`, no prefix | `isMuted`, `masterVolume`, `activeGameId`, `allScreens` |
| DSTW state | `camelCase` (short file, fewer collisions) | `currentWord`, `timeLeft`, `roundCount` |
| Great Minds state | `gm` prefix + `camelCase` | `gmPlayerNames`, `gmRound`, `gmCurrentPair` |
| Sylly Signals state | `ss` prefix + `camelCase` | `ssTokens`, `ssRound`, `ssVaultA` |
| Booleans | `is`/`has` prefix, or direct flag name | `isMuted`, `gmMemoryGuard`, `gmCustomWords` |
| Sets / Arrays | Pluralised camelCase | `allScreens`, `gmSessionGuesses`, `gmRoundLog` |
| Constants | `SCREAMING_SNAKE_CASE` | `GM_CATEGORIES`, `GM_MISMATCH_PHRASES` |

## Function Naming

| Pattern | Used for | Examples |
|---------|---------|---------|
| `play*()` | Audio (engine only) | `playSuccess`, `playBoing`, `playTick` |
| `show*()` | Screen / overlay visibility | `showScreen`, `openSoundOverlay` |
| `reset*()` | State teardown | `resetToLobby`, `resetToMenu` |
| `gm*()` | Great Minds functions | `gmBuildPool`, `gmLockIn`, `gmHandleMatch` |
| `ss*()` | Sylly Signals functions | `ssFuzzyMatch`, `ssNextRound` |
| `verb` + noun | General helpers | `getAudioCtx`, `flipEntry` |

## Internal Enum Strings
Stored as lowercase or kebab-case quoted strings — never numbers or booleans for named states.

```js
gmFrequencyRange:     'stable' | 'unstable' | 'chaotic'
gmResonanceTolerance: 'strict' | 'normal'
gmSyllyIntensity:     'sub-atomic' | 'supernova'
ssDifficultyLevel:    'standard' | 'wild' | 'wilder'
```

## Comment Style
```js
// ═══════════════════════════════════  ← file header (box outline)
// ── GM Settings ─────────────────────  ← section header (dashes + label)
// original 2 words — never mutated; contains check, entire game  ← inline rationale
// YAY! — description   ← positive inline (emoji prefix)
// NAY! — description   ← negative inline (emoji prefix)
// Depends on: engine.js (...), dstw.js (...)  ← dependency declaration at top of plugin
```

## Technical Project Terms

| Term | Meaning |
|------|---------|
| `nono_list` | The forbidden words in DSTW (deliberate name — not `taboo_list`) |
| `isSylly` | Derived at runtime as `difficulty === 3`; never stored in data |
| `activeGameId` | String set by plugin on entry; null when in lobby |
| Pill Button | Multi-choice setting UI: `.pill` (inactive) / `.pill-active-purple` (active) |
| Mind Meld | Great Minds: both players matched — win condition |
| Neural Link | Great Minds: victory state label shown on screen |
| Psychic Echoes | Great Minds: full round log table (# | Pair | P1 | P2) |
| Session Terminal | Great Minds: end-of-game decision modal (purge vs resume) |
| Signal Boost | Great Minds: turn-based hint mechanic from round 5 |
| Vault | Sylly Signals: each team's 4-word keyword set |
| Broadcast | Sylly Signals: the encrypted clue sent from Encoder to Interceptors |

## Data Schema: words.json
```json
{
  "id": "string (unique, e.g., 'animals-001')",
  "word": "string (target word)",
  "nono_list": ["array of 10 forbidden words"],
  "category": "string — one of 16 categories",
  "difficulty": 1
}
```
- 16 categories: `animals, food, places, objects, sports, nature, vehicles, jobs, activities, music, pop_culture, people, brands, emotions, actions, aussie_slang`
- Great Minds uses 10: excludes `vehicles, music, pop_culture, people, brands, aussie_slang`
- Difficulty 1 = Standard (concrete nouns), 2 = Wild (verbs/adjectives), 3 = Wilder (abstract)
- `isSylly` = `difficulty === 3` — derived, never stored
