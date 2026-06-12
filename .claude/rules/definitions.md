# Definitions & Naming Conventions — Little Sylly Games

## Variable Naming

| Scope | Pattern | Examples |
|-------|---------|---------|
| Global / engine | `camelCase`, no prefix | `isMuted`, `masterVolume`, `activeGameId`, `allScreens` |
| LI5 state (legacy — no prefix) | `camelCase` (predates the prefix convention; file was `dstw.js`) | `currentWordData`, `timeLeft`, `settingRounds` |
| All other plugin state | `[abbr]` prefix + `camelCase` | `gmRound`, `ssVaultA`, `jecScores`, `ygiLineup`, `lttpStrayIdx`, `natSpecimen`, `dsdValour`, `gthAllDiagnoses`, `dybMyRoll`, `bldPlayerCount`, `passAbyss` |
| Booleans | `is`/`has` prefix, or direct flag name | `isMuted`, `gmMemoryGuard`, `gmCustomWords` |
| Sets / Arrays | Pluralised camelCase | `allScreens`, `gmSessionGuesses`, `gmRoundLog` |
| Constants | `SCREAMING_SNAKE_CASE` | `GM_CATEGORIES`, `BLD_ROLE_TABLE`, `LTTP_SMALL_TALK` |

**Active plugin prefixes (12 games):** `li5` (state vars unprefixed — see above), `gm`, `ss`, `jec`, `ygi`, `lttp`, `nat`, `dsd`, `gth`, `dyb`, `bld`, `pass`. A new game's abbreviation must not collide with any of these (Naming Collision Check 3, `new-game-process.md`).

## Function Naming

| Pattern | Used for | Examples |
|---------|---------|---------|
| `play*()` | Audio (engine only) | `playSuccess`, `playBoing`, `playTick` |
| `show*()` | Screen / overlay visibility | `showScreen`, `openSoundOverlay` |
| `reset*()` | State teardown | `resetToLobby`, `resetToMenu` |
| `[abbr]*()` | Plugin functions (every prefixed game) | `gmBuildPool`, `ssFuzzyMatch`, `natAssignRoles`, `dsdApplyDrift`, `gthStartSession`, `bldShowTip` |
| `[abbr]Show*()` | Plugin screen transitions | `natShowHandover`, `dsdShowPassGate`, `dybShowSeating` |
| `[abbr]Mp*()` / `[abbr]HandleEnvelope()` | Plugin multiplayer interceptors | `gmMpDisplayResult`, `dybHandleEnvelope`, `bldHandleEnvelope` |
| `mp*()` | Engine multiplayer module | `mpSendEnvelope`, `mpLockSync`, `mpReturnToLobby` |
| `verb` + noun | General helpers | `getAudioCtx`, `flipEntry`, `getMuteToggleOnClass` |

## Internal Enum Strings
Stored as lowercase or kebab-case quoted strings — never numbers or booleans for named states.

```js
gmFrequencyRange:     'stable' | 'unstable' | 'chaotic'
gmResonanceTolerance: 'strict' | 'normal'
gmSyllyIntensity:     'sub-atomic' | 'supernova'
ssDifficultyLevel:    'standard' | 'wild' | 'wilder'
gthDifficultyMix:     'episodic' | 'recurrent' | 'refractory'
dybWildcardsStyle:    'strict' | 'classic' | 'volatile'
syllyMultiplayerMode: 'single' | 'host' | 'client'
```

## Comment Style
```js
// ═══════════════════════════════════  ← file header (box outline)
// ── GM Settings ─────────────────────  ← section header (dashes + label)
// original 2 words — never mutated; contains check, entire game  ← inline rationale
// YAY! — description   ← positive inline (emoji prefix)
// NAY! — description   ← negative inline (emoji prefix)
// Depends on: engine.js (...), li5.js (...)  ← dependency declaration at top of plugin
```

## Technical Project Terms

