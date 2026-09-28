# The Bluff — Procedural Dice, New Table, Practice — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild The Bluff's dice as procedural sets with per-seat tints, replace the table's betting UI with a model-fed counting stage, add shake/reveal choreography with the Phantom reveal, and add a scripted Practice tab that becomes the suite's tutorial standard.

**Architecture:** A new game-owned file `js/games/dyb-dice.js` holds the pure dice layer (sets → recipe → HTML markup, plus a CSS-3D cube). `js/games/dyb.js` gains pure rule functions (`dybLegalRaise`, `dybCountEvents`, `dybYouHold`, the draft reducer, the reveal plan) and **renderers that take a model object** instead of reading globals, so the live table and the Practice tab draw through identical code. No packet changes.

**Tech Stack:** Vanilla JS (ES6+, globals, no modules), HTML partials in `src/screens/` assembled by `tools/build-index.js`, Tailwind (local) + `css/styles.css`, Node `vm` harnesses in `tools/`.

**Spec:** `docs/superpowers/specs/2026-09-28-dyb-dice-table-practice-design.md` — read it first; this plan argues from it.

## Global Constraints

- **Before Task 1:** the working tree must be clean. The owner's uncommitted SW v240 changes (`sw.js`, `js/engine*.js`, docs…) are committed by the owner first. Then branch: `git switch -c dyb-dice-table-practice`.
- **No packet changes.** `MP_PROTOCOL_VERSION` stays `'v240'`. No new `DYB_*` packet, no payload field added or removed.
- **SW:** `CACHE_NAME` becomes `'sylly-games-v241'` in Task 4 and stays there for the whole build (one deploy).
- **`index.html` is generated.** Edit `src/screens/dyb.html` / `src/screens/_scripts-3.html`, then `node tools/build-index.js` and `node tools/verify-build-fresh.js`. Never edit `index.html` by hand.
- **Never use the Edit tool for sweeping changes to `index.html`** (encoding). It is generated anyway.
- **Australian English** in all copy and comments ("colour", "centre").
- **Motion:** animate only `transform`/`opacity`. Never `ease-in`. Anything scripted checks `dybReducedMotion()` in JS. Do not add a second `prefers-reduced-motion` CSS block.
- **Every timer** goes through a named bag (`dybAnimTimers` for the live game, `dybPrTimers` for Practice) and is cleared on quit-confirm, in `resetToLobby()`, and on early transitions.
- **`dyb-dice.js` never reads `dyb*` game state** — it takes everything as arguments (it moves to `js/lib/` later).
- **Player names are user input** — every name that reaches `innerHTML` goes through `dybEsc()`.
- **Copy is paired.** Any string change ships with the matching `docs/game-identities/dyb.md` § T7b `copy` block in the same commit; `node tools/verify-identity-docs.js` must pass. The checker reads only `index.html` + `js/games/dyb.js`, so **all visible copy lives in `dyb.js`** (the `DYB_COPY` object) or the markup — never in `dyb-dice.js`.
- **Test device:** the owner's iPhone SE (2nd gen) — 320×452 first, then 375×548, 375×667.
- **Practice cast:** scripted players come, in order, from Sylvia, Sam, Shirley, Jeff; The Bluff uses Sylvia and Sam.

## Review Focus

1. **An eliminated seat leaves a hole in `allRolls`**, which Firebase turns into an index-keyed object — counting and the reveal must iterate by index to `n`, never `forEach`. *Pinned:* Task 2 (object-shaped hands give identical counts) and Task 18 (a real elimination over the wire).
2. **The claim reaches the table total** (e.g. fifteen 6s at 15 dice) — `+` must go inert without freezing, and the draft must still initialise. *Pinned:* Task 9 draft-reducer tests.
3. **A nickname containing `<`, `&` or quotes** must render as text in chips, the claim line, the turn bar and the reveal rows. *Pinned:* Task 10 render test.
4. **A Slick face picked after the roll was submitted** (`DYB_SLICK_UPDATE`) must change "You hold" immediately and be what the reveal counts. *Pinned:* Task 3 (`dybYouHold` follows `slicks`) and Task 18 (picked face reaches the host's count).
5. **Opening Practice mid-game from the table's `[?]`** must not touch live state or live timers, and closing it mid-reveal must stop its timers. *Pinned:* Task 16 harness.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `js/games/dyb-dice.js` | **Create** | Dice sets, colour maths, `dybDieRecipe`, `dybDieMarkup`, mini/cup markup, set validation, `dybActiveSet`, cube markup + roll, `dybReducedMotion` |
| `js/games/dyb.js` | Modify | Pure rules, counting, draft reducer, table/reveal/practice models and renderers, choreography, Practice driver, gallery |
| `js/lib/art.js` | Modify | Add `assetDiceSet(kind)`; delete `assetSpecial`/`assetSpecialFrame` |
| `js/engine.js` | Modify | `resetToLobby()` stops DYB choreography + Practice |
| `src/screens/dyb.html` | Modify | New table / shake / showdown markup; How to Play gets the Practice tab |
| `src/screens/_scripts-3.html` | Modify | `<script src="js/games/dyb-dice.js">` before `dyb.js` |
| `css/styles.css` | Modify | Replace the DYB die block; add table, stage, cube, shake, reveal, practice styles |
| `sw.js` | Modify | Precache `dyb-dice.js`; `CACHE_NAME` v241 |
| `data/packs/deep-ocean-dice/pack.json`, `data/packs/sea-cliff-dice/pack.json` | Modify | Image maps → `diceSet`; delete their `img/` folders |
| `data/packs/classic-dice/pack.json` | **Create** | The Classic set as a skin pack |
| `data/packs/registry.json` | Modify | Add `classic-dice` |
| `tools/verify-dyb-rules.js` | **Create** | Rules, counting, "You hold", draft, stage fit, table model + render, reveal plan |
| `tools/verify-dyb-dice.js` | Rewrite | Recipe, markup, sets, packs, leak guard, cube |
| `tools/verify-dyb-practice.js` | **Create** | Practice reducer, outcomes, isolation |
| `tools/verify-dyb-loopback.js` | **Create** | Host + 2 clients over a Firebase-shaped wire, real mock DOM |
| `tools/dyb-dice-review.js` | **Create** | Writes a self-contained dice review page to `wip/` for the owner checkpoint |
| Docs (Task 20) | Modify | code-map, identity doc, CLAUDE.md, ui-style, logic-engine, expansion-guide, impl-notes, deferred-work, decision-log, sw-changelog |

---

## Phase 1 — Rules and counting

### Task 1: Pure raise rules

**Files:**
- Create: `tools/verify-dyb-rules.js`
- Modify: `js/games/dyb.js` (the block at `dybIsLegalRaise` / `dybMinQtyForFace`, ~line 673–686)

**Interfaces:**
- Produces: `dybRulesNow() → { wildcards, onesStripped }`, `dybClaimNow() → { qty, face }`, `dybFaceAllowed(face, rules) → bool`, `dybMinQty(claim, face) → int`, `dybLegalRaise(claim, bid, rules) → bool`, `dybFaceNote(face, rules) → string|null`, `DYB_FACE_REASON`. `claim`/`bid` are `{ qty, face }`; `qty: 0` means no claim.

- [ ] **Step 1: Write the failing harness**

Create `tools/verify-dyb-rules.js`:

```js
// ═══════════════════════════════════════════════════════════════════════════
// verify-dyb-rules.js — The Bluff's pure rules: legal raises, counting, what a
// player can vouch for, the bid draft, the stage fit, the table model and the
// reveal plan.
//
//   node tools/verify-dyb-rules.js        (exits 1 on any failure)
//
// Runs the REAL js/games/dyb.js (and dyb-dice.js once it exists) in a vm
// sandbox. Every function under test takes arguments — nothing here needs a DOM.
// DYB_SRC= points the harness at a deliberately-broken copy of dyb.js.
// ═══════════════════════════════════════════════════════════════════════════
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');
const ROOT = path.join(__dirname, '..');

const elStub = new Proxy(function () {}, {
  get(_t, k) { return k === Symbol.toPrimitive ? () => '' : elStub; },
  set() { return true; },
  apply() { return elStub; },
});
const sandbox = {
  console,
  document: {
    addEventListener() {}, getElementById: () => elStub, querySelector: () => elStub,
    querySelectorAll: () => [], createElement: () => elStub, body: elStub,
  },
  window: {},
  setTimeout: () => 0, clearTimeout() {}, requestAnimationFrame: () => 0, cancelAnimationFrame() {},
  mpMyPlayerIdx: 0, mpPlayerSlots: [],
  mpSendEnvelope() { throw new Error('the rules harness must never send a packet'); },
  mpLockSync() {}, mpUnlockSync() {},
  showScreen() {}, shuffle: a => a.slice(), bindCardHold() {}, refHighlightRow() {},
  assetDiceSet: () => null,
};
['playDone', 'playPillClick', 'playBoing', 'playLaunch', 'playExit', 'playWhoosh', 'playTick',
 'playSuccess', 'playSyllyOn', 'playSyllyOff', 'playSliderTick', 'openSoundOverlay', 'resetToLobby',
 'mpReturnToLobby', 'mpShowModeScreen', 'mpNotifyPlayerLeft'].forEach(n => { sandbox[n] = () => {}; });
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

function load(rel) {
  vm.runInContext(fs.readFileSync(path.isAbsolute(rel) ? rel : path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
}
const DICE = path.join(ROOT, 'js/games/dyb-dice.js');
if (fs.existsSync(DICE)) load(DICE);                     // joins in Task 4
load(process.env.DYB_SRC || 'js/games/dyb.js');
const run = src => vm.runInContext(src, sandbox);
const S = sandbox;

let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}` +
    (ok ? '' : `\n          expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`));
}
const section = t => console.log(`\n${t}`);
const R = (wildcards, onesStripped = false) => ({ wildcards, onesStripped });
const C = (qty, face) => ({ qty, face });
const F = [1, 2, 3, 4, 5, 6];

console.log('The Bluff — pure rules\n' + '='.repeat(40));

section('dybFaceAllowed — which faces may be claimed');
check('Classic bans 1s', F.map(f => S.dybFaceAllowed(f, R('classic'))), [false, true, true, true, true, true]);
check('Strict allows every face', F.map(f => S.dybFaceAllowed(f, R('strict'))), [true, true, true, true, true, true]);
check('Volatile allows every face before 1s are claimed', F.map(f => S.dybFaceAllowed(f, R('volatile'))), [true, true, true, true, true, true]);
check('Volatile after 1s are claimed allows only 1s', F.map(f => S.dybFaceAllowed(f, R('volatile', true))), [true, false, false, false, false, false]);
check('0 and 7 are never faces', [0, 7].map(f => S.dybFaceAllowed(f, R('strict'))), [false, false]);

section('dybMinQty — the lowest legal quantity for a face');
check('no claim → 1 for every face', F.map(f => S.dybMinQty(C(0, 0), f)), [1, 1, 1, 1, 1, 1]);
check('a higher face keeps the quantity', S.dybMinQty(C(5, 4), 5), 5);
check('the same face must go up', S.dybMinQty(C(5, 4), 4), 6);
check('a lower face must go up', S.dybMinQty(C(5, 4), 2), 6);

section('dybLegalRaise');
check('opening: an allowed face at 1', S.dybLegalRaise(C(0, 0), C(1, 2), R('classic')), true);
check('opening: quantity 0 is not a bid', S.dybLegalRaise(C(0, 0), C(0, 3), R('classic')), false);
check('Classic: 1s are never legal', S.dybLegalRaise(C(3, 4), C(9, 1), R('classic')), false);
check('higher quantity, any face', S.dybLegalRaise(C(5, 4), C(6, 2), R('classic')), true);
check('same quantity, higher face', S.dybLegalRaise(C(5, 4), C(5, 6), R('classic')), true);
check('same quantity, same face', S.dybLegalRaise(C(5, 4), C(5, 4), R('classic')), false);
check('same quantity, lower face', S.dybLegalRaise(C(5, 4), C(5, 3), R('classic')), false);
check('lower quantity, higher face', S.dybLegalRaise(C(5, 4), C(4, 6), R('classic')), false);
check('Volatile: claiming 1s is legal', S.dybLegalRaise(C(3, 4), C(4, 1), R('volatile')), true);
check('Volatile stripped: 1s go higher', S.dybLegalRaise(C(4, 1), C(5, 1), R('volatile', true)), true);
check('Volatile stripped: other faces are closed', S.dybLegalRaise(C(4, 1), C(5, 2), R('volatile', true)), false);

section('dybFaceNote — the line under a face tap');
check('Classic 1', S.dybFaceNote(1, R('classic')), run('DYB_FACE_REASON').wildOnes);
check('Volatile 1, before the strip, warns', S.dybFaceNote(1, R('volatile')), run('DYB_FACE_REASON').volatile);
check('Volatile stripped, a 4', S.dybFaceNote(4, R('volatile', true)), run('DYB_FACE_REASON').stripped);
check('an ordinary face says nothing', S.dybFaceNote(4, R('classic')), null);

section('The globals adapters read live state');
run(`dybWildcardsStyle = 'volatile'; dybOnesStripped = true; dybCurrentQty = 5; dybCurrentFace = 1;`);
check('dybRulesNow', S.dybRulesNow(), R('volatile', true));
check('dybClaimNow', S.dybClaimNow(), C(5, 1));
run(`dybWildcardsStyle = 'classic'; dybOnesStripped = false; dybCurrentQty = 0; dybCurrentFace = 0;`);

// ── Later tasks append their sections above this line ──────────────────────

console.log(`\n${failures ? `${failures} FAILED` : 'ALL PASS'}`);
process.exit(failures ? 1 : 0);
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node tools/verify-dyb-rules.js`
Expected: FAIL — `S.dybFaceAllowed is not a function` (thrown), exit 1.

- [ ] **Step 3: Implement the pure rules**

In `js/games/dyb.js`, replace the whole block from the comment `// Canonical raise rule (single source of truth …` through the end of `dybMinQtyForFace` with:

```js
// ── Pure rules — no globals; the live table and Practice both call these ─────
// claim / bid: { qty, face } — qty 0 means "no claim yet".
// rules: { wildcards: 'strict'|'classic'|'volatile', onesStripped: bool }
function dybRulesNow() { return { wildcards: dybWildcardsStyle, onesStripped: dybOnesStripped }; }
function dybClaimNow() { return { qty: dybCurrentQty, face: dybCurrentFace }; }

// Which faces may be claimed at all. Volatile after a 1s claim allows ONLY 1s —
// the shipped picker's behaviour ("they strip and lock"), kept deliberately.
function dybFaceAllowed(face, rules) {
  if (face < 1 || face > 6) return false;
  if (rules.onesStripped) return face === 1;
  if (rules.wildcards === 'classic') return face !== 1;
  return true;
}

// Higher face → may keep the quantity; same/lower face → must raise it.
function dybMinQty(claim, face) {
  return face > claim.face ? Math.max(1, claim.qty) : claim.qty + 1;
}

function dybLegalRaise(claim, bid, rules) {
  if (!dybFaceAllowed(bid.face, rules) || bid.qty < 1) return false;
  return bid.qty > claim.qty || (bid.qty === claim.qty && bid.face > claim.face);
}

const DYB_FACE_REASON = {
  wildOnes: "1s are wild, so they can't be claimed.",
  stripped: '1s were claimed. Only 1s from here this Shake.',
  volatile: 'Claiming 1s switches wilds off for this Shake.',
};
// The line under the face row after a tap: why a face is closed, or a warning.
function dybFaceNote(face, rules) {
  if (!dybFaceAllowed(face, rules)) return rules.onesStripped ? DYB_FACE_REASON.stripped : DYB_FACE_REASON.wildOnes;
  if (face === 1 && rules.wildcards === 'volatile' && !rules.onesStripped) return DYB_FACE_REASON.volatile;
  return null;
}

// Old call sites (the picker, until Task 10 replaces it) delegate here.
function dybIsLegalRaise(face, qty) { return dybLegalRaise(dybClaimNow(), { face, qty }, dybRulesNow()); }
function dybMinQtyForFace(face) { return dybMinQty(dybClaimNow(), face); }
```

- [ ] **Step 4: Run it and watch it pass**

Run: `node tools/verify-dyb-rules.js`
Expected: `ALL PASS`, exit 0.

- [ ] **Step 5: The existing dice harness still passes**

Run: `node tools/verify-dyb-dice.js`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add tools/verify-dyb-rules.js js/games/dyb.js
git commit -m "feat(dyb): pure raise rules (dybLegalRaise, dybMinQty, dybFaceAllowed)"
```

---

### Task 2: One counting function

**Files:**
- Modify: `js/games/dyb.js` (`dybComputeRealCount`, `dybGetCountingDice`)
- Modify: `tools/verify-dyb-rules.js` (append a section)

**Interfaces:**
- Consumes: `dybRulesNow()` (Task 1).
- Produces: `dybHandsNow() → { n, rolls, types, slicks, phantoms }` (each indexed `[pIdx][dieIdx]`; any of them may be an index-keyed object after the wire); `dybDieDelta(val, type, slick, secondary, face, rules) → 2|1|0|-1|null`; `dybCountEvents(face, hands, rules) → [{ pIdx, dieIdx, delta }]` ordered positives, then zeros, then negatives; `dybCountSum(events) → int`.

- [ ] **Step 1: Write the failing tests**

Append to `tools/verify-dyb-rules.js`, above the `// ── Later tasks append` line:

```js
// ── Counting — dybCountEvents against a frozen copy of the shipped counter ──
// oracleCount is dybComputeRealCount exactly as it shipped before this build,
// rewritten only to take its inputs as arguments. It stays here for good: any
// future change to counting must keep agreeing with it or say why.
function oracleCount(face, t, wildcards, onesStripped) {
  const wildOnes = wildcards !== 'strict' && !onesStripped;
  let total = 0;
  for (let pIdx = 0; pIdx < t.n; pIdx++) {
    const roll = t.rolls[pIdx] || [], types = t.types[pIdx] || [];
    const slicks = t.slicks[pIdx] || [], phantomTypes = t.phantoms[pIdx] || [];
    roll.forEach((val, j) => {
      const type = types[j] || 'standard';
      const matchesFace = val === face || (wildOnes && val === 1 && face !== 1);
      if (type === 'phantom') {
        const secondary = phantomTypes[j] || null;
        if (!secondary) { if (matchesFace) total += 1; }
        else if (secondary === 'cracked') { /* 0 */ }
        else if (secondary === 'loaded') { if (matchesFace) total += 2; }
        else if (secondary === 'snake') { if (matchesFace) total -= 1; }
        else if (secondary === 'slick') { const locked = slicks[j] !== undefined ? slicks[j] : -1; if (locked === face) total += 1; }
        return;
      }
      if (type === 'cracked') return;
      if (type === 'slick') { const a = slicks[j] !== undefined ? slicks[j] : -1; if (a === face) total += 1; return; }
      if (type === 'snake') { if (matchesFace) total -= 1; return; }
      if (type === 'loaded') { if (matchesFace) total += 2; return; }
      if (matchesFace) total += 1;
    });
  }
  return total;
}
function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
const TYPES = ['standard', 'standard', 'standard', 'loaded', 'phantom', 'slick', 'cracked', 'snake'];
const SECOND = [null, null, 'loaded', 'slick', 'cracked', 'snake'];
function randomTable(r) {
  const n = 3 + Math.floor(r() * 6);
  const t = { n, rolls: [], types: [], slicks: [], phantoms: [] };
  for (let p = 0; p < n; p++) {
    if (r() < 0.12) continue;                            // an eliminated seat: a hole, as on the wire
    const k = 1 + Math.floor(r() * 5);
    t.rolls[p] = []; t.types[p] = []; t.slicks[p] = []; t.phantoms[p] = [];
    for (let d = 0; d < k; d++) {
      const v = 1 + Math.floor(r() * 6), ty = TYPES[Math.floor(r() * TYPES.length)];
      const sec = ty === 'phantom' ? SECOND[Math.floor(r() * SECOND.length)] : null;
      t.rolls[p].push(v); t.types[p].push(ty); t.phantoms[p].push(sec);
      t.slicks[p].push(ty === 'slick' || sec === 'slick' ? 1 + Math.floor(r() * 6) : -1);
    }
  }
  return t;
}
// What the wire does to a holey array: an index-keyed object.
const toObj = a => { const o = {}; a.forEach((v, i) => { if (v !== undefined) o[i] = v; }); return o; };

section('dybCountEvents — sums equal the shipped counter on 400 seeded tables');
{
  let mismatches = 0, objMismatches = 0, orderBreaks = 0;
  for (let seed = 1; seed <= 400; seed++) {
    const t = randomTable(rng(seed));
    const tObj = { n: t.n, rolls: toObj(t.rolls), types: toObj(t.types), slicks: toObj(t.slicks), phantoms: toObj(t.phantoms) };
    for (const w of ['strict', 'classic', 'volatile']) for (const st of [false, true]) for (const face of F) {
      const rules = R(w, st);
      const evs = S.dybCountEvents(face, t, rules);
      if (S.dybCountSum(evs) !== oracleCount(face, t, w, st)) mismatches++;
      if (S.dybCountSum(S.dybCountEvents(face, tObj, rules)) !== oracleCount(face, t, w, st)) objMismatches++;
      const signs = evs.map(e => Math.sign(e.delta));
      for (let i = 1; i < signs.length; i++) if (signs[i] > signs[i - 1]) { orderBreaks++; break; }
    }
  }
  check('sum of events === shipped count (every seed × style × strip × face)', mismatches, 0);
  check('…and identical when the hands arrive as index-keyed objects', objMismatches, 0);
  check('events are ordered: positives, then zeros, then negatives', orderBreaks, 0);
}
check('a Loaded die is ONE event worth +2', S.dybCountEvents(4,
  { n: 1, rolls: [[4]], types: [['loaded']], slicks: [[-1]], phantoms: [[null]] }, R('strict')), [{ pIdx: 0, dieIdx: 0, delta: 2 }]);
check('a Cracked die that matches is a 0 event (it shudders)', S.dybCountEvents(4,
  { n: 1, rolls: [[4]], types: [['cracked']], slicks: [[-1]], phantoms: [[null]] }, R('strict')), [{ pIdx: 0, dieIdx: 0, delta: 0 }]);
check('a Cracked die that does not match is no event', S.dybCountEvents(4,
  { n: 1, rolls: [[2]], types: [['cracked']], slicks: [[-1]], phantoms: [[null]] }, R('strict')), []);

section('dybComputeRealCount now reads through dybCountEvents');
run(`dybPlayerCount = 2; dybWildcardsStyle = 'classic'; dybOnesStripped = false;
     dybAllRolls = [[4, 1, 6], [4, 4]]; dybAllSpecialTypes = [['standard', 'standard', 'snake'], ['loaded', 'standard']];
     dybAllSlickFaces = [[-1, -1, -1], [-1, -1]]; dybAllPhantomTypes = [[null, null, null], [null, null]];`);
check('live count of 4s: 4 + wild 1 + loaded 4 (+2) + 4 = 5', S.dybComputeRealCount(4), 5);
check('dybGetCountingDice lists a Loaded die twice', S.dybGetCountingDice(4).length, 5);
```

- [ ] **Step 2: Run and see it fail**

Run: `node tools/verify-dyb-rules.js`
Expected: FAIL — `S.dybCountEvents is not a function`.

- [ ] **Step 3: Implement**

In `js/games/dyb.js`, replace the whole `dybComputeRealCount` function (from `// Compute real count of a face value across all rolls` to its closing brace) with:

```js
// ── Counting — ONE source for the verdict and the reveal ────────────────────
// hands: { n, rolls, types, slicks, phantoms }, each indexed [pIdx][dieIdx].
// After the wire any of them may be an index-keyed OBJECT (an eliminated seat
// leaves a hole), so everything here indexes 0..n-1 and never calls forEach on
// the outer collection.
function dybHandsNow() {
  return { n: dybPlayerCount, rolls: dybAllRolls, types: dybAllSpecialTypes,
           slicks: dybAllSlickFaces, phantoms: dybAllPhantomTypes };
}

// One die's contribution to a count of `face`: 2 | 1 | 0 | -1, or null when it
// takes no part (a 0 is a Cracked die that WOULD have counted — it shudders).
function dybDieDelta(val, type, slick, secondary, face, rules) {
  const wild    = rules.wildcards !== 'strict' && !rules.onesStripped;
  const matches = val === face || (wild && val === 1 && face !== 1);
  const eff     = type === 'phantom' ? (secondary || 'standard') : type;
  switch (eff) {
    case 'cracked': return matches ? 0 : null;
    case 'slick':   return slick === face ? 1 : null;     // a Slick counts only its chosen face, never wild
    case 'snake':   return matches ? -1 : null;
    case 'loaded':  return matches ? 2 : null;
    default:        return matches ? 1 : null;
  }
}

// Ordered for the reveal: every positive first, then the shudders, then the
// knocks — so a Snake always has a filled slot to knock out if one exists.
function dybCountEvents(face, hands, rules) {
  const pos = [], zero = [], neg = [];
  for (let pIdx = 0; pIdx < hands.n; pIdx++) {
    const roll = (hands.rolls || {})[pIdx];
    if (!roll) continue;
    const types = (hands.types || {})[pIdx] || [], slicks = (hands.slicks || {})[pIdx] || [];
    const phantoms = (hands.phantoms || {})[pIdx] || [];
    for (let dieIdx = 0; dieIdx < roll.length; dieIdx++) {
      const s = slicks[dieIdx];
      const d = dybDieDelta(roll[dieIdx], types[dieIdx] || 'standard', s === undefined || s === null ? -1 : s,
                            phantoms[dieIdx] || null, face, rules);
      if (d === null) continue;
      (d > 0 ? pos : d === 0 ? zero : neg).push({ pIdx, dieIdx, delta: d });
    }
  }
  return [...pos, ...zero, ...neg];
}
function dybCountSum(events) { return events.reduce((s, e) => s + e.delta, 0); }

function dybComputeRealCount(face) { return dybCountSum(dybCountEvents(face, dybHandsNow(), dybRulesNow())); }
```

Replace the body of `dybGetCountingDice(face)` (keep the function; the old showdown uses it until Task 14):

```js
function dybGetCountingDice(face) {
  const out = [];
  dybCountEvents(face, dybHandsNow(), dybRulesNow()).forEach(e => {
    for (let k = 0; k < e.delta; k++) out.push({ pIdx: e.pIdx, dieIdx: e.dieIdx });
  });
  return out;
}
```

Note: `roll` itself is always a real array (a hand never has holes), so `roll.length` is safe.

- [ ] **Step 4: Run and see it pass**

Run: `node tools/verify-dyb-rules.js && node tools/verify-dyb-dice.js`
Expected: `ALL PASS`; both exit 0.

- [ ] **Step 5: Commit**

```bash
git add js/games/dyb.js tools/verify-dyb-rules.js
git commit -m "fix(dyb): single-source counting (dybCountEvents) — verdict and reveal agree on Snake dice"
```

