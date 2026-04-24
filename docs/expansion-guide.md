# Expansion Pack Guide — Little Sylly Games Secret Mode
**Last updated:** April 2026 | **Architecture:** Global proxy pattern (push model)

> Adding a new expansion requires **4 steps and no plugin patches**.
> The proxy architecture handles all 3 games automatically.

---

## How the System Works (read once, never again)

At Terminal launch, `secret-mode.js`:
1. Fetches the expansion word bank JSON into the global `secretWords[]`
2. Sets `isSecretMode = true` and `activeExpansion = '<id>'`
3. Writes `window.activeExpansionOverrides = { ...forced settings... }`

Each game plugin reads these at its own settings-apply point:
- **LI5:** `applyExpansionOverrides()` in `startGame()`; uses `secretWords` as word pool
- **SS:** overrides + `ssCustomiseVault = false` in `ssConfirmPlayers()`; uses `secretWords` in vault build
- **GM:** `gmApplyExpansionOverrides()` on Round 1; `gmGetWordPool()` returns `secretWords` from Round 2+; Vocabulary Lock + Too Easy guard active Round 2+

**No plugin file changes are needed for new expansions.**

---

## Step 1 — Create the word bank JSON

File: `data/secret_words_[name].json`

Follow the exact same schema as `data/words.json`:

```json
[
  {
    "id":        "unique-string (e.g. 'starwars-001')",
    "word":      "Target Word",
    "nono_list": ["10", "forbidden", "hint", "words", "that", "give", "it", "away", "instantly", "here"],
    "category":  "expansion-specific-category",
    "difficulty": 1
  }
]
```

### Word bank rules
| Rule | Detail |
|------|--------|
| Minimum size | **30+ entries** — GM Vocabulary Lock requires enough words for viable clues |
| nono_list | Exactly 10 items — words that immediately give away the target |
| difficulty | 1 = common term, 2 = moderately niche, 3 = very niche/abstract |
| category | Expansion-specific strings (e.g. `heroes`, `items`, `mechanics`) — **not** the standard 16 |
| id | Unique within the file; format `[theme]-[NNN]` (e.g. `starwars-001`) |
| Australian English | All copy, including nono_list items |

### GM Vocabulary Lock reminder
Players must use words from this bank as their clues in Round 2+. Design the bank so there are **viable clue options** — don't make every word too niche to use as a clue for something else.

---

## Step 2 — Add the expansion to `SM_TERMINAL_CONFIG` in `js/secret-mode.js`

```js
// In SM_TERMINAL_CONFIG.expansions array:
{ id: 'starwars', label: 'STAR WARS', locked: false, file: 'data/secret_words_starwars.json' },
```

That's it. The Terminal UI renders this automatically.

---

## Step 3 — Add forced settings to `SM_EXPANSION_OVERRIDES` in `js/secret-mode.js`

```js
// In SM_EXPANSION_OVERRIDES object:
starwars: {
  // LI5 (dstw.js variable names)
  settingTimer:       60,
  settingRounds:      5,
  settingTabooCount:  10,
  settingPenaltyMode: 'points',
  settingSkipFree:    false,
  settingSylly:       true,
  settingSyllyPct:    40,
  // GM (great-minds.js variable names)
  gmFrequencyRange:     'chaotic',
  gmMemoryGuard:        true,
  gmResonanceTolerance: 'normal',
  gmInfiniteResync:     true,
  gmSignalBoost:        false,
  gmSyllyIntensity:     'sub-atomic',
  // SS (sylly-signals.js variable names)
  ssDifficultyLevel:        3,
  ssSettingInterceptsToWin: 2,
  ssRerollLimitSetting:     Infinity,
  ssIntelSyllyMode:         true,
},
```

Adjust any values to suit the expansion's balance. All keys are optional — omitting a key leaves that setting at whatever the player had set.

---

## Step 4 — Add to SW precache and bump version in `sw.js`

```js
// 1. Add the new file to PRECACHE_URLS:
'data/secret_words_starwars.json',

// 2. Bump CACHE_NAME:
const CACHE_NAME = 'sylly-games-vNN'; // increment N
```

Also update the comment on line 1 of `sw.js` to match.

---

## Step 5 — Update `logic-engine.md` precache list

Update the **Current SW version** line and add the new file to the **Precached assets** block in `.claude/rules/logic-engine.md`.

---

## Checklist

```
[ ] data/secret_words_[name].json created (30+ words, correct schema)
[ ] SM_TERMINAL_CONFIG.expansions entry added (id, label, locked: false, file)
[ ] SM_EXPANSION_OVERRIDES.[id] object added (all 3 game key sets)
[ ] sw.js: new file added to PRECACHE_URLS + CACHE_NAME bumped
[ ] sw.js: comment on line 1 updated
[ ] logic-engine.md: SW version + precache list updated
[ ] CLAUDE.md: project structure updated (new data file listed)
```

---

## Current expansions

| ID | Label | File | Status |
|----|-------|------|--------|
| `dota2` | DOTA 2 | `data/secret_words.json` | ✅ Live |
| `classified` | ??? [CLASSIFIED] | — | 🔒 Locked slot |

---

## Override key reference

All keys are plugin variable names. Plugins apply them directly without mapping.

| Key | Plugin | Type | Notes |
|-----|--------|------|-------|
| `settingTimer` | LI5 | number (30/60/90) | Seconds per turn |
| `settingRounds` | LI5 | number | Total rounds |
| `settingTabooCount` | LI5 | number (5/10) | No-No list size |
| `settingPenaltyMode` | LI5 | `'points'`/`'time'` | Penalty type |
| `settingSkipFree` | LI5 | bool | Free skips |
| `settingSylly` | LI5 | bool | Sylly Mode on/off |
| `settingSyllyPct` | LI5 | number (0–100) | Sylly word mix % |
| `gmFrequencyRange` | GM | `'stable'`/`'unstable'`/`'chaotic'` | Word difficulty |
| `gmMemoryGuard` | GM | bool | Block repeated clues |
| `gmResonanceTolerance` | GM | `'strict'`/`'normal'` | Near-sync sensitivity |
| `gmInfiniteResync` | GM | bool | Unlimited rerolls |
| `gmSignalBoost` | GM | bool | Boost overlay from R5 |
| `gmSyllyIntensity` | GM | `'sub-atomic'`/`'supernova'` | Sylly Mode intensity |
| `ssDifficultyLevel` | SS | number (1/2/3) | Word difficulty |
| `ssSettingInterceptsToWin` | SS | number | Win condition |
| `ssRerollLimitSetting` | SS | number / `Infinity` | Vault reroll budget |
| `ssIntelSyllyMode` | SS | bool | Intel Phase (Sylly Mode) |
