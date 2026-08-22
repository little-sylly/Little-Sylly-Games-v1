# Game Identity Docs — Pass #1 (CJAR) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the first per-game identity document (`docs/game-identities/cjar.md`), the harness that keeps every future one honest (`tools/verify-identity-docs.js`), and the one-time protocol amendments that make the remaining 17 passes routine.

**Architecture:** Pass #1 is the exemplar pass. It produces three things the other 17 passes consume: a finished document that later passes copy the shape of, a harness that mechanically verifies the one section prone to silent drift, and conditional wording in `CLAUDE.md` + `phase-audit.md` that stays correct for the whole migration without further edits. CJAR's section is then deleted from `docs/rules/game-identities.md` and its technical residue redistributed.

**Tech Stack:** Node (zero dependencies, matching every other `tools/verify-*.js`), Markdown. No application code changes.

**Spec:** `docs/superpowers/specs/2026-08-22-game-identity-docs-design.md`

## Global Constraints

Copied verbatim from the spec. Every task's requirements implicitly include these.

- **Australian English throughout** — colour, flavour, organise, recognise. Metric only. Applies to prose *about* the games, not only to quoted copy.
- **No application code changes. No SW version bump.** `index.html`, `js/`, `css/`, `sw.js` are read-only for this entire plan.
- **Never full-read `index.html` (~515 KB), `docs/code-map.md` (~132 KB) or `docs/rules/game-identities.md` (~225 KB).** Grep for the anchor, then offset-Read the slice. CJAR's `index.html` block is **lines 9382–9848**; its `game-identities.md` section is **lines 2163–2320**.
- **Hard exclusion list** — none of these appear in an identity document: screen/overlay element IDs *as a reference table*; packet names, envelope shapes, handler lists; `rosterConfig`, host-as-participant, private-channel mechanics; internal state variable or function names; Tailwind/CSS class strings, z-indices; DD-XX / BUG-XX rationale; state-flow diagrams. The single exception is T7a's flow table, which carries screen IDs as a **locator column**.
- **Verbatim copy is verbatim.** T7b reproduces what is on screen, typos and all. A wrong string is fixed in the code and then in the document, never in the document alone.
- **Judgement marks.** T7c and T10's "Could it be Pass-the-Phone?" line carry `◇ judgement, not spec`. A proposal written into a doc but not yet built carries `◇ proposed`.
- **Target size 15–25 KB.** Materially over 25 KB means technical content has leaked in.
- **Never use the Edit tool for systematic changes to `index.html`** — UTF-8 mojibake risk. Not applicable here (the file is read-only for this plan) but the rule stands.

## File Structure

| File | Created / Modified | Responsibility |
|---|---|---|
| `tools/verify-identity-docs.js` | Create | Extracts `copy`-fenced strings from every identity doc and asserts each exists in the shipped app. Self-tests against a fixture. |
| `tools/fixtures/identity-doc-fixture.md` | Create | Deliberately part-right, part-wrong. Proves the checker actually detects drift. |
| `docs/game-identities/cjar.md` | Create | The exemplar identity document, T1–T10. |
| `docs/rules/game-identities.md` | Modify | Delete `## Game 18: Cookie Jar (CJAR)` (lines ~2163–2320). |
| `docs/code-map.md` | Modify | Absorb CJAR's screen + overlay reference tables if not already present. |
| `docs/implementation-notes/cjar-implementation-notes.md` | Modify | Absorb any DD-XX rationale that exists only in `game-identities.md`. |
| `CLAUDE.md` | Modify | Tracker column, conditional pointer, Documentation Integrity Protocol step 2. |
| `docs/rules/phase-audit.md` | Modify | Five checklist items re-pointed at identity docs. |
| `docs/decision-log.md` | Modify | One entry (this is a process-level decision). |

---

### Task 1: The harness

**Files:**
- Create: `tools/verify-identity-docs.js`
- Create: `tools/fixtures/identity-doc-fixture.md`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `node tools/verify-identity-docs.js` — exits 0 when every `copy` block in every `docs/game-identities/*.md` is found in source, 1 otherwise. `node tools/verify-identity-docs.js --self-test` — exits 0 when the checker correctly identifies exactly the fixture's planted failures. Tasks 3 and 5 run the first form; Task 7 lists both in `CLAUDE.md`.

- [ ] **Step 1: Branch off main**

