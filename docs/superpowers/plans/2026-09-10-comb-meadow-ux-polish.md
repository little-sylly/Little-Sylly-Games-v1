# Honeycomb Hills Meadow UX Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the deterministic roll-7 client strand in Honeycomb Hills, then rework `screen-comb-meadow`'s dead letterbox space into a player panel + persistent roll result + probability ruler + player-stats strip, add a post-roll/placement board fade with legal-target glow, add Trade Blossom reach affordances, and turn `comb-map-overlay` into a 3-zone full-detail view.

**Architecture:** All new UI is painted by the single renderer `combRenderMeadow()` (or `combDrawBoard()` for canvas work) behind `if (!el) return` guards, and reads only existing public state — no new packets except one boolean field on `COMB_OVERFLOW_DONE`. New panels float over `#comb-board-stage` (already `position: relative`), adding zero layout height so the board stays fit-to-view and the `h-screen` whitelist exception holds. The P0 bug fix makes `combBeginSeven()` broadcast exactly one outcome packet on every branch.

**Tech Stack:** Vanilla ES6 (global functions, no modules, no build step), HTML5 canvas 2D, Tailwind utility classes + `css/styles.css` for bespoke rules, Node-run `tools/verify-comb-*.js` harnesses, Playwright via the `visual-check` skill for layout checks.

**Spec:** `docs/superpowers/specs/2026-09-10-comb-meadow-ux-polish-design.md` — read it alongside this plan; the plan argues from it.

## Global Constraints

- **No build step, no npm for the app, no external JS libraries, single HTML page.** (CLAUDE.md § Anti-Patterns)
- **`index.html` is ~515 KB — never full-read it.** Grep for the element ID or section header, then offset-Read. Targeted `Edit` on a single contiguous region is fine; **never** a systematic multi-region find/replace (UTF-8 mojibake risk — memory `feedback_indexhtml_encoding`). Keep literal non-ASCII (emoji, `—`, `·`) OUT of `index.html` edits — new markup is empty containers; glyphs come from JS via `combRenderResource` or from existing entities already in the file.
- **`combRenderMeadow()` is the ONLY writer to `screen-comb-meadow`** and sets every element every render (seven phases, one screen). Every new element is painted from there, each behind `if (!el) return`.
- **`combDrawBoard(canvasEl, viewport)` is the ONLY board renderer** — shared by the inline board and the magnifier. Do not add a second.
- **Motion Standard:** animate `transform`/`opacity` only. Opacity fades need no reduced-motion guard (no travel). No `@keyframes` on the flight.
- **MDLM-only game.** Every applier: never assign a raw payload collection (use `combWireArr` / `combApplyCounts` / `combApplyNodes`); never recompute the two achievement holders; never throw (`combHandleEnvelope` catches and `console.warn`s — a loopback only sees a dead applier if it warns).
- **Australian English, metric.** UI copy and docs: colour, flavour, organise.
- **Player colours:** `COMB_PLAYER_COLOUR = ['#F0A500', '#2E6DB4', '#3E8E41', '#C0392B']` (gold, blue, green, red) — `js/games/comb.js:2257`. Brand gold `#F0A500` == player 0.
- **SW:** `CACHE_NAME` currently `sylly-games-v225`. Any change shipping new `index.html`/`comb.js`/`css` bumps it — done once, in the final task.
- **Verification after any packet/render change:** `node tools/verify-comb-loopback.js`; after any rules change also `node tools/verify-comb-loop.js` and `node tools/mutate-comb.js` **3–5 times** (not once).

---

## File Structure

| File | Responsibility in this plan |
|---|---|
| `js/games/comb.js` | All logic + render. S1 fix (`combScoutFlight`, `combBeginSeven`, `combOverflowResolve`, `combStatusLine`, two appliers); S2–S6 render functions + `combRenderMeadow()` wiring; S4/S5.1/S5.2 in `combDrawBoard`/`combBuildStatic`/`combDrawTargets`; S6 map-overlay render + wheel handler |
| `index.html` | `screen-comb-meadow` markup: new container divs in `#comb-board-stage`, `#comb-turn-order` replaced, `#comb-meadow-points` removed; `comb-map-overlay` restructured into three zones |
| `css/styles.css` | Bespoke classes: `.comb-player-panel*`, `.comb-roll-result`, `.comb-prob-ruler*`, `.comb-player-strip*`, `.comb-focus-dim` transition, `.comb-map-zone*` |
| `tools/verify-comb-loopback.js` | Two new S1 regression cases (nobody-owes 7; mixed-owe 7) |
| `docs/game-identities/comb.md` | T7a (new panels, overlay restructure), T7b (owe-aware status copy, map hint caption) |
| `docs/code-map.md` | COMB section: new IDs, removed IDs, `COMB_OVERFLOW_DONE.spilled`, S1 packet note |
| `docs/implementation-notes/comb-implementation-notes.md` | Bug Index + Multiplayer Lesson (S1); Design Decisions (letterbox-float, overlay-as-detail-view) |
| `docs/decision-log.md` | One line — `comb-map-overlay` promoted to detail view |
| `docs/deferred-work.md` | Tick the T7c turn-handover gap as addressed |
| `docs/content-prompts/comb-art-prompts.md` | New "Running the convert tool yourself" section (S7) |
| `sw.js` | `CACHE_NAME` v225 → v226 (final task) |
| `docs/sw-changelog.md`, `CLAUDE.md` | SW entry + Current Focus (final task) |

Scratchpad only (never committed): `visual-check` driver scripts.

---

## Task 0: Branch

- [ ] **Step 1: Create the working branch**

```bash
cd "d:/Coding Projects/Little-Sylly-Games"
git checkout -b comb-meadow-ux-polish
git status
```

Expected: on `comb-meadow-ux-polish`, working tree clean.

---

## Task 1: S1 — the P0 roll-7 strand fix + regression tests + owe-aware copy

**Files:**
- Modify: `js/games/comb.js` — `combScoutFlight` (`:1440-1448`), `combBeginSeven` (`:1474-1494`), `combOverflowResolve` (`:1532-1539`), `combStatusLine` (`:2700-2703`), `COMB_ROLL_RESULT` applier (`:4162-4176`), `COMB_OVERFLOW_DONE` applier (`:4190-4196`)
- Modify: `tools/verify-comb-loopback.js` — add two cases
- Modify: `docs/game-identities/comb.md` — T7b `# screen-comb-meadow — combStatusLine()` copy block
- Test: `tools/verify-comb-loopback.js`, `tools/verify-comb-loop.js`, `tools/mutate-comb.js`, `tools/verify-identity-docs.js`

**Interfaces:**
- Produces: `COMB_OVERFLOW_DONE` payload now always carries `spilled: <bool>` and `phase: 'waspMove'`. Applier reads `const spilled = ('spilled' in p) ? !!p.spilled : true;`.
- Produces: `COMB_ROLL_RESULT` on a 7 carries `seven: true` and **no** `phase` field (was `phase: 'overflow'`).
- Consumes: existing `combHandCount(p)`, `combCarryLimit()`, `combZeroGrid()`, `combHandCounts()`, `combEnterWaspMove()`, `combBroadcast()`, `combLogAppend()`.

- [ ] **Step 1: Write the failing regression case — nobody-owes 7**

In `tools/verify-comb-loopback.js`, find the existing overflow scenario (grep `OVERFLOW`), and add a new scenario after it. It must: build a host + 2 clients over the wire; deal a match with `overflow: 'off'` (default Short Summer preset); drive a turn to the `roll` phase; force the roll to 7 (grep how existing cases stub `combRollDice` / inject a roll — reuse that); then assert on **all three** sandboxes:

```js
// After the 7 is rolled and packets drain:
assert.equal(host.__comb.phase, 'waspMove', 'host reaches waspMove');
assert.equal(c1.__comb.phase,   'waspMove', 'client 1 reaches waspMove (was stranded in overflow)');
assert.equal(c2.__comb.phase,   'waspMove', 'client 2 reaches waspMove');
// the roller (say seat 1 == c1) must have Wasp placement armed:
assert.equal(c1.__comb.mode(), 'wasp', 'roller can move the Wasp');
assert.ok(c1.__comb.targets() > 0, 'roller has legal Wasp hexes');
// no device logged the spill line, and nobody threw:
assert.ok(!host.__errors.length && !c1.__errors.length && !c2.__errors.length, 'no applier warned/threw');
assert.ok(!host.__comb.logHas || !host.__comb.logHas('spilled over'), 'no false spill log');
```

(If the harness has no `logHas` helper, add a trivial `logHas(s){ return combLog.some(l => l.includes(s)); }` to the `__comb` bridge in the same file.)

- [ ] **Step 2: Run it — verify it fails**

Run: `node tools/verify-comb-loopback.js`
Expected: FAIL — clients assert `overflow !== waspMove` (the strand), reproducing the bug.

- [ ] **Step 3: Fix `combScoutFlight`'s 7 branch**

`js/games/comb.js` ~`:1440`. Replace the 7 branch's broadcast so it no longer claims a phase:

```js
  if (roll === 7) {
    combPlay('waspRolled');
    combBroadcast('COMB_ROLL_RESULT', {
      roll, seven: true, handCounts: combHandCounts(),
      produced: combZeroGrid(), waspBlockedHex: combWaspHex,
    });
    combBeginSeven();
    return { ok: true, roll, produced: null };
  }
```

- [ ] **Step 4: Fix `combBeginSeven`'s no-owe branch to broadcast**

`js/games/comb.js` ~`:1484`. The no-owe branch must tell every device to advance:

```js
  if (!combOverflowOwed.some(v => v > 0)) {
    // No discard is owed (Overflow off, or nobody over the limit). The clients
    // have already entered a transient "seven" beat off COMB_ROLL_RESULT; this
    // is the packet that moves them on. Without it they strand (BUG: the strand).
    combBroadcast('COMB_OVERFLOW_DONE', {
      spilled: false, phase: 'waspMove', handCounts: combHandCounts(),
    });
    combEnterWaspMove();
    return;
  }
  combPhase = 'overflow';
```

- [ ] **Step 5: Make `combOverflowResolve` send `spilled: true`**

`js/games/comb.js` ~`:1535`:

```js
  combBroadcast('COMB_OVERFLOW_DONE', {
    handCounts: combHandCounts(), phase: 'waspMove', spilled: true,
  });
```

- [ ] **Step 6: Update the `COMB_OVERFLOW_DONE` applier for `spilled`**

`js/games/comb.js` ~`:4190`:

```js
    case 'COMB_OVERFLOW_DONE': {
      combShow('comb-overflow-overlay', false);
      combApplyCounts(p);
      combPlay('overflowDone');
      combPhase = p.phase || 'waspMove';
      const spilled = ('spilled' in p) ? !!p.spilled : true;
      if (spilled) combLogAppend('The hive spilled over.');
      combEnterWaspMove();
      return;
    }
```

Check the host path: `combOverflowResolve` currently calls `combLogAppend('The hive spilled over.')` itself (`:1534`). Keep that on the host side (it only runs when someone owed). The applier's log-append is for **clients**, which never ran the host resolve. Confirm no double-append on a host-as-participant by reading the surrounding code; if the host also routes through this applier, gate the host's `:1534` append behind `combIsAuthority()` staying as-is and remove the applier's append duplication risk by checking `combSeatOf`/origin — grep how other appliers avoid host double-logging (e.g. `COMB_LOG_APPEND` pattern) and match it.

- [ ] **Step 7: Make the 7 status line owe-aware**

`js/games/comb.js` `combStatusLine` ~`:2700`. Replace `case 'overflow':` and handle the transient seven beat:

```js
    case 'overflow': {
      const me = combLocalIdx();
      if ((combOverflowOwed[me] | 0) > 0 && !combOverflowReady[me]) {
        return 'A seven. Half of what you are carrying goes back to the meadow.';
      }
      return 'A seven. Waiting on the others to spill.';
    }
```

For the no-owe path there is no `overflow` phase at all after the fix — the device goes straight to `waspMove`, whose lines already read *"Park the Wasp somewhere painful."* / *"[Name] is moving the Wasp."*. If a transient `seven` flag is surfaced anywhere (e.g. a brief flash), word it as *"A seven!"* only — never the spill sentence.

- [ ] **Step 8: Run the regression case — verify it passes**

Run: `node tools/verify-comb-loopback.js`
Expected: PASS, including the new nobody-owes case.

- [ ] **Step 9: Add the mixed-owe regression case**

In `tools/verify-comb-loopback.js`, add a second new case: `overflow: 'snug'`, seat 1 holding > 7 (owes), seats 0 and 2 under. Force a 7. Assert: seat 1's device opens `comb-overflow-overlay` (`c1.__comb.overflowUp() === true`), seats 0 and 2 do **not**, the gate stays closed until seat 1 submits, then all three reach `waspMove` and the log has exactly one "spilled over" line.

- [ ] **Step 10: Run the full COMB suite**

```bash
node tools/verify-comb-loopback.js
node tools/verify-comb-loop.js
node tools/mutate-comb.js && node tools/mutate-comb.js && node tools/mutate-comb.js && node tools/mutate-comb.js && node tools/mutate-comb.js
```
Expected: loopback + loop green; `mutate-comb` 71/71 (or the current mutant count) every run.

- [ ] **Step 11: Update the identity-doc copy block**

`docs/game-identities/comb.md`, the T7b block headed `# screen-comb-meadow — combStatusLine()`. Replace the line `A seven. Everyone over the limit spills half.` with the two new contiguous strings actually emitted:

```
A seven. Half of what you are carrying goes back to the meadow.
A seven. Waiting on the others to spill.
```

(The `[Name] is moving the Wasp.` other-player form is already described in the prose beneath the block — no change there.)

- [ ] **Step 12: Verify identity docs**

Run: `node tools/verify-identity-docs.js`
Expected: PASS — `comb.md` strings all matched against the shipped `index.html` + `comb.js`.

- [ ] **Step 13: Commit**

```bash
git add js/games/comb.js tools/verify-comb-loopback.js docs/game-identities/comb.md
git commit -m "fix(comb): broadcast the seven's outcome when no discard is owed

Every 7 stranded every client: combBeginSeven()'s no-owe branch entered
waspMove locally and broadcast nothing, while COMB_ROLL_RESULT had already
put clients in the overflow phase. Fires on every 7 on the default Short
Summer (Overflow presets to Off, so nobody ever owes).

combBeginSeven() now always broadcasts one outcome: COMB_OVERFLOW_BEGIN
when someone owes, COMB_OVERFLOW_DONE {spilled:false} otherwise. The 7's
COMB_ROLL_RESULT no longer claims a phase. Status copy is owe-aware so it
never names a discard the settings disallow.

Two new loopback regression cases: nobody-owes 7, mixed-owe 7.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: S5.1 — hot pog dark text, pip dots removed

**Files:**
- Modify: `js/games/comb.js` — `combBuildStatic` pog block (`:2895-2908`)
- Test: `visual-check` driver (scratchpad); `node tools/verify-comb-loopback.js`

**Interfaces:**
- Consumes: nothing new. Pure canvas change inside the static-cache builder.
- Produces: nothing consumed downstream.

- [ ] **Step 1: Capture a before shot**

Use the `visual-check` skill. Serve the app (per the skill's §1), seed a COMB match to the `actions` phase (seed recipe: set `combPlayerCount`/`combPlayerNames`/settings vars, `combStartMatchLocal(seed)`, then force `combPhase='actions'`, populate a few `combNodes`/`combEdges`, `combRenderMeadow()`, `showScreen('screen-comb-meadow')`), screenshot to the scratchpad. Note the 6/8 pogs.

- [ ] **Step 2: Darken the hot number, delete the pip row**

`js/games/comb.js` ~`:2895`. Replace:

```js
    // Bloom Marker number. Dark ink on both disc kinds — the hot disc's own
    // red rim carries the "fat marker" signal; the number stays legible.
    ctx.fillStyle = hot ? '#2A1A16' : '#3A322A';
    ctx.font = `700 ${Math.round(s * 0.46)}px Fredoka, system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(hex.marker), x, y);
```

