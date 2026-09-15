# `index.html` Decomposition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Split the 751,825-byte `index.html` into ~23 small per-game partials assembled by a dev-only Node script, without changing a single shipped byte.

**Architecture:** `src/screens/*.html` holds exact linear slices of today's `index.html`. `src/manifest.txt` lists them in order. `tools/build-index.js` concatenates them and writes `index.html`. Because the partials are exact slices joined with no separator, the output is byte-identical to the current file — which is the safety property the whole migration rests on. A versioned pre-commit hook rebuilds automatically; `tools/verify-build-fresh.js` catches staleness where the hook is absent.

**Tech Stack:** Vanilla Node (CommonJS, zero dependencies, no npm, no `package.json`) — the same shape as the 36 existing `tools/*.js` scripts. Git for Windows (`core.hooksPath`). No runtime change of any kind.

**Spec:** `docs/superpowers/specs/2026-09-15-index-decomposition-design.md`

## Global Constraints

- **Byte-identical invariant.** Until Task 9, `node tools/build-index.js && git diff --exit-code index.html` MUST come back clean. Any diff is a bug in the assembler or a mis-cut partial — never a thing to accept and move on from.
- **The file carries a UTF-8 BOM** (`ef bb bf`). It is emitted once, by the assembler, at the front of the output. Partials do not carry their own BOM.
- **LF line endings throughout.** Never write CRLF. `core.autocrlf` is `true` on this machine, which is why Task 1 exists.
- **No npm, no dependencies, no `package.json`.** Node built-ins (`fs`, `path`) only.
- **No runtime change.** No edit to any file under `js/`, `css/`, `data/`, or `sw.js`. No `CACHE_NAME` bump — nothing shipped changes.
- **Partials are exact slices joined with no separator.** `parts.join('')`, never `join('\n')`. A single inserted newline breaks the invariant.
- **Australian English** in all comments and docs (colour, organise, synthesised).
- **Never full-read `index.html`** (CLAUDE.md § Token Hygiene). Use `grep -n` then `sed -n 'A,Bp'`.

---

## File Structure

| File | Responsibility |
|---|---|
| `.gitattributes` | Pins `index.html` and `src/screens/*.html` to LF + UTF-8 so `core.autocrlf` cannot rewrite bytes underneath the assembler |
| `src/manifest.txt` | Ordered list of partials, one filename per line; `#` comments allowed. The single file edited when a partial is added or split |
| `src/screens/*.html` | Exact linear slices of `index.html`. One per game plus shell/sound/mp/scripts/terminal |
| `tools/build-index.js` | The assembler. Exports `assemble()`; writes `index.html` when run directly |
| `tools/verify-build-fresh.js` | Staleness harness. Exits non-zero if the committed `index.html` differs from a fresh assembly |
| `tools/extract-section.js` | One-time migration aid: splits a partial in three and rewrites the manifest |
| `.githooks/pre-commit` | Rebuilds and stages `index.html` on every commit |

---

### Task 1: Pin encoding before anything touches the file

**Files:**
- Create: `.gitattributes`

**Interfaces:**
- Consumes: nothing
- Produces: a repo where `index.html` bytes are stable across checkout — the precondition for every later byte comparison

**⚠ Executed 15 Sep 2026 — with two deviations from the steps as first written. Both are recorded below rather than tidied away.**

- [x] **Step 1: Record the ground-truth hash — and check git's view of line endings**

```bash
git status --porcelain index.html   # MUST be empty; stop if not
git ls-files --eol index.html       # ← the step that was missing, and mattered
sha256sum index.html
wc -c index.html
```

**Deviation 1 — the original step measured the wrong file.** `git ls-files --eol` reported
`i/lf w/crlf`: the working tree was **CRLF** (763,121 bytes) while the committed blob — the file
GitHub Pages serves — was **LF** (751,825 bytes). An earlier `od -c | grep` check had missed this
because `od -c` puts whitespace between `\r` and `\n`, so the pattern could not match. Every byte
figure in the spec and this plan was the local CRLF number and has been corrected to **751,825**.