The repo is on `main`. Do not commit this work to it.

```bash
git checkout -b docs/game-identity-pass1
```

- [ ] **Step 2: Write the fixture with planted failures**

Create `tools/fixtures/identity-doc-fixture.md`. Three blocks: one where every string is real CJAR copy, one where every string is invented, and one exercising comments, blank lines and an HTML entity. The invented strings are the planted failures — they must stay wrong forever.

````markdown
# Fixture — identity-doc harness self-test

NOT a real identity document. Its filename stem is `identity-doc-fixture`, so
no plugin file matches and the JS haystack is empty — every string below is
checked against `index.html` alone, which is where all the real ones come from.
Three blocks: block A is entirely real, block B is entirely invented, block C
exercises comments, blank lines and an entity. Expected: exactly 3 failures,
all from block B.

## Block A — every string real

```copy
# screen-cjar-menu
Raid the Jar!
How to Play
Settings
← Back to the Box
```

## Block B — every string invented (3 planted failures)

```copy
Grab The Biscuit Tin
Nibble Quietly Away
Custard Cream Catastrophe
```

## Block C — comments, blanks and an entity

```copy
# screen-cjar-table — comment line, must be skipped

Next from Jar
Left in Jar
what's come out &rsaquo;
```
````

Note `what's come out &rsaquo;` — it is written in `index.html` with the entity, and the checker must decode it to `›` before comparing.

- [ ] **Step 3: Run the harness to verify it does not yet exist**

Run: `node tools/verify-identity-docs.js --self-test`
Expected: FAIL — `Cannot find module` (the file has not been written).

- [ ] **Step 4: Write the harness**

Create `tools/verify-identity-docs.js`:

```js
// ═══════════════════════════════════════════════════════════════════════════
// verify-identity-docs.js — asserts every quoted UI string in a per-game
// identity document still exists in the shipped app.
//
//   node tools/verify-identity-docs.js              (exits 1 on any failure)
//   node tools/verify-identity-docs.js --self-test  (proves the checker works)
//
// Guards docs/game-identities/<abbr>.md § T7b. Those sections reproduce every
// visible string in a game verbatim, and a mirrored string drifts silently the
// moment a label is edited. A confidently-wrong identity doc handed to an art
// or copy contractor is worse than no doc at all — and the review loop the docs
// exist for (change the doc, then change the code) only closes if drift is
// caught mechanically.
//
// Precedent for why this is not paranoia: docs/superpowers/plans/
// 2026-08-14-flw-gem-seam.md records game-identities.md § Game 16 as
// "currently documents a different game" — a whole section had drifted into
// fiction because nothing checked it.
//
// What is checked: ONLY fenced blocks tagged ```copy. Prose quotes elsewhere
// (T5's terminology, T3's rules text) are paraphrase, not copy, and are ignored
// by design.
//
// Source of truth is index.html + the game's own plugin file, nothing else.
// Three haystacks are searched: index.html normalised, index.html with tags
// replaced by spaces (so a string split by an inline <span> still matches), and
// the plugin file normalised. A hit in any one passes.
//
// --self-test runs the checker against tools/fixtures/identity-doc-fixture.md,
// whose contents are DELIBERATELY part right and part wrong, and asserts it
// finds exactly the planted failures. Without it, a checker that silently
// matches everything passes forever. Same discipline as verify-cjar-loopback's
// CJAR_SRC= — prove the test fails before trusting that it passes.
// ═══════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// The plugin filename is NOT always the abbreviation — gm and ss are legacy.
const PLUGIN = { gm: 'great-minds', ss: 'secret-signals' };

const ENTITIES = {
  amp: '&', nbsp: ' ', lt: '<', gt: '>', quot: '"', apos: "'",
  rsaquo: '›', lsaquo: '‹', mdash: '—', ndash: '–',
  hellip: '…',
};

function decode(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&([a-zA-Z]+);/g, (m, n) => (n in ENTITIES ? ENTITIES[n] : m));
}

const norm = s => decode(s).replace(/\s+/g, ' ').trim();

// Tags become a SPACE, never nothing — otherwise "Foo</p><p>Bar" welds into
// "FooBar" and a doc claiming that string would falsely pass.
const stripTags = s => s.replace(/<[^>]*>/g, ' ');

