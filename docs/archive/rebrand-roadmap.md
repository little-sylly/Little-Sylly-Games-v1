Here's the full rebrand roadmap — copy this anywhere you like:

✅ Phase 1 — DONE Pure index.html text. Lobby cards, menu titles, CTA buttons. 9 changes. No JS touched.

✅ Phase 1.5 — Thematic Text Alignment — DONE

Goal: Manually aligned most static UI (Gatekeeper, Skip, Game Over, and Setup screens) with the "Playground" themes for Like I'm 5 and "Espionage" themes for Secret Signals.

HYPE_POOLS (gatekeeper screen, dstw.js lines 193–226) have been rewritten with LI5-themed phrases. SW bumped v55 → v56 to bust cache and make changes live.

🔜 Phase 2 — Next session (JS display strings)

NOTE — Two separate hype systems in dstw.js:
- HYPE_POOLS (lines 193–226): gatekeeper screen, score-based messages — ✅ already rewritten
- HYPE_PHRASES (line 57): in-turn streak messages during active play — ⏳ still generic, needs LI5 treatment

Like I'm Five (dstw.js): Update HYPE_PHRASES (line 57 — in-turn streak pop during active play) with LI5 phrases e.g. "Gold Star! 🌟", "Clever clogs! 🧠", "You're on a roll! 🎉". Also add "Oops! That's a No-No! 🙊" to the dynamically-injected penalty feedback string.

Great Minds (great-minds.js): Verify GM_MISMATCH_PHRASES + GM_OVERRIDE_PHRASES, check "Great Minds Settings" heading in the settings overlay (line 733, may have been missed in Phase 1)

Secret Signals (sylly-signals.js): "Clue Giver" → "The Transmitter" and "Codes" → "Frequencies" if those are JS-injected (not already in HTML)

🔮 Phase 3 — Future (optional, deeper)
Verify renderTabooList() in dstw.js already renders "No-No List" not "Taboo"
Secret Signals Vault + Intel screen lore copy
Update docs/phase10-snapshot.md terminology table to reflect new game names

Permanent constraints across all phases: No file renames, no variable/function renames, Australian English, no SW version bump unless new files are added.

Start fresh next session, paste this in, and say "Phase 2 rebrand" — we'll be straight back on track.

Saved to persistent memory — it'll be loaded automatically next session. When you're back at 0% usage, just say "Phase 2 rebrand" and I'll pick it straight up.

Plan: Knowledge Handoff — Populate .claude/rules/ and Rewrite CLAUDE.md

Context

The user wants to extract specific knowledge from CLAUDE.md and the phase10-snapshot into four dedicated rule files in .claude/rules/, then slim down CLAUDE.md to point to those files via @ references. This reduces per-session token cost and lets Claude pull only the relevant "locker" per task.

Files to Modify
.claude/rules/ui-style.md (currently empty placeholder)
.claude/rules/logic-engine.md (currently empty placeholder)
.claude/rules/definitions.md (currently empty placeholder)
.claude/rules/game-identities.md (currently empty placeholder)
CLAUDE.md (rewrite to remove migrated content, add @ references)

Step 1 — Write .claude/rules/ui-style.md
Content to migrate from CLAUDE.md + phase10-snapshot:
Global UI Protocol: speaker icon (.btn-open-sound), exit button (✕) logic, active-play #btn-mute exception
Two-Pattern Overlay Library: data overlay classes + decision modal classes, z-index stack
Settings Layout Standard: game options first, Sylly Mode last, pill button style
Thumb-Friendly UI skill: 44×44px minimum, bottom 60% rule, no adjacent destructive actions
Sylly Tone skill: playfulness rules, Australian slang guideline

Step 2 — Write .claude/rules/logic-engine.md
Content to migrate:
Engine/Plugin split: what engine.js owns vs what plugins own
Screen routing: showScreen(), allScreens[], how to add a new screen
Audio function catalogue: all play*() names with semantic meaning
Reset functions: resetToLobby() vs resetToMenu() — when each is used
PWA Guardian skill: offline check, SW versioning, cache-first, bump rule
Animation re-trigger pattern: classList.remove → void offsetWidth → classList.add
Checklist for adding a new game (from phase10-snapshot)
SW precache asset list (current v55 list)

