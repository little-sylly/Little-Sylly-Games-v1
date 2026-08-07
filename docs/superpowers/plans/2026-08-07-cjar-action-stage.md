# Cookie Jar — Action Stage Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Cookie Jar's base game the reveal beat it has never had, and make the object above the action buttons the object those buttons act on.

**Architecture:** The centre of the stage stops holding the card that *just resolved* and starts holding the card you are *betting on*, face-down — which is what Dibber Dobber already does. A 2100 ms choreography flips it in place, pays out, and slides it into the history strip while a replacement rises from the deck. The animation is a presentation layer driven entirely by `setTimeout`; no host logic is gated on a DOM event, and the decision clock does not start until the choreography finishes.

**Tech Stack:** Vanilla ES6 globals, Tailwind (local `tailwind-play.js`), hand-written CSS keyframes, Node-based headless harnesses. No build step, no libraries.

**Spec:** `docs/superpowers/specs/2026-08-07-cjar-action-stage-design.md` (DD-18 … DD-24).

---

## Global Constraints

Every task's requirements implicitly include all of these.

- **No build tools.** No `npm`, no bundler, no new libraries. All symbols are globals; forward references work at runtime.
- **`index.html` is ~515 KB.** Never full-read it. Never use the Edit tool for a multi-line block replacement in it — past sessions have corrupted UTF-8 into mojibake that way. Use a Node script that does `fs.readFileSync(p, 'utf8')` → `String.prototype.replace` with a literal anchor → `fs.writeFileSync(p, out, 'utf8')`, and verify with a targeted `grep` afterwards.
- **Australian English, metric units.** `colour`, `organise`, `recognise`.
- **Action Button Standard:** no emoji on any action button label; colour must be the game's brand (`cjar-cta`), neutral stone, or semantic red. `.cjar-cta` supplies `color:#292524` itself — never add `text-white` alongside it.
- **Motion Standard:** animate `transform` and `opacity` only. `ease-out` for enter/exit, `ease-in-out` for on-screen movement, never `ease-in`. Hard ceiling 300 ms per individual transition (the 2100 ms figure is a *sequence* of shorter beats, not one transition).
- **Reduced motion:** the global `@media (prefers-reduced-motion: reduce)` block at the end of `css/styles.css` is **duration-based** and must stay that way — never `animation: none`. Do not add a second block.
- **Host progression is driven by `setTimeout`, never `animationend`.** `verify-cjar-deck.js`, `verify-cjar-loop.js` and `verify-cjar-dd.js` all run with `getElementById: () => null`, so no CSS animation ever starts there. A DOM-gated loop deadlocks all three.
- **Brand values:** honey-gold `#D4A017`, dark ink `#292524`, label `#7A5C0A`, biscuit `#F7E9C4`, dashed placeholder `#D8C79A`, modal border `#E5C97A`.
- **All five harnesses must pass at the end of every task**, not just the last one:
  ```bash
  node tools/verify-cjar-deck.js && node tools/verify-cjar-loop.js && node tools/verify-cjar-dd.js
  node tools/verify-cjar-loopback.js
  node tools/simulate-cjar-dd.js
  ```
- **`simulate-cjar-dd.js` output must stay inside its usual noise band.** Nothing in this plan changes a rule, a value or a probability; a moved number means something leaked out of presentation into logic.

---

## Deviation from the spec — read before Task 5

The spec (§4) says the animation gets a new `cjarTablePhase` value, `'flipping'`. **This plan uses a separate boolean `cjarFlipAnim` instead**, leaving `cjarTablePhase`'s four existing values untouched. Three reasons, all discovered while reading the harnesses:

1. `'flipping'` would collide with `'spectating'` — a departed seat watching a flip is both, and a single enum cannot hold both.
2. `verify-cjar-loopback.js`'s `turn()` driver branches on `phase === 'deciding'` to decide whether to submit or to advance a timer. A new enum value makes every existing flip in that harness need an extra `step()` and turns a driver into a thing under test. A flag leaves all of it honest and makes the *new* assertions specifically about the animation.
3. It states the intent: the animation is presentational. A phase value would imply the resolution logic cares, and it does not.

Observable behaviour is identical. If the owner prefers the enum, it is a mechanical swap confined to Task 5.

---

## File Structure

| File | Responsibility | Touched by |
|------|----------------|------------|
| `js/games/cjar.js` | All state, host loop, MP appliers, renderers | 1, 2, 3, 4, 5, 6, 7, 8 |
| `index.html` (~9128–9205) | `screen-cjar-table` stage markup | 2, 3, 4 |
| `css/styles.css` (~1780–1940) | cjar card sizes, placeholders, keyframes | 2, 3, 4, 5, 7 |
| `tools/verify-cjar-loopback.js` | Bridge accessors + render assertions | 1, 2, 3, 4, 5, 6, 7, 8 |
| `sw.js` | `CACHE_NAME` | 9 |
| `docs/…` | code-map, game-identities, impl-notes, decision-log, CLAUDE.md | 9 |

---

## Task 1: Button labels

**Files:**
- Modify: `js/games/cjar.js:778-789` (`cjarRenderControls`)
- Test: `tools/verify-cjar-loopback.js`

**Interfaces:**
- Produces: nothing new. Later tasks read control labels via the `controlLabels()` bridge accessor added here.

- [ ] **Step 1: Add the bridge accessor and the failing checks**

In `tools/verify-cjar-loopback.js`, inside the `BRIDGE` template string, add next to `standingsRows()`:

```js
  controlLabels() {
    return document.getElementById('cjar-controls').children
      .filter(c => c.tagName === 'button').map(c => c.textContent);
  },
```

Then in the base-game section, immediately after the existing `check('client can decide', C.phase, 'deciding');`:

```js
  check('base-game button labels', C.controlLabels(), ['Reach In Again', 'Sneak Out']);
```

And in the Dibber Dobber section, after the equivalent `phase` check for Sylly:

```js
  check('Sylly button labels', C.controlLabels(), ['Reach In', 'Play Innocent', 'Dob']);
```

- [ ] **Step 2: Run it and watch it fail**

```bash
node tools/verify-cjar-loopback.js
```

Expected: two FAILs reading `got ["Take a Cookie","Sneak Out"]` and `got ["Take a Cookie","Play Innocent","Dob"]`.

- [ ] **Step 3: Change the labels**

In `js/games/cjar.js`, replace the `'deciding'` block of `cjarRenderControls`:

```js
  if (cjarTablePhase === 'deciding') {
    if (cjarIsSylly()) {
      // "Sneak" must never appear in Dibber Dobber copy: in the base game it means
      // bank-and-leave, and here nobody leaves. Reusing it teaches the wrong rule.
      // "Reach In" (not "Take a Cookie") because these are three parallel ACTS on one
      // card — a noun phrase beside two verb phrases read as a different kind of
      // option — and because a taker receives a SHARE of the card's value, not one
      // cookie (cjarSplit in cjarResolveFlipDD). DD-21.
      box.appendChild(mk('Reach In', 'take', 'brand'));
      box.appendChild(mk('Play Innocent', 'innocent'));
      box.appendChild(mk('Dob', 'dob'));
    } else {
      // NOT "Take a Cookie": in the base game the cookies were already split among
      // every active seat by cjarApplyCardEffect, before this button existed. The
      // choice here is PARTICIPATION — stay in for the next, unseen card, or leave.
      // "Again" is what carries that. DD-21.
      box.appendChild(mk('Reach In Again', 'take', 'brand'));
      box.appendChild(mk('Sneak Out', 'sneak'));
    }
    return;
  }
```

- [ ] **Step 4: Run all five harnesses**

```bash
node tools/verify-cjar-deck.js && node tools/verify-cjar-loop.js && node tools/verify-cjar-dd.js
node tools/verify-cjar-loopback.js
node tools/simulate-cjar-dd.js
```

Expected: all PASS, loopback count up by 2.

- [ ] **Step 5: Commit**

```bash
git add js/games/cjar.js tools/verify-cjar-loopback.js
git commit -m "feat(cjar): Reach In Again / Reach In replace Take a Cookie (DD-21)"
```

---

## Task 2: "Up for Grabs" — Crumbs and the Treat as one object

**Files:**
- Modify: `index.html` (the column-1 block inside `#cjar-stage-row`, ~9154-9162) — **via Node script, not Edit**
- Modify: `js/games/cjar.js:529-551` (`cjarRenderStage`, column 1)
- Modify: `css/styles.css` (after `.cjar-placeholder-dashed`, ~line 1855)
- Test: `tools/verify-cjar-loopback.js`

**Interfaces:**
- Consumes: `controlLabels()` bridge accessor (Task 1).
- Produces: element ids `#cjar-grabs-card`, `#cjar-grabs-caption`; `#cjar-crumbs-value` and `#cjar-treat-slot` keep their ids and move inside the card. Bridge accessor `grabsCaption()`.

- [ ] **Step 1: Add the failing checks**

Bridge accessor, next to `controlLabels()`:

```js
  grabsCaption() { return document.getElementById('cjar-grabs-caption').textContent; },
  crumbsValue()  { return document.getElementById('cjar-crumbs-value').textContent; },
```

Base-game section, after the button-label check:

```js
  check('grabs caption, base game', C.grabsCaption(), 'Sneak out alone and you take the lot.');
  check('crumbs render as a count',  /^\d+$/.test(C.crumbsValue()), true);
```

Sylly section, after its button-label check:

```js
  check('grabs caption, Sylly', C.grabsCaption(), 'Play innocent alone and the pile is yours.');
```

- [ ] **Step 2: Run it and watch it fail**

```bash
node tools/verify-cjar-loopback.js
```

Expected: three FAILs — captions are `""` (the mock auto-creates a blank element for an unknown id) and `crumbsValue()` is `"🍪 0"`, which fails the digits-only test.

- [ ] **Step 3: Replace the column-1 markup**

Write `tools/tmp-task2.js` (delete it after running):

```js
const fs = require('fs');
const p = 'index.html';
let s = fs.readFileSync(p, 'utf8');

const from = `          <div class="flex flex-col items-center justify-between">
            <!-- Fixed footprint whether empty or full: a dashed placeholder marks WHERE a
                 Treat will land, so one appearing is a fill-in, not a layout jump. -->
            <div id="cjar-treat-slot" class="flex flex-col items-center"></div>
            <div class="flex flex-col items-center gap-0.5">
              <span id="cjar-crumbs-value" class="text-sm font-bold text-[#7A5C0A]"></span>
              <button id="btn-cjar-crumbs-tip" class="text-stone-300 font-bold text-[0.65rem] leading-none active:scale-90 transition-transform duration-100">[?]</button>
            </div>
          </div>`;

const to = `          <!-- COL 1 — "Up for Grabs". Crumbs and the Treat are ONE object because they
               are one idea: shared table state that a solo departure claims. Crumbs sits
               on TOP because it is almost always present, where a Treat is occasional.
               h-full is what lets grid items-stretch give this card the hero's height, so
               the three columns balance with no explicit height maths. DD-23. -->
          <div id="cjar-grabs-card" class="h-full bg-white rounded-2xl shadow-sm px-2 py-2 flex flex-col items-center justify-between gap-1">
            <p class="text-[0.6rem] uppercase tracking-widest cjar-label">up for grabs</p>
            <div class="flex items-center gap-1">
              <span id="cjar-crumbs-value" class="text-2xl font-bold text-[#7A5C0A] leading-none"></span>
              <span class="text-lg leading-none">🍪</span>
              <button id="btn-cjar-crumbs-tip" class="text-stone-300 font-bold text-[0.65rem] leading-none active:scale-90 transition-transform duration-100">[?]</button>
            </div>
            <!-- Fixed footprint whether empty or full: a dashed placeholder marks WHERE a
                 Treat will land, so one appearing is a fill-in, not a layout jump. -->
            <div id="cjar-treat-slot" class="flex flex-col items-center"></div>
            <p id="cjar-grabs-caption" class="text-[0.55rem] text-stone-400 text-center leading-tight"></p>
          </div>`;

if (!s.includes(from)) { console.error('ANCHOR NOT FOUND — abort, do not write'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to), 'utf8');
console.log('col 1 replaced');
```

Run and verify:

```bash
node tools/tmp-task2.js && grep -c "cjar-grabs-card" index.html && rm tools/tmp-task2.js
```

Expected: `col 1 replaced`, then `1`.

- [ ] **Step 4: Update the renderer**

In `js/games/cjar.js`, replace the column-1 half of `cjarRenderStage` (the `treatSlot` block plus the `crumbsVal` line) with:

```js
  // COLUMN 1 — "Up for Grabs": Crumbs on top, then the Treat slot, then a caption.
  // Crumbs and the Treat are the same idea — shared table state a solo departure
  // claims — so they are one card, not two things in a column (DD-23).
  const crumbsVal = document.getElementById('cjar-crumbs-value');
  if (crumbsVal) crumbsVal.textContent = String(cjarCrumbs);

  const treatSlot = document.getElementById('cjar-treat-slot');
  if (treatSlot) {
    treatSlot.innerHTML = '';
    if (cjarCounterTreat) {
      treatSlot.appendChild(cjarRenderCard(cjarCounterTreat, { size: 'counter' }));
    } else {
      const ph = document.createElement('div');
      ph.className = 'cjar-card-counter cjar-placeholder-dashed';
      treatSlot.appendChild(ph);
    }
  }

  // The caption promotes ONE line out of the crumbs tip onto the card face. It is the
  // least-understood rule in the game and this is the object it is about. Static, not
  // press-to-preview: a preview would leak your intent to anyone glancing at your
  // screen, and phones have no hover state to hang it on (DD-23).
  const cap = document.getElementById('cjar-grabs-caption');
  if (cap) cap.textContent = cjarIsSylly()
    ? 'Play innocent alone and the pile is yours.'
    : 'Sneak out alone and you take the lot.';
```