// Every ```copy block's payload. Blank lines and lines starting '#' are
// comments — that is how a block records which screen it belongs to.
function copyStrings(md) {
  const out = [];
  let inBlock = false;
  md.split(/\r?\n/).forEach((line, i) => {
    if (/^\s*```copy\s*$/.test(line))      { inBlock = true;  return; }
    if (inBlock && /^\s*```\s*$/.test(line)) { inBlock = false; return; }
    if (!inBlock) return;
    const t = line.trim();
    if (!t || t.startsWith('#')) return;
    out.push({ text: t, line: i + 1 });
  });
  return out;
}

function haystacksFor(abbr) {
  const html   = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const jsFile = path.join(ROOT, 'js/games', `${PLUGIN[abbr] || abbr}.js`);
  const js     = fs.existsSync(jsFile) ? fs.readFileSync(jsFile, 'utf8') : '';
  return [norm(html), norm(stripTags(html)), norm(js)];
}

// Returns an array of { doc, line, text } for every string not found.
function checkDoc(docPath) {
  const abbr = path.basename(docPath, '.md');
  const hay  = haystacksFor(abbr);
  return copyStrings(fs.readFileSync(docPath, 'utf8'))
    .filter(s => { const n = norm(s.text); return !hay.some(h => h.includes(n)); })
    .map(s => ({ doc: path.basename(docPath), line: s.line, text: s.text }));
}

const selfTest = process.argv.includes('--self-test');

console.log(`Identity docs — copy verification${selfTest ? ' (SELF-TEST)' : ''}`);
console.log('='.repeat(48));

if (selfTest) {
  const fixture = path.join(ROOT, 'tools/fixtures/identity-doc-fixture.md');
  const found   = checkDoc(fixture).map(f => f.text).sort();
  const planted = [
    'Custard Cream Catastrophe',
    'Grab The Biscuit Tin',
    'Nibble Quietly Away',
  ];
  const ok = JSON.stringify(found) === JSON.stringify(planted);
  console.log(ok ? '  PASS  checker finds exactly the planted failures'
                 : '  FAIL  checker did not find exactly the planted failures');
  if (!ok) {
    console.log(`          expected ${JSON.stringify(planted)}`);
    console.log(`          got      ${JSON.stringify(found)}`);
  }
  console.log(`\n${'='.repeat(48)}`);
  console.log(ok ? 'SELF-TEST PASSED' : 'SELF-TEST FAILED');
  process.exit(ok ? 0 : 1);
}

const dir = path.join(ROOT, 'docs/game-identities');
if (!fs.existsSync(dir)) {
  console.log('  no docs/game-identities/ yet — nothing to check');
  process.exit(0);
}

const docs = fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort();
if (!docs.length) {
  console.log('  no identity docs yet — nothing to check');
  process.exit(0);
}

let failures = 0;
for (const f of docs) {
  const bad = checkDoc(path.join(dir, f));
  const n   = copyStrings(fs.readFileSync(path.join(dir, f), 'utf8')).length;
  console.log(`\n${f} — ${n} string(s) checked`);
  if (!bad.length) { console.log('  PASS  every string found in source'); continue; }
  failures += bad.length;
  bad.forEach(b => console.log(`  FAIL  ${b.doc}:${b.line}  ${JSON.stringify(b.text)}`));
}

console.log(`\n${'='.repeat(48)}`);
console.log(failures ? `FAILED — ${failures} string(s) not found in source`
                     : 'ALL CHECKS PASSED');
process.exit(failures ? 1 : 0);
```

- [ ] **Step 5: Run the self-test to verify it passes**

Run: `node tools/verify-identity-docs.js --self-test`
Expected: PASS — `checker finds exactly the planted failures`, then `SELF-TEST PASSED`, exit 0.

If block A or block C strings show up as failures, the normalisation or entity decoding is wrong — fix that, do **not** edit the fixture. Block A and C strings are real; they must be found.

- [ ] **Step 6: Run the normal mode against an empty world**

Run: `node tools/verify-identity-docs.js`
Expected: `no docs/game-identities/ yet — nothing to check`, exit 0.

- [ ] **Step 7: Commit**

```bash
git add tools/verify-identity-docs.js tools/fixtures/identity-doc-fixture.md
git commit -m "feat(docs): add verify-identity-docs harness with self-test"
```

---

### Task 2: CJAR identity doc — header, T3, T5, T6

**Files:**
- Create: `docs/game-identities/cjar.md`
- Read: `docs/rules/game-identities.md:2163-2320`, `js/games/cjar.js`, `docs/cjar-content-guide.md`

**Interfaces:**
- Consumes: nothing from Task 1 (the harness only reads `copy` blocks, which arrive in Task 3).
- Produces: the file `docs/game-identities/cjar.md` with its header block and sections `## T3 — How to Play`, `## T5 — Terminology`, `## T6 — Settings`. Tasks 3–5 append to this same file.