---

### Task 3: What a player can vouch for

**Files:**
- Modify: `js/games/dyb.js` (add after `dybCountSum`)
- Modify: `tools/verify-dyb-rules.js`

**Interfaces:**
- Produces: `dybMyHand() → { roll, types, slicks, slickAssigned }`; `dybYouHold(hand, face, rules) → { total, dice: [{ dieIdx, face, weight: 1|2, wild: bool }] }`.

- [ ] **Step 1: Write the failing tests**

Append:

```js
section('dybYouHold — only what the player can see');
const H = (roll, types = [], slicks = []) => ({ roll, types, slicks });
check('Classic: two 3s and a wild 1 hold three 3s', S.dybYouHold(H([3, 3, 1, 5, 2]), 3, R('classic')).total, 3);
check('…the 1 is flagged wild', S.dybYouHold(H([3, 3, 1, 5, 2]), 3, R('classic')).dice.map(d => d.wild), [false, false, true]);
check('Strict: the 1 is just a 1', S.dybYouHold(H([3, 3, 1, 5, 2]), 3, R('strict')).total, 2);
check('Volatile stripped: no wilds', S.dybYouHold(H([3, 3, 1]), 3, R('volatile', true)).total, 2);
check('a claim of 1s: a 1 is not wild for itself', S.dybYouHold(H([1, 1, 4]), 1, R('volatile')).dice.map(d => d.wild), [false, false]);
check('Loaded weighs 2', S.dybYouHold(H([4, 4], ['loaded', 'standard']), 4, R('strict')).total, 3);
check('Cracked and Snake fill nothing', S.dybYouHold(H([4, 4, 4], ['cracked', 'snake', 'standard']), 4, R('strict')).total, 1);
check('a Slick counts toward its shown face', S.dybYouHold(H([2], ['slick'], [5]), 5, R('strict')).total, 1);
check('…and not toward the face it rolled', S.dybYouHold(H([2], ['slick'], [5]), 2, R('strict')).total, 0);
check('a Slick picked later follows the pick (DYB_SLICK_UPDATE)', S.dybYouHold(H([2], ['slick'], [6]), 6, R('classic')).total, 1);
{
  let leaks = 0;
  for (const sec of [null, 'loaded', 'slick', 'cracked', 'snake']) for (const face of F) {
    const seen = new Set();
    for (const v of F) seen.add(JSON.stringify(S.dybYouHold(H([v, 3], ['phantom', 'standard'], [-1, -1]), face, R('classic'))));
    if (seen.size !== 1) leaks++;
  }
  check('a Phantom never counts: its hidden value never changes the result', leaks, 0);
}
```

