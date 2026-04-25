# Next-3-Stage Plan — Little Sylly Games
**Created:** April 2026 | **Status:** Stages 1 & 2 complete — Stage 3 pending

---

## Recommended Order

```
✅ Stage 1 → Rebrand Phase 2       (complete)
✅ Stage 2 → Secret Mode           (complete — SW v58)
   Stage 3 → Just Enough Cooks     (~3–5 sessions)
```

---

## ✅ Stage 1: Rebrand Phase 2 — COMPLETE
**Goal:** Finish thematic text alignment across all 3 existing game plugins (JS display strings).
**Delivered:** HYPE_PHRASES (LI5-themed), penalty phrase "Oops! That's a No-No! 🙊", GM phrase arrays verified on-theme, SS strings confirmed clean. No SW bump needed.

### Files to touch
| File | Changes |
|------|---------|
| `js/games/dstw.js` | `HYPE_PHRASES` (line 57) → LI5-themed phrases ("Gold Star! 🌟", "Clever clogs! 🧠"); penalty feedback string → "Oops! That's a No-No! 🙊" |
| `js/games/great-minds.js` | Verify `GM_MISMATCH_PHRASES` + `GM_OVERRIDE_PHRASES` use GM thematic language; check "Great Minds Settings" heading (line 733) wasn't missed in Phase 1 |
| `js/games/sylly-signals.js` | "Clue Giver" → "The Transmitter"; "Codes" → "Frequencies" — only if these are JS-injected (not already in HTML) |

### Constraints (from rebrand-roadmap.md)
- No variable or function renames
- No SW version bump (no new files added)
- Australian English throughout

### How to start this session
> "Phase 2 rebrand — pick up from rebrand-roadmap.md. Start with dstw.js HYPE_PHRASES (line 57), then great-minds.js phrase arrays, then sylly-signals.js injected strings."

---

## ✅ Stage 2: Secret Mode — COMPLETE
**Goal:** Build the global expansion proxy framework — Konami gateway, Sylly-OS Terminal, expansion JSON schema, and patches to all 3 existing plugins.
**Delivered:** All 6 sub-sessions complete. SW bumped to v58. Expansion template documented at `docs/expansion-guide.md`.

**Key implementation notes (for future reference):**
- Expansion word bank lives at `data/secret_words.json` (not `secret_words_dota2.json` — file was pre-existing)
- `secretWords` global defined in `secret-mode.js`, loaded async at launch time
- `normaliseWord()` promoted to `engine.js` (was `gmNormaliseWord` in great-minds.js)
- To add a new expansion: see `docs/expansion-guide.md` — 4 steps, no plugin patches needed

### Why before JEC
1. **`normaliseWord()` extraction** — `gmNormaliseWord` lives in `great-minds.js`. Secret Mode's Vocabulary Lock and JEC's Lenient Cook Rule both need it. Promoting it to `engine.js` as `normaliseWord()` during Secret Mode (when engine.js is already being touched for Terminal screens) is free. Doing it after JEC is a retrofit.
2. **`applyExpansionOverrides()` hook pattern** — Once established in LI5, GM, SS, it's documented and checklist-gated. JEC inherits it natively. Without this, JEC must be retrofitted after Secret Mode.
3. **Terminal game config** — The Terminal's game list is a config array. Designing it for 4 games (JEC as "Coming Soon") is cleaner than building for 3 and patching later.
4. **JEC as reference implementation** — JEC, built after the full framework exists, becomes the gold standard that games 5+ follow.

### Sub-session breakdown (suggested)
| Sub-session | Deliverable |
|-------------|-------------|
| SM-1 | Konami listener + ASCII controller UI; retro audio beep |
| SM-2 | Sylly-OS Terminal screen: expansion selector + game selector; Terminal config array |
| SM-3 | `data/secret_words_dota2.json` (expansion word bank, same schema as words.json) |
| SM-4 | Patch LI5 + SS: `applyExpansionOverrides()` hook, data source swap, lockdowns |
| SM-5 | Patch GM: `gmGetWordPool()` wrapper, Vocabulary Lock, guard chain update (Cheap Move → Vocab Lock → Too Easy → Memory Guard) |
| SM-6 | Promote `gmNormaliseWord` → `engine.js` as `normaliseWord()`; update GM call site; SW bump |

### New files
- `js/secret-mode.js` — Terminal UI, Konami listener, proxy state (`isSecretMode`, `activeExpansion`, `window.activeExpansionOverrides`)
- `data/secret_words_dota2.json` — same schema as words.json; Dota 2 vocabulary

### Key validated decisions (do not re-research)
- Push model: Terminal writes `window.activeExpansionOverrides`; plugins read it. Engine never touches plugin state.
- GM guard chain order (Round 2+): Cheap Move → Vocabulary Lock → Too Easy → Memory Guard / Last Round
- `gmGetWordPool()` wrapper: returns `allWords` normally; returns `secretWords` when `isSecretMode && gmRound >= 2`
- Expansion JSON must be fully loaded before Round 2 input screen is reachable (no lazy-load race)
- Hard-reset: `isSecretMode = false` on return to main title screen