- [x] **Step 2: Create `.gitattributes`** (as shipped)

```text
# index.html is a GENERATED artefact, assembled by tools/build-index.js from
# src/screens/. Its bytes must be stable and platform-independent: core.autocrlf
# is true on the owner's machine, which would otherwise give the working tree
# CRLF while the repo (and GitHub Pages) serves LF. Pinning eol=lf makes the
# working tree, the committed blob and the shipped file all agree.
index.html          text eol=lf working-tree-encoding=UTF-8
src/screens/*.html  text eol=lf working-tree-encoding=UTF-8

# Everything else the assembler or its harnesses touch.
*.js   text eol=lf
*.json text eol=lf
*.md   text eol=lf
*.css  text eol=lf
```

- [x] **Step 3: Re-materialise the working tree under the new attributes, and prove the blob is untouched**

```bash
BLOB_BEFORE=$(git rev-parse HEAD:index.html)
rm index.html && git checkout -- index.html      # re-materialise using eol=lf
tr -cd '\r' < index.html | wc -c                 # expect 0
wc -c < index.html                               # expect 751825
[ "$BLOB_BEFORE" = "$(git rev-parse HEAD:index.html)" ] && echo "blob UNCHANGED"
git ls-files --eol index.html                    # expect i/lf w/lf attr/text eol=lf
```

**Deviation 2 — the original step used `git stash -u` + `git checkout -- .`, which is needlessly
risky** (it moves every untracked file in the tree, including `wip/`, to prove one thing about one
file). Replaced with a targeted delete-and-re-checkout of `index.html` alone. Same proof, no blast
radius.

Result: working tree now LF at 751,825 bytes, `i/lf w/lf`, blob `0c0775c7…` identical before and
after. **Nothing shipped changed.** If the blob SHA had differed, the correct response is to stop —
that would mean git rewrote the file that GitHub Pages serves.

- [x] **Step 4: Commit**

```bash
git add .gitattributes
git commit -m "chore: pin index.html encoding and line endings before decomposition"
```

---

### Task 2: The staleness harness, written first and failing

**Files:**
- Create: `tools/verify-build-fresh.js`

**Interfaces:**
- Consumes: `assemble()` from `tools/build-index.js` (Task 3 — does not exist yet, which is the point)
- Produces: `node tools/verify-build-fresh.js`, exit 0 clean / non-zero stale

- [x] **Step 1: Write the harness**

```js
// ═══════════════════════════════════════════════════════════════
// verify-build-fresh.js — is the committed index.html a faithful
// assembly of src/screens/? Exits non-zero if not.
//
// This is the layer that holds when the pre-commit hook is absent
// (a fresh clone, or a --no-verify bypass). Run it like any other
// tools/verify-*.js harness.
// ═══════════════════════════════════════════════════════════════
const fs   = require('fs');
const path = require('path');
const { assemble } = require('./build-index.js');

const OUT = path.join(__dirname, '..', 'index.html');

const built   = Buffer.from(assemble(), 'utf8');
const current = fs.readFileSync(OUT);            // raw bytes, BOM included

if (built.equals(current)) {
  console.log(`✓ index.html is fresh (${current.length} bytes)`);
  process.exit(0);
}

// Name the first differing byte — a bare "they differ" is useless at this size.
const min = Math.min(built.length, current.length);
let i = 0;
while (i < min && built[i] === current[i]) i++;
const line = current.slice(0, i).toString('utf8').split('\n').length;

console.error('✗ index.html is STALE — it does not match src/screens/.');
console.error(`  committed: ${current.length} bytes | assembled: ${built.length} bytes`);
console.error(`  first difference at byte ${i} (around line ${line})`);
console.error('  Fix: node tools/build-index.js');
process.exit(1);
```

- [x] **Step 2: Run it to verify it fails**

Run: `node tools/verify-build-fresh.js`
Expected: FAIL — `Cannot find module './build-index.js'`. That is the correct failure; the assembler is Task 3.