(`sec` is unused inside the loop body on purpose — the hand passed has no secondary field, which is exactly what a player's own view holds.)

- [ ] **Step 2: Run** — Expected: FAIL, `S.dybYouHold is not a function`.

- [ ] **Step 3: Implement** — add after `dybComputeRealCount` in `js/games/dyb.js`:

```js
// ── What THIS player can vouch for ──────────────────────────────────────────
// From what they can SEE: a Phantom never counts — its face is hidden from its
// owner, and counting it would leak it. Cracked and Snake fill nothing.
function dybMyHand() {
  return { roll: dybMyRoll, types: dybSpecialTypes, slicks: dybSlickFaces, slickAssigned: dybSlickAssigned };
}
function dybYouHold(hand, face, rules) {
  const wild = rules.wildcards !== 'strict' && !rules.onesStripped;
  const dice = [];
  (hand.roll || []).forEach((val, dieIdx) => {
    const type = (hand.types || [])[dieIdx] || 'standard';
    if (type === 'phantom' || type === 'cracked' || type === 'snake') return;
    if (type === 'slick') {
      if ((hand.slicks || [])[dieIdx] === face) dice.push({ dieIdx, face, weight: 1, wild: false });
      return;
    }
    const isWild = wild && val === 1 && face !== 1;
    if (val === face || isWild) dice.push({ dieIdx, face: val, weight: type === 'loaded' ? 2 : 1, wild: isWild });
  });
  return { total: dice.reduce((s, d) => s + d.weight, 0), dice };
}
```

- [ ] **Step 4: Run** `node tools/verify-dyb-rules.js` — Expected: `ALL PASS`.

- [ ] **Step 5: Commit**

```bash
git add js/games/dyb.js tools/verify-dyb-rules.js
git commit -m "feat(dyb): dybYouHold — what a player can vouch for, Phantom excluded"
```

---

## Phase 2 — The dice

### Task 4: `dyb-dice.js` — sets, recipe, markup

**Files:**
- Create: `js/games/dyb-dice.js`
- Modify: `js/games/dyb.js` (delete `DYB_PIP_LAYOUTS` and its comment block, ~line 1389–1392)
- Modify: `src/screens/_scripts-3.html`, `sw.js`
- Modify: `tools/verify-dyb-dice.js` (load `dyb-dice.js` first; append sections)

**Interfaces:**
- Produces (all global): `DYB_PIP_LAYOUTS`, `DYB_DICE_SETS` (`rocky`, `classic`), `dybLum(hex)`, `dybContrast(a, b)`, `dybPipFor(tint)`, `dybShade(hex, amt)`, `dybValidateDiceSet(set) → string[]`, `dybActiveSet() → set`, `dybDieRecipe({ set, tint, face, type, secondary, state }) → recipe`, `dybDieMarkup(recipe, px, attrs = '', extraClass = '') → string`, `dybMiniMarkup(set, tint, cls = '') → string`, `dybCupMarkup(set) → string`, `dybTintHex(set, tint) → '#rrggbb'`.
- Recipe: `{ set, finish, edge, speckle, body, bodyDark, bodyLight, pip, pipStyle, faded, face, positions, overlays, type, form, key }`. `state` ∈ `'face' | 'concealed' | 'unpicked'`. A Phantom with `state: 'face'` is **revealed** (its mist lifts).

- [ ] **Step 1: Write the failing tests**

In `tools/verify-dyb-dice.js`, change the load section so `dyb-dice.js` loads **before** `dyb.js`. Find the lines that call `load('js/lib/art.js')` and `load('js/games/dyb.js')` (inside or after `function load(rel)`), and make the order:

```js
load('js/lib/art.js');
load('js/games/dyb-dice.js');
load('js/games/dyb.js');
```

Then append these sections just before the harness's final summary / `process.exit` lines:

```js
// ═══ The procedural dice layer (dyb-dice.js) ═══════════════════════════════
const Sx = sandbox;
// A script-level const is NOT a property of the global object — read constants through the context.
const Rx = src => vm.runInContext(src, sandbox);
const SETS = ['rocky', 'classic'].map(k => Rx('DYB_DICE_SETS')[k]);
const FACES = [1, 2, 3, 4, 5, 6];

section('Built-in sets are valid');
SETS.forEach(s => check(`${s.id} validates`, Sx.dybValidateDiceSet(s), []));
check('a set needs exactly 8 tints', Sx.dybValidateDiceSet({ ...SETS[0], tints: SETS[0].tints.slice(0, 7) }).length > 0, true);
check('a tint needs a #rrggbb body', Sx.dybValidateDiceSet({ ...SETS[0], tints: SETS[0].tints.map((t, i) => i ? t : { body: 'red' }) }).length > 0, true);
check('an unknown finish is rejected', Sx.dybValidateDiceSet({ ...SETS[0], finish: 'neon' }).length > 0, true);

section('Pips contrast on every tint of every built-in set (≥ 3:1)');
SETS.forEach(s => s.tints.forEach((t, i) => {
  const ratio = Sx.dybContrast(Sx.dybPipFor(t), t.body);
  check(`${s.id} tint ${i} (${t.name}) pip contrast ${ratio.toFixed(2)}`, ratio >= 3, true);
}));

section('Recipes are deterministic and complete');
{
  let bad = 0; const keys = new Set(); let count = 0;
  for (const s of SETS) for (let tint = 0; tint < 8; tint++) for (const face of FACES)
    for (const type of ['standard', 'loaded', 'slick', 'cracked', 'snake']) {
      const a = JSON.stringify(Sx.dybDieRecipe({ set: s, tint, face, type }));
      const b = JSON.stringify(Sx.dybDieRecipe({ set: s, tint, face, type }));
      const r = JSON.parse(a);
      if (a !== b || JSON.stringify(r.positions) !== JSON.stringify(Rx('DYB_PIP_LAYOUTS')[face])) bad++;
      keys.add(r.key); count++;
    }
  check('same input → same recipe, pips at the layout for the face', bad, 0);
  check('every distinct die has a distinct key', keys.size, count);
}
check('markup draws exactly `face` pips', FACES.map(f =>
  (Sx.dybDieMarkup(Sx.dybDieRecipe({ set: SETS[0], tint: 1, face: f }), 40).match(/class="dyb-pip /g) || []).length), FACES);
check('markup opens with the replace-prefix contract', Sx.dybDieMarkup(Sx.dybDieRecipe({ set: SETS[0], tint: 1, face: 3 }), 40).startsWith('<div class="dyb-die '), true);

section('Tempest forms read through form, not colour');
const rec = (type, extra = {}) => Sx.dybDieRecipe({ set: SETS[0], tint: 4, face: 4, type, ...extra });
check('Loaded → bronze pips', rec('loaded').pipStyle, 'bronze');
check('Snake → serpent pips', rec('snake').pipStyle, 'serpent');
check('Cracked → fissure, faded', [rec('cracked').overlays, rec('cracked').faded], [['fissure'], true]);
check('Slick → sheen', rec('slick').overlays, ['sheen']);
check('Slick unpicked → sheen + pick badge', rec('slick', { state: 'unpicked' }).overlays, ['sheen', 'pick-badge']);
check('Phantom revealed → the mist lifts', rec('phantom').overlays, ['mist-lift']);
check('Phantom revealed with a Loaded core → mist lifts, bronze underneath', [rec('phantom', { secondary: 'loaded' }).overlays, rec('phantom', { secondary: 'loaded' }).pipStyle], [['mist-lift'], 'bronze']);
check('the body keeps the owner tint whatever the type', ['loaded', 'snake', 'cracked', 'slick'].map(t => rec(t).body), Array(4).fill(SETS[0].tints[4].body));

section('THE LEAK GUARD — a concealed Phantom carries no face');
{
  const r = Sx.dybDieRecipe({ set: SETS[0], tint: 2, face: 6, type: 'phantom', secondary: 'loaded', state: 'concealed' });
  check('face is null, no pip positions, no form', [r.face, r.positions, r.form], [null, [], null]);
  const marks = new Set();
  for (const face of FACES) for (const sec of [null, 'loaded', 'slick', 'cracked', 'snake'])
    marks.add(Sx.dybDieMarkup(Sx.dybDieRecipe({ set: SETS[0], tint: 2, face, type: 'phantom', secondary: sec, state: 'concealed' }), 40));
  check('markup is byte-identical for every face and every hidden secondary', marks.size, 1);
}

section('dybActiveSet — skin first, Rocky otherwise');
// A function-declared global cannot be deleted, so save and restore it — from
// Task 5 on, art.js defines the real assetDiceSet and later sections need it.
const realAssetDiceSet = Sx.assetDiceSet;
Sx.assetDiceSet = () => null;
check('no skin → Rocky', Sx.dybActiveSet().id, 'rocky');
Sx.assetDiceSet = () => ({ ...SETS[1], id: 'test-skin' });
check('a valid skin set wins', Sx.dybActiveSet().id, 'test-skin');
Sx.assetDiceSet = () => ({ label: 'broken' });
check('an invalid skin set falls back to Rocky', Sx.dybActiveSet().id, 'rocky');
Sx.assetDiceSet = realAssetDiceSet;
```

(`assetDiceSet` is not defined in `art.js` until Task 5 — `realAssetDiceSet` is `undefined` until then, and `dybActiveSet` guards with `typeof`.)

- [ ] **Step 2: Run** `node tools/verify-dyb-dice.js` — Expected: FAIL (`ENOENT … dyb-dice.js`).

- [ ] **Step 3: Create `js/games/dyb-dice.js`**

```js
// ═══════════════════════════════════════════════════════════════════════════
// dyb-dice.js — The Bluff's procedural dice.
//
//   set + tint + face + type + state  →  RECIPE (pure data)  →  MARKUP (a string)
//
// Two independent axes: the dice SET is the look (Rocky by default; a Secret
// Mode skin pack may supply another as a `diceSet` block), the TINT is the
// player's identity colour (their seat). Tempest types are FORMS layered on any
// set and tint — the body always belongs to its owner.
//
// Everything above the cube section is pure: no DOM, no window, no game state.
// That is what lets tools/verify-dyb-dice.js test it under Node, and what lets
// this file move to js/lib/ unchanged once a second dice game or the dice
// selector exists. It must NEVER read dyb* game state — callers pass it in.
//
// Depends on: nothing at load. Reads assetDiceSet (js/lib/art.js) at call time.
// Read by: js/games/dyb.js.
// ═══════════════════════════════════════════════════════════════════════════

// Pip-position grid (1-indexed): 1 2 3 / 4 5 6 / 7 8 9
const DYB_PIP_LAYOUTS = { 1: [5], 2: [3, 7], 3: [3, 5, 7], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };

// ── Sets ────────────────────────────────────────────────────────────────────
// A set: { id, label, finish, pip, edge 0..1, speckle 0..1, tints[8] { name, body, pip? }, cup { body, rim } }
// Tints run light → dark, so the eight still separate in greyscale.
const DYB_DICE_SETS = {
  rocky: {
    id: 'rocky', label: 'Rocky', finish: 'stone', pip: 'carved', edge: 0.6, speckle: 0.5,
    tints: [
      { name: 'chalk',      body: '#E6DDCB' }, { name: 'sandstone', body: '#D4B483' },
      { name: 'ochre',      body: '#C08A3E' }, { name: 'terracotta', body: '#B0603F' },
      { name: 'moss',       body: '#7A8756' }, { name: 'slate',     body: '#5D6B75' },
      { name: 'umber',      body: '#6E4B34' }, { name: 'basalt',    body: '#3A3836' },
    ],
    cup: { body: '#5A3E2B', rim: '#3B281B' },
  },
  classic: {
    id: 'classic', label: 'Classic', finish: 'plain', pip: 'printed', edge: 0, speckle: 0,
    tints: [
      { name: 'ivory', body: '#F5F1E8' }, { name: 'sand',  body: '#E4CFA3' },
      { name: 'amber', body: '#D9A441' }, { name: 'coral', body: '#C8664A' },
      { name: 'sage',  body: '#8A9A68' }, { name: 'steel', body: '#667784' },
      { name: 'cocoa', body: '#7A5238' }, { name: 'charcoal', body: '#3E3C3A' },
    ],
    cup: { body: '#4A4744', rim: '#2F2D2B' },
  },
};
const DYB_FINISHES   = ['stone', 'plain', 'glass'];
const DYB_PIP_STYLES = ['carved', 'printed'];
const DYB_HEX = /^#[0-9a-fA-F]{6}$/;

// Returns a list of problems; [] means valid. A skin pack's set is only used
// when this is empty — anything else falls back to Rocky with a console warning.
function dybValidateDiceSet(s) {
  const e = [];
  if (!s || typeof s !== 'object') return ['not an object'];
  if (typeof s.label !== 'string' || !s.label) e.push('label');
  if (!DYB_FINISHES.includes(s.finish)) e.push('finish');
  if (!DYB_PIP_STYLES.includes(s.pip)) e.push('pip');
  ['edge', 'speckle'].forEach(k => { if (typeof s[k] !== 'number' || s[k] < 0 || s[k] > 1) e.push(k); });
  if (!Array.isArray(s.tints) || s.tints.length !== 8) e.push('tints: need exactly 8');
  else s.tints.forEach((t, i) => {
    if (!t || !DYB_HEX.test(t.body)) e.push(`tints[${i}].body`);
    if (t && t.pip !== undefined && !DYB_HEX.test(t.pip)) e.push(`tints[${i}].pip`);
  });
  if (!s.cup || !DYB_HEX.test(s.cup.body) || !DYB_HEX.test(s.cup.rim)) e.push('cup');
  return e;
}

function dybActiveSet() {
  const skin = (typeof assetDiceSet === 'function') ? assetDiceSet('dyb') : null;
  if (skin) {
    const errs = dybValidateDiceSet(skin);
    if (!errs.length) return skin;
    console.warn('[dyb] skin diceSet invalid, using Rocky:', errs.join(', '));
  }
  return DYB_DICE_SETS.rocky;
}

// ── Colour maths ────────────────────────────────────────────────────────────
function dybLum(hex) {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function dybContrast(a, b) {
  const x = dybLum(a), y = dybLum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
const DYB_PIP_DARK = '#2B2118', DYB_PIP_LIGHT = '#F4ECE0';
function dybPipFor(tint) {
  if (tint.pip) return tint.pip;
  return dybContrast(tint.body, DYB_PIP_DARK) >= dybContrast(tint.body, DYB_PIP_LIGHT) ? DYB_PIP_DARK : DYB_PIP_LIGHT;
}
// amt in -1..1: toward black (negative) or white (positive).
function dybShade(hex, amt) {
  const target = amt < 0 ? 0 : 255, p = Math.abs(amt);
  return '#' + [1, 3, 5].map(i => {
    const v = parseInt(hex.slice(i, i + 2), 16);
    return Math.round(v + (target - v) * p).toString(16).padStart(2, '0');
  }).join('');
}
function dybTint(set, tint) { return set.tints[((tint % 8) + 8) % 8]; }
function dybTintHex(set, tint) { return dybTint(set, tint).body; }

// ── Recipe — pure description of one die ────────────────────────────────────
// state: 'face' (visible; a Phantom here is REVEALED) | 'concealed' (a Phantom
// in its owner's or a spectator's view) | 'unpicked' (a Slick before commit).
function dybDieRecipe({ set, tint = 0, face, type = 'standard', secondary = null, state = 'face' }) {
  const s = set || DYB_DICE_SETS.rocky;
  const t = dybTint(s, tint);
  // THE LEAK GUARD: a concealed Phantom's recipe carries no face and no hidden
  // secondary — so no painter, cube or DOM downstream can ever expose them.
  const concealed = type === 'phantom' && state === 'concealed';
  const shown = concealed ? null : face;
  const form = type === 'phantom' ? (concealed ? null : secondary) : (type === 'standard' ? null : type);
  const overlays = [];
  if (type === 'phantom') overlays.push(concealed ? 'mist' : 'mist-lift');
  if (form === 'cracked') overlays.push('fissure');
  if (form === 'slick') overlays.push('sheen');
  if (form === 'slick' && state === 'unpicked') overlays.push('pick-badge');
  return {
    set: s.id || s.label, finish: s.finish, edge: s.edge, speckle: s.speckle,
    body: t.body, bodyDark: dybShade(t.body, -0.22), bodyLight: dybShade(t.body, 0.25),
    pip: dybPipFor(t),
    pipStyle: form === 'loaded' ? 'bronze' : form === 'snake' ? 'serpent' : s.pip,
    faded: form === 'cracked',
    face: shown,
    positions: shown ? DYB_PIP_LAYOUTS[shown] : [],
    overlays, type, form,
    key: [s.id || s.label, tint, shown === null ? 'x' : shown, type, form || '-', concealed ? 'c' : state].join('|'),
  };
}

// ── Markup — a recipe as an HTML string ─────────────────────────────────────
const DYB_OVERLAY_HTML = {
  'mist':       '<span class="dyb-ov dyb-ov-mist"></span>',
  'mist-lift':  '<span class="dyb-ov dyb-ov-mist dyb-ov-mist-lift"></span>',
  'fissure':    '<svg class="dyb-ov dyb-ov-fissure" viewBox="0 0 100 100" aria-hidden="true"><path d="M8 22 L30 38 L24 52 L46 60 L40 78 L62 92"/></svg>',
  'sheen':      '<span class="dyb-ov dyb-ov-sheen"></span>',
  'pick-badge': '<span class="dyb-ov dyb-ov-pick">pick</span>',
};
// attrs is inserted verbatim into the opening tag (leading space included).
function dybDieMarkup(r, px, attrs = '', extraClass = '') {
  let cells = '';
  for (let i = 1; i <= 9; i++) {
    cells += r.positions.includes(i) ? `<span class="dyb-pip dyb-pip-${r.pipStyle}"></span>` : '<span></span>';
  }
  const overlays = r.overlays.map(o => DYB_OVERLAY_HTML[o] || '').join('');
  const glyph = r.face === null ? '<span class="dyb-die-glyph">?</span>' : '';
  const cls = ['dyb-die', `dyb-finish-${r.finish}`, r.faded ? 'dyb-die-faded' : '', r.form ? `dyb-form-${r.form}` : '', extraClass]
    .filter(Boolean).join(' ');
  const style = `--dyb-s:${px}px;--dyb-body:${r.body};--dyb-body-d:${r.bodyDark};--dyb-body-l:${r.bodyLight};` +
                `--dyb-pip:${r.pip};--dyb-edge:${r.edge};--dyb-speckle:${r.speckle}`;
  return `<div class="${cls}" style="${style}"${attrs}>${cells}${overlays}${glyph}</div>`;
}

// A life marker on a climber chip: a tiny tinted die (or a ◆ under Footholds).
function dybMiniMarkup(set, tint, cls = '') {
  return `<span class="dyb-mini ${cls}" style="--dyb-body:${dybTintHex(set, tint)}"></span>`;
}
function dybCupMarkup(set) {
  return `<div class="dyb-cup" style="--dyb-cup:${set.cup.body};--dyb-cup-rim:${set.cup.rim}"><span class="dyb-cup-rim"></span></div>`;
}
```

- [ ] **Step 4: Remove the old constant from `dyb.js`**

Delete these four lines from `js/games/dyb.js` (they now live in `dyb-dice.js`; a second top-level `const` is a SyntaxError in the browser):

```js
// Pip-position grid (1-indexed): 1=top-left  2=top-mid  3=top-right
//                                  4=mid-left  5=center   6=mid-right
//                                  7=bot-left  8=bot-mid  9=bot-right
const DYB_PIP_LAYOUTS = { 1:[5], 2:[3,7], 3:[3,5,7], 4:[1,3,7,9], 5:[1,3,5,7,9], 6:[1,3,4,6,7,9] };
```

- [ ] **Step 5: Load order, precache, version**

In `src/screens/_scripts-3.html`, directly above `<script src="js/games/dyb.js"></script>` add:

```html
  <script src="js/games/dyb-dice.js"></script>
```

In `sw.js`: change `const CACHE_NAME = 'sylly-games-v240';` to `const CACHE_NAME = 'sylly-games-v241';`, and directly above `'js/games/dyb.js',` in `PRECACHE_URLS` add `'js/games/dyb-dice.js',`.

In `tools/verify-dyb-rules.js`, replace `if (fs.existsSync(DICE)) load(DICE);                     // joins in Task 4` with `load(DICE);`.

- [ ] **Step 6: Build and run**

```bash
node tools/build-index.js && node tools/verify-build-fresh.js
node tools/verify-dyb-dice.js && node tools/verify-dyb-rules.js
```
Expected: all exit 0.

- [ ] **Step 7: Commit**

```bash
git add js/games/dyb-dice.js js/games/dyb.js src/screens/_scripts-3.html index.html sw.js tools/verify-dyb-dice.js tools/verify-dyb-rules.js
git commit -m "feat(dyb): dyb-dice.js — procedural sets, recipe and markup (SW v241)"
```

---

### Task 5: Dice-set skin packs and the art resolver

**Files:**
- Modify: `js/lib/art.js`
- Modify: `data/packs/deep-ocean-dice/pack.json`, `data/packs/sea-cliff-dice/pack.json`, `data/packs/registry.json`
- Create: `data/packs/classic-dice/pack.json`
- Delete: `data/packs/deep-ocean-dice/img/`, `data/packs/sea-cliff-dice/img/`
- Modify: `tools/verify-dyb-dice.js`

**Interfaces:**
- Produces: `assetDiceSet(kind) → set|null` in `art.js`.

- [ ] **Step 1: Write the failing tests** — append to `tools/verify-dyb-dice.js`:

```js
section('Dice-set skin packs');
{
  const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/packs/registry.json'), 'utf8'));
  const dybPacks = reg.map(id => ({ id, m: JSON.parse(fs.readFileSync(path.join(ROOT, `data/packs/${id}/pack.json`), 'utf8')) }))
    .filter(p => p.m.assets && p.m.assets.kind === 'dyb');
  check('the three DYB packs are registered', dybPacks.map(p => p.id).sort(), ['classic-dice', 'deep-ocean-dice', 'sea-cliff-dice']);
  dybPacks.forEach(p => {
    check(`${p.id}: diceSet validates`, Sx.dybValidateDiceSet(p.m.assets.diceSet), []);
    check(`${p.id}: no image maps left`, ['faces', 'back', 'specials', 'basePath'].filter(k => k in p.m.assets), []);
    check(`${p.id}: the folder holds only pack.json`, fs.readdirSync(path.join(ROOT, `data/packs/${p.id}`)), ['pack.json']);
    p.m.assets.diceSet.tints.forEach((t, i) => {
      const ratio = Sx.dybContrast(Sx.dybPipFor(t), t.body);
      check(`${p.id} tint ${i} (${t.name}) pip contrast ${ratio.toFixed(2)} ≥ 3`, ratio >= 3, true);
    });
  });
  Sx.window.activeAssetPack = { id: 'sea-cliff-dice', assets: dybPacks.find(p => p.id === 'sea-cliff-dice').m.assets };
  check('assetDiceSet resolves the active skin', Sx.assetDiceSet('dyb').label, dybPacks.find(p => p.id === 'sea-cliff-dice').m.assets.diceSet.label);
  check('…and nothing for another kind', Sx.assetDiceSet('pko'), null);
  Sx.window.activeAssetPack = null;
  check('no skin → null', Sx.assetDiceSet('dyb'), null);
}
```

(If the harness names its sandbox differently, `Sx` is the alias created in Task 4. `fs`/`path`/`ROOT` already exist at the top of the harness.)

- [ ] **Step 2: Run** — Expected: FAIL (`Sx.assetDiceSet is not a function`, and the pack checks fail).

- [ ] **Step 3: Add the resolver** — in `js/lib/art.js`, after `assetExtra`, add:

```js
// A procedural dice SET from the active skin pack's `diceSet` block, or null →
// the game's built-in default. First (and only) user: The Bluff (SW v241). There
// is no core-art tier: a procedural default is code, not a file.
function assetDiceSet(kind) {
  const skin = artSkin(kind);
  return (skin && skin.assets.diceSet) || null;
}
```

- [ ] **Step 4: Rewrite the packs**

`data/packs/deep-ocean-dice/pack.json`:

```json
{
  "id": "deep-ocean-dice",
  "label": "DEEP OCEAN DICE",
  "locked": false,
  "games": ["dyb"],
  "assets": {
    "kind": "dyb",
    "diceSet": {
      "id": "deep-ocean", "label": "Deep Ocean", "finish": "glass", "pip": "printed", "edge": 0.2, "speckle": 0,
      "tints": [
        { "name": "foam",    "body": "#DCEFF0" }, { "name": "shallows", "body": "#9FD3D6" },
        { "name": "lagoon",  "body": "#5FB3B3" }, { "name": "coral",    "body": "#D9826B" },
        { "name": "kelp",    "body": "#5E8C61" }, { "name": "reef",     "body": "#3E7C99" },
        { "name": "trench",  "body": "#2B4F6E" }, { "name": "abyss",    "body": "#1B2A3A" }
      ],
      "cup": { "body": "#23465E", "rim": "#14293A" }
    }
  }
}
```

`data/packs/sea-cliff-dice/pack.json`:

```json
{
  "id": "sea-cliff-dice",
  "label": "SEA CLIFF DICE",
  "locked": false,
  "games": ["dyb"],
  "assets": {
    "kind": "dyb",
    "diceSet": {
      "id": "sea-cliff", "label": "Sea Cliff", "finish": "stone", "pip": "carved", "edge": 0.8, "speckle": 0.35,
      "tints": [
        { "name": "salt",      "body": "#EEEAE2" }, { "name": "limestone", "body": "#D8D2C2" },
        { "name": "lichen",    "body": "#C7B96A" }, { "name": "rust",      "body": "#A8583A" },
        { "name": "seagrass",  "body": "#6F8A6A" }, { "name": "stormcloud","body": "#6A7A86" },
        { "name": "driftwood", "body": "#7A6552" }, { "name": "flint",     "body": "#34383C" }
      ],
      "cup": { "body": "#4E5A62", "rim": "#30383E" }
    }
  }
}
```

Create `data/packs/classic-dice/pack.json` — the Classic set, exactly the values of `DYB_DICE_SETS.classic`:

```json
{
  "id": "classic-dice",
  "label": "CLASSIC DICE",
  "locked": false,
  "games": ["dyb"],
  "assets": {
    "kind": "dyb",
    "diceSet": {
      "id": "classic", "label": "Classic", "finish": "plain", "pip": "printed", "edge": 0, "speckle": 0,
      "tints": [
        { "name": "ivory", "body": "#F5F1E8" }, { "name": "sand",  "body": "#E4CFA3" },
        { "name": "amber", "body": "#D9A441" }, { "name": "coral", "body": "#C8664A" },
        { "name": "sage",  "body": "#8A9A68" }, { "name": "steel", "body": "#667784" },
        { "name": "cocoa", "body": "#7A5238" }, { "name": "charcoal", "body": "#3E3C3A" }
      ],
      "cup": { "body": "#4A4744", "rim": "#2F2D2B" }
    }
  }
}
```

In `data/packs/registry.json`, insert `"classic-dice"` immediately after `"sea-cliff-dice"`.

Delete the image folders:

```bash
git rm -r -q data/packs/deep-ocean-dice/img data/packs/sea-cliff-dice/img
```

- [ ] **Step 5: Run** `node tools/verify-dyb-dice.js` — Expected: exit 0. If a pack tint fails its contrast check, move that tint's `body` a step lighter or darker; add a `pip` override only if the tint cannot reach 3:1 against either default pip.

- [ ] **Step 6: Commit**

```bash
git add js/lib/art.js data/packs tools/verify-dyb-dice.js
git commit -m "feat(dyb): DYB skin packs become procedural dice sets; add Classic; assetDiceSet"
```

---

### Task 6: The render seam draws procedural dice

**Files:**
- Modify: `js/games/dyb.js` (`dybDieHTML`, `dybDieHTMLSm`, `dybDieHTMLXs`, `dybDieBackHTML`; add `dybTintFor`, `dybEsc`)
- Modify: `js/lib/art.js` (delete `assetSpecial`, `assetSpecialFrame`, fix the header comment)
- Modify: `css/styles.css` (replace the DYB die block)
- Modify: `tools/verify-dyb-dice.js` (delete the old image-seam sections, add wrapper checks)

**Interfaces:**
- Consumes: everything from Task 4.
- Produces: `dybTintFor(playerIdx) → 0..7`; `dybEsc(s) → string`; `dybDieHTML(val, type, slickFace, dieIdx = -1, isSlickAssigned = true, phantomSecondary = null, tint = null, px = 44)` — `dieIdx >= 0` or `-2` conceal a Phantom, `-1` reveals it. **No `id` attribute any more** (nothing read it; it was the BUG-25 duplicate-id risk).

- [ ] **Step 1: Replace the old seam tests**

In `tools/verify-dyb-dice.js`, delete every section from `section('Characterisation — no art pack loaded')` up to (not including) the `// ═══ The procedural dice layer` block from Task 4 — they assert image-pack behaviour that no longer exists. Also delete the now-unused fixture helpers above them (`setSkin`, `setCore`, `noArt`, the skin/core fixture objects, `classesOf`, `hasClass`, `imgUrl`, `glyphText`) if nothing else references them. Keep the sandbox, `load`, `check`, `section`. Then append:

```js
section('dybDieHTML — the game seam over the recipe');
Sx.mpMyPlayerIdx = 0;
vm.runInContext('dybSeatNumbers = [2, 1, 3];', sandbox);
check('dybTintFor follows the seat (seat 2 → tint 1)', Sx.dybTintFor(0), 1);
check('dybTintFor falls back to the index with no seats', (vm.runInContext('dybSeatNumbers = [];', sandbox), Sx.dybTintFor(3)), 3);
{
  const seen = new Set();
  for (const f of FACES) seen.add(Sx.dybDieHTML(f, 'phantom', -1, 0, true, 'loaded', 2));
  check('owner view (dieIdx 0): a Phantom is identical for every face', seen.size, 1);
  const spect = new Set();
  for (const f of FACES) spect.add(Sx.dybDieHTML(f, 'phantom', -1, -2, true, 'snake', 2));
  check('spectator view (dieIdx -2): identical for every face', spect.size, 1);
}
check('reveal view (dieIdx -1) shows the face', (Sx.dybDieHTML(5, 'phantom', -1, -1, true, null, 2).match(/class="dyb-pip /g) || []).length, 5);
check('a Phantom+Slick reveals its locked face', (Sx.dybDieHTML(2, 'phantom', 6, -1, true, 'slick', 2).match(/class="dyb-pip /g) || []).length, 6);
check('an unpicked Slick carries the pick badge', Sx.dybDieHTML(3, 'slick', 3, 0, false).includes('dyb-ov-pick'), true);
check('no id attribute is emitted', /\sid="/.test(Sx.dybDieHTML(3, 'standard', -1, 0)), false);
check('Sm is 38 px', Sx.dybDieHTMLSm(4).includes('--dyb-s:38px'), true);
check('the replace-prefix contract holds', Sx.dybDieHTML(4, 'standard', -1).startsWith('<div class="dyb-die '), true);
check('dybEsc neutralises markup', Sx.dybEsc(`<b>"Sam" & 'Jo'</b>`), '&lt;b&gt;&quot;Sam&quot; &amp; &#39;Jo&#39;&lt;/b&gt;');
check('art.js no longer exports assetSpecial', typeof Sx.assetSpecial, 'undefined');
```

- [ ] **Step 2: Run** — Expected: FAIL (`dybTintFor is not a function`, …).

- [ ] **Step 3: Replace the seam in `dyb.js`**

Replace the whole of `dybDieHTML`, `dybDieHTMLSm`, `dybDieHTMLXs` and `dybDieBackHTML` (from the comment `// dieIdx >= 0 : owner's live hand` through the end of `dybDieBackHTML`) with:

```js
// ── Dice render seam — every die in the game goes through here ─────────────
// dieIdx >= 0 : an owner's live hand (a Phantom stays concealed)
// dieIdx === -1: The Overlook (a Phantom is revealed; its mist lifts)
// dieIdx === -2: a spectator's view — The Depths (a Phantom stays concealed)
function dybTintFor(playerIdx) {
  const seat = (dybSeatNumbers || [])[playerIdx];
  return ((seat ? seat - 1 : playerIdx) % 8 + 8) % 8;
}
function dybEsc(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function dybDieHTML(val, type, slickFace, dieIdx = -1, isSlickAssigned = true, phantomSecondary = null, tint = null, px = 44) {
  const concealed = type === 'phantom' && dieIdx !== -1;
  let face = val, state = 'face';
  if (type === 'slick') { face = slickFace > 0 ? slickFace : val; if (!isSlickAssigned) state = 'unpicked'; }
  if (type === 'phantom' && !concealed && phantomSecondary === 'slick' && slickFace > 0) face = slickFace;
  if (concealed) state = 'concealed';
  const t = tint === null ? dybTintFor(typeof mpMyPlayerIdx === 'number' ? mpMyPlayerIdx : 0) : tint;
  return dybDieMarkup(dybDieRecipe({ set: dybActiveSet(), tint: t, face, type, secondary: phantomSecondary, state }), px);
}
function dybDieHTMLSm(face, tint = null) { return dybDieHTML(face, 'standard', -1, -1, true, null, tint, 38); }
function dybDieHTMLXs(face, tint = null) { return dybDieHTML(face, 'standard', -1, -1, true, null, tint, 26); }
// Face-down die (still used by the gallery's "In the Cup" until Task 17).
function dybDieBackHTML() { return dybCupMarkup(dybActiveSet()); }
```

- [ ] **Step 4: Trim `art.js`**

Delete `assetSpecial` and `assetSpecialFrame` (the two functions and their comment blocks) from `js/lib/art.js`. In the file header, replace the two lines

```
//          dybDieHTML additionally reads assetSpecial/assetSpecialFrame — the
//          `specials` block, for faces that carry a type as well as a value.
```

with

```
//          dybActiveSet (js/games/dyb-dice.js) reads assetDiceSet — a procedural
//          `diceSet` block, not images (SW v241).
```

and change `Cards.buildEl/buildBackEl, dybDieHTML/dybDieBackHTML.` to `Cards.buildEl/buildBackEl.`

Confirm nothing else calls them: `grep -rn "assetSpecial" js/ tools/` — Expected: no output.

- [ ] **Step 5: Replace the die CSS**

In `css/styles.css`, delete from the line `/* ── DYB CSS Dice ──…` through the end of the `.dyb-tilde-breathe { … }` rule (the block ending just before `/* ── Team score boxes`). Also delete the `/* ── DYB Shake cup animation` block (`@keyframes dybCupShake` and `.dyb-cup-shaking`) — Task 13 replaces it. In their place add:

```css
/* ── DYB procedural dice (SW v241) — js/games/dyb-dice.js ─────────────────
   One recipe → one markup string. Size is --dyb-s; colours arrive as custom
   properties per die. Only transform/opacity animate. */
.dyb-die {
  --dyb-s: 44px;
  position: relative; flex-shrink: 0; box-sizing: border-box;
  width: var(--dyb-s); height: var(--dyb-s);
  display: grid; grid-template: repeat(3, 1fr) / repeat(3, 1fr);
  padding: calc(var(--dyb-s) * 0.13);
  border-radius: calc(var(--dyb-s) * (0.18 + var(--dyb-edge) * 0.08));
  background: radial-gradient(circle at 30% 24%, var(--dyb-body-l), transparent 55%), var(--dyb-body);
  box-shadow: inset 0 calc(var(--dyb-s) * -0.07) 0 var(--dyb-body-d),
              inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 2px 3px rgba(40, 26, 14, 0.28);
  overflow: hidden;
}
.dyb-finish-stone {
  background:
    radial-gradient(circle at 30% 24%, var(--dyb-body-l), transparent 55%),
    radial-gradient(rgba(0, 0, 0, calc(var(--dyb-speckle) * 0.16)) 1px, transparent 1.6px) 0 0 / 5px 5px,
    radial-gradient(rgba(255, 255, 255, calc(var(--dyb-speckle) * 0.14)) 1px, transparent 1.6px) 2px 3px / 7px 7px,
    var(--dyb-body);
}
.dyb-finish-plain { background: linear-gradient(160deg, var(--dyb-body-l), var(--dyb-body) 60%); }
.dyb-finish-glass {
  background: radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.55), transparent 40%),
              linear-gradient(160deg, var(--dyb-body-l), var(--dyb-body) 55%, var(--dyb-body-d));
}
.dyb-pip { display: block; width: 72%; height: 72%; margin: auto; border-radius: 50%; background: var(--dyb-pip); }
.dyb-pip-carved { box-shadow: inset 0 1.5px 1.5px rgba(0, 0, 0, 0.55), 0 1px 0 rgba(255, 255, 255, 0.35); }
.dyb-pip-bronze { background: radial-gradient(circle at 35% 30%, #F3D08A, #B07A2A 60%, #6E4712); box-shadow: 0 1px 1px rgba(0, 0, 0, 0.45); }
.dyb-pip-serpent { position: relative; background: #C9D94A; }
.dyb-pip-serpent::after { content: ''; position: absolute; left: 42%; top: 10%; width: 16%; height: 80%; border-radius: 50%; background: #14210A; }
.dyb-die-faded .dyb-pip { opacity: 0.35; }
.dyb-form-loaded { box-shadow: inset 0 calc(var(--dyb-s) * -0.07) 0 var(--dyb-body-d),
                               inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 4px 6px rgba(40, 26, 14, 0.45); }
.dyb-die-glyph { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
                 font-weight: 700; font-size: calc(var(--dyb-s) * 0.42); color: rgba(90, 80, 120, 0.6); }
.dyb-ov { position: absolute; inset: 0; pointer-events: none; border-radius: inherit; }
.dyb-ov-mist { background: radial-gradient(circle at 30% 40%, rgba(236, 232, 244, 0.92), transparent 60%),
                           radial-gradient(circle at 70% 65%, rgba(214, 210, 228, 0.88), transparent 55%),
                           rgba(226, 222, 236, 0.6); }
/* The fog lifts at The Overlook — delayed until the cups have lifted. */
.dyb-ov-mist-lift { animation: dybMistLift 500ms ease-out 600ms both; }
@keyframes dybMistLift { from { opacity: 1; transform: scale(1); } to { opacity: 0.12; transform: scale(1.15); } }
.dyb-ov-fissure path { fill: none; stroke: rgba(20, 12, 6, 0.8); stroke-width: 5; stroke-linejoin: round; }
.dyb-ov-sheen { background: linear-gradient(115deg, transparent 30%, rgba(255, 255, 255, 0.55) 42%, transparent 54%); }
.dyb-ov-pick { inset: auto 2px 2px auto; padding: 0 3px; border-radius: 6px; background: #0e7490; color: #fff;
               font-size: calc(var(--dyb-s) * 0.2); font-weight: 700; line-height: 1.4; }
.dyb-die.dyb-die-dim { opacity: 0.3; transition: opacity 250ms ease-out; }
.dyb-mini { display: inline-block; width: 8px; height: 8px; border-radius: 2px; background: var(--dyb-body);
            box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.25); }
.dyb-mini-foothold { border-radius: 1px; transform: rotate(45deg) scale(0.8); }
```

- [ ] **Step 6: Run everything that touches DYB**

```bash
node tools/verify-dyb-dice.js && node tools/verify-dyb-rules.js && node tools/verify-identity-docs.js
```
Expected: all exit 0. (No copy changed yet.)

- [ ] **Step 7: Commit**

```bash
git add js/games/dyb.js js/lib/art.js css/styles.css tools/verify-dyb-dice.js
git commit -m "feat(dyb): the render seam draws procedural dice; retire the image seam"
```

---

### Task 7: The cube and reduced motion

**Files:**
- Modify: `js/games/dyb-dice.js` (append the DOM section)
- Modify: `css/styles.css`
- Modify: `tools/verify-dyb-dice.js`

**Interfaces:**
- Produces: `dybReducedMotion() → bool`; `DYB_CUBE_LAND`; `dybCubeMarkup(recipeForFace, landFace, px) → string` (`recipeForFace: face → recipe`); `dybRollCube(cubeEl, ms, seed)`; `dybLandCube(cubeEl)`.

- [ ] **Step 1: Failing tests** — append to `tools/verify-dyb-dice.js`:

```js
section('The cube');
{
  const rf = f => Sx.dybDieRecipe({ set: SETS[0], tint: 1, face: f });
  const m = Sx.dybCubeMarkup(rf, 4, 44);
  check('six faces', (m.match(/class="dyb-cube-face /g) || []).length, 6);
  check('lands on the face asked for', m.includes('data-land="4"'), true);
  const hidden = f => Sx.dybDieRecipe({ set: SETS[0], tint: 1, face: f, type: 'phantom', state: 'concealed' });
  const hm = Sx.dybCubeMarkup(hidden, 1, 44);
  check('a concealed Phantom cube: all six faces identical', new Set(hm.match(/<div class="dyb-cube-face [^"]*">[\s\S]*?<\/div><\/div>/g).map(s => s.replace(/dyb-cube-f\d/, ''))).size, 1);
  check('every landing transform names rotateX and rotateY (so transitions interpolate)',
        FACES.every(f => /rotateX\(/.test(Rx('DYB_CUBE_LAND')[f]) && /rotateY\(/.test(Rx('DYB_CUBE_LAND')[f])), true);
}
check('dybReducedMotion is false without matchMedia', Sx.dybReducedMotion(), false);
```

- [ ] **Step 2: Run** — Expected: FAIL.

- [ ] **Step 3: Implement** — append to `js/games/dyb-dice.js`:

```js
// ═══ DOM helpers — the ONLY impure part of this file ════════════════════════
// A scripted animation is invisible to the global reduced-motion CSS block,
// so anything this file (or dyb.js) animates by hand asks here first.
function dybReducedMotion() {
  return !!(typeof window !== 'undefined' && window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

// ── The cube — six painted faces on a CSS preserve-3d box ───────────────────
// Face placement: 1 front, 6 back, 2 right, 5 left, 3 top, 4 bottom. To bring
// face k to the front the INNER box turns by DYB_CUBE_LAND[k]. Every entry names
// both rotateX and rotateY so a transition from a spun state interpolates per
// function (a mismatched list would fall back to matrix interpolation: no spin).
const DYB_CUBE_LAND = {
  1: 'rotateX(0deg) rotateY(0deg)',   2: 'rotateX(0deg) rotateY(-90deg)',
  3: 'rotateX(-90deg) rotateY(0deg)', 4: 'rotateX(90deg) rotateY(0deg)',
  5: 'rotateX(0deg) rotateY(90deg)',  6: 'rotateX(0deg) rotateY(180deg)',
};
// recipeForFace(face) → recipe. A concealed Phantom passes one recipe for all six
// and landFace 1, so neither the faces nor data-land can leak its value.
function dybCubeMarkup(recipeForFace, landFace, px) {
  let faces = '';
  for (let f = 1; f <= 6; f++) faces += `<div class="dyb-cube-face dyb-cube-f${f}">${dybDieMarkup(recipeForFace(f), px)}</div>`;
  return `<div class="dyb-cube" style="--dyb-s:${px}px"><div class="dyb-cube-inner" data-land="${landFace}">${faces}</div></div>`;
}
function dybRollCube(cubeEl, ms, seed) {
  const inner = cubeEl.querySelector('.dyb-cube-inner');
  if (!inner) return;
  const land = DYB_CUBE_LAND[inner.dataset.land] || DYB_CUBE_LAND[1];
  const sx = 360 * (2 + (seed % 2)), sy = 360 * (1 + ((seed >> 1) % 2));
  inner.style.transition = 'none';
  inner.style.transform = `rotateX(${sx}deg) rotateY(${sy}deg) ${land}`;
  void inner.offsetWidth;                                   // commit the spun start state
  inner.style.transition = `transform ${ms}ms cubic-bezier(0.2, 0.7, 0.25, 1)`;
  inner.style.transform = `rotateX(0deg) rotateY(0deg) ${land}`;
}
function dybLandCube(cubeEl) {
  const inner = cubeEl.querySelector('.dyb-cube-inner');
  if (!inner) return;
  inner.style.transition = 'none';
  inner.style.transform = `rotateX(0deg) rotateY(0deg) ${DYB_CUBE_LAND[inner.dataset.land] || DYB_CUBE_LAND[1]}`;
}
```

Append to `css/styles.css` after the die block:

```css
/* ── DYB cube — the shake's 3D throw ──────────────────────────────────────── */
.dyb-cube { width: var(--dyb-s); height: var(--dyb-s); perspective: calc(var(--dyb-s) * 6); flex-shrink: 0; }
.dyb-cube-inner { position: relative; width: 100%; height: 100%; transform-style: preserve-3d; }
.dyb-cube-face { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
.dyb-cube-f1 { transform: translateZ(calc(var(--dyb-s) / 2)); }
.dyb-cube-f6 { transform: rotateY(180deg) translateZ(calc(var(--dyb-s) / 2)); }
.dyb-cube-f2 { transform: rotateY(90deg) translateZ(calc(var(--dyb-s) / 2)); }
.dyb-cube-f5 { transform: rotateY(-90deg) translateZ(calc(var(--dyb-s) / 2)); }
.dyb-cube-f3 { transform: rotateX(90deg) translateZ(calc(var(--dyb-s) / 2)); }
.dyb-cube-f4 { transform: rotateX(-90deg) translateZ(calc(var(--dyb-s) / 2)); }
```

- [ ] **Step 4: Run** `node tools/verify-dyb-dice.js` — Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add js/games/dyb-dice.js css/styles.css tools/verify-dyb-dice.js
git commit -m "feat(dyb): CSS-3D dice cube with leak-safe concealed faces"
```

---

### Task 8: OWNER VISUAL CHECKPOINT — the dice designs

**Files:**
- Create: `tools/dyb-dice-review.js`

This task **stops for the owner**. Nothing after it starts until the owner approves the dice.

- [ ] **Step 1: Write the review-page generator**

```js
// ═══════════════════════════════════════════════════════════════════════════
// dyb-dice-review.js — writes a SELF-CONTAINED review page of every procedural
// dice set (built-in + skin packs), every tint, the five Tempest forms, the cup
// and a rolling cube to wip/dyb-dice-review.html (wip/ is git-ignored).
//
//   node tools/dyb-dice-review.js      then open wip/dyb-dice-review.html
//
// Inlines css/styles.css and js/games/dyb-dice.js, so it works from file://.
// ═══════════════════════════════════════════════════════════════════════════
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const css  = fs.readFileSync(path.join(ROOT, 'css/styles.css'), 'utf8');
const dice = fs.readFileSync(path.join(ROOT, 'js/games/dyb-dice.js'), 'utf8');
const reg  = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/packs/registry.json'), 'utf8'));
const packSets = reg.map(id => JSON.parse(fs.readFileSync(path.join(ROOT, `data/packs/${id}/pack.json`), 'utf8')))
  .filter(m => m.assets && m.assets.kind === 'dyb').map(m => m.assets.diceSet);

const page = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Bluff dice review</title>
<style>${css}
body{background:#F4EFE7;color:#44382c;font-family:system-ui,sans-serif;padding:16px;max-width:760px;margin:0 auto}
h1{font-size:20px;font-weight:700} h2{font-size:15px;font-weight:700;margin:22px 0 8px}
.row{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end} .cell{display:flex;flex-direction:column;align-items:center;gap:4px}
.cap{font-size:11px;color:#8a7866} button{padding:8px 14px;border-radius:12px;background:#6B5744;color:#fff;font-weight:600}
</style></head><body>
<h1>The Bluff — procedural dice review</h1>
<p class="cap">Every set × tint, the Tempest forms, the cup, and the throw. <button id="roll">Roll the cubes</button></p>
<div id="out"></div>
<script>${dice}</script>
<script>
const PACKS = ${JSON.stringify(packSets)};
const sets = [DYB_DICE_SETS.rocky, DYB_DICE_SETS.classic, ...PACKS.filter(p => p.id !== 'classic')];
const out = document.getElementById('out');
const cell = (html, cap) => '<div class="cell">' + html + '<span class="cap">' + cap + '</span></div>';
let h = '';
sets.forEach(s => {
  h += '<h2>' + s.label + ' — ' + s.finish + ', ' + s.pip + ' pips</h2><div class="row">';
  s.tints.forEach((t, i) => { h += cell(dybDieMarkup(dybDieRecipe({ set: s, tint: i, face: 5 }), 48), t.name); });
  h += cell(dybCupMarkup(s).replace('class="dyb-cup"', 'class="dyb-cup" style="position:relative;left:0;top:0;margin:0;width:48px;height:56px"'), 'cup');
  h += '</div><div class="row" style="margin-top:8px">';
  [1, 2, 3, 4, 5, 6].forEach(f => { h += cell(dybDieMarkup(dybDieRecipe({ set: s, tint: 1, face: f }), 40), String(f)); });
  h += '</div>';
});
h += '<h2>The Tempest — forms on Rocky, sandstone and slate</h2>';
[1, 5].forEach(tint => {
  h += '<div class="row">';
  [['loaded', {}], ['cracked', {}], ['snake', {}], ['slick', { state: 'unpicked' }], ['phantom', { state: 'concealed' }], ['phantom', { secondary: 'loaded' }]]
    .forEach(([type, extra]) => {
      const cap = type === 'phantom' ? (extra.state ? 'phantom (hidden)' : 'phantom revealed + loaded') : (extra.state ? 'slick (unpicked)' : type);
      h += cell(dybDieMarkup(dybDieRecipe(Object.assign({ set: DYB_DICE_SETS.rocky, tint, face: 4, type }, extra)), 56), cap);
    });
  h += '</div>';
});
h += '<h2>The throw — each cube should land on the number under it</h2><div class="row" id="cubes">';
[1, 2, 3, 4, 5, 6].forEach(f => { h += cell(dybCubeMarkup(x => dybDieRecipe({ set: DYB_DICE_SETS.rocky, tint: 2, face: x }), f, 52), 'should show ' + f); });
h += '</div>';
out.innerHTML = h;
const roll = () => document.querySelectorAll('#cubes .dyb-cube').forEach((c, i) => dybRollCube(c, 1000, i * 7 + 3));
document.getElementById('roll').onclick = roll; setTimeout(roll, 300);
</script></body></html>`;

fs.mkdirSync(path.join(ROOT, 'wip'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'wip/dyb-dice-review.html'), page);
console.log('wrote wip/dyb-dice-review.html');
```

- [ ] **Step 2: Generate and self-check**

```bash
node tools/dyb-dice-review.js
```

Open `wip/dyb-dice-review.html` in a browser at 375 px wide. Check yourself first: every "should show N" cube lands on N. **If faces 3 and 4 land swapped**, swap the `rotateX` signs of `DYB_CUBE_LAND[3]` and `[4]` in `dyb-dice.js`, re-run Step 2, and re-run `node tools/verify-dyb-dice.js`.

- [ ] **Step 3: Commit the generator**

```bash
git add tools/dyb-dice-review.js js/games/dyb-dice.js
git commit -m "chore(dyb): dice review page generator for the owner checkpoint"
```

- [ ] **Step 4: STOP — owner review**

Tell the owner: "The dice are ready to look at: run `node tools/dyb-dice-review.js`, then open `wip/dyb-dice-review.html`." Ask specifically about: Rocky's eight tints, the Classic set, the two rebuilt sea sets, the five Tempest forms, the cup, and the throw.

Apply every change the owner asks for to `DYB_DICE_SETS`, the pack JSONs, or the die CSS; regenerate; re-run `node tools/verify-dyb-dice.js`; commit as `style(dyb): owner dice-review changes`. **Do not start Task 9 until the owner approves.**

---

## Phase 3 — The table

### Task 9: The table model and the bid draft (pure)

**Files:**
- Modify: `js/games/dyb.js` (add after `dybYouHold`)
- Modify: `tools/verify-dyb-rules.js`

**Interfaces:**
- Consumes: Tasks 1–3, `dybTintFor`, `dybActiveSet`.
- Produces:
  - `dybDraftInit(claim, rules) → { face, qty, notice: null }`
  - `dybDraftReduce(draft, action, ctx) → draft` — `action.type` ∈ `'face' (with .face) | 'inc' | 'dec'`; `ctx = { claim, rules, tableTotal }`; a blocked face returns the same draft with `notice: face`.
  - `dybStageFit(n, w, h) → px` (0 when even `DYB_STAGE_MIN_PX` does not fit)
  - `dybTableTotal() → int`, `dybPlayersModel(turnIdx) → players[]`
  - `dybTableModel() → model` (shape below)
  - state: `let dybDraft = null;` `let dybStageView = 'whole';`

Model shape (the renderers in Tasks 10, 14 and 16 read exactly these fields):

```
{ set, me, myTint, tempest,
  players: [{ idx, label, name, tint, count, footholds, out, active, you }],
  claim: { qty, face, by } | null,
  rules, tableTotal,
  hand: { roll, types, slicks, slickAssigned },
  isMyTurn, turnName, turnTint,
  draft: { face, qty, notice } | null,
  view: 'whole' | 'close',
  preview: { qty, face } | null,      // Practice only — a target to draw with no claim/draft
  caption: string | null,             // Practice only — overrides the stage caption
  climbEnabled, highlight: string | null, ghostsIn: bool }
```

- [ ] **Step 1: Failing tests** — append:

```js
section('The bid draft');
{
  const cls = R('classic'), none = C(0, 0);
  check('opening draft: the lowest allowed face at 1 (Classic → 2)', S.dybDraftInit(none, cls), { face: 2, qty: 1, notice: null });
  check('opening draft under Strict starts at 1s', S.dybDraftInit(none, R('strict')).face, 1);
  check('facing a claim: the standing face, one more', S.dybDraftInit(C(5, 4), cls), { face: 4, qty: 6, notice: null });
  const ctx = { claim: C(5, 4), rules: cls, tableTotal: 20 };
  let d = S.dybDraftInit(C(5, 4), cls);
  d = S.dybDraftReduce(d, { type: 'face', face: 6 }, ctx);
  check('tapping a higher face snaps to its minimum (keeps 5)', [d.face, d.qty], [6, 5]);
  d = S.dybDraftReduce(d, { type: 'face', face: 2 }, ctx);
  check('tapping a lower face snaps to one more', [d.face, d.qty], [2, 6]);
  d = S.dybDraftReduce(d, { type: 'dec' }, ctx);
  check('− never goes below the minimum', d.qty, 6);
  d = S.dybDraftReduce(S.dybDraftReduce(d, { type: 'inc' }, ctx), { type: 'inc' }, ctx);
  check('+ climbs', d.qty, 8);
  const blocked = S.dybDraftReduce(d, { type: 'face', face: 1 }, ctx);
  check('a closed face keeps the draft and raises a notice', [blocked.face, blocked.qty, blocked.notice], [2, 8, 1]);
  check('the next action clears the notice', S.dybDraftReduce(blocked, { type: 'inc' }, ctx).notice, null);
  // Review Focus 2 — the claim at the table total
  const full = { claim: C(15, 6), rules: cls, tableTotal: 15 };
  const top = S.dybDraftInit(C(15, 6), cls);
  check('at the table total the draft still initialises (sixteen 6s — legal, impossible)', [top.face, top.qty], [6, 16]);
  check('+ is inert above the table total', S.dybDraftReduce(top, { type: 'inc' }, full).qty, 16);
  check('…and the draft is still a legal raise (legality never reads the table)', S.dybLegalRaise(C(15, 6), top, cls), true);
}

section('dybStageFit — dice sized to the stage');
check('20 dice in a wide stage fit at a comfortable size', S.dybStageFit(20, 231, 132) >= 24, true);
check('40 dice at the SE width (375) still fit', S.dybStageFit(40, 231, 132) >= run('DYB_STAGE_MIN_PX'), true);
check('40 dice at 320 wide do not fit — the caller collapses the ghosts', S.dybStageFit(40, 176, 132), 0);
check('never larger than the maximum', S.dybStageFit(1, 400, 400), run('DYB_STAGE_MAX_PX'));

section('The table model');
run(`dybPlayerCount = 3; dybPlayerNames = ['Ann', 'Bo', 'Cy']; dybSeatNumbers = [3, 1, 2];
     dybDiceInHand = [5, 4, 2]; dybLives = []; dybFootholdsMode = false; dybActivePlayers = [0, 1, 2];
     dybWildcardsStyle = 'classic'; dybOnesStripped = false; dybCurrentQty = 3; dybCurrentFace = 4;
     dybAllegationHistory = [{ playerIdx: 2, qty: 3, face: 4 }]; dybCurrentBidderIdx = 0;
     dybMyRoll = [4, 1, 6, 2, 4]; dybSpecialTypes = ['standard','standard','standard','standard','standard'];
     dybSlickFaces = [-1,-1,-1,-1,-1]; dybSlickAssigned = [false,false,false,false,false];
     dybSyllyMode = false; dybDraft = dybDraftInit(dybClaimNow(), dybRulesNow()); dybStageView = 'whole';`);
S.mpMyPlayerIdx = 0;
{
  const m = S.dybTableModel();
  check('table total is the active players\' dice', m.tableTotal, 11);
  check('tints follow seats', m.players.map(p => p.tint), [2, 0, 1]);
  check('the claim knows who made it', m.claim, { qty: 3, face: 4, by: 2 });
  check('it is my turn and the draft is four 4s', [m.isMyTurn, m.draft.qty, m.draft.face], [true, 4, 4]);
  check('the climb is enabled', m.climbEnabled, true);
  check('my chip is labelled "(you)"', m.players[0].label, 'Ann (you)');
  run('dybCurrentBidderIdx = 1; dybDraft = null;');
  const w = S.dybTableModel();
  check('off-turn: not my turn, no draft, the turn is named', [w.isMyTurn, w.draft, w.turnName], [false, null, 'Bo']);
}
```

- [ ] **Step 2: Run** — Expected: FAIL.

- [ ] **Step 3: Implement** — add after `dybYouHold` in `dyb.js`:

```js
// ── The bid draft — the claim this device is building (pure) ───────────────
let dybDraft     = null;     // { face, qty, notice } — this device's bid in progress; null off-turn
let dybStageView = 'whole';  // 'whole' | 'close' — memory only; survives matches, not reloads (spec § 4.1)

// Opening: the lowest face the rules allow, at 1. Facing a claim: the standing
// face, one more — so climbing is always a single tap.
function dybDraftInit(claim, rules) {
  if (!claim.qty) {
    let f = 1;
    while (f < 6 && !dybFaceAllowed(f, rules)) f++;
    return { face: f, qty: 1, notice: null };
  }
  return { face: claim.face, qty: dybMinQty(claim, claim.face), notice: null };
}

// ctx: { claim, rules, tableTotal }. A closed face never changes the bid — it
// raises a notice (the face) so the row can say why. Legality never reads the
// table total; only + does (it stops there).
function dybDraftReduce(draft, action, ctx) {
  switch (action.type) {
    case 'face':
      if (!dybFaceAllowed(action.face, ctx.rules)) return { ...draft, notice: action.face };
      return { face: action.face, qty: dybMinQty(ctx.claim, action.face), notice: null };
    case 'inc':
      return { ...draft, qty: draft.qty < ctx.tableTotal ? draft.qty + 1 : draft.qty, notice: null };
    case 'dec':
      return { ...draft, qty: Math.max(dybMinQty(ctx.claim, draft.face), draft.qty - 1), notice: null };
    default:
      return draft;
  }
}

// ── Stage fit — the largest die size that keeps n dice on the stage ────────
const DYB_STAGE_MIN_PX = 18, DYB_STAGE_MAX_PX = 44;
const DYB_DIE_GAP = 3, DYB_GROUP_GAP = 8, DYB_ROW_GAP = 6;
// Dice sit in groups of five, like tally marks. Returns 0 when even the minimum
// size does not fit — the renderer then collapses the ghosts into "+N more".
function dybStageFit(n, w, h) {
  for (let px = DYB_STAGE_MAX_PX; px >= DYB_STAGE_MIN_PX; px--) {
    const groupW = 5 * px + 4 * DYB_DIE_GAP;
    if (groupW > w) continue;
    const perLine = Math.max(1, Math.floor((w + DYB_GROUP_GAP) / (groupW + DYB_GROUP_GAP)));
    const lines = Math.ceil(Math.ceil(n / 5) / perLine);
    if (lines * px + (lines - 1) * DYB_ROW_GAP <= h) return px;
  }
  return 0;
}

// ── The live table model ────────────────────────────────────────────────────
function dybTableTotal() { return dybActivePlayers.reduce((s, i) => s + (dybDiceInHand[i] || 0), 0); }
function dybPlayersModel(turnIdx) {
  const me = mpMyPlayerIdx;
  return dybPlayerNames.map((name, idx) => ({
    idx, name: name || `Player ${idx + 1}`,
    label: idx === me ? `${name || `Player ${idx + 1}`} (you)` : (name || `Player ${idx + 1}`),
    tint: dybTintFor(idx),
    count: dybFootholdsMode ? (dybLives[idx] || 0) : (dybDiceInHand[idx] || 0),
    footholds: dybFootholdsMode,
    out: !dybActivePlayers.includes(idx), active: idx === turnIdx, you: idx === me,
  }));
}
function dybTableModel() {
  const me = mpMyPlayerIdx, turn = dybCurrentBidderIdx, claim = dybClaimNow(), rules = dybRulesNow();
  const last = dybAllegationHistory[dybAllegationHistory.length - 1];
  const isMyTurn = turn === me;
  return {
    set: dybActiveSet(), me, myTint: dybTintFor(me), tempest: dybSyllyMode,
    players: dybPlayersModel(turn),
    claim: claim.qty ? { qty: claim.qty, face: claim.face, by: last ? last.playerIdx : -1 } : null,
    rules, tableTotal: dybTableTotal(), hand: dybMyHand(),
    isMyTurn, turnName: dybPlayerNames[turn] || 'Player', turnTint: dybTintFor(turn),
    draft: isMyTurn ? dybDraft : null, view: dybStageView, preview: null, caption: null,
    climbEnabled: isMyTurn && !!dybDraft && dybLegalRaise(claim, dybDraft, rules),
    highlight: null, ghostsIn: false,
  };
}
```

- [ ] **Step 4: Run** `node tools/verify-dyb-rules.js` — Expected: `ALL PASS`.

- [ ] **Step 5: Commit**

```bash
git add js/games/dyb.js tools/verify-dyb-rules.js
git commit -m "feat(dyb): table model, bid draft reducer, stage fit (pure)"
```

---

### Task 10: The new table screen

**Files:**
- Modify: `src/screens/dyb.html` (replace `<!-- DYB TABLE -->` section)
- Modify: `js/games/dyb.js` (renderers, live wiring; delete the old picker)
- Modify: `css/styles.css`
- Modify: `docs/game-identities/dyb.md` (T7b `# screen-dyb-table` block — paired copy)
- Modify: `tools/verify-dyb-rules.js`

**Interfaces:**
- Consumes: Task 9's model.
- Produces: `DYB_COPY`, `dybBidText(qty, face)`, `dybClimbersHTML(players, set, plungeIdx = -1)`, `dybCupDiceHTML(hand, set, tint, px)`, `dybStageHTML(m, w)`, `dybRenderTable(root, m, onAct)` (actions via `data-act`: `face` (`data-face`), `inc`, `dec`, `view` (`data-view`), `climb`, `call`, `ascent`, `slick` (`data-die`)), `dybTableAct(act, data)`, `dybBindHandHolds(box)`, `dybStageWidth(root)`. `dybRenderTableScreen()` keeps its name.

- [ ] **Step 1: Failing render tests** — append to `tools/verify-dyb-rules.js`:

```js
section('dybRenderTable — markup from a model');
{
  const root = { innerHTML: '', clientWidth: 340, querySelector: () => null, querySelectorAll: () => [] };
  run(`dybCurrentBidderIdx = 0; dybDraft = dybDraftInit(dybClaimNow(), dybRulesNow());
       dybPlayerNames = ['Ann <b>', 'Bo & "Co"', "Cy'"];`);
  S.dybRenderTable(root, S.dybTableModel(), () => {});
  const html = root.innerHTML;
  check('names are escaped (Review Focus 3)', [html.includes('Ann &lt;b&gt;'), html.includes('Bo &amp; &quot;Co&quot;'), html.includes('Cy&#39;')], [true, true, true]);
  check('no raw markup from a name survives', html.includes('Ann <b>'), false);
  check('six face buttons', (html.match(/data-act="face"/g) || []).length, 6);
  check('Classic: the 1 button is marked blocked', /data-face="1"[^>]*class="[^"]*blocked/.test(html) || /class="[^"]*blocked[^"]*"[^>]*data-face="1"/.test(html), true);
  check('the climb label spells the bid', html.includes('Climb: four 4s'), true);
  check('Call is offered once a claim exists', html.includes('data-act="call"'), true);
  check('held dice (a 4, a wild 1, a 4) are drawn solid: one WILD tag', (html.match(/dyb-wild/g) || []).length, 1);
  check('whole-table view draws ghosts to the table total', (html.match(/dyb-slot-ghost/g) || []).length, 11 - 4);
  run('dybStageView = "close";');
  S.dybRenderTable(root, S.dybTableModel(), () => {});
  check('close-up draws no ghosts', (root.innerHTML.match(/dyb-slot-ghost/g) || []).length, 0);
  run('dybCurrentBidderIdx = 1; dybDraft = null; dybStageView = "whole";');
  S.dybRenderTable(root, S.dybTableModel(), () => {});
  check('off-turn: the turn bar names who is deciding', root.innerHTML.includes('is deciding'), true);
  check('off-turn: no face buttons', root.innerHTML.includes('data-act="face"'), false);
  run(`dybPlayerNames = ['Ann', 'Bo', 'Cy']; dybCurrentBidderIdx = 0; dybCurrentQty = 0; dybCurrentFace = 0;
       dybAllegationHistory = []; dybDraft = dybDraftInit(dybClaimNow(), dybRulesNow());`);
  S.dybRenderTable(root, S.dybTableModel(), () => {});
  check('opening: no Call button', root.innerHTML.includes('data-act="call"'), false);
  check('opening: the primary reads "Open with"', root.innerHTML.includes('Open with one 2'), true);
}
```

- [ ] **Step 2: Run** — Expected: FAIL (`S.dybRenderTable is not a function`).

- [ ] **Step 3: Replace the table markup**

In `src/screens/dyb.html`, replace everything from `  <!-- DYB TABLE -->` through that section's closing `</section>` with:

```html
  <!-- DYB TABLE — the Stack. Everything inside #dyb-table-root is drawn by
       dybRenderTable() from a model; Practice draws the same parts. -->
  <section id="screen-dyb-table" style="display:none"
    class="dyb-warm flex items-center justify-center w-full min-h-screen px-5 py-6 overflow-y-auto">
    <div class="flex flex-col w-full max-w-sm gap-3">
      <div class="flex items-center justify-between">
        <p id="dyb-table-shake" class="text-xs font-semibold uppercase tracking-widest dyb-label"></p>
        <div class="flex items-center gap-2">
          <button id="btn-dyb-how-to" class="text-stone-400 font-bold text-sm active:scale-90 transition-transform duration-100">[?]</button>
          <button class="btn-open-sound text-xl text-stone-400 active:scale-90 transition-transform duration-100">🔊</button>
          <button class="btn-dyb-quit-open text-stone-400 font-bold text-xl active:scale-90 transition-transform duration-100">✕</button>
        </div>
      </div>
      <div id="dyb-table-root" class="flex flex-col gap-3"></div>
    </div>
  </section>
```

- [ ] **Step 4: Add the copy, renderers and live wiring**

In `js/games/dyb.js`, near the top after the UI-state block (`let dybSlickPickerDie = -1;`), add:

```js
// ── Copy — every visible string drawn by JS lives here, so the identity-doc
//    checker (which reads this file) can find each one whole. ────────────────
const DYB_COPY = {
  yourCup:   'Your cup',
  ascent:    'The Ascent ›',
  closeUp:   'Close-up',
  whole:     'Whole table',
  noClaim:   'No claim yet.',
  call:      'Call the Bluff',
  deciding:  'is deciding…',
  youOpen:   'No claim yet. You open.',
  enough:    'enough on your own',
};
const DYB_NUM_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
function dybBidText(qty, face) { return `${DYB_NUM_WORDS[qty] || qty} ${face}${qty === 1 ? '' : 's'}`; }
```

Add the renderers after `dybTableModel` (Task 9):

```js
// ── Table renderers — model in, markup out. Shared by the live table and Practice.
function dybClimbersHTML(players, set, plungeIdx = -1) {
  return players.map(p => {
    const hex = dybTintHex(set, p.tint);
    const shown = p.count + (p.idx === plungeIdx ? 1 : 0);   // the falling die is still there until the verdict
    let lives;
    if (p.footholds && shown > 5) {
      lives = `${dybMiniMarkup(set, p.tint, 'dyb-mini-foothold')}<span>${shown}</span>`;
    } else {
      lives = Array.from({ length: shown }, (_, k) => {
        const fall = p.idx === plungeIdx && k === shown - 1 ? ' dyb-mini-plunge' : '';
        return dybMiniMarkup(set, p.tint, (p.footholds ? 'dyb-mini-foothold' : '') + fall);
      }).join('');
    }
    return `<div class="dyb-chip${p.active ? ' dyb-chip-on' : ''}${p.out ? ' dyb-chip-out' : ''}" style="--dyb-tint:${hex}">
      <div class="dyb-chip-top">${dybDieMarkup(dybDieRecipe({ set, tint: p.tint, face: 5 }), 16)}<span class="dyb-chip-name">${dybEsc(p.label)}</span></div>
      <div class="dyb-chip-lives">${lives}</div></div>`;
  }).join('');
}

// The player's own dice. Special dice carry data-hold (tap-and-hold → the Dice
// gallery); an unpicked Slick carries data-act="slick".
function dybCupDiceHTML(hand, set, tint, px) {
  return (hand.roll || []).map((val, i) => {
    const type = (hand.types || [])[i] || 'standard';
    const s = (hand.slicks || [])[i];
    const assigned = (hand.slickAssigned || [])[i] !== false;
    const concealed = type === 'phantom';
    let face = val, state = 'face';
    if (type === 'slick') { face = s > 0 ? s : val; if (!assigned) state = 'unpicked'; }
    if (concealed) state = 'concealed';
    const act = type === 'slick' && !assigned ? ' data-act="slick"' : '';
    const hold = type !== 'standard' ? ` data-hold="${type}"` : '';
    return dybDieMarkup(dybDieRecipe({ set, tint, face, type, state }), px, ` data-die="${i}"${act}${hold}`);
  }).join('');
}

function dybClaimLineHTML(m) {
  if (!m.claim) {
    return `<span class="dyb-claim-text">${m.isMyTurn ? DYB_COPY.youOpen : DYB_COPY.noClaim}</span>`;
  }
  const by = m.players.find(p => p.idx === m.claim.by);
  const who = by ? `<span class="dyb-swatch" style="--dyb-tint:${dybTintHex(m.set, by.tint)}"></span><b>${dybEsc(by.name)}</b> claims ` : '';
  return `${who}<span class="dyb-claim-text"><b>${dybBidText(m.claim.qty, m.claim.face)}</b></span>` +
         `<button class="dyb-link" data-act="ascent">${DYB_COPY.ascent}</button>`;
}

function dybStageWidth(root) {
  const s = root.querySelector && root.querySelector('.dyb-stage-dice');
  if (s && s.clientWidth) return s.clientWidth;
  return Math.max(120, (root.clientWidth || 340) - 104);
}

function dybStageHTML(m, w) {
  const target = m.isMyTurn ? m.draft : (m.claim || m.preview);
  const H = 132;
  if (!target) return `<div class="dyb-stage"><p class="dyb-hold">${DYB_COPY.noClaim}</p></div>`;
  const hold = dybYouHold(m.hand, target.face, m.rules);
  const need = Math.max(0, target.qty - hold.total);
  const others = Math.max(0, m.tableTotal - (m.hand.roll || []).length);
  const wantWhole = m.view === 'whole';
  let px = dybStageFit(wantWhole ? m.tableTotal : target.qty, w, H);
  let collapse = false;
  if (wantWhole && !px) { collapse = true; px = dybStageFit(target.qty, w, H) || DYB_STAGE_MIN_PX; }
  if (!px) px = DYB_STAGE_MIN_PX;
  const cells = [];
  hold.dice.forEach(d => {
    const type = (m.hand.types || [])[d.dieIdx] || 'standard';
    const die = dybDieMarkup(dybDieRecipe({ set: m.set, tint: m.myTint, face: d.face, type: type === 'loaded' ? 'loaded' : 'standard' }), px);
    for (let k = 0; k < d.weight && cells.length < target.qty; k++) {
      const one = k ? die.replace('<div class="dyb-die ', '<div class="dyb-die dyb-slot-echo ') : die;
      cells.push(d.wild ? `<span class="dyb-wild">${one}</span>` : one);
    }
  });
  const needRecipe = dybDieRecipe({ set: m.set, tint: m.myTint, face: target.face });
  while (cells.length < target.qty) cells.push(dybDieMarkup(needRecipe, px, '', 'dyb-slot-need'));
  if (wantWhole && !collapse) {
    for (let i = target.qty; i < m.tableTotal; i++) {
      cells.push(`<span class="dyb-slot-ghost${m.ghostsIn ? ' dyb-ghost-in' : ''}" style="--dyb-s:${px}px"></span>`);
    }
  }
  const groups = [];
  for (let i = 0; i < cells.length; i += 5) groups.push(`<div class="dyb-group">${cells.slice(i, i + 5).join('')}</div>`);
  if (collapse) groups.push(`<span class="dyb-more">+${m.tableTotal - target.qty} more on the table</span>`);
  const caption = m.caption || (m.isMyTurn
    ? `${m.claim ? 'Your climb' : 'Your opening'}: <b>${dybBidText(target.qty, target.face)}</b>`
    : `Standing claim: <b>${dybBidText(target.qty, target.face)}</b>`);
  const hi = k => (m.highlight === k ? ' dyb-coach-ring' : '');
  const toggle = `<div class="dyb-toggle${hi('toggle')}">` +
    `<button data-act="view" data-view="close" class="${m.view === 'close' ? 'on' : ''}">${DYB_COPY.closeUp}</button>` +
    `<button data-act="view" data-view="whole" class="${m.view === 'whole' ? 'on' : ''}">${DYB_COPY.whole}</button></div>`;
  const step = (act, sign, off) => (m.isMyTurn
    ? `<button class="dyb-step${hi(act)}" data-act="${act}" aria-label="${act === 'inc' ? 'One more' : 'One fewer'}"${off ? ' disabled' : ''}>${sign}</button>` : '');
  const atMin = m.draft && m.draft.qty <= dybMinQty(m.claim || { qty: 0, face: 0 }, m.draft.face);
  const atMax = m.draft && m.draft.qty >= m.tableTotal;
  const holdLine = need === 0
    ? `You hold <b>${hold.total}</b> · ${DYB_COPY.enough}`
    : `You hold <b>${hold.total}</b> · need <b>${need}</b> more from the other <b>${others}</b> dice`;
  return `<div class="dyb-stage${hi('stage')}">
    <div class="dyb-stage-head"><span>${caption}</span>${toggle}</div>
    <div class="dyb-stage-row">${step('dec', '−', atMin)}<div class="dyb-stage-dice">${groups.join('')}</div>${step('inc', '+', atMax)}</div>
    <p class="dyb-hold">${holdLine}</p></div>`;
}

function dybControlsHTML(m) {
  if (!m.isMyTurn) {
    const hex = dybTintHex(m.set, m.turnTint);
    return `<div class="dyb-turnbar" style="--dyb-tint:${hex}">${dybDieMarkup(dybDieRecipe({ set: m.set, tint: m.turnTint, face: 5 }), 20)}` +
           `<b>${dybEsc(m.turnName)}</b>&nbsp;${DYB_COPY.deciding}</div>`;
  }
  const d = m.draft;
  const faces = [1, 2, 3, 4, 5, 6].map(f => {
    const cls = ['dyb-face-btn', d && d.face === f ? 'on' : '', dybFaceAllowed(f, m.rules) ? '' : 'blocked',
                 m.highlight === `face-${f}` ? 'dyb-coach-ring' : ''].filter(Boolean).join(' ');
    return `<button class="${cls}" data-act="face" data-face="${f}" aria-label="Face ${f}">${dybDieMarkup(dybDieRecipe({ set: m.set, tint: m.myTint, face: f }), 36)}</button>`;
  }).join('');
  const note = d ? (d.notice ? dybFaceNote(d.notice, m.rules) : dybFaceNote(d.face, m.rules)) : null;
  const label = d ? `${m.claim ? 'Climb' : 'Open with'}: ${dybBidText(d.qty, d.face)}`.replace('Open with:', 'Open with') : '';
  const ring = k => (m.highlight === k ? ' dyb-coach-ring' : '');
  return `<div class="dyb-faces">${faces}</div>
    <p class="dyb-face-note">${note || ''}</p>
    <div class="dyb-actions">
      ${m.claim ? `<button class="dyb-btn-call btn-mp-action${ring('call')}" data-act="call">${DYB_COPY.call}</button>` : ''}
      <button class="dyb-btn-climb dyb-cta btn-mp-action${ring('climb')}" data-act="climb"${m.climbEnabled ? '' : ' disabled'}>${label}</button>
    </div>`;
}

// Draws every part into root and routes taps through ONE delegated listener.
function dybRenderTable(root, m, onAct) {
  const w = dybStageWidth(root);
  root.innerHTML = `
    <div class="dyb-climbers">${dybClimbersHTML(m.players, m.set)}</div>
    <div class="dyb-cuprow"><span class="dyb-cuplabel">${DYB_COPY.yourCup}</span>
      <div class="dyb-cupdice${m.highlight === 'cup' ? ' dyb-coach-ring' : ''}">${dybCupDiceHTML(m.hand, m.set, m.myTint, 34)}</div></div>
    <div class="dyb-claimline">${dybClaimLineHTML(m)}</div>
    ${dybStageHTML(m, w)}
    ${dybControlsHTML(m)}`;
  root.onclick = e => {
    const b = e.target && e.target.closest ? e.target.closest('[data-act]') : null;
    if (!b || (root.contains && !root.contains(b)) || b.disabled) return;
    if (b.dataset.held === '1') { delete b.dataset.held; return; }   // the click after a tap-hold
    onAct(b.dataset.act, b.dataset);
  };
  dybBindHandHolds(root);
}

// Tap-and-hold on a special die → its row in the Dice gallery (Task 17 adds the row).
function dybBindHandHolds(box) {
  if (!box || !box.querySelectorAll) return;
  box.querySelectorAll('[data-hold]').forEach(el => {
    bindCardHold(el, () => { el.dataset.held = '1'; dybOpenHowTo('dice', el.dataset.hold); });
  });
}
```

Note the `label` line: `'Open with: one 2'.replace('Open with:', 'Open with')` gives `Open with one 2`, and `Climb: four 4s` stays as is.

Replace the whole old `dybRenderTableScreen` function with the live wiring:

```js
// ── Table phase — live wiring over the shared renderers ────────────────────
function dybTableCtx() { return { claim: dybClaimNow(), rules: dybRulesNow(), tableTotal: dybTableTotal() }; }
function dybRenderTableScreen(extra) {
  const isMyTurn = dybCurrentBidderIdx === mpMyPlayerIdx;
  if (isMyTurn && !dybDraft) dybDraft = dybDraftInit(dybClaimNow(), dybRulesNow());
  if (!isMyTurn) dybDraft = null;
  document.getElementById('dyb-table-shake').textContent = `Shake ${dybShakeNumber}`;
  const m = Object.assign(dybTableModel(), extra || {});
  dybRenderTable(document.getElementById('dyb-table-root'), m, dybTableAct);
}
function dybTableAct(act, data) {
  const ctx = dybTableCtx();
  let extra = null;
  switch (act) {
    case 'face':   playPillClick(); dybDraft = dybDraftReduce(dybDraft, { type: 'face', face: parseInt(data.face, 10) }, ctx); break;
    case 'inc':    playPillClick(); dybDraft = dybDraftReduce(dybDraft, { type: 'inc' }, ctx); break;
    case 'dec':    playPillClick(); dybDraft = dybDraftReduce(dybDraft, { type: 'dec' }, ctx); break;
    case 'view':   playPillClick(); extra = { ghostsIn: data.view === 'whole' && dybStageView !== 'whole' }; dybStageView = data.view; break;
    case 'climb':  playDone(); dybSubmitAllegation(); return;
    case 'call':   playExit(); dybCallBluff(); return;
    case 'ascent': playDone(); dybRenderAscentHistory(); document.getElementById('dyb-ascent-overlay').style.display = 'flex'; return;
    case 'slick':  dybOpenSlickPicker(parseInt(data.die, 10)); return;
    default: return;
  }
  dybRenderTableScreen(extra);
}
```

Replace `dybSubmitAllegation` with:

```js
function dybSubmitAllegation() {
  if (dybCurrentBidderIdx !== mpMyPlayerIdx || !dybDraft) return;
  if (!dybLegalRaise(dybClaimNow(), dybDraft, dybRulesNow())) return;
  const { face, qty } = dybDraft;
  mpLockSync();
  const payload = { action: 'DYB_ALLEGATION', face, qty };
  if (window.syllyMultiplayerMode === 'client') {
    mpSendEnvelope({ type: 'ACTION', payload });
    return;
  }
  dybProcessAllegation(mpMyPlayerIdx, face, qty);
}
```

Reset the draft whenever the claim changes: add `dybDraft = null;` as the first line of `dybProcessAllegation`, as the first line inside `case 'DYB_ALLEGATION_SYNC':` in `dybHandleEnvelope`, and next to `dybCurrentQty = 0;` in `dybInitShake`.

In `dybAssignSlickFace`, replace the last five lines (the `shakeScreen`/`dockId`/`dybRenderHandDock(dockId)` block) with:

```js
  const shakeScreen = document.getElementById('screen-dyb-shake');
  if (shakeScreen && shakeScreen.style.display !== 'none') dybRenderHandDock('dyb-hand-dock-shake');
  else dybRenderTableScreen();
```

**Delete** these now-dead functions: `dybRenderBidPicker`, `dybAdjustFacePicker`, `dybAdjustQtyPicker`, `dybUpdateBidButtonState`, `dybRenderAscentPreview`, `dybIsLegalRaise`, `dybMinQtyForFace`.

In the `DOMContentLoaded` block, **delete** the listeners for elements that no longer exist (a `getElementById` of a removed id returns `null` and `.addEventListener` throws, killing every listener after it):
- the whole `// ── Table screen` block (`btn-dyb-call-bluff`, `btn-dyb-raise`, `btn-dyb-face-dec`, `btn-dyb-face-inc`, `btn-dyb-qty-dec`, `btn-dyb-qty-inc`);
- `// ── Tempest guide [?] — table screen "Your Hand" label` (`btn-dyb-hand-tip`);
- the `btn-dyb-ascent-open` listener (keep `btn-dyb-ascent-close`).

Verify: `grep -n "btn-dyb-call-bluff\|btn-dyb-raise\|btn-dyb-face-\|btn-dyb-qty-\|btn-dyb-hand-tip\|btn-dyb-ascent-open\|dyb-pip-row\|dyb-bid-controls\|dyb-hand-dock-table\|dyb-ascent-preview" js/ src/` — Expected: no output.

- [ ] **Step 5: Table CSS** — append to `css/styles.css`:

```css
/* ── DYB table (SW v241) — warm ledge, climbers, counting stage ──────────── */
.dyb-warm { background: #F4EFE7; }
.dyb-climbers { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
.dyb-chip { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 6px 8px; min-width: 62px;
            border-radius: 12px; background: rgba(255, 255, 255, 0.45); border: 2px solid transparent;
            transition: transform 160ms ease-out, box-shadow 160ms ease-out; }
.dyb-chip-on { background: #fff; border-color: var(--dyb-tint); box-shadow: 0 2px 6px rgba(60, 40, 20, 0.2); transform: translateY(-2px); }
.dyb-chip-out { opacity: 0.4; }
.dyb-chip-top { display: flex; align-items: center; gap: 4px; }
.dyb-chip-name { font-size: 12px; font-weight: 600; color: #44382c; max-width: 76px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dyb-chip-lives { display: flex; gap: 2px; align-items: center; min-height: 9px; font-size: 10px; font-weight: 700; color: #6B5744; }
.dyb-mini-plunge.go { animation: dybPlunge 700ms ease-out forwards; }
@keyframes dybPlunge { to { transform: translateY(18px) rotate(70deg); opacity: 0; } }
.dyb-cuprow { display: flex; align-items: center; gap: 8px; }
.dyb-cuplabel { font-size: 11px; font-weight: 600; color: #8a7866; width: 44px; flex-shrink: 0; }
.dyb-cupdice { display: flex; gap: 6px; flex-wrap: wrap; border-radius: 10px; }
.dyb-claimline { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #44382c; min-height: 32px; }
.dyb-swatch { width: 10px; height: 10px; border-radius: 3px; background: var(--dyb-tint); flex-shrink: 0; }
.dyb-link { margin-left: auto; font-size: 11px; font-weight: 600; color: #8a7866; min-height: 32px; padding: 0 4px; }
.dyb-stage { background: linear-gradient(#e9dfd0, #e2d6c4); border-radius: 18px; padding: 10px 10px 12px;
             display: flex; flex-direction: column; gap: 8px; box-shadow: inset 0 2px 4px rgba(60, 40, 20, 0.12); }
.dyb-stage-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 11px; font-weight: 600; color: #8a7866; }
.dyb-stage-head b { color: #44382c; }
.dyb-toggle { display: flex; flex-shrink: 0; padding: 2px; border-radius: 999px; background: rgba(255, 255, 255, 0.6); }
.dyb-toggle button { min-height: 28px; padding: 3px 8px; border-radius: 999px; font-size: 10px; font-weight: 600; color: #8a7866; }
.dyb-toggle button.on { background: #6B5744; color: #fff; }
.dyb-stage-row { display: flex; align-items: center; gap: 6px; }
.dyb-step { width: 36px; height: 36px; flex-shrink: 0; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(60, 40, 20, 0.25);
            font-size: 22px; font-weight: 700; color: #6B5744; transition: transform 120ms ease-out; }
.dyb-step:active { transform: scale(0.94); }
.dyb-step:disabled { opacity: 0.35; }
.dyb-stage-dice { flex: 1; min-width: 0; min-height: 132px; display: flex; flex-wrap: wrap; gap: 6px 8px; justify-content: center; align-content: center; }
.dyb-group { display: flex; gap: 3px; }
.dyb-die.dyb-slot-need { background: rgba(255, 255, 255, 0.35); box-shadow: none; outline: 2px dashed #a8998a; outline-offset: -2px; }
.dyb-die.dyb-slot-need .dyb-pip { background: #a8998a; box-shadow: none; opacity: 0.6; }
.dyb-die.dyb-slot-echo { opacity: 0.55; }
.dyb-slot-ghost { display: inline-block; flex-shrink: 0; box-sizing: border-box; width: var(--dyb-s); height: var(--dyb-s);
                  border-radius: calc(var(--dyb-s) * 0.22); border: 1.5px solid rgba(120, 100, 80, 0.18); }
.dyb-ghost-in { animation: dybGhostIn 200ms ease-out both; }
@keyframes dybGhostIn { from { opacity: 0; transform: scale(0.6); } }
.dyb-more { align-self: center; font-size: 11px; font-weight: 600; color: #8a7866; }
.dyb-wild { position: relative; display: inline-flex; }
.dyb-wild::after { content: 'WILD'; position: absolute; top: -6px; right: -6px; padding: 1px 3px; border-radius: 8px;
                   background: #f5c542; color: #3f3020; font-size: 8px; font-weight: 700; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3); }
.dyb-hold { text-align: center; font-size: 12px; color: #5c4b3b; }
.dyb-faces { display: flex; justify-content: space-between; }
.dyb-face-btn { display: flex; align-items: center; justify-content: center; min-width: 44px; min-height: 44px; padding: 3px; border-radius: 12px;
                transition: transform 120ms ease-out; }
.dyb-face-btn:active { transform: scale(0.94); }
.dyb-face-btn.on { background: #fff; box-shadow: 0 0 0 2.5px #6B5744; }
.dyb-face-btn.blocked { opacity: 0.35; }
.dyb-face-note { min-height: 16px; font-size: 12px; color: #d97706; text-align: center; }
.dyb-actions { display: flex; gap: 8px; }
.dyb-actions button { flex: 1; min-height: 52px; border-radius: 16px; font-size: 15px; font-weight: 600; transition: transform 120ms ease-out; }
.dyb-actions button:active { transform: scale(0.97); }
.dyb-btn-call { background: #e7e5e4; color: #44403c; }
.dyb-actions .dyb-btn-climb { flex: 1.3; color: #fff; }
.dyb-btn-climb:disabled { opacity: 0.4; }
.dyb-turnbar { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 52px; border-radius: 16px;
               background: rgba(255, 255, 255, 0.6); border: 2px solid var(--dyb-tint); font-size: 15px; color: #44382c; }
.dyb-coach-ring { box-shadow: 0 0 0 3px #f5c542, 0 0 12px rgba(245, 197, 66, 0.6) !important; transition: box-shadow 200ms ease-out; }
```

- [ ] **Step 6: Paired copy** — in `docs/game-identities/dyb.md` § T7b, replace the `# screen-dyb-table` copy block's lines with:

```copy
# screen-dyb-table
Your cup
The Ascent ›
Close-up
Whole table
No claim yet.
No claim yet. You open.
Call the Bluff
is deciding…
enough on your own
1s are wild, so they can't be claimed.
1s were claimed. Only 1s from here this Shake.
Claiming 1s switches wilds off for this Shake.
```

- [ ] **Step 7: Build and verify**

```bash
node tools/build-index.js && node tools/verify-build-fresh.js
node tools/verify-dyb-rules.js && node tools/verify-dyb-dice.js && node tools/verify-identity-docs.js && node tools/verify-mp-configs.js
```
Expected: all exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/screens/dyb.html index.html js/games/dyb.js css/styles.css docs/game-identities/dyb.md tools/verify-dyb-rules.js
git commit -m "feat(dyb): new table — climbers, counting stage, face row, model-fed renderers"
```

---

### Task 11: Tints on seating, The Depths and The Summit

**Files:**
- Modify: `js/games/dyb.js` (`dybShowSeating`, `dybRenderSeatingList`, `dybStartGame`, `dybRenderSpiritBoard`, `dybShowGameover`)

**Interfaces:**
- Consumes: `dybTintFor`, `dybDieHTML` (with `tint`), `dybEsc`.

- [ ] **Step 1: Seats are dealt when the seating screen opens**

Replace `dybShowSeating` and `dybRenderSeatingList`, and the first three statements of `dybStartGame`:

```js
function dybShowSeating() {
  // Seats (and so tints) are dealt as the screen opens, so the host sees each
  // climber's colour before dealing. The payload is unchanged: seatNumbers still
  // rides DYB_GAME_START.
  dybSeatNumbers = shuffle(Array.from({ length: dybPlayerCount }, (_, i) => i + 1));
  dybRenderSeatingList();
  showScreen('screen-dyb-seating');
}

function dybRenderSeatingList() {
  const list = document.getElementById('dyb-seating-list');
  const set = dybActiveSet();
  list.innerHTML = dybPlayerNames.map((name, i) => `
    <div class="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3" style="border-left:4px solid ${dybTintHex(set, dybTintFor(i))}">
      ${dybDieHTML(5, 'standard', -1, -1, true, null, dybTintFor(i), 26)}
      <span class="text-stone-700 font-semibold flex-1">${dybEsc(name || 'Player ' + (i + 1))}</span>
      <span class="text-stone-300 text-sm">ready</span>
    </div>`).join('');
}
```

In `dybStartGame`, delete the three lines `// Assign random seat order`, `const seats = …`, `const shuffled = shuffle(seats);`, `dybSeatNumbers = shuffled;` (seats now come from `dybShowSeating`).

- [ ] **Step 2: The Depths** — in `dybRenderSpiritBoard`, replace the `diceHtml` line and the row template with:

```js
    const diceHtml = roll.map((val, j) => dybDieHTML(val, types[j] || 'standard', -1, -2, true, null, dybTintFor(i), 36)).join('');
    const remaining = dybFootholdsMode && lives ? `${lives[i]} foothold${lives[i] === 1 ? '' : 's'} left` : `${diceInHand[i]} left`;
    grid.innerHTML += `
      <div id="dyb-spirit-row-${i}" class="bg-white rounded-2xl p-3 shadow-sm" style="border-left:4px solid ${dybTintHex(dybActiveSet(), dybTintFor(i))}">
        <p class="text-xs font-semibold text-stone-500 mb-2">${dybEsc(name)} (${remaining})</p>
        <div class="flex gap-2 flex-wrap">${diceHtml}</div>
      </div>`;
```

(`-2` keeps a Phantom concealed for spectators; the old `dybDieHTML(val, type, -1, -2)` also did.)

- [ ] **Step 3: The Summit** — in `dybShowGameover`, replace `const miniPips = dybDieHTML(bestFace, 'standard', -1);` with `const miniPips = dybDieHTML(bestFace, 'standard', -1, -1, true, null, dybTintFor(pIdx), 30);` and wrap the name: `${dybEsc(name)}` in the standings row and `${dybEsc(winnerName)}` is **not** needed there (`textContent` is used for the winner — leave it). In `dybRenderChronicle`, and `dybRenderAscentHistory`, wrap every interpolated player name in `dybEsc(…)`.

- [ ] **Step 4: Verify** — `node tools/verify-dyb-rules.js && node tools/verify-dyb-dice.js && node tools/verify-mp-configs.js` — exit 0.

- [ ] **Step 5: Commit**

```bash
git add js/games/dyb.js
git commit -m "feat(dyb): seat tints on seating, The Depths and The Summit; escape names"
```

---

## Phase 4 — The shake and the reveal

### Task 12: Choreography timers and sound map

**Files:**
- Modify: `js/games/dyb.js`, `js/engine.js`
- Modify: `tools/verify-dyb-rules.js`

**Interfaces:**
- Produces: `DYB_SOUND` (moment → engine function name), `dybSound(moment)`, `dybAnimTimers` (array), `dybPrTimers` (array), `dybLater(bag, fn, ms) → handle`, `dybStopBag(bag)`, `dybStopChoreography()`, `let dybShakeHeld = false;`. A stub `dybPracticeStop()` (real body in Task 16).

- [ ] **Step 1: Failing test** — append:

```js
section('Choreography timers stop cleanly');
{
  const pending = new Map(); let seq = 0;
  S.setTimeout = (fn, ms) => { pending.set(++seq, fn); return seq; };
  S.clearTimeout = h => pending.delete(h);
  let fired = 0;
  S.dybLater(run('dybAnimTimers'), () => fired++, 100);
  S.dybLater(run('dybAnimTimers'), () => fired++, 200);
  check('two pending in the live bag', run('dybAnimTimers').length, 2);
  S.dybStopChoreography();
  check('dybStopChoreography clears the bag and the timers', [run('dybAnimTimers').length, pending.size], [0, 0]);
  const h = S.dybLater(run('dybAnimTimers'), () => fired++, 10);
  pending.get(h)();
  check('a fired timer removes itself from its bag', [fired, run('dybAnimTimers').length], [1, 0]);
  S.dybLater(run('dybPrTimers'), () => {}, 10);
  S.dybStopChoreography();
  check('the live stop never touches the Practice bag', run('dybPrTimers').length, 1);
  S.dybStopBag(run('dybPrTimers'));
  S.setTimeout = () => 0; S.clearTimeout = () => {};
}
check('every DYB_SOUND moment names a real engine sound', Object.values(run('DYB_SOUND')).every(n => typeof S[n] === 'function'), true);
```

- [ ] **Step 2: Run** — Expected: FAIL.

- [ ] **Step 3: Implement** — add near the top of `dyb.js` (after `DYB_COPY`):

```js
// ── Sound — each moment points at an existing engine effect (CJAR_SOUND pattern).
// No new synthesised tones: a new moment is one line here.
const DYB_SOUND = {
  rattle:  'playTick',       // the cup, held
  cupLift: 'playWhoosh',     // the cup comes off
  land:    'playPillClick',  // the dice settle
  count:   'playTick',       // each die counted at The Overlook
  bluff:   'playBoing',      // BLUFF CALLED
  holds:   'playSuccess',    // CLAIM HOLDS
};
function dybSound(moment) {
  const fn = globalThis[DYB_SOUND[moment]];
  if (typeof fn === 'function') fn();
}

// ── Choreography timers — every timeout lives in a named bag ───────────────
// Live game: dybAnimTimers. Practice: dybPrTimers. Stopping one never touches
// the other, so opening Practice mid-game cannot disturb a live Shake.
const dybAnimTimers = [];
const dybPrTimers   = [];
let dybShakeHeld = false;     // the cup is being held (rattling)
function dybLater(bag, fn, ms) {
  const h = setTimeout(() => { const i = bag.indexOf(h); if (i >= 0) bag.splice(i, 1); fn(); }, ms);
  bag.push(h);
  return h;
}
function dybStopBag(bag) { bag.forEach(h => clearTimeout(h)); bag.length = 0; }
function dybStopChoreography() { dybStopBag(dybAnimTimers); dybShakeHeld = false; }
// Replaced in Task 16.
function dybPracticeStop() { dybStopBag(dybPrTimers); }
```

In `js/engine.js` `resetToLobby()`, in the `// The Bluff (dyb) teardown` block, add as its first line:

```js
  // shake/reveal/Practice timers (SW v241). typeof-guarded: some Node harnesses load engine.js without dyb.js.
  if (typeof dybStopChoreography === 'function') { dybStopChoreography(); dybPracticeStop(); }
```

In `dyb.js`'s quit-confirm handler (`btn-dyb-quit-confirm`), add `dybStopChoreography();` directly after `playExit();`. In `dybInitShake`, add `dybStopChoreography();` as the first line.

- [ ] **Step 4: Run** `node tools/verify-dyb-rules.js` — exit 0.

- [ ] **Step 5: Commit**

```bash
git add js/games/dyb.js js/engine.js tools/verify-dyb-rules.js
git commit -m "feat(dyb): choreography timer bags, DYB_SOUND map, teardown wiring"
```

---

### Task 13: The shake

**Files:**
- Modify: `src/screens/dyb.html` (`<!-- DYB SHAKE -->` section)
- Modify: `js/games/dyb.js` (`dybRenderShakeScreen`, `dybHandleCupTap`, `dybDoRoll`, `dybSubmitRoll` path, listeners; delete `dybRenderHandDock`)
- Modify: `css/styles.css`, `docs/game-identities/dyb.md` (T7b `# screen-dyb-shake`)

**Interfaces:**
- Produces: `dybPlayThrow(els, hand, set, tint, bag, onDone)` where `els = { cup, dice }` (elements) — **Practice reuses this**; `dybShowShakeHand()`; `dybCupPress()`, `dybCupRelease()`, `dybThrow()`.

- [ ] **Step 1: Markup** — replace the `<!-- DYB SHAKE -->` section with:

```html
  <!-- DYB SHAKE — hold the cup to rattle, let go to throw -->
  <section id="screen-dyb-shake" style="display:none"
    class="dyb-warm flex items-center justify-center w-full min-h-screen px-5 py-8 overflow-y-auto">
    <div class="flex flex-col w-full max-w-sm gap-4">
      <div class="flex items-center justify-between">
        <div>
          <p id="dyb-shake-number" class="text-xs font-semibold uppercase tracking-widest dyb-label"></p>
          <p id="dyb-shake-opener-label" class="text-sm font-semibold text-stone-600 mt-0.5"></p>
        </div>
        <div class="flex items-center gap-2">
          <button id="btn-dyb-shake-how-to" class="text-stone-400 font-bold text-sm active:scale-90 transition-transform duration-100">[?]</button>
          <button class="btn-open-sound text-xl text-stone-400 active:scale-90 transition-transform duration-100">🔊</button>
          <button class="btn-dyb-quit-open text-stone-400 font-bold text-xl active:scale-90 transition-transform duration-100">✕</button>
        </div>
      </div>
      <div id="dyb-shake-climbers" class="dyb-climbers"></div>
      <div id="dyb-shake-stage" class="dyb-shake-stage" role="button" aria-label="Shake the cup">
        <div id="dyb-shake-cup"></div>
        <div id="dyb-shake-dice" class="dyb-shake-dice"></div>
      </div>
      <div class="flex items-center justify-center gap-1.5">
        <p id="dyb-shake-cup-label" class="text-stone-500 text-sm font-semibold">Hold the cup to shake, let go to throw.</p>
        <button id="btn-dyb-tempest-guide" class="text-stone-400 font-bold text-xs leading-none active:scale-90 transition-transform duration-100" style="display:none">[?]</button>
      </div>
      <button id="btn-dyb-ready" class="min-h-14 w-full rounded-2xl dyb-cta active:scale-95 text-white text-xl font-semibold transition-all duration-150 btn-mp-action">
        Ready!
      </button>
      <p id="dyb-roll-waiting" class="text-center text-stone-400 text-sm" style="display:none">Waiting for others…</p>
    </div>
  </section>
```

- [ ] **Step 2: JS** — add to `DYB_COPY`: `shakeHint: 'Hold the cup to shake, let go to throw.',` and `yourHand: 'Your hand.',`.

Replace `dybRenderShakeScreen`, `dybHandleCupTap`, `dybDoRoll` and **delete** `dybRenderHandDock` with:

```js
function dybRenderShakeScreen() {
  const myIdx = mpMyPlayerIdx, set = dybActiveSet();
  const openerName = dybPlayerNames[dybCurrentOpenerIdx] || 'Player';
  document.getElementById('dyb-shake-opener-label').textContent = dybCurrentOpenerIdx === myIdx
    ? 'Your deal — open the table.' : `${openerName}'s deal.`;
  document.getElementById('dyb-shake-number').textContent = `Shake #${dybShakeNumber}`;
  document.getElementById('dyb-shake-climbers').innerHTML = dybClimbersHTML(dybPlayersModel(dybCurrentOpenerIdx), set);
  const cup = document.getElementById('dyb-shake-cup');
  cup.innerHTML = dybCupMarkup(set);
  cup.className = '';
  document.getElementById('dyb-shake-dice').innerHTML = '';
  document.getElementById('dyb-shake-cup-label').textContent = DYB_COPY.shakeHint;
  document.getElementById('btn-dyb-tempest-guide').style.display = dybSyllyMode ? '' : 'none';
  const readyBtn = document.getElementById('btn-dyb-ready');
  readyBtn.disabled = false;
  readyBtn.textContent = 'Ready!';
  document.getElementById('dyb-roll-waiting').style.display = 'none';
}

// ── The throw — shared with Practice ────────────────────────────────────────
// els: { cup, dice }. Lifts the cup, tumbles the hand as cubes, lands on the real
// faces, then calls onDone. Under reduced motion nothing travels: onDone at once.
function dybPlayThrow(els, hand, set, tint, bag, onDone) {
  const cupEl = els.cup.firstElementChild || els.cup;
  if (cupEl.classList) { cupEl.classList.remove('rattle'); cupEl.classList.add('lift'); }
  dybSound('cupLift');
  if (dybReducedMotion()) { onDone(); return; }
  els.dice.innerHTML = (hand.roll || []).map((val, i) => {
    const type = (hand.types || [])[i] || 'standard';
    const concealed = type === 'phantom';
    const s = (hand.slicks || [])[i];
    const assigned = (hand.slickAssigned || [])[i] !== false;
    const state = concealed ? 'concealed' : (type === 'slick' && !assigned ? 'unpicked' : 'face');
    const land = concealed ? 1 : (type === 'slick' && s > 0 ? s : val);
    return dybCubeMarkup(f => dybDieRecipe({ set, tint, face: f, type, state }), land, 44);
  }).join('');
  const cubes = els.dice.querySelectorAll ? els.dice.querySelectorAll('.dyb-cube') : [];
  dybLater(bag, () => { cubes.forEach((c, i) => dybRollCube(c, 1000, i * 7 + 3)); }, 120);
  dybLater(bag, () => { dybSound('land'); onDone(); }, 1180);
}

function dybShowShakeHand() {
  const box = document.getElementById('dyb-shake-dice');
  box.innerHTML = dybCupDiceHTML(dybMyHand(), dybActiveSet(), dybTintFor(mpMyPlayerIdx), 44);
  box.onclick = e => {
    const b = e.target && e.target.closest ? e.target.closest('[data-act="slick"]') : null;
    if (!b) return;
    if (b.dataset.held === '1') { delete b.dataset.held; return; }
    dybOpenSlickPicker(parseInt(b.dataset.die, 10));
  };
  dybBindHandHolds(box);
  const cup = document.getElementById('dyb-shake-cup').firstElementChild;
  if (cup && cup.classList) cup.classList.add('lift');
  document.getElementById('dyb-shake-cup-label').textContent = DYB_COPY.yourHand;
}

function dybCupPress() {
  if ((dybMyRoll && dybMyRoll.length) || dybShakeHeld) return;
  dybShakeHeld = true;
  const cup = document.getElementById('dyb-shake-cup').firstElementChild;
  if (cup && cup.classList && !dybReducedMotion()) cup.classList.add('rattle');
  const tick = () => { if (!dybShakeHeld) return; dybSound('rattle'); dybLater(dybAnimTimers, tick, 180); };
  tick();
  dybLater(dybAnimTimers, dybCupRelease, 3000);    // a held cup throws itself after 3 s
}
function dybCupRelease() {
  if (!dybShakeHeld) return;
  dybShakeHeld = false;
  dybThrow();
}
function dybThrow() {
  if (dybMyRoll && dybMyRoll.length) return;
  dybMyRoll = dybGenerateRoll(dybDiceInHand[mpMyPlayerIdx]);
  const els = { cup: document.getElementById('dyb-shake-cup'), dice: document.getElementById('dyb-shake-dice') };
  dybPlayThrow(els, dybMyHand(), dybActiveSet(), dybTintFor(mpMyPlayerIdx), dybAnimTimers, dybShowShakeHand);
}

// Ready without shaking — roll at once, no animation.
function dybDoRoll() {
  if (dybMyRoll && dybMyRoll.length) return;
  dybStopChoreography();
  dybMyRoll = dybGenerateRoll(dybDiceInHand[mpMyPlayerIdx]);
  dybShowShakeHand();
}
```

In `dybAssignSlickFace`, change `dybRenderHandDock('dyb-hand-dock-shake')` to `dybShowShakeHand()`.

In the `DOMContentLoaded` block, replace the `dyb-shake-cup-area` click listener with:

```js
  // ── Shake screen: press to rattle, release to throw (tap = a short hold)
  const dybStage = document.getElementById('dyb-shake-stage');
  // preventDefault only before the throw: afterwards the dice in this box need the
  // mouse fallback events that bindCardHold (tap-and-hold) listens for on desktop.
  dybStage.addEventListener('pointerdown', e => {
    if (dybMyRoll && dybMyRoll.length) return;
    e.preventDefault();
    dybCupPress();
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => dybStage.addEventListener(ev, dybCupRelease));
```

In `dybBroadcastShakeActive` and in `case 'DYB_SHAKE_ACTIVE':` add `dybStopChoreography();` before the table renders (a throw still animating must not paint into the shake screen after it is gone).

- [ ] **Step 3: CSS** — append:

```css
/* ── DYB shake — the cup ─────────────────────────────────────────────────── */
.dyb-shake-stage { position: relative; min-height: 190px; border-radius: 24px; background: linear-gradient(#e9dfd0, #e2d6c4);
                   box-shadow: inset 0 2px 4px rgba(60, 40, 20, 0.12); display: flex; align-items: center; justify-content: center;
                   touch-action: none; user-select: none; -webkit-user-select: none; cursor: pointer; }
.dyb-cup { position: absolute; left: 50%; top: 50%; z-index: 2; width: 96px; height: 110px; margin: -55px 0 0 -48px;
           border-radius: 14px 14px 40px 40px / 14px 14px 28px 28px;
           background: radial-gradient(circle at 35% 25%, rgba(255, 255, 255, 0.18), transparent 50%),
                       linear-gradient(90deg, var(--dyb-cup-rim), var(--dyb-cup) 30%, var(--dyb-cup) 70%, var(--dyb-cup-rim));
           box-shadow: 0 6px 12px rgba(40, 26, 14, 0.35);
           transition: transform 350ms cubic-bezier(0.2, 0.7, 0.25, 1), opacity 350ms ease-out; }
.dyb-cup-rim { position: absolute; left: -4px; right: -4px; top: -6px; height: 14px; border-radius: 50%; background: var(--dyb-cup-rim); }
.dyb-cup.rattle { animation: dybRattle 180ms ease-in-out infinite; }
@keyframes dybRattle { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(-7deg) translateX(-4px); } 75% { transform: rotate(7deg) translateX(4px); } }
.dyb-cup.lift { transform: translateY(-140%) rotate(-12deg); opacity: 0; }
.dyb-shake-dice { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; padding: 12px; }
```

- [ ] **Step 4: Paired copy** — replace the `# screen-dyb-shake` block in `docs/game-identities/dyb.md` with:

```copy
# screen-dyb-shake
Hold the cup to shake, let go to throw.
Your hand.
Ready!
Waiting for others…
```

- [ ] **Step 5: Verify**

```bash
grep -n "dybRenderHandDock\|dyb-hand-dock-shake\|dyb-shake-cup-area\|dyb-shake-dice-counts" js/ src/
node tools/build-index.js && node tools/verify-build-fresh.js
node tools/verify-dyb-rules.js && node tools/verify-dyb-dice.js && node tools/verify-identity-docs.js
```
Expected: the grep prints nothing; every harness exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/screens/dyb.html index.html js/games/dyb.js css/styles.css docs/game-identities/dyb.md
git commit -m "feat(dyb): the shake — hold to rattle, release to throw, 3D landing"
```

---

### Task 14: The reveal (The Overlook)

**Files:**
- Modify: `js/games/dyb.js` (`dybRenderShowdownScreen`; delete `dybRenderAllHandsOnShowdown`, `dybGetCountingDice`)
- Modify: `src/screens/dyb.html` (`<!-- DYB SHOWDOWN -->`), `css/styles.css`, `docs/game-identities/dyb.md`
- Modify: `tools/verify-dyb-rules.js`

**Interfaces:**
- Produces: `dybRevealPlan(events, claimed) → { steps: [{ kind: 'fill'|'knock'|'shudder', pIdx, dieIdx, slot }], slots, filled, holds }`; `dybRevealDelay(i) → ms`; `dybRevealSpec(o) → spec`; `dybPlayReveal(els, spec, bag, onDone)` with `els = { climbers, claimed, stage, real, verdict, loser, hands }` — **Practice reuses it**.
- spec: `{ n, names, tints, counts, footholds, hands, rules, face, claimed, real, events, bidder, challenger, loser, eliminated, me, set, players, loserLine }`.

- [ ] **Step 1: Failing tests** — append:

```js
section('dybRevealPlan — the count as slots');
{
  let bad = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const t = randomTable(rng(seed + 1000));
    for (const face of F) {
      const evs = S.dybCountEvents(face, t, R('classic'));
      const sum = S.dybCountSum(evs), claimed = 1 + (seed % 9);
      const p = S.dybRevealPlan(evs, claimed);
      const fills = p.steps.filter(s => s.kind === 'fill').map(s => s.slot);
      const pos = evs.filter(e => e.delta > 0).reduce((a, e) => a + e.delta, 0);
      if (p.filled !== Math.max(0, sum) || p.holds !== (sum >= claimed) ||
          p.slots !== Math.max(claimed, pos) || fills.some((s, i) => s !== i)) bad++;
    }
  }
  check('filled = max(0, real), holds = real ≥ claim, slots fit every fill, fills run 0,1,2…', bad, 0);
}
check('a Loaded die fills two slots', S.dybRevealPlan([{ pIdx: 0, dieIdx: 0, delta: 2 }], 3).steps.map(s => s.slot), [0, 1]);
check('a Snake knocks the last filled slot', S.dybRevealPlan([{ pIdx: 0, dieIdx: 0, delta: 1 }, { pIdx: 1, dieIdx: 0, delta: -1 }], 2).steps.map(s => [s.kind, s.slot]), [['fill', 0], ['knock', 0]]);
check('ticks speed up and floor at 140 ms', [S.dybRevealDelay(0), S.dybRevealDelay(5), S.dybRevealDelay(50)], [400, 250, 140]);
```

- [ ] **Step 2: Run** — FAIL.

- [ ] **Step 3: Markup** — replace `<!-- DYB SHOWDOWN -->` with:

```html
  <!-- DYB SHOWDOWN — The Overlook: cups lift, fog lifts, the count fills the claim -->
  <section id="screen-dyb-showdown" style="display:none"
    class="dyb-warm flex items-center justify-center w-full min-h-screen px-5 py-8 overflow-y-auto">
    <div class="flex flex-col w-full max-w-sm gap-3">
      <div class="flex items-center justify-between">
        <p class="text-xs font-semibold uppercase tracking-widest dyb-label">Reaching the Edge</p>
        <div class="flex items-center gap-2">
          <button class="btn-open-sound text-xl text-stone-400 active:scale-90 transition-transform duration-100">🔊</button>
          <button id="btn-dyb-showdown-exit" class="text-stone-400 font-bold text-xl active:scale-90 transition-transform duration-100 px-2">✕</button>
        </div>
      </div>
      <h2 class="text-2xl font-bold text-stone-800 text-center">THE OVERLOOK</h2>
      <div id="dyb-showdown-climbers" class="dyb-climbers"></div>
      <p id="dyb-showdown-claimed" class="dyb-claimline justify-center"></p>
      <div class="dyb-stage"><div id="dyb-showdown-stage" class="dyb-reveal-slots"></div></div>
      <div class="text-center">
        <p id="dyb-showdown-real" class="text-lg font-bold text-stone-700"></p>
        <p id="dyb-showdown-verdict" class="dyb-verdict"></p>
        <p id="dyb-showdown-loser" class="text-stone-500 text-sm mt-1"></p>
      </div>
      <div id="dyb-showdown-hands" class="flex flex-col gap-2"></div>
      <button id="btn-dyb-next-shake" class="min-h-14 w-full rounded-2xl dyb-cta active:scale-95 text-white text-xl font-semibold transition-all duration-150">
        Next Shake →
      </button>
      <p id="dyb-showdown-client-waiting" class="text-center text-stone-400 text-sm" style="display:none">Waiting for host…</p>
    </div>
  </section>
```

- [ ] **Step 4: JS** — add to `DYB_COPY`: `counting: 'Counting…', realCount: 'Real count:', holds: 'CLAIM HOLDS', bluff: 'BLUFF CALLED', called: 'called',`.

Replace `dybRenderShowdownScreen`, and **delete** `dybRenderAllHandsOnShowdown` and `dybGetCountingDice`, with:

```js
// ── The Overlook — a plan (pure) and its choreography ──────────────────────
function dybRevealPlan(events, claimed) {
  const steps = [];
  let filled = 0, peak = 0;
  events.forEach(e => {
    if (e.delta > 0) {
      for (let k = 0; k < e.delta; k++) { steps.push({ kind: 'fill', pIdx: e.pIdx, dieIdx: e.dieIdx, slot: filled }); filled++; }
      peak = Math.max(peak, filled);
    } else if (e.delta === 0) {
      steps.push({ kind: 'shudder', pIdx: e.pIdx, dieIdx: e.dieIdx, slot: -1 });
    } else if (filled > 0) {
      filled--;
      steps.push({ kind: 'knock', pIdx: e.pIdx, dieIdx: e.dieIdx, slot: filled });
    } else {
      steps.push({ kind: 'knock', pIdx: e.pIdx, dieIdx: e.dieIdx, slot: -1 });
    }
  });
  return { steps, slots: Math.max(claimed, peak), filled, holds: dybCountSum(events) >= claimed };
}
function dybRevealDelay(i) { return Math.max(140, 400 - i * 30); }

function dybRevealSpec(o) {
  const set = dybActiveSet();
  const players = o.names.map((name, idx) => ({
    idx, name, label: idx === o.me ? `${name} (you)` : name, tint: o.tints[idx], count: o.counts[idx],
    footholds: o.footholds, out: o.counts[idx] <= 0 && idx !== o.loser, active: false, you: idx === o.me,
  }));
  const loserName = o.names[o.loser] || 'Player';
  const loserLine = o.eliminated ? `${loserName} is out!` : `${loserName} ${o.footholds ? 'loses a foothold.' : 'loses a die.'}`;
  return Object.assign({ set, players, loserLine, events: dybCountEvents(o.face, o.hands, o.rules) }, o);
}

function dybRevealHandsHTML(spec) {
  let html = '';
  for (let p = 0; p < spec.n; p++) {
    const roll = (spec.hands.rolls || {})[p];
    if (!roll) continue;
    const types = (spec.hands.types || {})[p] || [], slicks = (spec.hands.slicks || {})[p] || [];
    const phantoms = (spec.hands.phantoms || {})[p] || [];
    const dice = roll.map((val, d) => {
      const s = slicks[d];
      return dybDieHTML(val, types[d] || 'standard', s === undefined || s === null ? -1 : s, -1, true, phantoms[d] || null, spec.tints[p], 34)
        .replace('<div class="dyb-die ', `<div data-p="${p}" data-d="${d}" class="dyb-die dyb-die-dim `);
    }).join('');
    html += `<div class="dyb-hand-row dyb-hands-lift" style="--dyb-tint:${dybTintHex(spec.set, spec.tints[p])}">
      <p>${dybEsc(spec.players[p].label)}</p><div class="flex gap-2 flex-wrap">${dice}</div></div>`;
  }
  return html;
}

function dybRetrigger(el, cls) { if (!el || !el.classList) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

function dybFlyInto(slotEl, srcEl, html, reduced) {
  slotEl.innerHTML = html;
  const die = slotEl.firstElementChild;
  if (!die || reduced || !srcEl || !srcEl.getBoundingClientRect || !slotEl.getBoundingClientRect) return;
  const a = srcEl.getBoundingClientRect(), b = slotEl.getBoundingClientRect();
  if (!a.width || !b.width) return;
  die.style.transform = `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width})`;
  void die.offsetWidth;
  die.style.transition = 'transform 320ms cubic-bezier(0.2, 0.7, 0.25, 1)';
  die.style.transform = '';
}

function dybPlayReveal(els, spec, bag, onDone) {
  const reduced = dybReducedMotion();
  const plan = dybRevealPlan(spec.events, spec.claimed);
  const px = 30;
  const q = (box, sel) => (box.querySelector ? box.querySelector(sel) : null);
  els.climbers.innerHTML = dybClimbersHTML(spec.players, spec.set, spec.loser);
  const bidder = spec.players[spec.bidder], chall = spec.players[spec.challenger];
  els.claimed.innerHTML = `${bidder ? `<b>${dybEsc(bidder.name)}</b> claimed ` : ''}<b>${dybBidText(spec.claimed, spec.face)}</b>` +
                          (chall ? ` · <b>${dybEsc(chall.name)}</b> ${DYB_COPY.called}` : '');
  els.stage.innerHTML = Array.from({ length: plan.slots }, (_, i) =>
    `<span class="dyb-slot" data-slot="${i}" style="--dyb-s:${px}px"></span>`).join('');
  els.real.textContent = DYB_COPY.counting;
  els.verdict.textContent = ''; els.verdict.className = 'dyb-verdict';
  els.loser.textContent = '';
  els.hands.innerHTML = dybRevealHandsHTML(spec);          // cups lift (rows rise), then the mist lifts (CSS)
  let shown = 0;
  const finish = () => {
    els.real.textContent = `${DYB_COPY.realCount} ${spec.real}`;
    els.verdict.textContent = plan.holds ? DYB_COPY.holds : DYB_COPY.bluff;
    els.verdict.className = plan.holds ? 'dyb-verdict' : 'dyb-verdict dyb-verdict-bluff';
    els.loser.textContent = spec.loserLine;
    if (els.hands.querySelectorAll) els.hands.querySelectorAll('.dyb-die-dim').forEach(el => el.classList.remove('dyb-die-dim'));
    const fall = q(els.climbers, '.dyb-mini-plunge');
    if (fall && fall.classList) fall.classList.add('go');
    dybSound(plan.holds ? 'holds' : 'bluff');
    if (onDone) onDone();
  };
  const step = i => {
    if (i >= plan.steps.length) { dybLater(bag, finish, 250); return; }
    const st = plan.steps[i];
    const src = q(els.hands, `[data-p="${st.pIdx}"][data-d="${st.dieIdx}"]`);
    const slot = st.slot >= 0 ? q(els.stage, `[data-slot="${st.slot}"]`) : null;
    if (src && src.classList) src.classList.remove('dyb-die-dim');
    if (st.kind === 'fill') {
      shown++;
      dybRetrigger(src, 'lit');
      if (slot) {
        slot.classList.add('filled');
        const roll = spec.hands.rolls[st.pIdx], d = st.dieIdx;
        const s = ((spec.hands.slicks || {})[st.pIdx] || [])[d];
        dybFlyInto(slot, src, dybDieHTML(roll[d], ((spec.hands.types || {})[st.pIdx] || [])[d] || 'standard',
          s === undefined || s === null ? -1 : s, -1, true, ((spec.hands.phantoms || {})[st.pIdx] || [])[d] || null, spec.tints[st.pIdx], px), src, reduced);
      }
    } else if (st.kind === 'knock') {
      shown = Math.max(0, shown - 1);
      dybRetrigger(src, 'shudder');
      if (slot) {
        slot.classList.add('knock');
        dybLater(bag, () => { slot.innerHTML = ''; slot.classList.remove('filled', 'knock'); }, 320);
      }
    } else {
      dybRetrigger(src, 'shudder');
    }
    els.real.textContent = `${DYB_COPY.realCount} ${shown}`;
    dybSound('count');
    dybLater(bag, () => step(i + 1), dybRevealDelay(i));
  };
  dybLater(bag, () => step(0), 1100);     // 0.6 s cups + 0.5 s fog
}

function dybShowdownEls() {
  const g = id => document.getElementById(id);
  return { climbers: g('dyb-showdown-climbers'), claimed: g('dyb-showdown-claimed'), stage: g('dyb-showdown-stage'),
           real: g('dyb-showdown-real'), verdict: g('dyb-showdown-verdict'), loser: g('dyb-showdown-loser'), hands: g('dyb-showdown-hands') };
}

function dybRenderShowdownScreen(data, onDone) {
  dybStopChoreography();
  const last = dybAllegationHistory[dybAllegationHistory.length - 1];
  const names = data.playerNames || dybPlayerNames;
  const spec = dybRevealSpec({
    n: dybPlayerCount, names, tints: names.map((_, i) => dybTintFor(i)),
    counts: names.map((_, i) => dybFootholdsMode ? ((data.newLives || [])[i] || 0) : ((data.newDiceInHand || [])[i] || 0)),
    footholds: dybFootholdsMode, hands: dybHandsNow(), rules: dybRulesNow(),
    face: data.face, claimed: data.claimed, real: data.real,
    bidder: last ? last.playerIdx : -1, challenger: dybCurrentBidderIdx, loser: data.loserIdx,
    eliminated: data.eliminatedIdx !== -1, me: mpMyPlayerIdx,
  });
  document.getElementById('btn-dyb-next-shake').style.display = 'none';
  document.getElementById('dyb-showdown-client-waiting').style.display = 'none';
  dybPlayReveal(dybShowdownEls(), spec, dybAnimTimers, () => {
    if (window.syllyMultiplayerMode !== 'client') {
      document.getElementById('btn-dyb-next-shake').style.display = data.gameOver ? 'none' : 'flex';
    } else {
      document.getElementById('dyb-showdown-client-waiting').style.display = 'block';
    }
    if (onDone) onDone();
  });
}
```

Note `dybApplyShowdown` still sets `dybAllRolls` etc. from the payload **before** calling `dybRenderShowdownScreen` — keep that order.

- [ ] **Step 5: CSS** — append:

```css
/* ── DYB reveal — The Overlook ───────────────────────────────────────────── */
.dyb-reveal-slots { display: flex; flex-wrap: wrap; gap: 6px 8px; justify-content: center; min-height: 44px; }
.dyb-slot { position: relative; flex-shrink: 0; width: var(--dyb-s); height: var(--dyb-s); border-radius: calc(var(--dyb-s) * 0.22);
            outline: 2px dashed #a8998a; outline-offset: -2px; background: rgba(255, 255, 255, 0.35); }
.dyb-slot.filled { outline-color: transparent; background: transparent; }
.dyb-slot.knock > .dyb-die { animation: dybKnock 320ms ease-out forwards; }
@keyframes dybKnock { to { transform: translateY(-10px) rotate(-25deg); opacity: 0; } }
.dyb-die.lit { animation: dybPop 220ms ease-out; }
@keyframes dybPop { 50% { transform: scale(1.15); } }
.dyb-die.shudder { animation: dybShudder 300ms ease-in-out; }
@keyframes dybShudder { 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }
.dyb-hands-lift { animation: dybHandsIn 600ms ease-out both; }
@keyframes dybHandsIn { from { opacity: 0; transform: translateY(12px); } }
.dyb-hand-row { padding: 8px 10px; border-radius: 16px; background: rgba(255, 255, 255, 0.55); border-left: 4px solid var(--dyb-tint); }
.dyb-hand-row p { margin-bottom: 6px; font-size: 12px; font-weight: 600; color: #5c4b3b; }
.dyb-verdict { font-size: 1.5rem; font-weight: 700; color: #44403c; min-height: 2rem; }
.dyb-verdict-bluff { color: #dc2626; }
```

- [ ] **Step 6: Paired copy** — replace the `# screen-dyb-showdown` block:

```copy
# screen-dyb-showdown
Reaching the Edge
THE OVERLOOK
Counting…
CLAIM HOLDS
BLUFF CALLED
Next Shake →
Waiting for host…
```

- [ ] **Step 7: Verify**

```bash
grep -n "dybRenderAllHandsOnShowdown\|dybGetCountingDice" js/ tools/
node tools/build-index.js && node tools/verify-build-fresh.js
node tools/verify-dyb-rules.js && node tools/verify-dyb-dice.js && node tools/verify-identity-docs.js
```
Expected: the grep prints only the `dybGetCountingDice` test line in `tools/verify-dyb-rules.js` from Task 2 — **delete that test line** (the function is gone) and re-run; then all exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/screens/dyb.html index.html js/games/dyb.js css/styles.css docs/game-identities/dyb.md tools/verify-dyb-rules.js
git commit -m "feat(dyb): The Overlook — slots fill from the hands, the fog lifts, the plunge"
```

---

## Phase 5 — Practice

### Task 15: The Practice script (pure)

**Files:**
- Modify: `js/games/dyb.js`
- Create: `tools/verify-dyb-practice.js`

**Interfaces:**
- Produces: `DYB_PRACTICE`, `DYB_PR_STEPS`, `DYB_PR_COACH`, `dybPracticeInit()`, `dybPracticeReduce(s, ev)` (events: `reset`, `thrown`, `next`, `face` (`.face`), `inc`, `dec`, `view` (`.view`), `climb`, `call`, `tick`, `revealed`), `dybPracticeClimbAllowed(s)`, `dybPracticeHands()`, `dybPracticeOutcome(s) → { face, claimed, real, bidder, challenger, loser }`, `dybPracticeModel(s)` (the Task 9 model shape), `dybPracticeCoach(s) → string`.

- [ ] **Step 1: Write the failing harness** — `tools/verify-dyb-practice.js`:

```js
// ═══════════════════════════════════════════════════════════════════════════
// verify-dyb-practice.js — The Bluff's Practice tab: the script, both branches
// at the decision, the climb gate, and isolation from the live game.
//
//   node tools/verify-dyb-practice.js        (exits 1 on any failure)
// ═══════════════════════════════════════════════════════════════════════════
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const elStub = new Proxy(function () {}, {
  get(_t, k) { return k === Symbol.toPrimitive ? () => '' : elStub; }, set() { return true; }, apply() { return elStub; },
});
let sends = 0;
const sandbox = {
  console,
  document: { addEventListener() {}, getElementById: () => elStub, querySelector: () => elStub,
              querySelectorAll: () => [], createElement: () => elStub, body: elStub },
  window: {}, setTimeout: () => 0, clearTimeout() {}, requestAnimationFrame: () => 0,
  mpMyPlayerIdx: 0, mpPlayerSlots: [],
  mpSendEnvelope() { sends++; }, mpLockSync() {}, mpUnlockSync() {},
  showScreen() {}, shuffle: a => a.slice(), bindCardHold() {}, refHighlightRow() {}, assetDiceSet: () => null,
};
['playDone', 'playPillClick', 'playBoing', 'playLaunch', 'playExit', 'playWhoosh', 'playTick', 'playSuccess',
 'playSyllyOn', 'playSyllyOff', 'playSliderTick', 'openSoundOverlay', 'resetToLobby', 'mpReturnToLobby',
 'mpShowModeScreen'].forEach(n => { sandbox[n] = () => {}; });
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
['js/games/dyb-dice.js', process.env.DYB_SRC || 'js/games/dyb.js']
  .forEach(rel => vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel }));
const S = sandbox, run = src => vm.runInContext(src, sandbox);

let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}` + (ok ? '' : `\n          expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`));
}
const section = t => console.log(`\n${t}`);
const drive = (s, evs) => evs.reduce((acc, e) => S.dybPracticeReduce(acc, e), s);

console.log('The Bluff — Practice\n' + '='.repeat(40));

section('The script is honest');
const P = run('DYB_PRACTICE');
check('the cast is the suite Practice cast', P.names.slice(1), ['Sylvia', 'Sam']);
{
  const hands = S.dybPracticeHands();
  check('the table holds five 3s (you 3 incl. a wild 1, Sylvia 1, Sam a wild 1)',
        S.dybCountSum(S.dybCountEvents(3, hands, P.rules)), 5);
  check('your cup reads as three 3s', S.dybYouHold({ roll: P.hands[0], types: [], slicks: [] }, 3, P.rules).total, 3);
  check('seven steps', run('DYB_PR_STEPS').length, 7);
  check('every step has a coach line', run('DYB_PR_STEPS').every(k => typeof S.dybPracticeCoach({ step: k, watch: 0, branch: 'call' }) === 'string'), true);
}

section('Walking the script');
let s = S.dybPracticeInit();
check('starts on the shake', s.step, 'shake');
check('the shake ignores anything but the throw', S.dybPracticeReduce(s, { type: 'next' }).step, 'shake');
s = drive(s, [{ type: 'thrown' }, { type: 'next' }]);
check('read → open, with an opening draft', [s.step, s.draft.face, s.draft.qty], ['open', 2, 1]);
check('Climb is locked on anything but three 3s', S.dybPracticeClimbAllowed(s), false);
check('…so climbing does nothing', S.dybPracticeReduce(s, { type: 'climb' }).step, 'open');
s = drive(s, [{ type: 'face', face: 3 }, { type: 'inc' }, { type: 'inc' }]);
check('three 3s unlocks the climb', [s.draft.qty, s.draft.face, S.dybPracticeClimbAllowed(s)], [3, 3, true]);
s = drive(s, [{ type: 'climb' }]);
check('the claim is yours and the others take their turns', [s.step, s.claim.qty, s.claim.by], ['watch', 3, 0]);
s = drive(s, [{ type: 'tick' }]);
check('Sylvia claims four 3s', [s.claim.by, s.claim.qty, s.claim.face], [1, 4, 3]);
s = drive(s, [{ type: 'tick' }]);
check('Sam claims seven 3s and it is your call', [s.step, s.claim.by, s.claim.qty], ['decide', 2, 7]);
check('your draft facing it is eight 3s', [s.draft.qty, s.draft.face], [8, 3]);
const atDecide = s;

section('Branch 1 — Call the Bluff');
{
  const c = drive(atDecide, [{ type: 'call' }]);
  const o = S.dybPracticeOutcome(c);
  check('the reveal: five against seven, Sam loses', [c.step, o.real, o.claimed, o.loser], ['reveal', 5, 7, 2]);
  check('…then done', drive(c, [{ type: 'revealed' }]).step, 'done');
}

section('Branch 2 — climb, and every legal climb loses');
{
  let wins = 0, tried = 0;
  for (let qty = 7; qty <= 15; qty++) for (let face = 2; face <= 6; face++) {
    const bid = { qty, face };
    if (!S.dybLegalRaise({ qty: 7, face: 3 }, bid, P.rules)) continue;
    const c = drive({ ...atDecide, draft: { ...bid, notice: null } }, [{ type: 'climb' }]);
    if (c.step !== 'reveal' || c.branch !== 'climb') { wins += 1000; continue; }
    tried++;
    if (S.dybPracticeOutcome(c).loser !== 0) wins++;
  }
  check(`all ${tried} legal climbs are called by Sylvia and you fall`, wins, 0);
}

section('The model is the table model');
{
  const m = S.dybPracticeModel(atDecide);
  check('three climbers, you first', m.players.map(p => p.label), ['You', 'Sylvia', 'Sam']);
  check('fifteen dice on the table', m.tableTotal, 15);
  check('it is your turn with a legal climb ready', [m.isMyTurn, m.climbEnabled], [true, true]);
}

section('Isolation from the live game');
run(`dybCurrentQty = 4; dybCurrentFace = 5; dybAllegationHistory = [{ playerIdx: 1, qty: 4, face: 5 }]; dybMyRoll = [6, 6, 2];`);
drive(S.dybPracticeInit(), [{ type: 'thrown' }, { type: 'next' }, { type: 'face', face: 3 }, { type: 'inc' }, { type: 'inc' },
                            { type: 'climb' }, { type: 'tick' }, { type: 'tick' }, { type: 'call' }, { type: 'revealed' }]);
check('no packet was sent', sends, 0);
check('live claim, history and hand are untouched', run('[dybCurrentQty, dybCurrentFace, dybAllegationHistory.length, dybMyRoll.join()]'), [4, 5, 1, '6,6,2']);

// ── Task 16 appends the driver section above this line ─────────────────────

console.log(`\n${failures ? `${failures} FAILED` : 'ALL PASS'}`);
process.exit(failures ? 1 : 0);
```

- [ ] **Step 2: Run** — `node tools/verify-dyb-practice.js` — Expected: FAIL (`DYB_PRACTICE is not defined`).

- [ ] **Step 3: Implement** — add to `js/games/dyb.js` after the reveal section:

```js
// ── Practice — a scripted, deterministic demo (How to Play tab) ─────────────
// The suite standard (ui-style.md § Practice tab): real renderers fed a model,
// beats gated on the player doing the thing, both branches at the decision, no
// multiplayer. Cast: Sylvia, Sam, Shirley, Jeff — The Bluff uses the first two.
const DYB_PRACTICE = {
  rules: { wildcards: 'classic', onesStripped: false },
  names: ['You', 'Sylvia', 'Sam'],
  tints: [1, 3, 4],                                        // sandstone, terracotta, moss
  hands: [[3, 3, 1, 5, 2], [3, 4, 6, 6, 2], [1, 5, 5, 2, 4]], // five 3s on the table, wilds included
  climbs: [{ by: 1, qty: 4, face: 3 }, { by: 2, qty: 7, face: 3 }],
};
const DYB_PR_STEPS = ['shake', 'read', 'open', 'watch', 'decide', 'reveal', 'done'];
const DYB_PR_COACH = {
  shake:       'Hold the cup to shake, let go to throw.',
  read:        'Two 3s, and a 1. In Classic Wilds, 1s count as any face, so you really hold three 3s.',
  open:        'You go first. Tap 3, then + up to three 3s. You can back that yourself.',
  watch0:      'Your claim is on the table. Now watch the others climb.',
  watch1:      "Sylvia climbs to four 3s. She only needs one more from the ten dice you can't see. Likely.",
  decide:      'Sam jumps to seven 3s. The other cups would need four of their ten. A stretch. Call the Bluff, or climb higher?',
  revealCall:  'Only five 3s. Sam over-reached, so Sam loses a die.',
  revealClimb: 'Sylvia called you. Only five 3s on the table. Climbing on a stretch is how you plunge.',
  done:        "That's The Bluff. A real game runs until one climber is left.",
};
function dybPracticeCoach(s) {
  if (s.step === 'watch') return s.watch ? DYB_PR_COACH.watch1 : DYB_PR_COACH.watch0;
  if (s.step === 'reveal') return s.branch === 'call' ? DYB_PR_COACH.revealCall : DYB_PR_COACH.revealClimb;
  return DYB_PR_COACH[s.step];
}
function dybPracticeInit() { return { step: 'shake', draft: null, claim: null, watch: 0, branch: null, view: 'whole' }; }
function dybPracticeCtx(s) {
  return { claim: s.claim ? { qty: s.claim.qty, face: s.claim.face } : { qty: 0, face: 0 },
           rules: DYB_PRACTICE.rules, tableTotal: 15 };
}
function dybPracticeClimbAllowed(s) {
  if (!s.draft) return false;
  if (s.step === 'open') return s.draft.face === 3 && s.draft.qty === 3;
  if (s.step === 'decide') return dybLegalRaise(dybPracticeCtx(s).claim, s.draft, DYB_PRACTICE.rules);
  return false;
}
function dybPracticeReduce(s, ev) {
  if (ev.type === 'reset') return dybPracticeInit();
  if (!s) return s;
  if (ev.type === 'view' && ['read', 'open', 'watch', 'decide'].includes(s.step)) return { ...s, view: ev.view };
  const ctx = dybPracticeCtx(s);
  switch (s.step) {
    case 'shake': return ev.type === 'thrown' ? { ...s, step: 'read' } : s;
    case 'read':  return ev.type === 'next' ? { ...s, step: 'open', draft: dybDraftInit(ctx.claim, ctx.rules) } : s;
    case 'open':
    case 'decide':
      if (['face', 'inc', 'dec'].includes(ev.type)) return { ...s, draft: dybDraftReduce(s.draft, ev, ctx) };
      if (ev.type === 'climb' && dybPracticeClimbAllowed(s)) {
        const claim = { by: 0, qty: s.draft.qty, face: s.draft.face };
        return s.step === 'open'
          ? { ...s, claim, draft: null, step: 'watch', watch: 0 }
          : { ...s, claim, draft: null, step: 'reveal', branch: 'climb' };
      }
      if (ev.type === 'call' && s.step === 'decide') return { ...s, draft: null, step: 'reveal', branch: 'call' };
      return s;
    case 'watch': {
      if (ev.type !== 'tick') return s;
      const claim = DYB_PRACTICE.climbs[s.watch];
      const next = { ...s, claim, watch: s.watch + 1 };
      return next.watch < DYB_PRACTICE.climbs.length
        ? next
        : { ...next, step: 'decide', draft: dybDraftInit({ qty: claim.qty, face: claim.face }, DYB_PRACTICE.rules) };
    }
    case 'reveal': return ev.type === 'revealed' ? { ...s, step: 'done' } : s;
    default: return s;
  }
}
function dybPracticeHands() {
  const h = DYB_PRACTICE.hands;
  return { n: 3, rolls: h, types: h.map(r => r.map(() => 'standard')),
           slicks: h.map(r => r.map(() => -1)), phantoms: h.map(r => r.map(() => null)) };
}
// The claim on the table at the reveal is challenged: by you (call) or by Sylvia (climb).
function dybPracticeOutcome(s) {
  const bidder = s.branch === 'call' ? s.claim.by : 0;
  const challenger = s.branch === 'call' ? 0 : 1;
  const real = dybCountSum(dybCountEvents(s.claim.face, dybPracticeHands(), DYB_PRACTICE.rules));
  return { face: s.claim.face, claimed: s.claim.qty, real, bidder, challenger, loser: real < s.claim.qty ? bidder : challenger };
}
function dybPracticeHighlight(s) {
  if (s.step === 'read') return 'cup';
  if (s.step === 'watch') return 'stage';
  if (s.step === 'open' && s.draft) return s.draft.face !== 3 ? 'face-3' : (s.draft.qty < 3 ? 'inc' : 'climb');
  return null;
}
function dybPracticeModel(s) {
  const P = DYB_PRACTICE, set = dybActiveSet();
  const isMyTurn = s.step === 'open' || s.step === 'decide';
  const turn = s.step === 'watch' ? [1, 2][s.watch] : 0;
  return {
    set, me: 0, myTint: P.tints[0], tempest: false,
    players: P.names.map((name, idx) => ({ idx, name, label: name, tint: P.tints[idx], count: 5,
                                            footholds: false, out: false, active: idx === turn, you: idx === 0 })),
    claim: s.claim ? { qty: s.claim.qty, face: s.claim.face, by: s.claim.by } : null,
    rules: P.rules, tableTotal: 15,
    hand: { roll: P.hands[0], types: P.hands[0].map(() => 'standard'), slicks: P.hands[0].map(() => -1),
            slickAssigned: P.hands[0].map(() => true) },
    isMyTurn, turnName: P.names[turn], turnTint: P.tints[turn],
    draft: isMyTurn ? s.draft : null, view: s.view,
    preview: s.step === 'read' ? { qty: 3, face: 3 } : null, caption: null,
    climbEnabled: isMyTurn && dybPracticeClimbAllowed(s),
    highlight: dybPracticeHighlight(s), ghostsIn: false,
  };
}
```

- [ ] **Step 4: Run** — `node tools/verify-dyb-practice.js` — Expected: `ALL PASS`.

- [ ] **Step 5: Commit**

```bash
git add js/games/dyb.js tools/verify-dyb-practice.js
git commit -m "feat(dyb): the Practice script — reducer, outcomes, model (pure)"
```

---

### Task 16: The Practice tab

**Files:**
- Modify: `src/screens/dyb.html` (How to Play overlay), `js/games/dyb.js`, `css/styles.css`, `docs/game-identities/dyb.md`
- Modify: `tools/verify-dyb-practice.js`

**Interfaces:**
- Consumes: Task 15, `dybRenderTable`, `dybPlayThrow`, `dybPlayReveal`, `dybRevealSpec`.
- Produces: `let dybPr = null;` `dybPracticeStart()`, real `dybPracticeStop()` (replaces the Task 12 stub), `dybPracticeDispatch(ev)`, `dybPracticeRender()`, `dybPracticeAct(act, data)`; `dybSetHowToTab('rules'|'practice'|'dice')`.

- [ ] **Step 1: Markup** — in `src/screens/dyb.html` inside `dyb-how-to-overlay`:

Replace the tab bar `<div class="px-5 pt-3 pb-3 border-b …">…</div>` with:

```html
      <div class="px-5 pt-3 pb-3 border-b border-stone-200 flex-shrink-0 flex gap-2">
        <button id="btn-dyb-howto-tab-rules" class="pill pill-active-dyb" data-dyb-howto-tab="rules">The Rules</button>
        <button id="btn-dyb-howto-tab-practice" class="pill" data-dyb-howto-tab="practice">Practice</button>
        <button id="btn-dyb-howto-tab-dice" class="pill" data-dyb-howto-tab="dice">The Dice</button>
      </div>
```

Directly after the closing `</div>` of `dyb-how-to-body` (before the `<!-- GALLERY tab` comment), insert:

```html
      <!-- PRACTICE tab — a scripted 60–90 s demo drawn by the REAL table and
           reveal renderers (dybRenderTable / dybPlayThrow / dybPlayReveal) fed a
           model. Never touches live state or the network. -->
      <div id="dyb-how-to-practice" style="display:none" class="overflow-y-auto flex-col gap-3 px-5 py-5 dyb-warm">
        <div class="dyb-coach"><span id="dyb-pr-step" class="dyb-coach-step"></span><p id="dyb-pr-coach"></p></div>
        <div id="dyb-pr-shake" class="dyb-shake-stage" role="button" aria-label="Shake the cup">
          <div id="dyb-pr-cup"></div>
          <div id="dyb-pr-dice" class="dyb-shake-dice"></div>
        </div>
        <div id="dyb-pr-table" class="flex flex-col gap-3"></div>
        <div id="dyb-pr-reveal" style="display:none" class="flex flex-col gap-3">
          <div id="dyb-pr-rv-climbers" class="dyb-climbers"></div>
          <p id="dyb-pr-rv-claimed" class="dyb-claimline justify-center"></p>
          <div class="dyb-stage"><div id="dyb-pr-rv-stage" class="dyb-reveal-slots"></div></div>
          <div class="text-center">
            <p id="dyb-pr-rv-real" class="text-lg font-bold text-stone-700"></p>
            <p id="dyb-pr-rv-verdict" class="dyb-verdict"></p>
            <p id="dyb-pr-rv-loser" class="text-stone-500 text-sm mt-1"></p>
          </div>
          <div id="dyb-pr-rv-hands" class="flex flex-col gap-2"></div>
        </div>
        <button id="btn-dyb-pr-next" style="display:none" class="min-h-14 w-full rounded-2xl dyb-cta active:scale-95 text-white text-xl font-semibold transition-all duration-150">Next</button>
        <div id="dyb-pr-done" style="display:none" class="flex flex-col gap-3">
          <button id="btn-dyb-pr-again" class="min-h-14 w-full rounded-2xl bg-stone-200 hover:bg-stone-300 active:scale-95 text-stone-700 text-xl font-semibold transition-all duration-150">Practice again</button>
          <button id="btn-dyb-howto-close-practice" class="min-h-14 w-full rounded-2xl dyb-cta active:scale-95 text-white text-xl font-semibold transition-all duration-150">Got it</button>
        </div>
      </div>
```

- [ ] **Step 2: JS** — replace `dybOpenHowTo` and `dybSetHowToTab`, and replace the Task 12 stub `dybPracticeStop`, with:

```js
function dybOpenHowTo(tab, highlightId) {
  dybSetHowToTab(tab || 'rules', highlightId);
  const inner = document.querySelector('#dyb-how-to-overlay .overlay-data-inner');
  if (inner) inner.scrollTop = 0;
  document.getElementById('dyb-how-to-overlay').style.display = 'flex';
}
function dybSetHowToTab(tab, highlightId) {
  const bodies = { rules: 'dyb-how-to-body', practice: 'dyb-how-to-practice', dice: 'dyb-how-to-dice' };
  Object.entries(bodies).forEach(([k, id]) => {
    const el = document.getElementById(id);
    if (el) el.style.display = k === tab ? 'flex' : 'none';
  });
  document.querySelectorAll('[data-dyb-howto-tab]').forEach(b => {
    b.classList.remove('pill-active-dyb');                    // .pill is the base — never removed
    if (b.dataset.dybHowtoTab === tab) b.classList.add('pill-active-dyb');
  });
  if (tab === 'practice') dybPracticeStart(); else dybPracticeStop();
  if (tab === 'dice') dybRenderDiceGallery(highlightId);
}

// ── Practice driver ─────────────────────────────────────────────────────────
let dybPr = null;   // the Practice state; null whenever the tab is not showing
function dybPracticeStart() { dybPracticeStop(); dybPr = dybPracticeInit(); dybPracticeRender(); }
function dybPracticeStop() { dybStopBag(dybPrTimers); dybPr = null; }
function dybPracticeDispatch(ev) {
  if (!dybPr) return;
  const prev = dybPr;
  dybPr = dybPracticeReduce(dybPr, ev);
  if (dybPr !== prev) dybPracticeRender(prev);
}
function dybPracticeAct(act, data) {
  if (act === 'face') { playPillClick(); dybPracticeDispatch({ type: 'face', face: parseInt(data.face, 10) }); }
  else if (act === 'inc' || act === 'dec') { playPillClick(); dybPracticeDispatch({ type: act }); }
  else if (act === 'view') { playPillClick(); dybPracticeDispatch({ type: 'view', view: data.view }); }
  else if (act === 'climb') { playDone(); dybPracticeDispatch({ type: 'climb' }); }
  else if (act === 'call') { playExit(); dybPracticeDispatch({ type: 'call' }); }
}
function dybPracticeRender(prev) {
  const s = dybPr;
  if (!s) return;
  const g = id => document.getElementById(id);
  const show = (id, on) => { const el = g(id); if (el) el.style.display = on ? 'flex' : 'none'; };
  g('dyb-pr-step').textContent = `${DYB_PR_STEPS.indexOf(s.step) + 1} / ${DYB_PR_STEPS.length}`;
  g('dyb-pr-coach').textContent = dybPracticeCoach(s);
  const set = dybActiveSet();
  show('dyb-pr-shake', s.step === 'shake');
  show('dyb-pr-table', ['read', 'open', 'watch', 'decide'].includes(s.step));
  show('dyb-pr-reveal', s.step === 'reveal' || s.step === 'done');
  g('btn-dyb-pr-next').style.display = s.step === 'read' ? 'flex' : 'none';
  show('dyb-pr-done', s.step === 'done');

  if (s.step === 'shake' && (!prev || prev.step !== 'shake')) {
    g('dyb-pr-cup').innerHTML = dybCupMarkup(set);
    g('dyb-pr-dice').innerHTML = '';
  }
  if (['read', 'open', 'watch', 'decide'].includes(s.step)) {
    dybRenderTable(g('dyb-pr-table'), dybPracticeModel(s), dybPracticeAct);
  }
  if (s.step === 'watch') dybLater(dybPrTimers, () => dybPracticeDispatch({ type: 'tick' }), s.watch ? 3400 : 2400);
  if (s.step === 'reveal' && (!prev || prev.step !== 'reveal')) {
    const o = dybPracticeOutcome(s);
    const counts = [5, 5, 5]; counts[o.loser] -= 1;
    const spec = dybRevealSpec({
      n: 3, names: DYB_PRACTICE.names, tints: DYB_PRACTICE.tints, counts, footholds: false,
      hands: dybPracticeHands(), rules: DYB_PRACTICE.rules, face: o.face, claimed: o.claimed, real: o.real,
      bidder: o.bidder, challenger: o.challenger, loser: o.loser, eliminated: false, me: -1,
    });
    spec.players.forEach(p => { p.label = p.name; });            // "You", not "You (you)"
    const els = { climbers: g('dyb-pr-rv-climbers'), claimed: g('dyb-pr-rv-claimed'), stage: g('dyb-pr-rv-stage'),
                  real: g('dyb-pr-rv-real'), verdict: g('dyb-pr-rv-verdict'), loser: g('dyb-pr-rv-loser'), hands: g('dyb-pr-rv-hands') };
    dybPlayReveal(els, spec, dybPrTimers, () => dybPracticeDispatch({ type: 'revealed' }));
  }
}
function dybPracticeThrow() {
  if (!dybPr || dybPr.step !== 'shake') return;
  const hand = { roll: DYB_PRACTICE.hands[0], types: [], slicks: [], slickAssigned: [] };
  const els = { cup: document.getElementById('dyb-pr-cup'), dice: document.getElementById('dyb-pr-dice') };
  dybPlayThrow(els, hand, dybActiveSet(), DYB_PRACTICE.tints[0], dybPrTimers, () => dybPracticeDispatch({ type: 'thrown' }));
}
```

In the `DOMContentLoaded` block, after the `// ── How-to overlay` close listener, add:

```js
  // ── Practice tab
  const dybPrStage = document.getElementById('dyb-pr-shake');
  dybPrStage.addEventListener('pointerdown', e => {
    if (!dybPr || dybPr.step !== 'shake') return;
    e.preventDefault();
    const cup = document.getElementById('dyb-pr-cup').firstElementChild;
    if (cup && cup.classList && !dybReducedMotion()) cup.classList.add('rattle');
    dybSound('rattle');
  });
  ['pointerup', 'pointercancel'].forEach(ev => dybPrStage.addEventListener(ev, dybPracticeThrow));
  document.getElementById('btn-dyb-pr-next').addEventListener('click', () => { playDone(); dybPracticeDispatch({ type: 'next' }); });
  document.getElementById('btn-dyb-pr-again').addEventListener('click', () => { playLaunch(); dybPracticeStart(); });
  document.getElementById('btn-dyb-howto-close-practice').addEventListener('click', () => {
    playDone(); dybPracticeStop();
    document.getElementById('dyb-how-to-overlay').style.display = 'none';
  });
```

In the existing `btn-dyb-howto-close` and `btn-dyb-howto-close-dice` listeners add `dybPracticeStop();` after `playDone();` (closing from any tab stops Practice).

- [ ] **Step 3: CSS** — append:

```css
/* ── DYB Practice — the coach ────────────────────────────────────────────── */
.dyb-coach { display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border-radius: 16px; background: #fff;
             box-shadow: 0 1px 3px rgba(60, 40, 20, 0.15); }
.dyb-coach-step { flex-shrink: 0; margin-top: 2px; padding: 2px 7px; border-radius: 999px; background: #6B5744; color: #fff; font-size: 10px; font-weight: 700; }
.dyb-coach p { font-size: 14px; color: #44382c; }
```

- [ ] **Step 4: Driver isolation test** — append to `tools/verify-dyb-practice.js` above its `// ── Task 16 appends` line. It swaps in a mock DOM of real objects so the render code actually runs:

```js
section('The driver — real renders, its own timers, stops clean (Review Focus 5)');
{
  const byId = {};
  const mk = () => {
    const el = { style: {}, dataset: {}, className: '', textContent: '', innerHTML: '', children: [],
                 addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], firstElementChild: null };
    el.classList = { add() {}, remove() {}, contains: () => false };
    return el;
  };
  S.document.getElementById = id => byId[id] || (byId[id] = mk());
  S.document.querySelectorAll = () => [];
  S.document.querySelector = () => null;
  const pending = new Map(); let seq = 0;
  S.setTimeout = (fn, ms) => { pending.set(++seq, fn); return seq; };
  S.clearTimeout = h => pending.delete(h);
  const fire = () => { let g = 0; while (pending.size && g++ < 200) { const [h, fn] = pending.entries().next().value; pending.delete(h); fn(); } };
  run(`dybAnimTimers.length = 0;`);
  sends = 0;
  S.dybSetHowToTab('practice');
  check('opening the tab starts on the shake', run('dybPr.step'), 'shake');
  S.dybPracticeThrow(); fire();
  check('the throw lands and reading begins', run('dybPr.step'), 'read');
  check('the table rendered through dybRenderTable', byId['dyb-pr-table'].innerHTML.includes('dyb-climbers'), true);
  S.dybPracticeDispatch({ type: 'next' });
  ['face', 'inc', 'inc'].forEach((a, i) => S.dybPracticeAct(a, a === 'face' ? { face: '3' } : {}));
  S.dybPracticeAct('climb', {});
  fire();
  check('the others climbed on their own timers; your call', run('dybPr.step'), 'decide');
  S.dybPracticeAct('call', {});
  check('the reveal is running on the Practice bag', [run('dybPr.step'), run('dybPrTimers.length') > 0], ['reveal', true]);
  check('…and never on the live bag', run('dybAnimTimers.length'), 0);
  S.dybSetHowToTab('rules');                                // tab away mid-reveal
  check('tabbing away stops Practice and clears its timers', [run('dybPr'), run('dybPrTimers.length'), pending.size], [null, 0, 0]);
  check('still no packet sent', sends, 0);
  check('live state still untouched', run('[dybCurrentQty, dybCurrentFace, dybMyRoll.join()]'), [4, 5, '6,6,2']);
}
```

- [ ] **Step 5: Paired copy** — in `docs/game-identities/dyb.md` § T7b replace the `# dyb-how-to-overlay — title and tabs` block's tab lines so it reads:

```copy
# dyb-how-to-overlay — title and tabs
How to Play 🎲
A bluffing game where every claim must be worth believing.
The Rules
Practice
The Dice
```

and add, right after it:

```copy
# dyb-how-to-overlay — Practice
Hold the cup to shake, let go to throw.
Two 3s, and a 1. In Classic Wilds, 1s count as any face, so you really hold three 3s.
You go first. Tap 3, then + up to three 3s. You can back that yourself.
Your claim is on the table. Now watch the others climb.
Sylvia climbs to four 3s. She only needs one more from the ten dice you can't see. Likely.
Sam jumps to seven 3s. The other cups would need four of their ten. A stretch. Call the Bluff, or climb higher?
Only five 3s. Sam over-reached, so Sam loses a die.
Sylvia called you. Only five 3s on the table. Climbing on a stretch is how you plunge.
That's The Bluff. A real game runs until one climber is left.
Next
Practice again
```

- [ ] **Step 6: Verify**

```bash
node tools/build-index.js && node tools/verify-build-fresh.js
node tools/verify-dyb-practice.js && node tools/verify-dyb-rules.js && node tools/verify-identity-docs.js
```
Expected: all exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/screens/dyb.html index.html js/games/dyb.js css/styles.css docs/game-identities/dyb.md tools/verify-dyb-practice.js
git commit -m "feat(dyb): the Practice tab — a scripted hand on the real table and reveal"
```

---

### Task 17: The Dice gallery grows; tap-and-hold

**Files:**
- Modify: `js/games/dyb.js` (`dybRenderDiceGallery`, `dybShowTempestGuide`; delete `dybShowDieInfo`)
- Modify: `css/styles.css`, `docs/game-identities/dyb.md`

**Interfaces:**
- Produces: `dybRenderDiceGallery(highlightId)`; rows tagged `data-dyb-die-type` = `loaded|cracked|snake|slick|phantom|tempest`.

- [ ] **Step 1: JS** — add to `DYB_COPY`:

```js
  galleryFaces:   'The Faces',
  galleryFacesB:  'Five dice each, rolled behind your hand. These are the six a die can show.',
  galleryTints:   'Seat Colours',
  galleryTintsB:  'Every climber throws their own colour, so the whole table can tell whose dice are whose.',
  galleryTempest: 'The Tempest',
  galleryTempestB:'Sylly Mode only. Each special die looks like what it does.',
  galleryCup:     'In the Cup',
  galleryCupB:    'What everyone else sees before The Overlook.',
```

and a map:

```js
const DYB_TEMPEST_ROWS = [
  { type: 'loaded',  name: 'Loaded',  line: 'Bronze pips. Counts double toward its face.' },
  { type: 'cracked', name: 'Cracked', line: 'Split through. Counts for nothing.' },
  { type: 'snake',   name: 'Snake',   line: "Serpent eyes. Counts −1 toward its face, and a 1 bites whatever's claimed." },
  { type: 'slick',   name: 'Slick',   line: 'Wet sheen. Tap it once to choose its face.' },
  { type: 'phantom', name: 'Phantom', line: 'Misted over, even for you. The fog lifts at The Overlook.' },
];
```

Replace `dybRenderDiceGallery` with:

```js
function dybRenderDiceGallery(highlightId) {
  const box = document.getElementById('dyb-dice-body');
  if (!box) return;
  const set = dybActiveSet();
  const tint = dybTintFor(typeof mpMyPlayerIdx === 'number' ? mpMyPlayerIdx : 0);
  const sec = (label, blurb, row, attr = '') => `<div class="flex flex-col gap-2 dyb-ref-row"${attr}>
      <p class="text-xs font-semibold uppercase tracking-widest dyb-label">${label}</p>
      <p class="text-stone-500 text-sm">${blurb}</p><div class="${row}">`;
  const cell = (html, cap) => `<div class="flex flex-col items-center gap-1">${html}<p class="text-[0.65rem] text-stone-500 text-center leading-tight">${cap}</p></div>`;
  let h = sec(DYB_COPY.galleryFaces, DYB_COPY.galleryFacesB, 'grid grid-cols-6 gap-2 justify-items-center pt-1');
  for (let f = 1; f <= 6; f++) h += cell(dybDieMarkup(dybDieRecipe({ set, tint, face: f }), 40), String(f));
  h += '</div></div>' + sec(DYB_COPY.galleryTints, DYB_COPY.galleryTintsB, 'grid grid-cols-4 gap-3 justify-items-center pt-1');
  set.tints.forEach((t, i) => { h += cell(dybDieMarkup(dybDieRecipe({ set, tint: i, face: 5 }), 40), t.name); });
  h += '</div></div>' + sec(DYB_COPY.galleryTempest, DYB_COPY.galleryTempestB, 'flex flex-col gap-2 pt-1', ' data-dyb-die-type="tempest"');
  DYB_TEMPEST_ROWS.forEach(r => {
    const state = r.type === 'phantom' ? 'concealed' : (r.type === 'slick' ? 'unpicked' : 'face');
    h += `<div class="flex items-center gap-3 rounded-2xl bg-white p-2 dyb-ref-row" data-dyb-die-type="${r.type}">
      ${dybDieMarkup(dybDieRecipe({ set, tint, face: 4, type: r.type, state }), 44)}
      <p class="text-sm text-stone-500"><span class="font-semibold text-stone-700">${r.name}</span>. ${r.line}</p></div>`;
  });
  h += '</div></div>' + sec(DYB_COPY.galleryCup, DYB_COPY.galleryCupB, 'flex justify-center pt-1');
  h += `<div style="position:relative;width:64px;height:74px">${dybCupMarkup(set).replace('class="dyb-cup"', 'class="dyb-cup" style="position:absolute;inset:0;margin:0;width:64px;height:74px"')}</div>`;
  h += '</div></div>';
  box.innerHTML = h;
  if (highlightId) refHighlightRow(box, 'data-dyb-die-type', highlightId, 'dyb-ref-row-ping');
}
```

Note the cup's own markup already has a `style` attribute for the colours; the `.replace` above therefore produces two `style` attributes. Instead, change `dybCupMarkup` in `dyb-dice.js` to accept an optional inline style: `function dybCupMarkup(set, extraStyle = '')` returning `<div class="dyb-cup" style="--dyb-cup:…;--dyb-cup-rim:…;${extraStyle}">…`, and in the gallery call `dybCupMarkup(set, 'position:absolute;inset:0;margin:0;width:64px;height:74px')` with no `.replace`. Make the same change in `tools/dyb-dice-review.js` (it used the same replace). Re-run `node tools/verify-dyb-dice.js`.

Replace `dybShowTempestGuide` with:

```js
function dybShowTempestGuide() { dybOpenHowTo('dice', 'tempest'); }
```

**Delete** `dybShowDieInfo` (tap-and-hold now opens the gallery). `grep -n dybShowDieInfo js/` — Expected: nothing.

- [ ] **Step 2: CSS** — append:

```css
/* Tap-Hold Reference ping (ui-style.md) — DYB's own colour */
.dyb-ref-row { transition: box-shadow 200ms ease-out; scroll-margin: 16px; border-radius: 1rem; }
.dyb-ref-row-ping { box-shadow: 0 0 0 3px #d8c9b4, 0 2px 8px rgba(107, 87, 68, 0.25); }
```

- [ ] **Step 3: Paired copy** — add to `docs/game-identities/dyb.md` § T7b, after the Practice block:

```copy
# dyb-how-to-overlay — The Dice
The Faces
Seat Colours
Every climber throws their own colour, so the whole table can tell whose dice are whose.
The Tempest
Sylly Mode only. Each special die looks like what it does.
In the Cup
What everyone else sees before The Overlook.
```

- [ ] **Step 4: Verify**

```bash
node tools/verify-dyb-dice.js && node tools/verify-dyb-rules.js && node tools/verify-dyb-practice.js && node tools/verify-identity-docs.js
```
Expected: all exit 0.

- [ ] **Step 5: Commit**

```bash
git add js/games/dyb.js js/games/dyb-dice.js tools/dyb-dice-review.js css/styles.css docs/game-identities/dyb.md
git commit -m "feat(dyb): the Dice gallery shows tints and the Tempest; tap-hold jumps to it"
```

---

## Phase 6 — Proof and closure

### Task 18: The loopback

**Files:**
- Create: `tools/verify-dyb-loopback.js`

- [ ] **Step 1: Write it**

```js
// ═══════════════════════════════════════════════════════════════════════════
// verify-dyb-loopback.js — HOST ↔ 2 CLIENTS for The Bluff, over a wire that
// behaves like Firebase Realtime Database, with a mock DOM of real objects so
// every render path (table, shake, The Overlook) actually executes.
//
//   node tools/verify-dyb-loopback.js           (exits 1 on any failure)
//   DYB_SEED=7 node tools/verify-dyb-loopback.js
//   DYB_SRC=path/to/broken-dyb.js node tools/verify-dyb-loopback.js
//
// Pattern: tools/verify-pko-loopback.js. What it proves: no applier throws on
// any device across a whole match (Tempest on, an elimination, a Slick picked
// after the roll); every device agrees on claim, count and loser; no ACTIVE
// client holds another hand in state before DYB_SHOWDOWN (the wire itself is
// not private — DYB_SPIRIT_SHAKE broadcasts rolls for The Depths).
// ═══════════════════════════════════════════════════════════════════════════
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const diceSrc = fs.readFileSync(path.join(ROOT, 'js/games/dyb-dice.js'), 'utf8');
const dybSrc  = fs.readFileSync(process.env.DYB_SRC || path.join(ROOT, 'js/games/dyb.js'), 'utf8');
const SEED = parseInt(process.env.DYB_SEED || '1', 10);

// ── The wire ───────────────────────────────────────────────────────────────
function fbWrite(v) {
  if (v === null || v === undefined) return undefined;
  if (typeof v !== 'object') return v;
  const out = {};
  const keys = Array.isArray(v) ? v.map((_, i) => String(i)) : Object.keys(v);
  keys.forEach(k => { const w = fbWrite(Array.isArray(v) ? v[Number(k)] : v[k]); if (w !== undefined) out[k] = w; });
  return Object.keys(out).length ? out : undefined;
}
function fbRead(v) {
  if (v === undefined || v === null || typeof v !== 'object') return v;
  const keys = Object.keys(v);
  const numeric = keys.length > 0 && keys.every(k => /^\d+$/.test(k));
  if (numeric) {
    const max = Math.max(...keys.map(Number));
    if (keys.length * 2 > max + 1) {
      const arr = [];
      for (let i = 0; i <= max; i++) arr[i] = Object.prototype.hasOwnProperty.call(v, String(i)) ? fbRead(v[String(i)]) : null;
      return arr;
    }
  }
  const out = {};
  keys.forEach(k => { out[k] = fbRead(v[k]); });
  return out;
}
const wire = env => { const s = fbWrite(env); return s === undefined ? undefined : fbRead(s); };

// ── Mock DOM with real elements ────────────────────────────────────────────
function makeDocument() {
  const byId = {};
  function mk(tag) {
    const el = {
      tagName: tag, children: [], style: {}, dataset: {}, className: '', textContent: '', disabled: false,
      _html: '', get innerHTML() { return this._html; }, set innerHTML(v) { this._html = String(v); this.children = []; },
      appendChild(c) { this.children.push(c); return c; }, addEventListener() {}, removeEventListener() {},
      querySelector: () => null, querySelectorAll: () => [], firstElementChild: null,
      getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0 }), contains: () => true,
    };
    const classes = () => el.className.split(/\s+/).filter(Boolean);
    el.classList = {
      add(...cs) { const s = new Set(classes()); cs.forEach(c => s.add(c)); el.className = [...s].join(' '); },
      remove(...cs) { const s = new Set(classes()); cs.forEach(c => s.delete(c)); el.className = [...s].join(' '); },
      contains: c => classes().includes(c),
    };
    return el;
  }
  return { body: mk('body'), addEventListener() {}, createElement: mk, querySelectorAll: () => [], querySelector: () => null,
           getElementById(id) { return byId[id] || (byId[id] = mk('div')); } };
}

// ── One device ─────────────────────────────────────────────────────────────
function seeded(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
function makeDevice(name, mode, myIdx, uid, slots, seed) {
  const timers = [], screens = [], errors = [];
  let seq = 0;
  const sandbox = {
    console: { log() {}, warn: (...a) => errors.push('warn: ' + a.join(' ')), error: (...a) => errors.push('error: ' + a.join(' ')) },
    document: makeDocument(),
    window: { syllyMultiplayerMode: mode, syllyDeviceUid: uid },
    shuffle: a => { const c = [...a]; for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(sandbox.__rand() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; },
    showScreen: id => screens.push(id),
    setTimeout: (fn, ms) => { timers.push({ fn, ms: ms || 0, id: ++seq }); return seq; },
    clearTimeout: id => { const i = timers.findIndex(t => t.id === id); if (i >= 0) timers.splice(i, 1); },
    requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    bindCardHold() {}, refHighlightRow() {}, assetDiceSet: () => null,
    mpLockSync() {}, mpUnlockSync() {}, mpReturnToLobby() {}, mpShowModeScreen() {}, openSoundOverlay() {},
    mpPlayerSlots: slots, mpMyPlayerIdx: myIdx,
    resetToLobby() { sandbox.__dissolved = true; },
    __name: name, __screens: screens, __timers: timers, __errors: errors, __rand: seeded(seed),
  };
  ['playDone', 'playPillClick', 'playBoing', 'playLaunch', 'playExit', 'playWhoosh', 'playTick', 'playSuccess',
   'playSyllyOn', 'playSyllyOff', 'playSliderTick'].forEach(s => { sandbox[s] = () => {}; });
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext('Math.random = () => __rand();', sandbox);
  const BRIDGE = `
globalThis.__dyb = {
  get claim()    { return { qty: dybCurrentQty, face: dybCurrentFace }; },
  get bidder()   { return dybCurrentBidderIdx; },
  get active()   { return dybActivePlayers.slice(); },
  get dice()     { return dybDiceInHand.slice(); },
  get allRolls() { return dybAllRolls; },
  get allSlicks(){ return dybAllSlickFaces; },
  get myRoll()   { return dybMyRoll.slice(); },
  get myTypes()  { return dybSpecialTypes.slice(); },
  seat(o) { dybPlayerCount = o.names.length; dybPlayerNames = o.names.slice(); dybStartingHand = o.start;
            dybWildcardsStyle = o.wild; dybSyllyMode = o.sylly; dybSyllyIntensity = 10; dybFootholdsMode = false; },
  showSeating() { dybShowSeating(); },
  startGame()   { dybStartGame(); },
  roll()        { dybDoRoll(); },
  submit()      { dybSubmitRoll(); },
  pickSlick(i, f) { dybAssignSlickFace(i, f); },
  act(a, d)     { dybTableAct(a, d || {}); },
  next()        { dybAdvanceFromShowdown(); },
  handle(env)   { dybHandleEnvelope(env); },
  el(id)        { return document.getElementById(id); },
};`;
  vm.runInContext(diceSrc, sandbox, { filename: `dyb-dice.js (${name})` });
  vm.runInContext(dybSrc + BRIDGE, sandbox, { filename: `dyb.js (${name})` });
  return sandbox;
}

let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}` + (ok ? '' : `\n          expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`));
}
const section = t => console.log(`\n${t}`);
function drain(d) {
  let g = 0;
  while (d.__timers.length && g++ < 5000) {
    d.__timers.sort((a, b) => a.ms - b.ms || a.id - b.id);
    const t = d.__timers.shift();
    try { t.fn(); } catch (e) { d.__errors.push(`timer: ${e.message}`); }
  }
}

console.log(`The Bluff — host ↔ 2 clients loopback (seed ${SEED})\n` + '='.repeat(56));

section('The wire itself');
check('an empty array is deleted', wire({ a: [], keep: 1 }), { keep: 1 });
check('a holey array becomes an object', wire({ a: [[1], undefined, [3]] }), { a: { 0: [1], 2: [3] } });

const NAMES = ['Ali <i>', 'Bec', 'Cam'];
const SLOTS = NAMES.map((n, i) => ({ uid: 'u' + i, nickname: n }));
const host = makeDevice('host', 'host', 0, 'u0', SLOTS, SEED * 101);
const c1   = makeDevice('c1', 'client', 1, 'u1', SLOTS, SEED * 101 + 1);
const c2   = makeDevice('c2', 'client', 2, 'u2', SLOTS, SEED * 101 + 2);
const devs = [host, c1, c2];
const D = i => devs[i].__dyb;
const sent = [];
host.mpSendEnvelope = env => {
  const w = wire({ ...env, originId: 'u0', timestamp: 0 });
  sent.push(w.payload);
  [c1, c2].forEach(c => { try { c.__dyb.handle(w); } catch (e) { c.__errors.push(`${w.payload.action}: ${e.message}`); } });
};
[c1, c2].forEach((c, k) => {
  c.mpSendEnvelope = env => {
    const w = wire({ ...env, originId: 'u' + (k + 1), timestamp: 0 });
    try { host.__dyb.handle(w); } catch (e) { host.__errors.push(`${w.payload.action}: ${e.message}`); }
  };
});
const errors = () => devs.flatMap(d => d.__errors.map(e => `${d.__name}: ${e}`));
const last = d => d.__screens[d.__screens.length - 1];

section('A full match — Tempest on, two dice each, until one climber is left');
D(0).seat({ names: NAMES, start: 2, wild: 'classic', sylly: true });
D(0).showSeating();
D(0).startGame();
let over = false, shakes = 0, slickChecked = false;
while (!over && shakes++ < 12) {
  const active = D(0).active;
  check(`shake ${shakes}: every active device is on the shake screen`, active.map(i => last(devs[i])), active.map(() => 'screen-dyb-shake'));
  active.forEach(i => { D(i).roll(); D(i).submit(); });
  check(`shake ${shakes}: active devices reached the table`, active.map(i => last(devs[i])), active.map(() => 'screen-dyb-table'));
  // Review Focus 4 — a Slick picked AFTER the roll was submitted reaches the host
  active.filter(i => i !== 0).forEach(i => {
    const j = D(i).myTypes.indexOf('slick');
    if (j >= 0 && !slickChecked) {
      D(i).pickSlick(j, 6);
      check('a Slick picked after submitting reaches the host', D(0).allSlicks[i][j], 6);
      slickChecked = true;
    }
  });
  check(`shake ${shakes}: no active client holds another hand before The Overlook`,
        active.filter(i => i !== 0).map(i => (Array.isArray(D(i).allRolls) ? D(i).allRolls : Object.keys(D(i).allRolls)).length), active.filter(i => i !== 0).map(() => 0));
  D(D(0).bidder).act('climb');
  check(`shake ${shakes}: every device agrees on the claim`, active.map(i => D(i).claim), active.map(() => D(0).claim));
  D(D(0).bidder).act('call');
  const sd = sent.filter(p => p.action === 'DYB_SHOWDOWN').pop();
  devs.forEach(drain);
  check(`shake ${shakes}: every device counted ${sd.real}`, devs.map(d => d.__dyb.el('dyb-showdown-real').textContent), devs.map(() => `Real count: ${sd.real}`));
  check(`shake ${shakes}: every device reached the same verdict`, devs.map(d => d.__dyb.el('dyb-showdown-verdict').textContent),
        devs.map(() => (sd.real >= sd.claimed ? 'CLAIM HOLDS' : 'BLUFF CALLED')));
  check(`shake ${shakes}: names reach the reveal escaped`, host.__dyb.el('dyb-showdown-hands').innerHTML.includes('Ali &lt;i&gt;'), true);
  over = sent.some(p => p.action === 'DYB_GAMEOVER');
  if (!over) {
    D(0).next();
    const out = [0, 1, 2].filter(i => !D(0).active.includes(i));
    out.filter(i => i !== 0).forEach(i => check(`an eliminated client (seat ${i}) watches from The Depths`, last(devs[i]), 'screen-dyb-spirit-board'));
  }
}
check('the match ended on The Summit', over, true);
check('every device shows The Summit', devs.map(last), devs.map(() => 'screen-dyb-gameover'));
check('no exception or warning on any device', errors(), []);

console.log(`\n${failures ? `${failures} FAILED` : 'ALL PASS'}`);
process.exit(failures ? 1 : 0);
```

- [ ] **Step 2: Run it across seeds**

```bash
for s in 1 2 3 4 5 6 7 8; do DYB_SEED=$s node tools/verify-dyb-loopback.js | tail -1; done
```
Expected: `ALL PASS` for every seed. If `slickChecked` never flips on a seed, that is fine for that seed; at least one of the eight must print the Slick check — confirm with `DYB_SEED=<n> node tools/verify-dyb-loopback.js | grep Slick`.

- [ ] **Step 3: Prove it can fail**

Copy `js/games/dyb.js` to the scratchpad. In the copy's `dybRevealHandsHTML`, change `spec.players[p].label` to `spec.players[p + 1].label` — a render throw on the last seat's row, the exact failure class this harness exists for (a SYNC applier that dies on a client). Run `DYB_SRC=<that copy> node tools/verify-dyb-loopback.js`. Expected: FAIL — the "no exception or warning on any device" check lists `DYB_SHOWDOWN: Cannot read properties of undefined` on the clients, and the count/verdict checks fail on them. If it passes, the wire wrapper is swallowing the throw — fix the harness before trusting it. Delete the copy.

- [ ] **Step 4: Commit**

```bash
git add tools/verify-dyb-loopback.js
git commit -m "test(dyb): host↔2-client loopback over a Firebase-shaped wire, full match"
```

---

### Task 19: Visual checks on the owner's iPhone SE

**Files:** fixes only, wherever the check finds them.

- [ ] **Step 1: Invoke the `visual-check` skill**

Ask it to render, in real headless Chromium with `isMobile` and `deviceScaleFactor: 2`, at **320×452 first**, then 375×548 and 375×667:
1. `screen-dyb-table` with **3, 4 and 8** players (5 dice each), both views, your turn and off-turn, Classic and Volatile-stripped.
2. `screen-dyb-shake` before the throw, mid-throw, and settled with Tempest dice.
3. `screen-dyb-showdown` after the count, with a Phantom and a Snake present.
4. The How to Play → Practice tab at each of its 7 steps.
5. All of the above again with `prefers-reduced-motion: reduce`.

For each: no horizontal page scroll; the Stack fits or scrolls as one column; the stage never overflows its box; at 320 wide with 40 dice the Whole table view shows the **"+N more on the table"** chip; face buttons and steppers are ≥ 44×44 (steppers are 36 — confirm they are not the only way to adjust; if the owner's SE finds them too small, raise to 44 and let `dybStageWidth` shrink); under reduced motion nothing travels and the verdict still appears.

- [ ] **Step 2: Fix what it finds, re-run the skill, then re-run every DYB harness**

```bash
node tools/verify-dyb-rules.js && node tools/verify-dyb-dice.js && node tools/verify-dyb-practice.js && node tools/verify-dyb-loopback.js && node tools/verify-identity-docs.js && node tools/verify-build-fresh.js
```

- [ ] **Step 3: Commit** — `git commit -am "fix(dyb): layout fixes from the SE visual pass"` (only if anything changed).

---

### Task 20: Documentation closure

Follow CLAUDE.md § Documentation Integrity Protocol in order. Each step names exactly what changes.

- [ ] **Step 1: `docs/code-map.md`** — Grep `Bluff` / `dyb`, offset-read that slice only. Update: the table's element IDs (`dyb-table-root`, `dyb-table-shake`; removed picker IDs), shake (`dyb-shake-stage`, `dyb-shake-cup`, `dyb-shake-dice`, `dyb-shake-climbers`), showdown (`dyb-showdown-climbers`, `dyb-showdown-stage`), how-to Practice IDs (`dyb-how-to-practice`, `dyb-pr-*`); new state (`dybDraft`, `dybStageView`, `dybAnimTimers`, `dybPrTimers`, `dybShakeHeld`, `dybPr`); key functions (pure rules, counting, `dybYouHold`, draft, `dybStageFit`, models, renderers, `dybPlayThrow`, `dybPlayReveal`, Practice driver); the new file `js/games/dyb-dice.js` and its API.

- [ ] **Step 2: `docs/game-identities/dyb.md`** — T7a: the flow rows' beats (shake "Hold the cup…", table, Overlook), the overlays table (How to Play has three tabs; `dyb-tip-overlay` no longer carries die info). T7c: delete the two paragraphs about the Tempest being absent from the gallery and the Phantom reveal gap (both resolved); keep the Footholds paragraph. T8: the Phantom line → "its face is hidden from its owner; the fog lifts at The Overlook". T9 (derived): rewrite — procedural dice sets (Rocky default in code, no core art ever needed), seat tints, Tempest forms, `diceSet` skin packs (Deep Ocean, Sea Cliff, Classic). Update the header `verified against SW v241`. Run `node tools/verify-identity-docs.js`.

- [ ] **Step 3: `CLAUDE.md`** — move the current `**SW v240 …**` paragraph verbatim to the top of `docs/sw-changelog.md`; write the new ≤6-line SW v241 entry (procedural dice + tints, new table stage, shake/reveal choreography with the Phantom reveal, Practice tab as the suite tutorial standard, single-sourced counting; no packet change, `MP_PROTOCOL_VERSION` unchanged). Load order: insert `dyb-dice.js →` before `dyb.js`. Per-Game Quick Index unchanged. Current Focus: DYB no longer "still run emoji/CSS defaults" — say "PASS still runs CSS defaults; DYB's dice are procedural (SW v241)". Verification harness table: replace the DYB row with `node tools/verify-dyb-rules.js && node tools/verify-dyb-dice.js && node tools/verify-dyb-practice.js` and add a DYB loopback row (`verify-dyb-loopback.js`, accepts `DYB_SRC=`/`DYB_SEED=`); add `dyb` to the loopbacks list sentence ("…the eight loopbacks (`cjar`/`shp`/`flw`/`nt`/`jec`/`comb`/`pko`/`dyb`)").

- [ ] **Step 4: `.claude/rules/ui-style.md`** — (a) add **§ Practice tab** under § How-to Overlay Standard with the seven bullets from spec § 7.5 (scripted, real renderers fed a model, gated beats + coach + step counter, both branches, Practice again / Got it, the cast Sylvia · Sam · Shirley · Jeff, no multiplayer + timer lifecycle + reduced motion in JS, tab order Rules | Practice | gallery; reference: DYB, SW v241). (b) In § Optional tab bar's rollout paragraph, note DYB's gallery now shows the Tempest (generated tiles, not `artMakeZoomable` — same as CLD's). (c) No `h-screen` whitelist change (the table stays on the Stack).

- [ ] **Step 5: `.claude/rules/logic-engine.md`** — § Shared Library Modules: change "Dice is deliberately NOT shared — all dice logic lives in `js/games/dyb.js`" to name `js/games/dyb-dice.js` as the game-owned, pure dice layer that moves to `js/lib/` with a second dice game or the dice selector. § Audio: add one sentence — "The Bluff joins them: `DYB_SOUND` in `js/games/dyb.js` (SW v241)." § Timer Lifecycle: add `dybAnimTimers` / `dybPrTimers` / `dybStopChoreography` / `dybPracticeStop` beside the other named handles. § PWA Guardian → Core art: DYB never needs a core art pack (procedural default).

- [ ] **Step 6: `docs/expansion-guide.md`** — § Core art packs: DYB leaves the "emoji/CSS defaults" list. Add a **DYB dice sets** subsection documenting the `diceSet` block (every field, the 8-tint rule, finishes `stone|plain|glass`, pips `carved|printed`, the fallback-to-Rocky rule, the 3:1 pip contrast checked by `verify-dyb-dice.js`). Also fix `docs/art-authoring-guide.md` and `tools/make-skin-pack.ps1` wherever they describe DYB image faces: Grep `dyb` in each and replace with a pointer to the new subsection.

- [ ] **Step 7: `docs/implementation-notes/dyb-implementation-notes.md`** — Design Decisions: procedural sets × tints; the model-fed renderers; HTML/CSS painter over canvas (plan amendment, and why); Volatile-stripped keeps only-1s. Bug Index: close the Phantom-reveal entry (fog lifts at The Overlook); log the Snake disagreement between the verdict and the reveal (fixed by `dybCountEvents`); log the unescaped nicknames (fixed by `dybEsc`). Template Gaps: "a new game's How to Play gets a Practice tab — build its renderers model-fed from day one".

- [ ] **Step 8: `docs/deferred-work.md`** — move "DYB — Phantom-die reveal + a procedural dice rework" to `docs/deferred-work-log.md` marked `RESOLVED 2026-09-28 (SW v241)` with one line. Add the four new entries from spec § 10 (dice selector + Lounge dice-tower prop; seat/colour picking in the waiting lobby — suite-wide, `dybTintFor` is DYB's hook; Practice retrofit, one line per remaining game (19); persisting the stage view toggle — needs a new permitted `localStorage` key, owner call).

- [ ] **Step 9: `docs/decision-log.md`** — two entries, newest on top: (1) *Procedural dice sets are the skin model for dice* — `diceSet` packs, tint = identity, pointer to the spec. (2) *Practice is the suite's tutorial standard* — pointer to ui-style § Practice tab.

- [ ] **Step 10: Final sweep and commit**

```bash
node tools/verify-dyb-rules.js && node tools/verify-dyb-dice.js && node tools/verify-dyb-practice.js && node tools/verify-dyb-loopback.js
node tools/verify-identity-docs.js && node tools/verify-identity-docs.js --self-test && node tools/verify-mp-configs.js && node tools/verify-build-fresh.js
git add -A docs .claude/rules CLAUDE.md tools/make-skin-pack.ps1
git commit -m "docs(dyb): SW v241 closure — procedural dice, new table, Practice standard"
```
Expected: every harness exits 0 before the commit.

---

## After the plan

The owner plays a real multi-device game (spec § 8: no harness replaces it) and compares the new table against the old one — the comparison they asked for at the start of this work.