Step 3 — Write .claude/rules/definitions.md
Content to capture:
Variable naming conventions: global camelCase, game-prefix pattern (gm, ss, dstw)
Boolean patterns: is/has prefix or direct flag name
Constant style: SCREAMING_SNAKE_CASE
Function verb patterns: play*, gm*, ss*, show*, reset*
Internal enum strings: quoted lowercase/kebab ('strict', 'sub-atomic', 'stable')
Comment style: section dividers (// ──), emoji rationale inline
Technical project terms: nono_list (not taboo_list), isSylly (derived not stored), etc.
Data schema for words.json

Step 4 — Write .claude/rules/game-identities.md
Content to capture per game:

Great Minds:
Theme: telepathy / frequency / signal
Key terminology table (pass gate text, reveal text, win state "NEURAL LINK!", etc.)
Settings names and their internal enum values
Special mechanics summary (Signal Boost, Neural Library, Psychic Echoes, Social Override, Session Terminal)

Sylly Signals (Secret Signals):
Theme: encryption / intercept / broadcast
Key state variable names (ss prefix)
Flow summary
Settings list

DSTW (Like I'm Five — LI5):
Theme: pass-the-phone description game
"No-No List" naming convention (not taboo)
Settings list
State: stable since Phase 7

Shared:
Sylly Mode is always last in settings, is the "advanced rules signature"
isSylly derived at runtime (difficulty === 3), never stored

Step 5 — Rewrite CLAUDE.md
Remove (migrated to rule files):
Global UI Protocol section
Two-Pattern Overlay Library section
Settings Layout Standard section
Overlay Z-index Stack
Thumb-Friendly UI skill
Sylly Tone skill
Engine/Plugin Split architect competency
Audio function catalogue
Animation re-trigger pattern
Screen routing details
All per-game terminology/settings details
Variable naming conventions
Data schema details
New game checklist

Keep in CLAUDE.md:
Project structure + file tree
Load order note
Tech stack + zero-cost constraints
Anti-Patterns (Do Not)
Surgical Coding Protocol (Visualise First, 95% confidence, atomic changes)
Documentation Pause Rule
Token Hygiene (Australian English, /compact)
PWA Guardian, Consistent Word Expansion, Logic-First Teaching skills (brief)
Current Focus / SW version line

Add — @ reference section near top:
## Rule Files (always relevant — load as needed)
- @ui-style.md — overlays, buttons, speaker/exit protocol, settings layout
- @logic-engine.md — engine/plugin split, screen routing, audio, PWA, new-game checklist
- @definitions.md — naming conventions, comment style, data schema, project terms
- @game-identities.md — per-game themes, terminology, settings, special mechanics


Verification
After implementation:
Run ls -R .claude/rules/ in terminal — confirm 4 non-empty files
Open a new chat, type @ui-style.md — confirm VS Code extension surfaces the file
Spot-check: CLAUDE.md should no longer contain "overlay-data-backdrop" or "gmPlayerNames"
Spot-check: game-identities.md should contain "NEURAL LINK!" and "No-No List"

All four files confirmed. Here's what was done:

Created:

.claude/rules/ui-style.md — Global UI Protocol, Two-Pattern Overlay Library (with z-index stack), Settings Layout Standard, Thumb-Friendly UI, Sylly Tone

.claude/rules/logic-engine.md — Engine/Plugin split, screen routing, full audio catalogue, reset functions, animation re-trigger pattern, PWA Guardian + SW asset list, new-game checklist

.claude/rules/definitions.md — Variable/function naming tables, internal enum strings, comment style, project-wide terms, words.json schema

.claude/rules/game-identities.md — All three game themes, full terminology tables, settings (with internal enum values), special mechanics

Rewritten: CLAUDE.md — stripped of all migrated detail, now opens with the four @ rule file references, and retains only: project structure, tech stack, Anti-Patterns, Surgical Coding Protocol, Documentation Pause Rule, Token Hygiene, and the three remaining skills.