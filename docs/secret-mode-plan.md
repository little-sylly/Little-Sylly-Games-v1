Phase: Secret Mode – Modular Expansion Framework
**Status: FULLY IMPLEMENTED — April 2026 | SW v58**

> Implementation complete including GM Vocab Lock, Vocab Overlay, Concede System, and LI5 team name lock.
> Architecture decisions below are settled — do not re-litigate.
> For the current gold master, see `docs/phase10-snapshot.md`.
> For adding new expansion packs, see `docs/expansion-guide.md`.

---

0. Intro: Intent & Strategy
The "Why" behind the Secret Mode

Intent: To provide a gated "Expansion Pack" environment that hosts specialized, high-difficulty content (like the Dota 2 dataset) without overwhelming casual users or "polluting" the primary family-friendly word decks.

Expectations: The user should feel like they are "breaking into" the game's backend. The experience must be starkly different from the main UI—shifting from a modern PWA aesthetic to a retro, command-line "hacker" atmosphere.

Key Decisions & Reasoning:

The Gateway (Konami Code): Chosen to reward core gamers and "know-how" while preventing accidental activation by children or casual players.

The Launcher Concept: We decided to use the Terminal as a central "hub" for selecting games. This ensures the Secret Mode is a Global Switch (Proxy Pattern) rather than a series of patches, making the system future-proof for any new games added to the PWA.

Great Minds "Expert Mode": We chose to restrict player clues to the expansion vocabulary. This forces players to dig deep into niche lore (e.g., Dota mechanics) to describe everyday concepts, effectively creating a "game within a game."

Decoupling: By keeping expansion logic as an isolated "layer," we ensure that core game updates won't break the secret mode, and adding a new expansion (e.g., "Star Wars" or "Marvel") only requires a new JSON and one menu entry.

1. Vision & Architectural Goal
The "Secret Mode" is a gated expansion layer designed to host specialized datasets (e.g., Dota 2) without polluting the core PWA logic.

Design Philosophy: Global Proxy Pattern. Instead of patching games individually, the system uses a global "Secret Mode" flag that intercepts data requests and settings configurations.

The Vibe: A stark contrast between the modern PWA and a retro "hacker" environment (ASCII art, terminal text, phosphor green accents).

2. Global State & Persistence
To ensure future-proofing, Secret Mode logic must be decoupled from individual game components.

Expansion Manager: A central state module tracking isSecretMode (boolean) and activeExpansion (e.g., "dota2").

Reset Protocol: * Persistence: Secret Mode remains active during game replays or navigation between game menus.

Hard-Reset: If the user returns to the Main Title Screen, isSecretMode is automatically set to false.

The Settings Proxy: * A utility function getEffectiveSettings(gameId) serves as the source of truth.

If isSecretMode is true, it merges user settings with Expansion Defaults and disables "Deck Selection" or "Custom Word" inputs.

3. Interface: The "Hacker" Gateway
A. The Trigger (ASCII Controller)
Visual: A rectangular NES-style controller rendered in monospace ASCII text.

Interaction: Large, tactile emoji buttons: ⬆️, ⬇️, ⬅️, ➡️, 🅰️, 🅱️, [ SEL ], [ ST ].

Logic: A rolling input buffer detects the Konami Code: U, U, D, D, L, R, L, R, B, A, Start.

Feedback: Every button press triggers a short retro "beep" audio clip.

B. The Launcher (Sylly-OS Terminal)
Visual: Pure black background (#000000), "Cyber Lime" (#00FF00) monospace text, and typewriter-style entrance animations.

The Flow:

Select Expansion: e.g., [1] DOTA 2, [2] ??? (LOCKED).

Select Game: A list of all PWA games.

Launch: Redirects the user to the game’s settings/lobby with Secret Mode active.

4. Game-Specific "Expert" Overrides
Great Minds (GM) — The Expert Challenge
This game receives the most complex logic overhaul when in Secret Mode:

Round 1: Target words are Standard (words.json).

Round 2+: Target words are Expansion (secret_words.json).

Vocabulary Lock: Clues submitted by players must exist in the expansion JSON (exact match, case-insensitive).

Error Message: "You can only input acceptable words, please see [?] for full list."

Cross-Check Logic (Round 2+): If a clue word appears in the nono_list of both active secret words, it is blocked.

Error Message: "Haha, that would be too easy! Try another word."

Help UI: A generic [?] icon opens a searchable/categorized overlay of the current expansion's word bank.

Like I'm 5 (LI5) & Secret Signals (SS)
Data Swap: Automatically points all word-fetching to the active expansion JSON.

Lockdown: Disables "Deck Selection" and "Vault Customisation."

5. Expansion Defaults (Forced Overrides)
When isSecretMode is active, the following defaults are injected. If a user tries to change them, a warning appears: "Are you sure? This expansion is balanced for recommended settings."

Like I’m 5 (LI5)
Timer: 60s
Rounds: 5
No-no List Size: 10 words
Penalty: -1 Point
Skip Cost: Penalised
Allow Review Edits: ON
Sylly Mode: ON (Set to 40%)

Great Minds (GM)
Adjust Frequency Range: Chaotic
Memory Guard: ON
Resonance Tolerance: Resonant
Infinite Resync: ON
Signal Boost: OFF
Sylly Mode: OFF
Bonus Setting: ON (Forced/Hidden) — Vocabulary Lock enabled.

Secret Signals (SS)
Difficulty: 3
Intercepts to Win: 2
Vault Word Rerolls: Unlimited
Sylly Mode: ON

6. Technical Constraints
Language: Strictly Australian English.

Responsiveness: ASCII and Terminal elements must be fully legible and interactable on mobile touch screens.

Architecture: Use a "Plug-and-Play" approach; adding a new expansion should only require adding a new JSON and an entry in the Terminal menu.

End of Plan. Ready for future implementation.

---

7. Technical Validation (Completed — do not re-research)

Validated by Claude on 2026-04-21. These decisions are settled.

7a. "Too Easy" Block Logic — Confirmed Correct
Round 2+ GM guard: if (wordA.nono_list.includes(clue) && wordB.nono_list.includes(clue)) → block with "too easy" message.
Rationale: a word forbidden by both active secret words trivially bridges them.

Full GM guard chain order (Round 2+):
  1. Cheap Move Guard (clue contains/is contained by pair word)
  2. Vocabulary Lock (clue must exist in expansion JSON — exact match, case-insensitive)
  3. Too Easy block (clue in both active words' nono_lists)
  4. Memory Guard / Last Round Guard (existing GM guards, unchanged)

7b. CRITICAL — Settings Proxy: Invert the Dependency
Settled: Push model. `smLaunch()` writes `window.activeExpansionOverrides`; plugins read at settings-apply point.

7c. MINOR — Expansion JSON Load Race
Solved: `smLaunch()` awaits the full JSON fetch + `smBuildExpansionData()` before navigating. The expansion data is guaranteed ready before any game screen is reachable.

7d. Runtime Vocab Index
Implemented as `smBuildExpansionData(words)` in `secret-mode.js`. Builds:
  - `window.activeExpansionData.vocab` — Set of normalised strings (primary + nono_list) for O(1) guard
  - `window.activeExpansionData.byCategory` — original-cased primary words per category (display)
  - `window.activeExpansionData.misc` — all nono_list terms deduped + sorted (display)

7e. Files Added
  - data/secret_words.json — Dota 2 expansion, 434 entries
  - js/secret-mode.js — Terminal UI, Konami listener, proxy state
  - screen-gm-concede, gm-vocab-overlay, gm-concede-overlay — all registered in allScreens[]
  - sw.js bumped to v58