# Handoff — Token / Context Budget

**Purpose:** Brief a fresh session to tackle token-usage / context-budget reduction. Read this cold; it is self-contained. Companion records: memory `project_context_budget`, and `docs/decision-log.md` entries "Context-budget reduction" (2026-06-29) and "Settings-label emoji convention" (2026-06-30).

**Status as of 2026-06-30:** Fix (a) — the rule-file relocation — is **done**. This handoff captures *why*, *what changed*, and the *remaining levers* so the next session can pick the biggest wins without re-deriving the diagnosis.

---

## 1. What triggered this

A Sonnet session, doing routine Secret Signals edits, was **auto-compacting every ~2 minutes and burned ~50% of usage without shipping anything**. Snapshots showed it running content-mode Greps against `index.html` that returned **"Prompt is too long."**

## 2. Root cause (the key finding)

**This harness (VSCode native extension) auto-loads EVERY file in `.claude/rules/` as project instructions on every turn** — regardless of `@`-import discipline. The project's token-hygiene strategy assumed only the `@`-imported files load. That assumption was **false for this harness.**

Consequence: the big "on-demand" docs that lived in `.claude/rules/` were silently loaded *every turn*:

| File (was in `.claude/rules/`) | ~tokens/turn |
|--------------------------------|-------------|
| `game-identities.md` | ~34.7k |
| `phase-audit.md` | ~5.5k |
| `new-game-technical-template.md` | ~5.2k |
| `new-game-process.md` | ~2.9k |
| `new-game-brief-template.md` | ~2.3k |
| **Total wasted baseline** | **~50k** |

That ~50k baseline **stacked on top of** the 3 files that are *supposed* to be always-on, plus the system prompt, tool schemas, and memory index. Then any single **full read of `index.html` (~138k tokens)** or an unconstrained **content-mode grep** on it tipped the window over the limit → **"Prompt is too long" → auto-compact → the baseline rule files reload → repeat.** Sonnet's smaller working window hit that wall faster and harder than Opus.

**One-line version:** huge always-on baseline (defeated hygiene) + a 138k-token single HTML file + unconstrained reads = a compact death-spiral.

## 3. What's already fixed — Fix (a), done

Moved the 5 on-demand docs out of `.claude/rules/` → `docs/rules/` (via `git mv`, history preserved):
`game-identities.md`, `phase-audit.md`, `new-game-technical-template.md`, `new-game-process.md`, `new-game-brief-template.md`.

- All live path references updated (CLAUDE.md, logic-engine.md, decision-log.md, fable-fix-plan.md, fable-audit-plan.md, phase-audit.md). `docs/archive/*` snapshots left frozen by design.
- CLAUDE.md carries a ⚠️ note explaining *why* these live outside `.claude/` so nobody tidies them back in.
- **≈50k tokens/turn removed from baseline.** Takes effect **next session** (the harness had already injected them into the session that did the move).

**Kept in `.claude/rules/` (the only files that should ever live there):** `ui-style.md`, `logic-engine.md`, `definitions.md` — the genuine apply-on-every-edit rules.

## 4. Current baseline (measured 2026-06-30, after fix a)

Always-loaded project instructions:

| File | ~tokens/turn |
|------|-------------|
| `ui-style.md` | ~10.7k |
| `logic-engine.md` | ~10.2k |
| `CLAUDE.md` | ~6.8k |
| `definitions.md` | ~2.1k |
| **Subtotal (rule files)** | **~30k** |

Plus (not directly controllable here): system prompt, tool + deferred-tool schemas, memory index.

The remaining whale, read on demand not baseline: **`index.html` ≈ 138k tokens** (540 KB).

## 5. Remaining levers (ranked — for the new session to evaluate)

**A. `index.html` (138k) — the single biggest avoidable sink. (Highest impact, needs a decision.)**
Already governed by CLAUDE.md's "never full-read index.html — Grep first, then offset/limit Read" rule. The open question is whether discipline alone is enough or whether the file should be **physically split**.
- Tension: the project is explicitly **no-build / single-page** (see Anti-Patterns). A runtime split into multiple HTML pages is forbidden.
- Possible middle path: a **dev-only assembly step** (e.g. per-game HTML partials under `src/` concatenated into the shipped `index.html` by a Node script that is NOT part of the runtime/PWA). This keeps the single-page runtime intact while making edits touch small files. **This conflicts with the spirit of "no build tools" and needs an explicit owner decision before any work.**
- Cheapest path: leave the file whole, and just *harden the discipline* (a section-offset map already exists in `docs/code-map.md`).

**B. Split `ui-style.md` (10.7k) + `logic-engine.md` (10.2k) into core + appendix. (~10–15k/turn possible.)**
Both are always-loaded on purpose, but a lot of their bulk is *reference tables*, not apply-on-every-edit rules — e.g. the per-game brand-colour / range-class / toggle-class tables, the legacy `h-screen` whitelist, the full audio catalogue. Those could move to an on-demand `docs/rules/` appendix, leaving a lean always-on core. **Risk:** drift if the appendix isn't read when needed — weigh saving vs. that risk (this exact trade-off is why de-`@`-ing these was *deferred* in the 2026-06-29 decision).

**C. Trim `CLAUDE.md` (6.8k). (Minor.)**
The "Current Focus" → "Key references" list is long and duplicates `decision-log.md` + the archive snapshots. Could shrink to a few pointers.

**D. Conversation-level discipline. (Free, ongoing.)**
Count-first grep (`output_mode: "count"` / `files_with_matches`) → `content` with `-n` → Read with tight `offset`/`limit`. Never bare-read a >40 KB file "to orient." Already in CLAUDE.md § Token Hygiene — reinforce, don't re-invent.

## 6. Hard constraints the new session must respect

- **Keep `.claude/rules/` to the 3 lean always-on files only** — the harness auto-loads everything in that folder every turn. Anything big put there reverses fix (a).
- **No build tools, no npm/webpack, single-page app** (CLAUDE.md Anti-Patterns). Any `index.html` split must not break the no-build / offline-PWA runtime.
- **The `Bash` tool returns no output in this environment — use the `PowerShell` tool** for shell work.
- **Never use the Edit tool for systematic `index.html` changes — use a Node.js script** (UTF-8 mojibake risk; memory `feedback_indexhtml_encoding`).
- **Australian English; metric units.**

## 7. Suggested first moves for the new session

1. **Measure the live baseline at session start** to confirm fix (a) took effect (the ~50k should be gone). A quick `PowerShell` size sweep of `.claude/rules/*` + `CLAUDE.md` is enough.
2. **Get an owner decision on lever A** (index.html): discipline-only vs. dev-only assembly script. This is the big one and is a strategy/architecture call — log it in `decision-log.md`.
3. If appetite exists, **do lever B** (split the two always-on rule files into core + on-demand appendix) — mechanical and reversible.
4. **Lever C** as cleanup.

---

*Authored 2026-06-30 at end of the session that completed fix (a) + the Secret Signals playtest tweaks (SW v136).*