- [ ] **Step 5: Run all five harnesses**

```bash
node tools/verify-cjar-deck.js && node tools/verify-cjar-loop.js && node tools/verify-cjar-dd.js
node tools/verify-cjar-loopback.js
node tools/simulate-cjar-dd.js
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add index.html js/games/cjar.js tools/verify-cjar-loopback.js
git commit -m "feat(cjar): group Crumbs and the Treat into one Up for Grabs card (DD-23)"
```

---

## Task 3: Column 3 becomes a reservoir

**Files:**
- Modify: `js/games/cjar.js:575-585` (`cjarRenderStage`, column 3)
- Modify: `css/styles.css:1837-1843` (`.cjar-card-next` and its comment)
- Modify: `index.html` (column-3 label, ~9169) — **via Node script**
- Test: `tools/verify-cjar-loopback.js`

**Interfaces:**
- Produces: bridge accessor `deckBacks()` returning the number of card-back elements in `#cjar-deck-badge`.

- [ ] **Step 1: Add the failing check**

Bridge accessor:

```js
  deckBacks() {
    return document.getElementById('cjar-deck-badge').children
      .filter(c => /cjar-card-back/.test(c.className || '')).length;
  },
```

Base-game section, after the grabs checks:

```js
  check('deck renders as a stack, not one card', C.deckBacks(), 3);
```

- [ ] **Step 2: Run it and watch it fail**

```bash
node tools/verify-cjar-loopback.js
```

Expected: FAIL, `expected 3, got 1`.

- [ ] **Step 3: Render the stack**

Replace the `badge` block in `cjarRenderStage`:

```js
  // COLUMN 3 — the jar the centre card came from. Round 2 sized this near the hero
  // "because it is the card you are actually betting on"; DD-18 moved that job to
  // column 2, so the rationale inverts and the size follows (DD-24). It renders as an
  // OFFSET STACK rather than a single back: two lone face-down cards side by side read
  // as "which one is next?", where a stack reads unambiguously as the reservoir — and
  // it is literally where the settle beat lifts the replacement from.
  const badge = document.getElementById('cjar-deck-badge');
  if (badge) {
    badge.innerHTML = '';
    if (cjarDeck.length) {
      const stack = document.createElement('div');
      stack.className = 'cjar-deck-stack';
      // Three backs regardless of depth — this is an icon meaning "the deck", not a
      // gauge. The COUNT below is the gauge, and it is the precise one.
      for (let k = 0; k < 3; k++) {
        const back = cjarRenderCard(null, { faceDown: true, size: 'next' });
        back.style.cssText += `left:${k * 3}px;top:${k * -3}px;z-index:${k};`;
        stack.appendChild(back);
      }
      badge.appendChild(stack);
      const n = document.createElement('div');
      n.className = 'text-base font-bold text-stone-600 text-center mt-1';
      n.textContent = cjarDeck.length;
      badge.appendChild(n);
    }
  }
```

- [ ] **Step 4: Resize the card and add the stack CSS**

In `css/styles.css`, replace the `.cjar-card-next` rule and the comment above it:

```css
/* `next` is the DECK — the reservoir the centre card is drawn from, not the bet
   itself. It sized near .cjar-card-stage while column 3 held the card you were
   betting on; DD-18 moved that to column 2 and this shrank to match its new job
   (DD-24). Still clearly larger than .cjar-card-thumb: a spent card is history,
   this is live. */
.cjar-card-next    { width: 4.4rem;  height: 6rem; }
.cjar-deck-stack   { position: relative; width: 4.7rem; height: 6.3rem; }
.cjar-deck-stack > .cjar-card-back { position: absolute; }
```

- [ ] **Step 5: Relabel column 3**

Write `tools/tmp-task3.js`:

```js
const fs = require('fs');
const p = 'index.html';
let s = fs.readFileSync(p, 'utf8');
const from = `<span class="text-[0.65rem] uppercase tracking-widest text-stone-300">next</span>`;
const to   = `<span class="text-[0.65rem] uppercase tracking-widest text-stone-300">the jar</span>`;
if (!s.includes(from)) { console.error('ANCHOR NOT FOUND — abort'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to), 'utf8');
console.log('col 3 label replaced');
```

```bash
node tools/tmp-task3.js && grep -c ">the jar<" index.html && rm tools/tmp-task3.js
```

Expected: `col 3 label replaced`, then `1`.

- [ ] **Step 6: Run all five harnesses, then commit**

```bash
node tools/verify-cjar-deck.js && node tools/verify-cjar-loop.js && node tools/verify-cjar-dd.js
node tools/verify-cjar-loopback.js
node tools/simulate-cjar-dd.js
git add index.html js/games/cjar.js css/styles.css tools/verify-cjar-loopback.js
git commit -m "feat(cjar): column 3 becomes the deck reservoir, not the bet (DD-24)"
```

---

## Task 4: Split score pills — stashed / at risk

**Files:**
- Modify: `js/games/cjar.js:828-871` (`cjarRenderRevealRows`)
- Modify: `css/styles.css` (after the `.cjar-deck-stack` rules from Task 3)
- Test: `tools/verify-cjar-loopback.js`

**Interfaces:**
- Consumes: nothing from Tasks 1-3.
- Produces: bridge accessor `pillTexts(i)` → `string[]` of the pill labels in row `i` (rows in render order).

- [ ] **Step 1: Add the failing checks**

Bridge accessor:

```js
  pillTexts(i) {
    const row = document.getElementById('cjar-reveal-rows').children[i];
    if (!row) return null;
    const out = [];
    const walk = el => {
      if (/cjar-pill-/.test(el.className || '')) out.push(el.textContent);
      (el.children || []).forEach(walk);
    };
    (row.children || []).forEach(walk);
    return out;
  },
```

Base-game section, while `C.phase === 'deciding'` on the first flip:

```js
  check('base row shows both pills', (C.pillTexts(0) || []).length, 2);
  check('  stashed pill wording',    /stashed$/.test((C.pillTexts(0) || [])[0] || ''), true);
  check('  at-risk pill wording',    /at risk$/.test((C.pillTexts(0) || [])[1] || ''), true);
```

Sylly section of the loopback, while deciding:

```js
  check('Sylly row shows one pill only', (C.pillTexts(0) || []).length, 1);
```

- [ ] **Step 2: Run and watch them fail**

```bash
node tools/verify-cjar-loopback.js
```

Expected: FAILs reporting `got 0` for the pill counts.

- [ ] **Step 3: Rewrite the row renderer's right-hand side**

Replace the body of the `order.forEach` callback's `right` construction in `cjarRenderRevealRows` — everything from `const right = document.createElement('span');` to `row.appendChild(left); row.appendChild(right);`:

```js
    // Two pills, not one string. `0 🍪 (+1 in)` put load-bearing information in a
    // parenthetical read at a glance during a timed simultaneous decision — the two
    // numbers mean opposite things (safe forever vs gone if the Raid busts) and were
    // rendered as one. DD-22.
    const right = document.createElement('span');
    right.className = 'flex items-center gap-1.5 shrink-0';

    const pill = (text, cls) => {
      const s = document.createElement('span');
      s.className = 'cjar-pill-' + cls;
      s.textContent = text;
      right.appendChild(s);
      return s;
    };

    const visible = cjarStashVisible(i);
    const stashed = pill(visible ? (cjarStashes[i] || 0) + ' stashed' : '••• stashed', 'stashed');

    // At Risk is BASE GAME ONLY. Dibber Dobber has one running Stash and no Raid-local
    // pool at all, so a second pill there would always read 0 and teach a rule that
    // does not exist.
    if (!cjarIsSylly() && cjarActive[i]) {
      pill(visible ? (cjarRaidTotals[i] || 0) + ' at risk' : '••• at risk', 'risk');
    }

    // The delta FLASHES ON the pills instead of replacing them. Replacing them is what
    // the old renderer did, which meant the standings vanished at the one moment you
    // most want to compare them.
    if (revealing) {
      const d = cjarDeltas[i] || 0;
      if (d && visible) {
        stashed.className += d < 0 ? ' cjar-pill-flash-down' : ' cjar-pill-flash-up';
        stashed.textContent = (d > 0 ? '+' : '') + d + ' → ' + (cjarStashes[i] || 0) + ' stashed';
      }
    }

    row.appendChild(left); row.appendChild(right);
```

The `left` span keeps its existing construction unchanged, including the `revealing` branch that appends `cjarLines[i]` and the `🚪` marker.

- [ ] **Step 4: Add the pill CSS**

Append to `css/styles.css` after the `.cjar-deck-stack` rules:

```css
/* Score-row pills. Two objects, because they mean opposite things: stashed is safe
   forever, at-risk evaporates on a bust. Colour carries the semantics and the word
   carries the meaning — the rows had ~150px of dead horizontal space to spend on it. */
.cjar-pill-stashed, .cjar-pill-risk {
  padding: 0.1rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 700;
  white-space: nowrap;
}
.cjar-pill-stashed { background: #F7E9C4; color: #7A5C0A; }
.cjar-pill-risk    { background: #FEE2E2; color: #B91C1C; }

@keyframes cjar-pill-pop-up   { 50% { transform: scale(1.12); } }
@keyframes cjar-pill-pop-down { 50% { transform: scale(0.9); } }
.cjar-pill-flash-up   { animation: cjar-pill-pop-up   240ms ease-out; }
.cjar-pill-flash-down { animation: cjar-pill-pop-down 240ms ease-out; }
```

- [ ] **Step 5: Run all five harnesses, then commit**

```bash
node tools/verify-cjar-deck.js && node tools/verify-cjar-loop.js && node tools/verify-cjar-dd.js
node tools/verify-cjar-loopback.js
node tools/simulate-cjar-dd.js
git add js/games/cjar.js css/styles.css tools/verify-cjar-loopback.js
git commit -m "feat(cjar): split score rows into stashed and at-risk pills (DD-22)"
```

---

## Task 5: The flip cycle's timing skeleton

No visual change beyond buttons arriving 2100 ms later. This task exists so the timing contract can be proven before any choreography is layered on it.

**Files:**
- Modify: `js/games/cjar.js:24-26` (constants), `:102-117` (state), `:760` (`cjarRenderControls`), `:949` (`cjarSubmitChoice`), `:1327-1358` (`cjarOpenDecisionWindow`), `:1844-1866` (`CJAR_FLIP_START` applier), `:1938-1953` (`cjarResetState`)
- Modify: `css/styles.css`
- Test: `tools/verify-cjar-loopback.js` **only** — see the note under Step 1.

**Interfaces:**
- Produces:
  - `const CJAR_FLIP_ANIM_MS = 2100`
  - `let cjarFlipAnim` (bool), `let cjarAnimHandle` (timeout handle or null)
  - `function cjarBeginFlipAnim()` — no args, no return. Runs on every device.
  - Bridge accessor `flipAnim()` → bool.

- [ ] **Step 1: Add the failing checks**

Bridge accessor in the loopback:

```js
  flipAnim()     { return cjarFlipAnim; },
  animMs()       { return CJAR_FLIP_ANIM_MS; },
  controlsIdle() { return /cjar-controls-idle/.test(document.getElementById('cjar-controls').className); },
```

Loopback, immediately after the first `CJAR_FLIP_START` reaches the client:

```js
  section('The reveal window owns the stage before the clock starts');
  check('host is animating',            H.flipAnim(), true);
  check('client is animating too',      C.flipAnim(), true);
  check('client controls are inert',    C.controlsIdle(), true);
  check('a tap during the animation is dropped', (() => {
    const before = H.ready.slice();
    C.submit('take');
    return JSON.stringify(H.ready) === JSON.stringify(before);
  })(), true);
  check('deadline includes the animation',
        H.endTs() - Date.now() > H.animMs(), true);
```

> **Why not `verify-cjar-loop.js`?** The spec (§7) said it would need new checks. It does not, and it *cannot* have them. That harness never drives the host loop — it has no `cjarHostNextFlip` bridge method and exercises only resolution primitives (`cjarSplit`, `cjarResolveSneak`, `cjarResolveBust`, `cjarAllIn`), so it never enters a decision window. Its `screens` array is captured at line 29 and never asserted against.
>
> There is also a language trap worth knowing before writing any harness check: cjar.js declares its state with `let` and `const`, and **top-level `let`/`const` in a `vm` context do not become properties of the context object**. `sandbox.cjarFlipAnim` is `undefined` no matter what the game does. That is precisely why both harnesses append a `BRIDGE` string of getters and read through `sandbox.__cjar`. Never assert against `sandbox.<global>` directly.
>
> `verify-cjar-dd.js` is untouched for the same reason — it is a pure-logic harness with `getElementById: () => null`, and this plan changes no logic.

- [ ] **Step 2: Run and watch them fail**

```bash
node tools/verify-cjar-loopback.js
```

Expected: `cjarFlipAnim is not defined` style failures, plus the deadline check failing because `endTs - now ≈ windowMs`.

- [ ] **Step 3: Constants and state**

Replace `js/games/cjar.js:25`:

```js
const CJAR_REVEAL_MS        = 1200;  // outcome dwell ONLY — who sneaked out, the deltas.
                                     // Was 3000; the rest of that budget moved into
                                     // CJAR_FLIP_ANIM_MS below (DD-19). These two are
                                     // deliberately NOT held equal, unlike PKO's
                                     // interstitial pair: they measure different things
                                     // (reading a result vs watching a card resolve) and
                                     // should be tuned independently.
const CJAR_FLIP_ANIM_MS     = 2100;  // reveal choreography — flip 300 / hold 600 /
                                     // payout 700 / settle 500. See cjarBeginFlipAnim.
```

