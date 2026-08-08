# Cookie Jar — Stage Polish Round Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the nine owner-approved changes from `docs/superpowers/specs/2026-08-08-cjar-stage-polish-design.md` (DD-25…DD-31) — a smoother reveal choreography, consistent stage-column headings, a tappable trail with a card popup, a restructured score table, tighter family-strip spacing, gameover polish, and a new suite-wide button-parity rule applied to CJAR first.

**Architecture:** No new files. All changes land in `js/games/cjar.js` (render + timing), `index.html` (CJAR's screens only), `css/styles.css` (CJAR's own classes), `js/engine.js` (one teardown-array addition), the five `tools/verify-cjar-*.js` harnesses, and the doc set required by the Documentation Integrity Protocol (`.claude/rules/ui-style.md`, `docs/code-map.md`, `docs/rules/game-identities.md`, `CLAUDE.md`, `docs/implementation-notes/cjar-implementation-notes.md`, `docs/decision-log.md`, `docs/deferred-work.md`, `sw.js`).

**Tech Stack:** Vanilla JS, Tailwind (via local `tailwind-play.js`), hand-rolled Node harnesses (`vm` + a Firebase-shaped wire), no build step.

## Global Constraints

- **`index.html` is ~515 KB — never open it with the Read tool without an offset/limit, and never edit it with the Edit tool.** Every step below that touches `index.html` gives you a Node script: write it to a temp file, run it, confirm it printed `OK`, then delete the temp file. This is a hard project rule (`CLAUDE.md` § Token Hygiene, and a standing memory: prior systematic `index.html` edits made with the Edit tool corrupted UTF-8 encoding).
- **Australian English, metric units** in any new user-facing copy (`CLAUDE.md` § Sylly Tone) — none of this plan introduces new copy that needs it, but if you add any, follow it.
- **No emoji on action buttons**, per `ui-style.md` § Action Button Standard — none of this plan's new/changed buttons carry one; keep it that way.
- **Every screen change must not touch other games.** All edits are scoped to CJAR-specific ids/classes (`cjar-*`, `#screen-cjar-*`) except Task 8's `ui-style.md` rule additions, which are prose-only and apply project-wide by design (that's the point of the task).
- **Re-run all five CJAR harnesses after Task 1, and again after the final task**, even where a task's own step doesn't call one out — they're the regression net:
  ```bash
  node tools/verify-cjar-deck.js && node tools/verify-cjar-loop.js && node tools/verify-cjar-dd.js
  node tools/verify-cjar-loopback.js
  node tools/simulate-cjar-dd.js
  ```

---

### Task 1: Reveal choreography — longer beats, settle overlaps decision time (DD-25)

**Files:**
- Modify: `js/games/cjar.js:32-33` (the `CJAR_FLIP_ANIM_MS` constant + comment)
- Modify: `js/games/cjar.js` — the payout beat's `setTimeout(..., 900)` inside `cjarBeginFlipAnim` (currently line 1521)
- Modify: `js/games/cjar.js` — `cjarFlyTokens` (currently line 799-813)
- Modify: `css/styles.css:1940-1992` (`.cjar-card-flipin`, `.cjar-trail-settle`, `.cjar-treat-arrive`, `.cjar-token`)
- Modify: `tools/verify-cjar-loopback.js` — five stale comments referencing `900 ms` / `2100 ms` (lines 437-438, 454, 539, 562, 774-775)