- [x] **Step 3: Commit**

```bash
git add tools/verify-build-fresh.js
git commit -m "test: add index.html staleness harness (fails until assembler exists)"
```

---

### Task 3: The assembler, and the identity build

The manifest starts with a single partial holding the entire current file. This proves the assembler's byte handling — BOM, encoding, line endings — *before* a single cut is made. If identity does not hold here, no later cut can be trusted.

**Files:**
- Create: `tools/build-index.js`, `src/manifest.txt`, `src/screens/_rest.html`

**Interfaces:**
- Consumes: `src/manifest.txt`, `src/screens/*.html`
- Produces: `assemble() -> string` (BOM-prefixed full document), exported via `module.exports`. Task 2 and Task 4 both depend on this exact name.

- [x] **Step 1: Create the whole-file partial and the manifest**

```bash
mkdir -p src/screens
# Strip the BOM (first 3 bytes) — the assembler re-adds it.
tail -c +4 index.html > src/screens/_rest.html
printf '%s\n' '# Ordered partials assembled into index.html by tools/build-index.js.' \
              '# Edit a partial in src/screens/, never index.html itself.' \
              '_rest.html' > src/manifest.txt
wc -c src/screens/_rest.html   # expect 751822 (751825 minus the 3-byte BOM)
```

- [x] **Step 2: Write the assembler**

```js
// ═══════════════════════════════════════════════════════════════
// build-index.js — assembles index.html from src/screens/ partials.
//
// DEV-ONLY. Not part of the runtime, not part of the PWA, not
// precached. If this script disappeared, index.html is committed and
// the app still ships — see the design spec § 5.
//
// The partials are EXACT linear slices of index.html joined with no
// separator, which is what makes the output byte-identical.
// Depends on: nothing (Node built-ins only)
// ═══════════════════════════════════════════════════════════════
const fs   = require('fs');
const path = require('path');

const ROOT     = path.join(__dirname, '..');
const SRC      = path.join(ROOT, 'src', 'screens');
const MANIFEST = path.join(ROOT, 'src', 'manifest.txt');
const OUT      = path.join(ROOT, 'index.html');
const BOM      = '﻿';

function readManifest() {
  const raw = fs.readFileSync(MANIFEST, 'utf8');
  return raw.split('\n')
    .map(l => l.replace(/\r$/, '').trim())
    .filter(l => l && !l.startsWith('#'));
}

function assemble() {
  const names = readManifest();
  if (!names.length) throw new Error('src/manifest.txt names no partials');
  const parts = names.map(name => {
    const p = path.join(SRC, name);
    if (!fs.existsSync(p)) throw new Error(`manifest names a missing partial: ${name}`);
    let s = fs.readFileSync(p, 'utf8');
    if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);   // a stray per-partial BOM
    return s;
  });
  return BOM + parts.join('');   // join('') — a single stray newline breaks identity
}

module.exports = { assemble, readManifest };

if (require.main === module) {
  const text = assemble();
  fs.writeFileSync(OUT, text, 'utf8');
  console.log(`✓ wrote index.html (${Buffer.byteLength(text, 'utf8')} bytes from ${readManifest().length} partials)`);
}
```

- [x] **Step 3: Run the harness to verify it now passes**

Run: `node tools/verify-build-fresh.js`
Expected: PASS — `✓ index.html is fresh (751825 bytes)`

- [x] **Step 4: Prove the build writes identical bytes**

```bash
node tools/build-index.js
git diff --exit-code index.html && echo "IDENTITY HOLDS"
sha256sum -c /tmp/baseline.txt
```

Expected: no diff, `index.html: OK`. **If there is any diff, stop.** Do not proceed to Task 4 — every later task assumes this holds.

- [x] **Step 5: Commit**

```bash
git add tools/build-index.js src/manifest.txt src/screens/_rest.html
git commit -m "feat(build): add dev-only index.html assembler, identity build proven"
```

---

### Task 4: The extraction tool