- [ ] **Step 1: Read the source material**

```bash
sed -n '2163,2320p' docs/rules/game-identities.md
cat docs/cjar-content-guide.md
grep -n "CJAR_\|cjarSnackFriendly\|cjarHouseRules\|cjarMatchLength\|cjarDecisionTime\|cjarOpenBook\|cjarSyllyMode" js/games/cjar.js | head -60
```

Do **not** read `js/games/cjar.js` whole (1,777 lines).

- [ ] **Step 2: Write the header block**

```markdown
# Cookie Jar

**Game 18** · `activeGameId: cjar` · plugin `js/games/cjar.js`
**Emoji:** 🍪 · **Brand:** honey-gold `#D4A017` (dark ink) · **Players:** 3–8 · **Modes:** MDLM only
**Status:** gold master · verified against SW v209 on 22 August 2026
```

- [ ] **Step 3: Write T3 — How to Play**

Rules in plain English, in the order you would explain them at a table: setup → the flip loop → what busts a Raid → banking → how the Match ends → who wins. No screen names, no state flow, no `cjar*` variable names. A reader must be able to learn the game from this section alone.

Ground truth to cover, from the existing section: a Raid is one hand; flips continue until a bust, a deck-out, or everyone has Sneaked Out; a cookie card splits among everyone still in with the remainder going to Crumbs; a family card busts the Raid on its **second** sighting; Sneaking Out banks your share plus a split of the Crumbs, and alone in a bucket you also claim any unclaimed Treat; a bust wipes Raid totals but never Cookie Stashes; the Match is 3 or 5 Raids.

- [ ] **Step 4: Write T5 — Terminology**

Port the existing Terminology table. Carry the **collision rules verbatim** — they are the constraints most easily broken by a well-meaning copy edit:

- Never write the bare word "Stash" in user-facing copy — always "Cookie Stash" (collides with FRT's and FLW's "The Stash").
- "Crumb Trail", never "Cookie Trail" (collides with PKO's *The Trail*).
- "House Rules", never "Kitchen Rules" (JEC owns the kitchen metaphor suite-wide).
- In Dibber Dobber the word "Sneak" never appears — reusing the base game's verb teaches the wrong rule.

Strip the DD-XX citations (`(DD-21)`, `(BUG-03)`) — those are impl-notes' job per the exclusion list. Keep the *rule*, drop the *ticket number*.

- [ ] **Step 5: Write T6 — Settings**

Display name · options · default · what it does in play. **Drop the "Internal variable" and "Internal values" columns** — exclusion list. Six settings: Snack Friendly, House Rules, Match Length, Decision Time, Open Book, ✨ Sylly Mode (Dibber Dobber).

Record in player-facing terms that Decision Time's **No Rush is a genuine no-clock**, not a very long timer.

- [ ] **Step 6: Verify size and constraints**

```bash
wc -c docs/game-identities/cjar.md
grep -nE "z-\[|screen-cjar|DD-[0-9]|BUG-[0-9]|cjar[A-Z]|pill-active|game-toggle" docs/game-identities/cjar.md
```

Expected: the second command returns **nothing**. Any hit is an exclusion-list violation — remove it.

- [ ] **Step 7: Commit**

```bash
git add docs/game-identities/cjar.md
git commit -m "docs(cjar): identity doc — header, How to Play, Terminology, Settings"
```

---

### Task 3: CJAR identity doc — T7 The Player's Journey

**Files:**
- Modify: `docs/game-identities/cjar.md` (append)
- Read: `index.html:9382-9848` in slices, `js/games/cjar.js` (grep only)

**Interfaces:**
- Consumes: `docs/game-identities/cjar.md` from Task 2; `node tools/verify-identity-docs.js` from Task 1.
- Produces: `## T7 — The Player's Journey` containing T7a (flow table), T7b (`copy`-fenced blocks, one per screen/overlay), T7c (the judgement note). This is the section the harness guards.