Add after `js/games/cjar.js:117`:

```js
let cjarFlipAnim   = false;    // true while the reveal choreography owns the stage
let cjarAnimHandle = null;     // setTimeout — the choreography's own clock
```

- [ ] **Step 4: The shared animation driver**

Add immediately above `cjarOpenDecisionWindow`:

```js
// Runs on EVERY device, host and client alike. For CJAR_FLIP_ANIM_MS it owns the
// stage: the card is face-up, the buttons are inert, and the decision clock has not
// started. Then it hands over.
//
// Driven by setTimeout and NEVER by animationend. verify-cjar-deck / -loop / -dd all
// run with `getElementById: () => null`, so every render call is a no-op and not one
// CSS animation ever starts there — a DOM-gated handover would deadlock all three.
// It also means the sequence still takes 2100 ms under prefers-reduced-motion, where
// the visuals snap. That is correct: this is pacing, and the deadline depends on it.
function cjarBeginFlipAnim() {
  if (cjarAnimHandle) { clearTimeout(cjarAnimHandle); cjarAnimHandle = null; }
  cjarFlipAnim = true;
  cjarRenderTable();
  cjarAnimHandle = setTimeout(() => {
    cjarAnimHandle = null;
    cjarFlipAnim = false;
    cjarRenderTable();
    // The bar drains over windowMs alone. Starting it while the animation is still on
    // the clock would paint scaleX((endTs - now) / windowMs) > 1 — an over-full bar
    // that sits pinned for two seconds and then jumps.
    cjarStartTimer(cjarEndTimestamp, cjarWindowMs);
  }, CJAR_FLIP_ANIM_MS);
}
```

- [ ] **Step 5: Rewire the decision window**

In `cjarOpenDecisionWindow`, replace the deadline line, the render/timer/screen block, and the timeout duration:

```js
  const windowMs = cjarDecisionMs();
  cjarWindowMs     = windowMs;
  // The choreography owns the first CJAR_FLIP_ANIM_MS, so the deadline sits that much
  // further out and Blitz stays a true 10 s of DECIDING rather than 10 s minus the
  // animation. endTimestamp is absolute and already travels in CJAR_FLIP_START, so
  // clock skew between devices stays cosmetic exactly as it was.
  cjarEndTimestamp = windowMs ? Date.now() + CJAR_FLIP_ANIM_MS + windowMs : 0;
  cjarTablePhase = (!cjarIsSylly() && !cjarActive[mpMyPlayerIdx]) ? 'spectating' : 'deciding';
  cjarBroadcastFlipStart();
  cjarBeginFlipAnim();
  showScreen('screen-cjar-table');

  if (!windowMs) return;
```

and the timeout:

```js
  }, CJAR_FLIP_ANIM_MS + windowMs + CJAR_TIMEOUT_GRACE_MS);
```

- [ ] **Step 6: Guard the submit and idle the controls**

`cjarSubmitChoice`, first line:

```js
  if (cjarTablePhase !== 'deciding' || cjarFlipAnim) return;
```

`cjarRenderControls`, immediately after `box.innerHTML = '';`:

```js
  // The buttons are BUILT during the choreography but held inert and invisible, rather
  // than omitted. An empty container would grow by ~7rem the moment the animation
  // ended, and because the <section> centres the Stack that re-centres the entire
  // screen — the SHP sheep-parade bug, and this fires ~55 times a match. The class
  // lives on the CONTAINER, which survives re-render, so the fade actually transitions.
  box.className = 'flex flex-col gap-2' + (cjarFlipAnim ? ' cjar-controls-idle' : '');
```

- [ ] **Step 7: Teardown**

In `cjarResetState`, alongside the other handle clears:

```js
  if (cjarAnimHandle)         { clearTimeout(cjarAnimHandle);         cjarAnimHandle = null; }
```

and in the state block:

```js
  cjarFlipAnim = false;
```

- [ ] **Step 8: The client applier**

In the `case 'CJAR_FLIP_START':` block, replace the trailing `cjarRenderTable(); cjarStartTimer(...)` pair (whatever the block currently ends with) so it routes through the same driver the host uses:

```js
      cjarBeginFlipAnim();
```

Leave every payload-normalisation line above it untouched — `cjarWireArr` / `cjarWireList` / `cjarWireObj` still guard every collection (BUG-06). Do **not** call `cjarStartTimer` here any more; `cjarBeginFlipAnim` owns it.

- [ ] **Step 9: The idle CSS**

Append to `css/styles.css`:

```css
/* Controls are present but inert while the reveal choreography plays, so the column's
   height never changes. Opacity only — a display toggle would collapse the height and
   re-centre the whole Stack. */
.cjar-controls-idle { opacity: 0; pointer-events: none; }
#cjar-controls { transition: opacity 150ms ease-out; }
```

- [ ] **Step 10: Run all five harnesses, then commit**

```bash
node tools/verify-cjar-deck.js && node tools/verify-cjar-loop.js && node tools/verify-cjar-dd.js
node tools/verify-cjar-loopback.js
node tools/simulate-cjar-dd.js
git add js/games/cjar.js css/styles.css tools/verify-cjar-loopback.js
git commit -m "feat(cjar): reveal window owns the stage before the decision clock (DD-19)"
```

**If the loopback's `turn()` driver now stalls:** it branches on `phase === 'deciding'` and submits. `cjarSubmitChoice` is now guarded by `cjarFlipAnim`, but `turn()` calls `bridge.applyChoice(...)` directly, which bypasses the guard by design (it is the host's own applier). If a *client* `C.submit()` in an existing check now no-ops, add a `step(client)` before it to let the animation timer fire — that is the correct fix, not removing the guard.

---

## Task 6: The centre slot holds the card you are betting on

**Files:**
- Modify: `js/games/cjar.js:552-591` (`cjarRenderStage`, column 2 + label)
- Modify: `index.html` (column-2 label default text) — **via Node script**
- Test: `tools/verify-cjar-loopback.js`

**Interfaces:**
- Consumes: `cjarFlipAnim` (Task 5).
- Produces: bridge accessors `heroFaceDown()` → bool, `stageLabel()` → string.

- [ ] **Step 1: Add the failing checks**

Bridge accessors:

```js
  heroFaceDown() {
    const kids = document.getElementById('cjar-table-hero').children;
    return kids.length === 1 && /cjar-card-back/.test(kids[0].className || '');
  },
  stageLabel() { return document.getElementById('cjar-stage-label-now').textContent; },
```

Loopback, during the animation window of the first base-game flip:

```js
  check('card is face-up while animating', C.heroFaceDown(), false);
  check('label reads just revealed',       C.stageLabel(), 'just revealed');
```

Then after the animation timer fires and the phase is decidable:

```js
  check('card is face-down while deciding', C.heroFaceDown(), true);
  check('label reads next out of the jar',  C.stageLabel(), 'next out of the jar');
```

- [ ] **Step 2: Run and watch them fail**

