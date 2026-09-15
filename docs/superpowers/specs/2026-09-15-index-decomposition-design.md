# Design — `index.html` decomposition (Lever A)

**Date:** 15 Sep 2026 · **Status:** design, pending owner review · **Tier:** 2 (architectural)
**Supersedes the deferral in:** `docs/decision-log.md` 2026-06-30 "No-build constraint reviewed"
**Context:** `docs/cost-envelope.md` § 7 · `docs/token-budget-register.md` § 5 Lever A

---

## 1. Why now

The 2026-06-30 decision deferred — explicitly did not reject — a dev-only assembly build, with a
revisit trigger of **`index.html` crossing ~750 KB or the suite reaching ~20 games, whichever came
first.** Both fired:

| Condition | Trigger | Measured 15 Sep 2026 |
|---|---|---|
| `index.html` size | ~750 KB | **751,825 bytes** shipped (11,296 lines) |
| Game count | ~20 | **20**, met exactly |

> **Measurement correction (15 Sep 2026, during implementation).** `docs/cost-envelope.md` and
> `docs/token-budget-register.md` both record **763,121 bytes**. That is the *local working-tree*
> size on a Windows machine with `core.autocrlf = true` — it includes one carriage return per line
> (11,296 of them) that is **not** in the committed blob and never reaches GitHub Pages. The shipped
> file is **751,825 bytes**, LF.
>
> This slightly weakens the size half of the trigger: 751,825 bytes is **751.8 KB decimal (past the
> ~750 KB line) but 734 KiB (under it)**, where the envelope claimed "at the line on either reading".
> **The decision is unaffected** — the trigger was "whichever came first", and the game-count
> condition is met exactly at 20. Both source documents are corrected in Task 11 of the plan.

The owner confirmed all four candidate wins are wanted, not just the original one:

1. **Session/token cost** — the file is the project's largest avoidable context sink.
2. **Hand-editable markup** — a game's markup in a file the owner can open, not a line range.
3. **Room to keep growing** — games 21+ and the lobby's four layouts keep inflating one file.
4. **Merge/edit safety** — smaller files contain the blast radius of a bad edit.

**Win 2 is decisive and eliminates the status quo.** Discipline (never full-read, Grep-then-offset)
buys win 1 and nothing else; it cannot produce a small file to open. The choice is therefore between
assembly strategies, not between acting and not acting.

---

## 2. Decision

**Adopt option A — a dev-only assembly build.** `src/screens/*.html` partials are concatenated into
the shipped `index.html` by a plain Node script in `tools/`. The runtime is unchanged: GitHub Pages
serves the same single `index.html` it serves today.

### Options considered

| | **A. Dev-only build** (chosen) | **B. Runtime assembly** | **C. CI-assembled** |
|---|---|---|---|
| Mechanism | `src/` partials → Node script → committed `index.html` | Plugins fetch their own markup at boot | As A, but a GitHub Action runs it on push |
| Runtime risk | **None** — output byte-identical | A partial that fails to fetch is a silently missing game | None |
| Boot-order work | None | Convert 9 files off parse-time DOM **and** move all 23 `DOMContentLoaded` bindings to a gated `syllyReady` | None |
| SW / offline | Unchanged | ~20 new precache entries, new failure modes | Unchanged |
| Failure mode | Stale markup ships — **loud, at dev time** | Broken game on a player's phone — **silent, in production** | Action breaks, owner cannot ship at all |

**Why not B.** Its failure lands on a player's device where neither owner nor agent observes it,
which is the wrong place for risk in an aggressively offline-first PWA. Its boot-order cost is also
real (§ 3.2).

**Why not C.** It dissolves the "owner stuck at 11 pm" objection on paper, then reintroduces it
worse: a broken Action blocks shipping entirely, and debugging YAML is further from the owner's
competence than re-running a script.

**The objection that deferred this in 2026 — owner-facing fragility — is answered in § 5, not
dismissed.** It remains the load-bearing concern.

---

## 3. Findings that shape the design

All measured 15 Sep 2026 against the live repo.

### 3.1 Late markup is already the norm

**4,130 lines of markup already sit after the last `<script>` tag** (line 7166). Twelve games
(PASS → COMB) parse their plugin JS before their markup exists in the DOM, and have always worked.
`js/games/cld.js:627` documents the contract explicitly: *"parse time except constant declarations
and the DOMContentLoaded binding."*

### 3.2 The parse-time binders are a minority — and option A fixes them for free

Audit of all 23 plugin/shared files:

- **14 already clean** — zero top-level DOM access, all binding inside `DOMContentLoaded`: `cjar`,
  `cld`, `comb`, `dyb`, `flw`, `frt`, `gth`, `lttp`, `nat`, `nt`, `pass`, `pko`, `shp`,
  `engine-multiplayer`.
- **9 still bind at parse time** — `secret-signals` (64 top-level lookups), `great-minds` (63),
  `bld` (47), `dsd` (47), `jec` (45), `li5` (42), `ygi` (41), `controller.js` (9),
  `secret-mode.js` (8).