- [ ] **Step 1: Enumerate the screens and overlays**

```bash
grep -n 'id="screen-cjar-[a-z-]*"' index.html
grep -n 'id="cjar-[a-z-]*overlay"' index.html
```

Expected: 6 screens (`menu`, `raid-intro`, `table`, `busted`, `raid-summary`, `gameover`) and 7 overlays (`settings`, `how-to`, `trail`, `quit`, `new-raid`, `card-view`, `tip`).

- [ ] **Step 2: Write T7a — the flow table**

One row per screen, in play order, columns `# | Screen | Beat | Type | Duration | Chrome`. Type vocabulary is `ui-style.md`'s: `Menu` · `Setup` · `Gate` · `Interstitial` · `Interactive` · `Summary` · `Result`.

`screen-cjar-raid-intro` and `screen-cjar-busted` are `Interstitial` at **5 s** (`CJAR_INTERSTITIAL_MS`) with **no chrome** — the rule-5 exemption. Confirm each screen's actual chrome rather than assuming:

```bash
sed -n '9388,9420p' index.html   # menu — adjust the window per screen
```

- [ ] **Step 3: Extract the copy, screen by screen**

For each screen and overlay, read its slice and pull the visible strings. This command gives the raw list for the whole block; use it as a checklist, then attribute each string to its screen by reading the slice:

```bash
sed -n '9382,9848p' index.html | grep -oE '>[^<>]{2,}<' | sed 's/^>//;s/<$//' | grep -vE '^\s*$'
```

Also capture JS-authored copy — labels set at runtime never appear in the markup:

```bash
grep -nE "textContent *=|innerHTML *=" js/games/cjar.js | grep -oE "'[^']{3,}'" | sort -u
```

- [ ] **Step 4: Write T7b — the copy blocks**

One `copy` block per screen/overlay, in the same order as T7a, each opening with a `#` comment naming the screen. Example shape:

````markdown
#### The menu

```copy
# screen-cjar-menu
Cookie Jar
Who took the cookies from the cookie jar?
Raid the Jar!
How to Play
Settings
← Back to the Box
```
````

**Exclude pure icon glyphs** — `🔊`, `✕`, `[?]`, bare emoji used as decoration. They are chrome, recorded in T7a's Chrome column, and add noise without adding review value. **Include** emoji that are part of a label a reader would review.

- [ ] **Step 5: Run the harness**

Run: `node tools/verify-identity-docs.js`
Expected: `cjar.md — N string(s) checked` then `PASS`, exit 0.

**Failures here are the point.** Each one means the transcribed string does not match what ships. Per spec §8.1 the fix is to **correct the document** so it matches the app — then note the string in Task 7's findings list if the shipped copy itself looks wrong. Never "fix" it by editing the code in this plan; `index.html` is read-only here.

- [ ] **Step 6: Write T7c — "Where the journey is thin"**

Two or three plain sentences naming gaps and dead moments. Open with the judgement mark:

```markdown
**Where the journey is thin** — ◇ *judgement, not spec*
```

- [ ] **Step 7: Commit**

```bash
git add docs/game-identities/cjar.md
git commit -m "docs(cjar): identity doc — The Player's Journey, harness green"
```

---

### Task 4: CJAR identity doc — T8, T9, T10

**Files:**
- Modify: `docs/game-identities/cjar.md` (append)
- Read: `js/engine-multiplayer.js:425-455`, `data/art/cjar/pack.json`

**Interfaces:**
- Consumes: `docs/game-identities/cjar.md` from Task 3.
- Produces: `## T8 — Sylly Mode`, `## T9 — Art & Assets`, `## T10 — At the Table`. The document is now structurally complete except T1, T2 and T4.

- [ ] **Step 1: Write T8 — Sylly Mode**

Dibber Dobber. What changes (no bust, nobody leaves, three actions instead of two: Reach In / Play Innocent / Dob), what it feels like, the private Favourite/Watcher affinity, Crumb Debt, and the scare-off. Name that it **supersedes** Snack Friendly — that setting's card is hidden in Dibber Dobber. Describe the affinity as "a secret each player gets" without naming the packet.

- [ ] **Step 2: Write T9 — Art & Assets**

```bash
cat data/art/cjar/pack.json | head -20
grep -c "cjar" sw.js
```