```bash
node tools/verify-cjar-loopback.js
```

Expected: the "while deciding" pair fails — the hero still holds the resolved card face-up and the label still says `just revealed`.

- [ ] **Step 3: Invert the centre slot**

Replace the `hero` block and the `now` label block in `cjarRenderStage`:

```js
  // COLUMN 2 — the card you are BETTING ON, face-down, except during the choreography
  // where it is the card that just came out. This is the whole fix: what sits directly
  // above the action buttons is now the object those buttons act on (DD-18).
  //
  // Dibber Dobber has always worked this way — cjarOpenBlindWindow sets cjarCard = null
  // so cjarRenderCard(null) yields the back. This makes the base game match Sylly and
  // removes a mode divergence rather than adding one.
  //
  // Nothing is lost: which family member appeared is on the warning strip (in red when
  // one more busts the Raid), the card itself is the newest thumb in the history strip,
  // and the full log is one tap into cjar-trail-overlay.
  const faceUp = cjarFlipAnim && !!cjarCard;
  const hero = document.getElementById('cjar-table-hero');
  if (hero) {
    hero.innerHTML = '';
    const card = faceUp ? cjarRenderCard(cjarCard, { size: 'stage' })
                        : cjarRenderCard(null, { faceDown: true, size: 'stage' });
    // Flip ONLY when the card actually changed. cjarRenderTable runs on every choice
    // submission and every re-render, so animating unconditionally would re-flip the
    // same card every time anybody tapped anything.
    const key = faceUp ? (cjarCard.type + ':' + (cjarCard.id || cjarCard.value)) : 'down';
    if (key !== cjarLastHeroKey) {
      card.className += ' cjar-card-flipin';
      cjarLastHeroKey = key;
    }
    hero.appendChild(card);
    hero.onclick = () => { playDone(); cjarOpenTrail(); };
  }

  // The label is now honest in both states, so it never needs hiding — which also means
  // nothing under it shifts. Round 2 toggled `visibility` for exactly that reason; a
  // text swap removes the need.
  const now = document.getElementById('cjar-stage-label-now');
  if (now) now.textContent = faceUp ? 'just revealed' : 'next out of the jar';
```

- [ ] **Step 4: Update the markup default**

Write `tools/tmp-task6.js`:

```js
const fs = require('fs');
const p = 'index.html';
let s = fs.readFileSync(p, 'utf8');
const from = `<span id="cjar-stage-label-now" class="text-[0.65rem] uppercase tracking-widest text-[#7A5C0A]">just revealed</span>`;
const to   = `<span id="cjar-stage-label-now" class="text-[0.65rem] uppercase tracking-widest text-[#7A5C0A]">next out of the jar</span>`;
if (!s.includes(from)) { console.error('ANCHOR NOT FOUND — abort'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to), 'utf8');
console.log('stage label default replaced');
```

```bash
node tools/tmp-task6.js && grep -c "next out of the jar" index.html && rm tools/tmp-task6.js
```

- [ ] **Step 5: Run all five harnesses, then commit**

```bash
node tools/verify-cjar-deck.js && node tools/verify-cjar-loop.js && node tools/verify-cjar-dd.js
node tools/verify-cjar-loopback.js
node tools/simulate-cjar-dd.js
git add index.html js/games/cjar.js tools/verify-cjar-loopback.js
git commit -m "feat(cjar): centre slot holds the card you are betting on, face-down (DD-18)"
```

---

## Task 7: The choreography

**Files:**
- Modify: `js/games/cjar.js` (`cjarBeginFlipAnim`, plus a new `cjarFlyTokens`)
- Modify: `css/styles.css`
- Test: `tools/verify-cjar-loopback.js`

**Interfaces:**
- Consumes: `cjarBeginFlipAnim` (Task 5), `faceUp` rendering (Task 6), `#cjar-delta-layer`.
- Produces: `function cjarFlyTokens(count, direction)` where `direction` is `'down'` or `'left'`.

- [ ] **Step 1: Add the failing check**

Bridge accessor:

```js
  tokenCount() { return document.getElementById('cjar-delta-layer').children.length; },
```

Loopback, during the payout beat of a cookie card:

```js
  check('a cookie card throws one token per splitting seat',
        C.tokenCount() >= 1, true);
```

- [ ] **Step 2: Run and watch it fail**

```bash
node tools/verify-cjar-loopback.js
```

Expected: FAIL, `expected true, got false`.

- [ ] **Step 3: The token emitter**

Add beside `cjarFlyDelta`:

```js
// The payout beat, made visible. NO per-player flight paths: animating a token to each
// row needs live getBoundingClientRect geometry, which is fragile under scroll, wrong
// when the score table is off-screen, and invisible to every harness (DD-20).
//
// Direction carries the destination instead — down toward the score table, left toward
// the Crumb pile — and the COUNT carries the split, so the burst's weight tracks how
// many seats are sharing. The actual per-player payload lands as the score pill.
//
// Same absolute-layer discipline as cjarFlyDelta: in-flow tokens change the column's
// height, and because the <section> centres the Stack that re-centres the whole screen.
function cjarFlyTokens(count, direction) {
  const layer = document.getElementById('cjar-delta-layer');
  if (!layer || count <= 0) return;
  for (let k = 0; k < Math.min(count, 8); k++) {
    const el = document.createElement('div');
    el.className = 'cjar-token cjar-token-' + direction;
    el.textContent = '🍪';
    el.style.left = (44 + (k - count / 2) * 6) + '%';
    el.style.animationDelay = (k * 45) + 'ms';   // 30-80 ms stagger, Motion Standard
    layer.appendChild(el);
    // Duration-based reduced motion means animationend still fires, so this cleanup is
    // safe. Never switch that media block to animation:none.
    el.addEventListener('animationend', () => el.remove());
  }
}
```

- [ ] **Step 4: Schedule the beats**

Replace the body of `cjarBeginFlipAnim`'s setTimeout with a beat schedule. The handover timer stays exactly where it was; the payout beat gets its own:

```js
function cjarBeginFlipAnim() {
  if (cjarAnimHandle) { clearTimeout(cjarAnimHandle); cjarAnimHandle = null; }
  if (cjarPayoutHandle) { clearTimeout(cjarPayoutHandle); cjarPayoutHandle = null; }
  cjarFlipAnim = true;
  cjarRenderTable();

  // Beat 3 — payout, at 900 ms: flip (0-300) and hold (300-900) have played, so the
  // card has been readable for 600 ms before anything moves.
  const card = cjarCard;
  cjarPayoutHandle = setTimeout(() => {
    cjarPayoutHandle = null;
    if (!card) return;
    if (card.type === 'cookie') {
      // One token per seat sharing it, plus one drifting left if a remainder went to
      // Crumbs. cjarSplit already did the arithmetic; this only reports it.
      const heads = cjarIsSylly() ? cjarPlayerCount : cjarActiveCount();
      cjarFlyTokens(heads, 'down');
      if (card.value % Math.max(1, heads) !== 0) cjarFlyTokens(1, 'left');
    }
    // A family or treat card throws no tokens: the warning strip pulses for the first,
    // and the Treat card's own travel into column 1 is the second's payout.
  }, 900);

  cjarAnimHandle = setTimeout(() => {
    cjarAnimHandle = null;
    cjarFlipAnim = false;
    cjarRenderTable();
    cjarStartTimer(cjarEndTimestamp, cjarWindowMs);
  }, CJAR_FLIP_ANIM_MS);
}
```