Cutting 23 sections by hand is 23 chances to fumble a boundary. This tool makes each cut mechanical and the byte check proves it.

**Files:**
- Create: `tools/extract-section.js`

**Interfaces:**
- Consumes: `src/manifest.txt` and `src/screens/*.html` directly (it does not import `build-index.js` — it must be able to rewrite the manifest that `build-index.js` only reads)
- Produces: `node tools/extract-section.js <partial> <startLine> <endLine> <newName>` — splits `<partial>` into up to three files and rewrites `src/manifest.txt` in place

**⚠ Line numbers are RELATIVE to the named partial, not to `index.html`.** After the first extraction the two diverge permanently. Always `grep -n` the *partial* you are about to cut, never `index.html`.

- [x] **Step 1: Write the tool**

```js
// ═══════════════════════════════════════════════════════════════
// extract-section.js — one-time migration aid. Splits a partial into
// [before][extracted][after] and rewrites src/manifest.txt in place.
// Line numbers are 1-based and RELATIVE TO THE NAMED PARTIAL.
//   node tools/extract-section.js _rest.html 340 1075 comb.html
// ═══════════════════════════════════════════════════════════════
const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC  = path.join(ROOT, 'src', 'screens');
const MANIFEST = path.join(ROOT, 'src', 'manifest.txt');

const [src, startArg, endArg, newName] = process.argv.slice(2);
if (!src || !startArg || !endArg || !newName) {
  console.error('usage: extract-section.js <partial> <startLine> <endLine> <newName>');
  process.exit(1);
}
const start = parseInt(startArg, 10), end = parseInt(endArg, 10);

const text  = fs.readFileSync(path.join(SRC, src), 'utf8');
const lines = text.split('\n');           // trailing '' preserved if file ends in \n
if (start < 1 || end > lines.length || start > end) {
  console.error(`bad range ${start}-${end}; ${src} has ${lines.length} lines`);
  process.exit(1);
}

// Rejoin with '\n' so the three pieces concatenate back to the original exactly.
const before    = lines.slice(0, start - 1).join('\n');
const extracted = lines.slice(start - 1, end).join('\n');
const after     = lines.slice(end).join('\n');

const beforeText = before    ? before + '\n'    : '';
const extractText= extracted ? extracted + '\n' : '';
const afterText  = after;

if (beforeText + extractText + afterText !== text) {
  console.error('✗ round-trip check failed — refusing to write. This is a tool bug.');
  process.exit(1);
}

// The BEFORE piece keeps the original filename, so repeated cuts do not pile up
// suffixes. The AFTER piece gets a fresh unique name — deriving it from src and
// reusing it would silently overwrite an earlier extraction's remainder.
const replacements = [];
if (beforeText) {
  fs.writeFileSync(path.join(SRC, src), beforeText, 'utf8');
  replacements.push(src);
}
fs.writeFileSync(path.join(SRC, newName), extractText, 'utf8');
replacements.push(newName);
if (afterText) {
  let n = 1, tailName;
  do { tailName = src.replace(/\.html$/, '-' + n + '.html'); n++; }
  while (fs.existsSync(path.join(SRC, tailName)));
  fs.writeFileSync(path.join(SRC, tailName), afterText, 'utf8');
  replacements.push(tailName);
}
// src was never rewritten above (no BEFORE piece) — its old content is now dead.
if (!beforeText) fs.unlinkSync(path.join(SRC, src));

const manLines = fs.readFileSync(MANIFEST, 'utf8').split('\n');
const idx = manLines.findIndex(l => l.trim() === src);
if (idx === -1) { console.error(`✗ ${src} not found in manifest`); process.exit(1); }
manLines.splice(idx, 1, ...replacements);
fs.writeFileSync(MANIFEST, manLines.join('\n'), 'utf8');

console.log(`✓ ${src} → ${replacements.join(' + ')}`);
console.log('  now run: node tools/verify-build-fresh.js');
```

- [x] **Step 2: Test it on one real section — Honeycomb Hills**