CJAR ships core art from day one — 14 JPEGs in `data/art/cjar/`, precached. Record **what exists and where it renders** (the table hero, the history strip, the card-view popup, the How-to gallery tab), and that CJAR has a two-tab How to Play (`The Rules | The Cards`) whose gallery doubles as the offline install check. **Do not record dimensions, file sizes or the per-file ceiling** — those belong to `docs/art-authoring-guide.md`.

- [ ] **Step 3: Write T10 — At the Table**

```bash
sed -n '425,455p' js/engine-multiplayer.js
```

Fields: Modes (MDLM only — each player on their own phone), Players (3–8; note 3-player balance is unsimulated), Devices (one per player), Shape-changing settings (**none** — state it explicitly rather than omitting the field), How it plays at each size, and the PTP line:

```markdown
**Could it be Pass-the-Phone?** — ◇ *judgement, not spec*
```

For CJAR the answer is no: simultaneous secret choice is the whole mechanic, and PTP would serialise it into a different game. Say that plainly.

- [ ] **Step 4: Verify constraints and size**

```bash
node tools/verify-identity-docs.js
wc -c docs/game-identities/cjar.md
grep -nE "CJAR_[A-Z]|mpSend|rosterConfig|supportedModes|multiplayerOnly|z-\[" docs/game-identities/cjar.md
```

Expected: harness exit 0; the grep returns **nothing**; size under 25 KB with T1/T2/T4 still to come.

- [ ] **Step 5: Commit**

```bash
git add docs/game-identities/cjar.md
git commit -m "docs(cjar): identity doc — Sylly Mode, Art & Assets, At the Table"
```

---

### Task 5: CJAR identity doc — T1, T2, T4 (owner checkpoint)

**Files:**
- Modify: `docs/game-identities/cjar.md` (insert T1, T2 before T3; T4 between T3 and T5)

**Interfaces:**
- Consumes: `docs/game-identities/cjar.md` from Task 4.
- Produces: the completed exemplar. Its voice in T1, T2 and T4 becomes the standard every later pass is written against — this is the task whose output the other 17 passes imitate.

**This task does not complete without owner input.** T1, T2 and T4 are new authored prose that exists nowhere in the codebase. Draft, present, revise.

- [ ] **Step 1: Draft T1 — The Pitch**

One paragraph. Why you would pick Cookie Jar off the shelf, in the voice you would use to a friend. Not the Play CTA, not marketing copy.

- [ ] **Step 2: Draft T2 — The Premise**

Two to three paragraphs. The fantasy: you are a kid with your hand in the jar and your whole family in the house. What the table feels like — everyone committing at once, the moment the card turns, the person who left one flip too late.

- [ ] **Step 3: Draft T4 — Theme & Flavour**

The world, voice and register. `docs/cjar-content-guide.md` already nails the voice — *"before dinner, in a kitchen, with people who love each other. Playful, never genuinely scary."* **Summarise and link it; do not duplicate it.** Add what the guide does not cover: what is on-theme visually, and what would be wrong (nothing genuinely frightening, no real punishment, no adult register).

- [ ] **Step 4: Present all three to the owner and revise**

Show the drafts. Apply redlines. **Do not proceed to Task 6 until the owner has signed off** — the point of the exemplar is that its voice is theirs, and 17 later documents inherit whatever ships here.

- [ ] **Step 5: Final verification**

```bash
node tools/verify-identity-docs.js
node tools/verify-identity-docs.js --self-test
wc -c docs/game-identities/cjar.md
grep -c "^## T" docs/game-identities/cjar.md   # expect 10
```

Expected: both harness runs exit 0; size 15–25 KB; exactly 10 `## T` headings.

- [ ] **Step 6: Commit**

```bash
git add docs/game-identities/cjar.md
git commit -m "docs(cjar): identity doc — Pitch, Premise, Theme & Flavour (owner-reviewed)"
```

---

### Task 6: Redistribute and delete CJAR's old section

**Files:**
- Modify: `docs/rules/game-identities.md` (delete lines ~2163–2320)
- Modify: `docs/code-map.md` (absorb screen/overlay tables if absent)
- Modify: `docs/implementation-notes/cjar-implementation-notes.md` (absorb orphan rationale if any)