Declare the new handle beside `cjarAnimHandle`, and clear it in `cjarResetState` alongside the others:

```js
let cjarPayoutHandle = null;   // setTimeout — the payout beat inside the choreography
```

- [ ] **Step 5: The other two payout kinds — the Treat's travel and the warning pulse**

A cookie card is the only kind that throws tokens. The other two announce themselves in place, and both are rect-free for the same reason as DD-20 — direction only, no geometry.

Declare the memo beside `cjarLastHeroKey`:

```js
let cjarLastTreatId = null;    // so a Treat animates in ONCE, not on every re-render
```

Clear it in `cjarResetState` (`cjarLastTreatId = null;`) and at Raid start, on the same line that already clears `cjarLastHeroKey` and `cjarLastTrailLen` (`js/games/cjar.js:1165`).

In `cjarRenderStage`'s column-1 block, replace the `treatSlot.appendChild(...)` line inside the `if (cjarCounterTreat)` branch:

```js
      const tEl = cjarRenderCard(cjarCounterTreat, { size: 'counter' });
      // Travel in from up-and-right — where the hero sits relative to this column —
      // so a Treat is seen ARRIVING on the counter rather than materialising there.
      // Once per Treat, not per render: cjarRenderTable runs on every tap.
      if (cjarCounterTreat.id !== cjarLastTreatId) {
        tEl.className += ' cjar-treat-arrive';
        cjarLastTreatId = cjarCounterTreat.id;
      }
      treatSlot.appendChild(tEl);
```

and in the `else` branch, reset the memo so a later Treat animates again:

```js
      cjarLastTreatId = null;
```

In `cjarRenderWarningStrip`, append to the `slot.className` expression:

```js
      + (cjarFlipAnim && cjarCard && cjarCard.type === 'family' && cjarCard.id === f.id
         ? ' cjar-warn-pulse' : '')
```

- [ ] **Step 6: The keyframes**

Append to `css/styles.css`:

```css
/* A Treat arriving on the counter, and the family slot that just came out. Both are
   direction-only — no getBoundingClientRect anywhere in the choreography (DD-20). */
@keyframes cjar-treat-arrive {
  from { transform: translate3d(38px, -34px, 0) scale(1.35); opacity: 0; }
  to   { transform: translate3d(0, 0, 0) scale(1); opacity: 1; }
}
.cjar-treat-arrive { animation: cjar-treat-arrive 420ms ease-out; }

@keyframes cjar-warn-pulse {
  0%, 100% { transform: scale(1); }
  40%      { transform: scale(1.18); }
}
.cjar-warn-pulse { animation: cjar-warn-pulse 300ms ease-out 2; }

/* Payout tokens. Direction is the message — down means "to the players", left means
   "to the Crumb pile". transform + opacity only. */
@keyframes cjar-token-down {
  0%   { transform: translate3d(0, 0, 0) scale(0.7); opacity: 0; }
  25%  { transform: translate3d(0, 10px, 0) scale(1); opacity: 1; }
  100% { transform: translate3d(0, 74px, 0) scale(0.85); opacity: 0; }
}
@keyframes cjar-token-left {
  0%   { transform: translate3d(0, 0, 0) scale(0.7); opacity: 0; }
  25%  { transform: translate3d(-14px, 0, 0) scale(1); opacity: 1; }
  100% { transform: translate3d(-92px, 12px, 0) scale(0.85); opacity: 0; }
}
.cjar-token {
  position: absolute;
  top: 42%;
  font-size: 1rem;
  will-change: transform, opacity;
  animation-duration: 680ms;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
}
.cjar-token-down { animation-name: cjar-token-down; }
.cjar-token-left { animation-name: cjar-token-left; }
```

- [ ] **Step 7: Run all five harnesses, then commit**

```bash
node tools/verify-cjar-deck.js && node tools/verify-cjar-loop.js && node tools/verify-cjar-dd.js
node tools/verify-cjar-loopback.js
node tools/simulate-cjar-dd.js
git add js/games/cjar.js css/styles.css tools/verify-cjar-loopback.js
git commit -m "feat(cjar): payout beat — token burst carries direction and split (DD-20)"
```

---

## Task 8: The bust card gets its flip beat