**Interfaces:**
- Consumes: nothing new.
- Produces: `CJAR_FLIP_ANIM_MS` now equals **3200** (was 2100) — every other call site that already reads this constant (`cjarOpenDecisionWindow`, the bust path's `cjarRevealHandle` timeout, `cjarHostTimeoutHandle`) picks up the new value automatically; **no other call site needs editing.**

- [ ] **Step 1: Change the blocking-dwell constant and its comment**

In `js/games/cjar.js`, replace:

```js
const CJAR_FLIP_ANIM_MS     = 2100;  // reveal choreography — flip 300 / hold 600 /
                                     // payout 700 / settle 500. See cjarBeginFlipAnim.
```

with:

```js
const CJAR_FLIP_ANIM_MS     = 3200;  // BLOCKING reveal dwell — flip 600 / hold 1200 /
                                     // payout 1400. See cjarBeginFlipAnim. The settle
                                     // beat (old card to trail, new card rises, ~1000ms)
                                     // is deliberately NOT in this constant — it is pure
                                     // housekeeping motion with no information in it, so
                                     // it plays as a CSS-only cosmetic tail AFTER the
                                     // handover below, overlapping the decision window
                                     // that already opened. Doubling flip+hold+payout
                                     // alone already exceeds the OLD total including
                                     // settle (2100ms) — this is not time-neutral, it's
                                     // ~+1.1s more blocking dwell per flip, accepted for
                                     // smoothness (owner call, 8 Aug 2026 stage-polish
                                     // round). If a playtest says it drags, the lever is
                                     // shifting more length into the settle tail (free)
                                     // rather than shortening flip/hold/payout.
```

- [ ] **Step 2: Move the payout beat's own offset later**

Find (inside `cjarBeginFlipAnim`):

```js
  }, 900);
```

(this is the closing line of the `cjarPayoutHandle = setTimeout(() => { ... }, 900);` block — the ONLY `setTimeout(..., 900)` in the file). Replace `900` with `1800` — that's the new Flip(600) + Hold(1200) offset, i.e. where Payout begins.

- [ ] **Step 3: Add a pre-move hold to the token burst, and slow the flight down**

In `cjarFlyTokens`, find:

```js
    el.style.animationDelay = (k * 45) + 'ms';   // 30-80 ms stagger, Motion Standard
```

Replace with:

```js
    // 500ms hold before anything moves (DD-25 — "hold longer before slowly moving off"),
    // THEN the 30-80ms stagger, Motion Standard.
    el.style.animationDelay = (500 + k * 45) + 'ms';
```

- [ ] **Step 4: Lengthen the CSS animation durations**

In `css/styles.css`, make these four changes:

```css
.cjar-card-flipin { animation: cjar-card-flip 260ms ease-out; will-change: transform; }
```
→
```css
.cjar-card-flipin { animation: cjar-card-flip 550ms ease-out; will-change: transform; }
```

```css
.cjar-trail-settle { animation: cjar-trail-settle 200ms ease-out; }
```
→
```css
.cjar-trail-settle { animation: cjar-trail-settle 500ms ease-out; }
```

```css
.cjar-treat-arrive { animation: cjar-treat-arrive 380ms ease-out; }
```
→
```css
/* animation-delay + fill-mode:backwards is the same "hold before moving" treatment as
   .cjar-token below — without backwards, the delay window shows the card ALREADY at its
   resting position (the browser falls back to the element's normal, unanimated style
   during the delay), which defeats the hold. */
.cjar-treat-arrive { animation: cjar-treat-arrive 750ms ease-out 400ms backwards; }
```

```css
.cjar-token {
  position: absolute;
  top: 42%;
  font-size: 1rem;
  will-change: transform, opacity;
  animation-duration: 380ms;   /* the .cjar-delta precedent, and what the beat allows */
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
}
```
→
```css
.cjar-token {
  position: absolute;
  top: 42%;
  font-size: 1rem;
  will-change: transform, opacity;
  animation-duration: 760ms;   /* doubled (DD-25) — the JS delay above holds the token at
                                  its 0% keyframe first, so `both` (not just `forwards`)
                                  is required to keep it hidden through that hold. */
  animation-timing-function: ease-out;
  animation-fill-mode: both;
}
```

- [ ] **Step 5: Update the harness's stale timing comments**

In `tools/verify-cjar-loopback.js`, these five comments describe the OLD `900ms`/`2100ms` split and are now wrong (no assertion logic changes — every check reads `H.animMs()` / `C.endTs` dynamically, never a hardcoded `900` or `2100`). Update each:

Line 437-438, from:
```js
  // cjarBeginFlipAnim now arms TWO timers, payout (900 ms) then handover (2100 ms) —
  // step() only ever fires the earliest pending one, so this is the payout beat on
```
to:
```js
  // cjarBeginFlipAnim now arms TWO timers, payout (1800 ms) then handover (3200 ms) —
  // step() only ever fires the earliest pending one, so this is the payout beat on
```

Line 454, from:
```js
  // device's first (900 ms) timer, so this fires the second (2100 ms) one.
```
to:
```js
  // device's first (1800 ms) timer, so this fires the second (3200 ms) one.
```

Line 539, from:
```js
  // cjarBeginFlipAnim(false) queues its own payout beat (900 ms, a no-op for a family
```
to:
```js
  // cjarBeginFlipAnim(false) queues its own payout beat (1800 ms, a no-op for a family
```

Line 562, from:
```js
  // client that quit inside this 2100 ms window still had cjarShowBusted fire later —
```
to:
```js
  // client that quit inside this 3200 ms window still had cjarShowBusted fire later —
```

Line 774-775, from:
```js
  // device now carries TWO choreography timers (payout at 900 ms, handover at
  // 2100 ms), so draining both takes two step() calls apiece.
```
to:
```js
  // device now carries TWO choreography timers (payout at 1800 ms, handover at
  // 3200 ms), so draining both takes two step() calls apiece.
```

- [ ] **Step 6: Run all five harnesses**

```bash
node tools/verify-cjar-deck.js && node tools/verify-cjar-loop.js && node tools/verify-cjar-dd.js
node tools/verify-cjar-loopback.js
node tools/simulate-cjar-dd.js
```

Expected: `ALL CHECKS PASSED` on the first four; `simulate-cjar-dd.js` prints its balance numbers and exits 0 (it asserts nothing — DD-25 is presentational, so its output should be unchanged from before this task within the usual noise band).

- [ ] **Step 7: Commit**

```bash
git add js/games/cjar.js css/styles.css tools/verify-cjar-loopback.js
git commit -m "feat(cjar): reveal choreography doubles, settle overlaps decision time (DD-25)"
```

---

### Task 2: Stage-column headings move to the top; column 2 loses its bottom label entirely (DD-26)

**Files:**
- Modify: `index.html` (the `#cjar-stage-row` block, `~9157-9187` before this task — re-locate by grepping `id="cjar-stage-row"` since Task 1 changes nothing above it)
- Modify: `js/games/cjar.js` — `cjarRenderStage` (currently `~541-641`), the face-down label text
- Modify: `tools/verify-cjar-loopback.js` — the two `check('label reads ...')` assertions

**Interfaces:**
- Consumes: nothing new.
- Produces: `cjar-stage-label-now`'s face-down text becomes `'Next from Jar'` (was `'next out of the jar'`) — Task 5+ do not touch this label, but note the new text if you ever grep for the old string elsewhere.

- [ ] **Step 1: Locate the exact current markup**

```bash
node -e "const s=require('fs').readFileSync('index.html','utf8'); const i=s.indexOf('id=\"cjar-stage-row\"'); console.log(s.slice(i-40,i+1900));"
```

Confirm the three-column block matches what's quoted in Step 2 below (it should — nothing since the Aug 7 rework has touched this markup). If it doesn't match, stop and re-read the live file before proceeding; do not blind-apply the replacement.

- [ ] **Step 2: Write and run the heading-reposition script**

Create `tools/tmp-cjar-headings.js`:

```js
const fs = require('fs');
const p = 'index.html';
let s = fs.readFileSync(p, 'utf8');

const old2 = `          <div class="flex flex-col items-center justify-center gap-1">
            <div id="cjar-table-hero" class="flex items-end"></div>
            <span id="cjar-stage-label-now" class="text-[0.65rem] uppercase tracking-widest text-[#7A5C0A]">next out of the jar</span>
          </div>
          <div class="flex flex-col items-center justify-between">
            <div id="cjar-deck-badge" class="flex flex-col items-center"></div>
            <span class="text-[0.65rem] uppercase tracking-widest text-stone-300">the jar</span>
          </div>`;

const new2 = `          <div class="flex flex-col items-center justify-center gap-1">
            <span id="cjar-stage-label-now" class="text-[0.6rem] uppercase tracking-widest cjar-label">Next from Jar</span>
            <div id="cjar-table-hero" class="flex items-end"></div>
          </div>
          <div class="flex flex-col items-center justify-center gap-1 h-full">
            <span class="text-[0.6rem] uppercase tracking-widest text-stone-300">Left in Jar</span>
            <div id="cjar-deck-badge" class="flex flex-col items-center"></div>
          </div>`;

const n = s.split(old2).length - 1;
if (n !== 1) { console.error('expected 1 occurrence, found', n); process.exit(1); }
s = s.split(old2).join(new2);
fs.writeFileSync(p, s, 'utf8');
console.log('OK');
```

Run it and confirm `OK`:

```bash
node tools/tmp-cjar-headings.js && rm tools/tmp-cjar-headings.js
```

Note: column 3's `<div class="flex flex-col items-center justify-between">` → `justify-center` (was `justify-between`, which pinned the badge to the top and the label to the bottom — replacing it with `justify-center` plus the label now living ABOVE the badge is what vertically centres `#cjar-deck-badge` in the remaining column height, per DD-26's "deck-stack visual aligned to the middle of the column"). The added `h-full` matches column 1's `#cjar-grabs-card` and keeps this column stretching to the grid row's full height under `items-stretch`.

- [ ] **Step 3: Update the face-down label text and the face-up text's meaning in `cjarRenderStage`**

In `js/games/cjar.js`, find:

```js
  const now = document.getElementById('cjar-stage-label-now');
  if (now) now.textContent = faceUp ? 'just revealed' : 'next out of the jar';
```

Replace with:

```js
  // DD-26 — both states now render ABOVE the card (index.html), never below it. Only
  // the face-down copy shortens here; 'just revealed' already fits one line.
  const now = document.getElementById('cjar-stage-label-now');
  if (now) now.textContent = faceUp ? 'just revealed' : 'Next from Jar';
```

- [ ] **Step 4: Update the two stale harness assertions**

In `tools/verify-cjar-loopback.js`, find:

```js
  check('label reads next out of the jar',  C.stageLabel(), 'next out of the jar');
```

Replace with:

```js
  check('label reads Next from Jar',        C.stageLabel(), 'Next from Jar');
```