```bash
grep -n "════ HONEYCOMB HILLS ════" src/screens/_rest.html   # note the line N
wc -l src/screens/_rest.html                                  # note the last line M
node tools/extract-section.js _rest.html <N> <M> comb.html
```

- [x] **Step 3: Verify identity survived the cut**

Run: `node tools/verify-build-fresh.js`
Expected: PASS, still 751825 bytes. The file was cut in three and reassembled to the same bytes.

- [x] **Step 4: Commit**

```bash
git add tools/extract-section.js src/manifest.txt src/screens/
git commit -m "feat(build): add extraction tool; extract Honeycomb Hills partial"
```

---

### Tasks 5–8: Extract the remaining sections, newest first

**Files:**
- Create: one `src/screens/<abbr>.html` per section
- Modify: `src/manifest.txt`, the shrinking `_rest*.html` remainders

**Interfaces:**
- Consumes: `tools/extract-section.js`
- Produces: ~23 partials; `_rest*.html` remainders reduced to the head, script blocks and closing tags

**The loop is identical for every section, so it is written once here rather than repeated per game:**

```bash
# 1. Find the section's start line IN ITS CURRENT PARTIAL (never in index.html)
grep -n "════ <SECTION NAME> ════" src/screens/<partial>
# 2. Find where it ends — the next section header's line minus 1, or the partial's last line
grep -n "^\s*<!-- ═" src/screens/<partial>
# 3. Cut
node tools/extract-section.js <partial> <start> <end> <abbr>.html
# 4. Prove identity — EVERY TIME, not once per batch
node tools/verify-build-fresh.js
# 5. Commit this one extraction
git add src/ && git commit -m "refactor(build): extract <NAME> partial"
```

Order is newest-first: the recent games use a single consistent inline header format and have the cleanest boundaries, so the pattern is established before the messy sections.