**Files:**
- Modify: `js/games/cjar.js:1297-1307` (`cjarHostNextFlip`, the bust branch), `:1884-1890` (the client's `CJAR_FLIP_RESOLVE` bust branch)
- Test: `tools/verify-cjar-loopback.js`

**Interfaces:**
- Consumes: `cjarBeginFlipAnim`, `CJAR_FLIP_ANIM_MS` (Task 5).
- Produces: bridge methods `stackDeck(cards)` and `hostNextFlip()`.

- [ ] **Step 1: Add the failing check**

A bust needs the same family card twice, which a real shuffle will not deliver on demand — so stack the deck deliberately rather than playing until one happens. Add to the loopback `BRIDGE`:

```js
  stackDeck(cards)   { cjarDeck = cards.map(c => c.type === 'family' ? cjarFamilyCard(c.id)
                                                                    : cjarCookieCard(c.value)); },
  hostNextFlip()     { cjarHostNextFlip(); },
  seen2(id)          { return cjarSeen[id]; },
```

Then a dedicated section at the end of the base-game block, after the existing flips have finished:

```js
  section('The bust card gets the same flip beat as every other card');
  const screensBefore = host.__screens.length;
  H.stackDeck([{ type: 'family', id: 'mum' }, { type: 'family', id: 'mum' }]);
  H.hostNextFlip();                                  // first mum — a warning, opens a window
  check('first sighting warns only', H.seen2('mum'), 1);
  step(host);                                        // let the choreography hand over
  for (let i = 0; i < 4; i++) H.applyChoice(i, 'take');
  H.resolve();
  step(host);                                        // outcome dwell → cjarHostNextFlip
  check('bust opened the table, not the verdict',
        host.__screens[host.__screens.length - 1], 'screen-cjar-table');
  check('and the card is face-up for it', H.flipAnim(), true);
  step(host);                                        // the CJAR_FLIP_ANIM_MS delay
  check('THEN the verdict',
        host.__screens[host.__screens.length - 1], 'screen-cjar-busted');
  check('client saw the same order',
        client.__screens.slice(-2), ['screen-cjar-table', 'screen-cjar-busted']);
  check('no exception on either device', [host.__errors, client.__errors], [[], []]);
```

- [ ] **Step 2: Run and watch it fail**

```bash
node tools/verify-cjar-loopback.js
```

Expected: FAIL on `bust opened the table, not the verdict` — the current code jumps straight to `screen-cjar-busted`.

- [ ] **Step 3: Play the flip before the verdict**

In `cjarHostNextFlip`, replace the bust branch:

```js
  if (eff.busted) {
    const last = cjarTrail[cjarTrail.length - 1] || {};
    cjarBroadcastResolve({ deltas: new Array(cjarPlayerCount).fill(0),
                           lines: new Array(cjarPlayerCount).fill(''),
                           raidEnded: true, bustFamilyId: eff.bustFamilyId, bustLine: last.line });
    playBoing();
    // The bust card gets the SAME flip beat every other card gets. Without this the most
    // dramatic card in the game is the one card you never see come out of the jar — it
    // teleports you to a verdict screen for a card you never watched arrive.
    cjarTablePhase = 'revealing';
    cjarBeginFlipAnim();
    showScreen('screen-cjar-table');
    if (cjarRevealHandle) clearTimeout(cjarRevealHandle);
    cjarRevealHandle = setTimeout(() => {
      cjarRevealHandle = null;
      cjarShowBusted(eff.bustFamilyId, last.line, () => cjarHostEndRaid('bust'));
    }, CJAR_FLIP_ANIM_MS);
    return;
  }
```

In the client's `CJAR_FLIP_RESOLVE` handler, apply the same delay around its `cjarShowBusted(p.bustFamilyId, p.bustLine, () => {});` call:

```js
        cjarTablePhase = 'revealing';
        cjarBeginFlipAnim();
        showScreen('screen-cjar-table');
        setTimeout(() => cjarShowBusted(p.bustFamilyId, p.bustLine, () => {}), CJAR_FLIP_ANIM_MS);
```

- [ ] **Step 4: Run all five harnesses, then commit**

```bash
node tools/verify-cjar-deck.js && node tools/verify-cjar-loop.js && node tools/verify-cjar-dd.js
node tools/verify-cjar-loopback.js
node tools/simulate-cjar-dd.js
git add js/games/cjar.js tools/verify-cjar-loopback.js
git commit -m "fix(cjar): the bust card gets the same flip beat as every other card"
```

---

## Task 9: Documentation and the SW bump

**Files:**
- Modify: `sw.js` (`CACHE_NAME`)
- Modify: `docs/code-map.md`, `docs/rules/game-identities.md` (§ Game 18), `docs/implementation-notes/cjar-implementation-notes.md`, `docs/decision-log.md`, `CLAUDE.md`

- [ ] **Step 1: Bump the service worker**

```bash
grep -n "CACHE_NAME" sw.js
```

Change `sylly-games-v162` → `sylly-games-v163`. No `PRECACHE_URLS` change — this plan adds no assets.

- [ ] **Step 2: `docs/code-map.md`**

Grep for the cjar section, then offset-Read it — never full-read the file (~132 KB). Add: `cjarBeginFlipAnim`, `cjarFlyTokens`, `CJAR_FLIP_ANIM_MS`, `cjarFlipAnim`, `cjarAnimHandle`, `cjarPayoutHandle`, `#cjar-grabs-card`, `#cjar-grabs-caption`, `.cjar-deck-stack`, `.cjar-pill-stashed` / `.cjar-pill-risk`, `.cjar-controls-idle`, and the changed `CJAR_REVEAL_MS` value.

- [ ] **Step 3: `docs/rules/game-identities.md` § Game 18**

Grep for `## Game 18:` and offset-Read only that section. Update the button labels table, the stage layout description, and the score-row description.

- [ ] **Step 4: `docs/implementation-notes/cjar-implementation-notes.md`**

Add DD-18 … DD-24 to Design Decisions. Add to Template Gaps:

> **TG-08 — a state mutation with no on-screen beat reads as a layout problem.** cjar's base game split cookies into `cjarRaidTotals` inside `cjarApplyCardEffect` with no animation, no sound beyond the card's own, and no screen change, while `cjarFlyDelta` only fired on a *stash* change — which in the base game means only on Sneak Out. So on a normal flip you gained cookies and nothing moved. Three playtest rounds reported this as "the action stage is off" and two rounds of layout work (DD-11, DD-12) failed to fix it, because the cause was missing feedback, not arrangement. **Before redesigning a screen players call confusing, list every state mutation the screen performs and check each one has a visible beat.**

> **TG-09 — the two-pill score row (`stashed` / `at risk`) is a candidate suite pattern, deliberately NOT elevated.** One game is not evidence for a `ui-style.md` rule. Revisit if a second game wants safe-vs-at-risk in one row.

- [ ] **Step 5: `docs/decision-log.md`**

Append one entry, newest on top:

```markdown
- **2026-08-07 — cjar action stage: the centre slot inverts, and the payout gets a beat.**
  The card above the action buttons is now the face-down card those buttons act on, not
  the one that just resolved; a 2100 ms choreography flips it, pays out and retires it,
  paid for mostly out of `CJAR_REVEAL_MS` (3000 → 1200). Root cause of three rounds of
  "the stage feels off" was that the base game's payout mutated state invisibly.
  Spec: `docs/superpowers/specs/2026-08-07-cjar-action-stage-design.md`.
```

- [ ] **Step 6: `CLAUDE.md`**

Update `**SW Version:**` to v163 and add a short § Current Focus paragraph. Move the outgoing v162 notes into `docs/sw-changelog.md`.

- [ ] **Step 7: Final full verification**

```bash
node tools/verify-cjar-deck.js && node tools/verify-cjar-loop.js && node tools/verify-cjar-dd.js
node tools/verify-cjar-loopback.js
node tools/simulate-cjar-dd.js
git status --short
```

Expected: all green, and no stray `tools/tmp-task*.js` left behind.

- [ ] **Step 8: Commit**

```bash
git add sw.js docs/ CLAUDE.md
git commit -m "docs(cjar): action stage rework — SW v163, DD-18..DD-24, TG-08/TG-09"
```

---

## Manual verification (cannot be harnessed)

Run after Task 9. None of this is provable headlessly.

1. **Three or four real devices, base game.** Watch a full Raid. The question the whole plan answers: does the card above the buttons read as the thing you are betting on? Does the payout land?
2. **Blitz decision time.** Confirm the timer bar starts full *after* the animation and drains over 10 s — not over-full, not pre-drained.
3. **A bust.** Confirm the card flips and is readable before `screen-cjar-busted` appears.
4. **A Treat appearing.** Confirm it travels into the Up for Grabs card rather than materialising there.
5. **Dibber Dobber.** Confirm one pill per row, and that the blind window still shows a face-down card throughout.
6. **`prefers-reduced-motion: reduce`** (DevTools → Rendering). Nothing should travel; nothing should be left stranded on screen; the pacing should be unchanged.
7. **Offline install check** — DevTools → Application → unregister → hard reload → Offline → Cookie Jar → How to Play → The Cards tab. Illustrated cards, not emoji.