**Interfaces:**
- Consumes: the completed `docs/game-identities/cjar.md` from Task 5.
- Produces: a `game-identities.md` with 17 sections and no `## Game 18:` heading. `docs/game-identities/cjar.md` is now the sole home of CJAR's identity content.

**The spec's expected outcome is *verify and delete*, not *move*** — most of the technical residue is already duplicated in `code-map.md` and the impl-notes. Finding the exception is the real work; that is why this step cannot be skipped.

- [ ] **Step 1: Check what code-map already holds for CJAR**

```bash
grep -n "cjar" docs/code-map.md | head -40
```

Compare against the Screens and Overlay Types tables in `game-identities.md:2280-2303`. Add only what is genuinely missing to `code-map.md`.

- [ ] **Step 2: Check what the impl-notes already hold**

```bash
grep -nE "DD-1[1-9]|DD-2[0-9]|DD-3[0-1]|TG-0[68]" docs/implementation-notes/cjar-implementation-notes.md | head -40
```

The old section's Special Mechanics and Three-Column Stage prose cites DD-11/12/18/19/20/23/24/25/26/27/28/29/30 and TG-06/TG-08. Any of those with content in `game-identities.md` and **not** in the impl-notes must be moved across before deletion.

- [ ] **Step 3: Account for every line, then delete the section**

Confirm the boundaries before cutting — line numbers drift:

```bash
grep -n "^## Game 18: Cookie Jar\|^## Game 17: Pecking Order" docs/rules/game-identities.md
```

Section 18 runs from its own heading to end of file. Delete it with a script, not the Edit tool.

**Use single quotes around the `node -e` script.** Inside a double-quoted bash string, `$` is a variable sigil and will corrupt any regex anchored with it — which is exactly the mistake this snippet is written to avoid. It uses `trimEnd()` instead of a regex for the same reason.

```bash
node -e '
const fs=require("fs");
const p="docs/rules/game-identities.md";
const s=fs.readFileSync(p,"utf8");
const i=s.indexOf("## Game 18: Cookie Jar");
if(i<0){ console.log("HEADING NOT FOUND"); process.exit(1); }
fs.writeFileSync(p, s.slice(0,i).trimEnd()+"\n", "utf8");
console.log("deleted from offset", i);
'
```

- [ ] **Step 4: Verify the deletion**

```bash
grep -c "Game 18" docs/rules/game-identities.md          # expect 0
grep -c "^## Game" docs/rules/game-identities.md         # expect 17
grep -n "cjar" docs/rules/game-identities.md | head      # expect only cross-references from other games, if any
```

- [ ] **Step 5: Commit**

```bash
git add docs/rules/game-identities.md docs/code-map.md docs/implementation-notes/cjar-implementation-notes.md
git commit -m "docs: retire game-identities § Game 18, residue redistributed"
```

---

### Task 7: Protocol amendments and closure

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/rules/phase-audit.md`
- Modify: `docs/decision-log.md`

**Interfaces:**
- Consumes: everything from Tasks 1–6.
- Produces: routing and protocol wording that is correct for the whole 18-pass migration and needs no further edits until the final pass. Passes #2–#18 consume this.

- [ ] **Step 1: Add the tracker column to the Per-Game Quick Index**

`CLAUDE.md` § Per-Game Quick Index. Add a final column `Identity doc`. CJAR reads ✅; the other 17 read —.

- [ ] **Step 2: Make the on-demand pointer conditional**

`CLAUDE.md:13`, the `docs/rules/game-identities.md` bullet. Replace with wording covering both states:

```markdown
- `docs/game-identities/[abbr].md` — the game's **identity doc**: pitch, premise, how to play,
  theme, terminology, settings, the player's journey + all UI copy, Sylly Mode, art, table shape.
  15–25 KB — **read whole**. **Read when:** any non-technical work on one game — review, copy,
  art brief, or learning what the game is. Verified by `tools/verify-identity-docs.js`.
- `docs/rules/game-identities.md` — **being retired**, one game per pass. Holds only the games whose
  Identity doc column reads — in the Quick Index. **225 KB — never read whole.** **Read when:** an
  unmigrated game needs its old section — Grep `## Game N:`, offset-Read that section only.