| Term | Meaning |
|------|---------|
| `nono_list` | The forbidden words in Like I'm Five (deliberate name — not `taboo_list`) |
| `isSylly` | Derived at runtime as `difficulty === 3`; never stored in data |
| `activeGameId` | String set by plugin on entry; null when in lobby |
| Pill Button | Multi-choice setting UI: `.pill` (inactive) / `.pill-active-purple` (active) |
| Mind Meld | Great Minds: both players matched — win condition |
| Neural Link | Great Minds: victory state label shown on screen |
| Psychic Echoes | Great Minds: full round log table (# | Pair | P1 | P2) |
| Session Terminal | Great Minds: end-of-game decision modal (purge vs resume) |
| Signal Boost | Great Minds: turn-based hint mechanic from round 5 |
| Vault | Secret Signals: each team's 4-word keyword set |
| Broadcast | Secret Signals: the encrypted clue sent from Encoder to Interceptors |
| `syllyMultiplayerMode` | `'single'` / `'host'` / `'client'` — global gate controlling all MP branches in every plugin |
| `syllySyncLocked` | Bool — true while awaiting a Firebase response; prevents double-submission via `btn-mp-action` CSS class |
| `syllyDeviceUid` | Anonymous Firebase UID assigned on first room action; lives in memory only (not localStorage) |
| `syllyFirebase` | Lazy-loaded Firebase app instance; null on app boot until user enters Lobby Mode |
| Envelope | `{ type, payload, originId, timestamp }` — universal message wrapper written to and read from Firebase |
| Room Code | 4-char uppercase alphanumeric string uniquely identifying a Firebase room node |
| Lobby Mode | Multiplayer session where a Host + 1–N Clients share game state over Firebase Realtime Database |
| readyCheck matrix | `[false, false, ...]` — one boolean per player; Host advances state when `.every(Boolean)` |
| `btn-mp-action` | CSS class applied to every submittable multiplayer button; greys out during sync lock via `.mp-sync-locked` body class |
| `mpClientPlayerRef` | `window.`-declared Firebase ref to the client's own `/players/{uid}` node; used for explicit removal on leave/cancel; cleared in `resetToLobby()` |
| `mpPlayersListener` | `let`-declared `onValue` unsubscribe for the `/players` node; active during host lobby only — do NOT access via `window.` prefix |
| `getMuteToggleOnClass(gameId)` | Engine helper mapping `activeGameId` → the game's `game-toggle-on-[colour]` class; fallback `game-toggle-on-stone` |
| `game-toggle-on-[colour]` | CSS class family for ALL ON-state toggles (settings, Sylly Mode, global mute); OFF state is `game-toggle-off` (canonical; `sylly-toggle-off` legacy alias). `sylly-toggle-on` is deprecated — never use |
| Internal game id | The `activeGameId` string is the *internal* id and may differ from the display name — SS uses `'sylly-signals'` (legacy) although the game is displayed as Secret Signals |

## Data Schema: words.json
```json
{
  "id": "string (unique, e.g., 'animals-001')",
  "word": "string (target word)",
  "nono_list": ["array of 10 words — index 0 is the Broad Shield (Documentary Label) for animals; indices 1-9 are standard associative/forbidden words"],
  "category": "string — one of 16 categories",
  "difficulty": 1
}
```
- 16 categories: `animals, food, places, objects, sports, nature, vehicles, jobs, activities, music, pop_culture, people, brands, emotions, actions, aussie_slang`
- Great Minds uses 10: excludes `vehicles, music, pop_culture, people, brands, aussie_slang`
- Difficulty 1 = Standard (concrete nouns), 2 = Wild (verbs/adjectives), 3 = Wilder (abstract)
- `isSylly` = `difficulty === 3` — derived, never stored
- **animals category only:** `nono_list[0]` = Documentary Label / Common Grouping (e.g., "Sea Creature", "Furry Animal") — serves as the Broad Shield in Like I'm Five AND as The Mole's Grouping in Natural Selection (the only clue The Mole receives). Must NOT be a scientific class name. See Dual-Use Contract in `CLAUDE.md`.

## Other Data Files
Schemas for the other data files are documented next to their owning game — do not duplicate them here:
- `data/ygi-data.json` — `{ id, text, ringers[5] }` — full schema in `game-identities.md` § You Get It? and `docs/ygi-content-guide.md`
- `data/gth-data.json` — `{ id, name, display, definition, tip, category, difficulty, cluster?, aliases[] }` — full schema in `game-identities.md` § Group Therapy and `docs/gth-content-guide.md`
- `data/secret_words.json` / `secret2_words.json` / `secret3_words.json` — same schema as `words.json`; see `docs/expansion-guide.md`

## File Format: words.json
- **One entry per line** (compact `JSON.stringify(entry)` — no multi-line pretty-print)
- **Blank line between each category group** — 16 categories, 15 blank-line separators
- **Category order in file:** `animals, food, places, objects, sports, nature, vehicles, jobs, activities, aussie_slang, pop_culture, people, brands, emotions, actions, music`
- When rewriting the file (e.g. after adding words), use a custom serialiser — `JSON.stringify(entry)` per line, with `lines.push('')` after the last entry of each category except the final one. Never use `JSON.stringify(array, null, 2)` — it produces multi-line per-entry format.