- [x] **Task 5 — Batch A (cleanest, inline `<!-- ════ NAME ════` headers):** `cld`, `cjar`, `pko`, `flw`, `frt`. Verify identity after each; commit after each.
- [x] **Task 6 — Batch B:** `shp`, `nt`, `pass`, `dyb`, `gth`. Verify + commit after each.
- [x] **Task 7 — Batch C:** `bld`, `dsd`, `nat`, `lttp`, plus the `_mp.html` (multiplayer engine + global MP overlays, two adjacent sections at the old lines 5318 and 5544) and `_secret.html` (secret terminal + arcade cabinet). Verify + commit after each. **(named `_secret.html` during execution, matching the section's own "SECRET MODE" header — not `_terminal.html` as planned; see `src/manifest.txt`.)**
- [x] **Task 8 — Batch D (the messy ones, left till last deliberately):** `li5`, `gm`, `ss`, `jec`, `ygi`, and `_shell.html`.

**⚠ Batch D contains the only genuinely ambiguous cut in the file.** The section at the original line 2134 is headed `GLOBAL + GM SUPPLEMENTARY OVERLAYS` and holds the *global* `#sound-overlay` inside a *GM* block. Split it: `#sound-overlay` and the global audio chrome go to `_sound.html`; the `gm-*` overlays go to `gm.html`. Two `extract-section.js` calls, identity verified after each. If the two are interleaved rather than adjacent, leave them together in `_sound.html` and note it in the implementation notes — a correct ugly cut beats a pretty broken one.

- [x] **Final step for Tasks 5–8: confirm the shape**

```bash
node tools/verify-build-fresh.js          # still 751825 bytes
cat src/manifest.txt
wc -l src/screens/*.html | sort -n | tail -5   # largest partial ≲ 800 lines
```

---

### Task 9: The generated-file header — the one intentional byte change

Everything to here has been byte-identical. This task deliberately changes the file, so it is isolated and reviewed on its own.

**Files:**
- Modify: `tools/build-index.js`, `src/screens/<first partial>`

**Interfaces:**
- Consumes: `assemble()`
- Produces: an `index.html` whose first lines warn against hand-editing

- [x] **Step 1: Add the banner to the assembler**

Insert into `assemble()`, immediately after the BOM and before the parts:

```js
const BANNER =
  '<!-- ═══════════════════════════════════════════════════════════════\n' +
  '     GENERATED FILE — DO NOT EDIT BY HAND.\n' +
  '     Assembled by tools/build-index.js from src/screens/.\n' +
  '     Edit the partial for the game you are changing, then commit;\n' +
  '     the pre-commit hook rebuilds this file for you.\n' +
  '     A hand edit here is silently overwritten on the next build.\n' +
  '══════════════════════════════════════════════════════════════════ -->\n';
```

The banner goes immediately **after** the `<!DOCTYPE html>` line — the doctype must stay the first thing in the document. Replace the existing `return` in `assemble()` with:

```js
const body = parts.join('');
const nl   = body.indexOf('\n') + 1;   // one past the end of the DOCTYPE line
if (nl === 0) throw new Error('assembled output has no newline — manifest is wrong');
return BOM + body.slice(0, nl) + BANNER + body.slice(nl);
```

- [x] **Step 2: Rebuild and inspect the diff deliberately**

```bash
node tools/build-index.js
git diff --stat index.html          # expect exactly one hunk, +7 lines
git diff index.html | head -20
```

Expected: one added block after the DOCTYPE, nothing else. **Any other hunk is a bug — revert and investigate.**

- [x] **Step 3: Confirm the app still loads**

Open `index.html` in a browser, confirm the lobby renders and one game opens. An HTML comment after the DOCTYPE is valid and inert, but this is the first byte change and deserves a real look.

- [x] **Step 4: Commit**

```bash
git add tools/build-index.js index.html
git commit -m "feat(build): add generated-file banner to assembled index.html"
```

---

### Task 10: The pre-commit hook

**Files:**
- Create: `.githooks/pre-commit`

**Interfaces:**
- Consumes: `tools/build-index.js`
- Produces: automatic rebuild + stage on every commit, once `core.hooksPath` is set

- [x] **Step 1: Write the hook**

```sh
#!/bin/sh
# Rebuilds index.html from src/screens/ and stages it, so a partial edit can
# never ship without its assembled output. Bypassable with --no-verify, which
# is what tools/verify-build-fresh.js is for.
if git diff --cached --name-only | grep -qE '^src/'; then
  node tools/build-index.js || {
    echo "pre-commit: build-index.js failed — commit aborted." >&2
    exit 1
  }
  git add index.html
fi
exit 0
```

- [x] **Step 2: Activate and make executable**

```bash
chmod +x .githooks/pre-commit
git config core.hooksPath .githooks
```

- [x] **Step 3: Test that it actually fires**

```bash
printf '\n' >> src/screens/comb.html          # harmless whitespace change
git add src/screens/comb.html
git commit -m "test: confirm pre-commit rebuild fires"
git show --stat HEAD | grep index.html        # index.html MUST appear in the commit
```

Expected: `index.html` is in the commit although it was never staged by hand. Then revert the test change:

```bash
git revert --no-edit HEAD
node tools/verify-build-fresh.js
```

- [x] **Step 4: Commit the hook**

```bash
git add .githooks/pre-commit
git commit -m "chore(build): add versioned pre-commit hook that rebuilds index.html"
```

---

### Task 11: Documentation (Documentation Integrity Protocol)

**Files:**
- Modify: `CLAUDE.md`, `docs/code-map.md`, `docs/decision-log.md`, `docs/token-budget-register.md`, `docs/deferred-work.md`
- Create: `docs/implementation-notes/shared-implementation-notes.md` entry

- [x] **Step 1: `CLAUDE.md` § Anti-Patterns — scope the rule, do not delete it**

Replace the `Do NOT add a build step` bullet with:

```markdown
- Do NOT add a build step **to the runtime** — no `npm`/`webpack`/bundler, no
  transpile, nothing between the repo and what GitHub Pages serves.
  **Sanctioned exception (15 Sep 2026):** `tools/build-index.js`, a dev-only
  assembler with zero dependencies that concatenates `src/screens/*.html` into
  the committed `index.html`. The output is committed, so deleting the script
  still leaves a shippable app. Rationale and the process that approved it:
  `docs/cost-envelope.md` § 7 and
  `docs/superpowers/specs/2026-09-15-index-decomposition-design.md`.
  (`tools/*.js` verification harnesses remain dev tooling, not a build.)
```

- [x] **Step 2: `CLAUDE.md` § Token Hygiene — retarget the never-full-read rule**

The rule survives; its target changes. Note that per-game markup now lives in `src/screens/[abbr].html` (~350–750 lines, safe to read whole) and that `index.html` is generated and should essentially never be read.

- [x] **Step 3: `CLAUDE.md` § Verification harnesses — add the row**

```markdown
| Build | `node tools/verify-build-fresh.js` — is the committed `index.html` a faithful assembly of `src/screens/`? **Re-run after any markup change** | 1 |
```

- [x] **Step 4: `docs/code-map.md` — Per-Game Offset Map becomes a file map**

Replace line-offset accelerators with partial filenames. Note in the section that offsets no longer rot on every edit — a secondary win of this migration.

- [x] **Step 5: `docs/deferred-work.md` — two fixes promised during planning**

1. The lobby entry's plan is reversed to match the recorded owner decision (`wip/lobby-lab/OWNER-REVIEW.md` item 6 and `DESIGN-NOTES.md` line 83, both of which say TV mode comes first). Correct order: **TV-mode sandbox round → lobby implementation (Shelves + TV) → one combined ship.**
2. Kill the naming collision. That entry uses "build-step" to mean *the lobby's implementation round*, while `cost-envelope.md` § 7 uses it for *this* work. Rename the lobby one to "the lobby implementation round" throughout.

- [x] **Step 6: `docs/token-budget-register.md` § 5 Lever A — mark resolved**

Point at the spec and this plan; record the measured before/after (751,825 bytes in one file → ~23 partials of ~350–750 lines).

- [x] **Step 7: `docs/decision-log.md` — one entry, newest on top**

Confluence Snapshot shape. **Decision:** adopt a dev-only assembly build for `index.html`, superseding the 2026-06-30 deferral whose trigger fired at 751,825 bytes / 20 games. **Rationale:** the owner wanted all four wins, and hand-editable markup is the one discipline cannot buy; option A was chosen over runtime assembly because its failure mode is loud and at dev time rather than silent on a player's phone. **Technical Impact:** `src/screens/` + `tools/build-index.js` + `tools/verify-build-fresh.js` + `.githooks/pre-commit`; zero runtime change, no `CACHE_NAME` bump.

- [x] **Step 8: `shared-implementation-notes.md` — the lessons**

What happened → root cause → lesson, for: the BOM and `core.autocrlf` landmine (§ 3.3); the discovery that 12 games already tolerate late markup (§ 3.1) and that only 9 files still bind at parse time (§ 3.2); and the mixed-ownership section at the old line 2134 (§ 3.4).

- [x] **Step 9: Final verification**

```bash
node tools/verify-build-fresh.js
node tools/verify-mp-configs.js
node tools/verify-identity-docs.js
git status --porcelain            # clean
```

Expected: all pass. No `sw.js` change, no `CACHE_NAME` bump — nothing shipped changed beyond Task 9's banner.

- [x] **Step 10: Commit**

```bash
git add CLAUDE.md docs/
git commit -m "docs: record index.html decomposition (Lever A resolved)"
```

---

## Out of scope

- **Moving the scattered `<script>` tags to the end of the document.** Spec § 3.2 notes this would make the 9 parse-time binders safe, but it is a *byte change* and therefore cannot ride the identity invariant. It is a separate, optional follow-up with its own verification — not part of this migration.
- **Converting the 9 parse-time binders** to `DOMContentLoaded`. Unnecessary; see above.
- **Splitting `js/` or `css/`.** Only `index.html` crossed the line.
- **The lobby redesign.** Lands into this structure afterwards, as its own task.