Delete the entire `// The pip row …` block (`const pips = …` through the `for` loop). Rarity now lives in the probability ruler (Task 5).

- [ ] **Step 3: After shot + compare**

Re-run the driver. The 6/8 numbers read as dark on the red disc; no pip dots anywhere.

- [ ] **Step 4: Loopback still green**

Run: `node tools/verify-comb-loopback.js`
Expected: PASS (it executes `combDrawBoard` against a mock canvas).

- [ ] **Step 5: Commit**

```bash
git add js/games/comb.js
git commit -m "polish(comb): dark hot-pog numbers, drop the invisible pip row

Cream-on-red was unreadable; the pip dots were invisible at board scale.
Rarity moves to the probability ruler (next tasks).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: S2 markup + CSS — top-zone containers, header points line removed

**Files:**
- Modify: `index.html` — `screen-comb-meadow` `#comb-board-stage` (`:10464-10480`) and header (`:10452-10455`)
- Modify: `css/styles.css` — new classes (append near the other `.comb-*` rules; grep `.comb-turn-order`)
- Test: `visual-check` driver

**Interfaces:**
- Produces: DOM ids `#comb-player-panel`, `#comb-roll-result`, `#comb-prob-ruler` inside `#comb-board-stage`. `#comb-turn-order` removed. `#comb-meadow-points` removed.

- [ ] **Step 1: Replace `#comb-turn-order`, add the two centre containers**

In `index.html`, inside `#comb-board-stage` (the `<div id="comb-board-stage" …>`), replace the `<div id="comb-turn-order" …></div>` line with:

```html
      <!-- Player panel — floats over the top-left letterbox dead-space, adds no
           layout height. Painted by combRenderPlayerPanel(). Active row lights
           up = the turn-handover signal (identity doc T7c). -->
      <div id="comb-player-panel" class="comb-player-panel absolute top-2 left-2 pointer-events-none flex flex-col gap-1"></div>
      <!-- The landed Scout Flight, kept visible until the next cast. -->
      <div id="comb-roll-result" class="comb-roll-result absolute left-1/2 top-2 -translate-x-1/2 pointer-events-none"></div>
      <!-- 11-tick 2d6 probability ruler, under the result. -->
      <div id="comb-prob-ruler" class="comb-prob-ruler absolute left-1/2 -translate-x-1/2 pointer-events-none flex items-end gap-px" style="top:2.6rem"></div>
```

Keep `#comb-float-layer` and `#btn-comb-map-open` exactly as they are.

- [ ] **Step 2: Remove the header points line**

In the header block (`:10452-10455`), delete the line:

```html
        <p id="comb-meadow-points" class="text-stone-400 text-xs truncate"></p>
```

Leave `#comb-meadow-turn` (the `TURN N · NAME` line) untouched.

- [ ] **Step 3: Add CSS**