There is exactly one occurrence — confirm with `grep -n "next out of the jar" tools/verify-cjar-loopback.js` before editing; if it reports more than one line, read each before changing it (only the `check(...)` line should exist; the file has no other reference to that string after Task 1's comment-only edits).

- [ ] **Step 5: Run the loopback harness**

```bash
node tools/verify-cjar-loopback.js
```

Expected: `ALL CHECKS PASSED`.

- [ ] **Step 6: Commit**

```bash
git add index.html js/games/cjar.js tools/verify-cjar-loopback.js
git commit -m "feat(cjar): stage-column headings move to the top, deck stack centres (DD-26)"
```

---

### Task 3: Column 1 ("Up for Grabs") density — less whitespace, bigger content (DD-26a)

**Files:**
- Modify: `index.html` (`#cjar-grabs-card` block, immediately above the block Task 2 touched)

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing consumed by a later task — purely visual.

- [ ] **Step 1: Write and run the density script**

Create `tools/tmp-cjar-col1.js`:

```js
const fs = require('fs');
const p = 'index.html';
let s = fs.readFileSync(p, 'utf8');

const olds = [
  {
    old: `<div id="cjar-grabs-card" class="h-full bg-white rounded-2xl shadow-sm px-2 py-2 flex flex-col items-center justify-between gap-1">`,
    neu: `<div id="cjar-grabs-card" class="h-full bg-white rounded-2xl shadow-sm px-3 py-3 flex flex-col items-center justify-between gap-1.5">`,
  },
  {
    old: `<span id="cjar-crumbs-value" class="text-2xl font-bold text-[#7A5C0A] leading-none"></span>`,
    neu: `<span id="cjar-crumbs-value" class="text-3xl font-bold text-[#7A5C0A] leading-none"></span>`,
  },
  {
    old: `<p id="cjar-grabs-caption" class="text-[0.55rem] text-stone-400 text-center leading-tight"></p>`,
    neu: `<p id="cjar-grabs-caption" class="text-xs text-stone-400 text-center leading-snug px-0.5"></p>`,
  },
];

olds.forEach(({ old, neu }) => {
  const n = s.split(old).length - 1;
  if (n !== 1) { console.error('expected 1 occurrence of:', old, '\ngot', n); process.exit(1); }
  s = s.split(old).join(neu);
});

fs.writeFileSync(p, s, 'utf8');
console.log('OK');
```

Run it:

```bash
node tools/tmp-cjar-col1.js && rm tools/tmp-cjar-col1.js
```

- [ ] **Step 2: Run the loopback harness (no assertion changes expected, this is a regression check)**

```bash
node tools/verify-cjar-loopback.js
```

Expected: `ALL CHECKS PASSED` — nothing in this task changes an id, a class the harness matches on (`cjar-crumbs-value`'s id is untouched), or any text content.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat(cjar): tighten Up for Grabs card, enlarge Crumbs value and caption (DD-26a)"
```

---

### Task 4: Trail cards are individually tappable, open a full-illustration popup (DD-27)

**Files:**
- Modify: `index.html` — add `cjar-card-view-overlay` (new overlay, place it directly after the existing `cjar-new-raid-overlay` block, before the `cjar-tip-overlay` comment)
- Modify: `js/engine.js:644-645` — add the new overlay id to the `resetToLobby()` CJAR teardown array
- Modify: `js/games/cjar.js` — `cjarRenderTrailStrip` (per-card `onclick`), a new `cjarOpenCardView(card)` function, and the `on(...)` init block (close-button wiring)
- Modify: `tools/verify-cjar-loopback.js` — three new bridge getters + a new assertion section

**Interfaces:**
- Consumes: `cjarRenderCard(card, opts)` (existing, `cjar.js:1845`) — the popup calls it with `{ size: 'hero' }`, the same size class (`cjar-card-hero`, 15rem×20.6rem, `css/styles.css:1835`) the pre-DD-18 layout used, so no new CSS class is needed for the art itself.
- Produces: `cjarOpenCardView(card)` — global function, later tasks don't call it, but keep the name if you touch this area again.

- [ ] **Step 1: Add the popup overlay to `index.html`**

Create `tools/tmp-cjar-cardview.js`:

```js
const fs = require('fs');
const p = 'index.html';
let s = fs.readFileSync(p, 'utf8');

const anchor = `  <!-- CJAR SHARED TIP — content injected by cjarShowTip(emoji, heading, lines[]) -->`;
const n = s.split(anchor).length - 1;
if (n !== 1) { console.error('expected 1 occurrence of anchor, found', n); process.exit(1); }

const insertBefore = `  <!-- CJAR CARD VIEW — full illustration popup, opened by tapping a thumb in the
       history strip (DD-27). Reuses cjar-card-hero (the pre-DD-18 hero size) since
       nothing else in the game needs a card at 15rem anymore. -->
  <div id="cjar-card-view-overlay" style="display:none"
    class="fixed inset-0 z-[90] overlay-modal-backdrop flex items-center justify-center px-6">
    <div class="overlay-modal-inner bg-stone-50 w-full max-w-sm rounded-3xl px-6 pt-6 pb-8 flex flex-col items-center gap-4 text-center border border-[#E5C97A]">
      <div id="cjar-card-view-body" class="flex items-center justify-center"></div>
      <h3 id="cjar-card-view-name" class="text-lg font-bold text-stone-800"></h3>
      <button id="btn-cjar-card-view-close" class="cjar-cta min-h-14 w-full rounded-2xl active:scale-95 font-semibold text-lg transition-all duration-150">Got it</button>
    </div>
  </div>

`;

s = s.replace(anchor, insertBefore + anchor);
fs.writeFileSync(p, s, 'utf8');
console.log('OK');
```

Run it:

```bash
node tools/tmp-cjar-cardview.js && rm tools/tmp-cjar-cardview.js
```

- [ ] **Step 2: Register the overlay for teardown**

In `js/engine.js`, find:

```js
  // Cookie Jar teardown
  ['cjar-settings-overlay','cjar-how-to-overlay','cjar-trail-overlay',
   'cjar-quit-overlay','cjar-new-raid-overlay','cjar-tip-overlay'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = 'none';
  });
```

Replace with:

```js
  // Cookie Jar teardown
  ['cjar-settings-overlay','cjar-how-to-overlay','cjar-trail-overlay',
   'cjar-quit-overlay','cjar-new-raid-overlay','cjar-tip-overlay',
   'cjar-card-view-overlay'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = 'none';
  });
```

- [ ] **Step 3: Add `cjarOpenCardView` and wire the trail strip's per-card click**

In `js/games/cjar.js`, find `cjarRenderTrailStrip`'s inner loop:

```js
    spent.forEach((entry, i) => {
      const card = entry.type === 'cookie' ? { type: 'cookie', value: entry.value }
                 : entry.type === 'family' ? { type: 'family', id: entry.id }
                                           : { type: 'treat',  id: entry.id, points: entry.points };
      const el = cjarRenderCard(card, { size: 'thumb', dimmed: true });
      // Only the newest thumb settles in — it is the one that just arrived from the slot.
      if (i === spent.length - 1 && spent.length !== cjarLastTrailLen) el.className += ' cjar-trail-settle';
      strip.appendChild(el);
    });
```

Replace with:

```js
    spent.forEach((entry, i) => {
      const card = entry.type === 'cookie' ? { type: 'cookie', value: entry.value }
                 : entry.type === 'family' ? { type: 'family', id: entry.id }
                                           : { type: 'treat',  id: entry.id, points: entry.points };
      const el = cjarRenderCard(card, { size: 'thumb', dimmed: true });
      // Only the newest thumb settles in — it is the one that just arrived from the slot.
      if (i === spent.length - 1 && spent.length !== cjarLastTrailLen) el.className += ' cjar-trail-settle';
      // Per-CARD click, never on the strip itself (DD-27) — the strip's own comment
      // just above explains why a container-wide handler fights the swipe-to-scroll
      // gesture. A discrete small target doesn't: the browser already distinguishes a
      // tap from a drag on an overflow-x:auto container before it fires click at all.
      // .onclick (a plain property), not addEventListener — matches the col-2 hero's
      // existing pattern a few lines up in cjarRenderStage, and is what makes this
      // testable from a headless harness with no real DOM event dispatch.
      el.onclick = () => { playDone(); cjarOpenCardView(card); };
      strip.appendChild(el);
    });
```

Immediately after the `cjarRenderTrailStrip` function's closing `}`, add:

```js

// The trail's full-illustration popup (DD-27). Reuses cjarRenderCard at 'hero' size —
// the pre-DD-18 hero footprint, unused anywhere else since column 2 shrank to 'stage'.
function cjarOpenCardView(card) {
  const body = document.getElementById('cjar-card-view-body');
  if (body) { body.innerHTML = ''; body.appendChild(cjarRenderCard(card, { size: 'hero' })); }
  const name = document.getElementById('cjar-card-view-name');
  if (name) {
    name.textContent = card.type === 'cookie'
      ? (CJAR_DATA.cookieTiers[cjarCookieTier(card.value)] || {}).label || ''
      : card.type === 'family'
        ? ((CJAR_DATA.family || []).find(f => f.id === card.id) || {}).name || ''
        : ((CJAR_DATA.treats || []).find(t => t.id === card.id) || {}).name || '';
  }
  const ov = document.getElementById('cjar-card-view-overlay');
  if (ov) ov.style.display = 'flex';
}
```

- [ ] **Step 4: Wire the close button**

In `js/games/cjar.js`'s `DOMContentLoaded` init block, find:

```js
  on('btn-cjar-tip-close', () => {
    playDone();
    document.getElementById('cjar-tip-overlay').style.display = 'none';
  });
});
```

Replace with:

```js
  on('btn-cjar-tip-close', () => {
    playDone();
    document.getElementById('cjar-tip-overlay').style.display = 'none';
  });
  on('btn-cjar-card-view-close', () => {
    playDone();
    document.getElementById('cjar-card-view-overlay').style.display = 'none';
  });
});
```

- [ ] **Step 5: Add bridge getters to the loopback harness**

In `tools/verify-cjar-loopback.js`, find:

```js
  openCards()        { cjarOpenCards(); },