```

Also update the § Per-Game Quick Index preamble (`CLAUDE.md:25`) so it points at identity docs first.

- [ ] **Step 3: Amend the Documentation Integrity Protocol**

`CLAUDE.md:138`, step 2. Replace:

```markdown
2. `docs/game-identities/[abbr].md` — terminology, settings, the player's journey + UI copy, Sylly
   Mode, art. *(For a game whose Identity doc column still reads —, this means its `## Game N:`
   section in `docs/rules/game-identities.md` instead.)* **Screen and overlay reference tables are
   step 1's job, not this one.**
```

Also amend the § Enforcement line (`CLAUDE.md:146`) which names `game-identities.md` directly.

- [ ] **Step 4: Amend phase-audit.md's five checklist items**

`docs/rules/phase-audit.md` lines ~20, 22, 62, 64, 100. Re-point each at the identity doc with the same conditional fallback. Two of them gain a mechanical check:

- Terminology coverage → *"…or run `node tools/verify-identity-docs.js`, which covers this mechanically for a migrated game."*
- Quit overlay copy → same.

Leave line 23 alone — it already says `code-map.md` is the source of truth for state variables, which agrees with the spec's exclusion list.

- [ ] **Step 5: Register the harness in CLAUDE.md**

Add two rows to § Verification harnesses:

| Game | Command | Checks |
|------|---------|--------|
| Identity docs | `node tools/verify-identity-docs.js` — every `copy` block in `docs/game-identities/` against shipped source | per-doc |
| Identity docs | `node tools/verify-identity-docs.js --self-test` — proves the checker detects planted drift | 1 |

- [ ] **Step 6: Add the decision-log entry**

`docs/decision-log.md`, newest on top, ~4 lines. Record: per-game identity docs replace `game-identities.md`; retirement is incremental, one section per pass; the harness guards quoted copy; the Documentation Integrity Protocol's step 2 changed. Point at the spec, not a summary of it.

- [ ] **Step 7: Impl-notes — only if a genuine lesson emerged**

Spec §13 item 6. A routine pass earns **no** impl-notes entry — "wrote a document" is not a lesson. Write one only if pass #1 surfaced something a later pass would otherwise repeat: a harness false positive that needed a normalisation rule, a template section that turned out unworkable as specified, or a class of content with no home in the redistribution map.

Root cause decides the file: a CJAR-specific lesson goes to `docs/implementation-notes/cjar-implementation-notes.md`; anything about the template, the harness or the migration process itself goes to `shared-implementation-notes.md`, because it belongs to all 18 passes rather than to Cookie Jar.

- [ ] **Step 8: Full verification**

```bash
node tools/verify-identity-docs.js
node tools/verify-identity-docs.js --self-test
node tools/verify-cjar-deck.js && node tools/verify-cjar-loop.js && node tools/verify-cjar-dd.js
node tools/verify-cjar-loopback.js
grep -c "game-identities.md" CLAUDE.md
```

Expected: identity harnesses exit 0. The four CJAR harnesses stay at **76 · 102 · 47 · 177** — this plan changes no application code, so any movement means something was touched that should not have been.

- [ ] **Step 9: Commit**

```bash
git add CLAUDE.md docs/rules/phase-audit.md docs/decision-log.md
git commit -m "docs: re-point Integrity Protocol and phase-audit at identity docs"
```

---

## Deferred to later passes

Recorded so pass #2 does not re-derive them. Not in scope here.

- **The other 17 passes**, in the spec's order: `pko → flw → shp → frt → nt → pass → dyb → bld → gth → dsd → nat → lttp → ygi → jec → ss → gm → li5`.
- **The final pass (LI5)** additionally deletes `docs/rules/game-identities.md`, removes the tracker column, drops every conditional fallback clause added in Task 7, and updates the six remaining live docs listed in spec §8.5 — including the two always-loaded files, `.claude/rules/definitions.md` and `.claude/rules/ui-style.md`.
- **LI5's six unprefixed legacy screens** (`screen-menu`, `screen-setup`, `screen-gatekeeper`, `screen-active-play`, `screen-gameover`, plus `screen-li5-monitor`) — the LI5 pass must not trust the `screen-li5-*` prefix convention. Spec §14.
- **Historical specs and plans are never rewritten.** Ten-plus files under `docs/superpowers/` instruct a reader to update `game-identities.md` § Game N. They are accurate records of work done then.
- **Copy findings from Task 3 Step 5** — any string where the *shipped* copy looks wrong rather than the transcription. Log to `docs/deferred-work.md`; fixing it is its own task.