Option B would require converting all nine as a *precondition*. Option A does not: the nine keep
working exactly as they do today, because the assembled output is unchanged.

**A later, optional follow-up makes them safe for free** — emitting all markup before all scripts
means every element exists when any plugin runs, retiring the fragility without touching the nine
files. **That is deliberately NOT part of this migration:** moving the script tags changes bytes,
so it cannot ride the byte-identical invariant (§ 4.3) that makes the migration provably safe. It
is a separate change with its own verification, and the app is fine without it. Recorded here so
the option is not lost, not scoped in.

### 3.3 Encoding and line endings are a live landmine

- `index.html` begins with a **UTF-8 BOM** (`ef bb bf`). This is the origin of the recorded mojibake
  hazard that already bans Edit-tool sweeps on this file.
- **`core.autocrlf = true` with no `.gitattributes`.** Measured during implementation: the working
  tree was **CRLF** (11,296 carriage returns) while the committed blob was **LF**. An assembler
  writing LF would have left `git diff` clean — git normalises on staging — while silently changing
  11,296 bytes on disk, so a working-tree hash check would have failed for a reason unrelated to any
  mis-cut. The two views of the file must be made to agree before any of this is trustworthy.

**Both are pinned in Task 1, before the assembler runs once.** `.gitattributes` sets `eol=lf` on
`index.html` and `src/screens/*.html`; the working tree was re-materialised to LF and the committed
blob verified unchanged (`0c0775c7…` before and after). The byte-identical invariant (§ 4.3) is
therefore measured against **751,825 LF bytes** — the file GitHub Pages actually serves.

### 3.4 The sections do not divide mechanically

Three distinct header formats are in use (inline `<!-- ════ NAME ════`, name-on-next-line, and a
three-line boxed form), and at least one section mixes ownership: line 2134 is
`GLOBAL + GM SUPPLEMENTARY OVERLAYS`, holding the global `#sound-overlay` inside a GM block.

**Consequence:** the split is a one-time assisted cut driven by content ownership, not a regex over
header comments. This is the main argument for the incremental migration in § 6.

### 3.5 The build is not a new class of thing

No `package.json`, no npm, **36 existing `tools/*.js` scripts**. The assembler is the 37th plain Node
script in a directory already full of them — zero dependencies, nothing to install. This materially
narrows what "adding a build step" means here.

---

## 4. The design

### 4.1 Layout

```text
src/screens/
  _shell.html          lobby, #screen-who-first, engine-global chrome
  _sound.html          #sound-overlay and global audio chrome
  _mp.html             multiplayer engine screens + global MP overlays
  li5.html  gm.html  ss.html  jec.html  ygi.html  lttp.html  nat.html
  dsd.html  bld.html  gth.html  dyb.html  pass.html  nt.html  frt.html
  shp.html  flw.html  pko.html  cjar.html  cld.html  comb.html
  _terminal.html       secret terminal + arcade cabinet
tools/build-index.js         the assembler
tools/verify-build-fresh.js  the staleness harness
.githooks/pre-commit         versioned hook
```

**One file per game.** Owner decision, 15 Sep 2026: a coarser split has the same growth curve merely
shifted, arriving back at this problem around game 26 with no structure gained. The shell is likewise
split three ways rather than lumped, because the lobby redesign is about to add four switchable
layouts to exactly that section.

### 4.2 The assembler

`tools/build-index.js` reads an ordered manifest, concatenates partials into a template, writes
`index.html`. Requirements:

- **Explicit UTF-8, BOM preserved** — emit `ef bb bf`, never let Node infer.
- **Explicit LF line endings**, independent of `core.autocrlf`.
- **Pure and total** — no network, no npm, no environment dependence. Same inputs, byte-identical
  output on any machine. (Same contract as `js/lib/physics.js`.)
- **Partials are exact linear slices joined with no separator** — `parts.join('')`. A single
  inserted newline breaks § 4.3. Script tags keep their current positions, inside their own
  partials; reordering them is the out-of-scope follow-up noted in § 3.2.
- Emits a loud generated-file header into `index.html`: do not hand-edit, edit `src/screens/`
  instead. This is the one deliberate byte change, made after the migration is proven.

### 4.3 The byte-identical invariant — the core safety property

**Milestone one is an assembler that reproduces the current `index.html` byte for byte.** Same BOM,
same line endings, same 751,825 bytes.

```sh
node tools/build-index.js && git diff --exit-code index.html
```

Until that passes, nothing else proceeds. When it passes, the refactor is *provably*
behaviour-neutral: identical bytes, identical app, zero runtime risk. No test suite offers a stronger
guarantee, and it is available here only because the runtime output is unchanged by design — which is
itself the argument for option A.

### 4.4 Staleness prevention — three layers

The owner asked whether good practice covers the drawback. It does not on its own; a rule that says
"always run the build" holds until the one night it matters. Three layers, only the weakest of which
is a practice:

1. **Mechanical — `.githooks/pre-commit`.** Rebuilds and stages `index.html`. Committed to the repo
   and activated once via `git config core.hooksPath .githooks`. **The owner commits as normal.**
2. **Safety net — `tools/verify-build-fresh.js`.** Rebuilds in memory, compares against the committed
   `index.html`, exits non-zero on mismatch. Versioned, runs like the other 36 harnesses. This is the
   layer that actually holds: git hooks are not committed by default, so a fresh clone or a
   `--no-verify` bypass has no layer 1.
3. **Process — a CLAUDE.md rule.** Any task touching markup ends with a build plus that harness,
   exactly like the existing "re-run the game's harnesses after touching its appliers" rule.

### 4.5 Encoding pinning

A `.gitattributes` is added before any assembly work:

```text
index.html          text eol=lf working-tree-encoding=UTF-8
src/screens/*.html  text eol=lf working-tree-encoding=UTF-8
```

This closes § 3.3 and is a prerequisite for § 4.3, not a follow-up to it.

---

## 5. Answering the owner-fragility objection

The 2026-06-30 deferral turned on one concern: a non-coder owner stuck behind a broken build. That
concern is respected, not waived.

| Fear | Answer |
|---|---|
| "I have to remember a command" | No — the hook runs it on commit (§ 4.4 layer 1). |
| "The build breaks and I cannot ship" | The assembler has no dependencies and no network. Its only realistic failure is a malformed partial, which `verify-build-fresh.js` names precisely. |
| "I cannot debug it at 11 pm" | The escape hatch is total: `index.html` is committed and complete. If the assembler were deleted, the app still ships and still works. |
| "It is forbidden by our own rules" | It is — which is why § 7 amends that rule through the cost envelope's process rather than around it. |

**The escape hatch is the real answer.** Unlike a bundler, nothing here is *required* to produce a
working app; the committed artefact is always valid on its own.

---

## 6. Migration plan (shape only — detailed plan follows separately)

Incremental, one section per step, because § 3.4 makes a single sweep unsafe:

1. Pin encoding (`.gitattributes`), confirm a clean tree.
2. Build the assembler against a manifest naming a single partial holding **the entire current
   file**. Prove byte-identical. This validates the assembler before any cutting.
3. Extract one section. Rebuild. Prove byte-identical. Commit.
4. Repeat per section, newest/cleanest games first (they have the clearest boundaries), leaving the
   mixed-ownership sections (§ 3.4) for last when the pattern is established.
5. Add the harness and the hook.
6. Documentation Integrity Protocol pass; SW version bump only if any shipped byte changed — which,
   if § 4.3 held throughout, it did not.

**Every step is independently revertible**, and a mis-cut is caught by the next byte-identical check
rather than discovered later.

---

## 7. Documentation changes required

1. **`CLAUDE.md` § Anti-Patterns** — "Do NOT add a build step" is scoped rather than deleted: no
   bundler, no npm, no build in the **runtime** path; the dev-only assembler is named as the
   sanctioned exception with a pointer to `docs/cost-envelope.md`. This is the first constraint to go
   through the envelope's tier process, which is the mechanism for loosening constraints
   case-by-case as the project matures — the owner's stated preference (15 Sep 2026) is to loosen
   *slowly* and only when something real pushes on a rule.
2. **`CLAUDE.md` § Token Hygiene** — the never-full-read rule survives but its target changes: the new
   advice is to read `src/screens/[abbr].html`.
3. **`docs/code-map.md`** — the Per-Game Offset Map becomes a per-game *file* map. Line offsets stop
   rotting on every edit, which is a secondary win worth naming.
4. **`docs/decision-log.md`** — one entry recording this decision and superseding 2026-06-30.
5. **`docs/token-budget-register.md`** § 5 Lever A — marked resolved, pointing here.

---

## 8. Out of scope

- **Any runtime change.** If a shipped byte differs, the migration has failed its own invariant.
- **The lobby redesign.** It lands *into* this structure afterwards; the two remain separate tasks
  (`docs/cost-envelope.md` § 7: "should not be folded into it").
- **Converting the 9 parse-time binders.** § 3.2 makes this unnecessary. A later tidy-up, not a
  prerequisite.
- **Splitting `js/` or `css/`.** Only `index.html` is over the line.
- **A broader anti-patterns rewrite.** § 7 item 1 only. Future loosening goes case-by-case.

---

## 9. Success criteria

1. `node tools/build-index.js && git diff --exit-code index.html` passes on a clean tree.
2. `node tools/verify-build-fresh.js` exits 0 clean, non-zero against a planted stale edit.
3. Every game's markup lives in its own `src/screens/*.html`. Measured section sizes run ~350–750
   lines (largest today: 743); none should exceed ~800 after the cut.
4. `git commit` requires no new manual step once `core.hooksPath` is set.
5. Deleting `tools/build-index.js` leaves a working, shippable app.
6. All existing verification harnesses still pass unchanged.