```

Add three new methods directly after it (keep them in the same object literal):

```js
  openCards()        { cjarOpenCards(); },
  // DD-27 — taps a trail thumb by index. .onclick is a plain property (not
  // addEventListener, which this DOM mock no-ops), so it's directly callable.
  tapTrailCard(i) {
    const el = document.getElementById('cjar-trail-strip').children[i];
    if (el && typeof el.onclick === 'function') el.onclick();
  },
  cardViewOpen()      { return document.getElementById('cjar-card-view-overlay').style.display === 'flex'; },
  cardViewName()      { return document.getElementById('cjar-card-view-name').textContent; },
```

- [ ] **Step 6: Add a test section exercising the popup**

Find the section in `tools/verify-cjar-loopback.js` that checks `C.stageThumbs()` or `C.stagePlaceholder()` after the first flip has landed and the trail has at least one card (this is right after `section('First flip — the client must reach the table');` and its immediate `step(host)` calls — look for the point where `H.trail.length` first becomes non-zero, which is after the payout+handover timers for flip 1 have both been stepped). Add this new section immediately after that point, before the next `section(...)` call:

```js
  section('Trail cards open a full-illustration popup on tap (DD-27)');
  check('card view starts closed', C.cardViewOpen(), false);
  C.tapTrailCard(0);
  check('card view opens',         C.cardViewOpen(), true);
  check('card view has a name',    (C.cardViewName() || '').length > 0, true);
```

If the trail is still empty at the point you inserted this (check by reading `C.trail.length` mentally against the surrounding code — the strip only shows *spent* cards, and the very first card is still mid-choreography until its handover timer fires), move the section a few lines later, past the `step(host); step(client);` pair that drains the first flip's handover timer, rather than guessing — the harness will simply report `card view opens` as `PASS expected true, got false` if placed too early, which tells you to move it later.

- [ ] **Step 7: Run the loopback harness**

```bash
node tools/verify-cjar-loopback.js
```

Expected: `ALL CHECKS PASSED`. If the new section fails, it's almost always the placement issue described in Step 6 — move the section later in the sequence, not the assertions.

- [ ] **Step 8: Commit**

```bash
git add index.html js/engine.js js/games/cjar.js tools/verify-cjar-loopback.js
git commit -m "feat(cjar): trail cards open a full-illustration popup on tap (DD-27)"
```

---

### Task 5: Score table — header row, Still In / Snuck Out status, reordered columns (DD-28)

**Files:**
- Modify: `index.html` — add `#cjar-reveal-header` immediately above `#cjar-reveal-rows`
- Modify: `js/games/cjar.js` — `cjarRenderRevealRows` (currently `~917-982`)
- Modify: `css/styles.css:1845-1856` — add `.cjar-reveal-grid`, `.cjar-status-in`, `.cjar-status-out`
- Modify: `tools/verify-cjar-loopback.js` — two new bridge getters + new assertions on existing standings sections

**Interfaces:**
- Consumes: `cjarRanks()` (existing, `cjar.js:1124`), `cjarStashVisible(i)` (existing), `cjarActive[]`, `cjarRaidTotals[]`.
- Produces: nothing new consumed elsewhere — `cjarRenderRevealRows`'s external contract (called from `cjarRenderTable`, no arguments, no return value) is unchanged.

- [ ] **Step 1: Add the header row to `index.html`**

Create `tools/tmp-cjar-header.js`:

```js
const fs = require('fs');
const p = 'index.html';
let s = fs.readFileSync(p, 'utf8');

const old = `      <div id="cjar-reveal-rows" class="flex flex-col gap-1.5"></div>`;
const neu = `      <div id="cjar-reveal-header" class="cjar-reveal-grid gap-1.5 px-3 mb-1 text-[0.6rem] uppercase tracking-widest text-stone-400"></div>
      <div id="cjar-reveal-rows" class="flex flex-col gap-1.5"></div>`;

const n = s.split(old).length - 1;
if (n !== 1) { console.error('expected 1 occurrence, found', n); process.exit(1); }
s = s.split(old).join(neu);
fs.writeFileSync(p, s, 'utf8');
console.log('OK');
```

Run it:

```bash
node tools/tmp-cjar-header.js && rm tools/tmp-cjar-header.js
```

- [ ] **Step 2: Add the grid + status CSS classes**

In `css/styles.css`, find:

```css
.cjar-pill-stashed, .cjar-pill-risk {
  padding: 0.1rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 700;
  white-space: nowrap;
}
.cjar-pill-stashed { background: #F7E9C4; color: #7A5C0A; }
.cjar-pill-risk    { background: #FEE2E2; color: #B91C1C; }
```

Replace with:

```css
/* DD-28 — the standings header and every standings row share this template, which is
   what guarantees pixel alignment between them without hand-matching two separate
   layouts. Rank/Player/Stashed/Status/At Risk, in that order. */
.cjar-reveal-grid { display: grid; grid-template-columns: 1.8rem 1fr 4.6rem 4.6rem 4.2rem; }

.cjar-pill-stashed, .cjar-pill-risk {
  padding: 0.1rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 700;
  white-space: nowrap;
}
.cjar-pill-stashed { background: #F7E9C4; color: #7A5C0A; }
.cjar-pill-risk    { background: #FEE2E2; color: #B91C1C; }
.cjar-status-in    { color: #15803d; font-size: 0.7rem; font-weight: 700; }
.cjar-status-out   { color: #B91C1C; font-size: 0.7rem; font-weight: 700; }
```

- [ ] **Step 3: Rewrite `cjarRenderRevealRows`**

In `js/games/cjar.js`, replace the entire function (from `function cjarRenderRevealRows() {` to its closing `}` just before the `// This device's own numbers.` comment) with:

```js
function cjarRenderRevealRows() {
  const box  = document.getElementById('cjar-reveal-rows');
  const head = document.getElementById('cjar-reveal-header');
  if (!box) return;
  box.innerHTML = '';
  if (!cjarPlayerCount) { if (head) head.style.display = 'none'; return; }
  const revealing = cjarTablePhase === 'revealing';

  // The header names what the STANDINGS columns mean. During 'revealing' the row
  // switches to an outcome-line format that doesn't map onto columns at all (see the
  // `if (revealing)` branch below), so the header hides rather than mislabel it.
  if (head) {
    head.style.display = revealing ? 'none' : 'grid';
    if (!revealing) {
      head.innerHTML = '';
      const cols = ['Rank', 'Player', 'Stashed', 'Status', 'At Risk'];
      cols.forEach(label => {
        const c = document.createElement('span');
        c.textContent = label;
        head.appendChild(c);
      });
    }
  }

  const ranks = cjarRanks();
  const order = cjarPlayerNames
    .map((n, i) => i)
    .sort((a, b) => revealing ? a - b : (ranks[a] - ranks[b]));   // reveal keeps seat order

  order.forEach((i, pos) => {
    const me  = i === mpMyPlayerIdx;
    const row = document.createElement('div');
    row.style.animationDelay = (pos * 50) + 'ms';   // 30-80 ms stagger, Motion Standard

    if (revealing) {
      // Outcome-line format, unchanged in content from before this round — only WHICH
      // function builds it moved (it used to be inline in this same function).
      row.className = 'flex items-center justify-between rounded-xl px-3 py-1.5 shadow-sm '
        + (me ? 'bg-[#F7E9C4]' : 'bg-white');
      const left = document.createElement('span');
      left.className = 'text-sm ' + (me ? 'text-[#7A5C0A] font-semibold' : 'text-stone-700');
      left.textContent = cjarPlayerNames[i] + (cjarLines[i] ? ' — ' + cjarLines[i] : '');
      const right = document.createElement('span');
      right.className = 'flex items-center gap-1.5 shrink-0';
      const visible = cjarStashVisible(i);
      const stashed = document.createElement('span');
      stashed.className = 'cjar-pill-stashed';
      stashed.textContent = visible ? (cjarStashes[i] || 0) + ' stashed' : '••• stashed';
      const d = cjarDeltas[i] || 0;
      if (d && visible) {
        stashed.className += d < 0 ? ' cjar-pill-flash-down' : ' cjar-pill-flash-up';
        stashed.textContent = (d > 0 ? '+' : '') + d + ' → ' + (cjarStashes[i] || 0) + ' stashed';
      }
      right.appendChild(stashed);
      row.appendChild(left); row.appendChild(right);
      box.appendChild(row);
      return;
    }

    // Standings format — the 5-column grid the header describes (DD-28).
    row.className = 'cjar-reveal-grid items-center gap-1.5 rounded-xl px-3 py-1.5 shadow-sm '
      + (me ? 'bg-[#F7E9C4]' : 'bg-white');

    const rank = document.createElement('span');
    rank.className = 'text-sm font-bold ' + (me ? 'text-[#7A5C0A]' : 'text-stone-500');
    rank.textContent = cjarRankLabel(ranks[i]);
    row.appendChild(rank);

    const name = document.createElement('span');
    name.className = 'text-sm truncate ' + (me ? 'text-[#7A5C0A] font-semibold' : 'text-stone-700');
    name.textContent = cjarPlayerNames[i];
    row.appendChild(name);

    const visible = cjarStashVisible(i);
    const stashed = document.createElement('span');
    stashed.className = 'cjar-pill-stashed justify-self-start';
    stashed.textContent = visible ? (cjarStashes[i] || 0) + ' stashed' : '••• stashed';
    row.appendChild(stashed);

    // Status and At Risk are BASE GAME ONLY. Dibber Dobber has one running Stash and no
    // Raid-local pool (cjar.js's cjarResolveFlipDD comment block), so both cells render
    // empty there — the grid track stays, the content doesn't, which keeps column
    // widths identical between modes without a conditional template.
    const status = document.createElement('span');
    if (!cjarIsSylly()) {
      status.className = cjarActive[i] ? 'cjar-status-in' : 'cjar-status-out';
      status.textContent = cjarActive[i] ? 'Still In' : 'Snuck Out';
    }
    row.appendChild(status);

    const risk = document.createElement('span');
    if (!cjarIsSylly() && cjarActive[i]) {
      risk.className = 'cjar-pill-risk justify-self-start';
      risk.textContent = visible ? (cjarRaidTotals[i] || 0) + ' at risk' : '••• at risk';
    }
    row.appendChild(risk);

    box.appendChild(row);
  });
}
```

- [ ] **Step 4: Add bridge getters**

In `tools/verify-cjar-loopback.js`, find:

```js
  pillTexts(i) {
```

Add two new methods directly before it:

```js
  headerCols() {
    const head = document.getElementById('cjar-reveal-header');
    return head.style.display === 'none' ? null : head.children.map(c => c.textContent);
  },
  statusText(i) {
    const row = document.getElementById('cjar-reveal-rows').children[i];
    if (!row || !row.children[3]) return null;
    return row.children[3].textContent;
  },
  pillTexts(i) {
```

- [ ] **Step 5: Add assertions to the existing standings section**

Find the section around `section('First flip — the client must reach the table');` — it already has:

```js
  check('base row shows both pills', (C.pillTexts(0) || []).length, 2);
  check('  stashed pill wording',    /stashed$/.test((C.pillTexts(0) || [])[0] || ''), true);
  check('  at-risk pill wording',    /at risk$/.test((C.pillTexts(0) || [])[1] || ''), true);
```

Add immediately after those three lines:

```js
  check('header shows 5 columns',    (C.headerCols() || []).length, 5);
  check('header column order',       C.headerCols(),
        ['Rank', 'Player', 'Stashed', 'Status', 'At Risk']);
  check('all four seats Still In',   [0,1,2,3].map(i => C.statusText(i)),
        ['Still In', 'Still In', 'Still In', 'Still In']);
```

Then find the section that resolves a solo Sneak Out or a departure (search for `cjarActive` going `false` in the base-game portion of the file, or a seat's status changing from active to inactive — this is easiest to find by grepping `sneak` in the file's base-game test sections). Immediately after the point where the harness confirms `H.active` (or `C.active`) shows a departed seat, add:

```js
  check('departed seat reads Snuck Out', C.statusText(<the departed seat's index>), 'Snuck Out');
```

Replace `<the departed seat's index>` with whichever seat index the surrounding test already asserts departed (read the existing `check('...', C.active, [...])` line just above your insertion point to find it — do not guess).

Finally, find a Dibber Dobber (`sylly: true`) standings check — search for an existing `check(...)` against `C.pillTexts` or standings inside a `section(...)` whose name mentions Sylly / Dibber Dobber. Immediately after it, add:

```js
  check('Sylly header has no Status/At Risk', C.headerCols(),
        ['Rank', 'Player', 'Stashed', 'Status', 'At Risk']);
  check('Sylly Status cell is empty',         C.statusText(0), '');
```

(The header text list is unchanged in Sylly Mode — only the CONTENT of the Status/At Risk cells is empty, per Step 3's implementation. This assertion is intentionally checking that the header still reads the same 5 labels; if you find yourself wanting to hide the header text in Sylly Mode too, don't — that wasn't part of DD-28, re-read the spec's DD-28 section before changing this.)

- [ ] **Step 6: Run the loopback harness**

```bash
node tools/verify-cjar-loopback.js
```

Expected: `ALL CHECKS PASSED`. If a `PASS`/`FAIL` count looks different from before this task, re-check Step 5's insertion points — a misplaced assertion (e.g. checking status before a flip has resolved) is far more likely than a logic bug in Step 3.

- [ ] **Step 7: Commit**

```bash
git add index.html js/games/cjar.js css/styles.css tools/verify-cjar-loopback.js
git commit -m "feat(cjar): score table gets a header row and a Still In / Snuck Out status column (DD-28)"
```

---

### Task 6: Family strip spacing (DD-29)