`css/styles.css`, near `.comb-turn-order` (which can now be deleted — grep it's unused elsewhere first, `.comb-turn-order-dot` / `-now` too):

```css
.comb-player-panel { max-width: 42%; z-index: 5; }
.comb-player-row {
  display: flex; align-items: center; gap: .3rem;
  font: 600 .68rem/1 Fredoka, system-ui, sans-serif;
  color: #57534e; background: rgba(255,255,255,.55);
  border-radius: .5rem; padding: .18rem .4rem; backdrop-filter: blur(2px);
  transition: background .15s ease, transform .15s ease;
}
.comb-player-row-now { background: rgba(255,255,255,.92); transform: scale(1.04); font-weight: 700; }
.comb-player-dot { width:.55rem; height:.55rem; border-radius:9999px; flex:none; }
.comb-player-take { display:flex; align-items:center; gap:.15rem; color:#78716c; }
.comb-player-take img { width:.8rem; height:.8rem; }

.comb-roll-result {
  font: 800 1.6rem/1 Fredoka, system-ui, sans-serif; color:#B87A00;
  background: rgba(255,255,255,.8); border-radius:.7rem; padding:.1rem .5rem;
  z-index: 5;
}
.comb-roll-result-seven { color:#B3261E; }

.comb-prob-ruler { height: 1.4rem; z-index: 5; }
.comb-prob-tick { width: 3px; border-radius: 1px; background: #6B6157; opacity:.5; }
.comb-prob-tick-now { outline: 2px solid #B87A00; outline-offset: 1px; opacity:1; }
```

(Tick per-value height and colour ramp are set inline by JS in Task 5 — these are the shared shell rules.)

- [ ] **Step 4: Visual check — nothing overlaps, no h-scroll**

`visual-check` driver at 390×844 and 414×896. Assert:

```js
document.documentElement.scrollWidth <= document.documentElement.clientWidth  // no h-scroll
// containers exist and sit inside the board stage:
['comb-player-panel','comb-roll-result','comb-prob-ruler'].every(id => !!document.getElementById(id))
document.getElementById('comb-meadow-points') === null
```

They render empty this task — the check is layout only.

- [ ] **Step 5: Commit**

```bash
git add index.html css/styles.css
git commit -m "feat(comb): top-zone containers, drop the header point strip

Empty containers + CSS shell for the player panel, roll result and
probability ruler, floating over the board stage's top letterbox. Removes
the unreadable 'Sam 2 · Shirley 2' header line; combRenderMeadow wiring
lands in the next tasks.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: S2 — player panel render + turn-handover highlight

**Files:**
- Modify: `js/games/comb.js` — new `combRenderPlayerPanel()`; call it from `combRenderMeadow()` (replace the deleted turn-order block ~`:2615-2626`); store last roll's `produced` grid
- Test: `visual-check` driver; `node tools/verify-comb-loopback.js`

**Interfaces:**
- Consumes: `COMB_PLAYER_COLOUR`, `combPlayerCount`, `combName(p)`, `combTurn`, `combLocalIdx()`, `combRenderResource(kind, opts)`, `COMB_RES`.
- Produces: `combRenderPlayerPanel()` (void, paints `#comb-player-panel`). New module var `combLastProduced` (`number[N][5] | null`), set in `combScoutFlight` and the `COMB_ROLL_RESULT` applier, cleared at the head of a cast (`combStartFlight` or when `combPhase` becomes `'roll'`).

- [ ] **Step 1: Add `combLastProduced` and populate it**

`js/games/comb.js`, near the other UI-only module vars (grep `let combFlightView`): `let combLastProduced = null;`

In `combScoutFlight`, non-7 branch, after `const produced = combProduce(roll);` add `combLastProduced = produced.map(r => r.slice());`. In the 7 branch set `combLastProduced = combZeroGrid();`.

In the `COMB_ROLL_RESULT` applier (~`:4171`), after `const grid = combWireArr(p.produced, combPlayerCount, null);` add:

```js
      combLastProduced = grid.map(r => combWireArr(r, COMB_RES.length, 0).map(v => v | 0));
```

In `combStartFlight()` (grep it) or wherever `combPhase` is set to `'roll'` at turn begin, set `combLastProduced = null;` so the panel clears the take column when a new cast starts.

- [ ] **Step 2: Write `combRenderPlayerPanel()`**

```js
// Floats over the top-left letterbox. Public state only: turn-order colour,
// name, and this round's take from combLastProduced (COMB_ROLL_RESULT.produced
// is public — the whole table watches every roll for it). The active row lights
// up: on a board identical on every phone, this is the turn-handover signal.
function combRenderPlayerPanel() {
  const box = combClear('comb-player-panel');
  if (!box) return;
  for (let p = 0; p < combPlayerCount; p++) {
    const row = document.createElement('div');
    row.className = 'comb-player-row' + (p === combTurn ? ' comb-player-row-now' : '');

    const dot = document.createElement('span');
    dot.className = 'comb-player-dot';
    dot.style.background = COMB_PLAYER_COLOUR[p] || '#888';
    row.appendChild(dot);

    const name = document.createElement('span');
    name.textContent = combName(p).slice(0, 8);
    row.appendChild(name);

    const take = document.createElement('span');
    take.className = 'comb-player-take';
    const got = (combLastProduced && combLastProduced[p]) || [0, 0, 0, 0, 0];
    const any = got.some(v => v);
    if (!any) {
      take.textContent = '—';
    } else {
      COMB_RES.forEach((kind, i) => {
        if (!got[i]) return;
        const n = document.createElement('span');
        n.textContent = got[i] + '\u00D7';                 // "2×"
        take.appendChild(n);
        take.appendChild(combRenderResource(kind, { small: true, glyphOnly: true }));
      });
    }
    row.appendChild(take);
    box.appendChild(row);
  }
}
```

If `combRenderResource` has no `glyphOnly` option, add one: a branch returning just the icon `<img>`/glyph span with no count and no chip chrome. Grep the function, match its existing option style.

- [ ] **Step 3: Wire it into `combRenderMeadow()`**

Replace the deleted turn-order dot block (`js/games/comb.js:2615-2626`) with:

```js
  // ── Player panel (was the turn-order dots) ──
  combRenderPlayerPanel();
```

- [ ] **Step 4: Visual check**

Seed a match, set `combLastProduced` to a mixed grid, `combTurn = 2`. Screenshot. Assert the panel has `combPlayerCount` rows, row index 2 carries `comb-player-row-now`, no horizontal body scroll, panel right edge < `#btn-comb-map-open` left edge.

- [ ] **Step 5: Loopback**

Run: `node tools/verify-comb-loopback.js`
Expected: PASS — no applier throws with the new `combLastProduced` write.

- [ ] **Step 6: Commit**

```bash
git add js/games/comb.js
git commit -m "feat(comb): player panel with per-round takes and turn-handover highlight

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: S2 — persistent roll result + probability ruler

**Files:**
- Modify: `js/games/comb.js` — new `combRenderRollResult()`, `combRenderProbRuler()`; call both from `combRenderMeadow()`
- Test: `visual-check` driver (fit assertion); `node tools/verify-comb-loopback.js`

**Interfaces:**
- Consumes: `combRoll` (`number | null`), `COMB_ROLL_FREQ` (new const).
- Produces: `combRenderRollResult()`, `combRenderProbRuler()` (void). New const `COMB_ROLL_FREQ = {2:1,3:2,4:3,5:4,6:5,7:6,8:5,9:4,10:3,11:2,12:1}`.

- [ ] **Step 1: Add the frequency table**

`js/games/comb.js`, near `COMB_MARKERS` (grep):

```js
// 2d6 outcomes out of 36 — drives the probability ruler's tick heights and the
// red→gold rarity ramp. 7 is the peak; 2 and 12 the floor.
const COMB_ROLL_FREQ = { 2:1, 3:2, 4:3, 5:4, 6:5, 7:6, 8:5, 9:4, 10:3, 11:2, 12:1 };
```

- [ ] **Step 2: Write `combRenderRollResult()`**

```js
// The landed Scout Flight, kept on screen until the next cast. The flight
// animation lands INTO this; it is not a second animation.
function combRenderRollResult() {
  const el = document.getElementById('comb-roll-result');
  if (!el) return;
  if (!combRoll || combPhase === 'roll' || combPhase === 'draft') { el.style.display = 'none'; return; }
  el.style.display = 'block';
  el.textContent = String(combRoll);
  el.classList.toggle('comb-roll-result-seven', combRoll === 7);
}
```

- [ ] **Step 3: Write `combRenderProbRuler()`**

```js
// 11 ticks, 2..12. Height and opacity encode 2d6 frequency; colour ramps from
// red at 7 to dull gold at the 2/12 outliers. The current roll's tick is ringed.
// Pure function of combRoll — no state, no packet. Rarity used to live in the
// pog pip row (removed); it lives here now, readable.
function combRenderProbRuler() {
  const box = combClear('comb-prob-ruler');
  if (!box) return;
  if (!combRoll || combPhase === 'roll' || combPhase === 'draft') { box.style.display = 'none'; return; }
  box.style.display = 'flex';
  for (let v = 2; v <= 12; v++) {
    const f = COMB_ROLL_FREQ[v];                 // 1..6
    const tick = document.createElement('span');
    tick.className = 'comb-prob-tick' + (v === combRoll ? ' comb-prob-tick-now' : '');
    tick.style.height = (0.3 + f * 0.18) + 'rem';          // 0.48rem .. 1.38rem
    // rarity ramp: distance from 7 (0..5) -> red (#B3261E) to gold (#6B6157)
    const d = Math.abs(7 - v);                             // 0 at seven
    tick.style.background = d === 0 ? '#B3261E'
      : `color-mix(in srgb, #B3261E ${Math.round((1 - d / 5) * 100)}%, #6B6157)`;
    box.appendChild(tick);
  }
}
```

If `color-mix` is a concern for the target browsers (it is fine in current Chromium/Safari/Firefox and this app already uses modern CSS), keep it; otherwise precompute a 6-colour array `['#B3261E','#A83A2E','#9D4F3F','#8A5A4E','#77605A','#6B6157']` indexed by `d`.

- [ ] **Step 4: Wire both into `combRenderMeadow()`**

After the `combRenderPlayerPanel();` call added in Task 4:

```js
  combRenderRollResult();
  combRenderProbRuler();
```

- [ ] **Step 5: Visual check — the ruler fits**

Seed a match, `combPhase='actions'`, `combRoll=8`. Screenshot at 390×844. Assert:

```js
const panel = document.getElementById('comb-player-panel').getBoundingClientRect();
const ruler = document.getElementById('comb-prob-ruler').getBoundingClientRect();
const mag   = document.getElementById('btn-comb-map-open').getBoundingClientRect();
panel.right < ruler.left && ruler.right < mag.left     // three-across, no overlap
document.documentElement.scrollWidth <= document.documentElement.clientWidth
```

If the three-across assertion fails at 390 px, apply the spec's fallback: in `combRenderProbRuler`, render only `combRoll-1 .. combRoll+1` (clamped 2..12) — 3 ticks — and move the full 11-tick to the overlay only (Task 9 already renders it there). Note the fallback in the commit message.

- [ ] **Step 6: Loopback**

Run: `node tools/verify-comb-loopback.js`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add js/games/comb.js
git commit -m "feat(comb): persistent roll result + 2d6 probability ruler

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: S3 — bottom player-stats strip

**Files:**
- Modify: `index.html` — add `#comb-player-strip` inside `#comb-board-stage` (after `#comb-float-layer`)
- Modify: `css/styles.css` — `.comb-player-strip*`
- Modify: `js/games/comb.js` — new `combRenderPlayerStrip()`, `combCountStructures(p)`; call from `combRenderMeadow()`; wire a tap → `combOpenMap()` scrolled to stats
- Test: `visual-check` driver

**Interfaces:**
- Consumes: `combNodes`, `combEdges`, `combPublicPoints(p)`, `combPublicInstinct[p]`, `combAchievementMark(p)`, `combName(p)`, `COMB_PLAYER_COLOUR`, `combLocalIdx()`, `combTurn`, `combOpenMap()`.
- Produces: `combRenderPlayerStrip()` (void, paints `#comb-player-strip`), `combCountStructures(p)` → `{cells, domes, walls}`.

- [ ] **Step 1: Markup**

`index.html`, inside `#comb-board-stage`, after the `#comb-float-layer` div:

```html
      <!-- Player-stats snapshot — floats over the bottom letterbox. 2x2 grid,
           two players per side. Taps through to the map overlay's stats zone.
           Full detail lives there; this is the at-a-glance. -->
      <div id="comb-player-strip" class="comb-player-strip absolute left-2 right-2 bottom-2 grid grid-cols-2 gap-x-3 gap-y-1"></div>
```

- [ ] **Step 2: CSS**

```css
.comb-player-strip { z-index: 5; }
.comb-player-card {
  background: rgba(255,255,255,.62); border-radius:.55rem; padding:.28rem .45rem;
  backdrop-filter: blur(2px); font: 600 .66rem/1.15 Fredoka, system-ui, sans-serif;
  color:#57534e;
}
.comb-player-card-now { background: rgba(255,255,255,.92); box-shadow: 0 0 0 2px #B87A00 inset; }
.comb-player-card-top { display:flex; align-items:center; gap:.3rem; }
.comb-player-card-stats { display:flex; gap:.5rem; color:#78716c; margin-top:.12rem; }
```

- [ ] **Step 3: `combCountStructures(p)`**

```js
function combCountStructures(p) {
  let cells = 0, domes = 0, walls = 0;
  for (const nd of combNodes) if (nd && nd.owner === p) { if (nd.level === 2) domes++; else if (nd.level === 1) cells++; }
  for (const e of combEdges) if (e === p) walls++;
  return { cells, domes, walls };
}
```

- [ ] **Step 4: `combRenderPlayerStrip()`**

```js
// The at-a-glance. All public: visible VP, structure counts, unplayed Instinct
// count (never kind). combPublicInstinct is the public mirror; combInstinct is
// this device's own hand only. Tapping opens the map overlay's stats zone.
function combRenderPlayerStrip() {
  const box = combClear('comb-player-strip');
  if (!box) return;
  const me = combLocalIdx();
  for (let p = 0; p < combPlayerCount; p++) {
    const card = document.createElement('div');
    card.className = 'comb-player-card' + (p === combTurn ? ' comb-player-card-now' : '');

    const top = document.createElement('div');
    top.className = 'comb-player-card-top';
    const dot = document.createElement('span');
    dot.className = 'comb-player-dot';
    dot.style.background = COMB_PLAYER_COLOUR[p] || '#888';
    top.appendChild(dot);
    const nm = document.createElement('span');
    nm.textContent = combName(p).slice(0, 9) + combAchievementMark(p);
    top.appendChild(nm);
    const vp = document.createElement('span');
    vp.style.marginLeft = 'auto';
    vp.textContent = combPublicPoints(p) + ' VP';
    top.appendChild(vp);
    card.appendChild(top);

    const s = combCountStructures(p);
    const inst = (combPublicInstinct && combPublicInstinct[p]) | 0;
    const stats = document.createElement('div');
    stats.className = 'comb-player-card-stats';
    stats.textContent = `\u2B22${s.cells}  \u{1F451}${s.domes}  \u2501${s.walls}  \u{1F3B4}${inst}`;
    card.appendChild(stats);

    box.appendChild(card);
  }
  box.onclick = () => { playDone(); combOpenMap('stats'); };
  box.style.pointerEvents = 'auto';
}
```

(Glyphs via `\uXXXX` escapes so no literal non-ASCII enters the source on Windows. If the emoji render poorly at this size in the visual check, swap to the resource-shaped mini icons via `combRenderResource(..., {glyphOnly:true})` for cells/domes and keep text for walls/instinct — decide at Step 6.)

- [ ] **Step 5: Wire into `combRenderMeadow()` + teach `combOpenMap` an optional target**

After `combRenderProbRuler();`:

```js
  combRenderPlayerStrip();
```

`combOpenMap()` (`:3390`) gains an optional arg: `function combOpenMap(scrollTo) { … combMapScrollTo = scrollTo || null; … }` — stash it; Task 9's overlay render reads `combMapScrollTo` and scrolls its bottom zone into view when it's `'stats'`, then clears it.

- [ ] **Step 6: Visual check**

Seed a 4-player match with varied `combNodes`/`combEdges`/`combPublicInstinct`. Screenshot. Assert: 4 cards in a 2×2 grid, none clipped, names not overflowing their card, `document.documentElement.scrollWidth <= clientWidth`, the strip's top edge > the drawn board's bottom (compare against `#comb-board-canvas` content — or just assert the strip sits in the bottom ~120 px band).

- [ ] **Step 7: Commit**

```bash
git add index.html css/styles.css js/games/comb.js
git commit -m "feat(comb): bottom player-stats strip, taps through to the map overlay

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: S4 — board focus-dim + placement legal-target colour glow

**Files:**
- Modify: `js/games/comb.js` — `combDrawBoard` (`:2936-2967`): dim layer; `combDrawTargets` (`:3072`): player-colour glow; new `combFocusDimAlpha()` helper
- Test: `visual-check` driver; `node tools/verify-comb-loopback.js`

**Interfaces:**
- Consumes: `combPhase`, `combRoll`, `combHexes`, `combWaspHex`, `combPlacementMode`, `combLocalIdx()`, `COMB_PLAYER_COLOUR`.
- Produces: `combFocusDimAlpha()` → `number` (0 = no dim, else the overlay alpha, e.g. 0.35 for a 65%-visible board). Dim is drawn as a translucent meadow-ground rect over the static blit, before the Wasp/walls/structures so pieces stay full.

- [ ] **Step 1: `combFocusDimAlpha()`**

```js
// 65% board visibility (alpha 0.35 of meadow ground) in two contexts:
//  - after a roll, so "what just bloomed" reads at a glance
//  - during Build placement, so the legal-target glow pops
// Pieces, pogs and blossoms are drawn AFTER the dim, so they stay full.
function combFocusDimAlpha() {
  if (combPlacementMode && combPlacementMode !== 'wasp') return 0.35;
  if (combPhase === 'actions' && combRoll && combRoll !== 7) return 0.35;
  return 0;
}
```

- [ ] **Step 2: Apply the dim in `combDrawBoard`**

`js/games/comb.js` ~`:2938`, immediately after `if (stat) ctx.drawImage(stat, 0, 0, cssW, cssH);`:

```js
  // Focus dim — a wash over the static board only. Post-roll: everything except
  // the hexes that bloomed. Placement: everything except legal targets + own
  // network (the glow in combDrawTargets sits on top). Pieces/pogs/blossoms are
  // drawn below this line and keep full contrast.
  const dim = combFocusDimAlpha();
  if (dim > 0) {
    ctx.save();
    ctx.globalAlpha = dim;
    ctx.fillStyle = '#EAF3DC';                 // meadow ground, matches layer 1
    if (combPhase === 'actions' && combRoll && !combPlacementMode) {
      // punch holes over the blooming hexes
      for (let h = 0; h < combHexes.length; h++) {
        const hx = combHexes[h];
        if (!hx || hx.marker !== combRoll || h === combWaspHex) {
          combFillHex(ctx, h, tr);              // helper: path the hex, fill
        }
      }
    } else {
      ctx.fillRect(0, 0, cssW, cssH);          // placement: wash the lot
    }
    ctx.restore();
  }
```

Add `combFillHex(ctx, h, tr)` near `combHexCornerPts` (grep) — path the hex's top-face polygon and `ctx.fill()`. If `combHexCornerPts` already returns the points, this is three lines.

- [ ] **Step 3: Player-colour legal-target glow**

`js/games/comb.js:3073`. Replace `const brand = '#F0A500';` with:

```js
  const brand = COMB_PLAYER_COLOUR[combLocalIdx()] || '#F0A500';
```

Bump the target glow's `globalAlpha` from `0.5`/`0.55` to `0.7` and add a second wider soft pass (lower alpha, larger radius) so it reads over the dimmed ground — match the existing draw style, don't rewrite it.

- [ ] **Step 4: Visual check — dim reads, glow pops**

Two shots: (a) `combPhase='actions'`, `combRoll=8`, no placement — only the `8` hexes at full, rest at ~65%. (b) `combPlacementMode='cell'` with `combLegalTargets` populated — board dimmed, target nodes glowing in `COMB_PLAYER_COLOUR[me]`. Eyeball both; assert no h-scroll and `combDrawBoard` did not throw (`page.on('pageerror')`).

- [ ] **Step 5: Loopback**

Run: `node tools/verify-comb-loopback.js`
Expected: PASS (executes `combDrawBoard` + `combDrawTargets` against the mock canvas).

- [ ] **Step 6: Commit**

```bash
git add js/games/comb.js
git commit -m "feat(comb): post-roll + placement board focus-dim with colour target glow

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 8: S5.2 — Trade Blossom reach affordance

**Files:**
- Modify: `js/games/comb.js` — new `combDrawBlossomHints(ctx, tr)`; call it from `combDrawBoard` after the structures pass (`:2964`), gated off placement mode
- Test: `visual-check` driver; `node tools/verify-comb-loopback.js`

**Interfaces:**
- Consumes: `COMB_TOPOLOGY.ports` (each `{nodes:[a,b], kind, rate}`), `combNodes`, `combLocalIdx()`, `combWallLegal`/`combCellLegal` (grep the exact cell-legality fn used by `combLegalTargetsFor` for `kind==='cell'`), `COMB_RES_COLOUR`, `tr.toX/toY`, `COMB_TOPOLOGY.nodes`.
- Produces: `combDrawBlossomHints(ctx, tr)` (void).

- [ ] **Step 1: Write `combDrawBlossomHints`**

```js
// Reach affordance for the local player, drawn ABOVE structures, BELOW nothing.
//  - a port you have NOT reached: a soft dock glow (port's colour) on whichever
//    of its two corner nodes a Drone Cell could legally go on
//  - a port you HAVE reached: a glow on YOUR cell/dome sitting on the enabling
//    node, same colour — "the rate is live from here"
// Suppressed entirely during Build placement (combDrawTargets owns the board
// then; two glow systems at once is noise).
function combDrawBlossomHints(ctx, tr) {
  if (combPlacementMode) return;
  const me = combLocalIdx();
  if (me < 0) return;
  for (const port of COMB_TOPOLOGY.ports) {
    const colour = port.kind === 'any' ? '#FFFFFF' : (COMB_RES_COLOUR[port.kind] || '#FFFFFF');
    const reachedNode = port.nodes.find(n => combNodes[n] && combNodes[n].owner === me && combNodes[n].level > 0);
    if (reachedNode !== undefined) {
      combGlowNode(ctx, reachedNode, tr, colour, 0.55);
      continue;
    }
    for (const n of port.nodes) {
      if (combNodes[n] && combNodes[n].level > 0) continue;         // occupied
      const legal = combCellLegal(me, n, {});                        // grep exact name
      if (legal && legal.ok) combGlowNode(ctx, n, tr, colour, 0.32);
    }
  }
}

function combGlowNode(ctx, n, tr, colour, alpha) {
  const p = COMB_TOPOLOGY.nodes[n];
  const x = tr.toX(p.x), y = tr.toY(p.y), r = Math.max(8, tr.R * 0.34);
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, colour);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
```

- [ ] **Step 2: Call it from `combDrawBoard`**

`js/games/comb.js` ~`:2964`, after the cells/domes loop and before `if (combPlacementMode) combDrawTargets(ctx, tr);`:

```js
  combDrawBlossomHints(ctx, tr);
```

- [ ] **Step 3: Visual check**

Seed a match where `me` has a cell on one port's node and none near another. Screenshot. Confirm: your reached port's cell carries a coloured halo; an unreached port shows faint halos on its buildable corners; nothing during `combPlacementMode`.

- [ ] **Step 4: Loopback**

Run: `node tools/verify-comb-loopback.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/games/comb.js
git commit -m "feat(comb): Trade Blossom reach affordance (dock glow / live-rate glow)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 9: S6 — `comb-map-overlay` as a 3-zone detail view

**Files:**
- Modify: `index.html` — `comb-map-overlay` (`:11082-11089`) into top/middle/bottom zones
- Modify: `css/styles.css` — `.comb-map-zone*`, gesture-lock rules
- Modify: `js/games/comb.js` — `combOpenMap`/`combCloseMap` (`:3390-3405`), the map render path (`:3145`), the canvas gesture block (`:4660-4709`): add `wheel` zoom; new `combRenderMapPanel()` (full player panel + big result + full 11-tick annotated ruler) and `combRenderMapStats()` (full table); the `combMapScrollTo` handling from Task 6
- Test: `visual-check` driver (two contexts); `node tools/verify-comb-loopback.js`

**Interfaces:**
- Consumes: everything Tasks 4–5 produce, plus `combLongestChain(p)` (grep — returns chain length), `combBankRate(p, i)`, `COMB_RES`.
- Produces: `combRenderMapPanel()`, `combRenderMapStats()` (void). `combOpenMap(scrollTo?)` honours `combMapScrollTo`.

- [ ] **Step 1: Markup — three zones, board gesture-locked**

Replace the inside of `#comb-map-overlay` (keep the outer `div` + its `z-[75] bg-black/80` — the z-fight-loser contract holds):

```html
  <div id="comb-map-overlay" style="display:none"
    class="fixed inset-0 z-[75] bg-black/90 flex flex-col">
    <div id="comb-map-top" class="comb-map-zone flex-shrink-0 px-3 pt-3 pb-2 flex items-start justify-between gap-3"></div>
    <div id="comb-map-mid" class="comb-map-zone relative flex-1 min-h-0 overflow-hidden"
         style="touch-action:none; overscroll-behavior:contain;">
      <canvas id="comb-map-canvas" class="absolute inset-0 w-full h-full"></canvas>
      <p id="comb-map-hint" class="absolute bottom-2 left-1/2 -translate-x-1/2 max-w-[19rem] text-center text-white/80 text-[0.7rem] px-2 py-1 rounded-lg bg-black/55 pointer-events-none">Pinch or scroll to zoom · drag to pan</p>
    </div>
    <div id="comb-map-bottom" class="comb-map-zone flex-shrink-0 px-3 pt-2 pb-3 overflow-y-auto max-h-[38vh]"></div>
    <button id="btn-comb-map-close"
      class="absolute top-3 right-3 z-10 min-h-11 min-w-11 rounded-xl bg-white/85 text-stone-700 font-bold text-xl flex items-center justify-center active:scale-90 transition-transform duration-100"
      aria-label="Close the map">✕</button>
  </div>
```

- [ ] **Step 2: CSS**

```css
.comb-map-zone { color: #f5f5f4; }
#comb-map-top .comb-player-row { background: rgba(255,255,255,.14); color:#f5f5f4; }
#comb-map-top .comb-player-row-now { background: rgba(255,255,255,.3); }
.comb-map-stats-table { width:100%; border-collapse:collapse; font: 600 .72rem/1.3 Fredoka, system-ui, sans-serif; }
.comb-map-stats-table th, .comb-map-stats-table td { padding:.25rem .4rem; text-align:center; }
.comb-map-stats-table th:first-child, .comb-map-stats-table td:first-child { text-align:left; }
.comb-map-stats-table tr + tr { border-top: 1px solid rgba(255,255,255,.15); }
```

- [ ] **Step 3: `combRenderMapPanel()` — reuse the panel, add the annotated ruler**

```js
function combRenderMapPanel() {
  const top = document.getElementById('comb-map-top');
  if (!top) return;
  top.innerHTML = '';
  // left: the same player panel content, full names
  const panel = document.createElement('div');
  panel.className = 'comb-player-panel-full flex flex-col gap-1';
  for (let p = 0; p < combPlayerCount; p++) {
    const row = document.createElement('div');
    row.className = 'comb-player-row' + (p === combTurn ? ' comb-player-row-now' : '');
    const dot = document.createElement('span');
    dot.className = 'comb-player-dot'; dot.style.background = COMB_PLAYER_COLOUR[p] || '#888';
    row.appendChild(dot);
    const nm = document.createElement('span'); nm.textContent = combName(p);
    row.appendChild(nm);
    panel.appendChild(row);
  }
  top.appendChild(panel);
  // right: big result + full annotated ruler
  const right = document.createElement('div');
  right.className = 'flex flex-col items-center gap-1';
  if (combRoll && combPhase !== 'roll' && combPhase !== 'draft') {
    const big = document.createElement('div');
    big.className = 'comb-roll-result' + (combRoll === 7 ? ' comb-roll-result-seven' : '');
    big.style.fontSize = '2.2rem'; big.textContent = String(combRoll);
    right.appendChild(big);
    right.appendChild(combBuildProbRuler(true));    // annotated = value labels + xN/36
  }
  top.appendChild(right);
}
```

Refactor Task 5's `combRenderProbRuler` so the tick-building loop is a shared `combBuildProbRuler(annotated)` returning a DOM node; `combRenderProbRuler()` becomes `combSet` of `#comb-prob-ruler`'s content to `combBuildProbRuler(false)`. Annotated mode appends a `<span>` under each tick: the value, and `×${COMB_ROLL_FREQ[v]}/36`.

- [ ] **Step 4: `combRenderMapStats()` — the full table**

```js
function combRenderMapStats() {
  const box = document.getElementById('comb-map-bottom');
  if (!box) return;
  const cols = ['', 'VP', 'Cells', 'Domes', 'Walls', 'Chain', 'Instinct', 'Blossoms'];
  let html = '<table class="comb-map-stats-table"><tr>' + cols.map(c => `<th>${c}</th>`).join('') + '</tr>';
  for (let p = 0; p < combPlayerCount; p++) {
    const s = combCountStructures(p);
    const chain = combLongestChain(p);
    const inst = (combPublicInstinct && combPublicInstinct[p]) | 0;
    let blossoms = 0;
    const seen = new Set();
    for (const port of COMB_TOPOLOGY.ports) {
      if (seen.has(port)) continue;
      if (port.nodes.some(n => combNodes[n] && combNodes[n].owner === p && combNodes[n].level > 0)) { blossoms++; seen.add(port); }
    }
    html += `<tr><td>${combName(p)}${combAchievementMark(p)}</td><td>${combPublicPoints(p)}</td>`
          + `<td>${s.cells}</td><td>${s.domes}</td><td>${s.walls}</td><td>${chain}</td>`
          + `<td>${inst}</td><td>${blossoms}</td></tr>`;
  }
  html += '</table>';
  html += `<p class="text-white/70 text-xs mt-2">${combStatusLine(combIsMyTurn(), combName(combTurn))}</p>`;
  box.innerHTML = html;
}
```

(`combName` output is app-authored, not user free-text beyond nicknames — but nicknames CAN contain markup chars. Escape: run each `combName(p)` through a tiny `combEsc(s)` that replaces `& < >`. Add `combEsc` near `combName` if not present.)

- [ ] **Step 5: Wire the renders + scroll target**

In the map render path (grep `combMapOpen` at `:3145` — the block that redraws `comb-map-canvas`), after drawing the canvas add:

```js
    combRenderMapPanel();
    combRenderMapStats();
    if (combMapScrollTo === 'stats') {
      const b = document.getElementById('comb-map-bottom');
      if (b) b.scrollIntoView({ block: 'end' });
      combMapScrollTo = null;
    }
```

Declare `let combMapScrollTo = null;` with the other UI vars; set it in `combOpenMap(scrollTo)`; clear it in `combCloseMap()` and `combResetState()`.

- [ ] **Step 6: Wheel-zoom on the map canvas**

In the gesture block (`:4660-4709`), for `id === 'comb-map-canvas'` only, add:

```js
      el.addEventListener('wheel', ev => {
        ev.preventDefault();
        const factor = ev.deltaY < 0 ? 1.1 : 1 / 1.1;
        combZoom = Math.max(0.6, Math.min(4, combZoom * factor));
        combRepaintBoards();
      }, { passive: false });
```

The existing pinch/pan handlers already drive `combZoom`/`combPanX`/`combPanY` — reuse them; the `touch-action:none` + `overscroll-behavior:contain` on `#comb-map-mid` (Step 1) is what stops the gesture scrolling the sheet.

- [ ] **Step 7: Visual check — two contexts, zones hold bounds**

`visual-check` with two browser contexts (seats 0 and 1). Open the overlay in each. Assert: three zones stacked, `#comb-map-mid` clips the canvas (`overflow:hidden`), the stats table shows all `combPlayerCount` rows, no zone overlaps another, `#comb-map-bottom` scrolls internally not the page. Simulate a `wheel` event on the canvas and confirm `combZoom` changed and the top/bottom zones did not move.

- [ ] **Step 8: Loopback**

Run: `node tools/verify-comb-loopback.js`
Expected: PASS — the overlay render must not throw against mock elements (`document.getElementById` returns real mocks in the loopback; guard every new `getElementById` with `if (!el) return`).

- [ ] **Step 9: Commit**

```bash
git add index.html css/styles.css js/games/comb.js
git commit -m "feat(comb): map overlay becomes a 3-zone detail view

Panel + annotated probability ruler / gesture-locked pan-zoom board (pinch +
wheel) / full per-player stats table. Still z-75, still loses the z-fight to
the Overflow and arriving trades.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 10: S7 — art convert-tool self-serve doc

**Files:**
- Modify: `docs/content-prompts/comb-art-prompts.md` — new section
- Test: none (doc only) — read `tools/convert-comb-art.ps1` to get the real flags/paths

- [ ] **Step 1: Read the converter**

Read `tools/convert-comb-art.ps1` end to end. Note: input dir, output dir (`data/art/comb/<kind>/`), per-kind target px and format (PNG throughout except Instinct cards = JPEG), and the precache ceilings already recorded in `docs/code-map.md` (hex 350 KB, resource 150 KB, hero piece 130 KB, die 150 KB).

- [ ] **Step 2: Add the section**

Append to `docs/content-prompts/comb-art-prompts.md`:

```markdown
## Running the convert tool yourself

`tools/convert-comb-art.ps1` turns source art into the precached packs under
`data/art/comb/<kind>/`. You do not need Claude Code for this.

1. Drop replacement source images into `<input dir>` keeping the same file
   names (`hex-grove.png`, `res-resin.png`, …).
2. From the repo root: `pwsh tools/convert-comb-art.ps1`  (or `powershell -File …`).
   It writes `data/art/comb/<kind>/<id>.<ext>` and prints each output's size.
3. **Check the size line against the ceiling** — hex 350 KB, resource 150 KB,
   hero piece 130 KB, die 150 KB (the others are well under). A file over its
   ceiling means `sw.js` `CACHE_NAME` must be bumped even for a like-for-like
   swap, because the bytes served changed.
4. Open the app → any game → **How to Play → The Comb** tab (and **The Instinct
   Deck** tab). Those galleries render through the live art seams, so a
   re-convert shows there immediately, and a tile that lost its art visibly
   stops offering to enlarge — that is also the offline-install check.
5. Like-for-like swap, every file under its ceiling: **no SW version bump
   needed** (the manifest and file list are unchanged). Otherwise bump
   `CACHE_NAME` in `sw.js`.
```

- [ ] **Step 3: Commit**

```bash
git add docs/content-prompts/comb-art-prompts.md
git commit -m "docs(comb): how to run the art convert tool without Claude Code

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 11: Documentation-closure pass

**Files:**
- Modify: `docs/code-map.md`, `docs/game-identities/comb.md` (T7a), `docs/implementation-notes/comb-implementation-notes.md`, `docs/decision-log.md`, `docs/deferred-work.md`
- Test: `node tools/verify-comb-loopback.js`, `verify-comb-loop.js`, `verify-comb-board.js`, `verify-comb-rules.js`, `mutate-comb.js` ×5, `verify-mp-configs.js`, `verify-identity-docs.js` — all green

- [ ] **Step 1: `docs/code-map.md` — COMB section**

Grep `Honeycomb Hills (COMB)` (`:2288`). Update:
- Screens/overlays: `#comb-turn-order` → removed; `#comb-meadow-points` → removed; new `#comb-player-panel`, `#comb-roll-result`, `#comb-prob-ruler`, `#comb-player-strip` in the meadow screen's element list.
- `comb-map-overlay` line: note the 3-zone restructure (`#comb-map-top` / `#comb-map-mid` / `#comb-map-bottom`), wheel-zoom, `combRenderMapPanel`/`combRenderMapStats`, still z-75.
- Packets: `COMB_OVERFLOW_DONE` now carries `spilled` (bool); `COMB_ROLL_RESULT` on a 7 carries `seven:true` and no phase; note in the seven section that `combBeginSeven` always broadcasts one outcome.
- Key functions: add `combRenderPlayerPanel`, `combRenderRollResult`, `combRenderProbRuler`/`combBuildProbRuler`, `combRenderPlayerStrip`, `combCountStructures`, `combFocusDimAlpha`, `combDrawBlossomHints`, `combRenderMapPanel`, `combRenderMapStats`. New state: `combLastProduced`, `combMapScrollTo`, `COMB_ROLL_FREQ`.

- [ ] **Step 2: `docs/game-identities/comb.md` — T7a**

Update the `screen-comb-meadow` row / overlay table: the meadow screen now carries a floating player panel (top-left), persistent roll result + probability ruler (top-centre), and a player-stats strip (bottom); `comb-map-overlay` is the 3-zone full-detail view (panel + annotated ruler / pan-zoom board / stats table), still the z-fight-loser. Respect the section's **paired** tag — this ships with the code in this branch, so it is allowed. Re-run `verify-identity-docs.js`.

- [ ] **Step 3: `comb-implementation-notes.md`**

Add:
- **Bug Index** — the roll-7 strand: *What happened* (every 7 stranded every client on default settings; host in waspMove, clients frozen in overflow) → *Root cause* (`combBeginSeven`'s no-owe branch entered waspMove locally and broadcast nothing; `COMB_ROLL_RESULT` had already claimed `phase:'overflow'`) → *Lesson*.
- **Multiplayer Lessons** — the loopback gap: every overflow case drove the "someone owes" branch; the "nobody owes → straight to Wasp" branch was never sent over the wire. New rule of thumb: for any phase with a conditional skip, the loopback needs a case that takes the skip.
- **Design Decisions** — the letterbox-float pattern (panels over `#comb-board-stage`'s dead space, zero layout height, keeps the `h-screen` whitelist honest); `comb-map-overlay` promoted from magnifier to the game's detail view.

- [ ] **Step 4: `docs/decision-log.md`**

One entry, newest on top, ~4 lines: `comb-map-overlay` promoted from pinch-zoom magnifier to a 3-zone detail view (panel + annotated ruler / pan-zoom board / full stats). Pointer to this plan + spec.

- [ ] **Step 5: `docs/deferred-work.md`**

In the COMB / T7c items: mark the **turn-handover beat** gap as addressed (the player panel's active-row highlight, SW v226). Leave the other three T7c spots (short gameover, Season Log reach, empty standby roster) open.

- [ ] **Step 6: Full suite**

```bash
node tools/verify-comb-board.js && node tools/verify-comb-rules.js && node tools/verify-comb-loop.js && node tools/verify-comb-loopback.js
node tools/mutate-comb.js && node tools/mutate-comb.js && node tools/mutate-comb.js && node tools/mutate-comb.js && node tools/mutate-comb.js
node tools/verify-mp-configs.js && node tools/verify-identity-docs.js
```
Expected: all green; `mutate-comb` full count every run.

- [ ] **Step 7: Commit**

```bash
git add docs/
git commit -m "docs(comb): close out the meadow UX polish batch

code-map, identity doc T7a, impl-notes (roll-7 strand + loopback gap +
letterbox-float pattern), decision-log, deferred-work.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 12: SW version bump

**Files:**
- Modify: `sw.js` (`CACHE_NAME`), `docs/sw-changelog.md`, `CLAUDE.md` (§ Current Focus)

- [ ] **Step 1: Bump `CACHE_NAME`**

`sw.js`: `sylly-games-v225` → `sylly-games-v226`. No `PRECACHE_URLS` change (no new files — `index.html`, `comb.js`, `css/styles.css` are already listed).

- [ ] **Step 2: Move the outgoing Current Focus entry to the changelog**

Per CLAUDE.md § Current Focus rules: copy the existing `**SW v225 …**` paragraph **verbatim** into `docs/sw-changelog.md` (newest on top), then replace § Current Focus's SW block with a v226 entry (≤6 lines): Honeycomb Hills meadow UX polish — the roll-7 strand fix (every 7 stranded every client on default settings), a floating player panel + persistent roll result + 2d6 probability ruler + player-stats strip over the board's letterbox, post-roll/placement focus-dim, Trade Blossom reach glow, and `comb-map-overlay` rebuilt as a 3-zone detail view. Harnesses listed green.

- [ ] **Step 3: Full suite once more (post-bump sanity)**

```bash
node tools/verify-comb-loopback.js && node tools/verify-mp-configs.js && node tools/verify-identity-docs.js
```
Expected: green.

- [ ] **Step 4: Commit**

```bash
git add sw.js docs/sw-changelog.md CLAUDE.md
git commit -m "chore(comb): ship the meadow UX polish batch — SW v226

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Hand back**

Report the branch name and the commit range. Do not merge or push — the owner decides.

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
|---|---|
| S1 roll-7 fix + `spilled` + owe-aware copy + regression | Task 1 |
| S2 top zone — panel, roll result, ruler | Tasks 3 (markup), 4 (panel), 5 (result + ruler) |
| S2.1 turn-handover signal | Task 4 (active-row highlight) |
| S2.5 header points line removed | Task 3 |
| S3 bottom player strip | Task 6 |
| S4 focus-dim (post-roll + placement) + legal-target colour glow | Task 7 |
| S5.1 hot pog text + pip removal | Task 2 |
| S5.2 Trade Blossom affordance | Task 8 |
| S6 map overlay 3-zone detail view + wheel zoom + gesture lock | Task 9 |
| S7 art convert-tool doc | Task 10 |
| §11 docs & verification | Tasks 11, 12 |

No spec section is uncovered.

**Placeholder scan:** No "TBD"/"add error handling"/"similar to Task N". Every code step carries real code. Two spots defer a micro-decision to a visual check with the fallback spelled out (Task 5 ruler fit → 3-tick fallback; Task 6 strip glyphs → resource-icon fallback) — these are decisions, not placeholders, and both branches are specified.

**Type consistency:**
- `combRenderProbRuler()` (Task 5) is refactored in Task 9 to delegate to `combBuildProbRuler(annotated)` — Task 9 Step 3 states the refactor explicitly, so the name is consistent where introduced.
- `combCountStructures(p)` → `{cells, domes, walls}` — defined Task 6, reused Task 9 with the same shape.
- `combLastProduced` — `number[N][5] | null`, written in Task 4, read in Task 4's panel and nowhere else.
- `combMapScrollTo` — introduced Task 6 Step 5, consumed Task 9 Step 5, cleared in `combCloseMap`/`combResetState` (both tasks name it).
- `combOpenMap(scrollTo?)` — signature extended in Task 6, honoured in Task 9. Consistent.
- `COMB_OVERFLOW_DONE.spilled` — written in Task 1 Steps 4–5, read in Step 6 with the `'spilled' in p` guard. Consistent.
- `combGlowNode` / `combFillHex` / `combEsc` — small helpers, each defined in the task that first needs it (8, 7, 9).

**Grep-before-use flagged in-task** for names not fully pinned from the plan's own reads: `combCellLegal` (Task 8 — exact cell-legality fn), `combLongestChain` (Task 9), `combStartFlight` (Task 4), the map render block at `:3145` (Task 9), `combRenderResource` option style (Task 4). Each step says to grep and match.