### SW bump
Bump to v57 (or higher) when `js/secret-mode.js` + `data/secret_words_dota2.json` are added. Add both to precache list.

### How to start this session
> "Starting Secret Mode Stage 2. Reference docs/secret-mode-plan.md for all validated decisions. Begin with SM-1: Konami listener + ASCII controller UI in a new js/secret-mode.js file."

---

## Stage 3: Just Enough Cooks (JEC)
**Goal:** Build the 4th game plugin from scratch against the complete, mature framework.
**Estimated:** 3–5 sessions. **Reference:** `docs/new-game-just_enough_cooks.md` (spec + UI flow + technical notes).

### Why after Secret Mode
- `normaliseWord()` already in `engine.js` — JEC's Lenient Cook Rule uses it directly
- `applyExpansionOverrides()` pattern documented + checklist-gated — JEC includes it natively
- Terminal's JEC slot pre-exists — one config line to activate
- JEC.js is the first plugin written against the complete spec

### Sub-session breakdown (suggested)
| Sub-session | Deliverable |
|-------------|-------------|
| JEC-1 | `jec-menu` screen + `jec-roster` (player name entry); lobby card; `allScreens[]` + `resetToLobby()` wired |
| JEC-2 | `jec-order` (secret word reveal) + `jec-prep` (ingredient input, 3 fields, pass-the-phone) |
| JEC-3 | `jec-sifting` (frequency map, `getIngredientStatus()`, Sous Chef Oversight modal) + `jec-tally` (per-round score) |
| JEC-4 | `jec-washup` (final leaderboard, "The Final Wash-up") + game loop wiring end-to-end |
| JEC-5 | Sylly Mode: `jec-sign` screen (Signature Dish + Poison Word); Kitchen Nightmares scoring; SW bump to v57/58 |

### Key technical notes
- **State prefix:** `jec` — `jecPlayerNames`, `jecRound`, `jecInputs`, `jecWordFrequency`
- **Sylly Mode flag:** `jecKitchenNightmares` (bool)
- **Word normalisation:** call `normaliseWord()` from engine.js (already promoted)
- **Frequency map:** built client-side after all inputs collected
- **Golden Zone scaling:** `getIngredientStatus(input, wordFrequency, N)` — see spec for formula
- **Sous Chef Oversight:** Pattern 2 decision modal — host merges two similar words before final tally
- **SW bump:** v57 (or current +1) when jec.js added to precache list

### How to start this session
> "Starting JEC Stage 3. Reference docs/new-game-just_enough_cooks.md. Begin with JEC-1: jec-menu screen and jec-roster in index.html, plus allScreens[] and resetToLobby() wiring in engine.js."

---

## Cross-cutting components extracted during this window

| Component | From | To | When |
|-----------|------|----|------|
| `normaliseWord(word)` | `gmNormaliseWord` in great-minds.js | `engine.js` | Secret Mode SM-6 |
| `applyExpansionOverrides()` pattern | (new) | Each plugin's settings-apply point | Secret Mode SM-4/5 + JEC native |
| Terminal game config array | (new) | `js/secret-mode.js` | Secret Mode SM-2 |
| Expansion JSON schema | Already defined (words.json compatible) | `data/secret_words_*.json` | Secret Mode SM-3 |

---

## Future games (5+) — what they inherit automatically

Any game built after this window gets for free:
- `normaliseWord()` from engine.js (no copying needed)
- `applyExpansionOverrides()` hook in the new-game checklist
- Terminal game config — one entry to add
- Complete `@ui-style.md` Universal Menu Standard
- Complete two-pattern overlay library
- `gmShuffle()` in great-minds.js (reusable for any random draw)
- `ssFuzzyMatch()` in sylly-signals.js (reusable for word equivalence)
- `gmNormaliseWord()` call site updated — confirmed pattern to follow

---

## Stage 4 (Deferred): File Rename Pass
**Trigger:** All game identities are final and no further name changes are expected.
**Scope:** One atomic commit renaming `dstw.js` → `li5.js`, `sylly-signals.js` → `secret-signals.js` (or final names), and updating every reference in one pass: `index.html` script tags, `sw.js` precache list, `CLAUDE.md` / rule files, and any snapshot docs.
**Constraint:** Do not do this piecemeal — all references must change in the same commit or the SW will serve stale files.

---

## Document relationships

| Doc | Purpose |
|-----|---------|
| `docs/next-3-stage-plan.md` | This file — strategic order + rationale |
| `docs/rebrand-roadmap.md` | Rebrand Phase 2 detail + constraints |
| `docs/secret-mode-plan.md` | Secret Mode spec + validated architecture decisions |
| `docs/new-game-just_enough_cooks.md` | JEC game spec + screen map + technical notes |
| `.claude/rules/logic-engine.md` | New-game checklist (now includes `applyExpansionOverrides()` item) |
| `docs/phase10-snapshot.md` | Current architecture gold master (pre-Secret Mode) |