**Files:**
- Modify: `index.html` (the family-strip row, immediately below `screen-cjar-table`'s header block)

**Interfaces:** None — pure spacing, no ids/classes any harness or later task depends on change.

- [ ] **Step 1: Write and run the spacing script**

Create `tools/tmp-cjar-family-spacing.js`:

```js
const fs = require('fs');
const p = 'index.html';
let s = fs.readFileSync(p, 'utf8');

const old = `        <div class="flex items-center gap-1.5">
          <div id="cjar-warning-strip" class="flex items-center gap-1.5 flex-1"></div>
          <button id="btn-cjar-family-tip" class="text-stone-300 font-bold text-xs leading-none active:scale-90 transition-transform duration-100">[?]</button>
        </div>`;
const neu = `        <div class="flex items-center gap-2.5">
          <div id="cjar-warning-strip" class="flex items-center gap-1 flex-1"></div>
          <button id="btn-cjar-family-tip" class="text-stone-300 font-bold text-xs leading-none active:scale-90 transition-transform duration-100">[?]</button>
        </div>`;

const n = s.split(old).length - 1;
if (n !== 1) { console.error('expected 1 occurrence, found', n); process.exit(1); }
s = s.split(old).join(neu);
fs.writeFileSync(p, s, 'utf8');
console.log('OK');
```

Run it:

```bash
node tools/tmp-cjar-family-spacing.js && rm tools/tmp-cjar-family-spacing.js
```

(This tightens the gap *between family slots* from `gap-1.5` to `gap-1`, and widens the gap *between the whole strip and the `[?]` button* from `gap-1.5` to `gap-2.5` — the ring on a highlighted slot no longer visually crowds the button.)

- [ ] **Step 2: Run the loopback harness (regression check — nothing here should change behaviour)**

```bash
node tools/verify-cjar-loopback.js
```

Expected: `ALL CHECKS PASSED`.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat(cjar): tighten family-strip spacing, give the [?] button room (DD-29)"
```

---

### Task 7: Gameover — medal-in-a-fixed-slot podium, raid-history top-scorer highlight (DD-30)

**Files:**
- Modify: `js/games/cjar.js` — `cjarShowGameover` (currently `~1344-1391`)
- Modify: `css/styles.css:1787-1790` (add `.cjar-medal-slot` near `.cjar-cta` / `.cjar-label`)
- Modify: `tools/verify-cjar-loopback.js` — two new bridge getters + assertions where the harness already drives a match to `screen-cjar-gameover`

**Interfaces:**
- Consumes: `cjarRanks()`, `cjarRedHanded()`, `cjarRankLabel(n)` (all existing).
- Produces: nothing new consumed elsewhere.

- [ ] **Step 1: Add the medal-slot CSS class**

In `css/styles.css`, find:

```css
.cjar-cta { background-color: #D4A017; color: #292524; display: flex; align-items: center; justify-content: center; }
.cjar-cta:hover { background-color: #B8860B; }
```

Add immediately after (before the next rule):

```css
/* DD-30 — a fixed-width leading slot on every podium row, medal or blank, so 4th place
   and below still align with 1st-3rd instead of only the top row having a leading glyph. */
.cjar-medal-slot { display: inline-block; width: 1.4rem; text-align: center; flex-shrink: 0; }
```

- [ ] **Step 2: Rewrite the podium block in `cjarShowGameover`**

In `js/games/cjar.js`, find:

```js
    cjarPlayerNames
      .map((n, i) => ({ i, n }))
      .sort((a, b) => ranks[a.i] - ranks[b.i])
      .forEach(({ i, n }) => {
        const row = document.createElement('div');
        const top = ranks[i] === 1;
        row.className = 'flex items-center justify-between rounded-2xl px-4 py-3 shadow-sm '
          + (top ? 'bg-[#F7E9C4]' : 'bg-white');
        const left = document.createElement('span');
        left.className = 'text-sm font-semibold text-stone-800';
        left.textContent = (top ? '🍪 ' : '') + cjarRankLabel(ranks[i]) + ' — ' + n
          + (top ? ' · Top Cookie Thief' : '')
          + (red.includes(i) ? ' · Red-Handed' : '');
        const right = document.createElement('span');
        right.className = 'text-sm font-bold text-stone-600';
        right.textContent = cjarStashes[i] + ' 🍪'
          + (cjarTreatsWon[i] ? `  ·  ${cjarTreatsWon[i]} 🍰` : '');
        row.appendChild(left); row.appendChild(right);
        pod.appendChild(row);
      });
```

Replace with:

```js
    cjarPlayerNames
      .map((n, i) => ({ i, n }))
      .sort((a, b) => ranks[a.i] - ranks[b.i])
      .forEach(({ i, n }) => {
        const row = document.createElement('div');
        const top = ranks[i] === 1;
        row.className = 'flex items-center justify-between rounded-2xl px-4 py-3 shadow-sm '
          + (top ? 'bg-[#F7E9C4]' : 'bg-white');
        const left = document.createElement('span');
        left.className = 'flex items-center gap-2 text-sm font-semibold text-stone-800';
        // DD-30 — a medal in a FIXED-WIDTH slot, present on every row (blank past 3rd),
        // so the leading edge of every row's text lines up regardless of rank.
        const medal = document.createElement('span');
        medal.className = 'cjar-medal-slot';
        medal.textContent = ranks[i] === 1 ? '🥇' : ranks[i] === 2 ? '🥈' : ranks[i] === 3 ? '🥉' : '';
        const label = document.createElement('span');
        label.textContent = cjarRankLabel(ranks[i]) + ' — ' + n
          + (top ? ' · Top Cookie Thief' : '')
          + (red.includes(i) ? ' · Red-Handed' : '');
        left.appendChild(medal); left.appendChild(label);
        const right = document.createElement('span');
        right.className = 'text-sm font-bold text-stone-600';
        right.textContent = cjarStashes[i] + ' 🍪'
          + (cjarTreatsWon[i] ? `  ·  ${cjarTreatsWon[i]} 🍰` : '');
        row.appendChild(left); row.appendChild(right);
        pod.appendChild(row);
      });
```

- [ ] **Step 3: Highlight the top scorer per Raid in the history grid**

In `js/games/cjar.js`, find:

```js
  const grid = document.getElementById('cjar-history-grid');
  if (grid) {
    let html = '<table class="w-full text-xs text-stone-600"><thead><tr>'
      + '<th class="text-left font-semibold pb-1">Raid</th>';
    for (let r = 0; r < cjarRaidHistory.length; r++) html += `<th class="pb-1 px-1">${r + 1}</th>`;
    html += '</tr></thead><tbody>';
    for (let i = 0; i < cjarPlayerCount; i++) {
      html += `<tr><td class="text-left py-0.5 pr-2">${cjarPlayerNames[i]}</td>`;
      for (let r = 0; r < cjarRaidHistory.length; r++) {
        html += `<td class="text-center py-0.5 px-1">${(cjarRaidHistory[r] || [])[i] || 0}</td>`;
      }
      html += '</tr>';
    }
    grid.innerHTML = html + '</tbody></table>';
  }
```

Replace with:

```js
  const grid = document.getElementById('cjar-history-grid');
  if (grid) {
    // Per-Raid max computed ONCE, not per cell — DD-30's top-scorer highlight. No
    // highlight on a tie (a shared max with more than one holder).
    const colMax = cjarRaidHistory.map(col => Math.max(0, ...(col || []).map(v => v || 0)));
    let html = '<table class="w-full text-xs text-stone-600"><thead><tr>'
      + '<th class="text-left font-semibold pb-1">Raid</th>';
    for (let r = 0; r < cjarRaidHistory.length; r++) html += `<th class="pb-1 px-1">${r + 1}</th>`;
    html += '</tr></thead><tbody>';
    for (let i = 0; i < cjarPlayerCount; i++) {
      html += `<tr><td class="text-left py-0.5 pr-2">${cjarPlayerNames[i]}</td>`;
      for (let r = 0; r < cjarRaidHistory.length; r++) {
        const col = cjarRaidHistory[r] || [];
        const val = col[i] || 0;
        const tiedCount = col.filter(v => (v || 0) === colMax[r]).length;
        const hi = colMax[r] > 0 && val === colMax[r] && tiedCount === 1;
        html += `<td class="text-center py-0.5 px-1${hi ? ' font-bold cjar-label' : ''}">${val}</td>`;
      }
      html += '</tr>';
    }
    grid.innerHTML = html + '</tbody></table>';
  }
```

- [ ] **Step 4: Add bridge getters**

In `tools/verify-cjar-loopback.js`, find:

```js
  resetState()       { cjarResetState(); },
```

Add two new methods immediately before it:

```js
  // DD-30 — the podium IS built with createElement/appendChild (a real mock element
  // tree), so child traversal works. The history grid is built as a raw HTML STRING
  // (innerHTML=), and this mock's innerHTML setter only stores the string and clears
  // .children — it does NOT parse it — so history-grid checks below read the string.
  podiumMedal(i) {
    const row = document.getElementById('cjar-podium').children[i];
    const slot = row && row.children[0] && row.children[0].children[0];
    return slot ? slot.textContent : null;
  },
  historyHTML() { return document.getElementById('cjar-history-grid').innerHTML; },
  resetState()       { cjarResetState(); },
```

- [ ] **Step 5: Add assertions where the harness already reaches gameover**

Find (around line 739):

```js
  check('host reached the end',   lastScreen(host2), 'screen-cjar-gameover');
  check('client reached the end', lastScreen(client2), 'screen-cjar-gameover');
```

Add immediately after:

```js
  check('1st place has a medal',     C2.podiumMedal(0), '🥇');
  check('4th place slot is blank, not absent', C2.podiumMedal(3), '');
  // The raid-history top-scorer highlight adds `cjar-label` to exactly the winning
  // cell(s) in a Raid column — checking the RAW HTML string is deliberate here (see
  // the historyHTML() bridge getter's own comment for why this mock can't be walked
  // as elements). At least one Raid column should show the class somewhere, unless
  // every single Raid in this match ended in an exact tie across all 4 seats — a
  // one-in-a-billion coincidence across a real shuffle, not something to special-case.
  check('at least one raid history cell is highlighted',
        /cjar-label/.test(C2.historyHTML()), true);
```

`C2.podiumMedal(i)` (added in Step 4) already returns the medal SLOT's own `textContent` — since the
slot renders unconditionally (Step 2's rewrite), a blank string for the 4th row (not `null`, not
missing) is exactly what proves the fixed-width slot is present-but-empty rather than omitted.

Only 4 players are seated in this section (check the `H2.seat({ players: 4, ... })` call above it to
confirm) — `C2.podiumMedal(3)` is the 4th and last row, which is exactly the "past 3rd" case DD-30
targets.

- [ ] **Step 6: Run the loopback harness**

```bash
node tools/verify-cjar-loopback.js
```

Expected: `ALL CHECKS PASSED`.

- [ ] **Step 7: Commit**

```bash
git add js/games/cjar.js css/styles.css tools/verify-cjar-loopback.js
git commit -m "feat(cjar): gameover podium uses a fixed medal slot, raid history highlights the top scorer (DD-30)"
```

---

### Task 8: Same-screen button parity — CJAR's gameover + menu buttons, plus the two new `ui-style.md` rules (DD-31)

**Files:**
- Modify: `index.html` — `#screen-cjar-gameover`'s `btn-cjar-go-leave`, `#screen-cjar-menu`'s `btn-cjar-menu-back`
- Modify: `.claude/rules/ui-style.md` — Universal Menu Standard's type-scale table + prose, plus a new podium-medal pattern note
- Modify: `docs/deferred-work.md` — one new entry for the 17-other-game sweep

**Interfaces:** None — this task is button classes + documentation, no functions change.

- [ ] **Step 1: Resize CJAR's two under-sized buttons**

Create `tools/tmp-cjar-btn-parity.js`:

```js
const fs = require('fs');
const p = 'index.html';
let s = fs.readFileSync(p, 'utf8');

const olds = [
  {
    old: `<button id="btn-cjar-go-leave" class="min-h-11 w-full rounded-2xl bg-stone-200 hover:bg-stone-300 active:scale-95 text-stone-500 text-sm font-semibold transition-all duration-150">Leave the Jar</button>`,
    neu: `<button id="btn-cjar-go-leave" class="min-h-14 w-full rounded-2xl bg-stone-200 hover:bg-stone-300 active:scale-95 text-stone-500 text-xl font-semibold transition-all duration-150">Leave the Jar</button>`,
  },
  {
    old: `<button id="btn-cjar-menu-back" class="min-h-11 w-full rounded-2xl bg-stone-200 hover:bg-stone-300 active:scale-95 text-stone-500 text-base font-medium transition-all duration-150">← Back to the Box</button>`,
    neu: `<button id="btn-cjar-menu-back" class="min-h-14 w-full rounded-2xl bg-stone-200 hover:bg-stone-300 active:scale-95 text-stone-500 text-xl font-semibold transition-all duration-150">← Back to the Box</button>`,
  },
];

olds.forEach(({ old, neu }) => {
  const n = s.split(old).length - 1;
  if (n !== 1) { console.error('expected 1 occurrence of:', old, '\ngot', n); process.exit(1); }
  s = s.split(old).join(neu);
});

fs.writeFileSync(p, s, 'utf8');
console.log('OK');
```

Run it:

```bash
node tools/tmp-cjar-btn-parity.js && rm tools/tmp-cjar-btn-parity.js
```

- [ ] **Step 2: Update `ui-style.md`'s Universal Menu Standard**

Find (in `.claude/rules/ui-style.md`, § Universal Menu Standard):

```
**Type scale (added Aug 2026 — was previously unstated, and cjar shipped wrong because of it):**

| Button | Classes |
|--------|---------|
| Play CTA | `min-h-14 w-full rounded-2xl [brand] text-xl font-semibold` |
| How to Play | `min-h-14 w-full rounded-2xl bg-stone-700 hover:bg-stone-800 text-white text-xl font-semibold` |
| Settings | `min-h-14 w-full rounded-2xl [light brand tint] text-xl font-semibold` |
| ← Back to the Box | `min-h-11 w-full rounded-2xl bg-stone-200 hover:bg-stone-300 text-stone-500 text-base font-medium` |

All four also carry `active:scale-95 transition-all duration-150`. The three top buttons are
`text-xl`; **only** Back to Box steps down, and it steps down on *both* size and weight
(`text-base font-medium`) because it is navigation, not an action. Verified unanimous across
PKO, FLW, SHP, FRT, NT and PASS. cjar shipped How-to/Settings at `text-base` and Back at
`text-sm font-semibold` — invisible in isolation, obvious beside any other game (cjar DD-07).
```

Replace with:

```
**Type scale — superseded 8 Aug 2026 (DD-31, `2026-08-08-cjar-stage-polish-design.md`).** The
original Aug 2026 version of this table carved out "← Back to the Box" as deliberately smaller
because "it is navigation, not an action." That carve-out is retired: **same-screen buttons
representing real, distinct choices match in size and weight, no exceptions** — a screen with a
primary CTA and a secondary exit/back option is still two real choices being offered, not one
action and one non-action.

| Button | Classes |
|--------|---------|
| Play CTA | `min-h-14 w-full rounded-2xl [brand] text-xl font-semibold` |
| How to Play | `min-h-14 w-full rounded-2xl bg-stone-700 hover:bg-stone-800 text-white text-xl font-semibold` |
| Settings | `min-h-14 w-full rounded-2xl [light brand tint] text-xl font-semibold` |
| ← Back to the Box | `min-h-14 w-full rounded-2xl bg-stone-200 hover:bg-stone-300 text-stone-500 text-xl font-semibold` |

All four carry `active:scale-95 transition-all duration-150`. **This same rule applies to any
other same-screen button pair** — a gameover screen's primary "Play Again" alongside its
secondary "Leave", a Decision Modal's confirm/cancel (already conforming — see § Quit Overlay
Checklist), or any future pairing: match size and weight, and pick colour per § Game Brand
Colour — Scope (brand for the primary action, neutral stone for a secondary one).

**Rollout status:** applied to CJAR (`btn-cjar-go-leave`, `btn-cjar-menu-back`) 8 Aug 2026. The
other 17 games' menu and gameover screens have **not** been swept — logged in
`docs/deferred-work.md` alongside the other pending suite-wide sweeps. Verified unanimous
type-scale across PKO, FLW, SHP, FRT, NT and PASS **before** this rule existed — those games may
still carry the OLD "Back steps down" shape and need the same pass CJAR just got.
```

- [ ] **Step 3: Add the medal-podium pattern to `ui-style.md`**

Find the end of § Per-Game Reference's **Table B** section (search for the line `**Every game in Table B has a Sylly Mode** — there is no exception.`) and add a new subsection immediately after it, before `### Table C`:

```

### Gameover podium rank icons (added 8 Aug 2026, DD-30/DD-31)

Any gameover "podium" that wants a rank icon (not every game needs one — plenty just show a
rank number) uses **🥇🥈🥉 in a fixed-width leading slot present on every row**, blank past 3rd
place, so every row's text starts at the same x position regardless of rank. This is the
existing suite-wide medal convention (already shipped independently in FRT, GTH, JEC, NAT,
PASS, YGI) with the fixed-slot alignment fix CJAR needed formalised as the documented shape
going forward:

```html
<span class="cjar-medal-slot">🥇</span>  <!-- or 🥈 / 🥉 / '' for 4th+ -->
```

`width: 1.4rem; text-align: center; flex-shrink: 0` (or the equivalent for the game's own
prefix convention) is the load-bearing part — a row with NO medal must still reserve the slot's
width, or its text starts further left than a medalled row's and the podium reads as
misaligned (this was CJAR's actual bug: only 1st place carried a leading glyph at all, so it
was the only row indented past the others). **Prospective, not retroactive** — new or
touched-anyway games follow this shape; the existing FRT/GTH/JEC/NAT/PASS/YGI podiums are not
being swept to add a fixed slot unless one of them is independently touched.
```

- [ ] **Step 4: Log the deferred sweep**

In `docs/deferred-work.md`, find the `## Smaller flagged items` section and add a new bullet at the top of that section (directly after the `## Smaller flagged items` heading, before the first `~~` resolved item):

```markdown
- **DD-31's same-screen button-parity rule has only been applied to CJAR.** `ui-style.md` §
  Universal Menu Standard now requires every same-screen button pair (a menu's Play CTA vs its
  Back to the Box, a gameover screen's primary vs its Leave/secondary option) to match in size
  and weight — no "navigation is smaller" exception anymore. The other 17 games' menu and
  gameover screens have not been audited against this. Same shape as the Aug 2026 action-button
  emoji sweep: grep both `index.html` and `js/games/*.js` (a JS-built label is exactly as much
  a same-screen button as static markup — that sweep's own lesson). Detail:
  `docs/superpowers/specs/2026-08-08-cjar-stage-polish-design.md` DD-31.
```

- [ ] **Step 5: Run the loopback harness (regression check)**

```bash
node tools/verify-cjar-loopback.js
```

Expected: `ALL CHECKS PASSED` — this task changes no id, no function, no text content the harness reads.

- [ ] **Step 6: Commit**

```bash
git add index.html .claude/rules/ui-style.md docs/deferred-work.md
git commit -m "feat(cjar): same-screen button parity (DD-31) — CJAR now, suite rule + deferred sweep logged"
```

---

### Task 9: SW version bump, code-map, game-identities, CLAUDE.md, implementation notes, decision log

**Files:**
- Modify: `sw.js:4` (`CACHE_NAME`)
- Modify: `docs/code-map.md`
- Modify: `docs/rules/game-identities.md` § Game 18
- Modify: `CLAUDE.md` § Current Focus, § SW Version
- Modify: `docs/implementation-notes/cjar-implementation-notes.md`
- Modify: `docs/decision-log.md`

**Interfaces:** None — pure documentation and a version string.

- [ ] **Step 1: Bump the service-worker cache version**

In `sw.js`, find:

```js
const CACHE_NAME = 'sylly-games-v164';
```

Replace with:

```js
const CACHE_NAME = 'sylly-games-v165';
```

No entries need adding to `PRECACHE_URLS` — this round adds no new images, fonts, or data files, only changed JS/CSS/HTML that the cache-busting version string already covers.

- [ ] **Step 2: Update `docs/code-map.md`**

Grep for the CJAR section (`grep -n "Cookie Jar" docs/code-map.md` or search for `cjar-table-hero` / `cjar-reveal-rows` — do not full-read the file, it's ~132 KB). Add, near wherever `cjar-reveal-rows`, `cjar-stage-label-now`, and `cjar-history-grid` are currently documented:

- `cjar-reveal-header` — new element, the standings header row (`cjarRenderRevealRows`, `js/games/cjar.js`).
- `cjar-card-view-overlay` / `cjar-card-view-body` / `cjar-card-view-name` / `btn-cjar-card-view-close` — new overlay, opened by `cjarOpenCardView(card)` from a trail-thumb tap.
- Note that `cjar-stage-label-now`'s face-down text is now `'Next from Jar'` (was `'next out of the jar'`), and column 3's label text is now `'Left in Jar'` (was `'the jar'`).
- Note `.cjar-reveal-grid`, `.cjar-status-in`, `.cjar-status-out`, `.cjar-medal-slot` as new CSS classes in `css/styles.css`.

Follow whatever section/table structure the surrounding CJAR entries already use — match the existing format rather than inventing a new one.

- [ ] **Step 3: Update `docs/rules/game-identities.md` § Game 18**

Grep for `## Game 18` (Cookie Jar's section) and update:
- The stage-column heading descriptions (all three now read top-down: "up for grabs" / "Next from Jar" / "Left in Jar").
- The score-table description — now has a header row and a 5th column (Status: Still In / Snuck Out, base game only).
- The gameover podium — medal-in-fixed-slot rank icons, no cookie-emoji prefix.
- Any overlay list — add `cjar-card-view-overlay`.

Match the existing section's format (whatever level of detail the current § Game 18 entry already uses for other UI elements) rather than inventing a new structure.

- [ ] **Step 4: Update `CLAUDE.md`**

In § SW Version, change `v164` to `v165` and add a new paragraph (following the existing style of the CJAR entries already there — read the current § Current Focus block for the tone/format to match) summarising: the stage-polish round, DD-25 through DD-31, that it's presentational-only (no rules/packet change), the new harness counts (see Step 5 below for the actual numbers — do not guess them, run the harnesses and read their printed totals), and a pointer to `docs/superpowers/specs/2026-08-08-cjar-stage-polish-design.md` and `docs/implementation-notes/cjar-implementation-notes.md`.

Also update the top-line "Previous versions" pointer if the current text says `v163 and earlier` — it should now say `v164 and earlier`.

- [ ] **Step 5: Run all five harnesses and record their totals**

```bash
node tools/verify-cjar-deck.js && node tools/verify-cjar-loop.js && node tools/verify-cjar-dd.js
node tools/verify-cjar-loopback.js
node tools/simulate-cjar-dd.js
```

Read the printed check counts (each harness prints its total near `ALL CHECKS PASSED` or in its header comment style — match how `CLAUDE.md`'s existing SW v164 paragraph cites `verify-cjar-loopback.js **164**` etc.) and use the REAL numbers in Step 4's `CLAUDE.md` paragraph, not the old v164 numbers.

- [ ] **Step 6: Add implementation-notes entries**

In `docs/implementation-notes/cjar-implementation-notes.md`, add entries for DD-25 through DD-31 under the appropriate existing sections (Design Decisions for DD-25/26/26a/27/28/29/30/31; if there's a Template Gaps section, that's likely where DD-31's "the button-parity rule superseded a documented exception" observation belongs too, since it's a lesson about the PREVIOUS rule being wrong, not just a CJAR-local decision). Follow the file's existing entry format — read a couple of existing DD-1x entries first to match the "What happened → Root cause → Lesson" shape the skill instructions elsewhere in this project describe.

- [ ] **Step 7: Add a decision-log entry**

In `docs/decision-log.md`, add one line at the top (newest-first) for DD-31 specifically — it's the cross-cutting one (a documented UI-style rule changed project-wide). Follow the existing one-line format used by other entries in that file (4 lines max, pointer not deep-dive, per `CLAUDE.md`'s Documentation Integrity Protocol).

- [ ] **Step 8: Final full-suite verification**

```bash
node tools/verify-cjar-deck.js && node tools/verify-cjar-loop.js && node tools/verify-cjar-dd.js
node tools/verify-cjar-loopback.js
node tools/simulate-cjar-dd.js
```

Expected: `ALL CHECKS PASSED` on the first four; the fifth prints its balance numbers and exits 0.

- [ ] **Step 9: Commit**

```bash
git add sw.js docs/code-map.md docs/rules/game-identities.md CLAUDE.md docs/implementation-notes/cjar-implementation-notes.md docs/decision-log.md
git commit -m "docs(cjar): stage-polish round closure — SW v165, DD-25..DD-31 documented"
```

---

## Post-plan note

This plan does not include a real-device playtest — per the parent spec's own honesty check in DD-25, the actual "does this feel smooth now, or does the blocking dwell drag" question can only be answered by playing it. Once Task 9 is committed, the natural next step is the same kind of live multi-device session that closed out the Aug 7 rework, not another round of code changes.
