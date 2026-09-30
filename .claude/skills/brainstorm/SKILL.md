---
name: brainstorm
description: Tier 2 (architectural) work only — a new game, a new engine/MP pattern, a change under cross-cutting rules, a phase gate — or when the owner asks to "brainstorm" / "spec" something. Draws out intent and writes a spec; then goes straight to implementation. Do NOT use for Tier 0/1 work (see CLAUDE.md § Task Triage Gate).
---

# Brainstorm → Spec (then build)

Adapted from superpowers:brainstorming (6.4.1), trimmed on 30 Sep 2026: the plan-writing, TDD-ritual and
subagent-execution stages that followed it are dropped. A spec says **what** and **why**; the model already
knows **how**. The safety net is the harness set (`docs/rules/harnesses.md`), not a plan file.

**Size it first.** State the tier per the Triage Gate. If it is Tier 0/1, stop using this skill and work inline.

## Process

1. **Explore context** — read-only. The relevant identity doc, `docs/code-map.md` slice (Grep, never whole),
   `docs/deferred-work.md` hits, and Template Gaps in the impl-notes. New game: also `docs/rules/new-game-process.md`.
2. **Write back your understanding** — a short note: intended outcome, who it is for, constraints, success
   criteria. Separate what the owner said from your assumptions. Wait for correction.
3. **Ask clarifying questions** — one at a time, only the ones the code can't answer. Prefer multiple choice.
   Flag a request that is really several independent pieces and decompose it first.
4. **Propose 2–3 approaches** — trade-offs, a recommendation, YAGNI. Challenge a mechanic that breaks the
   game's soul (`CLAUDE.md` § How to Work).
5. **Present the design in sections** — architecture, data flow, MP packets and the missing-handler audit,
   error handling. Get a yes after each.
6. **Write the spec** — `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`. **New game: the spec is
   `docs/new-game-tech-[name].md`, filled in from `docs/rules/new-game-technical-template.md` (its §15 is the
   stage breakdown) — do not write a second design doc.** It must **name the
   verification up front**: which existing harnesses re-run, which new checks a rule/packet/state change
   earns (not presentation — Harness rule), and whether a loopback or `visual-check` is needed. Self-review
   for placeholders, contradictions, ambiguity, scope. Commit it.
7. **Owner approves the written spec.** This is the only hard gate.
8. **Implement directly from the spec, inline.** No plan document, no per-task subagents (Subagent rule).
   Atomic changes, harnesses green, then the Documentation Integrity Protocol in the same pass.

The ratchet is one-way: hidden complexity found mid-task means stop, say so, and step up a tier.
